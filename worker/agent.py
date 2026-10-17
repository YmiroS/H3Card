# -*- coding: utf-8 -*-
"""Windows pull worker for a Linux-hosted chouka controller."""
import argparse
import asyncio
import copy
import csv
import ctypes
import hashlib
import json
import math
import mimetypes
import os
import platform
import re
import ssl
import subprocess
import sys
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


def worker_mutex_name(config_path):
    normalized = str(Path(config_path).resolve()).replace("/", "\\").casefold()
    digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    return "Global\\ChoukaWorker-" + digest


def restart_in_progress(config_path):
    config_path = Path(config_path).resolve()
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
        state_value = Path(config.get("state_file", "worker-state.json"))
        state_path = state_value if state_value.is_absolute() else config_path.parent / state_value
        state = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else {}
    except (OSError, ValueError) as exc:
        raise AgentError(f"无法读取 Worker 重启状态：{exc}") from exc
    maintenance = state.get("maintenance")
    if not isinstance(maintenance, dict) or maintenance.get("status") != "restarting":
        return False
    try:
        deadline = float(maintenance.get("deadline") or 0)
    except (TypeError, ValueError) as exc:
        raise AgentError(f"Worker 重启期限无效：{exc}") from exc
    return deadline > time.time()


def worker_instance_status(config_path):
    if os.name != "nt":
        return False
    kernel32 = ctypes.windll.kernel32
    open_mutex = kernel32.OpenMutexW
    open_mutex.restype = ctypes.c_void_p
    handle = open_mutex(0x00100000, False, worker_mutex_name(config_path))
    if handle:
        kernel32.CloseHandle(handle)
        return True
    error = kernel32.GetLastError()
    if error != 2:
        raise AgentError(f"无法检查 Worker 是否已运行，Windows 错误码 {error}")
    if restart_in_progress(config_path):
        return True

    command = r"""
$target = [IO.Path]::GetFullPath($env:CHOUKA_WORKER_CONFIG).Replace('/', '\').ToLowerInvariant()
$leaf = [IO.Path]::GetFileName($target).ToLowerInvariant()
$legacy = [IO.Path]::GetFullPath($env:CHOUKA_LEGACY_CONFIG).Replace('/', '\').ToLowerInvariant()
$allowLegacyRelative = $target -eq $legacy
$python = [IO.Path]::GetFullPath($env:CHOUKA_WORKER_PYTHON).Replace('/', '\').ToLowerInvariant()
$selfPid = [int]$env:CHOUKA_STATUS_PID
Get-CimInstance Win32_Process | Where-Object {
  $line = [string]$_.CommandLine
  $normalized = $line.Replace('/', '\').ToLowerInvariant()
  $executable = ([string]$_.ExecutablePath).Replace('/', '\').ToLowerInvariant()
  $configMatch = [regex]::Match(
    $normalized, '(?:^|\s)--config(?:=|\s+)(?:"([^"]+)"|(\S+))'
  )
  $configValue = if ($configMatch.Groups[1].Success) {
    $configMatch.Groups[1].Value
  } else {
    $configMatch.Groups[2].Value
  }
  $_.ProcessId -ne $selfPid -and
    $executable -eq $python -and
    $normalized.Contains('agent.py') -and
    $configMatch.Success -and
    -not $normalized.Contains('--instance-status') -and
    ($configValue -eq $target -or
      ($allowLegacyRelative -and $configValue -eq ('worker\' + $leaf)))
} | Select-Object -First 1 -ExpandProperty ProcessId
"""
    environment = os.environ.copy()
    environment["CHOUKA_WORKER_CONFIG"] = str(Path(config_path).resolve())
    environment["CHOUKA_LEGACY_CONFIG"] = str(Path(__file__).resolve().with_name("config.json"))
    environment["CHOUKA_WORKER_PYTHON"] = sys.executable
    environment["CHOUKA_STATUS_PID"] = str(os.getpid())
    try:
        result = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", command],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
            timeout=20, check=False, env=environment,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise AgentError(f"无法检查旧版 Worker 进程：{exc}") from exc
    if result.returncode != 0:
        raise AgentError("无法检查旧版 Worker 进程")
    return bool(result.stdout.strip())


def acquire_worker_mutex(config_path):
    if os.name != "nt":
        return None
    kernel32 = ctypes.windll.kernel32
    create_mutex = kernel32.CreateMutexW
    create_mutex.restype = ctypes.c_void_p
    handle = create_mutex(None, False, worker_mutex_name(config_path))
    if not handle:
        raise AgentError(f"无法创建 Worker 单实例锁，Windows 错误码 {kernel32.GetLastError()}")
    if kernel32.GetLastError() == 183:
        kernel32.CloseHandle(handle)
        raise AgentError("相同配置的 Worker 已在运行")
    return handle


def close_worker_mutex(handle):
    if handle and os.name == "nt":
        ctypes.windll.kernel32.CloseHandle(handle)


class WorkerAgent:
    def __init__(self, config_path, restart_token=None):
        self.config_path = Path(config_path).resolve()
        self.config = json.loads(self.config_path.read_text(encoding="utf-8"))
        self.restart_token = str(restart_token or "")
        self.fresh_capabilities_ready = False
        self.server = str(self.config["server_url"]).rstrip("/")
        self.comfy = str(self.config.get("comfy_url", "http://127.0.0.1:8188")).rstrip("/")
        self.comfy_ws = self.comfy.replace("http://", "ws://", 1).replace(
            "https://", "wss://", 1
        ) + "/ws"
        self.comfy_input = Path(self.config["comfy_input_dir"]).resolve()
        self.state_path = self.configured_path("state_file", "worker-state.json")
        self.state = self._load_state()
        # 安装标识不依赖 hostname；同机多个 Worker 由管理员显式配置相同标识。
        host_id = (str(self.config.get("capacity_host_id") or "").strip()
                   or self.state.get("host_id") or uuid.uuid4().hex)
        if self.state.get("host_id") != host_id:
            self.state["host_id"] = host_id
            # 已注册的旧安装同样需要立即落盘，不能等下一次注册。
            self._save_state()
        self.session = None
        self.current = None
        self.comfy_lock = asyncio.Lock()
        self.release_failed = None
        self.capabilities = {
            "is_primary_node": self.is_primary_node,
        }
        self.telemetry = {}
        self.last_capability_scan = 0.0
        self.last_telemetry_scan = 0.0
        self.last_release_check = 0.0
        self.comfy_online = False
        self.local_busy = False
        self.pending_sync = None
        maintenance = self.state.get("maintenance")
        if isinstance(maintenance, dict) and maintenance.get("request_id"):
            status = str(maintenance.get("status") or "restarting")
            self.sync_report = {
                "request_id": str(maintenance["request_id"]),
                "status": "error" if status == "error" else (
                    "done" if status == "ready" else "running"
                ),
                "message": str(maintenance.get("message") or "正在重启节点服务"),
            }
        else:
            self.sync_report = None
        self.stop_event = asyncio.Event()

    @property
    def is_primary_node(self):
        return self.config.get("is_primary_node") is True

    def configured_path(self, key, default):
        value = Path(self.config.get(key, default))
        return value if value.is_absolute() else (self.config_path.parent / value).resolve()

    def _load_state(self):
        if not self.state_path.exists():
            return {}
        return json.loads(self.state_path.read_text(encoding="utf-8"))

    def _save_state(self):
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.state_path.with_name(
            self.state_path.name + f".tmp.{os.getpid()}"
        )
        try:
            tmp.write_text(json.dumps(self.state, ensure_ascii=False, indent=2), encoding="utf-8")
            os.replace(tmp, self.state_path)
        finally:
            tmp.unlink(missing_ok=True)

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
        kwargs.setdefault("timeout", aiohttp.ClientTimeout(total=30, sock_connect=15))
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

    @staticmethod
    def _nvidia_gpus():
        fields = "index,name,utilization.gpu,memory.used,memory.total"
        # 旧驱动可能不认识温度字段；失败时只回退一次，不丢掉原有资源指标。
        for query in (fields + ",temperature.gpu", fields):
            command = ["nvidia-smi", "--query-gpu=" + query,
                       "--format=csv,noheader,nounits"]
            try:
                result = subprocess.run(
                    command, capture_output=True, text=True, encoding="utf-8",
                    errors="replace", timeout=5, check=False,
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                )
            except (OSError, subprocess.TimeoutExpired, ValueError):
                return []
            if result.returncode == 0:
                break
        else:
            return []

        gpus = []
        for row in csv.reader(result.stdout.splitlines(), skipinitialspace=True):
            if len(row) < 5:
                continue
            try:
                index = int(row[0].strip())
            except ValueError:
                continue
            try:
                utilization = float(row[2].strip())
            except ValueError:
                utilization = None
            try:
                memory_used = int(float(row[3].strip()) * 1024 ** 2)
                memory_total = int(float(row[4].strip()) * 1024 ** 2)
            except ValueError:
                memory_used = None
                memory_total = None
            temperature = None
            if len(row) >= 6:
                try:
                    value = float(row[5].strip())
                    if math.isfinite(value) and 0 <= value <= 150:
                        temperature = value
                except ValueError:
                    pass
            gpus.append({
                "index": index,
                "temperature_c": temperature,
                "name": row[1].strip(),
                "utilization_percent": utilization,
                "memory_used_bytes": memory_used,
                "memory_total_bytes": memory_total,
            })
        return gpus

    @staticmethod
    def _system_memory():
        if os.name != "nt":
            return None

        class MemoryStatus(ctypes.Structure):
            _fields_ = [
                ("dwLength", ctypes.c_ulong),
                ("dwMemoryLoad", ctypes.c_ulong),
                ("ullTotalPhys", ctypes.c_ulonglong),
                ("ullAvailPhys", ctypes.c_ulonglong),
                ("ullTotalPageFile", ctypes.c_ulonglong),
                ("ullAvailPageFile", ctypes.c_ulonglong),
                ("ullTotalVirtual", ctypes.c_ulonglong),
                ("ullAvailVirtual", ctypes.c_ulonglong),
                ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
            ]

        status = MemoryStatus()
        status.dwLength = ctypes.sizeof(status)
        try:
            ok = ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status))
        except (AttributeError, OSError):
            return None
        if not ok:
            return None
        total = int(status.ullTotalPhys)
        available = int(status.ullAvailPhys)
        return {"used_bytes": total - available, "total_bytes": total}

    def capacity_hardware(self, memory=None, devices=None):
        # 只读取明确允许的配置项，不猜测完整环境版本或复制配置/凭据。
        # __new__ 构造的探针测试没有 state 时，身份明确为未知；不临时生成 UUID。
        state = getattr(self, "state", None)
        return {
            "host_id": state.get("host_id") if state is not None else None,
            "cpu": {
                "model": platform.processor() or None,
                "architecture": platform.machine() or None,
                "logical_cores": os.cpu_count(),
            },
            "os": {
                "name": platform.system(),
                "release": platform.release(),
                "version": platform.version(),
            },
            "memory_total_bytes": (memory or {}).get("total_bytes"),
            "environment_id": self.config.get("capacity_environment_id") or None,
            "model_version": self.config.get("capacity_model_version") or None,
            # ComfyUI 返回的是实际执行设备，不用 nvidia-smi 的第一张卡代替。
            "execution_device": [
                {key: device[key] for key in ("name", "type", "index", "vram_total")
                 if key in device}
                for device in (devices or []) if isinstance(device, dict)
            ] or None,
        }

    def collect_telemetry(self):
        try:
            gpus = self._nvidia_gpus()
        except Exception:
            gpus = []
        try:
            memory = self._system_memory()
        except Exception:
            memory = None
        hardware = self.capacity_hardware(
            memory, (getattr(self, "capabilities", None) or {}).get("devices"),
        )
        return {
            **hardware,
            "hostname": os.environ.get("COMPUTERNAME") or platform.node()
                        or self.config.get("worker_name") or "windows-worker",
            "gpus": gpus,
            "memory": memory,
            "collected_at": time.time(),
        }

    async def scan_telemetry(self):
        self.telemetry = await asyncio.to_thread(self.collect_telemetry)
        self.last_telemetry_scan = time.time()
        self.capabilities["telemetry"] = self.telemetry
        return self.telemetry

    async def scan_capabilities(self):
        await self.scan_telemetry()
        try:
            stats, nodes = await asyncio.gather(
                self._json_request("GET", self.comfy + "/system_stats"),
                self._json_request("GET", self.comfy + "/object_info"),
            )
            if (not isinstance(stats, dict) or not isinstance(nodes, dict)
                    or not nodes or "KSampler" not in nodes):
                raise AgentError("ComfyUI 能力接口尚未完整就绪")
        except Exception as exc:
            self.comfy_online = False
            self.fresh_capabilities_ready = False
            print(f"[Worker] ComfyUI 不可用：{exc}")
            return self.capabilities or None
        self.comfy_online = True
        hardware = self.capacity_hardware(self.telemetry.get("memory"), stats.get("devices"))
        self.telemetry.update(hardware)
        input_choices = {}
        input_types = {}
        for node_class, node in nodes.items():
            choices = {}
            types = {}
            for section in ("required", "optional"):
                for name, spec in (node.get("input", {}).get(section) or {}).items():
                    if name in {"image", "video", "audio"} or not isinstance(spec, (list, tuple)) or not spec:
                        continue
                    if (len(spec) > 1 and isinstance(spec[1], dict)
                            and any(spec[1].get(flag) for flag in ("image_upload", "video_upload", "audio_upload"))):
                        continue
                    if isinstance(spec[0], list):
                        types[name] = "COMBO"
                        choices[name] = spec[0]
                    elif isinstance(spec[0], str):
                        types[name] = spec[0]
                        if (spec[0] == "COMBO" and len(spec) > 1 and isinstance(spec[1], dict)
                                and isinstance(spec[1].get("options"), list)):
                            choices[name] = spec[1]["options"]
            if choices:
                input_choices[node_class] = choices
            if types:
                input_types[node_class] = types
        self.capabilities = {
            "hardware": hardware,
            "node_classes": sorted(nodes.keys()),
            "input_choices": input_choices,
            "input_types": input_types,
            "system": stats.get("system") or {},
            "devices": stats.get("devices") or [],
            "telemetry": self.telemetry,
            "agent_version": 5,
            "supports_capacity_telemetry": 1,
            "supports_file_sync": True,
            "supports_code_restart": True,
            "is_primary_node": self.is_primary_node,
        }
        self.last_capability_scan = time.time()
        self.fresh_capabilities_ready = True
        return self.capabilities

    async def local_status(self):
        try:
            queue = await self._json_request(
                "GET", self.comfy + "/queue",
                timeout=aiohttp.ClientTimeout(total=5, sock_connect=3),
            )
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
            "name": self.config.get("worker_name")
                    or self.telemetry.get("hostname") or "windows-worker",
            "enrollment_token": token,
            "capabilities": capabilities,
        }
        result = await self._json_request(
            "POST", self.server + "/agent/v1/register", json=body, expected=(201,)
        )
        self.state.update(result)
        self._save_state()
        print(f"[Worker] 注册成功：{result['worker_id']}")

    async def confirm_release_recovery(self):
        if not self.release_failed or not self.comfy_online or self.current:
            return
        interval = max(float(self.config.get("release_recheck_seconds", 30)), 10.0)
        now = time.monotonic()
        if now - self.last_release_check < interval:
            return
        self.last_release_check = now
        try:
            ack = await self._json_request(
                "POST", self.comfy + "/free",
                json={"free_memory": True, "unload_models": True, "wait": True},
                timeout=aiohttp.ClientTimeout(total=130, sock_connect=15),
            )
            if not isinstance(ack, dict) or ack.get("cleanup_complete") is not True:
                return
        except Exception:
            return
        self.release_failed = None
        print("[Worker] ComfyUI 已确认显存释放，恢复接单。", flush=True)

    def queue_sync(self, command):
        if self.is_primary_node:
            print("[Worker] 主节点不执行文件同步请求", flush=True)
            return
        request_id = str(command.get("request_id") or "")
        if not request_id:
            return
        if self.pending_sync and self.pending_sync.get("request_id") == request_id:
            return
        if self.sync_report and self.sync_report.get("request_id") == request_id:
            return
        self.pending_sync = {"request_id": request_id}
        print(f"[Worker] 已收到文件同步请求：{request_id}", flush=True)

    def sync_script_path(self):
        return self.configured_path("sync_script", "../同步主节点模型和用户.bat")

    def code_repo_path(self):
        return self.configured_path("code_repo", "..")

    def node_launcher_path(self):
        configured = self.config.get("node_launcher")
        if configured:
            return self.configured_path("node_launcher", configured)
        devices = self.capabilities.get("devices") or self._nvidia_gpus()
        gpu_names = [
            str(item.get("name") or "").casefold()
            for item in devices if isinstance(item, dict)
        ]
        profiles = set()
        if any("rtx 4090" in name for name in gpu_names):
            profiles.add("4090")
        if any("rtx a6000" in name for name in gpu_names):
            profiles.add("A6000")
        if len(profiles) > 1:
            raise AgentError("检测到多个 GPU 启动配置，请在 node_launcher 中明确指定")
        root = self.code_repo_path()
        if profiles == {"4090"}:
            return root / "启动Windows节点_4090.bat"
        if profiles == {"A6000"}:
            return root / "启动Windows节点_A6000.bat"
        return root / "启动Windows节点.bat"

    @staticmethod
    def batch_command_name(path):
        if re.search(r'[\s&|<>^()%!\"]', path.name):
            raise AgentError(f"批处理文件名包含 cmd 不安全字符：{path.name}")
        return f".\\{path.name}"

    async def run_local_command(self, *command, cwd=None, timeout=300):
        flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        if os.name == "nt":
            flags |= getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
        with tempfile.TemporaryFile() as output_file:
            process = await asyncio.create_subprocess_exec(
                *command,
                cwd=str(cwd) if cwd else None,
                stdout=output_file,
                stderr=asyncio.subprocess.STDOUT,
                creationflags=flags,
            )
            try:
                await asyncio.wait_for(process.wait(), timeout=timeout)
            except asyncio.TimeoutError:
                if os.name == "nt":
                    killer = await asyncio.create_subprocess_exec(
                        "taskkill", "/PID", str(process.pid), "/T", "/F",
                        stdout=asyncio.subprocess.DEVNULL,
                        stderr=asyncio.subprocess.DEVNULL,
                        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                    )
                    await asyncio.wait_for(killer.wait(), timeout=30)
                elif process.returncode is None:
                    process.kill()
                try:
                    await asyncio.wait_for(process.wait(), timeout=30)
                except asyncio.TimeoutError:
                    pass
                raise AgentError(f"命令执行超时：{command[0]}")
            output_file.seek(0, os.SEEK_END)
            size = output_file.tell()
            output_file.seek(max(0, size - 65536))
            output = output_file.read()
        text = output.decode("utf-8", errors="replace") if output else ""
        if process.returncode != 0:
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            detail = " | ".join(lines[-6:])[-1000:]
            raise AgentError(detail or f"命令退出码 {process.returncode}：{command[0]}")
        return text.strip()

    async def pull_code(self):
        repo = self.code_repo_path().resolve()
        if not (repo / ".git").exists():
            raise AgentError(f"chouka 不是 Git 仓库：{repo}")
        timeout = max(float(self.config.get("git_pull_timeout_seconds", 300)), 30.0)
        branch = str(self.config.get("code_branch") or "main").strip()
        current = await self.run_local_command(
            "git", "rev-parse", "--abbrev-ref", "HEAD", cwd=repo, timeout=30,
        )
        if current.strip() != branch:
            raise AgentError(f"chouka 当前分支是 {current.strip()}，预期为 {branch}")
        dirty = await self.run_local_command(
            "git", "status", "--porcelain", "--untracked-files=no",
            cwd=repo, timeout=30,
        )
        if dirty:
            raise AgentError("chouka 存在未提交的已跟踪文件，已停止自动更新")
        output = await self.run_local_command(
            "git", "pull", "--ff-only", "origin", branch, cwd=repo, timeout=timeout,
        )
        commit = await self.run_local_command(
            "git", "rev-parse", "HEAD", cwd=repo, timeout=30,
        )
        return commit.strip(), output

    async def schedule_node_restart(self, request_id, commit):
        if os.name != "nt":
            raise AgentError("节点重启只能在 Windows Worker 上运行")
        repo = self.code_repo_path().resolve()
        helper = repo / "worker" / "restart_node.py"
        launcher = self.node_launcher_path().resolve()
        if not helper.is_file():
            raise AgentError(f"找不到节点重启程序：{helper}")
        if not launcher.is_file():
            raise AgentError(f"找不到当前 GPU 的启动脚本：{launcher}")
        await self.run_local_command(
            "cmd.exe", "/d", "/c", "call", self.batch_command_name(launcher), "check",
            cwd=launcher.parent, timeout=30,
        )

        timeout = max(float(self.config.get("restart_timeout_seconds", 300)), 60.0)
        restart_token = uuid.uuid4().hex
        log_path = self.configured_path("restart_log", "logs/restart-node.log")
        log_path.parent.mkdir(parents=True, exist_ok=True)
        maintenance = {
            "request_id": request_id,
            "restart_token": restart_token,
            "status": "restarting",
            "phase": "starting_supervisor",
            "message": f"代码已更新至 {commit[:12]}，正在重启 ComfyUI 和 Worker",
            "target_commit": commit,
            "deadline": time.time() + timeout,
            "log_path": str(log_path),
        }
        self.state["maintenance"] = maintenance
        self._save_state()
        flags = (
            getattr(subprocess, "DETACHED_PROCESS", 0)
            | getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
            | getattr(subprocess, "CREATE_NO_WINDOW", 0)
        )
        try:
            with log_path.open("ab", buffering=0) as output:
                process = await asyncio.create_subprocess_exec(
                    sys.executable, str(helper),
                    "--config", str(self.config_path),
                    "--worker-pid", str(os.getpid()),
                    "--launcher", str(launcher),
                    "--request-id", request_id,
                    "--restart-token", restart_token,
                    cwd=str(repo),
                    stdin=asyncio.subprocess.DEVNULL,
                    stdout=output,
                    stderr=asyncio.subprocess.STDOUT,
                    creationflags=flags,
                )
            acknowledgement_deadline = time.monotonic() + 15
            while time.monotonic() < acknowledgement_deadline:
                await asyncio.sleep(0.2)
                if process.returncode is not None:
                    raise AgentError(
                        f"节点重启程序提前退出：{process.returncode}；日志：{log_path}"
                    )
                state = self._load_state()
                reported = state.get("maintenance")
                if (isinstance(reported, dict)
                        and reported.get("restart_token") == restart_token
                        and reported.get("phase") == "waiting_for_old_worker"):
                    self.state = state
                    break
            else:
                process.terminate()
                raise AgentError(f"节点重启程序未确认接管；日志：{log_path}")
        except Exception as exc:
            message = f"重启监督器接管失败：{exc}"
            maintenance.update(status="error", phase="error", message=message)
            self.state["maintenance"] = maintenance
            self._save_state()
            raise
        self.sync_report = {
            "request_id": request_id,
            "status": "running",
            "message": maintenance["message"],
        }
        self.stop_event.set()

    def refresh_restart_report(self):
        maintenance = self.state.get("maintenance")
        if not isinstance(maintenance, dict) or not maintenance.get("request_id"):
            return
        request_id = str(maintenance["request_id"])
        status = str(maintenance.get("status") or "restarting")
        if status == "error":
            self.sync_report = {
                "request_id": request_id,
                "status": "error",
                "message": str(maintenance.get("message") or "节点重启失败")[:1000],
            }
            return
        if status == "ready":
            self.sync_report = {
                "request_id": request_id,
                "status": "done",
                "message": str(maintenance.get("message") or "代码更新和节点重启完成")[:1000],
            }
            return
        if time.time() >= float(maintenance.get("deadline") or 0):
            log_path = maintenance.get("log_path")
            message = "节点已重启，但 ComfyUI 未在限定时间内恢复就绪"
            if log_path:
                message += f"；日志：{log_path}"
            maintenance.update(status="error", phase="error", message=message)
            self._save_state()
            self.sync_report = {
                "request_id": request_id,
                "status": "error",
                "message": message,
            }
            return
        matching_restart = (
            self.restart_token
            and self.restart_token == maintenance.get("restart_token")
        )
        if matching_restart and self.comfy_online and self.fresh_capabilities_ready:
            commit = str(maintenance.get("target_commit") or "")[:12]
            message = f"代码 {commit} 已拉取，ComfyUI 和 Worker 已重启并就绪"
            maintenance.update(status="ready", phase="ready", message=message)
            self._save_state()
            self.sync_report = {
                "request_id": request_id,
                "status": "done",
                "message": message,
            }
            return
        self.sync_report = {
            "request_id": request_id,
            "status": "running",
            "message": str(maintenance.get("message") or "正在重启 ComfyUI 和 Worker"),
        }

    async def execute_pending_sync(self):
        command = self.pending_sync
        if not command:
            return
        request_id = command["request_id"]
        self.sync_report = {
            "request_id": request_id,
            "status": "running",
            "message": "正在同步 ComfyUI、模型和用户目录",
        }
        print(f"[Worker] 开始同步文件并更新节点：{request_id}", flush=True)
        try:
            if os.name != "nt":
                raise AgentError("文件同步脚本只能在 Windows Worker 上运行")
            script = self.sync_script_path()
            if not script.is_file():
                raise AgentError(f"找不到同步脚本：{script}")
            await self.run_local_command(
                "cmd.exe", "/d", "/c", self.batch_command_name(script),
                "--upgrade", "--non-interactive",
                cwd=script.parent,
                timeout=max(float(self.config.get("file_sync_timeout_seconds", 3600)), 60.0),
            )
            self.sync_report["message"] = "文件同步完成，正在拉取 chouka 代码"
            commit, _ = await self.pull_code()
            print(f"[Worker] chouka 已更新至 {commit[:12]}，准备重启节点", flush=True)
            await self.schedule_node_restart(request_id, commit)
        except Exception as exc:
            self.sync_report = {
                "request_id": request_id,
                "status": "error",
                "message": str(exc)[:1000],
            }
            print(f"[Worker] 节点同步更新失败：{exc}", flush=True)
        finally:
            self.pending_sync = None

    async def heartbeat_loop(self):
        interval = max(float(self.config.get("heartbeat_seconds", 10)), 2.0)
        capability_interval = max(float(self.config.get("capability_scan_seconds", 300)), 30.0)
        telemetry_interval = max(float(self.config.get("telemetry_seconds", interval)), 2.0)
        while not self.stop_event.is_set():
            try:
                await self.local_status()
                await self.confirm_release_recovery()
                now = time.time()
                include_caps = (
                    not self.current
                    and now - self.last_capability_scan >= capability_interval
                )
                if include_caps:
                    await self.scan_capabilities()
                elif now - self.last_telemetry_scan >= telemetry_interval:
                    await self.scan_telemetry()
                self.refresh_restart_report()
                sync_running = bool(
                    self.sync_report and self.sync_report.get("status") == "running"
                )
                body = {
                    "comfy_online": self.comfy_online,
                    "busy": (bool(self.current) or self.local_busy
                             or bool(self.release_failed) or sync_running),
                    "local_busy": (self.local_busy or bool(self.release_failed)
                                   or bool(self.current and self.current.get("_cleanup_task"))
                                   or sync_running),
                    "current_job_id": self.current["job_id"] if self.current else None,
                    "capacity_released": bool(
                        self.current is None and not self.release_failed
                        and self.comfy_online and not self.local_busy
                    ),
                }
                if self.telemetry:
                    body["telemetry"] = self.telemetry
                if include_caps and self.capabilities:
                    body["capabilities"] = self.capabilities
                if self.sync_report:
                    body["maintenance"] = dict(self.sync_report)
                reply = await self._json_request(
                    "POST", self.server + "/agent/v1/heartbeat",
                    headers=self._agent_headers(), json=body,
                )
                if self.current and (reply or {}).get("lease_ttl_seconds") is not None:
                    self.current["_lease_deadline"] = (
                        time.monotonic() + float(reply["lease_ttl_seconds"])
                    )
                acknowledgement = (reply or {}).get("maintenance_ack") or {}
                if (self.sync_report
                        and self.sync_report.get("status") in {"done", "error"}
                        and acknowledgement.get("request_id") == self.sync_report.get("request_id")
                        and acknowledgement.get("status") == self.sync_report.get("status")):
                    maintenance = self.state.get("maintenance")
                    if (isinstance(maintenance, dict)
                            and maintenance.get("request_id") == self.sync_report.get("request_id")):
                        self.state["last_restart_result"] = dict(maintenance)
                        self.state.pop("maintenance", None)
                        self._save_state()
                    self.sync_report = None
                for command in (reply or {}).get("commands", []):
                    if command.get("type") in ("cancel_job", "abort_job"):
                        await self.cancel_current(command.get("job_id"))
                    elif command.get("type") == "sync_files":
                        self.queue_sync(command)
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

    def start_cleanup(self, assignment):
        task = assignment.get("_cleanup_task")
        if task is None:
            task = asyncio.create_task(self.cancel_and_release(assignment))
            assignment["_cleanup_task"] = task
        return task

    async def cancel_current(self, job_id):
        if not self.current or self.current["job_id"] != job_id:
            return
        self.current["cancel_requested"] = True
        # 心跳只发起清理，不等待长达 130 秒的确认，继续为旧任务续租。
        self.start_cleanup(self.current)

    async def cancel_and_release(self, assignment):
        try:
            ws = assignment.get("_ws")
            if ws is not None and not ws.closed:
                await ws.close()
            async with self.comfy_lock:
                cancel_url = self.comfy + f"/api/jobs/{assignment['job_id']}/cancel"
                request_options = {
                    "json": {"free_memory": True},
                    "timeout": aiohttp.ClientTimeout(total=130, sock_connect=15),
                }
                try:
                    ack = await self._json_request("POST", cancel_url, **request_options)
                except (aiohttp.ClientConnectionError, aiohttp.ClientPayloadError):
                    # Retry the idempotent cancellation when delivery or response is uncertain.
                    ack = await self._json_request("POST", cancel_url, **request_options)
                if (not isinstance(ack, dict) or ack.get("cleanup_complete") is not True
                        or not isinstance(ack.get("cancelled"), bool)):
                    raise AgentError("ComfyUI 未确认 cleanup_complete")
            return True
        except Exception as exc:
            self.release_failed = (
                f"显存释放未确认：{type(exc).__name__}: {exc}；"
                "已停止接单，请检查 ComfyUI 后重启相关进程。"
            )
            print(f"[Worker] {self.release_failed}", flush=True)
            return False

    async def acquire(self):
        if self.release_failed or not self.comfy_online or self.local_busy or self.current:
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
            # 素材仅能通过当前任务租约下载，不能使用公开上传路径。
            url = self.server + f"/agent/v1/jobs/{assignment['job_id']}/inputs/{filename}"
            async with self.session.get(
                url, headers=self._agent_headers(assignment["lease_token"]),
                allow_redirects=False,
            ) as response:
                if response.status != 200:
                    raise JobFailed(f"下载素材 {filename} 失败：HTTP {response.status}")
                with tmp.open("wb") as fp:
                    async for chunk in response.content.iter_chunked(1024 * 1024):
                        fp.write(chunk)
            os.replace(tmp, target)

    def _ffmpeg_bin(self):
        configured = self.config.get("ffmpeg_path")
        if configured and Path(configured).is_file():
            return Path(configured)
        pack = self.comfy_input.parent.parent
        directory = pack / "python_embeded/Lib/site-packages/imageio_ffmpeg/binaries"
        return next(iter(sorted(directory.glob("ffmpeg-*.exe"), reverse=True)), None)

    @staticmethod
    def _remove_output_links(graph, source_node, output_index):
        removed = 0
        for node in graph.values():
            inputs = node.get("inputs") if isinstance(node, dict) else None
            if not isinstance(inputs, dict):
                continue
            for key, value in list(inputs.items()):
                if (isinstance(value, list) and len(value) == 2
                        and str(value[0]) == str(source_node)
                        and value[1] == output_index):
                    inputs.pop(key)
                    removed += 1
        return removed

    def _probe_has_audio(self, path):
        ffmpeg = self._ffmpeg_bin()
        if ffmpeg is None:
            return None
        try:
            result = subprocess.run(
                [str(ffmpeg), "-i", str(path)], capture_output=True,
                text=True, errors="ignore", timeout=30,
            )
        except (OSError, subprocess.SubprocessError):
            return None
        return bool(re.search(r"^\s*Stream #\d+:\d+.*:\s*Audio:",
                              result.stderr or "", re.MULTILINE))

    async def patch_silent_video_audio(self, assignment):
        graph = assignment["payload"].get("graph") or {}
        video_nodes = [
            (str(node_id), node) for node_id, node in graph.items()
            if isinstance(node, dict) and node.get("class_type") == "VHS_LoadVideo"
        ]
        if not video_nodes:
            return
        try:
            info = await self._json_request(
                "GET", self.comfy + "/object_info/VHS_LoadVideo"
            )
            output_types = (info.get("VHS_LoadVideo") or {}).get("output") or []
            audio_index = output_types.index("AUDIO")
        except (AgentError, ValueError):
            return
        for node_id, node in video_nodes:
            ref = (node.get("inputs") or {}).get("video")
            if not isinstance(ref, str):
                continue
            try:
                path, _filename = self._input_target(ref)
            except JobFailed:
                continue
            has_audio = await asyncio.to_thread(self._probe_has_audio, path)
            if has_audio is False:
                removed = self._remove_output_links(graph, node_id, audio_index)
                if removed:
                    print(
                        f"[Worker] 视频 {path.name} 没有音轨，已断开 {removed} 条音频引用",
                        flush=True,
                    )

    async def report_event(self, assignment, event):
        await self._json_request(
            "POST",
            self.server + f"/agent/v1/jobs/{assignment['job_id']}/event",
            headers=self._agent_headers(assignment["lease_token"]),
            json=event,
        )

    async def history_finished(self, job_id):
        history = await self._json_request(
            "GET", self.comfy + f"/history/{job_id}",
            timeout=aiohttp.ClientTimeout(total=5, sock_connect=3),
        )
        entry = history.get(job_id) or {}
        status = entry.get("status") or {}
        if not status.get("completed"):
            return False
        if status.get("status_str") == "success":
            return True
        for event_type, data in reversed(status.get("messages") or []):
            if event_type == "execution_interrupted":
                raise JobFailed("任务已取消", canceled=True)
            if event_type == "execution_error":
                raise JobFailed(data.get("exception_message") or "ComfyUI 执行失败")
        raise JobFailed("ComfyUI 执行失败")

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
                f"{self.comfy_ws}?clientId={client_id}") as ws:
            assignment["_ws"] = ws
            async with self.comfy_lock:
                if assignment.get("cancel_requested"):
                    raise JobFailed("任务已取消", canceled=True)
                if self.release_failed:
                    raise JobFailed(self.release_failed)
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
            next_history_check = time.monotonic() + 5
            while True:
                if assignment.get("cancel_requested"):
                    raise JobFailed("任务已取消", canceled=True)
                timeout = max(next_history_check - time.monotonic(), 0.1)
                try:
                    msg = await ws.receive(timeout=timeout)
                except asyncio.TimeoutError:
                    msg = None
                if assignment.get("cancel_requested"):
                    raise JobFailed("任务已取消", canceled=True)
                if time.monotonic() >= next_history_check:
                    next_history_check = time.monotonic() + 5
                    try:
                        if await self.history_finished(job_id):
                            return
                    except JobFailed:
                        raise
                    except (aiohttp.ClientError, asyncio.TimeoutError, AgentError):
                        pass
                if msg is None:
                    continue
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
                if event_type == "execution_cached":
                    measurements = assignment.setdefault("_capacity_measurements", {})
                    cached = measurements.setdefault("cached_nodes", [])
                    graph = assignment["payload"]["graph"]
                    known_ids = {node["id"] for node in cached}
                    for node_id in data.get("nodes") or []:
                        node_id = str(node_id)
                        if node_id not in known_ids:
                            node = graph.get(node_id) or {}
                            cached.append({"id": node_id, "type": node.get("class_type")})
                            known_ids.add(node_id)
                    # 部分节点缓存并不代表整个生成命中缓存，不派生全命中标志。
                if event_type in ("execution_error", "execution_interrupted"):
                    data["cleanup_pending"] = True
                    self.start_cleanup(assignment)
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
                if event_type == "execution_success" or (
                        event_type == "executing" and data.get("node") is None):
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
                        timeout=aiohttp.ClientTimeout(total=None, sock_connect=15),
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
        started = time.monotonic()
        ttl = max(float(assignment.get("lease_expires_at", 0)) - time.time(), 1.0)
        assignment["_lease_deadline"] = started + ttl
        self.current = assignment
        job_id = assignment["job_id"]
        measurements = {}
        assignment["_capacity_measurements"] = measurements
        # 旧 Controller 没有 attempt_id，仍按原租约正常执行和回报。
        attempt = {"attempt_id": assignment["attempt_id"]} if assignment.get("attempt_id") else {}
        print(f"[Worker] 领取任务 {job_id}")
        try:
            # 准备过程会原地改图，必须先做独立快照；只回报差异布尔值。
            original_graph = copy.deepcopy(assignment["payload"].get("graph") or {})
            await self.prepare_inputs(assignment)
            await self.patch_silent_video_audio(assignment)
            measurements["graph_changed"] = (
                original_graph != (assignment["payload"].get("graph") or {})
            )
            prepared = time.monotonic()
            measurements["prepare_seconds"] = prepared - started
            await self.execute_comfy(assignment)
            executed = time.monotonic()
            measurements["execute_seconds"] = executed - prepared
            if assignment.get("cancel_requested"):
                raise JobFailed("任务已取消", canceled=True)
            outputs = await self.collect_outputs(assignment)
            uploaded = time.monotonic()
            measurements["upload_seconds"] = uploaded - executed
            if assignment.get("cancel_requested"):
                raise JobFailed("任务已取消", canceled=True)
            measurements["total_seconds"] = uploaded - started
            await self._json_request(
                "POST", self.server + f"/agent/v1/jobs/{job_id}/complete",
                headers=self._agent_headers(assignment["lease_token"]),
                json={"outputs": outputs, **attempt,
                      "capacity_measurements": dict(measurements),
                      "capacity_released": (assignment.get("_cleanup_task") is None
                                            and not self.release_failed)},
            )
            print(f"[Worker] 任务完成 {job_id}，产物 {len(outputs)} 个")
        except (Exception, asyncio.CancelledError) as exc:
            canceled = (isinstance(exc, JobFailed) and exc.canceled
                        or bool(assignment.get("cancel_requested")))
            released = await asyncio.shield(self.start_cleanup(assignment))
            # 未完成阶段保持缺失；总时长记录到清理返回，释放失败仍明确标为未释放。
            measurements["total_seconds"] = time.monotonic() - started
            error = str(exc) if released else self.release_failed
            print(f"[Worker] 任务失败 {job_id}：{error}")
            try:
                await self._json_request(
                    "POST", self.server + f"/agent/v1/jobs/{job_id}/failed",
                    headers=self._agent_headers(assignment["lease_token"]),
                    json={"error": error, "canceled": bool(canceled and released),
                          **attempt, "capacity_measurements": dict(measurements),
                          "capacity_released": bool(released)},
                )
            except Exception as report_error:
                print(f"[Worker] 上报失败状态失败：{report_error}")
            if isinstance(exc, asyncio.CancelledError):
                raise
        finally:
            task = assignment.get("_cleanup_task")
            if task is not None:
                await asyncio.shield(task)
            self.current = None

    async def run(self):
        timeout = aiohttp.ClientTimeout(total=None, sock_connect=15)
        connector = aiohttp.TCPConnector(ssl=self._ssl_context())
        async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
            self.session = session
            await self.ensure_registered()
            await self.scan_capabilities()
            self.refresh_restart_report()
            self.last_capability_scan = 0.0
            heartbeat = asyncio.create_task(self.heartbeat_loop())
            try:
                while not self.stop_event.is_set():
                    try:
                        await self.local_status()
                        if self.pending_sync and not self.local_busy and not self.release_failed:
                            await self.execute_pending_sync()
                            continue
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
    parser.add_argument("--instance-status", action="store_true")
    parser.add_argument("--restart-token", default="")
    args = parser.parse_args()
    if args.instance_status:
        try:
            raise SystemExit(0 if worker_instance_status(args.config) else 1)
        except AgentError as exc:
            print(f"[Worker] {exc}", file=sys.stderr)
            raise SystemExit(2) from exc
    handle = None
    try:
        if not args.restart_token and restart_in_progress(args.config):
            raise AgentError("节点正在执行同步重启，不能启动重复 Worker")
        handle = acquire_worker_mutex(args.config)
        asyncio.run(WorkerAgent(args.config, restart_token=args.restart_token).run())
    except KeyboardInterrupt:
        pass
    except Exception as exc:
        raise SystemExit(f"[Worker] 启动失败：{exc}") from exc
    finally:
        close_worker_mutex(handle)


if __name__ == "__main__":
    main()
