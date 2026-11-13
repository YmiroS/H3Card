"""Paid API generation contracts against isolated local HTTP gateways, not real paid models."""
import asyncio
import base64
from io import BytesIO
import json
from pathlib import Path
import shutil
import sys
import unittest
from unittest import mock

from aiohttp import web
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_cloud_lighting import CloudLightingFixture, ROOT, PASSWORD, PROMPT, LOAD_JOBS, app, png
from server import cloud_images
from server.cloud_generation import (
    CAPABILITIES, bounded_dimensions, generation_dimensions, gpt_image_dimensions, resize_image,
)
from server.image_controls import RATIOS, CLARITIES


# Independent expectations, including legacy 2.5 (not global config.model).
GPT_MODELS = {
    "gpt_image_api_t2i": "gpt-image-2.5-sunburst",
    "gpt_image_api_i2i": "gpt-image-2.5-sunburst",
    "gpt_image_api_2_t2i": "gpt-image-2",
    "gpt_image_api_2_i2i": "gpt-image-2",
    "gpt_image_api_26_t2i": "gpt-image-2.6-sunburst",
    "gpt_image_api_26_i2i": "gpt-image-2.6-sunburst",
}


class GenerationDimensionsTests(unittest.TestCase):
    def test_all_ratio_clarity_pairs_match_short_edge_controls_and_align_16(self):
        for ratio in RATIOS:
            w, h = map(int, ratio.split(":"))
            for clarity, short in CLARITIES.items():
                with self.subTest(ratio=ratio, clarity=clarity):
                    _, _, (width, height) = generation_dimensions(
                        {"image_ratio": ratio, "image_clarity": clarity}, False)
                    self.assertEqual(width % 16, 0)
                    self.assertEqual(height % 16, 0)
                    self.assertLessEqual(width * height, cloud_images.MAX_PIXELS)
                    if short * short * max(w, h) / min(w, h) <= cloud_images.MAX_PIXELS:
                        self.assertLessEqual(abs(min(width, height) - short), 8)
                    else:
                        self.assertLess(min(width, height), short)
                    self.assertLess(abs(width / height - w / h), .04)

    def test_original_and_extreme_aspect_ratios_respect_pixel_limit(self):
        for w, h in ((1001, 751), (751, 1001), (1, 32000000), (32000000, 1)):
            for clarity in CLARITIES:
                with self.subTest(source=(w, h), clarity=clarity):
                    _, _, size = generation_dimensions(
                        {"image_ratio": "original", "image_clarity": clarity}, True,
                        {"width": w, "height": h})
                    self.assertTrue(all(side >= 16 and side % 16 == 0 for side in size))
                    self.assertLessEqual(size[0] * size[1], cloud_images.MAX_PIXELS)

    def test_4k_square_preserves_short_edge_and_extreme_ratios_are_bounded(self):
        self.assertEqual(generation_dimensions({"image_ratio": "1:1", "image_clarity": "4K"}, False)[2],
                         (4096, 4096))
        for ratio in ("21:9", "9:21", "2:1", "1:2"):
            size = generation_dimensions({"image_ratio": ratio, "image_clarity": "4K"}, False)[2]
            self.assertLess(min(size), 4096)
            self.assertLessEqual(size[0] * size[1], 32_000_000)
            self.assertEqual(size, generation_dimensions(
                {"image_ratio": "original", "image_clarity": "4K"}, True,
                dict(zip(("width", "height"), map(int, ratio.split(":")))))[2])
        for source in ((4096, 7808), (4096, 7824), (4000, 8000), (4097, 4095)):
            size = generation_dimensions({"image_ratio": "original", "image_clarity": "4K"}, True,
                                         dict(zip(("width", "height"), source)))[2]
            self.assertTrue(all(side >= 16 and side % 16 == 0 for side in size))
            self.assertLessEqual(size[0] * size[1], 32_000_000)

    def test_secondary_reference_alignment_respects_pixel_limit(self):
        for w, h in ((1, 32000000), (32000000, 1), (3, 10000000), (10000000, 3), (65, 49)):
            with self.subTest(source=(w, h)):
                size = bounded_dimensions(*(max(16, side // 16 * 16) for side in (w, h)))
                self.assertTrue(all(side >= 16 and side % 16 == 0 for side in size))
                self.assertLessEqual(size[0] * size[1], cloud_images.MAX_PIXELS)
        self.assertEqual(bounded_dimensions(64, 48), (64, 48))

    def test_aligned_image_is_preserved_and_odd_image_is_resized(self):
        original = png("blue", (64, 48))
        data, info = resize_image(original, (64, 48))
        self.assertEqual(data, original)
        data, info = resize_image(png("red", (65, 49)), (64, 48))
        self.assertEqual((info["width"], info["height"]), (64, 48))
        self.assertEqual(data, png("red", (64, 48)))

    def test_gpt_output_sizes_obey_gateway_limits_for_every_ratio_and_clarity(self):
        for ratio in RATIOS:
            expected_ratio = tuple(map(int, ratio.split(":")))
            for clarity in CLARITIES:
                with self.subTest(ratio=ratio, clarity=clarity):
                    _, _, size = generation_dimensions(
                        {"image_ratio": ratio, "image_clarity": clarity}, False, provider="gpt_image")
                    width, height = size
                    self.assertTrue(all(side % 16 == 0 for side in size))
                    self.assertLessEqual(max(size), 3840)
                    self.assertGreaterEqual(width * height, 655_360)
                    self.assertLessEqual(width * height, 8_294_400)
                    self.assertLessEqual(max(size) / min(size), 3)
                    self.assertAlmostEqual(width / height, expected_ratio[0] / expected_ratio[1], delta=.04)
                    self.assertEqual(gpt_image_dimensions(*size), size)

    def test_gpt_reported_failures_are_automatically_scaled(self):
        for source, expected in (
                ((4784, 2048), (3840, 1648)), ((8624, 3696), (3840, 1648)),
                ((4096, 4096), (2880, 2880)), ((4096, 7280), (2160, 3840)),
                ((720, 720), (816, 816)), ((848, 480), (1088, 624)),
                ((3840, 2160), (3840, 2160)), ((3360, 1440), (3360, 1440))):
            with self.subTest(source=source):
                self.assertEqual(gpt_image_dimensions(*source), expected)

    def test_gpt_reference_and_extreme_sizes_stay_aligned_within_hard_limits(self):
        for source in ((1, 32000000), (32000000, 1), (3, 10000000), (10000000, 3),
                       (4096, 7808), (4097, 4095), (6336, 2688), (4000, 6000), (65, 49)):
            for minimum in (0, 655_360):
                with self.subTest(source=source, minimum=minimum):
                    size = gpt_image_dimensions(*source, minimum_pixels=minimum)
                    self.assertTrue(all(side >= 16 and side % 16 == 0 for side in size))
                    self.assertLessEqual(max(size), 3840)
                    self.assertGreaterEqual(size[0] * size[1], minimum)
                    self.assertLessEqual(size[0] * size[1], 8_294_400)
                    self.assertLessEqual(max(size) / min(size), 3)
                    self.assertEqual(gpt_image_dimensions(*size, minimum_pixels=minimum), size)
        self.assertEqual(gpt_image_dimensions(16, 16, minimum_pixels=0), (16, 16))

    def test_gpt_extreme_references_are_padded_without_cutting_or_stretching(self):
        data, info = resize_image(png("red", (320, 16)), (320, 112), pad=True)
        self.assertEqual((info["width"], info["height"]), (320, 112))
        with Image.open(BytesIO(data)) as image:
            self.assertEqual(image.getpixel((0, 0)), (0, 0, 0))
            self.assertEqual(image.getpixel((0, 56)), (255, 0, 0))
            self.assertEqual(image.getpixel((319, 56)), (255, 0, 0))
            self.assertEqual(image.getpixel((319, 111)), (0, 0, 0))


class GptManifestTests(unittest.TestCase):
    def test_models_preserve_existing_contracts_and_have_distinct_switches(self):
        cards = json.loads((ROOT / "manifests/_cards.json").read_text(encoding="utf-8"))
        image_card = next(card for card in cards if card["id"] == "card_image")
        for prefix, display, model in (
                ("gpt_image_api", "GPT Image 2.5 Sunburst", "gpt-image-2.5-sunburst"),
                ("gpt_image_api_2", "GPT Image 2", "gpt-image-2"),
                ("gpt_image_api_26", "GPT Image 2.6 Sunburst", "gpt-image-2.6-sunburst")):
            for mode, label in (("t2i", "文生图"), ("i2i", "图生图")):
                cid = f"{prefix}_{mode}"
                cap = json.loads((ROOT / f"manifests/{cid}.json").read_text(encoding="utf-8"))
                original = json.loads((ROOT / f"manifests/gpt_image_api_{mode}.json").read_text(encoding="utf-8"))
                self.assertEqual(cap, {**original, "id": cid, "modelName": model,
                                       "name": f"{display} · 付费 API {label}"})
                switch = next(item["modelSwitch"] for item in image_card["modes"] if item["name"] == label)
                self.assertEqual(switch[prefix], cid)
                self.assertEqual(CAPABILITIES[cid], ("gpt_image", mode == "i2i"))
                self.assertEqual(GPT_MODELS[cid], model)


class CloudGenerationFixture(CloudLightingFixture):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        for capability in CAPABILITIES:
            shutil.copyfile(ROOT / "manifests" / (capability + ".json"),
                            self.root / "manifests" / (capability + ".json"))
        app.load_caps()
        self.generations = []
        self.result_downloads = []
        self.update_card(cap="gpt_image_api_t2i", assets={})

    async def drain_cloud_tasks(self):
        self.gateway_release.set()
        await asyncio.wait_for(self.application["cloud_generation"].close(), 10)
        await super().drain_cloud_tasks()

    async def unexpected_request(self, request):
        if request.path == "/result.png" and request.method == "GET":
            self.result_downloads.append(dict(request.headers))
            return web.Response(body=png("blue", self.result_size), content_type="image/png")
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
        self.assertEqual(sent["body"]["model"], "gpt-image-2.5-sunburst")
        self.assertEqual(sent["body"]["n"], 1)
        self.assertEqual(sent["body"]["output_compression"], 100)
        self.assertEqual((sent["name"], sent["phone"]), ("lighting-owner", "13800138000"))
        self.assertEqual(self.received, [])
        self.assertEqual(self.chat_received, [])
        output = done["outputs"][0]
        response = await self.client.get(output["url"])
        self.assertEqual(response.status, 200)
        self.assertEqual(await response.read(), png("blue", (720, 960)))
        self.assertEqual((output["width"], output["height"]), (720, 960))
        self.assertEqual(done["provider_size"], "4x3")
        self.assertTrue(done["output_resized"])
        self.assertEqual(sent["body"]["quality"], "high")
        self.assertEqual(await self.indexed_assets(submitted), [])
        self.client.session.cookie_jar.clear()
        self.assertEqual((await self.client.get(output["url"])).status, 401)
        self.assertNotIn("13800138000", json.dumps(done))
        self.assertNotIn("fake-lighting-secret", json.dumps(done))

    async def test_all_gpt_prompt_limits_and_reference_bounds_apply_before_network(self):
        for capability in GPT_MODELS:
            editing = capability.endswith("i2i")
            assets = {"images[0]": self.upstream["ref"]} if editing else {}
            limit = 20000 if editing else 32000
            with self.subTest(capability=capability):
                response = await self.generate(capability=capability, assets=assets, dry_run=True,
                                               params={"prompt": "文" * limit, "image_clarity": "4K"})
                self.assertEqual(response.status, 200, await response.text())
                response = await self.generate(capability=capability, assets=assets, dry_run=True,
                                               params={"prompt": "文" * (limit + 1)})
                self.assertEqual(response.status, 400, await response.text())
                if editing:
                    for invalid in ({}, {"images[1]": self.upstream["ref"]},
                                    {f"images[{i}]": self.upstream["ref"] for i in range(9)}):
                        response = await self.generate(capability=capability, assets=invalid, dry_run=True)
                        self.assertEqual(response.status, 400, await response.text())
                    response = await self.generate(capability=capability, dry_run=True,
                        assets={f"images[{i}]": self.upstream["ref"] for i in range(8)})
                    self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(self.generations, [])
        self.assert_no_submission()

    async def test_selected_model_survives_config_change_before_execution(self):
        runner = self.application["cloud_generation"]
        authorize = runner.authorize_all
        release = asyncio.Event()

        async def gated_authorize(*args):
            await release.wait()
            await authorize(*args)

        with mock.patch.object(runner, "authorize_all", side_effect=gated_authorize):
            response = await self.generate(capability="gpt_image_api_26_t2i")
            self.assertEqual(response.status, 200, await response.text())
            submitted = await response.json()
            self.assertEqual(submitted["modelName"], "gpt-image-2.6-sunburst")
            config = json.loads(self.config.read_text(encoding="utf-8"))
            self.config.write_text(json.dumps({**config, "model": "changed-admin-default"}), encoding="utf-8")
            release.set()
            done = await self.finish_job(submitted)
        self.assertEqual(done["status"], "done")
        self.assertEqual(done["modelName"], "gpt-image-2.6-sunburst")
        self.assertEqual(self.generations[0]["body"]["model"], "gpt-image-2.6-sunburst")

    async def test_gpt_32000_prompt_reaches_gateway_and_is_preserved_in_job(self):
        prompt = "文" * 32000
        submitted, done = await self.complete(params={"prompt": prompt})
        self.assertEqual(done["status"], "done")
        self.assertEqual(self.generations[0]["body"]["prompt"], prompt)
        self.assertEqual(done["prompts"][0]["text"], prompt)
        self.assertEqual(submitted["prompts"][0]["text"], prompt)
        self.assertEqual(len(self.generations), 1)
        self.assertEqual(self.generations[0]["body"]["output_compression"], 100)

    async def test_gpt_url_result_downloads_once_and_publishes_protected_artifact(self):
        self.result_payload = {"data": [{"url": str(self.remote.make_url("/result.png?signature=secret-token"))}]}
        submitted, done = await self.complete()
        self.assertEqual(done["status"], "done")
        self.assertEqual(done["request_id"], "generation-id")
        self.assertFalse(done["retryable"])
        self.assertEqual(len(done["outputs"]), 1)
        self.assertEqual(len(self.generations), 1)
        self.assertEqual(len(self.result_downloads), 1)
        for name in ("Authorization", "Cookie", "X-End-User-Name", "X-End-User-Phone"):
            self.assertNotIn(name, self.result_downloads[0])
        self.assertNotIn("secret-token", json.dumps(done))
        self.assertNotIn("result_url", done)
        response = await self.client.get(done["outputs"][0]["url"])
        self.assertEqual(response.status, 200)
        self.assertEqual(await response.read(), png("blue", (720, 960)))
        self.client.session.cookie_jar.clear()
        self.assertEqual((await self.client.get(done["outputs"][0]["url"])).status, 401)

    async def test_gemini_text_to_image_does_not_send_image_or_fake_size(self):
        _, done = await self.complete(capability="banana_api_t2i")
        self.assertEqual(done["status"], "done")
        self.assertEqual(done["modelName"], "fake-banana-model")
        self.assertEqual(done["billingMode"], "paid_api")
        self.assertEqual(done["requested_size"], "720x960")
        self.assertEqual((done["outputs"][0]["width"], done["outputs"][0]["height"]), (720, 960))
        self.assertEqual(len(self.chat_received), 1)
        body = self.chat_received[0]["body"]
        content = body["messages"][0]["content"]
        self.assertEqual(len(content), 1)
        self.assertEqual(content[0]["type"], "text")
        self.assertTrue(content[0]["text"].startswith(PROMPT))
        self.assertIn("宽 720 像素、高 960 像素", content[0]["text"])
        self.assertNotIn("size", body)
        self.assertEqual(self.generations, [])
        self.assertEqual(self.received, [])

    async def test_gpt_reference_images_preserve_slot_order_and_quality(self):
        second = self.add_upload("second.png", png("green"))
        self.update_card(cap="gpt_image_api_i2i")
        submitted, done = await self.complete(capability="gpt_image_api_i2i",
            assets={"images[2]": second["ref"], "images[0]": self.upstream["ref"]},
            params={"prompt": PROMPT, "quality": "low", "image_ratio": "original", "image_clarity": "720P"})
        self.assertEqual(done["status"], "done")
        self.assertEqual(len(self.received), 1)
        self.assertEqual(self.received[0]["images"], [png("red", (960, 720)), png("green", (16, 16))])
        self.assertEqual(submitted["input_sizes"], ["960x720", "16x16"])
        self.assertEqual(self.received[0]["fields"]["quality"], "high")
        self.assertEqual(self.received[0]["fields"]["size"], "960x720")
        self.assertEqual(submitted["input_image_count"], 2)
        self.assertEqual(len(await self.indexed_assets(submitted)), 2)
        self.assertEqual(self.generations, [])

    async def test_gpt_oversized_request_and_all_references_are_adapted_before_upload(self):
        references = [self.upstream,
                      self.add_upload("large-green.png", png("green", (4000, 6000))),
                      self.add_upload("large-yellow.png", png("yellow", (6336, 2688)))]
        submitted, done = await self.complete(capability="gpt_image_api_26_i2i",
            assets={f"images[{i}]": source["ref"] for i, source in enumerate(references)},
            params={"prompt": PROMPT, "image_ratio": "21:9", "image_clarity": "2K"})
        self.assertEqual(done["status"], "done")
        self.assertEqual(submitted["requested_size"], "3840x1648")
        self.assertEqual(submitted["input_sizes"], ["3840x1648", "2352x3520", "3840x1632"])
        sent = self.received[0]
        self.assertEqual(sent["fields"]["size"], submitted["requested_size"])
        self.assertEqual(sent["fields"]["model"], "gpt-image-2.6-sunburst")
        for data, recorded in zip(sent["images"], submitted["input_sizes"]):
            info = cloud_images.inspect_image(data)
            width, height = info["width"], info["height"]
            self.assertEqual(f"{width}x{height}", recorded)
            self.assertTrue(width % 16 == height % 16 == 0)
            self.assertLessEqual(max(width, height), 3840)
            self.assertLessEqual(width * height, 8_294_400)
        indexed = await self.indexed_assets(submitted)
        for asset, data in zip(indexed, sent["images"]):
            response = await self.client.get(asset["url"])
            self.assertEqual(await response.read(), data)
        for original, size in zip(references[1:], ((4000, 6000), (6336, 2688))):
            response = await self.client.get(original["url"])
            info = cloud_images.inspect_image(await response.read())
            self.assertEqual((info["width"], info["height"]), size)
        self.assertEqual((done["outputs"][0]["width"], done["outputs"][0]["height"]), (3840, 1648))
        self.assertEqual(len(self.received), 1)

    async def test_gpt_original_extreme_ratio_pads_main_and_reference_images(self):
        primary = self.add_upload("wide-red.png", png("red", (320, 16)))
        reference = self.add_upload("wide-green.png", png("green", (320, 16)))
        submitted, done = await self.complete(capability="gpt_image_api_26_i2i",
            assets={"images[0]": primary["ref"], "images[1]": reference["ref"]},
            params={"prompt": PROMPT, "image_ratio": "original", "image_clarity": "720P"})
        self.assertEqual(done["status"], "done")
        self.assertEqual(submitted["requested_size"], "3840x1280")
        self.assertEqual(submitted["input_sizes"], ["3840x1280", "320x112"])
        for data, color in zip(self.received[0]["images"], ((255, 0, 0), (0, 128, 0))):
            with Image.open(BytesIO(data)) as image:
                self.assertEqual(image.getpixel((0, 0)), (0, 0, 0))
                self.assertEqual(image.getpixel((0, image.height // 2)), color)
                self.assertEqual(image.getpixel((image.width - 1, image.height // 2)), color)
        self.assertEqual(len(self.received), 1)

    async def test_gpt_4k_text_request_obeys_pixel_budget_without_fake_upscale(self):
        self.result_size = (2880, 2880)
        submitted, done = await self.complete(capability="gpt_image_api_2_t2i",
            params={"prompt": PROMPT, "image_ratio": "1:1", "image_clarity": "4K"})
        self.assertEqual(submitted["requested_size"], "2880x2880")
        self.assertEqual(self.generations[0]["body"]["size"], "2880x2880")
        self.assertFalse(done["output_resized"])
        self.assertEqual((done["outputs"][0]["width"], done["outputs"][0]["height"]), (2880, 2880))
        self.assertEqual(len(self.generations), 1)

    async def test_all_gpt_models_share_safe_dry_run_sizes_without_changing_banana(self):
        for capability in (*GPT_MODELS, "banana_api_t2i", "banana_api_i2i"):
            editing = capability.endswith("i2i")
            response = await self.generate(capability=capability, dry_run=True,
                assets={"images[0]": self.upstream["ref"]} if editing else {},
                params={"prompt": PROMPT, "image_ratio": "1:1", "image_clarity": "4K"})
            self.assertEqual(response.status, 200, await response.text())
            result = await response.json()
            self.assertEqual(result["size"], "4096x4096" if capability.startswith("banana") else "2880x2880")
        self.assertEqual(self.generations, [])
        self.assert_no_submission()

    async def test_provider_original_error_and_request_id_reach_failed_job_without_retry(self):
        self.gateway_status = 400
        self.result_payload = {"error": {"message": "Invalid size '4784x2048'. The longest edge must be <= 3840.",
                                         "type": "image_generation_user_error", "param": "size", "code": "invalid_value"},
                               "api_key": "do-not-expose-this-field"}
        for capability in ("gpt_image_api_26_t2i", "gpt_image_api_26_i2i"):
            submitted, done = await self.complete(capability=capability,
                assets={"images[0]": self.upstream["ref"]} if capability.endswith("i2i") else {})
            self.assertEqual(done["status"], "error")
            for detail in ("HTTP 400", "4784x2048", "3840", "param=size", "code=invalid_value", done["request_id"]):
                self.assertIn(detail, done["error"])
            self.assertFalse(done["retryable"])
            self.assertFalse(done["generation_unknown"])
            self.assertNotIn("do-not-expose-this-field", done["error"])
            self.assertEqual(done["outputs"], [])
        self.assertEqual(len(self.generations), 1)
        self.assertEqual(len(self.received), 1)

    async def test_gemini_reference_images_keep_order(self):
        second = self.add_upload("reference.png", png("yellow"))
        _, done = await self.complete(capability="banana_api_i2i", assets={
            "images[0]": self.upstream["ref"], "images[1]": second["ref"]})
        self.assertEqual(done["status"], "done")
        parts = self.chat_received[0]["body"]["messages"][0]["content"]
        self.assertEqual(len(parts), 3)
        self.assertIn(base64.b64encode(png("red", (960, 720))).decode(), parts[1]["image_url"]["url"])
        self.assertIn(base64.b64encode(png("yellow", (16, 16))).decode(), parts[2]["image_url"]["url"])

    async def test_requested_ratio_and_clarity_are_applied_to_both_providers(self):
        for capability in ("gpt_image_api_i2i", "banana_api_i2i"):
            with self.subTest(capability=capability):
                submitted, done = await self.complete(capability=capability,
                    assets={"images[0]": self.upstream["ref"]},
                    params={"prompt": PROMPT, "image_ratio": "16:9", "image_clarity": "1080P"})
                self.assertEqual(done["status"], "done")
                self.assertEqual(submitted["requested_size"], "1920x1088")
                self.assertEqual(submitted["input_sizes"], ["1920x1088"])
                output = done["outputs"][0]
                self.assertEqual((output["width"], output["height"]), (1920, 1088))
                if capability.startswith("gpt"):
                    self.assertEqual(self.received[-1]["fields"]["size"], "1920x1088")
                    data = self.received[-1]["images"][0]
                else:
                    content = self.chat_received[-1]["body"]["messages"][0]["content"]
                    data = base64.b64decode(content[1]["image_url"]["url"].split(",", 1)[1])
                info = cloud_images.inspect_image(data)
                self.assertEqual((info["width"], info["height"]), (1920, 1088))

    async def test_odd_gateway_output_is_adapted_without_retry(self):
        self.result_size = (1001, 751)
        _, done = await self.complete(params={"prompt": PROMPT, "image_ratio": "2:3", "image_clarity": "480P"})
        self.assertEqual(done["status"], "done")
        self.assertEqual(done["provider_size"], "1001x751")
        self.assertTrue(done["output_resized"])
        response = await self.client.get(done["outputs"][0]["url"])
        info = cloud_images.inspect_image(await response.read())
        self.assertEqual((info["width"], info["height"]), (672, 992))
        self.assertEqual(len(self.generations), 1)

    async def test_matching_gateway_size_is_not_reencoded(self):
        self.result_size = (672, 992)
        _, done = await self.complete(params={"prompt": PROMPT, "image_ratio": "2:3", "image_clarity": "480P"})
        self.assertFalse(done["output_resized"])
        response = await self.client.get(done["outputs"][0]["url"])
        self.assertEqual(await response.read(), png("blue", (672, 992)))

    async def test_original_input_and_preprocessed_snapshot_are_separate(self):
        source = self.add_upload("odd-source.png", png("green", (1001, 751)))
        submitted, done = await self.complete(capability="gpt_image_api_i2i",
            assets={"images[0]": source["ref"]}, params={"prompt": PROMPT, "image_clarity": "480P"})
        self.assertEqual(done["status"], "done")
        self.assertEqual(submitted["input_sizes"], ["944x704"])
        ref = await self.application["cloud_generation"].resource_call(self.application, "reference", source["ref"])
        path = await self.application["cloud_generation"].resource_call(self.application, "local_path", *ref)
        self.assertEqual(path.read_bytes(), png("green", (1001, 751)))
        indexed = await self.indexed_assets(submitted)
        self.assertEqual(len(indexed), 1)
        self.assertNotEqual(indexed[0]["ref"], source["ref"])
        response = await self.client.get(indexed[0]["url"])
        self.assertEqual(response.status, 200)
        self.assertEqual(await response.read(), self.received[-1]["images"][0])

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
            {"params": {"prompt": " "}}, {"params": {"prompt": "x" * 32001}},
            {"capability": "banana_api_t2i", "params": {"prompt": "x" * 20001}},
            {"capability": "banana_api_i2i", "params": {"prompt": "x" * 20001}},
            {"capability": "gpt_image_api_i2i", "params": {"prompt": "x" * 20001}},
            {"params": {"prompt": PROMPT, "image_ratio": "original"}},
            {"params": {"prompt": PROMPT, "image_clarity": "8K"}},
            {"params": {"prompt": PROMPT, "image_ratio": []}},
            {"params": {"prompt": PROMPT, "image_clarity": {}}},
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
        self.assertEqual(result["size"], "720x960")
        self.assertEqual(result["quality"], "high")
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

    async def test_concurrent_gpt_models_keep_protocol_identity_jobs_and_billing_separate(self):
        submitted_jobs = []
        prompts = {}
        for capability, model in GPT_MODELS.items():
            editing = capability.endswith("i2i")
            limit = 20000 if editing else 32000
            prompt = capability + "文" * (limit - len(capability))
            prompts[capability] = prompt
            submitted = await self.start_job(capability=capability, card=None,
                assets={"images[0]": self.upstream["ref"]} if editing else {},
                # HTTP clients cannot override the trusted capability/model mapping.
                model="forged-body-model", modelName="forged-body-name",
                params={"prompt": prompt, "model": "forged-param-model", "modelName": "forged-param-name",
                        "image_clarity": "480P", "image_ratio": "1:1"})
            self.assertEqual(submitted["modelName"], model)
            self.assertEqual(submitted["capability"], capability)
            submitted_jobs.append(submitted)
        self.assertEqual(len(self.application["cloud_generation"].tasks), 6)
        self.assertEqual(len(self.generations), 3)
        self.assertEqual(len(self.received), 3)
        # All requests are simultaneously pending at the fake upstream.
        for submitted in submitted_jobs:
            done = await self.finish_job(submitted)
            self.assertEqual(done["status"], "done")
            self.assertEqual(done["modelName"], GPT_MODELS[submitted["capability"]])
            self.assertEqual(done["billingMode"], "paid_api")
        for capability, model in GPT_MODELS.items():
            if capability.endswith("i2i"):
                sent = next(item for item in self.received if item["fields"]["prompt"] == prompts[capability])
                self.assertEqual(sent["fields"]["model"], model)
                self.assertEqual(sent["fields"]["size"], "816x816")
                self.assertEqual(len(sent["images"]), 1)
                self.assertEqual((sent["end_user_name"], sent["end_user_phone"]),
                                 ("lighting-owner", "13800138000"))
            else:
                sent = next(item for item in self.generations if item["body"]["prompt"] == prompts[capability])
                self.assertEqual(sent["body"]["model"], model)
                self.assertEqual(sent["body"]["size"], "816x816")
                self.assertEqual(sent["body"]["n"], 1)
                self.assertEqual((sent["name"], sent["phone"]), ("lighting-owner", "13800138000"))
            self.assertEqual(sent["authorization"], "Bearer fake-lighting-secret")
        report = self.application["costs"].report()
        rows = {row["job_id"]: row for row in report["jobs"]}
        self.assertEqual(len(rows), 6)
        self.assertEqual(report["overview"]["gpu_hours"], 0)
        self.assertEqual(report["overview"]["unknown_cost_tasks"], 6)
        for submitted in submitted_jobs:
            row = rows[submitted["id"]]
            self.assertEqual(row["event_kind"], "image_api")
            self.assertEqual(row["capability"], submitted["capability"])
            self.assertEqual(row["dimensions"]["model"], submitted["modelName"])
            self.assertEqual(row["dimensions"]["billing_mode"], "paid_api")
            self.assertEqual(row["cost_source"], "unknown")
            self.assertEqual(row["retail_source"], "unpriced")
            db_row = dict(self.application["costs"].db.execute(
                "SELECT * FROM cost_events WHERE job_id=?", (submitted["id"],)).fetchone())
            self.assertEqual(db_row["project_id"], self.project)
            self.assertEqual(db_row["model_family"], submitted["modelName"])
            self.assertIsNone(db_row["total_cost_micros"])
            self.assertIsNone(db_row["api_cost_micros"])
        self.assertEqual(len(self.generations) + len(self.received), 6)

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
