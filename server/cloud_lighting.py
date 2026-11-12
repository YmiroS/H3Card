"""Cloud relighting jobs, separate from ComfyUI scheduling and cancellation."""
import asyncio
import json
import math
import os
import time
import uuid

import aiohttp
from aiohttp import web

from . import cloud_banana
from . import cloud_images, provider_billing


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

    async def submit(self, request, body, cap):
        params, assets = body.get("params") or {}, body.get("assets") or {}
        if (not isinstance(params, dict) or not isinstance(assets, dict)
                or set(assets) != {"images[0]"} or not isinstance(assets["images[0]"], str)):
            raise web.HTTPBadRequest(text="多灯打光需要且只接受一张输入图片")
        prompt = params.get("prompt")
        if not isinstance(prompt, str) or not 1 <= len(prompt.strip()) <= 20000:
            raise web.HTTPBadRequest(text="多灯布光提示词不能为空，且不得超过 20000 字符")
        reference_mode = params.get("reference_mode", "analyze")
        if reference_mode not in ("analyze", "direct"):
            raise web.HTTPBadRequest(text="参考图方式只支持 analyze 或 direct")
        reference_image = params.get("reference_image")
        if reference_mode == "direct" and (
                not isinstance(reference_image, str) or not reference_image.strip()):
            raise web.HTTPBadRequest(text="双图直传缺少参考图，请重新选择参考图后再试")
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
        megapixels = params.get("megapixels", 1.5)
        size = lighting_size(info, megapixels)
        if body.get("dry_run"):
            return {"dry_run": True, "execution": "cloud_image", "changed": {},
                    "prompt": prompt.strip(), "provider": provider,
                    "size": None if provider == "banana" else size}
        config = (cloud_banana.load() if provider == "banana"
                  else cloud_images.load())
        await self.require_project(request, project_id, operate=True)
        input_ref = await self.snapshot_input(project_id, ref, data, info)
        reference_ref = (await self.snapshot_input(project_id, reference[1], reference[0],
                                                   reference[2])) if reference else None
        user = self.require_user(request)
        end_user_name, end_user_phone = user["username"], user["phone"]
        pid, user_id = str(uuid.uuid4()), user["id"]
        await self.call_store(self.app, "register_job", pid, project_id, user_id)
        inputs = {"images[0]": input_ref}
        if reference_ref:
            inputs["reference_image"] = reference_ref
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
        task = asyncio.create_task(
            self.run(job, user_id, images, refs, size, prompt.strip(), provider,
                     end_user_name=end_user_name, end_user_phone=end_user_phone))
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
                  end_user_name, end_user_phone):
        path = temporary = None
        try:
            await self.authorize_all(user_id, job["project"], refs)
            job.update(status="running", started=time.time(), step="云端多灯打光中")
            self.save_jobs()
            await self.record_cost(job)

            async def on_metadata(metadata):
                await self.capture_metadata(job, metadata)

            if provider == "banana":
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

    async def close(self):
        tasks = list(self.tasks.values())
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
