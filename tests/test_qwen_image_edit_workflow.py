import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

import app
import scan_workflows


class QwenImageEditWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.cap = json.loads((ROOT / "manifests/qwen_image_edit_2511_i2i.json").read_text(encoding="utf-8"))

    def test_one_two_three_images_disconnect_both_unused_conditioning_branches(self):
        for count in (1, 2, 3):
            with self.subTest(count=count):
                assets = {f"images[{i}]": f"chouka/image{i + 1}.png" for i in range(count)}
                graph = app.patch_graph(self.cap, {"prompt": "保留图1人物，参考其他图片", "seed": 123}, assets)
                for i, (loader, scale) in enumerate((("15", "16"), ("18", "19"), ("21", "20"))):
                    for encoder in ("1", "2"):
                        if i < count:
                            self.assertEqual(graph[encoder]["inputs"][f"image{i + 1}"], [scale, 0])
                            self.assertEqual(graph[loader]["inputs"]["image"], assets[f"images[{i}]"])
                        else:
                            self.assertNotIn(f"image{i + 1}", graph[encoder]["inputs"])
                            self.assertNotIn(loader, scan_workflows.upstream(graph, "29"))
                self.assertEqual(graph["17"]["inputs"]["text"], "保留图1人物，参考其他图片")
                self.assertEqual(graph["1"]["inputs"]["prompt"], "")

    def test_main_image_required_even_when_references_are_present(self):
        for assets in ({}, {"images[1]": "chouka/reference.png"}):
            with self.subTest(assets=assets), self.assertRaises(web.HTTPBadRequest):
                app.patch_graph(self.cap, {}, assets)

    def test_empty_middle_slot_does_not_reuse_demo_image(self):
        graph = app.patch_graph(self.cap, {}, {"images[0]": "one.png", "images[2]": "three.png"})
        for encoder in ("1", "2"):
            self.assertNotIn("image2", graph[encoder]["inputs"])
            self.assertEqual(graph[encoder]["inputs"]["image3"], ["20", 0])

    def test_original_models_and_sampling_settings_are_preserved(self):
        graph = app.patch_graph(self.cap, {}, {"images[0]": "one.png"})
        self.assertEqual(graph["9"]["inputs"], {
            "unet_name": "qwen_image_edit_2511_bf16.safetensors", "weight_dtype": "fp8_e4m3fn",
        })
        self.assertEqual(graph["10"]["inputs"], {
            "model": ["9", 0], "lora_name": "Qwen-Image-Edit-2511-Lightning-4steps-V1-bf16.safetensors",
            "strength_model": 1,
        })
        self.assertEqual(graph["5"]["inputs"]["clip_name"], "qwen_2.5_vl_7b_fp8_scaled.safetensors")
        self.assertEqual(graph["6"]["inputs"]["vae_name"], "qwen_image_vae.safetensors")
        self.assertEqual(graph["11"]["inputs"], {"model": ["10", 0], "shift": 3.1})
        self.assertEqual(graph["12"]["inputs"], {"model": ["11", 0], "strength": 1})
        sampler = graph["7"]["inputs"]
        self.assertEqual([sampler[k] for k in ("steps", "cfg", "sampler_name", "scheduler", "denoise")],
                         [4, 1, "euler", "simple", 1])
        for nid in ("26", "27"):
            self.assertEqual(graph[nid]["inputs"]["reference_latents_method"], "index_timestep_zero")
        self.assertEqual(graph["16"]["inputs"]["scale_to_length"], 2048)
        self.assertEqual(graph["16"]["inputs"]["image"], ["15", 0])
        self.assertEqual(graph["3"]["inputs"]["pixels"], ["16", 0])
        self.assertEqual(graph["29"]["inputs"]["images"], ["4", 0])

    def test_parameters_patch_actual_nodes_and_keep_reference_sizing(self):
        graph = app.patch_graph(self.cap, {
            "scale_to_length": 1024, "steps": 4, "seed": 456, "prompt": "",
        }, {"images[0]": "one.png"})
        self.assertEqual(graph["16"]["inputs"]["scale_to_length"], 1024)
        self.assertEqual(graph["7"]["inputs"]["seed"], 456)
        self.assertEqual(graph["17"]["inputs"]["text"], "")
        for nid in ("19", "20"):
            self.assertEqual(graph[nid]["inputs"]["scale_to_length"], ["16", 4])

    def test_reload_and_scanner_group_three_models_only_under_image_to_image(self):
        app.load_caps()
        card = next(c for c in app.CARDS if c["id"] == "card_image")
        i2i = [m for m in card["modes"] if m["name"] == "图生图"]
        self.assertEqual(len(i2i), 1)
        self.assertEqual(i2i[0]["modelSwitch"]["qwen2511"], self.cap["id"])
        t2i = next(m for m in card["modes"] if m["name"] == "文生图")
        self.assertNotIn("qwen2511", t2i["modelSwitch"])
        modes = scan_workflows.build_modes([app.CAPS[wid] for wid in (
            "zimage_t2i", "krea2_t2i", "zimage_i2i", "krea2_i2i", self.cap["id"],
        )])
        self.assertEqual([m["name"] for m in modes], ["文生图", "图生图"])
        self.assertEqual(modes[1]["modelSwitch"], i2i[0]["modelSwitch"])
        self.assertEqual(self.cap["slotLimits"]["image"], {"min": 1, "max": 3})
        self.assertEqual(len([s for s in self.cap["inputs"] if s["type"] == "image"]), 3)
        self.assertEqual(app.model_family(self.cap["id"]), "qwen_image_edit_2511")

    def test_default_rescan_preserves_bundled_capability_without_original_download(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "manifests").mkdir()
            (root / "graphs").mkdir()
            for wid in scan_workflows.BUNDLED_CAPABILITIES:
                source = ROOT / "manifests" / f"{wid}.json"
                cap = json.loads(source.read_text(encoding="utf-8"))
                (root / "manifests" / source.name).write_bytes(source.read_bytes())
                (root / cap["graph"]).write_bytes((ROOT / cap["graph"]).read_bytes())
            manifest_path = root / "manifests" / f"{self.cap['id']}.json"
            graph_path = root / self.cap["graph"]
            with mock.patch.object(scan_workflows, "ROOT", root), \
                 mock.patch.object(scan_workflows, "ALIASES", {}), \
                 mock.patch.object(scan_workflows, "load_object_info", return_value={}), \
                 mock.patch.object(scan_workflows, "load_zh", return_value={}), \
                 mock.patch.object(sys, "argv", ["scan_workflows.py"]), \
                 contextlib.redirect_stdout(io.StringIO()):
                scan_workflows.main()
            cards = json.loads((root / "manifests/_cards.json").read_text(encoding="utf-8"))
            image_card = next(c for c in cards if c["id"] == "card_image")
            self.assertEqual({m["id"] for m in image_card["modes"]},
                             scan_workflows.BUNDLED_CAPABILITIES)
            self.assertEqual(json.loads(manifest_path.read_text(encoding="utf-8")), self.cap)
            self.assertEqual(graph_path.read_bytes(), (ROOT / self.cap["graph"]).read_bytes())

    def test_progress_labels_are_chinese(self):
        app.load_caps()
        graph = app.patch_graph(self.cap, {}, {"images[0]": "one.png"})
        labels = app.step_labels(graph)
        for nid in graph:
            self.assertRegex(labels[nid], r"[\u4e00-\u9fff]")


class QwenRuntimeCardsTest(unittest.IsolatedAsyncioTestCase):
    async def test_http_reload_publishes_real_manifest_and_model_choice(self):
        application = web.Application()
        application.router.add_post("/api/reload", app.api_reload)
        application.router.add_get("/api/cards", app.api_cards)
        application.router.add_post("/api/generate", app.api_generate)
        with mock.patch.object(app, "CONTROLLER_MODE", False):
            async with TestClient(TestServer(application)) as client:
                response = await client.post("/api/reload")
                self.assertEqual(response.status, 200)
                self.assertTrue((await response.json())["ok"])
                response = await client.get("/api/cards")
                self.assertEqual(response.status, 200)
                data = await response.json()
                for count in (1, 2, 3):
                    response = await client.post("/api/generate", json={
                        "capability": "qwen_image_edit_2511_i2i", "dry_run": True,
                        "assets": {f"images[{i}]": f"chouka/image{i}.png" for i in range(count)},
                        "params": {"prompt": "更换背景", "scale_to_length": 1024},
                    })
                    self.assertEqual(response.status, 200)
                    diff = (await response.json())["changed"]
                    self.assertEqual(diff["#17.text"][1], "更换背景")
                    for image in (2, 3):
                        for encoder in (1, 2):
                            key = f"#{encoder}.image{image}"
                            if image > count:
                                self.assertEqual(diff[key][1], "<断开>")
                            else:
                                self.assertNotIn(key, diff)
        cap = data["capabilities"]["qwen_image_edit_2511_i2i"]
        card = next(c for c in data["cards"] if c["id"] == "card_image")
        mode = next(m for m in card["modes"] if m["name"] == "图生图")
        self.assertEqual(mode["modelSwitch"]["qwen2511"], cap["id"])
        self.assertEqual(cap["slotLimits"]["image"], {"min": 1, "max": 3})
        self.assertEqual(next(s for s in cap["inputs"] if s["key"] == "scale_to_length")["default"], 2048)


if __name__ == "__main__":
    unittest.main()
