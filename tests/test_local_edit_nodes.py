"""Targeted CPU/stdlib tests. No Comfy service, models, pip or paid calls.

python -B -m unittest discover -s tests -p test_local_edit_nodes.py -v
Set CHOUKA_LOCAL_EDIT_NODE_DIR to the complete externally deployed plugin to
run node/package tests; without it only pure JSON graph tests execute. An
explicit invalid plugin path fails import rather than skipping. Torch tests
also skip when torch is unavailable. HTTP tests use only an ephemeral loopback
fixture, never the real controller or Comfy service.
"""
import sys
sys.dont_write_bytecode = True

import copy
from email.parser import BytesParser
from email.policy import default
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import threading
import unittest
from unittest import mock
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]
NODE_DIR_ENV = os.environ.get("CHOUKA_LOCAL_EDIT_NODE_DIR")
NODE_SKIP_REASON = "set CHOUKA_LOCAL_EDIT_NODE_DIR to a complete externally deployed plugin"
NODE_DIR = None
local_edit = None
torch = None

if NODE_DIR_ENV is not None:
    if not NODE_DIR_ENV.strip():
        raise ValueError("CHOUKA_LOCAL_EDIT_NODE_DIR must point to a complete plugin directory")
    NODE_DIR = Path(NODE_DIR_ENV).resolve()
    spec = importlib.util.spec_from_file_location(
        "_chouka_local_edit_test_package", NODE_DIR / "__init__.py",
        submodule_search_locations=[str(NODE_DIR)],
    )
    local_edit = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = local_edit
    spec.loader.exec_module(local_edit)

    import numpy as np
    from PIL import Image

    ChoukaCloudImageEdit = local_edit.ChoukaCloudImageEdit
    ChoukaLocalCrop = local_edit.ChoukaLocalCrop
    ChoukaLocalStitch = local_edit.ChoukaLocalStitch
    ChoukaLocalSaveImage = local_edit.ChoukaLocalSaveImage
    ChoukaLocalModelSwitch = local_edit.ChoukaLocalModelSwitch
    NODE_CLASS_MAPPINGS = local_edit.NODE_CLASS_MAPPINGS
    cloud = local_edit.cloud
    canvas_side = local_edit.geometry.canvas_side
    crop_numpy = local_edit.geometry.crop_numpy
    feather_mask = local_edit.geometry.feather_mask
    stitch_numpy = local_edit.geometry.stitch_numpy

    try:
        import torch
    except ImportError:
        pass


def image_mask(height=83, width=173, box=(47, 20, 91, 39)):
    base = np.random.default_rng(12).random((1, height, width, 3), dtype=np.float32)
    mask = np.zeros((1, height, width), np.float32)
    x0, y0, x1, y1 = box
    mask[0, y0:y1, x0:x1] = 1
    return base, mask


def png_bytes(size=(32, 32), mode="RGB", color=120):
    output = io.BytesIO()
    Image.new(mode, size, color).save(output, format="PNG")
    return output.getvalue()


@unittest.skipUnless(local_edit is not None, NODE_SKIP_REASON)
class GeometryTests(unittest.TestCase):
    def test_canvas_budget_sqrt_alignment_and_limits(self):
        self.assertEqual(canvas_side(1.0), 992)
        self.assertEqual(canvas_side(0.25), 512)
        self.assertEqual(canvas_side(4.194304), 2048)
        self.assertEqual(canvas_side(8.3), 2048)
        self.assertEqual(canvas_side(16), 2048)
        self.assertEqual(canvas_side(1.048576), 1024)
        for mp in (0.25, 0.8, 1, 1.7, 3, 4, 8.3, 16):
            side = canvas_side(mp)
            self.assertEqual(side % 32, 0)
            self.assertLessEqual(abs(side - max(512, min(2048, (mp * 1e6) ** .5))), 16)
        for invalid in (0, -1, 0.249, 16.001, float("nan"), float("inf")):
            with self.assertRaises(ValueError):
                canvas_side(invalid)

    def test_non_square_letterbox_and_context(self):
        base, mask = image_mask()
        canvas, context, width, height = crop_numpy(base, mask, 0.25, 4)
        self.assertEqual(canvas.shape, (1, 512, 512, 3))
        self.assertEqual((width, height), (512, 512))
        self.assertEqual(context["bbox"], (38, 14, 100, 45))
        self.assertEqual(context["resized_size"], (512, 256))
        self.assertEqual(context["padding"], (0, 128, 0, 128))
        self.assertAlmostEqual(context["scale"], 512 / 62)
        np.testing.assert_array_equal(context["mask"], mask[0])
        np.testing.assert_array_equal(context["base"], base)
        np.testing.assert_array_equal(canvas[0, 0], canvas[0, 128])
        base[:] = 0
        self.assertTrue(context["base"].any(), "context owns a stable base snapshot")

    def test_finite_feather_full_support_and_exact_protected_pixels(self):
        base, mask = image_mask(101, 201, (90, 45, 92, 47))
        canvas, context, _, _ = crop_numpy(base, mask, 0.25, 12)
        alpha = context["alpha"]
        np.testing.assert_array_equal(alpha, feather_mask(mask[0], 12))
        self.assertGreater(alpha[45, 78], 0, "full feather reaches original-pixel radius")
        self.assertEqual(alpha[45, 77], 0)
        np.testing.assert_array_equal(alpha[45:47, 90:92], 1)
        result = stitch_numpy(np.ones_like(canvas), context)
        expected = base * (1 - alpha[None, ..., None]) + alpha[None, ..., None]
        np.testing.assert_allclose(result, expected, atol=1e-7)
        np.testing.assert_array_equal(result[0][alpha == 0], base[0][alpha == 0])
        np.testing.assert_array_equal(result[0, 45:47, 90:92], 1)
        self.assertTrue(np.any((alpha > 0) & (alpha < 1)))
        self.assertEqual(result.shape, base.shape)

    def test_edges_corners_tiny_and_full_selection(self):
        for height, width, box in (
            (39, 211, (0, 0, 1, 1)), (211, 39, (38, 210, 39, 211)),
            (83, 173, (0, 0, 173, 83)), (1, 7, (6, 0, 7, 1)),
            (99, 99, (49, 49, 50, 50)),
        ):
            for feather in (0, 1, 8, 64, 128):
                with self.subTest(size=(width, height), box=box, feather=feather):
                    base, mask = image_mask(height, width, box)
                    canvas, context, _, _ = crop_numpy(base, mask, 0.25, feather)
                    np.testing.assert_array_equal(context["alpha"], feather_mask(mask[0], feather))
                    result = stitch_numpy(np.ones_like(canvas), context)
                    alpha = context["alpha"]
                    self.assertEqual(result.shape, base.shape)
                    np.testing.assert_array_equal(result[0][alpha == 0], base[0][alpha == 0])
                    np.testing.assert_array_equal(result[0][mask[0] == 1], 1)

    def test_fractional_mask_and_zero_feather(self):
        base, mask = image_mask()
        mask *= .25
        canvas, context, _, _ = crop_numpy(base, mask, .25, 0)
        result = stitch_numpy(np.ones_like(canvas), context)
        selected = mask[0] > 0
        np.testing.assert_allclose(result[0][selected], base[0][selected] * .75 + .25)
        np.testing.assert_array_equal(result[0][~selected], base[0][~selected])

    def test_padding_removed_not_stretched_and_higher_resolution(self):
        base, mask = image_mask()
        canvas, context, width, height = crop_numpy(base, mask, .25, 0)
        left, top, _, _ = context["padding"]
        rw, rh = context["resized_size"]
        generated = np.zeros_like(canvas)
        generated[0, :, :, 0] = 1  # red padding must never enter the edited patch
        generated[0, top:top + rh, left:left + rw] = (0, 1, 0)
        result = stitch_numpy(generated, context)
        np.testing.assert_array_equal(result[0][mask[0] > 0], np.tile((0, 1, 0), (int(mask.sum()), 1)))
        higher = np.repeat(np.repeat(generated, 2, axis=1), 2, axis=2)
        np.testing.assert_allclose(stitch_numpy(higher, context), result, atol=1e-7)
        # Same-ratio smaller output is also legal.
        self.assertEqual(stitch_numpy(generated[:, ::2, ::2], context).shape, base.shape)
        for shape in ((1, height, width + 1, 3), (1, 256, 512, 3), (2, height, width, 3)):
            with self.assertRaises(ValueError):
                stitch_numpy(np.zeros(shape, np.float32), context)

    def test_identity_crop_stitch_keeps_gradients_in_original_coordinates(self):
        height, width = 97, 241
        xx = np.broadcast_to(np.linspace(0, 1, width, dtype=np.float32), (height, width))
        yy = np.broadcast_to(np.linspace(0, 1, height, dtype=np.float32)[:, None], (height, width))
        base = np.stack((xx, yy, (xx + yy) * .5), axis=-1)[None]
        mask = np.zeros((1, height, width), np.float32)
        mask[0, 4:35, 61:160] = 1
        canvas, context, _, _ = crop_numpy(base, mask, .25, 6)
        result = stitch_numpy(canvas, context)
        # PIL's bilinear downsample includes antialiasing and boundary clamping.
        # Measure coordinate error in original pixels rather than assuming an
        # interpolation roundtrip is algebraically exact: <0.05 original pixel.
        self.assertLess(float(np.max(np.abs(result[..., 0] - base[..., 0]))) * (width - 1), .05)
        self.assertLess(float(np.max(np.abs(result[..., 1] - base[..., 1]))) * (height - 1), .05)
        np.testing.assert_array_equal(result[0][context["alpha"] == 0], base[0][context["alpha"] == 0])

    def test_invalid_masks_batch_and_pixels_rejected(self):
        base, mask = image_mask()
        for invalid in (np.zeros_like(mask), mask[:, :-1], mask[0], np.repeat(mask, 2, 0),
                        np.full_like(mask, np.nan), np.full_like(mask, -1), np.full_like(mask, 2)):
            with self.subTest(shape=invalid.shape):
                with self.assertRaises(ValueError):
                    crop_numpy(base, invalid, .25, 0)
        for invalid in (base[0], np.repeat(base, 2, 0), base[..., :1],
                        np.full_like(base, np.inf), np.full_like(base, 2)):
            with self.assertRaises(ValueError):
                crop_numpy(invalid, mask, .25, 0)
        for invalid in (-1, 1.5, True, 129):
            with self.assertRaises(ValueError):
                crop_numpy(base, mask, .25, invalid)


@unittest.skipUnless(local_edit is not None, NODE_SKIP_REASON)
@unittest.skipIf(torch is None, "torch unavailable: external package's numpy geometry still tested")
class TorchNodeTests(unittest.TestCase):
    def test_ports_and_real_cpu_tensor_crop_stitch(self):
        self.assertEqual(set(NODE_CLASS_MAPPINGS), {"ChoukaLocalCrop", "ChoukaLocalStitch", "ChoukaCloudImageEdit", "ChoukaLocalSaveImage", "ChoukaLocalModelSwitch"})
        self.assertEqual(ChoukaLocalCrop.RETURN_TYPES, ("IMAGE", "CHOUKA_LOCAL_EDIT_CONTEXT", "INT", "INT"))
        base, mask = image_mask()
        base_tensor = torch.from_numpy(base)
        crop, context, width, height = ChoukaLocalCrop().crop(base_tensor, torch.from_numpy(mask), .25, 8)
        self.assertEqual(tuple(crop.shape), (1, height, width, 3))
        result, = ChoukaLocalStitch().stitch(torch.ones_like(crop), context)
        self.assertEqual(result.dtype, base_tensor.dtype)
        self.assertEqual(result.device, base_tensor.device)
        np.testing.assert_array_equal(result.numpy()[0][context["alpha"] == 0], base[0][context["alpha"] == 0])
        np.testing.assert_array_equal(result.numpy()[0][mask[0] > 0], 1)
        with self.assertRaises(ValueError):
            ChoukaLocalCrop().crop(base_tensor, torch.zeros_like(torch.from_numpy(mask)), .25, 8)

    def test_high_megapixel_budgets_are_accepted_and_canvas_is_capped(self):
        base = torch.zeros((1, 2, 3, 3), dtype=torch.float32)
        mask = torch.ones((1, 2, 3), dtype=torch.float32)
        for mp in (8.3, 16.0):
            with self.subTest(megapixels=mp):
                crop, context, width, height = ChoukaLocalCrop().crop(base, mask, mp, 128)
                self.assertEqual((width, height), (2048, 2048))
                self.assertEqual(tuple(crop.shape), (1, 2048, 2048, 3))
                self.assertEqual(context["expected_size"], (2048, 2048))
                del crop, context

    def test_cloud_tensor_adapter(self):
        base, _ = image_mask()
        with mock.patch.object(local_edit, "cloud_edit_numpy", return_value=base.copy()) as edit:
            output, = ChoukaCloudImageEdit().edit(torch.from_numpy(base), "material", "banana", "", "", torch.from_numpy(base))
        np.testing.assert_array_equal(output.numpy(), base)
        self.assertIsInstance(edit.call_args.args[0], np.ndarray)
        self.assertIsInstance(edit.call_args.args[-1], np.ndarray)


@unittest.skipUnless(local_edit is not None, NODE_SKIP_REASON)
class LazyModelSwitchTests(unittest.TestCase):
    def test_only_selected_branch_is_requested_and_returned(self):
        switch = ChoukaLocalModelSwitch()
        inputs = switch.INPUT_TYPES()
        self.assertEqual(inputs["required"]["model"][0], ["flux", "gpt_image", "banana"])
        for model, name in switch.BRANCHES.items():
            with self.subTest(model=model):
                self.assertEqual(inputs["optional"][name], ("IMAGE", {"lazy": True}))
                self.assertEqual(switch.check_lazy_status(model), [name])
                selected = object()
                values = {name: selected}
                self.assertEqual(switch.check_lazy_status(model, **values), [])
                self.assertIs(switch.select(model, **values)[0], selected)
                others = {key: object() for key in switch.BRANCHES.values() if key != name}
                self.assertEqual(switch.check_lazy_status(model, **others), [name])
                with self.assertRaisesRegex(ValueError, "has no image"):
                    switch.select(model, **others)

    def test_invalid_model_does_not_fall_back_to_a_paid_branch(self):
        switch = ChoukaLocalModelSwitch()
        for method in (switch.check_lazy_status, switch.select):
            with self.assertRaisesRegex(ValueError, "unsupported"):
                method("unknown")


@unittest.skipUnless(local_edit is not None, NODE_SKIP_REASON)
class SafeSaveTests(unittest.TestCase):
    def test_metadata_redacted_in_saved_png_without_mutating_execution_graph(self):
        ticket = "unit-" + "save-ticket"
        callback_url = "http://trusted.invalid/agent/v1/local-edit/cloud"
        prompt = {
            "20": {"class_type": "ChoukaCloudImageEdit", "inputs": {
                "callback_token": ticket, "callback_url": callback_url, "prompt": "preserve this instruction"}},
            "21": {"class_type": "ChoukaCloudImageEdit", "inputs": {
                "callback_token": ticket + "2", "callback_url": callback_url}},
            "99": {"class_type": "ChoukaLocalSaveImage", "inputs": {"images": ["90", 0]}},
        }
        extra = {"workflow": {"nodes": [{"type": "ChoukaCloudImageEdit", "widgets_values": [ticket, callback_url]}]}}
        original_prompt, original_extra = copy.deepcopy(prompt), copy.deepcopy(extra)
        captured = {}
        class FakeCoreSave:
            def save_images(self, images, filename_prefix, prompt=None, extra_pnginfo=None):
                from PIL.PngImagePlugin import PngInfo
                captured["extra"] = extra_pnginfo
                metadata = PngInfo()
                metadata.add_text("prompt", json.dumps(prompt))
                for key, value in (extra_pnginfo or {}).items():
                    metadata.add_text(key, json.dumps(value))
                output = io.BytesIO()
                Image.new("RGB", (2, 2)).save(output, format="PNG", pnginfo=metadata)
                captured["png"] = output.getvalue()
                return {"ui": {"images": [{"filename": "final.png", "type": "output"}]}, "result": (images,)}
        with mock.patch.dict(sys.modules, {"nodes": mock.Mock(SaveImage=FakeCoreSave)}):
            saved = ChoukaLocalSaveImage().save_images(None, prompt=prompt, extra_pnginfo=extra)
        self.assertEqual(prompt, original_prompt)
        self.assertEqual(extra, original_extra)
        self.assertEqual(ChoukaLocalSaveImage.RETURN_TYPES, ())
        self.assertTrue(ChoukaLocalSaveImage.OUTPUT_NODE)
        self.assertEqual(list(saved), ["ui"])
        self.assertIsNone(captured["extra"])
        with Image.open(io.BytesIO(captured["png"])) as decoded:
            encoded = json.dumps(decoded.info)
            self.assertNotIn(ticket, encoded)
            self.assertNotIn(callback_url, encoded)
            self.assertNotIn("callback_token", encoded)
            self.assertNotIn("callback_url", encoded)
            self.assertIn("preserve this instruction", encoded)


class _CallbackHandler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_POST(self):
        body = self.rfile.read(int(self.headers["Content-Length"]))
        self.server.calls.append((self.command, self.path, self.headers, body))
        if self.server.disconnect:
            self.close_connection = True
            return
        self.send_response(self.server.status)
        if 300 <= self.server.status < 400:
            self.send_header("Location", self.server.redirect_url)
        self.send_header("Content-Type", "image/png")
        if self.server.declared_length is not None:
            self.send_header("Content-Length", str(self.server.declared_length))
        self.end_headers()
        try:
            self.wfile.write(self.server.payload)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def do_GET(self):
        self.server.calls.append((self.command, self.path, self.headers, b""))
        self.send_response(500)
        self.end_headers()


@unittest.skipUnless(local_edit is not None, NODE_SKIP_REASON)
class CloudTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), _CallbackHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.origin = f"http://127.0.0.1:{cls.server.server_port}"
        cls.url = cls.origin + cloud.CALLBACK_PATH

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        self.server.calls = []
        self.server.status = 200
        self.server.payload = png_bytes()
        self.server.declared_length = len(self.server.payload)
        self.server.redirect_url = self.origin + "/must-not-follow"
        self.server.disconnect = False
        self.image = np.full((1, 8, 13, 3), .5, np.float32)
        # Fabricated test ticket, never a cloud API credential.
        self.ticket = "unit-" + "single-use"

    def call(self, reference=None, url=None, token=None):
        return cloud.cloud_edit_numpy(self.image, "server ticket owns prompt", "gpt_image",
                                      url or self.url, self.ticket if token is None else token, reference)

    def test_single_post_multipart_with_and_without_reference(self):
        for reference in (None, self.image):
            with self.subTest(reference=reference is not None):
                self.server.calls = []
                result = self.call(reference)
                self.assertEqual(result.shape, (1, 32, 32, 3))
                self.assertEqual(result.dtype, np.float32)
                self.assertEqual(len(self.server.calls), 1)
                method, path, headers, body = self.server.calls[0]
                self.assertEqual((method, path), ("POST", cloud.CALLBACK_PATH))
                self.assertEqual(headers["Authorization"], "Bearer " + self.ticket)
                message = BytesParser(policy=default).parsebytes(
                    ("Content-Type: " + headers["Content-Type"] + "\r\n\r\n").encode() + body)
                parts = list(message.iter_parts())
                self.assertEqual([p.get_param("name", header="content-disposition") for p in parts],
                                 ["image"] if reference is None else ["image", "reference"])
                for part in parts:
                    self.assertEqual(part.get_content_type(), "image/png")
                    with Image.open(io.BytesIO(part.get_payload(decode=True))) as decoded:
                        self.assertEqual(decoded.size, (13, 8))
                self.assertNotIn(self.ticket.encode(), body)
                self.assertNotIn(b"prompt", body)
                self.assertNotIn(b"provider", body)

    def test_redirects_all_refused_without_second_request(self):
        for status in (301, 302, 303, 307, 308):
            for location in (self.origin + "/must-not-follow", "https://untrusted.invalid/steal"):
                with self.subTest(status=status, location=location):
                    self.server.calls = []
                    self.server.status = status
                    self.server.redirect_url = location
                    with self.assertRaisesRegex(RuntimeError, "not retried"):
                        self.call()
                    self.assertEqual(len(self.server.calls), 1)

    def test_http_failure_and_lost_response_never_retried_or_leaked(self):
        for status in (401, 409, 429, 500, 503):
            self.server.calls = []
            self.server.status = status
            secret_response = self.ticket + " base64: upstream private response"
            self.server.payload = secret_response.encode()
            with self.assertRaises(RuntimeError) as raised:
                self.call()
            self.assertEqual(len(self.server.calls), 1)
            self.assertNotIn(self.ticket, str(raised.exception))
            self.assertNotIn(secret_response, str(raised.exception))
            self.assertTrue(raised.exception.__suppress_context__)
        self.server.calls = []
        self.server.disconnect = True
        with self.assertRaisesRegex(RuntimeError, "not retried"):
            self.call()
        self.assertEqual(len(self.server.calls), 1)

    def test_upstream_callback_needs_no_local_origin_configuration(self):
        with mock.patch.dict(os.environ):
            os.environ.pop("CHOUKA_LOCAL_EDIT_TRUSTED_ORIGINS", None)
            result = self.call()
        self.assertEqual(result.shape, (1, 32, 32, 3))
        self.assertEqual(len(self.server.calls), 1)
        for configured in ("", "https://other.invalid", "not a valid origin"):
            with self.subTest(configured=configured), mock.patch.dict(
                    os.environ, {"CHOUKA_LOCAL_EDIT_TRUSTED_ORIGINS": configured}):
                for origin in ("http://controller.invalid:8199", "https://controller.invalid",
                               "http://192.0.2.10:8199", "http://[::1]:8199"):
                    cloud.validate_callback_url(origin + cloud.CALLBACK_PATH)

    def test_fail_closed_url_path_and_token_validation(self):
        urls = (self.origin + "/wrong", self.url + "?x=1", self.url + "#x",
                self.url + "?", self.url + "#", self.url + "/",
                self.url.replace("127.0.0.1", "user@127.0.0.1"),
                self.url.replace("127.0.0.1", "user:password@127.0.0.1"),
                self.url.replace("127.0.0.1", "%31%32%37.0.0.1"),
                "file:///agent/v1/local-edit/cloud", " " + self.url,
                "http:///agent/v1/local-edit/cloud", self.url + "\r\n",
                "http://127.0.0.1:0" + cloud.CALLBACK_PATH,
                "http://127.0.0.1:65536" + cloud.CALLBACK_PATH,
                self.url.replace("127.0.0.1", "127.0.0.1\\evil"))
        with mock.patch("urllib.request.build_opener") as opened:
            for url in urls:
                with self.subTest(url=url), self.assertRaises(ValueError):
                    self.call(url=url)
            for token in ("", "with spaces", "header\r\ninjection", "x" * 8193):
                with self.assertRaises(ValueError):
                    self.call(token=token)
            opened.assert_not_called()
        self.assertEqual(self.server.calls, [])

    def test_response_limit_checks_declared_and_streamed_sizes(self):
        for declared in (1000, None):
            self.server.calls = []
            self.server.declared_length = declared
            self.server.payload = b"x" * 1000
            with mock.patch.object(cloud, "MAX_RESPONSE_BYTES", 64):
                with self.assertRaisesRegex(RuntimeError, "not retried"):
                    self.call()
            self.assertEqual(len(self.server.calls), 1)
        self.assertEqual(cloud.MAX_RESPONSE_BYTES, 64 * 1024 * 1024)

    def test_png_validation_rejects_non_png_truncated_and_over_32mp(self):
        jpeg = io.BytesIO()
        Image.new("RGB", (3, 3)).save(jpeg, format="JPEG")
        for payload in (b"private upstream error " + self.ticket.encode(), jpeg.getvalue(),
                        png_bytes()[:50], png_bytes((6000, 6000), "1", 0)):
            self.server.calls = []
            self.server.payload = payload
            self.server.declared_length = len(payload)
            with self.assertRaisesRegex(RuntimeError, "invalid PNG") as raised:
                self.call()
            self.assertNotIn(self.ticket, str(raised.exception))
            self.assertEqual(len(self.server.calls), 1)
        self.assertEqual(cloud.MAX_RESPONSE_PIXELS, 32_000_000)

    def test_cache_signature_varies_by_ticket(self):
        args = dict(image=None, prompt="edit", provider="banana", callback_url=self.url)
        first = ChoukaCloudImageEdit.IS_CHANGED(callback_token=self.ticket, **args)
        self.assertNotEqual(first, ChoukaCloudImageEdit.IS_CHANGED(callback_token=self.ticket + "2", **args))
        self.assertEqual(first, ChoukaCloudImageEdit.IS_CHANGED(callback_token=self.ticket, **args))
        self.assertNotIn(self.ticket, first)


class GraphManifestTests(unittest.TestCase):
    @staticmethod
    def reachable(graph):
        reached = set()
        def walk(node_id):
            if node_id in reached:
                return
            reached.add(node_id)
            for value in graph[node_id]["inputs"].values():
                if isinstance(value, list):
                    walk(value[0])
        walk("99")
        return reached

    def test_all_links_required_params_and_only_final_save(self):
        for provider in ("flux", "gpt", "banana"):
            with self.subTest(provider=provider):
                cap_id = "texture_local_" + provider
                manifest = json.loads((ROOT / "manifests" / (cap_id + ".json")).read_text(encoding="utf-8"))
                graph = json.loads((ROOT / manifest["graph"]).read_text(encoding="utf-8"))
                self.assertEqual(manifest["id"], cap_id)
                self.assertIs(manifest["editor_only"], True)
                self.assertNotEqual(manifest.get("execution"), "browser")
                self.assertEqual(manifest["output"], {"node": "99"})
                self.assertEqual([nid for nid, node in graph.items() if node["class_type"] in ("SaveImage", "ChoukaLocalSaveImage")], ["99"])
                self.assertEqual(manifest["graph"], "graphs/texture_local_edit.api.json")
                self.assertEqual(graph["99"]["class_type"], "ChoukaLocalSaveImage")
                self.assertEqual(graph["80"], {"class_type": "ChoukaLocalModelSwitch", "inputs": {
                    "model": "flux", "flux_image": ["25", 0],
                    "gpt_image": ["30", 0], "banana_image": ["31", 0],
                }})
                self.assertEqual(graph["90"]["inputs"]["generated"], ["80", 0])
                self.assertFalse(any("Preview" in node["class_type"] for node in graph.values()))
                self.assertEqual(graph["99"]["inputs"]["images"], ["90", 0])
                self.assertEqual(graph["90"]["inputs"]["context"], ["10", 1])
                self.assertEqual(graph["2"], {"class_type": "LoadImageMask", "inputs": {"image": "chouka_local_mask.png", "channel": "red"}})
                specs = {spec["key"]: spec for spec in manifest["inputs"]}
                for key, limits in (("megapixels", (0.25, 16.0)), ("feather", (0, 128))):
                    self.assertEqual((specs[key]["min"], specs[key]["max"]), limits)
                self.assertEqual(specs["images[0]"]["target"]["node"], "1")
                self.assertEqual(specs["images[1]"]["target"]["node"], "2")
                self.assertTrue(specs["images[0]"]["required"])
                self.assertTrue(specs["images[1]"]["required"])
                self.assertFalse(specs["images[2]"]["required"])
                self.assertEqual(graph["10"]["inputs"]["mask"], ["2", 0])
                self.assertEqual(graph["10"]["inputs"]["image"], ["1", 0])
                for node in graph.values():
                    for link in node["inputs"].values():
                        if isinstance(link, list):
                            self.assertIn(link[0], graph)
                            self.assertIsInstance(link[1], int)
                            self.assertGreaterEqual(link[1], 0)
                for spec in manifest["inputs"]:
                    target = spec["target"]
                    self.assertIn(target["input"], graph[target["node"]]["inputs"])
                for key, node_id, field in (("megapixels", "10", "megapixels"), ("feather", "10", "feather"),
                                             ("prompt", "14", "text")):
                    self.assertEqual(specs[key]["target"]["node"], node_id)
                    self.assertEqual(specs[key]["target"]["input"], field)
                    self.assertEqual(specs[key]["default"], graph[node_id]["inputs"][field])
                # Exactly the existing patch_graph dropIfEmpty pop semantics.
                without_reference = copy.deepcopy(graph)
                for drop in specs["images[2]"]["dropIfEmpty"]:
                    self.assertIn(drop["input"], without_reference[drop["node"]]["inputs"])
                    without_reference[drop["node"]]["inputs"].pop(drop["input"])
                self.assertIn("3", self.reachable(graph))
                reached = self.reachable(without_reference)
                self.assertNotIn("3", reached, "absent reference must not execute the template loader")
                self.assertTrue({"1", "2", "10", "90", "99"}.issubset(reached))
                for node_id, cloud_provider in (("30", "gpt_image"), ("31", "banana")):
                    self.assertEqual(graph[node_id]["class_type"], "ChoukaCloudImageEdit")
                    self.assertEqual(graph[node_id]["inputs"]["provider"], cloud_provider)
                    self.assertEqual(graph[node_id]["inputs"]["callback_url"], "")
                    self.assertEqual(graph[node_id]["inputs"]["callback_token"], "")
                    self.assertNotIn("reference", without_reference[node_id]["inputs"])

    @unittest.skipUnless(local_edit is not None, NODE_SKIP_REASON)
    def test_manifest_parameters_match_deployed_node_interfaces(self):
        crop_inputs = ChoukaLocalCrop.INPUT_TYPES()["required"]
        for provider in ("flux", "gpt", "banana"):
            with self.subTest(provider=provider):
                manifest = json.loads((ROOT / "manifests" / ("texture_local_" + provider + ".json")).read_text(encoding="utf-8"))
                specs = {spec["key"]: spec for spec in manifest["inputs"]}
                for key, limits in (("megapixels", (0.25, 16.0)), ("feather", (0, 128))):
                    self.assertEqual((crop_inputs[key][1]["min"], crop_inputs[key][1]["max"]), limits)
                    self.assertEqual((specs[key]["min"], specs[key]["max"]), limits)
        self.assertEqual(set(ChoukaCloudImageEdit.INPUT_TYPES()["required"]),
                         {"image", "prompt", "provider", "callback_url", "callback_token"})

    def test_native_workflow_matches_api_graph(self):
        graph = json.loads((ROOT / "graphs/texture_local_edit.api.json").read_text(encoding="utf-8"))
        workflow = json.loads((ROOT / "graphs/texture_local_edit.json").read_text(encoding="utf-8"))
        nodes = {str(node["id"]): node for node in workflow["nodes"]}
        links = {link[0]: link for link in workflow["links"]}
        self.assertEqual(set(nodes), set(graph))
        for node_id, expected in graph.items():
            with self.subTest(node=node_id):
                node = nodes[node_id]
                self.assertEqual(node["type"], expected["class_type"])
                self.assertEqual(node["mode"], 0)
                connected = {}
                for slot, item in enumerate(node.get("inputs", [])):
                    if item.get("link") is not None:
                        link = links[item["link"]]
                        self.assertEqual((str(link[3]), link[4]), (node_id, slot))
                        self.assertIn(link[0], nodes[str(link[1])]["outputs"][link[2]]["links"])
                        connected[item["name"]] = [str(link[1]), link[2]]
                values = node.get("widgets_values_named", {})
                actual = {key: connected[key] if key in connected else values[key]
                          for key in expected["inputs"]}
                self.assertEqual(actual, expected["inputs"])
                self.assertEqual(connected, {key: value for key, value in expected["inputs"].items()
                                             if isinstance(value, list)})

    def test_flux_core_double_reference_chain(self):
        graph = json.loads((ROOT / "graphs/texture_local_edit.api.json").read_text())
        allowed = {"LoadImage", "LoadImageMask", "ChoukaLocalCrop", "ChoukaLocalStitch", "UNETLoader",
                   "CLIPLoader", "VAELoader", "CLIPTextEncode", "ConditioningZeroOut", "VAEEncode",
                   "ReferenceLatent", "ImageScaleToTotalPixels", "EmptyFlux2LatentImage", "KSampler", "VAEDecode",
                   "ChoukaCloudImageEdit", "ChoukaLocalModelSwitch", "ChoukaLocalSaveImage"}
        self.assertTrue({n["class_type"] for n in graph.values()}.issubset(allowed))
        self.assertEqual(graph["11"]["inputs"]["unet_name"], "flux-2-klein-9b-fp8.safetensors")
        self.assertEqual(graph["12"]["inputs"]["clip_name"], "qwen_3_8b_fp4mixed.safetensors")
        self.assertEqual(graph["13"]["inputs"]["vae_name"], "flux2-vae.safetensors")
        self.assertEqual(graph["16"]["inputs"]["pixels"], ["10", 0])
        self.assertEqual(graph["17"]["inputs"]["latent"], ["16", 0])
        self.assertEqual(graph["18"]["inputs"]["latent"], ["16", 0])
        self.assertEqual(graph["21"]["inputs"], {"conditioning": ["17", 0], "latent": ["20", 0]})
        self.assertEqual(graph["22"]["inputs"], {"conditioning": ["18", 0], "latent": ["20", 0]})
        self.assertEqual(graph["23"]["inputs"], {"width": ["10", 2], "height": ["10", 3], "batch_size": 1})
        sampler = graph["24"]["inputs"]
        self.assertEqual((sampler["cfg"], sampler["sampler_name"], sampler["scheduler"]), (1, "euler", "simple"))
        self.assertTrue(4 <= sampler["steps"] <= 6)


@unittest.skipUnless(local_edit is not None, NODE_SKIP_REASON)
class DeployedPackageTests(unittest.TestCase):
    def test_complete_package_and_ownership_hashes(self):
        package_files = {"__init__.py", "geometry.py", "cloud.py"}
        ledger_name = ".chouka-local-edit-owned.json"
        for name in package_files | {ledger_name}:
            with self.subTest(file=name):
                self.assertTrue((NODE_DIR / name).is_file())
        self.assertEqual({path.name for path in NODE_DIR.glob("*.py")}, package_files)
        ledger = json.loads((NODE_DIR / ledger_name).read_text(encoding="utf-8"))
        self.assertEqual(ledger["owner"], "chouka_local_edit")
        self.assertIs(type(ledger["version"]), int)
        self.assertEqual(ledger["version"], 1)
        self.assertEqual(set(ledger["files"]), package_files)
        for name, expected_hash in ledger["files"].items():
            with self.subTest(file=name):
                self.assertEqual(hashlib.sha256((NODE_DIR / name).read_bytes()).hexdigest(), expected_hash)

    def test_expected_five_nodes_are_registered_from_deployed_package(self):
        expected = {
            "ChoukaLocalCrop": ChoukaLocalCrop,
            "ChoukaLocalStitch": ChoukaLocalStitch,
            "ChoukaCloudImageEdit": ChoukaCloudImageEdit,
            "ChoukaLocalSaveImage": ChoukaLocalSaveImage,
            "ChoukaLocalModelSwitch": ChoukaLocalModelSwitch,
        }
        self.assertEqual(NODE_CLASS_MAPPINGS, expected)
        self.assertEqual(Path(local_edit.__file__).resolve(), NODE_DIR / "__init__.py")
        for node in expected.values():
            self.assertEqual(node.__module__, local_edit.__name__)


if __name__ == "__main__":
    unittest.main()
