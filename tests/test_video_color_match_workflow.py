import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from aiohttp import web

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

import app
import scan_workflows

MODE = {"id": "video_color_match", "name": "参考图校色", "slots": "img1+aud0+vid1"}


def capability():
    return json.loads((ROOT / "manifests/video_color_match.json").read_text(encoding="utf-8"))


class VideoColorMatchWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.cap = capability()
        self.graph = json.loads((ROOT / self.cap["graph"]).read_text(encoding="utf-8"))
        self.assets = {"video[0]": "chouka/shot.mp4", "images[0]": "chouka/reference.png"}

    def test_shot_and_reference_slots_feed_color_match(self):
        media = [s for s in self.cap["inputs"] if s["type"] in ("image", "audio", "video")]
        self.assertEqual([(s["key"], s["type"], s["required"]) for s in media],
                         [("video[0]", "video", True), ("images[0]", "image", True)])
        self.assertEqual(self.cap["slotLimits"], {
            "image": {"min": 1, "max": 1}, "audio": {"min": 0, "max": 0},
            "video": {"min": 1, "max": 1}})
        self.assertEqual((self.cap["kind"], self.cap["card"], self.cap["outputType"]),
                         ("tool", "card_tools", "video"))
        self.assertEqual({nid: n["class_type"] for nid, n in self.graph.items()}, {
            "1": "LoadVideo", "2": "GetVideoComponents", "3": "LoadImage",
            "4": "ColorMatch", "5": "CreateVideo", "6": "SaveVideo"})
        self.assertEqual(set(self.graph), scan_workflows.upstream(self.graph, "6") | {"6"})
        match = self.graph["4"]["inputs"]
        self.assertEqual((match["image_ref"], match["image_target"]), (["3", 0], ["2", 0]))
        self.assertEqual(self.graph["5"]["inputs"]["images"], ["4", 0])
        for label in app.step_labels(self.graph).values():
            self.assertRegex(label, r"[\u4e00-\u9fff]")

    def test_frame_rate_and_audio_follow_source_shot(self):
        video = self.graph["5"]["inputs"]
        self.assertEqual((video["audio"], video["fps"]), (["2", 1], ["2", 2]))
        self.assertEqual(video["color_space"], "sRGB")

    def test_defaults_match_template(self):
        for spec in self.cap["inputs"]:
            target = spec["target"]
            if target.get("kind") != "preset" and "default" in spec:
                self.assertEqual(self.graph[target["node"]]["inputs"][target["input"]],
                                 spec["default"], spec["key"])

    def test_missing_shot_or_reference_rejected(self):
        for assets in ({}, {"video[0]": "shot.mp4"}, {"images[0]": "reference.png"}):
            with self.subTest(assets=assets), self.assertRaises(web.HTTPBadRequest):
                app.patch_graph(self.cap, {}, assets)

    def test_parameters_patch_color_match_node(self):
        graph = app.patch_graph(self.cap, {"strength": "0.45", "match_method": "reinhard"}, self.assets)
        self.assertEqual(graph["1"]["inputs"]["file"], "chouka/shot.mp4")
        self.assertEqual(graph["3"]["inputs"]["image"], "chouka/reference.png")
        self.assertEqual(graph["4"]["inputs"]["strength"], 0.45)
        self.assertEqual(graph["4"]["inputs"]["method"], "reinhard")
        graph = app.patch_graph(self.cap, {}, self.assets)
        self.assertEqual((graph["4"]["inputs"]["method"], graph["4"]["inputs"]["strength"]), ("mkl", 0.7))
        graph = app.patch_graph(self.cap, {"match_method": "hm-mkl-hm", "method": "mvgd"}, self.assets)
        self.assertEqual(graph["4"]["inputs"]["method"], "hm-mkl-hm")
        with self.assertRaises(web.HTTPBadRequest):
            app.patch_graph(self.cap, {"match_method": "mvgd"}, self.assets)

    def test_rescan_preserves_bundled_mode(self):
        self.assertIn("video_color_match", scan_workflows.BUNDLED_CAPABILITIES)
        self.assertIn("video_color_match", scan_workflows.TOOLS)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "manifests").mkdir()
            (root / "graphs").mkdir()
            (root / "manifests/video_color_match.json").write_text(json.dumps(self.cap), encoding="utf-8")
            (root / self.cap["graph"]).write_text(json.dumps(self.graph), encoding="utf-8")
            with mock.patch.object(scan_workflows, "ROOT", root), \
                 mock.patch.object(scan_workflows, "ALIASES", {}), \
                 mock.patch.object(scan_workflows, "BUNDLED_CAPABILITIES", {"video_color_match"}), \
                 mock.patch.object(scan_workflows, "load_object_info", return_value={}), \
                 mock.patch.object(scan_workflows, "load_zh", return_value={}), \
                 mock.patch.object(sys, "argv", ["scan_workflows.py"]), \
                 contextlib.redirect_stdout(io.StringIO()):
                scan_workflows.main()
            cards = json.loads((root / "manifests/_cards.json").read_text(encoding="utf-8"))
            tools = next(c for c in cards if c["id"] == "card_tools")
            self.assertEqual(tools["modes"], [MODE])
            self.assertEqual(json.loads((root / self.cap["graph"]).read_text(encoding="utf-8")), self.graph)

    def test_committed_cards_list_the_mode(self):
        cards = json.loads((ROOT / "manifests/_cards.json").read_text(encoding="utf-8"))
        tools = next(c for c in cards if c["id"] == "card_tools")
        self.assertIn(MODE, tools["modes"])


if __name__ == "__main__":
    unittest.main()
