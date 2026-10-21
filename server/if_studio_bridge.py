"""Per-user loopback bridge between the Chouka browser page and the user's IF CLI."""
import argparse
import hashlib
import ipaddress
import json
import mimetypes
import os
import re
import secrets
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener


MEDIA = {'image/png': ('image', '.png', 10_000_000),
         'image/jpeg': ('image', '.jpg', 10_000_000),
         'image/webp': ('image', '.webp', 10_000_000),
         'video/mp4': ('video', '.mp4', 50 * 1024 * 1024)}
LIMITS_FILE = Path(__file__).resolve().parents[1] / 'manifests' / '_if_model_limits.json'


def valid_media(content_type, prefix, size):
    if content_type == 'image/png':
        return prefix.startswith(b'\x89PNG\r\n\x1a\n')
    if content_type == 'image/jpeg':
        return prefix.startswith(b'\xff\xd8\xff')
    if content_type == 'image/webp':
        return prefix.startswith(b'RIFF') and prefix[8:12] == b'WEBP'
    if content_type == 'video/mp4':
        return len(prefix) >= 16 and prefix[4:8] == b'ftyp' and 16 <= int.from_bytes(prefix[:4], 'big') <= size
    return False


def redact_cli_error(detail):
    detail = re.sub(r'(?i)(bearer\s+)[^\s,]+', r'\1[已隐藏]', str(detail))
    detail = re.sub(r'(?i)(https?://[^\s?]+)\?[^\s]+', r'\1?[已隐藏]', detail)
    return re.sub(r'''(?i)(\b(?:access_token|refresh_token|ifs_token|token)["']?\s*[=:]\s*["']?)[^\s,}"']+''',
                  r'\1[已隐藏]', detail)


class NoReferenceRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def is_if_upload_url(url):
    parts = urlparse(url)
    return (parts.scheme == 'https' and parts.hostname == 'ant.alicdn.com'
            and parts.port in (None, 443) and parts.username is None and parts.password is None
            and parts.path.startswith('/bio/img/'))


def prepare_if_reference(url):
    parts = urlparse(url)
    # Only probe IF's public upload CDN, never arbitrary user-supplied hosts or redirects.
    if not is_if_upload_url(url):
        return url
    directory, _, filename = parts.path.rpartition('/')
    # Raw underscores can be interpreted as CDN image-processing suffixes (not object-key bytes).
    url = parts._replace(path=directory + '/' + filename.replace('_', '%5F')).geturl()
    request = Request(url, headers={'Range': 'bytes=0-31', 'Accept-Encoding': 'identity'})
    try:
        with build_opener(NoReferenceRedirect()).open(request, timeout=15) as response:
            content_type = response.headers.get('Content-Type', '').lower()
            if (response.status not in (200, 206) or not response.read(32)
                    or content_type.startswith('text/') or 'xml' in content_type or 'json' in content_type):
                raise RuntimeError('IF 引用地址未返回有效媒体内容，尚未提交生成，请重新上传素材')
    except HTTPError as exc:
        exc.close()
        raise RuntimeError(f'IF 引用地址检查失败（HTTP {exc.code}），尚未提交生成，请重新上传素材') from exc
    except (URLError, OSError) as exc:
        raise RuntimeError('IF 引用地址检查超时或网络不可用，尚未提交生成，请检查网络后重试') from exc
    return url


def model_quota(model):
    if model.get('is_free') is True:
        return {'quota_status': 'free', 'remaining': None}
    if model.get('is_paid') is True:
        return {'quota_status': 'paid', 'remaining': None}
    total, used = model.get('total_count'), model.get('usage_count')
    if (model.get('is_free') is not False or model.get('is_paid') is not False or
            any(value is not None and (type(value) is not int or value < 0) for value in (total, used))):
        return {'quota_status': 'unknown', 'remaining': None}
    remaining = max(0, (total or 0) - (used or 0))
    status = 'limited' if remaining else 'exhausted' if total else 'unavailable'
    return {'quota_status': status, 'remaining': remaining}


class SessionBusyError(RuntimeError):
    pass


class Bridge(ThreadingHTTPServer):
    allow_reuse_address = False

    def __init__(self, address, origins, cli):
        super().__init__(address, BridgeHandler)
        self.origins = tuple(origins)
        self.cli = cli
        self.jobs = {}
        self.requests = {}
        self.assets = {}
        self.asset_bytes = 0
        self.asset_slots = 0
        self.lock = threading.Lock()
        self.workspace = tempfile.TemporaryDirectory(prefix='chouka-ifs-')
        self.serving = threading.Event()

    def service_actions(self):
        self.serving.set()
        super().service_actions()

    def close(self):
        self.server_close()
        self.workspace.cleanup()

    def command(self, *args, timeout=35):
        try:
            proc = subprocess.run([self.cli, *args], capture_output=True, text=True,
                                  encoding='utf-8', errors='replace', timeout=timeout,
                                  cwd=self.workspace.name, check=False)
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise RuntimeError('IF CLI 不可用或请求超时，请检查本机终端') from exc
        if proc.returncode:
            detail = redact_cli_error((proc.stderr or proc.stdout).strip())
            error = RuntimeError
            # Only an explicit rejected send is safe to retry; a timeout may have been accepted.
            if args[:2] == ('canvas', 'run') and re.search(
                    r'/api/session/send 失败: map\[code:session_busy\b[^\r\n]*\bstatus:session_busy success:false\]', detail):
                error = SessionBusyError
            raise error('IF CLI 请求失败：' + detail[-1500:] if detail else
                        'IF CLI 请求失败，请检查本机登录状态和网络')
        try:
            return json.loads(proc.stdout)
        except json.JSONDecodeError as exc:
            raise RuntimeError('IF CLI 返回了非 JSON 数据') from exc

    def generate(self, job_id, request, asset_paths=None):
        asset_paths = asset_paths or []
        submitted_prompt = None
        canvas_result = {key: request[key] for key in ('canvas_id', 'session_id')
                         if isinstance(request.get(key), str) and request[key]}
        reuse = request.get('references')
        reference_result = {'reference_urls': []} if reuse is not None else {}
        try:
            paths = iter(asset_paths)
            entries = ([(next(paths), item['kind'], None) if 'asset_id' in item
                        else (None, item['kind'], item['url']) for item in reuse] if reuse is not None
                       else [(path, 'video' if path.suffix.lower() in ('.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v')
                              else 'image', None) for path in asset_paths])
            if request.get('image'):
                suffix = Path(urlparse(request['image']).path).suffix.lower()
                entries.append((None, 'video' if suffix in ('.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v')
                                else 'image', request['image']))
            video = request.get('type') == 'video'
            counts = {'图片': 0, '视频': 0}
            reference_lines = []
            uploaded_count = 0
            for index, (path, kind, reference) in enumerate(entries):
                media = '视频' if kind == 'video' else '图片'
                counts[media] += 1
                if path is not None:
                    uploaded_count += 1
                    with self.lock:
                        self.jobs[job_id] = {'state': 'starting', 'result': dict(reference_result),
                            'step': f'正在上传 IF 引用素材（{uploaded_count}/{len(asset_paths)}）'}
                    try:
                        uploaded = self.command('upload', str(path), '--profile', 'buc', '--json', timeout=60)
                    finally:
                        path.unlink(missing_ok=True)
                    reference = uploaded.get('url')
                    if not isinstance(reference, str) or urlparse(reference).scheme not in ('http', 'https') or not urlparse(reference).hostname:
                        raise RuntimeError('IF CLI 上传失败：' + str(uploaded.get('error') or
                                           uploaded.get('message') or '未返回有效的素材 URL')[:500])
                with self.lock:
                    self.jobs[job_id] = {'state': 'starting', 'result': dict(reference_result),
                        'step': f'正在检查 IF {media}{counts[media]}引用地址（{index + 1}/{len(entries)}）'}
                try:
                    reference = prepare_if_reference(reference)
                except RuntimeError as exc:
                    if reuse is not None and index < len(reuse) and path is None:
                        reference_result['invalid_reference_indices'] = [index]
                    raise RuntimeError(f'{media}{counts[media]}：{exc}') from exc
                if reuse is not None and index < len(reuse):
                    reference_result['reference_urls'] = reference_result['reference_urls'] + [
                        {'index': index, 'kind': kind, 'url': reference}]
                    with self.lock:
                        self.jobs[job_id]['result'] = dict(reference_result)
                reference_lines.append(f'{media}{counts[media]}：{reference}')
            prompt = f"使用模型：{request['model']}\n\n生成需求：\n{request['prompt']}"
            if reference_lines:
                prompt = '\n'.join(reference_lines) + '\n\n' + prompt
            submitted_prompt = prompt
            canvas_id, session_id = request.get('canvas_id'), request.get('session_id')
            flags = ['canvas', 'run', '--profile', 'buc', '--json', '--create-only', '--model', request['model']]
            if canvas_id and session_id:
                flags += ['--canvas-id', canvas_id, '--session-id', session_id]
            if request.get('skill'):
                flags += ['--skill', request['skill']]
            sending_step = f'正在向 IF 一次提交全部引用与{"视频" if video else "图片"}生成需求'
            for attempt in range(21):
                with self.lock:
                    self.jobs[job_id] = {'state': 'starting', 'step': sending_step,
                        'result': {**reference_result, 'submitted_prompt': prompt}}
                try:
                    created = self.command(*flags, '--', prompt, timeout=60)
                    break
                except SessionBusyError as exc:
                    if not (canvas_id and session_id):
                        raise
                    if attempt == 20:
                        raise RuntimeError('IF 会话持续忙碌，已停止自动重试；本条消息未被接受，'
                                           '请先在 IF 确认上一轮状态。' + str(exc)) from exc
                    with self.lock:
                        self.jobs[job_id] = {'state': 'starting',
                            'step': f'IF 会话忙碌，正在等待上一轮结束；15 秒后重试（{attempt + 1}/20）',
                            'result': {**reference_result, 'submitted_prompt': prompt}}
                    time.sleep(15)
            canvas_result.update({key: created[key] for key in ('canvas_id', 'canvas_url', 'session_id')
                                  if isinstance(created.get(key), str) and created[key]})
            if created.get('status') != 'created':
                raise RuntimeError('IF CLI 未创建画布：' + str(created.get('error') or
                                   created.get('message') or created.get('status'))[:500])
            created.update(reference_result)
            created['submitted_prompt'] = prompt
            with self.lock:
                self.jobs[job_id] = {'state': 'running', 'result': created,
                    'step': f'IF 正在生成{"视频" if video else "图片"}，等待产物'}
            folder = Path(self.workspace.name) / job_id
            folder.mkdir()
            poll_args = ('canvas', 'poll', '--profile', 'buc', '--canvas-id', created['canvas_id'],
                         '--session-id', created['session_id'], '--timeout', '600', '--save-dir', str(folder), '--json')
            result = self.command(*poll_args, timeout=630)
            if result.get('status') == 'summary_feedback' and any(
                    text in result.get('planning_text', '') for text in ('后台处理中', '已生成完毕')):
                deadline = time.monotonic() + 900
                while time.monotonic() < deadline:
                    time.sleep(10)
                    result = self.command(*poll_args, timeout=630)
                    if result.get('status') != 'summary_feedback' or not any(
                            text in result.get('planning_text', '') for text in ('后台处理中', '已生成完毕')):
                        break
                else:
                    raise RuntimeError('IF 产物等待超时，未重新提交生成；请在 IF 查看原会话')
            if result.get('status') in ('error', 'failed'):
                raise RuntimeError('IF CLI 生成失败：' + str(result.get('error') or
                                   result.get('message') or result.get('planning_text') or
                                   result['status'])[:500])
            downloads = []
            for item in result.get('downloaded', []):
                path = Path(item.get('local_path', ''))
                path = (Path(self.workspace.name) / path).resolve() if not path.is_absolute() else path.resolve()
                if path.is_file() and path.parent == folder.resolve():
                    downloads.append({'type': item.get('type'), 'name': path.name,
                                      'index': len(downloads), 'url': item.get('url')})
            result['downloaded'] = downloads
            for key, value in canvas_result.items():
                if not result.get(key):
                    result[key] = value
            result.update(reference_result)
            result['submitted_prompt'] = prompt
            with self.lock:
                self.jobs[job_id] = {'state': 'done', 'result': result}
        except (RuntimeError, KeyError, TypeError, ValueError) as exc:
            with self.lock:
                self.jobs[job_id] = {'state': 'error', 'error': redact_cli_error(exc),
                    'result': {**canvas_result, **reference_result,
                               **({'submitted_prompt': submitted_prompt} if submitted_prompt is not None else {})}}
        finally:
            for path in asset_paths:
                path.unlink(missing_ok=True)


class BridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def authorized(self):
        host = self.headers.get('Host', '')
        if host != f'127.0.0.1:{self.server.server_port}' or self.headers.get('Origin') not in self.server.origins:
            self.send_error(403)
            return False
        return True

    def reply(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', self.headers['Origin'])
        self.send_header('Vary', 'Origin')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        if not self.authorized():
            return
        method = self.headers.get('Access-Control-Request-Method')
        if not ((method == 'POST' and self.path in ('/runs', '/assets')) or
                (method == 'DELETE' and self.path.startswith('/assets/')) or
                (method == 'GET' and (self.path in ('/status', '/models') or
                                      self.path.startswith(('/runs/', '/requests/'))))):
            self.send_error(404)
            return
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', self.headers['Origin'])
        self.send_header('Access-Control-Allow-Methods', method)
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Chouka-IF')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Vary', 'Origin')
        self.end_headers()

    def do_GET(self):
        if not self.authorized():
            return
        if self.path == '/status':
            try:
                status = self.server.command('auth', 'status', '--json', timeout=10)
                profile = status.get('profiles', {}).get('buc', {})
                self.reply(200, {'ready': bool(profile.get('has_ifs_token')) and
                                 profile.get('registry') == 'ifs.alibaba-inc.com', 'reference_reuse': True,
                                 'request_recovery': True})
            except RuntimeError as exc:
                self.reply(503, {'error': str(exc)})
        elif self.path == '/models':
            try:
                models = self.server.command('models', '--refresh', '--json', '--profile', 'buc', timeout=35)
                self.reply(200, {'models': [{'display_name': m['display_name'], 'type': m['type'],
                                            **model_quota(m)}
                                           for m in models if m.get('type') in ('image', 'video')]})
            except (RuntimeError, KeyError, TypeError) as exc:
                self.reply(503, {'error': str(exc)})
        elif self.path.startswith('/requests/'):
            request_id = self.path.removeprefix('/requests/')
            with self.server.lock:
                entry = self.server.requests.get((self.headers['Origin'], request_id))
            if entry is None:
                self.reply(404, {'error': '尚未找到该请求，请勿重复提交'})
            else:
                self.reply(200, {'id': entry['id']})
        elif self.path.startswith('/runs/'):
            parts = self.path.split('/')
            with self.server.lock:
                job = self.server.jobs.get(parts[2]) if len(parts) >= 3 else None
            if job is None:
                self.reply(404, {'error': '任务不存在'})
            elif len(parts) == 3:
                self.reply(200, job)
            elif len(parts) == 5 and parts[3] == 'media' and parts[4].isdigit():
                if job['state'] != 'done':
                    self.reply(404, {'error': '媒体尚未下载'})
                    return
                downloads = job['result'].get('downloaded', [])
                index = int(parts[4])
                if index >= len(downloads):
                    self.reply(404, {'error': '媒体不存在'})
                    return
                item = downloads[index]
                path = Path(self.server.workspace.name) / parts[2] / item['name']
                size = path.stat().st_size
                start, end = 0, size - 1
                range_header = self.headers.get('Range', '')
                if range_header:
                    import re
                    match = re.fullmatch(r'bytes=(\d+)-(\d*)', range_header)
                    if not match:
                        self.send_error(416)
                        return
                    start = int(match.group(1))
                    end = min(int(match.group(2)), size - 1) if match.group(2) else size - 1
                    if start > end or start >= size:
                        self.send_error(416)
                        return
                self.send_response(206 if range_header else 200)
                self.send_header('Content-Type', mimetypes.guess_type(path.name)[0] or 'application/octet-stream')
                self.send_header('Content-Length', str(end - start + 1))
                self.send_header('Accept-Ranges', 'bytes')
                if range_header:
                    self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
                self.send_header('Access-Control-Allow-Origin', self.headers['Origin'])
                self.send_header('Vary', 'Origin')
                self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                with path.open('rb') as stream:
                    stream.seek(start)
                    remaining = end - start + 1
                    while remaining:
                        chunk = stream.read(min(1024 * 1024, remaining))
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        remaining -= len(chunk)
            else:
                self.reply(404, {'error': '接口不存在'})
        else:
            self.reply(404, {'error': '接口不存在'})

    def do_DELETE(self):
        if not self.authorized():
            return
        asset_id = self.path.removeprefix('/assets/')
        if self.headers.get('X-Chouka-IF') != 'asset' or not self.path.startswith('/assets/') or \
                not re.fullmatch(r'[A-Za-z0-9_-]{32}', asset_id):
            self.reply(403, {'error': '请求不被允许'})
            return
        with self.server.lock:
            asset = self.server.assets.pop(asset_id, None)
            if asset is not None:
                self.server.asset_slots -= 1
                self.server.asset_bytes -= asset[2]
        if asset is None:
            self.reply(404, {'error': '素材已使用或不存在'})
            return
        asset[0].unlink(missing_ok=True)
        self.reply(200, {'ok': True})

    def upload_asset(self):
        if self.headers.get('X-Chouka-IF') != 'asset':
            self.reply(403, {'error': '请求不被允许'})
            return
        content_type = self.headers.get('Content-Type')
        media = MEDIA.get(content_type)
        lengths = self.headers.get_all('Content-Length', [])
        if not media or len(lengths) != 1 or not re.fullmatch(r'[0-9]{1,9}', lengths[0]):
            self.reply(400, {'error': '不支持的素材格式或长度'})
            return
        kind, extension, maximum = media
        length = int(lengths[0])
        if not 0 < length <= maximum:
            self.reply(400, {'error': '素材过大或为空'})
            return
        with self.server.lock:
            if self.server.asset_slots >= 40 or self.server.asset_bytes + length > 100 * 1024 * 1024:
                self.reply(429, {'error': '待使用素材过多'})
                return
            self.server.asset_slots += 1
            self.server.asset_bytes += length
        asset_id = secrets.token_urlsafe(24)
        path = Path(self.server.workspace.name) / (secrets.token_urlsafe(24) + extension)
        saved = False
        try:
            self.connection.settimeout(15)
            prefix = self.rfile.read(min(length, 32))
            if not valid_media(content_type, prefix, length):
                self.reply(400, {'error': '素材内容与格式不符'})
                return
            with path.open('xb') as stream:
                stream.write(prefix)
                remaining = length - len(prefix)
                while remaining:
                    chunk = self.rfile.read(min(1024 * 1024, remaining))
                    if not chunk:
                        raise ValueError('上传未完成')
                    stream.write(chunk)
                    remaining -= len(chunk)
            with self.server.lock:
                self.server.assets[asset_id] = (path, kind, length)
            saved = True
            self.reply(201, {'asset_id': asset_id, 'kind': kind})
        except (OSError, ValueError):
            self.reply(400, {'error': '素材上传失败'})
        finally:
            if not saved:
                path.unlink(missing_ok=True)
                with self.server.lock:
                    self.server.asset_slots -= 1
                    self.server.asset_bytes -= length

    def reply_existing_request(self, key, fingerprint):
        previous = self.server.requests.get(key)
        if not previous:
            return False
        matches = previous['fingerprint'] == fingerprint
        self.reply(202 if matches else 409, {'id': previous['id']} if matches else
                   {'error': '该请求编号已用于其他生成内容，请勿重复提交'})
        return True

    def do_POST(self):
        if not self.authorized():
            return
        if self.path == '/assets':
            self.upload_asset()
            return
        if self.path != '/runs' or self.headers.get('X-Chouka-IF') != 'generate' or \
                self.headers.get('Content-Type') != 'application/json':
            self.reply(403, {'error': '请求不被允许'})
            return
        lengths = self.headers.get_all('Content-Length', [])
        length = int(lengths[0]) if len(lengths) == 1 and re.fullmatch(r'[0-9]{1,9}', lengths[0]) else 0
        if not 0 < length <= 128000:
            self.reply(400, {'error': '请求内容过长或为空'})
            return
        try:
            data = json.loads(self.rfile.read(length))
            prompt = data['prompt']
            model = data['model']
            kind = data['type']
            if not isinstance(prompt, str) or not 0 < len(prompt.strip()) <= 4000 or not isinstance(model, str) or \
                    kind not in ('image', 'video'):
                raise ValueError()
            for key in ('canvas_id', 'session_id', 'skill'):
                if key in data and (not isinstance(data[key], str) or len(data[key]) > 120):
                    raise ValueError()
            if bool(data.get('canvas_id')) != bool(data.get('session_id')):
                raise ValueError()
            if not isinstance(data, dict) or any(key not in (
                    'prompt', 'model', 'type', 'canvas_id', 'session_id', 'skill',
                    'image', 'asset_id', 'asset_ids', 'references', 'request_id'
            ) for key in data):
                raise ValueError()
            request_id = data.get('request_id')
            if request_id is not None and (not isinstance(request_id, str) or
                                           not re.fullmatch(r'[a-f0-9]{32}', request_id)):
                raise ValueError()
            request_key = (self.headers['Origin'], request_id)
            fingerprint = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
            with self.server.lock:
                if self.reply_existing_request(request_key, fingerprint):
                    return
            asset_id = data.get('asset_id')
            if 'asset_id' in data and (not isinstance(asset_id, str) or
                                       not re.fullmatch(r'[A-Za-z0-9_-]{32}', asset_id)):
                raise ValueError()
            asset_ids = data.get('asset_ids')
            if 'asset_ids' in data:
                if 'asset_id' in data or not isinstance(asset_ids, list) or \
                        not 1 <= len(asset_ids) <= 40 or len(set(asset_ids)) != len(asset_ids) or \
                        any(not isinstance(item, str) or not re.fullmatch(r'[A-Za-z0-9_-]{32}', item)
                            for item in asset_ids):
                    raise ValueError()
            else:
                asset_ids = [asset_id] if asset_id else []
                if asset_id and 'image' in data:
                    raise ValueError()
            references = data.get('references')
            if 'references' in data:
                if ('asset_id' in data or 'asset_ids' in data or not isinstance(references, list)
                        or not 1 <= len(references) <= 40):
                    raise ValueError()
                asset_ids = []
                for item in references:
                    if not isinstance(item, dict) or item.get('kind') not in ('image', 'video'):
                        raise ValueError()
                    if set(item) == {'kind', 'asset_id'}:
                        if not isinstance(item['asset_id'], str) or not re.fullmatch(r'[A-Za-z0-9_-]{32}', item['asset_id']):
                            raise ValueError()
                        asset_ids.append(item['asset_id'])
                    elif set(item) == {'kind', 'url'}:
                        if not isinstance(item['url'], str) or len(item['url']) > 2048 or not is_if_upload_url(item['url']):
                            raise ValueError()
                        suffix = Path(urlparse(item['url']).path).suffix.lower()
                        if suffix not in (('.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v') if item['kind'] == 'video'
                                          else ('.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif')):
                            raise ValueError()
                    else:
                        raise ValueError()
                if len(set(asset_ids)) != len(asset_ids):
                    raise ValueError()
            image = data.get('image', '')
            if not isinstance(image, str) or len(image) > 2048:
                raise ValueError()
            if image:
                url = urlparse(image)
                host = url.hostname
                if url.scheme != 'https' or not host or url.username or url.password or \
                        host == 'localhost' or host.endswith('.localhost'):
                    raise ValueError()
                try:
                    address = ipaddress.ip_address(host)
                except ValueError:
                    address = None
                if (address is not None and not address.is_global) or host.replace('.', '').isdigit():
                    raise ValueError()
            models = self.server.command('models', '--refresh', '--json', '--profile', 'buc', timeout=35)
            selected = next((m for m in models if m.get('display_name') == model and m.get('type') == kind), None)
            if selected is None:
                raise ValueError()
            quota = model_quota(selected)
            if quota['quota_status'] in ('exhausted', 'unavailable'):
                with self.server.lock:
                    if self.reply_existing_request(request_key, fingerprint):
                        return
                reason = '免费次数已用完' if quota['quota_status'] == 'exhausted' else '未开通且无免费次数'
                self.reply(400, {'error': f'{model}：{reason}，尚未提交生成，请选择其他模型'})
                return
            if asset_ids or references or image:
                limits = json.loads(LIMITS_FILE.read_text(encoding='utf-8'))
                rule = limits.get(model) if isinstance(limits, dict) else None
                if rule is None:
                    bridge_limits = {'image': 6 if kind == 'video' else 3,
                                     'video': 1 if kind == 'video' else 0, 'audio': 0}
                else:
                    if not isinstance(rule, dict) or rule.get('type') != kind or \
                            not isinstance(rule.get('bridge'), dict):
                        raise ValueError()
                    bridge_limits = rule['bridge']
                with self.server.lock:
                    if self.reply_existing_request(request_key, fingerprint):
                        return
                    assets = [self.server.assets.get(item) for item in asset_ids]
                if any(asset is None for asset in assets):
                    raise ValueError()
                if references is not None:
                    local = iter(assets)
                    if any(next(local)[1] != item['kind'] for item in references if 'asset_id' in item):
                        raise ValueError()
                    counts = {media: sum(item['kind'] == media for item in references) for media in ('image', 'video')}
                else:
                    counts = {media: sum(asset[1] == media for asset in assets) for media in ('image', 'video')}
                if image:
                    suffix = Path(url.path).suffix.lower()
                    url_kind = ('image' if suffix in ('.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp',
                                                       '.avif', '.heic', '.heif', '.tif', '.tiff') else
                                'video' if suffix in ('.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v') else
                                'audio' if suffix in ('.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.opus')
                                else None)
                    if url_kind in counts:
                        counts[url_kind] += 1
                    elif url_kind or kind == 'video':
                        raise ValueError()
                    else:
                        counts['image'] += 1
                for media, count in counts.items():
                    maximum = bridge_limits.get(media)
                    if count and (type(maximum) is not int or count > maximum):
                        raise ValueError()
        except (ValueError, KeyError, TypeError, OSError, UnicodeError, json.JSONDecodeError):
            self.reply(400, {'error': '请输入有效的提示词并选择当前可用的模型'})
            return
        except RuntimeError as exc:
            self.reply(503, {'error': str(exc)})
            return
        with self.server.lock:
            if self.reply_existing_request(request_key, fingerprint):
                return
            if any(job['state'] in ('starting', 'running') for job in self.server.jobs.values()):
                self.reply(409, {'error': '已有 IF 生成任务正在进行'})
                return
            if any(item not in self.server.assets for item in asset_ids):
                self.reply(400, {'error': '素材已使用或不存在'})
                return
            asset_paths = []
            for item in asset_ids:
                asset = self.server.assets.pop(item)
                asset_paths.append(asset[0])
                self.server.asset_slots -= 1
                self.server.asset_bytes -= asset[2]
            job_id = secrets.token_urlsafe(18)
            self.server.jobs[job_id] = {'state': 'starting', 'step': '本机 IF 正在准备生成任务'}
            if request_id:
                self.server.requests[request_key] = {'id': job_id, 'fingerprint': fingerprint}
        try:
            threading.Thread(target=self.server.generate, args=(job_id, data, asset_paths), daemon=True).start()
        except RuntimeError:
            for path in asset_paths:
                path.unlink(missing_ok=True)
            with self.server.lock:
                self.server.jobs[job_id] = {'state': 'error', 'error': '无法启动生成任务'}
            self.reply(503, {'error': '无法启动生成任务'})
            return
        self.reply(202, {'id': job_id})


def main():
    parser = argparse.ArgumentParser(description='Chouka per-user IF Studio loopback bridge')
    parser.add_argument('--origin', required=True, action='append', help='Exact Chouka page origin; repeat for each local site')
    parser.add_argument('--port', type=int, default=8278)
    parser.add_argument('--manager-stdin', action='store_true', help='Stop and clean up when the managing app closes stdin')
    parser.add_argument('--cli', default=str(Path(os.environ.get('LOCALAPPDATA', '')) / 'Programs' / 'ifs' / 'ifs.exe'))
    args = parser.parse_args()
    for value in args.origin:
        origin = urlparse(value)
        if origin.scheme not in ('http', 'https') or not origin.netloc or origin.path not in ('', '/') or \
                origin.query or origin.fragment or value.rstrip('/') != f'{origin.scheme}://{origin.netloc}':
            parser.error('--origin 必须是 Chouka 的完整、精确网页来源（不含路径）')
    server = Bridge(('127.0.0.1', args.port), [value.rstrip('/') for value in args.origin], args.cli)
    print(f'IF Studio bridge: 127.0.0.1:{args.port} -> {", ".join(server.origins)}', flush=True)
    if args.manager_stdin:
        def stop_with_manager():
            sys.stdin.buffer.read(1)
            server.serving.wait()
            server.shutdown()
        threading.Thread(target=stop_with_manager, daemon=True).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.close()


if __name__ == '__main__':
    main()
