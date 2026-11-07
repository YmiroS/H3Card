"""Authorized, same-origin Dinghai media streaming; signed URLs never leave the server."""
import asyncio
import base64
import hashlib
import hmac
import ipaddress
import json
import re
import socket
import time
import tempfile
from pathlib import Path
from urllib.parse import quote, unquote, urlencode, urlsplit

import aiohttp
from aiohttp import web
from aiohttp.resolver import ThreadedResolver
from yarl import URL

from .dinghai_api import require_dinghai, upstream_post

MAX_BYTES = 512 * 1024 * 1024
MAX_CONCURRENT = 8
QUEUE_TIMEOUT = 3
REQUEST_TIMEOUT = 180
THUMB_PROCESSES = {
    'image': 'image/resize,h_120,m_lfit',
    'video': 'video/snapshot,t_0,f_jpg,w_240',
}
_SLOTS = web.AppKey('dinghai_media_slots', asyncio.Semaphore)
_PREVIEWS = web.AppKey('dinghai_video_previews', object)
_BASE = '/api/processNode/file/'


def _error(status, code, message):
    cls = {400: web.HTTPBadRequest, 403: web.HTTPForbidden,
           404: web.HTTPNotFound, 409: web.HTTPConflict,
           413: web.HTTPRequestEntityTooLarge, 416: web.HTTPRequestRangeNotSatisfiable,
           429: web.HTTPTooManyRequests, 502: web.HTTPBadGateway,
           504: web.HTTPGatewayTimeout}[status]
    kwargs = {'text': json.dumps({'code': code, 'error': message}, ensure_ascii=False),
              'content_type': 'application/json', 'headers': {'Cache-Control': 'no-store'}}
    if status == 413:
        kwargs.update(max_size=MAX_BYTES, actual_size=MAX_BYTES + 1)
    error = cls(**kwargs)
    error._dinghai_media_safe = True
    return error


def _invalid_response():
    return _error(502, 'dinghai_media_invalid_response', '定海媒体响应不正确')


def parse_query(query):
    required = {'processNodeId', 'groupId', 'fileId', 'camera', 'history'}
    allowed = required | {'versionId', 'thumbnail', 'preview'}
    if not required <= query.keys() or set(query) - allowed:
        raise _error(400, 'dinghai_media_invalid_request', '定海媒体参数不正确')
    result = {}
    for key in query:
        if len(query.getall(key)) != 1:
            raise _error(400, 'dinghai_media_invalid_request', '不允许重复参数')
        value = query[key]
        if key in ('camera', 'history'):
            if value not in ('0', '1'):
                raise _error(400, 'dinghai_media_invalid_request', '开关参数必须为 0 或 1')
            result[key] = value == '1'
        elif key == 'preview':
            if value != '1' or 'thumbnail' in query:
                raise _error(400, 'dinghai_media_invalid_request', '视频预览参数不正确')
            result[key] = True
        elif key == 'thumbnail':
            if value not in THUMB_PROCESSES:
                raise _error(400, 'dinghai_media_invalid_request', '缩略图类型不正确')
            result[key] = value
        else:
            if not re.fullmatch(r'[1-9][0-9]{0,18}', value) or int(value) > 9223372036854775807:
                raise _error(400, 'dinghai_media_invalid_request', '资源 ID 必须为正整数')
            result[key] = int(value)
    return result


def _same_id(value, expected):
    return type(value) is int and value == expected


def select_file(tree, file_id, version_id=None, *, history=False):
    """Match resource identity, then version *record* identity; never pick first/latest."""
    if not isinstance(tree, list):
        raise _invalid_response()
    stack = [('tree', item) for item in tree]
    matches = []
    visited = 0
    while stack:
        kind, item = stack.pop()
        visited += 1
        if visited > 100000 or not isinstance(item, dict):
            raise _invalid_response()
        children = item.get('children') or []
        if not isinstance(children, list):
            raise _invalid_response()
        stack.extend((kind, child) for child in children)
        if kind == 'tree':
            boxes = item.get('fileBoxList') or []
            if not isinstance(boxes, list):
                raise _invalid_response()
            for box in boxes:
                if not isinstance(box, dict):
                    raise _invalid_response()
                resource = box.get('ftpResource')
                if resource is not None:
                    stack.append(('resource', resource))
            continue
        if item.get('isFile') is not True or not _same_id(item.get('id'), file_id):
            continue
        attributes = item.get('attributes') or {}
        version = item.get('ftpResourceRelationVersion') or {}
        if not isinstance(attributes, dict) or not isinstance(version, dict):
            raise _invalid_response()
        if attributes.get('markDelete') is True:
            continue
        if not history and version.get('isOld') is True:
            continue
        if version_id is not None and not _same_id(version.get('id'), version_id):
            continue
        if version.get('ftpResourceId') is not None and not _same_id(version['ftpResourceId'], file_id):
            raise _invalid_response()
        matches.append(item)
    if not matches:
        raise _error(404, 'dinghai_media_not_found', '未找到指定文件或版本')
    if len(matches) != 1:
        raise _error(409, 'dinghai_media_ambiguous', '文件或版本不唯一，请指定准确版本')
    return matches[0]


def normalize_object_key(value):
    """OSS keys are raw strings (not URLs). Encode once for transport, not signing."""
    if not isinstance(value, str) or not value or len(value.encode('utf-8')) > 1024:
        raise _invalid_response()
    # ali-oss accepts one leading slash; do not collapse any other path components.
    key = value[1:] if value.startswith('/') and not value.startswith('//') else value
    decoded = key
    for _ in range(8):
        if (not decoded or decoded.startswith('/') or '\\' in decoded or ':' in decoded
                or any(ord(c) < 32 or ord(c) == 127 for c in decoded)
                or any(part in ('', '.', '..') for part in decoded.split('/'))):
            raise _invalid_response()
        next_value = unquote(decoded, errors='strict')
        if next_value == decoded:
            return key
        decoded = next_value
    raise _invalid_response()


def _trusted_hostname(host):
    if not isinstance(host, str) or len(host) > 253 or not re.fullmatch(r'[a-z0-9.-]+', host):
        return False
    if any(not label or len(label) > 63 or label.startswith('-') or label.endswith('-')
           for label in host.split('.')):
        return False
    # No general aliyuncs allowlist: only OSS public endpoints, or Youku media domains.
    return (host.endswith('.youku.com')
            or re.fullmatch(r'(?:[a-z0-9-]+\.)?oss-[a-z0-9-]+\.aliyuncs\.com', host) is not None)


def oss_origin(config):
    if not isinstance(config, dict):
        raise _invalid_response()
    bucket, endpoint = config.get('bucket'), config.get('endpoint')
    if (not isinstance(bucket, str) or not re.fullmatch(r'[a-z0-9][a-z0-9-]{1,61}[a-z0-9]', bucket)
            or not isinstance(endpoint, str) or endpoint != endpoint.strip()):
        raise _invalid_response()
    parsed = urlsplit(endpoint if '://' in endpoint else 'https://' + endpoint)
    host = parsed.hostname
    if (parsed.scheme != 'https' or parsed.username is not None or parsed.password is not None
            or parsed.netloc != host or parsed.path not in ('', '/')
            or parsed.query or parsed.fragment or not _trusted_hostname(host)):
        raise _error(502, 'dinghai_media_unsafe_origin', '定海媒体来源不可信')
    if host.endswith('.aliyuncs.com') and not host.startswith(bucket + '.'):
        # A bucket-qualified endpoint for a different bucket must not be rewritten.
        if not host.startswith('oss-'):
            raise _invalid_response()
        host = bucket + '.' + host
    return 'https://' + host


def canonical_get(bucket, key, expires, security_token, process=None):
    """OSS V1 uses UNESCAPED sorted subresource values in the canonical resource."""
    params = {'security-token': security_token}
    if process:
        params['x-oss-process'] = process
    resource = '/' + bucket + '/' + key
    resource += '?' + '&'.join(name + '=' + params[name] for name in sorted(params))
    return 'GET\n\n\n' + str(expires) + '\n' + resource


def presign_get(oss_params, key, process=None, *, now=None):
    if not isinstance(oss_params, dict):
        raise _invalid_response()
    config = oss_params.get('ossConfig')
    origin = oss_origin(config)
    role = oss_params.get('assumeRole')
    if not isinstance(role, dict):
        raise _invalid_response()
    values = [role.get(name) for name in ('accessKeyId', 'accessKeySecret', 'securityToken')]
    if any(not isinstance(v, str) or not v or len(v) > 16384
           or any(ord(c) < 32 or ord(c) == 127 for c in v) for v in values):
        raise _invalid_response()
    if process is not None and process not in THUMB_PROCESSES.values():
        raise _invalid_response()
    access_key, secret, token = values
    key = normalize_object_key(key)
    expires = int(time.time() if now is None else now) + 300
    canonical = canonical_get(config['bucket'], key, expires, token, process)
    signature = base64.b64encode(hmac.new(secret.encode(), canonical.encode(), hashlib.sha1).digest()).decode('ascii')
    params = {'OSSAccessKeyId': access_key, 'Expires': str(expires),
              'Signature': signature, 'security-token': token}
    if process:
        params['x-oss-process'] = process
    # encoded=True prevents yarl from normalizing the signed object key or query.
    return URL(origin + '/' + quote(key, safe='/') + '?' + urlencode(params, quote_via=quote), encoded=True)


class PublicOSSResolver(ThreadedResolver):
    """Validate the actual addresses used by the connector, preventing DNS rebinding."""
    async def resolve(self, host, port=0, family=socket.AF_INET):
        if port != 443 or not _trusted_hostname(host):
            raise OSError('Untrusted media origin')
        records = await super().resolve(host, port, family)
        if not records:
            raise OSError('No media address')
        for record in records:
            address = ipaddress.ip_address(record['host'])
            if not address.is_global or address.is_multicast:
                raise OSError('Non-public media address')
        return records


def parse_range(value):
    if value is None:
        return None
    match = re.fullmatch(r'bytes=([0-9]{0,19})-([0-9]{0,19})', value)
    if not match or not any(match.groups()):
        raise _error(416, 'dinghai_media_invalid_range', '仅支持单段字节范围')
    start, end = match.groups()
    if ((start and int(start) >= MAX_BYTES) or (end and int(end) >= MAX_BYTES)
            or (not start and int(end) == 0)
            or (start and end and int(start) > int(end))):
        raise _error(416, 'dinghai_media_invalid_range', '字节范围超出限制')
    return value


def response_headers(response, requested_range):
    if response.status in (401, 403):
        raise _error(403, 'dinghai_media_denied', '定海媒体授权已失效或无权访问')
    if response.status == 404:
        raise _error(404, 'dinghai_media_not_found', '未找到指定媒体')
    if response.status == 416:
        raise _error(416, 'dinghai_media_invalid_range', '媒体字节范围不可用')
    if response.status not in (200, 206):
        # Never reflect redirects, signed URLs, OSS error bodies, cookies or diagnostics.
        raise _invalid_response()
    mime = response.headers.get('Content-Type', '').split(';', 1)[0].strip().lower()
    if not re.fullmatch(r'(?:image|video)/[a-z0-9!#$&^_.+-]+', mime):
        raise _invalid_response()
    if response.headers.get('Content-Encoding', 'identity').lower() != 'identity':
        raise _invalid_response()
    headers = {'Content-Type': mime, 'Cache-Control': 'private, no-store',
               'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
               'Content-Security-Policy': "default-src 'none'; sandbox"}
    size = response.headers.get('Content-Length')
    if size is not None:
        if not re.fullmatch(r'[0-9]{1,12}', size):
            raise _invalid_response()
        if int(size) > MAX_BYTES:
            raise _error(413, 'dinghai_media_too_large', '媒体超出大小限制')
        headers['Content-Length'] = str(int(size))
    if response.status == 206:
        content_range = response.headers.get('Content-Range', '')
        match = re.fullmatch(r'bytes ([0-9]{1,12})-([0-9]{1,12})/([0-9]{1,12})', content_range)
        if not requested_range or not match:
            raise _invalid_response()
        start, end, total = map(int, match.groups())
        if not 0 <= start <= end < total or (size is not None and int(size) != end - start + 1):
            raise _invalid_response()
        if total > MAX_BYTES:
            raise _error(413, 'dinghai_media_too_large', '媒体超出大小限制')
        requested_start, requested_end = requested_range[6:].split('-')
        expected_start = int(requested_start) if requested_start else max(0, total - int(requested_end))
        expected_end = min(int(requested_end), total - 1) if requested_start and requested_end else total - 1
        if (start, end) != (expected_start, expected_end):
            raise _invalid_response()
        headers['Content-Range'] = content_range
        headers['Content-Length'] = str(end - start + 1)
    elif 'Content-Range' in response.headers:
        raise _invalid_response()
    if response.headers.get('Accept-Ranges', '').lower() in ('bytes', 'none'):
        headers['Accept-Ranges'] = response.headers['Accept-Ranges'].lower()
    return headers


async def _authorized_url(request, params):
    await require_dinghai(request)
    groups = await upstream_post(request, _BASE + 'queryFileGroup', {'processNodeId': params['processNodeId']})
    if not isinstance(groups, list):
        raise _invalid_response()
    matching = [g for g in groups if isinstance(g, dict) and _same_id(g.get('groupId'), params['groupId'])]
    # Native DTO always emits a boolean. Missing/coerced values must not grant access.
    if len(matching) != 1 or matching[0].get('canDownload') is not True:
        raise _error(403, 'dinghai_media_denied', '无权访问该定海文件组')
    endpoint = 'queryCameraFileBox' if params['camera'] else 'queryFileGroupFilesV2'
    tree = await upstream_post(request, _BASE + endpoint, {
        'processNodeId': params['processNodeId'], 'groupId': params['groupId'],
        'includeChildren': True, 'includeHistory': params['history'],
    })
    resource = select_file(tree, params['fileId'], params.get('versionId'), history=params['history'])
    attributes = resource.get('attributes') or {}
    size = attributes.get('size')
    if size is not None and (type(size) not in (int, float) or not 0 <= size <= MAX_BYTES):
        raise _error(413, 'dinghai_media_too_large', '媒体超出大小限制')
    key = normalize_object_key(attributes.get('ossPath'))
    thumbnail = params.get('thumbnail')
    if params.get('preview') and resource.get('type', '').upper() != 'VIDEO':
        raise _error(400, 'dinghai_media_invalid_request', '仅视频支持兼容预览')
    if thumbnail and resource.get('type', '').upper() != thumbnail.upper():
        raise _error(400, 'dinghai_media_invalid_request', '缩略图类型与文件类型不匹配')
    result = await upstream_post(request, '/api/file/oss/file', {'projectCode': '', 'ossFileList': []})
    if not isinstance(result, dict):
        raise _invalid_response()
    await require_dinghai(request)
    return presign_get(result.get('ossParam'), key, THUMB_PROCESSES.get(thumbnail))


async def _stream(request, url, requested_range):
    headers = {'Accept': 'image/*,video/*', 'Accept-Encoding': 'identity'}
    if requested_range:
        headers['Range'] = requested_range
    connector = aiohttp.TCPConnector(resolver=PublicOSSResolver(), limit=1, use_dns_cache=False)
    timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT, connect=10, sock_read=30)
    downstream = None
    try:
        async with aiohttp.ClientSession(connector=connector, timeout=timeout,
                                         cookie_jar=aiohttp.DummyCookieJar(), trust_env=False,
                                         auto_decompress=False) as session:
            # Always GET, even for client HEAD, because the URL is signed for GET.
            async with session.get(url, headers=headers, allow_redirects=False, ssl=True) as upstream:
                outgoing = response_headers(upstream, requested_range)
                downstream = web.StreamResponse(status=upstream.status, headers=outgoing)
                await downstream.prepare(request)
                if request.method == 'HEAD':
                    upstream.close()
                    await downstream.write_eof()
                    return downstream
                received = 0
                async for chunk in upstream.content.iter_chunked(64 * 1024):
                    received += len(chunk)
                    if received > MAX_BYTES:
                        raise _error(413, 'dinghai_media_too_large', '媒体超出大小限制')
                    await downstream.write(chunk)
                await downstream.write_eof()
                return downstream
    except asyncio.CancelledError:
        if downstream is not None and downstream.prepared:
            downstream.force_close()
            if request.transport:
                request.transport.close()
        raise
    except Exception:
        if downstream is None or not downstream.prepared:
            raise
        # Headers may already be on the wire: terminate, don't append JSON to media
        # or log aiohttp exceptions (their repr can contain the signed URL).
        downstream.force_close()
        if request.transport:
            request.transport.close()
        return downstream


async def _stream_preview(request, target):
    size = target.stat().st_size
    start, stop, status = 0, size, 200
    if 'Range' in request.headers and 'If-Range' not in request.headers:
        requested = request.http_range
        if requested.start is not None:
            start = max(0, size + requested.start) if requested.start < 0 else requested.start
            stop = min(size, requested.stop) if requested.stop is not None else size
            if start >= size or stop <= start:
                raise _error(416, 'dinghai_media_invalid_range', '媒体字节范围不可用')
            status = 206
    headers = {
        'Content-Type': 'video/mp4', 'Content-Length': str(stop - start),
        'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'; sandbox",
    }
    if status == 206:
        headers['Content-Range'] = f'bytes {start}-{stop - 1}/{size}'
    downstream = web.StreamResponse(status=status, headers=headers)
    try:
        # Own the handle through the whole transfer; close synchronously before releasing the cache lock.
        with target.open('rb') as source:
            source.seek(start)
            await downstream.prepare(request)
            if request.method != 'HEAD':
                remaining = stop - start
                while remaining:
                    chunk = source.read(min(64 * 1024, remaining))
                    if not chunk:
                        raise OSError('Incomplete compatibility preview')
                    await downstream.write(chunk)
                    remaining -= len(chunk)
            await downstream.write_eof()
        return downstream
    except (Exception, asyncio.CancelledError):
        if not downstream.prepared:
            raise
        # A timeout after headers must not append a second HTTP/JSON response to the MP4.
        downstream.force_close()
        if request.transport:
            request.transport.close()
        return downstream


class DinghaiVideoPreviews:
    """Private, bounded process-lifetime cache; authorization is checked before every use."""

    def __init__(self):
        self.directory = None
        self.entries = {}
        self.lock = asyncio.Lock()

    async def download(self, url, target):
        connector = aiohttp.TCPConnector(resolver=PublicOSSResolver(), limit=1, use_dns_cache=False)
        timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT, connect=10, sock_read=30)
        async with aiohttp.ClientSession(connector=connector, timeout=timeout,
                                         cookie_jar=aiohttp.DummyCookieJar(), trust_env=False,
                                         auto_decompress=False) as session:
            async with session.get(url, headers={'Accept-Encoding': 'identity'},
                                   allow_redirects=False, ssl=True) as response:
                headers = response_headers(response, None)
                if response.status != 200 or not headers['Content-Type'].startswith('video/'):
                    raise _invalid_response()
                received = 0
                with target.open('wb') as output:
                    async for chunk in response.content.iter_chunked(64 * 1024):
                        received += len(chunk)
                        if received > MAX_BYTES:
                            raise _error(413, 'dinghai_media_too_large', '媒体超出大小限制')
                        output.write(chunk)
                if not received or ('Content-Length' in headers and received != int(headers['Content-Length'])):
                    raise _invalid_response()

    async def convert(self, executable, source, target):
        process = None
        spawn = asyncio.create_task(asyncio.create_subprocess_exec(
            str(executable), '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
            '-protocol_whitelist', 'file,pipe', '-format_whitelist', 'mov,matroska,webm,avi',
            '-threads', '2', '-i', str(source), '-map', '0:v:0', '-map', '0:a:0?',
            '-sn', '-dn', '-map_metadata', '-1', '-c:v', 'libx264', '-preset', 'veryfast',
            '-crf', '18', '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-pix_fmt', 'yuv420p',
            '-filter_threads', '1', '-threads', '2', '-c:a', 'aac', '-b:a', '128k',
            '-movflags', '+faststart', '-f', 'mp4', str(target),
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
        ))
        try:
            try:
                process = await asyncio.shield(spawn)
            except asyncio.CancelledError:
                process = await spawn
                raise
            while process.returncode is None:
                try:
                    await asyncio.wait_for(process.wait(), 0.25)
                except asyncio.TimeoutError:
                    if target.exists() and target.stat().st_size >= MAX_BYTES:
                        raise _error(413, 'dinghai_media_too_large', '兼容预览超出大小限制')
            if process.returncode or not target.is_file() or not 0 < target.stat().st_size < MAX_BYTES:
                raise _error(502, 'dinghai_preview_failed', '视频兼容预览生成失败，原片未修改')
        finally:
            if process is not None and process.returncode is None:
                process.kill()
                await process.wait()

    async def respond(self, request, url):
        try:
            await asyncio.wait_for(self.lock.acquire(), QUEUE_TIMEOUT)
        except asyncio.TimeoutError:
            raise _error(429, 'dinghai_media_busy', '视频兼容预览正在处理中，请稍后重试') from None
        try:
            if self.directory is None:
                self.directory = tempfile.TemporaryDirectory(prefix='chouka-dinghai-preview-')
            # Signed query strings contain credentials and must never be cache keys or filenames.
            identity = str(url.with_query(None)) + '\n' + str(sorted(request.query.items()))
            key = hashlib.sha256(identity.encode()).hexdigest()
            target = Path(self.directory.name) / (key + '.mp4')
            if key in self.entries:
                self.entries[key] = (self.entries[key][0], time.monotonic())
            else:
                while self.entries and (len(self.entries) >= 4 or sum(v[0] for v in self.entries.values()) > MAX_BYTES // 2):
                    oldest = min(self.entries, key=lambda k: self.entries[k][1])
                    (Path(self.directory.name) / (oldest + '.mp4')).unlink(missing_ok=True)
                    del self.entries[oldest]
                previews = request.app.get('video_previews')
                executable = await asyncio.to_thread(previews.ffmpeg_bin) if previews else None
                if executable is None:
                    raise _error(502, 'dinghai_preview_unavailable', '服务器未找到 FFmpeg，无法生成兼容预览')
                source = target.with_suffix('.source')
                try:
                    await self.download(url, source)
                    await self.convert(executable, source, target)
                    # Keep all cached derivatives under the same total byte limit.
                    while self.entries and sum(v[0] for v in self.entries.values()) + target.stat().st_size > MAX_BYTES:
                        oldest = min(self.entries, key=lambda k: self.entries[k][1])
                        (Path(self.directory.name) / (oldest + '.mp4')).unlink(missing_ok=True)
                        del self.entries[oldest]
                    self.entries[key] = (target.stat().st_size, time.monotonic())
                finally:
                    source.unlink(missing_ok=True)
                    if key not in self.entries:
                        target.unlink(missing_ok=True)
            await require_dinghai(request)
            return await _stream_preview(request, target)
        finally:
            self.lock.release()

    async def close(self):
        async with self.lock:
            if self.directory is not None:
                self.directory.cleanup()
                self.directory = None
            self.entries.clear()


async def _preview_cleanup(app):
    yield
    await app[_PREVIEWS].close()


async def _watch_disconnect(request, task):
    # aiohttp does not always cancel handlers on peer disconnect (runner setting).
    while not task.done():
        await asyncio.sleep(0.25)
        if request.transport is None or request.transport.is_closing():
            task.cancel()
            return


async def dinghai_media(request):
    slots = request.app[_SLOTS]
    acquired = False
    watcher = None
    try:
        if request.rel_url.raw_path != '/api/dinghai/media':
            raise _error(404, 'dinghai_media_not_found', '未找到指定媒体')
        params = parse_query(request.query)
        if len(request.headers.getall('Range', [])) > 1:
            raise _error(416, 'dinghai_media_invalid_range', '不允许重复字节范围')
        requested_range = parse_range(request.headers.get('Range'))
        await require_dinghai(request)
        try:
            await asyncio.wait_for(slots.acquire(), QUEUE_TIMEOUT)
            acquired = True
        except asyncio.TimeoutError:
            raise _error(429, 'dinghai_media_busy', '媒体请求较多，请稍后重试') from None
        watcher = asyncio.create_task(_watch_disconnect(request, asyncio.current_task()))
        async with asyncio.timeout(REQUEST_TIMEOUT):
            url = await _authorized_url(request, params)
            if params.get('preview'):
                return await request.app[_PREVIEWS].respond(request, url)
            return await _stream(request, url, requested_range)
    except web.HTTPException as exc:
        # Helpers may return 401/403; never expose cookies or trigger local logout.
        if exc.status in (401, 403):
            return web.json_response({'code': 'dinghai_media_denied', 'error': '定海媒体未授权，请重新授权定海'},
                                     status=403, headers={'Cache-Control': 'no-store'})
        # Only errors created here are safe; an upstream body can forge any code.
        if getattr(exc, '_dinghai_media_safe', False):
            return web.Response(status=exc.status, text=exc.text, content_type='application/json',
                                headers={'Cache-Control': 'no-store'})
        status = exc.status if exc.status in (400, 404, 413, 416, 429, 504) else 502
        return web.json_response({'code': 'dinghai_media_unavailable', 'error': '定海媒体暂不可用'}, status=status,
                                 headers={'Cache-Control': 'no-store'})
    except asyncio.TimeoutError:
        return web.json_response({'code': 'dinghai_media_timeout', 'error': '定海媒体请求超时'}, status=504,
                                 headers={'Cache-Control': 'no-store'})
    except Exception:
        # Deliberately no exception text, traceback, URLs or credentials in logs/responses.
        return web.json_response({'code': 'dinghai_media_unavailable', 'error': '定海媒体暂不可用'}, status=502,
                                 headers={'Cache-Control': 'no-store'})
    finally:
        # Release synchronously before any await: aiohttp may cancel us again when
        # an aborted stream closes its transport, including during watcher cleanup.
        if acquired:
            slots.release()
        if watcher:
            watcher.cancel()
            await asyncio.gather(watcher, return_exceptions=True)


def register_dinghai_media_routes(app):
    app[_SLOTS] = asyncio.Semaphore(MAX_CONCURRENT)
    app[_PREVIEWS] = DinghaiVideoPreviews()
    app.cleanup_ctx.append(_preview_cleanup)
    app.router.add_get('/api/dinghai/media', dinghai_media)
