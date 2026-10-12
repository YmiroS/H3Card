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
    return json.loads((ROOT / "manifests/alphagen.json").read_text(encoding="utf-8"))


class AlphaGenWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.cap = capability()
        self.graph = json.loads((ROOT / self.cap["graph"]).read_text(encoding="utf-8"))

    def test_single_required_video_and_only_mask_output(self):
        media = [s for s in self.cap["inputs"] if s["type"] in ("image", "audio", "video")]
        self.assertEqual([(s["key"], s["type"], s["required"]) for s in media],
                         [("video[0]", "video", True)])
        self.assertEqual(self.cap["slotLimits"]["video"], {"min": 1, "max": 1})
        self.assertEqual(self.cap["outputType"], "video")
        self.assertEqual(self.cap["output"], {"node": "9048"})
        self.assertFalse(self.cap["compare"])
        output = self.graph["9048"]["inputs"]
        self.assertEqual(output["images"], ["5538", 0])
        self.assertEqual(output["format"], "video/h264-mp4")
        self.assertTrue(output["save_output"])
        self.assertNotIn("audio", output)
        self.assertEqual([nid for nid, n in self.graph.items()
                          if n["class_type"] == "VHS_VideoCombine"], ["9048"])
        self.assertFalse({"9036", "9044", "9047", "9070", "5544"} & self.graph.keys())
        self.assertEqual(set(self.graph), scan_workflows.upstream(self.graph, "9048") | {"9048"})

    def test_missing_video_cannot_run_author_demo(self):
        for assets in ({}, {"images[0]": "wrong.png"}):
            with self.subTest(assets=assets), self.assertRaises(web.HTTPBadRequest):
                app.patch_graph(self.cap, {}, assets)
        self.assertEqual(self.graph["9021"]["inputs"]["video"], "")

    def test_original_models_and_sampler_defaults(self):
        expected = {
            ("5600", "vae_name"): "ltx-2.5-audio-vae-bf16.safetensors",
            ("5601", "vae_name"): "ltx-2.5-video-vae-bf16.safetensors",
            ("5602", "unet_name"): "ltx-2.5-22b-distilled-transformer-bf16.safetensors",
            ("5604", "clip_name"): "gemma4_e2b_it_bf16.safetensors",
            ("5605", "clip_name"): "gemma4-12b-with-proj-ltx-2.5-bf16.safetensors",
            ("5606", "lora_name"): "ltx-2.5_ic_lora_alpha_v5_s17500.safetensors",
        }
        for (nid, field), value in expected.items():
            self.assertEqual(self.graph[nid]["inputs"][field], value)
        self.assertEqual(self.graph["4832"]["inputs"]["noise_seed"], 42)
        self.assertEqual(self.graph["4828"]["inputs"]["cfg"], 1)
        self.assertEqual(self.graph["4831"]["inputs"]["sampler_name"], "euler_ancestral")
        self.assertEqual(self.graph["4984"]["inputs"]["sigmas"],
                         "1.0, 0.99375, 0.9875, 0.98125, 0.975, 0.909375, 0.725, 0.421875, 0.0")
        self.assertEqual(self.graph["5538"]["inputs"]["temporal_size"], 128)
        self.assertEqual(self.graph["5538"]["inputs"]["temporal_overlap"], 32)
        self.assertEqual(self.graph["9075"]["inputs"]["value"], 241)
        self.assertEqual(self.graph["9069"]["inputs"]["value"], 1088)
        self.assertNotIn("GemmaAPITextEncode", {n["class_type"] for n in self.graph.values()})

    def test_parameters_reach_actual_connected_nodes(self):
        graph = app.patch_graph(self.cap, {
            "shorter_size": 512, "frame_load_cap": 97, "skip_first_frames": 8,
            "noise_seed": 123, "cfg": 1.2, "strength_model": 0.9,
            "prompt": "foreground subject", "negative_prompt": "background",
            "enhance_prompt": "on", "tiled_encode": "on",
        }, {"video[0]": "chouka/source.mp4"})
        for nid, key, expected in (
                ("9021", "video", "chouka/source.mp4"), ("9069", "value", 512),
                ("9075", "value", 97), ("9021", "skip_first_frames", 8),
                ("4832", "noise_seed", 123), ("4828", "cfg", 1.2),
                ("5606", "strength_model", 0.9), ("5508", "value", "foreground subject"),
                ("5509", "value", "background")):
            self.assertEqual(graph[nid]["inputs"][key], expected)
        self.assertIs(graph["5556"]["inputs"]["switch"], True)
        self.assertIs(graph["5012"]["inputs"]["use_tiled_encode"], True)
        for nid in ("9052", "5026"):
            self.assertEqual(graph[nid]["inputs"]["resize_type.shorter_size"], ["9069", 0])
        self.assertEqual(graph["3059"]["inputs"]["length"], ["5029", 2])
        self.assertEqual(graph["9020"]["inputs"]["frames_number"], ["5029", 2])
        self.assertEqual(graph["9048"]["inputs"]["frame_rate"], ["9022", 0])
        self.assertNotIn("audio", graph["9010"]["inputs"])

    def test_boolean_presets_do_not_submit_truthy_off_strings(self):
        for choice, expected in (("off", False), ("on", True)):
            with self.subTest(choice=choice):
                graph = app.patch_graph(self.cap, {
                    "enhance_prompt": choice, "tiled_encode": choice,
                    "enhance_enabled": "false", "use_tiled_encode": "false",
                }, {"video[0]": "source.mp4"})
                self.assertIs(graph["5556"]["inputs"]["switch"], expected)
                self.assertIs(graph["5012"]["inputs"]["use_tiled_encode"], expected)
        with self.assertRaises(web.HTTPBadRequest):
            app.patch_graph(self.cap, {"enhance_prompt": "invalid"}, {"video[0]": "source.mp4"})

    def test_all_controls_have_valid_targets_and_chinese_progress(self):
        for spec in self.cap["inputs"]:
            target = spec["target"]
            if target.get("kind") != "preset":
                self.assertIn(target["input"], self.graph[target["node"]]["inputs"])
        for title in app.step_labels(self.graph).values():
            self.assertRegex(title, r"[\u4e00-\u9fff]")
            self.assertNotEqual(title, "处理中")

    def test_rescan_keeps_tool_without_original_windows_workflow(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "manifests").mkdir()
            (root / "graphs").mkdir()
            (root / "manifests/alphagen.json").write_text(json.dumps(self.cap), encoding="utf-8")
            (root / self.cap["graph"]).write_text(json.dumps(self.graph), encoding="utf-8")
            with mock.patch.object(scan_workflows, "ROOT", root), \
                 mock.patch.object(scan_workflows, "ALIASES", {}), \
                 mock.patch.object(scan_workflows, "BUNDLED_CAPABILITIES", {"alphagen"}), \
                 mock.patch.object(scan_workflows, "load_object_info", return_value={}), \
                 mock.patch.object(scan_workflows, "load_zh", return_value={}), \
                 mock.patch.object(sys, "argv", ["scan_workflows.py"]), \
                 contextlib.redirect_stdout(io.StringIO()):
                scan_workflows.main()
            cards = json.loads((root / "manifests/_cards.json").read_text(encoding="utf-8"))
            tools = next(c for c in cards if c["id"] == "card_tools")
            self.assertEqual(tools["modes"], [{"id": "alphagen", "name": "AlphaGen", "slots": "img0+aud0+vid1"}])
            self.assertEqual(json.loads((root / self.cap["graph"]).read_text()), self.graph)


class AlphaGenRuntimeCardsTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def test_reload_cards_and_real_generate_dry_run(self):
        self.auth_setup()
        self.addCleanup(self.auth_teardown)
        self.own_project("p")
        self.register_asset("source.browser.mp4")
        self.enterContext(mock.patch.object(app, "PROJ_DIR", self.root / "data/projects"))
        application = self.build_app()
        application["video_previews"] = mock.Mock(
            source=mock.Mock(return_value=self.root / "source.browser.mp4"))
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
                response = await client.post("/api/reload")
                self.assertEqual(response.status, 200)
                response = await client.get("/api/cards")
                data = await response.json()
                tools = next(c for c in data["cards"] if c["id"] == "card_tools")
                self.assertEqual([m for m in tools["modes"] if m["id"] == "alphagen"],
                                 [{"id": "alphagen", "name": "AlphaGen", "slots": "img0+aud0+vid1"}])
                self.assertEqual(data["capabilities"]["alphagen"]["inputs"], capability()["inputs"])
                response = await client.post("/api/generate", json={
                    "capability": "alphagen", "project": "p", "dry_run": True,
                    "assets": {"video[0]": "chouka/source.browser.mp4"},
                    "params": {"shorter_size": 512, "frame_load_cap": 97, "noise_seed": 123,
                               "enhance_prompt": "on", "tiled_encode": "on"},
                })
                self.assertEqual(response.status, 200, await response.text())
                diff = (await response.json())["changed"]
                self.assertEqual(diff["#9021.video"][1], "chouka/source.browser.mp4")
                self.assertEqual(diff["#9069.value"][1], 512)
                self.assertEqual(diff["#9075.value"][1], 97)
                self.assertEqual(diff["#4832.noise_seed"][1], 123)
                self.assertIs(diff["#5556.switch"][1], True)
                self.assertIs(diff["#5012.use_tiled_encode"][1], True)


if __name__ == "__main__":
    unittest.main()
