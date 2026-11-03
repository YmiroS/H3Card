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

IMAGE_MODE = {"id": "image_color_match", "name": "参考图校色（图片）", "slots": "img2+aud0+vid0"}
VIDEO_MODE = {"id": "video_color_match", "name": "参考图校色（视频）", "slots": "img1+aud0+vid1"}


def capability(wid):
    return json.loads((ROOT / f"manifests/{wid}.json").read_text(encoding="utf-8"))


class ColorMatchWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.image = capability("image_color_match")
        self.video = capability("video_color_match")
        self.image_graph = json.loads((ROOT / self.image["graph"]).read_text(encoding="utf-8"))
        self.video_graph = json.loads((ROOT / self.video["graph"]).read_text(encoding="utf-8"))
        self.image_assets = {"images[0]": "chouka/shot.png", "images[1]": "chouka/reference.png"}
        self.video_assets = {"video[0]": "chouka/shot.mp4", "images[0]": "chouka/reference.png"}

    def test_two_tool_modes_not_route_card(self):
        self.assertNotIn("card_color_match", scan_workflows.ROUTE_CARDS)
        self.assertEqual(self.image["card"], "card_tools")
        self.assertEqual(self.video["card"], "card_tools")
        for wid in ("image_color_match", "video_color_match"):
            self.assertIn(wid, scan_workflows.TOOLS)
            self.assertIn(wid, scan_workflows.BUNDLED_CAPABILITIES)

    def test_image_has_target_and_reference_slots(self):
        media = [s for s in self.image["inputs"] if s["type"] in ("image", "audio", "video")]
        self.assertEqual([(s["key"], s["label"], s["type"], s["required"]) for s in media], [
            ("images[0]", "待校色图", "image", True),
            ("images[1]", "参考图", "image", True),
        ])
        self.assertEqual(self.image["slotLimits"], {
            "image": {"min": 2, "max": 2}, "audio": {"min": 0, "max": 0},
            "video": {"min": 0, "max": 0}})
        self.assertEqual((self.image["kind"], self.image["outputType"]), ("tool", "image"))
        self.assertEqual({nid: n["class_type"] for nid, n in self.image_graph.items()}, {
            "1": "LoadImage", "2": "LoadImage", "3": "ColorMatch", "4": "SaveImage"})
        self.assertEqual(set(self.image_graph),
                         scan_workflows.upstream(self.image_graph, "4") | {"4"})
        match = self.image_graph["3"]["inputs"]
        self.assertEqual((match["image_ref"], match["image_target"]), (["2", 0], ["1", 0]))
        self.assertEqual(self.image_graph["4"]["inputs"]["images"], ["3", 0])
        for label in app.step_labels(self.image_graph).values():
            self.assertRegex(label, r"[\u4e00-\u9fff]")

    def test_video_has_shot_and_reference_slots(self):
        media = [s for s in self.video["inputs"] if s["type"] in ("image", "audio", "video")]
        self.assertEqual([(s["key"], s["label"], s["type"], s["required"]) for s in media], [
            ("video[0]", "待校色视频", "video", True),
            ("images[0]", "参考图", "image", True),
        ])
        self.assertEqual(self.video["slotLimits"], {
            "image": {"min": 1, "max": 1}, "audio": {"min": 0, "max": 0},
            "video": {"min": 1, "max": 1}})
        self.assertEqual((self.video["kind"], self.video["outputType"]), ("tool", "video"))
        self.assertEqual({nid: n["class_type"] for nid, n in self.video_graph.items()}, {
            "1": "LoadVideo", "2": "GetVideoComponents", "3": "LoadImage",
            "4": "ColorMatch", "5": "CreateVideo", "6": "SaveVideo"})
        self.assertEqual(set(self.video_graph),
                         scan_workflows.upstream(self.video_graph, "6") | {"6"})
        match = self.video_graph["4"]["inputs"]
        self.assertEqual((match["image_ref"], match["image_target"]), (["3", 0], ["2", 0]))
        self.assertEqual(self.video_graph["5"]["inputs"]["images"], ["4", 0])
        for label in app.step_labels(self.video_graph).values():
            self.assertRegex(label, r"[\u4e00-\u9fff]")

    def test_frame_rate_and_audio_follow_source_shot(self):
        video = self.video_graph["5"]["inputs"]
        self.assertEqual((video["audio"], video["fps"]), (["2", 1], ["2", 2]))
        self.assertEqual(video["color_space"], "sRGB")

    def test_defaults_match_template(self):
        for cap, graph in ((self.image, self.image_graph), (self.video, self.video_graph)):
            for spec in cap["inputs"]:
                target = spec["target"]
                if target.get("kind") != "preset" and "default" in spec:
                    self.assertEqual(graph[target["node"]]["inputs"][target["input"]],
                                     spec["default"], f"{cap['id']}.{spec['key']}")

    def test_missing_assets_rejected(self):
        for assets in ({}, {"images[0]": "shot.png"}, {"images[1]": "reference.png"}):
            with self.subTest(kind="image", assets=assets), self.assertRaises(web.HTTPBadRequest):
                app.patch_graph(self.image, {}, assets)
        for assets in ({}, {"video[0]": "shot.mp4"}, {"images[0]": "reference.png"}):
            with self.subTest(kind="video", assets=assets), self.assertRaises(web.HTTPBadRequest):
                app.patch_graph(self.video, {}, assets)

    def test_parameters_patch_color_match_node(self):
        image = app.patch_graph(self.image, {"strength": "0.45", "match_method": "reinhard"},
                                self.image_assets)
        self.assertEqual(image["1"]["inputs"]["image"], "chouka/shot.png")
        self.assertEqual(image["2"]["inputs"]["image"], "chouka/reference.png")
        self.assertEqual(image["3"]["inputs"]["strength"], 0.45)
        self.assertEqual(image["3"]["inputs"]["method"], "reinhard")

        video = app.patch_graph(self.video, {"strength": "0.45", "match_method": "reinhard"},
                                self.video_assets)
        self.assertEqual(video["1"]["inputs"]["file"], "chouka/shot.mp4")
        self.assertEqual(video["3"]["inputs"]["image"], "chouka/reference.png")
        self.assertEqual(video["4"]["inputs"]["strength"], 0.45)
        self.assertEqual(video["4"]["inputs"]["method"], "reinhard")

        defaults = app.patch_graph(self.video, {}, self.video_assets)
        self.assertEqual((defaults["4"]["inputs"]["method"], defaults["4"]["inputs"]["strength"]),
                         ("mkl", 0.7))
        forced = app.patch_graph(self.image, {"match_method": "hm-mkl-hm", "method": "mvgd"},
                                 self.image_assets)
        self.assertEqual(forced["3"]["inputs"]["method"], "hm-mkl-hm")
        with self.assertRaises(web.HTTPBadRequest):
            app.patch_graph(self.image, {"match_method": "mvgd"}, self.image_assets)

    def test_rescan_preserves_both_modes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "manifests").mkdir()
            (root / "graphs").mkdir()
            for cap, graph in ((self.image, self.image_graph), (self.video, self.video_graph)):
                (root / f"manifests/{cap['id']}.json").write_text(
                    json.dumps(cap), encoding="utf-8")
                (root / cap["graph"]).write_text(json.dumps(graph), encoding="utf-8")
            with mock.patch.object(scan_workflows, "ROOT", root), \
                 mock.patch.object(scan_workflows, "ALIASES", {}), \
                 mock.patch.object(scan_workflows, "BUNDLED_CAPABILITIES",
                                   {"image_color_match", "video_color_match"}), \
                 mock.patch.object(scan_workflows, "load_object_info", return_value={}), \
                 mock.patch.object(scan_workflows, "load_zh", return_value={}), \
                 mock.patch.object(sys, "argv", ["scan_workflows.py"]), \
                 contextlib.redirect_stdout(io.StringIO()):
                scan_workflows.main()
            cards = json.loads((root / "manifests/_cards.json").read_text(encoding="utf-8"))
            tools = next(c for c in cards if c["id"] == "card_tools")
            self.assertEqual(tools["modes"], [IMAGE_MODE, VIDEO_MODE])
            for cap, graph in ((self.image, self.image_graph), (self.video, self.video_graph)):
                self.assertEqual(json.loads((root / cap["graph"]).read_text(encoding="utf-8")),
                                 graph)

    def test_committed_cards_list_both_modes(self):
        cards = json.loads((ROOT / "manifests/_cards.json").read_text(encoding="utf-8"))
        tools = next(c for c in cards if c["id"] == "card_tools")
        self.assertIn(IMAGE_MODE, tools["modes"])
        self.assertIn(VIDEO_MODE, tools["modes"])
        self.assertFalse(any(m.get("id") == "card_color_match" for m in tools["modes"]))


if __name__ == "__main__":
    unittest.main()
