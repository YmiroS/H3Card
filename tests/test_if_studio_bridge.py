import http.client
import json
import os
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest import mock
from urllib.error import HTTPError, URLError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
from if_studio_bridge import Bridge, LIMITS_FILE, NoReferenceRedirect, SessionBusyError, prepare_if_reference, model_quota

ORIGIN = 'http://127.0.0.1:8201'
SECOND_ORIGIN = 'http://127.0.0.1:8199'
LOCALHOST_ORIGIN = 'http://localhost:8199'
SECURE_ORIGIN = 'https://dinghaichouka.youku.com:8443'
MODELS = [{'display_name': 'qwen-image-2.0', 'type': 'image'},
          {'display_name': 'Minimax H3', 'type': 'video'}]
BUSY_ERROR = ('Error: 发送消息失败: /api/session/send 失败: '
              'map[code:session_busy data:map[session_id:s1] '
              'message:当前会话正在生成中，请等待本轮对话完成后再发送。 '
              'status:session_busy success:false]')


class ModelQuotaTest(unittest.TestCase):
    def test_quota_matches_if_account_permissions_without_inventing_counts(self):
        base = {'is_free': False, 'is_paid': False}
        for fields, status, remaining in (
                ({'total_count': 100, 'usage_count': 1}, 'limited', 99),
                ({'total_count': 30}, 'limited', 30),
                ({'total_count': 30, 'usage_count': 30}, 'exhausted', 0),
                ({'total_count': 30, 'usage_count': 35}, 'exhausted', 0),
                ({}, 'unavailable', 0),
                ({'total_count': None, 'usage_count': None}, 'unavailable', 0),
                ({'total_count': 0}, 'unavailable', 0),
                ({'is_free': True}, 'free', None),
                ({'is_paid': True, 'total_count': 30, 'usage_count': 30}, 'paid', None),
                ({'total_count': '30'}, 'unknown', None),
                ({'usage_count': -1}, 'unknown', None),
                ({'total_count': True}, 'unknown', None)):
            with self.subTest(fields=fields):
                self.assertEqual(model_quota({**base, **fields}),
                                 {'quota_status': status, 'remaining': remaining})
        self.assertEqual(model_quota({}), {'quota_status': 'unknown', 'remaining': None})


class ReferenceURLTest(unittest.TestCase):
    def response(self, status=206, content_type='application/octet-stream', body=b'RIFFxxxxWEBP'):
        response = mock.MagicMock()
        response.__enter__.return_value = response
        response.status = status
        response.headers = {'Content-Type': content_type}
        response.read.return_value = body
        return response

    def test_cdn_filename_encoding_is_idempotent_and_preserves_other_url_parts(self):
        urls = [
            ('f_test_.webp', 'f%5Ftest%5F.webp'),
            ('f_a_b.png', 'f%5Fa%5Fb.png'),
            ('f_a_.jpg', 'f%5Fa%5F.jpg'),
            ('f_video_.mp4', 'f%5Fvideo%5F.mp4'),
            ('f%5Ftest%5f.webp', 'f%5Ftest%5f.webp'),
        ]
        for original, encoded in urls:
            with self.subTest(original=original), mock.patch('if_studio_bridge.build_opener') as build:
                response = self.response()
                build.return_value.open.return_value = response
                suffix = '?token=keep_%2F&x=1#original_fragment'
                expected = 'https://ant.alicdn.com/bio/img/' + encoded + suffix
                actual = prepare_if_reference('https://ant.alicdn.com/bio/img/' + original + suffix)
                self.assertEqual(actual, expected)
                self.assertEqual(prepare_if_reference(actual), expected)
                request = build.return_value.open.call_args.args[0]
                self.assertEqual(request.full_url, expected)
                self.assertEqual(request.get_method(), 'GET')
                self.assertEqual(request.get_header('Range'), 'bytes=0-31')
                self.assertEqual(build.return_value.open.call_args.kwargs, {'timeout': 15})
                self.assertIsInstance(build.call_args.args[0], NoReferenceRedirect)
                response.read.assert_called_with(32)
                self.assertTrue(response.__exit__.called)

    def test_unrelated_urls_are_not_rewritten_or_fetched(self):
        with mock.patch('if_studio_bridge.build_opener') as build:
            for url in ('https://example.com/f_test_.webp', 'https://127.0.0.1/bio/img/f_a.png',
                        'https://ant.alicdn.com.evil.example/bio/img/f_a.png',
                        'https://ant.alicdn.com:444/bio/img/f_a.png',
                        'https://user:pass@ant.alicdn.com/bio/img/f_a.png',
                        'https://ant.alicdn.com/other/f_a.png', 'http://ant.alicdn.com/bio/img/f_a.png'):
                self.assertEqual(prepare_if_reference(url), url)
            build.assert_not_called()

    def test_cdn_failure_is_reported_before_generation(self):
        url = 'https://ant.alicdn.com/bio/img/f_test_.webp?token=secret'
        for error in (HTTPError(url, 404, 'NoSuchKey', {}, None),
                      HTTPError(url, 302, 'Redirect', {'Location': 'http://127.0.0.1/private'}, None),
                      URLError('network unreachable'), TimeoutError('timed out')):
            with self.subTest(error=error), mock.patch('if_studio_bridge.build_opener') as build:
                build.return_value.open.side_effect = error
                with self.assertRaisesRegex(RuntimeError, '尚未提交生成') as failure:
                    prepare_if_reference(url)
                self.assertNotIn('secret', str(failure.exception))
        self.assertIsNone(NoReferenceRedirect().redirect_request(None, None, 302, '', {}, 'http://127.0.0.1/'))

    def test_empty_error_documents_and_unexpected_status_are_rejected(self):
        for status, content_type, body in ((200, 'application/xml', b'<Error/>'),
                                          (200, 'text/html', b'login'), (200, 'application/json', b'{}'),
                                          (200, 'image/png', b''), (204, '', b'x')):
            with self.subTest(status=status, content_type=content_type), \
                    mock.patch('if_studio_bridge.build_opener') as build:
                build.return_value.open.return_value = self.response(status, content_type, body)
                with self.assertRaisesRegex(RuntimeError, '未返回有效媒体内容'):
                    prepare_if_reference('https://ant.alicdn.com/bio/img/f_test.png')


class BridgeTest(unittest.TestCase):
    def setUp(self):
        self.bridge = Bridge(('127.0.0.1', 0), (ORIGIN, SECOND_ORIGIN, LOCALHOST_ORIGIN, SECURE_ORIGIN), 'ifs.exe')
        self.thread = threading.Thread(target=self.bridge.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.bridge.shutdown()
        self.thread.join(timeout=3)
        self.bridge.close()

    def request(self, method, path, body=None, origin=ORIGIN, headers=None):
        conn = http.client.HTTPConnection('127.0.0.1', self.bridge.server_port, timeout=3)
        request_headers = {'Origin': origin, **(headers or {})}
        conn.request(method, path, body=body, headers=request_headers)
        response = conn.getresponse()
        content = response.read()
        payload = json.loads(content) if content and 'application/json' in response.headers.get('Content-Type', '') else content
        result = response.status, response.headers, payload
        conn.close()
        return result

    def test_limits_manifest_is_not_scanned_as_a_cap(self):
        self.assertEqual(LIMITS_FILE.name, '_if_model_limits.json')
        self.assertEqual(LIMITS_FILE.parent.name, 'manifests')

    def test_second_bridge_cannot_bind_same_port(self):
        with self.assertRaises(OSError):
            Bridge(('127.0.0.1', self.bridge.server_port), (ORIGIN, SECOND_ORIGIN, LOCALHOST_ORIGIN, SECURE_ORIGIN), 'ifs.exe')

    def test_only_configured_chouka_origins_are_allowed(self):
        with mock.patch.object(self.bridge, 'command', return_value={'profiles': {'buc': {
                'registry': 'ifs.alibaba-inc.com', 'has_ifs_token': True}}}):
            for origin in (ORIGIN, SECOND_ORIGIN, LOCALHOST_ORIGIN, SECURE_ORIGIN):
                code, headers, body = self.request('GET', '/status', origin=origin)
                self.assertEqual((code, body), (200, {'ready': True, 'reference_reuse': True, 'request_recovery': True}))
                self.assertEqual(headers['Access-Control-Allow-Origin'], origin)
                code, headers, _ = self.request('OPTIONS', '/runs', origin=origin,
                    headers={'Access-Control-Request-Method': 'POST'})
                self.assertEqual(code, 204)
                self.assertEqual(headers['Access-Control-Allow-Origin'], origin)
            for origin in ('https://attacker.example', 'null', 'http://127.0.0.1:8202'):
                code, _, _ = self.request('GET', '/status', origin=origin)
                self.assertEqual(code, 403)
            code, _, _ = self.request('POST', '/runs', '{}', headers={'Content-Type': 'text/plain'})
            self.assertEqual(code, 403)

    def test_models_and_request_validation(self):
        with mock.patch.object(self.bridge, 'command', return_value=MODELS):
            code, _, body = self.request('GET', '/models')
            self.assertEqual((code, body['models']), (200, [
                {**m, 'quota_status': 'unknown', 'remaining': None} for m in MODELS]))
            for data in ({'type': 'video', 'model': 'qwen-image-2.0', 'prompt': 'hello'},
                         {'type': 'image', 'model': 'qwen-image-2.0', 'prompt': 'hello',
                          'image': 'file:///private/secret'},
                         {'type': 'image', 'model': 'qwen-image-2.0', 'prompt': 'hello',
                          'image': 'https://127.0.0.1/private'},
                         {'type': 'image', 'model': 'qwen-image-2.0', 'prompt': 'hello',
                          'image': 'https://[::1]/private'},
                         {'type': 'image', 'model': 'qwen-image-2.0', 'prompt': ''}):
                code, _, _ = self.request('POST', '/runs', json.dumps(data),
                                          headers={'Content-Type': 'application/json', 'X-Chouka-IF': 'generate'})
                self.assertEqual(code, 400)
            self.assertFalse(self.bridge.jobs)

    def test_models_refresh_and_expose_only_public_quota_fields(self):
        models = [{**MODELS[0], 'is_free': False, 'is_paid': False,
                   'total_count': 100, 'usage_count': 1, 'internal_field': 'private'},
                  {**MODELS[1], 'is_free': False, 'is_paid': False},
                  {'display_name': 'planner', 'type': 'text'}]
        with mock.patch.object(self.bridge, 'command', return_value=models) as command:
            code, headers, body = self.request('GET', '/models')
            command.assert_called_once_with('models', '--refresh', '--json', '--profile', 'buc', timeout=35)
            self.assertEqual(code, 200)
            self.assertEqual(headers['Cache-Control'], 'no-store')
            self.assertEqual(body['models'], [
                {**MODELS[0], 'quota_status': 'limited', 'remaining': 99},
                {**MODELS[1], 'quota_status': 'unavailable', 'remaining': 0}])

    def test_unavailable_or_exhausted_model_is_rejected_before_generation(self):
        for quota, message in (({}, '未开通'), ({'total_count': 30, 'usage_count': 30}, '免费次数已用完')):
            with self.subTest(quota=quota), mock.patch.object(self.bridge, 'command', return_value=[
                    {**MODELS[0], 'is_free': False, 'is_paid': False, **quota}]) as command, \
                    mock.patch.object(self.bridge, 'generate') as generate:
                code, _, body = self.request('POST', '/runs', json.dumps({
                    'type': 'image', 'model': MODELS[0]['display_name'], 'prompt': 'hello',
                    'request_id': 'a' * 32}),
                    headers={'Content-Type': 'application/json', 'X-Chouka-IF': 'generate'})
                self.assertEqual(code, 400)
                self.assertIn(message, body['error'])
                self.assertIn('尚未提交生成', body['error'])
                command.assert_called_once_with('models', '--refresh', '--json', '--profile', 'buc', timeout=35)
                generate.assert_not_called()
                self.assertFalse(self.bridge.jobs)
                self.assertFalse(self.bridge.requests)

    def test_create_poll_and_media(self):
        def command(*args, **_):
            if args[0] == 'models':
                return MODELS
            self.assertNotIn('--base-url', args)
            if args[:2] == ('canvas', 'run'):
                self.assertIn('--profile', args)
                self.assertIn('--', args)
                return {'status': 'created', 'canvas_id': 'c1', 'session_id': 's1',
                        'canvas_url': 'https://ifs.alibaba-inc.com/c1'}
            folder = Path(args[args.index('--save-dir') + 1])
            file = folder / 'result.png'
            file.write_bytes(b'fake-image')
            return {'status': 'done', 'canvas_id': 'c1', 'session_id': 's1',
                    'downloaded': [{'type': 'image', 'local_path': str(file)}]}

        with mock.patch.object(self.bridge, 'command', side_effect=command):
            code, _, body = self.request('POST', '/runs', json.dumps({
                'type': 'image', 'model': 'qwen-image-2.0', 'prompt': '-avoid flags'}),
                headers={'Content-Type': 'application/json', 'X-Chouka-IF': 'generate'})
            self.assertEqual(code, 202)
            job_id = body['id']
            for _ in range(100):
                code, _, job = self.request('GET', '/runs/' + job_id)
                if job['state'] == 'done':
                    break
                time.sleep(.01)
            self.assertEqual(job['state'], 'done')
            self.assertEqual(job['result']['downloaded'][0]['name'], 'result.png')
            code, headers, payload = self.request('GET', f'/runs/{job_id}/media/0')
            self.assertEqual(code, 200)
            self.assertEqual(headers['Access-Control-Allow-Origin'], ORIGIN)
            self.assertEqual(payload, b'fake-image')
            for origin in (SECOND_ORIGIN, LOCALHOST_ORIGIN, SECURE_ORIGIN):
                code, headers, payload = self.request('GET', f'/runs/{job_id}/media/0', origin=origin)
                self.assertEqual((code, payload), (200, b'fake-image'))
                self.assertEqual(headers['Access-Control-Allow-Origin'], origin)
            conn = http.client.HTTPConnection('127.0.0.1', self.bridge.server_port, timeout=3)
            conn.request('GET', f'/runs/{job_id}/media/0', headers={'Origin': ORIGIN, 'Range': 'bytes=5-9'})
            ranged = conn.getresponse()
            self.assertEqual((ranged.status, ranged.read()), (206, b'image'))
            conn.close()

    def test_legacy_image_summary_is_rechecked_without_resubmitting(self):
        created = {'status': 'created', 'canvas_id': 'c2', 'session_id': 's2'}
        background = {'status': 'summary_feedback', 'planning_text': '视频生成任务已提交，正在后台处理中。'}
        finished_notice = {'status': 'summary_feedback', 'planning_text': '视频已生成完毕。'}
        completed = {'status': 'done', 'media': [{'type': 'video', 'url': 'https://media.example/video.mp4'}]}
        with mock.patch.object(self.bridge, 'command', side_effect=[created, background, finished_notice, completed]) as cli, \
                mock.patch('if_studio_bridge.time.sleep') as pause:
            self.bridge.generate('video-test', {'model': 'Minimax H3', 'prompt': '蓝色圆形'})
        self.assertEqual(self.bridge.jobs['video-test']['result']['status'], 'done')
        self.assertEqual([call.args[:2] for call in cli.call_args_list].count(('canvas', 'run')), 1)
        self.assertEqual([call.args[:2] for call in cli.call_args_list].count(('canvas', 'poll')), 3)
        self.assertEqual(pause.call_count, 2)

    def test_cli_poll_failure_message_is_returned(self):
        created = {'status': 'created', 'canvas_id': 'c_OcBXJf2Bd0CxY-', 'session_id': 's1',
                   'canvas_url': 'https://ifs.alibaba-inc.com/#/canvas/c_OcBXJf2Bd0CxY-'}
        with mock.patch.object(self.bridge, 'command', side_effect=[
                created, {'status': 'failed', 'message': 'IFS 不接受此引用组合'}]):
            self.bridge.generate('failed-video', {'model': 'Minimax H3', 'prompt': '生成视频'})
        self.assertEqual(self.bridge.jobs['failed-video']['state'], 'error')
        self.assertIn('IFS 不接受此引用组合', self.bridge.jobs['failed-video']['error'])
        result = self.bridge.jobs['failed-video']['result']
        self.assertEqual(result['canvas_id'], created['canvas_id'])
        self.assertEqual(result['canvas_url'], created['canvas_url'])
        self.assertEqual(result['session_id'], 's1')

    def test_poll_exception_and_incomplete_completion_keep_created_canvas(self):
        canvas_id = 'c_OcBXJf2Bd0CxY-'
        for name, outcome, expected_state in [('exception', RuntimeError('网络断开'), 'error'),
                                               ('no-media', {'status': 'done'}, 'done')]:
            with self.subTest(name=name), mock.patch.object(self.bridge, 'command', side_effect=[
                    {'status': 'created', 'canvas_id': canvas_id, 'session_id': 's1'}, outcome]):
                self.bridge.generate(name, {'model': 'Minimax H3', 'prompt': '生成视频'})
            job = self.bridge.jobs[name]
            self.assertEqual(job['state'], expected_state)
            self.assertEqual(job['result']['canvas_id'], canvas_id)

    def test_failure_before_canvas_creation_has_no_canvas_link(self):
        with mock.patch.object(self.bridge, 'command', side_effect=RuntimeError('尚未创建')):
            self.bridge.generate('not-created', {'model': 'Minimax H3', 'prompt': '生成视频'})
        self.assertEqual(self.bridge.jobs['not-created']['state'], 'error')
        self.assertNotIn('canvas_id', self.bridge.jobs['not-created']['result'])
        self.assertNotIn('canvas_url', self.bridge.jobs['not-created']['result'])

    def upload(self, body=b'\x89PNG\r\n\x1a\n' + b'0' * 32, content_type='image/png', **kwargs):
        return self.request('POST', '/assets', body, headers={
            'Content-Type': content_type, 'X-Chouka-IF': 'asset', **kwargs.pop('headers', {})}, **kwargs)

    def run_request(self, **overrides):
        data = {'type': 'image', 'model': 'qwen-image-2.0', 'prompt': 'generate', **overrides}
        return self.request('POST', '/runs', json.dumps(data), headers={
            'Content-Type': 'application/json', 'X-Chouka-IF': 'generate'})

    def test_request_lookup_and_duplicate_submission_keep_one_original_job(self):
        request_id = 'a' * 32
        self.assertEqual(self.request('GET', '/requests/' + request_id)[0], 404)
        code, headers, _ = self.request('OPTIONS', '/requests/' + request_id, origin=SECURE_ORIGIN,
                                       headers={'Access-Control-Request-Method': 'GET',
                                                'Access-Control-Request-Private-Network': 'true'})
        self.assertEqual((code, headers['Access-Control-Allow-Origin'],
                          headers['Access-Control-Allow-Private-Network']), (204, SECURE_ORIGIN, 'true'))
        self.assertEqual(self.request('OPTIONS', '/requests/' + request_id,
                                     origin='https://untrusted.example',
                                     headers={'Access-Control-Request-Method': 'GET'})[0], 403)
        _, _, asset = self.upload()
        with mock.patch.object(self.bridge, 'command', return_value=MODELS), \
                mock.patch.object(self.bridge, 'generate') as generate:
            code, _, first = self.run_request(request_id=request_id, asset_id=asset['asset_id'])
            self.assertEqual(code, 202)
            code, _, recovered = self.request('GET', '/requests/' + request_id)
            self.assertEqual((code, recovered), (200, first))
            self.assertEqual(self.request('GET', '/requests/' + request_id, origin=SECOND_ORIGIN)[0], 404)
            # Assets are already consumed; retry must still return the original job without generation.
            code, _, repeated = self.run_request(request_id=request_id, asset_id=asset['asset_id'])
            self.assertEqual((code, repeated), (202, first))
            self.assertEqual(self.run_request(request_id=request_id, prompt='different')[0], 409)
            with self.bridge.lock:
                self.bridge.jobs[first['id']] = {'state': 'done', 'result': {'downloaded': []}}
            self.assertEqual(self.run_request(request_id=request_id, asset_id=asset['asset_id'])[2], first)
            self.assertEqual(generate.call_count, 1)
            self.assertEqual(len(self.bridge.jobs), 1)

    def test_concurrent_same_request_is_accepted_only_once(self):
        barrier = threading.Barrier(2)
        accepted = threading.Event()
        counter_lock = threading.Lock()
        model_calls = 0
        results = []
        asset_id = self.upload()[2]['asset_id']
        def models(*args, **kwargs):
            nonlocal model_calls
            with counter_lock:
                model_calls += 1
                index = model_calls
            barrier.wait(timeout=3)
            if index == 2:
                self.assertTrue(accepted.wait(3))
            return MODELS
        def submit():
            response = self.run_request(request_id='b' * 32, asset_id=asset_id)
            results.append(response)
            if response[0] == 202:
                accepted.set()
        with mock.patch.object(self.bridge, 'command', side_effect=models), \
                mock.patch.object(self.bridge, 'generate') as generate:
            threads = [threading.Thread(target=submit) for _ in range(2)]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join(timeout=5)
            self.assertEqual(len(results), 2)
            self.assertEqual([item[0] for item in results], [202, 202])
            self.assertEqual(results[0][2], results[1][2])
            self.assertEqual(generate.call_count, 1)

    def test_request_id_validation_never_starts_generation(self):
        with mock.patch.object(self.bridge, 'command', return_value=MODELS), \
                mock.patch.object(self.bridge, 'generate') as generate:
            for value in ('', '../bad', 'a' * 33, 123, []):
                self.assertEqual(self.run_request(request_id=value)[0], 400)
            generate.assert_not_called()

    def test_upload_and_strict_preflight(self):
        code, headers, _ = self.request('OPTIONS', '/assets', headers={
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type,x-chouka-if',
            'Access-Control-Request-Private-Network': 'true'})
        self.assertEqual((code, headers['Access-Control-Allow-Private-Network']), (204, 'true'))
        code, _, body = self.upload()
        self.assertEqual((code, body['kind']), (201, 'image'))
        self.assertNotIn('path', body)
        saved = self.bridge.assets[body['asset_id']][0]
        self.assertEqual(saved.read_bytes(), b'\x89PNG\r\n\x1a\n' + b'0' * 32)
        self.assertEqual(saved.parent, Path(self.bridge.workspace.name))
        mp4 = b'\x00\x00\x00\x18ftypisom\x00\x00\x00\x00isomiso2'
        code, _, body = self.upload(mp4, 'video/mp4')
        self.assertEqual((code, body['kind']), (201, 'video'))
        asset_id = body['asset_id']
        path = self.bridge.assets[asset_id][0]
        code, headers, _ = self.request('OPTIONS', '/assets/' + asset_id, headers={
            'Access-Control-Request-Method': 'DELETE',
            'Access-Control-Request-Headers': 'x-chouka-if',
            'Access-Control-Request-Private-Network': 'true'})
        self.assertEqual((code, headers['Access-Control-Allow-Methods']), (204, 'DELETE'))
        self.assertEqual(self.request('DELETE', '/assets/' + asset_id, headers={'X-Chouka-IF': 'asset'})[0], 200)
        self.assertFalse(path.exists())
        self.assertEqual(self.bridge.asset_slots, 1)
        self.assertEqual(self.request('DELETE', '/assets/' + asset_id, headers={'X-Chouka-IF': 'asset'})[0], 404)

    def test_upload_rejects_invalid_media_size_and_origin(self):
        for payload, content_type in ((b'not png', 'image/png'),
                                      (b'\x89PNG\r\n\x1a\n', 'image/gif'),
                                      (b'RIFFxxxxNOTWEBP', 'image/webp'),
                                      (b'\x00' * 32, 'video/mp4')):
            self.assertEqual(self.upload(payload, content_type)[0], 400)
        self.assertEqual(self.upload(headers={'X-Chouka-IF': 'generate'})[0], 403)
        self.assertEqual(self.upload(origin='https://foreign.example')[0], 403)
        self.assertEqual(self.upload(headers={'Host': 'evil.example'})[0], 403)
        for media_type, maximum in (('image/png', 10_000_000), ('image/jpeg', 10_000_000),
                                    ('image/webp', 10_000_000), ('video/mp4', 50 * 1024 * 1024)):
            self.assertEqual(self.upload(b'', media_type, headers={
                'Content-Length': str(maximum + 1)})[0], 400)
        for media_type in ('image/png', 'image/jpeg', 'image/webp'):
            self.assertEqual(self.upload(b'', media_type, headers={
                'Content-Length': '12500000'})[0], 400, '12.5 MB must be rejected before the IF CLI')
        self.assertEqual(self.upload(b'', headers={'Content-Length': '-1'})[0], 400)
        self.assertFalse(self.bridge.assets)
        self.assertEqual(self.bridge.asset_bytes, 0)

    def test_upload_accepts_image_at_exact_ten_mb(self):
        data = b'\x89PNG\r\n\x1a\n' + bytes(10_000_000 - 8)
        code, _, body = self.upload(data, 'image/png')
        self.assertEqual(code, 201)
        path = self.bridge.assets[body['asset_id']][0]
        self.assertEqual(path.stat().st_size, 10_000_000)

    def test_image_asset_uploads_once_and_is_deleted_before_single_submission(self):
        with mock.patch('if_studio_bridge.LIMITS_FILE') as limits:
            limits.read_text.return_value = json.dumps({
                'qwen-image-2.0': {'type': 'image', 'bridge': {'image': 1, 'video': 0}}})
            code, _, body = self.upload()
            self.assertEqual(code, 201)
            asset_id = body['asset_id']
            asset_path = self.bridge.assets[asset_id][0]
            created = threading.Event()
            release = threading.Event()
            calls, steps = [], []

            def command(*args, **_):
                if args[0] == 'models':
                    return MODELS
                calls.append(args)
                with self.bridge.lock:
                    job = next(iter(self.bridge.jobs.values()))
                    steps.append((job['state'], job.get('step')))
                if args[0] == 'upload':
                    self.assertEqual(args[1], str(asset_path))
                    self.assertTrue(asset_path.exists())
                    created.set()
                    self.assertTrue(release.wait(2))
                    return {'url': 'https://example.com/uploaded.png'}
                self.assertFalse(asset_path.exists())
                if args[:2] == ('canvas', 'run'):
                    self.assertNotIn('--image', args)
                    self.assertEqual(args[-1], '图片1：https://example.com/uploaded.png\n\n使用模型：qwen-image-2.0\n\n生成需求：\ngenerate')
                    self.assertEqual(args[args.index('--model') + 1], 'qwen-image-2.0')
                    self.assertEqual(job['result']['submitted_prompt'], args[-1])
                    return {'status': 'created', 'canvas_id': 'c1', 'session_id': 's1'}
                return {'status': 'done', 'downloaded': []}

            with mock.patch.object(self.bridge, 'command', side_effect=command):
                code, _, body = self.run_request(asset_id=asset_id)
                self.assertEqual(code, 202)
                self.assertTrue(created.wait(2))
                try:
                    _, _, pending = self.request('GET', '/runs/' + body['id'])
                    self.assertEqual(pending['state'], 'starting')
                    self.assertEqual(pending['step'], '正在上传 IF 引用素材（1/1）')
                    self.assertNotIn('progress', pending)
                    self.assertEqual(self.run_request(asset_id=asset_id)[0], 400)
                finally:
                    release.set()
                for _ in range(100):
                    _, _, job = self.request('GET', '/runs/' + body['id'])
                    if job['state'] == 'done':
                        break
                    time.sleep(.01)
                self.assertEqual(job['state'], 'done')
                self.assertEqual(self.run_request(asset_id=asset_id)[0], 400)
            self.assertFalse(asset_path.exists())
            self.assertEqual(len([args for args in calls if args[:2] == ('canvas', 'run')]), 1)
            self.assertEqual(len([args for args in calls if args[0] == 'upload']), 1)
            self.assertEqual(calls[-1][:2], ('canvas', 'poll'))
            self.assertEqual(steps, [
                ('starting', '正在上传 IF 引用素材（1/1）'),
                ('starting', '正在向 IF 一次提交全部引用与图片生成需求'),
                ('running', 'IF 正在生成图片，等待产物'),
            ])

    def test_model_header_without_references_matches_cli_model(self):
        for kind, model in [('image', 'qwen-image-2.0'), ('video', 'Seedance 2.5')]:
            with self.subTest(kind=kind), mock.patch.object(self.bridge, 'command', side_effect=[
                    {'status': 'created', 'canvas_id': 'c1', 'session_id': 's1'}, {'status': 'done'}]) as cli:
                self.bridge.generate('model-' + kind, {'type': kind, 'model': model, 'prompt': '直接生成文件'})
                prompt = f'使用模型：{model}\n\n生成需求：\n直接生成文件'
                self.assertEqual(cli.call_args_list[0].args[-1], prompt)
                args = cli.call_args_list[0].args
                self.assertEqual(args[args.index('--model') + 1], model)
                self.assertEqual(self.bridge.jobs['model-' + kind]['result']['submitted_prompt'], prompt)

    def test_uploaded_and_direct_cdn_references_are_checked_and_encoded_before_single_run(self):
        path = Path(self.bridge.workspace.name) / 'reference.webp'
        path.write_bytes(b'RIFFxxxxWEBP')
        original = 'https://ant.alicdn.com/bio/img/f_reference_.webp'
        corrected = 'https://ant.alicdn.com/bio/img/f%5Freference%5F.webp'
        response = ReferenceURLTest().response()
        with mock.patch('if_studio_bridge.build_opener') as build, \
                mock.patch.object(self.bridge, 'command', side_effect=[
                    {'url': original}, {'status': 'created', 'canvas_id': 'c1', 'session_id': 's1'},
                    {'status': 'done', 'downloaded': []}]) as cli:
            build.return_value.open.return_value = response
            self.bridge.generate('encoded-reference', {'model': 'Minimax H3', 'type': 'video',
                'prompt': '使用全部引用', 'image': original}, [path])
        job = self.bridge.jobs['encoded-reference']
        self.assertEqual(job['state'], 'done')
        expected = f'图片1：{corrected}\n图片2：{corrected}\n\n使用模型：Minimax H3\n\n生成需求：\n使用全部引用'
        self.assertEqual(job['result']['submitted_prompt'], expected)
        self.assertEqual(cli.call_args_list[1].args[-1], expected)
        self.assertEqual([call.args[:2] for call in cli.call_args_list], [
            ('upload', str(path)), ('canvas', 'run'), ('canvas', 'poll')])
        self.assertEqual(build.return_value.open.call_count, 2)
        self.assertFalse(path.exists())

    def test_unreachable_uploaded_cdn_reference_never_submits_and_cleans_all_local_assets(self):
        paths = [Path(self.bridge.workspace.name) / f'reference-{i}.png' for i in range(2)]
        for path in paths:
            path.write_bytes(b'png')
        url = 'https://ant.alicdn.com/bio/img/f_missing_.png?token=secret'
        with mock.patch.object(self.bridge, 'command', return_value={'url': url}) as cli, \
                mock.patch('if_studio_bridge.build_opener') as build:
            build.return_value.open.side_effect = HTTPError(url, 404, 'NoSuchKey', {}, None)
            self.bridge.generate('missing-reference', {'model': 'Minimax H3', 'prompt': 'test'}, paths)
        job = self.bridge.jobs['missing-reference']
        self.assertEqual(job['state'], 'error')
        self.assertIn('图片1', job['error'])
        self.assertIn('HTTP 404', job['error'])
        self.assertIn('尚未提交生成', job['error'])
        self.assertNotIn('secret', job['error'])
        self.assertEqual(job['result'], {})
        self.assertEqual([call.args[0] for call in cli.call_args_list], ['upload'])
        self.assertTrue(all(not path.exists() for path in paths))

    def test_reused_and_new_references_preserve_order_and_upload_only_new(self):
        cached = 'https://ant.alicdn.com/bio/img/f_cached.png'
        fresh = 'https://ant.alicdn.com/bio/img/f_new.mp4'
        path = Path(self.bridge.workspace.name) / 'new.mp4'
        path.write_bytes(b'video')
        refs = [{'kind': 'image', 'url': cached}, {'kind': 'video', 'asset_id': 'a' * 32},
                {'kind': 'image', 'url': cached}]
        def command(*args, **kwargs):
            if args[0] == 'upload':
                self.assertEqual(self.bridge.jobs['reuse']['result']['reference_urls'],
                                 [{'index': 0, 'kind': 'image', 'url': cached}])
                return {'url': fresh}
            if args[:2] == ('canvas', 'run'):
                return {'status': 'created', 'canvas_id': 'c1', 'session_id': 's1'}
            return {'status': 'done', 'downloaded': []}
        with mock.patch.object(self.bridge, 'command', side_effect=command) as cli, \
                mock.patch('if_studio_bridge.prepare_if_reference', side_effect=lambda value: value):
            self.bridge.generate('reuse', {'model': 'Minimax H3', 'prompt': 'test', 'references': refs}, [path])
        job = self.bridge.jobs['reuse']
        self.assertEqual(job['state'], 'done')
        self.assertEqual(job['result']['submitted_prompt'],
                         f'图片1：{cached}\n视频1：{fresh}\n图片2：{cached}\n\n使用模型：Minimax H3\n\n生成需求：\ntest')
        self.assertEqual([call.args[0] for call in cli.call_args_list], ['upload', 'canvas', 'canvas'])
        self.assertEqual(len(job['result']['reference_urls']), 3)
        self.assertFalse(path.exists())
        refs = [{'kind': item['kind'], 'url': item['url']} for item in job['result']['reference_urls']]
        with mock.patch.object(self.bridge, 'command', side_effect=[
                {'status': 'created', 'canvas_id': 'c2', 'session_id': 's2'}, {'status': 'done'}]) as cli, \
                mock.patch('if_studio_bridge.prepare_if_reference', side_effect=lambda value: value):
            self.bridge.generate('reuse-all', {'model': 'Minimax H3', 'prompt': 'new prompt', 'references': refs})
        self.assertEqual(self.bridge.jobs['reuse-all']['state'], 'done')
        self.assertEqual([call.args[:2] for call in cli.call_args_list], [('canvas', 'run'), ('canvas', 'poll')])

    def test_partial_upload_success_survives_failure_and_invalid_reuse_never_generates(self):
        url = 'https://ant.alicdn.com/bio/img/f_uploaded.png'
        paths = [Path(self.bridge.workspace.name) / f'partial-{i}.png' for i in range(2)]
        for path in paths:
            path.write_bytes(b'image')
        refs = [{'kind': 'image', 'asset_id': letter * 32} for letter in ('a', 'b')]
        with mock.patch.object(self.bridge, 'command', side_effect=[{'url': url}, RuntimeError('upload failed')]) as cli, \
                mock.patch('if_studio_bridge.prepare_if_reference', side_effect=lambda value: value):
            self.bridge.generate('partial', {'model': 'qwen-image-2.0', 'prompt': 'test', 'references': refs}, paths)
        result = self.bridge.jobs['partial']['result']
        self.assertEqual(result['reference_urls'], [{'index': 0, 'kind': 'image', 'url': url}])
        self.assertTrue(all(not path.exists() for path in paths))
        self.assertTrue(all(call.args[0] == 'upload' for call in cli.call_args_list))
        refs = [{'kind': 'image', 'url': url}]
        with mock.patch.object(self.bridge, 'command') as cli, \
                mock.patch('if_studio_bridge.prepare_if_reference', side_effect=RuntimeError('HTTP 404，尚未提交生成')):
            self.bridge.generate('expired', {'model': 'qwen-image-2.0', 'prompt': 'test', 'references': refs})
        self.assertEqual(self.bridge.jobs['expired']['result']['invalid_reference_indices'], [0])
        cli.assert_not_called()
        with mock.patch.object(self.bridge, 'command', side_effect=RuntimeError('generation failed')), \
                mock.patch('if_studio_bridge.prepare_if_reference', return_value=url):
            self.bridge.generate('failed-after-upload', {'model': 'qwen-image-2.0', 'prompt': 'test', 'references': refs})
        self.assertEqual(self.bridge.jobs['failed-after-upload']['result']['reference_urls'], result['reference_urls'])

    def test_mixed_reference_api_enforces_limits_kinds_and_cdn_origin(self):
        image_id = self.upload()[2]['asset_id']
        url = 'https://ant.alicdn.com/bio/img/f_cached.png'
        good = {'kind': 'image', 'url': url}
        with mock.patch.object(self.bridge, 'command', return_value=MODELS):
            for data in ({'references': [good] * 4}, {'references': [good], 'asset_ids': [image_id]},
                         {'references': [{'kind': 'video', 'asset_id': image_id}]},
                         {'references': [{'kind': 'image', 'asset_id': image_id}] * 2},
                         {'references': [{'kind': 'video', 'url': url}]},
                         {'references': [{'kind': 'image', 'url': 'https://127.0.0.1/private.png'}]},
                         {'references': [{'kind': 'image', 'url': 'https://example.com/f.png'}]},
                         {'references': [{'kind': 'image', 'url': url, 'asset_id': image_id}]},
                         {'references': [good] * 3, 'image': 'https://example.com/extra.png'}):
                self.assertEqual(self.run_request(**data)[0], 400, data)
            self.assertIn(image_id, self.bridge.assets)
            def finish(job_id, request, paths):
                self.assertEqual(request['references'], [good, {'kind': 'image', 'asset_id': image_id}])
                for path in paths:
                    path.unlink()
                self.bridge.jobs[job_id] = {'state': 'done', 'result': {}}
            with mock.patch.object(self.bridge, 'generate', side_effect=finish):
                code, _, body = self.run_request(references=[good, {'kind': 'image', 'asset_id': image_id}])
                self.assertEqual(code, 202)
                for _ in range(100):
                    if self.bridge.jobs[body['id']]['state'] == 'done':
                        break
                    time.sleep(.01)
                self.assertEqual(self.bridge.jobs[body['id']]['state'], 'done')
            self.assertNotIn(image_id, self.bridge.assets)

    def test_video_asset_uploads_once_then_submits_url_in_prompt(self):
        with mock.patch('if_studio_bridge.LIMITS_FILE') as limits:
            limits.read_text.return_value = json.dumps({
                'Minimax H3': {'type': 'video', 'bridge': {'image': 0, 'video': 1}}})
            mp4 = b'\x00\x00\x00\x18ftypisom\x00\x00\x00\x00isomiso2'
            _, _, uploaded = self.upload(mp4, 'video/mp4')
            path = self.bridge.assets[uploaded['asset_id']][0]

            calls = []

            def command(*args, **_):
                if args[0] == 'models':
                    return MODELS
                calls.append(args)
                self.assertIn('--json', args)
                if args[0] == 'upload':
                    self.assertEqual(args[1], str(path))
                    self.assertTrue(path.exists())
                    return {'url': 'https://example.com/uploaded.mp4'}
                self.assertFalse(path.exists())
                if args[:2] == ('canvas', 'run'):
                    self.assertNotIn('--image', args)
                    self.assertEqual(args[-1], '视频1：https://example.com/uploaded.mp4\n\n使用模型：Minimax H3\n\n生成需求：\ngenerate')
                    self.assertEqual(args[args.index('--model') + 1], 'Minimax H3')
                    return {'status': 'created', 'canvas_id': 'c1', 'session_id': 's1'}
                return {'status': 'done', 'downloaded': []}

            with mock.patch.object(self.bridge, 'command', side_effect=command):
                code, _, response = self.run_request(type='video', model='Minimax H3', asset_id=uploaded['asset_id'])
                self.assertEqual(code, 202)
                for _ in range(100):
                    _, _, job = self.request('GET', '/runs/' + response['id'])
                    if job['state'] == 'done':
                        break
                    time.sleep(.01)
                self.assertEqual(job['state'], 'done')
                self.assertFalse(path.exists())
                self.assertEqual([call[:2] for call in calls], [
                    ('upload', str(path)), ('canvas', 'run'), ('canvas', 'poll')])

    def test_asset_failure_deletes_file_and_cannot_replay(self):
        with mock.patch('if_studio_bridge.LIMITS_FILE') as limits:
            limits.read_text.return_value = json.dumps({
                'qwen-image-2.0': {'type': 'image', 'bridge': {'image': 1}}})
            _, _, uploaded = self.upload()
            asset_path = self.bridge.assets[uploaded['asset_id']][0]

            def command(*args, **_):
                if args[0] == 'models':
                    return MODELS
                raise RuntimeError('create failed')

            with mock.patch.object(self.bridge, 'command', side_effect=command):
                code, _, body = self.run_request(asset_id=uploaded['asset_id'])
                self.assertEqual(code, 202)
                for _ in range(100):
                    _, _, job = self.request('GET', '/runs/' + body['id'])
                    if job['state'] == 'error':
                        break
                    time.sleep(.01)
                self.assertEqual(job['state'], 'error')
                self.assertFalse(asset_path.exists())
                self.assertEqual(self.run_request(asset_id=uploaded['asset_id'])[0], 400)

    def test_asset_model_limits_and_duplicate_reference(self):
        with mock.patch.object(self.bridge, 'command', return_value=MODELS), \
                mock.patch('if_studio_bridge.LIMITS_FILE') as limits:
            _, _, image = self.upload()
            mp4 = b'\x00\x00\x00\x18ftypisom\x00\x00\x00\x00isomiso2'
            _, _, video = self.upload(mp4, 'video/mp4')
            limits.read_text.return_value = json.dumps({
                'qwen-image-2.0': {'type': 'image', 'bridge': {'image': 1, 'video': 0}},
                'Minimax H3': {'type': 'video', 'bridge': {'image': 0, 'video': 1}}})
            self.assertEqual(self.run_request(asset_id=video['asset_id'])[0], 400)
            self.assertEqual(self.run_request(asset_id=image['asset_id'], image='https://example.com/x')[0], 400)
            self.assertEqual(self.run_request(asset_id=[image['asset_id'], video['asset_id']])[0], 400)
            self.assertEqual(self.run_request(asset_id=image['asset_id'], audio='https://example.com/x')[0], 400)
            self.assertEqual(self.run_request(asset_id='unknown')[0], 400)
            self.assertEqual(self.run_request(type='video', model='Minimax H3',
                                              asset_ids=[video['asset_id'], video['asset_id']])[0], 400)
            self.assertEqual(self.run_request(type='video', model='Minimax H3',
                                              asset_ids=[image['asset_id']])[0], 400)
            for asset_ids, extra in (([image['asset_id'], image['asset_id']], {}),
                                     ([video['asset_id']], {}),
                                     ([image['asset_id']], {'image': 'https://example.com/opaque'}),
                                     ([image['asset_id']], {'asset_id': image['asset_id']})):
                self.assertEqual(self.run_request(asset_ids=asset_ids, **extra)[0], 400)
            limits.read_text.return_value = json.dumps({
                'qwen-image-2.0': {'type': 'video', 'bridge': {'image': 1}}})
            self.assertEqual(self.run_request(asset_id=image['asset_id'])[0], 400)
            limits.read_text.side_effect = FileNotFoundError()
            self.assertEqual(self.run_request(asset_id=image['asset_id'])[0], 400)
            self.assertEqual(len(self.bridge.assets), 2)
            self.assertEqual(self.run_request(image='https://example.com/ref.png')[0], 400)

    def test_https_reference_obeys_shared_model_limits(self):
        models = MODELS + [{'display_name': 'z-image-turbo', 'type': 'image'},
                           {'display_name': 'Unknown Model', 'type': 'image'}]
        with mock.patch.object(self.bridge, 'command', return_value=models), \
                mock.patch('if_studio_bridge.LIMITS_FILE') as limits:
            limits.read_text.return_value = json.dumps({
                'qwen-image-2.0': {'type': 'image', 'bridge': {'image': 1, 'video': 0}},
                'Minimax H3': {'type': 'video', 'bridge': {'image': 0, 'video': 1}},
                'z-image-turbo': {'type': 'image', 'bridge': {'image': 0, 'video': 0}}})
            for overrides in (
                    {'model': 'z-image-turbo', 'image': 'https://example.com/ref.png'},
                    {'model': 'z-image-turbo', 'image': 'https://example.com/opaque'},
                    {'image': 'https://example.com/clip.mp4'},
                    {'image': 'https://example.com/clip.webm'},
                    {'image': 'https://example.com/voice.mp3'},
                    {'type': 'video', 'model': 'Minimax H3', 'image': 'https://example.com/ref.webp'}):
                self.assertEqual(self.run_request(**overrides)[0], 400)
            self.assertFalse(self.bridge.jobs)

            def finish(job_id, *_):
                with self.bridge.lock:
                    self.bridge.jobs[job_id] = {'state': 'done', 'result': {}}

            with mock.patch.object(self.bridge, 'generate', side_effect=finish) as generate:
                for overrides in ({'image': 'https://example.com/ref.png?token=1'},
                                  {'image': 'https://example.com/opaque'},
                                  {'type': 'video', 'model': 'Minimax H3',
                                   'image': 'https://example.com/clip.mp4'},
                                  {'model': 'z-image-turbo'},
                                  {'model': 'Unknown Model', 'image': 'https://example.com/ref.png'}):
                    code, _, body = self.run_request(**overrides)
                    self.assertEqual(code, 202)
                    for _ in range(100):
                        with self.bridge.lock:
                            state = self.bridge.jobs[body['id']]['state']
                        if state == 'done':
                            break
                        time.sleep(.01)
                    self.assertEqual(state, 'done')
                self.assertEqual(generate.call_count, 5)

    def test_image_multiple_references_generate_once_with_all_urls(self):
        ids = [self.upload()[2]['asset_id'] for _ in range(2)]
        paths = [self.bridge.assets[item][0] for item in ids]
        calls = []

        def command(*args, **_):
            if args[0] == 'models':
                return MODELS
            calls.append(args)
            if args[0] == 'upload':
                return {'url': f'https://example.com/{Path(args[1]).name}'}
            if args[:2] == ('canvas', 'run'):
                return {'status': 'created', 'canvas_id': 'image-c', 'session_id': 'image-s'}
            return {'status': 'done', 'downloaded': []}

        with mock.patch.object(self.bridge, 'command', side_effect=command):
            code, _, response = self.run_request(asset_ids=ids, image='https://example.com/third.png')
            self.assertEqual(code, 202)
            for _ in range(100):
                _, _, job = self.request('GET', '/runs/' + response['id'])
                if job['state'] == 'done':
                    break
                time.sleep(.01)
            self.assertEqual(job['state'], 'done')
        self.assertEqual([call[0] for call in calls[:2]], ['upload', 'upload'])
        runs = [call for call in calls if call[:2] == ('canvas', 'run')]
        self.assertEqual(len(runs), 1)
        self.assertIn('--create-only', runs[0])
        self.assertNotIn('--image', runs[0])
        self.assertEqual(runs[0][runs[0].index('--model') + 1], 'qwen-image-2.0')
        expected = (f'图片1：https://example.com/{paths[0].name}\n'
                    f'图片2：https://example.com/{paths[1].name}\n'
                    '图片3：https://example.com/third.png\n\n使用模型：qwen-image-2.0\n\n生成需求：\ngenerate')
        self.assertEqual(runs[0][-1], expected)
        self.assertEqual(job['result']['submitted_prompt'], expected)
        self.assertEqual(expected.count('使用模型：qwen-image-2.0'), 1)
        self.assertNotIn('--canvas-id', runs[0])
        self.assertEqual(calls[-1][calls[-1].index('--canvas-id') + 1], 'image-c')
        self.assertEqual(calls[-1][calls[-1].index('--session-id') + 1], 'image-s')
        self.assertEqual([call[:2] for call in calls].count(('canvas', 'poll')), 1)
        self.assertEqual(calls[-1][:2], ('canvas', 'poll'))
        self.assertTrue(all(not path.exists() for path in paths))

    def test_image_limits_count_local_and_https_references_together(self):
        ids = [self.upload()[2]['asset_id'] for _ in range(4)]
        with mock.patch.object(self.bridge, 'command', return_value=MODELS):
            for asset_ids, extra in ((ids, {}), (ids[:3], {'image': 'https://example.com/opaque'})):
                self.assertEqual(self.run_request(asset_ids=asset_ids, **extra)[0], 400)
        self.assertEqual(len(self.bridge.assets), 4)
        self.assertFalse(self.bridge.jobs)

    def test_video_references_continue_one_canvas_and_return_cli_failure(self):
        png = b'\x89PNG\r\n\x1a\n' + b'0' * 32
        mp4 = b'\x00\x00\x00\x18ftypisom\x00\x00\x00\x00isomiso2'
        uploaded = [self.upload(data, content_type)[2]['asset_id'] for data, content_type in (
            (mp4, 'video/mp4'), (png, 'image/png'), (png, 'image/png'))]
        paths = [str(self.bridge.assets[item][0]) for item in uploaded]
        urls = ['https://example.com/uploaded.mp4', 'https://example.com/a.png', 'https://example.com/b.png']
        calls = []

        def command(*args, **_):
            if args[0] == 'models':
                return MODELS
            calls.append(args)
            self.assertIn('--json', args)
            if args[0] == 'upload':
                self.assertTrue(Path(args[1]).exists())
                return {'url': urls[paths.index(args[1])]}
            if args[:2] == ('canvas', 'run'):
                self.assertTrue(all(not Path(path).exists() for path in paths))
                return {'status': 'created', 'canvas_id': 'c1', 'session_id': 's1'}
            return {'status': 'done', 'downloaded': []}

        with mock.patch.object(self.bridge, 'command', side_effect=command):
            code, _, response = self.run_request(type='video', model='Minimax H3',
                asset_ids=uploaded, image='https://example.com/clip.mp4', prompt='最终生成视频', skill='商品展示')
            self.assertEqual(code, 202)
            for _ in range(100):
                _, _, job = self.request('GET', '/runs/' + response['id'])
                if job['state'] == 'done':
                    break
                time.sleep(.01)
            self.assertEqual(job['state'], 'done')
        runs = [call for call in calls if call[:2] == ('canvas', 'run')]
        self.assertEqual(len(runs), 1)
        self.assertEqual([call[1] for call in calls if call[0] == 'upload'], paths)
        self.assertTrue(all(call[0] == 'upload' for call in calls[:3]))
        self.assertNotIn('--image', runs[0])
        self.assertNotIn('--canvas-id', runs[0])
        expected = ('视频1：https://example.com/uploaded.mp4\n图片1：https://example.com/a.png\n'
                    '图片2：https://example.com/b.png\n视频2：https://example.com/clip.mp4\n\n使用模型：Minimax H3\n\n生成需求：\n最终生成视频')
        self.assertEqual(runs[0][-1], expected)
        self.assertEqual(job['result']['submitted_prompt'], expected)
        self.assertEqual(runs[0][runs[0].index('--skill') + 1], '商品展示')
        self.assertEqual(runs[0][runs[0].index('--model') + 1], 'Minimax H3')
        self.assertEqual(expected.count('使用模型：Minimax H3'), 1)
        self.assertIn('--create-only', runs[0])
        self.assertEqual(calls[-1][:2], ('canvas', 'poll'))
        self.assertEqual(len([call for call in calls if call[:2] == ('canvas', 'poll')]), 1)
        self.assertTrue(all(not Path(path).exists() for path in paths))

        with mock.patch('if_studio_bridge.subprocess.run', return_value=mock.Mock(
                returncode=1, stderr='IFS refused the reference: Bearer secret-token', stdout='')):
            with self.assertRaisesRegex(RuntimeError, 'IFS refused the reference') as failure:
                self.bridge.command('canvas', 'run')
        self.assertNotIn('secret-token', str(failure.exception))

    def test_busy_existing_session_retries_single_demand_without_reupload(self):
        for kind, model in (('image', 'qwen-image-2.0'), ('video', 'Minimax H3')):
            with self.subTest(kind=kind):
                job_id = 'busy-' + kind
                paths = [Path(self.bridge.workspace.name) / f'{kind}-{n}.png' for n in range(2)]
                for path in paths:
                    path.write_bytes(b'fake-image')
                accepted, attempts, uploads, polls = [], [], [], []
                busy = True

                def process(argv, **_):
                    nonlocal busy
                    args = tuple(argv[1:])
                    result = {'status': 'created', 'canvas_id': 'c1', 'session_id': 's1'}
                    if args[0] == 'upload':
                        uploads.append(args[1])
                        result = {'url': f'https://example.com/{Path(args[1]).name}'}
                    elif args[:2] == ('canvas', 'run'):
                        attempts.append(args)
                        self.assertEqual(args[args.index('--canvas-id') + 1], 'c1')
                        self.assertEqual(args[args.index('--session-id') + 1], 's1')
                        if busy:
                            return mock.Mock(returncode=1, stdout='', stderr=BUSY_ERROR)
                        accepted.append(args)
                        busy = True
                    else:
                        polls.append(args)
                        self.assertEqual(len(accepted), 1, 'poll only after the single demand is accepted')
                        result = {'status': 'done', 'downloaded': []}
                    return mock.Mock(returncode=0, stderr='', stdout=json.dumps(result))

                def release_previous_round(seconds):
                    nonlocal busy
                    self.assertEqual(seconds, 15)
                    _, _, state = self.request('GET', '/runs/' + job_id)
                    self.assertEqual(state['state'], 'starting')
                    self.assertIn('正在等待上一轮结束', state['step'])
                    self.assertNotIn('progress', state)
                    self.assertTrue(busy)
                    busy = False

                with mock.patch('if_studio_bridge.subprocess.run', side_effect=process), \
                        mock.patch('if_studio_bridge.time.sleep', side_effect=release_previous_round) as pause:
                    self.bridge.generate(job_id, {'type': kind, 'model': model, 'prompt': '最终需求',
                        'canvas_id': 'c1', 'session_id': 's1'}, paths)
                self.assertEqual(self.bridge.jobs[job_id]['state'], 'done')
                self.assertEqual(uploads, list(map(str, paths)))
                self.assertEqual(len(accepted), 1)
                self.assertEqual(len(attempts), 2)
                self.assertEqual(attempts[0], attempts[1], 'retry keeps all URLs and the same demand')
                for number, path in enumerate(paths, 1):
                    self.assertIn(f'图片{number}：https://example.com/{path.name}', accepted[0][-1])
                self.assertNotIn('--image', accepted[0])
                self.assertEqual(len(polls), 1)
                self.assertEqual(pause.call_count, 1)
                self.assertTrue(all(not path.exists() for path in paths))

    def test_busy_retry_is_bounded_and_never_polls_unaccepted_demand(self):
        busy = mock.Mock(returncode=1, stdout='', stderr=BUSY_ERROR + ' token=hidden-secret')
        with mock.patch('if_studio_bridge.subprocess.run', side_effect=[busy] * 21) as cli, \
                mock.patch('if_studio_bridge.time.sleep') as pause:
            self.bridge.generate('busy-limit', {'type': 'image', 'model': 'qwen-image-2.0',
                'prompt': '最终需求', 'image': 'https://example.com/ref.png', 'canvas_id': 'c1', 'session_id': 's1'})
        self.assertEqual(pause.call_count, 20)
        self.assertTrue(all(call.args == (15,) for call in pause.call_args_list))
        self.assertEqual(cli.call_count, 21)
        self.assertTrue(all(call.args[0][1:3] == ['canvas', 'run'] for call in cli.call_args_list))
        job = self.bridge.jobs['busy-limit']
        self.assertEqual(job['state'], 'error')
        self.assertIn('已停止自动重试', job['error'])
        self.assertIn('session_busy', job['error'])
        self.assertNotIn('hidden-secret', job['error'])

    def test_ambiguous_send_errors_are_not_retried(self):
        for failure in (subprocess.TimeoutExpired('ifs', 60), OSError('network failed'),
                        mock.Mock(returncode=1, stdout='', stderr='connection reset after sending'),
                        mock.Mock(returncode=1, stdout='', stderr='prompt mentions session_busy'),
                        mock.Mock(returncode=0, stderr='', stdout='invalid JSON')):
            with self.subTest(failure=failure):
                with mock.patch('if_studio_bridge.subprocess.run', side_effect=[failure]) as cli, \
                        mock.patch('if_studio_bridge.time.sleep') as pause:
                    self.bridge.generate('ambiguous', {'type': 'image', 'model': 'qwen-image-2.0',
                        'prompt': '最终需求', 'canvas_id': 'c1', 'session_id': 's1'})
                self.assertEqual(self.bridge.jobs['ambiguous']['state'], 'error')
                self.assertEqual(cli.call_count, 1)
                pause.assert_not_called()

    def test_busy_error_only_retries_known_session_send(self):
        with mock.patch('if_studio_bridge.subprocess.run', return_value=mock.Mock(
                returncode=1, stdout='', stderr=BUSY_ERROR)) as cli, \
                mock.patch('if_studio_bridge.time.sleep') as pause:
            self.bridge.generate('unknown-session', {'model': 'qwen-image-2.0', 'prompt': '需求'})
            self.assertEqual(self.bridge.jobs['unknown-session']['state'], 'error')
            self.assertEqual(cli.call_count, 1)
            pause.assert_not_called()
            with self.assertRaises(RuntimeError) as failure:
                self.bridge.command('canvas', 'poll', '--session-id', 's1')
            self.assertNotIsInstance(failure.exception, SessionBusyError)

    def test_single_submission_error_stops_and_cleans_assets(self):
        image = b'\x89PNG\r\n\x1a\n' + b'0' * 32
        ids = [self.upload(image, 'image/png')[2]['asset_id'] for _ in range(2)]
        paths = [self.bridge.assets[item][0] for item in ids]
        calls = []

        def command(*args, **_):
            if args[0] == 'models':
                return MODELS
            calls.append(args)
            if args[0] == 'upload':
                return {'url': f'https://example.com/{Path(args[1]).name}'}
            raise RuntimeError('IFS 拒绝单轮生成需求')

        with mock.patch.object(self.bridge, 'command', side_effect=command):
            code, _, response = self.run_request(type='video', model='Minimax H3', asset_ids=ids)
            self.assertEqual(code, 202)
            for _ in range(100):
                _, _, job = self.request('GET', '/runs/' + response['id'])
                if job['state'] == 'error':
                    break
                time.sleep(.01)
        self.assertEqual(job['error'], 'IFS 拒绝单轮生成需求')
        self.assertEqual(len(calls), 3)
        self.assertEqual(job['result']['submitted_prompt'], calls[-1][-1])
        self.assertFalse(any(call[:2] == ('canvas', 'poll') for call in calls))
        self.assertTrue(all('--image' not in call for call in calls if call[:2] == ('canvas', 'run')))
        self.assertTrue(all(not path.exists() for path in paths))
        self.assertEqual(self.bridge.asset_slots, 0)

    def test_video_upload_failure_never_sends_reference_or_generation(self):
        for result in ({'error': 'IFS 上传素材被拒绝 token=upload-secret'}, {'url': 'file:///private/image.png'}):
            with self.subTest(result=result):
                paths = [Path(self.bridge.workspace.name) / f'upload-{n}.png' for n in range(2)]
                for path in paths:
                    path.write_bytes(b'fake-image')
                with mock.patch.object(self.bridge, 'command', return_value=result) as cli:
                    self.bridge.generate('upload-error', {'type': 'video', 'model': 'Minimax H3',
                                                         'prompt': '生成视频'}, paths)
                self.assertEqual(self.bridge.jobs['upload-error']['state'], 'error')
                self.assertNotIn('upload-secret', self.bridge.jobs['upload-error']['error'])
                self.assertEqual(cli.call_count, 1)
                self.assertEqual(cli.call_args.args[0], 'upload')
                self.assertTrue(all(not path.exists() for path in paths))

    def test_video_final_prompt_failure_does_not_poll(self):
        with mock.patch.object(self.bridge, 'command', return_value={
                'status': 'failed', 'error': 'IFS 拒绝总需求'}) as cli:
            self.bridge.generate('final-error', {'type': 'video', 'model': 'Minimax H3',
                'prompt': '生成视频', 'image': 'https://example.com/ref.png',
                'canvas_id': 'existing-c', 'session_id': 'existing-s'})
        self.assertEqual(self.bridge.jobs['final-error']['state'], 'error')
        self.assertIn('IFS 拒绝总需求', self.bridge.jobs['final-error']['error'])
        self.assertEqual(cli.call_count, 1)
        for call in cli.call_args_list:
            self.assertEqual(call.args[:2], ('canvas', 'run'))
            self.assertEqual(call.args[call.args.index('--canvas-id') + 1], 'existing-c')
            self.assertEqual(call.args[call.args.index('--session-id') + 1], 'existing-s')
        self.assertNotIn('--image', cli.call_args.args)

    def test_video_with_reference_polls_background_summary_without_resubmitting(self):
        created = {'status': 'created', 'canvas_id': 'c1', 'session_id': 's1'}
        background = {'status': 'summary_feedback', 'planning_text': '后台处理中'}
        finished = {'status': 'done', 'downloaded': []}
        with mock.patch.object(self.bridge, 'command', side_effect=[created, background, finished]) as cli, \
                mock.patch('if_studio_bridge.time.sleep') as pause:
            self.bridge.generate('single-run', {'type': 'video', 'model': 'Minimax H3',
                'prompt': '生成视频', 'image': 'https://example.com/ref.png'})
        self.assertEqual([call.args[:2] for call in cli.call_args_list],
                         [('canvas', 'run'), ('canvas', 'poll'), ('canvas', 'poll')])
        self.assertEqual(self.bridge.jobs['single-run']['result']['status'], 'done')
        pause.assert_called_once_with(10)

    def test_background_poll_timeout_does_not_resubmit(self):
        created = {'status': 'created', 'canvas_id': 'c1', 'session_id': 's1'}
        background = {'status': 'summary_feedback', 'planning_text': '后台处理中'}
        with mock.patch.object(self.bridge, 'command', side_effect=[created, background]) as cli, \
                mock.patch('if_studio_bridge.time.monotonic', side_effect=[0, 901]):
            self.bridge.generate('poll-timeout', {'type': 'video', 'model': 'Minimax H3', 'prompt': '生成视频'})
        self.assertEqual(cli.call_count, 2)
        self.assertEqual(self.bridge.jobs['poll-timeout']['state'], 'error')
        self.assertIn('未重新提交生成', self.bridge.jobs['poll-timeout']['error'])
        self.assertEqual(self.bridge.jobs['poll-timeout']['result']['submitted_prompt'], '使用模型：Minimax H3\n\n生成需求：\n生成视频')

    def test_structured_cli_errors_redact_credentials(self):
        with mock.patch.object(self.bridge, 'command', return_value={
                'status': 'failed', 'error': '引用失败 {"token":"json-secret"} https://example.com/ref.png?key=url-secret'}):
            self.bridge.generate('redaction', {'type': 'video', 'model': 'Minimax H3',
                                             'prompt': '生成视频', 'image': 'https://example.com/ref.png'})
        error = self.bridge.jobs['redaction']['error']
        self.assertIn('引用失败', error)
        self.assertNotIn('json-secret', error)
        self.assertNotIn('url-secret', error)

    def test_fallback_rejects_video_references_above_each_kind_limit(self):
        models = MODELS + [{'display_name': '星辰图生视频', 'type': 'video'}]
        image = b'\x89PNG\r\n\x1a\n' + b'0' * 32
        video = b'\x00\x00\x00\x18ftypisom\x00\x00\x00\x00isomiso2'
        images = [self.upload(image, 'image/png')[2]['asset_id'] for _ in range(7)]
        videos = [self.upload(video, 'video/mp4')[2]['asset_id'] for _ in range(2)]
        with mock.patch.object(self.bridge, 'command', return_value=models):
            for asset_ids in (images, videos, images[:6] + videos):
                self.assertEqual(self.run_request(type='video', model='星辰图生视频',
                                                  asset_ids=asset_ids)[0], 400)
        self.assertEqual(len(self.bridge.assets), 9)
        self.assertFalse(self.bridge.jobs)

    def test_fallback_reference_boundaries_for_known_and_new_models(self):
        cases = [('z-image-turbo', 'image', 1), ('Nano Banana Pro', 'image', 3),
                 ('万相2.7图像生成', 'image', 3), ('即梦5.0', 'image', 10),
                 ('New IF Image', 'image', 3), ('星辰图生视频', 'video', 6),
                 ('可灵3.0 Omni', 'video', 4), ('HappyHorse-1.1视频', 'video', 9),
                 ('HappyHorse-1.0视频【内测】', 'video', 9), ('New IF Video', 'video', 6)]
        models = MODELS + [{'display_name': name, 'type': kind} for name, kind, _ in cases]
        images = [{'kind': 'image', 'url': f'https://ant.alicdn.com/bio/img/f_test_{i}.png'}
                  for i in range(11)]
        videos = [{'kind': 'video', 'url': f'https://ant.alicdn.com/bio/img/f_test_{i}.mp4'}
                  for i in range(2)]
        finished = threading.Event()

        def finish(job_id, _request, _paths):
            with self.bridge.lock:
                self.bridge.jobs[job_id] = {'state': 'done', 'result': {}}
            finished.set()

        with mock.patch.object(self.bridge, 'command', return_value=models), \
                mock.patch.object(self.bridge, 'generate', side_effect=finish) as generate:
            for name, kind, maximum in cases:
                with self.subTest(model=name):
                    allowed = images[:maximum] + (videos[:1] if kind == 'video' else [])
                    for refs in (images[:maximum + 1], images[:maximum] + videos[:2],
                                 [{'kind': 'audio', 'url': 'https://ant.alicdn.com/bio/audio/f_test.mp3'}]):
                        self.assertEqual(self.run_request(type=kind, model=name, references=refs)[0], 400)
                    finished.clear()
                    self.assertEqual(self.run_request(type=kind, model=name, references=allowed)[0], 202)
                    self.assertTrue(finished.wait(2))
                    self.assertEqual(generate.call_args.args[1]['references'], allowed)
            self.assertEqual(generate.call_count, len(cases))
            self.assertEqual(self.run_request(model='Not in CLI', references=images[:1])[0], 400)

    def test_unverified_video_models_allow_one_image_or_video_reference(self):
        models = MODELS + [{'display_name': name, 'type': 'video'}
                           for name in ('星辰图生视频', '可灵3.0 Omni')]

        def finish(job_id, _request, asset_paths):
            for path in asset_paths:
                path.unlink()
            with self.bridge.lock:
                self.bridge.jobs[job_id] = {'state': 'done', 'result': {}}

        with mock.patch.object(self.bridge, 'command', return_value=models), \
                mock.patch.object(self.bridge, 'generate', side_effect=finish) as generate:
            for name in ('星辰图生视频', '可灵3.0 Omni'):
                for payload, content_type in (
                        (b'\x89PNG\r\n\x1a\n' + b'0' * 32, 'image/png'),
                        (b'\x00\x00\x00\x18ftypisom\x00\x00\x00\x00isomiso2', 'video/mp4')):
                    _, _, uploaded = self.upload(payload, content_type)
                    code, _, body = self.run_request(type='video', model=name, asset_id=uploaded['asset_id'])
                    self.assertEqual(code, 202, name)
                    for _ in range(100):
                        with self.bridge.lock:
                            state = self.bridge.jobs[body['id']]['state']
                        if state == 'done':
                            break
                        time.sleep(.01)
                    self.assertEqual(state, 'done')
            self.assertEqual(generate.call_count, 4)

    def test_allowed_https_reference_is_forwarded_once(self):
        reference = 'https://example.com/reference.png?token=1'
        calls = []

        def command(*args, **_):
            if args[0] == 'models':
                return MODELS
            calls.append(args)
            if args[:2] == ('canvas', 'run'):
                self.assertNotIn('--image', args)
                self.assertEqual(args[-1], f'图片1：{reference}\n\n使用模型：qwen-image-2.0\n\n生成需求：\ngenerate')
                return {'status': 'created', 'canvas_id': 'c1', 'session_id': 's1'}
            return {'status': 'done', 'downloaded': []}

        with mock.patch.object(self.bridge, 'command', side_effect=command):
            code, _, body = self.run_request(image=reference)
            self.assertEqual(code, 202)
            for _ in range(100):
                _, _, job = self.request('GET', '/runs/' + body['id'])
                if job['state'] == 'done':
                    break
                time.sleep(.01)
            self.assertEqual(job['state'], 'done')
        self.assertEqual(sum(call[:2] == ('canvas', 'run') for call in calls), 1)
        self.assertEqual(job['result']['submitted_prompt'], f'图片1：{reference}\n\n使用模型：qwen-image-2.0\n\n生成需求：\ngenerate')
        self.assertFalse(any(call[0] == 'upload' for call in calls))
        self.assertEqual(calls[-1][:2], ('canvas', 'poll'))

    def test_private_network_preflight(self):
        code, headers, _ = self.request('OPTIONS', '/runs', headers={
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type,x-chouka-if',
            'Access-Control-Request-Private-Network': 'true',
        })
        self.assertEqual(code, 204)
        self.assertEqual(headers['Access-Control-Allow-Private-Network'], 'true')
        code, headers, _ = self.request('OPTIONS', '/models', headers={
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Private-Network': 'true',
        })
        self.assertEqual(code, 204)
        self.assertEqual(headers['Access-Control-Allow-Methods'], 'GET')


class ManagedBridgeTest(unittest.TestCase):
    def test_closed_manager_pipe_cleans_temporary_workspace(self):
        with tempfile.TemporaryDirectory(prefix='chouka-managed-test-') as directory:
            env = os.environ.copy()
            env.update({'TMPDIR': directory, 'TEMP': directory, 'TMP': directory})
            bridge = Path(__file__).resolve().parents[1] / 'server' / 'if_studio_bridge.py'
            result = subprocess.run([sys.executable, '-B', str(bridge), '--origin', ORIGIN,
                                     '--port', '0', '--manager-stdin'], input=b'stop',
                                    capture_output=True, timeout=8, env=env)
            self.assertEqual(result.returncode, 0, result.stderr.decode(errors='replace'))
            self.assertEqual(list(Path(directory).iterdir()), [])


if __name__ == '__main__':
    unittest.main()
