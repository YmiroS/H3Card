import json
import sys
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

import app


class H3MemoryWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.cap = json.loads((ROOT / "manifests/minimax_h3_ref_2pass.json").read_text(encoding="utf-8"))
        self.assets = {
            "video[0]": "chouka/reference.mp4",
            "images[0]": "chouka/one.png",
            "images[1]": "chouka/two.png",
            "images[2]": "chouka/three.png",
        }

    def graph(self, params=None, has_audio=True):
        with mock.patch.object(app, "probe_video", return_value={"has_audio": has_audio}):
            return app.patch_graph(self.cap, params or {}, self.assets)

    def test_video_frame_cap_follows_generation_duration(self):
        for duration, aligned_frames in ((3, 73), (5, 124), (8, 192)):
            with self.subTest(duration=duration):
                graph = self.graph({"duration": duration})
                self.assertEqual(graph["132"]["inputs"]["value"], duration)
                loader = graph["221"]["inputs"]
                self.assertEqual(loader["force_rate"], 24)
                self.assertEqual(loader["frame_load_cap"], graph["186"]["inputs"]["length"])
                self.assertEqual(loader["frame_load_cap"], aligned_frames)
                trims = [node for key, node in graph.items() if key.startswith("follow_reference_trim_")]
                self.assertTrue(trims)
                self.assertTrue(all(node["inputs"]["length"] == duration * 24 for node in trims))
                self.assertEqual(loader["start_time"], 0)

    def test_one_video_three_images_and_paired_audio_are_preserved(self):
        inputs = self.graph()["186"]["inputs"]
        images = [name for name in inputs if name.startswith("ref_images.")]
        self.assertEqual(len(images), 3)
        self.assertEqual(inputs["ref_videos.ref_video_0"], ["221", 0])
        self.assertEqual(inputs["ref_video_audios.ref_video_audio_0"], ["221", 2])
        silent = self.graph(has_audio=False)["186"]["inputs"]
        self.assertIn("ref_videos.ref_video_0", silent)
        self.assertNotIn("ref_video_audios.ref_video_audio_0", silent)

    def test_chunk_patches_feed_both_sampling_passes_without_quality_downgrade(self):
        graph = self.graph()
        self.assertEqual(graph["233"]["class_type"], "MiniMaxLowVRAMAttention")
        self.assertEqual(graph["233"]["inputs"], {"model": ["231", 0], "head_chunks": 4})
        self.assertEqual(graph["234"]["class_type"], "MiniMaxChunkFeedForward")
        self.assertEqual(graph["234"]["inputs"], {
            "model": ["233", 0], "chunks": 4, "seq_threshold": 4096,
        })
        self.assertEqual(graph["232"]["inputs"]["model"], ["234", 0])
        self.assertEqual(graph["126"]["inputs"]["model"], ["232", 0])
        self.assertEqual(graph["199"]["inputs"]["model"], ["232", 0])
        self.assertEqual(graph["204"]["inputs"]["model"], ["232", 0])
        self.assertEqual(graph["199"]["inputs"]["scale_by"], 1.5)
        self.assertFalse(graph["199"]["inputs"]["upscale_references"])
        self.assertEqual(graph["124"]["inputs"]["steps"], 20)
        self.assertEqual(graph["203"]["inputs"]["step"], 10)
        self.assertEqual(graph["132"]["inputs"]["value"], 5)
        self.assertEqual(graph["115"]["inputs"]["megapixels"], 0.4)

    def test_chunk_nodes_have_bundled_chinese_progress_labels(self):
        steps = json.loads((ROOT / "manifests/_steps.json").read_text(encoding="utf-8"))
        for name in ("MiniMaxLowVRAMAttention", "MiniMaxChunkFeedForward"):
            self.assertRegex(steps[name], r"[\u4e00-\u9fff]")


class H3HalfBF16WorkflowTest(unittest.TestCase):
    cid = "minimax_h3_ref_2pass_bf16"

    def setUp(self):
        self.cap = json.loads((ROOT / "manifests" / (self.cid + ".json")).read_text(encoding="utf-8"))
        self.old = json.loads((ROOT / "manifests/minimax_h3_ref_2pass.json").read_text(encoding="utf-8"))
        self.raw = json.loads((ROOT / self.cap["graph"]).read_text(encoding="utf-8"))

    def test_registration_and_rescan(self):
        import scan_workflows as scan
        cards = json.loads((ROOT / "manifests/_cards.json").read_text(encoding="utf-8"))
        video = next(c for c in cards if c["id"] == "card_video")
        with mock.patch.object(app, "CAPS", {}), mock.patch.object(app, "CARDS", []):
            app.load_caps()
            self.assertTrue(app.CAPS[self.cid]["_graph_ok"])
            live_video = next(c for c in app.CARDS if c["id"] == "card_video")
            self.assertIn(self.cid, {m["id"] for m in live_video["modes"]})
        self.assertIn(self.cid, scan.BUNDLED_CAPABILITIES)
        self.assertEqual(scan.DISPLAY[self.cid], "H3满血二采")
        mode = next(m for m in video["modes"] if m["id"] == self.cid)
        self.assertEqual(mode["name"], "H3满血二采")
        rebuilt = scan.build_modes([self.cap])
        self.assertEqual(rebuilt, [mode])
        self.assertEqual(app.MODEL_FAMILY[self.cid], "minimax_h3")

    def test_builder_cannot_reenable_acceleration(self):
        self.assertFalse({"stable_mode", "strength_model", "processing_control_value"} &
                         {i["key"] for i in self.cap["inputs"]})
        for stable in ("on", "off"):
            with mock.patch.object(app, "probe_video", return_value={"has_audio": True}):
                graph = app.patch_graph(self.cap, {
                    "stable_mode": stable, "strength_model": 2, "processing_control_value": .5,
                    "duration": 8,
                }, {"video[0]": "chouka/reference.mp4"})
            self.assertEqual(graph["127"]["inputs"]["unet_name"], "minimax_h3_ref2va_bf16.safetensors")
            self.assertEqual(graph["128"]["inputs"]["clip_name"], "qwen3vl_32b_minimax_h3_int8_convrot.safetensors")
            self.assertFalse({"230", "232"} & graph.keys())
            self.assertFalse(any(n["class_type"] in {"LoraLoaderModelOnly", "TESpeedMiniMaxH3"} for n in graph.values()))
            for node in graph.values():
                for value in node["inputs"].values():
                    if isinstance(value, list) and len(value) == 2 and isinstance(value[0], str):
                        self.assertIn(value[0], graph)
            self.assertEqual(graph["231"]["inputs"]["model"], ["127", 0])
            for nid in ("126", "124", "199", "204"):
                self.assertEqual(graph[nid]["inputs"]["model"], ["234", 0])
            self.assertEqual(graph["199"]["inputs"]["scale_by"], 1.5)
            self.assertEqual(graph["124"]["inputs"]["steps"], 20)
            self.assertEqual(graph["203"]["inputs"]["step"], 10)
            self.assertEqual(graph["221"]["inputs"]["frame_load_cap"], 192)
            self.assertEqual(graph["186"]["inputs"]["length"], 192)

    def test_only_intended_graph_changes_and_old_mode_intact(self):
        old = json.loads((ROOT / self.old["graph"]).read_text(encoding="utf-8"))
        expected = json.loads(json.dumps(old))
        def bypass(value):
            if isinstance(value, list):
                if len(value) == 2 and value[0] in ("230", "232"):
                    return bypass(old[value[0]]["inputs"]["model"])
                return [bypass(v) for v in value]
            if isinstance(value, dict):
                return {k: bypass(v) for k, v in value.items()}
            return value
        expected = {k: bypass(v) for k, v in expected.items() if k not in ("230", "232")}
        expected["127"]["inputs"]["unet_name"] = "minimax_h3_ref2va_bf16.safetensors"
        self.assertEqual(self.raw, expected)
        self.assertEqual(self.cap["source"], self.old["source"])
        for key in ("slotLimits", "slots", "output", "rewrite"):
            self.assertEqual(self.cap[key], self.old[key])
        old_specs = {i["key"]: i for i in self.old["inputs"]}
        for spec in self.cap["inputs"]:
            if spec["key"] not in ("steps", "scale_by", "output_1080p"):
                self.assertEqual(spec, old_specs[spec["key"]])
        self.assertIn("stable_mode", old_specs)
        self.assertEqual(old["230"]["inputs"]["strength_model"], 1)

    def patch_1080p(self, params=None, reference=False):
        params = {"output_1080p": "on", "seed": 42, **(params or {})}
        assets = {"video[0]": "chouka/reference.mp4"} if reference else {}
        metadata = {"chouka/reference.mp4": {
            "has_audio": False, "width": 720, "height": 1280, "duration": 19.125,
        }} if reference else {}
        graph = app.patch_graph(self.cap, params, assets, metadata)
        return params, graph

    def test_1080p_manifest_is_default_off_server_only_visual_switch(self):
        field = next(s for s in self.cap["inputs"] if s["key"] == "output_1080p")
        self.assertEqual((field["label"], field["type"], field["appearance"], field["default"]),
                         ("1080P", "select", "switch", "off"))
        self.assertEqual(field["target"], {"kind": "preset"})
        self.assertEqual(field["presets"], {"on": {}, "off": {}})
        self.assertEqual({o["value"] for o in field["options"]}, {"on", "off"})
        self.assertTrue(field["showHint"])
        for text in ("覆盖分辨率预算", "比例", "倍率", "耗时", "显存", "未实测"):
            self.assertIn(text, field["hint"])
        for path in (ROOT / "manifests").glob("*.json"):
            cap = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(cap, dict) and cap.get("id") != self.cid:
                self.assertNotIn("output_1080p", {s["key"] for s in cap.get("inputs", [])})
        for selected in ("on", "off"):
            params = {"output_1080p": selected, "output_width": 999}
            app.apply_input_presets(self.cap, params)
            self.assertEqual(params["output_width"], 999, "static presets must not determine dimensions")

    def test_1080p_all_ratios_scales_and_reference_paths_sample_near_final_size(self):
        expected = {"1:1": (1080, 1080), "2:3": (1080, 1620), "3:2": (1620, 1080),
                    "3:4": (1080, 1440), "4:3": (1440, 1080), "9:16": (1080, 1920),
                    "16:9": (1920, 1080), "21:9": (2520, 1080)}
        aspect = next(s for s in self.cap["inputs"] if s["key"] == "aspect_ratio")
        before = (ROOT / self.cap["graph"]).read_bytes()
        manifest = json.dumps(self.cap, sort_keys=True)
        for ratio in aspect["options"]:
            final = expected[ratio.split()[0]]
            for scale in (.25, .75, 1, 1.25, 1.5, 2, 8):
                for reference in (False, True):
                    with self.subTest(ratio=ratio, scale=scale, reference=reference):
                        params, graph = self.patch_1080p({"aspect_ratio": ratio, "scale_by": scale,
                                                         "megapixels": "ignored-budget"}, reference)
                        generation = tuple(round(v / scale / 32) * 32 for v in final)
                        self.assertEqual((graph["186"]["inputs"]["width"],
                                          graph["186"]["inputs"]["height"]), generation)
                        self.assertEqual(graph["199"]["inputs"]["scale_by"], scale)
                        self.assertEqual(params["megapixels"], generation[0] * generation[1] / 1024 ** 2)
                        self.assertTrue(all(abs(v * scale - f) <= 16 * scale
                                            for v, f in zip(generation, final)))
                        self.assertEqual((params["output_width"], params["output_height"]), final)
                        scales = [n for n in graph.values() if n["class_type"] == "ImageScale"]
                        self.assertEqual(len(scales), 1, "follow and 1080P must share one resize")
                        output = graph["225"]["inputs"]
                        scaled = graph[output["images"][0]]["inputs"]
                        self.assertEqual((scaled["width"], scaled["height"]), final)
                        self.assertEqual((scaled["upscale_method"], scaled["crop"]), ("bicubic", "disabled"))
                        self.assertEqual(graph["122"]["inputs"]["samples"], ["209", 0])
                        self.assertEqual(graph["200"]["inputs"]["latent_image"], ["199", 0])
                        if reference:
                            trim = graph[scaled["image"][0]]
                            self.assertEqual(trim["class_type"], "ImageFromBatch")
                            self.assertEqual(trim["inputs"]["image"], self.raw["225"]["inputs"]["images"])
                        else:
                            self.assertEqual(scaled["image"], self.raw["225"]["inputs"]["images"])
                        for nid in ("127", "128", "119", "120", "124", "125", "200", "203", "233", "234"):
                            self.assertEqual(graph[nid], self.raw[nid], nid)
        self.assertEqual((ROOT / self.cap["graph"]).read_bytes(), before)
        self.assertEqual(json.dumps(self.cap, sort_keys=True), manifest)

    def test_1080p_no_reference_does_not_change_time_or_execute_optional_demo_assets(self):
        params = {"duration": 7.375, "scale_by": "1.2"}
        resolved, graph = self.patch_1080p(params)
        old = app.patch_graph(self.cap, {"seed": 42, **params}, {})
        for nid in ("131", "132", "221"):
            self.assertEqual(graph[nid], old[nid])
        self.assertEqual(graph["186"]["inputs"]["length"], old["186"]["inputs"]["length"])
        self.assertEqual({k: v for k, v in graph["225"]["inputs"].items() if k != "images"},
                         {k: v for k, v in old["225"]["inputs"].items() if k != "images"})
        self.assertFalse(any(n["class_type"] == "ImageFromBatch" for n in graph.values()))
        self.assertFalse(any(k.startswith("ref_") and k != "ref_image_size" for k in graph["186"]["inputs"]))
        self.assertEqual(resolved["duration"], 7.375)
        self.assertNotIn("output_duration", resolved)
        self.assertEqual(graph["199"]["inputs"]["scale_by"], 1.2)
        import scan_workflows
        live = scan_workflows.upstream(graph, "225")
        self.assertNotIn("115", live, "old megapixel budget must be disconnected")
        self.assertIn("122", live, "final resize must follow VAE decode")
        self.assertIn("200", live, "real second sampling must remain upstream of decode")
        self.assertNotIn("221", live, "optional demo video must not execute")

    def test_1080p_reference_keeps_duration_frame_audio_contract(self):
        for duration in (5, 7.375, 4.1):
            params, graph = self.patch_1080p({"duration": duration}, True)
            _, old = self.patch_1080p({"duration": duration, "output_1080p": "off"}, True)
            for nid in ("131", "132", "221"):
                self.assertEqual(graph[nid], old[nid])
            for key in ("length", "ref_videos.ref_video_0"):
                self.assertEqual(graph["186"]["inputs"][key], old["186"]["inputs"][key])
            self.assertNotIn("ref_video_audios.ref_video_audio_0", graph["186"]["inputs"])
            self.assertEqual(graph["follow_reference_trim_225"], old["follow_reference_trim_225"])
            self.assertEqual(graph["225"], old["225"])
            self.assertEqual(params["output_duration"], duration)
            self.assertEqual(params["output_fps"], round(duration * 24) / duration)

    def test_1080p_rejects_invalid_switch_ratio_and_scale(self):
        for value in (None, "", "ON", "true", 0, 1, True, False, [], {}):
            with self.subTest(switch=value), self.assertRaises(app.web.HTTPBadRequest):
                self.patch_1080p({"output_1080p": value})
        for reference in (False, True):
            for value in (None, "", "16:9", "0:9", "9:0", "1000000:1", [], {}):
                with self.subTest(ratio=value, reference=reference), self.assertRaises(app.web.HTTPBadRequest):
                    self.patch_1080p({"aspect_ratio": value}, reference)
            for value in (None, "", 0, -1, .009, 8.001, "nan", "inf", 1e100, True, [], {}):
                with self.subTest(scale=value, reference=reference), self.assertRaises(app.web.HTTPBadRequest):
                    self.patch_1080p({"scale_by": value}, reference)
            with self.assertRaises(app.web.HTTPBadRequest) as error:
                self.patch_1080p({"scale_by": .01}, reference)
            self.assertIn("基础生成尺寸", error.exception.reason)

    def test_1080p_off_and_absent_match_pre_feature_graph(self):
        import copy
        legacy = copy.deepcopy(self.cap)
        legacy["inputs"] = [s for s in legacy["inputs"] if s["key"] != "output_1080p"]
        for reference in (False, True):
            assets = {"video[0]": "reference.mp4"} if reference else {}
            metadata = {"reference.mp4": {"has_audio": True}}
            for params in ({"seed": 42}, {"seed": 42, "duration": 7.375, "scale_by": 1,
                                "aspect_ratio": "3:4 (Portrait Standard)", "megapixels": 1.1}):
                expected = app.patch_graph(legacy, dict(params), assets, metadata)
                for extra in ({}, {"output_1080p": "off"}):
                    self.assertEqual(app.patch_graph(self.cap, {**params, **extra}, assets, metadata), expected)

    def test_1080p_other_capabilities_ignore_switch(self):
        for path in (ROOT / "manifests").glob("minimax_h3_*.json"):
            cap = json.loads(path.read_text(encoding="utf-8"))
            if cap["id"] == self.cid:
                continue
            import copy
            cap = copy.deepcopy(cap)
            for spec in cap["inputs"]:
                spec["required"] = False
            expected = app.patch_graph(cap, {"seed": 42}, {})
            self.assertEqual(app.patch_graph(cap, {"seed": 42, "output_1080p": "on"}, {}), expected)

    def test_1080p_trusted_metadata_cost_capacity_and_dispatch_dimensions(self):
        import distributed
        for reference in (False, True):
            spoof = {"output_" + k: 999 for k in ("width", "height", "duration", "fps", "count")}
            params, graph = self.patch_1080p({**spoof, "megapixels": .2}, reference)
            assets = {"video[0]": "chouka/reference.mp4"} if reference else {}
            dims = app.CostLedger.dimensions(None, self.cid, params, assets, graph)
            recovered = app.CostLedger.dimensions(None, self.cid, {}, assets, graph)
            for recorded in (dims, recovered):
                for key, expected in (("width", 1920), ("height", 1080),
                                      ("output_width", 1920), ("output_height", 1080), ("output_count", 1)):
                    self.assertEqual(recorded[key], expected)
            generation = graph["186"]["inputs"]
            self.assertEqual(dims["megapixels"], generation["width"] * generation["height"] / 1024 ** 2)
            for supplied, dimensions in ((params, {}), (params, dims), ({}, recovered)):
                spec = app.make_spec(self.cid, supplied, graph, dimensions)
                self.assertEqual(spec["expected"]["width"], 1920)
                self.assertEqual(spec["expected"]["height"], 1080)
                self.assertEqual(spec["expected"]["count"], 1)
                self.assertEqual(spec["expected"]["kind"], "video")
            if reference:
                self.assertEqual(params["output_duration"], 5)
                self.assertEqual(params["output_fps"], 24)
            else:
                self.assertNotIn("output_duration", params)
                self.assertNotIn("output_fps", params)
                self.assertEqual(dims["output_fps"], 24)
            required = {n["class_type"] for n in graph.values()}
            self.assertIn("ImageScale", required)
            self.assertEqual(required - {n["class_type"] for n in self.raw.values()},
                             {"ImageScale", "ImageFromBatch"} if reference else {"ImageScale"})
            inventory = {}
            for node in graph.values():
                for key, value in node["inputs"].items():
                    if isinstance(value, str) and value.endswith(".safetensors"):
                        inventory.setdefault(node["class_type"], {}).setdefault(key, []).append(value)
            types = {n["class_type"]: {"model": "MODEL"} for n in graph.values()
                     if isinstance(n["inputs"].get("model"), list)}
            self.assertTrue(distributed.has_required_models(graph, {"input_choices": inventory, "input_types": types}))
            devices = [{"type": "cuda", "name": "NVIDIA RTX PRO 6000", "vram_total": 96 * 1024 ** 3}]
            self.assertTrue(distributed.can_run_capability(self.cid, devices, duration_seconds=5))
            devices[0]["vram_total"] = 80 * 1024 ** 3
            self.assertFalse(distributed.can_run_capability(self.cid, devices, duration_seconds=5))

    def test_1080p_same_seed_invalidates_low_resolution_sampling_dependencies(self):
        # Structural cache evidence, not a claim of running ComfyUI/GPU execution.
        def signature(graph, nid):
            def resolve(value):
                if isinstance(value, list) and len(value) == 2 and str(value[0]) in graph:
                    return [signature(graph, str(value[0])), value[1]]
                return value
            node = graph[nid]
            return {"type": node["class_type"],
                    "inputs": {k: resolve(v) for k, v in node["inputs"].items()}}
        for reference in (False, True):
            params, low = self.patch_1080p({"output_1080p": "off"}, reference)
            _, high = self.patch_1080p(reference=reference)
            _, changed_scale = self.patch_1080p({"scale_by": 1}, reference)
            self.assertEqual(low["129"], high["129"], "seed must not be silently changed")
            self.assertEqual(params["seed"], 42)
            for nid in ("186", "125", "199", "200", "122", "225"):
                self.assertNotEqual(signature(low, nid), signature(high, nid), nid)
                self.assertNotEqual(signature(high, nid), signature(changed_scale, nid), nid)
            specs = [app.make_spec(self.cid, {}, g, {}) for g in (low, high, changed_scale)]
            self.assertEqual(len({s["graph_fingerprint"] for s in specs}), 3)
            self.assertEqual(len({s["spec_key"] for s in specs}), 3)

    def test_worker_safety_and_output_scale(self):
        import distributed
        inventory = {}
        for node in self.raw.values():
            for key, value in node["inputs"].items():
                if isinstance(value, str) and value.endswith(".safetensors"):
                    inventory.setdefault(node["class_type"], {}).setdefault(key, []).append(value)
        types = {node["class_type"]: {"model": "MODEL"}
                 for node in self.raw.values() if isinstance(node["inputs"].get("model"), list)}
        worker = {"input_choices": inventory, "input_types": types}
        self.assertTrue(distributed.has_required_models(self.raw, worker))
        inventory["UNETLoader"]["unet_name"] = ["minimax_h3_ref2va_pruned_int8_convrot.safetensors"]
        self.assertFalse(distributed.has_required_models(self.raw, worker))
        self.assertTrue(distributed.requires_high_vram(self.cid))
        devices = [{"type": "cuda", "name": "NVIDIA RTX 4090", "vram_total": 24 * 1024**3}]
        self.assertFalse(distributed.can_run_capability(self.cid, devices, duration_seconds=5))
        def settings(cap):
            return app.resolve_reference_video_output_settings(
                cap, {}, {"video[0]": "reference.mp4"}, {})
        self.assertEqual(settings(self.cap), settings(self.old))


if __name__ == "__main__":
    unittest.main()
