import asyncio
import base64
from io import BytesIO
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock

import aiohttp
from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer
from PIL import Image

from server import cloud_chat, cloud_images
from server.chat_api import register_chat_routes


class ChatTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.config = Path(temporary.name) / 'config.json'
        self.enterContext(mock.patch.object(cloud_images, 'CONF', self.config))
        self.enterContext(mock.patch.dict(os.environ, {'CHOUKA_IMAGE_API_KEY': ''}))
        self.calls = []
        self.end_user_headers = []
        self.user = {'enabled': True, 'username': 'chat-test-user',
                     'display_name': 'Chat Display Only', 'phone': '13800138000'}
        self.status = 200
        self.stream_chunks = None
        self.stream_gate = None
        self.payload = {'choices': [{'message': {'content': 'hello'}}], 'usage': {'total_tokens': 10}, 'cost': 99}
        async def gateway(request):
            self.calls.append((await request.json(), request.headers.get('Authorization')))
            self.end_user_headers.append((request.headers.get('X-End-User-Name'),
                                          request.headers.get('X-End-User-Phone')))
            if self.stream_chunks is not None and self.status == 200:
                response = web.StreamResponse(headers={'Content-Type': 'text/event-stream'})
                await response.prepare(request)
                for index, chunk in enumerate(self.stream_chunks):
                    await response.write(chunk)
                    if index == 0 and self.stream_gate is not None:
                        await self.stream_gate.wait()
                await response.write_eof()
                return response
            return web.json_response(self.payload, status=self.status, headers={'X-Request-ID': 'req-1'})
        upstream = web.Application(client_max_size=cloud_chat.MAX_REQUEST_BYTES)
        upstream.router.add_post('/v1/chat/completions', gateway)
        self.server = TestServer(upstream)
        await self.server.start_server()
        self.addAsyncCleanup(self.server.close)
        self.config.write_text(json.dumps({'base_url': str(self.server.make_url('/v1')), 'api_key': 'fake-secret', 'model': 'image-only'}))
        self.session = aiohttp.ClientSession(trust_env=False)
        self.addAsyncCleanup(self.session.close)
        self.authenticated = True
        @web.middleware
        async def auth(request, handler):
            if self.authenticated:
                request['user'] = self.user
            return await handler(request)
        app = web.Application(middlewares=[auth])
        app['session'] = self.session
        register_chat_routes(app)
        self.client = TestClient(TestServer(app))
        await self.client.start_server()
        self.addAsyncCleanup(self.client.close)

    async def post(self, body, **kwargs):
        return await self.client.post('/api/chat/completions', json=body, **kwargs)

    async def test_text_and_history_whitelist(self):
        messages = [{'role': 'system', 'content': 'be helpful'}, {'role': 'user', 'content': 'hi'},
                    {'role': 'assistant', 'content': 'hello'}, {'role': 'user', 'content': 'again'}]
        response = await self.post({'messages': messages})
        self.assertEqual(response.status, 200)
        self.assertEqual(await response.json(), {'content': 'hello', 'model': 'gpt-4o', 'request_id': 'req-1'})
        self.assertEqual(self.calls, [({'messages': messages, 'model': 'gpt-4o', 'stream': False}, 'Bearer fake-secret')])
        self.assertEqual(self.end_user_headers, [('chat-test-user', '13800138000')])

    async def test_explicit_false_keeps_json_and_true_streams_sse(self):
        messages = [{'role': 'user', 'content': 'hi'}]
        response = await self.post({'messages': messages, 'stream': False})
        self.assertEqual(await response.json(), {'content': 'hello', 'model': 'gpt-4o', 'request_id': 'req-1'})
        self.assertFalse(self.calls[-1][0]['stream'])
        self.stream_chunks = [b'data: {"choices":[{"delta":{"content":"',
                              '你'.encode('utf-8')[:1], '你'.encode('utf-8')[1:],
                              b'"}}]}\n\n', b'data: [DONE]\n\n']
        response = await self.post({'messages': messages, 'stream': True})
        self.assertEqual(response.status, 200)
        self.assertEqual(response.content_type, 'text/event-stream')
        self.assertEqual(response.headers['Cache-Control'], 'no-cache, no-transform')
        self.assertEqual(await response.read(), b''.join(self.stream_chunks))
        self.assertTrue(self.calls[-1][0]['stream'])
        self.assertEqual(self.end_user_headers[-1], ('chat-test-user', '13800138000'))

    async def test_stream_forwards_before_upstream_finishes(self):
        first = b'data: {"choices":[{"delta":{"content":"hello"}}]}\n\n'
        self.stream_chunks = [first, b'data: [DONE]\n\n']
        self.stream_gate = asyncio.Event()
        try:
            response = await self.post({'messages': [{'role': 'user', 'content': 'hi'}], 'stream': True})
            self.assertEqual(await asyncio.wait_for(response.content.readexactly(len(first)), 2), first)
            self.assertFalse(self.stream_gate.is_set())
            self.stream_gate.set()
            self.assertEqual(await response.read(), self.stream_chunks[1])
        finally:
            self.stream_gate.set()

    async def test_stream_failure_before_headers_and_after_start(self):
        messages = [{'role': 'user', 'content': 'hi'}]
        response = await self.post({'messages': messages, 'stream': True})
        self.assertEqual(response.status, 502)
        self.assertNotIn('fake-secret', await response.text())
        self.stream_chunks = [b'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n', b'data: [DONE]\n\n']
        with mock.patch.object(cloud_chat, 'MAX_RESPONSE_BYTES', len(self.stream_chunks[0])):
            response = await self.post({'messages': messages, 'stream': True})
            body = await response.text()
        self.assertIn('event: error\n', body)
        self.assertNotIn('data: [DONE]', body)
        self.assertIn('"retryable": false', body)

    async def test_stream_ignores_usage_and_rejects_missing_done(self):
        self.stream_chunks = [b'data: {"choices":[],"usage":{"cost":"private"}}\r\n\r\n',
                              b'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\r\n\r\n',
                              b'data: [DONE]\r\n\r\n']
        response = await self.post({'messages': [{'role': 'user', 'content': 'hi'}], 'stream': True})
        text = await response.text()
        self.assertIn('"finish_reason":"stop"', text)
        self.assertNotIn('private', text)
        self.assertIn('data: [DONE]', text)
        self.stream_chunks = [b'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n']
        response = await self.post({'messages': [{'role': 'user', 'content': 'hi'}], 'stream': True})
        self.assertIn('event: error', await response.text())

    async def test_stream_filters_upstream_error_details(self):
        self.stream_chunks = [b'event: error\ndata: {"error":"fake-secret"}\n\n']
        response = await self.post({'messages': [{'role': 'user', 'content': 'hi'}], 'stream': True})
        self.assertEqual(response.status, 200)
        body = await response.text()
        self.assertIn('event: error', body)
        self.assertNotIn('fake-secret', body)
        self.assertNotIn('data: [DONE]', body)

    async def test_identity_is_per_authenticated_user_not_client_headers_or_display_name(self):
        body = {'messages': [{'role': 'user', 'content': 'hi'}]}
        forged = {'X-End-User-Name': 'forged-user', 'X-End-User-Phone': '13900139000'}
        for username, phone in (('chat-test-user', '13800138000'), ('中文测试用户', '13700137000')):
            with self.subTest(username=username):
                self.user = {**self.user, 'username': username, 'phone': phone}
                response = await self.post(body, headers=forged)
                self.assertEqual(response.status, 200, await response.text())
                self.assertEqual(self.end_user_headers[-1], (username, phone))

    async def test_legacy_user_empty_phone_is_sent_as_empty_header(self):
        self.user['phone'] = ''
        response = await self.post({'messages': [{'role': 'user', 'content': 'hi'}]})
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(self.end_user_headers, [('chat-test-user', '')])

    async def test_image(self):
        output = BytesIO()
        Image.new('RGB', (2, 2)).save(output, format='PNG')
        url = 'data:image/png;base64,' + base64.b64encode(output.getvalue()).decode()
        response = await self.post({'messages': [{'role': 'user', 'content': [
            {'type': 'text', 'text': 'describe'}, {'type': 'image_url', 'image_url': {'url': url}}]}]})
        self.assertEqual(response.status, 200)
        self.assertEqual(len(self.calls), 1)

    async def test_single_image_over_five_mib_within_total_limit(self):
        output = BytesIO()
        Image.frombytes('RGB', (1500, 1500), os.urandom(1500 * 1500 * 3)).save(output, format='PNG')
        data = output.getvalue()
        self.assertGreater(len(data), 5 * 1024 * 1024)
        self.assertLess(len(data), cloud_chat.MAX_TOTAL_IMAGE_BYTES)
        url = 'data:image/png;base64,' + base64.b64encode(data).decode()
        response = await self.post({'messages': [{'role': 'user', 'content': [
            {'type': 'image_url', 'image_url': {'url': url}}]}]})
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(self.calls[0][0]['messages'][0]['content'][0]['image_url']['url'], url)

    async def test_validation_and_auth_before_gateway(self):
        invalid = [None, {}, {'messages': []}, {'messages': [{'role': [], 'content': 'hi'}]},
                   {'messages': [{'role': 'tool', 'content': 'hi'}]},
                   {'messages': [{'role': 'user', 'content': [{'type': 'image_url', 'image_url': {'url': 'https://example.com/a.png'}}]}]},
                   {'messages': [{'role': 'user', 'content': [{'type': 'image_url', 'image_url': {'url': 'data:image/png;base64,YQ=='}}]}]},
                   {'messages': [{'role': 'user', 'content': 'hi'}], 'model': 'external'},
                   {'messages': [{'role': 'user', 'content': 'hi'}], 'stream': 'true'},
                   {'messages': [{'role': 'user', 'content': 'hi'}], 'stream': 1}]
        for body in invalid:
            with self.subTest(body=body):
                response = await self.post(body)
                self.assertEqual(response.status, 400)
        self.authenticated = False
        response = await self.post({'messages': [{'role': 'user', 'content': 'hi'}]})
        self.assertEqual(response.status, 401)
        self.assertEqual(self.calls, [])

    async def test_limits(self):
        response = await self.post({'messages': [{'role': 'user', 'content': 'a' * 100001}]})
        self.assertEqual(response.status, 413)
        with mock.patch.object(cloud_chat, 'MAX_REQUEST_BYTES', 100):
            response = await self.post({'messages': [{'role': 'user', 'content': 'a' * 101}]})
            self.assertEqual(response.status, 413)
        self.assertEqual(self.calls, [])

    async def test_config_override(self):
        self.config.write_text(json.dumps({'base_url': str(self.server.make_url('/v1')), 'api_key': 'unused', 'chat_model': 'chat-custom'}))
        with mock.patch.dict(os.environ, {'CHOUKA_IMAGE_API_KEY': 'override'}):
            response = await self.post({'messages': [{'role': 'user', 'content': 'hi'}]})
        self.assertEqual((await response.json())['model'], 'chat-custom')
        self.assertEqual(self.calls[0][1], 'Bearer override')

    async def test_errors_no_retry_or_leak(self):
        self.payload = {'error': 'fake-secret data:image/png;base64,private private-message'}
        for status in (302, 400, 429, 500):
            self.status = status
            response = await self.post({'messages': [{'role': 'user', 'content': 'private-message'}]})
            self.assertEqual(response.status, 502)
            text = await response.text()
            for secret in ('fake-secret', 'base64', 'private-message'):
                self.assertNotIn(secret, text)
        self.assertEqual(len(self.calls), 4)
        self.status = 200
        response = await self.post({'messages': [{'role': 'user', 'content': 'hi'}]})
        self.assertEqual(response.status, 502)

    async def test_config_and_response_limits(self):
        with mock.patch.object(cloud_chat, 'MAX_RESPONSE_BYTES', 10):
            response = await self.post({'messages': [{'role': 'user', 'content': 'hi'}]})
            self.assertEqual(response.status, 502)
        for config in ([], {'api_key': 'fake', 'base_url': 'https://user:pass@example.com'},
                       {'api_key': 'fake', 'chat_model': None}, {'enabled': False}):
            self.config.write_text(json.dumps(config))
            response = await self.post({'messages': [{'role': 'user', 'content': 'hi'}]})
            self.assertEqual(response.status, 503)
        self.assertEqual(len(self.calls), 1)

    async def test_image_count_and_bytes(self):
        output = BytesIO()
        Image.new('RGB', (2, 2)).save(output, format='PNG')
        data = output.getvalue()
        part = {'type': 'image_url', 'image_url': {'url': 'data:image/png;base64,' + base64.b64encode(data).decode()}}
        body = {'messages': [{'role': 'user', 'content': [part] * 9}]}
        response = await self.post(body)
        self.assertEqual(response.status, 413)
        with mock.patch.object(cloud_chat, 'MAX_TOTAL_IMAGE_BYTES', len(data) - 1):
            response = await self.post({'messages': [{'role': 'user', 'content': [part]}]})
            self.assertEqual(response.status, 413)
        self.assertEqual(self.calls, [])

    async def test_timeout_settings(self):
        session = mock.Mock()
        session.post.side_effect = asyncio.TimeoutError()
        with self.assertRaises(cloud_chat.ChatError) as caught:
            await cloud_chat.complete(session, [{'role': 'user', 'content': 'secret'}],
                                      end_user_name='chat-test-user', end_user_phone='13800138000')
        self.assertTrue(caught.exception.answer_unknown)
        self.assertEqual(caught.exception.status, 504)
        self.assertEqual(session.post.call_count, 1)
        args = session.post.call_args.kwargs
        self.assertFalse(args['allow_redirects'])
        self.assertIsNone(args['proxy'])
        self.assertEqual(args['timeout'].connect, 10)
        self.assertEqual(args['timeout'].sock_read, 300)
