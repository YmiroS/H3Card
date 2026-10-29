"""仅本机管理验收的显式隔离边界；默认不启用，不改变正式服务。"""
import json
from pathlib import Path

from aiohttp import web


PAGES = {'/', '/login', '/login.html', '/director', '/controller', '/controller/costs',
         '/controller/capacity', '/admin/permissions', '/teams'}
STATIC = {'/favicon.png', '/icon.png', '/auth-art.webp', '/auth-logo.png',
          '/style.css', '/auth-page.css', '/auth.js', '/app.js', '/director.css',
          '/director.js', '/director_edit.js', '/admin-shell.css',
          '/admin-shell.js', '/controller-page.js', '/costs-page.js'}
READ_APIS = {'/api/health', '/api/status', '/api/workers', '/api/generation/workers', '/api/jobs',
             '/api/projects', '/api/cards', '/api/team-candidates', '/api/teams',
             '/api/capacity', '/api/capacity/export', '/api/costs', '/api/auth/me'}
AUTH_WRITES = {'/api/auth/login', '/api/auth/logout', '/api/auth/password',
               '/api/auth/presence', '/api/auth/phone', '/api/auth/register'}


def validate_runtime(root, auth_path):
    root = Path(root).resolve()
    data = root / 'data'
    marker = data / '.admin-sandbox.json'
    if (root / '.git').exists() or not marker.is_file() or marker.is_symlink():
        raise RuntimeError('管理验收必须从已准备的独立运行树启动，不能使用开发目录')
    try:
        metadata = json.loads(marker.read_text(encoding='utf-8'))
    except (ValueError, OSError) as exc:
        raise RuntimeError('本地隔离标记无效') from exc
    if metadata.get('runtime_root') != str(root) or metadata.get('prepared') is not True:
        raise RuntimeError('本地隔离标记与运行路径不一致')
    if Path(auth_path).resolve() != data / 'auth.db':
        raise RuntimeError('本地隔离账号库不能位于运行树之外')
    for path in root.rglob('*'):
        if path.is_symlink():
            raise RuntimeError('本地隔离运行树不能包含符号链接')
    if (root / 'llm.json').exists() or (root / '.env.controller').exists():
        raise RuntimeError('本地隔离环境不能带入正式服务配置')


def allowed(method, path):
    if method in {'GET', 'HEAD'}:
        return (path in PAGES or path in STATIC or path in READ_APIS
                or path.startswith('/api/admin/')
                or (path.startswith('/api/workers/') and path.endswith('/temperature')))
    if path in AUTH_WRITES or path.startswith('/api/admin/users'):
        return True
    if (path.startswith('/api/admin/grants') or path.startswith('/api/admin/global-grants/')
            or path == '/api/admin/projects/assign'):
        return True
    if path == '/api/teams' or path.startswith('/api/teams/'):
        return True
    if path == '/api/capacity/estimate':
        return True
    if path.startswith('/api/capacity/jobs/'):
        return path.endswith('/review') or path.endswith('/probe-outputs')
    if path.startswith('/api/capacity/workers/'):
        return True
    return path.startswith('/api/workers/') and path.endswith('/enabled')


@web.middleware
async def sandbox_guard(request, handler):
    if not request.app.get('admin_sandbox'):
        return await handler(request)
    socket_name = request.transport.get_extra_info('sockname') if request.transport else None
    port = socket_name[1] if socket_name else None
    host = request.headers.get('Host', '').lower()
    permitted_hosts = {f'127.0.0.1:{port}', f'localhost:{port}'}
    if port == 80:
        permitted_hosts.update({'127.0.0.1', 'localhost'})
    if host not in permitted_hosts or request.remote not in {'127.0.0.1', '::1'}:
        return web.json_response({'error': '本地验收仅接受本机地址'}, status=403)
    if not allowed(request.method, request.path):
        response = web.json_response({'error': '本地隔离环境禁用此操作，不会执行任务或访问正式服务'}, status=403)
    else:
        response = await handler(request)
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; "
        "media-src 'self' blob:; connect-src 'self'; font-src 'self'; "
        "frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'")
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-H3Card-Sandbox'] = 'local-copy'
    response.headers['Referrer-Policy'] = 'no-referrer'
    return response


async def deny_outbound(session, context, params):
    raise RuntimeError('本地隔离环境禁止服务端出站请求')
