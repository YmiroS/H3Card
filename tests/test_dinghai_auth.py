import json
import tempfile
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import AsyncMock, patch

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

from server.auth import COOKIE, auth_middleware, register_auth_routes
from server.auth_store import AuthError, AuthStore
from server.dinghai_auth import authenticate, validate_origin

PASSWORD = 'test-local-password'
ISSUER = 'https://dinghai.example.test'
ROOT = Path(__file__).resolve().parents[1]
PROFILE = {'id': '42', 'username': 'upstream-account', 'display_name': '定海用户', 'phone': ''}


class DinghaiStoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / 'auth.db'
        self.store = AuthStore(self.path)
        self.admin = self.store.create_user('admin', PASSWORD, 'admin')
        self.user = self.store.create_user('local-user', PASSWORD)

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def pending(self, subject='42'):
        return self.store.dinghai_login(ISSUER, subject, '定海用户')

    def bind(self, pending, username='local-user', password=PASSWORD):
        return self.store.dinghai_bind(pending['binding_token'], pending['binding_csrf'],
                                       ISSUER, username, password)

    def test_password_binding_reuses_all_permissions_and_data(self):
        uid = self.user['id']
        self.store.set_user(uid, team_leader=True)
        team = self.store.create_team('原项目组', uid)
        self.store.create_project('original-project', uid)
        self.store.register_job('original-job', 'original-project', uid)
        self.store.set_global_grant(uid, 'read')
        before = self.store.get_user(uid)
        pending = self.pending()
        self.assertEqual(pending['status'], 'binding_required')
        self.assertEqual(pending['binding'], {'dinghai_name': '定海用户'})
        self.assertNotIn('user', pending)
        self.assertIsNone(self.store.get_session(pending['binding_token']))
        result = self.bind(pending)
        self.assertEqual(result['user']['id'], uid)
        self.assertTrue(result['user']['team_leader'])
        self.assertTrue(result['user']['can_manage_teams'])
        self.assertEqual(self.store.get_user(uid), before)
        self.assertEqual(self.store.project_permission(uid, 'original-project'), 'operate')
        self.assertEqual(self.store.get_job('original-job')['user_id'], uid)
        self.assertEqual(self.store.list_teams(uid)[0]['id'], team['id'])
        self.assertEqual(self.store.get_session(result['token'])['user']['id'], uid)
        self.assertEqual(self.store.login('local-user', PASSWORD)['user']['id'], uid)
        with self.assertRaises(AuthError):
            self.bind(pending)

    def test_admin_and_monitor_roles_are_preserved(self):
        for role in ('admin', 'monitor'):
            user = self.store.create_user(role + '-target', PASSWORD, role)
            result = self.bind(self.pending(role), user['username'])
            self.assertEqual(result['user']['role'], role)
            self.assertEqual(result['user']['id'], user['id'])

    def test_unbound_user_does_not_auto_register_or_require_phone(self):
        for subject in ('one', 'two'):
            self.assertEqual(self.pending(subject)['status'], 'binding_required')
        self.assertEqual(len(self.store.list_users()), 2)
        self.assertEqual(self.store.db.execute('SELECT COUNT(*) FROM external_identities').fetchone()[0], 0)

    def test_missing_account_wrong_password_same_error_and_retry_works(self):
        pending = self.pending()
        for username, password in [('not-found', PASSWORD), ('local-user', 'wrong')]:
            with self.assertRaisesRegex(AuthError, '抽卡用户名或密码错误') as error:
                self.bind(pending, username, password)
            self.assertEqual(error.exception.status, 401)
        result = self.bind(pending, ' LOCAL-USER ')
        self.assertEqual(result['user']['id'], self.user['id'])

    def test_bound_identity_reads_live_role_and_disable_state(self):
        result = self.bind(self.pending())
        uid = result['user']['id']
        self.assertEqual(self.pending()['user']['id'], uid)
        self.store.set_user(uid, role='monitor')
        self.assertIsNone(self.store.get_session(result['token']))
        self.assertEqual(self.pending()['user']['role'], 'monitor')
        self.store.set_user(uid, enabled=False)
        with self.assertRaisesRegex(AuthError, '不可用'):
            self.pending()

    def test_disabled_and_pending_accounts_cannot_bind(self):
        self.store.set_user(self.user['id'], enabled=False)
        with self.assertRaises(AuthError):
            self.bind(self.pending())
        self.store.create_registration('pending-user', PASSWORD, '待审批', '13900139000')
        with self.assertRaisesRegex(AuthError, '不可用'):
            self.bind(self.pending(), 'pending-user')

    def test_csrf_cancel_expiry_environment_and_replay(self):
        pending = self.pending()
        for csrf in ('wrong', '非法头'):
            with self.assertRaisesRegex(AuthError, '校验失败'):
                self.store.dinghai_bind(pending['binding_token'], csrf, ISSUER, 'local-user', PASSWORD)
        with self.assertRaisesRegex(AuthError, '环境已变化'):
            self.store.dinghai_bind(pending['binding_token'], pending['binding_csrf'],
                                    'https://other.example.test', 'local-user', PASSWORD)
        self.store.dinghai_cancel(pending['binding_token'], pending['binding_csrf'])
        with self.assertRaisesRegex(AuthError, '失效'):
            self.bind(pending)
        pending = self.pending()
        with patch('server.auth_store.time.time', return_value=time.time() + 301):
            with self.assertRaisesRegex(AuthError, '失效'):
                self.bind(pending)

    def test_binding_rechecks_account_after_password_verification(self):
        pending = self.pending()
        verify = self.store._verify
        def change_password(hashed, password):
            valid = verify(hashed, password)
            self.store.reset_password(self.user['id'], 'changed-local-password')
            return valid
        with patch.object(self.store, '_verify', side_effect=change_password):
            with self.assertRaisesRegex(AuthError, '信息已变化'):
                self.bind(pending)
        self.assertEqual(self.store.db.execute('SELECT COUNT(*) FROM external_identities').fetchone()[0], 0)

    def test_conflicting_identity_cannot_overwrite_binding(self):
        other = self.pending('43')
        self.bind(self.pending())
        with self.assertRaisesRegex(AuthError, '已有其他绑定'):
            self.bind(other)
        self.assertEqual(self.pending()['user']['id'], self.user['id'])

    def test_concurrent_confirmation_is_atomic_across_connections(self):
        second = AuthStore(self.path)
        try:
            one, two = self.pending(), self.pending()
            def confirm(args):
                store, pending = args
                try:
                    return store.dinghai_bind(pending['binding_token'], pending['binding_csrf'],
                                              ISSUER, 'local-user', PASSWORD)['status']
                except AuthError:
                    return 'conflict'
            with ThreadPoolExecutor(max_workers=2) as pool:
                outcomes = list(pool.map(confirm, [(self.store, one), (second, two)]))
            self.assertCountEqual(outcomes, ['authenticated', 'conflict'])
        finally:
            second.close()

    def test_migration_preserves_existing_v9_accounts_and_sessions(self):
        session = self.store.login('local-user', PASSWORD)
        self.store.db.executescript('DROP TABLE dinghai_binding_challenges; '
                                   'DROP TABLE external_identities; PRAGMA user_version=9;')
        self.store.close()
        self.store = AuthStore(self.path)
        self.assertEqual(self.store.db.execute('PRAGMA user_version').fetchone()[0], 10)
        self.assertEqual(self.store.get_session(session['token'])['user']['id'], self.user['id'])


class DinghaiHttpTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = AuthStore(Path(self.tmp.name) / 'auth.db')
        self.store.create_user('admin', PASSWORD, 'admin')
        self.user = self.store.create_user('local-user', PASSWORD)
        self.store.set_ready()
        self.app = web.Application(middlewares=[auth_middleware])
        self.app['auth_store'] = self.store
        with patch.dict('os.environ', {'CHOUKA_DINGHAI_API_BASE': ISSUER}):
            register_auth_routes(self.app, ROOT / 'web')
        self.client = TestClient(TestServer(self.app))
        await self.client.start_server()
        self.origin = str(self.client.make_url('/')).rstrip('/')
        self.headers = {'Origin': self.origin}
        self.auth = AsyncMock(return_value={'subject': '42', 'display_name': '定海用户',
                                           'token': 'fixture-upstream-token', 'profile': dict(PROFILE)})
        self.patcher = patch('server.dinghai_auth.authenticate', self.auth)
        self.patcher.start()

    async def asyncTearDown(self):
        self.patcher.stop()
        await self.client.close()
        self.store.close()
        self.tmp.cleanup()

    async def login(self):
        return await self.client.post('/api/auth/dinghai/login',
                                      json={'account': 'dinghai', 'password': PASSWORD}, headers=self.headers)

    async def confirm(self, data, password=PASSWORD):
        return await self.client.post('/api/auth/dinghai/bind',
            json={'username': 'local-user', 'password': password},
            headers=self.headers | {'X-Binding-CSRF': data['binding_csrf']})

    async def test_config_and_pending_are_public_but_not_a_business_session(self):
        response = await self.client.get('/api/auth/login-config')
        self.assertEqual(await response.json(), {'dinghai_enabled': True})
        response = await self.login()
        self.assertEqual(response.status, 200)
        data = await response.json()
        self.assertEqual(data['status'], 'binding_required')
        self.assertNotIn('binding_token', data)
        self.assertNotIn('satoken', json.dumps(data))
        self.assertTrue(response.cookies['chouka_dinghai_binding']['httponly'])
        self.assertEqual(response.cookies['chouka_dinghai_binding']['samesite'], 'Strict')
        self.assertEqual(response.cookies['chouka_dinghai_binding']['max-age'], '300')
        self.assertEqual((await self.client.get('/api/auth/me')).status, 401)
        self.auth.assert_awaited_once_with(ISSUER, 'dinghai', PASSWORD)

    async def test_bind_requires_origin_cookie_csrf_and_password(self):
        pending = await (await self.login()).json()
        url = '/api/auth/dinghai/bind'
        body = {'username': 'local-user', 'password': PASSWORD}
        self.assertEqual((await self.client.post(url, json=body)).status, 403)
        self.assertEqual((await self.client.post(url, json=body, headers=self.headers)).status, 403)
        self.assertEqual((await self.confirm(pending, 'wrong')).status, 401)
        response = await self.confirm(pending)
        self.assertEqual(response.status, 200)
        data = await response.json()
        self.assertEqual(data['user']['id'], self.user['id'])
        self.assertNotIn('token', data)
        self.assertTrue(response.cookies[COOKIE]['httponly'])
        self.assertEqual((await self.client.get('/api/auth/me')).status, 200)
        self.assertEqual((await self.confirm(pending)).status, 410)
        self.assertEqual((await self.client.post('/api/auth/phone', json={'phone': '13800138000'}, headers=self.headers)).status, 403)
        response = await self.client.post('/api/auth/phone', json={'phone': '13800138000'},
                                          headers=self.headers | {'X-CSRF-Token': data['csrf_token']})
        self.assertEqual(response.status, 200)

    async def test_cancel_invalidates_pending_and_expired_cancel_is_safe(self):
        data = await (await self.login()).json()
        headers = self.headers | {'X-Binding-CSRF': data['binding_csrf']}
        self.assertEqual((await self.client.post('/api/auth/dinghai/cancel', json={}, headers=self.headers)).status, 403)
        response = await self.client.post('/api/auth/dinghai/cancel', json={}, headers=headers)
        self.assertEqual(await response.json(), {'ok': True})
        self.assertEqual((await self.confirm(data)).status, 410)
        self.assertEqual((await self.client.post('/api/auth/dinghai/cancel', json={}, headers=headers)).status, 200)
        self.assertEqual((await self.client.get('/api/auth/me')).status, 401)

    async def test_login_bind_me_profile_preserves_canonical_local_identity(self):
        local = self.store.login('local-user', PASSWORD)
        self.store.set_phone(self.user['id'], '13900139000', session_token=local['token'])
        before = self.store.get_user(self.user['id'])
        pending = await (await self.login()).json()
        self.assertNotIn('dinghai_profile', json.dumps(pending))
        bound = await (await self.confirm(pending)).json()
        me = await (await self.client.get('/api/auth/me')).json()
        again = await (await self.login()).json()
        for data in (bound, me, again):
            self.assertEqual(data['user']['dinghai_profile'], PROFILE)
            for key in ('id', 'username', 'display_name', 'phone', 'role'):
                self.assertEqual(data['user'][key], before[key])
        self.assertEqual(self.store.get_user(self.user['id']), before)
        session = self.store.get_session(local['token'])
        self.assertNotIn('dinghai_profile', session['user'])
        self.assertNotIn('upstream-account', '\n'.join(self.store.db.iterdump()))
        response = await self.client.post('/api/auth/login',
            json={'username': 'local-user', 'password': PASSWORD}, headers=self.headers)
        self.assertNotIn('dinghai_profile', (await response.json())['user'])
        self.assertNotIn('dinghai_profile', (await (await self.client.get('/api/auth/me')).json())['user'])

    async def test_monitor_binding_shows_profile_without_business_capability(self):
        self.store.set_user(self.user['id'], role='monitor')
        pending = await (await self.login()).json()
        bound = await (await self.confirm(pending)).json()
        self.assertEqual(bound['user']['id'], self.user['id'])
        self.assertEqual(bound['user']['role'], 'monitor')
        self.assertEqual(bound['user']['dinghai_profile'], PROFILE)
        self.assertFalse(bound['dinghai_authenticated'])
        self.assertEqual((await (await self.client.get('/api/auth/me')).json())['user'], bound['user'])
        self.assertEqual(len(self.app['dinghai_credentials'].sessions), 0)
        self.assertEqual((await self.client.get('/api/dinghai/session')).status, 403)

    async def test_phone_update_keeps_profile_without_changing_upstream_phone(self):
        pending = await (await self.login()).json()
        bound = await (await self.confirm(pending)).json()
        response = await self.client.post('/api/auth/phone', json={'phone': '13900139000'},
            headers=self.headers | {'X-CSRF-Token': bound['csrf_token']})
        self.assertEqual(response.status, 200)
        data = await response.json()
        self.assertEqual(data['user']['phone'], '13900139000')
        self.assertEqual(data['user']['id'], self.user['id'])
        self.assertEqual(data['user']['role'], self.user['role'])
        self.assertEqual(data['user']['dinghai_profile'], PROFILE)
        me_data = await (await self.client.get('/api/auth/me')).json()
        self.assertEqual(me_data['user']['dinghai_profile'], PROFILE)
        local = await self.client.post('/api/auth/login',
            json={'username': 'local-user', 'password': PASSWORD}, headers=self.headers)
        csrf = (await local.json())['csrf_token']
        response = await self.client.post('/api/auth/phone', json={'phone': '13800138000'},
            headers=self.headers | {'X-CSRF-Token': csrf})
        self.assertEqual(response.status, 200)
        self.assertNotIn('dinghai_profile', (await response.json())['user'])

    async def test_failed_or_cancelled_binding_never_exposes_profile(self):
        pending = await (await self.login()).json()
        for headers, password, status in ((self.headers, PASSWORD, 403),
                (self.headers | {'X-Binding-CSRF': pending['binding_csrf']}, 'wrong', 401)):
            response = await self.client.post('/api/auth/dinghai/bind',
                json={'username': 'local-user', 'password': password}, headers=headers)
            self.assertEqual(response.status, status)
            self.assertNotIn('upstream-account', await response.text())
            self.assertEqual(len(self.app['dinghai_credentials'].profiles), 0)
        response = await self.client.post('/api/auth/dinghai/cancel', json={},
            headers=self.headers | {'X-Binding-CSRF': pending['binding_csrf']})
        self.assertEqual(response.status, 200)
        self.assertEqual(len(self.app['dinghai_credentials'].pending), 0)
        self.assertEqual((await self.confirm(pending)).status, 410)
        self.assertEqual(len(self.app['dinghai_credentials'].profiles), 0)

    async def test_second_login_uses_binding_without_creating_user(self):
        data = await (await self.login()).json()
        response = await self.confirm(data)
        old_cookie = response.cookies[COOKIE].value
        again = await (await self.login()).json()
        self.assertEqual(again['status'], 'authenticated')
        self.assertEqual(again['user']['id'], self.user['id'])
        self.assertIsNone(self.store.get_session(old_cookie))
        self.assertEqual(len(self.store.list_users()), 2)

    async def test_forged_fields_cross_site_and_wrong_password_are_rejected(self):
        for body in ({'account': 'a', 'password': 'p', 'phone': '13800138000'},
                     {'account': 'a', 'password': 'p', 'role': 'admin'},
                     {'account': '', 'password': 'p'}):
            response = await self.client.post('/api/auth/dinghai/login', json=body, headers=self.headers)
            self.assertEqual(response.status, 400)
        response = await self.client.post('/api/auth/dinghai/login', json={'account': 'a', 'password': 'p'},
                                          headers={'Origin': 'https://wrong.example.test'})
        self.assertEqual(response.status, 403)
        self.auth.assert_not_awaited()

    async def test_upstream_failure_does_not_create_identity(self):
        self.auth.side_effect = AuthError('无法连接定海服务', 502)
        self.assertEqual((await self.login()).status, 502)
        self.assertEqual(len(self.store.list_users()), 2)
        self.assertEqual((await self.client.get('/api/auth/me')).status, 401)

    async def test_local_login_cancels_old_pending_binding(self):
        data = await (await self.login()).json()
        response = await self.client.post('/api/auth/login', json={'username': 'local-user', 'password': PASSWORD},
                                          headers=self.headers)
        self.assertEqual(response.status, 200)
        self.assertEqual(self.store.db.execute('SELECT COUNT(*) FROM dinghai_binding_challenges').fetchone()[0], 0)
        self.assertEqual((await self.confirm(data)).status, 410)

    async def test_another_browser_cannot_consume_pending(self):
        data = await (await self.login()).json()
        self.client.session.cookie_jar.clear()
        self.assertEqual((await self.confirm(data)).status, 410)

    async def test_password_attempts_are_rate_limited(self):
        data = await (await self.login()).json()
        for _ in range(9):
            self.assertEqual((await self.confirm(data, 'wrong')).status, 401)
        self.assertEqual((await self.confirm(data, 'wrong')).status, 429)


class DinghaiUpstreamTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.calls = []
        self.login_payload = {'success': True, 'result': {'loginInfo': {'authToken': 'fixture-token'}}}
        self.current_payload = {'success': True, 'result': {'id': 9223372036854775806, 'name': '定海姓名'}}
        self.login_status = 200
        self.current_status = 200
        async def login(request):
            self.calls.append((request.path, await request.json(), dict(request.headers), dict(request.cookies)))
            response = web.json_response(self.login_payload, status=self.login_status)
            response.set_cookie('upstream-cookie', 'must-not-be-forwarded')
            return response
        async def current(request):
            self.calls.append((request.path, await request.json(), dict(request.headers), dict(request.cookies)))
            return web.json_response(self.current_payload, status=self.current_status)
        app = web.Application()
        app.router.add_post('/api/user/login/v2', login)
        app.router.add_post('/api/user/current', current)
        self.server = TestServer(app)
        await self.server.start_server()
        self.origin = str(self.server.make_url('/')).rstrip('/')

    async def asyncTearDown(self):
        await self.server.close()

    async def test_existing_protocol_current_identity_and_no_phone_dependency(self):
        identity = await authenticate(self.origin, 'dinghai', 'password')
        self.assertEqual(identity, {'subject': '9223372036854775806', 'display_name': '定海姓名',
                                    'token': 'fixture-token',
                                    'profile': {'id': '9223372036854775806', 'username': '',
                                                'display_name': '定海姓名', 'phone': ''}})
        self.assertEqual(self.calls[0][1], {'account': 'dinghai', 'password': '5f4dcc3b5aa765d61d8327deb882cf99', 'device': 'WEB'})
        self.assertNotIn('satoken', self.calls[0][2])
        self.assertEqual(self.calls[1][2]['satoken'], 'fixture-token')
        self.assertEqual(self.calls[1][3], {})

    async def test_profile_uses_only_current_allowlisted_normalized_fields(self):
        self.current_payload['result'] = {
            'id': '00042', 'account': ' actual-account ', 'name': ' 定海姓名 ',
            'nickName': '不优先', 'phone': ' 13800138000 ', 'role': 'admin',
            'password': 'must-not-escape', 'token': 'must-not-escape', 'extra': {'private': True},
        }
        identity = await authenticate(self.origin, 'untrusted-login-account', 'password')
        self.assertEqual(identity['subject'], '42')
        self.assertEqual(identity['profile'], {
            'id': '42', 'username': 'actual-account', 'display_name': '定海姓名', 'phone': '13800138000'})
        self.assertNotIn('must-not-escape', json.dumps(identity))

    async def test_profile_missing_null_fields_and_existing_name_precedence(self):
        for fields, expected_name in (({}, '定海用户'),
                                      ({'name': None, 'nickName': ' 昵称 '}, '昵称'),
                                      ({'name': '', 'nickName': None, 'account': ' 账号 '}, '账号')):
            self.current_payload['result'] = {'id': 42, 'phone': None, **fields}
            identity = await authenticate(self.origin, 'not-a-fallback', 'password')
            self.assertEqual(identity['profile'], {
                'id': '42', 'username': fields.get('account', '').strip(),
                'display_name': expected_name, 'phone': ''})
            self.assertEqual(identity['display_name'], expected_name)

    async def test_profile_invalid_types_controls_and_lengths_fail_closed(self):
        for key, maximum in (('name', 256), ('nickName', 256), ('account', 128), ('phone', 64)):
            for value in (123, False, [], {}, 'bad\nvalue', 'bad\x7fvalue', 'bad\x85value',
                          'bad\u202evalue', '\ud800', 'x' * (maximum + 1)):
                self.current_payload['result'] = {'id': 42, key: value}
                with self.subTest(key=key, value=repr(value)), self.assertRaisesRegex(AuthError, '用户信息格式'):
                    await authenticate(self.origin, 'dinghai', 'password')
        self.current_payload['result'] = {'id': 42, 'name': '名' * 100}
        self.assertEqual((await authenticate(self.origin, 'dinghai', 'password'))['profile']['display_name'], '名' * 64)

    async def test_false_success_is_rejected_without_reading_current_user(self):
        self.login_payload = {'success': False, 'code': '0', 'message': 'sensitive upstream detail'}
        with self.assertRaises(AuthError) as error:
            await authenticate(self.origin, 'dinghai', 'password')
        self.assertEqual(error.exception.status, 401)
        self.assertNotIn('sensitive', str(error.exception))
        self.assertEqual(len(self.calls), 1)

    async def test_invalid_token_and_invalid_current_identity_fail_closed(self):
        self.login_payload['result']['loginInfo']['authToken'] = 'bad\r\ntoken'
        with self.assertRaisesRegex(AuthError, '有效凭证'):
            await authenticate(self.origin, 'dinghai', 'password')
        self.login_payload['result']['loginInfo']['authToken'] = 'fixture-token'
        for uid in (None, True, 1.5, '', '0', '1e3', '１２３'):
            self.current_payload['result']['id'] = uid
            with self.subTest(uid=uid), self.assertRaisesRegex(AuthError, '有效用户身份'):
                await authenticate(self.origin, 'dinghai', 'password')

    async def test_current_auth_failure_and_redirect_are_not_accepted(self):
        self.current_status = 401
        with self.assertRaises(AuthError) as error:
            await authenticate(self.origin, 'dinghai', 'password')
        self.assertEqual(error.exception.status, 401)
        self.current_status = 302
        with self.assertRaises(AuthError) as error:
            await authenticate(self.origin, 'dinghai', 'password')
        self.assertEqual(error.exception.status, 502)

    async def test_oversized_response_is_rejected(self):
        self.current_payload['result']['padding'] = 'x' * 65537
        with self.assertRaisesRegex(AuthError, '响应格式'):
            await authenticate(self.origin, 'dinghai', 'password')

    def test_production_origin_requires_https_without_credentials_path_or_query(self):
        self.assertEqual(validate_origin(ISSUER + '/'), ISSUER)
        self.assertEqual(validate_origin(''), '')
        for origin in ('http://insecure.test', 'https://name:secret@host.test',
                       'https://host.test/api', 'https://host.test?secret=1',
                       'https://host.test#hash', 'https://host.test:bad', 'https://host.test\n'):
            with self.subTest(origin=origin), self.assertRaises(RuntimeError):
                validate_origin(origin)


if __name__ == '__main__':
    unittest.main()
