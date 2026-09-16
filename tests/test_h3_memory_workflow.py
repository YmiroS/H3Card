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
        for duration in (3, 5, 8):
            with self.subTest(duration=duration):
                graph = self.graph({"duration": duration})
                self.assertEqual(graph["132"]["inputs"]["value"], duration)
                loader = graph["221"]["inputs"]
                self.assertEqual(loader["force_rate"], 24)
                self.assertEqual(loader["frame_load_cap"], graph["186"]["inputs"]["length"])
                self.assertEqual(loader["frame_load_cap"], ["131", 1])
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


if __name__ == "__main__":
    unittest.main()
