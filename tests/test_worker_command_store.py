"""Remote-command contracts against temporary, real SQLite dispatch stores.

No scripts are executed. Failing safety assertions intentionally remain visible
so implementation changes can be made independently of this test-only work.
"""
import copy
import json
import sqlite3
import sys
import tempfile
import threading
import time
import unittest
from contextlib import closing
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
for directory in (ROOT, ROOT / "server", ROOT / "tests"):
    sys.path.insert(0, str(directory))

from distributed import DistributedStore, WorkerBusyError
from worker_commands import CommandConflict, OUTPUT_LIMIT, validate_command


def command_body(worker_ids=(), **changes):
    return {"request_key": "request_0001", "all_online": False,
            "worker_ids": list(worker_ids), "interpreter": "python",
            "script": "print('contract only; never executed')", "cwd": "",
            "timeout_seconds": 30, **changes}


def result_body(**changes):
    return {"claim_key": "claim_0001", "status": "succeeded", "exit_code": 0,
            "stdout": "中文输出", "stderr": "", "stdout_truncated": False,
            "stderr_truncated": False, "error": "", "process_stopped": True,
            **changes}


def invalid_commands():
    yield "not-object", []
    base = command_body(["worker"])
    for field in base:
        value = dict(base)
        del value[field]
        yield "missing-" + field, value
    yield "extra-field", {**base, "admin": True}
    values = {
        "request_key": [None, True, 123, [], {}, "short", "a b c d e", "x" * 129],
        "all_online": [None, 0, 1, "false", [], {}],
        "worker_ids": [None, "worker", {}, [None], [True], [1], [[]], [{}],
                       [""], ["x" * 129], ["same", "same"], [str(i) for i in range(129)]],
        "interpreter": [None, True, 1, [], {}, "bash", "Python"],
        "script": [None, True, 1, [], {}, "", " \n\t", "a\x00b", "汉" * 10923],
        "cwd": [None, True, 1, [], {}, "relative/path", "C:relative", "C:/bad\npath", "x" * 1025],
        "timeout_seconds": [None, True, False, "30", 30.0, [], {}, 4, 3601, 10 ** 100],
    }
    for field, bad_values in values.items():
        for index, value in enumerate(bad_values):
            yield f"{field}-{index}", {**base, field: value}
    yield "both-target-modes", {**base, "all_online": True}
    yield "neither-target-mode", {**base, "worker_ids": []}


class CommandStoreFixture:
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.db_path = self.root / "dispatch.db"
        self.store = DistributedStore(self.db_path)
        self.addCleanup(self.store.close)
        self.commands = self.store.commands
        self.serial = 0
        self.agents = {}

    def worker(self, name=None, host=None, **changes):
        self.serial += 1
        name = name or f"worker-{self.serial}"
        caps = {"hardware": {"host_id": host or f"host-{self.serial}"},
                "remote_commands": {"version": 1, "interpreters": ["python", "powershell"]},
                "supports_code_restart": True, "supports_service_restart": True,
                "supports_host_reboot": True, "node_classes": ["TestNode"],
                "devices": [{"type": "cuda", "name": "RTX 5090", "vram_total": 32 * 1024 ** 3}],
                **changes}
        agent = self.store.register_worker(name, caps)
        worker_id = agent["worker_id"]
        self.agents[worker_id] = agent
        # Explicit monotonic registration ordering, without wall-clock sleeps.
        self.update_worker(worker_id, created_at=time.time() + self.serial / 1000)
        self.store.heartbeat(worker_id, comfy_online=True)
        return worker_id

    def update_worker(self, worker_id, **fields):
        with self.store.lock, self.store.db:
            self.store.db.execute("UPDATE workers SET " + ",".join(f"{key}=?" for key in fields)
                                  + " WHERE id=?", (*fields.values(), worker_id))

    def worker_snapshot(self, worker_id):
        with self.store.lock:
            return dict(self.store.db.execute("SELECT * FROM workers WHERE id=?", (worker_id,)).fetchone())

    def worker_blocked(self, worker_id, host=None):
        with self.store.lock:
            return self.commands.blocks_worker_locked(worker_id, host)

    def create(self, *worker_ids, actor="admin", **changes):
        return self.commands.create(actor, command_body(worker_ids, **changes))

    def execution(self, detail):
        self.assertEqual(len(detail["executions"]), 1, detail)
        return detail["executions"][0]

    def stored(self, execution_id):
        with self.store.lock:
            return dict(self.store.db.execute("SELECT * FROM worker_command_executions WHERE id=?",
                                              (execution_id,)).fetchone())

    def claimed(self, worker_id=None, **changes):
        worker_id = worker_id or self.worker()
        detail = self.create(worker_id, **changes)
        execution = self.execution(detail)
        claim = self.commands.claim(execution["id"], worker_id, "claim_0001")
        self.assertTrue(claim["authorized"])
        return detail, execution

    def host_blocked(self, host):
        with self.store.lock:
            return self.commands.blocks_host_locked(host)


class WorkerCommandValidationTests(unittest.TestCase):
    def test_bad_fields_and_types_are_value_errors(self):
        for label, body in invalid_commands():
            with self.subTest(case=label), self.assertRaises(ValueError):
                validate_command(body)

    def test_valid_bounds_paths_sort_and_no_input_mutation(self):
        for cwd in ("", "E:/ComfyUI", r"E:\ComfyUI", "/srv/comfy", r"\\server\share\comfy"):
            for seconds in (5, 3600):
                with self.subTest(cwd=cwd, seconds=seconds):
                    body = command_body(["z", "a"], cwd=cwd, timeout_seconds=seconds,
                                        script="汉" * 10922 + "xx", request_key="x" * 128)
                    original = copy.deepcopy(body)
                    validated = validate_command(body)
                    self.assertEqual(validated["worker_ids"], ["a", "z"])
                    self.assertEqual(body, original)
        self.assertTrue(validate_command(command_body(all_online=True))["all_online"])


class WorkerCommandStoreTests(CommandStoreFixture, unittest.TestCase):
    def test_invalid_create_does_not_persist_a_batch(self):
        for label, body in invalid_commands():
            with self.subTest(case=label), self.assertRaises(ValueError):
                self.commands.create("admin", body)
        self.assertEqual(self.commands.history()["batches"], [])

    def test_latest_name_normalization_and_old_registration_rejected(self):
        old = self.worker(" GPU-Straße ")
        latest = self.worker("gpu-STRASSE")
        with self.assertRaises(CommandConflict):
            self.create(old)
        detail = self.create(latest)
        self.assertEqual(self.execution(detail)["worker_id"], latest)
        self.assertFalse(self.store.heartbeat(old, comfy_online=True)["commands"])
        self.assertEqual(self.store.heartbeat(latest, comfy_online=True)["commands"][0]["type"],
                         "remote_command")

    def test_all_online_freezes_latest_snapshot_including_primary_not_future_workers(self):
        old = self.worker("GPU")
        latest = self.worker(" gpu ")
        primary = self.worker("primary", is_primary_node=True)
        offline = self.worker("offline")
        self.update_worker(offline, last_seen=time.time() - 3600)
        retired = self.worker("retired")
        self.update_worker(retired, retired=1)
        detail = self.create(all_online=True)
        ids = {row["worker_id"] for row in detail["executions"]}
        self.assertEqual(ids, {latest, primary})
        self.assertNotIn(old, ids)
        self.assertTrue(all(row["status"] == "pending" for row in detail["executions"]))
        future = self.worker("future")
        self.store.heartbeat(offline, comfy_online=True)
        self.assertEqual(self.commands.detail(detail["batch"]["id"])["executions"], detail["executions"])
        self.assertEqual(self.create(all_online=True)["batch"]["id"], detail["batch"]["id"])
        self.assertFalse(self.store.heartbeat(future, comfy_online=True)["commands"])

    def test_primary_can_claim_remote_command_even_when_comfy_is_down(self):
        primary = self.worker(is_primary_node=True)
        self.store.heartbeat(primary, comfy_online=False)
        _, execution = self.claimed(primary)
        self.assertEqual(self.stored(execution["id"])["status"], "running")

    def test_same_host_is_one_execution_and_offer_only_goes_to_chosen_worker(self):
        first = self.worker("first", host="shared")
        second = self.worker("second", host="shared")
        detail = self.create(first, second)
        row = self.execution(detail)
        self.assertEqual(set(row["worker_ids"]), {first, second})
        self.assertEqual(row["host_id"], "shared")
        for worker_id in (first, second):
            offers = self.store.heartbeat(worker_id, comfy_online=True)["commands"]
            self.assertEqual(len(offers), int(worker_id == row["worker_id"]))
        blocked = self.execution(self.create(first, request_key="request_0002"))
        self.assertEqual(blocked["status"], "skipped")

    def test_legacy_missing_host_and_bad_capability_support_are_skipped(self):
        cases = [None, True, False, 0, 1, {}, {"version": True, "interpreters": ["python"]},
                 {"version": "1", "interpreters": ["python"]},
                 {"version": 1, "interpreters": "python"},
                 {"version": 1, "interpreters": None},
                 {"version": 1, "interpreters": True},
                 {"version": 1, "interpreters": {"python": True}},
                 {"version": 1, "interpreters": [[], {}, None, 1]},
                 {"version": 1, "interpreters": ["powershell"]}, [], "invalid"]
        for index, support in enumerate(cases):
            with self.subTest(support=support):
                worker = self.worker(remote_commands=support)
                row = self.execution(self.create(worker, request_key=f"legacy_{index:04}"))
                self.assertEqual(row["status"], "skipped")
                self.assertFalse(self.commands.claim(row["id"], worker, "claim_0001")["authorized"])
        missing = self.worker(hardware={})
        row = self.execution(self.create(missing, request_key="missing_host"))
        self.assertEqual(row["status"], "skipped")
        self.assertIn("host_id", row["error"])

    def test_same_host_prefers_supported_worker_over_newer_legacy(self):
        capable = self.worker("capable", host="shared")
        legacy = self.worker("legacy", host="shared", remote_commands={})
        row = self.execution(self.create(capable, legacy))
        self.assertEqual((row["status"], row["worker_id"]), ("pending", capable))

    def test_manual_same_host_selection_prefers_online_eligible_over_first_offline_peer(self):
        for reverse in (False, True):
            with self.subTest(reverse_input=reverse):
                pair = sorted([self.worker(host=f"mixed-{reverse}"), self.worker(host=f"mixed-{reverse}")])
                offline, online = pair
                self.update_worker(offline, last_seen=time.time() - 3600)
                selected = list(reversed(pair)) if reverse else pair
                row = self.execution(self.create(*selected, request_key=f"mixed_online_{reverse}"))
                self.assertEqual((row["status"], row["worker_id"]), ("pending", online))
                self.assertEqual(set(row["worker_ids"]), set(pair))
                self.assertEqual(self.store.heartbeat(online, comfy_online=True)["commands"][0]["execution_id"], row["id"])
                self.assertFalse(self.store.heartbeat(offline, comfy_online=True)["commands"])
                self.assertTrue(self.commands.claim(row["id"], online, "claim_0001")["authorized"])

    def test_online_legacy_peer_does_not_make_offline_interpreter_support_eligible(self):
        capable = self.worker(host="mixed-support")
        legacy = self.worker(host="mixed-support", remote_commands={})
        self.update_worker(capable, last_seen=time.time() - 3600)
        row = self.execution(self.create(capable, legacy))
        self.assertEqual((row["status"], row["worker_id"]), ("skipped", capable))
        self.assertFalse(self.commands.claim(row["id"], capable, "claim_0001")["authorized"])

    def test_active_heartbeat_host_change_is_rejected_atomically_until_command_stops(self):
        for status in ("pending", "running", "unknown"):
            with self.subTest(status=status):
                worker = self.worker(host="frozen-" + status)
                detail = self.create(worker, request_key="freeze_" + status)
                row = self.execution(detail)
                if status != "pending":
                    self.commands.claim(row["id"], worker, "claim_0001")
                if status == "unknown":
                    self.commands.report(row["id"], worker, result_body(
                        status="unknown", exit_code=None, process_stopped=False))
                before_worker, before_command = self.worker_snapshot(worker), self.stored(row["id"])
                caps = json.loads(before_worker["capabilities_json"])
                variants = [
                    {"capabilities": {**caps, "hardware": {"host_id": "moved-" + status}}},
                    {"capabilities": {"host_id": "moved-" + status}},
                    {"capabilities": {"hardware": {}}, "telemetry": {"host_id": "moved-" + status}},
                    {"capabilities": {}},
                ]
                for heartbeat in variants:
                    with self.subTest(heartbeat=heartbeat), self.assertRaises(WorkerBusyError):
                        self.store.heartbeat(worker, comfy_online=True, **heartbeat)
                    self.assertEqual(self.worker_snapshot(worker), before_worker)
                    self.assertEqual(self.stored(row["id"]), before_command)
                    self.assertTrue(self.host_blocked(row["host_id"]))
                self.store.enqueue("fenced-" + status, {"capability": "test", "target_worker_id": worker}, ["TestNode"])
                self.assertIsNone(self.store.acquire(worker))
                with self.assertRaises(WorkerBusyError):
                    self.store.request_worker_sync(worker)
                if status == "pending":
                    self.commands.cancel(detail["batch"]["id"])
                elif status == "running":
                    self.commands.report(row["id"], worker, result_body(status="failed", exit_code=7))
                else:
                    self.commands.resolve(detail["batch"]["id"], row["id"], "admin")
                moved_caps = {**caps, "hardware": {"host_id": "moved-" + status}}
                self.assertIsNotNone(self.store.heartbeat(worker, comfy_online=True, capabilities=moved_caps))
                self.assertFalse(self.worker_blocked(worker, "moved-" + status))
                self.assertEqual(self.store.acquire(worker)["job_id"], "fenced-" + status)

    def test_active_worker_and_participant_identity_locks_survive_host_or_registration_changes(self):
        for state in ("running", "unknown"):
            for identity in ("execution_id", "participant_id", "execution_name", "participant_name", "host_alias"):
                with self.subTest(state=state, identity=identity):
                    key = state + "_" + identity
                    host, moved = "locked-" + key, "moved-" + key
                    first = self.worker("owner-" + key, host=host)
                    second = self.worker("participant-" + key, host=host)
                    detail = self.create(first, second, request_key="original_" + key)
                    row = self.execution(detail)
                    owner = row["worker_id"]
                    participant = next(worker for worker in (first, second) if worker != owner)
                    self.commands.claim(row["id"], owner, "claim_0001")
                    if state == "unknown":
                        self.commands.report(row["id"], owner, result_body(
                            status="unknown", exit_code=None, process_stopped=False))
                    original_before = self.stored(row["id"])
                    if identity.endswith("_id"):
                        contender = owner if identity == "execution_id" else participant
                        caps = json.loads(self.worker_snapshot(contender)["capabilities_json"])
                        # Seed historical/bypassed heartbeat data; rename too so
                        # this assertion cannot accidentally pass via name/host.
                        self.update_worker(contender, name="renamed-" + key,
                                           capabilities_json=json.dumps({**caps, "hardware": {"host_id": moved}}))
                        contender_host = moved
                    elif identity.endswith("_name"):
                        source = owner if identity == "execution_name" else participant
                        name = self.worker_snapshot(source)["name"]
                        contender = self.worker(" " + name.upper() + " ", host=moved)
                        contender_host = moved
                    else:
                        contender = self.worker("new-alias-" + key, host=host)
                        contender_host = host
                    self.assertTrue(self.worker_blocked(contender, contender_host))
                    # Passing an unrelated host cannot bypass original IDs/names.
                    if identity != "host_alias":
                        self.assertTrue(self.worker_blocked(contender, "not-the-original-host"))
                    self.store.enqueue("job-" + key, {"capability": "test", "target_worker_id": contender}, ["TestNode"])
                    self.assertIsNone(self.store.acquire(contender))
                    for action in ("sync_files", "restart_services", "reboot_host"):
                        with self.subTest(action=action), self.assertRaises(WorkerBusyError):
                            if action == "sync_files":
                                self.store.request_worker_sync(contender)
                            else:
                                self.store.request_worker_restart(contender, action)
                    skipped = self.execution(self.create(contender, request_key="blocked_" + key))
                    self.assertEqual(skipped["status"], "skipped")
                    self.store.request_sync_all()
                    self.assertEqual(self.worker_snapshot(contender)["sync_status"], "idle")
                    self.assertEqual(self.stored(row["id"]), original_before)
                    if state == "unknown":
                        self.commands.resolve(detail["batch"]["id"], row["id"], "admin")
                    else:
                        self.commands.report(row["id"], owner, result_body())
                    self.assertFalse(self.worker_blocked(contender, contender_host))

    def test_claim_rejects_own_real_busy_but_remote_only_busy_can_be_split_out(self):
        worker = self.worker()
        row = self.execution(self.create(worker))
        self.store.heartbeat(worker, comfy_online=True, busy=True, local_busy=True)
        before = self.stored(row["id"])
        with self.assertRaises(CommandConflict):
            self.commands.claim(row["id"], worker, "claim_0001")
        self.assertEqual(self.stored(row["id"]), before)
        # Aggregate busy may include the remote journal, but local_busy=False
        # explicitly reports no real local generation; this must not self-lock.
        self.store.heartbeat(worker, comfy_online=True, busy=True, local_busy=False)
        self.assertFalse(self.worker_snapshot(worker)["busy"])
        self.assertTrue(self.commands.claim(row["id"], worker, "claim_0001")["authorized"])

    def test_history_offset_sqlite_integer_boundary_is_validated(self):
        for offset in (2 ** 63, 2 ** 63 + 1, 10 ** 100):
            with self.subTest(offset=offset), self.assertRaises(ValueError):
                self.commands.history(offset, 20)
        self.assertEqual(self.commands.history(2 ** 63 - 1, 20), {"batches": [], "next_offset": None})

    def test_explicit_offline_is_skipped_and_unknown_or_retired_id_conflicts(self):
        worker = self.worker()
        self.update_worker(worker, last_seen=time.time() - 3600)
        self.assertEqual(self.execution(self.create(worker))["status"], "skipped")
        for worker_id in ("missing", worker):
            if worker_id == worker:
                self.update_worker(worker, retired=1)
            with self.subTest(worker_id=worker_id), self.assertRaises(CommandConflict):
                self.create(worker_id, request_key="request_0002")

    def test_request_key_idempotency_order_conflict_and_actor_scope(self):
        first, second = self.worker(), self.worker()
        original = self.create(second, first)
        self.assertEqual(self.create(first, second), original)
        with self.assertRaises(CommandConflict):
            self.create(first, second, script="print('changed')")
        other = self.create(first, second, actor="other-admin")
        self.assertNotEqual(other["batch"]["id"], original["batch"]["id"])
        self.assertEqual(len(self.commands.history()["batches"]), 2)
        self.assertTrue(all(row["status"] == "skipped" for row in other["executions"]))

    def test_offline_pending_expires_before_returning_heartbeat_can_offer_it(self):
        worker = self.worker()
        detail = self.create(worker)
        row = self.execution(detail)
        self.update_worker(worker, last_seen=time.time() - self.store.offline_seconds - 1)
        self.assertFalse(self.store.heartbeat(worker, comfy_online=True)["commands"])
        claim = self.commands.claim(row["id"], worker, "claim_0001")
        self.assertEqual((claim["authorized"], claim["status"]), (False, "expired"))
        self.assertFalse(self.host_blocked(row["host_id"]))

    def test_claim_deadline_and_reregistration_permanently_expire_pending(self):
        for cause in ("deadline", "replacement"):
            with self.subTest(cause=cause):
                worker = self.worker(cause)
                row = self.execution(self.create(worker, request_key="expire_" + cause))
                if cause == "deadline":
                    with self.store.lock, self.store.db:
                        self.store.db.execute("UPDATE worker_command_executions SET claim_deadline=? WHERE id=?",
                                              (time.time() - 1, row["id"]))
                else:
                    self.worker(cause.upper(), host=row["host_id"])
                claim = self.commands.claim(row["id"], worker, "claim_0001")
                self.assertEqual((claim["authorized"], claim["status"]), (False, "expired"))
                self.assertFalse(self.store.heartbeat(worker, comfy_online=True)["commands"])

    def test_claim_keys_idempotency_cross_worker_and_host_change(self):
        worker, other = self.worker(), self.worker()
        row = self.execution(self.create(worker))
        for key in (None, True, [], {}, "", "short", "a b c d e", "x" * 129):
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.commands.claim(row["id"], worker, key)
        with self.assertRaises(KeyError):
            self.commands.claim(row["id"], other, "claim_0001")
        first = self.commands.claim(row["id"], worker, "claim_0001")
        started = self.stored(row["id"])["started_at"]
        self.assertEqual(self.commands.claim(row["id"], worker, "claim_0001"), first)
        self.assertFalse(self.commands.claim(row["id"], worker, "claim_0002")["authorized"])
        self.assertEqual(self.stored(row["id"])["started_at"], started)
        self.assertFalse(self.stored(row["id"])["process_stopped"])
        changed = self.worker("changed")
        pending = self.execution(self.create(changed, request_key="changed_host"))
        with self.assertRaises(WorkerBusyError):
            self.store.heartbeat(changed, comfy_online=True, telemetry={"host_id": "replacement-host"},
                                 capabilities={"host_id": "replacement-host"})
        # Simulate a historical/out-of-band identity mutation to exercise the
        # claim guard independently of the new heartbeat rejection.
        self.update_worker(changed, capabilities_json=json.dumps({"host_id": "replacement-host"}))
        with self.assertRaises(CommandConflict):
            self.commands.claim(pending["id"], changed, "claim_0001")

    def test_claim_retry_ack_exposes_persisted_cancel_flag_without_restarting_execution(self):
        worker = self.worker()
        detail = self.create(worker)
        row = self.execution(detail)
        first = self.commands.claim(row["id"], worker, "claim_0001")
        self.assertEqual(first, {"execution_id": row["id"], "status": "running", "authorized": True,
                                 "claim_key": "claim_0001", "cancel_requested": False})
        self.assertIs(first["cancel_requested"], False)
        self.assertEqual(self.commands.claim(row["id"], worker, "claim_0001"), first)
        self.commands.cancel(detail["batch"]["id"], row["id"])
        canceled = self.stored(row["id"])
        changes = self.store.db.total_changes
        retry = self.commands.claim(row["id"], worker, "claim_0001")
        self.assertEqual(retry, {**first, "cancel_requested": True})
        self.assertIs(retry["cancel_requested"], True)
        self.assertEqual(self.stored(row["id"]), canceled)
        self.assertEqual(self.store.db.total_changes, changes)
        self.assertFalse(self.commands.claim(row["id"], worker, "claim_0002")["authorized"])
        self.assertTrue(self.host_blocked(row["host_id"]))

    def test_running_same_key_claim_retry_rejects_changed_host_even_after_cancel(self):
        worker = self.worker(host="original-device")
        detail, row = self.claimed(worker)
        with self.assertRaises(WorkerBusyError):
            self.store.heartbeat(worker, comfy_online=True, capabilities={"host_id": "replacement-device"})
        # Defense in depth for databases written before heartbeat host fencing.
        self.update_worker(worker, capabilities_json=json.dumps({"host_id": "replacement-device"}))
        for cancel in (False, True):
            with self.subTest(cancel_requested=cancel):
                if cancel:
                    self.commands.cancel(detail["batch"]["id"], row["id"])
                before = self.stored(row["id"])
                changes = self.store.db.total_changes
                with self.assertRaises(CommandConflict):
                    self.commands.claim(row["id"], worker, "claim_0001")
                self.assertEqual(self.stored(row["id"]), before)
                self.assertEqual(self.store.db.total_changes, changes)
                self.assertEqual(before["host_id"], "original-device")

    def test_claim_gate_rejects_existing_generation_on_same_host_including_old_worker(self):
        old = self.worker("gpu", host="shared")
        self.store.enqueue("generation", {"capability": "test"}, ["TestNode"])
        generation = self.store.acquire(old)
        self.assertIsNotNone(generation)
        latest = self.worker(" GPU ", host="shared")
        row = self.execution(self.create(latest))
        with self.assertRaises(CommandConflict):
            self.commands.claim(row["id"], latest, "claim_0001")
        self.assertEqual(self.stored(row["id"])["status"], "pending")
        self.assertTrue(self.store.finish("generation", old, generation["lease_token"], "done",
                                          capacity_released=True))
        self.assertTrue(self.commands.claim(row["id"], latest, "claim_0001")["authorized"])

    def test_claim_gate_checks_peer_busy_current_job_and_all_live_dispatch_states(self):
        target = self.worker("target", host="shared")
        peer = self.worker("peer", host="shared")
        row = self.execution(self.create(target))
        for fields in ({"busy": 1}, {"current_job_id": "external"}):
            with self.subTest(fields=fields):
                self.update_worker(peer, **fields)
                with self.assertRaises(CommandConflict):
                    self.commands.claim(row["id"], target, "claim_0001")
                self.update_worker(peer, busy=0, current_job_id=None)
        for status in ("assigned", "running", "cancel_requested"):
            with self.subTest(status=status):
                with self.store.lock, self.store.db:
                    self.store.db.execute("INSERT INTO dispatch_jobs(job_id,payload_json,status,worker_id,created_at,updated_at) "
                                          "VALUES(?,'{}',?,?,?,?)", (status, status, peer, time.time(), time.time()))
                with self.assertRaises(CommandConflict):
                    self.commands.claim(row["id"], target, "claim_0001")
                with self.store.lock, self.store.db:
                    self.store.db.execute("DELETE FROM dispatch_jobs WHERE job_id=?", (status,))
        self.assertTrue(self.commands.claim(row["id"], target, "claim_0001")["authorized"])

    def test_command_pending_running_unknown_block_generation_until_stopped_result(self):
        worker = self.worker(host="shared")
        peer = self.worker("peer", host="shared")
        row = self.execution(self.create(worker))
        self.store.enqueue("generation", {"capability": "test"}, ["TestNode"])
        for state in ("pending", "running", "unknown"):
            with self.subTest(state=state):
                if state == "running":
                    self.commands.claim(row["id"], worker, "claim_0001")
                if state == "unknown":
                    self.commands.report(row["id"], worker, result_body(
                        status="unknown", exit_code=None, process_stopped=False))
                self.assertIsNone(self.store.acquire(worker))
                self.assertIsNone(self.store.acquire(peer))
                self.assertEqual(self.store.dispatch_status("generation"), "queued")
        self.commands.report(row["id"], worker, result_body(status="failed", exit_code=9))
        self.assertEqual(self.store.acquire(peer)["job_id"], "generation")

    def test_command_and_maintenance_are_mutually_exclusive_both_directions(self):
        for action in ("sync_files", "restart_services", "reboot_host"):
            with self.subTest(action=action):
                worker = self.worker(action)
                detail = self.create(worker, request_key="command_" + action)
                for state in ("pending", "running", "unknown"):
                    row = self.execution(detail)
                    if state == "running":
                        self.commands.claim(row["id"], worker, "claim_0001")
                    if state == "unknown":
                        self.commands.report(row["id"], worker, result_body(
                            status="unknown", exit_code=None, process_stopped=False))
                    with self.assertRaises(WorkerBusyError):
                        if action == "sync_files":
                            self.store.request_worker_sync(worker)
                        else:
                            self.store.request_worker_restart(worker, action)
                self.commands.resolve(detail["batch"]["id"], row["id"], "admin")
                if action == "sync_files":
                    self.store.request_worker_sync(worker)
                else:
                    self.store.request_worker_restart(worker, action)
                skipped = self.execution(self.create(worker, request_key="maintain_" + action))
                self.assertEqual(skipped["status"], "skipped")

    def test_bulk_sync_skips_command_host(self):
        worker = self.worker()
        free = self.worker()
        self.create(worker)
        result = self.store.request_sync_all()
        self.assertEqual(result["worker_count"], 1)
        self.assertEqual(result["skipped_count"], 1)
        with self.store.lock:
            statuses = dict(self.store.db.execute("SELECT id,sync_status FROM workers"))
        self.assertEqual((statuses[worker], statuses[free]), ("idle", "pending"))

    def test_claim_rechecks_maintenance_introduced_after_create(self):
        worker = self.worker(host="shared")
        peer = self.worker("peer", host="shared")
        row = self.execution(self.create(worker))
        for status in ("pending", "running", "error"):
            with self.subTest(status=status):
                self.update_worker(peer, sync_status=status)
                with self.assertRaises(CommandConflict):
                    self.commands.claim(row["id"], worker, "claim_0001")
                self.assertEqual(self.stored(row["id"])["status"], "pending")
        self.update_worker(peer, sync_status="idle")
        self.assertTrue(self.commands.claim(row["id"], worker, "claim_0001")["authorized"])

    def test_report_rejects_cross_worker_and_cross_claim_key_without_mutation(self):
        detail, row = self.claimed()
        other = self.worker()
        before = self.stored(row["id"])
        with self.assertRaises(KeyError):
            self.commands.report(row["id"], other, result_body())
        with self.assertRaises(CommandConflict):
            self.commands.report(row["id"], row["worker_id"], result_body(claim_key="claim_0002"))
        self.assertEqual(self.stored(row["id"]), before)
        self.assertNotIn("claim_key", json.dumps(self.commands.detail(detail["batch"]["id"])))

    def test_same_host_replacement_ack_only_after_admin_resolve_is_read_only(self):
        owner = self.worker("original", host="shared-journal")
        detail, row = self.claimed(owner)
        replacement = self.worker(" ORIGINAL ", host="shared-journal")
        submitted = result_body(stdout="must not replace original stdout", stderr="late stderr")
        before = self.stored(row["id"])
        changes = self.store.db.total_changes
        with self.assertRaises(KeyError):
            self.commands.report(row["id"], replacement, submitted)
        self.assertEqual(self.stored(row["id"]), before)
        self.assertEqual(self.store.db.total_changes, changes)

        self.commands.report(row["id"], owner, result_body(
            status="unknown", exit_code=None, process_stopped=False,
            stdout="original stdout", stderr="original stderr", error="original process lost"))
        self.update_worker(owner, last_seen=time.time() - 3600, retired=1)
        before = self.stored(row["id"])
        changes = self.store.db.total_changes
        with self.assertRaises(KeyError):
            self.commands.report(row["id"], replacement, submitted)
        self.assertEqual(self.stored(row["id"]), before)
        self.assertEqual(self.store.db.total_changes, changes)
        self.assertTrue(self.host_blocked(row["host_id"]))

        self.commands.resolve(detail["batch"]["id"], row["id"], "confirming-admin")
        resolved = self.stored(row["id"])
        self.assertEqual(resolved["status"], "failed")
        self.assertTrue(resolved["process_stopped"])
        self.assertEqual(resolved["stdout"], "original stdout")
        changes = self.store.db.total_changes
        ack = self.commands.report(row["id"], replacement, submitted)
        self.assertEqual(ack, {"execution_id": row["id"], "status": "failed", "accepted": True})
        self.assertEqual(self.stored(row["id"]), resolved)
        self.assertEqual(self.store.db.total_changes, changes, "terminal ACK must not write any table")
        self.assertFalse(self.host_blocked(row["host_id"]))
        with self.assertRaises(KeyError):
            self.commands.claim(row["id"], replacement, "claim_0001")
        with self.assertRaises(KeyError):
            self.commands.report(row["id"], replacement, result_body(claim_key="claim_0002"))
        foreign = self.worker("foreign", host="different-host")
        changes = self.store.db.total_changes
        with self.assertRaises(KeyError):
            self.commands.report(row["id"], foreign, submitted)
        self.assertEqual(self.stored(row["id"]), resolved)
        self.assertEqual(self.store.db.total_changes, changes)

    def test_same_host_terminal_ack_without_persisted_claim_does_not_bind_key(self):
        owner = self.worker("owner", host="unclaimed-journal")
        detail = self.create(owner)
        row = self.execution(detail)
        self.commands.cancel(detail["batch"]["id"])
        replacement = self.worker("replacement", host="unclaimed-journal")
        before = self.stored(row["id"])
        self.assertIsNone(before["claim_key"])
        self.assertEqual(before["status"], "canceled")
        self.assertTrue(before["process_stopped"])
        changes = self.store.db.total_changes
        for key in ("claim_0001", "claim_0002"):
            with self.subTest(key=key):
                ack = self.commands.report(row["id"], replacement, result_body(
                    claim_key=key, stdout="must not populate an unclaimed result"))
                self.assertEqual(ack, {"execution_id": row["id"], "status": "canceled", "accepted": True})
                self.assertEqual(self.stored(row["id"]), before)
                self.assertEqual(self.store.db.total_changes, changes)

    def test_same_host_terminal_ack_requires_stopped_process_and_current_stable_host(self):
        detail, row = self.claimed(self.worker("owner", host="shared-journal"))
        self.commands.report(row["id"], row["worker_id"], result_body(status="failed", exit_code=7))
        peer = self.worker("peer", host="shared-journal")
        missing_host = self.worker("missing-host", hardware={})
        foreign = self.worker("foreign", host="foreign-host")
        retired = self.worker("retired", host="shared-journal")
        self.update_worker(retired, retired=1)
        before = self.stored(row["id"])
        changes = self.store.db.total_changes
        for worker in (missing_host, foreign, retired, "nonexistent-worker"):
            with self.subTest(worker=worker), self.assertRaises(KeyError):
                self.commands.report(row["id"], worker, result_body())
            self.assertEqual(self.stored(row["id"]), before)
            self.assertEqual(self.store.db.total_changes, changes)
        # An inconsistent historical terminal row must not bypass the explicit
        # process-stopped condition just because its status sounds final.
        with self.store.lock, self.store.db:
            self.store.db.execute("UPDATE worker_command_executions SET process_stopped=0 WHERE id=?", (row["id"],))
        before = self.stored(row["id"])
        changes = self.store.db.total_changes
        with self.assertRaises(KeyError):
            self.commands.report(row["id"], peer, result_body())
        self.assertEqual(self.stored(row["id"]), before)
        self.assertEqual(self.store.db.total_changes, changes)

    def test_same_host_ack_preserves_every_existing_terminal_status(self):
        owner = self.worker("owner", host="terminal-journal")
        detail, row = self.claimed(owner)
        peer = self.worker("peer", host="terminal-journal")
        for status in ("succeeded", "failed", "canceled", "timed_out", "skipped", "expired"):
            with self.subTest(status=status):
                # Seed each persisted terminal state: this tests ACK eligibility,
                # not how the normal execution path reaches the terminal state.
                with self.store.lock, self.store.db:
                    self.store.db.execute("UPDATE worker_command_executions SET status=?,process_stopped=1 WHERE id=?",
                                          (status, row["id"]))
                before = self.stored(row["id"])
                changes = self.store.db.total_changes
                ack = self.commands.report(row["id"], peer, result_body(stdout="must not overwrite"))
                self.assertEqual(ack, {"execution_id": row["id"], "status": status, "accepted": True})
                self.assertEqual(self.stored(row["id"]), before)
                self.assertEqual(self.store.db.total_changes, changes)

    def test_report_bad_types_output_byte_limits_and_status_exitcode(self):
        _, row = self.claimed()
        bad = [[], {}, {**result_body(), "extra": True}]
        for field in result_body():
            body = result_body()
            del body[field]
            bad.append(body)
        values = {
            "status": [None, True, 0, [], {}, "running", "expired"],
            "claim_key": [None, True, [], {}, "x" * 129],
            "exit_code": [True, False, "0", 0.0, [], {}, 2 ** 63, -(2 ** 63) - 1],
            "stdout": [None, 1, [], {}, "x" * (OUTPUT_LIMIT + 1), "汉" * 21846],
            "stderr": [None, 1, [], {}, "汉" * 21846],
            "error": [None, 1, [], {}, "x" * 2001],
            "stdout_truncated": [None, 0, 1, "false", [], {}],
            "stderr_truncated": [None, 0, 1, "false", [], {}],
            "process_stopped": [None, 0, 1, "true", [], {}],
        }
        for field, values_for_field in values.items():
            bad.extend(result_body(**{field: value}) for value in values_for_field)
        bad.extend([result_body(exit_code=7), result_body(exit_code=None),
                    result_body(process_stopped=False)])
        bad.extend(result_body(status=status, process_stopped=False)
                   for status in ("failed", "canceled", "timed_out"))
        original = self.stored(row["id"])
        for index, body in enumerate(bad):
            with self.subTest(case=index), self.assertRaises(ValueError):
                self.commands.report(row["id"], row["worker_id"], body)
            self.assertEqual(self.stored(row["id"]), original)
        accepted = result_body(stdout="汉" * 21845 + "x", stderr="x" * OUTPUT_LIMIT,
                               stdout_truncated=True, stderr_truncated=True)
        self.commands.report(row["id"], row["worker_id"], accepted)
        stored = self.stored(row["id"])
        self.assertEqual((stored["stdout"], stored["stderr"]), (accepted["stdout"], accepted["stderr"]))
        self.assertTrue(stored["stdout_truncated"] and stored["stderr_truncated"])

    def test_pending_crash_unknown_requires_well_formed_claim_key(self):
        worker = self.worker()
        row = self.execution(self.create(worker))
        for key in ("", "short", "bad key with spaces", "汉" * 8):
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.commands.report(row["id"], worker, result_body(
                    claim_key=key, status="unknown", exit_code=None, process_stopped=False))

    def test_pending_crash_unknown_is_not_reoffered_and_locks_until_admin_resolves(self):
        worker = self.worker()
        detail = self.create(worker)
        row = self.execution(detail)
        self.commands.report(row["id"], worker, result_body(status="unknown", exit_code=None,
                                                          process_stopped=False))
        self.assertTrue(self.host_blocked(row["host_id"]))
        self.assertFalse(self.store.heartbeat(worker, comfy_online=True)["commands"])
        self.assertFalse(self.commands.claim(row["id"], worker, "claim_0001")["authorized"])
        resolved = self.commands.resolve(detail["batch"]["id"], row["id"], "confirming-admin")
        self.assertEqual(self.execution(resolved)["status"], "failed")
        self.assertTrue(self.execution(resolved)["process_stopped"])
        self.assertEqual(self.stored(row["id"])["resolved_by"], "confirming-admin")
        self.assertFalse(self.host_blocked(row["host_id"]))

    def test_pending_cannot_forge_executed_result_and_stays_available_for_real_claim(self):
        worker = self.worker()
        row = self.execution(self.create(worker))
        before = self.stored(row["id"])
        for status, code in (("succeeded", 0), ("failed", 7), ("canceled", None), ("timed_out", None)):
            with self.subTest(status=status), self.assertRaises(CommandConflict):
                self.commands.report(row["id"], worker, result_body(status=status, exit_code=code))
            self.assertEqual(self.stored(row["id"]), before)
        self.assertTrue(self.commands.claim(row["id"], worker, "claim_0001")["authorized"])

    def test_expire_without_active_commands_does_not_scan_worker_inventories(self):
        worker = self.worker()
        with mock.patch.object(self.commands, "_workers", side_effect=AssertionError("unexpected worker scan")):
            with self.store.lock, self.store.db:
                self.commands.expire_locked(time.time())
        detail = self.create(worker)
        self.commands.cancel(detail["batch"]["id"])
        with mock.patch.object(self.commands, "_workers", side_effect=AssertionError("terminal worker scan")):
            with self.store.lock, self.store.db:
                self.commands.expire_locked(time.time())

    def test_terminal_results_are_idempotent_and_each_terminal_state_releases_host(self):
        for index, (status, code) in enumerate((("succeeded", 0), ("failed", 7),
                                               ("canceled", None), ("timed_out", None))):
            with self.subTest(status=status):
                _, row = self.claimed(request_key=f"terminal_{index}")
                body = result_body(status=status, exit_code=code)
                self.commands.report(row["id"], row["worker_id"], body)
                before = self.stored(row["id"])
                self.commands.report(row["id"], row["worker_id"], result_body(stdout="late overwrite"))
                self.assertEqual(self.stored(row["id"]), before)
                self.assertIsNotNone(before["finished_at"])
                self.assertFalse(self.host_blocked(row["host_id"]))

    def test_cancel_pending_does_not_run_and_running_unknown_remain_locked(self):
        worker = self.worker()
        detail = self.create(worker)
        row = self.execution(detail)
        canceled = self.commands.cancel(detail["batch"]["id"])
        self.assertEqual(self.execution(canceled)["status"], "canceled")
        self.assertFalse(self.commands.claim(row["id"], worker, "claim_0001")["authorized"])
        self.assertFalse(self.host_blocked(row["host_id"]))
        self.assertFalse(self.store.heartbeat(worker, comfy_online=True)["commands"])
        detail, row = self.claimed(worker, request_key="running_cancel")
        for status in ("running", "unknown"):
            if status == "unknown":
                self.commands.report(row["id"], worker, result_body(status="unknown", exit_code=None,
                                                                  process_stopped=False))
            self.commands.cancel(detail["batch"]["id"], row["id"])
            self.assertEqual(self.stored(row["id"])["status"], status)
            self.assertTrue(self.host_blocked(row["host_id"]))
            self.assertEqual(self.store.heartbeat(worker, comfy_online=True)["commands"],
                             [{"type": "cancel_remote_command", "execution_id": row["id"]}])
        self.commands.report(row["id"], worker, result_body(status="canceled", exit_code=None))
        self.assertFalse(self.host_blocked(row["host_id"]))

    def test_running_timeout_or_offline_becomes_unknown_not_free_or_reoffered(self):
        for cause in ("timeout", "offline"):
            with self.subTest(cause=cause):
                detail, row = self.claimed(request_key="unknown_" + cause)
                if cause == "timeout":
                    with self.store.lock, self.store.db:
                        self.store.db.execute("UPDATE worker_command_executions SET started_at=? WHERE id=?",
                                              (time.time() - 91, row["id"]))
                else:
                    self.update_worker(row["worker_id"], last_seen=time.time() - 61)
                item = self.execution(self.commands.detail(detail["batch"]["id"]))
                self.assertEqual(item["status"], "unknown")
                self.assertFalse(item["process_stopped"])
                self.assertTrue(self.host_blocked(row["host_id"]))
                self.assertFalse(self.store.heartbeat(row["worker_id"], comfy_online=True)["commands"])

    def test_cancel_resolve_scope_and_only_unknown_can_be_resolved(self):
        first, row = self.claimed()
        second = self.create(self.worker(), request_key="request_0002")
        with self.assertRaises(KeyError):
            self.commands.cancel(second["batch"]["id"], row["id"])
        with self.assertRaises(KeyError):
            self.commands.resolve(second["batch"]["id"], row["id"], "admin")
        with self.assertRaises(CommandConflict):
            self.commands.resolve(first["batch"]["id"], row["id"], "admin")
        self.assertEqual(self.stored(row["id"])["status"], "running")

    def test_history_paging_detail_missing_and_reopen_persistence(self):
        details = [self.create(self.worker(), request_key=f"history_{i:04}") for i in range(3)]
        page = self.commands.history(0, 2)
        self.assertEqual([row["id"] for row in page["batches"]],
                         [detail["batch"]["id"] for detail in reversed(details[1:])])
        self.assertEqual(page["next_offset"], 2)
        self.assertIsNone(self.commands.history(2, 2)["next_offset"])
        for offset, limit in ((True, 1), (-1, 1), (0, True), (0, 0), (0, 51), ("0", 20)):
            with self.subTest(offset=offset, limit=limit), self.assertRaises(ValueError):
                self.commands.history(offset, limit)
        with self.assertRaises(KeyError):
            self.commands.detail("missing")
        reopened = DistributedStore(self.db_path)
        try:
            self.assertEqual(reopened.commands.detail(details[0]["batch"]["id"]), details[0])
        finally:
            reopened.close()


class WorkerCommandTransactionTests(CommandStoreFixture, unittest.TestCase):
    def test_claim_holds_sqlite_write_gate_before_reading_workers(self):
        worker = self.worker()
        row = self.execution(self.create(worker))
        workers = self.commands._workers
        trace = []

        def probe():
            # A distinct SQLite connection cannot sneak a maintenance/generation
            # write between the claim's safety reads and its running UPDATE.
            with closing(sqlite3.connect(self.db_path, timeout=0)) as contender:
                with self.assertRaisesRegex(sqlite3.OperationalError, "locked"):
                    contender.execute("BEGIN IMMEDIATE")
            return workers()

        self.store.db.set_trace_callback(trace.append)
        self.addCleanup(self.store.db.set_trace_callback, None)
        with mock.patch.object(self.commands, "_workers", side_effect=probe):
            self.assertTrue(self.commands.claim(row["id"], worker, "claim_0001")["authorized"])
        self.assertTrue(trace[0].upper().startswith("BEGIN IMMEDIATE"), trace)
        self.assertTrue(any(sql.upper() == "COMMIT" for sql in trace))

    def test_claim_gate_blocks_concurrent_generation_and_maintenance_until_commit(self):
        for action in ("generation", "sync_files", "restart_services"):
            with self.subTest(action=action):
                worker = self.worker(action)
                row = self.execution(self.create(worker, request_key="claim_race_" + action))
                if action == "generation":
                    self.store.enqueue("claim-race-job", {"capability": "test", "target_worker_id": worker},
                                       ["TestNode"])
                other = DistributedStore(self.db_path)
                attempted, finished = threading.Event(), threading.Event()
                results, errors, threads = [], [], []
                original = self.commands._workers

                def contend():
                    attempted.set()
                    try:
                        if action == "generation":
                            results.append(other.acquire(worker))
                        elif action == "sync_files":
                            results.append(other.request_worker_sync(worker))
                        else:
                            results.append(other.request_worker_restart(worker, action))
                    except WorkerBusyError:
                        results.append("blocked")
                    except BaseException as exc:
                        errors.append(exc)
                    finally:
                        finished.set()

                def pause_read():
                    if not threads:
                        thread = threading.Thread(target=contend, daemon=True)
                        threads.append(thread)
                        thread.start()
                        self.assertTrue(attempted.wait(5))
                        self.assertFalse(finished.wait(0.1), "contender crossed the claim transaction gate")
                    return original()

                try:
                    with mock.patch.object(self.commands, "_workers", side_effect=pause_read):
                        self.assertTrue(self.commands.claim(row["id"], worker, "claim_0001")["authorized"])
                    for thread in threads:
                        thread.join(5)
                    self.assertTrue(finished.is_set())
                    self.assertFalse(errors, errors)
                    self.assertEqual(results, [None if action == "generation" else "blocked"])
                    self.assertEqual(self.stored(row["id"])["status"], "running")
                finally:
                    for thread in threads:
                        thread.join(5)
                    other.close()

    def test_generation_commit_gate_excludes_command_claim_from_other_connection(self):
        worker = self.worker()
        self.store.enqueue("generation", {"capability": "test"}, ["TestNode"])
        other = DistributedStore(self.db_path)
        self.addCleanup(other.close)
        attempted, finished = threading.Event(), threading.Event()
        results, errors = [], []
        original = self.store.capacity.assigned
        threads = []

        def create_command():
            attempted.set()
            try:
                results.append(other.commands.create("admin", command_body([worker])))
            except BaseException as exc:
                errors.append(exc)
            finally:
                finished.set()

        def assigned(*args, **kwargs):
            value = original(*args, **kwargs)
            thread = threading.Thread(target=create_command, daemon=True)
            threads.append(thread)
            thread.start()
            self.assertTrue(attempted.wait(5))
            self.assertFalse(finished.wait(0.1), "command create crossed an uncommitted generation assignment")
            with closing(sqlite3.connect(self.db_path)) as reader:
                self.assertEqual(reader.execute("SELECT status FROM dispatch_jobs WHERE job_id='generation'")
                                 .fetchone()[0], "queued")
            return value

        try:
            with mock.patch.object(self.store.capacity, "assigned", side_effect=assigned):
                generation = self.store.acquire(worker)
                self.assertIsNotNone(generation)
        finally:
            for thread in threads:
                thread.join(5)
        self.assertTrue(finished.is_set())
        self.assertFalse(errors, errors)
        self.assertEqual(len(results), 1)
        row = self.execution(results[0])
        with self.assertRaises(CommandConflict):
            other.commands.claim(row["id"], worker, "claim_0001")

    def test_maintenance_safety_read_and_reservation_are_atomic_with_command_create(self):
        for action in ("sync_files", "restart_services"):
            with self.subTest(action=action):
                worker = self.worker(action)
                other = DistributedStore(self.db_path)
                checked, resume = threading.Event(), threading.Event()
                errors = []
                original = other._check_restart_host_locked

                def paused_check(*args, **kwargs):
                    original(*args, **kwargs)
                    checked.set()
                    if not resume.wait(5):
                        raise AssertionError("maintenance was not resumed")

                def reserve():
                    try:
                        if action == "sync_files":
                            other.request_worker_sync(worker)
                        else:
                            other.request_worker_restart(worker, action)
                    except WorkerBusyError:
                        pass  # Safe if revalidation sees the command reservation.
                    except BaseException as exc:
                        errors.append(exc)

                thread = threading.Thread(target=reserve, daemon=True)
                try:
                    with mock.patch.object(other, "_check_restart_host_locked", side_effect=paused_check):
                        thread.start()
                        self.assertTrue(checked.wait(5))
                        # If maintenance already owns BEGIN IMMEDIATE, prove that
                        # create cannot enter and release maintenance to commit.
                        gated = False
                        with closing(sqlite3.connect(self.db_path, timeout=0)) as probe:
                            try:
                                probe.execute("BEGIN IMMEDIATE")
                            except sqlite3.OperationalError as exc:
                                self.assertIn("locked", str(exc))
                                gated = True
                            else:
                                probe.rollback()
                        if gated:
                            resume.set()
                            thread.join(5)
                        detail = self.create(worker, request_key="race_" + action)
                        resume.set()
                        thread.join(5)
                    self.assertFalse(thread.is_alive())
                    self.assertFalse(errors, errors)
                    with self.store.lock:
                        maintenance = self.store.db.execute("SELECT sync_status FROM workers WHERE id=?",
                                                            (worker,)).fetchone()[0]
                    self.assertFalse(maintenance in ("pending", "running")
                                     and self.execution(detail)["status"] == "pending",
                                     "maintenance and command both reserved the same host after stale safety reads")
                finally:
                    resume.set()
                    thread.join(5)
                    other.close()


if __name__ == "__main__":
    unittest.main()
