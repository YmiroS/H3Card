"""Read-only installation precheck for Windows node boot tasks."""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from agent import AgentError, WorkerAgent, node_launcher_for


def describe_installation(root=None, devices=None):
    root = Path(root or Path(__file__).resolve().parent.parent).resolve()
    config_path = root / "worker/config.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    if not config.get("node_launcher"):
        devices = WorkerAgent._nvidia_gpus() if devices is None else devices
        names = [str(device.get("name") or "").casefold() for device in devices
                 if isinstance(device, dict)]
        supported = ("rtx 5090", "rtx 4090", "rtx a6000", "rtx pro 6000")
        if not names or any(not any(model in name for model in supported) for name in names):
            raise AgentError("GPU profile is unknown; set node_launcher to the existing node BAT first.")
    launcher = node_launcher_for(config_path, config, devices or []).resolve()
    if launcher.parent != root or not re.fullmatch(r"[\w-]+\.bat", launcher.name):
        raise AgentError("The node launcher must be a cmd-safe BAT in this installation directory.")
    content = launcher.read_text(encoding="utf-8")
    settings = dict(re.findall(r'^set "([A-Z_]+)=([^"\r\n]*)"\s*$', content, re.MULTILINE))

    def launcher_path(key):
        value = settings.get(key)
        if not value or re.search(r'[%!&|<>^\"]', value):
            raise AgentError(f"Unsupported launcher setting: {key}")
        path = (root / value.replace("\\", "/")).resolve()
        if not path.is_file():
            raise AgentError(f"Missing launcher file: {key}")
        return path

    python = launcher_path("PY")
    comfy_main = launcher_path("COMFY_MAIN")
    if python != (root.parent / "python_embeded/python.exe").resolve():
        raise AgentError("The launcher must use this installation's embedded Python.")
    if launcher_path("WORKER_CONFIG") != config_path:
        raise AgentError("The launcher and startup task must use the same worker/config.json.")
    if launcher_path("WORKER") != root / "worker/agent.py":
        raise AgentError("The launcher must start this installation's Worker.")
    if launcher_path("RESTART_HELPER") != root / "worker/restart_node.py":
        raise AgentError("The launcher must use this installation's readiness helper.")
    comfy = urlparse(config.get("comfy_url", "http://127.0.0.1:8188"))
    host = settings.get("COMFY_HOST")
    if (comfy.scheme != "http" or comfy.hostname not in {"localhost", "127.0.0.1", "::1"}
            or host not in {"localhost", "127.0.0.1", "::1"}
            or comfy.port != int(settings.get("COMFY_PORT", "0"))
            or comfy.path not in {"", "/"} or comfy.query or comfy.fragment
            or comfy.username or comfy.password):
        raise AgentError("The launcher port and the local Worker comfy_url must agree.")
    comfy_input = Path(config.get("comfy_input_dir", "")).resolve()
    if comfy_input != comfy_main.parent / "input":
        raise AgentError("Worker comfy_input_dir must match the existing launcher's ComfyUI input directory.")
    required = ("--no-pause", "--wait-comfy", "--instance-status", "--comfy-start-only")
    if not all(flag in content for flag in required):
        raise AgentError("The launcher must support noninteractive startup, readiness and Worker deduplication.")
    normalized = str(config_path).replace("/", "\\").casefold()
    task_name = "ChoukaNode-" + hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]
    return {"task_name": task_name, "launcher": str(launcher),
            "working_directory": str(root), "config": str(config_path), "python": str(python)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--describe", action="store_true", required=True)
    parser.parse_args()
    try:
        plan = describe_installation()
    except (OSError, ValueError, TypeError, AgentError):
        # Config files contain credentials; do not print parser/provider exceptions.
        print("Startup precheck failed. Verify node_launcher, GPU profile, local paths and comfy_url.",
              file=sys.stderr)
        return 1
    print(json.dumps(plan, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
