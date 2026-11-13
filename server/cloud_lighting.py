"""Cloud relighting jobs, separate from ComfyUI scheduling and cancellation."""
import asyncio
import hashlib
import json
import math
import os
import re
import time
import uuid

import aiohttp
from aiohttp import web

from . import cloud_banana
from . import cloud_images, local_relight, provider_billing
from distributed import generation_worker_reason, worker_access_allowed


SEG_CAPABILITY = "seg_persons"


def perception_block(app, graph, *, capability=SEG_CAPABILITY, team_ids=None):
    """识别作业派发前的集群预检：返回一句人话原因，None 表示有合格执行端。

    必须查在提交期：自动派发对不合格节点是静默 continue（distributed 的领取循环），
    不查的话前端只剩转圈、作业里连失败原因都写不出来（Spec §5.4）。
    单机自环（开发机直连一台 ComfyUI）没有名册可查，返回 None 放行给提交期的报错。
    """
    store = app.get("distributed")
    if store is None:
        return None
    workers = store.list_generation_workers()
    if team_ids is not None:
        workers = [worker for worker in workers if worker_access_allowed(worker, team_ids)]
    if not workers:
        return "当前团队没有可见的执行端，请先在管理端登记并启用 Windows 执行端"
    reasons = set()
    for worker in workers:
        if worker.get("state") in ("idle", "busy") and not isinstance(worker.get("capabilities"), dict):
            reasons.add("执行端还没上报能力清单")
            continue
        reason = generation_worker_reason(worker, graph, capability)
        if reason is None:
            return None
        reasons.add(reason)
    return "没有合格的执行端：" + "；".join(sorted(reasons))


def lighting_size(info, megapixels):
    if (isinstance(megapixels, bool) or not isinstance(megapixels, (int, float))
            or not math.isfinite(megapixels) or not 0.25 <= megapixels <= 16):
        raise web.HTTPBadRequest(text="多灯处理像素必须为 0.25–16 MP 之间的数值")
    pixels = megapixels * 1024 * 1024
    scale = math.sqrt(pixels / (info["width"] * info["height"]))
    width = max(16, math.floor(info["width"] * scale / 16) * 16)
    height = max(16, math.floor(info["height"] * scale / 16) * 16)
    # A minimum 16px short edge can exceed the budget for extreme aspect ratios.
    if width * height > pixels:
        if width >= height:
            width = math.floor(pixels / height / 16) * 16
        else:
            height = math.floor(pixels / width / 16) * 16
    return f"{width}x{height}"


# 云端编辑对单次请求同时卡总像素（65.5万–829万）和长宽比（≤3:1）。
HEAD_MIN_PIXELS = 655_360
HEAD_MAX_PIXELS = 8_294_400
HEAD_MAX_RATIO = 3.0
# 送图尺寸还要取 16 的倍数，留一档余量免得量化后又顶回 3:1 之外。
HEAD_SAFE_RATIO = 2.7


def head_crop_size(cw, ch, long_side=768):
    """头肩特写的送图尺寸：只等比缩放（不拉伸、不单独拉长某一边凑像素），落进网关像素窗口。"""
    scale = long_side / max(1, max(cw, ch))
    pixels = cw * ch * scale * scale
    if pixels < HEAD_MIN_PIXELS:
        scale = math.sqrt(HEAD_MIN_PIXELS / max(1, cw * ch))
    elif pixels > HEAD_MAX_PIXELS:
        scale = math.sqrt(HEAD_MAX_PIXELS / max(1, cw * ch))
    tw = th = 16
    for _ in range(16):
        tw = max(16, round(cw * scale / 16) * 16)
        th = max(16, round(ch * scale / 16) * 16)
        pixels = tw * th
        if HEAD_MIN_PIXELS <= pixels <= HEAD_MAX_PIXELS:
            return tw, th
        scale *= 1.02 if pixels < HEAD_MIN_PIXELS else 0.98
    return tw, th


def head_box_safe(person_box, width, height, max_ratio=HEAD_SAFE_RATIO):
    """头肩切片的长宽比必须落在网关 3:1 窗口内。

    太扁就往放高、放不下再左右收窄；太高窄就先左右放宽（不越出画面）、放不下只留上部更矮的切片。
    """
    x0, y0, x1, y1 = person_box
    box = local_relight.head_box(person_box)
    if x1 <= x0 or y1 <= y0 or width <= 0 or height <= 0:
        return box
    left, top = x0 * width, y0 * height
    right, bottom = x1 * width, box[3] * height
    if right - left > max_ratio * (bottom - top):
        bottom = top + min((right - left) / max_ratio, y1 * height - top)
        center = (left + right) / 2
        half = min((bottom - top) * max_ratio / 2, (right - left) / 2)
        left, right = max(0.0, center - half), min(float(width), center + half)
    elif bottom - top > max_ratio * (right - left):
        center = (left + right) / 2
        half = (bottom - top) / max_ratio / 2
        widened = (min(float(width), center + half) - max(0.0, center - half))
        left, right = max(0.0, center - half), min(float(width), center + half)
        if widened < (bottom - top) / max_ratio:
            bottom = top + (right - left) * max_ratio
    return [left / width, top / height, right / width, bottom / height]


def _valid_subject_point(value):
    """点选对象回放的点击位置必须是 0–1 的两个有限数。"""
    return (isinstance(value, (list, tuple)) and len(value) == 2
            and all(isinstance(v, (int, float)) and math.isfinite(v) and 0 <= v <= 1
                    for v in value))


def _valid_mask_index(value):
    """身份在索引层里的位号：1–255 的整数（0 固定是背景，bool 不算数字）。"""
    return (isinstance(value, int) and not isinstance(value, bool)
            and 1 <= value <= 255)


def _manual_selection(local_manual, local_subjects):
    """校验 params.local_manual，返回 (位图素材引用, 参与出图的身份 id)。

    ids 是出图范围的唯一口径：勾了但没带位图编号的身份一律报错，
    绝不静默少画一个人（和前端 slice(0,12) 静默丢弃是同一个毛病）。
    """
    layer = local_manual.get("layer")
    if not isinstance(layer, str) or not layer.strip():
        raise web.HTTPBadRequest(text="手工分割位图缺失，请在编辑器里保存后再出图")
    ids = local_manual.get("ids")
    if (not isinstance(ids, list) or not ids or len(ids) > 12
            or not all(isinstance(sid, str) for sid in ids)):
        raise web.HTTPBadRequest(text="手工分割的身份列表无效，请重新保存后再出图")
    indexed = {subject.get("id"): subject for subject in local_subjects
               if isinstance(subject, dict)}
    missing = [sid for sid in ids if not _valid_mask_index(
        (indexed.get(sid) or {}).get("mask_index"))]
    if missing:
        raise web.HTTPBadRequest(
            text=f"手工身份 {'、'.join(missing[:3])} 没有对应的位图编号，请重新保存后再出图")
    return layer, list(ids)


def _fuse_tint_amount(value):
    """色调回拉比例：0–1 之间取数，缺省用面板默认值；关掉（false）按 0 处理。"""
    if value is False:
        return 0.0
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return local_relight.TINT["amount"]
    if not math.isfinite(value):
        return local_relight.TINT["amount"]
    return max(0.0, min(1.0, float(value)))


def _tuned(value, low, high, default):
    """面板上的可调档：非数字或 NaN 退回内置值，其余夹进允许范围。"""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return float(default)
    if not math.isfinite(value):
        return float(default)
    return max(low, min(high, float(value)))


def dump_intermediate(job, image, name):
    """另存一份云端返回的原图，供离线扫档复用（同一张云端图，差异只来自档位）。

    只在 CHOUKA_LOCAL_RELIT_DUMP 指向已存在目录时写，目录写错不会赔掉已计费的出图。
    """
    folder = os.environ.get("CHOUKA_LOCAL_RELIT_DUMP")
    if not folder or not os.path.isdir(folder):
        return
    image.save(os.path.join(folder, f"{name}-{job['id']}.png"))


# ---- 远端分区识别的送图尺寸与身份层缓存 ----
# 大模型只出一张「每人一纯色」的分区图，反解成身份索引层之后可以复用：
# 同图、同提示词、同聚类数、同层尺寸才算同一份分区，换一项就重新出图。
PARTITION_SEND_MEGAPIXELS = 1_200_000 / (1024 * 1024)
PARTITION_CACHE_DIR = "partition_cache"


def partition_send_size(info):
    """
    分区请求的送图尺寸：直接套 `lighting_size`，别在这儿再抄一份网关口径。

    云端编辑同时卡三件事——宽高必须是 16 的倍数、总像素有上下限、极端长宽比还会另算。
    自己写一套取整漏掉「量化后仍超预算」那一步，退化尺寸就会把 400 元一次的请求
    送到网关吃 400，而且这种失败发生在计费之前，用户只看到「识别失败」。
    """
    return lighting_size(info, PARTITION_SEND_MEGAPIXELS)


def partition_layer_size(info):
    """身份层尺寸：长边压到蒙版预览同一档（PREVIEW_SIDE），缓存和给前端的蒙版才不会分叉。"""
    scale = min(1.0, local_relight.PREVIEW_SIDE / max(1, info["width"], info["height"]))
    return (max(1, int(info["width"] * scale)), max(1, int(info["height"] * scale)))


class CloudLighting:
    def __init__(self, app, *, root, comfy_http, jobs, save_jobs, require_project,
                 require_resource, require_user, resource_call, call_store):
        self.app = app
        self.root = root
        self.comfy_http = comfy_http
        self.jobs = jobs
        self.save_jobs = save_jobs
        self.require_project = require_project
        self.require_resource = require_resource
        self.require_user = require_user
        self.resource_call = resource_call
        self.call_store = call_store
        self.tasks = {}
        self.subject_jobs = {}
        if os.environ.get("CHOUKA_REHEARSAL") == "1":
            print("[抽卡系统] 局部打光演练模式：云端重打光用本地模拟，产物带 REHEARSAL 角标")

    async def record_cost(self, job, params=None, assets=None):
        ledger = self.app.get("costs")
        if ledger:
            await asyncio.to_thread(ledger.record_image_api, job, model=job.get("modelName"),
                                    params=params, assets=assets)

    async def capture_metadata(self, job, metadata):
        for key in ("request_id", "provider_billing", "usage", "model_source"):
            if key in metadata:
                job[key] = metadata[key]
        if metadata.get("model") is not None:
            job["modelName"] = metadata["model"]
        try:
            self.save_jobs()
        finally:
            # 任务快照写入失败也不能阻止独立账本接收已扣费证据。
            await self.record_cost(job)

    async def bind_cost_user(self, job, user_id):
        job.update(user_id=user_id, submitter_id=user_id)
        ledger = self.app.get("costs")
        if ledger:
            await asyncio.to_thread(ledger.bind_attribution, job["id"], user_id)

    async def source(self, request, project_id, value):
        ref = await self.resource_call(self.app, "reference", value)
        if not ref:
            raise web.HTTPBadRequest(text="云端生图只接受画布内已登记的图片")
        await self.require_resource(request, *ref, project_id=project_id)
        path = await self.resource_call(self.app, "local_path", *ref)
        if ref[0] == "comfy" and not path.is_file():
            async with self.app["session"].get(
                    self.comfy_http + "/view", params=json.loads(ref[1]), allow_redirects=False,
                    timeout=aiohttp.ClientTimeout(total=60, connect=10)) as response:
                if response.status != 200:
                    raise web.HTTPNotFound(text="上游图片已不可用")
                data = await cloud_images.read_limited(response, cloud_images.MAX_IMAGE_BYTES)
        else:
            def read():
                with path.open("rb") as source:
                    return source.read(cloud_images.MAX_IMAGE_BYTES + 1)
            try:
                data = await asyncio.to_thread(read)
            except FileNotFoundError:
                raise web.HTTPNotFound(text="上游图片已不可用")
        info = await asyncio.to_thread(cloud_images.inspect_image, data)
        await self.require_resource(request, *ref, project_id=project_id)
        return data, ref, info

    async def snapshot_input(self, project_id, ref, data, info, *, copy_upload=False):
        """把非上传来源或预处理图片复制成任务输入；原始上传可直接沿用。"""
        if ref[0] == "upload" and not copy_upload:
            return "chouka/" + ref[1]
        parent = await self.resource_call(self.app, "lookup", *ref)
        name = f"lighting_input_{uuid.uuid4().hex}{info['extension']}"
        path = self.root / "data" / "uploads" / name
        await asyncio.to_thread(path.parent.mkdir, parents=True, exist_ok=True)
        await asyncio.to_thread(path.write_bytes, data)
        try:
            await self.resource_call(self.app, "register", project_id, "upload", name,
                                     parent_id=parent["resource_id"], external=True)
        except BaseException:
            path.unlink(missing_ok=True)
            raise
        return "chouka/" + name

    SUBJECT_STEPS = ("排队", "读取原图", "模型推理", "聚合蒙版")

    def _subjects_plan(self, body):
        """校验识别请求，返回 (project_id, image, mode, min_area, box, point, target_kind)。

        mode=local|remote|manual；target_kind=person|object 是编辑器里用户对目标类型的选择，
        类型和识别方式正交：本地两路都认；大模型分区本轮只分人，物体框选直接拒并说明原因。
        """
        project_id, image = body.get("project"), body.get("image")
        if not isinstance(image, str) or not image.strip():
            raise web.HTTPBadRequest(text="识别对象需要一张画布内已登记的图片")
        if not local_relight.in_process_ready():
            raise web.HTTPNotImplemented(
                text="局部打光识别还没接入：服务端缺少纯计算依赖（OpenCV/NumPy）")
        mode = body.get("mode", "local")
        if mode not in ("local", "remote", "manual"):
            raise web.HTTPBadRequest(text="识别方式只支持 local、remote 或 manual")
        # 远端分区只用索引层投票（纯 numpy），不再拿「服务机有没有分割权重」当前置：
        # 那条老判据会把云端路一起拦死（Spec §5.3 / 风险 R1）。
        target_kind = body.get("target_kind")
        if target_kind not in (None, "person", "object"):
            raise web.HTTPBadRequest(text="目标类型只支持 person 或 object")
        box = body.get("box")
        if box is not None:
            if (not isinstance(box, (list, tuple)) or len(box) != 4
                    or not all(isinstance(v, (int, float)) and math.isfinite(v) and 0 <= v <= 1
                               for v in box)
                    or box[2] <= box[0] or box[3] <= box[1]):
                raise web.HTTPBadRequest(text="补选框必须是 0–1 之间的有效矩形")
            box = [float(v) for v in box]
        if mode == "manual" and box is None:
            raise web.HTTPBadRequest(text="手工通道要先框住目标：请在编辑器里框出区域后再提交")
        if mode == "remote" and box is not None and target_kind == "object":
            # 分区提示词只按人分色（§6：本轮不扩调色板），层里根本没有物体身份，
            # 硬投票只会把框里的人当成物体还回来，不如直接说清楚。
            raise web.HTTPBadRequest(
                text="远端分区图只圈人物，认物体请切回本地模型识别")
        point = body.get("point")
        if point is not None:
            if mode == "remote":
                raise web.HTTPBadRequest(
                    text="远端分区只按区域出身份，点选请用本地模型识别")
            if (not isinstance(point, (list, tuple)) or len(point) != 2
                    or not all(isinstance(v, (int, float)) and math.isfinite(v) and 0 <= v <= 1
                               for v in point)):
                raise web.HTTPBadRequest(text="点选位置必须是 0–1 之间的坐标")
            point = [float(v) for v in point]
        sensitivity = body.get("sensitivity")
        min_area = local_relight.SENSITIVITY_MIN_AREA.get(
            sensitivity, local_relight.MIN_PERSON_AREA_RATIO)
        return project_id, image, mode, min_area, box, point, target_kind

    def _subjects_candidates(self, data, mode, min_area, box, point, user, target_kind=None):
        """按识别方式出候选：local 走分割模型；remote 走大模型颜色分区（演练模式用本地结果模拟）。"""
        picture = local_relight.load_rgb(data)
        if mode in ("local", "manual"):
            if point is not None:
                seg = local_relight.segment_point(picture, point)
                kind = target_kind or "person"
                return [{"id": "c0", "kind": kind, "label": "点选人物" if kind == "person" else "点选物体",
                         "mode": "point", "point": point, "box": seg["box"],
                         "coverage": seg["coverage"],
                         "mask": local_relight.mask_to_data_url(seg["mask"])}], "yolo" if local_relight.yolo_available() else "rembg"
            if box is not None:
                seg = local_relight.segment_box(picture, box)
                # 手工通道（K6）拿粗分割当编辑器底稿；类型跟用户在编辑器里的选择走，不再写死人物。
                kind = target_kind or ("person" if mode == "manual" else "object")
                return [{"id": "m0", "kind": kind, "label": "框选人物" if kind == "person" else "框选物体",
                         "mode": "box", "box": seg["box"], "coverage": seg["coverage"],
                         "mask": local_relight.mask_to_data_url(seg["mask"])}], "yolo" if local_relight.yolo_available() else "rembg"
            people = local_relight.segment_auto(picture, min_area_ratio=min_area)
            return [{"id": f"p{index}", "kind": "person", "label": f"人物 {index}",
                     "box": person["box"], "coverage": person["coverage"],
                     "mask": local_relight.mask_to_data_url(person["mask"])}
                    for index, person in enumerate(people, 1)], "yolo" if local_relight.yolo_available() else "rembg"
        # remote 演练模式不调云端，用本地结果走一遍步骤；真实远端走 _subjects_remote（async）。
        people = local_relight.segment_auto(picture, min_area_ratio=min_area)
        return [{"id": f"p{index}", "kind": "person", "label": f"人物 {index}",
                 "box": person["box"], "coverage": person["coverage"],
                 "mask": local_relight.mask_to_data_url(person["mask"])}
                for index, person in enumerate(people, 1)], "rehearsal"

    def _remote_real(self, plan):
        return plan[2] == "remote" and os.environ.get("CHOUKA_REHEARSAL") != "1"

    def _partition_key(self, project_id, ref, data, size):
        """缓存键：项目 + 图片来源 + 图片内容 + 提示词 + 聚类数 + 层尺寸，一项不同就不算同一份分区。"""
        parts = [
            project_id,
            hashlib.sha256(f"{ref[0]}|{ref[1]}".encode("utf-8")).hexdigest()[:12],
            hashlib.sha256(data).hexdigest()[:16],
            "p" + hashlib.sha256(local_relight.PARTITION_PROMPT.encode("utf-8")).hexdigest()[:8],
            f"k{local_relight.PARTITION_K}",
            f"{size[0]}x{size[1]}",
        ]
        return "-".join(re.sub(r"[^0-9A-Za-z._-]", "_", str(part))[:48] for part in parts)

    def _partition_read(self, key):
        """读身份层缓存 → (记录, 是否完好)。读不出来就删条目并回报坏了，绝不拿半截分区当结果。"""
        folder = self.root / "data" / PARTITION_CACHE_DIR
        meta_path, png_path = folder / f"{key}.json", folder / f"{key}.png"
        if not (meta_path.is_file() and png_path.is_file()):
            return None, True
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            size = (int(meta["size"][0]), int(meta["size"][1]))
            layer = local_relight.decode_identity_layer(png_path.read_bytes(), size)
            entries = [entry for entry in meta["entries"] if int(entry["index"]) > 0]
            if not entries or int(entries[-1]["index"]) > int(layer.max()):
                raise ValueError("分区缓存与身份层对不上")
            return {"layer": layer, "entries": entries}, True
        except Exception:
            for path in (meta_path, png_path):
                path.unlink(missing_ok=True)
            return None, False

    def _partition_write(self, key, layer, entries, size):
        folder = self.root / "data" / PARTITION_CACHE_DIR
        folder.mkdir(parents=True, exist_ok=True)
        payloads = (
            (".json", json.dumps({"size": list(size), "entries": entries, "created": time.time()},
                                 ensure_ascii=False).encode("utf-8")),
            (".png", local_relight.encode_identity_layer(layer)),
        )
        for suffix, payload in payloads:
            path = folder / f"{key}{suffix}"
            temporary = path.with_suffix(path.suffix + ".part")
            temporary.write_bytes(payload)
            os.replace(temporary, path)

    async def _partition_fetch(self, data, send_size, size, user):
        """花 1 次云端出图换一张分区图并反解成身份层；一个人都没分出来算失败。"""
        result = await cloud_images.edit(
            self.app["session"], [data], local_relight.PARTITION_PROMPT,
            size=send_size, quality="medium",
            end_user_name=user["username"], end_user_phone=user.get("phone", ""))
        if "image_bytes" not in result:
            raise cloud_images.ImageEditError(
                "云端已返回分区图链接，但未自动下载。请联系管理员确认，不要重复提交。",
                request_id=result.get("request_id"))
        from io import BytesIO
        from PIL import Image
        partition = Image.open(BytesIO(result["image_bytes"])).convert("RGB")
        record = await asyncio.to_thread(
            local_relight.partition_index_layer, partition, target_size=size,
            min_area_ratio=local_relight.MIN_PERSON_AREA_RATIO)
        if not record["entries"]:
            raise cloud_images.ImageEditError(
                "大模型没有分出人物色块，换一张图或改用本地模型识别。",
                request_id=result.get("request_id"))
        return record["layer"], record["entries"]

    async def _partition_layer(self, project_id, ref, data, user):
        """这张图的身份索引层：命中缓存免费复用，未命中（或缓存已失效）才出一次分区图。

        返回 (层, 条目, 来源)，来源 cached/fresh/renewed 决定按钮文案——
        renewed 表示「命中过但分区已失效」，这次仍然花了 1 次出图，不能说成免费。
        """
        info = cloud_images.inspect_image(data)
        size = partition_layer_size(info)
        key = self._partition_key(project_id, ref, data, size)
        record, intact = await asyncio.to_thread(self._partition_read, key)
        if record:
            return record["layer"], record["entries"], "cached"
        layer, entries = await self._partition_fetch(data, partition_send_size(info), size, user)
        await asyncio.to_thread(self._partition_write, key, layer, entries, size)
        return layer, entries, ("renewed" if not intact else "fresh")

    def _layer_candidates(self, layer, entries):
        """身份层 → 逐人候选：号就是候选号，同一张图两次识别拿到的编号不会变。"""
        return [{"id": f"p{entry['index']}", "kind": "person", "label": f"人物 {entry['index']}",
                 "box": entry["box"], "coverage": entry["coverage"],
                 "mask": local_relight.mask_to_data_url(mask)}
                for entry, mask in local_relight.layer_to_candidates(layer, entries)]

    async def _subjects_remote(self, plan, ref, data, user):
        """远端识别：整图按身份层出候选，带框只在层里做框内投票。返回 (候选, 引擎, 分区来源, 说明)。"""
        layer, entries, freshness = await self._partition_layer(plan[0], ref, data, user)
        # 命中过但读不出来的分区不回退旧结果，直接重出并在说明里写清这次仍然计了 1 次。
        note = ("之前的分区结果已失效，本次重新出了分区图（1 次）。" if freshness == "renewed" else None)
        if plan[4] is None:
            candidates = await asyncio.to_thread(self._layer_candidates, layer, entries)
            return candidates, "cloud", freshness, note
        vote = await asyncio.to_thread(local_relight.region_index_vote, layer, plan[4])
        if vote["status"] != "ok":
            return [], "cloud", freshness, vote["message"]
        return [{"id": f"p{vote['index']}", "kind": "person",
                 "label": f"人物 {vote['index']}", "box": vote["box"],
                 "coverage": vote["coverage"],
                 "mask": local_relight.mask_to_data_url(vote["mask"])}], "cloud", freshness, note

    async def _preflight_segmentation(self, plan, user):
        """跑分割那几路（local / manual / 点选 / 框选）落地前的可用性预检，缺就当场说清楚。

        集群模式查节点名册（perception_block），单机自环查服务机能不能自己跑老路；
        远端分区只用投票，不在这条判据里（Spec §5.3/§5.4）。
        """
        if plan[2] == "remote":
            return
        store = self.app.get("distributed")
        if store is None:
            if self._node_segment_on(plan):
                return  # 自环走节点：服务机有没有权重不算前置，连不上 ComfyUI 由提交期那条 503 说清楚
            if not local_relight.legacy_segmentation_ready():
                raise web.HTTPNotImplemented(
                    text="本机识别还没接入：服务机既没有实例分割权重，也没有 rembg 兜底；"
                         "要么预置权重，要么把执行模式切到走节点")
            return
        graph = self._capability_graph(SEG_CAPABILITY)
        team_ids = await self.call_store(self.app, "user_worker_teams", user["id"])
        reason = await asyncio.to_thread(perception_block, self.app, graph, team_ids=team_ids)
        if reason:
            raise web.HTTPNotImplemented(text=reason)

    def _capability_graph(self, capability):
        """按能力 id 取 API 图（提交期预检要用它推节点类清单）。"""
        caps = self.app.get("caps") or {}
        cap = caps.get(capability)
        if not cap:
            raise web.HTTPNotImplemented(
                text=f"识别能力「{capability}」还没登记：服务端缺少对应的能力清单与工作流图")
        graph_path = self.root / cap["graph"]
        if not graph_path.is_file():
            raise web.HTTPNotImplemented(
                text=f"识别能力「{capability}」缺少工作流图文件 {cap['graph']}")
        return json.loads(graph_path.read_text(encoding="utf-8"))

    SEG_TIMEOUT_SECONDS = 180.0
    SEG_POLL_SECONDS = 0.4

    def _node_segment_on(self, plan):
        """整图自动识别是否交节点跑（M2）。点选 / 框选这一轮仍留服务机内实现（M2-10 待接）。

        默认关：`CHOUKA_SEG_VIA_NODE=1` 才翻。理由不是没实现，而是**集群侧的派发口径还没拍**
        （Spec R13 / M2-8b：作业要不要进任务面板、怎么取消、计费台账归谁）。
        翻档前请先在 §7 台账留下一次真机证据，别拿本机自环当生产绿。
        """
        if plan[2] != "local" or plan[4] is not None or plan[5] is not None:
            return False
        return os.environ.get("CHOUKA_SEG_VIA_NODE") == "1"

    def _comfy_node(self):
        """服务端把识别交给 ComfyUI 的四个动作（上传 / 按 manifest 拼图 / 提交 / 取产物）。

        由 app 启动时挂上来，和「提示词改写用本地 27B」那条 `rewrite_local` 同一套通道；
        不在这里另造客户端，避免两份提交语义（锁、显存门禁、错误翻成人话）走偏。
        """
        backend = self.app.get("comfy_node")
        if not isinstance(backend, dict):
            raise web.HTTPNotImplemented(
                text="识别还没接节点执行通道：服务端未挂载 ComfyUI 提交客户端")
        return backend

    async def _seg_artifacts(self, backend, pid):
        """等节点把这一步跑完 → 产物清单；执行失败或超时要说得出原因，不许静默空手回来。"""
        deadline = time.monotonic() + self.SEG_TIMEOUT_SECONDS
        while True:
            files = await backend["collect"](backend["session"], pid, wait_history=True)
            if files:
                return files
            if time.monotonic() >= deadline:
                break
            await asyncio.sleep(self.SEG_POLL_SECONDS)
        async with backend["session"].get(f'{backend["http"]}/history/{pid}') as response:
            entry = (await response.json()).get(pid) or {}
        status = entry.get("status") or {}
        if status.get("status_str") == "error":
            details = "; ".join(str(m[-1]) for m in (status.get("messages") or [])
                                if isinstance(m, list) and m)
            raise web.HTTPBadGateway(text=f"节点识别执行失败：{details or 'ComfyUI 未给出原因'}"[:400])
        raise web.HTTPGatewayTimeout(
            text=f"识别在节点上等了 {int(self.SEG_TIMEOUT_SECONDS)} 秒还没出结果，"
                 "请先看执行端队列是否被大作业占住（本次没有重复提交）")

    def _seg_pick(self, files):
        """从产物清单里挑出身份层与条目 JSON。

        `collect_outputs` 不带节点号，只带文件名，所以这里靠图里写死的 filename_prefix 认；
        换前缀要连同 graphs/seg_persons.api.json 一起改。
        """
        layer = next((item for item in files
                      if str(item.get("filename", "")).startswith("segidx_")), None)
        entries = next((item for item in files
                        if str(item.get("filename", "")).startswith("segentries_")), None)
        if layer is None or entries is None:
            raise web.HTTPBadGateway(
                text="节点识别没出齐产物：缺身份索引层或逐身份条目，请检查工作流 "
                     "graphs/seg_persons.api.json 的落盘节点")
        return layer, entries

    async def _seg_view(self, backend, item):
        """按产物名把节点写出的文件取回来（PNG 层 / JSON 条目走同一个通道）。"""
        params = {"filename": item["filename"], "subfolder": item.get("subfolder") or "",
                  "type": item.get("type") or "output"}
        async with backend["session"].get(f'{backend["http"]}/view', params=params) as response:
            if response.status != 200:
                raise web.HTTPBadGateway(
                    text=f"节点产物读不出来：{item['filename']} 返回 {response.status}")
            return await response.read()

    async def _subjects_node(self, plan, data, user):
        """整图自动识别交给节点：原图 → 身份索引层 + 逐身份条目 → 候选（口径同远端分区路）。

        层与原图尺寸差 1 像素就当场报错，不做拉伸（Spec §5.2）；候选直接吃
        `_layer_candidates`，所以编号、box、coverage 与大模型分区那条路完全可比。
        """
        backend = self._comfy_node()
        cap = (self.app.get("caps") or {}).get(SEG_CAPABILITY)
        if not cap:
            raise web.HTTPNotImplemented(
                text=f"识别能力「{SEG_CAPABILITY}」还没登记：服务端缺少对应的能力清单与工作流图")
        name = f"ck_{uuid.uuid4().hex[:12]}.png"
        uploaded = await backend["upload"](backend["session"], "image", name, data)
        graph = await asyncio.to_thread(backend["patch"], cap,
                                        {"min_area_ratio": plan[3]}, {"images[0]": uploaded})
        # 不自己编 prompt_id：ComfyUI 0.45 只收标准格式 UUID（带连字符、小写），
        # 而 comfy_submit 本来就把服务端生成的 id 回传，拿返回值轮询即可。
        pid = await backend["submit"](self.app, graph, capability=SEG_CAPABILITY)
        layer_item, entries_item = self._seg_pick(await self._seg_artifacts(backend, pid))
        layer_bytes = await self._seg_view(backend, layer_item)
        entries = json.loads((await self._seg_view(backend, entries_item)).decode("utf-8"))
        picture = local_relight.load_rgb(data)
        size = picture.size
        got = local_relight.layer_source_size(layer_bytes)
        if got != size:
            raise web.HTTPBadGateway(
                text=f"节点回传的身份层是 {got[0]}x{got[1]}，原图是 {size[0]}x{size[1]}；"
                     "尺寸对不上不做拉伸，请重新识别")
        layer = local_relight.decode_identity_layer(layer_bytes, size)
        candidates = await asyncio.to_thread(self._layer_candidates, layer, entries["entries"])
        dropped = int(entries.get("dropped") or 0)
        note = (f"有 {dropped} 个人超出 255 个身份上限，本次没编号" if dropped else None)
        return candidates, "node", note

    def _subjects_work(self, plan, data, user):
        return self._subjects_candidates(data, plan[2], plan[3], plan[4], plan[5], user,
                                         target_kind=plan[6])

    async def subjects(self, request, body):
        """识别局部打光候选：整图抠人，或按框抠一个物体。缺依赖或缺执行端回 501。"""
        plan = self._subjects_plan(body)
        user = self.require_user(request)
        await self._preflight_segmentation(plan, user)
        data, ref, _info = await self.source(request, plan[0], plan[1])
        if self._remote_real(plan):
            candidates, engine, partition, note = await self._subjects_remote(plan, ref, data, user)
        elif self._node_segment_on(plan):
            candidates, engine, note = await self._subjects_node(plan, data, user)
            partition = None
        else:
            candidates, engine = await asyncio.to_thread(self._subjects_work, plan, data, user)
            partition = note = None
        return web.json_response({"candidates": candidates, "engine": engine,
                                  "partition": partition, "note": note})

    def _subjects_signature(self, plan):
        """同图 + 同识别方式 + 同灵敏度 + 同框/同点 = 同一个识别请求：连点只留一个任务。"""
        return json.dumps([plan[0], plan[1], plan[2], plan[3], plan[4], plan[5]],
                          sort_keys=True, ensure_ascii=False)

    async def start_subjects_job(self, request, body):
        """异步识别：建 job 立即返回，步骤进度走 GET 状态端点（本地秒过、远端逐步可见）。"""
        plan = self._subjects_plan(body)
        user = self.require_user(request)
        await self._preflight_segmentation(plan, user)
        data, ref, _info = await self.source(request, plan[0], plan[1])
        now = time.time()
        for job_id, old in list(self.subject_jobs.items()):
            if now - old.get("created", now) > 3600:
                self.subject_jobs.pop(job_id, None)
        signature = self._subjects_signature(plan)
        for old in self.subject_jobs.values():
            # 防连点：同一个请求还在跑就复用任务号，不再排第二遍队（远端一次就是一笔计费）。
            if old.get("signature") == signature and old["status"] == "running":
                return web.json_response({"job_id": old["id"], "steps": list(self.SUBJECT_STEPS),
                                          "reused": True})
        job_id = uuid.uuid4().hex[:12]
        job = {"id": job_id, "project": plan[0], "mode": plan[2], "status": "running",
               "step": 0, "candidates": None, "engine": None, "error": None,
               "partition": None, "note": None, "signature": signature, "created": now}
        self.subject_jobs[job_id] = job
        task = asyncio.create_task(self._run_subjects_job(job, plan, ref, data, user))
        self.tasks[job_id] = task
        task.add_done_callback(lambda done: self.tasks.pop(job_id, None))
        return web.json_response({"job_id": job_id, "steps": list(self.SUBJECT_STEPS)})

    async def _run_subjects_job(self, job, plan, ref, data, user):
        try:
            await asyncio.sleep(0.12)  # 让步骤条有机会画出第一步
            job["step"] = 1  # 读取原图在创建 job 前已完成
            job["step"] = 2  # 模型推理
            if job["mode"] == "remote" and os.environ.get("CHOUKA_REHEARSAL") == "1":
                await asyncio.sleep(1.0)  # 演练模式模拟大模型推理耗时，步骤条可感知
            if self._remote_real(plan):
                candidates, engine, partition, note = await self._subjects_remote(plan, ref, data, user)
            elif self._node_segment_on(plan):
                candidates, engine, note = await self._subjects_node(plan, data, user)
                partition = None
            else:
                candidates, engine = await asyncio.to_thread(self._subjects_work, plan, data, user)
                partition = note = None
            job["step"] = 3
            job.update(status="done", candidates=candidates, engine=engine,
                       partition=partition, note=note)
        except cloud_images.ImageEditError as error:
            # 计费状态未知时不能让用户一键重试：重试等于再花一次，先联系管理员确认。
            job.update(status="failed", error=str(error), retryable=not error.generation_unknown,
                       generation_unknown=error.generation_unknown)
        except Exception:
            job.update(status="failed", error="识别失败，请重试或改用本地模型", retryable=True)
        finally:
            job["ended"] = time.time()

    def subjects_job(self, request):
        job_id = request.match_info["jid"]
        job = self.subject_jobs.get(job_id)
        if job is None:
            raise web.HTTPNotFound(text="识别任务不存在或已过期")
        return web.json_response({
            "status": job["status"], "step": job["step"],
            "steps": list(self.SUBJECT_STEPS), "mode": job["mode"],
            "engine": job["engine"], "error": job["error"],
            "candidates": job["candidates"], "partition": job.get("partition"),
            "note": job.get("note"), "retryable": job.get("retryable", True),
            "generation_unknown": bool(job.get("generation_unknown")),
        })

    async def submit(self, request, body, cap):
        params, assets = body.get("params") or {}, body.get("assets") or {}
        if (not isinstance(params, dict) or not isinstance(assets, dict)
                or set(assets) != {"images[0]"} or not isinstance(assets["images[0]"], str)):
            raise web.HTTPBadRequest(text="多灯打光需要且只接受一张输入图片")
        prompt = params.get("prompt")
        if not isinstance(prompt, str) or not 1 <= len(prompt.strip()) <= 20000:
            raise web.HTTPBadRequest(text="多灯布光提示词不能为空，且不得超过 20000 字符")
        reference_mode = params.get("reference_mode", "analyze")
        if reference_mode not in ("analyze", "direct", "local", "geometry"):
            raise web.HTTPBadRequest(
                text="参考图方式只支持 analyze、direct、local 或 geometry")
        reference_image = params.get("reference_image")
        if reference_mode == "direct" and (
                not isinstance(reference_image, str) or not reference_image.strip()):
            raise web.HTTPBadRequest(text="双图直传缺少参考图，请重新选择参考图后再试")
        geometry_png = params.get("geometry_png")
        if reference_mode == "geometry" and (
                not isinstance(geometry_png, str) or not geometry_png.strip()):
            raise web.HTTPBadRequest(text="3D 布光缺少白模截图，请先在工作台里确认应用后再出图")
        local_subjects = params.get("local_subjects") or []
        local_mask = params.get("local_mask")
        local_manual = params.get("local_manual")
        if reference_mode == "local":
            if not isinstance(local_subjects, list) or len(local_subjects) > 12:
                raise web.HTTPBadRequest(text="局部打光对象列表无效")
            for subject in local_subjects:
                if (not isinstance(subject, dict) or not isinstance(subject.get("id"), str)
                        or subject.get("kind") not in ("person", "object")
                        or not isinstance(subject.get("box"), (list, tuple))
                        or len(subject["box"]) != 4):
                    raise web.HTTPBadRequest(text="局部打光对象缺少有效的 ID、类型或包围盒")
                if subject.get("mode") not in (None, "point", "box"):
                    raise web.HTTPBadRequest(text="局部打光对象的选取方式无效，请重新点选或框选")
                if subject.get("mode") == "point" and not _valid_subject_point(subject.get("point")):
                    raise web.HTTPBadRequest(text="点选对象缺少有效的点击位置，请重新点选")
            if local_mask is not None and (not isinstance(local_mask, str) or not local_mask.strip()):
                raise web.HTTPBadRequest(text="局部打光蒙版地址无效")
            manual_layer = None
            manual_ids = []
            if local_manual is not None:
                # 两条通道语义重叠且互不相容：静默「谁优先」正是旧现状的病灶，这里直接报 400。
                if local_mask:
                    raise web.HTTPBadRequest(
                        text="上传蒙版与手工分割位图不能同时生效，请在面板里二选一")
                if not isinstance(local_manual, dict):
                    raise web.HTTPBadRequest(text="手工分割参数无效，请重新保存后再出图")
                manual_layer, manual_ids = _manual_selection(local_manual, local_subjects)
            if not local_mask and not manual_layer and not local_subjects:
                raise web.HTTPBadRequest(text="局部打光还没选对象，请先识别人物或手动补选后再出图")
            if params.get("local_strength", "standard") not in ("conservative", "standard", "strong"):
                raise web.HTTPBadRequest(text="局部打光强度档位无效")
            if params.get("local_edge", "soft") not in ("soft", "tight"):
                raise web.HTTPBadRequest(text="局部打光边缘过渡无效")
        provider = params.get("image_provider", "gpt_image")
        if provider not in ("gpt_image", "banana"):
            raise web.HTTPBadRequest(text="出图模型只支持 gpt_image 或 banana")
        project_id, card_id = body["project"], body.get("card")
        if card_id and not body.get("dry_run") and any(job.get("execution") == "cloud_image"
                           and job.get("project") == project_id and job.get("card") == card_id
                           and job.get("status") in {"queued", "running"}
                           for job in self.jobs.values()):
            raise web.HTTPConflict(text="当前卡片已有云端打光任务，请等待结果，不要重复提交")
        data, ref, info = await self.source(request, project_id, assets["images[0]"])
        reference = None
        if reference_mode == "direct":
            # 参考图按项目素材登记后通过同一套权限校验，不信任前端给的任意地址。
            reference = await self.source(request, project_id, reference_image)
        elif reference_mode == "geometry":
            # 图2 换成工作台导出的白模截图，取图和权限走同一套。
            reference = await self.source(request, project_id, geometry_png)
        megapixels = params.get("megapixels", 1.5)
        size = lighting_size(info, megapixels)
        if body.get("dry_run"):
            return {"dry_run": True, "execution": "cloud_image", "changed": {},
                    "prompt": prompt.strip(), "provider": provider,
                    "size": None if provider == "banana" else size}
        # 演练模式不调云端，提交也不需要云端出图配置。
        rehearsal_submit = os.environ.get("CHOUKA_REHEARSAL") == "1"
        config = ({"model": "rehearsal（演练）"} if rehearsal_submit
                  else cloud_banana.load() if provider == "banana"
                  else cloud_images.load())
        await self.require_project(request, project_id, operate=True)
        input_ref = await self.snapshot_input(project_id, ref, data, info)
        reference_ref = (await self.snapshot_input(project_id, reference[1], reference[0],
                                                   reference[2])) if reference else None
        local = None
        mask_ref = None
        mask_input_ref = None
        manual_ref = None
        manual_input_ref = None
        if reference_mode == "local":
            mask_data = None
            manual_data = None
            if local_mask:
                mask_data, mask_ref, mask_info = await self.source(request, project_id, local_mask)
                mask_input_ref = await self.snapshot_input(project_id, mask_ref, mask_data, mask_info)
            if manual_layer:
                # 手工位图和其它输入走同一套登记+授权，否则出图权限过不了。
                manual_data, manual_ref, manual_info = await self.source(
                    request, project_id, manual_layer)
                manual_input_ref = await self.snapshot_input(
                    project_id, manual_ref, manual_data, manual_info)
            # 局部打光只认自己的灯位。没灯位 = 沿用原图光，此时脚下压暗不挑方向；
            # 也不退回灯位打光页那套共享灯：借来的方位只会造出一个原图没有的坡向。
            local_lights = params.get("local_lights") or []
            if not isinstance(local_lights, list):
                local_lights = []
            key_azimuth = None
            candidates = [light for light in local_lights if isinstance(light, dict)]
            if candidates:
                key = max(candidates, key=lambda light: light.get("intensity", 0) or 0)
                if isinstance(key.get("azimuth"), (int, float)):
                    key_azimuth = float(key["azimuth"])
            local = {"subjects": local_subjects, "mask_data": mask_data,
                     "manual_layer": manual_data, "manual_ids": manual_ids,
                     "head_fill": params.get("local_head_fill", True) is not False,
                     "grounding": params.get("local_grounding", True) is not False,
                     "face_guard": params.get("local_face_guard", True) is not False,
                     "fuse_tint": _fuse_tint_amount(params.get("local_fuse_tint")),
                     "edge_falloff": _tuned(params.get("local_edge_falloff"), 2.0, 14.0,
                                            local_relight.EDGE_FALLOFF),
                     "guard_area": _tuned(params.get("local_guard_area"), 0.25, 0.55,
                                          local_relight.FACE_GUARD["ratio"]),
                     "guard_sigma": _tuned(params.get("local_guard_sigma"), 0.10, 0.40,
                                           local_relight.FACE_GUARD["sigma_frac"]),
                     "shadow_strength": _tuned(params.get("local_shadow_strength"), 0.0, 1.0,
                                               local_relight.SHADOW["strength"]),
                     "pool_strength": _tuned(params.get("local_pool_strength"), 0.0, 0.60,
                                             local_relight.POOL["strength"]),
                     "edge": params.get("local_edge", "soft"), "key_azimuth": key_azimuth}
        user = self.require_user(request)
        end_user_name, end_user_phone = user["username"], user["phone"]
        pid, user_id = str(uuid.uuid4()), user["id"]
        await self.call_store(self.app, "register_job", pid, project_id, user_id)
        inputs = {"images[0]": input_ref}
        if reference_ref:
            key = "geometry_png" if reference_mode == "geometry" else "reference_image"
            inputs[key] = reference_ref
        if mask_input_ref:
            inputs["local_mask"] = mask_input_ref
        if manual_input_ref:
            inputs["local_manual_layer"] = manual_input_ref
        await self.resource_call(self.app, "register_job_inputs", pid, inputs)
        model_metadata = provider_billing.normalize({}, config["banana_model" if provider == "banana" else "model"], config)
        job = {"id": pid, "capability": cap["id"], "name": cap["name"],
               "modelName": model_metadata["model"],
               "model_source": model_metadata["model_source"], "billingMode": "paid_api",
               "provider_billing": None, "usage": model_metadata["usage"],
               "execution": "cloud_image", "outputType": "image",
               "status": "queued", "progress": 0.0, "created": time.time(), "seed": None,
               "megapixels": megapixels,
               "requested_size": None if provider == "banana" else size,
               "step": "等待云端打光", "outputs": [], "error": None, "retryable": False,
               "project": project_id, "projectName": body.get("projectName"),
               "card": card_id, "cardName": body.get("cardName"),
               "referenceMode": reference_mode, "provider": provider,
               "prompts": [{"key": "prompt", "label": "布光提示词", "text": prompt.strip()}]}
        await self.bind_cost_user(job, user_id)
        await self.record_cost(job, params, inputs)
        self.jobs[pid] = job
        self.save_jobs()
        images = [data] if reference is None else [data, reference[0]]
        refs = [ref] if reference is None else [ref, reference[1]]
        if mask_ref:
            refs.append(mask_ref)
        if manual_ref:
            refs.append(manual_ref)
        task = asyncio.create_task(
            self.run(job, user_id, images, refs, size, prompt.strip(), provider,
                     end_user_name=end_user_name, end_user_phone=end_user_phone, local=local))
        self.tasks[pid] = task
        task.add_done_callback(lambda finished: self.tasks.pop(pid, None))
        return dict(job)

    async def authorize(self, user_id, project_id, ref):
        permission = await self.call_store(self.app, "project_permission", user_id, project_id)
        allowed = await self.resource_call(self.app, "authorize", user_id, *ref, project_id=project_id)
        if permission != "operate" or not allowed:
            raise web.HTTPForbidden(text="画布或输入图片已不可用，未采用云端结果；请联系管理员确认，不要重复生成")

    async def authorize_all(self, user_id, project_id, refs):
        for ref in refs:
            await self.authorize(user_id, project_id, ref)

    async def run(self, job, user_id, images, refs, size, prompt, provider="gpt_image", *,
                  end_user_name, end_user_phone, local=None):
        path = temporary = None
        try:
            await self.authorize_all(user_id, job["project"], refs)
            job.update(status="running", started=time.time(), step="云端多灯打光中")
            self.save_jobs()
            await self.record_cost(job)

            async def on_metadata(metadata):
                await self.capture_metadata(job, metadata)

            if local is not None:
                result = await self._run_local(
                    job, images, size, prompt, provider, local,
                    end_user_name=end_user_name, end_user_phone=end_user_phone)
            elif provider == "banana":
                result = await cloud_banana.generate(self.app["session"], images, prompt,
                                                     end_user_name=end_user_name, end_user_phone=end_user_phone,
                                                     on_metadata=on_metadata)
            else:
                result = await cloud_images.edit(self.app["session"], images, prompt, size=size,
                                                 end_user_name=end_user_name, end_user_phone=end_user_phone,
                                                 on_metadata=on_metadata)
            await self.capture_metadata(job, result)
            if "image_bytes" not in result:
                raise cloud_images.ImageEditError(
                    "云端已返回图片链接，但未自动下载。请联系管理员确认结果，不要重复生成。",
                    request_id=result["request_id"], generation_unknown=True)
            async with self.app["project_locks"][job["project"]]:
                await self.authorize_all(user_id, job["project"], refs)
                name = "relight" + result["extension"]
                locator = f"{job['id']}/{name}"
                path = self.root / "data" / "artifacts" / locator
                temporary = path.with_suffix(path.suffix + ".part")
                parent = await self.resource_call(self.app, "lookup", *refs[0])
                await self.resource_call(self.app, "register", job["project"], "artifact", locator,
                                         parent_id=parent["resource_id"], state="pending")
                await asyncio.to_thread(path.parent.mkdir, parents=True, exist_ok=True)
                await asyncio.to_thread(temporary.write_bytes, result["image_bytes"])
                await self.authorize_all(user_id, job["project"], refs)
                os.replace(temporary, path)
                await self.resource_call(self.app, "publish", "artifact", locator)
                job.update(status="done", progress=1.0, error=None, outputs=[{
                    "kind": "image", "filename": name, "type": "output", "subfolder": "",
                    "url": f"/api/artifact/{locator}",
                    "width": result["width"], "height": result["height"]}])
        except cloud_images.ImageEditError as error:
            job.update(status="error", **error.response())
        except web.HTTPException as error:
            job.update(status="error", error=error.text, retryable=False)
        except asyncio.CancelledError:
            job.update(status="error", error="服务停止，云端生成状态可能未知，请联系管理员确认，不要自动重试。",
                       generation_unknown=True, retryable=False)
            raise
        except Exception:
            job.update(status="error", error="云端打光或结果保存失败，请联系管理员确认，不要重复生成。",
                       generation_unknown=True, retryable=False)
        finally:
            if temporary:
                temporary.unlink(missing_ok=True)
            if path and job["status"] != "done":
                path.unlink(missing_ok=True)
            job.update(step="", ended=time.time())
            job["ms"] = int((job["ended"] - job.get("started", job["created"])) * 1000)
            try:
                self.save_jobs()
            finally:
                await self.record_cost(job)

    async def _run_local(self, job, images, size, prompt, provider, local, *,
                         end_user_name, end_user_phone):
        """局部打光：识别蒙版 → 整图云端重打光 1 次 → 蒙版内回贴 → 接地 → 头肩补光。

        环境不变的保证来自回贴（只搬蒙版内像素），不依赖模型自觉；
        接地是唯一会动到对象外脚下地面的步骤，可关；头肩只对选中人物另调 1 次。
        """
        from io import BytesIO
        from PIL import Image

        np = local_relight._imports()[1]
        width, height = (int(v) for v in size.split("x"))
        base_img = Image.open(BytesIO(images[0])).convert("RGB").resize((width, height), Image.LANCZOS)
        base_arr = np.asarray(base_img, np.float32)
        # 演练模式：整条链路跑真代码，只有云端重打光用本地提亮模拟，成品带 REHEARSAL 角标。
        rehearsal = os.environ.get("CHOUKA_REHEARSAL") == "1"

        job.update(step="识别打光范围", progress=0.1)
        self.save_jobs()
        person_boxes = []
        if local["mask_data"]:
            # 编辑器蒙版按画布长边导出、出图尺寸是另一套，这里缩放是刻意的（软边缘要留住）。
            mask = await asyncio.to_thread(local_relight.decode_mask, local["mask_data"],
                                           (width, height), resample="lanczos")
            person_mask = np.zeros((height, width), np.float32)
        else:
            subjects = local["subjects"]
            # 位图里已经存了身份的对象一律短路回放：绝不再跑分割，
            # 否则手工涂抹的成果会被模型重新切一版直接冲掉（P0-3）。
            manual_ids = set(local.get("manual_ids") or [])
            layer = None
            if manual_ids:
                layer = await asyncio.to_thread(local_relight.decode_identity_layer,
                                                local["manual_layer"], (width, height))
            pending = [subject for subject in subjects if subject["id"] not in manual_ids]
            people = (await asyncio.to_thread(local_relight.segment_auto, base_img)
                      if pending else [])
            found_ids = [f"p{index}" for index in range(1, len(people) + 1)]
            missing = [s["id"] for s in pending
                       if s.get("source") == "auto" and s.get("kind") == "person"
                       and s["id"] not in found_ids]
            if missing:
                raise web.HTTPBadRequest(text="人物候选已变化，请回到面板重新识别后再出图")
            masks, person_masks = [], []
            for subject in subjects:
                if subject["id"] in manual_ids:
                    picked = (layer == subject["mask_index"]).astype(np.float32)
                    if not picked.any():
                        raise web.HTTPBadRequest(
                            text=f"手工身份 {subject['id']} 在位图里已经空了，"
                                 "请在编辑器里补上后再出图")
                    masks.append(picked)
                    if subject.get("kind") == "person":
                        person_masks.append(picked)
                        person_boxes.append(subject["box"])
                elif subject.get("source") == "manual":
                    # 按当初的选取方式回放：点选必须重跑点选分割，用包围盒框选会把精细蒙版退化成一大块。
                    if subject.get("mode") == "point" and _valid_subject_point(subject.get("point")):
                        seg = await asyncio.to_thread(local_relight.segment_point,
                                                      base_img, subject["point"])
                    else:
                        seg = await asyncio.to_thread(local_relight.segment_box,
                                                      base_img, subject["box"])
                    masks.append(seg["mask"])
                    if subject.get("kind") == "person":
                        person_masks.append(seg["mask"])
                        person_boxes.append(seg["box"])
                elif subject.get("kind") == "person":
                    person = people[found_ids.index(subject["id"])]
                    small = Image.fromarray((np.clip(person["mask"], 0, 1) * 255).astype("uint8"), "L")
                    full = np.asarray(small.resize((width, height), Image.LANCZOS), np.float32) / 255.0
                    masks.append(full)
                    person_masks.append(full)
                    person_boxes.append(person["box"])
            mask = local_relight.union_mask(masks, (height, width))
            person_mask = local_relight.union_mask(person_masks, (height, width))

        job.update(step="云端重打光", progress=0.3)
        self.save_jobs()
        if rehearsal:
            relit_lit = await asyncio.to_thread(local_relight.rehearsal_relit, base_img)
            result = {"request_id": "rehearsal-local", "model": "rehearsal（演练）",
                      "image_bytes": local_relight.encode_png(np.asarray(relit_lit))}
        elif provider == "banana":
            result = await cloud_banana.generate(self.app["session"], [images[0]], prompt,
                                                 end_user_name=end_user_name, end_user_phone=end_user_phone)
        else:
            result = await cloud_images.edit(self.app["session"], [images[0]], prompt, size=size,
                                             end_user_name=end_user_name, end_user_phone=end_user_phone)
        if "image_bytes" not in result:
            raise cloud_images.ImageEditError(
                "云端已返回图片链接，但未自动下载。请联系管理员确认结果，不要重复生成。",
                request_id=result["request_id"])
        relit_img = Image.open(BytesIO(result["image_bytes"])).convert("RGB").resize(
            (width, height), Image.LANCZOS)
        dump_intermediate(job, relit_img, "cloud-relit")

        job.update(step="软过渡回贴", progress=0.7)
        self.save_jobs()
        out = await asyncio.to_thread(local_relight.composite, base_arr,
                                      np.asarray(relit_img, np.float32), mask, local["edge"],
                                      falloff=local["edge_falloff"])

        if local["grounding"] and person_boxes:
            job.update(step="接地阴影", progress=0.8)
            self.save_jobs()
            out = await asyncio.to_thread(local_relight.grounding, out, base_arr, person_mask,
                                          local["key_azimuth"],
                                          shadow_strength=local["shadow_strength"],
                                          pool_strength=local["pool_strength"])

        if local["head_fill"] and person_boxes:
            job.update(step="头肩补光", progress=0.85)
            self.save_jobs()
            primary = max(person_boxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
            hbox = head_box_safe(primary, width, height)
            px = (int(hbox[0] * width), int(hbox[1] * height),
                  int(hbox[2] * width), int(hbox[3] * height))
            crop = base_img.crop(px)
            tw, th = head_crop_size(crop.size[0], crop.size[1])
            head_input = local_relight.encode_png(np.asarray(crop.resize((tw, th), Image.LANCZOS)))
            head_prompt = (prompt + "\n这是头肩特写，只调整光照，保持身份、发丝与甲片细节不变。")[:20000]
            if rehearsal:
                head_lit = await asyncio.to_thread(local_relight.rehearsal_relit, crop)
                head_result = {"request_id": "rehearsal-head",
                               "image_bytes": local_relight.encode_png(np.asarray(head_lit))}
            elif provider == "banana":
                head_result = await cloud_banana.generate(
                    self.app["session"], [head_input], head_prompt,
                    end_user_name=end_user_name, end_user_phone=end_user_phone)
            else:
                head_result = await cloud_images.edit(
                    self.app["session"], [head_input], head_prompt, size=f"{tw}x{th}",
                    end_user_name=end_user_name, end_user_phone=end_user_phone)
            if "image_bytes" in head_result:
                model_crop = Image.open(BytesIO(head_result["image_bytes"])).convert("RGB")
                dump_intermediate(job, model_crop, "cloud-head")
                weight = local_relight.head_weight(person_mask, hbox, (height, width))
                out = await asyncio.to_thread(local_relight.blend_head, out, model_crop, hbox, weight)

        if local["face_guard"] and person_boxes:
            job.update(step="脸部保形", progress=0.9)
            self.save_jobs()
            out = await asyncio.to_thread(local_relight.face_guard, base_arr, out,
                                          person_mask, person_boxes,
                                          head_ratio=local["guard_area"],
                                          sigma_frac=local["guard_sigma"])

        if local["fuse_tint"] > 0 and person_boxes:
            job.update(step="色调回拉", progress=0.95)
            self.save_jobs()
            out = await asyncio.to_thread(local_relight.tint_match, out,
                                          person_mask, local["fuse_tint"])

        if rehearsal:
            out = await asyncio.to_thread(local_relight.rehearsal_mark, out)
        final_bytes = local_relight.encode_png(out)
        info = cloud_images.inspect_image(final_bytes)
        return {**result, "image_bytes": final_bytes, "extension": ".png",
                "width": info["width"], "height": info["height"]}

    async def close(self):
        tasks = list(self.tasks.values())
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
