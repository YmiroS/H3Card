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

    def patch_1080p(self, params=None, reference=False, has_audio=False):
        params = {"output_1080p": "on", "seed": 42, **(params or {})}
        assets = {"video[0]": "chouka/reference.mp4"} if reference else {}
        metadata = {"chouka/reference.mp4": {
            "has_audio": has_audio, "width": 720, "height": 1280, "duration": 19.125,
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
        supported = set()
        for path in (ROOT / "manifests").glob("*.json"):
            cap = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(cap, dict) and "output_1080p" in {s["key"] for s in cap.get("inputs", [])}:
                supported.add(cap["id"])
        self.assertEqual(supported, {self.cid, "minimax_h3_fusion_v2_bf16"})
        for selected in ("on", "off"):
            params = {"output_1080p": selected, "output_width": 999}
            app.apply_input_presets(self.cap, params)
            self.assertEqual(params["output_width"], 999, "static presets must not determine dimensions")

    def test_1080p_all_ratios_scales_and_reference_paths_keep_first_pass_fixed(self):
        expected = {"1:1": (1080, 1080), "2:3": (1080, 1620), "3:2": (1620, 1080),
                    "3:4": (1080, 1440), "4:3": (1440, 1080), "9:16": (1080, 1920),
                    "16:9": (1920, 1080), "21:9": (2520, 1080)}
        aspect = next(s for s in self.cap["inputs"] if s["key"] == "aspect_ratio")
        before = (ROOT / self.cap["graph"]).read_bytes()
        manifest = json.dumps(self.cap, sort_keys=True)
        for ratio in aspect["options"]:
            base = expected[ratio.split()[0]]
            generation = tuple(round(v / 32) * 32 for v in base)
            for scale in (.01, .25, .75, 1, 1.25, 1.5, 2, 3.14159, 6):
                final = tuple(round(v * scale / 2) * 2 for v in base)
                for reference in (False, True):
                    with self.subTest(ratio=ratio, scale=scale, reference=reference):
                        params, graph = self.patch_1080p({"aspect_ratio": ratio, "scale_by": scale,
                                                         "megapixels": "ignored-budget"}, reference)
                        self.assertEqual((graph["186"]["inputs"]["width"],
                                          graph["186"]["inputs"]["height"]), generation)
                        self.assertEqual(graph["199"]["inputs"]["scale_by"], scale)
                        self.assertEqual(params["megapixels"], generation[0] * generation[1] / 1024 ** 2)
                        self.assertTrue(all(abs(v * scale - f) <= 1
                                            for v, f in zip(base, final)))
                        self.assertEqual((params["output_width"], params["output_height"]), final)
                        scales = [n for n in graph.values() if n["class_type"] == "ImageScale"]
                        self.assertEqual(len(scales), 1, "follow and 1080P must share one resize")
                        output = graph["225"]["inputs"]
                        correction = graph[output["images"][0]]
                        self.assertEqual(correction["_meta"]["title"], "校正二采输出尺寸")
                        scaled = correction["inputs"]
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

    def test_1080p_default_multiplier_landscape_portrait_and_ultrawide(self):
        for ratio, generation, final in (
                ("16:9 (Widescreen)", (1920, 1088), (2880, 1620)),
                ("9:16 (Portrait Widescreen)", (1088, 1920), (1620, 2880)),
                ("21:9 (Ultrawide)", (2528, 1088), (3780, 1620))):
            for reference in (False, True):
                with self.subTest(ratio=ratio, reference=reference):
                    params, graph = self.patch_1080p({"aspect_ratio": ratio}, reference)
                    self.assertEqual(graph["199"]["inputs"]["scale_by"], 1.5)
                    self.assertEqual((graph["186"]["inputs"]["width"],
                                      graph["186"]["inputs"]["height"]), generation)
                    self.assertEqual((params["output_width"], params["output_height"]), final)

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
            for has_audio in (False, True):
                with self.subTest(duration=duration, has_audio=has_audio):
                    params, graph = self.patch_1080p({"duration": duration}, True, has_audio)
                    _, old = self.patch_1080p({"duration": duration, "output_1080p": "off"}, True, has_audio)
                    for nid in ("131", "132", "221"):
                        self.assertEqual(graph[nid], old[nid])
                    for key in ("length", "ref_videos.ref_video_0"):
                        self.assertEqual(graph["186"]["inputs"][key], old["186"]["inputs"][key])
                    audio = "ref_video_audios.ref_video_audio_0"
                    self.assertEqual(audio in graph["186"]["inputs"], has_audio)
                    if has_audio:
                        self.assertEqual(graph["186"]["inputs"][audio], old["186"]["inputs"][audio])
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

    def test_1080p_scale_and_size_boundaries_apply_to_final_not_inverse_generation(self):
        for reference in (False, True):
            for scale in (.01, 8):
                with self.subTest(scale=scale, reference=reference):
                    params, graph = self.patch_1080p({"scale_by": scale}, reference)
                    self.assertEqual((graph["186"]["inputs"]["width"],
                                      graph["186"]["inputs"]["height"]), (1920, 1088))
                    self.assertEqual((params["output_width"], params["output_height"]),
                                     tuple(round(v * scale / 2) * 2 for v in (1920, 1080)))
            for width in (16384, 16386):
                params = {"aspect_ratio": "21:9 (Ultrawide)", "scale_by": width / 2520}
                if width == 16384:
                    resolved, _ = self.patch_1080p(params, reference)
                    self.assertEqual(resolved["output_width"], 16384)
                else:
                    with self.assertRaises(app.web.HTTPBadRequest):
                        self.patch_1080p(params, reference)
            with self.assertRaises(app.web.HTTPBadRequest):
                self.patch_1080p({"aspect_ratio": "21:9 (Ultrawide)", "scale_by": 8}, reference)

    def test_1080p_generation_boundaries_and_transposed_ultrawide(self):
        # Exercise the validator independently of the current finite aspect menu.
        aspect = next(s for s in self.cap["inputs"] if s["key"] == "aspect_ratio")
        for ratio, generation, final in (
                ("9:21", (1088, 2528), (1620, 3780)),
                ("2048:135", (16384, 1088), (8192, 540)),
                ("135:2048", (1088, 16384), (540, 8192))):
            aspect["options"].append(ratio)
            for reference in (False, True):
                with self.subTest(ratio=ratio, reference=reference):
                    params, graph = self.patch_1080p({"aspect_ratio": ratio,
                                                    "scale_by": 1.5 if ratio == "9:21" else .5}, reference)
                    self.assertEqual((graph["186"]["inputs"]["width"],
                                      graph["186"]["inputs"]["height"]), generation)
                    self.assertEqual((params["output_width"], params["output_height"]), final)
        for ratio in ("2052:135", "135:2052"):
            aspect["options"].append(ratio)
            for reference in (False, True):
                with self.subTest(ratio=ratio, reference=reference), self.assertRaises(app.web.HTTPBadRequest):
                    self.patch_1080p({"aspect_ratio": ratio, "scale_by": .5}, reference)

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
            if cap["id"] in {self.cid, "minimax_h3_fusion_v2_bf16"}:
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
                for key, expected in (("width", 2880), ("height", 1620),
                                      ("output_width", 2880), ("output_height", 1620), ("output_count", 1)):
                    self.assertEqual(recorded[key], expected)
                self.assertEqual(recorded["megapixels"], 1920 * 1088 / 1024 ** 2)
            for supplied, dimensions in ((params, {}), (params, dims), ({}, recovered)):
                spec = app.make_spec(self.cid, supplied, graph, dimensions)
                self.assertEqual(spec["expected"]["width"], 2880)
                self.assertEqual(spec["expected"]["height"], 1620)
                self.assertEqual(spec["expected"]["count"], 1)
                self.assertEqual(spec["expected"]["kind"], "video")
                if reference:
                    from capacity import CapacityStore
                    actual = {**spec["expected"], "valid": True, "bytes": 100000}
                    self.assertEqual(CapacityStore._technical(spec, "done", [actual]), (1, [actual], []))
                    old_size = {**actual, "width": 1920, "height": 1080}
                    self.assertEqual(CapacityStore._technical(spec, "done", [old_size])[0], 0)
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
            for nid in ("186", "125"):
                self.assertEqual(signature(high, nid), signature(changed_scale, nid), nid)
            for nid in ("199", "200", "122", "225"):
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


class H3FusionV2BF16WorkflowTest(unittest.TestCase):
    cid = "minimax_h3_fusion_v2_bf16"
    name = "H3无损融合单采满血剪枝"
    model = "Cobijada_H3_Hybrid_Uncensored_pruned_hybrid_BF16_pruned.safetensors"

    def setUp(self):
        self.cap = json.loads((ROOT / "manifests" / (self.cid + ".json")).read_text(encoding="utf-8"))
        self.old = json.loads((ROOT / "manifests/minimax_h3_fusion_v2.json").read_text(encoding="utf-8"))
        self.raw = json.loads((ROOT / self.cap["graph"]).read_text(encoding="utf-8"))
        paths = (ROOT / self.cap["graph"], ROOT / self.old["graph"],
                 ROOT / "manifests" / (self.cid + ".json"), ROOT / "manifests/minimax_h3_fusion_v2.json")
        self.templates = {path: path.read_bytes() for path in paths}
        self.manifest = json.dumps(self.cap, sort_keys=True)

    def tearDown(self):
        for path, before in self.templates.items():
            self.assertEqual(path.read_bytes(), before, str(path))
        self.assertEqual(json.dumps(self.cap, sort_keys=True), self.manifest)

    def patch(self, params=None, reference=False, assets=None):
        params = {"seed": 42, **(params or {})}
        assets = ({"video[0]": "chouka/reference.mp4"} if reference else {}) if assets is None else assets
        metadata = {"chouka/reference.mp4": {
            "has_audio": True, "width": 720, "height": 1280, "duration": 19.125,
        }}
        with mock.patch.object(app, "probe_video", side_effect=AssertionError("unexpected video probe")):
            graph = app.patch_graph(self.cap, params, assets, metadata)
        return params, graph

    def test_raw_graph_changes_exact_model_only(self):
        old_text = (ROOT / self.old["graph"]).read_text(encoding="utf-8")
        old = json.loads(old_text)
        original_model = old["127"]["inputs"]["unet_name"]
        old["127"]["inputs"]["unet_name"] = self.model
        self.assertEqual(self.raw, old)
        self.assertEqual((ROOT / self.cap["graph"]).read_text(encoding="utf-8"),
                         old_text.replace(original_model, self.model))
        self.assertEqual([nid for nid, node in self.raw.items()
                          if node["class_type"] == "SamplerCustomAdvanced"], ["125"])
        self.assertFalse(any("scale_by" in n["inputs"] or "LatentUpscale" in n["class_type"]
                             for n in self.raw.values()))

    def test_manifest_preserves_original_controls_and_server_only_1080p(self):
        self.assertEqual(self.cap["name"], self.name)
        self.assertEqual(self.cap["source"], "graphs/" + self.cid + ".api.json")
        self.assertEqual(self.cap["graph"], self.cap["source"])
        for key in self.old.keys() - {"id", "name", "source", "graph", "note", "inputs"}:
            self.assertEqual(self.cap[key], self.old[key], key)
        self.assertEqual([s for s in self.cap["inputs"] if s["key"] != "output_1080p"], self.old["inputs"])
        self.assertNotIn("scale_by", {s["key"] for s in self.cap["inputs"]})
        field = next(s for s in self.cap["inputs"] if s["key"] == "output_1080p")
        self.assertEqual((field["label"], field["type"], field["appearance"], field["default"]),
                         ("1080P", "select", "switch", "off"))
        self.assertEqual(field["target"], {"kind": "preset"})
        self.assertEqual(field["presets"], {"on": {}, "off": {}})
        self.assertEqual(field["options"], [{"value": "on", "label": "开启"}, {"value": "off", "label": "关闭"}])
        self.assertTrue(field["showHint"])
        for text in ("覆盖分辨率预算", "比例", "单采", "32", "最近偶数", "1920×1080", "耗时", "显存", "未实测"):
            self.assertIn(text, field["hint"])
        self.assertIn(self.model, self.cap["note"])
        for selected in ("on", "off"):
            params = {"output_1080p": selected, "output_width": 999}
            app.apply_input_presets(self.cap, params)
            self.assertEqual(params["output_width"], 999)

    def test_registration_and_rescan(self):
        import scan_workflows as scan
        cards = json.loads((ROOT / "manifests/_cards.json").read_text(encoding="utf-8"))
        video = next(c for c in cards if c["id"] == "card_video")
        mode = next(m for m in video["modes"] if m["id"] == self.cid)
        self.assertEqual(mode["name"], self.name)
        self.assertIn(self.cid, scan.BUNDLED_CAPABILITIES)
        self.assertEqual(scan.DISPLAY[self.cid], self.name)
        self.assertEqual(scan.build_modes([self.cap]), [mode])
        self.assertEqual(app.MODEL_FAMILY[self.cid], "minimax_h3")
        with mock.patch.object(app, "CAPS", {}), mock.patch.object(app, "CARDS", []):
            app.load_caps()
            self.assertTrue(app.CAPS[self.cid]["_graph_ok"])
            live_video = next(c for c in app.CARDS if c["id"] == "card_video")
            self.assertIn(self.cid, {m["id"] for m in live_video["modes"]})

    def test_default_and_off_preserve_single_pass_v2_behavior(self):
        for reference in (False, True):
            for options in ({}, {"duration": 7.375, "megapixels": .8,
                                 "aspect_ratio": "3:4 (Portrait Standard)", "strength_model": .5,
                                 "sigmas": "1, .5, 0"}):
                with self.subTest(reference=reference, options=options):
                    assets = {"video[0]": "chouka/reference.mp4"} if reference else {}
                    expected = app.patch_graph(self.old, {"seed": 42, **options}, assets)
                    expected["127"]["inputs"]["unet_name"] = self.model
                    for extra in ({}, {"output_1080p": "off"}):
                        params, graph = self.patch({**options, **extra}, reference)
                        self.assertEqual(graph, expected)
                        self.assertNotIn("scale_by", params)
                        self.assertEqual([nid for nid, n in graph.items()
                                          if n["class_type"] == "SamplerCustomAdvanced"], ["125"])
                        if not reference:
                            self.assertFalse(any(n["class_type"] == "ImageScale" for n in graph.values()))
        _, graph = self.patch()
        self.assertEqual(graph["227"]["inputs"]["value"], 6)
        self.assertEqual(graph["228"]["inputs"]["megapixels"], 1.1)
        self.assertEqual(graph["145"]["inputs"]["strength_model"], .75)
        self.assertEqual(graph["147"], self.raw["147"])

    def test_1080p_all_eight_ratios_reference_and_no_reference(self):
        import scan_workflows as scan
        expected = {"1:1": (1080, 1080), "2:3": (1080, 1620), "3:2": (1620, 1080),
                    "3:4": (1080, 1440), "4:3": (1440, 1080), "9:16": (1080, 1920),
                    "16:9": (1920, 1080), "21:9": (2520, 1080)}
        options = next(s for s in self.cap["inputs"] if s["key"] == "aspect_ratio")["options"]
        self.assertEqual({s.split()[0] for s in options}, set(expected))
        for ratio in options:
            final = expected[ratio.split()[0]]
            generation = tuple(round(v / 32) * 32 for v in final)
            for reference in (False, True):
                with self.subTest(ratio=ratio, reference=reference):
                    params, graph = self.patch({"output_1080p": "on", "aspect_ratio": ratio,
                                                "megapixels": "ignored-budget"}, reference)
                    h3 = graph["136"]["inputs"]
                    self.assertEqual((h3["width"], h3["height"]), generation)
                    self.assertEqual((params["output_width"], params["output_height"]), final)
                    self.assertEqual(params["megapixels"], generation[0] * generation[1] / 1024 ** 2)
                    self.assertNotIn("scale_by", params)
                    scales = [n for n in graph.values() if n["class_type"] == "ImageScale"]
                    self.assertEqual(len(scales), 1)
                    correction = graph[graph["148"]["inputs"]["images"][0]]
                    self.assertEqual(correction["class_type"], "ImageScale")
                    self.assertEqual(correction["_meta"]["title"], "校正单采输出尺寸")
                    scaled = correction["inputs"]
                    self.assertEqual((scaled["width"], scaled["height"]), final)
                    self.assertEqual((scaled["upscale_method"], scaled["crop"]), ("bicubic", "disabled"))
                    if reference:
                        trim = graph[scaled["image"][0]]
                        self.assertEqual(trim["class_type"], "ImageFromBatch")
                        self.assertEqual(trim["inputs"]["image"], ["122", 0])
                        self.assertEqual(trim["inputs"]["length"], 144)
                        self.assertEqual(h3["length"], 158)
                        self.assertEqual(graph["185"]["inputs"]["frame_load_cap"], 158)
                        self.assertEqual(graph["148"]["inputs"]["frame_rate"], 24)
                        self.assertEqual(params["output_duration"], 6)
                    else:
                        self.assertEqual(scaled["image"], ["122", 0])
                        self.assertEqual(h3["length"], ["224", 1])
                        self.assertNotIn("output_duration", params)
                        self.assertNotIn("output_fps", params)
                    for nid in ("127", "145", "156", "165", "232", "234", "235", "123",
                                "147", "125", "126", "121", "122", "224", "227"):
                        self.assertEqual(graph[nid], self.raw[nid], nid)
                    self.assertEqual([nid for nid, n in graph.items()
                                      if n["class_type"] == "SamplerCustomAdvanced"], ["125"])
                    self.assertFalse(any("LatentUpscale" in n["class_type"] or "scale_by" in n["inputs"]
                                         for n in graph.values()))
                    live = scan.upstream(graph, "148")
                    self.assertNotIn("228", live)
                    self.assertIn("122", live)
                    self.assertIn("125", live)
                    self.assertEqual("185" in live, reference)
                    added_types = {n["class_type"] for n in graph.values()} - {
                        n["class_type"] for n in self.raw.values()}
                    self.assertEqual(added_types, {"ImageScale", "ImageFromBatch"} if reference else {"ImageScale"})

    def test_spoofed_dimensions_and_scale_cannot_change_single_pass_resolution(self):
        spoof = {"output_" + key: 999 for key in ("width", "height", "duration", "fps", "count")}
        for reference in (False, True):
            for selected in ("on", "off"):
                baseline, expected = self.patch({"output_1080p": selected}, reference)
                for scale in (None, 0, -1, .01, 1, 1.5, 8, "nan", "inf", True, [], {}):
                    with self.subTest(reference=reference, selected=selected, scale=scale):
                        params, graph = self.patch({"output_1080p": selected, "scale_by": scale,
                                                    "width": 999, "height": 999, **spoof}, reference)
                        self.assertEqual(graph, expected)
                        if selected == "on":
                            self.assertNotIn("scale_by", params)
                        if reference or selected == "on":
                            self.assertEqual((params["output_width"], params["output_height"]),
                                             (baseline["output_width"], baseline["output_height"]))
                            self.assertEqual(params["output_count"], 1)
                        if not reference and selected == "on":
                            self.assertNotIn("output_duration", params)
                            self.assertNotIn("output_fps", params)
                        elif reference:
                            self.assertEqual(params["output_duration"], 6)
                            self.assertEqual(params["output_fps"], 24)

    def test_no_reference_1080p_preserves_17n_plus_5_time_and_optional_assets(self):
        import scan_workflows as scan
        for duration in (5, 6, 7.375):
            with self.subTest(duration=duration):
                _, low = self.patch({"duration": duration})
                params, high = self.patch({"duration": duration, "output_1080p": "on"})
                for nid in ("224", "227", "185", "121", "122", "125"):
                    self.assertEqual(high[nid], low[nid])
                self.assertEqual(high["224"]["inputs"]["expression"],
                                 "max(5, round(a * 24)) + (5 - (max(5, round(a * 24)) % 17)) % 17")
                self.assertEqual(high["136"]["inputs"]["length"], ["224", 1])
                self.assertEqual({k: v for k, v in high["148"]["inputs"].items() if k != "images"},
                                 {k: v for k, v in low["148"]["inputs"].items() if k != "images"})
                self.assertFalse(any(n["class_type"] == "ImageFromBatch" for n in high.values()))
                self.assertFalse(any(k.startswith("ref_") and k != "ref_image_size"
                                     for k in high["136"]["inputs"]))
                live = scan.upstream(high, "148")
                self.assertFalse({"185", "199", "188", "189", "190", "191", "192", "182", "183", "184"} & live)
                self.assertNotIn("output_duration", params)
                self.assertNotIn("output_fps", params)
                self.assertEqual(params["duration"], duration)

    def test_reference_preserves_panel_duration_trim_and_separate_audio_contract(self):
        for duration in (5, 6, 7.375, 4.1):
            for has_audio in (False, True):
                with self.subTest(duration=duration, has_audio=has_audio):
                    assets = {"video[0]": "chouka/reference.mp4", "images[0]": "chouka/one.png",
                              "audio[0]": "chouka/audio.wav"}
                    params = {"seed": 42, "output_1080p": "on", "duration": duration,
                              "aspect_ratio": "4:3 (Standard)"}
                    metadata = {assets["video[0]"]: {"has_audio": has_audio, "width": 720,
                                                    "height": 1280, "duration": 19.125}}
                    with mock.patch.object(app, "probe_video", side_effect=AssertionError("unexpected probe")):
                        high = app.patch_graph(self.cap, params, assets, metadata)
                        low = app.patch_graph(self.cap, {**params, "output_1080p": "off"}, assets, metadata)
                    frames = round(duration * 24)
                    aligned = max(5, frames)
                    aligned += (5 - aligned % 17) % 17
                    self.assertEqual(high["136"]["inputs"]["length"], aligned)
                    self.assertEqual(high["185"]["inputs"]["frame_load_cap"], aligned)
                    self.assertEqual(high["185"], low["185"])
                    self.assertEqual(high["227"], low["227"])
                    self.assertEqual(high["follow_reference_trim_148"], low["follow_reference_trim_148"])
                    self.assertEqual(high["follow_reference_trim_148"]["inputs"],
                                     {"image": ["122", 0], "batch_index": 0, "length": frames})
                    self.assertEqual(high["148"], low["148"])
                    self.assertFalse(high["148"]["inputs"]["trim_to_audio"])
                    self.assertEqual(high["148"]["inputs"]["frame_rate"], frames / duration)
                    self.assertEqual(params["output_duration"], duration)
                    self.assertEqual(params["output_fps"], frames / duration)
                    self.assertEqual((params["output_width"], params["output_height"]), (1440, 1080))
                    h3 = high["136"]["inputs"]
                    self.assertEqual(h3["ref_videos.ref_video_0"], ["185", 0])
                    self.assertEqual(h3["ref_images.ref_image_0"], ["199", 0])
                    self.assertEqual(h3["ref_audios.ref_audio_0"], ["182", 0])
                    self.assertFalse(any(k.startswith("ref_video_audios.") for k in h3))

    def test_sparse_reference_prompts_use_v2_slot_numbering(self):
        prompt = "<Picture 6> 看 <Picture 2>，<Audio 3> 配 <Video 1>；<Picture 6>。"
        assets = {"images[1]": "chouka/first.png", "images[5]": "chouka/second.png",
                  "audio[2]": "chouka/third.wav", "video[0]": "chouka/reference.mp4"}
        for selected in ("off", "on"):
            with self.subTest(output_1080p=selected):
                params, graph = self.patch({"prompt": prompt, "output_1080p": selected}, assets=assets)
                self.assertEqual(params["prompt"], prompt)
                self.assertEqual(graph["238"]["inputs"]["value"],
                                 "<Picture 2> 看 <Picture 1>，<Audio 1> 配 <Video 1>；<Picture 2>。")
                for token in ("<Picture 1>", "<Audio 2>"):
                    with self.assertRaises(app.web.HTTPBadRequest) as error:
                        self.patch({"prompt": token, "output_1080p": selected}, assets=assets)
                    self.assertIn(token, error.exception.reason)

    def test_1080p_rejects_invalid_switch_and_ratio(self):
        for value in (None, "", "ON", "true", 0, 1, True, False, [], {}):
            with self.subTest(switch=value), self.assertRaises(app.web.HTTPBadRequest):
                self.patch({"output_1080p": value})
        for reference in (False, True):
            for value in (None, "", "16:9", "0:9", "9:0", "1000000:1", [], {}):
                with self.subTest(ratio=value, reference=reference), self.assertRaises(app.web.HTTPBadRequest):
                    self.patch({"output_1080p": "on", "aspect_ratio": value}, reference)
        for duration in (0, .1, -1, "nan", "inf", 151):
            with self.subTest(duration=duration), self.assertRaises(app.web.HTTPBadRequest):
                self.patch({"output_1080p": "on", "duration": duration}, True)

    def test_1080p_trusted_cost_and_output_spec_dimensions(self):
        for reference in (False, True):
            with self.subTest(reference=reference):
                spoof = {"output_" + k: 999 for k in ("width", "height", "duration", "fps", "count")}
                params, graph = self.patch({"output_1080p": "on", "scale_by": 8,
                                            "megapixels": .2, **spoof}, reference)
                assets = {"video[0]": "chouka/reference.mp4"} if reference else {}
                dims = app.CostLedger.dimensions(None, self.cid, params, assets, graph)
                recovered = app.CostLedger.dimensions(None, self.cid, {}, assets, graph)
                for recorded in (dims, recovered):
                    for key, expected in (("width", 1920), ("height", 1080), ("output_width", 1920),
                                          ("output_height", 1080), ("output_count", 1)):
                        self.assertEqual(recorded[key], expected)
                    self.assertEqual(recorded["megapixels"], 1920 * 1088 / 1024 ** 2)
                for supplied, dimensions in ((params, {}), (params, dims), ({}, recovered)):
                    spec = app.make_spec(self.cid, supplied, graph, dimensions)
                    self.assertEqual(spec["expected"]["kind"], "video")
                    self.assertEqual(spec["expected"]["width"], 1920)
                    self.assertEqual(spec["expected"]["height"], 1080)
                    self.assertEqual(spec["expected"]["count"], 1)
                    if reference:
                        from capacity import CapacityStore
                        actual = {**spec["expected"], "valid": True, "bytes": 100000}
                        self.assertEqual(CapacityStore._technical(spec, "done", [actual]), (1, [actual], []))
                        wrong = {**actual, "width": 1920, "height": 1088}
                        self.assertEqual(CapacityStore._technical(spec, "done", [wrong])[0], 0)
                self.assertEqual(dims["output_fps"], 24)


if __name__ == "__main__":
    unittest.main()
