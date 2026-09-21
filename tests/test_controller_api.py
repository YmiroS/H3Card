import asyncio
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest import mock

import aiohttp
from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "tests"))

import app as controller_app
import auth_support
import rewrite
import scan_workflows
import translate as prompt_translate
from costs import CostLedger
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


class TranslationFallbackTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def asyncSetUp(self):
        self.auth_setup()
        self.old_project_dir = controller_app.PROJ_DIR
        controller_app.PROJ_DIR = self.root / "data" / "projects"
        self.own_project("p")

    async def asyncTearDown(self):
        controller_app.PROJ_DIR = self.old_project_dir
        self.auth_teardown()

    async def test_uses_configured_llm_when_youdao_is_not_configured(self):
        request = mock.MagicMock()
        request.get = mock.MagicMock(
            side_effect=lambda key, default=None: {"user": self.admin}.get(key, default))
        request.cookies = {}
        request.json = mock.AsyncMock(return_value={
            "op": "translate",
            "project": "p",
            "inputs": [{"name": "原文", "text":
                        "subject_definitions:\n<Subject 1> is a gray cat."}],
        })
        request.app = {"session": object(), "auth_store": self.auth,
                       "resource_access": self.access}

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
            "qwen2512": "qwen_image_2512_t2i",
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
        self.assertEqual(controller_app.model_name("zimage_i2i"), "Z-Image")
        self.assertEqual(controller_app.model_name("gimmvfi_interp"), "GIMM-VFI")
        self.assertEqual(controller_app.model_name("rmbg_erase"), "RMBG 2.0 + FLUX.2 Klein")
        self.assertEqual(controller_app.model_name("grid4_stitch"), "无需模型（拼图工具）")
        self.assertEqual(controller_app.model_name("text"), "Qwen3.5 27B")
        self.assertEqual(controller_app.model_name(None), "未知模型")


class CostLedgerTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        database_path = Path(self.temp.name) / "control.db"
        self.store = DistributedStore(database_path)
        self.ledger = CostLedger(database_path, ROOT / "pricing.json")

    def tearDown(self):
        self.ledger.close()
        self.store.close()
        self.temp.cleanup()

    def test_backfill_combines_recent_actual_and_historical_estimates(self):
        rows = [
            ("recent", "krea2_t2i", "done"),
            ("historical", "zimage_t2i", "done"),
            ("failed", "gimmvfi_interp", "error"),
        ]
        for job_id, capability, status in rows:
            self.store.enqueue(job_id, {
                "capability": capability, "model_family": capability,
                "graph": {}, "assets": {},
            })
            with self.store.lock, self.store.db:
                self.store.db.execute(
                    "UPDATE dispatch_jobs SET status=? WHERE job_id=?",
                    (status, job_id),
                )

        self.ledger.backfill([{
            "id": "recent", "capability": "krea2_t2i", "status": "done",
            "created": 1, "started": 10, "ended": 70,
            "projectName": "线上项目", "cardName": "文生图",
        }])
        report = self.ledger.report()

        self.assertEqual(report["overview"]["tasks"], 3)
        self.assertEqual(report["overview"]["done"], 2)
        self.assertEqual(report["overview"]["error"], 1)
        self.assertAlmostEqual(report["overview"]["actual_cost"], 60 * 5 / 3600, places=6)
        self.assertAlmostEqual(report["overview"]["estimated_cost"], 0.013, places=6)
        self.assertEqual(report["overview"]["unknown_cost_tasks"], 1)
        sources = {item["job_id"]: item["cost_source"] for item in report["jobs"]}
        self.assertEqual(sources, {
            "recent": "actual", "historical": "estimated", "failed": "unknown",
        })
        self.store.clear_finished()
        self.assertEqual(self.ledger.report()["overview"]["tasks"], 3)

    def test_api_cost_uses_separate_input_and_output_token_rates(self):
        self.ledger.record_api(
            "text", "qwen3.7-plus", 1_000_000, 1_000_000, 250,
            project_name="文案项目", card_name="润色",
        )
        report = self.ledger.report()

        self.assertEqual(report["overview"]["tasks"], 1)
        self.assertAlmostEqual(report["overview"]["api_cost"], 9.7767, places=6)
        self.assertAlmostEqual(report["overview"]["total_cost"], 9.7767, places=6)
        self.assertEqual(report["jobs"][0]["category_name"], "文本与反推")
        self.assertEqual(report["jobs"][0]["project_name"], "文案项目")

    def test_h3_retail_prices_follow_segment_and_output_second_rules(self):
        self.assertEqual(
            self.ledger.retail_quote("minimax_h3_i2v"),
            (1_500_000, 2_500_000, "per_segment"),
        )
        self.assertEqual(
            self.ledger.retail_quote("minimax_h3_comic20", {"segment_count": 5}),
            (20_000_000, 30_000_000, "segment_count"),
        )
        self.assertEqual(
            self.ledger.retail_quote("minimax_h3_character_transfer", {
                "source_duration": 67, "width": 480, "height": 848,
            }),
            (16_750_000, 26_800_000, "output_second_resolution"),
        )
        self.assertEqual(
            self.ledger.retail_quote("minimax_h3_character_transfer", {
                "source_duration": 67, "width": 720, "height": 1280,
            }),
            (53_600_000, 80_400_000, "output_second_resolution"),
        )

    def test_image_retail_prices_match_published_ranges(self):
        expected = {
            "zimage_t2i": (0.08, 0.15),
            "krea2_t2i": (0.30, 0.60),
            "zimage_i2i": (0.30, 0.60),
            "krea2_i2i": (0.30, 0.60),
            "flux2_klein_edit": (0.20, 0.40),
            "flux2_klein_storyboard9": (1.0, 2.0),
        }
        for capability, (low, high) in expected.items():
            quote = self.ledger.retail_quote(capability)
            self.assertEqual(quote[:2], (round(low * 1_000_000), round(high * 1_000_000)))

    def test_report_separates_retail_price_from_internal_cost(self):
        self.ledger.record_job({
            "id": "h3-job", "capability": "minimax_h3_ref9",
            "status": "queued", "created": 1,
        })
        self.ledger.start_job("h3-job", "worker-1", 100)
        self.ledger.finish_job("h3-job", "done", 280, "worker-1")

        report = self.ledger.report()
        self.assertEqual(report["overview"]["retail_min"], 3.0)
        self.assertEqual(report["overview"]["retail_max"], 5.0)
        self.assertEqual(report["overview"]["retail_mid"], 4.0)
        self.assertAlmostEqual(report["overview"]["actual_cost"], 0.25, places=6)
        self.assertEqual(report["jobs"][0]["retail_basis"], "per_segment")

    def test_start_and_finish_retries_do_not_change_runtime(self):
        self.ledger.record_job({
            "id": "retry-job", "capability": "krea2_t2i",
            "status": "queued", "created": 1,
        })
        self.ledger.start_job("retry-job", "worker-1", 100)
        self.ledger.start_job("retry-job", "worker-1", 110)
        self.ledger.finish_job("retry-job", "done", 160, "worker-1")
        self.ledger.finish_job("retry-job", "done", 180, "worker-1")

        detail = self.ledger.report()["jobs"][0]
        self.assertEqual(detail["runtime_seconds"], 60)
        self.assertAlmostEqual(detail["actual_cost"], 60 * 5 / 3600, places=6)

    def test_report_can_return_more_than_five_hundred_details(self):
        for _index in range(501):
            self.ledger.record_api("text", "qwen3.7-plus", 0, 0, 1)

        report = self.ledger.report(limit=2000)
        self.assertEqual(report["overview"]["tasks"], 501)
        self.assertEqual(len(report["jobs"]), 501)


class FfmpegDiscoveryTest(unittest.TestCase):
    def test_falls_back_to_linux_system_ffmpeg(self):
        with mock.patch.dict(sys.modules, {"imageio_ffmpeg": None}), \
             mock.patch.object(controller_app.shutil, "which", return_value="/usr/bin/ffmpeg"):
            self.assertEqual(controller_app.ffmpeg_bin(), Path("/usr/bin/ffmpeg"))

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


class ControllerApiTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def asyncSetUp(self):
        self.auth_setup()
        database_path = self.root / "data" / "control.db"
        self.store = DistributedStore(database_path)
        self.ledger = CostLedger(database_path, ROOT / "pricing.json")
        self.old_token = controller_app.ENROLLMENT_TOKEN
        self.old_save_jobs = controller_app.save_jobs
        self.old_controller_mode = controller_app.CONTROLLER_MODE
        self.old_project_dir = controller_app.PROJ_DIR
        self.old_artifact_dir = controller_app.ARTIFACT_DIR
        controller_app.PROJ_DIR = self.root / "data" / "projects"
        controller_app.ARTIFACT_DIR = self.root / "data" / "artifacts"
        controller_app.ENROLLMENT_TOKEN = "controller-test-enrollment-token"
        controller_app.CONTROLLER_MODE = True
        controller_app.save_jobs = lambda: None
        controller_app.JOBS.clear()
        controller_app.STEPS.clear()
        controller_app.WEIGHTS.clear()
        self.own_project("p")

        application = self.build_app()
        application["comfy_lock"] = asyncio.Lock()
        application["cleanup_pending"] = set()
        application["cleanup_tasks"] = {}
        application["session"] = mock.MagicMock()
        application["distributed"] = self.store
        application["costs"] = self.ledger
        application.router.add_get("/controller", controller_app.controller_index)
        application.router.add_get("/controller/costs", controller_app.controller_costs)
        application.router.add_get("/api/health", controller_app.api_health)
        application.router.add_get("/api/cards", controller_app.api_cards)
        application.router.add_post("/api/reload", controller_app.api_reload)
        application.router.add_get("/api/jobs", controller_app.api_jobs)
        application.router.add_post("/api/job/{pid}/cancel", controller_app.api_cancel)
        application.router.add_delete("/api/job/{pid}", controller_app.api_job_delete)
        application.router.add_post("/api/generate", controller_app.api_generate)
        application.router.add_post("/api/text", controller_app.api_text)
        application.router.add_get("/api/projects", controller_app.api_projects)
        application.router.add_post("/api/projects", controller_app.api_project_create)
        application.router.add_get("/api/projects/{pid}", controller_app.api_project_get)
        application.router.add_put("/api/projects/{pid}", controller_app.api_project_save)
        application.router.add_post("/api/projects/{pid}/rename", controller_app.api_project_rename)
        application.router.add_post("/agent/v1/register", controller_app.api_agent_register)
        application.router.add_post("/agent/v1/heartbeat", controller_app.api_agent_heartbeat)
        application.router.add_post("/agent/v1/jobs/acquire", controller_app.api_agent_acquire)
        application.router.add_post("/agent/v1/jobs/{pid}/start", controller_app.api_agent_start)
        application.router.add_post("/agent/v1/jobs/{pid}/event", controller_app.api_agent_event)
        application.router.add_post("/agent/v1/jobs/{pid}/artifact", controller_app.api_agent_artifact)
        application.router.add_post("/agent/v1/jobs/{pid}/complete", controller_app.api_agent_complete)
        application.router.add_post("/agent/v1/jobs/{pid}/failed", controller_app.api_agent_failed)
        application.router.add_get("/api/workers", controller_app.api_workers)
        application.router.add_post(
            "/api/admin/workers/sync-all", controller_app.api_workers_sync_all
        )
        application.router.add_get("/api/costs", controller_app.api_costs)
        await self.start_client(application)

    async def asyncTearDown(self):
        await self.client.close()
        self.ledger.close()
        self.store.close()
        self.auth_teardown()
        controller_app.ENROLLMENT_TOKEN = self.old_token
        controller_app.save_jobs = self.old_save_jobs
        controller_app.CONTROLLER_MODE = self.old_controller_mode
        controller_app.PROJ_DIR = self.old_project_dir
        controller_app.ARTIFACT_DIR = self.old_artifact_dir
        controller_app.JOBS.clear()
        controller_app.STEPS.clear()
        controller_app.WEIGHTS.clear()

    async def test_reload_exposes_one_text_to_image_mode(self):
        response = await self.client.post("/api/reload", headers=self.headers)
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
        self.assertIn("一键同步全部节点", dashboard)
        self.assertIn("/controller/costs", dashboard)

        response = await self.client.get("/controller/costs")
        self.assertEqual(response.status, 200)
        costs_page = await response.text()
        self.assertIn("<title>费用统计</title>", costs_page)
        self.assertIn("建议收费区间", costs_page)
        self.assertIn("内部总成本", costs_page)
        self.assertIn('limit:"2000"', costs_page)

        response = await self.client.get("/api/health")
        self.assertEqual(response.status, 200)
        health = await response.json()
        self.assertEqual(health["mode"], controller_app.EXECUTION_MODE)
        self.assertIn("server_time", health)
        self.assertIn("started_at", health)

    async def test_admin_can_request_all_workers_to_sync(self):
        credentials = self.store.register_worker(
            "gpu-sync", {
                "node_classes": ["KSampler"], "supports_file_sync": True,
            }
        )
        self.store.heartbeat(
            credentials["worker_id"], comfy_online=True, busy=False
        )

        response = await self.client.post(
            "/api/admin/workers/sync-all", headers=self.headers, json={}
        )

        self.assertEqual(response.status, 202, await response.text())
        payload = await response.json()
        self.assertEqual(payload["worker_count"], 1)
        agent_headers = {
            "X-Worker-ID": credentials["worker_id"],
            "Authorization": f"Bearer {credentials['worker_token']}",
        }
        response = await self.client.post(
            "/agent/v1/heartbeat", headers=agent_headers,
            json={"comfy_online": True, "busy": False},
        )
        heartbeat = await response.json()
        self.assertIn({
            "type": "sync_files", "request_id": payload["request_id"],
        }, heartbeat["commands"])

    async def test_generate_persists_every_submitted_prompt_before_completion(self):
        self.own_project("project-1")
        self.register_asset("test.png", "project-1")
        controller_app.load_caps()
        expected = {}
        jobs_file = Path(self.temp.name) / "prompt-jobs.json"
        with mock.patch.object(controller_app, "JOBS_FILE", jobs_file), \
             mock.patch.object(controller_app, "save_jobs", self.old_save_jobs), \
             mock.patch.object(controller_app, "cost_ledger", return_value=None):
            for cid in ("zimage_t2i", "zimage_i2i", "krea2_t2i", "krea2_i2i",
                        "minimax_h3_i2v", "minimax_h3_comic20"):
                cap = controller_app.CAPS[cid]
                specs = [s for s in cap["inputs"] if s["type"] == "textarea"]
                for round_number in range(2):
                    params = {s["key"]: f"{cid}:{s['key']} 第{round_number}轮\n中文 <tags>"
                              for s in specs}
                    params["seed"] = 123
                    uploaded = {s["key"]: "chouka/test.png" for s in cap["inputs"]
                                if s["type"] == "image"}
                    with mock.patch.object(controller_app, "generation_assets", return_value=uploaded):
                        response = await self.client.post("/api/generate", json={
                            "capability": cid, "params": params, "assets": uploaded,
                            "project": "project-1", "card": "card-1",
                        })
                    self.assertEqual(response.status, 200, await response.text())
                    job = await response.json()
                    expected[job["id"]] = [
                        {"key": s["key"], "label": s["label"], "text": params[s["key"]]}
                        for s in specs
                    ]
                    self.assertEqual(job["status"], "queued")
                    self.assertEqual(job["prompts"], expected[job["id"]])
                    saved = {j["id"]: j for j in json.loads(jobs_file.read_text(encoding="utf-8"))}
                    self.assertEqual(saved[job["id"]]["prompts"], expected[job["id"]])
            controller_app.JOBS.clear()
            controller_app.load_jobs()
            listed = await (await self.client.get("/api/jobs")).json()
            self.assertEqual({j["id"]: j["prompts"] for j in listed["jobs"]}, expected)

    async def test_local_prompt_snapshot_survives_restart_without_browser(self):
        controller_app.load_caps()
        jobs_file = Path(self.temp.name) / "local-prompt-jobs.json"
        with mock.patch.object(controller_app, "CONTROLLER_MODE", False), \
             mock.patch.object(controller_app, "JOBS_FILE", jobs_file), \
             mock.patch.object(controller_app, "save_jobs", self.old_save_jobs), \
             mock.patch.object(controller_app, "comfy_submit", return_value="local-history"):
            response = await self.client.post("/api/generate", json={
                "capability": "zimage_t2i", "params": {"prompt": "实际提交的提示词"}, "project": "p",
            })
            self.assertEqual(response.status, 200, await response.text())
            job = await response.json()
            controller_app.JOBS.clear()
            controller_app.load_jobs()
            restored = controller_app.JOBS[job["id"]]
            self.assertEqual(restored["status"], "canceled")
            self.assertEqual(restored["prompts"], job["prompts"])
            self.assertEqual(restored["prompts"][0]["text"], "实际提交的提示词")

    async def test_prompt_snapshot_uses_patched_graph_defaults_and_empty_values(self):
        self.register_asset("test.png")
        controller_app.load_caps()
        with mock.patch.object(controller_app, "cost_ledger", return_value=None):
            for params in ({}, {"prompt": ""}):
                response = await self.client.post("/api/generate", json={
                    "capability": "zimage_t2i", "params": params, "project": "p",
                })
                self.assertEqual(response.status, 200, await response.text())
                job = await response.json()
                spec = controller_app.CAPS["zimage_t2i"]["inputs"][0]
                graph = controller_app.patch_graph(controller_app.CAPS["zimage_t2i"], params, {})
                text = graph[str(spec["target"]["node"])]["inputs"][spec["target"]["input"]]
                self.assertEqual(job["prompts"][0]["text"], text)
            with mock.patch.object(controller_app, "generation_assets", return_value={
                "images[0]": "chouka/test.png",
            }):
                response = await self.client.post("/api/generate", json={
                    "capability": "minimax_h3_comic20", "project": "p",
                    "params": {"prompt": "第一组分镜", "prompt2": "没有配图，不应实际提交"},
                })
            self.assertEqual(response.status, 200, await response.text())
            job = await response.json()
            prompts = {p["key"]: p["text"] for p in job["prompts"]}
            self.assertEqual(prompts["prompt"], "第一组分镜")
            self.assertEqual(prompts["prompt2"], "")
            self.assertIn("prompt6", prompts)

    @mock.patch.object(controller_app, "patch_graph", return_value={
        "1": {"class_type": "KSampler", "inputs": {}}
    })
    async def test_generate_preserves_project_card_and_mode_names(self, _patch_graph):
        capability = {
            "name": "测试生成", "outputType": "image", "_graph_ok": True,
        }
        with mock.patch.dict(controller_app.CAPS, {"dashboard-test": capability}):
            self.own_project("project-1", "广告片项目")
            response = await self.client.post("/api/generate", json={
                "capability": "dashboard-test", "params": {}, "assets": {},
                "project": "project-1", "projectName": "广告片项目",
                "card": "card-1", "cardName": "主视觉",
            }, headers=self.headers)

        self.assertEqual(response.status, 200)
        job = await response.json()
        self.assertEqual(job["projectName"], "广告片项目")
        self.assertEqual(job["cardName"], "主视觉")
        self.assertEqual(job["name"], "测试生成")
        self.assertEqual(job["capability"], "dashboard-test")
        self.assertEqual(job["modelName"], "dashboard-test")
        worker = self.store.register_worker("渲染机-01", {"node_classes": ["KSampler"]})
        self.store.heartbeat(worker["worker_id"], comfy_online=True, busy=False)
        assignment = self.store.acquire(worker["worker_id"])
        self.assertEqual(assignment["job_id"], job["id"])
        with mock.patch.dict(controller_app.CAPS, {
            "dashboard-test": {**capability, "name": "修改后的模式名称"},
        }):
            listed = await (await self.client.get("/api/jobs")).json()
        self.assertEqual(listed["jobs"][0]["projectName"], "广告片项目")
        self.assertEqual(listed["jobs"][0]["name"], "测试生成")
        self.assertEqual(listed["jobs"][0]["modelName"], "dashboard-test")
        self.assertEqual(listed["jobs"][0]["nodeName"], "渲染机-01")
        with mock.patch.object(controller_app, "JOBS_FILE", Path(self.temp.name) / "jobs.json"):
            self.old_save_jobs()
            controller_app.JOBS.clear()
            controller_app.load_jobs()
        restored = await (await self.client.get("/api/jobs")).json()
        self.assertEqual(restored["jobs"][0]["name"], "测试生成")
        costs = await (await self.client.get("/api/costs")).json()
        self.assertEqual(costs["overview"]["tasks"], 1)
        self.assertEqual(costs["jobs"][0]["project_name"], "广告片项目")
        self.assertEqual(costs["jobs"][0]["card_name"], "主视觉")

    @mock.patch.object(controller_app, "patch_graph", return_value={
        "1": {"class_type": "KSampler", "inputs": {}}
    })
    async def test_video_over_ten_seconds_gets_rtx_5090_policy(self, _patch_graph):
        capability = {
            "name": "视频参考生成", "outputType": "video", "kind": "gen",
            "_graph_ok": True,
            "inputs": [{"key": "video[0]", "type": "video"}],
        }
        assets = {"video[0]": "chouka/source.mp4"}
        self.register_asset("source.mp4")
        with mock.patch.dict(controller_app.CAPS, {"video-ref": capability}), \
             mock.patch.object(
                 controller_app, "generation_assets",
                 new=mock.AsyncMock(return_value=assets),
             ):
            for duration, expects_policy in ((10.0, False), (10.001, True)):
                with self.subTest(duration=duration), \
                     mock.patch.object(
                         controller_app, "probe_video", return_value={"duration": duration}
                     ):
                    response = await self.client.post("/api/generate", json={
                        "capability": "video-ref", "params": {}, "assets": assets, "project": "p",
                    })
                    self.assertEqual(response.status, 200)
                    job = await response.json()
                    row = self.store.db.execute(
                        "SELECT payload_json FROM dispatch_jobs WHERE job_id = ?",
                        (job["id"],),
                    ).fetchone()
                    payload = json.loads(row[0])
                    self.assertEqual("gpu_policy" in payload, expects_policy)
                    if expects_policy:
                        self.assertEqual(
                            payload["gpu_policy"], controller_app.HIGH_VRAM_GPU_POLICY
                        )

            with mock.patch.object(controller_app, "probe_video", return_value={}):
                response = await self.client.post("/api/generate", json={
                    "capability": "video-ref", "params": {}, "assets": assets, "project": "p",
                })
                self.assertEqual(response.status, 400)
                self.assertIn("无法读取引入视频时长", await response.text())

    @mock.patch.object(controller_app, "patch_graph", return_value={
        "1": {"class_type": "KSampler", "inputs": {}}
    })
    async def test_high_quality_h3_dispatches_to_gpu_with_at_least_32gb(self, _patch_graph):
        capability = {"name": "H3全能参考(高质量)", "outputType": "video", "_graph_ok": True}
        with mock.patch.dict(controller_app.CAPS, {"minimax_h3_ref_2pass": capability}):
            response = await self.client.post("/api/generate", json={
                "capability": "minimax_h3_ref_2pass", "params": {}, "assets": {},
                "project": "p",
            }, headers=self.headers)
        self.assertEqual(response.status, 200)
        job = await response.json()
        gib = 1024 ** 3
        for gpu, vram, status in (("RTX 4090", 24 * gib, 204), ("RTX A6000", 48 * gib, 200)):
            credentials = self.store.register_worker(gpu, {
                "node_classes": ["KSampler"],
                "devices": [{"type": "cuda", "name": gpu, "vram_total": vram}],
            })
            self.store.heartbeat(credentials["worker_id"], comfy_online=True)
            response = await self.client.post("/agent/v1/jobs/acquire", json={}, headers={
                "X-Worker-ID": credentials["worker_id"],
                "Authorization": f"Bearer {credentials['worker_token']}",
            })
            self.assertEqual(response.status, status)
            if status == 200:
                assignment = await response.json()
                self.assertEqual(assignment["job_id"], job["id"])
                self.assertEqual(assignment["payload"]["capability"], "minimax_h3_ref_2pass")
            else:
                self.assertEqual(controller_app.JOBS[job["id"]]["status"], "queued")

    @mock.patch.object(controller_app, "patch_graph", return_value={
        "1": {"class_type": "KSampler", "inputs": {}}
    })
    @mock.patch.object(controller_app, "comfy_submit", new_callable=mock.AsyncMock, return_value="local-hq")
    async def test_local_high_quality_h3_checks_gpu_before_submit(self, submit, _patch_graph):
        capability = {"name": "H3全能参考(高质量)", "outputType": "video", "_graph_ok": True}
        session = self.client.server.app["session"]
        stats_response = session.get.return_value.__aenter__.return_value
        stats_response.raise_for_status = mock.Mock()
        stats_response.json = mock.AsyncMock()
        with mock.patch.object(controller_app, "CONTROLLER_MODE", False), \
             mock.patch.dict(controller_app.CAPS, {"minimax_h3_ref_2pass": capability}):
            gib = 1024 ** 3
            for gpu, vram, status in (
                ("RTX 4090", 24 * gib, 400), (None, 0, 400), ("RTX A6000", 48 * gib, 200),
            ):
                with self.subTest(gpu=gpu):
                    submit.reset_mock()
                    stats_response.json.return_value = {
                        "devices": [{
                            "type": "cuda", "name": gpu, "vram_total": vram,
                        }] if gpu else [],
                    }
                    response = await self.client.post("/api/generate", json={
                        "capability": "minimax_h3_ref_2pass", "project": "p",
                    }, headers=self.headers)
                    self.assertEqual(response.status, status)
                    if status == 200:
                        submit.assert_awaited_once()
                    else:
                        submit.assert_not_awaited()
                        self.assertIn("32GB", await response.text())

            submit.reset_mock()
            stats_response.json.side_effect = TimeoutError()
            response = await self.client.post("/api/generate", json={
                "capability": "minimax_h3_ref_2pass", "project": "p",
            }, headers=self.headers)
            self.assertEqual(response.status, 503)
            submit.assert_not_awaited()

    @mock.patch.object(controller_app, "patch_graph", return_value={
        "1": {"class_type": "KSampler", "inputs": {}}
    })
    @mock.patch.object(
        controller_app, "comfy_submit", new_callable=mock.AsyncMock,
        return_value="local-long-video",
    )
    async def test_local_long_video_checks_gpu_before_submit(self, submit, _patch_graph):
        capability = {
            "name": "视频参考生成", "outputType": "video", "kind": "gen",
            "_graph_ok": True,
            "inputs": [{"key": "video[0]", "type": "video"}],
        }
        assets = {"video[0]": "chouka/source.mp4"}
        self.register_asset("source.mp4")
        session = self.client.server.app["session"]
        stats_response = session.get.return_value.__aenter__.return_value
        stats_response.raise_for_status = mock.Mock()
        stats_response.json = mock.AsyncMock()
        with mock.patch.object(controller_app, "CONTROLLER_MODE", False), \
             mock.patch.dict(controller_app.CAPS, {"video-ref": capability}), \
             mock.patch.object(
                 controller_app, "generation_assets",
                 new=mock.AsyncMock(return_value=assets),
             ), \
             mock.patch.object(
                 controller_app, "probe_video", return_value={"duration": 10.001}
             ):
            gib = 1024 ** 3
            for gpu, vram, status in (("RTX 4090", 24 * gib, 400), ("RTX A6000", 48 * gib, 200)):
                with self.subTest(gpu=gpu):
                    submit.reset_mock()
                    stats_response.json.return_value = {
                        "devices": [{
                            "type": "cuda", "name": gpu, "vram_total": vram,
                        }],
                    }
                    response = await self.client.post("/api/generate", json={
                        "capability": "video-ref", "params": {}, "assets": assets, "project": "p",
                    })
                    self.assertEqual(response.status, status)
                    if status == 200:
                        submit.assert_awaited_once()
                    else:
                        submit.assert_not_awaited()

    async def test_project_rename_updates_jobs_and_cost_history(self):
        created = await (await self.client.post(
            "/api/projects", json={"name": "旧项目名"}, headers=self.headers
        )).json()
        project_id = created["id"]
        controller_app.JOBS["rename-job"] = {
            "id": "rename-job", "capability": "zimage_t2i", "status": "done",
            "created": 1, "project": project_id, "projectName": "旧项目名",
            "card": "card-1", "cardName": "主视觉",
        }
        self.register_job("rename-job", project_id)
        self.ledger.record_job(controller_app.JOBS["rename-job"], historical=True)

        response = await self.client.post(
            f"/api/projects/{project_id}/rename", json={"name": "新项目名"},
            headers=self.headers,
        )
        self.assertEqual(response.status, 200)
        renamed = await response.json()
        self.assertEqual(renamed["name"], "新项目名")
        self.assertEqual(renamed["rev"], 1)

        projects = await (await self.client.get("/api/projects")).json()
        self.assertEqual(projects["projects"][0]["name"], "新项目名")
        jobs = await (await self.client.get("/api/jobs")).json()
        self.assertEqual(jobs["jobs"][0]["projectName"], "新项目名")
        costs = await (await self.client.get("/api/costs")).json()
        self.assertEqual(costs["jobs"][0]["project_name"], "新项目名")

    async def test_text_api_records_prompt_and_completion_token_cost(self):
        result = {
            "text": "润色后的文本", "model": "qwen3.7-plus", "tokens": 300,
            "prompt_tokens": 200, "completion_tokens": 100, "warn": "",
        }
        with mock.patch.object(controller_app.llm, "ready", return_value=True), \
             mock.patch.object(controller_app.llm, "chat", new=mock.AsyncMock(return_value=result)):
            self.own_project("copywriting", "文案项目")
            response = await self.client.post("/api/text", json={
                "op": "polish", "model": "api",
                "inputs": [{"name": "原文", "text": "测试文本"}],
                "project": "copywriting", "projectName": "文案项目",
                "cardName": "润色卡",
            }, headers=self.headers)

        self.assertEqual(response.status, 200)
        costs = await (await self.client.get("/api/costs")).json()
        self.assertEqual(costs["overview"]["tasks"], 1)
        expected = (200 * 1.9596 + 100 * 7.8171) / 1_000_000
        self.assertAlmostEqual(costs["overview"]["api_cost"], expected, places=6)
        self.assertEqual(costs["jobs"][0]["project_name"], "文案项目")
        self.assertEqual(costs["jobs"][0]["cost_source"], "actual")

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
            "id": "job-1", "capability": "krea2_t2i",
            "status": "queued", "created": 1,
            "progress": 0.0, "outputs": [], "error": None,
        }
        self.register_job("job-1", "p")
        self.ledger.record_job(controller_app.JOBS["job-1"])
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

        # 产物必须先经 Worker 上传登记，完成回调只认本任务已登记的产物。
        artifact_form = aiohttp.FormData()
        artifact_form.add_field("file", b"png-bytes", filename="file.png",
                                content_type="image/png")
        response = await self.client.post(
            "/agent/v1/jobs/job-1/artifact", headers=lease_headers,
            data=artifact_form, params={"kind": "image"},
        )
        self.assertEqual(response.status, 201, await response.text())
        artifact = await response.json()

        response = await self.client.post(
            "/agent/v1/jobs/job-1/complete", headers=lease_headers,
            json={"outputs": [{"kind": "image", "url": artifact["url"]}]},
        )
        self.assertEqual(response.status, 200)
        self.assertEqual(controller_app.JOBS["job-1"]["status"], "done")
        self.assertEqual(self.store.list_workers()[0]["state"], "idle")

        response = await self.client.get("/api/workers")
        worker = (await response.json())["workers"][0]
        self.assertNotIn("token_hash", worker)
        self.assertEqual(worker["name"], "gpu-01")
        self.assertEqual(worker["capabilities"]["telemetry"], telemetry)
        cost_job = self.ledger.report()["jobs"][0]
        self.assertEqual(cost_job["job_id"], "job-1")
        self.assertEqual(cost_job["status"], "done")
        self.assertEqual(cost_job["cost_source"], "actual")
        self.assertEqual(cost_job["worker_name"], "gpu-01")

    async def test_cleanup_pending_events_keep_lease_until_worker_failure_report(self):
        credentials = self.store.register_worker("cleanup-worker", {})
        worker_id = credentials["worker_id"]
        headers = {"X-Worker-ID": worker_id,
                   "Authorization": f"Bearer {credentials['worker_token']}"}
        self.store.heartbeat(worker_id, comfy_online=True)
        controller_app.JOBS["cleanup-job"] = {
            "id": "cleanup-job", "status": "queued", "created": 1,
            "progress": 0.3, "outputs": [], "error": None,
        }
        self.register_job("cleanup-job")
        self.store.enqueue("cleanup-job", {"graph": {}}, [])
        assignment = self.store.acquire(worker_id)
        headers["X-Lease-Token"] = assignment["lease_token"]
        await self.client.post("/agent/v1/jobs/cleanup-job/start", headers=headers, json={})
        for event_type in ("execution_error", "execution_interrupted"):
            response = await self.client.post(
                "/agent/v1/jobs/cleanup-job/event", headers=headers,
                json={"type": event_type, "data": {
                    "cleanup_pending": True, "exception_message": "OOM",
                }},
            )
            self.assertEqual(response.status, 200)
            self.assertTrue((await response.json())["cleanup_pending"])
            self.assertTrue(self.store.validate_lease(
                "cleanup-job", worker_id, assignment["lease_token"],
            ))
            self.assertEqual(self.store.dispatch_status("cleanup-job"), "running")
            self.assertEqual(controller_app.JOBS["cleanup-job"]["status"], "running")
            self.assertEqual(controller_app.JOBS["cleanup-job"]["step"], "正在释放显存")
        for event_type in ("executing", "execution_success", "progress_state"):
            await self.client.post("/agent/v1/jobs/cleanup-job/event", headers=headers,
                                   json={"type": event_type, "data": {"node": None}})
        self.assertEqual(controller_app.JOBS["cleanup-job"]["step"], "正在释放显存")
        self.store.enqueue("next-job", {"graph": {}}, [])
        self.assertIsNone(self.store.acquire(worker_id))
        response = await self.client.post("/agent/v1/jobs/cleanup-job/complete", headers=headers,
                                          json={"outputs": []})
        self.assertEqual(response.status, 409)
        self.assertEqual(self.store.dispatch_status("cleanup-job"), "running")
        response = await self.client.post("/agent/v1/jobs/cleanup-job/failed", headers=headers,
                                          json={"error": "释放失败，需重启相关进程", "canceled": False})
        self.assertEqual(response.status, 200)
        self.assertEqual(self.store.dispatch_status("cleanup-job"), "error")
        self.assertFalse(controller_app.JOBS["cleanup-job"]["cleanup_pending"])
        for current in ("cleanup-job", None):
            await self.client.post("/agent/v1/heartbeat", headers=headers, json={
                "comfy_online": True, "busy": True, "local_busy": True,
                "current_job_id": current,
            })
            self.assertEqual(self.store.list_workers()[0]["state"], "busy")
            self.assertIsNone(self.store.acquire(worker_id))

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
        self.register_job("job-error", "p")
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


class LocalSubmissionTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.app = {"comfy_lock": asyncio.Lock(), "cleanup_pending": set(), "session": object()}

    async def test_submission_acknowledgement_does_not_wait_for_generation(self):
        with mock.patch.object(controller_app, "comfy_submit", new=mock.AsyncMock(return_value="accepted")) as submit:
            self.assertEqual(await controller_app.local_submit(self.app, {"node": {}}), "accepted")
        submit.assert_awaited_once_with(self.app["session"], {"node": {}}, prompt_id=None)
        self.assertFalse(self.app["comfy_lock"].locked())

    async def test_submission_preserves_the_pre_registered_permission_job_id(self):
        with mock.patch.object(controller_app, "comfy_submit", new=mock.AsyncMock(return_value="owned-job")) as submit:
            self.assertEqual(await controller_app.local_submit(self.app, {}, prompt_id="owned-job"), "owned-job")
        submit.assert_awaited_once_with(self.app["session"], {}, prompt_id="owned-job")

    async def test_stalled_submit_times_out_and_releases_lock_without_retry(self):
        timeout = asyncio.timeout
        canceled = asyncio.Event()

        async def stalled(*_args, **_kwargs):
            try:
                await asyncio.Event().wait()
            finally:
                canceled.set()

        with mock.patch.object(controller_app, "comfy_submit", side_effect=stalled) as submit, \
             mock.patch.object(controller_app.asyncio, "timeout", side_effect=lambda _seconds: timeout(0.02)) as deadline:
            with self.assertRaises(web.HTTPGatewayTimeout) as raised:
                await controller_app.local_submit(self.app, {})
        deadline.assert_called_once_with(30)
        submit.assert_awaited_once()
        self.assertTrue(canceled.is_set())
        self.assertFalse(self.app["comfy_lock"].locked())
        self.assertIn("确认提交", raised.exception.text)
        self.assertIn("避免重复生成", raised.exception.text)

    async def test_waiting_for_another_submission_is_also_bounded(self):
        timeout = asyncio.timeout
        await self.app["comfy_lock"].acquire()
        try:
            with mock.patch.object(controller_app, "comfy_submit", new_callable=mock.AsyncMock) as submit, \
                 mock.patch.object(controller_app.asyncio, "timeout", side_effect=lambda _seconds: timeout(0.02)):
                with self.assertRaises(web.HTTPGatewayTimeout):
                    await controller_app.local_submit(self.app, {})
            submit.assert_not_awaited()
            self.assertTrue(self.app["comfy_lock"].locked(), "must not release another request's lock")
        finally:
            self.app["comfy_lock"].release()

    async def test_connection_failure_is_an_actionable_service_error(self):
        with mock.patch.object(controller_app, "comfy_submit", side_effect=controller_app.aiohttp.ClientConnectionError()):
            with self.assertRaises(web.HTTPServiceUnavailable) as raised:
                await controller_app.local_submit(self.app, {})
        self.assertIn("无法连接本地 ComfyUI", raised.exception.text)
        self.assertFalse(self.app["comfy_lock"].locked())

    async def test_validation_and_cleanup_errors_are_not_rewritten(self):
        error = web.HTTPBadRequest(reason="missing model")
        with mock.patch.object(controller_app, "comfy_submit", side_effect=error):
            with self.assertRaises(web.HTTPBadRequest) as raised:
                await controller_app.local_submit(self.app, {})
        self.assertIs(raised.exception, error)
        self.app["cleanup_pending"].add("old-job")
        with mock.patch.object(controller_app, "comfy_submit", new_callable=mock.AsyncMock) as submit:
            with self.assertRaises(web.HTTPConflict):
                await controller_app.local_submit(self.app, {})
        submit.assert_not_awaited()


class LocalOutputEventOrderTest(unittest.IsolatedAsyncioTestCase):
    async def test_early_success_waits_for_history_before_finishing(self):
        job = {"status": "running", "progress": 0.8, "outputs": []}
        output = [{"filename": "result.png", "kind": "image"}]
        with mock.patch.object(controller_app, "JOBS", {"event-order": job}), \
             mock.patch.object(controller_app, "save_jobs"), \
             mock.patch.object(controller_app, "collect_outputs", new=mock.AsyncMock(side_effect=[[], output])) as collect:
            await controller_app.handle_event(None, {
                "type": "execution_success", "data": {"prompt_id": "event-order"},
            })
            self.assertEqual(job["status"], "running")
            self.assertEqual(job["step"], "正在取回产物")
            self.assertNotIn("ended", job)
            await controller_app.handle_event(None, {
                "type": "executing", "data": {"prompt_id": "event-order", "node": None},
            })
            self.assertEqual(job["status"], "done")
            self.assertEqual(job["outputs"], output)
            self.assertEqual(collect.await_count, 2)

    async def test_permission_registration_cannot_override_concurrent_cleanup(self):
        job = {"status": "running", "outputs": []}

        async def register(*_args):
            job["cleanup_pending"] = True
            job["step"] = "正在停止并释放显存"

        with mock.patch.object(controller_app, "JOBS", {"acl-cancel": job}), \
             mock.patch.object(controller_app, "save_jobs"), \
             mock.patch.object(controller_app, "collect_outputs", new=mock.AsyncMock(return_value=[{"filename": "late.png"}])), \
             mock.patch.object(controller_app, "call_store", new=mock.AsyncMock(side_effect=[{"project_id": "p"}, {"state": "active"}])), \
             mock.patch.object(controller_app, "resource_call", side_effect=register):
            await controller_app.handle_event(None, {
                "type": "execution_success", "data": {"prompt_id": "acl-cancel"},
            }, app={})
        self.assertEqual(job["status"], "running")
        self.assertEqual(job["outputs"], [])
        self.assertEqual(job["step"], "正在停止并释放显存")
        self.assertNotIn("ended", job)

    async def test_success_with_available_outputs_finishes_immediately(self):
        job = {"status": "running", "outputs": []}
        output = [{"filename": "cached.png", "kind": "image"}]
        with mock.patch.object(controller_app, "JOBS", {"ready-output": job}), \
             mock.patch.object(controller_app, "save_jobs"), \
             mock.patch.object(controller_app, "collect_outputs", new=mock.AsyncMock(return_value=output)):
            await controller_app.handle_event(None, {
                "type": "execution_success", "data": {"prompt_id": "ready-output"},
            })
        self.assertEqual(job["status"], "done")
        self.assertEqual(job["outputs"], output)


class LocalCleanupTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def asyncSetUp(self):
        self.auth_setup()
        self.own_project("p")
        self.register_job("local-job")
        for patcher in (
            mock.patch.object(controller_app, "PROJ_DIR", self.root / "data" / "projects"),
            mock.patch.object(controller_app, "CONTROLLER_MODE", False),
            mock.patch.object(controller_app, "save_jobs"),
            mock.patch.object(controller_app, "JOBS", {}),
            mock.patch.object(controller_app, "STEPS", {}),
            mock.patch.object(controller_app, "WEIGHTS", {}),
            mock.patch.object(controller_app, "patch_graph", return_value={}),
            mock.patch.dict(controller_app.CAPS, {"cleanup-test": {
                "_graph_ok": True, "name": "测试", "outputType": "image",
            }}),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)
        self.job = {"id": "local-job", "status": "running", "progress": 0.4,
                    "step": "采样", "created": 1, "outputs": [], "error": None}
        controller_app.JOBS["local-job"] = self.job
        self.started = asyncio.Event()
        self.confirmed = asyncio.Event()
        self.ack = {"cancelled": True, "cleanup_complete": True}
        self.session = mock.MagicMock()
        response = self.session.post.return_value.__aenter__.return_value
        response.raise_for_status = mock.Mock()

        async def acknowledgement():
            self.started.set()
            await self.confirmed.wait()
            if isinstance(self.ack, Exception):
                raise self.ack
            return self.ack

        response.json = mock.AsyncMock(side_effect=acknowledgement)
        self.app = self.build_app()
        self.app["session"] = self.session
        self.app["comfy_lock"] = asyncio.Lock()
        self.app["cleanup_pending"] = set()
        self.app["cleanup_tasks"] = {}
        self.app.router.add_post("/api/generate", controller_app.api_generate)
        self.app.router.add_get("/api/jobs", controller_app.api_jobs)
        self.app.router.add_post("/api/job/{pid}/cancel", controller_app.api_cancel)
        self.app.router.add_delete("/api/job/{pid}", controller_app.api_job_delete)
        await self.start_client(self.app)

    async def asyncTearDown(self):
        self.confirmed.set()
        await asyncio.gather(*self.app["cleanup_tasks"].values(), return_exceptions=True)
        await self.client.close()
        self.auth_teardown()

    async def assert_generation_blocked(self):
        with mock.patch.object(controller_app, "comfy_submit", new_callable=mock.AsyncMock) as submit:
            response = await self.client.post("/api/generate", json={"capability": "cleanup-test", "project": "p"})
            self.assertEqual(response.status, 409)
            submit.assert_not_awaited()

    async def test_cancel_ack_gates_generation_events_and_deletion(self):
        stopping = asyncio.create_task(self.client.post("/api/job/local-job/cancel"))
        await self.started.wait()
        self.assertEqual(self.job["status"], "running")
        self.assertEqual(self.job["step"], "正在停止并释放显存")
        listed = await (await self.client.get("/api/jobs")).json()
        self.assertEqual(listed["jobs"][0]["step"], "正在停止并释放显存")
        await self.assert_generation_blocked()
        for event_type in ("execution_start", "executing", "execution_success", "progress_state",
                           "execution_error", "execution_interrupted", "execution_cached"):
            await controller_app.handle_event(self.session, {
                "type": event_type, "data": {"prompt_id": "local-job", "node": None},
            })
        self.assertEqual(self.job["status"], "running")
        self.assertEqual(self.job["step"], "正在停止并释放显存")
        self.assertEqual(self.job["progress"], 0.4)
        deleted = await (await self.client.delete("/api/job/local-job")).json()
        self.assertTrue(deleted["pending"])
        self.assertIn("local-job", controller_app.JOBS)
        self.confirmed.set()
        response = await stopping
        self.assertEqual(response.status, 200)
        self.assertEqual(self.job["status"], "canceled")
        self.assertFalse(self.app["cleanup_pending"])
        await controller_app.handle_event(self.session, {
            "type": "execution_error", "data": {"prompt_id": "local-job"},
        })
        self.assertEqual(self.job["status"], "canceled")
        self.session.post.assert_called_once()
        args, kwargs = self.session.post.call_args
        self.assertEqual(args[0], controller_app.COMFY_HTTP + "/api/jobs/local-job/cancel")
        self.assertEqual(kwargs["json"], {"free_memory": True})
        self.assertEqual(kwargs["timeout"].total, 130)
        with mock.patch.object(controller_app, "comfy_submit", new=mock.AsyncMock(return_value="next")):
            response = await self.client.post("/api/generate", json={"capability": "cleanup-test", "project": "p"})
            self.assertEqual(response.status, 200)

    async def test_disconnected_caller_and_duplicate_cancel_share_cleanup(self):
        first = asyncio.create_task(controller_app.stop_job(self.app, "local-job"))
        await self.started.wait()
        cleanup = self.app["cleanup_tasks"]["local-job"]
        first.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await first
        self.assertFalse(cleanup.cancelled())
        second = asyncio.create_task(controller_app.stop_job(self.app, "local-job"))
        await self.assert_generation_blocked()
        self.assertIs(self.app["cleanup_tasks"]["local-job"], cleanup)
        self.assertFalse(second.done())
        self.confirmed.set()
        self.assertEqual(await second, "canceled")
        self.session.post.assert_called_once()

    async def test_unknown_id_never_calls_comfy_cleanup(self):
        response = await self.client.post("/api/job/unknown/cancel")
        self.assertEqual(response.status, 404)
        self.session.post.assert_not_called()
        self.assertFalse(self.app["cleanup_pending"])

    async def test_queued_cancel_and_shutdown_wait_for_ack(self):
        self.job["status"] = "queued"
        stopping = asyncio.create_task(controller_app.stop_job(self.app, "local-job"))
        await self.started.wait()
        self.assertEqual(self.job["status"], "queued")
        session = mock.Mock(close=mock.AsyncMock())
        previews = mock.Mock(close=mock.AsyncMock())
        shutdown = asyncio.create_task(controller_app.on_stop({
            "cleanup_tasks": self.app["cleanup_tasks"], "session": session,
            "video_previews": previews,
        }))
        await self.assert_generation_blocked()
        self.assertFalse(shutdown.done())
        session.close.assert_not_awaited()
        self.confirmed.set()
        await stopping
        await shutdown
        session.close.assert_awaited_once()
        self.assertEqual(self.job["status"], "canceled")

    async def test_inflight_output_collection_cannot_override_cancel(self):
        collecting = asyncio.Event()
        collected = asyncio.Event()

        async def outputs(_session, _pid):
            collecting.set()
            await collected.wait()
            return [{"filename": "late.png"}]

        with mock.patch.object(controller_app, "collect_outputs", side_effect=outputs):
            event = asyncio.create_task(controller_app.handle_event(self.session, {
                "type": "execution_success", "data": {"prompt_id": "local-job"},
            }))
            await collecting.wait()
            stopping = asyncio.create_task(controller_app.stop_job(self.app, "local-job"))
            await self.started.wait()
            collected.set()
            await event
            self.assertEqual(self.job["status"], "running")
            self.assertEqual(self.job["outputs"], [])
            self.confirmed.set()
            await stopping
            self.assertEqual(self.job["status"], "canceled")

    async def test_submit_lock_orders_cancel_before_later_submission(self):
        submitting = asyncio.Event()
        submitted = asyncio.Event()

        async def submit(_session, _graph, prompt_id=None):
            submitting.set()
            await submitted.wait()
            return "prior-job"

        with mock.patch.object(controller_app, "comfy_submit", side_effect=submit) as prompt:
            first = asyncio.create_task(controller_app.local_submit(self.app, {}))
            await submitting.wait()
            # 排在已发出的提交之后，后到的提交之前。
            stopping = asyncio.create_task(controller_app.stop_job(self.app, "local-job"))
            later = asyncio.create_task(controller_app.local_submit(self.app, {}))
            submitted.set()
            self.assertEqual(await first, "prior-job")
            await self.started.wait()
            with self.assertRaises(web.HTTPConflict):
                await later
            prompt.assert_awaited_once()
            self.confirmed.set()
            await stopping

    async def test_missing_ack_and_timeout_keep_gate_and_allow_cancel_retry(self):
        self.confirmed.set()
        for ack in ({"cancelled": True}, asyncio.TimeoutError()):
            with self.subTest(ack=ack):
                self.ack = ack
                response = await self.client.post("/api/job/local-job/cancel")
                self.assertEqual(response.status, 503)
                self.assertEqual(self.job["status"], "running")
                self.assertTrue(self.job["cleanup_pending"])
                self.assertIn("重试取消", self.job["step"])
                await self.assert_generation_blocked()
                deleted = await (await self.client.delete("/api/job/local-job")).json()
                self.assertTrue(deleted["pending"])
        self.ack = {"cancelled": False, "cleanup_complete": True}
        response = await self.client.post("/api/job/local-job/cancel")
        self.assertEqual(response.status, 200)
        self.assertEqual(self.job["status"], "canceled")
        self.assertFalse(self.app["cleanup_pending"])
        self.assertEqual(self.session.post.call_count, 3)


if __name__ == "__main__":
    unittest.main()
