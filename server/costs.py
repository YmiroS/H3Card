# -*- coding: utf-8 -*-
"""Controller-side durable cost ledger and aggregation."""
import json
import math
import secrets
from decimal import Decimal, DecimalException, InvalidOperation
import sqlite3
import threading
import time
import uuid
from pathlib import Path


MICROS = 1_000_000
IMAGE_API_MODELS = {
    "banana_api_t2i": ("gemini-3-pro-image", "gemini"),
    "banana_api_i2i": ("gemini-3-pro-image", "gemini"),
    "gpt_image_api_t2i": ("gpt-image-2.5-sunburst", "openai"),
    "gpt_image_api_i2i": ("gpt-image-2.5-sunburst", "openai"),
}


def _micros(yuan):
    return None if yuan is None else int(round(float(yuan) * MICROS))


def _yuan(value):
    return 0.0 if value is None else round(value / MICROS, 6)


def _number(value):
    try:
        number = float(value)
        return number if math.isfinite(number) and number >= 0 else None
    except (TypeError, ValueError):
        return None


class CostLedger:
    def __init__(self, database_path, pricing_path):
        self.path = Path(database_path)
        self.pricing_path = Path(pricing_path)
        self.pricing = json.loads(self.pricing_path.read_text(encoding="utf-8"))
        self.lock = threading.RLock()
        self.dashboard_cursor_key = secrets.token_bytes(32)
        self.db = sqlite3.connect(str(self.path), check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode=WAL")
        self._create_schema()

    def close(self):
        with self.lock:
            self.db.close()

    def rename_project(self, project_id, project_name):
        with self.lock, self.db:
            self.db.execute(
                "UPDATE cost_events SET project_name=?, updated_at=? WHERE project_id=?",
                (project_name, time.time(), project_id),
            )

    def _create_schema(self):
        with self.lock, self.db:
            self.db.executescript(
                """
                CREATE TABLE IF NOT EXISTS cost_events (
                    job_id TEXT PRIMARY KEY,
                    event_kind TEXT NOT NULL DEFAULT 'generation',
                    capability TEXT NOT NULL,
                    category TEXT NOT NULL,
                    model_family TEXT,
                    project_id TEXT,
                    project_name TEXT,
                    card_id TEXT,
                    card_name TEXT,
                    worker_id TEXT,
                    status TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    started_at REAL,
                    ended_at REAL,
                    runtime_seconds REAL,
                    pricing_version TEXT NOT NULL,
                    electricity_rate_micros INTEGER NOT NULL,
                    full_rate_micros INTEGER NOT NULL,
                    estimated_min_micros INTEGER,
                    estimated_max_micros INTEGER,
                    electricity_cost_micros INTEGER,
                    compute_cost_micros INTEGER,
                    api_cost_micros INTEGER,
                    total_cost_micros INTEGER,
                    cost_source TEXT,
                    prompt_tokens INTEGER,
                    completion_tokens INTEGER,
                    dimensions_json TEXT NOT NULL DEFAULT '{}',
                    updated_at REAL NOT NULL
                );
                CREATE TABLE IF NOT EXISTS cost_departments (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL COLLATE NOCASE UNIQUE
                );
                CREATE TABLE IF NOT EXISTS cost_account_departments (
                    user_id TEXT PRIMARY KEY,
                    department_id TEXT NOT NULL REFERENCES cost_departments(id)
                );
                CREATE TABLE IF NOT EXISTS cost_attributions (
                    job_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    department_id TEXT,
                    department_name TEXT,
                    bound_at REAL NOT NULL
                );
                INSERT OR IGNORE INTO cost_departments(id,name) VALUES
                    ('production-1','制作一部'),('production-2','制作二部'),('production-3','制作三部');
                CREATE INDEX IF NOT EXISTS idx_cost_created ON cost_events(created_at);
                CREATE INDEX IF NOT EXISTS idx_cost_category ON cost_events(category, created_at);
                CREATE INDEX IF NOT EXISTS idx_cost_capability ON cost_events(capability, created_at);
                CREATE INDEX IF NOT EXISTS idx_cost_worker ON cost_events(worker_id, created_at);
                """
            )

    def department_catalog(self):
        with self.lock:
            departments = [dict(row) for row in self.db.execute(
                'SELECT id,name FROM cost_departments ORDER BY id')]
            assignments = dict(self.db.execute(
                'SELECT user_id,department_id FROM cost_account_departments').fetchall())
        return departments, assignments

    @staticmethod
    def _department_name(name):
        if (not isinstance(name, str) or not 1 <= len(name.strip()) <= 50
                or any(ord(char) < 32 for char in name)):
            raise ValueError('部门名称须为 1 至 50 字且不能包含控制字符')
        return name.strip()

    def save_department(self, name, department_id=None):
        name = self._department_name(name)
        with self.lock, self.db:
            if department_id is not None:
                if not self.db.execute('SELECT 1 FROM cost_departments WHERE id=?',
                                       (department_id,)).fetchone():
                    raise ValueError('部门不存在')
                self.db.execute('UPDATE cost_departments SET name=? WHERE id=?',
                                (name, department_id))
            else:
                department_id = uuid.uuid4().hex
                self.db.execute('INSERT INTO cost_departments(id,name) VALUES(?,?)',
                                (department_id, name))
        return {'id': department_id, 'name': name}

    def assign_department(self, user_id, department_id):
        # 真实账号存在性由调用方使用 AuthStore 校验，不复制用户表。
        with self.lock, self.db:
            if department_id is None:
                self.db.execute('DELETE FROM cost_account_departments WHERE user_id=?', (user_id,))
            else:
                if not self.db.execute('SELECT 1 FROM cost_departments WHERE id=?',
                                       (department_id,)).fetchone():
                    raise ValueError('部门不存在')
                self.db.execute(
                    'INSERT INTO cost_account_departments(user_id,department_id) VALUES(?,?) '
                    'ON CONFLICT(user_id) DO UPDATE SET department_id=excluded.department_id',
                    (user_id, department_id))
        return {'account_id': user_id, 'department_id': department_id}

    def bind_attribution(self, job_id, user_id):
        """首次可信绑定冻结部门快照，后续调用不重写历史。"""
        if not user_id:
            return
        with self.lock, self.db:
            department = self.db.execute(
                'SELECT d.id,d.name FROM cost_account_departments a '
                'JOIN cost_departments d ON d.id=a.department_id WHERE a.user_id=?',
                (user_id,)).fetchone()
            self.db.execute(
                'INSERT OR IGNORE INTO cost_attributions '
                '(job_id,user_id,department_id,department_name,bound_at) VALUES(?,?,?,?,?)',
                (job_id, user_id, department['id'] if department else None,
                 department['name'] if department else None, time.time()))

    def dashboard_rows(self, start, end):
        """全量读取，兼容目录查询与本地导入等既有调用。"""
        rows, _ = self.dashboard_snapshot(start, end)
        return rows

    def dashboard_snapshot(self, start, end, max_rowid=None):
        """冻结首次读取的入账上界，防止晚补录历史任务混入后续分页。"""
        with self.lock:
            if max_rowid is None:
                max_rowid = self.db.execute('SELECT COALESCE(MAX(rowid),0) FROM cost_events').fetchone()[0]
            has_workers = self.db.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='workers'").fetchone()
            worker = 'w.name' if has_workers else 'NULL'
            join = ' LEFT JOIN workers w ON w.id=c.worker_id' if has_workers else ''
            rows = [dict(row) for row in self.db.execute(
                'SELECT c.*,a.user_id AS snapshot_user_id,a.department_id AS snapshot_department_id,'
                'a.department_name AS snapshot_department_name,' + worker + ' AS worker_name '
                'FROM cost_events c LEFT JOIN cost_attributions a ON a.job_id=c.job_id' + join +
                ' WHERE c.created_at>=? AND c.created_at<=? AND c.rowid<=? '
                'ORDER BY c.created_at DESC,c.job_id DESC', (start, end, max_rowid))]
            return rows, max_rowid

    def _rates(self):
        rates = self.pricing.get("rates") or {}
        return (
            _micros(rates.get("electricity_per_gpu_hour", 0)),
            _micros(rates.get("full_per_gpu_hour", 0)),
        )

    def _spec(self, capability):
        return (self.pricing.get("capabilities") or {}).get(capability) or {
            "category": "other"
        }

    def dimensions(self, capability, params=None, assets=None, graph=None, probe_video=None):
        params, assets, graph = params or {}, assets or {}, graph or {}
        dims = {}
        for key in ("duration", "width", "height", "megapixels", "scale_to_length",
                    "target_fps", "force_rate", "frame_load_cap", "resolution"):
            if key in params and params[key] not in (None, ""):
                dims[key] = params[key]
        dims["image_count"] = sum(bool(v) for k, v in assets.items() if k.startswith("images["))
        dims["audio_count"] = sum(bool(v) for k, v in assets.items() if k.startswith("audio["))
        dims["video_count"] = sum(bool(v) for k, v in assets.items() if k.startswith("video["))

        video_ref = next((v for k, v in assets.items() if k.startswith("video[") and v), None)
        if video_ref and probe_video:
            info = probe_video(video_ref) or {}
            for source, target in (("duration", "source_duration"), ("fps", "source_fps"),
                                   ("frames", "source_frames")):
                if info.get(source) is not None:
                    dims[target] = info[source]

        # Historical character-transfer graphs already contain the resolved timeline.
        if capability == "minimax_h3_character_transfer":
            timeline_node = graph.get("11") or {}
            inputs = timeline_node.get("inputs") or {}
            dims.setdefault("width", inputs.get("width"))
            dims.setdefault("height", inputs.get("height"))
            raw = inputs.get("timeline_data")
            if isinstance(raw, str):
                try:
                    timeline = json.loads(raw)
                    clips = timeline.get("videoClips") or []
                    if clips:
                        dims["source_duration"] = clips[0].get("sourceDuration")
                except ValueError:
                    pass

        # 重启后的 backfill 只有派发图，没有原始 params；成片规格必须从同一张图恢复。
        for node in graph.values():
            if not isinstance(node, dict) or node.get("class_type") not in {"CreateVideo", "VHS_VideoCombine"}:
                continue
            output = node.get("inputs") or {}
            link = output.get("images")
            if (capability in {"minimax_h3_ref_2pass_bf16", "minimax_h3_fusion_v2_bf16"}
                    and isinstance(link, list)
                    and len(link) == 2 and str(link[0]).startswith("h3_1080p_scale_")
                    and graph.get(str(link[0]), {}).get("class_type") == "ImageScale"):
                scaled = graph[str(link[0])]["inputs"]
                generation = graph["136" if capability == "minimax_h3_fusion_v2_bf16" else "186"]["inputs"]
                dims.update(width=scaled["width"], height=scaled["height"],
                            output_width=scaled["width"], output_height=scaled["height"],
                            output_count=1, output_fps=output["frame_rate"],
                            megapixels=generation["width"] * generation["height"] / 1024 ** 2)
                continue  # 没有参考视频时仅校正尺寸，不虚构 trim 或改变原有时长契约。
            if (not isinstance(link, list) or len(link) != 2
                    or not str(link[0]).startswith("follow_reference_scale_")):
                continue
            scaled = graph[str(link[0])]["inputs"]
            fps = output.get("fps", output.get("frame_rate"))
            if node["class_type"] == "CreateVideo":
                seconds = dims["source_duration"]
            else:
                trim = graph[str(scaled["image"][0])]["inputs"]
                seconds = round(trim["length"] / fps, 9)
            dims.update(width=scaled["width"], height=scaled["height"], duration=seconds,
                        output_width=scaled["width"], output_height=scaled["height"],
                        output_duration=seconds, output_fps=fps, output_count=1)
            if capability in {"minimax_h3_ref_2pass_bf16", "minimax_h3_fusion_v2_bf16"}:
                # 参考路径的派发图也已含可信首采宽高；无 params 恢复时补齐实际 MP。
                generation = graph["136" if capability == "minimax_h3_fusion_v2_bf16" else "186"]["inputs"]
                dims.setdefault("megapixels", generation["width"] * generation["height"] / 1024 ** 2)

        if capability == "minimax_h3_comic20":
            dims["segment_count"] = max(1, dims.get("image_count") or 0)
        return {k: v for k, v in dims.items() if v is not None}

    def estimate(self, capability, dimensions=None):
        spec = self._spec(capability)
        low = _number(spec.get("estimated_min"))
        high = _number(spec.get("estimated_max"))
        dims = dimensions or {}
        if low is None or high is None:
            return None, None
        if spec.get("basis") == "segment_count":
            count = max(1, int(_number(dims.get("segment_count")) or 1))
            low, high = low * count, high * count
        elif spec.get("basis") == "output_second_resolution":
            duration = _number(dims.get("source_duration") or dims.get("duration"))
            if duration:
                width = _number(dims.get("width")) or 0
                height = _number(dims.get("height")) or 0
                if width * height >= 800_000:
                    low = high = high * duration
                else:
                    low, high = low * duration, 0.08 * duration
        return _micros(low), _micros(high)

    def retail_quote(self, capability, dimensions=None):
        spec = self._spec(capability)
        dims = dimensions or {}
        basis = spec.get("retail_basis") or "per_job"
        if basis == "output_second_resolution":
            duration = _number(dims.get("source_duration") or dims.get("duration"))
            if not duration:
                return None, None, basis
            width = _number(dims.get("width")) or 0
            height = _number(dims.get("height")) or 0
            level = "high" if width * height >= 800_000 else "low"
            low = _number(spec.get(f"retail_{level}_min_per_second"))
            high = _number(spec.get(f"retail_{level}_max_per_second"))
            if low is None or high is None:
                return None, None, basis
            return _micros(low * duration), _micros(high * duration), basis

        low = _number(spec.get("retail_min"))
        high = _number(spec.get("retail_max"))
        if low is None or high is None:
            return None, None, basis
        if basis == "segment_count":
            count = max(1, int(_number(dims.get("segment_count")) or 1))
            low, high = low * count, high * count
        return _micros(low), _micros(high), basis

    def record_job(self, job, params=None, assets=None, graph=None, probe_video=None,
                   model_family=None, historical=False):
        capability = job.get("capability") or "unknown"
        spec = self._spec(capability)
        with self.lock:
            existing = self.db.execute(
                "SELECT event_kind FROM cost_events WHERE job_id=?", (job["id"],)
            ).fetchone()
        if (capability in IMAGE_API_MODELS or job.get("execution") == "cloud_image"
                or job.get("event_kind") == "image_api" or spec.get("billing_mode") == "paid_api"
                or job.get("billingMode") == "paid_api" or job.get("billing_mode") == "paid_api"
                or (existing and existing["event_kind"] == "image_api")):
            return self.record_image_api(job, model=job.get("model"), params=params, assets=assets)
        dims = self.dimensions(capability, params, assets, graph, probe_video)
        estimate_min, estimate_max = self.estimate(capability, dims)
        electricity_rate, full_rate = self._rates()
        now = time.time()
        source = "estimated" if historical and job.get("status") == "done" and estimate_min is not None else None
        values = (
            job["id"], "generation", capability, spec.get("category", "other"),
            model_family, job.get("project"), job.get("projectName"), job.get("card"),
            job.get("cardName") or job.get("name"), job.get("worker_id"),
            job.get("status") or "queued", float(job.get("created") or now),
            job.get("started"), job.get("ended"), self.pricing.get("version", "unknown"),
            electricity_rate, full_rate, estimate_min, estimate_max, source,
            json.dumps(dims, ensure_ascii=False, separators=(",", ":")), now,
        )
        with self.lock, self.db:
            self.db.execute(
                """
                INSERT INTO cost_events (
                    job_id,event_kind,capability,category,model_family,project_id,project_name,
                    card_id,card_name,worker_id,status,created_at,started_at,ended_at,
                    pricing_version,electricity_rate_micros,full_rate_micros,
                    estimated_min_micros,estimated_max_micros,cost_source,dimensions_json,updated_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(job_id) DO UPDATE SET
                    capability=excluded.capability, category=excluded.category,
                    model_family=COALESCE(excluded.model_family,cost_events.model_family),
                    project_id=COALESCE(excluded.project_id,cost_events.project_id),
                    project_name=COALESCE(excluded.project_name,cost_events.project_name),
                    card_id=COALESCE(excluded.card_id,cost_events.card_id),
                    card_name=COALESCE(excluded.card_name,cost_events.card_name),
                    worker_id=COALESCE(excluded.worker_id,cost_events.worker_id),
                    status=excluded.status,
                    started_at=COALESCE(excluded.started_at,cost_events.started_at),
                    ended_at=COALESCE(excluded.ended_at,cost_events.ended_at),
                    estimated_min_micros=COALESCE(excluded.estimated_min_micros,cost_events.estimated_min_micros),
                    estimated_max_micros=COALESCE(excluded.estimated_max_micros,cost_events.estimated_max_micros),
                    cost_source=COALESCE(cost_events.cost_source,excluded.cost_source),
                    dimensions_json=CASE WHEN excluded.dimensions_json='{}' THEN cost_events.dimensions_json ELSE excluded.dimensions_json END,
                    updated_at=excluded.updated_at
                """, values,
            )
        if job.get("started") is not None and job.get("ended") is not None:
            self.finish_job(job["id"], job.get("status") or "done", job["ended"],
                            worker_id=job.get("worker_id"), started_at=job["started"])

    @staticmethod
    def _set_model_metadata(dimensions, model, model_source):
        """来源只接受调用方明示，不将配置模型冒充供应商响应模型。"""
        if model:
            if model != dimensions.get('model'):
                dimensions['model_source'] = 'unknown'
            dimensions['model'] = model
        if model_source is not None:
            dimensions['model_source'] = model_source if model_source in ('response', 'config', 'unknown') else 'unknown'
        elif dimensions.get('model_source') not in ('response', 'config', 'unknown'):
            dimensions['model_source'] = 'unknown'
        if not dimensions.get('model'):
            dimensions['model_source'] = 'unknown'

    def record_image_api(self, job, *, model, params=None, assets=None):
        """按任务 ID 更新图片 API，费用复用供应商金额及实际模型用量规则。

        缺失字段保留已捕获数据，原币金额不推断币种，不按 API 耗时计 GPU。
        """
        params = params if params is not None else (job.get("params") or {})
        assets = assets if assets is not None else job.get("assets")
        now = time.time()
        with self.lock, self.db:
            previous = self.db.execute(
                "SELECT * FROM cost_events WHERE job_id=?", (job["id"],)
            ).fetchone()
            previous = dict(previous) if previous else {}
            capability = job.get("capability") or previous.get("capability") or "unknown"
            _, default_provider = IMAGE_API_MODELS.get(capability, (None, None))
            dims = json.loads(previous.get("dimensions_json") or "{}")

            def value(*keys):
                for source in (job, params):
                    for key in keys:
                        if source.get(key) not in (None, ""):
                            return source[key]
                return None

            resolved_model = model or value("modelName", "model") or dims.get("model")
            provider = value("provider") or dims.get("provider") or default_provider
            self._set_model_metadata(dims, resolved_model, value('model_source'))
            dims.update(model=resolved_model, provider=provider, billing_mode="paid_api")
            for key, aliases in (
                ("requested_size", ("requested_size", "size", "image_size", "resolution")),
                ("quality", ("quality", "requested_quality")),
                ("request_id", ("request_id", "provider_request_id")),
                ("generation_unknown", ("generation_unknown",)),
            ):
                incoming = value(*aliases)
                if incoming is not None:
                    dims[key] = incoming
            image_count = value("input_image_count", "image_count")
            if image_count is None and assets is not None:
                image_count = sum(bool(v) for k, v in assets.items() if k.startswith("images["))
            if image_count is not None:
                dims["input_image_count"] = dims["image_count"] = int(image_count)
            else:
                dims.setdefault("input_image_count", dims.get("image_count", 0))
                dims.setdefault("image_count", dims["input_image_count"])
            dims.setdefault("generation_unknown", False)
            status = job.get("status") or previous.get("status") or "queued"
            # 延迟通知不能重开终态，但仍允许补录供应商账单。
            if previous.get("status") in ("done", "error", "canceled", "timeout") and status in ("queued", "running"):
                if all(job.get(key) is None for key in ('provider_billing', 'usage', 'model_source')):
                    return
                status = previous["status"]
            started = job.get("started") if job.get("started") is not None else previous.get("started_at")
            ended = job.get("ended") if job.get("ended") is not None else previous.get("ended_at")
            runtime = previous.get("runtime_seconds")
            if started is not None and ended is not None:
                runtime = max(0.0, float(ended) - float(started))
            elif value("elapsed_ms") is not None:
                runtime = (_number(value("elapsed_ms")) or 0) / 1000
            elif value("runtime_seconds", "elapsed") is not None:
                runtime = _number(value("runtime_seconds", "elapsed"))
            self.db.execute(
                """INSERT INTO cost_events (
                    job_id,event_kind,capability,category,model_family,project_id,project_name,
                    card_id,card_name,worker_id,status,created_at,started_at,ended_at,runtime_seconds,
                    pricing_version,electricity_rate_micros,full_rate_micros,
                    electricity_cost_micros,compute_cost_micros,cost_source,dimensions_json,updated_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(job_id) DO UPDATE SET
                    event_kind='image_api', capability=excluded.capability, category='image',
                    model_family=COALESCE(excluded.model_family,cost_events.model_family),
                    project_id=COALESCE(excluded.project_id,cost_events.project_id),
                    project_name=COALESCE(excluded.project_name,cost_events.project_name),
                    card_id=COALESCE(excluded.card_id,cost_events.card_id),
                    card_name=COALESCE(excluded.card_name,cost_events.card_name),
                    worker_id=COALESCE(excluded.worker_id,cost_events.worker_id),
                    status=excluded.status, started_at=excluded.started_at, ended_at=excluded.ended_at,
                    runtime_seconds=excluded.runtime_seconds,
                    electricity_rate_micros=0, full_rate_micros=0,
                    electricity_cost_micros=0, compute_cost_micros=0,
                    dimensions_json=excluded.dimensions_json, updated_at=excluded.updated_at""",
                (job["id"], "image_api", capability, "image", resolved_model,
                 job.get("project"), job.get("projectName"), job.get("card"),
                 job.get("cardName") or job.get("name"), job.get("worker_id"), status,
                 float(job.get("created") or now), started, ended, runtime,
                 self.pricing.get("version", "unknown"), 0, 0, 0, 0, "unknown",
                 json.dumps(dims, ensure_ascii=False, separators=(",", ":")), now),
            )

            self._apply_provider_billing(job['id'], job.get('provider_billing'), job.get('usage'))
            if job.get('user_id'):
                self.bind_attribution(job['id'], job['user_id'])

    @staticmethod
    def _decimal(value):
        try:
            number = Decimal(str(value))
            return number if number.is_finite() and number >= 0 else None
        except (InvalidOperation, ValueError, TypeError):
            return None

    @staticmethod
    def _bounded_cost_micros(value):
        """外部金额须先校验 SQLite int64 边界，越界不丢失原币证据。"""
        if value is None:
            return None
        try:
            micros = (value * MICROS).to_integral_value()
            if not micros.is_finite() or not 0 <= micros <= 2 ** 63 - 1:
                return None
            return int(micros)
        except (DecimalException, ValueError, OverflowError):
            return None

    def _to_cny(self, amount, currency, dimensions):
        if currency == 'CNY':
            return amount
        if currency == 'USD':
            exchange = (self.pricing.get('exchange_rates') or {}).get('USD') or {}
            rate = self._decimal(exchange.get('rate'))
            if rate is not None and rate > 0 and exchange.get('version'):
                dimensions['exchange_rate'] = str(rate)
                dimensions['exchange_version'] = str(exchange['version'])
                try:
                    return amount * rate
                except DecimalException:
                    return None
        return None

    def _apply_provider_billing(self, job_id, provider_billing=None, usage=None):
        # 调用者持有重入锁；缺失更新不会擦除已捕获的原币金额或用量。
        row = self.db.execute('SELECT * FROM cost_events WHERE job_id=?', (job_id,)).fetchone()
        dims = json.loads(row['dimensions_json'] or '{}')
        if isinstance(provider_billing, dict):
            amount = self._decimal(provider_billing.get('amount'))
            if amount is not None:
                dims['provider_billing'] = {
                    'amount': str(provider_billing['amount']),
                    'currency': provider_billing.get('currency'),
                    'field': provider_billing.get('field')}
        saved_usage = dims.get('usage') or {}
        if isinstance(usage, dict):
            for key in ('input_tokens', 'output_tokens', 'cached_tokens', 'reasoning_tokens'):
                value = usage.get(key)
                if isinstance(value, int) and not isinstance(value, bool) and value >= 0:
                    saved_usage[key] = value
        if saved_usage:
            dims['usage'] = saved_usage
        billing = dims.get('provider_billing')
        actual = estimated = None
        source = 'unknown'
        if billing is not None:
            # 无新账单的状态通知保留首次确认的换算结果与汇率版本。
            if provider_billing is None and row['total_cost_micros'] is not None:
                actual = Decimal(row['total_cost_micros']) / MICROS
            else:
                actual = self._to_cny(self._decimal(billing['amount']), billing.get('currency'), dims)
            source = 'provider:' + str(billing.get('field') or 'amount')
        else:
            model = dims.get('model')
            rates = (self.pricing.get('api_rates') or {}).get(model) if model else None
            if rates and all(saved_usage.get(key) is not None for key in ('input_tokens', 'output_tokens')):
                input_rate = self._decimal(rates.get('input_per_million_tokens'))
                output_rate = self._decimal(rates.get('output_per_million_tokens'))
                if input_rate is not None and output_rate is not None:
                    cached = saved_usage.get('cached_tokens', 0)
                    cached_rate = self._decimal(rates.get('cached_input_per_million_tokens'))
                    # 缓存是输入子集；有缓存时必须明确配置缓存单价，不裁剪也不套用输入价。
                    if cached <= saved_usage['input_tokens'] and (cached == 0 or cached_rate is not None):
                        try:
                            amount = ((saved_usage['input_tokens'] - cached) * input_rate
                                      + cached * (cached_rate if cached else Decimal(0))
                                      + saved_usage['output_tokens'] * output_rate) / MICROS
                            estimated = self._to_cny(amount, rates.get('currency', self.pricing.get('currency')), dims)
                        except DecimalException:
                            estimated = None
                        source = 'api_rates'
        dims['billing_source'] = source
        actual_micros = self._bounded_cost_micros(actual)
        estimated_micros = self._bounded_cost_micros(estimated)
        self.db.execute(
            'UPDATE cost_events SET api_cost_micros=?,total_cost_micros=?,estimated_min_micros=?, '
            'estimated_max_micros=?,cost_source=?,prompt_tokens=?,completion_tokens=?,dimensions_json=? '
            'WHERE job_id=?',
            (actual_micros, actual_micros, estimated_micros, estimated_micros,
             'actual' if actual_micros is not None else 'estimated' if estimated_micros is not None else 'unknown',
             saved_usage.get('input_tokens'), saved_usage.get('output_tokens'),
             json.dumps(dims, ensure_ascii=False, separators=(',', ':')), job_id))

    def record_provider_api(self, *, job_id, event_kind, capability, model, created_at, status,
                            provider_billing, usage, user_id, project_id='', project_name='',
                            card_id='', card_name='', scene='', model_source=None):
        """供应商费用优先，Token 费率仅估算，未确认的币种不猜测换算。"""
        if event_kind not in ('api', 'image_api'):
            raise ValueError('不支持的 API 事件类型')
        with self.lock, self.db:
            previous = self.db.execute('SELECT * FROM cost_events WHERE job_id=?', (job_id,)).fetchone()
            dims = json.loads(previous['dimensions_json'] or '{}') if previous else {}
            self._set_model_metadata(dims, model, model_source)
            if scene:
                dims['scene'] = scene
            if previous and previous['status'] in ('done', 'error', 'canceled', 'timeout') and status in ('queued', 'running'):
                status = previous['status']
            category = 'image' if event_kind == 'image_api' else 'text'
            self.db.execute(
                '''INSERT INTO cost_events (job_id,event_kind,capability,category,project_id,project_name,
                   card_id,card_name,status,created_at,pricing_version,electricity_rate_micros,
                   full_rate_micros,electricity_cost_micros,compute_cost_micros,dimensions_json,updated_at)
                   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(job_id) DO UPDATE SET
                   status=excluded.status,dimensions_json=excluded.dimensions_json,
                   capability=excluded.capability,
                   card_id=CASE WHEN excluded.card_id!='' THEN excluded.card_id ELSE cost_events.card_id END,
                   card_name=CASE WHEN excluded.card_name!='' THEN excluded.card_name ELSE cost_events.card_name END,
                   project_id=CASE WHEN excluded.project_id!='' THEN excluded.project_id ELSE cost_events.project_id END,
                   project_name=CASE WHEN excluded.project_name!='' THEN excluded.project_name ELSE cost_events.project_name END,
                   updated_at=excluded.updated_at''',
                (job_id, event_kind, capability, category, project_id, project_name, card_id, card_name,
                 status, float(created_at), self.pricing.get('version', 'unknown'), 0, 0, 0, 0,
                 json.dumps(dims, ensure_ascii=False, separators=(',', ':')), time.time()))
            self._apply_provider_billing(job_id, provider_billing, usage)
            self.bind_attribution(job_id, user_id)
        return job_id

    def start_job(self, job_id, worker_id, started_at=None):
        started_at = float(started_at or time.time())
        with self.lock, self.db:
            row = self.db.execute(
                "SELECT event_kind,status,started_at,ended_at FROM cost_events WHERE job_id=?", (job_id,)
            ).fetchone()
            if row and row["event_kind"] == "image_api":
                if row["ended_at"] is None and row["status"] not in ("done", "error", "canceled", "timeout"):
                    start = row["started_at"] if row["started_at"] is not None else started_at
                    self.record_image_api({"id": job_id, "status": "running", "started": start,
                                           "worker_id": worker_id}, model=None)
                return
            if row and row["event_kind"] == "api":
                return
            self.db.execute(
                """UPDATE cost_events SET status='running', worker_id=?,
                   started_at=COALESCE(started_at,?), ended_at=NULL,
                   runtime_seconds=NULL, electricity_cost_micros=NULL, compute_cost_micros=NULL,
                   total_cost_micros=NULL, cost_source=NULL, updated_at=? WHERE job_id=?""",
                (worker_id, started_at, started_at, job_id),
            )

    def finish_job(self, job_id, status, ended_at=None, worker_id=None, started_at=None):
        ended_at = float(ended_at or time.time())
        with self.lock, self.db:
            row = self.db.execute(
                """SELECT event_kind,status,started_at,ended_at,cost_source,
                          electricity_rate_micros,full_rate_micros
                   FROM cost_events WHERE job_id=?""",
                (job_id,),
            ).fetchone()
            if not row:
                return
            if row["event_kind"] == "image_api":
                if row["ended_at"] is None:
                    self.record_image_api({"id": job_id, "status": status, "ended": ended_at,
                                           "started": started_at, "worker_id": worker_id}, model=None)
                return
            if row["event_kind"] == "api":
                return
            if row["status"] in ("done", "error", "canceled") and row["cost_source"] == "actual":
                return
            start = started_at if started_at is not None else row["started_at"]
            runtime = max(0.0, ended_at - float(start)) if start is not None else 0.0
            electricity = int(round(runtime * row["electricity_rate_micros"] / 3600))
            compute = int(round(runtime * row["full_rate_micros"] / 3600))
            self.db.execute(
                """UPDATE cost_events SET status=?, worker_id=COALESCE(?,worker_id), ended_at=?,
                   runtime_seconds=?, electricity_cost_micros=?, compute_cost_micros=?,
                   api_cost_micros=COALESCE(api_cost_micros,0), total_cost_micros=?,
                   cost_source='actual', updated_at=? WHERE job_id=?""",
                (status, worker_id, ended_at, runtime, electricity, compute, compute,
                 ended_at, job_id),
            )

    def record_api(self, capability, model, prompt_tokens, completion_tokens, elapsed_ms,
                   project=None, project_name=None, card=None, card_name=None):
        now = time.time()
        job_id = 'api:' + uuid.uuid4().hex
        self.record_provider_api(
            job_id=job_id, event_kind='api', capability=capability, model=model,
            created_at=now, status='done', provider_billing=None,
            usage={'input_tokens': prompt_tokens, 'output_tokens': completion_tokens}, user_id=None,
            project_id=project or '', project_name=project_name or '',
            card_id=card or '', card_name=card_name or '')
        with self.lock, self.db:
            row = self.db.execute('SELECT dimensions_json FROM cost_events WHERE job_id=?', (job_id,)).fetchone()
            dimensions = json.loads(row['dimensions_json'])
            dimensions['elapsed_ms'] = int(elapsed_ms or 0)
            self.db.execute(
                'UPDATE cost_events SET started_at=?,ended_at=?,runtime_seconds=?,dimensions_json=? WHERE job_id=?',
                (now - (elapsed_ms or 0) / 1000, now, (elapsed_ms or 0) / 1000,
                 json.dumps(dimensions, ensure_ascii=False, separators=(',', ':')), job_id))
        return job_id

    def backfill(self, jobs):
        jobs_by_id = {job.get("id"): job for job in jobs if job.get("id")}
        # Cloud requests have no dispatch_jobs row. Recover interrupted requests
        # from JOBS, but never rewrite an already terminal account-history event.
        with self.lock, self.db:
            for job in jobs_by_id.values():
                existing = self.db.execute(
                    "SELECT event_kind,status FROM cost_events WHERE job_id=?", (job["id"],)
                ).fetchone()
                if not (job.get("capability") in IMAGE_API_MODELS
                        or job.get("billingMode") == "paid_api"
                        or job.get("billing_mode") == "paid_api"
                        or (existing and existing["event_kind"] == "image_api")):
                    continue
                if existing and existing["status"] not in ("queued", "running"):
                    continue
                self.record_image_api(job, model=job.get("modelName") or job.get("model"))
        with self.lock:
            tables = {row[0] for row in self.db.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )}
            # 启动回填仅补缺失或未完成账目，终态历史记录必须原样保留。
            dispatch = list(self.db.execute(
                """SELECT d.job_id,d.status,d.worker_id,d.payload_json,d.created_at,d.updated_at
                   FROM dispatch_jobs d
                   WHERE NOT EXISTS (
                       SELECT 1 FROM cost_events c WHERE c.job_id=d.job_id
                       AND (c.status IN ('done','error','canceled')
                            OR (c.event_kind='image_api' AND c.status NOT IN ('queued','running')))
                   )"""
            )) if "dispatch_jobs" in tables else []
        for row in dispatch:
            payload = json.loads(row["payload_json"] or "{}")
            recent = jobs_by_id.get(row["job_id"])
            job = dict(recent) if recent else {
                "id": row["job_id"], "capability": payload.get("capability") or "unknown",
                "status": row["status"], "created": row["created_at"],
                "worker_id": row["worker_id"],
            }
            job.setdefault("capability", payload.get("capability") or "unknown")
            job.setdefault("worker_id", row["worker_id"])
            self.record_job(job, assets=payload.get("assets"), graph=payload.get("graph"),
                            model_family=payload.get("model_family"), historical=recent is None)

    def report(self, start=None, end=None, limit=100):
        start = float(start or 0)
        end = float(end or time.time())
        limit = max(1, min(int(limit or 100), 2000))
        rows = self.dashboard_rows(start, end)
        labels = self.pricing.get("categories") or {}
        overview = {
            "tasks": len(rows), "done": 0, "error": 0, "canceled": 0,
            "retail_min": 0.0, "retail_max": 0.0, "retail_mid": 0.0,
            "retail_known_tasks": 0, "retail_unknown_tasks": 0,
            "actual_cost": 0.0, "estimated_cost": 0.0, "total_cost": 0.0,
            "electricity_cost": 0.0, "api_cost": 0.0, "gpu_hours": 0.0,
            "failed_waste": 0.0, "running_accrued": 0.0, "unknown_cost_tasks": 0,
        }
        groups = {"by_category": {}, "by_capability": {}, "by_worker": {}}
        now = time.time()

        def add(group, key, label, row, actual, estimated, recognized,
                retail_min, retail_max, retail_priced):
            item = group.setdefault(key, {
                "key": key, "label": label, "tasks": 0, "done": 0, "error": 0,
                "canceled": 0, "runtime_seconds": 0.0, "actual_cost": 0.0,
                "estimated_cost": 0.0, "total_cost": 0.0,
                "retail_min": 0.0, "retail_max": 0.0, "retail_mid": 0.0,
                "retail_known_tasks": 0, "retail_unknown_tasks": 0,
            })
            item["tasks"] += 1
            if row["status"] in ("done", "error", "canceled"):
                item[row["status"]] += 1
            item["runtime_seconds"] += row.get("runtime_seconds") or 0
            item["actual_cost"] += actual
            item["estimated_cost"] += estimated
            item["total_cost"] += recognized
            item["retail_min"] += retail_min
            item["retail_max"] += retail_max
            item["retail_mid"] += (retail_min + retail_max) / 2
            if row["status"] == "done":
                item["retail_known_tasks" if retail_priced else "retail_unknown_tasks"] += 1

        details = []
        for row in rows:
            has_actual = row.get("total_cost_micros") is not None
            actual = _yuan(row.get("total_cost_micros")) if has_actual else 0.0
            low = row.get("estimated_min_micros")
            high = row.get("estimated_max_micros")
            is_api = row['event_kind'] in ('api', 'image_api')
            has_estimate = (not has_actual and low is not None and high is not None
                            and (row['status'] == 'done' or (is_api and row['cost_source'] == 'estimated')))
            estimate = _yuan(round((low + high) / 2)) if has_estimate else 0.0
            recognized = actual + estimate
            dimensions = json.loads(row.get("dimensions_json") or "{}")
            quote_capability = "text" if row["event_kind"] == "api" else row["capability"]
            retail_low_micros, retail_high_micros, retail_basis = self.retail_quote(
                quote_capability, dimensions
            )
            retail_priced = row["status"] == "done" and retail_low_micros is not None
            if retail_priced:
                retail_min = _yuan(retail_low_micros)
                retail_max = _yuan(retail_high_micros)
                overview["retail_known_tasks"] += 1
            else:
                retail_min = retail_max = 0.0
                if row["status"] == "done":
                    overview["retail_unknown_tasks"] += 1
            overview["retail_min"] += retail_min
            overview["retail_max"] += retail_max
            overview["retail_mid"] += (retail_min + retail_max) / 2
            overview["done"] += row["status"] == "done"
            overview["error"] += row["status"] == "error"
            overview["canceled"] += row["status"] == "canceled"
            overview["actual_cost"] += actual
            overview["estimated_cost"] += estimate
            overview["total_cost"] += recognized
            overview["electricity_cost"] += _yuan(row.get("electricity_cost_micros"))
            # API 已知费用与 recognized 同口径，实际与估算仍分别累计。
            overview['api_cost'] += recognized if is_api else _yuan(row.get('api_cost_micros'))
            if not is_api:
                overview["gpu_hours"] += (row.get("runtime_seconds") or 0) / 3600
            if row["status"] in ("error", "canceled"):
                overview["failed_waste"] += actual
            if not is_api and row["status"] == "running" and row.get("started_at"):
                overview["running_accrued"] += max(0, now - row["started_at"]) * row["full_rate_micros"] / 3600 / MICROS
            if (not has_actual and not has_estimate
                    and (is_api or row["status"] in ("done", "error", "canceled"))):
                overview["unknown_cost_tasks"] += 1

            category = row["category"] or "other"
            worker_key = "paid_api" if is_api else (row.get("worker_id") or "unassigned")
            worker_label = "付费 API" if is_api else (row.get("worker_name") or "未分配执行端")
            add(groups["by_category"], category, labels.get(category, category), row,
                actual, estimate, recognized, retail_min, retail_max, retail_priced)
            add(groups["by_capability"], row["capability"], row["card_name"] or row["capability"],
                row, actual, estimate, recognized, retail_min, retail_max, retail_priced)
            add(groups["by_worker"], worker_key, worker_label, row, actual, estimate,
                recognized, retail_min, retail_max, retail_priced)
            if len(details) < limit:
                details.append({
                    "job_id": row["job_id"], "event_kind": row["event_kind"],
                    "capability": row["capability"], "category": category,
                    "category_name": labels.get(category, category), "status": row["status"],
                    "project_name": row.get("project_name") or "", "card_name": row.get("card_name") or "",
                    "worker_name": worker_label, "created_at": row["created_at"],
                    "runtime_seconds": row.get("runtime_seconds"), "actual_cost": actual,
                    "estimated_cost": estimate, "recognized_cost": recognized,
                    "cost_source": "actual" if has_actual else ("estimated" if has_estimate else "unknown"),
                    "retail_min": retail_min, "retail_max": retail_max,
                    "retail_basis": retail_basis,
                    "retail_source": ("priced" if row["status"] == "done" and retail_low_micros is not None
                                      else "unpriced" if row["status"] == "done" else "not_billable"),
                    "dimensions": dimensions,
                })

        for key in overview:
            if isinstance(overview[key], float):
                overview[key] = round(overview[key], 6)
        result_groups = {}
        for name, values in groups.items():
            items = list(values.values())
            for item in items:
                for field in ("runtime_seconds", "actual_cost", "estimated_cost", "total_cost",
                              "retail_min", "retail_max", "retail_mid"):
                    item[field] = round(item[field], 6)
            result_groups[name] = sorted(items, key=lambda item: item["retail_mid"], reverse=True)
        return {
            "pricing_version": self.pricing.get("version"),
            "currency": self.pricing.get("currency", "CNY"),
            "period": {"from": start, "to": end},
            "overview": overview,
            **result_groups,
            "jobs": details,
        }
