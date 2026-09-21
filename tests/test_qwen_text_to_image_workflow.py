import json
import sys
import unittest
from pathlib import Path
from unittest import mock

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

sys.path.insert(0, str(ROOT / "tests"))
import app
import auth_support
import scan_workflows

CAP_ID = "qwen_image_2512_t2i"


class QwenTextToImageWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.cap = json.loads((ROOT / "manifests" / f"{CAP_ID}.json").read_text(encoding="utf-8"))

    def graph(self, params=None):
        return app.patch_graph(self.cap, params or {}, {})

    def test_original_model_and_two_stage_sampling_settings(self):
        g = self.graph()
        self.assertEqual(g["3"]["inputs"], {
            "unet_name": "qwen_image_2512_fp8_e4m3fn.safetensors", "weight_dtype": "default",
        })
        self.assertEqual(g["4"]["inputs"], {
            "model": ["3", 0], "lora_name": "Qwen-Image-Lightning-8steps-V2.0-bf16.safetensors",
            "strength_model": 1,
        })
        self.assertEqual(g["2"]["inputs"]["clip_name"], "qwen_2.5_vl_7b_fp8_scaled.safetensors")
        self.assertEqual(g["1"]["inputs"]["vae_name"], "qwen_image_vae.safetensors")
        self.assertEqual(g["5"]["inputs"], {"model": ["4", 0], "shift": 3})
        self.assertEqual(g["6"]["inputs"], {"model": ["5", 0], "strength": 1, "pre_cfg": False})
        self.assertEqual(g["7"]["inputs"], {"width": 1024, "height": 1024, "batch_size": 1})
        self.assertEqual(g["11"]["inputs"], {
            "samples": ["10", 0], "upscale_method": "nearest-exact", "scale_by": 1,
        })
        for node, steps, latent in (("10", 6, "7"), ("12", 2, "11")):
            ins = g[node]["inputs"]
            self.assertEqual([ins[k] for k in ("steps", "cfg", "sampler_name", "scheduler", "denoise")],
                             [steps, 1.5, "euler", "simple", 1])
            self.assertEqual(ins["model"], ["6", 0])
            self.assertEqual(ins["latent_image"], [latent, 0])
            self.assertEqual(ins["positive"], ["8", 0])
            self.assertEqual(ins["negative"], ["9", 0])

    def test_positive_negative_defaults_and_explicit_empty_are_independent(self):
        default_negative = next(s["default"] for s in self.cap["inputs"] if s["key"] == "negative_prompt")
        self.assertTrue(default_negative)
        self.assertEqual(self.graph()["8"]["inputs"]["text"], "")
        self.assertEqual(self.graph()["9"]["inputs"]["text"], default_negative)
        for negative in ("不要水印、模糊和文字", ""):
            with self.subTest(negative=negative):
                g = self.graph({"prompt": "一只猫坐在窗边", "negative_prompt": negative})
                self.assertEqual(g["8"]["inputs"]["text"], "一只猫坐在窗边")
                self.assertEqual(g["9"]["inputs"]["text"], negative)

    def test_shared_size_seed_cfg_and_independent_stage_steps(self):
        g = self.graph({"width": 1280, "height": 720, "steps": 8, "refine_steps": 3,
                        "cfg": 2, "seed": 123})
        self.assertEqual(g["7"]["inputs"], {"width": 1280, "height": 720, "batch_size": 1})
        self.assertEqual(g["10"]["inputs"]["steps"], 8)
        self.assertEqual(g["12"]["inputs"]["steps"], 3)
        for nid in ("10", "12"):
            self.assertEqual(g[nid]["inputs"]["seed"], 123)
            self.assertEqual(g[nid]["inputs"]["cfg"], 2)
        self.assertEqual(self.graph({"steps": 12})["12"]["inputs"]["steps"], 2)
        self.assertEqual(self.graph({"refine_steps": 4})["10"]["inputs"]["steps"], 6)
        params = {"seed": -1}
        g = self.graph(params)
        self.assertEqual(g["10"]["inputs"]["seed"], g["12"]["inputs"]["seed"])
        self.assertEqual(g["10"]["inputs"]["seed"], params["_seed_used"])

    def test_only_final_output_no_image_input_or_extra_preview_decode(self):
        g = self.graph()
        self.assertEqual(self.cap["output"], {"node": "16"})
        self.assertEqual(g["16"]["inputs"]["images"], ["13", 0])
        self.assertEqual(g["13"]["inputs"]["samples"], ["12", 0])
        self.assertEqual(set(g), scan_workflows.upstream(g, "16") | {"16"})
        self.assertFalse(any(n["class_type"] in ("PreviewImage", "LoadImage") for n in g.values()))
        self.assertEqual(self.cap["images"], 0)
        self.assertEqual(self.cap["slotLimits"]["image"], {"min": 0, "max": 0})

    def test_grouping_rescan_registration_and_chinese_progress(self):
        app.load_caps()
        image_caps = [app.CAPS[wid] for wid in (
            "zimage_t2i", "krea2_t2i", CAP_ID, "zimage_i2i", "krea2_i2i", "qwen_image_edit_2511_i2i",
        )]
        modes = scan_workflows.build_modes(image_caps)
        self.assertEqual([m["name"] for m in modes], ["文生图", "图生图"])
        self.assertEqual(modes[0]["modelSwitch"]["qwen2512"], CAP_ID)
        self.assertNotIn("qwen2512", modes[1]["modelSwitch"])
        self.assertIn(CAP_ID, scan_workflows.BUNDLED_CAPABILITIES)
        self.assertEqual(app.model_family(CAP_ID), "qwen_image_2512")
        for label in app.step_labels(self.graph()).values():
            self.assertRegex(label, r"[\u4e00-\u9fff]")


class QwenTextToImageApiTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def test_reload_dry_run_and_recorded_negative_prompt(self):
        self.auth_setup()
        self.addCleanup(self.auth_teardown)
        self.own_project("p")
        self.enterContext(mock.patch.object(app, "PROJ_DIR", self.root / "data" / "projects"))
        application = self.build_app()
        application["cleanup_pending"] = set()
        application.router.add_post("/api/reload", app.api_reload)
        application.router.add_get("/api/cards", app.api_cards)
        application.router.add_post("/api/generate", app.api_generate)
        with mock.patch.object(app, "CONTROLLER_MODE", False), \
             mock.patch.object(app, "local_submit", new_callable=mock.AsyncMock, return_value="qwen-t2i-test") as submit, \
             mock.patch.object(app, "save_jobs"), \
             mock.patch.object(app, "JOBS", {}), \
             mock.patch.object(app, "STEPS", {}), \
             mock.patch.object(app, "WEIGHTS", {}):
            async with TestClient(TestServer(application)) as client:
                self.client = client
                self.origin = str(client.make_url('/')).rstrip('/')
                client.session.headers.update(await self.login())
                response = await client.post("/api/reload")
                self.assertEqual(response.status, 200)
                response = await client.get("/api/cards")
                data = await response.json()
                card = next(c for c in data["cards"] if c["id"] == "card_image")
                mode = next(m for m in card["modes"] if m["name"] == "文生图")
                self.assertEqual(mode["modelSwitch"]["qwen2512"], CAP_ID)
                inputs = data["capabilities"][CAP_ID]["inputs"]
                self.assertIn("negative_prompt", [s["key"] for s in inputs])
                body = {"capability": CAP_ID, "assets": {}, "dry_run": True, "project": "p",
                        "params": {"prompt": "窗边的猫", "negative_prompt": "", "width": 1280,
                                   "height": 720, "steps": 7, "refine_steps": 3, "seed": 123}}
                response = await client.post("/api/generate", json=body)
                self.assertEqual(response.status, 200)
                diff = (await response.json())["changed"]
                self.assertEqual(diff["#8.text"][1], "窗边的猫")
                self.assertEqual(diff["#9.text"][1], "")
                self.assertEqual(diff["#7.width"][1], 1280)
                self.assertEqual(diff["#10.steps"][1], 7)
                self.assertEqual(diff["#12.steps"][1], 3)
                submit.assert_not_awaited()
                body["dry_run"] = False
                body["params"]["negative_prompt"] = "不要水印"
                response = await client.post("/api/generate", json=body)
                self.assertEqual(response.status, 200)
                submitted_graph = submit.call_args.args[1]
                self.assertEqual(submitted_graph["9"]["inputs"]["text"], "不要水印")
                prompts = {p["key"]: p["text"] for p in app.JOBS["qwen-t2i-test"]["prompts"]}
                self.assertEqual(prompts, {"prompt": "窗边的猫", "negative_prompt": "不要水印"})
                viewer = self.auth.create_user("viewer", auth_support.PASSWORD)
                self.auth.set_grant(viewer["id"], self.admin["id"], "read")
                client.session.headers.update(await self.login("viewer"))
                submit.reset_mock()
                response = await client.post("/api/generate", json=body)
                self.assertEqual(response.status, 403)
                submit.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
