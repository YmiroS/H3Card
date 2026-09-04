import sys
import tempfile
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "worker"))

from distributed import DistributedStore
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


if __name__ == "__main__":
    unittest.main()
