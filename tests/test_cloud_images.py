import asyncio
import base64
from io import BytesIO
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock

import aiohttp
from aiohttp import web
from aiohttp.test_utils import TestServer
from PIL import Image

from server import cloud_images


def png(color="red", size=(3, 2), format="PNG"):
    output = BytesIO()
    Image.new("RGB", size, color).save(output, format=format)
    return output.getvalue()


class CloudImageTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.config = Path(self.temp.name) / "image-edit.json"
        self.enterContext(mock.patch.object(cloud_images, "CONF", self.config))
        self.enterContext(mock.patch.dict(os.environ, {"CHOUKA_IMAGE_API_KEY": ""}))
        self.received = []
        self.response_headers = {"X-Request-ID": "image-request-1"}
        self.payload = {"data": [{"b64_json": base64.b64encode(png()).decode()}]}
        self.status = 200
        self.redirect_hits = 0
        application = web.Application()
        application.router.add_post("/v1/images/edits", self.gateway)
        application.router.add_get("/download", self.download)
        self.server = TestServer(application)
        await self.server.start_server()
        self.addAsyncCleanup(self.server.close)
        self.session = aiohttp.ClientSession(trust_env=False)
        self.addAsyncCleanup(self.session.close)
        self.write_config()

    def write_config(self, **extra):
        config = {"base_url": str(self.server.make_url("/v1")), "api_key": "test-secret",
                  "model": "gpt-image-2.5-sunburst", **extra}
        self.config.write_text(json.dumps(config), encoding="utf-8")

    async def gateway(self, request):
        parts = []
        reader = await request.multipart()
        async for part in reader:
            parts.append({"name": part.name, "filename": part.filename,
                          "mime": part.headers.get("Content-Type"), "data": bytes(await part.read())})
        self.received.append({"authorization": request.headers.get("Authorization"), "parts": parts})
        return web.json_response(self.payload, status=self.status, headers=self.response_headers)

    async def download(self, request):
        self.redirect_hits += 1
        return web.Response(body=png(), content_type="image/png")

    async def test_single_image_uses_explicit_model_and_detected_mime(self):
        original = png(format="JPEG")
        result = await cloud_images.edit(self.session, [original], "  保持构图，调整质感  ")
        self.assertEqual(result["image_bytes"], png())
        self.assertEqual((result["width"], result["height"]), (3, 2))
        self.assertEqual(result["request_id"], "image-request-1")
        self.assertEqual(len(self.received), 1)
        sent = self.received[0]
        self.assertEqual(sent["authorization"], "Bearer test-secret")
        fields = {p["name"]: p["data"].decode() for p in sent["parts"] if not p["filename"]}
        self.assertEqual(fields, {"model": "gpt-image-2.5-sunburst", "prompt": "保持构图，调整质感",
                                  "size": "3x2", "quality": "medium", "output_format": "png"})
        files = [p for p in sent["parts"] if p["filename"]]
        self.assertEqual(files, [{"name": "image[]", "filename": "image_1.jpg", "mime": "image/jpeg", "data": original}])

    async def test_size_defaults_to_original(self):
        self.assertEqual(cloud_images.load()["size"], "original")
        self.config.unlink()
        with mock.patch.dict(os.environ, {"CHOUKA_IMAGE_API_KEY": "environment-secret"}):
            self.assertEqual(cloud_images.load()["size"], "original")

    async def test_configured_size_and_call_override_priority(self):
        for configured, override, expected in (
                ("original", None, "3x2"),
                ("1024x1024", None, "1024x1024"),
                ("1024x1024", "4x3", "4x3"),
                ("1024x1024", "original", "3x2")):
            with self.subTest(configured=configured, override=override):
                self.write_config(size=configured)
                await cloud_images.edit(self.session, [png()], "编辑", size=override)
                fields = {p["name"]: p["data"].decode() for p in self.received[-1]["parts"] if not p["filename"]}
                self.assertEqual(fields["size"], expected)

    async def test_multiple_images_keep_repeated_field_and_order(self):
        originals = [png("red"), png("blue", size=(4, 3))]
        await cloud_images.edit(self.session, originals, "图1主图，图2参考")
        files = [p for p in self.received[0]["parts"] if p["filename"]]
        self.assertEqual([p["name"] for p in files], ["image[]", "image[]"])
        self.assertEqual([p["data"] for p in files], originals)
        self.assertEqual([p["filename"] for p in files], ["image_1.png", "image_2.png"])
        fields = {p["name"]: p["data"].decode() for p in self.received[0]["parts"] if not p["filename"]}
        self.assertEqual(fields["size"], "3x2")

    async def test_all_images_are_inspected_before_building_form(self):
        with mock.patch.object(cloud_images.aiohttp, "FormData") as form:
            with self.assertRaises(cloud_images.ImageEditError):
                await cloud_images.edit(self.session, [png(), b"invalid second image"], "编辑")
            form.assert_not_called()
        self.assertEqual(self.received, [])

    async def test_url_result_is_returned_without_download_or_key_forwarding(self):
        url = str(self.server.make_url("/download"))
        self.payload = {"data": [{"url": url}]}
        result = await cloud_images.edit(self.session, [png()], "编辑")
        self.assertEqual(result["result_url"], url)
        self.assertNotIn("image_bytes", result)
        self.assertEqual(self.redirect_hits, 0)

    async def test_redirect_is_not_followed(self):
        self.status = 307
        self.response_headers["Location"] = str(self.server.make_url("/download"))
        with self.assertRaises(cloud_images.ImageEditError) as raised:
            await cloud_images.edit(self.session, [png()], "编辑")
        self.assertIn("HTTP 307", str(raised.exception))
        self.assertEqual(self.redirect_hits, 0)
        self.assertEqual(len(self.received), 1)

    async def test_non_success_never_retries_or_leaks_vendor_body(self):
        self.status = 429
        self.payload = {"error": "secret: test-secret"}
        with self.assertRaises(cloud_images.ImageEditError) as raised:
            await cloud_images.edit(self.session, [png()], "编辑")
        self.assertEqual(len(self.received), 1)
        self.assertFalse(raised.exception.response()["retryable"])
        self.assertNotIn("test-secret", json.dumps(raised.exception.response()))
        self.assertEqual(raised.exception.request_id, "image-request-1")

    async def test_timeout_has_unknown_state_and_no_retry(self):
        session = mock.Mock()
        session.post.side_effect = asyncio.TimeoutError()
        with self.assertRaises(cloud_images.ImageEditError) as raised:
            await cloud_images.edit(session, [png()], "编辑")
        self.assertEqual(session.post.call_count, 1)
        error = raised.exception
        self.assertTrue(error.generation_unknown)
        self.assertEqual(error.status, 504)
        timeout = session.post.call_args.kwargs["timeout"]
        self.assertEqual(timeout.sock_connect, 10)
        self.assertEqual(timeout.connect, 10)
        self.assertEqual(timeout.sock_read, 450)
        self.assertIsNone(timeout.total)
        self.assertFalse(session.post.call_args.kwargs["allow_redirects"])
        self.assertIsNone(session.post.call_args.kwargs["proxy"])

    async def test_missing_key_never_sends_an_image(self):
        self.write_config(api_key="")
        with self.assertRaises(cloud_images.ImageEditError) as raised:
            await cloud_images.edit(self.session, [png()], "编辑")
        self.assertEqual(raised.exception.status, 503)
        self.assertEqual(self.received, [])

    async def test_environment_key_is_server_side_override(self):
        with mock.patch.dict(os.environ, {"CHOUKA_IMAGE_API_KEY": "environment-secret"}):
            await cloud_images.edit(self.session, [png()], "编辑")
        self.assertEqual(self.received[0]["authorization"], "Bearer environment-secret")

    async def test_invalid_input_never_reaches_gateway(self):
        for image in (b"not an image", png()[:-20]):
            with self.assertRaises(cloud_images.ImageEditError):
                await cloud_images.edit(self.session, [image], "编辑")
        self.assertEqual(self.received, [])

    async def test_response_limit_keeps_request_id(self):
        with mock.patch.object(cloud_images, "MAX_RESPONSE_BYTES", 10):
            with self.assertRaises(cloud_images.ImageEditError) as raised:
                await cloud_images.edit(self.session, [png()], "编辑")
        self.assertEqual(raised.exception.request_id, "image-request-1")

    async def test_invalid_results_are_rejected(self):
        bad_results = [
            {"data": []}, {"data": [{}, {}]}, {"data": [{}]},
            {"data": [{"b64_json": "!!!!"}]},
            {"data": [{"b64_json": base64.b64encode(b"not a PNG").decode()}]},
            {"data": [{"url": "file:///etc/passwd"}]},
            {"data": [{"url": "http://user:password@example.invalid/image.png"}]},
            {"data": [{"url": "javascript:alert(1)"}]},
        ]
        for payload in bad_results:
            with self.subTest(payload=payload):
                self.payload = payload
                with self.assertRaises(cloud_images.ImageEditError) as raised:
                    await cloud_images.edit(self.session, [png()], "编辑")
                self.assertEqual(raised.exception.request_id, "image-request-1")

    async def test_invalid_config_fails_before_network(self):
        for address in ("file:///tmp/api", "http://[bad", "http://localhost:bad/v1", "http://user:secret@localhost/v1"):
            self.write_config(base_url=address)
            with self.assertRaises(cloud_images.ImageEditError) as raised:
                await cloud_images.edit(self.session, [png()], "编辑")
            self.assertEqual(raised.exception.status, 503)
        self.assertEqual(self.received, [])

    async def test_interrupted_response_preserves_request_id_and_unknown_state(self):
        async def broken_stream():
            yield b'{"data":'
            raise aiohttp.ClientPayloadError("interrupted")
        response = mock.Mock(status=200, headers={"X-Request-ID": "interrupted-id"})
        response.content.iter_chunked.return_value = broken_stream()
        context = mock.AsyncMock()
        context.__aenter__.return_value = response
        session = mock.Mock()
        session.post.return_value = context
        with self.assertRaises(cloud_images.ImageEditError) as raised:
            await cloud_images.edit(session, [png()], "编辑")
        self.assertTrue(raised.exception.generation_unknown)
        self.assertEqual(raised.exception.request_id, "interrupted-id")
        self.assertEqual(session.post.call_count, 1)

    async def test_output_extension_comes_from_image_bytes(self):
        for format, suffix in (("PNG", ".png"), ("JPEG", ".jpg"), ("WEBP", ".webp")):
            self.payload = {"data": [{"b64_json": base64.b64encode(png(format=format)).decode()}]}
            result = await cloud_images.edit(self.session, [png()], "编辑")
            self.assertEqual(result["extension"], suffix)


if __name__ == "__main__":
    unittest.main()
