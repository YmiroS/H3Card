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
from server import cloud_images, cloud_lighting, local_relight
from server.cloud_lighting import (
    HEAD_MAX_PIXELS,
    HEAD_MAX_RATIO,
    HEAD_MIN_PIXELS,
    HEAD_SAFE_RATIO,
    PARTITION_SEND_MEGAPIXELS,
    head_box_safe,
    head_crop_size,
    lighting_size,
    partition_send_size,
)

PASSWORD = "Lighting-test-password-123"
PROMPT = "保留主体、构图和材质，左侧柔光，右侧轮廓光。"
LOAD_JOBS = app.load_jobs


def png(color, size=(4, 3)):
    output = BytesIO()
    Image.new("RGB", size, color).save(output, format="PNG")
    return output.getvalue()


def partition_record():
    """远端识别测试用的固定身份层：真实 kmeans 不在单测里跑，被测的是缓存与框内投票链路。

    层尺寸对齐 fixture 上游图（4x3），缓存回读时不会触发缩放。
    """
    np = local_relight._imports()[1]  # 本套用例默认不引 numpy，索引层要用就按服务端同一套懒加载
    layer = np.array([[1, 1, 2, 2], [1, 1, 2, 2], [1, 1, 2, 2]], np.uint8)
    entries = [
        {"index": 1, "box": [0.0, 0.0, 0.5, 1.0], "coverage": 0.5, "cx": 0.25},
        {"index": 2, "box": [0.5, 0.0, 1.0, 1.0], "coverage": 0.5, "cx": 0.75},
    ]
    return {"layer": layer, "entries": entries, "dropped": []}


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

    def test_head_crop_size_stays_inside_gateway_pixel_window(self):
        # 头肩特写按长边 768 缩出来只有约 21 万像素，低于网关 65.5 万下限会被直接 400 拒掉。
        for cw, ch in ((1420, 503), (768, 272), (300, 300), (600, 900), (8000, 8000)):
            with self.subTest(crop=(cw, ch)):
                tw, th = head_crop_size(cw, ch)
                self.assertEqual(tw % 16, 0)
                self.assertEqual(th % 16, 0)
                self.assertGreaterEqual(tw * th, HEAD_MIN_PIXELS)
                self.assertLessEqual(tw * th, HEAD_MAX_PIXELS)

    def test_head_crop_size_only_scales_proportionally(self):
        # 补像素只能等比放大；单独撑长一边会把 8.9:1 的图送给网关，直接被「长宽比超 3:1」拒掉。
        for cw, ch in ((768, 272), (1420, 503), (600, 900), (500, 500)):
            with self.subTest(crop=(cw, ch)):
                tw, th = head_crop_size(cw, ch)
                self.assertAlmostEqual(tw / th, cw / ch, delta=cw / ch * 0.1)

    def test_partition_send_size_fits_the_cloud_edit_request_rules(self):
        # 分区图也是一次真调云端编辑：宽高不为 16 的倍数或总像素越界，网关直接 400，
        # 用户只看到「识别失败」，那次配额却已经花出去了。
        for source in ((1920, 1080), (1080, 1920), (1440, 1440), (3392, 5056),
                       (5056, 3392), (8000, 8000), (640, 480), (4, 3),
                       (1, 32_000_000), (32_000_000, 1)):
            with self.subTest(source=source):
                info = {"width": source[0], "height": source[1]}
                width, height = map(int, partition_send_size(info).split("x"))
                self.assertEqual(width % 16, 0)
                self.assertEqual(height % 16, 0)
                self.assertLessEqual(width * height, PARTITION_SEND_MEGAPIXELS * 1024 * 1024)
                self.assertLessEqual(width * height, HEAD_MAX_PIXELS)

    def test_head_box_safe_tallens_a_flat_head_crop(self):
        # 人物偏扁时，上部 40% 的头肩切片扁过 3:1，往下放高到刚好合规就够了。
        flat = (0.30, 0.30, 0.70, 0.90)
        box = head_box_safe(flat, 1920, 816)
        crop = ((box[2] - box[0]) * 1920, (box[3] - box[1]) * 816)
        self.assertLessEqual(crop[0] / crop[1], HEAD_SAFE_RATIO + 0.15)
        self.assertGreater(box[3], local_relight.head_box(flat)[3])
        self.assertLess(box[3], flat[3])
        self.assertEqual([box[0], box[1], box[2]], [flat[0], flat[1], flat[2]])

    def test_head_box_safe_narrows_a_person_flatter_than_three_to_one(self):
        # 连人框自身都扁过 3:1 时放高也救不回来，只能以中心左右收窄。
        box = head_box_safe((0.05, 0.50, 0.95, 0.56), 1920, 816)
        self.assertLess(box[2] - box[0], 0.90)
        self.assertGreater(box[2] - box[0], 0.0)
        self.assertAlmostEqual((box[0] + box[2]) / 2, 0.5, delta=0.01)
        crop = ((box[2] - box[0]) * 1920, (box[3] - box[1]) * 816)
        self.assertLessEqual(crop[0] / crop[1], HEAD_SAFE_RATIO + 0.15)

    def test_head_box_safe_widens_a_tall_narrow_head_crop(self):
        # 远处站姿又高又窄，切片是 1:4 的竖条；先左右放宽借背景，放到边了才减高度。
        box = head_box_safe((0.70, 0.05, 0.74, 0.98), 1920, 816)
        crop = ((box[2] - box[0]) * 1920, (box[3] - box[1]) * 816)
        self.assertLessEqual(crop[1] / crop[0], HEAD_SAFE_RATIO + 0.15)
        self.assertGreater(box[2] - box[0], 0.74 - 0.70)
        self.assertLessEqual(0.0, box[0])
        self.assertLessEqual(box[2], 1.0)

    def test_head_box_safe_at_the_picture_edge_stays_in_bounds(self):
        # 贴着画面边的人物不能把裁切框推到画面外。
        for person in ((0.0, 0.0, 0.06, 1.0), (0.95, 0.02, 1.0, 0.99), (0.0, 0.90, 1.0, 0.99)):
            with self.subTest(person=person):
                box = head_box_safe(person, 1920, 816)
                self.assertTrue(all(0.0 <= v <= 1.0 for v in box))
                self.assertGreater(box[2], box[0])
                self.assertGreater(box[3], box[1])
                crop = ((box[2] - box[0]) * 1920, (box[3] - box[1]) * 816)
                self.assertLessEqual(max(crop[0] / crop[1], crop[1] / crop[0]),
                                     HEAD_SAFE_RATIO + 0.15)

    def test_head_submission_size_meets_both_gateway_limits(self):
        # 真实 400 的教训：送图同时卡总像素和长宽比，两个都得在裁切阶段守住。
        boxes = [(0.42, 0.20, 0.58, 0.95), (0.30, 0.44, 0.86, 0.60), (0.02, 0.70, 0.98, 0.99),
                 (0.05, 0.50, 0.95, 0.56), (0.70, 0.05, 0.74, 0.98), (0.0, 0.0, 1.0, 1.0)]
        for width, height in ((1920, 816), (1024, 1024), (8000, 500)):
            for person in boxes:
                with self.subTest(size=(width, height), person=person):
                    box = head_box_safe(person, width, height)
                    crop_w = max(1, round((box[2] - box[0]) * width))
                    crop_h = max(1, round((box[3] - box[1]) * height))
                    tw, th = head_crop_size(crop_w, crop_h)
                    self.assertLessEqual(max(tw / th, th / tw), HEAD_SAFE_RATIO + 0.15)
                    self.assertGreaterEqual(tw * th, HEAD_MIN_PIXELS)
                    self.assertLessEqual(tw * th, HEAD_MAX_PIXELS)

    def test_head_box_safe_leaves_a_normal_person_box_alone(self):
        # 普通比例的人物不该被动到头肩切片。
        upright = (0.42, 0.20, 0.58, 0.95)
        self.assertEqual(head_box_safe(upright, 1920, 816), local_relight.head_box(upright))

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
        # 识别用的内部能力：预检要按能力清单找到 API 图，测试环境也得有这一份。
        shutil.copyfile(ROOT / "manifests" / "seg_persons.json", manifests / "seg_persons.json")
        graphs = self.root / "graphs"
        graphs.mkdir()
        shutil.copyfile(ROOT / "graphs" / "seg_persons.api.json", graphs / "seg_persons.api.json")
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
        self.chat_received = []
        self.chat_payload = None
        self.chat_status = 200
        self.chat_result_image = None
        self.comfy_requests = []
        self.unexpected_requests = []
        self.gateway_reached = asyncio.Event()
        self.gateway_release = asyncio.Event()
        self.gateway_status = 200
        self.result_size = (4, 3)
        self.result_payload = None
        gateway = web.Application()
        gateway.router.add_post("/v1/images/edits", self.gateway)
        gateway.router.add_post("/v1/chat/completions", self.chat_gateway)
        gateway.router.add_get("/view", self.comfy_image)
        gateway.router.add_route("*", "/{path:.*}", self.unexpected_request)
        self.remote = TestServer(gateway)
        await self.remote.start_server()
        self.addAsyncCleanup(self.remote.close)
        self.config.write_text(json.dumps({
            "base_url": str(self.remote.make_url("/v1")), "api_key": "fake-lighting-secret",
            "model": "fake-lighting-model", "banana_model": "fake-banana-model",
            "size": "1024x1024",
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
        token = self.client.session.cookie_jar.filter_cookies(self.client.make_url("/"))[app.COOKIE].value
        self.store.set_phone(self.user, "13800138000", session_token=token)
        with self.store._tx():
            self.store.db.execute("UPDATE users SET display_name=? WHERE id=?",
                                  ("Lighting Display Only", self.user))
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
                              "end_user_name": request.headers.get("X-End-User-Name"),
                              "end_user_phone": request.headers.get("X-End-User-Phone"),
                              "authorization": request.headers.get("Authorization")})
        release = self.gateway_release
        self.gateway_reached.set()
        await release.wait()
        payload = self.result_payload if self.result_payload is not None else {
            "data": [{"b64_json": base64.b64encode(png("blue", self.result_size)).decode()}]}
        return web.json_response(payload, status=self.gateway_status,
                                 headers={"X-Request-ID": "lighting-request-1"})

    async def chat_gateway(self, request):
        self.chat_received.append({"authorization": request.headers.get("Authorization"),
                                   "end_user_name": request.headers.get("X-End-User-Name"),
                                   "end_user_phone": request.headers.get("X-End-User-Phone"),
                                   "body": await request.json()})
        image = self.chat_result_image if self.chat_result_image is not None \
            else png("blue", self.result_size)
        encoded = base64.b64encode(image).decode()
        payload = self.chat_payload if self.chat_payload is not None else {
            "choices": [{"message": {"content": f"![image](data:image/png;base64,{encoded})"}}],
            "usage": {"cost": 0.019}}
        return web.json_response(payload, status=self.chat_status,
                                 headers={"X-Request-ID": "banana-request-1"})

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
        self.assertEqual(self.chat_received, [])
        self.assertEqual(app.JOBS, {})
        self.assertEqual(self.application["cloud_lighting"].tasks, {})
        self.save_jobs.assert_not_called()

    async def banana_job(self, **extra):
        """Banana 任务立即返回，不需要阻塞网关；提交后直接把任务跑到终态。"""
        response = await asyncio.wait_for(self.generate(**extra), 5)
        self.assertEqual(response.status, 200, await response.text())
        submitted = await response.json()
        self.assertIn(submitted["status"], ("queued", "running"))
        done = await self.finish_job(submitted)
        return submitted, done

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
        self.headers.update({"X-End-User-Name": "forged-user", "X-End-User-Phone": "13900139000"})
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
        self.assertEqual(self.received[0]["end_user_name"], "lighting-owner")
        self.assertEqual(self.received[0]["end_user_phone"], "13800138000")
        for job in (submitted, done, app.JOBS[submitted["id"]], self.store.get_job(submitted["id"])):
            self.assertNotIn("phone", json.dumps(job))
            self.assertNotIn("13800138000", json.dumps(job))
        self.assertEqual(done["request_id"], "lighting-request-1")
        self.assertNotIn("fake-lighting-secret", json.dumps(done))
        self.assertGreaterEqual(self.save_jobs.call_count, 3)

    async def test_direct_mode_sends_two_images_in_order_and_indexes_both_inputs(self):
        reference = self.add_upload("reference.png", png("green", (5, 4)))
        submitted = await self.start_job(params={
            "prompt": PROMPT, "reference_mode": "direct", "reference_image": reference["url"]})
        self.assertEqual(submitted["referenceMode"], "direct")
        done = await self.finish_job(submitted)
        self.assertEqual(done["status"], "done")
        self.assertEqual(len(self.received), 1)
        self.assertEqual(self.received[0]["images"], [png("red"), png("green", (5, 4))])
        self.assertEqual([asset["ref"] for asset in await self.indexed_assets(submitted)],
                         ["chouka/original.png", "chouka/reference.png"])
        artifact = self.resources.lookup("artifact", f"{submitted['id']}/relight.png")
        self.assertEqual(artifact["parent_id"],
                         self.resources.lookup("upload", "original.png")["resource_id"])

    async def test_direct_mode_requires_a_reference_value(self):
        for reference in (None, "", "   ", 42):
            with self.subTest(reference=reference):
                response = await self.generate(params={
                    "prompt": PROMPT, "reference_mode": "direct", "reference_image": reference})
                self.assertEqual(response.status, 400, await response.text())
        self.assert_no_submission()

    async def test_direct_mode_reference_must_be_a_visible_project_image(self):
        owner = self.store.create_user("reference-owner", PASSWORD)["id"]
        self.store.create_project("reference-project", owner)
        foreign = self.add_upload("foreign.png", png("black"), project="reference-project")
        for reference, status in (("https://example.invalid/ref.png", 400),
                                  ("chouka/unregistered.png", 404), (foreign["ref"], 404)):
            with self.subTest(reference=reference):
                response = await self.generate(params={
                    "prompt": PROMPT, "reference_mode": "direct", "reference_image": reference})
                self.assertEqual(response.status, status, await response.text())
        self.assert_no_submission()

    async def test_direct_mode_rejects_unknown_reference_mode(self):
        response = await self.generate(params={"prompt": PROMPT, "reference_mode": "lightmap"})
        self.assertEqual(response.status, 400, await response.text())
        self.assert_no_submission()

    async def test_geometry_mode_sends_original_then_mannequin_and_indexes_both_inputs(self):
        mannequin = self.add_upload("mannequin.png", png("green", (5, 4)))
        registered = []
        original = self.resources.register_job_inputs

        def record(jid, refs):
            registered.append(dict(refs))
            return original(jid, refs)

        with mock.patch.object(self.resources, "register_job_inputs", side_effect=record):
            submitted = await self.start_job(params={
                "prompt": PROMPT, "reference_mode": "geometry",
                "geometry_prompt": "机位略高于眼平，左侧主光。",
                "geometry_png": mannequin["url"]})
        self.assertEqual(submitted["referenceMode"], "geometry")
        # 白模截图占 geometry_png 槽位，不能混进双图直传的 reference_image。
        self.assertEqual(list(registered[0]), ["images[0]", "geometry_png"])
        done = await self.finish_job(submitted)
        self.assertEqual(done["status"], "done")
        self.assertEqual(len(self.received), 1)
        self.assertEqual(self.received[0]["images"], [png("red"), png("green", (5, 4))])
        self.assertEqual([asset["ref"] for asset in await self.indexed_assets(submitted)],
                         ["chouka/original.png", "chouka/mannequin.png"])
        # 结果图的爹是原图，不是白模截图。
        artifact = self.resources.lookup("artifact", f"{submitted['id']}/relight.png")
        self.assertEqual(artifact["parent_id"],
                         self.resources.lookup("upload", "original.png")["resource_id"])

    async def test_geometry_mode_requires_a_mannequin_png(self):
        for png_ref in (None, "", "   ", 42):
            with self.subTest(geometry_png=png_ref):
                response = await self.generate(params={
                    "prompt": PROMPT, "reference_mode": "geometry", "geometry_png": png_ref})
                self.assertEqual(response.status, 400, await response.text())
        self.assert_no_submission()

    async def test_geometry_mode_mannequin_must_be_a_visible_project_image(self):
        owner = self.store.create_user("geometry-owner", PASSWORD)["id"]
        self.store.create_project("geometry-project", owner)
        foreign = self.add_upload("foreign-mannequin.png", png("black"), project="geometry-project")
        for png_ref, status in (("https://example.invalid/m.png", 400),
                                ("chouka/unregistered.png", 404), (foreign["ref"], 404)):
            with self.subTest(geometry_png=png_ref):
                response = await self.generate(params={
                    "prompt": PROMPT, "reference_mode": "geometry", "geometry_png": png_ref})
                self.assertEqual(response.status, status, await response.text())
        self.assert_no_submission()

    async def test_banana_provider_sends_mannequin_as_second_image_for_geometry(self):
        mannequin = self.add_upload("banana-mannequin.png", png("green"))
        submitted, done = await self.banana_job(params={
            "prompt": PROMPT, "image_provider": "banana", "reference_mode": "geometry",
            "geometry_png": mannequin["ref"]})
        self.assertEqual(submitted["referenceMode"], "geometry")
        self.assertEqual(done["status"], "done")
        content = self.chat_received[0]["body"]["messages"][0]["content"]
        self.assertEqual(len(content), 3)
        self.assertEqual(base64.b64decode(content[1]["image_url"]["url"].split(",", 1)[1]),
                         png("red"))
        self.assertEqual(base64.b64decode(content[2]["image_url"]["url"].split(",", 1)[1]),
                         png("green"))

    async def test_analyze_mode_ignores_reference_image_and_sends_one(self):
        reference = self.add_upload("ignored.png", png("green"))
        submitted = await self.start_job(params={
            "prompt": PROMPT, "reference_mode": "analyze", "reference_image": reference["ref"]})
        self.assertEqual(submitted["referenceMode"], "analyze")
        done = await self.finish_job(submitted)
        self.assertEqual(done["status"], "done")
        self.assertEqual(self.received[0]["images"], [png("red")])

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

    async def test_gateway_400_exposes_original_diagnostics_but_keeps_credentials_private(self):
        self.gateway_status = 400
        self.result_payload = {"error": {"message": "Unsupported size: fake-lighting-secret",
                                         "param": "size", "code": "invalid_size"}}
        with self.assertLogs(cloud_images.__name__, level="WARNING") as logs:
            done = await self.finish_job(await self.start_job())
        self.assertEqual(done["status"], "error")
        self.assertIn("HTTP 400", done["error"])
        self.assertFalse(done["retryable"])
        self.assertEqual(done["request_id"], "lighting-request-1")
        for detail in ("Unsupported size: [redacted]", "param=size", "invalid_size", "lighting-request-1"):
            self.assertIn(detail, done["error"])
        self.assertNotIn("fake-lighting-secret", done["error"])
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
                                                 "changed": {}, "prompt": PROMPT,
                                                 "provider": "gpt_image", "size": "1440x1072"})
        self.assert_no_submission()

    async def test_dry_run_reports_banana_provider_without_size(self):
        self.config.write_text('{"api_key":""}', encoding="utf-8")
        response = await self.generate(dry_run=True,
                                       params={"prompt": PROMPT, "image_provider": "banana"})
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {"dry_run": True, "execution": "cloud_image",
                                                 "changed": {}, "prompt": PROMPT,
                                                 "provider": "banana", "size": None})
        self.assert_no_submission()

    async def test_unknown_image_provider_is_rejected_before_any_submission(self):
        response = await self.generate(params={"prompt": PROMPT, "image_provider": "claude"})
        self.assertEqual(response.status, 400, await response.text())
        self.assertIn("gpt_image", await response.text())
        self.assert_no_submission()

    async def test_banana_provider_uses_chat_endpoint_and_records_model(self):
        self.headers.update({"X-End-User-Name": "forged-user", "X-End-User-Phone": "13900139000"})
        submitted, done = await self.banana_job(
            params={"prompt": PROMPT, "image_provider": "banana"})
        self.assertEqual(submitted["provider"], "banana")
        self.assertIsNone(submitted["requested_size"])
        self.assertEqual(done["status"], "done")
        self.assertEqual(done["provider"], "banana")
        self.assertEqual(done["modelName"], "fake-banana-model")
        self.assertEqual(done["request_id"], "banana-request-1")
        self.assertEqual(len(done["outputs"]), 1)
        # Banana 走 chat 接口，multipart 编辑端点必须一次都没收到请求。
        self.assertEqual(self.received, [])
        self.assertEqual(len(self.chat_received), 1)
        chat = self.chat_received[0]
        self.assertEqual(chat["authorization"], "Bearer fake-lighting-secret")
        self.assertEqual(chat["end_user_name"], "lighting-owner")
        self.assertEqual(chat["end_user_phone"], "13800138000")
        for job in (submitted, done, app.JOBS[submitted["id"]], self.store.get_job(submitted["id"])):
            self.assertNotIn("phone", json.dumps(job))
            self.assertNotIn("13800138000", json.dumps(job))
        body = chat["body"]
        self.assertEqual(body["model"], "fake-banana-model")
        self.assertEqual(body["modalities"], ["IMAGE"])
        self.assertFalse(body["stream"])
        self.assertNotIn("google", body)
        self.assertNotIn("extra_body", body)
        message = body["messages"][0]
        self.assertEqual(message["role"], "user")
        content = message["content"]
        self.assertEqual(content[0], {"type": "text", "text": PROMPT})
        self.assertEqual(len(content), 2)
        self.assertEqual(content[1]["type"], "image_url")
        self.assertTrue(content[1]["image_url"]["url"].startswith("data:image/png;base64,"))
        self.assertEqual(base64.b64decode(content[1]["image_url"]["url"].split(",", 1)[1]),
                         png("red"))

    async def test_banana_provider_ignores_megapixels_and_accepts_direct_reference(self):
        reference = self.add_upload("green-reference.png", png("green"))
        submitted, done = await self.banana_job(params={
            "prompt": PROMPT, "image_provider": "banana", "megapixels": 16,
            "reference_mode": "direct", "reference_image": reference["ref"]})
        self.assertEqual(submitted["megapixels"], 16)
        self.assertIsNone(submitted["requested_size"])
        self.assertEqual(done["status"], "done")
        body = self.chat_received[0]["body"]
        content = body["messages"][0]["content"]
        self.assertEqual(content[0]["text"], PROMPT)
        self.assertEqual(len(content), 3)
        self.assertEqual(base64.b64decode(content[1]["image_url"]["url"].split(",", 1)[1]),
                         png("red"))
        self.assertEqual(base64.b64decode(content[2]["image_url"]["url"].split(",", 1)[1]),
                         png("green"))

    async def test_banana_provider_is_covered_by_duplicate_card_conflict(self):
        response = await self.generate(params={"prompt": PROMPT, "image_provider": "banana"})
        self.assertEqual(response.status, 200, await response.text())
        duplicate = await self.generate(params={"prompt": PROMPT, "image_provider": "banana"})
        self.assertEqual(duplicate.status, 409, await response.text())
        self.assertEqual(len(self.chat_received), 1)
        tasks = list(self.application["cloud_lighting"].tasks.values())
        await asyncio.wait_for(asyncio.gather(*tasks), 10)


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


class SubjectsPerceptionPreflightTests(CloudLightingFixture, unittest.IsolatedAsyncioTestCase):
    """集群模式的识别提交期预检（Spec §5.4）：没有合格执行端要当场说清楚，不许静默排队。"""

    controller_mode = True

    def setUp(self):
        self.enterContext(mock.patch("server.local_relight.yolo_available", return_value=False))

    async def subjects(self, **extra):
        return await self.client.post("/api/lighting/subjects", headers=self.headers,
                                      json={"project": self.project,
                                            "image": self.upstream["ref"], **extra})

    def capabilities(self, *, classes, model_names=True):
        capabilities = {"hardware": {"os": {"name": "Windows"}},
                        "node_classes": sorted(classes),
                        "devices": [{"name": "RTX 4090", "type": "cuda",
                                     "memory_total": 24 * 1024 ** 3}],
                        "input_choices": {}, "input_types": {}}
        if model_names:
            capabilities["input_choices"] = {
                "ChoukaPersonSeg": {"model_name": ["person_yolov8m-seg.pt"]},
                "ChoukaFaceSeg": {"model_name": ["face_yolov8m.pt"]},
            }
        return capabilities

    def register(self, capabilities):
        """登记一台「ComfyUI 在线且空闲」的 Windows 执行端。

        只 register 不心跳时名册状态是 error（ComfyUI 未在线），预检会先卡在状态判据上，
        报不到节点类/权重那两层，所以这里补一次心跳把状态推到 idle。
        """
        distributed = self.application["distributed"]
        worker_id = distributed.register_worker("seg-node-1", capabilities)["worker_id"]
        distributed.heartbeat(worker_id, capabilities=capabilities, comfy_online=True)
        return distributed

    SEG_CLASSES = {"LoadImage", "ChoukaPersonSeg", "ChoukaFaceSeg", "ChoukaSamPrompt",
                   "ChoukaSegMerge", "ChoukaSaveIdentityLayer", "ChoukaSaveJson"}

    async def test_node_without_segmentation_classes_is_refused_at_submit(self):
        self.register(self.capabilities(classes={"LoadImage", "KSampler"}))
        response = await self.subjects(mode="local")
        text = await response.text()
        self.assertEqual(response.status, 501, text)
        self.assertIn("缺少此能力所需节点", text)
        self.assertEqual(self.application["cloud_lighting"].subject_jobs, {})

    async def test_node_without_weight_inventory_is_refused(self):
        """节点类齐了但权重清单缺失：预检就得报，不能派上去运行期才炸（Spec §10-C1）。"""
        self.register(self.capabilities(classes=self.SEG_CLASSES, model_names=False))
        response = await self.subjects(mode="local")
        self.assertEqual(response.status, 501, await response.text())
        self.assertIn("模型", await response.text())

    async def test_qualified_node_passes_the_preflight(self):
        self.register(self.capabilities(classes=self.SEG_CLASSES))
        work = mock.patch.object(self.application["cloud_lighting"], "_subjects_work",
                                 return_value=([], "node"))
        with work:
            response = await self.subjects(mode="local")
        self.assertEqual(response.status, 200, await response.text())

    async def test_remote_partition_skips_the_cluster_check(self):
        """远端分区只在服务机做索引层投票：一台执行端都没登记也不能拦（风险 R1 的反例）。"""
        service = self.application["cloud_lighting"]
        plan = service._subjects_plan({"project": self.project, "image": self.upstream["ref"],
                                       "mode": "remote"})
        await service._preflight_segmentation(plan, {"id": self.user})


class StubComfySession:
    """假 ComfyUI 会话：只认 /view（按文件名给字节）和 /history/<pid>（给执行状态）两种取法。

    产物与状态都从宿主用例对象上现取，所以用例中途改 self.files / self.blobs 也能生效。
    """

    def __init__(self, owner):
        self.owner = owner

    def get(self, url, *, params=None):
        return StubComfyResponse(self.owner, url, params)


class StubComfyResponse:
    def __init__(self, owner, url, params):
        self.owner, self.url, self.params = owner, url, params or {}
        self.status = 200
        self.payload = None
        self._body = b""

    async def __aenter__(self):
        if "/history/" in self.url:
            self.payload = {self.url.rsplit("/", 1)[-1]: self.owner.history_entry}
        else:
            name = self.params.get("filename")
            if name not in self.owner.blobs:
                self.status = 404
            else:
                self._body = self.owner.blobs[name]
        return self

    async def __aexit__(self, *_exc):
        return False

    async def json(self):
        return self.payload

    async def read(self):
        return self._body


class SubjectsNodeSegmentationTests(CloudLightingFixture, unittest.IsolatedAsyncioTestCase):
    """整图自动识别交给节点跑（M2）：只吃「身份索引层 PNG + 条目 JSON」这一份契约。

    交给 ComfyUI 的五个动作（会话 / 上传 / 拼图 / 提交 / 取产物）整组换成假件，
    测的是服务端这侧的收线口径：产物怎么认、尺寸怎么卡、编号从哪来、失败了说什么。
    """

    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.enterContext(mock.patch.dict(os.environ, {"CHOUKA_SEG_VIA_NODE": "1"}))
        self.backend_calls = {"upload": [], "patch": [], "submit": [], "collect": 0}
        self.files = [{"kind": "file", "filename": "segidx_00001_.png",
                       "subfolder": "chouka", "type": "output"},
                      {"kind": "file", "filename": "segentries_00001_json.json",
                       "subfolder": "chouka", "type": "output"}]
        self.history_entry = {"status": {"status_str": "success", "completed": True,
                                         "messages": []}}
        self.blobs = {}
        node = self.application["comfy_node"]
        self.real_node = dict(node)
        node["http"] = "http://fake-comfy"
        node["session"] = StubComfySession(self)
        node["upload"] = self.stub_upload
        node["patch"] = self.stub_patch
        node["submit"] = self.stub_submit
        node["collect"] = self.stub_collect
        # 假 ComfyUI 不会把作业停在「排队中」，等产物那段按秒级判超时即可，别真等 180 秒
        self.application["cloud_lighting"].SEG_TIMEOUT_SECONDS = 0.2

    def set_layer(self, rows):
        np = local_relight._imports()[1]  # 本套用例默认不引 numpy，按服务端同一套懒加载取
        output = BytesIO()
        Image.fromarray(np.asarray(rows, np.uint8), mode="L").save(output, format="PNG")
        self.blobs["segidx_00001_.png"] = output.getvalue()

    def set_entries(self, payload):
        self.blobs["segentries_00001_json.json"] = json.dumps(payload, ensure_ascii=False).encode()

    async def stub_upload(self, session, field_name, filename, data):
        self.backend_calls["upload"].append(filename)
        return f"chouka/{filename}"

    def stub_patch(self, cap, params, uploaded):
        self.backend_calls["patch"].append((cap["id"], dict(params), dict(uploaded)))
        return {"1": {"class_type": "LoadImage", "inputs": {"image": uploaded["images[0]"]}}}

    async def stub_submit(self, app_, graph, prompt_id=None, *, capability=None):
        self.backend_calls["submit"].append((prompt_id, capability))
        # 真机上 ComfyUI 只认标准格式 UUID，所以服务端不自造 id，这里照生产回一个服务端生成的
        return "0f1e2d3c-4b5a-4978-8675-4321fedcba09"

    async def stub_collect(self, session, pid, *, wait_history=False):
        self.backend_calls["collect"] += 1
        return self.files

    async def asyncTearDown(self):
        node = self.application["comfy_node"]
        for key, value in self.real_node.items():
            node[key] = value
        await super().asyncTearDown()

    def two_person_layer(self):
        """4x3 的层：左两列是 2 号、右两列是 1 号 —— 编号来自节点，服务端不许重排。"""
        self.set_layer([[2, 2, 1, 1]] * 3)
        self.set_entries({"count": 2, "dropped": 0, "entries": [
            {"index": 1, "box": [0.5, 0.0, 1.0, 1.0], "coverage": 0.5, "cx": 0.75},
            {"index": 2, "box": [0.0, 0.0, 0.5, 1.0], "coverage": 0.5, "cx": 0.25}]})

    async def subjects(self, **extra):
        return await self.client.post("/api/lighting/subjects", headers=self.headers,
                                      json={"project": self.project,
                                            "image": self.upstream["ref"], **extra})

    async def test_layer_and_entries_become_candidates(self):
        self.two_person_layer()
        response = await self.subjects(mode="local", sensitivity="strict")
        self.assertEqual(response.status, 200, await response.text())
        payload = await response.json()
        self.assertEqual(payload["engine"], "node")
        self.assertIsNone(payload["partition"])
        self.assertEqual([item["id"] for item in payload["candidates"]], ["p1", "p2"])
        self.assertEqual(payload["candidates"][0]["box"], [0.5, 0.0, 1.0, 1.0])
        self.assertTrue(payload["candidates"][0]["mask"].startswith("data:image/png;base64,"))
        self.assertTrue(self.backend_calls["upload"][0].startswith("ck_"))
        cap, params, uploaded = self.backend_calls["patch"][0]
        self.assertEqual((cap, params), ("seg_persons", {"min_area_ratio": 0.01}))
        self.assertTrue(uploaded["images[0]"].startswith("chouka/ck_"))
        self.assertEqual(self.backend_calls["submit"][0][1], "seg_persons")
        # 不自造 prompt_id：真机 ComfyUI 只认标准 UUID，编个 hex 会被整单拒收
        self.assertIsNone(self.backend_calls["submit"][0][0])

    async def test_switch_off_keeps_the_in_process_path(self):
        self.two_person_layer()
        with mock.patch.dict(os.environ, {"CHOUKA_SEG_VIA_NODE": "0"}):
            with mock.patch.object(self.application["cloud_lighting"], "_subjects_work",
                                   return_value=([], "yolo")) as work:
                response = await self.subjects(mode="local")
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual((await response.json())["engine"], "yolo")
        work.assert_called_once()
        self.assertEqual(self.backend_calls["submit"], [])

    async def test_point_and_box_stay_in_process(self):
        """点选 / 框选这一轮还没进节点（M2-10）：开关开着也不能悄悄改路。"""
        self.two_person_layer()
        with mock.patch.object(self.application["cloud_lighting"], "_subjects_work",
                               return_value=([], "yolo")) as work:
            response = await self.subjects(mode="local", point=[0.5, 0.5])
        self.assertEqual(response.status, 200, await response.text())
        work.assert_called_once()
        self.assertEqual(self.backend_calls["submit"], [])

    async def test_layer_with_wrong_size_is_refused(self):
        """节点回传的层多一列也不收：拉伸会把相邻身份按面积投票掉，错得看不出来。"""
        self.two_person_layer()
        self.set_layer([[2, 2, 1, 1, 1]] * 3)
        response = await self.subjects(mode="local")
        text = await response.text()
        self.assertEqual(response.status, 502, text)
        self.assertIn("不做拉伸", text)

    async def test_missing_entries_artifact_is_refused(self):
        self.set_layer([[1, 1, 1, 1]] * 3)
        self.files = [item for item in self.files if not item["filename"].startswith("segentries")]
        response = await self.subjects(mode="local")
        text = await response.text()
        self.assertEqual(response.status, 502, text)
        self.assertIn("没出齐产物", text)

    async def test_execution_failure_reads_the_node_reason(self):
        """作业执行失败时不能回「等超时」：ComfyUI 给的失败原因要念出来才查得动。"""
        self.files = []
        self.history_entry = {"status": {"status_str": "error", "completed": True,
                                         "messages": [["execution_failed",
                                                       "person_yolov8m-seg.pt 不在位"]]}}
        response = await self.subjects(mode="local")
        text = await response.text()
        self.assertEqual(response.status, 502, text)
        self.assertIn("节点识别执行失败", text)
        self.assertIn("person_yolov8m-seg.pt 不在位", text)

    async def test_pending_job_times_out_without_resenting(self):
        """跑不完就明说等超时，并且绝不当场重提：重复提交等于再占一次队列。"""
        self.files = []
        response = await self.subjects(mode="local")
        text = await response.text()
        self.assertEqual(response.status, 504, text)
        self.assertIn("还没出结果", text)
        self.assertIn("没有重复提交", text)
        self.assertEqual(len(self.backend_calls["submit"]), 1)
        self.assertGreater(self.backend_calls["collect"], 1)

    async def test_dropped_identities_are_explained(self):
        self.set_layer([[1, 1, 1, 1]] * 3)
        self.set_entries({"count": 1, "dropped": 3, "entries": [
            {"index": 1, "box": [0.0, 0.0, 1.0, 1.0], "coverage": 1.0, "cx": 0.5}]})
        response = await self.subjects(mode="local")
        self.assertEqual(response.status, 200, await response.text())
        payload = await response.json()
        self.assertIn("255", payload["note"])
        self.assertEqual(len(payload["candidates"]), 1)


class CloudLightingLocalTests(CloudLightingFixture, unittest.IsolatedAsyncioTestCase):
    """局部打光：识别端点门禁与提交校验；dry_run 不触分割、不调云端。"""

    def setUp(self):
        # 这些用例 mock 的是 rembg 整图路；钉死实例分割不可用，避免本机权重就位后主路走 YOLO 绕过 mock。
        patcher = mock.patch("server.local_relight.yolo_available", return_value=False)
        patcher.start()
        self.addCleanup(patcher.stop)

    def local_params(self, **over):
        params = {"prompt": PROMPT, "reference_mode": "local",
                  "local_subjects": [{"id": "p1", "kind": "person", "label": "人物 1",
                                      "box": [0.1, 0.1, 0.4, 0.9], "source": "auto"}],
                  "local_strength": "standard", "local_edge": "soft"}
        params.update(over)
        return params

    async def subjects(self, **extra):
        return await self.client.post("/api/lighting/subjects", headers=self.headers,
                                      json={"project": self.project,
                                            "image": self.upstream["ref"], **extra})

    async def test_subjects_returns_501_when_segmentation_unavailable(self):
        with mock.patch("server.cloud_lighting.local_relight.in_process_ready", return_value=False):
            response = await self.subjects()
        self.assertEqual(response.status, 501, await response.text())
        self.assertIn("还没接入", await response.text())
        self.assertEqual(self.received, [])

    async def test_subjects_requires_an_image(self):
        response = await self.client.post("/api/lighting/subjects", headers=self.headers,
                                          json={"project": self.project})
        self.assertEqual(response.status, 400, await response.text())

    async def test_subjects_rejects_invalid_box(self):
        with mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True):
            response = await self.subjects(box=[0.5, 0.5, 0.2, 0.9])
        self.assertEqual(response.status, 400, await response.text())

    async def test_subjects_returns_person_candidates(self):
        people = [{"box": [0.1, 0.1, 0.4, 0.9], "mask": object(),
                   "coverage": 0.2, "cx": 0.25}]
        with mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True), \
                mock.patch("server.cloud_lighting.local_relight.segment_persons", return_value=people), \
                mock.patch("server.cloud_lighting.local_relight.mask_to_data_url",
                           return_value="data:image/png;base64,AAAA"):
            response = await self.subjects()
        self.assertEqual(response.status, 200, await response.text())
        candidates = (await response.json())["candidates"]
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]["id"], "p1")
        self.assertEqual(candidates[0]["kind"], "person")
        self.assertEqual(candidates[0]["mask"], "data:image/png;base64,AAAA")

    async def test_subjects_sensitivity_maps_to_min_area_ratio(self):
        people = [{"box": [0.1, 0.1, 0.4, 0.9], "mask": object(),
                   "coverage": 0.2, "cx": 0.25}]
        seen = {}
        def fake_segment(image, min_area_ratio=0.002):
            seen["min_area_ratio"] = min_area_ratio
            return people
        with mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True), \
                mock.patch("server.cloud_lighting.local_relight.segment_persons", side_effect=fake_segment), \
                mock.patch("server.cloud_lighting.local_relight.mask_to_data_url",
                           return_value="data:image/png;base64,AAAA"):
            response = await self.subjects(sensitivity="strict")
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(seen["min_area_ratio"],
                         cloud_lighting.local_relight.SENSITIVITY_MIN_AREA["strict"])

    async def test_subjects_unknown_sensitivity_falls_back_to_standard(self):
        seen = {}
        def fake_segment(image, min_area_ratio=0.002):
            seen["min_area_ratio"] = min_area_ratio
            return []
        with mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True), \
                mock.patch("server.cloud_lighting.local_relight.segment_persons", side_effect=fake_segment):
            response = await self.subjects(sensitivity="nonsense")
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(seen["min_area_ratio"],
                         cloud_lighting.local_relight.MIN_PERSON_AREA_RATIO)

    async def test_subjects_rejects_invalid_point(self):
        with mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True):
            response = await self.subjects(point=[0.5, 1.4])
        self.assertEqual(response.status, 400, await response.text())

    async def test_subjects_returns_point_candidate(self):
        seen = {}
        def fake_point(image, point):
            seen["point"] = list(point)
            return {"box": [0.3, 0.2, 0.7, 0.8], "mask": object(), "coverage": 0.11}
        with mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True), \
                mock.patch("server.cloud_lighting.local_relight.segment_point", side_effect=fake_point), \
                mock.patch("server.cloud_lighting.local_relight.mask_to_data_url",
                           return_value="data:image/png;base64,AAAA"):
            response = await self.subjects(point=[0.52, 0.44])
        self.assertEqual(response.status, 200, await response.text())
        candidates = (await response.json())["candidates"]
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]["id"], "c0")
        # 点选默认按人物处理，才能吃到接地阴影与头肩补光。
        self.assertEqual(candidates[0]["kind"], "person")
        self.assertEqual(candidates[0]["mode"], "point")
        self.assertEqual(candidates[0]["point"], [0.52, 0.44])
        self.assertEqual(candidates[0]["mask"], "data:image/png;base64,AAAA")
        self.assertEqual(seen["point"], [0.52, 0.44])

    async def test_local_submit_requires_subjects_or_mask(self):
        response = await self.generate(params=self.local_params(local_subjects=[]))
        self.assertEqual(response.status, 400, await response.text())
        self.assertIn("还没选对象", await response.text())

    async def test_local_submit_rejects_bad_strength(self):
        response = await self.generate(params=self.local_params(local_strength="wild"))
        self.assertEqual(response.status, 400, await response.text())

    async def test_local_submit_rejects_subject_without_box(self):
        response = await self.generate(params=self.local_params(
            local_subjects=[{"id": "p1", "kind": "person", "source": "auto"}]))
        self.assertEqual(response.status, 400, await response.text())

    async def test_local_submit_rejects_point_subject_without_point(self):
        """点选对象丢了点击坐标就只能退化成框选，宁可拦下来也别悄悄换一种分割。"""
        response = await self.generate(params=self.local_params(local_subjects=[
            {"id": "c1", "kind": "person", "label": "点选人物 1",
             "box": [0.1, 0.1, 0.4, 0.6], "source": "manual", "mode": "point"}]))
        self.assertEqual(response.status, 400, await response.text())
        self.assertIn("点击位置", await response.text())

    async def test_local_submit_rejects_unknown_mode(self):
        response = await self.generate(params=self.local_params(local_subjects=[
            {"id": "c1", "kind": "person", "label": "点选人物 1",
             "box": [0.1, 0.1, 0.4, 0.6], "source": "manual", "mode": "lasso"}]))
        self.assertEqual(response.status, 400, await response.text())

    async def test_unknown_reference_mode_rejected(self):
        response = await self.generate(params={"prompt": PROMPT, "reference_mode": "bogus"})
        self.assertEqual(response.status, 400, await response.text())

    async def test_local_dry_run_validates_but_never_segments_or_calls_gateway(self):
        with mock.patch("server.cloud_lighting.local_relight.segment_persons",
                        side_effect=AssertionError("dry_run must not segment")), \
                mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True):
            response = await self.generate(params=self.local_params(), dry_run=True)
        self.assertEqual(response.status, 200, await response.text())
        body = await response.json()
        self.assertEqual(body["dry_run"], True)
        self.assertEqual(body["changed"], {})
        self.assertEqual(body["execution"], "cloud_image")
        self.assertEqual(self.received, [])
        self.assertEqual(self.application["cloud_lighting"].tasks, {})

    async def test_local_rehearsal_submit_needs_no_cloud_config(self):
        """演练模式的提交不依赖云端出图配置（没配 cloud-ai-config 也能建任务）。"""
        np = cloud_lighting.local_relight._imports()[1]

        def fake_persons(img, **kwargs):
            height, width = np.asarray(img).shape[:2]
            return [{"box": (0.1, 0.1, 0.9, 0.9),
                     "mask": np.ones((height, width), np.float32)}]

        with mock.patch.dict(os.environ, {"CHOUKA_REHEARSAL": "1"}), \
                mock.patch("server.cloud_lighting.local_relight.segment_persons",
                           side_effect=fake_persons):
            response = await self.generate(params=self.local_params())
            self.assertEqual(response.status, 200, await response.text())
            submitted = await response.json()
            # 出图是后台任务：打桩撤掉之前就得让它跑完，否则它用到的是真的分割。
            for _ in range(400):
                status = app.JOBS.get(submitted["id"], {}).get("status")
                if status in ("done", "error"):
                    break
                await asyncio.sleep(0.05)
        # modelName 是整条链路跑完才落上去的，提交返回的那一份只是排队快照，不能当结果读。
        job = app.JOBS[submitted["id"]]
        self.assertEqual(job["modelName"], "rehearsal（演练）", job.get("error"))
        self.assertEqual(self.received, [])

    async def test_local_rehearsal_runs_full_chain_without_gateway(self):
        def fake_persons(img, **kwargs):
            array = cloud_lighting.local_relight._imports()[1].asarray(img)
            height, width = array.shape[:2]
            return [{"box": (0.1, 0.1, 0.9, 0.9),
                     "mask": __import__("numpy").ones((height, width), __import__("numpy").float32)}]

        with mock.patch.dict(os.environ, {"CHOUKA_REHEARSAL": "1"}), \
                mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True), \
                mock.patch("server.cloud_lighting.local_relight.segment_persons",
                           side_effect=fake_persons):
            response = await self.generate(params=self.local_params())
            self.assertEqual(response.status, 200, await response.text())
            submitted = await response.json()
            for _ in range(400):
                status = app.JOBS.get(submitted["id"], {}).get("status")
                if status in ("done", "error"):
                    break
                await asyncio.sleep(0.05)
        job = app.JOBS[submitted["id"]]
        self.assertEqual(job["status"], "done", job.get("error"))
        self.assertEqual(self.received, [])
        self.assertEqual(self.chat_received, [])
        self.assertEqual(job["modelName"], "rehearsal（演练）")
        self.assertEqual(len(job["outputs"]), 1)
        response = await self.client.get(job["outputs"][0]["url"])
        self.assertEqual(response.status, 200)
        payload = await response.read()
        self.assertTrue(payload.startswith(b"\x89PNG"), "artifact must be a PNG")

    async def _run_local_chain(self, params):
        """跑一遍局部打光链路，返回接地阴影用的主光方位角。"""
        np = cloud_lighting.local_relight._imports()[1]
        seen = {}

        def fake_persons(img, **kwargs):
            height, width = np.asarray(img).shape[:2]
            return [{"box": (0.1, 0.1, 0.9, 0.9),
                     "mask": np.ones((height, width), np.float32)}]

        def fake_grounding(out, base, mask, key_azimuth=45.0, **tuning):
            seen["azimuth"] = key_azimuth
            seen["grounding_tuning"] = tuning
            return out

        seen["face_guard"] = []
        seen["guard_tuning"] = {}

        def fake_face_guard(base, out, mask, person_boxes, **tuning):
            seen["face_guard"].append(len(person_boxes))
            seen["guard_tuning"] = tuning
            return out

        seen["tint"] = []
        real_composite = cloud_lighting.local_relight.composite
        seen["falloff"] = None

        def spy_composite(base, relit, mask, edge="soft", **kwargs):
            seen["falloff"] = kwargs.get("falloff")
            return real_composite(base, relit, mask, edge, **kwargs)

        def fake_tint(out, mask, amount):
            seen["tint"].append(amount)
            return out

        with mock.patch.dict(os.environ, {"CHOUKA_REHEARSAL": "1"}), \
                mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True), \
                mock.patch("server.cloud_lighting.local_relight.segment_persons",
                           side_effect=fake_persons), \
                mock.patch("server.cloud_lighting.local_relight.composite",
                           side_effect=spy_composite), \
                mock.patch("server.cloud_lighting.local_relight.face_guard",
                           side_effect=fake_face_guard), \
                mock.patch("server.cloud_lighting.local_relight.tint_match",
                           side_effect=fake_tint), \
                mock.patch("server.cloud_lighting.local_relight.grounding",
                           side_effect=fake_grounding):
            response = await self.generate(params=params)
            self.assertEqual(response.status, 200, await response.text())
            submitted = await response.json()
            for _ in range(400):
                status = app.JOBS.get(submitted["id"], {}).get("status")
                if status in ("done", "error"):
                    break
                await asyncio.sleep(0.05)
        self.assertEqual(app.JOBS[submitted["id"]]["status"], "done",
                         app.JOBS[submitted["id"]].get("error"))
        return seen

    async def test_local_grounding_uses_local_lights_first(self):
        """局部打光按自己的灯位算接地阴影方向，不跟灯位打光那套灯混用。"""
        seen = await self._run_local_chain(self.local_params(
            lights=[{"id": "l1", "azimuth": 315, "elevation": 35, "intensity": 8, "color": "#ffffff"}],
            local_lights=[{"id": "l1", "azimuth": 200, "elevation": 10, "intensity": 9, "color": "#ffffff"}]))
        self.assertEqual(seen["azimuth"], 200)

    async def test_local_grounding_ignores_shared_lights(self):
        """局部打光不借灯位打光页那套共享灯：没有局部灯位就是沿用原图光。"""
        seen = await self._run_local_chain(self.local_params(
            lights=[{"id": "l1", "azimuth": 315, "elevation": 35, "intensity": 8, "color": "#ffffff"}]))
        self.assertIsNone(seen["azimuth"])

    async def test_local_grounding_without_lights_keeps_symmetric_slope(self):
        """A6：没灯位时 key_azimuth 为空，接地坡向不再拿写死的 45° 往一侧偏。"""
        seen = await self._run_local_chain(self.local_params())
        self.assertIsNone(seen["azimuth"])

    async def test_local_face_guard_runs_on_selected_people_by_default(self):
        """脸部保形默认开，每个选中人物各处理一次头部区域。"""
        seen = await self._run_local_chain(self.local_params())
        self.assertEqual(seen["face_guard"], [1])

    async def test_local_face_guard_can_be_switched_off(self):
        """面板关掉后整步跳过，成品直接用模型像素。"""
        seen = await self._run_local_chain(self.local_params(local_face_guard=False))
        self.assertEqual(seen["face_guard"], [])

    async def test_local_fuse_tint_runs_with_default_amount(self):
        """色调回拉默认按面板档位跑一次。"""
        seen = await self._run_local_chain(self.local_params())
        self.assertEqual(seen["tint"], [local_relight.TINT["amount"]])

    async def test_local_fuse_tint_amount_is_clamped_into_range(self):
        """越界的回拉比例夹到 0–1，避免把人物颜色乘飞。"""
        seen = await self._run_local_chain(self.local_params(local_fuse_tint=4.5))
        self.assertEqual(seen["tint"], [1.0])

    async def test_local_fuse_tint_can_be_switched_off(self):
        """回拉设为 0（或 false）时整步跳过。"""
        for value in (0, False):
            with self.subTest(value=value):
                seen = await self._run_local_chain(self.local_params(local_fuse_tint=value))
                self.assertEqual(seen["tint"], [])

    async def test_local_tuning_defaults_match_built_in_values(self):
        """面板没给微调值时，各步用内置档，行为和改版前一致。"""
        seen = await self._run_local_chain(self.local_params())
        self.assertEqual(seen["falloff"], local_relight.EDGE_FALLOFF)
        self.assertEqual(seen["guard_tuning"], {
            "head_ratio": local_relight.FACE_GUARD["ratio"],
            "sigma_frac": local_relight.FACE_GUARD["sigma_frac"]})
        self.assertEqual(seen["grounding_tuning"], {
            "shadow_strength": local_relight.SHADOW["strength"],
            "pool_strength": local_relight.POOL["strength"]})

    async def test_local_tuning_values_reach_each_step(self):
        """面板滑杆的值一路传到对应处理步骤。"""
        seen = await self._run_local_chain(self.local_params(
            local_edge_falloff=9.0, local_guard_area=0.50, local_guard_sigma=0.15,
            local_shadow_strength=0.30, local_pool_strength=0.50))
        self.assertEqual(seen["falloff"], 9.0)
        self.assertEqual(seen["guard_tuning"], {"head_ratio": 0.50, "sigma_frac": 0.15})
        self.assertEqual(seen["grounding_tuning"], {"shadow_strength": 0.30,
                                                    "pool_strength": 0.50})

    async def test_local_tuning_is_clamped_and_garbage_falls_back(self):
        """越界的夹进范围，非数字退回内置值，免得手滑把人物抹没。"""
        seen = await self._run_local_chain(self.local_params(
            local_edge_falloff=99, local_guard_area=-2, local_guard_sigma="wide"))
        self.assertEqual(seen["falloff"], 14.0)
        self.assertEqual(seen["guard_tuning"], {
            "head_ratio": 0.25, "sigma_frac": local_relight.FACE_GUARD["sigma_frac"]})

    async def test_manual_point_subject_replays_point_and_counts_as_person(self):
        """点选对象提交时必须回放点选分割：改成按包围盒框选会把精细蒙版退化成一大块；
        同时它得进 person_boxes，接地阴影与头肩补光才轮得到它。"""
        np = cloud_lighting.local_relight._imports()[1]
        seen = {}

        def fake_persons(img, **kwargs):
            return []

        def fake_point(image, point):
            seen["point"] = list(point)
            width, height = image.size
            return {"box": [0.1, 0.1, 0.4, 0.6],
                    "mask": np.ones((height, width), np.float32), "coverage": 0.12}

        def fake_box(image, box):
            seen["box_called"] = True
            width, height = image.size
            return {"box": box, "mask": np.zeros((height, width), np.float32), "coverage": 0.0}

        def fake_grounding(out, base, mask, key_azimuth=45.0, **tuning):
            seen["grounding_coverage"] = float((np.asarray(mask) > 0.5).mean())
            return out

        params = self.local_params(local_subjects=[
            {"id": "c1", "kind": "person", "label": "点选人物 1",
             "box": [0.1, 0.1, 0.4, 0.6], "source": "manual", "mode": "point",
             "point": [0.2, 0.3]}])
        with mock.patch.dict(os.environ, {"CHOUKA_REHEARSAL": "1"}), \
                mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True), \
                mock.patch("server.cloud_lighting.local_relight.segment_persons",
                           side_effect=fake_persons), \
                mock.patch("server.cloud_lighting.local_relight.segment_point",
                           side_effect=fake_point), \
                mock.patch("server.cloud_lighting.local_relight.segment_box",
                           side_effect=fake_box), \
                mock.patch("server.cloud_lighting.local_relight.grounding",
                           side_effect=fake_grounding):
            response = await self.generate(params=params)
            self.assertEqual(response.status, 200, await response.text())
            submitted = await response.json()
            for _ in range(400):
                if app.JOBS.get(submitted["id"], {}).get("status") in ("done", "error"):
                    break
                await asyncio.sleep(0.05)
        job = app.JOBS[submitted["id"]]
        self.assertEqual(job["status"], "done", job.get("error"))
        self.assertEqual(seen["point"], [0.2, 0.3])
        self.assertNotIn("box_called", seen)
        self.assertEqual(seen.get("grounding_coverage"), 1.0)

    async def test_manual_object_subject_stays_out_of_grounding(self):
        """标成物体的手动对象不参与接地，避免给一块石头打接触阴影。"""
        np = cloud_lighting.local_relight._imports()[1]
        seen = {}

        def fake_persons(img, **kwargs):
            return []

        def fake_box(image, box):
            width, height = image.size
            return {"box": box, "mask": np.ones((height, width), np.float32), "coverage": 0.2}

        with mock.patch.dict(os.environ, {"CHOUKA_REHEARSAL": "1"}), \
                mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True), \
                mock.patch("server.cloud_lighting.local_relight.segment_persons",
                           side_effect=fake_persons), \
                mock.patch("server.cloud_lighting.local_relight.segment_box",
                           side_effect=fake_box), \
                mock.patch("server.cloud_lighting.local_relight.grounding",
                           side_effect=lambda *a, **k: seen.setdefault("grounded", True)):
            response = await self.generate(params=self.local_params(local_subjects=[
                {"id": "m1", "kind": "object", "label": "物体 1",
                 "box": [0.1, 0.1, 0.4, 0.6], "source": "manual", "mode": "box"}]))
            self.assertEqual(response.status, 200, await response.text())
            submitted = await response.json()
            for _ in range(400):
                if app.JOBS.get(submitted["id"], {}).get("status") in ("done", "error"):
                    break
                await asyncio.sleep(0.05)
        self.assertEqual(app.JOBS[submitted["id"]]["status"], "done",
                         app.JOBS[submitted["id"]].get("error"))
        self.assertNotIn("grounded", seen)


    # ---- 手工分割通道（Spec §7.1/§7.4：mode=manual 出粗底 + 位图短路回放）----

    def identity_png(self, side=16, value=1):
        """造一张 8 位索引 PNG（编辑器存的就是这种，只是浏览器侧走 canvas）。"""
        np = cloud_lighting.local_relight._imports()[1]
        buffer = BytesIO()
        Image.fromarray(np.full((side, side), value, np.uint8), "L").save(buffer, format="PNG")
        return buffer.getvalue()

    def manual_params(self, **over):
        layer = self.add_upload("manual-layer.png", self.identity_png())
        params = self.local_params(
            local_subjects=[{"id": "p1", "kind": "person", "label": "人物 1",
                             "box": [0.1, 0.1, 0.4, 0.9], "source": "auto",
                             "mask_index": 1}],
            local_manual={"layer": layer["url"], "ids": ["p1"]})
        params.update(over)
        return params

    async def test_manual_subjects_mode_returns_person_draft(self):
        seen = {}

        def fake_box(image, box):
            seen["box"] = list(box)
            return {"box": box, "mask": object(), "coverage": 0.13}

        with mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True), \
                mock.patch("server.cloud_lighting.local_relight.segment_box",
                           side_effect=fake_box), \
                mock.patch("server.cloud_lighting.local_relight.mask_to_data_url",
                           return_value="data:image/png;base64,AAAA"):
            response = await self.subjects(mode="manual", box=[0.2, 0.2, 0.6, 0.8])
        self.assertEqual(response.status, 200, await response.text())
        candidate = (await response.json())["candidates"][0]
        self.assertEqual(seen["box"], [0.2, 0.2, 0.6, 0.8])
        # K6：手工通道没声明类型时仍按人物回归，才吃得到接地与头肩补光
        self.assertEqual(candidate["kind"], "person")
        self.assertEqual(candidate["id"], "m0")
        self.assertEqual(candidate["mask"], "data:image/png;base64,AAAA")

    async def test_subjects_target_kind_is_orthogonal_to_mode(self):
        """类型和识别方式正交：编辑器选「物体」时，本地粗分割回来的就是物体，不再写死人物。"""
        with mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True), \
                mock.patch("server.cloud_lighting.local_relight.segment_box",
                           return_value={"box": [0.2, 0.2, 0.6, 0.8], "mask": object(),
                                         "coverage": 0.13}), \
                mock.patch("server.cloud_lighting.local_relight.mask_to_data_url",
                           return_value="data:image/png;base64,AAAA"):
            response = await self.subjects(mode="manual", box=[0.2, 0.2, 0.6, 0.8],
                                           target_kind="object")
        self.assertEqual(response.status, 200, await response.text())
        candidate = (await response.json())["candidates"][0]
        self.assertEqual(candidate["kind"], "object")
        self.assertEqual(candidate["label"], "框选物体")

    async def test_subjects_rejects_unknown_target_kind(self):
        with mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True):
            response = await self.subjects(mode="local", target_kind="cat")
        self.assertEqual(response.status, 400, await response.text())
        self.assertIn("目标类型", await response.text())

    async def test_manual_subjects_requires_a_box(self):
        with mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True):
            response = await self.subjects(mode="manual")
        self.assertEqual(response.status, 400, await response.text())
        self.assertIn("框住目标", await response.text())

    async def test_manual_layer_rejects_upload_mask_together(self):
        layer = self.add_upload("manual-layer.png", self.identity_png())
        response = await self.generate(params=self.manual_params(
            local_mask=layer["url"]))
        self.assertEqual(response.status, 400, await response.text())
        self.assertIn("二选一", await response.text())

    async def test_manual_layer_requires_a_layer_reference(self):
        response = await self.generate(params=self.local_params(
            local_subjects=[{"id": "p1", "kind": "person", "box": [0.1, 0.1, 0.4, 0.9],
                             "source": "auto", "mask_index": 1}],
            local_manual={"ids": ["p1"]}))
        self.assertEqual(response.status, 400, await response.text())
        self.assertIn("位图缺失", await response.text())

    async def test_manual_ids_without_mask_index_are_rejected(self):
        # 勾选了却没位图编号 = 会被静默少画一个人，必须报错（P0-4a 同一个毛病）
        params = self.manual_params()
        params["local_manual"]["ids"] = ["p1", "p2"]
        params["local_subjects"].append({"id": "p2", "kind": "person", "label": "人物 2",
                                         "box": [0.5, 0.1, 0.9, 0.9], "source": "auto"})
        response = await self.generate(params=params)
        self.assertEqual(response.status, 400, await response.text())
        self.assertIn("p2", await response.text())

    async def test_manual_bitmap_replaces_replay_and_never_resegments(self):
        """C1 验收终点：手工位图真读进出图，且不再跑任何分割（P0-3 短路回放）。"""
        np = cloud_lighting.local_relight._imports()[1]
        seen = {}

        def fail_segment(*args, **kwargs):
            raise AssertionError("有 mask_index 就不该再跑分割，手工成果会被冲掉")

        def fake_grounding(out, base, mask, key_azimuth=45.0, **tuning):
            seen["grounding_coverage"] = float((np.asarray(mask) > 0.5).mean())
            return out

        registered = []
        original = self.resources.register_job_inputs

        def record(job_id, refs):
            registered.append(dict(refs))
            return original(job_id, refs)

        with mock.patch.dict(os.environ, {"CHOUKA_REHEARSAL": "1"}), \
                mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True), \
                mock.patch("server.cloud_lighting.local_relight.segment_persons",
                           side_effect=fail_segment), \
                mock.patch("server.cloud_lighting.local_relight.segment_box",
                           side_effect=fail_segment), \
                mock.patch("server.cloud_lighting.local_relight.segment_point",
                           side_effect=fail_segment), \
                mock.patch("server.cloud_lighting.local_relight.grounding",
                           side_effect=fake_grounding), \
                mock.patch.object(self.resources, "register_job_inputs", side_effect=record):
            response = await self.generate(params=self.manual_params())
            self.assertEqual(response.status, 200, await response.text())
            submitted = await response.json()
            for _ in range(400):
                if app.JOBS.get(submitted["id"], {}).get("status") in ("done", "error"):
                    break
                await asyncio.sleep(0.05)
        job = app.JOBS[submitted["id"]]
        self.assertEqual(job["status"], "done", job.get("error"))
        # 整张位图都是身份 1 → 回贴范围就是全图
        self.assertAlmostEqual(seen["grounding_coverage"], 1.0, places=3)
        # B8：位图必须进 inputs 登记，否则出图权限过不了
        self.assertIn("local_manual_layer", registered[0])

    async def test_manual_identity_missing_from_bitmap_is_rejected(self):
        np = cloud_lighting.local_relight._imports()[1]
        seen = {}

        def fake_grounding(out, base, mask, key_azimuth=45.0, **tuning):
            seen["coverage"] = float((np.asarray(mask) > 0.5).mean())
            return out

        params = self.manual_params()
        params["local_subjects"][0]["mask_index"] = 9  # 位图里只有 1 号身份
        with mock.patch.dict(os.environ, {"CHOUKA_REHEARSAL": "1"}), \
                mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True), \
                mock.patch("server.cloud_lighting.local_relight.grounding",
                           side_effect=fake_grounding):
            response = await self.generate(params=params)
            self.assertEqual(response.status, 200, await response.text())
            submitted = await response.json()
            for _ in range(400):
                if app.JOBS.get(submitted["id"], {}).get("status") in ("done", "error"):
                    break
                await asyncio.sleep(0.05)
        job = app.JOBS[submitted["id"]]
        self.assertEqual(job["status"], "error", job.get("error"))
        self.assertIn("已经空了", job["error"])

    async def test_manual_and_auto_mixed_still_replays_the_auto_one(self):
        """没进过编辑器的候选照旧本地回放：短路只针对带编号的身份。"""
        np = cloud_lighting.local_relight._imports()[1]
        seen = {}

        def fake_persons(image, **kwargs):
            seen["segmented"] = True
            height, width = np.asarray(image).shape[:2]
            return [{"box": (0.1, 0.1, 0.4, 0.9),
                     "mask": np.ones((height, width), np.float32)},
                    {"box": (0.5, 0.1, 0.9, 0.9),
                     "mask": np.ones((height, width), np.float32)}]

        with mock.patch.dict(os.environ, {"CHOUKA_REHEARSAL": "1"}), \
                mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True), \
                mock.patch("server.cloud_lighting.local_relight.segment_persons",
                           side_effect=fake_persons):
            response = await self.generate(params=self.manual_params(
                local_subjects=[
                    {"id": "p1", "kind": "person", "label": "人物 1",
                     "box": [0.1, 0.1, 0.4, 0.9], "source": "auto", "mask_index": 1},
                    {"id": "p2", "kind": "person", "label": "人物 2",
                     "box": [0.5, 0.1, 0.9, 0.9], "source": "auto"}]))
            self.assertEqual(response.status, 200, await response.text())
            submitted = await response.json()
            # 这条链路要跑完整本地回放 + 接地 + 头肩 + 保形，本机忙时会顶到二十秒以上，
            # 等待预算按最坏情况给，别让它变成靠机器空闲才绿的用例。
            for _ in range(1800):
                if app.JOBS.get(submitted["id"], {}).get("status") in ("done", "error"):
                    break
                await asyncio.sleep(0.05)
        job = app.JOBS[submitted["id"]]
        self.assertEqual(job["status"], "done", job.get("error"))
        self.assertTrue(seen.get("segmented"))


class SubjectsJobTests(CloudLightingFixture, unittest.IsolatedAsyncioTestCase):
    """识别 job 化端点：建任务立即返回，步骤进度经 GET 轮询。"""

    def setUp(self):
        patcher = mock.patch("server.local_relight.yolo_available", return_value=False)
        patcher.start()
        self.addCleanup(patcher.stop)

    async def start_subjects_job(self, **extra):
        response = await self.client.post("/api/lighting/subjects/job", headers=self.headers,
                                          json={"project": self.project,
                                                "image": self.upstream["ref"], **extra})
        self.assertEqual(response.status, 200, await response.text())
        return await response.json()

    async def poll_subjects_job(self, job_id, timeout=10):
        deadline = asyncio.get_event_loop().time() + timeout
        while True:
            response = await self.client.get(f"/api/lighting/subjects/job/{job_id}")
            self.assertEqual(response.status, 200, await response.text())
            state = await response.json()
            if state["status"] in ("done", "failed"):
                return state
            if asyncio.get_event_loop().time() > deadline:
                self.fail(f"识别 job 超时未结束：{state}")
            await asyncio.sleep(0.05)

    async def test_local_job_polling_reaches_done(self):
        people = [{"box": [0.1, 0.1, 0.4, 0.9], "mask": object(),
                   "coverage": 0.2, "cx": 0.25}]
        with mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True), \
                mock.patch("server.cloud_lighting.local_relight.segment_persons",
                           return_value=people), \
                mock.patch("server.cloud_lighting.local_relight.mask_to_data_url",
                           return_value="data:image/png;base64,AAAA"):
            started = await self.start_subjects_job()
            self.assertIn("job_id", started)
            self.assertEqual(len(started["steps"]), 4)
            state = await self.poll_subjects_job(started["job_id"])
        self.assertEqual(state["status"], "done")
        self.assertEqual(state["mode"], "local")
        self.assertEqual(state["engine"], "rembg")
        self.assertEqual(state["step"], 3)
        self.assertEqual(len(state["candidates"]), 1)
        self.assertEqual(state["candidates"][0]["id"], "p1")
        self.assertEqual(state["error"], None)
        self.assertEqual(self.received, [])

    async def test_rehearsal_remote_job_reports_rehearsal_engine(self):
        people = [{"box": [0.1, 0.1, 0.4, 0.9], "mask": object(),
                   "coverage": 0.2, "cx": 0.25}]
        with mock.patch.dict(os.environ, {"CHOUKA_REHEARSAL": "1"}), \
                mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True), \
                mock.patch("server.cloud_lighting.local_relight.segment_persons",
                           return_value=people), \
                mock.patch("server.cloud_lighting.local_relight.mask_to_data_url",
                           return_value="data:image/png;base64,AAAA"):
            started = await self.start_subjects_job(mode="remote")
            seen_steps = set()
            state = None
            for _ in range(200):
                response = await self.client.get(
                    f"/api/lighting/subjects/job/{started['job_id']}")
                self.assertEqual(response.status, 200, await response.text())
                state = await response.json()
                seen_steps.add(state["step"])
                if state["status"] in ("done", "failed"):
                    break
                await asyncio.sleep(0.05)
        self.assertEqual(state["status"], "done")
        self.assertEqual(state["mode"], "remote")
        self.assertEqual(state["engine"], "rehearsal")
        # 演练模拟大模型耗时，轮询应能观察到「模型推理」这一步。
        self.assertIn(2, seen_steps)
        self.assertEqual(self.received, [])

    async def test_real_remote_job_uses_gateway_partition_image(self):
        record = partition_record()
        with mock.patch.dict(os.environ, {"CHOUKA_REHEARSAL": ""}), \
                mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True), \
                mock.patch("server.cloud_lighting.local_relight.partition_index_layer",
                           return_value=record) as partition, \
                mock.patch("server.cloud_lighting.local_relight.mask_to_data_url",
                           return_value="data:image/png;base64,AAAA"):
            started = await self.start_subjects_job(mode="remote")
            self.gateway_release.set()
            state = await self.poll_subjects_job(started["job_id"])
        self.assertEqual(state["status"], "done")
        self.assertEqual(state["engine"], "cloud")
        self.assertEqual(state["partition"], "fresh")
        self.assertEqual(len(state["candidates"]), 2)
        self.assertEqual([c["id"] for c in state["candidates"]], ["p1", "p2"])
        self.assertEqual(len(self.received), 1)
        fields = self.received[0]["fields"]
        self.assertEqual(fields["prompt"], local_relight.PARTITION_PROMPT)
        self.assertEqual(fields["quality"], "medium")
        width, height = map(int, fields["size"].split("x"))
        self.assertEqual(width % 16, 0)
        self.assertEqual(height % 16, 0)
        partition.assert_called_once()

    async def test_unknown_job_returns_404(self):
        response = await self.client.get("/api/lighting/subjects/job/nonsense",
                                         headers=self.headers)
        self.assertEqual(response.status, 404, await response.text())

    async def test_remote_rejects_point_selection(self):
        """远端分区只能按区域投票，点选没有可投票的面积，仍然只走本地模型。"""
        with mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True):
            response = await self.client.post("/api/lighting/subjects/job", headers=self.headers,
                                              json={"project": self.project,
                                                    "image": self.upstream["ref"],
                                                    "mode": "remote",
                                                    "point": [0.3, 0.4]})
        self.assertEqual(response.status, 400, await response.text())
        self.assertIn("点选", await response.text())

    async def test_same_remote_request_while_running_is_reused(self):
        """同一个识别请求还在跑时连点：复用任务号，不排第二遍队（远端一次就是一笔计费）。"""
        record = partition_record()
        with mock.patch.dict(os.environ, {"CHOUKA_REHEARSAL": ""}), \
                mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready", return_value=True), \
                mock.patch("server.cloud_lighting.local_relight.partition_index_layer",
                           return_value=record), \
                mock.patch("server.cloud_lighting.local_relight.mask_to_data_url",
                           return_value="data:image/png;base64,AAAA"):
            started = await self.start_subjects_job(mode="remote")
            again = await self.start_subjects_job(mode="remote")
            self.assertEqual(again["job_id"], started["job_id"])
            self.assertTrue(again.get("reused"))
            self.gateway_release.set()
            state = await self.poll_subjects_job(started["job_id"])
        self.assertEqual(state["status"], "done")
        self.assertEqual(len(self.received), 1)


class RemotePartitionCacheTests(CloudLightingFixture, unittest.IsolatedAsyncioTestCase):
    """远端分区的身份层缓存：同图复用不计费，框选在缓存层上投票，坏了的分区不回退。"""

    def setUp(self):
        self.enterContext(mock.patch.dict(os.environ, {"CHOUKA_REHEARSAL": ""}))
        self.enterContext(mock.patch("server.cloud_lighting.local_relight.legacy_segmentation_ready",
                                      return_value=True))
        self.enterContext(mock.patch("server.cloud_lighting.local_relight.mask_to_data_url",
                                     return_value="data:image/png;base64,AAAA"))

    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.record = partition_record()
        self.partition = self.enterContext(mock.patch(
            "server.cloud_lighting.local_relight.partition_index_layer",
            side_effect=lambda _image, **_kwargs: self.record))
        self.gateway_release.set()  # 网关立即放行，用例只数打了几次

    async def subjects(self, **extra):
        response = await self.client.post("/api/lighting/subjects", headers=self.headers,
                                          json={"project": self.project,
                                                "image": self.upstream["ref"], **extra})
        self.assertEqual(response.status, 200, await response.text())
        return await response.json()

    async def test_first_remote_pass_pays_and_caches_the_layer(self):
        first = await self.subjects(mode="remote")
        self.assertEqual(first["engine"], "cloud")
        self.assertEqual(first["partition"], "fresh")
        self.assertEqual([item["id"] for item in first["candidates"]], ["p1", "p2"])
        self.assertEqual(len(self.received), 1)
        self.assertTrue(list((self.root / "data" / "partition_cache").glob("*.png")))

    async def test_second_remote_pass_reuses_the_cached_layer_for_free(self):
        await self.subjects(mode="remote")
        again = await self.subjects(mode="remote")
        self.assertEqual(again["partition"], "cached")
        self.assertEqual(len(again["candidates"]), 2)
        # 复用缓存的那一次：网关没再被打，kmeans 也没再跑。
        self.assertEqual(len(self.received), 1)
        self.partition.assert_called_once()

    async def test_region_vote_on_cached_layer_costs_nothing(self):
        await self.subjects(mode="remote")
        boxed = await self.subjects(mode="remote", box=[0.0, 0.0, 0.5, 1.0])
        self.assertEqual(boxed["partition"], "cached")
        self.assertEqual([item["id"] for item in boxed["candidates"]], ["p1"])
        self.assertEqual(boxed["note"], None)
        self.assertEqual(len(self.received), 1)

    async def test_region_vote_on_background_says_so_without_candidates(self):
        np = local_relight._imports()[1]
        self.record = {
            "layer": np.array([[0, 1, 1, 2], [0, 1, 1, 2], [0, 1, 1, 2]], np.uint8),
            "entries": [{"index": 1, "box": [0.25, 0.0, 0.75, 1.0], "coverage": 0.3, "cx": 0.5},
                        {"index": 2, "box": [0.75, 0.0, 1.0, 1.0], "coverage": 0.2, "cx": 0.875}],
            "dropped": []}
        await self.subjects(mode="remote")
        boxed = await self.subjects(mode="remote", box=[0.0, 0.0, 0.2, 1.0])
        self.assertEqual(boxed["candidates"], [])
        self.assertIn("身份", boxed["note"])

    async def test_region_vote_across_two_identities_is_unreliable(self):
        await self.subjects(mode="remote")
        boxed = await self.subjects(mode="remote", box=[0.0, 0.0, 1.0, 1.0])
        self.assertEqual(boxed["candidates"], [])
        self.assertIn("不可靠", boxed["note"])

    async def test_remote_object_box_is_refused_instead_of_mislabelled(self):
        """分区提示词只按人分色：远端框选「物体」不能把框里的人当物体还回来，直接拦下并说明。"""
        response = await self.client.post("/api/lighting/subjects", headers=self.headers,
                                          json={"project": self.project,
                                                "image": self.upstream["ref"],
                                                "mode": "remote",
                                                "box": [0.0, 0.0, 0.5, 1.0],
                                                "target_kind": "object"})
        self.assertEqual(response.status, 400, await response.text())
        self.assertIn("本地", await response.text())
        # 拦在请求校验阶段：网关一次没打，分区层也没反解。
        self.assertEqual(self.received, [])
        self.partition.assert_not_called()

    async def test_broken_cache_is_dropped_and_rebuilt_not_reused(self):
        await self.subjects(mode="remote")
        for path in (self.root / "data" / "partition_cache").glob("*.png"):
            path.write_bytes(b"not-a-layer-png")
        again = await self.subjects(mode="remote")
        self.assertEqual(again["partition"], "renewed")
        self.assertIn("已失效", again["note"])
        # 坏缓存只用一次：读完就删，下一次重新出分区图而不是拿半截结果当候选。
        self.assertEqual(len(self.received), 2)
        self.assertEqual(self.partition.call_count, 2)


if __name__ == "__main__":
    unittest.main()
