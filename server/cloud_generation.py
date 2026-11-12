"""Paid image API jobs; no ComfyUI dispatch and no generation retries."""
import asyncio
from io import BytesIO
import math
import os
import time
import uuid

from aiohttp import web
from PIL import Image, ImageOps

from . import cloud_banana, cloud_images
from .cloud_lighting import CloudLighting
from .image_controls import RATIOS, CLARITIES, bounded_dimensions


CAPABILITIES = {
    "banana_api_t2i": ("banana", False),
    "banana_api_i2i": ("banana", True),
    "gpt_image_api_t2i": ("gpt_image", False),
    "gpt_image_api_i2i": ("gpt_image", True),
    "gpt_image_api_2_t2i": ("gpt_image", False),
    "gpt_image_api_2_i2i": ("gpt_image", True),
    "gpt_image_api_26_t2i": ("gpt_image", False),
    "gpt_image_api_26_i2i": ("gpt_image", True),
}

# Trusted server-side selection, never taken from HTTP params or global config.model.
GPT_IMAGE_MODELS = {
    "gpt_image_api_t2i": "gpt-image-2.5-sunburst",
    "gpt_image_api_i2i": "gpt-image-2.5-sunburst",
    "gpt_image_api_2_t2i": "gpt-image-2",
    "gpt_image_api_2_i2i": "gpt-image-2",
    "gpt_image_api_26_t2i": "gpt-image-2.6-sunburst",
    "gpt_image_api_26_i2i": "gpt-image-2.6-sunburst",
}


def generation_dimensions(params, needs_images, info=None):
    ratio = params.get("image_ratio", "original" if needs_images else "3:4")
    clarity = params.get("image_clarity", "720P")
    if not isinstance(ratio, str) or ratio not in RATIOS + (("original",) if needs_images else ()):
        raise web.HTTPBadRequest(text="画面比例无效")
    if not isinstance(clarity, str) or clarity not in CLARITIES:
        raise web.HTTPBadRequest(text="清晰度只支持 480P、720P、1080P、1440P、2K 或 4K")
    w, h = (info["width"], info["height"]) if ratio == "original" else map(int, ratio.split(":"))
    scale = CLARITIES[clarity] / min(w, h)
    width = max(16, math.floor(w * scale / 16 + .5) * 16)
    height = max(16, math.floor(h * scale / 16 + .5) * 16)
    return ratio, clarity, bounded_dimensions(width, height)


def resize_image(data, size, *, crop=False):
    info = cloud_images.inspect_image(data)
    if (info["width"], info["height"]) == size:
        return data, info
    with Image.open(BytesIO(data)) as image:
        image = image.convert("RGBA" if "A" in image.getbands() or "transparency" in image.info else "RGB")
        image = (ImageOps.fit(image, size, method=Image.Resampling.LANCZOS) if crop
                 else image.resize(size, Image.Resampling.LANCZOS))
        output = BytesIO()
        image.save(output, format="PNG")
    data = output.getvalue()
    return data, cloud_images.inspect_image(data)


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
        prompt_limit = 32000 if provider == "gpt_image" and not needs_images else 20000
        if not isinstance(prompt, str) or not 1 <= len(prompt.strip()) <= prompt_limit:
            raise web.HTTPBadRequest(text=f"生图提示词不能为空，且不得超过 {prompt_limit} 字符")
        count = len(assets)
        allowed_keys = [f"images[{index}]" for index in range(8)]
        keys = [key for key in allowed_keys if key in assets]
        invalid_count = (not 1 <= count <= 8 or "images[0]" not in assets) if needs_images else count != 0
        if (set(assets) - set(allowed_keys) or invalid_count
                or any(not isinstance(assets[key], str) or not assets[key] for key in keys)):
            raise web.HTTPBadRequest(text="文生图不接受输入图；图生图需要按顺序提供 1–8 张图片")
        quality = "high" if provider == "gpt_image" else None
        project_id, card_id = body["project"], body.get("card")
        if (card_id and not body.get("dry_run")
                and any(job.get("execution") == "cloud_image" and job.get("project") == project_id
                        and job.get("card") == card_id and job.get("status") in {"queued", "running"}
                        for job in self.jobs.values())):
            raise web.HTTPConflict(text="当前卡片已有云端生图任务，请等待结果，不要重复提交")
        sources = [await self.source(request, project_id, assets[key]) for key in keys]
        ratio, clarity, dimensions = generation_dimensions(params, needs_images, sources[0][2] if sources else None)
        size = f"{dimensions[0]}x{dimensions[1]}"
        if body.get("dry_run"):
            return {"dry_run": True, "execution": "cloud_image", "billingMode": "paid_api",
                    "provider": provider, "prompt": prompt.strip(), "size": size,
                    "image_ratio": ratio, "image_clarity": clarity,
                    "quality": quality, "changed": {}}
        config = cloud_banana.load() if provider == "banana" else cloud_images.load()
        prepared = []
        for index, (data, ref, info) in enumerate(sources):
            target = dimensions if index == 0 else bounded_dimensions(
                *(max(16, info[key] // 16 * 16) for key in ("width", "height")))
            data, info = await asyncio.to_thread(resize_image, data, target, crop=index == 0 and ratio != "original")
            prepared.append((data, ref, info))
        await self.require_project(request, project_id, operate=True)
        inputs = {key: await self.snapshot_input(project_id, ref, data, info, copy_upload=True)
                  for key, (data, ref, info) in zip(keys, prepared)}
        user = self.require_user(request)
        pid = str(uuid.uuid4())
        await self.call_store(self.app, "register_job", pid, project_id, user["id"])
        await self.resource_call(self.app, "register_job_inputs", pid, inputs)
        job = {"id": pid, "capability": cap["id"], "name": cap["name"],
               "modelName": config["banana_model"] if provider == "banana" else GPT_IMAGE_MODELS[cap["id"]],
               "execution": "cloud_image", "billingMode": "paid_api", "provider": provider,
               "outputType": "image", "status": "queued", "progress": 0.0,
               "created": time.time(), "seed": None, "step": "等待付费 API 生图",
               "requested_size": size, "image_ratio": ratio, "image_clarity": clarity,
               "quality": quality, "input_image_count": count,
               "input_sizes": [f"{info['width']}x{info['height']}" for _, _, info in prepared],
               "outputs": [], "error": None, "retryable": False,
               "project": project_id, "projectName": body.get("projectName"),
               "card": card_id, "cardName": body.get("cardName"),
               "prompts": [{"key": "prompt", "label": "生图提示词", "text": prompt.strip()}]}
        await self.record_cost(job, params, inputs)
        self.jobs[pid] = job
        self.save_jobs()
        task = asyncio.create_task(self.run_generation(
            job, user["id"], [source[0] for source in prepared], [source[1] for source in sources],
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
                    text_only=not images, output_size=tuple(map(int, job["requested_size"].split("x"))), **identity)
            elif images:
                result = await cloud_images.edit(self.app["session"], images, prompt,
                                                 size=job["requested_size"], quality=job["quality"],
                                                 model=job["modelName"], **identity)
            else:
                result = await cloud_images.generate(self.app["session"], prompt,
                                                     size=job["requested_size"], quality=job["quality"],
                                                     model=job["modelName"], **identity)
            job.update(request_id=result["request_id"], modelName=result["model"])
            if "image_bytes" not in result:
                raise cloud_images.ImageEditError(
                    "云端已返回图片链接，但未自动下载。请联系管理员确认结果，不要重复生成。",
                    request_id=result["request_id"], generation_unknown=True)
            await self.authorize_all(user_id, job["project"], refs)
            dimensions = tuple(map(int, job["requested_size"].split("x")))
            job["provider_size"] = f"{result['width']}x{result['height']}"
            job["output_resized"] = (result["width"], result["height"]) != dimensions
            data, info = await asyncio.to_thread(resize_image, result["image_bytes"], dimensions, crop=True)
            result.update(info, image_bytes=data)
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
