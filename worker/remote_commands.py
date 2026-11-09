"""Authenticated administrator commands. Durable at-most-once attempts, not exactly-once.

A host-wide journal and OS lock fence all Worker identities on this host. An
uncertain interrupted attempt is never replayed and requires manual inspection.
"""
import asyncio
import ctypes
import hashlib
import json
import math
import os
from pathlib import Path
import signal
import sqlite3
import sys
import time
from urllib.parse import quote
import uuid

OUTPUT_LIMIT = 65536
ERROR_LIMIT = 2000
MAX_PENDING = 128
MAX_SCRIPT = 1024 * 1024
STOPPED_TERMINAL = {"succeeded", "failed", "canceled", "timed_out", "expired"}
_LOCAL_LOCKS = set()


def utf8_limit(value, limit):
    return str(value).encode("utf-8", "replace")[:limit].decode("utf-8", "ignore")


def capabilities():
    return {"version": 1, "interpreters": ["python", "powershell"] if os.name == "nt" else ["python"]}


class HostLock:
    def __init__(self, path, host_id):
        self.path = Path(path)
        self.key = hashlib.sha256(str(host_id).encode("utf-8")).hexdigest()
        self.handle = None

    def acquire(self):
        if self.key in _LOCAL_LOCKS:
            return False
        if os.name == "nt":
            kernel = ctypes.WinDLL("kernel32", use_last_error=True)
            kernel.CreateMutexW.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_wchar_p]
            kernel.CreateMutexW.restype = ctypes.c_void_p
            kernel.WaitForSingleObject.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
            kernel.CloseHandle.argtypes = [ctypes.c_void_p]
            handle = kernel.CreateMutexW(None, False, "Global\\ChoukaRemoteCommand-" + self.key)
            if not handle:
                raise ctypes.WinError(ctypes.get_last_error())
            if kernel.WaitForSingleObject(handle, 0) not in (0, 0x80):
                kernel.CloseHandle(handle)
                return False
            self.handle = handle
        else:
            import fcntl
            handle = self.path.open("a+b")
            try:
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                handle.close()
                return False
            self.handle = handle
        _LOCAL_LOCKS.add(self.key)
        return True

    def close(self):
        if self.handle is None:
            return
        if os.name == "nt":
            kernel = ctypes.WinDLL("kernel32", use_last_error=True)
            kernel.ReleaseMutex.argtypes = [ctypes.c_void_p]
            kernel.CloseHandle.argtypes = [ctypes.c_void_p]
            kernel.ReleaseMutex(self.handle)
            kernel.CloseHandle(self.handle)
        else:
            self.handle.close()
        self.handle = None
        _LOCAL_LOCKS.discard(self.key)


class WindowsJob:
    """Kill-on-close, no breakaway; user code cannot run before assignment."""
    def __init__(self):
        from ctypes import wintypes as w

        class Basic(ctypes.Structure):
            _fields_ = [("ProcessTime", ctypes.c_int64), ("JobTime", ctypes.c_int64),
                        ("LimitFlags", w.DWORD), ("MinWorkingSet", ctypes.c_size_t),
                        ("MaxWorkingSet", ctypes.c_size_t), ("ActiveProcessLimit", w.DWORD),
                        ("Affinity", ctypes.c_size_t), ("PriorityClass", w.DWORD),
                        ("SchedulingClass", w.DWORD)]

        class IO(ctypes.Structure):
            _fields_ = [(name, ctypes.c_uint64) for name in
                        ("ReadOps", "WriteOps", "OtherOps", "ReadBytes", "WriteBytes", "OtherBytes")]

        class Extended(ctypes.Structure):
            _fields_ = [("Basic", Basic), ("IO", IO), ("ProcessMemory", ctypes.c_size_t),
                        ("JobMemory", ctypes.c_size_t), ("PeakProcess", ctypes.c_size_t),
                        ("PeakJob", ctypes.c_size_t)]

        self.kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        for name, args, result in (
            ("CreateJobObjectW", [ctypes.c_void_p, w.LPCWSTR], w.HANDLE),
            ("SetInformationJobObject", [w.HANDLE, ctypes.c_int, ctypes.c_void_p, w.DWORD], w.BOOL),
            ("OpenProcess", [w.DWORD, w.BOOL, w.DWORD], w.HANDLE),
            ("AssignProcessToJobObject", [w.HANDLE, w.HANDLE], w.BOOL),
            ("TerminateJobObject", [w.HANDLE, w.UINT], w.BOOL),
            ("QueryInformationJobObject", [w.HANDLE, ctypes.c_int, ctypes.c_void_p, w.DWORD, ctypes.c_void_p], w.BOOL),
            ("CloseHandle", [w.HANDLE], w.BOOL),
        ):
            function = getattr(self.kernel, name)
            function.argtypes, function.restype = args, result
        self.handle = self.kernel.CreateJobObjectW(None, None)
        if not self.handle:
            raise ctypes.WinError(ctypes.get_last_error())
        limits = Extended()
        limits.Basic.LimitFlags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        if not self.kernel.SetInformationJobObject(self.handle, 9, ctypes.byref(limits), ctypes.sizeof(limits)):
            self.close()
            raise ctypes.WinError(ctypes.get_last_error())

    def assign(self, pid):
        handle = self.kernel.OpenProcess(0x0100 | 0x0001, False, pid)
        if not handle:
            raise ctypes.WinError(ctypes.get_last_error())
        try:
            if not self.kernel.AssignProcessToJobObject(self.handle, handle):
                raise ctypes.WinError(ctypes.get_last_error())
        finally:
            self.kernel.CloseHandle(handle)

    def terminate(self):
        if not self.kernel.TerminateJobObject(self.handle, 1):
            raise ctypes.WinError(ctypes.get_last_error())

    def empty(self):
        # JOBOBJECT_BASIC_ACCOUNTING_INFORMATION: four LARGE_INTEGERs, four DWORDs.
        data = (ctypes.c_uint64 * 6)()
        if not self.kernel.QueryInformationJobObject(self.handle, 1, data, ctypes.sizeof(data), None):
            raise ctypes.WinError(ctypes.get_last_error())
        return ctypes.cast(ctypes.byref(data, 40), ctypes.POINTER(ctypes.c_uint32))[0] == 0

    def close(self):
        if self.handle:
            self.kernel.CloseHandle(self.handle)
            self.handle = None


# This trusted bootstrap blocks on stdin BEFORE running any administrator code.
# Binding it to the Job Object first closes the Windows spawn/assignment race.
BOOTSTRAP = r'''
import json, os, sys, subprocess
line = sys.stdin.buffer.readline()
if not line:
    sys.exit(125)
payload = json.loads(line)
sys.path.insert(0, payload['worker_root'])
if payload['interpreter'] == 'python':
    sys.argv = ['<remote-command>']
    exec(compile(payload['script'], '<remote-command>', 'exec'), {'__name__': '__main__'})
else:
    command = "$ProgressPreference = 'SilentlyContinue'; [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false); [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $OutputEncoding = [Console]::OutputEncoding; $ErrorActionPreference = 'Stop'; $body = [Console]::In.ReadToEnd(); & ([ScriptBlock]::Create($body)); if (-not $?) { exit 1 }"
    # Windows PowerShell 5.1 serializes redirected errors as CLIXML with
    # -EncodedCommand even with -OutputFormat Text. Only this fixed ASCII
    # wrapper goes in argv; the administrator body remains UTF-8 stdin.
    result = subprocess.run(['powershell.exe', '-NoLogo', '-NoProfile', '-NonInteractive', '-OutputFormat', 'Text', '-InputFormat', 'Text', '-Command', command], input=payload['script'].encode('utf-8'))
    sys.exit(result.returncode)
'''


async def execute_command(command, *, cancel, comfy_root, worker_root, app_root):
    buffers = {"stdout": bytearray(), "stderr": bytearray()}
    truncated = {"stdout": False, "stderr": False}
    proc = job = None
    assigned = False
    readers = []
    status, error, stopped, exit_code = "failed", "", True, None

    async def drain(stream, name):
        while True:
            chunk = await stream.read(16384)
            if not chunk:
                return
            room = OUTPUT_LIMIT - len(buffers[name])
            buffers[name].extend(chunk[:room])
            if len(chunk) > room:
                truncated[name] = True

    deadline = time.monotonic() + command["timeout_seconds"]
    try:
        if cancel.is_set():
            status = "canceled"
        else:
            env = os.environ.copy()
            env.update(CHOUKA_COMFY_ROOT=str(comfy_root), CHOUKA_WORKER_ROOT=str(worker_root),
                       CHOUKA_APP_ROOT=str(app_root), PYTHONIOENCODING="utf-8", PYTHONUTF8="1")
            if os.name == "nt":
                job = WindowsJob()
            proc = await asyncio.create_subprocess_exec(
                sys.executable, "-B", "-X", "utf8", "-c", BOOTSTRAP,
                cwd=command.get("cwd") or str(Path(comfy_root).parent), env=env,
                stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE, limit=32768,
                **({"creationflags": 0x08000000} if os.name == "nt" else {"start_new_session": True}),
            )
            stopped = False
            readers = [asyncio.create_task(drain(proc.stdout, "stdout")),
                       asyncio.create_task(drain(proc.stderr, "stderr"))]
            if job:
                job.assign(proc.pid)
                assigned = True
            payload = {"interpreter": command["interpreter"], "script": command["script"],
                       "worker_root": str(worker_root)}
            proc.stdin.write((json.dumps(payload, ensure_ascii=True) + "\n").encode("ascii"))
            await asyncio.wait_for(proc.stdin.drain(), max(0, deadline - time.monotonic()))
            proc.stdin.close()
            while proc.returncode is None:
                if cancel.is_set():
                    status = "canceled"
                    break
                if time.monotonic() >= deadline:
                    status = "timed_out"
                    break
                try:
                    await asyncio.wait_for(cancel.wait(), timeout=0.04)
                except asyncio.TimeoutError:
                    pass
            else:
                exit_code = proc.returncode
                status = "succeeded" if exit_code == 0 else "failed"
    except asyncio.CancelledError:
        status, error = "canceled", "Worker execution task stopped"
    except asyncio.TimeoutError:
        status, error = "timed_out", "Command startup exceeded execution deadline"
    except Exception as exc:
        error = f"{type(exc).__name__}: {exc}"
    finally:
        if proc:
            try:
                if proc.stdin:
                    proc.stdin.close()
                if job:
                    job.terminate()
                    if not assigned and proc.returncode is None:
                        # Still-handshaking bootstrap is outside the rejected job.
                        proc.kill()
                elif os.name != "nt":
                    try:
                        os.killpg(proc.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                elif proc.returncode is None:
                    # Assignment failed: bootstrap never received a payload.
                    proc.kill()
                await asyncio.wait_for(proc.wait(), 5)
                if job:
                    deadline = time.monotonic() + 5
                    while not job.empty() and time.monotonic() < deadline:
                        await asyncio.sleep(0.02)
                    stopped = job.empty()
                else:
                    stopped = True
                if exit_code is None:
                    exit_code = proc.returncode
            except Exception as exc:
                stopped = False
                error += f"; process tree cleanup unconfirmed: {exc}"
            try:
                await asyncio.wait_for(asyncio.gather(*readers), 5)
            except (Exception, asyncio.CancelledError):
                stopped = False
                for reader in readers:
                    reader.cancel()
                await asyncio.gather(*readers, return_exceptions=True)
                error += "; output pipe cleanup unconfirmed"
        if job:
            job.close()
    if not stopped:
        status = "unknown"
    output = {}
    for name, data in buffers.items():
        text = data.decode("utf-8", "replace")
        output[name] = utf8_limit(text, OUTPUT_LIMIT)
        truncated[name] = truncated[name] or len(text.encode("utf-8")) > OUTPUT_LIMIT
    return {"status": status, "exit_code": exit_code, **output,
            "stdout_truncated": truncated["stdout"], "stderr_truncated": truncated["stderr"],
            "error": utf8_limit(error, ERROR_LIMIT), "process_stopped": stopped}


class RemoteCommands:
    def __init__(self, host_id, *, comfy_root, worker_root, app_root, journal_dir=None):
        digest = hashlib.sha256(str(host_id).encode("utf-8")).hexdigest()
        base = Path(journal_dir) if journal_dir is not None else (
            Path(os.environ.get("PROGRAMDATA", r"C:\ProgramData")) / "Chouka" / "remote-commands"
            if os.name == "nt" else Path.home() / ".local" / "state" / "chouka" / "remote-commands")
        base.mkdir(parents=True, exist_ok=True)
        self.path = base / (digest + ".sqlite3")
        self.lock = HostLock(base / (digest + ".lock"), host_id)
        self.comfy_root, self.worker_root, self.app_root = map(Path, (comfy_root, worker_root, app_root))
        self.active_id = None
        self.cancel_event = None
        self.fault = None
        self.next_attempt = 0.0
        with self._db() as db:
            db.execute("CREATE TABLE IF NOT EXISTS commands (id TEXT PRIMARY KEY, claim_key TEXT NOT NULL, "
                       "phase TEXT NOT NULL, command TEXT, result TEXT, ack INTEGER NOT NULL DEFAULT 0, "
                       "cancel INTEGER NOT NULL DEFAULT 0)")

    def _db(self):
        # Short synchronous transactions only; never hold a DB transaction over await.
        from contextlib import contextmanager

        @contextmanager
        def connection():
            db = sqlite3.connect(self.path, timeout=0.1)
            db.row_factory = sqlite3.Row
            db.execute("PRAGMA synchronous=FULL")
            try:
                with db:
                    yield db
            finally:
                db.close()
        return connection()

    @property
    def busy(self):
        if self.active_id or self.fault:
            return True
        try:
            with self._db() as db:
                return db.execute("SELECT 1 FROM commands WHERE phase IN ('claiming','consumed','running') "
                                  "OR (result IS NOT NULL AND json_extract(result,'$.process_stopped') = 0) LIMIT 1").fetchone() is not None
        except Exception as exc:
            self.fault = str(exc)
            return True

    def receive(self, command):
        execution_id = command.get("execution_id")
        if not isinstance(execution_id, str) or not execution_id or len(execution_id) > 200:
            raise ValueError("invalid remote execution_id")
        # Look up first: an acknowledged duplicate never replenishes the queue.
        with self._db() as db:
            if db.execute("SELECT 1 FROM commands WHERE id=?", (execution_id,)).fetchone():
                return False
            if db.execute("SELECT count(*) FROM commands WHERE ack=0").fetchone()[0] >= MAX_PENDING:
                return False  # controller can redeliver later; no silent dedup tombstone
            interpreter, script = command.get("interpreter"), command.get("script")
            if interpreter not in capabilities()["interpreters"] or not isinstance(script, str):
                raise ValueError("unsupported interpreter or invalid script")
            if len(script.encode("utf-8")) > MAX_SCRIPT:
                raise ValueError("remote script exceeds 1 MiB")
            timeout = float(command.get("timeout_seconds", 300))
            if not math.isfinite(timeout) or timeout <= 0:
                raise ValueError("timeout_seconds must be positive and finite")
            cwd = command.get("cwd")
            if cwd is not None and (not isinstance(cwd, str) or len(cwd) > 32768):
                raise ValueError("invalid cwd")
            data = {key: command.get(key) for key in ("execution_id", "batch_id", "interpreter", "script", "cwd")}
            data["timeout_seconds"] = timeout
            db.execute("INSERT INTO commands(id,claim_key,phase,command) VALUES(?,?,'received',?)",
                       (execution_id, uuid.uuid4().hex, json.dumps(data)))
        return True

    def cancel(self, execution_id):
        # Called by heartbeat: only flip an event and persist, never wait for processes.
        if self.active_id == execution_id and self.cancel_event:
            self.cancel_event.set()
        with self._db() as db:
            db.execute("UPDATE commands SET cancel=1 WHERE id=? AND ack=0", (execution_id,))

    def _finish(self, execution_id, result):
        with self._db() as db:
            db.execute("UPDATE commands SET phase=?,result=?,command=NULL WHERE id=?",
                       (result["status"], json.dumps(result, ensure_ascii=True), execution_id))

    def _recover(self):
        # Only under the host OS lock, so no live owner's execution is misclassified.
        with self._db() as db:
            rows = db.execute("SELECT id FROM commands WHERE phase IN ('claiming','consumed','running')").fetchall()
        for row in rows:
            self._finish(row["id"], {
                "status": "unknown", "exit_code": None, "stdout": "", "stderr": "",
                "stdout_truncated": False, "stderr_truncated": False,
                "error": "Interrupted command attempt; manual host inspection required; not replayed",
                "process_stopped": False,
            })

    async def _report(self, request):
        with self._db() as db:
            rows = db.execute("SELECT id,claim_key,result FROM commands WHERE result IS NOT NULL AND ack=0 "
                              "ORDER BY rowid LIMIT 8").fetchall()
        for row in rows:
            result = json.loads(row["result"])
            try:
                reply = await request("POST", "/agent/v1/commands/" + quote(row["id"], safe="") + "/result",
                                      json={"claim_key": row["claim_key"], **result})
                if (reply and reply.get("accepted") is True and reply.get("execution_id") == row["id"]
                        and reply.get("status") in STOPPED_TERMINAL):
                    with self._db() as db:
                        # The authenticated controller's immutable stopped terminal ACK
                        # is authoritative even across Worker identities/local statuses.
                        # Unknown/running/pending ACKs never clear host occupancy.
                        db.execute("UPDATE commands SET ack=1,phase=?,result=? WHERE id=?",
                                   (reply["status"], json.dumps({"process_stopped": True}), row["id"]))
            except asyncio.CancelledError:
                raise
            except Exception:
                continue  # bounded retries next pump, never rerun the body

    async def pump(self, request, can_start):
        """Called only by the serial main loop; heartbeat is independent."""
        if self.active_id or time.monotonic() < self.next_attempt:
            return False
        if not self.lock.acquire():
            return False
        try:
            self._recover()
            await self._report(request)
            if self.busy or not can_start():
                return False
            with self._db() as db:
                row = db.execute("SELECT * FROM commands WHERE phase='received' ORDER BY rowid LIMIT 1").fetchone()
            if row is None:
                return False
            self.active_id, self.cancel_event = row["id"], asyncio.Event()
            if row["cancel"]:
                self.cancel_event.set()
            with self._db() as db:
                db.execute("UPDATE commands SET phase='claiming' WHERE id=?", (row["id"],))
            try:
                reply = await request("POST", "/agent/v1/commands/" + quote(row["id"], safe="") + "/claim",
                                      json={"claim_key": row["claim_key"]})
            except Exception:
                # Live retry is safe with the SAME key; a restart in claiming is not.
                with self._db() as db:
                    db.execute("UPDATE commands SET phase='received' WHERE id=?", (row["id"],))
                return False
            if not (reply and reply.get("execution_id") == row["id"]
                    and reply.get("status") == "running" and reply.get("authorized") is True
                    and reply.get("claim_key") == row["claim_key"]):
                with self._db() as db:
                    if (reply and reply.get("execution_id") == row["id"] and reply.get("authorized") is False
                            and reply.get("status") in STOPPED_TERMINAL):
                        # Expired/canceled before claim: no local process ever existed.
                        db.execute("UPDATE commands SET phase=?,ack=1,command=NULL,result=? WHERE id=?",
                                   (reply["status"], json.dumps({"process_stopped": True}), row["id"]))
                    else:
                        db.execute("UPDATE commands SET phase='received' WHERE id=?", (row["id"],))
                return False
            # Persist consumed BEFORE any spawn. Even a crash between here and spawn
            # produces unknown, never an automatic second attempt.
            with self._db() as db:
                db.execute("UPDATE commands SET phase='consumed',cancel=CASE WHEN ? THEN 1 ELSE cancel END WHERE id=?",
                           (reply.get("cancel_requested") is True, row["id"]))
                canceled = db.execute("SELECT cancel FROM commands WHERE id=?", (row["id"],)).fetchone()[0]
            if canceled:
                self.cancel_event.set()
            if not can_start():
                self._finish(row["id"], {"status": "canceled", "exit_code": None, "stdout": "", "stderr": "",
                                        "stdout_truncated": False, "stderr_truncated": False,
                                        "error": "Host no longer idle after claim; body not started", "process_stopped": True})
            else:
                with self._db() as db:
                    db.execute("UPDATE commands SET phase='running' WHERE id=?", (row["id"],))
                async def watch_cancel():
                    # A sibling Worker on the same host may receive the cancel.
                    while not self.cancel_event.is_set():
                        try:
                            with self._db() as db:
                                canceled = db.execute("SELECT cancel FROM commands WHERE id=?", (row["id"],)).fetchone()[0]
                            if canceled:
                                self.cancel_event.set()
                                return
                        except Exception as exc:
                            self.fault = str(exc)
                            self.cancel_event.set()
                            return
                        await asyncio.sleep(0.2)
                watcher = asyncio.create_task(watch_cancel())
                try:
                    result = await execute_command(json.loads(row["command"]), cancel=self.cancel_event,
                                                   comfy_root=self.comfy_root, worker_root=self.worker_root,
                                                   app_root=self.app_root)
                    self._finish(row["id"], result)
                finally:
                    watcher.cancel()
                    await asyncio.gather(watcher, return_exceptions=True)
            if asyncio.current_task().cancelling():
                raise asyncio.CancelledError
            await self._report(request)
            return True
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            self.fault = f"Remote command journal failure: {exc}"
            raise
        finally:
            self.active_id, self.cancel_event = None, None
            self.next_attempt = time.monotonic() + 2
            self.lock.close()
