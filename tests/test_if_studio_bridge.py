import http.client
import json
import sys
import threading
import time
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
from if_studio_bridge import Bridge, LIMITS_FILE

ORIGIN = 'http://127.0.0.1:8201'
MODELS = [{'display_name': 'qwen-image-2.0', 'type': 'image'},
          {'display_name': 'Minimax H3', 'type': 'video'}]


class BridgeTest(unittest.TestCase):
    def setUp(self):
        self.bridge = Bridge(('127.0.0.1', 0), ORIGIN, 'ifs.exe')
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
            Bridge(('127.0.0.1', self.bridge.server_port), ORIGIN, 'ifs.exe')

    def test_only_exact_chouka_origin_is_allowed(self):
        with mock.patch.object(self.bridge, 'command', return_value={'profiles': {'buc': {
                'registry': 'ifs.alibaba-inc.com', 'has_ifs_token': True}}}):
            code, headers, body = self.request('GET', '/status')
            self.assertEqual((code, body), (200, {'ready': True}))
            self.assertEqual(headers['Access-Control-Allow-Origin'], ORIGIN)
            code, _, _ = self.request('GET', '/status', origin='https://attacker.example')
            self.assertEqual(code, 403)
            code, _, _ = self.request('GET', '/status', origin='null')
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
            conn = http.client.HTTPConnection('127.0.0.1', self.bridge.server_port, timeout=3)
            conn.request('GET', f'/runs/{job_id}/media/0', headers={'Origin': ORIGIN, 'Range': 'bytes=5-9'})
            ranged = conn.getresponse()
            self.assertEqual((ranged.status, ranged.read()), (206, b'image'))
            conn.close()

    def test_background_video_summary_is_rechecked_without_resubmitting(self):
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

    def test_upload_rejects_invalid_media_size_and_origin(self):
        for payload, content_type in ((b'not png', 'image/png'),
                                      (b'\x89PNG\r\n\x1a\n', 'image/gif'),
                                      (b'RIFFxxxxNOTWEBP', 'image/webp'),
                                      (b'\x00' * 32, 'video/mp4')):
            self.assertEqual(self.upload(payload, content_type)[0], 400)
        self.assertEqual(self.upload(headers={'X-Chouka-IF': 'generate'})[0], 403)
        self.assertEqual(self.upload(origin='https://foreign.example')[0], 403)
        self.assertEqual(self.upload(headers={'Host': 'evil.example'})[0], 403)
        for media_type, maximum in (('image/png', 20 * 1024 * 1024),
                                    ('video/mp4', 50 * 1024 * 1024)):
            self.assertEqual(self.upload(b'', media_type, headers={
                'Content-Length': str(maximum + 1)})[0], 400)
        self.assertEqual(self.upload(b'', headers={'Content-Length': '-1'})[0], 400)
        self.assertFalse(self.bridge.assets)
        self.assertEqual(self.bridge.asset_bytes, 0)

    def test_asset_path_is_used_once_and_deleted_after_create(self):
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
                if args[:2] == ('canvas', 'run'):
                    self.assertEqual(args.count('--image'), 1)
                    self.assertEqual(args[args.index('--image') + 1], str(asset_path))
                    self.assertTrue(asset_path.exists())
                    created.set()
                    self.assertTrue(release.wait(2))
                    return {'status': 'created', 'canvas_id': 'c1', 'session_id': 's1'}
                self.assertFalse(asset_path.exists())
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
            self.assertEqual(len([args for args in calls if args[:2] == ('canvas', 'run')]), 1)

    def test_video_asset_uses_file_path_for_video_model(self):
        with mock.patch('if_studio_bridge.LIMITS_FILE') as limits:
            limits.read_text.return_value = json.dumps({
                'Minimax H3': {'type': 'video', 'bridge': {'image': 0, 'video': 1}}})
            mp4 = b'\x00\x00\x00\x18ftypisom\x00\x00\x00\x00isomiso2'
            _, _, uploaded = self.upload(mp4, 'video/mp4')
            path = self.bridge.assets[uploaded['asset_id']][0]

            def command(*args, **_):
                if args[0] == 'models':
                    return MODELS
                if args[:2] == ('canvas', 'run'):
                    self.assertEqual(args[args.index('--image') + 1], str(path))
                    self.assertEqual(args.count('--image'), 1)
                    return {'status': 'created', 'canvas_id': 'c1', 'session_id': 's1'}
                self.assertFalse(path.exists())
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

    def test_allowed_https_reference_is_forwarded_once(self):
        reference = 'https://example.com/reference.png?token=1'

        def command(*args, **_):
            if args[0] == 'models':
                return MODELS
            if args[:2] == ('canvas', 'run'):
                self.assertEqual(args.count('--image'), 1)
                self.assertEqual(args[args.index('--image') + 1], reference)
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


if __name__ == '__main__':
    unittest.main()
