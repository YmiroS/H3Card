import asyncio
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'server'))

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer, make_mocked_request
import app
from server.auth import _local_test_request


async def idle_ws(application):
    await asyncio.Event().wait()


class LocalTestAuthTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.enterContext(mock.patch.dict(os.environ, {'CHOUKA_LOCAL_TEST': '1'}))
        self.enterContext(mock.patch.object(app, 'CONTROLLER_MODE', False))
        self.enterContext(mock.patch.object(app, 'EXECUTION_MODE', 'local'))
        self.enterContext(mock.patch.object(app, 'PROJ_DIR', self.root / 'projects'))
        self.enterContext(mock.patch.object(app, 'load_jobs'))
        self.enterContext(mock.patch.object(app, 'JOBS', {}))
        self.enterContext(mock.patch.object(app, 'ws_loop', idle_ws))
        self.dingtalk = self.enterContext(mock.patch.object(app, 'setup_dingtalk'))
        self.db_path = self.root / 'local-test.db'
        self.application = app.make_app(auth_path=self.db_path)
        self.client = TestClient(TestServer(self.application))
        await self.client.start_server()
        self.origin = str(self.client.make_url('/')).rstrip('/')
        response = await self.client.get('/api/auth/me')
        self.assertEqual(response.status, 200)
        self.identity = await response.json()
        self.headers = {'Origin': self.origin, 'X-CSRF-Token': self.identity['csrf_token']}

    async def asyncTearDown(self):
        await self.client.close()

    async def test_no_login_cookie_or_admin_needed(self):
        self.assertTrue(self.identity['local_test'])
        self.assertEqual(self.identity['user']['username'], 'local-test')
        self.assertEqual(self.identity['user']['role'], 'user')
        self.assertTrue(self.identity['csrf_token'])
        self.assertFalse(self.client.session.cookie_jar)
        self.assertEqual(self.application['bind_host'], '127.0.0.1')
        self.assertFalse(self.application['auth_store'].has_admin())
        self.dingtalk.assert_not_called()
        response = await self.client.get('/', allow_redirects=False)
        self.assertEqual(response.status, 200)
        response = await self.client.get('/login', allow_redirects=False)
        self.assertEqual(response.status, 302)
        self.assertEqual(response.headers['Location'], '/')
        response = await self.client.get('/api/cards')
        self.assertEqual(response.status, 200)
        capabilities = (await response.json())['capabilities']
        self.assertTrue(all(f'qwen_image_21_{mode}' in capabilities for mode in ('t2i', 'i2i', 'multi')))

    async def test_create_save_and_dry_run_without_login(self):
        response = await self.client.post('/api/projects', json={'name': '免登录测试'}, headers=self.headers)
        self.assertEqual(response.status, 200)
        project = await response.json()
        self.assertEqual(project['owner_id'], self.identity['user']['id'])
        response = await self.client.put('/api/projects/' + project['id'], headers=self.headers,
                                       json={'rev': 0, 'name': '修改测试', 'cards': [], 'edges': []})
        self.assertEqual(response.status, 200)
        response = await self.client.post('/api/generate', headers=self.headers, json={
            'capability': 'qwen_image_21_t2i', 'project': project['id'], 'assets': {},
            'params': {'prompt': '一只猫', 'seed': 123}, 'dry_run': True,
        })
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual((await response.json())['changed']['#13.value'][1], '一只猫')

    async def test_csrf_and_cross_origin_are_still_rejected(self):
        for headers in ({}, {'Origin': self.origin},
                        {'Origin': 'https://evil.example', 'X-CSRF-Token': self.identity['csrf_token']},
                        {**self.headers, 'Sec-Fetch-Site': 'cross-site'}):
            response = await self.client.post('/api/projects', json={'name': 'bad'}, headers=headers)
            self.assertEqual(response.status, 403)
        response = await self.client.get('/api/auth/me', headers={'Origin': 'https://evil.example'})
        self.assertEqual(response.status, 403)
        response = await self.client.get('/api/auth/me', headers={'Sec-Fetch-Site': 'cross-site'})
        self.assertEqual(response.status, 403)

    async def test_dns_rebinding_and_non_loopback_are_rejected(self):
        response = await self.client.get('/api/auth/me', headers={'Host': 'evil.example:8199'})
        self.assertEqual(response.status, 403)
        request = make_mocked_request('GET', '/', app=self.application).clone(remote='192.0.2.1')
        handler = mock.AsyncMock()
        with self.assertRaises(web.HTTPForbidden):
            await _local_test_request(request, handler)
        handler.assert_not_awaited()

    async def test_account_management_and_agent_routes_are_disabled(self):
        for path in ('/api/auth/login', '/api/auth/register', '/api/auth/password',
                     '/api/auth/logout', '/api/admin/users', '/agent/v1/register'):
            response = await self.client.post(path, json={}, headers=self.headers)
            self.assertEqual(response.status, 403, path)
        self.assertEqual((await self.client.get('/admin/permissions')).status, 403)

    async def test_old_projects_are_not_claimed(self):
        app.PROJ_DIR.mkdir()
        legacy = app.PROJ_DIR / 'legacy.json'
        text = json.dumps({'id': 'legacy', 'name': 'existing', 'cards': []})
        legacy.write_text(text, encoding='utf-8')
        response = await self.client.get('/api/projects')
        self.assertEqual((await response.json())['projects'], [])
        self.assertEqual((await self.client.get('/api/projects/legacy')).status, 404)
        self.assertEqual(legacy.read_text(encoding='utf-8'), text)
        self.assertIsNone(self.application['auth_store'].get_project('legacy'))

    async def test_local_identity_is_stable_after_restart(self):
        uid = self.identity['user']['id']
        csrf = self.identity['csrf_token']
        await self.client.close()
        self.application = app.make_app(auth_path=self.db_path)
        self.client = TestClient(TestServer(self.application))
        await self.client.start_server()
        response = await self.client.get('/api/auth/me')
        identity = await response.json()
        self.assertEqual(identity['user']['id'], uid)
        self.assertNotEqual(identity['csrf_token'], csrf)


class LocalTestConfigurationTests(unittest.TestCase):
    def test_controller_rejects_no_login_mode(self):
        with mock.patch.dict(os.environ, {'CHOUKA_LOCAL_TEST': '1'}), \
             mock.patch.object(app, 'CONTROLLER_MODE', True):
            with self.assertRaisesRegex(RuntimeError, 'controller'):
                app.make_app()

    def test_local_test_ignores_production_auth_database(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            production = root / 'production.db'
            with mock.patch.dict(os.environ, {'CHOUKA_LOCAL_TEST': '1', 'CHOUKA_AUTH_DB': str(production)}), \
                 mock.patch.object(app, 'CONTROLLER_MODE', False), \
                 mock.patch.object(app, 'EXECUTION_MODE', 'local'), \
                 mock.patch.object(app, 'ROOT', root), \
                 mock.patch.object(app, 'load_caps', return_value=0), \
                 mock.patch.object(app, 'load_jobs'):
                application = app.make_app()
            self.assertEqual(application['auth_path'], root / 'data/auth-local-test.db')
            self.assertFalse(production.exists())


if __name__ == '__main__':
    unittest.main()
