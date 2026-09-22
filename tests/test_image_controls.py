import copy
import json
import sys
import unittest
from pathlib import Path
from unittest import mock

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "tests"))
import app
import auth_support
from server.image_controls import CLARITIES, RATIOS, image_controls, patch_image_controls

# Independent expected routing, not imported from the implementation.
LATENTS = {"zimage_t2i": "41", "krea2_t2i": "2", "qwen_image_2512_t2i": "7",
           "qwen_image_21_t2i": "38", "krea2_i2i": "2", "qwen_image_21_i2i": "38"}
SCALES = {"zimage_i2i": "63", "qwen_image_edit_2511_i2i": "16"}
CAP_IDS = tuple(LATENTS) + tuple(SCALES)
LOADERS = {"krea2_i2i": "63", "qwen_image_21_i2i": "1"}
SIZE_NODE = "chouka_image_size"
ASSETS = {f"images[{i}]": f"chouka/image{i}.png" for i in range(3)}
SCALE_FIELDS = {"aspect_ratio", "proportional_width", "proportional_height", "fit",
                "scale_to_side", "scale_to_length", "round_to_multiple"}
INVALID = (None, "", 720, 720.0, True, [], {}, "unknown", " 720P", "720p")
NEGATIVE_PATHS = {
    "qwen_image_2512_t2i": (("9", "text"), ("10", "12")),
    "qwen_image_21_t2i": (("37", "negative_prompt"), ("8",)),
    "qwen_image_edit_2511_i2i": (("1", "prompt"), ("7",)),
    "qwen_image_21_i2i": (("37", "negative_prompt"), ("8",)),
}


def capability(cid):
    return json.loads((ROOT / "manifests" / f"{cid}.json").read_text(encoding="utf-8"))


def template(cid):
    return json.loads((ROOT / capability(cid)["graph"]).read_text(encoding="utf-8"))


def expected_dimensions(ratio, pixels):
    w, h = map(int, ratio.split(":"))
    # Integer half-up arithmetic provides an independent rounding oracle.
    long = ((2 * pixels * max(w, h) + 16 * min(w, h)) // (32 * min(w, h))) * 16
    return (long, pixels) if w >= h else (pixels, long)


def depends_on(graph, value, source):
    if not isinstance(value, list) or len(value) != 2:
        return False
    node = str(value[0])
    if node == source:
        return True
    return any(depends_on(graph, upstream, source)
               for upstream in graph[node]["inputs"].values())


class ImageControlsTest(unittest.TestCase):
    def assert_only_sizing_changed(self, before, after, cid):
        actual = copy.deepcopy(after)
        actual.pop(SIZE_NODE, None)
        node = LATENTS.get(cid, SCALES.get(cid))
        fields = {"width", "height"} if cid in LATENTS else SCALE_FIELDS
        for field in fields:
            if field in before[node]["inputs"]:
                actual[node]["inputs"][field] = before[node]["inputs"][field]
            else:
                actual[node]["inputs"].pop(field, None)
        # Covers models, LoRA, samplers, seed, batch, encoder resolution and all links.
        self.assertEqual(actual, before)

    def test_metadata_and_order(self):
        self.assertEqual(RATIOS, ("1:1", "1:2", "2:1", "9:16", "16:9", "3:4", "4:3",
                                  "3:2", "2:3", "5:4", "4:5", "21:9", "9:21"))
        self.assertEqual(CLARITIES, {"480P": 480, "720P": 720, "1080P": 1080,
                                    "1440P": 1440, "2K": 2048})
        for cid in CAP_IDS:
            mode = cid.rsplit("_", 1)[1]
            self.assertEqual(image_controls(cid), {
                "mode": mode, "defaultRatio": "original" if mode == "i2i" else "3:4",
                "defaultClarity": "720P"})
        self.assertIsNone(image_controls("qwen_image_21_multi"))
        self.assertIsNone(image_controls("unknown"))
        value = image_controls("zimage_t2i")
        value["defaultRatio"] = "broken"
        self.assertEqual(image_controls("zimage_t2i")["defaultRatio"], "3:4")

    def test_negative_prompt_is_exposed_only_when_it_reaches_active_samplers(self):
        marker = "不要出现测试水印"
        declared = set()
        for cid in CAP_IDS:
            cap = capability(cid)
            specs = [spec for spec in cap["inputs"] if spec["key"] == "negative_prompt"]
            if cid not in NEGATIVE_PATHS:
                self.assertEqual(specs, [], cid)
                self.assertNotIn(marker, json.dumps(app.patch_graph(cap, {
                    "seed": 123, "negative_prompt": marker}, ASSETS), ensure_ascii=False), cid)
                continue
            declared.add(cid)
            self.assertEqual(len(specs), 1, cid)
            (source, field), samplers = NEGATIVE_PATHS[cid]
            self.assertEqual(specs[0]["target"], {"node": source, "input": field}, cid)
            graph = app.patch_graph(cap, {"seed": 123, "negative_prompt": marker}, ASSETS)
            self.assertEqual(graph[source]["inputs"][field], marker, cid)
            for sampler in samplers:
                self.assertEqual(graph[sampler]["class_type"], "KSampler", cid)
                self.assertTrue(depends_on(graph, graph[sampler]["inputs"]["negative"], source),
                                f"{cid} #{source} does not reach #{sampler}.negative")
        self.assertEqual(declared, set(NEGATIVE_PATHS))

    def test_negative_prompt_empty_string_overwrites_workflow_defaults(self):
        for cid, ((source, field), _) in NEGATIVE_PATHS.items():
            graph = app.patch_graph(capability(cid), {"seed": 123, "negative_prompt": ""}, ASSETS)
            self.assertEqual(graph[source]["inputs"][field], "", cid)

    def test_all_eight_capabilities_five_clarities_thirteen_ratios(self):
        for cid in CAP_IDS:
            cap = capability(cid)
            baseline = app.patch_graph(cap, {"seed": 123}, ASSETS)
            for clarity, pixels in CLARITIES.items():
                for ratio in RATIOS:
                    with self.subTest(cid=cid, clarity=clarity, ratio=ratio):
                        graph = app.patch_graph(cap, {"seed": 123, "image_ratio": ratio,
                                                      "image_clarity": clarity}, ASSETS)
                        w, h = expected_dimensions(ratio, pixels)
                        node = LATENTS.get(cid, SCALES.get(cid))
                        inputs = graph[node]["inputs"]
                        if cid in LATENTS:
                            self.assertEqual((inputs["width"], inputs["height"]), (w, h))
                            self.assertNotIn(SIZE_NODE, graph)
                        else:
                            self.assertEqual({k: inputs[k] for k in SCALE_FIELDS}, {
                                "aspect_ratio": "custom", "proportional_width": w,
                                "proportional_height": h, "fit": "crop",
                                "scale_to_side": "width", "scale_to_length": w,
                                "round_to_multiple": "8"})
                        self.assert_only_sizing_changed(baseline, graph, cid)

    def test_half_up_ties_and_transpose(self):
        for cid in LATENTS:
            graph = template(cid)
            patch_image_controls(graph, cid, {"image_ratio": "1:1", "image_clarity": "1080P"})
            self.assertEqual(graph[LATENTS[cid]]["inputs"]["width"], 1088)
            self.assertEqual(graph[LATENTS[cid]]["inputs"]["height"], 1080)
        for ratio in RATIOS:
            if ratio == "1:1":
                continue
            reverse = ":".join(reversed(ratio.split(":")))
            for pixels in CLARITIES.values():
                self.assertEqual(expected_dimensions(ratio, pixels),
                                 expected_dimensions(reverse, pixels)[::-1])

    def test_original_i2i_all_clarities_keep_reference_and_sampling_chains(self):
        for cid in (*LOADERS, *SCALES):
            baseline = app.patch_graph(capability(cid), {"seed": 123}, ASSETS)
            for clarity, pixels in CLARITIES.items():
                with self.subTest(cid=cid, clarity=clarity):
                    graph = copy.deepcopy(baseline)
                    patch_image_controls(graph, cid, {"image_ratio": "original", "image_clarity": clarity})
                    if cid in LOADERS:
                        self.assertEqual(graph[SIZE_NODE], {
                            "class_type": "LayerUtility: ImageScaleByAspectRatio V2",
                            "inputs": {"image": [LOADERS[cid], 0], "aspect_ratio": "original",
                                       "proportional_width": 1, "proportional_height": 1,
                                       "fit": "crop", "method": "lanczos", "round_to_multiple": "8",
                                       "scale_to_side": "shortest", "scale_to_length": pixels,
                                       "background_color": "#000000"},
                            "_meta": {"title": "按原图比例设置输出尺寸"}})
                        self.assertEqual(graph[LATENTS[cid]]["inputs"]["width"], [SIZE_NODE, 3])
                        self.assertEqual(graph[LATENTS[cid]]["inputs"]["height"], [SIZE_NODE, 4])
                    else:
                        inputs = graph[SCALES[cid]]["inputs"]
                        for key, value in {"aspect_ratio": "original", "scale_to_side": "shortest",
                                           "scale_to_length": pixels, "round_to_multiple": "8"}.items():
                            self.assertEqual(inputs[key], value)
                        self.assertNotIn(SIZE_NODE, graph)
                    self.assert_only_sizing_changed(baseline, graph, cid)
                    if cid == "qwen_image_edit_2511_i2i":
                        for ref in ("19", "20"):
                            self.assertEqual(graph[ref]["inputs"]["scale_to_length"], ["16", 4])
                        self.assertEqual(graph["3"]["inputs"]["pixels"], ["16", 0])

    def test_omitted_controls_are_a_complete_noop(self):
        for cid in CAP_IDS:
            for params in ({}, {"seed": 123, "width": 999, "scale_to_length": 2048}):
                graph = template(cid)
                before = copy.deepcopy(graph)
                patch_image_controls(graph, cid, params)
                self.assertEqual(graph, before)
            cap = capability(cid)
            with mock.patch.object(app, "patch_image_controls"):
                legacy = app.patch_graph(cap, {"seed": 123}, ASSETS)
            self.assertEqual(app.patch_graph(cap, {"seed": 123}, ASSETS), legacy)

    def test_one_parameter_uses_other_default(self):
        for cid in CAP_IDS:
            for params in ({"image_ratio": "16:9"}, {"image_clarity": "2K"}):
                graph, expected = template(cid), template(cid)
                defaults = image_controls(cid)
                full = {"image_ratio": defaults["defaultRatio"],
                        "image_clarity": defaults["defaultClarity"], **params}
                patch_image_controls(graph, cid, params)
                patch_image_controls(expected, cid, full)
                self.assertEqual(graph, expected)

    def test_invalid_parameters_raise_before_mutation_and_become_400(self):
        for cid in CAP_IDS:
            for key in ("image_ratio", "image_clarity"):
                for value in INVALID:
                    with self.subTest(cid=cid, key=key, value=value):
                        graph = template(cid)
                        before = copy.deepcopy(graph)
                        with self.assertRaises(ValueError):
                            patch_image_controls(graph, cid, {key: value})
                        self.assertEqual(graph, before)
                        with self.assertRaises(web.HTTPBadRequest):
                            app.patch_graph(capability(cid), {key: value}, ASSETS)
            if cid.endswith("t2i"):
                with self.assertRaises(web.HTTPBadRequest):
                    app.patch_graph(capability(cid), {"image_ratio": "original"}, {})

    def test_i2i_still_requires_main_image(self):
        for cid in CAP_IDS:
            if cid.endswith("i2i"):
                for assets in ({}, {"images[1]": ASSETS["images[1]"]}):
                    with self.subTest(cid=cid, assets=assets), self.assertRaises(web.HTTPBadRequest):
                        app.patch_graph(capability(cid), {"image_clarity": "720P"}, assets)

    def test_unrelated_capabilities_are_untouched(self):
        for cid in ("qwen_image_21_multi", "minimax_h3_i2v"):
            graph = template(cid)
            before = copy.deepcopy(graph)
            patch_image_controls(graph, cid, {"image_ratio": None, "image_clarity": []})
            self.assertEqual(graph, before)

    def test_repeated_adaptation_keeps_old_nodes(self):
        for cid in LOADERS:
            graph = template(cid)
            patch_image_controls(graph, cid, {"image_ratio": "original"})
            nodes = set(graph)
            patch_image_controls(graph, cid, {"image_ratio": "16:9"})
            self.assertEqual(set(graph), nodes)
            self.assertEqual(graph[LATENTS[cid]]["inputs"]["width"], 1280)


class ImageControlsRuntimeTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def asyncSetUp(self):
        self.auth_setup()
        self.addCleanup(self.auth_teardown)
        self.own_project("p")
        self.enterContext(mock.patch.object(app, "PROJ_DIR", self.root / "data" / "projects"))
        self.enterContext(mock.patch.object(app, "CONTROLLER_MODE", False))
        # A dry run must not talk to ComfyUI or schedule GPU work.
        self.submit = self.enterContext(mock.patch.object(
            app, "comfy_submit", side_effect=AssertionError("dry run submitted GPU work")))
        for i in range(3):
            self.register_asset(f"image{i}.png")
        application = self.build_app()
        application.router.add_post("/api/reload", app.api_reload)
        application.router.add_get("/api/cards", app.api_cards)
        application.router.add_post("/api/generate", app.api_generate)
        self.client = TestClient(TestServer(application))
        await self.client.start_server()
        self.addAsyncCleanup(self.client.close)
        self.origin = str(self.client.make_url("/")).rstrip("/")
        self.client.session.headers.update(await self.login())
        self.assertEqual((await self.client.post("/api/reload")).status, 200)

    async def generate(self, cid, params, assets=None):
        return await self.client.post("/api/generate", json={
            "capability": cid, "project": "p", "dry_run": True,
            "params": {"seed": 123, **params}, "assets": ASSETS if assets is None else assets})

    async def test_cards_publish_only_eight_metadata_without_changing_manifests(self):
        response = await self.client.get("/api/cards")
        self.assertEqual(response.status, 200)
        caps = (await response.json())["capabilities"]
        self.assertEqual({cid for cid, cap in caps.items() if "imageControls" in cap}, set(CAP_IDS))
        for cid, published in caps.items():
            original = capability(cid)
            if cid in CAP_IDS:
                self.assertEqual(published.pop("imageControls"), image_controls(cid))
                self.assertNotIn("imageControls", original)
            self.assertEqual(published, {k: v for k, v in original.items() if not k.startswith("_")})

    async def test_dry_run_all_models_new_nodes_and_deleted_inputs(self):
        paths = [ROOT / capability(cid)["graph"] for cid in CAP_IDS]
        source_bytes = {p: p.read_bytes() for p in paths}
        for cid in CAP_IDS:
            with self.subTest(cid=cid):
                response = await self.generate(cid, {"image_ratio": "16:9", "image_clarity": "1080P"})
                self.assertEqual(response.status, 200, await response.text())
                result = await response.json()
                self.assertTrue(result["dry_run"])
                node = LATENTS.get(cid, SCALES.get(cid))
                field = "width" if cid in LATENTS else "proportional_width"
                self.assertEqual(result["changed"][f"#{node}.{field}"][1], 1920)
                if cid.endswith("i2i"):
                    response = await self.generate(cid, {"image_clarity": "720P"},
                                                   {"images[0]": ASSETS["images[0]"]})
                    self.assertEqual(response.status, 200, await response.text())
                    changed = (await response.json())["changed"]
                    if cid in LOADERS:
                        self.assertEqual(changed[f"#{SIZE_NODE}.image"], [None, [LOADERS[cid], 0]])
                        graph = app.patch_graph(capability(cid), {"seed": 123, "image_clarity": "720P"},
                                                {"images[0]": ASSETS["images[0]"]})
                        for key, value in graph[SIZE_NODE]["inputs"].items():
                            self.assertEqual(changed[f"#{SIZE_NODE}.{key}"], [None, value])
                        self.assertEqual(changed[f"#{LATENTS[cid]}.height"][1], [SIZE_NODE, 4])
                    if cid == "qwen_image_edit_2511_i2i":
                        for encoder in ("1", "2"):
                            for field in ("image2", "image3"):
                                self.assertEqual(changed[f"#{encoder}.{field}"][1], "<断开>")
        self.assertEqual({p: p.read_bytes() for p in paths}, source_bytes)
        self.submit.assert_not_called()

    async def test_missing_images_and_invalid_values_return_http_400(self):
        for cid in CAP_IDS:
            for key in ("image_ratio", "image_clarity"):
                for value in INVALID:
                    with self.subTest(cid=cid, key=key, value=value):
                        response = await self.generate(cid, {key: value})
                        self.assertEqual(response.status, 400, await response.text())
            if cid.endswith("i2i"):
                response = await self.generate(cid, {"image_clarity": "720P"}, {})
                self.assertEqual(response.status, 400, await response.text())
            else:
                response = await self.generate(cid, {"image_ratio": "original"})
                self.assertEqual(response.status, 400, await response.text())
        self.submit.assert_not_called()


if __name__ == "__main__":
    unittest.main()
