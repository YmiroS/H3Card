# -*- coding: utf-8 -*-
"""产能模块纯标准库回归；不启动服务、不访问真实 GPU 或业务数据。"""
import copy
import csv
import io
import json
import math
import sqlite3
import tempfile
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from server import capacity as capacity_module
from server.capacity import CapacityStore, export_csv, make_spec, model_summary, model_summary_from_graph


class ModelSummaryTests(unittest.TestCase):
    @staticmethod
    def graph(name="model.safetensors", kind="UNETLoader", **inputs):
        key = "ckpt_name" if kind in {"CheckpointLoaderSimple", "CheckpointLoader"} else "unet_name"
        return {
            "1": {"class_type": kind, "inputs": {key: name, **inputs}},
            "2": {"class_type": "KSampler", "inputs": {"model": ["1", 0]}},
            "3": {"class_type": "VAEDecode", "inputs": {"samples": ["2", 0]}},
            "4": {"class_type": "SaveImage", "inputs": {"images": ["3", 0]}},
        }

    @staticmethod
    def summarize(graph):
        return model_summary(make_spec("image", {}, graph, {}))

    def test_real_qwen21_int8_excludes_fp8_encoder_bf16_vae_and_lora(self):
        path = Path(__file__).resolve().parents[1] / "graphs" / "qwen_image_21_t2i.api.json"
        graph = json.loads(path.read_text(encoding="utf-8"))
        for with_lora in (False, True):
            if with_lora:
                graph["lora"] = {"class_type": "LoraLoaderModelOnly", "inputs": {
                    "model": ["2", 0], "lora_name": "adapter_bf16.safetensors", "strength_model": 1}}
                graph["14"]["inputs"]["model"] = ["lora", 0]
            with self.subTest(with_lora=with_lora):
                auxiliaries = [
                    {"name": "qwen3vl_8b_fp8_scaled.safetensors", "role": "辅助文本编码器", "precision": "FP8",
                     "precision_source": "filename", "loader_dtype": None},
                    {"name": "qwen_image_2.1_vae_bf16.safetensors", "role": "辅助VAE", "precision": "BF16",
                     "precision_source": "filename", "loader_dtype": None}]
                if with_lora:
                    auxiliaries.append({"name": "adapter_bf16.safetensors", "role": "辅助LoRA", "precision": "BF16",
                                        "precision_source": "filename", "loader_dtype": None})
                self.assertEqual(self.summarize(graph), {
                    "models": [{"name": "qwen_image_2.1_int8_convrot.safetensors", "precision": "INT8",
                                "precision_source": "filename", "loader_dtype": None, "role": "生成主模型"}],
                    "auxiliary_models": auxiliaries, "complete": True,
                    "precision_label": "INT8", "source": "task_snapshot", "runtime_verified": False})

    def test_real_fp8_filename_with_default_dtype(self):
        path = Path(__file__).resolve().parents[1] / "graphs" / "qwen_image_2512_t2i.api.json"
        result = self.summarize(json.loads(path.read_text(encoding="utf-8")))
        self.assertEqual(len(result["models"]), 1)
        self.assertEqual(result["precision_label"], "FP8")
        self.assertEqual(result["models"][0]["precision_source"], "filename")
        self.assertIsNone(result["models"][0]["loader_dtype"])

    def test_no_precision_does_not_infer_from_model_family_or_default_auto(self):
        for name in ("qwen_image_2.1.safetensors", "model_fp80.safetensors", "notfp8.safetensors"):
            for dtype in (None, "default", "auto", "unknown", "my_fp8", True):
                with self.subTest(name=name, dtype=dtype):
                    result = self.summarize(self.graph(name, weight_dtype=dtype))
                    self.assertEqual(result["source"], "task_snapshot")
                    self.assertIsNone(result["precision_label"])
                    self.assertEqual(result["models"], [{"name": name, "precision": None,
                                                       "precision_source": None, "loader_dtype": None,
                                                       "role": "生成主模型"}])
                    self.assertTrue(result["complete"])

    def test_loader_dtype_is_explicit_and_filename_evidence_has_priority(self):
        for dtype, precision in (("fp8_e4m3fn", "FP8"), ("fp8_e5m2_fast", "FP8"),
                                 ("float16", "FP16"), ("bfloat16", "BF16"), ("fp32", "FP32")):
            for key in ("weight_dtype", "dtype", "precision"):
                with self.subTest(dtype=dtype, key=key):
                    result = self.summarize(self.graph(**{key: dtype}))
                    self.assertEqual(result["models"][0], {"name": "model.safetensors", "precision": precision,
                                                           "precision_source": "loader", "loader_dtype": dtype,
                                                           "role": "生成主模型"})
                    self.assertEqual(result["precision_label"], precision)
                    result = self.summarize(self.graph("model_int8.safetensors", **{key: dtype}))
                    self.assertEqual(result["models"][0], {"name": "model_int8.safetensors", "precision": "INT8",
                                                           "precision_source": "filename", "loader_dtype": dtype,
                                                           "role": "生成主模型"})
                    self.assertFalse(result["runtime_verified"])

    def test_exact_main_loader_allowlist_and_gguf_quantization(self):
        for kind in ("UNETLoader", "CheckpointLoaderSimple", "CheckpointLoader",
                     "UnetLoaderGGUF", "UnetLoaderGGUFAdvanced"):
            with self.subTest(kind=kind):
                result = self.summarize(self.graph("model_FP16.safetensors", kind))
                self.assertEqual(result["precision_label"], "FP16")
        self.assertEqual(self.summarize(self.graph("model-Q4_K_M.gguf", "UnetLoaderGGUF"))["precision_label"], "Q4_K_M")
        for kind in ("UnknownModelLoader", "CLIPLoader", "VAELoader", "LoraLoaderModelOnly"):
            self.assertEqual(self.summarize(self.graph("model_fp8.safetensors", kind))["source"], "unrecorded")

    def test_mixed_models_preserve_all_precisions_and_unknowns(self):
        for second_name, label in (("second_bf16.safetensors", "BF16 / INT8"),
                                   ("second.safetensors", None)):
            graph = self.graph("first_int8.safetensors")
            graph["5"] = {"class_type": "UNETLoader", "inputs": {"unet_name": second_name}}
            graph["6"] = {"class_type": "KSampler", "inputs": {"model": ["5", 0], "latent_image": ["2", 0]}}
            graph["3"]["inputs"]["samples"] = ["6", 0]
            result = self.summarize(graph)
            self.assertEqual([m["name"] for m in result["models"]], ["first_int8.safetensors", second_name])
            self.assertEqual(result["precision_label"], label)
            graph["5"]["inputs"]["unet_name"] = "first_int8.safetensors"
            graph["5"]["inputs"]["weight_dtype"] = "float16"
            result = self.summarize(graph)
            self.assertEqual(len(result["models"]), 2)
            self.assertEqual([m["loader_dtype"] for m in result["models"]], [None, "float16"])

    def test_mixed_loader_dtypes_and_partly_unknown_generation_paths(self):
        graph = self.graph("first.safetensors", weight_dtype="float16")
        graph["5"] = {"class_type": "UNETLoader", "inputs": {"unet_name": "second.safetensors", "dtype": "bfloat16"}}
        graph["6"] = {"class_type": "KSampler", "inputs": {"model": ["5", 0], "latent_image": ["2", 0]}}
        graph["3"]["inputs"]["samples"] = ["6", 0]
        result = self.summarize(graph)
        self.assertEqual(result["precision_label"], "BF16 / FP16")
        self.assertEqual([m["loader_dtype"] for m in result["models"]], ["float16", "bfloat16"])
        graph["7"] = {"class_type": "UnknownGenerator", "inputs": {"model": ["5", 0]}}
        graph["8"] = {"class_type": "SaveImage", "inputs": {"images": ["7", 0]}}
        result = self.summarize(graph)
        self.assertEqual(len(result["models"]), 2)
        self.assertIsNone(result["precision_label"])
        self.assertEqual(result["source"], "task_snapshot")

    def test_model_merge_and_custom_sampler_guider(self):
        graph = self.graph("first_fp16.safetensors")
        graph.update({
            "5": {"class_type": "UNETLoader", "inputs": {"unet_name": "second_bf16.safetensors"}},
            "6": {"class_type": "ModelMergeSimple", "inputs": {"model1": ["1", 0], "model2": ["5", 0]}},
            "7": {"class_type": "CFGGuider", "inputs": {"model": ["6", 0]}},
        })
        graph["2"] = {"class_type": "SamplerCustomAdvanced", "inputs": {"guider": ["7", 0]}}
        self.assertEqual(self.summarize(graph)["precision_label"], "BF16 / FP16")

    def test_disconnected_loader_sampler_and_auxiliary_checkpoint_are_excluded(self):
        graph = self.graph("main_int8.safetensors")
        graph["5"] = {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "unused_fp8.safetensors"}}
        graph["6"] = {"class_type": "KSampler", "inputs": {"model": ["5", 0]}}
        graph["7"] = {"class_type": "CLIPTextEncode", "inputs": {"clip": ["5", 1]}}
        graph["2"]["inputs"]["positive"] = ["7", 0]
        graph["3"]["inputs"]["vae"] = ["5", 2]
        result = self.summarize(graph)
        self.assertEqual([m["name"] for m in result["models"]], ["main_int8.safetensors"])
        self.assertEqual(result["precision_label"], "INT8")

    def test_unknown_routes_missing_output_wrong_slots_and_cycles_stay_unknown(self):
        variants = []
        graph = self.graph("main_fp8.safetensors")
        graph.pop("4")
        variants.append(graph)
        for kind in ("UnknownModelSwitch", "UnknownTransform"):
            graph = self.graph("main_fp8.safetensors")
            graph["5"] = {"class_type": kind, "inputs": {"model": ["1", 0], "images": ["3", 0]}}
            graph["2" if kind == "UnknownModelSwitch" else "4"]["inputs"] = {
                "model" if kind == "UnknownModelSwitch" else "images": ["5", 0]}
            variants.append(graph)
        graph = self.graph("main_fp8.safetensors", "CheckpointLoaderSimple")
        graph["2"]["inputs"]["model"] = ["1", 1]
        variants.append(graph)
        graph = self.graph()
        graph["1"] = {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["1", 0]}}
        variants.append(graph)
        for graph in variants:
            with self.subTest(graph=graph):
                self.assertEqual(self.summarize(graph), {"models": [], "precision_label": None,
                                                        "auxiliary_models": [], "complete": False,
                                                        "source": "unrecorded", "runtime_verified": False})

    def test_only_snapshot_graph_is_used_without_paths_or_mutation(self):
        spec = make_spec("image", {}, self.graph("/private/fp8/model.safetensors"), {})
        spec["models"] = ["fake_fp8.safetensors"]
        spec["model_version"] = "bf16"
        original = copy.deepcopy(spec)
        result = model_summary(spec)
        self.assertEqual(spec, original)
        self.assertEqual(result["models"][0]["name"], "model.safetensors")
        self.assertIsNone(result["precision_label"])
        self.assertNotIn("/private", json.dumps(result))
        for value in (None, {}, {"models": ["fake_fp8.safetensors"]}, {"graph": []}):
            self.assertEqual(model_summary(value)["source"], "unrecorded")

    @staticmethod
    def real_graph(name):
        path = Path(__file__).resolve().parents[1] / "graphs" / (name + ".api.json")
        return json.loads(path.read_text(encoding="utf-8"))

    def test_real_h3_paths_and_two_pass_shared_model_are_complete_and_deduplicated(self):
        for name in ("minimax_h3_i2v", "minimax_h3_flf2v", "minimax_h3_ref4", "minimax_h3_ref9",
                     "minimax_h3_ref_2pass", "minimax_h3_talk1", "minimax_h3_talk2"):
            with self.subTest(graph=name):
                result = model_summary_from_graph(self.real_graph(name))
                self.assertTrue(result["complete"])
                self.assertEqual(result["models"], [{
                    "name": "minimax_h3_ref2va_pruned_int8_convrot.safetensors", "role": "生成主模型",
                    "precision": "INT8", "precision_source": "filename", "loader_dtype": None}])
                self.assertEqual(result["precision_label"], "INT8")
                self.assertEqual({m["role"] for m in result["auxiliary_models"]},
                                 {"辅助VAE", "辅助LoRA", "辅助文本编码器"})
                self.assertNotIn("高噪声", json.dumps(result, ensure_ascii=False))
                self.assertNotIn("低噪声", json.dumps(result, ensure_ascii=False))

    def test_real_depth_model_is_complete_even_without_precision(self):
        for name in ("depth_image", "depth_video"):
            with self.subTest(graph=name):
                self.assertEqual(model_summary_from_graph(self.real_graph(name)), {
                    "models": [{"name": "depth_anything_3_mono_large.safetensors", "role": "深度模型",
                                "precision": None, "precision_source": None, "loader_dtype": None}],
                    "auxiliary_models": [], "complete": True, "precision_label": None,
                    "source": "task_snapshot", "runtime_verified": False})

    def test_real_seedvr_names_roles_and_vae_separation(self):
        for graph, name, precision in (
                ("seedvr2_image_up", "seedvr2_ema_3b_fp8_e4m3fn.safetensors", "FP8"),
                ("seedvr2_video_up", "seedvr2_ema_7b_fp16.safetensors", "FP16")):
            with self.subTest(graph=graph):
                self.assertEqual(model_summary_from_graph(self.real_graph(graph)), {
                    "models": [{"name": name, "role": "放大模型", "precision": precision,
                                "precision_source": "filename", "loader_dtype": None}],
                    "auxiliary_models": [{"name": "ema_vae_fp16.safetensors", "role": "辅助VAE",
                        "precision": "FP16", "precision_source": "filename", "loader_dtype": None}],
                    "complete": True, "precision_label": precision,
                    "source": "task_snapshot", "runtime_verified": False})

    def test_real_gimm_preserves_filename_and_loader_precision(self):
        self.assertEqual(model_summary_from_graph(self.real_graph("gimmvfi_interp")), {
            "models": [{"name": "gimmvfi_r_arb_lpips_fp32.safetensors", "role": "插帧模型",
                        "precision": "FP32", "precision_source": "filename", "loader_dtype": "fp32"}],
            "auxiliary_models": [], "complete": True, "precision_label": "FP32",
            "source": "task_snapshot", "runtime_verified": False})

    def test_depthcrafter_without_filename_and_dynamic_loop_are_not_invented(self):
        for name in ("depthcrafter_video", "minimax_h3_comic20"):
            with self.subTest(graph=name):
                result = model_summary_from_graph(self.real_graph(name))
                self.assertEqual(result["models"], [])
                self.assertFalse(result["complete"])
                self.assertEqual(result["source"], "unrecorded")

    def test_multiple_roles_stay_together_and_auxiliary_loaders_are_not_primary(self):
        graph = self.graph("generator_bf16.safetensors", weight_dtype="fp8_e4m3fn")
        graph.update({
            "depth-model": {"class_type": "LoadDA3Model", "inputs": {"model_name": "depth.safetensors"}},
            "depth": {"class_type": "DA3Inference", "inputs": {"da3_model": ["depth-model", 0], "image": ["3", 0]}},
            "render": {"class_type": "DA3Render", "inputs": {"da3_geometry": ["depth", 0]}},
            "up-model": {"class_type": "SeedVR2LoadDiTModel", "inputs": {"model": "up_fp16.safetensors"}},
            "up": {"class_type": "SeedVR2VideoUpscaler", "inputs": {"dit": ["up-model", 0], "image": ["render", 0]}},
            "interp-model": {"class_type": "DownloadAndLoadGIMMVFIModel", "inputs": {"model": "interp_fp32.safetensors"}},
            "interp": {"class_type": "GIMMVFI_interpolate", "inputs": {"gimmvfi_model": ["interp-model", 0], "images": ["up", 0]}},
            "unused": {"class_type": "UNETLoader", "inputs": {"unet_name": "unused_int8.safetensors"}},
            "unused-vae": {"class_type": "VAELoader", "inputs": {"vae_name": "unused_vae_fp8.safetensors"}},
        })
        graph["4"]["inputs"]["images"] = ["interp", 0]
        result = self.summarize(graph)
        self.assertTrue(result["complete"])
        self.assertEqual({m["role"] for m in result["models"]}, {"生成主模型", "深度模型", "放大模型", "插帧模型"})
        self.assertEqual(len(result["models"]), 4)
        self.assertEqual(result["auxiliary_models"], [])
        self.assertEqual(result["models"][0], {"name": "generator_bf16.safetensors", "role": "生成主模型",
            "precision": "BF16", "precision_source": "filename", "loader_dtype": "fp8_e4m3fn"})
        self.assertIsNone(result["precision_label"])
        self.assertNotIn("unused", json.dumps(result))

    def test_auxiliary_unknown_branches_do_not_change_main_path_completeness(self):
        graph = self.graph("main_fp16.safetensors")
        graph["router"] = {"class_type": "UnknownRouter", "inputs": {"clip": ["clip", 0]}}
        graph["clip"] = {"class_type": "CLIPLoader", "inputs": {"clip_name": "do_not_guess_fp8.safetensors"}}
        graph["encode"] = {"class_type": "CLIPTextEncode", "inputs": {"clip": ["router", 0]}}
        graph["2"]["inputs"]["positive"] = ["encode", 0]
        result = self.summarize(graph)
        self.assertTrue(result["complete"])
        self.assertEqual(result["precision_label"], "FP16")
        self.assertEqual(result["auxiliary_models"], [])

    def test_partial_known_models_do_not_make_unknown_routes_or_cycles_complete(self):
        for kind in ("UnknownRouter", "ModelMergeSimple", "ImageBatch"):
            graph = self.graph("known_bf16.safetensors")
            if kind == "ImageBatch":
                graph["cycle"] = {"class_type": kind, "inputs": {"image1": ["3", 0], "image2": ["cycle", 0]}}
                graph["4"]["inputs"]["images"] = ["cycle", 0]
            else:
                graph["cycle"] = {"class_type": kind, "inputs": {"model1": ["1", 0], "model2": ["cycle", 0]}}
                graph["second"] = {"class_type": "KSampler", "inputs": {"model": ["cycle", 0], "latent_image": ["2", 0]}}
                graph["3"]["inputs"]["samples"] = ["second", 0]
            with self.subTest(kind=kind):
                result = self.summarize(graph)
                self.assertEqual(len(result["models"]), 1)
                self.assertFalse(result["complete"])
                self.assertIsNone(result["precision_label"])

    def test_debug_passthrough_uses_only_the_selected_output_slot(self):
        graph = self.graph("actual_int8.safetensors")
        graph["other"] = {"class_type": "UNETLoader", "inputs": {"unet_name": "not_used_fp8.safetensors"}}
        graph["other-sampler"] = {"class_type": "KSampler", "inputs": {"model": ["other", 0]}}
        graph["debug"] = {"class_type": "VRAM_Debug", "inputs": {"any_input": ["other-sampler", 0], "image_pass": ["3", 0]}}
        graph["4"]["inputs"]["images"] = ["debug", 1]
        result = self.summarize(graph)
        self.assertTrue(result["complete"])
        self.assertEqual([m["name"] for m in result["models"]], ["actual_int8.safetensors"])
        graph["4"]["inputs"]["images"] = ["debug", 2]
        self.assertFalse(self.summarize(graph)["complete"])
        self.assertEqual(self.summarize(graph)["models"], [])

    def test_public_raw_graph_helper_returns_only_safe_summary_and_does_not_mutate(self):
        graph = self.real_graph("seedvr2_image_up")
        graph["5"]["inputs"]["model"] = "C:\\private-directory\\seedvr2_fp8.safetensors"
        graph["3"]["inputs"].update(seed=918273645, prompt="PRIVATE-PROMPT", token="PRIVATE-TOKEN")
        graph["6"]["inputs"]["image"] = "/private-input/image.png"
        graph["secret"] = {"class_type": "Unknown", "inputs": {"model": "PRIVATE-MODEL-TEXT"}}
        before = copy.deepcopy(graph)
        result = model_summary_from_graph(graph)
        self.assertEqual(graph, before)
        self.assertEqual(result["models"][0]["name"], "seedvr2_fp8.safetensors")
        self.assertEqual(set(result), {"models", "auxiliary_models", "complete", "precision_label", "source", "runtime_verified"})
        text = json.dumps(result)
        for secret in ("private-directory", "918273645", "PRIVATE-PROMPT", "PRIVATE-TOKEN", "private-input", "PRIVATE-MODEL-TEXT"):
            self.assertNotIn(secret, text)
        for malformed in (None, [], "not-json", {}, {"bad": None}, {
                "1": {"class_type": [], "inputs": {"model": "PRIVATE"}},
                "2": {"class_type": "SaveImage", "inputs": {"images": ["1", 0]}}}):
            self.assertEqual(model_summary_from_graph(malformed)["models"], [])


class CapacityTests(unittest.TestCase):
    def setUp(self):
        # 公式/证据单测使用小群体；默认 30 条跨 3 天门槛另有真实配置专项验证。
        self.sample_gate = patch("server.capacity.MIN_BASELINE_SAMPLES", 1)
        self.day_gate = patch("server.capacity.MIN_BASELINE_DAYS", 1)
        self.sample_gate.start()
        self.day_gate.start()
        self.addCleanup(self.sample_gate.stop)
        self.addCleanup(self.day_gate.stop)
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        self.store = SimpleNamespace(db=self.db, lock=threading.RLock(), offline_seconds=30)
        self.db.executescript("""
            CREATE TABLE workers (id TEXT PRIMARY KEY, name TEXT, last_seen REAL,
                comfy_online INTEGER, busy INTEGER, capabilities_json TEXT);
            CREATE TABLE cost_events (job_id TEXT PRIMARY KEY, event_kind TEXT DEFAULT 'generation',
                capability TEXT, worker_id TEXT, status TEXT, created_at REAL,
                runtime_seconds REAL, dimensions_json TEXT);
        """)
        self.capacity = CapacityStore(self.store)
        self.worker = self.add_worker()
        self.params = {"workflow_version": "wf-v1", "model_version": "sha256-abcd",
                       "output_kind": "image", "output_count": 1, "steps": 20}
        self.graph = {
            "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "model.safetensors"}},
            "2": {"class_type": "KSampler", "inputs": {"model": ["1", 0], "steps": 20, "seed": 42}},
            "3": {"class_type": "SaveImage", "inputs": {"images": ["2", 0], "filename_prefix": "secret"}},
        }
        self.dims = {"width": 512, "height": 512, "image_count": 2}
        self.payload = self.make_payload()
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def add_worker(self, wid="w1", name="同名机器", **overrides):
        caps = {"host_id": "host-" + wid, "environment_id": "env-v1",
                "telemetry": {"cpu": "CPU A", "os": "Linux", "memory": {"total_bytes": 64 * 1024 ** 3},
                              "gpus": [{"name": "GPU A", "memory_total_bytes": 24 * 1024 ** 3,
                                        "utilization_percent": 80}], "hostname": "绝不能用于合并的名称"},
                "token": "NEVER-PERSIST-TOKEN", "system": {"argv": ["/secret/path"]}}
        caps.update(overrides)
        worker = {"id": wid, "name": name, "last_seen": 1000, "comfy_online": 1,
                  "busy": 0, "capabilities_json": json.dumps(caps)}
        self.db.execute("INSERT INTO workers VALUES (:id,:name,:last_seen,:comfy_online,:busy,:capabilities_json)", worker)
        return worker

    def make_payload(self, capability="image", params=None, dims=None, graph=None):
        return {"capability": capability, "graph": graph or self.graph,
                "capacity_spec": make_spec(capability, self.params if params is None else params,
                                           self.graph if graph is None else graph,
                                           self.dims if dims is None else dims)}

    @staticmethod
    def measurements(total=10, **overrides):
        value = {"prepare_seconds": total * 0.1, "execute_seconds": total * 0.8,
                 "upload_seconds": total * 0.1, "total_seconds": total,
                 "graph_changed": False, "cached_nodes": []}
        value.update(overrides)
        return value

    @staticmethod
    def outputs(count=1, **overrides):
        return [dict({"key": "project/private-image-" + str(i), "kind": "image", "bytes": 1234,
                      "width": 512, "height": 512, "duration": None, "valid": True}, **overrides)
                for i in range(count)]

    def capture(self, job="j1", *, payload=None, worker=None, now=1000, seconds=10,
                status="done", released=True, outputs="default", measurements="default", lease=None):
        worker = worker or self.worker
        lease = lease or "lease-" + job
        with self.store.lock, self.db:
            self.capacity.enqueue(job, payload or self.payload, now)
            attempt = self.capacity.assigned(job, worker, lease, now)
            self.capacity.running(job, worker["id"], lease, now + 1)
            self.capacity.terminal(job, worker["id"], lease, status, now + seconds,
                                   released=released,
                                   outputs=self.outputs() if outputs == "default" else outputs,
                                   measurements=self.measurements(seconds) if measurements == "default" else measurements)
        return attempt

    def historical(self, job="old", *, worker="w1", status="done", runtime=10, capability="image",
                   created=1000, kind="generation", dims=None):
        self.db.execute("INSERT INTO cost_events VALUES (?,?,?,?,?,?,?,?)",
                        (job, kind, capability, worker, status, created, runtime, json.dumps(self.dims if dims is None else dims)))

    def group(self):
        return self.capacity.report()["groups"][0]

    def estimate_payload(self, groups=None, **overrides):
        payload = {"worker_id": "w1", "mode": "verified", "quality": "technical", "hours": 8,
                   "availability": 0.8, "utilization": 0.75,
                   "demands": [{"group_id": g["id"], "quantity": 100} for g in (groups or [self.group()])]}
        payload.update(overrides)
        return payload

    def test_shared_connection_and_outer_rollback_including_schema(self):
        self.assertIs(self.capacity.db, self.store.db)
        self.assertIs(self.capacity.lock, self.store.lock)
        with self.assertRaises(RuntimeError):
            with self.store.lock, self.db:
                self.historical("rollback-cost")
                CapacityStore(self.store)
                self.capacity.enqueue("rollback", self.payload, 1)
                self.capacity.assigned("rollback", self.worker, "secret-lease", 2)
                self.capacity.running("rollback", "w1", "secret-lease", 3)
                self.capacity.record_artifact("rollback", "p/name", self.outputs()[0])
                self.capacity.record_output_recovery("rollback", self.outputs())
                self.capacity.terminal("rollback", "w1", "secret-lease", "done", 12,
                                       released=True, outputs=self.outputs(), measurements=self.measurements())
                self.capacity.review("rollback", {"accepted": 1})
                self.capacity.observe_worker(self.worker, 12)
                self.capacity.update_worker("w1", {"cpu": "CPU B"})
                raise RuntimeError("模拟调度事务失败")
        for table in ("cost_events", "capacity_tasks", "capacity_attempts", "capacity_configs",
                      "capacity_artifacts", "capacity_output_recovery", "capacity_observations", "capacity_worker_metadata"):
            self.assertEqual(self.db.execute("SELECT COUNT(*) FROM " + table).fetchone()[0], 0)

    def test_spec_ignores_private_values_but_keeps_topology_models_and_steps(self):
        a = self.make_payload()["capacity_spec"]
        graph = copy.deepcopy(self.graph)
        graph["2"]["inputs"].update(seed=9999, prompt="敏感提示词", image="/secret/input.png")
        b = self.make_payload(graph=graph)["capacity_spec"]
        self.assertEqual(a["graph_fingerprint"], b["graph_fingerprint"])
        self.assertNotIn("敏感", json.dumps(b, ensure_ascii=False))
        self.assertNotIn("secret", json.dumps(b))
        graph["2"]["inputs"]["steps"] = 30
        c = self.make_payload(graph=graph)["capacity_spec"]
        self.assertNotEqual(a["graph_fingerprint"], c["graph_fingerprint"])
        graph["2"]["inputs"]["model"] = ["3", 0]
        d = self.make_payload(graph=graph)["capacity_spec"]
        self.assertNotEqual(c["graph_fingerprint"], d["graph_fingerprint"])
        graph["1"]["inputs"]["ckpt_name"] = "/private/other/model.safetensors"
        e = self.make_payload(graph=graph)["capacity_spec"]
        self.assertNotEqual(d["graph_fingerprint"], e["graph_fingerprint"])
        self.assertNotIn("/private", json.dumps(e))

    def test_unknown_versions_and_parameters_prevent_baseline(self):
        variants = [self.make_payload(params={"output_count": 1}),
                    self.make_payload(graph={**self.graph, "4": {"class_type": "Custom", "inputs": {"mystery": "fast"}}}),
                    self.make_payload(params={**self.params, "model_version": "latest"}),
                    self.make_payload(dims={"megapixels": 1}),
                    self.make_payload(params={k: v for k, v in self.params.items() if k != "output_count"})]
        for index, payload in enumerate(variants):
            self.capture("unknown" + str(index), payload=payload)
        self.assertTrue(all(not g["eligible"] for g in self.capacity.report()["groups"]))

    def test_entire_history_over_2000_and_api_excluded_same_capability(self):
        for index in range(2501):
            self.historical("old-" + str(index), runtime=10 + index % 2)
        self.historical("api", kind="api", runtime=100000)
        report = self.capacity.report(limit=2, offset=2000)
        self.assertEqual(report["overview"]["tasks"], 2501)
        self.assertEqual(report["overview"]["excluded_api"], 1)
        self.assertEqual(report["details_total"], 2501)
        self.assertEqual(len(report["details"]), 2)
        self.assertEqual(report["groups"][0]["measured"], 2501)
        self.assertEqual(report["groups"][0]["runtime_seconds"], 26260)
        self.assertIsNone(report["groups"][0]["output_count"])
        self.assertIsNone(report["groups"][0]["occupied_seconds"])
        self.assertFalse(report["groups"][0]["eligible"])
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM cost_events").fetchone()[0], 2502)

    def test_history_null_zero_and_anomalies_retained_pending_excluded_from_speed(self):
        for i, value in enumerate((None, 0, 0.25, 4000)):
            self.historical("old" + str(i), runtime=value)
        self.historical("pending", status="running", runtime=12345)
        self.historical("failed", status="error", runtime=20)
        group = self.group()
        self.assertEqual(group["samples"], 6)
        self.assertEqual(group["done"], 4)
        self.assertEqual(group["measured"], 3)
        self.assertEqual(group["runtime_seconds"], 4000.25)
        self.assertAlmostEqual(group["mean_seconds"], 4000.25 / 3)
        self.assertIn("耗时未知", "".join(group["warnings"]))
        self.assertIn("异常", "".join(group["warnings"]))
        self.assertEqual(group["p50_seconds"], 0.25)
        self.assertAlmostEqual(group["p90_seconds"], 3200.05)

    def test_same_name_different_ids_and_removed_worker_not_merged(self):
        self.add_worker("w2", name=self.worker["name"])
        for wid in ("w1", "w2", "removed", None):
            self.historical("old-" + str(wid), worker=wid)
        report = self.capacity.report()
        self.assertEqual(len(report["groups"]), 4)
        self.assertEqual(report["overview"]["unknown_worker"], 2)
        self.assertEqual({w["id"] for w in report["workers"]}, {"w1", "w2", "removed"})
        removed = next(w for w in report["workers"] if w["id"] == "removed")
        self.assertEqual(removed["state"], "historical")
        self.assertEqual(removed["config_state"], "historical_unknown")
        self.assertIsNone(removed["hardware"]["host_id"])
        self.assertEqual(self.capacity.report(worker_id="w2")["overview"]["tasks"], 1)

    def test_historical_groups_use_all_known_dimensions(self):
        self.historical("a", dims={"duration": 5, "source_duration": 5.02, "source_frames": 120})
        self.historical("b", dims={"duration": 5, "source_duration": 5.02, "source_frames": 121})
        self.assertEqual(len(self.capacity.report()["groups"]), 2)

    def test_capture_merges_ledger_by_job_id_and_does_not_mutate_costs(self):
        self.historical("j1", runtime=7)
        original = tuple(self.db.execute("SELECT * FROM cost_events").fetchone())
        self.capture()
        report = self.capacity.report()
        self.assertEqual(report["overview"]["tasks"], 1)
        self.assertEqual(report["overview"]["captured_tasks"], 1)
        self.assertEqual(report["details"][0]["runtime_seconds"], 7)
        self.assertEqual(tuple(self.db.execute("SELECT * FROM cost_events").fetchone()), original)
        self.historical("api-captured", kind="api")
        self.capture("api-captured")
        self.assertEqual(self.capacity.report()["overview"]["tasks"], 1)

    def test_enqueued_only_and_queued_cancellation_have_no_speed_or_attempts(self):
        self.capacity.enqueue("pending", self.payload, 1000)
        self.capacity.enqueue("canceled", self.payload, 1001)
        self.capacity.canceled_queued("canceled", 1002)
        report = self.capacity.report()
        self.assertEqual(report["overview"]["canceled"], 1)
        self.assertTrue(all(not d["attempts"] for d in report["details"]))
        self.assertIsNone(report["groups"][0]["mean_seconds"])
        self.assertIsNone(report["groups"][0]["occupied_seconds"])
        self.assertFalse(report["groups"][0]["eligible"])

    def test_legacy_assigned_does_not_invent_spec_or_baseline(self):
        self.capacity.assigned("legacy", self.worker, "old-lease", 1000)
        self.capacity.terminal("legacy", "w1", "old-lease", "done", 1010,
                               released=True, outputs=self.outputs(), measurements=self.measurements())
        self.assertFalse(self.group()["eligible"])
        self.assertIsNone(self.group()["output_count"])
        self.assertIn("旧任务", "".join(self.group()["warnings"]))

    def test_complete_baseline_and_all_failure_attempts_counted(self):
        with self.store.lock, self.db:
            self.capacity.enqueue("retry", self.payload, 1000)
            first = self.capacity.assigned("retry", self.worker, "lease-fail", 1000)
            self.capacity.terminal("retry", "w1", "lease-fail", "error", 1020,
                                   released=True, measurements=self.measurements(20))
            second = self.capacity.assigned("retry", self.worker, "lease-success", 1030)
            self.capacity.running("retry", "w1", "lease-success", 1031)
            self.capacity.terminal("retry", "w1", "lease-success", "done", 1060,
                                   released=True, outputs=self.outputs(), measurements=self.measurements(30))
        self.capture("final-error", now=2000, status="error", seconds=10, outputs=[])
        group = self.group()
        self.assertNotEqual(first, second)
        self.assertTrue(group["eligible"], group["warnings"])
        self.assertEqual(group["samples"], 2)
        self.assertEqual(group["done"], 1)
        self.assertEqual(group["error"], 1)
        self.assertEqual(group["occupied_seconds"], 60)
        self.assertEqual(group["seconds_per_unit"], 60)
        self.assertEqual(group["output_count"], 1)
        report = self.capacity.report()
        retry = next(d for d in report["details"] if d["job_id"] == "retry")
        self.assertEqual(len(retry["attempts"]), 2)
        self.assertNotIn("lease_hash", json.dumps(report))
        self.assertNotIn("lease-fail", json.dumps(report))

    def test_duplicate_enqueue_assign_start_terminal_are_idempotent(self):
        first = self.capture()
        self.capacity.enqueue("j1", self.make_payload(dims={"width": 1024, "height": 1024}), 9999)
        second = self.capacity.assigned("j1", self.worker, "lease-j1", 8888)
        self.capacity.running("j1", "w1", "lease-j1", 3000)
        self.capacity.terminal("j1", "w1", "lease-j1", "error", 9999,
                               released=True, outputs=[], measurements=self.measurements(200))
        detail = self.capacity.report()["details"][0]
        self.assertEqual(first, second)
        self.assertEqual(len(detail["attempts"]), 1)
        self.assertEqual(detail["attempts"][0]["started_at"], 1001)
        self.assertEqual(detail["attempts"][0]["released_at"], 1010)
        self.assertEqual(detail["status"], "done")
        self.assertEqual(detail["spec"]["dimensions"]["width"], 512)
        self.assertEqual(detail["output_count"], 1)

    def test_expired_reassign_late_callback_and_release_do_not_erase_history(self):
        self.capacity.enqueue("j1", self.payload, 1000)
        self.capacity.assigned("j1", self.worker, "old", 1000)
        self.capacity.running("j1", "w1", "old", 1001)
        self.capacity.expired("j1", "w1", 1020)
        self.capture("j1", now=1030, lease="new")
        self.capacity.terminal("j1", "w1", "old", "done", 1045, released=True,
                               outputs=self.outputs(3), measurements=self.measurements())
        detail = self.capacity.report()["details"][0]
        self.assertEqual(detail["status"], "done")
        self.assertEqual(detail["output_count"], 1)
        self.assertEqual(len(detail["attempts"]), 2)
        self.assertEqual(detail["attempts"][0]["status"], "expired")
        self.assertIsNone(detail["attempts"][0]["occupied_seconds"])
        self.assertTrue(detail["attempts"][0]["gap"])
        self.assertFalse(self.group()["eligible"])

    def test_legacy_release_unknown_and_trusted_idle_can_confirm(self):
        self.capture(released=False)
        self.assertIsNone(self.group()["occupied_seconds"])
        self.capacity.observe_worker(self.worker, 1011)
        self.assertIsNone(self.group()["occupied_seconds"])
        self.capacity.observe_worker(self.worker, 1012, released=True)
        self.assertEqual(self.group()["occupied_seconds"], 12)
        self.assertTrue(self.group()["eligible"])
        # 释放确认不受 60 秒采样限频影响。
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM capacity_observations").fetchone()[0], 1)

    def test_expired_idle_never_upgrades_gap_to_verified(self):
        self.capacity.enqueue("lost", self.payload, 1000)
        self.capacity.assigned("lost", self.worker, "lease", 1000)
        self.capacity.expired("lost", "w1", 1010)
        self.capacity.observe_worker(self.worker, 1020, released=True)
        detail = self.capacity.report()["details"][0]
        self.assertTrue(detail["attempts"][0]["release_known"])
        self.assertIsNone(detail["attempts"][0]["occupied_seconds"])
        self.assertFalse(self.group()["eligible"])

    def test_observation_rate_limit_retention_and_hardware_whitelist(self):
        for now in (1000, 1010, 1059, 1060):
            self.capacity.observe_worker(self.worker, now)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM capacity_observations").fetchone()[0], 2)
        encoded = " ".join(r[0] for r in self.db.execute("SELECT hardware_json FROM capacity_configs"))
        self.assertNotIn("hostname", encoded)
        self.assertNotIn("NEVER-PERSIST", encoded)
        self.assertNotIn("/secret", encoded)
        self.assertNotIn("utilization", encoded)
        self.capacity.observe_worker(self.worker, 30 * 86400 + 1061)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM capacity_observations").fetchone()[0], 1)

    def test_first_snapshot_is_immutable_and_config_change_splits_groups(self):
        self.capture()
        old = self.group()["config"]
        changed = dict(self.worker)
        caps = json.loads(changed["capabilities_json"])
        caps["telemetry"]["gpus"][0]["name"] = "GPU B"
        changed["capabilities_json"] = json.dumps(caps)
        self.capture("j2", worker=changed, now=2000)
        groups = self.capacity.report()["groups"]
        self.assertEqual(len(groups), 2)
        self.assertEqual(old["gpus"][0]["name"], "GPU A")
        self.assertEqual({g["config"]["gpus"][0]["name"] for g in groups}, {"GPU A", "GPU B"})
        with self.assertRaises(ValueError):
            self.capacity.estimate(self.estimate_payload(groups))

    def test_manual_hardware_and_host_binding_prospective_only(self):
        self.capture()
        original = self.group()["config_id"]
        with patch("server.capacity.time.time", return_value=1500):
            meta = self.capacity.update_worker("w1", {"cpu": "CPU B", "host_id": "confirmed-host"})
        self.capture("j2", now=2000)
        groups = self.capacity.report()["groups"]
        old = next(g for g in groups if g["config_id"] == original)
        new = next(g for g in groups if g["config_id"] != original)
        self.assertEqual(old["config"]["cpu"], "CPU A")
        self.assertEqual(new["config"]["cpu"], "CPU B")
        self.assertEqual(new["config_source"], "manual+reported")
        self.assertEqual(meta["valid_from"], 1500)
        self.assertEqual(json.loads(self.db.execute("SELECT capabilities_json FROM workers").fetchone()[0])["telemetry"]["cpu"], "CPU A")
        with self.assertRaises(ValueError):
            self.capacity.update_worker("w1", {"valid_from": 0, "cpu": "fake"})
        with self.assertRaises(KeyError):
            self.capacity.update_worker("missing", {"cpu": "CPU"})

    def test_host_identity_not_hostname_and_shared_host_requires_validation(self):
        second = self.add_worker("w2")
        self.capture()
        self.capture("j2", worker=second)
        self.assertTrue(all(g["eligible"] for g in self.capacity.report()["groups"]))
        caps = json.loads(second["capabilities_json"])
        caps["telemetry"]["host_id"] = "host-w1"
        second["capabilities_json"] = json.dumps(caps)
        self.capture("j3", worker=second, now=3000)
        self.assertTrue(all(not g["eligible"] for g in self.capacity.report()["groups"]
                            if g["config"]["host_id"] == "host-w1"))

    def test_missing_outputs_invalid_outputs_dedup_and_mismatch(self):
        self.capture("missing", outputs=None)
        self.capture("invalid", outputs=self.outputs(valid=False))
        self.capture("mismatch", outputs=self.outputs(width=1024))
        report = self.capacity.report()
        by_id = {d["job_id"]: d for d in report["details"]}
        self.assertIsNone(by_id["missing"]["output_count"])
        self.assertEqual(by_id["invalid"]["output_count"], 0)
        self.assertEqual(by_id["mismatch"]["output_count"], 0)
        self.assertFalse(self.group()["eligible"])
        self.capture("dedup", now=2000, outputs=self.outputs() * 2)
        detail = self.capacity.report()["details"][0]
        self.assertEqual(detail["output_count"], 1)
        self.assertEqual(len(detail["outputs"]), 1)
        self.assertNotIn("private-image", json.dumps(detail))

    def test_image_input_count_not_output_count_and_video_uses_actual_duration(self):
        self.capture()
        self.assertEqual(self.group()["output_count"], 1)
        params = {**self.params, "output_kind": "video"}
        dims = {**self.dims, "duration": 5, "source_duration": 100}
        self.capture("video", payload=self.make_payload("video", params=params, dims=dims),
                     outputs=self.outputs(kind="video", duration=5.05))
        report = self.capacity.report()
        self.assertEqual(report["overview"]["output_videos"], 1)
        self.assertAlmostEqual(report["overview"]["output_seconds"], 5.05)
        self.assertEqual(report["overview"]["output_images"], 1)
        self.assertTrue(all(g["eligible"] for g in report["groups"]))

    def test_cache_ids_types_and_unknown_graph_changes_never_baseline(self):
        self.capture("partial", measurements=self.measurements(cached_nodes=[{"id": "1", "type": "CheckpointLoaderSimple"}]))
        self.capture("changed", measurements=self.measurements(graph_changed=True))
        self.capture("old", measurements=None)
        groups = {g["cache_condition"]["kind"]: g for g in self.capacity.report()["groups"]}
        self.assertTrue(groups["loaders"]["eligible"])
        self.assertIn("加载节点部分缓存", "".join(groups["loaders"]["warnings"]))
        self.assertFalse(groups["none"]["eligible"])
        self.assertFalse(groups["unknown"]["eligible"])
        self.capacity.enqueue("server-cache", self.payload, 2000)
        self.capacity.assigned("server-cache", self.worker, "cache-lease", 2000)
        self.capacity.cache("server-cache", "w1", "cache-lease", ["1"])
        self.capacity.cache("server-cache", "w1", "cache-lease", [{"id": "2", "type": "KSampler"}])
        self.capacity.terminal("server-cache", "w1", "cache-lease", "done", 2010,
                               released=True, outputs=self.outputs(), measurements=self.measurements())
        detail = self.capacity.report()["details"][0]
        self.assertEqual(len(detail["attempts"][0]["cached_nodes"]), 2)
        self.assertEqual(detail["cache_condition"]["kind"], "execution")
        self.assertFalse(next(g for g in self.capacity.report()["groups"] if g["id"] == detail["group_id"])["eligible"])

    def test_measurement_whitelist_bounds_finite_and_consistency(self):
        for index, bad in enumerate((math.inf, math.nan, -1, True, "12", 31 * 86400)):
            with self.subTest(bad=bad):
                self.capture("bad" + str(index), measurements=self.measurements(total_seconds=bad))
        self.assertTrue(all(d["status"] == "done" for d in self.capacity.report()["details"]))
        self.assertIn("计时数据无效", "".join(self.group()["warnings"]))
        self.capture("whitelist", measurements=self.measurements(prompt="DO-NOT-PERSIST", path="/secret"))
        row = self.db.execute("SELECT measurements_json FROM capacity_attempts").fetchone()[0]
        self.assertNotIn("DO-NOT-PERSIST", row)
        self.assertNotIn("secret", row)
        self.capture("bad-sum", measurements=self.measurements(10, execute_seconds=100))
        self.assertFalse(self.group()["eligible"])
        self.capacity.enqueue("x", self.payload, 2000)
        self.capacity.assigned("x", self.worker, "lease", 2000)
        self.capacity.cache("x", "w1", "lease", ["1"] * 2049)
        self.capacity.cache("x", "w1", "lease", [])
        self.capacity.terminal("x", "w1", "lease", "done", 2010, released=True,
                               outputs=self.outputs(), measurements=self.measurements())
        detail = self.capacity.report()["details"][0]
        self.assertTrue(detail["attempts"][0]["cache_invalid"])
        self.assertIn("缓存节点记录无效", "".join(detail["warnings"]))

    def test_artifact_registry_is_upserted_deduplicated_job_scoped_and_safe(self):
        key = "project/stored.png"
        with self.store.lock, self.db:
            self.capacity.record_artifact("j1", key, {**self.outputs()[0], "prompt": "NEVER-STORE"})
            self.capacity.record_artifact("j1", key, {**self.outputs()[0], "bytes": 4321})
        results = self.capacity.artifact_outputs("j1", [key, key, "project/missing.png"])
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["key"], key)
        self.assertEqual(results[0]["bytes"], 4321)
        self.assertFalse(results[1]["valid"])
        self.assertEqual(self.capacity.artifact_outputs("j2", [key]), [{"key": key, "valid": False}])
        stored = self.db.execute("SELECT * FROM capacity_artifacts").fetchone()
        self.assertNotIn("stored.png", str(tuple(stored)))
        self.assertNotIn("NEVER-STORE", str(tuple(stored)))
        self.capture(outputs=results[:1])
        self.assertTrue(self.group()["eligible"])

    def test_mixed_formula_failed_loss_not_deducted_twice(self):
        self.capture("success", seconds=100)
        self.capture("failure", seconds=50, status="error", outputs=[])
        self.capture("second-spec", payload=self.make_payload("other"), seconds=20)
        groups = self.capacity.report()["groups"]
        by_cap = {g["capability"]: g for g in groups}
        payload = self.estimate_payload(groups, hours=1, availability=1, utilization=1, price=5000,
            demands=[{"group_id": by_cap["image"]["id"], "quantity": 20},
                     {"group_id": by_cap["other"]["id"], "quantity": 100}])
        estimate = self.capacity.estimate(payload)
        self.assertEqual(estimate["total_seconds"], 20 * 150 + 100 * 20)
        self.assertEqual(estimate["daily_capacity_seconds"], 3600)
        self.assertEqual(estimate["machines"], 2)
        self.assertEqual(estimate["price_total"], 10000)
        self.assertEqual(estimate["lines"][0]["daily_units"], 24)

    def test_estimate_validation_and_server_recomputed_speeds(self):
        self.capture()
        for key, bad in (("hours", 0), ("hours", 25), ("hours", math.nan), ("availability", 0),
                         ("utilization", 1.01), ("price", -1), ("price", math.inf), ("hours", True),
                         ("demands", []), ("demands", [{}] * 51), ("mode", "unknown"),
                         ("mode", []), ("quality", {})):
            with self.subTest(key=key, bad=bad), self.assertRaises(ValueError):
                self.capacity.estimate(self.estimate_payload(**{key: bad}))
        for bad in (-1, math.inf, math.nan, True, "10"):
            with self.subTest(quantity=bad), self.assertRaises(ValueError):
                self.capacity.estimate(self.estimate_payload(demands=[{"group_id": self.group()["id"], "quantity": bad}]))
        with self.assertRaises(ValueError):
            self.capacity.estimate(self.estimate_payload(demands=[{"group_id": "made-up", "quantity": 0}]))
        with self.assertRaises(ValueError):
            self.capacity.estimate(self.estimate_payload(worker_id="w2"))
        payload = self.estimate_payload(seconds_per_unit=0.01)
        payload["demands"][0]["seconds_per_unit"] = 0.01
        result = self.capacity.estimate(payload)
        self.assertEqual(result["total_seconds"], 1000)
        zero = self.capacity.estimate(self.estimate_payload(demands=[{"group_id": self.group()["id"], "quantity": 0}], price=0))
        self.assertEqual(zero["machines"], 0)
        self.assertEqual(zero["price_total"], 0)

    def test_historical_only_reference_not_verified_or_accepted(self):
        self.historical(runtime=100)
        group = self.group()
        result = self.capacity.estimate(self.estimate_payload(mode="historical"))
        self.assertEqual(result["total_seconds"], 10000)
        self.assertIn("成功任务 runtime", "".join(result["warnings"]))
        with self.assertRaises(ValueError):
            self.capacity.estimate(self.estimate_payload())
        with self.assertRaises(ValueError):
            self.capacity.estimate(self.estimate_payload(mode="historical", quality="accepted"))
        self.assertEqual(group["source"], "historical")

    def test_manual_review_full_cohort_zero_rejections_and_clear(self):
        self.capture("a", seconds=10)
        self.capture("b", seconds=10)
        self.capture("failed", seconds=10, status="error", outputs=[])
        self.capacity.review("a", {"accepted": 1, "source": "business", "note": "已验收"})
        self.capacity.review("b", {"accepted": 0})
        with self.assertRaises(ValueError):
            self.capacity.estimate(self.estimate_payload(quality="accepted"))
        self.capacity.review("failed", {"accepted": 0})
        group = self.group()
        self.assertEqual(group["qualified_seconds_per_unit"], 30)
        self.assertEqual(group["seconds_per_unit"], 15)
        result = self.capacity.estimate(self.estimate_payload(quality="accepted"))
        self.assertEqual(result["total_seconds"], 3000)
        self.capacity.review("a", {"accepted": None})
        self.assertIsNone(self.group()["qualified_seconds_per_unit"])
        for payload in ({"accepted": 2}, {"accepted": True}, {"accepted": -1}, {"accepted": 0.5},
                        {"source": "fake"}, {"source": []}, {"source": {}},
                        {"note": "x" * 501}, {"benchmark_id": "x" * 101}):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                self.capacity.review("a", payload)
        with self.assertRaises(KeyError):
            self.capacity.review("missing", {"accepted": None})

    def test_standard_manual_label_never_bypasses_unknown_evidence(self):
        self.capture(outputs=None)
        review = self.capacity.review("j1", {"accepted": None, "source": "standard", "benchmark_id": "test-v1"})
        self.assertEqual(review["benchmark_id"], "test-v1")
        self.assertEqual(self.group()["source"], "standard")
        self.assertFalse(self.group()["eligible"])
        with self.assertRaises(ValueError):
            self.capacity.estimate(self.estimate_payload())
        self.historical("old")
        self.capacity.review("old", {"accepted": None, "source": "standard", "benchmark_id": "old-v1", "note": "仅声明，不补造证据"})
        old = next(d for d in self.capacity.report()["details"] if d["job_id"] == "old")
        self.assertEqual(old["source"], "historical")
        self.assertEqual(old["review"]["source"], "standard")
        with self.assertRaises(ValueError):
            self.capacity.review("old", {"accepted": 0})

    def test_date_filters_half_open_pagination_and_validation(self):
        self.historical("a", created=1000)
        self.historical("b", created=2000)
        self.historical("c", created=3000)
        report = self.capacity.report(start=1000, end=3000, limit=1, offset=1)
        self.assertEqual(report["overview"]["tasks"], 2)
        self.assertEqual(report["details"][0]["job_id"], "a")
        self.assertEqual(self.capacity.report(start="1970-01-01T00:16:40Z", end=2000)["overview"]["tasks"], 1)
        for kwargs in ({"start": "nonsense"}, {"start": math.nan}, {"start": 2, "end": 1},
                       {"limit": 0}, {"limit": 1001}, {"offset": -1}, {"offset": True}):
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                self.capacity.report(**kwargs)

    def test_cross_worker_retry_not_single_machine_baseline(self):
        self.capture("retry", status="error", outputs=[])
        worker2 = self.add_worker("w2")
        self.capture("retry", worker=worker2, now=2000, lease="second")
        group = self.group()
        self.assertFalse(group["eligible"])
        self.assertIn("跨 Worker", "".join(group["warnings"]))
        self.assertEqual(group["occupied_seconds"], 20)

    def test_csv_formula_injection_full_spec_and_no_secrets(self):
        for name in ("=HYPERLINK(1)", "+cmd", "-cmd", "@SUM(1)", "  =1+1", "\t=1+1"):
            report = {"period": {"from": 1, "to": 2}, "groups": [{"worker_name": name,
                       "dimensions": {"width": 512}, "spec": {"model_version": "v1"},
                       "days": ["2026-10-08"], "samples": 5, "warnings": ["证据不足"]}]}
            rows = list(csv.DictReader(io.StringIO(export_csv(report).lstrip("\ufeff"))))
            self.assertTrue(rows[0]["worker_name"].startswith("'"))
            self.assertIn("model_version", rows[0]["spec"])
            self.assertIn("2026-10-08", rows[0]["days"])
        self.capture()
        text = export_csv(self.capacity.report())
        self.assertNotIn("lease-j1", text)
        self.assertNotIn("private-image", text)
        self.assertNotIn("filename_prefix", text)
        self.assertNotIn("NEVER-PERSIST", text)

    def test_standard_review_requires_nonempty_backend_benchmark_id(self):
        self.capture()
        for value in (None, "", "   ", "\t", 42, []):
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.capacity.review("j1", {"source": "standard", "benchmark_id": value})
        self.assertEqual(self.capacity.report()["details"][0]["review"]["source"], "business")
        review = self.capacity.review("j1", {"source": "standard", "benchmark_id": "  bench-v1  "})
        self.assertEqual(review["benchmark_id"], "bench-v1")
        self.historical("historical")
        with self.assertRaises(ValueError):
            self.capacity.review("historical", {"source": "standard"})

    def test_estimate_rejects_duplicate_groups_even_zero_quantity(self):
        self.capture()
        group_id = self.group()["id"]
        for mode in ("historical", "verified"):
            for quantity in (0, 1):
                with self.subTest(mode=mode, quantity=quantity), self.assertRaisesRegex(ValueError, "重复"):
                    self.capacity.estimate(self.estimate_payload(mode=mode, demands=[
                        {"group_id": group_id, "quantity": 1}, {"group_id": group_id, "quantity": quantity}]))

    def test_estimate_rejects_mixed_sources_and_benchmarks_but_same_benchmark_works(self):
        self.capture("a", payload=self.make_payload("first"))
        self.capture("b", payload=self.make_payload("second"))
        self.capacity.review("b", {"source": "standard", "benchmark_id": "benchmark-v1"})
        for mode in ("historical", "verified"):
            with self.subTest(mode=mode), self.assertRaisesRegex(ValueError, "相同来源"):
                self.capacity.estimate(self.estimate_payload(self.capacity.report()["groups"], mode=mode))
        self.capacity.review("a", {"source": "standard", "benchmark_id": "benchmark-v2"})
        for mode in ("historical", "verified"):
            with self.subTest(mode=mode), self.assertRaisesRegex(ValueError, "相同基准"):
                self.capacity.estimate(self.estimate_payload(self.capacity.report()["groups"], mode=mode))
        self.capacity.review("a", {"source": "standard", "benchmark_id": "benchmark-v1"})
        result = self.capacity.estimate(self.estimate_payload(self.capacity.report()["groups"]))
        self.assertEqual(result["total_seconds"], 2000)

    def test_cache_conditions_separate_loader_reference_without_hiding_failure_loss(self):
        self.capture("cold", seconds=20)
        self.capture("warm", seconds=10, measurements=self.measurements(cached_nodes=[{"id": "1", "type": "CheckpointLoaderSimple"}]))
        groups = self.capacity.report()["groups"]
        self.assertEqual(len(groups), 2)
        self.assertEqual({g["cache_condition"]["kind"] for g in groups}, {"none", "loaders"})
        self.assertTrue(all(g["eligible"] for g in groups))
        self.assertIn("cache_condition", export_csv(self.capacity.report()))
        self.capture("failed", status="error", outputs=[], measurements={"total_seconds": 10})
        groups = self.capacity.report()["groups"]
        self.assertTrue(all(not g["eligible"] for g in groups))
        self.assertTrue(all("完整失败损耗归属不足" in "".join(g["warnings"]) for g in groups))
        self.assertEqual(sum(g["occupied_seconds"] for g in groups), 40)

    def test_cache_types_must_match_frozen_graph_and_server_ids_are_resolved(self):
        self.capture("lying-type", measurements=self.measurements(cached_nodes=[{"id": "2", "type": "CheckpointLoaderSimple"}]))
        self.assertEqual(self.group()["cache_condition"]["kind"], "unknown")
        self.assertFalse(self.group()["eligible"])
        self.capacity.enqueue("server-id", self.payload, 2000)
        self.capacity.assigned("server-id", self.worker, "lease-id", 2000)
        self.capacity.running("server-id", "w1", "lease-id", 2001)
        self.capacity.cache("server-id", "w1", "lease-id", ["1"])
        self.capacity.terminal("server-id", "w1", "lease-id", "done", 2010, released=True,
                               outputs=self.outputs(), measurements=self.measurements())
        group = next(g for g in self.capacity.report()["groups"] if g["cache_condition"]["kind"] == "loaders")
        self.assertTrue(group["eligible"])
        self.assertEqual(group["cache_condition"]["nodes"], [{"id": "1", "type": "CheckpointLoaderSimple"}])

    def test_artifact_statistical_limit_does_not_block_large_delivery(self):
        keys = ["output/" + str(index) for index in range(513)]
        self.assertIsNone(self.capacity.artifact_outputs("large", keys))
        self.capture("large", outputs=self.capacity.artifact_outputs("large", keys))
        detail = self.capacity.report()["details"][0]
        self.assertEqual(detail["status"], "done")
        self.assertIsNone(detail["outputs"])
        self.assertIsNone(detail["output_count"])
        self.assertFalse(self.group()["eligible"])
        self.assertEqual(len(self.capacity.artifact_outputs("large", keys[:512])), 512)

    def test_actual_manifest_graph_worker_version_and_default_baseline_gate(self):
        self.sample_gate.stop()
        self.day_gate.stop()
        graph_path = Path(__file__).resolve().parents[1] / "graphs" / "qwen_image_2512_t2i.api.json"
        graph = json.loads(graph_path.read_text(encoding="utf-8"))
        # 与实际提交相同：无前端虚构版本/count，只有能力内部输出类型和已解析图。
        payload = self.make_payload("qwen_image_2512_t2i", params={"output_kind": "image"}, dims={}, graph=graph)
        self.assertEqual(payload["capacity_spec"]["expected"], {"kind": "image", "width": 1024, "height": 1024, "count": 1})
        self.assertTrue(payload["capacity_spec"]["workflow_version"].startswith("graph:"))
        self.assertFalse(payload["capacity_spec"]["complete"])
        hardware = {"host_id": "real-host", "cpu": {"model": "CPU A", "architecture": "x86_64", "logical_cores": 32,
                                                    "secret": "DO-NOT-STORE"},
                    "os": {"name": "Linux", "release": "6.8", "version": "build-1"},
                    "memory_total_bytes": 64 * 1024 ** 3, "environment_id": "env-v1", "model_version": "models-v1",
                    "execution_device": [{"name": "GPU A", "type": "cuda", "index": 0, "vram_total": 24 * 1024 ** 3,
                                          "argv": "/private/path"}]}
        worker = dict(self.worker)
        caps = json.loads(worker["capabilities_json"])
        caps["hardware"] = hardware
        caps["telemetry"].update(hardware)
        worker["capabilities_json"] = json.dumps(caps)
        self.capture("actual-0", payload=payload, worker=worker, outputs=self.outputs(width=1024, height=1024))
        group = self.group()
        self.assertFalse(group["eligible"])
        self.assertEqual(group["spec"]["model_version"], "models-v1")
        self.assertEqual(group["spec"]["model_version_source"], "worker_snapshot")
        self.assertEqual(group["config"]["cpu"]["logical_cores"], 32)
        self.assertEqual(group["config"]["os"]["release"], "6.8")
        self.assertEqual(group["config"]["execution_device"][0]["type"], "cuda")
        self.assertNotIn("DO-NOT-STORE", json.dumps(group))
        self.assertNotIn("/private/path", json.dumps(group))
        with self.assertRaises(ValueError):
            self.capacity.estimate(self.estimate_payload())
        for index in range(1, 30):
            self.capture("actual-" + str(index), payload=payload, worker=worker,
                         now=1000 + (index % 3) * 86400 + index * 20,
                         outputs=self.outputs(width=1024, height=1024))
        group = self.group()
        self.assertEqual(group["samples"], 30)
        self.assertEqual(len(group["days"]), 3)
        self.assertTrue(group["eligible"], group["warnings"])
        self.assertEqual(self.capacity.estimate(self.estimate_payload())["total_seconds"], 1000)
        stored = json.loads(self.db.execute("SELECT spec_json FROM capacity_tasks LIMIT 1").fetchone()[0])
        self.assertIsNone(stored["model_version"])
        # 后续模型版本变化只创建新配置，不污染已经冻结的旧样本。
        caps["telemetry"]["model_version"] = "models-v2"
        worker["capabilities_json"] = json.dumps(caps)
        self.capture("new-model", payload=payload, worker=worker, now=300000,
                     outputs=self.outputs(width=1024, height=1024))
        self.assertEqual(len(self.capacity.report()["groups"]), 2)
        self.assertEqual(next(g for g in self.capacity.report()["groups"] if g["samples"] == 30)["spec"]["model_version"], "models-v1")

    def test_partial_failure_stages_with_confirmed_release_count_as_loss(self):
        self.capture("success", seconds=20)
        self.capture("prepare-failed", status="error", seconds=10, outputs=[], measurements={"total_seconds": 10})
        self.capture("execute-failed", status="error", seconds=10, outputs=[],
                     measurements={"prepare_seconds": 2, "total_seconds": 10, "graph_changed": False})
        group = self.group()
        self.assertEqual(group["occupied_seconds"], 40)
        self.assertEqual(group["seconds_per_unit"], 40)
        self.assertTrue(group["eligible"], group["warnings"])

    def test_different_standard_benchmarks_do_not_share_groups(self):
        self.capture("standard-a")
        self.capture("standard-b")
        self.capacity.review("standard-a", {"source": "standard", "benchmark_id": "material-set-v1"})
        self.capacity.review("standard-b", {"source": "standard", "benchmark_id": "material-set-v2"})
        groups = self.capacity.report()["groups"]
        self.assertEqual(len(groups), 2)
        self.assertEqual({g["benchmark_id"] for g in groups}, {"material-set-v1", "material-set-v2"})

    def test_manual_disk_and_note_without_note_leaking_into_hardware_export(self):
        with patch("server.capacity.time.time", return_value=500):
            result = self.capacity.update_worker("w1", {"disk": "NVMe 2TB", "note": "私有采购备注"})
        self.assertEqual(result["note"], "私有采购备注")
        self.capture()
        self.assertEqual(self.group()["config"]["disk"], "NVMe 2TB")
        self.assertNotIn("私有采购备注", export_csv(self.capacity.report()))

    def test_worker_current_state_priority_does_not_deduplicate_names(self):
        self.db.execute("ALTER TABLE workers ADD COLUMN enabled INTEGER DEFAULT 1")
        self.db.execute("ALTER TABLE workers ADD COLUMN sync_status TEXT")
        self.db.execute("UPDATE workers SET enabled=0,last_seen=1000 WHERE id='w1'")
        with patch("server.capacity.time.time", return_value=1005):
            self.assertEqual(self.capacity.report()["workers"][0]["state"], "disabled")
            self.db.execute("UPDATE workers SET sync_status='running' WHERE id='w1'")
            self.assertEqual(self.capacity.report()["workers"][0]["state"], "syncing")
        with patch("server.capacity.time.time", return_value=2000):
            self.assertEqual(self.capacity.report()["workers"][0]["state"], "offline")

    def test_report_group_ids_stable_across_query_times(self):
        self.capture()
        first = self.capacity.report(start=0, end=2000)["groups"][0]["id"]
        second = self.capacity.report(start=1, end=3000)["groups"][0]["id"]
        self.assertEqual(first, second)
        result = self.capacity.estimate(self.estimate_payload(groups=[{"id": first}]))
        self.assertEqual(result["lines"][0]["group_id"], first)

    def test_video_fps_probe_registry_and_mismatch(self):
        params = {**self.params, "output_kind": "video"}
        payload = self.make_payload("video", params=params, dims={**self.dims, "duration": 5, "target_fps": 24})
        metadata = self.outputs(kind="video", duration=5, fps=24)[0]
        self.capacity.record_artifact("fps-good", "p/video", metadata)
        registered = self.capacity.artifact_outputs("fps-good", ["p/video"])
        self.assertEqual(registered[0]["fps"], 24)
        self.capture("fps-good", payload=payload, outputs=registered)
        self.assertTrue(self.group()["eligible"])
        self.capture("fps-bad", payload=payload, now=2000, outputs=self.outputs(kind="video", duration=5, fps=12))
        self.assertFalse(self.group()["eligible"])
        self.assertEqual(self.group()["output_count"], 1)

    def test_missing_nullable_measurements_do_not_fail_task(self):
        self.capture(measurements={"prepare_seconds": None, "total_seconds": None, "new_version_field": "ignored"})
        detail = self.capacity.report()["details"][0]
        self.assertEqual(detail["status"], "done")
        self.assertEqual(detail["attempts"][0]["measurements"], {})
        self.assertFalse(self.group()["eligible"])
        self.assertIn("阶段计时不完整", "".join(self.group()["warnings"]))

    def test_late_idle_after_disconnect_keeps_unknown_occupancy(self):
        self.capture(released=False)
        self.capacity.observe_worker(self.worker, 2000, released=True)
        detail = self.capacity.report()["details"][0]
        self.assertTrue(detail["attempts"][0]["release_known"])
        self.assertTrue(detail["attempts"][0]["gap"])
        self.assertIsNone(detail["occupied_seconds"])
        self.assertFalse(self.group()["eligible"])

    def test_captured_anomaly_kept_but_not_verified(self):
        self.capture("long", seconds=4000)
        group = self.group()
        self.assertEqual(group["occupied_seconds"], 4000)
        self.assertEqual(group["runtime_seconds"], 3999)
        self.assertEqual(group["output_count"], 1)
        self.assertFalse(group["eligible"])
        with self.assertRaises(ValueError):
            self.capacity.estimate(self.estimate_payload())

    def test_legacy_attempt_keeps_ledger_actual_date_capability_and_dimensions(self):
        self.historical("old", created=100, capability="old-image", dims={"width": 1024})
        self.capacity.assigned("old", self.worker, "lease", 2000)
        self.capacity.terminal("old", "w1", "lease", "done", 2010)
        detail = self.capacity.report(start=0, end=1000)["details"][0]
        self.assertEqual(detail["capability"], "old-image")
        self.assertEqual(detail["created_at"], 100)
        self.assertEqual(detail["spec"]["dimensions"], {"width": 1024})
        self.assertIsNone(detail["outputs"])
        self.assertFalse(detail["spec"]["complete"])

    def test_extreme_finite_inputs_cannot_produce_infinity_or_zero_division(self):
        self.capture()
        for override in ({"hours": 1e-300, "availability": 1e-300},
                         {"demands": [{"group_id": self.group()["id"], "quantity": 1e308}]},
                         {"price": 1e308, "demands": [{"group_id": self.group()["id"], "quantity": 1e300}]}):
            with self.subTest(override=override), self.assertRaises(ValueError):
                self.capacity.estimate(self.estimate_payload(**override))
        json.dumps(self.capacity.report(), allow_nan=False)

    def test_historical_error_output_count_is_unknown_not_zero(self):
        self.historical(status="error")
        report = self.capacity.report()
        self.assertIsNone(report["details"][0]["output_count"])
        self.assertIsNone(report["details"][0]["outputs"])
        self.assertIsNone(report["groups"][0]["output_count"])

    def test_group_summary_uses_frozen_spec_without_changing_evidence_or_estimates(self):
        graph = ModelSummaryTests.graph("frozen_int8.safetensors", weight_dtype="default")
        payload = self.make_payload(graph=graph)
        self.capture(payload=payload)
        self.historical("j1", runtime=10, created=1000)
        stored = self.db.execute("SELECT spec_json FROM capacity_tasks").fetchone()[0]
        database = list(self.db.iterdump())
        group = self.group()
        self.assertEqual(group["model_summary"], model_summary(json.loads(stored)))
        self.assertEqual(group["last_sample_at"], 1000)
        self.assertEqual(group["spec_key"], json.loads(stored)["spec_key"])
        self.assertTrue(group["eligible"])
        estimate = self.capacity.estimate(self.estimate_payload())
        with patch("server.capacity.model_summary", return_value={"display_only": True}):
            other = self.group()
            self.assertEqual({k: v for k, v in group.items() if k not in {"model_summary", "model_evidence"}},
                             {k: v for k, v in other.items() if k not in {"model_summary", "model_evidence"}})
            self.assertEqual(other["model_evidence"], {"total_samples": 1, "recorded_samples": 0, "variants": []})
            self.assertEqual(self.capacity.estimate(self.estimate_payload()), estimate)
        # 当前调用方模板修改不影响已冻结摘要，报表也不写入任何历史表。
        payload["capacity_spec"]["graph"]["1"]["inputs"]["unet_name"]["name"] = "current_fp8.safetensors"
        self.assertEqual(self.group()["model_summary"]["precision_label"], "INT8")
        self.assertEqual(list(self.db.iterdump()), database)

    def test_historical_and_legacy_groups_never_backfill_models_from_current_worker(self):
        self.historical("historical")
        self.capacity.assigned("legacy", self.worker, "legacy-lease", 1001)
        self.capacity.terminal("legacy", "w1", "legacy-lease", "done", 1010)
        self.capacity.update_worker("w1", {"model_version": "current-fp8-models", "cpu": "New CPU"})
        for group in self.capacity.report()["groups"]:
            self.assertEqual(group["model_summary"], {"models": [], "precision_label": None,
                                                     "auxiliary_models": [], "complete": False,
                                                     "source": "unrecorded", "runtime_verified": False})
            self.assertFalse(group["eligible"])

    def test_last_sample_at_uses_group_successful_runtime_not_latest_task_or_page(self):
        self.historical("success-a", created=1000, runtime=10)
        self.historical("success-b", created=2000, runtime=20)
        for index, value in enumerate((None, -1, math.inf)):
            self.historical("invalid-" + str(index), created=3000 + index, runtime=value)
        self.historical("error", created=4000, status="error", runtime=20)
        self.historical("cancel", created=5000, status="canceled", runtime=20)
        self.historical("running", created=6000, status="running", runtime=20)
        self.historical("other-group", created=7000, capability="other", runtime=10)
        report = self.capacity.report(limit=1)
        group = next(g for g in report["groups"] if g["capability"] == "image")
        self.assertEqual(group["last_sample_at"], 2000)
        self.assertEqual(self.capacity.report(end=2000)["groups"][0]["last_sample_at"], 1000)
        self.assertIsNone(self.capacity.report(start=3000, capability="image")["groups"][0]["last_sample_at"])
        # 与既有 measured 口径一致：零耗时/异常耗时保留，不能为展示字段偷偷过滤样本。
        self.historical("zero", created=8000, runtime=0)
        self.assertEqual(self.capacity.report(capability="image")["groups"][0]["last_sample_at"], 8000)
        self.capture("captured", now=9000)
        self.assertEqual(next(g for g in self.capacity.report()["groups"] if g["source"] == "captured")["last_sample_at"], 9000)

    def test_old_worker_preserves_reported_gpu_ram_without_inventing_cpu_or_telemetry(self):
        old = {"agent_version": 3, "devices": [{"name": "Old GPU", "vram_total": 24 * 1024 ** 3,
                                                "type": "cuda", "index": 0}],
               "system": {"ram_total": 64 * 1024 ** 3}}
        self.db.execute("UPDATE workers SET capabilities_json=? WHERE id='w1'", (json.dumps(old),))
        worker = self.capacity.report()["workers"][0]
        self.assertEqual(worker["agent_version"], 3)
        self.assertFalse(worker["supports_capacity_telemetry"])
        self.assertEqual(worker["hardware"]["gpus"], [{"name": "Old GPU", "memory_total_bytes": 24 * 1024 ** 3}])
        self.assertEqual(worker["hardware"]["memory_total_bytes"], 64 * 1024 ** 3)
        self.assertIsNone(worker["hardware"]["cpu"])
        self.historical("removed", worker="deleted")
        removed = next(w for w in self.capacity.report()["workers"] if w["id"] == "deleted")
        self.assertIsNone(removed["agent_version"])
        self.assertFalse(removed["supports_capacity_telemetry"])

    def test_worker_version_and_support_require_strict_reported_values(self):
        cases = [({}, None, False), ({"agent_version": 4}, 4, False),
                 ({"supports_capacity_telemetry": 1}, None, False)]
        for version in (True, "4", "v4", -1, math.inf, math.nan, [], {}):
            cases.append(({"agent_version": version, "supports_capacity_telemetry": 1}, None, False))
        for flag in (True, 1, False, 0, "1", "true", 1.0, [], {}):
            cases.append(({"agent_version": 4, "supports_capacity_telemetry": flag}, 4,
                          flag is True or type(flag) is int and flag == 1))
        cases.extend([({"agent_version": 3, "supports_capacity_telemetry": 1}, 3, False),
                      ({"agent_version": 5, "supports_capacity_telemetry": True}, 5, True)])
        for caps, version, supported in cases:
            with self.subTest(caps=caps):
                self.db.execute("UPDATE workers SET capabilities_json=? WHERE id='w1'", (json.dumps(caps),))
                worker = self.capacity.report()["workers"][0]
                self.assertEqual(worker["agent_version"], version)
                self.assertIs(worker["supports_capacity_telemetry"], supported)
                self.assertIsNone(worker["hardware"]["cpu"])
                json.dumps(worker, allow_nan=False)

    def test_csv_display_fields_match_api_and_keep_existing_formulas(self):
        caps = json.loads(self.worker["capabilities_json"])
        caps.update(agent_version=4, supports_capacity_telemetry=1)
        self.db.execute("UPDATE workers SET capabilities_json=? WHERE id='w1'", (json.dumps(caps),))
        self.capture(payload=self.make_payload(graph=ModelSummaryTests.graph("=model_int8.safetensors")))
        report = self.capacity.report()
        group = report["groups"][0]
        row = list(csv.DictReader(io.StringIO(export_csv(report).lstrip("\ufeff"))))[0]
        self.assertEqual(json.loads(row["model_summary"]), group["model_summary"])
        self.assertEqual(float(row["last_sample_at"]), group["last_sample_at"])
        self.assertEqual(float(row["agent_version"]), 4)
        self.assertEqual(row["supports_capacity_telemetry"], "True")
        self.assertEqual(float(row["seconds_per_unit"]), group["seconds_per_unit"])
        self.assertEqual(row["spec_key"], group["spec_key"])
        self.assertEqual(row["config_id"], group["config_id"])
        self.historical("old", status="error")
        rows = list(csv.DictReader(io.StringIO(export_csv(self.capacity.report()).lstrip("\ufeff"))))
        historical = next(row for row in rows if row["source"] == "historical")
        self.assertEqual(historical["last_sample_at"], "")
        self.assertEqual(json.loads(historical["model_summary"])["source"], "unrecorded")

    def archive(self, job, graph=None, capability="image", payload=None):
        # 与 DistributedStore 的现有调度表结构一致；没有归档的测试仍保留无此表的环境。
        self.db.execute("""CREATE TABLE IF NOT EXISTS dispatch_jobs (
            job_id TEXT PRIMARY KEY, payload_json TEXT NOT NULL,
            required_nodes_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL,
            worker_id TEXT, lease_token_hash TEXT, lease_expires_at REAL,
            cancel_requested INTEGER NOT NULL DEFAULT 0, created_at REAL NOT NULL, updated_at REAL NOT NULL,
            FOREIGN KEY(worker_id) REFERENCES workers(id))""")
        value = payload if payload is not None else {"capability": capability,
            "graph": graph if graph is not None else ModelSummaryTests.graph("archive_int8.safetensors")}
        self.db.execute("""INSERT INTO dispatch_jobs(job_id,payload_json,status,created_at,updated_at)
            VALUES (?,?,'done',1000,1010)""", (job, json.dumps(value)))

    @staticmethod
    def without_model_evidence(report):
        result = copy.deepcopy(report)
        for group in result["groups"]:
            group.pop("model_evidence")
        return result

    def test_archived_partial_coverage_preserves_all_old_report_data_and_formula(self):
        self.historical("recovered", runtime=20)
        self.historical("missing", runtime=40)
        self.historical("error", status="error", runtime=50)
        before = self.capacity.report(limit=1)
        estimate = self.capacity.estimate(self.estimate_payload(mode="historical"))
        self.archive("recovered")
        database = list(self.db.iterdump())
        report = self.capacity.report(limit=1)
        group = report["groups"][0]
        evidence = group["model_evidence"]
        self.assertEqual(evidence["total_samples"], 3)
        self.assertEqual(evidence["recorded_samples"], 1)
        self.assertEqual(len(evidence["variants"]), 1)
        variant = evidence["variants"][0]
        self.assertEqual((variant["source"], variant["samples"], variant["measured"]), ("archived_task", 1, 1))
        self.assertEqual(variant["summary"]["source"], "archived_task")
        self.assertEqual(group["model_summary"]["models"], [])
        self.assertFalse(group["eligible"])
        self.assertEqual(self.without_model_evidence(report), self.without_model_evidence(before))
        self.assertEqual(self.capacity.estimate(self.estimate_payload(mode="historical")), estimate)
        self.assertEqual(list(self.db.iterdump()), database)
        self.assertNotIn("current_model_reference", group)

    def test_variants_merge_by_safe_combination_not_single_model_or_original_node_ids(self):
        graph = ModelSummaryTests.graph("first_bf16.safetensors")
        graph["5"] = {"class_type": "UNETLoader", "inputs": {"unet_name": "second_fp8.safetensors"}}
        graph["6"] = {"class_type": "KSampler", "inputs": {"model": ["5", 0], "latent_image": ["2", 0]}}
        graph["3"]["inputs"]["samples"] = ["6", 0]
        renamed = {}
        mapping = {"1": "z", "5": "a"}
        for node_id, node in graph.items():
            renamed[mapping.get(node_id, node_id)] = copy.deepcopy(node)
            for key, value in node["inputs"].items():
                if isinstance(value, list):
                    renamed[mapping.get(node_id, node_id)]["inputs"][key] = [mapping.get(value[0], value[0]), value[1]]
        for job, value, status, runtime in (
                ("a", graph, "done", 10), ("b", renamed, "done", 20),
                ("error", graph, "error", 50), ("null", graph, "done", None),
                ("single", ModelSummaryTests.graph("first_bf16.safetensors"), "done", 30)):
            self.historical(job, status=status, runtime=runtime)
            self.archive(job, value)
        group = self.group()
        self.assertEqual((group["samples"], group["measured"]), (5, 3))
        evidence = group["model_evidence"]
        self.assertEqual(evidence["recorded_samples"], 5)
        self.assertEqual(len(evidence["variants"]), 2)
        paired = next(v for v in evidence["variants"] if len(v["summary"]["models"]) == 2)
        self.assertEqual((paired["samples"], paired["measured"]), (4, 2))
        self.assertEqual({m["name"] for m in paired["summary"]["models"]},
                         {"first_bf16.safetensors", "second_fp8.safetensors"})

    def test_archived_measured_matches_existing_zero_anomaly_and_pending_rules(self):
        for index, (status, runtime) in enumerate((("done", 0), ("done", 0.25), ("done", 4000),
                ("done", None), ("done", -1), ("error", 10), ("canceled", 10), ("running", 10))):
            job = str(index)
            self.historical(job, status=status, runtime=runtime)
            self.archive(job)
        group = self.group()
        variant = group["model_evidence"]["variants"][0]
        self.assertEqual((variant["samples"], variant["measured"]), (8, 3))
        self.assertEqual(variant["measured"], group["measured"])
        self.assertEqual(group["runtime_seconds"], 4000.25)

    def test_archive_is_exact_job_and_capability_scoped_not_shared_worker_name(self):
        self.add_worker("w2", name=self.worker["name"])
        self.historical("actual", worker="w1")
        self.historical("same-name-worker", worker="w2")
        self.historical("other-capability", capability="video")
        self.historical("capability-mismatch")
        self.historical("capability-missing")
        self.historical("api", kind="api")
        self.archive("actual")
        self.archive("capability-mismatch", capability="video")
        self.archive("capability-missing", payload={"graph": ModelSummaryTests.graph("no-cap.safetensors")})
        self.archive("different-job")
        self.archive("api")
        report = self.capacity.report()
        self.assertEqual(report["overview"]["tasks"], 5)
        self.assertEqual(sum(g["model_evidence"]["recorded_samples"] for g in report["groups"]), 1)
        actual = next(g for g in report["groups"] if g["worker_id"] == "w1" and g["capability"] == "image")
        self.assertEqual(actual["model_evidence"]["total_samples"], 3)
        for group in report["groups"]:
            if group is not actual:
                self.assertEqual(group["model_evidence"]["variants"], [])

    def test_archive_cleanup_removes_only_recovered_evidence_without_persistence(self):
        self.historical()
        original = self.capacity.report()
        self.archive("old")
        self.assertEqual(self.group()["model_evidence"]["recorded_samples"], 1)
        self.db.execute("DELETE FROM dispatch_jobs WHERE job_id='old'")
        self.assertEqual(self.capacity.report(), original)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM cost_events").fetchone()[0], 1)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM capacity_tasks").fetchone()[0], 0)

    def test_absent_dispatch_table_and_invalid_payloads_do_not_invent_evidence(self):
        self.historical()
        self.assertEqual(self.group()["model_evidence"], {"total_samples": 1, "recorded_samples": 0, "variants": []})
        self.assertIsNone(self.db.execute("SELECT 1 FROM sqlite_master WHERE name='dispatch_jobs'").fetchone())
        self.archive("old")
        for value in ("broken-json", "[]", "null", '"text"', json.dumps({"capability": "image", "graph": []}),
                      json.dumps({"capability": "image", "graph": ModelSummaryTests.real_graph("depthcrafter_video")})):
            with self.subTest(value=value):
                self.db.execute("UPDATE dispatch_jobs SET payload_json=?", (value,))
                database = list(self.db.iterdump())
                self.assertEqual(self.group()["model_evidence"]["variants"], [])
                self.assertEqual(list(self.db.iterdump()), database)

    def test_complete_snapshot_has_priority_even_when_precision_is_unknown(self):
        graph = ModelSummaryTests.graph("frozen.safetensors")
        self.capture(payload=self.make_payload(graph=graph))
        self.archive("j1", ModelSummaryTests.graph("different_fp8.safetensors"))
        with patch("server.capacity.model_summary_from_graph", side_effect=AssertionError("不应读取归档")):
            group = self.group()
        evidence = group["model_evidence"]
        self.assertEqual((evidence["total_samples"], evidence["recorded_samples"]), (1, 1))
        self.assertEqual(evidence["variants"], [{"source": "task_snapshot", "summary": group["model_summary"],
                                               "samples": 1, "measured": 1}])
        self.assertTrue(group["model_summary"]["complete"])
        self.assertIsNone(group["model_summary"]["precision_label"])
        self.assertNotIn("different_fp8", export_csv(self.capacity.report()))

    def test_legacy_capacity_task_can_recover_without_changing_group_or_spec(self):
        self.historical("old", capability="legacy-image", created=100)
        self.capacity.assigned("old", self.worker, "legacy-lease", 1000)
        self.capacity.terminal("old", "w1", "legacy-lease", "done", 1010)
        before = self.capacity.report()
        self.archive("old", capability="legacy-image")
        database = list(self.db.iterdump())
        after = self.capacity.report()
        self.assertEqual(self.without_model_evidence(after), self.without_model_evidence(before))
        self.assertEqual(after["groups"][0]["model_evidence"]["recorded_samples"], 1)
        self.assertEqual(after["details"][0]["spec"]["version"], None)
        self.assertFalse(after["groups"][0]["eligible"])
        self.assertEqual(list(self.db.iterdump()), database)

    def test_incomplete_snapshot_recovers_more_models_without_replacing_original_spec(self):
        graph = ModelSummaryTests.graph("first_bf16.safetensors")
        graph["5"] = {"class_type": "UNETLoader", "inputs": {"unet_name": "second_fp8.safetensors"}}
        graph["6"] = {"class_type": "KSampler", "inputs": {"model": ["5", 0], "latent_image": ["2", 0]}}
        graph["3"]["inputs"]["samples"] = ["6", 0]
        payload = self.make_payload(graph=graph)
        del payload["capacity_spec"]["graph"]["5"]["inputs"]["unet_name"]
        self.capture(payload=payload)
        before = self.capacity.report()
        self.archive("j1", graph)
        database = list(self.db.iterdump())
        after = self.capacity.report()
        self.assertEqual(self.without_model_evidence(after), self.without_model_evidence(before))
        group = after["groups"][0]
        self.assertFalse(group["model_summary"]["complete"])
        self.assertEqual(len(group["model_summary"]["models"]), 1)
        recovered = group["model_evidence"]["variants"][0]
        self.assertEqual(recovered["source"], "archived_task")
        self.assertTrue(recovered["summary"]["complete"])
        self.assertEqual(len(recovered["summary"]["models"]), 2)
        self.assertEqual(list(self.db.iterdump()), database)

    def test_same_group_keeps_snapshot_and_archived_variants_separate(self):
        graph = ModelSummaryTests.graph("shared_int8.safetensors")
        graph["unknown"] = {"class_type": "UnknownTransform", "inputs": {"images": ["3", 0]}}
        graph["extra-output"] = {"class_type": "SaveImage", "inputs": {"images": ["unknown", 0]}}
        payload = self.make_payload(graph=graph)
        self.capture("saved", payload=payload)
        self.capture("recovered", payload=payload)
        graph["unknown"] = {"class_type": "ImageScale", "inputs": {"image": ["3", 0]}}
        self.archive("recovered", graph)
        groups = self.capacity.report()["groups"]
        self.assertEqual(len(groups), 1)
        evidence = groups[0]["model_evidence"]
        self.assertEqual((evidence["total_samples"], evidence["recorded_samples"]), (2, 2))
        self.assertEqual(len(evidence["variants"]), 2)
        self.assertEqual({v["source"] for v in evidence["variants"]}, {"task_snapshot", "archived_task"})
        for variant in evidence["variants"]:
            self.assertEqual((variant["samples"], variant["measured"]), (1, 1))
            self.assertEqual(variant["summary"]["complete"], variant["source"] == "archived_task")
            self.assertEqual([m["name"] for m in variant["summary"]["models"]], ["shared_int8.safetensors"])

    def test_partial_archived_path_is_evidence_but_not_complete_coverage(self):
        graph = ModelSummaryTests.graph("known_int8.safetensors")
        graph["switch"] = {"class_type": "UnknownSwitch", "inputs": {"model": ["1", 0]}}
        graph["sampler"] = {"class_type": "KSampler", "inputs": {"model": ["switch", 0], "latent_image": ["2", 0]}}
        graph["3"]["inputs"]["samples"] = ["sampler", 0]
        self.historical()
        self.archive("old", graph)
        evidence = self.group()["model_evidence"]
        self.assertEqual(evidence["recorded_samples"], 1)
        self.assertFalse(evidence["variants"][0]["summary"]["complete"])
        self.assertEqual([m["name"] for m in evidence["variants"][0]["summary"]["models"]], ["known_int8.safetensors"])

    def test_recovery_cannot_drop_or_contradict_known_snapshot_models(self):
        graph = ModelSummaryTests.graph("known_bf16.safetensors", weight_dtype="fp8_e4m3fn")
        graph["unknown"] = {"class_type": "UnknownTransform", "inputs": {}}
        graph["out"] = {"class_type": "SaveImage", "inputs": {"images": ["unknown", 0]}}
        self.capture(payload=self.make_payload(graph=graph))
        before = self.group()
        self.assertFalse(before["model_summary"]["complete"])
        self.archive("j1")
        for replacement in (ModelSummaryTests.graph("other_fp8.safetensors"),
                            ModelSummaryTests.graph("known_bf16.safetensors", weight_dtype="float16"),
                            ModelSummaryTests.graph("known_bf16.safetensors")):
            with self.subTest(replacement=replacement):
                self.db.execute("UPDATE dispatch_jobs SET payload_json=?", (json.dumps({"capability": "image", "graph": replacement}),))
                self.assertEqual(self.group(), before)

    def test_model_literal_allowlist_survives_enqueue_and_rejects_forged_extra_fields(self):
        graph = ModelSummaryTests.real_graph("seedvr2_image_up")
        graph["5"]["inputs"]["model"] = "/private-model/seedvr2_fp8.safetensors"
        graph["leak"] = {"class_type": "ArbitraryLoader", "inputs": {"model": "PRIVATE-RAW-MODEL"}}
        payload = self.make_payload(graph=graph)
        safe = payload["capacity_spec"]
        self.assertEqual(safe["graph"]["leak"]["inputs"], {})
        safe["graph"]["leak"]["inputs"]["model"] = {"name": "PRIVATE-FORGED-MODEL", "identity": "a" * 64}
        self.capture(payload=payload)
        stored = json.loads(self.db.execute("SELECT spec_json FROM capacity_tasks").fetchone()[0])
        self.assertEqual(stored["graph"]["5"]["inputs"]["model"], safe["graph"]["5"]["inputs"]["model"])
        self.assertEqual(stored["graph"]["leak"]["inputs"], {})
        self.assertEqual(model_summary(stored)["models"][0]["name"], "seedvr2_fp8.safetensors")
        self.assertIn("seedvr2_fp8.safetensors", stored["models"])
        for secret in ("private-model", "PRIVATE-RAW-MODEL", "PRIVATE-FORGED-MODEL"):
            self.assertNotIn(secret, json.dumps(stored))

    def test_raw_archive_secrets_never_leak_to_report_or_csv_and_csv_reference_is_separate(self):
        self.historical()
        graph = ModelSummaryTests.graph("/private-model/model_bf16.safetensors", weight_dtype="fp8_e4m3fn")
        graph["2"]["inputs"].update(prompt="PRIVATE-PROMPT", seed=918273645, token="PRIVATE-TOKEN",
                                   image="/private-input/image.png", model_text="PRIVATE-MODEL-TEXT")
        graph["2"]["_meta"] = {"title": "PRIVATE-META"}
        self.archive("old", payload={"capability": "image", "graph": graph, "token": "PRIVATE-PAYLOAD-TOKEN"})
        database = list(self.db.iterdump())
        report = self.capacity.report()
        group = report["groups"][0]
        self.assertEqual(group["model_evidence"]["variants"][0]["summary"]["models"][0]["loader_dtype"], "fp8_e4m3fn")
        row = next(csv.DictReader(io.StringIO(export_csv(report).lstrip("\ufeff"))))
        self.assertEqual(json.loads(row["model_evidence"]), group["model_evidence"])
        self.assertEqual(row["current_model_reference"], "")
        group["current_model_reference"] = {"source": "current_template", "summary": model_summary_from_graph(ModelSummaryTests.graph("current_fp8.safetensors"))}
        exported = export_csv(report)
        row = next(csv.DictReader(io.StringIO(exported.lstrip("\ufeff"))))
        self.assertEqual(json.loads(row["current_model_reference"]), group["current_model_reference"])
        self.assertEqual(json.loads(row["model_evidence"]), group["model_evidence"])
        for text in (json.dumps(report), exported):
            for secret in ("private-model", "918273645", "PRIVATE-PROMPT", "PRIVATE-TOKEN", "private-input",
                           "PRIVATE-MODEL-TEXT", "PRIVATE-META", "PRIVATE-PAYLOAD-TOKEN", "payload_json", "class_type"):
                self.assertNotIn(secret, text)
        self.assertEqual(list(self.db.iterdump()), database)

    def test_identical_snapshots_reuse_summary_only_within_one_report(self):
        for index in range(4):
            self.capture("job-" + str(index))
        with patch("server.capacity.model_summary", wraps=model_summary) as summarize:
            report = self.capacity.report()
            self.assertEqual(summarize.call_count, 1)
            self.assertEqual(report["groups"][0]["model_evidence"]["recorded_samples"], 4)
            self.capacity.report()
            self.assertEqual(summarize.call_count, 2)
        self.capture("different", payload=self.make_payload(graph=ModelSummaryTests.graph("other.safetensors")))
        with patch("server.capacity.model_summary", wraps=model_summary) as summarize:
            self.capacity.report()
            self.assertEqual(summarize.call_count, 2)

    @staticmethod
    def resolution(total=1, recorded=0, complete=0, outputs=None, sized=0, variants=None):
        return {"total_samples": total, "recorded_samples": recorded, "complete_samples": complete,
                "total_outputs": outputs, "recorded_outputs": sized, "variants": variants or []}

    @staticmethod
    def size_variant(kind="image", width=512, height=512, outputs=1, samples=1):
        return {"kind": kind, "width": width, "height": height, "outputs": outputs, "samples": samples}

    def test_h3_actual_output_size_does_not_require_expected_size_or_technical_count(self):
        payload = self.make_payload("minimax_h3_ref_2pass", params={"output_kind": "video"},
                                    dims={"duration": 2}, graph=ModelSummaryTests.real_graph("minimax_h3_ref_2pass"))
        self.assertEqual(payload["capacity_spec"]["expected"], {"kind": "video", "duration": 2})
        self.capture(payload=payload, outputs=self.outputs(kind="video", width=1280, height=720, duration=2))
        report = self.capacity.report()
        expected = self.resolution(recorded=1, complete=1, outputs=1, sized=1,
                                   variants=[self.size_variant("video", 1280, 720)])
        self.assertEqual(report["groups"][0]["output_resolution"], expected)
        self.assertEqual(report["details"][0]["output_resolution"], expected)
        self.assertIsNone(report["details"][0]["recovered_outputs"])
        self.assertIsNone(report["details"][0]["output_count"])
        self.assertIsNone(report["groups"][0]["output_count"])
        self.assertFalse(report["groups"][0]["eligible"])
        self.assertIsNone(report["overview"]["output_videos"])

    def test_output_resolution_multiple_sizes_dedup_per_task_and_stable_sort(self):
        outputs = self.outputs(2) + self.outputs(key="other-video", kind="video", width=1280, height=720)
        outputs += self.outputs(key="other-image", width=256, height=768)
        self.capture("a", outputs=outputs + outputs)
        self.capture("b", now=2000, outputs=self.outputs())
        report = self.capacity.report()
        expected = self.resolution(total=2, recorded=2, complete=2, outputs=5, sized=5, variants=[
            self.size_variant(width=256, height=768), self.size_variant(outputs=3, samples=2),
            self.size_variant("video", 1280, 720)])
        self.assertEqual(len(report["groups"]), 1)
        self.assertEqual(report["groups"][0]["output_resolution"], expected)
        a = next(d for d in report["details"] if d["job_id"] == "a")
        self.assertEqual(a["output_resolution"]["recorded_outputs"], 4)
        self.assertEqual(a["output_resolution"]["variants"][1], self.size_variant(outputs=2))
        # 模拟旧库重复键，报表自身仍需去重，不能只依赖写入净化。
        self.db.execute("UPDATE capacity_tasks SET outputs_json=? WHERE job_id='a'",
                        (json.dumps(a["outputs"] * 2),))
        self.assertEqual(self.group()["output_resolution"], expected)
        for offset in (0, 1, 100):
            self.assertEqual(self.capacity.report(limit=1, offset=offset)["groups"][0]["output_resolution"], expected)

    def test_output_resolution_missing_invalid_audio_and_partial_lists(self):
        cases = {"missing": None, "empty": [], "invalid": self.outputs(valid=False),
                 "audio": self.outputs(kind="audio"), "no-size": self.outputs(width=None),
                 "partial": self.outputs() + self.outputs(key="missing-size", height=None)}
        for job, outputs in cases.items():
            self.capture(job, outputs=outputs)
        report = self.capacity.report()
        self.assertEqual(report["groups"][0]["output_resolution"], self.resolution(
            total=6, recorded=1, sized=1, variants=[self.size_variant()]))
        for detail in report["details"]:
            with self.subTest(job=detail["job_id"]):
                expected = (self.resolution(recorded=1, outputs=2, sized=1, variants=[self.size_variant()])
                            if detail["job_id"] == "partial" else
                            self.resolution(outputs=None if detail["job_id"] in {"missing", "empty"} else 1))
                self.assertEqual(detail["output_resolution"], expected)
        # 总产物数仅依赖非空最终清单；无效/音频仍属于最终产物，但不算尺寸覆盖。
        self.db.execute("DELETE FROM capacity_tasks WHERE job_id IN ('missing','empty')")
        self.assertEqual(self.group()["output_resolution"]["total_outputs"], 5)

    def test_output_resolution_strict_positive_safe_integer_dimensions(self):
        self.capture()
        original = self.capacity.report()["details"][0]["outputs"]
        for field in ("width", "height"):
            for value in (None, 0, -1, True, False, "512", 512.5, 2 ** 53, 10 ** 100):
                with self.subTest(field=field, value=value):
                    outputs = [dict(original[0], **{field: value})]
                    self.db.execute("UPDATE capacity_tasks SET outputs_json=?", (json.dumps(outputs),))
                    self.assertEqual(self.group()["output_resolution"], self.resolution(outputs=1))
            for value in (1, 512.0, 2 ** 53 - 1):
                with self.subTest(field=field, value=value):
                    outputs = [dict(original[0], **{field: value})]
                    self.db.execute("UPDATE capacity_tasks SET outputs_json=?", (json.dumps(outputs),))
                    resolution = self.group()["output_resolution"]
                    self.assertEqual(resolution["complete_samples"], 1)
                    self.assertIs(type(resolution["variants"][0][field]), int)
        # 经正常净化路径保留的小数也不能算尺寸。
        self.capture("fraction", outputs=self.outputs(width=512.25))
        detail = next(d for d in self.capacity.report()["details"] if d["job_id"] == "fraction")
        self.assertEqual(detail["output_resolution"], self.resolution(outputs=1))

    def test_output_resolution_excludes_all_non_done_states_even_with_recovery(self):
        for status in ("error", "canceled", "queued", "assigned", "running"):
            self.historical(status, status=status)
            with self.store.lock, self.db:
                self.capacity.record_output_recovery(status, self.outputs())
        report = self.capacity.report()
        self.assertEqual(report["groups"][0]["output_resolution"], self.resolution(total=0))
        self.assertTrue(all(d["output_resolution"] == self.resolution(total=0) for d in report["details"]))
        self.historical("done")
        self.assertEqual(self.group()["output_resolution"], self.resolution())

    def test_output_recovery_prioritizes_original_valid_metadata_and_only_final_keys(self):
        original = self.outputs(key="original") + self.outputs(key="missing", width=None)
        original += self.outputs(key="invalid", valid=False)
        self.capture(outputs=original)
        before = self.capacity.report()
        with self.store.lock, self.db:
            self.capacity.record_artifact("j1", "artifact-only", self.outputs()[0])
        artifacts = [tuple(r) for r in self.db.execute("SELECT * FROM capacity_artifacts")]
        frozen = tuple(self.db.execute("SELECT * FROM capacity_tasks").fetchone())
        recovery = self.outputs(key="original", width=1920, height=1080)
        recovery += self.outputs(key="missing", width=1280, height=720, kind="video")
        recovery += self.outputs(key="invalid", width=256, height=256)
        recovery += self.outputs(key="not-final", width=4096, height=2160)
        with self.store.lock, self.db:
            self.capacity.record_output_recovery("j1", recovery)
        report = self.capacity.report()
        self.assertEqual(report["groups"][0]["output_resolution"], self.resolution(
            recorded=1, complete=1, outputs=3, sized=3, variants=[
                self.size_variant(width=256, height=256), self.size_variant(), self.size_variant("video", 1280, 720)]))
        self.assertEqual(len(report["details"][0]["recovered_outputs"]), 4)
        self.assertNotIn("recovered_outputs", report["groups"][0])
        self.assertNotIn("not-final", json.dumps(report))
        self.assertEqual(tuple(self.db.execute("SELECT * FROM capacity_tasks").fetchone()), frozen)
        self.assertEqual([tuple(r) for r in self.db.execute("SELECT * FROM capacity_artifacts")], artifacts)
        for current, previous in ((report["groups"][0], before["groups"][0]),
                                  (report["details"][0], before["details"][0])):
            self.assertEqual({k: v for k, v in current.items() if k not in {"output_resolution", "recovered_outputs"}},
                             {k: v for k, v in previous.items() if k not in {"output_resolution", "recovered_outputs"}})

    def test_decoded_recovery_corrects_legacy_orientation_only_in_display(self):
        self.capture(outputs=self.outputs(key="rotated", kind="video", width=1280, height=720))
        before = self.capacity.report()
        frozen = tuple(self.db.execute("SELECT * FROM capacity_tasks").fetchone())
        with self.store.lock, self.db:
            self.capacity.record_output_recovery("j1", self.outputs(
                key="rotated", kind="video", width=720, height=1280, dimension_source="decoded_frame"))
        after = self.capacity.report()
        self.assertEqual(after["groups"][0]["output_resolution"]["variants"], [self.size_variant("video", 720, 1280)])
        self.assertEqual(after["details"][0]["recovered_outputs"][0]["dimension_source"], "decoded_frame")
        self.assertEqual(tuple(self.db.execute("SELECT * FROM capacity_tasks").fetchone()), frozen)
        self.assertEqual({k: v for k, v in after["groups"][0].items() if k != "output_resolution"},
                         {k: v for k, v in before["groups"][0].items() if k != "output_resolution"})
        self.assertEqual(after["details"][0]["outputs"], before["details"][0]["outputs"])
        # 新版原记录已是解码方向时仍优先；未知来源和无效补采均不能覆盖它。
        original = [dict(o, dimension_source="decoded_frame") for o in before["details"][0]["outputs"]]
        self.db.execute("UPDATE capacity_tasks SET outputs_json=?", (json.dumps(original),))
        self.assertEqual(self.group()["output_resolution"]["variants"], [self.size_variant("video", 1280, 720)])
        self.db.execute("UPDATE capacity_tasks SET outputs_json=?", (json.dumps(before["details"][0]["outputs"]),))
        for changes in ({"dimension_source": "untrusted"}, {"dimension_source": "decoded_frame", "valid": False}):
            with self.subTest(changes=changes), self.store.lock, self.db:
                self.capacity.record_output_recovery("j1", self.outputs(
                    key="rotated", kind="video", width=720, height=1280, **changes))
                self.assertEqual(self.group()["output_resolution"]["variants"], [self.size_variant("video", 1280, 720)])

    def test_output_recovery_never_borrows_another_key_or_uses_invalid_metadata(self):
        self.capture(outputs=self.outputs(key="final", width=None))
        for recovery in (self.outputs(key="different"), self.outputs(key="final", valid=False),
                         self.outputs(key="final", kind="audio"), self.outputs(key="final", height=None),
                         self.outputs(key="final", width=512.5), self.outputs(key="final", height=2 ** 53)):
            with self.subTest(recovery=recovery):
                with self.store.lock, self.db:
                    self.capacity.record_output_recovery("j1", recovery)
                self.assertEqual(self.group()["output_resolution"], self.resolution(outputs=1))

    def test_output_recovery_full_list_fallback_keeps_historical_source_estimates_and_costs(self):
        for job in ("historical", "unknown"):
            self.historical(job)
        self.capture("null", outputs=None)
        self.capture("empty", outputs=[])
        before = self.capacity.report()
        estimates = {g["id"]: self.capacity.estimate(self.estimate_payload([g], mode="historical", price=5000))
                     for g in before["groups"]}
        costs = [tuple(r) for r in self.db.execute("SELECT * FROM cost_events")]
        tasks = [tuple(r) for r in self.db.execute("SELECT * FROM capacity_tasks")]
        for job in ("historical", "null", "empty"):
            with self.store.lock, self.db:
                self.capacity.record_output_recovery(job, self.outputs(2) * 2)
        report = self.capacity.report(limit=1, offset=1)
        self.assertEqual(report["overview"], before["overview"])
        for group in report["groups"]:
            previous = next(g for g in before["groups"] if g["id"] == group["id"])
            self.assertEqual({k: v for k, v in group.items() if k != "output_resolution"},
                             {k: v for k, v in previous.items() if k != "output_resolution"})
            self.assertEqual(self.capacity.estimate(self.estimate_payload([group], mode="historical", price=5000)),
                             estimates[group["id"]])
            historical = group["source"] == "historical"
            self.assertEqual(group["output_resolution"], self.resolution(total=2,
                recorded=1 if historical else 2, complete=1 if historical else 2,
                outputs=None if historical else 4, sized=2 if historical else 4,
                variants=[self.size_variant(outputs=2 if historical else 4, samples=1 if historical else 2)]))
            self.assertFalse(group["eligible"])
            self.assertIsNone(group["output_count"])
        self.assertEqual([tuple(r) for r in self.db.execute("SELECT * FROM cost_events")], costs)
        self.assertEqual([tuple(r) for r in self.db.execute("SELECT * FROM capacity_tasks")], tasks)
        historical = next(d for d in self.capacity.report()["details"] if d["job_id"] == "historical")
        self.assertEqual(historical["source"], "historical")
        self.assertEqual(historical["output_resolution"]["total_outputs"], 2)

    def test_output_recovery_keeps_verified_estimate_and_original_coverage(self):
        self.capture()
        before = self.capacity.report()
        estimate = self.capacity.estimate(self.estimate_payload(price=5000))
        with self.store.lock, self.db:
            self.capacity.record_output_recovery("j1", self.outputs(width=1920, height=1080))
        after = self.capacity.report()
        self.assertEqual(after["groups"], before["groups"])
        self.assertEqual(after["overview"], before["overview"])
        self.assertTrue(after["groups"][0]["eligible"])
        self.assertEqual(self.capacity.estimate(self.estimate_payload(price=5000)), estimate)

    def test_output_recovery_sanitization_upsert_job_scope_and_outer_rollback(self):
        with self.store.lock:
            self.assertIsNone(self.capacity.output_recovery("missing"))
        original = self.outputs(prompt="PRIVATE-PROMPT", path="/private/path", url="https://secret.invalid/file") * 2
        unchanged = copy.deepcopy(original)
        with self.store.lock, self.db, patch("server.capacity.time.time", return_value=1234):
            self.capacity.record_output_recovery("saved", original)
            saved = self.capacity.output_recovery("saved")
        self.assertEqual(original, unchanged)
        self.assertEqual(len(saved), 1)
        self.assertRegex(saved[0]["key"], r"^[0-9a-f]{64}$")
        self.assertEqual(self.db.execute("SELECT probed_at FROM capacity_output_recovery").fetchone()[0], 1234)
        for secret in ("private-image", "PRIVATE-PROMPT", "/private/path", "secret.invalid"):
            self.assertNotIn(secret, json.dumps(saved))
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM capacity_tasks").fetchone()[0], 0)
        self.assertEqual(self.capacity.report()["overview"]["tasks"], 0)
        with self.assertRaises(RuntimeError):
            with self.store.lock, self.db:
                self.capacity.record_output_recovery("saved", [])
                self.capacity.record_output_recovery("rolled-back", self.outputs())
                CapacityStore(self.store)
                raise RuntimeError("模拟外层事务回滚")
        with self.store.lock:
            self.assertEqual(self.capacity.output_recovery("saved"), saved)
            self.assertIsNone(self.capacity.output_recovery("rolled-back"))
        for invalid in (None, {}, [{}], self.outputs(width=True), self.outputs(height=False), self.outputs(513)):
            with self.subTest(invalid=type(invalid)), self.assertRaises(ValueError):
                self.capacity.record_output_recovery("saved", invalid)
        with self.store.lock, self.db, patch("server.capacity.time.time", return_value=5678):
            self.capacity.record_output_recovery("saved", [])
            self.assertEqual(self.capacity.output_recovery("saved"), [])
        self.assertEqual(self.db.execute("SELECT COUNT(*),probed_at FROM capacity_output_recovery").fetchone()[:],
                         (1, 5678))

    def test_report_host_index_includes_filtered_current_and_deleted_historical_workers(self):
        self.capture("primary")
        warning = "同主机存在多个 Worker，资源槽位隔离未经验证"
        self.assertNotIn(warning, self.capacity.report(worker_id="w1")["details"][0]["warnings"])
        other = self.add_worker("w2", host_id="host-w1")
        with patch("server.capacity._hardware", wraps=capacity_module._hardware) as hardware:
            report = self.capacity.report(worker_id="w1")
            self.assertEqual(hardware.call_count, 2)
        self.assertEqual([worker["id"] for worker in report["workers"]], ["w1"])
        self.assertIn(warning, report["details"][0]["warnings"])
        self.capture("other", worker=other)
        self.db.execute("DELETE FROM workers WHERE id='w2'")
        report = self.capacity.report(worker_id="w1")
        self.assertIn(warning, report["details"][0]["warnings"])
        self.assertFalse(report["groups"][0]["eligible"])
        self.assertEqual(report["overview"]["tasks"], 1)

    def test_report_host_index_deduplicates_worker_configs_and_ignores_display_metadata(self):
        self.capture("old")
        changed = dict(self.worker)
        caps = json.loads(changed["capabilities_json"])
        caps["environment_id"] = "env-v2"
        changed["capabilities_json"] = json.dumps(caps)
        self.capture("new", worker=changed)
        self.add_worker("w2")
        self.capacity.update_worker("w1", {"host_id": "host-w2"})
        report = self.capacity.report(worker_id="w1")
        self.assertEqual(report["workers"][0]["hardware"]["host_id"], "host-w2")
        self.assertEqual(len(report["groups"]), 2)
        self.assertTrue(all(group["config"]["host_id"] == "host-w1" for group in report["groups"]))
        self.assertTrue(all("同主机存在多个 Worker" not in "".join(row["warnings"])
                            for row in report["details"]))
        # 合法 JSON 字符串也不是能力对象，不能二次解码出伪造的主机归属。
        nested = json.dumps(json.dumps({"host_id": "host-w1"}))
        self.db.execute("UPDATE workers SET capabilities_json=? WHERE id='w2'", (nested,))
        report = self.capacity.report(worker_id="w1")
        self.assertTrue(all("同主机存在多个 Worker" not in "".join(row["warnings"])
                            for row in report["details"]))

    def test_report_parses_full_json_once_and_reuses_attempt_conditions_only_per_report(self):
        for index in range(3):
            self.capture("shared-" + str(index))
        cache_json = json.dumps([{"id": "1", "type": None}])
        self.db.execute("UPDATE capacity_attempts SET cache_json=?", (cache_json,))
        spec_json = self.db.execute("SELECT spec_json FROM capacity_tasks LIMIT 1").fetchone()[0]
        measurement_json = self.db.execute("SELECT measurements_json FROM capacity_attempts LIMIT 1").fetchone()[0]
        hardware_json = self.db.execute("SELECT hardware_json FROM capacity_configs LIMIT 1").fetchone()[0]
        values = (spec_json, measurement_json, cache_json, hardware_json, self.worker["capabilities_json"])
        with patch("server.capacity.json.loads", wraps=json.loads) as decode, \
                patch("server.capacity._cache_condition", wraps=capacity_module._cache_condition) as condition:
            first = self.capacity.report()
            self.assertEqual(condition.call_count, 3)
            for value in values:
                self.assertEqual(sum(call.args[0] == value for call in decode.call_args_list), 1)
            self.assertEqual(first, self.capacity.report())
            self.assertEqual(condition.call_count, 6)
            for value in values:
                self.assertEqual(sum(call.args[0] == value for call in decode.call_args_list), 2)
        changed = json.dumps([{"id": "2", "type": "KSampler"}])
        self.db.execute("UPDATE capacity_attempts SET cache_json=? WHERE job_id='shared-2'", (changed,))
        after = self.capacity.report()
        self.assertEqual(len(after["groups"]), 2)
        self.assertEqual(first["groups"][0]["cache_condition"]["kind"], "loaders")
        task = next(row for row in after["details"] if row["job_id"] == "shared-2")
        self.assertEqual(task["cache_condition"]["kind"], "execution")
        self.assertFalse(next(group for group in after["groups"] if group["id"] == task["group_id"])["eligible"])

    def test_attempt_evidence_optional_condition_preserves_direct_call_behavior(self):
        attempt_id = self.capture()
        attempt = dict(self.db.execute("SELECT * FROM capacity_attempts WHERE id=?", (attempt_id,)).fetchone())
        config = dict(self.db.execute("SELECT * FROM capacity_configs WHERE id=?", (attempt["config_id"],)).fetchone())
        spec = json.loads(self.db.execute("SELECT spec_json FROM capacity_tasks").fetchone()[0])
        for cache, measurement, status in (
                (None, None, "done"), ("null", "null", "error"),
                ('{"invalid":true}', '{"invalid":true}', "done"),
                ('[{"id":"1","type":null}]', json.dumps(self.measurements()), "done"),
                ('[{"id":"2","type":"KSampler"}]', json.dumps(self.measurements()), "done"),
                ("broken", "broken", "canceled")):
            with self.subTest(cache=cache, status=status):
                row = dict(attempt, cache_json=cache, measurements_json=measurement, status=status)
                expected = self.capacity._attempt_evidence(row, config, spec)
                condition = capacity_module._cache_condition(row, spec)
                self.assertEqual(self.capacity._attempt_evidence(row, config, spec, condition), expected)
                row["cache_json"] = capacity_module._load(cache)
                row["measurements_json"] = capacity_module._load(measurement)
                parsed_config = dict(config, hardware_json=json.loads(config["hardware_json"]))
                self.assertEqual(self.capacity._attempt_evidence(row, parsed_config, spec, condition), expected)

    def test_report_shared_spec_keeps_worker_model_versions_task_local(self):
        params = dict(self.params)
        params.pop("model_version")
        payload = self.make_payload(params=params)
        for job, worker in (("z-version-one", self.add_worker("w2", model_version="model-v1")),
                            ("y-version-two", self.add_worker("w3", model_version="model-v2")),
                            ("a-unknown", self.worker)):
            self.capture(job, payload=payload, worker=worker)
        stored = [row[0] for row in self.db.execute("SELECT spec_json FROM capacity_tasks")]
        self.assertEqual(len(set(stored)), 1)
        database = list(self.db.iterdump())
        report = self.capacity.report()
        rows = {row["job_id"]: row for row in report["details"]}
        specs = {job: row["spec"] for job, row in rows.items()}
        self.assertEqual(specs["z-version-one"]["model_version"], "model-v1")
        self.assertEqual(specs["y-version-two"]["model_version"], "model-v2")
        self.assertIsNone(specs["a-unknown"]["model_version"])
        self.assertNotIn("model_version_source", specs["a-unknown"])
        self.assertIn("模型版本未知；模型名称不等于版本", specs["a-unknown"]["warnings"])
        self.assertEqual(len({spec["spec_key"] for spec in specs.values()}), 3)
        self.assertEqual(len({row["group_id"] for row in rows.values()}), 3)
        self.assertEqual(list(self.db.iterdump()), database)
        self.assertEqual(self.capacity.report(), report)

    def test_report_shared_legacy_spec_keeps_dimensions_task_local(self):
        for job, width in (("legacy-a", 512), ("legacy-z", 1024)):
            self.historical(job, dims={"width": width, "height": 512})
            self.capacity.assigned(job, self.worker, "lease-" + job, 1000)
        stored = [row[0] for row in self.db.execute("SELECT spec_json FROM capacity_tasks")]
        self.assertEqual(len(set(stored)), 1)
        report = self.capacity.report()
        specs = {row["job_id"]: row["spec"] for row in report["details"]}
        self.assertEqual(specs["legacy-a"]["dimensions"], {"width": 512, "height": 512})
        self.assertEqual(specs["legacy-z"]["dimensions"], {"width": 1024, "height": 512})
        self.assertNotEqual(specs["legacy-a"]["spec_key"], specs["legacy-z"]["spec_key"])

    def test_report_invalid_json_default_does_not_replace_valid_null(self):
        self.capture()
        self.db.execute("UPDATE capacity_tasks SET spec_json='broken',review_json='broken',outputs_json='broken'")
        self.db.execute("UPDATE capacity_attempts SET measurements_json='null',cache_json='null'")
        detail = self.capacity.report()["details"][0]
        self.assertIsNone(detail["outputs"])
        self.assertIsNone(detail["attempts"][0]["measurements"])
        self.assertIsNone(detail["attempts"][0]["cached_nodes"])
        self.assertFalse(detail["attempts"][0]["cache_invalid"])
        self.assertIsNone(detail["review"]["accepted"])
        self.assertEqual(detail["spec"]["dimensions"], {})

    def test_report_verified_csv_and_purchase_recompute_after_review_write(self):
        for job in ("accepted-a", "accepted-b"):
            self.capture(job)
            self.capacity.review(job, {"accepted": 1})
        before = self.capacity.report()
        self.assertTrue(before["groups"][0]["eligible"])
        technical_payload = self.estimate_payload(price=12345)
        accepted_payload = dict(technical_payload, quality="accepted")
        technical = self.capacity.estimate(technical_payload)
        accepted = self.capacity.estimate(accepted_payload)
        self.assertEqual(before, self.capacity.report())
        self.assertEqual(export_csv(before), export_csv(self.capacity.report()))
        self.assertEqual(self.capacity.estimate(technical_payload), technical)
        self.assertEqual(self.capacity.estimate(accepted_payload), accepted)
        self.capacity.review("accepted-a", {"accepted": 0})
        after = self.capacity.report()
        self.assertEqual(before["groups"][0]["accepted"], 2)
        self.assertEqual(after["groups"][0]["accepted"], 1)
        self.assertEqual(before["groups"][0]["id"], after["groups"][0]["id"])
        self.assertEqual(self.capacity.estimate(technical_payload), technical)
        self.assertEqual(self.capacity.estimate(accepted_payload)["total_seconds"], accepted["total_seconds"] * 2)
        row = next(csv.DictReader(io.StringIO(export_csv(after).lstrip("\ufeff"))))
        self.assertEqual(float(row["qualified_seconds_per_unit"]), after["groups"][0]["qualified_seconds_per_unit"])
        self.assertEqual(float(row["seconds_per_unit"]), before["groups"][0]["seconds_per_unit"])

    def test_report_changed_fallback_keeps_csv_statistics_and_purchase_formulas(self):
        for job in ("same-a", "same-b", "other-capability"):
            self.historical(job)
            self.archive(job, capability="video" if job == "other-capability" else "image")
        before = self.capacity.report()
        before_csv = export_csv(before)
        payload = self.estimate_payload(mode="historical", price=12345)
        estimate = self.capacity.estimate(payload)
        self.assertEqual(before, self.capacity.report())
        self.assertEqual(before_csv, export_csv(self.capacity.report()))
        self.assertEqual(before["groups"][0]["model_evidence"]["recorded_samples"], 2)
        changed = json.dumps({"capability": "image", "graph": ModelSummaryTests.graph("changed_bf16.safetensors")})
        self.db.execute("UPDATE dispatch_jobs SET payload_json=? WHERE job_id='same-a'", (changed,))
        database = list(self.db.iterdump())
        after = self.capacity.report()
        self.assertEqual(self.without_model_evidence(before), self.without_model_evidence(after))
        self.assertEqual(after["groups"][0]["model_evidence"]["recorded_samples"], 2)
        self.assertEqual(len(after["groups"][0]["model_evidence"]["variants"]), 2)
        self.assertEqual(self.capacity.estimate(payload), estimate)
        old_csv = list(csv.DictReader(io.StringIO(before_csv.lstrip("\ufeff"))))
        new_csv = list(csv.DictReader(io.StringIO(export_csv(after).lstrip("\ufeff"))))
        self.assertEqual(json.loads(new_csv[0]["model_evidence"]), after["groups"][0]["model_evidence"])
        for row in old_csv + new_csv:
            row.pop("model_evidence")
        self.assertEqual(old_csv, new_csv)
        self.assertEqual(list(self.db.iterdump()), database)

    def test_restart_keeps_attempts_and_schema_is_idempotent(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "control.db"
            db = sqlite3.connect(path)
            db.row_factory = sqlite3.Row
            store = SimpleNamespace(db=db, lock=threading.RLock())
            capacity = CapacityStore(store)
            with db:
                capacity.enqueue("persisted", self.payload, 1000)
                capacity.assigned("persisted", self.worker, "lease", 1001)
                capacity.record_output_recovery("persisted", self.outputs())
                capacity.record_output_recovery("historical", self.outputs(kind="video", width=1280, height=720))
            with store.lock:
                recovery = capacity.output_recovery("persisted")
                historical = capacity.output_recovery("historical")
            columns = {row["name"]: row for row in db.execute("PRAGMA table_info(capacity_output_recovery)")}
            self.assertEqual(set(columns), {"job_id", "outputs_json", "probed_at"})
            self.assertEqual(columns["job_id"]["pk"], 1)
            self.assertEqual(columns["job_id"]["type"], "TEXT")
            for name, kind in (("outputs_json", "TEXT"), ("probed_at", "REAL")):
                self.assertEqual(columns[name]["type"], kind)
                self.assertEqual(columns[name]["notnull"], 1)
            db.close()
            db = sqlite3.connect(path)
            db.row_factory = sqlite3.Row
            store.db = db
            capacity = CapacityStore(store)
            detail = capacity.report()["details"][0]
            self.assertEqual(detail["status"], "assigned")
            self.assertEqual(len(detail["attempts"]), 1)
            self.assertEqual(detail["recovered_outputs"], recovery)
            self.assertEqual(detail["output_resolution"], self.resolution(total=0))
            with store.lock:
                self.assertEqual(capacity.output_recovery("persisted"), recovery)
                self.assertEqual(capacity.output_recovery("historical"), historical)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM capacity_tasks").fetchone()[0], 1)
            self.assertFalse(capacity.report()["groups"][0]["eligible"])
            db.close()


if __name__ == "__main__":
    unittest.main()
