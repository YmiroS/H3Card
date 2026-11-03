import asyncio
import calendar
import json
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock
from urllib.parse import parse_qs, urlsplit

import aiohttp
from aiohttp import web
from aiohttp.test_utils import TestServer
from yarl import URL

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "tests"))

import app as chouka_app
import auth_support
from server import oss_client, sr_service
from server.oss_client import OSSClient, OSSConfig

FIXED = calendar.timegm((2026, 11, 3, 2, 30, 45, 0, 0, 0))


def oss_config(token=""):
    return OSSConfig.from_root(
        "oss://one-ai/chouka-sr", endpoint="oss-cn-zhangjiakou.aliyuncs.com",
        region="cn-zhangjiakou", access_key_id="LTAI-test-access",
        access_key_secret="secret/with+chars==", security_token=token)


class OSSSignatureTests(unittest.TestCase):
    # Reference values produced by the official oss2 2.19.1 SDK (AuthV4) for the same inputs.
    def test_presign_matches_official_sdk(self):
        url = OSSClient(None, oss_config()).presign("chouka-sr/1234-abcd/video.mp4", 86400, now=FIXED)
        query = parse_qs(urlsplit(url).query)
        self.assertEqual(query["x-oss-signature"],
                         ["13d61bbded51c4c001b1af1d1ca4005e556c827bd13db7e447bf581cd6cfdf58"])
        self.assertEqual(query["x-oss-credential"],
                         ["LTAI-test-access/20261103/cn-zhangjiakou/oss/aliyun_v4_request"])
        self.assertEqual(urlsplit(url).netloc, "one-ai.oss-cn-zhangjiakou.aliyuncs.com")

    def test_presign_with_sts_token_matches_official_sdk(self):
        url = OSSClient(None, oss_config("sts-token/abc+def==")).presign(
            "chouka-sr/1234-abcd/video.mp4", 86400, now=FIXED)
        query = parse_qs(urlsplit(url).query)
        self.assertEqual(query["x-oss-security-token"], ["sts-token/abc+def=="])
        self.assertEqual(query["x-oss-signature"],
                         ["bdcf214bb5d5233a02b5bafc4151f792b1d17d63b4c6bde571ca2e10d1dcf6fd"])

    def test_put_authorization_matches_official_sdk(self):
        client = OSSClient(None, oss_config())
        headers = client._signed_headers("PUT", "chouka-sr/中文 目录/ref0 (1).png",
                                         {"Content-Type": "video/mp4"}, now=FIXED)
        self.assertEqual(headers["Authorization"], (
            "OSS4-HMAC-SHA256 Credential=LTAI-test-access/20261103/cn-zhangjiakou/oss/aliyun_v4_request, "
            "Signature=1918c11578d045cfeaa1bff51e5c5976957933a335c89e61ac97980d01568296"))
        self.assertEqual(headers["x-oss-content-sha256"], "UNSIGNED-PAYLOAD")

    def test_invalid_inputs_are_rejected(self):
        client = OSSClient(None, oss_config())
        for seconds in (0, 7 * 24 * 3600 + 1):
            with self.assertRaises(ValueError):
                client.presign("chouka-sr/a.mp4", seconds)
        for parts in (("..", "a.mp4"), ("",)):
            with self.assertRaises(ValueError):
                client.key(*parts)
        self.assertEqual(client.key("job", "video.mp4"), "chouka-sr/job/video.mp4")
        for root in ("s3://bucket/x", "oss://Bad_Bucket/x", "oss://bucket/../x", "oss://u@bucket/x"):
            with self.assertRaises(ValueError):
                oss_client.parse_oss_root(root)
        with self.assertRaises(ValueError):
            OSSConfig.from_root("oss://one-ai/x", endpoint="https://oss.example.com/path",
                                region="cn-zhangjiakou", access_key_id="a", access_key_secret="b")


class ConfigTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "sr-service.json"
        patcher = mock.patch.dict(os.environ, {"CHOUKA_SR_CONFIG": str(self.path)})
        patcher.start()
        self.addCleanup(patcher.stop)
        for name in ("CHOUKA_SR_OSS_ACCESS_KEY_ID", "CHOUKA_SR_OSS_ACCESS_KEY_SECRET", "CHOUKA_SR_OSS_STS_TOKEN"):
            os.environ.pop(name, None)

    def write(self, **overrides):
        config = {"oss": {"root": "oss://one-ai/chouka-sr", "endpoint": "oss-cn-zhangjiakou.aliyuncs.com",
                          "region": "cn-zhangjiakou", "access_key_id": "file-id",
                          "access_key_secret": "file-secret"}, **overrides}
        self.path.write_text(json.dumps(config), encoding="utf-8")

    def test_missing_file_is_unconfigured(self):
        self.assertFalse(sr_service.configured())

    def test_defaults_and_environment_secrets(self):
        self.write()
        with mock.patch.dict(os.environ, {"CHOUKA_SR_OSS_ACCESS_KEY_SECRET": "env-secret"}):
            config = sr_service.load_config()
        self.assertEqual(config["model_id"], "wan-speed-opt-mokuSR-hytest4")
        self.assertEqual(config["oss"].access_key_id, "file-id")
        self.assertEqual(config["oss"].access_key_secret, "env-secret")
        self.assertEqual((config["oss"].bucket, config["oss"].prefix), ("one-ai", "chouka-sr"))

    def test_invalid_values_are_unconfigured(self):
        for overrides in ({"enabled": False}, {"gateway": "http://ykaigc-gw.youku.com/x"},
                          {"gateway": "https://evil.example.com/x"}, {"poll_interval": 0},
                          {"oss": {"root": "oss://one-ai/x"}}):
            with self.subTest(overrides=overrides):
                self.write(**overrides)
                self.assertFalse(sr_service.configured())

    def test_payload_mapping(self):
        payload = sr_service.build_payload(
            {"output_height": "1080", "num_frames": 60, "lf_anchor": "off"}, "V", ["R1", "R2"], "name")
        self.assertEqual(payload, {"image_paths": "", "lr_video_path": "V", "video_name": "name",
                                   "output_height": 1080, "num_frames": 60, "lf_anchor": "0",
                                   "ref_image_paths": "R1,R2"})
        self.assertNotIn("num_frames", sr_service.build_payload({}, "V", [], "n"))
        for params in ({"output_height": 4320}, {"output_height": "x"}, {"num_frames": -1}):
            with self.assertRaises(sr_service.SRError):
                sr_service.build_payload(params, "V", [], "n")

    def test_find_scalar_reads_nested_json_strings(self):
        self.assertEqual(sr_service.find_scalar({"data": json.dumps({"task_id": 42})}, {"taskId"}), "42")
        self.assertIsNone(sr_service.find_scalar({"ok": True}, {"ok"}))


class FakeService:
    """One aiohttp server playing OSS, the gateway, the task query endpoint and the result CDN."""

    def __init__(self):
        self.objects, self.deleted, self.submitted = {}, [], []
        self.query_replies = []
        self.gateway_status = 200
        self.predict_delay = 0
        self.result = b"super-resolved-video"
        app = web.Application()
        app.router.add_route("PUT", "/oss/{key:.+}", self.put)
        app.router.add_route("DELETE", "/oss/{key:.+}", self.delete)
        app.router.add_post("/predict", self.predict)
        app.router.add_get("/query", self.query)
        app.router.add_get("/result.mp4", self.download)
        self.server = TestServer(app)

    async def put(self, request):
        assert request.headers["Authorization"].startswith("OSS4-HMAC-SHA256 Credential=")
        self.objects[request.match_info["key"]] = await request.read()
        return web.Response()

    async def delete(self, request):
        self.deleted.append(request.match_info["key"])
        return web.Response(status=204)

    async def predict(self, request):
        self.submitted.append(await request.json())
        await asyncio.sleep(self.predict_delay)
        if self.gateway_status != 200:
            return web.Response(status=self.gateway_status)
        return web.json_response({"data": {"taskId": "task-1"}})

    async def query(self, request):
        assert request.query["taskId"] == "task-1"
        reply = self.query_replies.pop(0) if len(self.query_replies) > 1 else self.query_replies[0]
        return web.json_response(reply)

    async def download(self, request):
        return web.Response(body=self.result, content_type="video/mp4")


class RunnerTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.fake = FakeService()
        await self.fake.server.start_server()
        self.addAsyncCleanup(self.fake.server.close)
        self.session = aiohttp.ClientSession(trust_env=False)
        self.addAsyncCleanup(self.session.close)
        base = self.fake.server.make_url("")
        self.result_url = str(self.fake.server.make_url("/result.mp4"))
        self.config = {
            **sr_service.DEFAULTS, "oss": oss_config(),
            "gateway": str(self.fake.server.make_url("/predict")),
            "query_url": str(self.fake.server.make_url("/query")),
            "api_hosts": [base.host], "result_hosts": [base.host],
            "allow_insecure_gateway": True, "allow_insecure_result": True,
            "poll_interval": 0, "result_timeout": 30, "sign_seconds": 3600,
        }
        self.enterContext(mock.patch.object(sr_service, "load_config", return_value=self.config))
        self.enterContext(mock.patch.object(
            OSSClient, "_url", lambda client, key, query=None:
            URL(str(self.fake.server.make_url("/oss/" + key))).with_query(query or {})))
        self.registered = []

        async def register_output(locator, ready):
            self.registered.append((locator, ready))
        self.saves = 0

        def save():
            self.saves += 1
        self.runner = sr_service.Runner(self.root / "sr_tasks.json", self.root / "artifacts",
                                        SimpleNamespace(save=save, register_output=register_output))
        self.video = self.root / "input.mp4"
        self.video.write_bytes(b"low-res-video")
        self.ref = self.root / "face.png"
        self.ref.write_bytes(b"png")

    def job(self, pid="job-1"):
        return {"id": pid, "status": "queued", "progress": 0.0, "outputs": [], "error": None, "step": ""}

    async def test_success_uploads_submits_downloads_and_cleans_up(self):
        self.fake.query_replies = [{"data": {"status": "running"}},
                                   {"data": {"status": "success", "video_url": self.result_url}}]
        job = self.job()
        await self.runner.start(self.session, job, {"video": self.video, "refs": [self.ref]},
                                {"output_height": "1080", "num_frames": 30, "lf_anchor": "off"})
        self.assertEqual(job["status"], "done", job.get("error"))
        self.assertEqual(job["progress"], 1.0)
        output = job["outputs"][0]
        self.assertEqual(output["kind"], "video")
        self.assertTrue(output["url"].startswith("/api/artifact/job-1/"))
        stored = self.root / "artifacts" / "job-1" / output["filename"]
        self.assertEqual(stored.read_bytes(), b"super-resolved-video")
        self.assertEqual(set(self.fake.objects), {"chouka-sr/job-1/video.mp4", "chouka-sr/job-1/ref0.png"})
        self.assertEqual(self.fake.objects["chouka-sr/job-1/video.mp4"], b"low-res-video")
        self.assertEqual(sorted(self.fake.deleted), sorted(self.fake.objects))
        request = self.fake.submitted[0]
        self.assertEqual((request["appId"], request["reqType"]), ("youku-aigc-prod", "async"))
        payload = request["payload"]
        self.assertEqual((payload["output_height"], payload["num_frames"], payload["lf_anchor"]), (1080, 30, "0"))
        self.assertIn("x-oss-signature=", payload["lr_video_path"])
        self.assertEqual(len(payload["ref_image_paths"].split(",")), 1)
        self.assertEqual([ready for _, ready in self.registered], [False, True])
        self.assertIsNone(self.runner.store.get("job-1"))

    async def test_terminal_failure_is_not_retried(self):
        self.fake.query_replies = [{"status": "FAILED"}]
        job = self.job()
        await self.runner.start(self.session, job, {"video": self.video}, {})
        self.assertEqual(job["status"], "error")
        self.assertIn("FAILED", job["error"])
        self.assertEqual(self.fake.deleted, ["chouka-sr/job-1/video.mp4"])

    async def test_result_host_outside_allow_list_fails_immediately(self):
        self.fake.query_replies = [{"video_url": "https://evil.example.com/x.mp4"}]
        job = self.job()
        await self.runner.start(self.session, job, {"video": self.video}, {})
        self.assertEqual(job["status"], "error")
        self.assertIn("允许列表", job["error"])

    async def test_gateway_server_error_reports_unknown_acceptance(self):
        self.fake.gateway_status = 502
        job = self.job()
        await self.runner.start(self.session, job, {"video": self.video}, {})
        self.assertEqual(job["status"], "error")
        self.assertIn("无法确认", job["error"])
        self.assertEqual(len(self.fake.submitted), 1)
        # Inputs stay in OSS: the service may already be reading them.
        self.assertEqual(self.fake.deleted, [])
        self.assertIsNone(self.runner.store.get("job-1"))

    async def test_gateway_rejection_is_definite(self):
        self.fake.gateway_status = 400
        job = self.job()
        await self.runner.start(self.session, job, {"video": self.video}, {})
        self.assertIn("拒绝", job["error"])

    async def test_resume_polls_without_resubmitting(self):
        self.fake.query_replies = [{"status": "success", "video_url": self.result_url}]
        self.runner.store.update("job-1", status="submitted", task_id="task-1",
                                 submitted_at=time.time(), objects=["chouka-sr/job-1/video.mp4"])
        job = self.job() | {"status": "running"}
        await self.runner.resume(self.session, job)
        self.assertEqual(job["status"], "done")
        self.assertEqual(self.fake.submitted, [])
        self.assertEqual(self.fake.deleted, ["chouka-sr/job-1/video.mp4"])

    async def test_resume_while_submitting_requires_manual_check(self):
        self.runner.store.update("job-1", status="submitting", objects=["chouka-sr/job-1/video.mp4"])
        job = self.job() | {"status": "running"}
        self.assertIsNone(self.runner.resume(self.session, job))
        self.assertEqual(job["status"], "error")
        self.assertIn("无法确认", job["error"])
        self.assertEqual(self.fake.submitted, [])
        self.assertIsNone(self.runner.store.get("job-1"))

    async def test_user_cancel_stops_polling_and_cleans_up(self):
        self.fake.query_replies = [{"status": "running"}]
        self.config["poll_interval"] = 1
        job = self.job()
        task = self.runner.start(self.session, job, {"video": self.video}, {})
        for _ in range(100):
            if (self.runner.store.get("job-1") or {}).get("task_id"):
                break
            await asyncio.sleep(0.02)
        self.assertTrue(await self.runner.cancel("job-1"))
        await asyncio.gather(task, return_exceptions=True)
        self.assertEqual(job["status"], "canceled")
        self.assertIn("计费", job["error"])
        self.assertEqual(self.fake.deleted, ["chouka-sr/job-1/video.mp4"])
        self.assertIsNone(self.runner.store.get("job-1"))

    async def test_cancel_during_submit_waits_for_task_id(self):
        self.fake.query_replies = [{"status": "running"}]
        self.fake.predict_delay = 0.3
        job = self.job()
        task = self.runner.start(self.session, job, {"video": self.video}, {})
        for _ in range(200):
            if self.fake.submitted:
                break
            await asyncio.sleep(0.01)
        self.assertEqual((self.runner.store.get("job-1") or {}).get("status"), "submitting")
        await self.runner.cancel("job-1")
        await asyncio.gather(task, return_exceptions=True)
        self.assertEqual(job["status"], "canceled")
        self.assertEqual(self.fake.deleted, ["chouka-sr/job-1/video.mp4"])
        self.assertIsNone(self.runner.store.get("job-1"))

    async def test_shutdown_keeps_state_for_resume(self):
        self.fake.query_replies = [{"status": "running"}]
        self.config["poll_interval"] = 1
        job = self.job()
        self.runner.start(self.session, job, {"video": self.video}, {})
        for _ in range(100):
            if (self.runner.store.get("job-1") or {}).get("task_id"):
                break
            await asyncio.sleep(0.02)
        await self.runner.shutdown()
        self.assertEqual(sr_service.TaskStore(self.root / "sr_tasks.json").get("job-1")["task_id"], "task-1")
        self.assertEqual(self.fake.deleted, [])


class RemoteSRGenerateTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def asyncSetUp(self):
        self.auth_setup()
        self.addCleanup(self.auth_teardown)
        self.own_project("p")
        uploads = self.root / "data" / "uploads"
        uploads.mkdir(parents=True)
        self.video = uploads / "source.browser.mp4"
        self.video.write_bytes(b"video")
        self.face = uploads / "face.png"
        self.face.write_bytes(b"png")
        self.register_asset("source.browser.mp4")
        self.register_asset("face.png")
        self.enterContext(mock.patch.object(chouka_app, "PROJ_DIR", self.root / "data/projects"))
        self.enterContext(mock.patch.object(chouka_app, "JOBS_FILE", self.root / "data/jobs.json"))
        self.enterContext(mock.patch.dict(chouka_app.JOBS, clear=True))
        self.configured = True
        self.enterContext(mock.patch.object(sr_service, "configured", lambda: self.configured))
        chouka_app.load_caps()
        application = self.build_app()
        application["video_previews"] = mock.Mock(source=mock.Mock(return_value=self.video))
        application["cleanup_pending"] = set()
        application["session"] = None
        self.runner = mock.Mock(cancel=mock.AsyncMock(return_value=False))
        application["sr_runner"] = self.runner
        application.router.add_post("/api/generate", chouka_app.api_generate)
        application.router.add_post("/api/job/{pid}/cancel", chouka_app.api_cancel)
        application.router.add_get("/api/jobs", chouka_app.api_jobs)
        application.router.add_get("/api/artifact/{pid}/{name}", chouka_app.api_artifact)
        self.application = application
        await self.start_client(application)
        self.addAsyncCleanup(self.client.close)

    async def generate(self, **overrides):
        body = {"capability": "youku_sr_video", "project": "p", "card": "c1",
                "assets": {"video[0]": "chouka/source.browser.mp4", "images[1]": "chouka/face.png"},
                "params": {"output_height": "1080"}, **overrides}
        return await self.client.post("/api/generate", json=body)

    async def test_generate_creates_remote_job_without_comfy(self):
        response = await self.generate()
        self.assertEqual(response.status, 200, await response.text())
        job = await response.json()
        self.assertEqual((job["status"], job["executor"], job["capability"]),
                         ("queued", sr_service.EXECUTION, "youku_sr_video"))
        _session, started_job, inputs, params = self.runner.start.call_args.args
        self.assertIs(started_job, chouka_app.JOBS[job["id"]])
        self.assertEqual(inputs["video"].resolve(), self.video.resolve())
        self.assertEqual([path.resolve() for path in inputs["refs"]], [self.face.resolve()])
        self.assertEqual(params, {"output_height": "1080"})
        persisted = json.loads(chouka_app.JOBS_FILE.read_text(encoding="utf-8"))
        self.assertEqual(persisted, [job])
        self.runner.start.assert_called_once()
        jobs = (await (await self.client.get("/api/jobs")).json())["jobs"]
        self.assertEqual(jobs[0]["nodeName"], "远程超分服务")
        self.assertNotIn("task_id", json.dumps(jobs))

    async def test_invalid_requests_never_start_a_job(self):
        cases = [({"assets": {"images[0]": "chouka/face.png"}}, 400),
                 ({"assets": {"video[0]": "chouka/face.png"}}, 400),
                 ({"assets": {"video[0]": "chouka/source.browser.mp4", "images[0]": "chouka/source.browser.mp4"}}, 400),
                 ({"params": {"output_height": "9999"}}, 400),
                 ({"assets": {"video[0]": "chouka/missing.mp4"}}, 404)]
        for overrides, status in cases:
            with self.subTest(overrides=overrides):
                response = await self.generate(**overrides)
                self.assertEqual(response.status, status, await response.text())
        self.configured = False
        self.assertEqual((await self.generate()).status, 503)
        self.runner.start.assert_not_called()
        self.assertEqual(chouka_app.JOBS, {})

    async def test_cancel_and_artifact_registration(self):
        job = await (await self.generate()).json()
        response = await self.client.post(f"/api/job/{job['id']}/cancel")
        self.assertEqual((await response.json())["state"], "canceled")
        self.runner.cancel.assert_awaited_once_with(job["id"])
        self.assertEqual(chouka_app.JOBS[job["id"]]["status"], "canceled")
        hooks = chouka_app.sr_runner_hooks(self.application)
        locator = f"{job['id']}/sr.mp4"
        await hooks.register_output(locator, False)
        url = f"/api/artifact/{locator}"
        target = self.root / "data" / "artifacts" / job["id"] / "sr.mp4"
        target.parent.mkdir(parents=True)
        target.write_bytes(b"result")
        self.assertEqual((await self.client.get(url)).status, 404)
        await hooks.register_output(locator, True)
        response = await self.client.get(url)
        self.assertEqual((response.status, await response.read()), (200, b"result"))


class CapabilityLoadingTests(unittest.TestCase):
    def test_mode_is_listed_only_when_configured(self):
        with mock.patch.object(sr_service, "configured", return_value=False):
            chouka_app.load_caps()
        tools = next(card for card in chouka_app.CARDS if card["id"] == "card_tools")
        self.assertNotIn("youku_sr_video", [mode["id"] for mode in tools["modes"]])
        with mock.patch.object(sr_service, "configured", return_value=True):
            chouka_app.load_caps()
        tools = next(card for card in chouka_app.CARDS if card["id"] == "card_tools")
        self.assertIn("youku_sr_video", [mode["id"] for mode in tools["modes"]])
        cap = chouka_app.CAPS["youku_sr_video"]
        self.assertEqual(cap["execution"], sr_service.EXECUTION)
        self.assertIn(sr_service.EXECUTION, chouka_app.EXTERNAL_EXECUTIONS)
        self.assertEqual(chouka_app.model_name("youku_sr_video"), "优酷视频超分（远程服务）")


if __name__ == "__main__":
    unittest.main()
