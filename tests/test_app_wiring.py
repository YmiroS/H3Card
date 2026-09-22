"""真实 make_app 装配冒烟：中间件、页面路由、静态兜底与基本权限闭环。"""
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
