"""Controlled graph previews and one-use controller-side cloud editing tickets."""
import asyncio
import copy
import hashlib
from io import BytesIO
import json
import math
import re
import secrets
import time

from aiohttp import web
from PIL import Image

from . import cloud_banana, cloud_images
from .auth import call_store, require_user
from .texture_api import TextureApi, selected_image, source_version


CAPABILITIES = frozenset({"texture_local_flux", "texture_local_gpt", "texture_local_banana"})
PROVIDERS = {"texture_local_gpt": "gpt_image", "texture_local_banana": "banana"}
TICKET_TTL = 3600  # Includes queue time; never persisted across controller restarts.
MAX_PENDING_TICKETS = 1024
MAX_USER_TICKETS = 32
TICKET_PATTERN = re.compile(r"lt_[A-Za-z0-9_-]{43}")
CLOUD_NODE_IDS = {"gpt_image": "30", "banana": "31"}
# This is one controlled workflow, not an arbitrary graph validator. Pinning its
# classes also pins OUTPUT_NODEs: only the metadata-safe #99 may be an output.
GRAPH_CLASSES = {
    "1": "LoadImage", "2": "LoadImageMask", "3": "LoadImage",
    "10": "ChoukaLocalCrop", "11": "UNETLoader", "12": "CLIPLoader",
    "13": "VAELoader", "14": "CLIPTextEncode", "15": "ConditioningZeroOut",
    "16": "VAEEncode", "17": "ReferenceLatent", "18": "ReferenceLatent",
    "19": "ImageScaleToTotalPixels", "20": "VAEEncode", "21": "ReferenceLatent",
    "22": "ReferenceLatent", "23": "EmptyFlux2LatentImage", "24": "KSampler",
    "25": "VAEDecode", "30": "ChoukaCloudImageEdit", "31": "ChoukaCloudImageEdit",
    "80": "ChoukaLocalModelSwitch", "90": "ChoukaLocalStitch", "99": "ChoukaLocalSaveImage",
}
GRAPH_LINKS = {
    "10": {"image": ["1", 0], "mask": ["2", 0]},
    "14": {"clip": ["12", 0]}, "15": {"conditioning": ["14", 0]},
    "16": {"pixels": ["10", 0], "vae": ["13", 0]},
    "17": {"conditioning": ["14", 0], "latent": ["16", 0]},
    "18": {"conditioning": ["15", 0], "latent": ["16", 0]},
    "19": {"image": ["3", 0]}, "20": {"pixels": ["19", 0], "vae": ["13", 0]},
    "21": {"conditioning": ["17", 0], "latent": ["20", 0]},
    "22": {"conditioning": ["18", 0], "latent": ["20", 0]},
    "23": {"width": ["10", 2], "height": ["10", 3]},
    "24": {"model": ["11", 0], "positive": ["21", 0], "negative": ["22", 0],
           "latent_image": ["23", 0]},
    "25": {"samples": ["24", 0], "vae": ["13", 0]},
    "30": {"image": ["10", 0], "reference": ["3", 0]},
    "31": {"image": ["10", 0], "reference": ["3", 0]},
    "80": {"flux_image": ["25", 0], "gpt_image": ["30", 0], "banana_image": ["31", 0]},
    "90": {"generated": ["80", 0], "context": ["10", 1]},
    "99": {"images": ["90", 0]},
}


def redact(value):
    """Comfy errors may echo node inputs, including already consumed tickets."""
    if isinstance(value, str):
        return TICKET_PATTERN.sub("[local-edit ticket redacted]", value)
    if isinstance(value, dict):
        return {key: redact(item) for key, item in value.items()}
    if isinstance(value, list):
        return [redact(item) for item in value]
    return value


def validate_mask(data, info, base_info):
    if info["mime"] != "image/png" or (info["width"], info["height"]) != (base_info["width"], base_info["height"]):
        raise web.HTTPUnprocessableEntity(text="蒙版必须为与底图同尺寸的黑白 PNG（白色修改）")
    with Image.open(BytesIO(data)) as image:
        rgba = image.convert("RGBA")
        r, g, b, a = rgba.split()
        if (r.tobytes() != g.tobytes() or r.tobytes() != b.tobytes()
                or a.getextrema() != (255, 255)
                or any(value not in (0, 255) for value, count in enumerate(r.histogram()) if count)):
            raise web.HTTPUnprocessableEntity(text="蒙版仅接受不透明纯黑与纯白像素")
        if r.getextrema()[1] != 255:
            raise web.HTTPUnprocessableEntity(text="蒙版没有白色修改区域")


def png_result(data, source_info, provider):
    info = cloud_images.inspect_image(data)
    width, height = info["width"], info["height"]
    if ((provider == "gpt_image" and (width, height) != (source_info["width"], source_info["height"]))
            or width * source_info["height"] != height * source_info["width"]):
        raise cloud_images.ImageEditError("云端结果尺寸或宽高比不符，未缩放；不要自动重试")
    with Image.open(BytesIO(data)) as image:
        output = BytesIO()
        image.convert("RGBA" if "A" in image.getbands() else "RGB").save(output, format="PNG")
        return output.getvalue()


class LocalTexture(TextureApi):
    def __init__(self, app, *, controller, port, jobs, **dependencies):
        super().__init__(app, **dependencies)
        self.jobs = jobs
        self.controller = controller
        self.port = port
        self.tickets = {}  # SHA256(ticket) -> trusted submission context; no raw tickets.
        self.ticket_lock = asyncio.Lock()
        self.previews = {}  # Private source snapshots for Flux and cloud job publication.

    async def check_preview(self, request, pid):
        record = self.previews.get(pid)
        if record is None:
            raise web.HTTPConflict(text="局部预览来源快照已失效，请重新打开编辑面板")
        user = await call_store(self.app, "get_user", record["user_id"])
        if not user or not user.get("enabled"):
            raise web.HTTPForbidden(text="提交用户已失效")
        permission = await call_store(self.app, "project_permission", record["user_id"], record["project"])
        if permission != "operate":
            raise web.HTTPForbidden(text="提交用户已无画布操作权限")
        await self.check_context(request, record["project"], record["card"], record["source"], record["refs"][0])

    async def project_previews(self, request, jobs):
        projected = []
        for job in jobs:
            if job.get("capability") in CAPABILITIES:
                try:
                    await self.check_preview(request, job["id"])
                except web.HTTPException:
                    job = {**job, "outputs": [], "status": "error", "error": "局部预览来源或权限已变化，不能采用结果；不要自动重试"}
                job = redact(job)
            projected.append(job)
        return projected

    async def prepare(self, request, body, cap):
        if cap.get("editor_only") is not True or cap.get("execution", "graph") != "graph":
            raise web.HTTPBadRequest(text="局部编辑仅允许受控 editor_only graph 工作流")
        params, assets = body.get("params"), body.get("assets")
        if (not isinstance(params, dict) or set(params) - {"prompt", "megapixels", "feather"}
                or not isinstance(assets, dict) or set(assets) not in (
                    {"images[0]", "images[1]"}, {"images[0]", "images[1]", "images[2]"})
                or any(not isinstance(value, str) or not value for value in assets.values())):
            raise web.HTTPBadRequest(text="局部编辑需要底图、蒙版、可选参考图及受控参数")
        prompt = params.get("prompt")
        if not isinstance(prompt, str) or not 1 <= len(prompt.strip()) <= 20000:
            raise web.HTTPBadRequest(text="编辑提示词必须为 1–20000 字符")
        for key, default, low, high in (("megapixels", 1, .25, 16), ("feather", 32, 0, 128)):
            value = params.setdefault(key, default)
            if isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value) or not low <= value <= high:
                raise web.HTTPBadRequest(text=f"{key} 必须为 {low}–{high} 之间的数值")
        card = await self.card(request, body["project"], body.get("card"))
        version = source_version(card)
        expected = body.get("expected_source")
        if "expected_source" in body and (not isinstance(expected, dict) or set(expected) != {"type", "cap", "input", "outputs"}):
            raise web.HTTPBadRequest(text="expected_source 必须为完整来源快照")
        if expected is not None and expected != json.loads(version):
            raise web.HTTPConflict(text="卡片来源已变化，请刷新工作底图")
        selected, _ = selected_image(card)
        selected_ref = await self.resource_call(self.app, "reference", selected.get("url") or selected.get("ref") or selected)
        base, base_ref, base_info = await self.source(request, body["project"], {"ref": assets["images[0]"]})
        if expected is None and base_ref != selected_ref:
            raise web.HTTPConflict(text="工作底图与卡片来源不一致，必须提供 expected_source")
        mask, mask_ref, mask_info = await self.source(request, body["project"], {"ref": assets["images[1]"]})
        await asyncio.to_thread(validate_mask, mask, mask_info, base_info)
        refs = [base_ref, mask_ref]
        if assets.get("images[2]"):
            _, ref, _ = await self.source(request, body["project"], {"ref": assets["images[2]"]})
            refs.append(ref)
        await self.check_context(request, body["project"], body["card"], version, base_ref)
        user = require_user(request)
        return {"project": body["project"], "card": body["card"], "source": version,
                "refs": refs, "provider": PROVIDERS.get(cap["id"]), "prompt": prompt.strip(),
                "megapixels": params["megapixels"], "allow_reference": bool(assets.get("images[2]")),
                "user_id": user["id"], "username": user["username"], "phone": user["phone"],
                "capability": cap["id"]}

    @staticmethod
    def graph_model(context):
        provider = context["provider"]
        if provider is None:
            return "flux"
        if provider not in CLOUD_NODE_IDS:
            raise web.HTTPBadRequest(text="局部编辑模型选项无效")
        return provider

    def configure_graph(self, graph, context):
        """Set only trusted selection/prompt; never repair cloud authorization."""
        model = self.graph_model(context)
        for node_id, field, value in (("80", "model", model),
                                      ("30", "prompt", context["prompt"]),
                                      ("31", "prompt", context["prompt"])):
            node = graph.get(node_id)
            if not isinstance(node, dict) or not isinstance(node.get("inputs"), dict):
                raise web.HTTPBadRequest(text="局部编辑统一工作流节点缺失")
            node["inputs"][field] = value

    def validate_graph(self, graph, context):
        model = self.graph_model(context)
        if (set(graph) != set(GRAPH_CLASSES)
                or any(not isinstance(node, dict) or node.get("class_type") != GRAPH_CLASSES[key]
                       or not isinstance(node.get("inputs"), dict) for key, node in graph.items())):
            raise web.HTTPBadRequest(text="局部编辑必须使用完整受控工作流及唯一安全输出 #99")
        # Check every dependency, including unused branches. Otherwise a cloud
        # node wired into Flux/crop could defeat lazy selection and spend a ticket.
        links = copy.deepcopy(GRAPH_LINKS)
        if not context["allow_reference"]:
            for node_id, field in (("21", "latent"), ("22", "latent"),
                                   ("30", "reference"), ("31", "reference")):
                links[node_id].pop(field)
        for node_id, node in graph.items():
            actual = {key: value for key, value in node["inputs"].items() if isinstance(value, list)}
            if actual != links.get(node_id, {}):
                raise web.HTTPBadRequest(text=f"局部编辑节点 #{node_id} 连线契约不符")
        for provider, node_id in CLOUD_NODE_IDS.items():
            inputs = graph[node_id]["inputs"]
            fields = {"image", "prompt", "provider", "callback_url", "callback_token"}
            if context["allow_reference"]:
                fields.add("reference")
            if (set(inputs) != fields or inputs["provider"] != provider
                    or inputs["callback_url"] != "" or inputs["callback_token"] != ""
                    or inputs["prompt"] != context["prompt"]):
                raise web.HTTPBadRequest(text="云局部编辑节点契约不符")
        text = graph["14"]["inputs"].get("text")
        if (graph["80"]["inputs"] != {"model": model, **GRAPH_LINKS["80"]}
                or graph["90"]["inputs"] != GRAPH_LINKS["90"]
                or not isinstance(text, str) or text.strip() != context["prompt"]
                or graph["2"]["inputs"].get("channel") != "red"
                or any(("latent" in graph[node_id]["inputs"]) != context["allow_reference"]
                       for node_id in ("21", "22"))):
            raise web.HTTPBadRequest(text="局部编辑模型选择、提示词或拼接契约不符")
        save = graph["99"]["inputs"]
        if (set(save) - {"images", "filename_prefix"}
                or not isinstance(save.get("filename_prefix", ""), str)):
            raise web.HTTPBadRequest(text="局部编辑仅允许安全保存最终整图")

    async def inject(self, request, graph, context):
        await self.check_context(request, context["project"], context["card"], context["source"], context["refs"][0])
        if context["provider"] is None:
            return
        # The Worker binds its actual controller connection just before /prompt.
        url = "" if self.controller else f"http://127.0.0.1:{self.port}/agent/v1/local-edit/cloud"
        (cloud_images.load if context["provider"] == "gpt_image" else cloud_banana.load)()
        token = "lt_" + secrets.token_urlsafe(32)
        digest = hashlib.sha256(token.encode()).hexdigest()
        now = time.time()
        async with self.ticket_lock:
            for key in [key for key, record in self.tickets.items() if record["expires"] <= now]:
                del self.tickets[key]
            if (len(self.tickets) >= MAX_PENDING_TICKETS
                    or sum(record["user_id"] == context["user_id"] for record in self.tickets.values()) >= MAX_USER_TICKETS):
                raise web.HTTPTooManyRequests(text="待执行的云局部编辑过多，请等待现有任务完成")
            self.tickets[digest] = {**copy.deepcopy(context), "submission": context["submission"],
                                    "expires": now + TICKET_TTL}
        request["local_texture_ticket"] = digest
        graph[CLOUD_NODE_IDS[context["provider"]]]["inputs"].update(callback_url=url, callback_token=token)

    def invalidate(self, request):
        self.tickets.pop(request.get("local_texture_ticket"), None)
        context = request.get("local_texture_context")
        if context and context.get("submission"):
            context["submission"]["state"] = "failed"

    def check_submission(self, record):
        submission = record["submission"]
        job = self.jobs.get(submission["job_id"])
        if (submission["state"] == "failed" or (job and job.get("status") not in {"queued", "running"})
                or (not job and submission["state"] != "submitting")):
            raise web.HTTPConflict(text="局部编辑任务已结束或取消，未发起云端计算")

    async def check_ticket_context(self, request, record):
        self.check_submission(record)
        if self.controller:
            store = self.app.get("distributed")
            execution = await asyncio.to_thread(store.job_execution, record["submission"]["job_id"]) if store else None
            if not execution:
                raise web.HTTPConflict(text="局部编辑执行租约已失效或已取消，未发起云端计算")
        user = await call_store(self.app, "get_user", record["user_id"])
        if not user or not user.get("enabled"):
            raise web.HTTPForbidden(text="提交用户已失效")
        request["user"] = user
        await self.check_context(request, record["project"], record["card"], record["source"], record["refs"][0])
        for ref in record["refs"]:
            await self.require_resource(request, *ref, project_id=record["project"])

    async def callback(self, request):
        authorization = request.headers.get("Authorization", "")
        token = authorization[7:] if authorization.startswith("Bearer ") else ""
        if TICKET_PATTERN.fullmatch(token) is None:
            raise web.HTTPUnauthorized(text="无效或已使用的局部编辑票据")
        digest = hashlib.sha256(token.encode()).hexdigest()
        record = self.tickets.get(digest)
        if record is None or record["expires"] <= time.time():
            self.tickets.pop(digest, None)
            raise web.HTTPUnauthorized(text="无效、过期或已使用的局部编辑票据")
        try:
            await self.check_ticket_context(request, record)
            if request.content_type != "multipart/form-data":
                raise web.HTTPBadRequest(text="云局部编辑只接受 multipart 图片")
            reader = await request.multipart()
            images = {}
            async for part in reader:
                if (part.name not in {"image", "reference"} or part.name in images
                        or (part.name == "reference" and not record["allow_reference"])):
                    raise web.HTTPBadRequest(text="不允许的云局部编辑字段")
                data = bytearray()
                while True:
                    chunk = await part.read_chunk(64 * 1024)
                    if not chunk:
                        break
                    data.extend(chunk)
                    if len(data) > cloud_images.MAX_IMAGE_BYTES:
                        raise web.HTTPRequestEntityTooLarge(max_size=cloud_images.MAX_IMAGE_BYTES, actual_size=len(data))
                data = bytes(data)
                info = await asyncio.to_thread(cloud_images.inspect_image, data)
                images[part.name] = (data, info)
            if "image" not in images:
                raise web.HTTPBadRequest(text="缺少裁图")
            if ("reference" in images) != record["allow_reference"]:
                raise web.HTTPBadRequest(text="参考图必须与提交时选择一致，不能静默忽略")
            data, info = images["image"]
            # Match ChoukaLocalCrop's decimal MP, nearest-32 alignment and 512px floor.
            side_limit = max(512, min(2048, math.floor(math.sqrt(record["megapixels"] * 1_000_000) / 32 + .5) * 32))
            if info["width"] != info["height"] or info["width"] > side_limit:
                raise web.HTTPUnprocessableEntity(text="裁图必须为局部像素预算内的方形画布")
            # Recheck after upload, then atomically consume before the first paid call.
            async with self.app["project_locks"][record["project"]]:
                await self.check_ticket_context(request, record)
                async with self.ticket_lock:
                    if self.tickets.get(digest) is not record or record["expires"] <= time.time():
                        raise web.HTTPUnauthorized(text="票据已使用或过期")
                    del self.tickets[digest]
            payload = [data] + ([images["reference"][0]] if "reference" in images else [])
            started = time.monotonic()
            kwargs = {"end_user_name": record["username"], "end_user_phone": record["phone"]}
            if record["provider"] == "gpt_image":
                result = await cloud_images.edit(self.app["session"], payload, record["prompt"],
                                                 size=f"{info['width']}x{info['height']}",
                                                 model="gpt-image-2.6-sunburst", **kwargs)
            else:
                result = await cloud_banana.generate(self.app["session"], payload, record["prompt"], **kwargs)
            ledger = self.app.get("costs")
            if ledger:
                ledger.record_api(record["capability"], result.get("model"), result.get("prompt_tokens"),
                                  result.get("completion_tokens"), (time.monotonic() - started) * 1000,
                                  project=record["project"], card=record["card"])
            if result.get("result_url") or not result.get("image_bytes"):
                raise cloud_images.ImageEditError("云端未返回图片字节；不自动下载结果链接，不要自动重试",
                                                 request_id=result.get("request_id"))
            try:
                output = await asyncio.to_thread(png_result, result["image_bytes"], info, record["provider"])
            except cloud_images.ImageEditError as error:
                error.request_id = result.get("request_id")
                raise
            headers = {}
            request_id = result.get("request_id")
            if isinstance(request_id, str):
                headers["X-Request-ID"] = re.sub(r"[^\x20-\x7e]", "", redact(request_id))[:200]
            return web.Response(body=output, content_type="image/png", headers=headers)
        except cloud_images.ImageEditError as error:
            return web.json_response(redact(error.response()), status=error.status)


def register_local_texture_routes(app, **dependencies):
    api = LocalTexture(app, **dependencies)
    app["local_texture"] = api
    app.router.add_post("/agent/v1/local-edit/cloud", api.callback)
