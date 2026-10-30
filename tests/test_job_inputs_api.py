"""任务输入只读接口：真实 AuthStore、ResourceAccess、认证中间件及路由。"""
import sys
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'server'))
sys.path.insert(0, str(ROOT / 'tests'))

import app as backend
import auth_support
from server.routes import register_generation_routes


class JobInputsApiTests(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def asyncSetUp(self):
        self.auth_setup()
        self.addCleanup(self.auth_teardown)
        self.owner = self.auth.create_user('owner', auth_support.PASSWORD)
        self.reader = self.auth.create_user('reader', auth_support.PASSWORD)
        self.auth.create_user('stranger', auth_support.PASSWORD)
        self.auth.create_user('screen', auth_support.PASSWORD, role='monitor')
        self.auth.set_grant(self.reader['id'], self.owner['id'], 'read')
        self.own_project('p', owner=self.owner)
        self.register_job('job', owner=self.owner)
        self.register_asset('source.png')
        self.access.register_job_inputs('job', ['chouka/source.png'])
        self.enterContext(mock.patch.object(backend, 'JOBS', {
            'job': {'id': 'job', 'status': 'done', 'created': 1,
                    'assets': {'image': 'chouka/current.png'},
                    'graph': {'secret': 'E:/private/model.safetensors'},
                    'payload': {'private': 'not for display'}},
        }))
        application = self.build_app()
        register_generation_routes(
            application, api_health=backend.api_health, api_status=backend.api_status,
            api_cards=backend.api_cards, api_reload=backend.api_reload,
            api_generate=backend.api_generate, api_generation_workers=backend.api_generation_workers,
            api_rewrite=backend.api_rewrite, api_text=backend.api_text, api_jobs=backend.api_jobs,
            api_jobs_clear=backend.api_jobs_clear, api_jobs_history=backend.api_jobs_history,
            api_job=backend.api_job, api_job_inputs=backend.api_job_inputs,
            api_cancel=backend.api_cancel, api_job_delete=backend.api_job_delete)
        await self.start_client(application)
        self.addAsyncCleanup(self.client.close)

    async def as_user(self, username):
        self.client.session.cookie_jar.clear()
        self.client.session.headers.update(await self.login(username))

    @staticmethod
    def source_asset():
        return {'ref': 'chouka/source.png', 'url': '/api/upload/source.png',
                'kind': 'image', 'origin': 'source.png'}

    async def test_owner_gets_only_registered_inputs_without_private_task_data(self):
        await self.as_user('owner')
        self.register_asset('current.png')
        response = await self.client.get('/api/job/job/inputs')
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {'assets': [self.source_asset()]})
        self.assertEqual(response.headers['Cache-Control'], 'private, no-store')

    async def test_read_only_share_and_revocation(self):
        await self.as_user('reader')
        response = await self.client.get('/api/job/job/inputs')
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {'assets': [self.source_asset()]})
        self.auth.delete_grant(self.reader['id'], self.owner['id'])
        self.assertEqual((await self.client.get('/api/job/job/inputs')).status, 404)

    async def test_unauthorized_and_nonexistent_jobs_are_both_404(self):
        await self.as_user('stranger')
        with mock.patch.object(self.access, 'list_job_inputs',
                               side_effect=AssertionError('must authorize job first')):
            for jid in ('job', 'missing'):
                response = await self.client.get(f'/api/job/{jid}/inputs')
                self.assertEqual(response.status, 404, await response.text())
        await self.as_user('owner')
        self.assertEqual((await self.client.get('/api/job/missing/inputs')).status, 404)

    async def test_unauthenticated_request_requires_login(self):
        self.client.session.cookie_jar.clear()
        self.assertEqual((await self.client.get('/api/job/job/inputs')).status, 401)

    async def test_inputs_survive_history_clear_with_acl_retained(self):
        await self.as_user('owner')
        with mock.patch.object(backend, 'CONTROLLER_MODE', False), \
                mock.patch.object(backend, 'save_jobs'):
            response = await self.client.post('/api/jobs/clear', json={})
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual((await response.json())['removed'], 1)
        self.assertNotIn('job', backend.JOBS)
        self.assertIsNotNone(self.auth.get_job('job'))
        response = await self.client.get('/api/job/job/inputs')
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {'assets': [self.source_asset()]})

    async def test_registered_job_without_inputs_is_empty(self):
        await self.as_user('owner')
        self.register_job('empty', owner=self.owner)
        response = await self.client.get('/api/job/empty/inputs')
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {'assets': []})

    async def test_pending_or_unbound_inputs_are_hidden_even_from_admin(self):
        for name in ('pending.png', 'unbound.png'):
            self.register_asset(name)
        self.access.register_job_inputs('job', ['chouka/pending.png', 'chouka/unbound.png'])
        with self.auth._tx():
            self.auth.db.execute("UPDATE resources SET state='pending' WHERE locator='pending.png'")
            self.auth.db.execute(
                "DELETE FROM project_resources WHERE resource_id IN "
                "(SELECT resource_id FROM resources WHERE locator='unbound.png')")
        for username in ('owner', 'reader', 'admin'):
            with self.subTest(username=username):
                await self.as_user(username)
                response = await self.client.get('/api/job/job/inputs')
                self.assertEqual(response.status, 200, await response.text())
                self.assertEqual(await response.json(), {'assets': [self.source_asset()]})

    async def test_resource_moved_to_other_canvas_is_not_current_job_input(self):
        self.own_project('other', owner=self.owner)
        row = self.access.lookup('upload', 'source.png')
        with self.auth._tx():
            self.auth.db.execute('UPDATE project_resources SET project_id=? WHERE resource_id=?',
                                 ('other', row['resource_id']))
        await self.as_user('owner')
        response = await self.client.get('/api/job/job/inputs')
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {'assets': []})

    async def test_media_kinds_url_encoding_and_unknown_files(self):
        await self.as_user('owner')
        names = ('片 段+#?.MP4', '声音 &.wav', 'notes.json', 'no_extension')
        for name in names:
            self.register_asset(name)
        self.access.register_job_inputs('job', ['chouka/' + name for name in names])
        response = await self.client.get('/api/job/job/inputs')
        self.assertEqual(response.status, 200, await response.text())
        assets = {asset['ref']: asset for asset in (await response.json())['assets']}
        self.assertEqual(assets, {
            'chouka/source.png': self.source_asset(),
            'chouka/片 段+#?.MP4': {
                'ref': 'chouka/片 段+#?.MP4',
                'url': '/api/upload/%E7%89%87%20%E6%AE%B5%2B%23%3F.MP4',
                'kind': 'video', 'origin': '片 段+#?.MP4'},
            'chouka/声音 &.wav': {
                'ref': 'chouka/声音 &.wav',
                'url': '/api/upload/%E5%A3%B0%E9%9F%B3%20%26.wav',
                'kind': 'audio', 'origin': '声音 &.wav'},
        })

    async def test_monitor_default_denies_get_and_head_before_handler(self):
        await self.as_user('screen')
        with mock.patch.object(backend, 'authorized_job',
                               side_effect=AssertionError('monitor must be denied by auth')):
            for method in ('GET', 'HEAD'):
                response = await self.client.request(method, '/api/job/job/inputs')
                self.assertEqual(response.status, 403, await response.text())

    async def test_get_never_registers_or_writes_resource_data(self):
        await self.as_user('owner')
        changes = self.auth.db.total_changes
        with mock.patch.object(self.auth, '_tx', side_effect=AssertionError('read-only endpoint')), \
                mock.patch.object(self.access, 'register_job_inputs',
                                  side_effect=AssertionError('must not derive inputs on read')):
            response = await self.client.get('/api/job/job/inputs')
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {'assets': [self.source_asset()]})
        self.assertEqual(self.auth.db.total_changes, changes)


if __name__ == '__main__':
    unittest.main()
