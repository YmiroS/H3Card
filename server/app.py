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
import subprocess
import sys
import time
import uuid
from pathlib import Path
from urllib.parse import urlencode

import aiohttp
from aiohttp import web

# 整合包那个 python_embeded 带 python312._pth，有这个文件 Python 就**不会**把脚本
# 自己的目录塞进 sys.path，于是同目录的 rewrite.py 直接 import 不到（报
# ModuleNotFoundError: No module named 'rewrite'）。自己补上。
sys.path.insert(0, str(Path(__file__).resolve().parent))
import rewrite as rw
import llm
import translate as tr
from distributed import DistributedStore

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

MODEL_FAMILY = {
    **{cap: "minimax_h3" for cap in (
        "minimax_h3_i2v", "minimax_h3_flf2v", "minimax_h3_talk1",
        "minimax_h3_talk2", "minimax_h3_ref4", "minimax_h3_ref9",
        "minimax_h3_ref_2pass", "minimax_h3_comic20",
    )},
    "flux2_klein_edit": "flux2_klein",
    "flux2_klein_storyboard9": "flux2_klein",
    "rmbg_erase": "flux2_klein",
    "krea2_t2i": "krea2",
    "krea2_i2i": "krea2",
    "zimage_t2i": "zimage",
    "zimage_i2i": "zimage",
    "qwen_image_reverse": "qwen35_27b",
    "qwen_video_reverse": "qwen35_27b",
    "rmbg_cutout": "rmbg2",
    "rmbg_bgonly": "rmbg2",
    "seedvr2_image_up": "seedvr2",
    "seedvr2_video_up": "seedvr2",
}


def model_family(capability_id):
    return MODEL_FAMILY.get(capability_id, capability_id)


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
    """整合包里的 ffmpeg（imageio_ffmpeg 带的那个，没有独立的 ffmpeg.exe）。
       按前缀找，免得版本号一升就断。"""
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


def patch_graph(cap, params, uploaded):
    """按 manifest 把用户参数写进 API 工作流模板"""
    g = copy.deepcopy(json.loads((ROOT / cap["graph"]).read_text(encoding="utf-8")))
    labels = {s["key"]: s["label"] for s in cap["inputs"]}
    missing, blank = [], []
    for spec in cap["inputs"]:
        key, tgt = spec["key"], spec["target"]
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
                info = probe_video(val)
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
        g[node]["inputs"][field] = val
    if missing:
        raise web.HTTPBadRequest(reason="必填素材未提供：" + "、".join(missing))
    if blank:
        raise web.HTTPBadRequest(
            reason="这几张图没写提示词：" + "、".join(blank) + "（空提示词会让图和提示词错位）")
    return g


async def comfy_submit(session, graph):
    payload = {"prompt": graph, "client_id": CLIENT_ID}
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
                    await handle_event(session, ev)
        except Exception as e:
            STATE["comfy_online"] = False
            print(f"[ws] 与 ComfyUI 断开：{type(e).__name__}: {e}，3 秒后重连")
            await asyncio.sleep(3)


async def handle_event(session, ev, remote=False):
    t, d = ev.get("type"), ev.get("data") or {}
    if DEBUG:
        print(f"[ev] {t} {json.dumps(d, ensure_ascii=False)[:220]}", flush=True)
    pid = d.get("prompt_id")
    job = JOBS.get(pid) if pid else None

    # 失败 / 取消 / 完成都是终局。ComfyUI 报错之后还会补发 executing(node=None)、
    # progress_state 这类收尾事件，放进来会把状态改回 done —— 一次失败在界面上显示成
    # "生成成功"，卡片还挂着上一次的产物，比直接报错更难查。
    if job and job["status"] in ("error", "canceled", "done") and t in (
            "execution_start", "executing", "execution_success", "progress_state"):
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
            job["outputs"] = await collect_outputs(session, pid)
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
        local.write_bytes(raw)
        # 控制层只保存一份中心素材；领取任务的 Worker 会下载到自己的
        # ComfyUI/input/chouka/，所以工作流里的相对引用保持一致。
        ref = f"chouka/{safe}" if CONTROLLER_MODE else await comfy_upload(
            session, part.name, safe, raw
        )
        item = {"ref": ref, "kind": kind_of(safe), "origin": name,
                "url": f"/api/upload/{safe}"}
        if item["kind"] == "video":
            # 帧率给「目标帧率」反算倍数用，总帧数给「只处理前几帧」当分母。
            # 上传时探一次存下来，面板就不用每次开都去探文件
            item.update(probe_video(ref))
        saved.append(item)
    if not saved:
        raise web.HTTPBadRequest(reason="没有收到文件")
    return web.json_response({"files": saved})


async def api_media(request):
    """现探一份素材的帧率/总帧数。给这条改动之前存下的素材兜底（老项目里的素材
       记录只有 ref/kind/url，没有 fps/frames）。"""
    return web.json_response(probe_video(request.query.get("ref") or ""))


async def api_generate(request):
    body = await request.json()
    cid = body.get("capability")
    cap = CAPS.get(cid)
    if not cap:
        raise web.HTTPBadRequest(reason=f"未知能力 {cid}")
    if not cap.get("_graph_ok"):
        raise web.HTTPBadRequest(reason=f"{cid} 缺 API 工作流文件：{cap['graph']}")
    params = body.get("params") or {}
    uploaded = body.get("assets") or {}        # {"images[0]": "chouka/ck_xxx.png"}
    graph = patch_graph(cap, params, uploaded)
    if body.get("dry_run"):
        tpl = json.loads((ROOT / cap["graph"]).read_text(encoding="utf-8"))
        diff = {f"#{n}.{k}": [tpl[n]["inputs"].get(k), v]
                for n, nd in graph.items() for k, v in nd["inputs"].items()
                if tpl[n]["inputs"].get(k) != v}
        diff.update({f"#{n}.{k}": [v, "<断开>"]           # dropIfEmpty 拔掉的线
                     for n, nd in tpl.items() for k, v in nd["inputs"].items()
                     if k not in graph[n]["inputs"]})
        return web.json_response({"dry_run": True, "changed": diff})
    pid = str(uuid.uuid4()) if CONTROLLER_MODE else await comfy_submit(
        request.app["session"], graph
    )
    # 步骤名和权重单独放 STEPS / WEIGHTS，不塞进 job：job 每次轮询整份回给前端，
    # 59 个节点名白传
    STEPS[pid] = step_labels(graph)
    WEIGHTS[pid] = step_weights(graph)
    JOBS[pid] = {"id": pid, "capability": cid, "name": cap["name"],
                 "outputType": cap["outputType"], "status": "queued",
                 "progress": 0.0, "created": time.time(),
                 "seed": params.get("_seed_used", params.get("seed")),
                 "step": "", "outputs": [], "error": None,
                 # 任务面板要能说清"这是哪张卡在跑"，还要能点回那张卡
                 "project": body.get("project"), "card": body.get("card"),
                 "cardName": body.get("cardName")}
    if CONTROLLER_MODE:
        required_nodes = {
            nd.get("class_type") for nd in graph.values()
            if isinstance(nd, dict) and nd.get("class_type")
        }
        distributed_store(request.app).enqueue(
            pid,
            {"graph": graph, "assets": uploaded, "capability": cid,
             "model_family": model_family(cid)},
            required_nodes,
        )
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
    body = await request.json()
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
    return web.json_response({"text": text, "warn": "；".join(warns),
                              "via": via, "fallback": fell, "model": mname,
                              "tokens": tokens,
                              "ms": int((time.time() - t0) * 1000)})


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
    pid = await comfy_submit(request.app["session"], graph)
    STEPS[pid] = step_labels(graph)
    WEIGHTS[pid] = step_weights(graph)
    JOBS[pid] = {"id": pid, "capability": "text", "name": job_name,
                 "outputType": "text", "status": "queued",
                 "progress": 0.0, "created": t0, "seed": None,
                 "step": "", "outputs": [], "error": None,
                 "project": body.get("project"), "card": body.get("card"),
                 "cardName": body.get("cardName")}

    job = JOBS[pid]
    try:
        while job["status"] in LIVE:
            if time.time() - t0 > REWRITE_TIMEOUT:
                await stop_job(request.app["session"], pid)
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
    body = await request.json()
    op = str(body.get("op") or "")

    # 翻译操作走有道 API，不走 LLM
    if op == "translate":
        inputs = [(str(i.get("name") or "?"), str(i.get("text") or ""))
                  for i in body.get("inputs") or [] if str(i.get("text") or "").strip()]
        if not inputs:
            raise web.HTTPBadRequest(reason="没有要翻译的文本")
        src_text = inputs[0][1]  # 取第一条输入
        t0 = time.time()
        try:
            translated = tr.youdao_translate(src_text)
            return web.json_response({
                "text": translated, "warn": "",
                "via": "youdao", "model": "有道翻译", "tokens": 0,
                "ms": int((time.time() - t0) * 1000)
            })
        except tr.TranslateError as e:
            raise web.HTTPBadGateway(reason=f"有道翻译失败：{e}"[:400])

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
    return web.json_response({"text": text, "warn": "；".join(warns),
                              "via": via, "model": mname, "tokens": tokens,
                              "ms": int((time.time() - t0) * 1000)})


async def api_job(request):
    pid = request.match_info["pid"]
    job = JOBS.get(pid)
    if not job:
        raise web.HTTPNotFound(reason="没有这个任务")
    return web.json_response(job)


async def api_jobs(request):
    return web.json_response({"jobs": sorted(JOBS.values(),
                                             key=lambda j: j["created"], reverse=True)[:60]})


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
        comfy_online=bool(body.get("comfy_online")),
        busy=bool(body.get("busy")),
        local_busy=body.get("local_busy") if "local_busy" in body else None,
        current_job_id=body.get("current_job_id"),
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
    if not distributed_store(request.app).mark_running(pid, worker_id, lease_token):
        raise web.HTTPConflict(reason="任务无法进入运行状态")
    job = JOBS.get(pid)
    if job:
        job.update(status="running", progress=0.0, step="", error=None,
                   started=time.time(), ended=None, worker_id=worker_id)
        save_jobs()
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

    # 错误事件本身就是可信终态。必须在同一次请求里结束租约并释放 Worker，
    # 不能依赖 Agent 再补一次 /failed；补报一旦断线，心跳就会把失败任务续租成 running。
    if event_type in ("execution_error", "execution_interrupted"):
        terminal = "error" if event_type == "execution_error" else "canceled"
        store = distributed_store(request.app)
        if not store.finish(pid, worker_id, lease_token, terminal):
            if store.dispatch_status(pid, worker_id) != terminal:
                raise web.HTTPConflict(reason="任务无法结束")
        job = JOBS.get(pid)
        if job:
            if terminal == "error":
                error = (f"#{data.get('node_id')} {data.get('node_type')}: "
                         f"{data.get('exception_message') or 'ComfyUI 执行失败'}")[:12000]
            else:
                error = None
            job.update(status=terminal, step="", ended=time.time(),
                       worker_id=worker_id, error=error)
            STEPS.pop(pid, None)
            WEIGHTS.pop(pid, None)
            save_jobs()
        return web.json_response({"ok": True, "terminal": terminal})

    await handle_event(None, event, remote=True)
    return web.json_response({"ok": True})


async def api_agent_artifact(request):
    worker_id = require_agent(request)
    pid, _lease_token = require_lease(request, worker_id)
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
    with target.open("wb") as fp:
        while True:
            chunk = await part.read_chunk(1024 * 1024)
            if not chunk:
                break
            fp.write(chunk)
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
    if not distributed_store(request.app).finish(pid, worker_id, lease_token, "done"):
        raise web.HTTPConflict(reason="任务无法完成")
    job = JOBS.get(pid)
    if job:
        job.update(status="done", progress=1.0, outputs=outputs, step="",
                   ended=time.time(), worker_id=worker_id, error=None)
        STEPS.pop(pid, None)
        WEIGHTS.pop(pid, None)
        save_jobs()
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
    if job and not already_terminal:
        job.update(status="canceled" if canceled else "error", step="", ended=time.time(),
                   worker_id=worker_id, error=None if canceled else str(body.get("error") or "Worker 执行失败")[:2000])
        STEPS.pop(pid, None)
        WEIGHTS.pop(pid, None)
        save_jobs()
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


async def api_artifact(request):
    pid = request.match_info["pid"]
    name = request.match_info["name"]
    if Path(pid).name != pid or Path(name).name != name:
        raise web.HTTPNotFound()
    path = ARTIFACT_DIR / pid / name
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
        if j.get("status") in LIVE and not CONTROLLER_MODE:
            j.update(status="canceled", step="", ended=j.get("ended") or time.time(),
                     error="抽卡系统重启了，这一轮没跑完（重启前的进度不留，重跑一次就行）")
            cut += 1
        JOBS[j["id"]] = j
    print(f"[抽卡系统] 读回 {len(rows)} 条任务记录"
          + (f"，其中 {cut} 条是重启时被打断的" if cut else ""))


async def stop_job(app, pid):
    """停止本地任务，或向远端 Worker 发出取消请求。"""
    job = JOBS.get(pid)
    if job and job["status"] not in LIVE:
        return "finished"
    if CONTROLLER_MODE:
        state = distributed_store(app).request_cancel(pid)
        if state == "canceled" and job:
            job.update(status="canceled", step="", ended=time.time())
            save_jobs()
        return state
    session = app["session"]
    if job and job["status"] == "running":
        async with session.post(COMFY_HTTP + "/interrupt") as r:
            await r.read()
    else:
        async with session.post(COMFY_HTTP + "/queue",
                                json={"delete": [pid]}) as r:
            await r.read()
    if job:
        job["status"] = "canceled"
        job["step"] = ""
        save_jobs()
    return "canceled"


async def api_cancel(request):
    state = await stop_job(request.app, request.match_info["pid"])
    return web.json_response({"ok": True, "state": state})


async def api_job_delete(request):
    """从任务列表里抹掉一条；远端运行中的任务需先等待 Worker 确认取消。"""
    pid = request.match_info["pid"]
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
    gone = [pid for pid, j in JOBS.items() if j["status"] not in LIVE]
    for pid in gone:
        JOBS.pop(pid, None)
        STEPS.pop(pid, None)
        WEIGHTS.pop(pid, None)
    if CONTROLLER_MODE:
        distributed_store(request.app).clear_finished()
    save_jobs()
    return web.json_response({"ok": True, "removed": len(gone)})


PROJ_DIR = ROOT / "data" / "projects"


def proj_path(pid):
    if not pid.replace("-", "").isalnum():
        raise web.HTTPBadRequest(reason="非法项目 id")
    return PROJ_DIR / f"{pid}.json"


async def api_projects(request):
    PROJ_DIR.mkdir(parents=True, exist_ok=True)
    out = []
    for f in PROJ_DIR.glob("*.json"):
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
            out.append({"id": d["id"], "name": d.get("name", "未命名"),
                        "updated": d.get("updated", 0),
                        "cards": len(d.get("cards", [])),
                        "locked": bool(d.get("locked"))})
        except Exception:
            continue
    out.sort(key=lambda p: p["updated"], reverse=True)
    return web.json_response({"projects": out})


async def api_project_create(request):
    body = await request.json()
    PROJ_DIR.mkdir(parents=True, exist_ok=True)
    pid = uuid.uuid4().hex[:12]
    d = {"id": pid, "name": (body.get("name") or "新项目").strip()[:40],
         "cards": [], "edges": [], "view": {"x": 0, "y": 0, "k": 1},
         "created": time.time(), "updated": time.time()}
    proj_path(pid).write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
    return web.json_response(d)


async def api_project_get(request):
    p = proj_path(request.match_info["pid"])
    if not p.exists():
        raise web.HTTPNotFound(reason="项目不存在")
    return web.json_response(json.loads(p.read_text(encoding="utf-8")))


async def api_project_save(request):
    pid = request.match_info["pid"]
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
    for k in ("name", "cards", "edges", "groups", "view"):
        if k in body:
            old[k] = body[k]
    old["rev"] = rev + 1
    old["updated"] = time.time()
    p.write_text(json.dumps(old, ensure_ascii=False), encoding="utf-8")
    return web.json_response({"ok": True, "updated": old["updated"], "rev": old["rev"]})


async def api_project_delete(request):
    p = proj_path(request.match_info["pid"])
    if p.exists():
        # locked 的项目（示例）不给删：它是新用户进来第一眼看到的东西
        if json.loads(p.read_text(encoding="utf-8")).get("locked"):
            raise web.HTTPForbidden(reason="locked project")
        p.rename(p.with_suffix(".json.deleted"))   # 软删除，误点不丢工作
    return web.json_response({"ok": True})


async def api_file(request):
    """代理 ComfyUI 的 /view，不暴露 8188"""
    q = request.rel_url.query
    if "filename" not in q:
        raise web.HTTPBadRequest(reason="缺 filename")
    session = request.app["session"]
    url = COMFY_HTTP + "/view?" + request.rel_url.query_string
    async with session.get(url) as r:
        if r.status != 200:
            raise web.HTTPNotFound(reason=f"ComfyUI /view 返回 {r.status}")
        resp = web.StreamResponse(status=200, headers={
            "Content-Type": r.headers.get("Content-Type", "application/octet-stream"),
            "Cache-Control": "public, max-age=86400",
        })
        await resp.prepare(request)
        async for chunk in r.content.iter_chunked(64 * 1024):
            await resp.write(chunk)
        await resp.write_eof()
        return resp


async def api_reveal(request):
    """在资源管理器里选中素材文件。

    路径全由服务端拼：客户端只能给一个文件名，且只放行 data/uploads 这一个目录，
    免得这个接口被当成"打开任意路径"用。
    """
    body = await request.json()
    name = Path((body.get("name") or "").replace("\\", "/")).name
    if not name:
        raise web.HTTPBadRequest(reason="缺 name")
    up = (ROOT / "data" / "uploads").resolve()
    p = (up / name).resolve()
    if p.parent != up or not p.is_file():
        raise web.HTTPNotFound(reason="素材文件已经不在了")
    if os.name != "nt":
        raise web.HTTPBadRequest(reason="定位文件只支持 Windows")
    # explorer /select 正常也会返回非 0，别去看返回码
    subprocess.Popen(["explorer", f"/select,{p}"])
    return web.json_response({"ok": True, "path": str(p)})


async def index(request):
    return web.FileResponse(ROOT / "web" / "index.html")


async def controller_index(request):
    if not CONTROLLER_MODE:
        raise web.HTTPNotFound(reason="中间层运行面板只在 controller 模式提供")
    return web.FileResponse(ROOT / "web" / "controller.html")


async def api_health(request):
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
    app["session"] = aiohttp.ClientSession(
        timeout=aiohttp.ClientTimeout(total=None, sock_connect=10))
    if not CONTROLLER_MODE:
        app["ws_task"] = asyncio.create_task(ws_loop(app))


async def on_stop(app):
    task = app.get("ws_task")
    if task:
        task.cancel()
    await app["session"].close()
    store = app.get("distributed")
    if store:
        store.close()


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


def make_app():
    n = load_caps()
    load_jobs()
    app = web.Application(client_max_size=512 * 1024 ** 2)
    if CONTROLLER_MODE:
        app["distributed"] = DistributedStore(ROOT / "data" / "control.db")
    app.on_response_prepare.append(no_cache)
    app.router.add_get("/", index)
    app.router.add_get("/controller", controller_index)
    app.router.add_get("/api/health", api_health)
    app.router.add_get("/api/status", api_status)
    app.router.add_get("/api/cards", api_cards)
    app.router.add_post("/api/reload", api_reload)
    app.router.add_post("/api/upload", api_upload)
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
    app.router.add_put("/api/projects/{pid}", api_project_save)
    app.router.add_delete("/api/projects/{pid}", api_project_delete)
    app.router.add_get("/api/file", api_file)
    app.router.add_get("/api/artifact/{pid}/{name}", api_artifact)
    app.router.add_post("/api/reveal", api_reveal)
    if CONTROLLER_MODE:
        app.router.add_get("/api/workers", api_workers)
        app.router.add_post("/api/workers/{worker_id}/enabled", api_worker_enabled)
        app.router.add_post("/agent/v1/register", api_agent_register)
        app.router.add_post("/agent/v1/heartbeat", api_agent_heartbeat)
        app.router.add_post("/agent/v1/jobs/acquire", api_agent_acquire)
        app.router.add_post("/agent/v1/jobs/{pid}/start", api_agent_start)
        app.router.add_post("/agent/v1/jobs/{pid}/event", api_agent_event)
        app.router.add_post("/agent/v1/jobs/{pid}/artifact", api_agent_artifact)
        app.router.add_post("/agent/v1/jobs/{pid}/complete", api_agent_complete)
        app.router.add_post("/agent/v1/jobs/{pid}/failed", api_agent_failed)
    up = ROOT / "data" / "uploads"
    up.mkdir(parents=True, exist_ok=True)
    app.router.add_static("/api/upload/", up)
    app.router.add_static("/", ROOT / "web", show_index=False)
    app.on_startup.append(on_start)
    app.on_cleanup.append(on_stop)
    print(f"[抽卡系统] 载入 {n} 个能力，{len(CARDS)} 张卡")
    print(f"[抽卡系统] 执行模式：{EXECUTION_MODE}")
    if CONTROLLER_MODE and not ENROLLMENT_TOKEN:
        print("[抽卡系统] 警告：未配置 CHOUKA_ENROLLMENT_TOKEN，Worker 注册已禁用")
    print(f"[抽卡系统] 本机   http://127.0.0.1:{PORT}")
    for ip in lan_ips():
        print(f"[抽卡系统] 局域网 http://{ip}:{PORT}   ← 手机/别的电脑用这个")
    print("[抽卡系统] 局域网是敞开的：没有登录，进来的人就能跑任务、删画布、看产物。"
          "只在信得过的网里开")
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

    web.run_app(make_app(), host="0.0.0.0", port=PORT, print=None)
