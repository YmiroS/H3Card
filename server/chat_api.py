"""认证聊天入口；请求级费用与项目归属只由服务端校验。"""
import asyncio
import base64
import binascii
import json
import logging
import re
import time
import uuid

from aiohttp import web

from . import cloud_chat, cloud_images, provider_billing
from .auth import require_project, require_user
from .project_repository import InvalidProjectId


async def billing_context(request, body):
    context = body.get("billing_context", {"scene": "chat"})
    if (not isinstance(context, dict) or not {"scene"} <= set(context) <= {"scene", "project_id", "card_id"}
            or context.get("scene") not in ("creation_agent", "reference_analysis", "chat")):
        raise cloud_chat.ChatError("费用上下文无效", status=400)
    for key in ("project_id", "card_id"):
        if key in context and (not isinstance(context[key], str) or not 1 <= len(context[key]) <= 512
                               or not context[key].replace("-", "").replace("_", "").isalnum()):
            raise cloud_chat.ChatError("费用上下文标识无效", status=400)
    project_id, card_id = context.get("project_id", ""), context.get("card_id", "")
    if context["scene"] == "creation_agent" and not project_id:
        raise cloud_chat.ChatError("创作助手必须指定画布", status=400)
    if card_id and not project_id:
        raise cloud_chat.ChatError("卡片归属必须包含画布", status=400)
    result = {"scene": context["scene"], "project_id": project_id, "card_id": card_id,
              "project_name": "", "card_name": ""}
    if project_id:
        await require_project(request, project_id)
        repository = request.app.get("project_repository")
        if repository is None:
            raise web.HTTPServiceUnavailable(text="画布服务尚未配置")
        try:
            project = await asyncio.to_thread(repository.read, project_id)
        except (FileNotFoundError, InvalidProjectId):
            raise web.HTTPNotFound(text="画布不存在")
        # ACL 负责权限，项目名称及卡片归属来自服务端项目文档，而非客户端上下文。
        result["project_name"] = project.get("name", "")
        if card_id:
            card = next((card for card in project.get("cards", [])
                         if isinstance(card, dict) and card.get("id") == card_id), None)
            if card is None:
                raise web.HTTPNotFound(text="卡片不存在或不属于当前画布")
            result["card_name"] = card.get("title") or card.get("name") or ""
    for key in ("project_name", "card_name"):
        value = result[key]
        result[key] = value[:200] if isinstance(value, str) else ""
    return result


async def record_request(ledger, *, job_id, user_id, created_at, context, state, status):
    try:
        await asyncio.to_thread(
            ledger.record_provider_api, job_id=job_id, event_kind="api", capability="chat",
            model=state.get("model"), created_at=created_at, status=status,
            provider_billing=state.get("provider_billing"),
            usage=state.get("usage", provider_billing.normalize_usage({})), user_id=user_id,
            model_source=state.get("model_source", "unknown"), **context)
    except Exception:
        # 写账失败不能改变已完成的回答或 SSE 合同，也不能暴露响应和凭据。
        logging.getLogger(__name__).error("聊天费用写入失败 request_id=%s", job_id)


async def completions(request):
    user = require_user(request)
    try:
        if request.content_type != "application/json":
            raise cloud_chat.ChatError("请求必须为 JSON 对象", status=400)
        raw = bytearray()
        async for chunk in request.content.iter_chunked(65536):
            raw.extend(chunk)
            if len(raw) > cloud_chat.MAX_REQUEST_BYTES:
                raise cloud_chat.ChatError("聊天请求不得超过 24 MiB", status=413)
        try:
            body = json.loads(raw)
        except (ValueError, UnicodeError):
            raise cloud_chat.ChatError("请求必须为有效 JSON 对象", status=400)
        if not isinstance(body, dict):
            raise cloud_chat.ChatError("请求必须为 JSON 对象", status=400)
        context = await billing_context(request, body)
        creation_agent = context["scene"] == "creation_agent"
        messages = await asyncio.to_thread(
            cloud_chat.validate, {key: value for key, value in body.items() if key != "billing_context"},
            allow_local_images=creation_agent)
        source_messages = messages
        image_service = None
        if creation_agent and any(isinstance(message["content"], list) and any(
                part["type"] == "image_url" and part["image_url"]["url"].startswith("/api/")
                for part in message["content"]) for message in messages):
            image_service = request.app.get("creation_agent_images")
            if image_service is None:
                raise cloud_chat.ChatError("创作助手图片存储未配置，请联系管理员", status=503)
            messages = await image_service.prepare(request, context["project_id"], messages)
        # 不使用会话 ID、上游 ID 或前端传入的 ID，每个认证请求恰有一个归账标识。
        job_id, created_at = uuid.uuid4().hex, time.time()
        ledger = request.app.get("costs")
        user_id = user.get("id", "")
        state, status = {}, "error"
        if ledger:
            if not user_id:
                raise web.HTTPUnauthorized(text="认证用户标识缺失")
            await asyncio.to_thread(ledger.bind_attribution, job_id, user_id)
        try:
            # Uploads and billing IO can outlive ACL changes. Recheck all original
            # references immediately before either provider dispatch path.
            if image_service is not None:
                await require_project(request, context["project_id"], operate=True)
                await image_service.authorize(request, context["project_id"], source_messages)
            if body.get("stream") is True:
                result = await cloud_chat.stream(request.app["session"], request, messages,
                                                end_user_name=user["username"], end_user_phone=user["phone"],
                                                billing_state=state)
                status = "done" if state.get("status") == "done" else "error"
                return result
            result = await cloud_chat.complete(request.app["session"], messages,
                                               end_user_name=user["username"], end_user_phone=user["phone"],
                                               billing_state=state)
            status = "done"
            return web.json_response(result)
        except (asyncio.CancelledError, ConnectionResetError, BrokenPipeError):
            status = "canceled"
            raise
        finally:
            if ledger:
                await asyncio.shield(record_request(ledger, job_id=job_id, user_id=user_id,
                                                    created_at=created_at, context=context,
                                                    state=state, status=status))
    except cloud_chat.ChatError as error:
        return web.json_response(error.response(), status=error.status)


async def image_edits(request):
    user = require_user(request)
    try:
        if request.content_type != "application/json":
            raise cloud_images.ImageEditError("请求必须为 JSON 对象", status=400)
        raw = bytearray()
        async for chunk in request.content.iter_chunked(65536):
            raw.extend(chunk)
            if len(raw) > cloud_chat.MAX_REQUEST_BYTES:
                raise cloud_images.ImageEditError("图片编辑请求不得超过 24 MiB", status=413)
        try:
            body = json.loads(raw)
        except (ValueError, UnicodeError):
            raise cloud_images.ImageEditError("请求必须为有效 JSON 对象", status=400)
        image, prompt = validate_image_edit(body)
        result = await cloud_images.edit(request.app["session"], [image], prompt,
                                         end_user_name=user["username"], end_user_phone=user["phone"])
        return web.json_response(serialize_image_edit(result))
    except cloud_images.ImageEditError as error:
        return web.json_response(error.response(), status=error.status)


def validate_image_edit(body):
    if not isinstance(body, dict) or set(body) != {"image", "prompt"}:
        raise cloud_images.ImageEditError("图片编辑请求只能包含 image 与 prompt", status=400)
    value = body["image"]
    prompt = body["prompt"]
    if not isinstance(value, str) or not isinstance(prompt, str):
        raise cloud_images.ImageEditError("image 必须是 data URL，prompt 必须是字符串", status=400)
    match = re.fullmatch(r"data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]*={0,2})", value)
    if not match:
        raise cloud_images.ImageEditError("image 仅支持 PNG、JPEG、WebP 的 base64 data URL", status=400)
    try:
        data = base64.b64decode(match[2], validate=True)
    except (ValueError, binascii.Error):
        raise cloud_images.ImageEditError("image Base64 校验失败", status=400)
    try:
        info = cloud_images.inspect_image(data)
    except cloud_images.ImageEditError:
        raise cloud_images.ImageEditError("image 不是有效图片", status=400)
    if info["mime"] != match[1]:
        raise cloud_images.ImageEditError("image 声明的 MIME 与实际图片不符", status=400)
    return data, prompt


def serialize_image_edit(result):
    payload = {"model": result["model"], "request_id": result["request_id"]}
    if "image_bytes" in result:
        payload["image"] = ("data:" + result["mime"] + ";base64,"
                            + base64.b64encode(result["image_bytes"]).decode("ascii"))
        payload["width"] = result["width"]
        payload["height"] = result["height"]
    else:
        payload["url"] = result["result_url"]
    return payload


def register_chat_routes(app):
    app.router.add_post("/api/chat/completions", completions)
    app.router.add_post("/api/images/edits", image_edits)
