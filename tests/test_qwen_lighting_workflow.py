"""Static JSON contract tests; no server import, network or GPU execution."""

import copy
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
NEGATIVE_PROMPT = "泛黄，AI感，不真实，丑陋，油腻的皮肤，异常的肢体，不协调的肢体"


def read_json(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


class QwenLightingWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.cap = read_json("manifests/qwen_lighting.json")
        self.graph = read_json(self.cap["graph"])
        self.fields = {field["key"]: field for field in self.cap["inputs"]}

    def test_image_generation_mode_and_single_image_contract(self):
        cards = read_json("manifests/_cards.json")
        matches = [(card, mode) for card in cards for mode in card["modes"]
                   if mode["id"] == "qwen_lighting"]
        self.assertEqual(len(matches), 1)
        card, mode = matches[0]
        self.assertEqual(card["id"], "card_image")
        self.assertEqual(mode, {
            "id": "qwen_lighting", "name": "灯光模式", "slots": "img1+aud0+vid0",
            "modelSwitch": {"qwen2511": "qwen_lighting", "qwen21": "qwen_lighting_21"},
        })
        self.assertEqual(self.cap["id"], mode["id"])
        self.assertEqual(self.cap["name"], mode["name"])
        self.assertEqual(self.cap["slots"], mode["slots"])
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

    def test_manifest_only_exposes_mapped_backend_inputs(self):
        self.assertEqual(len(self.fields), len(self.cap["inputs"]))
        expected = {
            "images[0]": ("41", "image"), "prompt": ("68", "prompt"),
            "negative_prompt": ("69", "prompt"), "megapixels": ("84", "megapixels"),
            "steps": ("65", "steps"), "seed": ("65", "seed"),
        }
        self.assertEqual(set(self.fields), set(expected))
        self.assertEqual(self.cap["source"], self.cap["graph"])
        for key, (node_id, input_name) in expected.items():
            with self.subTest(key=key):
                target = self.fields[key]["target"]
                self.assertEqual((target["node"], target["input"]), (node_id, input_name))
                self.assertIn(node_id, self.graph)
                self.assertIn(input_name, self.graph[node_id]["inputs"])
                if "default" in self.fields[key]:
                    self.assertEqual(self.fields[key]["default"],
                                     self.graph[node_id]["inputs"][input_name])

    def test_prompt_defaults_and_advanced_parameters(self):
        for key in ("prompt", "negative_prompt"):
            self.assertEqual(self.fields[key]["type"], "textarea")
            self.assertIs(self.fields[key]["advanced"], True)
        prompt = self.fields["prompt"]["default"]
        for safety in ("仅调整", "保留原图", "不新增或删除内容"):
            self.assertIn(safety, prompt)
        self.assertEqual(self.fields["negative_prompt"]["default"], NEGATIVE_PROMPT)
        self.assertEqual(self.graph["69"]["inputs"]["prompt"], NEGATIVE_PROMPT)
        mp = self.fields["megapixels"]
        self.assertEqual([mp[k] for k in ("type", "default", "min", "max", "step")],
                         ["slider", 1.5, 0.25, 16, 0.01])
        for key in ("seed", "steps", "megapixels"):
            self.assertIs(self.fields[key]["advanced"], False)
        self.assertEqual(mp["target"]["vtype"], "FLOAT")
        self.assertEqual(self.fields["steps"]["type"], "slider")
        self.assertEqual(self.fields["steps"]["default"], 4)
        self.assertEqual(self.fields["seed"]["type"], "seed")
        self.assertEqual(self.fields["seed"]["default"], 1002)
        for key in ("steps", "seed"):
            self.assertEqual(self.fields[key]["target"]["vtype"], "INT")

    def test_original_image_path_and_processing_resolution(self):
        self.assertEqual(self.graph["41"]["inputs"], {"image": ""})
        self.assertEqual(self.graph["84"]["inputs"], {
            "image": ["41", 0], "upscale_method": "lanczos",
            "megapixels": 1.5, "resolution_steps": 1,
        })
        self.assertEqual(self.graph["85"]["inputs"], {
            "pixels": ["84", 0], "vae": ["118", 0],
        })
        for node_id in ("68", "69"):
            inputs = self.graph[node_id]["inputs"]
            self.assertEqual(inputs["image1"], ["41", 0])
            self.assertNotIn("image2", inputs)
            self.assertNotIn("image3", inputs)
        self.assertEqual(self.graph["65"]["inputs"]["latent_image"], ["85", 0])

    def test_local_same_version_model_and_lora_are_explicit(self):
        self.assertEqual(self.graph["9"]["inputs"], {
            "unet_name": "qwen_image_edit_2511_bf16.safetensors",
            "weight_dtype": "fp8_e4m3fn",
        })
        self.assertEqual(self.graph["10"]["inputs"], {
            "model": ["9", 0],
            "lora_name": "Qwen-Image-Edit-2511-Lightning-4steps-V1-bf16.safetensors",
            "strength_model": 1,
        })
        reference = read_json("graphs/qwen_image_edit_2511_i2i.api.json")
        for node_id in ("9", "10"):
            self.assertEqual(self.graph[node_id]["inputs"], reference[node_id]["inputs"])
        self.assertEqual(self.graph["117"]["inputs"], {
            "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
            "type": "qwen_image", "device": "default",
        })
        self.assertEqual(self.graph["118"]["inputs"], {"vae_name": "qwen_image_vae.safetensors"})
        for node_id in ("68", "69"):
            self.assertEqual(self.graph[node_id]["inputs"]["clip"], ["117", 0])
            self.assertEqual(self.graph[node_id]["inputs"]["vae"], ["118", 0])
        self.assertEqual(self.graph["8"]["inputs"], {
            "samples": ["65", 0], "vae": ["118", 0],
        })
        self.assertEqual(self.graph["115"]["inputs"], {
            "images": ["8", 0], "filename_prefix": "ComfyUI",
        })

    def test_original_sampling_and_reference_settings(self):
        self.assertEqual(self.graph["67"]["inputs"], {"model": ["10", 0], "shift": 3.1})
        self.assertEqual(self.graph["64"]["inputs"], {"model": ["67", 0], "strength": 0.95})
        self.assertEqual(self.graph["65"]["inputs"], {
            "model": ["64", 0], "positive": ["70", 0], "negative": ["71", 0],
            "latent_image": ["85", 0], "seed": 1002, "steps": 4, "cfg": 1,
            "sampler_name": "euler", "scheduler": "simple", "denoise": 1,
        })
        for method, encoder in (("70", "68"), ("71", "69")):
            self.assertEqual(self.graph[method]["inputs"], {
                "conditioning": [encoder, 0], "reference_latents_method": "index_timestep_zero",
            })

    def test_graph_has_only_known_nodes_and_chinese_progress_labels(self):
        expected = {
            "41": "LoadImage", "84": "ImageScaleToTotalPixels", "85": "VAEEncode",
            "68": "TextEncodeQwenImageEditPlus", "69": "TextEncodeQwenImageEditPlus",
            "70": "FluxKontextMultiReferenceLatentMethod",
            "71": "FluxKontextMultiReferenceLatentMethod",
            "9": "UNETLoader", "10": "LoraLoaderModelOnly", "67": "ModelSamplingAuraFlow",
            "64": "CFGNorm", "117": "CLIPLoader", "118": "VAELoader",
            "65": "KSampler", "8": "VAEDecode", "115": "SaveImage",
        }
        self.assertEqual({nid: node["class_type"] for nid, node in self.graph.items()}, expected)
        for node_id, node in self.graph.items():
            with self.subTest(node=node_id):
                self.assertRegex(node["_meta"]["title"], r"[\u4e00-\u9fff]")
        serialized = json.dumps(self.graph)
        for forbidden in ("QwenMultiangleLightningNode", "RHHiddenNodes", "Anything",
                          "light_azimuth", "light_color_hex", "light_configs_json"):
            self.assertNotIn(forbidden, serialized)

    def test_all_graph_links_exist_and_reach_output_without_cycles(self):
        visited = set()
        active = set()

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

    def test_declared_target_assignment_contract_without_server(self):
        # Exercise JSON targets only, not the real backend adapter or patch_graph.
        values = {
            "images[0]": "chouka/lighting-source.png", "prompt": "从左上方添加柔和暖光",
            "negative_prompt": "过曝", "megapixels": 2.25, "steps": 4, "seed": 42,
        }
        patched = copy.deepcopy(self.graph)
        for key, value in values.items():
            target = self.fields[key]["target"]
            patched[target["node"]]["inputs"][target["input"]] = value
        self.assertEqual(patched["41"]["inputs"]["image"], values["images[0]"])
        self.assertEqual(patched["68"]["inputs"]["prompt"], values["prompt"])
        self.assertEqual(patched["69"]["inputs"]["prompt"], values["negative_prompt"])
        self.assertEqual(patched["84"]["inputs"]["megapixels"], 2.25)
        self.assertEqual(patched["65"]["inputs"]["seed"], 42)
        self.assertEqual(patched["65"]["inputs"]["steps"], 4)
        for node_id in ("68", "69"):
            self.assertEqual(patched[node_id]["inputs"]["image1"], ["41", 0])

    def test_note_discloses_hidden_dependency_replacement(self):
        note = self.cap["note"]
        for disclosure in ("同版本本地接入", "QwenMultiangleLightningNode", "RHHiddenNodes",
                           "隐藏依赖未移植", "不宣称", "2511", "四步", "前端", "params.prompt"):
            self.assertIn(disclosure, note)


if __name__ == "__main__":
    unittest.main()
