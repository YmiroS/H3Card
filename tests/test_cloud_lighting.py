"""Cloud lighting regression tests with real HTTP/auth/storage and a local fake gateway."""
import asyncio
import base64
import copy
from io import BytesIO
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest import mock

import aiohttp
from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer
from PIL import Image
from yarl import URL

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "server"))
import app
from server import cloud_images
from server.cloud_lighting import lighting_size

PASSWORD = "Lighting-test-password-123"
PROMPT = "保留主体、构图和材质，左侧柔光，右侧轮廓光。"
LOAD_JOBS = app.load_jobs


def png(color, size=(4, 3)):
    output = BytesIO()
    Image.new("RGB", size, color).save(output, format="PNG")
    return output.getvalue()


async def idle_ws(application):
    await asyncio.Event().wait()


class LightingSizeTests(unittest.TestCase):
    def test_clarity_tiers_keep_input_ratio_and_align_request_size(self):
        for width, height, pixels, expected in (
                (1920, 1080, 1920 * 1080, "1920x1072"),
                (1080, 1920, 1920 * 1080, "1072x1920"),
                (1920, 1080, 2560 * 1440, "2560x1440"),
                (1920, 1080, 3840 * 2160, "3840x2160"),
                (3392, 5056, 3840 * 2160, "2352x3504"),
                (5056, 3392, 3840 * 2160, "3504x2352"),
                (1440, 1440, 1920 * 1080, "1440x1440")):
            with self.subTest(width=width, height=height, pixels=pixels):
                self.assertEqual(lighting_size({"width": width, "height": height},
                                               pixels / (1024 * 1024)), expected)

    def test_aligned_dimensions_never_exceed_pixel_budget(self):
        for source in ((3392, 5056), (5056, 3392), (1920, 1080), (1080, 1920),
                       (1440, 1440), (4, 3), (1, 32_000_000), (32_000_000, 1)):
            for megapixels in (0.25, 1.5, 16, *(width * height / (1024 * 1024)
                    for width, height in ((832, 480), (960, 544), (1152, 640),
                                          (1344, 768), (1920, 1080), (2560, 1440),
                                          (3840, 2160)))):
                with self.subTest(source=source, megapixels=megapixels):
                    size = lighting_size({"width": source[0], "height": source[1]}, megapixels)
                    width, height = map(int, size.split("x"))
                    self.assertGreaterEqual(width, 16)
                    self.assertGreaterEqual(height, 16)
                    self.assertEqual(width % 16, 0)
                    self.assertEqual(height % 16, 0)
                    self.assertLessEqual(width * height, megapixels * 1024 * 1024)

    def test_invalid_megapixels_are_rejected(self):
        for value in (True, False, None, "2", [], {}, 0, -1, 0.24, 16.01,
                      float("nan"), float("inf")):
            with self.subTest(value=value), self.assertRaises(web.HTTPBadRequest):
                lighting_size({"width": 1920, "height": 1080}, value)

    def test_manifest_restores_resolution_without_comfy_parameters(self):
        cap = json.loads((ROOT / "manifests/qwen_lighting_multi.json").read_text(encoding="utf-8"))
        fields = {spec["key"]: spec for spec in cap["inputs"]}
        self.assertEqual(cap["execution"], "cloud_image")
        self.assertNotIn("graph", cap)
        self.assertNotIn("steps", fields)
        self.assertNotIn("seed", fields)
        self.assertNotIn("target", fields["megapixels"])
        self.assertEqual(fields["megapixels"]["default"], 1.5)
        self.assertEqual(fields["megapixels"]["max"], 16)


class CloudLightingFixture:
    """Shared fixture only, not a TestCase (and not derived from TextureApiTests)."""

    controller_mode = False

    async def asyncSetUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        manifests = self.root / "manifests"
        manifests.mkdir()
        (manifests / "_steps.json").write_text("{}", encoding="utf-8")
        (manifests / "_cards.json").write_text("[]", encoding="utf-8")
        shutil.copyfile(ROOT / "manifests" / "qwen_lighting_multi.json",
                        manifests / "qwen_lighting_multi.json")
        (self.root / "pricing.json").write_text("{}", encoding="utf-8")
        self.enterContext(mock.patch.dict(os.environ, {
            "CHOUKA_LOCAL_TEST": "0", "CHOUKA_ADMIN_SANDBOX": "0",
            "CHOUKA_IMAGE_API_KEY": "", "CHOUKA_AUTH_ORIGIN": "",
        }))
        for name, value in {
            "ROOT": self.root, "PROJ_DIR": self.root / "projects",
            "COMFY_INPUT": self.root / "comfy-input",
            "JOBS_FILE": self.root / "data" / "jobs.json",
            "JOBS": {}, "CAPS": {}, "CARDS": [], "STEP_ZH": {}, "ZH_NODES": {},
            "STEPS": {}, "WEIGHTS": {}, "STATE": {**app.STATE, "comfy_online": False},
            "CONTROLLER_MODE": self.controller_mode,
            "EXECUTION_MODE": "controller" if self.controller_mode else "local",
        }.items():
            self.enterContext(mock.patch.object(app, name, value))
        self.enterContext(mock.patch.object(app, "load_jobs"))
        self.save_jobs = self.enterContext(mock.patch.object(app, "save_jobs"))
        self.enterContext(mock.patch.object(app, "ws_loop", idle_ws))
        self.enterContext(mock.patch.object(app, "setup_dingtalk"))
        self.enterContext(mock.patch.object(app, "lan_ips", return_value=[]))
        self.config = self.root / "cloud-ai-config.json"
        self.enterContext(mock.patch.object(cloud_images, "CONF", self.config))
        self.received = []
        self.comfy_requests = []
        self.unexpected_requests = []
        self.gateway_reached = asyncio.Event()
        self.gateway_release = asyncio.Event()
        self.gateway_status = 200
        self.result_size = (4, 3)
        self.result_payload = None
        gateway = web.Application()
        gateway.router.add_post("/v1/images/edits", self.gateway)
        gateway.router.add_get("/view", self.comfy_image)
        gateway.router.add_route("*", "/{path:.*}", self.unexpected_request)
        self.remote = TestServer(gateway)
        await self.remote.start_server()
        self.addAsyncCleanup(self.remote.close)
        self.config.write_text(json.dumps({
            "base_url": str(self.remote.make_url("/v1")), "api_key": "fake-lighting-secret",
            "model": "fake-lighting-model", "size": "1024x1024",
        }), encoding="utf-8")
        self.enterContext(mock.patch.object(app, "COMFY_HTTP", str(self.remote.make_url("/")).rstrip("/")))
        self.application = app.make_app(auth_path=self.root / "auth.db")
        self.client = TestClient(TestServer(self.application))
        await self.client.start_server()
        self.addAsyncCleanup(self.client.close)
        self.addAsyncCleanup(self.drain_cloud_tasks)

        # Both clients and the backend may contact only these two actual TestServers.
        original_request = aiohttp.ClientSession._request
        allowed_ports = {self.remote.port, self.client.port}

        async def local_request(session, method, url, *args, **kwargs):
            parsed = URL(url)
            if parsed.host != "127.0.0.1" or parsed.port not in allowed_ports:
                raise AssertionError(f"Non-fixture HTTP request blocked: {method} {url}")
            return await original_request(session, method, url, *args, **kwargs)

        self.enterContext(mock.patch.object(aiohttp.ClientSession, "_request", local_request))
        self.store = self.application["auth_store"]
        self.resources = self.application["resource_access"]
        self.store.create_user("admin", PASSWORD, role="admin")
        self.user = self.store.create_user("lighting-owner", PASSWORD)["id"]
        self.store.set_ready()
        await self.login("lighting-owner")
        response = await self.client.post("/api/projects", json={"name": "lighting-test"}, headers=self.headers)
        self.assertEqual(response.status, 200, await response.text())
        self.project = (await response.json())["id"]
        self.upstream = self.add_upload("original.png", png("red"))
        card = {"id": "lighting", "type": "card_image", "cap": "qwen_lighting_multi",
                "params": {}, "assets": {"images[0]": self.upstream}, "outputs": [], "x": 0, "y": 0}
        response = await self.client.post(f"/api/projects/{self.project}/cards",
                                          json={"card": card}, headers=self.headers)
        self.assertEqual(response.status, 200, await response.text())
        # Fail closed if the cloud branch ever falls through to local generation.
        self.local_calls = {}
        for name in ("generation_assets", "comfy_upload", "comfy_submit", "local_submit",
                     "patch_graph", "refresh_local_gpu", "check_local_capability",
                     "check_local_cleanup", "cancel_local_and_release"):
            self.local_calls[name] = self.enterContext(mock.patch.object(
                app, name, side_effect=AssertionError(f"Cloud job invoked local path: {name}")))

    async def asyncTearDown(self):
        for name, call in self.local_calls.items():
            with self.subTest(local_path=name):
                call.assert_not_called()
        self.assertEqual(self.unexpected_requests, [])

    async def drain_cloud_tasks(self):
        self.gateway_release.set()
        await asyncio.wait_for(self.application["cloud_lighting"].close(), 10)

    async def login(self, username):
        self.client.session.cookie_jar.clear()
        origin = str(self.client.make_url("/")).rstrip("/")
        response = await self.client.post("/api/auth/login", headers={"Origin": origin},
                                          json={"username": username, "password": PASSWORD})
        self.assertEqual(response.status, 200, await response.text())
        identity = await response.json()
        self.headers = {"Origin": origin, "X-CSRF-Token": identity["csrf_token"]}

    async def gateway(self, request):
        files, fields = [], {}
        async for part in await request.multipart():
            value = bytes(await part.read())
            if part.name == "image[]":
                files.append(value)
            else:
                fields[part.name] = value.decode()
        self.received.append({"images": files, "fields": fields,
                              "authorization": request.headers.get("Authorization")})
        release = self.gateway_release
        self.gateway_reached.set()
        await release.wait()
        payload = self.result_payload if self.result_payload is not None else {
            "data": [{"b64_json": base64.b64encode(png("blue", self.result_size)).decode()}]}
        return web.json_response(payload, status=self.gateway_status,
                                 headers={"X-Request-ID": "lighting-request-1"})

    async def comfy_image(self, request):
        self.comfy_requests.append({"query": dict(request.query),
                                    "authorization": request.headers.get("Authorization")})
        return web.Response(body=png("yellow"), content_type="image/png")

    async def unexpected_request(self, request):
        self.unexpected_requests.append((request.method, request.path))
        return web.Response(status=503)

    def add_upload(self, name, data, project=None):
        path = self.root / "data" / "uploads" / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        self.resources.register(project or self.project, "upload", name, external=True)
        return {"kind": "image", "url": "/api/upload/" + name, "ref": "chouka/" + name, "origin": name}

    def saved_card(self):
        return self.application["project_repository"].read(self.project)["cards"][0]

    def update_card(self, **patch):
        repository = self.application["project_repository"]
        document = repository.read(self.project)
        document["cards"][0].update(patch)
        repository.write(self.project, document)

    async def generate(self, **extra):
        return await self.client.post("/api/generate", headers=self.headers, json={
            "project": self.project, "card": "lighting", "capability": "qwen_lighting_multi",
            "params": {"prompt": "  " + PROMPT + "\n"},
            "assets": {"images[0]": self.upstream["ref"]}, **extra,
        })

    async def start_job(self, **extra):
        self.gateway_reached.clear()
        self.gateway_release.clear()
        # A completion-blocked gateway must not block the submission response.
        response = await asyncio.wait_for(self.generate(**extra), 5)
        self.assertEqual(response.status, 200, await response.text())
        submitted = await response.json()
        self.assertIn(submitted["status"], ("queued", "running"))
        self.assertEqual(submitted["outputs"], [])
        await asyncio.wait_for(self.gateway_reached.wait(), 5)
        self.assertEqual(app.JOBS[submitted["id"]]["status"], "running")
        return submitted

    async def finish_job(self, submitted):
        tasks = list(self.application["cloud_lighting"].tasks.values())
        self.gateway_release.set()
        await asyncio.wait_for(asyncio.gather(*tasks), 10)
        response = await self.client.get(f"/api/job/{submitted['id']}")
        self.assertEqual(response.status, 200, await response.text())
        return await response.json()

    async def indexed_assets(self, submitted):
        response = await self.client.get(f"/api/job/{submitted['id']}/inputs")
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(response.headers["Cache-Control"], "private, no-store")
        return (await response.json())["assets"]

    def assert_no_submission(self):
        self.assertEqual(self.received, [])
        self.assertEqual(app.JOBS, {})
        self.assertEqual(self.application["cloud_lighting"].tasks, {})
        self.save_jobs.assert_not_called()

    async def assert_running_cloud_project_deletion(self):
        submitted = await self.start_job()
        jid = submitted["id"]
        task = self.application["cloud_lighting"].tasks[jid]
        project_path = self.application["project_repository"].path(self.project)
        before = project_path.read_bytes()
        with mock.patch.object(app, "stop_job", wraps=app.stop_job) as stop_job:
            response = await asyncio.wait_for(self.client.delete(
                f"/api/projects/{self.project}", headers=self.headers), 5)
            self.assertEqual(response.status, 200, await response.text())
            self.assertEqual(await response.json(), {"ok": True})
            stop_job.assert_not_called()
        self.assertEqual(self.store.get_project(self.project)["state"], "deleted")
        self.assertIsNone(self.store.project_permission(self.user, self.project))
        self.assertFalse(project_path.exists(), "deletion must not stop after revoking the ACL")
        deleted_path = project_path.with_suffix(".json.deleted")
        self.assertEqual(deleted_path.read_bytes(), before)
        self.assertEqual((await self.client.get(f"/api/projects/{self.project}")).status, 404)
        self.assertFalse(task.done())
        self.assertFalse(task.cancelled())
        self.assertEqual(app.JOBS[jid]["status"], "running")

        # The upstream request still completes, but its result must never be published.
        with mock.patch.object(self.resources, "publish", wraps=self.resources.publish) as publish:
            self.gateway_release.set()
            await asyncio.wait_for(asyncio.gather(task), 10)
            publish.assert_not_called()
        job = app.JOBS[jid]
        self.assertEqual(job["status"], "error")
        self.assertFalse(job["retryable"])
        self.assertEqual(job["outputs"], [])
        self.assertEqual(job["request_id"], "lighting-request-1")
        self.assertIn("未采用云端结果", job["error"])
        self.assertFalse(task.cancelled())
        self.assertEqual(len(self.received), 1)
        self.assertEqual(list((self.root / "data").glob("artifacts/*/*")), [])
        self.assertIsNone(self.resources.lookup("artifact", f"{jid}/relight.png"))
        self.assertEqual((await self.client.get(f"/api/artifact/{jid}/relight.png")).status, 404)
        self.assertEqual((await self.client.get(f"/api/job/{jid}")).status, 404)
        self.assertEqual(deleted_path.read_bytes(), before, "late completion must not rewrite the deleted canvas")
        self.assertFalse(project_path.exists())

    def director_document(self, stage="image"):
        project = self.application["project_repository"].read(self.project)
        phases = {name: {"capability": "", "params": {}} for name in ("image", "video")}
        phases[stage] = {"capability": "qwen_lighting_multi", "params": {"prompt": PROMPT},
                         "assets": {"images[0]": copy.deepcopy(self.upstream)}}
        return {"rev": (project.get("director") or {}).get("rev", 0),
                "canvas_rev": project["rev"], "script": "", "style": "", "shots": [{
                    "id": "lighting-shot", "title": "云端布光分镜", "description": PROMPT,
                    "shotSize": "", "movement": "", "notes": "", **phases,
                    "assets": [], "history": [], "selected": {},
                }]}

    async def save_director(self, document):
        return await self.client.put(f"/api/projects/{self.project}/director",
                                      json=document, headers=self.headers)


class CloudLightingTests(CloudLightingFixture, unittest.IsolatedAsyncioTestCase):
    async def test_delete_running_cloud_project_soft_deletes_and_discards_result(self):
        await self.assert_running_cloud_project_deletion()

    async def test_director_cloud_image_without_graph_binds_card_and_generation_job(self):
        cap = app.CAPS["qwen_lighting_multi"]
        self.assertEqual(cap["kind"], "gen")
        self.assertEqual(cap["execution"], "cloud_image")
        self.assertFalse(cap["_graph_ok"])
        self.assertNotIn("graph", cap)
        original = self.saved_card()
        document = self.director_document()
        response = await self.save_director(document)
        self.assertEqual(response.status, 200, await response.text())
        result = await response.json()
        project = result["project"]
        phase = project["director"]["shots"][0]["image"]
        card = next(card for card in project["cards"] if card["id"] == phase["card"])
        self.assertEqual(len(project["cards"]), 2)
        self.assertEqual(next(card for card in project["cards"] if card["id"] == "lighting"), original)
        self.assertEqual(card["type"], "card_image")
        self.assertEqual(card["cap"], "qwen_lighting_multi")
        self.assertEqual(card["director_shot"], "lighting-shot")
        self.assertEqual(card["director_stage"], "image")
        self.assertEqual(card["created_by"], self.user)
        self.assertEqual(card["params"]["prompt"], PROMPT)
        self.assertEqual(card["assets"], {"images[0]": self.upstream})
        self.assertNotIn("card", project["director"]["shots"][0]["video"])
        self.assertEqual(project["edges"], [])
        self.assert_no_submission()

        submitted = await self.start_job(card=card["id"])
        self.assertEqual(submitted["project_rev"], project["rev"] + 1)
        persisted = self.application["project_repository"].read(self.project)
        bound = next(item for item in persisted["cards"] if item["id"] == card["id"])
        self.assertEqual(bound["job"], submitted["id"])
        self.assertIn(bound["status"], ("queued", "running"))
        self.assertEqual(persisted["rev"], submitted["project_rev"])
        done = await self.finish_job(submitted)
        self.assertEqual(done["status"], "done")
        response = await self.client.get(f"/api/projects/{self.project}")
        self.assertEqual(response.status, 200, await response.text())
        projected = await response.json()
        bound = next(item for item in projected["cards"] if item["id"] == card["id"])
        self.assertEqual(bound["status"], "done")
        self.assertEqual(bound["outputs"], done["outputs"])
        self.assertEqual(bound["history"][0]["job"], submitted["id"])
        shot = projected["director"]["shots"][0]
        self.assertEqual(shot["image"]["card"], card["id"])
        history = next(item for item in shot["history"] if item["job"] == submitted["id"])
        self.assertEqual(history["stage"], "image")
        self.assertEqual(history["outputs"], done["outputs"])
        self.assertEqual(len(self.received), 1)

    async def test_director_import_binds_existing_cloud_card_without_graph_or_generation(self):
        self.update_card(params={"prompt": PROMPT})
        repository = self.application["project_repository"]
        before = repository.read(self.project)
        response = await self.client.post(f"/api/projects/{self.project}/director/import", headers=self.headers,
                                          json={"rev": 0, "canvas_rev": before["rev"], "cards": ["lighting"]})
        self.assertEqual(response.status, 200, await response.text())
        result = await response.json()
        project = result["project"]
        self.assertEqual(len(project["cards"]), 1)
        self.assertEqual(len(project["director"]["shots"]), 1)
        shot = project["director"]["shots"][0]
        self.assertEqual(shot["image"]["card"], "lighting")
        self.assertEqual(shot["image"]["capability"], "qwen_lighting_multi")
        self.assertEqual(shot["image"]["params"], {"prompt": PROMPT})
        self.assertEqual(shot["image"]["assets"], {"images[0]": self.upstream})
        self.assertEqual(project["cards"][0]["director_shot"], shot["id"])
        self.assertEqual(project["cards"][0]["director_stage"], "image")
        self.assertNotIn("card", shot["video"])
        self.assertEqual(project["edges"], before["edges"])
        self.assertEqual(repository.read(self.project)["director"], project["director"])
        # Saving an imported binding must also pass the same capability validation.
        document = copy.deepcopy(project["director"])
        document["canvas_rev"] = project["rev"]
        response = await self.save_director(document)
        self.assertEqual(response.status, 200, await response.text())
        saved = (await response.json())["project"]
        self.assertEqual(len(saved["cards"]), 1)
        self.assertEqual(saved["director"]["shots"][0]["image"]["card"], "lighting")
        self.assert_no_submission()

    async def test_director_rejects_cloud_image_in_video_stage_without_partial_binding(self):
        path = self.application["project_repository"].path(self.project)
        before = path.read_bytes()
        response = await self.save_director(self.director_document(stage="video"))
        self.assertEqual(response.status, 400, await response.text())
        self.assertEqual(path.read_bytes(), before)
        self.assert_no_submission()

    async def test_director_cloud_exception_still_requires_gen_and_does_not_allow_other_graphless_modes(self):
        cap = app.CAPS["qwen_lighting_multi"]
        path = self.application["project_repository"].path(self.project)
        before = path.read_bytes()
        for changes in ({"kind": "tool"}, {"execution": "local"},
                        {"execution": "browser"}, {"execution": "if_studio"}):
            with self.subTest(changes=changes), mock.patch.dict(app.CAPS, {cap["id"]: {**cap, **changes}}):
                response = await self.save_director(self.director_document())
                self.assertEqual(response.status, 400, await response.text())
                self.assertEqual(path.read_bytes(), before)
        self.assert_no_submission()

    async def test_submit_returns_before_gateway_finishes_and_sends_original_once(self):
        submitted = await self.start_job()
        self.assertFalse(self.gateway_release.is_set())
        self.assertEqual(submitted["execution"], "cloud_image")
        self.assertEqual(submitted["modelName"], "fake-lighting-model")
        self.assertEqual(submitted["prompts"], [{"key": "prompt", "label": "布光提示词", "text": PROMPT}])
        done = await self.finish_job(submitted)
        self.assertEqual(done["status"], "done")
        self.assertEqual(len(self.received), 1)
        self.assertEqual(self.received[0]["images"], [png("red")])
        self.assertEqual(self.received[0]["fields"]["prompt"], PROMPT)
        self.assertEqual(self.received[0]["fields"]["size"], "1440x1072")
        self.assertEqual(self.received[0]["fields"]["model"], "fake-lighting-model")
        self.assertEqual(self.received[0]["authorization"], "Bearer fake-lighting-secret")
        self.assertEqual(done["request_id"], "lighting-request-1")
        self.assertNotIn("fake-lighting-secret", json.dumps(done))
        self.assertGreaterEqual(self.save_jobs.call_count, 3)

    async def test_selected_clarity_controls_cloud_size_without_resizing_input(self):
        image = png("red", (1920, 1080))
        upstream = self.add_upload("landscape.png", image)
        for pixels, expected in ((1920 * 1080, "1920x1072"),
                                 (2560 * 1440, "2560x1440"),
                                 (3840 * 2160, "3840x2160")):
            with self.subTest(size=expected):
                megapixels = pixels / (1024 * 1024)
                submitted = await self.start_job(
                    params={"prompt": PROMPT, "megapixels": megapixels},
                    assets={"images[0]": upstream["ref"]})
                self.assertEqual(submitted["requested_size"], expected)
                self.assertEqual(submitted["megapixels"], megapixels)
                done = await self.finish_job(submitted)
                self.assertEqual(done["status"], "done")
                self.assertEqual(self.received[-1]["fields"]["size"], expected)
                self.assertEqual(self.received[-1]["images"], [image])
        self.assertEqual((self.root / "data/uploads/landscape.png").read_bytes(), image)
        self.assertEqual(len(self.received), 3)

    async def test_portrait_4k_budget_applies_to_dry_run_and_cloud_request(self):
        image = png("red", (3392, 5056))
        upstream = self.add_upload("portrait.png", image)
        pixels = 3840 * 2160
        params = {"prompt": PROMPT, "megapixels": pixels / (1024 * 1024)}
        assets = {"images[0]": upstream["ref"]}
        response = await self.generate(params=params, assets=assets, dry_run=True)
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual((await response.json())["size"], "2352x3504")
        self.assert_no_submission()
        submitted = await self.start_job(params=params, assets=assets)
        self.assertEqual(submitted["requested_size"], "2352x3504")
        self.assertEqual(submitted["megapixels"], params["megapixels"])
        done = await self.finish_job(submitted)
        self.assertEqual(done["status"], "done")
        self.assertEqual(done["requested_size"], "2352x3504")
        self.assertEqual(len(self.received), 1)
        self.assertEqual(self.received[0]["fields"]["size"], "2352x3504")
        width, height = map(int, self.received[0]["fields"]["size"].split("x"))
        self.assertLessEqual(width * height, pixels)
        self.assertEqual(self.received[0]["images"], [image])
        self.assertEqual((self.root / "data/uploads/portrait.png").read_bytes(), image)

    async def test_invalid_clarity_rejects_before_creating_cloud_task(self):
        for value in (True, "2", None, 0, 16.1):
            with self.subTest(value=value):
                response = await self.generate(params={"prompt": PROMPT, "megapixels": value})
                self.assertEqual(response.status, 400, await response.text())
                self.assert_no_submission()

    async def test_done_artifact_is_readable_private_and_derived_from_input(self):
        done = await self.finish_job(await self.start_job())
        self.assertEqual(done["status"], "done")
        self.assertEqual(done["progress"], 1.0)
        self.assertEqual(len(done["outputs"]), 1)
        output = done["outputs"][0]
        self.assertTrue(output["url"].startswith(f"/api/artifact/{done['id']}/"))
        response = await self.client.get(output["url"])
        self.assertEqual(response.status, 200)
        self.assertEqual(await response.read(), png("blue"))
        self.assertEqual(response.headers["Cache-Control"], "private, no-store")
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        ref = self.resources.reference(output["url"])
        record = self.resources.lookup(*ref)
        self.assertEqual(record["state"], "ready")
        self.assertEqual(record["parent_id"], self.resources.lookup("upload", "original.png")["resource_id"])
        self.assertEqual(self.resources.local_path(*ref).read_bytes(), png("blue"))
        self.assertEqual(list((self.root / "data" / "artifacts").rglob("*.part")), [])
        self.store.create_user("stranger", PASSWORD)
        await self.login("stranger")
        for url in (output["url"], f"/api/job/{done['id']}", f"/api/job/{done['id']}/inputs"):
            self.assertEqual((await self.client.get(url)).status, 404)
        self.client.session.cookie_jar.clear()
        self.assertEqual((await self.client.get(output["url"])).status, 401)

    async def test_upload_input_index_and_cloud_job_display(self):
        submitted = await self.start_job()
        self.assertEqual(await self.indexed_assets(submitted), [{
            "ref": "chouka/original.png", "url": "/api/upload/original.png",
            "kind": "image", "origin": "original.png",
        }])
        response = await self.client.get("/api/jobs")
        self.assertEqual(response.status, 200)
        listed = next(job for job in (await response.json())["jobs"] if job["id"] == submitted["id"])
        self.assertEqual(listed["modelName"], "fake-lighting-model")
        self.assertEqual(listed["nodeName"], "云端 API")
        self.assertEqual(listed["permission"], "operate")
        done = await self.finish_job(submitted)
        self.assertEqual(done["nodeName"], "云端 API")
        self.assertEqual(done["modelName"], "fake-lighting-model")
        self.assertEqual(self.store.get_job(done["id"])["project_id"], self.project)

    async def test_offline_comfy_and_pending_cleanup_do_not_gate_cloud_submission(self):
        self.application["cleanup_pending"].add("local-job-awaiting-cleanup")
        self.application["local_gpu_state"].clear()
        self.assertFalse(app.STATE["comfy_online"])
        done = await self.finish_job(await self.start_job())
        self.assertEqual(done["status"], "done")
        self.assertEqual(self.comfy_requests, [])
        self.assertEqual(self.application["cleanup_pending"], {"local-job-awaiting-cleanup"})
        self.assertEqual(app.STEPS, {})
        self.assertEqual(app.WEIGHTS, {})
        self.assertTrue(self.resources.lookup("upload", "original.png")["external"])

    async def test_duplicate_card_is_409_and_does_not_send_twice(self):
        submitted = await self.start_job()
        response = await self.generate()
        self.assertEqual(response.status, 409, await response.text())
        self.assertEqual(list(app.JOBS), [submitted["id"]])
        done = await self.finish_job(submitted)
        self.assertEqual(done["status"], "done")
        self.assertEqual(len(self.received), 1)

    async def test_concurrent_submissions_of_same_card_create_only_one_cloud_job(self):
        responses = await asyncio.wait_for(asyncio.gather(self.generate(), self.generate()), 5)
        bodies = [await response.text() for response in responses]
        self.assertEqual(sorted(response.status for response in responses), [200, 409], bodies)
        accepted = next(json.loads(body) for response, body in zip(responses, bodies)
                        if response.status == 200)
        await asyncio.wait_for(self.gateway_reached.wait(), 5)
        self.assertEqual(list(app.JOBS), [accepted["id"]])
        done = await self.finish_job(accepted)
        self.assertEqual(done["status"], "done")
        self.assertEqual(len(self.received), 1)

    async def test_cancel_running_is_409_and_original_cloud_task_completes(self):
        submitted = await self.start_job()
        task = self.application["cloud_lighting"].tasks[submitted["id"]]
        response = await self.client.post(f"/api/job/{submitted['id']}/cancel", headers=self.headers)
        self.assertEqual(response.status, 409, await response.text())
        self.assertFalse(task.cancelled())
        self.assertFalse(task.done())
        self.assertEqual(app.JOBS[submitted["id"]]["status"], "running")
        self.assertEqual((await self.finish_job(submitted))["status"], "done")
        self.assertEqual(len(self.received), 1)

    async def test_existing_card_output_is_not_used_instead_of_explicit_upstream(self):
        previous = self.add_upload("previous-output.png", png("green"))
        self.update_card(outputs=[previous])
        before = self.saved_card()
        done = await self.finish_job(await self.start_job())
        self.assertEqual(done["status"], "done")
        self.assertEqual(self.received[0]["images"], [png("red")])
        self.assertEqual(self.saved_card(), before)

    async def test_cloud_output_dimensions_are_preserved_not_assumed_equal_to_source(self):
        self.result_size = (6, 5)
        done = await self.finish_job(await self.start_job())
        self.assertEqual(done["status"], "done")
        self.assertEqual(self.received[0]["fields"]["size"], "1440x1072")
        output = done["outputs"][0]
        self.assertEqual((output["width"], output["height"]), (6, 5))
        response = await self.client.get(output["url"])
        self.assertEqual(await response.read(), png("blue", (6, 5)))

    async def test_gateway_failure_sets_error_without_retry_or_overwriting_card(self):
        previous = self.add_upload("previous.png", png("green"))
        self.update_card(outputs=[previous])
        before = self.saved_card()
        self.gateway_status = 503
        done = await self.finish_job(await self.start_job())
        self.assertEqual(done["status"], "error")
        self.assertFalse(done["retryable"])
        self.assertEqual(done["request_id"], "lighting-request-1")
        self.assertIn("503", done["error"])
        self.assertEqual(done["outputs"], [])
        self.assertEqual(len(self.received), 1)
        self.assertEqual(self.saved_card(), before)
        self.assertEqual(list((self.root / "data").glob("artifacts/*/*")), [])

    async def test_gateway_400_logs_diagnostics_but_keeps_task_error_private(self):
        self.gateway_status = 400
        self.result_payload = {"error": {"message": "Unsupported size: fake-lighting-secret",
                                         "param": "size", "code": "invalid_size"}}
        with self.assertLogs(cloud_images.__name__, level="WARNING") as logs:
            done = await self.finish_job(await self.start_job())
        self.assertEqual(done["status"], "error")
        self.assertIn("HTTP 400", done["error"])
        self.assertFalse(done["retryable"])
        self.assertEqual(done["request_id"], "lighting-request-1")
        self.assertNotIn("Unsupported size", done["error"])
        self.assertNotIn("fake-lighting-secret", " ".join(logs.output))
        self.assertIn("Unsupported size: [redacted]", " ".join(logs.output))
        self.assertIn("param=size", " ".join(logs.output))
        self.assertEqual(len(self.received), 1)
        self.assertEqual(done["outputs"], [])

    async def test_invalid_gateway_image_sets_error_without_retry(self):
        self.result_payload = {"data": [{"b64_json": "not valid base64"}]}
        done = await self.finish_job(await self.start_job())
        self.assertEqual(done["status"], "error")
        self.assertFalse(done["retryable"])
        self.assertEqual(done["request_id"], "lighting-request-1")
        self.assertEqual(done["outputs"], [])
        self.assertEqual(len(self.received), 1)

    async def test_url_only_result_is_error_and_not_downloaded(self):
        self.result_payload = {"data": [{"url": str(self.remote.make_url("/view"))}]}
        done = await self.finish_job(await self.start_job())
        self.assertEqual(done["status"], "error")
        self.assertFalse(done["retryable"])
        self.assertIn("不要重复生成", done["error"])
        self.assertEqual(done["outputs"], [])
        self.assertEqual(self.comfy_requests, [])
        self.assertEqual(len(self.received), 1)

    async def test_dry_run_validates_source_but_never_creates_job_or_calls_gateway(self):
        # A dry run should not even require usable cloud credentials.
        self.config.write_text('{"api_key":""}', encoding="utf-8")
        response = await self.generate(dry_run=True)
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {"dry_run": True, "execution": "cloud_image",
                                                 "changed": {}, "prompt": PROMPT, "size": "1440x1072"})
        self.assert_no_submission()

    async def test_missing_cloud_credentials_rejects_before_job_creation(self):
        self.config.write_text('{"api_key":""}', encoding="utf-8")
        response = await self.generate()
        self.assertEqual(response.status, 503, await response.text())
        self.assertFalse((await response.json())["retryable"])
        self.assert_no_submission()

    async def test_empty_non_string_and_overlong_prompt_are_rejected(self):
        for prompt in (None, "", " \n\t ", 42, "x" * 20001):
            with self.subTest(prompt_type=type(prompt).__name__, length=len(str(prompt))):
                response = await self.generate(params={"prompt": prompt})
                self.assertEqual(response.status, 400, await response.text())
        self.assert_no_submission()

    async def test_missing_extra_or_non_string_image_assets_are_rejected(self):
        for assets in ({}, {"images[0]": self.upstream},
                       {"images[0]": self.upstream["ref"], "images[1]": self.upstream["ref"]}):
            with self.subTest(assets=assets):
                response = await self.generate(assets=assets)
                self.assertEqual(response.status, 400, await response.text())
        self.assert_no_submission()

    async def test_external_and_traversal_references_are_rejected_without_fetch(self):
        for source in ("https://example.invalid/secret.png", str(self.remote.make_url("/view")),
                       "file:///C:/secret.png", "//127.0.0.1/secret.png", "chouka/../secret.png"):
            with self.subTest(source=source):
                response = await self.generate(assets={"images[0]": source})
                self.assertEqual(response.status, 400, await response.text())
        self.assertEqual(self.comfy_requests, [])
        self.assert_no_submission()

    async def test_registered_non_image_bytes_are_rejected(self):
        source = self.add_upload("not-an-image.png", b"not an image")
        response = await self.generate(assets={"images[0]": source["ref"]})
        self.assertEqual(response.status, 422, await response.text())
        self.assertFalse((await response.json())["retryable"])
        self.assert_no_submission()

    async def test_unregistered_and_other_project_images_are_not_read_or_sent(self):
        owner = self.store.create_user("private-owner", PASSWORD)["id"]
        self.store.create_project("private", owner)
        private = self.add_upload("private.png", png("black"), project="private")
        comfy = "/api/file?filename=unregistered.png&type=output"
        for source in (private["ref"], "chouka/unregistered.png", comfy):
            with self.subTest(source=source):
                response = await self.generate(assets={"images[0]": source})
                self.assertEqual(response.status, 404, await response.text())
        self.assertEqual(self.comfy_requests, [])
        self.assert_no_submission()

    async def test_read_only_project_cannot_generate(self):
        owner = self.store.create_user("read-only-owner", PASSWORD)["id"]
        self.store.create_project("read-only", owner)
        self.store.set_grant(self.user, owner, "read")
        response = await self.generate(project="read-only")
        self.assertEqual(response.status, 403, await response.text())
        self.assert_no_submission()

    async def test_csrf_and_login_are_required(self):
        response = await self.client.post("/api/generate", json={"project": self.project})
        self.assertEqual(response.status, 403)
        self.client.session.cookie_jar.clear()
        response = await self.generate()
        self.assertEqual(response.status, 401)
        self.assert_no_submission()

    async def test_permission_revoked_during_generation_does_not_publish_artifact(self):
        submitted = await self.start_job()
        source = self.resources.lookup("upload", "original.png")
        with self.store._tx():
            self.store.db.execute("DELETE FROM project_resources WHERE project_id=? AND resource_id=?",
                                  (self.project, source["resource_id"]))
        done = await self.finish_job(submitted)
        self.assertEqual(done["status"], "error")
        self.assertFalse(done["retryable"])
        self.assertEqual(done["outputs"], [])
        self.assertEqual(list((self.root / "data").glob("artifacts/*/*")), [])
        self.assertEqual(len(self.received), 1)

    async def assert_snapshot(self, source, expected, parent_ref):
        submitted = await self.start_job(assets={"images[0]": source})
        assets = await self.indexed_assets(submitted)
        self.assertEqual(len(assets), 1)
        snapshot = assets[0]
        self.assertTrue(snapshot["ref"].startswith("chouka/lighting_input_"))
        ref = self.resources.reference(snapshot["ref"])
        record = self.resources.lookup(*ref)
        self.assertEqual(record["parent_id"], self.resources.lookup(*parent_ref)["resource_id"])
        self.assertTrue(record["external"])
        self.assertEqual(self.resources.local_path(*ref).read_bytes(), expected)
        response = await self.client.get(snapshot["url"])
        self.assertEqual(response.status, 200)
        self.assertEqual(await response.read(), expected)
        self.assertEqual(response.headers["Cache-Control"], "private, no-store")
        # The recorded input must survive subsequent canvas changes.
        self.update_card(assets={})
        done = await self.finish_job(submitted)
        self.assertEqual(done["status"], "done")
        self.assertEqual(self.received[0]["images"], [expected])
        self.assertEqual(await self.indexed_assets(submitted), assets)

    async def test_uncached_authorized_comfy_output_uses_trusted_view_and_input_snapshot(self):
        source = "/api/file?filename=render.png&subfolder=output&type=output"
        ref = self.resources.reference(source)
        self.resources.register(self.project, *ref)
        await self.assert_snapshot(source, png("yellow"), ref)
        self.assertEqual(self.comfy_requests, [{
            "query": {"filename": "render.png", "subfolder": "output", "type": "output"},
            "authorization": None,
        }])

    async def test_cached_comfy_output_is_read_locally_and_snapshotted(self):
        source = "/api/file?filename=cached.png&type=output"
        ref = self.resources.reference(source)
        self.resources.register(self.project, *ref)
        path = self.resources.local_path(*ref)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(png("green"))
        await self.assert_snapshot(source, png("green"), ref)
        self.assertEqual(self.comfy_requests, [])

    async def test_authorized_artifact_input_is_read_locally_and_snapshotted(self):
        source = "/api/artifact/previous-job/source.png"
        ref = self.resources.reference(source)
        self.resources.register(self.project, *ref)
        path = self.resources.local_path(*ref)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(png("green"))
        await self.assert_snapshot(source, png("green"), ref)
        self.assertEqual(self.comfy_requests, [])

    async def test_snapshot_registration_failure_removes_unregistered_input_copy(self):
        source = "/api/artifact/previous-job/source.png"
        ref = self.resources.reference(source)
        self.resources.register(self.project, *ref)
        path = self.resources.local_path(*ref)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(png("green"))
        with mock.patch.object(self.resources, "register", side_effect=ValueError("snapshot rejected")):
            response = await self.generate(assets={"images[0]": source})
        self.assertEqual(response.status, 400, await response.text())
        self.assertEqual(list((self.root / "data" / "uploads").glob("lighting_input_*")), [])
        self.assert_no_submission()

    async def test_artifact_storage_failure_is_error_and_does_not_retry(self):
        submitted = await self.start_job()
        with mock.patch("server.cloud_lighting.os.replace", side_effect=OSError("disk unavailable")):
            done = await self.finish_job(submitted)
        self.assertEqual(done["status"], "error")
        self.assertFalse(done["retryable"])
        self.assertEqual(done["outputs"], [])
        self.assertEqual(len(self.received), 1)
        self.assertEqual(list((self.root / "data" / "artifacts").rglob("*.part")), [])
        self.assertEqual(list((self.root / "data" / "artifacts").rglob("*.png")), [])


class CloudLightingControllerTests(CloudLightingFixture, unittest.IsolatedAsyncioTestCase):
    controller_mode = True

    async def test_delete_running_cloud_project_soft_deletes_and_discards_result(self):
        await self.assert_running_cloud_project_deletion()

    async def test_controller_runs_cloud_task_without_enqueuing_worker_job(self):
        distributed = self.application["distributed"]
        with mock.patch.object(distributed, "enqueue", side_effect=AssertionError("must not enqueue")) as enqueue:
            submitted = await self.start_job()
            response = await self.client.get("/api/jobs")
            self.assertEqual(response.status, 200, await response.text())
            listed = next(job for job in (await response.json())["jobs"] if job["id"] == submitted["id"])
            self.assertEqual(listed["nodeName"], "云端 API")
            self.assertEqual(listed["modelName"], "fake-lighting-model")
            done = await self.finish_job(submitted)
            self.assertEqual(done["status"], "done")
            self.assertEqual(done["nodeName"], "云端 API")
            enqueue.assert_not_called()
        self.assertIsNone(distributed.dispatch_status(submitted["id"]))
        self.assertEqual(len(self.received), 1)
        self.assertEqual(self.comfy_requests, [])

    async def test_restart_marks_live_cloud_jobs_error_in_local_and_controller_modes(self):
        rows = [{"id": status, "execution": "cloud_image", "status": status, "created": index,
                 "outputs": [], "step": "waiting", "retryable": False}
                for index, status in enumerate(("queued", "running", "done", "error"))]
        for controller in (False, True):
            with self.subTest(controller=controller), mock.patch.object(app, "CONTROLLER_MODE", controller):
                app.JOBS.clear()
                app.JOBS_FILE.write_text(json.dumps(rows), encoding="utf-8")
                LOAD_JOBS()
                for status in ("queued", "running"):
                    restored = app.JOBS[status]
                    self.assertEqual(restored["status"], "error")
                    self.assertFalse(restored["retryable"])
                    self.assertTrue(restored["generation_unknown"])
                    self.assertIn("不要自动重试", restored["error"])
                    self.assertEqual(restored["step"], "")
                    self.assertIn("ended", restored)
                self.assertEqual(app.JOBS["done"]["status"], "done")
                self.assertEqual(app.JOBS["error"]["status"], "error")
        self.assertEqual(self.received, [])
        self.assertEqual(self.application["cloud_lighting"].tasks, {})
        self.save_jobs.assert_not_called()


if __name__ == "__main__":
    unittest.main()
