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
                             ('POST', '/api/auth/login'), ('POST', '/api/auth/phone'),
                             ('POST', '/api/auth/register'),
                             ('POST', '/api/capacity/estimate'),
                             ('POST', '/api/teams/test/members/batch'),
                             ('PUT', '/api/admin/global-grants/viewer'),
                             ('DELETE', '/api/admin/global-grants/viewer')]:
            self.assertTrue(allowed(method, path), (method, path))
        for method, path in [('POST', '/agent/v1/heartbeat'), ('POST', '/api/generate'),
                             ('POST', '/api/admin/workers/sync-all'), ('POST', '/api/text'),
                             ('POST', '/api/rewrite'), ('GET', '/api/file'),
                             ('GET', '/api/media'), ('POST', '/api/projects'),
                             ('DELETE', '/api/workers/example')]:
            self.assertFalse(allowed(method, path), (method, path))

    def test_generation_worker_picker_is_read_only_and_generation_stays_blocked(self):
        for method in ('GET', 'HEAD'):
            self.assertTrue(allowed(method, '/api/generation/workers'))
            for path in ('/api/generation/workers/', '/api/generation/workers/other',
                         '/api/generation/workers-extra'):
                self.assertFalse(allowed(method, path))
        for method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            self.assertFalse(allowed(method, '/api/generation/workers'))
        self.assertFalse(allowed('POST', '/api/generate'))
        self.assertFalse(allowed('POST', '/agent/v1/jobs/acquire'))

    def test_phone_allowlist_is_exact_and_does_not_open_other_auth_routes(self):
        self.assertTrue(allowed('POST', '/api/auth/phone'))
        for path in ('/api/auth/phone/', '/api/auth/phone/other-user', '/api/auth/phones',
                     '/api/auth/phone-extra', '/api/auth/unknown'):
            for method in ('POST', 'PUT', 'PATCH', 'DELETE'):
                with self.subTest(method=method, path=path):
                    self.assertFalse(allowed(method, path))
        for method in ('GET', 'HEAD'):
            self.assertFalse(allowed(method, '/api/auth/phone'))

    def test_register_allowlist_is_exact_and_keeps_execution_routes_closed(self):
        self.assertTrue(allowed('POST', '/api/auth/register'))
        for path in ('/api/auth/register/', '/api/auth/register/other-user',
                     '/api/auth/register-extra', '/api/auth/registers',
                     '/api/auth/unknown', '/agent/v1/register', '/api/generate'):
            for method in ('POST', 'PUT', 'PATCH', 'DELETE'):
                with self.subTest(method=method, path=path):
                    self.assertFalse(allowed(method, path))
        for method in ('GET', 'HEAD'):
            self.assertFalse(allowed(method, '/api/auth/register'))

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

    async def test_generation_picker_read_allowed_but_target_submission_stays_isolated(self):
        graph = {'1': {'class_type': 'VideoNode', 'inputs': {}}}
        (self.root / 'picker.api.json').write_text(json.dumps(graph), encoding='utf-8')
        cap = {'id': 'picker-video', 'outputType': 'video', '_graph_ok': True,
               'graph': 'picker.api.json'}
        store = self.application['distributed']
        worker_id = store.register_worker('Windows copy', {
            'hardware': {'os': {'name': 'Windows'}}, 'node_classes': ['VideoNode'],
        })['worker_id']
        store.heartbeat(worker_id, comfy_online=True)
        path = '/api/generation/workers?capability=picker-video'
        with mock.patch.dict(app.CAPS, {'picker-video': cap}):
            self.assertEqual((await self.client.get(path)).status, 401)
            headers = await self.login('local-user', 'Local-User-74!')
            response = await self.client.get(path)
            self.assertEqual(response.status, 200, await response.text())
            self.assertEqual(response.headers['X-H3Card-Sandbox'], 'local-copy')
            self.assertEqual(await response.json(), {'controller_mode': True, 'workers': [{
                'id': worker_id, 'name': 'Windows copy', 'state': 'idle', 'selectable': True,
            }]})
            self.assertEqual((await self.client.get('/api/workers')).status, 403)
            self.assertEqual((await self.client.get(path, headers={'Host': 'remote.invalid'})).status, 403)
            response = await self.client.post('/api/generate', headers=headers, json={
                'project': 'p', 'capability': 'picker-video', 'target_worker_id': worker_id,
            })
            self.assertEqual(response.status, 403)
            self.assertIn('本地隔离', (await response.json())['error'])
            self.assertEqual(store.queue_ahead_snapshot(), {})

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

    async def test_registration_is_local_pending_with_phone_and_no_delivery(self):
        store = self.application['auth_store']
        self.assertTrue(self.application['admin_sandbox'])
        self.assertIsNone(self.application.get('dingtalk'))
        sessions_before = set(map(tuple, store.db.execute('SELECT * FROM sessions')))
        with mock.patch.object(self.application['session'], '_request', new=mock.AsyncMock(
                side_effect=AssertionError('注册不得发起出站请求'))) as outbound:
            response = await self.client.post('/api/auth/register', json={
                'username': 'local-registration', 'display_name': '本地注册',
                'password': 'Local-Registration-74!', 'phone': ' \t13800138000\r\n',
            }, headers={'Origin': self.origin})
            self.assertEqual(response.status, 201, await response.text())
            self.assertEqual(response.headers['X-H3Card-Sandbox'], 'local-copy')
            self.assertNotIn('Set-Cookie', response.headers)
            result = await response.json()
            self.assertEqual(result['status'], 'pending')
            self.assertNotIn('phone', result)
            user = next(user for user in store.list_users() if user['username'] == 'local-registration')
            self.assertEqual(user['approval_status'], 'pending')
            self.assertEqual(user['phone'], '13800138000')
            self.assertEqual(store.db.execute('SELECT phone FROM users WHERE id=?',
                                              (user['id'],)).fetchone()[0], '13800138000')
            self.assertEqual(set(map(tuple, store.db.execute('SELECT * FROM sessions'))), sessions_before)
            card = store.registration_card_data(result['request_id'])
            self.assertEqual(card['status'], 'pending')
            self.assertNotIn('phone', card)
            tasks = [dict(row) for row in store.db.execute('SELECT * FROM notification_outbox')]
            self.assertEqual(len(tasks), 1)
            self.assertEqual(tasks[0]['request_id'], result['request_id'])
            self.assertEqual(tasks[0]['kind'], 'send_card')
            self.assertEqual((tasks[0]['status'], tasks[0]['attempts'], tasks[0]['leased_until']),
                             ('pending', 0, 0))
            self.assertEqual(store.outbox_backlog()['pending'], 1)
            denied = await self.client.post('/api/auth/login', json={
                'username': 'local-registration', 'password': 'Local-Registration-74!',
            }, headers={'Origin': self.origin})
            self.assertEqual(denied.status, 403)
            self.assertIn('审批中', (await denied.json())['error'])
            await self.login()
            response = await self.client.get('/api/admin/registrations')
            self.assertEqual(response.status, 200)
            payload = await response.json()
            self.assertEqual(payload['requests'][0]['id'], result['request_id'])
            self.assertEqual(payload['requests'][0]['status'], 'pending')
            self.assertNotIn('phone', payload['requests'][0])
            self.assertNotIn('13800138000', str(payload))
            self.assertEqual(payload['outbox']['pending'], 1)
            outbound.assert_not_awaited()
        self.dingtalk.assert_not_called()
        self.assertIsNone(self.application.get('dingtalk'))
        self.assertNotIn('ws_task', self.application)

    async def test_registration_requires_trusted_source_without_writing(self):
        store = self.application['auth_store']
        body = {'username': 'local-registration', 'display_name': '本地注册',
                'password': 'Local-Registration-74!', 'phone': '13800138000'}
        before = {table: set(map(tuple, store.db.execute(f'SELECT * FROM {table}')))
                  for table in ('users', 'registration_requests', 'notification_outbox')}
        for headers in ({}, {'Origin': 'https://evil.invalid'},
                        {'Referer': 'https://evil.invalid/login'},
                        {'Origin': self.origin, 'Sec-Fetch-Site': 'cross-site'},
                        {'Origin': self.origin, 'Host': 'evil.invalid:18299'}):
            with self.subTest(headers=headers):
                response = await self.client.post('/api/auth/register', json=body, headers=headers)
                self.assertEqual(response.status, 403, await response.text())
                for table, rows in before.items():
                    self.assertEqual(set(map(tuple, store.db.execute(f'SELECT * FROM {table}'))),
                                     rows, table)
        self.dingtalk.assert_not_called()

    async def test_registration_does_not_open_similar_paths_or_other_methods(self):
        headers = await self.login()
        store = self.application['auth_store']
        body = {'username': 'local-registration', 'display_name': '本地注册',
                'password': 'Local-Registration-74!', 'phone': '13800138000'}
        before = {table: set(map(tuple, store.db.execute(f'SELECT * FROM {table}')))
                  for table in ('users', 'registration_requests', 'notification_outbox')}
        for path in ('/api/auth/register/', '/api/auth/register/other-user',
                     '/api/auth/register-extra', '/api/auth/registers', '/api/auth/unknown'):
            for method in ('GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'):
                with self.subTest(method=method, path=path):
                    response = await self.client.request(method, path, json=body, headers=headers)
                    self.assertEqual(response.status, 403, path)
                    self.assertEqual(response.headers['X-H3Card-Sandbox'], 'local-copy')
        for method, status in (('GET', 403), ('HEAD', 403), ('PUT', 405),
                               ('PATCH', 405), ('DELETE', 405)):
            response = await self.client.request(method, '/api/auth/register', json=body, headers=headers)
            self.assertEqual(response.status, status, method)
        for table, rows in before.items():
            self.assertEqual(set(map(tuple, store.db.execute(f'SELECT * FROM {table}'))), rows, table)

    async def test_phone_self_service_keeps_auth_and_sandbox_boundaries(self):
        url = '/api/auth/phone'
        body = {'phone': '13800138000'}
        response = await self.client.post(url, json=body, headers={'Origin': self.origin})
        self.assertEqual(response.status, 401)
        headers = await self.login('local-user', 'Local-User-74!')
        store = self.application['auth_store']
        uid = next(user['id'] for user in store.list_users() if user['username'] == 'local-user')
        self.assertEqual((await self.client.get('/api/admin/users')).status, 403)
        for invalid_headers in ({'Origin': self.origin}, {**headers, 'Origin': 'https://evil.invalid'}):
            response = await self.client.post(url, json=body, headers=invalid_headers)
            self.assertEqual(response.status, 403)
            self.assertEqual(store.get_user(uid)['phone'], '')
        response = await self.client.post(url, json={**body, 'uid': self.admin['id']}, headers=headers)
        self.assertEqual(response.status, 400)
        self.assertEqual(store.get_user(uid)['phone'], '')
        self.assertEqual(store.get_user(self.admin['id'])['phone'], '')
        response = await self.client.post(url, json={'phone': ' 13800138000 '}, headers=headers)
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(response.headers['X-H3Card-Sandbox'], 'local-copy')
        self.assertEqual((await response.json())['user']['id'], uid)
        response = await self.client.get('/api/auth/me')
        self.assertEqual(response.status, 200)
        identity = await response.json()
        self.assertEqual(identity['user']['phone'], '13800138000')
        self.assertEqual(identity['csrf_token'], headers['X-CSRF-Token'])
        self.assertEqual((await self.client.get('/api/admin/users')).status, 403)
        headers = await self.login()
        response = await self.client.get('/api/admin/users')
        self.assertEqual(response.status, 200)
        users = {user['id']: user for user in (await response.json())['users']}
        self.assertEqual(users[uid]['phone'], '13800138000')
        self.assertEqual(users[self.admin['id']]['phone'], '')
        # 放行补录和本地注册不能连带放行相似路径或任务执行接口。
        for path in ('/api/auth/register/other-user', '/api/auth/phone/other-user', '/api/auth/phones', '/api/generate'):
            response = await self.client.post(path, json=body, headers=headers)
            self.assertEqual(response.status, 403, path)
            self.assertIn('本地隔离', (await response.json())['error'])
        self.assertEqual(store.get_user(uid)['phone'], '13800138000')

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
