import asyncio
import base64
import copy
import hashlib
from io import BytesIO
import json
import unittest
from unittest import mock

from aiohttp import web
from PIL import Image

from server import character_api, cloud_banana, cloud_chat, cloud_images
from server.character_profile import TEXT_FIELDS, age_prompt, validate_profile
from server.texture_api import source_version
import test_texture_api as texture_fixture
from test_texture_api import png


def profile(subject="single"):
    return {"view_context": {"subject": subject, "description": ""},
            **{field: "" for field in TEXT_FIELDS}, "key_summary": [], "needs_confirmation": []}


class CharacterApiTests(unittest.IsolatedAsyncioTestCase):
    # Reuse only fixture helpers, not the legacy texture tests themselves.
    add_image = texture_fixture.TextureApiTests.add_image
    saved_card = texture_fixture.TextureApiTests.saved_card
    update_card = texture_fixture.TextureApiTests.update_card
    gateway = texture_fixture.TextureApiTests.gateway
    comfy_image = texture_fixture.TextureApiTests.comfy_image

    async def asyncSetUp(self):
        self.chat_calls = []
        self.chat_headers = []
        self.analysis_content = json.dumps(profile())
        self.chat_status = 200
        await texture_fixture.TextureApiTests.asyncSetUp(self)
        self.working_bytes = png("green", (320, 240))
        self.working = self.add_image("working.png", self.working_bytes)
        self.snapshot = json.loads(source_version(self.saved_card()))
        self.digest = hashlib.sha256(self.working_bytes).hexdigest()

    async def chat_gateway(self, request):
        body = await request.json()
        self.chat_calls.append(body)
        self.chat_headers.append((request.headers.get("X-End-User-Name"), request.headers.get("X-End-User-Phone")))
        self.gateway_reached.set()
        if self.wait_at_gateway:
            await self.gateway_release.wait()
        if "modalities" in body:
            content = "data:image/png;base64," + base64.b64encode(png("blue", self.result_size)).decode()
        else:
            content = self.analysis_content
        return web.json_response({"choices": [{"message": {"content": content}}]},
                                 status=self.chat_status, headers={"X-Request-ID": "character-request-1"})

    def body(self, age=False, **changes):
        body = {"project": self.project, "card": "texture", "working_base_ref": self.working["ref"],
                "expected_source": self.snapshot}
        if age:
            body.update(profile=profile(), profile_confirmed=True, profile_source_digest=self.digest,
                        target_age=52, hair_policy="preserve", beard_policy="adapt",
                        provider="gpt_image", megapixels=0.25)
        return {**body, **changes}

    async def post(self, age=False, **changes):
        return await self.client.post("/api/character/age" if age else "/api/character/analyze",
                                      json=self.body(age, **changes), headers=self.headers)

    async def test_analysis_explicit_source_schema_model_identity_and_private_no_writes(self):
        before = self.saved_card()
        jobs = copy.deepcopy(self.application.get("jobs", {}))
        self.headers.update({"X-End-User-Name": "forged", "X-End-User-Phone": "forged"})
        response = await self.post()
        self.assertEqual(response.status, 200, await response.text())
        result = await response.json()
        self.assertEqual(result, {"profile": profile(), "source_digest": self.digest,
                                  "request_id": "character-request-1", "model": "gpt-6.1-sol"})
        call = self.chat_calls[0]
        self.assertEqual(call["model"], "gpt-6.1-sol")
        self.assertEqual(call["max_tokens"], 8000)
        self.assertFalse(call["stream"])
        self.assertEqual(call["messages"][0]["role"], "system")
        url = call["messages"][1]["content"][1]["image_url"]["url"]
        data = base64.b64decode(url.split(",")[1])
        self.assertLessEqual(len(data), character_api.MAX_ANALYSIS_IMAGE_BYTES)
        with Image.open(BytesIO(data)) as image:
            self.assertEqual(image.size, (320, 240))
            self.assertGreater(image.getpixel((0, 0))[1], 80)  # Green working base, not red card image.
        self.assertEqual(self.chat_headers, [(self.auth_user["username"], "13800138000")])
        self.assertEqual(self.saved_card(), before)
        self.assertEqual(self.application.get("jobs", {}), jobs)
        self.assertEqual(len(list((self.root / "data" / "uploads").iterdir())), 2)
        self.assertIn("private", response.headers["Cache-Control"])

    async def test_character_model_configuration_independent_of_chat_model(self):
        config = json.loads(self.config.read_text())
        self.config.write_text(json.dumps({**config, "chat_model": "unchanged-chat", "character_model": "configured-character"}))
        response = await self.post()
        self.assertEqual(response.status, 200)
        self.assertEqual((await response.json())["model"], "configured-character")
        self.assertEqual(cloud_chat.load()["chat_model"], "unchanged-chat")

    async def test_empty_character_model_never_falls_back_or_calls_gateway(self):
        config = json.loads(self.config.read_text())
        for model in (None, "", "   ", 42):
            self.config.write_text(json.dumps({**config, "character_model": model}))
            response = await self.post()
            self.assertEqual(response.status, 503, await response.text())
            self.assertFalse((await response.json())["retryable"])
        self.assertEqual(self.chat_calls, [])

    async def test_multiple_and_uncertain_analysis_return_without_age_generation(self):
        for subject in ("multiple", "uncertain", "same_character_views"):
            self.analysis_content = json.dumps(profile(subject))
            response = await self.post()
            self.assertEqual(response.status, 200)
            self.assertEqual((await response.json())["profile"]["view_context"]["subject"], subject)
        for subject in ("multiple", "uncertain"):
            response = await self.post(True, profile=profile(subject))
            self.assertEqual(response.status, 400)
        self.assertEqual(self.received, [])

    async def test_analysis_malformed_json_or_schema_never_retries(self):
        invalid = ["not json", "```json\n{}\n```", "[]", "{}",
                   json.dumps({**profile(), "extra": "bad"}),
                   json.dumps({**profile(), "styling": None}),
                   json.dumps({**profile(), "key_summary": ["x"] * 13})]
        for content in invalid:
            self.analysis_content = content
            response = await self.post()
            self.assertEqual(response.status, 502, await response.text())
            result = await response.json()
            self.assertFalse(result["retryable"])
            self.assertEqual(result["request_id"], "character-request-1")
        self.assertEqual(len(self.chat_calls), len(invalid))

    async def test_both_routes_auth_csrf_acl_locked_and_card_validation(self):
        for age in (False, True):
            endpoint = "/api/character/age" if age else "/api/character/analyze"
            response = await self.client.post(endpoint, json=self.body(age))
            self.assertEqual(response.status, 403)
            with mock.patch.dict(self.application["local_test_session"], {"user": None}):
                self.assertEqual((await self.post(age)).status, 401)
            self.assertEqual((await self.post(age, card="missing")).status, 404)
            self.assertEqual((await self.post(age, project="missing")).status, 404)
            self.update_card(cap="image_composite")
            self.assertEqual((await self.post(age)).status, 400)
            self.update_card(cap="texture_enhance")
            repository = self.application["project_repository"]
            project = repository.read(self.project)
            project["locked"] = True
            repository.write(self.project, project)
            self.assertEqual((await self.post(age)).status, 403)
            project["locked"] = False
            repository.write(self.project, project)
        self.assertEqual(self.chat_calls, [])
        self.assertEqual(self.received, [])

    async def test_both_routes_foreign_project_resource_and_read_only_denied(self):
        store = self.application["auth_store"]
        owner = store.create_user("character-owner", "Other-password-123")["id"]
        store.create_project("foreign-character", owner)
        foreign = self.add_image("foreign.png", png("black"), project="foreign-character")
        for age in (False, True):
            self.assertEqual((await self.post(age, project="foreign-character")).status, 404)
            self.assertEqual((await self.post(age, working_base_ref=foreign["ref"])).status, 404)
        store.set_grant(self.user, owner, "read")
        for age in (False, True):
            self.assertEqual((await self.post(age, project="foreign-character")).status, 403)
        self.assertEqual(self.chat_calls, [])
        self.assertEqual(self.received, [])

    async def test_both_routes_snapshot_pair_internal_registered_reference_validation(self):
        for age in (False, True):
            for ref in ("https://example.invalid/a.png", "file:///private.png", "../private.png", "", None):
                response = await self.post(age, working_base_ref=ref)
                self.assertEqual(response.status, 400, await response.text())
            self.assertEqual((await self.post(age, working_base_ref="chouka/missing.png")).status, 404)
            self.assertEqual((await self.post(age, expected_source={})).status, 400)
            changed = {**self.snapshot, "input": None}
            self.assertEqual((await self.post(age, expected_source=changed)).status, 409)
            body = self.body(age)
            del body["working_base_ref"]
            endpoint = "/api/character/age" if age else "/api/character/analyze"
            response = await self.client.post(endpoint, json=body, headers=self.headers)
            self.assertEqual(response.status, 400)
        self.assertEqual(self.chat_calls, [])
        self.assertEqual(self.received, [])

    async def test_invalid_age_structure_policy_hash_and_megapixels_never_sends(self):
        cases = [{"target_age": value} for value in (11, 101, 23.0, True, "23", None)]
        cases += [{"hair_policy": "gray"}, {"beard_policy": "grow"}, {"provider": "other"},
                  {"profile_confirmed": False}, {"profile_confirmed": 1},
                  {"profile": {}}, {"profile": {**profile(), "presentation": "x" * 4001}},
                  {"profile": {**profile(), "key_summary": ["x" * 501]}},
                  {"profile_source_digest": "bad"}, {"profile_source_digest": 1}]
        cases += [{"megapixels": value} for value in (True, "1", 0.24, 16.01, None)]
        for changes in cases:
            response = await self.post(True, **changes)
            self.assertEqual(response.status, 400, (changes, await response.text()))
        self.assertEqual((await self.post(True, profile_source_digest="0" * 64)).status, 409)
        self.assertEqual(self.chat_calls, [])
        self.assertEqual(self.received, [])

    async def test_gpt_resizes_actual_working_input_and_registers_private_child_only(self):
        before = self.saved_card()
        jobs = copy.deepcopy(self.application.get("jobs", {}))
        self.result_size = (592, 432)
        response = await self.post(True)
        self.assertEqual(response.status, 200, await response.text())
        result = await response.json()
        self.assertEqual(result["source_digest"], self.digest)
        self.assertEqual(result["request_id"], "texture-request-1")
        self.assertEqual(self.received_fields[0]["model"], "gpt-image-2.6-sunburst")
        self.assertEqual(result["model"], "gpt-image-2.6-sunburst")
        self.assertEqual(self.received_fields[0]["size"], "576x432")
        with Image.open(BytesIO(self.received[0][0])) as image:
            self.assertEqual(image.size, (576, 432))
            self.assertEqual(image.getpixel((0, 0)), (0, 128, 0))
        self.assertEqual(self.received_headers, [(self.auth_user["username"], "13800138000")])
        self.assertEqual((result["image"]["width"], result["image"]["height"]), self.result_size)
        resources = self.application["resource_access"]
        record = resources.lookup("upload", result["image"]["ref"][7:])
        parent = resources.lookup("upload", "working.png")
        self.assertEqual(record["parent_id"], parent["resource_id"])
        self.assertTrue(record["external"])
        other = self.application["auth_store"].create_user("unrelated", "Other-password-123")["id"]
        self.assertFalse(resources.authorize(other, "upload", result["image"]["ref"][7:]))
        self.assertEqual(self.saved_card(), before)
        self.assertEqual(self.application.get("jobs", {}), jobs)
        self.assertEqual((await self.client.get(result["image"]["url"])).status, 200)

    async def test_banana_uses_full_current_image_no_size_and_actual_result_dimensions(self):
        self.result_size = (304, 224)
        before = self.saved_card()
        response = await self.post(True, provider="banana", megapixels=16, profile_source_digest=None,
                                   profile=profile("same_character_views"))
        self.assertEqual(response.status, 200, await response.text())
        result = await response.json()
        call = self.chat_calls[0]
        self.assertEqual(call["model"], "gemini-3-pro-image")
        self.assertEqual(set(call), {"model", "modalities", "messages", "stream"})
        url = call["messages"][0]["content"][1]["image_url"]["url"]
        self.assertEqual(base64.b64decode(url.split(",")[1]), self.working_bytes)
        self.assertEqual(self.chat_headers, [(self.auth_user["username"], "13800138000")])
        self.assertEqual((result["image"]["width"], result["image"]["height"]), self.result_size)
        self.assertEqual(self.saved_card(), before)
        self.assertEqual(self.received, [])

    async def test_age_boundaries_and_manual_confirmation_allow_new_working_image(self):
        result = {"request_id": "mock-id", "model": "mock-model", "image_bytes": png("blue"),
                  **cloud_images.inspect_image(png("blue"))}
        with mock.patch.object(cloud_banana, "generate", new=mock.AsyncMock(return_value=result)) as generate:
            for age in (12, 15, 23, 37, 52, 67, 83, 100):
                response = await self.post(True, provider="banana", target_age=age, profile_source_digest=None)
                self.assertEqual(response.status, 200, await response.text())
                self.assertIn(f"{age} 岁", generate.call_args.args[2])
            self.assertEqual(generate.call_count, 8)

    async def test_analysis_thumbnail_never_becomes_age_source(self):
        large = png("green", (3000, 2000))
        self.add_image("working.png", large)
        response = await self.post()
        self.assertEqual(response.status, 200)
        result = await response.json()
        thumbnail = base64.b64decode(self.chat_calls[0]["messages"][1]["content"][1]["image_url"]["url"].split(",")[1])
        with Image.open(BytesIO(thumbnail)) as image:
            self.assertLessEqual(max(image.size), 2048)
        response = await self.post(True, provider="banana", profile_source_digest=result["source_digest"])
        self.assertEqual(response.status, 200)
        actual = base64.b64decode(self.chat_calls[1]["messages"][0]["content"][1]["image_url"]["url"].split(",")[1])
        self.assertEqual(actual, large)

    async def test_source_change_during_each_cloud_call_discards_result(self):
        for age, provider in ((False, None), (True, "gpt_image"), (True, "banana")):
            self.wait_at_gateway = True
            self.gateway_reached.clear()
            self.gateway_release.clear()
            self.update_card(outputs=[])
            self.snapshot = json.loads(source_version(self.saved_card()))
            pending = asyncio.create_task(self.post(age, **({"provider": provider} if provider else {})))
            try:
                await asyncio.wait_for(self.gateway_reached.wait(), 5)
                self.update_card(outputs=[self.upstream])
            finally:
                self.gateway_release.set()
            response = await asyncio.wait_for(pending, 5)
            self.assertEqual(response.status, 409, await response.text())
            self.assertFalse((await response.json())["retryable"])
        self.assertEqual(list((self.root / "data" / "uploads").glob("character_*")), [])

    async def test_permission_revoked_in_flight_is_rechecked(self):
        for age in (False, True):
            self.wait_at_gateway = True
            self.gateway_reached.clear()
            self.gateway_release.clear()
            pending = asyncio.create_task(self.post(age))
            try:
                await asyncio.wait_for(self.gateway_reached.wait(), 5)
                self.auth_user["enabled"] = False
            finally:
                self.gateway_release.set()
            response = await asyncio.wait_for(pending, 5)
            self.assertEqual(response.status, 401, await response.text())
            self.auth_user["enabled"] = True
        self.assertEqual(list((self.root / "data" / "uploads").glob("character_*")), [])

    async def test_selected_card_resource_revoked_in_flight_rejects_explicit_base(self):
        resources = self.application["resource_access"]
        selected = resources.reference(self.upstream["url"])
        authorize = resources.authorize
        for endpoint in ("analysis", "age", "texture"):
            self.wait_at_gateway = True
            self.gateway_reached.clear()
            self.gateway_release.clear()
            revoked = False

            def allowed(user, kind, locator, project_id=None):
                return not (revoked and (kind, locator) == selected) and authorize(
                    user, kind, locator, project_id=project_id)

            with mock.patch.object(resources, "authorize", side_effect=allowed):
                if endpoint == "texture":
                    self.result_size = (320, 240)
                    pending = asyncio.ensure_future(self.client.post(
                        "/api/texture/edit", json={**self.body(), "prompt": "edit"}, headers=self.headers))
                else:
                    pending = asyncio.create_task(self.post(endpoint == "age"))
                try:
                    await asyncio.wait_for(self.gateway_reached.wait(), 5)
                    revoked = True
                finally:
                    self.gateway_release.set()
                response = await asyncio.wait_for(pending, 5)
                self.assertEqual(response.status, 404, await response.text())
                if endpoint != "texture":
                    self.assertFalse((await response.json())["retryable"])
        self.assertEqual(list((self.root / "data" / "uploads").glob("character_*")), [])

    async def test_upstream_and_unknown_errors_no_retry_or_private_write(self):
        self.chat_status = 500
        self.assertEqual((await self.post()).status, 502)
        self.assertEqual(len(self.chat_calls), 1)
        self.gateway_status = 500
        response = await self.post(True)
        self.assertEqual(response.status, 502)
        self.assertFalse((await response.json())["retryable"])
        self.assertEqual(len(self.received), 1)
        with mock.patch.object(cloud_banana, "generate", side_effect=cloud_banana.BananaError(
                "unknown", status=504, generation_unknown=True)) as generate:
            response = await self.post(True, provider="banana")
            self.assertEqual(response.status, 504)
            self.assertTrue((await response.json())["generation_unknown"])
            generate.assert_called_once()
        self.assertEqual(list((self.root / "data" / "uploads").glob("character_*")), [])

    async def test_result_link_not_downloaded_and_storage_failure_cleans_preview(self):
        self.url_only = True
        self.result_url = str(self.remote.make_url("/view"))
        before = self.saved_card()
        response = await self.post(True)
        self.assertEqual(response.status, 200)
        result = await response.json()
        self.assertIsNone(result["image"])
        self.assertIn("warning", result)
        self.assertEqual(self.comfy_requests, [])
        self.url_only = False
        with mock.patch("server.texture_api.os.replace", side_effect=OSError("disk")):
            response = await self.post(True)
        self.assertEqual(response.status, 500)
        result = await response.json()
        self.assertFalse(result["retryable"])
        self.assertEqual(result["request_id"], "texture-request-1")
        self.assertEqual(self.saved_card(), before)
        self.assertEqual(list((self.root / "data" / "uploads").glob("character_*")), [])


class CharacterProfileTests(unittest.TestCase):
    def test_strict_empty_complete_schema_and_limits(self):
        self.assertEqual(validate_profile(profile()), profile())
        for field in profile():
            invalid = profile()
            del invalid[field]
            with self.assertRaises(ValueError):
                validate_profile(invalid)
        invalids = [{**profile(), "extra": ""}, {**profile(), "view_context": {"subject": "single"}},
                    {**profile(), "view_context": {"subject": "bad", "description": ""}},
                    {**profile(), "needs_confirmation": ["x"] * 13},
                    {**profile(), "key_summary": "x"}, {**profile(), "styling": None}]
        for invalid in invalids:
            with self.assertRaises(ValueError):
                validate_profile(invalid)
        maximum = {"view_context": {"subject": "single", "description": "x" * 4000},
                   **{field: "x" * 4000 for field in TEXT_FIELDS},
                   "key_summary": ["x" * 500] * 12, "needs_confirmation": ["x" * 500] * 12}
        validate_profile(maximum)
        self.assertLessEqual(len(age_prompt(maximum, 52, "preserve", "adapt")), 20000)

    def test_prompt_deterministic_stages_identity_temporary_state_and_exclusive_policies(self):
        for hair in ("preserve", "natural_gray"):
            for beard in ("adapt", "preserve", "remove"):
                prompt = age_prompt(profile(), 52, hair, beard)
                self.assertEqual(prompt, age_prompt(profile(), 52, hair, beard))
                for stage in (15, 23, 37, 52, 67, 83):
                    self.assertIn(f"{stage} 岁", prompt)
                for text in ("主要依据", "不要僵硬锁定", "头身比例", "颈部", "原表情", "衣物", "布局",
                             "原图无胡须则不添加", "低龄不得", "临时状态", "不绕过任何安全规则"):
                    self.assertIn(text, prompt)
                self.assertEqual("不因年龄变化强制变灰变白" in prompt, hair == "preserve")
                self.assertEqual("发色随目标年龄自然变化" in prompt, hair == "natural_gray")
                self.assertEqual("移除原图胡须" in prompt, beard == "remove")
                self.assertEqual("尽量保留其形状风格" in prompt, beard == "preserve")
                self.assertEqual("调整胡须密度" in prompt, beard == "adapt")

    def test_chat_thumbnail_compresses_to_configured_single_image_limit(self):
        with mock.patch.object(character_api, "MAX_ANALYSIS_IMAGE_BYTES", 1500):
            data = character_api.analysis_image(png("red", (2048, 2048)))
            self.assertLessEqual(len(data), 1500)
        for source in ((1000, 1), (1, 1000), (320, 240)):
            size = character_api.lighting_size({"width": source[0], "height": source[1]}, 0.25)
            data = character_api.generation_image(png("red", source), size)
            info = cloud_images.inspect_image(data)
            self.assertEqual(info["width"] % 16, 0)
            self.assertEqual(info["height"] % 16, 0)
            self.assertLessEqual(info["width"] * info["height"], 0.25 * 1024 * 1024)


if __name__ == "__main__":
    unittest.main()
