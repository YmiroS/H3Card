"""旧接口测试的鉴权装配：真实 AuthStore + ResourceAccess + 中间件，不用 mock 身份。"""
import tempfile
from pathlib import Path

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

from server.auth import auth_middleware, register_auth_routes
from server.auth_store import AuthStore
from server.resource_access import ResourceAccess

ROOT = Path(__file__).resolve().parents[1]
PASSWORD = 'Test-password-123'


class AuthFixture:
    """临时根目录 + 账号库；控制器/视频测试在此基础上叠加自己的路由与状态。"""

    def auth_setup(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.auth = AuthStore(self.root / 'data' / 'auth.db')
        self.access = ResourceAccess(self.auth, self.root)
        self.admin = self.auth.create_user('admin', PASSWORD, role='admin')
        self.auth.set_ready()

    def auth_teardown(self):
        self.auth.close()
        self.temp.cleanup()

    def build_app(self):
        app = web.Application(middlewares=[auth_middleware])
        app['auth_store'] = self.auth
        app['resource_access'] = self.access
        app['project_locks'] = __import__('collections').defaultdict(
            __import__('asyncio').Lock)
        register_auth_routes(app, ROOT / 'web')
        return app

    async def start_client(self, app):
        self.client = TestClient(TestServer(app))
        await self.client.start_server()
        self.origin = str(self.client.make_url('/')).rstrip('/')
        self.headers = await self.login()

    async def login(self, username='admin'):
        response = await self.client.post(
            '/api/auth/login', json={'username': username, 'password': PASSWORD},
            headers={'Origin': self.origin})
        assert response.status == 200, await response.text()
        session = await response.json()
        return {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}

    def own_project(self, pid='p', name='测试画布', owner=None):
        """为测试直接落盘的画布补登记（不经 HTTP 时使用）。"""
        folder = self.root / 'data' / 'projects'
        folder.mkdir(parents=True, exist_ok=True)
        (folder / f'{pid}.json').write_text(
            __import__('json').dumps({'id': pid, 'name': name, 'rev': 0,
                                      'cards': [], 'edges': []}, ensure_ascii=False),
            encoding='utf-8')
        self.auth.create_project(pid, (owner or self.admin)['id'])

    def register_asset(self, name, pid='p'):
        self.access.register(pid, 'upload', name)

    def register_job(self, jid, pid='p', owner=None):
        self.auth.register_job(jid, pid, (owner or self.admin)['id'])
