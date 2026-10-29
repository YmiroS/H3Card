"""Pure diagnostic tests: no ComfyUI imports, media I/O, or real probes."""

import copy
import json
from pathlib import Path
import unittest
from unittest.mock import Mock

from server.reference_load import make_reference_load


H3 = "MiniMaxH3ReferenceToVideo"
IMAGE = "ref_images.ref_image_0"
VIDEO = "ref_videos.ref_video_0"
AUDIO = "ref_audios.ref_audio_0"
SOUND = "ref_video_audios.ref_video_audio_0"
EXPRESSION = "max(5, round(a * 24)) + (5 - (max(5, round(a * 24)) % 17)) % 17"


def node(kind, **inputs):
    return {"class_type": kind, "inputs": inputs}


def h3(**inputs):
    return node(H3, **{"width": 1344, "height": 768, "length": 124,
                       "ref_image_size": "match", **inputs})


def metadata(width=1920, height=1080, frames=240, fps=24, duration=10, has_audio=True):
    return dict(width=width, height=height, frames=frames, fps=fps,
                duration=duration, has_audio=has_audio)


def graph_with(loader="LoadImage", slot=IMAGE, output=0, **settings):
    field = {"LoadImage": "image", "LoadAudio": "audio", "LoadVideo": "file"}.get(loader, "video")
    return {"source": node(loader, **{field: "PRIVATE_MEDIA", **settings}),
            "consumer": h3(**{slot: ["source", output]})}


def first(result):
    return result["groups"][0]["references"][0]


class ReferenceLoadTests(unittest.TestCase):
    def estimate(self, graph, data=None):
        return make_reference_load(graph, lambda ref: metadata() if data is None else data)

    def test_patched_h3_multiple_references_and_privacy(self):
        graph = {
            "image1": node("LoadImage", image="SECRET_IMAGE_1"),
            "image2": node("LoadImage", image="SECRET_IMAGE_2"),
            "video": node("VHS_LoadVideoFFmpeg", video="SECRET_VIDEO", force_rate=24,
                          frame_load_cap=130, start_time=0, custom_width=0, custom_height=0,
                          format="AnimateDiff"),
            "audio": node("LoadAudio", audio="SECRET_AUDIO"),
            "template": node("LoadImage", image="UNCONNECTED_TEMPLATE"),
            "consumer": h3(**{
                IMAGE: ["image1", 0], "ref_images.ref_image_1": ["image2", 0],
                VIDEO: ["video", 0], SOUND: ["video", 2], AUDIO: ["audio", 0],
                "width": 1280, "height": 720, "length": 126,
                "ref_image_size": "max", "prompt": "PRIVATE_PROMPT", "seed": 9988776655,
            }),
        }
        original = copy.deepcopy(graph)
        probe = Mock(side_effect=lambda ref: {
            "SECRET_IMAGE_1": metadata(4096, 3072, 1, None, None, False),
            "SECRET_IMAGE_2": metadata(1024, 768, 1, None, None, False),
            "SECRET_VIDEO": metadata(), "SECRET_AUDIO": metadata(None, None, None, None, 30),
        }[ref])
        result = make_reference_load(graph, probe)
        self.assertTrue(result["complete"])
        group = result["groups"][0]
        self.assertEqual((group["width"], group["height"], group["frames"]), (1280, 720, 141))
        self.assertEqual([group[k + "_count"] for k in ("image", "video", "audio", "video_audio")], [2, 1, 1, 1])
        image1, image2, video, sound, audio = group["references"]
        self.assertEqual((image1["width"], image1["height"]), (2720, 2048))
        self.assertEqual((image2["width"], image2["height"]), (1024, 768))
        self.assertEqual((video["width"], video["height"], video["frames"]), (1344, 768, 124))
        self.assertEqual(video["raw_frames"], 240)
        self.assertEqual(video["duration"], 124 / 24)
        self.assertEqual(sound["duration"], 124 / 24)
        self.assertEqual(audio["duration"], 30)
        self.assertEqual(group["image_pixels"], 2720 * 2048 + 1024 * 768)
        self.assertEqual(group["video_pixel_frames"], 1344 * 768 * 124)
        self.assertEqual(probe.call_count, 4)
        self.assertEqual(graph, original)
        serialized = json.dumps(result, allow_nan=False)
        for secret in ("SECRET", "PRIVATE", "UNCONNECTED", "9988776655", "prompt", "seed"):
            self.assertNotIn(secret, serialized)
        self.assertEqual(set(result), {"version", "source", "groups", "complete"})
        self.assertEqual(set(group), {"node_id", "node_type", "width", "height", "frames",
                                    "ref_image_size", "references", "image_count", "video_count",
                                    "audio_count", "video_audio_count", "image_pixels", "video_pixel_frames"})
        self.assertEqual(set(image1), {"kind", "input", "source_node", "raw_width", "raw_height",
                                     "raw_frames", "raw_fps", "raw_duration", "width", "height",
                                     "frames", "duration", "estimated"})
        self.assertTrue(all(ref["estimated"] for ref in group["references"]))

    def test_match_and_max_downscale_differ_without_upscaling(self):
        graph = graph_with()
        results = []
        for mode in ("match", "max"):
            graph["consumer"]["inputs"]["ref_image_size"] = mode
            result = self.estimate(graph, metadata(4096, 3072, 1))
            self.assertTrue(result["complete"])
            ref = first(result)
            results.append((ref["width"], ref["height"]))
        self.assertEqual(results, [(1184, 864), (2720, 2048)])
        ref = first(self.estimate(graph, metadata(65, 33, 1)))
        self.assertEqual((ref["width"], ref["height"]), (64, 32))

    def test_bankers_rounding_and_minimum_32(self):
        graph = graph_with()
        graph["consumer"]["inputs"]["ref_image_size"] = "max"
        self.assertEqual(first(self.estimate(graph, metadata(80, 1, 1)))["width"], 64)
        self.assertEqual(first(self.estimate(graph, metadata(80, 1, 1)))["height"], 32)

    def test_video_canvas_small_source_and_ultrawide_cap(self):
        graph = graph_with("VHS_LoadVideoFFmpeg", VIDEO)
        small = first(self.estimate(graph, metadata(641, 359)))
        self.assertEqual((small["width"], small["height"]), (640, 352))
        wide = first(self.estimate(graph, metadata(4000, 500)))
        self.assertEqual((wide["width"], wide["height"]), (2880, 352))

    def test_generation_aligns_up_but_retained_video_aligns_down(self):
        graph = graph_with("VHS_LoadVideoFFmpeg", VIDEO)
        for length, source, generated, retained in ((125, 200, 141, 141), (124, 123, 124, 107),
                                                    (5, 240, 5, 5), (1, 5, 5, 5)):
            with self.subTest(length=length, source=source):
                graph["consumer"]["inputs"]["length"] = length
                result = self.estimate(graph, metadata(frames=source))
                self.assertEqual(result["groups"][0]["frames"], generated)
                self.assertEqual(first(result)["frames"], retained)
                self.assertTrue(result["complete"])
        result = self.estimate(graph, metadata(frames=4))
        self.assertIsNone(first(result)["frames"])
        self.assertIsNone(result["groups"][0]["video_pixel_frames"])
        self.assertFalse(result["complete"])

    def test_no_references_does_not_probe_disconnected_template(self):
        probe = Mock(side_effect=AssertionError("must not probe"))
        graph = {"template": node("LoadImage", image="PRIVATE"), "consumer": h3()}
        result = make_reference_load(graph, probe)
        self.assertTrue(result["complete"])
        self.assertEqual(result["groups"][0]["references"], [])
        self.assertEqual(result["groups"][0]["image_pixels"], 0)
        self.assertEqual(result["groups"][0]["video_pixel_frames"], 0)
        probe.assert_not_called()
        self.assertEqual(make_reference_load({}, probe)["groups"], [])
        self.assertTrue(make_reference_load({}, probe)["complete"])

    def test_consumers_are_separate_not_summed_or_deduplicated(self):
        graph = graph_with()
        graph["second"] = copy.deepcopy(graph["consumer"])
        probe = Mock(return_value=metadata())
        result = make_reference_load(graph, probe)
        self.assertEqual(len(result["groups"]), 2)
        a, b = result["groups"]
        self.assertEqual(a["image_count"], 1)
        self.assertEqual(a["image_pixels"], b["image_pixels"])
        self.assertNotEqual(a["node_id"], b["node_id"])
        self.assertNotIn("image_pixels", result)
        probe.assert_called_once_with("PRIVATE_MEDIA")

    def test_qwen_positive_negative_and_qwen21_raw_only(self):
        graph = {"source": node("LoadImage", image="PRIVATE")}
        for name in ("positive", "negative"):
            graph[name] = node("TextEncodeQwenImageEditPlus", image1=["source", 0],
                               image2=["source", 0], image3=None, image4=["source", 0])
        graph["qwen21"] = node("TextEncodeQwenImage21", **{
            "images.image_1": ["source", 0], "images.image_16": ["source", 0],
            "images.image_invalid": ["source", 0], "prompt": "SECRET"})
        probe = Mock(return_value=metadata(1200, 800, 1))
        result = make_reference_load(graph, probe)
        self.assertFalse(result["complete"])
        self.assertEqual(len(result["groups"]), 3)
        self.assertEqual([g["image_count"] for g in result["groups"]], [2, 2, 2])
        for group in result["groups"]:
            self.assertIsNone(group["image_pixels"])
            for ref in group["references"]:
                self.assertEqual((ref["raw_width"], ref["raw_height"]), (1200, 800))
                self.assertIsNone(ref["width"])
                self.assertIsNone(ref["height"])
                self.assertIsNone(ref["frames"])
        probe.assert_called_once_with("PRIVATE")

    def test_unknown_resize_keeps_raw_not_effective(self):
        graph = graph_with()
        graph["resize"] = node("UnknownResize", image=["source", 0], width=64, height=64)
        graph["consumer"]["inputs"][IMAGE] = ["resize", 0]
        result = self.estimate(graph)
        ref = first(result)
        self.assertEqual(ref["source_node"], "resize")
        self.assertEqual(ref["raw_width"], 1920)
        self.assertIsNone(ref["width"])
        self.assertIsNone(ref["height"])
        self.assertFalse(result["complete"])
        self.assertIsNone(result["groups"][0]["image_pixels"])

    def test_unknown_transform_with_multiple_sources_has_no_guessed_provenance(self):
        graph = graph_with()
        graph["other"] = node("LoadImage", image="OTHER")
        graph["resize"] = node("UnknownMix", image=["source", 0], images=["other", 0])
        graph["consumer"]["inputs"][IMAGE] = ["resize", 0]
        probe = Mock(return_value=metadata())
        result = make_reference_load(graph, probe)
        self.assertIsNone(first(result)["raw_width"])
        self.assertFalse(result["complete"])
        probe.assert_not_called()

    def test_known_total_pixel_resize_matches_implementation(self):
        graph = graph_with()
        graph["resize"] = node("ImageScaleToTotalPixels", image=["source", 0],
                               megapixels=1.0, resolution_steps=32, upscale_method="lanczos")
        graph["consumer"]["inputs"].update({IMAGE: ["resize", 0], "ref_image_size": "max"})
        result = self.estimate(graph, metadata(2000, 1000, 1))
        ref = first(result)
        self.assertEqual((ref["raw_width"], ref["raw_height"]), (2000, 1000))
        self.assertEqual((ref["width"], ref["height"]), (1440, 736))
        self.assertTrue(result["complete"])
        graph["resize"]["inputs"]["resolution_steps"] = ["unknown", 0]
        result = self.estimate(graph)
        self.assertIsNone(first(result)["width"])
        self.assertFalse(result["complete"])

    def test_kontext_resize_uses_fixed_closest_aspect_canvas(self):
        graph = graph_with()
        graph["resize"] = node("FluxKontextImageScale", image=["source", 0])
        graph["consumer"]["inputs"].update({IMAGE: ["resize", 0], "ref_image_size": "max"})
        result = self.estimate(graph, metadata(2000, 1000, 1))
        # Kontext chooses 1456x720; H3 then rounds each axis to 32.
        self.assertEqual((first(result)["width"], first(result)["height"]), (1472, 704))
        self.assertTrue(result["complete"])

    def test_resolution_primitive_and_exact_h3_math_links(self):
        graph = graph_with("VHS_LoadVideoFFmpeg", VIDEO, frame_load_cap=["length", 1])
        graph.update({
            "ratio": node("PrimitiveString", value="16:9 (Widescreen)"),
            "mp": node("PrimitiveFloat", value=1.1),
            "multiple": node("PrimitiveInt", value=32),
            "seconds": node("PrimitiveFloat", value=6),
            "mode": node("PrimitiveStringMultiline", value="match"),
            "resolution": node("ResolutionSelector", aspect_ratio=["ratio", 0], megapixels=["mp", 0], multiple=["multiple", 0]),
            "length": node("ComfyMathExpression", **{"values.a": ["seconds", 0], "expression": EXPRESSION}),
        })
        graph["consumer"]["inputs"].update(width=["resolution", 0], height=["resolution", 1],
                                              length=["length", 1], ref_image_size=["mode", 0])
        result = self.estimate(graph)
        group = result["groups"][0]
        self.assertEqual((group["width"], group["height"], group["frames"]), (1440, 800, 158))
        self.assertEqual(first(result)["frames"], 158)
        self.assertTrue(result["complete"])
        graph["length"]["inputs"]["expression"] = "a * 24"
        result = self.estimate(graph)
        self.assertIsNone(result["groups"][0]["frames"])
        self.assertIsNone(first(result)["frames"])
        self.assertFalse(result["complete"])

    def test_unknown_literal_node_and_wrong_slots_are_not_passthroughs(self):
        for source in (node("UnknownPrimitive", value=1344), node("PrimitiveInt", value=1344)):
            graph = graph_with()
            graph["width"] = source
            graph["consumer"]["inputs"]["width"] = ["width", 1 if source["class_type"] == "PrimitiveInt" else 0]
            result = self.estimate(graph)
            self.assertIsNone(result["groups"][0]["width"])
            self.assertIsNone(first(result)["width"])
            self.assertFalse(result["complete"])
        graph["consumer"]["inputs"]["ref_image_size"] = "max"
        result = self.estimate(graph)
        self.assertTrue(result["complete"], "max references do not need a generation area")

    def test_missing_probe_metadata_and_probe_exceptions_never_become_zero(self):
        for data in ({}, None, [], "private failure", {"width": 1000}):
            graph = graph_with()
            probe = Mock(return_value=data)
            result = make_reference_load(graph, probe)
            self.assertFalse(result["complete"])
            self.assertIsNone(first(result)["width"])
            self.assertIsNone(result["groups"][0]["image_pixels"])
        graph["consumer"]["inputs"]["ref_images.ref_image_1"] = ["source", 0]
        probe = Mock(side_effect=OSError("PRIVATE_PATH"))
        result = make_reference_load(graph, probe)
        probe.assert_called_once()
        self.assertEqual(len(result["groups"][0]["references"]), 2)
        self.assertNotIn("PRIVATE_PATH", json.dumps(result))

    def test_non_finite_boolean_negative_and_unsafe_numbers_are_unknown(self):
        for value in (float("nan"), float("inf"), -float("inf"), -1, 0, True, "1920", 2 ** 10000, 1.5):
            with self.subTest(value_type=type(value).__name__):
                result = self.estimate(graph_with(), metadata(width=value))
                self.assertIsNone(first(result)["raw_width"])
                self.assertIsNone(first(result)["width"])
                self.assertFalse(result["complete"])
                json.dumps(result, allow_nan=False)
        for value in (float("nan"), float("inf"), True, -1):
            graph = graph_with()
            graph["consumer"]["inputs"]["width"] = value
            result = self.estimate(graph)
            self.assertFalse(result["complete"])
            json.dumps(result, allow_nan=False)

    def test_cycles_and_depth_limit_terminate_without_fabrication(self):
        graph = graph_with()
        graph["resize"] = node("UnknownResize", image=["resize", 0])
        graph["consumer"]["inputs"][IMAGE] = ["resize", 0]
        graph["width"] = node("PrimitiveInt", value=["width", 0])
        graph["consumer"]["inputs"]["width"] = ["width", 0]
        probe = Mock(return_value=metadata())
        result = make_reference_load(graph, probe)
        self.assertFalse(result["complete"])
        self.assertIsNone(first(result)["raw_width"])
        self.assertIsNone(result["groups"][0]["width"])
        probe.assert_not_called()
        for i in range(40):
            graph[str(i)] = node("UnknownResize", image=[str(i + 1), 0])
        graph["40"] = node("LoadImage", image="PRIVATE")
        graph["consumer"]["inputs"][IMAGE] = ["0", 0]
        result = make_reference_load(graph, probe)
        self.assertFalse(result["complete"])
        probe.assert_not_called()

    def test_only_loader_literal_filenames_can_be_probed(self):
        for value in (["text", 0], {"path": "PRIVATE"}, "", None):
            graph = graph_with()
            graph["source"]["inputs"]["image"] = value
            graph["text"] = node("PrimitiveString", value="PRIVATE")
            probe = Mock(return_value=metadata())
            result = make_reference_load(graph, probe)
            self.assertFalse(result["complete"])
            probe.assert_not_called()
        graph = graph_with(output=1)
        probe = Mock(return_value=metadata())
        result = make_reference_load(graph, probe)
        self.assertFalse(result["complete"])
        probe.assert_not_called()

    def test_audio_requires_duration_not_image_dimensions(self):
        graph = graph_with("LoadAudio", AUDIO)
        result = self.estimate(graph, {"duration": 3.5})
        ref = first(result)
        self.assertTrue(result["complete"])
        self.assertEqual(ref["duration"], 3.5)
        self.assertIsNone(ref["width"])
        self.assertIsNone(ref["frames"])
        result = self.estimate(graph, {"width": 100, "height": 100})
        self.assertFalse(result["complete"])
        self.assertIsNone(first(result)["duration"])

    def test_pair_audio_trim_uses_matching_suffix_not_list_order(self):
        graph = graph_with("VHS_LoadVideoFFmpeg", VIDEO)
        graph["consumer"]["inputs"].update({SOUND: ["source", 2],
                                              "ref_video_audios.ref_video_audio_1": ["source", 2]})
        result = self.estimate(graph)
        refs = result["groups"][0]["references"]
        self.assertEqual(refs[1]["duration"], refs[0]["frames"] / 24)
        self.assertIsNone(refs[2]["duration"])
        self.assertFalse(result["complete"])

    def test_builtin_load_video_and_get_components(self):
        graph = graph_with("LoadVideo", VIDEO)
        graph["components"] = node("GetVideoComponents", video=["source", 0])
        graph["consumer"]["inputs"].update({VIDEO: ["components", 0], SOUND: ["components", 1]})
        result = self.estimate(graph)
        self.assertTrue(result["complete"])
        self.assertEqual(first(result)["frames"], 124)
        self.assertEqual(result["groups"][0]["references"][1]["duration"], 124 / 24)
        graph["consumer"]["inputs"][VIDEO] = ["source", 0]
        result = self.estimate(graph)
        self.assertFalse(result["complete"], "a VIDEO object is not an IMAGE tensor")

    def test_loader_unknown_controls_do_not_erase_raw_or_invent_frames(self):
        for loader in ("VHS_LoadVideo", "VHS_LoadVideoFFmpeg"):
            for field, value in (("force_rate", ["unknown", 0]), ("frame_load_cap", float("inf")),
                                 ("force_size", "512x512"), ("format", "UnknownPluginFormat"),
                                 ("meta_batch", ["batch", 0]), ("vae", ["vae", 0])):
                with self.subTest(loader=loader, field=field):
                    graph = graph_with(loader, VIDEO, **{field: value})
                    result = self.estimate(graph)
                    ref = first(result)
                    self.assertEqual(ref["raw_frames"], 240)
                    self.assertIsNone(ref["frames"])
                    self.assertFalse(result["complete"])

    def test_loader_unknown_resize_keeps_temporal_estimate_but_not_size(self):
        graph = graph_with("VHS_LoadVideo", VIDEO, custom_width=["unknown", 0])
        result = self.estimate(graph)
        self.assertEqual(first(result)["frames"], 124)
        self.assertIsNone(first(result)["width"])
        self.assertFalse(result["complete"])

    def test_vhs_skip_every_and_cap_apply_before_h3_alignment(self):
        graph = graph_with("VHS_LoadVideo", VIDEO, force_rate=24, frame_load_cap=80,
                           skip_first_frames=11, select_every_nth=2)
        graph["consumer"]["inputs"]["length"] = 400
        result = self.estimate(graph, metadata(frames=240))
        self.assertEqual(first(result)["frames"], 73)
        graph["source"]["inputs"]["frame_load_cap"] = 0
        result = self.estimate(graph, metadata(frames=240))
        self.assertEqual(first(result)["frames"], 107)  # ceil((240 - 11) / 2) = 115
        self.assertTrue(result["complete"])

    def test_vhs_rate_conversion_uses_cv_first_frame_semantics(self):
        graph = graph_with("VHS_LoadVideo", VIDEO, force_rate=24)
        graph["consumer"]["inputs"]["length"] = 400
        result = self.estimate(graph, metadata(frames=100, fps=10, duration=10))
        # CV yields floor((100-1)*24/10)+1 = 238, then H3 retains 226.
        self.assertEqual(first(result)["frames"], 226)
        self.assertEqual(first(result)["raw_fps"], 10)
        self.assertTrue(result["complete"])

    def test_ffmpeg_start_rate_and_cap(self):
        graph = graph_with("VHS_LoadVideoFFmpeg", VIDEO, force_rate=24, start_time=3,
                           frame_load_cap=130)
        graph["consumer"]["inputs"]["length"] = 400
        result = self.estimate(graph, metadata(frames=300, fps=30, duration=10))
        self.assertEqual(first(result)["frames"], 124)
        graph["source"]["inputs"]["frame_load_cap"] = 0
        result = self.estimate(graph, metadata(frames=300, fps=30, duration=10))
        self.assertEqual(first(result)["frames"], 158)  # 7 * 24 -> 168 -> 158
        self.assertTrue(result["complete"])
        for loader, settings in (("VHS_LoadVideo", {"start_time": 1}),
                                 ("VHS_LoadVideoFFmpeg", {"skip_first_frames": 1}),
                                 ("VHS_LoadVideoFFmpeg", {"select_every_nth": 2})):
            result = self.estimate(graph_with(loader, VIDEO, **settings))
            self.assertIsNone(first(result)["frames"])
            self.assertFalse(result["complete"])

    def test_vhs_custom_dimensions_and_alignment(self):
        for loader in ("VHS_LoadVideo", "VHS_LoadVideoFFmpeg"):
            for cw, ch, expected in ((640, 0, (640, 352)), (0, 360, (640, 352)),
                                     (640, 640, (640, 640))):
                graph = graph_with(loader, VIDEO, custom_width=cw, custom_height=ch, format="AnimateDiff")
                result = self.estimate(graph)
                self.assertEqual((first(result)["width"], first(result)["height"]), expected)
                self.assertTrue(result["complete"])
        # CV unconditionally applies format's 8px rounding; FFmpeg without
        # custom dimensions retains native dimensions before H3 rounding.
        graph = graph_with("VHS_LoadVideo", VIDEO, format="AnimateDiff")
        cv = first(self.estimate(graph, metadata(624, 351)))
        graph["source"]["class_type"] = "VHS_LoadVideoFFmpeg"
        ff = first(self.estimate(graph, metadata(624, 351)))
        self.assertEqual((cv["width"], cv["height"]), (640, 352))
        self.assertEqual((ff["width"], ff["height"]), (640, 352))

    def test_vhs_audio_duration_uses_skip_and_cap_before_pair_trim(self):
        graph = graph_with("VHS_LoadVideo", AUDIO, output=2, force_rate=24,
                           skip_first_frames=24, select_every_nth=2, frame_load_cap=36)
        result = self.estimate(graph)
        self.assertEqual(first(result)["duration"], 3)
        self.assertEqual(first(result)["raw_duration"], 10)
        self.assertTrue(result["complete"])
        graph["source"]["inputs"]["frame_load_cap"] = 0
        self.assertEqual(first(self.estimate(graph))["duration"], 9)
        result = self.estimate(graph, metadata(has_audio=False))
        self.assertIsNone(first(result)["duration"])
        self.assertFalse(result["complete"])

    def test_partial_group_aggregate_is_unknown_not_partial_sum(self):
        graph = graph_with()
        graph["consumer"]["inputs"]["ref_images.ref_image_1"] = ["missing", 0]
        result = self.estimate(graph)
        self.assertEqual(result["groups"][0]["image_count"], 2)
        self.assertIsNone(result["groups"][0]["image_pixels"])
        self.assertFalse(result["complete"])

    def test_output_limits_are_explicitly_incomplete(self):
        graph = {str(i): h3() for i in range(65)}
        result = self.estimate(graph)
        self.assertEqual(len(result["groups"]), 64)
        self.assertFalse(result["complete"])
        graph = graph_with()
        graph["consumer"]["inputs"].update({"ref_images.ref_image_" + str(i): ["source", 0] for i in range(65)})
        result = self.estimate(graph)
        self.assertEqual(len(result["groups"][0]["references"]), 64)
        self.assertEqual(result["groups"][0]["image_count"], 64)
        self.assertFalse(result["complete"])

    def test_identifier_and_input_limits(self):
        graph = {"x" * 161: h3()}
        result = self.estimate(graph)
        self.assertEqual(result["groups"], [])
        self.assertFalse(result["complete"])
        graph = graph_with()
        graph["consumer"]["inputs"]["ref_images.ref_image_" + "1" * 161] = ["source", 0]
        graph["consumer"]["inputs"]["ref_images.ref_image_1"] = ["x" * 161, 0]
        result = self.estimate(graph)
        self.assertFalse(result["complete"])
        self.assertTrue(all(len(r["input"]) <= 160 for r in result["groups"][0]["references"]))
        graph = {"x" * 160: h3()}
        self.assertEqual(len(self.estimate(graph)["groups"][0]["node_id"]), 160)

    def test_invalid_graph_and_malformed_slots_fail_closed(self):
        for graph in (None, [], "private", 5):
            self.assertFalse(self.estimate(graph)["complete"])
        for value in (None, [], "private"):
            result = self.estimate({"consumer": {"class_type": H3, "inputs": value}})
            self.assertFalse(result["complete"])
        for value in (["source"], ["source", True], ["source", -1], "PRIVATE_PATH", {}):
            graph = graph_with()
            graph["consumer"]["inputs"][IMAGE] = value
            result = self.estimate(graph)
            self.assertFalse(result["complete"])
            json.dumps(result, allow_nan=False)

    def test_all_shipped_patched_style_graphs_can_be_analyzed_without_comfy(self):
        root = Path(__file__).resolve().parents[1] / "graphs"
        for filename in ("minimax_h3_fusion_v2.api.json", "minimax_h3_ref_2pass.api.json",
                         "qwen_image_21_multi.api.json", "qwen_image_edit_2511_i2i.api.json"):
            graph = json.loads((root / filename).read_text(encoding="utf-8"))
            # Simulate final patch values without changing any graph fixture.
            for spec in graph.values():
                args = spec.get("inputs", {})
                if spec.get("class_type") == H3:
                    args.update(width=1344, height=768, length=124)
                for field in ("image", "video", "audio"):
                    if field in args and isinstance(args[field], str) and not args[field]:
                        args[field] = "PRIVATE_TEST_INPUT"
            result = self.estimate(graph)
            with self.subTest(filename=filename):
                self.assertGreater(len(result["groups"]), 0)
                json.dumps(result, allow_nan=False)
                if filename.startswith("qwen"):
                    self.assertFalse(result["complete"])
                    self.assertTrue(all(r["width"] is None for g in result["groups"] for r in g["references"]))
                else:
                    self.assertTrue(result["complete"])
                    self.assertTrue(all(g["image_count"] > 0 and g["video_count"] > 0 for g in result["groups"]))


if __name__ == "__main__":
    unittest.main()
