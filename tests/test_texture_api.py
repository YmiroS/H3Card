import asyncio
import base64
from io import BytesIO
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "server"))
import app
from server import cloud_images


def png(color):
    output = BytesIO()
    Image.new("RGB", (4, 3), color).save(output, format="PNG")
    return output.getvalue()


async def idle_ws(application):
    await asyncio.Event().wait()


class TextureApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        manifests = self.root / "manifests"
        manifests.mkdir()
        (manifests / "_steps.json").write_text("{}")
        (manifests / "_cards.json").write_text("[]")
        self.enterContext(mock.patch.dict(os.environ, {"CHOUKA_LOCAL_TEST": "1", "CHOUKA_IMAGE_API_KEY": ""}))
        self.enterContext(mock.patch.object(app, "CONTROLLER_MODE", False))
        self.enterContext(mock.patch.object(app, "EXECUTION_MODE", "local"))
        self.enterContext(mock.patch.object(app, "ROOT", self.root))
        self.enterContext(mock.patch.object(app, "PROJ_DIR", self.root / "projects"))
        self.enterContext(mock.patch.object(app, "load_jobs"))
        self.enterContext(mock.patch.object(app, "JOBS", {}))
        self.enterContext(mock.patch.object(app, "ws_loop", idle_ws))
        self.enterContext(mock.patch.object(app, "setup_dingtalk"))
        self.config = self.root / "image-edit.json"
        self.enterContext(mock.patch.object(cloud_images, "CONF", self.config))
        self.received = []
        self.gateway_status = 200
        self.url_only = False
        self.wait_at_gateway = False
        self.gateway_reached = asyncio.Event()
        self.gateway_release = asyncio.Event()
        gateway_app = web.Application()
        gateway_app.router.add_post("/v1/images/edits", self.gateway)
        gateway_app.router.add_get("/view", self.comfy_image)
        self.comfy_requests = []
        self.remote = TestServer(gateway_app)
        await self.remote.start_server()
        self.addAsyncCleanup(self.remote.close)
        self.config.write_text(json.dumps({"base_url": str(self.remote.make_url("/v1")), "api_key": "test-secret"}))
        self.enterContext(mock.patch.object(app, "COMFY_HTTP", str(self.remote.make_url("/")).rstrip("/")))
        self.application = app.make_app(auth_path=self.root / "auth.db")
        self.client = TestClient(TestServer(self.application))
        await self.client.start_server()
        self.addAsyncCleanup(self.client.close)
        identity = await (await self.client.get("/api/auth/me")).json()
        self.user = identity["user"]["id"]
        self.headers = {"Origin": str(self.client.make_url("/")).rstrip("/"), "X-CSRF-Token": identity["csrf_token"]}
        response = await self.client.post("/api/projects", json={"name": "texture-test"}, headers=self.headers)
        self.assertEqual(response.status, 200)
        self.project = (await response.json())["id"]
        self.upstream = self.add_image("original.png", png("red"))
        card = {"id": "texture", "type": "card_tools", "cap": "texture_enhance",
                "params": {}, "assets": {"images[0]": self.upstream}, "outputs": [], "x": 0, "y": 0}
        response = await self.client.post(f"/api/projects/{self.project}/cards", json={"card": card}, headers=self.headers)
        self.assertEqual(response.status, 200, await response.text())

    async def gateway(self, request):
        files = []
        reader = await request.multipart()
        async for part in reader:
            data = bytes(await part.read())
            if part.name == "image[]":
                files.append(data)
        self.received.append(files)
        self.gateway_reached.set()
        if self.wait_at_gateway:
            await self.gateway_release.wait()
        payload = {"data": [{"url": "https://results.example.invalid/generated.png"}]} if self.url_only else {
            "data": [{"b64_json": base64.b64encode(png("blue")).decode()}]}
        return web.json_response(payload, status=self.gateway_status, headers={"X-Request-ID": "texture-request-1"})

    async def comfy_image(self, request):
        self.comfy_requests.append({"query": dict(request.query), "authorization": request.headers.get("Authorization")})
        return web.Response(body=png("yellow"), content_type="image/png")

    def add_image(self, name, data, project=None):
        path = self.root / "data" / "uploads" / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        self.application["resource_access"].register(project or self.project, "upload", name, external=True)
        return {"kind": "image", "url": "/api/upload/" + name, "ref": "chouka/" + name}

    def saved_card(self):
        return self.application["project_repository"].read(self.project)["cards"][0]

    def update_card(self, **patch):
        repository = self.application["project_repository"]
        project = repository.read(self.project)
        project["cards"][0].update(patch)
        repository.write(self.project, project)

    async def generate(self, **extra):
        return await self.client.post("/api/texture/edit", headers=self.headers,
                                      json={"project": self.project, "card": "texture", "prompt": "保持构图，调整质感", **extra})

    async def test_first_round_uses_upstream_and_only_registers_private_preview(self):
        before = self.saved_card()
        response = await self.generate()
        self.assertEqual(response.status, 200, await response.text())
        result = await response.json()
        self.assertEqual(self.received, [[png("red")]])
        self.assertEqual(result["source_kind"], "upstream")
        self.assertEqual(result["request_id"], "texture-request-1")
        self.assertEqual(result["source"]["width"], 4)
        self.assertEqual(result["image"]["width"], 4)
        self.assertEqual(self.saved_card(), before)
        image_response = await self.client.get(result["image"]["url"])
        self.assertEqual(image_response.status, 200)
        self.assertEqual(await image_response.read(), png("blue"))
        self.assertIn("private", image_response.headers["Cache-Control"])
        kind, locator = self.application["resource_access"].reference(result["image"]["url"])
        record = self.application["resource_access"].lookup(kind, locator)
        source = self.application["resource_access"].lookup("upload", "original.png")
        self.assertEqual(record["parent_id"], source["resource_id"])
        self.assertTrue(record["external"])
        self.assertEqual(record["state"], "ready")
        other = self.application["auth_store"].create_user("other", "Other-password-123")["id"]
        self.assertFalse(self.application["resource_access"].authorize(other, kind, locator))
        self.assertNotIn("test-secret", json.dumps(result))

    async def test_next_round_uses_adjusted_applied_result_not_original_or_unapplied_preview(self):
        result = await (await self.generate()).json()
        self.assertTrue(result["image"])
        await self.generate()
        self.assertEqual(self.received[-1], [png("red")])
        applied = self.add_image("applied-adjusted.png", png("green"))
        self.update_card(outputs=[applied])
        response = await self.generate()
        self.assertEqual(response.status, 200)
        result = await response.json()
        self.assertEqual(result["source_kind"], "applied")
        self.assertEqual(self.received[-1], [png("green")])
        self.assertEqual(self.saved_card()["outputs"], [applied])

    async def test_client_cannot_supply_arbitrary_url_key_or_image(self):
        for extra in ({"image": "file:///C:/secret.png"}, {"url": "http://127.0.0.1/private"},
                      {"api_key": "client-key"}, {"images": [self.upstream]}):
            response = await self.generate(**extra)
            self.assertEqual(response.status, 400)
        self.assertEqual(self.received, [])

    async def test_missing_input_or_wrong_card_mode_never_sends(self):
        self.update_card(assets={})
        self.assertEqual((await self.generate()).status, 400)
        self.update_card(cap="image_composite")
        self.assertEqual((await self.generate()).status, 400)
        self.assertEqual(self.received, [])

    async def test_missing_credentials_never_sends(self):
        self.config.write_text('{"api_key":""}')
        response = await self.generate()
        self.assertEqual(response.status, 503)
        self.assertFalse((await response.json())["retryable"])
        self.assertEqual(self.received, [])

    async def test_source_must_belong_to_current_project(self):
        store = self.application["auth_store"]
        owner = store.create_user("private-owner", "Other-password-123")["id"]
        store.create_project("private", owner)
        private = self.add_image("private.png", png("black"), project="private")
        self.update_card(assets={"images[0]": private})
        self.assertEqual((await self.generate()).status, 404)
        self.assertEqual(self.received, [])

    async def test_read_only_project_cannot_generate(self):
        store = self.application["auth_store"]
        owner = store.create_user("private-owner", "Other-password-123")["id"]
        store.create_project("read-only", owner)
        store.set_grant(self.user, owner, "read")
        response = await self.generate(project="read-only")
        self.assertEqual(response.status, 403)
        self.assertEqual(self.received, [])

    async def test_csrf_is_required(self):
        response = await self.client.post("/api/texture/edit", json={"project": self.project, "card": "texture", "prompt": "edit"})
        self.assertEqual(response.status, 403)
        self.assertEqual(self.received, [])

    async def test_source_change_discards_generated_result_and_duplicate_is_rejected(self):
        self.wait_at_gateway = True
        pending = asyncio.create_task(self.generate())
        try:
            await asyncio.wait_for(self.gateway_reached.wait(), 5)
            duplicate = await self.generate()
            self.assertEqual(duplicate.status, 409)
            changed = self.add_image("changed.png", png("yellow"))
            self.update_card(assets={"images[0]": changed})
        finally:
            self.gateway_release.set()
        response = await asyncio.wait_for(pending, 5)
        self.assertEqual(response.status, 409)
        body = await response.json()
        self.assertEqual(body["request_id"], "texture-request-1")
        self.assertFalse(body["retryable"])
        self.assertEqual(len(self.received), 1)
        self.assertEqual(list((self.root / "data" / "uploads").glob("texture_*.png")), [])

    async def test_url_only_response_is_not_downloaded_or_applied(self):
        self.url_only = True
        before = self.saved_card()
        response = await self.generate()
        self.assertEqual(response.status, 200)
        body = await response.json()
        self.assertIsNone(body["image"])
        self.assertEqual(body["result_url"], "https://results.example.invalid/generated.png")
        self.assertEqual(self.saved_card(), before)
        self.assertEqual(list((self.root / "data" / "uploads").glob("texture_*.png")), [])

    async def test_uncached_comfy_source_uses_trusted_view_without_cloud_key(self):
        source = {"kind": "image", "url": "/api/file?filename=render.png&subfolder=output&type=output"}
        resources = self.application["resource_access"]
        ref = resources.reference(source["url"])
        resources.register(self.project, *ref)
        self.update_card(assets={"images[0]": source})
        response = await self.generate()
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(self.received, [[png("yellow")]])
        self.assertEqual(self.comfy_requests, [{"query": {"filename": "render.png", "subfolder": "output", "type": "output"},
                                               "authorization": None}])

    async def test_storage_failure_removes_preview_and_preserves_card(self):
        before = self.saved_card()
        for target in ("server.texture_api.os.replace", "pathlib.Path.write_bytes"):
            with self.subTest(target=target), mock.patch(target, side_effect=OSError("disk unavailable")):
                response = await self.generate()
                self.assertEqual(response.status, 500)
                body = await response.json()
                self.assertEqual(body["request_id"], "texture-request-1")
                self.assertFalse(body["retryable"])
                self.assertIn("不要重复生成", body["error"])
                self.assertEqual(self.saved_card(), before)
                self.assertEqual(list((self.root / "data" / "uploads").glob("texture_*")), [])
        response = await self.generate()
        self.assertEqual(response.status, 200, await response.text())

    async def test_registration_failure_removes_preview_and_preserves_card(self):
        before = self.saved_card()
        resources = self.application["resource_access"]
        with mock.patch.object(resources, "register", side_effect=ValueError("registration failed")):
            response = await self.generate()
        self.assertEqual(response.status, 400)
        self.assertEqual(self.saved_card(), before)
        self.assertEqual(list((self.root / "data" / "uploads").glob("texture_*")), [])

    async def test_upstream_error_preserves_previous_application(self):
        applied = self.add_image("applied.png", png("green"))
        self.update_card(outputs=[applied])
        self.gateway_status = 500
        response = await self.generate()
        self.assertEqual(response.status, 502)
        self.assertEqual(self.saved_card()["outputs"], [applied])
        body = await response.json()
        self.assertEqual(body["request_id"], "texture-request-1")
        self.assertFalse(body["retryable"])


if __name__ == "__main__":
    unittest.main()
