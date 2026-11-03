"""Cloud relighting jobs, separate from ComfyUI scheduling and cancellation."""
import asyncio
import json
import math
import os
import time
import uuid

import aiohttp
from aiohttp import web

from . import cloud_images


def lighting_size(info, megapixels):
    if (isinstance(megapixels, bool) or not isinstance(megapixels, (int, float))
            or not math.isfinite(megapixels) or not 0.25 <= megapixels <= 16):
        raise web.HTTPBadRequest(text="多灯处理像素必须为 0.25–16 MP 之间的数值")
    pixels = megapixels * 1024 * 1024
    ratio = info["width"] / info["height"]
    width = max(16, (round(math.sqrt(pixels * ratio)) + 15) // 16 * 16)
    height = max(16, (round(math.sqrt(pixels / ratio)) + 15) // 16 * 16)
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

    async def source(self, request, project_id, value):
        ref = await self.resource_call(self.app, "reference", value)
        if not ref:
            raise web.HTTPBadRequest(text="多灯打光只接受画布内已登记的图片")
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

    async def submit(self, request, body, cap):
        params, assets = body.get("params") or {}, body.get("assets") or {}
        if (not isinstance(params, dict) or not isinstance(assets, dict)
                or set(assets) != {"images[0]"} or not isinstance(assets["images[0]"], str)):
            raise web.HTTPBadRequest(text="多灯打光需要且只接受一张输入图片")
        prompt = params.get("prompt")
        if not isinstance(prompt, str) or not 1 <= len(prompt.strip()) <= 20000:
            raise web.HTTPBadRequest(text="多灯布光提示词不能为空，且不得超过 20000 字符")
        project_id, card_id = body["project"], body.get("card")
        if card_id and not body.get("dry_run") and any(job.get("execution") == "cloud_image"
                           and job.get("project") == project_id and job.get("card") == card_id
                           and job.get("status") in {"queued", "running"}
                           for job in self.jobs.values()):
            raise web.HTTPConflict(text="当前卡片已有云端打光任务，请等待结果，不要重复提交")
        data, ref, info = await self.source(request, project_id, assets["images[0]"])
        megapixels = params.get("megapixels", 1.5)
        size = lighting_size(info, megapixels)
        if body.get("dry_run"):
            return {"dry_run": True, "execution": "cloud_image", "changed": {},
                    "prompt": prompt.strip(), "size": size}
        config = cloud_images.load()
        await self.require_project(request, project_id, operate=True)
        parent = await self.resource_call(self.app, "lookup", *ref)
        # The existing task-input index uses uploads; snapshot other trusted resource types.
        input_ref = assets["images[0]"]
        if ref[0] != "upload":
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
            input_ref = "chouka/" + name
        pid, user_id = str(uuid.uuid4()), self.require_user(request)["id"]
        await self.call_store(self.app, "register_job", pid, project_id, user_id)
        await self.resource_call(self.app, "register_job_inputs", pid, {"images[0]": input_ref})
        job = {"id": pid, "capability": cap["id"], "name": cap["name"],
               "modelName": config["model"], "execution": "cloud_image", "outputType": "image",
               "status": "queued", "progress": 0.0, "created": time.time(), "seed": None,
               "megapixels": megapixels, "requested_size": size,
               "step": "等待云端打光", "outputs": [], "error": None, "retryable": False,
               "project": project_id, "projectName": body.get("projectName"),
               "card": card_id, "cardName": body.get("cardName"),
               "prompts": [{"key": "prompt", "label": "布光提示词", "text": prompt.strip()}]}
        self.jobs[pid] = job
        self.save_jobs()
        task = asyncio.create_task(self.run(job, user_id, data, ref, size, prompt.strip()))
        self.tasks[pid] = task
        task.add_done_callback(lambda finished: self.tasks.pop(pid, None))
        return dict(job)

    async def authorize(self, user_id, project_id, ref):
        permission = await self.call_store(self.app, "project_permission", user_id, project_id)
        allowed = await self.resource_call(self.app, "authorize", user_id, *ref, project_id=project_id)
        if permission != "operate" or not allowed:
            raise web.HTTPForbidden(text="画布或输入图片已不可用，未采用云端结果；请联系管理员确认，不要重复生成")

    async def run(self, job, user_id, data, ref, size, prompt):
        path = temporary = None
        try:
            await self.authorize(user_id, job["project"], ref)
            job.update(status="running", started=time.time(), step="云端多灯打光中")
            self.save_jobs()
            result = await cloud_images.edit(self.app["session"], [data], prompt, size=size)
            job.update(request_id=result["request_id"], modelName=result["model"])
            if "image_bytes" not in result:
                raise cloud_images.ImageEditError(
                    "云端已返回图片链接，但未自动下载。请联系管理员确认结果，不要重复生成。",
                    request_id=result["request_id"])
            async with self.app["project_locks"][job["project"]]:
                await self.authorize(user_id, job["project"], ref)
                name = "relight" + result["extension"]
                locator = f"{job['id']}/{name}"
                path = self.root / "data" / "artifacts" / locator
                temporary = path.with_suffix(path.suffix + ".part")
                parent = await self.resource_call(self.app, "lookup", *ref)
                await self.resource_call(self.app, "register", job["project"], "artifact", locator,
                                         parent_id=parent["resource_id"], state="pending")
                await asyncio.to_thread(path.parent.mkdir, parents=True, exist_ok=True)
                await asyncio.to_thread(temporary.write_bytes, result["image_bytes"])
                await self.authorize(user_id, job["project"], ref)
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
            self.save_jobs()

    async def close(self):
        tasks = list(self.tasks.values())
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
