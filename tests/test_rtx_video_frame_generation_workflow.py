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


MODEL_SWITCH = {"gimmvfi": "gimmvfi_interp", "nvidia": "rtx_video_frame_generation"}
FRAME_MODE = {
    "id": "gimmvfi_interp", "name": "视频补帧", "slots": "img0+aud0+vid1",
    "modelSwitch": MODEL_SWITCH,
}


def capability(cid="rtx_video_frame_generation"):
    return json.loads((ROOT / "manifests" / f"{cid}.json").read_text(encoding="utf-8"))


def assert_frame_mode(test, cards):
    tools = [card for card in cards if card["id"] == "card_tools"]
    test.assertEqual(len(tools), 1)
    modes = [mode for card in cards for mode in card["modes"]
             if mode["id"] in MODEL_SWITCH.values() or mode["name"] == "视频补帧"]
    test.assertEqual(modes, [FRAME_MODE])
    test.assertIn(FRAME_MODE, tools[0]["modes"])


class RTXVideoFrameGenerationWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.cap = capability()
        self.graph = json.loads((ROOT / self.cap["graph"]).read_text(encoding="utf-8"))
        self.assets = {"video[0]": "chouka/source.mp4"}

    def test_single_required_video_and_original_nodes(self):
        media = [spec for spec in self.cap["inputs"]
                 if spec["type"] in ("image", "audio", "video")]
        self.assertEqual([(spec["key"], spec["type"], spec["required"]) for spec in media],
                         [("video[0]", "video", True)])
        self.assertEqual(self.cap["slotLimits"], {
            "image": {"min": 0, "max": 0}, "audio": {"min": 0, "max": 0},
            "video": {"min": 1, "max": 1}})
        self.assertEqual(self.cap["slots"], "img0+aud0+vid1")
        self.assertEqual(self.cap["outputType"], "video")
        self.assertEqual((self.cap["kind"], self.cap["card"]), ("tool", "card_tools"))
        self.assertEqual(self.cap["output"], {"node": "9"})
        # Node IDs and types are retained from the user's original UI workflow.
        self.assertEqual({nid: node["class_type"] for nid, node in self.graph.items()}, {
            "6": "LoadVideo", "7": "GetVideoComponents", "12": "PrimitiveInt",
            "10": "RTXVideoFrameGeneration", "11": "ComfyMathExpression",
            "8": "CreateVideo", "9": "SaveVideo"})
        self.assertEqual(set(self.graph), scan_workflows.upstream(self.graph, "9") | {"9"})
        self.assertEqual(self.graph["6"]["inputs"], {"file": ""})

    def test_original_links_shared_multiplier_and_flat_v3_inputs(self):
        # All eleven original links, including the two consumers of PrimitiveInt 12.
        expected = {
            ("7", "video"): ["6", 0],
            ("10", "images"): ["7", 0],
            ("10", "generation_type.multiplier"): ["12", 0],
            ("11", "values.a"): ["7", 2],
            ("11", "values.b"): ["12", 0],
            ("8", "images"): ["10", 0],
            ("8", "audio"): ["7", 1],
            ("8", "fps"): ["11", 0],
            ("8", "bit_depth"): ["7", 3],
            ("8", "color_space"): ["7", 4],
            ("9", "video"): ["8", 0],
        }
        links = {(nid, key): value for nid, node in self.graph.items()
                 for key, value in node["inputs"].items() if isinstance(value, list)}
        self.assertEqual(links, expected)
        self.assertEqual(self.graph["10"]["inputs"]["generation_type"], "frame rate multiplier")
        self.assertEqual(self.graph["11"]["inputs"], {
            "values.a": ["7", 2], "values.b": ["12", 0], "expression": "a * b"})
        self.assertNotIn("values", self.graph["11"]["inputs"])
        self.assertNotIn("multiplier", self.graph["10"]["inputs"])

    def test_original_defaults_and_manifest_targets(self):
        self.assertEqual(self.graph["12"]["inputs"], {"value": 2})
        self.assertEqual(self.graph["10"]["inputs"], {
            "images": ["7", 0], "generation_type": "frame rate multiplier",
            "generation_type.multiplier": ["12", 0], "mode": "HIGH",
            "automatic_shot_change_detection": True, "shot_change": False,
            "image_encoding": "8-bit RGB"})
        self.assertEqual(self.graph["8"]["inputs"]["codec"], "none")
        for key in ("format", "format.codec", "codec"):
            self.assertEqual(self.graph["9"]["inputs"][key], "auto")
        specs = {spec["key"]: spec for spec in self.cap["inputs"]}
        self.assertEqual(specs["frame_multiplier"]["target"], {
            "node": "12", "input": "value", "vtype": "INT"})
        self.assertEqual([specs["frame_multiplier"][key] for key in ("min", "max", "step")],
                         [2, 16, 1])
        self.assertEqual(specs["rtx_auto_shot"]["default"], "on")
        self.assertEqual(specs["rtx_shot_change"]["default"], "off")
        for key in ("rtx_auto_shot", "rtx_shot_change"):
            self.assertEqual(specs[key]["appearance"], "switch")
            self.assertEqual(specs[key]["target"], {"kind": "preset"})
        for spec in self.cap["inputs"]:
            target = spec["target"]
            if target.get("kind") != "preset" and "default" in spec:
                self.assertEqual(self.graph[target["node"]]["inputs"][target["input"]],
                                 spec["default"], spec["key"])
        self.assertTrue(set(specs).isdisjoint({"target_fps", "frame_load_cap", "seed"}))

    def test_patch_multiplier_quality_encoding_and_preserve_links(self):
        for multiplier, quality, encoding in (
                ("3", "LOW", "10-bit RGB (RGB10A2)"),
                (4, "MEDIUM", "8-bit RGB"),
                (16, "HIGH", "10-bit RGB (RGB10A2)")):
            with self.subTest(multiplier=multiplier, quality=quality, encoding=encoding):
                graph = app.patch_graph(self.cap, {
                    "frame_multiplier": multiplier, "rtx_mode": quality,
                    "image_encoding": encoding,
                }, self.assets)
                expected = json.loads(json.dumps(self.graph))
                expected["6"]["inputs"]["file"] = self.assets["video[0]"]
                expected["12"]["inputs"]["value"] = int(multiplier)
                expected["10"]["inputs"].update(mode=quality, image_encoding=encoding)
                self.assertEqual(graph, expected)
                self.assertIsInstance(graph["12"]["inputs"]["value"], int)
        defaults = app.patch_graph(self.cap, {}, self.assets)
        expected = json.loads(json.dumps(self.graph))
        expected["6"]["inputs"]["file"] = self.assets["video[0]"]
        self.assertEqual(defaults, expected)
        self.assertEqual(json.loads((ROOT / self.cap["graph"]).read_text(encoding="utf-8")),
                         self.graph)

    def test_switch_presets_override_conflicting_mirror_parameters(self):
        for auto in ("off", "on"):
            for shot in ("off", "on"):
                with self.subTest(auto=auto, shot=shot):
                    graph = app.patch_graph(self.cap, {
                        "rtx_auto_shot": auto, "rtx_shot_change": shot,
                        "automatic_shot_change_detection": auto != "on",
                        "shot_change": shot != "on",
                    }, self.assets)
                    self.assertIs(graph["10"]["inputs"]["automatic_shot_change_detection"],
                                  auto == "on")
                    self.assertIs(graph["10"]["inputs"]["shot_change"], shot == "on")
        graph = app.patch_graph(self.cap, {
            "automatic_shot_change_detection": False, "shot_change": True,
        }, self.assets)
        self.assertIs(graph["10"]["inputs"]["automatic_shot_change_detection"], True)
        self.assertIs(graph["10"]["inputs"]["shot_change"], False)
        for key in ("rtx_auto_shot", "rtx_shot_change"):
            with self.subTest(invalid=key), self.assertRaises(web.HTTPBadRequest):
                app.patch_graph(self.cap, {key: "invalid"}, self.assets)

    def test_gimm_legacy_parameters_do_not_change_rtx_graph(self):
        params = {"frame_multiplier": 3, "rtx_mode": "MEDIUM"}
        expected = app.patch_graph(self.cap, dict(params), self.assets)
        with mock.patch.object(app, "derive_target_fps") as derive, \
             mock.patch.object(app, "probe_video") as probe:
            graph = app.patch_graph(self.cap, {
                **params, "target_fps": 120, "frame_load_cap": 60, "seed": -1,
            }, self.assets)
        self.assertEqual(graph, expected)
        derive.assert_not_called()
        probe.assert_not_called()

    def test_missing_video_rejected(self):
        for assets in ({}, {"video[0]": ""}, {"images[0]": "wrong.png"},
                       {"audio[0]": "wrong.wav"}, {"video[1]": "wrong-slot.mp4"}):
            with self.subTest(assets=assets), self.assertRaises(web.HTTPBadRequest) as caught:
                app.patch_graph(self.cap, {}, assets)
            self.assertIn("源视频", caught.exception.reason)

    def test_cards_and_scanner_registration_preserve_both_models(self):
        cards = json.loads((ROOT / "manifests/_cards.json").read_text(encoding="utf-8"))
        assert_frame_mode(self, cards)
        self.assertEqual(scan_workflows.MODEL_SWITCHES["gimmvfi_interp"], MODEL_SWITCH)
        self.assertTrue(set(MODEL_SWITCH.values()) <= scan_workflows.TOOLS)
        self.assertIn("rtx_video_frame_generation", scan_workflows.BUNDLED_CAPABILITIES)
        gimm = capability("gimmvfi_interp")
        self.assertEqual((gimm["name"], gimm["card"]), ("视频补帧", "card_tools"))
        self.assertTrue({"target_fps", "frame_load_cap", "seed"} <=
                        {spec["key"] for spec in gimm["inputs"]})

    def test_rescan_preserves_single_mode_and_both_manifests_without_source_files(self):
        gimm = capability("gimmvfi_interp")
        gimm_graph = json.loads((ROOT / gimm["graph"]).read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "manifests").mkdir()
            (root / "graphs").mkdir()
            fixtures = ((gimm, gimm_graph), (self.cap, self.graph))
            for cap, graph in fixtures:
                (root / f"manifests/{cap['id']}.json").write_text(
                    json.dumps(cap), encoding="utf-8")
                (root / cap["graph"]).write_text(json.dumps(graph), encoding="utf-8")
            # Treat the existing GIMM fixture as bundled only inside this isolated scan.
            with mock.patch.object(scan_workflows, "ROOT", root), \
                 mock.patch.object(scan_workflows, "ALIASES", {}), \
                 mock.patch.object(scan_workflows, "BUNDLED_CAPABILITIES", set(MODEL_SWITCH.values())), \
                 mock.patch.object(scan_workflows, "ZH", {}), \
                 mock.patch.object(scan_workflows, "load_object_info", return_value={}), \
                 mock.patch.object(scan_workflows, "load_zh", return_value={}), \
                 mock.patch.object(sys, "argv", ["scan_workflows.py"]), \
                 contextlib.redirect_stdout(io.StringIO()):
                scan_workflows.main()
                scan_workflows.main()
            cards = json.loads((root / "manifests/_cards.json").read_text(encoding="utf-8"))
            assert_frame_mode(self, cards)
            for cap, graph in fixtures:
                self.assertEqual(json.loads((root / f"manifests/{cap['id']}.json").read_text(
                    encoding="utf-8")), cap)
                self.assertEqual(json.loads((root / cap["graph"]).read_text(encoding="utf-8")), graph)


class RTXVideoFrameGenerationRuntimeCardsTest(unittest.IsolatedAsyncioTestCase,
                                              auth_support.AuthFixture):
    async def test_reload_cards_and_generate_dry_run(self):
        self.auth_setup()
        self.addCleanup(self.auth_teardown)
        self.own_project("p")
        self.register_asset("source.browser.mp4")
        self.enterContext(mock.patch.object(app, "PROJ_DIR", self.root / "data/projects"))
        for name in ("CAPS", "ZH_NODES", "STEP_ZH"):
            self.enterContext(mock.patch.dict(getattr(app, name), {}, clear=True))
        self.enterContext(mock.patch.object(app, "CARDS", []))
        application = self.build_app()
        application["video_previews"] = mock.Mock(
            source=mock.Mock(return_value=self.root / "source.browser.mp4"))
        application["distributed"] = app.DistributedStore(self.root / "data/distributed.db")
        self.addCleanup(application["distributed"].close)
        application.router.add_post("/api/reload", app.api_reload)
        application.router.add_get("/api/cards", app.api_cards)
        application.router.add_post("/api/generate", app.api_generate)
        with mock.patch.object(app, "CONTROLLER_MODE", True), \
             mock.patch.object(app, "comfy_submit", new_callable=mock.AsyncMock) as submit, \
             mock.patch.object(app, "inspect_imported_videos") as inspect:
            async with TestClient(TestServer(application)) as client:
                self.client = client
                self.origin = str(client.make_url("/")).rstrip("/")
                client.session.headers.update(await self.login())
                response = await client.post("/api/reload")
                self.assertEqual(response.status, 200, await response.text())
                self.assertTrue((await response.json())["ok"])
                response = await client.get("/api/cards")
                self.assertEqual(response.status, 200, await response.text())
                data = await response.json()
                assert_frame_mode(self, data["cards"])
                for cid in MODEL_SWITCH.values():
                    self.assertEqual(data["capabilities"][cid]["inputs"], capability(cid)["inputs"])
                    self.assertTrue(app.CAPS[cid]["_graph_ok"])
                self.assertEqual(app.model_name("rtx_video_frame_generation"), "NVidia")
                self.assertEqual(app.model_name("gimmvfi_interp"), "GIMM-VFI")
                graph = json.loads((ROOT / capability()["graph"]).read_text(encoding="utf-8"))
                labels = app.step_labels(graph)
                self.assertEqual(set(labels), set(graph))
                for nid, label in labels.items():
                    with self.subTest(node=nid):
                        self.assertRegex(label, r"[\u4e00-\u9fff]")
                        self.assertNotEqual(label, "处理中")
                response = await client.post("/api/generate", json={
                    "capability": "rtx_video_frame_generation", "project": "p", "dry_run": True,
                    "assets": {"video[0]": "chouka/source.browser.mp4"},
                    "params": {
                        "frame_multiplier": "3", "rtx_mode": "MEDIUM",
                        "image_encoding": "10-bit RGB (RGB10A2)",
                        "rtx_auto_shot": "off", "automatic_shot_change_detection": True,
                        "rtx_shot_change": "on", "shot_change": False,
                        "target_fps": 120, "frame_load_cap": 60, "seed": -1,
                    },
                })
                self.assertEqual(response.status, 200, await response.text())
                self.assertEqual(await response.json(), {"dry_run": True, "changed": {
                    "#6.file": ["", "chouka/source.browser.mp4"],
                    "#12.value": [2, 3],
                    "#10.mode": ["HIGH", "MEDIUM"],
                    "#10.image_encoding": ["8-bit RGB", "10-bit RGB (RGB10A2)"],
                    "#10.automatic_shot_change_detection": [True, False],
                    "#10.shot_change": [False, True],
                }})
                response = await client.post("/api/generate", json={
                    "capability": "rtx_video_frame_generation", "project": "p", "dry_run": True,
                    "assets": {}, "params": {},
                })
                self.assertEqual(response.status, 400, await response.text())
                self.assertIn("源视频", await response.text())
            submit.assert_not_awaited()
            inspect.assert_not_called()


if __name__ == "__main__":
    unittest.main()
