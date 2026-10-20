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

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
from if_studio_bridge import Bridge, LIMITS_FILE

ORIGIN = 'http://127.0.0.1:8201'
SECOND_ORIGIN = 'http://127.0.0.1:8199'
LOCALHOST_ORIGIN = 'http://localhost:8199'
SECURE_ORIGIN = 'https://dinghaichouka.youku.com:8443'
MODELS = [{'display_name': 'qwen-image-2.0', 'type': 'image'},
          {'display_name': 'Minimax H3', 'type': 'video'}]


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
                self.assertEqual((code, body), (200, {'ready': True}))
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
            self.assertEqual((code, body['models']), (200, MODELS))
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
        created = {'status': 'created', 'canvas_id': 'c1', 'session_id': 's1'}
        with mock.patch.object(self.bridge, 'command', side_effect=[
                created, {'status': 'failed', 'message': 'IFS 不接受此引用组合'}]):
            self.bridge.generate('failed-video', {'model': 'Minimax H3', 'prompt': '生成视频'})
        self.assertEqual(self.bridge.jobs['failed-video']['state'], 'error')
        self.assertIn('IFS 不接受此引用组合', self.bridge.jobs['failed-video']['error'])

    def upload(self, body=b'\x89PNG\r\n\x1a\n' + b'0' * 32, content_type='image/png', **kwargs):
        return self.request('POST', '/assets', body, headers={
            'Content-Type': content_type, 'X-Chouka-IF': 'asset', **kwargs.pop('headers', {})}, **kwargs)

    def run_request(self, **overrides):
        data = {'type': 'image', 'model': 'qwen-image-2.0', 'prompt': 'generate', **overrides}
        return self.request('POST', '/runs', json.dumps(data), headers={
            'Content-Type': 'application/json', 'X-Chouka-IF': 'generate'})

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

    def test_image_asset_uploads_once_and_is_deleted_before_reference_round(self):
        with mock.patch('if_studio_bridge.LIMITS_FILE') as limits:
            limits.read_text.return_value = json.dumps({
                'qwen-image-2.0': {'type': 'image', 'bridge': {'image': 1, 'video': 0}}})
            code, _, body = self.upload()
            self.assertEqual(code, 201)
            asset_id = body['asset_id']
            asset_path = self.bridge.assets[asset_id][0]
            created = threading.Event()
            release = threading.Event()
            calls = []

            def command(*args, **_):
                if args[0] == 'models':
                    return MODELS
                calls.append(args)
                if args[0] == 'upload':
                    self.assertEqual(args[1], str(asset_path))
                    self.assertTrue(asset_path.exists())
                    created.set()
                    self.assertTrue(release.wait(2))
                    return {'url': 'https://example.com/uploaded.png'}
                self.assertFalse(asset_path.exists())
                if args[:2] == ('canvas', 'run'):
                    if '--image' in args:
                        self.assertEqual(args[args.index('--image') + 1], 'https://example.com/uploaded.png')
                        self.assertIn('图片1', args[-1])
                        self.assertIn('本轮不要生成任何内容', args[-1])
                    else:
                        self.assertIn('总需求', args[-1])
                        self.assertEqual(args[args.index('--model') + 1], 'qwen-image-2.0')
                    return {'status': 'created', 'canvas_id': 'c1', 'session_id': 's1'}
                return {'status': 'done', 'downloaded': []}

            with mock.patch.object(self.bridge, 'command', side_effect=command):
                code, _, body = self.run_request(asset_id=asset_id)
                self.assertEqual(code, 202)
                self.assertTrue(created.wait(2))
                try:
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
            self.assertEqual(len([args for args in calls if args[:2] == ('canvas', 'run')]), 2)
            self.assertEqual(len([args for args in calls if args[0] == 'upload']), 1)
            self.assertEqual(calls[-1][:2], ('canvas', 'poll'))

    def test_video_asset_uploads_once_then_registers_before_final_prompt(self):
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
                    if '--image' in args:
                        self.assertEqual(args[args.index('--image') + 1], 'https://example.com/uploaded.mp4')
                        self.assertIn('视频1', args[-1])
                        self.assertIn('本轮不要生成任何内容', args[-1])
                        self.assertNotIn('--model', args)
                    else:
                        self.assertIn('总需求', args[-1])
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
                    ('upload', str(path)), ('canvas', 'run'), ('canvas', 'run'), ('canvas', 'poll')])

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
                'Minimax H3': {'type': 'video', 'bridge': {'image': 1}}})
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
                    {'model': 'Unknown Model', 'image': 'https://example.com/ref.png'},
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
                                  {'model': 'Unknown Model'}):
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

    def test_image_multiple_references_register_then_generate_once(self):
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
        self.assertEqual(len(runs), 4)
        for number, call in enumerate(runs[:-1], 1):
            self.assertIn(f'引用名为「图片{number}」', call[-1])
            self.assertIn('本轮不要生成任何内容', call[-1])
            self.assertIn('--create-only', call)
            self.assertNotIn('--model', call)
        self.assertNotIn('--image', runs[-1])
        self.assertEqual(runs[-1][runs[-1].index('--model') + 1], 'qwen-image-2.0')
        self.assertIn('图片1、图片2、图片3', runs[-1][-1])
        for call in runs[1:]:
            self.assertEqual(call[call.index('--canvas-id') + 1], 'image-c')
            self.assertEqual(call[call.index('--session-id') + 1], 'image-s')
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
        self.assertEqual(len(runs), 5)
        self.assertEqual([call[1] for call in calls if call[0] == 'upload'], paths)
        self.assertTrue(all(call[0] == 'upload' for call in calls[:3]))
        self.assertEqual([call[call.index('--image') + 1] for call in runs[:-1]],
                         urls + ['https://example.com/clip.mp4'])
        self.assertNotIn('--image', runs[-1])
        self.assertNotIn('--canvas-id', runs[0])
        for call in runs[1:]:
            self.assertEqual(call[call.index('--canvas-id') + 1], 'c1')
            self.assertEqual(call[call.index('--session-id') + 1], 's1')
        self.assertEqual(runs[-1][-1], '基于以上已登记的全部参考素材（视频1、图片1、图片2、视频2），执行以下总需求：\n\n最终生成视频')
        self.assertEqual(runs[-1][runs[-1].index('--skill') + 1], '商品展示')
        for call, name in zip(runs[:-1], ('视频1', '图片1', '图片2', '视频2')):
            self.assertIn(f'引用名为「{name}」', call[-1])
            self.assertIn('本轮不要生成任何内容', call[-1])
            self.assertIn('不要调用生图或生视频工具', call[-1])
            self.assertNotIn('--model', call)
            self.assertNotIn('--skill', call)
            self.assertIn('--create-only', call)
        self.assertEqual(calls[-1][:2], ('canvas', 'poll'))
        self.assertEqual(len([call for call in calls if call[:2] == ('canvas', 'poll')]), 1)
        self.assertTrue(all(not Path(path).exists() for path in paths))

        with mock.patch('if_studio_bridge.subprocess.run', return_value=mock.Mock(
                returncode=1, stderr='IFS refused the reference: Bearer secret-token', stdout='')):
            with self.assertRaisesRegex(RuntimeError, 'IFS refused the reference') as failure:
                self.bridge.command('canvas', 'run')
        self.assertNotIn('secret-token', str(failure.exception))

    def test_second_reference_cli_error_stops_chain_and_cleans_assets(self):
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
            if len([call for call in calls if call[:2] == ('canvas', 'run')]) == 2:
                raise RuntimeError('IFS 拒绝第二张引用图片')
            return {'status': 'created', 'canvas_id': 'c1', 'session_id': 's1'}

        with mock.patch.object(self.bridge, 'command', side_effect=command):
            code, _, response = self.run_request(type='video', model='Minimax H3', asset_ids=ids)
            self.assertEqual(code, 202)
            for _ in range(100):
                _, _, job = self.request('GET', '/runs/' + response['id'])
                if job['state'] == 'error':
                    break
                time.sleep(.01)
        self.assertEqual(job['error'], 'IFS 拒绝第二张引用图片')
        self.assertEqual(len(calls), 4)
        self.assertFalse(any(call[:2] == ('canvas', 'poll') for call in calls))
        self.assertTrue(all('--image' in call for call in calls if call[:2] == ('canvas', 'run')))
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
        created = {'status': 'created', 'canvas_id': 'existing-c', 'session_id': 'existing-s'}
        with mock.patch.object(self.bridge, 'command', side_effect=[
                created, {'status': 'failed', 'error': 'IFS 拒绝总需求'}]) as cli:
            self.bridge.generate('final-error', {'type': 'video', 'model': 'Minimax H3',
                'prompt': '生成视频', 'image': 'https://example.com/ref.png',
                'canvas_id': 'existing-c', 'session_id': 'existing-s'})
        self.assertEqual(self.bridge.jobs['final-error']['state'], 'error')
        self.assertIn('IFS 拒绝总需求', self.bridge.jobs['final-error']['error'])
        self.assertEqual(cli.call_count, 2)
        for call in cli.call_args_list:
            self.assertEqual(call.args[:2], ('canvas', 'run'))
            self.assertEqual(call.args[call.args.index('--canvas-id') + 1], 'existing-c')
            self.assertEqual(call.args[call.args.index('--session-id') + 1], 'existing-s')
        self.assertNotIn('--image', cli.call_args.args)

    def test_video_polls_once_even_if_cli_returns_background_summary(self):
        created = {'status': 'created', 'canvas_id': 'c1', 'session_id': 's1'}
        background = {'status': 'summary_feedback', 'planning_text': '后台处理中'}
        with mock.patch.object(self.bridge, 'command', side_effect=[created, background]) as cli:
            self.bridge.generate('single-poll', {'type': 'video', 'model': 'Minimax H3', 'prompt': '生成视频'})
        self.assertEqual([call.args[:2] for call in cli.call_args_list], [('canvas', 'run'), ('canvas', 'poll')])
        self.assertEqual(self.bridge.jobs['single-poll']['result']['status'], 'summary_feedback')

    def test_structured_cli_errors_redact_credentials(self):
        with mock.patch.object(self.bridge, 'command', return_value={
                'status': 'failed', 'error': '引用失败 {"token":"json-secret"} https://example.com/ref.png?key=url-secret'}):
            self.bridge.generate('redaction', {'type': 'video', 'model': 'Minimax H3',
                                             'prompt': '生成视频', 'image': 'https://example.com/ref.png'})
        error = self.bridge.jobs['redaction']['error']
        self.assertIn('引用失败', error)
        self.assertNotIn('json-secret', error)
        self.assertNotIn('url-secret', error)

    def test_h3_estimate_rejects_video_references_above_each_kind_limit(self):
        models = MODELS + [{'display_name': '星辰图生视频', 'type': 'video'}]
        image = b'\x89PNG\r\n\x1a\n' + b'0' * 32
        video = b'\x00\x00\x00\x18ftypisom\x00\x00\x00\x00isomiso2'
        images = [self.upload(image, 'image/png')[2]['asset_id'] for _ in range(10)]
        videos = [self.upload(video, 'video/mp4')[2]['asset_id'] for _ in range(4)]
        with mock.patch.object(self.bridge, 'command', return_value=models):
            for asset_ids in (images, videos, images[:9] + videos):
                self.assertEqual(self.run_request(type='video', model='星辰图生视频',
                                                  asset_ids=asset_ids)[0], 400)
        self.assertEqual(len(self.bridge.assets), 14)
        self.assertFalse(self.bridge.jobs)

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
                if '--image' in args:
                    self.assertEqual(args.count('--image'), 1)
                    self.assertEqual(args[args.index('--image') + 1], reference)
                else:
                    self.assertIn('总需求', args[-1])
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
        self.assertEqual(sum('--image' in call for call in calls), 1)
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
