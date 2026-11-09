import asyncio
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "worker"))
from agent import WorkerAgent
from model_inventory import scan_inventory
from remote_commands import MAX_PENDING, OUTPUT_LIMIT, RemoteCommands, execute_command


class StartupTests(unittest.TestCase):
    def test_isolated_python_can_start_worker_script(self):
        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run(
                [sys.executable, "-I", "-B", str(ROOT / "worker" / "agent.py"), "--help"],
                cwd=directory, capture_output=True, text=True, encoding="utf-8", timeout=30,
            )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("--instance-status", result.stdout)


class Fixture:
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.comfy = self.root / "ComfyUI"
        (self.comfy / "input").mkdir(parents=True)
        self.reports = []
        self.claims = []
        self.accept_results = True
        self.authorized = True

    def remote(self, host="test-host"):
        return RemoteCommands(host, comfy_root=self.comfy, worker_root=ROOT / "worker",
                              app_root=ROOT, journal_dir=self.root / "journal")

    def command(self, script="print('中文成功')", **changes):
        return {"type": "remote_command", "execution_id": "exec-1", "batch_id": "batch-1",
                "interpreter": "python", "script": script, "cwd": None,
                "timeout_seconds": 5, **changes}

    async def request(self, method, path, *, json):
        execution_id = path.split("/")[-2]
        if path.endswith("/claim"):
            self.claims.append(dict(json))
            return {"execution_id": execution_id, "status": "running",
                    "authorized": self.authorized, "claim_key": json["claim_key"]}
        self.reports.append(dict(json))
        return {"execution_id": execution_id, "status": json["status"], "accepted": self.accept_results}

    async def execute(self, script, *, cancel=None, **changes):
        return await execute_command(self.command(script, **changes), cancel=cancel or asyncio.Event(),
                                     comfy_root=self.comfy, worker_root=ROOT / "worker", app_root=ROOT)

    def worker(self, **changes):
        path = self.root / "worker.json"
        path.write_text(json.dumps({"server_url": "http://controller.invalid", "capacity_host_id": "test-host",
                                    "comfy_input_dir": str(self.comfy / "input"), **changes}), encoding="utf-8")
        with mock.patch("agent.RemoteCommands", side_effect=lambda *args, **kwargs: self.remote()):
            worker = WorkerAgent(path)
        worker.comfy_online = True
        return worker


class ExecutionTests(Fixture, unittest.IsolatedAsyncioTestCase):
    async def test_unicode_nonzero_cwd_and_preset_import(self):
        result = await self.execute("import sys,os; from model_inventory import scan_inventory; "
                                    "print('中文',os.getcwd(),os.environ['CHOUKA_COMFY_ROOT']); "
                                    "print('错误',file=sys.stderr); sys.exit(7)")
        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["exit_code"], 7)
        self.assertIn("中文", result["stdout"])
        self.assertIn(str(self.root), result["stdout"])
        self.assertIn(str(self.comfy), result["stdout"])
        self.assertIn("错误", result["stderr"])
        self.assertTrue(result["process_stopped"])

    async def test_simultaneous_pipe_flood_is_bounded(self):
        result = await self.execute("import os; [(os.write(1,b'x'*16384),os.write(2,'洪'.encode()*6000)) for _ in range(100)]")
        self.assertEqual(result["status"], "succeeded")
        for stream in ("stdout", "stderr"):
            self.assertLessEqual(len(result[stream].encode("utf-8")), OUTPUT_LIMIT)
            self.assertTrue(result[stream + "_truncated"])

    async def test_timeout(self):
        result = await self.execute("import time; time.sleep(60)", timeout_seconds=0.15)
        self.assertEqual(result["status"], "timed_out")
        self.assertTrue(result["process_stopped"])

    async def test_cancel(self):
        cancel = asyncio.Event()
        task = asyncio.create_task(self.execute("import time; time.sleep(60)", cancel=cancel))
        await asyncio.sleep(0.15)
        cancel.set()
        result = await asyncio.wait_for(task, 10)
        self.assertEqual(result["status"], "canceled")
        self.assertTrue(result["process_stopped"])

    async def test_precancel_does_not_run_body(self):
        cancel = asyncio.Event()
        cancel.set()
        result = await self.execute("raise RuntimeError('should not run')", cancel=cancel)
        self.assertEqual(result["status"], "canceled")
        self.assertIsNone(result["exit_code"])

    async def tree_case(self, mode):
        marker = self.root / (mode + ".txt")
        child = "import time,pathlib; time.sleep(1.5); pathlib.Path(" + repr(str(marker)) + ").write_text('escaped')"
        script = ("import subprocess,sys,time; subprocess.Popen([sys.executable,'-c'," + repr(child) + "]); "
                  + ("time.sleep(60)" if mode != "normal" else "print('parent done')"))
        cancel = asyncio.Event()
        task = asyncio.create_task(self.execute(script, cancel=cancel, timeout_seconds=0.3 if mode == "timeout" else 5))
        if mode == "cancel":
            await asyncio.sleep(0.3)
            cancel.set()
        result = await asyncio.wait_for(task, 12)
        self.assertTrue(result["process_stopped"], result)
        self.assertEqual(result["status"], {"normal": "succeeded", "timeout": "timed_out", "cancel": "canceled"}[mode])
        await asyncio.sleep(1.6)
        self.assertFalse(marker.exists(), "descendant survived tree cleanup")

    async def test_background_children_reaped_on_normal_exit(self):
        await self.tree_case("normal")

    async def test_background_children_reaped_on_timeout(self):
        await self.tree_case("timeout")

    async def test_background_children_reaped_on_cancel(self):
        await self.tree_case("cancel")

    @unittest.skipUnless(os.name == "nt", "Windows Job Object handshake")
    async def test_assignment_failure_never_releases_body(self):
        marker = self.root / "unassigned.txt"
        with mock.patch("remote_commands.WindowsJob.assign", side_effect=OSError("assignment denied")):
            result = await self.execute("from pathlib import Path; Path(" + repr(str(marker)) + ").touch()")
        self.assertEqual(result["status"], "failed")
        self.assertTrue(result["process_stopped"], result)
        self.assertFalse(marker.exists())

    @unittest.skipUnless(os.name == "nt", "Windows Job Object owner death")
    async def test_worker_process_crash_kills_job_tree(self):
        started, escaped = self.root / "started.txt", self.root / "escaped.txt"
        body = ("from pathlib import Path; import time; Path(" + repr(str(started)) + ").touch(); "
                "time.sleep(1.5); Path(" + repr(str(escaped)) + ").touch()")
        script = ("import sys,asyncio,os; from pathlib import Path; sys.path.insert(0," + repr(str(ROOT / "worker")) + "); "
                  "from remote_commands import execute_command\n"
                  "async def die():\n"
                  " while not Path(" + repr(str(started)) + ").exists(): await asyncio.sleep(0.02)\n"
                  " os._exit(0)\n"
                  "async def main():\n"
                  " asyncio.create_task(die())\n"
                  " await execute_command(" + repr(self.command(body)) + ",cancel=asyncio.Event(),comfy_root=Path("
                  + repr(str(self.comfy)) + "),worker_root=Path(" + repr(str(ROOT / "worker")) + "),app_root=Path("
                  + repr(str(ROOT)) + "))\nasyncio.run(main())")
        result = await asyncio.to_thread(subprocess.run, [sys.executable, "-B", "-X", "utf8", "-c", script],
                                         capture_output=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(started.exists())
        await asyncio.sleep(1.6)
        self.assertFalse(escaped.exists())

    async def test_invalid_utf8_output_and_error_are_byte_bounded(self):
        result = await self.execute("import os; os.write(1,b'\\xff'*60000)")
        self.assertEqual(result["status"], "succeeded")
        self.assertLessEqual(len(result["stdout"].encode("utf-8")), OUTPUT_LIMIT)
        self.assertTrue(result["stdout_truncated"])
        with mock.patch("remote_commands.asyncio.create_subprocess_exec", side_effect=OSError("错" * 4000)):
            result = await self.execute("pass")
        self.assertLessEqual(len(result["error"].encode("utf-8")), 2000)

    @unittest.skipUnless(os.name == "nt", "Windows PowerShell")
    async def test_powershell_large_multiline_stdin_body(self):
        result = await self.execute("# " + "长脚本" * 12000 + "\n$x = @{\n value = '中文'\n}\n[Console]::WriteLine($x.value)",
                                    interpreter="powershell")
        self.assertEqual(result["status"], "succeeded", result)
        self.assertIn("中文", result["stdout"])

    @unittest.skipUnless(os.name == "nt", "Windows PowerShell")
    async def test_powershell_utf8_and_nonzero(self):
        result = await self.execute("[Console]::WriteLine('你好'); [Console]::Error.WriteLine('失败'); exit 23",
                                    interpreter="powershell")
        self.assertEqual(result["exit_code"], 23)
        self.assertIn("你好", result["stdout"])
        self.assertIn("失败", result["stderr"])
        self.assertNotIn("CLIXML", result["stderr"])
        self.assertNotIn("\ufffd", result["stderr"])

    @unittest.skipUnless(os.name == "nt", "Windows PowerShell")
    async def test_powershell_write_error_and_throw_are_readable_utf8_text(self):
        for script, message in (("Write-Error '中文写入错误'", "中文写入错误"),
                                ("throw '中文抛出异常'", "中文抛出异常")):
            with self.subTest(script=script):
                result = await self.execute(script, interpreter="powershell")
                self.assertEqual(result["status"], "failed", result)
                self.assertEqual(result["exit_code"], 1, result)
                self.assertIn(message, result["stderr"])
                self.assertNotIn("CLIXML", result["stderr"])
                self.assertNotIn("<Objs", result["stderr"])
                self.assertNotIn("\ufffd", result["stderr"])
                self.assertTrue(result["process_stopped"])

    @unittest.skipUnless(os.name == "nt", "Windows PowerShell")
    async def test_powershell_nonterminating_error_preserves_explicit_exitcode(self):
        result = await self.execute("Write-Progress -Activity '模块初始化' -Status '正在准备'; "
                                    "Write-Error '中文错误仍然可读' -ErrorAction Continue; exit 7",
                                    interpreter="powershell")
        self.assertEqual(result["status"], "failed", result)
        self.assertEqual(result["exit_code"], 7, result)
        self.assertIn("中文错误仍然可读", result["stderr"])
        self.assertNotIn("CLIXML", result["stderr"])
        self.assertNotIn("\ufffd", result["stderr"])
        progress = await self.execute("Write-Progress -Activity '模块初始化' -Status '正在准备'; exit 7",
                                      interpreter="powershell")
        self.assertEqual(progress["exit_code"], 7)
        self.assertEqual(progress["stderr"], "")


class JournalTests(Fixture, unittest.IsolatedAsyncioTestCase):
    async def test_claim_result_ack_and_dedup_across_workers(self):
        remote = self.remote()
        remote.receive(self.command())
        self.assertFalse(remote.busy, "received is not local_busy")
        self.assertTrue(await remote.pump(self.request, lambda: True))
        self.assertEqual(self.reports[-1]["status"], "succeeded")
        self.assertEqual(self.claims[0]["claim_key"], self.reports[0]["claim_key"])
        replacement = self.remote()
        self.assertFalse(replacement.receive(self.command("raise RuntimeError('duplicate')")))
        await replacement.pump(self.request, lambda: True)
        self.assertEqual(len(self.claims), 1)
        self.assertEqual(len(self.reports), 1)

    async def test_unauthorized_and_409_retry_same_key_no_spawn(self):
        remote = self.remote()
        remote.receive(self.command())
        self.authorized = False
        with mock.patch("remote_commands.execute_command", new_callable=mock.AsyncMock) as execute:
            await remote.pump(self.request, lambda: True)
            remote.next_attempt = 0
            async def conflict(*args, **kwargs):
                raise RuntimeError("HTTP 409")
            await remote.pump(conflict, lambda: True)
            execute.assert_not_awaited()
        remote.next_attempt = 0
        self.authorized = True
        await remote.pump(self.request, lambda: True)
        self.assertEqual(self.claims[0]["claim_key"], self.claims[-1]["claim_key"])

    async def test_expired_unclaimed_execution_does_not_block_queue(self):
        remote = self.remote()
        remote.receive(self.command())
        async def expired(method, path, *, json):
            return {"execution_id": "exec-1", "authorized": False, "status": "expired"}
        with mock.patch("remote_commands.execute_command", new_callable=mock.AsyncMock) as execute:
            await remote.pump(expired, lambda: True)
            execute.assert_not_awaited()
        self.assertFalse(remote.busy)
        self.assertFalse(remote.receive(self.command()))
        with remote._db() as db:
            self.assertEqual(db.execute("SELECT phase FROM commands").fetchone()[0], "expired")

    async def test_uncertain_claim_restart_never_replays(self):
        for phase in ("claiming", "consumed", "running"):
            remote = self.remote(phase)
            remote.receive(self.command())
            with remote._db() as db:
                db.execute("UPDATE commands SET phase=?", (phase,))
            replacement = self.remote(phase)
            with mock.patch("remote_commands.execute_command", new_callable=mock.AsyncMock) as execute:
                await replacement.pump(self.request, lambda: True)
                execute.assert_not_awaited()
            self.assertEqual(self.reports[-1]["status"], "unknown")
            self.assertFalse(self.reports[-1]["process_stopped"])
            self.assertTrue(replacement.busy, "ACK must not clear unknown host occupancy")

    async def test_received_survives_restart(self):
        remote = self.remote()
        remote.receive(self.command())
        replacement = self.remote()
        self.assertFalse(replacement.busy)
        await replacement.pump(self.request, lambda: True)
        self.assertEqual(self.reports[-1]["status"], "succeeded")

    async def test_consumed_is_durable_before_spawn(self):
        remote = self.remote()
        remote.receive(self.command())
        async def execute(*args, **kwargs):
            with remote._db() as db:
                self.assertEqual(db.execute("SELECT phase FROM commands").fetchone()[0], "running")
            return {"status": "succeeded", "exit_code": 0, "stdout": "", "stderr": "",
                    "stdout_truncated": False, "stderr_truncated": False, "error": "", "process_stopped": True}
        with mock.patch("remote_commands.execute_command", side_effect=execute):
            await remote.pump(self.request, lambda: True)

    async def test_worker_task_cancel_cleans_and_persists_before_propagating(self):
        remote = self.remote()
        remote.receive(self.command("import time; time.sleep(60)"))
        task = asyncio.create_task(remote.pump(self.request, lambda: True))
        await asyncio.sleep(0.25)
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task
        replacement = self.remote()
        await replacement.pump(self.request, lambda: True)
        self.assertEqual(self.reports[-1]["status"], "canceled")
        self.assertTrue(self.reports[-1]["process_stopped"])
        self.assertEqual(len(self.claims), 1)

    async def test_result_retries_without_rerunning(self):
        remote = self.remote()
        remote.receive(self.command())
        self.accept_results = False
        await remote.pump(self.request, lambda: True)
        replacement = self.remote()
        self.accept_results = True
        await replacement.pump(self.request, lambda: True)
        self.assertEqual(len(self.reports), 2)
        self.assertEqual(self.reports[0], self.reports[1])
        self.assertEqual(len(self.claims), 1)

    async def test_queue_flood_bounded(self):
        remote = self.remote()
        for i in range(MAX_PENDING + 30):
            remote.receive(self.command(execution_id=str(i)))
        with remote._db() as db:
            self.assertEqual(db.execute("SELECT count(*) FROM commands").fetchone()[0], MAX_PENDING)
        self.assertFalse(remote.busy)

    async def test_shared_host_os_lock_and_cancel(self):
        remote, other = self.remote(), self.remote()
        remote.receive(self.command("import time; time.sleep(60)"))
        task = asyncio.create_task(remote.pump(self.request, lambda: True))
        for _ in range(100):
            if remote.active_id:
                break
            await asyncio.sleep(0.01)
        self.assertTrue(other.busy)
        self.assertFalse(await other.pump(self.request, lambda: True))
        other.cancel("exec-1")
        await asyncio.wait_for(task, 10)
        self.assertEqual(self.reports[-1]["status"], "canceled")

    async def test_unknown_ack_fences_until_operator_resolved(self):
        remote = self.remote()
        remote.receive(self.command())
        with remote._db() as db:
            db.execute("UPDATE commands SET phase='running'")
        await remote.pump(self.request, lambda: True)
        self.assertTrue(remote.busy)
        replacement = self.remote()
        await replacement.pump(self.request, lambda: True)
        self.assertEqual(len(self.reports), 2)
        self.assertTrue(replacement.busy)
        async def resolved(method, path, *, json):
            return {"accepted": True, "execution_id": "exec-1", "status": "failed"}
        replacement.next_attempt = 0
        await replacement.pump(resolved, lambda: True)
        self.assertFalse(replacement.busy)
        self.assertFalse(replacement.receive(self.command()))

    async def test_every_stopped_terminal_ack_is_authoritative_across_local_statuses(self):
        for local_status in ("succeeded", "failed", "canceled", "timed_out", "unknown"):
            for server_status in ("succeeded", "failed", "canceled", "timed_out", "expired"):
                with self.subTest(local=local_status, server=server_status):
                    remote = self.remote(local_status + "-" + server_status)
                    remote.receive(self.command())
                    remote._finish("exec-1", {"status": local_status, "exit_code": None,
                                             "stdout": "local output", "stderr": "",
                                             "stdout_truncated": False, "stderr_truncated": False,
                                             "error": "", "process_stopped": local_status != "unknown"})
                    async def request(method, path, *, json):
                        return {"accepted": True, "execution_id": "exec-1", "status": server_status}
                    await remote.pump(request, lambda: True)
                    self.assertFalse(remote.busy)
                    with remote._db() as db:
                        row = db.execute("SELECT phase,ack,result FROM commands").fetchone()
                    self.assertEqual(row["phase"], server_status)
                    self.assertEqual(row["ack"], 1)
                    self.assertEqual(json.loads(row["result"]), {"process_stopped": True})
                    self.assertFalse(remote.receive(self.command()))

    async def test_unconfirmed_or_wrong_execution_ack_never_clears_unknown(self):
        replies = [
            {"accepted": True, "execution_id": "exec-1", "status": status}
            for status in ("unknown", "running", "pending")
        ] + [{"accepted": False, "execution_id": "exec-1", "status": "failed"},
             {"accepted": True, "execution_id": "another-execution", "status": "failed"}]
        for index, reply in enumerate(replies):
            with self.subTest(reply=reply):
                remote = self.remote("unconfirmed-" + str(index))
                remote.receive(self.command())
                with remote._db() as db:
                    db.execute("UPDATE commands SET phase='running'")
                async def request(*args, **kwargs):
                    return reply
                await remote.pump(request, lambda: True)
                self.assertTrue(remote.busy)
                with remote._db() as db:
                    self.assertEqual(db.execute("SELECT ack FROM commands").fetchone()[0], 0)

    async def test_host_os_lock_blocks_other_process(self):
        remote = self.remote()
        self.assertTrue(remote.lock.acquire())
        try:
            script = ("import sys; sys.path.insert(0," + repr(str(ROOT / "worker")) + "); "
                      "from remote_commands import HostLock; from pathlib import Path; "
                      "lock=HostLock(Path(" + repr(str(remote.lock.path)) + "),'test-host'); "
                      "print(lock.acquire()); lock.close()")
            result = await asyncio.to_thread(subprocess.run, [sys.executable, "-B", "-X", "utf8", "-c", script],
                                             capture_output=True, timeout=10)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout.strip(), b"False")
        finally:
            remote.lock.close()

    async def test_cancel_during_claim(self):
        remote = self.remote()
        remote.receive(self.command())
        async def request(method, path, **kwargs):
            if path.endswith("/claim"):
                remote.cancel("exec-1")
            return await self.request(method, path, **kwargs)
        await remote.pump(request, lambda: True)
        self.assertEqual(self.reports[-1]["status"], "canceled")
        self.assertEqual(self.reports[-1]["stdout"], "")

    async def test_lost_claim_ack_then_server_cancel_never_spawns(self):
        remote = self.remote()
        marker = self.root / "must-not-run.txt"
        remote.receive(self.command(f"from pathlib import Path; Path({str(marker)!r}).write_text('ran')"))
        first_claim = True

        async def request(method, path, **kwargs):
            nonlocal first_claim
            reply = await self.request(method, path, **kwargs)
            if path.endswith("/claim"):
                if first_claim:
                    first_claim = False
                    raise OSError("claim committed but response lost")
                reply["cancel_requested"] = True
            return reply

        with mock.patch("remote_commands.asyncio.create_subprocess_exec", new_callable=mock.AsyncMock) as spawn:
            self.assertFalse(await remote.pump(request, lambda: True))
            remote.next_attempt = 0
            self.assertTrue(await remote.pump(request, lambda: True))
            spawn.assert_not_awaited()
        self.assertEqual(len(self.claims), 2)
        self.assertEqual(self.claims[0]["claim_key"], self.claims[1]["claim_key"])
        self.assertEqual(self.reports[-1]["status"], "canceled")
        self.assertTrue(self.reports[-1]["process_stopped"])
        self.assertFalse(marker.exists())
        self.assertFalse(remote.busy)
        with remote._db() as db:
            self.assertEqual(db.execute("SELECT cancel FROM commands").fetchone()[0], 1)


class IntegrationTests(Fixture, unittest.IsolatedAsyncioTestCase):
    async def test_request_uses_existing_authenticated_headers(self):
        worker = self.worker()
        worker.state.update(worker_id="worker-id", worker_token="test-token")
        worker._json_request = mock.AsyncMock(return_value={"ok": True})
        await worker.remote_command_request("POST", "/agent/v1/commands/e/claim", json={"claim_key": "key"})
        args, kwargs = worker._json_request.call_args
        self.assertEqual(args, ("POST", worker.server + "/agent/v1/commands/e/claim"))
        self.assertEqual(kwargs["headers"], worker._agent_headers())
        self.assertEqual(kwargs["json"], {"claim_key": "key"})

    async def test_cross_identity_shared_journal_recovers_after_operator_resolve(self):
        original = self.worker()
        original.state.update(worker_id="retired-worker", worker_token="retired-token")
        original.remote_commands.receive(self.command())
        with original.remote_commands._db() as db:
            db.execute("UPDATE commands SET phase='running'")
            claim_key = db.execute("SELECT claim_key FROM commands").fetchone()[0]
        # The original identity is permanently offline. Its successor has a new
        # registration/token, but the same stable host_id and on-disk journal.
        successor = self.worker()
        successor.state.update(worker_id="reregistered-worker", worker_token="new-token")
        self.assertEqual(original.state["host_id"], successor.state["host_id"])
        self.assertEqual(original.remote_commands.path, successor.remote_commands.path)
        host_by_worker = {"retired-worker": original.state["host_id"],
                          "reregistered-worker": successor.state["host_id"]}
        server_record = {"worker_id": "retired-worker", "host_id": original.state["host_id"],
                         "claim_key": claim_key, "status": "unknown", "process_stopped": False,
                         "stdout": "original immutable server evidence"}
        received = []
        async def endpoint(method, url, *, headers, json, **kwargs):
            self.assertEqual(headers, successor._agent_headers())
            if url.endswith("/jobs/acquire"):
                return {"job_id": "generation-after-resolution"}
            self.assertTrue(url.endswith("/commands/exec-1/result"), url)
            received.append(dict(json))
            # Model the existing result endpoint's narrow cross-identity ACK:
            # no foreign result updates, no new status/read endpoint.
            if (server_record["status"] not in {"succeeded", "failed", "canceled", "timed_out", "expired"}
                    or not server_record["process_stopped"]
                    or host_by_worker[headers["X-Worker-ID"]] != server_record["host_id"]
                    or json["claim_key"] != server_record["claim_key"]):
                raise RuntimeError("HTTP 404: foreign execution is not confirmed stopped")
            return {"execution_id": "exec-1", "accepted": True, "status": server_record["status"]}
        successor._json_request = mock.AsyncMock(side_effect=endpoint)
        with mock.patch("remote_commands.execute_command", new_callable=mock.AsyncMock) as execute:
            await successor.remote_commands.pump(successor.remote_command_request, successor.remote_command_can_start)
            self.assertTrue(successor.remote_commands_busy())
            self.assertIsNone(await successor.acquire())
            self.assertEqual(received[0]["status"], "unknown")
            self.assertFalse(received[0]["process_stopped"])
            # An administrator verifies this host has stopped and resolves the
            # authoritative server record. Retried unknown must not overwrite it.
            server_record.update(status="failed", process_stopped=True)
            resolved_snapshot = dict(server_record)
            successor.remote_commands.next_attempt = 0
            await successor.remote_commands.pump(successor.remote_command_request, successor.remote_command_can_start)
            self.assertFalse(successor.remote_commands_busy())
            self.assertEqual(server_record, resolved_snapshot)
            self.assertEqual(received[0], received[1])
            self.assertEqual((await successor.acquire())["job_id"], "generation-after-resolution")
            execute.assert_not_awaited()
        with successor.remote_commands._db() as db:
            row = db.execute("SELECT phase,ack,result FROM commands").fetchone()
        self.assertEqual(row["phase"], "failed")
        self.assertEqual(row["ack"], 1)
        self.assertEqual(json.loads(row["result"]), {"process_stopped": True})
        restarted = self.remote()
        self.assertFalse(restarted.busy)
        self.assertFalse(restarted.receive(self.command()))

    async def test_queued_command_heartbeat_does_not_report_busy(self):
        worker = self.worker()
        worker.remote_commands.receive(self.command())
        worker.local_status = mock.AsyncMock()
        worker.confirm_release_recovery = mock.AsyncMock()
        worker.refresh_host_reboot_report = mock.AsyncMock()
        worker.last_capability_scan = worker.last_telemetry_scan = time.time()
        bodies = []
        async def request(method, url, **kwargs):
            bodies.append(kwargs["json"])
            worker.stop_event.set()
            return {}
        worker._json_request = mock.AsyncMock(side_effect=request)
        await asyncio.wait_for(worker.heartbeat_loop(), 2)
        self.assertFalse(bodies[0]["busy"])
        self.assertFalse(bodies[0]["local_busy"])
        self.assertTrue(bodies[0]["capacity_released"])

    async def test_primary_node_executes_preset(self):
        worker = self.worker(is_primary_node=True)
        self.assertEqual(worker.capabilities["agent_version"], 11)
        self.assertEqual(worker.capabilities["remote_commands"]["version"], 1)
        worker.remote_commands.receive(self.command("import os,json; from model_inventory import scan_inventory; "
            "print(json.dumps(scan_inventory(os.environ['CHOUKA_COMFY_ROOT']),ensure_ascii=False))"))
        worker.queue_sync({"type": "restart_services", "request_id": "ignored-on-primary"})
        self.assertIsNone(worker.pending_sync)
        await worker.remote_commands.pump(self.request, worker.remote_command_can_start)
        self.assertEqual(self.reports[-1]["status"], "succeeded")
        self.assertEqual(json.loads(self.reports[-1]["stdout"])["comfy_root"], str(self.comfy))

    async def test_main_run_loop_executes_primary_command_before_generation(self):
        worker = self.worker(is_primary_node=True)
        worker.remote_commands.receive(self.command())
        worker.ensure_registered = mock.AsyncMock()
        worker.scan_capabilities = mock.AsyncMock()
        worker.local_status = mock.AsyncMock()
        worker.refresh_host_reboot_report = mock.AsyncMock()
        worker.heartbeat_loop = mock.AsyncMock(side_effect=worker.stop_event.wait)
        worker.acquire = mock.AsyncMock()
        async def request(method, path, **kwargs):
            reply = await self.request(method, path, **kwargs)
            if path.endswith("/result"):
                worker.stop_event.set()
            return reply
        worker.remote_command_request = request
        await asyncio.wait_for(worker.run(), 10)
        self.assertEqual(self.reports[-1]["status"], "succeeded")
        worker.acquire.assert_not_awaited()

    async def test_unknown_and_queued_maintenance_do_not_spin_main_loop(self):
        worker = self.worker()
        worker.remote_commands.receive(self.command())
        with worker.remote_commands._db() as db:
            db.execute("UPDATE commands SET phase='running'")
        worker.pending_sync = {"type": "restart_services", "request_id": "deferred"}
        worker.ensure_registered = mock.AsyncMock()
        worker.scan_capabilities = mock.AsyncMock()
        worker.local_status = mock.AsyncMock()
        worker.refresh_host_reboot_report = mock.AsyncMock()
        worker.heartbeat_loop = mock.AsyncMock(side_effect=worker.stop_event.wait)
        worker.remote_command_request = self.request
        worker.execute_pending_sync = mock.AsyncMock()
        worker.acquire = mock.AsyncMock(side_effect=worker.stop_event.set)
        await asyncio.wait_for(worker.run(), 2)
        worker.execute_pending_sync.assert_not_awaited()
        worker.acquire.assert_awaited_once()
        self.assertTrue(worker.remote_commands_busy())

    async def test_generation_and_maintenance_gate_during_command(self):
        worker = self.worker()
        worker.remote_commands.receive(self.command("import time; time.sleep(60)"))
        task = asyncio.create_task(worker.remote_commands.pump(self.request, worker.remote_command_can_start))
        for _ in range(100):
            if worker.remote_commands.active_id:
                break
            await asyncio.sleep(0.01)
        worker._json_request = mock.AsyncMock()
        self.assertIsNone(await worker.acquire())
        worker.pending_sync = {"type": "restart_services", "request_id": "restart"}
        await worker.execute_pending_sync()
        worker._json_request.assert_not_awaited()
        self.assertIsNotNone(worker.pending_sync)
        worker.remote_commands.cancel("exec-1")
        await asyncio.wait_for(task, 10)

    async def test_all_start_gates_and_received_not_busy(self):
        worker = self.worker()
        worker.remote_commands.receive(self.command())
        self.assertFalse(worker.remote_commands_busy())
        self.assertTrue(worker.remote_command_can_start())
        for attribute, value in (("current", {"job_id": "j"}), ("local_busy", True),
                                 ("release_failed", "unconfirmed"), ("pending_sync", {"type": "sync_files"}),
                                 ("_maintenance_executing", True), ("comfy_online", False)):
            previous = getattr(worker, attribute)
            setattr(worker, attribute, value)
            self.assertFalse(worker.remote_command_can_start(), attribute)
            setattr(worker, attribute, previous)
        with mock.patch.object(worker, "deployment_blocks_jobs", return_value=True):
            self.assertFalse(worker.remote_command_can_start())

    async def test_shared_journal_remote_busy_never_pollutes_native_peer_busy(self):
        owner, peer = self.worker(), self.worker()
        owner.state["worker_id"], peer.state["worker_id"] = "owner", "peer"
        self.assertEqual(owner.remote_commands.path, peer.remote_commands.path)
        owner.remote_commands.receive(self.command())
        # Holding the real OS lock simulates a live claim/execution owner.
        # Neither Worker's heartbeat may wait for this lock.
        self.assertTrue(owner.remote_commands.lock.acquire())
        try:
            for phase in ("claiming", "running"):
                with owner.remote_commands._db() as db:
                    db.execute("UPDATE commands SET phase=?", (phase,))
                for external_busy in (False, True):
                    with self.subTest(phase=phase, external_busy=external_busy):
                        async def heartbeat_once(worker, native_busy):
                            worker.stop_event.clear()
                            worker.confirm_release_recovery = mock.AsyncMock()
                            worker.refresh_host_reboot_report = mock.AsyncMock()
                            worker.last_capability_scan = worker.last_telemetry_scan = time.time()
                            bodies = []
                            async def endpoint(method, url, **kwargs):
                                if url.endswith("/queue"):
                                    return {"queue_running": [[1, "external-comfy-job"]] if native_busy else [],
                                            "queue_pending": []}
                                self.assertTrue(url.endswith("/agent/v1/heartbeat"), url)
                                bodies.append(kwargs["json"])
                                worker.stop_event.set()
                                return {}
                            worker._json_request = mock.AsyncMock(side_effect=endpoint)
                            await worker.heartbeat_loop()
                            self.assertEqual(len(bodies), 1)
                            return bodies[0]
                        owner_body, peer_body = await asyncio.wait_for(asyncio.gather(
                            heartbeat_once(owner, False), heartbeat_once(peer, external_busy)), timeout=1)
                        for body in (owner_body, peer_body):
                            self.assertTrue(body["busy"])
                            self.assertFalse(body["capacity_released"])
                            self.assertIsNone(body["current_job_id"])
                        self.assertFalse(owner_body["local_busy"])
                        self.assertEqual(peer_body["local_busy"], external_busy)
        finally:
            owner.remote_commands.lock.close()

    async def test_heartbeat_continues_cancels_without_waiting(self):
        worker = self.worker(is_primary_node=True, heartbeat_seconds=2)
        worker.remote_commands.receive(self.command("import time; time.sleep(60)"))
        task = asyncio.create_task(worker.remote_commands.pump(self.request, worker.remote_command_can_start))
        for _ in range(100):
            if worker.remote_commands.active_id:
                break
            await asyncio.sleep(0.01)
        worker.local_status = mock.AsyncMock()
        worker.confirm_release_recovery = mock.AsyncMock()
        worker.scan_capabilities = mock.AsyncMock()
        worker.refresh_host_reboot_report = mock.AsyncMock()
        worker.last_capability_scan = time.time()
        worker.last_telemetry_scan = time.time()
        bodies = []
        async def heartbeat_request(method, url, **kwargs):
            bodies.append(kwargs["json"])
            worker.stop_event.set()
            return {"commands": [{"type": "cancel_remote_command", "execution_id": "exec-1"}]}
        worker._json_request = mock.AsyncMock(side_effect=heartbeat_request)
        await asyncio.wait_for(worker.heartbeat_loop(), 2)
        self.assertTrue(bodies[0]["busy"])
        self.assertFalse(bodies[0]["local_busy"])
        self.assertFalse(bodies[0]["capacity_released"])
        await asyncio.wait_for(task, 10)
        self.assertEqual(self.reports[-1]["status"], "canceled")


class InventoryTests(Fixture, unittest.TestCase):
    def test_metadata_extra_paths_pagination_no_weight_reads(self):
        models = self.comfy / "models"
        models.mkdir()
        (models / "中文.safetensors").write_bytes(b"not a model")
        shared = self.root / "shared"
        shared.mkdir()
        (shared / "shared.ckpt").write_bytes(b"metadata only")
        (self.comfy / "extra_model_paths.yaml").write_text("nas:\n  base_path: ../shared\n  checkpoints: .\n", encoding="utf-8")
        original = Path.open
        def guarded(path, *args, **kwargs):
            if path.suffix in {".safetensors", ".ckpt"}:
                raise AssertionError("weight contents must not be read")
            return original(path, *args, **kwargs)
        with mock.patch.object(Path, "open", guarded):
            first = scan_inventory(self.comfy, limit=1)
            second = scan_inventory(self.comfy, offset=first["next_offset"], limit=1)
        self.assertEqual(first["entries"][0]["size"], 11)
        self.assertTrue(first["has_more"])
        self.assertTrue(second["entries"][0]["shared"])
        self.assertFalse(second["has_more"])
        self.assertEqual(first["extra_config"], [str(self.comfy / "extra_model_paths.yaml")])

    def test_hardlink_identity_and_logical_size_metadata(self):
        models = self.comfy / "models"
        models.mkdir()
        original = models / "original.safetensors"
        original.write_bytes(b"metadata only")
        alias = models / "alias.safetensors"
        os.link(original, alias)
        result = scan_inventory(self.comfy)
        entries = result["entries"]
        self.assertEqual(len(entries), 2)
        self.assertEqual(result["size_semantics"], "logical_bytes_from_lstat_not_allocated_or_reclaimable")
        self.assertEqual(entries[0]["file_identity"], entries[1]["file_identity"])
        info = original.lstat()
        for entry in entries:
            self.assertEqual(entry["size_bytes"], len(b"metadata only"))
            self.assertEqual(entry["size"], entry["size_bytes"])
            self.assertEqual(entry["st_dev"], info.st_dev)
            self.assertEqual(entry["st_ino"], info.st_ino)
            self.assertEqual(entry["st_nlink"], 2)
            self.assertEqual(entry["file_identity"], f"{info.st_dev}:{info.st_ino}")
            self.assertTrue(entry["hardlink"])
            self.assertFalse(entry["symlink"])
        self.assertEqual(len({entry["file_identity"] for entry in entries}), 1)

    def test_large_file_identity_is_preserved_for_json_consumers(self):
        models = self.comfy / "models"
        models.mkdir()
        model = models / "model.bin"
        model.touch()
        original_lstat = Path.lstat
        def metadata(path, *args, **kwargs):
            info = original_lstat(path, *args, **kwargs)
            if path == model:
                return mock.Mock(st_mode=info.st_mode, st_size=info.st_size, st_mtime=info.st_mtime,
                                 st_dev=2 ** 60 + 1, st_ino=2 ** 120 + 3, st_nlink=1, st_file_attributes=0)
            return info
        with mock.patch.object(Path, "lstat", metadata):
            result = scan_inventory(self.comfy)
        entry = json.loads(json.dumps(result))["entries"][0]
        self.assertEqual(entry["file_identity"], f"{2 ** 60 + 1}:{2 ** 120 + 3}")
        self.assertFalse(entry["hardlink"])

    def test_dangling_symlinks_and_directory_links_not_followed(self):
        models = self.comfy / "models"
        models.mkdir()
        outside = self.root / "outside"
        outside.mkdir()
        (outside / "secret.ckpt").write_bytes(b"x")
        try:
            (models / "linked").symlink_to(outside, target_is_directory=True)
            (models / "broken.ckpt").symlink_to(outside / "absent")
        except OSError as exc:
            self.skipTest(f"symlink privilege unavailable: {exc}")
        result = scan_inventory(self.comfy)
        self.assertEqual(len(result["entries"]), 2)
        self.assertTrue(all(entry["type"] == "link" for entry in result["entries"]))
        self.assertFalse(any("secret.ckpt" in entry["path"] for entry in result["entries"]))

    @unittest.skipUnless(os.name == "nt", "Windows directory junction")
    def test_junction_and_linked_root_ancestor_not_followed(self):
        models = self.comfy / "models"
        models.mkdir()
        outside = self.root / "outside"
        outside.mkdir()
        (outside / "secret.ckpt").write_bytes(b"x")
        junction = models / "junction"
        result = subprocess.run(["cmd.exe", "/d", "/c", "mklink", "/J", str(junction), str(outside)], capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        inventory = scan_inventory(self.comfy)
        self.assertEqual(len(inventory["entries"]), 1)
        self.assertTrue(inventory["entries"][0]["reparse_point"])
        config = self.comfy / "extra_model_paths.yaml"
        config.write_text("nas:\n  checkpoints: " + str(junction / "child") + "\n", encoding="utf-8")
        inventory = scan_inventory(self.comfy)
        self.assertTrue(inventory["scan_errors"])
        self.assertNotIn("secret.ckpt", json.dumps(inventory))

    def test_output_budget_and_missing_config_error(self):
        models = self.comfy / "models"
        models.mkdir()
        for i in range(100):
            (models / (str(i).zfill(3) + "模" * 70 + ".bin")).touch()
        result = scan_inventory(self.comfy, limit=100, extra_config="absent.yaml")
        self.assertLessEqual(len(json.dumps(result, ensure_ascii=True).encode("utf-8")), 50 * 1024)
        self.assertLessEqual(len(json.dumps(result, ensure_ascii=False).encode("utf-8")), 50 * 1024)
        self.assertTrue(result["has_more"])
        self.assertTrue(result["scan_errors"])
        self.assertEqual(result["next_offset"], len(result["entries"]))

    def test_bad_yaml_returns_scan_error(self):
        (self.comfy / "extra_model_paths.yaml").write_text("broken: [", encoding="utf-8")
        self.assertTrue(scan_inventory(self.comfy)["scan_errors"])


if __name__ == "__main__":
    unittest.main()
