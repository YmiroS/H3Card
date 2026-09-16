import asyncio
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import aiohttp
from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
import app as controller_app
from video_preview import VideoPreviews, preview_status, preview_file


class VideoPreviewTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.uploads = self.root / "data" / "uploads"
        self.uploads.mkdir(parents=True)
        self.previews = VideoPreviews(
            self.uploads, controller_app.ffmpeg_bin, controller_app.VID_EXT,
        )
        app = web.Application()
        app["comfy_lock"] = asyncio.Lock()
        app["cleanup_pending"] = set()
        app["cleanup_tasks"] = {}
        app["video_previews"] = self.previews
        app["session"] = object()
        app["distributed"] = mock.Mock()
        app.router.add_post("/api/upload", controller_app.api_upload)
        app.router.add_post("/api/generate", controller_app.api_generate)
        app.router.add_get("/api/preview/{name}/file", preview_file)
        app.router.add_get("/api/preview/{name}", preview_status)
        app.router.add_static("/api/upload/", self.uploads)
        self.client = TestClient(TestServer(app))
        await self.client.start_server()

    async def asyncTearDown(self):
        await self.previews.close()
        await self.client.close()
        self.temp.cleanup()

    def source(self, name="ck_123456789abc.mov", data=b"original"):
        path = self.uploads / name
        path.write_bytes(data)
        return path

    async def test_missing_ffmpeg_keeps_original_and_reports_error(self):
        path = self.source()
        self.previews.ffmpeg_bin = lambda: None
        first = self.previews.ensure(path.name)
        self.assertEqual(first["status"], "queued")
        await self.previews.tasks[path.name]
        response = await self.client.get(f"/api/preview/{path.name}")
        state = await response.json()
        self.assertEqual(state["status"], "error")
        self.assertIn("FFmpeg", state["error"])
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        self.assertEqual(path.read_bytes(), b"original")
        self.assertFalse(self.previews.target(path.name).exists())
        response = await self.client.get(f"/api/preview/{path.name}/file")
        self.assertEqual(response.status, 404)

    async def test_validates_source_and_rejects_traversal(self):
        for name in ("../outside.mov", "..\\outside.mov", "/outside.mov", "file.txt"):
            with self.subTest(name=name), self.assertRaises(web.HTTPBadRequest):
                self.previews.ensure(name)
        with self.assertRaises(web.HTTPNotFound):
            self.previews.ensure("missing.mp4")

    async def test_completed_cache_survives_restart_and_supports_range(self):
        path = self.source()
        self.previews.target(path.name).write_bytes(b"0123456789")
        state = self.previews.ensure(path.name)
        self.assertEqual(state["status"], "ready")
        self.assertFalse(self.previews.tasks)
        response = await self.client.get(state["url"], headers={"Range": "bytes=2-5"})
        self.assertEqual(response.status, 206)
        self.assertEqual(response.headers["Content-Type"], "video/mp4")
        self.assertEqual(response.headers["Content-Range"], "bytes 2-5/10")
        self.assertEqual(await response.read(), b"2345")
        original = await self.client.get(f"/api/upload/{path.name}")
        self.assertEqual(await original.read(), b"original")

    async def test_deduplicates_and_limits_conversion_concurrency(self):
        first = self.source()
        second = self.source("ck_123456789abd.mp4")
        started = asyncio.Event()
        release = asyncio.Event()
        calls = []

        async def spawn(*args, **kwargs):
            calls.append(args)
            process = mock.Mock(returncode=None)

            async def communicate():
                started.set()
                await release.wait()
                Path(args[-1]).write_bytes(b"preview")
                process.returncode = 0
                return b"", b""

            process.communicate = communicate
            return process

        self.previews.ffmpeg_bin = lambda: Path("ffmpeg")
        with mock.patch("video_preview.asyncio.create_subprocess_exec", side_effect=spawn):
            self.previews.ensure(first.name)
            self.previews.ensure(first.name)
            await asyncio.wait_for(started.wait(), 5)
            self.previews.ensure(second.name)
            response = await self.client.get(f"/api/preview/{second.name}")
            self.assertEqual((await response.json())["status"], "queued")
            self.assertEqual(len(calls), 1)
            release.set()
            await asyncio.gather(*self.previews.tasks.values())
        self.assertEqual(len(calls), 2)
        self.assertEqual(self.previews.ensure(first.name)["status"], "ready")
        self.assertEqual(first.read_bytes(), b"original")

    async def test_failure_removes_partial_preview(self):
        path = self.source()
        self.previews.ffmpeg_bin = lambda: Path("ffmpeg")

        async def spawn(*args, **kwargs):
            Path(args[-1]).write_bytes(b"incomplete")
            return mock.Mock(returncode=1, communicate=mock.AsyncMock(return_value=(b"", b"bad codec")))

        with mock.patch("video_preview.asyncio.create_subprocess_exec", side_effect=spawn):
            with self.assertLogs("video_preview", level="ERROR"):
                self.previews.ensure(path.name)
                await self.previews.tasks[path.name]
        self.assertEqual(self.previews.ensure(path.name)["status"], "error")
        self.assertFalse(list(self.uploads.glob("*.part.mp4")))
        self.assertFalse(self.previews.target(path.name).exists())
        self.assertEqual(path.read_bytes(), b"original")

    async def test_local_upload_keeps_original_only_as_backup(self):
        self.previews.ffmpeg_bin = lambda: None
        form = aiohttp.FormData()
        original = b"original mov bytes"
        form.add_field("file", original, filename="original.mov", content_type="video/quicktime")
        with mock.patch.object(controller_app, "ROOT", self.root), \
             mock.patch.object(controller_app, "CONTROLLER_MODE", False), \
             mock.patch.object(controller_app, "probe_video", return_value={}), \
             mock.patch.object(controller_app, "comfy_upload", new_callable=mock.AsyncMock) as upload:
            upload.return_value = "chouka/original.mov"
            response = await self.client.post("/api/upload", data=form)
        asset = (await response.json())["files"][0]
        self.assertTrue(asset["ref"].startswith("chouka/ck_"))
        self.assertTrue(asset["ref"].endswith(".mov"))
        upload.assert_not_awaited()
        response = await self.client.get(asset["url"])
        self.assertEqual(await response.read(), original)

    async def test_shutdown_stops_encoder_and_removes_partial_file(self):
        path = self.source()
        self.previews.ffmpeg_bin = lambda: Path("ffmpeg")
        started = asyncio.Event()
        stopped = asyncio.Event()
        process = mock.Mock(returncode=None)

        async def communicate():
            started.set()
            await stopped.wait()
            return b"", b""

        def kill():
            process.returncode = -9
            stopped.set()

        process.communicate = communicate
        process.kill = kill

        async def spawn(*args, **kwargs):
            Path(args[-1]).write_bytes(b"incomplete")
            return process

        with mock.patch("video_preview.asyncio.create_subprocess_exec", side_effect=spawn):
            self.previews.ensure(path.name)
            await asyncio.wait_for(started.wait(), 5)
            await asyncio.wait_for(self.previews.close(), 5)
        self.assertTrue(stopped.is_set())
        self.assertFalse(list(self.uploads.glob("*.part.mp4")))
        self.assertFalse(self.previews.target(path.name).exists())
        self.assertEqual(path.read_bytes(), b"original")

    async def test_controller_dispatches_converted_video_in_graph_and_worker_assets(self):
        original = self.source()
        converted = self.previews.target(original.name)
        converted.write_bytes(b"compatible mp4")
        graph = {"1": {"class_type": "VHS_LoadVideo", "inputs": {"video": ""}}}
        (self.root / "graph.json").write_text(json.dumps(graph), encoding="utf-8")
        cap = {
            "id": "test-video", "name": "test-video", "_graph_ok": True,
            "graph": "graph.json", "outputType": "video", "inputs": [{
                "key": "video[0]", "type": "video", "label": "video", "required": True,
                "target": {"node": "1", "input": "video"},
            }],
        }
        body = {"capability": "test-video", "assets": {"video[0]": f"chouka/{original.name}"}}
        with mock.patch.object(controller_app, "ROOT", self.root), \
             mock.patch.object(controller_app, "CONTROLLER_MODE", True), \
             mock.patch.dict(controller_app.CAPS, {"test-video": cap}), \
             mock.patch.object(controller_app, "JOBS", {}), \
             mock.patch.object(controller_app, "STEPS", {}), \
             mock.patch.object(controller_app, "WEIGHTS", {}), \
             mock.patch.object(controller_app, "save_jobs"):
            response = await self.client.post("/api/generate", json=body)
        self.assertEqual(response.status, 200, await response.text())
        payload = self.client.server.app["distributed"].enqueue.call_args.args[1]
        expected = f"chouka/{converted.name}"
        self.assertEqual(payload["graph"]["1"]["inputs"]["video"], expected)
        self.assertEqual(payload["assets"]["video[0]"], expected)
        response = await self.client.get(f"/api/upload/{converted.name}")
        self.assertEqual(await response.read(), b"compatible mp4")
        self.assertEqual(original.read_bytes(), b"original")

    async def test_generation_rejects_pending_or_failed_transcode(self):
        original = self.source()
        cap = {"id": "test-video", "_graph_ok": True}
        body = {"capability": "test-video", "assets": {"video[0]": f"chouka/{original.name}"}}
        for state, status in (({"status": "processing"}, 409),
                              ({"status": "error", "error": "转码失败"}, 422)):
            with self.subTest(state=state), \
                 mock.patch.dict(controller_app.CAPS, {"test-video": cap}), \
                 mock.patch.object(self.previews, "ensure", return_value=state):
                response = await self.client.post("/api/generate", json=body)
                self.assertEqual(response.status, status)
                self.assertIn("转码", await response.text())
        self.client.server.app["distributed"].enqueue.assert_not_called()

    async def test_local_generation_uploads_only_converted_mp4_once(self):
        original = self.source()
        converted = self.previews.target(original.name)
        converted.write_bytes(b"compatible mp4")
        request = mock.Mock(app=self.client.server.app)
        assets = {"video[0]": f"chouka/{original.name}", "video[1]": f"chouka/{original.name}",
                  "images[0]": "chouka/image.png"}
        with mock.patch.object(controller_app, "CONTROLLER_MODE", False), \
             mock.patch.object(controller_app, "comfy_upload", new_callable=mock.AsyncMock) as upload:
            upload.return_value = f"chouka/{converted.name}"
            resolved = await controller_app.generation_assets(request, assets)
        upload.assert_awaited_once_with(request.app["session"], "file", converted.name, b"compatible mp4")
        self.assertEqual(resolved["video[0]"], f"chouka/{converted.name}")
        self.assertEqual(resolved["video[1]"], resolved["video[0]"])
        self.assertEqual(resolved["images[0]"], assets["images[0]"])
        self.assertEqual(assets["video[0]"], f"chouka/{original.name}")

    async def test_real_mov_upload_creates_h264_for_preview_and_generation(self):
        executable = controller_app.ffmpeg_bin()
        if executable is None:
            self.skipTest("FFmpeg unavailable")
        fixture = self.root / "prores.mov"
        process = await asyncio.create_subprocess_exec(
            str(executable), "-nostdin", "-v", "error", "-y",
            "-f", "lavfi", "-i", "testsrc2=size=64x48:rate=12:duration=0.5",
            "-f", "lavfi", "-i", "sine=frequency=440:duration=0.5",
            "-c:v", "prores_ks", "-pix_fmt", "yuv422p10le", "-threads", "1",
            "-c:a", "pcm_s16le", str(fixture),
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        _, error = await process.communicate()
        self.assertEqual(process.returncode, 0, error)
        original = fixture.read_bytes()
        form = aiohttp.FormData()
        form.add_field("file", original, filename="原片.MOV", content_type="video/quicktime")
        with mock.patch.object(controller_app, "ROOT", self.root), \
             mock.patch.object(controller_app, "CONTROLLER_MODE", True):
            response = await self.client.post("/api/upload", data=form)
        self.assertEqual(response.status, 200)
        asset = (await response.json())["files"][0]
        name = asset["url"].rsplit("/", 1)[1]
        self.assertTrue(name.endswith(".mov"))
        self.assertEqual(asset["ref"], f"chouka/{name}")
        self.assertEqual((self.uploads / name).read_bytes(), original)
        self.assertEqual(asset["fps"], 12)
        task = self.previews.tasks.get(name)
        if task:
            await asyncio.wait_for(task, 30)
        state = self.previews.ensure(name)
        self.assertEqual(state["status"], "ready", state)
        process = await asyncio.create_subprocess_exec(
            str(executable), "-hide_banner", "-i", str(self.previews.target(name)),
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        _, info = await process.communicate()
        info = info.decode("utf-8", errors="replace")
        self.assertIn("Video: h264", info)
        self.assertIn("yuv420p", info)
        self.assertIn("Audio: aac", info)
        self.assertIn("12 fps", info)
        contents = self.previews.target(name).read_bytes()
        with mock.patch.object(controller_app, "CONTROLLER_MODE", True):
            refs = await controller_app.generation_assets(
                mock.Mock(app=self.client.server.app), {"video[0]": asset["ref"]},
            )
        self.assertEqual(refs["video[0]"], f"chouka/{name}.browser.mp4")
        worker_download = await self.client.get(f"/api/upload/{Path(refs['video[0]']).name}")
        self.assertEqual(await worker_download.read(), contents)
        self.assertLess(contents.index(b"moov"), contents.index(b"mdat"))
        response = await self.client.get(state["url"], headers={"Range": "bytes=0-31"})
        self.assertEqual(response.status, 206)
        self.assertEqual(len(await response.read()), 32)
        response = await self.client.get(asset["url"])
        self.assertEqual(await response.read(), original)


if __name__ == "__main__":
    unittest.main()
