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
from pathlib import Path
from urllib.parse import urlparse


def state_path_for(config_path, config):
    value = Path(config.get("state_file", "worker-state.json"))
    return value if value.is_absolute() else config_path.parent / value


def update_maintenance(state_path, *, status, message):
    state = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else {}
    maintenance = state.get("maintenance")
    if not isinstance(maintenance, dict):
        return
    maintenance.update(status=status, message=message[:1000])
    temporary = state_path.with_suffix(state_path.suffix + ".tmp")
    temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temporary, state_path)


def wait_for_process_exit(pid, timeout=60):
    synchronize = 0x00100000
    handle = ctypes.windll.kernel32.OpenProcess(synchronize, False, int(pid))
    if not handle:
        if ctypes.windll.kernel32.GetLastError() == 5:
            raise RuntimeError("没有权限确认旧 Worker 是否已经退出")
        return
    try:
        result = ctypes.windll.kernel32.WaitForSingleObject(handle, int(timeout * 1000))
        if result == 0x00000102:
            raise RuntimeError("旧 Worker 未在限定时间内退出")
    finally:
        ctypes.windll.kernel32.CloseHandle(handle)


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


def start_launcher(launcher):
    if re.search(r'[\s&|<>^()%!\"]', launcher.name):
        raise RuntimeError(f"启动脚本文件名包含 cmd 不安全字符：{launcher.name}")
    flags = (
        getattr(subprocess, "CREATE_NEW_CONSOLE", 0)
        | getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
    )
    process = subprocess.Popen(
        ["cmd.exe", "/d", "/c", "call", f".\\{launcher.name}", "--comfy-only"],
        cwd=str(launcher.parent),
        creationflags=flags,
    )
    try:
        returncode = process.wait(timeout=60)
    except subprocess.TimeoutExpired as exc:
        process.kill()
        raise RuntimeError("节点启动脚本未在限定时间内返回") from exc
    if returncode != 0:
        raise RuntimeError(f"节点启动脚本退出码 {returncode}")


def start_worker(config_path):
    agent = Path(__file__).resolve().with_name("agent.py")
    flags = (
        getattr(subprocess, "CREATE_NEW_CONSOLE", 0)
        | getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
    )
    return subprocess.Popen(
        [sys.executable, "-u", str(agent), "--config", str(config_path)],
        cwd=str(agent.parent), creationflags=flags,
    )


def wait_for_restart_result(state_path, worker, deadline):
    while time.time() < deadline:
        if worker.poll() is not None:
            raise RuntimeError(f"新 Worker 提前退出：{worker.returncode}")
        state = json.loads(state_path.read_text(encoding="utf-8"))
        maintenance = state.get("maintenance")
        status = maintenance.get("status") if isinstance(maintenance, dict) else None
        if status in {"ready", "error"}:
            return
        time.sleep(1)
    raise RuntimeError("ComfyUI 和 Worker 未在限定时间内恢复就绪")


def main():
    parser = argparse.ArgumentParser(description="Restart a Chouka Windows node")
    parser.add_argument("--config", required=True)
    parser.add_argument("--worker-pid", required=True, type=int)
    parser.add_argument("--launcher", required=True)
    args = parser.parse_args()

    config_path = Path(args.config).resolve()
    launcher = Path(args.launcher).resolve()
    config = json.loads(config_path.read_text(encoding="utf-8"))
    state_path = state_path_for(config_path, config)
    old_worker_exited = False
    worker = None
    try:
        wait_for_process_exit(args.worker_pid)
        old_worker_exited = True
        stop_comfy(str(config.get("comfy_url", "http://127.0.0.1:8188")))
        start_launcher(launcher)
        worker = start_worker(config_path)
        state = json.loads(state_path.read_text(encoding="utf-8"))
        maintenance = state.get("maintenance") or {}
        deadline = float(maintenance.get("deadline") or time.time() + 300)
        wait_for_restart_result(state_path, worker, deadline)
    except Exception as exc:
        message = f"节点重启失败：{type(exc).__name__}: {exc}"
        worker_alive = worker is not None and worker.poll() is None
        if not worker_alive:
            update_maintenance(state_path, status="error", message=message)
        if old_worker_exited and not worker_alive:
            start_worker(config_path)
        raise SystemExit(message) from exc


if __name__ == "__main__":
    main()
