"""Targeted local texture graph/controller tests; all paid endpoints are mocked."""
import asyncio
import copy
import hashlib
from io import BytesIO
import json
import os
from pathlib import Path
import sys
import time
import unittest
from unittest import mock

from aiohttp import FormData, web
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import test_texture_api as fixture
from server import cloud_banana, cloud_images
from server.local_texture import CAPABILITIES, callback_url, redact
from server.texture_api import source_version

app = fixture.app
png = fixture.png


class LocalTextureTests(unittest.IsolatedAsyncioTestCase):
    # Reuse only setup/helpers, not unrelated editor tests.
    gateway = fixture.TextureApiTests.gateway
    comfy_image = fixture.TextureApiTests.comfy_image
    add_image = fixture.TextureApiTests.add_image
    saved_card = fixture.TextureApiTests.saved_card
    update_card = fixture.TextureApiTests.update_card

    async def asyncSetUp(self):
        await fixture.TextureApiTests.asyncSetUp(self)
        self.result_size = (4, 4)
        # Match the default local launcher, including the real auth middleware.
        # Only the exact ticket-authenticated callback may bypass browser CSRF.
        self.assertTrue(self.application["local_test"])
        self.api = self.application["local_texture"]
        self.enterContext(mock.patch.object(app, "save_jobs"))
        self.enterContext(mock.patch.object(app, "check_local_capability"))
        self.enterContext(mock.patch.object(app, "generation_assets", side_effect=self.assets))
        self.submit = self.enterContext(mock.patch.object(app, "local_submit", side_effect=self.capture_submit))
        self.graphs = []
        self.base = self.add_image("base.png", png("red", (4, 4)))
        self.mask = self.add_image("mask.png", png("white", (4, 4)))
        self.reference = self.add_image("reference.png", png("green", (2, 3)))
        self.update_card(assets={"images[0]": self.base}, job="old-job", outputs=[], history=[{"old": True}],
                         director_shot={"id": "shot-1"})
        self.template = {
            "1": {"class_type": "LoadImage", "inputs": {"image": ""}},
            "2": {"class_type": "LoadImageMask", "inputs": {"image": "", "channel": "red"}},
            "3": {"class_type": "LoadImage", "inputs": {"image": "optional.png"}},
            "10": {"class_type": "ChoukaLocalCrop", "inputs": {"image": ["1", 0], "mask": ["2", 0], "megapixels": 1, "feather": 16}},
            "11": {"class_type": "UNETLoader", "inputs": {"unet_name": "flux.safetensors", "weight_dtype": "default"}},
            "12": {"class_type": "CLIPLoader", "inputs": {"clip_name": "clip.safetensors", "type": "flux2", "device": "default"}},
            "13": {"class_type": "VAELoader", "inputs": {"vae_name": "vae.safetensors"}},
            "14": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["12", 0], "text": ""}},
            "15": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["14", 0]}},
            "16": {"class_type": "VAEEncode", "inputs": {"pixels": ["10", 0], "vae": ["13", 0]}},
            "17": {"class_type": "ReferenceLatent", "inputs": {"conditioning": ["14", 0], "latent": ["16", 0]}},
            "18": {"class_type": "ReferenceLatent", "inputs": {"conditioning": ["15", 0], "latent": ["16", 0]}},
            "19": {"class_type": "ImageScaleToTotalPixels", "inputs": {"image": ["3", 0], "upscale_method": "bicubic", "megapixels": 1, "resolution_steps": 32}},
            "20": {"class_type": "VAEEncode", "inputs": {"pixels": ["19", 0], "vae": ["13", 0]}},
            "21": {"class_type": "ReferenceLatent", "inputs": {"conditioning": ["17", 0], "latent": ["20", 0]}},
            "22": {"class_type": "ReferenceLatent", "inputs": {"conditioning": ["18", 0], "latent": ["20", 0]}},
            "23": {"class_type": "EmptyFlux2LatentImage", "inputs": {"width": ["10", 2], "height": ["10", 3], "batch_size": 1}},
            "24": {"class_type": "KSampler", "inputs": {"model": ["11", 0], "positive": ["21", 0], "negative": ["22", 0], "latent_image": ["23", 0], "seed": 0, "steps": 4, "cfg": 1, "sampler_name": "euler", "scheduler": "simple", "denoise": 1}},
            "25": {"class_type": "VAEDecode", "inputs": {"samples": ["24", 0], "vae": ["13", 0]}},
            "30": {"class_type": "ChoukaCloudImageEdit", "inputs": {"image": ["10", 0], "prompt": "", "provider": "gpt_image", "callback_url": "", "callback_token": "", "reference": ["3", 0]}},
            "31": {"class_type": "ChoukaCloudImageEdit", "inputs": {"image": ["10", 0], "prompt": "", "provider": "banana", "callback_url": "", "callback_token": "", "reference": ["3", 0]}},
            "80": {"class_type": "ChoukaLocalModelSwitch", "inputs": {"model": "flux", "flux_image": ["25", 0], "gpt_image": ["30", 0], "banana_image": ["31", 0]}},
            "90": {"class_type": "ChoukaLocalStitch", "inputs": {"generated": ["80", 0], "context": ["10", 1]}},
            "99": {"class_type": "ChoukaLocalSaveImage", "inputs": {"images": ["90", 0], "filename_prefix": "Chouka/local_edit"}},
        }
        self.graph_path = self.root / "texture_local_edit.api.json"
        self.graph_path.write_text(json.dumps(self.template), encoding="utf-8")
        self.caps = {}
        for cid in CAPABILITIES:
            self.caps[cid] = {"id": cid, "name": cid, "graph": self.graph_path.name, "editor_only": True,
                              "execution": "graph", "_graph_ok": True, "outputType": "image", "inputs": [
                {"key": "images[0]", "label": "底图", "type": "image", "required": True,
                 "target": {"node": "1", "input": "image"}},
                {"key": "images[1]", "label": "蒙版", "type": "image", "required": True,
                 "target": {"node": "2", "input": "image"}},
                {"key": "images[2]", "label": "参考图", "type": "image",
                 "target": {"node": "3", "input": "image"},
                 "dropIfEmpty": [{"node": "21", "input": "latent"}, {"node": "22", "input": "latent"},
                                 {"node": "30", "input": "reference"}, {"node": "31", "input": "reference"}]},
                {"key": "prompt", "label": "提示词", "type": "textarea", "target": {"node": "14", "input": "text"}},
                {"key": "megapixels", "label": "局部预算", "type": "number", "target": {"node": "10", "input": "megapixels", "vtype": "FLOAT"}},
                {"key": "feather", "label": "羽化", "type": "number", "target": {"node": "10", "input": "feather", "vtype": "FLOAT"}},
            ]}
        self.enterContext(mock.patch.dict(app.CAPS, self.caps, clear=True))
        self.body = {"project": self.project, "card": "texture", "capability": "texture_local_gpt",
                     "assets": {"images[0]": self.base["ref"], "images[1]": self.mask["ref"]},
                     "params": {"prompt": "替换局部材质", "megapixels": 1, "feather": 8},
                     "expected_source": json.loads(source_version(self.saved_card()))}

    async def assets(self, request, assets, *args, **kwargs):
        return assets

    async def capture_submit(self, application, graph, prompt_id=None, **kwargs):
        self.graphs.append(copy.deepcopy(graph))
        return prompt_id

    async def generate(self, body=None):
        return await self.client.post("/api/generate", json=self.body if body is None else body, headers=self.headers)

    async def issue(self, *, capability=None, reference=False):
        if capability:
            self.body["capability"] = capability
        if reference:
            self.body["assets"]["images[2]"] = self.reference["ref"]
        before = self.saved_card()
        response = await self.generate()
        self.assertEqual(response.status, 200, await response.text())
        result = await response.json()
        self.assertEqual(before, self.saved_card())
        node_id = "31" if self.body["capability"] == "texture_local_banana" else "30"
        token = self.graphs[-1][node_id]["inputs"]["callback_token"]
        self.assertNotIn(token, json.dumps(result))
        self.assertNotIn(token, json.dumps(app.JOBS))
        self.assertNotIn("test-secret", json.dumps(self.graphs))
        self.assertNotIn(token, repr(self.api.tickets))
        self.assertIn(hashlib.sha256(token.encode()).hexdigest(), self.api.tickets)
        return token, result

    async def callback(self, token, image=None, reference=None, extra=None):
        form = FormData()
        form.add_field("image", png("red", (4, 4)) if image is None else image,
                       filename="crop.png", content_type="image/png")
        if reference is not None:
            form.add_field("reference", reference, filename="ref.png", content_type="image/png")
        if extra:
            for key, value in extra.items():
                form.add_field(key, value)
        return await self.client.post("/agent/v1/local-edit/cloud", data=form,
                                      headers={"Authorization": "Bearer " + token})

    async def test_local_test_callback_accepts_ticket_without_browser_session(self):
        self.assertTrue(self.application["local_test"])
        token, _ = await self.issue()
        self.client.session.cookie_jar.clear()
        response = await self.callback(token)
        self.assertEqual(response.status, 200, await response.text() if response.status != 200 else "")
        self.assertEqual(response.content_type, "image/png")
        self.assertEqual(len(self.received), 1)
        self.assertTrue(self.application["local_test"])

    async def test_local_test_callback_requires_ticket_even_with_browser_csrf(self):
        self.assertTrue(self.application["local_test"])
        response = await self.client.post("/agent/v1/local-edit/cloud", headers=self.headers)
        self.assertEqual(response.status, 401, await response.text())
        response = await self.callback("invalid")
        self.assertEqual(response.status, 401)
        self.assertFalse(self.received)

    async def test_local_test_exception_does_not_open_other_agent_routes_or_methods(self):
        self.assertTrue(self.application["local_test"])
        token, _ = await self.issue()
        headers = {"Authorization": "Bearer " + token, **self.headers}
        for method, path in (("POST", "/agent/v1/register"),
                             ("POST", "/agent/v1/heartbeat"),
                             ("POST", "/agent/v1/jobs/acquire"),
                             ("GET", "/agent/v1/local-edit/cloud"),
                             ("PUT", "/agent/v1/local-edit/cloud"),
                             ("OPTIONS", "/agent/v1/local-edit/cloud"),
                             ("POST", "/agent/v1/local-edit/cloud/"),
                             ("POST", "/agent/v1/local-edit/cloud/extra"),
                             ("POST", "/agent/v1/local-edit/other")):
            with self.subTest(method=method, path=path):
                response = await self.client.request(method, path, headers=headers)
                self.assertEqual(response.status, 403, await response.text())
        self.assertFalse(self.received)
        # Rejected Worker/near-match requests must not consume the valid ticket.
        self.assertEqual((await self.callback(token)).status, 200)

    async def test_local_test_callback_retains_loopback_and_source_guards(self):
        token, _ = await self.issue()
        for headers in ({"Host": "untrusted.example"}, {"Origin": "https://untrusted.example"}):
            response = await self.client.post("/agent/v1/local-edit/cloud", headers={
                "Authorization": "Bearer " + token, **headers})
            self.assertEqual(response.status, 403, await response.text())
        self.assertFalse(self.received)
        self.assertEqual((await self.callback(token)).status, 200)

    async def test_normal_mode_callback_remains_ticket_authenticated(self):
        token, _ = await self.issue()
        # Separate regression for the ordinary agent-prefix exemption; every other
        # test retains local_test=True, including all callback safety tests.
        self.application["local_test"] = False
        self.client.session.cookie_jar.clear()
        self.assertEqual((await self.callback(token)).status, 200)
        self.assertEqual((await self.callback(token)).status, 401)
        self.assertEqual(len(self.received), 1)

    async def test_graph_ticket_private_and_card_not_written(self):
        token, result = await self.issue()
        self.assertEqual(self.submit.call_count, 1)
        inputs = self.graphs[-1]["30"]["inputs"]
        self.assertEqual(inputs["provider"], "gpt_image")
        self.assertEqual(inputs["callback_url"], f"http://127.0.0.1:{app.PORT}/agent/v1/local-edit/cloud")
        job = await (await self.client.get("/api/job/" + result["id"])).json()
        self.assertNotIn(token, json.dumps(job))
        inputs_api = await (await self.client.get("/api/job/" + result["id"] + "/inputs")).json()
        self.assertNotIn(token, json.dumps(inputs_api))

    async def test_flux_normal_graph_without_ticket(self):
        self.body["capability"] = "texture_local_flux"
        before = self.saved_card()
        with mock.patch.object(cloud_images, "load") as gpt_load, mock.patch.object(cloud_banana, "load") as banana_load:
            response = await self.generate()
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(self.saved_card(), before)
        self.assertEqual(self.api.tickets, {})
        self.assertEqual(self.graphs[-1]["80"]["inputs"]["model"], "flux")
        for node_id in ("30", "31"):
            self.assertEqual(self.graphs[-1][node_id]["inputs"]["callback_token"], "")
            self.assertEqual(self.graphs[-1][node_id]["inputs"]["callback_url"], "")
        gpt_load.assert_not_called()
        banana_load.assert_not_called()

    async def test_gpt_callback_headers_dimensions_reference_png_and_one_use(self):
        token, _ = await self.issue(reference=True)
        before = self.saved_card()
        ledger = mock.Mock()
        self.application["costs"] = ledger
        response = await self.callback(token, reference=png("green", (2, 3)))
        self.assertEqual(response.status, 200, await response.text() if response.status != 200 else "")
        self.assertEqual(response.content_type, "image/png")
        self.assertEqual(response.headers["X-Request-ID"], "texture-request-1")
        self.assertEqual(cloud_images.inspect_image(await response.read())["width"], 4)
        self.assertEqual(self.received, [[png("red", (4, 4)), png("green", (2, 3))]])
        self.assertEqual(self.received_fields[0]["size"], "4x4")
        self.assertEqual(self.received_fields[0]["prompt"], self.body["params"]["prompt"])
        self.assertEqual(self.received_headers, [(self.auth_user["username"], self.auth_user["phone"])])
        self.assertEqual(self.saved_card(), before)
        ledger.record_api.assert_called_once()
        self.assertNotIn(token, str(ledger.mock_calls))
        response = await self.callback(token)
        self.assertEqual(response.status, 401)
        self.assertEqual(len(self.received), 1)

    async def test_banana_same_ratio_different_resolution_allowed(self):
        token, _ = await self.issue(capability="texture_local_banana")
        result = {"image_bytes": png("blue", (8, 8)), "model": "banana", "request_id": "banana-id"}
        with mock.patch.object(cloud_banana, "generate", new=mock.AsyncMock(return_value=result)) as generate:
            response = await self.callback(token)
        self.assertEqual(response.status, 200)
        self.assertEqual(cloud_images.inspect_image(await response.read())["width"], 8)
        self.assertEqual(generate.await_args.kwargs["end_user_name"], self.auth_user["username"])
        self.assertEqual(generate.await_count, 1)
        self.assertEqual((await self.callback(token)).status, 401)

    async def test_invalid_expired_and_non_bearer_ticket(self):
        response = await self.callback("invalid")
        self.assertEqual(response.status, 401)
        token, _ = await self.issue()
        record = next(iter(self.api.tickets.values()))
        record["expires"] = time.time() - 1
        self.assertEqual((await self.callback(token)).status, 401)
        self.assertFalse(self.api.tickets)
        self.assertFalse(self.received)

    async def test_concurrent_callbacks_only_one_cloud_call(self):
        token, _ = await self.issue()
        self.wait_at_gateway = True
        first = asyncio.create_task(self.callback(token))
        await asyncio.wait_for(self.gateway_reached.wait(), 5)
        second = await self.callback(token)
        self.assertEqual(second.status, 401)
        self.gateway_release.set()
        self.assertEqual((await first).status, 200)
        self.assertEqual(len(self.received), 1)

    async def test_cloud_failure_not_retried_or_reusable(self):
        token, _ = await self.issue()
        self.gateway_status = 503
        response = await self.callback(token)
        self.assertEqual(response.status, 502)
        self.assertFalse((await response.json())["retryable"])
        self.assertEqual((await self.callback(token)).status, 401)
        self.assertEqual(len(self.received), 1)

    async def test_timeout_consumes_ticket_without_retry(self):
        token, _ = await self.issue()
        failure = cloud_images.ImageEditError("不要自动重试", status=504, generation_unknown=True)
        with mock.patch.object(cloud_images, "edit", new=mock.AsyncMock(side_effect=failure)) as edit:
            response = await self.callback(token)
        self.assertEqual(response.status, 504)
        self.assertFalse((await response.json())["retryable"])
        self.assertEqual(edit.await_count, 1)
        self.assertEqual((await self.callback(token)).status, 401)

    async def test_result_url_is_rejected_not_downloaded(self):
        token, _ = await self.issue()
        self.url_only = True
        response = await self.callback(token)
        self.assertEqual(response.status, 502)
        self.assertNotIn(self.result_url, await response.text())
        self.assertEqual(len(self.received), 1)
        self.assertEqual((await self.callback(token)).status, 401)

    async def test_wrong_result_dimensions_rejected_without_resize(self):
        for capability in ("texture_local_gpt", "texture_local_banana"):
            token, _ = await self.issue(capability=capability)
            result = {"image_bytes": png("blue", (8, 4)), "model": "mock", "request_id": "wrong-ratio"}
            module = cloud_images if capability.endswith("gpt") else cloud_banana
            name = "edit" if capability.endswith("gpt") else "generate"
            with mock.patch.object(module, name, new=mock.AsyncMock(return_value=result)):
                response = await self.callback(token)
            self.assertEqual(response.status, 502)
            self.assertEqual((await response.json())["request_id"], "wrong-ratio")
            self.assertEqual((await self.callback(token)).status, 401)
        token, _ = await self.issue(capability="texture_local_gpt")
        self.result_size = (8, 8)
        self.assertEqual((await self.callback(token)).status, 502)

    async def test_source_change_and_card_capability_rejected_before_cloud(self):
        for change in ({"outputs": [self.reference]}, {"cap": "other"}, {"assets": {"images[0]": self.reference}}):
            with self.subTest(change=change):
                original = self.saved_card()
                self.body["expected_source"] = json.loads(source_version(original))
                token, _ = await self.issue()
                self.update_card(**change)
                response = await self.callback(token)
                self.assertIn(response.status, (400, 409))
                self.update_card(**original)
        self.assertFalse(self.received)

    async def test_disabled_user_and_revoked_operate_permission_rejected(self):
        token, _ = await self.issue()
        store = self.application["auth_store"]
        with mock.patch.object(store, "get_user", return_value={**self.auth_user, "enabled": False}):
            self.assertEqual((await self.callback(token)).status, 403)
        with mock.patch.object(store, "project_permission", return_value="view"):
            self.assertEqual((await self.callback(token)).status, 403)
        with mock.patch.object(store, "get_user", return_value=None):
            self.assertEqual((await self.callback(token)).status, 403)
        self.assertFalse(self.received)

    async def test_source_rechecked_after_upload_validation(self):
        token, _ = await self.issue()
        original = self.api.check_ticket_context
        count = 0
        async def changed(request, record):
            nonlocal count
            count += 1
            if count == 2:
                self.update_card(outputs=[self.reference])
            await original(request, record)
        with mock.patch.object(self.api, "check_ticket_context", side_effect=changed):
            response = await self.callback(token)
        self.assertEqual(response.status, 409)
        self.assertFalse(self.received)

    async def test_callback_fields_reference_and_crop_validation(self):
        token, _ = await self.issue()
        for kwargs, status in (({"extra": {"prompt": "attacker"}}, 400),
                               ({"extra": {"provider": "banana"}}, 400),
                               ({"reference": png("green")}, 400),
                               ({"image": b"not-image"}, 422),
                               ({"image": png("red", (5, 4))}, 422),
                               ({"image": png("red", (1025, 1025))}, 422)):
            response = await self.callback(token, **kwargs)
            self.assertEqual(response.status, status, await response.text())
        self.assertFalse(self.received)
        self.assertEqual((await self.callback(token)).status, 200)

    async def test_selected_reference_cannot_be_silently_omitted(self):
        token, _ = await self.issue(reference=True)
        response = await self.callback(token)
        self.assertEqual(response.status, 400)
        self.assertFalse(self.received)
        self.assertEqual((await self.callback(token, reference=png("green", (2, 3)))).status, 200)

    async def test_callback_body_size_and_pixel_limits(self):
        token, _ = await self.issue()
        with mock.patch.object(cloud_images, "MAX_IMAGE_BYTES", 4):
            self.assertEqual((await self.callback(token)).status, 413)
        with mock.patch.object(cloud_images, "MAX_PIXELS", 15):
            self.assertEqual((await self.callback(token)).status, 422)
        self.assertFalse(self.received)

    async def test_mask_dimensions_format_binary_and_pixels(self):
        jpeg = BytesIO()
        Image.new("RGB", (4, 4), "white").save(jpeg, format="JPEG")
        for data in (png("white", (3, 4)), png("gray", (4, 4)), png("black", (4, 4)),
                     png("red", (4, 4)), jpeg.getvalue(), b"invalid"):
            mask = self.add_image("bad-mask.png", data)
            self.body["assets"]["images[1]"] = mask["ref"]
            response = await self.generate()
            self.assertEqual(response.status, 422, await response.text())
        self.submit.assert_not_called()
        self.assertFalse(self.api.tickets)

    async def test_base_pixel_limit_and_reference_validation(self):
        with mock.patch.object(cloud_images, "MAX_PIXELS", 15):
            self.assertEqual((await self.generate()).status, 422)
        ref = self.add_image("invalid-ref.png", b"invalid")
        self.body["assets"]["images[2]"] = ref["ref"]
        self.assertEqual((await self.generate()).status, 422)
        self.submit.assert_not_called()

    async def test_snapshot_and_controlled_parameters(self):
        for patch, status in (({"expected_source": {}}, 400),
                              ({"expected_source": {**self.body["expected_source"], "outputs": [self.reference]}}, 409),
                              ({"params": {"prompt": "x" * 20001}}, 400),
                              ({"params": {"prompt": " "}}, 400),
                              ({"params": {"prompt": "ok", "callback_url": "http://attacker/"}}, 400),
                              ({"params": {"prompt": "ok", "megapixels": float("inf")}}, 400),
                              ({"params": {"prompt": "ok", "megapixels": .24}}, 400),
                              ({"params": {"prompt": "ok", "megapixels": 16.01}}, 400),
                              ({"params": {"prompt": "ok", "feather": -1}}, 400),
                              ({"params": {"prompt": "ok", "feather": 129}}, 400),
                              ({"params": {"prompt": "ok", "megapixels": True}}, 400)):
            body = {**self.body, **patch}
            response = await self.generate(body)
            self.assertEqual(response.status, status, await response.text())
        self.submit.assert_not_called()

    async def test_working_base_requires_matching_snapshot(self):
        self.body["assets"]["images[0]"] = self.reference["ref"]
        body = dict(self.body)
        del body["expected_source"]
        self.assertEqual((await self.generate(body)).status, 409)
        # The 2x3 working base still needs a matching 2x3 mask.
        mask = self.add_image("working-mask.png", png("white", (2, 3)))
        self.body["assets"]["images[1]"] = mask["ref"]
        await self.issue()

    async def test_current_source_without_snapshot_and_untrusted_asset_denied(self):
        body = copy.deepcopy(self.body)
        del body["expected_source"]
        self.assertEqual((await self.generate(body)).status, 200)
        body["assets"]["images[1]"] = "https://untrusted.invalid/mask.png"
        self.assertEqual((await self.generate(body)).status, 400)

    async def test_project_locked_or_wrong_card_denied(self):
        self.update_card(cap="other")
        self.assertEqual((await self.generate()).status, 400)
        self.update_card(cap="texture_enhance")
        repository = self.application["project_repository"]
        project = repository.read(self.project)
        project["locked"] = True
        repository.write(self.project, project)
        self.assertEqual((await self.generate()).status, 403)
        self.submit.assert_not_called()

    async def test_graph_submission_failure_invalidates_ticket_and_redacts_error(self):
        async def fail(application, graph, **kwargs):
            self.graphs.append(copy.deepcopy(graph))
            raise web.HTTPBadRequest(text=graph["30"]["inputs"]["callback_token"])
        self.submit.side_effect = fail
        response = await self.generate()
        self.assertEqual(response.status, 400)
        self.assertFalse(self.api.tickets)
        token = self.graphs[-1]["30"]["inputs"]["callback_token"]
        self.assertNotIn(token, await response.text())
        self.assertNotIn(token, json.dumps(app.JOBS))
        self.assertEqual((await self.callback(token)).status, 401)
        self.assertEqual(self.submit.call_count, 1)

    async def test_dry_run_never_issues_or_returns_ticket(self):
        with mock.patch.object(cloud_images, "load") as gpt_load, mock.patch.object(cloud_banana, "load") as banana_load:
            for capability, model in (("texture_local_flux", "flux"), ("texture_local_gpt", "gpt_image"),
                                      ("texture_local_banana", "banana")):
                for reference in (False, True):
                    with self.subTest(capability=capability, reference=reference):
                        self.body["capability"] = capability
                        if reference:
                            self.body["assets"]["images[2]"] = self.reference["ref"]
                        else:
                            self.body["assets"].pop("images[2]", None)
                        response = await self.generate({**self.body, "dry_run": True})
                        self.assertEqual(response.status, 200, await response.text())
                        self.assertNotIn("lt_", await response.text())
                        changed = (await response.json())["changed"]
                        for node_id in ("14", "30", "31"):
                            field = "text" if node_id == "14" else "prompt"
                            self.assertEqual(changed[f"#{node_id}.{field}"][1], self.body["params"]["prompt"])
                        if model != "flux":
                            self.assertEqual(changed["#80.model"], ["flux", model])
                        for key in ("#21.latent", "#22.latent", "#30.reference", "#31.reference"):
                            self.assertEqual(key in changed, not reference)
                        self.assertFalse(self.api.tickets)
            gpt_load.assert_not_called()
            banana_load.assert_not_called()
        self.submit.assert_not_called()
        self.assertFalse(self.api.previews)

    async def test_each_capability_retains_full_graph_and_only_selected_cloud_ticket(self):
        for capability, model, selected in (("texture_local_flux", "flux", None),
                                             ("texture_local_gpt", "gpt_image", "30"),
                                             ("texture_local_banana", "banana", "31")):
            for reference in (False, True):
                with self.subTest(capability=capability, reference=reference):
                    self.body["capability"] = capability
                    self.body["params"]["prompt"] = "  可信编辑提示词  "
                    if reference:
                        self.body["assets"]["images[2]"] = self.reference["ref"]
                    else:
                        self.body["assets"].pop("images[2]", None)
                    previous = len(self.api.tickets)
                    with mock.patch.object(cloud_images, "load", wraps=cloud_images.load) as gpt_load, \
                            mock.patch.object(cloud_banana, "load") as banana_load:
                        response = await self.generate()
                    self.assertEqual(response.status, 200, await response.text())
                    graph = self.graphs[-1]
                    self.assertEqual(set(graph), set(self.template))
                    for node_id in self.template:
                        self.assertEqual(graph[node_id]["class_type"], self.template[node_id]["class_type"])
                    self.assertEqual(graph["80"]["inputs"], {**self.template["80"]["inputs"], "model": model})
                    self.assertEqual(graph["90"], self.template["90"])
                    self.assertEqual(graph["99"], self.template["99"])
                    for node_id in (str(n) for n in range(11, 26)):
                        expected = copy.deepcopy(self.template[node_id])
                        if node_id == "14":
                            expected["inputs"]["text"] = self.body["params"]["prompt"]
                        if node_id in ("21", "22") and not reference:
                            del expected["inputs"]["latent"]
                        self.assertEqual(graph[node_id], expected)
                    self.assertEqual(len(self.api.tickets), previous + (selected is not None))
                    self.assertEqual(gpt_load.call_count, int(selected == "30"))
                    self.assertEqual(banana_load.call_count, int(selected == "31"))
                    for node_id, provider in (("30", "gpt_image"), ("31", "banana")):
                        inputs = graph[node_id]["inputs"]
                        self.assertEqual(inputs["provider"], provider)
                        self.assertEqual(inputs["prompt"], "可信编辑提示词")
                        self.assertEqual(inputs["image"], ["10", 0])
                        self.assertEqual("reference" in inputs, reference)
                        if reference:
                            self.assertEqual(inputs["reference"], ["3", 0])
                        if node_id == selected:
                            digest = hashlib.sha256(inputs["callback_token"].encode()).hexdigest()
                            self.assertEqual(self.api.tickets[digest]["provider"], provider)
                            self.assertEqual(self.api.tickets[digest]["prompt"], "可信编辑提示词")
                        else:
                            self.assertEqual(inputs["callback_token"], "")
                            self.assertEqual(inputs["callback_url"], "")

    async def test_selector_is_from_context_not_template_or_request(self):
        graph = copy.deepcopy(self.template)
        graph["80"]["inputs"]["model"] = ["30", 0]
        self.graph_path.write_text(json.dumps(graph), encoding="utf-8")
        for capability, model in (("texture_local_flux", "flux"), ("texture_local_gpt", "gpt_image"),
                                  ("texture_local_banana", "banana")):
            self.body["capability"] = capability
            response = await self.generate()
            self.assertEqual(response.status, 200, await response.text())
            self.assertEqual(self.graphs[-1]["80"]["inputs"]["model"], model)
        for key, value in (("model", "banana"), ("provider", "gpt_image"),
                           ("selector", ["31", 0]), ("80.model", "banana"),
                           ("callback_token", "attacker"), ("flux_image", ["31", 0])):
            response = await self.generate({**self.body, "params": {"prompt": "ok", key: value}})
            self.assertEqual(response.status, 400, await response.text())
        context = {"provider": "gpt_image", "prompt": "ok", "allow_reference": True}
        graph = copy.deepcopy(self.template)
        graph["14"]["inputs"]["text"] = "ok"
        self.api.configure_graph(graph, context)
        self.api.validate_graph(graph, context)
        graph["80"]["inputs"]["model"] = "banana"
        with self.assertRaises(web.HTTPBadRequest):
            self.api.validate_graph(graph, context)
        with self.assertRaises(web.HTTPBadRequest):
            self.api.configure_graph(graph, {**context, "provider": "attacker"})

    async def test_cloud_authorization_fields_are_rejected_not_repaired(self):
        for capability in CAPABILITIES:
            self.body["capability"] = capability
            for node_id in ("30", "31"):
                for field, value in (("provider", "flux"), ("provider", "banana" if node_id == "30" else "gpt_image"),
                                     ("callback_url", "http://attacker/"), ("callback_token", "attacker"),
                                     ("api_key", "secret")):
                    with self.subTest(capability=capability, node=node_id, field=field):
                        graph = copy.deepcopy(self.template)
                        graph[node_id]["inputs"][field] = value
                        self.graph_path.write_text(json.dumps(graph), encoding="utf-8")
                        response = await self.generate({**self.body, "dry_run": True})
                        self.assertEqual(response.status, 400, await response.text())
                        context = {"provider": None, "prompt": "trusted", "allow_reference": True}
                        self.api.configure_graph(graph, context)
                        self.assertEqual(graph[node_id]["inputs"][field], value)
                        with self.assertRaises(web.HTTPBadRequest):
                            self.api.validate_graph(graph, context)
        self.assertFalse(self.api.tickets)
        self.submit.assert_not_called()

    async def test_wrong_connections_extra_outputs_and_nodes_rejected_before_dispatch(self):
        mutations = [
            ("30", "image", ["1", 0]), ("31", "image", ["10", 1]),
            ("30", "reference", ["1", 0]), ("31", "reference", ["30", 0]),
            ("80", "flux_image", ["30", 0]), ("80", "gpt_image", ["31", 0]),
            ("80", "banana_image", ["30", 0]), ("90", "generated", ["31", 0]),
            ("90", "context", ["10", 0]), ("99", "images", ["30", 0]),
            ("16", "pixels", ["31", 0]), ("10", "image", ["30", 0]),
            ("21", "latent", ["16", 0]), ("22", "latent", ["16", 0]),
            ("99", "prompt", "attacker"), ("99", "extra_pnginfo", {"ticket": "unsafe"}),
        ]
        graphs = []
        for node_id, field, value in mutations:
            graph = copy.deepcopy(self.template)
            graph[node_id]["inputs"][field] = value
            graphs.append((f"#{node_id}.{field}", graph))
        for node_id, class_type in (("30", "SaveImage"), ("31", "PreviewImage"),
                                    ("99", "SaveImage"), ("80", "ImageSwitch")):
            graph = copy.deepcopy(self.template)
            graph[node_id]["class_type"] = class_type
            graphs.append((f"#{node_id} class", graph))
        for class_type in ("SaveImage", "PreviewImage", "ChoukaCloudImageEdit", "ChoukaLocalModelSwitch", "ChoukaLocalSaveImage"):
            graph = copy.deepcopy(self.template)
            graph["100"] = {"class_type": class_type, "inputs": {"images": ["31", 0]}}
            graphs.append((f"extra {class_type}", graph))
        for node_id in ("11", "30", "31", "80", "99"):
            graph = copy.deepcopy(self.template)
            del graph[node_id]
            graphs.append((f"missing #{node_id}", graph))
        self.body["assets"]["images[2]"] = self.reference["ref"]
        for capability in CAPABILITIES:
            self.body["capability"] = capability
            for name, graph in graphs:
                with self.subTest(capability=capability, mutation=name):
                    self.graph_path.write_text(json.dumps(graph), encoding="utf-8")
                    for dry_run in (False, True):
                        response = await self.generate({**self.body, "dry_run": dry_run})
                        self.assertEqual(response.status, 400, await response.text())
        self.assertFalse(self.api.tickets)
        self.submit.assert_not_called()

    async def test_editor_only_and_graph_node_provider_contract_required(self):
        self.caps["texture_local_gpt"]["editor_only"] = False
        self.assertEqual((await self.generate()).status, 400)
        self.caps["texture_local_gpt"]["editor_only"] = True
        graph = copy.deepcopy(self.template)
        graph["30"]["inputs"]["provider"] = "banana"
        self.graph_path.write_text(json.dumps(graph), encoding="utf-8")
        self.assertEqual((await self.generate()).status, 400)
        self.submit.assert_not_called()

    async def test_bundled_manifests_patch_and_dispatch_all_caps(self):
        # Integrate the actual independently maintained graph/manifest contracts;
        # still no Comfy model execution or paid provider request.
        (self.root / "graphs").mkdir(exist_ok=True)
        for capability in CAPABILITIES:
            cap = json.loads((fixture.ROOT / "manifests" / (capability + ".json")).read_text(encoding="utf-8"))
            self.assertEqual(cap["graph"], "graphs/texture_local_edit.api.json")
            self.assertEqual(next(spec["target"] for spec in cap["inputs"] if spec["key"] == "prompt"),
                             {"node": "14", "input": "text"})
            (self.root / cap["graph"]).write_bytes((fixture.ROOT / cap["graph"]).read_bytes())
            template = json.loads((self.root / cap["graph"]).read_text(encoding="utf-8"))
            cap["_graph_ok"] = True
            app.CAPS[capability] = cap
            for reference in (False, True):
                self.body["capability"] = capability
                if reference:
                    self.body["assets"]["images[2]"] = self.reference["ref"]
                else:
                    self.body["assets"].pop("images[2]", None)
                response = await self.generate()
                self.assertEqual(response.status, 200, await response.text())
                graph = self.graphs[-1]
                self.assertEqual(graph["1"]["inputs"]["image"], self.base["ref"])
                self.assertEqual(graph["2"]["inputs"]["image"], self.mask["ref"])
                self.assertEqual(set(graph), set(template))
                self.assertEqual(graph["80"]["inputs"]["model"],
                                 {"texture_local_flux": "flux", "texture_local_gpt": "gpt_image", "texture_local_banana": "banana"}[capability])
                for node_id in ("30", "31"):
                    self.assertEqual("reference" in graph[node_id]["inputs"], reference)
                for node_id in ("21", "22"):
                    self.assertEqual("latent" in graph[node_id]["inputs"], reference)
            for megapixels in (.25, 3840 * 2160 / 1024 ** 2, 16):
                self.body["params"]["megapixels"] = megapixels
                response = await self.generate({**self.body, "dry_run": True})
                self.assertEqual(response.status, 200, await response.text())

    async def test_small_budget_uses_nodes_512_floor_and_alignment(self):
        self.body["params"]["megapixels"] = .25
        token, _ = await self.issue()
        self.result_size = (512, 512)
        response = await self.callback(token, image=png("red", (512, 512)))
        self.assertEqual(response.status, 200)
        token, _ = await self.issue()
        self.assertEqual((await self.callback(token, image=png("red", (544, 544)))).status, 422)

    async def test_callback_origin_trusted_configuration_only(self):
        with mock.patch.dict(os.environ, {"CHOUKA_AUTH_ORIGIN": "https://trusted.example"}):
            self.assertEqual(callback_url({}, controller=True, port=8199),
                             "https://trusted.example/agent/v1/local-edit/cloud")
        with mock.patch.dict(os.environ, {"CHOUKA_AUTH_ORIGIN": ""}):
            with self.assertRaises(web.HTTPServiceUnavailable):
                callback_url({}, controller=True, port=8199)
        for origin in ("https://trusted.example/path", "https://user:pass@trusted.example", "https://trusted.example?x=1", "//evil"):
            with mock.patch.dict(os.environ, {"CHOUKA_AUTH_ORIGIN": origin}):
                with self.assertRaises(web.HTTPServiceUnavailable):
                    callback_url({}, controller=True, port=8199)

    async def test_all_local_previews_recheck_source_before_job_display(self):
        for capability in CAPABILITIES:
            self.body["capability"] = capability
            response = await self.generate()
            self.assertEqual(response.status, 200)
            job = await response.json()
            app.JOBS[job["id"]].update(status="done", outputs=[self.reference])
            self.assertEqual((await self.client.get("/api/job/" + job["id"])).status, 200)
            self.update_card(outputs=[self.reference])
            response = await self.client.get("/api/job/" + job["id"])
            self.assertEqual(response.status, 409)
            listed = await (await self.client.get("/api/jobs")).json()
            invalid = next(item for item in listed["jobs"] if item["id"] == job["id"])
            self.assertEqual(invalid["outputs"], [])
            self.assertEqual(invalid["status"], "error")
            self.update_card(outputs=[])

    async def test_preview_denied_after_runtime_snapshot_loss(self):
        self.body["capability"] = "texture_local_flux"
        response = await self.generate()
        job = await response.json()
        self.api.previews.clear()
        self.assertEqual((await self.client.get("/api/job/" + job["id"])).status, 409)

    async def test_canceled_or_failed_pending_job_cannot_start_cloud_call(self):
        for status in ("canceled", "error", "done"):
            token, job = await self.issue()
            app.JOBS[job["id"]]["status"] = status
            response = await self.callback(token)
            self.assertEqual(response.status, 409)
        self.assertFalse(self.received)

    async def test_controller_callback_requires_live_execution_lease(self):
        token, _ = await self.issue()
        self.api.controller = True
        store = mock.Mock()
        store.job_execution.return_value = None
        self.application["distributed"] = store
        response = await self.callback(token)
        self.assertEqual(response.status, 409)
        self.assertFalse(self.received)
        store.job_execution.return_value = {"attempt_id": "trusted-attempt"}
        self.assertEqual((await self.callback(token)).status, 200)
        self.assertEqual(len(self.received), 1)

    async def test_cancel_after_cloud_started_does_not_claim_to_stop_payment(self):
        token, job = await self.issue()
        self.wait_at_gateway = True
        pending = asyncio.create_task(self.callback(token))
        await asyncio.wait_for(self.gateway_reached.wait(), 5)
        app.JOBS[job["id"]]["status"] = "canceled"
        self.gateway_release.set()
        self.assertEqual((await pending).status, 200)
        self.assertEqual(len(self.received), 1)
        self.assertEqual((await self.callback(token)).status, 401)

    async def test_callback_can_arrive_before_local_submission_receipt(self):
        pending = None
        async def submit(application, graph, prompt_id=None, **kwargs):
            nonlocal pending
            self.graphs.append(copy.deepcopy(graph))
            pending = asyncio.create_task(self.callback(graph["30"]["inputs"]["callback_token"]))
            # Let the callback enter auth/source checks before /prompt acknowledges.
            await asyncio.sleep(0)
            return prompt_id
        self.submit.side_effect = submit
        response = await self.generate()
        self.assertEqual(response.status, 200)
        self.assertIsNotNone(pending)
        response = await asyncio.wait_for(pending, 5)
        self.assertEqual(response.status, 200, await response.text() if response.status != 200 else "")
        self.assertEqual(len(self.received), 1)

    async def test_controller_dispatch_ticket_only_in_trusted_graph(self):
        self.api.controller = True
        self.application["http_redirect_origin"] = str(self.client.make_url("/")).rstrip("/")
        store = mock.Mock()
        async def response(request, body, pid, project, linked_card):
            self.assertIsNone(linked_card)
            return web.json_response(app.JOBS[pid])
        with mock.patch.object(app, "CONTROLLER_MODE", True), mock.patch.object(app, "distributed_store", return_value=store), \
                mock.patch.object(app, "generation_job_response", side_effect=response):
            result = await self.generate()
        self.assertEqual(result.status, 200, await result.text())
        self.submit.assert_not_called()
        store.enqueue.assert_called_once()
        pid, payload, required_nodes = store.enqueue.call_args.args
        token = payload["graph"]["30"]["inputs"]["callback_token"]
        self.assertEqual(payload["model_family"], "cloud_local_gpt")
        self.assertNotIn(token, json.dumps(payload["capacity_spec"]))
        self.assertNotIn(token, await result.text())
        self.assertNotIn(token, json.dumps(app.JOBS))
        self.assertEqual(set(payload["graph"]), set(self.template))
        self.assertEqual(set(required_nodes), {node["class_type"] for node in self.template.values()})
        self.assertEqual(payload["graph"]["31"]["inputs"]["callback_token"], "")
        self.assertIn(hashlib.sha256(token.encode()).hexdigest(), self.api.tickets)

    async def test_controller_all_caps_keep_full_required_nodes_and_model_families(self):
        self.api.controller = True
        self.application["http_redirect_origin"] = str(self.client.make_url("/")).rstrip("/")
        store = mock.Mock()
        async def response(request, body, pid, project, linked_card):
            return web.json_response(app.JOBS[pid])
        with mock.patch.object(app, "CONTROLLER_MODE", True), mock.patch.object(app, "distributed_store", return_value=store), \
                mock.patch.object(app, "generation_job_response", side_effect=response):
            for capability, family in (("texture_local_flux", "flux2_klein"),
                                       ("texture_local_gpt", "cloud_local_gpt"),
                                       ("texture_local_banana", "cloud_local_banana")):
                with self.subTest(capability=capability):
                    self.body["capability"] = capability
                    result = await self.generate()
                    self.assertEqual(result.status, 200, await result.text())
                    _, payload, required_nodes = store.enqueue.call_args.args
                    self.assertEqual(set(payload["graph"]), set(self.template))
                    self.assertEqual(set(required_nodes), {node["class_type"] for node in self.template.values()})
                    self.assertEqual(payload["model_family"], family)
        self.submit.assert_not_called()

    async def test_controller_enqueue_failure_invalidates_ticket(self):
        self.api.controller = True
        self.application["http_redirect_origin"] = str(self.client.make_url("/")).rstrip("/")
        store = mock.Mock()
        store.enqueue.side_effect = web.HTTPServiceUnavailable(text="enqueue failed")
        with mock.patch.object(app, "CONTROLLER_MODE", True), mock.patch.object(app, "distributed_store", return_value=store):
            response = await self.generate()
        self.assertEqual(response.status, 503)
        self.assertFalse(self.api.tickets)
        self.assertEqual(store.enqueue.call_count, 1)

    async def test_pending_ticket_limits_and_expired_cleanup(self):
        await self.issue()
        with mock.patch("server.local_texture.MAX_USER_TICKETS", 1):
            self.assertEqual((await self.generate()).status, 429)
            next(iter(self.api.tickets.values()))["expires"] = time.time() - 1
            await self.issue()
            self.assertEqual(len(self.api.tickets), 1)
        with mock.patch("server.local_texture.MAX_PENDING_TICKETS", 1):
            self.assertEqual((await self.generate()).status, 429)

    async def test_model_family_mapping(self):
        self.assertEqual(app.model_family("texture_local_flux"), "flux2_klein")
        self.assertNotEqual(app.model_family("texture_local_gpt"), "flux2_klein")
        self.assertNotEqual(app.model_family("texture_local_banana"), "flux2_klein")

    async def test_actual_png_bytes_from_non_png_banana_result(self):
        token, _ = await self.issue(capability="texture_local_banana")
        image = BytesIO()
        Image.new("RGB", (8, 8), "blue").save(image, format="JPEG")
        result = {"image_bytes": image.getvalue(), "model": "banana", "request_id": "jpeg-id"}
        with mock.patch.object(cloud_banana, "generate", new=mock.AsyncMock(return_value=result)):
            response = await self.callback(token)
        self.assertEqual(response.status, 200)
        data = await response.read()
        self.assertTrue(data.startswith(b"\x89PNG\r\n\x1a\n"))
        self.assertEqual(cloud_images.inspect_image(data)["mime"], "image/png")

    async def test_ticket_redaction_in_error_payloads(self):
        token, result = await self.issue()
        self.assertNotIn(token, json.dumps(redact({"error": "Bearer " + token, "nodes": [token]})))
        # The same graph ticket may appear in Comfy's echoed execution error.
        await app.handle_event(self.application["session"], {"type": "execution_error", "data": {
            "prompt_id": result["id"], "node_id": "30", "node_type": "ChoukaCloudImageEdit", "exception_message": token}},
            app=self.application)
        self.assertNotIn(token, json.dumps(app.JOBS))


if __name__ == "__main__":
    unittest.main()
