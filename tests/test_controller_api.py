import asyncio
import hashlib
import json
import sys
import tempfile
import threading
import time
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
            "qwen2512": "qwen_image_2512_t2i", "qwen21": "qwen_image_21_t2i",
        })

        modes = scan_workflows.build_modes([
            controller_app.CAPS["zimage_t2i"],
            controller_app.CAPS["krea2_t2i"],
            controller_app.CAPS["zimage_i2i"],
            controller_app.CAPS["krea2_i2i"],
        ])
        self.assertEqual([item["name"] for item in modes], ["文生图", "图生图"])
        self.assertEqual(modes[1]["modelSwitch"]["krea2"], "krea2_i2i")

    def test_depth_video_models_share_one_tool_mode(self):
        card = next(item for item in controller_app.CARDS if item["id"] == "card_tools")
        mode = next(item for item in card["modes"] if item["id"] == "depth_video")
        self.assertEqual(mode["modelSwitch"], {
            "da3": "depth_video", "depthcrafter": "depthcrafter_video",
        })
        generated = scan_workflows.build_tools_card(
            [cap for cap in controller_app.CAPS.values() if cap.get("card") == "card_tools"],
            controller_app.CAPS,
        )
        generated_mode = next(item for item in generated["modes"] if item["id"] == "depth_video")
        self.assertEqual(generated_mode["modelSwitch"], mode["modelSwitch"])
        cap = controller_app.CAPS["depthcrafter_video"]
        guidance = next(item for item in cap["inputs"] if item["key"] == "guidance_scale")
        self.assertEqual(guidance["min"], 0.1)
        self.assertEqual(scan_workflows.CAP_KNOBS["depthcrafter_video"]["guidance_scale"][1], 0.1)
        graph = controller_app.patch_graph(cap, {"max_res": 768, "guidance_scale": 0.1}, {
            "video[0]": "depth-source.mp4",
        })
        self.assertEqual(graph["30"]["inputs"]["video"], "depth-source.mp4")
        self.assertEqual(graph["31"]["inputs"]["max_res"], 768)
        self.assertEqual(graph["31"]["inputs"]["guidance_scale"], 0.1)
        self.assertNotIn("37", graph)
        self.assertNotIn("38", graph)
        self.assertEqual(
            [node for node, data in graph.items() if data["class_type"] == "VHS_VideoCombine"],
            ["26"],
        )
        self.assertEqual(cap["output"], {"node": "26"})

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

    def test_h3_reference_sampling_modes_override_conflicting_parameters(self):
        cap = controller_app.CAPS["minimax_h3_ref9"]
        mode = next(item for item in cap["inputs"] if item["key"] == "sampling_mode")
        self.assertEqual(mode["default"], "quality")
        self.assertEqual(mode["presets"]["quality"], {
            "steps": 20, "strength_model": 0, "processing_control_value": 0,
        })
        duration = next(item for item in cap["inputs"] if item["key"] == "duration")
        self.assertEqual(duration["warnAbove"], 8)

        fast = controller_app.patch_graph(cap, {"sampling_mode": "fast"}, {})
        self.assertEqual(fast["1"]["inputs"]["steps"], 8)
        self.assertEqual(fast["69"]["inputs"]["strength_model"], 1)
        self.assertEqual(fast["71"]["inputs"]["processing_control_value"], 0.12)

        quality = controller_app.patch_graph(cap, {
            "sampling_mode": "quality",
            "steps": 8,
            "strength_model": 1,
            "processing_control_value": 0.12,
            "duration": 10,
        }, {})
        self.assertEqual(quality["1"]["inputs"]["steps"], 20)
        self.assertEqual(quality["69"]["inputs"]["strength_model"], 0)
        self.assertEqual(quality["71"]["inputs"]["processing_control_value"], 0)
        self.assertEqual(quality["20"]["inputs"]["value"], 10)
        with self.assertRaises(web.HTTPBadRequest):
            controller_app.patch_graph(cap, {"sampling_mode": "unknown"}, {})

    def test_h3_two_pass_stable_mode_only_controls_lora_and_te(self):
        cap = controller_app.CAPS["minimax_h3_ref_2pass"]
        spec = next(item for item in cap["inputs"] if item["key"] == "stable_mode")
        self.assertEqual(spec, scan_workflows.CAP_INPUT_PRESETS[cap["id"]][0])
        self.assertEqual(spec["default"], "off")
        self.assertEqual(spec["appearance"], "switch")
        self.assertFalse(spec.get("mirror"))
        self.assertTrue(spec["showHint"])
        for key in ("strength_model", "processing_control_value"):
            self.assertTrue(next(item for item in cap["inputs"] if item["key"] == key)["mirror"])
        self.assertFalse(any(item["key"] == "lora_acceleration" for item in cap["inputs"]))
        self.assertFalse(any(item["key"] == "stable_mode"
                             for item in controller_app.CAPS["minimax_h3_ref9"]["inputs"]))

        params = {"seed": 42, "steps": 27, "duration": 7, "scale_by": 1.5}
        baseline = controller_app.patch_graph(cap, dict(params), {})
        self.assertEqual(baseline["230"]["inputs"]["strength_model"], 1)
        self.assertEqual(baseline["232"]["inputs"]["processing_control_value"], 0.12)
        for selected, strength, te in (("off", 1, 0.12), ("on", 0, 0)):
            with self.subTest(stable_mode=selected):
                graph = controller_app.patch_graph(cap, {
                    **params, "stable_mode": selected, "lora_acceleration": "off",
                    "strength_model": 0.5, "processing_control_value": 0.085,
                }, {})
                self.assertEqual(graph["230"]["inputs"]["strength_model"], strength)
                self.assertEqual(graph["232"]["inputs"]["processing_control_value"], te)
                graph["230"]["inputs"]["strength_model"] = 1
                graph["232"]["inputs"]["processing_control_value"] = 0.12
                self.assertEqual(graph, baseline, "steps, seed, duration and all other graph fields stay unchanged")
        with self.assertRaises(web.HTTPBadRequest):
            controller_app.patch_graph(cap, {"stable_mode": "invalid"}, {})

    def test_h3_two_pass_rescan_preserves_stable_mode_and_hidden_raw_controls(self):
        graph = {
            "230": {"class_type": "LoraLoaderModelOnly", "inputs": {"strength_model": 1},
                    "_meta": {"title": "Load LoRA"}},
            "232": {"class_type": "TESpeedMiniMaxH3", "inputs": {"processing_control_value": 0.12},
                    "_meta": {"title": "TE-Speed-MiniMaxH3"}},
        }
        info = {
            "LoraLoaderModelOnly": {"input": {"required": {"strength_model": ["FLOAT", {"default": 1}]}}},
            "TESpeedMiniMaxH3": {"input": {"required": {"processing_control_value": ["FLOAT", {"default": 0.12}]}}},
        }
        inputs, *_ = scan_workflows.derive_inputs(graph, info, "minimax_h3_ref_2pass")
        switch = next(item for item in inputs if item["key"] == "stable_mode")
        strength = next(item for item in inputs if item["key"] == "strength_model")
        self.assertEqual(switch, scan_workflows.CAP_INPUT_PRESETS["minimax_h3_ref_2pass"][0])
        self.assertEqual(switch["default"], "off")
        self.assertFalse(switch.get("mirror"))
        self.assertTrue(strength["mirror"])
        self.assertFalse(any(item["key"] == "lora_acceleration" for item in inputs))
        te = next(item for item in inputs if item["key"] == "processing_control_value")
        declared = next(item for item in controller_app.CAPS["minimax_h3_ref_2pass"]["inputs"]
                        if item["key"] == te["key"])
        self.assertEqual(te, declared)
        ordinary, *_ = scan_workflows.derive_inputs(graph, info, "minimax_h3_ref9")
        ordinary_te = next(item for item in ordinary if item["key"] == te["key"])
        self.assertTrue(ordinary_te["advanced"])
        self.assertNotIn("showHint", ordinary_te)

    def test_h3_two_pass_stable_mode_defaults_off_despite_legacy_values(self):
        cap = controller_app.CAPS["minimax_h3_ref_2pass"]
        for supplied in ({}, {"processing_control_value": None},
                         {"processing_control_value": ""}, {"processing_control_value": 0},
                         {"lora_acceleration": "off", "strength_model": 0, "processing_control_value": 0.085}):
            with self.subTest(params=supplied):
                graph = controller_app.patch_graph(cap, {"seed": 42, **supplied}, {})
                self.assertEqual(graph["232"]["inputs"]["processing_control_value"], 0.12)
                self.assertEqual(graph["230"]["inputs"]["strength_model"], 1)

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
        self.assertEqual(controller_app.model_family("depth_video"), "depth_anything3")
        self.assertEqual(controller_app.model_family("depthcrafter_video"), "depthcrafter")
        self.assertEqual(controller_app.model_name("depthcrafter_video"), "DepthCrafter")
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
            "qwen_image_21_multi": (0.30, 0.60),
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


def capacity_test_video(path, *, width=1280, height=720, rotate=False):
    """生成真实临时媒体；依赖缺失直接失败，不以模拟元数据替代回归。"""
    executable = controller_app.ffmpeg_bin()
    if executable is None:
        raise RuntimeError("真实产物回归需要 ffmpeg，不能跳过或放宽断言")
    source = path.with_name("rotation-source.mp4") if rotate else path
    controller_app.subprocess.run(
        [str(executable), "-hide_banner", "-loglevel", "error", "-nostdin",
         "-f", "lavfi", "-i", f"color=c=blue:s={width}x{height}:r=24",
         "-t", "2", "-c:v", "mpeg4", str(source)],
        check=True, capture_output=True, timeout=8,
    )
    if rotate:
        controller_app.subprocess.run(
            [str(executable), "-hide_banner", "-loglevel", "error", "-nostdin",
             "-display_rotation", "90", "-i", str(source), "-c", "copy", str(path)],
            check=True, capture_output=True, timeout=8,
        )
    return path.read_bytes()


class FfmpegDiscoveryTest(unittest.TestCase):
    def test_capacity_output_probe_uses_real_rotated_display_dimensions(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "rotated.mp4"
            capacity_test_video(path, rotate=True)
            metadata = controller_app.probe_capacity_output(path)
            self.assertTrue(metadata["valid"], metadata)
            self.assertEqual((metadata["width"], metadata["height"]), (720, 1280))
            self.assertAlmostEqual(metadata["duration"], 2)
            self.assertAlmostEqual(metadata["fps"], 24)

    def test_capacity_output_probe_reads_real_synthetic_media(self):
        executable = controller_app.ffmpeg_bin()
        if executable is None:
            self.skipTest("本机未安装媒体探测器")
        with tempfile.TemporaryDirectory() as directory:
            for filename, extra in (("image.png", ["-frames:v", "1"]),
                                    ("video.mp4", ["-t", "1", "-c:v", "mpeg4"])):
                with self.subTest(filename=filename):
                    path = Path(directory) / filename
                    controller_app.subprocess.run(
                        [str(executable), "-hide_banner", "-loglevel", "error", "-nostdin",
                         "-f", "lavfi", "-i", "color=c=blue:s=64x48:r=24", *extra, str(path)],
                        check=True, capture_output=True, timeout=8,
                    )
                    metadata = controller_app.probe_capacity_output(path)
                    self.assertTrue(metadata["valid"], metadata)
                    self.assertEqual((metadata["width"], metadata["height"]), (64, 48))
                    if filename.endswith("mp4"):
                        self.assertAlmostEqual(metadata["duration"], 1)
                        self.assertAlmostEqual(metadata["fps"], 24)

    def test_capacity_output_probe_is_bounded_and_local_only(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "output.mp4"
            path.write_bytes(b"test-video")
            result = types.SimpleNamespace(returncode=0, stderr=(
                "Duration: 00:00:05.02, start: 0.0\n"
                "Stream #0:0: Video: h264, yuv420p, 832x480, 24 fps\n"))
            with mock.patch.object(controller_app, "ffmpeg_bin", return_value=Path("/ffmpeg")), \
                 mock.patch.object(controller_app.subprocess, "run", return_value=result) as run:
                metadata = controller_app.probe_capacity_output(path)
            self.assertTrue(metadata["valid"])
            self.assertEqual(metadata["duration"], 5.02)
            self.assertEqual(metadata["width"], 832)
            self.assertEqual(metadata["height"], 480)
            self.assertEqual(metadata["fps"], 24)
            self.assertEqual(run.call_args.kwargs["timeout"], 8)
            command = run.call_args.args[0]
            self.assertEqual(command[command.index("-protocol_whitelist") + 1], "file,pipe")
            self.assertIn("-format_whitelist", command)
            with mock.patch.object(controller_app, "ffmpeg_bin", return_value=None):
                self.assertFalse(controller_app.probe_capacity_output(path)["valid"])
            with mock.patch.object(controller_app, "ffmpeg_bin", return_value=Path("/ffmpeg")), \
                 mock.patch.object(controller_app.subprocess, "run", side_effect=OSError("unavailable")):
                self.assertFalse(controller_app.probe_capacity_output(path)["valid"])

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


class CapacityModelReferenceTest(unittest.TestCase):
    def report(self, recorded=0, complete=True):
        return {"groups": [{"capability": "reference-test", "model_evidence": {
            "total_samples": 2, "recorded_samples": recorded,
            "variants": [{"summary": {"complete": complete}}] if recorded else [],
        }}]}

    def test_complete_task_evidence_does_not_read_current_template(self):
        report = self.report(recorded=2)
        with mock.patch.dict(controller_app.CAPS, {"reference-test": {
            "name": "模型测试", "graph": "graphs/qwen_image_21_t2i.api.json"}}), \
             mock.patch.object(Path, "read_text", side_effect=AssertionError("不应读取模板")):
            controller_app.capacity_model_references(report)
        self.assertNotIn("current_model_reference", report["groups"][0])

    def test_partial_or_unresolved_evidence_retains_current_default_reference(self):
        for recorded, complete in ((1, True), (2, False)):
            with self.subTest(recorded=recorded, complete=complete):
                report = self.report(recorded, complete)
                with mock.patch.dict(controller_app.CAPS, {"reference-test": {
                    "graph": "graphs/qwen_image_21_t2i.api.json"}}):
                    controller_app.capacity_model_references(report)
                group = report["groups"][0]
                self.assertEqual(group["current_model_reference"]["source"], "current_template")
                self.assertEqual(group["model_evidence"]["recorded_samples"], recorded)
                self.assertEqual(group["model_evidence"]["variants"][0]["summary"]["complete"], complete)

    def test_template_read_once_per_capability_and_not_cached_across_reports(self):
        report = self.report()
        report["groups"].append(self.report()["groups"][0])
        graph = {"1": {"class_type": "UNETLoader", "inputs": {"unet_name": "original_fp8.safetensors"}},
                 "2": {"class_type": "KSampler", "inputs": {"model": ["1", 0]}},
                 "3": {"class_type": "SaveImage", "inputs": {"images": ["2", 0]}}}
        with mock.patch.dict(controller_app.CAPS, {"reference-test": {"graph": "graphs/current.api.json"}}), \
             mock.patch.object(Path, "read_text", return_value=json.dumps(graph)) as reader:
            controller_app.capacity_model_references(report)
            self.assertEqual(reader.call_count, 1)
            first = report["groups"][0]["current_model_reference"]
            graph["1"]["inputs"]["unet_name"] = "updated_bf16.safetensors"
            reader.return_value = json.dumps(graph)
            refreshed = controller_app.capacity_model_references(self.report())
            second = refreshed["groups"][0]["current_model_reference"]
        self.assertEqual(first["models"][0]["name"], "original_fp8.safetensors")
        self.assertEqual(second["models"][0]["name"], "updated_bf16.safetensors")

    def test_missing_invalid_and_outside_templates_do_not_fail_report(self):
        for graph in (None, "", "graphs/not-present.api.json", "../outside.json", str(ROOT / "pricing.json")):
            with self.subTest(graph=graph), mock.patch.dict(controller_app.CAPS, {"reference-test": {"graph": graph}}):
                report = controller_app.capacity_model_references(self.report())
                self.assertNotIn("current_model_reference", report["groups"][0])
        for content in ("not-json", "[]", "null"):
            with self.subTest(content=content), \
                 mock.patch.dict(controller_app.CAPS, {"reference-test": {"graph": "graphs/broken.api.json"}}), \
                 mock.patch.object(Path, "read_text", return_value=content):
                report = controller_app.capacity_model_references(self.report())
                self.assertNotIn("current_model_reference", report["groups"][0])


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
        application["capacity_probe_state"] = {"task": None}
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
        application.router.add_delete(
            "/api/workers/{worker_id}", controller_app.api_worker_delete
        )
        application.router.add_post(
            "/api/admin/workers/sync-all", controller_app.api_workers_sync_all
        )
        application.router.add_get("/api/costs", controller_app.api_costs)
        application.router.add_get("/controller/capacity", controller_app.controller_capacity)
        application.router.add_get("/api/capacity", controller_app.api_capacity)
        application.router.add_get("/api/capacity/export", controller_app.api_capacity_export)
        application.router.add_post("/api/capacity/estimate", controller_app.api_capacity_estimate)
        application.router.add_post("/api/capacity/jobs/{pid}/review", controller_app.api_capacity_review)
        application.router.add_post("/api/capacity/jobs/{pid}/probe-outputs", controller_app.api_capacity_probe_outputs)
        application.router.add_post("/api/capacity/workers/{worker_id}", controller_app.api_capacity_worker)
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

    async def test_capacity_permissions_and_navigation(self):
        response = await self.client.get("/controller/capacity")
        self.assertEqual(response.status, 200)
        self.assertIn("产能评估", await response.text())
        dashboard = await (await self.client.get("/controller")).text()
        self.assertIn('src="/admin-shell.js"', dashboard)
        shell = (ROOT / 'web/admin-shell.js').read_text(encoding='utf-8')
        self.assertIn("H3Auth.mountAccount", shell)
        navigation = (ROOT / 'web/auth.js').read_text(encoding='utf-8')
        self.assertLess(navigation.index("add('costs', '费用评估', '/controller/costs')"),
                        navigation.index("add('capacity', '产能统计', '/controller/capacity')"))
        report = await (await self.client.get("/api/capacity")).json()
        self.assertEqual(report["overview"]["tasks"], 0)
        self.assertEqual((await self.client.get("/capacity.html")).status, 404)
        self.auth.create_user("capacity-reader", auth_support.PASSWORD)
        headers = await self.login("capacity-reader")
        self.client.session.headers.update(headers)
        for path in ("/controller/capacity", "/capacity.html", "/api/capacity",
                     "/api/capacity/export"):
            with self.subTest(path=path):
                self.assertEqual((await self.client.get(path)).status, 403)
        self.assertEqual((await self.client.post("/api/capacity/estimate", json={})).status, 403)
        self.assertEqual((await self.client.post("/api/capacity/jobs/j/review", json={})).status, 403)
        self.client.session.cookie_jar.clear()
        self.assertEqual((await self.client.get("/api/capacity")).status, 401)

    async def test_capacity_query_and_body_validation(self):
        for query in ("from=nan", "to=inf", "from=2&to=1", "from=1&to=1", "from=-1", "to=1e100",
                      "limit=201", "offset=-1", "limit=invalid"):
            self.assertEqual((await self.client.get("/api/capacity?" + query)).status, 400)
        for body in ([], None, "wrong"):
            response = await self.client.post("/api/capacity/estimate", json=body)
            self.assertEqual(response.status, 400)
        response = await self.client.post("/api/capacity/estimate", data="x" * 65537,
                                          headers={"Content-Type": "application/json"})
        self.assertEqual(response.status, 413)
        response = await self.client.post("/api/capacity/estimate", json={})
        self.assertEqual(response.status, 400)
        response = await self.client.post("/api/capacity/jobs/missing/review",
                                          json={"accepted": 0})
        self.assertEqual(response.status, 404)
        response = await self.client.post("/api/capacity/estimate", json={},
                                          headers={"X-CSRF-Token": "invalid"})
        self.assertEqual(response.status, 403)

    async def test_capacity_history_and_csv_keep_worker_identity(self):
        import time
        workers = [self.store.register_worker("=重复机器") for _ in range(2)]
        for i, worker in enumerate(workers):
            job = {"id": f"capacity-history-{i}", "capability": "qwen_image_21_multi",
                   "status": "queued", "created": time.time() - 200,
                   "worker_id": worker["worker_id"]}
            self.ledger.record_job(job, {"width": 1024}, {}, {})
            self.ledger.start_job(job["id"], worker["worker_id"], job["created"] + 10)
            self.ledger.finish_job(job["id"], "done", job["created"] + 70, worker["worker_id"])
        response = await self.client.get("/api/capacity?limit=1")
        self.assertEqual(response.status, 200)
        report = await response.json()
        self.assertEqual(report["overview"]["tasks"], 2)
        self.assertEqual(report["details_total"], 2)
        self.assertEqual(len(report["details"]), 1)
        self.assertEqual(len({g["worker_id"] for g in report["groups"]}), 2)
        self.assertTrue(all(g["source"] == "historical" for g in report["groups"]))
        response = await self.client.get("/api/capacity/export")
        self.assertEqual(response.status, 200)
        self.assertIn("text/csv", response.headers["Content-Type"])
        self.assertIn("attachment", response.headers["Content-Disposition"])
        self.assertNotIn("\n=重复机器", await response.text())
        group = report["groups"][0]
        payload = {"worker_id": group["worker_id"], "mode": "historical",
                   "quality": "technical", "hours": 8, "availability": 1,
                   "utilization": 0.75, "demands": [{"group_id": group["id"], "quantity": 1000}]}
        response = await self.client.post("/api/capacity/estimate", json=payload)
        self.assertEqual(response.status, 200, await response.text())
        estimate = await response.json()
        self.assertEqual(estimate["machines"], 3)
        self.assertTrue(estimate["warnings"])
        payload["mode"] = "verified"
        self.assertEqual((await self.client.post("/api/capacity/estimate", json=payload)).status, 400)

    async def test_capacity_readable_summary_preserves_model_and_hardware_sources(self):
        import time
        now = time.time()
        credentials = self.store.register_worker("可读性测试机器", {
            "agent_version": 3,
            "devices": [{"name": "RTX 4090", "type": "cuda", "vram_total": 24 * 1024 ** 3}],
            "system": {"ram_total": 96 * 1024 ** 3, "os": "win32"},
        })
        worker_id = credentials["worker_id"]
        self.store.heartbeat(worker_id, comfy_online=True)
        graph = json.loads((ROOT / "graphs/qwen_image_21_t2i.api.json").read_text())
        payload = {"capability": "qwen_image_21_t2i", "capacity_spec": controller_app.make_spec(
            "qwen_image_21_t2i", {"output_kind": "image"}, graph, {})}
        with self.store.lock, self.store.db:
            worker = dict(self.store.db.execute("SELECT * FROM workers WHERE id=?", (worker_id,)).fetchone())
            self.store.capacity.enqueue("readable-captured", payload, now - 200)
            self.store.capacity.assigned("readable-captured", worker, "synthetic-lease-hash", now - 199)
            self.store.capacity.running("readable-captured", worker_id, "synthetic-lease-hash", now - 198)
            self.store.capacity.terminal("readable-captured", worker_id, "synthetic-lease-hash",
                                         "done", now - 120, released=True)
        historical = {"id": "readable-history", "capability": "qwen_image_21_t2i",
                      "status": "queued", "created": now - 500, "worker_id": worker_id}
        self.ledger.record_job(historical)
        self.ledger.start_job(historical["id"], worker_id, now - 499)
        self.ledger.finish_job(historical["id"], "done", now - 450, worker_id)
        response = await self.client.get("/api/capacity")
        self.assertEqual(response.status, 200)
        report = await response.json()
        machine = report["workers"][0]
        self.assertEqual(machine["agent_version"], 3)
        self.assertFalse(machine["supports_capacity_telemetry"])
        self.assertEqual(machine["hardware"]["gpus"][0]["memory_total_bytes"], 24 * 1024 ** 3)
        self.assertEqual(machine["hardware"]["memory_total_bytes"], 96 * 1024 ** 3)
        self.assertIsNone(machine["hardware"]["cpu"])
        groups = {group["source"]: group for group in report["groups"]}
        summary = groups["captured"]["model_summary"]
        self.assertEqual(summary["precision_label"], "INT8")
        self.assertEqual(summary["source"], "task_snapshot")
        self.assertFalse(summary["runtime_verified"])
        self.assertEqual([item["name"] for item in summary["models"]],
                         ["qwen_image_2.1_int8_convrot.safetensors"])
        self.assertEqual(groups["captured"]["mean_seconds"], 78)
        self.assertEqual(groups["captured"]["last_sample_at"], now - 200)
        self.assertIsNone(groups["historical"]["model_summary"]["precision_label"])
        self.assertEqual(groups["historical"]["model_summary"]["source"], "unrecorded")
        encoded = json.dumps(report)
        for secret in (credentials["worker_token"], "synthetic-lease-hash"):
            self.assertNotIn(secret, encoded)

    async def test_capacity_current_template_is_reference_only_and_does_not_change_estimate(self):
        import time
        now = time.time()
        worker = self.store.register_worker("模型参考测试机器", {})
        job = {"id": "model-reference-history", "capability": "qwen_image_21_t2i",
               "status": "queued", "created": now - 200, "worker_id": worker["worker_id"]}
        self.ledger.record_job(job)
        self.ledger.start_job(job["id"], worker["worker_id"], now - 199)
        self.ledger.finish_job(job["id"], "done", now - 121, worker["worker_id"])
        before = self.store.capacity.report()
        group = before["groups"][0]
        payload = {"worker_id": worker["worker_id"], "mode": "historical", "quality": "technical",
                   "hours": 8, "availability": 1, "utilization": 0.75,
                   "demands": [{"group_id": group["id"], "quantity": 100}]}
        estimate = self.store.capacity.estimate(payload)
        database = "\n".join(self.store.db.iterdump())
        cap = {"name": "测试文生图", "graph": "graphs/qwen_image_21_t2i.api.json"}
        with mock.patch.dict(controller_app.CAPS, {job["capability"]: cap}):
            response = await self.client.get("/api/capacity")
            self.assertEqual(response.status, 200)
            report = await response.json()
            displayed = report["groups"][0]
            reference = displayed.pop("current_model_reference")
            self.assertEqual(reference["source"], "current_template")
            self.assertEqual(reference["capability_name"], "测试文生图")
            self.assertEqual([item["name"] for item in reference["models"]],
                             ["qwen_image_2.1_int8_convrot.safetensors"])
            self.assertFalse(reference["runtime_verified"])
            self.assertEqual(displayed["model_summary"]["source"], "unrecorded")
            self.assertEqual(displayed["model_evidence"]["recorded_samples"], 0)
            self.assertFalse(displayed["eligible"])
            displayed["capability_name"] = group["capability_name"]
            self.assertEqual(displayed, group)
            self.assertEqual((await self.client.post("/api/capacity/estimate", json=payload)).status, 200)
            exported = await (await self.client.get("/api/capacity/export")).text()
            self.assertIn("current_model_reference", exported)
            self.assertIn("current_template", exported)
            self.assertIn("qwen_image_2.1_int8_convrot.safetensors", exported)
        self.assertEqual(self.store.capacity.estimate(payload), estimate)
        self.assertEqual("\n".join(self.store.db.iterdump()), database)

    async def test_capacity_attempt_and_artifact_capture_do_not_trust_worker_metadata(self):
        import time
        credentials = self.store.register_worker("产能测试节点", {})
        worker_id = credentials["worker_id"]
        headers = {"X-Worker-ID": worker_id,
                   "Authorization": f"Bearer {credentials['worker_token']}"}
        self.store.heartbeat(worker_id, comfy_online=True)
        pid = "capacity-captured"
        self.register_job(pid)
        graph = {"1": {"class_type": "KSampler", "inputs": {"steps": 20}}}
        controller_app.JOBS[pid] = {"id": pid, "capability": "qwen_image_21_multi",
                                     "status": "queued", "created": time.time(), "outputs": []}
        self.ledger.record_job(controller_app.JOBS[pid])
        self.store.enqueue(pid, {"capability": "qwen_image_21_multi", "graph": graph,
                                  "capacity_spec": controller_app.make_spec(
                                      "qwen_image_21_multi", {"width": 1024}, graph, {"width": 1024})})
        assignment = await (await self.client.post("/agent/v1/jobs/acquire",
                                                    headers=headers, json={})).json()
        self.assertTrue(assignment["attempt_id"])
        headers["X-Lease-Token"] = assignment["lease_token"]
        await self.client.post(f"/agent/v1/jobs/{pid}/start", headers=headers, json={})
        response = await self.client.post(f"/agent/v1/jobs/{pid}/event", headers=headers,
                                          json={"type": "execution_cached", "data": {"nodes": ["1"]}})
        self.assertEqual(response.status, 200)
        data = aiohttp.FormData()
        data.add_field("file", b"fake", filename="output.png", content_type="image/png")
        metadata = {"kind": "image", "bytes": 4, "width": 1024, "height": 1024, "valid": True}
        with mock.patch.object(controller_app, "probe_capacity_output", return_value=metadata):
            response = await self.client.post(f"/agent/v1/jobs/{pid}/artifact", headers=headers, data=data)
        self.assertEqual(response.status, 201)
        artifact = await response.json()
        # 重复引用和伪造元数据不应增加产量或覆盖服务器探测结果。
        artifact["duration"] = 99999
        artifact["width"] = 1
        response = await self.client.post(f"/agent/v1/jobs/{pid}/complete", headers=headers,
                                          json={"outputs": [artifact, artifact], "capacity_released": True,
                                                "capacity_measurements": {"graph_changed": False}})
        self.assertEqual(response.status, 200, await response.text())
        report = await (await self.client.get("/api/capacity")).json()
        self.assertEqual(report["overview"]["tasks"], 1)
        self.assertEqual(report["details_total"], 1)
        detail = report["details"][0]
        self.assertEqual(len(detail["attempts"]), 1)
        self.assertEqual(len(detail["outputs"]), 1)
        self.assertEqual(detail["outputs"][0]["width"], 1024)
        self.assertNotIn(assignment["lease_token"], json.dumps(report))
        self.assertFalse(report["groups"][0]["eligible"])
        # 终态重复请求由现有租约守卫拒绝，持久统计保持一次。
        response = await self.client.post(f"/agent/v1/jobs/{pid}/complete", headers=headers,
                                          json={"outputs": [artifact]})
        self.assertEqual(response.status, 409)
        self.assertEqual(self.ledger.report()["overview"]["tasks"], 1)
        # 补录仅改变当前清单和后续执行配置，不能回填旧 attempt。
        profile = {"host_id": "manual-host", "cpu": "人工确认 CPU",
                   "memory_total_bytes": 96 * 1024 ** 3, "environment_id": "env-001",
                   "model_version": "models-001", "disk": "2 TB SSD", "note": "合成配置声明"}
        response = await self.client.post(f"/api/capacity/workers/{worker_id}", json=profile)
        self.assertEqual(response.status, 200, await response.text())
        updated = await (await self.client.get("/api/capacity")).json()
        self.assertEqual(updated["workers"][0]["hardware"]["disk"], "2 TB SSD")
        self.assertEqual(updated["groups"][0]["config_id"], report["groups"][0]["config_id"])
        self.assertNotEqual(updated["groups"][0]["config"]["host_id"], "manual-host")
        response = await self.client.post(f"/api/capacity/jobs/{pid}/review", json={
            "accepted": None, "source": "standard", "benchmark_id": "synthetic-bench",
            "note": "仅为人工归档标签，不自动成为标准跑分",
        })
        self.assertEqual(response.status, 200, await response.text())
        reviewed = await (await self.client.get("/api/capacity")).json()
        self.assertEqual(reviewed["groups"][0]["source"], "standard")
        self.assertEqual(reviewed["groups"][0]["benchmark_id"], "synthetic-bench")
        self.assertFalse(reviewed["groups"][0]["eligible"])

    def seed_capacity_probe(self, pid="probe-final", *, count=1, captured=True, status="done"):
        """构造旧任务及登记清单，尺寸刻意缺失，所有文件只位于临时目录。"""
        if not hasattr(self, "probe_worker"):
            self.probe_worker = self.store.register_worker("补采回归机器", {})
        worker_id = self.probe_worker["worker_id"]
        capability = "minimax_h3_ref_2pass"
        now = time.time() - 200
        self.register_job(pid)
        folder = self.root / "data" / "artifacts" / pid
        folder.mkdir(parents=True)
        locators = [f"{pid}/final-{i}.mp4" for i in range(count)]
        for locator in locators:
            (self.root / "data" / "artifacts" / locator).write_bytes(b"synthetic-video")
            self.access.register("p", "artifact", locator)
        job = {"id": pid, "capability": capability, "status": "queued", "created": now,
               "worker_id": worker_id, "outputs": [{"url": "/api/artifact/" + key} for key in locators]}
        self.ledger.record_job(job, {"output_kind": "video"}, {}, {"duration": 2})
        self.ledger.start_job(pid, worker_id, now + 1)
        if status in {"done", "error", "canceled"}:
            self.ledger.finish_job(pid, status, now + 61, worker_id)
        job["status"] = status
        controller_app.JOBS[pid] = job
        if captured:
            graph = json.loads((ROOT / "graphs/minimax_h3_ref_2pass.api.json").read_text())
            spec = controller_app.make_spec(capability, {"output_kind": "video"}, graph, {"duration": 2})
            self.assertEqual(spec["expected"], {"kind": "video", "duration": 2})
            with self.store.lock, self.store.db:
                worker = dict(self.store.db.execute("SELECT * FROM workers WHERE id=?", (worker_id,)).fetchone())
                self.store.capacity.enqueue(pid, {"capability": capability, "capacity_spec": spec}, now)
                self.store.capacity.assigned(pid, worker, "test-lease", now + 0.5)
                self.store.capacity.running(pid, worker_id, "test-lease", now + 1)
                if status in {"done", "error", "canceled"}:
                    self.store.capacity.terminal(
                        pid, worker_id, "test-lease", status, now + 61, released=True,
                        outputs=[{"key": key, "kind": "video", "valid": False} for key in locators])
        return locators

    def capacity_original_rows(self):
        with self.store.lock:
            return {table: [tuple(row) for row in self.store.db.execute(f"SELECT * FROM {table} ORDER BY rowid")]
                    for table in ("capacity_tasks", "capacity_attempts", "capacity_artifacts",
                                  "dispatch_jobs", "cost_events")}

    async def post_capacity_probe(self, pid="probe-final", offset=0):
        return await self.client.post(f"/api/capacity/jobs/{pid}/probe-outputs", json={"offset": offset})

    @staticmethod
    def probe_metadata():
        return {"kind": "video", "valid": True, "width": 1280, "height": 720,
                "duration": 2, "fps": 24, "bytes": 15}

    async def test_h3_fusion_acquire_requires_model_inventory_from_heartbeat(self):
        graph = json.loads((ROOT / "graphs/minimax_h3_fusion_v2.api.json").read_text(encoding="utf-8"))
        choices = {}
        for node in graph.values():
            for name, value in node.get("inputs", {}).items():
                if name in {"unet_name", "clip_name", "vae_name", "lora_name"}:
                    choices.setdefault(node["class_type"], {}).setdefault(name, []).append(value)
        caps = {
            "node_classes": sorted({node["class_type"] for node in graph.values()}),
            "input_types": {node["class_type"]: {"model": "MODEL"} for node in graph.values()
                            if isinstance(node.get("inputs", {}).get("model"), list)},
        }
        credentials = self.store.register_worker("model-inventory-worker", caps)
        headers = {"X-Worker-ID": credentials["worker_id"],
                   "Authorization": f"Bearer {credentials['worker_token']}"}
        self.register_job("fusion-model-check")
        self.store.enqueue("fusion-model-check", {"capability": "minimax_h3_fusion_v2", "graph": graph}, caps["node_classes"])
        for inventory in (None, {}, choices):
            with self.subTest(inventory_reported=inventory is not None):
                body = {"comfy_online": True, "capabilities": dict(caps)}
                if inventory is not None:
                    body["capabilities"]["input_choices"] = inventory
                heartbeat = await self.client.post("/agent/v1/heartbeat", headers=headers, json=body)
                self.assertEqual(heartbeat.status, 200, await heartbeat.text())
                response = await self.client.post("/agent/v1/jobs/acquire", headers=headers, json={})
                self.assertEqual(response.status, 200 if inventory else 204, await response.text())
                if inventory:
                    self.assertEqual((await response.json())["job_id"], "fusion-model-check")
                else:
                    self.assertEqual(self.store.dispatch_status("fusion-model-check"), "queued")

    async def test_capacity_h3_real_upload_completion_displays_actual_sizes_without_qualifying(self):
        credentials = self.store.register_worker("真实媒体回归机器", {
            "devices": [{"name": "测试 48GB GPU", "type": "cuda", "vram_total": 48 * 1024 ** 3}]})
        worker_id = credentials["worker_id"]
        headers = {"X-Worker-ID": worker_id, "Authorization": f"Bearer {credentials['worker_token']}"}
        self.store.heartbeat(worker_id, comfy_online=True)
        pid, capability = "h3-real-complete", "minimax_h3_ref_2pass"
        self.register_job(pid)
        graph = json.loads((ROOT / "graphs/minimax_h3_ref_2pass.api.json").read_text())
        choices = {}
        for node in graph.values():
            for name, value in node.get("inputs", {}).items():
                if name in {"unet_name", "clip_name", "vae_name", "lora_name"}:
                    choices.setdefault(node["class_type"], {}).setdefault(name, []).append(value)
        self.store.heartbeat(worker_id, comfy_online=True, capabilities={
            "devices": [{"name": "测试 48GB GPU", "type": "cuda", "vram_total": 48 * 1024 ** 3}],
            "input_choices": choices,
            "input_types": {node["class_type"]: {"model": "MODEL"} for node in graph.values()
                            if isinstance(node.get("inputs", {}).get("model"), list)},
        })
        spec = controller_app.make_spec(capability, {"output_kind": "video"}, graph, {"duration": 2})
        self.assertEqual(spec["expected"], {"kind": "video", "duration": 2})
        controller_app.JOBS[pid] = {"id": pid, "capability": capability, "status": "queued",
                                    "created": time.time(), "outputs": []}
        self.ledger.record_job(controller_app.JOBS[pid])
        self.store.enqueue(pid, {"capability": capability, "graph": graph, "capacity_spec": spec})
        response = await self.client.post("/agent/v1/jobs/acquire", headers=headers, json={})
        self.assertEqual(response.status, 200, await response.text())
        assignment = await response.json()
        headers["X-Lease-Token"] = assignment["lease_token"]
        self.assertEqual((await self.client.post(f"/agent/v1/jobs/{pid}/start", headers=headers, json={})).status, 200)
        finals = []
        for filename, rotate in (("landscape.mp4", False), ("portrait.mp4", True), ("intermediate.mp4", False)):
            media = capacity_test_video(self.root / filename, rotate=rotate)
            data = aiohttp.FormData()
            data.add_field("file", media, filename=filename, content_type="video/mp4")
            response = await self.client.post(f"/agent/v1/jobs/{pid}/artifact", headers=headers, data=data)
            self.assertEqual(response.status, 201, await response.text())
            output = await response.json()
            if filename != "intermediate.mp4":
                # 客户端尺寸不能覆盖服务端真实探测，重复最终引用也不能多计产量。
                finals.append(dict(output, width=1, height=1, duration=999))
        response = await self.client.post(f"/agent/v1/jobs/{pid}/complete", headers=headers,
                                          json={"outputs": finals + finals[:1], "capacity_released": True})
        self.assertEqual(response.status, 200, await response.text())
        original = self.capacity_original_rows()
        with mock.patch.object(controller_app, "probe_capacity_output", side_effect=AssertionError("GET 不得探测")):
            report = await (await self.client.get("/api/capacity?limit=1")).json()
        resolution = report["groups"][0]["output_resolution"]
        self.assertEqual(resolution, {
            "total_samples": 1, "recorded_samples": 1, "complete_samples": 1,
            "total_outputs": 2, "recorded_outputs": 2,
            "variants": [{"kind": "video", "width": 720, "height": 1280, "outputs": 1, "samples": 1},
                         {"kind": "video", "width": 1280, "height": 720, "outputs": 1, "samples": 1}]})
        self.assertEqual(report["details"][0]["output_resolution"], resolution)
        self.assertIsNone(report["details"][0]["output_count"])
        self.assertIsNone(report["groups"][0]["output_count"])
        self.assertFalse(report["groups"][0]["eligible"])
        self.assertIsNone(report["overview"]["output_videos"])
        self.assertEqual(self.capacity_original_rows(), original)
        self.assertTrue(all(output.get("dimension_source") == "decoded_frame"
                            for output in report["details"][0]["outputs"]))

        # 模拟旧探测器已将旋转视频的编码尺寸作为有效终态证据保存；不是缺尺寸的场景。
        portrait_locator = self.access.reference(finals[1]["url"])[1]
        portrait_key = controller_app.capacity_output_key(portrait_locator)
        with self.store.lock, self.store.db:
            row = self.store.db.execute("SELECT outputs_json FROM capacity_tasks WHERE job_id=?", (pid,)).fetchone()
            legacy_outputs = json.loads(row["outputs_json"])
            portrait = next(output for output in legacy_outputs if output["key"] == portrait_key)
            self.assertTrue(portrait["valid"])
            self.assertEqual((portrait["width"], portrait["height"]), (720, 1280))
            portrait.update(width=1280, height=720)
            portrait.pop("dimension_source")
            self.store.db.execute("UPDATE capacity_tasks SET outputs_json=? WHERE job_id=?",
                                  (json.dumps(legacy_outputs), pid))
        controller_app.JOBS.clear()
        before = await (await self.client.get("/api/capacity")).json()
        self.assertEqual(before["groups"][0]["output_resolution"]["variants"], [
            {"kind": "video", "width": 1280, "height": 720, "outputs": 2, "samples": 1}])
        original = self.capacity_original_rows()
        report_end = time.time()
        costs = self.ledger.report(0, report_end)
        with mock.patch.object(controller_app, "probe_capacity_output", wraps=controller_app.probe_capacity_output) as probe:
            response = await self.post_capacity_probe(pid, offset=1)
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {"processed": 1, "recorded": 1, "total": 2, "next_offset": None})
        probe.assert_called_once_with(self.access.local_path("artifact", portrait_locator))
        with mock.patch.object(controller_app, "probe_capacity_output", side_effect=AssertionError("GET 不得探测")):
            after = await (await self.client.get("/api/capacity")).json()
        self.assertEqual(after["groups"][0]["output_resolution"], resolution)
        self.assertEqual(after["details"][0]["output_resolution"], resolution)
        recovered = next(output for output in after["details"][0]["recovered_outputs"]
                         if output["key"] == portrait_key)
        self.assertTrue(recovered["valid"])
        self.assertEqual(recovered["dimension_source"], "decoded_frame")
        self.assertEqual((recovered["width"], recovered["height"]), (720, 1280))
        # 只纠正展示层：同 key 原始有效编码尺寸、原技术指标、采购资格及费用全部不变。
        self.assertEqual(after["details"][0]["outputs"], legacy_outputs)
        raw_portrait = next(output for output in after["details"][0]["outputs"]
                            if output["key"] == portrait_key)
        self.assertTrue(raw_portrait["valid"])
        self.assertEqual((raw_portrait["width"], raw_portrait["height"]), (1280, 720))
        self.assertNotIn("dimension_source", raw_portrait)
        self.assertEqual(after["overview"], before["overview"])
        self.assertEqual({key: value for key, value in after["groups"][0].items() if key != "output_resolution"},
                         {key: value for key, value in before["groups"][0].items() if key != "output_resolution"})
        display_fields = {"output_resolution", "recovered_outputs"}
        self.assertEqual({key: value for key, value in after["details"][0].items() if key not in display_fields},
                         {key: value for key, value in before["details"][0].items() if key not in display_fields})
        self.assertEqual(self.capacity_original_rows(), original)
        self.assertEqual(self.ledger.report(0, report_end), costs)

    async def test_capacity_probe_original_hash_survives_jobs_cleanup_and_ignores_nonfinal_files(self):
        keys = self.seed_capacity_probe()
        path = self.access.local_path("artifact", keys[0])
        path.unlink()
        capacity_test_video(path)
        # 同目录中同时存在已登记中间产物、未登记产物和输入资源，都不能被猜成最终产物。
        extra = path.with_name("intermediate.mp4")
        extra.write_bytes(path.read_bytes())
        self.access.register("p", "artifact", f"probe-final/{extra.name}")
        path.with_name("unregistered.mp4").write_bytes(path.read_bytes())
        upload = self.root / "data" / "uploads" / "input.mp4"
        upload.parent.mkdir(parents=True, exist_ok=True)
        upload.write_bytes(path.read_bytes())
        self.register_asset(upload.name)
        controller_app.JOBS.clear()
        report_end = time.time()
        original, costs = self.capacity_original_rows(), self.ledger.report(0, report_end)
        before = await (await self.client.get("/api/capacity")).json()
        with mock.patch.object(controller_app, "probe_capacity_output", wraps=controller_app.probe_capacity_output) as probe:
            response = await self.post_capacity_probe()
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {"processed": 1, "recorded": 1, "total": 1, "next_offset": None})
        self.assertEqual([call.args[0] for call in probe.call_args_list], [path])
        recovered = self.store.capacity.output_recovery("probe-final")
        expected_hash = hashlib.sha256(json.dumps(keys[0], ensure_ascii=False, sort_keys=True,
                                                   separators=(",", ":")).encode()).hexdigest()
        self.assertEqual(recovered[0]["key"], expected_hash)
        self.assertNotEqual(expected_hash, hashlib.sha256(keys[0].encode()).hexdigest())
        after = await (await self.client.get("/api/capacity")).json()
        self.assertEqual(after["groups"][0]["output_resolution"]["variants"], [
            {"kind": "video", "width": 1280, "height": 720, "outputs": 1, "samples": 1}])
        self.assertEqual(after["overview"], before["overview"])
        for field in ("id", "eligible", "output_count", "mean_seconds", "source", "spec"):
            self.assertEqual(after["groups"][0][field], before["groups"][0][field])
        self.assertEqual(self.capacity_original_rows(), original)
        self.assertEqual(self.ledger.report(0, report_end), costs)
        self.assertNotIn(str(path), json.dumps(after))

    async def test_capacity_probe_final_hash_wins_over_retained_jobs_outputs(self):
        keys = self.seed_capacity_probe()
        extra = "probe-final/intermediate.mp4"
        self.access.local_path("artifact", keys[0]).with_name("intermediate.mp4").write_bytes(b"other-video")
        self.access.register("p", "artifact", extra)
        controller_app.JOBS["probe-final"]["outputs"] = [{"url": "/api/artifact/" + extra}]
        with mock.patch.object(controller_app, "probe_capacity_output", return_value=self.probe_metadata()) as probe:
            response = await self.post_capacity_probe()
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(probe.call_args.args[0], self.access.local_path("artifact", keys[0]))
        self.assertEqual([o["key"] for o in self.store.capacity.output_recovery("probe-final")],
                         [controller_app.capacity_output_key(keys[0])])

    async def test_capacity_probe_historical_retained_manifest_recovers_without_changing_estimate(self):
        self.seed_capacity_probe(captured=False)
        before = await (await self.client.get("/api/capacity")).json()
        group = before["groups"][0]
        payload = {"worker_id": group["worker_id"], "mode": "historical", "quality": "technical",
                   "hours": 8, "availability": 1, "utilization": 0.75,
                   "demands": [{"group_id": group["id"], "quantity": 100}]}
        estimate = self.store.capacity.estimate(payload)
        original = self.capacity_original_rows()
        with mock.patch.object(controller_app, "probe_capacity_output", return_value=self.probe_metadata()):
            response = await self.post_capacity_probe()
        self.assertEqual(response.status, 200, await response.text())
        report = await (await self.client.get("/api/capacity")).json()
        self.assertEqual(report["groups"][0]["output_resolution"]["recorded_outputs"], 1)
        self.assertEqual(report["groups"][0]["source"], "historical")
        self.assertFalse(report["groups"][0]["eligible"])
        self.assertEqual(self.capacity_original_rows(), original)
        self.assertEqual(self.store.capacity.estimate(payload), estimate)

    async def test_capacity_probe_missing_or_mismatched_retained_manifest_never_guesses(self):
        for index, change in enumerate(("missing", "empty", "capability", "running", "input", "other-job")):
            pid = f"no-manifest-{index}"
            self.seed_capacity_probe(pid, captured=False)
            job = controller_app.JOBS[pid]
            if change == "missing":
                del controller_app.JOBS[pid]
            elif change == "empty":
                job["outputs"] = []
            elif change == "capability":
                job["capability"] = "other"
            elif change == "running":
                job["status"] = "running"
            else:
                job["outputs"] = [{"url": "/api/upload/input.mp4" if change == "input"
                                   else "/api/artifact/other-job/final.mp4"}]
            with self.subTest(change=change), mock.patch.object(controller_app, "probe_capacity_output") as probe:
                response = await self.post_capacity_probe(pid)
                self.assertEqual(response.status, 409, await response.text())
                probe.assert_not_called()
                self.assertIsNone(self.store.capacity.output_recovery(pid))

    async def test_capacity_probe_historical_malformed_or_external_references_return_conflict(self):
        self.seed_capacity_probe(captured=False)
        for url in ("https://example.invalid/output.mp4", "/api/artifact/probe-final/../other.mp4",
                    "/api/artifact/probe-final/final-0.mp4?path=/private/tmp/other", "file:///private/tmp/other"):
            controller_app.JOBS["probe-final"]["outputs"] = [{"url": url}]
            with self.subTest(url=url), mock.patch.object(controller_app, "probe_capacity_output") as probe:
                response = await self.post_capacity_probe()
                self.assertEqual(response.status, 409, await response.text())
                probe.assert_not_called()
                self.assertIsNone(self.store.capacity.output_recovery("probe-final"))

    async def test_capacity_probe_admin_revoked_during_probe_cannot_persist_recovery(self):
        self.auth.create_user("remaining-admin", auth_support.PASSWORD, role="admin")
        for index, change in enumerate(({"role": "user"}, {"enabled": False})):
            pid = f"admin-revoked-{index}"
            self.seed_capacity_probe(pid)
            original = self.capacity_original_rows()

            def revoke_admin(path):
                self.auth.set_user(self.admin["id"], **change)
                return self.probe_metadata()

            with self.subTest(change=change), mock.patch.object(controller_app, "probe_capacity_output", side_effect=revoke_admin):
                try:
                    response = await self.post_capacity_probe(pid)
                    self.assertEqual(response.status, 403, await response.text())
                    self.assertIsNone(self.store.capacity.output_recovery(pid))
                    self.assertEqual(self.capacity_original_rows(), original)
                finally:
                    self.auth.set_user(self.admin["id"], role="admin", enabled=True)
                    self.headers = await self.login()
                    self.client.session.headers.update(self.headers)

    async def test_capacity_probe_final_manifest_changed_during_probe_is_not_committed(self):
        for index, captured in enumerate((True, False)):
            pid = f"manifest-changed-{index}"
            self.seed_capacity_probe(pid, captured=captured)

            def change_manifest(path):
                if captured:
                    with self.store.lock, self.store.db:
                        self.store.db.execute("UPDATE capacity_tasks SET outputs_json='[]' WHERE job_id=?", (pid,))
                else:
                    controller_app.JOBS[pid]["outputs"] = []
                return self.probe_metadata()

            with self.subTest(captured=captured), mock.patch.object(controller_app, "probe_capacity_output", side_effect=change_manifest):
                response = await self.post_capacity_probe(pid)
                self.assertEqual(response.status, 409, await response.text())
                self.assertIsNone(self.store.capacity.output_recovery(pid))

    async def test_capacity_probe_captured_missing_list_requires_matching_done_jobs(self):
        self.seed_capacity_probe()
        with self.store.lock, self.store.db:
            self.store.db.execute("UPDATE capacity_tasks SET outputs_json=NULL WHERE job_id='probe-final'")
        controller_app.JOBS["probe-final"]["capability"] = "other"
        with mock.patch.object(controller_app, "probe_capacity_output", return_value=self.probe_metadata()) as probe:
            response = await self.post_capacity_probe()
            self.assertEqual(response.status, 409, await response.text())
            probe.assert_not_called()
            controller_app.JOBS["probe-final"]["capability"] = "minimax_h3_ref_2pass"
            response = await self.post_capacity_probe()
            self.assertEqual(response.status, 200, await response.text())
            self.assertEqual(probe.call_count, 1)

    async def test_capacity_probe_paginates_four_serial_outputs_preserves_results_and_is_idempotent(self):
        keys = self.seed_capacity_probe(count=6)
        original = self.capacity_original_rows()
        loop_thread = threading.get_ident()
        active, maximum = 0, 0

        def probe_file(path):
            nonlocal active, maximum
            self.assertNotEqual(threading.get_ident(), loop_thread, "探测必须在线程执行")
            active += 1
            maximum = max(maximum, active)
            try:
                return self.probe_metadata()
            finally:
                active -= 1

        with mock.patch.object(controller_app, "probe_capacity_output", side_effect=probe_file) as probe:
            response = await self.post_capacity_probe()
            self.assertEqual(response.status, 200, await response.text())
            self.assertEqual(await response.json(), {"processed": 4, "recorded": 4, "total": 6, "next_offset": 4})
            self.assertEqual(probe.call_count, 4)
            recovered = self.store.capacity.output_recovery("probe-final")
            self.assertEqual(len(recovered), 6)
            self.assertEqual([o["valid"] for o in recovered], [True] * 4 + [False] * 2)
            response = await self.post_capacity_probe(offset=4)
            self.assertEqual(response.status, 200, await response.text())
            self.assertEqual(await response.json(), {"processed": 2, "recorded": 2, "total": 6, "next_offset": None})
            self.assertEqual(probe.call_count, 6)
            complete = self.store.capacity.output_recovery("probe-final")
            self.assertEqual(complete[:4], recovered[:4])
            self.assertTrue(all(o["valid"] for o in complete))
            for offset in (0, 4):
                response = await self.post_capacity_probe(offset=offset)
                self.assertEqual(response.status, 200, await response.text())
                self.assertEqual(self.store.capacity.output_recovery("probe-final"), complete)
            self.assertEqual(maximum, 1)
            self.assertEqual([c.args[0].name for c in probe.call_args_list[:6]], [Path(k).name for k in keys])
        self.assertEqual(self.capacity_original_rows(), original)
        with mock.patch.object(controller_app, "probe_capacity_output", side_effect=AssertionError("GET 不得探测")):
            report = await (await self.client.get("/api/capacity?limit=1&offset=100")).json()
        self.assertEqual(report["details"], [])
        self.assertEqual(report["groups"][0]["output_resolution"]["recorded_outputs"], 6)

    async def test_capacity_probe_requires_admin_and_csrf(self):
        self.seed_capacity_probe()
        url = "/api/capacity/jobs/probe-final/probe-outputs"
        with mock.patch.object(controller_app, "probe_capacity_output") as probe:
            token = self.client.session.headers.pop("X-CSRF-Token")
            response = await self.client.post(url, json={"offset": 0})
            self.assertEqual(response.status, 403)
            self.client.session.headers["X-CSRF-Token"] = token
            self.auth.create_user("probe-reader", auth_support.PASSWORD)
            headers = await self.login("probe-reader")
            self.client.session.headers.update(headers)
            self.assertEqual((await self.client.post(url, json={"offset": 0})).status, 403)
            self.client.session.cookie_jar.clear()
            self.assertEqual((await self.client.post(url, json={"offset": 0})).status, 401)
            probe.assert_not_called()
        self.assertIsNone(self.store.capacity.output_recovery("probe-final"))

    async def test_capacity_probe_rejects_untrusted_parameters_and_out_of_range_offsets(self):
        self.seed_capacity_probe()
        url = "/api/capacity/jobs/probe-final/probe-outputs"
        bodies = [{"offset": value} for value in (-1, 512, True, False, 0.5, "0", None, [], {})]
        bodies += [{"offset": 0, key: "/private/tmp/arbitrary"} for key in
                   ("path", "url", "outputs", "filename", "locator", "limit", "anything")]
        bodies += [[], "bad", {"offset": 1}, {"offset": 511}]
        with mock.patch.object(controller_app, "probe_capacity_output") as probe:
            for body in bodies:
                with self.subTest(body=body):
                    response = await self.client.post(url, json=body)
                    self.assertEqual(response.status, 400, await response.text())
            response = await self.client.post(url, data="{", headers={"Content-Type": "application/json"})
            self.assertEqual(response.status, 400)
            response = await self.client.post(url, data="x" * 65537, headers={"Content-Type": "application/json"})
            self.assertEqual(response.status, 413)
            response = await self.client.post("/api/capacity/jobs/bad%2Fpid/probe-outputs", json={})
            self.assertEqual(response.status, 400, await response.text())
            probe.assert_not_called()
        self.assertIsNone(self.store.capacity.output_recovery("probe-final"))

    async def test_capacity_probe_rejects_non_done_tasks_and_api_events(self):
        with mock.patch.object(controller_app, "probe_capacity_output") as probe:
            self.assertEqual((await self.post_capacity_probe("missing-job")).status, 409)
            for status in ("running", "error", "canceled"):
                for captured in (True, False):
                    pid = f"reject-{status}-{captured}"
                    self.seed_capacity_probe(pid, captured=captured, status=status)
                    with self.subTest(status=status, captured=captured):
                        response = await self.post_capacity_probe(pid)
                        self.assertEqual(response.status, 409, await response.text())
            self.ledger.record_api("rewrite", "test-model", 1, 1, 100)
            pid = self.ledger.db.execute("SELECT job_id FROM cost_events WHERE event_kind='api'").fetchone()[0]
            response = await self.post_capacity_probe(pid)
            self.assertEqual(response.status, 409, await response.text())
            probe.assert_not_called()
        self.assertEqual(self.store.db.execute("SELECT count(*) FROM capacity_output_recovery").fetchone()[0], 0)

    async def test_capacity_probe_missing_pending_revoked_and_escaping_files_remain_invalid(self):
        for index, failure in enumerate(("missing", "pending", "revoked", "symlink")):
            pid = f"unavailable-{index}"
            keys = self.seed_capacity_probe(pid)
            path = self.access.local_path("artifact", keys[0])
            if failure == "missing":
                path.unlink()
            elif failure == "pending":
                with self.auth.lock, self.auth.db:
                    self.auth.db.execute("UPDATE resources SET state='pending' WHERE locator=?", (keys[0],))
            elif failure == "revoked":
                with self.auth.lock, self.auth.db:
                    self.auth.db.execute("DELETE FROM project_resources WHERE resource_id IN "
                                         "(SELECT resource_id FROM resources WHERE locator=?)", (keys[0],))
            else:
                outside = self.root / "outside.mp4"
                outside.write_bytes(b"outside-resource")
                path.unlink()
                path.symlink_to(outside)
            with self.subTest(failure=failure), mock.patch.object(controller_app, "probe_capacity_output") as probe:
                response = await self.post_capacity_probe(pid)
                self.assertEqual(response.status, 200, await response.text())
                self.assertEqual((await response.json())["recorded"], 0)
                probe.assert_not_called()
                recovered = self.store.capacity.output_recovery(pid)
                self.assertEqual(len(recovered), 1)
                self.assertFalse(recovered[0]["valid"])
                self.assertIsNone(recovered[0]["width"])
        report = await (await self.client.get("/api/capacity")).json()
        self.assertTrue(all(g["output_resolution"]["recorded_outputs"] == 0 for g in report["groups"]))

    async def test_capacity_probe_changed_file_or_revoked_permission_during_probe_is_invalid(self):
        for index, change in enumerate(("content", "permission", "removed")):
            pid = f"changed-{index}"
            keys = self.seed_capacity_probe(pid)

            def changed(path):
                if change == "content":
                    path.write_bytes(b"different-content-and-size")
                elif change == "removed":
                    path.unlink()
                else:
                    with self.auth.lock, self.auth.db:
                        self.auth.db.execute("DELETE FROM project_resources WHERE resource_id IN "
                                             "(SELECT resource_id FROM resources WHERE locator=?)", (keys[0],))
                return self.probe_metadata()

            with self.subTest(change=change), mock.patch.object(controller_app, "probe_capacity_output", side_effect=changed):
                response = await self.post_capacity_probe(pid)
                self.assertEqual(response.status, 200, await response.text())
                self.assertEqual((await response.json())["recorded"], 0)
                recovered = self.store.capacity.output_recovery(pid)
                self.assertEqual(len(recovered), 1)
                self.assertFalse(recovered[0]["valid"])
                self.assertIsNone(recovered[0]["width"])

    async def test_capacity_probe_rechecks_previous_files_before_committing_batch(self):
        keys = self.seed_capacity_probe(count=2)
        first_path = self.access.local_path("artifact", keys[0])

        def changed_by_second(path):
            if path.name == "final-1.mp4":
                first_path.write_bytes(b"changed-after-first-probe")
            return self.probe_metadata()

        with mock.patch.object(controller_app, "probe_capacity_output", side_effect=changed_by_second):
            response = await self.post_capacity_probe()
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual((await response.json())["recorded"], 1)
        self.assertEqual([o["valid"] for o in self.store.capacity.output_recovery("probe-final")], [False, True])

    async def test_capacity_probe_real_timeout_is_invalid_and_batch_has_four_eight_second_limits(self):
        self.seed_capacity_probe(count=5)
        timeout = controller_app.subprocess.TimeoutExpired("ffmpeg", 8)
        with mock.patch.object(controller_app, "ffmpeg_bin", return_value=Path("/synthetic/ffmpeg")), \
             mock.patch.object(controller_app.subprocess, "run", side_effect=timeout) as run:
            response = await self.post_capacity_probe()
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {"processed": 4, "recorded": 0, "total": 5, "next_offset": 4})
        self.assertEqual(run.call_count, 4)
        self.assertEqual(sum(call.kwargs["timeout"] for call in run.call_args_list), 32)
        for call in run.call_args_list:
            command = call.args[0]
            self.assertEqual(command[command.index("-protocol_whitelist") + 1], "file,pipe")
            self.assertNotIn("-hwaccel", command)
        self.assertTrue(all(not o["valid"] for o in self.store.capacity.output_recovery("probe-final")))

    async def test_capacity_probe_global_concurrency_rejects_second_job_without_blocking_get(self):
        self.seed_capacity_probe()
        self.seed_capacity_probe("another-job")
        started, release = asyncio.Event(), threading.Event()
        loop = asyncio.get_running_loop()

        def blocked(path):
            loop.call_soon_threadsafe(started.set)
            if not release.wait(5):
                raise AssertionError("测试未释放探测线程")
            return self.probe_metadata()

        with mock.patch.object(controller_app, "probe_capacity_output", side_effect=blocked):
            first = asyncio.create_task(self.post_capacity_probe())
            try:
                await asyncio.wait_for(started.wait(), 2)
                second = await asyncio.wait_for(self.post_capacity_probe("another-job"), 2)
                self.assertEqual(second.status, 429, await second.text())
                response = await asyncio.wait_for(self.client.get("/api/capacity"), 2)
                self.assertEqual(response.status, 200)
                self.assertFalse(first.done())
            finally:
                release.set()
                response = await asyncio.wait_for(first, 2)
            self.assertEqual(response.status, 200, await response.text())
        self.assertIsNone(self.client.server.app["capacity_probe_state"]["task"])
        with mock.patch.object(controller_app, "probe_capacity_output", return_value=self.probe_metadata()):
            self.assertEqual((await self.post_capacity_probe("another-job")).status, 200)

    async def test_capacity_probe_cancelled_request_keeps_slot_until_background_work_finishes(self):
        self.seed_capacity_probe()
        started, release = asyncio.Event(), threading.Event()
        loop = asyncio.get_running_loop()
        handler_tasks = []
        original_body = controller_app.capacity_body

        async def track_request(request):
            handler_tasks.append(asyncio.current_task())
            return await original_body(request)

        def blocked(path):
            loop.call_soon_threadsafe(started.set)
            if not release.wait(5):
                raise AssertionError("测试未释放取消后的探测线程")
            return self.probe_metadata()

        with mock.patch.object(controller_app, "capacity_body", side_effect=track_request), \
             mock.patch.object(controller_app, "probe_capacity_output", side_effect=blocked):
            request_task = asyncio.create_task(self.post_capacity_probe())
            background = None
            try:
                await asyncio.wait_for(started.wait(), 2)
                background = self.client.server.app["capacity_probe_state"]["task"]
                handler_tasks[0].cancel()
                await asyncio.gather(handler_tasks[0], return_exceptions=True)
                self.assertFalse(background.done())
                self.assertIs(self.client.server.app["capacity_probe_state"]["task"], background)
                response = await asyncio.wait_for(self.post_capacity_probe(), 2)
                self.assertEqual(response.status, 429, await response.text())
                self.assertEqual((await asyncio.wait_for(self.client.get("/api/capacity"), 2)).status, 200)
            finally:
                release.set()
                if background is not None:
                    await asyncio.wait_for(asyncio.shield(background), 2)
                await asyncio.gather(request_task, return_exceptions=True)
        self.assertIsNone(self.client.server.app["capacity_probe_state"]["task"])
        self.assertTrue(self.store.capacity.output_recovery("probe-final")[0]["valid"])

    async def test_reload_exposes_one_text_to_image_mode(self):
        response = await self.client.post("/api/reload", headers=self.headers)
        self.assertEqual(response.status, 200)
        payload = await (await self.client.get("/api/cards")).json()
        card = next(item for item in payload["cards"] if item["id"] == "card_image")
        text_modes = [item for item in card["modes"] if item["name"] == "文生图"]
        self.assertEqual(len(text_modes), 1)
        self.assertEqual(text_modes[0]["modelSwitch"]["krea2"], "krea2_t2i")

    async def test_high_quality_stable_mode_maps_both_nodes_in_dry_run(self):
        controller_app.load_caps()
        cap = controller_app.CAPS["minimax_h3_ref_2pass"]
        template = json.loads((ROOT / cap["graph"]).read_text(encoding="utf-8"))
        cases = [({}, 1, 0.12), ({"stable_mode": "off"}, 1, 0.12),
                 ({"stable_mode": "on"}, 0, 0)]
        for selected, strength, te in cases:
            with self.subTest(params=selected):
                response = await self.client.post("/api/generate", headers=self.headers, json={
                    "project": "p", "capability": cap["id"], "dry_run": True,
                    "params": {"seed": 42, "lora_acceleration": "off",
                               "strength_model": 0.5, "processing_control_value": 0.085, **selected},
                })
                self.assertEqual(response.status, 200, await response.text())
                payload = await response.json()
                for node, field, expected in (("230", "strength_model", strength),
                                               ("232", "processing_control_value", te)):
                    actual = payload["changed"].get(f"#{node}.{field}",
                        [None, template[node]["inputs"][field]])[1]
                    self.assertEqual(actual, expected)
        response = await self.client.post("/api/generate", headers=self.headers, json={
            "project": "p", "capability": cap["id"], "dry_run": True,
            "params": {"stable_mode": "invalid"},
        })
        self.assertEqual(response.status, 400)
        self.assertEqual(controller_app.JOBS, {})

    async def test_reload_exposes_high_quality_stable_mode_and_hides_raw_controls(self):
        response = await self.client.post("/api/reload", headers=self.headers)
        self.assertEqual(response.status, 200)
        payload = await (await self.client.get("/api/cards")).json()
        high_quality = payload["capabilities"]["minimax_h3_ref_2pass"]
        switch = next(item for item in high_quality["inputs"] if item["key"] == "stable_mode")
        self.assertEqual(switch["default"], "off")
        self.assertEqual(switch["appearance"], "switch")
        self.assertFalse(switch.get("mirror"))
        self.assertTrue(switch["showHint"])
        self.assertEqual(switch["presets"], {
            "on": {"strength_model": 0, "processing_control_value": 0},
            "off": {"strength_model": 1, "processing_control_value": 0.12},
        })
        for key in ("strength_model", "processing_control_value"):
            self.assertTrue(next(item for item in high_quality["inputs"] if item["key"] == key)["mirror"])
        self.assertFalse(any(item["key"] == "lora_acceleration" for item in high_quality["inputs"]))

    async def test_controller_dashboard_and_health_metadata(self):
        response = await self.client.get("/controller")
        self.assertEqual(response.status, 200)
        dashboard = await response.text()
        self.assertIn("<title>运行面板 · Chouka</title>", dashboard)
        self.assertIn('id="worker-rows"', dashboard)
        self.assertIn("GPU 利用率", dashboard)
        self.assertIn("一键更新全部节点", dashboard)
        self.assertIn('src="/admin-shell.js"', dashboard)
        self.assertIn('src="/controller-page.js"', dashboard)
        shell = (ROOT / 'web/admin-shell.js').read_text(encoding='utf-8')
        self.assertIn("H3Auth.mountAccount", shell)
        navigation = (ROOT / 'web/auth.js').read_text(encoding='utf-8')
        self.assertIn("add('costs', '费用评估', '/controller/costs')", navigation)

        response = await self.client.get("/controller/costs")
        self.assertEqual(response.status, 200)
        costs_page = await response.text()
        self.assertIn("<title>费用统计 · Chouka</title>", costs_page)
        self.assertIn("建议收费区间", costs_page)
        self.assertIn("内部总成本", costs_page)
        self.assertIn('src="/costs-page.js"', costs_page)
        costs_script = (ROOT / 'web/costs-page.js').read_text(encoding='utf-8')
        self.assertIn("limit:'2000'", costs_script)

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
                "supports_code_restart": True,
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

    async def test_primary_node_is_excluded_from_sync_and_maintenance_status(self):
        capabilities = {
            "node_classes": ["KSampler"], "supports_file_sync": True,
            "supports_code_restart": True,
        }
        credentials = self.store.register_worker("gpu-primary", capabilities)
        worker_id = credentials["worker_id"]
        self.store.heartbeat(worker_id, comfy_online=True, busy=False)
        update = self.store.request_sync_all()
        self.store.heartbeat(
            worker_id, comfy_online=True, busy=False,
            maintenance={
                "request_id": update["request_id"], "status": "error",
                "message": "旧同步失败",
            },
        )
        self.assertTrue((await (await self.client.get("/api/health")).json())["maintenance_active"])

        self.store.heartbeat(
            worker_id, capabilities={**capabilities, "is_primary_node": True},
            comfy_online=True, busy=False,
        )
        health = await (await self.client.get("/api/health")).json()
        self.assertFalse(health["maintenance_active"])
        self.assertTrue(health["comfy_online"])
        workers = (await (await self.client.get("/api/workers")).json())["workers"]
        self.assertTrue(workers[0]["is_primary_node"])
        self.assertEqual(workers[0]["sync_status"], "idle")
        capacity = await (await self.client.get("/api/capacity")).json()
        machine = next(item for item in capacity["workers"] if item["id"] == worker_id)
        self.assertEqual(machine["state"], "idle")

        response = await self.client.post(
            "/api/admin/workers/sync-all", headers=self.headers, json={}
        )
        self.assertEqual(response.status, 202, await response.text())
        result = await response.json()
        self.assertEqual(result["worker_count"], 0)
        self.assertEqual(result["primary_count"], 1)
        heartbeat = self.store.heartbeat(worker_id, comfy_online=True, busy=False)
        self.assertNotIn("sync_files", {
            command["type"] for command in heartbeat["commands"]
        })

    async def test_admin_can_delete_worker_and_fresh_registration_reappears(self):
        credentials = self.store.register_worker(
            "GPU-A6000-01", {
                "node_classes": ["KSampler"], "supports_code_restart": True,
            },
        )
        self.store.request_sync_all()
        worker_id = credentials["worker_id"]
        url = f"/api/workers/{worker_id}"

        token = self.client.session.headers.pop("X-CSRF-Token")
        self.assertEqual((await self.client.delete(url)).status, 403)
        self.client.session.headers["X-CSRF-Token"] = token

        response = await self.client.delete(url)
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual((await (await self.client.get("/api/workers")).json())["workers"], [])
        health = await (await self.client.get("/api/health")).json()
        self.assertFalse(health["maintenance_active"])
        agent_headers = {
            "X-Worker-ID": worker_id,
            "Authorization": f"Bearer {credentials['worker_token']}",
        }
        self.assertEqual((await self.client.post(
            "/agent/v1/heartbeat", headers=agent_headers,
            json={"comfy_online": True, "busy": False},
        )).status, 401)

        response = await self.client.post("/agent/v1/register", json={
            "name": "GPU-A6000-01",
            "enrollment_token": controller_app.ENROLLMENT_TOKEN,
            "capabilities": {"node_classes": ["KSampler"]},
        })
        self.assertEqual(response.status, 201, await response.text())
        replacement = await response.json()
        self.assertNotEqual(replacement["worker_id"], worker_id)
        workers = (await (await self.client.get("/api/workers")).json())["workers"]
        self.assertEqual([worker["id"] for worker in workers], [replacement["worker_id"]])

    async def test_worker_delete_requires_admin_and_rejects_active_jobs(self):
        credentials = self.store.register_worker(
            "gpu-active", {"node_classes": ["KSampler"]}
        )
        worker_id = credentials["worker_id"]
        self.store.heartbeat(worker_id, comfy_online=True, busy=False)
        self.store.enqueue("active-delete", {"graph": {}}, ["KSampler"])
        self.assertIsNotNone(self.store.acquire(worker_id))

        response = await self.client.delete(f"/api/workers/{worker_id}")
        self.assertEqual(response.status, 409, await response.text())
        self.auth.create_user("delete-viewer", auth_support.PASSWORD)
        headers = await self.login("delete-viewer")
        response = await self.client.delete(
            f"/api/workers/{worker_id}", headers=headers
        )
        self.assertEqual(response.status, 403)
        self.assertEqual(self.store.list_workers()[0]["id"], worker_id)

    async def test_regular_users_see_maintenance_while_any_worker_sync_is_incomplete(self):
        syncing = self.store.register_worker(
            "gpu-syncing", {
                "node_classes": ["KSampler"], "supports_file_sync": True,
                "supports_code_restart": True,
            },
        )
        self.store.heartbeat(syncing["worker_id"], comfy_online=True, busy=False)
        update = self.store.request_sync_all()
        self.auth.create_user("viewer", auth_support.PASSWORD)
        await self.login("viewer")

        response = await self.client.get("/api/health")
        health = await response.json()
        self.assertEqual(response.status, 200)
        self.assertTrue(health["maintenance_active"])
        self.assertFalse(health["comfy_online"])
        self.assertNotIn("workers", health)

        self.store.heartbeat(
            syncing["worker_id"], comfy_online=False, busy=False,
            maintenance={
                "request_id": update["request_id"], "status": "running",
                "message": "正在更新",
            },
        )
        health = await (await self.client.get("/api/health")).json()
        self.assertTrue(health["maintenance_active"])

        self.store.heartbeat(
            syncing["worker_id"], comfy_online=False, busy=False,
            maintenance={
                "request_id": update["request_id"], "status": "error",
                "message": "重启失败",
            },
        )
        health = await (await self.client.get("/api/health")).json()
        self.assertTrue(health["maintenance_active"])

        ready = self.store.register_worker("gpu-ready", {"node_classes": ["KSampler"]})
        self.store.heartbeat(ready["worker_id"], comfy_online=True, busy=False)
        health = await (await self.client.get("/api/health")).json()
        self.assertTrue(health["maintenance_active"])
        self.assertTrue(health["comfy_online"])

        self.store.heartbeat(
            syncing["worker_id"], comfy_online=True, busy=False,
            maintenance={
                "request_id": update["request_id"], "status": "done",
                "message": "更新完成",
            },
        )
        health = await (await self.client.get("/api/health")).json()
        self.assertFalse(health["maintenance_active"])
        self.assertTrue(health["comfy_online"])

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
    async def test_high_quality_h3_up_to_five_seconds_allows_4090(self, _patch_graph):
        capability = {"name": "H3全能参考(高质量)", "outputType": "video", "_graph_ok": True}
        with mock.patch.dict(controller_app.CAPS, {"minimax_h3_ref_2pass": capability}):
            response = await self.client.post("/api/generate", json={
                "capability": "minimax_h3_ref_2pass", "params": {}, "assets": {},
                "project": "p",
            }, headers=self.headers)
        self.assertEqual(response.status, 200)
        job = await response.json()
        gib = 1024 ** 3
        for gpu, vram, status in (("RTX 4090", 24 * gib, 200), ("RTX A6000", 48 * gib, 204)):
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
                self.assertEqual(assignment["payload"]["duration_seconds"], 5)
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
                ("RTX 4090", 24 * gib, 200), (None, 0, 400), ("RTX A6000", 48 * gib, 200),
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
            app = {"local_output_tasks": {}}
            await controller_app.handle_event(None, {
                "type": "execution_success", "data": {"prompt_id": "acl-cancel"},
            }, app=app)
            await asyncio.gather(*app["local_output_tasks"].values())
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


class LocalOutputCompletionTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.pid = "2233618a-0676-49f4-bf0f-c3498f09abe0"
        self.job = {"id": self.pid, "status": "running", "progress": 0.8,
                    "outputs": [], "created": 1}
        self.app = {"local_output_tasks": {}, "lifecycle": {"shutting_down": False}}
        self.session = mock.MagicMock()
        self.response = self.session.get.return_value.__aenter__.return_value
        self.response.raise_for_status = mock.Mock()
        self.output = {"filename": "result.png", "type": "output"}
        self.history = {self.pid: {"status": {"completed": True},
                                   "outputs": {"1": {"images": [self.output]}}}}
        self.response.json = mock.AsyncMock(return_value=self.history)
        self.save = self.enterContext(mock.patch.object(controller_app, "save_jobs"))
        self.enterContext(mock.patch.object(controller_app, "JOBS", {self.pid: self.job}))
        self.enterContext(mock.patch.object(controller_app, "STEPS", {self.pid: {"1": "采样"}}))
        self.enterContext(mock.patch.object(controller_app, "WEIGHTS", {self.pid: {"1": 1}}))
        self.enterContext(mock.patch.object(controller_app, "CONTROLLER_MODE", False))
        self.enterContext(mock.patch.object(controller_app, "LOCAL_OUTPUT_BACKOFF", 0))
        self.enterContext(mock.patch.object(controller_app, "LOCAL_OUTPUT_ATTEMPTS", 3))
        self.enterContext(mock.patch.object(controller_app, "LOCAL_OUTPUT_TIMEOUT", 0.03))
        self.store = self.enterContext(mock.patch.object(
            controller_app, "call_store", new=mock.AsyncMock(side_effect=self.active_project)))
        self.register = self.enterContext(mock.patch.object(
            controller_app, "resource_call", new_callable=mock.AsyncMock))

    async def asyncTearDown(self):
        await controller_app.close_presence_connections(self.app)

    async def active_project(self, _app, method, _id):
        return {"project_id": "p"} if method == "get_job" else {"state": "active"}

    async def event(self, kind="execution_success", **data):
        await controller_app.handle_event(self.session, {
            "type": kind, "data": {"prompt_id": self.pid, **data},
        }, app=self.app)

    async def drain(self):
        await asyncio.wait_for(asyncio.gather(*self.app["local_output_tasks"].values()), 2)
        self.assertEqual(self.app["local_output_tasks"], {})

    async def test_success_without_final_executing_retries_delayed_history(self):
        self.response.json.side_effect = [{}, {self.pid: {"status": {"completed": False}}}, self.history]
        await self.event()
        self.assertEqual(self.job["step"], "正在取回产物")
        self.assertTrue(self.job["completion_pending"])
        self.assertEqual(self.response.json.await_count, 0, "WS must not wait for history")
        await self.drain()
        self.assertEqual(self.job["status"], "done")
        self.assertEqual(self.job["progress"], 1)
        self.assertEqual(self.job["outputs"][0]["filename"], "result.png")
        self.assertNotIn("completion_pending", self.job)
        self.assertNotIn(self.pid, controller_app.STEPS)
        self.assertNotIn(self.pid, controller_app.WEIGHTS)
        self.assertEqual(self.response.json.await_count, 3)
        self.register.assert_awaited_once()

    async def test_windows_vhs_subfolder_registers_and_uses_normalized_url(self):
        self.output.update(filename="ltx25_ag_alpha_00003.mp4",
                           subfolder="LTX_2.5\\Alpha_Generation")
        await self.event()
        await self.drain()
        self.assertEqual(self.job["status"], "done")
        output = self.job["outputs"][0]
        self.assertEqual(output["subfolder"], "LTX_2.5/Alpha_Generation")
        self.assertIn("subfolder=LTX_2.5%2FAlpha_Generation", output["url"])
        self.assertNotIn("%5C", output["url"])
        self.assertEqual(json.loads(controller_app.ResourceAccess.normalize("comfy", output))["subfolder"],
                         "LTX_2.5/Alpha_Generation")
        self.assertEqual(self.register.await_args.args[-1], output)
        with self.assertRaises(ValueError):
            controller_app.ResourceAccess.normalize("comfy", {
                **output, "subfolder": "..\\outside".replace("\\", "/")})

    async def test_transient_network_http_and_timeout_errors_retry(self):
        errors = [aiohttp.ClientConnectionError("reset"),
                  aiohttp.ClientResponseError(mock.Mock(real_url="history"), (), status=503),
                  asyncio.TimeoutError()]
        for error in errors:
            with self.subTest(error=type(error).__name__):
                self.job.update(status="running", outputs=[])
                self.response.json.side_effect = [error, self.history]
                await self.event()
                await self.drain()
                self.assertEqual(self.job["status"], "done")

    async def test_missing_history_exhausts_retries_and_late_success_stays_error(self):
        self.response.json.return_value = {}
        await self.event()
        await self.drain()
        self.assertEqual(self.response.json.await_count, 3)
        self.assertEqual(self.job["status"], "error")
        self.assertIn("history 尚未入库", self.job["error"])
        self.assertEqual(self.job["outputs"], [])
        await self.event("executing", node=None)
        await self.event()
        self.assertEqual(self.app["local_output_tasks"], {})
        self.assertEqual(self.response.json.await_count, 3)

    async def test_hung_history_has_per_attempt_timeout_and_finite_budget(self):
        canceled = []

        async def hung():
            try:
                await asyncio.Event().wait()
            finally:
                canceled.append(True)

        self.response.json.side_effect = hung
        await self.event()
        await self.drain()
        self.assertEqual(len(canceled), 3)
        self.assertEqual(self.job["status"], "error")
        self.assertIn("TimeoutError", self.job["error"])
        self.register.assert_not_awaited()

    async def test_completed_empty_is_failure_not_done(self):
        self.response.json.return_value = {self.pid: {"status": {"completed": True}, "outputs": {}}}
        await self.event()
        await self.drain()
        self.assertEqual(self.response.json.await_count, 1)
        self.assertEqual(self.job["status"], "error")
        self.assertIn("没有可用产物", self.job["error"])
        self.register.assert_not_awaited()

    async def test_duplicate_completion_events_share_one_task(self):
        await self.event()
        task = self.app["local_output_tasks"][self.pid]
        await self.event()
        await self.event("executing", node=None)
        await self.event("executing", node="1")
        await self.event("progress_state", nodes={"1": {"state": "running", "max": 8, "value": 7}})
        self.assertIs(self.app["local_output_tasks"][self.pid], task)
        self.assertEqual(self.job["step"], "正在取回产物")
        self.save.assert_called_once()
        await self.drain()
        await self.event()
        self.assertEqual(self.response.json.await_count, 1)
        self.register.assert_awaited_once()


    async def test_inflight_history_cannot_overwrite_terminal_cleanup_or_removed_job(self):
        for change in ("canceled", "error", "done", "cleanup", "removed", "replaced"):
            with self.subTest(change=change):
                controller_app.JOBS[self.pid] = self.job
                self.job.clear()
                self.job.update(status="running", outputs=[])
                entered, release = asyncio.Event(), asyncio.Event()

                async def history():
                    entered.set()
                    await release.wait()
                    return self.history

                self.response.json.side_effect = history
                await self.event()
                await asyncio.wait_for(entered.wait(), 1)
                if change == "cleanup":
                    self.job.update(cleanup_pending=True, step="正在停止并释放显存")
                elif change == "removed":
                    controller_app.JOBS.pop(self.pid)
                elif change == "replaced":
                    controller_app.JOBS[self.pid] = {"status": "running"}
                else:
                    self.job["status"] = change
                snapshot = dict(self.job)
                self.save.reset_mock()
                release.set()
                await self.drain()
                self.assertEqual(self.job, snapshot)
                self.save.assert_not_called()
        self.register.assert_not_awaited()

    async def test_acl_checks_cannot_overwrite_concurrent_terminal_or_cleanup(self):
        for stage in ("lookup", "register"):
            for state in ("canceled", "error", "done", "cleanup", "shutdown"):
                with self.subTest(stage=stage, state=state):
                    self.app["lifecycle"]["shutting_down"] = False
                    self.job.clear()
                    self.job.update(status="running", outputs=[])

                    def change():
                        if state == "cleanup":
                            self.job["cleanup_pending"] = True
                        elif state == "shutdown":
                            self.app["lifecycle"]["shutting_down"] = True
                        else:
                            self.job["status"] = state
                        self.save.reset_mock()

                    async def store(app, method, pid):
                        if stage == "lookup" and method == "get_project":
                            change()
                        return await self.active_project(app, method, pid)

                    async def register(*_args):
                        if stage == "register":
                            change()

                    self.store.side_effect = store
                    self.register.side_effect = register
                    await self.event()
                    await self.drain()
                    self.assertEqual(self.job["outputs"], [])
                    self.assertNotIn("ended", self.job)
                    self.save.assert_not_called()
                    self.assertEqual(self.job["status"], state if state in ("done", "error", "canceled") else "running")

    async def test_deleted_project_before_or_during_registration_is_canceled(self):
        for results, registrations in (([None], 0),
                ([{"project_id": "p"}, {"state": "deleted"}], 0),
                ([{"project_id": "p"}, {"state": "active"}, {"state": "deleted"}], 1)):
            with self.subTest(results=results):
                self.job.update(status="running", outputs=[])
                self.store.side_effect = results
                self.register.reset_mock()
                await self.event()
                await self.drain()
                self.assertEqual(self.job["status"], "canceled")
                self.assertEqual(self.job["outputs"], [])
                self.assertEqual(self.register.await_count, registrations)

    async def test_registration_failure_is_reported_and_task_reclaimed(self):
        self.register.side_effect = PermissionError("resource belongs to another project")
        await self.event()
        await self.drain()
        self.assertEqual(self.job["status"], "error")
        self.assertIn("PermissionError", self.job["error"])
        self.assertEqual(self.job["outputs"], [])

    async def test_shutdown_cancels_collection_without_writing_and_blocks_new_tasks(self):
        entered = asyncio.Event()

        async def hung():
            entered.set()
            await asyncio.Event().wait()

        self.response.json.side_effect = hung
        await self.event()
        task = self.app["local_output_tasks"][self.pid]
        await asyncio.wait_for(entered.wait(), 1)
        snapshot = dict(self.job)
        self.save.reset_mock()
        await controller_app.close_presence_connections(self.app)
        self.assertTrue(task.cancelled())
        self.assertEqual(self.job, snapshot)
        self.save.assert_not_called()
        await self.event()
        self.assertEqual(self.app["local_output_tasks"], {})
        self.register.assert_not_awaited()

    async def test_remote_completion_is_left_to_complete_api(self):
        await controller_app.handle_event(self.session, {
            "type": "execution_success", "data": {"prompt_id": self.pid},
        }, remote=True, app=self.app)
        self.assertEqual(self.job["status"], "running")
        self.assertEqual(self.job["step"], "正在归集产物")
        self.assertEqual(self.app["local_output_tasks"], {})
        self.job["worker_id"] = "worker-1"
        await self.event()
        self.assertEqual(self.app["local_output_tasks"], {})
        self.session.get.assert_not_called()


    async def test_restart_only_recovers_local_completion_waiters(self):
        rows = [
            {"id": self.pid, "status": "running", "step": "正在取回产物"},
            {"id": "marked", "status": "running", "completion_pending": True},
            {"id": "sampling", "status": "running", "step": "采样", "progress": 0.99},
            {"id": "queued", "status": "queued", "completion_pending": True},
            {"id": "cleanup", "status": "running", "step": "正在取回产物", "cleanup_pending": True},
            {"id": "remote", "status": "running", "step": "正在取回产物", "worker_id": "w"},
            {"id": "finished", "status": "done", "completion_pending": True},
        ]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "jobs.json"
            path.write_text(json.dumps(rows), encoding="utf-8")
            with mock.patch.object(controller_app, "JOBS_FILE", path):
                controller_app.JOBS.clear()
                controller_app.load_jobs()
        jobs = controller_app.JOBS
        self.assertEqual({pid for pid, job in jobs.items() if controller_app.local_completion_waiting(job)},
                         {self.pid, "marked"})
        for pid in ("sampling", "queued", "remote"):
            self.assertEqual(jobs[pid]["status"], "canceled")
        self.assertEqual(jobs["finished"]["status"], "done")
        self.assertTrue(jobs["cleanup"]["cleanup_pending"])
        self.assertEqual(jobs["cleanup"]["step"], "显存释放未确认，请重试取消")
        self.app.update(auth_path="unused", local_test=False)
        with mock.patch.object(controller_app, "AuthStore"), \
             mock.patch.object(controller_app, "ResourceAccess"), \
             mock.patch.object(controller_app, "setup_dingtalk"), \
             mock.patch.object(controller_app.aiohttp, "ClientSession", return_value=self.session), \
             mock.patch.object(controller_app, "ws_loop", new_callable=mock.AsyncMock), \
             mock.patch.object(controller_app, "comfy_submit", new_callable=mock.AsyncMock) as submit:
            await controller_app.on_start(self.app)
            self.assertEqual(set(self.app["local_output_tasks"]), {self.pid, "marked"})
            await self.drain()
            await self.app["ws_task"]
            submit.assert_not_awaited()
        self.assertEqual(jobs[self.pid]["status"], "done")
        self.assertEqual(jobs["marked"]["status"], "error", "missing history has a finite recovery budget")

    async def test_controller_restart_never_schedules_local_recovery(self):
        self.job.update(completion_pending=True, step="正在取回产物")
        with mock.patch.object(controller_app, "CONTROLLER_MODE", True):
            self.assertFalse(controller_app.local_completion_waiting(self.job))
            await self.event()
        self.assertEqual(self.app["local_output_tasks"], {})
        self.session.get.assert_not_called()


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
        thumbnails = mock.Mock(close=mock.AsyncMock())
        exports = mock.Mock(close=mock.AsyncMock())
        shutdown = asyncio.create_task(controller_app.on_stop({
            "cleanup_tasks": self.app["cleanup_tasks"], "session": session,
            "video_previews": previews, "media_thumbnails": thumbnails,
            "edit_exports": exports,
        }))
        await self.assert_generation_blocked()
        self.assertFalse(shutdown.done())
        session.close.assert_not_awaited()
        thumbnails.close.assert_not_awaited()
        self.confirmed.set()
        await stopping
        await shutdown
        session.close.assert_awaited_once()
        thumbnails.close.assert_awaited_once()
        exports.close.assert_awaited_once()
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
