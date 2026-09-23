# -*- coding: utf-8 -*-
"""
抽卡系统 后端 (P0)

职责：
  1. 把 manifests/ 里的能力清单喂给前端（画布卡片的字段就是它生成的）
  2. 接收用户上传的图/音频，转存进 ComfyUI 的 input 目录
  3. 按 manifest 把参数打进 API 工作流模板 -> POST /prompt
  4. 常驻监听 ComfyUI 的 WebSocket，跟踪进度
  5. 产物统一走本服务代理，ComfyUI 端口不暴露

启动：  chouka\\启动抽卡系统.bat
"""
import asyncio
import copy
import hmac
import os
import json
import math
import mimetypes
import random
import re
import socket
import shutil
import subprocess
import sys
import time
import uuid
from pathlib import Path
from urllib.parse import urlencode
from collections import defaultdict
from functools import partial

import aiohttp
from aiohttp import web

# 整合包那个 python_embeded 带 python312._pth，有这个文件 Python 就**不会**把脚本
# 自己的目录塞进 sys.path，于是同目录的 rewrite.py 直接 import 不到（报
# ModuleNotFoundError: No module named 'rewrite'）。自己补上。
sys.path.insert(0, str(Path(__file__).resolve().parent))
import rewrite as rw
import llm
import translate as tr
from costs import CostLedger
from distributed import (
    DistributedStore, HIGH_VRAM_GPU_POLICY, HIGH_VRAM_CAPABILITIES,
    can_run_capability,
)
from video_preview import VideoPreviews, preview_status, preview_file
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from server.auth_store import AuthStore
from server.dingtalk_approval import setup_dingtalk, stop_dingtalk
from server.auth import (auth_middleware, register_auth_routes, require_user, require_admin,
                         require_team_leader, require_project, require_job, call_store,
                         setup_local_test_auth)
from server.resource_access import ResourceAccess
from server.image_controls import image_controls, patch_image_controls

ROOT = Path(__file__).resolve().parent.parent          # chouka/
PACK = ROOT.parent                                     # 整合包根目录
COMFY_INPUT = PACK / "ComfyUI" / "input"
COMFY_HTTP = os.environ.get("CHOUKA_COMFY_URL", "http://127.0.0.1:8188").rstrip("/")
COMFY_WS = COMFY_HTTP.replace("http://", "ws://", 1).replace("https://", "wss://", 1) + "/ws"
PORT = int(os.environ.get("CHOUKA_PORT", "8199"))
EXECUTION_MODE = os.environ.get("CHOUKA_EXECUTION_MODE", "local").strip().lower()
if EXECUTION_MODE not in ("local", "controller"):
    raise RuntimeError("CHOUKA_EXECUTION_MODE 只能是 local 或 controller")
CONTROLLER_MODE = EXECUTION_MODE == "controller"
ENROLLMENT_TOKEN = os.environ.get("CHOUKA_ENROLLMENT_TOKEN", "")
ARTIFACT_DIR = ROOT / "data" / "artifacts"
LONG_VIDEO_HIGH_VRAM_SECONDS = 10

MODEL_FAMILY = {
    **{cap: "minimax_h3" for cap in (
        "minimax_h3_i2v", "minimax_h3_flf2v", "minimax_h3_talk1",
        "minimax_h3_talk2", "minimax_h3_ref4", "minimax_h3_ref9",
        "minimax_h3_ref_2pass", "minimax_h3_comic20",
        "minimax_h3_character_transfer",
    )},
    "flux2_klein_edit": "flux2_klein",
    "flux2_klein_storyboard9": "flux2_klein",
    "rmbg_erase": "flux2_klein",
    "krea2_t2i": "krea2",
    "krea2_i2i": "krea2",
    "zimage_t2i": "zimage",
    "zimage_i2i": "zimage",
    "qwen_image_edit_2511_i2i": "qwen_image_edit_2511",
    "qwen_image_2512_t2i": "qwen_image_2512",
    "qwen_image_21_t2i": "qwen_image_21",
    "qwen_image_21_i2i": "qwen_image_21",
    "qwen_image_21_multi": "qwen_image_21",
    "qwen_image_reverse": "qwen35_27b",
    "qwen_video_reverse": "qwen35_27b",
    "rmbg_cutout": "rmbg2",
    "rmbg_bgonly": "rmbg2",
    "seedvr2_image_up": "seedvr2",
    "seedvr2_video_up": "seedvr2",
    "depth_image": "depth_anything3",
    "depth_video": "depth_anything3",
    "depthcrafter_video": "depthcrafter",
}


def model_family(capability_id):
    return MODEL_FAMILY.get(capability_id, capability_id)


MODEL_NAMES = {
    "minimax_h3": "MiniMax H3",
    "flux2_klein": "FLUX.2 Klein",
    "krea2": "Krea2",
    "zimage": "Z-Image",
    "qwen_image_edit_2511": "Qwen Image Edit 2511",
    "qwen_image_2512": "Qwen Image 2512（双阶段）",
    "qwen_image_21": "Qwen Image 2.1",
    "qwen35_27b": "Qwen3.5 27B",
    "rmbg2": "RMBG 2.0",
    "seedvr2": "SeedVR2",
    "depth_anything3": "Depth Anything 3",
    "depthcrafter": "DepthCrafter",
    "gimmvfi_interp": "GIMM-VFI",
    "grid4_stitch": "无需模型（拼图工具）",
    "rmbg_erase": "RMBG 2.0 + FLUX.2 Klein",
    "text": "Qwen3.5 27B",
}


def model_name(capability_id):
    if not capability_id:
        return "未知模型"
    family = model_family(capability_id)
    return MODEL_NAMES.get(capability_id, MODEL_NAMES.get(family, family))


CLIENT_ID = uuid.uuid4().hex
STARTED_AT = time.time()
JOBS = {}                  # prompt_id -> job dict
STEPS = {}                 # prompt_id -> {节点 id: 人能看懂的步骤名}
WEIGHTS = {}               # prompt_id -> {节点 id: 这一步在整体进度里占多重}
CAPS = {}                  # capability id -> manifest
CARDS = []
STATE = {"comfy_online": False}
DEBUG = bool(os.environ.get("CHOUKA_DEBUG"))


def distributed_store(app):
    store = app.get("distributed")
    if store is None:
        raise web.HTTPServiceUnavailable(reason="分布式控制层未启用")
    return store


def cost_ledger(app):
    return app.get("costs")


async def resource_call(app, method, *args, **kwargs):
    try:
        return await asyncio.to_thread(
            partial(getattr(app["resource_access"], method), *args, **kwargs))
    except (PermissionError, FileNotFoundError):
        raise web.HTTPNotFound(text="资源不存在或无权访问")
    except ValueError as exc:
        raise web.HTTPBadRequest(text=str(exc))


async def require_resource(request, kind, locator, project_id=None):
    user = require_user(request)
    if not await resource_call(request.app, "authorize", user["id"], kind,
                               locator, project_id=project_id):
        raise web.HTTPNotFound(text="资源不存在或无权访问")


def write_project(path, document):
    temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
    try:
        temporary.write_text(json.dumps(document, ensure_ascii=False), encoding="utf-8")
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


async def cache_comfy_outputs(request, card):
    """复制前把缺失的 Comfy 输出按固定上游受控落入私有缓存。"""
    refs = await resource_call(request.app, "references", card)
    session = request.app["session"]
    for kind, locator in refs:
        if kind != "comfy":
            continue
        path = await resource_call(request.app, "local_path", kind, locator)
        if path.is_file():
            continue
        obj = json.loads(locator)
        async with session.get(COMFY_HTTP + "/view", params=obj) as r:
            if r.status != 200:
                raise web.HTTPNotFound(text="ComfyUI 产物已不可用")
            data = await r.read()
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(path.suffix + ".part")
        await asyncio.to_thread(temporary.write_bytes, data)
        os.replace(temporary, path)


async def authorized_body(request):
    body = await request.json()
    if not isinstance(body, dict) or not isinstance(body.get("project"), str):
        raise web.HTTPBadRequest(text="必须提供画布 ID")
    await require_project(request, body["project"], operate=True)
    path = proj_path(body["project"])
    if not path.is_file():
        raise web.HTTPNotFound(text="画布不存在")
    project = json.loads(path.read_text(encoding="utf-8"))
    body["projectName"] = project.get("name", "未命名")
    await resource_call(request.app, "validate_assets", require_user(request)["id"],
                        body["project"], body.get("assets") or {})
    return body


@web.middleware
async def project_write_lock(request, handler):
    pid = request.match_info.get("pid") if request.path.startswith("/api/projects/") else None
    if request.path == "/api/generate" and request.method == "POST":
        body = await request.json()
        pid = body.get("project") if isinstance(body, dict) else None
    if request.path == "/api/upload" and request.method == "POST":
        pid = request.query.get("project")
    if isinstance(pid, str) and request.method not in ("GET", "HEAD", "OPTIONS"):
        async with request.app["project_locks"][pid]:
            return await handler(request)
    return await handler(request)


def record_api_cost(app, capability, result, elapsed_ms, body):
    ledger = cost_ledger(app)
    if ledger:
        ledger.record_api(
            capability, result.get("model"), result.get("prompt_tokens"),
            result.get("completion_tokens"), elapsed_ms,
            project=body.get("project"), project_name=body.get("projectName"),
            card=body.get("card"), card_name=body.get("cardName"),
        )


def controller_comfy_online(app):
    if not CONTROLLER_MODE:
        return STATE["comfy_online"]
    return any(w["state"] in ("idle", "busy") for w in distributed_store(app).list_workers())


IMG_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}
VID_EXT = {".mp4", ".webm", ".mkv", ".mov", ".avi"}
AUD_EXT = {".mp3", ".wav", ".flac", ".ogg", ".m4a"}


# =====================================================================
# 能力清单
# =====================================================================
ZH_NODES = {}              # class_type -> 扫描器生成的汉化词条
STEP_ZH = {}               # class_type -> 随服务发布的卡片底部步骤名


def load_caps():
    # 卡片底部的过程进度不能依赖 data/ 下的运行时缓存；控制层单独部署时也要有中文。
    bundled = ROOT / "manifests" / "_steps.json"
    STEP_ZH.clear()
    STEP_ZH.update(json.loads(bundled.read_text(encoding="utf-8")))

    # 扫描器生成的完整汉化缓存仍可补充新节点，缺失不影响服务启动。
    zh = ROOT / "data" / "zh_nodes.json"
    ZH_NODES.clear()
    if zh.exists():
        try:
            ZH_NODES.update(json.loads(zh.read_text(encoding="utf-8")))
        except Exception as e:
            print(f"[抽卡系统] 读不了 {zh.name}：{e}")
    CAPS.clear()
    for f in (ROOT / "manifests").glob("*.json"):
        if f.name.startswith("_"):
            continue
        m = json.loads(f.read_text(encoding="utf-8"))
        controls = image_controls(m["id"])
        if controls is not None:
            m["imageControls"] = controls
        gp = ROOT / m["graph"]
        m["_graph_ok"] = gp.exists()
        CAPS[m["id"]] = m
    cards_file = ROOT / "manifests" / "_cards.json"
    CARDS[:] = json.loads(cards_file.read_text(encoding="utf-8")) if cards_file.exists() else []
    # 只保留有可用工作流的模式。风格卡/文本卡/素材卡例外：它们没有能力、没有工作流
    # （素材卡不跑任何工作流，风格卡/文本卡要么不跑、要么走 /api/text 的 LLM 通路），
    # 照这条过滤会被清成 modes=[]，于是「新建卡片」菜单里消失。
    for c in CARDS:
        if c.get("kind") in ("style", "text", "asset"):
            continue
        c["modes"] = [md for md in c["modes"] if mode_ok(md)]
    return len(CAPS)


def graph_ok(wid):
    return bool(CAPS.get(wid, {}).get("_graph_ok"))


def mode_ok(md):
    """这个模式还有能跑的工作流吗。

    路由卡的模式 id 是卡片 id（`card_enhance`），本身不是能力 —— 得去看它每一路
    指向的那条。缺哪一路就把那一路删掉，剩一路也照样能用（少一种素材而已）；
    全缺了才整个模式不要。
    """
    if md.get("route"):
        md["route"] = {k: r for k, r in md["route"].items() if graph_ok(r["cap"])}
        return bool(md["route"])
    return graph_ok(md["id"])


def step_labels(graph):
    """节点 id -> 卡片底部显示的中文过程名称。"""
    labels = {}
    for nid, nd in graph.items():
        ct = nd.get("class_type") or ""
        scanned = (ZH_NODES.get(ct) or {}).get("titles") or []
        candidates = [
            STEP_ZH.get(ct),
            scanned[0] if scanned else None,
            (nd.get("_meta") or {}).get("title"),
        ]
        labels[nid] = next(
            (label for label in candidates
             if label and re.search(r"[\u3400-\u9fff]", label)),
            "处理中",
        )
    return labels


# 一条工作流二三十个节点，但九成时间只花在其中两三个上（去噪、超分、补帧），
# 剩下的加载、缩放、拼图都是一眨眼。整体进度要是按「节点数」平摊，进度条会先冲到
# 六成、再在采样那一格上卡三分钟不动，比原来每段各走一遍 100% 还难受。
# 所以给这几类重活配个权重，让它们占住进度条的大头。数字只是相对比例，不用精确。
# 从上往下第一个「类名里包含这个词」的算，都没命中就是 1。
STEP_WEIGHT = (
    ("SamplerSelect", 1),          # 只是挑一个采样器的名字，不干活
    ("Sampler", 60),               # 去噪：一次任务里最慢的一段
    ("SeedVR2VideoUpscaler", 60),  # 超分，按帧/批算
    ("GIMMVFI_interpolate", 60),   # 补帧，同上
    ("VAEDecode", 8),              # 解码出画面，视频长了也不便宜
    ("VideoCombine", 4),           # 编码成 mp4
    ("CreateVideo", 4),
    ("SaveVideo", 4),
)


def step_weights(graph):
    """节点 id -> 权重。给 handle_event 算「整条工作流跑到哪了」用。"""
    w = {}
    for nid, nd in graph.items():
        ct = nd.get("class_type") or ""
        w[nid] = next((v for k, v in STEP_WEIGHT if k in ct), 1)
    return w


def kind_of(name):
    ext = Path(name).suffix.lower()
    if ext in IMG_EXT:
        return "image"
    if ext in VID_EXT:
        return "video"
    if ext in AUD_EXT:
        return "audio"
    return "file"


# =====================================================================
# ComfyUI 客户端
# =====================================================================
async def comfy_upload(session, field_name, filename, data):
    """把用户上传的文件塞进 ComfyUI 的 input 目录，返回 LoadImage/LoadAudio 能用的值"""
    form = aiohttp.FormData()
    form.add_field("image", data, filename=filename,
                   content_type=mimetypes.guess_type(filename)[0] or "application/octet-stream")
    form.add_field("overwrite", "true")
    form.add_field("subfolder", "chouka")
    async with session.post(COMFY_HTTP + "/upload/image", data=form) as r:
        if r.status != 200:
            raise web.HTTPBadGateway(text=f"ComfyUI 上传失败 {r.status}: {await r.text()}")
        j = await r.json()
    sub = j.get("subfolder") or ""
    return f"{sub}/{j['name']}" if sub else j["name"]


def ffmpeg_bin():
    """返回当前平台可用的 imageio-ffmpeg；兼容旧版 Windows 整合包目录。"""
    try:
        import imageio_ffmpeg
        exe = Path(imageio_ffmpeg.get_ffmpeg_exe())
        if exe.is_file():
            return exe
    except (ImportError, RuntimeError):
        pass
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return Path(system_ffmpeg)
    d = PACK / "python_embeded/Lib/site-packages/imageio_ffmpeg/binaries"
    return next(iter(sorted(d.glob("ffmpeg-*.exe"), reverse=True)), None)


DUR_RE = re.compile(r"Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)")
FPS_RE = re.compile(r"([\d.]+)\s+fps\b")
AUDIO_STREAM_RE = re.compile(r"^\s*Stream #\d+:\d+.*:\s*Audio:", re.MULTILINE)


def probe_video(ref):
    """这份视频素材：{fps, frames, duration, has_audio}。探不到返回 {}（调用方必须有兜底）。

    ref 是 ComfyUI input 目录里的相对路径（"chouka/ck_xxx.mp4"），本地
    data/uploads/ 下有同名副本，先用本地那份。
    总帧数按 时长 × 帧率 算 —— 跟 VHS 自己用的 `CAP_PROP_FRAME_COUNT` 同一个来源
    （容器元数据），所以「只处理前几帧」拿它当分母是对的。
    """
    if not ref or ".." in str(ref):
        return {}
    local = ROOT / "data" / "uploads" / Path(ref).name
    p = local if local.exists() else COMFY_INPUT / ref
    exe = ffmpeg_bin()
    if not (p.exists() and exe):
        return {}
    try:
        # ffmpeg 没有 -i 之外的元数据命令（包里也没有 ffprobe），
        # 所以就是"只给输入、让它报错退出"，要的信息在 stderr 里
        r = subprocess.run([str(exe), "-i", str(p)], capture_output=True,
                           text=True, errors="ignore", timeout=20)
    except Exception as e:
        print(f"[抽卡系统] 探视频信息失败 {p.name}：{e}")
        return {}
    err = r.stderr or ""
    fps = FPS_RE.search(err)
    dur = DUR_RE.search(err)
    out = {"has_audio": bool(AUDIO_STREAM_RE.search(err))}
    if fps:
        out["fps"] = float(fps.group(1))
    if dur:
        h, m, s = dur.groups()
        out["duration"] = round(int(h) * 3600 + int(m) * 60 + float(s), 3)
    if "fps" in out and "duration" in out:
        out["frames"] = int(round(out["fps"] * out["duration"]))
    return out


def probe_fps(ref):
    return probe_video(ref).get("fps")


def inspect_imported_videos(cap, assets):
    """探测生视频能力实际引入的视频；有素材但读不到时长则拒绝派发。"""
    if cap.get("kind") != "gen" or cap.get("outputType") != "video":
        return None, {}
    refs = {
        assets.get(spec.get("key"))
        for spec in cap.get("inputs") or []
        if spec.get("type") == "video" and assets.get(spec.get("key"))
    }
    metadata = {ref: probe_video(ref) for ref in refs}
    durations = []
    for info in metadata.values():
        duration = info.get("duration")
        if not duration:
            raise web.HTTPBadRequest(reason="无法读取引入视频时长")
        durations.append(float(duration))
    return (max(durations) if durations else None), metadata


def derive_target_fps(g, spec, tgt, uploaded):
    """「目标帧率」一个框，写三个节点：成片帧率 / 补帧倍数 / 输入重采样帧率。

    补帧节点只吃整数倍数，所以源 24 fps 直接补只能出 48 / 72 / 96 —— 想要 60 得先把
    输入重采样：force_rate = 目标 ÷ 倍数，再补这么多倍，成片就正好是目标帧率。
    时长始终不变（force_rate 只改每秒取几帧）。

    倍数按素材真实 fps 挑（向下取整），这样 force_rate ≥ 源 fps，只会重复帧、不会丢帧；
    正好整数倍时 force_rate 填 0（= 跟着原视频），连重采样都省了。
    探不到 fps 就用 2 倍 —— 帧率和时长照样准，只是重采样绕得多一点。
    """
    d = spec["derive"]
    fac, rin = d["factor"], d["rateIn"]
    lo, hi = int(fac.get("min") or 2), int(fac.get("max") or 4)
    lo = max(lo, math.ceil(tgt / float(rin.get("max") or 60)))   # force_rate 有节点上限
    src = probe_fps(uploaded.get(d["source"]))
    f = max(lo, min(int(tgt // src) if src else 2, max(lo, hi)))
    rate = tgt / f
    if src and abs(rate - src) < 0.01:
        rate = 0                                   # 正好整数倍：不用重采样
    g[str(fac["node"])]["inputs"][fac["input"]] = f
    g[str(rin["node"])]["inputs"][rin["input"]] = round(rate, 3)
    print(f"[抽卡系统] 目标帧率 {tgt:g}：源 {src or '未知'} fps -> 重采样 "
          f"{rate or '不动'} -> 补 {f} 倍")
    return tgt


def patch_h3_character_transfer(g, cap, params, uploaded, video_metadata=None):
    """把抽卡面板里的动作视频和人物图封装成 TimelineDirector 素材时间线。"""
    spec = cap.get("patch") or {}
    if spec.get("kind") != "h3_character_transfer":
        return
    video = uploaded.get(spec.get("video", "video[0]"))
    image = uploaded.get(spec.get("image", "images[0]"))
    if not video or not image:
        return
    info = (video_metadata or {}).get(video) or probe_video(video)
    source_duration = float(info.get("duration") or 0)
    if not source_duration:
        raise web.HTTPBadRequest(reason="无法读取动作来源视频时长")
    if source_duration < 5:
        raise web.HTTPBadRequest(reason="动作来源视频不能短于 5 秒")
    preview_seconds = max(0, float(params.get("preview_seconds") or 0))
    output_duration = min(source_duration, preview_seconds) if preview_seconds else source_duration
    node = str(spec.get("timelineNode", "11"))
    segment_seconds = float(g[node]["inputs"].get("generation_seconds") or 10)
    timeline = {
        "version": 4,
        "fps": 24,
        "selection": {"start": 0, "duration": segment_seconds},
        "videoAudioEnabled": True,
        "videoClips": [{
            "id": "chouka-character-transfer-video",
            "file": video,
            "name": Path(video).name,
            "start": 0,
            "duration": output_duration,
            "trimStart": 0,
            "sourceDuration": output_duration,
            "hasAudio": bool(info.get("has_audio")),
            "referenceMode": "edit",
        }],
        "images": [{
            "id": "chouka-character-transfer-identity",
            "file": image,
            "name": Path(image).name,
        }],
        "audios": [],
        "segmentConfig": {"count": 0, "segments": []},
    }
    g[node]["inputs"]["timeline_data"] = json.dumps(
        timeline, ensure_ascii=False, separators=(",", ":")
    )


def apply_input_presets(cap, params):
    """展开 manifest 声明的参数预设，并让预设值覆盖外部传入的冲突参数。"""
    for spec in cap.get("inputs", []):
        presets = spec.get("presets")
        if not presets:
            continue
        key = spec["key"]
        selected = params.get(key, spec.get("default"))
        if selected not in presets:
            raise web.HTTPBadRequest(reason=f"{spec['label']}无效：{selected}")
        params[key] = selected
        params.update(presets[selected])


def patch_graph(cap, params, uploaded, video_metadata=None):
    """按 manifest 把用户参数写进 API 工作流模板"""
    apply_input_presets(cap, params)
    g = copy.deepcopy(json.loads((ROOT / cap["graph"]).read_text(encoding="utf-8")))
    labels = {s["key"]: s["label"] for s in cap["inputs"]}
    missing, blank = [], []
    for spec in cap["inputs"]:
        key, tgt = spec["key"], spec["target"]
        if tgt.get("kind") == "preset":
            continue
        node, field = str(tgt["node"]), tgt["input"]
        if node not in g:
            raise web.HTTPBadRequest(reason=f"工作流里没有节点 {node}（能力 {cap['id']} 需重新扫描）")
        if spec["type"] in ("image", "audio", "video"):
            val = uploaded.get(key)
            if not val:
                if spec.get("required"):
                    missing.append(spec["label"])
                for drop in spec.get("dropIfEmpty") or []:
                    # 空槽要把线整根拔掉：编号列表才真的变短（光留模板默认值的话，
                    # 作者自带的演示图会顶上来照跑一轮），参考图那种支线才真的不参与。
                    # 拔线后这条支线就没人依赖了，ComfyUI 不会执行它。
                    # 一个槽可能要拔好几根（参考图编辑的正负两条 conditioning 各挂一次）
                    g[str(drop["node"])]["inputs"].pop(drop["input"], None)
                continue                       # 未填的可选素材：保留模板里的默认值
            if spec["type"] == "video" and spec.get("dropIfNoAudio"):
                # VHS 的音频输出是惰性读取：只要 H3 的视频音频引用仍连着，它就会让
                # ffmpeg 提取音轨。静音视频根本没有音频流，必须只拔掉这条音频引用，
                # 视频输出本身仍正常作为动作和镜头参考。
                info = (video_metadata or {}).get(val) or probe_video(val)
                if info.get("has_audio") is False:
                    for drop in spec["dropIfNoAudio"]:
                        g[str(drop["node"])]["inputs"].pop(drop["input"], None)
        elif spec["type"] == "seed":
            val = params.get("seed")
            # 上限按 manifest 里那个节点自己声明的来：SeedVR2 只收到 2^32-1，
            # 随手掷一个 2^53 会让 ComfyUI 拒收整个任务（"bigger than max of …"）
            hi = min(int(spec.get("max") or 2 ** 53), 2 ** 53)
            if val in (None, "", -1, "-1"):
                val = params.setdefault("_seed_used", random.randint(0, hi))
            val = min(int(val), hi)
        elif spec.get("derive", {}).get("kind") == "target_fps":
            v = params.get(spec["key"])
            val = derive_target_fps(g, spec, float(spec["default"] if v in (None, "") else v),
                                    uploaded)
        else:
            pair = spec.get("pairWith")
            if pair and not uploaded.get(pair):
                # 配对的图没上传 -> 这条也必须清空。收集节点会丢掉空串，
                # 两边一起变短，第 k 张图才还能对上第 k 条提示词
                val = ""
            elif key not in params or params[key] is None:
                continue                       # 前端没给这一项：保留模板默认值
            else:
                val = params[key]
                if spec["type"] in ("slider", "number"):
                    if val == "":
                        continue
                    val = float(val) if tgt.get("vtype") == "FLOAT" else int(float(val))
                elif pair and not str(val).strip():
                    blank.append(f"{labels.get(pair, pair)}")
                # 注意：文本清空后必须写入 ""，不能当"没给"跳过，
                # 否则模板里作者自带的演示提示词会悄悄生效（出片跑偏）
        if tgt.get("kind") in ("timeline_asset", "timeline_option"):
            continue
        g[node]["inputs"][field] = val
    if missing:
        raise web.HTTPBadRequest(reason="必填素材未提供：" + "、".join(missing))
    if blank:
        raise web.HTTPBadRequest(
            reason="这几张图没写提示词：" + "、".join(blank) + "（空提示词会让图和提示词错位）")
    patch_h3_character_transfer(g, cap, params, uploaded, video_metadata)
    try:
        patch_image_controls(g, cap["id"], params)
    except ValueError as exc:
        raise web.HTTPBadRequest(reason=str(exc)) from exc
    return g


async def comfy_submit(session, graph, prompt_id=None):
    payload = {"prompt": graph, "client_id": CLIENT_ID}
    if prompt_id:
        payload["prompt_id"] = prompt_id
    async with session.post(COMFY_HTTP + "/prompt", json=payload) as r:
        body = await r.text()
        if r.status != 200:
            try:
                err = json.loads(body)
                msg = err.get("error", {}).get("message", "")
                det = err.get("error", {}).get("details", "")
                ne = err.get("node_errors") or {}
                for nid, e in list(ne.items())[:3]:
                    msg += f" | #{nid}: " + "; ".join(
                        x.get("message", "") for x in e.get("errors", []))
                raise web.HTTPBadRequest(reason=f"ComfyUI 拒绝任务: {msg} {det}"[:400])
            except web.HTTPException:
                raise
            except Exception:
                raise web.HTTPBadGateway(text=f"ComfyUI 返回 {r.status}: {body[:300]}")
        return json.loads(body)["prompt_id"]


def check_local_cleanup(app):
    if app["cleanup_pending"]:
        raise web.HTTPConflict(text="正在停止并释放显存，或释放尚未确认；请等待或重试取消。")


async def local_submit(app, graph, prompt_id=None):
    try:
        # 这里只等提交确认，不是等出图；也限制被另一个挂起提交占住锁的等待。
        async with asyncio.timeout(30):
            async with app["comfy_lock"]:
                check_local_cleanup(app)
                return await comfy_submit(app["session"], graph, prompt_id=prompt_id)
    except asyncio.TimeoutError:
        raise web.HTTPGatewayTimeout(text=(
            "等待 ComfyUI 确认提交超时（最长等待 30 秒），后端可能无响应或显存不足。"
            "请先检查 ComfyUI 队列，确认该任务是否已提交，避免重复生成。"))
    except aiohttp.ClientConnectionError:
        raise web.HTTPServiceUnavailable(text=(
            "无法连接本地 ComfyUI，请确认生成后端已启动且能够响应。"))


async def collect_outputs(session, pid):
    async with session.get(f"{COMFY_HTTP}/history/{pid}") as r:
        hist = await r.json()
    entry = hist.get(pid) or {}
    files = []
    for _node, out in (entry.get("outputs") or {}).items():
        for _k, arr in out.items():
            if not isinstance(arr, list):
                continue
            for it in arr:
                if isinstance(it, dict) and it.get("filename"):
                    files.append({
                        "kind": kind_of(it["filename"]),
                        "filename": it["filename"],
                        "subfolder": it.get("subfolder", ""),
                        "type": it.get("type", "output"),
                        "url": "/api/file?" + urlencode({
                            "filename": it["filename"],
                            "subfolder": it.get("subfolder", ""),
                            "type": it.get("type", "output")}),
                    })
    # 过滤 ComfyUI 的临时预览
    real = [f for f in files if f["type"] == "output"]
    return real or files


# =====================================================================
# 常驻监听 ComfyUI 进度
# =====================================================================
async def ws_loop(app):
    session = app["session"]
    while True:
        try:
            async with session.ws_connect(f"{COMFY_WS}?clientId={CLIENT_ID}",
                                          heartbeat=20) as ws:
                STATE["comfy_online"] = True
                async for msg in ws:
                    if msg.type != aiohttp.WSMsgType.TEXT:
                        continue
                    try:
                        ev = json.loads(msg.data)
                    except Exception:
                        continue
                    await handle_event(session, ev, app=app)
        except Exception as e:
            STATE["comfy_online"] = False
            print(f"[ws] 与 ComfyUI 断开：{type(e).__name__}: {e}，3 秒后重连")
            await asyncio.sleep(3)


async def handle_event(session, ev, remote=False, app=None):
    t, d = ev.get("type"), ev.get("data") or {}
    if DEBUG:
        print(f"[ev] {t} {json.dumps(d, ensure_ascii=False)[:220]}", flush=True)
    pid = d.get("prompt_id")
    job = JOBS.get(pid) if pid else None

    if job and job.get("cleanup_pending"):
        return

    # 失败 / 取消 / 完成都是终局。ComfyUI 报错之后还会补发 executing(node=None)、
    # progress_state 这类收尾事件，放进来会把状态改回 done —— 一次失败在界面上显示成
    # "生成成功"，卡片还挂着上一次的产物，比直接报错更难查。
    if job and job["status"] in ("error", "canceled", "done") and t in (
            "execution_start", "executing", "execution_success", "progress_state",
            "execution_error", "execution_interrupted", "execution_cached"):
        return

    if t == "execution_start" and job:
        job.update(status="running", started=time.time())
        save_jobs()
    elif t in ("executing", "execution_success") and job:
        if t == "execution_success" or d.get("node") is None:
            # 远端 Worker 还要归集、上传产物；由 complete 接口宣布最终完成。
            if remote:
                job.update(progress=max(job.get("progress") or 0.0, 0.99), step="正在归集产物")
                return
            outputs = await collect_outputs(session, pid)
            if job.get("cleanup_pending") or job["status"] in ("canceled", "error"):
                return
            if app is not None:
                acl = await call_store(app, "get_job", pid)
                project = await call_store(app, "get_project", acl["project_id"]) if acl else None
                if not project or project["state"] != "active":
                    job.update(status="canceled", outputs=[], ended=time.time(), step="")
                    save_jobs()
                    return
                for output in outputs:
                    await resource_call(app, "register", acl["project_id"], "comfy", output)
            # 权限查询与产物登记期间也可能收到取消，不能把清理中的任务改回完成。
            if job.get("cleanup_pending") or job["status"] in ("canceled", "error"):
                return
            if not outputs and t == "execution_success":
                # execution_success 可能早于 history 入库；后续 executing(None) 才确认任务已收尾。
                job.update(status="running", progress=max(job.get("progress") or 0.0, 0.99),
                           step="正在取回产物")
                return
            job["outputs"] = outputs
            job.update(status="done", progress=1.0, ended=time.time(), step="")
            STEPS.pop(pid, None)
            WEIGHTS.pop(pid, None)
            save_jobs()
        else:
            nid = str(d.get("display_node") or d["node"])
            job["node"] = nid
            # 没登记的节点（子图里层）就退回节点号，总比什么都不显示强
            job["step"] = STEPS.get(pid, {}).get(nid) or f"#{nid}"
    elif t == "progress_state" and job:
        # 这是整条工作流的进度，不是当前节点的。以前直接拿在跑那个节点的
        # value/max 当进度，于是采样、解码、编码每一段都从 0 走到 100%，
        # 一次任务看着像跑了四遍。ComfyUI 这版只发 progress_state（老的
        # progress 事件已经没了），一条消息里带着所有非 pending 节点的状态，
        # 够算总账：干完的按满权重算，在跑的按它自己那点比例折算。
        w = WEIGHTS.get(pid) or {}
        nodes = (d.get("nodes") or {}).items()
        # 命中缓存的节点 ComfyUI 也会给它发一个 finished，但它一秒都没跑，
        # 算进去只会让进度条一开始就凭空跳一大截。两头都摘掉，只算真要跑的活儿
        skip = set(job.get("cached") or ())
        done = 0.0
        for nid, n in nodes:
            nid = str(nid)
            # 不在图里的节点（子图展开出来的内层）跳过：分母里没有它，
            # 分子算上就成了超过 100% 的假进度。它外面那层父节点照样在算
            if nid in skip or nid not in w:
                continue
            wt = w[nid]
            if n.get("state") == "finished":
                done += wt
            else:
                mx = n.get("max") or 1
                frac = min(max((n.get("value") or 0) / mx, 0.0), 1.0)
                done += wt * frac
                # 整体进度里那一格再怎么细也就那么宽，所以当前步骤后面补上
                # 「5/8」，长采样时才看得出它在动
                if mx > 1 and STEPS.get(pid, {}).get(nid):
                    job["step"] = f"{STEPS[pid][nid]} {int(n.get('value') or 0)}/{int(mx)}"
        total = sum(v for k, v in w.items() if k not in skip)
        if total:
            # 只涨不跌（省得权重估偏了往回缩），也不许提前显示 100% ——
            # 那个只由 executing(node=None) 说，别的都还差一口气
            job["progress"] = max(job.get("progress") or 0.0,
                                  min(round(done / total, 4), 0.99))
        job["status"] = "running"
    elif t == "execution_error" and job:
        job.update(status="error", ended=time.time(), step="",
                   error=f"#{d.get('node_id')} {d.get('node_type')}: {d.get('exception_message')}")
        STEPS.pop(pid, None)
        WEIGHTS.pop(pid, None)
        save_jobs()
    elif t == "execution_cached" and job:
        job["cached"] = [str(x) for x in d.get("nodes", [])]
    elif t == "status":
        q = (d.get("status") or {}).get("exec_info", {}).get("queue_remaining")
        if q is not None:
            for j in JOBS.values():
                if j["status"] == "queued":
                    j["queue_remaining"] = q


# =====================================================================
# HTTP 接口
# =====================================================================
async def api_cards(request):
    return web.json_response({
        "cards": CARDS,
        "capabilities": {k: {kk: vv for kk, vv in v.items() if not kk.startswith("_")}
                         for k, v in CAPS.items()},
        "comfy_online": controller_comfy_online(request.app),
    })


async def api_reload(request):
    n = load_caps()
    return web.json_response({"ok": True, "capabilities": n})


async def api_upload(request):
    project_id = request.query.get("project")
    await require_project(request, project_id, operate=True)
    reader = await request.multipart()
    session = request.app["session"]
    saved = []
    async for part in reader:
        if part.name != "file":
            continue
        raw = await part.read()
        name = part.filename or "upload.png"
        # 中文/特殊字符文件名会在 ComfyUI 侧引发路径问题，统一改 ASCII
        safe = f"ck_{uuid.uuid4().hex[:12]}{Path(name).suffix.lower()}"
        local = ROOT / "data" / "uploads" / safe
        local.parent.mkdir(parents=True, exist_ok=True)
        await resource_call(request.app, "register", project_id, "upload", safe, state="pending")
        temporary = local.with_suffix(local.suffix + ".part")
        await asyncio.to_thread(temporary.write_bytes, raw)
        await require_project(request, project_id, operate=True)
        os.replace(temporary, local)
        await resource_call(request.app, "publish", "upload", safe)
        # 视频原片只作备份，生成提交时再把转码 MP4 交给本地 ComfyUI 或 Worker。
        ref = f"chouka/{safe}" if CONTROLLER_MODE or kind_of(safe) == "video" else await comfy_upload(
            session, part.name, safe, raw
        )
        item = {"ref": ref, "kind": kind_of(safe), "origin": name,
                "url": f"/api/upload/{safe}"}
        if item["kind"] == "video":
            # 帧率给「目标帧率」反算倍数用，总帧数给「只处理前几帧」当分母。
            # 上传时探一次存下来，面板就不用每次开都去探文件
            item.update(await asyncio.to_thread(probe_video, ref))
            request.app["video_previews"].ensure(safe)
        saved.append(item)
    if not saved:
        raise web.HTTPBadRequest(reason="没有收到文件")
    return web.json_response({"files": saved})


async def api_media(request):
    """现探一份素材的帧率/总帧数。给这条改动之前存下的素材兜底（老项目里的素材
       记录只有 ref/kind/url，没有 fps/frames）。"""
    ref = request.query.get("ref") or ""
    parsed = await resource_call(request.app, "reference", ref)
    if not parsed:
        raise web.HTTPBadRequest(text="无法识别素材")
    await require_resource(request, *parsed, project_id=request.query.get("project"))
    return web.json_response(await asyncio.to_thread(probe_video, ref))


async def generation_assets(request, assets, project_id=None):
    """项目保留原片引用；真正提交的图和 Worker 素材清单统一使用兼容 MP4。"""
    replacements = {}
    for ref in set(assets.values()):
        if not ref or kind_of(ref) != "video" or not ref.startswith("chouka/"):
            continue
        previews = request.app["video_previews"]
        name = ref.removeprefix("chouka/")
        if name.endswith(".browser.mp4"):
            path = previews.source(name)
        else:
            state = previews.ensure(name)
            if state["status"] == "error":
                raise web.HTTPUnprocessableEntity(text=state["error"])
            if state["status"] != "ready":
                raise web.HTTPConflict(text="视频正在转码为 MP4，请等待预览就绪后再生成；不会使用原片执行。")
            path = previews.target(name)
        replacements[ref] = path
        if project_id and path.name != name:
            parent = await resource_call(request.app, "lookup", "upload", name)
            await resource_call(request.app, "register", project_id, "upload", path.name,
                                parent_id=parent["resource_id"])

    resolved = {}
    if not CONTROLLER_MODE:
        # 跨画布复制的素材只存在于控制端 uploads（external 标记），
        # 提交前需补送本地 Comfy input；普通上传当时就已送过，不再重传。
        for name in await resource_call(request.app, "pending_external_uploads",
                                        list(set(assets.values()))):
            replacements[f"chouka/{name}"] = ROOT / "data" / "uploads" / name
    for ref, path in replacements.items():
        resolved[ref] = f"chouka/{path.name}" if CONTROLLER_MODE else await comfy_upload(
            request.app["session"], "file", path.name, await asyncio.to_thread(path.read_bytes),
        )
        if not CONTROLLER_MODE:
            await resource_call(request.app, "mark_delivered", "upload", path.name)
    return {key: resolved.get(ref, ref) for key, ref in assets.items()}


async def api_generate(request):
    body = await authorized_body(request)
    if not CONTROLLER_MODE and not body.get("dry_run"):
        check_local_cleanup(request.app)
    cid = body.get("capability")
    cap = CAPS.get(cid)
    if not cap:
        raise web.HTTPBadRequest(reason=f"未知能力 {cid}")
    if not cap.get("_graph_ok"):
        raise web.HTTPBadRequest(reason=f"{cid} 缺 API 工作流文件：{cap['graph']}")
    params = body.get("params") or {}
    uploaded = await generation_assets(request, body.get("assets") or {}, body["project"])
    source_video_duration, video_metadata = None, {}
    if not body.get("dry_run"):
        source_video_duration, video_metadata = await asyncio.to_thread(
            inspect_imported_videos, cap, uploaded
        )
    graph = patch_graph(cap, params, uploaded, video_metadata)
    if body.get("dry_run"):
        tpl = json.loads((ROOT / cap["graph"]).read_text(encoding="utf-8"))
        diff = {f"#{n}.{k}": [tpl.get(n, {}).get("inputs", {}).get(k), v]
                for n, nd in graph.items() for k, v in nd["inputs"].items()
                if n not in tpl or tpl[n]["inputs"].get(k) != v}
        diff.update({f"#{n}.{k}": [v, "<断开>"]           # dropIfEmpty 拔掉的线
                     for n, nd in tpl.items() for k, v in nd["inputs"].items()
                     if k not in graph[n]["inputs"]})
        return web.json_response({"dry_run": True, "changed": diff})
    gpu_policy = (
        HIGH_VRAM_GPU_POLICY
        if cid in HIGH_VRAM_CAPABILITIES or (
            source_video_duration is not None
            and source_video_duration > LONG_VIDEO_HIGH_VRAM_SECONDS
        ) else None
    )
    if not CONTROLLER_MODE and gpu_policy:
        try:
            async with request.app["session"].get(
                COMFY_HTTP + "/system_stats", timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                response.raise_for_status()
                stats = await response.json()
        except (aiohttp.ClientError, asyncio.TimeoutError, ValueError):
            raise web.HTTPServiceUnavailable(reason="无法确认执行显卡，此任务要求主 GPU 显存至少 32GB")
        if not can_run_capability(cid, stats.get("devices"), gpu_policy):
            raise web.HTTPBadRequest(reason="此任务只能在主 GPU 显存至少 32GB 的机器上运行")
    await require_project(request, body["project"], operate=True)
    pid = str(uuid.uuid4())
    await call_store(request.app, "register_job", pid, body["project"], require_user(request)["id"])
    await resource_call(request.app, "register_job_inputs", pid, uploaded)
    if not CONTROLLER_MODE:
        actual_pid = await local_submit(request.app, graph, prompt_id=pid)
        if actual_pid != pid:
            await call_store(request.app, "register_job", actual_pid, body["project"], require_user(request)["id"])
            await resource_call(request.app, "register_job_inputs", actual_pid, uploaded)
        pid = actual_pid
    # 步骤名和权重单独放 STEPS / WEIGHTS，不塞进 job：job 每次轮询整份回给前端，
    # 59 个节点名白传
    STEPS[pid] = step_labels(graph)
    WEIGHTS[pid] = step_weights(graph)
    JOBS[pid] = {"id": pid, "capability": cid, "name": cap["name"],
                 "modelName": model_name(cid),
                 "outputType": cap["outputType"], "status": "queued",
                 "progress": 0.0, "created": time.time(),
                 "seed": params.get("_seed_used", params.get("seed")),
                 "step": "", "outputs": [], "error": None,
                 # 按最终工作流留存每次提交的文本，包含默认值、空串及多段提示词。
                 "prompts": [
                     {"key": spec["key"], "label": spec["label"],
                      "text": graph[str(spec["target"]["node"])]["inputs"][spec["target"]["input"]]}
                     for spec in cap.get("inputs", [])
                     if spec["type"] == "textarea" or spec["key"] == "negative_prompt"
                 ],
                 # 任务面板要能说清"这是哪张卡在跑"，还要能点回那张卡
                 "project": body.get("project"),
                 "projectName": body.get("projectName"),
                 "card": body.get("card"), "cardName": body.get("cardName")}
    if CONTROLLER_MODE:
        required_nodes = {
            nd.get("class_type") for nd in graph.values()
            if isinstance(nd, dict) and nd.get("class_type")
        }
        family = model_family(cid)
        dispatch_payload = {
            "graph": graph, "assets": uploaded, "capability": cid,
            "model_family": family,
        }
        if gpu_policy:
            dispatch_payload["gpu_policy"] = gpu_policy
        distributed_store(request.app).enqueue(pid, dispatch_payload, required_nodes)
        ledger = cost_ledger(request.app)
        if ledger:
            cached_probe = lambda ref: video_metadata.get(ref) or probe_video(ref)
            ledger.record_job(JOBS[pid], params, uploaded, graph, cached_probe, family)
    save_jobs()
    return web.json_response(JOBS[pid])


REWRITE_TIMEOUT = 900      # 27B 在 CPU/低显存上第一次加载就要好几分钟，别掐太早


async def api_rewrite(request):
    """「✨优化」：把用户写的大白话，改成这个模型认的提示词。

    **先走 API，不通再落本地 27B。** 两条路只在「文本从哪来」这一步分岔：
    喂进去的 system（`rw.REGIMES`）和 user（`rw.user_msg`）一字不差，
    拿回来都过同一个 `rw.clean()`。分岔多一处，同一张卡两条路就会出两种格式，
    用户没法判断是模型写得不好还是链路串了。

    为什么 API 优先：本地那条要把 14 GB 挤进显存（跟出图抢），第一次好几分钟，
    还得 `force_offload` 卸掉；而且 `n_ctx` 只有 8192。走 API 不碰显存、不排
    ComfyUI 的队 —— **ComfyUI 没开着也能优化**。
    """
    body = await authorized_body(request)
    cid = body.get("capability")
    cap = CAPS.get(cid)
    if not cap:
        raise web.HTTPBadRequest(reason=f"未知能力 {cid}")
    spec = cap.get("rewrite")
    if not spec:
        raise web.HTTPBadRequest(reason=f"{cap['name']} 这张卡没有改写规则")
    reg = rw.REGIMES.get(spec.get("regime"))
    if not reg:
        raise web.HTTPBadRequest(reason=f"改写规则 {spec.get('regime')} 不存在")

    params = body.get("params") or {}
    assets = body.get("assets") or {}
    style = str(body.get("style") or "")
    card_info = body.get("cardInfo") or {}  # 接收前端传来的卡片信息映射
    user = rw.user_msg(cap, spec, params, assets, card_info,
                       str(body.get("prompt") or ""), style)

    # model：auto（老行为，先 API 不通落本地）/ api / local —— 前端把 API 和
    # 本地拆成两个可选的模型，用户点哪个就走哪条，选定了就不偷偷换
    model = body.get("model") or "auto"
    t0 = time.time()
    via, fell, warns, mname, tokens = "local", "", [], "", 0
    raw = None
    use_api = (model == "api" or (model == "auto" and llm.ready()))
    if model == "api" and not llm.ready():
        w = llm.where()
        raise web.HTTPBadRequest(reason=(
            f"选的是云端 API，可它没配好（{w.get('error') or 'llm.json 里 base_url / api_key / model 没填全'}）。"
            f"配置在 {w.get('conf')}，或者把模型切回「本地 27B」")[:400])
    if use_api:
        try:
            got = await llm.chat(request.app["session"], reg["system"], user,
                                 reg["max_tokens"], reg["temperature"])
            raw, via = got["text"], "api"
            mname, tokens = got["model"], got["tokens"]
            if got["warn"]:
                warns.append(got["warn"])
        except llm.LLMError as e:
            if model == "api":
                # 用户点名要走 API：失败原样抛出去，别静默换成本地等上几分钟
                raise web.HTTPBadGateway(reason=f"云端 API 没走通：{e}"[:400])
            # auto：不抛出去，用户选的是「直接兜底」。原因带回前端，让 toast 说得出
            # 为什么这次转了五分钟圈 —— 静默兜底会让人以为 API 压根没生效
            fell = str(e)
    if raw is None:
        raw = await rewrite_local(request, "提示词优化", reg["system"], user,
                                  reg, body, t0, fell)

    text, warn = rw.clean(raw, spec, cap, params, assets)
    if warn:
        warns.append(warn)
    elapsed_ms = int((time.time() - t0) * 1000)
    if via == "api":
        record_api_cost(request.app, cid, got, elapsed_ms, body)
    return web.json_response({"text": text, "warn": "；".join(warns),
                              "via": via, "fallback": fell, "model": mname,
                              "tokens": tokens, "ms": elapsed_ms})


async def rewrite_local(request, job_name, system, user, sampling, body, t0, fell=""):
    """本地 27B：临时拼一张「27B + 出文本」的小图丢给 ComfyUI 跑，取回文本。
    提示词改写（REGIMES）和文本卡（TEXT_OPS）都走这一条。

    走的是 ComfyUI 那条队列（本地只有一份显存，另开一路会跟出图抢），所以：
      - 临时图现搭（server/rewrite.py），不落盘、不进 manifests
      - 照样登记进 JOBS，任务面板能看见它在跑，也能取消
      - 请求一直挂着等结果，前端那边就是一个按钮转圈，不用自己轮询
    """
    # 两头都不通的时候要把两条原因一起说。只报「连不上 ComfyUI」会让人去查
    # ComfyUI，而真正该改的是 llm.json
    if not STATE["comfy_online"]:
        raise web.HTTPBadGateway(reason=(
            f"API 没通（{fell}），本地兜底也用不了：ComfyUI 没在运行。"
            if fell else "这件事要用本地 27B，可 ComfyUI 没在运行。")[:400])

    graph = rw.build_graph(system, user, sampling["max_tokens"],
                           sampling["temperature"], random.randint(0, 2 ** 31 - 1))
    async with request.app["project_locks"][body["project"]]:
        await require_project(request, body["project"], operate=True)
        pid = str(uuid.uuid4())
        await call_store(request.app, "register_job", pid, body["project"], require_user(request)["id"])
        actual_pid = await local_submit(request.app, graph, prompt_id=pid)
        if actual_pid != pid:
            await call_store(request.app, "register_job", actual_pid, body["project"], require_user(request)["id"])
        pid = actual_pid
    STEPS[pid] = step_labels(graph)
    WEIGHTS[pid] = step_weights(graph)
    JOBS[pid] = {"id": pid, "capability": "text", "name": job_name,
                 "modelName": model_name("text"),
                 "outputType": "text", "status": "queued",
                 "progress": 0.0, "created": t0, "seed": None,
                 "step": "", "outputs": [], "error": None,
                 "project": body.get("project"),
                 "projectName": body.get("projectName"),
                 "card": body.get("card"), "cardName": body.get("cardName")}

    job = JOBS[pid]
    try:
        while job["status"] in LIVE:
            if time.time() - t0 > REWRITE_TIMEOUT:
                await stop_job(request.app, pid)
                raise web.HTTPGatewayTimeout(
                    reason=f"改写等了 {REWRITE_TIMEOUT // 60} 分钟还没出结果，已取消")
            await asyncio.sleep(0.4)
        if job["status"] == "canceled":
            raise web.HTTPBadRequest(reason="改写被取消了")
        if job["status"] == "error":
            raise web.HTTPBadGateway(reason=f"改写失败：{job['error']}"[:400])

        # ShowText 的产物是文本不是文件，collect_outputs 只认 filename，得自己去 history 取
        async with request.app["session"].get(f"{COMFY_HTTP}/history/{pid}") as r:
            hist = await r.json()
        out = ((hist.get(pid) or {}).get("outputs") or {}).get(rw.TEXT_NODE) or {}
        val = out.get("text") or out.get("string") or []
        raw = "\n".join(str(x) for x in val) if isinstance(val, list) else str(val)
        if not raw.strip():
            raise web.HTTPBadGateway(
                reason="改写模型没吐出文本（显存不够时会这样，看看 ComfyUI 的日志）")
    finally:
        # 一次性任务：成了失败了都别留在任务面板里。结果和报错都当场回给了前端，
        # 面板上再挂一排「提示词优化」只会把真正在跑的出图任务挤下去
        if not job.get("cleanup_pending"):
            JOBS.pop(pid, None)
            STEPS.pop(pid, None)
            WEIGHTS.pop(pid, None)
        # 落盘时它已经不在 JOBS 里了 —— 正是要的效果：跑的过程中 handle_event 顺手
        # 把它写进了文件，不擦掉的话重启后面板上会冒出一条早就结束的「提示词优化」
        save_jobs()
    return raw


async def api_text(request):
    """文本卡片的运行接口：润色 / 优化 / 扩写 / 自定义提示词。

    跟 /api/rewrite 不是一回事：那边是「给某个底模写提示词」（REGIMES 那套
    硬规矩），这边是通用的文字加工，输入输出都是给人看的文字。

    model 只认两个值（用户在卡上明确选的，不自动换）：
      api   云端大模型（llm.json 那家），几秒，不占显存，ComfyUI 不用开
      local 本地 27B，不花钱，但要占显存、排 ComfyUI 的队，第一次好几分钟
    """
    body = await authorized_body(request)
    op = str(body.get("op") or "")

    # 翻译优先走有道；没配置或请求失败时，复用 llm.json 中的云端模型。
    if op == "translate":
        inputs = [(str(i.get("name") or "?"), str(i.get("text") or ""))
                  for i in body.get("inputs") or [] if str(i.get("text") or "").strip()]
        if not inputs:
            raise web.HTTPBadRequest(reason="没有要翻译的文本")
        src_text = inputs[0][1]
        t0 = time.time()
        youdao_error = "服务端未配置 YOUDAO_APP_KEY / YOUDAO_APP_SECRET"
        if tr.ready():
            try:
                translated = tr.youdao_translate(src_text)
                return web.json_response({
                    "text": translated, "warn": "",
                    "via": "youdao", "model": "有道翻译", "tokens": 0,
                    "ms": int((time.time() - t0) * 1000)
                })
            except tr.TranslateError as e:
                youdao_error = str(e)

        if not llm.ready():
            w = llm.where()
            raise web.HTTPBadGateway(reason=(
                f"有道翻译不可用（{youdao_error}），云端翻译也没配好（"
                f"{w.get('error') or 'llm.json 里 base_url / api_key / model 没填全'}）")[:400])

        cfg = rw.TEXT_OPS["translate"]
        query, protected = tr.protect_prompt_tokens(src_text)
        try:
            got = await llm.chat(request.app["session"], cfg["system"], query,
                                 cfg["max_tokens"], cfg["temperature"])
            translated = tr.restore_prompt_tokens(rw.text_clean(got["text"]), protected)
        except (llm.LLMError, tr.TranslateError) as e:
            raise web.HTTPBadGateway(reason=(
                f"有道翻译不可用（{youdao_error}），云端翻译失败：{e}")[:400])
        elapsed_ms = int((time.time() - t0) * 1000)
        record_api_cost(request.app, "text", got, elapsed_ms, body)
        return web.json_response({
            "text": translated,
            "warn": f"有道翻译不可用，已改用 {got['model']}",
            "via": "api", "model": got["model"], "tokens": got["tokens"],
            "ms": elapsed_ms
        })

    cfg = rw.TEXT_OPS.get(op)
    if not cfg:
        raise web.HTTPBadRequest(reason=f"未知文本操作 {op}")
    # inputs: [{name, text}] —— 一张卡可以接好几根文本连线，顺序就是连线顺序
    inputs = [(str(i.get("name") or "?"), str(i.get("text") or ""))
              for i in body.get("inputs") or [] if str(i.get("text") or "").strip()]
    if op != "custom" and not inputs:
        raise web.HTTPBadRequest(reason="没有任何输入文字：把一张文本卡的出口连过来")
    user = rw.text_user_msg(op, body.get("params") or {}, inputs)

    model = body.get("model") or "api"
    t0 = time.time()
    warns = []
    if model == "local":
        raw = await rewrite_local(request, f"文本卡 · {cfg['name']}",
                                  cfg["system"], user, cfg, body, t0)
        via, mname, tokens = "local", "本地 27B", 0
    else:
        if not llm.ready():
            w = llm.where()
            raise web.HTTPBadRequest(reason=(
                f"选的是云端 API，可它没配好（{w.get('error') or 'llm.json 里 base_url / api_key / model 没填全'}）。"
                f"配置在 {w.get('conf')}，或者把这张卡的模型切回「本地 27B」")[:400])
        try:
            got = await llm.chat(request.app["session"], cfg["system"], user,
                                 cfg["max_tokens"], cfg["temperature"])
        except llm.LLMError as e:
            # 选定了 API 就不偷偷换本地：换了他会以为 API 也是这么慢
            raise web.HTTPBadGateway(reason=f"云端 API 没走通：{e}"[:400])
        raw, via, mname, tokens = got["text"], "api", got["model"], got["tokens"]
        if got["warn"]:
            warns = [got["warn"]]
    text = rw.text_clean(raw)
    elapsed_ms = int((time.time() - t0) * 1000)
    if via == "api":
        record_api_cost(request.app, "text", got, elapsed_ms, body)
    return web.json_response({"text": text, "warn": "；".join(warns),
                              "via": via, "model": mname, "tokens": tokens,
                              "ms": elapsed_ms})


async def job_permission(request, jid):
    user = require_user(request)
    acl = await call_store(request.app, "get_job", jid)
    if acl:
        return await call_store(request.app, "project_permission", user["id"], acl["project_id"])
    if user["role"] == "admin" and await resource_call(request.app, "is_legacy_job", jid):
        return "operate"
    return None


async def authorized_job(request, jid, operate=False):
    permission = await job_permission(request, jid)
    if permission is None:
        raise web.HTTPNotFound(text="任务不存在或不可访问")
    if operate and permission != "operate":
        raise web.HTTPForbidden(text="任务为只读")
    return permission


def job_display_info(job, node_name):
    return {
        "modelName": job.get("modelName") or model_name(job.get("capability")),
        "nodeName": node_name,
    }


def job_node_names(app, jobs):
    if CONTROLLER_MODE:
        return distributed_store(app).job_worker_names(job["id"] for job in jobs)
    return {job["id"]: "本机" for job in jobs}


async def api_job(request):
    pid = request.match_info["pid"]
    permission = await authorized_job(request, pid)
    job = JOBS.get(pid)
    if not job:
        raise web.HTTPNotFound(reason="没有这个任务")
    node_name = job_node_names(request.app, [job]).get(pid)
    return web.json_response(
        job | job_display_info(job, node_name) | {"permission": permission}
    )


async def api_jobs(request):
    visible = []
    for job in sorted(list(JOBS.values()), key=lambda j: j["created"], reverse=True):
        permission = await job_permission(request, job["id"])
        if permission:
            visible.append((job, permission))
        if len(visible) == 60:
            break
    node_names = job_node_names(request.app, [job for job, _permission in visible])
    return web.json_response({"jobs": [
        job | job_display_info(job, node_names.get(job["id"])) | {"permission": permission}
        for job, permission in visible
    ]})


LIVE = ("queued", "running")
JOBS_FILE = ROOT / "data" / "jobs.json"


async def api_status(request):
    """给局域网内其他软件读取的轻量占用状态。"""
    running_count = sum(j.get("status") == "running" for j in JOBS.values())
    queued_count = sum(j.get("status") == "queued" for j in JOBS.values())
    active_count = running_count + queued_count
    busy = active_count > 0
    response = web.json_response({
        "ok": True,
        "service": "chouka",
        "mode": EXECUTION_MODE,
        "state": "busy" if busy else "idle",
        "idle": not busy,
        "busy": busy,
        "running_count": running_count,
        "queued_count": queued_count,
        "active_count": active_count,
        "comfy_online": controller_comfy_online(request.app),
    })
    # 状态不能被浏览器或中间代理缓存；只读 GET 允许局域网页面跨域查询。
    response.headers["Cache-Control"] = "no-store"
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


def require_agent(request):
    worker_id = request.headers.get("X-Worker-ID", "")
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else ""
    if not distributed_store(request.app).authenticate(worker_id, token):
        raise web.HTTPUnauthorized(reason="Worker 凭据无效")
    return worker_id


def require_lease(request, worker_id):
    pid = request.match_info["pid"]
    lease_token = request.headers.get("X-Lease-Token", "")
    if not distributed_store(request.app).validate_lease(pid, worker_id, lease_token):
        raise web.HTTPConflict(reason="任务租约已失效")
    return pid, lease_token


async def execution_project(app, job_id):
    job = await call_store(app, "get_job", job_id)
    project = await call_store(app, "get_project", job["project_id"]) if job else None
    if not project or project["state"] != "active":
        raise web.HTTPConflict(text="任务画布已不可用")
    return project


async def api_agent_input(request):
    worker_id = require_agent(request)
    jid, _ = require_lease(request, worker_id)
    await execution_project(request.app, jid)
    if distributed_store(request.app).dispatch_status(jid) == "cancel_requested":
        raise web.HTTPConflict(text="任务已取消")
    name = request.match_info["name"]
    if not await resource_call(request.app, "job_input_allowed", jid, name):
        raise web.HTTPNotFound(text="素材不在当前任务输入清单中")
    path = await resource_call(request.app, "local_path", "upload", name)
    if not path.is_file():
        raise web.HTTPNotFound()
    return private_file(path)


async def api_agent_register(request):
    if not ENROLLMENT_TOKEN:
        raise web.HTTPServiceUnavailable(reason="服务端未配置 CHOUKA_ENROLLMENT_TOKEN")
    body = await request.json()
    supplied = str(body.get("enrollment_token") or "")
    if not hmac.compare_digest(supplied, ENROLLMENT_TOKEN):
        raise web.HTTPUnauthorized(reason="注册码无效")
    name = str(body.get("name") or "").strip()[:100]
    if not name:
        raise web.HTTPBadRequest(reason="缺少 Worker 名称")
    result = distributed_store(request.app).register_worker(
        name, body.get("capabilities") if isinstance(body.get("capabilities"), dict) else {}
    )
    return web.json_response(result, status=201)


async def api_agent_heartbeat(request):
    worker_id = require_agent(request)
    body = await request.json()
    result = distributed_store(request.app).heartbeat(
        worker_id,
        capabilities=body.get("capabilities") if isinstance(body.get("capabilities"), dict) else None,
        telemetry=body.get("telemetry") if isinstance(body.get("telemetry"), dict) else None,
        comfy_online=bool(body.get("comfy_online")),
        busy=bool(body.get("busy")),
        local_busy=body.get("local_busy") if "local_busy" in body else None,
        current_job_id=body.get("current_job_id"),
        maintenance=body.get("maintenance") if isinstance(body.get("maintenance"), dict) else None,
    )
    if result is None:
        raise web.HTTPNotFound(reason="Worker 不存在")
    return web.json_response(result)


async def api_agent_acquire(request):
    worker_id = require_agent(request)
    assignment = distributed_store(request.app).acquire(worker_id)
    if assignment is None:
        return web.Response(status=204)
    pid = assignment["job_id"]
    try:
        await execution_project(request.app, pid)
    except web.HTTPConflict:
        distributed_store(request.app).finish(pid, worker_id, assignment["lease_token"], "canceled")
        return web.Response(status=204)
    graph = assignment["payload"].get("graph") or {}
    STEPS.setdefault(pid, step_labels(graph))
    WEIGHTS.setdefault(pid, step_weights(graph))
    job = JOBS.get(pid)
    if job:
        job["worker_id"] = worker_id
        job["queue_remaining"] = 1
        save_jobs()
    return web.json_response(assignment)


async def api_agent_start(request):
    worker_id = require_agent(request)
    pid, lease_token = require_lease(request, worker_id)
    await execution_project(request.app, pid)
    if distributed_store(request.app).dispatch_status(pid) == "cancel_requested":
        raise web.HTTPConflict(text="任务已取消")
    if not distributed_store(request.app).mark_running(pid, worker_id, lease_token):
        raise web.HTTPConflict(reason="任务无法进入运行状态")
    started_at = time.time()
    job = JOBS.get(pid)
    if job:
        job.update(status="running", progress=0.0, step="", error=None,
                   started=started_at, ended=None, worker_id=worker_id)
        save_jobs()
    ledger = cost_ledger(request.app)
    if ledger:
        ledger.start_job(pid, worker_id, started_at)
    return web.json_response({"ok": True})


async def api_agent_event(request):
    worker_id = require_agent(request)
    pid, lease_token = require_lease(request, worker_id)
    event = await request.json()
    if not isinstance(event, dict):
        raise web.HTTPBadRequest(reason="事件必须是 JSON 对象")
    data = event.setdefault("data", {})
    if not isinstance(data, dict):
        raise web.HTTPBadRequest(reason="事件 data 必须是 JSON 对象")
    data["prompt_id"] = pid
    event_type = event.get("type")

    # 新 Worker 在显存清理确认后才补报 /failed；旧 Worker 保留即时终态语义。
    if event_type in ("execution_error", "execution_interrupted"):
        if data.get("cleanup_pending") is True:
            job = JOBS.get(pid)
            if job:
                job.update(cleanup_pending=True, step="正在释放显存")
                save_jobs()
            return web.json_response({"ok": True, "cleanup_pending": True})
        terminal = "error" if event_type == "execution_error" else "canceled"
        store = distributed_store(request.app)
        if not store.finish(pid, worker_id, lease_token, terminal):
            if store.dispatch_status(pid, worker_id) != terminal:
                raise web.HTTPConflict(reason="任务无法结束")
        ended_at = time.time()
        job = JOBS.get(pid)
        if job:
            if terminal == "error":
                error = (f"#{data.get('node_id')} {data.get('node_type')}: "
                         f"{data.get('exception_message') or 'ComfyUI 执行失败'}")[:12000]
            else:
                error = None
            job.update(status=terminal, step="", ended=ended_at,
                       worker_id=worker_id, error=error)
            STEPS.pop(pid, None)
            WEIGHTS.pop(pid, None)
            save_jobs()
        ledger = cost_ledger(request.app)
        if ledger:
            ledger.finish_job(pid, terminal, ended_at, worker_id)
        return web.json_response({"ok": True, "terminal": terminal})

    await execution_project(request.app, pid)
    await handle_event(None, event, remote=True, app=request.app)
    return web.json_response({"ok": True})


async def api_agent_artifact(request):
    worker_id = require_agent(request)
    pid, _lease_token = require_lease(request, worker_id)
    project = await execution_project(request.app, pid)
    reader = await request.multipart()
    part = await reader.next()
    if part is None or part.name != "file":
        raise web.HTTPBadRequest(reason="缺少产物文件")
    original = Path(part.filename or "output.bin").name
    suffix = Path(original).suffix.lower()
    if not re.fullmatch(r"\.[a-z0-9]{1,10}", suffix):
        suffix = ".bin"
    stored_name = f"{uuid.uuid4().hex}{suffix}"
    target_dir = ARTIFACT_DIR / pid
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / stored_name
    locator = f"{pid}/{stored_name}"
    await resource_call(request.app, "register", project["project_id"], "artifact", locator, state="pending")
    temporary = target.with_suffix(target.suffix + ".part")
    total = 0
    try:
        with temporary.open("wb") as fp:
            while True:
                chunk = await part.read_chunk(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > 512 * 1024 ** 2:
                    raise web.HTTPRequestEntityTooLarge(max_size=512 * 1024 ** 2, actual_size=total)
                fp.write(chunk)
        require_lease(request, worker_id)
        await execution_project(request.app, pid)
        os.replace(temporary, target)
        await resource_call(request.app, "publish", "artifact", locator)
    finally:
        temporary.unlink(missing_ok=True)
    output = {
        "kind": request.query.get("kind") or kind_of(original),
        "filename": original,
        "type": "output",
        "subfolder": "",
        "url": f"/api/artifact/{pid}/{stored_name}",
    }
    return web.json_response(output, status=201)


async def api_agent_complete(request):
    worker_id = require_agent(request)
    pid, lease_token = require_lease(request, worker_id)
    body = await request.json()
    outputs = body.get("outputs") if isinstance(body.get("outputs"), list) else []
    project = await execution_project(request.app, pid)
    for output in outputs:
        if not isinstance(output, dict):
            raise web.HTTPBadRequest(text="无效产物")
        ref = await resource_call(request.app, "reference", output.get("url"))
        if not ref or ref[0] != "artifact" or not ref[1].startswith(pid + "/"):
            raise web.HTTPBadRequest(text="产物不属于当前任务")
        row = await resource_call(request.app, "lookup", *ref)
        if not row or row["state"] != "ready":
            raise web.HTTPBadRequest(text="产物尚未可信登记")
    await execution_project(request.app, pid)
    if (JOBS.get(pid) or {}).get("cleanup_pending"):
        raise web.HTTPConflict(reason="正在释放显存，等待 Worker 确认")
    if distributed_store(request.app).dispatch_status(pid) == "cancel_requested":
        raise web.HTTPConflict(text="任务已取消")
    if not distributed_store(request.app).finish(pid, worker_id, lease_token, "done"):
        raise web.HTTPConflict(reason="任务无法完成")
    ended_at = time.time()
    job = JOBS.get(pid)
    if job:
        job.update(status="done", progress=1.0, outputs=outputs, step="",
                   ended=ended_at, worker_id=worker_id, error=None)
        STEPS.pop(pid, None)
        WEIGHTS.pop(pid, None)
        save_jobs()
    ledger = cost_ledger(request.app)
    if ledger:
        ledger.finish_job(pid, "done", ended_at, worker_id)
    return web.json_response({"ok": True})


async def api_agent_failed(request):
    worker_id = require_agent(request)
    pid = request.match_info["pid"]
    lease_token = request.headers.get("X-Lease-Token", "")
    body = await request.json()
    canceled = bool(body.get("canceled"))
    dispatch_status = "canceled" if canceled else "error"
    store = distributed_store(request.app)
    current_status = store.dispatch_status(pid, worker_id)
    already_terminal = current_status == dispatch_status
    if not already_terminal:
        if not store.validate_lease(pid, worker_id, lease_token):
            raise web.HTTPConflict(reason="任务租约已失效")
        if not store.finish(pid, worker_id, lease_token, dispatch_status):
            raise web.HTTPConflict(reason="任务无法结束")
    job = JOBS.get(pid)
    ended_at = (job or {}).get("ended") or time.time()
    if not already_terminal:
        if job:
            job.update(status=dispatch_status, step="", ended=ended_at,
                       cleanup_pending=False,
                       worker_id=worker_id, error=None if canceled else str(body.get("error") or "Worker 执行失败")[:2000])
            STEPS.pop(pid, None)
            WEIGHTS.pop(pid, None)
            save_jobs()
    ledger = cost_ledger(request.app)
    if ledger:
        ledger.finish_job(pid, dispatch_status, ended_at, worker_id)
    return web.json_response({"ok": True})


async def api_workers(request):
    return web.json_response({"workers": distributed_store(request.app).list_workers()})


async def api_worker_enabled(request):
    body = await request.json()
    enabled = bool(body.get("enabled"))
    if not distributed_store(request.app).set_worker_enabled(
            request.match_info["worker_id"], enabled):
        raise web.HTTPNotFound(reason="Worker 不存在")
    return web.json_response({"ok": True, "enabled": enabled})


async def api_workers_sync_all(request):
    require_admin(request)
    result = distributed_store(request.app).request_sync_all()
    return web.json_response({"ok": True, **result}, status=202)


async def api_artifact(request):
    pid = request.match_info["pid"]
    name = request.match_info["name"]
    if Path(pid).name != pid or Path(name).name != name:
        raise web.HTTPNotFound()
    await require_resource(request, "artifact", f"{pid}/{name}")
    path = await resource_call(request.app, "local_path", "artifact", f"{pid}/{name}")
    if not path.is_file():
        raise web.HTTPNotFound(reason="产物不存在")
    response = web.FileResponse(path)
    response.headers["X-Content-Type-Options"] = "nosniff"
    if path.suffix.lower() not in IMG_EXT | VID_EXT | AUD_EXT:
        response.headers["Content-Type"] = "application/octet-stream"
        response.headers["Content-Disposition"] = f'attachment; filename="{name}"'
    return response


def save_jobs():
    """任务列表落盘。`JOBS` 本来只在内存里，后端重启一次几天的记录就全没了 ——
    产物还在卡片上，但「什么时候跑的、跑了多久、为什么失败」只有这儿有。

    只在**状态变了**的时候写（新建 / 开跑 / 完成 / 失败 / 取消 / 删除），不跟着进度写：
    进度每秒十几条，而且重启之后那个数字毫无意义（活儿早断了）。
    存的条数跟 `/api/jobs` 返回的一样是最近 60 条，不然文件会一直长。
    """
    try:
        JOBS_FILE.parent.mkdir(parents=True, exist_ok=True)
        keep = sorted(JOBS.values(), key=lambda j: j["created"], reverse=True)[:60]
        JOBS_FILE.write_text(json.dumps(keep, ensure_ascii=False), encoding="utf-8")
    except OSError as e:
        print(f"[任务] 记录存盘失败（不影响出图）：{e}")


def load_jobs():
    """启动时读回任务列表。

    当时还在排队 / 运行的一律改成「已取消」+ 一句说明：那个进程已经没了，
    ComfyUI 那边也早断开，不可能还在跑；留着 running 的话前端会对着一个
    永远不动的进度条一直轮询。前端认得 canceled，卡片会自己跟着落地。
    """
    if not JOBS_FILE.exists():
        return
    try:
        rows = json.loads(JOBS_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        print(f"[任务] 记录读不回来，从空列表开始：{e}")
        return
    cut = 0
    for j in rows:
        if j.get("cleanup_pending") and not CONTROLLER_MODE:
            j.update(step="显存释放未确认，请重试取消")
        elif j.get("status") in LIVE and not CONTROLLER_MODE:
            j.update(status="canceled", step="", ended=j.get("ended") or time.time(),
                     error="抽卡系统重启了，这一轮没跑完（重启前的进度不留，重跑一次就行）")
            cut += 1
        JOBS[j["id"]] = j
    print(f"[抽卡系统] 读回 {len(rows)} 条任务记录"
          + (f"，其中 {cut} 条是重启时被打断的" if cut else ""))


async def stop_job(app, pid):
    """停止本地任务，或向远端 Worker 发出取消请求。"""
    job = JOBS.get(pid)
    if job and job["status"] not in LIVE and not job.get("cleanup_pending"):
        return "finished"
    if CONTROLLER_MODE:
        state = distributed_store(app).request_cancel(pid)
        if state == "canceled":
            ended_at = time.time()
            if job:
                job.update(status="canceled", step="", ended=ended_at)
                save_jobs()
            ledger = cost_ledger(app)
            if ledger:
                ledger.finish_job(pid, "canceled", ended_at)
        return state
    if job is None:
        raise web.HTTPNotFound(reason="任务不存在")
    async with app["comfy_lock"]:
        if job["status"] not in LIVE and not job.get("cleanup_pending"):
            return "finished"
        task = app["cleanup_tasks"].get(pid)
        if task is None or task.done():
            app["cleanup_pending"].add(pid)
            job.update(cleanup_pending=True, step="正在停止并释放显存", error=None)
            save_jobs()
            task = asyncio.create_task(cancel_local_and_release(app, pid))
            app["cleanup_tasks"][pid] = task
    # HTTP 客户端断开不能取消实际清理，也不能提前放开提交门禁。
    if not await asyncio.shield(task):
        raise web.HTTPServiceUnavailable(text="显存释放未确认，请检查 ComfyUI 后重试取消。")
    return "canceled"


async def cancel_local_and_release(app, pid):
    job = JOBS.get(pid)
    try:
        async with app["session"].post(
            f"{COMFY_HTTP}/api/jobs/{pid}/cancel", json={"free_memory": True},
            timeout=aiohttp.ClientTimeout(total=130, sock_connect=10),
        ) as response:
            response.raise_for_status()
            ack = await response.json()
        if (not isinstance(ack, dict) or ack.get("cleanup_complete") is not True
                or not isinstance(ack.get("cancelled"), bool)):
            raise ValueError("ComfyUI 未确认 cleanup_complete")
    except Exception as exc:
        if job:
            job.update(step="显存释放未确认，请重试取消",
                       error=f"显存释放未确认，请检查 ComfyUI 后重试取消：{exc}")
            save_jobs()
        return False
    if job:
        job.update(status="canceled", cleanup_pending=False, step="", error=None,
                   ended=time.time())
        STEPS.pop(pid, None)
        WEIGHTS.pop(pid, None)
        save_jobs()
    app["cleanup_pending"].discard(pid)
    app["cleanup_tasks"].pop(pid, None)
    return True


async def check_task_mutation(request, pid):
    await authorized_job(request, pid, operate=True)
    if (not CONTROLLER_MODE and JOBS.get(pid, {}).get("status") == "running"
            and require_user(request)["role"] != "admin"):
        raise web.HTTPConflict(text="本地执行器仅支持全局中断，请由管理员取消运行中的任务")


async def api_cancel(request):
    pid = request.match_info["pid"]
    await check_task_mutation(request, pid)
    state = await stop_job(request.app, pid)
    return web.json_response({"ok": True, "state": state})


async def api_job_delete(request):
    """从任务列表里抹掉一条；远端运行中的任务需先等待 Worker 确认取消。"""
    pid = request.match_info["pid"]
    await check_task_mutation(request, pid)
    if (JOBS.get(pid) or {}).get("cleanup_pending"):
        return web.json_response({"ok": True, "pending": True})
    state = await stop_job(request.app, pid)
    if CONTROLLER_MODE and state == "cancel_requested":
        return web.json_response({"ok": True, "pending": True})
    JOBS.pop(pid, None)
    STEPS.pop(pid, None)
    WEIGHTS.pop(pid, None)
    if CONTROLLER_MODE:
        distributed_store(request.app).remove_job(pid)
    save_jobs()
    return web.json_response({"ok": True})


async def api_jobs_clear(request):
    """一键清掉所有已结束的任务（成功/失败/已取消），还在跑和排队的留着。"""
    gone = []
    for pid, job in list(JOBS.items()):
        if (job["status"] not in LIVE and not job.get("cleanup_pending")
                and await job_permission(request, pid) == "operate"):
            gone.append(pid)
    for pid in gone:
        JOBS.pop(pid, None)
        STEPS.pop(pid, None)
        WEIGHTS.pop(pid, None)
    if CONTROLLER_MODE:
        for pid in gone:
            distributed_store(request.app).remove_job(pid)
    save_jobs()
    return web.json_response({"ok": True, "removed": len(gone)})


PROJ_DIR = ROOT / "data" / "projects"


def proj_path(pid):
    if not pid.replace("-", "").isalnum():
        raise web.HTTPBadRequest(reason="非法项目 id")
    return PROJ_DIR / f"{pid}.json"


def sync_project_name(app, project_id, project_name):
    changed = False
    for job in JOBS.values():
        if job.get("project") == project_id and job.get("projectName") != project_name:
            job["projectName"] = project_name
            changed = True
    if changed:
        save_jobs()
    ledger = cost_ledger(app)
    if ledger:
        ledger.rename_project(project_id, project_name)


async def api_projects(request):
    user = require_user(request)
    accessible = await call_store(request.app, "list_projects", user["id"])
    out = []
    for acl in accessible:
        path = proj_path(acl["project_id"])
        if not path.is_file():
            continue
        try:
            d = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        out.append({"id": acl["project_id"], "name": d.get("name", "未命名"),
                    "updated": d.get("updated", 0), "cards": len(d.get("cards", [])),
                    "locked": bool(d.get("locked")), "owner_id": acl["owner_id"],
                    "owner_username": acl.get("owner_username", ""),
                    "team_id": acl.get("team_id"), "team_name": acl.get("team_name"),
                    "share_count": acl.get("share_count", 0),
                    "shared_team_ids": acl.get("shared_team_ids", []),
                    "shared_personally": bool(acl.get("shared_personally")),
                    "permission": acl["permission"]})
    out.sort(key=lambda p: p["updated"], reverse=True)
    teams = await call_store(request.app, "list_teams", user["id"])
    return web.json_response({"projects": out, "teams": teams})


async def api_project_create(request):
    user = require_user(request)
    body = await request.json()
    if (not isinstance(body, dict) or set(body) - {"name", "team_id"}
            or not isinstance(body.get("name", ""), str)
            or (body.get("team_id") is not None and not isinstance(body.get("team_id"), str))):
        raise web.HTTPBadRequest(text="画布名称或项目组不正确")
    team_id = body.get("team_id") or None
    PROJ_DIR.mkdir(parents=True, exist_ok=True)
    pid = uuid.uuid4().hex[:12]
    d = {"id": pid, "name": (body.get("name") or "新项目").strip()[:40],
         "cards": [], "edges": [], "view": {"x": 0, "y": 0, "k": 1},
         "created": time.time(), "updated": time.time(), "rev": 0}
    acl = await call_store(request.app, "create_project", pid, user["id"],
                           state="pending", team_id=team_id)
    write_project(proj_path(pid), d)
    await call_store(request.app, "set_project_state", pid, "active")
    return web.json_response(d | {"owner_id": user["id"], "owner_username": user["username"],
                                  "team_id": team_id, "team_name": acl.get("team_name"),
                                  "share_count": 0, "shared_team_ids": [],
                                  "shared_personally": False, "permission": "operate"})


async def api_project_get(request):
    pid = request.match_info["pid"]
    await require_project(request, pid)
    p = proj_path(pid)
    if not p.exists():
        raise web.HTTPNotFound(reason="项目不存在")
    user = require_user(request)
    details = await call_store(request.app, "get_project_for_user", user["id"], pid)
    if details is None:
        raise web.HTTPNotFound(reason="项目不存在或不可访问")
    d = json.loads(p.read_text(encoding="utf-8"))
    return web.json_response(d | {"owner_id": details["owner_id"],
                                  "owner_username": details["owner_username"],
                                  "team_id": details.get("team_id"),
                                  "team_name": details.get("team_name"),
                                  "share_count": details.get("share_count", 0),
                                  "shared_team_ids": details.get("shared_team_ids", []),
                                  "shared_personally": bool(details.get("shared_personally")),
                                  "permission": details["permission"]})


async def api_project_shares(request):
    user = require_user(request)
    pid = request.match_info["pid"]
    if request.method == "GET":
        data = await call_store(request.app, "list_project_shares", pid, user["id"])
        return web.json_response(data)
    try:
        body = await request.json()
    except (ValueError, UnicodeError):
        raise web.HTTPBadRequest(text="请求必须为 JSON 对象")
    if (not isinstance(body, dict) or set(body) != {"user_ids", "team_ids"}
            or not isinstance(body["user_ids"], list) or not isinstance(body["team_ids"], list)):
        raise web.HTTPBadRequest(text="分享对象清单不正确")
    data = await call_store(request.app, "set_project_shares", pid,
                            body["user_ids"], body["team_ids"], user["id"])
    return web.json_response(data)


async def api_project_save(request):
    pid = request.match_info["pid"]
    await require_project(request, pid, operate=True)
    p = proj_path(pid)
    if not p.exists():
        raise web.HTTPNotFound(reason="项目不存在")
    old = json.loads(p.read_text(encoding="utf-8"))
    # locked 的项目（示例）是只读的：用户在上面随便改参数、随便重跑都行，但一个字都不落盘 ——
    # 刷新就回到这份固定的示例。前端 save() 也会直接跳过，这里是最后一道闸
    # （另一个标签页、或者写歪的脚本照样拦住）。要改示例本身就直接改那份 json 文件，
    # 记得把 rev 加一，不然开着旧快照的页面下一次写入会撞上 409。
    if old.get("locked"):
        raise web.HTTPForbidden(reason="locked project")
    body = await request.json()
    # 前端每次都整份 PUT，没有版本号就是「后写的赢」：一个开着旧快照的标签页随便点一下，
    # 就能把别处刚写进去的产物抹掉。带上打开时拿到的 rev，对不上就让它先重新加载。
    # rev 是必填的：不带版本号的写入一律拒，否则一个没刷新过的老页面又能悄悄盖掉数据
    rev = old.get("rev", 0)
    if body.get("rev") != rev:
        # reason 走 HTTP 头，只能是 ASCII，中文提示由前端自己出
        raise web.HTTPConflict(reason="stale rev")
    if "name" in body:
        body["name"] = str(body.get("name") or "").strip()[:40]
        if not body["name"]:
            raise web.HTTPBadRequest(reason="项目名不能为空")
    await resource_call(request.app, "validate_document", require_user(request)["id"], pid, body)
    await require_project(request, pid, operate=True)
    previous_name = old.get("name")
    for k in ("name", "cards", "edges", "groups", "view"):
        if k in body:
            old[k] = body[k]
    old["rev"] = rev + 1
    old["updated"] = time.time()
    write_project(p, old)
    if old.get("name") != previous_name:
        sync_project_name(request.app, pid, old.get("name") or "未命名")
    return web.json_response({"ok": True, "updated": old["updated"], "rev": old["rev"]})


async def api_project_rename(request):
    pid = request.match_info["pid"]
    await require_project(request, pid, operate=True)
    p = proj_path(pid)
    if not p.exists():
        raise web.HTTPNotFound(reason="项目不存在")
    project = json.loads(p.read_text(encoding="utf-8"))
    if project.get("locked"):
        raise web.HTTPForbidden(reason="locked project")
    body = await request.json()
    name = str(body.get("name") or "").strip()[:40]
    if not name:
        raise web.HTTPBadRequest(reason="项目名不能为空")
    if project.get("name") != name:
        project["name"] = name
        project["rev"] = project.get("rev", 0) + 1
        project["updated"] = time.time()
        await require_project(request, pid, operate=True)
        write_project(p, project)
        sync_project_name(request.app, pid, name)
    return web.json_response({
        "ok": True, "name": project["name"], "updated": project.get("updated", 0),
        "rev": project.get("rev", 0),
    })


async def api_project_delete(request):
    pid = request.match_info["pid"]
    await require_project(request, pid, operate=True)
    p = proj_path(pid)
    if p.exists() and json.loads(p.read_text(encoding="utf-8")).get("locked"):
        raise web.HTTPForbidden(reason="locked project")
    # 先封闭访问，再取消任务、移动文件；失败重试也不重新开放。
    await call_store(request.app, "set_project_state", pid, "deleted")
    jobs = await call_store(request.app, "list_project_jobs", pid)
    for jid in jobs:
        if CONTROLLER_MODE:
            await stop_job(request.app, jid)
        elif JOBS.get(jid, {}).get("status") == "queued":
            await stop_job(request.app, jid)
    if p.exists():
        p.rename(p.with_suffix(".json.deleted"))
    return web.json_response({"ok": True})


async def api_project_copy(request):
    target = request.match_info["pid"]
    await require_project(request, target, operate=True)
    body = await request.json()
    if not isinstance(body, dict) or not isinstance(body.get("card"), dict):
        raise web.HTTPBadRequest(text="必须提供要复制的节点")
    await require_project(request, body.get("source_project"))
    await cache_comfy_outputs(request, body["card"])
    card = await resource_call(request.app, "copy_document", require_user(request)["id"],
                               body["source_project"], target, body["card"])
    await require_project(request, target, operate=True)
    return web.json_response({"card": card})


async def api_file(request):
    """代理 ComfyUI 的 /view，不暴露 8188"""
    q = request.rel_url.query
    if "filename" not in q:
        raise web.HTTPBadRequest(reason="缺 filename")
    if set(q) - {"filename", "subfolder", "type"} or any(len(q.getall(k)) != 1 for k in q):
        raise web.HTTPBadRequest(text="无效的文件查询参数")
    ref = await resource_call(request.app, "reference", str(request.rel_url))
    if not ref:
        raise web.HTTPNotFound()
    await require_resource(request, *ref)
    session = request.app["session"]
    locator = {"filename": q["filename"], "subfolder": q.get("subfolder", ""),
               "type": q.get("type", "output")}
    url = COMFY_HTTP + "/view?" + urlencode(locator)
    async with session.get(url) as r:
        if r.status != 200:
            raise web.HTTPNotFound(reason=f"ComfyUI /view 返回 {r.status}")
        resp = web.StreamResponse(status=200, headers={
            "Content-Type": r.headers.get("Content-Type", "application/octet-stream"),
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        })
        await resp.prepare(request)
        async for chunk in r.content.iter_chunked(64 * 1024):
            await resp.write(chunk)
        await resp.write_eof()
        return resp


def private_file(path):
    response = web.FileResponse(path, headers={
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})
    if path.suffix.lower() not in IMG_EXT | VID_EXT | AUD_EXT:
        response.content_type = "application/octet-stream"
        response.headers["Content-Disposition"] = "attachment"
    return response


async def api_upload_file(request):
    name = request.match_info["name"]
    await require_resource(request, "upload", name)
    path = await resource_call(request.app, "local_path", "upload", name)
    if not path.is_file():
        raise web.HTTPNotFound()
    return private_file(path)


async def api_preview_status(request):
    await require_resource(request, "upload", request.match_info["name"])
    return await preview_status(request)


async def api_preview_file(request):
    await require_resource(request, "upload", request.match_info["name"])
    return await preview_file(request)


async def permissions_page(request):
    require_admin(request)
    return web.FileResponse(ROOT / "web" / "permissions.html")


async def teams_page(request):
    require_team_leader(request)
    return web.FileResponse(ROOT / "web" / "teams.html")


async def static_asset(request, *, name):
    return web.FileResponse(ROOT / "web" / name)


async def index(request):
    require_user(request)
    return web.FileResponse(ROOT / "web" / "index.html")


async def controller_index(request):
    if not CONTROLLER_MODE:
        raise web.HTTPNotFound(reason="中间层运行面板只在 controller 模式提供")
    return web.FileResponse(ROOT / "web" / "controller.html")


async def controller_costs(request):
    if not CONTROLLER_MODE:
        raise web.HTTPNotFound(reason="费用统计只在 controller 模式提供")
    return web.FileResponse(ROOT / "web" / "costs.html")


async def api_costs(request):
    ledger = cost_ledger(request.app)
    if not ledger:
        raise web.HTTPServiceUnavailable(reason="费用统计未启用")
    try:
        start = float(request.query["from"]) if request.query.get("from") else None
        end = float(request.query["to"]) if request.query.get("to") else None
        limit = int(request.query.get("limit", 100))
    except ValueError:
        raise web.HTTPBadRequest(reason="from、to、limit 必须是数字")
    if ((start is not None and not math.isfinite(start))
            or (end is not None and not math.isfinite(end))
            or (start is not None and end is not None and start > end)):
        raise web.HTTPBadRequest(reason="统计时间范围无效")
    return web.json_response(ledger.report(start, end, limit))


async def api_health(request):
    user = require_user(request)
    if user["role"] != "admin":
        return web.json_response({"ok": True, "mode": EXECUTION_MODE,
                                  "comfy_online": controller_comfy_online(request.app)})
    workers = distributed_store(request.app).list_workers() if CONTROLLER_MODE else []
    return web.json_response({
        "ok": True, "mode": EXECUTION_MODE,
        "server_time": time.time(), "started_at": STARTED_AT,
        "comfy_online": controller_comfy_online(request.app),
        "capabilities": len(CAPS), "jobs": len(JOBS), "client_id": CLIENT_ID,
        "workers": len(workers),
        "online_workers": sum(w["state"] != "offline" for w in workers),
        "llm": llm.where(),      # 改写走不走 API（不含 key）
    })


# =====================================================================
async def on_start(app):
    app["auth_store"] = await asyncio.to_thread(AuthStore, app["auth_path"])
    app["resource_access"] = await asyncio.to_thread(
        ResourceAccess, app["auth_store"], ROOT, COMFY_INPUT)
    app["session"] = aiohttp.ClientSession(
        timeout=aiohttp.ClientTimeout(total=None, sock_connect=10))
    if app["local_test"]:
        await setup_local_test_auth(app)
    else:
        setup_dingtalk(app, app["auth_store"])
    if not CONTROLLER_MODE:
        app["ws_task"] = asyncio.create_task(ws_loop(app))


async def on_stop(app):
    await asyncio.gather(*app["cleanup_tasks"].values(), return_exceptions=True)
    await app["video_previews"].close()
    task = app.get("ws_task")
    if task:
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)
    await stop_dingtalk(app)
    await app["session"].close()
    ledger = app.get("costs")
    if ledger:
        ledger.close()
    store = app.get("distributed")
    if store:
        store.close()
    auth_store = app.get("auth_store")
    if auth_store:
        await asyncio.to_thread(auth_store.close)


def lan_ips():
    """本机在局域网里的地址 —— 别人（手机、另一台电脑）要拿哪个网址进来。

    服务本来就监听 0.0.0.0（全部网卡），差的只是"网址是什么"没人告诉用户。
    UDP connect 不发包，只是让系统按路由表挑出那张出网的网卡，比按主机名反解可靠
    （多网卡 / 虚拟机网卡的机器上主机名常常解析成一堆 169.254 或者只有回环）。
    """
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("223.5.5.5", 80))
        ips.append(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith(("127.", "169.254.")) and ip not in ips:
                ips.append(ip)
    except OSError:
        pass
    return ips


async def no_cache(request, response):
    """改完 app.js / style.css，刷新还是旧的 —— 这个坑踩过一次。

    aiohttp 的 add_static 只发 Last-Modified + ETag，不发 Cache-Control，
    浏览器就自己按启发式规则判新鲜度（大致是"离上次改动过了多久"的 10%），
    普通刷新根本不回来问，直接用缓存里那份。前端是无构建的裸文件、没有版本号
    文件名，只能在这儿声明一句 no-cache —— 不是"不缓存"，是"每次都回来问一句"，
    没改就回 304，几乎不费流量。

    `/api/` 底下不管：产物图和视频（`/api/file`）是真该缓存的，
    每次重画卡片都重下一遍几十兆的 mp4，局域网上尤其难受。
    """
    if not request.path.startswith("/api/"):
        response.headers.setdefault("Cache-Control", "no-cache")


def make_app(auth_path=None):
    local_test = os.environ.get("CHOUKA_LOCAL_TEST") == "1"
    if local_test and (CONTROLLER_MODE or EXECUTION_MODE != "local"):
        raise RuntimeError("免登录测试只能使用 local 执行模式，不能用于 controller")
    n = load_caps()
    load_jobs()
    app = web.Application(client_max_size=512 * 1024 ** 2,
                          middlewares=[auth_middleware, project_write_lock])
    app["comfy_lock"] = asyncio.Lock()
    app["cleanup_pending"] = {pid for pid, job in JOBS.items()
                              if job.get("cleanup_pending") and not CONTROLLER_MODE}
    app["cleanup_tasks"] = {}
    app["local_test"] = local_test
    app["bind_host"] = "127.0.0.1" if local_test else "0.0.0.0"
    if local_test:
        app["auth_path"] = Path(auth_path or ROOT / "data" / "auth-local-test.db")
    else:
        app["auth_path"] = Path(auth_path or os.environ.get("CHOUKA_AUTH_DB") or ROOT / "data" / "auth.db")
    app["project_locks"] = defaultdict(asyncio.Lock)
    register_auth_routes(app, ROOT / "web")
    app["video_previews"] = VideoPreviews(
        ROOT / "data" / "uploads", ffmpeg_bin, VID_EXT,
    )
    if CONTROLLER_MODE:
        database_path = ROOT / "data" / "control.db"
        app["distributed"] = DistributedStore(database_path)
        app["costs"] = CostLedger(database_path, ROOT / "pricing.json")
        app["costs"].backfill(JOBS.values())
    app.on_response_prepare.append(no_cache)
    app.router.add_get("/", index)
    app.router.add_get("/controller", controller_index)
    app.router.add_get("/controller/costs", controller_costs)
    app.router.add_get("/api/health", api_health)
    app.router.add_get("/api/status", api_status)
    app.router.add_get("/api/cards", api_cards)
    app.router.add_post("/api/reload", api_reload)
    app.router.add_post("/api/upload", api_upload)
    app.router.add_get("/api/preview/{name}/file", api_preview_file)
    app.router.add_get("/api/preview/{name}", api_preview_status)
    app.router.add_get("/api/media", api_media)
    app.router.add_post("/api/generate", api_generate)
    app.router.add_post("/api/rewrite", api_rewrite)
    app.router.add_post("/api/text", api_text)
    app.router.add_get("/api/jobs", api_jobs)
    app.router.add_post("/api/jobs/clear", api_jobs_clear)
    app.router.add_get("/api/job/{pid}", api_job)
    app.router.add_post("/api/job/{pid}/cancel", api_cancel)
    app.router.add_delete("/api/job/{pid}", api_job_delete)
    app.router.add_get("/api/projects", api_projects)
    app.router.add_post("/api/projects", api_project_create)
    app.router.add_get("/api/projects/{pid}", api_project_get)
    app.router.add_get("/api/projects/{pid}/shares", api_project_shares)
    app.router.add_put("/api/projects/{pid}/shares", api_project_shares)
    app.router.add_put("/api/projects/{pid}", api_project_save)
    app.router.add_post("/api/projects/{pid}/rename", api_project_rename)
    app.router.add_post("/api/projects/{pid}/copy", api_project_copy)
    app.router.add_delete("/api/projects/{pid}", api_project_delete)
    app.router.add_get("/api/file", api_file)
    app.router.add_get("/api/artifact/{pid}/{name}", api_artifact)
    if CONTROLLER_MODE:
        app.router.add_get("/api/workers", api_workers)
        app.router.add_get("/api/costs", api_costs)
        app.router.add_post("/api/workers/{worker_id}/enabled", api_worker_enabled)
        app.router.add_post("/api/admin/workers/sync-all", api_workers_sync_all)
        app.router.add_post("/agent/v1/register", api_agent_register)
        app.router.add_post("/agent/v1/heartbeat", api_agent_heartbeat)
        app.router.add_post("/agent/v1/jobs/acquire", api_agent_acquire)
        app.router.add_post("/agent/v1/jobs/{pid}/start", api_agent_start)
        app.router.add_get("/agent/v1/jobs/{pid}/inputs/{name}", api_agent_input)
        app.router.add_post("/agent/v1/jobs/{pid}/event", api_agent_event)
        app.router.add_post("/agent/v1/jobs/{pid}/artifact", api_agent_artifact)
        app.router.add_post("/agent/v1/jobs/{pid}/complete", api_agent_complete)
        app.router.add_post("/agent/v1/jobs/{pid}/failed", api_agent_failed)
    up = ROOT / "data" / "uploads"
    up.mkdir(parents=True, exist_ok=True)
    app.router.add_get("/api/upload/{name}", api_upload_file)
    app.router.add_get("/admin/permissions", permissions_page)
    app.router.add_get("/teams", teams_page)
    # 不使用 web 根目录兜底，防止直接访问管理 HTML 或备份文件绕过页面授权。
    for name in ("app.js", "style.css"):
        app.router.add_get("/" + name, partial(static_asset, name=name))
    app.on_startup.append(on_start)
    app.on_cleanup.append(on_stop)
    print(f"[抽卡系统] 载入 {n} 个能力，{len(CARDS)} 张卡")
    print(f"[抽卡系统] 执行模式：{EXECUTION_MODE}")
    if CONTROLLER_MODE and not ENROLLMENT_TOKEN:
        print("[抽卡系统] 警告：未配置 CHOUKA_ENROLLMENT_TOKEN，Worker 注册已禁用")
    print(f"[抽卡系统] 本机   http://127.0.0.1:{PORT}")
    if local_test:
        print("[抽卡系统] 本地免登录测试：仅监听 127.0.0.1，使用独立测试身份，不迁移正式账号或历史权限。")
    else:
        for ip in lan_ips():
            print(f"[抽卡系统] 局域网 http://{ip}:{PORT}   ← 手机/别的电脑用这个")
        print("[抽卡系统] 已启用账号鉴权；首次使用请先运行账号初始化和历史权限迁移。")
    return app


if __name__ == "__main__":
    try:
        import sys
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    # 屏蔽 asyncio 底层的 ConnectionResetError traceback
    # 这个错误在用户刷新页面、关闭浏览器、网络中断时都会出现，是正常现象
    import logging
    logging.getLogger('asyncio').setLevel(logging.ERROR)

    application = make_app()
    web.run_app(application, host=application["bind_host"], port=PORT, print=None)
