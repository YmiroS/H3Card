"""Bounded, non-streaming chat gateway; never retries or exposes upstream errors."""
import asyncio
import base64
import binascii
import json
import os
import re
from urllib.parse import urlsplit

import aiohttp

from . import cloud_images

MAX_REQUEST_BYTES = 24 * 1024 * 1024
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_TOTAL_IMAGE_BYTES = 15 * 1024 * 1024
MAX_TEXT_CHARS = 100_000
MAX_RESPONSE_BYTES = 2 * 1024 * 1024


class ChatError(Exception):
    def __init__(self, message, *, status=502, answer_unknown=False):
        super().__init__(message)
        self.status = status
        self.answer_unknown = answer_unknown

    def response(self):
        return {"error": str(self), "answer_unknown": self.answer_unknown, "retryable": False}


def load():
    try:
        config = json.loads(cloud_images.CONF.read_text(encoding="utf-8-sig")) if cloud_images.CONF.exists() else {}
    except (OSError, ValueError):
        raise ChatError("cloud-ai-config.json 读取失败，请管理员检查配置", status=503)
    if not isinstance(config, dict):
        raise ChatError("聊天配置必须为 JSON 对象", status=503)
    config = {"base_url": "http://30.245.124.125:8000/v1", "chat_model": "gpt-4o", **config}
    config["api_key"] = os.environ.get("CHOUKA_IMAGE_API_KEY") or config.get("api_key")
    if config.get("enabled", True) is not True or not all(
            isinstance(config.get(k), str) and config[k].strip()
            for k in ("base_url", "api_key", "chat_model")):
        raise ChatError("云端聊天未配置，请管理员检查配置", status=503)
    try:
        url = urlsplit(config["base_url"])
        valid = (url.scheme in ("http", "https") and url.hostname and not url.username
                 and not url.password and not url.query and not url.fragment)
        url.port
    except ValueError:
        valid = False
    if not valid or any(ord(c) < 33 or ord(c) == 127 for c in config["base_url"] + config["api_key"]):
        raise ChatError("云端聊天配置格式无效", status=503)
    return config


def validate(body):
    def invalid():
        raise ChatError("聊天输入无效：仅接受 messages、文本及 base64 data URL 静态图片", status=400)

    if not isinstance(body, dict) or set(body) != {"messages"}:
        invalid()
    messages = body["messages"]
    if not isinstance(messages, list) or not 1 <= len(messages) <= 100:
        invalid()
    text_chars = image_bytes = image_count = 0
    for message in messages:
        if (not isinstance(message, dict) or set(message) != {"role", "content"}
                or message["role"] not in ("system", "user", "assistant")):
            invalid()
        content = message["content"]
        if isinstance(content, str):
            if not content.strip():
                invalid()
            text_chars += len(content)
        elif isinstance(content, list) and 1 <= len(content) <= 32:
            for part in content:
                if not isinstance(part, dict):
                    invalid()
                if part.get("type") == "text" and set(part) == {"type", "text"}:
                    if not isinstance(part["text"], str) or not part["text"].strip():
                        invalid()
                    text_chars += len(part["text"])
                elif part.get("type") == "image_url" and set(part) == {"type", "image_url"}:
                    image = part["image_url"]
                    if (message["role"] != "user" or not isinstance(image, dict)
                            or not {"url"} <= set(image) <= {"url", "detail"}
                            or image.get("detail", "auto") not in ("auto", "low", "high")):
                        invalid()
                    value = image["url"]
                    if not isinstance(value, str) or len(value) > 4 * ((MAX_IMAGE_BYTES + 2) // 3) + 32:
                        invalid()
                    match = re.fullmatch(r"data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]*={0,2})", value)
                    if not match:
                        invalid()
                    try:
                        data = base64.b64decode(match[2], validate=True)
                    except (ValueError, binascii.Error):
                        invalid()
                    image_count += 1
                    image_bytes += len(data)
                    if len(data) > MAX_IMAGE_BYTES or image_bytes > MAX_TOTAL_IMAGE_BYTES or image_count > 8:
                        raise ChatError("聊天图片超限：单张 5 MiB，总计 15 MiB，最多 8 张", status=413)
                    try:
                        info = cloud_images.inspect_image(data)
                    except cloud_images.ImageEditError:
                        invalid()
                    if info["mime"] != match[1]:
                        invalid()
                else:
                    invalid()
        else:
            invalid()
        if text_chars > MAX_TEXT_CHARS:
            raise ChatError("聊天文本总计不得超过 100000 字符", status=413)
    return messages


async def complete(session, messages):
    config = load()
    try:
        async with session.post(
                config["base_url"].rstrip("/") + "/chat/completions",
                json={"model": config["chat_model"], "messages": messages, "stream": False},
                headers={"Authorization": f"Bearer {config['api_key']}"},
                proxy=None, allow_redirects=False,
                timeout=aiohttp.ClientTimeout(total=None, connect=10, sock_connect=10, sock_read=300)) as response:
            if not 200 <= response.status < 300:
                raise ChatError(f"云端聊天返回 HTTP {response.status}，请联系管理员核对，不要自动重试")
            raw = bytearray()
            async for chunk in response.content.iter_chunked(65536):
                raw.extend(chunk)
                if len(raw) > MAX_RESPONSE_BYTES:
                    raise ChatError("云端聊天响应超过大小限制")
            request_id = response.headers.get("X-Request-ID")
    except (aiohttp.ClientError, asyncio.TimeoutError):
        raise ChatError("请求未完成，回答状态可能未知。不要自动重试，请联系管理员确认。",
                        status=504, answer_unknown=True)
    try:
        payload = json.loads(raw)
        content = payload["choices"][0]["message"]["content"]
        if not isinstance(content, str):
            raise ValueError()
    except (ValueError, UnicodeError, KeyError, IndexError, TypeError):
        raise ChatError("云端聊天响应格式无效，请联系管理员确认，不要自动重试")
    # Only opaque request identifiers are safe; never reflect arbitrary header text.
    if not request_id or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", request_id) or config["api_key"] in request_id:
        request_id = None
    return {"content": content, "model": config["chat_model"], "request_id": request_id}
