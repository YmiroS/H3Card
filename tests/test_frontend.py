"""React distribution catalog and auth boundary tests (no Node runtime required)."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer
from yarl import URL

from server.auth import COOKIE, auth_middleware, register_auth_routes, setup_local_test_auth
from server.auth_store import AuthStore
from server.frontend import PUBLIC_FILES, load_frontend

ROOT = Path(__file__).resolve().parents[1]
PASSWORD = 'frontend-test-password'
CHUNK = '/assets/index-12345678.js'
CSS = '/assets/index-abcdefgh.css'


def build_fixture(root):
    root.mkdir()
    (root / 'assets').mkdir()
    (root / 'index.html').write_text(
        f'<link rel="icon" href="/favicon.png"><link rel="stylesheet" href="{CSS}">'
        f'<script type="module" src="{CHUNK}"></script><div id="root"></div>', encoding='utf-8')
    for route in (CHUNK, CSS):
        (root / route.lstrip('/')).write_text('/* fixture */', encoding='utf-8')
    for name in PUBLIC_FILES:
        (root / name).write_bytes(b'public fixture')
    return load_frontend(root)


class FrontendCatalogTests(unittest.TestCase):
    def test_only_actual_fingerprinted_browser_files_and_public_roots_are_catalogued(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'web_dist'
            build_fixture(root)
            private = ('manifest.json', 'index-12345678.js.map', 'private.txt',
                       'private-12345678.json', '.private-12345678.js', 'plain.js')
            for name in private:
                (root / 'assets' / name).write_text('private', encoding='utf-8')
            (root / 'assets' / 'nested').mkdir()
            (root / 'assets' / 'nested' / 'chunk-12345678.js').write_text('private', encoding='utf-8')
            (root / 'private.html').write_text('private', encoding='utf-8')
            (root / 'manifest.json').write_text('{}', encoding='utf-8')
            frontend = load_frontend(root)
            self.assertEqual(set(frontend.assets), {CHUNK, CSS, *('/' + name for name in PUBLIC_FILES)})
            with self.assertRaises(TypeError):
                frontend.assets['/private.html'] = root / 'private.html'

    def test_missing_build_is_a_clear_error_not_legacy_fallback(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'web_dist'
            for state in ('missing', 'index-only', 'empty-assets', 'no-index'):
                with self.subTest(state=state):
                    if state == 'index-only':
                        root.mkdir()
                        (root / 'index.html').write_text('shell', encoding='utf-8')
                    elif state == 'empty-assets':
                        (root / 'assets').mkdir()
                    elif state == 'no-index':
                        (root / 'index.html').unlink()
                        (root / 'assets' / 'index-12345678.js').write_text('js', encoding='utf-8')
                    with self.assertRaisesRegex(RuntimeError, 'React frontend build missing'):
                        load_frontend(root)

    def test_missing_entry_or_stylesheet_is_rejected_even_when_lazy_chunks_exist(self):
        for route in (CHUNK, CSS):
            with self.subTest(route=route), tempfile.TemporaryDirectory() as directory:
                root = Path(directory) / 'web_dist'
                build_fixture(root)
                (root / 'assets' / 'lazy-12345678.js').write_text('lazy', encoding='utf-8')
                (root / route.lstrip('/')).unlink()
                with self.assertRaisesRegex(RuntimeError, 'missing approved index.html assets'):
                    load_frontend(root)

    def test_missing_login_public_assets_are_rejected(self):
        for name in PUBLIC_FILES:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory:
                root = Path(directory) / 'web_dist'
                build_fixture(root)
                (root / name).unlink()
                with self.assertRaisesRegex(RuntimeError, 'missing required public asset'):
                    load_frontend(root)

    def test_make_app_requires_web_dist_before_loading_business_data(self):
        from server import app as controller_app
        with tempfile.TemporaryDirectory() as directory, \
                patch.object(controller_app, 'FRONTEND_ROOT', Path(directory) / 'web_dist'), \
                patch.object(controller_app, 'load_caps') as load_caps, \
                patch.dict('os.environ', {'CHOUKA_LOCAL_TEST': '0', 'CHOUKA_ADMIN_SANDBOX': '0'}):
            with self.assertRaisesRegex(RuntimeError, 'React frontend build missing'):
                controller_app.make_app()
            load_caps.assert_not_called()

    def test_symlink_assets_are_not_published(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'web_dist'
            build_fixture(root)
            secret = Path(directory) / 'secret.js'
            secret.write_text('private', encoding='utf-8')
            link = root / 'assets' / 'secret-12345678.js'
            try:
                link.symlink_to(secret)
            except OSError:
                self.skipTest('Creating symlinks requires OS permission')
            self.assertNotIn('/assets/secret-12345678.js', load_frontend(root).assets)


class FrontendAuthTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.frontend = build_fixture(self.root / 'web_dist')
        self.store = AuthStore(self.root / 'auth.db')
        self.addCleanup(self.store.close)
        for role in ('admin', 'user', 'monitor'):
            self.store.create_user(role, PASSWORD, role)
        self.store.set_ready()
        self.sessions = {role: self.store.login(role, PASSWORD) for role in ('admin', 'user', 'monitor')}
        self.app = web.Application(middlewares=[auth_middleware])
        self.app['auth_store'] = self.store
        register_auth_routes(self.app, ROOT / 'web', frontend=self.frontend)
        self.client = TestClient(TestServer(self.app))
        await self.client.start_server()
        self.addAsyncCleanup(self.client.close)
        self.origin = str(self.client.make_url('/')).rstrip('/')

    def headers(self, role):
        return {'Cookie': f'{COOKIE}={self.sessions[role]["token"]}'}

    async def test_login_is_public_and_legacy_alias_redirects_to_canonical(self):
        for method in ('GET', 'HEAD'):
            response = await self.client.request(method, '/login')
            self.assertEqual(response.status, 200)
            if method == 'GET':
                self.assertEqual(await response.read(), self.frontend.index.read_bytes())
            response = await self.client.request(method, '/login.html?next=/director', allow_redirects=False)
            self.assertEqual(response.status, 302)
            self.assertEqual(response.headers['Location'], '/login')

    async def test_exact_assets_are_public_and_monitor_read_only(self):
        for role in (None, 'admin', 'user', 'monitor'):
            for method in ('GET', 'HEAD'):
                for route, path in self.frontend.assets.items():
                    with self.subTest(role=role, method=method, route=route):
                        response = await self.client.request(method, route + '?v=1',
                            headers=self.headers(role) if role else {})
                        self.assertEqual(response.status, 200)
                        self.assertEqual(response.headers['Cache-Control'], 'private, no-store')
                        expected_type = {'.js': 'text/javascript', '.css': 'text/css',
                                         '.png': 'image/png', '.webp': 'image/webp'}[path.suffix]
                        self.assertEqual(response.content_type, expected_type)
                        if method == 'GET':
                            self.assertEqual(await response.read(), path.read_bytes())
        self.store.set_ready(False)
        # Login chunks remain available before ACL migration/readiness.
        self.assertEqual((await self.client.get(CHUNK)).status, 200)

    async def test_anonymous_missing_chunks_are_404_not_login_or_spa(self):
        for role in (None, 'admin', 'user'):
            for method in ('GET', 'HEAD'):
                for route in ('/assets/missing-12345678.js', '/assets/missing-12345678.css',
                              '/assets/', '/assets/manifest.json', '/assets/private.js',
                              '/assets/index-12345678.js.map', '/assets/nested/unknown.js'):
                    response = await self.client.request(method, route, allow_redirects=False,
                        headers=self.headers(role) if role else {})
                    self.assertEqual(response.status, 404)
                    self.assertNotIn('Location', response.headers)
        (self.root / 'web_dist' / CHUNK.lstrip('/')).unlink()
        self.assertEqual((await self.client.get(CHUNK, allow_redirects=False)).status, 404)

    async def test_unlisted_files_and_api_paths_never_receive_spa_html(self):
        for route in ('/assets/', '/assets/manifest.json', '/assets/index-12345678.js.map',
                      '/assets/private.txt', '/assets/nested/chunk-12345678.js',
                      '/manifest.json', '/index.html', '/private.html', '/unknown', '/api/unknown'):
            response = await self.client.get(route, headers=self.headers('admin'), allow_redirects=False)
            self.assertEqual(response.status, 404, route)
            self.assertNotEqual(await response.read(), self.frontend.index.read_bytes())
        self.assertEqual((await self.client.get('/api/unknown')).status, 401)

    async def test_monitor_exact_assets_do_not_expand_original_business_or_api_permissions(self):
        denied = ('/', '/director', '/if-studio', '/teams', '/controller', '/admin/permissions',
                  '/api/projects', '/api/jobs', '/api/unknown', '/api/auth/presence',
                  '/style.css', '/admin-shell.js', '/vendor/fabric.min.js',
                  '/assets/missing-12345678.js', '/assets/index-12345678.js.map',
                  '/assets/%69ndex-12345678.js', '/assets/index-12345678%2Ejs',
                  '/assets%2Findex-12345678.js', '/assets/index-12345678.js/extra')
        for method in ('GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'):
            for route in denied:
                with self.subTest(method=method, route=route):
                    response = await self.client.session.request(method, URL(self.origin + route, encoded=True),
                        headers=self.headers('monitor'), allow_redirects=False)
                    self.assertEqual(response.status, 403)
        for method in ('POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'):
            for route in self.frontend.assets:
                response = await self.client.request(method, route, headers={
                    **self.headers('monitor'), 'Origin': self.origin,
                    'X-CSRF-Token': self.sessions['monitor']['csrf_token']})
                self.assertEqual(response.status, 403)

    async def test_frontend_does_not_weaken_csrf_or_source_validation(self):
        headers = self.headers('user')
        for extra in ({}, {'Origin': self.origin}, {
                'Origin': 'https://evil.invalid', 'X-CSRF-Token': self.sessions['user']['csrf_token']}):
            response = await self.client.post('/api/auth/logout', headers={**headers, **extra})
            self.assertEqual(response.status, 403)
        response = await self.client.post('/api/auth/logout', headers={
            **headers, 'Origin': self.origin, 'X-CSRF-Token': self.sessions['user']['csrf_token']})
        self.assertEqual(response.status, 200)

    async def test_local_mode_assets_keep_loopback_and_source_checks(self):
        store = AuthStore(self.root / 'local.db')
        self.addCleanup(store.close)
        app = web.Application(middlewares=[auth_middleware])
        app['auth_store'] = store
        app['local_test'] = True
        register_auth_routes(app, ROOT / 'web', frontend=self.frontend)
        await setup_local_test_auth(app)
        client = TestClient(TestServer(app))
        await client.start_server()
        try:
            self.assertEqual((await client.get(CHUNK)).status, 200)
            self.assertEqual((await client.get('/assets/missing-12345678.js')).status, 404)
            for headers in ({'Host': 'evil.invalid:8199'}, {'Origin': 'https://evil.invalid'},
                            {'Sec-Fetch-Site': 'cross-site'}):
                self.assertEqual((await client.get(CHUNK, headers=headers)).status, 403)
        finally:
            await client.close()

    async def test_standalone_auth_registration_keeps_legacy_login(self):
        app = web.Application(middlewares=[auth_middleware])
        app['auth_store'] = self.store
        register_auth_routes(app, ROOT / 'web')
        client = TestClient(TestServer(app))
        await client.start_server()
        try:
            for route in ('/login', '/login.html'):
                response = await client.get(route, allow_redirects=False)
                self.assertEqual(response.status, 200)
                self.assertEqual(await response.read(), (ROOT / 'web' / 'login.html').read_bytes())
            response = await client.get(CHUNK, allow_redirects=False)
            self.assertEqual(response.status, 302)
        finally:
            await client.close()


if __name__ == '__main__':
    unittest.main()
