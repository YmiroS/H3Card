"""Authenticated synchronous HTTP chat, independent of canvas resources."""
import asyncio
import json

from aiohttp import web

from . import cloud_chat
from .auth import require_user


async def completions(request):
    require_user(request)
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
        messages = await asyncio.to_thread(cloud_chat.validate, body)
        result = await cloud_chat.complete(request.app["session"], messages)
        return web.json_response(result)
    except cloud_chat.ChatError as error:
        return web.json_response(error.response(), status=error.status)


def register_chat_routes(app):
    app.router.add_post("/api/chat/completions", completions)
