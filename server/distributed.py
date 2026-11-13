# -*- coding: utf-8 -*-
"""Durable pull-based worker registry and dispatch queue."""
import hashlib
import hmac
import json
import math
import re
import secrets
import sqlite3
import threading
import time
import uuid
from contextlib import nullcontext
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from capacity import CapacityStore
from worker_commands import WorkerCommands, maintenance_blocks_worker


LIVE_DISPATCH = ("assigned", "running", "cancel_requested")
FINISHED_DISPATCH = ("done", "error", "canceled")
HIGH_VRAM_CAPABILITIES = frozenset({
    "minimax_h3_ref_2pass", "minimax_h3_ref_2pass_bf16", "minimax_h3_fusion_v2_bf16",
})
HIGH_VRAM_GPU_POLICY = "primary_gpu_vram_gte_32gb"
MIN_HIGH_QUALITY_VRAM_BYTES = 32_000_000_000
BF16_TWO_PASS_CAPABILITY = "minimax_h3_ref_2pass_bf16"
BF16_HIGH_VRAM_CAPABILITIES = frozenset({BF16_TWO_PASS_CAPABILITY, "minimax_h3_fusion_v2_bf16"})
# 自动派发及本地模式要求主卡严格超过 80 GiB；定向 A6000 例外在共用资格入口处理。
BF16_TWO_PASS_VRAM_EXCLUSIVE_BYTES = 80 * 1024 ** 3
# 48GB A6000 的 CUDA 可见总量会略少于 48GiB，保留驱动开销余量。
A6000_BF16_MIN_VRAM_BYTES = 47 * 1024 ** 3
MAX_4090_HIGH_QUALITY_DURATION_SECONDS = 5
MODEL_INPUT_NAMES = frozenset({
    "ckpt_name", "unet_name", "vae_name", "clip_name", "clip_name1", "clip_name2",
    "clip_name3", "lora_name", "control_net_name", "model_name", "model", "mmproj",
    "upscale_model", "diffusion_model", "text_encoder_name",
})
MODEL_FILE_SUFFIXES = (".safetensors", ".gguf", ".ckpt", ".pth", ".pt", ".bin", ".onnx")
TEMPERATURE_SAMPLE_SECONDS = 10
TEMPERATURE_GAP_SECONDS = 60
TEMPERATURE_RETENTION_SECONDS = 48 * 3600
TEMPERATURE_MAX_AGE_SECONDS = 120
TEMPERATURE_FUTURE_SECONDS = 5
TEMPERATURE_MAX_GPU_INDEX = 255
TEMPERATURE_MAX_BATCH = 64
TEMPERATURE_CLEANUP_LIMIT = 1000
# 24 小时、每 10 秒一条，含闭区间两端；断线标记也受最终点数上限约束。
TEMPERATURE_MAX_POINTS = 8641


def _finite_number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    try:
        return math.isfinite(value)
    except OverflowError:
        return False


def _temperature_gpu_index(value):
    return (isinstance(value, int) and not isinstance(value, bool)
            and 0 <= value <= TEMPERATURE_MAX_GPU_INDEX)


class WorkerBusyError(RuntimeError):
    pass


def literal_model_name(graph, value):
    seen = set()
    while isinstance(value, list):
        if len(value) != 2 or value[1] != 0 or str(value[0]) in seen:
            return None
        node_id = str(value[0])
        seen.add(node_id)
        source = graph.get(node_id, {})
        kind = source.get("class_type")
        if kind in {"PrimitiveString", "PrimitiveStringMultiline"}:
            value = source.get("inputs", {}).get("value")
        elif kind == "ConvertStringToComboNode":
            value = source.get("inputs", {}).get("string")
        else:
            return None
    return value if isinstance(value, str) else None


def _is_model_selector(input_name, options, *, combo=False, resolved=None):
    return input_name in MODEL_INPUT_NAMES or combo and (
        isinstance(resolved, str) and resolved.lower().endswith(MODEL_FILE_SUFFIXES)
        or isinstance(options, list) and any(
            isinstance(option, str) and option.lower().endswith(MODEL_FILE_SUFFIXES)
            for option in options
        )
    )


def has_required_models(graph, capabilities):
    choices_by_class = capabilities.get("input_choices") or {}
    types_by_class = capabilities.get("input_types") or {}
    if not isinstance(choices_by_class, dict) or not isinstance(types_by_class, dict):
        return False
    for node in graph.values():
        node_class = node.get("class_type")
        choices = choices_by_class.get(node_class, {})
        types = types_by_class.get(node_class, {})
        if not isinstance(choices, dict) or not isinstance(types, dict):
            return False
        for name, value in (node.get("inputs") or {}).items():
            options = choices.get(name)
            input_type = types.get(name)
            resolved = literal_model_name(graph, value)
            is_model = _is_model_selector(
                name, options, combo=name in choices or input_type == "COMBO",
                resolved=resolved,
            )
            if not is_model:
                continue
            # 只有明确的非字符串/COMBO 类型才可把连线视为张量，而不是缺少模型清单。
            if (isinstance(value, list) and name not in choices and isinstance(input_type, str)
                    and input_type not in {"COMBO", "STRING", "*", "ANY"}):
                continue
            if not isinstance(options, list) or resolved is None or resolved not in options:
                return False
    return True


def capability_model_inventory(capabilities):
    if not isinstance(capabilities, dict):
        return None
    choices_by_class = capabilities.get("input_choices")
    types_by_class = capabilities.get("input_types")
    if not isinstance(choices_by_class, dict) or not isinstance(types_by_class, dict):
        return None
    inventory = set()
    for node_class, choices in choices_by_class.items():
        if not isinstance(node_class, str) or not isinstance(choices, dict):
            return None
        types = types_by_class.get(node_class, {})
        if not isinstance(types, dict):
            return None
        for input_name, options in choices.items():
            if not isinstance(input_name, str) or not isinstance(options, list):
                return None
            model_input = _is_model_selector(input_name, options, combo=True)
            if not model_input:
                continue
            inventory.update(
                (node_class, input_name, option)
                for option in options if isinstance(option, str)
            )
    return inventory


def _empty_capability_comparison(status, model_status="unknown"):
    return {
        "status": status,
        "model_inventory_status": model_status,
        "missing_node_classes": [],
        "extra_node_classes": [],
        "missing_models": [],
        "extra_models": [],
    }


def _capability_comparison(primary_capabilities, primary_models, worker_capabilities, *,
                           primary=False, stale=False):
    if primary:
        model_status = "complete" if primary_models is not None else "unknown"
        return _empty_capability_comparison("primary", model_status)

    primary_nodes = primary_capabilities.get("node_classes")
    worker_nodes = worker_capabilities.get("node_classes")
    if (not isinstance(primary_nodes, list) or not isinstance(worker_nodes, list)
            or any(not isinstance(item, str) for item in primary_nodes + worker_nodes)):
        return _empty_capability_comparison("stale" if stale else "unknown")

    primary_node_set = set(primary_nodes)
    worker_node_set = set(worker_nodes)
    missing_nodes = primary_node_set - worker_node_set
    extra_nodes = worker_node_set - primary_node_set
    worker_models = capability_model_inventory(worker_capabilities)
    if primary_models is None or worker_models is None:
        model_status = "unknown"
        missing_models = set()
        extra_models = set()
    else:
        missing_models = {
            item for item in primary_models - worker_models if item[0] not in missing_nodes
        }
        extra_models = {
            item for item in worker_models - primary_models if item[0] not in extra_nodes
        }
        model_status = "missing" if missing_models else "complete"

    if stale:
        status = "stale"
    elif model_status == "unknown":
        status = "unknown"
    elif missing_nodes or missing_models:
        status = "missing"
    else:
        status = "complete"

    def model_items(items):
        models = {}
        # 同一文件可出现在多个节点参数中；展示清单按精确相对路径去重，保留稳定的代表项。
        for node_class, input_name, name in sorted(items):
            if name not in models:
                models[name] = {"node_class": node_class, "input": input_name, "name": name}
        return list(models.values())

    return {
        "status": status,
        "model_inventory_status": model_status,
        "missing_node_classes": sorted(missing_nodes),
        "extra_node_classes": sorted(extra_nodes),
        "missing_models": model_items(missing_models),
        "extra_models": model_items(extra_models),
    }


def worker_capability_comparisons(workers):
    primary_workers = [worker for worker in workers if worker.get("is_primary_node") is True]
    if len(primary_workers) != 1:
        status = "none" if not primary_workers else "ambiguous"
        baseline = {"status": status, "worker_id": None, "agent_version": None}
        compared = []
        for worker in workers:
            item = dict(worker)
            item["capability_comparison"] = _empty_capability_comparison("unknown")
            compared.append(item)
        return baseline, compared

    primary_worker = primary_workers[0]
    primary_capabilities = primary_worker.get("capabilities")
    if not isinstance(primary_capabilities, dict):
        primary_capabilities = {}
    baseline_stale = (primary_worker.get("state") == "offline"
                      or primary_worker.get("comfy_online") is False)
    baseline = {
        "status": "stale" if baseline_stale else "ready",
        "worker_id": primary_worker.get("id"),
        "agent_version": primary_capabilities.get("agent_version"),
    }
    primary_models = capability_model_inventory(primary_capabilities)
    compared = []
    for worker in workers:
        item = dict(worker)
        capabilities = worker.get("capabilities")
        if not isinstance(capabilities, dict):
            capabilities = {}
        item["capability_comparison"] = _capability_comparison(
            primary_capabilities,
            primary_models,
            capabilities,
            primary=worker.get("id") == primary_worker.get("id"),
            stale=worker.get("state") == "offline" or worker.get("comfy_online") is False,
        )
        compared.append(item)
    return baseline, compared


def primary_gpu(devices):
    if not isinstance(devices, list) or not devices or not isinstance(devices[0], dict):
        return None
    return devices[0]


def primary_gpu_vram_bytes(devices):
    # ComfyUI 的 devices[0] 是实际执行的主设备，不能用机器名或其他闲置显卡放行。
    primary = primary_gpu(devices)
    if not primary:
        return 0
    if primary.get("type") != "cuda":
        return 0
    for key in ("vram_total", "torch_vram_total"):
        try:
            value = int(primary.get(key) or 0)
        except (TypeError, ValueError, OverflowError):
            continue
        if value > 0:
            return value
    return 0


def requires_high_vram(capability, gpu_policy=None):
    return capability in HIGH_VRAM_CAPABILITIES or gpu_policy == HIGH_VRAM_GPU_POLICY


def is_pro_6000_worker(devices):
    # 只认 ComfyUI 实际执行主卡的设备名，不认 worker 昵称、容量或第二张闲置卡。
    # ComfyUI 也可能返回 "cuda:0 NVIDIA RTX PRO 6000 Blackwell : ..."。
    primary = primary_gpu(devices)
    return bool(
        primary and primary.get("type") == "cuda"
        and re.search(r"\brtx\s+pro\s+6000\b", str(primary.get("name") or ""), re.IGNORECASE)
    )


def can_run_capability(capability, devices, gpu_policy=None, duration_seconds=None, *,
                       targeted_video=False):
    # 定向视频可使用 PRO 6000；仅定向 BF16 另允许 48GB A6000 主卡。
    if (is_pro_6000_worker(devices) and capability not in BF16_HIGH_VRAM_CAPABILITIES
            and not targeted_video):
        return False
    if capability in BF16_HIGH_VRAM_CAPABILITIES:
        vram = primary_gpu_vram_bytes(devices)
        if vram > BF16_TWO_PASS_VRAM_EXCLUSIVE_BYTES:
            return True
        primary = primary_gpu(devices)
        return bool(
            targeted_video and primary and primary.get("type") == "cuda"
            and re.search(r"\brtx\s+a6000\b", str(primary.get("name") or ""), re.IGNORECASE)
            and vram >= A6000_BF16_MIN_VRAM_BYTES
        )
    if not requires_high_vram(capability, gpu_policy):
        return True
    primary = primary_gpu(devices)
    if not primary or primary.get("type") != "cuda":
        return False
    if primary_gpu_vram_bytes(devices) >= MIN_HIGH_QUALITY_VRAM_BYTES:
        return True
    try:
        duration = float(duration_seconds)
    except (TypeError, ValueError):
        return False
    return (
        capability == "minimax_h3_ref_2pass"
        and duration <= MAX_4090_HIGH_QUALITY_DURATION_SECONDS
        and "4090" in str(primary.get("name") or "").lower()
    )


def is_windows_worker(worker):
    capabilities = worker.get("capabilities")
    hardware = capabilities.get("hardware") if isinstance(capabilities, dict) else None
    os_info = hardware.get("os") if isinstance(hardware, dict) else None
    return isinstance(os_info, dict) and os_info.get("name") == "Windows"


def generation_worker_reason(worker, graph, capability, gpu_policy=None, duration_seconds=None, *,
                             targeted_video=False):
    """Public selection checks; never include model paths or management details."""
    if not is_windows_worker(worker):
        return "只能指定 Windows 执行端"
    if worker["state"] not in {"idle", "busy"}:
        return {
            "offline": "执行端已离线", "syncing": "执行端正在同步或维护",
            "disabled": "执行端已停用", "error": "执行端异常或 ComfyUI 未在线",
        }.get(worker["state"], "执行端暂不可用")
    capabilities = worker["capabilities"]
    required = {node.get("class_type") for node in graph.values()
                if isinstance(node, dict) and node.get("class_type")}
    if not required.issubset(set(capabilities.get("node_classes") or [])):
        return "执行端缺少此能力所需节点"
    if not has_required_models(graph, capabilities):
        return "执行端缺少此能力所需模型或模型清单不完整"
    if not can_run_capability(capability, capabilities.get("devices"), gpu_policy, duration_seconds,
                              targeted_video=targeted_video):
        return "执行端不满足此任务的显卡、显存或时长要求"
    return None


def _hash_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _worker_name_key(name):
    return str(name).strip().casefold()


def validate_worker_daily_window(window):
    """Validate the shared API/store contract without assuming the server's timezone."""
    if window is None:
        return None
    if not isinstance(window, dict) or set(window) != {"start", "end", "time_zone"}:
        raise ValueError("daily_window 必须包含且仅包含 start、end 和 time_zone")
    for key in ("start", "end"):
        if not isinstance(window[key], str) or not re.fullmatch(r"(?:[01][0-9]|2[0-3]):[0-5][0-9]", window[key]):
            raise ValueError("每日开始和结束时间必须为有效 HH:mm")
    if window["start"] == window["end"]:
        raise ValueError("每日开始和结束时间不能相同")
    try:
        if not isinstance(window["time_zone"], str) or not window["time_zone"]:
            raise ValueError("请选择有效 IANA 时区")
        ZoneInfo(window["time_zone"])
    except (ValueError, ZoneInfoNotFoundError) as exc:
        raise ValueError("请选择有效 IANA 时区（需安装 tzdata 时区数据库）") from exc
    return dict(window)


def _worker_daily_window(worker):
    # Raw SQL rows and decoded worker DTOs must use identical authorization rules.
    if "access_daily_window_json" in worker:
        raw = worker["access_daily_window_json"]
        if raw is None:
            return None
        window = json.loads(raw)
        if window is None:
            raise ValueError("Invalid persisted daily window")
    else:
        window = worker.get("access_daily_window")
    return validate_worker_daily_window(window)


def worker_access_team(worker, now=None):
    """Project the effective reservation; never rewrite configuration or running jobs."""
    team_id = worker.get("access_team_id")
    expires_at = worker.get("access_expires_at")
    if now is None:
        now = time.time()
    if not team_id or (expires_at is not None and expires_at <= now):
        return None
    try:
        window = _worker_daily_window(worker)
        if window is not None:
            local = datetime.fromtimestamp(now, ZoneInfo(window["time_zone"]))
            wall_time = local.strftime("%H:%M")
            start, end = window["start"], window["end"]
            inside = start <= wall_time < end if start < end else wall_time >= start or wall_time < end
            if not inside:
                return None
    except (ValueError, TypeError, OverflowError, OSError):
        # Corrupt historical schedules or unavailable timezone data must not open
        # reserved hardware to outsiders. Absolute expiration still overrides it.
        return team_id
    return team_id


def worker_access_allowed(worker, team_ids, now=None):
    team_id = worker_access_team(worker, now)
    return team_ids is None or team_id is None or team_id in team_ids


def _worker_host_id(capabilities):
    if not isinstance(capabilities, dict):
        return None
    for source in (capabilities.get("hardware"), capabilities.get("telemetry"), capabilities):
        if isinstance(source, dict):
            value = source.get("host_id")
            if isinstance(value, str) and value.strip():
                return value.strip()
    return None


def _primary_node(capabilities):
    return isinstance(capabilities, dict) and capabilities.get("is_primary_node") is True


def _json(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


class DistributedStore:
    def __init__(self, path, lease_seconds=45, offline_seconds=30,
                 affinity_max_wait_seconds=60, priority_resolver=None, access_resolver=None,
                 access_guard=None):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.lease_seconds = lease_seconds
        self.offline_seconds = offline_seconds
        self.affinity_max_wait_seconds = affinity_max_wait_seconds
        self.priority_resolver = priority_resolver
        self.access_resolver = access_resolver
        # A reusable context manager, normally AuthStore.lock (threading.RLock).
        # Hold it from authorization through assignment COMMIT: auth -> dispatch.
        self.access_guard = access_guard
        self.lock = threading.RLock()
        self.db = sqlite3.connect(str(self.path), check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA foreign_keys=ON")
        self._create_schema()
        self.capacity = CapacityStore(self)
        self.commands = WorkerCommands(self, host_id=_worker_host_id, name_key=_worker_name_key)

    def close(self):
        with self.lock:
            self.db.close()

    def _create_schema(self):
        with self.lock, self.db:
            self.db.executescript(
                """
                CREATE TABLE IF NOT EXISTS workers (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    token_hash TEXT NOT NULL,
                    enabled INTEGER NOT NULL DEFAULT 1,
                    retired INTEGER NOT NULL DEFAULT 0,
                    last_seen REAL NOT NULL,
                    comfy_online INTEGER NOT NULL DEFAULT 0,
                    busy INTEGER NOT NULL DEFAULT 0,
                    current_job_id TEXT,
                    capabilities_json TEXT NOT NULL DEFAULT '{}',
                    last_capability_id TEXT,
                    last_model_family TEXT,
                    access_team_id TEXT,
                    access_expires_at REAL,
                    access_daily_window_json TEXT,
                    sync_request_id TEXT,
                    sync_action TEXT NOT NULL DEFAULT 'sync_files',
                    sync_status TEXT NOT NULL DEFAULT 'idle',
                    sync_message TEXT,
                    sync_requested_at REAL,
                    sync_started_at REAL,
                    sync_finished_at REAL,
                    sync_recovered_request_id TEXT,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                );

                CREATE TABLE IF NOT EXISTS dispatch_jobs (
                    job_id TEXT PRIMARY KEY,
                    payload_json TEXT NOT NULL,
                    required_nodes_json TEXT NOT NULL DEFAULT '[]',
                    status TEXT NOT NULL,
                    worker_id TEXT,
                    lease_token_hash TEXT,
                    lease_expires_at REAL,
                    cancel_requested INTEGER NOT NULL DEFAULT 0,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL,
                    FOREIGN KEY(worker_id) REFERENCES workers(id)
                );

                CREATE INDEX IF NOT EXISTS idx_dispatch_status_created
                    ON dispatch_jobs(status, created_at);
                CREATE INDEX IF NOT EXISTS idx_dispatch_worker
                    ON dispatch_jobs(worker_id, status);
                CREATE INDEX IF NOT EXISTS idx_dispatch_history
                    ON dispatch_jobs(created_at DESC, job_id DESC);
                CREATE INDEX IF NOT EXISTS idx_dispatch_status_history
                    ON dispatch_jobs(status, created_at DESC, job_id DESC);

                CREATE TABLE IF NOT EXISTS guarded_service_restarts (
                    request_id TEXT PRIMARY KEY,
                    worker_id TEXT NOT NULL,
                    job_id TEXT NOT NULL,
                    attempt_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    message TEXT NOT NULL,
                    requested_at REAL NOT NULL,
                    started_at REAL,
                    finished_at REAL
                );
                CREATE INDEX IF NOT EXISTS idx_guarded_restart_status
                    ON guarded_service_restarts(status);

                CREATE TABLE IF NOT EXISTS worker_temperature_samples (
                    worker_id TEXT NOT NULL,
                    gpu_index INTEGER NOT NULL CHECK(gpu_index BETWEEN 0 AND 255),
                    collected_at REAL NOT NULL,
                    temperature_c REAL CHECK(temperature_c BETWEEN 0 AND 150),
                    PRIMARY KEY(worker_id, gpu_index, collected_at),
                    FOREIGN KEY(worker_id) REFERENCES workers(id)
                );
                CREATE INDEX IF NOT EXISTS idx_worker_temperature_time
                    ON worker_temperature_samples(collected_at);
                """
            )
            columns = {row[1] for row in self.db.execute("PRAGMA table_info(workers)")}
            if "last_capability_id" not in columns:
                self.db.execute("ALTER TABLE workers ADD COLUMN last_capability_id TEXT")
            if "last_model_family" not in columns:
                self.db.execute("ALTER TABLE workers ADD COLUMN last_model_family TEXT")
            if "retired" not in columns:
                self.db.execute("ALTER TABLE workers ADD COLUMN retired INTEGER NOT NULL DEFAULT 0")
            sync_columns = {
                "access_team_id": "TEXT",
                "access_expires_at": "REAL",
                "access_daily_window_json": "TEXT",
                "sync_request_id": "TEXT",
                "sync_action": "TEXT NOT NULL DEFAULT 'sync_files'",
                "sync_status": "TEXT NOT NULL DEFAULT 'idle'",
                "sync_message": "TEXT",
                "sync_requested_at": "REAL",
                "sync_started_at": "REAL",
                "sync_finished_at": "REAL",
                "sync_recovered_request_id": "TEXT",
            }
            for name, definition in sync_columns.items():
                if name not in columns:
                    self.db.execute(f"ALTER TABLE workers ADD COLUMN {name} {definition}")
            if "access_daily_window_json" not in columns or "sync_recovered_request_id" not in columns:
                # Rebuild only these metadata indexes on upgrade, keeping the new
                # schedule checks covered without reading large capability rows.
                self.db.execute("DROP INDEX IF EXISTS idx_workers_poll_summary")
                self.db.execute("DROP INDEX IF EXISTS idx_workers_access")
            # Cover hot polling fields so legacy rows need not traverse multi-MB JSON overflow pages.
            self.db.executescript("""
                CREATE INDEX IF NOT EXISTS idx_workers_poll_summary ON workers(
                    retired, created_at DESC, id DESC, name, enabled, comfy_online, busy,
                    current_job_id, last_seen, sync_status, access_team_id, access_expires_at,
                    access_daily_window_json, sync_request_id, sync_recovered_request_id,
                    json_type(COALESCE(NULLIF(capabilities_json, ''), '{}'), '$.is_primary_node') = 'true'
                );
                CREATE INDEX IF NOT EXISTS idx_workers_restart_expiry
                    ON workers(retired, sync_action, sync_status, sync_started_at);
                CREATE INDEX IF NOT EXISTS idx_workers_auth
                    ON workers(id, retired, token_hash);
                CREATE INDEX IF NOT EXISTS idx_workers_access
                    ON workers(id, access_team_id, access_expires_at, access_daily_window_json);
            """)
            # Upgrade pre-existing public aliases of already reserved physical hosts.
            registrations = self._worker_access_rows_locked()
            reconciled = set()
            now = time.time()
            for registration in registrations:
                if registration["id"] not in reconciled:
                    scope = self._worker_access_scope_locked(
                        registration["name"], registration["host_id"], registrations,
                    )
                    self._inherit_worker_access_locked(scope, now)
                    reconciled.update(item["id"] for item in scope)

    def _worker_access_rows_locked(self):
        # Only parse identity fields; do not decode peers' large model/node inventories.
        rows = self.db.execute(
            """SELECT id, name, access_team_id, access_expires_at, access_daily_window_json,
                      json_extract(capabilities_json, '$.hardware.host_id') AS hardware_host_id,
                      json_extract(capabilities_json, '$.telemetry.host_id') AS telemetry_host_id,
                      json_extract(capabilities_json, '$.host_id') AS reported_host_id
               FROM workers ORDER BY created_at DESC, id DESC"""
        ).fetchall()
        result = []
        for row in rows:
            item = dict(row)
            item["host_id"] = _worker_host_id({
                "hardware": {"host_id": item.pop("hardware_host_id")},
                "telemetry": {"host_id": item.pop("telemetry_host_id")},
                "host_id": item.pop("reported_host_id"),
            })
            result.append(item)
        return result

    def _worker_access_scope_locked(self, name, host_id=None, registrations=None):
        if registrations is None:
            registrations = self._worker_access_rows_locked()
        names = {_worker_name_key(name)}
        hosts = {host_id} if host_id else set()
        selected = set()
        # Name/host links are transitive, including retired historical registrations.
        # In particular, a renamed host must not escape through an old public alias.
        changed = True
        while changed:
            changed = False
            for item in registrations:
                if item["id"] in selected:
                    continue
                key = _worker_name_key(item["name"])
                if key in names or item["host_id"] is not None and item["host_id"] in hosts:
                    selected.add(item["id"])
                    names.add(key)
                    if item["host_id"]:
                        hosts.add(item["host_id"])
                    changed = True
        return [item for item in registrations if item["id"] in selected]

    def _inherit_worker_access_locked(self, scope, now):
        if not scope:
            return None, None, None
        source = scope[0]
        if len({_worker_name_key(item["name"]) for item in scope}) > 1:
            # Legacy aliases may still be public. A newer public alias must not
            # erase a reservation; explicit admin changes always overwrite the scope.
            source = next((item for item in scope if worker_access_team(item, now)), None)
            if source is None:
                source = next((item for item in scope if item["access_team_id"]), scope[0])
        team_id, expires_at = source["access_team_id"], source["access_expires_at"]
        window_json = source["access_daily_window_json"] if team_id else None
        self.db.executemany(
            """UPDATE workers SET access_team_id = ?, access_expires_at = ?, access_daily_window_json = ?
               WHERE id = ? AND (access_team_id IS NOT ? OR access_expires_at IS NOT ?
                                 OR access_daily_window_json IS NOT ?)""",
            [(team_id, expires_at, window_json, item["id"], team_id, expires_at, window_json)
             for item in scope],
        )
        return team_id, expires_at, window_json

    def job_history_page(self, live_jobs, *, limit, status="all", before=None):
        """Read a bounded dispatch archive page; never restore it into the execution queue."""
        live = [{"id": job["id"], "created": job["created"], "status": job["status"]}
                for job in live_jobs]
        live_json = _json(live)
        status_groups = {"queued": ("queued", "assigned"),
                         "running": ("running", "cancel_requested")}
        statuses = status_groups.get(status, (status,))
        where = ["d.job_id NOT IN (SELECT json_extract(value, '$.id') FROM json_each(?))"]
        params = [live_json]
        if status != "all":
            where.append(f"d.status IN ({','.join('?' for _ in statuses)})")
            params.extend(statuses)
        count_where = " AND ".join(where)
        count_params = list(params)
        if before is not None:
            where.append("(d.created_at, d.job_id) < (?, ?)")
            params.extend(before)
        # Limit the indexed dispatch scan BEFORE reading ledger metadata or payload JSON.
        with self.lock:
            total = self.db.execute(
                f"SELECT COUNT(*) FROM dispatch_jobs d WHERE {count_where}", count_params
            ).fetchone()[0]
            rows = self.db.execute(
                f"""SELECT d.job_id, d.created_at, d.status FROM dispatch_jobs d
                    WHERE {' AND '.join(where)}
                    ORDER BY d.created_at DESC, d.job_id DESC LIMIT ?""",
                (*params, limit + 1),
            ).fetchall()
            candidates = [{"id": row["job_id"], "created": row["created_at"],
                           "status": {"assigned": "queued", "cancel_requested": "running"}.get(
                               row["status"], row["status"])} for row in rows]
            matching_live = [job for job in live if status == "all" or job["status"] == status]
            total += len(matching_live)
            candidates.extend(job for job in matching_live
                              if before is None or (job["created"], job["id"]) < before)
            candidates.sort(key=lambda job: (job["created"], job["id"]), reverse=True)
            has_more = len(candidates) > limit
            page = candidates[:limit]
            has_ledger = self.db.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='cost_events'"
            ).fetchone() is not None
            ledger_join = ("LEFT JOIN cost_events c ON c.job_id=d.job_id AND c.event_kind='generation'"
                           if has_ledger else "")
            ledger_columns = (", c.project_id, c.project_name, c.card_id, c.card_name, "
                              "c.started_at, c.ended_at" if has_ledger else "")
            capability_sql = "json_extract(d.payload_json, '$.capability')"
            if has_ledger:
                capability_sql = f"COALESCE(NULLIF(c.capability, ''), {capability_sql})"
            # A page, not the entire archive, is bound into this metadata query.
            if page:
                metadata = self.db.execute(
                    f"""SELECT d.job_id, {capability_sql} AS capability,
                        json_extract(d.payload_json, '$.target_worker_id') AS target_worker_id
                        {ledger_columns} FROM dispatch_jobs d {ledger_join}
                        WHERE d.job_id IN ({','.join('?' for _ in page)})""",
                    [job["id"] for job in page],
                ).fetchall()
                by_id = {row["job_id"]: dict(row) for row in metadata}
                for job in page:
                    row = by_id.get(job["id"], {})
                    for source, target in (("project_id", "project"), ("project_name", "projectName"),
                                           ("card_id", "card"), ("card_name", "cardName"),
                                           ("started_at", "started"), ("ended_at", "ended"),
                                           ("target_worker_id", "target_worker_id")):
                        if row.get(source) is not None:
                            job[target] = row[source]
                    capability = row.get("capability")
                    if capability:
                        job["capability"] = capability
        return page, has_more, total

    def register_worker(self, name, capabilities=None):
        now = time.time()
        worker_id = str(uuid.uuid4())
        token = secrets.token_urlsafe(32)
        with self.lock, self.db:
            self._begin_guarded_transaction_locked()
            scope = self._worker_access_scope_locked(name, _worker_host_id(capabilities))
            team_id, expires_at, window_json = self._inherit_worker_access_locked(scope, now)
            self.db.execute(
                """INSERT INTO workers
                   (id, name, token_hash, last_seen, capabilities_json, created_at, updated_at,
                    access_team_id, access_expires_at, access_daily_window_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (worker_id, name, _hash_token(token), now,
                 _json(capabilities or {}), now, now, team_id, expires_at, window_json),
            )
        return {"worker_id": worker_id, "worker_token": token}

    def set_worker_access(self, worker_id, team_id, expires_at=None, daily_window=None):
        if team_id is not None and (not isinstance(team_id, str) or not team_id.strip()):
            raise ValueError("team_id must be a nonempty string or None")
        if expires_at is not None and not _finite_number(expires_at):
            raise ValueError("expires_at must be a finite timestamp or None")
        if team_id is None:
            expires_at = None
            daily_window = None
        daily_window = validate_worker_daily_window(daily_window)
        window_json = _json(daily_window) if daily_window is not None else None
        with self.lock, self.db:
            self._begin_guarded_transaction_locked()
            registrations = self._worker_access_rows_locked()
            target = next((item for item in registrations if item["id"] == worker_id), None)
            if target is None:
                return False
            scope = self._worker_access_scope_locked(target["name"], target["host_id"], registrations)
            now = time.time()
            self.db.executemany(
                """UPDATE workers SET access_team_id = ?, access_expires_at = ?,
                                      access_daily_window_json = ?, updated_at = ?
                   WHERE id = ?""",
                [(team_id, expires_at, window_json, now, item["id"]) for item in scope],
            )
        return True

    def inaccessible_worker_ids(self, team_ids):
        """Include old/retired registrations so response redaction also covers history."""
        if team_ids is None:
            return set()
        now = time.time()
        with self.lock:
            rows = self.db.execute(
                "SELECT id, access_team_id, access_expires_at, access_daily_window_json FROM workers"
            ).fetchall()
        return {row["id"] for row in rows
                if not worker_access_allowed(dict(row), team_ids, now)}

    def authenticate(self, worker_id, token):
        if not worker_id or not token:
            return False
        with self.lock:
            row = self.db.execute(
                "SELECT token_hash FROM workers INDEXED BY idx_workers_auth "
                "WHERE id = ? AND retired = 0", (worker_id,)
            ).fetchone()
        return bool(row and hmac.compare_digest(row["token_hash"], _hash_token(token)))

    def set_worker_enabled(self, worker_id, enabled):
        now = time.time()
        with self.lock, self.db:
            cur = self.db.execute(
                "UPDATE workers SET enabled = ?, updated_at = ? WHERE id = ? AND retired = 0",
                (1 if enabled else 0, now, worker_id),
            )
        return cur.rowcount > 0

    def retire_worker(self, worker_id):
        now = time.time()
        with self.lock, self.db:
            self._begin_guarded_transaction_locked()
            self._requeue_expired_locked(now)
            target = self.db.execute(
                "SELECT name FROM workers WHERE id = ? AND retired = 0", (worker_id,)
            ).fetchone()
            if not target:
                return False
            name_key = _worker_name_key(target["name"])
            registrations = [
                row for row in self.db.execute(
                    "SELECT id, name, current_job_id FROM workers WHERE retired = 0"
                ).fetchall()
                if _worker_name_key(row["name"]) == name_key
            ]
            worker_ids = [row["id"] for row in registrations]
            placeholders = ",".join("?" for _ in worker_ids)
            if self.db.execute(
                    f"SELECT 1 FROM worker_command_executions WHERE worker_id IN ({placeholders}) "
                    "AND status IN ('pending','running','unknown') LIMIT 1", worker_ids).fetchone():
                raise WorkerBusyError("Worker 有远程命令或状态未知，不能删除注册")
            active = any(row["current_job_id"] for row in registrations)
            if not active:
                active = self.db.execute(
                    f"""SELECT 1 FROM dispatch_jobs
                        WHERE worker_id IN ({placeholders})
                          AND status IN ({','.join('?' for _ in LIVE_DISPATCH)})
                        LIMIT 1""",
                    (*worker_ids, *LIVE_DISPATCH),
                ).fetchone() is not None
            if active:
                raise WorkerBusyError("Worker 当前有执行中的任务")
            self.db.execute(
                f"""UPDATE workers
                    SET retired = 1, enabled = 0, comfy_online = 0, busy = 0,
                        current_job_id = NULL, sync_request_id = NULL,
                        sync_status = 'idle', sync_message = NULL, updated_at = ?
                    WHERE id IN ({placeholders})""",
                (now, *worker_ids),
            )
        return True

    def _begin_guarded_transaction_locked(self):
        # 先取得 SQLite 写锁，避免其他连接在条件读取和维护预留之间换单。
        if not self.db.in_transaction:
            self.db.execute("BEGIN IMMEDIATE")

    def _job_execution_locked(self, job_id, now):
        row = self.db.execute(
            """SELECT d.job_id, w.id AS worker_id, w.name AS worker_name,
                      a.id AS attempt_id, a.started_at
               FROM dispatch_jobs d
               JOIN workers w ON w.id = d.worker_id
               JOIN capacity_tasks t ON t.job_id = d.job_id
               JOIN capacity_attempts a ON a.id = t.current_attempt
               WHERE d.job_id = ? AND d.status = 'running' AND d.cancel_requested = 0
                 AND d.lease_expires_at > ? AND d.lease_token_hash = a.lease_hash
                 AND a.job_id = d.job_id AND a.worker_id = d.worker_id
                 AND a.status = 'running' AND a.started_at IS NOT NULL
                 AND a.ended_at IS NULL AND t.status = 'running'
                 AND w.retired = 0 AND w.current_job_id = d.job_id""",
            (job_id, now),
        ).fetchone()
        return dict(row) if row else None

    def job_execution(self, job_id):
        """仅返回仍持有有效租约的当前 running attempt，开始时间不随心跳刷新。"""
        now = time.time()
        with self.lock:
            execution = self._job_execution_locked(job_id, now)
            if execution is None:
                return None
            try:
                _, capabilities = self._check_worker_restart_locked(
                    execution["worker_id"], "restart_services", now,
                )
                if capabilities.get("supports_guarded_service_restart") is not True:
                    raise WorkerBusyError("Worker 不支持按任务安全重启，请先升级 Worker")
            except (WorkerBusyError, KeyError) as exc:
                execution.update(restart_supported=False, restart_reason=str(exc))
            else:
                execution.update(restart_supported=True, restart_reason=None)
            return execution

    def _check_worker_restart_locked(self, worker_id, action, now, *,
                                     capabilities=None, own_request_id=None):
        row = self.db.execute(
            "SELECT * FROM workers WHERE id = ? AND retired = 0", (worker_id,),
        ).fetchone()
        if not row:
            raise KeyError("Worker 不存在")
        latest = next((item for item in self.db.execute(
            "SELECT id, name FROM workers WHERE retired = 0 ORDER BY created_at DESC, id DESC"
        ) if _worker_name_key(item["name"]) == _worker_name_key(row["name"])), None)
        capabilities = (json.loads(row["capabilities_json"] or "{}")
                        if capabilities is None else capabilities)
        if now - row["last_seen"] > self.offline_seconds:
            raise WorkerBusyError("Worker 已离线")
        if _primary_node(capabilities):
            raise WorkerBusyError("主节点不支持远程重启")
        if latest is None or latest["id"] != worker_id:
            raise WorkerBusyError("只能重启同名最新注册的 Worker")
        support = "supports_host_reboot" if action == "reboot_host" else "supports_service_restart"
        if not isinstance(capabilities, dict) or capabilities.get(support) is not True:
            raise WorkerBusyError("Worker 不支持此重启操作，请先升级 Worker")
        self._check_restart_host_locked(worker_id, capabilities, action, now)
        if (row["sync_status"] in ("pending", "running")
                and (own_request_id is None or row["sync_request_id"] != own_request_id)):
            raise WorkerBusyError("Worker 已有等待中或执行中的维护请求")
        return row, capabilities

    def _check_guarded_restart_locked(self, record, now, capabilities=None):
        row, capabilities = self._check_worker_restart_locked(
            record["worker_id"], "restart_services", now, capabilities=capabilities,
            own_request_id=record["request_id"],
        )
        if capabilities.get("supports_guarded_service_restart") is not True:
            raise WorkerBusyError("Worker 不支持按任务安全重启，请先升级 Worker")
        if row["sync_request_id"] != record["request_id"]:
            raise WorkerBusyError("维护请求已被其他维护覆盖")
        execution = self._job_execution_locked(record["job_id"], now)
        if (not execution or execution["worker_id"] != record["worker_id"]
                or execution["attempt_id"] != record["attempt_id"]):
            raise WorkerBusyError("原任务已结束、取消、租约过期或已更换执行批次，拒绝重启")

    def _set_guarded_restart_locked(self, record, status, message, now):
        self.db.execute(
            """UPDATE guarded_service_restarts SET status = ?, message = ?,
                   started_at = CASE WHEN ? = 'running' THEN COALESCE(started_at, ?) ELSE started_at END,
                   finished_at = CASE WHEN ? IN ('done', 'error') THEN ? ELSE NULL END
               WHERE request_id = ?""",
            (status, message, status, now, status, now, record["request_id"]),
        )
        self.db.execute(
            """UPDATE workers SET sync_status = ?, sync_message = ?,
                   sync_started_at = CASE WHEN ? = 'running' THEN COALESCE(sync_started_at, ?) ELSE sync_started_at END,
                   sync_finished_at = CASE WHEN ? IN ('done', 'error') THEN ? ELSE NULL END,
                   updated_at = ? WHERE id = ? AND sync_request_id = ?""",
            (status, message, status, now, status, now, now, record["worker_id"], record["request_id"]),
        )

    def request_alert_restart(self, worker_id, job_id, attempt_id, request_id):
        """固定位置参数顺序；同一请求永久去重，不能借用请求标识重启其他任务。"""
        if any(not isinstance(value, str) or not value.strip()
               for value in (worker_id, job_id, attempt_id, request_id)):
            raise ValueError("Worker、任务、执行批次与请求标识不能为空")
        now = time.time()
        with self.lock, self.db:
            self._begin_guarded_transaction_locked()
            previous = self.db.execute(
                "SELECT * FROM guarded_service_restarts WHERE request_id = ?", (request_id,),
            ).fetchone()
            if previous:
                if tuple(previous[key] for key in ("worker_id", "job_id", "attempt_id")) != (
                        worker_id, job_id, attempt_id):
                    raise ValueError("request_id 已用于其他任务或执行批次")
            else:
                _, capabilities = self._check_worker_restart_locked(worker_id, "restart_services", now)
                if capabilities.get("supports_guarded_service_restart") is not True:
                    raise WorkerBusyError("Worker 不支持按任务安全重启，请先升级 Worker")
                execution = self._job_execution_locked(job_id, now)
                if (not execution or execution["worker_id"] != worker_id
                        or execution["attempt_id"] != attempt_id):
                    raise WorkerBusyError("原任务已结束、取消、租约过期或已更换执行批次，拒绝重启")
                message = "等待节点复验原任务后重启 ComfyUI 和 Worker，不重启 Windows"
                self.db.execute(
                    """INSERT INTO guarded_service_restarts
                       (request_id, worker_id, job_id, attempt_id, status, message, requested_at)
                       VALUES (?, ?, ?, ?, 'pending', ?, ?)""",
                    (request_id, worker_id, job_id, attempt_id, message, now),
                )
                self.db.execute(
                    """UPDATE workers SET sync_request_id = ?, sync_action = 'restart_services',
                           sync_status = 'pending', sync_message = ?, sync_requested_at = ?,
                           sync_started_at = NULL, sync_finished_at = NULL, updated_at = ? WHERE id = ?""",
                    (request_id, message, now, now, worker_id),
                )
        return {"worker_id": worker_id, "request_id": request_id, "action": "restart_services"}

    def alert_restart_status(self, request_id):
        with self.lock, self.db:
            self._begin_guarded_transaction_locked()
            self._expire_service_restarts_locked(time.time())
            row = self.db.execute(
                "SELECT * FROM guarded_service_restarts WHERE request_id = ?", (request_id,),
            ).fetchone()
            return dict(row) if row else None

    def _expire_service_restarts_locked(self, now):
        for record in self.db.execute(
            """SELECT * FROM guarded_service_restarts WHERE status IN ('pending', 'running')
               AND COALESCE(started_at, requested_at) <= ?""", (now - 900,),
        ).fetchall():
            self._set_guarded_restart_locked(
                record, "error", "重启超过15分钟，未确认服务恢复；请检查节点", now,
            )
        self.db.execute(
            """UPDATE workers SET sync_status = 'error', sync_finished_at = ?, updated_at = ?,
                   sync_message = '重启超过15分钟，尚未确认恢复；请检查节点并手动恢复服务'
               WHERE retired = 0 AND sync_action IN ('restart_services', 'reboot_host')
                 AND sync_status = 'running' AND sync_started_at <= ?""",
            (now, now, now - 900),
        )

    def _check_restart_host_locked(self, worker_id, capabilities, action, now):
        host_id = _worker_host_id(capabilities)
        if self.commands.blocks_worker_locked(worker_id, host_id):
            raise WorkerBusyError("同一宿主有远程命令等待中、执行中或状态未知，不能同时维护")
        if not host_id:
            if action == "reboot_host":
                raise WorkerBusyError("缺少稳定 host_id，无法确认整机重启范围")
            return
        target = self.db.execute("SELECT name FROM workers WHERE id = ?", (worker_id,)).fetchone()
        # 同宿主检查只读取身份字段，轮询执行快照时不解码其他节点的大型能力清单。
        for peer in self.db.execute(
            """SELECT id, name, last_seen, busy, current_job_id, sync_status,
                      json_extract(capabilities_json, '$.hardware.host_id') AS hardware_host_id,
                      json_extract(capabilities_json, '$.telemetry.host_id') AS telemetry_host_id,
                      json_extract(capabilities_json, '$.host_id') AS host_id
               FROM workers WHERE retired = 0 AND id != ?""", (worker_id,),
        ):
            peer_host = _worker_host_id({
                "hardware": {"host_id": peer["hardware_host_id"]},
                "telemetry": {"host_id": peer["telemetry_host_id"]}, "host_id": peer["host_id"],
            })
            if peer_host != host_id:
                continue
            # 仅忽略已经离线且无任务/维护的旧注册；不猜测多个 Worker 是否共享 ComfyUI。
            active = (_worker_name_key(peer["name"]) != _worker_name_key(target["name"])
                      or now - peer["last_seen"] <= self.offline_seconds
                      or peer["busy"] or peer["current_job_id"]
                      or peer["sync_status"] in ("pending", "running")
                      or self.db.execute(
                          "SELECT 1 FROM dispatch_jobs WHERE worker_id = ? AND status IN ('assigned', 'running', 'cancel_requested')",
                          (peer["id"],)).fetchone())
            if active:
                raise WorkerBusyError("同一 host_id 存在其他 Worker，无法安全封锁整机或共享 ComfyUI，请先停止其他实例并清理旧注册")

    def request_worker_restart(self, worker_id, action):
        if not isinstance(action, str) or action not in ("reboot_host", "restart_services"):
            raise ValueError("action 必须为 restart_services 或 reboot_host")
        now = time.time()
        with self.lock, self.db:
            self._begin_guarded_transaction_locked()
            self._check_worker_restart_locked(worker_id, action, now)
            request_id = str(uuid.uuid4())
            scope = ("重启 Windows 整机，自动恢复取决于现有启动配置，可手动恢复 Worker"
                     if action == "reboot_host" else "重启 ComfyUI 和 Worker，不重启 Windows")
            self.db.execute(
                """UPDATE workers SET sync_request_id = ?, sync_action = ?,
                       sync_status = 'pending', sync_message = ?, sync_requested_at = ?,
                       sync_started_at = NULL, sync_finished_at = NULL, updated_at = ?
                   WHERE id = ?""",
                (request_id, action, f"等待节点接收，收到后立即执行并中断当前任务；{scope}", now, now, worker_id),
            )
        return {"worker_id": worker_id, "request_id": request_id, "action": action}

    def _check_sync_target_locked(self, worker_id, capabilities, now):
        target = self.db.execute("SELECT name FROM workers WHERE id = ?", (worker_id,)).fetchone()
        latest = next((item for item in self.db.execute(
            "SELECT id, name FROM workers WHERE retired = 0 ORDER BY created_at DESC, id DESC"
        ) if _worker_name_key(item["name"]) == _worker_name_key(target["name"])), None)
        if latest is None or latest["id"] != worker_id:
            raise WorkerBusyError("只能同步同名最新注册的 Worker")
        self._check_restart_host_locked(worker_id, capabilities, "sync_files", now)

    def request_worker_sync(self, worker_id):
        now = time.time()
        with self.lock, self.db:
            self._begin_guarded_transaction_locked()
            row = self.db.execute(
                "SELECT * FROM workers WHERE id = ? AND retired = 0", (worker_id,)
            ).fetchone()
            if not row:
                raise KeyError("Worker 不存在")
            capabilities = json.loads(row["capabilities_json"] or "{}")
            if _primary_node(capabilities):
                raise WorkerBusyError("主节点不支持远程同步")
            if now - row["last_seen"] > self.offline_seconds:
                raise WorkerBusyError("Worker 已离线")
            if not isinstance(capabilities, dict) or capabilities.get("supports_code_restart") is not True:
                raise WorkerBusyError("Worker 不支持文件同步，请先升级 Worker")
            if row["sync_status"] in ("pending", "running"):
                raise WorkerBusyError("Worker 已有等待中或执行中的维护请求")
            # 同步会使用现有 agent 维护流程；不能让已知的同宿主实例并发维护共享目录。
            self._check_sync_target_locked(worker_id, capabilities, now)
            request_id = str(uuid.uuid4())
            self.db.execute(
                """UPDATE workers SET sync_request_id = ?, sync_action = 'sync_files',
                       sync_status = 'pending', sync_message = ?, sync_requested_at = ?,
                       sync_started_at = NULL, sync_finished_at = NULL, updated_at = ?
                   WHERE id = ?""",
                (request_id, "等待节点空闲", now, now, worker_id),
            )
        return {"worker_id": worker_id, "request_id": request_id, "action": "sync_files"}

    def request_sync_all(self):
        now = time.time()
        request_id = str(uuid.uuid4())
        with self.lock, self.db:
            self._begin_guarded_transaction_locked()
            rows = self.db.execute(
                """SELECT id, name, capabilities_json, sync_action, sync_status FROM workers
                   WHERE retired = 0
                   ORDER BY created_at DESC, id DESC"""
            ).fetchall()
            worker_ids = []
            skipped_count = 0
            primary_count = 0
            seen_names = set()
            for row in rows:
                name_key = _worker_name_key(row["name"])
                if name_key in seen_names:
                    continue
                seen_names.add(name_key)
                capabilities = json.loads(row["capabilities_json"] or "{}")
                if self.commands.blocks_worker_locked(row["id"], _worker_host_id(capabilities)):
                    skipped_count += 1
                    continue
                if _primary_node(capabilities):
                    primary_count += 1
                    continue
                if (not isinstance(capabilities, dict)
                        or not capabilities.get("supports_code_restart")
                        or (row["sync_action"] in ("reboot_host", "restart_services")
                            and row["sync_status"] in ("pending", "running"))):
                    skipped_count += 1
                    continue
                worker_ids.append(row["id"])
            for worker_id in worker_ids:
                self.db.execute(
                    """UPDATE workers
                       SET sync_request_id = ?, sync_action = 'sync_files', sync_status = 'pending',
                           sync_message = ?, sync_requested_at = ?,
                           sync_started_at = NULL, sync_finished_at = NULL,
                           updated_at = ?
                       WHERE id = ?""",
                    (request_id, "等待节点空闲", now, now, worker_id),
                )
        return {
            "request_id": request_id,
            "worker_count": len(worker_ids),
            "skipped_count": skipped_count,
            "primary_count": primary_count,
        }

    def _record_temperature_locked(self, worker_id, telemetry, now):
        # 清理只走时间索引，每次限制删除量，不在心跳里扫描整张历史表。
        self.db.execute(
            """DELETE FROM worker_temperature_samples WHERE rowid IN (
                   SELECT rowid FROM worker_temperature_samples
                   WHERE collected_at < ? ORDER BY collected_at LIMIT ?
               )""",
            (now - TEMPERATURE_RETENTION_SECONDS, TEMPERATURE_CLEANUP_LIMIT),
        )
        if not isinstance(telemetry, dict):
            return
        at = telemetry.get("collected_at")
        if (not _finite_number(at)
                or not now - TEMPERATURE_MAX_AGE_SECONDS <= at <= now + TEMPERATURE_FUTURE_SECONDS):
            return
        gpus = telemetry.get("gpus")
        if not isinstance(gpus, list):
            return
        seen = set()
        for gpu in gpus[:TEMPERATURE_MAX_BATCH]:
            if not isinstance(gpu, dict):
                continue
            index = gpu.get("index")
            if not _temperature_gpu_index(index) or index in seen:
                continue
            seen.add(index)
            latest = self.db.execute(
                """SELECT collected_at FROM worker_temperature_samples
                   WHERE worker_id = ? AND gpu_index = ?
                   ORDER BY collected_at DESC LIMIT 1""", (worker_id, index),
            ).fetchone()
            # 保留原始时间；重放、乱序及过密样本都不能伪装成新观测。
            if latest and at - latest["collected_at"] < TEMPERATURE_SAMPLE_SECONDS:
                continue
            value = gpu.get("temperature_c")
            if not _finite_number(value) or not 0 <= value <= 150:
                value = None
            self.db.execute(
                """INSERT OR IGNORE INTO worker_temperature_samples
                   (worker_id, gpu_index, collected_at, temperature_c) VALUES (?, ?, ?, ?)""",
                (worker_id, index, at, value),
            )

    def temperature_history(self, worker_id, gpu_index=0, minutes=30, now=None):
        """返回原始温度时间点和断线标记；未知 Worker 抛出 KeyError。"""
        if not _temperature_gpu_index(gpu_index):
            raise ValueError("gpu_index 必须为 0 到 255 的整数")
        if isinstance(minutes, bool) or not isinstance(minutes, int) or not 1 <= minutes <= 1440:
            raise ValueError("minutes 必须为 1 到 1440 的整数")
        now = time.time() if now is None else now
        if not _finite_number(now) or now < 0:
            raise ValueError("now 必须为有效时间戳")
        start = now - minutes * 60
        with self.lock:
            if not self.db.execute("SELECT 1 FROM workers WHERE id = ?", (worker_id,)).fetchone():
                raise KeyError("未知 Worker")
            rows = self.db.execute(
                """SELECT collected_at, temperature_c FROM worker_temperature_samples
                   WHERE worker_id = ? AND gpu_index = ? AND collected_at >= ? AND collected_at <= ?
                   ORDER BY collected_at LIMIT ?""",
                (worker_id, gpu_index, start, now, TEMPERATURE_MAX_POINTS),
            ).fetchall()
        points = []
        previous = None
        for row in rows:
            at = row["collected_at"]
            if previous is not None and at - previous > TEMPERATURE_GAP_SECONDS:
                points.append({"at": previous + TEMPERATURE_GAP_SECONDS, "temperature_c": None})
            points.append({"at": at, "temperature_c": row["temperature_c"]})
            previous = at
        # 末尾失联同样断线，但空历史绝不从当前 telemetry 补造过去。
        if previous is not None and now - previous > TEMPERATURE_GAP_SECONDS:
            points.append({"at": previous + TEMPERATURE_GAP_SECONDS, "temperature_c": None})
        return {
            "worker_id": worker_id, "gpu_index": gpu_index, "minutes": minutes,
            "from": start, "to": now, "gap_seconds": TEMPERATURE_GAP_SECONDS,
            "points": points[:TEMPERATURE_MAX_POINTS], "server_time": now,
        }

    def heartbeat(self, worker_id, *, capabilities=None, telemetry=None,
                  comfy_online=False, busy=False, local_busy=None,
                  current_job_id=None, maintenance=None, maintenance_recovery=None, capacity_released=False):
        now = time.time()
        with self.lock, self.db:
            self._begin_guarded_transaction_locked()
            self.commands.expire_locked(now)
            self._expire_service_restarts_locked(now)
            self._requeue_expired_locked(now)
            row = self.db.execute(
                """SELECT id, name, capabilities_json, sync_request_id, sync_action, sync_status,
                          json_extract(capabilities_json, '$.hardware.host_id') AS hardware_host_id,
                          json_extract(capabilities_json, '$.telemetry.host_id') AS telemetry_host_id,
                          json_extract(capabilities_json, '$.host_id') AS reported_host_id
                   FROM workers WHERE id = ? AND retired = 0""",
                (worker_id,),
            ).fetchone()
            if not row:
                return None

            sync_request_id = row["sync_request_id"]
            sync_status = row["sync_status"] or "idle"
            stored_capabilities = None
            if isinstance(capabilities, dict):
                effective_capabilities = capabilities
            else:
                stored_capabilities = json.loads(row["capabilities_json"] or "{}")
                effective_capabilities = stored_capabilities
            guarded = self.db.execute(
                "SELECT * FROM guarded_service_restarts WHERE request_id = ? AND worker_id = ?",
                (sync_request_id, worker_id),
            ).fetchone()
            if guarded and sync_status == "pending":
                try:
                    self._check_guarded_restart_locked(guarded, now, effective_capabilities)
                except (WorkerBusyError, KeyError) as exc:
                    self._set_guarded_restart_locked(guarded, "error", str(exc), now)
                    sync_status = "error"
            is_primary = _primary_node(effective_capabilities)
            maintenance_ack = None
            guarded_report = None
            if isinstance(maintenance, dict):
                guarded_report = self.db.execute(
                    "SELECT * FROM guarded_service_restarts WHERE request_id = ? AND worker_id = ?",
                    (str(maintenance.get("request_id") or ""), worker_id),
                ).fetchone()
            if guarded_report:
                report_status = str(maintenance.get("status") or "")
                status = guarded_report["status"]
                message = str(maintenance.get("message") or "")[:1000]
                if report_status in {"running", "done", "error"}:
                    if status == "pending" and report_status == "running":
                        try:
                            self._check_guarded_restart_locked(guarded_report, now, effective_capabilities)
                            if current_job_id != guarded_report["job_id"]:
                                raise WorkerBusyError("Worker 已不在执行原任务，拒绝重启")
                        except (WorkerBusyError, KeyError) as exc:
                            status, message = "error", str(exc)
                        else:
                            status = "running"
                    elif status == "pending":
                        status, message = "error", message or "未取得 running 握手确认，不能报告重启成功"
                    elif status == "running" and report_status in {"done", "error"}:
                        status = report_status
                        if report_status == "done" and comfy_online is not True:
                            status, message = "error", "ComfyUI 尚未恢复在线，未确认节点服务重启完成"
                    # 终态保持不变，迟到或重放报告不能将拒绝、超时改成成功。
                    if guarded_report["status"] not in {"done", "error"}:
                        self._set_guarded_restart_locked(guarded_report, status, message, now)
                    maintenance_ack = {"request_id": guarded_report["request_id"], "status": status}
                    if guarded_report["request_id"] == sync_request_id:
                        sync_status = status
            elif is_primary:
                if isinstance(maintenance, dict):
                    report_request_id = str(maintenance.get("request_id") or "")
                    report_status = str(maintenance.get("status") or "")
                    if (report_request_id
                            and report_status in {"running", "done", "error"}):
                        maintenance_ack = {
                            "request_id": report_request_id,
                            "status": report_status,
                        }
                if sync_request_id or sync_status != "idle":
                    self.db.execute(
                        """UPDATE workers
                           SET sync_request_id = NULL, sync_status = 'idle',
                               sync_message = NULL, sync_requested_at = NULL,
                               sync_started_at = NULL, sync_finished_at = NULL,
                               updated_at = ?
                           WHERE id = ?""",
                        (now, worker_id),
                    )
                sync_request_id = None
                sync_status = "idle"
            elif isinstance(maintenance, dict):
                report_request_id = str(maintenance.get("request_id") or "")
                report_status = str(maintenance.get("status") or "")
                if (report_request_id == sync_request_id and sync_status in {"done", "error"}
                        and report_status == sync_status):
                    maintenance_ack = {"request_id": sync_request_id, "status": sync_status}
                elif (report_request_id == sync_request_id
                        and report_status in {"running", "done", "error"}
                        and (sync_status in {"pending", "running"} or report_status == sync_status
                             or sync_status == "error" and report_status == "done")):
                    message = str(maintenance.get("message") or "")[:1000]
                    if report_status == "running":
                        try:
                            if row["sync_action"] == "sync_files":
                                self._check_sync_target_locked(worker_id, effective_capabilities, now)
                            elif row["sync_action"] in ("reboot_host", "restart_services"):
                                self._check_restart_host_locked(worker_id, effective_capabilities, row["sync_action"], now)
                        except WorkerBusyError as exc:
                            report_status, message = "error", str(exc)
                    if row["sync_action"] == "reboot_host" and report_status == "done":
                        before = maintenance.get("boot_identity_before")
                        after = maintenance.get("boot_identity_after")
                        if (not isinstance(before, str) or not before.strip()
                                or not isinstance(after, str) or not after.strip()
                                or before == after or not comfy_online):
                            report_status = "error"
                            message = "缺少 Windows 启动标识变化及 ComfyUI 恢复证据，未确认整机重启完成"
                    finished_at = now if report_status in {"done", "error"} else None
                    self.db.execute(
                        """UPDATE workers
                           SET sync_status = ?, sync_message = ?,
                               sync_started_at = COALESCE(sync_started_at, ?),
                               sync_finished_at = ?, updated_at = ?
                           WHERE id = ?""",
                        (report_status, message, now, finished_at, now, worker_id),
                    )
                    sync_status = report_status
                    maintenance_ack = {
                        "request_id": report_request_id,
                        "status": report_status,
                    }

            # Recovery is current health evidence, not a rewrite of a failed operation.
            if (sync_request_id and sync_status == "error" and comfy_online is True
                    and isinstance(maintenance_recovery, dict)
                    and maintenance_recovery.get("request_id") == sync_request_id
                    and isinstance(capabilities, dict)
                    and isinstance(capabilities.get("node_classes"), list)
                    and "KSampler" in capabilities["node_classes"]):
                self.db.execute(
                    "UPDATE workers SET sync_recovered_request_id = ? WHERE id = ?",
                    (sync_request_id, worker_id),
                )

            commands = self.commands.offer_locked(worker_id)
            lease_ttl_seconds = None
            active_job_id = None
            if current_job_id:
                job = self.db.execute(
                    """SELECT status, cancel_requested FROM dispatch_jobs
                       WHERE job_id = ? AND worker_id = ?""",
                    (current_job_id, worker_id),
                ).fetchone()
                if job and job["status"] in LIVE_DISPATCH:
                    active_job_id = current_job_id
                    lease_ttl_seconds = self.lease_seconds
                    self.db.execute(
                        """UPDATE dispatch_jobs SET lease_expires_at = ?, updated_at = ?
                           WHERE job_id = ? AND worker_id = ?""",
                        (now + self.lease_seconds, now, current_job_id, worker_id),
                    )
                    if job["cancel_requested"]:
                        commands.append({"type": "cancel_job", "job_id": current_job_id})
                else:
                    # Worker 仍在报告一个已经结束或失效的租约。不能让这条迟到的
                    # 心跳把机器重新写成 busy，更不能续租后重复执行。
                    commands.append({"type": "abort_job", "job_id": current_job_id})

            if sync_request_id and sync_status == "pending":
                if row["sync_action"] == "sync_files":
                    try:
                        self._check_sync_target_locked(worker_id, effective_capabilities, now)
                    except WorkerBusyError as exc:
                        sync_status = "error"
                        self.db.execute(
                            """UPDATE workers SET sync_status = 'error', sync_message = ?,
                                   sync_finished_at = ?, updated_at = ? WHERE id = ?""",
                            (str(exc), now, now, worker_id),
                        )
                if sync_status == "pending":
                    command = {"type": row["sync_action"], "request_id": sync_request_id}
                    if guarded:
                        command.update(expected_job_id=guarded["job_id"],
                                       expected_attempt_id=guarded["attempt_id"])
                    commands.append(command)

            reported_local_busy = bool(busy) if local_busy is None else bool(local_busy)
            effective_busy = reported_local_busy or active_job_id is not None
            fields = [
                "last_seen = ?", "comfy_online = ?", "busy = ?",
                "current_job_id = ?", "updated_at = ?",
            ]
            values = [now, int(bool(comfy_online)), int(effective_busy), active_job_id, now]
            if capabilities is not None or telemetry is not None:
                merged_capabilities = (
                    dict(capabilities) if capabilities is not None
                    else stored_capabilities
                )
                if not isinstance(merged_capabilities, dict):
                    merged_capabilities = {}
                if telemetry is not None:
                    merged_capabilities["telemetry"] = telemetry
                previous_host = _worker_host_id({
                    "hardware": {"host_id": row["hardware_host_id"]},
                    "telemetry": {"host_id": row["telemetry_host_id"]},
                    "host_id": row["reported_host_id"],
                })
                if (previous_host != _worker_host_id(merged_capabilities)
                        and self.commands.blocks_worker_locked(worker_id, previous_host)):
                    raise WorkerBusyError("远程命令尚未确认停止，不能更换宿主身份")
                fields.append("capabilities_json = ?")
                values.append(_json(merged_capabilities))
            values.append(worker_id)
            self.db.execute(
                f"UPDATE workers SET {', '.join(fields)} WHERE id = ?", values
            )
            if capabilities is not None or telemetry is not None:
                previous_host = _worker_host_id({
                    "hardware": {"host_id": row["hardware_host_id"]},
                    "telemetry": {"host_id": row["telemetry_host_id"]},
                    "host_id": row["reported_host_id"],
                })
                reported_host = _worker_host_id(merged_capabilities)
                if reported_host and reported_host != previous_host:
                    scope = self._worker_access_scope_locked(row["name"], reported_host)
                    self._inherit_worker_access_locked(scope, now)
            # 只消费本次实际携带的遥测，不把已存快照按接收时间重复采样。
            temperature_telemetry = telemetry
            if temperature_telemetry is None and isinstance(capabilities, dict):
                temperature_telemetry = capabilities.get("telemetry")
            self._record_temperature_locked(worker_id, temperature_telemetry, now)
            observed = self.db.execute(
                "SELECT * FROM workers WHERE id = ?", (worker_id,),
            ).fetchone()
            snapshot = dict(observed)
            snapshot.pop("token_hash", None)
            self.capacity.observe_worker(
                snapshot, now,
                released=(capacity_released is True and not current_job_id
                          and not effective_busy and bool(comfy_online)),
            )
            return {
                "commands": commands,
                "server_time": now,
                "lease_ttl_seconds": lease_ttl_seconds,
                "maintenance_ack": maintenance_ack,
                "maintenance_failure": ({
                    "request_id": observed["sync_request_id"], "action": observed["sync_action"],
                    "status": "error", "message": observed["sync_message"],
                } if observed["sync_status"] == "error" and observed["sync_request_id"]
                      and maintenance_blocks_worker(observed) else None),
            }

    def queue_ahead_snapshot(self):
        """Priority/FIFO counts, not worker-specific execution positions or affinity."""
        with self.lock:
            rows = self.db.execute(
                "SELECT job_id FROM dispatch_jobs WHERE status = 'queued' ORDER BY created_at, job_id"
            ).fetchall()
        priority = self.priority_resolver([row['job_id'] for row in rows]) if self.priority_resolver else set()
        rows = sorted(rows, key=lambda row: row['job_id'] not in priority)
        return {row["job_id"]: index for index, row in enumerate(rows)}

    def job_worker_ids(self, job_ids):
        """Trusted dispatch binding, including assigned/history before JOBS catches up."""
        job_ids = list(set(job_ids))
        result = {}
        with self.lock:
            for offset in range(0, len(job_ids), 500):
                batch = job_ids[offset:offset + 500]
                rows = self.db.execute(
                    "SELECT job_id, worker_id FROM dispatch_jobs WHERE worker_id IS NOT NULL "
                    f"AND job_id IN ({','.join('?' for _ in batch)})", batch,
                )
                result.update((row["job_id"], row["worker_id"]) for row in rows)
        return result

    def job_worker_names(self, job_ids):
        job_ids = list(job_ids)
        if not job_ids:
            return {}
        placeholders = ",".join("?" for _ in job_ids)
        with self.lock:
            rows = self.db.execute(
                f"""SELECT jobs.job_id, workers.name
                    FROM dispatch_jobs AS jobs
                    JOIN workers ON workers.id = jobs.worker_id
                    WHERE jobs.job_id IN ({placeholders})""",
                job_ids,
            ).fetchall()
        return {row["job_id"]: row["name"] for row in rows}

    def list_workers(self, *, summary=False, telemetry_only=False, worker_id=None, access_config=False):
        """Default to effective scope; admins may retain unexpired configuration for editing."""
        now = time.time()
        columns = "*"
        if summary or telemetry_only:
            # 轮询只取所需字段，避免把每台数 MB 的节点/模型清单解码成 Python 对象。
            columns = """id, name, enabled, comfy_online, busy, current_job_id,
                         last_seen, sync_status, sync_request_id, sync_recovered_request_id,
                         access_team_id, access_expires_at, access_daily_window_json,
                         json_type(COALESCE(NULLIF(capabilities_json, ''), '{}'),
                                   '$.is_primary_node') = 'true' AS is_primary_node"""
            if telemetry_only and not summary:
                columns += """, sync_requested_at, sync_finished_at, sync_message,
                    json_object(
                        'agent_version', json(COALESCE(COALESCE(NULLIF(capabilities_json, ''), '{}') -> '$.agent_version', 'null')),
                        'telemetry', json_extract(COALESCE(NULLIF(capabilities_json, ''), '{}'), '$.telemetry'),
                        'devices', json_extract(COALESCE(NULLIF(capabilities_json, ''), '{}'), '$.devices'),
                        'system', json_extract(COALESCE(NULLIF(capabilities_json, ''), '{}'), '$.system')
                    ) AS capabilities_json"""
        with self.lock, self.db:
            self._expire_service_restarts_locked(now)
            if summary:
                # 与覆盖索引保持相同表达式；公共健康轮询完全不读取能力 JSON。
                rows = self.db.execute(
                    f"""SELECT {columns} FROM workers WHERE retired = 0
                        ORDER BY created_at DESC, id DESC"""
                ).fetchall()
            else:
                # 只排序轻量身份字段；先去重，再按主键读取能力清单。
                seen_names = set()
                selected_ids = []
                for row in self.db.execute(
                    """SELECT id, name FROM workers WHERE retired = 0
                       ORDER BY created_at DESC, id DESC"""
                ):
                    name_key = _worker_name_key(row["name"])
                    if name_key in seen_names:
                        continue
                    seen_names.add(name_key)
                    if worker_id is None or row["id"] == worker_id:
                        selected_ids.append(row["id"])
                rows = []
                for selected_id in selected_ids:
                    row = self.db.execute(
                        f"SELECT {columns} FROM workers WHERE retired = 0 AND id = ?", (selected_id,),
                    ).fetchone()
                    if row is not None:
                        rows.append(row)
        workers = []
        seen_names = set()
        for row in rows:
            name_key = _worker_name_key(row["name"])
            if name_key in seen_names:
                continue
            seen_names.add(name_key)
            if worker_id is not None and row["id"] != worker_id:
                continue
            item = dict(row)
            item.pop("token_hash", None)
            item.pop("retired", None)
            if (not access_config or (item["access_expires_at"] is not None
                                      and item["access_expires_at"] <= now)):
                item["access_team_id"] = worker_access_team(item, now)
            try:
                item["access_daily_window"] = _worker_daily_window(item)
            except (ValueError, TypeError):
                # Malformed schedules remain all-day restricted, never public.
                item["access_daily_window"] = None
            item.pop("access_daily_window_json", None)
            if item["access_team_id"] is None:
                item["access_expires_at"] = None
            item["enabled"] = bool(item["enabled"])
            item["comfy_online"] = bool(item["comfy_online"])
            item["busy"] = bool(item["busy"])
            if not summary:
                item["capabilities"] = json.loads(item.pop("capabilities_json") or "{}")
            if summary or telemetry_only:
                item["is_primary_node"] = bool(item["is_primary_node"])
            else:
                item["is_primary_node"] = _primary_node(item["capabilities"])
            if item.get("sync_status") == "error" and not maintenance_blocks_worker(item):
                # Keep the failed result in storage, not as a current card error after recovery.
                item["sync_status"] = "idle"
                if "sync_message" in item:
                    item["sync_message"] = None
            online = now - item["last_seen"] <= self.offline_seconds
            if not online:
                item["state"] = "offline"
            elif not item["is_primary_node"] and item.get("sync_status") in {"pending", "running"}:
                item["state"] = "syncing"
            elif not item["is_primary_node"] and maintenance_blocks_worker(item):
                item["state"] = "error"
            elif not item["enabled"]:
                item["state"] = "disabled"
            elif not item["comfy_online"]:
                item["state"] = "error"
            elif item["busy"] or item["current_job_id"]:
                item["state"] = "busy"
            else:
                item["state"] = "idle"
            workers.append(item)
        return workers

    def _service_maintenance_hosts_locked(self):
        hosts = {}
        for row in self.db.execute(
            """SELECT capabilities_json, sync_action, sync_status, sync_request_id,
                      sync_recovered_request_id FROM workers WHERE retired = 0
               AND sync_action IN ('reboot_host', 'restart_services', 'sync_files')
               AND sync_status IN ('pending', 'running', 'error')"""
        ):
            if not maintenance_blocks_worker(row):
                continue
            capabilities = json.loads(row["capabilities_json"] or "{}")
            if row["sync_action"] == "sync_files" and _primary_node(capabilities):
                continue
            host_id = _worker_host_id(capabilities)
            if host_id:
                state = "error" if row["sync_status"] == "error" else "syncing"
                if hosts.get(host_id) != "error":
                    hosts[host_id] = state
        return hosts

    def list_generation_workers(self, *, worker_id=None):
        with self.lock:
            workers = self.list_workers(worker_id=worker_id)
            maintenance = self._service_maintenance_hosts_locked()
            for worker in workers:
                host_id = _worker_host_id(worker["capabilities"])
                if worker["state"] in {"idle", "busy"} and host_id in maintenance:
                    worker["state"] = maintenance[host_id]
            return workers

    def enqueue(self, job_id, payload, required_nodes=None):
        now = time.time()
        with self.lock, self.db:
            self.db.execute(
                """INSERT INTO dispatch_jobs
                   (job_id, payload_json, required_nodes_json, status, created_at, updated_at)
                   VALUES (?, ?, ?, 'queued', ?, ?)""",
                (job_id, _json(payload), _json(sorted(set(required_nodes or []))), now, now),
            )
            self.capacity.enqueue(job_id, payload, now)

    def acquire(self, worker_id):
        # Enter AuthStore's guard BEFORE any dispatch lock; callbacks may reenter
        # that RLock. Do not release until _acquire_with_access has committed.
        guard = self.access_guard
        with (guard if guard is not None else nullcontext()):
            return self._acquire_with_access(worker_id)

    def _acquire_with_access(self, worker_id):
        # Never hold the dispatch lock while entering AuthStore. Revalidate the
        # entire candidate snapshot below, including same-ID payload replacements.
        with self.lock, self.db:
            self._requeue_expired_locked(time.time())
            candidates = self.db.execute(
                "SELECT * FROM dispatch_jobs WHERE status = 'queued' ORDER BY created_at, job_id"
            ).fetchall()
        candidate_ids = {row["job_id"] for row in candidates}
        priority = self.priority_resolver(candidate_ids) if self.priority_resolver else set()
        access = self.access_resolver(candidate_ids) if self.access_resolver else {}
        now = time.time()
        with self.lock, self.db:
            self._begin_guarded_transaction_locked()
            self.commands.expire_locked(now)
            self._requeue_expired_locked(now)
            worker = self.db.execute(
                "SELECT * FROM workers WHERE id = ? AND retired = 0", (worker_id,)
            ).fetchone()
            if not worker or not worker["enabled"] or not worker["comfy_online"]:
                return None
            if now - worker["last_seen"] > self.offline_seconds:
                return None
            if worker["busy"] or worker["current_job_id"]:
                return None
            rows = self.db.execute(
                "SELECT * FROM dispatch_jobs WHERE status = 'queued' ORDER BY created_at, job_id"
            ).fetchall()
            if not rows:
                return None
            if [tuple(row) for row in rows] != [tuple(row) for row in candidates]:
                # Retry next poll rather than dispatch an unverified queue entry.
                return None
            worker = dict(worker)
            capabilities = json.loads(worker["capabilities_json"] or "{}")
            host_id = _worker_host_id(capabilities)
            if self.commands.blocks_worker_locked(worker_id, host_id):
                return None
            maintenance_hosts = self._service_maintenance_hosts_locked()
            if host_id and host_id in maintenance_hosts:
                return None
            if (not _primary_node(capabilities)
                    and maintenance_blocks_worker(worker)):
                return None
            available_nodes = set(capabilities.get("node_classes") or [])
            current_vram = primary_gpu_vram_bytes(capabilities.get("devices"))
            idle_workers = None
            current_team = worker_access_team(worker, now)
            eligible = []
            for row in rows:
                team_ids = access.get(row["job_id"], set())
                if not worker_access_allowed(worker, team_ids, now):
                    continue
                payload = json.loads(row["payload_json"])
                target_worker_id = payload.get("target_worker_id")
                if target_worker_id is not None and target_worker_id != worker_id:
                    continue
                required = set(json.loads(row["required_nodes_json"] or "[]"))
                capability = payload.get("capability")
                gpu_policy = payload.get("gpu_policy")
                # api_generate 从服务端能力清单生成的输出类型；仅有 target 不代表视频。
                # 旧队列项缺少可信输出类型时不启用例外。
                capacity_spec = payload.get("capacity_spec")
                targeted_video = (
                    target_worker_id == worker_id
                    and isinstance(capacity_spec, dict)
                    and isinstance(capacity_spec.get("expected"), dict)
                    and capacity_spec["expected"].get("kind") == "video"
                )
                if (not required.issubset(available_nodes)
                        or not has_required_models(payload.get("graph") or {}, capabilities)
                        or not can_run_capability(
                            capability, capabilities.get("devices"), gpu_policy,
                            payload.get("duration_seconds"), targeted_video=targeted_video,
                        )):
                    continue
                high_vram = requires_high_vram(capability, gpu_policy)
                prefer_dedicated = team_ids is not None and current_team is None and bool(team_ids)
                if target_worker_id is None and (high_vram or prefer_dedicated):
                    if idle_workers is None:
                        # Match list_workers: an idle old registration cannot stand
                        # in for a busy/offline/incompatible newest registration.
                        latest_ids = set()
                        seen_names = set()
                        for registration in self.db.execute(
                            """SELECT id, name FROM workers WHERE retired = 0
                               ORDER BY created_at DESC, id DESC"""
                        ):
                            name_key = _worker_name_key(registration["name"])
                            if name_key not in seen_names:
                                seen_names.add(name_key)
                                latest_ids.add(registration["id"])
                        others = self.db.execute(
                            """SELECT id, capabilities_json, sync_status, sync_request_id,
                                      sync_recovered_request_id, access_team_id, access_expires_at,
                                      access_daily_window_json
                               FROM workers
                               WHERE id != ? AND retired = 0 AND enabled = 1 AND comfy_online = 1
                                 AND busy = 0 AND current_job_id IS NULL
                                 AND last_seen >= ?""",
                            (worker_id, now - self.offline_seconds),
                        ).fetchall()
                        idle_workers = []
                        for item in others:
                            if item["id"] not in latest_ids:
                                continue
                            other = json.loads(item["capabilities_json"] or "{}")
                            if (not _primary_node(other)
                                    and maintenance_blocks_worker(item)):
                                continue
                            other_host = _worker_host_id(other)
                            if other_host and other_host in maintenance_hosts:
                                continue
                            idle_workers.append((dict(item), other))
                    defer = False
                    for other_worker, other in idle_workers:
                        if not worker_access_allowed(other_worker, team_ids, now):
                            continue
                        other_team = worker_access_team(other_worker, now)
                        dedicated = team_ids is not None and other_team is not None
                        # Admins can use every worker but have no dedicated tier.
                        # Members' dedicated workers never yield to public VRAM.
                        larger = (high_vram
                                  and (team_ids is None or current_team is None or dedicated)
                                  and primary_gpu_vram_bytes(other.get("devices")) > current_vram)
                        if not (prefer_dedicated and dedicated or larger):
                            continue
                        if (required.issubset(set(other.get("node_classes") or []))
                                and has_required_models(payload.get("graph") or {}, other)
                                and can_run_capability(
                                    capability, other.get("devices"), gpu_policy,
                                    payload.get("duration_seconds"),
                                )):
                            defer = True
                            break
                    if defer:
                        continue
                eligible.append((row, payload))
            if not eligible:
                return None

            preferred = [item for item in eligible if item[0]['job_id'] in priority]
            if preferred:
                eligible = preferred
            selected, selected_payload = eligible[0]
            oldest_wait = now - selected["created_at"]
            can_prefer_cache = (
                not preferred
                and self.affinity_max_wait_seconds > 0
                and oldest_wait < self.affinity_max_wait_seconds
            )
            matched_exact = False
            if can_prefer_cache and worker["last_capability_id"]:
                exact = next((item for item in eligible
                              if item[1].get("capability") == worker["last_capability_id"]), None)
                if exact:
                    selected, selected_payload = exact
                    matched_exact = True
            if can_prefer_cache and not matched_exact and worker["last_model_family"]:
                family = next((item for item in eligible
                               if item[1].get("model_family") == worker["last_model_family"]), None)
                if family:
                    selected, selected_payload = family

            lease_token = secrets.token_urlsafe(32)
            expires = now + self.lease_seconds
            cur = self.db.execute(
                """UPDATE dispatch_jobs
                   SET status = 'assigned', worker_id = ?, lease_token_hash = ?,
                       lease_expires_at = ?, updated_at = ?
                   WHERE job_id = ? AND status = 'queued'""",
                (worker_id, _hash_token(lease_token), expires, now, selected["job_id"]),
            )
            if cur.rowcount != 1:
                return None
            self.db.execute(
                "UPDATE workers SET busy = 1, current_job_id = ?, updated_at = ? WHERE id = ?",
                (selected["job_id"], now, worker_id),
            )
            snapshot = dict(worker)
            snapshot.pop("token_hash", None)
            attempt_id = self.capacity.assigned(
                selected["job_id"], snapshot, _hash_token(lease_token), now,
            )
            return {
                "attempt_id": attempt_id,
                "job_id": selected["job_id"],
                "lease_token": lease_token,
                "lease_expires_at": expires,
                "payload": selected_payload,
            }

    def mark_running(self, job_id, worker_id, lease_token):
        return self._set_live_status(job_id, worker_id, lease_token, "running")

    def validate_lease(self, job_id, worker_id, lease_token):
        if not lease_token:
            return False
        now = time.time()
        with self.lock:
            row = self.db.execute(
                """SELECT lease_token_hash, lease_expires_at FROM dispatch_jobs
                   WHERE job_id = ? AND worker_id = ? AND status IN ('assigned','running','cancel_requested')""",
                (job_id, worker_id),
            ).fetchone()
        return bool(
            row and row["lease_expires_at"] and row["lease_expires_at"] >= now
            and hmac.compare_digest(row["lease_token_hash"] or "", _hash_token(lease_token))
        )

    def _set_live_status(self, job_id, worker_id, lease_token, status):
        if not self.validate_lease(job_id, worker_id, lease_token):
            return False
        now = time.time()
        with self.lock, self.db:
            cur = self.db.execute(
                """UPDATE dispatch_jobs SET status = ?, lease_expires_at = ?, updated_at = ?
                   WHERE job_id = ? AND worker_id = ?""",
                (status, now + self.lease_seconds, now, job_id, worker_id),
            )
            if cur.rowcount == 1 and status == "running":
                self.capacity.running(job_id, worker_id, _hash_token(lease_token), now)
        return cur.rowcount == 1

    def finish(self, job_id, worker_id, lease_token, status, *,
               capacity_released=False, capacity_outputs=None, capacity_measurements=None):
        if status not in FINISHED_DISPATCH:
            raise ValueError(f"invalid terminal status: {status}")
        if not self.validate_lease(job_id, worker_id, lease_token):
            return False
        now = time.time()
        with self.lock, self.db:
            affinity = None
            if status == "done":
                row = self.db.execute(
                    "SELECT payload_json FROM dispatch_jobs WHERE job_id = ? AND worker_id = ?",
                    (job_id, worker_id),
                ).fetchone()
                if row:
                    payload = json.loads(row["payload_json"])
                    capability = payload.get("capability")
                    if capability:
                        affinity = (capability, payload.get("model_family") or capability)
            cur = self.db.execute(
                """UPDATE dispatch_jobs
                   SET status = ?, lease_expires_at = NULL, lease_token_hash = NULL,
                       cancel_requested = 0, updated_at = ?
                   WHERE job_id = ? AND worker_id = ?""",
                (status, now, job_id, worker_id),
            )
            if affinity:
                self.db.execute(
                    """UPDATE workers
                       SET busy = 0, current_job_id = NULL, updated_at = ?,
                           last_capability_id = ?, last_model_family = ?
                       WHERE id = ? AND current_job_id = ?""",
                    (now, affinity[0], affinity[1], worker_id, job_id),
                )
            else:
                self.db.execute(
                    """UPDATE workers SET busy = 0, current_job_id = NULL, updated_at = ?
                       WHERE id = ? AND current_job_id = ?""",
                    (now, worker_id, job_id),
                )
            if cur.rowcount == 1:
                self.capacity.terminal(
                    job_id, worker_id, _hash_token(lease_token), status, now,
                    released=capacity_released is True, outputs=capacity_outputs,
                    measurements=capacity_measurements,
                )
        return cur.rowcount == 1

    def record_capacity_cache(self, job_id, worker_id, lease_token, nodes):
        with self.lock, self.db:
            if self.validate_lease(job_id, worker_id, lease_token):
                self.capacity.cache(job_id, worker_id, _hash_token(lease_token), nodes)

    def record_capacity_diagnostics(self, job_id, worker_id, lease_token, diagnostics):
        with self.lock, self.db:
            if not self.validate_lease(job_id, worker_id, lease_token):
                return False
            return self.capacity.diagnostics(job_id, worker_id, _hash_token(lease_token), diagnostics)

    def dispatch_status(self, job_id, worker_id=None):
        query = "SELECT status FROM dispatch_jobs WHERE job_id = ?"
        values = [job_id]
        if worker_id is not None:
            query += " AND worker_id = ?"
            values.append(worker_id)
        with self.lock:
            row = self.db.execute(query, values).fetchone()
        return row["status"] if row else None

    def request_cancel(self, job_id):
        now = time.time()
        with self.lock, self.db:
            row = self.db.execute(
                "SELECT status FROM dispatch_jobs WHERE job_id = ?", (job_id,)
            ).fetchone()
            if not row:
                return None
            if row["status"] == "queued":
                self.db.execute(
                    "UPDATE dispatch_jobs SET status = 'canceled', updated_at = ? WHERE job_id = ?",
                    (now, job_id),
                )
                self.capacity.canceled_queued(job_id, now)
                return "canceled"
            if row["status"] in LIVE_DISPATCH:
                self.db.execute(
                    """UPDATE dispatch_jobs
                       SET status = 'cancel_requested', cancel_requested = 1, updated_at = ?
                       WHERE job_id = ?""",
                    (now, job_id),
                )
                return "cancel_requested"
            return row["status"]

    def remove_job(self, job_id):
        with self.lock, self.db:
            self.db.execute("DELETE FROM dispatch_jobs WHERE job_id = ?", (job_id,))

    def clear_finished(self):
        with self.lock, self.db:
            cur = self.db.execute(
                "DELETE FROM dispatch_jobs WHERE status IN ('done','error','canceled')"
            )
        return cur.rowcount

    def _requeue_expired_locked(self, now):
        expired = self.db.execute(
            """SELECT job_id, worker_id, cancel_requested FROM dispatch_jobs
               WHERE status IN ('assigned','running','cancel_requested')
                 AND lease_expires_at IS NOT NULL AND lease_expires_at < ?""",
            (now,),
        ).fetchall()
        for row in expired:
            self.capacity.expired(row["job_id"], row["worker_id"], now)
            next_status = "canceled" if row["cancel_requested"] else "queued"
            if next_status == "canceled":
                self.capacity.canceled_queued(row["job_id"], now)
            self.db.execute(
                """UPDATE dispatch_jobs
                   SET status = ?, worker_id = NULL, lease_token_hash = NULL,
                       lease_expires_at = NULL, cancel_requested = 0, updated_at = ?
                   WHERE job_id = ?""",
                (next_status, now, row["job_id"]),
            )
            if row["worker_id"]:
                self.db.execute(
                    """UPDATE workers SET busy = 0, current_job_id = NULL, updated_at = ?
                       WHERE id = ? AND current_job_id = ?""",
                    (now, row["worker_id"], row["job_id"]),
                )
