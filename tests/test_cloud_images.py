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
        self.config = Path(self.temp.name) / "cloud-ai-config.json"
        self.enterContext(mock.patch.object(cloud_images, "CONF", self.config))
        self.enterContext(mock.patch.dict(os.environ, {"CHOUKA_IMAGE_API_KEY": ""}))
        self.received = []
        self.generations = []
        self.response_headers = {"X-Request-ID": "image-request-1"}
        self.payload = {"data": [{"b64_json": base64.b64encode(png()).decode()}]}
        self.status = 200
        self.raw_body = None
        self.redirect_hits = 0
        self.download_requests = []
        self.download_status = 200
        self.download_body = png()
        self.download_headers = {}
        self.download_chunked = False
        self.download_delay = 0
        application = web.Application()
        application.router.add_post("/v1/images/edits", self.gateway)
        application.router.add_post("/v1/images/generations", self.generation_gateway)
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
        self.received.append({"authorization": request.headers.get("Authorization"), "parts": parts,
                              "end_user_name": request.headers.get("X-End-User-Name"),
                              "end_user_phone": request.headers.get("X-End-User-Phone")})
        if self.raw_body is not None:
            return web.Response(body=self.raw_body, status=self.status, headers=self.response_headers)
        return web.json_response(self.payload, status=self.status, headers=self.response_headers)

    async def generation_gateway(self, request):
        self.generations.append({"body": await request.json(),
                                 "authorization": request.headers.get("Authorization"),
                                 "name": request.headers.get("X-End-User-Name"),
                                 "phone": request.headers.get("X-End-User-Phone")})
        return web.json_response(self.payload, status=self.status, headers=self.response_headers)

    async def test_text_to_image_uses_generation_endpoint_and_one_paid_request(self):
        result = await cloud_images.generate(self.session, "  一只橘猫  ", size="1536x1024", quality="high",
                                              end_user_name="图片用户", end_user_phone="13800138000")
        self.assertEqual(result["image_bytes"], png())
        self.assertEqual(result["model"], "gpt-image-2.5-sunburst")
        self.assertEqual(len(self.generations), 1)
        sent = self.generations[0]
        self.assertEqual(sent["body"], {"model": "gpt-image-2.5-sunburst", "prompt": "一只橘猫", "n": 1,
                                        "size": "1536x1024", "quality": "high", "output_format": "png",
                                        "output_compression": 100})
        self.assertEqual(sent["authorization"], "Bearer test-secret")
        self.assertEqual((sent["name"], sent["phone"]), ("图片用户", "13800138000"))
        self.assertEqual(self.received, [])

    async def test_internal_models_are_exact_and_isolated_across_json_and_multipart(self):
        shared_config = {**cloud_images.load(), "model": "admin-default-model"}
        models = ("gpt-image-2", "gpt-image-2.5-sunburst", "gpt-image-2.6-sunburst")
        calls, expected = [], []
        with mock.patch.object(cloud_images, "load", return_value=shared_config):
            for model in models:
                for editing in (False, True):
                    prompt = f"{model}-{'edit' if editing else 'generate'}"
                    identity = {"end_user_name": "user", "end_user_phone": "13800138000"}
                    calls.append(cloud_images.edit(self.session, [png()], prompt, model=model, **identity)
                                 if editing else cloud_images.generate(self.session, prompt, model=model, **identity))
                    expected.append(model)
            results = await asyncio.gather(*calls)
            # Existing edit/lighting and generation callers still use the admin default.
            results += [await cloud_images.edit(self.session, [png()], "legacy-edit", **identity),
                        await cloud_images.generate(self.session, "legacy-generate", **identity)]
        self.assertEqual([result["model"] for result in results], expected + ["admin-default-model"] * 2)
        self.assertEqual(shared_config["model"], "admin-default-model")
        self.assertEqual(cloud_images.load()["model"], "gpt-image-2.5-sunburst")
        json_models = {sent["body"]["prompt"]: sent["body"]["model"] for sent in self.generations}
        edit_models = {}
        for sent in self.received:
            fields = {part["name"]: part["data"].decode() for part in sent["parts"] if not part["filename"]}
            edit_models[fields["prompt"]] = fields["model"]
            self.assertEqual(sent["authorization"], "Bearer test-secret")
        for model in models:
            self.assertEqual(json_models[f"{model}-generate"], model)
            self.assertEqual(edit_models[f"{model}-edit"], model)
        self.assertEqual(json_models["legacy-generate"], "admin-default-model")
        self.assertEqual(edit_models["legacy-edit"], "admin-default-model")
        self.assertEqual(len(self.generations), 4)
        self.assertEqual(len(self.received), 4)
        self.assertTrue(all(sent["authorization"] == "Bearer test-secret" for sent in self.generations))

    async def test_generation_rejects_invalid_params_without_network(self):
        for params in ({"prompt": ""}, {"prompt": "x" * 32001}, {"prompt": "cat", "size": "original"},
                       {"prompt": "cat", "quality": "invalid"}, {"prompt": "cat", "size": "1001x751"},
                       {"prompt": "cat", "size": "8000x8000"}, {"prompt": "cat", "size": {}}):
            with self.subTest(params=params), self.assertRaises(cloud_images.ImageEditError):
                await cloud_images.generate(self.session, **params,
                                             end_user_name="image-test-user", end_user_phone="13800138000")
        self.assertEqual(self.generations, [])

    async def test_generation_accepts_32000_characters_without_truncating(self):
        prompt = "文" * 32000
        await cloud_images.generate(self.session, prompt, end_user_name="user", end_user_phone="13800138000")
        self.assertEqual(self.generations[0]["body"]["prompt"], prompt)
        self.assertEqual(len(self.generations), 1)
        with self.assertRaises(cloud_images.ImageEditError):
            await cloud_images.edit(self.session, [png()], "文" * 20001,
                                    end_user_name="user", end_user_phone="13800138000")
        self.assertEqual(self.received, [])

    async def test_generation_supports_aligned_short_edge_sizes_and_defaults_high(self):
        await cloud_images.generate(self.session, "猫", size="1920x1088",
                                    end_user_name="user", end_user_phone="13800138000")
        self.assertEqual(self.generations[0]["body"]["size"], "1920x1088")
        self.assertEqual(self.generations[0]["body"]["quality"], "high")

    async def test_4k_size_is_forwarded_in_json_and_multipart(self):
        identity = {"end_user_name": "user", "end_user_phone": "13800138000"}
        await cloud_images.generate(self.session, "4K 文生图", size="4096x4096", model="gpt-image-2", **identity)
        await cloud_images.edit(self.session, [png()], "4K 图生图", size="4096x4096",
                                model="gpt-image-2.6-sunburst", **identity)
        self.assertEqual(self.generations[0]["body"]["size"], "4096x4096")
        fields = {part["name"]: part["data"].decode() for part in self.received[0]["parts"] if not part["filename"]}
        self.assertEqual(fields["size"], "4096x4096")
        self.assertEqual(self.generations[0]["body"]["model"], "gpt-image-2")
        self.assertEqual(fields["model"], "gpt-image-2.6-sunburst")
        self.assertEqual(len(self.generations) + len(self.received), 2)

    async def test_generation_http_failure_does_not_retry(self):
        self.status = 429
        self.payload = {"error": "rate limit test-secret"}
        with self.assertRaises(cloud_images.ImageEditError) as caught:
            await cloud_images.generate(self.session, "猫", end_user_name="user", end_user_phone="13800138000")
        self.assertFalse(caught.exception.response()["retryable"])
        self.assertNotIn("test-secret", str(caught.exception))
        self.assertEqual(len(self.generations), 1)

    async def test_edit_quality_override_is_forwarded(self):
        await cloud_images.edit(self.session, [png()], "编辑", quality="high",
                                end_user_name="user", end_user_phone="13800138000")
        fields = {part["name"]: part["data"].decode() for part in self.received[-1]["parts"] if not part["filename"]}
        self.assertEqual(fields["quality"], "high")

    async def download(self, request):
        self.redirect_hits += 1
        self.download_requests.append(dict(request.headers))
        if self.download_delay:
            await asyncio.sleep(self.download_delay)
        if self.download_chunked:
            response = web.StreamResponse(status=self.download_status, headers=self.download_headers)
            await response.prepare(request)
            await response.write(self.download_body)
            await response.write_eof()
            return response
        return web.Response(body=self.download_body, status=self.download_status,
                            headers=self.download_headers, content_type="application/octet-stream")

    async def test_single_image_uses_explicit_model_and_detected_mime(self):
        original = png(format="JPEG")
        result = await cloud_images.edit(self.session, [original], "  保持构图，调整质感  ",
                                         end_user_name="中文图片用户", end_user_phone="13800138000")
        self.assertEqual(result["image_bytes"], png())
        self.assertEqual((result["width"], result["height"]), (3, 2))
        self.assertEqual(result["request_id"], "image-request-1")
        self.assertEqual(len(self.received), 1)
        sent = self.received[0]
        self.assertEqual(sent["authorization"], "Bearer test-secret")
        self.assertEqual(sent["end_user_name"], "中文图片用户")
        self.assertEqual(sent["end_user_phone"], "13800138000")
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
                await cloud_images.edit(self.session, [png()], "编辑", end_user_name="image-test-user",
                                        end_user_phone="13800138000", size=override)
                fields = {p["name"]: p["data"].decode() for p in self.received[-1]["parts"] if not p["filename"]}
                self.assertEqual(fields["size"], expected)

    async def test_multiple_images_keep_repeated_field_and_order(self):
        originals = [png("red"), png("blue", size=(4, 3))]
        await cloud_images.edit(self.session, originals, "图1主图，图2参考",
                                end_user_name="image-test-user", end_user_phone="13800138000")
        files = [p for p in self.received[0]["parts"] if p["filename"]]
        self.assertEqual([p["name"] for p in files], ["image[]", "image[]"])
        self.assertEqual([p["data"] for p in files], originals)
        self.assertEqual([p["filename"] for p in files], ["image_1.png", "image_2.png"])
        fields = {p["name"]: p["data"].decode() for p in self.received[0]["parts"] if not p["filename"]}
        self.assertEqual(fields["size"], "3x2")

    async def test_all_images_are_inspected_before_building_form(self):
        with mock.patch.object(cloud_images.aiohttp, "FormData") as form:
            with self.assertRaises(cloud_images.ImageEditError):
                await cloud_images.edit(self.session, [png(), b"invalid second image"], "编辑", end_user_name="image-test-user", end_user_phone="13800138000")
            form.assert_not_called()
        self.assertEqual(self.received, [])

    async def test_url_result_is_returned_without_download_or_key_forwarding(self):
        url = str(self.server.make_url("/download"))
        self.payload = {"data": [{"url": url}]}
        result = await cloud_images.edit(self.session, [png()], "编辑", end_user_name="image-test-user", end_user_phone="13800138000")
        self.assertEqual(result["result_url"], url)
        self.assertNotIn("image_bytes", result)
        self.assertEqual(self.redirect_hits, 0)

    async def test_generation_url_downloads_validated_bytes_without_forwarding_credentials(self):
        self.payload = {"data": [{"url": str(self.server.make_url("/download?signature=private-token"))}]}
        self.session.headers["Cookie"] = "private-session=secret"
        self.session.headers["Authorization"] = "Bearer ambient-secret"
        self.download_body = png(format="WEBP")
        result = await cloud_images.generate(self.session, "cat", end_user_name="user",
                                             end_user_phone="13800138000")
        self.assertEqual(result["image_bytes"], self.download_body)
        self.assertEqual(result["extension"], ".webp")
        self.assertEqual((result["width"], result["height"]), (3, 2))
        self.assertEqual(result["request_id"], "image-request-1")
        self.assertNotIn("result_url", result)
        self.assertEqual(len(self.generations), 1)
        self.assertEqual(len(self.download_requests), 1)
        for name in ("Authorization", "Cookie", "X-End-User-Name", "X-End-User-Phone"):
            self.assertNotIn(name, self.download_requests[0])

    async def test_generation_url_download_failures_keep_receipt_without_retry(self):
        self.payload = {"data": [{"url": str(self.server.make_url("/download?signature=private-token"))}]}
        cases = [(302, png(), {"Location": str(self.server.make_url("/download"))}),
                 (404, b"private provider error", {}), (200, b"not an image", {}),
                 (200, png(), {"Content-Length": str(cloud_images.MAX_IMAGE_BYTES + 1)})]
        for status, body, headers in cases:
            with self.subTest(status=status, headers=headers):
                self.download_status, self.download_body, self.download_headers = status, body, headers
                before = len(self.download_requests)
                with self.assertRaises(cloud_images.ImageEditError) as caught:
                    await cloud_images.generate(self.session, "cat", end_user_name="user",
                                                 end_user_phone="13800138000")
                self.assertTrue(caught.exception.generation_unknown)
                self.assertEqual(caught.exception.request_id, "image-request-1")
                self.assertFalse(caught.exception.response()["retryable"])
                self.assertNotIn("private-token", str(caught.exception))
                self.assertNotIn("private provider error", str(caught.exception))
                self.assertEqual(len(self.download_requests), before + 1)
        self.assertEqual(len(self.generations), len(cases))

    async def test_generation_url_chunked_download_is_bounded(self):
        self.payload = {"data": [{"url": str(self.server.make_url("/download"))}]}
        self.download_chunked = True
        with mock.patch.object(cloud_images, "MAX_IMAGE_BYTES", len(png()) - 1):
            with self.assertRaises(cloud_images.ImageEditError) as caught:
                await cloud_images.generate(self.session, "cat", end_user_name="user",
                                             end_user_phone="13800138000")
        self.assertTrue(caught.exception.generation_unknown)
        self.assertEqual(len(self.generations), 1)
        self.assertEqual(len(self.download_requests), 1)

    async def test_generation_url_rejects_other_private_origins_before_fetch(self):
        urls = ["http://127.0.0.1/private", "https://127.0.0.1/private",
                "https://10.0.0.1/private", "https://169.254.169.254/metadata",
                "https://[::1]/private", "https://[::ffff:127.0.0.1]/private",
                "https://224.0.0.1/private", "https://example.invalid:444/image",
                "http://example.invalid/image"]
        for url in urls:
            self.payload = {"data": [{"url": url}]}
            with self.subTest(url=url), self.assertRaises(cloud_images.ImageEditError) as caught:
                await cloud_images.generate(self.session, "cat", end_user_name="user",
                                             end_user_phone="13800138000")
            self.assertTrue(caught.exception.generation_unknown)
            self.assertEqual(caught.exception.request_id, "image-request-1")
        self.assertEqual(len(self.generations), len(urls))
        self.assertEqual(self.download_requests, [])

    async def test_result_resolver_validates_actual_dns_addresses(self):
        resolver = cloud_images.PublicImageResolver()
        try:
            public = {"host": "8.8.8.8"}
            with mock.patch.object(cloud_images.ThreadedResolver, "resolve",
                                   new=mock.AsyncMock(return_value=[public])):
                self.assertEqual(await resolver.resolve("public.example", 443), [public])
            for address in ("127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "::ffff:127.0.0.1", "224.0.0.1"):
                records = [public, {"host": address}]
                with self.subTest(address=address), mock.patch.object(
                        cloud_images.ThreadedResolver, "resolve", new=mock.AsyncMock(return_value=records)):
                    with self.assertRaises(OSError):
                        await resolver.resolve("public.example", 443)
            with mock.patch.object(cloud_images.ThreadedResolver, "resolve", new=mock.AsyncMock(return_value=[])):
                with self.assertRaises(OSError):
                    await resolver.resolve("public.example", 443)
        finally:
            await resolver.close()

    async def test_generation_url_private_dns_is_blocked_by_download_connector(self):
        self.payload = {"data": [{"url": "https://public.example/image"}]}
        with mock.patch.object(cloud_images.ThreadedResolver, "resolve", new=mock.AsyncMock(
                return_value=[{"host": "127.0.0.1"}])):
            with self.assertRaises(cloud_images.ImageEditError) as caught:
                await cloud_images.generate(self.session, "cat", end_user_name="user",
                                             end_user_phone="13800138000")
        self.assertTrue(caught.exception.generation_unknown)
        self.assertEqual(len(self.generations), 1)
        self.assertEqual(self.download_requests, [])

    async def test_result_download_timeout_is_bounded_and_does_not_submit_generation(self):
        self.download_delay = .3
        timeout = aiohttp.ClientTimeout(total=2, connect=1, sock_read=.1)
        result = {"request_id": "timeout-receipt", "model": "gpt-image-2.5-sunburst",
                  "result_url": str(self.server.make_url("/download"))}
        with mock.patch.object(cloud_images.aiohttp, "ClientTimeout", return_value=timeout):
            with self.assertRaises(cloud_images.ImageEditError) as caught:
                await cloud_images.download_result(result, cloud_images.load())
        self.assertEqual(caught.exception.request_id, "timeout-receipt")
        self.assertTrue(caught.exception.generation_unknown)
        self.assertFalse(caught.exception.response()["retryable"])
        self.assertEqual(self.generations, [])
        self.assertEqual(len(self.download_requests), 1)

    async def test_redirect_is_not_followed(self):
        self.status = 307
        self.response_headers["Location"] = str(self.server.make_url("/download"))
        with self.assertRaises(cloud_images.ImageEditError) as raised:
            await cloud_images.edit(self.session, [png()], "编辑", end_user_name="image-test-user", end_user_phone="13800138000")
        self.assertIn("HTTP 307", str(raised.exception))
        self.assertEqual(self.redirect_hits, 0)
        self.assertEqual(len(self.received), 1)

    async def test_non_success_never_retries_or_leaks_vendor_body(self):
        self.status = 429
        self.payload = {"error": "secret: test-secret"}
        with self.assertRaises(cloud_images.ImageEditError) as raised:
            await cloud_images.edit(self.session, [png()], "编辑", end_user_name="image-test-user", end_user_phone="13800138000")
        self.assertEqual(len(self.received), 1)
        self.assertFalse(raised.exception.response()["retryable"])
        self.assertNotIn("test-secret", json.dumps(raised.exception.response()))
        self.assertEqual(raised.exception.request_id, "image-request-1")

    async def test_http_error_logs_structured_diagnostics_only_on_server(self):
        self.status = 400
        self.payload = {"error": {"message": "Unsupported output size", "type": "invalid_request_error",
                                  "param": "size", "code": "invalid_size"},
                        "api_key": "unrelated-private-field"}
        with self.assertLogs(cloud_images.__name__, level="WARNING") as logs:
            with self.assertRaises(cloud_images.ImageEditError) as raised:
                await cloud_images.edit(self.session, [png()], "编辑", end_user_name="image-test-user", end_user_phone="13800138000")
        logged = " ".join(logs.output)
        for text in ("HTTP 400", "image-request-1", "Unsupported output size", "param=size", "code=invalid_size"):
            self.assertIn(text, logged)
        self.assertNotIn("unrelated-private-field", logged)
        self.assertNotIn("Unsupported output size", json.dumps(raised.exception.response()))
        self.assertEqual(raised.exception.request_id, "image-request-1")
        self.assertFalse(raised.exception.generation_unknown)
        self.assertFalse(raised.exception.response()["retryable"])
        self.assertEqual(len(self.received), 1)

    async def test_http_error_log_redacts_credentials_prompt_and_image_data(self):
        self.status = 400
        prompt = "private prompt content"
        self.payload = {"error": {"message": "test-secret Bearer another-secret sk-vendor-secret "
                                  + prompt + "\nnew line data:image/png;base64,aGVsbG8= " + "A" * 100}}
        with self.assertLogs(cloud_images.__name__, level="WARNING") as logs:
            with self.assertRaises(cloud_images.ImageEditError):
                await cloud_images.edit(self.session, [png()], prompt,
                                        end_user_name="image-test-user", end_user_phone="13800138000")
        logged = " ".join(logs.output)
        for secret in ("test-secret", "another-secret", "sk-vendor-secret", prompt, "aGVsbG8=", "A" * 100):
            self.assertNotIn(secret, logged)
        self.assertNotIn("\n", logs.output[0])
        self.assertIn("[redacted]", logged)
        self.assertIn("[data redacted]", logged)
        self.assertEqual(len(self.received), 1)

    async def test_http_error_diagnostic_limits_and_unstructured_bodies(self):
        self.status = 400
        for payload in ({"detail": "Invalid size"}, {"message": "Invalid format"},
                        {"error": {"message": "x " * 1000}}):
            with self.subTest(payload_type=next(iter(payload))):
                self.payload = payload
                with self.assertLogs(cloud_images.__name__, level="WARNING") as logs:
                    with self.assertRaises(cloud_images.ImageEditError):
                        await cloud_images.edit(self.session, [png()], "编辑", end_user_name="image-test-user", end_user_phone="13800138000")
                self.assertLessEqual(len(logs.output[0].split("detail=", 1)[1]), 512)
                self.assertNotIn("无可用结构化错误详情", logs.output[0])
        for body in (b"<html>private proxy error</html>", b"{invalid json", b"x" * 17000):
            self.raw_body = body
            with self.assertLogs(cloud_images.__name__, level="WARNING") as logs:
                with self.assertRaises(cloud_images.ImageEditError) as raised:
                    await cloud_images.edit(self.session, [png()], "编辑", end_user_name="image-test-user", end_user_phone="13800138000")
            self.assertIn("无可用结构化错误详情", logs.output[0])
            self.assertNotIn("private proxy error", logs.output[0])
            self.assertIn("HTTP 400", str(raised.exception))
            self.assertEqual(raised.exception.request_id, "image-request-1")
        self.assertEqual(len(self.received), 6)

    async def test_failed_diagnostic_read_preserves_known_http_error(self):
        async def broken_stream():
            yield b'{"error":'
            raise aiohttp.ClientPayloadError("interrupted")
        response = mock.Mock(status=400, headers={"X-Request-ID": "interrupted-id"})
        response.content.iter_chunked.return_value = broken_stream()
        context = mock.AsyncMock()
        context.__aenter__.return_value = response
        session = mock.Mock()
        session.post.return_value = context
        with self.assertLogs(cloud_images.__name__, level="WARNING"):
            with self.assertRaises(cloud_images.ImageEditError) as raised:
                await cloud_images.edit(session, [png()], "编辑", end_user_name="image-test-user", end_user_phone="13800138000")
        self.assertIn("HTTP 400", str(raised.exception))
        self.assertFalse(raised.exception.generation_unknown)
        self.assertEqual(raised.exception.request_id, "interrupted-id")
        self.assertEqual(session.post.call_count, 1)

    async def test_timeout_has_unknown_state_and_no_retry(self):
        session = mock.Mock()
        session.post.side_effect = asyncio.TimeoutError()
        with self.assertRaises(cloud_images.ImageEditError) as raised:
            await cloud_images.edit(session, [png()], "编辑", end_user_name="image-test-user", end_user_phone="13800138000")
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
            await cloud_images.edit(self.session, [png()], "编辑", end_user_name="image-test-user", end_user_phone="13800138000")
        self.assertEqual(raised.exception.status, 503)
        self.assertEqual(self.received, [])

    async def test_environment_key_is_server_side_override(self):
        with mock.patch.dict(os.environ, {"CHOUKA_IMAGE_API_KEY": "environment-secret"}):
            await cloud_images.edit(self.session, [png()], "编辑", end_user_name="image-test-user", end_user_phone="13800138000")
        self.assertEqual(self.received[0]["authorization"], "Bearer environment-secret")

    async def test_invalid_input_never_reaches_gateway(self):
        for image in (b"not an image", png()[:-20]):
            with self.assertRaises(cloud_images.ImageEditError):
                await cloud_images.edit(self.session, [image], "编辑", end_user_name="image-test-user", end_user_phone="13800138000")
        self.assertEqual(self.received, [])

    async def test_response_limit_keeps_request_id(self):
        with mock.patch.object(cloud_images, "MAX_RESPONSE_BYTES", 10):
            with self.assertRaises(cloud_images.ImageEditError) as raised:
                await cloud_images.edit(self.session, [png()], "编辑", end_user_name="image-test-user", end_user_phone="13800138000")
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
                    await cloud_images.edit(self.session, [png()], "编辑", end_user_name="image-test-user", end_user_phone="13800138000")
                self.assertEqual(raised.exception.request_id, "image-request-1")

    async def test_invalid_config_fails_before_network(self):
        for address in ("file:///tmp/api", "http://[bad", "http://localhost:bad/v1", "http://user:secret@localhost/v1"):
            self.write_config(base_url=address)
            with self.assertRaises(cloud_images.ImageEditError) as raised:
                await cloud_images.edit(self.session, [png()], "编辑", end_user_name="image-test-user", end_user_phone="13800138000")
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
            await cloud_images.edit(session, [png()], "编辑", end_user_name="image-test-user", end_user_phone="13800138000")
        self.assertTrue(raised.exception.generation_unknown)
        self.assertEqual(raised.exception.request_id, "interrupted-id")
        self.assertEqual(session.post.call_count, 1)

    async def test_output_extension_comes_from_image_bytes(self):
        for format, suffix in (("PNG", ".png"), ("JPEG", ".jpg"), ("WEBP", ".webp")):
            self.payload = {"data": [{"b64_json": base64.b64encode(png(format=format)).decode()}]}
            result = await cloud_images.edit(self.session, [png()], "编辑", end_user_name="image-test-user", end_user_phone="13800138000")
            self.assertEqual(result["extension"], suffix)


if __name__ == "__main__":
    unittest.main()
