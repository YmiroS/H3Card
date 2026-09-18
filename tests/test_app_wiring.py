"""真实 make_app 装配冒烟：中间件、页面路由、静态兜底与基本权限闭环。"""
import sys
import tempfile
import unittest
from pathlib import Path

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


if __name__ == '__main__':
    unittest.main()
