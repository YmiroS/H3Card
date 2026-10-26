"""Explicit catalog for the tracked frontend build; never mount a static directory."""
import re
from dataclasses import dataclass
from functools import partial
from html.parser import HTMLParser
from pathlib import Path
from types import MappingProxyType
from typing import Mapping

from aiohttp import web

PUBLIC_FILES = frozenset({'favicon.png', 'icon.png', 'auth-art.webp', 'auth-logo.png'})
PAGE_FILES = MappingProxyType({
    '/controller': 'admin/controller.html',
    '/admin/permissions': 'admin/permissions.html',
    '/controller/costs': 'admin/costs.html',
    '/controller/capacity': 'admin/capacity.html',
    '/monitor': 'admin/monitor.html',
})
PROTECTED_FILES = frozenset({'vendor/fabric.min.js'})
# Do not depend on the host's Windows registry MIME registrations (notably WebP).
CONTENT_TYPES = {
    '.js': 'text/javascript', '.css': 'text/css', '.woff': 'font/woff',
    '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon', '.avif': 'image/avif',
}
# Only flat, fingerprinted browser resources, not maps, manifests or other build files.
ASSET_PATH = re.compile(
    r'/assets/[A-Za-z0-9_][A-Za-z0-9_.-]*-[A-Za-z0-9_-]{8,}'
    r'\.(?:js|css|woff2?|ttf|otf|png|jpe?g|gif|webp|svg|ico|avif)')


@dataclass(frozen=True)
class Frontend:
    index: Path
    assets: Mapping[str, Path]
    pages: Mapping[str, Path]
    protected_assets: Mapping[str, Path]


class _EntryReferences(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = set()

    def handle_starttag(self, tag, attrs):
        attribute = {'script': 'src', 'link': 'href'}.get(tag)
        value = dict(attrs).get(attribute) if attribute else None
        if value:
            # Build documents must not smuggle remote or relative runtime dependencies.
            self.paths.add(value)


def load_frontend(root):
    root = Path(root).resolve()
    index = root / 'index.html'
    directory = root / 'assets'
    if not index.is_file() or index.is_symlink() or not directory.is_dir() or directory.is_symlink():
        raise RuntimeError(f'React frontend build missing index.html or assets directory: {root}')
    assets = {}
    for path in sorted(directory.iterdir()):
        url = '/assets/' + path.name
        if ASSET_PATH.fullmatch(url) and path.is_file() and not path.is_symlink():
            assets[url] = path
    if not any(url.endswith('.js') for url in assets):
        raise RuntimeError(f'React frontend build missing fingerprinted JavaScript assets: {directory}')
    for name in sorted(PUBLIC_FILES):
        path = root / name
        if not path.is_file() or path.is_symlink():
            raise RuntimeError(f'React frontend build missing required public asset: {path}')
        assets['/' + name] = path
    pages = {}
    for route, name in PAGE_FILES.items():
        path = root / name
        if not path.is_file() or path.is_symlink() or path.parent.is_symlink():
            raise RuntimeError(f'React frontend build missing required page: {path}')
        pages[route] = path
    for path in (index, *pages.values()):
        references = _EntryReferences()
        name = path.relative_to(root).as_posix()
        try:
            references.feed(path.read_text(encoding='utf-8'))
        except (OSError, UnicodeError, ValueError) as exc:
            raise RuntimeError(f'React frontend build has unreadable {name}: {path}') from exc
        missing = references.paths - assets.keys()
        if missing:
            raise RuntimeError(f'React frontend build missing approved {name} assets: {sorted(missing)}')
        if not any(url.startswith('/assets/') and url.endswith('.js') for url in references.paths):
            raise RuntimeError(f'React frontend build missing fingerprinted entry JavaScript: {path}')
    protected = {}
    for name in sorted(PROTECTED_FILES):
        path = root / name
        if not path.is_file() or path.is_symlink() or path.parent.is_symlink():
            raise RuntimeError(f'React frontend build missing required protected asset: {path}')
        protected['/' + name] = path
    return Frontend(index, MappingProxyType(assets), MappingProxyType(pages),
                    MappingProxyType(protected))


def is_frontend_asset(request):
    frontend = request.app.get('frontend')
    return (frontend is not None and request.method in ('GET', 'HEAD')
            and request.path == request.rel_url.raw_path
            and request.path in frontend.assets)


def is_missing_frontend_asset(request):
    # Unknown build resources only return 404, never login redirects or SPA HTML.
    # This negative decision grants no file access; monitor default-deny runs first.
    return (request.app.get('frontend') is not None
            and request.method in ('GET', 'HEAD')
            and request.path.startswith('/assets/')
            and not is_frontend_asset(request))


async def _asset(request, *, path):
    if not is_frontend_asset(request) or not path.is_file() or path.is_symlink():
        raise web.HTTPNotFound()
    return web.FileResponse(path, headers={'Content-Type': CONTENT_TYPES[path.suffix]})


async def _protected_asset(request, *, path):
    # Authentication/readiness/source checks remain in the application middleware.
    from .auth import require_user
    user = require_user(request)
    if user['role'] == 'monitor':
        raise web.HTTPForbidden()
    frontend = request.app['frontend']
    if (request.method not in ('GET', 'HEAD') or request.path != request.rel_url.raw_path
            or frontend.protected_assets.get(request.path) != path
            or not path.is_file() or path.is_symlink() or path.parent.is_symlink()):
        raise web.HTTPNotFound()
    return web.FileResponse(path, headers={'Content-Type': CONTENT_TYPES[path.suffix]})


def register_frontend_assets(app, frontend):
    app['frontend'] = frontend
    for url, path in frontend.assets.items():
        app.router.add_get(url, partial(_asset, path=path))
    for url, path in frontend.protected_assets.items():
        app.router.add_get(url, partial(_protected_asset, path=path))
