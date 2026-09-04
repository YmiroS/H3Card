import sys
import tempfile
import unittest
from pathlib import Path

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

import app as controller_app
from distributed import DistributedStore


class ControllerApiTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = DistributedStore(Path(self.temp.name) / "control.db")
        self.old_token = controller_app.ENROLLMENT_TOKEN
        self.old_save_jobs = controller_app.save_jobs
        controller_app.ENROLLMENT_TOKEN = "controller-test-enrollment-token"
        controller_app.save_jobs = lambda: None
        controller_app.JOBS.clear()
        controller_app.STEPS.clear()
        controller_app.WEIGHTS.clear()

        application = web.Application()
        application["distributed"] = self.store
        application.router.add_post("/agent/v1/register", controller_app.api_agent_register)
        application.router.add_post("/agent/v1/heartbeat", controller_app.api_agent_heartbeat)
        application.router.add_post("/agent/v1/jobs/acquire", controller_app.api_agent_acquire)
        application.router.add_post("/agent/v1/jobs/{pid}/start", controller_app.api_agent_start)
        application.router.add_post("/agent/v1/jobs/{pid}/complete", controller_app.api_agent_complete)
        application.router.add_get("/api/workers", controller_app.api_workers)
        self.client = TestClient(TestServer(application))
        await self.client.start_server()

    async def asyncTearDown(self):
        await self.client.close()
        self.store.close()
        self.temp.cleanup()
        controller_app.ENROLLMENT_TOKEN = self.old_token
        controller_app.save_jobs = self.old_save_jobs
        controller_app.JOBS.clear()
        controller_app.STEPS.clear()
        controller_app.WEIGHTS.clear()

    async def test_register_heartbeat_acquire_and_complete(self):
        denied = await self.client.post("/agent/v1/register", json={
            "name": "gpu-01", "enrollment_token": "wrong"
        })
        self.assertEqual(denied.status, 401)

        response = await self.client.post("/agent/v1/register", json={
            "name": "gpu-01",
            "enrollment_token": "controller-test-enrollment-token",
            "capabilities": {"node_classes": ["KSampler"]},
        })
        self.assertEqual(response.status, 201)
        credentials = await response.json()
        headers = {
            "X-Worker-ID": credentials["worker_id"],
            "Authorization": f"Bearer {credentials['worker_token']}",
        }

        response = await self.client.post("/agent/v1/heartbeat", headers=headers, json={
            "comfy_online": True,
            "busy": False,
            "capabilities": {"node_classes": ["KSampler"]},
        })
        self.assertEqual(response.status, 200)

        controller_app.JOBS["job-1"] = {
            "id": "job-1", "status": "queued", "created": 1,
            "progress": 0.0, "outputs": [], "error": None,
        }
        self.store.enqueue(
            "job-1", {"graph": {"1": {"class_type": "KSampler", "inputs": {}}}},
            ["KSampler"],
        )
        response = await self.client.post("/agent/v1/jobs/acquire", headers=headers, json={})
        self.assertEqual(response.status, 200)
        assignment = await response.json()
        lease_headers = {**headers, "X-Lease-Token": assignment["lease_token"]}

        response = await self.client.post(
            "/agent/v1/jobs/job-1/start", headers=lease_headers, json={}
        )
        self.assertEqual(response.status, 200)
        self.assertEqual(controller_app.JOBS["job-1"]["status"], "running")

        response = await self.client.post(
            "/agent/v1/jobs/job-1/complete", headers=lease_headers,
            json={"outputs": [{"kind": "image", "url": "/api/artifact/job-1/file.png"}]},
        )
        self.assertEqual(response.status, 200)
        self.assertEqual(controller_app.JOBS["job-1"]["status"], "done")
        self.assertEqual(self.store.list_workers()[0]["state"], "idle")

        response = await self.client.get("/api/workers")
        worker = (await response.json())["workers"][0]
        self.assertNotIn("token_hash", worker)


if __name__ == "__main__":
    unittest.main()
