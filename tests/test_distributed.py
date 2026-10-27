import asyncio
import copy
import hashlib
import json
import os
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock

import aiohttp

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "worker"))

from distributed import (
    DistributedStore, HIGH_VRAM_GPU_POLICY, WorkerBusyError,
    BF16_TWO_PASS_CAPABILITY, BF16_HIGH_VRAM_CAPABILITIES, HIGH_VRAM_CAPABILITIES,
    can_run_capability, is_pro_6000_worker,
    capability_model_inventory, worker_capability_comparisons,
)
from agent import (
    AgentError, JobFailed, WorkerAgent, acquire_worker_mutex, close_worker_mutex,
    restart_in_progress, worker_instance_status, worker_mutex_name,
)
import restart_node


def worker_mode_ids():
    modes = set()
    for path in (ROOT / "manifests").glob("*.json"):
        cap = json.loads(path.read_text(encoding="utf-8"))
        if (isinstance(cap, dict) and cap.get("id") and cap.get("graph")
                and cap.get("execution") not in {"browser", "if_studio"}):
            modes.add(cap["id"])
    return sorted(modes)


class Pro6000CapabilityTest(unittest.TestCase):
    def test_bf16_high_vram_allowlist_is_exact_and_uses_larger_gpu_dispatch(self):
        self.assertIsInstance(BF16_HIGH_VRAM_CAPABILITIES, frozenset)
        self.assertEqual(BF16_HIGH_VRAM_CAPABILITIES, frozenset({
            BF16_TWO_PASS_CAPABILITY, "minimax_h3_fusion_v2_bf16",
        }))
        self.assertTrue(BF16_HIGH_VRAM_CAPABILITIES <= HIGH_VRAM_CAPABILITIES)

    def test_all_worker_modes_primary_device_matrix(self):
        def gpu(name, gib=96, kind="cuda"):
            return {"type": kind, "name": name, "vram_total": gib * 1024 ** 3}

        cases = [
            ([gpu("NVIDIA RTX PRO 6000 Blackwell Workstation Edition")], True, True),
            ([gpu("RTX PRO 6000")], True, True),
            ([gpu("cuda:0 NVIDIA RTX PRO 6000 Blackwell : cudaMallocAsync")], True, True),
            ([gpu("nvidia rtx pro 6000 blackwell Server Edition")], True, True),
            ([gpu("RTX PRO 6000", 80)], True, False),
            ([gpu("RTX PRO 6000", 48)], True, False),
            ([{"type": "cuda", "name": "RTX PRO 6000"}], True, False),
            ([gpu("RTX A6000", 48)], False, False),
            ([gpu("Quadro RTX 6000", 24)], False, False),
            ([gpu("RTX 6000 Ada Generation", 48)], False, False),
            ([gpu("NVIDIA H100", 96)], False, True),
            ([gpu("Other GPU", 96)], False, True),
            ([gpu("", 96)], False, True),
            ([gpu(None, 96)], False, True),
            ([gpu("RTX PRO 60000")], False, True),
            ([gpu("RTX PRO 6000", kind="cpu")], False, False),
            ([gpu("RTX A6000", 48), gpu("RTX PRO 6000")], False, False),
            ([gpu("RTX PRO 6000"), gpu("RTX A6000", 48)], True, True),
            ([], False, False), (None, False, False),
        ]
        for devices, reserved, bf16_allowed in cases:
            with self.subTest(devices=devices):
                self.assertEqual(is_pro_6000_worker(devices), reserved)
                for cid in BF16_HIGH_VRAM_CAPABILITIES:
                    with self.subTest(capability=cid):
                        self.assertEqual(can_run_capability(cid, devices), bf16_allowed)
                for cid in worker_mode_ids() + ["unknown", "text", None]:
                    if cid in BF16_HIGH_VRAM_CAPABILITIES:
                        continue
                    with self.subTest(capability=cid):
                        expected = not reserved
                        if cid == "minimax_h3_ref_2pass":
                            primary = devices[0] if devices else {}
                            expected = (expected and primary.get("type") == "cuda"
                                        and primary.get("vram_total", 0) >= 32_000_000_000)
                        self.assertEqual(can_run_capability(
                            cid, devices, duration_seconds=1), expected)
                # 旧 H3 短时长或其他任务的 32GB policy 都不能放宽专用限制。
                if reserved:
                    self.assertFalse(can_run_capability(
                        "minimax_h3_ref_2pass", devices, HIGH_VRAM_GPU_POLICY, 1))
                    self.assertFalse(can_run_capability("zimage_t2i", devices, HIGH_VRAM_GPU_POLICY))


class ModelDispatchTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.store = DistributedStore(Path(self.temp.name) / "control.db")
        self.addCleanup(self.store.close)
        self.graph = json.loads((ROOT / "graphs/minimax_h3_fusion_v2.api.json").read_text(encoding="utf-8"))
        self.choices = {
            "UNETLoader": {"unet_name": [self.graph["127"]["inputs"]["unet_name"]]},
            "LoraLoaderModelOnly": {"lora_name": [self.graph["145"]["inputs"]["lora_name"]]},
            "CLIPLoader": {"clip_name": [self.graph["232"]["inputs"]["clip_name"]]},
            "VAELoader": {"vae_name": [self.graph[n]["inputs"]["vae_name"] for n in ("234", "235")]},
        }
        self.caps = {
            "node_classes": sorted({n["class_type"] for n in self.graph.values()}),
            "input_choices": self.choices,
            "input_types": {n["class_type"]: {"model": "MODEL"} for n in self.graph.values()
                            if isinstance(n.get("inputs", {}).get("model"), list)},
            "devices": [{"type": "cuda", "name": "RTX 5090", "vram_total": 32 * 1024 ** 3}],
        }
        self.worker_id = self.store.register_worker("GPU-5090-01", self.caps)["worker_id"]
        self.store.heartbeat(self.worker_id, comfy_online=True)

    def enqueue(self, job_id="fusion", **payload):
        self.store.enqueue(job_id, {
            "graph": self.graph, "capability": "minimax_h3_fusion_v2", **payload,
        }, self.caps["node_classes"])

    def test_queue_snapshot_global_order_and_only_pending(self):
        self.enqueue('b', user='other')
        self.enqueue('a', user='self')
        self.enqueue('running')
        with self.store.lock:
            self.store.db.execute('UPDATE dispatch_jobs SET created_at = 1')
            self.store.db.execute("UPDATE dispatch_jobs SET status = 'running' WHERE job_id = 'running'")
            self.store.db.commit()
        self.assertEqual(self.store.queue_ahead_snapshot(), {'a': 0, 'b': 1})
        self.assertTrue(all(isinstance(n, int) for n in self.store.queue_ahead_snapshot().values()))

    def test_queue_api_copies_privacy_and_single_list_consistency(self):
        import app as host
        from types import SimpleNamespace
        jobs = {
            'private': {'id': 'private', 'created': 1, 'status': 'queued'},
            'visible': {'id': 'visible', 'created': 2, 'status': 'queued'},
            'done': {'id': 'done', 'created': 3, 'status': 'done'},
        }
        request = SimpleNamespace(app={}, match_info={'pid': 'visible'})
        store = mock.Mock()
        store.queue_ahead_snapshot.return_value = {'private': 0, 'visible': 1}
        async def permission(_request, jid):
            return 'operate' if jid != 'private' else None
        async def run():
            with mock.patch.object(host, 'CONTROLLER_MODE', True), \
                    mock.patch.object(host, 'JOBS', jobs), \
                    mock.patch.object(host, 'distributed_store', return_value=store), \
                    mock.patch.object(host, 'job_permission', side_effect=permission), \
                    mock.patch.object(host, 'job_node_names', return_value={}), \
                    mock.patch.object(host, 'job_submitter_info', new=mock.AsyncMock(return_value={})):
                listing = json.loads((await host.api_jobs(request)).text)['jobs']
                store.queue_ahead_snapshot.assert_called_once()
                single = json.loads((await host.api_job(request)).text)
                self.assertEqual(single['queue_ahead'], 1)
                self.assertEqual(single, next(j for j in listing if j['id'] == 'visible'))
                self.assertNotIn('private', [j['id'] for j in listing])
                self.assertIsNone(next(j for j in listing if j['id'] == 'done')['queue_ahead'])
                self.assertNotIn('queue_ahead', jobs['visible'])
            with mock.patch.object(host, 'CONTROLLER_MODE', False):
                self.assertIsNone(host.job_queue_snapshot({}, [jobs['visible']])['visible']['queue_ahead'])
        asyncio.run(run())

    def test_bf16_two_pass_strict_gpu_gate_in_acquire(self):
        self.enqueue(capability="minimax_h3_ref_2pass_bf16",
                     gpu_policy=HIGH_VRAM_GPU_POLICY, duration_seconds=1)
        cases = [
            ("RTX A6000", 48, False),
            ("NVIDIA RTX PRO 6000 Blackwell", 80, False),
            ("NVIDIA RTX PRO 6000 Blackwell", 96, True),
            ("NVIDIA RTX PRO 6000 Blackwell 96GB", None, False),
            ("NVIDIA RTX PRO 6000", 48, False),
            ("Quadro RTX 6000", 24, False),
            ("RTX 6000 Ada Generation", 48, False),
            ("Other GPU", 96, True),
            ("NVIDIA H100 80GB HBM3", 80, False),
            ("NVIDIA A100-SXM4-80GB", 80, False),
            ("RTX 4090", 24, False),
        ]
        from distributed import can_run_capability
        for name, gib, expected in cases:
            with self.subTest(name=name, gib=gib):
                caps = copy.deepcopy(self.caps)
                caps["devices"] = [{"type": "cuda", "name": name}]
                if gib is not None:
                    caps["devices"][0]["vram_total"] = gib * 1024 ** 3
                self.assertEqual(can_run_capability(
                    "minimax_h3_ref_2pass_bf16", caps["devices"],
                    HIGH_VRAM_GPU_POLICY, 1), expected)
                self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=caps)
                acquired = self.store.acquire(self.worker_id)
                self.assertEqual(acquired is not None, expected)
                if acquired:
                    self.store.finish(acquired["job_id"], self.worker_id,
                                      acquired["lease_token"], "done", capacity_released=True)
                    self.store.heartbeat(self.worker_id, comfy_online=True,
                                         capacity_released=True)
                    self.enqueue(job_id=name, capability="minimax_h3_ref_2pass_bf16")

    def test_bf16_two_pass_gate_cannot_bypass_models_or_primary_device(self):
        from distributed import can_run_capability
        cid = "minimax_h3_ref_2pass_bf16"
        device = {"type": "cuda", "name": "RTX PRO 6000", "vram_total": 80 * 1024 ** 3 + 1}
        self.assertTrue(can_run_capability(cid, [device]))
        self.assertFalse(can_run_capability(cid, [self.caps["devices"][0], device]))
        self.assertFalse(can_run_capability(cid, [{**device, "type": "cpu"}]))
        self.assertFalse(can_run_capability(cid, None))
        self.assertFalse(can_run_capability(cid, [{**device, "vram_total": float("inf")}]))
        self.assertTrue(can_run_capability(cid, [{**device, "vram_total": None,
                                                "torch_vram_total": 96 * 1024 ** 3}]))
        self.assertTrue(can_run_capability("minimax_h3_ref_2pass", self.caps["devices"]))
        self.assertTrue(can_run_capability("other_mode", None))
        self.enqueue(capability=cid)
        caps = copy.deepcopy(self.caps)
        caps["devices"] = [device]
        caps["input_choices"]["UNETLoader"]["unet_name"] = []
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=caps)
        self.assertIsNone(self.store.acquire(self.worker_id))

    def test_pro_reservation_applies_to_all_claims_before_affinity(self):
        caps = copy.deepcopy(self.caps)
        caps["devices"] = [{"type": "cuda", "name": "NVIDIA RTX PRO 6000 Blackwell",
                            "vram_total": 96 * 1024 ** 3}]
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=caps)
        modes = worker_mode_ids() + ["unknown", None]
        for index, cid in enumerate(modes):
            with self.subTest(capability=cid):
                with self.store.db:
                    self.store.db.execute(
                        "UPDATE workers SET last_capability_id = ?, last_model_family = ? WHERE id = ?",
                        (cid, "cached-family", self.worker_id))
                job_id = f"pro-{index}"
                self.enqueue(job_id=job_id, capability=cid, model_family="cached-family")
                acquired = self.store.acquire(self.worker_id)
                if cid in BF16_HIGH_VRAM_CAPABILITIES:
                    self.assertEqual(acquired["job_id"], job_id)
                    self.store.finish(job_id, self.worker_id, acquired["lease_token"], "done",
                                      capacity_released=True)
                else:
                    self.assertIsNone(acquired)
                    self.assertEqual(self.store.dispatch_status(job_id), "queued")
                self.store.remove_job(job_id)

    def test_pro_bf16_actual_graph_still_requires_each_exact_model(self):
        self.graph = json.loads((ROOT / "graphs/minimax_h3_ref_2pass_bf16.api.json").read_text(encoding="utf-8"))
        caps = copy.deepcopy(self.caps)
        caps["devices"] = [{"type": "cuda", "name": "RTX PRO 6000",
                            "vram_total": 96 * 1024 ** 3}]
        caps["node_classes"] = sorted({node["class_type"] for node in self.graph.values()})
        caps["input_types"] = {node["class_type"]: {"model": "MODEL"}
                               for node in self.graph.values()
                               if isinstance(node.get("inputs", {}).get("model"), list)}
        caps["input_choices"] = {}
        for node in self.graph.values():
            for key in ("unet_name", "clip_name", "vae_name", "lora_name"):
                if key in node.get("inputs", {}):
                    caps["input_choices"].setdefault(node["class_type"], {}).setdefault(key, []).append(
                        node["inputs"][key])
        self.store.enqueue("fusion", {
            "graph": self.graph, "capability": BF16_TWO_PASS_CAPABILITY,
        }, caps["node_classes"])
        for node_class, fields in caps["input_choices"].items():
            for key, names in fields.items():
                for name in names:
                    with self.subTest(model=name):
                        incomplete = copy.deepcopy(caps)
                        incomplete["input_choices"][node_class][key].remove(name)
                        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=incomplete)
                        self.assertIsNone(self.store.acquire(self.worker_id))
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=caps)
        self.assertEqual(self.store.acquire(self.worker_id)["job_id"], "fusion")

    def fusion_bf16_caps(self):
        self.graph = json.loads((ROOT / "graphs/minimax_h3_fusion_v2_bf16.api.json").read_text(encoding="utf-8"))
        caps = copy.deepcopy(self.caps)
        caps["devices"] = [{"type": "cuda", "name": "RTX PRO 6000",
                            "vram_total": 96 * 1024 ** 3}]
        caps["input_choices"]["UNETLoader"]["unet_name"] = [
            "Cobijada_H3_Hybrid_Uncensored_pruned_hybrid_BF16_pruned.safetensors",
        ]
        return caps

    def test_fusion_bf16_raw_graph_changes_only_node_127_model(self):
        original = copy.deepcopy(self.graph)
        caps = self.fusion_bf16_caps()
        original["127"]["inputs"]["unet_name"] = (
            "Cobijada_H3_Hybrid_Uncensored_pruned_hybrid_BF16_pruned.safetensors"
        )
        self.assertEqual(self.graph, original)
        self.assertEqual(capability_model_inventory(caps), {
            ("UNETLoader", "unet_name", "Cobijada_H3_Hybrid_Uncensored_pruned_hybrid_BF16_pruned.safetensors"),
            ("LoraLoaderModelOnly", "lora_name", "minimax_h3_ref2v_turbo_8step_v1.0_768p_comfyui_bf16.safetensors"),
            ("CLIPLoader", "clip_name", "qwen3vl_32b_minimax_h3_int8_convrot.safetensors"),
            ("VAELoader", "vae_name", "minimax_h3_video_vae_fp16.safetensors"),
            ("VAELoader", "vae_name", "minimax_h3_audio_vae_fp32.safetensors"),
        })

    def test_fusion_bf16_raw_graph_claim_requires_each_exact_model_and_node(self):
        caps = self.fusion_bf16_caps()
        self.enqueue(capability="minimax_h3_fusion_v2_bf16")
        for node_class, fields in caps["input_choices"].items():
            for key, names in fields.items():
                for name in names:
                    with self.subTest(missing_model=name):
                        incomplete = copy.deepcopy(caps)
                        incomplete["input_choices"][node_class][key].remove(name)
                        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=incomplete)
                        self.assertIsNone(self.store.acquire(self.worker_id))
                        self.assertEqual(self.store.dispatch_status("fusion"), "queued")
        for node_class in caps["node_classes"]:
            with self.subTest(missing_node=node_class):
                incomplete = copy.deepcopy(caps)
                incomplete["node_classes"].remove(node_class)
                self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=incomplete)
                self.assertIsNone(self.store.acquire(self.worker_id))
                self.assertEqual(self.store.dispatch_status("fusion"), "queued")
        for replacement in (
            self.choices["UNETLoader"]["unet_name"][0],
            "other/" + caps["input_choices"]["UNETLoader"]["unet_name"][0],
            caps["input_choices"]["UNETLoader"]["unet_name"][0].replace("BF16", "bf16"),
        ):
            with self.subTest(wrong_model=replacement):
                incomplete = copy.deepcopy(caps)
                incomplete["input_choices"]["UNETLoader"]["unet_name"] = [replacement]
                self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=incomplete)
                self.assertIsNone(self.store.acquire(self.worker_id))
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=caps)
        assignment = self.store.acquire(self.worker_id)
        self.assertIsNotNone(assignment)
        self.assertEqual(assignment["job_id"], "fusion")
        self.assertEqual(assignment["payload"]["graph"], self.graph)
        self.assertEqual(assignment["payload"]["capability"], "minimax_h3_fusion_v2_bf16")

    def test_fusion_bf16_raw_graph_primary_cuda_gate_cannot_be_bypassed(self):
        caps = self.fusion_bf16_caps()
        cid = "minimax_h3_fusion_v2_bf16"
        limit = 80 * 1024 ** 3
        primary = {"type": "cuda", "name": "RTX PRO 6000", "vram_total": limit + 1}
        cases = [
            ([{**primary, "vram_total": limit}], False),
            ([primary], True),
            ([{**primary, "vram_total": 96 * 1024 ** 3}], True),
            ([{**primary, "name": "Other GPU"}], True),
            ([{**primary, "type": "cpu"}], False),
            ([self.caps["devices"][0], primary], False),
            ([{**primary, "name": "RTX 4090", "vram_total": 24 * 1024 ** 3}], False),
            ([{**primary, "name": "RTX PRO 6000 96GB", "vram_total": None}], False),
            ([{**primary, "vram_total": float("inf")}], False),
            ([{**primary, "vram_total": None, "torch_vram_total": limit + 1}], True),
            ([], False),
            (None, False),
        ]
        for index, (devices, expected) in enumerate(cases):
            for policy in (None, HIGH_VRAM_GPU_POLICY, "unrestricted"):
                with self.subTest(devices=devices, gpu_policy=policy):
                    self.assertEqual(can_run_capability(cid, devices, policy, 1), expected)
                    job_id = f"fusion-bf16-{index}-{policy}"
                    self.enqueue(job_id=job_id, capability=cid, gpu_policy=policy, duration_seconds=1)
                    self.store.heartbeat(self.worker_id, comfy_online=True, capacity_released=True,
                                         capabilities={**caps, "devices": devices})
                    assignment = self.store.acquire(self.worker_id)
                    self.assertEqual(assignment is not None, expected)
                    if assignment:
                        self.assertEqual(assignment["job_id"], job_id)
                        self.store.finish(job_id, self.worker_id, assignment["lease_token"],
                                          "done", capacity_released=True)
                    else:
                        self.assertEqual(self.store.dispatch_status(job_id), "queued")
                    self.store.remove_job(job_id)

    def test_fusion_bf16_prefers_idle_larger_eligible_gpu_for_actual_graph(self):
        caps = self.fusion_bf16_caps()
        caps["devices"] = [{"type": "cuda", "name": "Other GPU",
                            "vram_total": 80 * 1024 ** 3 + 1}]
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=caps)
        larger_caps = copy.deepcopy(caps)
        larger_caps["devices"] = [{"type": "cuda", "name": "RTX PRO 6000",
                                   "vram_total": 96 * 1024 ** 3}]
        larger = self.store.register_worker("larger-bf16", larger_caps)["worker_id"]
        self.store.heartbeat(larger, comfy_online=True)
        # No explicit policy: the capability itself must trigger larger-GPU preference.
        self.enqueue(capability="minimax_h3_fusion_v2_bf16")
        self.assertIsNone(self.store.acquire(self.worker_id))
        self.assertEqual(self.store.dispatch_status("fusion"), "queued")
        assignment = self.store.acquire(larger)
        self.assertIsNotNone(assignment)
        self.assertEqual(assignment["job_id"], "fusion")
        self.assertEqual(assignment["payload"]["graph"], self.graph)

    def test_reserved_larger_worker_does_not_block_non_pro_old_h3(self):
        caps = copy.deepcopy(self.caps)
        caps["devices"] = [{"type": "cuda", "name": "RTX PRO 6000",
                            "vram_total": 96 * 1024 ** 3}]
        pro_id = self.store.register_worker("ordinary-nickname", caps)["worker_id"]
        self.store.heartbeat(pro_id, comfy_online=True)
        self.enqueue(capability="minimax_h3_ref_2pass", duration_seconds=8)
        self.assertIsNone(self.store.acquire(pro_id))
        self.assertEqual(self.store.acquire(self.worker_id)["job_id"], "fusion")

    def test_worker_nickname_and_new_policy_do_not_cancel_running_lease(self):
        # 昵称冒充 PRO 不影响真实 5090；已运行租约不会因设备更新被追溯取消。
        with self.store.db:
            self.store.db.execute("UPDATE workers SET name = ? WHERE id = ?",
                                  ("RTX PRO 6000 Blackwell", self.worker_id))
        self.enqueue()
        acquired = self.store.acquire(self.worker_id)
        self.assertIsNotNone(acquired)
        self.assertTrue(self.store.mark_running("fusion", self.worker_id, acquired["lease_token"]))
        caps = copy.deepcopy(self.caps)
        caps["devices"][0].update(name="RTX PRO 6000", vram_total=96 * 1024 ** 3)
        self.store.heartbeat(self.worker_id, comfy_online=True, busy=True,
                             current_job_id="fusion", capabilities=caps)
        self.assertEqual(self.store.dispatch_status("fusion"), "running")
        self.assertTrue(self.store.validate_lease("fusion", self.worker_id, acquired["lease_token"]))

    def test_actual_h3_graph_requires_every_exact_model(self):
        self.enqueue()
        for node_class, fields in self.choices.items():
            for name, values in fields.items():
                for missing in values:
                    with self.subTest(node_class=node_class, missing=missing):
                        caps = json.loads(json.dumps(self.caps))
                        caps["input_choices"][node_class][name].remove(missing)
                        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=caps)
                        self.assertIsNone(self.store.acquire(self.worker_id))
                        self.assertEqual(self.store.dispatch_status("fusion"), "queued")
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=self.caps)
        self.assertEqual(self.store.acquire(self.worker_id)["job_id"], "fusion")

    def test_old_or_incomplete_model_inventory_is_not_assumed_compatible(self):
        self.enqueue()
        for inventory in (None, {}, {"UNETLoader": self.choices["UNETLoader"]}):
            with self.subTest(inventory=inventory):
                caps = {**self.caps}
                if inventory is None:
                    caps.pop("input_choices")
                else:
                    caps["input_choices"] = inventory
                self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=caps)
                self.assertIsNone(self.store.acquire(self.worker_id))

    def test_model_paths_and_versions_are_not_substituted(self):
        self.graph["127"]["inputs"]["unet_name"] = "other/" + self.choices["UNETLoader"]["unet_name"][0]
        self.enqueue()
        self.assertIsNone(self.store.acquire(self.worker_id))

    def test_missing_model_worker_does_not_block_compatible_lower_vram_worker(self):
        caps = json.loads(json.dumps(self.caps))
        caps["devices"][0]["vram_total"] = 48 * 1024 ** 3
        caps["input_choices"]["UNETLoader"]["unet_name"] = []
        larger_id = self.store.register_worker("GPU-A6000", caps)["worker_id"]
        self.store.heartbeat(larger_id, comfy_online=True)
        self.enqueue(capability="minimax_h3_ref_2pass")
        self.assertIsNone(self.store.acquire(larger_id))
        self.assertEqual(self.store.acquire(self.worker_id)["job_id"], "fusion")

    def test_affinity_does_not_bypass_missing_models_or_block_other_jobs(self):
        caps = json.loads(json.dumps(self.caps))
        caps["input_choices"]["LoraLoaderModelOnly"]["lora_name"] = []
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=caps)
        with self.store.db:
            self.store.db.execute("UPDATE workers SET last_capability_id = ?, last_model_family = ? WHERE id = ?",
                                  ("minimax_h3_fusion_v2", "minimax_h3", self.worker_id))
        self.enqueue(model_family="minimax_h3")
        self.store.enqueue("ordinary", {"graph": {"1": {"class_type": "SaveImage", "inputs": {}}}})
        self.assertEqual(self.store.acquire(self.worker_id)["job_id"], "ordinary")
        self.assertEqual(self.store.dispatch_status("fusion"), "queued")

    def test_model_choice_can_be_resolved_through_string_to_combo_converter(self):
        name = self.graph["127"]["inputs"]["unet_name"]
        self.graph["model-name"] = {"class_type": "PrimitiveStringMultiline", "inputs": {"value": name}}
        self.graph["model-choice"] = {"class_type": "ConvertStringToComboNode", "inputs": {"string": ["model-name", 0]}}
        self.graph["127"]["inputs"]["unet_name"] = ["model-choice", 0]
        self.caps["node_classes"].append("ConvertStringToComboNode")
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=self.caps)
        self.enqueue()
        self.assertEqual(self.store.acquire(self.worker_id)["job_id"], "fusion")

    def test_unknown_linked_model_selector_is_not_assumed_compatible(self):
        self.graph["127"]["inputs"]["unet_name"] = ["unknown", 0]
        self.enqueue()
        self.assertIsNone(self.store.acquire(self.worker_id))

    def test_malformed_choices_never_match_by_substring_or_crash_dispatch(self):
        self.enqueue()
        for malformed in ("not-an-object", {"UNETLoader": []}, {
                **self.choices, "UNETLoader": {"unet_name": self.choices["UNETLoader"]["unet_name"][0]}}):
            with self.subTest(malformed=malformed):
                self.store.heartbeat(self.worker_id, comfy_online=True, capabilities={
                    **self.caps, "input_choices": malformed,
                })
                self.assertIsNone(self.store.acquire(self.worker_id))

    def test_prompt_text_ending_in_model_suffix_is_not_a_model_requirement(self):
        self.graph["238"]["inputs"]["value"] = "a robot holding model.safetensors"
        self.enqueue()
        self.assertEqual(self.store.acquire(self.worker_id)["job_id"], "fusion")

    def test_custom_linked_model_selector_with_empty_options_cannot_claim_file(self):
        self.graph["filename"] = {"class_type": "PrimitiveStringMultiline", "inputs": {"value": "exact.gguf"}}
        self.graph["custom"] = {"class_type": "CustomLoader", "inputs": {"checkpoint": ["filename", 0]}}
        self.caps["node_classes"].append("CustomLoader")
        self.caps["input_choices"]["CustomLoader"] = {"checkpoint": []}
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=self.caps)
        self.enqueue()
        self.assertIsNone(self.store.acquire(self.worker_id))

    def test_connected_model_needs_confirmed_tensor_type_or_exact_filename_inventory(self):
        self.graph["custom"] = {"class_type": "CustomLoader", "inputs": {"model": ["127", 0]}}
        self.caps["node_classes"].append("CustomLoader")
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=self.caps)
        self.enqueue()
        self.assertIsNone(self.store.acquire(self.worker_id))
        self.caps["input_types"]["CustomLoader"] = {"model": "MODEL"}
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=self.caps)
        self.assertEqual(self.store.acquire(self.worker_id)["job_id"], "fusion")

    def test_model_converter_without_inventory_and_cycles_are_rejected(self):
        self.graph["custom"] = {"class_type": "CustomLoader", "inputs": {"model": ["converter", 0]}}
        self.graph["converter"] = {"class_type": "ConvertStringToComboNode", "inputs": {"string": "exact.gguf"}}
        self.caps["node_classes"] += ["CustomLoader", "ConvertStringToComboNode"]
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=self.caps)
        self.enqueue()
        self.assertIsNone(self.store.acquire(self.worker_id))
        self.caps["input_choices"]["CustomLoader"] = {"model": ["exact.gguf"]}
        self.graph["converter"]["inputs"]["string"] = ["converter", 0]
        self.store.remove_job("fusion")
        self.enqueue()
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=self.caps)
        self.assertIsNone(self.store.acquire(self.worker_id))

    def test_custom_model_selector_with_empty_options_cannot_claim_file(self):
        self.graph["custom"] = {"class_type": "CustomLoader", "inputs": {"checkpoint": "exact.gguf"}}
        self.caps["node_classes"].append("CustomLoader")
        self.caps["input_choices"]["CustomLoader"] = {"checkpoint": []}
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=self.caps)
        self.enqueue()
        self.assertIsNone(self.store.acquire(self.worker_id))
        self.caps["input_choices"]["CustomLoader"]["checkpoint"] = ["exact.gguf"]
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities=self.caps)
        self.assertEqual(self.store.acquire(self.worker_id)["job_id"], "fusion")


class WorkerCapabilityComparisonTest(unittest.TestCase):
    def setUp(self):
        self.primary_caps = {
            "agent_version": 5,
            "node_classes": ["CheckpointLoader", "CustomModelLoader", "KSampler"],
            "input_choices": {
                "CheckpointLoader": {
                    "ckpt_name": ["models/v1/model.safetensors", "models/v2/model.safetensors"],
                    "mode": ["fast", "quality"],
                },
                "CustomModelLoader": {
                    "file": ["models/custom.gguf"],
                    "precision": ["fp8", "fp16"],
                },
            },
            "input_types": {
                "CheckpointLoader": {"ckpt_name": "COMBO", "mode": "COMBO"},
                "CustomModelLoader": {"file": "COMBO", "precision": "COMBO"},
            },
            "is_primary_node": True,
        }

    def worker(self, worker_id, caps, *, primary=False, state="idle"):
        return {
            "id": worker_id,
            "state": state,
            "is_primary_node": primary,
            "capabilities": caps,
        }

    def test_model_inventory_uses_exact_model_inputs_and_suffixes_only(self):
        inventory = capability_model_inventory(self.primary_caps)
        self.assertEqual(inventory, {
            ("CheckpointLoader", "ckpt_name", "models/v1/model.safetensors"),
            ("CheckpointLoader", "ckpt_name", "models/v2/model.safetensors"),
            ("CustomModelLoader", "file", "models/custom.gguf"),
        })
        self.assertIsNone(capability_model_inventory({"input_choices": {}}))
        self.assertIsNone(capability_model_inventory({
            "input_choices": {"Broken": {"model": "not-a-list"}},
            "input_types": {},
        }))

    def test_comparison_reports_exact_missing_models_without_duplicate_missing_nodes(self):
        worker_caps = json.loads(json.dumps(self.primary_caps))
        worker_caps["node_classes"] = ["CheckpointLoader", "KSampler", "ExtraNode"]
        worker_caps["input_choices"]["CheckpointLoader"]["ckpt_name"] = [
            "models/v1/model.safetensors",
            "other/model.safetensors",
        ]
        worker_caps["input_choices"].pop("CustomModelLoader")
        worker_caps["input_types"].pop("CustomModelLoader")
        baseline, workers = worker_capability_comparisons([
            self.worker("primary", self.primary_caps, primary=True),
            self.worker("worker", worker_caps),
        ])

        self.assertEqual(baseline, {
            "status": "ready", "worker_id": "primary", "agent_version": 5,
        })
        self.assertEqual(workers[0]["capability_comparison"]["status"], "primary")
        comparison = workers[1]["capability_comparison"]
        self.assertEqual(comparison["status"], "missing")
        self.assertEqual(comparison["missing_node_classes"], ["CustomModelLoader"])
        self.assertEqual(comparison["extra_node_classes"], ["ExtraNode"])
        self.assertEqual(comparison["missing_models"], [{
            "node_class": "CheckpointLoader", "input": "ckpt_name",
            "name": "models/v2/model.safetensors",
        }])
        self.assertNotIn("models/custom.gguf", {
            model["name"] for model in comparison["missing_models"]
        })
        self.assertEqual(comparison["extra_models"], [{
            "node_class": "CheckpointLoader", "input": "ckpt_name",
            "name": "other/model.safetensors",
        }])

    def test_missing_or_ambiguous_primary_never_claims_a_complete_inventory(self):
        worker = self.worker("worker", self.primary_caps)
        baseline, compared = worker_capability_comparisons([worker])
        self.assertEqual(baseline["status"], "none")
        self.assertEqual(compared[0]["capability_comparison"]["status"], "unknown")

        other_primary = self.worker("primary-2", self.primary_caps, primary=True)
        baseline, compared = worker_capability_comparisons([
            self.worker("primary-1", self.primary_caps, primary=True), other_primary,
        ])
        self.assertEqual(baseline["status"], "ambiguous")
        self.assertTrue(all(
            item["capability_comparison"]["status"] == "unknown" for item in compared
        ))

    def test_offline_and_legacy_inventories_are_explicit(self):
        legacy_caps = {
            "agent_version": 4,
            "node_classes": ["CheckpointLoader", "CustomModelLoader"],
        }
        unavailable_primary = self.worker(
            "primary", self.primary_caps, primary=True, state="error"
        )
        unavailable_primary["comfy_online"] = False
        baseline, workers = worker_capability_comparisons([
            unavailable_primary,
            self.worker("offline", self.primary_caps, state="offline"),
            self.worker("legacy", legacy_caps),
        ])
        self.assertEqual(baseline["status"], "stale")
        self.assertEqual(workers[1]["capability_comparison"]["status"], "stale")
        self.assertEqual(workers[1]["capability_comparison"]["model_inventory_status"], "complete")
        self.assertEqual(workers[2]["capability_comparison"]["status"], "unknown")
        self.assertEqual(workers[2]["capability_comparison"]["model_inventory_status"], "unknown")
        self.assertEqual(
            workers[2]["capability_comparison"]["missing_node_classes"], ["KSampler"]
        )

    def test_extra_only_inventory_is_compatible_without_duplicate_extra_models(self):
        worker_caps = json.loads(json.dumps(self.primary_caps))
        worker_caps["node_classes"].append("ExtraLoader")
        worker_caps["input_choices"]["ExtraLoader"] = {
            "model_name": ["extra/model.safetensors"],
        }
        worker_caps["input_types"]["ExtraLoader"] = {"model_name": "COMBO"}
        _, workers = worker_capability_comparisons([
            self.worker("primary", self.primary_caps, primary=True),
            self.worker("worker", worker_caps),
        ])
        comparison = workers[1]["capability_comparison"]
        self.assertEqual(comparison["status"], "complete")
        self.assertEqual(comparison["extra_node_classes"], ["ExtraLoader"])
        self.assertEqual(comparison["extra_models"], [])


class DistributedStoreTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = DistributedStore(
            Path(self.temp.name) / "control.db", lease_seconds=0.05, offline_seconds=10
        )
        credentials = self.store.register_worker(
            "gpu-01", {"node_classes": ["KSampler", "SaveImage"]}
        )
        self.worker_id = credentials["worker_id"]
        self.worker_token = credentials["worker_token"]
        self.store.heartbeat(
            self.worker_id,
            capabilities={"node_classes": ["KSampler", "SaveImage"]},
            comfy_online=True,
            busy=False,
        )

    def tearDown(self):
        self.store.close()
        self.temp.cleanup()

    def test_capacity_assignment_shares_dispatch_transaction(self):
        self.store.enqueue("atomic-job", {"graph": {}, "capability": "test"})
        with mock.patch.object(self.store.capacity, "assigned", side_effect=RuntimeError("write failed")):
            with self.assertRaisesRegex(RuntimeError, "write failed"):
                self.store.acquire(self.worker_id)
        self.assertEqual(self.store.dispatch_status("atomic-job"), "queued")
        self.assertEqual(self.store.list_workers()[0]["state"], "idle")
        assignment = self.store.acquire(self.worker_id)
        self.assertTrue(assignment["attempt_id"])

    def test_capacity_terminal_shares_dispatch_transaction(self):
        self.store.enqueue("atomic-job", {"graph": {}, "capability": "test"})
        assignment = self.store.acquire(self.worker_id)
        with mock.patch.object(self.store.capacity, "terminal", side_effect=RuntimeError("write failed")):
            with self.assertRaisesRegex(RuntimeError, "write failed"):
                self.store.finish("atomic-job", self.worker_id, assignment["lease_token"], "done")
        self.assertEqual(self.store.dispatch_status("atomic-job"), "assigned")
        self.assertEqual(self.store.list_workers()[0]["state"], "busy")

    def test_capacity_release_requires_explicit_idle_confirmation(self):
        with mock.patch.object(self.store.capacity, "observe_worker") as observe:
            for kwargs in ({}, {"capacity_released": True, "busy": True},
                           {"capacity_released": True, "current_job_id": "stale-job"}):
                self.store.heartbeat(self.worker_id, comfy_online=True, **kwargs)
                self.assertFalse(observe.call_args.kwargs["released"])
            self.store.heartbeat(self.worker_id, comfy_online=True, capacity_released=True)
            self.assertTrue(observe.call_args.kwargs["released"])

    def test_authentication_and_worker_state(self):
        self.assertTrue(self.store.authenticate(self.worker_id, self.worker_token))
        self.assertFalse(self.store.authenticate(self.worker_id, "wrong"))
        worker = self.store.list_workers()[0]
        self.assertNotIn("token_hash", worker)
        self.assertEqual(worker["state"], "idle")
        self.assertEqual(worker["capabilities"]["node_classes"], ["KSampler", "SaveImage"])
        self.store.enqueue("job-1", {"graph": {}}, ["KSampler"])
        assignment = self.store.acquire(self.worker_id)
        self.assertEqual(assignment["job_id"], "job-1")
        self.assertEqual(self.store.job_worker_names(["job-1"]), {"job-1": "gpu-01"})
        self.assertEqual(self.store.job_worker_names([]), {})

    def test_list_workers_keeps_only_latest_same_name_registration(self):
        newest = self.store.register_worker(
            "GPU-01", {"node_classes": ["KSampler", "SaveImage", "VHS_LoadVideo"]}
        )
        self.store.heartbeat(
            newest["worker_id"], comfy_online=True, busy=False,
        )

        workers = self.store.list_workers()
        self.assertEqual(len(workers), 1)
        self.assertEqual(workers[0]["id"], newest["worker_id"])
        self.assertEqual(workers[0]["name"], "GPU-01")
        self.assertEqual(
            self.store.db.execute("SELECT COUNT(*) FROM workers").fetchone()[0], 2
        )
        self.assertTrue(self.store.authenticate(self.worker_id, self.worker_token))

    def test_retire_worker_hides_all_same_name_registrations_and_preserves_history(self):
        newest = self.store.register_worker(
            "GPU-01", {"node_classes": ["KSampler", "SaveImage"]}
        )
        self.store.heartbeat(newest["worker_id"], comfy_online=True, busy=False)
        self.store.enqueue("historical-job", {"graph": {}}, ["KSampler"])
        assignment = self.store.acquire(newest["worker_id"])
        self.assertTrue(self.store.finish(
            "historical-job", newest["worker_id"], assignment["lease_token"], "done"
        ))

        self.assertTrue(self.store.retire_worker(newest["worker_id"]))

        self.assertEqual(self.store.list_workers(), [])
        self.assertFalse(self.store.authenticate(self.worker_id, self.worker_token))
        self.assertFalse(self.store.authenticate(
            newest["worker_id"], newest["worker_token"]
        ))
        rows = self.store.db.execute(
            "SELECT id, retired FROM workers ORDER BY created_at"
        ).fetchall()
        self.assertEqual([row["retired"] for row in rows], [1, 1])
        history = self.store.db.execute(
            "SELECT worker_id, status FROM dispatch_jobs WHERE job_id = 'historical-job'"
        ).fetchone()
        self.assertEqual(dict(history), {
            "worker_id": newest["worker_id"], "status": "done",
        })

        replacement = self.store.register_worker(
            "gpu-01", {"node_classes": ["KSampler", "SaveImage"]}
        )
        self.store.heartbeat(replacement["worker_id"], comfy_online=True, busy=False)
        self.assertEqual(
            [worker["id"] for worker in self.store.list_workers()],
            [replacement["worker_id"]],
        )

    def test_retire_worker_rejects_active_assignments(self):
        self.store.enqueue("active-job", {"graph": {}}, ["KSampler"])
        self.assertIsNotNone(self.store.acquire(self.worker_id))

        with self.assertRaisesRegex(WorkerBusyError, "执行中的任务"):
            self.store.retire_worker(self.worker_id)

        self.assertEqual(self.store.list_workers()[0]["id"], self.worker_id)
        self.assertTrue(self.store.authenticate(self.worker_id, self.worker_token))
        time.sleep(self.store.lease_seconds + 0.02)
        self.assertTrue(self.store.retire_worker(self.worker_id))
        self.assertEqual(self.store.dispatch_status("active-job"), "queued")
        self.assertEqual(self.store.list_workers(), [])

    def test_sync_all_skips_workers_without_sync_support(self):
        request = self.store.request_sync_all()
        self.assertEqual(request["worker_count"], 0)
        self.assertEqual(request["skipped_count"], 1)
        self.assertEqual(self.store.list_workers()[0]["sync_status"], "idle")

    def test_primary_node_is_skipped_by_sync_and_clears_previous_sync_failure(self):
        capabilities = {
            "node_classes": ["KSampler", "SaveImage"],
            "supports_file_sync": True,
            "supports_code_restart": True,
        }
        primary = self.store.register_worker("GPU-primary", capabilities)
        primary_id = primary["worker_id"]
        self.store.heartbeat(primary_id, comfy_online=True, busy=False)
        request = self.store.request_sync_all()
        self.store.heartbeat(
            primary_id, comfy_online=True, busy=False,
            maintenance={
                "request_id": request["request_id"], "status": "error",
                "message": "主节点不应保留的旧同步失败",
            },
        )
        self.store.heartbeat(
            primary_id, capabilities={**capabilities, "is_primary_node": True},
            comfy_online=True, busy=False,
        )
        for status in ("running", "done"):
            reply = self.store.heartbeat(
                primary_id, comfy_online=True, busy=False,
                maintenance={
                    "request_id": "obsolete-primary-sync", "status": status,
                    "message": "主节点旧同步报告",
                },
            )
            self.assertEqual(reply["maintenance_ack"], {
                "request_id": "obsolete-primary-sync", "status": status,
            })

        worker = next(item for item in self.store.list_workers()
                      if item["id"] == primary_id)
        self.assertTrue(worker["is_primary_node"])
        self.assertEqual(worker["sync_status"], "idle")
        self.assertEqual(worker["state"], "idle")
        sync_fields = self.store.db.execute(
            """SELECT sync_request_id, sync_message, sync_requested_at,
                      sync_started_at, sync_finished_at
               FROM workers WHERE id = ?""",
            (primary_id,),
        ).fetchone()
        self.assertEqual(list(sync_fields), [None, None, None, None, None])
        self.store.enqueue("primary-job", {"graph": {}}, ["KSampler"])
        self.assertEqual(self.store.acquire(primary_id)["job_id"], "primary-job")
        update = self.store.request_sync_all()
        self.assertEqual(update["primary_count"], 1)
        self.assertEqual(update["worker_count"], 0)
        self.assertEqual(update["skipped_count"], 1)

    def test_primary_with_stale_sync_state_still_participates_in_vram_dispatch(self):
        gib = 1024 ** 3
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities={
            "node_classes": ["KSampler"],
            "devices": [{"type": "cuda", "name": "GPU 32GB", "vram_total": 32 * gib}],
        })
        primary = self.store.register_worker("GPU-primary-48GB", {
            "node_classes": ["KSampler"], "is_primary_node": True,
            "devices": [{"type": "cuda", "name": "GPU 48GB", "vram_total": 48 * gib}],
        })
        primary_id = primary["worker_id"]
        self.store.heartbeat(primary_id, comfy_online=True, busy=False)
        with self.store.db:
            self.store.db.execute(
                "UPDATE workers SET sync_status = 'error' WHERE id = ?", (primary_id,)
            )
        self.store.enqueue("primary-vram-job", {
            "graph": {}, "capability": "minimax_h3_ref_2pass",
        }, ["KSampler"])

        self.assertIsNone(self.store.acquire(self.worker_id))
        self.assertEqual(
            self.store.acquire(primary_id)["job_id"], "primary-vram-job"
        )

    def test_sync_all_queues_latest_worker_and_blocks_jobs_until_finished(self):
        newest = self.store.register_worker(
            "GPU-01", {
                "node_classes": ["KSampler", "SaveImage"],
                "supports_file_sync": True,
                "supports_code_restart": True,
            }
        )
        newest_id = newest["worker_id"]
        self.store.heartbeat(newest_id, comfy_online=True, busy=False)
        self.store.enqueue("job-1", {"graph": {}}, ["KSampler"])

        request = self.store.request_sync_all()

        self.assertEqual(request["worker_count"], 1)
        rows = self.store.db.execute(
            "SELECT id, sync_status FROM workers ORDER BY created_at"
        ).fetchall()
        self.assertEqual(rows[0]["sync_status"], "idle")
        self.assertEqual(rows[1]["sync_status"], "pending")
        self.assertIsNone(self.store.acquire(newest_id))
        heartbeat = self.store.heartbeat(newest_id, comfy_online=True, busy=False)
        self.assertIn({
            "type": "sync_files", "request_id": request["request_id"],
        }, heartbeat["commands"])
        self.assertEqual(self.store.list_workers()[0]["state"], "syncing")

        heartbeat = self.store.heartbeat(
            newest_id, comfy_online=True, busy=True,
            maintenance={
                "request_id": request["request_id"],
                "status": "running",
                "message": "正在同步模型和用户目录",
            },
        )
        self.assertEqual(heartbeat["maintenance_ack"], {
            "request_id": request["request_id"], "status": "running",
        })
        self.assertIsNone(self.store.acquire(newest_id))

        self.store.heartbeat(
            newest_id, comfy_online=True, busy=False,
            maintenance={
                "request_id": request["request_id"],
                "status": "done",
                "message": "同步完成",
            },
        )
        worker = self.store.list_workers()[0]
        self.assertEqual(worker["sync_status"], "done")
        self.assertEqual(worker["state"], "idle")
        self.assertEqual(self.store.acquire(newest_id)["job_id"], "job-1")

    def test_temperature_history_survives_maintenance_and_failed_sync_stays_blocked(self):
        worker = self.store.register_worker("GPU-maintenance", {
            "node_classes": ["KSampler"], "supports_code_restart": True,
            "supports_file_sync": True,
        })
        worker_id = worker["worker_id"]
        now = time.time()
        with mock.patch("distributed.time.time", return_value=now):
            self.store.heartbeat(worker_id, comfy_online=True, busy=False)
            request = self.store.request_sync_all()
            self.store.enqueue("temperature-maintenance-job", {"graph": {}}, ["KSampler"])
            points = []
            for offset, status in enumerate(("running", "error")):
                at = now + offset * 10
                points.append({"at": at, "temperature_c": 65 + offset})
                with mock.patch("distributed.time.time", return_value=at):
                    reply = self.store.heartbeat(
                        worker_id, comfy_online=True, busy=False,
                        telemetry={"collected_at": at, "gpus": [
                            {"index": 255, "temperature_c": 65 + offset},
                        ]},
                        maintenance={"request_id": request["request_id"],
                                     "status": status, "message": "温度与维护组合回归"},
                    )
                    self.assertEqual(reply["maintenance_ack"]["status"], status)
                    self.assertIsNone(self.store.acquire(worker_id))
                    rows = {row["id"]: row for row in self.store.list_workers()}
                    self.assertEqual(rows[worker_id]["state"], "syncing" if status == "running" else "error")
                    self.assertEqual(self.store.temperature_history(
                        worker_id, gpu_index=255, now=at)["points"], points)
            # 失败状态不能被随后一个普通的在线、空闲心跳解除。
            self.store.heartbeat(worker_id, comfy_online=True, busy=False)
            self.assertIsNone(self.store.acquire(worker_id))
            self.store.heartbeat(
                worker_id, comfy_online=True, busy=False,
                maintenance={"request_id": request["request_id"], "status": "done"},
            )
            self.assertEqual(self.store.acquire(worker_id)["job_id"], "temperature-maintenance-job")
            self.assertEqual(self.store.temperature_history(
                worker_id, gpu_index=255, now=now + 10)["points"], points)

    def test_heartbeat_merges_telemetry_without_dropping_capabilities(self):
        telemetry = {
            "hostname": "RENDER-01",
            "gpus": [{
                "index": 0, "name": "NVIDIA GeForce RTX 4090",
                "utilization_percent": 42,
                "memory_used_bytes": 8 * 1024 ** 3,
                "memory_total_bytes": 24 * 1024 ** 3,
            }],
            "memory": {
                "used_bytes": 32 * 1024 ** 3,
                "total_bytes": 64 * 1024 ** 3,
            },
        }

        self.store.heartbeat(
            self.worker_id, telemetry=telemetry, comfy_online=True, busy=False
        )

        capabilities = self.store.list_workers()[0]["capabilities"]
        self.assertEqual(capabilities["node_classes"], ["KSampler", "SaveImage"])
        self.assertEqual(capabilities["telemetry"], telemetry)

    def test_high_quality_h3_requires_32gb_primary_cuda_gpu(self):
        self.store.enqueue("hq", {"capability": "minimax_h3_ref_2pass"}, ["KSampler"])
        gb = 1000 ** 3
        gib = 1024 ** 3
        rejected = [
            None, [], [{}],
            [{"type": "cuda", "name": "RTX 5090"}],
            [{"type": "cuda", "name": "RTX 4090", "vram_total": 24 * gib}],
            [{"type": "cuda", "name": "GPU", "vram_total": 32 * gb - 1}],
            [{"type": "cpu", "name": "A6000", "vram_total": 48 * gib}],
            [
                {"type": "cuda", "name": "RTX 4090", "vram_total": 24 * gib},
                {"type": "cuda", "name": "A6000", "vram_total": 48 * gib},
            ],
        ]
        for devices in rejected:
            with self.subTest(devices=devices):
                self.store.heartbeat(self.worker_id, comfy_online=True, capabilities={
                    "node_classes": ["KSampler"], "devices": devices,
                })
                self.assertIsNone(self.store.acquire(self.worker_id))
                self.assertEqual(self.store.db.execute(
                    "SELECT status FROM dispatch_jobs WHERE job_id = 'hq'"
                ).fetchone()[0], "queued")

        accepted = (
            ("exact 32GB", 32 * gb),
            ("live RTX 5090 D", 34_190_458_880),
            ("RTX A6000", 48 * gib),
        )
        for name, vram in accepted:
            with self.subTest(name=name):
                self.store.heartbeat(self.worker_id, comfy_online=True, capabilities={
                    "node_classes": ["KSampler"],
                    "devices": [{"type": "cuda", "name": name, "vram_total": vram}],
                })
                assignment = self.store.acquire(self.worker_id)
                self.assertEqual(assignment["job_id"], "hq")
                self.store.finish("hq", self.worker_id, assignment["lease_token"], "done")
                self.store.remove_job("hq")
                self.store.enqueue("hq", {"capability": "minimax_h3_ref_2pass"}, ["KSampler"])

    def test_high_quality_h3_up_to_five_seconds_allows_4090(self):
        gib = 1024 ** 3
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities={
            "node_classes": ["KSampler"],
            "devices": [{
                "type": "cuda", "name": "NVIDIA GeForce RTX 4090",
                "vram_total": 24 * gib,
            }],
        })
        for duration, accepted in ((5, True), (5.001, False)):
            with self.subTest(duration=duration):
                self.store.enqueue("hq-short", {
                    "capability": "minimax_h3_ref_2pass",
                    "duration_seconds": duration,
                }, ["KSampler"])
                assignment = self.store.acquire(self.worker_id)
                self.assertEqual(assignment is not None, accepted)
                if assignment:
                    self.store.finish(
                        "hq-short", self.worker_id, assignment["lease_token"], "done"
                    )
                self.store.remove_job("hq-short")

    def test_short_high_quality_h3_requires_actual_4090(self):
        gib = 1024 ** 3
        self.store.enqueue("hq-short", {
            "capability": "minimax_h3_ref_2pass", "duration_seconds": 5,
        }, ["KSampler"])
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities={
            "node_classes": ["KSampler"],
            "devices": [{"type": "cuda", "name": "RTX 3090", "vram_total": 24 * gib}],
        })
        self.assertIsNone(self.store.acquire(self.worker_id))

    def test_long_video_gpu_policy_requires_32gb_primary_cuda_gpu(self):
        gib = 1024 ** 3
        self.store.enqueue("long-video", {
            "capability": "minimax_h3_ref9",
            "gpu_policy": HIGH_VRAM_GPU_POLICY,
        }, ["KSampler"])
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities={
            "node_classes": ["KSampler"],
            "devices": [{"type": "cuda", "name": "RTX 4090", "vram_total": 24 * gib}],
        })
        self.assertIsNone(self.store.acquire(self.worker_id))
        self.assertEqual(self.store.db.execute(
            "SELECT status FROM dispatch_jobs WHERE job_id = 'long-video'"
        ).fetchone()[0], "queued")

        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities={
            "node_classes": ["KSampler"],
            "devices": [{"type": "cuda", "name": "RTX A6000", "vram_total": 48 * gib}],
        })
        assignment = self.store.acquire(self.worker_id)
        self.assertEqual(assignment["job_id"], "long-video")
        self.assertEqual(assignment["payload"]["gpu_policy"], HIGH_VRAM_GPU_POLICY)

    def test_high_quality_h3_prefers_idle_worker_with_more_vram(self):
        gib = 1024 ** 3
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities={
            "node_classes": ["KSampler"],
            "devices": [{"type": "cuda", "name": "RTX 5090", "vram_total": 32 * gib}],
        })
        larger = self.store.register_worker("GPU-A6000", {
            "node_classes": ["KSampler"],
            "devices": [{"type": "cuda", "name": "RTX A6000", "vram_total": 48 * gib}],
        })
        self.store.heartbeat(larger["worker_id"], comfy_online=True)
        self.store.enqueue("hq", {"capability": "minimax_h3_ref_2pass"}, ["KSampler"])

        self.assertIsNone(self.store.acquire(self.worker_id))
        assignment = self.store.acquire(larger["worker_id"])
        self.assertEqual(assignment["job_id"], "hq")

    def test_incompatible_larger_worker_does_not_block_high_vram_worker(self):
        gib = 1024 ** 3
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities={
            "node_classes": ["KSampler"],
            "devices": [{"type": "cuda", "name": "RTX 5090", "vram_total": 32 * gib}],
        })
        larger = self.store.register_worker("GPU-A6000", {
            "node_classes": ["SaveImage"],
            "devices": [{"type": "cuda", "name": "RTX A6000", "vram_total": 48 * gib}],
        })
        self.store.heartbeat(larger["worker_id"], comfy_online=True)
        self.store.enqueue("hq", {"capability": "minimax_h3_ref_2pass"}, ["KSampler"])

        assignment = self.store.acquire(self.worker_id)
        self.assertEqual(assignment["job_id"], "hq")

    def test_high_quality_gpu_rule_precedes_affinity_and_fifo(self):
        self._finish_success("warm", "minimax_h3_ref9", "minimax_h3")
        self.store.enqueue("hq", {
            "capability": "minimax_h3_ref_2pass", "model_family": "minimax_h3",
        }, ["KSampler"])
        self.store.enqueue("ordinary", {"capability": "zimage_t2i"}, ["KSampler"])
        for wait_limit in (0, 60):
            with self.subTest(wait_limit=wait_limit):
                self.store.affinity_max_wait_seconds = wait_limit
                with self.store.db:
                    self.store.db.execute(
                        "UPDATE workers SET last_capability_id = ?, last_model_family = ? WHERE id = ?",
                        ("minimax_h3_ref_2pass", "minimax_h3", self.worker_id),
                    )
                assignment = self.store.acquire(self.worker_id)
                self.assertEqual(assignment["job_id"], "ordinary")
                self.store.finish("ordinary", self.worker_id, assignment["lease_token"], "done")
                self.store.remove_job("ordinary")
                self.store.enqueue("ordinary", {"capability": "zimage_t2i"}, ["KSampler"])

    def test_high_vram_worker_still_needs_required_nodes(self):
        self.store.heartbeat(self.worker_id, comfy_online=True, capabilities={
            "node_classes": ["KSampler"],
            "devices": [{
                "type": "cuda", "name": "RTX A6000", "vram_total": 48 * 1024 ** 3,
            }],
        })
        self.store.enqueue("hq", {"capability": "minimax_h3_ref_2pass"}, ["MissingNode"])
        self.assertIsNone(self.store.acquire(self.worker_id))

    def test_acquire_matches_capabilities_and_enforces_lease(self):
        self.store.enqueue("missing", {"graph": {}}, ["MissingNode"])
        self.store.enqueue("matched", {"graph": {"1": {"class_type": "KSampler"}}}, ["KSampler"])

        assignment = self.store.acquire(self.worker_id)
        self.assertEqual(assignment["job_id"], "matched")
        self.assertIsNone(self.store.acquire(self.worker_id))
        self.assertFalse(self.store.validate_lease("matched", self.worker_id, "wrong"))
        self.assertTrue(self.store.mark_running(
            "matched", self.worker_id, assignment["lease_token"]
        ))

        self.assertEqual(self.store.request_cancel("matched"), "cancel_requested")
        heartbeat = self.store.heartbeat(
            self.worker_id, comfy_online=True, busy=True, current_job_id="matched"
        )
        self.assertEqual(heartbeat["commands"], [
            {"type": "cancel_job", "job_id": "matched"}
        ])
        self.assertGreater(heartbeat["lease_ttl_seconds"], 0)
        self.assertTrue(self.store.finish(
            "matched", self.worker_id, assignment["lease_token"], "canceled"
        ))
        self.assertEqual(self.store.list_workers()[0]["state"], "idle")

    def test_expired_assignment_is_requeued_and_old_lease_is_rejected(self):
        self.store.enqueue("job-1", {"graph": {}}, [])
        first = self.store.acquire(self.worker_id)
        time.sleep(0.07)
        self.store.heartbeat(
            self.worker_id, comfy_online=True, busy=False, current_job_id=None
        )
        self.assertEqual(self.store.job_worker_names(["job-1"]), {})
        second = self.store.acquire(self.worker_id)

        self.assertEqual(second["job_id"], "job-1")
        self.assertNotEqual(first["lease_token"], second["lease_token"])
        self.assertFalse(self.store.validate_lease(
            "job-1", self.worker_id, first["lease_token"]
        ))

    def test_expired_cancellation_keeps_capacity_terminal_without_claiming_release(self):
        self.store.enqueue("cancel-expired", {"graph": {}}, [])
        self.store.acquire(self.worker_id)
        self.store.request_cancel("cancel-expired")
        with self.store.lock, self.store.db:
            self.store.db.execute("UPDATE dispatch_jobs SET lease_expires_at=0 WHERE job_id=?",
                                  ("cancel-expired",))
        self.store.heartbeat(self.worker_id, comfy_online=True)
        self.assertEqual(self.store.dispatch_status("cancel-expired"), "canceled")
        detail = self.store.capacity.report()["details"][0]
        self.assertEqual(detail["status"], "canceled")
        self.assertTrue(detail["attempts"][0]["gap"])
        self.assertIsNone(detail["attempts"][0]["released_at"])
        self.assertIsNone(detail["occupied_seconds"])

    def test_disabled_worker_cannot_acquire(self):
        self.store.enqueue("job-1", {"graph": {}}, [])
        self.assertTrue(self.store.set_worker_enabled(self.worker_id, False))
        self.assertIsNone(self.store.acquire(self.worker_id))
        self.assertEqual(self.store.list_workers()[0]["state"], "disabled")

    def test_terminal_job_heartbeat_cannot_make_worker_busy_again(self):
        self.store.enqueue("job-1", {"graph": {}}, [])
        assignment = self.store.acquire(self.worker_id)
        self.assertTrue(self.store.mark_running(
            "job-1", self.worker_id, assignment["lease_token"]
        ))
        self.assertTrue(self.store.finish(
            "job-1", self.worker_id, assignment["lease_token"], "error"
        ))

        heartbeat = self.store.heartbeat(
            self.worker_id, comfy_online=True, busy=True, local_busy=False,
            current_job_id="job-1",
        )

        self.assertEqual(heartbeat["commands"], [
            {"type": "abort_job", "job_id": "job-1"}
        ])
        worker = self.store.list_workers()[0]
        self.assertEqual(worker["state"], "idle")
        self.assertIsNone(worker["current_job_id"])
        self.assertEqual(self.store.dispatch_status("job-1", self.worker_id), "error")

    def _finish_success(self, job_id, capability, model_family):
        self.store.enqueue(job_id, {
            "graph": {}, "capability": capability, "model_family": model_family,
        }, [])
        assignment = self.store.acquire(self.worker_id)
        self.assertEqual(assignment["job_id"], job_id)
        self.assertTrue(self.store.mark_running(
            job_id, self.worker_id, assignment["lease_token"]
        ))
        self.assertTrue(self.store.finish(
            job_id, self.worker_id, assignment["lease_token"], "done"
        ))

    def test_acquire_prefers_same_workflow(self):
        self._finish_success("warm", "minimax_h3_ref9", "minimax_h3")
        worker = self.store.list_workers()[0]
        self.assertEqual(worker["last_capability_id"], "minimax_h3_ref9")
        self.assertEqual(worker["last_model_family"], "minimax_h3")

        self.store.enqueue("older-same-family", {
            "graph": {}, "capability": "minimax_h3_i2v", "model_family": "minimax_h3",
        }, [])
        self.store.enqueue("same-workflow", {
            "graph": {}, "capability": "minimax_h3_ref9", "model_family": "minimax_h3",
        }, [])

        assignment = self.store.acquire(self.worker_id)
        self.assertEqual(assignment["job_id"], "same-workflow")

    def test_acquire_falls_back_to_same_model_family(self):
        self._finish_success("warm", "minimax_h3_ref9", "minimax_h3")
        self.store.enqueue("older-other", {
            "graph": {}, "capability": "zimage_t2i", "model_family": "zimage",
        }, [])
        self.store.enqueue("same-family", {
            "graph": {}, "capability": "minimax_h3_i2v", "model_family": "minimax_h3",
        }, [])

        assignment = self.store.acquire(self.worker_id)
        self.assertEqual(assignment["job_id"], "same-family")

    def test_affinity_does_not_bypass_fifo_after_wait_limit(self):
        self._finish_success("warm", "minimax_h3_ref9", "minimax_h3")
        self.store.enqueue("oldest", {
            "graph": {}, "capability": "zimage_t2i", "model_family": "zimage",
        }, [])
        self.store.enqueue("same-workflow", {
            "graph": {}, "capability": "minimax_h3_ref9", "model_family": "minimax_h3",
        }, [])
        self.store.affinity_max_wait_seconds = 0

        assignment = self.store.acquire(self.worker_id)
        self.assertEqual(assignment["job_id"], "oldest")


class DistributedStoreMigrationTest(unittest.TestCase):
    def test_existing_worker_table_gains_new_columns(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "control.db"
            db = sqlite3.connect(path)
            try:
                db.execute("""CREATE TABLE workers (
                    id TEXT PRIMARY KEY, name TEXT NOT NULL, token_hash TEXT NOT NULL,
                    enabled INTEGER NOT NULL DEFAULT 1, last_seen REAL NOT NULL,
                    comfy_online INTEGER NOT NULL DEFAULT 0, busy INTEGER NOT NULL DEFAULT 0,
                    current_job_id TEXT, capabilities_json TEXT NOT NULL DEFAULT '{}',
                    created_at REAL NOT NULL, updated_at REAL NOT NULL
                )""")
                token_hash = hashlib.sha256(b"legacy-token").hexdigest()
                db.execute(
                    """INSERT INTO workers
                       (id, name, token_hash, last_seen, created_at, updated_at)
                       VALUES ('legacy-worker', 'Legacy GPU', ?, 1, 1, 1)""",
                    (token_hash,),
                )
                db.commit()
            finally:
                db.close()
            store = DistributedStore(path)
            try:
                columns = {row[1] for row in store.db.execute("PRAGMA table_info(workers)")}
                self.assertIn("last_capability_id", columns)
                self.assertIn("last_model_family", columns)
                self.assertIn("sync_request_id", columns)
                self.assertIn("sync_status", columns)
                self.assertIn("sync_finished_at", columns)
                self.assertIn("retired", columns)
                self.assertEqual(
                    store.db.execute(
                        "SELECT retired FROM workers WHERE id='legacy-worker'"
                    ).fetchone()[0],
                    0,
                )
                self.assertTrue(store.authenticate("legacy-worker", "legacy-token"))
                self.assertEqual(store.list_workers()[0]["id"], "legacy-worker")
            finally:
                store.close()


class WorkerTelemetryTest(unittest.TestCase):
    @mock.patch("agent.subprocess.run")
    def test_reads_nvidia_gpu_utilization_and_vram(self, run):
        run.return_value = mock.Mock(
            returncode=0,
            stdout="0, NVIDIA GeForce RTX 4090, 73, 12288, 24564\n",
        )

        gpus = WorkerAgent._nvidia_gpus()

        self.assertEqual(gpus, [{
            "index": 0,
            "name": "NVIDIA GeForce RTX 4090",
            "utilization_percent": 73.0,
            "temperature_c": None,
            "memory_used_bytes": 12288 * 1024 ** 2,
            "memory_total_bytes": 24564 * 1024 ** 2,
        }])

    def test_reads_windows_system_memory(self):
        total = 64 * 1024 ** 3
        available = 18 * 1024 ** 3
        windows = mock.Mock()

        def fill_memory(status_pointer):
            status_pointer._obj.ullTotalPhys = total
            status_pointer._obj.ullAvailPhys = available
            return 1

        windows.kernel32.GlobalMemoryStatusEx.side_effect = fill_memory
        with mock.patch("agent.os.name", "nt"), \
             mock.patch("agent.ctypes.windll", windows, create=True):
            memory = WorkerAgent._system_memory()

        self.assertEqual(memory, {
            "used_bytes": total - available,
            "total_bytes": total,
        })

    @mock.patch("agent.subprocess.run", side_effect=FileNotFoundError)
    def test_missing_nvidia_smi_reports_no_gpu_metrics(self, _run):
        self.assertEqual(WorkerAgent._nvidia_gpus(), [])

    @mock.patch("agent.subprocess.run")
    def test_nvidia_smi_timeout_reports_no_gpu_metrics(self, run):
        run.side_effect = subprocess.TimeoutExpired("nvidia-smi", 5)
        self.assertEqual(WorkerAgent._nvidia_gpus(), [])

    def test_probe_failures_do_not_break_telemetry(self):
        worker = WorkerAgent.__new__(WorkerAgent)
        worker.config = {"worker_name": "GPU-FALLBACK"}
        with mock.patch.object(
                WorkerAgent, "_nvidia_gpus", side_effect=RuntimeError("gpu failed")), \
             mock.patch.object(
                WorkerAgent, "_system_memory", side_effect=RuntimeError("ram failed")):
            telemetry = worker.collect_telemetry()

        self.assertEqual(telemetry["gpus"], [])
        self.assertIsNone(telemetry["memory"])
        self.assertIn("hostname", telemetry)
        self.assertIn("collected_at", telemetry)


class WorkerInputPathTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.agent = WorkerAgent.__new__(WorkerAgent)
        self.agent.comfy_input = Path(self.temp.name).resolve()

    def tearDown(self):
        self.temp.cleanup()

    def test_accepts_central_chouka_reference(self):
        target, filename = self.agent._input_target("chouka/input.png")
        self.assertEqual(filename, "input.png")
        self.assertEqual(target, self.agent.comfy_input / "chouka" / "input.png")

    def test_rejects_path_traversal_and_unknown_prefix(self):
        for ref in ("../secret.txt", "chouka/../secret.txt", "other/input.png"):
            with self.subTest(ref=ref), self.assertRaises(JobFailed):
                self.agent._input_target(ref)

    def test_removes_only_silent_video_audio_links(self):
        graph = {
            "45": {"inputs": {
                "ref_video": ["78", 0],
                "ref_audio": ["78", 2],
                "other_audio": ["79", 2],
            }},
            "78": {"class_type": "VHS_LoadVideo", "inputs": {
                "video": "chouka/silent.mov"
            }},
        }
        removed = self.agent._remove_output_links(graph, "78", 2)
        self.assertEqual(removed, 1)
        self.assertEqual(graph["45"]["inputs"]["ref_video"], ["78", 0])
        self.assertEqual(graph["45"]["inputs"]["other_audio"], ["79", 2])
        self.assertNotIn("ref_audio", graph["45"]["inputs"])


class WorkerExecutionEventTest(unittest.IsolatedAsyncioTestCase):
    async def test_history_success_finishes_silent_websocket_without_heartbeat(self):
        class FakeWebSocket:
            closed = False

            async def __aenter__(self):
                return self

            async def __aexit__(self, *_args):
                return False

            async def receive(self, timeout=None):
                self.timeout = timeout
                raise asyncio.TimeoutError

        class FakeSession:
            def __init__(self):
                self.kwargs = None

            def ws_connect(self, _url, **kwargs):
                self.kwargs = kwargs
                return FakeWebSocket()

        agent = WorkerAgent.__new__(WorkerAgent)
        agent.comfy_lock = asyncio.Lock()
        agent.release_failed = None
        agent.server = "http://controller"
        agent.comfy = "http://comfy"
        agent.comfy_ws = "ws://comfy/ws"
        agent.session = FakeSession()
        agent.state = {"worker_id": "worker", "worker_token": "token"}

        async def json_request(_method, url, **_kwargs):
            if url.endswith("/prompt"):
                return {"prompt_id": "job-1"}
            if url.endswith("/history/job-1"):
                return {"job-1": {
                    "status": {"status_str": "success", "completed": True}
                }}
            return {}

        async def report_event(_assignment, _event):
            return None

        agent._json_request = json_request
        agent.report_event = report_event
        await agent.execute_comfy({
            "job_id": "job-1",
            "lease_token": "lease",
            "payload": {"graph": {}},
        })

        self.assertNotIn("heartbeat", agent.session.kwargs)


class WorkerCleanupTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.agent = WorkerAgent.__new__(WorkerAgent)
        agent = self.agent
        agent.comfy_lock = asyncio.Lock()
        agent.release_failed = None
        agent.current = None
        agent.comfy_online = True
        agent.local_busy = False
        agent.pending_sync = None
        agent.sync_report = None
        agent.server = "http://controller"
        agent.comfy = "http://comfy"
        agent.comfy_ws = "ws://comfy/ws"
        agent.state = {"worker_id": "worker", "worker_token": "token"}
        agent.config = {}
        agent.telemetry = {}
        agent.capabilities = {}
        agent.last_capability_scan = time.time()
        agent.last_telemetry_scan = time.time()
        agent.last_release_check = 0.0
        agent.prepare_inputs = mock.AsyncMock()
        agent.patch_silent_video_audio = mock.AsyncMock()
        agent.collect_outputs = mock.AsyncMock(return_value=[])
        agent.report_event = mock.AsyncMock()
        self.assignment = {
            "job_id": "job-1", "lease_token": "lease",
            "payload": {"graph": {}}, "lease_expires_at": time.time() + 60,
        }
        self.cleanup_started = asyncio.Event()
        self.cleanup_ack = asyncio.Event()
        self.ack = {"cancelled": True, "cleanup_complete": True}
        self.requests = []

        async def request(method, url, **kwargs):
            self.requests.append((method, url, kwargs))
            if url.endswith("/cancel"):
                self.cleanup_started.set()
                await self.cleanup_ack.wait()
                if isinstance(self.ack, Exception):
                    raise self.ack
                return self.ack
            if url.endswith("/prompt"):
                return {"prompt_id": "job-1"}
            return {}

        agent._json_request = mock.AsyncMock(side_effect=request)
        self.execution_started = asyncio.Event()
        self.ws_closed = asyncio.Event()
        self.ws = mock.MagicMock()
        self.ws.closed = False
        self.ws.__aenter__.return_value = self.ws

        async def close():
            self.ws.closed = True
            self.ws_closed.set()

        self.ws.close = mock.AsyncMock(side_effect=close)
        agent.session = mock.Mock()
        agent.session.ws_connect.return_value = self.ws

        async def execute_comfy(_assignment):
            self.assignment["_ws"] = self.ws
            self.execution_started.set()
            await self.ws_closed.wait()
            raise JobFailed("ComfyUI WebSocket 已断开")

        agent.execute_comfy = mock.AsyncMock(side_effect=execute_comfy)

    def failed_requests(self):
        return [kwargs["json"] for _, url, kwargs in self.requests if url.endswith("/failed")]

    async def test_sync_command_waits_for_files_then_pulls_and_restarts(self):
        calls = []

        async def run_command(*arguments, **_kwargs):
            calls.append(("files", arguments))
            return "Synchronization completed successfully."

        async def pull_code():
            calls.append(("pull", None))
            return "abc123def456", "Already up to date."

        async def restart(request_id, commit):
            calls.append(("restart", (request_id, commit)))

        with tempfile.TemporaryDirectory() as directory:
            script = Path(directory) / "sync.bat"
            script.write_text("@exit /b 0", encoding="ascii")
            with mock.patch.object(self.agent, "sync_script_path", return_value=script), \
                 mock.patch.object(self.agent, "run_local_command", side_effect=run_command), \
                 mock.patch.object(self.agent, "pull_code", side_effect=pull_code), \
                 mock.patch.object(self.agent, "schedule_node_restart", side_effect=restart), \
                 mock.patch("agent.os.name", "nt"):
                self.agent.queue_sync({"type": "sync_files", "request_id": "sync-1"})
                await self.agent.execute_pending_sync()

        self.assertIsNone(self.agent.pending_sync)
        self.assertEqual([item[0] for item in calls], ["files", "pull", "restart"])
        self.assertEqual(calls[0][1][:3], ("cmd.exe", "/d", "/c"))
        self.assertEqual(calls[0][1][3], f".\\{script.name}")
        self.assertEqual(calls[0][1][-2:], ("--upgrade", "--non-interactive"))
        self.assertEqual(calls[-1][1], ("sync-1", "abc123def456"))

    async def test_restart_handoff_waits_for_supervisor_ack_and_keeps_log(self):
        process = mock.Mock()
        process.poll.return_value = None
        process.terminate = mock.Mock()
        self.agent.stop_event = asyncio.Event()
        self.agent.config = {"restart_timeout_seconds": 60}
        self.agent.run_local_command = mock.AsyncMock(return_value="paths valid")
        self.agent._save_state = mock.Mock()
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory)
            worker_dir = repo / "worker"
            worker_dir.mkdir()
            helper = worker_dir / "restart_node.py"
            helper.write_text("", encoding="utf-8")
            launcher = repo / "启动Windows节点.bat"
            launcher.write_text("", encoding="utf-8")
            self.agent.config_path = worker_dir / "config.json"

            def acknowledged_state():
                state = copy.deepcopy(self.agent.state)
                state["maintenance"]["phase"] = "waiting_for_old_worker"
                return state

            self.agent._load_state = mock.Mock(side_effect=acknowledged_state)
            with mock.patch.object(self.agent, "code_repo_path", return_value=repo), \
                 mock.patch.object(self.agent, "node_launcher_path", return_value=launcher), \
                 mock.patch("agent.os.name", "nt"), \
                 mock.patch("agent.uuid.uuid4", return_value=mock.Mock(hex="restart-1")), \
                 mock.patch("agent.subprocess.Popen", return_value=process) as spawn, \
                 mock.patch("agent.asyncio.create_subprocess_exec", new=mock.AsyncMock()) as async_spawn:
                await self.agent.schedule_node_restart("sync-1", "abc123def456")

        self.assertTrue(self.agent.stop_event.is_set())
        self.assertEqual(self.agent.state["maintenance"]["phase"], "waiting_for_old_worker")
        command = spawn.call_args.args[0]
        self.assertIn("--restart-token", command)
        self.assertEqual(command[command.index("--restart-token") + 1], "restart-1")
        self.assertIsNot(spawn.call_args.kwargs["stdout"], subprocess.DEVNULL)
        async_spawn.assert_not_awaited()
        self.agent.run_local_command.assert_awaited_once()

    async def test_restart_supervisor_spawn_failure_is_persisted_without_stopping_worker(self):
        self.agent.stop_event = asyncio.Event()
        self.agent.config = {"restart_timeout_seconds": 60}
        self.agent.run_local_command = mock.AsyncMock(return_value="paths valid")
        self.agent._save_state = mock.Mock()
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory)
            worker_dir = repo / "worker"
            worker_dir.mkdir()
            (worker_dir / "restart_node.py").write_text("", encoding="utf-8")
            launcher = repo / "启动Windows节点.bat"
            launcher.write_text("", encoding="utf-8")
            self.agent.config_path = worker_dir / "config.json"
            with mock.patch.object(self.agent, "code_repo_path", return_value=repo), \
                 mock.patch.object(self.agent, "node_launcher_path", return_value=launcher), \
                 mock.patch("agent.os.name", "nt"), \
                 mock.patch("agent.subprocess.Popen", side_effect=OSError("spawn failed")):
                with self.assertRaisesRegex(OSError, "spawn failed"):
                    await self.agent.schedule_node_restart("sync-1", "abc123def456")

        self.assertFalse(self.agent.stop_event.is_set())
        self.assertEqual(self.agent.state["maintenance"]["status"], "error")
        self.assertEqual(self.agent.state["maintenance"]["phase"], "error")
        self.assertIn("spawn failed", self.agent.state["maintenance"]["message"])
        self.assertEqual(self.agent._save_state.call_count, 2)

    @unittest.skipUnless(os.name == "nt", "Windows cmd.exe behavior")
    async def test_local_batch_runs_from_directory_with_shell_metacharacters(self):
        with tempfile.TemporaryDirectory(prefix="sync & path ") as directory:
            script = Path(directory) / "sync.bat"
            script.write_text("@echo off\necho SYNC_OK [%1]\nexit /b 0\n", encoding="ascii")
            output = await self.agent.run_local_command(
                "cmd.exe", "/d", "/c", self.agent.batch_command_name(script),
                "--upgrade", cwd=script.parent, timeout=10,
            )
        self.assertIn("SYNC_OK", output)

    def test_batch_filename_rejects_cmd_metacharacters(self):
        with self.assertRaisesRegex(AgentError, "cmd 不安全字符"):
            self.agent.batch_command_name(Path("sync & run.bat"))

    async def test_git_pull_requires_clean_expected_branch_and_fast_forward(self):
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory)
            (repo / ".git").mkdir()
            self.agent.config = {"code_branch": "main"}
            command = mock.AsyncMock(side_effect=[
                "main", "", "Already up to date.", "abc123def456",
            ])
            with mock.patch.object(self.agent, "code_repo_path", return_value=repo), \
                 mock.patch.object(self.agent, "run_local_command", command):
                commit, _ = await self.agent.pull_code()

        self.assertEqual(commit, "abc123def456")
        pull_args = command.await_args_list[2].args
        self.assertEqual(pull_args, ("git", "pull", "--ff-only", "origin", "main"))

    def test_restarted_worker_only_reports_done_after_comfy_capabilities_load(self):
        self.agent.state["maintenance"] = {
            "request_id": "sync-1", "status": "restarting",
            "restart_token": "restart-1",
            "target_commit": "abc123def456", "deadline": time.time() + 60,
        }
        self.agent.restart_token = "restart-1"
        self.agent.fresh_capabilities_ready = True
        self.agent.capabilities = {"node_classes": ["KSampler"]}
        self.agent.comfy_online = True
        self.agent._save_state = mock.Mock()

        self.agent.refresh_restart_report()

        self.assertEqual(self.agent.sync_report["status"], "done")
        self.assertEqual(self.agent.state["maintenance"]["status"], "ready")
        self.agent._save_state.assert_called_once_with()

    def test_old_worker_cannot_report_replacement_restart_as_ready(self):
        self.agent.state["maintenance"] = {
            "request_id": "sync-1", "status": "restarting",
            "restart_token": "replacement-only",
            "target_commit": "abc123def456", "deadline": time.time() + 60,
        }
        self.agent.restart_token = ""
        self.agent.fresh_capabilities_ready = True
        self.agent.capabilities = {"node_classes": ["KSampler"]}
        self.agent.comfy_online = True
        self.agent._save_state = mock.Mock()

        self.agent.refresh_restart_report()

        self.assertEqual(self.agent.sync_report["status"], "running")
        self.assertEqual(self.agent.state["maintenance"]["status"], "restarting")
        self.agent._save_state.assert_not_called()

    def test_restart_does_not_report_late_comfy_recovery_as_success(self):
        self.agent.state["maintenance"] = {
            "request_id": "sync-1", "status": "restarting",
            "restart_token": "restart-1",
            "target_commit": "abc123def456", "deadline": time.time() - 1,
        }
        self.agent.restart_token = "restart-1"
        self.agent.fresh_capabilities_ready = True
        self.agent.capabilities = {"node_classes": ["KSampler"]}
        self.agent.comfy_online = True
        self.agent._save_state = mock.Mock()

        self.agent.refresh_restart_report()

        self.assertEqual(self.agent.sync_report["status"], "error")
        self.assertEqual(self.agent.state["maintenance"]["status"], "error")

    def test_worker_mutex_identity_uses_canonical_case_insensitive_config_path(self):
        path = ROOT / "worker/config.example.json"
        self.assertEqual(worker_mutex_name(path), worker_mutex_name(str(path).upper()))
        self.assertTrue(worker_mutex_name(path).startswith("Global\\ChoukaWorker-"))

    def test_restart_in_progress_blocks_tokenless_worker_during_handoff(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            config_path = root / "config.json"
            state_path = root / "state.json"
            config_path.write_text(json.dumps({"state_file": "state.json"}), encoding="utf-8")
            state_path.write_text(json.dumps({"maintenance": {
                "status": "restarting", "deadline": time.time() + 60,
            }}), encoding="utf-8")
            self.assertTrue(restart_in_progress(config_path))
            state_path.write_text(json.dumps({"maintenance": {
                "status": "restarting", "deadline": time.time() - 1,
            }}), encoding="utf-8")
            self.assertFalse(restart_in_progress(config_path))

    def test_restart_in_progress_rejects_malformed_deadline(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            config_path = root / "config.json"
            config_path.write_text(json.dumps({"state_file": "state.json"}), encoding="utf-8")
            (root / "state.json").write_text(json.dumps({"maintenance": {
                "status": "restarting", "deadline": "invalid",
            }}), encoding="utf-8")
            with self.assertRaisesRegex(AgentError, "重启期限无效"):
                restart_in_progress(config_path)

    @unittest.skipUnless(os.name == "nt", "Windows named mutex behavior")
    def test_worker_mutex_blocks_duplicate_for_same_config(self):
        path = ROOT / "worker/config.example.json"
        handle = acquire_worker_mutex(path)
        try:
            self.assertTrue(worker_instance_status(path))
            with self.assertRaisesRegex(AgentError, "已在运行"):
                acquire_worker_mutex(path)
        finally:
            close_worker_mutex(handle)
        self.assertFalse(worker_instance_status(path))

    @unittest.skipUnless(os.name == "nt", "Windows CIM behavior")
    def test_legacy_cim_fallback_does_not_match_same_named_config_elsewhere(self):
        with tempfile.TemporaryDirectory() as directory:
            config_path = Path(directory) / "config.json"
            config_path.write_text(json.dumps({"state_file": "state.json"}), encoding="utf-8")
            process = subprocess.Popen(
                [sys.executable, "-c", "import time; time.sleep(30)",
                 "agent.py", "--config", r"worker\config.json"],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            try:
                time.sleep(0.5)
                self.assertTrue(worker_instance_status(ROOT / "worker/config.json"))
                self.assertFalse(worker_instance_status(config_path))
            finally:
                process.terminate()
                process.wait(timeout=10)

    @unittest.skipUnless(os.name == "nt", "Windows CIM behavior")
    def test_legacy_cim_fallback_requires_exact_absolute_config_argument(self):
        with tempfile.TemporaryDirectory() as directory:
            config_path = Path(directory) / "worker-a.json"
            config_path.write_text(json.dumps({"state_file": "state.json"}), encoding="utf-8")
            other_path = Path(str(config_path) + ".backup")
            process = subprocess.Popen(
                [sys.executable, "-c", "import time; time.sleep(30)",
                 "agent.py", "--config", str(other_path)],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            try:
                time.sleep(0.5)
                self.assertFalse(worker_instance_status(config_path))
            finally:
                process.terminate()
                process.wait(timeout=10)

    def test_wait_for_process_exit_rejects_wait_failed(self):
        kernel32 = mock.Mock()
        kernel32.OpenProcess.return_value = 123
        kernel32.WaitForSingleObject.return_value = 0xFFFFFFFF
        kernel32.GetLastError.return_value = 5
        with mock.patch.object(restart_node.ctypes, "windll", mock.Mock(kernel32=kernel32), create=True):
            with self.assertRaisesRegex(RuntimeError, "Windows 错误码 5"):
                restart_node.wait_for_process_exit(321, timeout=1)
        kernel32.CloseHandle.assert_called_once_with(123)

    def test_restart_result_requires_matching_token_and_propagates_error(self):
        worker = mock.Mock()
        worker.poll.return_value = None
        with tempfile.TemporaryDirectory() as directory:
            state_path = Path(directory) / "state.json"
            state_path.write_text(json.dumps({"maintenance": {
                "request_id": "sync-1", "restart_token": "restart-1",
                "status": "error", "message": "ComfyUI failed",
            }}), encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "ComfyUI failed"):
                restart_node.wait_for_restart_result(
                    state_path, worker, time.time() + 10, "sync-1", "restart-1"
                )

            state_path.write_text(json.dumps({"last_restart_result": {
                "request_id": "sync-1", "restart_token": "restart-1",
                "status": "ready",
            }}), encoding="utf-8")
            restart_node.wait_for_restart_result(
                state_path, worker, time.time() + 10, "sync-1", "restart-1"
            )

    def test_restart_result_ignores_mismatched_restart_token(self):
        state = {"maintenance": {
            "request_id": "sync-1", "restart_token": "old-token", "status": "ready",
        }}
        self.assertIsNone(restart_node.restart_result(state, "sync-1", "new-token"))

    def test_comfy_readiness_requires_structured_system_stats(self):
        response = mock.MagicMock()
        response.status = 200
        response.read.return_value = b'{"system": {}, "devices": []}'
        response.__enter__.return_value = response
        opener = mock.Mock()
        opener.open.return_value = response
        with mock.patch.object(restart_node, "build_opener", return_value=opener):
            restart_node.wait_for_comfy_ready("http://127.0.0.1:8188", time.time() + 10)
        self.assertEqual(
            [call.args[0] for call in opener.open.call_args_list],
            ["http://127.0.0.1:8188/system_stats"],
        )

    def test_comfy_readiness_rejects_missing_system_stats_fields(self):
        response = mock.MagicMock()
        response.status = 200
        response.read.return_value = b'{}'
        response.__enter__.return_value = response
        opener = mock.Mock()
        opener.open.return_value = response
        with mock.patch.object(restart_node, "build_opener", return_value=opener), \
             mock.patch.object(restart_node.time, "time", side_effect=[0, 2]), \
             mock.patch.object(restart_node.time, "sleep"):
            with self.assertRaisesRegex(RuntimeError, "返回内容无效"):
                restart_node.wait_for_comfy_ready("http://127.0.0.1:8188", 1)

    def test_start_worker_passes_restart_token_and_persists_output(self):
        process = mock.Mock(pid=321)
        with tempfile.TemporaryDirectory() as directory, \
             mock.patch.object(restart_node.subprocess, "Popen", return_value=process) as popen:
            log_path = Path(directory) / "worker.log"
            restart_node.start_worker(
                ROOT / "worker/config.example.json", "restart-1", log_path
            )
        command = popen.call_args.args[0]
        self.assertEqual(command[-2:], ["--restart-token", "restart-1"])
        self.assertIs(popen.call_args.kwargs["stderr"], subprocess.STDOUT)

    def test_windows_launchers_wait_for_comfy_and_deduplicate_worker(self):
        for name in ("启动Windows节点.bat", "启动Windows节点_4090.bat",
                     "启动Windows节点_A6000.bat"):
            with self.subTest(name=name):
                content = (ROOT / name).read_text(encoding="utf-8")
                self.assertIn('--wait-comfy --config "%WORKER_CONFIG%"', content)
                self.assertIn('--instance-status', content)
                self.assertGreaterEqual(content.count('--instance-status'), 3)
                self.assertIn('No duplicate was started', content)
                self.assertNotIn('START_DELAY', content)
                self.assertLess(
                    content.index('--comfy-start-only'), content.index('--wait-comfy')
                )
                self.assertLess(
                    content.index('--wait-comfy'), content.index('--instance-status')
                )
                self.assertLess(
                    content.index('if /i "%~1"=="--comfy-only"'),
                    content.index('--instance-status'),
                )

    async def test_cancel_retains_current_until_ack_and_reuses_targeted_cleanup(self):
        task = asyncio.create_task(self.agent.execute(self.assignment))
        await self.execution_started.wait()
        await self.agent.cancel_current("unrelated-job")
        self.assertNotIn("cancel_requested", self.assignment)
        await asyncio.wait_for(self.agent.cancel_current("job-1"), 0.5)
        await self.cleanup_started.wait()
        cleanup = self.assignment["_cleanup_task"]
        await self.agent.cancel_current("job-1")
        self.assertIs(self.assignment["_cleanup_task"], cleanup)
        self.assertIs(self.agent.current, self.assignment)
        self.assertFalse(task.done())
        self.assertEqual(self.failed_requests(), [])
        self.assertIsNone(await self.agent.acquire())
        self.cleanup_ack.set()
        await task
        self.assertIsNone(self.agent.current)
        self.assertTrue(self.failed_requests()[0]["canceled"])
        comfy_calls = [(url, kw) for _, url, kw in self.requests if url.startswith(self.agent.comfy)]
        self.assertEqual(len(comfy_calls), 1)
        url, kwargs = comfy_calls[0]
        self.assertEqual(url, "http://comfy/api/jobs/job-1/cancel")
        self.assertEqual(kwargs["json"], {"free_memory": True})
        self.assertEqual(kwargs["timeout"].total, 130)

    async def test_missing_ack_and_timeout_keep_release_failed_gate(self):
        for ack in ({"cancelled": True}, asyncio.TimeoutError()):
            with self.subTest(ack=ack):
                self.assignment.pop("_cleanup_task", None)
                self.agent.release_failed = None
                self.ack = ack
                self.cleanup_ack.set()
                self.agent.execute_comfy = mock.AsyncMock(side_effect=JobFailed("OOM"))
                await self.agent.execute(self.assignment)
                self.assertIsNone(self.agent.current)
                self.assertIn("重启相关进程", self.agent.release_failed)
                self.assertFalse(self.failed_requests()[-1]["canceled"])
                self.assertIn("显存释放未确认", self.failed_requests()[-1]["error"])
                count = len(self.requests)
                self.assertIsNone(await self.agent.acquire())
                self.assertEqual(len(self.requests), count)

    async def test_connection_loss_during_cancel_retries_targeted_cleanup(self):
        for error in (
                aiohttp.ClientOSError(64, "指定的网络名不再可用"),
                aiohttp.ClientPayloadError("response body disconnected")):
            with self.subTest(error=error):
                self.agent._json_request = mock.AsyncMock(side_effect=[
                    error, {"cancelled": False, "cleanup_complete": True},
                ])

                released = await self.agent.cancel_and_release(self.assignment)

                self.assertTrue(released)
                self.assertIsNone(self.agent.release_failed)
                self.assertEqual(self.agent._json_request.await_count, 2)
                for request in self.agent._json_request.await_args_list:
                    method, url = request.args
                    self.assertEqual(
                        (method, url),
                        ("POST", "http://comfy/api/jobs/job-1/cancel"),
                    )
                    self.assertEqual(request.kwargs["json"], {"free_memory": True})
                    self.assertEqual(request.kwargs["timeout"].total, 130)
                    self.assertEqual(request.kwargs["timeout"].sock_connect, 15)

    async def test_release_failed_gate_recovers_after_comfy_confirms_cleanup(self):
        self.agent.release_failed = "显存释放未确认"
        self.agent._json_request = mock.AsyncMock(
            return_value={"cleanup_complete": True})

        await self.agent.confirm_release_recovery()

        self.assertIsNone(self.agent.release_failed)
        self.agent._json_request.assert_awaited_once()
        method, url = self.agent._json_request.await_args.args
        kwargs = self.agent._json_request.await_args.kwargs
        self.assertEqual((method, url), ("POST", "http://comfy/free"))
        self.assertEqual(kwargs["json"], {
            "free_memory": True, "unload_models": True, "wait": True,
        })
        self.assertEqual(kwargs["timeout"].total, 130)

    async def test_release_failed_gate_stays_closed_without_cleanup_confirmation(self):
        self.agent.release_failed = "显存释放未确认"
        self.agent._json_request = mock.AsyncMock(
            return_value={"cleanup_complete": False})

        await self.agent.confirm_release_recovery()

        self.assertEqual(self.agent.release_failed, "显存释放未确认")

    async def test_cancel_during_input_download_never_submits_prompt(self):
        downloading = asyncio.Event()
        downloaded = asyncio.Event()

        async def prepare(_assignment):
            downloading.set()
            await downloaded.wait()

        self.agent.prepare_inputs = prepare
        self.agent.execute_comfy = WorkerAgent.execute_comfy.__get__(self.agent)
        task = asyncio.create_task(self.agent.execute(self.assignment))
        await downloading.wait()
        await self.agent.cancel_current("job-1")
        await self.cleanup_started.wait()
        downloaded.set()
        self.assertIs(self.agent.current, self.assignment)
        self.cleanup_ack.set()
        await task
        self.assertFalse(any(url.endswith("/prompt") for _, url, _ in self.requests))
        self.assertTrue(self.failed_requests()[0]["canceled"])

    async def test_heartbeat_continues_renewing_during_cleanup(self):
        self.agent.current = self.assignment
        self.agent.local_status = mock.AsyncMock()
        self.agent.stop_event = mock.Mock()
        self.agent.stop_event.is_set.side_effect = [False, False, True]
        self.agent.stop_event.wait = mock.AsyncMock(side_effect=asyncio.TimeoutError)
        heartbeats = []
        original = self.agent._json_request

        async def request(method, url, **kwargs):
            if url.endswith("/heartbeat"):
                heartbeats.append(kwargs["json"])
                return {"commands": [{"type": "cancel_job", "job_id": "job-1"}],
                        "lease_ttl_seconds": 60}
            return await original(method, url, **kwargs)

        self.agent._json_request = request
        await asyncio.wait_for(self.agent.heartbeat_loop(), 1)
        await self.cleanup_started.wait()
        self.assertEqual(len(heartbeats), 2)
        self.assertTrue(heartbeats[1]["local_busy"])
        self.assertGreater(self.assignment["_lease_deadline"], time.monotonic())
        self.assertFalse(self.assignment["_cleanup_task"].done())
        self.cleanup_ack.set()
        await self.assignment["_cleanup_task"]

        self.agent.current = None
        self.agent.release_failed = "显存释放未确认"
        self.agent.stop_event.is_set.side_effect = [False, True]
        await self.agent.heartbeat_loop()
        self.assertIsNone(heartbeats[-1]["current_job_id"])
        self.assertTrue(heartbeats[-1]["local_busy"])
        self.assertTrue(heartbeats[-1]["busy"])

    async def test_cancel_waits_for_inflight_submit_then_targets_same_id(self):
        submitted = asyncio.Event()
        submit_done = asyncio.Event()
        original = self.agent._json_request

        async def request(method, url, **kwargs):
            if url.endswith("/prompt"):
                self.assertEqual(kwargs["json"]["prompt_id"], "job-1")
                submitted.set()
                await submit_done.wait()
            return await original(method, url, **kwargs)

        self.agent._json_request = request
        self.agent.execute_comfy = WorkerAgent.execute_comfy.__get__(self.agent)
        task = asyncio.create_task(self.agent.execute(self.assignment))
        await submitted.wait()
        await self.agent.cancel_current("job-1")
        await self.ws_closed.wait()
        self.assertFalse(self.cleanup_started.is_set())
        submit_done.set()
        await self.cleanup_started.wait()
        self.assertIs(self.agent.current, self.assignment)
        self.cleanup_ack.set()
        await task
        self.assertTrue(self.failed_requests()[0]["canceled"])

    async def test_late_websocket_success_during_cancel_is_not_forwarded(self):
        receiving = asyncio.Event()

        async def receive(timeout=None):
            receiving.set()
            await self.ws_closed.wait()
            return mock.Mock(type=aiohttp.WSMsgType.TEXT, data=json.dumps({
                "type": "execution_success", "data": {"prompt_id": "job-1"},
            }))

        self.ws.receive = receive
        self.agent.execute_comfy = WorkerAgent.execute_comfy.__get__(self.agent)
        task = asyncio.create_task(self.agent.execute(self.assignment))
        await receiving.wait()
        await self.agent.cancel_current("job-1")
        await self.cleanup_started.wait()
        self.agent.report_event.assert_not_awaited()
        self.agent.collect_outputs.assert_not_awaited()
        self.assertEqual(self.failed_requests(), [])
        self.cleanup_ack.set()
        await task
        self.assertTrue(self.failed_requests()[0]["canceled"])
        self.assertFalse(any(url.endswith("/complete") for _, url, _ in self.requests))

    async def test_execute_task_cancellation_waits_for_release(self):
        task = asyncio.create_task(self.agent.execute(self.assignment))
        await self.execution_started.wait()
        task.cancel()
        await self.cleanup_started.wait()
        self.assertIs(self.agent.current, self.assignment)
        self.assertEqual(self.failed_requests(), [])
        self.cleanup_ack.set()
        with self.assertRaises(asyncio.CancelledError):
            await task
        self.assertIsNone(self.agent.current)

    async def test_error_and_interrupted_events_defer_failure_until_cleanup(self):
        for event_type in ("execution_error", "execution_interrupted"):
            with self.subTest(event_type=event_type):
                await self.asyncSetUp()
                self.agent.execute_comfy = WorkerAgent.execute_comfy.__get__(self.agent)
                self.ws.receive = mock.AsyncMock(return_value=mock.Mock(
                    type=aiohttp.WSMsgType.TEXT,
                    data=json.dumps({"type": event_type, "data": {
                        "prompt_id": "job-1", "exception_message": "OOM",
                    }}),
                ))
                task = asyncio.create_task(self.agent.execute(self.assignment))
                await self.cleanup_started.wait()
                event = self.agent.report_event.await_args.args[1]
                self.assertTrue(event["data"]["cleanup_pending"])
                self.assertIs(self.agent.current, self.assignment)
                self.assertEqual(self.failed_requests(), [])
                self.cleanup_ack.set()
                await task
                self.assertEqual(self.failed_requests()[0]["canceled"],
                                 event_type == "execution_interrupted")


if __name__ == "__main__":
    unittest.main()
