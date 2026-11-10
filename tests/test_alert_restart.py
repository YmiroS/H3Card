import asyncio
import copy
import json
import sqlite3
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "worker"))

from distributed import DistributedStore, WorkerBusyError
from agent import AgentError, WorkerAgent


class AlertRestartStoreTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "control.db"
        self.store = DistributedStore(self.path)
        self.addCleanup(lambda: self.store.close())
        self.caps = {
            "supports_service_restart": True,
            "supports_guarded_service_restart": True,
            "supports_code_restart": True,
            "hardware": {"host_id": "host-a"},
        }
        self.worker_id = self.store.register_worker("node-a", self.caps)["worker_id"]
        self.store.heartbeat(self.worker_id, comfy_online=True)
        self.store.enqueue("job-a", {})
        self.assignment = self.store.acquire(self.worker_id)
        self.assertTrue(self.store.mark_running("job-a", self.worker_id, self.assignment["lease_token"]))

    def request(self, request_id="alert-a", assignment=None):
        assignment = assignment or self.assignment
        return self.store.request_alert_restart(
            self.worker_id, assignment["job_id"], assignment["attempt_id"], request_id,
        )

    def heartbeat(self, maintenance=None, **kwargs):
        return self.store.heartbeat(
            self.worker_id, current_job_id=self.assignment["job_id"],
            comfy_online=True, maintenance=maintenance, **kwargs,
        )

    def report(self, status, request_id="alert-a", **kwargs):
        return self.heartbeat({"request_id": request_id, "status": status,
                               "message": "维护回报"}, **kwargs)

    def sql(self, query, values=()):
        with self.store.lock, self.store.db:
            self.store.db.execute(query, values)

    def checkpoint(self):
        snapshot = sqlite3.connect(":memory:")
        self.addCleanup(snapshot.close)
        self.store.db.backup(snapshot)
        return lambda: snapshot.backup(self.store.db)

    def expire(self):
        self.sql("UPDATE dispatch_jobs SET lease_expires_at = 0")

    def finish(self):
        self.assertTrue(self.store.finish(
            self.assignment["job_id"], self.worker_id, self.assignment["lease_token"], "done",
        ))

    def assert_error(self, request_id="alert-a"):
        result = self.store.alert_restart_status(request_id)
        self.assertEqual(result["status"], "error")
        self.assertTrue(result["message"])

    def test_execution_uses_first_capacity_start_and_exposes_only_public_fields(self):
        execution = self.store.job_execution("job-a")
        self.assertEqual(set(execution), {"job_id", "worker_id", "worker_name", "attempt_id",
                                          "started_at", "restart_supported", "restart_reason"})
        self.assertEqual(execution["attempt_id"], self.assignment["attempt_id"])
        self.assertTrue(execution["restart_supported"])
        self.assertIsNone(execution["restart_reason"])
        self.sql("UPDATE dispatch_jobs SET updated_at = updated_at + 100")
        self.store.mark_running("job-a", self.worker_id, self.assignment["lease_token"])
        self.assertEqual(self.store.job_execution("job-a")["started_at"], execution["started_at"])
        self.assertIsNone(self.store.job_execution("missing"))

    def test_execution_filters_all_invalid_task_states(self):
        for query in (
            "UPDATE dispatch_jobs SET status='done'",
            "UPDATE dispatch_jobs SET status='assigned'",
            "UPDATE dispatch_jobs SET cancel_requested=1",
            "UPDATE dispatch_jobs SET lease_expires_at=0",
            "UPDATE dispatch_jobs SET lease_token_hash='different'",
            "UPDATE capacity_attempts SET ended_at=1",
            "UPDATE capacity_attempts SET started_at=NULL",
            "UPDATE capacity_tasks SET current_attempt='other'",
            "UPDATE workers SET current_job_id='new-job'",
        ):
            with self.subTest(query=query):
                self.store.db.execute("SAVEPOINT invalid_execution")
                self.store.db.execute(query)
                self.assertIsNone(self.store.job_execution("job-a"))
                self.store.db.execute("ROLLBACK TO invalid_execution")
                self.store.db.execute("RELEASE invalid_execution")

    def test_offline_primary_old_worker_capabilities_and_conflicts(self):
        scenarios = [
            ("offline", "UPDATE workers SET last_seen=0", None),
            ("primary", None, {**self.caps, "is_primary_node": True}),
            ("old-worker", None, {**self.caps, "supports_guarded_service_restart": False}),
            ("unsupported", None, {**self.caps, "supports_service_restart": False}),
            ("maintenance", "UPDATE workers SET sync_status='pending', sync_request_id='other'", None),
        ]
        restore = self.checkpoint()
        for name, query, caps in scenarios:
            with self.subTest(name=name):
                restore()
                if query:
                    self.sql(query)
                if caps:
                    self.sql("UPDATE workers SET capabilities_json=?", (json.dumps(caps),))
                execution = self.store.job_execution("job-a")
                self.assertIsNotNone(execution)
                self.assertFalse(execution["restart_supported"])
                self.assertTrue(execution["restart_reason"])
                with self.assertRaises(WorkerBusyError):
                    self.request()
        restore()

    def test_reregistration_and_shared_host_are_rejected(self):
        for same_name in (True, False):
            with self.subTest(same_name=same_name):
                peer = self.store.register_worker("node-a" if same_name else "peer", self.caps)["worker_id"]
                with self.assertRaises(WorkerBusyError):
                    self.request()
                self.assertFalse(self.store.job_execution("job-a")["restart_supported"])
                self.sql("UPDATE workers SET retired=1 WHERE id=?", (peer,))

    def test_old_card_new_job_never_interrupts_new_assignment(self):
        self.finish()
        self.store.enqueue("job-b", {})
        new = self.store.acquire(self.worker_id)
        self.store.mark_running("job-b", self.worker_id, new["lease_token"])
        with self.assertRaises(WorkerBusyError):
            self.request()
        self.assertEqual(self.store.dispatch_status("job-b"), "running")
        self.assertIsNone(self.store.alert_restart_status("alert-a"))

    def test_same_job_new_attempt_rejects_old_card(self):
        self.expire()
        self.store.heartbeat(self.worker_id, comfy_online=True)
        new = self.store.acquire(self.worker_id)
        self.assertNotEqual(new["attempt_id"], self.assignment["attempt_id"])
        self.store.mark_running("job-a", self.worker_id, new["lease_token"])
        with self.assertRaises(WorkerBusyError):
            self.request()
        self.assertEqual(self.store.job_execution("job-a")["attempt_id"], new["attempt_id"])

    def test_expired_or_canceled_task_rejected_at_request(self):
        self.expire()
        with self.assertRaises(WorkerBusyError):
            self.request()
        self.sql("UPDATE dispatch_jobs SET lease_expires_at=?", (time.time() + 60,))
        self.store.request_cancel("job-a")
        with self.assertRaises(WorkerBusyError):
            self.request()

    def test_command_contract_and_actual_result_statuses(self):
        self.assertEqual(self.request(), {"worker_id": self.worker_id, "request_id": "alert-a",
                                         "action": "restart_services"})
        self.assertEqual(self.store.alert_restart_status("alert-a")["status"], "pending")
        reply = self.heartbeat()
        self.assertEqual(reply["commands"], [{"type": "restart_services", "request_id": "alert-a",
                                              "expected_job_id": "job-a",
                                              "expected_attempt_id": self.assignment["attempt_id"]}])
        ack = self.report("running")["maintenance_ack"]
        self.assertEqual(ack, {"request_id": "alert-a", "status": "running"})
        self.assertEqual(self.store.alert_restart_status("alert-a")["status"], "running")
        self.finish()
        self.report("done")
        self.assertEqual(self.store.alert_restart_status("alert-a")["status"], "done")
        self.report("error")
        self.assertEqual(self.store.alert_restart_status("alert-a")["status"], "done")

    def test_dispatch_revalidates_expiry_finish_cancellation_registration_primary_and_host(self):
        self.request()
        scenarios = [
            ("expired", "UPDATE dispatch_jobs SET lease_expires_at=0", None),
            ("finished", "UPDATE dispatch_jobs SET status='done'", None),
            ("canceled", "UPDATE dispatch_jobs SET cancel_requested=1", None),
            ("new-attempt", "UPDATE capacity_tasks SET current_attempt='new-attempt'", None),
            ("new-job", "UPDATE workers SET current_job_id='job-b'", None),
            ("primary", None, {**self.caps, "is_primary_node": True}),
            ("capability", None, {**self.caps, "supports_guarded_service_restart": False}),
            ("offline", "UPDATE workers SET last_seen=0", None),
        ]
        restore = self.checkpoint()
        for name, query, caps in scenarios:
            with self.subTest(name=name):
                restore()
                if query:
                    self.sql(query)
                reply = self.heartbeat(capabilities=caps)
                self.assertFalse(any(command["type"] == "restart_services" for command in reply["commands"]))
                self.assert_error()
        for name, caps in (("node-a", {"hardware": {"host_id": "different"}}), ("peer", self.caps)):
            restore()
            self.store.register_worker(name, caps)
            self.assertFalse(self.heartbeat()["commands"])
            self.assert_error()

    def test_running_ack_rechecks_after_command_delivery(self):
        self.request()
        self.heartbeat()
        self.expire()
        reply = self.report("running")
        self.assertEqual(reply["maintenance_ack"], {"request_id": "alert-a", "status": "error"})
        self.assert_error()
        self.report("done")
        self.assert_error()

    def test_running_handshake_revalidates_all_task_and_worker_conditions(self):
        self.request()
        self.heartbeat()
        restore = self.checkpoint()
        for query in (
            "UPDATE dispatch_jobs SET status='done'",
            "UPDATE dispatch_jobs SET cancel_requested=1",
            "UPDATE capacity_tasks SET current_attempt='replacement'",
            "UPDATE workers SET current_job_id='job-b'",
            "UPDATE workers SET last_seen=0",
            "UPDATE workers SET capabilities_json=json_set(capabilities_json, '$.is_primary_node', json('true'))",
            "UPDATE workers SET capabilities_json=json_set(capabilities_json, '$.supports_guarded_service_restart', json('false'))",
        ):
            with self.subTest(query=query):
                restore()
                self.sql(query)
                self.assertEqual(self.report("running")["maintenance_ack"]["status"], "error")
                self.assert_error()
        for name in ("node-a", "peer"):
            restore()
            self.store.register_worker(name, self.caps)
            self.assertEqual(self.report("running")["maintenance_ack"]["status"], "error")
            self.assert_error()

    def test_guarded_running_handshake_also_holds_sqlite_write_lock(self):
        self.request()
        self.heartbeat()
        original = self.store._job_execution_locked
        observed = []

        def inspect(job_id, now):
            other = sqlite3.connect(str(self.path), timeout=0)
            try:
                with self.assertRaises(sqlite3.OperationalError):
                    other.execute("UPDATE dispatch_jobs SET status='done'")
                observed.append(True)
            finally:
                other.close()
            return original(job_id, now)

        with mock.patch.object(self.store, "_job_execution_locked", side_effect=inspect):
            self.assertEqual(self.report("running")["maintenance_ack"]["status"], "running")
        self.assertTrue(observed)

    def test_running_handshake_cannot_ack_when_worker_reports_another_job(self):
        self.request()
        reply = self.store.heartbeat(self.worker_id, comfy_online=True, current_job_id="job-b",
                                     maintenance={"request_id": "alert-a", "status": "running"})
        self.assertEqual(reply["maintenance_ack"]["status"], "error")
        self.assert_error()

    def test_pending_cannot_claim_done_without_running_ack(self):
        self.request()
        self.assertEqual(self.report("done")["maintenance_ack"]["status"], "error")
        self.assert_error()

    def test_done_without_online_comfy_is_error_and_late_replay_cannot_claim_success(self):
        self.request()
        self.report("running")
        reply = self.store.heartbeat(
            self.worker_id, comfy_online=False,
            maintenance={"request_id": "alert-a", "status": "done", "message": "已重启"},
        )
        self.assertEqual(reply["maintenance_ack"]["status"], "error")
        self.assert_error()
        self.assertIn("ComfyUI", self.store.alert_restart_status("alert-a")["message"])
        self.report("done")
        self.assert_error()

    def test_worker_error_is_saved_and_can_be_acknowledged_after_slot_overwrite(self):
        self.request()
        self.report("running")
        self.report("error")
        self.assert_error()
        other = self.store.request_worker_sync(self.worker_id)
        reply = self.report("error")
        self.assertEqual(reply["maintenance_ack"], {"request_id": "alert-a", "status": "error"})
        self.assertEqual(self.store.db.execute("SELECT sync_request_id FROM workers WHERE id=?",
                                             (self.worker_id,)).fetchone()[0], other["request_id"])
        self.assert_error()

    def test_idempotent_across_reopen_and_other_maintenance(self):
        result = self.request()
        self.assertEqual(self.request(), result)
        self.store.close()
        self.store = DistributedStore(self.path)
        self.assertEqual(self.request(), result)
        self.report("running")
        self.report("done")
        other = self.store.request_worker_restart(self.worker_id, "restart_services")
        self.store.close()
        self.store = DistributedStore(self.path)
        self.assertEqual(self.request(), result)
        self.assertEqual(self.store.alert_restart_status("alert-a")["status"], "done")
        row = self.store.db.execute("SELECT sync_request_id, sync_status FROM workers WHERE id=?",
                                    (self.worker_id,)).fetchone()
        self.assertEqual(tuple(row), (other["request_id"], "pending"))
        with self.assertRaises(ValueError):
            self.store.request_alert_restart(self.worker_id, "different-job", self.assignment["attempt_id"], "alert-a")
        self.assertIsNone(self.store.alert_restart_status("missing"))

    def test_pending_and_running_timeout_are_errors_and_never_late_success(self):
        for running in (False, True):
            request_id = "running" if running else "pending"
            self.request(request_id)
            if running:
                self.report("running", request_id)
            self.sql("UPDATE guarded_service_restarts SET requested_at=0, started_at=? WHERE request_id=?",
                     (0 if running else None, request_id))
            self.assert_error(request_id)
            self.report("done", request_id)
            self.assert_error(request_id)

    def test_guarded_precondition_and_reservation_hold_sqlite_write_lock(self):
        original = self.store._job_execution_locked
        observed = []

        def inspect(job_id, now):
            other = sqlite3.connect(str(self.path), timeout=0)
            try:
                with self.assertRaises(sqlite3.OperationalError):
                    other.execute("UPDATE dispatch_jobs SET status='done' WHERE job_id=?", (job_id,))
                observed.append(True)
            finally:
                other.close()
            return original(job_id, now)

        with mock.patch.object(self.store, "_job_execution_locked", side_effect=inspect):
            self.request()
        self.assertTrue(observed)

    def test_legacy_restart_still_allows_unguarded_worker(self):
        self.sql("UPDATE workers SET capabilities_json=?", (json.dumps({"supports_service_restart": True}),))
        request = self.store.request_worker_restart(self.worker_id, "restart_services")
        self.assertEqual(self.heartbeat()["commands"], [{"type": "restart_services",
                                                       "request_id": request["request_id"]}])


class AlertRestartWorkerTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.config = Path(self.temp.name) / "config.json"
        self.config.write_text(json.dumps({"server_url": "http://controller.invalid",
                                           "comfy_input_dir": self.temp.name}), encoding="utf-8")
        self.agent = WorkerAgent(self.config)
        self.assignment = {"job_id": "job-a", "attempt_id": "attempt-a", "lease_token": "lease-a",
                           "payload": {"graph": {}}, "_lease_deadline": time.monotonic() + 60}
        self.agent.current = self.assignment
        self.command = {"type": "restart_services", "request_id": "alert-a",
                        "expected_job_id": "job-a", "expected_attempt_id": "attempt-a"}
        self.agent._json_request = mock.AsyncMock(return_value={
            "maintenance_ack": {"request_id": "alert-a", "status": "running"}})
        self.agent.schedule_node_restart = mock.AsyncMock()
        self.agent.cancel_current = mock.AsyncMock()
        self.agent.start_cleanup = mock.Mock()

    async def execute(self):
        self.agent.queue_sync(self.command)
        self.assertEqual(self.agent.pending_sync, self.command)
        await self.agent.execute_pending_sync()

    def assert_no_task_side_effects(self):
        self.agent.cancel_current.assert_not_awaited()
        self.agent.start_cleanup.assert_not_called()
        self.agent.schedule_node_restart.assert_not_awaited()

    async def test_successful_running_handshake_precedes_restart_and_blocks_new_jobs(self):
        async def handshake(method, url, **kwargs):
            self.assertEqual(method, "POST")
            self.assertTrue(url.endswith("/agent/v1/heartbeat"))
            self.assertEqual(kwargs["json"]["current_job_id"], "job-a")
            self.assertEqual(kwargs["json"]["maintenance"]["status"], "running")
            self.assertIsNone(await self.agent.acquire())
            self.agent.schedule_node_restart.assert_not_awaited()
            return {"maintenance_ack": {"request_id": "alert-a", "status": "running"}}

        self.agent._json_request.side_effect = handshake
        await self.execute()
        self.agent.schedule_node_restart.assert_awaited_once_with("alert-a", "")
        self.assertEqual(self.agent.sync_report["status"], "running")
        self.assertNotEqual(self.agent.sync_report["status"], "done")
        self.agent.cancel_current.assert_not_awaited()
        self.agent.start_cleanup.assert_not_called()
        self.agent.queue_sync(self.command)
        self.assertIsNone(self.agent.pending_sync)

    async def test_execution_rejects_task_switch_attempt_switch_cancel_cleanup_finished_and_expiry(self):
        changes = [None, {"job_id": "job-b"}, {"attempt_id": "attempt-b"},
                   {"cancel_requested": True}, {"_cleanup_task": object()},
                   {"_execution_finished": True}, {"finished": True}, {"_lease_deadline": 0}]
        for changeset in changes:
            with self.subTest(changes=changeset):
                self.agent.state = {"host_id": "host"}
                self.agent.sync_report = None
                self.agent.pending_sync = None
                self.agent.current = ({**self.assignment, **changeset} if changeset is not None else None)
                await self.execute()
                self.assertEqual(self.agent.sync_report["status"], "error")
                self.assert_no_task_side_effects()
                self.agent._json_request.assert_not_awaited()

    async def test_handshake_await_races_cannot_restart_changed_or_finished_task(self):
        for change in ("new-job", "new-attempt", "finished", "cancel", "cleanup", "primary"):
            with self.subTest(change=change):
                self.agent.state = {"host_id": "host"}
                self.agent.sync_report = None
                self.agent.current = copy.deepcopy(self.assignment)
                self.agent.config["is_primary_node"] = False

                async def handshake(*args, **kwargs):
                    if change == "new-job":
                        self.agent.current = {**self.assignment, "job_id": "job-b"}
                    elif change == "new-attempt":
                        self.agent.current["attempt_id"] = "attempt-b"
                    elif change == "finished":
                        self.agent.current["_execution_finished"] = True
                    elif change == "cancel":
                        self.agent.current["cancel_requested"] = True
                    elif change == "cleanup":
                        self.agent.current["_cleanup_task"] = object()
                    else:
                        self.agent.config["is_primary_node"] = True
                    return {"maintenance_ack": {"request_id": "alert-a", "status": "running"}}

                self.agent._json_request.side_effect = handshake
                await self.execute()
                self.assertEqual(self.agent.sync_report["status"], "error")
                self.assert_no_task_side_effects()

    async def test_rejected_missing_wrong_or_network_failed_ack_never_restarts(self):
        for reply in ({}, {"maintenance_ack": {"request_id": "alert-a", "status": "error"}},
                      {"maintenance_ack": {"request_id": "other", "status": "running"}},
                      {"maintenance_ack": {"request_id": "alert-a", "status": "done"}}, AgentError("离线")):
            with self.subTest(reply=reply):
                self.agent.state = {"host_id": "host"}
                self.agent.sync_report = None
                self.agent._json_request.side_effect = reply if isinstance(reply, Exception) else None
                self.agent._json_request.return_value = reply
                await self.execute()
                self.assertEqual(self.agent.sync_report["status"], "error")
                self.assert_no_task_side_effects()

    async def test_canceled_handshake_persists_error_and_dedup_before_propagating(self):
        self.agent._json_request.side_effect = asyncio.CancelledError()
        with self.assertRaises(asyncio.CancelledError):
            await self.execute()
        self.assertEqual(self.agent.sync_report["status"], "error")
        self.assertEqual(self.agent.state["maintenance"]["status"], "error")
        self.assert_no_task_side_effects()
        restored = WorkerAgent(self.config)
        restored.sync_report = None
        restored.queue_sync(self.command)
        self.assertIsNone(restored.pending_sync)

    async def test_partial_guard_is_not_downgraded_to_legacy_restart(self):
        self.command.pop("expected_attempt_id")
        await self.execute()
        self.assertEqual(self.agent.sync_report["status"], "error")
        self.assert_no_task_side_effects()
        self.agent._json_request.assert_not_awaited()

    async def test_rejection_is_persisted_and_replay_stays_deduplicated_after_other_maintenance(self):
        self.agent.current = None
        await self.execute()
        restored = WorkerAgent(self.config)
        self.assertEqual(restored.sync_report["status"], "error")
        restored.state["maintenance"] = {"request_id": "other", "status": "ready"}
        restored.state["last_maintenance_request_id"] = "other"
        restored.sync_report = None
        restored._save_state()
        restored = WorkerAgent(self.config)
        restored.sync_report = None
        restored.queue_sync(self.command)
        self.assertIsNone(restored.pending_sync)

    async def test_late_acquire_result_cannot_start_new_task_during_handshake(self):
        async def handshake(*args, **kwargs):
            self.agent.current = None
            self.agent.prepare_inputs = mock.AsyncMock()
            await self.agent.execute({"job_id": "job-b", "attempt_id": "attempt-b"})
            self.agent.prepare_inputs.assert_not_awaited()
            self.assertIsNone(self.agent.current)
            return {"maintenance_ack": {"request_id": "alert-a", "status": "running"}}

        self.agent._json_request.side_effect = handshake
        await self.execute()
        self.assert_no_task_side_effects()

    async def test_restart_helper_rechecks_after_launcher_check_await_before_subprocess(self):
        repo = Path(self.temp.name)
        helper = repo / "worker" / "restart_node.py"
        helper.parent.mkdir()
        helper.touch()
        launcher = repo / "launch.bat"
        launcher.touch()
        self.agent.code_repo_path = mock.Mock(return_value=repo)
        self.agent.node_launcher_path = mock.Mock(return_value=launcher)
        self.agent._guarded_restart = (self.command, self.assignment)

        async def launcher_check(*args, **kwargs):
            self.agent.current = {**self.assignment, "attempt_id": "attempt-b"}

        self.agent.run_local_command = mock.AsyncMock(side_effect=launcher_check)
        with mock.patch("agent.os.name", "nt"), mock.patch("agent.subprocess.Popen") as popen:
            with self.assertRaises(AgentError):
                await WorkerAgent.schedule_node_restart(self.agent, "alert-a", "")
        popen.assert_not_called()
        self.assertNotIn("maintenance", self.agent.state)

    async def test_worker_and_real_store_roundtrip_only_reports_done_after_recovery_evidence(self):
        store = DistributedStore(Path(self.temp.name) / "controller.db")
        self.addCleanup(store.close)
        caps = {"supports_service_restart": True, "supports_guarded_service_restart": True}
        worker = store.register_worker("node", caps)
        store.heartbeat(worker["worker_id"], comfy_online=True)
        store.enqueue("job-a", {})
        assignment = store.acquire(worker["worker_id"])
        store.mark_running("job-a", worker["worker_id"], assignment["lease_token"])
        self.agent.current = assignment
        self.agent.state.update(worker)
        store.request_alert_restart(worker["worker_id"], "job-a", assignment["attempt_id"], "alert-a")
        command = store.heartbeat(worker["worker_id"], current_job_id="job-a", comfy_online=True)["commands"][0]

        async def heartbeat(method, url, **kwargs):
            self.assertEqual(method, "POST")
            return store.heartbeat(worker["worker_id"], **kwargs["json"])

        self.agent._json_request.side_effect = heartbeat
        self.agent.queue_sync(command)
        await self.agent.execute_pending_sync()
        self.agent.schedule_node_restart.assert_awaited_once_with("alert-a", "")
        self.assertEqual(store.alert_restart_status("alert-a")["status"], "running")
        self.agent.state["maintenance"].update(status="restarting", restart_token="new-process")
        self.agent.restart_token = "wrong-process"
        self.agent.comfy_online = True
        self.agent.fresh_capabilities_ready = True
        self.agent.refresh_restart_report()
        self.assertEqual(self.agent.sync_report["status"], "running")
        self.agent.restart_token = "new-process"
        self.agent.fresh_capabilities_ready = False
        self.agent.refresh_restart_report()
        self.assertEqual(self.agent.sync_report["status"], "running")
        self.agent.fresh_capabilities_ready = True
        self.agent.refresh_restart_report()
        self.assertEqual(self.agent.sync_report["status"], "done")
        await heartbeat("POST", "heartbeat", json={"maintenance": self.agent.sync_report, "comfy_online": True})
        self.assertEqual(store.alert_restart_status("alert-a")["status"], "done")

    async def test_helper_failure_is_persisted_as_error_and_not_retried(self):
        self.agent.schedule_node_restart.side_effect = AgentError("监督器启动失败")
        await self.execute()
        self.assertEqual(self.agent.sync_report["status"], "error")
        self.assertEqual(self.agent.state["maintenance"]["status"], "error")
        self.agent.queue_sync(self.command)
        self.assertIsNone(self.agent.pending_sync)
        self.agent.schedule_node_restart.assert_awaited_once()

    async def test_guarded_capability_only_announced_by_windows_worker(self):
        self.agent.scan_telemetry = mock.AsyncMock()
        self.agent._json_request.side_effect = lambda method, url: (
            {"KSampler": {}} if url.endswith("object_info") else {"system": {}, "devices": []})
        for name in ("nt", "posix"):
            with mock.patch("agent.os.name", name):
                caps = await self.agent.scan_capabilities()
            self.assertIs(caps["supports_guarded_service_restart"], name == "nt")


if __name__ == "__main__":
    unittest.main()
