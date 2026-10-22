"""监控账号边界：真实 SQLite 迁移、真实会话及 aiohttp 中间件。"""
import sqlite3
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer, make_mocked_request
from yarl import URL

from server.auth import (AUTH_ASSETS, COOKIE, auth_middleware, register_auth_routes,
                         require_monitor, require_team_leader, setup_local_test_auth)
from server.auth_store import AuthError, AuthStore

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / 'server/migrations'
PASSWORD = 'monitor-test-password'


def snapshot(db):
    tables = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")]
    return {table: list(map(tuple, db.execute(f'SELECT * FROM "{table}" ORDER BY rowid')))
            for table in tables}


class MonitorMigrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'auth.db'
        self.db = sqlite3.connect(self.path, isolation_level=None)
        self.addCleanup(self.db.close)
        self.db.execute('PRAGMA foreign_keys=ON')
        for script in sorted(MIGRATIONS.glob('00[1-7]_*.sql')):
            self.db.executescript(script.read_text(encoding='utf-8'))
        self.assertEqual(self.db.execute('PRAGMA user_version').fetchone()[0], 7)
        self.db.executemany('INSERT INTO users VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', [
            ('a', 'Admin', 'admin', 'hash-admin', 'admin', 1, 7, 10.5, '管理员', 'approved', 1, '13800138000'),
            ('u', 'User', 'user', 'hash-user', 'user', 1, 9, 11.5, '普通用户', 'approved', 0, ''),
            ('p', 'Pending', 'pending', 'hash-pending', 'user', 0, 3, 12.5, '待审批', 'pending', 0, '13900139000'),
        ])
        self.db.execute('INSERT INTO sessions VALUES(?,?,?,?,?)',
                        (AuthStore._digest('old-token'), 'u', 'old-csrf', time.time() + 86400, 13))
        self.db.executescript("""
            INSERT INTO user_grants VALUES('u','a','read');
            INSERT INTO global_canvas_grants VALUES('u','operate');
            INSERT INTO teams VALUES('t','原项目组','a','active',14,15);
            INSERT INTO team_members VALUES('t','a',16),('t','u',17);
            INSERT INTO project_acl VALUES('personal','a','active',18,NULL),('team','u','active',19,'t');
            INSERT INTO job_acl VALUES('job','personal','u');
            INSERT INTO project_user_shares VALUES('personal','u',20);
            INSERT INTO project_team_shares VALUES('personal','t',21);
            INSERT INTO project_user_views VALUES('personal','u',1,2,0.5,22);
            INSERT INTO registration_requests VALUES('reg','p','Pending','待审批','pending',23,NULL,NULL,NULL,'track');
            INSERT INTO notification_outbox(request_id,kind,dedupe_key,next_try_at,created_at)
                VALUES('reg','send_card','dedupe',24,25);
            UPDATE auth_meta SET value='1' WHERE key='ready';
            ALTER TABLE users ADD COLUMN extension TEXT NOT NULL DEFAULT '保留扩展列';
            CREATE INDEX users_phone_extra ON users(phone) WHERE phone!='';
            CREATE TABLE custom_child(id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE);
            INSERT INTO custom_child VALUES('child','u');
            CREATE TABLE audit(uid TEXT);
            CREATE TRIGGER users_audit AFTER UPDATE OF phone ON users BEGIN
                INSERT INTO audit VALUES(new.id);
            END;
        """)

    def test_v7_preserves_every_table_column_index_trigger_and_child_fk_on_reopen(self):
        before = snapshot(self.db)
        columns = list(self.db.execute('PRAGMA table_info(users)'))
        objects = list(self.db.execute("SELECT type,name,sql FROM sqlite_master WHERE type IN ('index','trigger') ORDER BY type,name"))
        fks = {table: list(self.db.execute(f'PRAGMA foreign_key_list("{table}")')) for table in before}
        for opening in range(2):
            with self.subTest(opening=opening):
                store = AuthStore(self.path)
                try:
                    self.assertEqual(store.db.execute('PRAGMA user_version').fetchone()[0], 8)
                    self.assertEqual(store.db.execute('PRAGMA foreign_keys').fetchone()[0], 1)
                    self.assertEqual(snapshot(store.db), before)
                    self.assertEqual(list(map(tuple, store.db.execute('PRAGMA table_info(users)'))), columns)
                    self.assertEqual(list(map(tuple, store.db.execute("SELECT type,name,sql FROM sqlite_master WHERE type IN ('index','trigger') ORDER BY type,name"))), objects)
                    for table, foreign_keys in fks.items():
                        self.assertEqual(list(map(tuple, store.db.execute(f'PRAGMA foreign_key_list("{table}")'))), foreign_keys)
                    self.assertEqual(store.db.execute('PRAGMA foreign_key_check').fetchall(), [])
                    self.assertEqual(store.get_session('old-token')['csrf_token'], 'old-csrf')
                    self.assertEqual(store.project_permission('u', 'personal'), 'operate')
                    self.assertTrue(store.is_ready())
                finally:
                    store.close()
        store = AuthStore(self.path)
        try:
            monitor = store.create_user('screen', PASSWORD, 'monitor')
            self.assertEqual(store.get_user(monitor['id'])['role'], 'monitor')
            with self.assertRaises(sqlite3.IntegrityError):
                store.db.execute("UPDATE users SET role='other' WHERE id='u'")
            with self.assertRaises(sqlite3.IntegrityError):
                store.db.execute("UPDATE users SET username_key='admin' WHERE id='u'")
            with self.assertRaises(sqlite3.IntegrityError):
                store.db.execute("INSERT INTO custom_child VALUES('bad','missing')")
            store.db.execute("UPDATE users SET phone='13700137000' WHERE id='u'")
            self.assertEqual(tuple(store.db.execute('SELECT * FROM audit').fetchone()), ('u',))
        finally:
            store.close()

    def test_wal_backup_migrate_and_restore_preserves_pre_release_state(self):
        # 保留尚未 checkpoint 的已提交数据，验证不能只复制 auth.db 主文件。
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('PRAGMA wal_autocheckpoint=0')
        self.db.execute("UPDATE users SET display_name='备份前已提交姓名' WHERE id='u'")
        self.assertGreater(Path(str(self.path) + '-wal').stat().st_size, 0)
        before = snapshot(self.db)
        schema = list(self.db.execute('SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY name'))
        backup_path = self.path.with_name('auth-v7-backup.db')
        backup_path.touch(mode=0o600, exist_ok=False)
        source = sqlite3.connect(self.path.as_uri() + '?mode=ro', uri=True)
        backup = sqlite3.connect(backup_path)
        try:
            source.backup(backup)
            self.assertEqual(backup.execute('PRAGMA user_version').fetchone()[0], 7)
            self.assertEqual(backup.execute('PRAGMA integrity_check').fetchall(), [('ok',)])
            self.assertEqual(backup.execute('PRAGMA foreign_key_check').fetchall(), [])
            self.assertEqual(snapshot(backup), before)
        finally:
            backup.close()
            source.close()

        store = AuthStore(self.path)
        try:
            self.assertEqual(store.db.execute('PRAGMA user_version').fetchone()[0], 8)
            store.create_user('after-release-screen', PASSWORD, 'monitor')
            store.set_user('u', enabled=False)
            self.assertIsNone(store.get_session('old-token'))
        finally:
            store.close()

        # 回退恢复到全新文件，不把旧主库覆盖在仍有连接或残留 WAL 的库上。
        restored_path = self.path.with_name('auth-restored.db')
        restored_path.touch(mode=0o600, exist_ok=False)
        backup = sqlite3.connect(backup_path.as_uri() + '?mode=ro', uri=True)
        restored = sqlite3.connect(restored_path)
        try:
            backup.backup(restored)
            self.assertEqual(restored.execute('PRAGMA user_version').fetchone()[0], 7)
            self.assertEqual(restored.execute('PRAGMA integrity_check').fetchall(), [('ok',)])
            self.assertEqual(restored.execute('PRAGMA foreign_key_check').fetchall(), [])
            self.assertEqual(snapshot(restored), before)
            self.assertEqual(list(restored.execute(
                'SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY name')), schema)
            self.assertEqual(snapshot(backup), before)
        finally:
            restored.close()
            backup.close()

        # 恢复出来的 v7 仍可正常重新升级；原会话和权限应恢复而非保留发布后的修改。
        store = AuthStore(restored_path)
        try:
            self.assertEqual(store.get_session('old-token')['csrf_token'], 'old-csrf')
            self.assertEqual(store.project_permission('u', 'personal'), 'operate')
            self.assertFalse(any(user['username'] == 'after-release-screen' for user in store.list_users()))
            self.assertEqual(snapshot(store.db), before)
        finally:
            store.close()

    def test_failures_roll_back_schema_data_version_and_restore_foreign_keys(self):
        # 直接使用真实连接执行生产迁移方法，失败后还能核对连接状态。
        store = AuthStore.__new__(AuthStore)
        store.db = self.db
        self.db.row_factory = sqlite3.Row
        store.lock = threading.RLock()
        original_read = Path.read_text
        for failure in ('script', 'foreign_key'):
            with self.subTest(failure=failure):
                if failure == 'foreign_key':
                    self.db.execute('PRAGMA foreign_keys=OFF')
                    self.db.execute("INSERT INTO custom_child VALUES('orphan','missing')")
                    self.db.execute('PRAGMA foreign_keys=ON')
                before = snapshot(self.db)
                schema = list(map(tuple, self.db.execute('SELECT * FROM sqlite_master ORDER BY name')))

                def read(path, *args, **kwargs):
                    text = original_read(path, *args, **kwargs)
                    return text + '\nSELECT * FROM missing_table;\n' if failure == 'script' else text

                with patch.object(Path, 'read_text', read):
                    with self.assertRaises((sqlite3.Error, AuthError)):
                        store._migrate_monitor_role(MIGRATIONS / '008_monitor_role.sql')
                self.assertFalse(self.db.in_transaction)
                self.assertEqual(self.db.execute('PRAGMA foreign_keys').fetchone()[0], 1)
                self.assertEqual(self.db.execute('PRAGMA user_version').fetchone()[0], 7)
                self.assertEqual(snapshot(self.db), before)
                self.assertEqual(list(map(tuple, self.db.execute('SELECT * FROM sqlite_master ORDER BY name'))), schema)
                if failure == 'foreign_key':
                    self.db.execute("DELETE FROM custom_child WHERE id='orphan'")
        store._migrate_monitor_role(MIGRATIONS / '008_monitor_role.sql')
        self.assertEqual(self.db.execute('PRAGMA user_version').fetchone()[0], 8)


class MonitorStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.store = AuthStore(Path(self.temp.name) / 'auth.db')
        self.addCleanup(self.store.close)
        self.admin = self.store.create_user('admin', PASSWORD, 'admin')
        self.monitor = self.store.create_user('screen', PASSWORD, 'monitor', True)

    def test_team_leader_consistently_cleared_and_helpers_defend_role(self):
        self.assertFalse(self.monitor['team_leader'])
        self.assertFalse(self.store.set_user(self.monitor['id'], team_leader=True)['team_leader'])
        owner = self.store.create_user('owner', PASSWORD, team_leader=True)
        self.assertFalse(self.store.set_user(owner['id'], role='monitor')['team_leader'])
        self.assertFalse(self.store.set_user(owner['id'], role='user')['team_leader'])
        with self.assertRaises(AuthError):
            self.store.create_team('禁止创建', self.monitor['id'])
        request = make_mocked_request('GET', '/monitor')
        for role in ('admin', 'monitor', 'user'):
            request['user'] = {**self.monitor, 'role': role, 'team_leader': True}
            if role == 'user':
                with self.assertRaises(web.HTTPForbidden):
                    require_monitor(request)
            else:
                self.assertEqual(require_monitor(request)['role'], role)
            if role == 'monitor':
                with self.assertRaises(web.HTTPForbidden):
                    require_team_leader(request)
        request['user'] = {**self.monitor, 'enabled': False}
        with self.assertRaises(web.HTTPUnauthorized):
            require_monitor(request)

    def test_default_ttl_is_24h_fixed_for_all_roles(self):
        self.store.create_user('user', PASSWORD)
        self.assertEqual(self.store.session_ttl, 86400)
        for name in ('admin', 'screen', 'user'):
            with self.subTest(name=name), patch('server.auth_store.time.time', return_value=1000):
                session = self.store.login(name, PASSWORD)
                row = tuple(self.store.db.execute('SELECT expires_at,created_at FROM sessions WHERE token_hash=?',
                                                  (self.store._digest(session['token']),)).fetchone())
                self.assertEqual(row, (87400, 1000))
            with patch('server.auth_store.time.time', return_value=87399):
                self.assertIsNotNone(self.store.get_session(session['token']))
            with patch('server.auth_store.time.time', return_value=87400):
                self.assertIsNone(self.store.get_session(session['token']))

    def test_revoke_on_disable_role_password_and_logout(self):
        uid = self.monitor['id']
        for action in ('disable', 'role', 'password', 'logout'):
            with self.subTest(action=action):
                self.store.set_user(uid, role='monitor', enabled=True)
                session = self.store.login('screen', PASSWORD)
                if action == 'disable':
                    self.store.set_user(uid, enabled=False)
                elif action == 'role':
                    self.store.set_user(uid, role='user')
                elif action == 'password':
                    self.store.reset_password(uid, PASSWORD)
                else:
                    self.store.logout(session['token'])
                self.assertIsNone(self.store.get_session(session['token']))
        with self.assertRaises(AuthError):
            self.store.set_user(self.admin['id'], role='monitor')

    def test_existing_ownership_grants_shares_and_membership_never_authorize_monitor(self):
        uid = self.monitor['id']
        self.store.set_user(uid, role='user', team_leader=True)
        self.store.create_project('owned', uid)
        self.store.create_project('shared', self.admin['id'])
        team = self.store.create_team('测试组', uid)
        self.store.create_project('team', self.admin['id'], team_id=team['id'])
        self.store.set_project_shares('shared', [uid], [team['id']], self.admin['id'])
        self.store.set_grant(uid, self.admin['id'], 'operate')
        self.store.set_global_grant(uid, 'operate')
        for pid in ('owned', 'shared', 'team'):
            self.assertEqual(self.store.project_permission(uid, pid), 'operate')
        self.store.set_user(uid, role='monitor')
        for pid in ('owned', 'shared', 'team'):
            self.assertIsNone(self.store.project_permission(uid, pid))
            self.assertIsNone(self.store.get_project_for_user(uid, pid))
        self.assertEqual(self.store.list_projects(uid), [])
        self.assertEqual(len(self.store.list_grants()), 2)
        self.assertEqual(self.store.get_project('owned')['owner_id'], uid)


class MonitorMiddlewareTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.store = AuthStore(Path(self.temp.name) / 'auth.db')
        self.addCleanup(self.store.close)
        self.accounts = {role: self.store.create_user(role, PASSWORD, role)
                         for role in ('admin', 'user', 'monitor')}
        self.store.set_ready()
        self.app = web.Application(middlewares=[auth_middleware])
        self.app['auth_store'] = self.store
        register_auth_routes(self.app, ROOT / 'web')
        self.seen = []

        async def resource(request):
            self.seen.append((request.method, request.path))
            return web.json_response({'ok': True})

        # 仅验证鉴权，不实现本轮范围外的监控业务路由。
        self.app.router.add_route('*', '/{resource:.*}', resource)
        self.client = TestClient(TestServer(self.app))
        await self.client.start_server()
        self.addAsyncCleanup(self.client.close)
        self.origin = str(self.client.make_url('/')).rstrip('/')
        self.sessions = {role: self.store.login(role, PASSWORD) for role in self.accounts}

    def headers(self, role='monitor', csrf=True):
        session = self.sessions[role]
        result = {'Cookie': f'{COOKIE}={session["token"]}', 'Origin': self.origin}
        if csrf:
            result['X-CSRF-Token'] = session['csrf_token']
        return result

    async def test_read_allowlist_and_private_no_store(self):
        paths = ['/monitor', '/monitor.css', '/monitor-page.js', '/monitor-alerts.js',
                 '/api/monitor/summary', '/api/monitor/workers/w-01',
                 '/api/monitor/workers/w-01/temperature', '/api/auth/me',
                 '/login', '/login.html', '/auth.js', *AUTH_ASSETS]
        for method in ('GET', 'HEAD'):
            for path in paths:
                with self.subTest(method=method, path=path):
                    response = await self.client.request(method, path + '?range=24h', headers=self.headers())
                    self.assertEqual(response.status, 200, path)
                    self.assertEqual(response.headers['Cache-Control'], 'private, no-store')
        response = await self.client.get('/api/auth/me', headers=self.headers())
        data = await response.json()
        self.assertEqual(data['user']['role'], 'monitor')
        self.assertNotIn('token', data)
        self.assertNotIn('worker_token', data)

    async def test_default_deny_business_unknown_and_path_confusion_across_methods(self):
        paths = ['/', '/index.html', '/controller', '/controller.html', '/permissions.html',
                 '/admin/permissions', '/teams', '/director', '/api/projects', '/api/jobs',
                 '/api/generate', '/api/health', '/api/workers', '/api/status', '/api/costs',
                 '/api/capacity', '/api/admin/users', '/api/auth/presence', '/api/auth/phone',
                 '/api/auth/password', '/api/auth/login', '/api/auth/register', '/style.css',
                 '/admin-shell.css', '/controller-page.js', '/unknown', '/api/new-feature',
                 '/monitor.html', '/monitor/', '/monitor.css/extra', '/api/monitor',
                 '/api/monitor/summary/', '/api/monitor/summary/extra',
                 '/api/monitor/workers', '/api/monitor/workers/', '/api/monitor/workers/a/b',
                 '/api/monitor/workers/a/temperature/', '/api/monitor/workers/a/temperature/b',
                 '/api/monitor/workers/a/restart', '/api/monitor/workers/a%2Fb',
                 '/api/monitor/workers/a%252Fb', '/api/monitor/workers/a%5Cb',
                 '/api/monitor/workers/%2e%2e', '/api/monitor/workers/a%00b',
                 '/api/monitor/workers/a%3Fb', '/api/monitor/%73ummary']
        for method in ('GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'):
            for path in paths:
                with self.subTest(method=method, path=path):
                    url = URL(self.origin + path, encoded=True)
                    response = await self.client.session.request(method, url, headers=self.headers(), allow_redirects=False)
                    self.assertEqual(response.status, 403, path)
        self.assertEqual(self.seen, [])

    async def test_read_paths_reject_every_write_and_options_even_with_valid_csrf(self):
        for method in ('POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'):
            for path in ('/monitor', '/monitor.css', '/monitor-page.js', '/monitor-alerts.js',
                         '/api/monitor/summary', '/api/monitor/workers/worker',
                         '/api/monitor/workers/worker/temperature', '/api/auth/me',
                         '/login', '/auth.js', '/icon.png'):
                with self.subTest(method=method, path=path):
                    response = await self.client.request(method, path, headers=self.headers())
                    self.assertEqual(response.status, 403)
        self.assertEqual(self.seen, [])

    async def test_logout_is_only_post_and_requires_source_and_csrf(self):
        for method in ('GET', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'):
            response = await self.client.request(method, '/api/auth/logout', headers=self.headers())
            self.assertEqual(response.status, 403)
        for headers in (self.headers(csrf=False),
                        {**self.headers(), 'Origin': 'https://evil.invalid'},
                        {**self.headers(), 'Sec-Fetch-Site': 'cross-site'}):
            response = await self.client.post('/api/auth/logout', headers=headers)
            self.assertEqual(response.status, 403)
        response = await self.client.post('/api/auth/logout', headers=self.headers())
        self.assertEqual(response.status, 200)
        response = await self.client.get('/api/monitor/summary', headers=self.headers())
        self.assertEqual(response.status, 401)

    async def test_normal_admin_anonymous_and_revocation_regressions(self):
        for role in ('admin', 'user'):
            for path in ('/monitor', '/monitor.css', '/api/monitor/summary', '/api/monitor/workers/w/temperature'):
                response = await self.client.get(path, headers=self.headers(role))
                self.assertEqual(response.status, 200 if role == 'admin' else 403)
            self.assertEqual((await self.client.get('/api/projects', headers=self.headers(role))).status, 200)
            self.assertEqual((await self.client.post('/api/projects', headers=self.headers(role))).status, 200)
            self.assertEqual((await self.client.post('/api/projects', headers=self.headers(role, csrf=False))).status, 403)
            self.assertEqual((await self.client.get('/api/admin/users', headers=self.headers(role))).status,
                             200 if role == 'admin' else 403)
        response = await self.client.get('/monitor', allow_redirects=False)
        self.assertEqual(response.status, 302)
        self.assertEqual(response.headers['Location'], '/login')
        self.assertEqual((await self.client.get('/api/monitor/summary')).status, 401)
        self.store.set_user(self.accounts['monitor']['id'], role='user')
        self.assertEqual((await self.client.get('/api/monitor/summary', headers=self.headers())).status, 401)
        self.sessions['monitor'] = self.store.login('monitor', PASSWORD)
        self.assertEqual((await self.client.get('/monitor', headers=self.headers())).status, 403)

    async def test_real_monitor_login_and_next_request_revocation(self):
        uid = self.accounts['monitor']['id']
        for action in ('disable', 'role', 'password'):
            with self.subTest(action=action):
                self.store.set_user(uid, role='monitor', enabled=True)
                self.client.session.cookie_jar.clear()
                response = await self.client.post('/api/auth/login',
                    headers={'Origin': self.origin}, json={'username': 'monitor', 'password': PASSWORD})
                self.assertEqual(response.status, 200)
                result = await response.json()
                self.assertEqual(result['user']['role'], 'monitor')
                self.assertNotIn('token', result)
                self.assertNotIn('worker_token', result)
                self.assertTrue(response.cookies[COOKIE]['httponly'])
                self.assertEqual(response.cookies[COOKIE]['samesite'], 'Lax')
                self.assertEqual((await self.client.get('/api/monitor/summary')).status, 200)
                if action == 'disable':
                    self.store.set_user(uid, enabled=False)
                elif action == 'role':
                    self.store.set_user(uid, role='user')
                else:
                    self.store.reset_password(uid, PASSWORD)
                for path in ('/api/monitor/summary', '/api/auth/me'):
                    self.assertEqual((await self.client.get(path)).status, 401)

    async def test_admin_account_api_creates_and_changes_monitor_and_clears_leader(self):
        response = await self.client.post('/api/admin/users', headers=self.headers('admin'), json={
            'username': 'new-screen', 'password': PASSWORD, 'role': 'monitor', 'team_leader': True})
        self.assertEqual(response.status, 201)
        user = (await response.json())['user']
        self.assertEqual(user['role'], 'monitor')
        self.assertFalse(user['team_leader'])
        session = self.store.login('new-screen', PASSWORD)
        response = await self.client.patch('/api/admin/users/' + user['id'], headers=self.headers('admin'),
                                           json={'role': 'monitor', 'team_leader': True})
        self.assertEqual(response.status, 200)
        self.assertFalse((await response.json())['user']['team_leader'])
        self.assertIsNone(self.store.get_session(session['token']))

    async def test_worker_auth_remains_independent_and_cookie_is_not_a_worker_token(self):
        from server.app import require_agent
        from server.distributed import DistributedStore

        distributed = DistributedStore(Path(self.temp.name) / 'control.db')
        self.addCleanup(distributed.close)
        worker = distributed.register_worker('测试执行端')
        app = web.Application(middlewares=[auth_middleware])
        app['auth_store'] = self.store
        app['distributed'] = distributed

        async def agent(request):
            return web.json_response({'worker_id': require_agent(request)})

        app.router.add_post('/agent/v1/test', agent)
        client = TestClient(TestServer(app))
        await client.start_server()
        try:
            for headers in ({}, self.headers(), {
                    **self.headers(), 'X-Worker-ID': worker['worker_id'],
                    'Authorization': 'Bearer ' + self.sessions['monitor']['token']}):
                self.assertEqual((await client.post('/agent/v1/test', headers=headers)).status, 401)
            credentials = {'X-Worker-ID': worker['worker_id'],
                           'Authorization': 'Bearer ' + worker['worker_token']}
            # 正确的 Worker 凭据不依赖浏览器会话或 CSRF。
            self.assertEqual((await client.post('/agent/v1/test', headers=credentials)).status, 200)
            self.store.set_ready(False)
            self.assertEqual((await client.post('/agent/v1/test', headers=credentials)).status, 503)
        finally:
            await client.close()

    async def test_local_test_still_cannot_access_monitor(self):
        local_store = AuthStore(Path(self.temp.name) / 'local.db')
        try:
            app = web.Application(middlewares=[auth_middleware])
            app['auth_store'] = local_store
            app['local_test'] = True
            await setup_local_test_auth(app)

            async def resource(request):
                return web.json_response({'ok': True})

            app.router.add_route('*', '/{resource:.*}', resource)
            client = TestClient(TestServer(app))
            await client.start_server()
            try:
                for path in ('/monitor', '/api/monitor/summary', '/agent/v1/register', '/api/admin/users'):
                    self.assertEqual((await client.get(path)).status, 403)
                self.assertEqual((await client.get('/api/projects')).status, 200)
            finally:
                await client.close()
        finally:
            local_store.close()


if __name__ == '__main__':
    unittest.main()
