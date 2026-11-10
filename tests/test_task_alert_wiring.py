"""真实应用启动/关闭装配，钉钉只使用内存客户端，不启动SDK或外联。"""
import asyncio
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from aiohttp.test_utils import TestClient, TestServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'server'))
sys.path.insert(0, str(ROOT / 'tests'))

import app as controller_app
from auth_support import AuthFixture
from test_task_alerts import CONFIG, NOW, START


class TaskAlertWiringTest(unittest.IsolatedAsyncioTestCase, AuthFixture):
    async def asyncSetUp(self):
        self.auth_setup()
        self.client = None
        resource_type = controller_app.ResourceAccess
        runner_type = controller_app.sr_service.Runner
        resource_patch = patch.object(controller_app, 'ResourceAccess', side_effect=(
            lambda store, *_: resource_type(store, self.root)))
        resource_patch.start()
        self.addCleanup(resource_patch.stop)
        runner_patch = patch.object(controller_app.sr_service, 'Runner', side_effect=(
            lambda _path, *args: runner_type(self.root / 'data' / 'sr_tasks.json', *args)))
        runner_patch.start()
        self.addCleanup(runner_patch.stop)
        for name, value in (
                ('PROJ_DIR', self.root / 'data' / 'projects'),
                ('ARTIFACT_DIR', self.root / 'data' / 'artifacts'), ('CONTROLLER_MODE', False),
                ('EXECUTION_MODE', 'local'), ('COMFY_INPUT', self.root / 'input'),
                ('load_jobs', MagicMock()), ('lan_ips', MagicMock(return_value=[])),
                ('ws_loop', AsyncMock())):
            item = patch.object(controller_app, name, value)
            item.start()
            self.addCleanup(item.stop)
        self.env = patch.dict('os.environ', {'CHOUKA_LOCAL_TEST': '0', 'CHOUKA_ADMIN_SANDBOX': '0'})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.jobs = patch.dict(controller_app.JOBS, {}, clear=True)
        self.jobs.start()
        self.addCleanup(self.jobs.stop)

    async def asyncTearDown(self):
        if self.client:
            await self.client.close()
        self.auth_teardown()

    async def start_app(self, configured):
        self.delivered = asyncio.Event()

        async def deliver(_session, _row):
            self.delivered.set()

        self.transport = MagicMock(deliver_task_alert=AsyncMock(side_effect=deliver),
                                   update_task_alert=AsyncMock())

        def setup(app, _store):
            app['dingtalk'] = {'config': CONFIG if configured else {}, 'client': self.transport}

        with patch.object(controller_app, 'setup_dingtalk', side_effect=setup):
            application = controller_app.make_app(auth_path=self.root / 'data' / 'auth.db',
                                                  project_repository=self.projects)
            self.client = TestClient(TestServer(application))
            await self.client.start_server()
        return application

    async def test_configured_app_uses_isolated_database_and_closes_worker(self):
        application = await self.start_app(True)
        service = application['task_alerts']
        self.assertEqual(service.path, self.root / 'data' / 'task-alerts.db')
        self.assertTrue(service.path.exists())
        self.assertIsNotNone(service.worker)
        self.own_project('project')
        self.register_job('job', 'project')
        controller_app.JOBS['job'] = {'id': 'job', 'name': '隔离生成', 'status': 'running',
                                      'started': START, 'project': 'project'}
        with patch('server.task_alerts.time.time', return_value=NOW):
            await service.run_once()
        await asyncio.wait_for(self.delivered.wait(), timeout=2)
        self.transport.deliver_task_alert.assert_awaited_once()
        self.assertEqual(service.store.get('job')['submitter'], 'admin')
        worker, sender = service.worker, service.sender
        session = service.session
        await self.client.close()
        self.client = None
        self.assertTrue(worker.done())
        self.assertTrue(sender.done())
        self.assertTrue(session.closed)
        self.assertIsNone(service.store)
        code, _ = await service.process_callback({})
        self.assertEqual(code, 503)

    async def test_missing_template_keeps_app_and_auth_available_without_alert_db(self):
        application = await self.start_app(False)
        self.assertFalse(application['task_alerts'].path.exists())
        self.assertIsNone(application['task_alerts'].worker)
        response = await self.client.get('/api/health')
        self.assertEqual(response.status, 401)
        self.assertTrue(application['auth_store'].is_ready())
        self.transport.deliver_task_alert.assert_not_awaited()

    async def test_local_test_mode_never_starts_alerts_even_with_configuration(self):
        self.own_project('project')
        with patch.dict('os.environ', {'CHOUKA_LOCAL_TEST': '1'}), patch.object(
                controller_app, 'setup_dingtalk') as setup, patch.object(
                controller_app, 'setup_local_test_auth', new=AsyncMock()):
            application = controller_app.make_app(auth_path=self.root / 'data' / 'auth.db',
                                                  project_repository=self.projects)
            self.client = TestClient(TestServer(application))
            await self.client.start_server()
        self.assertNotIn('task_alerts', application)
        setup.assert_not_called()
        self.assertFalse((self.root / 'data' / 'task-alerts.db').exists())
