"""定海身份认证、短时绑定确认与本站 HttpOnly 会话。"""
import asyncio
import hashlib
import json
import os
from urllib.parse import urlsplit

import aiohttp
from aiohttp import web

from .auth import (COOKIE, _body, _rate_limit, _secure_cookie, call_store,
                   notify_access_changed)
from .auth_store import AuthError

PENDING_COOKIE = 'chouka_dinghai_binding'
PENDING_PATH = '/api/auth'
LOGIN_CONFIG_PATH = '/api/auth/login-config'
PUBLIC_POST_PATHS = frozenset({
    '/api/auth/dinghai/login', '/api/auth/dinghai/bind', '/api/auth/dinghai/cancel',
})


def validate_origin(value):
    if not value:
        return ''
    try:
        url = urlsplit(value)
        if (url.scheme != 'https' or not url.hostname or url.username is not None
                or url.password is not None or url.path not in ('', '/')
                or url.query or url.fragment or url.port == 0
                or any(character.isspace() or ord(character) < 32 for character in value)):
            raise ValueError('invalid origin')
        return value.rstrip('/')
    except ValueError as exc:
        raise RuntimeError('CHOUKA_DINGHAI_API_BASE 必须是不带路径或凭据的 HTTPS 来源') from exc


async def _post(session, origin, path, body, token=None):
    headers = {'Accept': 'application/json'}
    if token:
        headers['satoken'] = token
    try:
        async with session.post(origin + path, json=body, headers=headers,
                                allow_redirects=False) as response:
            if response.status in (401, 403):
                raise AuthError('定海登录失败，请检查账号密码或登录状态', 401)
            if response.status == 429:
                raise AuthError('定海请求过于频繁，请稍后重试', 429)
            if response.status != 200:
                raise AuthError('定海服务暂不可用，请稍后重试', 502)
            payload = bytearray()
            async for chunk in response.content.iter_chunked(8192):
                payload.extend(chunk)
                if len(payload) > 65536:
                    raise AuthError('定海身份响应格式不正确', 502)
            try:
                data = json.loads(payload)
            except (ValueError, UnicodeError) as exc:
                raise AuthError('定海身份响应格式不正确', 502) from exc
            if not isinstance(data, dict) or data.get('success') is not True:
                raise AuthError('定海认证失败，请检查账号或联系管理员', 401)
            result = data.get('result')
            if not isinstance(result, dict):
                raise AuthError('定海身份响应格式不正确', 502)
            return result
    except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
        raise AuthError('无法连接定海服务，请稍后重试', 502) from exc


async def authenticate(origin, account, password):
    # 沿用定海现有 WEB/MD5 登录协议；不持久化密码或上游 satoken。
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=20),
                                     cookie_jar=aiohttp.DummyCookieJar()) as session:
        login = await _post(session, origin, '/api/user/login/v2', {
            'account': account, 'password': hashlib.md5(password.encode('utf-8')).hexdigest(),
            'device': 'WEB',
        })
        info = login.get('loginInfo')
        token = info.get('authToken') if isinstance(info, dict) else None
        if (not isinstance(token, str) or not token or len(token) > 3500
                or not token.isascii() or any(ord(char) < 33 or ord(char) == 127 for char in token)):
            raise AuthError('定海登录未返回有效凭证', 502)
        current = await _post(session, origin, '/api/user/current', {}, token)
    uid = current.get('id')
    if (isinstance(uid, bool) or not isinstance(uid, (str, int))
            or not str(uid).isascii() or not str(uid).isdigit()
            or len(str(uid)) > 20 or int(uid) <= 0):
        raise AuthError('定海未返回有效用户身份', 502)
    name = next((value.strip() for value in (current.get('name'), current.get('nickName'),
                                           current.get('account'))
                 if isinstance(value, str) and value.strip()), '定海用户')
    if any(ord(char) < 32 for char in name):
        raise AuthError('定海用户信息格式不正确', 502)
    return {'subject': str(int(uid)), 'display_name': name[:64]}


async def login_config(request):
    return web.json_response({'dinghai_enabled': bool(request.app['dinghai_auth_origin'])})


def _require_enabled(request):
    origin = request.app['dinghai_auth_origin']
    if not origin:
        raise web.HTTPServiceUnavailable(text='定海登录尚未配置，请使用本地账号登录')
    return origin


async def _replace_session(request, result):
    previous = request.cookies.get(COOKIE)
    if previous:
        old = await call_store(request.app, 'get_session', previous)
        await call_store(request.app, 'logout', previous)
        if old:
            await notify_access_changed(request, user_ids=[old['user']['id']])
    data = dict(result)
    token = data.pop('token', None)
    pending = data.pop('binding_token', None)
    response = web.json_response(data)
    if token:
        response.set_cookie(COOKIE, token, httponly=True, secure=_secure_cookie(request),
                            samesite='Lax', path='/')
        response.del_cookie(PENDING_COOKIE, path=PENDING_PATH)
    else:
        response.del_cookie(COOKIE, path='/')
        response.set_cookie(PENDING_COOKIE, pending, httponly=True, secure=_secure_cookie(request),
                            samesite='Strict', path=PENDING_PATH, max_age=300)
    return response


async def login(request):
    origin = _require_enabled(request)
    body = await _body(request, ('account', 'password'))
    account = body['account'].strip()
    password = body['password']
    if not account or len(account) > 128 or not password or len(password) > 1024:
        raise web.HTTPBadRequest(text='请输入有效的定海账号和密码')
    _rate_limit(request, 'dinghai:' + account)
    await call_store(request.app, 'dinghai_discard_pending', request.cookies.get(PENDING_COOKIE, ''))
    async with request.app['_dinghai_login_slots']:
        identity = await authenticate(origin, account, password)
    result = await call_store(request.app, 'dinghai_login', origin, **identity)
    return await _replace_session(request, result)


async def bind(request):
    origin = _require_enabled(request)
    body = await _body(request, ('username', 'password'))
    _rate_limit(request, body['username'])
    pending = request.cookies.get(PENDING_COOKIE, '')
    result = await call_store(request.app, 'dinghai_bind', pending,
                              request.headers.get('X-Binding-CSRF', ''), origin, **body)
    return await _replace_session(request, result)


async def cancel(request):
    _require_enabled(request)
    await _body(request)
    try:
        await call_store(request.app, 'dinghai_cancel',
                         request.cookies.get(PENDING_COOKIE, ''),
                         request.headers.get('X-Binding-CSRF', ''))
    except AuthError as exc:
        # 过期或已经消费的待绑定状态可以安全取消，但不接受错误的 CSRF。
        if exc.status != 410:
            raise
    response = web.json_response({'ok': True})
    response.del_cookie(PENDING_COOKIE, path=PENDING_PATH)
    return response


def register_dinghai_auth_routes(app):
    value = '' if app.get('local_test') or app.get('admin_sandbox') else os.environ.get('CHOUKA_DINGHAI_API_BASE', '').strip()
    app['dinghai_auth_origin'] = validate_origin(value)
    app['_dinghai_login_slots'] = asyncio.Semaphore(4)
    app.router.add_get(LOGIN_CONFIG_PATH, login_config)
    app.router.add_post('/api/auth/dinghai/login', login)
    app.router.add_post('/api/auth/dinghai/bind', bind)
    app.router.add_post('/api/auth/dinghai/cancel', cancel)
