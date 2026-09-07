import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest import mock

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

import app as controller_app
from distributed import DistributedStore


class CardProgressLabelTest(unittest.TestCase):
    def test_bundled_step_names_are_chinese(self):
        controller_app.load_caps()
        graph = {
            "1": {
                "class_type": "SamplerCustomAdvanced",
                "_meta": {"title": "SamplerCustomAdvanced"},
            },
            "2": {
                "class_type": "MiniMaxH3ReferenceToVideo",
                "_meta": {"title": "MiniMax H3 Reference to Video"},
            },
            "3": {"class_type": "UnknownEnglishNode"},
            "4": {"class_type": "MiniMaxH3FiniteSegmentSampler"},
        }

        self.assertEqual(controller_app.step_labels(graph), {
            "1": "高级自定义采样器",
            "2": "MiniMax H3参考生成视频",
            "3": "处理中",
            "4": "长视频分段采样",
        })


class ModelFamilyTest(unittest.TestCase):
    def test_related_workflows_share_model_family(self):
        self.assertEqual(controller_app.model_family("minimax_h3_ref9"), "minimax_h3")
        self.assertEqual(controller_app.model_family("minimax_h3_i2v"), "minimax_h3")
        self.assertEqual(controller_app.model_family("minimax_h3_character_transfer"), "minimax_h3")
        self.assertEqual(controller_app.model_family("seedvr2_image_up"), "seedvr2")
        self.assertEqual(controller_app.model_family("seedvr2_video_up"), "seedvr2")
        self.assertEqual(controller_app.model_family("unknown_workflow"), "unknown_workflow")


class FfmpegDiscoveryTest(unittest.TestCase):
    def test_uses_imageio_ffmpeg_binary_outside_windows_bundle(self):
        with tempfile.TemporaryDirectory() as directory:
            executable = Path(directory) / "ffmpeg"
            executable.touch()
            fake_module = types.SimpleNamespace(
                get_ffmpeg_exe=lambda: str(executable)
            )
            with mock.patch.dict(sys.modules, {"imageio_ffmpeg": fake_module}):
                self.assertEqual(controller_app.ffmpeg_bin(), executable)


class H3CharacterTransferPatchTest(unittest.TestCase):
    def setUp(self):
        controller_app.load_caps()
        self.cap = controller_app.CAPS["minimax_h3_character_transfer"]

    @mock.patch.object(controller_app, "probe_video", return_value={
        "duration": 67.033, "fps": 29.97, "frames": 2009, "has_audio": True,
    })
    def test_builds_timeline_from_existing_video_panel_assets(self, _probe):
        graph = controller_app.patch_graph(
            self.cap,
            {"width": 544, "height": 960, "duration": 10, "steps": 8,
             "overlap_frames": 48, "seed": 123},
            {"video[0]": "chouka/dance.mp4", "images[0]": "chouka/person.png"},
        )
        timeline = json.loads(graph["11"]["inputs"]["timeline_data"])
        self.assertEqual(graph["11"]["inputs"]["width"], 544)
        self.assertEqual(graph["11"]["inputs"]["height"], 960)
        self.assertEqual(graph["9"]["inputs"]["steps"], 8)
        self.assertEqual(graph["30"]["inputs"]["seed"], 123)
        self.assertEqual(timeline["selection"], {"start": 0, "duration": 10.0})
        self.assertEqual(timeline["videoClips"][0]["file"], "chouka/dance.mp4")
        self.assertEqual(timeline["videoClips"][0]["sourceDuration"], 67.033)
        self.assertTrue(timeline["videoClips"][0]["hasAudio"])
        self.assertEqual(timeline["videoClips"][0]["referenceMode"], "edit")
        self.assertEqual(timeline["images"][0]["file"], "chouka/person.png")

    @mock.patch.object(controller_app, "probe_video", return_value={
        "duration": 67.033, "fps": 29.97, "frames": 2009, "has_audio": True,
    })
    def test_preview_seconds_limits_timeline_to_one_source_window(self, _probe):
        graph = controller_app.patch_graph(
            self.cap,
            {"preview_seconds": 10},
            {"video[0]": "chouka/dance.mp4", "images[0]": "chouka/person.png"},
        )
        clip = json.loads(graph["11"]["inputs"]["timeline_data"])["videoClips"][0]
        self.assertEqual(clip["duration"], 10)
        self.assertEqual(clip["sourceDuration"], 10)

    def test_requires_both_video_and_identity_image(self):
        with self.assertRaisesRegex(web.HTTPBadRequest, "替换人物参考图"):
            controller_app.patch_graph(
                self.cap, {}, {"video[0]": "chouka/dance.mp4"}
            )

    def test_video_card_exposes_character_transfer_mode(self):
        video_card = next(card for card in controller_app.CARDS if card["id"] == "card_video")
        self.assertIn(
            "minimax_h3_character_transfer",
            {mode["id"] for mode in video_card["modes"]},
        )


class ControllerApiTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = DistributedStore(Path(self.temp.name) / "control.db")
        self.old_token = controller_app.ENROLLMENT_TOKEN
        self.old_save_jobs = controller_app.save_jobs
        self.old_controller_mode = controller_app.CONTROLLER_MODE
        controller_app.ENROLLMENT_TOKEN = "controller-test-enrollment-token"
        controller_app.CONTROLLER_MODE = True
        controller_app.save_jobs = lambda: None
        controller_app.JOBS.clear()
        controller_app.STEPS.clear()
        controller_app.WEIGHTS.clear()

        application = web.Application()
        application["distributed"] = self.store
        application.router.add_get("/controller", controller_app.controller_index)
        application.router.add_get("/api/health", controller_app.api_health)
        application.router.add_post("/agent/v1/register", controller_app.api_agent_register)
        application.router.add_post("/agent/v1/heartbeat", controller_app.api_agent_heartbeat)
        application.router.add_post("/agent/v1/jobs/acquire", controller_app.api_agent_acquire)
        application.router.add_post("/agent/v1/jobs/{pid}/start", controller_app.api_agent_start)
        application.router.add_post("/agent/v1/jobs/{pid}/event", controller_app.api_agent_event)
        application.router.add_post("/agent/v1/jobs/{pid}/complete", controller_app.api_agent_complete)
        application.router.add_post("/agent/v1/jobs/{pid}/failed", controller_app.api_agent_failed)
        application.router.add_get("/api/workers", controller_app.api_workers)
        self.client = TestClient(TestServer(application))
        await self.client.start_server()

    async def asyncTearDown(self):
        await self.client.close()
        self.store.close()
        self.temp.cleanup()
        controller_app.ENROLLMENT_TOKEN = self.old_token
        controller_app.save_jobs = self.old_save_jobs
        controller_app.CONTROLLER_MODE = self.old_controller_mode
        controller_app.JOBS.clear()
        controller_app.STEPS.clear()
        controller_app.WEIGHTS.clear()

    async def test_controller_dashboard_and_health_metadata(self):
        response = await self.client.get("/controller")
        self.assertEqual(response.status, 200)
        self.assertIn("<title>运行面板</title>", await response.text())

        response = await self.client.get("/api/health")
        self.assertEqual(response.status, 200)
        health = await response.json()
        self.assertEqual(health["mode"], controller_app.EXECUTION_MODE)
        self.assertIn("server_time", health)
        self.assertIn("started_at", health)

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
            "/agent/v1/jobs/job-1/event", headers=lease_headers,
            json={"type": "execution_success", "data": {"prompt_id": "job-1"}},
        )
        self.assertEqual(response.status, 200)
        self.assertEqual(controller_app.JOBS["job-1"]["status"], "running")
        self.assertEqual(controller_app.JOBS["job-1"]["progress"], 0.99)
        self.assertEqual(controller_app.JOBS["job-1"]["step"], "正在归集产物")

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

    async def test_execution_error_atomically_finishes_dispatch(self):
        response = await self.client.post("/agent/v1/register", json={
            "name": "gpu-error-test",
            "enrollment_token": "controller-test-enrollment-token",
            "capabilities": {"node_classes": ["VHS_LoadVideo"]},
        })
        credentials = await response.json()
        headers = {
            "X-Worker-ID": credentials["worker_id"],
            "Authorization": f"Bearer {credentials['worker_token']}",
        }
        await self.client.post("/agent/v1/heartbeat", headers=headers, json={
            "comfy_online": True,
            "busy": False,
            "local_busy": False,
            "capabilities": {"node_classes": ["VHS_LoadVideo"]},
        })
        controller_app.JOBS["job-error"] = {
            "id": "job-error", "status": "queued", "created": 1,
            "progress": 0.0, "outputs": [], "error": None,
        }
        self.store.enqueue(
            "job-error", {"graph": {"78": {"class_type": "VHS_LoadVideo", "inputs": {}}}},
            ["VHS_LoadVideo"],
        )
        response = await self.client.post("/agent/v1/jobs/acquire", headers=headers, json={})
        assignment = await response.json()
        lease_headers = {**headers, "X-Lease-Token": assignment["lease_token"]}
        await self.client.post("/agent/v1/jobs/job-error/start", headers=lease_headers, json={})

        response = await self.client.post(
            "/agent/v1/jobs/job-error/event", headers=lease_headers,
            json={"type": "execution_error", "data": {
                "node_id": "78", "node_type": "VHS_LoadVideo",
                "exception_message": "failed to extract audio",
            }},
        )
        self.assertEqual(response.status, 200)
        self.assertEqual((await response.json())["terminal"], "error")
        self.assertEqual(controller_app.JOBS["job-error"]["status"], "error")
        self.assertIn("failed to extract audio", controller_app.JOBS["job-error"]["error"])
        self.assertEqual(self.store.dispatch_status("job-error"), "error")
        self.assertEqual(self.store.list_workers()[-1]["state"], "idle")

        # Agent 在错误事件后补报 /failed，必须幂等成功，不能返回租约失效。
        response = await self.client.post(
            "/agent/v1/jobs/job-error/failed", headers=lease_headers,
            json={"error": "failed to extract audio", "canceled": False},
        )
        self.assertEqual(response.status, 200)

        response = await self.client.post("/agent/v1/heartbeat", headers=headers, json={
            "comfy_online": True, "busy": True, "local_busy": False,
            "current_job_id": "job-error",
        })
        self.assertEqual((await response.json())["commands"], [
            {"type": "abort_job", "job_id": "job-error"}
        ])
        worker = next(
            w for w in self.store.list_workers() if w["id"] == credentials["worker_id"]
        )
        self.assertEqual(worker["state"], "idle")
        self.assertIsNone(worker["current_job_id"])


if __name__ == "__main__":
    unittest.main()
