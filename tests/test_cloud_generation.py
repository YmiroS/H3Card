"""Paid API generation contracts against isolated local HTTP gateways, not real paid models."""
import asyncio
import base64
import json
from pathlib import Path
import shutil
import sys
import unittest
from unittest import mock

from aiohttp import web

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_cloud_lighting import CloudLightingFixture, ROOT, PASSWORD, PROMPT, LOAD_JOBS, app, png
from server import cloud_images
from server.cloud_generation import CAPABILITIES


class CloudGenerationFixture(CloudLightingFixture):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        for capability in CAPABILITIES:
            shutil.copyfile(ROOT / "manifests" / (capability + ".json"),
                            self.root / "manifests" / (capability + ".json"))
        app.load_caps()
        self.generations = []
        self.update_card(cap="gpt_image_api_t2i", assets={})

    async def drain_cloud_tasks(self):
        self.gateway_release.set()
        await asyncio.wait_for(self.application["cloud_generation"].close(), 10)
        await super().drain_cloud_tasks()

    async def unexpected_request(self, request):
        if request.path != "/v1/images/generations" or request.method != "POST":
            return await super().unexpected_request(request)
        self.generations.append({"body": await request.json(),
                                 "authorization": request.headers.get("Authorization"),
                                 "name": request.headers.get("X-End-User-Name"),
                                 "phone": request.headers.get("X-End-User-Phone")})
        self.gateway_reached.set()
        await self.gateway_release.wait()
        payload = self.result_payload if self.result_payload is not None else {
            "data": [{"b64_json": base64.b64encode(png("blue", self.result_size)).decode()}]}
        return web.json_response(payload, status=self.gateway_status, headers={"X-Request-ID": "generation-id"})

    async def generate(self, **extra):
        return await super().generate(capability=extra.pop("capability", "gpt_image_api_t2i"),
                                      assets=extra.pop("assets", {}), **extra)

    async def finish_job(self, submitted):
        tasks = list(self.application["cloud_generation"].tasks.values())
        self.gateway_release.set()
        await asyncio.wait_for(asyncio.gather(*tasks), 10)
        response = await self.client.get(f"/api/job/{submitted['id']}")
        self.assertEqual(response.status, 200, await response.text())
        return await response.json()

    async def complete(self, **extra):
        response = await self.generate(**extra)
        self.assertEqual(response.status, 200, await response.text())
        submitted = await response.json()
        return submitted, await self.finish_job(submitted)


class CloudGenerationTests(CloudGenerationFixture, unittest.IsolatedAsyncioTestCase):
    async def test_gpt_text_to_image_returns_receipt_and_publishes_protected_artifact(self):
        self.headers.update({"X-End-User-Name": "forged", "X-End-User-Phone": "13900139000"})
        submitted = await self.start_job()
        self.assertEqual(submitted["billingMode"], "paid_api")
        self.assertEqual(submitted["provider"], "gpt_image")
        self.assertEqual(submitted["step"], "等待付费 API 生图")
        done = await self.finish_job(submitted)
        self.assertEqual(done["status"], "done")
        self.assertFalse(done["retryable"])
        self.assertEqual(done["request_id"], "generation-id")
        self.assertEqual(len(self.generations), 1)
        sent = self.generations[0]
        self.assertEqual(sent["body"]["prompt"], PROMPT)
        self.assertEqual(sent["body"]["model"], "fake-lighting-model")
        self.assertEqual(sent["body"]["n"], 1)
        self.assertEqual((sent["name"], sent["phone"]), ("lighting-owner", "13800138000"))
        self.assertEqual(self.received, [])
        self.assertEqual(self.chat_received, [])
        output = done["outputs"][0]
        response = await self.client.get(output["url"])
        self.assertEqual(response.status, 200)
        self.assertEqual(await response.read(), png("blue"))
        self.assertEqual(await self.indexed_assets(submitted), [])
        self.client.session.cookie_jar.clear()
        self.assertEqual((await self.client.get(output["url"])).status, 401)
        self.assertNotIn("13800138000", json.dumps(done))
        self.assertNotIn("fake-lighting-secret", json.dumps(done))

    async def test_gemini_text_to_image_does_not_send_image_or_fake_size(self):
        _, done = await self.complete(capability="banana_api_t2i")
        self.assertEqual(done["status"], "done")
        self.assertEqual(done["modelName"], "fake-banana-model")
        self.assertEqual(done["billingMode"], "paid_api")
        self.assertIsNone(done["requested_size"])
        self.assertEqual(len(self.chat_received), 1)
        body = self.chat_received[0]["body"]
        self.assertEqual(body["messages"][0]["content"], [{"type": "text", "text": PROMPT}])
        self.assertNotIn("size", body)
        self.assertEqual(self.generations, [])
        self.assertEqual(self.received, [])

    async def test_gpt_reference_images_preserve_slot_order_and_quality(self):
        second = self.add_upload("second.png", png("green"))
        self.update_card(cap="gpt_image_api_i2i")
        submitted, done = await self.complete(capability="gpt_image_api_i2i",
            assets={"images[2]": second["ref"], "images[0]": self.upstream["ref"]},
            params={"prompt": PROMPT, "quality": "high", "size": "original"})
        self.assertEqual(done["status"], "done")
        self.assertEqual(len(self.received), 1)
        self.assertEqual(self.received[0]["images"], [png("red"), png("green")])
        self.assertEqual(self.received[0]["fields"]["quality"], "high")
        self.assertEqual(self.received[0]["fields"]["size"], "4x3")
        self.assertEqual(submitted["input_image_count"], 2)
        self.assertEqual(len(await self.indexed_assets(submitted)), 2)
        self.assertEqual(self.generations, [])

    async def test_gemini_reference_images_keep_order(self):
        second = self.add_upload("reference.png", png("yellow"))
        _, done = await self.complete(capability="banana_api_i2i", assets={
            "images[0]": self.upstream["ref"], "images[1]": second["ref"]})
        self.assertEqual(done["status"], "done")
        parts = self.chat_received[0]["body"]["messages"][0]["content"]
        self.assertEqual(len(parts), 3)
        self.assertIn(base64.b64encode(png("red")).decode(), parts[1]["image_url"]["url"])
        self.assertIn(base64.b64encode(png("yellow")).decode(), parts[2]["image_url"]["url"])

    async def test_eight_reference_images_are_accepted_but_ninth_slot_is_rejected(self):
        assets = {f"images[{index}]": self.upstream["ref"] for index in range(8)}
        _, done = await self.complete(capability="gpt_image_api_i2i", assets=assets)
        self.assertEqual(done["status"], "done")
        self.assertEqual(len(self.received[0]["images"]), 8)
        response = await self.generate(capability="gpt_image_api_i2i",
                                       assets={**assets, "images[8]": self.upstream["ref"]})
        self.assertEqual(response.status, 400, await response.text())
        self.assertEqual(len(self.received), 1)

    async def test_invalid_prompt_images_and_gpt_settings_fail_before_paid_request(self):
        cases = [
            {"params": {"prompt": " "}}, {"params": {"prompt": "x" * 20001}},
            {"params": {"prompt": PROMPT, "size": "original"}},
            {"params": {"prompt": PROMPT, "quality": "auto"}},
            {"assets": {"images[0]": self.upstream["ref"]}},
            {"capability": "banana_api_i2i", "assets": {}},
            {"capability": "gpt_image_api_i2i", "assets": {"images[1]": self.upstream["ref"]}},
        ]
        for case in cases:
            with self.subTest(case=case):
                response = await self.generate(**case)
                self.assertEqual(response.status, 400, await response.text())
        self.assertEqual(self.generations, [])
        self.assert_no_submission()

    async def test_dry_run_validates_without_gateway_or_job(self):
        response = await self.generate(dry_run=True)
        self.assertEqual(response.status, 200, await response.text())
        result = await response.json()
        self.assertTrue(result["dry_run"])
        self.assertEqual(result["billingMode"], "paid_api")
        self.assertEqual(result["size"], "1024x1024")
        self.assertEqual(self.generations, [])
        self.assert_no_submission()

    async def test_missing_configuration_does_not_create_or_submit_paid_job(self):
        self.config.write_text('{"api_key":""}', encoding="utf-8")
        response = await self.generate()
        self.assertEqual(response.status, 503, await response.text())
        self.assertEqual(self.generations, [])
        self.assert_no_submission()

    async def test_duplicate_and_cancel_are_blocked_while_paid_request_is_running(self):
        submitted = await self.start_job()
        self.assertEqual((await self.generate()).status, 409)
        with self.assertRaises(web.HTTPConflict):
            await app.stop_job(self.application, submitted["id"])
        done = await self.finish_job(submitted)
        self.assertEqual(done["status"], "done")
        self.assertEqual(len(self.generations), 1)

    async def test_http_error_and_url_result_never_retry_or_download(self):
        for status, payload in ((429, {"error": "private fake-lighting-secret"}),
                                (200, {"data": [{"url": "http://127.0.0.1/private.png"}]})):
            self.gateway_status, self.result_payload = status, payload
            _, done = await self.complete()
            self.assertEqual(done["status"], "error")
            self.assertFalse(done["retryable"])
            self.assertEqual(done["outputs"], [])
            self.assertNotIn("fake-lighting-secret", done["error"])
        self.assertEqual(len(self.generations), 2)
        self.assertEqual(self.unexpected_requests, [])

    async def test_timeout_preserves_unknown_state_without_retry(self):
        with mock.patch.object(cloud_images, "generate", side_effect=cloud_images.ImageEditError(
                "请求未完成", generation_unknown=True, request_id="timeout-id", status=504)) as generate:
            _, done = await self.complete()
        generate.assert_called_once()
        self.assertTrue(done["generation_unknown"])
        self.assertFalse(done["retryable"])
        self.assertEqual(done["request_id"], "timeout-id")

    async def test_shutdown_marks_running_paid_request_unknown_without_retry(self):
        submitted = await self.start_job()
        await self.application["cloud_generation"].close()
        job = app.JOBS[submitted["id"]]
        self.assertEqual(job["status"], "error")
        self.assertTrue(job["generation_unknown"])
        self.assertFalse(job["retryable"])
        self.assertEqual(job["outputs"], [])
        self.assertEqual(len(self.generations), 1)

    async def test_restart_preserves_paid_identity_and_never_resubmits(self):
        submitted = await self.start_job()
        app.JOBS_FILE.parent.mkdir(parents=True, exist_ok=True)
        app.JOBS_FILE.write_text(json.dumps([app.JOBS[submitted["id"]]]), encoding="utf-8")
        await self.application["cloud_generation"].close()
        with mock.patch.object(app, "JOBS", {}):
            LOAD_JOBS()
            restored = app.JOBS[submitted["id"]]
            self.assertEqual(restored["status"], "error")
            self.assertTrue(restored["generation_unknown"])
            self.assertFalse(restored["retryable"])
            self.assertEqual(restored["billingMode"], "paid_api")
            self.assertEqual(restored["provider"], "gpt_image")
        self.assertEqual(len(self.generations), 1)

    async def test_project_deleted_during_text_generation_never_publishes_result(self):
        submitted = await self.start_job()
        response = await self.client.delete(f"/api/projects/{self.project}", headers=self.headers)
        self.assertEqual(response.status, 200, await response.text())
        self.gateway_release.set()
        await asyncio.gather(*list(self.application["cloud_generation"].tasks.values()))
        job = app.JOBS[submitted["id"]]
        self.assertEqual(job["status"], "error")
        self.assertEqual(job["outputs"], [])
        self.assertEqual(list((self.root / "data").glob("artifacts/*/*")), [])
        self.assertEqual(len(self.generations), 1)

    async def test_private_reference_and_read_only_project_are_rejected(self):
        owner = self.store.create_user("private-owner", PASSWORD)["id"]
        self.store.create_project("private", owner)
        source = self.add_upload("private.png", png("black"), project="private")
        response = await self.generate(capability="banana_api_i2i", assets={"images[0]": source["ref"]})
        self.assertEqual(response.status, 404, await response.text())
        self.store.set_grant(self.user, owner, "read")
        response = await self.generate(project="private")
        self.assertEqual(response.status, 403, await response.text())
        self.assertEqual(self.generations, [])
        self.assert_no_submission()

    async def test_api_modes_survive_missing_local_graphs(self):
        self.assertTrue(app.mode_ok({"id": "missing_local", "modelSwitch": {"banana_api": "banana_api_t2i"}}))
        self.assertFalse(app.mode_ok({"id": "missing_local", "modelSwitch": {"local": "also_missing"}}))


class CloudGenerationControllerTests(CloudGenerationFixture, unittest.IsolatedAsyncioTestCase):
    controller_mode = True

    async def test_controller_records_api_cost_separately_from_gpu(self):
        submitted = await self.start_job()
        done = await self.finish_job(submitted)
        self.assertEqual(done["status"], "done")
        report = self.application["costs"].report()
        row = next(item for item in report["jobs"] if item["job_id"] == submitted["id"])
        self.assertEqual(row["event_kind"], "image_api")
        self.assertEqual(row["category"], "image")
        self.assertEqual(report["overview"]["gpu_hours"], 0)
        self.assertEqual(report["overview"]["unknown_cost_tasks"], 1)


if __name__ == "__main__":
    unittest.main()
