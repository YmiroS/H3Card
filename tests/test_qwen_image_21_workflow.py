import json
import sys
import unittest
from pathlib import Path
from unittest import mock

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "tests"))
import app
import auth_support
import scan_workflows

CAP_IDS = [f"qwen_image_21_{mode}" for mode in ("t2i", "i2i", "multi")]
IMAGE_PATHS = [("72", "75"), ("81", "86"), ("97", "102"), ("79", "78"),
               ("82", "87"), ("98", "103"), ("90", "91"), ("92", "93"),
               ("96", "106"), ("121", "122"), ("126", "127"), ("130", "131"),
               ("134", "135"), ("138", "140"), ("142", "143"), ("145", "147")]


def capability(mode):
    return json.loads((ROOT / "manifests" / f"qwen_image_21_{mode}.json").read_text(encoding="utf-8"))


class QwenImage21WorkflowTest(unittest.TestCase):
    def test_model_versions_and_original_sampling_are_preserved(self):
        for mode in ("t2i", "i2i", "multi"):
            cap = capability(mode)
            graph = app.patch_graph(cap, {"seed": 123}, {"images[0]": "chouka/main.png"})
            by_type = {n["class_type"]: n["inputs"] for n in graph.values()}
            with self.subTest(mode=mode):
                self.assertEqual(by_type["UNETLoader"], {
                    "unet_name": "qwen_image_2.1_int8_convrot.safetensors", "weight_dtype": "default"})
                self.assertEqual(by_type["CLIPLoader"]["clip_name"], "qwen3vl_8b_fp8_scaled.safetensors")
                self.assertEqual(by_type["CLIPLoader"]["type"], "qwen_image")
                self.assertEqual(by_type["VAELoader"]["vae_name"], "qwen_image_2.1_vae_bf16.safetensors")
                self.assertEqual(by_type["ModelAttentionBackend"]["attention"], "comfy kitchen attention")
                self.assertEqual(by_type["QwenImage21Cache"]["device"], "auto")
                self.assertEqual(by_type["QwenImage21Cache"]["dtype"], "default")
                sampler = by_type["KSampler"]
                self.assertEqual([sampler[k] for k in ("steps", "cfg", "sampler_name", "scheduler", "denoise")],
                                 [40, 1, "euler", "simple", 1])
                self.assertEqual(sampler["seed"], 123)
                self.assertEqual(by_type["PrimitiveStringMultiline"]["value"], "")
                self.assertEqual(by_type["TextEncodeQwenImage21"]["negative_prompt"], "")

    def test_all_templates_have_only_final_output_and_valid_links(self):
        for mode in ("t2i", "i2i", "multi"):
            cap = capability(mode)
            graph = json.loads((ROOT / cap["graph"]).read_text(encoding="utf-8"))
            output = cap["output"]["node"]
            with self.subTest(mode=mode):
                self.assertEqual(set(graph), scan_workflows.upstream(graph, output) | {output})
                self.assertEqual([n for n in graph if graph[n]["class_type"] == "SaveImage"], [output])
                self.assertFalse(any(n["class_type"] in ("PreviewImage", "SetNode", "GetNode")
                                     for n in graph.values()))
                for node in graph.values():
                    for value in node["inputs"].values():
                        if isinstance(value, list):
                            self.assertIn(value[0], graph)
                for spec in cap["inputs"]:
                    target = spec["target"]
                    self.assertIn(target["input"], graph[target["node"]]["inputs"])

    def test_text_to_image_has_no_demo_image_and_edit_requires_main_image(self):
        cap = capability("t2i")
        graph = app.patch_graph(cap, {}, {})
        self.assertEqual(cap["slotLimits"]["image"], {"min": 0, "max": 0})
        self.assertFalse(any(n["class_type"] == "LoadImage" for n in graph.values()))
        self.assertFalse(any(k.startswith("images.") for k in graph["37"]["inputs"]))
        for mode in ("i2i", "multi"):
            for assets in ({}, {"images[1]": "chouka/reference.png"}):
                with self.subTest(mode=mode, assets=assets), self.assertRaises(web.HTTPBadRequest):
                    app.patch_graph(capability(mode), {}, assets)

    def test_basic_parameters_reach_actual_nodes_and_keep_custom_output_size(self):
        for mode in ("t2i", "i2i"):
            graph = app.patch_graph(capability(mode), {
                "prompt": "雨后的街道", "negative_prompt": "不要文字", "steps": 24,
                "aspect_ratio": "16:9 (Widescreen)", "megapixels": 1.5,
                "encode_resolution": 768, "batch_size": 2,
            }, {"images[0]": "chouka/main.png"})
            self.assertEqual(graph["13"]["inputs"]["value"], "雨后的街道")
            self.assertEqual(graph["37"]["inputs"]["negative_prompt"], "不要文字")
            self.assertEqual(graph["37"]["inputs"]["resolution"], 768)
            self.assertEqual(graph["8"]["inputs"]["steps"], 24)
            self.assertEqual(graph["39"]["inputs"], {
                "aspect_ratio": "16:9 (Widescreen)", "megapixels": 1.5, "multiple": 16})
            self.assertEqual(graph["38"]["inputs"]["width"], ["39", 0])
            self.assertEqual(graph["38"]["inputs"]["height"], ["39", 1])
            self.assertEqual(graph["42"]["inputs"]["value"], 2)
            if mode == "i2i":
                self.assertEqual(graph["37"]["inputs"]["images.image_1"], ["1", 0])

    def test_one_to_sixteen_images_disconnect_unused_branches(self):
        cap = capability("multi")
        self.assertEqual(cap["slotLimits"]["image"], {"min": 1, "max": 16})
        for count in (1, 2, 3, 16):
            assets = {f"images[{i}]": f"chouka/image{i}.png" for i in range(count)}
            graph = app.patch_graph(cap, {"reference_pixels": 1024}, assets)
            live = scan_workflows.upstream(graph, "62")
            for i, (loader, scale) in enumerate(IMAGE_PATHS):
                with self.subTest(count=count, image=i + 1):
                    field = f"images.image_{i + 1}"
                    if i < count:
                        self.assertEqual(graph["54"]["inputs"][field], [scale, 0])
                        self.assertEqual(graph[loader]["inputs"]["image"], assets[f"images[{i}]"])
                    else:
                        self.assertNotIn(field, graph["54"]["inputs"])
                        self.assertNotIn(loader, live)
                    self.assertEqual(graph[scale]["inputs"]["scale_to_length"], 1024)
                    self.assertEqual(graph[scale]["inputs"]["scale_to_side"], "total_pixel(kilo pixel)")
                    self.assertEqual(graph[scale]["inputs"]["round_to_multiple"], "32")
            self.assertEqual(graph["51"]["inputs"]["image"], ["75", 0])
            self.assertEqual(graph["53"]["inputs"]["width"], ["51", 0])
            self.assertEqual(graph["53"]["inputs"]["height"], ["51", 1])

    def test_sparse_references_do_not_execute_demo_or_change_slot_order(self):
        graph = app.patch_graph(capability("multi"), {}, {
            "images[0]": "chouka/one.png", "images[15]": "chouka/sixteen.png"})
        self.assertNotIn("images.image_2", graph["54"]["inputs"])
        self.assertEqual(graph["54"]["inputs"]["images.image_16"], ["147", 0])
        self.assertEqual(graph["145"]["inputs"]["image"], "chouka/sixteen.png")
        self.assertNotIn("81", scan_workflows.upstream(graph, "62"))

    def test_grouping_bundled_registration_and_chinese_progress(self):
        app.load_caps()
        modes = scan_workflows.build_modes([m for m in app.CAPS.values() if m["card"] == "image"])
        expected = {"文生图": "qwen_image_21_t2i", "图生图": "qwen_image_21_multi"}
        for mode, capability_id in expected.items():
            selected = [m for m in modes if m["name"] == mode]
            self.assertEqual(len(selected), 1)
            self.assertEqual(selected[0]["modelSwitch"]["qwen21"], capability_id)
        self.assertFalse(any(m["id"] == "qwen_image_21_multi" for m in modes))
        for cap_id in CAP_IDS:
            self.assertIn(cap_id, scan_workflows.BUNDLED_CAPABILITIES)
            self.assertEqual(app.model_name(cap_id), "Qwen Image 2.1")
            graph = app.patch_graph(app.CAPS[cap_id], {}, {"images[0]": "chouka/main.png"})
            for label in app.step_labels(graph).values():
                self.assertRegex(label, r"[\u4e00-\u9fff]")
                self.assertNotEqual(label, "处理中")


class QwenImage21RuntimeTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def test_reload_cards_and_authenticated_dry_runs(self):
        self.auth_setup()
        self.addCleanup(self.auth_teardown)
        self.own_project("p")
        self.enterContext(mock.patch.object(app, "PROJ_DIR", self.root / "data" / "projects"))
        for i in range(16):
            self.register_asset(f"image{i}.png")
        application = self.build_app()
        application.router.add_post("/api/reload", app.api_reload)
        application.router.add_get("/api/cards", app.api_cards)
        application.router.add_post("/api/generate", app.api_generate)
        with mock.patch.object(app, "CONTROLLER_MODE", False):
            async with TestClient(TestServer(application)) as client:
                self.client = client
                self.origin = str(client.make_url('/')).rstrip('/')
                client.session.headers.update(await self.login())
                self.assertEqual((await client.post("/api/reload")).status, 200)
                response = await client.get("/api/cards")
                self.assertEqual(response.status, 200)
                data = await response.json()
                card = next(c for c in data["cards"] if c["id"] == "card_image")
                expected = {"文生图": "qwen_image_21_t2i", "图生图": "qwen_image_21_multi"}
                for mode, capability_id in expected.items():
                    item = next(m for m in card["modes"] if m["name"] == mode)
                    self.assertEqual(item["modelSwitch"]["qwen21"], capability_id)
                self.assertFalse(any(m["id"] == "qwen_image_21_multi" for m in card["modes"]))
                for mode, count, prompt_node in (("t2i", 0, "13"), ("i2i", 1, "13"),
                                                 ("multi", 1, "45"), ("multi", 16, "45")):
                    response = await client.post("/api/generate", json={
                        "capability": f"qwen_image_21_{mode}", "project": "p", "dry_run": True,
                        "assets": {f"images[{i}]": f"chouka/image{i}.png" for i in range(count)},
                        "params": {"prompt": "保留图1人物，替换背景", "seed": 123},
                    })
                    self.assertEqual(response.status, 200, await response.text())
                    changed = (await response.json())["changed"]
                    self.assertEqual(changed[f"#{prompt_node}.value"][1], "保留图1人物，替换背景")
                    if mode == "multi" and count == 1:
                        self.assertEqual(changed["#54.images.image_16"][1], "<断开>")


if __name__ == "__main__":
    unittest.main()
