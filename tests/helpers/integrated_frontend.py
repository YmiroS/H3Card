"""Temporary real Python service for the compiled-frontend browser regression."""
import asyncio
from contextlib import ExitStack
import json
from pathlib import Path
import shutil
import sys
import time
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
    artist = fixture.auth.create_user('artist', PASSWORD)
    fixture.auth.db.execute("UPDATE users SET phone='13800138000'")
    fixture.own_project('browser', '整合验收画布')
    fixture.own_project('artist-history', '其他用户历史画布', owner=artist)
    # Real business persistence is isolated; only immutable compiled code stays in
    # the checkout. In particular the runtime has no fixture.root/web directory.
    shutil.copyfile(ROOT / 'pricing.json', fixture.root / 'pricing.json')
    for name in ('manifests', 'graphs'):
        shutil.copytree(ROOT / name, fixture.root / name)
    file_response = controller_app.web.FileResponse

    class DistOnlyFileResponse(file_response):
        def __init__(self, path, *args, **kwargs):
            candidate = Path(path).resolve()
            for old_web in (ROOT / 'web', fixture.root / 'web'):
                if candidate.is_relative_to(old_web.resolve()):
                    raise AssertionError(f'Legacy web runtime dependency: {candidate}')
            super().__init__(path, *args, **kwargs)

    try:
        with ExitStack() as stack:
            stack.enter_context(mock.patch.object(controller_app, 'ROOT', fixture.root))
            stack.enter_context(mock.patch.object(controller_app, 'static_asset',
                new=mock.AsyncMock(side_effect=AssertionError('Legacy static handler used'))))
            stack.enter_context(mock.patch.object(controller_app.web, 'FileResponse', DistOnlyFileResponse))
            stack.enter_context(mock.patch.object(controller_app, 'CONTROLLER_MODE', True))
            stack.enter_context(mock.patch.object(controller_app, 'EXECUTION_MODE', 'controller'))
            stack.enter_context(mock.patch.object(controller_app, 'ws_loop', new=mock.AsyncMock()))
            stack.enter_context(mock.patch.object(controller_app, 'setup_dingtalk', return_value=None))
            stack.enter_context(mock.patch.object(controller_app, 'load_jobs', return_value=None))
            stack.enter_context(mock.patch.object(controller_app, 'JOBS_FILE', fixture.root / 'data' / 'jobs.json'))
            stack.enter_context(mock.patch.dict(controller_app.JOBS, {}, clear=True))
            now = time.time()
            for index in range(75):
                jid = f'history-{index}'
                owner = artist if index % 2 else fixture.admin
                project = 'artist-history' if index % 2 else 'browser'
                fixture.register_job(jid, project, owner)
                controller_app.JOBS[jid] = {
                    'id': jid, 'project': project, 'created': now - index,
                    'status': 'error' if index > 60 else 'done',
                    'capability': 'zimage_t2i', 'name': '历史模式', 'cardName': f'历史卡片{index}',
                    'error': f'历史错误{index}' if index > 60 else None,
                }
            controller_app.JOBS['orphan-history'] = {
                'id': 'orphan-history', 'created': now - 100, 'status': 'done',
                'capability': 'zimage_t2i', 'name': '无归属历史',
            }
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
