# -*- coding: utf-8 -*-
"""Controller-side durable cost ledger and aggregation."""
import json
import sqlite3
import threading
import time
import uuid
from pathlib import Path


MICROS = 1_000_000


def _micros(yuan):
    return None if yuan is None else int(round(float(yuan) * MICROS))


def _yuan(value):
    return 0.0 if value is None else round(value / MICROS, 6)


def _number(value):
    try:
        number = float(value)
        return number if number >= 0 else None
    except (TypeError, ValueError):
        return None


class CostLedger:
    def __init__(self, database_path, pricing_path):
        self.path = Path(database_path)
        self.pricing_path = Path(pricing_path)
        self.pricing = json.loads(self.pricing_path.read_text(encoding="utf-8"))
        self.lock = threading.RLock()
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
                CREATE INDEX IF NOT EXISTS idx_cost_created ON cost_events(created_at);
                CREATE INDEX IF NOT EXISTS idx_cost_category ON cost_events(category, created_at);
                CREATE INDEX IF NOT EXISTS idx_cost_capability ON cost_events(capability, created_at);
                CREATE INDEX IF NOT EXISTS idx_cost_worker ON cost_events(worker_id, created_at);
                """
            )

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

    def start_job(self, job_id, worker_id, started_at=None):
        started_at = float(started_at or time.time())
        with self.lock, self.db:
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
                """SELECT status,started_at,ended_at,cost_source,
                          electricity_rate_micros,full_rate_micros
                   FROM cost_events WHERE job_id=?""",
                (job_id,),
            ).fetchone()
            if not row:
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
        prompt_tokens = int(prompt_tokens or 0)
        completion_tokens = int(completion_tokens or 0)
        rates = next((value for key, value in (self.pricing.get("api_rates") or {}).items()
                      if key.lower() in str(model or "").lower()), None)
        api_cost = 0
        if rates:
            api_cost = _micros(
                prompt_tokens * rates.get("input_per_million_tokens", 0) / 1_000_000
                + completion_tokens * rates.get("output_per_million_tokens", 0) / 1_000_000
            )
        now = time.time()
        job_id = "api:" + uuid.uuid4().hex
        electricity_rate, full_rate = self._rates()
        dimensions = {"model": model or "", "elapsed_ms": int(elapsed_ms or 0)}
        with self.lock, self.db:
            self.db.execute(
                """INSERT INTO cost_events (
                    job_id,event_kind,capability,category,project_id,project_name,card_id,card_name,
                    status,created_at,started_at,ended_at,runtime_seconds,pricing_version,
                    electricity_rate_micros,full_rate_micros,electricity_cost_micros,
                    compute_cost_micros,api_cost_micros,total_cost_micros,cost_source,
                    prompt_tokens,completion_tokens,dimensions_json,updated_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (job_id, "api", capability, "text", project, project_name, card, card_name,
                 "done", now, now - (elapsed_ms or 0) / 1000, now, (elapsed_ms or 0) / 1000,
                 self.pricing.get("version", "unknown"), electricity_rate, full_rate,
                 0, 0, api_cost, api_cost, "actual", prompt_tokens, completion_tokens,
                 json.dumps(dimensions, ensure_ascii=False, separators=(",", ":")), now),
            )

    def backfill(self, jobs):
        jobs_by_id = {job.get("id"): job for job in jobs if job.get("id")}
        with self.lock:
            tables = {row[0] for row in self.db.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )}
            dispatch = list(self.db.execute(
                "SELECT job_id,status,worker_id,payload_json,created_at,updated_at FROM dispatch_jobs"
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
        with self.lock:
            rows = [dict(row) for row in self.db.execute(
                """SELECT c.*,w.name AS worker_name FROM cost_events c
                   LEFT JOIN workers w ON w.id=c.worker_id
                   WHERE c.created_at>=? AND c.created_at<=?
                   ORDER BY c.created_at DESC""", (start, end)
            )]
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
            estimate = _yuan(round((low + high) / 2)) if not has_actual and row["status"] == "done" and low is not None and high is not None else 0.0
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
            overview["api_cost"] += _yuan(row.get("api_cost_micros"))
            overview["gpu_hours"] += (row.get("runtime_seconds") or 0) / 3600
            if row["status"] in ("error", "canceled"):
                overview["failed_waste"] += actual
            if row["status"] == "running" and row.get("started_at"):
                overview["running_accrued"] += max(0, now - row["started_at"]) * row["full_rate_micros"] / 3600 / MICROS
            if not has_actual and estimate == 0 and row["status"] in ("done", "error", "canceled"):
                overview["unknown_cost_tasks"] += 1

            category = row["category"] or "other"
            worker_key = row.get("worker_id") or "unassigned"
            worker_label = row.get("worker_name") or "未分配执行端"
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
                    "cost_source": "actual" if has_actual else ("estimated" if estimate else "unknown"),
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
