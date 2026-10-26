"""Temporary real Python service for the compiled-frontend browser regression."""
import asyncio
from contextlib import ExitStack
import json
from pathlib import Path
import sys
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT), str(ROOT / 'server'), str(ROOT / 'tests')]

from aiohttp.test_utils import TestServer
import app as controller_app
from auth_support import AuthFixture, PASSWORD


async def main():
    fixture = AuthFixture()
    fixture.auth_setup()
    fixture.auth.create_user('monitor', PASSWORD, role='monitor')
    fixture.auth.db.execute("UPDATE users SET phone='13800138000'")
    fixture.own_project('browser', '整合验收画布')
    try:
        with ExitStack() as stack:
            distributed_type = controller_app.DistributedStore
            costs_type = controller_app.CostLedger
            stack.enter_context(mock.patch.object(controller_app, 'CONTROLLER_MODE', True))
            stack.enter_context(mock.patch.object(controller_app, 'EXECUTION_MODE', 'controller'))
            stack.enter_context(mock.patch.object(controller_app, 'DistributedStore',
                side_effect=lambda *_: distributed_type(fixture.root / 'data' / 'control.db')))
            stack.enter_context(mock.patch.object(controller_app, 'CostLedger',
                side_effect=lambda *_: costs_type(fixture.root / 'data' / 'control.db', ROOT / 'pricing.json')))
            stack.enter_context(mock.patch.object(controller_app, 'ws_loop', new=mock.AsyncMock()))
            stack.enter_context(mock.patch.object(controller_app, 'setup_dingtalk', return_value=None))
            stack.enter_context(mock.patch.object(controller_app, 'load_jobs', return_value=None))
            stack.enter_context(mock.patch.dict(controller_app.JOBS, {}, clear=True))
            application = controller_app.make_app(
                auth_path=fixture.root / 'data' / 'auth.db', project_repository=fixture.projects)
            server = TestServer(application, host='127.0.0.1')
            await server.start_server()
            try:
                print('FRONTEND_READY ' + json.dumps({'origin': str(server.make_url('/')).rstrip('/')}), flush=True)
                await asyncio.to_thread(sys.stdin.readline)
            finally:
                await server.close()
    finally:
        fixture.auth_teardown()


if __name__ == '__main__':
    asyncio.run(main())
