import contextlib
import io
import json
import sys
import tempfile
import unittest
from fractions import Fraction
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


def expected_indexes(source_fps, frames, factor, target_fps):
    # Use exact rational arithmetic, independent of the production float rounding.
    def half_up(value):
        return (2 * value.numerator + value.denominator) // (2 * value.denominator)

    ratio = Fraction(str(target_fps)) / Fraction(str(source_fps))
    count = max(1, half_up(frames * ratio))
    last = (frames - 1) * factor
    return ",".join(str(min(last, half_up(i * factor / ratio))) for i in range(count))


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
        self.probe = self.enterContext(mock.patch.object(
            app, "probe_video", return_value={"fps": 24, "frames": 24}))

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
        # Retain the RTX nodes; replace FPS multiplication with frame selection.
        self.assertEqual({nid: node["class_type"] for nid, node in self.graph.items()}, {
            "6": "LoadVideo", "7": "GetVideoComponents", "12": "PrimitiveInt",
            "10": "RTXVideoFrameGeneration", "13": "VHS_SelectImages",
            "8": "CreateVideo", "9": "SaveVideo"})
        self.assertEqual(set(self.graph), scan_workflows.upstream(self.graph, "9") | {"9"})
        self.assertEqual(self.graph["6"]["inputs"], {"file": ""})

    def test_target_fps_links_and_flat_v3_inputs(self):
        expected = {
            ("7", "video"): ["6", 0],
            ("10", "images"): ["7", 0],
            ("10", "generation_type.multiplier"): ["12", 0],
            ("13", "image"): ["10", 0],
            ("8", "images"): ["13", 0],
            ("8", "audio"): ["7", 1],
            ("8", "bit_depth"): ["7", 3],
            ("8", "color_space"): ["7", 4],
            ("9", "video"): ["8", 0],
        }
        links = {(nid, key): value for nid, node in self.graph.items()
                 for key, value in node["inputs"].items() if isinstance(value, list)}
        self.assertEqual(links, expected)
        self.assertEqual(self.graph["10"]["inputs"]["generation_type"], "frame rate multiplier")
        self.assertNotIn("11", self.graph)
        self.assertEqual(self.graph["13"]["inputs"], {
            "image": ["10", 0], "indexes": "0:",
            "err_if_missing": True, "err_if_empty": True})
        self.assertEqual(self.graph["8"]["inputs"]["fps"], 60)
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
        self.assertEqual(specs["target_fps"]["type"], "number")
        self.assertEqual(specs["target_fps"]["target"], {
            "node": "8", "input": "fps", "vtype": "FLOAT"})
        self.assertEqual([specs["target_fps"][key]
                          for key in ("min", "max", "step", "default")], [1, 120, 1, 60])
        self.assertEqual(specs["target_fps"]["derive"], {
            "kind": "rtx_target_fps", "source": "video[0]",
            "factor": {"node": "12", "input": "value", "min": 2, "max": 16},
            "frames": {"node": "13", "input": "indexes"}})
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
        self.assertTrue(set(specs).isdisjoint({"frame_multiplier", "frame_load_cap", "seed"}))

    def test_patch_target_fps_quality_encoding_and_preserve_links(self):
        for source, target, factor, quality, encoding in (
                (24, "60", 3, "LOW", "10-bit RGB (RGB10A2)"),
                (24, 96, 4, "MEDIUM", "8-bit RGB"),
                (7.5, 120, 16, "HIGH", "10-bit RGB (RGB10A2)")):
            with self.subTest(source=source, target=target, quality=quality, encoding=encoding):
                self.probe.return_value = {"fps": source, "frames": 6}
                graph = app.patch_graph(self.cap, {
                    "target_fps": target, "rtx_mode": quality, "image_encoding": encoding,
                }, self.assets)
                expected = json.loads(json.dumps(self.graph))
                expected["6"]["inputs"]["file"] = self.assets["video[0]"]
                expected["12"]["inputs"]["value"] = factor
                expected["13"]["inputs"]["indexes"] = expected_indexes(source, 6, factor, target)
                expected["8"]["inputs"]["fps"] = float(target)
                expected["10"]["inputs"].update(mode=quality, image_encoding=encoding)
                self.assertEqual(graph, expected)
                self.assertIsInstance(graph["12"]["inputs"]["value"], int)
        self.probe.return_value = {"fps": 24, "frames": 24}
        defaults = app.patch_graph(self.cap, {}, self.assets)
        expected = json.loads(json.dumps(self.graph))
        expected["6"]["inputs"]["file"] = self.assets["video[0]"]
        expected["12"]["inputs"]["value"] = 3
        expected["13"]["inputs"]["indexes"] = expected_indexes(24, 24, 3, 60)
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
        params = {"target_fps": 60, "rtx_mode": "MEDIUM"}
        expected = app.patch_graph(self.cap, dict(params), self.assets)
        with mock.patch.object(app, "derive_target_fps") as derive:
            for multiplier in (2, "16", "invalid"):
                with self.subTest(legacy_multiplier=multiplier):
                    self.probe.reset_mock()
                    graph = app.patch_graph(self.cap, {
                        **params, "frame_multiplier": multiplier, "frame_load_cap": 60, "seed": -1,
                    }, self.assets)
                    self.assertEqual(graph, expected)
                    self.probe.assert_called_once_with(self.assets["video[0]"], count_frames=True)
            changed = app.patch_graph(self.cap, {**params, "target_fps": 48}, self.assets)
        derive.assert_not_called()
        self.assertNotEqual(changed, expected)
        self.assertEqual(changed["8"]["inputs"]["fps"], 48)
        self.assertEqual(changed["12"]["inputs"]["value"], 2)
        self.assertNotEqual(changed["13"]["inputs"]["indexes"], expected["13"]["inputs"]["indexes"])

    def test_target_fps_resamples_with_exact_rate_and_in_range_indexes(self):
        for source, frames, target, factor, output_count in (
                (24, 24, 60, 3, 60),
                (24, 6, 48, 2, 12),
                (30, 30, 60, 2, 60),
                (29.97, 30, 60, 3, 60),
                (24, 6, 24, 2, 6),
                (24, 6, 12, 2, 3),
                (24, 5, 12, 2, 3),  # 2.5 output frames rounds up, not to even.
                (24, 24, 1, 2, 1),
                (24, 1, 60, 3, 3),
                (24, 1, 1, 2, 1)):
            with self.subTest(source=source, frames=frames, target=target):
                self.probe.return_value = {"fps": source, "frames": frames}
                self.probe.reset_mock()
                graph = app.patch_graph(self.cap, {"target_fps": target}, self.assets)
                self.probe.assert_called_once_with(self.assets["video[0]"], count_frames=True)
                self.assertEqual(graph["8"]["inputs"]["fps"], target)
                self.assertEqual(graph["12"]["inputs"]["value"], factor)
                self.assertIsInstance(graph["12"]["inputs"]["value"], int)
                selected = graph["13"]["inputs"]["indexes"]
                self.assertEqual(selected, expected_indexes(source, frames, factor, target))
                indexes = [int(index) for index in selected.split(",")]
                self.assertEqual(len(indexes), output_count)
                self.assertEqual(indexes[0], 0)
                self.assertEqual(indexes, sorted(indexes))
                generated = (frames - 1) * factor + 1
                self.assertTrue(all(0 <= index < generated for index in indexes))
                if frames == 1:
                    self.assertEqual(indexes, [0] * output_count)
                if (source, frames, target) == (24, 6, 48):
                    self.assertEqual(indexes, list(range(11)) + [10])
                if (source, frames, target) == (24, 24, 60):
                    self.assertEqual(indexes[-2:], [69, 69])
                # One-frame minimum is the only exception to half-frame duration accuracy.
                if frames * target / source >= 0.5:
                    self.assertLessEqual(abs(output_count / target - frames / source),
                                         0.5 / target + 1e-9)

    def test_missing_or_invalid_source_metadata_rejected(self):
        for info in ({}, {"frames": 24}, {"fps": 24},
                     {"fps": None, "frames": 24}, {"fps": 24, "frames": None},
                     {"fps": 0, "frames": 24}, {"fps": -24, "frames": 24},
                     {"fps": float("nan"), "frames": 24},
                     {"fps": float("inf"), "frames": 24},
                     {"fps": 24, "frames": 0}, {"fps": 24, "frames": -1}):
            with self.subTest(info=info):
                self.probe.return_value = info
                with self.assertRaises(web.HTTPBadRequest) as caught:
                    app.patch_graph(self.cap, {"target_fps": 60}, self.assets)
                self.assertIn("源视频帧率或帧数", caught.exception.reason)

    def test_invalid_or_out_of_range_target_fps_rejected(self):
        for target in ("invalid", [], {}, "NaN", "Infinity", "-Infinity",
                       float("nan"), float("inf"), float("-inf"), 0, -1, 0.5, 120.01, 121):
            with self.subTest(target=target):
                self.probe.reset_mock()
                with self.assertRaises(web.HTTPBadRequest) as caught:
                    app.patch_graph(self.cap, {"target_fps": target}, self.assets)
                self.assertIn("目标帧率", caught.exception.reason)
                self.probe.assert_not_called()

    def test_target_above_sixteen_times_source_rejected(self):
        self.probe.return_value = {"fps": 3, "frames": 6}
        with self.assertRaises(web.HTTPBadRequest) as caught:
            app.patch_graph(self.cap, {"target_fps": 49}, self.assets)
        self.assertIn("16", caught.exception.reason)
        graph = app.patch_graph(self.cap, {"target_fps": 48}, self.assets)
        self.assertEqual(graph["12"]["inputs"]["value"], 16)
        self.assertEqual(graph["8"]["inputs"]["fps"], 48)
        self.assertEqual(graph["13"]["inputs"]["indexes"], expected_indexes(3, 6, 16, 48))

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
             mock.patch.object(app, "inspect_imported_videos") as inspect, \
             mock.patch.object(app, "probe_video", return_value={"fps": 24, "frames": 24}) as probe:
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
                        "frame_multiplier": "16", "rtx_mode": "MEDIUM",
                        "image_encoding": "10-bit RGB (RGB10A2)",
                        "rtx_auto_shot": "off", "automatic_shot_change_detection": True,
                        "rtx_shot_change": "on", "shot_change": False,
                        "target_fps": 60, "frame_load_cap": 60, "seed": -1,
                    },
                })
                self.assertEqual(response.status, 200, await response.text())
                self.assertEqual(await response.json(), {"dry_run": True, "changed": {
                    "#6.file": ["", "chouka/source.browser.mp4"],
                    "#12.value": [2, 3],
                    "#13.indexes": ["0:", expected_indexes(24, 24, 3, 60)],
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
            probe.assert_called_once_with("chouka/source.browser.mp4", count_frames=True)


if __name__ == "__main__":
    unittest.main()
