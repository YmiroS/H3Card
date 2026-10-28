import json
import sys
import tempfile
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


class QwenImage21LightingWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.cap = json.loads((ROOT / "manifests/qwen_lighting_21.json").read_text(encoding="utf-8"))
        self.graph = json.loads((ROOT / self.cap["graph"]).read_text(encoding="utf-8"))

    def test_single_original_and_backend_targets(self):
        self.assertEqual(self.cap["slotLimits"]["image"], {"min": 1, "max": 1})
        self.assertEqual(self.cap["parameterPanel"], "lighting")
        self.assertTrue(self.cap["compare"])
        self.assertEqual(self.cap["card"], "card_image")
        self.assertEqual(self.graph["41"]["inputs"]["image"], "")
        fields = {spec["key"]: spec for spec in self.cap["inputs"]}
        self.assertEqual(set(fields), {
            "images[0]", "prompt", "negative_prompt", "megapixels", "steps", "cfg", "seed"})
        for field in fields.values():
            target = field["target"]
            self.assertIn(target["input"], self.graph[target["node"]]["inputs"])
            if "default" in field:
                self.assertEqual(field["default"], self.graph[target["node"]]["inputs"][target["input"]])
        for assets in ({}, {"images[1]": "chouka/other.png"}):
            with self.subTest(assets=assets), self.assertRaises(web.HTTPBadRequest):
                app.patch_graph(self.cap, {}, assets)

    def test_relight_request_reaches_actual_graph_without_old_model_settings(self):
        prompt = "Remove original lighting. Use ONLY ONE new light from image-left and below."
        params = {"prompt": prompt, "negative_prompt": "no extra light", "seed": 42,
                  "megapixels": 3840 * 2160 / (1024 * 1024), "steps": 32, "cfg": 1.2,
                  "light_azimuth": -52, "light_elevation": -59, "custom_history": "keep"}
        graph = app.patch_graph(self.cap, params, {"images[0]": "chouka/original.png"})
        self.assertEqual(graph["41"]["inputs"]["image"], "chouka/original.png")
        self.assertEqual(graph["68"]["inputs"]["prompt"], prompt)
        self.assertEqual(graph["68"]["inputs"]["negative_prompt"], "no extra light")
        self.assertEqual(graph["84"]["inputs"]["megapixels"], params["megapixels"])
        self.assertEqual([graph["65"]["inputs"][k] for k in ("seed", "steps", "cfg")], [42, 32, 1.2])
        self.assertEqual(graph["68"]["inputs"]["resolution"], 0)
        self.assertEqual(params["custom_history"], "keep")
        self.assertEqual(self.graph["65"]["inputs"]["steps"], 40)

    def test_model_chain_uses_21_weights_and_original_sampling_without_2511_lora(self):
        reference = json.loads((ROOT / "graphs/qwen_image_21_i2i.api.json").read_text(encoding="utf-8"))
        for new, old in (("9", "2"), ("117", "3"), ("118", "4"), ("67", "14"), ("64", "7")):
            self.assertEqual(self.graph[new]["class_type"], reference[old]["class_type"])
            expected = {k: v for k, v in reference[old]["inputs"].items() if k != "model"}
            actual = {k: v for k, v in self.graph[new]["inputs"].items() if k != "model"}
            self.assertEqual(actual, expected)
        self.assertEqual(self.graph["67"]["inputs"]["model"], ["9", 0])
        self.assertEqual(self.graph["64"]["inputs"]["model"], ["67", 0])
        self.assertEqual(self.graph["65"]["inputs"]["model"], ["64", 0])
        sampler = self.graph["65"]["inputs"]
        self.assertEqual([sampler[k] for k in ("steps", "cfg", "sampler_name", "scheduler", "denoise")],
                         [40, 1, "euler", "simple", 1])
        self.assertFalse(any("Lora" in node["class_type"] for node in self.graph.values()))
        self.assertEqual(app.model_family("qwen_lighting_21"), "qwen_image_21")
        self.assertEqual(app.model_name("qwen_lighting_21"), "Qwen Image 2.1")
        self.assertEqual(app.model_name("qwen_lighting"), "Qwen Image Edit 2511")

    def test_reference_and_sampling_latent_share_original_aspect_and_pixel_budget(self):
        self.assertEqual(self.graph["84"]["inputs"], {
            "image": ["41", 0], "upscale_method": "lanczos", "megapixels": 1.5,
            "resolution_steps": 32})
        encoder = self.graph["68"]["inputs"]
        self.assertEqual(encoder["images.image_1"], ["84", 0])
        self.assertEqual(encoder["resolution"], 0)
        self.assertEqual([k for k in encoder if k.startswith("images.")], ["images.image_1"])
        self.assertEqual(self.graph["65"]["inputs"]["latent_image"], ["68", 2])
        self.assertEqual(self.graph["65"]["inputs"]["positive"], ["68", 0])
        self.assertEqual(self.graph["65"]["inputs"]["negative"], ["68", 1])
        self.assertFalse(any(n["class_type"] in ("EmptyLatentImage", "ResolutionSelector")
                             for n in self.graph.values()))
        fields = {field["key"]: field for field in self.cap["inputs"]}
        self.assertEqual(fields["megapixels"]["max"], 16)
        self.assertNotIn("aspect_ratio", fields)
        self.assertNotIn("encode_resolution", fields)

    def test_native_workflow_links_widgets_and_titles_match_api_graph(self):
        native = json.loads((ROOT / "graphs/qwen_lighting_21.workflow.json").read_text(encoding="utf-8"))
        nodes = {str(node["id"]): node for node in native["nodes"]}
        links = {link[0]: link for link in native["links"]}
        self.assertEqual(set(nodes), set(self.graph))
        for node_id, expected in self.graph.items():
            actual = nodes[node_id]
            self.assertEqual(actual["type"], expected["class_type"])
            self.assertEqual(actual["title"], expected["_meta"]["title"])
            self.assertEqual(actual["mode"], 0)
            inputs = {slot["name"]: slot for slot in actual.get("inputs", [])}
            for key, value in expected["inputs"].items():
                with self.subTest(node=node_id, input=key):
                    if isinstance(value, list):
                        link = links[inputs[key]["link"]]
                        self.assertEqual([str(link[1]), link[2]], value)
                        self.assertEqual(link[3], actual["id"])
                        self.assertEqual(actual["inputs"][link[4]]["name"], key)
                        source_output = nodes[str(link[1])]["outputs"][link[2]]
                        self.assertEqual(source_output["type"], inputs[key]["type"])
                        self.assertIn(link[0], source_output["links"])
                    else:
                        self.assertEqual(actual["widgets_values_named"][key], value)
        self.assertEqual(set(self.graph), scan_workflows.upstream(self.graph, "115") | {"115"})
        for title in app.step_labels(self.graph).values():
            self.assertRegex(title, r"[\u4e00-\u9fff]")

    def test_rescan_keeps_one_lighting_mode_with_both_models_in_one_image_card(self):
        original = json.loads((ROOT / "manifests/qwen_lighting.json").read_text(encoding="utf-8"))
        expected = {"id": "qwen_lighting", "name": "灯光模式", "slots": "img1+aud0+vid0",
                    "modelSwitch": {"qwen2511": "qwen_lighting", "qwen21": "qwen_lighting_21"}}
        self.assertEqual(scan_workflows.build_modes([original, self.cap]), [expected])
        self.assertTrue({"qwen_lighting", "qwen_lighting_21"} <= scan_workflows.BUNDLED_CAPABILITIES)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "manifests").mkdir()
            (root / "graphs").mkdir()
            for cap in (original, self.cap):
                (root / "manifests" / (cap["id"] + ".json")).write_text(
                    json.dumps(cap, ensure_ascii=False), encoding="utf-8")
                (root / cap["graph"]).write_text("{}", encoding="utf-8")
            with mock.patch.multiple(scan_workflows, ROOT=root, ALIASES={},
                                     BUNDLED_CAPABILITIES={"qwen_lighting", "qwen_lighting_21"}), \
                    mock.patch.object(scan_workflows, "load_object_info", return_value={}), \
                    mock.patch.object(scan_workflows, "load_zh", return_value={}), \
                    mock.patch.object(sys, "argv", ["scan_workflows.py"]):
                scan_workflows.main()
            cards = json.loads((root / "manifests/_cards.json").read_text(encoding="utf-8"))
            images = [card for card in cards if card["id"] == "card_image"]
            self.assertEqual(len(images), 1)
            self.assertEqual(images[0]["modes"], [expected])


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
                expected = {"文生图": "qwen_image_21_t2i", "图生图": "qwen_image_21_multi",
                            "灯光模式": "qwen_lighting_21"}
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
                for capability_id in ("qwen_lighting", "qwen_lighting_21"):
                    prompt = "Remove original lighting. Use ONLY ONE new light from image-left."
                    response = await client.post("/api/generate", json={
                        "capability": capability_id, "project": "p", "dry_run": True,
                        "assets": {"images[0]": "chouka/image0.png"},
                        "params": {"prompt": prompt, "seed": 42, "megapixels": 7.91015625},
                    })
                    self.assertEqual(response.status, 200, await response.text())
                    changed = (await response.json())["changed"]
                    self.assertEqual(changed["#68.prompt"][1], prompt)
                    self.assertEqual(changed["#41.image"][1], "chouka/image0.png")
                    self.assertEqual(changed["#84.megapixels"][1], 7.91015625)
                    self.assertEqual(changed["#65.seed"][1], 42)


if __name__ == "__main__":
    unittest.main()
