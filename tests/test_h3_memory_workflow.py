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
        self.assertEqual(scan.DISPLAY[self.cid], "H3半满血二采")
        mode = next(m for m in video["modes"] if m["id"] == self.cid)
        self.assertEqual(mode["name"], "H3半满血二采")
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
            if spec["key"] not in ("steps", "scale_by"):
                self.assertEqual(spec, old_specs[spec["key"]])
        self.assertIn("stable_mode", old_specs)
        self.assertEqual(old["230"]["inputs"]["strength_model"], 1)

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
