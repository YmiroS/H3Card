"""Offline-only authorization/signing units and real aiohttp fake-upstream streaming tests."""
import asyncio
import copy
import socket
import unittest
from types import SimpleNamespace
from pathlib import Path
from unittest.mock import AsyncMock, patch
from urllib.parse import parse_qs, urlsplit, urlencode

import aiohttp
from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer
from multidict import MultiDict
from yarl import URL

from server import dinghai_media as media

PARAMS = {'assumeRole': {'accessKeyId': 'test-ak', 'accessKeySecret': 'test-secret',
                         'securityToken': 'sts+/=token'},
          'ossConfig': {'bucket': 'media-bucket', 'region': 'oss-cn-hangzhou',
                        'endpoint': 'https://anim-res.youku.com'}}
QUERY = {'processNodeId': '10', 'groupId': '20', 'fileId': '30', 'camera': '0', 'history': '0'}


def resource(version=40, key='folder/a.png', old=False):
    return {'id': 30, 'isFile': True, 'type': 'IMAGE',
            'attributes': {'ossPath': key, 'size': 8},
            'ftpResourceRelationVersion': {'id': version, 'ftpResourceId': 30, 'isOld': old}}


def tree(*resources):
    return [{'name': 'group', 'children': [{'nodeType': 'FILE_BOX', 'fileBoxList': [
        {'ftpResource': {'id': 99, 'isFile': False, 'children': list(resources)}}]}]}]


class MediaUnitTests(unittest.TestCase):
    def test_query_is_exact_and_rejects_browser_download_inputs(self):
        parsed = media.parse_query(MultiDict(QUERY))
        self.assertEqual(parsed['fileId'], 30)
        self.assertFalse(parsed['history'])
        cases = [MultiDict({**QUERY, key: 'x'}) for key in ('url', 'ossPath', 'token', 'host', 'satoken')]
        cases += [MultiDict({**QUERY, key: value}) for key, value in (
            ('fileId', '0'), ('fileId', '-1'), ('fileId', '1.5'), ('fileId', 'true'),
            ('fileId', '１'), ('fileId', '9223372036854775808'), ('versionId', ''),
            ('camera', 'true'), ('history', '2'), ('thumbnail', 'html'))]
        cases.append(MultiDict([*QUERY.items(), ('fileId', '30')]))
        cases.append(MultiDict({k: v for k, v in QUERY.items() if k != 'history'}))
        for case in cases:
            with self.subTest(case=case), self.assertRaises(web.HTTPBadRequest):
                media.parse_query(case)

    def test_versions_use_record_id_not_version_number_or_first_match(self):
        older, current = resource(40, 'old.png', True), resource(41, 'new.png')
        older['ftpResourceRelationVersion']['version'] = 7
        self.assertEqual(media.select_file(tree(older, current), 30, 40, history=True), older)
        self.assertEqual(media.select_file(tree(older, current), 30, 41, history=True), current)
        self.assertEqual(media.select_file(tree(older, current), 30), current)
        for version in (7, 999):
            with self.assertRaises(web.HTTPNotFound):
                media.select_file(tree(older, current), 30, version, history=True)
        with self.assertRaises(web.HTTPNotFound):
            media.select_file(tree(older, current), 30, 40)
        with self.assertRaises(web.HTTPConflict):
            media.select_file(tree(older, current), 30, history=True)
        with self.assertRaises(web.HTTPConflict):
            media.select_file(tree(older, older), 30, 40, history=True)

    def test_missing_deleted_directory_and_wrong_resource_never_match(self):
        for candidate in ({**resource(), 'isFile': False}, {**resource(), 'id': True},
                          {**resource(), 'attributes': {'markDelete': True}}):
            with self.assertRaises(web.HTTPNotFound):
                media.select_file(tree(candidate), 30)
        with self.assertRaises(web.HTTPNotFound):
            media.select_file(tree(resource()), 31)
        candidate = resource()
        candidate['ftpResourceRelationVersion']['ftpResourceId'] = 31
        with self.assertRaises(web.HTTPBadGateway):
            media.select_file(tree(candidate), 30)

    def test_canonical_vectors_from_read_only_ali_oss_signutils(self):
        vectors = [
            ('folder/a.png', 'sts+/=token', None, 'Tsk/+Niu0CdZ8fsVtagS5b5olHM='),
            ('素材/a b+%.png', 'token+/=', 'image/resize,h_120,m_lfit', 'TbqOxhfIPwp9C0ySqSm26v+zHO8='),
            ('clip.mp4', 'abc', 'video/snapshot,t_0,f_jpg,w_240', 'Gsub1aRWHtH6XdDunZa5Fjao0hI='),
        ]
        for key, token, process, signature in vectors:
            params = copy.deepcopy(PARAMS)
            params['assumeRole']['securityToken'] = token
            signed = media.presign_get(params, key, process, now=1700000000)
            query = parse_qs(urlsplit(str(signed)).query)
            self.assertEqual(query['Signature'], [signature])
            self.assertEqual(query['security-token'], [token])
            canonical = media.canonical_get('media-bucket', key, 1700000300, token, process)
            expected = 'GET\n\n\n1700000300\n/media-bucket/' + key + '?security-token=' + token
            if process:
                expected += '&x-oss-process=' + process
            self.assertEqual(canonical, expected)
        self.assertIn('/%E7%B4%A0%E6%9D%90/a%20b%2B%25.png', str(media.presign_get(PARAMS, '素材/a b+%.png')))

    def test_object_key_is_not_a_url_and_encoded_traversal_is_rejected(self):
        self.assertEqual(media.normalize_object_key('/folder/a b.png'), 'folder/a b.png')
        self.assertEqual(media.normalize_object_key('folder/a%20b.png'), 'folder/a%20b.png')
        for key in ('', '../x', 'x/../y', 'x/./y', 'x//y', '//evil/x', 'x\\y',
                    'https://evil/x', 'zxnas://x', 'x/%2e%2e/y', 'x/%252e%252e/y',
                    'x/%2f../y', 'x/%5c../y', 'x/%00y', 'x\r\ny'):
            with self.subTest(key=key), self.assertRaises(web.HTTPBadGateway):
                media.normalize_object_key(key)

    def test_origin_allowlist_and_bucket_addressing(self):
        for endpoint, expected in (
            ('anim-res.youku.com', 'https://anim-res.youku.com'),
            ('https://oss-cn-hangzhou.aliyuncs.com', 'https://media-bucket.oss-cn-hangzhou.aliyuncs.com'),
            ('media-bucket.oss-cn-hangzhou.aliyuncs.com', 'https://media-bucket.oss-cn-hangzhou.aliyuncs.com')):
            self.assertEqual(media.oss_origin({**PARAMS['ossConfig'], 'endpoint': endpoint}), expected)
        for endpoint in ('http://anim-res.youku.com', 'https://127.0.0.1', 'https://[::1]',
                         'https://localhost', 'https://10.0.0.1', 'https://169.254.169.254',
                         'https://anim-res.youku.com.evil.test', 'https://evil.test',
                         'https://ecs.aliyuncs.com', 'https://u:p@anim-res.youku.com',
                         'https://anim-res.youku.com:443', 'https://anim-res.youku.com/a',
                         'https://anim-res.youku.com?x=1', 'https://anim-res.youku.com#x',
                         'https://other.oss-cn-hangzhou.aliyuncs.com'):
            with self.subTest(endpoint=endpoint), self.assertRaises(web.HTTPBadGateway):
                media.oss_origin({**PARAMS['ossConfig'], 'endpoint': endpoint})

    def test_ranges_are_single_bounded_byte_ranges(self):
        for value in ('bytes=0-3', 'bytes=3-', 'bytes=-3'):
            self.assertEqual(media.parse_range(value), value)
        for value in ('bytes=1-0', 'bytes=-0', 'bytes=-', 'bytes=0-1,4-5',
                      'items=0-1', 'bytes=0-' + str(media.MAX_BYTES), 'bytes=0-9999999999999999999999999'):
            with self.subTest(value=value), self.assertRaises(web.HTTPRequestRangeNotSatisfiable):
                media.parse_range(value)

    def test_response_headers_are_allowlisted_and_ranges_verified(self):
        upstream = SimpleNamespace(status=206, headers={
            'Content-Type': 'video/mp4', 'Content-Length': '4', 'Content-Range': 'bytes 2-5/8',
            'Accept-Ranges': 'bytes', 'Set-Cookie': 'secret=x', 'Location': 'secret', 'X-OSS-Token': 'secret'})
        outgoing = media.response_headers(upstream, 'bytes=2-5')
        self.assertEqual(outgoing['Content-Range'], 'bytes 2-5/8')
        self.assertNotIn('Set-Cookie', outgoing)
        for change in ({'Content-Length': '5'}, {'Content-Range': 'bytes 1-4/8'},
                       {'Content-Type': 'text/html'}, {'Content-Encoding': 'gzip'},
                       {'Content-Range': 'bytes 2-5/*'}):
            with self.assertRaises(web.HTTPBadGateway):
                media.response_headers(SimpleNamespace(status=206, headers={**upstream.headers, **change}), 'bytes=2-5')


class ResolverTests(unittest.IsolatedAsyncioTestCase):
    async def test_resolved_private_addresses_are_rejected_before_connect(self):
        resolver = media.PublicOSSResolver()
        try:
            for address in ('127.0.0.1', '10.0.0.1', '169.254.169.254', '::1', 'fc00::1',
                            '::ffff:127.0.0.1', '224.0.0.1', '100.64.0.1'):
                with patch.object(media.ThreadedResolver, 'resolve', AsyncMock(return_value=[{'host': address}])):
                    with self.subTest(address=address), self.assertRaises(OSError):
                        await resolver.resolve('anim-res.youku.com', 443)
            with patch.object(media.ThreadedResolver, 'resolve', AsyncMock(return_value=[{'host': '8.8.8.8'}])):
                self.assertEqual((await resolver.resolve('anim-res.youku.com', 443))[0]['host'], '8.8.8.8')
                for host, port in (('evil.test', 443), ('anim-res.youku.com', 80)):
                    with self.assertRaises(OSError):
                        await resolver.resolve(host, port)
        finally:
            await resolver.close()


class MediaRegistrationTests(unittest.IsolatedAsyncioTestCase):
    async def test_backend_registration_and_real_helper_contract(self):
        from server import dinghai_api
        from server.dinghai_auth import register_dinghai_auth_routes

        self.assertIs(media.require_dinghai, dinghai_api.require_dinghai)
        self.assertIs(media.upstream_post, dinghai_api.upstream_post)
        self.assertTrue(asyncio.iscoroutinefunction(media.require_dinghai))
        self.assertTrue(asyncio.iscoroutinefunction(media.upstream_post))
        app = web.Application()
        with patch.dict('os.environ', {'CHOUKA_DINGHAI_API_BASE': 'https://dinghai.example.test'}):
            register_dinghai_auth_routes(app)
        routes = [(route.method, route.resource.canonical) for route in app.router.routes()]
        self.assertEqual(routes.count(('GET', '/api/dinghai/media')), 1)
        self.assertEqual(routes.count(('HEAD', '/api/dinghai/media')), 1)
        self.assertFalse(any(path == '/api/dinghai/file/oss/file' for _, path in routes))
        self.assertEqual(dinghai_api.validate_body('/api/file/oss/file',
                         {'projectCode': '', 'ossFileList': []}), {'projectCode': '', 'ossFileList': []})
        # No fake require helper: the registered route must reject missing Dinghai
        # authorization without making a network request or emitting local cookies.
        async with TestClient(TestServer(app)) as client:
            with patch.object(media, 'upstream_post', AsyncMock()) as upstream:
                response = await client.get('/api/dinghai/media', params=QUERY)
                self.assertEqual(response.status, 403)
                self.assertEqual((await response.json())['code'], 'dinghai_media_denied')
                self.assertNotIn('Set-Cookie', response.headers)
                upstream.assert_not_awaited()


class MediaHTTPTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.groups = [{'groupId': 20, 'canDownload': True}]
        self.tree = tree(resource())
        self.oss_params = copy.deepcopy(PARAMS)
        self.api_calls = []
        self.oss_calls = []
        self.status = 200
        self.payload = b'abcdefgh'
        self.response_headers = {'Content-Type': 'image/png', 'Accept-Ranges': 'bytes',
                                 'Set-Cookie': 'oss-cookie=private', 'X-OSS-Request-ID': 'private'}
        self.api_error = None
        self.stream_mode = False
        self.chunked_mode = False
        self.started = asyncio.Event()
        self.disconnected = asyncio.Event()
        self.actual_session = aiohttp.ClientSession
        upstream = web.Application()
        upstream.router.add_post('/api/{path:.*}', self.fake_api)
        upstream.router.add_get('/oss/{path:.*}', self.fake_oss)
        self.upstream = TestServer(upstream)
        await self.upstream.start_server()
        self.api_session = self.actual_session(cookie_jar=aiohttp.DummyCookieJar())
        app = web.Application()
        media.register_dinghai_media_routes(app)
        self.client = TestClient(TestServer(app))
        await self.client.start_server()
        self.app = app
        self.require = AsyncMock(return_value=SimpleNamespace(token='site-dinghai-token'))
        self.patches = [patch.object(media, 'require_dinghai', self.require),
                        patch.object(media, 'upstream_post', self.fake_post),
                        patch.object(media.aiohttp, 'ClientSession', self.oss_session)]
        for item in self.patches:
            item.start()

    async def asyncTearDown(self):
        await self.client.close()
        await self.api_session.close()
        await self.upstream.close()
        for item in reversed(self.patches):
            item.stop()

    async def fake_api(self, request):
        self.assertEqual(request.headers.get('satoken'), 'site-dinghai-token')
        body = await request.json()
        self.api_calls.append((request.path, body))
        if self.api_error:
            return web.Response(status=self.api_error, text='secret-token test-secret')
        if request.path.endswith('queryFileGroup'):
            result = self.groups
        elif request.path.endswith(('queryFileGroupFilesV2', 'queryCameraFileBox')):
            result = self.tree
        else:
            self.assertEqual(request.path, '/api/file/oss/file')
            self.assertEqual(body, {'projectCode': '', 'ossFileList': []})
            result = {'ossParam': self.oss_params}
        return web.json_response({'success': True, 'result': result})

    async def fake_post(self, request, path, body):
        async with self.api_session.post(self.upstream.make_url(path), json=body,
                                         headers={'satoken': 'site-dinghai-token'}) as response:
            if response.status == 401:
                raise web.HTTPUnauthorized(text=await response.text(), headers={'Set-Cookie': 'site=; Max-Age=0'})
            if response.status != 200:
                raise web.HTTPBadGateway(text=await response.text())
            return (await response.json())['result']

    def oss_session(self, **kwargs):
        # Only the transport target is replaced. Production signing, range/header
        # handling, streaming and session options all run against a real HTTP server.
        self.assertFalse(kwargs['trust_env'])
        self.assertFalse(kwargs['auto_decompress'])
        self.assertIsInstance(kwargs['cookie_jar'], aiohttp.DummyCookieJar)
        session = self.actual_session(**kwargs)
        original_get = session.get

        def local_get(url, **options):
            self.assertTrue(options['ssl'])
            self.assertFalse(options['allow_redirects'])
            local = str(self.upstream.make_url('/oss/')) + url.raw_path.lstrip('/') + '?' + url.raw_query_string
            return original_get(URL(local, encoded=True), **options)

        session.get = local_get
        return session

    async def fake_oss(self, request):
        self.oss_calls.append((request.path, dict(request.headers), dict(request.query)))
        self.assertNotIn('satoken', request.headers)
        self.assertNotIn('Cookie', request.headers)
        self.assertNotIn('Authorization', request.headers)
        self.assertEqual(request.query['OSSAccessKeyId'], 'test-ak')
        headers = dict(self.response_headers)
        if self.stream_mode:
            response = web.StreamResponse(headers=headers)
            await response.prepare(request)
            await response.write(b'a')
            self.started.set()
            try:
                while request.transport and not request.transport.is_closing():
                    await asyncio.sleep(0.01)
            finally:
                self.disconnected.set()
            return response
        if self.chunked_mode:
            response = web.StreamResponse(headers=headers)
            response.enable_chunked_encoding()
            await response.prepare(request)
            await response.write(self.payload)
            await response.write_eof()
            return response
        status = self.status
        payload = self.payload
        if 'Range' in request.headers and status == 200:
            start, end = request.headers['Range'][6:].split('-')
            first = int(start) if start else max(0, len(payload) - int(end))
            last = min(int(end), len(payload) - 1) if start and end else len(payload) - 1
            headers['Content-Range'] = f'bytes {first}-{last}/{len(payload)}'
            payload, status = payload[first:last + 1], 206
        return web.Response(body=payload, status=status, headers=headers)

    async def get(self, *, method='GET', headers=None, **changes):
        return await self.client.request(method, '/api/dinghai/media', params={**QUERY, **changes}, headers=headers)

    async def assert_slots_released(self):
        # A client observing EOF can precede the handler's async-finally completion.
        slots = self.app[media._SLOTS]
        acquired = 0
        try:
            for _ in range(media.MAX_CONCURRENT):
                await asyncio.wait_for(slots.acquire(), 1)
                acquired += 1
        finally:
            for _ in range(acquired):
                slots.release()
        self.assertEqual(slots._value, media.MAX_CONCURRENT)

    async def test_stream_download_no_client_credentials_or_oss_headers_leak(self):
        response = await self.get(headers={'Cookie': 'site=local-secret', 'satoken': 'browser-token',
                                           'Authorization': 'Bearer local-secret', 'X-Forwarded-Host': 'localhost'})
        self.assertEqual(response.status, 200)
        self.assertEqual(await response.read(), self.payload)
        self.assertEqual(response.headers['Content-Type'], 'image/png')
        self.assertEqual(response.headers['Content-Length'], '8')
        self.assertEqual(response.headers['Accept-Ranges'], 'bytes')
        for name in ('Set-Cookie', 'Location', 'X-OSS-Request-ID', 'Authorization'):
            self.assertNotIn(name, response.headers)
        self.assertNotIn('test-secret', str(response.headers))
        self.assertNotIn('test-ak', str(response.headers))
        self.assertEqual(len(self.api_calls), 3)
        self.assertEqual(len(self.oss_calls), 1)

    async def test_group_authorization_denied_before_tree_sts_or_download(self):
        cases = [[], [{'groupId': 21, 'canDownload': True}], [{'groupId': 20}],
                 [{'groupId': 20, 'canDownload': True}, {'groupId': 20, 'canDownload': True}]]
        cases.extend([{'groupId': 20, 'canDownload': value}]
                     for value in (False, None, 0, 1, 'true', 'false', '', [], {}))
        for groups in cases:
            with self.subTest(groups=groups):
                self.groups = groups
                response = await self.get()
                self.assertEqual(response.status, 403)
                self.assertEqual((await response.json())['code'], 'dinghai_media_denied')
        self.assertTrue(all(path.endswith('queryFileGroup') for path, _ in self.api_calls))
        self.assertFalse(self.oss_calls)

    async def test_capability_failure_is_403_and_cannot_clear_local_cookie(self):
        self.require.side_effect = web.HTTPUnauthorized(text='test-secret', headers={'Set-Cookie': 'site=; Max-Age=0'})
        response = await self.get()
        self.assertEqual(response.status, 403)
        self.assertNotIn('Set-Cookie', response.headers)
        self.assertNotIn('test-secret', await response.text())
        self.assertFalse(self.api_calls)
        self.require.side_effect = None
        self.api_error = 401
        response = await self.get()
        self.assertEqual(response.status, 403)
        self.assertNotIn('Set-Cookie', response.headers)
        self.assertNotIn('secret', await response.text())

    async def test_exact_history_version_camera_and_no_guessing(self):
        self.tree = tree(resource(40, 'old.png', True), resource(41, 'new.png'))
        response = await self.get(history='1', camera='1', versionId='40')
        self.assertEqual(response.status, 200)
        await response.read()
        self.assertEqual(self.oss_calls[0][0], '/oss/old.png')
        path, body = self.api_calls[1]
        self.assertTrue(path.endswith('queryCameraFileBox'))
        self.assertEqual(body, {'processNodeId': 10, 'groupId': 20, 'includeChildren': True, 'includeHistory': True})
        for changes, status in (({'history': '1'}, 409), ({'versionId': '40'}, 404),
                                ({'history': '1', 'versionId': '999'}, 404), ({'fileId': '999'}, 404)):
            response = await self.get(**changes)
            self.assertEqual(response.status, status)
            await response.read()
        self.assertEqual(len(self.oss_calls), 1)

    async def test_version_id_is_bound_to_exact_resource_record_before_signing(self):
        missing_version = resource()
        missing_version.pop('ftpResourceRelationVersion')
        wrong_record = resource(41)
        wrong_record['ftpResourceRelationVersion']['version'] = 40
        other_file = resource(40)
        other_file['id'] = 31
        other_file['ftpResourceRelationVersion']['ftpResourceId'] = 31
        mismatched_relation = resource(40)
        mismatched_relation['ftpResourceRelationVersion']['ftpResourceId'] = 31
        cases = [
            (tree(missing_version), 404),
            (tree(wrong_record), 404),
            (tree(resource(41), other_file), 404),
            (tree(resource(40), resource(40)), 409),
            (tree(mismatched_relation), 502),
        ]
        for candidate_tree, status in cases:
            with self.subTest(status=status, tree=candidate_tree):
                self.tree = candidate_tree
                response = await self.get(history='1', versionId='40')
                self.assertEqual(response.status, status)
                await response.read()
        self.assertFalse(self.oss_calls)
        self.assertFalse(any(path == '/api/file/oss/file' for path, _ in self.api_calls))

    async def test_range_and_head_preserve_semantics(self):
        for requested, expected, content_range in (('bytes=2-5', b'cdef', 'bytes 2-5/8'),
                                                    ('bytes=-3', b'fgh', 'bytes 5-7/8'),
                                                    ('bytes=5-', b'fgh', 'bytes 5-7/8')):
            response = await self.get(headers={'Range': requested})
            self.assertEqual(response.status, 206)
            self.assertEqual(await response.read(), expected)
            self.assertEqual(response.headers['Content-Range'], content_range)
        response = await self.get(method='HEAD')
        self.assertEqual(response.status, 200)
        self.assertEqual(response.headers['Content-Length'], '8')
        self.assertEqual(await response.read(), b'')
        response = await self.get(headers={'Range': 'bytes=0-1,3-4'})
        self.assertEqual(response.status, 416)

    async def test_compatibility_preview_ranges_cache_and_reauthorization(self):
        candidate = resource(key='clip.mp4')
        candidate['type'] = 'VIDEO'
        self.tree = tree(candidate)
        self.response_headers['Content-Type'] = 'video/mp4'
        self.app['video_previews'] = SimpleNamespace(ffmpeg_bin=lambda: 'ffmpeg')
        previews = self.app[media._PREVIEWS]

        async def convert(executable, source, target):
            self.assertEqual(source.read_bytes(), self.payload)
            target.write_bytes(b'compatible-mp4')

        with patch.object(previews, 'convert', AsyncMock(side_effect=convert)) as converter:
            response = await self.get(preview='1', versionId='40', headers={'Range': 'bytes=2-5'})
            self.assertEqual(response.status, 206)
            self.assertEqual(await response.read(), b'mpat')
            self.assertEqual(response.headers['Content-Range'], 'bytes 2-5/14')
            self.assertEqual(len(self.oss_calls), 1)
            self.assertNotIn('Range', self.oss_calls[0][1])
            response = await self.get(preview='1', versionId='40', method='HEAD')
            self.assertEqual(response.status, 200)
            self.assertEqual(response.headers['Content-Length'], '14')
            self.assertEqual(await response.read(), b'')
            self.assertEqual(converter.await_count, 1)
            self.assertEqual(len(self.oss_calls), 1)
            self.assertEqual(len(self.api_calls), 6)
            self.assertEqual(len(list(Path(previews.directory.name).iterdir())), 1)
            self.groups[0]['canDownload'] = False
            response = await self.get(preview='1', versionId='40')
            self.assertEqual(response.status, 403)
            self.assertEqual(converter.await_count, 1)
            self.assertNotIn('test-ak', str(response.headers))

    async def test_preview_stream_timeout_closes_connection_without_second_response(self):
        candidate = resource(key='clip.mp4')
        candidate['type'] = 'VIDEO'
        self.tree = tree(candidate)
        self.response_headers['Content-Type'] = 'video/mp4'
        self.app['video_previews'] = SimpleNamespace(ffmpeg_bin=lambda: 'ffmpeg')
        previews = self.app[media._PREVIEWS]
        original_write = web.StreamResponse.write

        async def convert(executable, source, target):
            target.write_bytes(b'compatible-mp4')

        async def timeout_after_headers(response, data):
            await original_write(response, data[:1])
            raise asyncio.TimeoutError()

        url = self.client.make_url('/api/dinghai/media')
        reader, writer = await asyncio.open_connection(url.host, url.port)
        try:
            with patch.object(previews, 'convert', AsyncMock(side_effect=convert)), \
                    patch.object(web.StreamResponse, 'write', timeout_after_headers):
                query = urlencode({**QUERY, 'preview': '1'})
                writer.write(f'GET /api/dinghai/media?{query} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n'.encode())
                await writer.drain()
                raw = await asyncio.wait_for(reader.read(), 5)
            self.assertEqual(raw.count(b'HTTP/1.'), 1)
            headers, body = raw.split(b'\r\n\r\n', 1)
            self.assertIn(b'200 OK', headers)
            self.assertEqual(body, b'c')
            self.assertNotIn(b'json', raw)
        finally:
            writer.close()
            await writer.wait_closed()
        await self.assert_slots_released()
        self.assertFalse(previews.lock.locked())

    async def test_preview_file_is_closed_before_cache_lock_is_released(self):
        candidate = resource(key='clip.mp4')
        candidate['type'] = 'VIDEO'
        self.tree = tree(candidate)
        self.response_headers['Content-Type'] = 'video/mp4'
        self.app['video_previews'] = SimpleNamespace(ffmpeg_bin=lambda: 'ffmpeg')
        previews = self.app[media._PREVIEWS]
        original_open = Path.open
        opened = []

        async def convert(executable, source, target):
            target.write_bytes(b'compatible-mp4')

        def track_open(path, *args, **kwargs):
            file = original_open(path, *args, **kwargs)
            if path.suffix == '.mp4' and args == ('rb',):
                opened.append(file)
            return file

        with patch.object(previews, 'convert', AsyncMock(side_effect=convert)), \
                patch.object(Path, 'open', track_open):
            response = await self.get(preview='1', headers={'Range': 'bytes=-3'})
            self.assertEqual(response.status, 206)
            self.assertEqual(await response.read(), b'mp4')
            response = await self.get(preview='1', headers={'Range': 'bytes=14-'})
            self.assertEqual(response.status, 416)
            await response.read()
        await self.assert_slots_released()
        self.assertFalse(previews.lock.locked())
        self.assertTrue(opened)
        self.assertTrue(all(file.closed for file in opened))

    async def test_preview_rejects_wrong_kind_and_invalid_options(self):
        for changes in ({'preview': '1'}, {'preview': '0'}, {'preview': 'true'},
                        {'preview': '1', 'thumbnail': 'image'}):
            response = await self.get(**changes)
            self.assertEqual(response.status, 400)
            await response.read()
        self.assertFalse(self.oss_calls)

    async def test_preview_conversion_failure_removes_original_and_partial_copy(self):
        candidate = resource(key='clip.mp4')
        candidate['type'] = 'VIDEO'
        self.tree = tree(candidate)
        self.response_headers['Content-Type'] = 'video/mp4'
        self.app['video_previews'] = SimpleNamespace(ffmpeg_bin=lambda: 'ffmpeg')
        previews = self.app[media._PREVIEWS]

        async def fail(executable, source, target):
            target.write_bytes(b'partial')
            raise RuntimeError('secret-signed-url')

        with patch.object(previews, 'convert', AsyncMock(side_effect=fail)):
            response = await self.get(preview='1')
            self.assertEqual(response.status, 502)
            self.assertNotIn('secret', await response.text())
            self.assertEqual(list(Path(previews.directory.name).iterdir()), [])
            self.assertFalse(previews.lock.locked())
        response = await self.get()
        self.assertEqual(await response.read(), self.payload)

    async def test_thumbnail_processes_match_source_core(self):
        for kind, expected in media.THUMB_PROCESSES.items():
            candidate = resource()
            candidate['type'] = kind.upper()
            self.tree = tree(candidate)
            response = await self.get(thumbnail=kind)
            self.assertEqual(response.status, 200)
            await response.read()
            self.assertEqual(self.oss_calls[-1][2]['x-oss-process'], expected)

    async def test_unsafe_origins_and_object_paths_never_download(self):
        self.oss_params['ossConfig']['endpoint'] = 'https://127.0.0.1'
        response = await self.get()
        self.assertEqual(response.status, 502)
        self.oss_params = copy.deepcopy(PARAMS)
        self.tree = tree(resource(key='x/%252e%252e/secret'))
        response = await self.get()
        self.assertEqual(response.status, 502)
        self.assertFalse(self.oss_calls)

    async def test_redirect_is_not_followed_or_reflected(self):
        self.status = 302
        self.response_headers['Location'] = str(self.upstream.make_url('/oss/redirected')) + '?secret=test-secret'
        response = await self.get()
        self.assertEqual(response.status, 502)
        self.assertEqual(len(self.oss_calls), 1)
        self.assertNotIn('Location', response.headers)
        self.assertNotIn('test-secret', await response.text())

    async def test_upstream_auth_error_body_and_headers_are_never_forwarded(self):
        self.status = 403
        self.payload = b'<Error>test-secret sts+/=token test-ak</Error>'
        response = await self.get()
        self.assertEqual(response.status, 403)
        body = await response.text()
        for secret in ('test-secret', 'sts+', 'test-ak'):
            self.assertNotIn(secret, body + str(response.headers))
        self.assertNotIn('Set-Cookie', response.headers)

    async def test_mime_and_oversized_files_fail_closed(self):
        self.response_headers['Content-Type'] = 'text/html'
        response = await self.get()
        self.assertEqual(response.status, 502)
        self.response_headers['Content-Type'] = 'image/png'
        self.tree[0]['children'][0]['fileBoxList'][0]['ftpResource']['children'][0]['attributes']['size'] = media.MAX_BYTES + 1
        response = await self.get()
        self.assertEqual(response.status, 413)
        self.assertEqual(len(self.oss_calls), 1)

    async def test_concurrency_queue_and_request_timeout_are_bounded(self):
        slots = self.app[media._SLOTS]
        for _ in range(media.MAX_CONCURRENT):
            await slots.acquire()
        try:
            with patch.object(media, 'QUEUE_TIMEOUT', 0.01):
                response = await self.get()
                self.assertEqual(response.status, 429)
        finally:
            for _ in range(media.MAX_CONCURRENT):
                slots.release()
        async def slow(*args):
            await asyncio.Event().wait()
        with patch.object(media, 'upstream_post', slow), patch.object(media, 'REQUEST_TIMEOUT', 0.02):
            response = await self.get()
            self.assertEqual(response.status, 504)
        self.assertEqual(slots._value, media.MAX_CONCURRENT)

    async def test_disconnect_closes_upstream_and_releases_slot(self):
        self.stream_mode = True
        response = await self.get()
        await asyncio.wait_for(self.started.wait(), 2)
        self.assertEqual(await response.content.read(1), b'a')
        response.close()
        await asyncio.wait_for(self.disconnected.wait(), 2)
        await self.assert_slots_released()

    async def test_total_size_is_checked_for_range_and_chunked_streams(self):
        candidate = resource()
        candidate['attributes'].pop('size')
        self.tree = tree(candidate)
        with patch.object(media, 'MAX_BYTES', 4):
            response = await self.get()
            self.assertEqual(response.status, 413)  # Content-Length, not tree metadata.
            response = await self.get(headers={'Range': 'bytes=0-1'})
            self.assertEqual(response.status, 413)  # Total object size, not range length.
            self.chunked_mode = True
            response = await self.get()
            self.assertEqual(response.status, 200)  # Already sent headers cannot become 413.
            with self.assertRaises(aiohttp.ClientPayloadError):
                await response.read()
        await self.assert_slots_released()

    async def test_midstream_timeout_closes_connection_without_appending_json(self):
        self.stream_mode = True
        with patch.object(media, 'REQUEST_TIMEOUT', 0.05):
            response = await self.get()
            self.assertEqual(await response.content.read(1), b'a')
            with self.assertRaises(aiohttp.ClientPayloadError):
                await response.read()
        await asyncio.wait_for(self.disconnected.wait(), 2)
        await self.assert_slots_released()

    async def test_upstream_exception_cannot_forge_a_safe_error(self):
        error = web.HTTPBadGateway(text='{"code":"dinghai_media_error","error":"test-secret"}')
        with patch.object(media, 'upstream_post', AsyncMock(side_effect=error)):
            response = await self.get()
            self.assertEqual(response.status, 502)
            self.assertNotIn('test-secret', await response.text())

    async def test_network_exceptions_with_signed_urls_are_not_logged_or_returned(self):
        with patch.object(media, '_stream', AsyncMock(side_effect=aiohttp.ClientError('test-secret test-ak sts-token'))):
            with self.assertNoLogs('aiohttp.server', level='ERROR'):
                response = await self.get()
                self.assertEqual(response.status, 502)
                self.assertNotIn('test-', await response.text())


if __name__ == '__main__':
    unittest.main()
