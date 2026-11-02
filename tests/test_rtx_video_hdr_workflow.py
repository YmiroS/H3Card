import contextlib
import io
import json
import sys
import tempfile
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
import scan_workflows


def capability():
    return json.loads((ROOT / "manifests/rtx_video_hdr.json").read_text(encoding="utf-8"))


class RTXVideoHDRWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.cap = capability()
        self.graph = json.loads((ROOT / self.cap["graph"]).read_text(encoding="utf-8"))

    def test_single_required_video_and_original_node_chain(self):
        media = [s for s in self.cap["inputs"] if s["type"] in ("image", "audio", "video")]
        self.assertEqual([(s["key"], s["type"], s["required"]) for s in media],
                         [("video[0]", "video", True)])
        self.assertEqual(self.cap["slotLimits"], {
            "image": {"min": 0, "max": 0}, "audio": {"min": 0, "max": 0},
            "video": {"min": 1, "max": 1}})
        self.assertEqual(self.cap["outputType"], "video")
        self.assertEqual(self.cap["output"], {"node": "9"})
        self.assertEqual({nid: n["class_type"] for nid, n in self.graph.items()}, {
            "6": "LoadVideo", "7": "GetVideoComponents", "11": "RTXTrueHDR",
            "8": "CreateVideo", "9": "SaveVideo"})
        self.assertEqual(set(self.graph), scan_workflows.upstream(self.graph, "9") | {"9"})
        self.assertEqual(self.graph["6"]["inputs"]["file"], "")
        self.assertEqual(self.graph["7"]["inputs"]["video"], ["6", 0])
        self.assertEqual(self.graph["11"]["inputs"]["images"], ["7", 0])
        self.assertEqual(self.graph["9"]["inputs"]["video"], ["8", 0])

    def test_hdr_encoding_audio_framerate_and_original_defaults(self):
        video = self.graph["8"]["inputs"]
        self.assertEqual(video, {
            "images": ["11", 0], "audio": ["7", 1], "fps": ["7", 2],
            "bit_depth": "auto", "color_space": "HDR", "codec": "none"})
        self.assertEqual(self.graph["11"]["inputs"], {
            "images": ["7", 0], "contrast": 100, "saturation": 100,
            "middle_gray": 50, "luminance": 650, "debanding": True, "output_colorspace": "HDR"})
        self.assertEqual(self.graph["9"]["inputs"]["format"], "auto")
        self.assertEqual(self.graph["9"]["inputs"]["format.codec"], "auto")
        for spec in self.cap["inputs"]:
            target = spec["target"]
            if target.get("kind") != "preset":
                value = self.graph[target["node"]]["inputs"][target["input"]]
                if "default" in spec:
                    self.assertEqual(value, spec["default"], spec["key"])
        for label in app.step_labels(self.graph).values():
            self.assertRegex(label, r"[\u4e00-\u9fff]")
            self.assertNotEqual(label, "处理中")

    def test_missing_video_rejected_and_parameters_patch_actual_hdr_node(self):
        for assets in ({}, {"images[0]": "wrong.png"}):
            with self.subTest(assets=assets), self.assertRaises(web.HTTPBadRequest):
                app.patch_graph(self.cap, {}, assets)
        graph = app.patch_graph(self.cap, {
            "contrast": "120", "saturation": 90, "middle_gray": 60, "luminance": 1000,
            "debanding_mode": "off", "debanding": True,
        }, {"video[0]": "chouka/source.mp4"})
        self.assertEqual(graph["6"]["inputs"]["file"], "chouka/source.mp4")
        for key, value in {"contrast": 120, "saturation": 90, "middle_gray": 60, "luminance": 1000}.items():
            self.assertEqual(graph["11"]["inputs"][key], value)
        self.assertIs(graph["11"]["inputs"]["debanding"], False)
        for choice, expected in (("off", False), ("on", True)):
            graph = app.patch_graph(self.cap, {"debanding_mode": choice}, {"video[0]": "source.mp4"})
            self.assertIs(graph["11"]["inputs"]["debanding"], expected)
        graph = app.patch_graph(self.cap, {}, {"video[0]": "source.mp4"})
        self.assertIs(graph["11"]["inputs"]["debanding"], True)
        with self.assertRaises(web.HTTPBadRequest):
            app.patch_graph(self.cap, {"debanding_mode": "invalid"}, {"video[0]": "source.mp4"})

    def test_rescan_preserves_bundled_hdr_mode_without_downloads_directory(self):
        self.assertIn("rtx_video_hdr", scan_workflows.BUNDLED_CAPABILITIES)
        self.assertIn("rtx_video_hdr", scan_workflows.TOOLS)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "manifests").mkdir()
            (root / "graphs").mkdir()
            (root / "manifests/rtx_video_hdr.json").write_text(json.dumps(self.cap), encoding="utf-8")
            (root / self.cap["graph"]).write_text(json.dumps(self.graph), encoding="utf-8")
            with mock.patch.object(scan_workflows, "ROOT", root), \
                 mock.patch.object(scan_workflows, "ALIASES", {}), \
                 mock.patch.object(scan_workflows, "BUNDLED_CAPABILITIES", {"rtx_video_hdr"}), \
                 mock.patch.object(scan_workflows, "load_object_info", return_value={}), \
                 mock.patch.object(scan_workflows, "load_zh", return_value={}), \
                 mock.patch.object(sys, "argv", ["scan_workflows.py"]), \
                 contextlib.redirect_stdout(io.StringIO()):
                scan_workflows.main()
            cards = json.loads((root / "manifests/_cards.json").read_text(encoding="utf-8"))
            tools = next(c for c in cards if c["id"] == "card_tools")
            self.assertEqual(tools["modes"], [{"id": "rtx_video_hdr", "name": "HDR增强", "slots": "img0+aud0+vid1"}])
            self.assertEqual(json.loads((root / self.cap["graph"]).read_text()), self.graph)


class RTXVideoHDRRuntimeCardsTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def test_reload_cards_and_generate_dry_run(self):
        self.auth_setup()
        self.addCleanup(self.auth_teardown)
        self.own_project("p")
        self.register_asset("source.browser.mp4")
        self.enterContext(mock.patch.object(app, "PROJ_DIR", self.root / "data/projects"))
        application = self.build_app()
        application["video_previews"] = mock.Mock(source=mock.Mock(return_value=self.root / "source.browser.mp4"))
        application["distributed"] = app.DistributedStore(self.root / "data/distributed.db")
        self.addCleanup(application["distributed"].close)
        application.router.add_post("/api/reload", app.api_reload)
        application.router.add_get("/api/cards", app.api_cards)
        application.router.add_post("/api/generate", app.api_generate)
        with mock.patch.object(app, "CONTROLLER_MODE", True):
            async with TestClient(TestServer(application)) as client:
                self.client = client
                self.origin = str(client.make_url("/")).rstrip("/")
                client.session.headers.update(await self.login())
                self.assertEqual((await client.post("/api/reload")).status, 200)
                data = await (await client.get("/api/cards")).json()
                tools = next(c for c in data["cards"] if c["id"] == "card_tools")
                self.assertEqual([m for m in tools["modes"] if m["id"] == "rtx_video_hdr"],
                                 [{"id": "rtx_video_hdr", "name": "HDR增强", "slots": "img0+aud0+vid1"}])
                self.assertEqual(data["capabilities"]["rtx_video_hdr"]["inputs"], capability()["inputs"])
                response = await client.post("/api/generate", json={
                    "capability": "rtx_video_hdr", "project": "p", "dry_run": True,
                    "assets": {"video[0]": "chouka/source.browser.mp4"},
                    "params": {"contrast": 120, "saturation": 90, "middle_gray": 60,
                               "luminance": 1000, "debanding_mode": "off"},
                })
                self.assertEqual(response.status, 200, await response.text())
                diff = (await response.json())["changed"]
                self.assertEqual(diff["#6.file"][1], "chouka/source.browser.mp4")
                for key, expected in {"contrast": 120, "saturation": 90, "middle_gray": 60, "luminance": 1000}.items():
                    self.assertEqual(diff[f"#11.{key}"][1], expected)
                self.assertIs(diff["#11.debanding"][1], False)


if __name__ == "__main__":
    unittest.main()
