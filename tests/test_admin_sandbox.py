import json
import os
from pathlib import Path
import sqlite3
import sys
import tarfile
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'server'))

import app
from aiohttp.test_utils import TestClient, TestServer
from server.auth_store import AuthStore
from server.local_sandbox import import_archive, sanitize_database, scrub, prepare, check
from server.sandbox import allowed, validate_runtime


class SandboxBoundaryTests(unittest.TestCase):
    def test_only_management_routes_are_allowed(self):
        for method, path in [('GET', '/controller'), ('GET', '/api/capacity'),
                             ('POST', '/api/auth/login'), ('POST', '/api/capacity/estimate'),
                             ('POST', '/api/teams/test/members/batch'),
                             ('PUT', '/api/admin/global-grants/viewer'),
                             ('DELETE', '/api/admin/global-grants/viewer')]:
            self.assertTrue(allowed(method, path), (method, path))
        for method, path in [('POST', '/agent/v1/heartbeat'), ('POST', '/api/generate'),
                             ('POST', '/api/admin/workers/sync-all'), ('POST', '/api/text'),
                             ('POST', '/api/rewrite'), ('GET', '/api/file'),
                             ('GET', '/api/media'), ('POST', '/api/projects'),
                             ('POST', '/api/auth/register'), ('DELETE', '/api/workers/example')]:
            self.assertFalse(allowed(method, path), (method, path))

    def test_creative_ui_resources_are_read_only(self):
        for path in ('/', '/director', '/app.js', '/director.css', '/director.js', '/director_edit.js'):
            for method in ('GET', 'HEAD'):
                self.assertTrue(allowed(method, path), (method, path))
            for method in ('POST', 'PUT', 'PATCH', 'DELETE'):
                self.assertFalse(allowed(method, path), (method, path))
        for method, path in [('POST', '/api/upload'), ('PUT', '/api/projects/example'),
                             ('POST', '/api/projects/example/director/import'),
                             ('POST', '/api/projects/example/director/reference'),
                             ('PUT', '/api/projects/example/director'),
                             ('POST', '/api/projects/example/presence')]:
            self.assertFalse(allowed(method, path), (method, path))

    def test_runtime_requires_correct_marker_and_no_links(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            data = root / 'data'
            data.mkdir()
            with self.assertRaises(RuntimeError):
                validate_runtime(root, data / 'auth.db')
            marker = data / '.admin-sandbox.json'
            marker.write_text(json.dumps({'runtime_root': str(root), 'prepared': True}))
            validate_runtime(root, data / 'auth.db')
            with self.assertRaises(RuntimeError):
                validate_runtime(root, root / 'other.db')
            (root / 'outside').symlink_to(ROOT)
            with self.assertRaises(RuntimeError):
                validate_runtime(root, data / 'auth.db')

    def test_archive_rejects_links_traversal_and_unexpected_files(self):
        import io
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            for index, name in enumerate(('../escape', '/absolute', 'llm.json', 'data/auth.db-wal')):
                archive_path = root / f'{index}.tar'
                with tarfile.open(archive_path, 'w') as archive:
                    entry = tarfile.TarInfo(name)
                    entry.size = 2
                    archive.addfile(entry, io.BytesIO(b'{}'))
                with self.assertRaises(ValueError):
                    import_archive(archive_path, root / 'output')
            archive_path = root / 'link.tar'
            with tarfile.open(archive_path, 'w') as archive:
                entry = tarfile.TarInfo('data/auth.db')
                entry.type = tarfile.SYMTYPE
                entry.linkname = str(ROOT)
                archive.addfile(entry)
            with self.assertRaises(ValueError):
                import_archive(archive_path, root / 'output')

    def test_prepare_round_trip_never_overwrites_source_or_existing_runtime(self):
        import contextlib
        import hashlib
        import io
        from distributed import DistributedStore
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            data = root / 'source/data'
            data.mkdir(parents=True)
            auth = AuthStore(data / 'auth.db')
            original = auth.create_user('snapshot-original', 'Snapshot-Original-74!', role='admin')
            auth.set_ready()
            auth.close()
            controller = DistributedStore(data / 'control.db')
            controller.register_worker('快照机器')
            controller.close()
            (data / 'jobs.json').write_text('[]')
            (data / 'projects').mkdir()
            (root / 'source/snapshot.json').write_text(json.dumps({
                'source': 'https://production.invalid/?X-Amz-Signature=snapshot-secret',
                'tasks': 34}))
            before = hashlib.sha256((data / 'auth.db').read_bytes()).hexdigest()
            archive_path = root / 'snapshot.tar.gz'
            with tarfile.open(archive_path, 'w:gz') as archive:
                archive.add(data, arcname='data')
                archive.add(root / 'source/snapshot.json', arcname='snapshot.json')
            destination = root / 'runtime'
            with contextlib.redirect_stdout(io.StringIO()):
                prepare(destination, archive_path)
            self.assertEqual(check(destination), destination)
            self.assertEqual(before, hashlib.sha256((data / 'auth.db').read_bytes()).hexdigest())
            login = json.loads((destination / 'local-login.json').read_text())
            auth = AuthStore(destination / 'data/auth.db')
            self.assertEqual(auth.get_user(original['id'])['username'], 'snapshot-original')
            session = auth.login(login['username'], login['password'])
            self.assertEqual(session['user']['role'], 'admin')
            auth.close()
            self.assertFalse((destination / 'llm.json').exists())
            self.assertEqual(json.loads((destination / 'snapshot.json').read_text()),
                             {'source': '本地副本已清除', 'tasks': 34})
            with self.assertRaises(ValueError):
                prepare(destination, archive_path)

    def test_prepare_normalizes_paths_before_any_write(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            with mock.patch('server.local_sandbox.SOURCE', root / 'source'):
                (root / 'source').mkdir()
                (root / 'outside').mkdir()
                alias = root / 'alias'
                alias.symlink_to(root / 'source', target_is_directory=True)
                for target in (root / 'outside/../source/runtime', alias / 'runtime'):
                    with self.assertRaisesRegex(ValueError, '项目目录之外'):
                        prepare(target, root / 'missing.tar')
                    self.assertFalse((root / 'source/runtime').exists())

    def test_sanitize_nested_credentials_urls_and_plain_text_preserves_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'control.db'
            database = sqlite3.connect(path)
            database.execute('CREATE TABLE evidence (id TEXT PRIMARY KEY, owner_id TEXT, '
                             'payload_json TEXT, sync_message TEXT, cost REAL, count INTEGER)')
            payload = {'secret': 'nested-secret', 'OpenAI-API-Key': 'provider-secret',
                       'serialized': json.dumps({'api_key': 'encoded-secret', 'count': 4}),
                       'url': 'https://production.invalid/file?X-Amz-Signature=url-secret',
                       'token_count': 19, 'job_id': 'original-job'}
            database.execute('INSERT INTO evidence VALUES (?,?,?,?,?,?)', (
                'evidence-id', 'owner-id', json.dumps(payload),
                'sync failed: Bearer bearer-secret; api_key=plain-secret', 12.5, 3))
            database.commit()
            database.close()
            sanitize_database(path, 'control')
            database = sqlite3.connect(path)
            row = database.execute('SELECT * FROM evidence').fetchone()
            database.close()
            self.assertEqual((row[0], row[1], row[4], row[5]), ('evidence-id', 'owner-id', 12.5, 3))
            cleaned = json.loads(row[2])
            self.assertEqual(cleaned['token_count'], 19)
            self.assertEqual(cleaned['job_id'], 'original-job')
            self.assertEqual(json.loads(cleaned['serialized'])['count'], 4)
            for secret in ('nested-secret', 'provider-secret', 'encoded-secret', 'url-secret',
                           'bearer-secret', 'plain-secret', 'production.invalid'):
                self.assertNotIn(secret, row[2] + row[3])

    def test_sanitize_preserves_distinct_identity_names_and_worker_counts(self):
        from distributed import DistributedStore
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            auth = AuthStore(root / 'auth.db')
            users = [auth.create_user(name, 'Original-Password-74!')
                     for name in ('Basic Alice', 'Basic Bob')]
            auth.close()
            sanitize_database(root / 'auth.db', 'auth')
            auth = AuthStore(root / 'auth.db')
            self.assertEqual([auth.get_user(user['id'])['username'] for user in users],
                             ['Basic Alice', 'Basic Bob'])
            auth.close()
            workers = DistributedStore(root / 'control.db')
            for name in ('Basic GPU-01', 'Basic GPU-02'):
                workers.register_worker(name)
            workers.close()
            sanitize_database(root / 'control.db', 'control')
            workers = DistributedStore(root / 'control.db')
            self.assertEqual({worker['name'] for worker in workers.list_workers()},
                             {'Basic GPU-01', 'Basic GPU-02'})
            workers.close()
            self.assertEqual(scrub({'worker_name': 'Bearer GPU-01', 'job_id': 'Basic job-01'}),
                             {'worker_name': 'Bearer GPU-01', 'job_id': 'Basic job-01'})

    def test_sanitize_removes_sessions_and_passwords_preserves_relationships(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'auth.db'
            store = AuthStore(path)
            user = store.create_user('original', 'Original-Password-74!', role='admin')
            store.set_ready()
            member = store.create_user('original-member', 'Original-Member-74!')
            team = store.create_team('合成关系保留组', user['id'])
            store.add_team_member(team['id'], member['id'], user['id'])
            store.create_project('original-personal', user['id'])
            store.create_project('original-team', user['id'], team_id=team['id'])
            store.register_job('original-job', 'original-personal', user['id'])
            session = store.login('original', 'Original-Password-74!')
            store.set_grant(member['id'], user['id'], 'read', actor_id=user['id'], session_token=session['token'])
            store.set_project_shares('original-personal', [member['id']], [team['id']], user['id'])
            relationships = {}
            for row in store.db.execute("SELECT name FROM sqlite_master WHERE type='table'"):
                table = row[0]
                if table not in {'users', 'sessions', 'notification_outbox'}:
                    quoted = '"' + table.replace('"', '""') + '"'
                    relationships[table] = set(map(tuple, store.db.execute(f'SELECT * FROM {quoted}')))
            store.close()
            sanitize_database(path, 'auth')
            store = AuthStore(path)
            self.assertIsNone(store.get_session(session['token']))
            self.assertEqual(store.get_user(user['id'])['username'], 'original')
            for table, before in relationships.items():
                quoted = '"' + table.replace('"', '""') + '"'
                self.assertEqual(set(map(tuple, store.db.execute(f'SELECT * FROM {quoted}'))), before, table)
            self.assertEqual(store.db.execute('SELECT count(*) FROM sessions').fetchone()[0], 0)
            self.assertNotIn('Original', store.db.execute('SELECT password_hash FROM users').fetchone()[0])
            store.close()
            self.assertEqual(scrub({'nested': {'api_key': 'secret'}, 'count': 3}),
                             {'nested': {'api_key': '本地副本已清除'}, 'count': 3})


class SandboxApplicationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        data = self.root / 'data'
        data.mkdir()
        (self.root / 'pricing.json').write_bytes((ROOT / 'pricing.json').read_bytes())
        (self.root / 'web').mkdir()
        for name in ('controller.html', 'costs.html', 'capacity.html', 'permissions.html', 'teams.html'):
            (self.root / 'web' / name).write_text('<html>test</html>')
        for name in ('admin-shell.css', 'admin-shell.js', 'controller-page.js', 'costs-page.js'):
            (self.root / 'web' / name).write_bytes((ROOT / 'web' / name).read_bytes())
        (data / '.admin-sandbox.json').write_text(json.dumps({
            'runtime_root': str(self.root), 'prepared': True}))
        auth = AuthStore(data / 'auth.db')
        self.admin = auth.create_user('local-admin', 'Local-Admin-74!', role='admin')
        auth.create_user('local-user', 'Local-User-74!')
        auth.set_ready()
        auth.close()
        self.enterContext(mock.patch.dict(os.environ, {'CHOUKA_ADMIN_SANDBOX': '1',
                                                       'CHOUKA_LOCAL_TEST': '0'}))
        for name, value in {'ROOT': self.root, 'CONTROLLER_MODE': True,
                            'EXECUTION_MODE': 'controller', 'PROJ_DIR': data / 'projects',
                            'ARTIFACT_DIR': data / 'artifacts', 'COMFY_INPUT': data / 'disabled-input',
                            'JOBS_FILE': data / 'jobs.json', 'JOBS': {}}.items():
            self.enterContext(mock.patch.object(app, name, value))
        self.enterContext(mock.patch.object(app, 'load_caps', return_value=0))
        self.enterContext(mock.patch.object(app, 'load_jobs'))
        self.dingtalk = self.enterContext(mock.patch.object(app, 'setup_dingtalk'))
        self.lan_ips = self.enterContext(mock.patch.object(app, 'lan_ips'))
        self.application = app.make_app(auth_path=data / 'auth.db')
        self.client = TestClient(TestServer(self.application))
        await self.client.start_server()
        self.addAsyncCleanup(self.client.close)
        self.origin = str(self.client.make_url('/')).rstrip('/')

    async def login(self, username='local-admin', password='Local-Admin-74!'):
        response = await self.client.post('/api/auth/login', json={
            'username': username, 'password': password}, headers={'Origin': self.origin})
        self.assertEqual(response.status, 200, await response.text())
        identity = await response.json()
        return {'Origin': self.origin, 'X-CSRF-Token': identity['csrf_token']}

    async def test_loopback_complete_auth_and_no_background_connections(self):
        self.assertEqual(self.application['bind_host'], '127.0.0.1')
        self.dingtalk.assert_not_called()
        self.lan_ips.assert_not_called()
        self.assertNotIn('ws_task', self.application)
        response = await self.client.get('/api/workers')
        self.assertEqual(response.status, 401)
        await self.login('local-user', 'Local-User-74!')
        response = await self.client.get('/api/workers')
        self.assertEqual(response.status, 403)
        await self.login()
        for path in ('/controller', '/controller/costs', '/controller/capacity', '/admin/permissions', '/teams'):
            response = await self.client.get(path)
            self.assertEqual(response.status, 200, path)
            self.assertEqual(response.headers['X-H3Card-Sandbox'], 'local-copy')
            self.assertIn("frame-ancestors 'none'", response.headers['Content-Security-Policy'])
            self.assertEqual(response.headers['X-Frame-Options'], 'DENY')
        response = await self.client.get('/controller', headers={
            'Sec-Fetch-Site': 'same-site', 'Sec-Fetch-Dest': 'iframe'})
        self.assertIn("frame-ancestors 'none'", response.headers['Content-Security-Policy'])
        response = await self.client.get('/api/health')
        self.assertTrue((await response.json())['sandbox'])
        with self.assertRaisesRegex(RuntimeError, '禁止服务端出站'):
            await self.application['session'].get('http://127.0.0.1:1')

    async def test_management_assets_are_explicitly_registered_without_web_fallback(self):
        await self.login()
        for name in ('admin-shell.css', 'admin-shell.js', 'controller-page.js', 'costs-page.js'):
            response = await self.client.get('/' + name)
            self.assertEqual(response.status, 200, name)
            self.assertEqual(await response.read(), (ROOT / 'web' / name).read_bytes())
            self.assertEqual(response.headers['X-H3Card-Sandbox'], 'local-copy')
        for path in ('/controller.html', '/web/controller.html', '/local-login.json', '/server.log'):
            response = await self.client.get(path)
            self.assertEqual(response.status, 403, path)

    async def test_local_management_writes_still_need_csrf(self):
        headers = await self.login()
        body = {'username': 'created-here', 'password': 'Local-Created-74!', 'role': 'user'}
        response = await self.client.post('/api/admin/users', json=body)
        self.assertEqual(response.status, 403)
        response = await self.client.post('/api/admin/users', json=body, headers={**headers, 'Origin': 'https://evil.invalid'})
        self.assertEqual(response.status, 403)
        response = await self.client.post('/api/admin/users', json=body, headers=headers)
        self.assertEqual(response.status, 201, await response.text())

    async def test_temperature_api_requires_admin_and_bounds_queries(self):
        import time
        store = self.application['distributed']
        worker = store.register_worker('本地温度接口测试')
        worker_id = worker['worker_id']
        store.heartbeat(worker_id, telemetry={'collected_at': time.time(), 'gpus': [
            {'index': index, 'name': 'Test GPU', 'temperature_c': 47}
            for index in (0, 63, 64, 255)]})
        path = f'/api/workers/{worker_id}/temperature'
        response = await self.client.get(path)
        self.assertEqual(response.status, 401)
        await self.login('local-user', 'Local-User-74!')
        response = await self.client.get(path)
        self.assertEqual(response.status, 403)
        await self.login()
        response = await self.client.get(path + '?gpu_index=0&minutes=30')
        self.assertEqual(response.status, 200)
        history = await response.json()
        self.assertEqual(history['worker_id'], worker_id)
        self.assertEqual(history['points'][-1]['temperature_c'], 47)
        self.assertNotIn('worker_token', history)
        for index in (63, 64, 255):
            response = await self.client.get(path + f'?gpu_index={index}&minutes=30')
            self.assertEqual(response.status, 200)
            self.assertEqual((await response.json())['points'][-1]['temperature_c'], 47)
        for query in ('minutes=0', 'minutes=1441', 'minutes=NaN', 'minutes=30.5',
                      'gpu_index=-1', 'gpu_index=256', 'gpu_index=bad'):
            response = await self.client.get(path + '?' + query)
            self.assertEqual(response.status, 400, query)
        response = await self.client.get('/api/workers/missing/temperature')
        self.assertEqual(response.status, 404)

    async def test_capacity_encoding_negotiation_preserves_full_json(self):
        import gzip
        import zlib
        await self.login()
        report = {'groups': [{'spec': {'graph': '完整证据' * 30000}}],
                  'details': [{'job_id': 'one'}], 'details_total': 1}
        with mock.patch.object(app, 'capacity_report', new=mock.AsyncMock(return_value=report)):
            plain = None
            for encoding, expected in (
                ('identity', None), ('', None), ('gzip', 'gzip'),
                ('deflate', 'deflate'), ('GZip;q=1', 'gzip'),
                ('gzip;q=0, deflate;q=0', None), ('gzip;q=0, *;q=1', 'deflate'),
                ('gzip;q=0.8, deflate;q=0.4, identity;q=0', 'gzip'),
                ('gzip;q=0.2, identity;q=1', None), ('xgzip', None),
            ):
                response = await self.client.get('/api/capacity',
                    headers={'Accept-Encoding': encoding}, auto_decompress=False)
                self.assertEqual(response.status, 200, encoding)
                self.assertEqual(response.headers.get('Content-Encoding'), expected, encoding)
                self.assertIn('Accept-Encoding', response.headers['Vary'])
                self.assertEqual(response.content_type, 'application/json')
                wire = await response.read()
                decoded = gzip.decompress(wire) if expected == 'gzip' else zlib.decompress(wire) if expected == 'deflate' else wire
                self.assertEqual(json.loads(decoded), report, encoding)
                if plain is None:
                    plain = decoded
                self.assertEqual(decoded, plain)
                if expected:
                    self.assertLess(len(wire), len(plain) // 10)
            response = await self.client.get('/api/capacity',
                headers={'Accept-Encoding': '*;q=0'}, auto_decompress=False)
            self.assertEqual(response.status, 406)
        response = await self.client.get('/api/capacity', auto_decompress=False,
                                         skip_auto_headers={'Accept-Encoding'})
        self.assertEqual(response.status, 200)
        self.assertNotIn('Content-Encoding', response.headers)

    async def test_worker_execution_and_proxy_routes_blocked_even_for_admin(self):
        headers = await self.login()
        for path in ('/agent/v1/register', '/agent/v1/heartbeat', '/agent/v1/jobs/acquire',
                     '/api/generate', '/api/rewrite', '/api/text', '/api/admin/workers/sync-all'):
            response = await self.client.post(path, json={}, headers=headers)
            self.assertEqual(response.status, 403, path)
            self.assertIn('本地隔离', (await response.json())['error'])
        response = await self.client.get('/api/file?filename=test.png')
        self.assertEqual(response.status, 403)
        response = await self.client.get('/api/health', headers={'Host': 'evil.invalid:18299'})
        self.assertEqual(response.status, 403)
        self.assertFalse(any('/agent/v1/' in str(route.resource) for route in self.application.router.routes()))


if __name__ == '__main__':
    unittest.main()
