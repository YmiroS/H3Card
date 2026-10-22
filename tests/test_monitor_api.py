"""真实临时认证、调度与项目库上的只读监控契约回归。"""
import asyncio
import copy
import json
import os
import sys
from contextlib import ExitStack
from pathlib import Path
import threading
import time
import unittest
from unittest.mock import patch

from aiohttp import web

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))

from auth_support import AuthFixture, PASSWORD
from distributed import DistributedStore, TEMPERATURE_MAX_GPU_INDEX, worker_capability_comparisons
from server.auth import COOKIE
from server.monitor import register_monitor_routes, safe_capabilities, safe_error
from server.routes import STATIC_ASSETS, register_page_routes


LEAK = "PRIVATE_SENTINEL_84"
BAD_LOG = f"password={LEAK} Bearer {LEAK} https://user:{LEAK}@internal.test/secret?token={LEAK}"


class MonitorAPITests(AuthFixture, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.auth_setup()
        self.monitor = self.auth.create_user("screen", PASSWORD, role="monitor")
        self.user = self.auth.create_user("artist", PASSWORD)
        with self.auth.lock, self.auth.db:
            self.auth.db.execute("UPDATE users SET display_name=? WHERE id=?", ("动画师姓名", self.user["id"]))
        self.own_project("p", "项目名称", self.user)
        self.store = DistributedStore(self.root / "control.db")
        self.now = time.time()
        self.caps = {
            "agent_version": 5,
            "node_classes": ["Loader", "KSampler"],
            "input_types": {"Loader": {"ckpt_name": "COMBO"}},
            "input_choices": {"Loader": {"ckpt_name": ["base.safetensors"], "prompt": [LEAK], "password": [LEAK]}},
            "token": LEAK, "user_config": {"key": LEAK},
            "system": {"ram_total": 1024, "ram_free": 256, "python_version": "3.12.1", "argv": [LEAK], "base_url": BAD_LOG},
            "devices": [{"index": 0, "type": "cuda", "name": "GPU 4090", "vram_total": 24000, "vram_free": 12000, "token": LEAK}],
            "hardware": {"cpu": {"model": "CPU", "logical_cores": 16, "password": LEAK},
                         "os": {"name": "Windows", "release": "11"}, "environment_id": LEAK},
            "telemetry": {
                "hostname": "render-node", "collected_at": self.now,
                "gpus": [{"index": 0, "name": "GPU 4090", "memory_total_bytes": 24000,
                          "memory_used_bytes": 6000, "utilization_percent": 30.5, "temperature_c": 48, "token": LEAK}],
                "memory": {"total_bytes": 1024, "used_bytes": 512, "secret": LEAK}, "password": LEAK,
            },
        }
        primary_caps = copy.deepcopy(self.caps)
        primary_caps["is_primary_node"] = True
        primary_caps["node_classes"].append("PrimaryOnly")
        primary_caps["input_choices"]["Loader"]["ckpt_name"].append("required.safetensors")
        self.primary = self.store.register_worker("主节点", primary_caps)["worker_id"]
        self.worker = self.store.register_worker("执行端", self.caps)["worker_id"]
        self.store.heartbeat(self.primary, comfy_online=True)
        self.store.heartbeat(self.worker, comfy_online=True, telemetry=self.caps["telemetry"])
        with self.store.lock, self.store.db:
            self.store.db.execute("UPDATE workers SET sync_status='error',sync_message=? WHERE id=?", (BAD_LOG, self.worker))
        self.jobs = [{
            "id": "job1", "status": "failed", "capability": "text", "name": "安全任务名",
            "cardName": "卡片名", "project": "p", "projectName": "不能使用过期项目名",
            "created": self.now, "started": self.now, "ended": self.now,
            "worker_id": self.worker, "progress": 0.5, "step": "生成中", "error": BAD_LOG,
            "prompt": LEAK, "seed": 123, "outputs": [LEAK], "paths": [LEAK], "graph": {"secret": LEAK}, "token": LEAK,
        }]
        self.register_job("job1", owner=self.user)
        self.store.enqueue("job1", {"capability": "text", "prompt": LEAK})
        self.web_root = self.root / "web"
        self.web_root.mkdir()
        (self.web_root / "monitor.html").write_text("<h1>只读监控测试页面</h1>", encoding="utf-8")
        self.app = self.build_app()
        self.app["distributed"] = self.store
        register_monitor_routes(self.app, web_root=self.web_root, get_jobs=self.snapshot, get_health=self.health)

        async def unused(request):
            return web.Response(text="其他页面")

        async def asset(request, *, name):
            return web.Response(text=name)

        register_page_routes(self.app, index=unused, director_index=unused, if_studio_index=unused,
                             controller_index=unused, controller_costs=unused, controller_capacity=unused,
                             permissions_page=unused, teams_page=unused, static_asset=asset)
        await self.start_client(self.app)

    async def asyncTearDown(self):
        await self.client.close()
        self.store.close()
        self.auth_teardown()

    def snapshot(self):
        return tuple(dict(job) for job in self.jobs)

    def health(self, app, workers):
        return {"ok": True, "mode": "controller" if app.get("distributed") else "local",
                "server_time": self.now, "started_at": self.now - 10, "sandbox": False,
                "capabilities": 7, "jobs": len(self.jobs), "comfy_online": bool(workers),
                "llm": {"ok": True, "model": "test-model", "base_url": BAD_LOG, "conf": LEAK},
                "client_id": LEAK}

    async def get_json(self, path):
        response = await self.client.get(path)
        self.assertEqual(response.status, 200, await response.text())
        self.assertIn("no-store", response.headers.get("Cache-Control", "").split(", "))
        return await response.json()

    def detail_path(self, worker=None):
        return f"/api/monitor/workers/{worker or self.worker}"

    async def test_admin_and_monitor_get_and_head(self):
        for username in ("admin", "screen"):
            await self.login(username)
            for path in ("/monitor", "/api/monitor/summary", self.detail_path(), self.detail_path() + "/temperature"):
                for method in ("get", "head"):
                    response = await getattr(self.client, method)(path)
                    self.assertEqual(response.status, 200, (username, method, path, await response.text()))
            for asset in ("monitor.css", "monitor-page.js", "monitor-alerts.js"):
                self.assertIn(asset, STATIC_ASSETS)
                self.assertEqual((await self.client.get("/" + asset)).status, 200)

    async def test_normal_user_forbidden(self):
        await self.login("artist")
        for path in ("/monitor", "/api/monitor/summary", self.detail_path(), self.detail_path() + "/temperature"):
            for method in ("get", "head"):
                self.assertEqual((await getattr(self.client, method)(path)).status, 403)

    async def test_monitor_cannot_use_general_or_write_routes(self):
        await self.login("screen")
        for path in ("/api/projects", "/api/jobs", "/api/workers", "/controller"):
            self.assertEqual((await self.client.get(path)).status, 403)
        for method in ("post", "put", "delete", "patch"):
            self.assertEqual((await getattr(self.client, method)("/api/monitor/summary")).status, 403)

    async def test_missing_workers_and_temperature(self):
        for path in (self.detail_path("missing"), self.detail_path("missing") + "/temperature"):
            self.assertEqual((await self.client.get(path)).status, 404)

    async def test_summary_contract_names_and_no_heavy_fields(self):
        await self.login("screen")
        # 摘要不能计算完整节点/模型对比，也不能提取模型清单。
        with patch("server.monitor.worker_capability_comparisons", side_effect=AssertionError("摘要不应对比")), \
             patch("server.monitor.capability_model_inventory", side_effect=AssertionError("摘要不应扫描模型")):
            data = await self.get_json("/api/monitor/summary")
        self.assertEqual(set(data), {"health", "status", "workers", "jobs"})
        self.assertEqual(set(data["health"]), {"ok", "mode", "server_time", "started_at", "sandbox", "capabilities", "jobs", "comfy_online", "llm"})
        self.assertEqual(data["health"]["llm"], {"ok": True, "model": "test-model"})
        job = data["jobs"][0]
        self.assertEqual(set(job), {"id", "status", "capability", "name", "cardName", "projectName", "submitter_display_name", "submitter_username", "progress", "step", "created", "started", "ended", "worker_id", "error"})
        self.assertEqual(job["projectName"], "项目名称")
        self.assertEqual(job["submitter_display_name"], "动画师姓名")
        self.assertEqual(job["submitter_username"], "artist")
        self.assertEqual(job["name"], "安全任务名")
        self.assertEqual(job["cardName"], "卡片名")
        serialized = json.dumps(data)
        for forbidden in (LEAK, "input_choices", "input_types", "node_classes", "model_inventory", "capability_comparison", "password", "Bearer", "https://", "prompt", "outputs", "token", "paths", "graph"):
            self.assertNotIn(forbidden, serialized)
        worker = next(worker for worker in data["workers"] if worker["id"] == self.worker)
        self.assertEqual(set(worker), {"id", "name", "state", "enabled", "last_seen", "comfy_online", "busy", "current_job_id", "is_primary_node", "sync_status", "sync_request_id", "sync_requested_at", "sync_finished_at", "capabilities", "sync_message"})
        self.assertEqual(set(worker["capabilities"]), {"agent_version", "telemetry", "devices", "system"})
        self.assertEqual(worker["capabilities"]["devices"][0]["vram_total"], 24000)

    async def test_recent_60_and_global_status_counts(self):
        self.jobs = [dict(self.jobs[0], id=f"j{i}", created=i, status="running" if i % 2 else "queued") for i in range(80)]
        data = await self.get_json("/api/monitor/summary")
        self.assertEqual(len(data["jobs"]), 60)
        self.assertEqual([job["id"] for job in data["jobs"]], [f"j{i}" for i in range(79, 19, -1)])
        self.assertEqual(data["status"], {"running_count": 40, "queued_count": 40})
        self.assertEqual(data["health"]["jobs"], 80)

    async def test_missing_invalid_and_corrupt_project(self):
        for project in ("missing", "../../secret", None, {"bad": LEAK}):
            self.jobs[0]["project"] = project
            data = await self.get_json("/api/monitor/summary")
            self.assertIsNone(data["jobs"][0]["projectName"])
        self.projects.path("p").write_text("broken-json", encoding="utf-8")
        self.jobs[0]["project"] = "p"
        self.assertIsNone((await self.get_json("/api/monitor/summary"))["jobs"][0]["projectName"])

    async def test_detail_projection_and_comparison_match(self):
        await self.login("screen")
        data = await self.get_json(self.detail_path())
        self.assertEqual(set(data), {"worker", "comparison_baseline", "capabilities", "capability_comparison"})
        baseline, workers = worker_capability_comparisons(self.store.list_workers())
        expected = next(worker["capability_comparison"] for worker in workers if worker["id"] == self.worker)
        self.assertEqual(data["comparison_baseline"], baseline)
        self.assertEqual(data["capability_comparison"], expected)
        self.assertEqual(data["capability_comparison"]["missing_models"][0]["name"], "required.safetensors")
        caps = data["capabilities"]
        self.assertEqual(caps["projection"], "readonly_safe_projection")
        self.assertEqual(caps["node_classes"], ["Loader", "KSampler"])
        self.assertEqual(caps["model_inventory"], [{"node_class": "Loader", "input": "ckpt_name", "name": "base.safetensors"}])
        self.assertEqual(caps["hardware"]["cpu"]["logical_cores"], 16)
        for forbidden in (LEAK, "input_choices", "input_types", "user_config", "environment_id", "password", "Bearer", "https://", "token"):
            self.assertNotIn(forbidden, json.dumps(data))

    async def test_model_paths_and_hostile_config_not_exposed(self):
        caps = copy.deepcopy(self.caps)
        caps["input_choices"]["Loader"]["ckpt_name"] = [
            "/private/models/a.safetensors", r"C:\private\models\b.safetensors", "nested/c.safetensors",
            f"https://internal.test/{LEAK}.safetensors?token={LEAK}", BAD_LOG]
        caps["node_classes"].append(BAD_LOG)
        caps["agent_version"] = BAD_LOG
        caps["system"]["python_version"] = BAD_LOG
        self.store.heartbeat(self.worker, capabilities=caps, comfy_online=True)
        data = await self.get_json(self.detail_path())
        names = [item["name"] for item in data["capabilities"]["model_inventory"]]
        self.assertEqual(set(names), {"a.safetensors", "b.safetensors", "c.safetensors"})
        for forbidden in (LEAK, "private", "https://", "Bearer", "password", "C:\\"):
            self.assertNotIn(forbidden, json.dumps(data))

    async def test_telemetry_strict_numeric_or_null(self):
        caps = copy.deepcopy(self.caps)
        gpu = caps["telemetry"]["gpus"][0]
        gpu.update(memory_used_bytes="6000", utilization_percent=float("inf"), temperature_c=float("nan"), index=True)
        caps["telemetry"]["memory"].update(total_bytes={"token": LEAK}, used_bytes=False)
        projected = safe_capabilities(caps)
        gpu = projected["telemetry"]["gpus"][0]
        for key in ("memory_used_bytes", "utilization_percent", "temperature_c", "index"):
            self.assertIsNone(gpu[key])
        self.assertEqual(gpu["memory_total_bytes"], 24000)
        self.assertEqual(projected["telemetry"]["memory"], {"total_bytes": None, "used_bytes": None})
        # 非有限值也通过真实 SQLite JSON 能力快照读取并被投影成 null。
        self.store.heartbeat(self.worker, capabilities=caps, comfy_online=True)
        data = await self.get_json("/api/monitor/summary")
        telemetry = next(worker for worker in data["workers"] if worker["id"] == self.worker)["capabilities"]["telemetry"]
        self.assertIsNone(telemetry["gpus"][0]["temperature_c"])
        self.assertNotIn("NaN", json.dumps(data))

    async def test_temperature_validation_and_existing_structure(self):
        path = self.detail_path() + "/temperature"
        for query in ("gpu_index=-1", f"gpu_index={TEMPERATURE_MAX_GPU_INDEX + 1}", "gpu_index=1.5", "gpu_index=nan", "minutes=60", "minutes=0", "minutes=no", "minutes=30.0"):
            self.assertEqual((await self.client.get(path + "?" + query)).status, 400, query)
        for minutes in (30, 120, 1440):
            data = await self.get_json(path + f"?minutes={minutes}")
            expected = self.store.temperature_history(self.worker, minutes=minutes, now=data["server_time"])
            self.assertEqual(data, expected)
            self.assertEqual(data["points"][0]["temperature_c"], 48)
        empty = await self.get_json(path + f"?gpu_index={TEMPERATURE_MAX_GPU_INDEX}")
        self.assertEqual(empty["points"], [])

    async def test_local_mode_no_workers_or_fabricated_history(self):
        await self.client.close()
        app = self.build_app()
        register_monitor_routes(app, web_root=self.web_root, get_jobs=self.snapshot, get_health=self.health)
        await self.start_client(app)
        data = await self.get_json("/api/monitor/summary")
        self.assertEqual(data["health"]["mode"], "local")
        self.assertEqual(data["workers"], [])
        self.assertEqual((await self.client.get(self.detail_path())).status, 404)
        self.assertEqual((await self.client.get(self.detail_path() + "/temperature")).status, 404)

    async def test_large_detail_is_complete_only_on_demand(self):
        caps = copy.deepcopy(self.caps)
        nodes = [f"Node{i:05d}" for i in range(5000)]
        models = [f"model{i:05d}.safetensors" for i in range(3000)]
        caps["node_classes"] = nodes
        caps["input_choices"]["Loader"]["ckpt_name"] = models
        self.store.heartbeat(self.worker, capabilities=caps, comfy_online=True)
        summary = await self.get_json("/api/monitor/summary")
        self.assertNotIn("Node04999", json.dumps(summary))
        self.assertLess(len(json.dumps(summary)), 16000)
        detail = await self.get_json(self.detail_path())
        self.assertEqual(detail["capabilities"]["node_classes"], nodes)
        self.assertEqual([item["name"] for item in detail["capabilities"]["model_inventory"]], models)
        self.assertGreater(len(json.dumps(detail["capabilities"])), 16000)

    async def test_ambiguous_and_missing_baseline_match_existing_comparison(self):
        caps = copy.deepcopy(self.caps)
        caps["is_primary_node"] = True
        self.store.heartbeat(self.worker, capabilities=caps, comfy_online=True)
        data = await self.get_json(self.detail_path())
        self.assertEqual(data["comparison_baseline"]["status"], "ambiguous")
        self.assertEqual(data["capability_comparison"]["status"], "unknown")
        caps["is_primary_node"] = False
        self.store.heartbeat(self.worker, capabilities=caps, comfy_online=True)
        self.store.heartbeat(self.primary, capabilities=caps, comfy_online=True)
        data = await self.get_json(self.detail_path())
        self.assertEqual(data["comparison_baseline"]["status"], "none")
        self.assertEqual(data["capability_comparison"]["status"], "unknown")

    async def test_real_make_app_wiring_uses_only_temporary_data(self):
        import app as application
        from unittest.mock import AsyncMock

        await self.client.close()
        (self.root / "pricing.json").write_text("{}", encoding="utf-8")
        for mode in ("local", "controller"):
            with ExitStack() as stack:
                for name, value in (
                    ("ROOT", self.root), ("COMFY_INPUT", self.root / "comfy-input"),
                    ("EXECUTION_MODE", mode), ("CONTROLLER_MODE", mode == "controller"),
                    ("JOBS", {"job1": dict(self.jobs[0])}), ("CAPS", {}),
                    ("load_caps", lambda: 0), ("load_jobs", lambda: None),
                    ("setup_dingtalk", lambda *args: None), ("ws_loop", AsyncMock()),
                    ("lan_ips", lambda: []),
                ):
                    stack.enter_context(patch.object(application, name, value))
                stack.enter_context(patch.dict(os.environ, {"CHOUKA_LOCAL_TEST": "0", "CHOUKA_ADMIN_SANDBOX": "0"}))
                stack.enter_context(patch.object(application.llm, "where", return_value={"ok": True, "model": "fixture", "base_url": BAD_LOG}))
                app = application.make_app(auth_path=self.root / "data" / "auth.db", project_repository=self.projects)
                await self.start_client(app)
                try:
                    await self.login("screen")
                    data = await self.get_json("/api/monitor/summary")
                    self.assertEqual(data["health"]["mode"], mode)
                    self.assertEqual(data["jobs"][0]["projectName"], "项目名称")
                    self.assertEqual(data["jobs"][0]["submitter_display_name"], "动画师姓名")
                    self.assertNotIn(LEAK, json.dumps(data))
                    self.assertEqual((await self.client.get("/monitor")).status, 200)
                    self.assertEqual((await self.client.get(self.detail_path())).status, 404)
                    self.assertEqual((await self.client.get(self.detail_path() + "/temperature")).status, 404)
                finally:
                    await self.client.close()

    async def test_real_controller_worker_http_and_monitor_revocation(self):
        import app as application
        import shutil

        await self.client.close()
        for name in ("monitor.html", "monitor.css", "monitor-page.js", "monitor-alerts.js"):
            shutil.copyfile(Path(__file__).resolve().parents[1] / "web" / name, self.web_root / name)
        (self.root / "pricing.json").write_text("{}", encoding="utf-8")
        with ExitStack() as stack:
            for name, value in (
                ("ROOT", self.root), ("COMFY_INPUT", self.root / "comfy-input"),
                ("EXECUTION_MODE", "controller"), ("CONTROLLER_MODE", True),
                ("ENROLLMENT_TOKEN", "isolated-enrollment"),
                ("JOBS", {}), ("CAPS", {}), ("load_caps", lambda: 0),
                ("load_jobs", lambda: None), ("setup_dingtalk", lambda *args: None),
                ("lan_ips", lambda: []),
            ):
                stack.enter_context(patch.object(application, name, value))
            stack.enter_context(patch.dict(os.environ, {"CHOUKA_LOCAL_TEST": "0", "CHOUKA_ADMIN_SANDBOX": "0"}))
            stack.enter_context(patch.object(application.llm, "where", return_value={"ok": False}))
            app = application.make_app(auth_path=self.root / "data" / "auth.db", project_repository=self.projects)
            await self.start_client(app)
            try:
                # 走真实管理员开户、登录、Worker 注册及心跳 HTTP 路由，不伪造响应。
                response = await self.client.post("/api/admin/users", json={
                    "username": "release-screen", "password": PASSWORD,
                    "role": "monitor", "team_leader": True,
                })
                self.assertEqual(response.status, 201, await response.text())
                account = (await response.json())["user"]
                self.assertFalse(account["team_leader"])
                caps = copy.deepcopy(self.caps)
                caps["supports_code_restart"] = True
                response = await self.client.post("/agent/v1/register", json={
                    "enrollment_token": "isolated-enrollment", "name": "隔离Windows协议执行端", "capabilities": caps,
                })
                self.assertEqual(response.status, 201)
                registration = await response.json()
                worker_id = registration["worker_id"]
                worker_headers = {"X-Worker-ID": worker_id, "Authorization": "Bearer " + registration["worker_token"]}
                heartbeat = {"comfy_online": True, "telemetry": self.caps["telemetry"]}
                response = await self.client.post("/agent/v1/heartbeat", headers=worker_headers, json=heartbeat)
                self.assertEqual(response.status, 200)
                sync = await self.client.post("/api/admin/workers/sync-all", json={})
                self.assertEqual(sync.status, 202)
                sync_request = (await sync.json())["request_id"]

                monitor_headers = await self.login("release-screen")
                self.client.session.headers.update(monitor_headers)
                self.assertEqual((await self.client.get("/monitor")).status, 200)
                for path in ("/monitor.css", "/monitor-page.js", "/monitor-alerts.js"):
                    self.assertEqual((await self.client.get(path)).status, 200)
                for path in ("/api/projects", "/api/workers", "/api/admin/users", "/controller"):
                    self.assertEqual((await self.client.get(path)).status, 403)
                # 使用 monitor 自己的有效 CSRF 仍不能执行管理写入。
                self.assertEqual((await self.client.post("/api/admin/workers/sync-all", json={})).status, 403)
                self.assertEqual((await self.client.post("/agent/v1/heartbeat", json=heartbeat)).status, 401)
                response = await self.client.post("/agent/v1/heartbeat", headers=worker_headers, json={
                    **heartbeat, "comfy_online": False,
                    "maintenance": {"request_id": sync_request, "status": "error", "message": BAD_LOG},
                })
                self.assertEqual(response.status, 200)
                data = await self.get_json("/api/monitor/summary")
                worker = next(item for item in data["workers"] if item["id"] == worker_id)
                self.assertFalse(worker["comfy_online"])
                self.assertEqual(worker["sync_status"], "error")
                self.assertNotIn(LEAK, json.dumps(data))
                self.assertNotIn(registration["worker_token"], json.dumps(data))
                detail = await self.get_json(self.detail_path(worker_id))
                self.assertEqual(detail["capabilities"]["projection"], "readonly_safe_projection")
                temperature = await self.get_json(self.detail_path(worker_id) + "/temperature")
                self.assertTrue(temperature["points"])

                # 只改变隔离库中的心跳时间，验证真实离线阈值及后续心跳恢复。
                distributed = app["distributed"]
                with distributed.lock, distributed.db:
                    distributed.db.execute("UPDATE workers SET last_seen=? WHERE id=?", (time.time() - 31, worker_id))
                data = await self.get_json("/api/monitor/summary")
                self.assertEqual(data["workers"][0]["state"], "offline")
                response = await self.client.post("/agent/v1/heartbeat", headers=worker_headers, json={
                    **heartbeat, "maintenance": {"request_id": sync_request, "status": "done", "message": "完成"},
                })
                self.assertEqual(response.status, 200)
                data = await self.get_json("/api/monitor/summary")
                self.assertNotEqual(data["workers"][0]["state"], "offline")
                self.assertTrue(data["workers"][0]["comfy_online"])
                self.assertEqual(data["workers"][0]["sync_status"], "done")

                admin = app["auth_store"].login("admin", PASSWORD)
                response = await self.client.patch("/api/admin/users/" + account["id"],
                    headers={"X-CSRF-Token": admin["csrf_token"]}, cookies={COOKIE: admin["token"]},
                    json={"enabled": False})
                self.assertEqual(response.status, 200, await response.text())
                for path in ("/api/auth/me", "/api/monitor/summary", self.detail_path(worker_id)):
                    self.assertEqual((await self.client.get(path)).status, 401)
            finally:
                await self.client.close()

    async def test_offline_state_uses_store_threshold(self):
        with self.store.lock, self.store.db:
            self.store.db.execute("UPDATE workers SET last_seen=? WHERE id=?", (time.time() - 31, self.worker))
        data = await self.get_json("/api/monitor/summary")
        self.assertEqual(next(worker for worker in data["workers"] if worker["id"] == self.worker)["state"], "offline")

    async def test_get_requests_never_modify_dispatch_or_jobs(self):
        # 即使租约已经过期，监控读取也不能触发 requeue/acquire 等调度写入。
        with self.store.lock, self.store.db:
            self.store.db.execute("UPDATE dispatch_jobs SET status='running',worker_id=?,lease_expires_at=1 WHERE job_id='job1'", (self.worker,))
        before = tuple(self.store.db.iterdump())
        jobs_before = copy.deepcopy(self.jobs)
        project_before = self.projects.path("p").read_bytes()
        await self.login("screen")
        await asyncio.gather(*(self.get_json(path) for path in (
            "/api/monitor/summary", self.detail_path(), self.detail_path() + "/temperature") for _ in range(3)))
        self.assertEqual(tuple(self.store.db.iterdump()), before)
        self.assertEqual(self.jobs, jobs_before)
        self.assertEqual(self.projects.path("p").read_bytes(), project_before)

    async def test_projection_and_disk_work_off_event_loop(self):
        main_thread = threading.get_ident()
        methods = [(self.store, "list_workers"), (self.store, "temperature_history"),
                   (self.auth, "job_submitters"), (self.projects, "read")]
        seen = []
        with ExitStack() as stack:
            for obj, name in methods:
                original = getattr(obj, name)

                def checked(*args, _method=original, _name=name, **kwargs):
                    self.assertNotEqual(threading.get_ident(), main_thread, _name)
                    seen.append(_name)
                    return _method(*args, **kwargs)

                stack.enter_context(patch.object(obj, name, side_effect=checked))
            for path in ("/api/monitor/summary", self.detail_path(), self.detail_path() + "/temperature"):
                await self.get_json(path)
        self.assertTrue({name for _, name in methods}.issubset(seen))

    async def test_error_classification_never_echoes_logs(self):
        for error, category in (("CUDA out of memory " + BAD_LOG, "OOM"),
                                ("connection refused " + BAD_LOG, "连接异常"),
                                ("FileNotFoundError " + BAD_LOG, "文件缺失"),
                                ("timed out " + BAD_LOG, "超时"), (BAD_LOG, "发生异常")):
            self.assertIn(category, safe_error(error))
            self.jobs[0]["error"] = error
            data = await self.get_json("/api/monitor/summary")
            self.assertIn(category, data["jobs"][0]["error"])
            self.assertNotIn(LEAK, json.dumps(data))
        self.assertIsNone(safe_error(None))


if __name__ == "__main__":
    unittest.main()
