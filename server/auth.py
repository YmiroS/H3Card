"""浏览器认证入口；worker 通道继续使用独立认证。"""
import asyncio
import os
import secrets
import sqlite3
import time
from collections import OrderedDict, deque
from contextlib import AsyncExitStack
from pathlib import Path
from urllib.parse import urlsplit

from aiohttp import web

from .auth_store import AuthError

COOKIE = 'h3card_session'
PUBLIC = {'/login', '/login.html', '/auth.js', '/style.css', '/favicon.png', '/icon.png'}
ADMIN_PAGES = {'/controller', '/controller.html', '/controller/costs', '/costs.html',
               '/admin/permissions', '/permissions.html'}
ADMIN_APIS = ('/api/admin', '/api/workers', '/api/costs', '/api/reload', '/api/status')


async def call_store(app, method, *args, **kwargs):
    store = app.get('auth_store')
    if store is None:
        raise web.HTTPServiceUnavailable(text='认证服务尚未配置')
    slots = app.get('_auth_hash_slots')
    if slots and method in ('login', 'create_user', 'create_registration',
                            'reset_password', 'change_password'):
        # Argon2 哈希约几十毫秒；限制并发避免大量登录把事件循环线程池占满。
        async with slots:
            return await asyncio.to_thread(getattr(store, method), *args, **kwargs)
    return await asyncio.to_thread(getattr(store, method), *args, **kwargs)


async def admin_call(request, method, *args, **kwargs):
    user = require_admin(request)
    return await call_store(request.app, method, *args, **kwargs,
                            actor_id=user['id'], session_token=request.cookies.get(COOKIE, ''))


def require_user(request):
    user = request.get('user')
    if not user or not user.get('enabled'):
        raise web.HTTPUnauthorized(text='请先登录')
    return user


def require_admin(request):
    user = require_user(request)
    if user['role'] != 'admin':
        raise web.HTTPForbidden(text='需要管理员权限')
    return user


async def require_project(request, pid, operate=False):
    user = require_user(request)
    permission = await call_store(request.app, 'project_permission', user['id'], pid)
    if permission is None:
        raise web.HTTPNotFound(text='画布不存在或不可访问')
    if operate and permission != 'operate':
        raise web.HTTPForbidden(text='画布为只读')
    project = await call_store(request.app, 'get_project', pid)
    if project is None:
        raise web.HTTPNotFound(text='画布不存在')
    return project | {'permission': permission}


async def require_job(request, jid, operate=False):
    require_user(request)
    job = await call_store(request.app, 'get_job', jid)
    if job is None:
        raise web.HTTPNotFound(text='任务不存在或不可访问')
    await require_project(request, job['project_id'], operate)
    return job


def _admin_path(path):
    return path in ADMIN_PAGES or any(path == p or path.startswith(p + '/') for p in ADMIN_APIS)


def _check_source(request):
    expected = os.environ.get('CHOUKA_AUTH_ORIGIN') or f'{request.scheme}://{request.host}'
    source = request.headers.get('Origin') or request.headers.get('Referer')
    try:
        actual = urlsplit(source or '')
        target = urlsplit(expected)
        def origin(parts):
            return (parts.scheme, parts.hostname, parts.port or (443 if parts.scheme == 'https' else 80))
        valid = actual.scheme in ('http', 'https') and actual.hostname and not actual.username and origin(actual) == origin(target)
    except ValueError:
        valid = False
    if not valid or request.headers.get('Sec-Fetch-Site') == 'cross-site':
        raise web.HTTPForbidden(text='请求来源不可信')


def _rate_limit(request, username=''):
    # 仅使用直连地址，不信任客户端可伪造的转发头；同时限制全局哈希负载。
    buckets = request.app['_auth_login_limits']
    now = time.monotonic()
    for key, maximum in (('*', 100), ('ip:' + (request.remote or 'unknown'), 10),
                         ('user:' + username.strip().casefold()[:128], 10)):
        bucket = buckets.setdefault(key, deque())
        while bucket and bucket[0] <= now - 60:
            bucket.popleft()
        if len(bucket) >= maximum:
            raise web.HTTPTooManyRequests(text='登录过于频繁，请稍后重试', headers={'Retry-After': '60'})
        bucket.append(now)
        buckets.move_to_end(key)
    while len(buckets) > 4096:
        buckets.popitem(last=False)


def _register_rate_limit(request, username=''):
    """注册独立限流：比登录更紧，避免刷申请与哈希负载。"""
    buckets = request.app['_auth_register_limits']
    now = time.monotonic()
    for key, maximum in (('*', 30), ('ip:' + (request.remote or 'unknown'), 5),
                         ('user:' + username.strip().casefold()[:128], 3)):
        bucket = buckets.setdefault(key, deque())
        while bucket and bucket[0] <= now - 60:
            bucket.popleft()
        if len(bucket) >= maximum:
            raise web.HTTPTooManyRequests(text='注册过于频繁，请稍后重试', headers={'Retry-After': '60'})
        bucket.append(now)
        buckets.move_to_end(key)
    while len(buckets) > 4096:
        buckets.popitem(last=False)


@web.middleware
async def auth_middleware(request, handler):
    try:
        if request.app.get('auth_store') is None:
            raise web.HTTPServiceUnavailable(text='认证服务尚未配置')
        if request.path.startswith('/agent/v1/'):
            if not await call_store(request.app, 'is_ready'):
                raise web.HTTPServiceUnavailable(text='权限迁移尚未完成，Worker 通道暂不可用')
            return await handler(request)
        response = await _browser_request(request, handler)
    except sqlite3.Error:
        response = web.json_response({'error': '认证数据暂不可用，请联系管理员'}, status=503)
    except AuthError as exc:
        response = web.json_response({'error': str(exc)}, status=exc.status)
    except web.HTTPException as exc:
        response = exc
    response.headers['Cache-Control'] = 'private, no-store'
    response.headers['Pragma'] = 'no-cache'
    return response


async def _browser_request(request, handler):
    path = request.path
    if path in PUBLIC and request.method in ('GET', 'HEAD'):
        return await handler(request)
    if not await call_store(request.app, 'has_admin'):
        raise web.HTTPServiceUnavailable(text='请先初始化管理员账号')
    if path == '/api/auth/login' and request.method == 'POST':
        _check_source(request)
        return await handler(request)
    if path == '/api/auth/register' and request.method == 'POST':
        # 审批通道未配置时拒绝注册（fail-closed），不产生无人审批的申请。
        if request.app.get('dingtalk') is None:
            raise web.HTTPServiceUnavailable(text='注册审批服务未配置，请联系管理员')
        _check_source(request)
        return await handler(request)
    session = await call_store(request.app, 'get_session', request.cookies.get(COOKIE, ''))
    if session is None:
        if path.startswith('/api/') or request.method not in ('GET', 'HEAD'):
            raise web.HTTPUnauthorized(text='请先登录')
        raise web.HTTPFound('/login')
    request['user'] = session['user']
    request['auth_session'] = session
    if _admin_path(path):
        require_admin(request)
    if request.method not in ('GET', 'HEAD', 'OPTIONS'):
        _check_source(request)
        supplied = request.headers.get('X-CSRF-Token', '')
        if not secrets.compare_digest(supplied, session['csrf_token']):
            raise web.HTTPForbidden(text='CSRF 校验失败')
    management = path.startswith('/api/auth/') or path.startswith('/api/admin/') or path in ADMIN_PAGES
    if not management and not await call_store(request.app, 'is_ready'):
        raise web.HTTPServiceUnavailable(text='画布权限迁移尚未完成')
    return await handler(request)


async def _body(request, required=(), optional=()):
    if request.content_length is not None and request.content_length > 16384:
        raise web.HTTPRequestEntityTooLarge(max_size=16384, actual_size=request.content_length)
    try:
        body = await request.json()
    except (ValueError, UnicodeError):
        raise web.HTTPBadRequest(text='请求必须为 JSON 对象')
    if not isinstance(body, dict) or set(body) - set(required) - set(optional) or any(k not in body for k in required):
        raise web.HTTPBadRequest(text='请求字段不正确')
    for key, value in body.items():
        if key == 'enabled':
            if not isinstance(value, bool):
                raise web.HTTPBadRequest(text='enabled 必须为布尔值')
        elif not isinstance(value, str):
            raise web.HTTPBadRequest(text='字段必须为字符串')
    return body


def _secure_cookie(request):
    return request.secure or os.environ.get('CHOUKA_AUTH_ORIGIN', '').startswith('https://')


async def login(request):
    body = await _body(request, ('username', 'password'))
    _rate_limit(request, body['username'])
    result = await call_store(request.app, 'login', **body)
    previous = request.cookies.get(COOKIE)
    if previous:
        await call_store(request.app, 'logout', previous)
    token = result.pop('token')
    response = web.json_response(result)
    response.set_cookie(COOKIE, token, httponly=True, secure=_secure_cookie(request), samesite='Lax', path='/')
    return response


async def register(request):
    body = await _body(request, ('username', 'display_name', 'password'))
    _register_rate_limit(request, body['username'])
    result = await call_store(request.app, 'create_registration', **body)
    return web.json_response(result, status=201)


async def registrations(request):
    require_admin(request)
    return web.json_response({
        'requests': await call_store(request.app, 'list_registrations'),
        'outbox': await call_store(request.app, 'outbox_backlog'),
    })


async def me(request):
    require_user(request)
    return web.json_response(request['auth_session'])


async def logout(request):
    require_user(request)
    await call_store(request.app, 'logout', request.cookies.get(COOKIE, ''))
    response = web.json_response({'ok': True})
    response.del_cookie(COOKIE, path='/')
    return response


async def password(request):
    user = require_user(request)
    body = await _body(request, ('current_password', 'new_password'))
    await call_store(request.app, 'change_password', user['id'], **body,
                     session_token=request.cookies.get(COOKIE, ''))
    response = web.json_response({'ok': True})
    response.del_cookie(COOKIE, path='/')
    return response


async def users(request):
    require_admin(request)
    if request.method == 'GET':
        return web.json_response({'users': await call_store(request.app, 'list_users')})
    body = await _body(request, ('username', 'password', 'role'))
    return web.json_response({'user': await admin_call(request, 'create_user', **body)}, status=201)


async def update_user(request):
    require_admin(request)
    body = await _body(request, optional=('role', 'enabled'))
    if not body:
        raise web.HTTPBadRequest(text='至少提供一个修改字段')
    return web.json_response({'user': await admin_call(request, 'set_user', request.match_info['uid'], **body)})


async def reset_password(request):
    require_admin(request)
    body = await _body(request, ('password',))
    await admin_call(request, 'reset_password', request.match_info['uid'], body['password'])
    return web.json_response({'ok': True})


async def grants(request):
    require_admin(request)
    if request.method == 'GET':
        return web.json_response({'grants': await call_store(request.app, 'list_grants')})
    body = await _body(request, ('viewer_id', 'owner_id', 'permission'))
    return web.json_response({'grant': await admin_call(request, 'set_grant', **body)})


async def delete_grant(request):
    require_admin(request)
    await admin_call(request, 'delete_grant', request.match_info['viewer_id'],
                     request.match_info['owner_id'])
    return web.json_response({'ok': True})


async def assign_projects(request):
    require_admin(request)
    try:
        body = await request.json()
    except (ValueError, UnicodeError):
        raise web.HTTPBadRequest(text='请求必须为 JSON 对象')
    if not isinstance(body, dict) or set(body) != {'projects', 'owner_id'}:
        raise web.HTTPBadRequest(text='请求字段不正确')
    projects = body['projects']
    if (not isinstance(projects, list) or not 1 <= len(projects) <= 1000
            or any(not isinstance(p, dict) or not isinstance(p.get('project_id'), str)
                   or not 1 <= len(p['project_id']) <= 512 for p in projects)):
        raise web.HTTPBadRequest(text='无效画布分配清单，每次请选择 1 至 1000 个画布')
    # 按固定顺序获取与画布编辑共用的锁，避免批量操作死锁和编辑中途换归属。
    async with AsyncExitStack() as stack:
        for pid in sorted({p['project_id'] for p in projects}):
            await stack.enter_async_context(request.app['project_locks'][pid])
        count = await admin_call(request, 'assign_projects', **body)
    return web.json_response({'ok': True, 'count': count})


def register_auth_routes(app, web_root):
    app['_auth_login_limits'] = OrderedDict()
    app['_auth_register_limits'] = OrderedDict()
    app['_auth_hash_slots'] = asyncio.Semaphore(2)
    root = Path(web_root)

    async def login_page(request):
        return web.FileResponse(root / 'login.html')

    async def auth_script(request):
        return web.FileResponse(root / 'auth.js')

    async def public_asset(request):
        # 白名单内的公共静态资源（图标等）；根目录静态兜底已移除，必须有显式路由。
        name = request.path.lstrip('/')
        if '/' + name not in PUBLIC:
            raise web.HTTPNotFound()
        return web.FileResponse(root / name)

    app.router.add_get('/login', login_page)
    app.router.add_get('/login.html', login_page)
    app.router.add_get('/auth.js', auth_script)
    for asset in ('/favicon.png', '/icon.png'):
        app.router.add_get(asset, public_asset)
    app.router.add_get('/api/auth/me', me)
    app.router.add_post('/api/auth/login', login)
    app.router.add_post('/api/auth/register', register)
    app.router.add_post('/api/auth/logout', logout)
    app.router.add_post('/api/auth/password', password)
    app.router.add_get('/api/admin/registrations', registrations)
    app.router.add_post('/api/admin/projects/assign', assign_projects)
    app.router.add_get('/api/admin/users', users)
    app.router.add_post('/api/admin/users', users)
    app.router.add_patch('/api/admin/users/{uid}', update_user)
    app.router.add_post('/api/admin/users/{uid}/password', reset_password)
    app.router.add_get('/api/admin/grants', grants)
    app.router.add_put('/api/admin/grants', grants)
    app.router.add_delete('/api/admin/grants/{viewer_id}/{owner_id}', delete_grant)
