# -*- coding: utf-8 -*-
"""Durable pull-based worker registry and dispatch queue."""
import hashlib
import hmac
import json
import secrets
import sqlite3
import threading
import time
import uuid
from pathlib import Path


LIVE_DISPATCH = ("assigned", "running", "cancel_requested")
FINISHED_DISPATCH = ("done", "error", "canceled")


def _hash_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


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
                    last_seen REAL NOT NULL,
                    comfy_online INTEGER NOT NULL DEFAULT 0,
                    busy INTEGER NOT NULL DEFAULT 0,
                    current_job_id TEXT,
                    capabilities_json TEXT NOT NULL DEFAULT '{}',
                    last_capability_id TEXT,
                    last_model_family TEXT,
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
                """
            )
            columns = {row[1] for row in self.db.execute("PRAGMA table_info(workers)")}
            if "last_capability_id" not in columns:
                self.db.execute("ALTER TABLE workers ADD COLUMN last_capability_id TEXT")
            if "last_model_family" not in columns:
                self.db.execute("ALTER TABLE workers ADD COLUMN last_model_family TEXT")

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
                "SELECT token_hash FROM workers WHERE id = ?", (worker_id,)
            ).fetchone()
        return bool(row and hmac.compare_digest(row["token_hash"], _hash_token(token)))

    def set_worker_enabled(self, worker_id, enabled):
        now = time.time()
        with self.lock, self.db:
            cur = self.db.execute(
                "UPDATE workers SET enabled = ?, updated_at = ? WHERE id = ?",
                (1 if enabled else 0, now, worker_id),
            )
        return cur.rowcount > 0

    def heartbeat(self, worker_id, *, capabilities=None, comfy_online=False,
                  busy=False, local_busy=None, current_job_id=None):
        now = time.time()
        with self.lock, self.db:
            self._requeue_expired_locked(now)
            row = self.db.execute(
                "SELECT id FROM workers WHERE id = ?", (worker_id,)
            ).fetchone()
            if not row:
                return None

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

            reported_local_busy = bool(busy) if local_busy is None else bool(local_busy)
            effective_busy = reported_local_busy or active_job_id is not None
            fields = [
                "last_seen = ?", "comfy_online = ?", "busy = ?",
                "current_job_id = ?", "updated_at = ?",
            ]
            values = [now, int(bool(comfy_online)), int(effective_busy), active_job_id, now]
            if capabilities is not None:
                fields.append("capabilities_json = ?")
                values.append(_json(capabilities))
            values.append(worker_id)
            self.db.execute(
                f"UPDATE workers SET {', '.join(fields)} WHERE id = ?", values
            )
            return {
                "commands": commands,
                "server_time": now,
                "lease_ttl_seconds": lease_ttl_seconds,
            }

    def list_workers(self):
        now = time.time()
        with self.lock:
            rows = self.db.execute(
                "SELECT * FROM workers ORDER BY name COLLATE NOCASE, created_at"
            ).fetchall()
        workers = []
        for row in rows:
            item = dict(row)
            item.pop("token_hash", None)
            item["enabled"] = bool(item["enabled"])
            item["comfy_online"] = bool(item["comfy_online"])
            item["busy"] = bool(item["busy"])
            item["capabilities"] = json.loads(item.pop("capabilities_json") or "{}")
            online = now - item["last_seen"] <= self.offline_seconds
            if not online:
                item["state"] = "offline"
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

    def enqueue(self, job_id, payload, required_nodes=None):
        now = time.time()
        with self.lock, self.db:
            self.db.execute(
                """INSERT INTO dispatch_jobs
                   (job_id, payload_json, required_nodes_json, status, created_at, updated_at)
                   VALUES (?, ?, ?, 'queued', ?, ?)""",
                (job_id, _json(payload), _json(sorted(set(required_nodes or []))), now, now),
            )

    def acquire(self, worker_id):
        now = time.time()
        with self.lock, self.db:
            self._requeue_expired_locked(now)
            worker = self.db.execute(
                "SELECT * FROM workers WHERE id = ?", (worker_id,)
            ).fetchone()
            if not worker or not worker["enabled"] or not worker["comfy_online"]:
                return None
            if now - worker["last_seen"] > self.offline_seconds:
                return None
            if worker["busy"] or worker["current_job_id"]:
                return None
            capabilities = json.loads(worker["capabilities_json"] or "{}")
            available_nodes = set(capabilities.get("node_classes") or [])
            rows = self.db.execute(
                "SELECT * FROM dispatch_jobs WHERE status = 'queued' ORDER BY created_at, job_id"
            ).fetchall()
            eligible = []
            for row in rows:
                required = set(json.loads(row["required_nodes_json"] or "[]"))
                if required.issubset(available_nodes):
                    eligible.append((row, json.loads(row["payload_json"])))
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
            return {
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
        return cur.rowcount == 1

    def finish(self, job_id, worker_id, lease_token, status):
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
        return cur.rowcount == 1

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
            next_status = "canceled" if row["cancel_requested"] else "queued"
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
