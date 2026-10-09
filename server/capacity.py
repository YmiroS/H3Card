# -*- coding: utf-8 -*-
"""机器产能证据层：共享调度器连接；所有写操作由调用方提交或回滚。

时间筛选使用 created_at 的 [from, to) 区间；ISO 无时区日期按 UTC 解释。
export_csv(report) 是模块函数。人工补录 update_worker 仅作用于后续快照。
"""
import csv
import hashlib
import io
import json
import math
import re
import statistics
import time
import uuid
from datetime import datetime, timezone


TERMINAL = {"done", "error", "canceled"}
MIN_BASELINE_SAMPLES = 30
MIN_BASELINE_DAYS = 3
DIMENSIONS = {
    "duration", "width", "height", "megapixels", "scale_to_length", "target_fps",
    "force_rate", "frame_load_cap", "resolution", "image_count", "audio_count",
    "video_count", "source_duration", "source_fps", "source_frames", "segment_count",
    "steps", "batch_size", "frames", "fps", "output_count", "output_width",
    "output_height", "output_duration", "output_fps",
}
PERFORMANCE = DIMENSIONS | {
    "cfg", "denoise", "strength", "seed_behavior", "sampler_name", "scheduler",
    "num_frames", "frame_rate", "length", "noise_aug_strength", "shift", "max_shift",
    "base_shift", "guidance", "guidance_scale", "start_at_step", "end_at_step",
    "add_noise", "return_with_leftover_noise", "weight_dtype", "dtype", "precision",
    "quantization", "device", "attention_mode", "offload", "tiled", "tile_size",
    "overlap", "upscale_method", "crop", "resize_method", "keep_proportion",
    "select_every_nth", "skip_first_frames", "lora_strength", "strength_model",
    "strength_clip", "normalize", "interpolation", "format", "quality", "crf",
    "output_kind", "workflow_version", "model_version", "environment_id",
    "type", "pre_cfg", "scale_by",
}
MODEL_KEYS = {"ckpt_name", "model_name", "unet_name", "vae_name", "clip_name",
              "clip_name1", "clip_name2", "lora_name", "control_net_name"}
PRIVATE_KEYS = {"prompt", "text", "negative_prompt", "positive_prompt", "seed",
                "noise_seed", "filename", "filename_prefix", "image", "video",
                "audio", "path", "file", "url", "input", "text_positive", "text_negative"}
TOKEN = re.compile(r"^[\w .:+@=,()\[\]-]{1,160}$", re.UNICODE)


def _json(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"),
                      allow_nan=False)


def _load(value, default=None):
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value) if value else default
    except (TypeError, ValueError):
        return default


def _num(value, *, positive=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    try:
        number = float(value)
    except (ValueError, OverflowError):
        return None
    return number if math.isfinite(number) and (number > 0 if positive else number >= 0) else None


def _text(value, size=160):
    if not isinstance(value, str):
        return None
    value = value.strip()
    return value if value and len(value) <= size and not any(ord(c) < 32 for c in value) else None


def _token(value):
    value = _text(value)
    return value if value and TOKEN.fullmatch(value) else None


def _hash(value):
    return hashlib.sha256(_json(value).encode("utf-8")).hexdigest()


def _scalar(value):
    if isinstance(value, bool):
        return value
    if _num(value) is not None:
        return value
    return _token(value)


def _dimensions(value):
    if not isinstance(value, dict):
        return {}
    return {key: _scalar(val) for key, val in value.items()
            if key in DIMENSIONS and _scalar(val) is not None}


def _version(value):
    value = _token(value)
    return value if value and value.lower() not in {"unknown", "latest", "main", "master", "未知"} else None


def _image_contract(graph):
    """仅识别明确的单交付图片链路；未知缩放/自定义节点不猜输出规格。"""
    saves = [node_id for node_id, node in graph.items()
             if isinstance(node, dict) and node.get("class_type") == "SaveImage"]
    if len(saves) != 1:
        return {}
    node_id, seen = saves[0], set()
    links = {"SaveImage": "images", "VAEDecode": "samples", "VAEDecodeTiled": "samples",
             "KSampler": "latent_image", "KSamplerAdvanced": "latent_image", "LatentUpscaleBy": "samples"}
    while node_id not in seen:
        seen.add(node_id)
        node = graph.get(node_id)
        if not isinstance(node, dict) or not isinstance(node.get("inputs"), dict):
            break
        kind, inputs = node.get("class_type"), node["inputs"]
        if kind in {"EmptyLatentImage", "EmptySD3LatentImage"}:
            values = {"width": inputs.get("width"), "height": inputs.get("height"), "count": inputs.get("batch_size")}
            return values if all(type(v) is int and v > 0 for v in values.values()) else {}
        if kind == "LatentUpscaleBy" and inputs.get("scale_by") != 1:
            break
        edge = inputs.get(links.get(kind))
        if not isinstance(edge, list) or len(edge) != 2:
            break
        node_id = str(edge[0])
    return {}


def make_spec(capability, params, graph, dimensions):
    """只保留白名单性能参数及拓扑；素材、种子、提示词不进入指纹或落盘。"""
    params = params if isinstance(params, dict) else {}
    graph = graph if isinstance(graph, dict) else {}
    warnings, topology, models = [], {}, set()
    safe_params = {key: _scalar(val) for key, val in params.items()
                   if key in PERFORMANCE and _scalar(val) is not None}
    unknown = False
    for node_id, node in list(graph.items())[:2048]:
        if not _token(str(node_id)) or not isinstance(node, dict):
            unknown = True
            continue
        inputs = node.get("inputs") or {}
        if not isinstance(inputs, dict):
            inputs, unknown = {}, True
        safe_inputs = {}
        for key, value in inputs.items():
            if not _token(key):
                unknown = True
                continue
            # 即使是提示词或素材连接，也必须保留边；仅排除对应的字面量。
            if (isinstance(value, list) and len(value) == 2 and str(value[0]) in graph
                    and isinstance(value[1], int) and not isinstance(value[1], bool)):
                safe_inputs[key] = [str(value[0]), value[1]]
            elif key in PRIVATE_KEYS or "seed" in key.lower() or "prompt" in key.lower():
                continue
            elif key in MODEL_KEYS and isinstance(value, str):
                model = _token(value.replace("\\", "/").rsplit("/", 1)[-1])
                if model:
                    models.add(model)
                    # 路径只进入不可逆指纹，避免不同子目录同名模型误合并。
                    safe_inputs[key] = {"name": model, "identity": _hash(value)}
                else:
                    unknown = True
            elif key in PERFORMANCE and _scalar(value) is not None:
                safe_inputs[key] = _scalar(value)
            else:
                unknown = True
        node_type = _token(node.get("class_type"))
        if not node_type:
            unknown = True
        topology[str(node_id)] = {"type": node_type, "inputs": safe_inputs}
    if len(graph) > 2048 or not topology:
        unknown = True
    dims = _dimensions(dimensions)
    model_version = _version(params.get("model_version"))
    # 安全结构指纹就是实际提交图的结构版本；执行环境版本另由 Worker 冻结。
    workflow_version = _version(params.get("workflow_version")) or ("graph:" + _hash(topology) if topology else None)
    if unknown:
        warnings.append("工作流存在未识别性能参数或结构，规格不完整")
    if not model_version:
        warnings.append("模型版本未知；模型名称不等于版本")
    if not workflow_version:
        warnings.append("工作流版本未知")
    if not models:
        warnings.append("模型标识未知")
    expected = _image_contract(graph)
    for key in ("width", "height", "duration", "count", "fps"):
        val = params.get("output_" + key, dims.get("output_" + key))
        if val is None and key in {"width", "height", "duration"}:
            val = dims.get(key)
        if val is None and key == "count":
            val = params.get("batch_size")
        if val is None and key == "fps":
            val = dims.get("target_fps") or dims.get("force_rate")
        if _num(val, positive=True) is not None:
            expected[key] = val
    kind = params.get("output_kind")
    if kind in {"image", "video"}:
        expected["kind"] = kind
    else:
        # 保存节点只确定交付类型，不把输入数量或 MP 换算成输出数量/尺寸。
        types = {node["type"] for node in topology.values()}
        if "SaveImage" in types:
            expected["kind"] = "image"
        elif types & {"VHS_VideoCombine", "SaveVideo"}:
            expected["kind"] = "video"
    if not (expected.get("kind") and expected.get("width") and expected.get("height")):
        warnings.append("缺少可核对的输出类型或精确尺寸")
    if expected.get("kind") == "video" and not expected.get("duration"):
        warnings.append("预期视频时长未知")
    if not expected.get("count"):
        warnings.append("最终交付数量约定未知")
    result = {"version": 1, "capability": _token(capability) or "unknown",
              "dimensions": dims, "parameters": safe_params, "graph": topology,
              "graph_fingerprint": _hash(topology), "models": sorted(models),
              "model_version": model_version, "workflow_version": workflow_version,
              "expected": expected, "warnings": warnings, "complete": not warnings}
    result["spec_key"] = _hash({k: v for k, v in result.items() if k != "warnings"})
    return result


def model_summary(spec):
    """仅解释已保存的安全任务图；文件/加载声明不代表运行时精度验证。"""
    result = {"models": [], "precision_label": None, "source": "unrecorded", "runtime_verified": False}
    graph = spec.get("graph") if isinstance(spec, dict) else None
    if not isinstance(graph, dict):
        return result

    # 精确类型白名单，不能凭节点名含 Loader 或遍历 spec.models 猜主模型。
    loaders = {"UNETLoader": ("unet_name",), "CheckpointLoaderSimple": ("ckpt_name",),
               "CheckpointLoader": ("ckpt_name",), "UnetLoaderGGUF": ("unet_name",),
               "UnetLoaderGGUFAdvanced": ("unet_name",)}
    model_links = {kind: ("model",) for kind in (
        "LoraLoader", "LoraLoaderModelOnly", "ModelSamplingAuraFlow", "ModelSamplingSD3",
        "ModelSamplingFlux", "ModelSamplingDiscrete", "ModelSamplingContinuousEDM",
        "ModelAttentionBackend", "QwenImage21Cache", "CFGNorm",
        "BasicGuider", "CFGGuider", "DualCFGGuider")}
    model_links.update({"ModelMergeSimple": ("model1", "model2"),
                        "ModelMergeBlocks": ("model1", "model2")})
    samplers = {"KSampler": "model", "KSamplerAdvanced": "model", "SamplerCustom": "model",
                "SamplerCustomAdvanced": "guider"}
    # 从交付节点沿明确的数据链回溯，不把游离采样器或条件编码分支算作生成模型。
    outputs = {"SaveImage": ("images",), "PreviewImage": ("images",),
               "SaveVideo": ("video",), "VHS_VideoCombine": ("images",)}
    data_links = {**outputs, "VAEDecode": ("samples",), "VAEDecodeTiled": ("samples",),
                  "CreateVideo": ("images",), "LatentUpscale": ("samples",),
                  "LatentUpscaleBy": ("samples",), "ImageScale": ("image",),
                  "ImageScaleBy": ("image",), "ImageBatch": ("image1", "image2"),
                  "VAEEncode": ("pixels",), "VAEEncodeTiled": ("pixels",),
                  "VAEEncodeForInpaint": ("pixels",),
                  **{kind: ("latent_image",) for kind in samplers}}
    data_leaves = {"EmptyLatentImage", "EmptySD3LatentImage", "EmptyHunyuanLatentVideo",
                   "EmptyLTXVLatentVideo", "LoadImage", "LoadVideo"}

    def node_parts(node_id):
        node = graph.get(node_id)
        if not isinstance(node, dict) or not isinstance(node.get("inputs"), dict):
            return None, {}
        return node.get("type"), node["inputs"]

    def edge(value):
        if (isinstance(value, list) and len(value) == 2 and type(value[1]) is int
                and value[1] >= 0 and str(value[0]) in graph):
            return str(value[0]), value[1]
        return None

    pending = [node_id for node_id in graph if node_parts(node_id)[0] in outputs]
    seen, model_edges = set(), []
    unresolved = False
    while pending:
        node_id = pending.pop()
        if node_id in seen:
            continue
        seen.add(node_id)
        kind, inputs = node_parts(node_id)
        if kind not in data_links and kind not in data_leaves:
            unresolved = True
        if kind in samplers:
            link = edge(inputs.get(samplers[kind]))
            if link:
                model_edges.append(link)
            else:
                unresolved = True
        for key in data_links.get(kind, ()):
            link = edge(inputs.get(key))
            if link:
                pending.append(link[0])

    seen, main_nodes = set(), set()
    while model_edges:
        node_id, slot = model_edges.pop()
        if (node_id, slot) in seen:
            continue
        seen.add((node_id, slot))
        kind, inputs = node_parts(node_id)
        # checkpoint 的 CLIP/VAE 输出和 LoRA 的 CLIP 输出绝不作为主模型。
        if slot != 0:
            unresolved = True
        elif kind in loaders:
            main_nodes.add(node_id)
        elif kind in model_links:
            for key in model_links[kind]:
                link = edge(inputs.get(key))
                if link:
                    model_edges.append(link)
                else:
                    unresolved = True
        else:
            # 自定义切换/路由语义未知，不能把所有上游 loader 当成已执行。
            unresolved = True

    precision_tokens = re.compile(
        r"(?<![a-z0-9])(?:bfloat16|float(?:8|16|32|64)|bf16|fp(?:4|8|16|32|64)|"
        r"int(?:4|8|16)|nf4|q[2-8]_(?:k(?:_[sml])?|[01]))(?![a-z0-9])", re.I)

    def precisions(value):
        tokens = {token.upper().replace("BFLOAT16", "BF16").replace("FLOAT", "FP")
                  for token in precision_tokens.findall(value)}
        return " / ".join(sorted(tokens)) or None

    for node_id in sorted(main_nodes):
        kind, inputs = node_parts(node_id)
        names = [inputs.get(key) for key in loaders[kind]]
        names = [value.get("name") for value in names if isinstance(value, dict)]
        names = [name for name in names if _token(name)]
        if not names:
            unresolved = True
        # dtype 只保留明确声明，default/auto 不提供已知精度证据。
        dtypes = sorted({value for key in ("weight_dtype", "dtype", "precision")
                         if isinstance(value := inputs.get(key), str)
                         and re.fullmatch(r"(?:bfloat16|float(?:16|32|64)|bf16|fp(?:16|32|64)|"
                                          r"(?:fp8|float8)(?:_e4m3fn|_e5m2)?(?:_fast)?)", value, re.I)})
        loader_dtype = " / ".join(dtypes) or None
        for name in names:
            filename_precision = precisions(name)
            precision = filename_precision or (precisions(loader_dtype) if loader_dtype else None)
            result["models"].append({"name": name, "precision": precision,
                                     "precision_source": "filename" if filename_precision else "loader" if precision else None,
                                     "loader_dtype": loader_dtype})
    if result["models"]:
        result["source"] = "task_snapshot"
        # 部分主模型精度未知时，组级不冒充统一精度；逐模型证据仍完整保留。
        if not unresolved and all(model["precision"] for model in result["models"]):
            result["precision_label"] = " / ".join(sorted({
                token for model in result["models"] for token in model["precision"].split(" / ")}))
    return result


def _safe_spec(value, capability):
    """再次重建白名单，避免队列里的伪造快照携带原始提示词。"""
    if not isinstance(value, dict) or value.get("version") != 1:
        return {"version": None, "capability": capability, "dimensions": {},
                "complete": False, "warnings": ["旧任务缺少采集规格"],
                "spec_key": _hash([capability, "legacy"]), "expected": {}}
    # make_spec 的图已经是安全结构，不能再次按原始图解释。
    graph = {}
    for node_id, node in list((value.get("graph") or {}).items())[:2048]:
        if not _token(str(node_id)) or not isinstance(node, dict):
            continue
        ins = {}
        for key, val in (node.get("inputs") or {}).items():
            if not _token(key):
                continue
            if isinstance(val, list) and len(val) == 2 and _token(str(val[0])) and type(val[1]) is int:
                ins[key] = [str(val[0]), val[1]]
            elif key in MODEL_KEYS and isinstance(val, dict):
                if _token(val.get("name")) and re.fullmatch(r"[0-9a-f]{64}", str(val.get("identity", ""))):
                    ins[key] = {"name": val["name"], "identity": val["identity"]}
            elif key in PERFORMANCE and _scalar(val) is not None:
                ins[key] = _scalar(val)
        graph[str(node_id)] = {"type": _token(node.get("type")), "inputs": ins}
    parameters = {k: _scalar(v) for k, v in (value.get("parameters") or {}).items()
                  if k in PERFORMANCE and _scalar(v) is not None}
    expected = {k: v for k, v in (value.get("expected") or {}).items()
                if (k in {"width", "height", "duration", "count", "fps"} and _num(v, positive=True) is not None)
                or (k == "kind" and v in {"image", "video"})}
    known_warnings = {"工作流存在未识别性能参数或结构，规格不完整", "模型版本未知；模型名称不等于版本",
                      "工作流版本未知", "模型标识未知", "缺少可核对的输出类型或精确尺寸",
                      "预期视频时长未知", "最终交付数量约定未知"}
    warnings = [w for w in (value.get("warnings") or []) if isinstance(w, str) and w in known_warnings]
    if value.get("complete") is not True and not warnings:
        warnings.append("采集规格不完整，参数、模型版本或输出约定待核对")
    if not graph or not _version(value.get("workflow_version")):
        warnings.append("工作流版本未知")
    if not _version(value.get("model_version")):
        warnings.append("模型版本未知；模型名称不等于版本")
    if not all(expected.get(k) for k in ("kind", "width", "height")):
        warnings.append("缺少可核对的输出类型或精确尺寸")
    if expected.get("kind") == "video" and not expected.get("duration"):
        warnings.append("预期视频时长未知")
    if not expected.get("count"):
        warnings.append("最终交付数量约定未知")
    result = {"version": 1, "capability": capability, "dimensions": _dimensions(value.get("dimensions")),
              "parameters": parameters, "graph": graph, "graph_fingerprint": _hash(graph),
              "model_version": _version(value.get("model_version")),
              "workflow_version": _version(value.get("workflow_version")),
              "models": sorted({v["name"] for n in graph.values() for k, v in n["inputs"].items()
                                if k in MODEL_KEYS and isinstance(v, dict)}),
              "expected": expected, "warnings": warnings, "complete": not warnings}
    result["spec_key"] = _hash({k: v for k, v in result.items() if k != "warnings"})
    return result


def _hardware_description(value, kind):
    if not isinstance(value, dict):
        return _text(value)
    fields = ("model", "architecture", "logical_cores") if kind == "cpu" else ("name", "release", "version")
    result = {}
    for key in fields:
        result[key] = _num(value.get(key), positive=True) if key == "logical_cores" else _text(value.get(key))
    return result if any(v is not None for v in result.values()) else None


def _execution_devices(value):
    if not isinstance(value, list):
        return None
    result = [{"name": _text(device.get("name")), "type": _token(device.get("type")),
               "index": _num(device.get("index")), "vram_total": _num(device.get("vram_total"), positive=True)}
              for device in value[:32] if isinstance(device, dict)]
    return result or None


def _hardware(worker):
    caps = _load(worker.get("capabilities_json"), {})
    caps = caps if isinstance(caps, dict) else {}
    telemetry = caps.get("telemetry") or {}
    telemetry = telemetry if isinstance(telemetry, dict) else {}
    reported = caps.get("hardware") or {}
    reported = reported if isinstance(reported, dict) else {}
    system = caps.get("system") or {}
    system = system if isinstance(system, dict) else {}
    def field(key):
        return telemetry.get(key) or reported.get(key) or caps.get(key)
    memory = telemetry.get("memory") or {}
    gpus = telemetry.get("gpus") or reported.get("gpus") or caps.get("devices") or []
    gpus = gpus if isinstance(gpus, list) else []
    return {"host_id": _token(telemetry.get("host_id") or caps.get("host_id") or reported.get("host_id")),
            "gpus": [{"name": _text(g.get("name")),
                      "memory_total_bytes": _num(g.get("memory_total_bytes", g.get("vram_total")), positive=True)}
                     for g in gpus[:32] if isinstance(g, dict)],
            "memory_total_bytes": _num(field("memory_total_bytes") or
                                       (memory.get("total_bytes") if isinstance(memory, dict) else None) or
                                       system.get("ram_total"), positive=True),
            "cpu": _hardware_description(field("cpu") or system.get("cpu"), "cpu"),
            "os": _hardware_description(field("os") or system.get("os"), "os"),
            "environment_id": _version(field("environment_id")),
            "model_version": _version(field("model_version")),
            "execution_device": _execution_devices(field("execution_device") or caps.get("devices"))}


def _nodes(value):
    if not isinstance(value, list) or len(value) > 2048:
        raise ValueError("缓存节点必须是最多 2048 项的列表")
    result = []
    for node in value:
        if isinstance(node, (str, int)) and not isinstance(node, bool):
            node = {"id": str(node), "type": None}
        if not isinstance(node, dict) or not _token(str(node.get("id", ""))):
            raise ValueError("缓存节点标识无效")
        result.append({"id": str(node["id"]), "type": _token(node.get("type"))})
    return result


def _measurements(value):
    if value is None:
        return None
    if not isinstance(value, dict) or len(value) > 32:
        raise ValueError("计时数据格式无效")
    result = {}
    for key in ("prepare_seconds", "execute_seconds", "upload_seconds", "total_seconds"):
        if key in value and value[key] is not None:
            number = _num(value[key])
            if number is None or number > 30 * 86400:
                raise ValueError("阶段计时必须是 0 到 30 天的有限秒数")
            result[key] = number
    if "graph_changed" in value:
        if type(value["graph_changed"]) is not bool:
            raise ValueError("graph_changed 必须是布尔值")
        result["graph_changed"] = value["graph_changed"]
    if "cached_nodes" in value:
        result["cached_nodes"] = _nodes(value["cached_nodes"])
    return result


def _outputs(value):
    if value is None:
        return None
    if not isinstance(value, list) or len(value) > 512:
        raise ValueError("产物必须是最多 512 项的列表")
    result, seen = [], set()
    for output in value:
        if not isinstance(output, dict) or not _text(output.get("key"), 1024):
            raise ValueError("产物标识无效")
        # 外部 key 可能是相对路径，落盘与导出只保留不可逆的去重键。
        key = _hash(output["key"])
        if key in seen:
            continue
        seen.add(key)
        item = {"key": key, "kind": output.get("kind") if output.get("kind") in {"image", "video"} else None,
                "valid": output.get("valid") is True}
        for field in ("bytes", "width", "height", "duration", "fps"):
            raw = output.get(field)
            number = _num(raw)
            if raw is not None and (number is None or number > 1e16):
                raise ValueError("产物数值必须是有界非负有限数")
            item[field] = number
        result.append(item)
    return result


def _timestamp(value):
    if value is None or value == "":
        return None
    if isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            value = dt.replace(tzinfo=timezone.utc).timestamp() if dt.tzinfo is None else dt.timestamp()
        except (ValueError, OverflowError, OSError) as exc:
            raise ValueError("日期格式无效") from exc
    result = _num(value)
    if result is None or result > 253402214400:
        raise ValueError("时间必须为有效日期或非负有限时间戳")
    return result


def _percentile(values, fraction):
    if not values:
        return None
    values = sorted(values)
    pos = (len(values) - 1) * fraction
    lo, hi = math.floor(pos), math.ceil(pos)
    return values[lo] + (values[hi] - values[lo]) * (pos - lo)


def _sum_known(values):
    values = [v for v in values if v is not None]
    return sum(values) if values else None


def _cache_condition(attempt, spec):
    """缓存类型必须与冻结图对应；不根据 Worker 自报类型认定可比性。"""
    measurement = _load(attempt.get("measurements_json"), {}) or {}
    server_nodes = _load(attempt.get("cache_json"), None)
    if measurement.get("invalid") or isinstance(server_nodes, dict):
        return {"kind": "unknown", "nodes": []}
    worker_nodes = measurement.get("cached_nodes")
    if worker_nodes is None and server_nodes is None:
        return {"kind": "loss_only" if attempt["status"] in {"error", "canceled"} else "unknown", "nodes": []}
    nodes, trustworthy = {}, True
    graph = spec.get("graph") or {}
    for node in (server_nodes or []) + (worker_nodes or []):
        node_type = graph.get(node["id"], {}).get("type")
        if not node_type or (node.get("type") and node["type"] != node_type):
            trustworthy = False
        nodes[node["id"]] = {"id": node["id"], "type": node_type}
    ordered = sorted(nodes.values(), key=lambda node: node["id"])
    if not trustworthy:
        kind = "unknown"
    elif not ordered:
        kind = "none"
    else:
        loaders = {"CheckpointLoader", "CheckpointLoaderSimple", "UNETLoader", "VAELoader", "CLIPLoader",
                   "DualCLIPLoader", "TripleCLIPLoader", "LoraLoader", "LoraLoaderModelOnly", "ControlNetLoader"}
        kind = "loaders" if all(node["type"] in loaders for node in ordered) else "execution"
    return {"kind": kind, "nodes": ordered}


class CapacityStore:
    def __init__(self, store):
        self.store, self.db, self.lock = store, store.db, store.lock
        # 不使用 executescript：它会隐式提交调用方已经打开的事务。
        statements = [
            """CREATE TABLE IF NOT EXISTS capacity_tasks (
                job_id TEXT PRIMARY KEY, capability TEXT NOT NULL, spec_json TEXT NOT NULL,
                created_at REAL NOT NULL, status TEXT NOT NULL DEFAULT 'queued',
                current_attempt TEXT, outputs_json TEXT, review_json TEXT)""",
            """CREATE TABLE IF NOT EXISTS capacity_configs (
                id TEXT PRIMARY KEY, worker_id TEXT NOT NULL, hardware_json TEXT NOT NULL,
                source TEXT NOT NULL, valid_from REAL NOT NULL)""",
            """CREATE TABLE IF NOT EXISTS capacity_attempts (
                id TEXT PRIMARY KEY, job_id TEXT NOT NULL, worker_id TEXT NOT NULL,
                worker_name TEXT, lease_hash TEXT NOT NULL, config_id TEXT NOT NULL,
                assigned_at REAL NOT NULL, started_at REAL, ended_at REAL, released_at REAL,
                status TEXT NOT NULL DEFAULT 'assigned', gap INTEGER NOT NULL DEFAULT 0,
                measurements_json TEXT, cache_json TEXT,
                UNIQUE(job_id,worker_id,lease_hash))""",
            """CREATE INDEX IF NOT EXISTS capacity_attempts_job ON capacity_attempts(job_id,assigned_at)""",
            """CREATE INDEX IF NOT EXISTS capacity_attempts_worker ON capacity_attempts(worker_id,released_at)""",
            """CREATE INDEX IF NOT EXISTS capacity_tasks_created ON capacity_tasks(created_at)""",
            """CREATE TABLE IF NOT EXISTS capacity_observations (
                worker_id TEXT NOT NULL, observed_at REAL NOT NULL, state TEXT NOT NULL,
                config_id TEXT NOT NULL, PRIMARY KEY(worker_id,observed_at))""",
            """CREATE TABLE IF NOT EXISTS capacity_artifacts (
                job_id TEXT NOT NULL, key_hash TEXT NOT NULL, metadata_json TEXT NOT NULL,
                PRIMARY KEY(job_id,key_hash))""",
            """CREATE TABLE IF NOT EXISTS capacity_reviews (
                job_id TEXT PRIMARY KEY, review_json TEXT NOT NULL)""",
            """CREATE TABLE IF NOT EXISTS capacity_worker_metadata (
                id TEXT PRIMARY KEY, worker_id TEXT NOT NULL, valid_from REAL NOT NULL,
                hardware_json TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'manual')""",
            """CREATE INDEX IF NOT EXISTS capacity_metadata_worker
                ON capacity_worker_metadata(worker_id,valid_from)""",
        ]
        with self.lock:
            for statement in statements:
                self.db.execute(statement)

    def _snapshot(self, worker, now):
        hardware, source = _hardware(worker), "reported"
        meta = self.db.execute("""SELECT * FROM capacity_worker_metadata
            WHERE worker_id=? AND valid_from<=? ORDER BY valid_from DESC,rowid DESC LIMIT 1""",
                               (worker["id"], now)).fetchone()
        if meta:
            hardware.update({k: v for k, v in _load(meta["hardware_json"], {}).items() if k != "note"})
            source = "manual+reported"
        config_id = _hash([worker["id"], hardware, source, meta["id"] if meta else None])
        self.db.execute("""INSERT OR IGNORE INTO capacity_configs VALUES (?,?,?,?,?)""",
                        (config_id, worker["id"], _json(hardware), source, now))
        return config_id

    def enqueue(self, job_id, payload, created_at):
        capability = _token(payload.get("capability")) or "unknown"
        spec = _safe_spec(payload.get("capacity_spec"), capability)
        with self.lock:
            self.db.execute("""INSERT OR IGNORE INTO capacity_tasks
                (job_id,capability,spec_json,created_at) VALUES (?,?,?,?)""",
                            (job_id, capability, _json(spec), _timestamp(created_at)))

    def assigned(self, job_id, worker_dict, lease_hash, now):
        now = _timestamp(now)
        with self.lock:
            previous = self.db.execute("""SELECT id FROM capacity_attempts
                WHERE job_id=? AND worker_id=? AND lease_hash=?""",
                                       (job_id, worker_dict["id"], lease_hash)).fetchone()
            if previous:
                return previous["id"]
            task = self.db.execute("SELECT * FROM capacity_tasks WHERE job_id=?", (job_id,)).fetchone()
            if not task:
                # 升级前已经排队的任务保留缺失证据，不使用领取时图补造提交快照。
                self.enqueue(job_id, {}, now)
            config_id = self._snapshot(worker_dict, now)
            attempt_id = str(uuid.uuid4())
            self.db.execute("""INSERT INTO capacity_attempts
                (id,job_id,worker_id,worker_name,lease_hash,config_id,assigned_at)
                VALUES (?,?,?,?,?,?,?)""", (attempt_id, job_id, worker_dict["id"],
                                            _text(worker_dict.get("name")), lease_hash, config_id, now))
            self.db.execute("""UPDATE capacity_tasks SET current_attempt=?,status='assigned',
                outputs_json=NULL,review_json=NULL WHERE job_id=?""", (attempt_id, job_id))
            return attempt_id

    def running(self, job_id, worker_id, lease_hash, now):
        with self.lock:
            self.db.execute("""UPDATE capacity_attempts SET started_at=COALESCE(started_at,?),
                status='running' WHERE job_id=? AND worker_id=? AND lease_hash=? AND ended_at IS NULL""",
                            (_timestamp(now), job_id, worker_id, lease_hash))
            self.db.execute("""UPDATE capacity_tasks SET status='running' WHERE job_id=? AND
                current_attempt IN (SELECT id FROM capacity_attempts WHERE job_id=? AND worker_id=?
                AND lease_hash=? AND ended_at IS NULL)""", (job_id, job_id, worker_id, lease_hash))

    def terminal(self, job_id, worker_id, lease_hash, status, now, *, released=False,
                 outputs=None, measurements=None):
        if status not in TERMINAL:
            raise ValueError("终态必须为 done、error 或 canceled")
        now, safe_outputs = _timestamp(now), _outputs(outputs)
        try:
            safe_measurements = _measurements(measurements)
        except (ValueError, TypeError):
            # 可选统计不能阻断业务终态；无效数据不能被截断成看似完整的证据。
            safe_measurements = {"invalid": True}
        with self.lock:
            attempt = self.db.execute("""SELECT * FROM capacity_attempts
                WHERE job_id=? AND worker_id=? AND lease_hash=?""",
                                      (job_id, worker_id, lease_hash)).fetchone()
            if not attempt:
                return
            if released is True:
                self.db.execute("""UPDATE capacity_attempts SET released_at=COALESCE(released_at,?),
                    gap=CASE WHEN released_at IS NULL AND ended_at IS NOT NULL AND ?-ended_at>?
                        THEN 1 ELSE gap END WHERE id=?""",
                                (now, now, getattr(self.store, "offline_seconds", 30), attempt["id"]))
            if attempt["ended_at"] is not None:
                return
            self.db.execute("""UPDATE capacity_attempts SET ended_at=?,status=?,measurements_json=?
                WHERE id=?""", (now, status, _json(safe_measurements), attempt["id"]))
            self.db.execute("""UPDATE capacity_tasks SET status=?,outputs_json=?
                WHERE job_id=? AND current_attempt=?""",
                            (status, _json(safe_outputs), job_id, attempt["id"]))

    def expired(self, job_id, worker_id, now):
        with self.lock:
            self.db.execute("""UPDATE capacity_attempts SET ended_at=?,status='expired',gap=1
                WHERE job_id=? AND worker_id=? AND ended_at IS NULL""", (_timestamp(now), job_id, worker_id))
            self.db.execute("""UPDATE capacity_tasks SET status='queued' WHERE job_id=?
                AND current_attempt IN (SELECT id FROM capacity_attempts WHERE job_id=?
                AND worker_id=? AND status='expired')""", (job_id, job_id, worker_id))

    def canceled_queued(self, job_id, now):
        _timestamp(now)
        with self.lock:
            self.db.execute("""UPDATE capacity_tasks SET status='canceled' WHERE job_id=?
                AND status='queued'""", (job_id,))

    def observe_worker(self, worker_dict, now, *, released=False):
        now, worker_id = _timestamp(now), worker_dict["id"]
        with self.lock:
            if released is True:
                # 心跳只确认此刻已经释放，不能将失联区间补成可信计时。
                self.db.execute("""UPDATE capacity_attempts SET released_at=?,
                    gap=CASE WHEN ended_at IS NULL OR status='expired' OR ?-ended_at>?
                        THEN 1 ELSE gap END,
                    ended_at=COALESCE(ended_at,?),
                    status=CASE WHEN ended_at IS NULL THEN 'unknown' ELSE status END
                    WHERE worker_id=? AND released_at IS NULL""",
                                (now, now, getattr(self.store, "offline_seconds", 30), now, worker_id))
            last = self.db.execute("SELECT MAX(observed_at) FROM capacity_observations WHERE worker_id=?",
                                   (worker_id,)).fetchone()[0]
            if last is None or now - last >= 60:
                config_id = self._snapshot(worker_dict, now)
                state = "busy" if worker_dict.get("busy") else "idle"
                if not worker_dict.get("comfy_online"):
                    state = "unavailable"
                self.db.execute("INSERT INTO capacity_observations VALUES (?,?,?,?)",
                                (worker_id, now, state, config_id))
            self.db.execute("DELETE FROM capacity_observations WHERE observed_at<?", (now - 30 * 86400,))
            # 从未用于任务的旧遥测配置也清理，避免硬件抖动导致无限留存。
            self.db.execute("""DELETE FROM capacity_configs WHERE valid_from<?
                AND id NOT IN (SELECT config_id FROM capacity_attempts)
                AND id NOT IN (SELECT config_id FROM capacity_observations)""", (now - 30 * 86400,))

    def cache(self, job_id, worker_id, lease_hash, nodes):
        try:
            safe = _nodes(nodes)
        except (ValueError, TypeError):
            safe = None
        with self.lock:
            row = self.db.execute("""SELECT id,cache_json FROM capacity_attempts WHERE
                job_id=? AND worker_id=? AND lease_hash=? AND ended_at IS NULL""",
                                  (job_id, worker_id, lease_hash)).fetchone()
            if row:
                previous = _load(row["cache_json"], [])
                value = {"invalid": True}
                if isinstance(previous, list) and safe is not None:
                    combined = {n["id"]: n for n in previous + safe}
                    if len(combined) <= 2048:
                        value = list(combined.values())
                self.db.execute("UPDATE capacity_attempts SET cache_json=? WHERE id=?", (_json(value), row["id"]))

    def record_artifact(self, job_id, key, metadata):
        """只接收服务端探测结果；事务与资源归属校验由上传入口负责。"""
        if not isinstance(metadata, dict):
            raise ValueError("产物元数据必须为对象")
        output = _outputs([dict(metadata, key=key)])[0]
        with self.lock:
            self.db.execute("""INSERT INTO capacity_artifacts VALUES (?,?,?)
                ON CONFLICT(job_id,key_hash) DO UPDATE SET metadata_json=excluded.metadata_json""",
                            (job_id, output["key"], _json(output)))

    def artifact_outputs(self, job_id, keys):
        if not isinstance(keys, list):
            raise ValueError("产物引用必须为列表")
        if len(keys) > 512:
            # 不截断成伪完整产量；统计上限不应阻止业务交付大批产物。
            return None
        result, seen = [], set()
        with self.lock:
            for key in keys:
                if not _text(key, 1024):
                    raise ValueError("产物引用无效")
                if key in seen:
                    continue
                seen.add(key)
                row = self.db.execute("SELECT metadata_json FROM capacity_artifacts WHERE job_id=? AND key_hash=?",
                                      (job_id, _hash(key))).fetchone()
                metadata = _load(row[0], {}) if row else {"valid": False}
                result.append(dict(metadata, key=key))
        return result

    def update_worker(self, worker_id, payload):
        """仅新增人工元数据版本；不改业务 worker，不接受回溯生效时间。"""
        if not isinstance(payload, dict) or set(payload) - {"host_id", "gpus", "memory_total_bytes", "cpu", "os", "environment_id", "model_version", "execution_device", "disk", "note"}:
            raise ValueError("只允许补录硬件字段，不能回溯修改生效时间")
        safe = {}
        for key, value in payload.items():
            if key == "memory_total_bytes":
                value = _num(value, positive=True)
            elif key == "gpus":
                if not isinstance(value, list) or not 1 <= len(value) <= 32:
                    raise ValueError("GPU 列表无效")
                value = [{"name": _text(g.get("name")), "memory_total_bytes": _num(g.get("memory_total_bytes"), positive=True)}
                         if isinstance(g, dict) else {} for g in value]
                if any(not g.get("name") or not g.get("memory_total_bytes") for g in value):
                    raise ValueError("GPU 配置不完整")
            elif key in {"disk", "note"}:
                value = _text(value, 500 if key == "note" else 160)
            elif key in {"cpu", "os"}:
                value = _hardware_description(value, key)
            elif key == "execution_device":
                value = _execution_devices(value)
            else:
                value = _version(value) if key in {"environment_id", "model_version"} else _token(value)
            if value is None:
                raise ValueError("硬件字段无效")
            safe[key] = value
        with self.lock:
            if not self.db.execute("SELECT id FROM workers WHERE id=?", (worker_id,)).fetchone():
                raise KeyError(worker_id)
            previous = self.db.execute("""SELECT hardware_json FROM capacity_worker_metadata
                WHERE worker_id=? ORDER BY valid_from DESC,rowid DESC LIMIT 1""", (worker_id,)).fetchone()
            merged = _load(previous[0], {}) if previous else {}
            merged.update(safe)
            now, revision = time.time(), str(uuid.uuid4())
            self.db.execute("INSERT INTO capacity_worker_metadata VALUES (?,?,?,?,?)",
                            (revision, worker_id, now, _json(merged), "manual"))
            return {"id": revision, "worker_id": worker_id, "valid_from": now,
                    "source": "manual", "hardware": {k: v for k, v in merged.items() if k != "note"},
                    "note": merged.get("note")}

    def _rows(self, table):
        if not self.db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone():
            return []
        # 表名均为内部常量，用户参数永不拼入 SQL。
        return [dict(row) for row in self.db.execute("SELECT * FROM " + table)]

    @staticmethod
    def _technical(spec, status, outputs):
        if status != "done":
            return (0 if status in TERMINAL else None), [], []
        if outputs is None or not outputs:
            return None, [], ["缺少服务端可验证的最终产物"]
        expected = spec.get("expected", {})
        if not all(expected.get(k) for k in ("kind", "width", "height")):
            return None, [], ["输出规格未知，不能确认技术有效产量"]
        if expected["kind"] == "video" and not expected.get("duration"):
            return None, [], ["输出视频时长约定未知"]
        valid, warnings = [], []
        for output in outputs:
            match = (output.get("valid") is True and _num(output.get("bytes"), positive=True) is not None
                     and output.get("kind") == expected["kind"]
                     and output.get("width") == expected["width"]
                     and output.get("height") == expected["height"])
            if expected["kind"] == "video":
                duration = _num(output.get("duration"), positive=True)
                match = match and duration is not None and abs(duration - expected["duration"]) <= max(0.15, expected["duration"] * 0.02)
                if expected.get("fps"):
                    fps = _num(output.get("fps"), positive=True)
                    match = match and fps is not None and abs(fps - expected["fps"]) <= max(0.1, expected["fps"] * 0.005)
            if match:
                valid.append(output)
            else:
                warnings.append("存在不可读或规格不匹配的产物")
        if expected.get("count") is not None and len(valid) != expected["count"]:
            warnings.append("有效输出数量不符合约定")
        return len(valid), valid, sorted(set(warnings))

    @staticmethod
    def _attempt_evidence(attempt, config, spec):
        warnings = []
        assigned, started = attempt["assigned_at"], attempt["started_at"]
        ended, released = attempt["ended_at"], attempt["released_at"]
        occupied = None
        if released is None or ended is None or released < ended or ended < assigned or attempt["gap"]:
            warnings.append("尝试释放未确认、失联或时间边界不完整")
        else:
            occupied = released - assigned
        if started is not None and (started < assigned or (ended is not None and started > ended)):
            warnings.append("尝试开始时间异常")
        hardware = _load(config.get("hardware_json"), {}) if config else {}
        if not all(hardware.get(k) for k in ("host_id", "gpus", "memory_total_bytes", "cpu", "os", "environment_id")):
            warnings.append("执行时硬件、主机身份或环境版本未知")
        if any(not g.get("name") or not g.get("memory_total_bytes") for g in hardware.get("gpus", [])):
            warnings.append("GPU 配置不完整")
        for key, required in (("cpu", "model"), ("os", "name")):
            if isinstance(hardware.get(key), dict) and not hardware[key].get(required):
                warnings.append("CPU 型号或操作系统身份不完整")
        measurement = _load(attempt.get("measurements_json"), {}) or {}
        failed = attempt["status"] in {"error", "canceled"}
        fields = ("prepare_seconds", "execute_seconds", "upload_seconds", "total_seconds")
        if measurement.get("invalid"):
            warnings.append("Worker 计时数据无效，已隔离且不影响业务终态")
        if not ("total_seconds" in measurement if failed else all(k in measurement for k in fields)):
            warnings.append("Worker 阶段计时不完整")
        if "total_seconds" in measurement:
            total = measurement["total_seconds"]
            # 失败可能发生于准备或执行阶段，尚未发生的阶段不能要求 Worker 伪填零。
            if sum(measurement.get(k, 0) for k in fields[:3]) > total + max(0.1, total * 0.02):
                warnings.append("Worker 阶段计时不一致")
            if occupied is not None and total > occupied + max(1, occupied * 0.05):
                warnings.append("Worker 总计时超过服务端占机边界")
            if (not failed and total < 1) or total > 3600:
                warnings.append("存在亚秒或超一小时耗时异常，保留样本待核查")
        if measurement.get("graph_changed") is True or (not failed and measurement.get("graph_changed") is not False):
            warnings.append("执行图变化未确认或已修改")
        condition = _cache_condition(attempt, spec)
        if isinstance(_load(attempt.get("cache_json"), None), dict):
            warnings.append("缓存节点记录无效，缓存影响未知")
        elif condition["kind"] == "unknown":
            warnings.append("缓存节点类型或影响未知，不能确认可比条件")
        elif condition["kind"] == "execution":
            warnings.append("存在执行或产物节点的部分缓存，不能作为生成基线；不视为全缓存")
        return occupied, warnings

    def report(self, start=None, end=None, worker_id=None, capability=None, limit=100, offset=0):
        start, end = _timestamp(start), _timestamp(end)
        if start is not None and end is not None and start >= end:
            raise ValueError("开始时间必须早于结束时间")
        if type(limit) is not int or not 1 <= limit <= 1000 or type(offset) is not int or offset < 0:
            raise ValueError("分页参数无效，limit 范围为 1..1000")
        with self.lock:
            ledger = self._rows("cost_events")
            tasks = {r["job_id"]: r for r in self._rows("capacity_tasks")}
            workers = {r["id"]: r for r in self._rows("workers")}
            configs = {r["id"]: r for r in self._rows("capacity_configs")}
            attempts = {}
            for attempt in self._rows("capacity_attempts"):
                attempts.setdefault(attempt["job_id"], []).append(attempt)
            metadata = self._rows("capacity_worker_metadata")
            historical_reviews = {r["job_id"]: _load(r["review_json"], {}) for r in self._rows("capacity_reviews")}
        def selected(row):
            return ((start is None or row["created_at"] >= start)
                    and (end is None or row["created_at"] < end)
                    and (not worker_id or row.get("worker_id") == worker_id)
                    and (not capability or row.get("capability") == capability))
        events, excluded_api, api_ids = {}, 0, set()
        for row in ledger:
            if row.get("event_kind") != "generation":
                api_ids.add(row["job_id"])
                if selected(row):
                    excluded_api += 1
                continue
            events[row["job_id"]] = row
        for job_id, task in tasks.items():
            if job_id in api_ids:
                continue
            event = dict(events.get(job_id, {}))
            job_attempts = attempts.get(job_id, [])
            current = next((a for a in job_attempts if a["id"] == task["current_attempt"]), None)
            legacy = _load(task["spec_json"], {}).get("version") is None
            event.update({"job_id": job_id,
                          "capability": event.get("capability", task["capability"]) if task["capability"] == "unknown" else task["capability"],
                          "created_at": event.get("created_at", task["created_at"]) if legacy else task["created_at"],
                          "status": task["status"], "worker_id": current["worker_id"] if current else event.get("worker_id")})
            events[job_id] = event
        details, buckets, worker_stats = [], {}, {}
        overview = {"tasks": 0, "done": 0, "error": 0, "canceled": 0, "unknown_worker": 0,
                    "historical_tasks": 0, "captured_tasks": 0, "excluded_api": excluded_api,
                    "output_images": None, "output_videos": None, "output_seconds": None, "unknown_outputs": 0}
        # 使用所有 ID，而非调度器按名字去重的 list_workers。
        for wid, worker in workers.items():
            if worker_id and wid != worker_id:
                continue
            last_seen = _num(worker.get("last_seen"))
            if last_seen is None or time.time() - last_seen > getattr(self.store, "offline_seconds", 30):
                state = "offline"
            elif worker.get("sync_status") in {"pending", "running"}:
                state = "syncing"
            elif not worker.get("enabled", True):
                state = "disabled"
            elif not worker.get("comfy_online"):
                state = "error"
            else:
                state = "busy" if worker.get("busy") or worker.get("current_job_id") else "idle"
            hardware = _hardware(worker)
            caps = _load(worker.get("capabilities_json"), {})
            caps = caps if isinstance(caps, dict) else {}
            agent_version = _num(caps.get("agent_version"))
            flag = caps.get("supports_capacity_telemetry")
            supports_capacity_telemetry = bool(agent_version is not None and agent_version >= 4
                                               and (flag is True or type(flag) is int and flag == 1))
            metas = [m for m in metadata if m["worker_id"] == wid]
            if metas:
                # 当前清单可展示人工备注；执行快照和 CSV 分组不携带备注。
                hardware.update(_load(max(metas, key=lambda m: m["valid_from"])["hardware_json"], {}))
            worker_stats[wid] = {"id": wid, "name": _text(worker.get("name")), "state": state,
                                 "last_seen": last_seen, "hardware": hardware, "tasks": 0,
                                 "agent_version": agent_version, "supports_capacity_telemetry": supports_capacity_telemetry,
                                 "done": 0, "error": 0, "canceled": 0, "runtime_seconds": None,
                                 "config_state": "current_or_last_reported", "hardware_source": "manual+reported" if metas else "reported"}
        for event in sorted(events.values(), key=lambda r: (r["created_at"], r["job_id"]), reverse=True):
            if not selected(event):
                continue
            job_id, wid, status = event["job_id"], event.get("worker_id"), event["status"]
            task = tasks.get(job_id)
            spec = _load(task["spec_json"], {}) if task else {"dimensions": _dimensions(_load(event.get("dimensions_json"), {}))}
            if task and spec.get("version") is None:
                # 保留账本真正已知的规格，但绝不补造提交图、版本及输出。
                spec["dimensions"] = _dimensions(_load(event.get("dimensions_json"), {}))
                spec["spec_key"] = _hash([event["capability"], spec["dimensions"], "legacy"])
            job_attempts = sorted(attempts.get(job_id, []), key=lambda a: (a["assigned_at"], a["id"]))
            current = next((a for a in job_attempts if task and a["id"] == task["current_attempt"]), None)
            current_hardware = _load(configs.get(current["config_id"] if current else None, {}).get("hardware_json"), {})
            actual_model_version = current_hardware.get("model_version")
            if spec.get("version") == 1 and not spec.get("model_version") and actual_model_version:
                # 仅用该次领取时的不可变快照形成执行证据，不回写任务提交快照。
                spec["model_version"] = actual_model_version
                spec["model_version_source"] = "worker_snapshot"
                spec["warnings"] = [w for w in spec.get("warnings", []) if w != "模型版本未知；模型名称不等于版本"]
                spec["complete"] = not spec["warnings"]
                spec["spec_key"] = _hash({k: v for k, v in spec.items() if k not in {"spec_key", "warnings"}})
            review = (_load(task["review_json"], {}) if task else historical_reviews.get(job_id, {})) or {}
            review = {"accepted": review.get("accepted"), "source": review.get("source", "business"),
                      "benchmark_id": review.get("benchmark_id"), "note": review.get("note")}
            source = ("standard" if review["source"] == "standard" else "captured") if task else "historical"
            name = _text(workers.get(wid, {}).get("name")) or (current["worker_name"] if current else None)
            runtime = _num(event.get("runtime_seconds")) if status in TERMINAL else None
            if runtime is None and current and current["started_at"] is not None and current["ended_at"] is not None:
                runtime = _num(current["ended_at"] - current["started_at"]) if status in TERMINAL else None
            warnings = list(spec.get("warnings", []))
            if source == "standard" and not review["benchmark_id"]:
                warnings.append("标准标签缺少基准编号，不能作为标准基线")
            if actual_model_version and spec.get("model_version") != actual_model_version:
                warnings.append("请求模型版本与执行时模型版本不一致")
            if not task:
                warnings.append("历史成功 runtime 参考；缺少执行时配置、占机及输出证据")
            if status not in TERMINAL:
                warnings.append("非终态任务不进入速度分母")
            if status == "done" and runtime is None:
                warnings.append("成功任务耗时未知或无效，未自动补零")
            if runtime is not None and ((status == "done" and runtime < 1) or runtime > 3600):
                warnings.append("存在亚秒或超一小时耗时异常，保留样本待核查")
            raw_outputs = _load(task["outputs_json"], None) if task else None
            count, valid, output_warnings = self._technical(spec, status, raw_outputs)
            if not task:
                count = None
            warnings.extend(output_warnings)
            occupied_values, public_attempts, cache_conditions = [], [], {}
            for attempt in job_attempts:
                condition = _cache_condition(attempt, spec)
                if condition["kind"] != "loss_only":
                    cache_conditions[_json(condition)] = condition
                occupied, reasons = self._attempt_evidence(attempt, configs.get(attempt["config_id"]), spec)
                occupied_values.append(occupied)
                warnings.extend(reasons)
                public_attempts.append({k: attempt[k] for k in ("id", "worker_id", "worker_name", "config_id",
                                                               "assigned_at", "started_at", "ended_at", "released_at", "status")})
                public_attempts[-1].update({"occupied_seconds": occupied, "release_known": attempt["released_at"] is not None,
                                           "gap": bool(attempt["gap"]), "cache_condition": condition,
                                           "measurements": _load(attempt["measurements_json"]),
                                           "cached_nodes": _load(attempt["cache_json"]) if isinstance(_load(attempt["cache_json"]), list) else None,
                                           "cache_invalid": isinstance(_load(attempt["cache_json"]), dict), "warnings": reasons})
            config_id = current["config_id"] if current else None
            if not job_attempts:
                warnings.append("没有完整执行尝试记录")
            if len({(a["worker_id"], a["config_id"]) for a in job_attempts}) > 1:
                warnings.append("重试跨 Worker 或配置，不能作为单机配置基线")
            occupied = sum(occupied_values) if occupied_values and all(v is not None for v in occupied_values) else None
            if wid is None or (wid not in workers and not current):
                warnings.append("执行端未知或已删除且无历史配置快照，主机归属未知")
            current_hardware = _load(configs.get(config_id, {}).get("hardware_json"), {})
            host_id = current_hardware.get("host_id")
            if host_id:
                host_workers = {c["worker_id"] for c in configs.values()
                                if _load(c["hardware_json"], {}).get("host_id") == host_id}
                host_workers.update(w for w, row in workers.items() if _hardware(row).get("host_id") == host_id)
                if len(host_workers) > 1:
                    warnings.append("同主机存在多个 Worker，资源槽位隔离未经验证")
            spec_key = spec.get("spec_key") or _hash([event["capability"], spec.get("dimensions", {})])
            conditions = [cache_conditions[key] for key in sorted(cache_conditions)]
            cache_condition = (conditions[0] if len(conditions) == 1 else
                               {"kind": "mixed", "conditions": conditions} if conditions else {"kind": "none", "nodes": []})
            if len(conditions) > 1:
                warnings.append("重试跨缓存条件，完整损耗不能归为单一缓存基线")
            evidence_key = _hash([wid, event["capability"], spec_key, config_id, source,
                                  review["benchmark_id"] if source == "standard" else None])
            group_id = _hash([evidence_key, cache_condition])
            detail = {"job_id": job_id, "capability": event["capability"], "worker_id": wid,
                      "worker_name": name, "status": status, "source": source, "created_at": event["created_at"],
                      "runtime_seconds": runtime, "attempts": public_attempts, "outputs": raw_outputs,
                      "review": review, "warnings": sorted(set(warnings)), "group_id": group_id,
                      "output_count": count, "occupied_seconds": occupied, "spec": spec, "config_id": config_id,
                      "cache_condition": cache_condition}
            details.append(detail)
            bucket = buckets.setdefault(group_id, {"rows": [], "spec": spec, "valid": [], "evidence_key": evidence_key})
            bucket["rows"].append(detail)
            bucket["valid"].extend(valid)
            overview["tasks"] += 1
            if status in TERMINAL:
                overview[status] += 1
            overview["captured_tasks" if task else "historical_tasks"] += 1
            if wid is None or (wid not in workers and not current):
                overview["unknown_worker"] += 1
            if status == "done" and count is None:
                overview["unknown_outputs"] += 1
            if status == "done" and count is not None:
                for field, amount in (("output_images", sum(o["kind"] == "image" for o in valid)),
                                      ("output_videos", sum(o["kind"] == "video" for o in valid)),
                                      ("output_seconds", sum(o["duration"] for o in valid if o["kind"] == "video"))):
                    overview[field] = (overview[field] or 0) + amount
            if wid is not None:
                stats = worker_stats.setdefault(wid, {"id": wid, "name": name, "state": "historical", "last_seen": None,
                    "hardware": {"host_id": None, "gpus": [], "memory_total_bytes": None, "cpu": None, "os": None, "environment_id": None},
                    "tasks": 0, "done": 0, "error": 0, "canceled": 0, "runtime_seconds": None,
                    "config_state": "historical_unknown", "hardware_source": "unknown",
                    "agent_version": None, "supports_capacity_telemetry": False})
                stats["tasks"] += 1
                if status in TERMINAL:
                    stats[status] += 1
                if runtime is not None:
                    stats["runtime_seconds"] = (stats["runtime_seconds"] or 0) + runtime
        groups, evidence_cohorts = [], {}
        for bucket in buckets.values():
            evidence_cohorts.setdefault(bucket["evidence_key"], []).append(bucket)
        for group_id, bucket in buckets.items():
            rows, spec = bucket["rows"], bucket["spec"]
            first = rows[0]
            successful = [r for r in rows if r["status"] == "done"]
            runtimes = [r["runtime_seconds"] for r in successful if r["runtime_seconds"] is not None]
            warnings = sorted({w for r in rows for w in r["warnings"]})
            peers = evidence_cohorts[bucket["evidence_key"]]
            if len(peers) > 1 and any(r["status"] in {"error", "canceled"} or
                    any(a["status"] in {"error", "canceled", "expired", "unknown"} for a in r["attempts"])
                    for peer in peers for r in peer["rows"]):
                warnings.append("同规格存在跨缓存条件失败或重试，完整失败损耗归属不足，不能拆出成功组作基线")
            terminal_rows = [r for r in rows if r["status"] in TERMINAL]
            occupied = (sum(r["occupied_seconds"] for r in terminal_rows)
                        if terminal_rows and len(terminal_rows) == len(rows)
                        and all(r["occupied_seconds"] is not None for r in terminal_rows) else None)
            count = (sum(r["output_count"] for r in terminal_rows)
                     if terminal_rows and all(r["output_count"] is not None for r in terminal_rows) else None)
            mean = statistics.mean(runtimes) if runtimes else None
            config_id = first["config_id"]
            eligible = bool(first["source"] != "historical" and not warnings and occupied and count and spec.get("complete"))
            seconds_per_unit = occupied / count if occupied is not None and count else None
            accepted = (sum(r["review"]["accepted"] for r in terminal_rows)
                        if terminal_rows and all(type(r["review"]["accepted"]) is int for r in terminal_rows) else None)
            qualified = occupied / accepted if occupied is not None and accepted else None
            days = sorted({datetime.fromtimestamp(r["created_at"], timezone.utc).date().isoformat() for r in rows})
            if len(terminal_rows) < MIN_BASELINE_SAMPLES or len(days) < MIN_BASELINE_DAYS:
                eligible = False
                warnings.append("样本少于 30 个或覆盖不足 3 天，仅供实测探索，不作为已验证采购基线")
            if first["cache_condition"]["kind"] == "loaders":
                warnings.append("仅确认加载节点部分缓存，独立暖缓存条件；不代表全缓存或冷启动产能")
            if any(a["cache_condition"]["kind"] == "loss_only" for r in rows for a in r["attempts"]):
                warnings.append("失败阶段缓存未确认，完整占机已计损耗；未补造无缓存执行证据")
            if accepted is None:
                warnings.append("人工验收未覆盖完整终态样本群")
            if first["source"] == "standard":
                warnings.append("标准标签由人工声明，不代表已验证受控跑分")
            groups.append({"id": group_id, "worker_id": first["worker_id"], "worker_name": first["worker_name"],
                "capability": first["capability"], "capability_name": first["capability"],
                "dimensions": spec.get("dimensions", {}), "spec_key": spec.get("spec_key") or _hash([first["capability"], spec.get("dimensions", {})]),
                "source": first["source"], "cache_condition": first["cache_condition"],
                "benchmark_id": first["review"]["benchmark_id"] if first["source"] == "standard" else None,
                "samples": len(rows), "done": len(successful),
                "error": sum(r["status"] == "error" for r in rows), "canceled": sum(r["status"] == "canceled" for r in rows),
                "measured": len(runtimes), "mean_seconds": mean, "p50_seconds": _percentile(runtimes, 0.5),
                "p90_seconds": _percentile(runtimes, 0.9), "runtime_seconds": _sum_known(runtimes),
                "reference_per_hour": 3600 / mean if mean and mean > 0 else None,
                "output_count": count if first["source"] != "historical" else None,
                "unit": spec.get("expected", {}).get("kind") if first["source"] != "historical" else "task",
                "occupied_seconds": occupied, "seconds_per_unit": seconds_per_unit,
                "qualified_seconds_per_unit": qualified, "eligible": eligible, "warnings": warnings,
                "days": days, "config_id": config_id, "spec": spec,
                "model_summary": model_summary(spec),
                "last_sample_at": max((r["created_at"] for r in successful if r["runtime_seconds"] is not None), default=None),
                "config": _load(configs.get(config_id, {}).get("hardware_json")),
                "config_source": configs.get(config_id, {}).get("source"),
                "reviewed": sum(r["review"]["accepted"] is not None for r in terminal_rows),
                "accepted": accepted})
        return {"period": {"from": start, "to": end}, "overview": overview,
                "workers": sorted(worker_stats.values(), key=lambda w: (w["name"] or "", w["id"])),
                "groups": sorted(groups, key=lambda g: (-g["samples"], g["id"])),
                "details": details[offset:offset + limit], "details_total": len(details)}

    def review(self, job_id, payload):
        if not isinstance(payload, dict) or set(payload) - {"accepted", "source", "benchmark_id", "note"}:
            raise ValueError("审阅字段无效")
        accepted = payload.get("accepted")
        if accepted is not None and (type(accepted) is not int or accepted < 0):
            raise ValueError("accepted 必须为非负整数或 null")
        source = payload.get("source", "business")
        if not isinstance(source, str) or source not in {"business", "standard"}:
            raise ValueError("审阅来源无效")
        result = {"accepted": accepted, "source": source}
        for key, size in (("benchmark_id", 100), ("note", 500)):
            value = payload.get(key)
            if value is not None and value != "" and _text(value, size) is None:
                raise ValueError("审阅文本过长或含控制字符")
            result[key] = _text(value, size) if value else None
        if source == "standard" and not result["benchmark_id"]:
            raise ValueError("标准审阅必须提供有效 benchmark_id")
        with self.lock:
            row = self.db.execute("SELECT * FROM capacity_tasks WHERE job_id=?", (job_id,)).fetchone()
            if not row:
                old = next((r for r in self._rows("cost_events") if r["job_id"] == job_id and r.get("event_kind") == "generation"), None)
                if not old:
                    raise KeyError(job_id)
                # 历史允许备注及标准声明，但来源仍为 historical，不补造有效产量。
                if accepted is not None:
                    raise ValueError("历史任务缺少输出证据，accepted 只能为 null")
                self.db.execute("""INSERT INTO capacity_reviews VALUES (?,?)
                    ON CONFLICT(job_id) DO UPDATE SET review_json=excluded.review_json""", (job_id, _json(result)))
                return result
            count, _, _ = self._technical(_load(row["spec_json"], {}), row["status"], _load(row["outputs_json"]))
            if accepted is not None and (count is None or accepted > count):
                raise ValueError("验收数不能超过可验证的技术有效输出数")
            self.db.execute("UPDATE capacity_tasks SET review_json=? WHERE job_id=?", (_json(result), job_id))
        return result

    def estimate(self, payload):
        if not isinstance(payload, dict):
            raise ValueError("测算参数无效")
        mode, quality = payload.get("mode"), payload.get("quality")
        if (not isinstance(mode, str) or not isinstance(quality, str)
                or mode not in {"historical", "verified"} or quality not in {"technical", "accepted"}):
            raise ValueError("测算模式或质量口径无效")
        if mode == "historical" and quality != "technical":
            raise ValueError("历史参考不支持人工合格产量")
        values = {}
        for key, upper in (("hours", 24), ("availability", 1), ("utilization", 1)):
            value = _num(payload.get(key), positive=True)
            if value is None or value > upper:
                raise ValueError(key + " 必须在 (0," + str(upper) + "]")
            values[key] = value
        price = payload.get("price")
        if price is not None:
            price = _num(price)
            if price is None:
                raise ValueError("价格必须是非负有限数")
        demands = payload.get("demands")
        if not isinstance(demands, list) or not 1 <= len(demands) <= 50:
            raise ValueError("demands 必须包含 1..50 项")
        if not _text(payload.get("worker_id")):
            raise ValueError("必须选择确切 Worker ID")
        report = self.report(payload.get("from"), payload.get("to"), worker_id=payload["worker_id"])
        available = {g["id"]: g for g in report["groups"]}
        daily = values["hours"] * 3600 * values["availability"] * values["utilization"]
        if daily <= 0 or not math.isfinite(daily):
            raise ValueError("每日容量超出有限数精度范围")
        total, lines, warnings, configs = 0.0, [], set(), set()
        seen_groups, evidence_sources = set(), set()
        for demand in demands:
            if not isinstance(demand, dict) or not isinstance(demand.get("group_id"), str):
                raise ValueError("业务组参数无效")
            group = available.get(demand["group_id"])
            quantity = _num(demand.get("quantity"))
            if not group or quantity is None:
                raise ValueError("业务组不存在或数量不是非负有限数")
            if group["id"] in seen_groups:
                raise ValueError("不能重复提交同一 group_id")
            seen_groups.add(group["id"])
            evidence_sources.add((group["source"], group.get("benchmark_id")))
            if len(evidence_sources) > 1:
                raise ValueError("混合业务必须采用相同来源和相同基准编号")
            configs.add(group["config_id"])
            if mode == "verified":
                if not group["eligible"] or group["source"] == "historical":
                    raise ValueError("该组证据不完整，不能用于已验证基线")
                seconds = group["qualified_seconds_per_unit"] if quality == "accepted" else group["seconds_per_unit"]
            else:
                seconds = group["mean_seconds"]
                warnings.add("历史参考仅代表成功任务 runtime；未包含完整失败、准备、释放及质量损耗，数量单位为任务")
            if seconds is None or seconds <= 0:
                raise ValueError("该组没有可用的正耗时或完整验收群")
            required = quantity * seconds
            if not math.isfinite(required) or not math.isfinite(total + required):
                raise ValueError("测算数值溢出")
            total += required
            daily_units = daily / seconds
            if not math.isfinite(daily_units):
                raise ValueError("每日产量溢出")
            lines.append({"group_id": group["id"], "quantity": quantity, "seconds_per_unit": seconds,
                          "daily_units": daily_units})
            warnings.update(group["warnings"])
        if len(configs) > 1:
            raise ValueError("混合业务必须来自同一 Worker 的同一配置版本")
        quotient = total / daily
        if not math.isfinite(quotient):
            raise ValueError("机器数溢出")
        machines = math.ceil(quotient)
        price_total = machines * price if price is not None else None
        if price_total is not None and (not math.isfinite(price_total) or price_total < 0):
            raise ValueError("采购金额溢出")
        assumptions = ["按单个已观测 Worker 执行槽位估算，不按显卡数线性放大",
                       "availability 只扣样本外维护、停机及其他业务占用",
                       "utilization 表示波动和排队预留，不是 GPU 利用率",
                       "已验证单位占机包含失败重试；不再次扣成功率或合格率",
                       "假设业务组合及模型冷热状态与样本一致；不保证峰值 SLA 或同型号机器一致性",
                       "时间筛选按任务提交时间，包含该任务所有已记录尝试"]
        if mode == "historical":
            assumptions.append("历史配置未知不代表已核实相同硬件；结果仅供受限运行参考")
        return {"mode": mode, "quality": quality, "worker_id": payload["worker_id"],
                "total_seconds": total, "daily_capacity_seconds": daily, "machines": machines,
                "price_total": price_total, "lines": lines, "warnings": sorted(warnings), "assumptions": assumptions}


def export_csv(report):
    """导出全部分组证据，而非分页明细；字符串防止电子表格公式注入。"""
    fields = ["from", "to", "id", "worker_id", "worker_name", "capability", "source", "benchmark_id",
              "dimensions", "spec_key", "spec", "config_id", "config", "config_source", "cache_condition",
              "model_summary", "last_sample_at", "agent_version", "supports_capacity_telemetry",
              "days", "samples", "done", "error", "canceled", "measured", "mean_seconds",
              "p50_seconds", "p90_seconds", "runtime_seconds", "reference_per_hour", "output_count",
              "unit", "occupied_seconds", "seconds_per_unit", "qualified_seconds_per_unit", "eligible", "warnings"]
    def cell(value):
        if value is None:
            return ""
        if isinstance(value, (dict, list)):
            value = _json(value)
        value = str(value)
        # 去掉前置空白后仍需检查，覆盖制表符、换行及 BOM 隐藏公式。
        if value.lstrip(" \t\r\n\ufeff").startswith(("=", "+", "-", "@")) or value.startswith(("\t", "\r", "\n")):
            value = "'" + value
        return value
    stream = io.StringIO(newline="")
    writer = csv.writer(stream)
    writer.writerow(fields)
    workers = {worker["id"]: worker for worker in report.get("workers", [])}
    for group in report.get("groups", []):
        row = dict(group, **report.get("period", {}))
        # 版本/支持标记来自当前 Worker 清单，不是该历史任务执行时的配置证据。
        worker = workers.get(group.get("worker_id"), {})
        row.update({"agent_version": worker.get("agent_version"),
                    "supports_capacity_telemetry": worker.get("supports_capacity_telemetry", False)})
        writer.writerow([cell(row.get(field)) for field in fields])
    return "\ufeff" + stream.getvalue()
