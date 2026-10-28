"""Lighting graph, real backend dry-run and optional local plugin contracts; no GPU."""

import __future__
import ast
import importlib.util
import json
import os
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

NEGATIVE_PROMPT = "泛黄，AI感，不真实，丑陋，油腻的皮肤，异常的肢体，不协调的肢体"
LIGHT_DEFAULTS = {
    "light_azimuth": 60, "light_elevation": 30, "light_intensity": 1,
    "light_color_hex": "#ffffff", "cinematic_mode": True,
}
SOURCE_SAMPLE = {"elevation": 43, "intensity": 0, "color": "#d35fe3", "azimuth": 259}
SOURCE_PROMPT = (
    "SCENE LOCK, FIXED VIEWPOINT, maintaining character consistency and pose. RELIGHTING ONLY: "
    "light source from the left, high-angle light source, soft colored light (#d35fe3), cinematic relighting"
)


def read_json(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


class QwenLightingWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.cap = read_json("manifests/qwen_lighting.json")
        self.graph = read_json(self.cap["graph"])
        self.fields = {field["key"]: field for field in self.cap["inputs"]}
        self.workflow = read_json("graphs/qwen_lighting.workflow.json")
        self.nodes = {str(node["id"]): node for node in self.workflow["nodes"]}

    def test_image_generation_mode_and_single_image_contract(self):
        cards = read_json("manifests/_cards.json")
        matches = [(card, mode) for card in cards for mode in card["modes"]
                   if mode["id"] == "qwen_lighting"]
        self.assertEqual(len(matches), 1)
        card, mode = matches[0]
        self.assertEqual(card["id"], "card_image")
        self.assertEqual(mode, {
            "id": "qwen_lighting", "name": "灯光模式", "slots": "img1+aud0+vid0",
        })
        for key in ("id", "name", "slots"):
            self.assertEqual(self.cap[key], mode[key])
        self.assertEqual(self.cap["card"], card["id"])
        self.assertEqual(self.cap["kind"], "gen")
        toolbox = next(card for card in cards if card["id"] == "card_tools")
        self.assertNotIn("qwen_lighting", [mode["id"] for mode in toolbox["modes"]])
        self.assertEqual(self.cap["outputType"], "image")
        self.assertEqual([self.cap[k] for k in ("images", "audios", "videos")], [1, 0, 0])
        self.assertEqual(self.cap["slotLimits"], {
            "image": {"min": 1, "max": 1},
            "audio": {"min": 0, "max": 0}, "video": {"min": 0, "max": 0},
        })
        self.assertEqual(self.cap["parameterPanel"], "lighting")
        self.assertIs(self.cap["compare"], True)
        self.assertEqual(self.cap["output"], {"node": "115"})
        image = self.fields["images[0]"]
        self.assertEqual(image["type"], "image")
        self.assertIs(image["required"], True)
        self.assertEqual(image["target"], {
            "node": "41", "input": "image", "kind": "upload_image",
        })

    def test_manifest_targets_defaults_and_custom_panel_mirrors(self):
        expected = {
            "images[0]": ("41", "image"), "negative_prompt": ("69", "prompt"),
            "megapixels": ("84", "megapixels"), "steps": ("65", "steps"), "seed": ("65", "seed"),
            **{key: ("114", key) for key in LIGHT_DEFAULTS},
        }
        self.assertEqual(len(self.fields), len(self.cap["inputs"]))
        self.assertEqual(set(self.fields), set(expected))
        self.assertEqual(self.cap["source"], self.cap["graph"])
        self.assertNotIn("prompt", self.fields)
        self.assertNotIn("light_configs_json", self.fields)
        for key, (node_id, input_name) in expected.items():
            with self.subTest(key=key):
                target = self.fields[key]["target"]
                self.assertEqual((target["node"], target["input"]), (node_id, input_name))
                if "default" in self.fields[key]:
                    self.assertEqual(self.fields[key]["default"], self.graph[node_id]["inputs"][input_name])
        for key, default in LIGHT_DEFAULTS.items():
            with self.subTest(light=key):
                field = self.fields[key]
                self.assertIs(field["mirror"], True)
                self.assertIs(field["advanced"], True)
                self.assertEqual(field["default"], default)
        for key, low, high, step, vtype in (
            ("light_azimuth", 0, 360, 1, "INT"),
            ("light_elevation", -90, 90, 1, "INT"),
            ("light_intensity", 0, 10, 0.1, "FLOAT"),
        ):
            field = self.fields[key]
            self.assertEqual([field[k] for k in ("type", "min", "max", "step")],
                             ["slider", low, high, step])
            self.assertEqual(field["target"]["vtype"], vtype)
        self.assertEqual(self.fields["light_color_hex"]["target"]["vtype"], "STRING")
        self.assertEqual(self.fields["cinematic_mode"]["type"], "boolean")
        self.assertEqual(self.fields["cinematic_mode"]["target"]["vtype"], "BOOLEAN")
        self.assertEqual(self.fields["negative_prompt"]["type"], "textarea")
        self.assertIs(self.fields["negative_prompt"]["advanced"], True)
        self.assertEqual(self.fields["negative_prompt"]["default"], NEGATIVE_PROMPT)
        self.assertEqual([self.fields["megapixels"][k] for k in ("type", "default", "min", "max", "step")],
                         ["slider", 1.5, 0.25, 16, 0.01])
        for key in ("seed", "steps", "megapixels"):
            self.assertIs(self.fields[key]["advanced"], False)
        self.assertEqual(self.fields["megapixels"]["target"]["vtype"], "FLOAT")
        self.assertEqual(self.fields["steps"]["default"], 4)
        self.assertEqual(self.fields["seed"]["default"], 1002)
        for key in ("steps", "seed"):
            self.assertEqual(self.fields[key]["target"]["vtype"], "INT")

    def test_exact_source_models_sampling_and_reference_images(self):
        expected = {
            "12": {"unet_name": "qwen_image_edit_2511_fp8_e4m3fn_scaled_lightning_comfyui.safetensors",
                   "weight_dtype": "fp8_e4m3fn"},
            "117": {"model": ["12", 0], "lora_name": "Qwen-Edit-2511_LightningRemap_Alpha0.2.safetensors",
                    "strength_model": 1},
            "61": {"clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors", "type": "qwen_image", "device": "default"},
            "10": {"vae_name": "qwen_image_vae.safetensors"},
            "67": {"model": ["117", 0], "shift": 3.1, "sampling": "flow"},
            "64": {"model": ["67", 0], "strength": 0.95, "pre_cfg": False},
            "65": {"model": ["64", 0], "positive": ["70", 0], "negative": ["71", 0],
                   "latent_image": ["85", 0], "seed": 1002, "steps": 4, "cfg": 1,
                   "sampler_name": "euler", "scheduler": "simple", "denoise": 1},
            "41": {"image": ""},
            "84": {"image": ["41", 0], "upscale_method": "lanczos", "megapixels": 1.5, "resolution_steps": 1},
            "85": {"pixels": ["84", 0], "vae": ["10", 0]},
            "114": {**LIGHT_DEFAULTS, "image": ["41", 0], "light_configs_json": "[]"},
            "68": {"clip": ["61", 0], "vae": ["10", 0], "image1": ["41", 0], "prompt": ["114", 0]},
            "69": {"clip": ["61", 0], "vae": ["10", 0], "image1": ["41", 0], "prompt": NEGATIVE_PROMPT},
            "70": {"conditioning": ["68", 0], "reference_latents_method": "index_timestep_zero"},
            "71": {"conditioning": ["69", 0], "reference_latents_method": "index_timestep_zero"},
            "8": {"samples": ["65", 0], "vae": ["10", 0]},
            "115": {"images": ["8", 0], "filename_prefix": "ComfyUI"},
        }
        self.assertEqual({nid: node["inputs"] for nid, node in self.graph.items()}, expected)
        self.assertIs(self.graph["64"]["inputs"]["pre_cfg"], False)

    def test_archive_matches_api_topology_models_and_reference_settings(self):
        links = {link[0]: link for link in self.workflow["links"]}
        self.assertEqual(len(links), len(self.workflow["links"]))
        self.assertEqual(set(self.nodes) - set(self.graph), {"66", "100", "72"})
        for nid, node in self.graph.items():
            native = self.nodes[nid]
            self.assertEqual(native["type"], node["class_type"])
            self.assertEqual(native["mode"], 0, f"{nid} must remain ACTIVE")
            native_inputs = {slot["name"]: slot for slot in native["inputs"]}
            for key, value in node["inputs"].items():
                with self.subTest(node=nid, input=key):
                    slot = native_inputs.get(key)
                    if isinstance(value, list):
                        link = links[slot["link"]]
                        self.assertEqual([str(link[1]), link[2]], value)
                        self.assertEqual([str(link[3]), link[4]], [nid, native["inputs"].index(slot)])
                    elif nid == "114" or (nid == "41" and key == "image"):
                        continue  # Native source sample and Chouka defaults intentionally differ.
                    else:
                        self.assertIsNone(slot["link"])
                        self.assertEqual(native["widgets_values_named"][key], value)
        for link_id, origin, output_index, target, input_index, _ in self.workflow["links"]:
            self.assertIn(link_id, self.nodes[str(origin)]["outputs"][output_index]["links"])
            self.assertEqual(self.nodes[str(target)]["inputs"][input_index]["link"], link_id)

    def test_native_archive_has_one_consistent_original_purple_sample(self):
        light = self.nodes["114"]
        self.assertEqual(light["_activeConfigIndex"], 0)
        self.assertEqual(light["_lightConfigs"], [SOURCE_SAMPLE])
        self.assertNotIn("extensions", light)
        named = light["widgets_values_named"]
        self.assertEqual([named[key] for key in LIGHT_DEFAULTS], [259, 43, 0, "#d35fe3", True])
        self.assertEqual(json.loads(named["light_configs_json"]), [SOURCE_SAMPLE])
        self.assertEqual(light["widgets_values"], list(named.values()))
        self.assertEqual(self.nodes["68"]["widgets_values"], [""])
        self.assertEqual(self.nodes["68"]["widgets_values_named"], {"prompt": ""})
        self.assertEqual(self.nodes["100"]["widgets_values"], [SOURCE_PROMPT])
        self.assertEqual(self.nodes["100"]["widgets_values_named"], {"text": SOURCE_PROMPT})
        self.assertEqual(self.nodes["66"]["type"], "EmptySD3LatentImage")
        self.assertEqual(self.nodes["66"]["outputs"][0]["links"], [])

    def test_all_api_nodes_reach_output_without_cycles_and_have_chinese_progress(self):
        visited, active = set(), set()

        def visit(node_id):
            self.assertIn(node_id, self.graph)
            self.assertNotIn(node_id, active, "Graph contains a cycle")
            if node_id in visited:
                return
            active.add(node_id)
            for value in self.graph[node_id]["inputs"].values():
                if isinstance(value, list):
                    self.assertEqual(len(value), 2)
                    self.assertIsInstance(value[0], str)
                    self.assertEqual(value[1], 0)
                    visit(value[0])
            active.remove(node_id)
            visited.add(node_id)

        visit(self.cap["output"]["node"])
        self.assertEqual(visited, set(self.graph), "Graph has unused or disconnected nodes")
        self.assertEqual(self.graph["114"]["class_type"], "QwenMultiangleLightningNode")
        labels = app.step_labels(self.graph)
        for nid, node in self.graph.items():
            self.assertRegex(node["_meta"]["title"], r"[\u4e00-\u9fff]")
            self.assertRegex(labels[nid], r"[\u4e00-\u9fff]")

    def test_patch_graph_uses_scalars_including_zero_false_and_ignores_stale_prompt(self):
        cases = [
            {"light_azimuth": 0, "light_elevation": 0, "light_intensity": 0,
             "light_color_hex": "#000000", "cinematic_mode": False},
            {"light_azimuth": 259, "light_elevation": 43, "light_intensity": 7.5,
             "light_color_hex": "#d35fe3", "cinematic_mode": True},
            {"light_azimuth": "360", "light_elevation": "-90", "light_intensity": "10",
             "light_color_hex": "#123abc", "cinematic_mode": False},
        ]
        for values in cases:
            with self.subTest(values=values):
                graph = app.patch_graph(self.cap, {
                    **values, "prompt": "陈旧的前端拼接提示词", "light_configs_json": '[{"intensity": 9}]',
                    "negative_prompt": "过曝", "megapixels": "2.25", "steps": "5", "seed": 0,
                }, {"images[0]": "chouka/lighting-source.png"})
                light = graph["114"]["inputs"]
                self.assertEqual(light["light_azimuth"], int(values["light_azimuth"]))
                self.assertIsInstance(light["light_azimuth"], int)
                self.assertEqual(light["light_elevation"], int(values["light_elevation"]))
                self.assertIsInstance(light["light_elevation"], int)
                self.assertEqual(light["light_intensity"], float(values["light_intensity"]))
                self.assertIsInstance(light["light_intensity"], float)
                self.assertEqual(light["light_color_hex"], values["light_color_hex"])
                self.assertIs(light["cinematic_mode"], values["cinematic_mode"])
                self.assertEqual(light["light_configs_json"], "[]")
                self.assertEqual(graph["68"]["inputs"]["prompt"], ["114", 0])
                self.assertEqual(graph["69"]["inputs"]["prompt"], "过曝")
                self.assertEqual(graph["84"]["inputs"]["megapixels"], 2.25)
                self.assertEqual(graph["65"]["inputs"]["steps"], 5)
                self.assertEqual(graph["65"]["inputs"]["seed"], 0)
                self.assertEqual(graph["41"]["inputs"]["image"], "chouka/lighting-source.png")
                for nid in ("68", "69"):
                    self.assertEqual(graph[nid]["inputs"]["image1"], ["41", 0])
                self.assertEqual(light["image"], ["41", 0])
        self.assertEqual(read_json(self.cap["graph"]), self.graph)

    def test_patch_graph_preserves_defaults_without_lighting_params_and_requires_image(self):
        graph = app.patch_graph(self.cap, {"seed": 1002, "prompt": "stale"}, {"images[0]": "one.png"})
        self.assertEqual(graph["114"]["inputs"], self.graph["114"]["inputs"])
        self.assertEqual(graph["68"]["inputs"]["prompt"], ["114", 0])
        with self.assertRaises(web.HTTPBadRequest):
            app.patch_graph(self.cap, {}, {})

    def test_note_discloses_original_plugin_remap_and_native_archive(self):
        for text in ("QwenMultiangleLightningNode", "ComfyUI-qwenmultianglelight", "ff08430033dc987e65e6bcae472c96b808120255",
                     "Qwen-Edit-2511_LightningRemap_Alpha0.2.safetensors", "qwen_lighting.workflow.json", "实机验收"):
            self.assertIn(text, self.cap["note"])


class QwenLightingRuntimeTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def test_reload_and_authenticated_http_dry_run_use_real_manifest_and_patch_graph(self):
        self.auth_setup()
        self.addCleanup(self.auth_teardown)
        self.own_project("p")
        self.register_asset("lighting.png")
        self.enterContext(mock.patch.object(app, "PROJ_DIR", self.root / "data" / "projects"))
        application = self.build_app()
        application.router.add_post("/api/reload", app.api_reload)
        application.router.add_get("/api/cards", app.api_cards)
        application.router.add_post("/api/generate", app.api_generate)
        with mock.patch.object(app, "CONTROLLER_MODE", False), \
             mock.patch.object(app, "comfy_submit", side_effect=AssertionError("dry-run must not submit")) as submit, \
             mock.patch.object(app, "comfy_upload", side_effect=AssertionError("dry-run must not upload")) as upload:
            async with TestClient(TestServer(application)) as client:
                self.client = client
                self.origin = str(client.make_url('/')).rstrip('/')
                client.session.headers.update(await self.login())
                response = await client.post("/api/reload")
                self.assertEqual(response.status, 200)
                self.assertTrue((await response.json())["ok"])
                response = await client.get("/api/cards")
                self.assertEqual(response.status, 200)
                data = await response.json()
                cap = data["capabilities"]["qwen_lighting"]
                self.assertEqual(cap["parameterPanel"], "lighting")
                self.assertIs(cap["compare"], True)
                fields = {field["key"]: field for field in cap["inputs"]}
                self.assertNotIn("prompt", fields)
                for key in LIGHT_DEFAULTS:
                    self.assertEqual(fields[key]["target"]["node"], "114")
                    self.assertIs(fields[key]["mirror"], True)
                    self.assertIs(fields[key]["advanced"], True)
                for values in (
                    {"light_azimuth": 0, "light_elevation": 0, "light_intensity": 0,
                     "light_color_hex": "#000000", "cinematic_mode": False},
                    {"light_azimuth": 259, "light_elevation": 43, "light_intensity": 10,
                     "light_color_hex": "#d35fe3", "cinematic_mode": False},
                ):
                    with self.subTest(values=values):
                        response = await client.post("/api/generate", json={
                            "capability": "qwen_lighting", "dry_run": True, "project": "p",
                            "assets": {"images[0]": "chouka/lighting.png"},
                            "params": {**values, "seed": 42, "steps": 5, "megapixels": 2.25,
                                       "negative_prompt": "过曝", "prompt": "旧春节提示词",
                                       "light_configs_json": '[{"intensity": 9}]'},
                        })
                        self.assertEqual(response.status, 200, await response.text())
                        result = await response.json()
                        self.assertIs(result["dry_run"], True)
                        diff = result["changed"]
                        for key, value in values.items():
                            self.assertEqual(diff[f"#114.{key}"][1], value)
                        self.assertIs(diff["#114.cinematic_mode"][1], False)
                        self.assertEqual(diff["#41.image"][1], "chouka/lighting.png")
                        self.assertEqual(diff["#65.seed"][1], 42)
                        self.assertEqual(diff["#65.steps"][1], 5)
                        self.assertEqual(diff["#84.megapixels"][1], 2.25)
                        self.assertEqual(diff["#69.prompt"][1], "过曝")
                        self.assertNotIn("#68.prompt", diff)
                        self.assertNotIn("#114.light_configs_json", diff)
                response = await client.post("/api/generate", json={
                    "capability": "qwen_lighting", "dry_run": True, "project": "p", "assets": {},
                })
                self.assertEqual(response.status, 400)
            submit.assert_not_called()
            upload.assert_not_called()


class QwenLightingLocalPluginTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        default = ROOT.parent / "ComfyUI/custom_nodes/ComfyUI-qwenmultianglelight/nodes.py"
        path = Path(os.environ.get("CHOUKA_TEST_LIGHTING_PLUGIN", str(default)))
        if not path.is_file():
            if "CHOUKA_TEST_LIGHTING_PLUGIN" in os.environ:
                raise AssertionError(f"Explicit local plugin does not exist: {path}")
            raise unittest.SkipTest(
                "Local plugin is outside the isolated snapshot; rerun with "
                "CHOUKA_TEST_LIGHTING_PLUGIN=<real ComfyUI-qwenmultianglelight/nodes.py>. "
                "This skip is not plugin verification."
            )
        spec = importlib.util.spec_from_file_location("qwen_lighting_local_plugin", path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        cls.plugin_class = module.NODE_CLASS_MAPPINGS["QwenMultiangleLightningNode"]
        cls.plugin_path = path
        print(f"Real CPU-only lighting plugin imported from {path}")

    def prompt(self, values, configs="[]"):
        result = self.plugin_class().generate_lighting_prompt(
            **values, light_configs_json=configs, image=None, unique_id="114",
        )
        self.assertEqual(len(result["result"]), 1)
        prompts = result["result"][0]
        self.assertIsInstance(prompts, list)
        self.assertEqual(len(prompts), 1, "One light must produce exactly one downstream prompt")
        return prompts[0]

    def assert_scalar_matches_single_json(self, values):
        sample = {"azimuth": values["light_azimuth"], "elevation": values["light_elevation"],
                  "intensity": values["light_intensity"], "color": values["light_color_hex"]}
        scalar = self.prompt(values)
        # Different fallback values ensure the JSON branch really reads the single saved light.
        fallback = {**values, "light_azimuth": 180, "light_elevation": -90,
                    "light_intensity": 10, "light_color_hex": "#010203"}
        self.assertEqual(scalar, self.prompt(fallback, json.dumps([sample])))
        return scalar

    def test_real_node_declares_single_list_output_and_hidden_json(self):
        self.assertEqual(self.plugin_class.OUTPUT_IS_LIST, (True,))
        self.assertEqual(self.plugin_class.RETURN_TYPES, ("STRING",))
        self.assertEqual(self.plugin_class.FUNCTION, "generate_lighting_prompt")
        inputs = self.plugin_class.INPUT_TYPES()
        self.assertEqual(set(inputs["required"]), set(LIGHT_DEFAULTS))
        self.assertEqual(inputs["hidden"]["light_configs_json"], ("STRING", {"default": "[]"}))
        self.assertEqual(inputs["hidden"]["unique_id"], "UNIQUE_ID")
        self.assertIn("image", inputs["optional"])

    def test_comfy_get_input_data_collects_hidden_json_with_real_plugin_class(self):
        # Execute unchanged definitions from local ComfyUI, not execution.py's GPU-heavy imports.
        # The node under test is the actual imported plugin; no fake node or input-info stub.
        comfy = self.plugin_path.resolve().parents[2]
        namespace = {"__name__": "qwen_lighting_real_comfy_definitions"}
        for relative, name in (
            ("comfy_api/internal/__init__.py", "_ComfyNodeInternal"),
            ("comfy_execution/graph_utils.py", "is_link"),
            ("comfy_execution/graph.py", "get_input_info"),
            ("execution.py", "get_input_data"),
        ):
            path = comfy / relative
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
            definition = next(node for node in tree.body
                              if isinstance(node, (ast.FunctionDef, ast.ClassDef)) and node.name == name)
            module = ast.Module(body=[definition], type_ignores=[])
            exec(compile(module, str(path), "exec", flags=__future__.annotations.compiler_flag,
                         dont_inherit=True), namespace)
        self.assertFalse(issubclass(self.plugin_class, namespace["_ComfyNodeInternal"]))
        self.assertEqual(namespace["get_input_info"](self.plugin_class, "light_configs_json"),
                         ("STRING", "hidden", {"default": "[]"}))
        collect = namespace["get_input_data"]
        self.assertEqual(Path(collect.__code__.co_filename), comfy / "execution.py")
        cap = read_json("manifests/qwen_lighting.json")
        cases = (
            LIGHT_DEFAULTS,
            {"light_azimuth": 0, "light_elevation": 0, "light_intensity": 0,
             "light_color_hex": "#000000", "cinematic_mode": False},
        )
        for values in cases:
            with self.subTest(values=values):
                graph = app.patch_graph(cap, {**values, "seed": 1002}, {"images[0]": "one.png"})
                inputs = graph["114"]["inputs"]
                data, missing, v3 = collect(inputs, self.plugin_class, "114")
                self.assertEqual(data["light_configs_json"], ["[]"])
                self.assertEqual(data["unique_id"], ["114"])
                for key, value in values.items():
                    self.assertEqual(data[key], [value])
                    self.assertIs(type(data[key][0]), type(inputs[key]))
                # No image is loaded: the real collector marks the upstream link unresolved.
                self.assertEqual(missing, {"image": True})
                self.assertEqual(data["image"], (None,))
                self.assertEqual(v3, {"hidden_inputs": {}})
                kwargs = {key: value[0] for key, value in data.items()}
                result = self.plugin_class().generate_lighting_prompt(**kwargs)
                self.assertEqual(result["result"], ([self.prompt(values)],))
        # A nonempty hidden value must also survive collection, not silently fall back to [].
        inputs = {**LIGHT_DEFAULTS, "light_configs_json": json.dumps([SOURCE_SAMPLE])}
        data, missing, _ = collect(inputs, self.plugin_class, "114")
        self.assertEqual(data["light_configs_json"], [inputs["light_configs_json"]])
        self.assertEqual(missing, {})
        result = self.plugin_class().generate_lighting_prompt(**{key: value[0] for key, value in data.items()})
        self.assertEqual(result["result"], ([SOURCE_PROMPT],))
        print(f"Real ComfyUI get_input_data + get_input_info AST executed from {comfy}; real plugin class, no GPU")

    def test_source_sample_complete_prompt_and_list_length(self):
        values = {"light_azimuth": 259, "light_elevation": 43, "light_intensity": 0,
                  "light_color_hex": "#d35fe3", "cinematic_mode": True}
        self.assertEqual(self.assert_scalar_matches_single_json(values), SOURCE_PROMPT)
        self.assertEqual(self.prompt(values, json.dumps([SOURCE_SAMPLE])), SOURCE_PROMPT)

    def test_original_default_and_cinematic_false_complete_prompts(self):
        expected = (
            "SCENE LOCK, FIXED VIEWPOINT, maintaining character consistency and pose. RELIGHTING ONLY: "
            "light source from the front-right, high-angle light source, soft colored light (#ffffff)"
        )
        self.assertEqual(self.assert_scalar_matches_single_json(LIGHT_DEFAULTS), expected + ", cinematic relighting")
        self.assertEqual(self.assert_scalar_matches_single_json({**LIGHT_DEFAULTS, "cinematic_mode": False}), expected)

    def test_intensity_boundaries_match_original_plugin_not_frontend_rewording(self):
        for value, word in ((0, "soft"), (2.9, "soft"), (3, "bright"), (6.9, "bright"), (7, "intense"), (10, "intense")):
            with self.subTest(intensity=value):
                prompt = self.assert_scalar_matches_single_json({**LIGHT_DEFAULTS, "light_intensity": value})
                self.assertIn(f", {word} colored light (#ffffff), cinematic relighting", prompt)

    def test_azimuth_bins_and_wraparound(self):
        cases = (
            (0, "in front"), (22, "in front"), (22.5, "from the front-right"),
            (67, "from the front-right"), (67.5, "from the right"),
            (112, "from the right"), (112.5, "from the back-right"),
            (157, "from the back-right"), (157.5, "from behind"),
            (202, "from behind"), (202.5, "from the back-left"),
            (247, "from the back-left"), (247.5, "from the left"),
            (292, "from the left"), (292.5, "from the front-left"),
            (337, "from the front-left"), (337.5, "in front"), (360, "in front"),
        )
        for azimuth, description in cases:
            with self.subTest(azimuth=azimuth):
                prompt = self.assert_scalar_matches_single_json({**LIGHT_DEFAULTS, "light_azimuth": azimuth})
                self.assertIn(f"RELIGHTING ONLY: light source {description}, high-angle light source,", prompt)

    def test_elevation_bins_including_negative_angles_and_edges(self):
        cases = (
            (-90, "uplighting, light source positioned below the character, light shining upwards"),
            (-31, "uplighting, light source positioned below the character, light shining upwards"),
            (-30, "low-angle light source from below, upward illumination"),
            (-11, "low-angle light source from below, upward illumination"),
            (-10, "horizontal level light source"), (0, "horizontal level light source"),
            (19, "horizontal level light source"), (20, "high-angle light source"),
            (59, "high-angle light source"), (60, "overhead top-down light source"),
            (90, "overhead top-down light source"),
        )
        for elevation, description in cases:
            with self.subTest(elevation=elevation):
                prompt = self.assert_scalar_matches_single_json({**LIGHT_DEFAULTS, "light_elevation": elevation})
                self.assertIn(f", {description}, soft colored light", prompt)


if __name__ == "__main__":
    unittest.main()
