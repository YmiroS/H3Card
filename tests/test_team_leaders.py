"""多人组长契约：临时真实 SQLite、真实会话和 HTTP 认证中间件。"""
import json
import sqlite3
import tempfile
import threading
import time
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

from server import auth
from server.auth_store import AuthError, AuthStore

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / 'server/migrations'
PASSWORD = 'team-leaders-test-password'


def snapshot(db):
    tables = [row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")]
    return {table: list(map(tuple, db.execute(f'SELECT * FROM "{table}" ORDER BY rowid')))
            for table in tables}


class TeamLeaderMigrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'v8.sqlite'
        self.db = sqlite3.connect(self.path, isolation_level=None)
        self.addCleanup(self.db.close)
        self.db.execute('PRAGMA foreign_keys=ON')
        for script in sorted(MIGRATIONS.glob('00[1-7]_*.sql')):
            self.db.executescript(script.read_text(encoding='utf-8'))
        # 用生产 v7->v8 方法构造真实旧库，不对最新 schema 伪改版本号。
        old = AuthStore.__new__(AuthStore)
        old.db = self.db
        old.lock = threading.RLock()
        self.db.row_factory = sqlite3.Row
        old._migrate_monitor_role(MIGRATIONS / '008_monitor_role.sql')
        self.assertEqual(self.db.execute('PRAGMA user_version').fetchone()[0], 8)
        self.assertNotIn('is_leader', {r['name'] for r in self.db.execute('PRAGMA table_info(team_members)')})
        self.db.executemany('INSERT INTO users VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', [
            ('a', 'Admin', 'admin', 'hash-a', 'admin', 1, 1, 10, '管理员', 'approved', 0, ''),
            ('f', 'Founder', 'founder', 'hash-f', 'user', 1, 2, 11, '原组长', 'approved', 0, ''),
            ('m', 'Member', 'member', 'hash-m', 'user', 1, 3, 12, '原成员', 'approved', 0, ''),
        ])
        self.db.executescript("""
            INSERT INTO teams VALUES('t','原项目组','f','active',20,21);
            INSERT INTO teams VALUES('deleted','已删除组','f','deleted',22,23);
            INSERT INTO teams VALUES('no-member','无负责人成员行','a','active',24,25);
            INSERT INTO team_members VALUES('t','f',30),('t','m',31),('deleted','f',32);
            INSERT INTO project_acl VALUES('p','m','active',40,'t'),('personal','f','active',41,NULL);
            INSERT INTO user_grants VALUES('m','f','read');
            INSERT INTO global_canvas_grants VALUES('a','operate');
            INSERT INTO project_user_shares VALUES('personal','m',42);
            INSERT INTO project_team_shares VALUES('personal','t',43);
            INSERT INTO project_user_views VALUES('personal','m',1,2,0.5,44);
            INSERT INTO job_acl VALUES('j','p','m');
            UPDATE auth_meta SET value='1' WHERE key='ready';
        """)
        self.db.execute('INSERT INTO sessions VALUES(?,?,?,?,?)',
                        (AuthStore._digest('old-session'), 'f', 'old-csrf', time.time() + 86400, 50))

    def test_v8_migration_preserves_all_old_data_and_reopens(self):
        before = snapshot(self.db)
        columns = {table: ','.join(r['name'] for r in self.db.execute(f'PRAGMA table_info("{table}")'))
                   for table in before}
        for opening in range(2):
            with self.subTest(opening=opening):
                store = AuthStore(self.path)
                try:
                    self.assertEqual(store.db.execute('PRAGMA user_version').fetchone()[0], 11)
                    self.assertEqual(store.db.execute('PRAGMA foreign_keys').fetchone()[0], 1)
                    self.assertEqual(store.db.execute('PRAGMA foreign_key_check').fetchall(), [])
                    for table, rows in before.items():
                        self.assertEqual(list(map(tuple, store.db.execute(
                            f'SELECT {columns[table]} FROM "{table}" ORDER BY rowid'))), rows, table)
                    self.assertEqual(list(map(tuple, store.db.execute(
                        'SELECT team_id,user_id,is_leader FROM team_members ORDER BY joined_at'))),
                        [('t', 'f', 1), ('t', 'm', 0), ('deleted', 'f', 1)])
                    info = [r for r in store.db.execute('PRAGMA table_info(team_members)')
                            if r['name'] == 'is_leader']
                    self.assertEqual(len(info), 1)
                    self.assertEqual((info[0]['type'], info[0]['notnull'], info[0]['dflt_value']),
                                     ('INTEGER', 1, '0'))
                    for invalid in (-1, 2, None):
                        with self.assertRaises(sqlite3.IntegrityError):
                            store.db.execute('UPDATE team_members SET is_leader=? WHERE user_id=?',
                                             (invalid, 'm'))
                    session = store.get_session('old-session')
                    self.assertTrue(session['user']['can_manage_teams'])
                    self.assertFalse(session['user']['team_leader'])
                    self.assertEqual(session['csrf_token'], 'old-csrf')
                    self.assertEqual(store.list_teams('f')[0]['leader_id'], 'f')
                    self.assertTrue(store.list_teams('f')[0]['can_manage'])
                    self.assertEqual(store.project_permission('f', 'p'), 'operate')
                    self.assertEqual(store.get_project('p')['owner_id'], 'm')
                finally:
                    store.close()

    def test_failed_v9_migration_rolls_back_data_schema_and_version(self):
        before = snapshot(self.db)
        original = Path.read_text

        def broken(path, *args, **kwargs):
            text = original(path, *args, **kwargs)
            if path.name == '009_team_leaders.sql':
                return text.replace('PRAGMA user_version=9;', 'SELECT * FROM missing_table;')
            return text

        with patch.object(Path, 'read_text', broken), self.assertRaises(sqlite3.Error):
            AuthStore(self.path)
        self.assertEqual(self.db.execute('PRAGMA user_version').fetchone()[0], 8)
        self.assertNotIn('is_leader', {r['name'] for r in self.db.execute('PRAGMA table_info(team_members)')})
        self.assertEqual(snapshot(self.db), before)
        self.assertEqual(self.db.execute('PRAGMA foreign_key_check').fetchall(), [])
        store = AuthStore(self.path)
        store.close()


class TeamFixture:
    def make_store(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / 'auth.sqlite'
        self.store = AuthStore(self.path)
        self.users = {}
        for name, role, global_leader in (
                ('admin', 'admin', False), ('founder', 'user', True),
                ('new', 'user', False), ('member', 'user', False),
                ('other', 'user', True), ('outsider', 'user', False),
                ('monitor', 'monitor', False)):
            self.users[name] = self.store.create_user(name, PASSWORD, role, global_leader)['id']
        self.team = self.store.create_team('项目一组', self.users['founder'])['id']
        self.other_team = self.store.create_team('项目二组', self.users['other'])['id']
        self.store.add_team_members(self.team, [self.users['new'], self.users['member'], self.users['monitor']],
                                    self.users['founder'])
        self.store.add_team_member(self.other_team, self.users['outsider'], self.users['other'])
        self.store.set_ready()

    def promote(self, name='new', actor='founder'):
        return self.store.set_team_leader(self.team, self.users[name], self.users[actor])

    def assert_rejected_without_writes(self, operation, status):
        before = snapshot(self.store.db)
        with self.assertRaises(AuthError) as ctx:
            operation()
        self.assertEqual(ctx.exception.status, status)
        self.assertEqual(snapshot(self.store.db), before)
        self.assertFalse(self.store.db.in_transaction)


class TeamLeaderStoreTests(TeamFixture, unittest.TestCase):
    def setUp(self):
        self.make_store()

    def tearDown(self):
        self.store.close()
        self.temp.cleanup()

    def test_multiple_leaders_identity_member_contract_and_persistence(self):
        founder_before = dict(self.store._user(self.users['founder']))
        new_before = dict(self.store._user(self.users['new']))
        team_before = dict(self.store._team(self.team))
        self.assertEqual(self.promote(), {'ok': True})
        self.assertEqual(self.promote('member', 'new'), {'ok': True})
        for actor in ('founder', 'new', 'member', 'admin'):
            team = next(t for t in self.store.list_teams(self.users[actor]) if t['id'] == self.team)
            self.assertTrue(team['can_manage'])
            self.assertEqual(team['leader_id'], self.users['founder'])
            self.assertEqual(team['leader_username'], 'founder')
            members = {m['id']: m for m in team['members']}
            for name in ('founder', 'new', 'member'):
                item = members[self.users[name]]
                self.assertIs(item['is_leader'], True)
                self.assertEqual(item['role'], 'user')
                self.assertEqual(item['approval_status'], 'approved')
            self.assertIs(members[self.users['monitor']]['is_leader'], False)
            self.assertEqual(members[self.users['monitor']]['role'], 'monitor')
        self.assertEqual(dict(self.store._user(self.users['founder'])), founder_before)
        self.assertEqual(dict(self.store._user(self.users['new'])), new_before)
        self.assertEqual(self.store._team(self.team), team_before)
        before = snapshot(self.store.db)
        self.promote()
        self.assertEqual(snapshot(self.store.db), before)
        self.store.add_team_members(self.team, [self.users['founder'], self.users['new']], self.users['new'])
        self.assertEqual(snapshot(self.store.db), before)
        self.store.close()
        self.store = AuthStore(self.path)
        self.assertTrue(self.store.list_teams(self.users['new'])[0]['can_manage'])
        self.assertEqual(self.store.db.execute('PRAGMA foreign_key_check').fetchall(), [])

    def test_local_leader_member_management_and_all_leaders_removal_protection(self):
        self.promote()
        self.store.add_team_member(self.team, self.users['outsider'], self.users['new'])
        item = next(m for m in self.store.list_teams(self.users['new'])[0]['members']
                    if m['id'] == self.users['outsider'])
        self.assertIs(item['is_leader'], False)
        self.store.remove_team_member(self.team, self.users['outsider'], self.users['new'])
        for actor in ('admin', 'founder', 'new'):
            for target in ('founder', 'new'):
                with self.subTest(actor=actor, target=target):
                    self.assert_rejected_without_writes(lambda: self.store.remove_team_member(
                        self.team, self.users[target], self.users[actor]), 409)
        self.store.remove_team_member(self.team, self.users['member'], self.users['new'])
        self.assertNotIn(self.users['member'], {m['id'] for m in self.store.list_teams(self.users['new'])[0]['members']})

    def test_global_creation_privilege_and_cross_team_isolation(self):
        self.promote()
        # 加入其他组仍只是普通成员；全局创建权限也不能代替该组组长身份。
        self.store.add_team_members(self.other_team, [self.users['new'], self.users['founder']], self.users['other'])
        for actor in ('new', 'founder', 'member', 'outsider'):
            for method, args in (
                    (self.store.set_team_leader, (self.other_team, self.users['outsider'])),
                    (self.store.add_team_member, (self.other_team, self.users['member'])),
                    (self.store.remove_team_member, (self.other_team, self.users['outsider']))):
                self.assert_rejected_without_writes(lambda: method(*args, self.users[actor]), 403)
        teams = {t['id']: t for t in self.store.list_teams(self.users['new'])}
        self.assertTrue(teams[self.team]['can_manage'])
        self.assertFalse(teams[self.other_team]['can_manage'])
        self.assert_rejected_without_writes(lambda: self.store.create_team('不许创建', self.users['new']), 403)
        self.assertFalse(self.store.get_user(self.users['new'])['team_leader'])
        self.store.create_team('原有创建权限保留', self.users['founder'])
        self.store.set_user(self.users['founder'], team_leader=False)
        # 账号级授权撤回，不取消其仍然存在的组内组长身份。
        self.store.add_team_member(self.team, self.users['outsider'], self.users['founder'])
        self.assert_rejected_without_writes(lambda: self.store.create_team('已撤回创建权限', self.users['founder']), 403)

    def test_target_eligibility_nonmembers_and_inactive_team_are_rejected(self):
        for target, status in (('missing', 404), (self.users['outsider'], 404), (self.users['monitor'], 409)):
            self.assert_rejected_without_writes(lambda: self.store.set_team_leader(
                self.team, target, self.users['founder']), status)
        for column, value in (('enabled', 0), ('approval_status', 'pending'), ('approval_status', 'rejected'), ('role', 'monitor')):
            self.store.db.execute(f'UPDATE users SET {column}=? WHERE id=?', (value, self.users['new']))
            self.assert_rejected_without_writes(lambda: self.promote(), 409)
            self.store.db.execute("UPDATE users SET enabled=1,approval_status='approved',role='user' WHERE id=?",
                                  (self.users['new'],))
        self.promote()
        self.store.db.execute('UPDATE users SET enabled=0 WHERE id=?', (self.users['new'],))
        self.assert_rejected_without_writes(lambda: self.promote(), 409)
        self.store.db.execute("UPDATE teams SET state='deleted' WHERE id=?", (self.team,))
        self.assert_rejected_without_writes(lambda: self.promote(), 404)
        self.assert_rejected_without_writes(lambda: self.store.set_team_leader('missing', self.users['new'], self.users['admin']), 404)
        for value in (None, '', 123):
            self.assert_rejected_without_writes(lambda: self.store.set_team_leader(
                value, self.users['new'], self.users['admin']), 400)

    def test_derived_session_capability_is_live_and_candidates_are_not_public(self):
        session = self.store.login('new', PASSWORD)
        self.assertIs(session['user']['can_manage_teams'], False)
        for actor in ('new', 'member', 'outsider'):
            self.assert_rejected_without_writes(lambda: self.store.list_team_candidates(self.users[actor]), 403)
        self.promote()
        current = self.store.get_session(session['token'])
        self.assertIs(current['user']['can_manage_teams'], True)
        self.assertFalse(current['user']['team_leader'])
        self.assertEqual(current['csrf_token'], session['csrf_token'])
        self.assertNotIn('token', current)
        self.assertNotIn('password_hash', current['user'])
        self.assertTrue(self.store.login('new', PASSWORD)['user']['can_manage_teams'])
        self.assertIn(self.users['member'], {u['id'] for u in self.store.list_team_candidates(
            self.users['new'], session['token'])})
        self.store.db.execute("UPDATE teams SET state='deleted' WHERE id=?", (self.team,))
        self.assertIs(self.store.get_session(session['token'])['user']['can_manage_teams'], False)
        self.assert_rejected_without_writes(lambda: self.store.list_team_candidates(
            self.users['new'], session['token']), 403)
        self.assertTrue(self.store.login('founder', PASSWORD)['user']['can_manage_teams'])
        self.assertTrue(self.store.login('admin', PASSWORD)['user']['can_manage_teams'])
        self.assertFalse(self.store.login('monitor', PASSWORD)['user']['can_manage_teams'])

    def test_invalid_session_and_expired_actor_permissions_are_rechecked(self):
        self.promote()
        session = self.store.login('new', PASSWORD)
        other = self.store.login('other', PASSWORD)
        for token in ('', 'unknown', other['token']):
            self.assert_rejected_without_writes(lambda: self.store.set_team_leader(
                self.team, self.users['member'], self.users['new'], token), 401)
        for column, value, status in (('enabled', 0, 401), ('approval_status', 'pending', 401), ('role', 'monitor', 403)):
            self.store.db.execute(f'UPDATE users SET {column}=? WHERE id=?', (value, self.users['new']))
            self.assert_rejected_without_writes(lambda: self.store.set_team_leader(
                self.team, self.users['member'], self.users['new'], session['token']), status)
            if column != 'role':
                self.assertIsNone(self.store.get_session(session['token']))
            else:
                self.assertFalse(self.store.get_session(session['token'])['user']['can_manage_teams'])
                self.assertFalse(self.store.list_teams(self.users['new'])[0]['can_manage'])
            self.store.db.execute("UPDATE users SET enabled=1,approval_status='approved',role='user' WHERE id=?",
                                  (self.users['new'],))
        self.store.db.execute('UPDATE team_members SET is_leader=0 WHERE team_id=? AND user_id=?',
                              (self.team, self.users['new']))
        self.assert_rejected_without_writes(lambda: self.store.set_team_leader(
            self.team, self.users['member'], self.users['new'], session['token']), 403)
        self.store.db.execute('UPDATE sessions SET expires_at=0 WHERE token_hash=?',
                              (AuthStore._digest(session['token']),))
        self.assert_rejected_without_writes(lambda: self.store.set_team_leader(
            self.team, self.users['member'], self.users['new'], session['token']), 401)


class TeamLeaderHTTPTests(TeamFixture, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.make_store()
        app = web.Application(middlewares=[auth.auth_middleware])
        app['auth_store'] = self.store
        auth.register_auth_routes(app, ROOT / 'web')

        async def team_page(request):
            # 与 app.py 的 teams_page 相同，额外覆盖 handler 级检查。
            auth.require_team_leader(request)
            return web.Response(text='项目组页面')

        app.router.add_get('/teams', team_page)
        app.router.add_get('/teams.html', team_page)
        self.client = TestClient(TestServer(app))
        await self.client.start_server()
        self.origin = str(self.client.make_url('/')).rstrip('/')

    async def asyncTearDown(self):
        await self.client.close()
        self.store.close()
        self.temp.cleanup()

    def headers(self, session):
        return {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}

    async def login(self, username='founder'):
        response = await self.client.post('/api/auth/login', json={'username': username, 'password': PASSWORD},
                                          headers={'Origin': self.origin})
        self.assertEqual(response.status, 200, await response.text())
        result = await response.json()
        self.assertNotIn('token', result)
        return result

    async def put_leader(self, target='new', team=None, **kwargs):
        return await self.client.put(f'/api/teams/{team or self.team}/leaders/{self.users.get(target, target)}', **kwargs)

    async def test_empty_json_contract_identity_idempotence_and_existing_session(self):
        # 此会话在授予前签发，之后直接继续使用，不重新登录。
        old = self.store.login('new', PASSWORD)
        self.assertFalse(old['user']['can_manage_teams'])
        session = await self.login()
        response = await self.put_leader(json={}, headers=self.headers(session))
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {'ok': True})
        before = snapshot(self.store.db)
        response = await self.put_leader(json={}, headers=self.headers(session))
        self.assertEqual(response.status, 200)
        self.assertEqual(await response.json(), {'ok': True})
        self.assertEqual(snapshot(self.store.db), before)
        self.client.session.cookie_jar.clear()
        self.client.session.cookie_jar.update_cookies({auth.COOKIE: old['token']}, response_url=self.client.make_url('/'))
        response = await self.client.get('/api/auth/me')
        self.assertEqual(response.status, 200)
        me = await response.json()
        self.assertEqual(me['user']['id'], self.users['new'])
        self.assertTrue(me['user']['can_manage_teams'])
        self.assertFalse(me['user']['team_leader'])
        self.assertEqual(me['csrf_token'], old['csrf_token'])
        self.assertNotIn('token', me)
        self.assertNotIn('token', me['user'])
        self.assertNotIn('password_hash', me['user'])
        for path in ('/teams', '/teams.html', '/api/team-candidates'):
            self.assertEqual((await self.client.get(path)).status, 200)
        response = await self.client.get('/api/teams')
        team = (await response.json())['teams'][0]
        self.assertTrue(team['can_manage'])
        self.assertEqual(team['leader_id'], self.users['founder'])
        self.assertEqual(team['leader_username'], 'founder')
        members = {m['id']: m for m in team['members']}
        for name, expected in (('founder', True), ('new', True), ('member', False)):
            member = members[self.users[name]]
            self.assertIs(member['is_leader'], expected)
            self.assertEqual(member['role'], 'user')
            self.assertEqual(member['approval_status'], 'approved')
        self.assertEqual((await self.put_leader('member', json={}, headers=self.headers(old))).status, 200)
        before = snapshot(self.store.db)
        response = await self.client.post('/api/teams', json={'name': '禁止创建'}, headers=self.headers(old))
        self.assertEqual(response.status, 403)
        self.assertEqual(snapshot(self.store.db), before)
        self.assertFalse(self.store.get_user(self.users['new'])['team_leader'])

    async def test_new_leader_can_manage_members_but_not_remove_any_leader(self):
        self.promote()
        session = await self.login('new')
        headers = self.headers(session)
        response = await self.client.post(f'/api/teams/{self.team}/members/batch',
                                          json={'user_ids': [self.users['founder'], self.users['new'], self.users['outsider']]},
                                          headers=headers)
        self.assertEqual(response.status, 201)
        for target in ('founder', 'new'):
            before = snapshot(self.store.db)
            response = await self.client.delete(f'/api/teams/{self.team}/members/{self.users[target]}', headers=headers)
            self.assertEqual(response.status, 409)
            self.assertEqual(snapshot(self.store.db), before)
        response = await self.client.delete(f'/api/teams/{self.team}/members/{self.users["outsider"]}', headers=headers)
        self.assertEqual(response.status, 200)
        self.assertEqual(await response.json(), {'ok': True})
        response = await self.client.post(f'/api/teams/{self.team}/members',
                                          json={'user_id': self.users['outsider']}, headers=headers)
        self.assertEqual(response.status, 201)

    async def test_cross_team_read_only_and_global_leader_are_not_managers(self):
        self.promote()
        self.store.add_team_member(self.other_team, self.users['new'], self.users['other'])
        self.store.create_project('shared-read-only', self.users['other'])
        self.store.set_grant(self.users['member'], self.users['other'], 'read')
        for actor in ('new', 'founder', 'member', 'outsider'):
            session = await self.login(actor)
            headers = self.headers(session)
            before = snapshot(self.store.db)
            response = await self.put_leader('outsider', team=self.other_team, json={}, headers=headers)
            self.assertEqual(response.status, 403, await response.text())
            for method, path, body in (
                    ('post', f'/api/teams/{self.other_team}/members', {'user_id': self.users['member']}),
                    ('delete', f'/api/teams/{self.other_team}/members/{self.users["outsider"]}', None)):
                kwargs = {'headers': headers}
                if body is not None:
                    kwargs['json'] = body
                self.assertEqual((await getattr(self.client, method)(path, **kwargs)).status, 403)
            self.assertEqual(snapshot(self.store.db), before)
            if actor in ('member', 'outsider'):
                self.assertEqual((await self.client.get('/api/team-candidates')).status, 403)
                self.assertEqual((await self.client.get('/teams')).status, 403)
        session = await self.login('admin')
        response = await self.put_leader('outsider', team=self.other_team, json={}, headers=self.headers(session))
        self.assertEqual(response.status, 200)
        self.assertEqual(self.store._team(self.other_team)['leader_id'], self.users['other'])

    async def test_invalid_json_source_csrf_and_session_do_not_write(self):
        session = await self.login()
        good = self.headers(session)
        for headers in ({}, {'Origin': self.origin}, {**good, 'X-CSRF-Token': 'wrong'},
                        {**good, 'Origin': 'https://evil.invalid'}, {**good, 'Sec-Fetch-Site': 'cross-site'}):
            before = snapshot(self.store.db)
            self.assertEqual((await self.put_leader(json={}, headers=headers)).status, 403)
            self.assertEqual(snapshot(self.store.db), before)
        for body in ({'is_leader': True}, {'role': 'admin'}, {'user_id': self.users['new']}, [], None, False, ''):
            before = snapshot(self.store.db)
            # data 明确覆盖 JSON null 和空请求，不能被客户端省略。
            response = await self.put_leader(data=json.dumps(body), headers={**good, 'Content-Type': 'application/json'})
            self.assertEqual(response.status, 400, await response.text())
            self.assertEqual(snapshot(self.store.db), before)
        for data in (b'', b'{', b'\xff'):
            before = snapshot(self.store.db)
            response = await self.put_leader(data=data, headers=good)
            self.assertEqual(response.status, 400)
            self.assertEqual(snapshot(self.store.db), before)
        self.client.session.cookie_jar.clear()
        before = snapshot(self.store.db)
        self.assertEqual((await self.put_leader(json={}, headers=good)).status, 401)
        self.assertEqual(snapshot(self.store.db), before)
        session = await self.login()
        self.store.db.execute('UPDATE sessions SET expires_at=0')
        before = snapshot(self.store.db)
        self.assertEqual((await self.put_leader(json={}, headers=self.headers(session))).status, 401)
        self.assertEqual(snapshot(self.store.db), before)

    async def test_ineligible_targets_and_monitor_isolation(self):
        session = await self.login()
        headers = self.headers(session)
        for target, expected in (('missing', 404), ('outsider', 404), ('monitor', 409)):
            before = snapshot(self.store.db)
            self.assertEqual((await self.put_leader(target, json={}, headers=headers)).status, expected)
            self.assertEqual(snapshot(self.store.db), before)
        for column, value in (('enabled', 0), ('approval_status', 'pending'), ('approval_status', 'rejected'), ('role', 'monitor')):
            self.store.db.execute(f'UPDATE users SET {column}=? WHERE id=?', (value, self.users['new']))
            before = snapshot(self.store.db)
            self.assertEqual((await self.put_leader(json={}, headers=headers)).status, 409)
            self.assertEqual(snapshot(self.store.db), before)
            response = await self.client.get('/api/teams')
            member = next(m for m in (await response.json())['teams'][0]['members'] if m['id'] == self.users['new'])
            self.assertEqual(member[column], bool(value) if column == 'enabled' else value)
            self.assertFalse(member['is_leader'])
            self.store.db.execute("UPDATE users SET enabled=1,approval_status='approved',role='user' WHERE id=?",
                                  (self.users['new'],))
        session = await self.login('monitor')
        self.assertFalse(session['user']['can_manage_teams'])
        before = snapshot(self.store.db)
        self.assertEqual((await self.put_leader(json={}, headers=self.headers(session))).status, 403)
        self.assertEqual((await self.client.get('/api/teams')).status, 403)
        self.assertEqual((await self.client.get('/api/team-candidates')).status, 403)
        self.assertEqual(snapshot(self.store.db), before)

    async def test_permissions_expire_on_next_read_without_relogin(self):
        self.promote()
        session = await self.login('new')
        self.assertTrue(session['user']['can_manage_teams'])
        self.store.db.execute("UPDATE teams SET state='deleted' WHERE id=?", (self.team,))
        response = await self.client.get('/api/auth/me')
        self.assertFalse((await response.json())['user']['can_manage_teams'])
        for path in ('/teams', '/api/team-candidates'):
            self.assertEqual((await self.client.get(path)).status, 403)
        before = snapshot(self.store.db)
        self.assertEqual((await self.put_leader('member', json={}, headers=self.headers(session))).status, 403)
        self.assertEqual(snapshot(self.store.db), before)
        self.store.db.execute("UPDATE teams SET state='active' WHERE id=?", (self.team,))
        for column, value in (('enabled', 0), ('approval_status', 'pending')):
            self.store.db.execute(f'UPDATE users SET {column}=? WHERE id=?', (value, self.users['new']))
            self.assertEqual((await self.client.get('/api/auth/me')).status, 401)
            before = snapshot(self.store.db)
            self.assertEqual((await self.put_leader('member', json={}, headers=self.headers(session))).status, 401)
            self.assertEqual(snapshot(self.store.db), before)
            self.store.db.execute("UPDATE users SET enabled=1,approval_status='approved' WHERE id=?", (self.users['new'],))

    async def test_transaction_rechecks_after_http_authorization_using_second_connection(self):
        self.promote()
        session = await self.login('new')
        real_call = auth.call_store
        mutations = (
            ("UPDATE users SET enabled=0 WHERE id=?", (self.users['new'],), 401),
            ("UPDATE users SET approval_status='pending' WHERE id=?", (self.users['new'],), 401),
            ("UPDATE users SET role='monitor' WHERE id=?", (self.users['new'],), 403),
            ('UPDATE sessions SET expires_at=0 WHERE user_id=?', (self.users['new'],), 401),
            ('DELETE FROM sessions WHERE user_id=?', (self.users['new'],), 401),
            ('UPDATE team_members SET is_leader=0 WHERE team_id=? AND user_id=?', (self.team, self.users['new']), 403),
            ('DELETE FROM team_members WHERE team_id=? AND user_id=?', (self.team, self.users['new']), 403),
            ("UPDATE teams SET state='deleted' WHERE id=?", (self.team,), 404),
            ('UPDATE users SET enabled=0 WHERE id=?', (self.users['member'],), 409),
            ("UPDATE users SET approval_status='pending' WHERE id=?", (self.users['member'],), 409),
            ("UPDATE users SET role='monitor' WHERE id=?", (self.users['member'],), 409),
            ('DELETE FROM team_members WHERE team_id=? AND user_id=?', (self.team, self.users['member']), 404),
        )
        for sql, args, expected in mutations:
            with self.subTest(sql=sql, args=args):
                # 还原的均为本测试临时库；让每个子用例都先通过 HTTP 中间件鉴权。
                self.store.db.execute("UPDATE users SET enabled=1,approval_status='approved',role='user' WHERE id IN (?,?)",
                                      (self.users['new'], self.users['member']))
                self.store.db.execute("UPDATE teams SET state='active' WHERE id=?", (self.team,))
                for name, leader in (('new', 1), ('member', 0)):
                    self.store.db.execute('INSERT INTO team_members(team_id,user_id,joined_at,is_leader) VALUES(?,?,?,?) '
                                          'ON CONFLICT(team_id,user_id) DO UPDATE SET is_leader=excluded.is_leader',
                                          (self.team, self.users[name], time.time(), leader))
                if self.store.get_session(self.client.session.cookie_jar.filter_cookies(self.client.make_url('/'))[auth.COOKIE].value) is None:
                    session = await self.login('new')
                before_write = None

                async def interpose(app, method, *method_args, **kwargs):
                    nonlocal before_write
                    if method == 'set_team_leader':
                        with closing(sqlite3.connect(self.path)) as second, second:
                            second.execute('PRAGMA foreign_keys=ON')
                            second.execute(sql, args)
                        before_write = snapshot(self.store.db)
                    return await real_call(app, method, *method_args, **kwargs)

                with patch.object(auth, 'call_store', interpose):
                    response = await self.put_leader('member', json={}, headers=self.headers(session))
                self.assertEqual(response.status, expected, await response.text())
                self.assertIsNotNone(before_write)
                self.assertEqual(snapshot(self.store.db), before_write)
                self.assertFalse(self.store.db.in_transaction)
