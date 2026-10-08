"""导演页/API 回归：真实认证、资源索引、make_app 路由和项目写锁。

页面用临时静态文件验证路由，不依赖正在开发的 UI；不启动 ComfyUI 后台连接。
失败保留为普通断言（不 xfail），用于暴露生产实现的保护缺口。
"""
import asyncio
import copy
import io
import json
from contextlib import redirect_stdout
import sys
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "tests"))

import app as controller_app
import auth_support


def director(shots=None, rev=0):
    return {"rev": rev, "script": "", "style": "", "shots": shots or []}


def shot(sid="shot-1"):
    return {
        "id": sid, "title": "开场", "description": "城市日出", "shotSize": "远景",
        "movement": "推进", "notes": "保持人物一致",
        "image": {"capability": "zimage_t2i", "params": {}},
        "video": {"capability": "minimax_h3_i2v", "params": {}},
        "assets": [], "history": [], "selected": {},
    }


def reference(name="reference.png"):
    return {"ref": "chouka/" + name, "url": "/api/upload/" + name,
            "kind": "image", "origin": "upload"}


def changed(document, path, value):
    result = copy.deepcopy(document)
    target = result
    for key in path[:-1]:
        target = target[key]
    target[path[-1]] = value
    return result


class ObservedLock(asyncio.Lock):
    """观测两个真实 HTTP 请求排队，不靠 sleep 或 mock 掉保存逻辑。"""

    def __init__(self):
        super().__init__()
        self.waiters = 0
        self.both_waiting = asyncio.Event()

    async def acquire(self):
        if self.locked():
            self.waiters += 1
            if self.waiters == 2:
                self.both_waiting.set()
        return await super().acquire()


class DirectorApiTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def asyncSetUp(self):
        self.auth_setup()
        self.addCleanup(self.auth_teardown)
        web_root = self.root / "web"
        web_root.mkdir()
        self.static_files = {
            "director.html": '<!doctype html><title>导演路由测试</title>',
            "director.js": 'window.directorRouteTest = true;',
            "director.css": '.director-route-test { color: red; }',
            "private-backup.txt": "must not be served",
        }
        for name, text in self.static_files.items():
            (web_root / name).write_text(text, encoding="utf-8")

        # 不加载正式任务/能力、不迁移数据、不连接 ComfyUI；HTTP handler 和中间件不 mock。
        for patcher in (
            mock.patch.object(controller_app, "ROOT", self.root),
            mock.patch.object(controller_app, "PROJ_DIR", self.root / "data" / "projects"),
            mock.patch.object(controller_app, "JOBS", {}),
            mock.patch.object(controller_app, "CONTROLLER_MODE", False),
            mock.patch.object(controller_app, "load_caps", return_value=0),
            mock.patch.object(controller_app, "load_jobs"),
            mock.patch.object(controller_app, "lan_ips", return_value=[]),
            mock.patch.dict(controller_app.os.environ, {
                "CHOUKA_LOCAL_TEST": "0", "CHOUKA_AUTH_ORIGIN": "",
            }),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)
        with redirect_stdout(io.StringIO()):
            self.application = controller_app.make_app(auth_path=self.root / "data" / "auth.db")
        self.application.on_startup.clear()
        self.application.on_shutdown.clear()
        self.application.on_cleanup.clear()
        self.application["auth_store"] = self.auth
        self.application["resource_access"] = self.access
        self.own_project("p")
        self.project_path = self.root / "data" / "projects" / "p.json"
        self.url = "/api/projects/p/director"
        await self.start_client(self.application)
        self.addAsyncCleanup(self.client.close)

    def read_project(self):
        return json.loads(self.project_path.read_text(encoding="utf-8"))

    def seed_project(self, **fields):
        document = self.read_project()
        document.update(fields)
        self.project_path.write_text(json.dumps(document, ensure_ascii=False), encoding="utf-8")
        return document

    async def save(self, document, expected=200, **kwargs):
        body = {"data": "null"} if document is None else {"json": document}
        response = await self.client.put(self.url, **body, **kwargs)
        self.assertEqual(response.status, expected, await response.text())
        return response

    async def assert_rejected(self, document, status=400, **kwargs):
        before = self.project_path.read_bytes()
        response = await self.save(document, expected=status, **kwargs)
        self.assertEqual(self.project_path.read_bytes(), before, "拒绝请求不得改变磁盘数据")
        return response

    async def switch_user(self, username):
        self.headers = await self.login(username)
        self.client.session.headers.update(self.headers)

    def project_job(self, jid, kind="image", pid="p", owner=None):
        self.register_job(jid, pid, owner)
        controller_app.JOBS[jid] = {
            "id": jid, "project": pid, "status": "done",
            "outputs": [{"kind": kind, "url": f"/api/artifact/{jid}/result.{kind}"}],
        }

    async def test_director_page_and_api_require_login(self):
        self.client.session.cookie_jar.clear()
        response = await self.client.get("/director", allow_redirects=False)
        self.assertEqual(response.status, 302)
        self.assertEqual(response.headers["Location"], "/login")
        self.assertNotIn("导演路由测试", await response.text())
        await self.assert_rejected(director(), 401)
        self.assertEqual((await self.client.get("/api/projects/p")).status, 401)

    async def test_normal_user_can_open_independent_director_page(self):
        self.auth.create_user("filmmaker", auth_support.PASSWORD)
        await self.switch_user("filmmaker")
        response = await self.client.get("/director")
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.text(), self.static_files["director.html"])
        self.assertEqual(response.content_type, "text/html")
        self.assertIn("no-store", response.headers["Cache-Control"])

    async def test_explicit_director_static_routes_and_no_root_fallback(self):
        for name, content_type in (("director.js", "javascript"), ("director.css", "text/css")):
            with self.subTest(asset=name):
                response = await self.client.get("/" + name)
                self.assertEqual(response.status, 200, await response.text())
                self.assertEqual(await response.text(), self.static_files[name])
                self.assertIn(content_type, response.content_type)
        # 文件确实存在，404 不能是因为文件缺失；直接 .html 不得绕过 /director。
        for path in ("/director.html", "/private-backup.txt", "/web/director.js",
                     "/director.js.bak", "/server/app.py"):
            with self.subTest(path=path):
                self.assertEqual((await self.client.get(path)).status, 404)
        self.client.session.cookie_jar.clear()
        for path in ("/director.js", "/director.css"):
            with self.subTest(anonymous=path):
                response = await self.client.get(path, allow_redirects=False)
                self.assertEqual(response.status, 302)
                self.assertEqual(response.headers["Location"], "/login")

    async def test_first_empty_save_round_trips_and_updates_listing(self):
        self.seed_project(updated=1)
        response = await self.save(director())
        payload = await response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["rev"], 1)
        self.assertGreater(payload["updated"], 1)
        # GET 重新读盘；写回的严格形状保持完整。
        response = await self.client.get("/api/projects/p")
        self.assertEqual(response.status, 200)
        restored = await response.json()
        self.assertEqual(restored["director"], director(rev=1))
        self.assertEqual(self.read_project()["director"], restored["director"])
        self.assertEqual(restored["updated"], payload["updated"])
        listing = await (await self.client.get("/api/projects")).json()
        self.assertTrue(listing["projects"][0]["has_director"])

    async def test_shots_text_and_scalar_parameters_survive_reload(self):
        first, second = shot(), shot("shot-2")
        first["image"]["params"] = {
            "prompt": "日出\n<Subject 1>", "seed": 42, "cfg": 1.5, "enabled": True,
        }
        document = director([first, second])
        document.update(script="第一幕\n第二幕", style="电影质感")
        await self.save(document)
        restored = await (await self.client.get("/api/projects/p")).json()
        self.assertEqual(restored["director"], {**document, "rev": 1})

    async def test_director_save_only_changes_director_and_updated(self):
        before = self.seed_project(
            rev=17, cards=[{"id": "card-1", "title": "旧画布", "params": {"seed": 1}}],
            edges=[{"from": "card-1", "to": "card-2"}],
            view={"x": 123, "y": -45, "k": 1.25}, groups=[{"id": "group-1"}],
            created=123, updated=1, custom={"preserve": True},
        )
        await self.save(director([shot()]))
        after = self.read_project()
        self.assertEqual({k: v for k, v in after.items() if k not in ("director", "updated")},
                         {k: v for k, v in before.items() if k != "updated"})
        self.assertEqual(after["rev"], 17)
        self.assertEqual(after["director"]["rev"], 1)

    async def test_stale_or_future_director_rev_is_409_without_overwrite(self):
        await self.save(director([shot()]))
        for rev in (0, 2, 99):
            with self.subTest(rev=rev):
                response = await self.assert_rejected(
                    {**director(rev=rev), "script": "不得覆盖"}, 409)
                self.assertIn("重新加载", await response.text())
        await self.save({**director(rev=1), "script": "已重新加载"})
        self.assertEqual(self.read_project()["director"]["rev"], 2)

    async def test_canvas_put_preserves_director_and_revisions_are_independent(self):
        self.seed_project(rev=8, cards=[{"id": "card-1", "title": "旧标题"}],
                          edges=[], view={"x": 5, "y": 6, "k": 1})
        await self.save(director([shot()]))
        expected_director = self.read_project()["director"]
        # 故意携带过期 director：画布 PUT 不能覆盖导演文档。
        response = await self.client.put("/api/projects/p", json={
            "rev": 8, "cards": [{"id": "card-1", "title": "新标题"}],
            "edges": [{"from": "card-1", "to": "card-1"}], "director": director(),
        })
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual((await response.json())["rev"], 9)
        self.assertEqual(self.read_project()["director"], expected_director)
        self.assertEqual(self.read_project()["view"], {"x": 5, "y": 6, "k": 1})
        await self.save({**director(rev=1), "script": "画布保存后继续导演"})
        project = self.read_project()
        self.assertEqual(project["rev"], 9)
        self.assertEqual(project["director"]["rev"], 2)
        self.assertEqual(project["cards"][0]["title"], "新标题")
        self.assertEqual(project["edges"], [{"from": "card-1", "to": "card-1"}])

    async def run_queued_writes(self, requests):
        lock = ObservedLock()
        self.application["project_locks"]["p"] = lock
        await lock.acquire()
        held_by_test = True
        tasks = [asyncio.create_task(request()) for request in requests]
        try:
            await asyncio.wait_for(lock.both_waiting.wait(), timeout=5)
            self.assertIsNone(self.read_project().get("director"))
            lock.release()
            held_by_test = False
            return await asyncio.wait_for(asyncio.gather(*tasks), timeout=5)
        finally:
            if held_by_test:
                lock.release()
            for task in tasks:
                if not task.done():
                    task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

    async def test_concurrent_same_rev_has_exactly_one_winner_under_project_lock(self):
        documents = [{**director(), "script": text} for text in ("方案 A", "方案 B")]
        responses = await self.run_queued_writes([
            lambda document=document: self.client.put(self.url, json=document)
            for document in documents
        ])
        self.assertEqual(sorted(response.status for response in responses), [200, 409])
        winner = next(i for i, response in enumerate(responses) if response.status == 200)
        self.assertEqual(self.read_project()["director"], {**documents[winner], "rev": 1})
        self.assertEqual(self.read_project()["rev"], 0)

    async def test_concurrent_canvas_and_director_saves_preserve_both_documents(self):
        responses = await self.run_queued_writes([
            lambda: self.client.put(self.url, json={**director(), "script": "导演方案"}),
            lambda: self.client.put("/api/projects/p", json={"rev": 0, "cards": [], "edges": []}),
        ])
        for response in responses:
            self.assertEqual(response.status, 200, await response.text())
        project = self.read_project()
        self.assertEqual(project["rev"], 1)
        self.assertEqual(project["director"], {**director(rev=1), "script": "导演方案"})

    async def test_readonly_user_can_reload_but_cannot_save(self):
        await self.save(director([shot()]))
        user = self.auth.create_user("reader", auth_support.PASSWORD)
        self.auth.set_grant(user["id"], self.admin["id"], "read")
        await self.switch_user("reader")
        response = await self.client.get("/api/projects/p")
        self.assertEqual(response.status, 200)
        self.assertEqual((await response.json())["permission"], "read")
        await self.assert_rejected(director(rev=1), 403)

    async def test_locked_project_cannot_be_saved_even_by_admin(self):
        self.seed_project(locked=True)
        await self.assert_rejected(director(), 403)

    async def test_other_user_cannot_read_or_save_project(self):
        self.auth.create_user("stranger", auth_support.PASSWORD)
        await self.switch_user("stranger")
        self.assertEqual((await self.client.get("/api/projects/p")).status, 404)
        await self.assert_rejected(director(), 404)

    async def test_normal_owner_can_save_director(self):
        owner = self.auth.create_user("owner", auth_support.PASSWORD)
        self.own_project("owned", owner=owner)
        await self.switch_user("owner")
        response = await self.client.put("/api/projects/owned/director", json=director([shot()]))
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual((await response.json())["rev"], 1)

    async def test_csrf_token_and_same_origin_are_required(self):
        self.client.session.headers.clear()
        cases = [
            ("missing token", {"Origin": self.origin}),
            ("wrong token", {"Origin": self.origin, "X-CSRF-Token": "wrong"}),
            ("missing origin", {"X-CSRF-Token": self.headers["X-CSRF-Token"]}),
            ("foreign origin", {**self.headers, "Origin": "https://foreign.invalid"}),
            ("cross-site", {**self.headers, "Sec-Fetch-Site": "cross-site"}),
        ]
        for name, headers in cases:
            with self.subTest(case=name):
                await self.assert_rejected(director(), 403, headers=headers)
        await self.save(director(), headers=self.headers)

    async def test_malformed_json_is_400_and_does_not_write(self):
        before = self.project_path.read_bytes()
        response = await self.client.put(self.url, data='{"rev":',
                                         headers={"Content-Type": "application/json"})
        self.assertEqual(response.status, 400, await response.text())
        self.assertEqual(self.project_path.read_bytes(), before)

    async def test_strict_document_and_shot_schema(self):
        valid = director([shot()])
        cases = [("null", None), ("array", []), ("string", "not an object")]
        for key in valid:
            document = copy.deepcopy(valid)
            document.pop(key)
            cases.append(("missing " + key, document))
        cases.append(("extra document key", {**valid, "cards": []}))
        for key, values in {
            "rev": [True, False, -1, 0.5, "0", None],
            "script": [None, [], 1], "style": [None, {}, False],
            "shots": [None, {}, "shots"],
        }.items():
            for value in values:
                cases.append((f"{key}={value!r}", changed(valid, (key,), value)))
        for key in valid["shots"][0]:
            document = copy.deepcopy(valid)
            document["shots"][0].pop(key)
            cases.append(("missing shot " + key, document))
        cases.append(("extra shot key", changed(valid, ("shots", 0, "extra"), 1)))
        for value in (None, "shot", []):
            cases.append((f"shot={value!r}", changed(valid, ("shots", 0), value)))
        for key in ("title", "description", "shotSize", "movement", "notes"):
            cases.append((key + " not string", changed(valid, ("shots", 0, key), {})))
        for name, document in cases:
            with self.subTest(case=name):
                await self.assert_rejected(document)

    async def test_duplicate_and_invalid_shot_ids(self):
        await self.assert_rejected(director([shot(), shot()]))
        for sid in ("", "a/b", "a.b", "a b", "../shot", "a\\b", 1, None):
            with self.subTest(id=sid):
                await self.assert_rejected(director([shot(sid)]))

    async def test_settings_and_parameter_schema(self):
        valid = director([shot()])
        settings = [None, [], {}, {"capability": "zimage_t2i"},
                    {"capability": 1, "params": {}}, {"capability": "", "params": []},
                    {"capability": "", "params": {}, "extra": True}]
        for stage in ("image", "video"):
            for value in settings:
                with self.subTest(stage=stage, settings=value):
                    await self.assert_rejected(changed(valid, ("shots", 0, stage), value))
            for value in (None, [], {}, float("nan"), float("inf"), -float("inf")):
                with self.subTest(stage=stage, parameter=repr(value)):
                    document = changed(valid, ("shots", 0, stage, "params"), {"bad": value})
                    await self.assert_rejected(document)

    async def test_asset_history_and_selected_schema(self):
        valid = director([shot()])
        valid["shots"][0]["history"] = [{"job": "image-job", "stage": "image"}]
        self.project_job("image-job")
        cases = {
            "assets": [None, {}, ["chouka/ref.png"], [{"ref": "chouka/ref.png"}],
                       [{**reference(), "kind": "video"}], [{**reference(), "ref": 1}],
                       [{**reference(), "url": None}], [{**reference(), "origin": {}}],
                       [{**reference(), "extra": True}]],
            "history": [None, {}, ["image-job"], [{"job": "image-job"}],
                        [{"job": "image-job", "stage": "audio"}],
                        [{"job": "", "stage": "image"}], [{"job": 1, "stage": "image"}],
                        [{"job": "image-job", "stage": "image", "extra": True}]],
            "selected": [None, [], {"audio": {"job": "image-job", "index": 0}},
                         {"image": {}}, {"image": {"job": "image-job"}},
                         {"image": {"job": "image-job", "index": 0, "extra": True}}],
        }
        for key, values in cases.items():
            for value in values:
                with self.subTest(field=key, value=value):
                    await self.assert_rejected(changed(valid, ("shots", 0, key), value))
        for index in (-1, True, False, 0.5, "0", None):
            with self.subTest(index=index):
                await self.assert_rejected(changed(valid, ("shots", 0, "selected"), {
                    "image": {"job": "image-job", "index": index},
                }))

    async def test_selected_must_come_from_same_shot_and_stage_history(self):
        self.project_job("image-job")
        first, second = shot(), shot("shot-2")
        first["history"] = [{"job": "image-job", "stage": "image"}]
        cases = []
        second["selected"] = {"image": {"job": "image-job", "index": 0}}
        cases.append(director([first, second]))
        first = copy.deepcopy(first)
        first["selected"] = {"video": {"job": "image-job", "index": 0}}
        cases.append(director([first]))
        first["selected"] = {"image": {"job": "unknown-job", "index": 0}}
        cases.append(director([first]))
        for document in cases:
            with self.subTest(document=document):
                await self.assert_rejected(document)

    async def test_schema_size_limits_reject_one_over_maximum(self):
        valid = director([shot()])
        cases = [
            (("script",), "x" * 100_001), (("style",), "x" * 10_001),
            (("shots",), [shot(f"s-{i}") for i in range(201)]),
            (("shots", 0, "id"), "x" * 129),
            (("shots", 0, "assets"), [reference()] * 10),
            (("shots", 0, "history"), [{"job": "job", "stage": "image"}] * 201),
            (("shots", 0, "history"), [{"job": "x" * 129, "stage": "image"}]),
        ]
        for key in ("title", "description", "shotSize", "movement", "notes"):
            cases.append((("shots", 0, key), "x" * 10_001))
        for stage in ("image", "video"):
            path = ("shots", 0, stage, "params")
            cases.extend([(path, {f"k{i}": i for i in range(101)}),
                          (path, {"x" * 129: 0}), (path, {"prompt": "x" * 20_001})])
        for path, value in cases:
            with self.subTest(path=path, length=len(value)):
                await self.assert_rejected(changed(valid, path, value))

    async def test_schema_limits_accept_exact_maximum(self):
        self.register_asset("reference.png")
        self.project_job("j" * 128)
        first = shot("s" * 128)
        for key in ("title", "description", "shotSize", "movement", "notes"):
            first[key] = "x" * 10_000
        first["image"]["params"] = {f"k{i}": i for i in range(98)}
        first["image"]["params"].update({"x" * 128: True, "prompt": "x" * 20_000})
        first["assets"] = [reference()] * 9
        first["history"] = [{"job": "j" * 128, "stage": "image"}] * 200
        first["selected"] = {"image": {"job": "j" * 128, "index": 0}}
        document = director([first] + [shot(f"s-{i}") for i in range(199)])
        document.update(script="x" * 100_000, style="x" * 10_000)
        await self.save(document)
        self.assertEqual(self.read_project()["director"], {**document, "rev": 1})

    async def test_external_asset_urls_and_path_traversal_are_rejected(self):
        self.register_asset("reference.png")
        valid = director([shot()])
        valid["shots"][0]["assets"] = [reference()]
        for field in ("url", "ref"):
            for value in ("https://foreign.invalid/ref.png", "//foreign.invalid/ref.png",
                          "/api/upload/../secret.png", "/api/upload/%2e%2e%2fsecret.png",
                          "/api/upload/reference.png?extra=1", "unrecognized.png"):
                with self.subTest(field=field, value=value):
                    await self.assert_rejected(changed(valid, ("shots", 0, "assets", 0, field), value))

    async def test_foreign_or_unregistered_assets_are_rejected_without_rebinding(self):
        owner = self.auth.create_user("asset-owner", auth_support.PASSWORD)
        self.own_project("other", owner=owner)
        self.register_asset("foreign.png", "other")
        self.register_asset("reference.png")
        # 管理员能访问 other，仍不能在 p 中直接引用 other 的资源。
        for asset in (reference("foreign.png"), reference("missing.png"),
                      {**reference(), "url": "/api/upload/foreign.png"},
                      {**reference("foreign.png"), "url": "/api/upload/reference.png"}):
            with self.subTest(asset=asset):
                document = director([shot()])
                document["shots"][0]["assets"] = [asset]
                await self.assert_rejected(document, 404)
        self.assertFalse(self.access.authorize(self.admin["id"], "upload", "foreign.png", "p"))
        self.assertTrue(self.access.authorize(owner["id"], "upload", "foreign.png", "other"))

    async def test_valid_reference_images_and_project_job_history_round_trip(self):
        self.register_asset("reference.png")
        self.project_job("image-job", "image")
        self.project_job("video-job", "video")
        first = shot()
        first["assets"] = [reference()]
        first["history"] = []
        for stage in ("image", "video"):
            jid = stage + "-job"
            self.access.register("p", "artifact", f"{jid}/result.{stage}")
            first["history"].append({"job": jid, "stage": stage,
                                     "outputs": copy.deepcopy(controller_app.JOBS[jid]["outputs"])})
        first["selected"] = {stage: {"job": stage + "-job", "index": 0}
                             for stage in ("image", "video")}
        document = director([first])
        await self.save(document)
        restored = await (await self.client.get("/api/projects/p")).json()
        self.assertEqual(restored["director"], {**document, "rev": 1})
        # 任务来源以持久 ACL 为准，而不是进程中的 JOBS 字典。
        controller_app.JOBS.clear()
        await self.save({**document, "rev": 1})

    async def test_unregistered_and_other_project_job_history_are_rejected(self):
        owner = self.auth.create_user("job-owner", auth_support.PASSWORD)
        self.own_project("other", owner=owner)
        self.project_job("foreign-job", pid="other", owner=owner)
        controller_app.JOBS["unregistered-job"] = {"id": "unregistered-job", "project": "p"}
        for jid in ("foreign-job", "unregistered-job", "missing-job"):
            with self.subTest(job=jid):
                first = shot()
                first["history"] = [{"job": jid, "stage": "image"}]
                first["selected"] = {"image": {"job": jid, "index": 0}}
                await self.assert_rejected(director([first]))

    async def test_project_output_snapshots_survive_jobs_cache_eviction(self):
        first = shot()
        for stage, suffix in (("image", "png"), ("video", "mp4")):
            jid = stage + "-snapshot"
            self.project_job(jid, stage)
            locator = f"{jid}/result.{suffix}"
            self.access.register("p", "artifact", locator)
            output = {"kind": stage, "url": "/api/artifact/" + locator,
                      "filename": "result." + suffix}
            first["history"].append({"job": jid, "stage": stage, "outputs": [output]})
            first["selected"][stage] = {"job": jid, "index": 0}
        document = director([first])
        await self.save(document)
        controller_app.JOBS.clear()
        response = await self.client.get("/api/projects/p")
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual((await response.json())["director"], {**document, "rev": 1})
        # 即便任务已不在最近任务缓存中，持久 ACL 和输出快照仍允许继续保存。
        await self.save({**document, "rev": 1})
        self.assertEqual(self.read_project()["director"], {**document, "rev": 2})

    async def test_history_snapshots_reject_other_project_and_external_outputs(self):
        owner = self.auth.create_user("snapshot-owner", auth_support.PASSWORD)
        self.own_project("other", owner=owner)
        self.project_job("local-snapshot")
        self.project_job("foreign-snapshot", pid="other", owner=owner)
        self.access.register("p", "artifact", "local-snapshot/result.png")
        self.access.register("other", "artifact", "foreign-snapshot/result.png")
        local = {"kind": "image", "url": "/api/artifact/local-snapshot/result.png"}
        cases = [
            ("foreign project", {"kind": "image", "url":
                                 "/api/artifact/foreign-snapshot/result.png"}, 404),
            ("external URL", {"kind": "image", "url":
                              "https://foreign.invalid/result.png"}, 400),
        ]
        for name, forbidden, status in cases:
            with self.subTest(case=name):
                first = shot()
                first["history"] = [{"job": "local-snapshot", "stage": "image",
                                     "outputs": [local, forbidden]}]
                await self.assert_rejected(director([first]), status)
        # 即使管理员能读 other，也不得将产物绑定到 p。
        self.assertFalse(self.access.authorize(
            self.admin["id"], "artifact", "foreign-snapshot/result.png", "p"))

    async def test_history_snapshot_outputs_schema_and_limit(self):
        self.project_job("snapshot-job")
        self.access.register("p", "artifact", "snapshot-job/result.png")
        output = {"kind": "image", "url": "/api/artifact/snapshot-job/result.png"}
        for invalid in (None, {}, "outputs", [None], ["not an object"], [output] * 101):
            with self.subTest(invalid_type=type(invalid).__name__, value=str(invalid)[:80]):
                first = shot()
                first["history"] = [{"job": "snapshot-job", "stage": "image",
                                     "outputs": invalid}]
                await self.assert_rejected(director([first]))
        # outputs 可省略，也可为空；最多 100 个产物对象。
        first = shot()
        first["history"] = [
            {"job": "snapshot-job", "stage": "image"},
            {"job": "snapshot-job", "stage": "image", "outputs": []},
            {"job": "snapshot-job", "stage": "image", "outputs": [output] * 100},
        ]
        await self.save(director([first]))
        self.assertEqual(self.read_project()["director"]["shots"][0]["history"], first["history"])

    async def test_output_snapshot_does_not_bypass_job_membership(self):
        self.own_project("other")
        self.project_job("foreign-snapshot", pid="other")
        self.project_job("local-snapshot")
        self.access.register("p", "artifact", "local-snapshot/result.png")
        output = {"kind": "image", "url": "/api/artifact/local-snapshot/result.png"}
        for jid in ("foreign-snapshot", "unregistered-snapshot"):
            with self.subTest(job=jid):
                first = shot()
                first["history"] = [{"job": jid, "stage": "image", "outputs": [output]}]
                await self.assert_rejected(director([first]))

    async def test_selected_output_index_cannot_exceed_actual_job_outputs(self):
        self.project_job("image-job")
        first = shot()
        first["history"] = [{"job": "image-job", "stage": "image"}]
        first["selected"] = {"image": {"job": "image-job", "index": 1}}
        # 此任务只有一个产物，合法 index 仅为 0。
        await self.assert_rejected(director([first]))

    async def test_empty_asset_locators_are_not_valid_upload_references(self):
        first = shot()
        first["assets"] = [{"ref": "", "url": "", "kind": "image", "origin": "upload"}]
        await self.assert_rejected(director([first]))


if __name__ == "__main__":
    unittest.main()
