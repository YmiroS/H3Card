"""Bounded chat gateway; never retries and exposes only sanitized upstream diagnostics."""
import asyncio
import base64
import binascii
import copy
from io import BytesIO
import json
import logging
import os
import re
from urllib.parse import urlsplit

import aiohttp
from aiohttp import web
from PIL import Image, ImageOps

from . import cloud_images, provider_billing

MAX_REQUEST_BYTES = 24 * 1024 * 1024
MAX_TEXT_CHARS = 100_000
MAX_RESPONSE_BYTES = 2 * 1024 * 1024
CHAT_IMAGE_MAX_EDGE = 3840
CHAT_IMAGE_VERSION = "chat-image-3840-original-v3"


def prepare_chat_image(data):
    cloud_images.inspect_image(data)
    with Image.open(BytesIO(data)) as source:
        format = source.format
        image = ImageOps.exif_transpose(source)
        image.thumbnail((CHAT_IMAGE_MAX_EDGE, CHAT_IMAGE_MAX_EDGE), Image.Resampling.LANCZOS)
        options = {"quality": 95} if format == "JPEG" else {"lossless": True} if format == "WEBP" else {}
        output = BytesIO()
        image.save(output, format=format, **options)
        return output.getvalue()


def _prepare_inline_images(messages):
    result = None
    processed = {}
    for index, message in enumerate(messages):
        if not isinstance(message["content"], list):
            continue
        for part_index, part in enumerate(message["content"]):
            if part["type"] != "image_url" or not part["image_url"]["url"].startswith("data:"):
                continue
            if result is None:
                result = copy.deepcopy(messages)
            url = part["image_url"]["url"]
            if url not in processed:
                data = prepare_chat_image(base64.b64decode(url.split(",", 1)[1], validate=True))
                processed[url] = url.split(",", 1)[0] + "," + base64.b64encode(data).decode("ascii")
            result[index]["content"][part_index]["image_url"]["url"] = processed[url]
    return messages if result is None else result


class ChatError(Exception):
    def __init__(self, message, *, status=502, answer_unknown=False, request_id=None):
        super().__init__(message)
        self.status = status
        self.answer_unknown = answer_unknown
        self.request_id = request_id

    def response(self):
        result = {"error": str(self), "answer_unknown": self.answer_unknown, "retryable": False}
        if self.request_id:
            result["request_id"] = self.request_id
        return result


def load():
    try:
        config = json.loads(cloud_images.CONF.read_text(encoding="utf-8-sig")) if cloud_images.CONF.exists() else {}
    except (OSError, ValueError):
        raise ChatError("cloud-ai-config.json 读取失败，请管理员检查配置", status=503)
    if not isinstance(config, dict):
        raise ChatError("聊天配置必须为 JSON 对象", status=503)
    config = {"base_url": "http://30.245.124.125:8000/v1", "chat_model": "gpt-4o",
              "character_model": "gpt-6.1-sol", **config}
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


def validate(body, *, allow_local_images=False):
    def invalid():
        images = "base64 data URL 或画布资源 URL 静态图片" if allow_local_images else "base64 data URL 静态图片"
        raise ChatError("聊天输入无效：仅接受 messages、布尔型 stream、文本及 " + images, status=400)

    if (not isinstance(body, dict) or not {"messages"} <= set(body) <= {"messages", "stream"}
            or ("stream" in body and type(body["stream"]) is not bool)):
        invalid()
    messages = body["messages"]
    if not isinstance(messages, list) or not 1 <= len(messages) <= 100:
        invalid()
    text_chars = 0
    for message in messages:
        if (not isinstance(message, dict) or set(message) != {"role", "content"}
                or message["role"] not in ("system", "user", "assistant")):
            invalid()
        content = message["content"]
        if isinstance(content, str):
            if not content.strip():
                invalid()
            text_chars += len(content)
        elif isinstance(content, list) and content:
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
                    if not isinstance(value, str):
                        invalid()
                    if allow_local_images and value.startswith('/api/'):
                        from .creation_agent_images import local_image_reference
                        try:
                            local_image_reference(value)
                        except ValueError:
                            invalid()
                        continue
                    match = re.fullmatch(r"data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]*={0,2})", value)
                    if not match:
                        invalid()
                    try:
                        data = base64.b64decode(match[2], validate=True)
                    except (ValueError, binascii.Error):
                        invalid()
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


def _upstream_error(payload, *, config, messages, end_user_name, end_user_phone,
                    request_id, status=None, raw=b""):
    prompts, image_urls = [], []
    for message in messages:
        content = message["content"]
        if isinstance(content, str):
            prompts.append(content)
        else:
            for part in content:
                if part["type"] == "text":
                    prompts.append(part["text"])
                elif part["type"] == "image_url":
                    image_urls.append(part["image_url"]["url"])
    secrets = (config["api_key"], end_user_name, end_user_phone, *image_urls)
    if (not request_id or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", request_id)
            or config["api_key"] in request_id or request_id.lower().startswith("sk-")
            or any(value and (value == request_id or (len(value) >= 8 and value in request_id))
                   for value in (*secrets[1:], *prompts))):
        request_id = None
    error = cloud_images.provider_error_fields(payload)
    if raw:
        try:
            error = raw.decode("utf-8")
        except UnicodeError:
            pass
    detail = cloud_images.sanitize_error_detail(error, secrets=secrets, prompts=prompts) or "无可用错误详情"
    logging.getLogger(__name__).warning(
        "Cloud chat upstream error status=%s request_id=%r detail=%s", status, request_id, detail)
    kind = f"返回 HTTP {status}" if status is not None else "流式返回错误"
    receipt = f"，X-Request-ID: {request_id}" if request_id else ""
    return ChatError(f"云端聊天{kind}{receipt}：{detail}。请联系管理员核对，不要自动重试",
                     request_id=request_id)


async def _http_error(response, *, model, billing_state, **diagnostics):
    payload, raw = None, b""
    try:
        body = await cloud_images.read_limited(response, 16 * 1024)
        try:
            payload = provider_billing.loads(body)
        except (ValueError, UnicodeError):
            raw = body
        provider_billing.capture(billing_state, payload, model, diagnostics["config"])
    except (cloud_images.ImageEditError, ValueError, UnicodeError, OSError, RecursionError,
            aiohttp.ClientError, asyncio.TimeoutError):
        pass
    return _upstream_error(payload, raw=raw, status=response.status,
                           request_id=response.headers.get("X-Request-ID"), **diagnostics)


async def complete(session, messages, *, end_user_name, end_user_phone, model=None, max_tokens=None,
                   billing_state=None):
    config = load()
    model = config["chat_model"] if model is None else model
    billing_state = {} if billing_state is None else billing_state
    provider_billing.capture(billing_state, {}, model, config)
    if not isinstance(model, str) or not model.strip() or any(ord(c) < 33 for c in model):
        raise ChatError("聊天模型配置无效", status=503)
    messages = await asyncio.to_thread(_prepare_inline_images, messages)
    body = {"model": model, "messages": messages, "stream": False}
    if max_tokens is not None:
        if type(max_tokens) is not int or not 1 <= max_tokens <= 100000:
            raise ChatError("聊天 token 限制无效", status=503)
        body["max_tokens"] = max_tokens
    diagnostics = {"config": config, "messages": messages,
                   "end_user_name": end_user_name, "end_user_phone": end_user_phone}
    try:
        async with session.post(
                config["base_url"].rstrip("/") + "/chat/completions",
                json=body,
                headers={"Authorization": f"Bearer {config['api_key']}",
                         "X-End-User-Name": end_user_name,
                         "X-End-User-Phone": end_user_phone},
                proxy=None, allow_redirects=False,
                timeout=aiohttp.ClientTimeout(total=None, connect=10, sock_connect=10, sock_read=300)) as response:
            if not 200 <= response.status < 300:
                raise await _http_error(response, model=model, billing_state=billing_state, **diagnostics)
            raw = bytearray()
            async for chunk in response.content.iter_chunked(65536):
                raw.extend(chunk)
                if len(raw) > MAX_RESPONSE_BYTES:
                    raise ChatError("云端聊天响应超过大小限制")
            try:
                payload = provider_billing.loads(raw)
            except (ValueError, UnicodeError):
                payload = None
            provider_billing.capture(billing_state, payload, model, config)
            request_id = response.headers.get("X-Request-ID")
    except (aiohttp.ClientError, asyncio.TimeoutError):
        raise ChatError("请求未完成，回答状态可能未知。不要自动重试，请联系管理员确认。",
                        status=504, answer_unknown=True)
    try:
        content = payload["choices"][0]["message"]["content"]
        if not isinstance(content, str):
            raise ValueError()
    except (ValueError, UnicodeError, KeyError, IndexError, TypeError):
        raise ChatError("云端聊天响应格式无效，请联系管理员确认，不要自动重试")
    # 只允许不透明的请求标识，不反射任意上游响应头。
    if not request_id or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", request_id) or config["api_key"] in request_id:
        request_id = None
    return {"content": content, "model": billing_state["model"], "request_id": request_id}


def _stream_frame(frame):
    lines = frame.decode("utf-8").splitlines()
    error_event = any(line.startswith("event:") and line[6:].strip() == "error" for line in lines)
    data = "\n".join(line[5:].lstrip(" ") for line in lines if line.startswith("data:"))
    return data, error_event


async def stream(session, request, messages, *, end_user_name, end_user_phone, billing_state=None):
    config = load()
    model = config["chat_model"]
    billing_state = {} if billing_state is None else billing_state
    provider_billing.capture(billing_state, {}, model, config)
    billing_state["status"] = "running"
    if not isinstance(model, str) or not model.strip() or any(ord(c) < 33 for c in model):
        raise ChatError("聊天模型配置无效", status=503)
    messages = await asyncio.to_thread(_prepare_inline_images, messages)
    diagnostics = {"config": config, "messages": messages,
                   "end_user_name": end_user_name, "end_user_phone": end_user_phone}
    downstream = web.StreamResponse(
        headers={"Content-Type": "text/event-stream; charset=utf-8",
                 "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})
    started = False
    try:
        async with session.post(
                config["base_url"].rstrip("/") + "/chat/completions",
                json={"model": model, "messages": messages, "stream": True},
                headers={"Authorization": f"Bearer {config['api_key']}",
                         "X-End-User-Name": end_user_name,
                         "X-End-User-Phone": end_user_phone},
                proxy=None, allow_redirects=False,
                timeout=aiohttp.ClientTimeout(total=None, connect=10, sock_connect=10, sock_read=300)) as upstream:
            if not 200 <= upstream.status < 300:
                raise await _http_error(upstream, model=model, billing_state=billing_state, **diagnostics)
            if upstream.content_type != "text/event-stream":
                try:
                    raw = await cloud_images.read_limited(upstream, MAX_RESPONSE_BYTES)
                    provider_billing.capture(billing_state, provider_billing.loads(raw), model, config)
                except (cloud_images.ImageEditError, ValueError, UnicodeError):
                    pass
                raise ChatError("云端聊天流式响应格式无效，请联系管理员确认，不要自动重试")
            await downstream.prepare(request)
            started = True
            size = 0
            pending = bytearray()
            finished = False
            async for chunk in upstream.content.iter_chunked(65536):
                size += len(chunk)
                if size > MAX_RESPONSE_BYTES:
                    raise ChatError("云端聊天响应超过大小限制")
                pending.extend(chunk)
                while True:
                    boundaries = [(index, len(separator)) for separator in (b"\n\n", b"\r\n\r\n", b"\r\r")
                                  if (index := pending.find(separator)) >= 0]
                    if not boundaries:
                        break
                    index, length = min(boundaries)
                    frame = bytes(pending[:index])
                    del pending[:index + length]
                    try:
                        data, error_event = _stream_frame(frame)
                        if not data:
                            if error_event:
                                raise _upstream_error(None,
                                    request_id=upstream.headers.get("X-Request-ID"), **diagnostics)
                            continue
                        if data == "[DONE]" and not error_event:
                            finished = True
                            billing_state["status"] = "done"
                            await downstream.write(b"data: [DONE]\n\n")
                            break
                        try:
                            payload = provider_billing.loads(data)
                        except (ValueError, UnicodeError):
                            if error_event:
                                raise _upstream_error(None, raw=data.encode("utf-8"),
                                    request_id=upstream.headers.get("X-Request-ID"), **diagnostics) from None
                            raise
                        provider_billing.capture(billing_state, payload, model, config)
                        if (error_event or isinstance(payload, dict) and ("error" in payload
                                or "choices" not in payload and any(key in payload for key in ("message", "detail")))):
                            raise _upstream_error(payload,
                                request_id=upstream.headers.get("X-Request-ID"), **diagnostics)
                        if (isinstance(payload, dict) and "choices" not in payload
                                and ("usage" in payload or "cost" in payload)):
                            continue
                        choices = payload["choices"]
                        if not isinstance(choices, list):
                            raise ValueError()
                        if not choices:
                            continue
                        choice = choices[0]
                        if not isinstance(choice, dict):
                            raise ValueError()
                        delta = choice["delta"]
                        if not isinstance(delta, dict):
                            raise ValueError()
                        content = delta.get("content")
                        reason = choice.get("finish_reason")
                        if ((content is not None and not isinstance(content, str))
                                or (reason is not None and reason not in
                                    ("stop", "length", "content_filter", "tool_calls"))):
                            raise ValueError()
                        safe_choice = {"delta": {"content": content}}
                        if reason is not None:
                            safe_choice["finish_reason"] = reason
                        safe_frame = {"choices": [safe_choice]}
                    except (ValueError, UnicodeError, KeyError, IndexError, TypeError):
                        raise ChatError("云端聊天流式响应格式无效，请联系管理员确认，不要自动重试")
                    await downstream.write(("data: " + json.dumps(safe_frame, ensure_ascii=False,
                                                               separators=(",", ":")) + "\n\n").encode("utf-8"))
                if finished:
                    break
            if not finished:
                # EOF 仍视为未完成；仅抢救已完整收到、但缺少帧分隔符的扣费证据。
                if pending:
                    try:
                        data, _ = _stream_frame(bytes(pending))
                        if data and data != "[DONE]":
                            provider_billing.capture(billing_state, provider_billing.loads(data), model, config)
                    except (ValueError, UnicodeError):
                        pass
                raise ChatError("云端聊天流式响应未完成，请勿自动重试")
    except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
        billing_state["status"] = "error"
        error = ChatError("请求未完成，回答状态可能未知。不要自动重试，请联系管理员确认。",
                          status=504, answer_unknown=True)
        if not started:
            raise error from exc
        await downstream.write(("event: error\ndata: " + json.dumps(error.response(), ensure_ascii=False)
                                + "\n\n").encode("utf-8"))
    except ChatError as error:
        billing_state["status"] = "error"
        if not started:
            raise
        await downstream.write(("event: error\ndata: " + json.dumps(error.response(), ensure_ascii=False)
                                + "\n\n").encode("utf-8"))
    await downstream.write_eof()
    return downstream
