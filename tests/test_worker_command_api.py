"""Real aiohttp + AuthStore boundary tests; all state lives in temporary DBs."""
import asyncio
import json
import os
import sqlite3
import sys
import threading
from contextlib import closing
import unittest
from pathlib import Path
from unittest import mock

import aiohttp

ROOT = Path(__file__).resolve().parents[1]
for directory in (ROOT, ROOT / "server", ROOT / "tests"):
    sys.path.insert(0, str(directory))

import app as controller
import test_worker_command_store as command_tests
from auth_support import AuthFixture, PASSWORD
from server.auth import COOKIE
from server import worker_command_api as command_api
from server.sandbox import allowed, sandbox_guard
from server.worker_command_api import register_worker_command_routes

BASE = "/api/admin/worker-commands"


class WorkerCommandAPITests(AuthFixture, command_tests.CommandStoreFixture,
                            unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Reuse the real account/HTTP fixture and only the store helper methods.
        self.auth_setup()
        self.addCleanup(self.auth_teardown)
        self.member = self.auth.create_user("member", PASSWORD)
        self.monitor = self.auth.create_user("monitor", PASSWORD, role="monitor")
        from distributed import DistributedStore
        self.store = DistributedStore(self.root / "control.db")
        self.addCleanup(self.store.close)
        self.commands = self.store.commands
        self.serial = 0
        self.agents = {}
        self.worker_id = self.worker("target")
        self.other_id = self.worker("other")
        # Do not inherit deployment Origin configuration or weaken production auth.
        patch = mock.patch.dict(os.environ, {"CHOUKA_AUTH_ORIGIN": ""})
        patch.start()
        self.addCleanup(patch.stop)
        application = self.build_app()
        application.middlewares.insert(0, sandbox_guard)
        application["distributed"] = self.store
        application["admin_sandbox"] = False
        register_worker_command_routes(application, get_store=controller.distributed_store,
                                       require_agent=controller.require_agent)
        application.router.add_post("/agent/v1/heartbeat", controller.api_agent_heartbeat)
        await self.start_client(application)
        self.addAsyncCleanup(self.client.close)
        # Share the real HTTP server, but use a separate cookie-free session.
        self.agent_session = aiohttp.ClientSession(cookie_jar=aiohttp.DummyCookieJar())
        self.addAsyncCleanup(self.agent_session.close)

    # unittest invokes inherited setUp before asyncSetUp; don't allocate the
    # store-only fixture as well (its API root would then be overwritten).
    def setUp(self):
        pass

    async def as_user(self, username):
        self.client.session.cookie_jar.clear()
        self.client.session.headers.clear()
        self.client.session.headers.update(await self.login(username))

    def agent_headers(self, worker_id=None, **changes):
        worker_id = worker_id or self.worker_id
        return {"X-Worker-ID": worker_id,
                "Authorization": "Bearer " + self.agents[worker_id]["worker_token"], **changes}

    async def agent_post(self, path, body, headers=None):
        return await self.agent_session.post(self.client.make_url(path), json=body,
                                             headers=self.agent_headers() if headers is None else headers)

    async def http_create(self, worker_ids=None, **changes):
        response = await self.client.post(BASE, json=command_tests.command_body(
            [self.worker_id] if worker_ids is None else worker_ids, **changes))
        self.assertEqual(response.status, 200, await response.text())
        return await response.json()

    async def http_claimed(self):
        detail = await self.http_create()
        row = self.execution(detail)
        response = await self.agent_post(f'/agent/v1/commands/{row["id"]}/claim',
                                         {"claim_key": "claim_0001"})
        self.assertEqual(response.status, 200, await response.text())
        self.assertTrue((await response.json())["authorized"])
        return detail, row

    def admin_routes(self, batch="missing"):
        return [("GET", BASE), ("GET", BASE + "/presets"), ("GET", BASE + "/" + batch),
                ("POST", BASE), ("POST", BASE + "/" + batch + "/cancel"),
                ("POST", BASE + "/" + batch + "/resolve")]

    def command_snapshot(self):
        with self.store.lock:
            return {table: [dict(row) for row in self.store.db.execute(f"SELECT * FROM {table} ORDER BY id")]
                    for table in ("worker_command_batches", "worker_command_executions")}

    async def revoker_login(self):
        user = await asyncio.to_thread(self.auth.create_user, "revoker", PASSWORD, role="admin")
        response = await self.agent_session.post(self.client.make_url("/api/auth/login"),
                                                 json={"username": "revoker", "password": PASSWORD},
                                                 headers={"Origin": self.origin})
        self.assertEqual(response.status, 200, await response.text())
        session = await response.json()
        token = response.cookies[COOKIE].value
        return user, {"Origin": self.origin, "X-CSRF-Token": session["csrf_token"],
                      "Cookie": f"{COOKIE}={token}"}, token

    async def revoke_admin_over_http(self, headers):
        response = await self.agent_session.patch(
            self.client.make_url(f'/api/admin/users/{self.admin["id"]}'),
            json={"role": "user"}, headers=headers)
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual((await response.json())["user"]["role"], "user")

    async def assert_chunked_admin_revocation(self, action):
        _, revoker_headers, _ = await self.revoker_login()
        if action == "create":
            path, body = BASE, command_tests.command_body([self.worker_id])
        else:
            detail = await self.http_create()
            row = self.execution(detail)
            if action == "resolve":
                self.commands.claim(row["id"], self.worker_id, "claim_0001")
                self.commands.report(row["id"], self.worker_id, command_tests.result_body(
                    status="unknown", exit_code=None, process_stopped=False))
            path = f'{BASE}/{detail["batch"]["id"]}/{action}'
            body = {} if action == "cancel" else {"execution_id": row["id"], "confirmed_stopped": True}
        before, changes = self.command_snapshot(), self.store.db.total_changes
        admitted, first_sent, finish = asyncio.Event(), asyncio.Event(), asyncio.Event()
        payload = json.dumps(body).encode("utf-8")
        original_body = command_api._body

        async def chunks():
            yield payload[:1]
            first_sent.set()
            await finish.wait()
            yield payload[1:]

        async def observed_body(request):
            self.assertEqual(request["user"]["id"], self.admin["id"])
            self.assertEqual(request.headers.get("Transfer-Encoding"), "chunked")
            self.assertIsNone(request.content_length)
            admitted.set()  # The actual auth/CSRF middleware has already passed.
            return await original_body(request)

        with mock.patch.object(command_api, "_body", side_effect=observed_body), \
                mock.patch.object(self.commands, action, wraps=getattr(self.commands, action)) as method:
            pending = asyncio.create_task(self.client.post(path, data=chunks(),
                                                           headers={"Content-Type": "application/json"}))
            try:
                await asyncio.wait_for(first_sent.wait(), 5)
                await asyncio.wait_for(admitted.wait(), 5)
                await self.revoke_admin_over_http(revoker_headers)
            finally:
                finish.set()
                response = await asyncio.wait_for(pending, 5)
            self.assertEqual(response.status, 401, await response.text())
            method.assert_not_called()
        self.assertEqual(self.command_snapshot(), before)
        self.assertEqual(self.store.db.total_changes, changes)
        if action == "create":
            self.assertEqual(before["worker_command_batches"], [])

    async def test_chunked_create_rechecks_revoked_admin_after_first_body_byte(self):
        await self.assert_chunked_admin_revocation("create")

    async def test_chunked_cancel_rechecks_revoked_admin_without_canceling(self):
        await self.assert_chunked_admin_revocation("cancel")

    async def test_chunked_resolve_rechecks_revoked_admin_without_unlocking(self):
        await self.assert_chunked_admin_revocation("resolve")

    async def assert_admin_read_revocation(self, action):
        _, revoker_headers, _ = await self.revoker_login()
        detail = await self.http_create()
        path = BASE if action == "history" else f'{BASE}/{detail["batch"]["id"]}'
        before, changes = self.command_snapshot(), self.store.db.total_changes
        admitted, resume = asyncio.Event(), asyncio.Event()
        original_admin_call = command_api._admin_call

        async def paused_call(request, method, *args):
            self.assertEqual(request["user"]["id"], self.admin["id"])
            admitted.set()
            await resume.wait()
            return await original_admin_call(request, method, *args)

        with mock.patch.object(command_api, "_admin_call", side_effect=paused_call), \
                mock.patch.object(self.commands, action, wraps=getattr(self.commands, action)) as method:
            pending = asyncio.create_task(self.client.get(path))
            try:
                await asyncio.wait_for(admitted.wait(), 5)
                await self.revoke_admin_over_http(revoker_headers)
            finally:
                resume.set()
                response = await asyncio.wait_for(pending, 5)
            self.assertEqual(response.status, 401, await response.text())
            method.assert_not_called()
        self.assertEqual(self.command_snapshot(), before)
        self.assertEqual(self.store.db.total_changes, changes)

    async def test_history_rechecks_admin_session_after_middleware(self):
        await self.assert_admin_read_revocation("history")

    async def test_detail_rechecks_admin_session_after_middleware(self):
        await self.assert_admin_read_revocation("detail")

    async def test_admin_authorization_transaction_survives_dispatch_commit(self):
        from server.auth_store import AuthStore
        revoker, _, token = await self.revoker_login()
        other_auth = AuthStore(self.root / "data/auth.db")
        self.addCleanup(other_auth.close)
        inserted, allow_commit = threading.Event(), threading.Event()
        committed, allow_return = threading.Event(), threading.Event()
        revoke_attempted, revoked = threading.Event(), threading.Event()
        errors = []
        original_create, original_detail = self.commands.create, self.commands._detail_locked

        def detail_before_commit(*args):
            value = original_detail(*args)
            inserted.set()
            if not allow_commit.wait(5):
                raise AssertionError("dispatch commit was not released")
            return value

        def create_through_commit(*args):
            value = original_create(*args)
            committed.set()  # Real DistributedStore transaction has COMMITted.
            if not allow_return.wait(5):
                raise AssertionError("authorization transaction was not released")
            return value

        def revoke():
            revoke_attempted.set()
            try:
                other_auth.set_user(self.admin["id"], role="user", actor_id=revoker["id"], session_token=token)
            except BaseException as exc:
                errors.append(exc)
            finally:
                revoked.set()

        thread = threading.Thread(target=revoke, daemon=True)
        with mock.patch.object(self.commands, "create", side_effect=create_through_commit), \
                mock.patch.object(self.commands, "_detail_locked", side_effect=detail_before_commit):
            pending = asyncio.create_task(self.client.post(BASE, json=command_tests.command_body([self.worker_id])))
            try:
                self.assertTrue(await asyncio.to_thread(inserted.wait, 5))
                thread.start()
                self.assertTrue(await asyncio.to_thread(revoke_attempted.wait, 5))
                self.assertFalse(await asyncio.to_thread(revoked.wait, 0.1))
                with closing(sqlite3.connect(self.root / "control.db")) as db:
                    self.assertEqual(db.execute("SELECT COUNT(*) FROM worker_command_batches").fetchone()[0], 0)
                allow_commit.set()
                self.assertTrue(await asyncio.to_thread(committed.wait, 5))
                self.assertFalse(await asyncio.to_thread(revoked.wait, 0.1),
                                 "revocation committed before command COMMIT finished under the auth guard")
                with closing(sqlite3.connect(self.root / "control.db")) as db:
                    self.assertEqual(db.execute("SELECT COUNT(*) FROM worker_command_batches").fetchone()[0], 1)
                with closing(sqlite3.connect(self.root / "data/auth.db")) as db:
                    self.assertEqual(db.execute("SELECT role FROM users WHERE id=?", (self.admin["id"],))
                                     .fetchone()[0], "admin")
            finally:
                allow_commit.set()
                allow_return.set()
                response = await asyncio.wait_for(pending, 5)
                if thread.ident is not None:
                    await asyncio.to_thread(thread.join, 5)
        self.assertEqual(response.status, 200, await response.text())
        self.assertFalse(thread.is_alive())
        self.assertTrue(revoked.is_set())
        self.assertFalse(errors, errors)
        self.assertEqual(self.auth.get_user(self.admin["id"])["role"], "user")
        self.assertEqual(len(self.command_snapshot()["worker_command_batches"]), 1)

    async def test_admin_reads_create_detail_presets_history_and_no_store(self):
        detail = await self.http_create()
        self.assertEqual(detail["batch"]["created_by"], self.admin["id"])
        self.assertEqual(self.execution(detail)["status"], "pending")
        for path in (BASE, BASE + "/presets", BASE + "/" + detail["batch"]["id"]):
            response = await self.client.get(path)
            self.assertEqual(response.status, 200, await response.text())
            self.assertIn("no-store", response.headers["Cache-Control"])
            body = await response.json()
            if path.endswith("/presets"):
                self.assertTrue(body["presets"])
                self.assertEqual(body["presets"][0]["interpreter"], "python")
            elif path == BASE:
                self.assertEqual(body["batches"][0]["id"], detail["batch"]["id"])
                self.assertNotIn("script", body["batches"][0])
            else:
                self.assertEqual(body, detail)
                for key in ("claim_key", "claim_deadline", "resolved_by"):
                    self.assertNotIn(key, self.execution(body))

    async def test_anonymous_all_admin_endpoints_are_401_no_worker_token_bypass(self):
        self.client.session.cookie_jar.clear()
        self.client.session.headers.clear()
        for method, path in self.admin_routes():
            with self.subTest(method=method, path=path):
                response = await self.client.request(method, path, json={}, headers=self.agent_headers())
                self.assertEqual(response.status, 401, await response.text())
        self.assertFalse(self.commands.history()["batches"])

    async def test_regular_user_and_monitor_all_admin_endpoints_are_403(self):
        for username in ("member", "monitor"):
            await self.as_user(username)
            for method, path in self.admin_routes():
                with self.subTest(username=username, method=method, path=path):
                    response = await self.client.request(method, path, json={})
                    self.assertEqual(response.status, 403, await response.text())
        self.assertFalse(self.commands.history()["batches"])

    async def test_csrf_origin_and_worker_headers_cannot_bypass_admin_mutations(self):
        detail = await self.http_create()
        row = self.execution(detail)
        mutations = [(BASE, command_tests.command_body([self.other_id], request_key="request_0002")),
                     (f'{BASE}/{detail["batch"]["id"]}/cancel', {}),
                     (f'{BASE}/{detail["batch"]["id"]}/resolve',
                      {"execution_id": row["id"], "confirmed_stopped": True})]
        good = dict(self.client.session.headers)
        bad_headers = [
            {"Origin": self.origin},
            {"Origin": self.origin, "X-CSRF-Token": "wrong"},
            {"X-CSRF-Token": good["X-CSRF-Token"]},
            {**good, "Origin": "https://attacker.invalid"},
            {**good, "Origin": "null"},
            {**good, "Origin": self.origin + ".attacker.invalid"},
            {**good, "Sec-Fetch-Site": "cross-site"},
            {**good, "Origin": "https://attacker.invalid", "Referer": self.origin + "/controller"},
            {"Origin": self.origin, **self.agent_headers()},
        ]
        before = self.commands.detail(detail["batch"]["id"])
        self.client.session.headers.clear()
        try:
            for path, body in mutations:
                for index, headers in enumerate(bad_headers):
                    with self.subTest(path=path, headers=index):
                        response = await self.client.post(path, json=body, headers=headers)
                        self.assertEqual(response.status, 403, await response.text())
        finally:
            self.client.session.headers.update(good)
        self.assertEqual(self.commands.detail(detail["batch"]["id"]), before)
        self.assertEqual(len(self.commands.history()["batches"]), 1)

    async def test_create_rejects_all_malformed_fields_with_400_not_500(self):
        for label, body in command_tests.invalid_commands():
            with self.subTest(case=label):
                response = await self.client.post(BASE, json=body)
                self.assertEqual(response.status, 400, await response.text())
        for raw in ("{broken", "null", '"text"'):
            with self.subTest(raw=raw):
                response = await self.client.post(BASE, data=raw, headers={"Content-Type": "application/json"})
                self.assertEqual(response.status, 400, await response.text())
        self.assertFalse(self.commands.history()["batches"])

    async def test_create_idempotent_conflict_and_missing_target_error_mapping(self):
        detail = await self.http_create()
        self.assertEqual(await self.http_create(), detail)
        response = await self.client.post(BASE, json=command_tests.command_body(
            [self.worker_id], script="print('changed')"))
        self.assertEqual(response.status, 409, await response.text())
        response = await self.client.post(BASE, json=command_tests.command_body(
            ["missing-worker"], request_key="request_0002"))
        self.assertEqual(response.status, 409, await response.text())
        for path in (BASE + "/missing", BASE + "/missing/cancel", BASE + "/missing/resolve"):
            if path.endswith("/resolve"):
                response = await self.client.post(path, json={"execution_id": "missing", "confirmed_stopped": True})
            elif path.endswith("/cancel"):
                response = await self.client.post(path, json={})
            else:
                response = await self.client.get(path)
            self.assertEqual(response.status, 404, await response.text())

    async def test_history_pagination_bad_types_and_bounds_are_400(self):
        for query in ("offset=no", "offset=-1", "offset=1.5", "limit=0", "limit=51", "limit=true"):
            with self.subTest(query=query):
                response = await self.client.get(BASE + "?" + query)
                self.assertEqual(response.status, 400, await response.text())

    async def test_history_large_offset_is_400_not_sqlite_overflow_500(self):
        for offset in (2 ** 63, 2 ** 63 + 1, 10 ** 100):
            with self.subTest(offset=offset):
                response = await self.client.get(f"{BASE}?offset={offset}&limit=20")
                self.assertEqual(response.status, 400, await response.text())
        response = await self.client.get(f"{BASE}?offset={2 ** 63 - 1}&limit=20")
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {"batches": [], "next_offset": None})

    async def test_manual_same_host_offline_and_online_targets_choose_online_worker(self):
        import time
        host = json.loads(self.worker_snapshot(self.worker_id)["capabilities_json"])["hardware"]["host_id"]
        peer = self.worker("same-host-peer", host=host)
        offline, online = sorted([self.worker_id, peer])
        self.update_worker(offline, last_seen=time.time() - 3600)
        detail = await self.http_create([offline, online])
        row = self.execution(detail)
        self.assertEqual((row["status"], row["worker_id"]), ("pending", online))
        self.assertEqual(set(row["worker_ids"]), {offline, online})
        response = await self.agent_post("/agent/v1/heartbeat", {"comfy_online": True}, self.agent_headers(online))
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual((await response.json())["commands"][0]["execution_id"], row["id"])
        response = await self.agent_post(f'/agent/v1/commands/{row["id"]}/claim',
                                         {"claim_key": "claim_0001"}, self.agent_headers(online))
        self.assertEqual(response.status, 200, await response.text())
        self.assertTrue((await response.json())["authorized"])

    async def test_active_heartbeat_host_mutation_returns_409_and_preserves_old_capabilities(self):
        for status in ("pending", "running", "unknown"):
            with self.subTest(status=status):
                worker = self.worker("fenced-" + status, host="frozen-" + status)
                detail = await self.http_create([worker], request_key="heartbeat_" + status)
                row = self.execution(detail)
                headers = self.agent_headers(worker)
                if status != "pending":
                    response = await self.agent_post(f'/agent/v1/commands/{row["id"]}/claim',
                                                     {"claim_key": "claim_0001"}, headers)
                    self.assertEqual(response.status, 200, await response.text())
                if status == "unknown":
                    response = await self.agent_post(f'/agent/v1/commands/{row["id"]}/result',
                                                     command_tests.result_body(status="unknown", exit_code=None,
                                                                               process_stopped=False), headers)
                    self.assertEqual(response.status, 200, await response.text())
                before_worker, before_command = self.worker_snapshot(worker), self.stored(row["id"])
                caps = json.loads(before_worker["capabilities_json"])
                for changed in ({**caps, "hardware": {"host_id": "different-device"}}, {},
                                {"host_id": "different-device"}):
                    response = await self.agent_post("/agent/v1/heartbeat", {
                        "comfy_online": True, "capabilities": changed}, headers)
                    self.assertEqual(response.status, 409, await response.text())
                    self.assertEqual(self.worker_snapshot(worker), before_worker)
                    self.assertEqual(self.stored(row["id"]), before_command)
                    self.assertTrue(self.host_blocked(row["host_id"]))
                skipped = await self.http_create([worker], request_key="still_locked_" + status)
                self.assertEqual(self.execution(skipped)["status"], "skipped")

    async def test_claim_own_db_busy_is_409_until_remote_only_local_busy_is_cleared(self):
        detail = await self.http_create()
        row = self.execution(detail)
        path = f'/agent/v1/commands/{row["id"]}/claim'
        response = await self.agent_post("/agent/v1/heartbeat", {
            "comfy_online": True, "busy": True, "local_busy": True})
        self.assertEqual(response.status, 200, await response.text())
        before = self.stored(row["id"])
        response = await self.agent_post(path, {"claim_key": "claim_0001"})
        self.assertEqual(response.status, 409, await response.text())
        self.assertEqual(self.stored(row["id"]), before)
        response = await self.agent_post("/agent/v1/heartbeat", {
            "comfy_online": True, "busy": True, "local_busy": False})
        self.assertEqual(response.status, 200, await response.text())
        self.assertFalse(self.worker_snapshot(self.worker_id)["busy"])
        response = await self.agent_post(path, {"claim_key": "claim_0001"})
        self.assertEqual(response.status, 200, await response.text())
        self.assertTrue((await response.json())["authorized"])

    @unittest.skipUnless(os.name == "nt", "real Windows command subprocess integration")
    async def test_real_http_remote_commands_windows_subprocess_round_trip_runs_once(self):
        from worker.remote_commands import RemoteCommands

        host = "test-roundtrip-" + self.root.name
        worker = self.worker("isolated-roundtrip", host=host)
        comfy = self.root / "isolated-comfy"
        (comfy / "input").mkdir(parents=True)
        marker = self.root / "execution-count.txt"
        script = ("import sys\nfrom pathlib import Path\n"
                  "with Path('execution-count.txt').open('a', encoding='utf-8') as output:\n"
                  "    output.write('run\\n')\n"
                  "print('真实中文标准输出')\n"
                  "print('真实中文标准错误', file=sys.stderr)\n")
        detail = await self.http_create([worker], script=script, cwd=str(self.root), timeout_seconds=10)
        row = self.execution(detail)
        response = await self.agent_post("/agent/v1/heartbeat", {"comfy_online": True}, self.agent_headers(worker))
        self.assertEqual(response.status, 200, await response.text())
        offers = (await response.json())["commands"]
        self.assertEqual(len(offers), 1)
        self.assertEqual((offers[0]["type"], offers[0]["execution_id"]), ("remote_command", row["id"]))
        remote = RemoteCommands(host, comfy_root=comfy, worker_root=ROOT / "worker", app_root=ROOT,
                                journal_dir=self.root / "isolated-journal")
        self.assertTrue(remote.receive(offers[0]))
        exchanges = []

        async def request(method, path, *, json):
            self.assertEqual(method, "POST")
            async with self.agent_session.request(method, self.client.make_url(path), json=json,
                                                   headers=self.agent_headers(worker)) as reply:
                self.assertEqual(reply.status, 200, await reply.text())
                body = await reply.json()
                exchanges.append((path, json, body))
                return body

        # No mock execution or direct store claim/report: real authenticated HTTP
        # crosses both boundaries and execute_command starts the embedded Python.
        self.assertTrue(await asyncio.wait_for(remote.pump(request, lambda: True), 20))
        self.assertEqual([exchange[0].rsplit("/", 1)[-1] for exchange in exchanges], ["claim", "result"])
        self.assertEqual(exchanges[0][1]["claim_key"], exchanges[1][1]["claim_key"])
        self.assertTrue(exchanges[0][2]["authorized"])
        self.assertTrue(exchanges[1][2]["accepted"])
        response = await self.client.get(f'{BASE}/{detail["batch"]["id"]}')
        self.assertEqual(response.status, 200, await response.text())
        completed = self.execution(await response.json())
        self.assertEqual((completed["status"], completed["exit_code"]), ("succeeded", 0), completed)
        self.assertIn("真实中文标准输出", completed["stdout"])
        self.assertIn("真实中文标准错误", completed["stderr"])
        self.assertTrue(completed["process_stopped"])
        self.assertFalse(remote.busy)
        self.assertEqual(marker.read_text(encoding="utf-8"), "run\n")
        self.assertFalse(remote.receive(offers[0]))
        remote.next_attempt = 0  # Test dedup, not the normal retry cooldown.
        self.assertFalse(await remote.pump(request, lambda: True))
        restarted = RemoteCommands(host, comfy_root=comfy, worker_root=ROOT / "worker", app_root=ROOT,
                                   journal_dir=self.root / "isolated-journal")
        self.assertFalse(restarted.receive(offers[0]))
        self.assertFalse(await restarted.pump(request, lambda: True))
        self.assertFalse(restarted.busy)
        self.assertEqual(len(exchanges), 2)
        self.assertEqual(marker.read_text(encoding="utf-8"), "run\n")
        response = await self.client.get(f'{BASE}/{detail["batch"]["id"]}')
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(self.execution(await response.json()), completed)

    async def test_worker_auth_requires_own_token_not_browser_session(self):
        detail = await self.http_create()
        row = self.execution(detail)
        for suffix, body in (("claim", {"claim_key": "claim_0001"}),
                             ("result", command_tests.result_body())):
            path = f'/agent/v1/commands/{row["id"]}/{suffix}'
            headers_list = [{}, {"X-Worker-ID": self.worker_id},
                            {"Authorization": self.agent_headers()["Authorization"]},
                            self.agent_headers(Authorization="Bearer wrong"),
                            self.agent_headers(Authorization="Basic wrong"),
                            self.agent_headers(**{"X-Worker-ID": self.other_id})]
            for index, headers in enumerate(headers_list):
                with self.subTest(suffix=suffix, headers=index):
                    response = await self.agent_post(path, body, headers)
                    self.assertEqual(response.status, 401, await response.text())
            response = await self.client.post(path, json=body)
            self.assertEqual(response.status, 401, await response.text())
        self.assertEqual(self.stored(row["id"])["status"], "pending")

    async def test_worker_cannot_claim_or_report_other_workers_execution(self):
        _, row = await self.http_claimed()
        before = self.stored(row["id"])
        for suffix, body in (("claim", {"claim_key": "claim_0001"}),
                             ("result", command_tests.result_body())):
            response = await self.agent_post(f'/agent/v1/commands/{row["id"]}/{suffix}', body,
                                             self.agent_headers(self.other_id))
            self.assertEqual(response.status, 404, await response.text())
        response = await self.agent_post(f'/agent/v1/commands/{row["id"]}/result',
                                         command_tests.result_body(claim_key="claim_0002"))
        self.assertEqual(response.status, 409, await response.text())
        self.assertEqual(self.stored(row["id"]), before)
        response = await self.agent_post(f'/agent/v1/commands/{row["id"]}/result', command_tests.result_body())
        self.assertEqual(response.status, 200, await response.text())
        self.assertTrue((await response.json())["accepted"])
        self.assertEqual(self.stored(row["id"])["status"], "succeeded")

    async def test_same_host_new_identity_404_until_admin_resolve_then_read_only_failed_ack(self):
        import time
        detail, row = await self.http_claimed()
        peer = self.worker(" TARGET ", host=row["host_id"])
        headers = self.agent_headers(peer)
        path = f'/agent/v1/commands/{row["id"]}/result'
        submitted = command_tests.result_body(stdout="replacement must not overwrite stdout",
                                               stderr="replacement stderr")
        before = self.stored(row["id"])
        changes = self.store.db.total_changes
        response = await self.agent_post(path, submitted, headers)
        self.assertEqual(response.status, 404, await response.text())
        self.assertEqual(self.stored(row["id"]), before)
        self.assertEqual(self.store.db.total_changes, changes)

        response = await self.agent_post(path, command_tests.result_body(
            status="unknown", exit_code=None, process_stopped=False,
            stdout="original stdout", stderr="original stderr", error="original process lost"))
        self.assertEqual(response.status, 200, await response.text())
        self.update_worker(self.worker_id, last_seen=time.time() - 3600, retired=1)
        before = self.stored(row["id"])
        changes = self.store.db.total_changes
        response = await self.agent_post(path, submitted, headers)
        self.assertEqual(response.status, 404, await response.text())
        self.assertEqual(self.stored(row["id"]), before)
        self.assertEqual(self.store.db.total_changes, changes)
        self.assertTrue(self.host_blocked(row["host_id"]))

        response = await self.client.post(f'{BASE}/{detail["batch"]["id"]}/resolve', json={
            "execution_id": row["id"], "confirmed_stopped": True})
        self.assertEqual(response.status, 200, await response.text())
        resolved = self.stored(row["id"])
        self.assertEqual(resolved["status"], "failed")
        self.assertTrue(resolved["process_stopped"])
        self.assertEqual(resolved["stdout"], "original stdout")
        self.assertEqual(resolved["resolved_by"], self.admin["id"])
        changes = self.store.db.total_changes
        for body in (submitted, command_tests.result_body(
                status="unknown", exit_code=None, process_stopped=False, stdout="stale journal stdout")):
            response = await self.agent_post(path, body, headers)
            self.assertEqual(response.status, 200, await response.text())
            self.assertEqual(await response.json(), {
                "execution_id": row["id"], "status": "failed", "accepted": True})
            self.assertEqual(self.stored(row["id"]), resolved)
            self.assertEqual(self.store.db.total_changes, changes, "ACK must not write dispatch DB")
        self.assertFalse(self.host_blocked(row["host_id"]))
        response = await self.agent_post(path, command_tests.result_body(claim_key="claim_0002"), headers)
        self.assertEqual(response.status, 404, await response.text())
        response = await self.agent_post(path, submitted, self.agent_headers(self.other_id))
        self.assertEqual(response.status, 404, await response.text())
        response = await self.agent_post(f'/agent/v1/commands/{row["id"]}/claim',
                                         {"claim_key": "claim_0001"}, headers)
        self.assertEqual(response.status, 404, await response.text())
        self.assertEqual(self.stored(row["id"]), resolved)
        self.assertEqual(self.store.db.total_changes, changes)

    async def test_same_host_unclaimed_canceled_ack_does_not_attach_claim_key(self):
        detail = await self.http_create()
        row = self.execution(detail)
        peer = self.worker("peer", host=row["host_id"])
        response = await self.client.post(f'{BASE}/{detail["batch"]["id"]}/cancel', json={})
        self.assertEqual(response.status, 200, await response.text())
        before = self.stored(row["id"])
        self.assertIsNone(before["claim_key"])
        self.assertEqual(before["status"], "canceled")
        self.assertTrue(before["process_stopped"])
        changes = self.store.db.total_changes
        for key in ("claim_0001", "claim_0002"):
            response = await self.agent_post(f'/agent/v1/commands/{row["id"]}/result',
                                             command_tests.result_body(claim_key=key, stdout="never executed"),
                                             self.agent_headers(peer))
            self.assertEqual(response.status, 200, await response.text())
            self.assertEqual(await response.json(), {
                "execution_id": row["id"], "status": "canceled", "accepted": True})
            self.assertEqual(self.stored(row["id"]), before)
            self.assertEqual(self.store.db.total_changes, changes)

    async def test_terminal_peer_ack_rejects_unstopped_process_or_missing_stable_host(self):
        _, row = await self.http_claimed()
        path = f'/agent/v1/commands/{row["id"]}/result'
        response = await self.agent_post(path, command_tests.result_body(status="failed", exit_code=7))
        self.assertEqual(response.status, 200, await response.text())
        missing_host = self.worker("missing-host", hardware={})
        before = self.stored(row["id"])
        changes = self.store.db.total_changes
        response = await self.agent_post(path, command_tests.result_body(), self.agent_headers(missing_host))
        self.assertEqual(response.status, 404, await response.text())
        self.assertEqual(self.stored(row["id"]), before)
        self.assertEqual(self.store.db.total_changes, changes)
        peer = self.worker("peer", host=row["host_id"])
        with self.store.lock, self.store.db:
            self.store.db.execute("UPDATE worker_command_executions SET process_stopped=0 WHERE id=?", (row["id"],))
        before = self.stored(row["id"])
        changes = self.store.db.total_changes
        response = await self.agent_post(path, command_tests.result_body(), self.agent_headers(peer))
        self.assertEqual(response.status, 404, await response.text())
        self.assertEqual(self.stored(row["id"]), before)
        self.assertEqual(self.store.db.total_changes, changes)

    async def test_claim_body_strictness_idempotence_conflict_and_missing_record(self):
        detail = await self.http_create()
        row = self.execution(detail)
        path = f'/agent/v1/commands/{row["id"]}/claim'
        for body in ([], {}, {"claim_key": None}, {"claim_key": True}, {"claim_key": []},
                     {"claim_key": {}}, {"claim_key": "short"},
                     {"claim_key": "claim_0001", "worker_id": self.worker_id}):
            with self.subTest(body=body):
                response = await self.agent_post(path, body)
                self.assertEqual(response.status, 400, await response.text())
        self.update_worker(self.worker_id, sync_status="error")
        response = await self.agent_post(path, {"claim_key": "claim_0001"})
        self.assertEqual(response.status, 409, await response.text())
        self.update_worker(self.worker_id, sync_status="idle")
        first = await self.agent_post(path, {"claim_key": "claim_0001"})
        self.assertEqual(first.status, 200, await first.text())
        response = await self.agent_post(path, {"claim_key": "claim_0001"})
        self.assertEqual(await response.json(), await first.json())
        response = await self.agent_post(path, {"claim_key": "claim_0002"})
        self.assertFalse((await response.json())["authorized"])
        response = await self.agent_post('/agent/v1/commands/missing/claim', {"claim_key": "claim_0001"})
        self.assertEqual(response.status, 404, await response.text())

    async def test_claim_retry_after_admin_cancel_ack_contains_true_cancel_flag(self):
        detail = await self.http_create()
        row = self.execution(detail)
        path = f'/agent/v1/commands/{row["id"]}/claim'
        response = await self.agent_post(path, {"claim_key": "claim_0001"})
        self.assertEqual(response.status, 200, await response.text())
        first = await response.json()
        self.assertEqual(first, {"execution_id": row["id"], "status": "running", "authorized": True,
                                 "claim_key": "claim_0001", "cancel_requested": False})
        self.assertIs(first["cancel_requested"], False)
        response = await self.agent_post(path, {"claim_key": "claim_0001"})
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), first)
        response = await self.client.post(f'{BASE}/{detail["batch"]["id"]}/cancel',
                                          json={"execution_id": row["id"]})
        self.assertEqual(response.status, 200, await response.text())
        before = self.stored(row["id"])
        changes = self.store.db.total_changes
        response = await self.agent_post(path, {"claim_key": "claim_0001"})
        self.assertEqual(response.status, 200, await response.text())
        retry = await response.json()
        self.assertEqual(retry, {**first, "cancel_requested": True})
        self.assertIs(retry["cancel_requested"], True)
        self.assertEqual(self.stored(row["id"]), before)
        self.assertEqual(self.store.db.total_changes, changes)
        self.assertTrue(self.host_blocked(row["host_id"]))

    async def test_running_same_key_claim_retry_changed_host_is_409(self):
        detail, row = await self.http_claimed()
        response = await self.agent_post("/agent/v1/heartbeat", {
            "comfy_online": True, "capabilities": {"host_id": "replacement-device"}})
        self.assertEqual(response.status, 409, await response.text())
        # Seed a legacy identity change directly; the normal heartbeat path is
        # now fenced, while claim must still reject historical inconsistencies.
        self.update_worker(self.worker_id, capabilities_json=json.dumps({"host_id": "replacement-device"}))
        for cancel in (False, True):
            with self.subTest(cancel_requested=cancel):
                if cancel:
                    response = await self.client.post(f'{BASE}/{detail["batch"]["id"]}/cancel', json={})
                    self.assertEqual(response.status, 200, await response.text())
                before = self.stored(row["id"])
                changes = self.store.db.total_changes
                response = await self.agent_post(f'/agent/v1/commands/{row["id"]}/claim',
                                                 {"claim_key": "claim_0001"})
                self.assertEqual(response.status, 409, await response.text())
                self.assertEqual(self.stored(row["id"]), before)
                self.assertEqual(self.store.db.total_changes, changes)

    async def test_pending_reports_except_unknown_conflict_and_terminal_ack_does_not_overwrite(self):
        detail = await self.http_create()
        row = self.execution(detail)
        path = f'/agent/v1/commands/{row["id"]}/result'
        before = self.stored(row["id"])
        for status, code in (("succeeded", 0), ("failed", 7), ("canceled", None), ("timed_out", None)):
            with self.subTest(status=status):
                response = await self.agent_post(path, command_tests.result_body(status=status, exit_code=code))
                self.assertEqual(response.status, 409, await response.text())
                self.assertEqual(self.stored(row["id"]), before)
        response = await self.agent_post(f'/agent/v1/commands/{row["id"]}/claim', {"claim_key": "claim_0001"})
        self.assertEqual(response.status, 200, await response.text())
        response = await self.agent_post(path, command_tests.result_body())
        self.assertEqual(response.status, 200, await response.text())
        terminal = self.stored(row["id"])
        response = await self.agent_post(path, command_tests.result_body(status="failed", exit_code=8,
                                                                        stdout="late overwrite"))
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {"execution_id": row["id"], "status": "succeeded", "accepted": True})
        self.assertEqual(self.stored(row["id"]), terminal)
        response = await self.agent_post(path, command_tests.result_body(claim_key="claim_0002"))
        self.assertEqual(response.status, 409, await response.text())

    async def test_worker_result_validation_output_limits_and_http_state_unchanged(self):
        _, row = await self.http_claimed()
        path = f'/agent/v1/commands/{row["id"]}/result'
        before = self.stored(row["id"])
        bodies = [[], {}, command_tests.result_body(status="running"),
                  command_tests.result_body(exit_code=True), command_tests.result_body(exit_code=3),
                  command_tests.result_body(exit_code=2 ** 63), command_tests.result_body(stdout=None),
                  command_tests.result_body(stdout="汉" * 21846),
                  command_tests.result_body(stderr="x" * (command_tests.OUTPUT_LIMIT + 1)),
                  command_tests.result_body(error="x" * 2001),
                  command_tests.result_body(stdout_truncated=1),
                  command_tests.result_body(stderr_truncated="false"),
                  command_tests.result_body(process_stopped=False),
                  command_tests.result_body(status="failed", exit_code=7, process_stopped=False),
                  {**command_tests.result_body(), "worker_id": self.other_id}]
        for index, body in enumerate(bodies):
            with self.subTest(case=index):
                response = await self.agent_post(path, body)
                self.assertEqual(response.status, 400, await response.text())
                self.assertEqual(self.stored(row["id"]), before)
        response = await self.agent_post(path, command_tests.result_body(
            stdout="汉" * 21845 + "x", stderr="x" * command_tests.OUTPUT_LIMIT,
            stdout_truncated=True, stderr_truncated=True))
        self.assertEqual(response.status, 200, await response.text())

    async def test_cancel_validates_scope_and_running_keeps_host_locked(self):
        detail, row = await self.http_claimed()
        path = f'{BASE}/{detail["batch"]["id"]}/cancel'
        for body in ([], {"execution_id": None}, {"execution_id": True}, {"execution_id": []},
                     {"execution_id": ""}, {"execution_id": "x" * 129}, {"extra": 1}):
            with self.subTest(body=body):
                response = await self.client.post(path, json=body)
                self.assertEqual(response.status, 400, await response.text())
        foreign = self.execution(await self.http_create([self.other_id], request_key="request_0002"))
        response = await self.client.post(path, json={"execution_id": foreign["id"]})
        self.assertEqual(response.status, 404, await response.text())
        response = await self.client.post(path, json={"execution_id": row["id"]})
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(self.execution(await response.json())["status"], "running")
        self.assertTrue(self.host_blocked(row["host_id"]))
        heartbeat = await self.agent_post("/agent/v1/heartbeat", {"comfy_online": True})
        self.assertEqual(heartbeat.status, 200, await heartbeat.text())
        self.assertEqual((await heartbeat.json())["commands"],
                         [{"type": "cancel_remote_command", "execution_id": row["id"]}])

    async def test_resolve_requires_explicit_boolean_admin_confirmation_and_unknown_status(self):
        detail, row = await self.http_claimed()
        path = f'{BASE}/{detail["batch"]["id"]}/resolve'
        valid = {"execution_id": row["id"], "confirmed_stopped": True}
        response = await self.client.post(path, json=valid)
        self.assertEqual(response.status, 409, await response.text())
        response = await self.agent_post(f'/agent/v1/commands/{row["id"]}/result',
                                         command_tests.result_body(status="unknown", exit_code=None,
                                                                   process_stopped=False))
        self.assertEqual(response.status, 200, await response.text())
        for body in ([], {}, {"execution_id": row["id"]},
                     {**valid, "extra": 1}, {**valid, "execution_id": []},
                     {**valid, "execution_id": ""}, {**valid, "execution_id": "x" * 129},
                     *({**valid, "confirmed_stopped": value} for value in (False, None, 1, "true", [], {}))):
            with self.subTest(body=body):
                response = await self.client.post(path, json=body)
                self.assertEqual(response.status, 400, await response.text())
                self.assertTrue(self.host_blocked(row["host_id"]))
        await self.as_user("member")
        response = await self.client.post(path, json=valid)
        self.assertEqual(response.status, 403, await response.text())
        self.assertTrue(self.host_blocked(row["host_id"]))
        await self.as_user("admin")
        response = await self.client.post(path, json=valid)
        self.assertEqual(response.status, 200, await response.text())
        resolved = self.execution(await response.json())
        self.assertEqual(resolved["status"], "failed")
        self.assertTrue(resolved["process_stopped"])
        self.assertFalse(self.host_blocked(row["host_id"]))
        self.assertEqual(self.stored(row["id"])["resolved_by"], self.admin["id"])

    async def test_real_heartbeat_offers_once_claimed_not_reoffered_and_expired_never_returns(self):
        import time
        detail = await self.http_create()
        row = self.execution(detail)
        response = await self.agent_post("/agent/v1/heartbeat", {"comfy_online": True})
        self.assertEqual(response.status, 200, await response.text())
        offer = (await response.json())["commands"]
        self.assertEqual(offer[0]["execution_id"], row["id"])
        self.assertEqual(offer[0]["script"], detail["batch"]["script"])
        self.update_worker(self.worker_id, last_seen=time.time() - self.store.offline_seconds - 1)
        response = await self.agent_post("/agent/v1/heartbeat", {"comfy_online": True})
        self.assertEqual((await response.json())["commands"], [])
        response = await self.agent_post(f'/agent/v1/commands/{row["id"]}/claim', {"claim_key": "claim_0001"})
        claim = await response.json()
        self.assertEqual((claim["authorized"], claim["status"]), (False, "expired"))
        _, running = await self.http_claimed_new_key()
        response = await self.agent_post("/agent/v1/heartbeat", {"comfy_online": True})
        self.assertEqual((await response.json())["commands"], [])
        self.assertEqual(self.stored(running["id"])["status"], "running")

    async def http_claimed_new_key(self):
        detail = await self.http_create(request_key="request_0002")
        row = self.execution(detail)
        response = await self.agent_post(f'/agent/v1/commands/{row["id"]}/claim', {"claim_key": "claim_0001"})
        self.assertEqual(response.status, 200, await response.text())
        self.assertTrue((await response.json())["authorized"])
        return detail, row

    async def test_sandbox_guard_denies_every_command_write_even_with_valid_credentials(self):
        # The production guard is tested on the real TestClient. Only this local
        # app flag is toggled; no production configuration or file is touched.
        detail, row = await self.http_claimed()
        application = self.client.server.app
        application["admin_sandbox"] = True
        writes = [(BASE, command_tests.command_body([self.other_id], request_key="request_0002")),
                  (f'{BASE}/{detail["batch"]["id"]}/cancel', {}),
                  (f'{BASE}/{detail["batch"]["id"]}/resolve',
                   {"execution_id": row["id"], "confirmed_stopped": True})]
        before = self.stored(row["id"])
        for path, body in writes:
            self.assertFalse(allowed("POST", path))
            response = await self.client.post(path, json=body)
            self.assertEqual(response.status, 403, await response.text())
            self.assertEqual(response.headers["X-H3Card-Sandbox"], "local-copy")
        for suffix, body in (("claim", {"claim_key": "claim_0001"}),
                             ("result", command_tests.result_body())):
            path = f'/agent/v1/commands/{row["id"]}/{suffix}'
            self.assertFalse(allowed("POST", path))
            response = await self.agent_post(path, body)
            self.assertEqual(response.status, 403, await response.text())
        response = await self.client.get(BASE)
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(self.stored(row["id"]), before)
        self.assertEqual(len(self.commands.history()["batches"]), 1)


if __name__ == "__main__":
    unittest.main()
