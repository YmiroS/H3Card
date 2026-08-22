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
import os
import json
import mimetypes
import random
import time
import uuid
from pathlib import Path
from urllib.parse import urlencode

import aiohttp
from aiohttp import web

ROOT = Path(__file__).resolve().parent.parent          # chouka/
COMFY_HTTP = "http://127.0.0.1:8188"
COMFY_WS = "ws://127.0.0.1:8188/ws"
PORT = 8199

CLIENT_ID = uuid.uuid4().hex
JOBS = {}                  # prompt_id -> job dict
CAPS = {}                  # capability id -> manifest
CARDS = []
STATE = {"comfy_online": False}
DEBUG = bool(os.environ.get("CHOUKA_DEBUG"))

IMG_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}
VID_EXT = {".mp4", ".webm", ".mkv", ".mov", ".avi"}
AUD_EXT = {".mp3", ".wav", ".flac", ".ogg", ".m4a"}


# =====================================================================
# 能力清单
# =====================================================================
def load_caps():
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
    # 只保留有可用工作流的模式
    for c in CARDS:
        c["modes"] = [md for md in c["modes"]
                      if CAPS.get(md["id"], {}).get("_graph_ok")]
    return len(CAPS)


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


def patch_graph(cap, params, uploaded):
    """按 manifest 把用户参数写进 API 工作流模板"""
    g = copy.deepcopy(json.loads((ROOT / cap["graph"]).read_text(encoding="utf-8")))
    missing = []
    for spec in cap["inputs"]:
        key, tgt = spec["key"], spec["target"]
        node, field = str(tgt["node"]), tgt["input"]
        if node not in g:
            raise web.HTTPBadRequest(reason=f"工作流里没有节点 {node}（能力 {cap['id']} 需重新扫描）")
        if spec["type"] in ("image", "audio"):
            val = uploaded.get(key)
            if not val:
                if spec.get("required"):
                    missing.append(spec["label"])
                continue                       # 未填的可选素材：保留模板里的默认值
        elif spec["type"] == "seed":
            val = params.get("seed")
            if val in (None, "", -1, "-1"):
                val = params.setdefault("_seed_used", random.randint(0, 2 ** 53))
            val = int(val)
        else:
            if key not in params or params[key] in (None, ""):
                continue                       # 用默认值
            val = params[key]
            if spec["type"] in ("slider", "number"):
                val = float(val) if tgt.get("vtype") == "FLOAT" else int(float(val))
        g[node]["inputs"][field] = val
    if missing:
        raise web.HTTPBadRequest(reason="必填素材未提供：" + "、".join(missing))
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


async def handle_event(session, ev):
    t, d = ev.get("type"), ev.get("data") or {}
    if DEBUG:
        print(f"[ev] {t} {json.dumps(d, ensure_ascii=False)[:220]}", flush=True)
    pid = d.get("prompt_id")
    job = JOBS.get(pid) if pid else None

    if t == "execution_start" and job:
        job.update(status="running", started=time.time())
    elif t == "executing" and job:
        if d.get("node") is None:
            job["outputs"] = await collect_outputs(session, pid)
            job.update(status="done", progress=1.0, ended=time.time())
        else:
            job["node"] = d.get("display_node") or d["node"]
    elif t == "progress" and job:
        mx = d.get("max") or 1
        job["progress"] = round(d.get("value", 0) / mx, 4)
        job["status"] = "running"
    elif t == "progress_state" and job:
        nodes = (d.get("nodes") or {}).values()
        run = [n for n in nodes if n.get("state") == "running"]
        if run:
            n = run[0]
            mx = n.get("max") or 1
            job["progress"] = round(n.get("value", 0) / mx, 4)
            job["status"] = "running"
    elif t == "execution_error" and job:
        job.update(status="error", ended=time.time(),
                   error=f"#{d.get('node_id')} {d.get('node_type')}: {d.get('exception_message')}")
    elif t == "execution_cached" and job:
        job["cached"] = d.get("nodes", [])
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
        "comfy_online": STATE["comfy_online"],
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
        ref = await comfy_upload(session, part.name, safe, raw)
        saved.append({"ref": ref, "kind": kind_of(safe), "origin": name,
                      "url": f"/api/upload/{safe}"})
    if not saved:
        raise web.HTTPBadRequest(reason="没有收到文件")
    return web.json_response({"files": saved})


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
        return web.json_response({"dry_run": True, "changed": diff})
    pid = await comfy_submit(request.app["session"], graph)
    JOBS[pid] = {"id": pid, "capability": cid, "name": cap["name"],
                 "outputType": cap["outputType"], "status": "queued",
                 "progress": 0.0, "created": time.time(),
                 "seed": params.get("_seed_used", params.get("seed")),
                 "outputs": [], "error": None}
    return web.json_response(JOBS[pid])


async def api_job(request):
    pid = request.match_info["pid"]
    job = JOBS.get(pid)
    if not job:
        raise web.HTTPNotFound(reason="没有这个任务")
    return web.json_response(job)


async def api_jobs(request):
    return web.json_response({"jobs": sorted(JOBS.values(),
                                             key=lambda j: j["created"], reverse=True)[:60]})


async def api_cancel(request):
    pid = request.match_info["pid"]
    session = request.app["session"]
    job = JOBS.get(pid)
    if job and job["status"] == "running":
        async with session.post(COMFY_HTTP + "/interrupt") as r:
            await r.read()
    else:
        async with session.post(COMFY_HTTP + "/queue",
                                json={"delete": [pid]}) as r:
            await r.read()
    if job:
        job["status"] = "canceled"
    return web.json_response({"ok": True})


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
                        "cards": len(d.get("cards", []))})
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
    body = await request.json()
    for k in ("name", "cards", "edges", "view"):
        if k in body:
            old[k] = body[k]
    old["updated"] = time.time()
    p.write_text(json.dumps(old, ensure_ascii=False), encoding="utf-8")
    return web.json_response({"ok": True, "updated": old["updated"]})


async def api_project_delete(request):
    p = proj_path(request.match_info["pid"])
    if p.exists():
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


async def index(request):
    return web.FileResponse(ROOT / "web" / "index.html")


async def api_health(request):
    return web.json_response({
        "ok": True, "comfy_online": STATE["comfy_online"],
        "capabilities": len(CAPS), "jobs": len(JOBS), "client_id": CLIENT_ID,
    })


# =====================================================================
async def on_start(app):
    app["session"] = aiohttp.ClientSession(
        timeout=aiohttp.ClientTimeout(total=None, sock_connect=10))
    app["ws_task"] = asyncio.create_task(ws_loop(app))


async def on_stop(app):
    app["ws_task"].cancel()
    await app["session"].close()


def make_app():
    n = load_caps()
    app = web.Application(client_max_size=512 * 1024 ** 2)
    app.router.add_get("/", index)
    app.router.add_get("/api/health", api_health)
    app.router.add_get("/api/cards", api_cards)
    app.router.add_post("/api/reload", api_reload)
    app.router.add_post("/api/upload", api_upload)
    app.router.add_post("/api/generate", api_generate)
    app.router.add_get("/api/jobs", api_jobs)
    app.router.add_get("/api/job/{pid}", api_job)
    app.router.add_post("/api/job/{pid}/cancel", api_cancel)
    app.router.add_get("/api/projects", api_projects)
    app.router.add_post("/api/projects", api_project_create)
    app.router.add_get("/api/projects/{pid}", api_project_get)
    app.router.add_put("/api/projects/{pid}", api_project_save)
    app.router.add_delete("/api/projects/{pid}", api_project_delete)
    app.router.add_get("/api/file", api_file)
    up = ROOT / "data" / "uploads"
    up.mkdir(parents=True, exist_ok=True)
    app.router.add_static("/api/upload/", up)
    app.router.add_static("/", ROOT / "web", show_index=False)
    app.on_startup.append(on_start)
    app.on_cleanup.append(on_stop)
    print(f"[抽卡系统] 载入 {n} 个能力，{len(CARDS)} 张卡")
    print(f"[抽卡系统] http://127.0.0.1:{PORT}")
    return app


if __name__ == "__main__":
    try:
        import sys
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    web.run_app(make_app(), host="0.0.0.0", port=PORT, print=None)
