"""费用采集接入测试：仅本机 aiohttp 网关与内存账本替身。"""
import asyncio
import base64
import copy
from io import BytesIO
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock

import aiohttp
from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer
from PIL import Image

from server import chat_api, cloud_chat, cloud_images
from server.cloud_generation import CloudGeneration, GPT_IMAGE_MODELS
from server.cloud_lighting import CloudLighting


def png():
    output = BytesIO()
    Image.new("RGB", (16, 16), "blue").save(output, format="PNG")
    return output.getvalue()


class LedgerStub:
    def __init__(self):
        self.provider_calls = []
        self.image_calls = []
        self.images = {}
        self.bindings = []
        self.recorded = asyncio.Event()
        self.loop = asyncio.get_running_loop()

    def bind_attribution(self, job_id, user_id):
        self.bindings.append((job_id, user_id))

    def record_provider_api(self, **kwargs):
        self.provider_calls.append(copy.deepcopy(kwargs))
        self.loop.call_soon_threadsafe(self.recorded.set)

    def record_image_api(self, job, **kwargs):
        snapshot = copy.deepcopy(job)
        self.image_calls.append(snapshot)
        self.images[job["id"]] = snapshot


class CloudCostCaptureTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.config = self.root / "config.json"
        self.enterContext(mock.patch.object(cloud_images, "CONF", self.config))
        self.enterContext(mock.patch.dict(os.environ, {"CHOUKA_IMAGE_API_KEY": ""}))
        self.payload = {"choices": [{"message": {"content": "hello"}}]}
        self.raw = None
        self.status = 200
        self.frames = None
        self.gate = None
        self.requests = []
        self.download_status = 200
        self.response_gate = None
        self.gateway_received = asyncio.Event()
        self.ledger = LedgerStub()

        async def gateway(request):
            if request.content_type == "application/json":
                body = await request.json()
            else:
                body = {"multipart": bool(await request.read())}
            self.requests.append(body)
            self.gateway_received.set()
            if self.response_gate:
                await self.response_gate.wait()
            if self.frames is not None:
                response = web.StreamResponse(headers={"Content-Type": "text/event-stream"})
                await response.prepare(request)
                for index, frame in enumerate(self.frames):
                    await response.write(frame)
                    if index == 0 and self.gate:
                        await self.gate.wait()
                await response.write_eof()
                return response
            if self.raw is not None:
                return web.Response(body=self.raw, content_type="application/json", status=self.status)
            return web.json_response(self.payload, status=self.status, headers={"X-Request-ID": "upstream-id"})

        async def download(request):
            return web.Response(body=png(), content_type="image/png", status=self.download_status)

        upstream = web.Application()
        upstream.router.add_post("/v1/chat/completions", gateway)
        upstream.router.add_post("/v1/images/generations", gateway)
        upstream.router.add_post("/v1/images/edits", gateway)
        upstream.router.add_get("/result", download)
        self.upstream = TestServer(upstream)
        await self.upstream.start_server()
        self.addAsyncCleanup(self.upstream.close)
        self.write_config()
        self.session = aiohttp.ClientSession(trust_env=False)
        self.addAsyncCleanup(self.session.close)
        self.user = {"id": "authenticated-user", "enabled": True, "username": "tester", "phone": ""}
        self.authenticated = True

        @web.middleware
        async def auth(request, handler):
            if self.authenticated:
                request["user"] = self.user
            return await handler(request)

        self.application = web.Application(middlewares=[auth])
        self.application["session"] = self.session
        self.application["costs"] = self.ledger
        chat_api.register_chat_routes(self.application)
        self.client = TestClient(TestServer(self.application))
        await self.client.start_server()
        self.addAsyncCleanup(self.client.close)

    def write_config(self, **kwargs):
        self.config.write_text(json.dumps({"base_url": str(self.upstream.make_url("/v1")),
            "api_key": "test-private-key", "chat_model": "configured-chat", "model": "configured-image",
            "banana_model": "configured-banana", **kwargs}))

    async def post(self, **kwargs):
        body = {"messages": [{"role": "user", "content": "creation_agent private prompt"}], **kwargs}
        return await self.client.post("/api/chat/completions", json=body)

    async def receipt(self):
        await asyncio.wait_for(self.ledger.recorded.wait(), 2)
        self.assertEqual(len(self.ledger.provider_calls), 1)
        return self.ledger.provider_calls[0]

    async def test_nonstream_total_charge_exact_precision_identity_and_no_context_upstream(self):
        self.raw = (b'{"choices":[{"message":{"content":"ok"}}],"model":"actual-chat",'
                    b'"cost":0.12345678901234567890123456789,"currency":"CNY",'
                    b'"usage":{"prompt_tokens":100,"completion_tokens":40,'
                    b'"prompt_tokens_details":{"cached_tokens":80},'
                    b'"completion_tokens_details":{"reasoning_tokens":30}},"api_key":"test-private-key"}')
        response = await self.post(billing_context={"scene": "reference_analysis"})
        self.assertEqual(response.status, 200)
        result = await response.json()
        self.assertEqual(result["model"], "actual-chat")
        self.assertNotIn("test-private-key", json.dumps(result))
        receipt = await self.receipt()
        self.assertEqual(receipt["provider_billing"], {"amount": "0.12345678901234567890123456789",
                                                      "currency": "CNY", "field": "cost"})
        self.assertEqual(receipt["usage"], {"input_tokens": 100, "output_tokens": 40,
                                          "cached_tokens": 80, "reasoning_tokens": 30})
        self.assertEqual(receipt["model_source"], "response")
        self.assertEqual((receipt["scene"], receipt["user_id"], receipt["status"]),
                         ("reference_analysis", "authenticated-user", "done"))
        self.assertEqual(self.ledger.bindings, [(receipt["job_id"], "authenticated-user")])
        self.assertNotEqual(receipt["job_id"], "upstream-id")
        self.assertNotIn("billing_context", self.requests[0])
        self.assertNotIn("private prompt", str(receipt))
        self.assertNotIn("test-private-key", str(receipt))

    async def test_unknown_usage_default_chat_even_prompt_mentions_agent(self):
        response = await self.post()
        self.assertEqual(response.status, 200)
        receipt = await self.receipt()
        self.assertEqual(receipt["scene"], "chat")
        self.assertIsNone(receipt["provider_billing"])
        self.assertEqual(receipt["usage"], dict.fromkeys(("input_tokens", "output_tokens", "cached_tokens", "reasoning_tokens")))
        self.assertEqual(receipt["model"], "configured-chat")
        self.assertEqual(receipt["model_source"], "config")

    async def test_repeated_chat_history_has_separate_opaque_request_events(self):
        self.payload["usage"] = {"cost": "0", "currency": "USD"}
        for _ in range(2):
            response = await self.post()
            self.assertEqual(response.status, 200)
            await response.read()
        receipts = self.ledger.provider_calls
        self.assertEqual(len(receipts), 2)
        self.assertNotEqual(receipts[0]["job_id"], receipts[1]["job_id"])
        self.assertEqual([row["provider_billing"]["amount"] for row in receipts], ["0", "0"])

    async def test_nonstream_error_keeps_charge_but_not_upstream_secrets(self):
        self.status = 500
        self.payload = {"cost": "0.7", "currency": "USD", "model": "actual",
                        "error": "test-private-key", "usage": {"input_tokens": 4}}
        response = await self.post()
        self.assertEqual(response.status, 502)
        self.assertNotIn("test-private-key", await response.text())
        receipt = await self.receipt()
        self.assertEqual(receipt["status"], "error")
        self.assertEqual(receipt["provider_billing"]["amount"], "0.7")

    async def test_duplicate_fee_fields_unknown_without_breaking_valid_answer(self):
        self.raw = (b'{"choices":[{"message":{"content":"ok"}}],'
                    b'"cost":"1","cost":"2","currency":"CNY"}')
        response = await self.post()
        self.assertEqual(response.status, 200)
        self.assertEqual((await response.json())["content"], "ok")
        receipt = await self.receipt()
        self.assertIsNone(receipt["provider_billing"])
        self.assertEqual(receipt["status"], "done")

    async def test_invalid_numeric_fee_does_not_break_valid_answer(self):
        self.raw = (b'{"choices":[{"message":{"content":"ok"}}],'
                    b'"cost":1e999999999999999999999999999999,"currency":"CNY"}')
        response = await self.post()
        self.assertEqual(response.status, 200)
        receipt = await self.receipt()
        self.assertIsNone(receipt["provider_billing"])
        self.assertEqual(receipt["status"], "done")

    async def test_invalid_result_still_keeps_usage_and_charge(self):
        self.payload = {"usage": {"cost": "1", "currency": "CNY", "input_tokens": 2}}
        response = await self.post()
        self.assertEqual(response.status, 502)
        receipt = await self.receipt()
        self.assertEqual(receipt["usage"]["input_tokens"], 2)
        self.assertEqual(receipt["provider_billing"]["field"], "usage.cost")

    async def test_stream_final_snapshots_are_not_summed_or_forwarded(self):
        self.frames = [
            b'data: {"choices":[{"delta":{"content":"hi"}}],"usage":{"input_tokens":3,"cost":"0.1"}}\n\n',
            b'data: {"choices":[],"model":"actual-stream","usage":{"input_tokens":9,"output_tokens":5,"cost":"0.20","currency":"USD"},"api_key":"test-private-key"}\n\n',
            b'data: [DONE]\n\n']
        response = await self.post(stream=True)
        text = await response.text()
        self.assertIn('"content":"hi"', text)
        self.assertIn("data: [DONE]", text)
        self.assertNotIn("usage", text)
        self.assertNotIn("test-private-key", text)
        receipt = await self.receipt()
        self.assertEqual(receipt["status"], "done")
        self.assertEqual(receipt["model"], "actual-stream")
        self.assertEqual(receipt["provider_billing"]["amount"], "0.20")
        self.assertEqual(receipt["usage"]["input_tokens"], 9)
        self.assertEqual(receipt["usage"]["output_tokens"], 5)

    async def test_stream_eof_retains_charge_and_error_semantics(self):
        self.frames = [b'data: {"choices":[],"cost":"0.4","currency":"USD","usage":{"input_tokens":7}}\n\n']
        response = await self.post(stream=True)
        text = await response.text()
        self.assertIn("event: error", text)
        self.assertNotIn("[DONE]", text)
        receipt = await self.receipt()
        self.assertEqual(receipt["status"], "error")
        self.assertEqual(receipt["provider_billing"]["amount"], "0.4")

    async def test_stream_eof_without_frame_separator_retains_received_charge(self):
        self.frames = [b'data: {"choices":[],"cost":"0.45","currency":"CNY","usage":{"input_tokens":8}}']
        response = await self.post(stream=True)
        text = await response.text()
        self.assertIn("event: error", text)
        self.assertNotIn("[DONE]", text)
        receipt = await self.receipt()
        self.assertEqual(receipt["status"], "error")
        self.assertEqual(receipt["provider_billing"]["amount"], "0.45")
        self.assertEqual(receipt["usage"]["input_tokens"], 8)

    async def test_stream_error_event_preserves_final_billing(self):
        self.frames = [b'event: error\ndata: {"error":"test-private-key","cost":"0.8","currency":"CNY"}\n\n']
        response = await self.post(stream=True)
        text = await response.text()
        self.assertIn("event: error", text)
        self.assertNotIn("test-private-key", text)
        receipt = await self.receipt()
        self.assertEqual(receipt["status"], "error")
        self.assertEqual(receipt["provider_billing"]["amount"], "0.8")

    async def test_stream_without_usage_records_unknown(self):
        self.frames = [b'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n', b'data: [DONE]\n\n']
        response = await self.post(stream=True)
        self.assertIn("[DONE]", await response.text())
        receipt = await self.receipt()
        self.assertEqual(receipt["status"], "done")
        self.assertIsNone(receipt["provider_billing"])
        self.assertTrue(all(value is None for value in receipt["usage"].values()))

    async def test_cancel_stream_records_once_and_reraises_cancel(self):
        self.gate = asyncio.Event()
        self.frames = [b'data: {"choices":[{"delta":{"content":"partial"}}],"cost":"0.3","currency":"USD","usage":{"output_tokens":2}}\n\n',
                       b'data: [DONE]\n\n']
        written = asyncio.Event()
        downstream = mock.Mock()
        downstream.prepare = mock.AsyncMock()
        downstream.write_eof = mock.AsyncMock()

        async def write(data):
            written.set()
        downstream.write = mock.AsyncMock(side_effect=write)

        class Content:
            async def iter_chunked(self, size):
                yield json.dumps({"messages": [{"role": "user", "content": "hi"}], "stream": True}).encode()

        class Request(dict):
            pass
        request = Request(user=self.user)
        request.app = self.application
        request.content_type = "application/json"
        request.content = Content()
        with mock.patch.object(cloud_chat, "web", mock.Mock(StreamResponse=mock.Mock(return_value=downstream))):
            task = asyncio.create_task(chat_api.completions(request))
            try:
                await asyncio.wait_for(written.wait(), 2)
                task.cancel()
                with self.assertRaises(asyncio.CancelledError):
                    await task
            finally:
                self.gate.set()
        receipt = await self.receipt()
        self.assertEqual(receipt["status"], "canceled")
        self.assertEqual(receipt["provider_billing"]["amount"], "0.3")
        self.assertEqual(receipt["usage"]["output_tokens"], 2)
        self.assertEqual(len(self.requests), 1)

    async def test_context_scene_whitelist_and_auth_reject_before_upstream(self):
        invalid = [None, {}, {"scene": "admin"}, {"scene": "chat", "user_id": "forged"},
                   {"scene": "chat", "card_id": "card-1"}, {"scene": "chat", "project_id": "../other"}]
        for context in invalid:
            response = await self.post(billing_context=context)
            self.assertEqual(response.status, 400, await response.text())
        self.authenticated = False
        self.assertEqual((await self.post()).status, 401)
        self.assertEqual(self.requests, [])
        self.assertEqual(self.ledger.provider_calls, [])

    async def test_project_and_card_permissions_use_existing_authorization(self):
        context = {"scene": "creation_agent", "project_id": "project-1", "card_id": "card-1"}
        repository = mock.Mock()
        repository.read.return_value = {"name": "可信画布", "cards": [{"id": "card-1", "title": "可信卡片"}]}
        # 使用真正的 require_project，认证存储替身记录传入的真实用户。
        store = mock.Mock()
        store.project_permission.return_value = None
        store.get_project.return_value = {"name": "可信画布"}
        original_get = self.application.get
        injected = {"project_repository": repository, "auth_store": store}
        with mock.patch.object(self.application, "get") as get:
            get.side_effect = lambda key, default=None: injected.get(key, original_get(key, default))
            response = await self.post(billing_context=context)
            self.assertEqual(response.status, 404)
            store.project_permission.assert_called_once_with("authenticated-user", "project-1")
            store.get_project.assert_not_called()
            self.assertEqual(self.requests, [])
            store.project_permission.return_value = "operate"
            repository.read.return_value = {"cards": [{"id": "other-card"}]}
            self.assertEqual((await self.post(billing_context=context)).status, 404)
            repository.read.return_value = {"name": "可信画布", "cards": [{"id": "card-1", "title": "可信卡片"}]}
            response = await self.post(billing_context=context)
            self.assertEqual(response.status, 200)
        receipt = await self.receipt()
        self.assertEqual((receipt["project_id"], receipt["card_id"]), ("project-1", "card-1"))
        self.assertEqual((receipt["project_name"], receipt["card_name"]), ("可信画布", "可信卡片"))
        self.assertNotIn("billing_context", self.requests[0])

    async def test_unicode_existing_project_id_is_not_rejected(self):
        repository = mock.Mock()
        repository.read.return_value = {"name": "中文项目", "cards": []}
        original_get = self.application.get
        with mock.patch.object(self.application, "get") as get:
            get.side_effect = lambda key, default=None: repository if key == "project_repository" else original_get(key, default)
            with mock.patch.object(chat_api, "require_project", new=mock.AsyncMock(return_value={})) as authorize:
                response = await self.post(billing_context={"scene": "chat", "project_id": "画布项目-123"})
                self.assertEqual(response.status, 200)
                self.assertEqual(authorize.await_args.args[1], "画布项目-123")
        receipt = await self.receipt()
        self.assertEqual(receipt["project_id"], "画布项目-123")
        self.assertEqual(receipt["project_name"], "中文项目")

    async def test_stream_json_contract_error_keeps_billing_evidence(self):
        self.payload = {"choices": [{"message": {"content": "not-sse"}}], "cost": "0.22", "currency": "CNY"}
        response = await self.post(stream=True)
        self.assertEqual(response.status, 502)
        receipt = await self.receipt()
        self.assertEqual(receipt["status"], "error")
        self.assertEqual(receipt["provider_billing"]["amount"], "0.22")

    async def test_ledger_failure_does_not_turn_done_sse_into_error(self):
        self.frames = [b'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n', b'data: [DONE]\n\n']
        with mock.patch.object(self.ledger, "record_provider_api", side_effect=RuntimeError("secret")) as record:
            with self.assertLogs("server.chat_api", level="ERROR") as logs:
                response = await self.post(stream=True)
                text = await response.text()
                # 等待处理器 finally 完成，不以 SSE 完成标记判断写账成功。
                await self.client.close()
            self.assertEqual(record.call_count, 1)
        self.assertIn("[DONE]", text)
        self.assertNotIn("event: error", text)
        self.assertNotIn("secret", str(logs.output))

    def sqlite_ledger(self):
        from server.costs import CostLedger
        pricing = self.root / "test-pricing.json"
        pricing.write_text(json.dumps({"version": "local-test", "currency": "CNY"}))
        ledger = CostLedger(self.root / "test-costs.sqlite3", pricing)
        self.addCleanup(ledger.close)
        return ledger

    async def test_real_sqlite_chat_contract_and_unknown_amount(self):
        ledger = self.sqlite_ledger()
        original_get = self.application.get
        with mock.patch.object(self.application, "get") as get:
            get.side_effect = lambda key, default=None: ledger if key == "costs" else original_get(key, default)
            self.payload = {"choices": [{"message": {"content": "ok"}}], "cost": "0.1234567890123456789",
                            "currency": "CNY", "model": "actual-chat", "usage": {"prompt_tokens": 5}}
            response = await self.post()
            self.assertEqual(response.status, 200)
            self.payload = {"choices": [{"message": {"content": "unknown"}}]}
            response = await self.post()
            self.assertEqual(response.status, 200)
        rows = [dict(row) for row in ledger.db.execute("SELECT * FROM cost_events ORDER BY created_at")]
        self.assertEqual(len(rows), 2)
        self.assertEqual([row["event_kind"] for row in rows], ["api", "api"])
        self.assertEqual(rows[0]["cost_source"], "actual")
        dims = json.loads(rows[0]["dimensions_json"])
        self.assertEqual(dims["provider_billing"]["amount"], "0.1234567890123456789")
        self.assertEqual(dims["model"], "actual-chat")
        self.assertEqual(dims["model_source"], "response")
        self.assertEqual(rows[1]["cost_source"], "unknown")
        self.assertIsNone(rows[1]["total_cost_micros"])
        users = list(ledger.db.execute("SELECT user_id FROM cost_attributions"))
        self.assertEqual([row["user_id"] for row in users], ["authenticated-user"] * 2)

    async def test_real_sqlite_lighting_is_one_image_api_event_not_gpu(self):
        self.ledger = self.sqlite_ledger()
        self.payload = {"data": [{"b64_json": "invalid"}], "cost": "0.2", "currency": "CNY",
                        "model": "actual-lighting"}
        service, _ = self.image_service(lighting=True)
        job = await self.submit_image(service, lighting=True)
        rows = [dict(row) for row in self.ledger.db.execute("SELECT * FROM cost_events")]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["job_id"], job["id"])
        self.assertEqual(rows[0]["event_kind"], "image_api")
        self.assertEqual(rows[0]["status"], "error")
        self.assertEqual(rows[0]["cost_source"], "actual")
        self.assertEqual(rows[0]["total_cost_micros"], 200000)
        self.assertEqual(rows[0]["compute_cost_micros"], 0)
        self.assertEqual(rows[0]["electricity_cost_micros"], 0)
        self.assertEqual(json.loads(rows[0]["dimensions_json"])["model_source"], "response")
        attribution = self.ledger.db.execute("SELECT user_id FROM cost_attributions").fetchone()
        self.assertEqual(attribution["user_id"], "authenticated-user")
        self.assertEqual(len(self.requests), 1)

    async def test_stream_accepts_metadata_only_final_frame_without_losing_tokens(self):
        self.frames = [b'data: {"choices":[{"delta":{"content":"ok"}}],"usage":{"prompt_tokens":10,"completion_tokens":2}}\n\n',
                       b'data: {"usage":{"cost":"0.05","currency":"CNY"}}\n\n',
                       b'data: [DONE]\n\n']
        response = await self.post(stream=True)
        text = await response.text()
        self.assertIn("[DONE]", text)
        self.assertNotIn("event: error", text)
        receipt = await self.receipt()
        self.assertEqual(receipt["usage"]["input_tokens"], 10)
        self.assertEqual(receipt["usage"]["output_tokens"], 2)
        self.assertEqual(receipt["provider_billing"]["amount"], "0.05")

    def image_service(self, lighting=False):
        jobs = {}
        snapshots = []

        async def store(app, method, *args, **kwargs):
            return "operate" if method == "project_permission" else None

        async def resource(app, method, *args, **kwargs):
            return {"resource_id": "resource"} if method == "lookup" else True

        application = {"session": self.session, "costs": self.ledger,
                       "project_locks": {"project-1": asyncio.Lock()}}
        service = (CloudLighting if lighting else CloudGeneration)(
            application, root=self.root, comfy_http="http://unused.invalid", jobs=jobs,
            save_jobs=lambda: snapshots.append(copy.deepcopy(jobs)), require_project=mock.AsyncMock(),
            require_resource=mock.AsyncMock(), require_user=lambda request: self.user,
            resource_call=resource, call_store=store)
        self.addAsyncCleanup(service.close)
        return service, snapshots

    async def submit_image(self, service, lighting=False, provider="gpt_image"):
        body = {"project": "project-1", "card": "card-1", "params": {"prompt": "private prompt"}, "assets": {}}
        cap = {"id": "gpt_image_api_t2i", "name": "测试图片"}
        if lighting:
            body["assets"] = {"images[0]": "chouka/source.png"}
            body["params"]["image_provider"] = provider
            cap["id"] = "lighting"
            service.source = mock.AsyncMock(return_value=(png(), ("upload", "source.png"), cloud_images.inspect_image(png())))
        submitted = await service.submit(None, body, cap)
        tasks = list(service.tasks.values())
        await asyncio.wait_for(asyncio.gather(*tasks), 5)
        return service.jobs[submitted["id"]]

    async def test_image_cancel_unknown_is_not_zero_and_never_retries(self):
        self.response_gate = asyncio.Event()
        service, _ = self.image_service()
        submitted = await service.submit(None, {"project": "project-1", "params": {"prompt": "hi"}, "assets": {}},
                                         {"id": "gpt_image_api_t2i", "name": "取消测试"})
        task = service.tasks[submitted["id"]]
        try:
            await asyncio.wait_for(self.gateway_received.wait(), 2)
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task
        finally:
            self.response_gate.set()
        job = service.jobs[submitted["id"]]
        self.assertEqual(job["status"], "error")
        self.assertTrue(job["generation_unknown"])
        self.assertFalse(job["retryable"])
        self.assertIsNone(job.get("provider_billing"))
        self.assertEqual(len(self.ledger.images), 1)
        self.assertEqual(len(self.requests), 1)

    async def test_image_decode_failure_captures_total_cost_before_processing(self):
        self.payload = {"data": [{"b64_json": "invalid"}], "model": "actual-image", "cost": "0.12",
                        "currency": "USD", "usage": {"input_tokens": 20}, "api_key": "test-private-key"}
        service, snapshots = self.image_service()
        job = await self.submit_image(service)
        self.assertEqual(job["status"], "error")
        self.assertEqual(job["modelName"], "actual-image")
        self.assertEqual(job["model_source"], "response")
        self.assertEqual(job["provider_billing"]["amount"], "0.12")
        self.assertEqual(job["user_id"], "authenticated-user")
        self.assertEqual(job["submitter_id"], "authenticated-user")
        self.assertEqual(self.ledger.bindings, [(job["id"], "authenticated-user")])
        self.assertEqual(len(self.ledger.images), 1)
        self.assertEqual(len(self.requests), 1)
        self.assertTrue(any(row.get("provider_billing") and row["status"] == "running" for row in self.ledger.image_calls))
        self.assertNotIn("test-private-key", str(job))
        self.assertTrue(any(snapshot.get(job["id"], {}).get("provider_billing") for snapshot in snapshots))

    async def test_all_selected_gpt_models_preserve_charge_before_decode_failure(self):
        self.payload = {"data": [{"b64_json": "invalid"}], "cost": "0.125000000000001",
                        "currency": "CNY", "usage": {"input_tokens": 3}}
        for capability, expected_model in GPT_IMAGE_MODELS.items():
            with self.subTest(capability=capability):
                service, _ = self.image_service()
                editing = capability.endswith("i2i")
                body = {"project": "project-1", "params": {"prompt": "模型与费用合流回归",
                        "image_clarity": "480P", "image_ratio": "1:1"}, "assets": {}}
                if editing:
                    body["assets"] = {"images[0]": "chouka/source.png"}
                    service.source = mock.AsyncMock(return_value=(
                        png(), ("upload", "source.png"), cloud_images.inspect_image(png())))
                submitted = await service.submit(None, body, {"id": capability, "name": capability})
                await asyncio.wait_for(asyncio.gather(*list(service.tasks.values())), 5)
                job = service.jobs[submitted["id"]]
                self.assertEqual(job["status"], "error")
                self.assertEqual(job["modelName"], expected_model)
                self.assertEqual(job["model_source"], "config")
                self.assertEqual(job["provider_billing"]["amount"], "0.125000000000001")
                self.assertEqual(job["usage"]["input_tokens"], 3)
                self.assertEqual(self.ledger.images[job["id"]]["modelName"], expected_model)
                self.assertTrue(any(row["id"] == job["id"] and row.get("provider_billing")
                                    and row["status"] == "running" for row in self.ledger.image_calls))
        self.assertEqual(len(self.requests), 6)
        self.assertEqual(len(self.ledger.images), 6)

    async def test_image_download_failure_does_not_lose_billing(self):
        self.payload = {"data": [{"url": str(self.upstream.make_url("/result"))}],
                        "cost": "0.25000", "currency": "CNY"}
        self.download_status = 500
        service, _ = self.image_service()
        job = await self.submit_image(service)
        self.assertEqual(job["status"], "error")
        self.assertTrue(job["generation_unknown"])
        self.assertEqual(job["provider_billing"]["amount"], "0.25000")
        self.assertEqual(self.ledger.images[job["id"]]["provider_billing"], job["provider_billing"])
        self.assertEqual(len(self.requests), 1)

    async def test_task_snapshot_write_failure_does_not_block_billing_capture(self):
        service, _ = self.image_service()
        job = {"id": "snapshot-failure", "status": "running"}
        metadata = {"model": "actual-image", "model_source": "response",
                    "provider_billing": {"amount": "0.4", "currency": "CNY", "field": "cost"},
                    "usage": {"input_tokens": 2, "output_tokens": None, "cached_tokens": None, "reasoning_tokens": None}}
        with mock.patch.object(service, "save_jobs", side_effect=OSError("snapshot")):
            with self.assertRaises(OSError):
                await service.capture_metadata(job, metadata)
        self.assertEqual(self.ledger.images[job["id"]]["provider_billing"]["amount"], "0.4")
        self.assertEqual(self.requests, [])

    async def test_image_postprocess_failure_still_has_cost_once(self):
        self.payload = {"data": [{"b64_json": base64.b64encode(png()).decode()}], "cost": "0", "currency": "USD"}
        service, _ = self.image_service()
        with mock.patch("server.cloud_generation.resize_image", side_effect=ValueError("postprocess")):
            job = await self.submit_image(service)
        self.assertEqual(job["status"], "error")
        self.assertEqual(job["provider_billing"]["amount"], "0")
        self.assertEqual(len(self.ledger.images), 1)
        self.assertEqual(len(self.requests), 1)

    async def test_lighting_banana_captures_before_image_extraction_and_uses_banana_model(self):
        self.payload = {"choices": [{"message": {"content": "no image"}}],
                        "usage": {"cost": "0.05", "prompt_tokens": 100, "completion_tokens": 50}}
        service, _ = self.image_service(lighting=True)
        job = await self.submit_image(service, lighting=True, provider="banana")
        self.assertEqual(job["status"], "error")
        self.assertEqual(job["modelName"], "configured-banana")
        self.assertEqual(job["model_source"], "config")
        self.assertEqual(job["billingMode"], "paid_api")
        self.assertEqual(job["provider_billing"], {"amount": "0.05", "currency": None, "field": "usage.cost"})
        self.assertEqual(job["usage"]["input_tokens"], 100)
        self.assertEqual(job["usage"]["output_tokens"], 50)
        self.assertEqual(job["user_id"], "authenticated-user")
        self.assertEqual(len(self.ledger.images), 1)
        self.assertEqual(len(self.requests), 1)

    async def test_lighting_gpt_postprocess_failure_keeps_image_api_metadata(self):
        self.payload = {"data": [{"b64_json": base64.b64encode(png()).decode()}], "model": "actual-lighting",
                        "cost": "0.9", "currency": "CNY"}
        service, _ = self.image_service(lighting=True)
        service.authorize_all = mock.AsyncMock(side_effect=[None, web.HTTPForbidden(text="撤销权限")])
        job = await self.submit_image(service, lighting=True)
        self.assertEqual(job["status"], "error")
        self.assertEqual(job["provider_billing"]["amount"], "0.9")
        self.assertEqual(job["modelName"], "actual-lighting")
        self.assertEqual(len(self.ledger.images), 1)
        self.assertEqual(len(self.requests), 1)
