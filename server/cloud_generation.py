"""Paid image API jobs; no ComfyUI dispatch and no generation retries."""
import asyncio
import os
import time
import uuid

from aiohttp import web

from . import cloud_banana, cloud_images
from .cloud_lighting import CloudLighting


CAPABILITIES = {
    "banana_api_t2i": ("banana", False),
    "banana_api_i2i": ("banana", True),
    "gpt_image_api_t2i": ("gpt_image", False),
    "gpt_image_api_i2i": ("gpt_image", True),
}
GPT_SIZES = {"1024x1024", "1536x1024", "1024x1536"}


class CloudGeneration(CloudLighting):
    async def record_cost(self, job, params=None, assets=None):
        ledger = self.app.get("costs")
        if ledger:
            await asyncio.to_thread(ledger.record_image_api, job, model=job["modelName"],
                                    params=params, assets=assets)

    async def authorize_all(self, user_id, project_id, refs):
        # Text-to-image has no resource references, but still requires project access.
        permission = await self.call_store(self.app, "project_permission", user_id, project_id)
        if permission != "operate":
            raise web.HTTPForbidden(text="画布已不可编辑，未采用云端结果；请联系管理员确认，不要重复生成")
        await super().authorize_all(user_id, project_id, refs)

    async def submit(self, request, body, cap):
        provider, needs_images = CAPABILITIES[cap["id"]]
        params, assets = body.get("params", {}), body.get("assets", {})
        if not isinstance(params, dict) or not isinstance(assets, dict):
            raise web.HTTPBadRequest(text="生图参数与素材必须为对象")
        prompt = params.get("prompt")
        if not isinstance(prompt, str) or not 1 <= len(prompt.strip()) <= 20000:
            raise web.HTTPBadRequest(text="生图提示词不能为空，且不得超过 20000 字符")
        count = len(assets)
        allowed_keys = [f"images[{index}]" for index in range(8)]
        keys = [key for key in allowed_keys if key in assets]
        invalid_count = (not 1 <= count <= 8 or "images[0]" not in assets) if needs_images else count != 0
        if (set(assets) - set(allowed_keys) or invalid_count
                or any(not isinstance(assets[key], str) or not assets[key] for key in keys)):
            raise web.HTTPBadRequest(text="文生图不接受输入图；图生图需要按顺序提供 1–8 张图片")
        size = quality = None
        if provider == "gpt_image":
            size = params.get("size", "original" if needs_images else "1024x1024")
            quality = params.get("quality", "medium")
            if not isinstance(size, str) or size not in GPT_SIZES | ({"original"} if needs_images else set()):
                raise web.HTTPBadRequest(text="GPT 图片请求尺寸无效")
            if not isinstance(quality, str) or quality not in {"low", "medium", "high"}:
                raise web.HTTPBadRequest(text="GPT 图片质量只支持 low、medium 或 high")
        project_id, card_id = body["project"], body.get("card")
        if (card_id and not body.get("dry_run")
                and any(job.get("execution") == "cloud_image" and job.get("project") == project_id
                        and job.get("card") == card_id and job.get("status") in {"queued", "running"}
                        for job in self.jobs.values())):
            raise web.HTTPConflict(text="当前卡片已有云端生图任务，请等待结果，不要重复提交")
        sources = [await self.source(request, project_id, assets[key]) for key in keys]
        if size == "original":
            size = f"{sources[0][2]['width']}x{sources[0][2]['height']}"
        if body.get("dry_run"):
            return {"dry_run": True, "execution": "cloud_image", "billingMode": "paid_api",
                    "provider": provider, "prompt": prompt.strip(), "size": size,
                    "quality": quality, "changed": {}}
        config = cloud_banana.load() if provider == "banana" else cloud_images.load()
        await self.require_project(request, project_id, operate=True)
        inputs = {key: await self.snapshot_input(project_id, ref, data, info)
                  for key, (data, ref, info) in zip(keys, sources)}
        user = self.require_user(request)
        pid = str(uuid.uuid4())
        await self.call_store(self.app, "register_job", pid, project_id, user["id"])
        await self.resource_call(self.app, "register_job_inputs", pid, inputs)
        job = {"id": pid, "capability": cap["id"], "name": cap["name"],
               "modelName": config["banana_model" if provider == "banana" else "model"],
               "execution": "cloud_image", "billingMode": "paid_api", "provider": provider,
               "outputType": "image", "status": "queued", "progress": 0.0,
               "created": time.time(), "seed": None, "step": "等待付费 API 生图",
               "requested_size": size, "quality": quality, "input_image_count": count,
               "outputs": [], "error": None, "retryable": False,
               "project": project_id, "projectName": body.get("projectName"),
               "card": card_id, "cardName": body.get("cardName"),
               "prompts": [{"key": "prompt", "label": "生图提示词", "text": prompt.strip()}]}
        await self.record_cost(job, params, inputs)
        self.jobs[pid] = job
        self.save_jobs()
        task = asyncio.create_task(self.run_generation(
            job, user["id"], [source[0] for source in sources], [source[1] for source in sources],
            prompt.strip(), end_user_name=user["username"], end_user_phone=user["phone"]))
        self.tasks[pid] = task
        task.add_done_callback(lambda finished: self.tasks.pop(pid, None))
        return dict(job)

    async def run_generation(self, job, user_id, images, refs, prompt, *, end_user_name, end_user_phone):
        path = temporary = None
        try:
            await self.authorize_all(user_id, job["project"], refs)
            job.update(status="running", started=time.time(), step="付费 API 生图中")
            self.save_jobs()
            await self.record_cost(job)
            identity = {"end_user_name": end_user_name, "end_user_phone": end_user_phone}
            if job["provider"] == "banana":
                result = await cloud_banana.generate(self.app["session"], images, prompt,
                                                     text_only=not images, **identity)
            elif images:
                result = await cloud_images.edit(self.app["session"], images, prompt,
                                                 size=job["requested_size"], quality=job["quality"], **identity)
            else:
                result = await cloud_images.generate(self.app["session"], prompt,
                                                     size=job["requested_size"], quality=job["quality"], **identity)
            job.update(request_id=result["request_id"], modelName=result["model"])
            if "image_bytes" not in result:
                raise cloud_images.ImageEditError(
                    "云端已返回图片链接，但未自动下载。请联系管理员确认结果，不要重复生成。",
                    request_id=result["request_id"], generation_unknown=True)
            async with self.app["project_locks"][job["project"]]:
                await self.authorize_all(user_id, job["project"], refs)
                name = "generated" + result["extension"]
                locator = f"{job['id']}/{name}"
                path = self.root / "data" / "artifacts" / locator
                temporary = path.with_suffix(path.suffix + ".part")
                parent = await self.resource_call(self.app, "lookup", *refs[0]) if refs else None
                await self.resource_call(self.app, "register", job["project"], "artifact", locator,
                                         parent_id=parent["resource_id"] if parent else None, state="pending")
                await asyncio.to_thread(path.parent.mkdir, parents=True, exist_ok=True)
                await asyncio.to_thread(temporary.write_bytes, result["image_bytes"])
                await self.authorize_all(user_id, job["project"], refs)
                os.replace(temporary, path)
                await self.resource_call(self.app, "publish", "artifact", locator)
                job.update(status="done", progress=1.0, error=None, outputs=[{
                    "kind": "image", "filename": name, "type": "output", "subfolder": "",
                    "url": f"/api/artifact/{locator}", "width": result["width"], "height": result["height"]}])
        except cloud_images.ImageEditError as error:
            job.update(status="error", **error.response())
        except web.HTTPException as error:
            job.update(status="error", error=error.text, retryable=False)
        except asyncio.CancelledError:
            job.update(status="error", error="服务停止，付费 API 生成状态可能未知，请联系管理员确认，不要自动重试。",
                       generation_unknown=True, retryable=False)
            raise
        except Exception:
            job.update(status="error", error="付费 API 生图或结果保存失败，请联系管理员确认，不要重复生成。",
                       generation_unknown=True, retryable=False)
        finally:
            if temporary:
                temporary.unlink(missing_ok=True)
            if path and job["status"] != "done":
                path.unlink(missing_ok=True)
            job.update(step="", ended=time.time())
            job["ms"] = int((job["ended"] - job.get("started", job["created"])) * 1000)
            self.save_jobs()
            await self.record_cost(job)
