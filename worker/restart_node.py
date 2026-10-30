# -*- coding: utf-8 -*-
"""Detached Windows supervisor used to restart ComfyUI and the worker."""
import argparse
import ctypes
import json
import os
import re
import subprocess
import sys
import time
import uuid
from pathlib import Path
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import ProxyHandler, build_opener


def configured_path(config_path, config, key, default):
    value = Path(config.get(key, default))
    return value if value.is_absolute() else config_path.parent / value


def state_path_for(config_path, config):
    return configured_path(config_path, config, "state_file", "worker-state.json")


def configure_logging(config_path, config):
    log_path = configured_path(
        config_path, config, "restart_log", "logs/restart-node.log"
    )
    log_path.parent.mkdir(parents=True, exist_ok=True)
    output = log_path.open("a", encoding="utf-8", buffering=1)
    sys.stdout = output
    sys.stderr = output
    return log_path


def log_event(message):
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {message}", flush=True)


def update_maintenance(state_path, *, request_id=None, expected_restart_token=None, **values):
    state = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else {}
    maintenance = state.get("maintenance")
    if not isinstance(maintenance, dict):
        return False
    if request_id is not None and maintenance.get("request_id") != request_id:
        return False
    if (expected_restart_token is not None
            and maintenance.get("restart_token") != expected_restart_token):
        return False
    if "message" in values:
        values["message"] = str(values["message"])[:1000]
    maintenance.update(values)
    temporary = state_path.with_name(state_path.name + f".tmp.{os.getpid()}")
    try:
        temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(temporary, state_path)
    finally:
        temporary.unlink(missing_ok=True)
    return True


def wait_for_process_exit(pid, timeout=60, *, terminate=False):
    synchronize = 0x00100000
    kernel32 = ctypes.windll.kernel32
    handle = kernel32.OpenProcess(synchronize | (0x0001 if terminate else 0), False, int(pid))
    if not handle:
        error = kernel32.GetLastError()
        if error == 87:
            return
        if error == 5:
            raise RuntimeError("没有权限确认旧 Worker 是否已经退出")
        raise RuntimeError(f"无法确认旧 Worker 状态，Windows 错误码 {error}")
    try:
        if terminate and kernel32.WaitForSingleObject(handle, 0) != 0:
            # 只结束旧 Worker，不能杀进程树：本监督器也是它的子进程。
            if not kernel32.TerminateProcess(handle, 1):
                error = kernel32.GetLastError()
                # 接管握手后旧 Worker 可能自行退出；同一句柄确认，避免误报权限失败。
                if kernel32.WaitForSingleObject(handle, 0) != 0:
                    raise RuntimeError(f"无法中断旧 Worker，Windows 错误码 {error}")
        result = kernel32.WaitForSingleObject(handle, int(timeout * 1000))
        if result == 0:
            return
        if result == 0x00000102:
            raise RuntimeError("旧 Worker 未在限定时间内退出")
        if result == 0xFFFFFFFF:
            raise RuntimeError(
                f"等待旧 Worker 退出失败，Windows 错误码 {kernel32.GetLastError()}"
            )
        raise RuntimeError(f"等待旧 Worker 返回未知状态 {result}")
    finally:
        kernel32.CloseHandle(handle)


def listening_pid(port):
    result = subprocess.run(
        ["netstat", "-ano", "-p", "tcp"], capture_output=True, text=True,
        encoding="utf-8", errors="replace", timeout=15, check=False,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    if result.returncode != 0:
        raise RuntimeError("无法读取本机端口占用信息")
    pattern = re.compile(r"^\s*TCP\s+(\S+)\s+\S+\s+LISTENING\s+(\d+)\s*$", re.I)
    for line in result.stdout.splitlines():
        match = pattern.match(line)
        if not match:
            continue
        local = match.group(1)
        try:
            local_port = int(local.rsplit(":", 1)[1])
        except (IndexError, ValueError):
            continue
        if local_port == port:
            return int(match.group(2))
    return None


def process_command_line(pid):
    command = (
        f"(Get-CimInstance Win32_Process -Filter \"ProcessId = {int(pid)}\").CommandLine"
    )
    result = subprocess.run(
        ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", command],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
        timeout=20, check=False,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    if result.returncode != 0:
        raise RuntimeError("无法确认 8188 端口对应的进程")
    return result.stdout.strip()


def stop_comfy(comfy_url):
    parsed = urlparse(comfy_url)
    if parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        raise RuntimeError("自动重启只支持本机 ComfyUI 地址")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    pid = listening_pid(port)
    if pid is None:
        return
    command_line = process_command_line(pid).replace("\\", "/").casefold()
    if "main.py" not in command_line or "comfyui" not in command_line:
        raise RuntimeError(f"端口 {port} 不是预期的 ComfyUI 进程，拒绝结束 PID {pid}")
    result = subprocess.run(
        ["taskkill", "/PID", str(pid), "/T", "/F"],
        capture_output=True, timeout=30, check=False,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if listening_pid(port) is None:
            return
        time.sleep(0.5)
    detail = result.stdout.decode("utf-8", errors="replace") if result.stdout else ""
    raise RuntimeError(detail.strip() or f"ComfyUI PID {pid} 未能退出")


def wait_for_comfy_ready(comfy_url, deadline):
    parsed = urlparse(comfy_url)
    if parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        raise RuntimeError("自动重启只支持本机 ComfyUI 地址")
    opener = build_opener(ProxyHandler({}))
    last_error = "服务尚未响应"
    while time.time() < deadline:
        try:
            endpoint = "/system_stats"
            with opener.open(comfy_url.rstrip("/") + endpoint, timeout=10) as response:
                if response.status != 200:
                    raise RuntimeError(f"{endpoint} 返回 HTTP {response.status}")
                payload = json.load(response)
            if (not isinstance(payload, dict)
                    or not isinstance(payload.get("system"), dict)
                    or not isinstance(payload.get("devices"), list)):
                raise RuntimeError(f"{endpoint} 返回内容无效")
            log_event("ComfyUI 已通过 /system_stats 就绪检查")
            return
        except (OSError, ValueError, RuntimeError, URLError) as exc:
            last_error = f"{type(exc).__name__}: {exc}"
            time.sleep(2)
    raise RuntimeError(f"ComfyUI 未在限定时间内恢复就绪：{last_error}")


def start_launcher(launcher, timeout=300):
    if re.search(r'[\s&|<>^()%!\"]', launcher.name):
        raise RuntimeError(f"启动脚本文件名包含 cmd 不安全字符：{launcher.name}")
    log_event(f"执行 ComfyUI 启动脚本：{launcher}")
    flags = (
        getattr(subprocess, "CREATE_NEW_CONSOLE", 0)
        | getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
    )
    process = subprocess.Popen(
        ["cmd.exe", "/d", "/c", "call", f".\\{launcher.name}", "--comfy-start-only"],
        cwd=str(launcher.parent),
        creationflags=flags,
        stdout=getattr(sys.stdout, "buffer", sys.stdout),
        stderr=subprocess.STDOUT,
    )
    try:
        returncode = process.wait(timeout=max(float(timeout), 60.0))
    except subprocess.TimeoutExpired as exc:
        process.kill()
        raise RuntimeError("节点启动脚本未在限定时间内返回") from exc
    if returncode != 0:
        raise RuntimeError(f"节点启动脚本退出码 {returncode}")


def start_worker(config_path, restart_token, worker_log):
    agent = Path(__file__).resolve().with_name("agent.py")
    flags = (
        getattr(subprocess, "CREATE_NEW_CONSOLE", 0)
        | getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
    )
    worker_log.parent.mkdir(parents=True, exist_ok=True)
    with worker_log.open("ab", buffering=0) as output:
        worker = subprocess.Popen(
            [sys.executable, "-u", str(agent), "--config", str(config_path),
             "--restart-token", restart_token],
            cwd=str(agent.parent), creationflags=flags,
            stdout=output, stderr=subprocess.STDOUT,
        )
    log_event(f"已启动新 Worker PID {worker.pid}；日志：{worker_log}")
    return worker


def restart_result(state, request_id, restart_token):
    for key in ("maintenance", "last_restart_result"):
        result = state.get(key)
        if (isinstance(result, dict)
                and result.get("request_id") == request_id
                and result.get("restart_token") == restart_token):
            return result
    return None


def wait_for_restart_result(state_path, worker, deadline, request_id, restart_token):
    while time.time() < deadline:
        if worker.poll() is not None:
            raise RuntimeError(f"新 Worker 提前退出：{worker.returncode}")
        state = json.loads(state_path.read_text(encoding="utf-8"))
        result = restart_result(state, request_id, restart_token)
        status = result.get("status") if result else None
        if status == "ready":
            log_event("新 Worker 已完成新鲜能力扫描并恢复就绪")
            return
        if status == "error":
            raise RuntimeError(str(result.get("message") or "新 Worker 报告重启失败"))
        time.sleep(1)
    raise RuntimeError("ComfyUI 和 Worker 未在限定时间内恢复就绪")


def main():
    parser = argparse.ArgumentParser(description="Restart a Chouka Windows node")
    parser.add_argument("--config", required=True)
    parser.add_argument("--worker-pid", type=int)
    parser.add_argument("--launcher")
    parser.add_argument("--request-id")
    parser.add_argument("--restart-token")
    parser.add_argument("--wait-comfy", action="store_true")
    parser.add_argument("--comfy-only", action="store_true")
    args = parser.parse_args()

    config_path = Path(args.config).resolve()
    config = json.loads(config_path.read_text(encoding="utf-8"))
    log_path = configure_logging(config_path, config)
    comfy_url = str(config.get("comfy_url", "http://127.0.0.1:8188"))
    timeout = max(float(config.get("restart_timeout_seconds", 300)), 60.0)
    if args.wait_comfy:
        try:
            wait_for_comfy_ready(comfy_url, time.time() + timeout)
        except Exception as exc:
            log_event(f"ComfyUI 就绪检查失败：{type(exc).__name__}: {exc}")
            raise SystemExit(1) from exc
        return
    if args.comfy_only:
        if not args.launcher:
            parser.error("重启 ComfyUI 需要 --launcher")
        launcher = Path(args.launcher).resolve()
        if not launcher.is_file():
            raise SystemExit(f"找不到启动脚本：{launcher}")
        stop_comfy(comfy_url)
        start_launcher(launcher, timeout)
        wait_for_comfy_ready(comfy_url, time.time() + timeout)
        log_event("ComfyUI 已重启，原 Worker 保持运行")
        return
    if args.worker_pid is None or not args.launcher:
        parser.error("重启节点需要 --worker-pid 和 --launcher")

    launcher = Path(args.launcher).resolve()
    if not launcher.is_file():
        raise SystemExit(f"节点重启失败：找不到启动脚本 {launcher}")
    state_path = state_path_for(config_path, config)
    state = json.loads(state_path.read_text(encoding="utf-8"))
    maintenance = state.get("maintenance")
    if not isinstance(maintenance, dict) or not maintenance.get("request_id"):
        raise SystemExit("节点重启失败：缺少维护状态")
    request_id = str(args.request_id or maintenance["request_id"])
    if request_id != str(maintenance.get("request_id")):
        raise SystemExit("节点重启失败：维护请求已变化")
    existing_token = str(maintenance.get("restart_token") or "")
    restart_token = str(args.restart_token or existing_token or uuid.uuid4().hex)
    if existing_token and existing_token != restart_token:
        raise SystemExit("节点重启失败：重启令牌不匹配")
    deadline = float(maintenance.get("deadline") or time.time() + timeout)
    worker_log = configured_path(config_path, config, "worker_log", "logs/worker.log")
    old_worker_exited = False
    worker = None
    try:
        update_maintenance(
            state_path, request_id=request_id,
            restart_token=restart_token, phase="waiting_for_old_worker",
            log_path=str(log_path),
        )
        log_event(f"重启监督器已接管请求 {request_id}，等待旧 Worker PID {args.worker_pid} 退出")
        wait_for_process_exit(
            args.worker_pid, terminate=maintenance.get("action") == "restart_services",
        )
        old_worker_exited = True
        update_maintenance(
            state_path, request_id=request_id,
            expected_restart_token=restart_token, phase="stopping_comfy",
        )
        stop_comfy(comfy_url)
        update_maintenance(
            state_path, request_id=request_id,
            expected_restart_token=restart_token, phase="starting_comfy",
        )
        start_launcher(launcher, max(deadline - time.time() + 10, 60))
        wait_for_comfy_ready(comfy_url, deadline)
        update_maintenance(
            state_path, request_id=request_id,
            expected_restart_token=restart_token, phase="waiting_for_worker",
        )
        worker = start_worker(config_path, restart_token, worker_log)
        wait_for_restart_result(
            state_path, worker, deadline, request_id, restart_token
        )
        log_event("ComfyUI 与 Worker 均已完成重启")
    except Exception as exc:
        message = f"节点重启失败：{type(exc).__name__}: {exc}；日志：{log_path}"
        log_event(message)
        worker_alive = worker is not None and worker.poll() is None
        update_maintenance(
            state_path, request_id=request_id,
            expected_restart_token=restart_token,
            status="error", phase="error", message=message,
        )
        if old_worker_exited and not worker_alive:
            try:
                start_worker(config_path, restart_token, worker_log)
            except Exception as recovery_exc:
                log_event(f"恢复 Worker 启动失败：{type(recovery_exc).__name__}: {recovery_exc}")
        raise SystemExit(message) from exc


if __name__ == "__main__":
    main()
