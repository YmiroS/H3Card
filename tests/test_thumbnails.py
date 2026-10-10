"""缩略图专项：真实 FFmpeg 媒体、共享任务生命周期及真实 HTTP 权限边界。"""
import asyncio
import os
import struct
import sys
import tempfile
import unittest
import zlib
from pathlib import Path
from unittest import mock
from urllib.parse import quote

from aiohttp import web

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "tests"))
import app as controller_app
import auth_support
from video_preview import MediaThumbnails


def png(width=64, height=32, color=(220, 30, 10, 80)):
    """用标准库构造真实 RGBA 图片，不新增图像处理依赖。"""
    def chunk(kind, data):
        return (struct.pack(">I", len(data)) + kind + data
                + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff))
    row = b"\x00" + bytes(color) * width
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(row * height)) + chunk(b"IEND", b""))


def dimensions(data):
    return struct.unpack(">II", data[16:24])


async def ffmpeg(*args):
    executable = controller_app.ffmpeg_bin()
    if executable is None:
        raise AssertionError("专项测试需要现有 FFmpeg")
    process = await asyncio.create_subprocess_exec(
        str(executable), "-nostdin", "-v", "error", "-y", *map(str, args),
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    output, error = await asyncio.wait_for(process.communicate(), 20)
    if process.returncode:
        raise AssertionError(error.decode("utf-8", errors="replace"))
    return output


class ThumbnailServiceTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.source = self.root / "source.png"
        self.source.write_bytes(png())
        self.service = MediaThumbnails(
            self.root / "thumbnails", controller_app.ffmpeg_bin,
            controller_app.IMG_EXT | controller_app.VID_EXT)

    async def asyncTearDown(self):
        await self.service.close()
        self.temp.cleanup()

    async def test_real_png_bound_alpha_small_image_and_original_unchanged(self):
        for size in ((1024, 768), (768, 1024), (64, 32), (1, 1), (1024, 1)):
            with self.subTest(size=size):
                original = png(*size)
                self.source.write_bytes(original)
                before = self.source.stat()
                result = await self.service.get(self.source)
                data = result.read_bytes()
                width, height = dimensions(data)
                self.assertLessEqual(max(width, height), 512)
                self.assertLessEqual(width, size[0])
                self.assertLessEqual(height, size[1])
                if max(size) <= 512:
                    self.assertEqual((width, height), size)
                self.assertEqual(data[25], 6)
                pixels = await ffmpeg("-threads", "1", "-i", result, "-frames:v", "1",
                                      "-threads", "1", "-f", "rawvideo", "-pix_fmt", "rgba", "pipe:1")
                self.assertEqual(pixels[3], 80)
                self.assertEqual(self.source.read_bytes(), original)
                self.assertEqual(self.source.stat().st_mtime_ns, before.st_mtime_ns)
                self.assertFalse(list(self.service.directory.glob("*.part.png")))

    async def test_real_video_first_frame_only_and_rotation(self):
        video = self.root / "video.mp4"
        await ffmpeg("-f", "lavfi", "-i", "color=red:s=1024x768:r=2:d=1",
                     "-f", "lavfi", "-i", "color=blue:s=1024x768:r=2:d=1",
                     "-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0[v]",
                     "-filter_complex_threads", "1", "-map", "[v]", "-c:v", "libx264",
                     "-threads", "1", video)
        rotated = self.root / "rotated.mp4"
        await ffmpeg("-display_rotation", "90", "-i", video, "-c", "copy", rotated)
        for source, expected in ((video, (512, 384)), (rotated, (384, 512))):
            with self.subTest(source=source.name):
                original = source.read_bytes()
                result = await self.service.get(source)
                self.assertEqual(dimensions(result.read_bytes()), expected)
                pixels = await ffmpeg("-threads", "1", "-i", result, "-frames:v", "1",
                                      "-threads", "1", "-f", "rawvideo", "-pix_fmt", "rgba", "pipe:1")
                self.assertGreater(pixels[0], 240)
                self.assertLess(pixels[2], 10)
                self.assertEqual(pixels[3], 255)
                self.assertEqual(source.read_bytes(), original)

    async def test_real_jpeg_exif_orientation(self):
        jpeg = self.root / "oriented.jpg"
        await ffmpeg("-i", self.source, "-frames:v", "1", "-threads", "1", jpeg)
        original = jpeg.read_bytes()
        # EXIF 方向 6：原始 64×32 横图应呈现为 32×64 竖图。
        tiff = (b"II" + struct.pack("<HIH", 42, 8, 1)
                + struct.pack("<HHI", 0x112, 3, 1) + struct.pack("<H", 6) + b"\x00\x00"
                + struct.pack("<I", 0))
        exif = b"Exif\x00\x00" + tiff
        jpeg.write_bytes(original[:2] + b"\xff\xe1" + struct.pack(">H", len(exif) + 2)
                         + exif + original[2:])
        original = jpeg.read_bytes()
        result = await self.service.get(jpeg)
        self.assertEqual(dimensions(result.read_bytes()), (32, 64))
        self.assertEqual(jpeg.read_bytes(), original)

    async def test_real_other_image_formats_and_disguised_playlist_rejected(self):
        for extension in (".webp", ".bmp", ".gif"):
            with self.subTest(extension=extension):
                source = self.root / ("image" + extension)
                await ffmpeg("-i", self.source, "-frames:v", "1", "-threads", "1", source)
                original = source.read_bytes()
                result = await self.service.get(source)
                self.assertEqual(dimensions(result.read_bytes()), (64, 32))
                self.assertEqual(source.read_bytes(), original)
        # 即使后缀为 PNG，也不允许 concat 播放列表绕过资源权限读取另一个文件。
        playlist = self.root / "playlist.png"
        playlist.write_text("ffconcat version 1.0\\nfile 'source.png'\\n", encoding="utf-8")
        key = self.service.source_key(playlist)[1]
        with self.assertLogs("video_preview", level="ERROR"), self.assertRaises(web.HTTPUnprocessableEntity):
            await self.service.get(playlist)
        self.assertFalse((self.service.directory / (key + ".png")).exists())
        self.assertFalse(list(self.service.directory.glob("*.part.png")))

    async def test_cache_restart_mtime_size_and_format_invalidation(self):
        first = await self.service.get(self.source)
        with mock.patch("video_preview.asyncio.create_subprocess_exec", side_effect=AssertionError("不应重新编码")):
            self.assertEqual(await self.service.get(self.source), first)
            other = MediaThumbnails(self.service.directory, controller_app.ffmpeg_bin, {".png"})
            self.assertEqual(await other.get(self.source), first)
            await other.close()
        stat = self.source.stat()
        os.utime(self.source, ns=(stat.st_atime_ns, stat.st_mtime_ns + 1_000_000))
        second = await self.service.get(self.source)
        self.assertNotEqual(first, second)
        self.source.write_bytes(png(32, 32))
        os.utime(self.source, ns=(stat.st_atime_ns, stat.st_mtime_ns + 1_000_000))
        third = await self.service.get(self.source)
        self.assertNotEqual(second, third)
        with mock.patch.object(self.service, "VERSION", "测试新格式版本"):
            self.assertNotEqual(self.service.source_key(self.source)[1], third.stem)
        alias = self.root / "alias.png"
        alias.symlink_to(self.source)
        self.assertEqual(await self.service.get(alias), third)

    def fake_spawn(self, calls, started, release, *, fail=False):
        async def spawn(*args, **kwargs):
            calls.append(args)
            process = mock.Mock(returncode=None)
            killed = asyncio.Event()
            Path(args[-1]).write_bytes(b"partial")

            async def communicate():
                started.set()
                await release.wait()
                if killed.is_set():
                    return b"", b""
                Path(args[-1]).write_bytes(png())
                process.returncode = 1 if fail else 0
                return b"", "测试编码失败".encode("utf-8")

            def kill():
                process.returncode = -9
                killed.set()
                release.set()

            process.communicate = communicate
            process.kill = kill
            return process
        return spawn

    async def test_deduplicates_and_request_cancellation_keeps_shared_task(self):
        started, release = asyncio.Event(), asyncio.Event()
        calls = []
        with mock.patch("video_preview.asyncio.create_subprocess_exec",
                        side_effect=self.fake_spawn(calls, started, release)):
            first = asyncio.create_task(self.service.get(self.source))
            await asyncio.wait_for(started.wait(), 5)
            second = asyncio.create_task(self.service.get(self.source))
            first.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await first
            self.assertEqual(len(self.service.tasks), 1)
            release.set()
            result = await second
        self.assertTrue(result.is_file())
        self.assertEqual(len(calls), 1)
        self.assertFalse(self.service.tasks)
        args = calls[0]
        self.assertEqual(args[args.index("-protocol_whitelist") + 1], "file,pipe")
        self.assertEqual(args[args.index("-frames:v") + 1], "1")
        self.assertEqual(args[args.index("-pix_fmt") + 1], "rgba")
        self.assertEqual(args.count("-threads"), 2)

    async def test_limits_active_processes_to_two(self):
        started, release = asyncio.Event(), asyncio.Event()
        calls = []
        sources = [self.source]
        for index in range(3):
            source = self.root / f"source-{index}.png"
            source.write_bytes(png())
            sources.append(source)
        with mock.patch("video_preview.asyncio.create_subprocess_exec",
                        side_effect=self.fake_spawn(calls, started, release)):
            tasks = [asyncio.create_task(self.service.get(source)) for source in sources]
            await asyncio.wait_for(started.wait(), 5)
            # 排在事件之后的回调屏障，让已就绪的请求进入任务池，不使用计时睡眠。
            barrier = asyncio.Event()
            asyncio.get_running_loop().call_soon(barrier.set)
            await barrier.wait()
            self.assertEqual(len(calls), 2)
            self.assertEqual(len(self.service.tasks), 4)
            release.set()
            await asyncio.gather(*tasks)
        self.assertEqual(len(calls), 4)

    async def test_failure_and_timeout_cleanup_and_retry(self):
        for failure in (True, False):
            with self.subTest(failure=failure):
                started, release = asyncio.Event(), asyncio.Event()
                if failure:
                    release.set()
                self.service.timeout = 0.05
                with mock.patch("video_preview.asyncio.create_subprocess_exec",
                                side_effect=self.fake_spawn([], started, release, fail=failure)):
                    with self.assertLogs("video_preview", level="ERROR"), self.assertRaises(web.HTTPUnprocessableEntity):
                        await self.service.get(self.source)
                self.assertFalse(self.service.tasks)
                self.assertFalse(list(self.service.directory.iterdir()))
                self.assertEqual(self.source.read_bytes(), png())
        self.service.timeout = 30
        self.assertTrue((await self.service.get(self.source)).is_file())

    async def test_close_kills_running_and_cancels_queued_tasks(self):
        started, release = asyncio.Event(), asyncio.Event()
        calls = []
        sources = [self.source]
        for index in range(2):
            source = self.root / f"close-{index}.png"
            source.write_bytes(png())
            sources.append(source)
        with mock.patch("video_preview.asyncio.create_subprocess_exec",
                        side_effect=self.fake_spawn(calls, started, release)):
            tasks = [asyncio.create_task(self.service.get(source)) for source in sources]
            await asyncio.wait_for(started.wait(), 5)
            await asyncio.wait_for(self.service.close(), 5)
            results = await asyncio.gather(*tasks, return_exceptions=True)
            self.assertTrue(all(isinstance(result, asyncio.CancelledError) for result in results))
        self.assertFalse(self.service.tasks)
        self.assertFalse(list(self.service.directory.iterdir()))
        with self.assertRaises(web.HTTPServiceUnavailable):
            await self.service.get(self.source)
        await self.service.close()

    async def test_close_during_process_creation_still_reaps_process(self):
        spawning, release_spawn, release_process = asyncio.Event(), asyncio.Event(), asyncio.Event()
        killed = []
        process = mock.Mock(returncode=None)

        async def communicate():
            await release_process.wait()
            return b"", b""

        def kill():
            killed.append(True)
            process.returncode = -9
            release_process.set()

        process.communicate = communicate
        process.kill = kill

        async def spawn(*args, **kwargs):
            Path(args[-1]).write_bytes(b"partial")
            spawning.set()
            await release_spawn.wait()
            return process

        with mock.patch("video_preview.asyncio.create_subprocess_exec", side_effect=spawn):
            request = asyncio.create_task(self.service.get(self.source))
            await asyncio.wait_for(spawning.wait(), 5)
            closing = asyncio.create_task(self.service.close())
            barrier = asyncio.Event()
            asyncio.get_running_loop().call_soon(barrier.set)
            await barrier.wait()
            release_spawn.set()
            await asyncio.wait_for(closing, 5)
            with self.assertRaises(asyncio.CancelledError):
                await request
        self.assertEqual(killed, [True])
        self.assertFalse(self.service.tasks)
        self.assertFalse(list(self.service.directory.iterdir()))

    async def test_rejects_success_exit_with_invalid_or_oversized_output(self):
        for output in (b"partial", png(513, 1)):
            with self.subTest(size=len(output)):
                async def spawn(*args, **kwargs):
                    Path(args[-1]).write_bytes(output)
                    return mock.Mock(returncode=0, communicate=mock.AsyncMock(return_value=(b"", b"")))

                with mock.patch("video_preview.asyncio.create_subprocess_exec", side_effect=spawn):
                    with self.assertLogs("video_preview", level="ERROR"), self.assertRaises(web.HTTPUnprocessableEntity):
                        await self.service.get(self.source)
                self.assertFalse(list(self.service.directory.iterdir()))
                self.assertFalse(self.service.tasks)

    async def test_source_changed_during_encoding_is_not_published(self):
        started, release = asyncio.Event(), asyncio.Event()
        with mock.patch("video_preview.asyncio.create_subprocess_exec",
                        side_effect=self.fake_spawn([], started, release)):
            task = asyncio.create_task(self.service.get(self.source))
            await asyncio.wait_for(started.wait(), 5)
            self.source.write_bytes(png(16, 16))
            release.set()
            with self.assertRaises(web.HTTPConflict):
                await task
        self.assertFalse(list(self.service.directory.iterdir()))

    async def test_missing_ffmpeg_and_invalid_sources(self):
        self.service.ffmpeg_bin = lambda: None
        with self.assertRaises(web.HTTPServiceUnavailable):
            await self.service.get(self.source)
        with self.assertRaises(web.HTTPNotFound):
            await self.service.get(self.root / "missing.png")
        directory = self.root / "folder.png"
        directory.mkdir()
        with self.assertRaises(web.HTTPNotFound):
            await self.service.get(directory)
        with self.assertRaises(web.HTTPBadRequest):
            await self.service.get(self.root / "file.txt")
        self.assertFalse(self.service.tasks)


class ThumbnailHTTPTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def asyncSetUp(self):
        self.auth_setup()
        self.own_project("p")
        self.uploads = self.root / "data" / "uploads"
        self.uploads.mkdir(parents=True)
        self.source = self.uploads / "素材.png"
        self.source.write_bytes(png(1024, 768))
        self.register_asset(self.source.name)
        self.bob = self.auth.create_user("bob", auth_support.PASSWORD)
        self.service = MediaThumbnails(
            self.root / "data" / "thumbnails", controller_app.ffmpeg_bin,
            controller_app.IMG_EXT | controller_app.VID_EXT)
        application = self.build_app()
        application["media_thumbnails"] = self.service
        application.router.add_get("/api/thumbnail", controller_app.api_thumbnail)
        await self.start_client(application)
        self.url = "/api/upload/" + quote(self.source.name, safe="")

    async def asyncTearDown(self):
        await self.service.close()
        await self.client.close()
        self.auth_teardown()

    async def get(self, url=None, **kwargs):
        return await self.client.get("/api/thumbnail", params={"url": url or self.url}, **kwargs)

    def share(self, enabled=True):
        self.auth.set_project_shares("p", [self.bob["id"]] if enabled else [], [], self.admin["id"])

    async def test_anonymous_unauthorized_authorized_and_revoked_cached_requests(self):
        self.client.session.cookie_jar.clear()
        response = await self.get()
        self.assertEqual(response.status, 401)
        await self.login("bob")
        response = await self.get()
        self.assertEqual(response.status, 404)
        self.assertFalse(self.service.directory.exists())
        self.share()
        response = await self.get()
        self.assertEqual(response.status, 200, await response.text() if response.status != 200 else "")
        self.assertEqual(response.headers["Content-Type"], "image/png")
        self.assertEqual(response.headers["Cache-Control"], "private, no-cache")
        self.assertEqual(dimensions(await response.read()), (512, 384))
        etag = response.headers["ETag"]
        modified = response.headers["Last-Modified"]
        for headers in ({"If-None-Match": etag}, {"If-Modified-Since": modified}):
            response = await self.get(headers=headers)
            self.assertEqual(response.status, 304)
            self.assertEqual(response.headers["Cache-Control"], "private, no-cache")
            self.assertEqual(await response.read(), b"")
        self.share(False)
        for headers in ({}, {"If-None-Match": etag}, {"If-Modified-Since": modified},
                        {"If-None-Match": "*"}):
            response = await self.get(headers=headers)
            self.assertEqual(response.status, 404)
            self.assertIn("no-store", response.headers["Cache-Control"])
        self.assertTrue(list(self.service.directory.glob("*.png")))
        self.client.session.cookie_jar.clear()
        self.assertEqual((await self.get(headers={"If-None-Match": etag})).status, 401)

    async def test_artifact_and_resource_index_and_original_unchanged(self):
        artifact = self.root / "data" / "artifacts" / "job" / "output.png"
        artifact.parent.mkdir(parents=True)
        artifact.write_bytes(png(64, 32))
        self.access.register("p", "artifact", "job/output.png")
        before = [tuple(row) for row in self.auth.db.execute("SELECT * FROM resources ORDER BY resource_id")]
        original = artifact.read_bytes()
        response = await self.get("/api/artifact/job/output.png")
        self.assertEqual(response.status, 200)
        self.assertEqual(dimensions(await response.read()), (64, 32))
        self.assertEqual(artifact.read_bytes(), original)
        after = [tuple(row) for row in self.auth.db.execute("SELECT * FROM resources ORDER BY resource_id")]
        self.assertEqual(before, after)

    async def test_real_video_upload_url_returns_first_frame_png(self):
        video = self.uploads / "video.mp4"
        await ffmpeg("-f", "lavfi", "-i", "color=red:s=64x32:r=5:d=0.4",
                     "-c:v", "libx264", "-threads", "1", video)
        self.register_asset(video.name)
        original = video.read_bytes()
        response = await self.get("/api/upload/video.mp4")
        self.assertEqual(response.status, 200)
        self.assertEqual(response.headers["Content-Type"], "image/png")
        self.assertEqual(dimensions(await response.read()), (64, 32))
        self.assertEqual(video.read_bytes(), original)

    async def test_strict_query_invalid_url_and_no_network_access(self):
        queries = ("", "?url=", "?other=x", "?url=x&url=y", "?url=x&size=32",
                   "?url=" + quote(self.url, safe="") + "&url=" + quote(self.url, safe=""))
        with mock.patch.object(self.service, "get", new_callable=mock.AsyncMock) as generate:
            for query in queries:
                with self.subTest(query=query):
                    response = await self.client.get("/api/thumbnail" + query)
                    self.assertEqual(response.status, 400)
            invalid = (
                "https://example.com/a.png", "http://127.0.0.1/a.png", "//example.com/a.png",
                "file:///tmp/a.png", "/api/file?filename=a.png", "chouka/a.png",
                "/api/preview/a.mp4/file", "/data/thumbnails/a.png", "api/upload/a.png",
                "/api/upload/../a.png", "/api/upload/%2e%2e%2fa.png",
                "/api/upload/%252e%252e%252fa.png", "/api/upload/a\\b.png",
                "/api/upload/a%00.png", "/api/upload/a/b.png", "/api/upload/a.png?x=1",
                "/api/upload/a.png#fragment", "/api/artifact/job/../../outside.png",
            )
            for url in invalid:
                with self.subTest(url=url):
                    response = await self.get(url)
                    self.assertEqual(response.status, 400)
            generate.assert_not_awaited()

    async def test_unregistered_pending_unsupported_directory_missing_and_symlink_escape(self):
        unregistered = self.uploads / "unregistered.png"
        unregistered.write_bytes(png())
        self.access.register("p", "upload", "pending.png", state="pending")
        for name, status in (("unregistered.png", 404), ("pending.png", 404),
                             ("missing.png", 404), ("folder.png", 404), ("sound.wav", 400)):
            if name not in ("unregistered.png", "pending.png"):
                self.register_asset(name)
            if name == "folder.png":
                (self.uploads / name).mkdir()
            if name == "sound.wav":
                (self.uploads / name).write_bytes(b"audio")
            with self.subTest(name=name):
                self.assertEqual((await self.get("/api/upload/" + name)).status, status)
        outside = self.root / "outside.png"
        outside.write_bytes(png())
        (self.uploads / "escaped.png").symlink_to(outside)
        self.register_asset("escaped.png")
        self.assertEqual((await self.get("/api/upload/escaped.png")).status, 400)
        self.assertFalse(self.service.directory.exists())

    async def test_reauthorization_after_generation_and_cached_304(self):
        self.share()
        await self.login("bob")
        original_get = self.service.get

        async def revoke(source):
            target = await original_get(source)
            self.share(False)
            return target

        with mock.patch.object(self.service, "get", side_effect=revoke):
            response = await self.get()
        self.assertEqual(response.status, 404)
        self.share()
        response = await self.get()
        etag = response.headers["ETag"]
        await response.read()
        with mock.patch.object(self.service, "get", side_effect=revoke):
            response = await self.get(headers={"If-None-Match": etag})
        self.assertEqual(response.status, 404)

    async def test_deleted_source_does_not_return_cached_304_and_mtime_invalidates(self):
        first = await self.get()
        etag = first.headers["ETag"]
        await first.read()
        stat = self.source.stat()
        os.utime(self.source, ns=(stat.st_atime_ns, stat.st_mtime_ns + 1_000_000))
        second = await self.get(headers={"If-None-Match": etag})
        self.assertEqual(second.status, 200)
        self.assertNotEqual(second.headers["ETag"], etag)
        await second.read()
        self.source.unlink()
        self.assertEqual((await self.get(headers={"If-None-Match": etag})).status, 404)

    async def test_source_deleted_or_path_escaped_after_wait_is_rejected(self):
        original_get = self.service.get

        async def delete_after_wait(source):
            target = await original_get(source)
            self.source.unlink()
            return target

        with mock.patch.object(self.service, "get", side_effect=delete_after_wait):
            self.assertEqual((await self.get()).status, 404)
        self.source.write_bytes(png())
        outside = self.root / "outside.png"
        outside.write_bytes(png())

        async def escape_after_wait(source):
            target = await original_get(source)
            self.source.unlink()
            self.source.symlink_to(outside)
            return target

        with mock.patch.object(self.service, "get", side_effect=escape_after_wait):
            self.assertEqual((await self.get()).status, 400)

    async def test_failure_http_and_no_cache_files_exposed(self):
        self.source.write_bytes(b"invalid media")
        with self.assertLogs("video_preview", level="ERROR"):
            response = await self.get()
        self.assertEqual(response.status, 422)
        self.assertIn("no-store", response.headers["Cache-Control"])
        self.assertFalse(list(self.service.directory.iterdir()))
        self.service.ffmpeg_bin = lambda: None
        self.assertEqual((await self.get()).status, 503)
        for url in ("/data/thumbnails/key.png", "/thumbnails/key.png", "/api/thumbnail/key.png"):
            self.assertEqual((await self.client.get(url)).status, 404)


class ThumbnailWiringTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def test_make_app_registers_private_endpoint_and_shutdown(self):
        self.auth_setup()
        try:
            self.own_project("p")
            uploads = self.root / "data" / "uploads"
            uploads.mkdir(parents=True)
            (uploads / "wired.png").write_bytes(png())
            self.register_asset("wired.png")
            with mock.patch.object(controller_app, "ROOT", self.root), \
                 mock.patch.object(controller_app, "CONTROLLER_MODE", False), \
                 mock.patch.object(controller_app, "load_caps", return_value=0), \
                 mock.patch.object(controller_app, "load_jobs"), mock.patch("builtins.print"):
                application = controller_app.make_app(auth_path=self.root / "data" / "auth.db")
            # 隔离 Comfy/迁移启动副作用，保留真实路由、中间件与 on_stop 装配。
            application.on_startup.clear()
            application["auth_store"] = self.auth
            application["resource_access"] = self.access
            application["session"] = mock.Mock(close=mock.AsyncMock())
            await self.start_client(application)
            try:
                response = await self.client.get("/api/thumbnail", params={"url": "/api/upload/wired.png"})
                self.assertEqual(response.status, 200)
                self.assertEqual(response.headers["Cache-Control"], "private, no-cache")
                await response.read()
                thumbnails = application["media_thumbnails"]
                self.assertEqual(thumbnails.directory, self.root / "data" / "thumbnails")
                target = next(thumbnails.directory.glob("*.png"))
                for prefix in ("/data/thumbnails/", "/thumbnails/", "/api/upload/", "/api/thumbnail/"):
                    self.assertEqual((await self.client.get(prefix + target.name)).status, 404)
            finally:
                await self.client.close()
            self.assertTrue(thumbnails.closed)
            self.assertFalse(thumbnails.tasks)
            application["session"].close.assert_awaited_once()
        finally:
            self.auth_teardown()


if __name__ == "__main__":
    unittest.main()
