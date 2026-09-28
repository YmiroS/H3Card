"""真实 make_app 装配冒烟：中间件、页面路由、静态兜底与基本权限闭环。"""
import asyncio
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "tests"))

import app as controller_app
import auth_support
from aiohttp import ClientSession, CookieJar, ServerDisconnectedError, WSMsgType, WSServerHandshakeError
from aiohttp.test_utils import TestClient, TestServer

PASSWORD = auth_support.PASSWORD


class MakeAppWiringTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def asyncSetUp(self):
        # 先建好管理员并标记就绪，make_app 启动时打开同一个账号库。
        self.auth_setup()
        application = controller_app.make_app(auth_path=self.root / "data" / "auth.db")
        self.old_project_dir = controller_app.PROJ_DIR
        controller_app.PROJ_DIR = self.root / "data" / "projects"
        self.client = TestClient(TestServer(application))
        await self.client.start_server()
        self.origin = str(self.client.make_url('/')).rstrip('/')
        self.headers = await self.login()

    async def asyncTearDown(self):
        await self.client.close()
        controller_app.PROJ_DIR = self.old_project_dir
        self.auth_teardown()

    async def test_pages_and_static_fallback(self):
        # 未登录 API 一律 401，页面跳转登录（先清掉夹具登录的会话）。
        self.client.session.cookie_jar.clear()
        response = await self.client.get('/api/projects', allow_redirects=False)
        self.assertEqual(response.status, 401)
        response = await self.client.get('/', allow_redirects=False)
        self.assertEqual(response.status, 302)
        self.assertTrue(response.headers['Location'].startswith('/login'))

        # 登录后主页面可用；管理页只认管理员。
        self.headers = await self.login()
        self.assertEqual((await self.client.get('/')).status, 200)
        self.assertEqual((await self.client.get('/admin/permissions')).status, 200)
        self.assertEqual((await self.client.get('/teams')).status, 200)
        # 根目录静态兜底已移除：直呼 .html 不再绕过页面权限。
        self.assertEqual((await self.client.get('/controller.html')).status, 404)
        self.assertEqual((await self.client.get('/costs.html')).status, 404)
        self.assertEqual((await self.client.get('/permissions.html')).status, 404)
        self.assertEqual((await self.client.get('/app.js')).status, 200)

    async def test_project_crud_permission_flow(self):
        bob = self.auth.create_user('bob', PASSWORD)
        created = await (await self.client.post(
            '/api/projects', json={'name': '我的画布'}, headers=self.headers)).json()
        self.assertEqual(created['permission'], 'operate')
        self.assertEqual(created['owner_username'], 'admin')

        # 所有者先完成一次保存（登录会轮换：换账号后旧会话失效）。
        saved = await self.client.put(
            f"/api/projects/{created['id']}",
            json={'rev': created['rev'], 'name': '改名', 'cards': [], 'edges': []},
            headers=self.headers)
        self.assertEqual(saved.status, 200)

        # 普通用户看不到他人画布，授权只读后可见但不可写。
        response = await self.client.post(
            '/api/auth/login', json={'username': 'bob', 'password': PASSWORD},
            headers={'Origin': self.origin})
        bob_session = await response.json()
        bob_headers = {'Origin': self.origin, 'X-CSRF-Token': bob_session['csrf_token']}
        listed = await (await self.client.get('/api/projects')).json()
        self.assertEqual(listed['projects'], [])

        put = await self.client.put(
            f"/api/projects/{created['id']}",
            json={'rev': created['rev'], 'name': '抢改', 'cards': [], 'edges': []},
            headers=bob_headers)
        self.assertEqual(put.status, 404)

        self.auth.set_grant(bob['id'], self.admin['id'], 'read')
        listed = await (await self.client.get('/api/projects')).json()
        self.assertEqual(listed['projects'][0]['permission'], 'read')
        put = await self.client.put(
            f"/api/projects/{created['id']}",
            json={'rev': created['rev'], 'name': '抢改', 'cards': [], 'edges': []},
            headers=bob_headers)
        self.assertEqual(put.status, 403)

        # 撤销后普通用户连读取也失效。
        self.auth.delete_grant(bob['id'], self.admin['id'])
        got = await self.client.get(f"/api/projects/{created['id']}")
        self.assertEqual(got.status, 404)

    async def test_personal_project_share_flow_for_user_and_team(self):
        bob = self.auth.create_user('bob', PASSWORD)
        teammate = self.auth.create_user('teammate', PASSWORD)
        created = await (await self.client.post(
            '/api/projects', json={'name': '个人共享画布'}, headers=self.headers)).json()
        team_response = await self.client.post('/api/teams', json={'name': '接收项目组'}, headers=self.headers)
        team = (await team_response.json())['team']
        await self.client.post(f"/api/teams/{team['id']}/members",
                               json={'user_id': teammate['id']}, headers=self.headers)
        share_url = f"/api/projects/{created['id']}/shares"
        candidates = await (await self.client.get(share_url)).json()
        self.assertIn(bob['id'], {user['id'] for user in candidates['users']})
        self.assertIn(team['id'], {item['id'] for item in candidates['teams']})
        response = await self.client.put(
            share_url, json={'user_ids': [bob['id']], 'team_ids': [team['id']]}, headers=self.headers)
        self.assertEqual(response.status, 200)

        response = await self.client.post('/api/auth/login', json={'username': 'bob', 'password': PASSWORD},
                                          headers={'Origin': self.origin})
        bob_session = await response.json()
        bob_headers = {'Origin': self.origin, 'X-CSRF-Token': bob_session['csrf_token']}
        listed = await (await self.client.get('/api/projects')).json()
        self.assertTrue(listed['projects'][0]['shared_personally'])
        self.assertEqual(listed['projects'][0]['permission'], 'operate')
        saved = await self.client.put(
            f"/api/projects/{created['id']}",
            json={'rev': created['rev'], 'name': '共同编辑', 'cards': [], 'edges': []},
            headers=bob_headers)
        self.assertEqual(saved.status, 200)
        self.assertEqual((await self.client.get(share_url)).status, 403)

        response = await self.client.post('/api/auth/login', json={'username': 'teammate', 'password': PASSWORD},
                                          headers={'Origin': self.origin})
        teammate_session = await response.json()
        listed = await (await self.client.get('/api/projects')).json()
        self.assertEqual(listed['projects'][0]['shared_team_ids'], [team['id']])

        self.headers = await self.login()
        response = await self.client.put(
            share_url, json={'user_ids': [], 'team_ids': []}, headers=self.headers)
        self.assertEqual(response.status, 200)
        response = await self.client.post('/api/auth/login', json={'username': 'bob', 'password': PASSWORD},
                                          headers={'Origin': self.origin})
        bob_session = await response.json()
        bob_headers = {'Origin': self.origin, 'X-CSRF-Token': bob_session['csrf_token']}
        self.assertEqual((await self.client.get(f"/api/projects/{created['id']}")).status, 404)
        self.assertEqual((await self.client.put(
            f"/api/projects/{created['id']}", json={'rev': 1, 'cards': [], 'edges': []},
            headers=bob_headers)).status, 404)
        self.assertTrue(teammate_session['csrf_token'])

    async def test_collaborators_keep_independent_views_and_append_cards(self):
        bob = self.auth.create_user('bob', PASSWORD)
        created = await (await self.client.post(
            '/api/projects', json={'name': '协同画布'}, headers=self.headers)).json()
        self.auth.set_project_shares(created['id'], [bob['id']], [], self.admin['id'])
        project_url = f"/api/projects/{created['id']}"

        response = await self.client.put(
            project_url + '/view', json={'x': 120, 'y': -45, 'k': 1.25}, headers=self.headers)
        self.assertEqual(response.status, 200, await response.text())
        admin_project = await (await self.client.get(project_url)).json()
        self.assertEqual(admin_project['view'], {'x': 120.0, 'y': -45.0, 'k': 1.25})
        self.assertEqual(admin_project['rev'], created['rev'])

        response = await self.client.post(
            '/api/auth/login', json={'username': 'bob', 'password': PASSWORD},
            headers={'Origin': self.origin})
        bob_session = await response.json()
        bob_headers = {'Origin': self.origin, 'X-CSRF-Token': bob_session['csrf_token']}
        bob_project = await (await self.client.get(project_url)).json()
        self.assertEqual(bob_project['view'], created['view'])
        response = await self.client.put(
            project_url + '/view', json={'x': -300, 'y': 80, 'k': 0.5}, headers=bob_headers)
        self.assertEqual(response.status, 200, await response.text())

        card_b = {'id': 'bob-card', 'type': 'card_image', 'cap': 'test',
                  'x': 10, 'y': 20, 'params': {}, 'assets': {}, 'outputs': []}
        response = await self.client.post(project_url + '/cards', json={'card': card_b}, headers=bob_headers)
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual((await response.json())['card']['created_by'], bob['id'])

        self.headers = await self.login()
        admin_project = await (await self.client.get(project_url)).json()
        self.assertEqual(admin_project['view'], {'x': 120.0, 'y': -45.0, 'k': 1.25})
        card_a = {'id': 'admin-card', 'type': 'card_text', 'cap': 'text',
                  'x': 30, 'y': 40, 'params': {}, 'assets': {}, 'outputs': []}
        response = await self.client.post(project_url + '/cards', json={'card': card_a}, headers=self.headers)
        self.assertEqual(response.status, 200, await response.text())
        payload = await response.json()
        cards = payload['project']['cards']
        self.assertEqual({card['id'] for card in cards}, {'bob-card', 'admin-card'})
        self.assertEqual({card['created_by'] for card in cards}, {bob['id'], self.admin['id']})

        forged = [dict(card) for card in cards]
        forged[0]['created_by'] = 'forged-user'
        response = await self.client.put(
            project_url, json={'rev': payload['project']['rev'], 'cards': forged}, headers=self.headers)
        self.assertEqual(response.status, 200, await response.text())
        current = await (await self.client.get(project_url)).json()
        self.assertEqual({card['created_by'] for card in current['cards']}, {bob['id'], self.admin['id']})
        response = await self.client.put(
            project_url, json={'rev': current['rev'], 'cards': current['cards'] + [
                {'id': 'bypass-card', 'type': 'card_text', 'params': {}, 'assets': {}}]},
            headers=self.headers)
        self.assertEqual(response.status, 409)

    async def test_presence_shows_members_and_world_cursor(self):
        bob = self.auth.create_user('bob', PASSWORD)
        created = await (await self.client.post(
            '/api/projects', json={'name': '在线协同'}, headers=self.headers)).json()
        self.auth.set_project_shares(created['id'], [bob['id']], [], self.admin['id'])
        presence_url = f"/api/projects/{created['id']}/presence"
        admin_socket = await self.client.ws_connect(presence_url)
        bob_client = ClientSession(cookie_jar=CookieJar(unsafe=True))
        bob_socket = None
        try:
            first = await admin_socket.receive_json(timeout=2)
            self.assertEqual(first['type'], 'presence')
            self.assertEqual(len(first['members']), 1)

            response = await bob_client.post(
                str(self.client.make_url('/api/auth/login')),
                json={'username': 'bob', 'password': PASSWORD}, headers={'Origin': self.origin})
            self.assertEqual(response.status, 200)
            await response.read()
            bob_socket = await bob_client.ws_connect(str(self.client.make_url(presence_url)))
            admin_presence = await admin_socket.receive_json(timeout=2)
            bob_presence = await bob_socket.receive_json(timeout=2)
            self.assertEqual(len(admin_presence['members']), 2)
            self.assertEqual(len(bob_presence['members']), 2)

            await bob_socket.send_json({'type': 'cursor', 'x': 321.5, 'y': -42, 'visible': True})
            cursor = await admin_socket.receive_json(timeout=2)
            self.assertEqual(cursor['type'], 'cursor')
            self.assertEqual((cursor['x'], cursor['y']), (321.5, -42.0))
            self.assertEqual(cursor['user_id'], bob['id'])

            self.auth.set_project_shares(created['id'], [], [], self.admin['id'])
            removed = await controller_app.prune_presence_permissions(self.client.server.app, created['id'])
            self.assertTrue(removed)
            await controller_app.broadcast_presence(self.client.server.app, created['id'])
            closed = await bob_socket.receive(timeout=2)
            self.assertIn(closed.type, (WSMsgType.CLOSE, WSMsgType.CLOSED))
            bob_socket = None
            left = await admin_socket.receive_json(timeout=2)
            self.assertEqual(len(left['members']), 1)
        finally:
            if bob_socket is not None:
                await bob_socket.close()
            await bob_client.close()
            await admin_socket.close()

    async def test_shutdown_rejects_new_presence_connections(self):
        created = await (await self.client.post(
            '/api/projects', json={'name': '关机准入测试'}, headers=self.headers)).json()
        self.client.server.app['lifecycle']['shutting_down'] = True
        response = await self.client.get(f"/api/projects/{created['id']}/presence")
        self.assertEqual(response.status, 503)

    async def test_shutdown_rejects_presence_finishing_permission_check(self):
        created = await (await self.client.post(
            '/api/projects', json={'name': '关机竞态测试'}, headers=self.headers)).json()
        original = controller_app.require_project
        arrived, release = asyncio.Event(), asyncio.Event()

        async def delayed_require_project(request, pid, operate=False):
            if request.path.endswith('/presence'):
                arrived.set()
                await release.wait()
            return await original(request, pid, operate=operate)

        with mock.patch.object(controller_app, 'require_project', side_effect=delayed_require_project):
            connecting = asyncio.create_task(
                self.client.ws_connect(f"/api/projects/{created['id']}/presence"))
            await asyncio.wait_for(arrived.wait(), timeout=2)
            closing = asyncio.create_task(self.client.server.close())
            for _ in range(20):
                if self.client.server.app['lifecycle']['shutting_down']:
                    break
                await asyncio.sleep(0.01)
            self.assertTrue(self.client.server.app['lifecycle']['shutting_down'])
            release.set()
            await asyncio.wait_for(closing, timeout=2)
            result = await asyncio.gather(connecting, return_exceptions=True)
            self.assertIsInstance(result[0], (WSServerHandshakeError, ServerDisconnectedError))

    async def test_shutdown_closes_presence_without_waiting_for_websocket_timeout(self):
        created = await (await self.client.post(
            '/api/projects', json={'name': '关闭测试'}, headers=self.headers)).json()
        socket = await self.client.ws_connect(f"/api/projects/{created['id']}/presence")
        self.assertEqual((await socket.receive_json(timeout=2))['type'], 'presence')
        await asyncio.wait_for(self.client.server.close(), timeout=2)
        closed = await socket.receive(timeout=2)
        self.assertIn(closed.type, (WSMsgType.CLOSE, WSMsgType.CLOSED))

    async def test_removing_team_member_closes_presence_immediately(self):
        bob = self.auth.create_user('bob', PASSWORD)
        team = (await (await self.client.post(
            '/api/teams', json={'name': '即时撤权组'}, headers=self.headers)).json())['team']
        response = await self.client.post(
            f"/api/teams/{team['id']}/members", json={'user_id': bob['id']}, headers=self.headers)
        self.assertEqual(response.status, 201)
        project = await (await self.client.post(
            '/api/projects', json={'name': '团队协同', 'team_id': team['id']}, headers=self.headers)).json()

        bob_client = ClientSession(cookie_jar=CookieJar(unsafe=True))
        bob_socket = None
        try:
            response = await bob_client.post(
                str(self.client.make_url('/api/auth/login')),
                json={'username': 'bob', 'password': PASSWORD}, headers={'Origin': self.origin})
            self.assertEqual(response.status, 200)
            await response.read()
            bob_socket = await bob_client.ws_connect(str(self.client.make_url(
                f"/api/projects/{project['id']}/presence")))
            self.assertEqual((await bob_socket.receive_json(timeout=2))['type'], 'presence')

            response = await self.client.delete(
                f"/api/teams/{team['id']}/members/{bob['id']}", headers=self.headers)
            self.assertEqual(response.status, 200, await response.text())
            closed = await bob_socket.receive(timeout=2)
            self.assertIn(closed.type, (WSMsgType.CLOSE, WSMsgType.CLOSED))
            bob_socket = None
            response = await bob_client.get(str(self.client.make_url(f"/api/projects/{project['id']}")))
            self.assertEqual(response.status, 404)
        finally:
            if bob_socket is not None:
                await bob_socket.close()
            await bob_client.close()

    async def test_share_revoked_between_project_permission_checks_returns_not_found(self):
        bob = self.auth.create_user('bob', PASSWORD)
        created = await (await self.client.post(
            '/api/projects', json={'name': '撤销竞态画布'}, headers=self.headers)).json()
        self.auth.set_project_shares(created['id'], [bob['id']], [], self.admin['id'])
        await self.client.post('/api/auth/login', json={'username': 'bob', 'password': PASSWORD},
                               headers={'Origin': self.origin})

        original_call_store = controller_app.call_store

        async def revoke_before_detail_lookup(application, method, *args, **kwargs):
            if method == 'get_project_for_user':
                self.auth.set_project_shares(created['id'], [], [], self.admin['id'])
            return await original_call_store(application, method, *args, **kwargs)

        with mock.patch.object(controller_app, 'call_store', side_effect=revoke_before_detail_lookup):
            response = await self.client.get(f"/api/projects/{created['id']}")
        self.assertEqual(response.status, 404)

    async def test_team_project_is_shared_with_members_only(self):
        bob = self.auth.create_user('bob', PASSWORD)
        outsider = self.auth.create_user('outsider', PASSWORD)
        response = await self.client.post('/api/teams', json={'name': '项目一组'}, headers=self.headers)
        self.assertEqual(response.status, 201)
        team = (await response.json())['team']
        response = await self.client.post(
            f"/api/teams/{team['id']}/members", json={'user_id': bob['id']}, headers=self.headers)
        self.assertEqual(response.status, 201)

        response = await self.client.post('/api/auth/login', json={'username': 'bob', 'password': PASSWORD},
                                          headers={'Origin': self.origin})
        session = await response.json()
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
        created = await (await self.client.post(
            '/api/projects', json={'name': '共享画布', 'team_id': team['id']}, headers=headers)).json()
        self.assertEqual(created['team_id'], team['id'])
        listed = await (await self.client.get('/api/projects')).json()
        self.assertEqual(listed['projects'][0]['team_name'], '项目一组')
        self.assertEqual(listed['projects'][0]['permission'], 'operate')

        response = await self.client.post('/api/auth/login', json={'username': 'outsider', 'password': PASSWORD},
                                          headers={'Origin': self.origin})
        outsider_session = await response.json()
        outsider_headers = {'Origin': self.origin, 'X-CSRF-Token': outsider_session['csrf_token']}
        self.assertEqual((await (await self.client.get('/api/projects')).json())['projects'], [])
        self.assertEqual((await self.client.get(f"/api/projects/{created['id']}")).status, 404)
        self.assertEqual((await self.client.post('/api/projects', json={'name': '越权', 'team_id': team['id']},
                                                 headers=outsider_headers)).status, 403)
        self.assertFalse(outsider['team_leader'])


if __name__ == '__main__':
    unittest.main()
