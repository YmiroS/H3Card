"""Project-group machine isolation against real auth, dispatch and HTTP stores."""
import asyncio
import copy
import json
import sys
import time
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import app as controller
from auth_support import AuthFixture, PASSWORD
from distributed import DistributedStore
from server.monitor import register_monitor_routes


class WorkerAccessAPITest(AuthFixture, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.auth_setup()
        self.member = self.auth.create_user("member", PASSWORD)
        self.other = self.auth.create_user("other", PASSWORD)
        self.screen = self.auth.create_user("screen", PASSWORD, role="monitor")
        self.team = self.auth.create_team("制作组", self.admin["id"])
        self.auth.add_team_member(self.team["id"], self.member["id"], self.admin["id"])
        self.own_project("p", owner=self.member)
        self.auth.set_project_shares("p", [self.other["id"]], [], self.member["id"])
        self.store = DistributedStore(self.root / "control.db")
        self.store.access_resolver = self.auth.job_worker_teams
        self.store.access_guard = self.auth.lock
        self.caps = {
            "hardware": {"os": {"name": "Windows"}},
            "node_classes": ["KSampler"],
            "devices": [{"type": "cuda", "name": "RTX 5090", "vram_total": 32 * 1024 ** 3}],
        }
        self.agents = {}
        self.private = self.worker("专用机器")
        self.public = self.worker("公共机器")
        self.store.set_worker_access(self.private, self.team["id"])
        self.graph = {"1": {"class_type": "KSampler", "inputs": {}}}
        (self.root / "test.api.json").write_text(json.dumps(self.graph), encoding="utf-8")
        self.cap = {"id": "test-video", "name": "测试", "outputType": "video",
                    "_graph_ok": True, "graph": "test.api.json", "inputs": []}
        self.patches = ExitStack()
        self.patches.enter_context(mock.patch.object(controller, "CONTROLLER_MODE", True))
        self.patches.enter_context(mock.patch.object(controller, "ROOT", self.root))
        self.patches.enter_context(mock.patch.object(controller, "PROJ_DIR", self.root / "data/projects"))
        self.patches.enter_context(mock.patch.object(controller, "save_jobs", lambda: None))
        self.patches.enter_context(mock.patch.object(controller, "JOBS", {}))
        self.patches.enter_context(mock.patch.object(controller, "STEPS", {}))
        self.patches.enter_context(mock.patch.object(controller, "WEIGHTS", {}))
        self.patches.enter_context(mock.patch.dict(controller.CAPS, {self.cap["id"]: self.cap}))
        app = self.build_app()
        app["distributed"] = self.store
        app.router.add_post("/api/workers/{worker_id}/access", controller.api_worker_access)
        app.router.add_get("/api/workers", controller.api_workers)
        app.router.add_get("/api/health", controller.api_health)
        app.router.add_get("/api/generation/workers", controller.api_generation_workers)
        app.router.add_post("/api/generate", controller.api_generate)
        app.router.add_post("/agent/v1/jobs/acquire", controller.api_agent_acquire)
        app.router.add_get("/api/jobs", controller.api_jobs)
        app.router.add_get("/api/job/{pid}", controller.api_job)
        web_root = self.root / "web"
        web_root.mkdir()
        register_monitor_routes(app, web_root=web_root,
                                get_jobs=lambda: tuple(controller.JOBS.values()),
                                get_health=controller.monitor_health_snapshot)
        await self.start_client(app)

    async def asyncTearDown(self):
        await self.client.close()
        self.patches.close()
        self.store.close()
        self.auth_teardown()

    def worker(self, name):
        agent = self.store.register_worker(name, self.caps)
        worker_id = agent["worker_id"]
        self.agents[worker_id] = agent
        self.store.heartbeat(worker_id, comfy_online=True)
        return worker_id

    async def as_user(self, username):
        self.client.session.cookie_jar.clear()
        self.client.session.headers.update(await self.login(username))

    async def picker(self):
        response = await self.client.get("/api/generation/workers?capability=test-video")
        self.assertEqual(response.status, 200, await response.text())
        return {worker["id"] for worker in (await response.json())["workers"]}

    async def submit(self, target=None):
        body = {"project": "p", "capability": "test-video"}
        if target:
            body["target_worker_id"] = target
        with mock.patch.object(controller, "patch_graph", return_value=self.graph):
            return await self.client.post("/api/generate", json=body)

    async def test_picker_tracks_membership_not_project_team_and_admin_sees_all(self):
        await self.as_user("member")
        self.assertEqual(await self.picker(), {self.private, self.public})
        await self.as_user("other")
        self.assertEqual(await self.picker(), {self.public})
        self.auth.add_team_member(self.team["id"], self.other["id"], self.admin["id"])
        self.assertEqual(await self.picker(), {self.private, self.public})
        self.auth.remove_team_member(self.team["id"], self.other["id"], self.admin["id"])
        self.assertEqual(await self.picker(), {self.public})
        await self.as_user("admin")
        self.assertEqual(await self.picker(), {self.private, self.public})

    async def test_manual_target_rejected_without_side_effects_and_dry_run_cannot_bypass(self):
        await self.as_user("other")
        response = await self.submit(self.private)
        self.assertEqual(response.status, 400, await response.text())
        for target in (self.private, "missing"):
            response = await self.client.post("/api/generate", json={
                "project": "p", "capability": "test-video", "target_worker_id": target,
                "dry_run": True, "team_id": self.team["id"], "user_id": self.member["id"],
            })
            self.assertEqual(response.status, 400, await response.text())
        self.assertFalse(controller.JOBS)
        self.assertEqual(self.store.db.execute("SELECT COUNT(*) FROM dispatch_jobs").fetchone()[0], 0)
        self.assertEqual(self.auth.db.execute("SELECT COUNT(*) FROM job_acl").fetchone()[0], 0)

    async def test_auto_dispatch_member_private_first_outsider_public_only(self):
        await self.as_user("member")
        response = await self.submit()
        self.assertEqual(response.status, 200, await response.text())
        job = await response.json()
        self.assertIsNone(self.store.acquire(self.public))
        assignment = self.store.acquire(self.private)
        self.assertEqual(assignment["job_id"], job["id"])
        await self.as_user("other")
        response = await self.submit()
        self.assertEqual(response.status, 200, await response.text())
        other_job = await response.json()
        self.assertEqual(self.store.acquire(self.public)["job_id"], other_job["id"])

    async def test_admin_save_restore_public_and_expiration(self):
        path = f"/api/workers/{self.public}/access"
        end = time.time() + 3600
        response = await self.client.post(path, json={"team_id": self.team["id"], "expires_at": end})
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {
            "ok": True, "worker_id": self.public,
            "access_team_id": self.team["id"], "access_expires_at": end,
        })
        await self.as_user("other")
        self.assertEqual(await self.picker(), set())
        with mock.patch("distributed.time.time", return_value=end + 1):
            self.assertEqual(await self.picker(), {self.public})
        await self.as_user("admin")
        response = await self.client.post(path, json={"team_id": None, "expires_at": None})
        self.assertEqual(response.status, 200, await response.text())
        await self.as_user("other")
        self.assertEqual(await self.picker(), {self.public})

    async def test_mutation_requires_admin_csrf_and_strict_valid_body(self):
        path = f"/api/workers/{self.public}/access"
        original = self.store.list_workers()
        for body in ({}, [], {"team_id": "unknown", "expires_at": None},
                     {"team_id": self.team["id"], "expires_at": True},
                     {"team_id": self.team["id"], "expires_at": "tomorrow"},
                     {"team_id": self.team["id"], "expires_at": float("nan")},
                     {"team_id": self.team["id"], "expires_at": float("inf")},
                     {"team_id": self.team["id"], "expires_at": 10 ** 100},
                     {"team_id": self.team["id"], "expires_at": time.time() - 1},
                     {"team_id": None, "expires_at": time.time() + 60},
                     {"team_id": 1, "expires_at": None},
                     {"team_id": None, "expires_at": None, "extra": 1}):
            response = await self.client.post(path, json=body)
            self.assertEqual(response.status, 400, (body, await response.text()))
        response = await self.client.post(path, data="{broken", headers={"Content-Type": "application/json"})
        self.assertEqual(response.status, 400)
        response = await self.client.post(path, json={"team_id": None, "expires_at": None},
                                          headers={"X-CSRF-Token": "invalid"})
        self.assertEqual(response.status, 403)
        response = await self.client.post("/api/workers/missing/access", json={"team_id": None, "expires_at": None})
        self.assertEqual(response.status, 404)
        for username in ("member", "other", "screen"):
            await self.as_user(username)
            response = await self.client.post(path, json={"team_id": None, "expires_at": None})
            self.assertEqual(response.status, 403)
        self.assertEqual(self.store.list_workers(), original)

    async def test_monitor_hides_private_details_temperatures_jobs_and_primary_baseline(self):
        caps = copy.deepcopy(self.caps)
        caps["is_primary_node"] = True
        self.store.heartbeat(self.private, comfy_online=True, capabilities=caps)
        controller.JOBS["hidden"] = {"id": "hidden", "status": "running", "created": time.time(),
                                     "worker_id": self.private, "project": "p"}
        self.register_job("hidden", owner=self.member)
        await self.as_user("screen")
        response = await self.client.get("/api/monitor/summary")
        self.assertEqual(response.status, 200, await response.text())
        data = await response.json()
        self.assertEqual({worker["id"] for worker in data["workers"]}, {self.public})
        self.assertEqual(data["jobs"], [])
        self.assertEqual(data["health"]["jobs"], 0)
        self.assertEqual(data["status"]["running_count"], 0)
        self.assertNotIn(self.private, json.dumps(data))
        for suffix in ("", "/temperature"):
            response = await self.client.get(f"/api/monitor/workers/{self.private}{suffix}")
            self.assertEqual(response.status, 404)
        response = await self.client.get(f"/api/monitor/workers/{self.public}")
        self.assertEqual(response.status, 200, await response.text())
        self.assertNotIn(self.private, json.dumps(await response.json()))
        self.auth.add_team_member(self.team["id"], self.screen["id"], self.admin["id"])
        response = await self.client.get(f"/api/monitor/workers/{self.private}")
        self.assertEqual(response.status, 200, await response.text())
        await self.as_user("admin")
        response = await self.client.get("/api/monitor/summary")
        self.assertEqual(len((await response.json())["workers"]), 2)

    async def test_shared_job_identity_hidden_without_rewriting_history(self):
        await self.as_user("member")
        response = await self.submit(self.private)
        self.assertEqual(response.status, 200, await response.text())
        job = await response.json()
        self.store.acquire(self.private)
        controller.JOBS[job["id"]]["worker_id"] = self.private
        before = copy.deepcopy(controller.JOBS[job["id"]])
        await self.as_user("other")
        for path in (f'/api/job/{job["id"]}', "/api/jobs"):
            response = await self.client.get(path)
            self.assertEqual(response.status, 200, await response.text())
            data = await response.json()
            item = data["jobs"][0] if "jobs" in data else data
            self.assertNotIn("worker_id", item)
            self.assertNotIn("target_worker_id", item)
            self.assertIsNone(item["nodeName"])
            self.assertNotIn("专用机器", json.dumps(data, ensure_ascii=False))
        self.assertEqual(controller.JOBS[job["id"]], before)
        await self.as_user("member")
        response = await self.client.get(f'/api/job/{job["id"]}')
        self.assertEqual((await response.json())["nodeName"], "专用机器")

    async def test_dispatch_identity_is_hidden_before_job_cache_catches_up(self):
        await self.as_user("member")
        response = await self.submit(self.private)
        self.assertEqual(response.status, 200, await response.text())
        job = await response.json()
        ready, resume = asyncio.Event(), asyncio.Event()
        original = controller.execution_project

        async def delayed(app, job_id):
            result = await original(app, job_id)
            ready.set()
            await resume.wait()
            return result

        with mock.patch.object(controller, "execution_project", delayed):
            pending = asyncio.ensure_future(self.client.post("/agent/v1/jobs/acquire", headers={
                "X-Worker-ID": self.private,
                "Authorization": "Bearer " + self.agents[self.private]["worker_token"],
            }))
            try:
                await asyncio.wait_for(ready.wait(), 5)
                self.assertEqual(self.store.dispatch_status(job["id"]), "assigned")
                self.assertNotIn("worker_id", controller.JOBS[job["id"]])
                await self.as_user("other")
                for path in (f'/api/job/{job["id"]}', "/api/jobs"):
                    response = await self.client.get(path)
                    self.assertEqual(response.status, 200, await response.text())
                    data = await response.json()
                    item = data["jobs"][0] if "jobs" in data else data
                    self.assertNotIn("worker_id", item)
                    self.assertNotIn("target_worker_id", item)
                    self.assertIsNone(item["nodeName"])
                await self.as_user("member")
                response = await self.client.get(f'/api/job/{job["id"]}')
                self.assertEqual((await response.json())["nodeName"], "专用机器")
            finally:
                resume.set()
                await pending

    async def test_expired_dispatch_binding_does_not_keep_old_private_name(self):
        for endpoint in ("detail", "list"):
            await self.as_user("member")
            response = await self.submit()
            self.assertEqual(response.status, 200, await response.text())
            job = await response.json()
            self.store.lease_seconds = -1
            self.assertEqual(self.store.acquire(self.private)["job_id"], job["id"])
            await self.as_user("other")
            original = self.store.job_worker_names
            first = True

            def names_then_requeue(ids):
                nonlocal first
                names = original(ids)
                if first:
                    first = False
                    self.store.heartbeat(self.private, comfy_online=True)
                return names

            path = f'/api/job/{job["id"]}' if endpoint == "detail" else "/api/jobs"
            with mock.patch.object(self.store, "job_worker_names", side_effect=names_then_requeue):
                response = await self.client.get(path)
                self.assertEqual(response.status, 200, await response.text())
                data = await response.json()
            item = next(item for item in data["jobs"] if item["id"] == job["id"]) if "jobs" in data else data
            self.assertEqual(self.store.dispatch_status(job["id"]), "queued")
            self.assertNotIn("worker_id", item)
            self.assertIsNone(item["nodeName"])
            self.store.request_cancel(job["id"])

    async def test_non_worker_labels_survive_identity_projection(self):
        for job_id, fields, label in (
            ("remote", {"executor": controller.sr_service.EXECUTION}, "远程超分服务"),
            ("cloud", {"execution": "cloud_image"}, "云端 API"),
        ):
            controller.JOBS[job_id] = {"id": job_id, "created": time.time(), "status": "queued", **fields}
            self.register_job(job_id, owner=self.member)
            await self.as_user("other")
            response = await self.client.get(f"/api/job/{job_id}")
            self.assertEqual(response.status, 200, await response.text())
            self.assertEqual((await response.json())["nodeName"], label)

    async def test_health_only_counts_visible_devices(self):
        self.store.set_worker_enabled(self.public, False)
        await self.as_user("other")
        response = await self.client.get("/api/health")
        self.assertEqual(response.status, 200)
        self.assertFalse((await response.json())["comfy_online"])
        await self.as_user("member")
        response = await self.client.get("/api/health")
        self.assertTrue((await response.json())["comfy_online"])


if __name__ == "__main__":
    unittest.main()
