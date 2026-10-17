# -*- coding: utf-8 -*-
"""温度链路回归：只使用临时 SQLite 和模拟采集，不运行 GPU。"""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "worker"))

from agent import WorkerAgent
from distributed import (
    DistributedStore, TEMPERATURE_CLEANUP_LIMIT, TEMPERATURE_MAX_BATCH,
    TEMPERATURE_MAX_POINTS, TEMPERATURE_RETENTION_SECONDS,
)


class TemperatureProbeTest(unittest.TestCase):
    @mock.patch("agent.subprocess.run")
    def test_six_columns_and_missing_temperature_preserve_other_metrics(self, run):
        run.return_value = mock.Mock(returncode=0, stdout=(
            '0, "NVIDIA, test", 73, 12288, 24564, 68.5\n'
            '1, GPU1, 0, 100, 200, [Not Supported]\n'
            '2, GPU2, 20, 100, 200\n'
        ))
        gpus = WorkerAgent._nvidia_gpus()
        self.assertEqual([gpu["temperature_c"] for gpu in gpus], [68.5, None, None])
        self.assertEqual(gpus[0]["name"], "NVIDIA, test")
        self.assertEqual(gpus[0]["utilization_percent"], 73)
        self.assertEqual(gpus[0]["memory_used_bytes"], 12288 * 1024 ** 2)
        self.assertEqual(gpus[0]["memory_total_bytes"], 24564 * 1024 ** 2)
        self.assertEqual(run.call_count, 1)
        self.assertIn("temperature.gpu", run.call_args.args[0][1])
        self.assertEqual(run.call_args.kwargs["timeout"], 5)

    @mock.patch("agent.subprocess.run")
    def test_invalid_temperatures_never_discard_utilization_and_vram(self, run):
        values = ["N/A", "", "nan", "inf", "-inf", "true", "-1", "151", "1e999"]
        run.return_value = mock.Mock(returncode=0, stdout="\n".join(
            f"{index}, GPU, 42, 100, 200, {value}" for index, value in enumerate(values)
        ))
        gpus = WorkerAgent._nvidia_gpus()
        self.assertEqual(len(gpus), len(values))
        for gpu in gpus:
            self.assertIsNone(gpu["temperature_c"])
            self.assertEqual(gpu["utilization_percent"], 42)
            self.assertEqual(gpu["memory_used_bytes"], 100 * 1024 ** 2)

    @mock.patch("agent.subprocess.run")
    def test_old_driver_retries_original_five_columns_once(self, run):
        run.side_effect = [mock.Mock(returncode=1, stdout=""), mock.Mock(
            returncode=0, stdout="0, GPU, 10, 100, 200\n")]
        self.assertEqual(WorkerAgent._nvidia_gpus()[0]["temperature_c"], None)
        self.assertEqual(run.call_count, 2)
        self.assertIn("temperature.gpu", run.call_args_list[0].args[0][1])
        self.assertEqual(run.call_args_list[1].args[0][1],
                         "--query-gpu=index,name,utilization.gpu,memory.used,memory.total")

    @mock.patch("agent.subprocess.run")
    def test_command_failures_are_bounded(self, run):
        run.return_value = mock.Mock(returncode=1, stdout="")
        self.assertEqual(WorkerAgent._nvidia_gpus(), [])
        self.assertEqual(run.call_count, 2)
        for error in (FileNotFoundError(), subprocess.TimeoutExpired("nvidia-smi", 5)):
            run.reset_mock()
            run.side_effect = error
            self.assertEqual(WorkerAgent._nvidia_gpus(), [])
            self.assertEqual(run.call_count, 1)


class TemperatureHistoryTest(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.path = Path(directory.name) / "control.db"
        self.store = DistributedStore(self.path)
        self.addCleanup(lambda: self.store.close())
        self.worker = self.store.register_worker("GPU-01", {"node_classes": ["Sampler"]})
        self.worker_id = self.worker["worker_id"]
        self.now = 2_000_000.0

    def heartbeat(self, at, value=60, *, now=None, worker_id=None, index=0, gpus=None):
        telemetry = {"collected_at": at, "gpus": gpus if gpus is not None else [
            {"index": index, "temperature_c": value},
        ]}
        with mock.patch("distributed.time.time", return_value=self.now if now is None else now):
            return self.store.heartbeat(worker_id or self.worker_id, telemetry=telemetry,
                                        comfy_online=True)

    def history(self, **kwargs):
        return self.store.temperature_history(self.worker_id, now=self.now, **kwargs)

    def stored(self):
        return [dict(row) for row in self.store.db.execute(
            "SELECT * FROM worker_temperature_samples ORDER BY worker_id, gpu_index, collected_at")]

    def test_contract_empty_history_and_unknown_worker(self):
        result = self.history()
        self.assertEqual(result, {
            "worker_id": self.worker_id, "gpu_index": 0, "minutes": 30,
            "from": self.now - 1800, "to": self.now, "gap_seconds": 60,
            "points": [], "server_time": self.now,
        })
        with self.assertRaisesRegex(KeyError, "未知 Worker"):
            self.store.temperature_history("absent", now=self.now)
        with mock.patch("distributed.time.time", return_value=self.now):
            self.assertEqual(self.store.temperature_history(self.worker_id), result)
        self.assertNotIn(self.worker["worker_token"], json.dumps(result))
        self.assertNotIn("token_hash", json.dumps(result))

    def test_repeat_out_of_order_and_dense_samples_do_not_create_new_history(self):
        self.heartbeat(self.now - 30, 61)
        self.heartbeat(self.now - 30, 99, now=self.now + 10)
        self.heartbeat(self.now - 50, 62)
        self.heartbeat(self.now - 20.01, 63)
        self.heartbeat(self.now - 20, 64)
        self.assertEqual(self.history()["points"], [
            {"at": self.now - 30, "temperature_c": 61},
            {"at": self.now - 20, "temperature_c": 64},
        ])
        # 重启后去重依然以持久化采集时间为准。
        self.store.close()
        self.store = DistributedStore(self.path)
        self.heartbeat(self.now - 20, 100)
        self.assertEqual(len(self.stored()), 2)

    def test_null_and_invalid_temperature_samples_remain_explicit_gaps(self):
        values = [None, True, False, float("nan"), float("inf"), -float("inf"),
                  "65", [], {}, -1, 151, 10 ** 1000, 0, 150, 68.5]
        for index, value in enumerate(values):
            at = self.now - (len(values) - index) * 10
            self.heartbeat(at, value, now=at)
        points = self.history()["points"]
        self.assertEqual(len(points), len(values))
        self.assertEqual([point["temperature_c"] for point in points],
                         [None] * 12 + [0, 150, 68.5])
        json.dumps(points, allow_nan=False)

    def test_invalid_collection_times_are_ignored_not_replaced_by_receive_time(self):
        for at in (None, True, False, "2000000", [], {}, float("nan"), float("inf"),
                   -float("inf"), 10 ** 1000, self.now - 120.01, self.now + 5.01):
            with self.subTest(at=at):
                self.heartbeat(at)
                self.assertEqual(self.stored(), [])
        self.heartbeat(self.now - 120)
        self.heartbeat(self.now + 5, 70)
        self.assertEqual([row["collected_at"] for row in self.stored()],
                         [self.now - 120, self.now + 5])
        self.assertFalse(any(point["at"] > self.now for point in self.history()["points"]))
        later = self.store.temperature_history(self.worker_id, now=self.now + 5)
        self.assertEqual(later["points"][-1], {"at": self.now + 5, "temperature_c": 70})

    def test_worker_gpu_isolation_and_index_validation(self):
        other = self.store.register_worker("GPU-02")["worker_id"]
        self.heartbeat(self.now, 61, gpus=[
            {"index": 0, "temperature_c": 61}, {"index": 1, "temperature_c": 71},
            {"index": 255, "temperature_c": 81},
        ])
        self.heartbeat(self.now, 91, worker_id=other)
        self.assertEqual(self.history()["points"][0]["temperature_c"], 61)
        self.assertEqual(self.history(gpu_index=1)["points"][0]["temperature_c"], 71)
        self.assertEqual(self.history(gpu_index=255)["points"][0]["temperature_c"], 81)
        self.assertEqual(self.history(gpu_index=2)["points"], [])
        self.assertEqual(self.store.temperature_history(other, now=self.now)["points"][0]["temperature_c"], 91)
        before = len(self.stored())
        for index in (True, False, -1, 256, "0", 0.0, None, float("nan"), float("inf"), 10 ** 1000):
            self.heartbeat(self.now + 10, index=index, now=self.now + 10)
            with self.assertRaises(ValueError):
                self.history(gpu_index=index)
        self.assertEqual(len(self.stored()), before)

    def test_duplicate_indices_and_gpu_batch_limit(self):
        self.heartbeat(self.now, gpus=[
            {"index": 0, "temperature_c": None}, {"index": 0, "temperature_c": 99},
            *[{"index": index, "temperature_c": 60} for index in range(1, 100)],
        ])
        self.assertEqual(len(self.stored()), TEMPERATURE_MAX_BATCH - 1)
        self.assertEqual(self.history()["points"], [{"at": self.now, "temperature_c": None}])
        for gpus in ({}, "invalid", [None, [], "invalid", {}, {"index": False}]):
            with mock.patch("distributed.time.time", return_value=self.now):
                self.store.heartbeat(self.worker_id, telemetry={"collected_at": self.now, "gpus": gpus})
        self.assertEqual(len(self.stored()), TEMPERATURE_MAX_BATCH - 1)

    def test_range_boundaries_all_supported_windows_and_parameter_validation(self):
        for minutes in (30, 120, 1440):
            start = self.now - minutes * 60
            for at in (start - 10, start, self.now, self.now + 10):
                self.heartbeat(at, now=at)
            result = self.history(minutes=minutes)
            self.assertEqual(result["from"], start)
            self.assertEqual(result["points"][0], {"at": start, "temperature_c": 60})
            self.assertEqual(result["points"][-1], {"at": self.now, "temperature_c": 60})
            self.assertTrue(all(start <= point["at"] <= self.now for point in result["points"]))
            with self.store.db:
                self.store.db.execute("DELETE FROM worker_temperature_samples")
        for minutes in (0, -1, 1441, True, 30.0, "30", None):
            with self.assertRaises(ValueError):
                self.history(minutes=minutes)
        for now in (True, -1, "now", float("nan"), float("inf"), 10 ** 1000):
            with self.assertRaises(ValueError):
                self.store.temperature_history(self.worker_id, now=now)

    def test_gap_markers_no_averaging_or_fabricated_continuity(self):
        for offset, value in ((-200, 60), (-140, 70), (-130, None), (-10, 80)):
            self.heartbeat(self.now + offset, value, now=self.now + offset)
        self.assertEqual(self.history()["points"], [
            {"at": self.now - 200, "temperature_c": 60},
            {"at": self.now - 140, "temperature_c": 70},
            {"at": self.now - 130, "temperature_c": None},
            {"at": self.now - 70, "temperature_c": None},
            {"at": self.now - 10, "temperature_c": 80},
        ])
        later = self.store.temperature_history(self.worker_id, now=self.now + 51)
        self.assertEqual(later["points"][-1], {"at": self.now + 50, "temperature_c": None})

    def test_retention_cleanup_is_indexed_and_bounded(self):
        cutoff = self.now - TEMPERATURE_RETENTION_SECONDS
        with self.store.db:
            self.store.db.executemany(
                "INSERT INTO worker_temperature_samples VALUES (?, 0, ?, 60)",
                [(self.worker_id, cutoff - 10 * index) for index in range(1, TEMPERATURE_CLEANUP_LIMIT + 3)],
            )
            self.store.db.execute("INSERT INTO worker_temperature_samples VALUES (?, 0, ?, NULL)",
                                  (self.worker_id, cutoff))
        self.heartbeat(self.now)
        expired = self.store.db.execute(
            "SELECT COUNT(*) FROM worker_temperature_samples WHERE collected_at < ?", (cutoff,),
        ).fetchone()[0]
        self.assertEqual(expired, 2)
        self.heartbeat(self.now)
        self.assertEqual(len(self.stored()), 2)
        self.assertEqual(self.stored()[0]["collected_at"], cutoff)
        self.assertEqual(len(self.history(minutes=1440)["points"]), 1)
        plan = self.store.db.execute(
            "EXPLAIN QUERY PLAN SELECT rowid FROM worker_temperature_samples "
            "WHERE collected_at < ? ORDER BY collected_at LIMIT ?", (cutoff, TEMPERATURE_CLEANUP_LIMIT),
        ).fetchall()
        self.assertIn("idx_worker_temperature_time", str([tuple(row) for row in plan]))

    def test_day_history_is_bounded_and_preserves_null_even_at_point_cap(self):
        start = self.now - 24 * 3600
        with self.store.db:
            self.store.db.executemany(
                "INSERT INTO worker_temperature_samples VALUES (?, 0, ?, ?)",
                [(self.worker_id, start + index * 10, None if index == 4000 else 60)
                 for index in range(TEMPERATURE_MAX_POINTS)],
            )
        result = self.history(minutes=1440)
        self.assertEqual(len(result["points"]), TEMPERATURE_MAX_POINTS)
        self.assertEqual(result["points"][0]["at"], start)
        self.assertEqual(result["points"][-1]["at"], self.now)
        self.assertIsNone(result["points"][4000]["temperature_c"])
        self.heartbeat(self.now + 1, 100, now=self.now + 1)
        self.assertEqual(len(self.stored()), TEMPERATURE_MAX_POINTS)

    def test_old_worker_capability_telemetry_and_no_snapshot_backfill(self):
        caps = {"node_classes": ["Sampler"], "telemetry": {
            "collected_at": self.now, "gpus": [{"index": 0, "temperature_c": 62}],
        }}
        with mock.patch("distributed.time.time", return_value=self.now):
            self.store.heartbeat(self.worker_id, capabilities=caps, comfy_online=True)
            self.store.heartbeat(self.worker_id, comfy_online=True)
        self.assertEqual(self.history()["points"], [{"at": self.now, "temperature_c": 62}])
        with self.store.db:
            self.store.db.execute("DELETE FROM worker_temperature_samples")
        self.assertEqual(self.history()["points"], [])
        with mock.patch("distributed.time.time", return_value=self.now):
            self.store.heartbeat(self.worker_id, comfy_online=True)
        self.assertEqual(self.history()["points"], [])
        self.heartbeat(self.now + 10, now=self.now + 10, gpus=[{"index": 0}])
        self.assertIsNone(self.stored()[0]["temperature_c"])
        self.assertEqual(self.store.list_workers()[0]["capabilities"]["node_classes"], ["Sampler"])

    def test_history_storage_does_not_modify_capacity_snapshot_or_dispatch(self):
        telemetry = {"collected_at": self.now, "gpus": [{
            "index": 0, "temperature_c": None, "utilization_percent": 42, "memory_used_bytes": 123,
        }]}
        with mock.patch("distributed.time.time", return_value=self.now), \
                mock.patch.object(self.store.capacity, "observe_worker") as observe:
            self.store.heartbeat(self.worker_id, telemetry=telemetry,
                                 comfy_online=True, capacity_released=True)
        snapshot, received_at = observe.call_args.args
        self.assertEqual(json.loads(snapshot["capabilities_json"])["telemetry"], telemetry)
        self.assertTrue(observe.call_args.kwargs["released"])
        self.assertEqual(received_at, self.now)
        self.assertNotIn("token_hash", snapshot)
        self.store.enqueue("job", {"graph": {}}, ["Sampler"])
        with mock.patch("distributed.time.time", return_value=self.now):
            assignment = self.store.acquire(self.worker_id)
        self.assertEqual(assignment["job_id"], "job")

    def test_registration_and_missing_timestamp_never_create_history(self):
        caps = {"telemetry": {"collected_at": self.now,
                              "gpus": [{"index": 0, "temperature_c": 66}]}}
        other = self.store.register_worker("GPU-registered", caps)["worker_id"]
        self.assertEqual(self.store.temperature_history(other, now=self.now)["points"], [])
        with mock.patch("distributed.time.time", return_value=self.now):
            for telemetry in (None, True, [], "invalid", {}, {
                    "gpus": [{"index": 0, "temperature_c": 66}]}):
                self.store.heartbeat(other, telemetry=telemetry)
        self.assertEqual(self.store.temperature_history(other, now=self.now)["points"], [])

    def test_temperature_and_existing_heartbeat_share_transaction_without_partial_writes(self):
        with mock.patch.object(self.store.capacity, "observe_worker", side_effect=RuntimeError("回滚测试")):
            with self.assertRaisesRegex(RuntimeError, "回滚测试"):
                self.heartbeat(self.now)
        self.assertEqual(self.stored(), [])
        self.assertNotIn("telemetry", self.store.list_workers()[0]["capabilities"])
        self.heartbeat(self.now)
        self.assertEqual(len(self.stored()), 1)

    def test_existing_database_adds_only_temperature_table_without_changing_statistics(self):
        self.store.enqueue("preserved", {"graph": {}, "capability": "test"})
        before = {name: [tuple(row) for row in self.store.db.execute(f'SELECT * FROM "{name}"')]
                  for name, in self.store.db.execute(
                      "SELECT name FROM sqlite_master WHERE type = 'table' AND name != 'worker_temperature_samples'")}
        with self.store.db:
            self.store.db.execute("DROP TABLE worker_temperature_samples")
        self.store.close()
        self.store = DistributedStore(self.path)
        for name, rows in before.items():
            self.assertEqual([tuple(row) for row in self.store.db.execute(f'SELECT * FROM "{name}"')], rows)
        self.assertEqual(self.history()["points"], [])
        self.assertEqual(self.store.dispatch_status("preserved"), "queued")
        self.assertTrue(self.store.authenticate(self.worker_id, self.worker["worker_token"]))
        self.assertIn("idx_worker_temperature_time", [row[1] for row in self.store.db.execute(
            "PRAGMA index_list(worker_temperature_samples)")])


if __name__ == "__main__":
    unittest.main()
