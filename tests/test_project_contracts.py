"""Real aiohttp/AuthStore contracts for the extracted project boundaries.

Only startup loading/external networking is replaced. ACL checks, locks, project
storage, ResourceAccess and queued controller cancellation are real. All data is
created under temporary roots; run via the isolated Python test runner.
"""
import asyncio
import io
import json
import shutil
import sys
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock

import aiohttp
from aiohttp import WSMsgType
from aiohttp.test_utils import TestClient, TestServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "tests"))
import app as backend
import auth_support
from server.project_repository import InvalidProjectId, ProjectRepository
from server.project_service import ProjectService
from server.routes import STATIC_ASSETS


class ProjectContractsTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def asyncSetUp(self):
        self.auth_setup()
        self.addCleanup(self.auth_teardown)
        self.users = {name: self.auth.create_user(name, auth_support.PASSWORD)
                      for name in ("owner", "stranger", "reader", "operator")}
        owner = self.users["owner"]
        self.auth.set_grant(self.users["reader"]["id"], owner["id"], "read")
        self.auth.set_grant(self.users["operator"]["id"], owner["id"], "operate")
        self.own_project("p", owner=owner)
        shutil.copytree(ROOT / "web", self.root / "web")
        (self.root / "pricing.json").write_text('{"version":"test","rates":{}}', encoding="utf-8")
        for patcher in (
            mock.patch.object(backend, "ROOT", self.root),
            mock.patch.object(backend, "JOBS_FILE", self.root / "data" / "jobs.json"),
            mock.patch.object(backend, "CONTROLLER_MODE", True),
            mock.patch.object(backend, "EXECUTION_MODE", "controller"),
            mock.patch.object(backend, "JOBS", {}),
            mock.patch.object(backend, "CAPS", {}),
            mock.patch.object(backend, "load_caps", return_value=0),
            mock.patch.object(backend, "load_jobs"),
            mock.patch.object(backend, "lan_ips", return_value=[]),
            mock.patch.dict(backend.os.environ, {"CHOUKA_LOCAL_TEST": "0",
                            "CHOUKA_ADMIN_SANDBOX": "0", "CHOUKA_AUTH_ORIGIN": ""}),
        ):
            self.enterContext(patcher)
        with redirect_stdout(io.StringIO()):
            self.application = backend.make_app(self.root / "data" / "auth.db",
                                                project_repository=self.projects)
        self.application.on_startup.clear()
        self.application["auth_store"] = self.auth
        self.application["resource_access"] = self.access
        trace = aiohttp.TraceConfig()

        async def forbid_upstream(session, context, params):
            raise AssertionError("Contract tests must not contact upstream: " + str(params.url))

        trace.on_request_start.append(forbid_upstream)
        self.application["session"] = aiohttp.ClientSession(trace_configs=[trace])
        self.client = TestClient(TestServer(self.application))
        await self.client.start_server()
        self.addAsyncCleanup(self.client.close)
        self.client.session._timeout = aiohttp.ClientTimeout(total=5)
        self.origin = str(self.client.make_url("/")).rstrip("/")
        self.tokens = {}
        # Real login once per identity; later changes use the returned cookie/CSRF.
        for name in ("owner", "stranger", "reader", "operator", "admin"):
            self.client.session.cookie_jar.clear()
            response = await self.client.post("/api/auth/login",
                json={"username": name, "password": auth_support.PASSWORD},
                headers={"Origin": self.origin})
            self.assertEqual(response.status, 200, await response.text())
            body = await response.json()
            self.tokens[name] = {
                "Origin": self.origin, "X-CSRF-Token": body["csrf_token"],
                "Cookie": "; ".join(f"{cookie.key}={cookie.value}" for cookie in response.cookies.values()),
            }
        self.client.session.cookie_jar.clear()
        folder = self.root / "data" / "uploads"
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "sample.png").write_bytes(b"private registered image")
        self.access.register("p", "upload", "sample.png")
        self.auth.register_job("job", "p", owner["id"])
        backend.JOBS["job"] = {"id": "job", "project": "p", "projectName": "测试画布",
                               "status": "queued", "created": 1, "outputs": []}
        self.application["distributed"].enqueue("job", {"graph": {}, "assets": {}}, set())

    async def request_as(self, name, method, path, **kwargs):
        self.client.session.cookie_jar.clear()
        return await self.client.request(method, path, headers=self.tokens.get(name, {}),
                                         allow_redirects=False, **kwargs)

    async def test_project_media_and_task_permission_matrix(self):
        for user, read, write in ((None, 401, 401), ("stranger", 404, 404),
                                  ("reader", 200, 403), ("operator", 200, 200), ("admin", 200, 200)):
            with self.subTest(user=user):
                for path in ("/api/projects/p", "/api/job/job", "/api/upload/sample.png"):
                    response = await self.request_as(user, "GET", path)
                    self.assertEqual(response.status, read, (path, await response.text()))
                response = await self.request_as(user, "POST", "/api/projects/p/rename", json={"name": "同一名字"})
                self.assertEqual(response.status, write, await response.text())
                response = await self.request_as(user, "POST", "/api/job/job/cancel", json={})
                self.assertEqual(response.status, write, await response.text())
        self.assertEqual(backend.JOBS["job"]["status"], "canceled")

    async def test_revision_conflict_and_shared_non_reentrant_lock(self):
        bodies = [{"rev": 0, "name": name} for name in ("one", "two")]
        responses = await asyncio.gather(*(
            self.request_as("operator", "PUT", "/api/projects/p", json=body) for body in bodies))
        self.assertEqual(sorted(response.status for response in responses), [200, 409])
        self.assertEqual(self.projects.read("p")["rev"], 1)
        self.assertFalse(self.application["project_locks"]["p"].locked())
        response = await self.request_as("admin", "PUT", "/api/projects/p", json={"name": "missing rev"})
        self.assertEqual(response.status, 409)

    async def test_locked_project_blocks_save_rename_delete_but_preserves_reads(self):
        document = self.projects.read("p")
        document["locked"] = True
        self.projects.write("p", document)
        before = self.projects.path("p").read_bytes()
        for user in ("operator", "admin"):
            for method, suffix, body in (("PUT", "", {"rev": 0}),
                                          ("POST", "/rename", {"name": "new"}),
                                          ("DELETE", "", None)):
                response = await self.request_as(user, method, "/api/projects/p" + suffix, json=body)
                self.assertEqual(response.status, 403, await response.text())
            self.assertEqual((await self.request_as(user, "GET", "/api/projects/p")).status, 200)
        self.assertEqual(self.projects.path("p").read_bytes(), before)
        self.assertEqual(self.auth.get_project("p")["state"], "active")

    async def test_save_reauthorizes_after_resource_validation(self):
        before = self.projects.path("p").read_bytes()
        validate = self.access.validate_document

        def revoke_during_validation(*args, **kwargs):
            result = validate(*args, **kwargs)
            self.auth.delete_grant(self.users["operator"]["id"], self.users["owner"]["id"])
            return result

        with mock.patch.object(self.access, "validate_document", side_effect=revoke_during_validation):
            response = await self.request_as("operator", "PUT", "/api/projects/p",
                                             json={"rev": 0, "name": "must not persist"})
        self.assertEqual(response.status, 404, await response.text())
        self.assertEqual(self.projects.path("p").read_bytes(), before)

    async def test_revoked_collaborator_is_closed_before_next_project_broadcast(self):
        socket = await self.client.ws_connect("/api/projects/p/presence", headers=self.tokens["operator"])
        self.addAsyncCleanup(socket.close)
        first = await socket.receive_json(timeout=2)
        self.assertEqual(first["type"], "presence")
        self.auth.delete_grant(self.users["operator"]["id"], self.users["owner"]["id"])
        response = await self.request_as("owner", "POST", "/api/projects/p/rename", json={"name": "private update"})
        self.assertEqual(response.status, 200, await response.text())
        message = await socket.receive(timeout=2)
        self.assertIn(message.type, (WSMsgType.CLOSE, WSMsgType.CLOSED))
        self.assertNotIn("p", self.application["presence_rooms"])
        for path in ("/api/projects/p", "/api/upload/sample.png", "/api/job/job"):
            self.assertEqual((await self.request_as("operator", "GET", path)).status, 404)

    async def test_delete_revokes_access_cancels_queue_and_keeps_soft_deleted_document(self):
        before = self.projects.path("p").read_bytes()
        response = await self.request_as("owner", "DELETE", "/api/projects/p")
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(self.auth.get_project("p")["state"], "deleted")
        self.assertEqual(backend.JOBS["job"]["status"], "canceled")
        self.assertFalse(self.projects.exists("p"))
        self.assertEqual(self.projects.path("p").with_suffix(".json.deleted").read_bytes(), before)
        for user in ("owner", "admin"):
            for path in ("/api/projects/p", "/api/job/job", "/api/upload/sample.png"):
                self.assertEqual((await self.request_as(user, "GET", path)).status, 404)

    async def test_delete_cleanup_failure_never_reopens_acl_or_media(self):
        with mock.patch.object(self.application["edit_exports"], "cancel_project",
                               side_effect=OSError("cleanup unavailable")):
            response = await self.request_as("owner", "DELETE", "/api/projects/p")
        self.assertEqual(response.status, 500)
        self.assertEqual(self.auth.get_project("p")["state"], "deleted")
        self.assertTrue(self.projects.exists("p"))
        for path in ("/api/projects/p", "/api/upload/sample.png", "/api/job/job"):
            self.assertEqual((await self.request_as("admin", "GET", path)).status, 404)
        self.assertEqual((await self.request_as("owner", "DELETE", "/api/projects/p")).status, 404)

    async def test_name_sync_reaches_jobs_and_billing_before_collaboration_notification(self):
        ledger = self.application["costs"]
        ledger.record_job(backend.JOBS["job"])
        before = dict(ledger.db.execute("SELECT * FROM cost_events WHERE job_id='job'").fetchone())
        socket = await self.client.ws_connect("/api/projects/p/presence", headers=self.tokens["reader"])
        self.addAsyncCleanup(socket.close)
        await socket.receive_json(timeout=2)
        for method, suffix, body in (("POST", "/rename", {"name": "新名一"}),
                                      ("PUT", "", {"rev": 1, "name": "新名二"})):
            response = await self.request_as("operator", method, "/api/projects/p" + suffix, json=body)
            self.assertEqual(response.status, 200, await response.text())
            message = await socket.receive_json(timeout=2)
            self.assertEqual(message["type"], "project-changed")
            self.assertEqual(message["project"]["name"], body["name"])
            self.assertEqual(self.projects.read("p")["name"], body["name"])
            self.assertEqual(backend.JOBS["job"]["projectName"], body["name"])
            jobs = json.loads((self.root / "data" / "jobs.json").read_text(encoding="utf-8"))
            self.assertEqual(jobs[0]["projectName"], body["name"])
            after = dict(ledger.db.execute("SELECT * FROM cost_events WHERE job_id='job'").fetchone())
            self.assertEqual(after["project_name"], body["name"])
            for key in before.keys() - {"project_name", "updated_at"}:
                self.assertEqual(after[key], before[key], key)

    async def test_new_static_modules_require_login_have_head_and_javascript_mime(self):
        names = ("features/node-parameters.js", "features/project-persistence.js",
                 "features/task-panel.js", "capacity-page.js")
        for name in names:
            self.assertIn(name, STATIC_ASSETS)
            for method in ("GET", "HEAD"):
                self.assertEqual((await self.request_as(None, method, "/" + name)).status, 302)
                response = await self.request_as("reader", method, "/" + name)
                self.assertEqual(response.status, 200, name)
                self.assertIn(response.content_type, ("application/javascript", "text/javascript"))
                if method == "HEAD":
                    self.assertEqual(await response.read(), b"")
        for path in ("/capacity.html", "/features/", "/features/not-allowlisted.js"):
            self.assertEqual((await self.request_as("admin", "GET", path)).status, 404)
        self.assertEqual((await self.request_as("reader", "GET", "/api/workers")).status, 403)
        self.assertEqual((await self.request_as("admin", "GET", "/api/workers")).status, 200)


class ProjectPersistenceTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        import tempfile
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repository = ProjectRepository(Path(self.temp.name) / "projects")
        self.service = ProjectService(self.repository)

    async def test_creation_transitions_pending_file_active(self):
        events = []

        async def store(method, pid, *args, **kwargs):
            if method == "create_project":
                self.assertEqual(kwargs["state"], "pending")
                self.assertFalse(self.repository.exists(pid))
                events.append("pending")
                return {}
            self.assertEqual(args, ("active",))
            self.assertEqual(self.repository.read(pid)["name"], "原名")
            events.extend(("file", "active"))

        await self.service.create({"id": "owner"}, {"name": "原名"}, store=store)
        self.assertEqual(events, ["pending", "file", "active"])

    async def test_creation_write_failure_never_activates_acl(self):
        store = mock.AsyncMock(return_value={})
        with mock.patch.object(self.repository, "create", side_effect=OSError("disk full")):
            with self.assertRaises(OSError):
                await self.service.create({"id": "owner"}, {"name": "name"}, store=store)
        self.assertEqual(store.await_count, 1)
        self.assertEqual(store.call_args.kwargs["state"], "pending")

    async def test_atomic_replace_failure_keeps_original_and_cleans_temporary_file(self):
        self.repository.create("p", {"id": "p", "name": "历史", "rev": 4})
        before = self.repository.path("p").read_bytes()
        with mock.patch("server.project_repository.os.replace", side_effect=OSError("replace failed")):
            with self.assertRaises(OSError):
                self.repository.write("p", {"id": "p", "name": "new"})
        self.assertEqual(self.repository.path("p").read_bytes(), before)
        self.assertEqual(list(self.repository.directory.glob("*.tmp")), [])
        for value in ("../p", "a/b", "a\\b", "", None, "--"):
            with self.subTest(value=value), self.assertRaises(InvalidProjectId):
                self.repository.path(value)
        self.assertEqual(self.repository.path("历史-1").name, "历史-1.json")

    async def test_delete_order_keeps_document_until_cleanup_finishes(self):
        self.repository.create("p", {"id": "p"})
        events = []

        async def notify():
            events.append("notify")

        async def store(method, *args):
            if method == "set_project_state":
                events.append("revoke")
            else:
                events.append("list-jobs")
                return ["job"]

        async def close():
            events.append("close-presence")

        async def exports(pid):
            events.append("cancel-exports")

        async def cancel(jid):
            events.append("cancel-job")
            self.assertTrue(self.repository.exists("p"))

        original = self.repository.soft_delete

        def remove(pid):
            events.append("soft-delete")
            original(pid)

        with mock.patch.object(self.repository, "soft_delete", side_effect=remove):
            await self.service.delete("p", publish_deleted=notify, store=store,
                close_presence=close, cancel_exports=exports, cancel_job=cancel, should_cancel=lambda jid: True)
        self.assertEqual(events, ["notify", "revoke", "close-presence", "cancel-exports",
                                  "list-jobs", "cancel-job", "soft-delete"])
        self.assertTrue(self.repository.path("p").with_suffix(".json.deleted").is_file())
