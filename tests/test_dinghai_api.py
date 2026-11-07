import asyncio
import hashlib
import json
import tempfile
import time
import unittest
from dataclasses import replace
from pathlib import Path
from unittest.mock import AsyncMock, patch

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer, make_mocked_request
from yarl import URL

from server.auth import COOKIE, auth_middleware, me, register_auth_routes
from server.dinghai_api import READ_CONTRACTS, require_dinghai, upstream_post, validate_body
from server.dinghai_auth import PENDING_COOKIE
from server.auth_store import AuthStore
from server.dinghai_sessions import (DinghaiContext, DinghaiCredentials, attach_profile,
                                     current_context, current_profile)

ROOT = Path(__file__).resolve().parents[1]
ISSUER = 'https://dinghai.example.test'
PASSWORD = 'test-local-password'
UPSTREAM_TOKEN = 'fixture-upstream-secret-token'
PROFILE = {'id': '42', 'username': 'upstream-account', 'display_name': '定海用户', 'phone': ''}


class FakeResponse:
    def __init__(self, payload, status=200):
        self.status = status
        self.raw = json.dumps(payload).encode()
        self.content = self
        self.closed = False
        self.wait = None
        self.started = asyncio.Event()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        self.closed = True

    async def iter_chunked(self, size):
        self.started.set()
        if self.wait is not None:
            await self.wait.wait()
        for offset in range(0, len(self.raw), size):
            yield self.raw[offset:offset + size]


class FakeSession:
    def __init__(self, response, calls, kwargs):
        self.response, self.calls, self.kwargs = response, calls, kwargs
        self.closed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        self.closed = True

    def post(self, url, **kwargs):
        self.calls.append((url, kwargs, self.kwargs))
        return self.response


class DinghaiApiTests(unittest.IsolatedAsyncioTestCase):
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
        # Test-only server module, not a production browser proxy route.
        async def internal_oss(request):
            context = await require_dinghai(request)
            self.assertEqual(context.subject, '42')
            result = await upstream_post(request, '/api/file/oss/file',
                                         {'projectCode': '', 'ossFileList': []})
            return web.json_response({'received': isinstance(result, dict)})
        self.app.router.add_post('/api/test-internal-oss', internal_oss)
        self.client = TestClient(TestServer(self.app))
        await self.client.start_server()
        self.headers = {'Origin': str(self.client.make_url('/')).rstrip('/')}
        self.auth = AsyncMock(return_value={'subject': '42', 'display_name': '定海用户',
                                           'token': UPSTREAM_TOKEN, 'profile': dict(PROFILE)})
        self.auth_patch = patch('server.dinghai_auth.authenticate', self.auth)
        self.auth_patch.start()
        self.calls = []
        self.response = FakeResponse({'success': True, 'result': {'id': 42}})
        self.sessions = []
        def factory(**kwargs):
            session = FakeSession(self.response, self.calls, kwargs)
            self.sessions.append(session)
            return session
        self.transport_patch = patch('server.dinghai_api.aiohttp.ClientSession', side_effect=factory)
        self.transport_patch.start()

    async def asyncTearDown(self):
        self.transport_patch.stop()
        self.auth_patch.stop()
        await self.client.close()
        self.store.close()
        self.tmp.cleanup()

    @property
    def vault(self):
        return self.app['dinghai_credentials']

    def cookie(self, name=COOKIE):
        return self.client.session.cookie_jar.filter_cookies(self.client.make_url('/api/auth'))[name].value

    async def login(self):
        response = await self.client.post('/api/auth/dinghai/login',
            json={'account': 'dinghai', 'password': PASSWORD}, headers=self.headers)
        self.assertEqual(response.status, 200, await response.text())
        return await response.json()

    async def activate(self):
        data = await self.login()
        if data.get('status') == 'binding_required':
            response = await self.client.post('/api/auth/dinghai/bind',
                json={'username': 'local-user', 'password': PASSWORD},
                headers=self.headers | {'X-Binding-CSRF': data['binding_csrf']})
            self.assertEqual(response.status, 200, await response.text())
            data = await response.json()
        self.assertTrue(data['dinghai_authenticated'])
        self.assertNotIn(UPSTREAM_TOKEN, json.dumps(data))
        self.csrf = data['csrf_token']
        return data

    async def post(self, path='/api/dinghai/user/current', body=None, csrf=True):
        headers = dict(self.headers)
        if csrf:
            headers['X-CSRF-Token'] = self.csrf
        return await self.client.post(path, json={} if body is None else body, headers=headers)

    async def status(self):
        return await (await self.client.get('/api/dinghai/session')).json()

    async def test_pending_has_no_business_access_and_hash_keys_only(self):
        data = await self.login()
        token = self.cookie(PENDING_COOKIE)
        self.assertFalse(data['dinghai_authenticated'])
        self.assertEqual(list(self.vault.pending), [hashlib.sha256(token.encode()).hexdigest()])
        self.assertNotIn(UPSTREAM_TOKEN, repr(self.vault.pending))
        self.assertEqual(len(self.vault.sessions), 0)
        self.assertEqual((await self.post(csrf=False)).status, 401)
        self.assertEqual(self.calls, [])

    async def test_bind_migrates_credential_and_never_persists_upstream_token(self):
        await self.activate()
        self.assertEqual(len(self.vault.pending), 0)
        self.assertEqual(len(self.vault.sessions), 1)
        self.assertEqual(await self.status(), {'authenticated': True})
        self.assertTrue((await (await self.client.get('/api/auth/me')).json())['dinghai_authenticated'])
        self.assertNotIn(UPSTREAM_TOKEN, '\n'.join(self.store.db.iterdump()))
        response = await self.post()
        self.assertEqual(await response.json(), {'id': 42})
        url, kwargs, session_kwargs = self.calls[-1]
        self.assertEqual(url, ISSUER + '/api/user/current')
        self.assertEqual(kwargs['headers']['satoken'], UPSTREAM_TOKEN)
        self.assertEqual(kwargs['json'], {})
        self.assertIs(kwargs['ssl'], True)
        self.assertIs(kwargs['allow_redirects'], False)
        self.assertIs(session_kwargs['trust_env'], False)
        self.assertEqual(type(session_kwargs['cookie_jar']).__name__, 'DummyCookieJar')
        self.assertLessEqual(session_kwargs['timeout'].total, 20)
        self.assertTrue(self.sessions[-1].closed)
        self.assertEqual(response.headers['Cache-Control'], 'private, no-store')

    async def test_same_user_local_login_does_not_inherit_capability(self):
        await self.activate()
        previous = self.cookie()
        response = await self.client.post('/api/auth/login',
            json={'username': 'local-user', 'password': PASSWORD}, headers=self.headers)
        data = await response.json()
        self.csrf = data['csrf_token']
        self.assertFalse(data['dinghai_authenticated'])
        self.assertIsNone(self.vault.get('sessions', previous))
        self.assertIsNone(self.vault.get_profile(previous))
        self.assertNotIn('dinghai_profile', data['user'])
        self.assertEqual(await self.status(), {'authenticated': False})
        denied = await self.post()
        self.assertEqual(denied.status, 403)
        self.assertEqual((await denied.json())['code'], 'dinghai_auth_required')
        self.assertEqual(self.calls, [])
        self.assertEqual((await self.client.get('/api/auth/me')).status, 200)

    async def test_sessions_and_identities_are_isolated(self):
        await self.activate()
        first_cookie, first_csrf = self.cookie(), self.csrf
        self.client.session.cookie_jar.clear()
        self.auth.return_value = {'subject': '43', 'display_name': '另一个定海用户',
                                  'token': 'second-upstream-token'}
        self.store.create_user('second-user', PASSWORD)
        pending = await self.login()
        response = await self.client.post('/api/auth/dinghai/bind',
            json={'username': 'second-user', 'password': PASSWORD},
            headers=self.headers | {'X-Binding-CSRF': pending['binding_csrf']})
        self.csrf = (await response.json())['csrf_token']
        await self.post()
        self.assertEqual(self.calls[-1][1]['headers']['satoken'], 'second-upstream-token')
        second_cookie = self.cookie()
        self.client.session.cookie_jar.clear()
        self.client.session.cookie_jar.update_cookies({COOKIE: first_cookie}, self.client.make_url('/'))
        self.csrf = first_csrf
        await self.post()
        self.assertEqual(self.calls[-1][1]['headers']['satoken'], UPSTREAM_TOKEN)
        await self.post('/api/auth/logout')
        self.assertIsNone(self.vault.get('sessions', first_cookie))
        self.assertIsNotNone(self.vault.get('sessions', second_cookie))

    async def test_same_user_second_browser_local_session_is_not_authenticated(self):
        await self.activate()
        dinghai_cookie = self.cookie()
        self.client.session.cookie_jar.clear()
        response = await self.client.post('/api/auth/login',
            json={'username': 'local-user', 'password': PASSWORD}, headers=self.headers)
        self.csrf = (await response.json())['csrf_token']
        self.assertEqual(await self.status(), {'authenticated': False})
        self.assertEqual((await self.post()).status, 403)
        self.assertIsNotNone(self.vault.get('sessions', dinghai_cookie))

    async def test_cancel_and_local_login_discard_pending(self):
        for local_login in (False, True):
            data = await self.login()
            pending = self.cookie(PENDING_COOKIE)
            if local_login:
                response = await self.client.post('/api/auth/login',
                    json={'username': 'local-user', 'password': PASSWORD}, headers=self.headers)
            else:
                response = await self.client.post('/api/auth/dinghai/cancel', json={},
                    headers=self.headers | {'X-Binding-CSRF': data['binding_csrf']})
            self.assertEqual(response.status, 200)
            self.assertIsNone(self.vault.get('pending', pending))

    async def test_memory_loss_or_expiry_requires_relogin_not_local_logout(self):
        for expire in (True, False):
            await self.activate()
            cookie = self.cookie()
            if expire:
                key = self.vault._key(cookie)
                self.vault.sessions[key] = replace(self.vault.sessions[key], expires=0)
            else:
                self.vault.clear()  # new process/app has no upstream credentials
            self.assertEqual(await self.status(), {'authenticated': False})
            response = await self.post()
            self.assertEqual(response.status, 403)
            self.assertEqual((await response.json())['code'], 'dinghai_auth_required')
            self.assertIsNotNone(self.store.get_session(cookie))
            self.assertEqual((await self.client.get('/api/auth/me')).status, 200)

    async def test_expired_pending_can_never_activate_business_capability(self):
        data = await self.login()
        key = self.vault._key(self.cookie(PENDING_COOKIE))
        self.vault.pending[key] = replace(self.vault.pending[key], expires=0)
        response = await self.client.post('/api/auth/dinghai/bind',
            json={'username': 'local-user', 'password': PASSWORD},
            headers=self.headers | {'X-Binding-CSRF': data['binding_csrf']})
        data = await response.json()
        self.assertFalse(data['dinghai_authenticated'])
        self.assertNotIn('dinghai_profile', data['user'])
        self.assertEqual(len(self.vault.profiles), 0)
        self.assertEqual(await self.status(), {'authenticated': False})

    async def test_authentication_failures_remove_only_dinghai_capability(self):
        for code, status in [('1009', 200), (1003, 200), ('NOT_LOGIN', 200), ('x', 401), ('1009', 403)]:
            await self.activate()
            cookie = self.cookie()
            self.response = FakeResponse({'success': False, 'code': code,
                                          'message': UPSTREAM_TOKEN, 'debugInfoMap': {'secret': PASSWORD}}, status)
            response = await self.post()
            self.assertEqual(response.status, 403)
            data = await response.json()
            self.assertEqual(data['code'], 'dinghai_auth_required')
            self.assertNotIn(UPSTREAM_TOKEN, json.dumps(data))
            self.assertIsNone(self.vault.get('sessions', cookie))
            self.assertIsNotNone(self.store.get_session(cookie))
            self.assertFalse((await (await self.client.get('/api/auth/me')).json())['dinghai_authenticated'])

    async def test_business_denial_does_not_remove_capability_or_leak_detail(self):
        await self.activate()
        for status in (200, 403):
            self.response = FakeResponse({'success': False, 'code': '1010',
                                          'message': UPSTREAM_TOKEN, 'result': PASSWORD}, status)
            response = await self.post()
            self.assertEqual(response.status, 403)
            self.assertEqual((await response.json())['code'], 'dinghai_business_denied')
            self.assertNotIn(UPSTREAM_TOKEN, await response.text())
            self.assertEqual(await self.status(), {'authenticated': True})

    async def test_native_result_types_and_all_eight_exact_routes(self):
        await self.activate()
        bodies = [{ 'pageNum': 1, 'pageSize': 100, 'status': 'DEFAULT'},
                  {'projectId': 1, 'sourceType': 'CAMERA'}, {},
                  {'projectId': 1, 'sourceType': 'ASSET', 'pageNum': 1, 'pageSize': 20,
                   'episodeIdList': ['123'], 'actIdList': [], 'userIdList': [2],
                   'statusList': ['DOING'], 'processNodeNameList': ['制作'], 'searchWord': ''},
                  {'processNodeId': 1}, {'processNodeId': 1},
                  {'processNodeId': 1, 'groupId': '9223372036854775807', 'includeChildren': True},
                  {'processNodeId': 1, 'groupId': 2, 'includeHistory': False}]
        for index, (path, body) in enumerate(zip(READ_CONTRACTS, bodies)):
            result = [[], {}, None, [{'id': 123}], {'nested': [1, None]}][index % 5]
            self.response = FakeResponse({'success': True, 'result': result, 'message': 'not forwarded'})
            response = await self.post('/api/dinghai' + path[4:], body)
            self.assertEqual(response.status, 200, await response.text())
            self.assertEqual(await response.json(), result)
            self.assertEqual(self.calls[-1][0], ISSUER + path)

    async def test_csrf_origin_and_path_boundaries(self):
        await self.activate()
        self.assertEqual((await self.post(csrf=False)).status, 403)
        self.assertEqual((await self.client.post('/api/dinghai/user/current', json={},
            headers={'Origin': 'https://evil.test', 'X-CSRF-Token': self.csrf})).status, 403)
        for suffix in ('/user/current/', '/user/current?url=https://evil.test',
                       '/user%2Fcurrent', '/%75ser/current', '/user/login/v2', '/file/oss/file',
                       '/task/submit', '/project/pageQuery/extra'):
            response = await self.post(URL('/api/dinghai' + suffix, encoded=True))
            self.assertIn(response.status, (400, 404, 405), suffix)
        self.assertEqual((await self.client.get('/api/dinghai/user/current')).status, 405)
        self.assertEqual(self.calls, [])

    async def test_bad_bodies_and_chunked_size_are_rejected_without_upstream(self):
        await self.activate()
        cases = [('/user/current', []), ('/user/current', {'url': 'https://evil.test'}),
                 ('/project/pageQuery', {'pageNum': 0, 'pageSize': 20}),
                 ('/project/pageQuery', {'pageNum': 1, 'pageSize': 2001}),
                 ('/task/queryTaskForZhaiXing', {'projectId': 1, 'sourceType': 'CAMERA',
                                               'pageNum': 1, 'pageSize': 101}),
                 ('/project/pageQuery', {'pageNum': True, 'pageSize': 20}),
                 ('/processNode/queryProcessNodeInfo', {'processNodeId': -1}),
                 ('/processNode/queryProcessNodeInfo', {'processNodeId': '1/../../x'}),
                 ('/processNode/queryProcessNodeInfo', {'processNodeId': 1.5}),
                 ('/project/queryZhaiXingFilter', {'projectId': 1, 'sourceType': []})]
        for path, body in cases:
            self.assertEqual((await self.post('/api/dinghai' + path, body)).status, 400)
        async def chunks():
            for _ in range(20):
                yield b' ' * 1024
        response = await self.client.post('/api/dinghai/user/current', data=chunks(),
            headers=self.headers | {'X-CSRF-Token': self.csrf, 'Content-Type': 'application/json'})
        self.assertEqual(response.status, 413)
        self.assertEqual(self.calls, [])

    async def test_monitor_disabled_and_local_test_cannot_proxy(self):
        await self.activate()
        self.store.set_user(self.user['id'], role='monitor')
        # set_user revokes old sessions; a new Dinghai login preserves monitor role
        data = await self.login()
        self.assertFalse(data['dinghai_authenticated'])
        self.assertEqual(data['user']['role'], 'monitor')
        self.assertEqual(data['user']['dinghai_profile'], PROFILE)
        me_data = await (await self.client.get('/api/auth/me')).json()
        self.assertEqual(me_data['user']['dinghai_profile'], PROFILE)
        self.assertFalse(me_data['dinghai_authenticated'])
        self.assertIsNone(current_context(self.request_context()))
        self.assertIsNotNone(current_profile(self.request_context()))
        self.csrf = data['csrf_token']
        self.assertEqual((await self.post()).status, 403)
        self.assertEqual((await self.client.get('/api/dinghai/session')).status, 403)
        self.store.set_user(self.user['id'], role='user')
        await self.activate()
        self.store.set_user(self.user['id'], enabled=False)
        self.assertEqual((await self.post()).status, 401)
        self.assertEqual(len(self.vault.sessions), 0)
        self.store.set_user(self.user['id'], enabled=True)
        await self.activate()
        self.app['local_test_session'] = {'user': self.store.get_user(self.user['id']),
                                           'csrf_token': self.csrf, 'local_test': True}
        self.app['local_test'] = True
        self.assertEqual((await self.post()).status, 403)
        self.assertEqual(await self.status(), {'authenticated': False})
        self.assertEqual(self.calls, [])

    async def test_server_only_oss_transport_is_not_a_browser_route(self):
        await self.activate()
        self.response = FakeResponse({'success': True, 'result': {'accessKeyId': 'server-only'}})
        response = await self.post('/api/test-internal-oss')
        self.assertEqual(await response.json(), {'received': True})
        self.assertEqual(self.calls[-1][0], ISSUER + '/api/file/oss/file')
        self.assertEqual(self.calls[-1][1]['json'], {'projectCode': '', 'ossFileList': []})
        count = len(self.calls)
        response = await self.post('/api/dinghai/file/oss/file', {'projectCode': '', 'ossFileList': []})
        self.assertEqual(response.status, 404)
        self.assertEqual(len(self.calls), count)
        for body in ({'projectCode': 'other', 'ossFileList': []},
                     {'projectCode': '', 'ossFileList': ['secret-key']}):
            with self.assertRaises(web.HTTPBadRequest):
                validate_body('/api/file/oss/file', body)

    async def test_media_registered_and_public_post_allowlist_is_exact(self):
        from server.dinghai_media import dinghai_media
        routes = list(self.app.router.routes())
        media = [route for route in routes if route.resource.canonical == '/api/dinghai/media'
                 and route.method == 'GET']
        self.assertEqual(len(media), 1)
        self.assertIs(media[0].handler, dinghai_media)
        public_posts = {route.resource.canonical for route in routes
                        if route.method == 'POST'
                        and route.resource.canonical.startswith('/api/dinghai/')}
        self.assertEqual(public_posts, {'/api/dinghai' + path[4:] for path in READ_CONTRACTS})
        self.assertEqual(len(public_posts), 8)

    async def test_submit_and_writes_are_denied_by_routes_and_internal_transport(self):
        await self.activate()
        request = self.request_context()
        for path in ('/api/task/submit', '/api/processNode/file/submit',
                     '/api/ftpResource/createByRelation/v2', '/api/file/upload',
                     '/api/project/delete'):
            with self.subTest(path=path):
                with self.assertRaises(web.HTTPNotFound):
                    await upstream_post(request, path, {})
                response = await self.post('/api/dinghai' + path[4:])
                self.assertEqual(response.status, 404)
        self.assertEqual(self.calls, [])

    def request_context(self):
        request = make_mocked_request('POST', '/api/dinghai/user/current',
            headers={'Cookie': COOKIE + '=' + self.cookie()}, app=self.app)
        request['auth_session'] = self.store.get_session(self.cookie())
        request['user'] = request['auth_session']['user']
        return request

    async def test_native_project_page_size_matches_frontend_contract(self):
        await self.activate()
        body = {'pageNum': 1, 'pageSize': 2000, 'status': 'DEFAULT'}
        self.response = FakeResponse({'success': True, 'result': {'list': []}})
        response = await self.post('/api/dinghai/project/pageQuery', body)
        self.assertEqual(response.status, 200)
        self.assertEqual(self.calls[-1][1]['json'], body)

    async def test_empty_java_credential_metadata_is_removed_without_losing_business_fields(self):
        await self.activate()
        for path, body, result, expected in (
            ('/api/dinghai/user/current', {},
             {'id': 42, 'name': '定海用户', 'authToken': None, 'password': '', 'passwordChanged': False},
             {'id': 42, 'name': '定海用户', 'passwordChanged': False}),
            ('/api/dinghai/project/pageQuery', {'pageNum': 1, 'pageSize': 2000},
             {'list': [{'id': 1, 'owner': {'id': 42, 'authToken': None}}], 'total': 1},
             {'list': [{'id': 1, 'owner': {'id': 42}}], 'total': 1}),
        ):
            with self.subTest(path=path):
                self.response = FakeResponse({'success': True, 'result': result})
                response = await self.post(path, body)
                self.assertEqual(response.status, 200, await response.text())
                self.assertEqual(await response.json(), expected)
        for value in (False, 0, [], {}, 'not-empty'):
            self.response = FakeResponse({'success': True, 'result': {'id': 42, 'authToken': value}})
            response = await self.post()
            self.assertEqual(response.status, 200)
            self.assertEqual(await response.json(), {'id': 42})
        self.assertEqual(await self.status(), {'authenticated': True})

    async def test_nested_nas_passwords_are_redacted_and_logs_never_include_values(self):
        await self.activate()
        secret = 'nas-password-must-not-escape'
        for path, body, result, expected in (
            ('/api/dinghai/user/current', {},
             {'id': 42, 'nas': {'config': {'username': 'artist', 'password': secret}},
              'satoken': 'another-secret'},
             {'id': 42, 'nas': {'config': {'username': 'artist'}}}),
            ('/api/dinghai/project/pageQuery', {'pageNum': 1, 'pageSize': 2000},
             {'list': [{'id': 1, 'nas': {'config': {'password': secret}},
                        'owner': {'id': 42, 'authToken': UPSTREAM_TOKEN}}]},
             {'list': [{'id': 1, 'nas': {'config': {}}, 'owner': {'id': 42}}]}),
        ):
            self.response = FakeResponse({'success': True, 'result': result})
            with self.assertLogs('server.dinghai_api', level='INFO') as logs:
                response = await self.post(path, body)
            self.assertEqual(response.status, 200)
            self.assertEqual(await response.json(), expected)
            self.assertIn('password', '\n'.join(logs.output))
            for value in (secret, UPSTREAM_TOKEN, 'another-secret'):
                self.assertNotIn(value, '\n'.join(logs.output))
        self.response = FakeResponse({'success': True, 'result': {'echo': UPSTREAM_TOKEN}})
        with self.assertLogs('server.dinghai_api', level='WARNING') as logs:
            response = await self.post()
        self.assertEqual(response.status, 502)
        self.assertIn('reason=credential_echo', '\n'.join(logs.output))
        self.assertNotIn(UPSTREAM_TOKEN, '\n'.join(logs.output))

    async def test_malformed_sensitive_and_oversized_upstream_responses(self):
        await self.activate()
        for payload in ({'success': True, 'result': {'echo': UPSTREAM_TOKEN}},
                        {'success': True, 'result': 42}, {'success': True}, [],
                        {'success': True, 'result': {'x': float('nan')}}):
            self.response = FakeResponse(payload)
            response = await self.post()
            self.assertEqual(response.status, 502)
            self.assertNotIn(UPSTREAM_TOKEN, await response.text())
        self.response = FakeResponse({'success': True, 'result': {'large': 'x' * 2048}})
        with patch('server.dinghai_api.MAX_RESPONSE', 1024):
            self.assertEqual((await self.post()).status, 502)
        self.response = FakeResponse({})
        self.response.raw = b'not JSON: ' + UPSTREAM_TOKEN.encode()
        self.assertEqual((await self.post()).status, 502)
        self.assertEqual(await self.status(), {'authenticated': True})

    async def test_redirect_rate_limit_and_network_errors_are_sanitized(self):
        import aiohttp
        await self.activate()
        for status, expected in ((302, 502), (500, 502), (429, 429)):
            self.response = FakeResponse({'message': UPSTREAM_TOKEN}, status)
            response = await self.post()
            self.assertEqual(response.status, expected)
            self.assertNotIn(UPSTREAM_TOKEN, await response.text())
        with patch('server.dinghai_api.aiohttp.ClientSession',
                   side_effect=aiohttp.ClientConnectionError(UPSTREAM_TOKEN)):
            response = await self.post()
            self.assertEqual(response.status, 502)
            self.assertNotIn(UPSTREAM_TOKEN, await response.text())

    async def test_timeout_and_cancellation_close_upstream_and_release_slot(self):
        await self.activate()
        request = self.request_context()
        self.response.wait = asyncio.Event()
        with patch('server.dinghai_api.REQUEST_TIMEOUT', 0.05):
            with self.assertRaises(web.HTTPGatewayTimeout):
                await upstream_post(request, '/api/user/current', {})
        self.assertTrue(self.response.closed)
        self.assertTrue(self.sessions[-1].closed)
        self.response = FakeResponse({'success': True, 'result': {}})
        self.response.wait = asyncio.Event()
        task = asyncio.create_task(upstream_post(request, '/api/user/current', {}))
        await asyncio.wait_for(self.response.started.wait(), 1)
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task
        self.assertTrue(self.response.closed)
        self.assertTrue(self.sessions[-1].closed)
        self.assertEqual(self.app['_dinghai_api_slots']._value, 8)

    async def test_client_disconnect_cancels_upstream(self):
        await self.activate()
        request = self.request_context()
        request.transport.is_closing.return_value = False
        self.response.wait = asyncio.Event()
        task = asyncio.create_task(upstream_post(request, '/api/user/current', {}))
        await asyncio.wait_for(self.response.started.wait(), 1)
        request.transport.is_closing.return_value = True
        with self.assertRaises(asyncio.CancelledError):
            await asyncio.wait_for(task, 1)
        self.assertTrue(self.response.closed)
        self.assertTrue(self.sessions[-1].closed)
        self.assertEqual(self.app['_dinghai_api_slots']._value, 8)

    async def test_concurrency_limit_and_queued_logout_recheck(self):
        await self.activate()
        self.app['_dinghai_api_slots'] = asyncio.Semaphore(1)
        request = self.request_context()
        self.response.wait = asyncio.Event()
        first = asyncio.create_task(upstream_post(request, '/api/user/current', {}))
        await asyncio.wait_for(self.response.started.wait(), 1)
        second = asyncio.create_task(upstream_post(request, '/api/user/current', {}))
        await asyncio.sleep(0)  # yield once, not a time-based test delay
        self.assertEqual(len(self.calls), 1)
        self.store.logout(self.cookie())
        self.response.wait.set()
        results = await asyncio.gather(first, second, return_exceptions=True)
        self.assertTrue(all(isinstance(result, web.HTTPForbidden) for result in results))
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(self.app['_dinghai_api_slots']._value, 1)

    async def test_issuer_and_user_binding_mismatch_fail_closed(self):
        await self.activate()
        key = self.vault._key(self.cookie())
        entry = self.vault.sessions[key]
        self.vault.sessions[key] = replace(entry, user_id='different-local-user')
        self.assertEqual((await self.post()).status, 403)
        self.vault.sessions[key] = replace(entry,
            context=DinghaiContext('https://other.test', '42', UPSTREAM_TOKEN))
        self.assertEqual((await self.post()).status, 403)
        self.assertEqual(self.calls, [])

    async def test_legacy_identity_without_token_can_login_but_has_no_capability(self):
        self.auth.return_value = {'subject': '42', 'display_name': '定海用户'}
        data = await self.login()
        self.assertFalse(data['dinghai_authenticated'])
        self.assertEqual(len(self.vault.pending), 0)
        response = await self.client.post('/api/auth/dinghai/bind',
            json={'username': 'local-user', 'password': PASSWORD},
            headers=self.headers | {'X-Binding-CSRF': data['binding_csrf']})
        data = await response.json()
        self.csrf = data['csrf_token']
        self.assertFalse(data['dinghai_authenticated'])
        self.assertEqual((await self.post()).status, 403)
        self.assertEqual((await self.client.get('/api/auth/me')).status, 200)

    async def test_profile_outlives_business_token_but_not_local_session(self):
        self.store.session_ttl = 7200
        data = await self.activate()
        cookie = self.cookie()
        key = self.vault._key(cookie)
        self.assertEqual(data['user']['dinghai_profile'], PROFILE)
        self.assertGreater(self.vault.profiles[key].expires, self.vault.sessions[key].expires + 3500)
        later = time.monotonic() + 3601
        with patch('server.dinghai_sessions.time.monotonic', return_value=later):
            data = await (await self.client.get('/api/auth/me')).json()
            self.assertFalse(data['dinghai_authenticated'])
            self.assertEqual(data['user']['dinghai_profile'], PROFILE)
            self.assertIsNone(self.vault.get('sessions', cookie))
            self.assertEqual((await self.post()).status, 403)
        with patch('server.auth_store.time.time', return_value=time.time() + 7201):
            self.assertEqual((await self.client.get('/api/auth/me')).status, 401)
        self.assertIsNone(self.vault.get_profile(cookie))

    async def test_profile_relogin_logout_cleanup_and_no_cross_browser_inheritance(self):
        await self.activate()
        old = self.cookie()
        self.auth.return_value = dict(self.auth.return_value, profile=dict(PROFILE, phone='13800138000'))
        updated = await self.activate()
        self.assertEqual(updated['user']['dinghai_profile']['phone'], '13800138000')
        self.assertIsNone(self.vault.get_profile(old))
        dinghai_cookie = self.cookie()
        self.client.session.cookie_jar.clear()
        local = await self.client.post('/api/auth/login',
            json={'username': 'local-user', 'password': PASSWORD}, headers=self.headers)
        self.assertNotIn('dinghai_profile', (await local.json())['user'])
        self.assertNotIn('dinghai_profile', (await (await self.client.get('/api/auth/me')).json())['user'])
        self.assertIsNotNone(self.vault.get_profile(dinghai_cookie))
        self.client.session.cookie_jar.clear()
        self.client.session.cookie_jar.update_cookies({COOKIE: dinghai_cookie}, self.client.make_url('/'))
        response = await self.post('/api/auth/logout')
        self.assertEqual(response.status, 200)
        self.assertIsNone(self.vault.get_profile(dinghai_cookie))
        self.assertIsNone(self.vault.get('sessions', dinghai_cookie))

    async def test_profile_me_and_context_return_copies_without_polluting_session(self):
        await self.activate()
        request = self.request_context()
        session = request['auth_session']
        user = request['user']
        profile = current_profile(request)
        profile['username'] = 'changed'
        self.assertEqual(current_profile(request), PROFILE)
        for _ in range(2):
            response = await me(request)
            self.assertEqual(json.loads(response.text)['user']['dinghai_profile'], PROFILE)
        self.assertIs(request['auth_session'], session)
        self.assertIs(request['user'], user)
        self.assertNotIn('dinghai_profile', user)
        self.assertNotIn('dinghai_profile', session['user'])
        decorated = attach_profile(session, PROFILE | {'role': 'admin', 'token': UPSTREAM_TOKEN})
        self.assertEqual(decorated['user']['dinghai_profile'], PROFILE)
        self.assertIsNot(decorated['user'], user)

    async def test_profile_rejects_user_issuer_session_and_isolated_modes(self):
        await self.activate()
        cookie = self.cookie()
        key = self.vault._key(cookie)
        entry = self.vault.profiles[key]
        for invalid in (replace(entry, user_id='wrong'), replace(entry, issuer='https://wrong.test')):
            self.vault.profiles[key] = invalid
            self.assertIsNone(current_profile(self.request_context()))
            self.assertIsNone(self.vault.get_profile(cookie))
        for case in ('no_session', 'other_session_user', 'disabled', 'local_test', 'admin_sandbox'):
            self.vault.profiles[key] = entry
            request = self.request_context()
            if case == 'no_session':
                del request['auth_session']
            elif case == 'other_session_user':
                request['auth_session'] = {'user': {'id': 'other'}}
            elif case == 'disabled':
                request['user'] = dict(request['user'], enabled=False)
            else:
                self.app[case] = True
            self.assertIsNone(current_profile(request), case)
            self.assertIsNone(self.vault.get_profile(cookie))
            if case in ('local_test', 'admin_sandbox'):
                self.app[case] = False

    async def test_binding_race_cannot_restore_profile_after_pending_discard(self):
        from server.dinghai_auth import call_store
        pending = await self.login()
        token = self.cookie(PENDING_COOKIE)
        async def discard_during_bind(app, method, *args, **kwargs):
            result = await call_store(app, method, *args, **kwargs)
            if method == 'dinghai_bind':
                self.vault.discard('pending', token)
            return result
        with patch('server.dinghai_auth.call_store', side_effect=discard_during_bind):
            response = await self.client.post('/api/auth/dinghai/bind',
                json={'username': 'local-user', 'password': PASSWORD},
                headers=self.headers | {'X-Binding-CSRF': pending['binding_csrf']})
        data = await response.json()
        self.assertEqual(response.status, 200)
        self.assertFalse(data['dinghai_authenticated'])
        self.assertNotIn('dinghai_profile', data['user'])
        self.assertEqual(len(self.vault.profiles), 0)
        self.assertNotIn('dinghai_profile', (await (await self.client.get('/api/auth/me')).json())['user'])

    async def test_short_local_session_ttl_caps_credential_lifetime(self):
        self.store.session_ttl = 30
        before = time.monotonic()
        await self.activate()
        entry = self.vault.get('sessions', self.cookie())
        self.assertLessEqual(entry.expires, time.monotonic() + 30)
        self.assertGreater(entry.expires, before)
        self.assertEqual(self.vault.get_profile(self.cookie()).expires, entry.expires)


class CredentialContainerTests(unittest.TestCase):
    def test_profiles_are_separately_bounded_token_free_hashed_and_copied(self):
        vault = DinghaiCredentials(maximum=2)
        other = DinghaiCredentials(maximum=2)
        context = DinghaiContext(ISSUER, '42', UPSTREAM_TOKEN, dict(PROFILE))
        expires = time.monotonic() + 7200
        for token in ('one', 'two', 'three'):
            vault.put_profile(token, ISSUER, 'local-id', PROFILE | {
                'token': UPSTREAM_TOKEN, 'password': PASSWORD, 'role': 'admin'}, expires)
        self.assertEqual(len(vault.profiles), 2)
        self.assertIsNone(vault.get_profile('one'))
        self.assertEqual(list(vault.profiles), [vault._key(token) for token in ('two', 'three')])
        entry = vault.get_profile('three')
        self.assertEqual(set(vars(entry)), {'issuer', 'user_id', 'profile', 'expires'})
        self.assertEqual(entry.profile, PROFILE)
        self.assertNotIn(UPSTREAM_TOKEN, repr(vault.profiles))
        self.assertNotIn(PASSWORD, repr(vault.profiles))
        self.assertIsNone(other.get_profile('three'))
        for token in ('a', 'b', 'c'):
            vault.put('pending', token, context, time.monotonic() + 300)
            vault.put('sessions', token, context, time.monotonic() + 3600, 'local-id')
        self.assertIs(vault.get_profile('three'), entry)
        for token in ('four', 'five'):
            vault.put_profile(token, ISSUER, 'local-id', PROFILE, expires)
        self.assertEqual(len(vault.pending), 2)
        self.assertEqual(len(vault.sessions), 2)
        profile = dict(PROFILE)
        vault.put_profile('five', ISSUER, 'local-id', profile, expires)
        profile['phone'] = 'changed'
        self.assertEqual(vault.get_profile('five').profile, PROFILE)
        vault.profiles[vault._key('five')] = replace(vault.get_profile('five'), expires=0)
        self.assertIsNone(vault.get_profile('five'))
        vault.discard_profile('four')
        self.assertEqual(len(vault.profiles), 0)
        self.assertFalse(vault.put_profile('expired', ISSUER, 'local-id', PROFILE, 0))
        vault.put_profile('live', ISSUER, 'local-id', PROFILE, expires)
        vault.clear()
        self.assertEqual(len(vault.pending) + len(vault.sessions) + len(vault.profiles), 0)

    def test_bounded_hashed_namespaces_expiry_and_app_isolation(self):
        first, second = DinghaiCredentials(maximum=2), DinghaiCredentials(maximum=2)
        context = DinghaiContext(ISSUER, '42', UPSTREAM_TOKEN)
        for token in ('one', 'two', 'three'):
            first.put('pending', token, context, time.monotonic() + 300)
            first.put('sessions', token, context, time.monotonic() + 3600, 'local-id')
        self.assertEqual(len(first.pending), 2)
        self.assertEqual(len(first.sessions), 2)
        self.assertIsNone(first.get('pending', 'one'))
        self.assertIsNone(second.get('sessions', 'three'))
        self.assertNotIn('three', first.sessions)
        self.assertNotIn(UPSTREAM_TOKEN, repr(first.sessions))
        key = first._key('three')
        first.sessions[key] = replace(first.sessions[key], expires=0)
        self.assertIsNone(first.get('sessions', 'three'))
        first.clear()
        self.assertEqual(len(first.pending) + len(first.sessions), 0)


if __name__ == '__main__':
    unittest.main()
