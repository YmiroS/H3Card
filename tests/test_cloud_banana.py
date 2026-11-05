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

from server import cloud_banana, cloud_images


def png(color="red", size=(3, 2), format="PNG"):
    output = BytesIO()
    Image.new("RGB", size, color).save(output, format=format)
    return output.getvalue()


def banana_payload(image=None):
    image = image if image is not None else png("blue")
    encoded = base64.b64encode(image).decode()
    # 实测上游一次返回两张像素相同的候选图，都内嵌在 markdown content 里。
    return {"choices": [{"message": {"content": f"![image](data:image/png;base64,{encoded}) "
                                                 f"![image](data:image/png;base64,{encoded})"}}],
            "usage": {"cost": 0.019}}


class CloudBananaTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.config = Path(self.temp.name) / "cloud-ai-config.json"
        self.enterContext(mock.patch.object(cloud_images, "CONF", self.config))
        self.enterContext(mock.patch.dict(os.environ, {"CHOUKA_IMAGE_API_KEY": ""}))
        self.received = []
        self.status = 200
        self.payload = banana_payload()
        self.raw_body = None
        application = web.Application()
        application.router.add_post("/v1/chat/completions", self.gateway)
        self.server = TestServer(application)
        await self.server.start_server()
        self.addAsyncCleanup(self.server.close)
        self.session = aiohttp.ClientSession(trust_env=False)
        self.addAsyncCleanup(self.session.close)
        self.write_config()

    def write_config(self, **extra):
        config = {"base_url": str(self.server.make_url("/v1")), "api_key": "banana-secret",
                  "banana_model": "gemini-3-pro-image", **extra}
        self.config.write_text(json.dumps(config), encoding="utf-8")

    async def gateway(self, request):
        self.received.append({"authorization": request.headers.get("Authorization"),
                              "end_user_name": request.headers.get("X-End-User-Name"),
                              "end_user_phone": request.headers.get("X-End-User-Phone"),
                              "body": await request.json()})
        headers = {"X-Request-ID": "banana-request-1"}
        if self.raw_body is not None:
            return web.Response(body=self.raw_body, status=self.status, headers=headers)
        return web.json_response(self.payload, status=self.status, headers=headers)

    async def test_single_image_builds_chat_request_and_extracts_first_candidate(self):
        result = await cloud_banana.generate(self.session, [png()], "  保持构图，调整质感  ",
                                             end_user_name="中文香蕉用户", end_user_phone="13800138000")
        self.assertEqual(result["image_bytes"], png("blue"))
        self.assertEqual((result["width"], result["height"]), (3, 2))
        self.assertEqual(result["request_id"], "banana-request-1")
        self.assertEqual(result["model"], "gemini-3-pro-image")
        self.assertEqual(len(self.received), 1)
        sent = self.received[0]
        self.assertEqual(sent["authorization"], "Bearer banana-secret")
        self.assertEqual(sent["end_user_name"], "中文香蕉用户")
        self.assertEqual(sent["end_user_phone"], "13800138000")
        body = sent["body"]
        self.assertEqual(body["model"], "gemini-3-pro-image")
        self.assertEqual(body["modalities"], ["IMAGE"])
        self.assertFalse(body["stream"])
        # 尺寸档位实测不生效，请求体不携带 image_config / extra_body。
        self.assertNotIn("google", body)
        self.assertNotIn("extra_body", body)
        content = body["messages"][0]["content"]
        self.assertEqual(body["messages"][0]["role"], "user")
        self.assertEqual(content[0], {"type": "text", "text": "保持构图，调整质感"})
        encoded = base64.b64encode(png()).decode()
        self.assertEqual(content[1], {"type": "image_url",
                                      "image_url": {"url": f"data:image/png;base64,{encoded}"}})

    async def test_multiple_images_keep_order_and_detected_mime(self):
        originals = [png("red"), png("blue", size=(4, 3), format="JPEG")]
        result = await cloud_banana.generate(self.session, originals, "图1主图，图2参考",
                                             end_user_name="banana-test-user", end_user_phone="13800138000")
        self.assertEqual(result["image_bytes"], png("blue"))
        parts = self.received[0]["body"]["messages"][0]["content"]
        self.assertEqual([part["type"] for part in parts], ["text", "image_url", "image_url"])
        self.assertTrue(parts[1]["image_url"]["url"].startswith("data:image/png;base64,"))
        self.assertTrue(parts[2]["image_url"]["url"].startswith("data:image/jpeg;base64,"))
        self.assertIn(base64.b64encode(originals[1]).decode(), parts[2]["image_url"]["url"])

    async def test_text_only_response_is_error_without_retry(self):
        self.payload = {"choices": [{"message": {"content": "抱歉，无法生成这张图片。"}}]}
        with self.assertRaises(cloud_banana.BananaError) as caught:
            await cloud_banana.generate(self.session, [png()], "编辑", end_user_name="banana-test-user", end_user_phone="13800138000")
        self.assertIn("没有图片", str(caught.exception))
        self.assertEqual(caught.exception.status, 502)
        self.assertFalse(caught.exception.generation_unknown)
        self.assertEqual(caught.exception.request_id, "banana-request-1")

    async def test_non_string_content_is_invalid_response(self):
        self.payload = {"choices": [{"message": {"content": [{"type": "image_url"}]}}]}
        with self.assertRaises(cloud_banana.BananaError) as caught:
            await cloud_banana.generate(self.session, [png()], "编辑", end_user_name="banana-test-user", end_user_phone="13800138000")
        self.assertIn("响应格式无效", str(caught.exception))

    async def test_http_error_redacts_key_and_prompt_from_logs_and_message(self):
        self.status = 400
        self.payload = {"error": {"message": "Invalid key: banana-secret while running 保持构图",
                                  "param": "model", "code": "invalid_model"}}
        with self.assertLogs(cloud_banana.__name__, level="WARNING") as logs:
            with self.assertRaises(cloud_banana.BananaError) as caught:
                await cloud_banana.generate(self.session, [png()], "保持构图",
                                            end_user_name="banana-test-user", end_user_phone="13800138000")
        self.assertIn("HTTP 400", str(caught.exception))
        self.assertEqual(caught.exception.request_id, "banana-request-1")
        joined = " ".join(logs.output)
        self.assertNotIn("banana-secret", joined)
        self.assertNotIn("保持构图", joined)
        self.assertIn("Invalid key: [redacted]", joined)
        self.assertIn("param=model", joined)

    async def test_gateway_failure_without_structured_detail(self):
        self.status = 503
        self.raw_body = b"upstream unavailable"
        with self.assertRaises(cloud_banana.BananaError) as caught:
            await cloud_banana.generate(self.session, [png()], "编辑", end_user_name="banana-test-user", end_user_phone="13800138000")
        self.assertIn("HTTP 503", str(caught.exception))
        self.assertFalse(caught.exception.response()["retryable"])

    async def test_invalid_base64_result_is_rejected(self):
        self.payload = {"choices": [{"message": {
            "content": "![image](data:image/png;base64,not valid base64!!)"}}]}
        with self.assertRaises(cloud_banana.BananaError) as caught:
            await cloud_banana.generate(self.session, [png()], "编辑", end_user_name="banana-test-user", end_user_phone="13800138000")
        self.assertIn("Base64", str(caught.exception))

    async def test_data_uri_with_whitespace_is_compacted_before_matching(self):
        encoded = base64.b64encode(png("blue")).decode()
        spaced = "\n".join(encoded[index:index + 76] for index in range(0, len(encoded), 76))
        self.payload = {"choices": [{"message": {
            "content": f"说明文字\n![image](\ndata:image/png;base64,{spaced}\n)\n完毕"}}]}
        result = await cloud_banana.generate(self.session, [png()], "编辑", end_user_name="banana-test-user", end_user_phone="13800138000")
        self.assertEqual(result["image_bytes"], png("blue"))

    async def test_oversized_response_is_error(self):
        self.raw_body = b'{"choices":[{"message":{"content":"' + b"x" * (cloud_banana.MAX_RESPONSE_BYTES + 1) + b'"}}]}'
        with self.assertRaises(cloud_banana.BananaError) as caught:
            await cloud_banana.generate(self.session, [png()], "编辑", end_user_name="banana-test-user", end_user_phone="13800138000")
        self.assertIn("超过大小限制", str(caught.exception))

    async def test_network_error_marks_generation_unknown(self):
        await self.server.close()
        with self.assertRaises(cloud_banana.BananaError) as caught:
            await cloud_banana.generate(self.session, [png()], "编辑", end_user_name="banana-test-user", end_user_phone="13800138000")
        self.assertTrue(caught.exception.generation_unknown)
        self.assertEqual(caught.exception.status, 504)

    async def test_invalid_inputs_are_rejected_before_any_request(self):
        for images, prompt in (([], "编辑"), ([png()], ""), ([png()], "x" * 20001)):
            with self.subTest(prompt=prompt[:10], count=len(images)):
                with self.assertRaises(cloud_banana.BananaError) as caught:
                    await cloud_banana.generate(self.session, images, prompt,
                                                end_user_name="banana-test-user", end_user_phone="13800138000")
                self.assertEqual(caught.exception.status, 400)
        self.assertEqual(self.received, [])

    async def test_banana_error_uses_image_edit_response_contract(self):
        response = cloud_banana.BananaError("boom", status=502, request_id="rid",
                                            generation_unknown=True).response()
        self.assertEqual(set(response), {"error", "request_id", "generation_unknown", "retryable"})


class CloudBananaConfigTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.config = Path(self.temp.name) / "cloud-ai-config.json"
        self.enterContext(mock.patch.object(cloud_images, "CONF", self.config))
        self.enterContext(mock.patch.dict(os.environ, {"CHOUKA_IMAGE_API_KEY": ""}))

    def test_defaults_and_model_name(self):
        self.config.write_text(json.dumps({"api_key": "k"}), encoding="utf-8")
        config = cloud_banana.load()
        self.assertEqual(config["banana_model"], "gemini-3-pro-image")
        self.assertEqual(config["banana_timeout_seconds"], 450.0)
        self.assertEqual(config["base_url"], "http://30.245.124.125:8000/v1")

    def test_missing_key_and_bad_timeout_are_503(self):
        self.config.write_text("{}", encoding="utf-8")
        with self.assertRaises(cloud_banana.BananaError) as caught:
            cloud_banana.load()
        self.assertEqual(caught.exception.status, 503)
        self.config.write_text(json.dumps({"api_key": "k", "banana_timeout_seconds": 10}),
                               encoding="utf-8")
        with self.assertRaises(cloud_banana.BananaError) as caught:
            cloud_banana.load()
        self.assertEqual(caught.exception.status, 503)

    def test_environment_key_overrides_config(self):
        self.config.write_text(json.dumps({"api_key": "config-key"}), encoding="utf-8")
        with mock.patch.dict(os.environ, {"CHOUKA_IMAGE_API_KEY": "env-key"}):
            self.assertEqual(cloud_banana.load()["api_key"], "env-key")


if __name__ == "__main__":
    unittest.main()
