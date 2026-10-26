"""浏览器认证入口；worker 通道继续使用独立认证。"""
import asyncio
import json
import os
import re
import secrets
import sqlite3
import time
from collections import OrderedDict, deque
from contextlib import AsyncExitStack
from pathlib import Path
from urllib.parse import urlsplit

from aiohttp import web
from yarl import URL

from .auth_store import AuthError
from .frontend import (PUBLIC_FILES, is_frontend_asset, is_missing_frontend_asset,
                       register_frontend_assets)

COOKIE = 'h3card_session'
AUTH_ASSETS = {
    '/favicon.png': 'image/png',
    '/icon.png': 'image/png',
    '/auth-page.css': 'text/css',
    '/auth-art.webp': 'image/webp',
    '/auth-logo.png': 'image/png',
}
PUBLIC = {'/login', '/login.html', '/auth.js', '/style.css', *AUTH_ASSETS}
ADMIN_PAGES = {'/controller', '/controller.html', '/controller/costs', '/costs.html',
               '/controller/capacity', '/capacity.html',
               '/admin/permissions', '/permissions.html'}
MONITOR_ASSETS = {'/monitor', '/monitor.css', '/monitor-page.js', '/monitor-alerts.js'}
MONITOR_PUBLIC = {'/login', '/login.html', '/auth.js', *AUTH_ASSETS}
MONITOR_READ = MONITOR_ASSETS | MONITOR_PUBLIC | {'/api/monitor/summary', '/api/auth/me'}
MONITOR_WORKER = re.compile(r'/api/monitor/workers/[^/\\\x00-\x20%?#]+(?:/temperature)?')
TEAM_PAGES = {'/teams', '/teams.html'}
ADMIN_APIS = ('/api/admin', '/api/workers', '/api/costs', '/api/capacity', '/api/reload', '/api/status')


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


async def team_call(request, method, *args, **kwargs):
    user = require_team_leader(request)
    return await call_store(request.app, method, *args, **kwargs,
                            actor_id=user['id'], session_token=request.cookies.get(COOKIE, ''))


async def notify_access_changed(request, *, user_ids=None, project_ids=None):
    callback = request.app.get('presence_access_changed')
    if callback:
        await callback(user_ids=set(user_ids or ()), project_ids=set(project_ids or ()))


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


def require_monitor(request):
    user = require_user(request)
    if user['role'] not in ('admin', 'monitor'):
        raise web.HTTPForbidden(text='需要监控展示员或管理员权限')
    return user


def require_team_leader(request):
    user = require_user(request)
    if user['role'] == 'monitor' or (user['role'] != 'admin' and not user.get('team_leader')):
        raise web.HTTPForbidden(text='需要组长权限')
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


def _monitor_path(path):
    return path in MONITOR_ASSETS or path == '/api/monitor' or path.startswith('/api/monitor/')


def _monitor_allowed(request):
    if request.method == 'POST':
        return request.path == request.rel_url.raw_path == '/api/auth/logout'
    if request.method not in ('GET', 'HEAD'):
        return False
    # 同时核对解码路径和原始路径，拒绝编码斜杠、双重编码及路径伪装。
    path = request.path
    raw_path = request.rel_url.raw_path
    return is_frontend_asset(request) or (path in MONITOR_READ and raw_path == path) or (
        MONITOR_WORKER.fullmatch(path) is not None
        and MONITOR_WORKER.fullmatch(raw_path) is not None
        and all(part not in ('.', '..') for part in path.split('/')))


def _check_source(request):
    expected = f'{request.scheme}://{request.host}'
    if not request.app.get('local_test'):
        expected = os.environ.get('CHOUKA_AUTH_ORIGIN') or expected
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


async def setup_local_test_auth(app):
    users = await call_store(app, 'list_users')
    if not users:
        user = await call_store(app, 'create_user', 'local-test', secrets.token_urlsafe(48))
    elif len(users) == 1 and users[0]['username'] == 'local-test' and users[0]['role'] == 'user' and users[0]['enabled']:
        user = users[0]
    else:
        raise RuntimeError('本地测试账号库包含其他账号，拒绝用于免登录模式')
    await call_store(app, 'set_ready')
    app['local_test_session'] = {'user': user, 'csrf_token': secrets.token_urlsafe(32), 'local_test': True}


async def _local_test_request(request, handler):
    host = urlsplit(f'{request.scheme}://{request.host}').hostname
    if request.remote not in ('127.0.0.1', '::1') or host not in ('127.0.0.1', 'localhost', '::1'):
        raise web.HTTPForbidden(text='免登录测试服务仅允许本机访问')
    if request.headers.get('Origin') or request.headers.get('Sec-Fetch-Site') == 'cross-site':
        _check_source(request)
    path = request.path
    local_auth_routes = {'/api/auth/me', '/api/auth/presence'}
    if path.startswith('/agent/v1/') or (path.startswith('/api/auth/') and path not in local_auth_routes):
        raise web.HTTPForbidden(text='本地测试模式不提供账号管理或 Worker 接口')
    if path in ('/login', '/login.html'):
        raise web.HTTPFound('/')
    session = request.app['local_test_session']
    request['user'] = session['user']
    request['auth_session'] = session
    if _admin_path(path):
        require_admin(request)
    if path in TEAM_PAGES:
        require_team_leader(request)
    if _monitor_path(path):
        require_monitor(request)
    if request.method not in ('GET', 'HEAD', 'OPTIONS'):
        _check_source(request)
        if not secrets.compare_digest(request.headers.get('X-CSRF-Token', ''), session['csrf_token']):
            raise web.HTTPForbidden(text='CSRF 校验失败')
    return await handler(request)


@web.middleware
async def auth_middleware(request, handler):
    try:
        redirect_origin = request.app.get('https_redirect_origin')
        if (redirect_origin and not request.secure
                and request.method in ('GET', 'HEAD')
                and not request.path.startswith(('/api/', '/agent/'))
                and request.headers.get('Upgrade', '').lower() != 'websocket'):
            raise web.HTTPPermanentRedirect(URL(redirect_origin + request.rel_url.raw_path_qs, encoded=True))
        if request.app.get('auth_store') is None:
            raise web.HTTPServiceUnavailable(text='认证服务尚未配置')
        if request.app.get('local_test'):
            response = await _local_test_request(request, handler)
        elif request.path.startswith('/agent/v1/'):
            if not await call_store(request.app, 'is_ready'):
                raise web.HTTPServiceUnavailable(text='权限迁移尚未完成，Worker 通道暂不可用')
            return await handler(request)
        else:
            response = await _browser_request(request, handler)
    except sqlite3.Error:
        response = web.json_response({'error': '认证数据暂不可用，请联系管理员'}, status=503)
    except AuthError as exc:
        response = web.json_response({'error': str(exc)}, status=exc.status)
    except web.HTTPException as exc:
        response = exc
    # 只有已经过资源鉴权的缩略图文件允许私有重验证缓存，错误响应仍禁止存储。
    if request.path == '/api/thumbnail' and isinstance(response, web.FileResponse):
        response.headers['Cache-Control'] = 'private, no-cache'
    else:
        response.headers['Cache-Control'] = 'private, no-store'
    response.headers['Pragma'] = 'no-cache'
    return response


async def _browser_request(request, handler):
    path = request.path
    token = request.cookies.get(COOKIE, '')
    session = await call_store(request.app, 'get_session', token) if token else None
    # 必须在公开资源、登录/注册的提前返回之前执行，监控角色默认无业务访问权。
    if session is not None and session['user']['role'] == 'monitor' and not _monitor_allowed(request):
        raise web.HTTPForbidden(text='监控展示员仅可访问只读监控页面')
    if is_missing_frontend_asset(request):
        raise web.HTTPNotFound()
    if is_frontend_asset(request) or (path in PUBLIC and request.method in ('GET', 'HEAD')):
        return await handler(request)
    if not await call_store(request.app, 'has_admin'):
        raise web.HTTPServiceUnavailable(text='请先初始化管理员账号')
    if path == '/api/auth/login' and request.method == 'POST':
        _check_source(request)
        return await handler(request)
    if path == '/api/auth/register' and request.method == 'POST':
        # 正式审批通道未配置时拒绝注册；隔离副本仅保存本地待审批申请，不外发。
        if request.app.get('dingtalk') is None and not request.app.get('admin_sandbox'):
            raise web.HTTPServiceUnavailable(text='注册审批服务未配置，请联系管理员')
        _check_source(request)
        return await handler(request)
    if session is None:
        if path.startswith('/api/') or request.method not in ('GET', 'HEAD'):
            raise web.HTTPUnauthorized(text='请先登录')
        raise web.HTTPFound('/login')
    request['user'] = session['user']
    request['auth_session'] = session
    if _admin_path(path):
        require_admin(request)
    if path in TEAM_PAGES:
        require_team_leader(request)
    if _monitor_path(path):
        require_monitor(request)
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
        if key in ('enabled', 'team_leader'):
            if not isinstance(value, bool):
                raise web.HTTPBadRequest(text=f'{key} 必须为布尔值')
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
    previous_user = request.get('user')
    if previous:
        await call_store(request.app, 'logout', previous)
        if previous_user:
            await notify_access_changed(request, user_ids=[previous_user['id']])
    token = result.pop('token')
    response = web.json_response(result)
    response.set_cookie(COOKIE, token, httponly=True, secure=_secure_cookie(request), samesite='Lax', path='/')
    return response


async def register(request):
    body = await _body(request, ('username', 'display_name', 'password', 'phone'))
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


async def phone(request):
    user = require_user(request)
    body = await _body(request, ('phone',))
    updated = await call_store(request.app, 'set_phone', user['id'], body['phone'],
                               session_token=request.cookies.get(COOKIE, ''))
    return web.json_response({'user': updated})


async def online_presence(request):
    user = require_user(request)
    now = time.monotonic()
    window = request.app['online_presence_window']
    active = request.app['online_presence']
    active[user['id']] = now
    expired = [user_id for user_id, last_seen in active.items() if last_seen <= now - window]
    for user_id in expired:
        active.pop(user_id, None)
    return web.json_response({'online_users': len(active), 'window_seconds': window})


async def logout(request):
    user = require_user(request)
    await call_store(request.app, 'logout', request.cookies.get(COOKIE, ''))
    await notify_access_changed(request, user_ids=[user['id']])
    response = web.json_response({'ok': True})
    response.del_cookie(COOKIE, path='/')
    return response


async def password(request):
    user = require_user(request)
    body = await _body(request, ('current_password', 'new_password'))
    await call_store(request.app, 'change_password', user['id'], **body,
                     session_token=request.cookies.get(COOKIE, ''))
    await notify_access_changed(request, user_ids=[user['id']])
    response = web.json_response({'ok': True})
    response.del_cookie(COOKIE, path='/')
    return response


async def users(request):
    require_admin(request)
    if request.method == 'GET':
        return web.json_response({'users': await call_store(request.app, 'list_users')})
    body = await _body(request, ('username', 'password', 'role'), ('team_leader',))
    return web.json_response({'user': await admin_call(request, 'create_user', **body)}, status=201)


async def update_user(request):
    require_admin(request)
    body = await _body(request, optional=('role', 'enabled', 'team_leader'))
    if not body:
        raise web.HTTPBadRequest(text='至少提供一个修改字段')
    user = await admin_call(request, 'set_user', request.match_info['uid'], **body)
    await notify_access_changed(request, user_ids=[request.match_info['uid']])
    return web.json_response({'user': user})


async def reset_password(request):
    require_admin(request)
    body = await _body(request, ('password',))
    await admin_call(request, 'reset_password', request.match_info['uid'], body['password'])
    await notify_access_changed(request, user_ids=[request.match_info['uid']])
    return web.json_response({'ok': True})


async def teams(request):
    user = require_user(request)
    if request.method == 'GET':
        return web.json_response({'teams': await call_store(request.app, 'list_teams', user['id'])})
    body = await _body(request, ('name',))
    return web.json_response({'team': await team_call(request, 'create_team', body['name'])}, status=201)


async def team_candidates(request):
    require_team_leader(request)
    return web.json_response({'users': await team_call(request, 'list_team_candidates')})


async def team_members(request):
    body = await _body(request, ('user_id',))
    result = await team_call(request, 'add_team_member', request.match_info['tid'], body['user_id'])
    return web.json_response({'member': result}, status=201)


async def team_members_batch(request):
    if request.content_length is not None and request.content_length > 65536:
        raise web.HTTPRequestEntityTooLarge(max_size=65536, actual_size=request.content_length)
    raw = bytearray()
    async for chunk in request.content.iter_chunked(8192):
        if len(raw) + len(chunk) > 65536:
            raise web.HTTPRequestEntityTooLarge(max_size=65536, actual_size=len(raw) + len(chunk))
        raw.extend(chunk)
    try:
        body = json.loads(raw.decode('utf-8'))
    except (ValueError, UnicodeError):
        raise web.HTTPBadRequest(text='请求必须为 JSON 对象')
    if not isinstance(body, dict) or set(body) != {'user_ids'}:
        raise web.HTTPBadRequest(text='请求字段不正确')
    result = await team_call(request, 'add_team_members', request.match_info['tid'], body['user_ids'])
    return web.json_response({'members': result}, status=201)


async def delete_team_member(request):
    await team_call(request, 'remove_team_member', request.match_info['tid'], request.match_info['uid'])
    await notify_access_changed(request, user_ids=[request.match_info['uid']])
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
    await notify_access_changed(request, user_ids=[request.match_info['viewer_id']])
    return web.json_response({'ok': True})


async def global_grant(request):
    require_admin(request)
    viewer_id = request.match_info['viewer_id']
    if request.method == 'DELETE':
        await admin_call(request, 'delete_global_grant', viewer_id)
        result = {'ok': True}
    else:
        body = await _body(request, ('permission',))
        result = {'grant': await admin_call(request, 'set_global_grant', viewer_id, **body)}
    await notify_access_changed(request, user_ids=[viewer_id])
    return web.json_response(result)


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
    await notify_access_changed(
        request, project_ids=[project['project_id'] for project in projects])
    return web.json_response({'ok': True, 'count': count})


def register_auth_routes(app, web_root, *, frontend=None):
    redirect_origin = os.environ.get('CHOUKA_HTTPS_REDIRECT_ORIGIN', '')
    if not redirect_origin and os.environ.get('CHOUKA_TLS_CERT') and os.environ.get('CHOUKA_TLS_KEY'):
        redirect_origin = f"https://dinghaichouka.youku.com:{os.environ.get('CHOUKA_HTTPS_PORT', '8443')}"
    if app.get('local_test') or app.get('admin_sandbox'):
        redirect_origin = ''
    if redirect_origin:
        try:
            target = urlsplit(redirect_origin)
            if (target.scheme != 'https' or not target.hostname
                    or target.username is not None or target.password is not None
                    or target.path not in ('', '/') or target.query or target.fragment
                    or target.port == 0 or any(char.isspace() for char in redirect_origin)):
                raise ValueError('invalid HTTPS origin')
        except ValueError as exc:
            raise RuntimeError('CHOUKA_HTTPS_REDIRECT_ORIGIN 必须是完整 HTTPS 来源，不能带路径、凭据、查询或片段') from exc
    app['https_redirect_origin'] = redirect_origin.rstrip('/')
    app['_auth_login_limits'] = OrderedDict()
    app['_auth_register_limits'] = OrderedDict()
    app['_auth_hash_slots'] = asyncio.Semaphore(2)
    root = Path(web_root)

    async def login_page(request):
        return web.FileResponse(frontend.index if frontend else root / 'login.html')

    async def login_redirect(request):
        raise web.HTTPFound('/login')

    async def auth_script(request):
        return web.FileResponse(root / 'auth.js')

    async def public_asset(request):
        # 白名单内的公共静态资源（图标等）；根目录静态兜底已移除，必须有显式路由。
        name = request.path.lstrip('/')
        if request.path not in AUTH_ASSETS:
            raise web.HTTPNotFound()
        return web.FileResponse(root / name, headers={'Content-Type': AUTH_ASSETS[request.path]})

    app.router.add_get('/login', login_page)
    app.router.add_get('/login.html', login_redirect if frontend else login_page)
    app.router.add_get('/auth.js', auth_script)
    for asset in AUTH_ASSETS:
        if frontend is None or asset.lstrip('/') not in PUBLIC_FILES:
            app.router.add_get(asset, public_asset)
    if frontend is not None:
        register_frontend_assets(app, frontend)
    app.router.add_get('/api/auth/me', me)
    app.router.add_post('/api/auth/presence', online_presence)
    app.router.add_post('/api/auth/login', login)
    app.router.add_post('/api/auth/register', register)
    app.router.add_post('/api/auth/logout', logout)
    app.router.add_post('/api/auth/password', password)
    app.router.add_post('/api/auth/phone', phone)
    app.router.add_get('/api/teams', teams)
    app.router.add_post('/api/teams', teams)
    app.router.add_get('/api/team-candidates', team_candidates)
    app.router.add_post('/api/teams/{tid}/members', team_members)
    app.router.add_post('/api/teams/{tid}/members/batch', team_members_batch)
    app.router.add_delete('/api/teams/{tid}/members/{uid}', delete_team_member)
    app.router.add_get('/api/admin/registrations', registrations)
    app.router.add_post('/api/admin/projects/assign', assign_projects)
    app.router.add_get('/api/admin/users', users)
    app.router.add_post('/api/admin/users', users)
    app.router.add_patch('/api/admin/users/{uid}', update_user)
    app.router.add_post('/api/admin/users/{uid}/password', reset_password)
    app.router.add_get('/api/admin/grants', grants)
    app.router.add_put('/api/admin/grants', grants)
    app.router.add_delete('/api/admin/grants/{viewer_id}/{owner_id}', delete_grant)
    app.router.add_put('/api/admin/global-grants/{viewer_id}', global_grant)
    app.router.add_delete('/api/admin/global-grants/{viewer_id}', global_grant)
