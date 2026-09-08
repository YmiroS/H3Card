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
import rewrite
import scan_workflows
import translate as prompt_translate
from distributed import DistributedStore


class PromptTranslationProtectionTest(unittest.TestCase):
    @mock.patch.object(prompt_translate, "YOUDAO_APP_SECRET", "secret")
    @mock.patch.object(prompt_translate, "YOUDAO_APP_KEY", "key")
    def test_preserves_prompt_tags_and_optimization_keywords(self):
        source = (
            "subject_definitions:\n"
            "<Subject 1> is a gray cat.\n"
            "retention_analysis:\n"
            "<Subject 1> (appears in [Shot 1]): fully_preserved - gray fur.\n"
            "<Audio 1>: reference - quiet ambience."
        )

        def post(_url, data, timeout):
            self.assertEqual(timeout, 10)
            response = mock.Mock()
            response.raise_for_status.return_value = None
            response.json.return_value = {
                "errorCode": "0",
                "translation": [data["q"].replace("is a gray cat", "是一只灰猫")
                                          .replace("gray fur", "灰色毛发")],
            }
            return response

        with mock.patch.object(prompt_translate.requests, "post", side_effect=post):
            result = prompt_translate.youdao_translate(source)

        self.assertIn("subject_definitions:", result)
        self.assertIn("retention_analysis:", result)
        self.assertEqual(result.count("<Subject 1>"), 2)
        self.assertIn("[Shot 1]", result)
        self.assertIn("fully_preserved", result)
        self.assertIn("reference", result)
        self.assertIn("是一只灰猫", result)
        self.assertIn("灰色毛发", result)

    def test_rejects_reordered_protected_tokens(self):
        masked, protected = prompt_translate.protect_prompt_tokens(
            "subject_definitions:\n<Subject 1> is a gray cat."
        )
        first, second = [token for token, _original in protected]
        reordered = masked.replace(first, "__TEMP__").replace(second, first).replace(
            "__TEMP__", second
        )

        with self.assertRaisesRegex(prompt_translate.TranslateError, "顺序"):
            prompt_translate.restore_prompt_tokens(reordered, protected)


class TranslationFallbackTest(unittest.IsolatedAsyncioTestCase):
    async def test_uses_configured_llm_when_youdao_is_not_configured(self):
        request = mock.MagicMock()
        request.json = mock.AsyncMock(return_value={
            "op": "translate",
            "inputs": [{"name": "原文", "text":
                        "subject_definitions:\n<Subject 1> is a gray cat."}],
        })
        request.app = {"session": object()}

        async def chat(_session, _system, user, _max_tokens, _temperature):
            self.assertIn("__CK_KEEP_", user)
            return {
                "text": user.replace("is a gray cat", "是一只灰猫"),
                "model": "configured-model", "tokens": 12, "warn": "",
            }

        with mock.patch.object(prompt_translate, "ready", return_value=False), \
             mock.patch.object(controller_app.llm, "ready", return_value=True), \
             mock.patch.object(controller_app.llm, "chat", side_effect=chat):
            response = await controller_app.api_text(request)

        payload = json.loads(response.text)
        self.assertEqual(payload["via"], "api")
        self.assertEqual(payload["model"], "configured-model")
        self.assertIn("subject_definitions:", payload["text"])
        self.assertIn("<Subject 1>", payload["text"])
        self.assertIn("是一只灰猫", payload["text"])


class H3ReferenceRewriteRulesTest(unittest.TestCase):
    def test_reference_identity_is_immutable_and_low_temperature(self):
        self.assertIn("Reference fidelity - identity facts are immutable", rewrite.H3_REF)
        self.assertIn("guess a colour, breed, age, gender", rewrite.H3_REF)
        self.assertIn("it must not redesign a referenced subject", rewrite.H3_REF)
        self.assertEqual(rewrite.REGIMES["h3_ref"]["temperature"], 0.3)


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


class WorkflowParameterRegressionTest(unittest.TestCase):
    def setUp(self):
        controller_app.load_caps()

    def test_text_to_image_models_share_one_mode(self):
        card = next(item for item in controller_app.CARDS if item["id"] == "card_image")
        text_modes = [item for item in card["modes"] if item["name"] == "文生图"]
        self.assertEqual(len(text_modes), 1)
        self.assertEqual(text_modes[0]["modelSwitch"], {
            "zimage": "zimage_t2i", "krea2": "krea2_t2i",
        })

        modes = scan_workflows.build_modes([
            controller_app.CAPS["zimage_t2i"],
            controller_app.CAPS["krea2_t2i"],
            controller_app.CAPS["zimage_i2i"],
            controller_app.CAPS["krea2_i2i"],
        ])
        self.assertEqual([item["name"] for item in modes], ["文生图", "图生图"])
        self.assertEqual(modes[1]["modelSwitch"]["krea2"], "krea2_i2i")

    def test_zimage_text_to_image_parameters_are_patchable(self):
        cap = controller_app.CAPS["zimage_t2i"]
        graph = controller_app.patch_graph(cap, {"width": 2048, "height": 2048}, {})
        self.assertEqual(graph["41"]["inputs"]["width"], 2048)
        self.assertEqual(graph["41"]["inputs"]["height"], 2048)

    def test_krea2_text_to_image_exposes_resolution_presets(self):
        cap = controller_app.CAPS["krea2_t2i"]
        spec = next(item for item in cap["inputs"] if item["key"] == "resolution")
        self.assertEqual(spec["target"], {"node": "49", "input": "resolution"})
        self.assertIn("1280x720 (16:9)", spec["options"])
        graph = controller_app.patch_graph(
            cap, {"resolution": "1280x720 (16:9)"}, {}
        )
        self.assertEqual(graph["49"]["inputs"]["resolution"], "1280x720 (16:9)")

    def test_h3_two_pass_uses_tested_audio_denoise(self):
        cap = controller_app.CAPS["minimax_h3_ref_2pass"]
        spec = next(item for item in cap["inputs"] if item["key"] == "audio_denoise")
        self.assertEqual(spec["default"], 0.3)
        self.assertEqual(spec["target"], {
            "node": "199", "input": "audio_denoise", "vtype": "FLOAT",
        })
        graph = controller_app.patch_graph(cap, {}, {})
        self.assertEqual(graph["199"]["inputs"]["audio_denoise"], 0.3)


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
        application.router.add_get("/api/cards", controller_app.api_cards)
        application.router.add_post("/api/reload", controller_app.api_reload)
        application.router.add_get("/api/jobs", controller_app.api_jobs)
        application.router.add_post("/api/generate", controller_app.api_generate)
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

    async def test_reload_exposes_one_text_to_image_mode(self):
        response = await self.client.post("/api/reload")
        self.assertEqual(response.status, 200)
        payload = await (await self.client.get("/api/cards")).json()
        card = next(item for item in payload["cards"] if item["id"] == "card_image")
        text_modes = [item for item in card["modes"] if item["name"] == "文生图"]
        self.assertEqual(len(text_modes), 1)
        self.assertEqual(text_modes[0]["modelSwitch"]["krea2"], "krea2_t2i")

    async def test_controller_dashboard_and_health_metadata(self):
        response = await self.client.get("/controller")
        self.assertEqual(response.status, 200)
        dashboard = await response.text()
        self.assertIn("<title>运行面板</title>", dashboard)
        self.assertIn('id="worker-cards" class="worker-grid"', dashboard)
        self.assertIn("GPU 利用率", dashboard)

        response = await self.client.get("/api/health")
        self.assertEqual(response.status, 200)
        health = await response.json()
        self.assertEqual(health["mode"], controller_app.EXECUTION_MODE)
        self.assertIn("server_time", health)
        self.assertIn("started_at", health)

    @mock.patch.object(controller_app, "patch_graph", return_value={
        "1": {"class_type": "KSampler", "inputs": {}}
    })
    async def test_generate_preserves_project_and_card_names(self, _patch_graph):
        capability = {
            "name": "测试生成", "outputType": "image", "_graph_ok": True,
        }
        with mock.patch.dict(controller_app.CAPS, {"dashboard-test": capability}):
            response = await self.client.post("/api/generate", json={
                "capability": "dashboard-test", "params": {}, "assets": {},
                "project": "project-1", "projectName": "广告片项目",
                "card": "card-1", "cardName": "主视觉",
            })

        self.assertEqual(response.status, 200)
        job = await response.json()
        self.assertEqual(job["projectName"], "广告片项目")
        self.assertEqual(job["cardName"], "主视觉")
        listed = await (await self.client.get("/api/jobs")).json()
        self.assertEqual(listed["jobs"][0]["projectName"], "广告片项目")

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

        telemetry = {
            "hostname": "RENDER-01",
            "gpus": [{
                "index": 0, "name": "NVIDIA GeForce RTX 4090",
                "utilization_percent": 73,
                "memory_used_bytes": 12 * 1024 ** 3,
                "memory_total_bytes": 24 * 1024 ** 3,
            }],
            "memory": {
                "used_bytes": 30 * 1024 ** 3,
                "total_bytes": 64 * 1024 ** 3,
            },
        }
        response = await self.client.post("/agent/v1/heartbeat", headers=headers, json={
            "comfy_online": True,
            "busy": False,
            "capabilities": {"node_classes": ["KSampler"]},
            "telemetry": telemetry,
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
        self.assertEqual(worker["name"], "gpu-01")
        self.assertEqual(worker["capabilities"]["telemetry"], telemetry)

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
