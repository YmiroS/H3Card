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
        self.response_headers = {'X-Request-ID': 'req-1'}
        self.raw_body = None
        self.stream_chunks = None
        self.stream_gate = None
        self.payload = {'choices': [{'message': {'content': 'hello'}}], 'usage': {'total_tokens': 10}, 'cost': 99}
        async def gateway(request):
            self.calls.append((await request.json(), request.headers.get('Authorization')))
            self.end_user_headers.append((request.headers.get('X-End-User-Name'),
                                          request.headers.get('X-End-User-Phone')))
            if self.stream_chunks is not None and self.status == 200:
                response = web.StreamResponse(headers={'Content-Type': 'text/event-stream',
                                                       **self.response_headers})
                await response.prepare(request)
                for index, chunk in enumerate(self.stream_chunks):
                    await response.write(chunk)
                    if index == 0 and self.stream_gate is not None:
                        await self.stream_gate.wait()
                await response.write_eof()
                return response
            if self.raw_body is not None:
                return web.Response(body=self.raw_body, status=self.status, headers=self.response_headers)
            return web.json_response(self.payload, status=self.status, headers=self.response_headers)
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

    def set_upstream_error(self, mode, payload, *, raw_body=None, partial=False):
        self.status = 200 if mode.startswith('sse_') else 422
        self.payload = payload
        self.raw_body = raw_body
        self.stream_chunks = None
        if mode.startswith('sse_'):
            data = raw_body if raw_body is not None else json.dumps(payload).encode()
            prefix = b'event: error\n' if mode == 'sse_event' else b''
            frame = prefix + b'data: ' + data + b'\n\n'
            self.stream_chunks = ([b'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n']
                                  if partial else []) + [frame, b'data: [DONE]\n\n']

    async def read_upstream_error(self, mode, *, messages=None):
        messages = messages or [{'role': 'user', 'content': 'hello upstream'}]
        before = len(self.calls)
        with self.assertLogs(cloud_chat.__name__, level='WARNING') as logs:
            with mock.patch.object(cloud_chat.provider_billing, 'capture',
                                   wraps=cloud_chat.provider_billing.capture) as capture:
                response = await self.post({'messages': messages, 'stream': mode != 'complete'})
                text = await response.text()
        self.assertEqual(len(self.calls), before + 1, 'Provider errors must not be retried')
        self.assertTrue(capture.called, 'Billing metadata must still be captured')
        state = capture.call_args.args[0]
        if mode.startswith('sse_'):
            self.assertEqual(response.status, 200, text)
            self.assertEqual(response.content_type, 'text/event-stream')
            frames = text.split('\n\n')
            errors = [frame for frame in frames if frame.startswith('event: error\n')]
            self.assertEqual(len(errors), 1, text)
            self.assertNotIn('[DONE]', text)
            result = json.loads(errors[0].split('data: ', 1)[1])
            self.assertEqual(state['status'], 'error')
        else:
            self.assertEqual(response.status, 502, text)
            result = json.loads(text)
        self.assertIs(result['retryable'], False)
        self.assertIs(result['answer_unknown'], False)
        self.assertEqual(len(logs.records), 1)
        self.upstream_logs = '\n'.join(logs.output)
        logged_detail = logs.records[0].getMessage().split(' detail=', 1)[1]
        self.assertIn(logged_detail, result['error'])
        # Parse the wire response first; combined text is only for diagnostics/privacy checks.
        return result, state, text + '\n' + self.upstream_logs

    def assert_upstream_detail(self, result, reason, *, status=None, request_id='req-1'):
        status = self.status if status is None else status
        if status == 200:
            self.assertIn('云端聊天流式返回错误', result['error'])
            self.assertNotIn('HTTP 200', result['error'])
        else:
            self.assertIn(f'HTTP {status}', result['error'])
        self.assertIn(reason, result['error'])
        if hasattr(self, 'upstream_logs'):
            self.assertIn(reason, self.upstream_logs)
            if request_id is not None:
                self.assertIn(request_id, self.upstream_logs)
        if request_id is None:
            self.assertIsNone(result.get('request_id'))
            self.assertNotIn('X-Request-ID:', result['error'])
        else:
            self.assertEqual(result['request_id'], request_id)
            self.assertIn('X-Request-ID', result['error'])
            self.assertIn(request_id, result['error'])

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
                              b'data: {"usage":{"prompt_tokens":7},"cost":"private"}\r\n\r\n',
                              b'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\r\n\r\n',
                              b'data: [DONE]\r\n\r\n']
        response = await self.post({'messages': [{'role': 'user', 'content': 'hi'}], 'stream': True})
        text = await response.text()
        self.assertIn('"finish_reason":"stop"', text)
        self.assertNotIn('private', text)
        self.assertNotIn('event: error', text)
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

    async def test_single_image_over_five_mib(self):
        output = BytesIO()
        Image.frombytes('RGB', (1500, 1500), os.urandom(1500 * 1500 * 3)).save(output, format='PNG')
        data = output.getvalue()
        self.assertGreater(len(data), 5 * 1024 * 1024)
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

    def test_chat_error_optional_request_id(self):
        ordinary = cloud_chat.ChatError('Local validation failed', status=400).response()
        self.assertEqual(ordinary['error'], 'Local validation failed')
        self.assertIsNone(ordinary.get('request_id'))
        self.assertIs(ordinary['retryable'], False)
        error = cloud_chat.ChatError('Provider rejected request', request_id='provider-request_123')
        self.assertEqual(error.request_id, 'provider-request_123')
        self.assertEqual(error.response()['request_id'], 'provider-request_123')
        self.assertIs(error.response()['answer_unknown'], False)

    async def test_upstream_json_diagnostics_and_billing_survive_all_error_paths(self):
        evidence = {'model': 'provider-chat-model', 'usage': {'prompt_tokens': 13, 'completion_tokens': 2},
                    'cost': '0.0123', 'currency': 'USD'}
        cases = [({'error': {'message': 'Unsupported context length', 'param': 'max_tokens',
                             'code': 'context_length_exceeded'}},
                  ('Unsupported context length', 'param=max_tokens', 'code=context_length_exceeded')),
                 ({'error': {'message': 'Invalid image', 'param': 'image', 'code': 400}},
                  ('Invalid image', 'param=image', 'code=400')),
                 ({'error': 'Model is not available'}, ('Model is not available',)),
                 ({'message': 'Invalid output format'}, ('Invalid output format',)),
                 ({'detail': 'Unsupported response schema'}, ('Unsupported response schema',)),
                 ({'error': ['Invalid temperature', 'Invalid token count']},
                  ('Invalid temperature; Invalid token count',)),
                 ({'error': None, 'detail': [{'msg': 'Field required', 'type': 'missing',
                                            'loc': ['body', 'max_tokens', 0],
                                            'input': 'private-validation-input',
                                            'ctx': {'value': 'private-validation-context'}}]},
                  ('Field required', 'type=missing', 'loc=body.max_tokens.0')),
                 ({'error': {'detail': 'Nested provider rejection', 'config': 'private-nested-config'}},
                  ('Nested provider rejection',))]
        for mode in ('complete', 'stream_http', 'sse_event', 'sse_json'):
            for payload, expected in cases:
                with self.subTest(mode=mode, expected=expected):
                    self.set_upstream_error(mode, {**payload, **evidence, 'debug': 'private-debug',
                                                  'api_key': 'private-unrelated-key'}, partial=True)
                    result, state, text = await self.read_upstream_error(mode)
                    for reason in expected:
                        self.assert_upstream_detail(result, reason)
                    self.assertNotIn('private-', text)
                    self.assertNotIn('provider-chat-model', text)
                    self.assertNotIn('0.0123', text)
                    self.assertEqual(state['model'], 'provider-chat-model')
                    self.assertEqual(state['model_source'], 'response')
                    self.assertEqual(state['usage']['input_tokens'], 13)
                    self.assertEqual(state['usage']['output_tokens'], 2)
                    self.assertEqual(state['provider_billing'],
                                     {'amount': '0.0123', 'currency': 'USD', 'field': 'cost'})
                    if mode.startswith('sse_'):
                        self.assertIn('"content":"partial"', text)
                        self.assertNotIn(self.stream_chunks[-2].decode(), text)

    async def test_plaintext_html_and_json_preserve_diagnostic_comparisons(self):
        reason = ('tokens <= 4096; pixels >= 655360; min<=pixels<=max; width <3840; height >16; '
                  'unsupported_output_resolution invalid_dimension_parameter')
        bodies = [(None, None), (reason.encode(), 'text/plain'),
                  (('<html><script>private-script()</script><p>' + reason + '</p>'
                    '<img src=x onerror="private-handler"></html>').encode(), 'text/html')]
        for mode in ('complete', 'stream_http', 'sse_event'):
            for raw, content_type in bodies:
                with self.subTest(mode=mode, content_type=content_type):
                    self.response_headers = {'X-Request-ID': 'req-1'}
                    if content_type and not mode.startswith('sse_'):
                        self.response_headers['Content-Type'] = content_type
                    self.set_upstream_error(mode, {'error': {'message': reason}}, raw_body=raw)
                    result, _, text = await self.read_upstream_error(mode)
                    self.assert_upstream_detail(result, reason)
                    for unwanted in ('<html>', '<p>', '<img', 'private-script', 'private-handler'):
                        self.assertNotIn(unwanted, text)

    async def test_errors_redact_all_message_roles_parts_and_normalized_multiline_text(self):
        prompts = ('PRIVATE_SYSTEM_ALPHA\nPRIVATE_SYSTEM_BETA',
                   'PRIVATE_HISTORY_USER_ALPHA\nPRIVATE_HISTORY_USER_BETA',
                   'PRIVATE_ASSISTANT_ALPHA\nPRIVATE_ASSISTANT_BETA',
                   'PRIVATE_CURRENT_ALPHA\nPRIVATE_CURRENT_BETA', 'PRIVATE_SECOND_TEXT_PART')
        messages = [{'role': role, 'content': prompt} for role, prompt in
                    zip(('system', 'user', 'assistant'), prompts[:3])]
        messages.append({'role': 'user', 'content': [{'type': 'text', 'text': text}
                                                   for text in prompts[3:]]})
        for mode in ('complete', 'stream_http', 'sse_event', 'sse_json'):
            for transform in (lambda value: value, lambda value: ' '.join(value.split()),
                              lambda value: json.dumps(value)[1:-1]):
                with self.subTest(mode=mode, echo=transform(prompts[0])):
                    reason = 'Invalid context length; ' + '; '.join(map(transform, prompts))
                    self.set_upstream_error(mode, {'error': {'message': reason}}, partial=True)
                    result, _, text = await self.read_upstream_error(mode, messages=messages)
                    self.assert_upstream_detail(result, 'Invalid context length')
                    self.assertNotIn('PRIVATE_', text)
                    self.assertIn('[prompt redacted]', result['error'])

    async def test_overlapping_prompts_are_fully_redacted_regardless_of_message_order(self):
        echo = 'PRIVATE_PREFIX confidential project bluebird'
        cases = [('PRIVATE_PREFIX', echo), (echo, 'PRIVATE_PREFIX'),
                 ('PRIVATE_PREFIX' + '\n' * 1000 + 'confidential', echo),
                 ('PRIVATE_PREFIX confidential', 'confidential project bluebird'),
                 ('PRIVATE_PREFIX', 'fake-secret ' + echo)]
        for mode in ('complete', 'stream_http', 'sse_event', 'sse_json'):
            for prompts in cases:
                with self.subTest(mode=mode, prompts=prompts):
                    messages = [{'role': role, 'content': prompt}
                                for role, prompt in zip(('system', 'user'), prompts)]
                    self.set_upstream_error(mode, {'error': 'Invalid context; fake-secret ' + echo}, partial=True)
                    result, _, text = await self.read_upstream_error(mode, messages=messages)
                    self.assert_upstream_detail(result, 'Invalid context')
                    for secret in ('PRIVATE_PREFIX', 'confidential', 'project bluebird', 'fake-secret'):
                        self.assertNotIn(secret, text)
                    self.assertIn('[prompt redacted]', result['error'])

    async def test_self_overlapping_prompt_occurrences_are_all_redacted(self):
        cases = [('PRIVATE_BLUEBIRD PRIVATE_BLUEBIRD', 'PRIVATE_BLUEBIRD ' * 3, 'PRIVATE_BLUEBIRD'),
                 ('ab ab', 'ab ab ab', 'ab'),
                 ('PRIVATE_BLUEBIRD\nPRIVATE_BLUEBIRD',
                  'PRIVATE_BLUEBIRD\tPRIVATE_BLUEBIRD\nPRIVATE_BLUEBIRD', 'PRIVATE_BLUEBIRD'),
                 ('PRIVATE_BLUEBIRD\nPRIVATE_BLUEBIRD',
                  r'PRIVATE_BLUEBIRD\nPRIVATE_BLUEBIRD\nPRIVATE_BLUEBIRD', 'PRIVATE_BLUEBIRD')]
        for mode in ('complete', 'stream_http', 'sse_event', 'sse_json'):
            for prompt, echo, sensitive in cases:
                with self.subTest(mode=mode, echo=echo):
                    self.set_upstream_error(mode, {'error': 'Invalid context; ' + echo + '; tokens <= 4096'},
                                            partial=True)
                    result, _, text = await self.read_upstream_error(
                        mode, messages=[{'role': 'user', 'content': prompt}])
                    self.assert_upstream_detail(result, 'Invalid context')
                    self.assertIn('tokens <= 4096', result['error'])
                    self.assertNotRegex(text, rf'\b{sensitive}\b')
                    self.assertIn('[prompt redacted]', result['error'])

    async def test_oversized_sse_error_details_use_safe_fallback(self):
        for mode in ('sse_event', 'sse_json'):
            self.set_upstream_error(mode, {'error': 'PRIVATE_' * 3000}, partial=True)
            result, _, text = await self.read_upstream_error(mode)
            self.assert_upstream_detail(result, '无可用错误详情')
            self.assertNotIn('PRIVATE_', text)
            self.assertLess(len(result['error']), 750)

    async def test_short_prompts_redact_standalone_echoes_without_mangling_diagnostics(self):
        messages = [{'role': 'user', 'content': 'hi'}, {'role': 'assistant', 'content': 'hello'},
                    {'role': 'user', 'content': 'a'}]
        reason = 'Invalid image; this request is invalid; echoed a; history hi'
        for mode in ('complete', 'stream_http', 'sse_event', 'sse_json'):
            with self.subTest(mode=mode):
                self.set_upstream_error(mode, {'error': {'message': reason}}, partial=True)
                result, _, text = await self.read_upstream_error(mode, messages=messages)
                self.assert_upstream_detail(result, 'Invalid image')
                for diagnostic in ('this request is invalid', 'echoed [prompt redacted]',
                                   'history [prompt redacted]'):
                    self.assertIn(diagnostic, result['error'])
                    self.assertIn(diagnostic, self.upstream_logs)
                self.assertNotRegex(text, r'\b(?:a|hi)\b')

    async def test_errors_redact_keys_identity_and_signed_url_credentials(self):
        cases = [('fake-secret; chat-test-user; 13800138000',
                  ('fake-secret', 'chat-test-user', '13800138000')),
                 ('Authorization: Bearer alternate-bearer; api_key="other key"; '
                  'password=plain-password; end_user_name="other private user"; '
                  'end_user_phone=13900139000',
                  ('alternate-bearer', 'other key', 'plain-password', 'other private user', '13900139000')),
                 ('https://storage.example/a?X-Amz-Credential=signed-credential&X-Amz-Signature=signed-value '
                  'https://other.example/b?unknown_signing_field=opaque-value&amp;sig=signed-two '
                  'HTTPS://url-user:url-password@example.com/c?token=url-token',
                  ('signed-credential', 'signed-value', 'opaque-value', 'signed-two',
                   'url-user', 'url-password', 'url-token'))]
        for mode in ('complete', 'stream_http', 'sse_event', 'sse_json'):
            for echo, sensitive in cases:
                with self.subTest(mode=mode, echo=echo):
                    self.set_upstream_error(mode, {'error': {'message': 'Invalid request; ' + echo}},
                                            partial=True)
                    result, _, text = await self.read_upstream_error(mode)
                    self.assert_upstream_detail(result, 'Invalid request')
                    for secret in sensitive:
                        self.assertNotIn(secret, text)

    async def test_errors_redact_wrapped_png_jpeg_and_webp_data(self):
        for image_format, mime in (('PNG', 'png'), ('JPEG', 'jpeg'), ('WEBP', 'webp')):
            output = BytesIO()
            Image.new('RGB', (2, 2)).save(output, format=image_format)
            encoded = base64.b64encode(output.getvalue()).decode()
            url = f'data:image/{mime};base64,' + encoded
            messages = [{'role': 'user', 'content': [{'type': 'text', 'text': 'describe this image'},
                                                     {'type': 'image_url', 'image_url': {'url': url}}]}]
            for mode in ('complete', 'stream_http', 'sse_event', 'sse_json'):
                for marker in ('', f'data:image/{mime};base64,'):
                    with self.subTest(image_format=image_format, mode=mode, marker=marker):
                        wrapped = '\n'.join(encoded[index:index + 4] for index in range(0, len(encoded), 4))
                        self.set_upstream_error(mode, {'error': {'message': 'Invalid image; ' + marker + wrapped}},
                                                partial=True)
                        result, _, text = await self.read_upstream_error(mode, messages=messages)
                        self.assert_upstream_detail(result, 'Invalid image')
                        self.assertIn('[data redacted]', result['error'])
                        self.assertNotIn(encoded[:12], ''.join(text.split()))
                        self.assertNotIn('base64', text)

    async def test_known_signed_image_url_is_not_echoed_by_complete(self):
        url = 'https://private.example/private-image-path?unknown_signer=private-signed-value'
        self.set_upstream_error('complete', {'error': {'message': 'Invalid image; ' + url}})
        messages = [{'role': 'user', 'content': [{'type': 'image_url', 'image_url': {'url': url}}]}]
        with self.assertLogs(cloud_chat.__name__, level='WARNING') as logs:
            with self.assertRaises(cloud_chat.ChatError) as caught:
                await cloud_chat.complete(self.session, messages, end_user_name=self.user['username'],
                                          end_user_phone=self.user['phone'])
        result = caught.exception.response()
        self.upstream_logs = '\n'.join(logs.output)
        self.assert_upstream_detail(result, 'Invalid image')
        for sensitive in ('private.example', 'private-image-path', 'private-signed-value'):
            self.assertNotIn(sensitive, result['error'] + self.upstream_logs)
        self.assertEqual(len(self.calls), 1)

    async def test_upstream_error_request_ids_are_validated_on_all_paths(self):
        prompt = 'PRIVATE_REQUEST_PROMPT'
        cases = [('provider-request_123', 'provider-request_123'), ('A' * 128, 'A' * 128),
                 (None, None), ('', None), ('invalid id', None), ('<script>', None),
                 ('A' * 129, None), ('req-fake-secret', None), ('sk-private-key', None),
                 ('req-chat-test-user', None), ('req-13800138000', None),
                 ('req-' + prompt, None)]
        for mode in ('complete', 'stream_http', 'sse_event', 'sse_json'):
            for request_id, expected in cases:
                with self.subTest(mode=mode, request_id=request_id):
                    self.response_headers = {} if request_id is None else {'X-Request-ID': request_id}
                    self.set_upstream_error(mode, {'error': 'Invalid token count'})
                    result, _, text = await self.read_upstream_error(
                        mode, messages=[{'role': 'user', 'content': prompt}])
                    self.assert_upstream_detail(result, 'Invalid token count', request_id=expected)
                    if request_id and expected is None:
                        self.assertNotIn(request_id, text)

    async def test_unavailable_http_error_details_keep_status_and_receipt(self):
        cases = [({}, None), ({'error': None}, None),
                 ({'error': {'config': 'private-config'}, 'input': 'private-input'}, None),
                 ({'detail': [{'input': 'private-validation-input', 'ctx': 'private-context'}]}, None),
                 (None, b''), (None, b'\xff\xfe'),
                 (None, b'Invalid request ' + b'x' * (16 * 1024)),
                 (None, b'{"error":"Invalid request","padding":"' + b'x' * (16 * 1024) + b'"}')]
        for mode in ('complete', 'stream_http'):
            for payload, raw in cases:
                with self.subTest(mode=mode, raw_length=None if raw is None else len(raw), payload=payload):
                    self.set_upstream_error(mode, payload, raw_body=raw)
                    result, _, text = await self.read_upstream_error(mode)
                    self.assert_upstream_detail(result, '无可用错误详情')
                    self.assertNotIn('private-', text)
                    self.assertNotIn('Invalid request', text)
                    self.assertLess(len(result['error']), 750)

    async def test_unreadable_http_error_body_is_not_an_unknown_timeout(self):
        for streaming in (False, True):
            for failure in (aiohttp.ClientPayloadError('private-read-failure'), asyncio.TimeoutError()):
                with self.subTest(streaming=streaming, failure=type(failure).__name__):
                    async def unreadable_chunks(_size):
                        raise failure
                        yield b''
                    upstream = mock.Mock(status=503, headers={'X-Request-ID': 'provider-read-failure'})
                    upstream.content.iter_chunked.side_effect = unreadable_chunks
                    upstream.read = mock.AsyncMock(side_effect=failure)
                    session = mock.Mock()
                    session.post.return_value = mock.MagicMock()
                    session.post.return_value.__aenter__.return_value = upstream
                    state = {}
                    with self.assertRaises(cloud_chat.ChatError) as caught:
                        if streaming:
                            await cloud_chat.stream(session, mock.Mock(), [{'role': 'user', 'content': 'secret'}],
                                                    end_user_name=self.user['username'],
                                                    end_user_phone=self.user['phone'], billing_state=state)
                        else:
                            await cloud_chat.complete(session, [{'role': 'user', 'content': 'secret'}],
                                                      end_user_name=self.user['username'],
                                                      end_user_phone=self.user['phone'], billing_state=state)
                    error = caught.exception
                    self.assertEqual(error.status, 502)
                    self.assertIs(error.answer_unknown, False)
                    self.assert_upstream_detail(error.response(), '无可用错误详情', status=503,
                                                request_id='provider-read-failure')
                    self.assertNotIn('private-read-failure', str(error))
                    self.assertIs(error.response()['retryable'], False)
                    self.assertEqual(session.post.call_count, 1)
                    self.assertEqual(state['model'], 'gpt-4o')
                    self.assertEqual(state['model_source'], 'config')
                    self.assertIn('provider_billing', state)
                    self.assertIn('usage', state)

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

    async def test_more_than_eight_images_and_thirty_two_content_parts(self):
        output = BytesIO()
        Image.new('RGB', (2, 2)).save(output, format='PNG')
        data = output.getvalue()
        part = {'type': 'image_url', 'image_url': {'url': 'data:image/png;base64,' + base64.b64encode(data).decode()}}
        parts = [{'type': 'text', 'text': '参考图片'}, part] * 20
        body = {'messages': [{'role': 'user', 'content': parts}]}
        response = await self.post(body)
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(self.calls[0][0]['messages'], body['messages'])

    async def test_image_larger_than_fifteen_mib_within_transport_budget(self):
        output = BytesIO()
        Image.new('RGB', (2, 2)).save(output, format='PNG')
        data = output.getvalue() + b'\0' * (15 * 1024 * 1024)
        self.assertGreater(len(data), 15 * 1024 * 1024)
        part = {'type': 'image_url', 'image_url': {'url': 'data:image/png;base64,' + base64.b64encode(data).decode()}}
        response = await self.post({'messages': [{'role': 'user', 'content': [part]}]})
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(len(self.calls), 1)

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
