"""Synchronous character analysis/age previews from an explicit, registered working base."""
import asyncio
import base64
import hashlib
from io import BytesIO
import json
import re

from aiohttp import web
from PIL import Image

from . import cloud_banana, cloud_chat, cloud_images
from .auth import require_user
from .character_profile import ANALYSIS_PROMPT, age_prompt, validate_profile
from .cloud_lighting import lighting_size
from .texture_api import TextureApi

BASE_FIELDS = {"project", "card", "working_base_ref", "expected_source"}
AGE_FIELDS = BASE_FIELDS | {"profile", "profile_confirmed", "profile_source_digest", "target_age",
                            "hair_policy", "beard_policy", "provider", "megapixels"}


def analysis_image(data):
    """A separate bounded JPEG for chat, never the image-generation source."""
    with Image.open(BytesIO(data)) as source:
        source.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
        image = source.convert("RGB")
    while True:
        output = BytesIO()
        image.save(output, format="JPEG", quality=85)
        encoded = output.getvalue()
        if len(encoded) <= cloud_chat.MAX_IMAGE_BYTES:
            return encoded
        if max(image.size) <= 64:
            raise cloud_chat.ChatError("分析图片压缩后仍超过聊天限制", status=413)
        image.thumbnail((max(1, image.width // 2), max(1, image.height // 2)), Image.Resampling.LANCZOS)


def generation_image(data, size):
    width, height = map(int, size.split("x"))
    # Same pixel budget as the shared lighting control (16 Mi pixels at most).
    if width < 16 or height < 16 or width % 16 or height % 16 or width * height > 16 * 1024 * 1024:
        raise web.HTTPBadRequest(text="年龄编辑尺寸超过网关像素限制")
    with Image.open(BytesIO(data)) as image:
        image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        image = image.resize((width, height), Image.Resampling.LANCZOS)
        output = BytesIO()
        image.save(output, format="PNG")
    result = output.getvalue()
    cloud_images.inspect_image(result)
    return result


class CharacterApi(TextureApi):
    async def body(self, request, *, age=False):
        require_user(request)
        try:
            if request.content_type != "application/json":
                raise ValueError()
            body = await request.json()
        except (ValueError, UnicodeError):
            raise web.HTTPBadRequest(text="请求必须为 JSON 对象")
        if (not isinstance(body, dict) or set(body) != (AGE_FIELDS if age else BASE_FIELDS)
                or not all(isinstance(body[key], str) and re.fullmatch(r"[A-Za-z0-9_-]{1,128}", body[key])
                           for key in ("project", "card"))):
            raise web.HTTPBadRequest(text="角色编辑请求字段无效")
        if age:
            try:
                validate_profile(body["profile"])
            except ValueError as error:
                raise web.HTTPBadRequest(text=str(error))
            digest = body["profile_source_digest"]
            if (body["profile_confirmed"] is not True
                    or body["profile"]["view_context"]["subject"] not in ("single", "same_character_views")
                    or type(body["target_age"]) is not int or not 12 <= body["target_age"] <= 100
                    or body["hair_policy"] not in ("preserve", "natural_gray")
                    or body["beard_policy"] not in ("adapt", "preserve", "remove")
                    or body["provider"] not in ("gpt_image", "banana")
                    or (digest is not None and (not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest)))):
                raise web.HTTPBadRequest(text="请确认单一角色档案、12–100 整数年龄及有效发色/胡须/模型策略")
            # Validate the control for both providers; Banana intentionally ignores requested size.
            lighting_size({"width": 1, "height": 1}, body["megapixels"])
        return body

    async def analyze(self, request):
        try:
            body = await self.body(request)
            version, _, _, data, ref, _ = await self.context(request, body)
            digest = hashlib.sha256(data).hexdigest()
            config = cloud_chat.load()
            model = config["character_model"]
            if not isinstance(model, str) or not model.strip():
                raise cloud_chat.ChatError("角色解析模型未配置，请管理员检查 character_model", status=503)
            thumbnail = await asyncio.to_thread(analysis_image, data)
            messages = [{"role": "system", "content": ANALYSIS_PROMPT},
                        {"role": "user", "content": [
                            {"type": "text", "text": "请按规定 JSON 结构分析这张当前工作底图。"},
                            {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," +
                             base64.b64encode(thumbnail).decode("ascii")}}]}]
            await asyncio.to_thread(cloud_chat.validate, {"messages": messages})
            await self.check_context(request, body["project"], body["card"], version, ref)
            user = require_user(request)
            result = await cloud_chat.complete(self.app["session"], messages,
                                               model=model, max_tokens=8000,
                                               end_user_name=user["username"], end_user_phone=user["phone"])
            async with self.app["project_locks"][body["project"]]:
                await self.check_context(request, body["project"], body["card"], version, ref)
                try:
                    profile = validate_profile(json.loads(result["content"]))
                except (ValueError, TypeError):
                    return web.json_response({"error": "角色分析返回的 JSON 档案结构无效，请人工确认，不要自动重试",
                                              "request_id": result["request_id"], "retryable": False}, status=502)
                return web.json_response({"profile": profile, "source_digest": digest,
                                          "request_id": result["request_id"], "model": result["model"]})
        except cloud_chat.ChatError as error:
            return web.json_response(error.response(), status=error.status)
        except cloud_images.ImageEditError as error:
            return web.json_response(error.response(), status=error.status)
        except web.HTTPException as error:
            return web.json_response({"error": error.text, "retryable": False}, status=error.status)

    async def age(self, request):
        try:
            body = await self.body(request, age=True)
            project_id, card_id = body["project"], body["card"]
            version, _, _, data, ref, info = await self.context(request, body)
            digest = hashlib.sha256(data).hexdigest()
            if body["profile_source_digest"] is not None and body["profile_source_digest"] != digest:
                raise web.HTTPConflict(text="档案与当前工作底图不匹配，请重新分析或明确人工确认")
            prompt = age_prompt(body["profile"], body["target_age"], body["hair_policy"], body["beard_policy"])
            provider = body["provider"]
            if provider == "gpt_image":
                cloud_images.load()
                size = lighting_size(info, body["megapixels"])
                generation_base = await asyncio.to_thread(generation_image, data, size)
            else:
                cloud_banana.load()
                generation_base = data
            await self.check_context(request, project_id, card_id, version, ref)
            user = require_user(request)
            identity = {"end_user_name": user["username"], "end_user_phone": user["phone"]}
            if provider == "banana":
                result = await cloud_banana.generate(self.app["session"], [generation_base], prompt, **identity)
            else:
                result = await cloud_images.edit(self.app["session"], [generation_base], prompt, size=size, **identity)
            async with self.app["project_locks"][project_id]:
                try:
                    await self.check_context(request, project_id, card_id, version, ref)
                except web.HTTPException as error:
                    return web.json_response({"error": error.text, "request_id": result["request_id"],
                                              "retryable": False}, status=error.status)
                response = {"image": None, "source_digest": digest,
                            "request_id": result["request_id"], "model": result["model"]}
                if result.get("result_url"):
                    return web.json_response({**response, "warning":
                        "服务返回外部图片链接，未自动下载或发送调用 Key；请管理员确认获取方式，不要重复生成"})
                response["image"] = await self.save_preview(request, project_id, ref, result,
                                                            prefix="character", origin="角色年龄编辑预览")
                return web.json_response(response)
        except cloud_images.ImageEditError as error:
            return web.json_response(error.response(), status=error.status)
        except web.HTTPException as error:
            return web.json_response({"error": error.text, "retryable": False}, status=error.status)


def register_character_routes(app, **dependencies):
    api = CharacterApi(app, **dependencies)
    app.router.add_post("/api/character/analyze", api.analyze)
    app.router.add_post("/api/character/age", api.age)
