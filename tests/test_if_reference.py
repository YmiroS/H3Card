import asyncio
import hashlib
import random
import struct
import subprocess
import sys
import tempfile
import unittest
import zlib
from contextlib import asynccontextmanager
from pathlib import Path
from unittest import mock

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'server'))
sys.path.insert(0, str(ROOT / 'tests'))
import app as controller_app
import auth_support
from if_reference import IFReferenceCopies, LIMITS


def png_bytes(width=128, height=128, noise=False):
    pixels = random.Random(42).randbytes(width * height * 4) if noise else bytes((23, 45, 67, 128)) * width * height
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    rows = b''.join(b'\0' + pixels[y * width * 4:(y + 1) * width * 4] for y in range(height))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(rows, 0)) + chunk(b'IEND', b'')), pixels


class IFReferenceEncodingTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.exe = controller_app.ffmpeg_bin()
        if not self.exe:
            self.skipTest('FFmpeg required')
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.copies = IFReferenceCopies(lambda: self.exe)

    async def asyncTearDown(self):
        if hasattr(self, 'temp'):
            self.temp.cleanup()

    def source(self, noise=False):
        path = self.root / 'source.png'
        data, pixels = png_bytes(noise=noise)
        path.write_bytes(data)
        return path, data, pixels

    async def test_lossless_preserves_rgba_pixels_and_original_and_cleans_copy(self):
        source, original, pixels = self.source()
        with mock.patch.dict(LIMITS, image=4096):
            async with self.copies.prepare(source, 'image') as (target, method):
                self.assertEqual(method, 'lossless-webp')
                self.assertLessEqual(target.stat().st_size, LIMITS['image'])
                decoded = await asyncio.to_thread(subprocess.run, [str(self.exe), '-v', 'error', '-i', str(target),
                    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], capture_output=True, timeout=30)
                self.assertEqual(decoded.returncode, 0, decoded.stderr)
                self.assertEqual(decoded.stdout, pixels)
        self.assertFalse(target.parent.exists())
        self.assertEqual(source.read_bytes(), original)

    async def test_static_gif_converts_to_webp_without_changing_original(self):
        source = self.root / 'static.gif'
        await self.copies.command(self.exe, '-v', 'error', '-f', 'lavfi', '-i',
            'color=c=red:size=64x48', '-frames:v', '1', str(source))
        original = source.read_bytes()
        async with self.copies.prepare(source, 'image') as (target, method):
            self.assertEqual(method, 'lossless-webp')
            self.assertEqual(target.read_bytes()[:4], b'RIFF')
        self.assertEqual(source.read_bytes(), original)
        self.assertFalse(target.parent.exists())

    async def test_real_twenty_mb_image_limit_without_mocking(self):
        original, _ = png_bytes(2400, 2400)
        source = self.root / 'large.png'
        source.write_bytes(original)
        self.assertGreater(source.stat().st_size, LIMITS['image'])
        async with self.copies.prepare(source, 'image') as (target, method):
            self.assertEqual(method, 'lossless-webp')
            self.assertLessEqual(target.stat().st_size, LIMITS['image'])
        self.assertEqual(source.read_bytes(), original)
        self.assertFalse(target.exists())

    async def test_noisy_image_falls_back_to_compression_under_limit(self):
        source, original, _ = self.source(noise=True)
        with mock.patch.dict(LIMITS, image=4096):
            async with self.copies.prepare(source, 'image') as (target, method):
                self.assertEqual(method, 'compressed-webp')
                self.assertLessEqual(target.stat().st_size, 4096)
        self.assertEqual(hashlib.sha256(source.read_bytes()).digest(), hashlib.sha256(original).digest())
        self.assertFalse(target.exists())

    async def test_video_keeps_full_duration_and_audio_under_limit(self):
        source = self.root / 'original.mkv'
        await self.copies.command(self.exe, '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x240:rate=24',
            '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '2',
            '-c:v', 'libx264', '-crf', '0', '-c:a', 'pcm_s16le', str(source))
        original = source.read_bytes()
        with mock.patch.dict(LIMITS, video=64 * 1024):
            async with self.copies.prepare(source, 'video') as (target, method):
                self.assertEqual(method, 'compressed-mp4')
                self.assertLessEqual(target.stat().st_size, 64 * 1024)
                metadata = await self.copies.command(self.exe, '-i', str(target), check=False)
                self.assertRegex(metadata, r'Duration: 00:00:02\.\d\d')
                self.assertIn('Audio: aac', metadata)
                self.assertIn('Video: h264', metadata)
        self.assertFalse(target.parent.exists())
        self.assertEqual(source.read_bytes(), original)

    async def test_missing_encoder_and_invalid_input_leave_original(self):
        source, original, _ = self.source()
        self.copies.ffmpeg_bin = lambda: None
        with self.assertRaises(web.HTTPServiceUnavailable):
            async with self.copies.prepare(source, 'image'):
                self.fail('must fail')
        self.assertEqual(source.read_bytes(), original)
        self.copies.ffmpeg_bin = lambda: self.exe
        source.write_bytes(b'not an image')
        with self.assertLogs('if_reference', level='WARNING'), self.assertRaises(web.HTTPUnprocessableEntity):
            async with self.copies.prepare(source, 'image'):
                self.fail('must fail')
        self.assertEqual(source.read_bytes(), b'not an image')

    async def test_timeout_and_cancellation_kill_and_reap_process(self):
        for cancel in (False, True):
            started, stopped = asyncio.Event(), asyncio.Event()
            process = mock.Mock(returncode=None)
            async def communicate():
                started.set()
                await stopped.wait()
                return b'', b''
            def kill():
                process.returncode = -9
                stopped.set()
            process.communicate = communicate
            process.kill = mock.Mock(side_effect=kill)
            with mock.patch('if_reference.asyncio.create_subprocess_exec', new=mock.AsyncMock(return_value=process)):
                task = asyncio.create_task(self.copies.command('ffmpeg', timeout=30 if cancel else .01))
                await started.wait()
                if cancel:
                    task.cancel()
                with self.assertRaises(asyncio.CancelledError if cancel else web.HTTPUnprocessableEntity):
                    await task
            process.kill.assert_called_once()
            self.assertTrue(stopped.is_set())


class IFReferenceAPITests(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def asyncSetUp(self):
        self.auth_setup()
        self.own_project()
        self.uploads = self.root / 'data' / 'uploads'
        self.uploads.mkdir(parents=True)
        self.source = self.uploads / 'reference.png'
        self.original, _ = png_bytes()
        self.source.write_bytes(self.original)
        self.register_asset(self.source.name)
        self.app = self.build_app()
        self.app['if_reference_copies'] = IFReferenceCopies(controller_app.ffmpeg_bin)
        self.app.router.add_get('/api/if-reference', controller_app.api_if_reference)
        await self.start_client(self.app)

    async def asyncTearDown(self):
        await self.client.close()
        self.auth_teardown()

    async def get(self, **overrides):
        params = {'url': '/api/upload/reference.png', 'type': 'image', **overrides}
        return await self.client.get('/api/if-reference', params=params)

    async def test_real_authenticated_conversion_is_private_and_original_unchanged(self):
        if not controller_app.ffmpeg_bin():
            self.skipTest('FFmpeg required')
        response = await self.get()
        self.assertEqual(response.status, 200, await response.text() if response.status != 200 else '')
        self.assertEqual(response.headers['Content-Type'], 'image/webp')
        self.assertEqual(response.headers['X-Chouka-IF-Conversion'], 'lossless-webp')
        self.assertIn('no-store', response.headers['Cache-Control'])
        self.assertEqual((await response.read())[:4], b'RIFF')
        self.assertEqual(self.source.read_bytes(), self.original)

    async def test_rejects_external_traversal_duplicate_and_wrong_type(self):
        for params in ({'url': 'https://example.org/test.png'}, {'url': '/api/upload/../outside.png'},
                       {'type': 'audio'}, {'type': 'video'}, {'extra': 'x'}):
            response = await self.get(**params)
            self.assertEqual(response.status, 400, await response.text())
        response = await self.client.get('/api/if-reference?url=x&type=image&type=video')
        self.assertEqual(response.status, 400)

    async def test_anonymous_and_unregistered_resources_are_denied_before_encoding(self):
        response = await self.get(url='/api/upload/private.png')
        self.assertEqual(response.status, 404)
        async with TestClient(TestServer(self.build_app())) as anonymous:
            response = await anonymous.get('/api/if-reference?url=/api/upload/reference.png&type=image')
            self.assertEqual(response.status, 401)

    async def test_production_disconnect_stops_real_encoder_and_releases_slot(self):
        exe = controller_app.ffmpeg_bin()
        if not exe:
            self.skipTest('FFmpeg required')
        copies = self.app['if_reference_copies']
        source = self.uploads / 'disconnect.mkv'
        await copies.command(exe, '-v', 'error', '-f', 'lavfi', '-i',
            'testsrc2=size=320x240:rate=24', '-t', '20', '-c:v', 'libx264', '-preset', 'ultrafast', str(source))
        original = hashlib.sha256(source.read_bytes()).digest()
        self.register_asset(source.name)
        started, finished = asyncio.Event(), asyncio.Event()
        processes, directories = [], []
        spawn = asyncio.create_subprocess_exec
        command, prepare = copies.command, copies.prepare

        async def slow_command(executable, *args, **kwargs):
            if '-pass' in args:
                index = args.index('-i')
                args = (*args[:index], '-re', *args[index:])
            return await command(executable, *args, **kwargs)

        async def capture(*args, **kwargs):
            process = await spawn(*args, **kwargs)
            if '-pass' in args:
                processes.append(process)
                directories.append(Path(args[args.index('-passlogfile') + 1]).parent)
                started.set()
            return process

        @asynccontextmanager
        async def tracked(source, kind):
            try:
                async with prepare(source, kind) as result:
                    yield result
            finally:
                finished.set()

        copies.command, copies.prepare = slow_command, tracked
        app = self.build_app()
        app['if_reference_copies'] = copies
        app.router.add_get('/api/if-reference', controller_app.api_if_reference)
        # 正式入口默认不启用 handler_cancellation，不能用 TestServer 的默认配置代替。
        runner = web.AppRunner(app)
        writer = None
        with mock.patch('if_reference.asyncio.create_subprocess_exec', side_effect=capture):
            try:
                await runner.setup()
                site = web.TCPSite(runner, '127.0.0.1', 0)
                await site.start()
                port = site._server.sockets[0].getsockname()[1]
                _, writer = await asyncio.open_connection('127.0.0.1', port)
                cookies = self.client.session.cookie_jar.filter_cookies(self.client.make_url('/'))
                cookie = '; '.join(f'{key}={value.value}' for key, value in cookies.items())
                writer.write((f'GET /api/if-reference?url=/api/upload/{source.name}&type=video HTTP/1.1\r\n'
                    f'Host: 127.0.0.1:{port}\r\nCookie: {cookie}\r\n\r\n').encode())
                await writer.drain()
                await asyncio.wait_for(started.wait(), 5)
                writer.close()
                await writer.wait_closed()
                await asyncio.wait_for(finished.wait(), 5)
                self.assertEqual(len(processes), 1, 'disconnected request must not start pass two')
                self.assertIsNotNone(processes[0].returncode, 'encoder must be killed and reaped')
                self.assertEqual(copies.slots._value, 2)
                self.assertTrue(all(not path.exists() for path in directories))
                self.assertEqual(hashlib.sha256(source.read_bytes()).digest(), original)
            finally:
                if writer:
                    writer.close()
                    await writer.wait_closed()
                await runner.cleanup()

    async def test_source_change_during_encoding_does_not_return_copy(self):
        @asynccontextmanager
        async def changed(source, kind):
            source.write_bytes(b'changed')
            target = self.root / 'copy.webp'
            target.write_bytes(b'copy')
            yield target, 'lossless-webp'
        self.app['if_reference_copies'].prepare = changed
        response = await self.get()
        self.assertEqual(response.status, 409)
        self.assertNotEqual(await response.read(), b'copy')


if __name__ == '__main__':
    unittest.main()
