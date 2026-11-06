"""Exact, read-only Dinghai proxy. Local authorization remains in auth_middleware."""
import asyncio
import json

import aiohttp
from aiohttp import web

from .auth import COOKIE, call_store
from .dinghai_sessions import (DinghaiContext, auth_required, current_context,
                               require_dinghai as _require_dinghai)

MAX_REQUEST = 16384
MAX_RESPONSE = 4 * 1024 * 1024
REQUEST_TIMEOUT = 20
SOURCES = frozenset(('EPISODE', 'ACT', 'SEQUENCE', 'CAMERA', 'ASSET', 'PROJECT'))
# Required, optional fields; paths are server-owned and never taken from a URL parameter.
READ_CONTRACTS = {
    '/api/project/pageQuery': ({'pageNum', 'pageSize'}, {'status'}),
    '/api/project/queryZhaiXingFilter': ({'projectId', 'sourceType'}, set()),
    '/api/user/current': (set(), set()),
    '/api/task/queryTaskForZhaiXing': (
        {'projectId', 'sourceType', 'pageNum', 'pageSize'},
        {'episodeIdList', 'actIdList', 'assetTypeIdList', 'statusList',
         'processNodeNameList', 'userIdList', 'searchWord'}),
    '/api/processNode/queryProcessNodeInfo': ({'processNodeId'}, set()),
    '/api/processNode/file/queryFileGroup': ({'processNodeId'}, set()),
    '/api/processNode/file/queryFileGroupFilesV2': (
        {'processNodeId', 'groupId'}, {'includeChildren', 'includeHistory'}),
    '/api/processNode/file/queryCameraFileBox': (
        {'processNodeId', 'groupId'}, {'includeChildren', 'includeHistory'}),
}
# Dinghai ResultCode.java: 1009 NOT_LOGIN, 1003 AUTHENTICATION_FAILED.
# Other failures (including UNAUTHORIZED_ACCESS) are business denials, not logout.
AUTH_CODES = frozenset(('1009', '1003', '401', 'NOT_LOGIN', 'TOKEN_EXPIRED',
                        'INVALID_TOKEN', 'NOT_LOGGED_IN'))


def _error(status, code, message):
    cls = {400: web.HTTPBadRequest, 403: web.HTTPForbidden, 429: web.HTTPTooManyRequests,
           502: web.HTTPBadGateway, 504: web.HTTPGatewayTimeout}[status]
    return cls(text=json.dumps({'error': message, 'code': code}, ensure_ascii=False),
               content_type='application/json')


def _id(value):
    if isinstance(value, str):
        return (value.isascii() and value.isdigit() and 1 <= len(value) <= 19
                and 0 < int(value) <= 9223372036854775807)
    return type(value) is int and 0 < value <= 9223372036854775807


def _text(value, maximum=256):
    return (isinstance(value, str) and len(value) <= maximum
            and not any(ord(char) < 32 for char in value))


def validate_body(path, body):
    # Only trusted server modules can call this STS contract. Never register it as
    # a browser route or allow client-supplied project/object signing requests.
    if path == '/api/file/oss/file':
        if (not isinstance(body, dict) or set(body) != {'projectCode', 'ossFileList'}
                or body['projectCode'] != '' or body['ossFileList'] != []):
            raise _error(400, 'dinghai_invalid_request', '定海请求字段不正确')
        return body
    if path not in READ_CONTRACTS:
        raise web.HTTPNotFound()
    required, optional = READ_CONTRACTS[path]
    valid = isinstance(body, dict) and required <= body.keys() and not body.keys() - required - optional
    if valid:
        for key, value in body.items():
            if key in ('pageNum', 'pageSize'):
                valid = type(value) is int and 1 <= value <= (100 if key == 'pageSize' else 100000)
            elif key in ('projectId', 'processNodeId', 'groupId'):
                valid = _id(value)
            elif key == 'sourceType':
                valid = isinstance(value, str) and value in SOURCES
            elif key in ('includeChildren', 'includeHistory'):
                valid = type(value) is bool
            elif key.endswith('IdList'):
                valid = isinstance(value, list) and len(value) <= 100 and all(_id(v) for v in value)
            elif key.endswith('List'):
                valid = (isinstance(value, list) and len(value) <= 100
                         and all(_text(v, 128) and v for v in value))
            else:
                valid = _text(value)
            if not valid:
                break
    if not valid:
        raise _error(400, 'dinghai_invalid_request', '定海请求字段不正确')
    try:
        size = len(json.dumps(body, allow_nan=False).encode('utf-8'))
    except (ValueError, TypeError, RecursionError):
        raise _error(400, 'dinghai_invalid_request', '定海请求格式不正确') from None
    if size > MAX_REQUEST:
        raise web.HTTPRequestEntityTooLarge(max_size=MAX_REQUEST, actual_size=size)
    return body


async def _body(request):
    if request.content_type != 'application/json':
        raise _error(400, 'dinghai_invalid_request', '请求必须为 JSON 对象')
    raw = bytearray()
    async for chunk in request.content.iter_chunked(4096):
        raw.extend(chunk)
        if len(raw) > MAX_REQUEST:
            raise web.HTTPRequestEntityTooLarge(max_size=MAX_REQUEST, actual_size=len(raw))
    try:
        return json.loads(raw)
    except (ValueError, UnicodeError, RecursionError):
        raise _error(400, 'dinghai_invalid_request', '请求必须为 JSON 对象') from None


def _invalidate(request):
    request.app['dinghai_credentials'].discard('sessions', request.cookies.get(COOKIE, ''))
    raise auth_required()


async def require_dinghai(request: web.Request) -> DinghaiContext:
    # Recheck after semaphore waits and upstream I/O, including concurrent logout/disable.
    context = _require_dinghai(request)
    session = await call_store(request.app, 'get_session', request.cookies.get(COOKIE, ''))
    if (not session or session['user']['id'] != request['user']['id']
            or session['user']['role'] == 'monitor'):
        _invalidate(request)
    if _require_dinghai(request) is not context:
        _invalidate(request)
    return context


def _safe_result(result, token, *, server_only=False):
    # Native result shapes are preserved, but credentials must never escape even
    # if an upstream endpoint accidentally returns login metadata or echoes a token.
    if isinstance(result, dict):
        for key, value in result.items():
            name = key.lower().replace('_', '').replace('-', '')
            if name in {'token', 'satoken', 'authtoken', 'accesstoken', 'refreshtoken',
                        'password', 'passwordhash'}:
                return False
            if not server_only and name in {'accesskeyid', 'accesskeysecret', 'securitytoken'}:
                return False
            if (not _safe_result(key, token, server_only=server_only)
                    or not _safe_result(value, token, server_only=server_only)):
                return False
    elif isinstance(result, list):
        return all(_safe_result(value, token, server_only=server_only) for value in result)
    elif isinstance(result, str) and token in result:
        return False
    return True


async def _send(request, path, body):
    async with request.app['_dinghai_api_slots']:
        context = await require_dinghai(request)
        # TLS verification defaults remain enabled; no ambient proxy or upstream cookies.
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT),
                                         cookie_jar=aiohttp.DummyCookieJar(), trust_env=False) as session:
            async with session.post(context.issuer + path, json=body,
                                    headers={'Accept': 'application/json', 'satoken': context.token},
                                    allow_redirects=False, ssl=True) as response:
                if response.status == 401:
                    _invalidate(request)
                if response.status == 429:
                    raise _error(429, 'dinghai_rate_limited', '定海请求过于频繁，请稍后重试')
                if response.status not in (200, 403):
                    raise _error(502, 'dinghai_upstream_error', '定海服务暂不可用')
                raw = bytearray()
                async for chunk in response.content.iter_chunked(8192):
                    raw.extend(chunk)
                    if len(raw) > MAX_RESPONSE:
                        raise _error(502, 'dinghai_invalid_response', '定海响应超出大小限制')
                try:
                    data = json.loads(raw)
                    if response.status == 403:
                        if (isinstance(data, dict) and data.get('success') is False
                                and str(data.get('code')) in AUTH_CODES):
                            _invalidate(request)
                        raise _error(403, 'dinghai_business_denied', '定海拒绝访问该资源')
                    if not isinstance(data, dict) or type(data.get('success')) is not bool:
                        raise ValueError()
                    if data['success'] is False:
                        if str(data.get('code')) in AUTH_CODES:
                            _invalidate(request)
                        raise _error(403, 'dinghai_business_denied', '定海拒绝该业务请求')
                    result = data['result']
                    if (result is not None and not isinstance(result, (dict, list))):
                        raise ValueError()
                    if not _safe_result(result, context.token, server_only=path == '/api/file/oss/file'):
                        raise ValueError()
                    # Reject NaN/Infinity even though Python's JSON decoder accepts them.
                    json.dumps(result, allow_nan=False)
                except (ValueError, KeyError, UnicodeError, RecursionError):
                    if response.status == 403:
                        raise _error(403, 'dinghai_business_denied', '定海拒绝访问该资源') from None
                    raise _error(502, 'dinghai_invalid_response', '定海响应格式不正确') from None
        await require_dinghai(request)
        return result


async def _cancel_on_disconnect(request, task):
    transport = request.transport
    while True:
        if transport is None or transport.is_closing() is True:
            task.cancel()
            return
        await asyncio.sleep(0.25)


async def upstream_post(request: web.Request, path: str, body: dict):
    """Return native result (dict/list/None); path must be an exact /api/... contract.

    Server-only reusable transport. Call behind auth_middleware; never return the
    DinghaiContext to a client. Cancellation propagates and closes upstream I/O.
    """
    _require_dinghai(request)
    validate_body(path, body)
    watcher = asyncio.create_task(_cancel_on_disconnect(request, asyncio.current_task()))
    try:
        return await asyncio.wait_for(_send(request, path, body), REQUEST_TIMEOUT)
    except asyncio.TimeoutError:
        raise _error(504, 'dinghai_timeout', '定海请求超时，请稍后重试') from None
    except aiohttp.ClientError:
        raise _error(502, 'dinghai_upstream_error', '无法连接定海服务，请稍后重试') from None
    finally:
        watcher.cancel()
        await asyncio.gather(watcher, return_exceptions=True)


async def session_status(request):
    if request.rel_url.raw_path != '/api/dinghai/session' or request.query_string:
        raise web.HTTPNotFound()
    return web.json_response({'authenticated': current_context(request) is not None})


def register_dinghai_api_routes(app):
    app['_dinghai_api_slots'] = asyncio.Semaphore(8)
    app.router.add_get('/api/dinghai/session', session_status)
    for path in READ_CONTRACTS:
        local_path = '/api/dinghai' + path[4:]
        async def proxy(request, upstream_path=path, exact_path=local_path):
            if request.rel_url.raw_path != exact_path or request.query_string:
                raise web.HTTPNotFound()
            _require_dinghai(request)
            result = await upstream_post(request, upstream_path, await _body(request))
            return web.json_response(result)
        app.router.add_post(local_path, proxy)
