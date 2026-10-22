"""只读监控安全投影；不是原始全配置，也不提供调度或采集入口。"""
import asyncio
import json
import math
import re
from pathlib import PurePosixPath

from aiohttp import web

from server.auth import require_monitor
from distributed import (TEMPERATURE_MAX_GPU_INDEX, capability_model_inventory,
                         worker_capability_comparisons)


WORKER_FIELDS = (
    "id", "name", "state", "enabled", "last_seen", "comfy_online", "busy",
    "current_job_id", "is_primary_node", "sync_status", "sync_request_id",
    "sync_requested_at", "sync_finished_at",
)
JOB_FIELDS = (
    "id", "status", "capability", "name", "cardName", "progress", "step",
    "created", "started", "ended", "worker_id",
)
GPU_NUMBERS = ("index", "memory_total_bytes", "memory_used_bytes",
               "utilization_percent", "temperature_c")
DEVICE_NUMBERS = ("index", "vram_total", "vram_free", "torch_vram_total", "torch_vram_free")
SYSTEM_NUMBERS = ("ram_total", "ram_free")
SYSTEM_VERSIONS = ("os", "python_version", "pytorch_version", "comfyui_version")


def _mapping(value):
    return value if isinstance(value, dict) else {}


def _list(value):
    return value if isinstance(value, list) else []


def _number(value):
    # 不把字符串、布尔值或 NaN/Infinity 伪装成有效遥测。
    try:
        return value if type(value) in (int, float) and math.isfinite(value) else None
    except OverflowError:
        return None


def _text(value):
    return value if isinstance(value, str) else None


def _scalar(value):
    if value is None or isinstance(value, (str, bool)):
        return value
    return _number(value)


def _label(value):
    """配置标识符的格式约束，不用于处理任意日志或承诺通用脱敏。"""
    if not isinstance(value, str) or not value or len(value) > 512:
        return None
    if not re.fullmatch(r"[\w .+()\[\],:@-]+", value):
        return None
    if any(word in value.lower() for word in ("bearer ", "password", "token=", "secret=")):
        return None
    return value


def _filename(value):
    if not isinstance(value, str) or "://" in value or "?" in value or "#" in value:
        return None
    # 模型名仅提供 basename，Windows/Unix 的绝对路径和目录均不外发。
    return _label(PurePosixPath(value.replace("\\", "/")).name)


def _version(value):
    return _number(value) if type(value) in (int, float) else _label(value)


def safe_error(value):
    """只返回固定分类说明，绝不返回原文或用正则替换后宣称日志已脱敏。"""
    if not value:
        return None
    text = value.lower() if isinstance(value, str) else ""
    for needles, message in (
        (("out of memory", "cuda oom", "显存不足", "内存不足"), "OOM：内存或显存不足，请联系管理员检查。"),
        (("timeout", "timed out", "超时"), "超时：执行或服务响应超时，请联系管理员检查。"),
        (("file not found", "filenotfound", "no such file", "文件不存在", "文件缺失"), "文件缺失：所需文件不可用，请联系管理员检查。"),
        (("connection", "connecterror", "连接", "unreachable"), "连接异常：执行端或依赖服务不可达，请联系管理员检查。"),
    ):
        if any(needle in text for needle in needles):
            return message
    return "发生异常，请联系管理员查看原始详情。"


def _devices(value):
    return [
        {"name": _label(item.get("name")), "type": _label(item.get("type")),
         **{key: _number(item.get(key)) for key in DEVICE_NUMBERS}}
        for item in _list(value) if isinstance(item, dict)
    ]


def safe_capabilities(value, *, detail=False):
    caps = _mapping(value)
    telemetry = _mapping(caps.get("telemetry"))
    memory = _mapping(telemetry.get("memory"))
    system = _mapping(caps.get("system"))
    result = {
        "agent_version": _version(caps.get("agent_version")),
        "telemetry": {
            "hostname": _label(telemetry.get("hostname")),
            "collected_at": _number(telemetry.get("collected_at")),
            "gpus": [
                {"name": _label(gpu.get("name")),
                 **{key: _number(gpu.get(key)) for key in GPU_NUMBERS}}
                for gpu in _list(telemetry.get("gpus")) if isinstance(gpu, dict)
            ],
            "memory": {key: _number(memory.get(key)) for key in ("total_bytes", "used_bytes")},
        },
        "devices": _devices(caps.get("devices")),
        "system": {key: _number(system.get(key)) for key in SYSTEM_NUMBERS},
    }
    if not detail:
        return result
    result["system"].update({key: _label(system.get(key)) for key in SYSTEM_VERSIONS})
    result["node_classes"] = [name for value in _list(caps.get("node_classes"))
                              if (name := _label(value)) is not None]
    inventory = capability_model_inventory(caps)
    result["model_inventory_status"] = "complete" if inventory is not None else "unknown"
    result["model_inventory"] = _models([
        {"node_class": node, "input": field, "name": name}
        for node, field, name in sorted(inventory or ())
    ])
    hardware = _mapping(caps.get("hardware"))
    cpu = _mapping(hardware.get("cpu"))
    os_info = _mapping(hardware.get("os"))
    result["hardware"] = {
        "cpu": {"model": _label(cpu.get("model")),
                "architecture": _label(cpu.get("architecture")),
                "logical_cores": _number(cpu.get("logical_cores"))},
        "os": {key: _label(os_info.get(key)) for key in ("name", "release", "version")},
        "memory_total_bytes": _number(hardware.get("memory_total_bytes")),
        "execution_device": _devices(hardware.get("execution_device")),
    }
    result["projection"] = "readonly_safe_projection"
    return result


def _models(items):
    result = []
    for item in items:
        node, field, name = (_label(item.get("node_class")), _label(item.get("input")),
                             _filename(item.get("name")))
        if node is not None and field is not None and name is not None:
            result.append({"node_class": node, "input": field, "name": name})
    return result


def safe_worker(worker):
    result = {key: _scalar(worker.get(key)) for key in WORKER_FIELDS}
    result["capabilities"] = safe_capabilities(worker.get("capabilities"))
    # 同步消息与任务错误都只提供分类说明，管理员也从既有管理接口读原文。
    result["sync_message"] = safe_error(worker.get("sync_message"))
    return result


def _summary(app, jobs, get_health):
    store = app.get("distributed")
    workers = store.list_workers() if store is not None else []
    raw_health = get_health(app, workers)
    health = {key: _scalar(raw_health.get(key)) for key in (
        "ok", "mode", "server_time", "started_at", "sandbox", "capabilities", "jobs", "comfy_online")}
    llm = _mapping(raw_health.get("llm"))
    health["llm"] = {"ok": llm.get("ok") is True, "model": _label(llm.get("model"))}
    recent = sorted(jobs, key=lambda job: _number(job.get("created")) or 0, reverse=True)[:60]
    # AuthStore 和 DistributedStore 的公共只读方法内部持有各自 SQLite 锁。
    submitters = app["auth_store"].job_submitters([job["id"] for job in recent])
    project_names = {}
    projected = []
    for job in recent:
        pid = job.get("project")
        if isinstance(pid, str) and pid not in project_names:
            try:
                project = app["project_repository"].read(pid)
                project_names[pid] = _text(_mapping(project).get("name"))
            except (OSError, ValueError):
                project_names[pid] = None
        item = {key: _scalar(job.get(key)) for key in JOB_FIELDS}
        item["projectName"] = project_names.get(pid) if isinstance(pid, str) else None
        submitter = submitters.get(job["id"], {})
        item.update({key: _text(submitter.get(key)) for key in (
            "submitter_display_name", "submitter_username")})
        item["error"] = safe_error(job.get("error"))
        projected.append(item)
    return {
        "health": health,
        "status": {"running_count": sum(job.get("status") == "running" for job in jobs),
                   "queued_count": sum(job.get("status") == "queued" for job in jobs)},
        "workers": [safe_worker(worker) for worker in workers],
        "jobs": projected,
    }


def _detail(app, worker_id):
    store = app.get("distributed")
    workers = store.list_workers() if store is not None else []
    worker = next((worker for worker in workers if worker["id"] == worker_id), None)
    if worker is None:
        raise web.HTTPNotFound(reason="Worker 不存在")
    # 仅按需对比目标与基准；保留多个主节点时的 ambiguous 语义。
    relevant = [item for item in workers if item["id"] == worker_id or item.get("is_primary_node")]
    baseline, compared = worker_capability_comparisons(relevant)
    comparison = next(item["capability_comparison"] for item in compared if item["id"] == worker_id)
    safe_comparison = {key: _label(comparison.get(key)) for key in ("status", "model_inventory_status")}
    for key in ("missing_node_classes", "extra_node_classes"):
        safe_comparison[key] = [name for value in comparison[key] if (name := _label(value)) is not None]
    for key in ("missing_models", "extra_models"):
        safe_comparison[key] = _models(comparison[key])
    return {
        "worker": safe_worker(worker),
        "comparison_baseline": {"status": _label(baseline.get("status")),
                                "worker_id": _text(baseline.get("worker_id")),
                                "agent_version": _version(baseline.get("agent_version"))},
        "capabilities": safe_capabilities(worker.get("capabilities"), detail=True),
        "capability_comparison": safe_comparison,
    }


def _json_result(callback, *args, **kwargs):
    # 大配置的投影和 JSON 编码均在线程池进行，事件循环仅发送结果。
    return json.dumps(callback(*args, **kwargs), ensure_ascii=False, allow_nan=False).encode("utf-8")


async def _response(callback, *args, **kwargs):
    body = await asyncio.to_thread(_json_result, callback, *args, **kwargs)
    return web.Response(body=body, content_type="application/json", charset="utf-8",
                        headers={"Cache-Control": "no-store"})


def register_monitor_routes(app, *, web_root, get_jobs, get_health):
    """get_jobs 在事件循环取轻量快照；get_health(app, workers) 在线程池返回健康数据。"""
    async def page(request):
        require_monitor(request)
        return web.FileResponse(web_root / "monitor.html", headers={"Cache-Control": "no-store"})

    async def summary(request):
        require_monitor(request)
        jobs = get_jobs()
        return await _response(_summary, request.app, jobs, get_health)

    async def detail(request):
        require_monitor(request)
        return await _response(_detail, request.app, request.match_info["worker_id"])

    async def temperature(request):
        require_monitor(request)
        try:
            gpu_index = int(request.query.get("gpu_index", "0"))
            minutes = int(request.query.get("minutes", "30"))
        except (ValueError, TypeError):
            raise web.HTTPBadRequest(reason="显卡编号或时间范围无效")
        if not 0 <= gpu_index <= TEMPERATURE_MAX_GPU_INDEX or minutes not in (30, 120, 1440):
            raise web.HTTPBadRequest(reason="显卡编号或时间范围无效")
        store = request.app.get("distributed")
        if store is None:
            raise web.HTTPNotFound(reason="Worker 不存在")
        try:
            return await _response(store.temperature_history, request.match_info["worker_id"],
                                   gpu_index=gpu_index, minutes=minutes)
        except KeyError:
            raise web.HTTPNotFound(reason="Worker 不存在")

    app.router.add_get("/monitor", page)
    app.router.add_get("/api/monitor/summary", summary)
    app.router.add_get("/api/monitor/workers/{worker_id}", detail)
    app.router.add_get("/api/monitor/workers/{worker_id}/temperature", temperature)
