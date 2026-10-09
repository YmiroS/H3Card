import asyncio
import copy
import json
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
from agent import JobFailed, WorkerAgent


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
        save.assert_not_called()
        self.assertFalse(hasattr(worker, "state"))


class WorkerCapacityTest(WorkerFixture, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
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
        self.assertEqual(body["capacity_measurements"], {
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
        self.assertEqual(body["capacity_measurements"], {"total_seconds": 13})
        self.assertEqual(body["attempt_id"], "attempt-1")
        self.assertTrue(body["capacity_released"])
        self.worker.execute_comfy.assert_not_awaited()
        self.worker.collect_outputs.assert_not_awaited()

    async def test_execute_failure_keeps_only_completed_prepare_and_cleanup_total(self):
        self.fail_stage = "execute"
        body = await self.execute()
        self.assertEqual(body["capacity_measurements"], {
            "prepare_seconds": 3, "graph_changed": False, "total_seconds": 19,
        })
        self.assertTrue(body["capacity_released"])
        self.assertFalse(body["canceled"])
        self.assertTrue(self.requests[-2][0].endswith("/cancel"))
        self.assertTrue(self.requests[-1][0].endswith("/failed"))

    async def test_upload_failure_omits_unknown_upload_duration(self):
        self.fail_stage = "upload"
        body = await self.execute()
        self.assertEqual(body["capacity_measurements"], {
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
        self.assertEqual(self.worker.report_event.await_count, 3)
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
        self.assertEqual(body["capacity_measurements"], {
            "cached_nodes": [{"id": "1", "type": "Loader"}],
            "graph_changed": True, "prepare_seconds": 3, "total_seconds": 14,
        })
        self.assertIs(body["capacity_released"], True)
        self.assertNotIn("private-", json.dumps(body["capacity_measurements"]))

    async def test_scan_capabilities_uses_comfy_devices_and_explicit_versions_only(self):
        self.worker.config.update(capacity_environment_id="env-verified",
                                  capacity_model_version="model-verified")
        device = {"name": "actual CUDA device", "type": "cuda", "index": 2,
                  "vram_total": 1234, "vram_free": 123}
        self.worker._json_request = mock.AsyncMock(side_effect=[
            {"devices": [device], "system": {}}, {"Sampler": {}},
        ])
        with mock.patch.object(self.worker, "_nvidia_gpus", return_value=[{"name": "other GPU"}]), \
             mock.patch.object(self.worker, "_system_memory", return_value=None):
            caps = await self.worker.scan_capabilities()
        hardware = caps["hardware"]
        self.assertEqual(hardware["environment_id"], "env-verified")
        self.assertEqual(hardware["model_version"], "model-verified")
        self.assertEqual(hardware["execution_device"], [{
            "name": "actual CUDA device", "type": "cuda", "index": 2, "vram_total": 1234,
        }])
        self.assertEqual(caps["telemetry"]["execution_device"], hardware["execution_device"])
        self.assertEqual(caps["agent_version"], 4)
        self.assertEqual(caps["supports_capacity_telemetry"], 1)
        self.assertNotIn("private-", json.dumps(caps))
        self.assertEqual(self.worker._json_request.await_count, 2)

    async def test_registered_worker_does_not_reregister_after_identity_migration(self):
        await self.worker.ensure_registered()
        self.worker._json_request.assert_not_awaited()
        self.assertEqual(json.loads(self.worker.state_path.read_text())["host_id"],
                         self.worker.state["host_id"])

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
