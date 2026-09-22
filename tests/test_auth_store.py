import asyncio
import hashlib
import sqlite3
import tempfile
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from collections import defaultdict
from pathlib import Path
from unittest.mock import patch

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

from server.auth import auth_middleware, register_auth_routes, require_project
from server.auth_store import AuthError, AuthStore

PASSWORD = 'a-long-test-password'


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / 'auth.sqlite'
        self.store = AuthStore(self.path)
        self.admin = self.store.create_user('admin', PASSWORD, 'admin')['id']
        self.owner = self.store.create_user('owner', PASSWORD)['id']
        self.viewer = self.store.create_user('viewer', PASSWORD)['id']

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def test_sessions_restart_expiry_and_revoke(self):
        session = self.store.login('ADMIN', PASSWORD)
        with self.store.lock:
            row = self.store.db.execute('SELECT * FROM sessions').fetchone()
            self.assertEqual(row['token_hash'], hashlib.sha256(session['token'].encode()).hexdigest())
            self.assertNotIn(PASSWORD, str(dict(self.store.db.execute('SELECT * FROM users').fetchone())))
        self.store.set_ready()
        self.store.close()
        self.store = AuthStore(self.path)
        self.assertTrue(self.store.is_ready())
        self.assertEqual(self.store.get_session(session['token'])['user']['id'], self.admin)
        with patch('server.auth_store.time.time', return_value=time.time() + 90000):
            self.assertIsNone(self.store.get_session(session['token']))
        self.store.reset_password(self.admin, PASSWORD + '!')
        self.assertIsNone(self.store.get_session(session['token']))
        with self.assertRaises(AuthError):
            self.store.login('admin', PASSWORD)

    def test_grants_future_nontransitive_and_jobs(self):
        self.store.set_grant(self.viewer, self.owner, 'read')
        self.store.create_project('future', self.owner)
        self.assertEqual(self.store.project_permission(self.viewer, 'future'), 'read')
        self.store.set_grant(self.owner, self.admin, 'operate')
        self.store.create_project('admin-project', self.admin)
        self.assertIsNone(self.store.project_permission(self.viewer, 'admin-project'))
        self.store.set_grant(self.viewer, self.owner, 'operate')
        self.assertEqual(self.store.list_projects(self.viewer)[0]['owner_username'], 'owner')
        self.store.register_job('job', 'future', self.viewer)
        self.store.register_job('job', 'future', self.viewer)
        self.assertEqual(self.store.list_project_jobs('future'), ['job'])
        with self.assertRaises(AuthError):
            self.store.register_job('job', 'admin-project', self.viewer)
        with self.assertRaises(AuthError):
            self.store.create_project('future', self.viewer)
        self.store.create_project('future', self.owner, 'pending')
        with self.assertRaises(AuthError):
            self.store.create_project('bad-state', self.owner, 'other')
        self.assertEqual(self.store.get_project('future')['state'], 'active')
        self.store.set_user(self.viewer, enabled=False)
        self.assertIsNone(self.store.project_permission(self.viewer, 'future'))
        self.store.delete_grant(self.viewer, self.owner)
        self.assertEqual(len(self.store.list_grants()), 1)

    def test_team_members_share_team_projects_and_keep_personal_private(self):
        leader = self.store.create_user('leader', PASSWORD, team_leader=True)['id']
        member = self.store.create_user('member', PASSWORD)['id']
        outsider = self.store.create_user('outsider', PASSWORD)['id']
        team = self.store.create_team('项目一组', leader)
        self.store.add_team_member(team['id'], member, leader)
        self.store.create_project('team-project', member, team_id=team['id'])
        self.store.create_project('personal-project', member)
        self.assertEqual(self.store.project_permission(leader, 'team-project'), 'operate')
        self.assertEqual(self.store.project_permission(member, 'team-project'), 'operate')
        self.assertIsNone(self.store.project_permission(outsider, 'team-project'))
        self.assertIsNone(self.store.project_permission(leader, 'personal-project'))
        self.store.set_grant(outsider, member, 'operate')
        self.assertIsNone(self.store.project_permission(outsider, 'team-project'))
        self.assertEqual(self.store.project_permission(outsider, 'personal-project'), 'operate')
        listed = self.store.list_projects(leader)[0]
        self.assertEqual(listed['team_name'], '项目一组')
        self.store.remove_team_member(team['id'], member, leader)
        self.assertIsNone(self.store.project_permission(member, 'team-project'))
        self.assertEqual(self.store.project_permission(member, 'personal-project'), 'operate')

    def test_team_management_permissions(self):
        leader = self.store.create_user('leader', PASSWORD, team_leader=True)['id']
        other_leader = self.store.create_user('leader2', PASSWORD, team_leader=True)['id']
        team = self.store.create_team('项目一组', leader)
        with self.assertRaises(AuthError):
            self.store.add_team_member(team['id'], self.viewer, other_leader)
        with self.assertRaises(AuthError):
            self.store.create_team('无权限', self.viewer)
        self.store.add_team_member(team['id'], self.viewer, self.admin)
        with self.assertRaises(AuthError):
            self.store.remove_team_member(team['id'], leader, leader)
        self.assertTrue(self.store.list_teams(self.viewer)[0]['members'])

    def test_last_admin_across_connections(self):
        other_id = self.store.create_user('admin2', PASSWORD, 'admin')['id']
        other = AuthStore(self.path)
        barrier = threading.Barrier(2)
        def disable(store, uid):
            barrier.wait()
            try:
                store.set_user(uid, enabled=False)
                return True
            except AuthError:
                return False
        try:
            with ThreadPoolExecutor(2) as pool:
                a = pool.submit(disable, self.store, self.admin)
                b = pool.submit(disable, other, other_id)
                self.assertEqual(sorted([a.result(), b.result()]), [False, True])
            self.assertTrue(self.store.has_admin())
        finally:
            other.close()

    def test_login_hash_race_with_reset(self):
        verified = threading.Event()
        release = threading.Event()
        original = self.store._verify
        def verify(*args):
            result = original(*args)
            verified.set()
            self.assertTrue(release.wait(10))
            return result
        with patch.object(self.store, '_verify', side_effect=verify):
            with ThreadPoolExecutor(1) as pool:
                pending = pool.submit(self.store.login, 'owner', PASSWORD)
                self.assertTrue(verified.wait(10))
                self.store.reset_password(self.owner, PASSWORD + '!')
                release.set()
                with self.assertRaises(AuthError):
                    pending.result()

    def test_concurrent_sessions_and_grants(self):
        def work(index):
            session = self.store.login('viewer', PASSWORD)
            self.store.set_grant(self.viewer, self.owner, 'read' if index % 2 else 'operate')
            self.assertIsNotNone(self.store.get_session(session['token']))
            self.store.logout(session['token'])
        with ThreadPoolExecutor(4) as pool:
            list(pool.map(work, range(8)))
        self.assertEqual(len(self.store.list_grants()), 1)
        self.store.set_user(self.viewer, role='admin')
        session = self.store.login('viewer', PASSWORD)
        self.store.change_password(self.viewer, PASSWORD, PASSWORD + '!', session['token'])
        self.assertIsNone(self.store.get_session(session['token']))

    def test_assign_projects_permissions_and_history(self):
        self.store.create_project('p', self.owner)
        self.store.register_job('j', 'p', self.owner)
        self.store.set_grant(self.viewer, self.owner, 'read')
        self.store.assign_projects([{'project_id': 'p', 'owner_id': self.owner}], self.admin)
        self.assertIsNone(self.store.project_permission(self.owner, 'p'))
        self.assertIsNone(self.store.project_permission(self.viewer, 'p'))
        self.assertEqual(self.store.get_job('j')['user_id'], self.owner)
        self.store.set_grant(self.viewer, self.admin, 'read')
        self.assertEqual(self.store.project_permission(self.viewer, 'p'), 'read')

    def test_assign_projects_atomic_conflict_and_validation(self):
        self.store.create_project('p', self.admin)
        self.store.create_project('q', self.admin)
        for projects in ([], [{'project_id': 'p', 'owner_id': self.admin},
                              {'project_id': 'q', 'owner_id': self.owner}],
                         [{'project_id': 'missing', 'owner_id': self.admin}],
                         [{'project_id': 'p', 'owner_id': self.admin}] * 2):
            with self.assertRaises(AuthError):
                self.store.assign_projects(projects, self.owner)
            self.assertEqual(self.store.get_project('p')['owner_id'], self.admin)
        self.store.set_user(self.owner, enabled=False)
        with self.assertRaises(AuthError):
            self.store.assign_projects([{'project_id': 'p', 'owner_id': self.admin}], self.owner)
        self.store.set_project_state('q', 'deleted')
        with self.assertRaises(AuthError):
            self.store.assign_projects([{'project_id': 'q', 'owner_id': self.admin}], self.viewer)
        session = self.store.login('admin', PASSWORD)
        self.store.logout(session['token'])
        with self.assertRaises(AuthError):
            self.store.assign_projects([{'project_id': 'p', 'owner_id': self.admin}], self.viewer,
                                       actor_id=self.admin, session_token=session['token'])

    def test_unknown_schema_rejected(self):
        path = Path(self.tmp.name) / 'future.sqlite'
        db = sqlite3.connect(path)
        db.execute('PRAGMA user_version=4')
        db.close()
        with self.assertRaises(AuthError):
            AuthStore(path)


class RegistrationStoreTests(unittest.TestCase):
    """自主注册与钉钉审批的数据层语义。"""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / 'auth.sqlite'
        self.store = AuthStore(self.path)
        self.admin = self.store.create_user('admin', PASSWORD, 'admin')['id']

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def _register(self, username='zhangsan', display_name='张三', password=PASSWORD):
        return self.store.create_registration(username, password, display_name)

    def test_v1_database_migrates_to_v2(self):
        legacy = self.path.parent / 'legacy.sqlite'
        db = sqlite3.connect(legacy)
        script = (Path(__file__).resolve().parents[1] / 'server/migrations/001_auth.sql').read_text(encoding='utf-8')
        db.executescript(script)
        db.execute("INSERT INTO users VALUES('u1','old','old','x','user',1,0,100.0)")
        db.execute("INSERT INTO project_acl VALUES('legacy-project','u1','active',100.0)")
        db.execute("UPDATE auth_meta SET value='1' WHERE key='ready'")
        db.commit()
        db.close()
        store = AuthStore(legacy)
        try:
            users = store.list_users()
            self.assertEqual(users[0]['approval_status'], 'approved')
            self.assertEqual(users[0]['display_name'], 'old')
            self.assertFalse(users[0]['team_leader'])
            self.assertEqual(store._user('u1')['enabled'], 1)
            self.assertTrue(store.is_ready())
            self.assertIsNone(store.get_project('legacy-project')['team_id'])
        finally:
            store.close()

    def test_registration_pending_blocks_login_and_duplicates(self):
        request = self._register()
        self.assertEqual(request['status'], 'pending')
        user = self.store.list_users()[-1]
        self.assertEqual(user['approval_status'], 'pending')
        self.assertEqual(user['role'], 'user')
        self.assertEqual(user['display_name'], '张三')
        with self.assertRaises(AuthError) as ctx:
            self.store.login('zhangsan', PASSWORD)
        self.assertEqual(ctx.exception.status, 403)
        self.assertIn('审批中', str(ctx.exception))
        with self.assertRaises(AuthError) as ctx:
            self._register()
        self.assertEqual(ctx.exception.status, 409)
        with self.assertRaises(AuthError):
            self._register(username='ZHANGSAN')
        for bad in ('', '  ', 'x' * 65, 'a\nb'):
            with self.assertRaises(AuthError):
                self._register(display_name=bad)

    def test_registration_password_and_wrong_password_silent(self):
        with self.assertRaises(AuthError):
            self._register(password='short')
        self._register()
        with self.assertRaises(AuthError) as ctx:
            self.store.login('zhangsan', 'wrong-password')
        self.assertEqual(ctx.exception.status, 401)
        self.assertEqual(str(ctx.exception), '用户名或密码错误')

    def test_decision_approve_enables_login(self):
        request = self._register()
        card = self.store.registration_card_data(request['request_id'])
        outcome, row = self.store.decide_registration(card['out_track_id'], 'approved', 'corp1', '431661')
        self.assertEqual(outcome, 'applied')
        self.assertEqual(row['status'], 'approved')
        self.assertEqual(row['decided_by'], '431661')
        session = self.store.login('zhangsan', PASSWORD)
        self.assertEqual(session['user']['approval_status'], 'approved')
        self.assertIsNotNone(self.store.get_session(session['token']))

    def test_decision_reject_blocks_and_reapply_forbidden(self):
        request = self._register()
        card = self.store.registration_card_data(request['request_id'])
        outcome, row = self.store.decide_registration(card['out_track_id'], 'rejected', 'corp1', '431661')
        self.assertEqual(outcome, 'applied')
        with self.assertRaises(AuthError) as ctx:
            self.store.login('zhangsan', PASSWORD)
        self.assertIn('拒绝', str(ctx.exception))
        with self.assertRaises(AuthError) as ctx:
            self._register()
        self.assertEqual(ctx.exception.status, 403)

    def test_decision_idempotent_and_unknown(self):
        request = self._register()
        card = self.store.registration_card_data(request['request_id'])
        self.store.decide_registration(card['out_track_id'], 'approved', 'corp1', 'a')
        outcome, row = self.store.decide_registration(card['out_track_id'], 'rejected', 'corp1', 'b')
        self.assertEqual(outcome, 'duplicate')
        self.assertEqual(row['status'], 'approved')
        self.assertEqual(row['decided_by'], 'a')
        self.assertEqual(self.store.decide_registration('missing', 'approved', 'c', 'd')[0], 'unknown')
        with self.assertRaises(AuthError):
            self.store.decide_registration(card['out_track_id'], 'hack', 'c', 'd')

    def test_admin_operations_cannot_change_approval(self):
        request = self._register()
        user = self.store.list_users()[-1]
        with self.assertRaises(AuthError) as ctx:
            self.store.set_user(user['id'], role='admin')
        self.assertEqual(ctx.exception.status, 409)
        self.store.set_user(user['id'], enabled=False)
        self.store.reset_password(user['id'], PASSWORD + '!')
        refreshed = self.store.list_users()[-1]
        self.assertEqual(refreshed['approval_status'], 'pending')
        self.assertEqual(refreshed['role'], 'user')
        card = self.store.registration_card_data(request['request_id'])
        self.store.decide_registration(card['out_track_id'], 'approved', 'corp', 'x')
        # 停用不因审批通过而自动恢复
        self.assertFalse(self.store.list_users()[-1]['enabled'])

    def test_outbox_lifecycle_and_backoff(self):
        request = self._register()
        tasks = self.store.claim_outbox(time.time())
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]['kind'], 'send_card')
        self.assertEqual(tasks[0]['request_id'], request['request_id'])
        self.assertEqual(self.store.claim_outbox(time.time()), [])
        self.store.finish_outbox(tasks[0]['id'], done=True)
        self.assertEqual(self.store.outbox_backlog()['pending'], 0)

        card = self.store.registration_card_data(request['request_id'])
        self.store.decide_registration(card['out_track_id'], 'approved', 'corp', 'x')
        tasks = self.store.claim_outbox(time.time())
        self.assertEqual(tasks[0]['kind'], 'update_card')
        self.store.finish_outbox(tasks[0]['id'], error='boom')
        backlog = self.store.outbox_backlog()
        self.assertEqual(backlog['pending'], 1)
        with self.store.lock:
            row = self.store.db.execute('SELECT * FROM notification_outbox WHERE id=?',
                                        (tasks[0]['id'],)).fetchone()
        self.assertEqual(row['attempts'], 1)
        self.assertIn('boom', row['last_error'])
        self.assertGreater(row['next_try_at'], time.time())
        # 未到期不可认领，到期后可认领且退避有上限
        self.assertEqual(self.store.claim_outbox(time.time()), [])
        due = self.store.claim_outbox(row['next_try_at'] + 0.1)
        self.assertEqual(len(due), 1)
        for _ in range(8):
            self.store.finish_outbox(due[0]['id'], error='still failing')
        with self.store.lock:
            final = self.store.db.execute('SELECT attempts,next_try_at FROM notification_outbox WHERE id=?',
                                          (tasks[0]['id'],)).fetchone()
        self.assertLessEqual(final['next_try_at'] - time.time(), 600 + 5)

    def test_list_registrations_shape(self):
        self._register('lisi', '李四')
        rows = self.store.list_registrations()
        self.assertEqual(rows[0]['username'], 'lisi')
        self.assertEqual(rows[0]['display_name'], '李四')
        self.assertEqual(rows[0]['status'], 'pending')
        self.assertNotIn('password', ' '.join(rows[0].keys()))


class HTTPTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = AuthStore(Path(self.tmp.name) / 'auth.sqlite')
        self.store.create_user('admin', PASSWORD, 'admin')
        self.uid = self.store.create_user('user', PASSWORD)['id']
        app = web.Application(middlewares=[auth_middleware])
        app['auth_store'] = self.store
        app['project_locks'] = defaultdict(asyncio.Lock)
        register_auth_routes(app, self.tmp.name)
        async def ok(request):
            return web.json_response({'ok': True})
        async def project(request):
            return web.json_response(await require_project(request, 'p', operate=True))
        app.router.add_get('/api/business', ok)
        app.router.add_get('/api/status', ok)
        app.router.add_post('/api/project', project)
        app.router.add_post('/agent/v1/test', ok)
        self.client = TestClient(TestServer(app))
        await self.client.start_server()
        self.origin = str(self.client.make_url('/')).rstrip('/')

    async def asyncTearDown(self):
        await self.client.close()
        self.store.close()
        self.tmp.cleanup()

    async def login(self, username='admin'):
        response = await self.client.post('/api/auth/login', json={'username': username, 'password': PASSWORD}, headers={'Origin': self.origin})
        self.assertEqual(response.status, 200)
        self.assertIn('HttpOnly', response.headers['Set-Cookie'])
        return await response.json()

    async def test_failclosed_and_ready(self):
        response = await self.client.get('/api/unknown')
        self.assertEqual(response.status, 401)
        self.assertEqual(response.headers['Cache-Control'], 'private, no-store')
        # 迁移未完成时 Worker 通道同样拒绝，避免旧协议绕过资源索引。
        self.assertEqual((await self.client.post('/agent/v1/test')).status, 503)
        await self.login()
        self.assertEqual((await self.client.get('/api/business')).status, 503)
        self.assertEqual((await self.client.get('/api/auth/me')).status, 200)
        self.assertEqual((await self.client.get('/api/admin/users')).status, 200)
        self.store.set_ready()
        self.assertEqual((await self.client.get('/api/business')).status, 200)
        self.assertEqual((await self.client.post('/agent/v1/test')).status, 200)
        self.client.server.app['auth_store'] = None
        self.assertEqual((await self.client.get('/api/business')).status, 503)
        self.assertEqual((await self.client.post('/agent/v1/test')).status, 503)

    async def test_source_csrf_roles_and_logout(self):
        self.assertEqual((await self.client.post('/api/auth/login', json={'username': 'admin', 'password': PASSWORD})).status, 403)
        self.assertEqual((await self.client.post('/api/auth/login', json={'username': 'admin', 'password': PASSWORD}, headers={'Origin': 'https://evil.test'})).status, 403)
        session = await self.login('user')
        self.store.set_ready()
        self.assertEqual((await self.client.get('/api/status')).status, 403)
        self.assertEqual((await self.client.get('/controller', allow_redirects=False)).status, 403)
        self.assertEqual((await self.client.post('/api/auth/logout', headers={'Origin': self.origin})).status, 403)
        response = await self.client.post('/api/auth/logout', headers={'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']})
        self.assertEqual(response.status, 200)
        self.assertEqual((await self.client.get('/api/auth/me')).status, 401)

    async def test_admin_assign_projects(self):
        admin = self.store.list_users()[0]['id']
        self.store.create_project('p', admin)
        self.store.set_ready()
        body = {'projects': [{'project_id': 'p', 'owner_id': admin}], 'owner_id': self.uid}
        url = '/api/admin/projects/assign'
        self.assertEqual((await self.client.post(url, json=body)).status, 401)
        session = await self.login('user')
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
        self.assertEqual((await self.client.post(url, json=body, headers=headers)).status, 403)
        session = await self.login()
        headers['X-CSRF-Token'] = session['csrf_token']
        self.assertEqual((await self.client.post(url, json=body, headers={'Origin': self.origin})).status, 403)
        response = await self.client.post(url, json=body, headers=headers)
        self.assertEqual(response.status, 200)
        self.assertEqual((await response.json())['count'], 1)
        self.assertEqual(self.store.get_project('p')['owner_id'], self.uid)
        self.assertEqual((await self.client.post(url, json=body, headers=headers)).status, 409)
        self.assertEqual((await self.client.post(url, json={'projects': [None], 'owner_id': self.uid}, headers=headers)).status, 400)

    async def test_team_api_requires_leader_and_manages_members(self):
        member = self.store.create_user('member', PASSWORD)
        normal = self.store.create_user('normal', PASSWORD)
        self.store.set_user(self.uid, team_leader=True)
        self.store.set_ready()
        session = await self.login('user')
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
        response = await self.client.post('/api/teams', json={'name': '项目一组'}, headers=headers)
        self.assertEqual(response.status, 201)
        team = (await response.json())['team']
        candidates = await (await self.client.get('/api/team-candidates')).json()
        self.assertIn(member['id'], {user['id'] for user in candidates['users']})
        response = await self.client.post(f"/api/teams/{team['id']}/members",
                                          json={'user_id': member['id']}, headers=headers)
        self.assertEqual(response.status, 201)
        self.assertEqual(len(self.store.list_teams(member['id'])[0]['members']), 2)
        session = await self.login('normal')
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
        self.assertEqual((await self.client.post('/api/teams', json={'name': '越权'}, headers=headers)).status, 403)
        self.assertEqual((await self.client.get('/api/teams')).status, 200)
        self.assertEqual(normal['team_leader'], False)

    async def test_rate_limit_and_project_acl(self):
        session = await self.login('user')
        self.store.set_ready()
        self.store.create_project('p', self.uid)
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
        self.assertEqual((await self.client.post('/api/project', headers=headers)).status, 200)
        for _ in range(9):
            await self.client.post('/api/auth/login', json={'username': 'missing', 'password': 'bad'}, headers={'Origin': self.origin})
        self.assertEqual((await self.client.post('/api/auth/login', json={'username': 'missing', 'password': 'bad'}, headers={'Origin': self.origin})).status, 429)

    async def test_register_flow_over_http(self):
        url = '/api/auth/register'
        body = {'username': 'wangwu', 'display_name': '王五', 'password': PASSWORD}
        # 审批通道未配置：fail-closed，不产生申请
        self.assertEqual((await self.client.post(url, json=body, headers={'Origin': self.origin})).status, 503)
        self.client.server.app['dingtalk'] = {'stub': True}
        # 来源校验与字段校验
        self.assertEqual((await self.client.post(url, json=body)).status, 403)
        self.assertEqual((await self.client.post(url, json={'username': 'a'}, headers={'Origin': self.origin})).status, 400)
        self.assertEqual((await self.client.post(
            url, json={'username': 'wangwu', 'display_name': '王五', 'password': 'short'},
            headers={'Origin': self.origin})).status, 400)
        # 提交成功 → 201，待审账号不能登录
        response = await self.client.post(url, json=body, headers={'Origin': self.origin})
        self.assertEqual(response.status, 201)
        result = await response.json()
        self.assertEqual(result['status'], 'pending')
        denied = await self.client.post('/api/auth/login', json={'username': 'wangwu', 'password': PASSWORD}, headers={'Origin': self.origin})
        self.assertEqual(denied.status, 403)
        self.assertIn('审批中', (await denied.json())['error'])
        # 重复提交与大写同名在独立用例中验证（避免触碰 IP 限流）
        # 审批通过后可登录；管理员可见申请与姓名
        card = self.store.registration_card_data(result['request_id'])
        self.store.decide_registration(card['out_track_id'], 'approved', 'corp', '431661')
        ok = await self.client.post('/api/auth/login', json={'username': 'wangwu', 'password': PASSWORD}, headers={'Origin': self.origin})
        self.assertEqual(ok.status, 200)
        admin = await self.login()
        registrations = await self.client.get('/api/admin/registrations',
                                              headers={'Origin': self.origin})
        self.assertEqual(registrations.status, 200)
        payload = await registrations.json()
        self.assertEqual(payload['requests'][0]['display_name'], '王五')
        self.assertEqual(payload['requests'][0]['status'], 'approved')
        # 测试内没有发件箱 worker：send + update 两条任务保持待投递状态
        self.assertEqual(payload['outbox']['pending'], 2)
        self.client.server.app['dingtalk'] = None

    async def test_register_duplicate_and_casefold(self):
        self.client.server.app['dingtalk'] = {'stub': True}
        url = '/api/auth/register'
        body = {'username': 'wangwu', 'display_name': '王五', 'password': PASSWORD}
        self.assertEqual((await self.client.post(url, json=body, headers={'Origin': self.origin})).status, 201)
        self.assertEqual((await self.client.post(url, json=body, headers={'Origin': self.origin})).status, 409)
        # 大小写不同视为同名，同样冲突
        self.assertEqual((await self.client.post(url, json={**body, 'username': 'WANGWU'}, headers={'Origin': self.origin})).status, 409)
        self.client.server.app['dingtalk'] = None

    async def test_register_rate_limit(self):
        self.client.server.app['dingtalk'] = {'stub': True}
        body = {'username': 'spam', 'display_name': '刷', 'password': PASSWORD}
        statuses = []
        for _ in range(6):
            response = await self.client.post('/api/auth/register', json=body,
                                              headers={'Origin': self.origin})
            statuses.append(response.status)
        self.assertIn(201, statuses)
        self.assertIn(429, statuses)
        self.client.server.app['dingtalk'] = None


if __name__ == '__main__':
    unittest.main()
