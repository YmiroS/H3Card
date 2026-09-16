import asyncio
import json
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock

import aiohttp

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "worker"))

from distributed import DistributedStore, RTX_5090_GPU_POLICY
from agent import JobFailed, WorkerAgent


class DistributedStoreTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = DistributedStore(
            Path(self.temp.name) / "control.db", lease_seconds=0.05, offline_seconds=10
        )
        credentials = self.store.register_worker(
            "gpu-01", {"node_classes": ["KSampler", "SaveImage"]}
        )
        self.worker_id = credentials["worker_id"]
        self.worker_token = credentials["worker_token"]
        self.store.heartbeat(
            self.worker_id,
            capabilities={"node_classes": ["KSampler", "SaveImage"]},
            comfy_online=True,
            busy=False,
        )

    def tearDown(self):
        self.store.close()
        self.temp.cleanup()

    def test_authentication_and_worker_state(self):
        self.assertTrue(self.store.authenticate(self.worker_id, self.worker_token))
        self.assertFalse(self.store.authenticate(self.worker_id, "wrong"))
        worker = self.store.list_workers()[0]
        self.assertNotIn("token_hash", worker)
        self.assertEqual(worker["state"], "idle")
        self.assertEqual(worker["capabilities"]["node_classes"], ["KSampler", "SaveImage"])

    def test_list_workers_keeps_only_latest_same_name_registration(self):
        newest = self.store.register_worker(
            "GPU-01", {"node_classes": ["KSampler", "SaveImage", "VHS_LoadVideo"]}
        )
        self.store.heartbeat(
            newest["worker_id"], comfy_online=True, busy=False,
        )

        workers = self.store.list_workers()
        self.assertEqual(len(workers), 1)
        self.assertEqual(workers[0]["id"], newest["worker_id"])
        self.assertEqual(workers[0]["name"], "GPU-01")
        self.assertEqual(
            self.store.db.execute("SELECT COUNT(*) FROM workers").fetchone()[0], 2
        )
        self.assertTrue(self.store.authenticate(self.worker_id, self.worker_token))

    def test_heartbeat_merges_telemetry_without_dropping_capabilities(self):
        telemetry = {
            "hostname": "RENDER-01",
            "gpus": [{
                "index": 0, "name": "NVIDIA GeForce RTX 4090",
                "utilization_percent": 42,
                "memory_used_bytes": 8 * 1024 ** 3,
                "memory_total_bytes": 24 * 1024 ** 3,
            }],
            "memory": {
                "used_bytes": 32 * 1024 ** 3,
                "total_bytes": 64 * 1024 ** 3,
            },
        }

        self.store.heartbeat(
            self.worker_id, telemetry=telemetry, comfy_online=True, busy=False
        )

        capabilities = self.store.list_workers()[0]["capabilities"]
        self.assertEqual(capabilities["node_classes"], ["KSampler", "SaveImage"])
        self.assertEqual(capabilities["telemetry"], telemetry)

    def test_high_quality_h3_requires_primary_rtx_5090(self):
        self.store.enqueue("hq", {"capability": "minimax_h3_ref_2pass"}, ["KSampler"])
        rejected = [
            None, [], [{}],
            [{"type": "cuda", "name": "NVIDIA GeForce RTX 4090"}],
            [{"type": "cuda", "name": "NVIDIA GeForce RTX 50900"}],
            [{"type": "cpu", "name": "RTX 5090"}],
            [{"type": "cuda", "name": "RTX 4090"}, {"type": "cuda", "name": "RTX 5090"}],
        ]
        for devices in rejected:
            with self.subTest(devices=devices):
                self.store.heartbeat(self.worker_id, comfy_online=True, capabilities={
                    "node_classes": ["KSampler"], "devices": devices,
                    "telemetry": {"hostname": "GPU-5090", "gpus": [{"name": "RTX 5090"}]},
                })
                self.assertIsNone(self.store.acquire(self.worker_id))
                self.assertEqual(self.store.db.execute(
                    "SELECT status FROM dispatch_jobs WHERE job_id = 'hq'"
                ).fetchone()[0], "queued")

        for name in ("cuda:0 NVIDIA GeForce RTX 5090 : cudaMallocAsync", "NVIDIA GeForce RTX 5090 D", "rtx 5090d"):
            with self.subTest(name=name):
                self.store.heartbeat(self.worker_id, comfy_online=True, capabilities={
                    "node_classes": ["KSampler"], "devices": [{"type": "cuda", "name": name}],
                })
                assignment = self.store.acquire(self.worker_id)
                self.assertEqual(assignment["job_id"], "hq")
                self.store.finish("hq", self.worker_id, assignment["lease_token"], "done")
                self.store.remove_job("hq")
                self.store.enqueue("hq", {"capability": "minimax_h3_ref_2pass"}, ["KSampler"])

    def test_long_video_gpu_policy_requires_primary_rtx_5090(self):
        self.store.enqueue("long-video", {
            "capability": "minimax_h3_ref9",
            "gpu_policy": RTX_5090_GPU_POLICY,
        }, ["KSampler"])
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities={
            "node_classes": ["KSampler"],
            "devices": [{"type": "cuda", "name": "NVIDIA GeForce RTX 4090"}],
        })
        self.assertIsNone(self.store.acquire(self.worker_id))
        self.assertEqual(self.store.db.execute(
            "SELECT status FROM dispatch_jobs WHERE job_id = 'long-video'"
        ).fetchone()[0], "queued")

        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities={
            "node_classes": ["KSampler"],
            "devices": [{"type": "cuda", "name": "NVIDIA GeForce RTX 5090"}],
        })
        assignment = self.store.acquire(self.worker_id)
        self.assertEqual(assignment["job_id"], "long-video")
        self.assertEqual(assignment["payload"]["gpu_policy"], RTX_5090_GPU_POLICY)

    def test_high_quality_gpu_rule_precedes_affinity_and_fifo(self):
        self._finish_success("warm", "minimax_h3_ref9", "minimax_h3")
        self.store.enqueue("hq", {
            "capability": "minimax_h3_ref_2pass", "model_family": "minimax_h3",
        }, ["KSampler"])
        self.store.enqueue("ordinary", {"capability": "zimage_t2i"}, ["KSampler"])
        for wait_limit in (0, 60):
            with self.subTest(wait_limit=wait_limit):
                self.store.affinity_max_wait_seconds = wait_limit
                with self.store.db:
                    self.store.db.execute(
                        "UPDATE workers SET last_capability_id = ?, last_model_family = ? WHERE id = ?",
                        ("minimax_h3_ref_2pass", "minimax_h3", self.worker_id),
                    )
                assignment = self.store.acquire(self.worker_id)
                self.assertEqual(assignment["job_id"], "ordinary")
                self.store.finish("ordinary", self.worker_id, assignment["lease_token"], "done")
                self.store.remove_job("ordinary")
                self.store.enqueue("ordinary", {"capability": "zimage_t2i"}, ["KSampler"])

    def test_rtx_5090_still_needs_required_nodes(self):
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities={
            "node_classes": ["KSampler"],
            "devices": [{"type": "cuda", "name": "NVIDIA GeForce RTX 5090"}],
        })
        self.store.enqueue("hq", {"capability": "minimax_h3_ref_2pass"}, ["MissingNode"])
        self.assertIsNone(self.store.acquire(self.worker_id))

    def test_acquire_matches_capabilities_and_enforces_lease(self):
        self.store.enqueue("missing", {"graph": {}}, ["MissingNode"])
        self.store.enqueue("matched", {"graph": {"1": {"class_type": "KSampler"}}}, ["KSampler"])

        assignment = self.store.acquire(self.worker_id)
        self.assertEqual(assignment["job_id"], "matched")
        self.assertIsNone(self.store.acquire(self.worker_id))
        self.assertFalse(self.store.validate_lease("matched", self.worker_id, "wrong"))
        self.assertTrue(self.store.mark_running(
            "matched", self.worker_id, assignment["lease_token"]
        ))

        self.assertEqual(self.store.request_cancel("matched"), "cancel_requested")
        heartbeat = self.store.heartbeat(
            self.worker_id, comfy_online=True, busy=True, current_job_id="matched"
        )
        self.assertEqual(heartbeat["commands"], [
            {"type": "cancel_job", "job_id": "matched"}
        ])
        self.assertGreater(heartbeat["lease_ttl_seconds"], 0)
        self.assertTrue(self.store.finish(
            "matched", self.worker_id, assignment["lease_token"], "canceled"
        ))
        self.assertEqual(self.store.list_workers()[0]["state"], "idle")

    def test_expired_assignment_is_requeued_and_old_lease_is_rejected(self):
        self.store.enqueue("job-1", {"graph": {}}, [])
        first = self.store.acquire(self.worker_id)
        time.sleep(0.07)
        self.store.heartbeat(
            self.worker_id, comfy_online=True, busy=False, current_job_id=None
        )
        second = self.store.acquire(self.worker_id)

        self.assertEqual(second["job_id"], "job-1")
        self.assertNotEqual(first["lease_token"], second["lease_token"])
        self.assertFalse(self.store.validate_lease(
            "job-1", self.worker_id, first["lease_token"]
        ))

    def test_disabled_worker_cannot_acquire(self):
        self.store.enqueue("job-1", {"graph": {}}, [])
        self.assertTrue(self.store.set_worker_enabled(self.worker_id, False))
        self.assertIsNone(self.store.acquire(self.worker_id))
        self.assertEqual(self.store.list_workers()[0]["state"], "disabled")

    def test_terminal_job_heartbeat_cannot_make_worker_busy_again(self):
        self.store.enqueue("job-1", {"graph": {}}, [])
        assignment = self.store.acquire(self.worker_id)
        self.assertTrue(self.store.mark_running(
            "job-1", self.worker_id, assignment["lease_token"]
        ))
        self.assertTrue(self.store.finish(
            "job-1", self.worker_id, assignment["lease_token"], "error"
        ))

        heartbeat = self.store.heartbeat(
            self.worker_id, comfy_online=True, busy=True, local_busy=False,
            current_job_id="job-1",
        )

        self.assertEqual(heartbeat["commands"], [
            {"type": "abort_job", "job_id": "job-1"}
        ])
        worker = self.store.list_workers()[0]
        self.assertEqual(worker["state"], "idle")
        self.assertIsNone(worker["current_job_id"])
        self.assertEqual(self.store.dispatch_status("job-1", self.worker_id), "error")

    def _finish_success(self, job_id, capability, model_family):
        self.store.enqueue(job_id, {
            "graph": {}, "capability": capability, "model_family": model_family,
        }, [])
        assignment = self.store.acquire(self.worker_id)
        self.assertEqual(assignment["job_id"], job_id)
        self.assertTrue(self.store.mark_running(
            job_id, self.worker_id, assignment["lease_token"]
        ))
        self.assertTrue(self.store.finish(
            job_id, self.worker_id, assignment["lease_token"], "done"
        ))

    def test_acquire_prefers_same_workflow(self):
        self._finish_success("warm", "minimax_h3_ref9", "minimax_h3")
        worker = self.store.list_workers()[0]
        self.assertEqual(worker["last_capability_id"], "minimax_h3_ref9")
        self.assertEqual(worker["last_model_family"], "minimax_h3")

        self.store.enqueue("older-same-family", {
            "graph": {}, "capability": "minimax_h3_i2v", "model_family": "minimax_h3",
        }, [])
        self.store.enqueue("same-workflow", {
            "graph": {}, "capability": "minimax_h3_ref9", "model_family": "minimax_h3",
        }, [])

        assignment = self.store.acquire(self.worker_id)
        self.assertEqual(assignment["job_id"], "same-workflow")

    def test_acquire_falls_back_to_same_model_family(self):
        self._finish_success("warm", "minimax_h3_ref9", "minimax_h3")
        self.store.enqueue("older-other", {
            "graph": {}, "capability": "zimage_t2i", "model_family": "zimage",
        }, [])
        self.store.enqueue("same-family", {
            "graph": {}, "capability": "minimax_h3_i2v", "model_family": "minimax_h3",
        }, [])

        assignment = self.store.acquire(self.worker_id)
        self.assertEqual(assignment["job_id"], "same-family")

    def test_affinity_does_not_bypass_fifo_after_wait_limit(self):
        self._finish_success("warm", "minimax_h3_ref9", "minimax_h3")
        self.store.enqueue("oldest", {
            "graph": {}, "capability": "zimage_t2i", "model_family": "zimage",
        }, [])
        self.store.enqueue("same-workflow", {
            "graph": {}, "capability": "minimax_h3_ref9", "model_family": "minimax_h3",
        }, [])
        self.store.affinity_max_wait_seconds = 0

        assignment = self.store.acquire(self.worker_id)
        self.assertEqual(assignment["job_id"], "oldest")


class DistributedStoreMigrationTest(unittest.TestCase):
    def test_existing_worker_table_gains_affinity_columns(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "control.db"
            db = sqlite3.connect(path)
            try:
                db.execute("""CREATE TABLE workers (
                    id TEXT PRIMARY KEY, name TEXT NOT NULL, token_hash TEXT NOT NULL,
                    enabled INTEGER NOT NULL DEFAULT 1, last_seen REAL NOT NULL,
                    comfy_online INTEGER NOT NULL DEFAULT 0, busy INTEGER NOT NULL DEFAULT 0,
                    current_job_id TEXT, capabilities_json TEXT NOT NULL DEFAULT '{}',
                    created_at REAL NOT NULL, updated_at REAL NOT NULL
                )""")
                db.commit()
            finally:
                db.close()
            store = DistributedStore(path)
            try:
                columns = {row[1] for row in store.db.execute("PRAGMA table_info(workers)")}
                self.assertIn("last_capability_id", columns)
                self.assertIn("last_model_family", columns)
            finally:
                store.close()


class WorkerTelemetryTest(unittest.TestCase):
    @mock.patch("agent.subprocess.run")
    def test_reads_nvidia_gpu_utilization_and_vram(self, run):
        run.return_value = mock.Mock(
            returncode=0,
            stdout="0, NVIDIA GeForce RTX 4090, 73, 12288, 24564\n",
        )

        gpus = WorkerAgent._nvidia_gpus()

        self.assertEqual(gpus, [{
            "index": 0,
            "name": "NVIDIA GeForce RTX 4090",
            "utilization_percent": 73.0,
            "memory_used_bytes": 12288 * 1024 ** 2,
            "memory_total_bytes": 24564 * 1024 ** 2,
        }])

    def test_reads_windows_system_memory(self):
        total = 64 * 1024 ** 3
        available = 18 * 1024 ** 3
        windows = mock.Mock()

        def fill_memory(status_pointer):
            status_pointer._obj.ullTotalPhys = total
            status_pointer._obj.ullAvailPhys = available
            return 1

        windows.kernel32.GlobalMemoryStatusEx.side_effect = fill_memory
        with mock.patch("agent.os.name", "nt"), \
             mock.patch("agent.ctypes.windll", windows, create=True):
            memory = WorkerAgent._system_memory()

        self.assertEqual(memory, {
            "used_bytes": total - available,
            "total_bytes": total,
        })

    @mock.patch("agent.subprocess.run", side_effect=FileNotFoundError)
    def test_missing_nvidia_smi_reports_no_gpu_metrics(self, _run):
        self.assertEqual(WorkerAgent._nvidia_gpus(), [])

    @mock.patch("agent.subprocess.run")
    def test_nvidia_smi_timeout_reports_no_gpu_metrics(self, run):
        run.side_effect = subprocess.TimeoutExpired("nvidia-smi", 5)
        self.assertEqual(WorkerAgent._nvidia_gpus(), [])

    def test_probe_failures_do_not_break_telemetry(self):
        worker = WorkerAgent.__new__(WorkerAgent)
        worker.config = {"worker_name": "GPU-FALLBACK"}
        with mock.patch.object(
                WorkerAgent, "_nvidia_gpus", side_effect=RuntimeError("gpu failed")), \
             mock.patch.object(
                WorkerAgent, "_system_memory", side_effect=RuntimeError("ram failed")):
            telemetry = worker.collect_telemetry()

        self.assertEqual(telemetry["gpus"], [])
        self.assertIsNone(telemetry["memory"])
        self.assertIn("hostname", telemetry)
        self.assertIn("collected_at", telemetry)


class WorkerInputPathTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.agent = WorkerAgent.__new__(WorkerAgent)
        self.agent.comfy_input = Path(self.temp.name).resolve()

    def tearDown(self):
        self.temp.cleanup()

    def test_accepts_central_chouka_reference(self):
        target, filename = self.agent._input_target("chouka/input.png")
        self.assertEqual(filename, "input.png")
        self.assertEqual(target, self.agent.comfy_input / "chouka" / "input.png")

    def test_rejects_path_traversal_and_unknown_prefix(self):
        for ref in ("../secret.txt", "chouka/../secret.txt", "other/input.png"):
            with self.subTest(ref=ref), self.assertRaises(JobFailed):
                self.agent._input_target(ref)

    def test_removes_only_silent_video_audio_links(self):
        graph = {
            "45": {"inputs": {
                "ref_video": ["78", 0],
                "ref_audio": ["78", 2],
                "other_audio": ["79", 2],
            }},
            "78": {"class_type": "VHS_LoadVideo", "inputs": {
                "video": "chouka/silent.mov"
            }},
        }
        removed = self.agent._remove_output_links(graph, "78", 2)
        self.assertEqual(removed, 1)
        self.assertEqual(graph["45"]["inputs"]["ref_video"], ["78", 0])
        self.assertEqual(graph["45"]["inputs"]["other_audio"], ["79", 2])
        self.assertNotIn("ref_audio", graph["45"]["inputs"])


class WorkerExecutionEventTest(unittest.IsolatedAsyncioTestCase):
    async def test_history_success_finishes_silent_websocket_without_heartbeat(self):
        class FakeWebSocket:
            closed = False

            async def __aenter__(self):
                return self

            async def __aexit__(self, *_args):
                return False

            async def receive(self, timeout=None):
                self.timeout = timeout
                raise asyncio.TimeoutError

        class FakeSession:
            def __init__(self):
                self.kwargs = None

            def ws_connect(self, _url, **kwargs):
                self.kwargs = kwargs
                return FakeWebSocket()

        agent = WorkerAgent.__new__(WorkerAgent)
        agent.comfy_lock = asyncio.Lock()
        agent.release_failed = None
        agent.server = "http://controller"
        agent.comfy = "http://comfy"
        agent.comfy_ws = "ws://comfy/ws"
        agent.session = FakeSession()
        agent.state = {"worker_id": "worker", "worker_token": "token"}

        async def json_request(_method, url, **_kwargs):
            if url.endswith("/prompt"):
                return {"prompt_id": "job-1"}
            if url.endswith("/history/job-1"):
                return {"job-1": {
                    "status": {"status_str": "success", "completed": True}
                }}
            return {}

        async def report_event(_assignment, _event):
            return None

        agent._json_request = json_request
        agent.report_event = report_event
        await agent.execute_comfy({
            "job_id": "job-1",
            "lease_token": "lease",
            "payload": {"graph": {}},
        })

        self.assertNotIn("heartbeat", agent.session.kwargs)


class WorkerCleanupTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.agent = WorkerAgent.__new__(WorkerAgent)
        agent = self.agent
        agent.comfy_lock = asyncio.Lock()
        agent.release_failed = None
        agent.current = None
        agent.comfy_online = True
        agent.local_busy = False
        agent.server = "http://controller"
        agent.comfy = "http://comfy"
        agent.comfy_ws = "ws://comfy/ws"
        agent.state = {"worker_id": "worker", "worker_token": "token"}
        agent.config = {}
        agent.telemetry = {}
        agent.capabilities = {}
        agent.last_capability_scan = time.time()
        agent.last_telemetry_scan = time.time()
        agent.prepare_inputs = mock.AsyncMock()
        agent.patch_silent_video_audio = mock.AsyncMock()
        agent.collect_outputs = mock.AsyncMock(return_value=[])
        agent.report_event = mock.AsyncMock()
        self.assignment = {
            "job_id": "job-1", "lease_token": "lease",
            "payload": {"graph": {}}, "lease_expires_at": time.time() + 60,
        }
        self.cleanup_started = asyncio.Event()
        self.cleanup_ack = asyncio.Event()
        self.ack = {"cancelled": True, "cleanup_complete": True}
        self.requests = []

        async def request(method, url, **kwargs):
            self.requests.append((method, url, kwargs))
            if url.endswith("/cancel"):
                self.cleanup_started.set()
                await self.cleanup_ack.wait()
                if isinstance(self.ack, Exception):
                    raise self.ack
                return self.ack
            if url.endswith("/prompt"):
                return {"prompt_id": "job-1"}
            return {}

        agent._json_request = mock.AsyncMock(side_effect=request)
        self.execution_started = asyncio.Event()
        self.ws_closed = asyncio.Event()
        self.ws = mock.MagicMock()
        self.ws.closed = False
        self.ws.__aenter__.return_value = self.ws

        async def close():
            self.ws.closed = True
            self.ws_closed.set()

        self.ws.close = mock.AsyncMock(side_effect=close)
        agent.session = mock.Mock()
        agent.session.ws_connect.return_value = self.ws

        async def execute_comfy(_assignment):
            self.assignment["_ws"] = self.ws
            self.execution_started.set()
            await self.ws_closed.wait()
            raise JobFailed("ComfyUI WebSocket 已断开")

        agent.execute_comfy = mock.AsyncMock(side_effect=execute_comfy)

    def failed_requests(self):
        return [kwargs["json"] for _, url, kwargs in self.requests if url.endswith("/failed")]

    async def test_cancel_retains_current_until_ack_and_reuses_targeted_cleanup(self):
        task = asyncio.create_task(self.agent.execute(self.assignment))
        await self.execution_started.wait()
        await self.agent.cancel_current("unrelated-job")
        self.assertNotIn("cancel_requested", self.assignment)
        await asyncio.wait_for(self.agent.cancel_current("job-1"), 0.5)
        await self.cleanup_started.wait()
        cleanup = self.assignment["_cleanup_task"]
        await self.agent.cancel_current("job-1")
        self.assertIs(self.assignment["_cleanup_task"], cleanup)
        self.assertIs(self.agent.current, self.assignment)
        self.assertFalse(task.done())
        self.assertEqual(self.failed_requests(), [])
        self.assertIsNone(await self.agent.acquire())
        self.cleanup_ack.set()
        await task
        self.assertIsNone(self.agent.current)
        self.assertTrue(self.failed_requests()[0]["canceled"])
        comfy_calls = [(url, kw) for _, url, kw in self.requests if url.startswith(self.agent.comfy)]
        self.assertEqual(len(comfy_calls), 1)
        url, kwargs = comfy_calls[0]
        self.assertEqual(url, "http://comfy/api/jobs/job-1/cancel")
        self.assertEqual(kwargs["json"], {"free_memory": True})
        self.assertEqual(kwargs["timeout"].total, 130)

    async def test_missing_ack_and_timeout_keep_release_failed_gate(self):
        for ack in ({"cancelled": True}, asyncio.TimeoutError()):
            with self.subTest(ack=ack):
                self.assignment.pop("_cleanup_task", None)
                self.agent.release_failed = None
                self.ack = ack
                self.cleanup_ack.set()
                self.agent.execute_comfy = mock.AsyncMock(side_effect=JobFailed("OOM"))
                await self.agent.execute(self.assignment)
                self.assertIsNone(self.agent.current)
                self.assertIn("重启相关进程", self.agent.release_failed)
                self.assertFalse(self.failed_requests()[-1]["canceled"])
                self.assertIn("显存释放未确认", self.failed_requests()[-1]["error"])
                count = len(self.requests)
                self.assertIsNone(await self.agent.acquire())
                self.assertEqual(len(self.requests), count)

    async def test_cancel_during_input_download_never_submits_prompt(self):
        downloading = asyncio.Event()
        downloaded = asyncio.Event()

        async def prepare(_assignment):
            downloading.set()
            await downloaded.wait()

        self.agent.prepare_inputs = prepare
        self.agent.execute_comfy = WorkerAgent.execute_comfy.__get__(self.agent)
        task = asyncio.create_task(self.agent.execute(self.assignment))
        await downloading.wait()
        await self.agent.cancel_current("job-1")
        await self.cleanup_started.wait()
        downloaded.set()
        self.assertIs(self.agent.current, self.assignment)
        self.cleanup_ack.set()
        await task
        self.assertFalse(any(url.endswith("/prompt") for _, url, _ in self.requests))
        self.assertTrue(self.failed_requests()[0]["canceled"])

    async def test_heartbeat_continues_renewing_during_cleanup(self):
        self.agent.current = self.assignment
        self.agent.local_status = mock.AsyncMock()
        self.agent.stop_event = mock.Mock()
        self.agent.stop_event.is_set.side_effect = [False, False, True]
        self.agent.stop_event.wait = mock.AsyncMock(side_effect=asyncio.TimeoutError)
        heartbeats = []
        original = self.agent._json_request

        async def request(method, url, **kwargs):
            if url.endswith("/heartbeat"):
                heartbeats.append(kwargs["json"])
                return {"commands": [{"type": "cancel_job", "job_id": "job-1"}],
                        "lease_ttl_seconds": 60}
            return await original(method, url, **kwargs)

        self.agent._json_request = request
        await asyncio.wait_for(self.agent.heartbeat_loop(), 1)
        await self.cleanup_started.wait()
        self.assertEqual(len(heartbeats), 2)
        self.assertTrue(heartbeats[1]["local_busy"])
        self.assertGreater(self.assignment["_lease_deadline"], time.monotonic())
        self.assertFalse(self.assignment["_cleanup_task"].done())
        self.cleanup_ack.set()
        await self.assignment["_cleanup_task"]

        self.agent.current = None
        self.agent.release_failed = "显存释放未确认"
        self.agent.stop_event.is_set.side_effect = [False, True]
        await self.agent.heartbeat_loop()
        self.assertIsNone(heartbeats[-1]["current_job_id"])
        self.assertTrue(heartbeats[-1]["local_busy"])
        self.assertTrue(heartbeats[-1]["busy"])

    async def test_cancel_waits_for_inflight_submit_then_targets_same_id(self):
        submitted = asyncio.Event()
        submit_done = asyncio.Event()
        original = self.agent._json_request

        async def request(method, url, **kwargs):
            if url.endswith("/prompt"):
                self.assertEqual(kwargs["json"]["prompt_id"], "job-1")
                submitted.set()
                await submit_done.wait()
            return await original(method, url, **kwargs)

        self.agent._json_request = request
        self.agent.execute_comfy = WorkerAgent.execute_comfy.__get__(self.agent)
        task = asyncio.create_task(self.agent.execute(self.assignment))
        await submitted.wait()
        await self.agent.cancel_current("job-1")
        await self.ws_closed.wait()
        self.assertFalse(self.cleanup_started.is_set())
        submit_done.set()
        await self.cleanup_started.wait()
        self.assertIs(self.agent.current, self.assignment)
        self.cleanup_ack.set()
        await task
        self.assertTrue(self.failed_requests()[0]["canceled"])

    async def test_late_websocket_success_during_cancel_is_not_forwarded(self):
        receiving = asyncio.Event()

        async def receive(timeout=None):
            receiving.set()
            await self.ws_closed.wait()
            return mock.Mock(type=aiohttp.WSMsgType.TEXT, data=json.dumps({
                "type": "execution_success", "data": {"prompt_id": "job-1"},
            }))

        self.ws.receive = receive
        self.agent.execute_comfy = WorkerAgent.execute_comfy.__get__(self.agent)
        task = asyncio.create_task(self.agent.execute(self.assignment))
        await receiving.wait()
        await self.agent.cancel_current("job-1")
        await self.cleanup_started.wait()
        self.agent.report_event.assert_not_awaited()
        self.agent.collect_outputs.assert_not_awaited()
        self.assertEqual(self.failed_requests(), [])
        self.cleanup_ack.set()
        await task
        self.assertTrue(self.failed_requests()[0]["canceled"])
        self.assertFalse(any(url.endswith("/complete") for _, url, _ in self.requests))

    async def test_execute_task_cancellation_waits_for_release(self):
        task = asyncio.create_task(self.agent.execute(self.assignment))
        await self.execution_started.wait()
        task.cancel()
        await self.cleanup_started.wait()
        self.assertIs(self.agent.current, self.assignment)
        self.assertEqual(self.failed_requests(), [])
        self.cleanup_ack.set()
        with self.assertRaises(asyncio.CancelledError):
            await task
        self.assertIsNone(self.agent.current)

    async def test_error_and_interrupted_events_defer_failure_until_cleanup(self):
        for event_type in ("execution_error", "execution_interrupted"):
            with self.subTest(event_type=event_type):
                await self.asyncSetUp()
                self.agent.execute_comfy = WorkerAgent.execute_comfy.__get__(self.agent)
                self.ws.receive = mock.AsyncMock(return_value=mock.Mock(
                    type=aiohttp.WSMsgType.TEXT,
                    data=json.dumps({"type": event_type, "data": {
                        "prompt_id": "job-1", "exception_message": "OOM",
                    }}),
                ))
                task = asyncio.create_task(self.agent.execute(self.assignment))
                await self.cleanup_started.wait()
                event = self.agent.report_event.await_args.args[1]
                self.assertTrue(event["data"]["cleanup_pending"])
                self.assertIs(self.agent.current, self.assignment)
                self.assertEqual(self.failed_requests(), [])
                self.cleanup_ack.set()
                await task
                self.assertEqual(self.failed_requests()[0]["canceled"],
                                 event_type == "execution_interrupted")


if __name__ == "__main__":
    unittest.main()
