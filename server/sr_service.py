"""Remote video super-resolution through the Youku AIGC gateway.

Local inputs are uploaded to OSS and submitted as temporary signed URLs; the result URL is
downloaded straight into the job's artifact directory. Submission is never retried
automatically: a task whose acceptance is unknown must be checked by a human first,
otherwise one click can be billed twice.
"""
import asyncio
import json
import math
import os
import re
import time
from pathlib import Path
from urllib.parse import urlsplit

import aiohttp
from yarl import URL

from server.oss_client import OSSClient, OSSConfig, OSSError

EXECUTION = "remote_sr"
ROOT = Path(__file__).resolve().parent.parent
CONF = ROOT / "sr-service.json"
TERMINAL_FAILURES = {"failed", "failure", "error", "cancelled", "canceled", "timeout"}
MAX_JSON_BYTES = 1024 * 1024
MAX_RESULT_BYTES = 16 * 1024 ** 3
EXPECTED_SECONDS = 900
DEFAULTS = {
    "enabled": True,
    "gateway": "https://ykaigc-gw.youku.com/v1/models/predict",
    "query_url": "http://aigc-gw.youku.com/v1/tasks/getTaskResult",
    "app_id": "youku-aigc-prod",
    "model_id": "wan-speed-opt-mokuSR-hytest4",
    "api_hosts": [".youku.com"],
    "result_hosts": [".aliyuncs.com"],
    "allow_insecure_gateway": False,
    "allow_insecure_result": False,
    "sign_seconds": 86400,
    "poll_interval": 10,
    "result_timeout": 7200,
    "max_concurrent": 4,
}
CONTENT_TYPES = {".mp4": "video/mp4", ".png": "image/png", ".jpg": "image/jpeg",
                 ".jpeg": "image/jpeg", ".webp": "image/webp"}


class SRError(Exception):
    pass


class SRConfigError(SRError):
    pass


class SRTaskFailed(SRError):
    """The remote task is definitely over; polling again cannot help."""


def _host_allowed(host, suffixes):
    host = (host or "").lower().rstrip(".")
    return any(host == s.strip(".").lower() or host.endswith("." + s.strip(".").lower())
               for s in suffixes if s.strip("."))


def check_url(url, label, hosts=None, require_https=False):
    try:
        parts = urlsplit(url) if isinstance(url, str) else None
        valid = (parts and parts.scheme in ("http", "https") and parts.hostname
                 and not parts.username and not parts.password and not parts.fragment
                 and not any(ord(c) < 33 for c in url))
        parts and parts.port
    except ValueError:
        valid = False
    if not valid:
        raise SRError(f"{label} 不是有效的 HTTP(S) 地址")
    if require_https and parts.scheme != "https":
        raise SRError(f"{label} 必须使用 HTTPS")
    if hosts is not None and not _host_allowed(parts.hostname, hosts):
        raise SRError(f"{label} 的主机不在允许列表中：{parts.hostname}")
    return url


def _int(config, key, low, high):
    value = config.get(key)
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise SRConfigError(f"sr-service.json 的 {key} 必须是 {low}–{high} 之间的整数")
    return value


def load_config():
    path = Path(os.environ.get("CHOUKA_SR_CONFIG") or CONF)
    try:
        raw = json.loads(path.read_text(encoding="utf-8-sig")) if path.exists() else {}
    except (OSError, ValueError) as exc:
        raise SRConfigError("sr-service.json 读取失败") from exc
    if not isinstance(raw, dict):
        raise SRConfigError("sr-service.json 必须是 JSON 对象")
    config = {**DEFAULTS, **{k: v for k, v in raw.items() if k != "oss"}}
    if config.get("enabled") is not True:
        raise SRConfigError("视频超分服务未启用")
    for key in ("gateway", "query_url", "app_id", "model_id"):
        if not isinstance(config.get(key), str) or not config[key].strip():
            raise SRConfigError(f"sr-service.json 缺少 {key}")
    for key in ("api_hosts", "result_hosts"):
        if (not isinstance(config.get(key), list) or not config[key]
                or not all(isinstance(h, str) and h.strip(".") for h in config[key])):
            raise SRConfigError(f"sr-service.json 的 {key} 必须是非空主机后缀列表")
    try:
        check_url(config["gateway"], "超分网关", config["api_hosts"],
                  require_https=config.get("allow_insecure_gateway") is not True)
        check_url(config["query_url"], "超分查询接口", config["api_hosts"])
    except SRError as exc:
        raise SRConfigError(str(exc)) from exc
    config["sign_seconds"] = _int(config, "sign_seconds", 600, 7 * 24 * 3600)
    config["poll_interval"] = _int(config, "poll_interval", 1, 600)
    config["result_timeout"] = _int(config, "result_timeout", 60, 7 * 24 * 3600)
    config["max_concurrent"] = _int(config, "max_concurrent", 1, 64)
    oss = raw.get("oss") if isinstance(raw.get("oss"), dict) else {}
    try:
        config["oss"] = OSSConfig.from_root(
            oss.get("root"), endpoint=oss.get("endpoint"), region=oss.get("region"),
            access_key_id=os.environ.get("CHOUKA_SR_OSS_ACCESS_KEY_ID") or oss.get("access_key_id"),
            access_key_secret=(os.environ.get("CHOUKA_SR_OSS_ACCESS_KEY_SECRET")
                               or oss.get("access_key_secret")),
            security_token=os.environ.get("CHOUKA_SR_OSS_STS_TOKEN") or oss.get("security_token") or "",
        )
    except ValueError as exc:
        raise SRConfigError(f"sr-service.json 的 OSS 配置无效：{exc}") from exc
    return config


def configured():
    try:
        load_config()
    except SRConfigError:
        return False
    return True


def find_scalar(value, keys):
    """Search the gateway's loosely nested (sometimes JSON-in-string) responses for a field."""
    normalized = {key.lower().replace("_", "") for key in keys}
    if isinstance(value, dict):
        for key, nested in value.items():
            if key.lower().replace("_", "") in normalized and isinstance(nested, (str, int, float)) \
                    and not isinstance(nested, bool):
                return str(nested)
        for nested in value.values():
            found = find_scalar(nested, keys)
            if found:
                return found
    elif isinstance(value, list):
        for nested in value:
            found = find_scalar(nested, keys)
            if found:
                return found
    elif isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith(("{", "[")):
            try:
                return find_scalar(json.loads(stripped), keys)
            except ValueError:
                return None
    return None


async def _json(session, method, url, *, payload=None, timeout=60):
    async with session.request(
            method, url, json=payload, allow_redirects=False,
            headers={"User-Agent": "chouka-sr/1.0"},
            timeout=aiohttp.ClientTimeout(total=timeout, sock_connect=10)) as response:
        body = bytearray()
        async for chunk in response.content.iter_chunked(64 * 1024):
            body.extend(chunk)
            if len(body) > MAX_JSON_BYTES:
                raise SRError("超分接口响应过大")
        if response.status >= 300:
            raise SRError(f"超分接口返回 HTTP {response.status}")
    try:
        return json.loads(bytes(body).decode("utf-8"))
    except (UnicodeDecodeError, ValueError) as exc:
        raise SRError("超分接口返回的不是有效 JSON") from exc


async def submit(session, config, payload):
    """Returns the taskId. Every failure here leaves acceptance unknown except a 4xx reply."""
    request = {"appId": config["app_id"], "modelId": config["model_id"],
               "reqType": "async", "payload": payload}
    try:
        response = await _json(session, "POST", config["gateway"], payload=request)
    except SRError as exc:
        if re.search(r"HTTP 4\d\d", str(exc)):
            raise SRError(f"超分服务拒绝了任务（{exc}），未提交成功") from exc
        raise SRError(f"提交超分任务时出错，无法确认是否已被接收：{exc}。"
                      "为避免重复计费请先联系管理员核查再重试") from exc
    except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
        raise SRError("提交超分任务时网络中断，无法确认是否已被接收。"
                      "为避免重复计费请先联系管理员核查再重试") from exc
    task_id = find_scalar(response, {"taskId", "task_id"})
    if not task_id or len(task_id) > 256:
        raise SRError("超分网关响应中没有 taskId，无法确认任务状态，请联系管理员核查")
    return task_id


async def query(session, config, task_id):
    """Returns (status_text, result_url_or_None); raises SRError on a terminal failure."""
    url = URL(config["query_url"]).update_query(taskId=task_id)
    response = await _json(session, "GET", url)
    status = (find_scalar(response, {"status", "state", "taskStatus"}) or "").strip()
    if status.lower() in TERMINAL_FAILURES:
        raise SRTaskFailed(f"超分服务任务失败（状态 {status}）")
    result = find_scalar(response, {"video_url", "videoUrl"})
    if result:
        try:
            check_url(result, "超分结果地址", config["result_hosts"],
                      require_https=config.get("allow_insecure_result") is not True)
        except SRError as exc:
            raise SRTaskFailed(str(exc)) from exc
    return status, result


async def download(session, config, url, target, on_progress=None):
    check_url(url, "超分结果地址", config["result_hosts"],
              require_https=config.get("allow_insecure_result") is not True)
    target = Path(target)
    partial = target.with_name(target.name + ".part")
    try:
        async with session.get(url, allow_redirects=False, headers={"User-Agent": "chouka-sr/1.0"},
                               timeout=aiohttp.ClientTimeout(total=None, sock_connect=10,
                                                             sock_read=120)) as response:
            if response.status != 200:
                raise SRError(f"下载超分结果失败：HTTP {response.status}")
            expected = response.content_length
            if expected is not None and expected > MAX_RESULT_BYTES:
                raise SRError("超分结果超过大小限制")
            size = 0
            with partial.open("wb") as handle:
                async for chunk in response.content.iter_chunked(1024 * 1024):
                    size += len(chunk)
                    if size > MAX_RESULT_BYTES:
                        raise SRError("超分结果超过大小限制")
                    await asyncio.to_thread(handle.write, chunk)
                    if on_progress and expected:
                        on_progress(size / expected)
        if size <= 0 or (expected is not None and size != expected):
            raise SRError("超分结果下载不完整")
        os.replace(partial, target)
        return size
    except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
        raise SRError(f"下载超分结果失败：{type(exc).__name__}") from exc
    finally:
        partial.unlink(missing_ok=True)


def build_payload(params, video_url, ref_urls, video_name):
    height = params.get("output_height", 2160)
    try:
        height = int(height)
    except (TypeError, ValueError):
        raise SRError("输出高度必须是整数")
    if not 256 <= height <= 2160:
        raise SRError("输出高度必须在 256–2160 之间")
    try:
        frames = int(params.get("num_frames") or 0)
    except (TypeError, ValueError):
        raise SRError("处理帧数必须是整数")
    if frames < 0:
        raise SRError("处理帧数不能为负数")
    payload = {"image_paths": "", "lr_video_path": video_url, "video_name": video_name,
               "output_height": height}
    if frames:
        payload["num_frames"] = frames
    if params.get("lf_anchor") == "off":
        payload["lf_anchor"] = "0"
    if ref_urls:
        payload["ref_image_paths"] = ",".join(ref_urls)
    return payload


class TaskStore:
    """Remote task state kept apart from JOBS: taskIds and object keys never reach the browser
    (the query endpoint is unauthenticated, so a taskId is enough to fetch the result)."""

    def __init__(self, path):
        self.path = Path(path)
        try:
            data = json.loads(self.path.read_text(encoding="utf-8")) if self.path.exists() else {}
        except (OSError, ValueError):
            data = {}
        self.items = data if isinstance(data, dict) else {}

    def get(self, pid):
        return self.items.get(pid)

    def update(self, pid, **fields):
        self.items.setdefault(pid, {}).update(fields)
        self._save()

    def pop(self, pid):
        if self.items.pop(pid, None) is not None:
            self._save()

    def _save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_name(self.path.name + ".tmp")
        temporary.write_text(json.dumps(self.items, ensure_ascii=False), encoding="utf-8")
        os.replace(temporary, self.path)


class Runner:
    """Owns the asyncio tasks of remote SR jobs. `hooks` is supplied by the app:
    save() persists JOBS; register_output(locator, ready) records the artifact resource."""

    def __init__(self, store_path, artifact_dir, hooks):
        self.store = TaskStore(store_path)
        self.artifact_dir = Path(artifact_dir)
        self.hooks = hooks
        self.tasks = {}
        self.user_canceled = set()
        self._semaphore = None
        self._limit = None

    def _gate(self, limit):
        if self._semaphore is None or self._limit != limit:
            self._semaphore, self._limit = asyncio.Semaphore(limit), limit
        return self._semaphore

    def start(self, session, job, inputs=None, params=None):
        pid = job["id"]
        task = asyncio.create_task(self._run(session, job, inputs, params or {}))
        self.tasks[pid] = task
        task.add_done_callback(lambda _t, pid=pid: self.tasks.pop(pid, None))
        return task

    def resume(self, session, job):
        """Continue polling after a restart; never resubmits."""
        state = self.store.get(job["id"]) or {}
        if state.get("status") == "submitted" and state.get("task_id"):
            job.update(status="running", step="后端重启，继续查询超分结果")
            return self.start(session, job)
        if state.get("status") == "submitting":
            message = "后端重启时任务正在提交，无法确认是否已被超分服务接收。为避免重复计费请先联系管理员核查再重试"
        else:
            message = "后端重启打断了任务，尚未提交到超分服务，重新运行即可"
            asyncio.create_task(self._cleanup(session, state.get("objects") or []))
        self.store.pop(job["id"])
        job.update(status="error", step="", ended=time.time(), error=message)
        self.hooks.save()
        return None

    async def cancel(self, pid):
        task = self.tasks.get(pid)
        if task is None:
            return False
        self.user_canceled.add(pid)
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)
        return True

    async def shutdown(self):
        tasks = list(self.tasks.values())
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _cleanup(self, session, keys):
        try:
            config = load_config()
        except SRConfigError:
            return
        client = OSSClient(session, config["oss"])
        for key in keys:
            try:
                await client.delete(key)
            except OSSError:
                pass

    async def _run(self, session, job, inputs, params):
        pid = job["id"]
        finished = False
        try:
            config = load_config()
            async with self._gate(config["max_concurrent"]):
                state = self.store.get(pid) or {}
                if not state.get("task_id"):
                    state = await self._submit(session, config, job, inputs, params)
                url = await self._poll(session, config, job, state)
                output = await self._fetch(session, config, job, url)
            job.update(status="done", progress=1.0, step="", outputs=[output],
                       ended=time.time(), error=None)
            finished = True
        except asyncio.CancelledError:
            if pid not in self.user_canceled:
                raise  # shutdown: keep the remote state so the next start resumes polling
            job.update(status="canceled", step="", ended=time.time(),
                       error="已停止等待；超分服务没有取消接口，远端任务可能仍在运行计费")
            finished = True
        except (SRError, OSSError) as exc:
            job.update(status="error", step="", ended=time.time(), error=str(exc))
            finished = True
        except Exception as exc:  # keep the job record honest even on unexpected bugs
            job.update(status="error", step="", ended=time.time(),
                       error=f"超分任务内部错误：{type(exc).__name__}")
            finished = True
        finally:
            self.user_canceled.discard(pid)
            if finished:
                state = self.store.get(pid) or {}
                if state.get("status") != "submitting":
                    await self._cleanup(session, state.get("objects") or [])
                self.store.pop(pid)
                self.hooks.save()

    async def _submit(self, session, config, job, inputs, params):
        pid = job["id"]
        if not inputs or not inputs.get("video"):
            raise SRError("缺少原始视频")
        client = OSSClient(session, config["oss"])
        files = [("video", inputs["video"])] + [(f"ref{i}", p) for i, p in enumerate(inputs.get("refs") or [])]
        job.update(status="running", started=job.get("started") or time.time())
        self.hooks.save()
        urls, objects = [], []
        for index, (label, path) in enumerate(files, 1):
            path = Path(path)
            job.update(step=f"正在上传素材 {index}/{len(files)}",
                       progress=round(0.08 * (index - 1) / len(files), 4))
            key = client.key(pid, f"{label}{path.suffix.lower()}")
            objects.append(key)
            self.store.update(pid, status="uploading", objects=objects)
            await client.put_file(key, path, CONTENT_TYPES.get(path.suffix.lower(), "application/octet-stream"))
            urls.append(client.presign(key, config["sign_seconds"]))
        payload = build_payload(params, urls[0], urls[1:], f"chouka_{pid.replace('-', '')[:16]}")
        job.update(step="正在提交超分任务", progress=0.09)
        self.store.update(pid, status="submitting")

        async def submit_and_record():
            task_id = await submit(session, config, payload)
            self.store.update(pid, status="submitted", task_id=task_id, submitted_at=time.time())

        # A cancel arriving mid-request must not leave acceptance unknown: let the request
        # (bounded by its own timeout) finish so the taskId is recorded either way.
        inner = asyncio.ensure_future(submit_and_record())
        try:
            await asyncio.shield(inner)
        except asyncio.CancelledError:
            await asyncio.gather(inner, return_exceptions=True)
            raise
        return self.store.get(pid)

    async def _poll(self, session, config, job, state):
        submitted_at = state.get("submitted_at") or time.time()
        deadline = submitted_at + config["result_timeout"]
        errors = 0
        job.update(status="running", step="已提交，等待超分服务处理", progress=max(job.get("progress") or 0, 0.1))
        while True:
            try:
                status, url = await query(session, config, state["task_id"])
                errors = 0
            except SRTaskFailed:
                raise
            except SRError as exc:
                errors += 1
                if errors > 3:
                    raise SRError(f"查询超分结果连续失败：{exc}") from exc
                status, url = None, None
            except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                errors += 1
                if errors > 3:
                    raise SRError("查询超分结果连续失败，网络不可用") from exc
                status, url = None, None
            if url:
                return url
            elapsed = time.time() - submitted_at
            job["progress"] = max(job.get("progress") or 0,
                                  round(0.1 + 0.8 * (1 - math.exp(-elapsed / EXPECTED_SECONDS)), 4))
            if status:
                job["step"] = f"超分处理中（{status[:40]}）"
            if time.time() >= deadline:
                raise SRError(f"等待超分结果超时（{config['result_timeout']} 秒）")
            await asyncio.sleep(min(config["poll_interval"], max(0, deadline - time.time())))

    async def _fetch(self, session, config, job, url):
        pid = job["id"]
        name = f"sr_{pid.replace('-', '')[:16]}.mp4"
        locator = f"{pid}/{name}"
        target = self.artifact_dir / pid / name
        target.parent.mkdir(parents=True, exist_ok=True)
        job.update(step="正在下载超分结果", progress=max(job.get("progress") or 0, 0.9))
        await self.hooks.register_output(locator, False)

        def progress(fraction):
            job["progress"] = max(job.get("progress") or 0, round(0.9 + 0.09 * fraction, 4))

        await download(session, config, url, target, progress)
        await self.hooks.register_output(locator, True)
        return {"kind": "video", "filename": name, "type": "output", "subfolder": "",
                "url": f"/api/artifact/{pid}/{name}"}
