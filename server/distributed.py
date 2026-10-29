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
from pathlib import Path

from capacity import CapacityStore


LIVE_DISPATCH = ("assigned", "running", "cancel_requested")
FINISHED_DISPATCH = ("done", "error", "canceled")
HIGH_VRAM_CAPABILITIES = frozenset({
    "minimax_h3_ref_2pass", "minimax_h3_ref_2pass_bf16", "minimax_h3_fusion_v2_bf16",
})
HIGH_VRAM_GPU_POLICY = "primary_gpu_vram_gte_32gb"
MIN_HIGH_QUALITY_VRAM_BYTES = 32_000_000_000
BF16_TWO_PASS_CAPABILITY = "minimax_h3_ref_2pass_bf16"
BF16_HIGH_VRAM_CAPABILITIES = frozenset({BF16_TWO_PASS_CAPABILITY, "minimax_h3_fusion_v2_bf16"})
# devices 的显存字段单位是 bytes；这两种模式要求严格超过 80 GiB，而不是 >=80。
BF16_TWO_PASS_VRAM_EXCLUSIVE_BYTES = 80 * 1024 ** 3
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
    # 显式指定的视频仅豁免 PRO 6000 专用保留规则，不豁免下方显存/策略门槛。
    if (is_pro_6000_worker(devices) and capability not in BF16_HIGH_VRAM_CAPABILITIES
            and not targeted_video):
        return False
    if capability in BF16_HIGH_VRAM_CAPABILITIES:
        # 共用入口先执行硬门槛，不能被 32GB 策略、短视频或亲和性兜底放宽。
        # 96GB RTX PRO 6000 和其他 >80GiB 卡均可；旧 24/48GB 6000
        # 或仅凭 PRO/Blackwell 名称、显存未知的设备不能获得豁免。
        return primary_gpu_vram_bytes(devices) > BF16_TWO_PASS_VRAM_EXCLUSIVE_BYTES
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
                 affinity_max_wait_seconds=60):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.lease_seconds = lease_seconds
        self.offline_seconds = offline_seconds
        self.affinity_max_wait_seconds = affinity_max_wait_seconds
        self.lock = threading.RLock()
        self.db = sqlite3.connect(str(self.path), check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA foreign_keys=ON")
        self._create_schema()
        self.capacity = CapacityStore(self)

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
                    sync_request_id TEXT,
                    sync_action TEXT NOT NULL DEFAULT 'sync_files',
                    sync_status TEXT NOT NULL DEFAULT 'idle',
                    sync_message TEXT,
                    sync_requested_at REAL,
                    sync_started_at REAL,
                    sync_finished_at REAL,
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
                "sync_request_id": "TEXT",
                "sync_action": "TEXT NOT NULL DEFAULT 'sync_files'",
                "sync_status": "TEXT NOT NULL DEFAULT 'idle'",
                "sync_message": "TEXT",
                "sync_requested_at": "REAL",
                "sync_started_at": "REAL",
                "sync_finished_at": "REAL",
            }
            for name, definition in sync_columns.items():
                if name not in columns:
                    self.db.execute(f"ALTER TABLE workers ADD COLUMN {name} {definition}")

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
            self.db.execute(
                """INSERT INTO workers
                   (id, name, token_hash, last_seen, capabilities_json, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (worker_id, name, _hash_token(token), now,
                 _json(capabilities or {}), now, now),
            )
        return {"worker_id": worker_id, "worker_token": token}

    def authenticate(self, worker_id, token):
        if not worker_id or not token:
            return False
        with self.lock:
            row = self.db.execute(
                "SELECT token_hash FROM workers WHERE id = ? AND retired = 0", (worker_id,)
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

    def _expire_service_restarts_locked(self, now):
        self.db.execute(
            """UPDATE workers SET sync_status = 'error', sync_finished_at = ?, updated_at = ?,
                   sync_message = '重启超过15分钟，尚未确认恢复；请检查节点并手动恢复服务'
               WHERE retired = 0 AND sync_action IN ('restart_services', 'reboot_host')
                 AND sync_status = 'running' AND sync_started_at <= ?""",
            (now, now, now - 900),
        )

    def _check_restart_host_locked(self, worker_id, capabilities, action, now):
        host_id = _worker_host_id(capabilities)
        if not host_id:
            if action == "reboot_host":
                raise WorkerBusyError("缺少稳定 host_id，无法确认整机重启范围")
            return
        target = self.db.execute("SELECT name FROM workers WHERE id = ?", (worker_id,)).fetchone()
        for peer in self.db.execute("SELECT * FROM workers WHERE retired = 0 AND id != ?", (worker_id,)):
            if _worker_host_id(json.loads(peer["capabilities_json"] or "{}")) != host_id:
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
            row = self.db.execute(
                "SELECT * FROM workers WHERE id = ? AND retired = 0", (worker_id,)
            ).fetchone()
            if not row:
                raise KeyError("Worker 不存在")
            latest = next((item for item in self.db.execute(
                "SELECT id, name FROM workers WHERE retired = 0 ORDER BY created_at DESC, id DESC"
            ) if _worker_name_key(item["name"]) == _worker_name_key(row["name"])), None)
            capabilities = json.loads(row["capabilities_json"] or "{}")
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
            if row["sync_status"] in ("pending", "running"):
                raise WorkerBusyError("Worker 已有等待中或执行中的维护请求")
            request_id = str(uuid.uuid4())
            scope = ("重启 Windows 整机，自动恢复取决于现有启动配置，可手动恢复 Worker"
                     if action == "reboot_host" else "重启 ComfyUI 和 Worker，不重启 Windows")
            self.db.execute(
                """UPDATE workers SET sync_request_id = ?, sync_action = ?,
                       sync_status = 'pending', sync_message = ?, sync_requested_at = ?,
                       sync_started_at = NULL, sync_finished_at = NULL, updated_at = ?
                   WHERE id = ?""",
                (request_id, action, f"等待节点空闲；{scope}", now, now, worker_id),
            )
        return {"worker_id": worker_id, "request_id": request_id, "action": action}

    def request_sync_all(self):
        now = time.time()
        request_id = str(uuid.uuid4())
        with self.lock, self.db:
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
                  current_job_id=None, maintenance=None, capacity_released=False):
        now = time.time()
        with self.lock, self.db:
            self._expire_service_restarts_locked(now)
            self._requeue_expired_locked(now)
            row = self.db.execute(
                """SELECT id, capabilities_json, sync_request_id, sync_action, sync_status
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
            is_primary = _primary_node(effective_capabilities)
            maintenance_ack = None
            if is_primary:
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
                if (report_request_id == sync_request_id
                        and report_status in {"running", "done", "error"}
                        and (sync_status in {"pending", "running"} or report_status == sync_status
                             or sync_status == "error" and report_status == "done")):
                    message = str(maintenance.get("message") or "")[:1000]
                    if row["sync_action"] in ("reboot_host", "restart_services") and report_status == "running":
                        try:
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

            commands = []
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
                commands.append({
                    "type": row["sync_action"],
                    "request_id": sync_request_id,
                })

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
                fields.append("capabilities_json = ?")
                values.append(_json(merged_capabilities))
            values.append(worker_id)
            self.db.execute(
                f"UPDATE workers SET {', '.join(fields)} WHERE id = ?", values
            )
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
            }

    def queue_ahead_snapshot(self):
        """Submission-order counts, not worker-specific execution positions."""
        with self.lock:
            rows = self.db.execute(
                "SELECT job_id FROM dispatch_jobs WHERE status = 'queued' ORDER BY created_at, job_id"
            ).fetchall()
        return {row["job_id"]: index for index, row in enumerate(rows)}

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

    def list_workers(self):
        now = time.time()
        with self.lock, self.db:
            self._expire_service_restarts_locked(now)
            rows = self.db.execute(
                """SELECT * FROM workers WHERE retired = 0
                   ORDER BY created_at DESC, id DESC"""
            ).fetchall()
        workers = []
        seen_names = set()
        for row in rows:
            name_key = _worker_name_key(row["name"])
            if name_key in seen_names:
                continue
            seen_names.add(name_key)
            item = dict(row)
            item.pop("token_hash", None)
            item.pop("retired", None)
            item["enabled"] = bool(item["enabled"])
            item["comfy_online"] = bool(item["comfy_online"])
            item["busy"] = bool(item["busy"])
            item["capabilities"] = json.loads(item.pop("capabilities_json") or "{}")
            item["is_primary_node"] = _primary_node(item["capabilities"])
            online = now - item["last_seen"] <= self.offline_seconds
            if not online:
                item["state"] = "offline"
            elif not item["is_primary_node"] and item.get("sync_status") in {"pending", "running"}:
                item["state"] = "syncing"
            elif not item["is_primary_node"] and item.get("sync_status") == "error":
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
            """SELECT capabilities_json, sync_status FROM workers WHERE retired = 0
               AND sync_action IN ('reboot_host', 'restart_services')
               AND sync_status IN ('pending', 'running', 'error')"""
        ):
            host_id = _worker_host_id(json.loads(row["capabilities_json"] or "{}"))
            if host_id:
                state = "error" if row["sync_status"] == "error" else "syncing"
                if hosts.get(host_id) != "error":
                    hosts[host_id] = state
        return hosts

    def list_generation_workers(self):
        with self.lock:
            workers = self.list_workers()
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
        now = time.time()
        with self.lock, self.db:
            self._requeue_expired_locked(now)
            worker = self.db.execute(
                "SELECT * FROM workers WHERE id = ? AND retired = 0", (worker_id,)
            ).fetchone()
            if not worker or not worker["enabled"] or not worker["comfy_online"]:
                return None
            capabilities = json.loads(worker["capabilities_json"] or "{}")
            host_id = _worker_host_id(capabilities)
            if host_id and host_id in self._service_maintenance_hosts_locked():
                return None
            if (not _primary_node(capabilities)
                    and worker["sync_status"] in ("pending", "running", "error")):
                return None
            if now - worker["last_seen"] > self.offline_seconds:
                return None
            if worker["busy"] or worker["current_job_id"]:
                return None
            available_nodes = set(capabilities.get("node_classes") or [])
            current_vram = primary_gpu_vram_bytes(capabilities.get("devices"))
            idle_workers = self.db.execute(
                """SELECT id, capabilities_json, sync_status FROM workers
                   WHERE id != ? AND retired = 0 AND enabled = 1 AND comfy_online = 1
                     AND busy = 0 AND current_job_id IS NULL
                     AND last_seen >= ?""",
                (worker_id, now - self.offline_seconds),
            ).fetchall()
            idle_capabilities = []
            for item in idle_workers:
                other_capabilities = json.loads(item["capabilities_json"] or "{}")
                if (_primary_node(other_capabilities)
                        or item["sync_status"] not in ("pending", "running", "error")):
                    idle_capabilities.append(other_capabilities)
            rows = self.db.execute(
                "SELECT * FROM dispatch_jobs WHERE status = 'queued' ORDER BY created_at, job_id"
            ).fetchall()
            eligible = []
            for row in rows:
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
                if target_worker_id is None and requires_high_vram(capability, gpu_policy) and any(
                    primary_gpu_vram_bytes(other.get("devices")) > current_vram
                    and required.issubset(set(other.get("node_classes") or []))
                    and has_required_models(payload.get("graph") or {}, other)
                    and can_run_capability(
                        capability, other.get("devices"), gpu_policy,
                        payload.get("duration_seconds"),
                    )
                    for other in idle_capabilities
                ):
                    continue
                eligible.append((row, payload))
            if not eligible:
                return None

            selected, selected_payload = eligible[0]
            oldest_wait = now - selected["created_at"]
            can_prefer_cache = (
                self.affinity_max_wait_seconds > 0
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
