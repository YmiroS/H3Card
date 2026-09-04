# -*- coding: utf-8 -*-
"""Windows pull worker for a Linux-hosted chouka controller."""
import argparse
import asyncio
import json
import mimetypes
import os
import ssl
import tempfile
import time
import uuid
from pathlib import Path, PurePosixPath

import aiohttp


class AgentError(RuntimeError):
    pass


class JobFailed(AgentError):
    def __init__(self, message, canceled=False):
        super().__init__(message)
        self.canceled = canceled


class WorkerAgent:
    def __init__(self, config_path):
        self.config_path = Path(config_path).resolve()
        self.config = json.loads(self.config_path.read_text(encoding="utf-8"))
        self.server = str(self.config["server_url"]).rstrip("/")
        self.comfy = str(self.config.get("comfy_url", "http://127.0.0.1:8188")).rstrip("/")
        self.comfy_ws = self.comfy.replace("http://", "ws://", 1).replace(
            "https://", "wss://", 1
        ) + "/ws"
        self.comfy_input = Path(self.config["comfy_input_dir"]).resolve()
        state_value = self.config.get("state_file", "worker-state.json")
        state_path = Path(state_value)
        self.state_path = state_path if state_path.is_absolute() else self.config_path.parent / state_path
        self.state = self._load_state()
        self.session = None
        self.current = None
        self.capabilities = {}
        self.last_capability_scan = 0.0
        self.comfy_online = False
        self.local_busy = False
        self.stop_event = asyncio.Event()

    def _load_state(self):
        if not self.state_path.exists():
            return {}
        return json.loads(self.state_path.read_text(encoding="utf-8"))

    def _save_state(self):
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.state_path.with_suffix(self.state_path.suffix + ".tmp")
        tmp.write_text(json.dumps(self.state, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(tmp, self.state_path)

    def _ssl_context(self):
        ca_file = self.config.get("ca_file")
        return ssl.create_default_context(cafile=ca_file) if ca_file else ssl.create_default_context()

    def _agent_headers(self, lease_token=None):
        headers = {
            "X-Worker-ID": self.state.get("worker_id", ""),
            "Authorization": f"Bearer {self.state.get('worker_token', '')}",
        }
        if lease_token:
            headers["X-Lease-Token"] = lease_token
        return headers

    async def _json_request(self, method, url, *, expected=(200,), **kwargs):
        async with self.session.request(method, url, **kwargs) as response:
            text = await response.text()
            if response.status not in expected:
                raise AgentError(f"{method} {url} -> {response.status}: {text[:500]}")
            if response.status == 204 or not text:
                return None
            try:
                return json.loads(text)
            except ValueError as exc:
                raise AgentError(f"{method} {url} 返回了非 JSON 内容") from exc

    async def scan_capabilities(self):
        try:
            stats, nodes = await asyncio.gather(
                self._json_request("GET", self.comfy + "/system_stats"),
                self._json_request("GET", self.comfy + "/object_info"),
            )
        except Exception as exc:
            self.comfy_online = False
            print(f"[Worker] ComfyUI 不可用：{exc}")
            return None
        self.comfy_online = True
        self.capabilities = {
            "node_classes": sorted(nodes.keys()),
            "system": stats.get("system") or {},
            "devices": stats.get("devices") or [],
            "agent_version": 1,
        }
        self.last_capability_scan = time.time()
        return self.capabilities

    async def local_status(self):
        try:
            queue = await self._json_request("GET", self.comfy + "/queue")
        except Exception:
            self.comfy_online = False
            self.local_busy = False
            return
        self.comfy_online = True
        self.local_busy = bool(queue.get("queue_running") or queue.get("queue_pending"))

    async def ensure_registered(self):
        if self.state.get("worker_id") and self.state.get("worker_token"):
            return
        capabilities = await self.scan_capabilities() or {}
        token = str(self.config.get("enrollment_token") or "")
        if not token:
            raise AgentError("首次启动缺少 enrollment_token")
        body = {
            "name": self.config.get("worker_name") or os.environ.get("COMPUTERNAME") or "windows-worker",
            "enrollment_token": token,
            "capabilities": capabilities,
        }
        result = await self._json_request(
            "POST", self.server + "/agent/v1/register", json=body, expected=(201,)
        )
        self.state.update(result)
        self._save_state()
        print(f"[Worker] 注册成功：{result['worker_id']}")

    async def heartbeat_loop(self):
        interval = max(float(self.config.get("heartbeat_seconds", 10)), 2.0)
        capability_interval = max(float(self.config.get("capability_scan_seconds", 300)), 30.0)
        while not self.stop_event.is_set():
            try:
                await self.local_status()
                include_caps = time.time() - self.last_capability_scan >= capability_interval
                if include_caps:
                    await self.scan_capabilities()
                body = {
                    "comfy_online": self.comfy_online,
                    "busy": bool(self.current) or self.local_busy,
                    "current_job_id": self.current["job_id"] if self.current else None,
                }
                if include_caps and self.capabilities:
                    body["capabilities"] = self.capabilities
                reply = await self._json_request(
                    "POST", self.server + "/agent/v1/heartbeat",
                    headers=self._agent_headers(), json=body,
                )
                if self.current and (reply or {}).get("lease_ttl_seconds") is not None:
                    self.current["_lease_deadline"] = (
                        time.monotonic() + float(reply["lease_ttl_seconds"])
                    )
                for command in (reply or {}).get("commands", []):
                    if command.get("type") == "cancel_job":
                        await self.cancel_current(command.get("job_id"))
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                print(f"[Worker] 心跳失败：{exc}")
                # 网络分区超过租约后，控制层可能已把任务派给别的机器。
                # 本机必须停掉旧执行，不能继续消耗 GPU 并产生重复产物。
                if (self.current and not self.current.get("cancel_requested")
                        and time.monotonic() >= self.current.get("_lease_deadline", 0)):
                    await self.cancel_current(self.current["job_id"])
            try:
                await asyncio.wait_for(self.stop_event.wait(), timeout=interval)
            except asyncio.TimeoutError:
                pass

    async def cancel_current(self, job_id):
        if not self.current or self.current["job_id"] != job_id:
            return
        print(f"[Worker] 正在取消任务 {job_id}")
        try:
            await self._json_request(
                "POST", self.comfy + f"/api/jobs/{job_id}/cancel", json={}
            )
        except Exception:
            try:
                await self._json_request(
                    "POST", self.comfy + "/interrupt", json={"prompt_id": job_id}
                )
            except Exception as exc:
                print(f"[Worker] 取消 ComfyUI 任务失败：{exc}")
        self.current["cancel_requested"] = True

    async def acquire(self):
        if not self.comfy_online or self.local_busy or self.current:
            return None
        return await self._json_request(
            "POST", self.server + "/agent/v1/jobs/acquire",
            headers=self._agent_headers(), json={}, expected=(200, 204),
        )

    def _input_target(self, ref):
        parts = PurePosixPath(str(ref).replace("\\", "/")).parts
        if len(parts) != 2 or parts[0] != "chouka" or parts[1] in ("", ".", ".."):
            raise JobFailed(f"不支持的素材引用：{ref}")
        root = self.comfy_input.resolve()
        target = (root / parts[0] / parts[1]).resolve()
        if root not in target.parents:
            raise JobFailed(f"非法素材路径：{ref}")
        return target, parts[1]

    async def prepare_inputs(self, assignment):
        refs = set((assignment["payload"].get("assets") or {}).values())
        for ref in refs:
            target, filename = self._input_target(ref)
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.is_file() and target.stat().st_size > 0:
                continue
            tmp = target.with_suffix(target.suffix + ".part")
            async with self.session.get(self.server + f"/api/upload/{filename}") as response:
                if response.status != 200:
                    raise JobFailed(f"下载素材 {filename} 失败：HTTP {response.status}")
                with tmp.open("wb") as fp:
                    async for chunk in response.content.iter_chunked(1024 * 1024):
                        fp.write(chunk)
            os.replace(tmp, target)

    async def report_event(self, assignment, event):
        await self._json_request(
            "POST",
            self.server + f"/agent/v1/jobs/{assignment['job_id']}/event",
            headers=self._agent_headers(assignment["lease_token"]),
            json=event,
        )

    async def execute_comfy(self, assignment):
        job_id = assignment["job_id"]
        lease = assignment["lease_token"]
        client_id = uuid.uuid4().hex
        await self._json_request(
            "POST", self.server + f"/agent/v1/jobs/{job_id}/start",
            headers=self._agent_headers(lease), json={},
        )
        last_progress = 0.0
        async with self.session.ws_connect(
                f"{self.comfy_ws}?clientId={client_id}", heartbeat=20) as ws:
            result = await self._json_request(
                "POST", self.comfy + "/prompt",
                json={
                    "prompt": assignment["payload"]["graph"],
                    "client_id": client_id,
                    "prompt_id": job_id,
                },
            )
            if result.get("prompt_id") != job_id:
                raise JobFailed("ComfyUI 返回了不同的 prompt_id")
            while True:
                msg = await ws.receive()
                if msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                    raise JobFailed("ComfyUI WebSocket 已断开")
                if msg.type != aiohttp.WSMsgType.TEXT:
                    continue
                try:
                    event = json.loads(msg.data)
                except ValueError:
                    continue
                data = event.get("data") or {}
                if data.get("prompt_id") != job_id:
                    continue
                event_type = event.get("type")
                now = time.monotonic()
                if event_type != "progress_state" or now - last_progress >= 0.5:
                    await self.report_event(assignment, event)
                    if event_type == "progress_state":
                        last_progress = now
                if event_type == "execution_error":
                    message = data.get("exception_message") or "ComfyUI 执行失败"
                    raise JobFailed(message)
                if event_type == "execution_interrupted":
                    raise JobFailed("任务已取消", canceled=True)
                if event_type == "executing" and data.get("node") is None:
                    return

    async def collect_outputs(self, assignment):
        job_id = assignment["job_id"]
        history = await self._json_request("GET", self.comfy + f"/history/{job_id}")
        entry = history.get(job_id) or {}
        candidates = []
        seen = set()
        for output in (entry.get("outputs") or {}).values():
            for value in output.values():
                if not isinstance(value, list):
                    continue
                for item in value:
                    if not isinstance(item, dict) or not item.get("filename"):
                        continue
                    key = (item["filename"], item.get("subfolder", ""), item.get("type", "output"))
                    if key in seen:
                        continue
                    seen.add(key)
                    candidates.append(item)
        real = [item for item in candidates if item.get("type", "output") == "output"]
        return await self.upload_outputs(assignment, real or candidates)

    async def upload_outputs(self, assignment, items):
        outputs = []
        with tempfile.TemporaryDirectory(prefix="chouka-worker-") as temp_dir:
            for index, item in enumerate(items):
                original = Path(item["filename"]).name
                local = Path(temp_dir) / f"{index:04d}_{original}"
                params = {
                    "filename": item["filename"],
                    "subfolder": item.get("subfolder", ""),
                    "type": item.get("type", "output"),
                }
                async with self.session.get(self.comfy + "/view", params=params) as response:
                    if response.status != 200:
                        raise JobFailed(f"读取产物 {original} 失败：HTTP {response.status}")
                    with local.open("wb") as fp:
                        async for chunk in response.content.iter_chunked(1024 * 1024):
                            fp.write(chunk)
                kind = self._kind_of(original)
                with local.open("rb") as fp:
                    form = aiohttp.FormData()
                    form.add_field(
                        "file", fp, filename=original,
                        content_type=mimetypes.guess_type(original)[0] or "application/octet-stream",
                    )
                    output = await self._json_request(
                        "POST",
                        self.server + f"/agent/v1/jobs/{assignment['job_id']}/artifact",
                        headers=self._agent_headers(assignment["lease_token"]),
                        params={"kind": kind}, data=form, expected=(201,),
                    )
                outputs.append(output)
        return outputs

    @staticmethod
    def _kind_of(filename):
        suffix = Path(filename).suffix.lower()
        if suffix in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}:
            return "image"
        if suffix in {".mp4", ".webm", ".mkv", ".mov", ".avi"}:
            return "video"
        if suffix in {".mp3", ".wav", ".flac", ".ogg", ".m4a"}:
            return "audio"
        return "file"

    async def execute(self, assignment):
        ttl = max(float(assignment.get("lease_expires_at", 0)) - time.time(), 1.0)
        assignment["_lease_deadline"] = time.monotonic() + ttl
        self.current = assignment
        job_id = assignment["job_id"]
        print(f"[Worker] 领取任务 {job_id}")
        try:
            await self.prepare_inputs(assignment)
            await self.execute_comfy(assignment)
            outputs = await self.collect_outputs(assignment)
            await self._json_request(
                "POST", self.server + f"/agent/v1/jobs/{job_id}/complete",
                headers=self._agent_headers(assignment["lease_token"]),
                json={"outputs": outputs},
            )
            print(f"[Worker] 任务完成 {job_id}，产物 {len(outputs)} 个")
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            canceled = isinstance(exc, JobFailed) and exc.canceled
            if self.current and self.current.get("cancel_requested"):
                canceled = True
            print(f"[Worker] 任务失败 {job_id}：{exc}")
            try:
                await self._json_request(
                    "POST", self.server + f"/agent/v1/jobs/{job_id}/failed",
                    headers=self._agent_headers(assignment["lease_token"]),
                    json={"error": str(exc), "canceled": canceled},
                )
            except Exception as report_error:
                print(f"[Worker] 上报失败状态失败：{report_error}")
        finally:
            self.current = None

    async def run(self):
        timeout = aiohttp.ClientTimeout(total=None, sock_connect=15)
        connector = aiohttp.TCPConnector(ssl=self._ssl_context())
        async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
            self.session = session
            await self.ensure_registered()
            await self.scan_capabilities()
            heartbeat = asyncio.create_task(self.heartbeat_loop())
            try:
                while not self.stop_event.is_set():
                    try:
                        await self.local_status()
                        assignment = await self.acquire()
                        if assignment:
                            await self.execute(assignment)
                            continue
                    except asyncio.CancelledError:
                        raise
                    except Exception as exc:
                        print(f"[Worker] 领取任务失败：{exc}")
                    try:
                        await asyncio.wait_for(self.stop_event.wait(), timeout=3)
                    except asyncio.TimeoutError:
                        pass
            finally:
                self.stop_event.set()
                heartbeat.cancel()
                await asyncio.gather(heartbeat, return_exceptions=True)


def main():
    parser = argparse.ArgumentParser(description="Chouka distributed ComfyUI worker")
    parser.add_argument("--config", required=True, help="Worker JSON configuration file")
    args = parser.parse_args()
    try:
        asyncio.run(WorkerAgent(args.config).run())
    except KeyboardInterrupt:
        pass
    except Exception as exc:
        raise SystemExit(f"[Worker] 启动失败：{exc}") from exc


if __name__ == "__main__":
    main()
