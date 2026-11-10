import asyncio
import copy
import json
import os
import socket
import sys
import tempfile
import time
import unittest
import uuid
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import aiohttp

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "worker"))
sys.path.insert(0, str(ROOT / "server"))
from agent import JobFailed, WorkerAgent
from distributed import DistributedStore


class WorkerFixture:
    def make_worker(self, **config):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        path = Path(directory.name) / "worker.json"
        self.config = {
            "server_url": "http://controller.invalid",
            "comfy_input_dir": directory.name,
            "worker_name": "same-hostname",
            "enrollment_token": "private-enrollment",
            "unrelated_secret": "private-config",
            **config,
        }
        path.write_text(json.dumps(self.config), encoding="utf-8")
        return WorkerAgent(path)


class WorkerCleanupRestartTest(WorkerFixture, unittest.IsolatedAsyncioTestCase):
    async def test_unconfirmed_cleanup_restarts_services(self):
        worker = self.make_worker()
        worker._json_request = mock.AsyncMock(return_value={"cleanup_complete": False})
        worker.restart_comfy_only = mock.AsyncMock()
        self.assertFalse(await worker.cancel_and_release({"job_id": "job-1"}))
        worker.restart_comfy_only.assert_awaited_once()
        worker.restart_comfy_only.assert_awaited_once_with()
        self.assertIsNotNone(worker.release_failed)

    async def test_cleanup_503_restarts_services_even_if_restart_fails(self):
        worker = self.make_worker()
        worker._json_request = mock.AsyncMock(side_effect=RuntimeError("503 cleanup timeout"))
        worker.restart_comfy_only = mock.AsyncMock(side_effect=RuntimeError("launcher missing"))
        self.assertFalse(await worker.cancel_and_release({"job_id": "job-1"}))
        worker.restart_comfy_only.assert_awaited_once()
        self.assertIn("自动重启失败", worker.release_failed)
        self.assertIsNone(await worker.acquire())

    async def test_confirmed_cleanup_does_not_restart(self):
        worker = self.make_worker()
        worker._json_request = mock.AsyncMock(return_value={"cleanup_complete": True, "cancelled": True})
        worker.restart_comfy_only = mock.AsyncMock()
        self.assertTrue(await worker.cancel_and_release({"job_id": "job-1"}))
        worker.restart_comfy_only.assert_not_awaited()

    async def test_one_deadline_covers_ws_lock_http_retry_and_status_report(self):
        for blocked in ("ws", "lock", "http", "retry", "status"):
            with self.subTest(blocked=blocked):
                worker = self.make_worker()
                assignment = {"job_id": "job-1", "cancel_requested": True,
                              "_capacity_measurements": {"diagnostics": {}}}
                gate = asyncio.Event()
                cancel_calls = 0
                states = []

                async def report(_assignment, event):
                    states.append(event["data"]["state"])
                    if blocked == "status" and states[-1] == "stopping":
                        await gate.wait()

                async def request(method, url, **kwargs):
                    nonlocal cancel_calls
                    if url.endswith("/queue"):
                        return {"queue_running": [], "queue_pending": []}
                    cancel_calls += 1
                    if blocked == "retry" and cancel_calls == 1:
                        raise aiohttp.ClientConnectionError("uncertain delivery")
                    await gate.wait()

                worker.report_event = mock.AsyncMock(side_effect=report)
                worker._json_request = mock.AsyncMock(side_effect=request)
                worker.restart_comfy_only = mock.AsyncMock()
                if blocked == "ws":
                    assignment["_ws"] = mock.Mock(closed=False, close=mock.AsyncMock(side_effect=gate.wait))
                if blocked == "lock":
                    await worker.comfy_lock.acquire()
                try:
                    with mock.patch("agent.CANCEL_GRACE_SECONDS", 0.03):
                        released = await asyncio.wait_for(worker.cancel_and_release(assignment), 0.5)
                    self.assertTrue(released)
                    worker.restart_comfy_only.assert_awaited_once_with()
                    self.assertEqual(states[-1], "recovering")
                    self.assertIsNone(worker.release_failed)
                    self.assertTrue(assignment["_comfy_recovered"])
                    diagnostics = assignment["_capacity_measurements"]["diagnostics"]
                    self.assertFalse(diagnostics["cleanup_complete"])
                    self.assertIn("停止超过", diagnostics["cleanup_error"])
                    if blocked == "retry":
                        self.assertEqual(cancel_calls, 2)
                finally:
                    if worker.comfy_lock.locked():
                        worker.comfy_lock.release()

    async def test_recovery_requires_empty_queue_and_keeps_gate_on_failure(self):
        queues = [{}, {"queue_running": [[1]], "queue_pending": []},
                  {"queue_running": [], "queue_pending": [[1]]}]
        for field in ("queue_running", "queue_pending"):
            for invalid in (None, False, 0, "", {}):
                queues.append({"queue_running": [], "queue_pending": [], field: invalid})
        for queue in queues:
            with self.subTest(queue=queue):
                worker = self.make_worker()
                worker.report_event = mock.AsyncMock()
                worker._json_request = mock.AsyncMock(side_effect=[
                    {"cleanup_complete": False}, queue,
                ])
                worker.restart_comfy_only = mock.AsyncMock()
                assignment = {"job_id": "job-1"}
                self.assertFalse(await worker.cancel_and_release(assignment))
                self.assertNotIn("_comfy_recovered", assignment)
                self.assertIn("恢复失败", worker.release_failed)
                self.assertIsNone(await worker.acquire())

    async def test_duplicate_cancellation_does_not_replace_cleanup_or_restart_twice(self):
        worker = self.make_worker()
        assignment = {"job_id": "job-1"}
        worker.current = assignment
        worker.report_event = mock.AsyncMock()
        gate = asyncio.Event()

        async def request(method, url, **kwargs):
            if url.endswith("/queue"):
                return {"queue_running": [], "queue_pending": []}
            await gate.wait()

        worker._json_request = mock.AsyncMock(side_effect=request)
        worker.restart_comfy_only = mock.AsyncMock()
        with mock.patch("agent.CANCEL_GRACE_SECONDS", 0.03):
            await worker.cancel_current("other-job")
            self.assertNotIn("_cleanup_task", assignment)
            await worker.cancel_current("job-1")
            cleanup = assignment["_cleanup_task"]
            for _ in range(5):
                await worker.cancel_current("job-1")
                self.assertIs(assignment["_cleanup_task"], cleanup)
            self.assertIsNone(await worker.acquire())
            self.assertTrue(await asyncio.wait_for(cleanup, 0.5))
            await worker.cancel_current("job-1")
            self.assertIs(assignment["_cleanup_task"], cleanup)
        worker.restart_comfy_only.assert_awaited_once_with()


class WorkerCapacityIdentityTest(WorkerFixture, unittest.TestCase):
    def test_identity_persists_without_registration_and_is_not_hostname(self):
        worker = self.make_worker()
        host_id = worker.state["host_id"]
        self.assertEqual(uuid.UUID(host_id).hex, host_id)
        self.assertEqual(json.loads(worker.state_path.read_text())["host_id"], host_id)
        with mock.patch("agent.platform.node", return_value="renamed-host"):
            restarted = WorkerAgent(worker.config_path)
        self.assertEqual(restarted.state["host_id"], host_id)
        another = self.make_worker()
        self.assertNotEqual(another.state["host_id"], host_id)

    def test_existing_registered_state_gets_identity_and_keeps_credentials(self):
        worker = self.make_worker()
        old_state = {"worker_id": "worker-1", "worker_token": "private-worker"}
        worker.state_path.write_text(json.dumps(old_state), encoding="utf-8")
        restarted = WorkerAgent(worker.config_path)
        stored = json.loads(worker.state_path.read_text())
        self.assertEqual(stored["host_id"], restarted.state["host_id"])
        for key, value in old_state.items():
            self.assertEqual(stored[key], value)

    def test_primary_role_is_available_before_scan_and_rejects_sync_commands(self):
        worker = self.make_worker(is_primary_node=True)
        self.assertIs(worker.capabilities["is_primary_node"], True)
        worker.queue_sync({"type": "sync_files", "request_id": "ignored"})
        self.assertIsNone(worker.pending_sync)

    def test_explicit_shared_identity_overrides_and_persists(self):
        first = self.make_worker(capacity_host_id="shared-installation")
        second = self.make_worker(capacity_host_id="shared-installation")
        self.assertEqual(first.state["host_id"], second.state["host_id"])
        self.config["capacity_host_id"] = "confirmed-installation"
        second.config_path.write_text(json.dumps(self.config), encoding="utf-8")
        restarted = WorkerAgent(second.config_path)
        self.assertEqual(restarted.state["host_id"], "confirmed-installation")
        self.assertEqual(json.loads(second.state_path.read_text())["host_id"],
                         "confirmed-installation")
        self.config.pop("capacity_host_id")
        second.config_path.write_text(json.dumps(self.config), encoding="utf-8")
        self.assertEqual(WorkerAgent(second.config_path).state["host_id"],
                         "confirmed-installation")

    def test_telemetry_whitelist_and_unknown_environment(self):
        worker = self.make_worker()
        worker.state["worker_token"] = "private-worker"
        with mock.patch.object(worker, "_nvidia_gpus", return_value=[]), \
             mock.patch.object(worker, "_system_memory", return_value={"total_bytes": 123}), \
             mock.patch.object(worker, "_ip_address", return_value=None), \
             mock.patch("agent.platform.processor", return_value="test CPU"), \
             mock.patch("agent.platform.system", return_value="test OS"):
            telemetry = worker.collect_telemetry()
        self.assertEqual(telemetry["host_id"], worker.state["host_id"])
        self.assertEqual(telemetry["cpu"]["model"], "test CPU")
        self.assertEqual(telemetry["os"]["name"], "test OS")
        self.assertEqual(telemetry["memory_total_bytes"], 123)
        self.assertEqual(telemetry["memory"], {"total_bytes": 123})
        for key in ("environment_id", "model_version", "execution_device"):
            self.assertIsNone(telemetry[key])
        self.assertNotIn("private-", json.dumps(telemetry))

    def test_probe_only_object_has_unknown_identity_without_writing_state(self):
        worker = WorkerAgent.__new__(WorkerAgent)
        worker.config = {}
        with mock.patch.object(worker, "_nvidia_gpus", return_value=[]), \
             mock.patch.object(worker, "_system_memory", return_value=None), \
             mock.patch.object(worker, "_save_state") as save:
            telemetry = worker.collect_telemetry()
        self.assertIsNone(telemetry["host_id"])
        self.assertIsNone(telemetry["ip_address"])
        save.assert_not_called()
        self.assertFalse(hasattr(worker, "state"))


class WorkerIPAddressTest(unittest.TestCase):
    def setUp(self):
        self.worker = WorkerAgent.__new__(WorkerAgent)
        self.worker.config = {}
        self.worker.server = "https://controller.invalid:8443/control"
        self.probe = mock.MagicMock(spec=socket.socket)
        self.probe.__enter__.return_value = self.probe
        self.probe.getsockname.return_value = ("10.20.0.7", 54321)
        resolver = mock.patch("agent.socket.getaddrinfo", return_value=[self.candidate()])
        factory = mock.patch("agent.socket.socket", return_value=self.probe)
        self.resolve = resolver.start()
        self.factory = factory.start()
        self.addCleanup(resolver.stop)
        self.addCleanup(factory.stop)

    @staticmethod
    def candidate(host="10.20.0.1", port=8443, family=socket.AF_INET):
        destination = (host, port, 0, 0) if family == socket.AF_INET6 else (host, port)
        return family, socket.SOCK_DGRAM, socket.IPPROTO_UDP, "", destination

    def assert_probe_closed_without_data(self):
        self.probe.__exit__.assert_called_once()
        for method in ("send", "sendall", "sendto"):
            getattr(self.probe, method).assert_not_called()

    def test_ipv4_uses_controller_host_port_and_route_source(self):
        self.assertEqual(self.worker._ip_address(), "10.20.0.7")
        self.resolve.assert_called_once_with(
            "controller.invalid", 8443, socket.AF_INET, socket.SOCK_DGRAM)
        self.factory.assert_called_once_with(
            socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        self.probe.connect.assert_called_once_with(("10.20.0.1", 8443))
        self.assert_probe_closed_without_data()

    def test_ipv6_only_controller_does_not_fall_back_to_ipv6(self):
        self.worker.server = "https://[fd12:3456::1]:9443/control"
        self.resolve.side_effect = socket.gaierror("No IPv4 address")
        self.assertIsNone(self.worker._ip_address())
        self.resolve.assert_called_once_with(
            "fd12:3456::1", 9443, socket.AF_INET, socket.SOCK_DGRAM)
        self.factory.assert_not_called()

    def test_ipv6_candidates_are_skipped_without_opening_ipv6_sockets(self):
        ipv6 = self.candidate("fd12:3456::1", family=socket.AF_INET6)
        self.resolve.return_value = [ipv6, self.candidate()]
        self.assertEqual(self.worker._ip_address(), "10.20.0.7")
        self.factory.assert_called_once_with(
            socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        self.assert_probe_closed_without_data()
        self.factory.reset_mock()
        self.resolve.return_value = [ipv6]
        self.assertIsNone(self.worker._ip_address())
        self.factory.assert_not_called()

    def test_default_http_https_ports(self):
        for scheme, port in (("http", 80), ("https", 443)):
            with self.subTest(scheme=scheme):
                self.worker.server = scheme + "://controller.invalid/api"
                self.assertEqual(self.worker._ip_address(), "10.20.0.7")
                self.resolve.assert_called_with(
                    "controller.invalid", port, socket.AF_INET, socket.SOCK_DGRAM)

    def test_multihomed_source_changes_with_controller_not_hostname(self):
        routes = {
            "control-a.invalid": ("10.20.0.1", "10.20.0.7"),
            "control-b.invalid": ("192.168.30.1", "192.168.30.9"),
        }
        self.resolve.side_effect = lambda host, port, *_: [
            self.candidate(routes[host][0], port)]
        self.probe.connect.side_effect = lambda destination: setattr(
            self.probe.getsockname, "return_value",
            (next(source for target, source in routes.values() if target == destination[0]), 54321))
        with mock.patch("agent.socket.gethostname") as hostname, \
             mock.patch("agent.socket.gethostbyname") as host_address:
            for controller, (_, source) in routes.items():
                with self.subTest(controller=controller):
                    self.worker.server = "https://" + controller
                    self.assertEqual(self.worker._ip_address(), source)
            hostname.assert_not_called()
            host_address.assert_not_called()
        self.assertEqual(self.probe.__exit__.call_count, 2)

    def test_missing_controller_probe_never_resolves_or_opens_socket(self):
        del self.worker.server
        self.assertIsNone(self.worker._ip_address())
        self.resolve.assert_not_called()
        self.factory.assert_not_called()

    def test_invalid_controller_never_resolves_or_opens_socket(self):
        for server in (None, "", "  ", 123, {}, "controller.invalid", "//controller.invalid",
                       "http:///path", "https://", "ftp://controller.invalid",
                       "http://bad host", "http://[broken", "http://controller.invalid:nope",
                       "http://controller.invalid:65536", "http://controller.invalid:0"):
            with self.subTest(server=server):
                self.worker.server = server
                self.assertIsNone(self.worker._ip_address())
        self.resolve.assert_not_called()
        self.factory.assert_not_called()

    def test_dns_failure_and_no_candidates_return_none(self):
        for error in (socket.gaierror("DNS unavailable"), OSError("resolver failed"),
                      UnicodeError("invalid host encoding")):
            with self.subTest(error=error):
                self.resolve.side_effect = error
                self.assertIsNone(self.worker._ip_address())
        self.resolve.side_effect = None
        self.resolve.return_value = []
        self.assertIsNone(self.worker._ip_address())
        self.factory.assert_not_called()

    def test_socket_creation_failure_tries_next_ipv4(self):
        self.resolve.return_value = [self.candidate("10.10.0.1"), self.candidate()]
        self.factory.side_effect = [OSError("route unavailable"), self.probe]
        self.assertEqual(self.worker._ip_address(), "10.20.0.7")
        self.assertEqual(self.factory.call_count, 2)
        self.assert_probe_closed_without_data()

    def test_connect_and_getsockname_failure_close_socket_and_try_next_candidate(self):
        for stage in ("connect", "getsockname"):
            with self.subTest(stage=stage):
                self.probe.reset_mock()
                self.resolve.return_value = [self.candidate("10.10.0.1"), self.candidate()]
                method = getattr(self.probe, stage)
                method.side_effect = [OSError("route unavailable"),
                                      None if stage == "connect" else ("10.20.0.7", 54321)]
                self.assertEqual(self.worker._ip_address(), "10.20.0.7")
                self.assertEqual(self.probe.__exit__.call_count, 2)
                method.side_effect = None

    def test_all_socket_candidates_fail_without_raising(self):
        for stage in ("connect", "getsockname"):
            with self.subTest(stage=stage):
                self.probe.reset_mock()
                self.resolve.return_value = [self.candidate(), self.candidate("10.30.0.1")]
                getattr(self.probe, stage).side_effect = OSError("network down")
                self.assertIsNone(self.worker._ip_address())
                self.assertEqual(self.probe.__exit__.call_count, 2)
                getattr(self.probe, stage).side_effect = None

    def test_unusable_source_addresses_are_not_reported_and_next_candidate_is_tried(self):
        for source in ("127.0.0.1", "0.0.0.0", "224.0.0.1", "169.254.1.2",
                       "255.255.255.255", "::1", "::", "ff02::1", "fe80::1%7",
                       "::ffff:127.0.0.1", "::ffff:0.0.0.0", "::ffff:224.0.0.1",
                       "fd12:3456::7", "::ffff:10.20.0.7", "not-an-ip", ""):
            with self.subTest(source=source):
                self.probe.reset_mock()
                self.resolve.return_value = [self.candidate(), self.candidate("10.30.0.1")]
                self.probe.getsockname.side_effect = [(source, 54321), ("10.30.0.7", 54321)]
                self.assertEqual(self.worker._ip_address(), "10.30.0.7")
                self.assertEqual(self.probe.__exit__.call_count, 2)
                self.resolve.return_value = [self.candidate()]
                self.probe.getsockname.side_effect = [(source, 54321)]
                self.assertIsNone(self.worker._ip_address())

    def test_ip_failure_does_not_discard_gpu_or_memory(self):
        gpus = [{"index": 0, "memory_total_bytes": 1234}]
        memory = {"total_bytes": 5678}
        with mock.patch.object(self.worker, "_nvidia_gpus", return_value=gpus), \
             mock.patch.object(self.worker, "_system_memory", return_value=memory):
            self.resolve.side_effect = socket.gaierror("DNS unavailable")
            telemetry = self.worker.collect_telemetry()
            self.assertIsNone(telemetry["ip_address"])
            self.assertEqual(telemetry["gpus"], gpus)
            self.assertEqual(telemetry["memory"], memory)
            self.assertEqual(telemetry["memory_total_bytes"], 5678)
            with mock.patch.object(self.worker, "_ip_address", side_effect=RuntimeError("probe failed")):
                self.assertIsNone(self.worker.collect_telemetry()["ip_address"])


class WorkerIPTransmissionTest(WorkerFixture, unittest.IsolatedAsyncioTestCase):
    async def test_scan_registration_heartbeat_and_sqlite_reopen_preserve_ip(self):
        worker = self.make_worker(server_url="https://controller.invalid:8443")
        database = worker.config_path.parent / "control.db"
        self.store = DistributedStore(database)
        self.addCleanup(lambda: self.store.close())
        requests = []

        async def request(method, url, **kwargs):
            body = copy.deepcopy(kwargs.get("json"))
            requests.append((url, body))
            if url.endswith("/system_stats"):
                return {"devices": [], "system": {}}
            if url.endswith("/object_info"):
                return {"KSampler": {}}
            if url.endswith("/register"):
                return self.store.register_worker(body["name"], body["capabilities"])
            if url.endswith("/heartbeat"):
                return self.store.heartbeat(worker.state["worker_id"], **body)
            self.fail("非预期请求：" + url)

        worker._json_request = mock.AsyncMock(side_effect=request)
        worker.local_status = mock.AsyncMock()
        worker.confirm_release_recovery = mock.AsyncMock()
        probe = mock.MagicMock(spec=socket.socket)
        probe.__enter__.return_value = probe

        def assert_stored(expected):
            worker_id = worker.state["worker_id"]
            full = self.store.list_workers()[0]
            self.assertEqual(full["id"], worker_id)
            self.assertEqual(full["capabilities"]["telemetry"]["ip_address"], expected)
            self.assertEqual(self.store.list_workers(telemetry_only=True)[0][
                "capabilities"]["telemetry"]["ip_address"], expected)
            summary = self.store.list_workers(summary=True)[0]
            self.assertEqual(summary["id"], worker_id)
            self.assertNotIn("capabilities", summary)
            self.assertNotIn("ip_address", summary)
            self.store.close()
            self.store = DistributedStore(database)
            self.assertEqual(self.store.list_workers()[0][
                "capabilities"]["telemetry"]["ip_address"], expected)
            self.assertTrue(self.store.authenticate(worker_id, worker.state["worker_token"]))

        async def heartbeat():
            worker.last_telemetry_scan = 0
            worker.stop_event = mock.Mock()
            worker.stop_event.is_set.side_effect = [False, True]
            worker.stop_event.wait = mock.AsyncMock(return_value=True)
            await worker.heartbeat_loop()
            self.assertTrue(requests[-1][0].endswith("/heartbeat"))
            return requests[-1][1]

        with mock.patch("agent.socket.getaddrinfo", return_value=[
                WorkerIPAddressTest.candidate()]) as resolve, \
             mock.patch("agent.socket.socket", return_value=probe), \
             mock.patch.object(worker, "_nvidia_gpus", return_value=[{"index": 0}]), \
             mock.patch.object(worker, "_system_memory", return_value={"total_bytes": 1234}):
            probe.getsockname.return_value = ("10.20.0.7", 54321)
            telemetry = await worker.scan_telemetry()
            self.assertEqual(telemetry["ip_address"], "10.20.0.7")
            self.assertIs(worker.capabilities["telemetry"], telemetry)
            await worker.ensure_registered()
            self.assertEqual(requests[-1][1]["capabilities"]["telemetry"]["ip_address"], "10.20.0.7")
            self.assertEqual(worker.capabilities["agent_version"], 11)
            assert_stored("10.20.0.7")

            probe.getsockname.return_value = ("10.20.0.8", 54321)
            body = await heartbeat()
            self.assertEqual(body["telemetry"]["ip_address"], "10.20.0.8")
            self.assertNotIn("capabilities", body)
            assert_stored("10.20.0.8")

            resolve.return_value = [WorkerIPAddressTest.candidate(
                "fd12:3456::1", family=socket.AF_INET6)]
            body = await heartbeat()
            self.assertIsNone(body["telemetry"]["ip_address"])
            assert_stored(None)

            worker.last_capability_scan = 0
            resolve.side_effect = socket.gaierror("DNS unavailable")
            body = await heartbeat()
            self.assertIsNone(body["telemetry"]["ip_address"])
            self.assertIsNone(body["capabilities"]["telemetry"]["ip_address"])
            self.assertEqual(body["telemetry"]["memory"], {"total_bytes": 1234})
            self.assertEqual(body["telemetry"]["gpus"], [{"index": 0}])
            assert_stored(None)

    async def test_ip_lookup_failure_does_not_prevent_first_registration(self):
        worker = self.make_worker()
        worker._json_request = mock.AsyncMock(side_effect=[
            {"devices": []}, {"KSampler": {}},
            {"worker_id": "synthetic-worker", "worker_token": "synthetic-token"},
        ])
        with mock.patch("agent.socket.getaddrinfo", side_effect=socket.gaierror("DNS unavailable")), \
             mock.patch("agent.socket.socket") as factory, \
             mock.patch.object(worker, "_nvidia_gpus", return_value=[]), \
             mock.patch.object(worker, "_system_memory", return_value=None):
            await worker.ensure_registered()
        body = worker._json_request.await_args.kwargs["json"]
        self.assertIsNone(body["capabilities"]["telemetry"]["ip_address"])
        self.assertEqual(worker.state["worker_id"], "synthetic-worker")
        factory.assert_not_called()


class WorkerCapacityTest(WorkerFixture, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        environment = mock.patch.dict(os.environ)
        environment.start()
        self.addCleanup(environment.stop)
        for key in ("CUDA_VISIBLE_DEVICES", "NVIDIA_VISIBLE_DEVICES"):
            os.environ.pop(key, None)
        self.worker = self.make_worker()
        self.assignment = {
            "job_id": "job-1", "attempt_id": "attempt-1", "lease_token": "private-lease",
            "lease_expires_at": time.time() + 60,
            "payload": {"graph": {
                "1": {"class_type": "Loader", "inputs": {"model": "model-v1"}},
                "2": {"class_type": "Sampler", "inputs": {
                    "seed": 456789, "prompt": "private-prompt", "model": ["1", 0],
                }},
            }},
        }
        self.now = 100.0
        # 只替换 agent 的时钟引用，不影响 asyncio 自身的单调时钟。
        self.clock = SimpleNamespace(monotonic=lambda: self.now, time=time.time)
        self.requests = []
        self.fail_stage = None
        self.cleanup_ok = True
        self.change_graph = False
        self.worker.state.update(worker_id="worker-1", worker_token="private-worker")

        async def prepare(assignment):
            self.now += 2
            if self.fail_stage == "prepare":
                raise JobFailed("prepare failed")

        async def patch(assignment):
            self.now += 1
            if self.change_graph:
                assignment["payload"]["graph"]["2"]["inputs"].pop("model")

        async def execute_comfy(assignment):
            self.now += 5
            if self.fail_stage == "execute":
                raise JobFailed("execute failed")

        async def outputs(assignment):
            self.now += 7
            if self.fail_stage == "upload":
                raise JobFailed("upload failed")
            return [{"filename": "output.png"}]

        async def request(method, url, **kwargs):
            self.requests.append((url, copy.deepcopy(kwargs.get("json"))))
            if url.endswith("/cancel"):
                self.now += 11
                return {"cancelled": True, "cleanup_complete": self.cleanup_ok}
            if url.endswith("/prompt"):
                return {"prompt_id": "job-1"}
            return {}

        self.worker.prepare_inputs = mock.AsyncMock(side_effect=prepare)
        self.worker.patch_silent_video_audio = mock.AsyncMock(side_effect=patch)
        self.worker.execute_comfy = mock.AsyncMock(side_effect=execute_comfy)
        self.worker.collect_outputs = mock.AsyncMock(side_effect=outputs)
        self.worker._json_request = mock.AsyncMock(side_effect=request)
        # Task boundary diagnostics must never invoke the host's real nvidia-smi.
        self.worker.scan_telemetry = mock.AsyncMock(return_value=None)
        self.worker.restart_comfy_only = mock.AsyncMock()

    @staticmethod
    def measurements(body):
        return {key: value for key, value in body["capacity_measurements"].items()
                if key != "diagnostics"}

    async def execute(self):
        with mock.patch("agent.time", self.clock):
            await self.worker.execute(self.assignment)
        self.assertIsNone(self.worker.current)
        return self.requests[-1][1]

    async def test_success_phase_timings_release_and_attempt(self):
        body = await self.execute()
        self.assertTrue(self.requests[-1][0].endswith("/complete"))
        self.assertEqual(body["attempt_id"], "attempt-1")
        self.assertIs(body["capacity_released"], True)
        self.assertEqual(self.measurements(body), {
            "prepare_seconds": 3, "execute_seconds": 5, "upload_seconds": 7,
            "total_seconds": 15, "graph_changed": False,
        })
        self.assertEqual(body["outputs"], [{"filename": "output.png"}])
        self.assertNotIn("private-", json.dumps(body))
        self.assertNotIn("456789", json.dumps(body))
        self.assertNotIn("_cleanup_task", self.assignment)

    async def test_graph_in_place_change_is_detected_without_reporting_contents(self):
        self.change_graph = True
        body = await self.execute()
        self.assertIs(body["capacity_measurements"]["graph_changed"], True)
        for secret in ("private-prompt", "456789", "model-v1", "inputs"):
            self.assertNotIn(secret, json.dumps(body))

    async def test_old_assignment_without_attempt_id_still_completes(self):
        self.assignment.pop("attempt_id")
        body = await self.execute()
        self.assertTrue(body["capacity_released"])
        self.assertNotIn("attempt_id", body)

    async def test_prepare_failure_omits_incomplete_phases(self):
        self.fail_stage = "prepare"
        body = await self.execute()
        self.assertEqual(self.measurements(body), {"total_seconds": 13})
        self.assertEqual(body["attempt_id"], "attempt-1")
        self.assertTrue(body["capacity_released"])
        self.worker.execute_comfy.assert_not_awaited()
        self.worker.collect_outputs.assert_not_awaited()

    async def test_execute_failure_keeps_only_completed_prepare_and_cleanup_total(self):
        self.fail_stage = "execute"
        body = await self.execute()
        self.assertEqual(self.measurements(body), {
            "prepare_seconds": 3, "graph_changed": False, "total_seconds": 19,
        })
        self.assertTrue(body["capacity_released"])
        self.assertFalse(body["canceled"])
        self.assertTrue(self.requests[-2][0].endswith("/cancel"))
        self.assertTrue(self.requests[-1][0].endswith("/failed"))

    async def test_upload_failure_omits_unknown_upload_duration(self):
        self.fail_stage = "upload"
        body = await self.execute()
        self.assertEqual(self.measurements(body), {
            "prepare_seconds": 3, "execute_seconds": 5,
            "graph_changed": False, "total_seconds": 26,
        })
        self.assertTrue(body["capacity_released"])

    async def test_cleanup_failure_never_claims_release_or_canceled(self):
        self.fail_stage = "execute"
        self.cleanup_ok = False
        self.assignment["cancel_requested"] = True
        body = await self.execute()
        self.assertIs(body["capacity_released"], False)
        self.assertIs(body["canceled"], False)
        self.assertIsNotNone(self.worker.release_failed)
        self.assertEqual(body["capacity_measurements"]["total_seconds"], 19)

    async def test_cancellation_keeps_existing_canceled_semantics(self):
        self.assignment["cancel_requested"] = True
        body = await self.execute()
        self.assertIs(body["capacity_released"], True)
        self.assertIs(body["canceled"], True)
        self.assertNotIn("upload_seconds", body["capacity_measurements"])
        self.worker.collect_outputs.assert_not_awaited()

    async def test_cancel_recovery_reports_release_without_erasing_cleanup_failure(self):
        self.fail_stage = "execute"
        self.cleanup_ok = False
        self.assignment["cancel_requested"] = True
        request = self.worker._json_request

        async def recovered(method, url, **kwargs):
            if url.endswith("/queue"):
                return {"queue_running": [], "queue_pending": []}
            return await request(method, url, **kwargs)

        self.worker._json_request = mock.AsyncMock(side_effect=recovered)
        body = await self.execute()
        self.assertTrue(body["canceled"])
        self.assertTrue(body["capacity_released"])
        self.assertTrue(body["comfy_recovered"])
        diagnostics = body["capacity_measurements"]["diagnostics"]
        self.assertFalse(diagnostics["cleanup_complete"])
        self.assertIn("未确认", diagnostics["cleanup_error"])
        self.assertIsNone(self.worker.release_failed)
        self.assertTrue(self.worker.comfy_online)
        self.assertFalse(self.worker.local_busy)
        self.worker.restart_comfy_only.assert_awaited_once_with()

    async def test_cancel_interrupts_stalled_download_or_upload_without_stopping_worker(self):
        for stage in ("prepare_inputs", "collect_outputs"):
            with self.subTest(stage=stage):
                self.assignment.pop("_cleanup_task", None)
                self.assignment.pop("cancel_requested", None)
                entered = asyncio.Event()
                gate = asyncio.Event()

                async def blocked(*args):
                    entered.set()
                    await gate.wait()

                with mock.patch.object(self.worker, stage, new=mock.AsyncMock(side_effect=blocked)):
                    execution = asyncio.create_task(self.worker.execute(self.assignment))
                    await asyncio.wait_for(entered.wait(), 1)
                    await self.worker.cancel_current("job-1")
                    await asyncio.wait_for(execution, 1)
                self.assertFalse(execution.cancelled())
                self.assertIsNone(self.worker.current)
                self.assertNotIn("_execution_task", self.assignment)
                body = self.requests[-1][1]
                self.assertTrue(body["canceled"])
                self.assertTrue(body["capacity_released"])
                self.assertFalse(self.worker.stop_event.is_set())

    async def test_complete_does_not_claim_release_when_release_gate_is_closed(self):
        self.worker.release_failed = "release not confirmed"
        body = await self.execute()
        self.assertTrue(self.requests[-1][0].endswith("/complete"))
        self.assertIs(body["capacity_released"], False)

    async def test_complete_does_not_claim_release_with_cleanup_task(self):
        self.assignment["_cleanup_task"] = asyncio.create_task(asyncio.sleep(0))
        body = await self.execute()
        self.assertTrue(self.requests[-1][0].endswith("/complete"))
        self.assertIs(body["capacity_released"], False)

    async def test_complete_report_failure_preserves_phases_and_extends_total(self):
        original = self.worker._json_request

        async def request(method, url, **kwargs):
            result = await original(method, url, **kwargs)
            if url.endswith("/complete"):
                self.now += 13
                raise aiohttp.ClientConnectionError("report failed")
            return result

        self.worker._json_request = request
        body = await self.execute()
        complete = next(body for url, body in self.requests if url.endswith("/complete"))
        self.assertEqual(complete["capacity_measurements"]["total_seconds"], 15)
        self.assertEqual(body["capacity_measurements"]["total_seconds"], 39)
        self.assertEqual(body["capacity_measurements"]["upload_seconds"], 7)
        self.assertEqual(body["capacity_measurements"]["diagnostics"]["execution_error"]["stage"], "report")
        self.assertTrue(body["capacity_released"])

    def set_execution_events(self, events):
        self.worker.execute_comfy = WorkerAgent.execute_comfy.__get__(self.worker)
        ws = mock.MagicMock()
        ws.closed = True
        ws.__aenter__.return_value = ws
        ws.receive = mock.AsyncMock(side_effect=[
            mock.Mock(type=aiohttp.WSMsgType.TEXT, data=json.dumps({"type": kind, "data": data}))
            for kind, data in events
        ])
        self.worker.session = mock.Mock()
        self.worker.session.ws_connect.return_value = ws
        self.worker.report_event = mock.AsyncMock()

    async def test_cache_events_keep_actual_partial_node_types_and_ignore_other_jobs(self):
        self.set_execution_events([
            ("execution_cached", {"prompt_id": "other", "nodes": ["2"]}),
            ("execution_cached", {"prompt_id": "job-1", "nodes": [1, "1"]}),
            ("execution_cached", {"prompt_id": "job-1", "nodes": ["1"]}),
            ("execution_success", {"prompt_id": "job-1"}),
        ])
        body = await self.execute()
        measurements = body["capacity_measurements"]
        self.assertEqual(measurements["cached_nodes"], [{"id": "1", "type": "Loader"}])
        self.assertNotIn("cache_hit", measurements)
        self.assertNotIn("private-", json.dumps(measurements))
        forwarded = [call.args[1] for call in self.worker.report_event.await_args_list
                     if call.args[1]["type"] != "capacity_diagnostics"]
        self.assertEqual(len(forwarded), 3)
        self.assertTrue(any(url.endswith("/start") for url, _ in self.requests))

    async def test_empty_cache_event_is_distinct_from_unknown_cache(self):
        self.set_execution_events([
            ("execution_cached", {"prompt_id": "job-1", "nodes": []}),
            ("execution_success", {"prompt_id": "job-1"}),
        ])
        body = await self.execute()
        self.assertEqual(body["capacity_measurements"]["cached_nodes"], [])

    async def test_cache_and_graph_observations_survive_execution_failure(self):
        self.change_graph = True
        self.set_execution_events([
            ("execution_cached", {"prompt_id": "job-1", "nodes": ["1"]}),
            ("execution_error", {"prompt_id": "job-1", "exception_message": "OOM"}),
        ])
        body = await self.execute()
        self.assertTrue(self.requests[-1][0].endswith("/failed"))
        self.assertEqual(self.measurements(body), {
            "cached_nodes": [{"id": "1", "type": "Loader"}],
            "graph_changed": True, "prepare_seconds": 3, "total_seconds": 14,
        })
        self.assertIs(body["capacity_released"], True)
        self.assertNotIn("private-", json.dumps(body["capacity_measurements"]))

    def start_diagnostics(self, index=1):
        self.worker.capabilities["devices"] = [{"type": "cuda", "index": index}]
        self.worker.current = self.assignment
        with mock.patch("agent.time.time", return_value=100):
            return self.worker.init_diagnostics(self.assignment)

    @staticmethod
    def gpu_sample(at, used=20, total=100, index=1):
        return {"collected_at": at, "gpus": [
            {"index": 0, "name": "same GPU", "memory_total_bytes": 1000,
             "memory_used_bytes": 999},
            {"index": index, "name": "same GPU", "memory_total_bytes": total,
             "memory_used_bytes": used},
        ]}

    async def test_diagnostics_preserve_execution_and_cleanup_errors(self):
        self.fail_stage = "execute"
        self.cleanup_ok = False
        body = await self.execute()
        diagnostics = body["capacity_measurements"]["diagnostics"]
        self.assertEqual(diagnostics["execution_error"], {
            "message": "execute failed", "exception_type": "JobFailed",
            "node_id": None, "node_type": None, "stage": "execute",
        })
        self.assertEqual(diagnostics["cleanup_error"], "ComfyUI 未确认 cleanup_complete")
        self.assertIs(diagnostics["cleanup_complete"], False)
        self.assertIn("显存释放未确认", body["error"])
        self.assertFalse(body["capacity_released"])
        self.worker.restart_comfy_only.assert_awaited_once()

    async def test_error_messages_are_preserved_verbatim_with_field_limits(self):
        original_message = "original line\n" * 1100
        original_cleanup = "cleanup line\n" * 400
        self.worker.execute_comfy.side_effect = JobFailed(
            original_message, exception_type="E" * 200, node_id="2", node_type="Sampler")
        request = self.worker._json_request

        async def fail_cleanup(method, url, **kwargs):
            if url.endswith("/cancel"):
                raise RuntimeError(original_cleanup)
            return await request(method, url, **kwargs)

        self.worker._json_request = mock.AsyncMock(side_effect=fail_cleanup)
        body = await self.execute()
        diagnostics = body["capacity_measurements"]["diagnostics"]
        self.assertEqual(diagnostics["execution_error"]["message"], original_message[:12000])
        self.assertEqual(diagnostics["execution_error"]["exception_type"], "E" * 160)
        self.assertEqual(diagnostics["cleanup_error"], original_cleanup[:4000])
        self.assertFalse(body["capacity_released"])

    async def test_all_terminal_paths_include_diagnostics_and_keep_business_semantics(self):
        for stage, canceled in ((None, False), ("prepare", False), ("execute", False),
                                ("upload", False), (None, True)):
            with self.subTest(stage=stage, canceled=canceled):
                self.fail_stage = stage
                self.assignment["cancel_requested"] = canceled
                body = await self.execute()
                diagnostics = body["capacity_measurements"]["diagnostics"]
                self.assertEqual(diagnostics["version"], 1)
                self.assertEqual(set(diagnostics), {
                    "version", "execution_error", "cleanup_error", "cleanup_complete",
                    "last_node", "last_progress_at", "memory",
                })
                self.assertEqual(set(diagnostics["memory"]), {
                    "source", "sample_count", "missing_samples", "first_at", "last_at",
                    "max_gap_seconds", "device_index", "device_name", "total_bytes",
                    "used_peak_bytes", "free_min_bytes", "before", "after", "latest", "peak_node",
                })
                self.assertIsNone(diagnostics["cleanup_error"])
                self.assertTrue(body["capacity_released"])
                if stage or canceled:
                    self.assertTrue(self.requests[-1][0].endswith("/failed"))
                    self.assertEqual(diagnostics["execution_error"]["stage"], stage or "execute")
                    self.assertEqual(body["canceled"], canceled)
                    self.assertTrue(diagnostics["cleanup_complete"])
                else:
                    self.assertIsNone(diagnostics["execution_error"])
                    self.assertIsNone(diagnostics["cleanup_complete"])
                self.assignment.pop("_cleanup_task", None)

    async def test_async_task_cancellation_reports_diagnostics_then_reraises(self):
        self.worker.execute_comfy.side_effect = asyncio.CancelledError()
        with self.assertRaises(asyncio.CancelledError), mock.patch("agent.time", self.clock):
            await self.worker.execute(self.assignment)
        body = self.requests[-1][1]
        self.assertTrue(body["capacity_released"])
        self.assertFalse(body["canceled"])  # Existing CancelledError semantics are unchanged.
        self.assertEqual(body["capacity_measurements"]["diagnostics"]["execution_error"]["exception_type"],
                         "CancelledError")
        self.assertIsNone(self.worker.current)

    async def test_external_shutdown_still_propagates_after_user_requested_cancel(self):
        entered = asyncio.Event()
        gate = asyncio.Event()
        cleanup_started = asyncio.Event()
        cleanup_ack = asyncio.Event()
        request = self.worker._json_request

        async def execute_comfy(_assignment):
            entered.set()
            await gate.wait()

        async def pending_cleanup(method, url, **kwargs):
            if url.endswith("/cancel"):
                cleanup_started.set()
                await cleanup_ack.wait()
            return await request(method, url, **kwargs)

        self.worker.execute_comfy = mock.AsyncMock(side_effect=execute_comfy)
        self.worker._json_request = mock.AsyncMock(side_effect=pending_cleanup)
        execution = asyncio.create_task(self.worker.execute(self.assignment))
        await asyncio.wait_for(entered.wait(), 1)
        await self.worker.cancel_current("job-1")
        await asyncio.wait_for(cleanup_started.wait(), 1)
        execution.cancel()
        await asyncio.sleep(0)
        self.assertFalse(execution.done())
        cleanup_ack.set()
        with self.assertRaises(asyncio.CancelledError):
            await asyncio.wait_for(execution, 1)
        self.assertIsNone(self.worker.current)
        self.assertTrue(self.requests[-1][1]["capacity_released"])

    async def test_worker_run_continues_after_canceling_stalled_assignment(self):
        entered = asyncio.Event()
        acquired_again = asyncio.Event()
        gate = asyncio.Event()
        count = 0

        async def prepare(_assignment):
            entered.set()
            await gate.wait()

        async def acquire():
            nonlocal count
            count += 1
            if count == 1:
                return self.assignment
            acquired_again.set()
            self.worker.stop_event.set()
            return None

        async def heartbeat():
            await entered.wait()
            await self.worker.cancel_current("job-1")
            await self.worker.stop_event.wait()

        self.worker.prepare_inputs = mock.AsyncMock(side_effect=prepare)
        self.worker.acquire = mock.AsyncMock(side_effect=acquire)
        self.worker.heartbeat_loop = heartbeat
        self.worker.scan_capabilities = mock.AsyncMock()
        self.worker.local_status = mock.AsyncMock()
        self.worker.acknowledge_deployment = mock.Mock()
        execution = asyncio.create_task(self.worker.run())
        await asyncio.wait_for(execution, 2)
        self.assertTrue(acquired_again.is_set())
        self.assertFalse(execution.cancelled())
        self.assertEqual(execution.cancelling(), 0)
        self.assertIsNone(self.worker.current)
        self.assertTrue(self.requests[-1][1]["canceled"])

    async def test_diagnostic_sampling_failure_does_not_fail_generation(self):
        self.worker.scan_telemetry.side_effect = RuntimeError("probe unavailable")
        body = await self.execute()
        self.assertTrue(self.requests[-1][0].endswith("/complete"))
        memory = body["capacity_measurements"]["diagnostics"]["memory"]
        self.assertEqual(memory["sample_count"], 0)
        self.assertEqual(memory["missing_samples"], 2)
        self.assertIsNone(memory["before"])
        self.assertIsNone(memory["after"])

    async def test_boundary_samples_are_fresh_not_cached_and_after_follows_cleanup(self):
        self.worker.capabilities["devices"] = [{"type": "cuda", "index": 1}]
        self.worker.telemetry = self.gpu_sample(1, used=99)
        sampled_after_cleanup = []

        async def sample():
            sampled_after_cleanup.append(any(url.endswith("/cancel") for url, _ in self.requests))
            return self.gpu_sample(time.time(), used=20 if len(sampled_after_cleanup) == 1 else 30)

        self.worker.scan_telemetry.side_effect = sample
        self.fail_stage = "execute"
        body = await self.execute()
        memory = body["capacity_measurements"]["diagnostics"]["memory"]
        self.assertEqual(sampled_after_cleanup, [False, True])
        self.assertEqual(memory["before"]["used_bytes"], 20)
        self.assertEqual(memory["after"]["used_bytes"], 30)
        self.assertEqual(memory["used_peak_bytes"], 30)
        self.assertEqual(memory["sample_count"], 2)

    async def test_stale_boundary_sample_is_missing_not_before(self):
        self.worker.capabilities["devices"] = [{"type": "cuda", "index": 1}]
        self.worker.scan_telemetry.return_value = self.gpu_sample(1, used=99)
        body = await self.execute()
        memory = body["capacity_measurements"]["diagnostics"]["memory"]
        self.assertIsNone(memory["before"])
        self.assertIsNone(memory["after"])
        self.assertEqual(memory["sample_count"], 0)
        self.assertGreaterEqual(memory["missing_samples"], 1)

    def test_memory_aggregation_peak_min_missing_gap_duplicates_and_index(self):
        diagnostics = self.start_diagnostics()
        observe = self.worker.observe_diagnostic_memory
        observe(self.assignment, self.gpu_sample(100), boundary="before", fresh_since=100)
        diagnostics["last_node"] = {"id": "2", "type": "Sampler"}
        observe(self.assignment, self.gpu_sample(101, used=80))
        observe(self.assignment, {"collected_at": 102, "gpus": []})
        observe(self.assignment, self.gpu_sample(105, used=60))
        observe(self.assignment, self.gpu_sample(105, used=99))
        observe(self.assignment, self.gpu_sample(104, used=99))
        observe(self.assignment, self.gpu_sample(111, used=float("nan")))
        observe(self.assignment, self.gpu_sample(112, used=70), boundary="after", fresh_since=112)
        memory = diagnostics["memory"]
        self.assertEqual(memory["sample_count"], 4)
        self.assertEqual(memory["missing_samples"], 2)
        self.assertEqual(memory["used_peak_bytes"], 80)
        self.assertEqual(memory["free_min_bytes"], 20)
        self.assertEqual(memory["max_gap_seconds"], 7)
        self.assertEqual((memory["first_at"], memory["last_at"]), (100, 112))
        self.assertEqual(memory["device_index"], 1)
        self.assertEqual(memory["device_name"], "same GPU")
        self.assertEqual(memory["peak_node"], {"id": "2", "type": "Sampler"})
        self.assertEqual(memory["before"], {"at": 100, "total_bytes": 100, "used_bytes": 20, "free_bytes": 80})
        self.assertEqual(memory["after"], memory["latest"])
        self.assertEqual(memory["after"]["used_bytes"], 70)

    def test_unknown_device_never_guesses_first_gpu_or_matching_name(self):
        for index in (None, -1, True, "1", 1.5, 5):
            with self.subTest(index=index):
                diagnostics = self.start_diagnostics(index)
                self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(101))
                self.assertEqual(diagnostics["memory"]["sample_count"], 0)
                self.assertEqual(diagnostics["memory"]["missing_samples"], 1)
                self.assertIsNone(diagnostics["memory"]["used_peak_bytes"])
        diagnostics = self.start_diagnostics(1)
        self.worker.capabilities["devices"][0]["type"] = "cpu"
        self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(101))
        self.assertEqual(diagnostics["memory"]["sample_count"], 0)

    def test_device_switch_invalidates_remaining_attempt_without_merging(self):
        diagnostics = self.start_diagnostics()
        self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(100))
        self.worker.capabilities["devices"][0]["index"] = 0
        self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(101, used=99))
        self.worker.capabilities["devices"][0]["index"] = 1
        self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(102, used=99))
        self.assertEqual(diagnostics["memory"]["sample_count"], 1)
        self.assertEqual(diagnostics["memory"]["missing_samples"], 2)
        self.assertEqual(diagnostics["memory"]["used_peak_bytes"], 20)

    def test_visibility_environment_never_guesses_logical_to_physical_mapping(self):
        for variable in ("CUDA_VISIBLE_DEVICES", "NVIDIA_VISIBLE_DEVICES"):
            for value in ("1", "1,0", "GPU-unknown", "all", "0", ""):
                with self.subTest(variable=variable, value=value), mock.patch.dict(os.environ, {variable: value}):
                    diagnostics = self.start_diagnostics(index=0)
                    self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(101))
                    memory = diagnostics["memory"]
                    self.assertIsNone(memory["device_index"])
                    self.assertEqual(memory["missing_samples"], 1)
                    self.assertEqual(memory["sample_count"], 0)
                    self.assertIsNone(memory["used_peak_bytes"])
                    self.assertIsNone(memory["before"])
                    self.assertIsNone(memory["after"])

    def test_visibility_environment_change_invalidates_attempt_mapping(self):
        diagnostics = self.start_diagnostics()
        self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(100))
        with mock.patch.dict(os.environ, {"CUDA_VISIBLE_DEVICES": "1"}):
            self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(101, used=99))
        self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(102, used=99))
        self.assertEqual(diagnostics["memory"]["sample_count"], 1)
        self.assertEqual(diagnostics["memory"]["missing_samples"], 2)
        self.assertEqual(diagnostics["memory"]["used_peak_bytes"], 20)

    def test_missing_timestamp_does_not_block_later_valid_collection_timestamp(self):
        diagnostics = self.start_diagnostics()
        self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(100))
        for at in (None, float("nan"), float("inf"), -1, True):
            sample = self.gpu_sample(at, used=99)
            with mock.patch("agent.time.time", return_value=110):
                self.worker.observe_diagnostic_memory(self.assignment, sample)
        memory = diagnostics["memory"]
        self.assertEqual(self.assignment["_diagnostic_state"]["seen_at"], 100)
        self.assertEqual(memory["last_at"], 100)
        self.assertEqual(memory["latest"]["at"], 100)
        self.assertEqual(memory["missing_samples"], 5)
        self.assertEqual(memory["max_gap_seconds"], 10)
        self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(105, used=30))
        self.assertEqual(memory["sample_count"], 2)
        self.assertEqual(memory["used_peak_bytes"], 30)
        self.assertEqual(memory["last_at"], 105)

    def test_missing_first_timestamp_keeps_all_sample_fields_unknown(self):
        diagnostics = self.start_diagnostics()
        with mock.patch("agent.time.time", return_value=110):
            self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(None, used=0))
        memory = diagnostics["memory"]
        self.assertIsNone(self.assignment["_diagnostic_state"]["seen_at"])
        self.assertEqual(memory["sample_count"], 0)
        self.assertEqual(memory["missing_samples"], 1)
        for key in ("first_at", "last_at", "used_peak_bytes", "free_min_bytes", "before", "after", "latest"):
            self.assertIsNone(memory[key])
        self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(105))
        self.assertEqual(memory["sample_count"], 1)
        self.assertEqual(memory["first_at"], 105)

    def test_collector_mapping_mismatch_is_missing_and_never_merged(self):
        diagnostics = self.start_diagnostics()
        sample = self.gpu_sample(100)
        sample["execution_device"] = [{"type": "cuda", "index": 0}]
        self.worker.observe_diagnostic_memory(self.assignment, sample)
        self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(101))
        self.assertEqual(diagnostics["memory"]["sample_count"], 0)
        self.assertEqual(diagnostics["memory"]["missing_samples"], 2)

    def test_duplicate_gpu_index_is_ambiguous_and_missing(self):
        diagnostics = self.start_diagnostics()
        sample = self.gpu_sample(101)
        sample["gpus"].append(dict(sample["gpus"][1]))
        self.worker.observe_diagnostic_memory(self.assignment, sample)
        self.assertEqual(diagnostics["memory"]["missing_samples"], 1)
        self.assertEqual(diagnostics["memory"]["sample_count"], 0)

    def test_invalid_memory_values_are_missing_not_zero(self):
        for used, total in ((0, 0), (-1, 100), (101, 100), (20, -1), (None, 100),
                            (float("inf"), 100), (20, float("nan")), (True, 100)):
            with self.subTest(used=used, total=total):
                diagnostics = self.start_diagnostics()
                self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(101, used, total))
                self.assertEqual(diagnostics["memory"]["sample_count"], 0)
                self.assertEqual(diagnostics["memory"]["missing_samples"], 1)
                self.assertIsNone(diagnostics["memory"]["free_min_bytes"])

    def test_samples_cannot_cross_task_or_attempt_boundaries(self):
        diagnostics = self.start_diagnostics()
        self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(100, used=80))
        old = self.assignment
        self.assignment = copy.deepcopy({key: value for key, value in old.items() if not key.startswith("_")})
        self.assignment["attempt_id"] = "attempt-2"
        new = self.start_diagnostics()
        self.worker.observe_diagnostic_memory(old, self.gpu_sample(101, used=99))
        self.assertEqual(diagnostics["memory"]["sample_count"], 1)
        self.assertEqual(new["memory"]["sample_count"], 0)
        self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(102, used=10))
        self.assertEqual(new["memory"]["used_peak_bytes"], 10)
        self.assignment["attempt_id"] = "attempt-3"
        self.worker.observe_diagnostic_memory(self.assignment, self.gpu_sample(103, used=99))
        self.assertEqual(new["memory"]["sample_count"], 1)

    async def test_ws_metadata_is_bounded_and_does_not_include_extra_payload(self):
        self.set_execution_events([
            ("executing", {"prompt_id": "other", "node": "1"}),
            ("executing", {"prompt_id": "job-1", "node": "2"}),
            ("progress", {"prompt_id": "job-1", "node": "2", "value": 1, "max": 2}),
            ("execution_error", {"prompt_id": "job-1", "node_id": 2, "node_type": "Sampler",
                                 "exception_type": "CUDAOutOfMemoryError", "exception_message": "OOM" * 5000,
                                 "traceback": ["private-stack"], "current_inputs": "private-tensor"}),
        ])
        body = await self.execute()
        diagnostics = body["capacity_measurements"]["diagnostics"]
        self.assertEqual(diagnostics["execution_error"], {
            "message": ("OOM" * 5000)[:12000], "exception_type": "CUDAOutOfMemoryError",
            "node_id": "2", "node_type": "Sampler", "stage": "execute",
        })
        self.assertEqual(diagnostics["last_node"], {"id": "2", "type": "Sampler"})
        self.assertIsNotNone(diagnostics["last_progress_at"])
        self.assertNotIn("private-", json.dumps(diagnostics))

    def test_only_progress_and_node_completion_advance_progress_clock(self):
        diagnostics = self.start_diagnostics()
        for event in ("execution_start", "execution_cached", "execution_error", "status"):
            self.worker.observe_diagnostic_progress(self.assignment, event, {"node": "1"})
        self.assertIsNone(diagnostics["last_progress_at"])
        with mock.patch("agent.time.time", return_value=101):
            self.worker.observe_diagnostic_progress(self.assignment, "executing", {"node": "2"})
        with mock.patch("agent.time.time", return_value=103):
            self.worker.observe_diagnostic_progress(self.assignment, "executed", {"node": "2"})
        self.assertEqual(diagnostics["last_progress_at"], 103)
        self.assertEqual(diagnostics["last_node"], {"id": "2", "type": "Sampler"})

    async def test_other_job_progress_is_ignored_and_success_is_not_progress(self):
        self.set_execution_events([
            ("executing", {"prompt_id": "other", "node": "1"}),
            ("progress", {"prompt_id": "other", "node": "2", "value": 1}),
            ("execution_success", {"prompt_id": "job-1"}),
        ])
        body = await self.execute()
        diagnostics = body["capacity_measurements"]["diagnostics"]
        self.assertIsNone(diagnostics["last_node"])
        self.assertIsNone(diagnostics["last_progress_at"])

    async def test_ws_error_metadata_survives_history_poll_failure(self):
        self.set_execution_events([("execution_error", {
            "prompt_id": "job-1", "exception_type": "CudaError", "exception_message": "original OOM",
            "node_id": "2", "node_type": "Sampler",
        })])
        ws = self.worker.session.ws_connect.return_value
        receive = ws.receive

        async def receive_after_history_deadline(**kwargs):
            self.now += 6
            return await receive(**kwargs)

        ws.receive = mock.AsyncMock(side_effect=receive_after_history_deadline)
        self.worker.history_finished = mock.AsyncMock(side_effect=JobFailed("history failed"))
        body = await self.execute()
        error = body["capacity_measurements"]["diagnostics"]["execution_error"]
        self.assertEqual(error["message"], "original OOM")
        self.assertEqual(error["exception_type"], "CudaError")
        self.assertEqual(error["node_id"], "2")
        self.assertTrue(body["capacity_released"])

    async def test_history_error_preserves_typed_metadata_without_ws_error(self):
        self.worker._json_request = mock.AsyncMock(return_value={"job-1": {"status": {
            "completed": True, "status_str": "error", "messages": [["execution_error", {
                "exception_message": "OOM", "exception_type": "CudaError", "node_id": 2,
                "node_type": "Sampler", "traceback": ["not copied"],
            }]],
        }}})
        with self.assertRaises(JobFailed) as context:
            await self.worker.history_finished("job-1")
        self.assertEqual(context.exception.node_id, 2)
        self.assertEqual(context.exception.exception_type, "CudaError")
        self.assertEqual(str(context.exception), "OOM")

    async def test_execution_error_starts_cleanup_before_reporting(self):
        self.set_execution_events([("execution_error", {
            "prompt_id": "job-1", "exception_message": "OOM", "exception_type": "CudaError",
        })])

        async def report(assignment, event):
            if event["type"] == "execution_error":
                self.assertIn("_cleanup_task", assignment)
                raise aiohttp.ClientConnectionError("controller offline")

        self.worker.report_event.side_effect = report
        body = await self.execute()
        self.assertTrue(body["capacity_released"])
        self.assertEqual(body["capacity_measurements"]["diagnostics"]["execution_error"]["message"], "OOM")

    async def test_scan_capabilities_uses_comfy_devices_and_explicit_versions_only(self):
        self.worker.config.update(capacity_environment_id="env-verified",
                                  capacity_model_version="model-verified",
                                  is_primary_node=True)
        device = {"name": "actual CUDA device", "type": "cuda", "index": 2,
                  "vram_total": 1234, "vram_free": 123}
        self.worker._json_request = mock.AsyncMock(side_effect=[
            {"devices": [device], "system": {}}, {"KSampler": {}},
        ])
        with mock.patch.object(self.worker, "_nvidia_gpus", return_value=[{"name": "other GPU"}]), \
             mock.patch.object(self.worker, "_system_memory", return_value=None), \
             mock.patch.object(self.worker, "_ip_address", return_value=None):
            caps = await self.worker.scan_capabilities()
        hardware = caps["hardware"]
        self.assertEqual(hardware["environment_id"], "env-verified")
        self.assertEqual(hardware["model_version"], "model-verified")
        self.assertEqual(hardware["execution_device"], [{
            "name": "actual CUDA device", "type": "cuda", "index": 2, "vram_total": 1234,
        }])
        self.assertEqual(caps["telemetry"]["execution_device"], hardware["execution_device"])
        self.assertEqual(caps["agent_version"], 11)
        self.assertEqual(caps["supports_task_diagnostics"], 1)
        self.assertIs(caps["supports_service_restart"], os.name == "nt")
        self.assertIs(caps["supports_host_reboot"], os.name == "nt")
        self.assertEqual(caps["supports_capacity_telemetry"], 1)
        self.assertIs(caps["is_primary_node"], True)
        self.assertNotIn("private-", json.dumps(caps))
        self.assertEqual(self.worker._json_request.await_count, 2)

    async def test_model_choices_include_required_optional_empty_and_rescan_removals(self):
        nodes = {
            "KSampler": {},
            "UNETLoader": {"input": {"required": {
                "unet_name": [["original.safetensors"], {}],
                "weight_dtype": [["default", "fp8_e4m3fn"], {}],
            }}},
            "CustomLoader": {"input": {"optional": {"mmproj": [["vision.gguf"], {}]}}},
            "EmptyLoader": {"input": {"required": {"model_name": [[], {}]}}},
            "ModernLoader": {"input": {"required": {
                "model": ["COMBO", {"options": ["model.gguf"]}],
                "lora_name": ["COMBO", {"options": []}],
            }}},
            "PrimitiveString": {"input": {"required": {"value": ["STRING", {}]}}},
            "LoadImage": {"input": {"required": {"image": [["private-input.png"], {}]}}},
            "CustomUploads": {"input": {"required": {
                "subject_1": [["private-reference.png"], {"image_upload": True}],
                "file": ["COMBO", {"options": ["private-video.mp4"], "video_upload": True}],
                "soundtrack": [["private-audio.wav"], {"audio_upload": True}],
            }}},
        }
        self.worker._json_request = mock.AsyncMock(side_effect=[{"devices": []}, nodes])
        with mock.patch.object(self.worker, "scan_telemetry", new=mock.AsyncMock()):
            caps = await self.worker.scan_capabilities()
        self.assertEqual(caps["input_choices"], {
            "UNETLoader": {"unet_name": ["original.safetensors"], "weight_dtype": ["default", "fp8_e4m3fn"]},
            "CustomLoader": {"mmproj": ["vision.gguf"]},
            "EmptyLoader": {"model_name": []},
            "ModernLoader": {"model": ["model.gguf"], "lora_name": []},
        })
        self.assertEqual(caps["input_types"]["ModernLoader"], {"model": "COMBO", "lora_name": "COMBO"})
        self.assertEqual(caps["input_types"]["PrimitiveString"], {"value": "STRING"})
        self.assertNotIn("LoadImage", caps["input_choices"])
        self.assertNotIn("CustomUploads", caps["input_choices"])
        self.assertNotIn("private-", json.dumps(caps))
        nodes["UNETLoader"]["input"]["required"]["unet_name"] = [[], {}]
        self.worker._json_request = mock.AsyncMock(side_effect=[{"devices": []}, nodes])
        with mock.patch.object(self.worker, "scan_telemetry", new=mock.AsyncMock()):
            refreshed = await self.worker.scan_capabilities()
        self.assertEqual(refreshed["input_choices"]["UNETLoader"]["unet_name"], [])

    async def test_registered_worker_does_not_reregister_after_identity_migration(self):
        await self.worker.ensure_registered()
        self.worker._json_request.assert_not_awaited()
        self.assertEqual(json.loads(self.worker.state_path.read_text())["host_id"],
                         self.worker.state["host_id"])

    async def test_heartbeat_transmits_temperature_with_original_collection_time(self):
        self.worker.telemetry = {
            "collected_at": time.time() - 3,
            "gpus": [{"index": 0, "temperature_c": 67.5},
                     {"index": 1, "temperature_c": None}],
        }
        self.worker.last_capability_scan = time.time()
        self.worker.last_telemetry_scan = time.time()
        self.worker.local_status = mock.AsyncMock()
        self.worker.confirm_release_recovery = mock.AsyncMock()
        self.worker.stop_event = mock.Mock()
        self.worker.stop_event.is_set.side_effect = [False, True]
        self.worker.stop_event.wait = mock.AsyncMock(return_value=True)
        await self.worker.heartbeat_loop()
        body = self.requests[-1][1]
        self.assertEqual(body["telemetry"], self.worker.telemetry)
        self.assertNotIn("private-", json.dumps(body))

    def configure_one_heartbeat(self):
        self.worker.last_capability_scan = time.time()
        self.worker.last_telemetry_scan = 0
        self.worker.local_status = mock.AsyncMock()
        self.worker.confirm_release_recovery = mock.AsyncMock()
        self.worker.stop_event = mock.Mock()
        self.worker.stop_event.is_set.side_effect = [False, True]

        async def wait():
            await asyncio.sleep(0)  # Allow the nonblocking diagnostic report to run.
            return True

        self.worker.stop_event.wait = mock.AsyncMock(side_effect=wait)

    async def test_heartbeat_reports_only_current_assignment_with_snapshot_and_lease(self):
        diagnostics = self.start_diagnostics()
        self.configure_one_heartbeat()
        self.worker.scan_telemetry.return_value = self.gpu_sample(time.time(), used=75)
        await self.worker.heartbeat_loop()
        task = self.assignment.get("_diagnostics_report_task")
        if task is not None:
            await task
        event = next(body for url, body in self.requests if url.endswith("/event"))
        self.assertEqual(event["type"], "capacity_diagnostics")
        self.assertEqual(event["data"]["diagnostics"]["memory"]["used_peak_bytes"], 75)
        diagnostics["memory"]["used_peak_bytes"] = 99
        self.assertEqual(event["data"]["diagnostics"]["memory"]["used_peak_bytes"], 75)
        call = next(call for call in self.worker._json_request.await_args_list
                    if call.args[1].endswith("/event"))
        self.assertEqual(call.kwargs["headers"]["X-Lease-Token"], "private-lease")
        self.assertEqual(call.kwargs["headers"]["Authorization"], "Bearer private-worker")
        self.assertNotIn("private-", json.dumps(event))

    async def test_heartbeat_diagnostic_network_failure_does_not_cancel_job(self):
        self.start_diagnostics()
        self.assignment["_lease_deadline"] = 0  # Must not trigger heartbeat's lease-failure path.
        self.configure_one_heartbeat()
        self.worker.scan_telemetry.return_value = self.gpu_sample(time.time())
        original = self.worker._json_request

        async def request(method, url, **kwargs):
            if url.endswith("/event"):
                raise aiohttp.ClientConnectionError("controller restarting")
            return await original(method, url, **kwargs)

        self.worker._json_request = mock.AsyncMock(side_effect=request)
        self.worker.cancel_current = mock.AsyncMock()
        await self.worker.heartbeat_loop()
        await self.assignment["_diagnostics_report_task"]
        self.assertTrue(any(url.endswith("/heartbeat") for url, _ in self.requests))
        self.worker.cancel_current.assert_not_awaited()
        self.assertNotIn("cancel_requested", self.assignment)

    async def test_diagnostic_event_has_short_timeout_without_changing_business_event_timeout(self):
        for event_type in ("capacity_diagnostics", "progress", "execution_error", "execution_interrupted"):
            with self.subTest(event_type=event_type):
                self.worker._json_request.reset_mock()
                event = {"type": event_type, "data": {}}
                await self.worker.report_event(self.assignment, event)
                kwargs = self.worker._json_request.await_args.kwargs
                self.assertEqual(kwargs["headers"]["X-Lease-Token"], "private-lease")
                self.assertIs(kwargs["json"], event)
                if event_type == "capacity_diagnostics":
                    timeout = kwargs["timeout"]
                    self.assertEqual(timeout.total, 2)
                    self.assertEqual(timeout.connect, 1)
                    self.assertEqual(timeout.sock_connect, 1)
                else:
                    self.assertNotIn("timeout", kwargs)

    async def test_diagnostic_reports_are_single_flight_per_attempt(self):
        self.start_diagnostics()
        started = asyncio.Event()
        gate = asyncio.Event()

        async def report(*args):
            started.set()
            await gate.wait()

        self.worker.report_event = mock.AsyncMock(side_effect=report)
        self.worker.queue_diagnostics(self.assignment)
        await asyncio.wait_for(started.wait(), timeout=1)
        task = self.assignment["_diagnostics_report_task"]
        for _ in range(10):
            self.worker.queue_diagnostics(self.assignment)
            self.assertIs(self.assignment["_diagnostics_report_task"], task)
        self.worker.report_event.assert_awaited_once()
        self.worker.finish_diagnostic_reports(self.assignment)
        await asyncio.gather(task, return_exceptions=True)

    async def test_diagnostic_timeout_does_not_cancel_current_job_or_heartbeat(self):
        diagnostics = self.start_diagnostics()
        self.configure_one_heartbeat()
        self.assignment["_lease_deadline"] = 0
        self.worker.scan_telemetry.return_value = self.gpu_sample(time.time())
        request = self.worker._json_request

        async def timeout(method, url, **kwargs):
            if url.endswith("/event"):
                self.assertEqual(kwargs["timeout"].total, 2)
                raise asyncio.TimeoutError("diagnostic timed out")
            return await request(method, url, **kwargs)

        self.worker._json_request = mock.AsyncMock(side_effect=timeout)
        self.worker.cancel_current = mock.AsyncMock()
        self.worker.record_execution_error(self.assignment, JobFailed(
            "original OOM", exception_type="CudaError", node_id="2", node_type="Sampler"), "execute")
        await self.worker.heartbeat_loop()
        await self.assignment["_diagnostics_report_task"]
        self.assertTrue(any(url.endswith("/heartbeat") for url, _ in self.requests))
        self.worker.cancel_current.assert_not_awaited()
        self.assertEqual(diagnostics["execution_error"]["message"], "original OOM")
        self.assertEqual(diagnostics["execution_error"]["node_id"], "2")
        self.worker.record_execution_error(self.assignment, RuntimeError("later report failed"), "report")
        self.assertEqual(diagnostics["execution_error"]["message"], "original OOM")

    async def test_heartbeat_slow_diagnostic_does_not_block_heartbeat_or_cleanup(self):
        self.start_diagnostics()
        self.configure_one_heartbeat()
        self.worker.scan_telemetry.return_value = self.gpu_sample(time.time())
        gate = asyncio.Event()
        self.worker.report_event = mock.AsyncMock(side_effect=lambda *args: None)

        async def report(*args):
            await gate.wait()

        self.worker.report_event.side_effect = report
        await asyncio.wait_for(self.worker.heartbeat_loop(), timeout=1)
        task = self.assignment["_diagnostics_report_task"]
        self.assertFalse(task.done())
        await self.worker.cancel_current("job-1")
        self.assertIn("_cleanup_task", self.assignment)
        await self.assignment["_cleanup_task"]
        self.worker.finish_diagnostic_reports(self.assignment)
        await asyncio.gather(task, return_exceptions=True)

    async def test_heartbeat_scan_failure_does_not_fail_heartbeat(self):
        diagnostics = self.start_diagnostics()
        self.configure_one_heartbeat()
        self.worker.scan_telemetry.side_effect = RuntimeError("probe failed")
        self.worker.cancel_current = mock.AsyncMock()
        await self.worker.heartbeat_loop()
        await self.assignment["_diagnostics_report_task"]
        self.assertEqual(diagnostics["memory"]["missing_samples"], 1)
        self.assertTrue(any(url.endswith("/heartbeat") for url, _ in self.requests))
        self.worker.cancel_current.assert_not_awaited()

    async def test_heartbeat_assignment_switch_during_scan_does_not_attribute_sample(self):
        diagnostics = self.start_diagnostics()
        self.configure_one_heartbeat()
        other = {"job_id": "job-2", "attempt_id": "attempt-2", "lease_token": "other-lease"}
        self.worker.report_event = mock.AsyncMock()

        async def scan():
            self.worker.current = other
            self.worker.init_diagnostics(other)
            return self.gpu_sample(time.time(), used=99)

        self.worker.scan_telemetry.side_effect = scan
        await self.worker.heartbeat_loop()
        self.assertEqual(diagnostics["memory"]["sample_count"], 0)
        self.assertEqual(other["_capacity_measurements"]["diagnostics"]["memory"]["sample_count"], 0)
        self.worker.report_event.assert_not_awaited()
        self.assertEqual(self.requests[-1][1]["current_job_id"], "job-2")

    async def test_heartbeat_same_assignment_reused_for_other_attempt_during_scan(self):
        diagnostics = self.start_diagnostics()
        self.configure_one_heartbeat()
        self.worker.report_event = mock.AsyncMock()

        async def scan():
            self.assignment["attempt_id"] = "replacement-attempt"
            self.worker.init_diagnostics(self.assignment)
            return self.gpu_sample(time.time(), used=99)

        self.worker.scan_telemetry.side_effect = scan
        await self.worker.heartbeat_loop()
        self.assertEqual(diagnostics["memory"]["sample_count"], 0)
        new = self.assignment["_capacity_measurements"]["diagnostics"]
        self.assertEqual(new["memory"]["sample_count"], 0)
        self.worker.report_event.assert_not_awaited()

    async def test_incremental_report_uses_deep_copy_at_enqueue_time(self):
        diagnostics = self.start_diagnostics()
        self.worker.report_event = mock.AsyncMock()
        diagnostics["last_node"] = {"id": "1", "type": "Loader"}
        self.worker.queue_diagnostics(self.assignment)
        diagnostics["last_node"]["id"] = "2"
        await self.assignment["_diagnostics_report_task"]
        event = self.worker.report_event.await_args.args[1]
        self.assertEqual(event["data"]["diagnostics"]["last_node"]["id"], "1")

    async def test_incremental_report_rechecks_attempt_identity_before_sending(self):
        self.start_diagnostics()
        self.worker.report_event = mock.AsyncMock()
        self.worker.queue_diagnostics(self.assignment)
        self.assignment["attempt_id"] = "replacement-attempt"
        await self.assignment["_diagnostics_report_task"]
        self.worker.report_event.assert_not_awaited()

    async def test_heartbeat_release_requires_all_four_observations(self):
        for current, failed, online, busy, expected in (
            (None, None, True, False, True),
            (self.assignment, None, True, False, False),
            ({}, None, True, False, False),
            (None, "unconfirmed", True, False, False),
            (None, None, False, False, False),
            (None, None, True, True, False),
        ):
            with self.subTest(current=current, failed=failed, online=online, busy=busy):
                self.worker.current = current
                self.worker.release_failed = failed
                self.worker.comfy_online = online
                self.worker.local_busy = busy
                self.worker.last_capability_scan = time.time()
                self.worker.last_telemetry_scan = time.time()
                self.worker.local_status = mock.AsyncMock()
                self.worker.confirm_release_recovery = mock.AsyncMock()
                self.worker.stop_event = mock.Mock()
                self.worker.stop_event.is_set.side_effect = [False, True]
                self.worker.stop_event.wait = mock.AsyncMock(return_value=True)
                await self.worker.heartbeat_loop()
                self.assertTrue(self.requests[-1][0].endswith("/heartbeat"))
                self.assertIs(self.requests[-1][1]["capacity_released"], expected)


if __name__ == "__main__":
    unittest.main()
