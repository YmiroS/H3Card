# -*- coding: utf-8 -*-
"""Install approved custom-node dependencies using the ComfyUI Python runtime."""
import argparse
import errno
import importlib.metadata
import os
import subprocess
import sys
import time
from contextlib import contextmanager
from pathlib import Path

if os.name == "nt":
    import msvcrt
else:
    import fcntl


PLUGIN_DEPENDENCIES = {
    "ComfyUI_Nvidia_VFX_Nodes": {
        "packages": {"nvidia-vfx": "0.2.0.0"},
        "imports": ("nvvfx",),
        "nodes": ("RTXVideoSuperResolution", "RTXTrueHDR", "RTXVideoFrameGeneration"),
    },
    "ComfyUI-GIMM-VFI": {
        "packages": {
            "cupy-cuda12x": "13.6.0",
            "fastrlock": "0.8.3",
            "nvidia-cuda-runtime-cu12": "12.9.79",
            "nvidia-cuda-nvrtc-cu12": "12.9.86",
        },
        "imports": ("cupy", "nvidia.cuda_runtime", "nvidia.cuda_nvrtc"),
        "nodes": ("DownloadAndLoadGIMMVFIModel", "GIMMVFI_interpolate"),
        "cuda_probe": "gimmvfi/generalizable_INR/modules/softsplat.py",
    },
}


@contextmanager
def dependency_lock(python, deadline):
    path = Path(python).resolve().with_name(".chouka-plugin-dependencies.lock")
    with path.open("a+b") as lock:
        if lock.tell() == 0:
            lock.write(b"\0")
            lock.flush()
        while True:
            remaining = deadline - time.time()
            if remaining <= 0:
                raise RuntimeError("等待同一 Python 的插件依赖处理超时，未重启 ComfyUI")
            try:
                lock.seek(0)
                if os.name == "nt":
                    msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
                else:
                    fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except OSError as exc:
                if exc.errno not in {errno.EACCES, errno.EAGAIN, errno.EDEADLK}:
                    raise
                time.sleep(min(0.2, remaining))
        try:
            yield
        finally:
            lock.seek(0)
            if os.name == "nt":
                msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(lock.fileno(), fcntl.LOCK_UN)


def run_checked(command, deadline):
    remaining = deadline - time.time()
    if remaining <= 0:
        raise RuntimeError("插件依赖处理超时，未重启 ComfyUI")
    environment = os.environ.copy()
    environment["PIP_CONFIG_FILE"] = os.devnull
    try:
        result = subprocess.run(
            command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, encoding="utf-8", errors="replace", timeout=remaining,
            env=environment, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("插件依赖安装或导入检查超时，未重启 ComfyUI") from exc
    if result.stdout:
        print(result.stdout.strip(), flush=True)
    if result.returncode != 0:
        detail = " | ".join(result.stdout.strip().splitlines()[-6:])[-1000:]
        raise RuntimeError(f"插件依赖安装或导入检查失败：{detail}")


def ensure_dependencies(comfy_root, *, deadline):
    with dependency_lock(sys.executable, deadline):
        return _install_and_check(comfy_root, deadline)


def _install_and_check(comfy_root, deadline):
    required_nodes = []
    for directory, spec in PLUGIN_DEPENDENCIES.items():
        plugin = Path(comfy_root) / "custom_nodes" / directory
        if not (plugin / "__init__.py").is_file():
            raise RuntimeError(f"缺少受管插件 {directory}，请先检查主节点同步源：{plugin}")
        print(f"检查插件依赖：{directory}", flush=True)
        missing = []
        for package, expected in spec["packages"].items():
            try:
                installed = importlib.metadata.version(package)
            except importlib.metadata.PackageNotFoundError:
                missing.append(f"{package}=={expected}")
                continue
            if installed != expected:
                raise RuntimeError(
                    f"{package} 已安装 {installed}，受管版本为 {expected}；"
                    "未自动升级或降级，请确认后手动处理"
                )
        if missing:
            run_checked([
                sys.executable, "-s", "-m", "pip", "--isolated", "install",
                "--disable-pip-version-check", "--no-input", "--no-deps",
                "--only-binary=:all:", "--retries", "1", "--timeout", "30",
                "--index-url", "https://pypi.org/simple",
                "--extra-index-url", "https://pypi.nvidia.com", *missing,
            ], deadline)
        run_checked([
            sys.executable, "-s", "-c",
            "import importlib, sys; "
            "[importlib.import_module(name) for name in sys.argv[1:]]; "
            "print('Plugin dependency imports OK')",
            *spec["imports"],
        ], deadline)
        for package, expected in spec["packages"].items():
            if importlib.metadata.version(package) != expected:
                raise RuntimeError(f"{package} 安装后版本检查失败")
        if "cuda_probe" in spec:
            run_checked([
                sys.executable, "-s", "-c",
                "import os, tempfile; "
                "cache = tempfile.TemporaryDirectory(prefix='chouka-gimm-cuda-'); "
                "os.environ['CUPY_CACHE_DIR'] = cache.name; "
                "import importlib.util, sys, torch; "
                "s = importlib.util.spec_from_file_location('gimm_cuda_probe', sys.argv[1]); "
                "m = importlib.util.module_from_spec(s); s.loader.exec_module(m); "
                "x = torch.arange(768, device='cuda', dtype=torch.float32).reshape(1, 3, 16, 16); "
                "flow = torch.zeros(1, 2, 16, 16, device='cuda'); "
                "y = m.softsplat(x, flow, None, 'sum'); "
                "torch.cuda.synchronize(); torch.testing.assert_close(y, x, rtol=0, atol=0); "
                "print('GIMM-VFI CUDA kernel OK')",
                str(plugin / spec["cuda_probe"]),
            ], deadline)
        required_nodes.extend(spec["nodes"])
    return required_nodes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--comfy-root", type=Path, required=True)
    args = parser.parse_args()
    try:
        nodes = ensure_dependencies(args.comfy_root, deadline=time.time() + 300)
    except (OSError, RuntimeError, importlib.metadata.PackageNotFoundError) as exc:
        raise SystemExit(f"插件依赖处理失败：{exc}") from exc
    print("插件依赖已就绪；重启 ComfyUI 后还须确认节点加载：" + ", ".join(nodes), flush=True)


if __name__ == "__main__":
    main()
