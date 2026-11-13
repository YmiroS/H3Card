"""Creation-agent OSS handoff: temporary ACL/SQLite/files, fake OSS, localhost chat only."""
import asyncio
import base64
import hashlib
from io import BytesIO
import json
import os
from pathlib import Path
import random
import tempfile
import unittest
from unittest import mock

import aiohttp
from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer
from PIL import Image

from server import chat_api, cloud_chat, cloud_images, sr_service
from server.auth import require_project
from server.auth_store import AuthStore
from server.creation_agent_images import CreationAgentImages, local_image_reference
from server.oss_client import OSSClient, OSSError
from server.project_repository import ProjectRepository
from server.resource_access import ResourceAccess


def image_bytes(format='PNG'):
    output = BytesIO()
    Image.new('RGB', (4, 4), 'blue').save(output, format=format)
    return output.getvalue()


def assert_chat_image(test, data, size=None, color=None, *, format='PNG', mode=None):
    test.assertIsInstance(data, bytes)
    with Image.open(BytesIO(data)) as image:
        test.assertEqual(image.format, format)
        allowed_modes = {'PNG': ('RGB', 'RGBA', 'P', 'L', 'LA', '1', 'I', 'I;16'),
                         'JPEG': ('RGB', 'CMYK', 'L'), 'WEBP': ('RGB', 'RGBA')}
        test.assertIn(image.mode, allowed_modes[format])
        if mode is not None:
            test.assertEqual(image.mode, mode)
        test.assertLessEqual(max(image.size), 3840)
        if size is not None:
            test.assertEqual(image.size, size)
        image.load()
        if color is not None:
            sample = image.convert('RGBA' if len(color) == 4 else 'RGB')
            actual = sample.getpixel((image.width // 2, image.height // 2))
            for got, expected in zip(actual, color):
                test.assertLessEqual(abs(got - expected), 12)


def large_original_bytes():
    # A valid PNG followed by padding reproduces the confirmed >20 MiB input
    # boundary without committing a large binary fixture to the repository.
    data = image_bytes()
    return data + b'\0' * (23 * 1024 * 1024 - len(data))


def messages_for(*urls):
    return [{'role': 'user', 'content': [
        {'type': 'image_url', 'image_url': {'url': url, 'detail': 'high'}} for url in urls]}]


class ImageContractTests(unittest.TestCase):
    def test_relative_route_whitelist_is_opt_in(self):
        for value in ('/api/upload/a.png', '/api/artifact/job/a.jpg',
                      '/api/file?filename=a.webp&type=output&subfolder=images',
                      '/api/file?filename=a.png&type=input&subfolder=chouka'):
            with self.subTest(value=value):
                messages = messages_for(value)
                self.assertIs(cloud_chat.validate({'messages': messages}, allow_local_images=True), messages)
                with self.assertRaises(cloud_chat.ChatError):
                    cloud_chat.validate({'messages': messages})

    def test_forged_paths_and_all_absolute_urls_are_rejected(self):
        invalid = ('https://example.invalid/a.png', 'http://localhost/api/upload/a.png',
                   'https://bucket.oss.invalid/a.png?x-oss-signature=secret',
                   'oss://bucket/a.png', '//host/api/upload/a.png', 'chouka/a.png',
                   '/api/preview/a.png/file', '/api/upload/../a.png',
                   '/api/upload/%252e%252e', '/api/upload/a.png?token=secret',
                   '/api/upload/a.png#fragment', '/api/upload/a\\b.png',
                   '/api/artifact/job/nested/a.png', '/api/file?filename=../a.png',
                   '/api/file?filename=a.png&filename=b.png', '/api/file?filename=a.png&url=http://host',
                   '/api/file?filename=a.png&type=secret', '/api/file?filename=a.png&bad',
                   '/api/upload/a\n.png', '/api/file')
        for value in invalid:
            with self.subTest(value=value), self.assertRaises(cloud_chat.ChatError):
                cloud_chat.validate({'messages': messages_for(value)}, allow_local_images=True)

    def test_generic_data_url_unchanged(self):
        value = 'data:image/png;base64,' + base64.b64encode(image_bytes()).decode()
        self.assertEqual(cloud_chat.validate({'messages': messages_for(value)}), messages_for(value))


class PrepareChatImageTests(unittest.TestCase):
    def test_all_supported_formats_are_preserved_without_upscaling(self):
        for format in ('PNG', 'JPEG', 'WEBP'):
            with self.subTest(format=format):
                source = image_bytes(format)
                original = bytes(source)
                result = cloud_chat.prepare_chat_image(source)
                assert_chat_image(self, result, (4, 4), (0, 0, 255), format=format)
                self.assertEqual(source, original)

    def test_large_landscape_and_portrait_preserve_aspect_ratio(self):
        for size, expected in (((4096, 2048), (3840, 1920)),
                               ((1024, 4096), (960, 3840))):
            with self.subTest(size=size):
                source = BytesIO()
                Image.new('RGB', size, (40, 100, 180)).save(source, format='PNG')
                assert_chat_image(self, cloud_chat.prepare_chat_image(source.getvalue()),
                                 expected, (40, 100, 180))

    def test_exif_orientation_is_applied_to_pixels_and_not_applied_twice(self):
        source = Image.new('RGB', (80, 40), 'red')
        source.paste('blue', (40, 0, 80, 40))
        exif = Image.Exif()
        exif[274] = 6  # Rotate 90 degrees clockwise: red above blue.
        encoded = BytesIO()
        source.save(encoded, format='JPEG', exif=exif)
        result = cloud_chat.prepare_chat_image(encoded.getvalue())
        assert_chat_image(self, result, (40, 80), format='JPEG')
        with Image.open(BytesIO(result)) as image:
            self.assertIn(image.getexif().get(274), (None, 1))
            upper = image.getpixel((20, 10))
            lower = image.getpixel((20, 70))
            self.assertGreater(upper[0], 230)
            self.assertLess(upper[2], 20)
            self.assertGreater(lower[2], 230)
            self.assertLess(lower[0], 20)

    def test_png_rgba_and_palette_transparency_are_preserved(self):
        for mode in ('RGBA', 'P'):
            with self.subTest(mode=mode):
                if mode == 'RGBA':
                    image = Image.new('RGBA', (32, 16), (255, 0, 0, 128))
                    image.paste((0, 0, 0, 0), (0, 0, 16, 16))
                else:
                    image = Image.new('P', (32, 16), 0)
                    image.putpalette([0, 0, 0, 255, 0, 0] + [0] * 762)
                    image.info['transparency'] = 0
                    image.paste(1, (16, 0, 32, 16))
                encoded = BytesIO()
                image.save(encoded, format='PNG')
                result = cloud_chat.prepare_chat_image(encoded.getvalue())
                assert_chat_image(self, result, (32, 16))
                with Image.open(BytesIO(result)) as output:
                    rgba = output.convert('RGBA')
                    self.assertEqual(rgba.getpixel((4, 8))[3], 0)
                    expected = (255, 0, 0, 128) if mode == 'RGBA' else (255, 0, 0, 255)
                    self.assertEqual(rgba.getpixel((28, 8)), expected)

    def test_webp_preserves_alpha_without_white_background(self):
        image = Image.new('RGBA', (32, 16), (30, 120, 200, 128))
        image.paste((0, 0, 0, 0), (0, 0, 16, 16))
        encoded = BytesIO()
        image.save(encoded, format='WEBP', lossless=True)
        result = cloud_chat.prepare_chat_image(encoded.getvalue())
        assert_chat_image(self, result, (32, 16), format='WEBP', mode='RGBA')
        with Image.open(BytesIO(result)) as output:
            self.assertEqual(output.getpixel((4, 8))[3], 0)
            self.assertEqual(output.getpixel((28, 8)), (30, 120, 200, 128))

    def test_large_png_is_not_shrunk_to_meet_an_arbitrary_byte_budget(self):
        size = (3840, 1920)
        image = Image.frombytes('RGB', size, random.Random(3840).randbytes(size[0] * size[1] * 3))
        encoded = BytesIO()
        image.save(encoded, format='PNG')
        source = encoded.getvalue()
        self.assertGreater(len(source), 2 * 1024 * 1024)
        result = cloud_chat.prepare_chat_image(source)
        self.assertGreater(len(result), 2 * 1024 * 1024)
        assert_chat_image(self, result, size)
        with Image.open(BytesIO(result)) as output:
            self.assertEqual(output.tobytes(), image.tobytes())


class CreationAgentImagesTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.db_path = self.root / 'auth.db'
        self.store = AuthStore(self.db_path)
        self.addCleanup(self.store.close)
        self.owner = self.store.create_user('image-owner', 'Password-123456')
        self.other = self.store.create_user('image-other', 'Password-123456')
        self.user = self.owner
        self.resources = ResourceAccess(self.store, self.root)
        self.projects = ProjectRepository(self.root / 'projects')
        for pid, owner in (('project-1', self.owner), ('project-2', self.owner), ('private', self.other)):
            self.store.create_project(pid, owner['id'])
            self.projects.create(pid, {'name': pid, 'cards': []})
        self.source = self.add_resource('project-1', 'upload', 'original.wrong', image_bytes())
        self.reference = '/api/upload/original.wrong'
        self.uploads, self.deletes, self.calls, self.path_calls = [], [], [], []
        self.oss_objects, self.oss_reads, self.upload_names = {}, [], []
        self.put_error = None
        self.after_put = None
        self.upload_gate = None
        self.upload_started = asyncio.Event()
        self.config_path = self.root / 'sr-service.json'
        self.config_data = {
            'enabled': False, 'model_id': None, 'gateway': 'not-a-valid-sr-gateway',
            'oss': {'root': 'oss://test-bucket/shared-root', 'endpoint': 'oss-cn-test.aliyuncs.com',
                    'region': 'cn-test', 'access_key_id': 'test-id', 'access_key_secret': 'test-secret'}}
        self.write_config()
        self.enterContext(mock.patch.dict(os.environ, {
            'CHOUKA_SR_CONFIG': str(self.config_path), 'CHOUKA_SR_OSS_ACCESS_KEY_ID': '',
            'CHOUKA_SR_OSS_ACCESS_KEY_SECRET': '', 'CHOUKA_SR_OSS_STS_TOKEN': '',
            'CHOUKA_IMAGE_API_KEY': ''}))
        self.sr_submit = self.enterContext(mock.patch.object(sr_service, 'submit', new=mock.AsyncMock()))
        owner = self

        class FakeOSS(OSSClient):
            async def put_file(self, key, path, content_type='application/octet-stream'):
                owner.upload_started.set()
                if owner.upload_gate:
                    await owner.upload_gate.wait()
                if owner.put_error:
                    raise owner.put_error
                data = Path(path).read_bytes()
                owner.uploads.append((key, data, content_type))
                owner.upload_names.append(Path(path).name)
                owner.oss_objects[key] = data
                if owner.after_put:
                    owner.after_put()

            async def get_bytes(self, key, *, limit):
                owner.oss_reads.append((key, limit))
                if key not in owner.oss_objects:
                    raise AssertionError('Fake OSS may read fixture objects only')
                data = owner.oss_objects[key]
                if len(data) > limit:
                    raise OSSError('Fixture exceeds bounded OSS read')
                return data

            async def delete(self, key):
                owner.deletes.append(key)
                raise AssertionError('Assistant objects must never be deleted')

        self.fake_client = FakeOSS
        self.registry = self.new_registry()
        self.gateway_status = 200
        self.view_calls = []

        async def view(request):
            self.view_calls.append(dict(request.query))
            return web.Response(body=image_bytes('WEBP'), content_type='image/webp')

        async def gateway(request):
            payload = await request.json()
            self.calls.append(payload)
            if self.gateway_status != 200:
                image_url = payload['messages'][0]['content'][0]['image_url']['url']
                return web.json_response(
                    {'error': {'message': 'Invalid image URL: ' + image_url + '; key=fake-chat-key',
                               'param': 'image_url', 'code': 'invalid_image_url'}},
                    status=self.gateway_status, headers={'X-Request-ID': 'assistant-image-error'})
            if payload.get('stream'):
                return web.Response(body=b'data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n',
                                    content_type='text/event-stream')
            return web.json_response({'choices': [{'message': {'content': 'ok'}}]})

        upstream = web.Application()
        upstream.router.add_post('/v1/chat/completions', gateway)
        upstream.router.add_get('/view', view)
        self.upstream = TestServer(upstream)
        await self.upstream.start_server()
        self.addAsyncCleanup(self.upstream.close)
        cloud_config = self.root / 'cloud.json'
        cloud_config.write_text(json.dumps({'base_url': str(self.upstream.make_url('/v1')), 'api_key': 'fake-chat-key'}))
        self.enterContext(mock.patch.object(cloud_images, 'CONF', cloud_config))
        self.session = aiohttp.ClientSession(trust_env=False)
        self.addAsyncCleanup(self.session.close)

        @web.middleware
        async def auth(request, handler):
            request['user'] = self.user
            return await handler(request)

        self.application = web.Application(middlewares=[auth])
        self.application.update(session=self.session, auth_store=self.store, resource_access=self.resources,
                                project_repository=self.projects, creation_agent_images=self.registry)
        chat_api.register_chat_routes(self.application)
        self.client = TestClient(TestServer(self.application))
        await self.client.start_server()
        self.addAsyncCleanup(self.client.close)

    async def asyncTearDown(self):
        self.assertEqual(self.deletes, [])
        self.sr_submit.assert_not_called()

    def write_config(self):
        self.config_path.write_text(json.dumps(self.config_data), encoding='utf-8')

    def add_resource(self, pid, kind, locator, data):
        self.resources.register(pid, kind, locator)
        target = self.resources.local_path(kind, locator)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        return target

    async def resolve_path(self, request, value, project_id):
        await require_project(request, project_id, operate=True)
        ref = self.resources.reference(value)
        if not self.resources.authorize(request['user']['id'], *ref, project_id=project_id):
            raise web.HTTPNotFound()
        self.path_calls.append(value)
        return self.resources.local_path(*ref)

    def new_registry(self, store=None, resources=None, resolve_path=None):
        return CreationAgentImages(store or self.store, resources or self.resources,
                                   resolve_path or self.resolve_path, client_factory=self.fake_client)

    def seed_legacy_cache(self, data):
        oss = sr_service.load_oss_config()['oss']
        destination = json.dumps([oss.endpoint, oss.bucket, oss.prefix], separators=(',', ':'))
        resource_id = self.resources.lookup('upload', self.source.name)['resource_id']
        digest = hashlib.sha256(data).hexdigest()
        key = oss.prefix + '/creation-agent-images/' + hashlib.sha256(b'project-1').hexdigest() + '/' + digest + '.png'
        row = ('project-1', resource_id, destination, key, digest, 'image/png')
        with self.store._tx():
            self.store.db.execute('INSERT INTO creation_agent_images VALUES (?,?,?,?,?,?)', row)
        self.oss_objects[key] = data
        return dict(self.store.db.execute('SELECT * FROM creation_agent_images').fetchone())

    def assert_uploaded_image(self, index=0, size=(4, 4), color=(0, 0, 255), *, format='PNG', mode=None):
        key, data, mime = self.uploads[index]
        assert_chat_image(self, data, size, color, format=format, mode=mode)
        extension, expected_mime = {'PNG': ('.png', 'image/png'), 'JPEG': ('.jpg', 'image/jpeg'),
                                    'WEBP': ('.webp', 'image/webp')}[format]
        self.assertEqual(mime, expected_mime)
        digest = hashlib.sha256(data).hexdigest()
        self.assertTrue(key.endswith('/' + digest + extension))
        self.assertEqual(self.upload_names[index], digest + extension)
        self.assertIn('/chat-image-3840-original-v3/', key)
        return key, data

    async def post(self, urls=None, *, project_id='project-1', scene='creation_agent', stream=False):
        return await self.client.post('/api/chat/completions', json={
            'messages': messages_for(*(urls if urls is not None else [self.reference])), 'stream': stream,
            'billing_context': {'scene': scene, 'project_id': project_id}})

    def request(self):
        request = mock.Mock()
        request.app = self.application
        request.__getitem__ = mock.Mock(side_effect=lambda key: self.user if key == 'user' else None)
        request.get = lambda key, default=None: self.user if key == 'user' else default
        return request

    async def test_authorized_upload_forwards_signed_url_actual_mime_and_history(self):
        artifact = '/api/artifact/job/image.jpg'
        self.add_resource('project-1', 'artifact', 'job/image.jpg', image_bytes('JPEG'))
        body = {'messages': messages_for(self.reference) + [{'role': 'assistant', 'content': 'history'}]
                + messages_for(artifact, self.reference),
                'billing_context': {'scene': 'creation_agent', 'project_id': 'project-1'}}
        response = await self.client.post('/api/chat/completions', json=body)
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(len(self.uploads), 2)
        key, data = self.assert_uploaded_image()
        self.assert_uploaded_image(1, format='JPEG')
        self.assertEqual(self.source.read_bytes(), image_bytes())
        self.assertEqual(self.resources.local_path('artifact', 'job/image.jpg').read_bytes(), image_bytes('JPEG'))
        self.assertEqual(key, 'shared-root/creation-agent-images/chat-image-3840-original-v3/'
                         + hashlib.sha256(b'project-1').hexdigest()
                         + '/' + hashlib.sha256(data).hexdigest() + '.png')
        sent = self.calls[0]['messages']
        signed = sent[0]['content'][0]['image_url']
        self.assertTrue(signed['url'].startswith('https://test-bucket.oss-cn-test.aliyuncs.com/'))
        self.assertIn('x-oss-signature=', signed['url'])
        self.assertEqual(signed['detail'], 'high')
        self.assertEqual(signed, sent[2]['content'][1]['image_url'])
        self.assertNotIn('data:', json.dumps(sent))
        self.assertEqual(body['messages'][0]['content'][0]['image_url']['url'], self.reference)
        self.assertNotIn('billing_context', self.calls[0])
        persisted = [dict(row) for row in self.store.db.execute('SELECT * FROM creation_agent_images')]
        self.assertNotIn('x-oss-', str(persisted))
        self.assertNotIn('test-secret', str(persisted))
        self.assertNotIn('https:', str(persisted))
        self.assertEqual(len(persisted), 2)
        uploaded_by_key = {key: (data, mime) for key, data, mime in self.uploads}
        for row in persisted:
            self.assertEqual(json.loads(row['destination']), [
                'oss-cn-test.aliyuncs.com', 'test-bucket', 'shared-root', 'chat-image-3840-original-v3'])
            uploaded_data, mime = uploaded_by_key[row['object_key']]
            self.assertEqual(row['content_sha256'], hashlib.sha256(uploaded_data).hexdigest())
            self.assertEqual(row['mime'], mime)
        self.assertEqual(self.oss_reads, [])

    async def test_historical_and_current_local_images_are_both_resized_visual_copies(self):
        encoded = BytesIO()
        Image.new('RGB', (4096, 1024), (30, 160, 80)).save(encoded, format='PNG')
        original = encoded.getvalue()
        self.source.write_bytes(original)
        current_data = BytesIO()
        Image.new('RGBA', (40, 80), (0, 0, 0, 0)).save(current_data, format='PNG')
        current = self.add_resource('project-1', 'upload', 'current.png', current_data.getvalue())
        body = {'messages': messages_for(self.reference)
                + [{'role': 'assistant', 'content': 'history'}]
                + messages_for('/api/upload/current.png'),
                'billing_context': {'scene': 'creation_agent', 'project_id': 'project-1'}}
        response = await self.client.post('/api/chat/completions', json=body)
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(len(self.uploads), 2)
        self.assert_uploaded_image(0, (3840, 960), (30, 160, 80))
        self.assert_uploaded_image(1, (40, 80), (0, 0, 0, 0), mode='RGBA')
        self.assertEqual(self.source.read_bytes(), original)
        self.assertEqual(current.read_bytes(), current_data.getvalue())
        for index, message_index in enumerate((0, 2)):
            url = self.calls[0]['messages'][message_index]['content'][0]['image_url']['url']
            self.assertIn(self.uploads[index][0], url)
        self.assertEqual(self.oss_reads, [])

    async def test_comfy_file_reference_and_upload_alias_deduplicate(self):
        comfy = '/api/file?filename=render.webp&type=output&subfolder=images'
        ref = local_image_reference(comfy)
        self.add_resource('project-1', *ref, image_bytes('WEBP'))
        alias = '/api/file?filename=original.wrong&subfolder=chouka&type=input'
        response = await self.post([self.reference, alias, comfy])
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(len(self.uploads), 2)
        sent = self.calls[0]['messages'][0]['content']
        self.assertEqual(sent[0]['image_url']['url'], sent[1]['image_url']['url'])
        self.assert_uploaded_image(0)
        self.assert_uploaded_image(1, format='WEBP')
        self.assertEqual(self.resources.local_path(*ref).read_bytes(), image_bytes('WEBP'))

    async def test_restart_resigns_with_rotated_credentials_without_original(self):
        self.assertEqual((await self.post()).status, 200)
        initial = self.calls[0]['messages'][0]['content'][0]['image_url']['url']
        self.source.unlink()
        reopened = AuthStore(self.db_path)
        self.addCleanup(reopened.close)
        resources = ResourceAccess(reopened, self.root)
        resolve = mock.AsyncMock(side_effect=AssertionError('Cached mapping must not need source'))
        registry = self.new_registry(reopened, resources, resolve)
        self.config_data['oss'].update(access_key_id='rotated-id', access_key_secret='rotated-secret',
                                       security_token='rotated-token')
        self.write_config()
        result = await registry.prepare(self.request(), 'project-1', messages_for(self.reference))
        signed = result[0]['content'][0]['image_url']['url']
        self.assertNotEqual(signed, initial)
        self.assertIn('rotated-id', signed)
        self.assertIn('rotated-token', signed)
        self.assertEqual(len(self.uploads), 1)
        resolve.assert_not_awaited()
        self.assertEqual((await self.post()).status, 200)
        self.assertEqual(len(self.uploads), 1)
        self.assertEqual(self.oss_reads, [])
        self.assertEqual(self.store.db.execute('SELECT count(*) FROM creation_agent_images').fetchone()[0], 1)

    async def test_legacy_large_original_migrates_without_local_source_and_reuses_across_restart(self):
        original = large_original_bytes()
        self.assertGreater(len(original), 20 * 1024 * 1024)
        with Image.open(BytesIO(original)) as image:
            image.verify()
        legacy = self.seed_legacy_cache(original)
        self.source.unlink()
        resolve = mock.AsyncMock(side_effect=AssertionError('Legacy migration must use OSS, not local source'))
        self.registry.resolve_path = resolve

        response = await self.post()
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(self.oss_reads, [(legacy['object_key'], cloud_images.MAX_IMAGE_BYTES)])
        self.assertEqual(len(self.uploads), 1)
        key, data = self.assert_uploaded_image()
        self.assertNotEqual(key, legacy['object_key'])
        self.assertIn(key, self.calls[0]['messages'][0]['content'][0]['image_url']['url'])
        self.assertEqual(self.oss_objects[legacy['object_key']], original)
        self.assertEqual(set(self.oss_objects), {legacy['object_key'], key})
        self.assertNotEqual(data, original)
        persisted = [dict(row) for row in self.store.db.execute('SELECT * FROM creation_agent_images')]
        self.assertEqual(len(persisted), 2)
        self.assertIn(legacy, persisted)
        new = next(row for row in persisted if row['destination'] != legacy['destination'])
        self.assertEqual(json.loads(new['destination']), json.loads(legacy['destination']) + ['chat-image-3840-original-v3'])
        self.assertEqual(new['object_key'], key)
        self.assertEqual(new['content_sha256'], hashlib.sha256(data).hexdigest())
        self.assertEqual(new['mime'], 'image/png')

        response = await self.post()
        self.assertEqual(response.status, 200, await response.text())
        self.assertIn(key, self.calls[-1]['messages'][0]['content'][0]['image_url']['url'])
        reopened = AuthStore(self.db_path)
        self.addCleanup(reopened.close)
        registry = self.new_registry(reopened, ResourceAccess(reopened, self.root), resolve)
        self.config_data['oss'].update(access_key_id='rotated-id', access_key_secret='rotated-secret',
                                       security_token='rotated-token')
        self.write_config()
        result = await registry.prepare(self.request(), 'project-1', messages_for(self.reference))
        signed = result[0]['content'][0]['image_url']['url']
        self.assertIn(key, signed)
        self.assertIn('rotated-id', signed)
        self.assertIn('rotated-token', signed)
        resolve.assert_not_awaited()
        self.assertFalse(self.source.exists())
        self.assertEqual(len(self.uploads), 1)
        self.assertEqual(self.oss_reads, [(legacy['object_key'], cloud_images.MAX_IMAGE_BYTES)])
        self.assertEqual(self.oss_objects[legacy['object_key']], original)
        self.assertCountEqual([dict(row) for row in reopened.db.execute('SELECT * FROM creation_agent_images')], persisted)

        self.user = self.other
        self.store.set_grant(self.other['id'], self.owner['id'], 'operate')
        self.store.delete_grant(self.other['id'], self.owner['id'])
        self.assertEqual((await self.post()).status, 404)
        self.assertEqual(self.oss_reads, [(legacy['object_key'], cloud_images.MAX_IMAGE_BYTES)])
        self.assertEqual(len(self.calls), 2)

    async def test_legacy_cache_rechecks_permissions_before_any_oss_get(self):
        legacy = self.seed_legacy_cache(image_bytes())
        self.source.unlink()
        self.user = self.other
        self.store.set_grant(self.other['id'], self.owner['id'], 'operate')
        self.store.delete_grant(self.other['id'], self.owner['id'])
        self.assertEqual((await self.post()).status, 404)
        self.store.set_grant(self.other['id'], self.owner['id'], 'read')
        self.assertEqual((await self.post()).status, 403)
        self.user = self.owner
        self.assertEqual((await self.post(project_id='project-2')).status, 404)
        self.assertEqual((await self.post([self.reference, '/api/upload/forged.png'])).status, 404)
        with self.store._tx():
            self.store.db.execute('DELETE FROM project_resources WHERE project_id=?', ('project-1',))
        self.assertEqual((await self.post()).status, 404)
        self.assertEqual(self.oss_reads, [])
        self.assertEqual(self.path_calls, [])
        self.assertEqual(self.uploads, [])
        self.assertEqual(self.calls, [])
        self.assertEqual(self.oss_objects, {legacy['object_key']: image_bytes()})
        self.assertEqual([dict(row) for row in self.store.db.execute('SELECT * FROM creation_agent_images')], [legacy])

    async def test_each_destination_component_invalidates_mapping_but_ak_does_not(self):
        self.assertEqual((await self.post()).status, 200)
        for key, value in (('root', 'oss://test-bucket/new-prefix'),
                           ('root', 'oss://other-bucket/new-prefix'),
                           ('endpoint', 'oss-cn-another.aliyuncs.com')):
            self.config_data['oss'][key] = value
            self.write_config()
            response = await self.post()
            self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(len(self.uploads), 4)
        self.assertEqual(self.store.db.execute('SELECT count(*) FROM creation_agent_images').fetchone()[0], 4)

    async def test_repeated_and_concurrent_requests_upload_once(self):
        responses = await asyncio.gather(*(self.post([self.reference] * 3) for _ in range(4)))
        for response in responses:
            self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(len(self.uploads), 1)
        self.assertEqual(len(self.path_calls), 1)
        self.assertEqual(len(self.calls), 4)
        self.assertEqual(self.oss_reads, [])
        self.assertEqual(self.store.db.execute('SELECT count(*) FROM creation_agent_images').fetchone()[0], 1)

    async def test_crossproject_and_unregistered_refs_denied_including_cached_hit(self):
        self.assertEqual((await self.post()).status, 200)
        before = len(self.calls)
        for urls, pid in (([self.reference], 'project-2'), (['/api/upload/forged.png'], 'project-1')):
            response = await self.post(urls, project_id=pid)
            self.assertEqual(response.status, 404)
        with self.store._tx():
            self.store.db.execute('DELETE FROM project_resources WHERE project_id=?', ('project-1',))
        self.assertEqual((await self.post()).status, 404)
        self.assertEqual(len(self.calls), before)
        self.assertEqual(len(self.uploads), 1)

    async def test_cached_hit_rechecks_current_project_permission(self):
        self.assertEqual((await self.post()).status, 200)
        self.user = self.other
        self.assertEqual((await self.post()).status, 404)
        self.store.set_grant(self.other['id'], self.owner['id'], 'read')
        self.assertEqual((await self.post()).status, 403)
        self.store.set_grant(self.other['id'], self.owner['id'], 'operate')
        self.assertEqual((await self.post()).status, 200)
        self.store.delete_grant(self.other['id'], self.owner['id'])
        self.assertEqual((await self.post()).status, 404)
        self.assertEqual(len(self.uploads), 1)
        self.assertEqual(len(self.calls), 2)

    async def test_authorize_all_refs_before_any_upload(self):
        response = await self.post([self.reference, '/api/upload/forged.png'])
        self.assertEqual(response.status, 404)
        self.assertEqual(self.uploads, [])
        self.assertEqual(self.path_calls, [])
        self.assertEqual(self.calls, [])

    async def test_no_operate_permission_prevents_upload(self):
        self.user = self.other
        self.store.set_grant(self.other['id'], self.owner['id'], 'read')
        self.assertEqual((await self.post()).status, 403)
        self.assertEqual(self.uploads, [])
        self.assertEqual(self.path_calls, [])

    async def test_revocation_during_upload_prevents_dispatch_but_retains_object(self):
        self.user = self.other
        self.store.set_grant(self.other['id'], self.owner['id'], 'operate')
        self.after_put = lambda: self.store.delete_grant(self.other['id'], self.owner['id'])
        self.assertEqual((await self.post()).status, 404)
        self.assertEqual(self.calls, [])
        self.assertEqual(len(self.uploads), 1)
        self.assertEqual(self.store.db.execute('SELECT count(*) FROM creation_agent_images').fetchone()[0], 1)

    async def test_revocation_during_billing_is_rechecked_before_dispatch(self):
        self.user = self.other
        self.store.set_grant(self.other['id'], self.owner['id'], 'operate')
        ledger = mock.Mock()
        ledger.bind_attribution.side_effect = lambda *args: self.store.delete_grant(
            self.other['id'], self.owner['id'])
        original_get = self.application.get
        with mock.patch.object(self.application, 'get', side_effect=lambda key, default=None:
                               ledger if key == 'costs' else original_get(key, default)):
            self.assertEqual((await self.post()).status, 404)
        self.assertEqual(self.calls, [])
        self.assertEqual(len(self.uploads), 1)

    async def test_static_image_boundary_and_actual_bytes_not_suffix(self):
        invalid = [b'not an image', image_bytes('GIF')]
        animated = BytesIO()
        Image.new('RGB', (4, 4), 'red').save(animated, format='PNG', save_all=True,
            append_images=[Image.new('RGB', (4, 4), 'blue')], duration=100, loop=0)
        invalid.append(animated.getvalue())
        for data in invalid:
            self.source.write_bytes(data)
            response = await self.post()
            self.assertEqual(response.status, 422, await response.text())
        self.assertEqual(self.uploads, [])
        self.assertEqual(self.calls, [])

    async def test_original_above_twenty_mib_is_processed_with_existing_sixty_four_mib_safety(self):
        data = large_original_bytes()
        self.assertGreater(len(data), 20 * 1024 * 1024)
        with Image.open(BytesIO(data)) as original:
            original.verify()
        self.source.write_bytes(data)
        response = await self.post()
        self.assertEqual(response.status, 200, await response.text())
        self.assert_uploaded_image()
        self.assertEqual(self.source.read_bytes(), data)
        self.assertEqual(self.oss_reads, [])
        # Exercise the exact existing byte/pixel boundaries without large fixtures.
        second = self.add_resource('project-1', 'upload', 'too-big.png', image_bytes())
        with mock.patch.object(cloud_images, 'MAX_IMAGE_BYTES', 10):
            self.assertEqual((await self.post(['/api/upload/' + second.name])).status, 422)
        with mock.patch.object(cloud_images, 'MAX_PIXELS', 10):
            self.assertEqual((await self.post(['/api/upload/' + second.name])).status, 422)
        self.assertEqual(len(self.uploads), 1)

    async def test_snapshot_is_immutable_when_source_changes_during_transfer(self):
        original = self.source.read_bytes()
        self.upload_gate = asyncio.Event()
        task = asyncio.create_task(self.post())
        try:
            await asyncio.wait_for(self.upload_started.wait(), 3)
            replacement = BytesIO()
            Image.new('RGB', (4, 4), 'red').save(replacement, format='JPEG')
            self.source.write_bytes(replacement.getvalue())
            self.upload_gate.set()
            response = await task
            self.assertEqual(response.status, 200, await response.text())
        finally:
            self.upload_gate.set()
            await asyncio.gather(task, return_exceptions=True)
        self.assert_uploaded_image()
        with Image.open(BytesIO(original)) as before, Image.open(BytesIO(self.uploads[0][1])) as uploaded:
            self.assertEqual(uploaded.convert('RGB').tobytes(), before.convert('RGB').tobytes())
        self.assertEqual(self.source.read_bytes(), replacement.getvalue())

    async def test_config_missing_safe_503_and_no_base64_fallback_including_cached(self):
        self.assertEqual((await self.post()).status, 200)
        for content in (None, '{', '[]', '{}'):
            if content is None:
                self.config_path.unlink(missing_ok=True)
            else:
                self.config_path.write_text(content)
            response = await self.post()
            self.assertEqual(response.status, 503, await response.text())
            self.assertNotIn('test-secret', await response.text())
        self.assertEqual(len(self.uploads), 1)
        self.assertEqual(len(self.calls), 1)

    async def test_oss_config_independent_of_disabled_or_invalid_sr_model(self):
        self.assertFalse(sr_service.configured())
        self.assertEqual(sr_service.load_oss_config()['oss'].prefix, 'shared-root')
        self.assertEqual((await self.post()).status, 200)
        self.config_data.update(enabled=True, model_id=None)
        self.write_config()
        self.assertFalse(sr_service.configured())
        with mock.patch.dict(os.environ, {'CHOUKA_SR_OSS_ACCESS_KEY_ID': 'environment-id'}):
            self.assertEqual(sr_service.load_oss_config()['oss'].access_key_id, 'environment-id')
            self.assertEqual((await self.post()).status, 200)
        self.assertEqual(len(self.uploads), 1)

    async def test_missing_source_and_upload_errors_are_safe_without_provider_call(self):
        self.source.unlink()
        response = await self.post()
        self.assertEqual(response.status, 404)
        self.source.write_bytes(image_bytes())
        for error in (OSSError('https://private/?x-oss-signature=token'),
                      RuntimeError('test-secret private-token')):
            self.put_error = error
            response = await self.post()
            self.assertEqual(response.status, 502)
            text = await response.text()
            for secret in ('https://', 'x-oss-', 'test-secret', 'private-token'):
                self.assertNotIn(secret, text)
        self.assertEqual(self.calls, [])

    async def test_done_and_upstream_error_keep_same_object_and_stream_works(self):
        self.assertEqual((await self.post()).status, 200)
        self.gateway_status = 500
        with self.assertLogs(cloud_chat.__name__, level='WARNING') as logs:
            response = await self.post()
        self.assertEqual(response.status, 502)
        result = await response.json()
        self.assertEqual(result['request_id'], 'assistant-image-error')
        self.assertFalse(result['retryable'])
        self.assertIn('HTTP 500', result['error'])
        self.assertIn('status=500', ' '.join(logs.output))
        for text in (result['error'], ' '.join(logs.output)):
            for detail in ('Invalid image URL', 'param=image_url', 'invalid_image_url',
                           'assistant-image-error'):
                self.assertIn(detail, text)
            for secret in ('fake-chat-key', 'https://', 'x-oss-', 'test-bucket'):
                self.assertNotIn(secret, text)
        self.assertEqual(len(self.calls), 2)
        self.gateway_status = 200
        response = await self.post(stream=True)
        self.assertEqual(response.status, 200)
        self.assertIn(b'[DONE]', await response.read())
        self.assertTrue(self.calls[-1]['messages'][0]['content'][0]['image_url']['url'].startswith('https://'))
        self.assertEqual(len(self.uploads), 1)

    async def test_cancellation_never_deletes_uploaded_object(self):
        entered = asyncio.Event()
        async def canceled_complete(*args, **kwargs):
            entered.set()
            await asyncio.Future()
        body = {'messages': messages_for(self.reference),
                'billing_context': {'scene': 'creation_agent', 'project_id': 'project-1'}}
        class Content:
            async def iter_chunked(self, size):
                yield json.dumps(body).encode()
        request = self.request()
        request.content_type = 'application/json'
        request.content = Content()
        with mock.patch.object(cloud_chat, 'complete', side_effect=canceled_complete):
            task = asyncio.create_task(chat_api.completions(request))
            await asyncio.wait_for(entered.wait(), 3)
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task
        self.assertEqual(len(self.uploads), 1)
        self.assertEqual(self.store.db.execute('SELECT count(*) FROM creation_agent_images').fetchone()[0], 1)
        self.assertEqual((await self.post()).status, 200)
        self.assertEqual(len(self.uploads), 1)

    async def test_text_only_creation_does_not_check_oss_or_require_operate(self):
        self.user = self.other
        self.store.set_grant(self.other['id'], self.owner['id'], 'read')
        self.config_path.unlink()
        body = {'messages': [{'role': 'user', 'content': 'plan this scene'}],
                'billing_context': {'scene': 'creation_agent', 'project_id': 'project-1'}}
        with mock.patch.object(self.registry, 'prepare', side_effect=AssertionError('No image work')):
            response = await self.client.post('/api/chat/completions', json=body)
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(self.calls[0]['messages'], body['messages'])
        self.assertEqual(self.uploads, [])

    async def test_cancel_during_upload_retains_source_and_never_deletes(self):
        self.upload_gate = asyncio.Event()
        task = asyncio.create_task(self.registry.prepare(self.request(), 'project-1', messages_for(self.reference)))
        try:
            await asyncio.wait_for(self.upload_started.wait(), 3)
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task
        finally:
            self.upload_gate.set()
            await asyncio.gather(task, return_exceptions=True)
        self.assertTrue(self.source.is_file())
        self.assertFalse(self.registry.upload_lock.locked())
        self.assertEqual((await self.post()).status, 200)
        self.assertEqual(len(self.uploads), 1)

    async def test_real_app_callback_authorizes_comfy_fetch_and_cache_reuse(self):
        from server import app as backend_app
        self.registry.resolve_path = backend_app.creation_agent_image_path
        url = '/api/file?filename=render.webp&subfolder=frames&type=output'
        ref = self.resources.reference(url)
        self.resources.register('project-1', *ref)
        with mock.patch.object(backend_app, 'COMFY_HTTP', str(self.upstream.make_url('')).rstrip('/')):
            response = await self.post([url])
            self.assertEqual(response.status, 200, await response.text())
            self.assertEqual(self.view_calls, [{'filename': 'render.webp', 'subfolder': 'frames', 'type': 'output'}])
            self.resources.local_path(*ref).unlink()
            self.assertEqual((await self.post([url])).status, 200)
            self.assertEqual(len(self.view_calls), 1)
            self.assertEqual((await self.post([url], project_id='project-2')).status, 404)
            self.assertEqual(len(self.view_calls), 1)
        self.assert_uploaded_image(format='WEBP')
        self.assertEqual(len(self.uploads), 1)

    async def test_real_app_callback_rechecks_permission_after_comfy_fetch(self):
        from server import app as backend_app
        self.registry.resolve_path = backend_app.creation_agent_image_path
        self.user = self.other
        self.store.set_grant(self.other['id'], self.owner['id'], 'operate')
        url = '/api/file?filename=render.png&type=output'
        self.resources.register('project-1', *self.resources.reference(url))
        async def revoke(*args):
            self.store.delete_grant(self.other['id'], self.owner['id'])
        with mock.patch.object(backend_app, 'cache_comfy_outputs', side_effect=revoke):
            self.assertEqual((await self.post([url])).status, 404)
        self.assertEqual(self.uploads, [])
        self.assertEqual(self.calls, [])

    async def test_app_startup_initializes_registry_without_loading_oss_config(self):
        from server import app as backend_app
        application = web.Application()
        application.update(lifecycle={}, auth_path=self.db_path, admin_sandbox=True, local_test=False)
        # Sandbox startup opens only temporary SQLite; no tasks or external connections.
        with mock.patch.object(backend_app, 'ROOT', self.root):
            await backend_app.on_start(application)
        try:
            self.assertIsInstance(application['creation_agent_images'], CreationAgentImages)
            self.assertIs(application['creation_agent_images'].resources, application['resource_access'])
            self.assertTrue(application['auth_store'].db.execute(
                "SELECT name FROM sqlite_master WHERE name='creation_agent_images'").fetchone())
        finally:
            await application['session'].close()
            application['auth_store'].close()

    async def test_local_images_only_for_validated_creation_scene_and_project(self):
        for scene in ('chat', 'reference_analysis'):
            response = await self.post(scene=scene)
            self.assertEqual(response.status, 400)
        body = {'messages': messages_for(self.reference), 'billing_context': {'scene': 'creation_agent'}}
        self.assertEqual((await self.client.post('/api/chat/completions', json=body)).status, 400)
        body['billing_context'] = {'scene': 'creation_agent', 'project_id': 'project-1', 'extra': True}
        self.assertEqual((await self.client.post('/api/chat/completions', json=body)).status, 400)
        response = await self.post(['https://test-bucket.oss.invalid/a.png'])
        self.assertEqual(response.status, 400)
        self.assertEqual(self.uploads, [])
        self.assertEqual(self.calls, [])
