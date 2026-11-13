"""Durable, administrator-only commands; execution is at-most-once, not retryable."""
import hashlib
import json
import re
import time
import uuid
from pathlib import PurePosixPath, PureWindowsPath


OUTPUT_LIMIT = 65536
ACTIVE = ("pending", "running", "unknown")
TERMINAL = ("succeeded", "failed", "canceled", "timed_out", "skipped", "expired")


def maintenance_blocks_worker(worker):
    worker = dict(worker)
    status = worker.get("sync_status")
    return (status in {"pending", "running"}
            or status == "error" and not (
                worker.get("sync_request_id")
                and worker.get("sync_recovered_request_id") == worker["sync_request_id"]))


class CommandConflict(ValueError):
    pass


def _text(value, limit, name):
    if not isinstance(value, str) or len(value.encode("utf-8")) > limit:
        raise ValueError(f"{name} 必须是最多 {limit} 字节的文本")
    return value


def validate_command(body):
    fields = {"request_key", "all_online", "worker_ids", "interpreter", "script", "cwd", "timeout_seconds"}
    if not isinstance(body, dict) or set(body) != fields:
        raise ValueError("命令字段不完整或包含未知字段")
    key = _text(body["request_key"], 128, "请求标识")
    if not re.fullmatch(r"[a-zA-Z0-9_-]{8,128}", key):
        raise ValueError("请求标识格式无效")
    if type(body["all_online"]) is not bool:
        raise ValueError("all_online 必须为布尔值")
    ids = body["worker_ids"]
    if (not isinstance(ids, list) or len(ids) > 128
            or any(not isinstance(x, str) or not x or len(x) > 128 for x in ids)
            or len(set(ids)) != len(ids)):
        raise ValueError("节点清单无效，最多 128 项且不能重复")
    if (body["all_online"] and ids) or (not body["all_online"] and not ids):
        raise ValueError("必须选择全部在线节点或指定节点，不可同时选择")
    if body["interpreter"] not in ("python", "powershell"):
        raise ValueError("解释器必须为 python 或 powershell")
    script = _text(body["script"], 32768, "命令正文")
    if not script.strip() or "\x00" in script:
        raise ValueError("命令正文不能为空或包含空字符")
    cwd = _text(body["cwd"], 1024, "工作目录")
    if cwd and (any(ord(c) < 32 for c in cwd)
                or not (PureWindowsPath(cwd).is_absolute() or PurePosixPath(cwd).is_absolute())):
        raise ValueError("工作目录必须为空或绝对路径")
    seconds = body["timeout_seconds"]
    if type(seconds) is not int or not 5 <= seconds <= 3600:
        raise ValueError("执行超时须为 5 至 3600 秒整数")
    return {**body, "worker_ids": sorted(ids)}


class WorkerCommands:
    def __init__(self, store, *, host_id, name_key):
        self.store = store
        self.db = store.db
        self.host_id = host_id
        self.name_key = name_key
        with store.lock, self.db:
            self.db.executescript("""
                CREATE TABLE IF NOT EXISTS worker_command_batches (
                    id TEXT PRIMARY KEY, created_by TEXT NOT NULL, request_key TEXT NOT NULL,
                    fingerprint TEXT NOT NULL, interpreter TEXT NOT NULL, script TEXT NOT NULL,
                    cwd TEXT NOT NULL, timeout_seconds INTEGER NOT NULL,
                    all_online INTEGER NOT NULL, created_at REAL NOT NULL,
                    UNIQUE(created_by, request_key)
                );
                CREATE TABLE IF NOT EXISTS worker_command_executions (
                    id TEXT PRIMARY KEY, batch_id TEXT NOT NULL,
                    worker_id TEXT NOT NULL, worker_name TEXT NOT NULL, host_id TEXT,
                    worker_ids_json TEXT NOT NULL, status TEXT NOT NULL,
                    created_at REAL NOT NULL, claim_deadline REAL NOT NULL,
                    started_at REAL, finished_at REAL, claim_key TEXT,
                    cancel_requested INTEGER NOT NULL DEFAULT 0,
                    process_stopped INTEGER NOT NULL DEFAULT 1, exit_code INTEGER,
                    stdout TEXT NOT NULL DEFAULT '', stderr TEXT NOT NULL DEFAULT '',
                    stdout_truncated INTEGER NOT NULL DEFAULT 0,
                    stderr_truncated INTEGER NOT NULL DEFAULT 0,
                    error TEXT NOT NULL DEFAULT '', resolved_by TEXT,
                    FOREIGN KEY(batch_id) REFERENCES worker_command_batches(id)
                );
                CREATE INDEX IF NOT EXISTS idx_worker_commands_host
                    ON worker_command_executions(host_id, status);
                CREATE INDEX IF NOT EXISTS idx_worker_commands_worker
                    ON worker_command_executions(worker_id, status);
                CREATE INDEX IF NOT EXISTS idx_worker_commands_batch
                    ON worker_command_executions(batch_id);
                CREATE INDEX IF NOT EXISTS idx_worker_commands_active
                    ON worker_command_executions(status);
                CREATE INDEX IF NOT EXISTS idx_worker_commands_history
                    ON worker_command_batches(created_at DESC, id DESC);
            """)

    def _workers(self):
        # Read only identity/scheduling fields, not multi-MB node inventories.
        rows = self.db.execute("""
            SELECT id, name, last_seen, busy, current_job_id, comfy_online, retired,
                   sync_status, sync_request_id, sync_recovered_request_id, created_at,
                   json_extract(capabilities_json, '$.hardware.host_id') AS hardware_host_id,
                   json_extract(capabilities_json, '$.telemetry.host_id') AS telemetry_host_id,
                   json_extract(capabilities_json, '$.host_id') AS reported_host_id,
                   json_extract(capabilities_json, '$.remote_commands') AS command_support
            FROM workers WHERE retired = 0 ORDER BY created_at DESC, id DESC
        """).fetchall()
        result = []
        for row in rows:
            item = dict(row)
            item["host_id"] = self.host_id({
                "hardware": {"host_id": row["hardware_host_id"]},
                "telemetry": {"host_id": row["telemetry_host_id"]},
                "host_id": row["reported_host_id"],
            })
            result.append(item)
        return result

    def _latest(self, workers):
        seen = set()
        result = []
        for item in workers:
            key = self.name_key(item["name"])
            if key not in seen:
                seen.add(key)
                result.append(item)
        return result

    def blocks_host_locked(self, host_id):
        return bool(host_id and self.db.execute(
            "SELECT 1 FROM worker_command_executions WHERE host_id = ? "
            "AND status IN ('pending','running','unknown') LIMIT 1", (host_id,),
        ).fetchone())

    def blocks_worker_locked(self, worker_id, host_id=None):
        if self.blocks_host_locked(host_id):
            return True
        if self.db.execute("""SELECT 1 FROM worker_command_executions e
            WHERE e.status IN ('pending','running','unknown') AND (
                e.worker_id=? OR EXISTS (SELECT 1 FROM json_each(e.worker_ids_json) WHERE value=?))
            LIMIT 1""", (worker_id, worker_id)).fetchone():
            return True
        worker = self.db.execute("SELECT name FROM workers WHERE id=?", (worker_id,)).fetchone()
        if not worker:
            return False
        key = self.name_key(worker["name"])
        # Re-enrollment with a new ID/host must not bypass an unresolved old attempt.
        for row in self.db.execute("""SELECT e.worker_name, w.name FROM worker_command_executions e
                JOIN json_each(e.worker_ids_json) ids JOIN workers w ON w.id=ids.value
                WHERE e.status IN ('pending','running','unknown')"""):
            if key in (self.name_key(row["worker_name"]), self.name_key(row["name"])):
                return True
        return False

    def expire_locked(self, now):
        rows = self.db.execute("""
            SELECT e.id, e.worker_id, e.status, e.claim_deadline, e.started_at,
                   b.timeout_seconds, w.last_seen, w.retired
            FROM worker_command_executions e
            JOIN worker_command_batches b ON b.id = e.batch_id
            LEFT JOIN workers w ON w.id = e.worker_id
            WHERE e.status IN ('pending', 'running')
        """).fetchall()
        if not rows:
            return
        registrations = self.db.execute(
            "SELECT id,name FROM workers WHERE retired=0 ORDER BY created_at DESC,id DESC").fetchall()
        latest = {w["id"] for w in self._latest(registrations)}
        for row in rows:
            stale = (row["worker_id"] not in latest or row["retired"]
                     or now - (row["last_seen"] or 0) > self.store.offline_seconds)
            if row["status"] == "pending" and (stale or now > row["claim_deadline"]):
                self.db.execute("""UPDATE worker_command_executions
                    SET status='expired', finished_at=?, error='领取前已离线、注册已更换或等待超时，不会补执行'
                    WHERE id=? AND status='pending'""", (now, row["id"]))
            elif row["status"] == "running" and (
                    now > row["started_at"] + row["timeout_seconds"] + 60
                    or now - (row["last_seen"] or 0) > self.store.offline_seconds + 30):
                self.db.execute("""UPDATE worker_command_executions
                    SET status='unknown', error='执行节点失联或结果超时，未确认进程停止，继续占用宿主'
                    WHERE id=? AND status='running'""", (row["id"],))

    def create(self, created_by, body):
        body = validate_command(body)
        fingerprint = hashlib.sha256(json.dumps(body, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        now = time.time()
        with self.store.lock, self.db:
            self.store._begin_guarded_transaction_locked()
            previous = self.db.execute(
                "SELECT id, fingerprint FROM worker_command_batches WHERE created_by=? AND request_key=?",
                (created_by, body["request_key"]),
            ).fetchone()
            if previous:
                if previous["fingerprint"] != fingerprint:
                    raise CommandConflict("同一请求标识的内容不同，请创建新的请求")
                return self._detail_locked(previous["id"])
            self.expire_locked(now)
            workers = self._latest(self._workers())
            by_id = {w["id"]: w for w in workers}
            if body["all_online"]:
                selected = [w for w in workers if now - w["last_seen"] <= self.store.offline_seconds]
            else:
                if any(worker_id not in by_id for worker_id in body["worker_ids"]):
                    raise CommandConflict("部分节点不存在或不是同名最新注册，请刷新节点清单")
                selected = [by_id[key] for key in body["worker_ids"]]
            if len(selected) > 128:
                raise ValueError("单个批次最多 128 个节点")
            batch_id = str(uuid.uuid4())
            self.db.execute("""INSERT INTO worker_command_batches
                (id,created_by,request_key,fingerprint,interpreter,script,cwd,timeout_seconds,all_online,created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?)""", (
                    batch_id, created_by, body["request_key"], fingerprint, body["interpreter"],
                    body["script"], body["cwd"], body["timeout_seconds"], int(body["all_online"]), now,
                ))
            groups = {}
            for w in selected:
                groups.setdefault(w["host_id"] or "missing:" + w["id"], []).append(w)
            for peers in groups.values():
                eligible = []
                for w in peers:
                    raw = w["command_support"]
                    try:
                        support = json.loads(raw) if isinstance(raw, str) else {}
                    except ValueError:
                        support = {}
                    if (isinstance(support, dict) and type(support.get("version")) is int
                            and support["version"] == 1 and isinstance(support.get("interpreters"), list)
                            and body["interpreter"] in support["interpreters"]):
                        eligible.append(w)
                online_eligible = [w for w in eligible if now - w["last_seen"] <= self.store.offline_seconds]
                target = (online_eligible or eligible or peers)[0]
                host = target["host_id"]
                reason = ""
                if not host:
                    reason = "缺少稳定 host_id，不能确认机器范围"
                elif not eligible:
                    reason = "Worker 未支持此解释器，请先更新 Worker"
                elif now - target["last_seen"] > self.store.offline_seconds:
                    reason = "节点不在线，不会等待未来上线执行"
                elif any(self.blocks_worker_locked(w["id"], host) for w in peers):
                    reason = "同一宿主已有远程命令或执行状态未知"
                elif any(w["host_id"] == host and maintenance_blocks_worker(w) for w in workers):
                    reason = "同一宿主已有维护请求或维护故障"
                status = "skipped" if reason else "pending"
                self.db.execute("""INSERT INTO worker_command_executions
                    (id,batch_id,worker_id,worker_name,host_id,worker_ids_json,status,
                     created_at,claim_deadline,finished_at,error)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?)""", (
                        str(uuid.uuid4()), batch_id, target["id"], target["name"], host,
                        json.dumps([p["id"] for p in peers]), status, now, now + 600,
                        now if reason else None, reason,
                    ))
            return self._detail_locked(batch_id)

    def _summary_locked(self, row):
        item = {key: row[key] for key in (
            "id", "created_by", "created_at", "interpreter", "timeout_seconds",
        )}
        item["counts"] = {r["status"]: r["n"] for r in self.db.execute(
            "SELECT status, COUNT(*) AS n FROM worker_command_executions WHERE batch_id=? GROUP BY status",
            (row["id"],),
        )}
        item["target_count"] = sum(item["counts"].values())
        return item

    def _detail_locked(self, batch_id):
        row = self.db.execute("SELECT * FROM worker_command_batches WHERE id=?", (batch_id,)).fetchone()
        if not row:
            raise KeyError("命令批次不存在")
        batch = self._summary_locked(row)
        batch.update(script=row["script"], cwd=row["cwd"], all_online=bool(row["all_online"]),
                     request_key=row["request_key"])
        executions = []
        for row in self.db.execute(
                "SELECT * FROM worker_command_executions WHERE batch_id=? ORDER BY created_at,worker_name,id",
                (batch_id,)):
            item = dict(row)
            for key in ("claim_key", "claim_deadline", "resolved_by"):
                item.pop(key)
            item["worker_ids"] = json.loads(item.pop("worker_ids_json"))
            for key in ("cancel_requested", "process_stopped", "stdout_truncated", "stderr_truncated"):
                item[key] = bool(item[key])
            executions.append(item)
        return {"batch": batch, "executions": executions}

    def detail(self, batch_id):
        with self.store.lock, self.db:
            self.expire_locked(time.time())
            return self._detail_locked(batch_id)

    def history(self, offset=0, limit=20):
        if type(offset) is not int or not 0 <= offset < 2 ** 63 or type(limit) is not int or not 1 <= limit <= 50:
            raise ValueError("分页参数无效")
        with self.store.lock, self.db:
            self.expire_locked(time.time())
            rows = self.db.execute("""SELECT id,created_by,created_at,interpreter,timeout_seconds
                FROM worker_command_batches ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?""",
                (limit + 1, offset)).fetchall()
            return {"batches": [self._summary_locked(r) for r in rows[:limit]],
                    "next_offset": offset + limit if len(rows) > limit else None}

    def offer_locked(self, worker_id):
        result = []
        for row in self.db.execute("""SELECT e.*, b.interpreter, b.script, b.cwd, b.timeout_seconds
                FROM worker_command_executions e JOIN worker_command_batches b ON b.id=e.batch_id
                WHERE e.worker_id=? AND e.status IN ('pending','running','unknown')
                ORDER BY e.created_at,e.id""", (worker_id,)):
            if row["cancel_requested"]:
                result.append({"type": "cancel_remote_command", "execution_id": row["id"]})
            if row["status"] == "pending":
                result.append({"type": "remote_command", "execution_id": row["id"], **{
                    key: row[key] for key in ("batch_id", "interpreter", "script", "cwd", "timeout_seconds")
                }})
        return result

    def _execution_locked(self, execution_id, worker_id):
        row = self.db.execute("SELECT * FROM worker_command_executions WHERE id=? AND worker_id=?",
                              (execution_id, worker_id)).fetchone()
        if not row:
            raise KeyError("命令不存在或不属于当前 Worker")
        return row

    def claim(self, execution_id, worker_id, claim_key):
        if not isinstance(claim_key, str) or not re.fullmatch(r"[a-zA-Z0-9_-]{8,128}", claim_key):
            raise ValueError("领取标识无效")
        now = time.time()
        with self.store.lock, self.db:
            self.store._begin_guarded_transaction_locked()
            self.expire_locked(now)
            row = self._execution_locked(execution_id, worker_id)
            if row["status"] not in ("pending", "running"):
                return {"execution_id": execution_id, "status": row["status"], "authorized": False}
            workers = self._workers()
            target = next((w for w in workers if w["id"] == worker_id), None)
            if not target or target["host_id"] != row["host_id"]:
                raise CommandConflict("宿主标识已更换，拒绝执行")
            if row["status"] == "running" and row["claim_key"] == claim_key:
                return {"execution_id": execution_id, "status": "running", "authorized": True,
                        "claim_key": claim_key, "cancel_requested": bool(row["cancel_requested"])}
            if row["status"] != "pending" or row["cancel_requested"]:
                return {"execution_id": execution_id, "status": row["status"], "authorized": False}
            for peer in workers:
                if peer["host_id"] != row["host_id"]:
                    continue
                if (peer["current_job_id"] or maintenance_blocks_worker(peer)
                        or peer["busy"]
                        or self.db.execute("SELECT 1 FROM dispatch_jobs WHERE worker_id=? AND status IN "
                                           "('assigned','running','cancel_requested') LIMIT 1", (peer["id"],)).fetchone()):
                    raise CommandConflict("同一宿主仍有生成任务或维护，请等待空闲")
            self.db.execute("""UPDATE worker_command_executions
                SET status='running',claim_key=?,started_at=?,process_stopped=0 WHERE id=? AND status='pending'""",
                (claim_key, now, execution_id))
            return {"execution_id": execution_id, "status": "running", "authorized": True,
                    "claim_key": claim_key, "cancel_requested": False}

    def report(self, execution_id, worker_id, body):
        fields = {"claim_key", "status", "exit_code", "stdout", "stderr", "stdout_truncated",
                  "stderr_truncated", "error", "process_stopped"}
        if not isinstance(body, dict) or set(body) != fields:
            raise ValueError("执行结果字段无效")
        if body["status"] not in ("succeeded", "failed", "canceled", "timed_out", "unknown"):
            raise ValueError("执行结果状态无效")
        _text(body["claim_key"], 128, "领取标识")
        if not re.fullmatch(r"[a-zA-Z0-9_-]{8,128}", body["claim_key"]):
            raise ValueError("领取标识无效")
        for name, limit in (("stdout", OUTPUT_LIMIT), ("stderr", OUTPUT_LIMIT), ("error", 2000)):
            _text(body[name], limit, name)
        for name in ("stdout_truncated", "stderr_truncated", "process_stopped"):
            if type(body[name]) is not bool:
                raise ValueError(f"{name} 必须为布尔值")
        code = body["exit_code"]
        if code is not None and (type(code) is not int or not -(2 ** 63) <= code < 2 ** 63):
            raise ValueError("退出码无效")
        if body["status"] == "succeeded" and (code != 0 or not body["process_stopped"]):
            raise ValueError("成功必须退出码为零且已确认进程树停止")
        if body["status"] != "unknown" and not body["process_stopped"]:
            raise ValueError("未确认进程停止时只能报告状态未知")
        with self.store.lock, self.db:
            self.store._begin_guarded_transaction_locked()
            row = self.db.execute("SELECT * FROM worker_command_executions WHERE id=?", (execution_id,)).fetchone()
            if not row:
                raise KeyError("命令不存在或不属于当前 Worker")
            if row["worker_id"] != worker_id:
                peer = next((w for w in self._workers() if w["id"] == worker_id), None)
                # Shared host journals must learn an operator-resolved stop after the
                # original Worker identity disappears. This ACK cannot modify results.
                if (not peer or not row["host_id"] or peer["host_id"] != row["host_id"]
                        or row["status"] not in TERMINAL or not row["process_stopped"]
                        or row["claim_key"] is not None and row["claim_key"] != body["claim_key"]):
                    raise KeyError("命令不存在或不属于当前 Worker")
                return {"execution_id": execution_id, "status": row["status"], "accepted": True}
            if row["claim_key"] is not None and row["claim_key"] != body["claim_key"]:
                raise CommandConflict("领取标识不匹配")
            if row["status"] in TERMINAL:
                return {"execution_id": execution_id, "status": row["status"], "accepted": True}
            # A crash during claim can have no persisted server claim. Close safely, never launch again.
            if row["status"] == "pending":
                if body["status"] != "unknown":
                    raise CommandConflict("命令尚未领取，不能报告已执行")
                self.db.execute("UPDATE worker_command_executions SET claim_key=? WHERE id=?",
                                (body["claim_key"], execution_id))
            self.db.execute("""UPDATE worker_command_executions SET status=?,exit_code=?,stdout=?,stderr=?,
                stdout_truncated=?,stderr_truncated=?,error=?,process_stopped=?,finished_at=? WHERE id=?""", (
                    body["status"], code, body["stdout"], body["stderr"], int(body["stdout_truncated"]),
                    int(body["stderr_truncated"]), body["error"], int(body["process_stopped"]),
                    time.time() if body["process_stopped"] else None, execution_id,
                ))
            return {"execution_id": execution_id, "status": body["status"], "accepted": True}

    def cancel(self, batch_id, execution_id=None):
        now = time.time()
        with self.store.lock, self.db:
            self.store._begin_guarded_transaction_locked()
            self._detail_locked(batch_id)
            if execution_id and not self.db.execute(
                    "SELECT 1 FROM worker_command_executions WHERE id=? AND batch_id=?",
                    (execution_id, batch_id)).fetchone():
                raise KeyError("执行记录不属于此批次")
            ids = [r["id"] for r in self.db.execute(
                "SELECT id FROM worker_command_executions WHERE batch_id=? AND (? IS NULL OR id=?)",
                (batch_id, execution_id, execution_id))]
            for key in ids:
                self.db.execute("""UPDATE worker_command_executions
                    SET status='canceled',cancel_requested=1,finished_at=?,error='已取消，尚未启动进程'
                    WHERE id=? AND status='pending'""", (now, key))
                self.db.execute("""UPDATE worker_command_executions SET cancel_requested=1
                    WHERE id=? AND status IN ('running','unknown')""", (key,))
            return self._detail_locked(batch_id)

    def resolve(self, batch_id, execution_id, created_by):
        with self.store.lock, self.db:
            self.store._begin_guarded_transaction_locked()
            row = self.db.execute("SELECT * FROM worker_command_executions WHERE id=? AND batch_id=?",
                                  (execution_id, batch_id)).fetchone()
            if not row:
                raise KeyError("执行记录不存在")
            if row["status"] != "unknown":
                raise CommandConflict("只能核实并解除状态未知的执行，请刷新结果")
            self.db.execute("""UPDATE worker_command_executions SET status='failed',process_stopped=1,
                finished_at=?,resolved_by=?,error='管理员已现场核实进程停止并解除占用；未认定命令成功'
                WHERE id=? AND status='unknown'""", (time.time(), created_by, execution_id))
            return self._detail_locked(batch_id)


def command_presets():
    script = (
        "import json, os\n"
        "from model_inventory import scan_inventory\n"
        "print(json.dumps(scan_inventory(os.environ['CHOUKA_COMFY_ROOT'], "
        "offset=0, limit=100), ensure_ascii=False))\n"
    )
    return {"presets": [{"id": "model_inventory", "label": "模型只读盘点（第一页）",
                         "interpreter": "python", "script": script}]}
