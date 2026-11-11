"""Worker access integration tests using real AuthStore and DistributedStore databases."""
import copy
import json
import sqlite3
import sys
import tempfile
import threading
import time
import unittest
from contextlib import closing
from datetime import datetime
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

from auth_store import AuthStore
from distributed import (
    DistributedStore, HIGH_VRAM_GPU_POLICY, worker_access_allowed, worker_access_team,
)


class WorkerAccessStoreTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.auth = AuthStore(self.root / "auth.db")
        self.addCleanup(self.auth.close)
        password = "Test-password-123"
        self.admin = self.auth.create_user("admin", password, role="admin")["id"]
        self.alice = self.auth.create_user("alice", password)["id"]
        self.bob = self.auth.create_user("bob", password)["id"]
        self.team_a = self.auth.create_team("A", self.admin)["id"]
        self.team_b = self.auth.create_team("B", self.admin)["id"]
        self.auth.add_team_member(self.team_a, self.alice, self.admin)
        self.auth.add_team_member(self.team_b, self.bob, self.admin)
        # The project belongs to B, but Alice's submitted jobs must use A access.
        self.auth.create_project("shared-project", self.admin, team_id=self.team_b)
        self.store = DistributedStore(
            self.root / "dispatch.db", access_resolver=self.auth.job_worker_teams,
            priority_resolver=self.auth.priority_job_ids, access_guard=self.auth.lock,
        )
        self.addCleanup(self.store.close)
        self.caps = {
            "node_classes": ["TestNode", "UNETLoader"],
            "input_choices": {"UNETLoader": {"unet_name": ["model.safetensors"]}},
            "devices": [{"type": "cuda", "name": "RTX 5090", "vram_total": 32 * 1024 ** 3}],
            "supports_code_restart": True,
        }

    def worker(self, name="worker", team=None, caps=None, expires_at=None):
        worker_id = self.store.register_worker(name, caps or self.caps)["worker_id"]
        self.store.heartbeat(worker_id, comfy_online=True)
        if team is not None:
            self.store.set_worker_access(worker_id, team, expires_at)
        return worker_id

    def enqueue(self, job_id="job", submitter=None, *, acl=True, required=None, **payload):
        if acl:
            self.auth.register_job(job_id, "shared-project", submitter or self.alice)
        self.store.enqueue(job_id, {"capability": "test", **payload}, required)

    def finish(self, worker_id, claim):
        self.assertIsNotNone(claim)
        self.assertTrue(self.store.finish(
            claim["job_id"], worker_id, claim["lease_token"], "done", capacity_released=True,
        ))

    def worker_row(self, worker_id):
        with self.store.lock:
            return dict(self.store.db.execute("SELECT * FROM workers WHERE id=?", (worker_id,)).fetchone())

    def test_ordinary_team_isolation_uses_submitter_not_project(self):
        own = self.worker("A", self.team_a)
        foreign = self.worker("B", self.team_b)
        self.enqueue()
        self.assertEqual(self.auth.job_worker_teams(["job"]), {"job": {self.team_a}})
        self.assertIsNone(self.store.acquire(foreign))
        self.assertEqual(self.store.acquire(own)["job_id"], "job")

    def test_multiple_team_memberships_allow_both(self):
        self.auth.add_team_member(self.team_b, self.alice, self.admin)
        self.assertEqual(self.auth.user_worker_teams(self.alice), {self.team_a, self.team_b})
        for index, team in enumerate((self.team_a, self.team_b)):
            with self.subTest(team=team):
                worker = self.worker(str(index), team)
                job = f"job-{index}"
                self.enqueue(job, target_worker_id=worker)
                claim = self.store.acquire(worker)
                self.assertEqual(claim["job_id"], job)
                self.finish(worker, claim)

    def test_membership_add_and_remove_affect_already_queued_jobs(self):
        worker = self.worker(team=self.team_b)
        self.enqueue("added")
        self.assertIsNone(self.store.acquire(worker))
        self.auth.add_team_member(self.team_b, self.alice, self.admin)
        claim = self.store.acquire(worker)
        self.assertEqual(claim["job_id"], "added")
        self.finish(worker, claim)
        self.enqueue("removed")
        self.auth.remove_team_member(self.team_b, self.alice, self.admin)
        self.assertIsNone(self.store.acquire(worker))
        self.assertEqual(self.store.dispatch_status("removed"), "queued")
        public = self.worker("public")
        self.assertEqual(self.store.acquire(public)["job_id"], "removed")

    def test_payload_cannot_forge_submitter_team_or_admin(self):
        foreign = self.worker(team=self.team_b)
        self.enqueue(user_id=self.admin, team_id=self.team_b, team_ids=[self.team_b],
                     role="admin", user={"id": self.admin, "role": "admin"})
        self.assertIsNone(self.store.acquire(foreign))
        self.store.request_cancel("job")
        self.enqueue("legacy", acl=False, user_id=self.admin, team_id=self.team_b, role="admin")
        self.assertEqual(self.auth.job_worker_teams(["legacy", "absent"]),
                         {"legacy": set(), "absent": set()})
        self.assertIsNone(self.store.acquire(foreign))
        public = self.worker("public")
        self.assertEqual(self.store.acquire(public)["job_id"], "legacy")

    def test_missing_resolver_and_missing_mapping_fail_closed_for_reserved(self):
        worker = self.worker(team=self.team_a)
        self.enqueue()
        for resolver in (None, lambda ids: {}):
            with self.subTest(resolver=resolver):
                self.store.access_resolver = resolver
                self.assertIsNone(self.store.acquire(worker))
        self.store.set_worker_access(worker, None)
        self.assertEqual(self.store.acquire(worker)["job_id"], "job")

    def test_user_and_job_resolution_checks_enabled_approval_active_teams(self):
        self.enqueue()
        self.enqueue("admin-job", self.admin)
        self.assertIsNone(self.auth.user_worker_teams(self.admin))
        self.assertIsNone(self.auth.job_worker_teams(["admin-job"])["admin-job"])
        self.assertEqual(self.auth.user_worker_teams("missing"), set())
        self.auth.set_user(self.alice, enabled=False)
        self.assertEqual(self.auth.user_worker_teams(self.alice), set())
        self.assertEqual(self.auth.job_worker_teams(["job"])["job"], set())
        self.auth.set_user(self.alice, enabled=True)
        for status in ("pending", "rejected"):
            with self.auth._tx():
                self.auth.db.execute("UPDATE users SET approval_status=? WHERE id=?", (status, self.alice))
            self.assertEqual(self.auth.user_worker_teams(self.alice), set())
            self.assertEqual(self.auth.job_worker_teams(["job"])["job"], set())
        with self.auth._tx():
            self.auth.db.execute("UPDATE users SET approval_status='approved' WHERE id=?", (self.alice,))
            self.auth.db.execute("UPDATE teams SET state='deleted' WHERE id=?", (self.team_a,))
        self.assertEqual(self.auth.user_worker_teams(self.alice), set())
        self.assertEqual(self.auth.job_worker_teams(["job"])["job"], set())
        # Disabled/unapproved admins must not retain unrestricted access either.
        with self.auth._tx():
            self.auth.db.execute("UPDATE users SET enabled=0 WHERE id=?", (self.admin,))
        self.assertEqual(self.auth.user_worker_teams(self.admin), set())
        self.assertEqual(self.auth.job_worker_teams(["admin-job"])["admin-job"], set())

    def test_job_resolution_batches_without_changing_missing_acl_policy(self):
        job_ids = [f"batch-{index}" for index in range(1005)]
        with self.auth._tx():
            self.auth.db.executemany("INSERT INTO job_acl(job_id,project_id,user_id) VALUES(?,?,?)",
                                     [(job, "shared-project", self.alice) for job in job_ids])
        result = self.auth.job_worker_teams(iter(job_ids + ["missing"]))
        self.assertEqual(len(result), 1006)
        self.assertTrue(all(result[job] == {self.team_a} for job in job_ids))
        self.assertEqual(result["missing"], set())
        self.assertEqual(self.auth.job_worker_teams([]), {})

    def test_expiry_projects_public_in_every_list_without_erasing_history(self):
        expiry = time.time() + 60
        worker = self.worker(team=self.team_b, expires_at=expiry)
        self.enqueue()
        for options in ({}, {"summary": True}, {"telemetry_only": True}):
            item = self.store.list_workers(**options)[0]
            self.assertEqual((item["access_team_id"], item["access_expires_at"]), (self.team_b, expiry))
        self.assertIsNone(self.store.acquire(worker))
        with mock.patch("distributed.time.time", return_value=expiry):
            self.store.heartbeat(worker, comfy_online=True)
            for options in ({}, {"summary": True}, {"telemetry_only": True}):
                item = self.store.list_workers(**options)[0]
                self.assertIsNone(item["access_team_id"])
                self.assertIsNone(item["access_expires_at"])
            self.assertEqual(self.store.inaccessible_worker_ids(set()), set())
            self.assertEqual(self.store.acquire(worker)["job_id"], "job")
        stored = self.worker_row(worker)
        self.assertEqual((stored["access_team_id"], stored["access_expires_at"]), (self.team_b, expiry))

    def test_same_name_all_registrations_updated_and_new_registration_inherits(self):
        old = self.worker(" GPU-Straße ")
        latest = self.worker("gpu-STRASSE")
        expiry = time.time() + 3600
        self.assertTrue(self.store.set_worker_access(old, self.team_a, expiry))
        for worker in (old, latest):
            self.assertEqual(self.worker_row(worker)["access_team_id"], self.team_a)
        self.store.retire_worker(latest)
        new = self.worker(" gpu-strasse ")
        self.assertEqual(self.worker_row(new)["access_team_id"], self.team_a)
        self.assertEqual(self.worker_row(new)["access_expires_at"], expiry)
        self.assertEqual(self.store.inaccessible_worker_ids({self.team_b}), {old, latest, new})
        self.assertEqual(self.store.inaccessible_worker_ids({self.team_a}), set())
        self.assertEqual(self.store.inaccessible_worker_ids(None), set())
        self.assertTrue(self.store.set_worker_access(old, None, expiry))
        for worker in (old, latest, new):
            row = self.worker_row(worker)
            self.assertIsNone(row["access_team_id"])
            self.assertIsNone(row["access_expires_at"])
        self.assertEqual(self.store.inaccessible_worker_ids(set()), set())
        self.assertFalse(self.store.set_worker_access("missing", self.team_a))

    def test_reregistration_inherits_latest_configuration_not_payload(self):
        old = self.worker("worker")
        latest = self.worker("WORKER")
        # Simulate inconsistent historical rows; the newest registration is authoritative.
        with self.store.lock, self.store.db:
            self.store.db.execute("UPDATE workers SET access_team_id=? WHERE id=?", (self.team_b, latest))
        forged = {**self.caps, "access_team_id": None, "access_expires_at": 0}
        new = self.worker(" worker ", caps=forged)
        self.assertEqual(self.worker_row(old)["access_team_id"], self.team_b)
        self.assertEqual(self.worker_row(new)["access_team_id"], self.team_b)
        self.enqueue()
        self.assertIsNone(self.store.acquire(new))

    def test_access_configuration_covers_same_host_aliases_not_hostname_or_ip(self):
        caps = {**self.caps, "hardware": {"host_id": "stable-host"},
                "hostname": "reported-name", "ip": "10.0.0.1"}
        first = self.worker("first", caps=caps)
        second = self.worker("second", caps={**caps, "hostname": "changed", "ip": "10.0.0.2"})
        other = self.worker("other", caps={**caps, "hardware": {"host_id": "different-host"}})
        unknown = self.worker("unknown", caps={**self.caps, "hostname": "reported-name", "ip": "10.0.0.1"})
        expiry = time.time() + 60
        self.store.set_worker_access(first, self.team_a, expiry)
        for worker in (first, second):
            row = self.worker_row(worker)
            self.assertEqual((row["access_team_id"], row["access_expires_at"]), (self.team_a, expiry))
        for worker in (other, unknown):
            self.assertIsNone(self.worker_row(worker)["access_team_id"])
        self.assertEqual(self.store.inaccessible_worker_ids({self.team_b}), {first, second})
        self.enqueue(submitter=self.bob, target_worker_id=second)
        self.assertIsNone(self.store.acquire(second))
        self.store.set_worker_access(second, self.team_b)
        self.assertEqual(self.worker_row(first)["access_team_id"], self.team_b)
        self.assertEqual(self.store.acquire(second)["job_id"], "job")

    def test_new_host_alias_inherits_even_after_source_registration_retired(self):
        caps = {**self.caps, "hardware": {"host_id": "stable-host"}}
        first = self.worker("old-name", self.team_a, caps=caps)
        self.store.retire_worker(first)
        second = self.worker("new-name", caps={**self.caps, "telemetry": {"host_id": "stable-host"}})
        self.assertEqual(self.worker_row(second)["access_team_id"], self.team_a)
        third = self.worker("parallel-name", caps={**self.caps, "host_id": "stable-host"})
        self.assertEqual(self.worker_row(third)["access_team_id"], self.team_a)
        self.store.set_worker_access(second, None)
        for worker in (first, second, third):
            self.assertIsNone(self.worker_row(worker)["access_team_id"])
        fourth = self.worker("after-public-reset", caps=caps)
        self.assertIsNone(self.worker_row(fourth)["access_team_id"])

    def test_name_and_stable_host_access_links_are_transitive(self):
        first = self.worker("shared-name", caps={**self.caps, "host_id": "host-a"})
        old_alias = self.worker("old-host-alias", caps={**self.caps, "host_id": "host-a"})
        moved = self.worker(" SHARED-NAME ", caps={**self.caps, "host_id": "host-b"})
        new_alias = self.worker("new-host-alias", caps={**self.caps, "host_id": "host-b"})
        self.store.set_worker_access(old_alias, self.team_b)
        for worker in (first, old_alias, moved, new_alias):
            self.assertEqual(self.worker_row(worker)["access_team_id"], self.team_b)
        self.store.set_worker_access(new_alias, None)
        for worker in (first, old_alias, moved, new_alias):
            self.assertIsNone(self.worker_row(worker)["access_team_id"])

    def test_first_host_report_in_heartbeat_reconciles_access_without_interrupting_job(self):
        first = self.worker("known-host", self.team_a, caps={**self.caps, "host_id": "host-a"})
        alias = self.worker("initially-unknown-host")
        self.enqueue("already-assigned", self.bob, target_worker_id=alias)
        claim = self.store.acquire(alias)
        before = tuple(self.store.db.execute("SELECT * FROM capacity_attempts WHERE id=?",
                                            (claim["attempt_id"],)).fetchone())
        heartbeat = self.store.heartbeat(alias, comfy_online=True, current_job_id="already-assigned",
                                         telemetry={"host_id": "host-a"})
        self.assertEqual(heartbeat["commands"], [])
        self.assertEqual(self.worker_row(alias)["access_team_id"], self.team_a)
        self.assertEqual(self.worker_row(first)["access_team_id"], self.team_a)
        self.assertTrue(self.store.validate_lease("already-assigned", alias, claim["lease_token"]))
        after = tuple(self.store.db.execute("SELECT * FROM capacity_attempts WHERE id=?",
                                           (claim["attempt_id"],)).fetchone())
        self.assertEqual(after, before)
        self.assertTrue(self.store.mark_running("already-assigned", alias, claim["lease_token"]))
        self.finish(alias, claim)
        self.enqueue("next", self.bob, target_worker_id=alias)
        self.assertIsNone(self.store.acquire(alias))

    def test_existing_public_host_alias_is_reconciled_when_store_reopens(self):
        first = self.worker("reserved", self.team_a, caps={**self.caps, "host_id": "host-a"})
        alias = self.worker("legacy-public-alias", caps={**self.caps, "host_id": "host-a"})
        # Simulate the old name-only implementation's inconsistent host metadata.
        with self.store.lock, self.store.db:
            self.store.db.execute("UPDATE workers SET access_team_id=NULL WHERE id=?", (alias,))
        reopened = DistributedStore(self.root / "dispatch.db", access_resolver=self.auth.job_worker_teams,
                                    access_guard=self.auth.lock)
        try:
            self.assertEqual(reopened.inaccessible_worker_ids({self.team_b}), {first, alias})
            self.enqueue(submitter=self.bob, target_worker_id=alias)
            self.assertIsNone(reopened.acquire(alias))
        finally:
            reopened.close()

    def test_registering_newer_public_alias_does_not_erase_legacy_host_reservation(self):
        first = self.worker("reserved", self.team_a, caps={**self.caps, "host_id": "host-a"})
        alias = self.worker("legacy-public", caps={**self.caps, "host_id": "host-a"})
        with self.store.lock, self.store.db:
            self.store.db.execute("UPDATE workers SET access_team_id=NULL WHERE id=?", (alias,))
        newest = self.worker("third-name", caps={**self.caps, "host_id": "host-a"})
        for worker in (first, alias, newest):
            self.assertEqual(self.worker_row(worker)["access_team_id"], self.team_a)

    def test_expired_host_reservation_inherits_timestamp_but_is_public(self):
        expiry = time.time() - 1
        first = self.worker("expired", self.team_a, caps={**self.caps, "host_id": "host-a"}, expires_at=expiry)
        alias = self.worker("new-alias", caps={**self.caps, "host_id": "host-a"})
        for worker in (first, alias):
            row = self.worker_row(worker)
            self.assertEqual((row["access_team_id"], row["access_expires_at"]), (self.team_a, expiry))
        self.assertEqual(self.store.inaccessible_worker_ids(set()), set())
        self.enqueue(submitter=self.bob, target_worker_id=alias)
        self.assertEqual(self.store.acquire(alias)["job_id"], "job")

    def test_configuring_same_host_alias_keeps_running_attempt_and_history_unchanged(self):
        caps = {**self.caps, "host_id": "host-a"}
        worker = self.worker("running", caps=caps)
        alias = self.worker("parallel", caps=caps)
        self.enqueue(target_worker_id=worker)
        claim = self.store.acquire(worker)
        self.assertTrue(self.store.mark_running("job", worker, claim["lease_token"]))
        before = tuple(self.store.db.execute("SELECT * FROM capacity_attempts WHERE id=?",
                                            (claim["attempt_id"],)).fetchone())
        self.store.set_worker_access(alias, self.team_b)
        self.assertEqual(self.store.dispatch_status("job"), "running")
        self.assertTrue(self.store.validate_lease("job", worker, claim["lease_token"]))
        self.assertEqual(tuple(self.store.db.execute("SELECT * FROM capacity_attempts WHERE id=?",
                                                    (claim["attempt_id"],)).fetchone()), before)
        self.finish(worker, claim)

    def test_heartbeat_and_maintenance_do_not_override_management_fields(self):
        expiry = time.time() + 60
        worker = self.worker(team=self.team_a, expires_at=expiry)
        request = self.store.request_worker_sync(worker)
        self.store.heartbeat(worker, comfy_online=True,
                             capabilities={**self.caps, "access_team_id": self.team_b},
                             telemetry={"access_team_id": None, "access_expires_at": 0},
                             maintenance={"request_id": request["request_id"], "status": "done"})
        row = self.worker_row(worker)
        self.assertEqual((row["access_team_id"], row["access_expires_at"]), (self.team_a, expiry))

    def test_access_change_and_membership_removal_do_not_interrupt_assigned_running(self):
        worker = self.worker(team=self.team_a)
        self.enqueue()
        claim = self.store.acquire(worker)
        self.assertEqual(claim["job_id"], "job")
        self.auth.remove_team_member(self.team_a, self.alice, self.admin)
        self.store.set_worker_access(worker, self.team_b)
        self.assertEqual(self.store.dispatch_status("job"), "assigned")
        self.assertTrue(self.store.validate_lease("job", worker, claim["lease_token"]))
        self.assertTrue(self.store.mark_running("job", worker, claim["lease_token"]))
        heartbeat = self.store.heartbeat(worker, comfy_online=True, current_job_id="job")
        self.assertEqual(heartbeat["commands"], [])
        self.assertEqual(self.store.dispatch_status("job"), "running")
        self.finish(worker, claim)
        self.enqueue("next")
        self.assertIsNone(self.store.acquire(worker))

    def test_invalid_access_values_are_rejected(self):
        worker = self.worker()
        for team in ("", " ", False, 42):
            with self.subTest(team=team), self.assertRaises(ValueError):
                self.store.set_worker_access(worker, team)
        for expiry in (float("nan"), float("inf"), True, "tomorrow"):
            with self.subTest(expiry=expiry), self.assertRaises(ValueError):
                self.store.set_worker_access(worker, self.team_a, expiry)

    def test_access_helpers(self):
        worker = {"access_team_id": "team", "access_expires_at": 20}
        self.assertEqual(worker_access_team(worker, 19), "team")
        self.assertIsNone(worker_access_team(worker, 20))
        self.assertFalse(worker_access_allowed(worker, set(), 19))
        self.assertTrue(worker_access_allowed(worker, {"team"}, 19))
        self.assertTrue(worker_access_allowed(worker, None, 19))
        self.assertTrue(worker_access_allowed(worker, set(), 20))
        self.assertTrue(worker_access_allowed({}, set(), 19))

    def test_daily_window_boundaries_repeat_and_absolute_cutoff(self):
        window = {"start": "09:00", "end": "18:00", "time_zone": "Asia/Shanghai"}
        worker = {"access_team_id": self.team_a, "access_expires_at": None,
                  "access_daily_window": window}
        for instant, restricted in (
            ("2026-11-11T08:59:59+08:00", False),
            ("2026-11-11T09:00:00+08:00", True),
            ("2026-11-11T17:59:59+08:00", True),
            ("2026-11-11T18:00:00+08:00", False),
            ("2026-11-11T23:00:00+08:00", False),
            ("2026-11-12T08:59:59+08:00", False),
            ("2026-11-12T09:00:00+08:00", True),
            # The same actual instant expressed in UTC; server TZ is irrelevant.
            ("2026-11-12T01:00:00+00:00", True),
        ):
            now = datetime.fromisoformat(instant).timestamp()
            with self.subTest(instant=instant):
                self.assertEqual(worker_access_team(worker, now), self.team_a if restricted else None)
                self.assertEqual(worker_access_allowed(worker, {self.team_b}, now), not restricted)
        cutoff = datetime.fromisoformat("2026-11-12T10:00:00+08:00").timestamp()
        worker["access_expires_at"] = cutoff
        self.assertEqual(worker_access_team(worker, cutoff - 1), self.team_a)
        for now in (cutoff, cutoff + 86400):
            self.assertIsNone(worker_access_team(worker, now))

    def test_overnight_and_dst_use_local_wall_clock_at_actual_instant(self):
        worker = {"access_team_id": self.team_a, "access_daily_window": {
            "start": "22:00", "end": "06:00", "time_zone": "Asia/Shanghai"}}
        for instant, restricted in (
            ("2026-11-11T21:59:59+08:00", False),
            ("2026-11-11T22:00:00+08:00", True),
            ("2026-11-12T00:00:00+08:00", True),
            ("2026-11-12T05:59:59+08:00", True),
            ("2026-11-12T06:00:00+08:00", False),
            ("2026-11-12T22:00:00+08:00", True),
        ):
            with self.subTest(instant=instant):
                self.assertEqual(worker_access_team(worker, datetime.fromisoformat(instant).timestamp()),
                                 self.team_a if restricted else None)
        worker["access_daily_window"] = {
            "start": "01:15", "end": "01:45", "time_zone": "America/New_York"}
        for instant, restricted in (
            ("2026-11-01T05:30:00+00:00", True),   # First 01:30 (EDT).
            ("2026-11-01T06:30:00+00:00", True),   # Repeated 01:30 (EST).
            ("2026-11-01T06:45:00+00:00", False),
            ("2026-07-01T05:30:00+00:00", True),
            ("2026-12-01T05:30:00+00:00", False),  # Winter is 00:30, not 01:30.
        ):
            with self.subTest(instant=instant):
                self.assertEqual(worker_access_team(worker, datetime.fromisoformat(instant).timestamp()),
                                 self.team_a if restricted else None)
        worker["access_daily_window"] = {
            "start": "02:15", "end": "03:15", "time_zone": "America/New_York"}
        for instant, restricted in (("2026-03-08T06:59:59+00:00", False),
                                    ("2026-03-08T07:00:00+00:00", True),
                                    ("2026-03-08T07:15:00+00:00", False)):
            self.assertEqual(worker_access_team(worker, datetime.fromisoformat(instant).timestamp()),
                             self.team_a if restricted else None)

    def test_daily_schedule_all_list_dtos_redaction_and_outsider_dispatch(self):
        worker = self.worker("scheduled")
        window = {"start": "09:00", "end": "18:00", "time_zone": "Asia/Shanghai"}
        self.store.set_worker_access(worker, self.team_a, daily_window=window)
        persisted = self.worker_row(worker)
        for instant, restricted in (
            ("2026-11-11T08:59:59+08:00", False),
            ("2026-11-11T09:00:00+08:00", True),
            ("2026-11-11T18:00:00+08:00", False),
            ("2026-11-12T09:00:00+08:00", True),
        ):
            with self.subTest(instant=instant), mock.patch(
                    "distributed.time.time", return_value=datetime.fromisoformat(instant).timestamp()):
                self.store.heartbeat(worker, comfy_online=True)
                for options in ({}, {"summary": True}, {"telemetry_only": True}, {"worker_id": worker}):
                    item = self.store.list_workers(**options)[0]
                    self.assertEqual(item["access_daily_window"], window)
                    self.assertNotIn("access_daily_window_json", item)
                    self.assertEqual(item["access_team_id"], self.team_a if restricted else None)
                    self.assertEqual(worker_access_allowed(item, {self.team_b}), not restricted)
                    config = self.store.list_workers(access_config=True, **options)[0]
                    self.assertEqual(config["access_team_id"], self.team_a)
                    self.assertEqual(config["access_daily_window"], window)
                    self.assertEqual(worker_access_allowed(config, {self.team_b}), not restricted)
                self.assertEqual(self.store.inaccessible_worker_ids({self.team_b}),
                                 {worker} if restricted else set())
                job = "target-" + instant
                self.enqueue(job, self.bob, target_worker_id=worker)
                claim = self.store.acquire(worker)
                if restricted:
                    self.assertIsNone(claim)
                    self.assertEqual(self.store.dispatch_status(job), "queued")
                    self.store.request_cancel(job)
                else:
                    self.assertEqual(claim["job_id"], job)
                    self.finish(worker, claim)
        after = self.worker_row(worker)
        for key in ("access_team_id", "access_expires_at", "access_daily_window_json"):
            self.assertEqual(after[key], persisted[key])

    def test_daily_schedule_inherits_outside_window_and_clears_across_host_aliases(self):
        window = {"start": "09:00", "end": "18:00", "time_zone": "Asia/Shanghai"}
        caps = {**self.caps, "host_id": "scheduled-host"}
        first = self.worker("original", caps=caps)
        alias = self.worker("alias", caps=caps)
        outside = datetime.fromisoformat("2026-11-11T20:00:00+08:00").timestamp()
        expiry = outside + 3 * 86400
        self.store.set_worker_access(first, self.team_a, expiry, window)
        with mock.patch("distributed.time.time", return_value=outside):
            same_name = self.worker(" ORIGINAL ")
            self.store.retire_worker(alias)
            new_host_alias = self.worker("new-alias", caps=caps)
            for worker in (first, alias, same_name, new_host_alias):
                row = self.worker_row(worker)
                self.assertEqual(row["access_team_id"], self.team_a)
                self.assertEqual(json.loads(row["access_daily_window_json"]), window)
                self.assertEqual(row["access_expires_at"], expiry)
            self.assertEqual(self.store.inaccessible_worker_ids(set()), set())
            reopened = DistributedStore(self.root / "dispatch.db")
            try:
                inside = outside + 13 * 3600
                with mock.patch("distributed.time.time", return_value=inside):
                    self.assertEqual(reopened.inaccessible_worker_ids(set()),
                                     {first, alias, same_name, new_host_alias})
            finally:
                reopened.close()
        self.store.set_worker_access(new_host_alias, None, daily_window=window)
        for worker in (first, alias, same_name, new_host_alias):
            self.assertIsNone(self.worker_row(worker)["access_daily_window_json"])
        latest = self.worker("latest", caps=caps)
        self.assertIsNone(self.worker_row(latest)["access_daily_window_json"])

    def test_corrupt_persisted_schedules_fail_closed_in_lists_redaction_and_dispatch(self):
        worker = self.worker(team=self.team_a)
        self.enqueue(submitter=self.bob, target_worker_id=worker)
        bad_windows = ("{broken", "null", "[]", "{}", '""',
                       json.dumps({"start": "99:00", "end": "18:00", "time_zone": "UTC"}),
                       json.dumps({"start": "09:00", "end": "18:00", "time_zone": "Missing/Zone"}))
        for raw in bad_windows:
            with self.subTest(raw=raw), self.store.lock, self.store.db:
                self.store.db.execute("UPDATE workers SET access_daily_window_json=? WHERE id=?", (raw, worker))
                for options in ({}, {"summary": True}, {"telemetry_only": True}):
                    item = self.store.list_workers(**options)[0]
                    self.assertEqual(item["access_team_id"], self.team_a)
                    self.assertFalse(worker_access_allowed(item, {self.team_b}))
                self.assertEqual(self.store.inaccessible_worker_ids({self.team_b}), {worker})
                self.assertIsNone(self.store.acquire(worker))
        self.store.db.execute("UPDATE workers SET access_expires_at=0 WHERE id=?", (worker,))
        self.assertEqual(self.store.inaccessible_worker_ids(set()), set())
        self.assertEqual(self.store.acquire(worker)["job_id"], "job")

    def test_daily_boundary_does_not_interrupt_running_job_or_rewrite_history(self):
        worker = self.worker()
        window = {"start": "09:00", "end": "18:00", "time_zone": "Asia/Shanghai"}
        start = datetime.fromisoformat("2026-11-11T09:00:00+08:00").timestamp()
        with mock.patch("distributed.time.time", return_value=start - 1):
            self.store.heartbeat(worker, comfy_online=True)
            self.store.set_worker_access(worker, self.team_a, daily_window=window)
            self.enqueue(submitter=self.bob, target_worker_id=worker)
            claim = self.store.acquire(worker)
            self.assertTrue(self.store.mark_running("job", worker, claim["lease_token"]))
            before = tuple(self.store.db.execute("SELECT * FROM capacity_attempts WHERE id=?",
                                                (claim["attempt_id"],)).fetchone())
        with mock.patch("distributed.time.time", return_value=start):
            result = self.store.heartbeat(worker, comfy_online=True, current_job_id="job")
            self.assertEqual(result["commands"], [])
            self.assertEqual(self.store.dispatch_status("job"), "running")
            self.assertTrue(self.store.validate_lease("job", worker, claim["lease_token"]))
            self.assertEqual(tuple(self.store.db.execute("SELECT * FROM capacity_attempts WHERE id=?",
                                                        (claim["attempt_id"],)).fetchone()), before)
            self.finish(worker, claim)
            self.enqueue("next", submitter=self.bob, target_worker_id=worker)
            self.assertIsNone(self.store.acquire(worker))

    def test_slim_dispatch_preference_uses_daily_window_not_stored_team_only(self):
        public = self.worker("public")
        scheduled = self.worker("scheduled")
        window = {"start": "09:00", "end": "18:00", "time_zone": "Asia/Shanghai"}
        self.store.set_worker_access(scheduled, self.team_a, daily_window=window)
        start = datetime.fromisoformat("2026-11-11T09:00:00+08:00").timestamp()
        for index, instant in enumerate((start - 1, start, start + 9 * 3600, start + 86400)):
            with mock.patch("distributed.time.time", return_value=instant):
                for worker in (public, scheduled):
                    self.store.heartbeat(worker, comfy_online=True)
                self.enqueue(str(index))
                restricted = instant in (start, start + 86400)
                if restricted:
                    self.assertIsNone(self.store.acquire(public))
                    self.finish(scheduled, self.store.acquire(scheduled))
                else:
                    self.finish(public, self.store.acquire(public))
        # A larger foreign GPU must not block outsiders during its private window,
        # but should participate normally when it becomes public.
        large = copy.deepcopy(self.caps)
        large["devices"][0]["vram_total"] = 96 * 1024 ** 3
        self.store.heartbeat(scheduled, comfy_online=True, capabilities=large)
        for index, instant in enumerate((start, start + 9 * 3600)):
            with mock.patch("distributed.time.time", return_value=instant):
                for worker in (public, scheduled):
                    self.store.heartbeat(worker, comfy_online=True)
                self.enqueue(f"large-{index}", self.bob, gpu_policy=HIGH_VRAM_GPU_POLICY)
                if instant == start:
                    self.assertIsNone(self.store.acquire(scheduled))
                    self.finish(public, self.store.acquire(public))
                else:
                    self.assertIsNone(self.store.acquire(public))
                    self.finish(scheduled, self.store.acquire(scheduled))

    def test_invalid_daily_windows_are_rejected_by_store(self):
        worker = self.worker()
        window = {"start": "09:00", "end": "18:00", "time_zone": "Asia/Shanghai"}
        for invalid in (True, [], {}, "09:00-18:00", {"start": "09:00", "end": "18:00"},
                        {**window, "extra": True}, {**window, "end": "09:00"},
                        *({**window, "start": value} for value in
                          (None, 9, "9:00", "24:00", "09:60", " 09:00", "09:00:00", "０９:00")),
                        *({**window, "time_zone": value} for value in
                          (None, 8, "", "Not/AZone", "/etc/localtime", "../UTC", "+08:00"))):
            with self.subTest(window=invalid), self.assertRaises(ValueError):
                self.store.set_worker_access(worker, self.team_a, daily_window=invalid)
        self.assertIsNone(self.worker_row(worker)["access_daily_window_json"])

    def test_idle_compatible_dedicated_worker_precedes_public(self):
        public = self.worker("public")
        dedicated = self.worker("dedicated", self.team_a)
        self.enqueue()
        self.assertIsNone(self.store.acquire(public))
        claim = self.store.acquire(dedicated)
        self.assertEqual(claim["job_id"], "job")
        # An assigned/busy dedicated worker must not reserve other queued work.
        self.enqueue("second")
        self.assertEqual(self.store.acquire(public)["job_id"], "second")
        self.finish(dedicated, claim)

    def test_unavailable_or_incompatible_dedicated_workers_never_block_public(self):
        public = self.worker("public")
        graph = {"1": {"class_type": "UNETLoader", "inputs": {"unet_name": "model.safetensors"}}}
        cases = ("busy", "offline", "disabled", "comfy_offline", "pending", "running", "error",
                 "current_job", "retired", "nodes", "models", "vram", "host_maintenance")
        for case in cases:
            with self.subTest(case=case):
                caps = copy.deepcopy(self.caps)
                if case == "nodes":
                    caps["node_classes"] = []
                elif case == "models":
                    caps["input_choices"] = {}
                elif case == "vram":
                    caps["devices"][0]["vram_total"] = 12 * 1024 ** 3
                elif case == "host_maintenance":
                    caps["host_id"] = "shared-host"
                dedicated = self.worker(case, self.team_a, caps=caps)
                changes = {
                    "busy": ("busy", 1), "offline": ("last_seen", time.time() - 3600),
                    "disabled": ("enabled", 0), "comfy_offline": ("comfy_online", 0),
                    "pending": ("sync_status", "pending"), "running": ("sync_status", "running"),
                    "error": ("sync_status", "error"), "current_job": ("current_job_id", "local-job"),
                    "retired": ("retired", 1),
                }
                with self.store.lock, self.store.db:
                    if case in changes:
                        column, value = changes[case]
                        self.store.db.execute(f"UPDATE workers SET {column}=? WHERE id=?", (value, dedicated))
                if case == "host_maintenance":
                    sibling = self.worker("sibling", caps={**self.caps, "host_id": "shared-host"})
                    with self.store.lock, self.store.db:
                        self.store.db.execute("UPDATE workers SET sync_status='pending' WHERE id=?", (sibling,))
                self.enqueue(case, required=["UNETLoader"], graph=graph, gpu_policy=HIGH_VRAM_GPU_POLICY)
                claim = self.store.acquire(public)
                self.assertIsNotNone(claim)
                self.assertEqual(claim["job_id"], case)
                self.finish(public, claim)
                self.store.set_worker_enabled(dedicated, False)

    def test_unauthorized_high_vram_worker_cannot_starve_public_work(self):
        public = self.worker("public")
        caps = copy.deepcopy(self.caps)
        caps["devices"][0]["vram_total"] = 96 * 1024 ** 3
        foreign = self.worker("foreign-large", self.team_b, caps=caps)
        self.enqueue(gpu_policy=HIGH_VRAM_GPU_POLICY)
        self.assertIsNone(self.store.acquire(foreign))
        self.assertEqual(self.store.acquire(public)["job_id"], "job")

    def test_dedicated_tier_beats_public_vram_and_keeps_own_larger_gpu_preference(self):
        small = self.worker("dedicated-small", self.team_a)
        caps = copy.deepcopy(self.caps)
        caps["devices"][0]["vram_total"] = 96 * 1024 ** 3
        public = self.worker("public-large", caps=caps)
        self.enqueue(gpu_policy=HIGH_VRAM_GPU_POLICY)
        self.assertIsNone(self.store.acquire(public))
        self.finish(small, self.store.acquire(small))
        caps["devices"][0]["vram_total"] = 48 * 1024 ** 3
        large = self.worker("dedicated-large", self.team_a, caps=caps)
        self.enqueue("second", gpu_policy=HIGH_VRAM_GPU_POLICY)
        self.assertIsNone(self.store.acquire(small))
        self.assertEqual(self.store.acquire(large)["job_id"], "second")

    def test_old_idle_registrations_cannot_block_public_when_latest_is_unavailable(self):
        public = self.worker("public")
        large_caps = copy.deepcopy(self.caps)
        large_caps["devices"][0]["vram_total"] = 96 * 1024 ** 3
        for team in (None, self.team_a):
            for state in ("busy", "offline", "disabled", "incompatible"):
                name = f"duplicate-{team}-{state}"
                with self.subTest(team=team, latest=state):
                    old = self.worker(f" {name.upper()} ", team, caps=large_caps)
                    latest_caps = copy.deepcopy(large_caps)
                    if state == "incompatible":
                        latest_caps["node_classes"] = []
                    latest = self.worker(name, caps=latest_caps)
                    if state == "busy":
                        self.store.heartbeat(latest, comfy_online=True, busy=True)
                    elif state == "offline":
                        with self.store.lock, self.store.db:
                            self.store.db.execute("UPDATE workers SET last_seen=? WHERE id=?",
                                                  (time.time() - 3600, latest))
                    elif state == "disabled":
                        self.store.set_worker_enabled(latest, False)
                    self.enqueue(name, required=["TestNode"], gpu_policy=HIGH_VRAM_GPU_POLICY)
                    claim = self.store.acquire(public)
                    self.assertIsNotNone(claim)
                    self.assertEqual(claim["job_id"], name)
                    self.finish(public, claim)
                    self.store.set_worker_enabled(old, False)
                    self.store.set_worker_enabled(latest, False)

    def test_admin_can_use_any_team_without_preferring_all_reserved_workers(self):
        public = self.worker("public")
        dedicated = self.worker("reserved", self.team_b)
        self.enqueue("admin-public", self.admin)
        self.finish(public, self.store.acquire(public))
        self.enqueue("admin-reserved", self.admin)
        self.assertEqual(self.store.acquire(dedicated)["job_id"], "admin-reserved")

    def test_target_binding_bypasses_tier_and_vram_preference_but_not_access(self):
        public = self.worker("target")
        caps = copy.deepcopy(self.caps)
        caps["devices"][0]["vram_total"] = 96 * 1024 ** 3
        dedicated = self.worker("dedicated", self.team_a, caps=caps)
        foreign = self.worker("foreign", self.team_b)
        self.enqueue("target-public", target_worker_id=public, gpu_policy=HIGH_VRAM_GPU_POLICY)
        self.assertIsNone(self.store.acquire(dedicated))
        claim = self.store.acquire(public)
        self.assertEqual(claim["job_id"], "target-public")
        self.enqueue("busy-target", target_worker_id=public)
        self.assertIsNone(self.store.acquire(dedicated))
        self.finish(public, claim)
        self.finish(public, self.store.acquire(public))
        self.enqueue("target-foreign", target_worker_id=foreign,
                     capacity_spec={"expected": {"kind": "video"}})
        self.assertIsNone(self.store.acquire(foreign))
        self.assertIsNone(self.store.acquire(public))
        self.assertIsNone(self.store.acquire(dedicated))

    def test_priority_fifo_and_affinity_are_preserved_after_access_filtering(self):
        # Alice leads a non-admin team, while the admin's jobs have trusted priority.
        self.auth.remove_team_member(self.team_a, self.alice, self.admin)
        self.auth.set_user(self.alice, team_leader=True)
        own_team = self.auth.create_team("Alice team", self.alice)["id"]
        worker = self.worker(team=own_team)
        self.auth.set_dispatch_priority(True)
        with self.store.lock, self.store.db:
            self.store.db.execute("UPDATE workers SET last_capability_id='cached' WHERE id=?", (worker,))
        self.enqueue("normal", capability="cached")
        self.enqueue("forbidden-priority", self.bob)
        self.enqueue("priority-first", self.admin, capability="other")
        self.enqueue("priority-cached", self.admin, capability="cached")
        self.assertEqual(self.auth.priority_job_ids(["normal", "priority-first"]), {"priority-first"})
        claim = self.store.acquire(worker)
        self.assertEqual(claim["job_id"], "priority-first")
        self.finish(worker, claim)
        claim = self.store.acquire(worker)
        self.assertEqual(claim["job_id"], "priority-cached")
        self.finish(worker, claim)
        self.assertEqual(self.store.acquire(worker)["job_id"], "normal")
        self.assertEqual(self.store.dispatch_status("forbidden-priority"), "queued")

    def test_disabled_priority_restores_cache_affinity(self):
        worker = self.worker(team=self.team_a)
        with self.store.lock, self.store.db:
            self.store.db.execute("UPDATE workers SET last_capability_id='cached' WHERE id=?", (worker,))
        self.enqueue("fifo", capability="other")
        self.enqueue("cached", capability="cached")
        self.assertEqual(self.store.acquire(worker)["job_id"], "cached")

    def test_resolvers_run_without_dispatch_lock(self):
        worker = self.worker(team=self.team_a)
        self.enqueue()
        def unlocked(callback):
            def resolve(ids):
                acquired = threading.Event()
                def probe():
                    with self.store.lock:
                        acquired.set()
                thread = threading.Thread(target=probe, daemon=True)
                thread.start()
                try:
                    self.assertTrue(acquired.wait(2), "resolver called under dispatch lock")
                finally:
                    thread.join(timeout=2)
                return callback(ids)
            return resolve
        self.store.priority_resolver = unlocked(self.auth.priority_job_ids)
        self.store.access_resolver = unlocked(self.auth.job_worker_teams)
        self.assertEqual(self.store.acquire(worker)["job_id"], "job")

    def test_membership_revocation_cannot_commit_between_scope_and_assignment_commit(self):
        worker = self.worker(team=self.team_a)
        self.enqueue()
        snapshot_ready = threading.Event()
        resume_snapshot = threading.Event()
        assignment_written = threading.Event()
        allow_commit = threading.Event()
        revocation_attempted = threading.Event()
        revocation_committed = threading.Event()
        errors, results = [], {}
        original_assigned = self.store.capacity.assigned

        def resolver(ids):
            scopes = self.auth.job_worker_teams(ids)
            snapshot_ready.set()
            if not resume_snapshot.wait(5):
                raise AssertionError("snapshot was not resumed")
            return scopes

        def assigned(*args, **kwargs):
            attempt = original_assigned(*args, **kwargs)
            assignment_written.set()
            if not allow_commit.wait(5):
                raise AssertionError("assignment was not allowed to commit")
            return attempt

        def acquire():
            try:
                results["claim"] = self.store.acquire(worker)
            except BaseException as exc:
                errors.append(exc)

        def revoke():
            try:
                revocation_attempted.set()
                self.auth.remove_team_member(self.team_a, self.alice, self.admin)
                results["status_at_revocation_commit"] = self.store.dispatch_status("job")
                revocation_committed.set()
            except BaseException as exc:
                errors.append(exc)

        self.store.access_resolver = resolver
        acquire_thread = threading.Thread(target=acquire, daemon=True)
        revoke_thread = threading.Thread(target=revoke, daemon=True)
        with mock.patch.object(self.store.capacity, "assigned", side_effect=assigned):
            try:
                acquire_thread.start()
                self.assertTrue(snapshot_ready.wait(5))
                revoke_thread.start()
                self.assertTrue(revocation_attempted.wait(5))
                self.assertFalse(revocation_committed.wait(0.1))
                self.assertEqual(self.store.dispatch_status("job"), "queued")
                resume_snapshot.set()
                self.assertTrue(assignment_written.wait(5))
                # The dispatch UPDATE exists but is not committed yet. Auth must
                # remain guarded through COMMIT, not merely through the UPDATE.
                with closing(sqlite3.connect(self.root / "dispatch.db")) as db:
                    self.assertEqual(db.execute("SELECT status FROM dispatch_jobs WHERE job_id='job'").fetchone()[0],
                                     "queued")
                self.assertFalse(revocation_committed.wait(0.1))
            finally:
                resume_snapshot.set()
                allow_commit.set()
                acquire_thread.join(5)
                if revoke_thread.ident is not None:
                    revoke_thread.join(5)
        self.assertFalse(acquire_thread.is_alive())
        self.assertFalse(revoke_thread.is_alive())
        self.assertEqual(errors, [])
        self.assertTrue(revocation_committed.is_set())
        self.assertEqual(results["claim"]["job_id"], "job")
        self.assertEqual(results["status_at_revocation_commit"], "assigned")
        self.assertEqual(self.auth.user_worker_teams(self.alice), set())
        self.finish(worker, results["claim"])
        self.store.access_resolver = self.auth.job_worker_teams
        self.enqueue("after-revocation")
        self.assertIsNone(self.store.acquire(worker))

    def test_revocation_committed_first_blocks_assignment_without_deadlock(self):
        worker = self.worker(team=self.team_a)
        self.enqueue()
        entered_body = threading.Event()
        attempted = threading.Event()
        errors, results = [], {}
        original = self.store._acquire_with_access

        def body(worker_id):
            entered_body.set()
            return original(worker_id)

        def acquire():
            try:
                attempted.set()
                results["claim"] = self.store.acquire(worker)
            except BaseException as exc:
                errors.append(exc)

        thread = threading.Thread(target=acquire, daemon=True)
        with mock.patch.object(self.store, "_acquire_with_access", side_effect=body):
            try:
                with self.auth.lock:
                    thread.start()
                    self.assertTrue(attempted.wait(5))
                    self.assertFalse(entered_body.wait(0.1))
                    # Auth -> dispatch also remains usable by an auth-side writer
                    # while acquire waits. A reversed lock order would deadlock.
                    held = self.store.lock.acquire(timeout=2)
                    try:
                        self.assertTrue(held, "acquire held dispatch lock while waiting for auth")
                        self.auth.remove_team_member(self.team_a, self.alice, self.admin)
                        self.assertEqual(self.store.dispatch_status("job"), "queued")
                    finally:
                        if held:
                            self.store.lock.release()
            finally:
                thread.join(5)
        self.assertFalse(thread.is_alive())
        self.assertEqual(errors, [])
        self.assertTrue(entered_body.is_set())
        self.assertIsNone(results["claim"])
        self.assertEqual(self.store.dispatch_status("job"), "queued")

    def test_access_guard_property_and_exception_release(self):
        worker = self.worker(team=self.team_a)
        self.enqueue()
        self.store.access_guard = self.auth.lock
        self.assertIs(self.store.access_guard, self.auth.lock)
        def failing(ids):
            self.auth.job_worker_teams(ids)  # RLock callback reentry is required.
            raise RuntimeError("resolver failed")
        self.store.access_resolver = failing
        with self.assertRaisesRegex(RuntimeError, "resolver failed"):
            self.store.acquire(worker)
        released = threading.Event()
        def probe():
            with self.auth.lock:
                with self.store.lock:
                    released.set()
        thread = threading.Thread(target=probe, daemon=True)
        thread.start()
        thread.join(5)
        self.assertFalse(thread.is_alive())
        self.assertTrue(released.is_set())
        self.store.access_resolver = self.auth.job_worker_teams
        self.assertEqual(self.store.acquire(worker)["job_id"], "job")

    def test_job_worker_ids_reads_dispatch_assigned_and_history_without_payload(self):
        worker = self.worker(team=self.team_a)
        self.enqueue("assigned")
        self.enqueue("queued")
        claim = self.store.acquire(worker)
        self.assertEqual(claim["job_id"], "assigned")
        self.assertEqual(self.store.job_worker_ids(iter(["assigned", "queued", "missing"])), {"assigned": worker})
        self.finish(worker, claim)
        self.assertEqual(self.store.job_worker_ids(["assigned"]), {"assigned": worker})
        with self.store.lock, self.store.db:
            self.store.db.execute("UPDATE dispatch_jobs SET payload_json='not-json' WHERE job_id='assigned'")
        self.assertEqual(self.store.job_worker_ids(["assigned"]), {"assigned": worker})
        self.assertEqual(self.store.job_worker_ids([]), {})

    def test_job_worker_ids_batches_over_sqlite_variable_limits(self):
        worker = self.worker()
        job_ids = [f"binding-{index}" for index in range(1005)]
        now = time.time()
        with self.store.lock, self.store.db:
            self.store.db.executemany(
                "INSERT INTO dispatch_jobs(job_id,payload_json,status,worker_id,created_at,updated_at) "
                "VALUES(?,'not-json','done',?,?,?)", [(job, worker, now, now) for job in job_ids],
            )
        self.assertEqual(self.store.job_worker_ids(iter(job_ids + ["missing"])),
                         {job: worker for job in job_ids})

    def test_queue_changes_during_access_resolution_retry_without_assignment(self):
        worker = self.worker(team=self.team_a)
        self.enqueue()
        def resolve(ids):
            teams = self.auth.job_worker_teams(ids)
            self.enqueue("new-job")
            return teams
        self.store.access_resolver = resolve
        self.assertIsNone(self.store.acquire(worker))
        self.assertEqual(self.store.dispatch_status("job"), "queued")
        self.store.access_resolver = self.auth.job_worker_teams
        self.assertEqual(self.store.acquire(worker)["job_id"], "job")

    def test_same_id_payload_or_required_nodes_change_invalidates_snapshot(self):
        worker = self.worker(team=self.team_a)
        for column, value in (("payload_json", json.dumps({"capability": "changed"})),
                              ("required_nodes_json", json.dumps(["TestNode"]))):
            with self.subTest(column=column):
                job = f"changed-{column}"
                self.enqueue(job)
                def resolve(ids):
                    teams = self.auth.job_worker_teams(ids)
                    with self.store.lock, self.store.db:
                        self.store.db.execute(f"UPDATE dispatch_jobs SET {column}=? WHERE job_id=?", (value, job))
                    return teams
                self.store.access_resolver = resolve
                self.assertIsNone(self.store.acquire(worker))
                self.store.access_resolver = self.auth.job_worker_teams
                claim = self.store.acquire(worker)
                self.assertEqual(claim["job_id"], job)
                self.finish(worker, claim)

    def test_access_configuration_is_rechecked_after_resolving_memberships(self):
        worker = self.worker(team=self.team_a)
        self.enqueue()
        def resolve(ids):
            teams = self.auth.job_worker_teams(ids)
            self.store.set_worker_access(worker, self.team_b)
            return teams
        self.store.access_resolver = resolve
        self.assertIsNone(self.store.acquire(worker))
        self.assertEqual(self.store.dispatch_status("job"), "queued")
        self.assertEqual(self.worker_row(worker)["access_team_id"], self.team_b)


class WorkerAccessMigrationTest(unittest.TestCase):
    def test_historical_worker_schema_upgrades_and_preserves_old_registration(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "old.db"
            with closing(sqlite3.connect(path)) as db, db:
                db.executescript("""
                    CREATE TABLE workers (
                        id TEXT PRIMARY KEY, name TEXT NOT NULL, token_hash TEXT NOT NULL,
                        enabled INTEGER NOT NULL DEFAULT 1, last_seen REAL NOT NULL,
                        comfy_online INTEGER NOT NULL DEFAULT 0, busy INTEGER NOT NULL DEFAULT 0,
                        current_job_id TEXT, capabilities_json TEXT NOT NULL DEFAULT '{}',
                        created_at REAL NOT NULL, updated_at REAL NOT NULL
                    );
                """)
                now = time.time()
                db.execute("INSERT INTO workers(id,name,token_hash,last_seen,created_at,updated_at) "
                           "VALUES('old','GPU','hash',?,?,?)", (now, now, now))
            store = DistributedStore(path)
            try:
                row = store.list_workers()[0]
                self.assertEqual(row["id"], "old")
                self.assertIsNone(row["access_team_id"])
                self.assertIsNone(row["access_expires_at"])
                self.assertIsNone(row["access_daily_window"])
                expiry = now + 3600
                self.assertTrue(store.set_worker_access("old", "team", expiry))
            finally:
                store.close()
            reopened = DistributedStore(path)
            try:
                row = reopened.list_workers(summary=True)[0]
                self.assertEqual((row["access_team_id"], row["access_expires_at"]), ("team", expiry))
                new = reopened.register_worker(" gpu ")["worker_id"]
                self.assertEqual(reopened.inaccessible_worker_ids(set()), {"old", new})
            finally:
                reopened.close()

    def test_historical_auth_schema_still_supports_trusted_worker_resolution(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "auth-v1.db"
            with closing(sqlite3.connect(path)) as db, db:
                db.executescript((ROOT / "server" / "migrations" / "001_auth.sql").read_text(encoding="utf-8"))
            auth = AuthStore(path)
            try:
                admin = auth.create_user("admin", "Test-password-123", role="admin")["id"]
                auth.create_project("project", admin)
                auth.register_job("job", "project", admin)
                self.assertIsNone(auth.user_worker_teams(admin))
                self.assertEqual(auth.job_worker_teams(["job", "legacy"]), {"job": None, "legacy": set()})
                self.assertEqual(auth.db.execute("PRAGMA user_version").fetchone()[0], 11)
            finally:
                auth.close()


if __name__ == "__main__":
    unittest.main()
