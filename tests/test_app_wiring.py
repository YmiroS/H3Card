"""真实 make_app 装配冒烟：中间件、页面路由、静态兜底与基本权限闭环。"""
import asyncio
import sys
import tempfile
import threading
import time
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
        # 装配测试不连接真实 ComfyUI、不启动外部审批，也不载入实际任务。
        patches = (
            mock.patch.object(controller_app, 'ws_loop', new=mock.AsyncMock()),
            mock.patch.object(controller_app, 'setup_dingtalk', return_value=None),
            mock.patch.object(controller_app, 'load_jobs', return_value=None),
            mock.patch.dict(controller_app.JOBS, {}, clear=True),
        )
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)
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
        self.assertEqual((await self.client.get('/capacity.html')).status, 404)
        self.assertEqual((await self.client.get('/controller/capacity')).status, 404)
        self.assertEqual((await self.client.get('/permissions.html')).status, 404)
        self.assertEqual((await self.client.get('/app.js')).status, 200)

    async def test_local_admin_modules_remain_explicit_authenticated_routes(self):
        routes = {
            '/admin-shell.css': 'text/css',
            '/admin-shell.js': 'text/javascript',
            '/controller-page.js': 'text/javascript',
            '/costs-page.js': 'text/javascript',
        }
        for route, content_type in routes.items():
            with self.subTest(route=route):
                response = await self.client.get(route)
                self.assertEqual(response.status, 200)
                self.assertEqual(response.content_type, content_type)
                self.assertGreater(len(await response.read()), 0)
        self.client.session.cookie_jar.clear()
        for route in routes:
            with self.subTest(route=route, anonymous=True):
                response = await self.client.get(route, allow_redirects=False)
                self.assertEqual(response.status, 302)
                self.assertTrue(response.headers['Location'].startswith('/login'))

    async def test_online_presence_requires_login_and_counts_active_user(self):
        response = await self.client.post('/api/auth/presence', headers=self.headers)
        self.assertEqual(response.status, 200)
        self.assertEqual((await response.json())['online_users'], 1)

        self.client.session.cookie_jar.clear()
        response = await self.client.post('/api/auth/presence', headers=self.headers)
        self.assertEqual(response.status, 401)

    async def test_auth_page_assets_are_explicitly_public(self):
        self.client.session.cookie_jar.clear()
        for route in ('/login', '/login.html'):
            response = await self.client.get(route, allow_redirects=False)
            self.assertEqual(response.status, 200)
            html = await response.text()
            self.assertIn('id="register-panel"', html)
            self.assertIn('/auth-page.css', html)
            self.assertNotIn('id="register-dialog"', html)
        assets = {
            '/auth-page.css': 'text/css',
            '/auth-art.webp': 'image/webp',
            '/auth-logo.png': 'image/png',
            '/icon.png': 'image/png',
            '/favicon.png?v=ck05': 'image/png',
        }
        for route, content_type in assets.items():
            with self.subTest(route=route):
                response = await self.client.get(route, allow_redirects=False)
                self.assertEqual(response.status, 200)
                self.assertEqual(response.content_type, content_type)
                self.assertGreater(len(await response.read()), 0)
        # 只开放精确资源名，目录及其它页面仍需鉴权。
        for route in ('/web/auth-art.webp', '/auth-page.css.map', '/auth_store.py', '/app.js'):
            with self.subTest(route=route):
                response = await self.client.get(route, allow_redirects=False)
                self.assertIn(response.status, (302, 401, 404))
                self.assertNotEqual(response.status, 200)
        self.assertEqual((await self.client.get('/api/auth/me')).status, 401)
        self.assertEqual((await self.client.get('/api/projects')).status, 401)

    async def test_admin_job_names_use_submitter_not_project_owner(self):
        submitter = self.auth.create_user('submitter', PASSWORD)
        with self.auth.db:
            self.auth.db.execute('UPDATE users SET display_name=? WHERE id=?', ('张三', submitter['id']))
        self.own_project('task-project', name='管理员的项目')
        self.register_job('job-by-member', 'task-project', owner=submitter)
        job = {'id': 'job-by-member', 'project': 'task-project', 'projectName': '管理员的项目',
               'card': 'card-1', 'cardName': '主角视频', 'name': 'H3图生视频',
               'status': 'queued', 'created': time.time(), 'progress': 0}
        with mock.patch.dict(controller_app.JOBS, {job['id']: job}, clear=True), \
                mock.patch.object(controller_app, 'CONTROLLER_MODE', False):
            listed = await (await self.client.get('/api/jobs')).json()
            result = listed['jobs'][0]
            self.assertEqual(result['submitter_id'], submitter['id'])
            self.assertNotEqual(result['submitter_id'], self.admin['id'])
            self.assertEqual(result['submitter_username'], 'submitter')
            self.assertEqual(result['submitter_display_name'], '张三')
            self.assertEqual((result['projectName'], result['cardName']), ('管理员的项目', '主角视频'))
            detail = await (await self.client.get('/api/job/job-by-member')).json()
            self.assertEqual(detail['submitter_display_name'], '张三')
            self.assertNotIn('submitter_display_name', controller_app.JOBS[job['id']])
            self.assertEqual(self.auth.job_submitters(['missing-job']), {})
            self.assertEqual(self.auth.job_submitters([]), {})
            with self.auth.db:
                self.auth.db.execute('UPDATE users SET display_name=? WHERE id=?', ('李四', submitter['id']))
            updated = await (await self.client.get('/api/jobs')).json()
            self.assertEqual(updated['jobs'][0]['submitter_display_name'], '李四')

            await self.login('submitter')
            self.assertEqual((await (await self.client.get('/api/jobs')).json())['jobs'], [])
            self.assertEqual((await self.client.get('/api/job/job-by-member')).status, 404)
            self.auth.set_grant(submitter['id'], self.admin['id'], 'read')
            shared = (await (await self.client.get('/api/jobs')).json())['jobs'][0]
            self.assertEqual(shared['permission'], 'read')
            self.assertFalse(any(key.startswith('submitter_') for key in shared))
            detail = await (await self.client.get('/api/job/job-by-member')).json()
            self.assertFalse(any(key.startswith('submitter_') for key in detail))
            self.auth.delete_grant(submitter['id'], self.admin['id'])
            self.assertEqual((await (await self.client.get('/api/jobs')).json())['jobs'], [])

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
        with self.auth.db:
            self.auth.db.execute('UPDATE users SET display_name=? WHERE id=?', ('张三', self.admin['id']))
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
        self.assertEqual(listed['projects'][0]['owner_id'], self.admin['id'])
        self.assertEqual(listed['projects'][0]['owner_display_name'], '张三')
        self.assertNotEqual(listed['projects'][0]['owner_display_name'], listed['projects'][0]['owner_username'])
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

    async def test_canvas_view_supports_500_percent_and_rejects_out_of_range(self):
        created = await (await self.client.post(
            '/api/projects', json={'name': '高清缩放画布'}, headers=self.headers)).json()
        url = f"/api/projects/{created['id']}"
        for zoom in (0.1, 2, 3, 5):
            response = await self.client.put(
                url + '/view', json={'x': -100, 'y': 80, 'k': zoom}, headers=self.headers)
            self.assertEqual(response.status, 200, await response.text())
            project = await (await self.client.get(url)).json()
            self.assertEqual(project['view'], {'x': -100, 'y': 80, 'k': zoom})
            self.assertEqual(project['rev'], created['rev'])
        for zoom in (0, 0.09, 5.01, 10):
            response = await self.client.put(
                url + '/view', json={'x': 0, 'y': 0, 'k': zoom}, headers=self.headers)
            self.assertEqual(response.status, 400, await response.text())
        project = await (await self.client.get(url)).json()
        self.assertEqual(project['view']['k'], 5)

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


class CapacityProbeWiringTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def asyncSetUp(self):
        self.auth_setup()
        self.addCleanup(self.auth_teardown)
        self.own_project("capacity-project")
        database = self.root / "data" / "control.db"
        distributed_type, costs_type = controller_app.DistributedStore, controller_app.CostLedger
        resource_type = controller_app.ResourceAccess
        # 保留真实 make_app、中间件、启动/停止钩子；仅将持久化位置隔离到临时目录。
        patches = (
            mock.patch.object(controller_app, "CONTROLLER_MODE", True),
            mock.patch.object(controller_app, "EXECUTION_MODE", "controller"),
            mock.patch.dict(controller_app.JOBS, {}, clear=True),
            mock.patch.object(controller_app, "load_jobs", return_value=None),
            mock.patch.object(controller_app, "DistributedStore", side_effect=lambda _: distributed_type(database)),
            mock.patch.object(controller_app, "CostLedger", side_effect=lambda *_: costs_type(database, ROOT / "pricing.json")),
            mock.patch.object(controller_app, "ResourceAccess", side_effect=lambda store, *_: resource_type(store, self.root)),
            mock.patch.dict("os.environ", {"CHOUKA_LOCAL_TEST": "0"}),
        )
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)
        application = controller_app.make_app(auth_path=self.root / "data" / "auth.db")
        self.client = TestClient(TestServer(application))
        self.addAsyncCleanup(self.client.close)
        await self.client.start_server()
        self.origin = str(self.client.make_url("/")).rstrip("/")
        self.headers = await self.login()
        self.application = application
        self.store = application["distributed"]
        self.pid = "wiring-capacity-final"
        self.locator = f"{self.pid}/output.mp4"
        folder = self.root / "data" / "artifacts" / self.pid
        folder.mkdir(parents=True)
        (folder / "output.mp4").write_bytes(b"synthetic-video")
        self.application["resource_access"].register("capacity-project", "artifact", self.locator)
        worker = self.store.register_worker("真实装配回归机器", {})
        now = time.time() - 200
        job = {"id": self.pid, "capability": "minimax_h3_ref_2pass", "status": "queued",
               "created": now, "worker_id": worker["worker_id"],
               "outputs": [{"url": "/api/artifact/" + self.locator}]}
        self.application["costs"].record_job(job)
        self.application["costs"].start_job(self.pid, worker["worker_id"], now + 1)
        self.application["costs"].finish_job(self.pid, "done", now + 61, worker["worker_id"])
        controller_app.JOBS[self.pid] = dict(job, status="done")
        self.url = f"/api/capacity/jobs/{self.pid}/probe-outputs"

    async def test_controller_temperature_maintenance_and_submitter_metadata_coexist(self):
        submitter = self.auth.create_user('maintenance-submitter', PASSWORD)
        with self.auth.db:
            self.auth.db.execute('UPDATE users SET display_name=? WHERE id=?', ('提交组员', submitter['id']))
        self.register_job(self.pid, 'capacity-project', owner=submitter)
        controller_app.JOBS[self.pid].update(
            project='capacity-project', projectName='维护期间的项目',
            card='maintenance-card', cardName='主角卡片',
        )
        worker = self.store.register_worker('维护温度组合机器', {
            'node_classes': ['KSampler'], 'supports_code_restart': True,
        })
        update = self.store.request_sync_all()
        at = time.time()
        self.store.heartbeat(
            worker['worker_id'], comfy_online=True, busy=False,
            telemetry={'collected_at': at, 'gpus': [{'index': 255, 'temperature_c': 72}]},
            maintenance={'request_id': update['request_id'], 'status': 'error', 'message': '模拟同步失败'},
        )
        response = await self.client.get('/api/health')
        self.assertEqual(response.status, 200)
        health = await response.json()
        self.assertFalse(health['sandbox'])
        self.assertTrue(health['maintenance_active'])
        self.assertFalse(health['comfy_online'])
        self.assertEqual(health['workers'], 2)
        temperature_url = f"/api/workers/{worker['worker_id']}/temperature"
        response = await self.client.get(temperature_url + '?gpu_index=255')
        self.assertEqual(response.status, 200)
        self.assertEqual((await response.json())['points'], [{'at': at, 'temperature_c': 72}])
        self.assertEqual((await self.client.get(temperature_url + '?gpu_index=256')).status, 400)
        listed = await (await self.client.get('/api/jobs')).json()
        job = next(item for item in listed['jobs'] if item['id'] == self.pid)
        self.assertEqual((job['submitter_id'], job['submitter_username'], job['submitter_display_name']),
                         (submitter['id'], 'maintenance-submitter', '提交组员'))
        self.assertEqual((job['projectName'], job['cardName']), ('维护期间的项目', '主角卡片'))
        detail = await (await self.client.get(f'/api/job/{self.pid}')).json()
        self.assertEqual(detail['submitter_display_name'], '提交组员')
        self.assertNotIn('submitter_display_name', controller_app.JOBS[self.pid])

        await self.login('maintenance-submitter')
        health = await (await self.client.get('/api/health')).json()
        self.assertEqual(set(health), {'ok', 'mode', 'comfy_online', 'maintenance_active'})
        self.assertTrue(health['maintenance_active'])
        self.assertEqual((await self.client.get(temperature_url)).status, 403)
        self.auth.set_grant(submitter['id'], self.admin['id'], 'read')
        detail = await (await self.client.get(f'/api/job/{self.pid}')).json()
        self.assertEqual(detail['permission'], 'read')
        self.assertFalse(any(key.startswith('submitter_') for key in detail))

    async def test_make_app_probe_route_state_admin_and_csrf_are_really_wired(self):
        self.assertEqual(self.application["capacity_probe_state"], {"task": None})
        metadata = {"kind": "video", "width": 1312, "height": 736, "duration": 2, "valid": True}
        with mock.patch.object(controller_app, "probe_capacity_output", return_value=metadata) as probe:
            response = await self.client.post(self.url, json={"offset": 0}, headers=self.headers)
            self.assertEqual(response.status, 200, await response.text())
            self.assertEqual((await response.json())["recorded"], 1)
            probe.assert_called_once()
            self.assertIsNone(self.application["capacity_probe_state"]["task"])
            response = await self.client.get("/api/capacity?limit=1&offset=100")
            self.assertEqual(response.status, 200, await response.text())
            report = await response.json()
            self.assertEqual(report["details"], [])
            self.assertEqual(report["groups"][0]["output_resolution"]["variants"], [
                {"kind": "video", "width": 1312, "height": 736, "outputs": 1, "samples": 1}])
            self.assertFalse(report["groups"][0]["eligible"])
            self.assertEqual((await self.client.post(self.url, json={"offset": 0},
                                                     headers={"Origin": self.origin})).status, 403)
            self.auth.create_user("capacity-wiring-reader", PASSWORD)
            reader_headers = await self.login("capacity-wiring-reader")
            self.assertEqual((await self.client.post(self.url, json={"offset": 0}, headers=reader_headers)).status, 403)
            self.client.session.cookie_jar.clear()
            self.assertEqual((await self.client.post(self.url, json={"offset": 0}, headers=self.headers)).status, 401)
            probe.assert_called_once()

    async def test_make_app_shutdown_waits_for_probe_before_closing_databases(self):
        started, stopping, release = asyncio.Event(), asyncio.Event(), threading.Event()
        loop = asyncio.get_running_loop()
        original_close_presence = controller_app.close_presence_connections

        def blocked_probe():
            loop.call_soon_threadsafe(started.set)
            if not release.wait(5):
                raise AssertionError("停服回归未释放后台线程")
            # 后台真正结束前，两个资源库都必须仍可访问。
            self.store.db.execute("SELECT 1").fetchone()
            self.application["auth_store"].get_user(self.admin["id"])

        async def signal_stopping(app):
            await original_close_presence(app)
            stopping.set()

        task = asyncio.create_task(asyncio.to_thread(blocked_probe))
        self.application["capacity_probe_state"]["task"] = task
        closing = None
        with mock.patch.object(controller_app, "close_presence_connections", side_effect=signal_stopping), \
             mock.patch.object(self.store, "close", wraps=self.store.close) as close_store:
            try:
                await asyncio.wait_for(started.wait(), 2)
                closing = asyncio.create_task(self.client.server.close())
                await asyncio.wait_for(stopping.wait(), 2)
                self.assertTrue(self.application["lifecycle"]["shutting_down"])
                self.assertFalse(closing.done())
                close_store.assert_not_called()
                self.assertEqual(self.store.db.execute("SELECT 1").fetchone()[0], 1)
            finally:
                release.set()
                await asyncio.wait_for(asyncio.shield(task), 2)
                if closing is not None:
                    await asyncio.wait_for(closing, 2)
            close_store.assert_called_once()

    async def test_make_app_shutdown_rejects_new_capacity_probe(self):
        self.application["lifecycle"]["shutting_down"] = True
        with mock.patch.object(controller_app, "probe_capacity_output") as probe:
            response = await self.client.post(self.url, json={"offset": 0}, headers=self.headers)
            self.assertEqual(response.status, 503, await response.text())
            probe.assert_not_called()
        self.assertIsNone(self.store.capacity.output_recovery(self.pid))


if __name__ == '__main__':
    unittest.main()
