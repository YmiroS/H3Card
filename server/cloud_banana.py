"""Nano Banana Pro generation through the chat endpoint; never retries generation requests."""
import asyncio
import base64
import binascii
import json
import logging
import os
import re
from urllib.parse import urlsplit

import aiohttp

from . import cloud_images

# 实测单次响应 4–11 MB（两张候选图 base64 内嵌在 content 里），上限留约 3 倍余量。
MAX_RESPONSE_BYTES = 32 * 1024 * 1024
DATA_URI = re.compile(r"data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)")


class BananaError(cloud_images.ImageEditError):
    """云端 Banana 出图失败；与图片编辑共用错误响应契约，供任务层统一处理。"""


def load():
    try:
        config = json.loads(cloud_images.CONF.read_text(encoding="utf-8-sig")) if cloud_images.CONF.exists() else {}
    except (OSError, ValueError):
        raise BananaError("cloud-ai-config.json 读取失败，请管理员检查配置", status=503)
    if not isinstance(config, dict):
        raise BananaError("云端出图配置必须是 JSON 对象", status=503)
    config = {"base_url": "http://30.245.124.125:8000/v1",
              "banana_model": "gemini-3-pro-image", "banana_timeout_seconds": 450, **config}
    config["api_key"] = os.environ.get("CHOUKA_IMAGE_API_KEY") or config.get("api_key")
    if config.get("enabled", True) is not True or not config.get("api_key"):
        raise BananaError("云端出图未配置，请管理员设置 cloud-ai-config.json 或 CHOUKA_IMAGE_API_KEY", status=503)
    try:
        timeout = float(config["banana_timeout_seconds"])
        if not 30 <= timeout <= 1200:
            raise ValueError()
    except (TypeError, ValueError):
        raise BananaError("banana_timeout_seconds 必须为 30–1200 之间的数值", status=503)
    config["banana_timeout_seconds"] = timeout
    try:
        url = urlsplit(config["base_url"])
        valid_url = (url.scheme in ("http", "https") and url.hostname
                     and not url.username and not url.password and not url.query and not url.fragment)
        url.port
    except ValueError:
        valid_url = False
    if not valid_url or any(ord(c) < 33 for c in config["base_url"]):
        raise BananaError("云端出图 base_url 无效", status=503)
    if (not isinstance(config.get("banana_model"), str) or not config["banana_model"].strip()
            or any(ord(c) < 33 for c in config["banana_model"])):
        raise BananaError("banana_model 配置无效", status=503)
    if any(ord(c) < 33 for c in config["api_key"]):
        raise BananaError("云端出图 API Key 格式无效", status=503)
    return config


def build_messages(images, infos, prompt):
    content = [{"type": "text", "text": prompt}]
    for data, info in zip(images, infos):
        encoded = base64.b64encode(data).decode("ascii")
        content.append({"type": "image_url",
                        "image_url": {"url": f"data:{info['mime']};base64,{encoded}"}})
    return [{"role": "user", "content": content}]


def extract_image(text, request_id):
    compact = re.sub(r"\s+", "", text)
    matches = DATA_URI.findall(compact)
    if not matches:
        raise BananaError("模型只返回了说明文字、没有图片，请联系管理员确认提示词或模型状态",
                          request_id=request_id)
    if len(matches) > 1:
        logging.getLogger(__name__).info(
            "Cloud banana returned %s image candidates, using the first", len(matches))
    try:
        data = base64.b64decode(matches[0][1], validate=True)
    except (ValueError, binascii.Error):
        raise BananaError("云端图片 Base64 校验失败", request_id=request_id)
    try:
        info = cloud_images.inspect_image(data)
    except cloud_images.ImageEditError:
        raise BananaError("云端返回的内容不是有效图片", request_id=request_id)
    return {**info, "image_bytes": data}


async def generate(session, images, prompt, *, end_user_name, end_user_phone):
    config = load()
    if not isinstance(prompt, str) or not 1 <= len(prompt.strip()) <= 20000:
        raise BananaError("图片编辑提示词不能为空，且不得超过 20000 字符", status=400)
    if not isinstance(images, (list, tuple)) or not 1 <= len(images) <= 8:
        raise BananaError("图片编辑需要 1 到 8 张有序输入图片", status=400)
    infos = [await asyncio.to_thread(cloud_images.inspect_image, data) for data in images]
    # 2026-11-05 实测 google.image_config.image_size 顶层与 extra_body 两种写法都不改变输出尺寸，
    # 按内网当前行为不传档位参数，尺寸跟随输入图。
    body = {"model": config["banana_model"], "modalities": ["IMAGE"],
            "messages": build_messages(images, infos, prompt.strip()), "stream": False}
    request_id = None
    try:
        async with session.post(
                config["base_url"].rstrip("/") + "/chat/completions", json=body,
                headers={"Authorization": f"Bearer {config['api_key']}",
                         "X-End-User-Name": end_user_name,
                         "X-End-User-Phone": end_user_phone},
                allow_redirects=False, proxy=None,
                timeout=aiohttp.ClientTimeout(total=None, connect=10, sock_connect=10,
                                              sock_read=config["banana_timeout_seconds"])) as response:
            request_id = response.headers.get("X-Request-ID", "")[:200] or None
            if not 200 <= response.status < 300:
                detail = "无可用结构化错误详情"
                try:
                    payload = json.loads(await cloud_images.read_limited(response, 16 * 1024))
                    error = payload.get("error", payload.get("detail", payload.get("message"))) if isinstance(payload, dict) else None
                    if isinstance(error, dict):
                        error = "; ".join(f"{key}={error[key]}" for key in ("message", "type", "param", "code")
                                          if isinstance(error.get(key), str))
                    if isinstance(error, str) and error.strip():
                        detail = error.replace(config["api_key"], "[redacted]").replace(prompt.strip(), "[prompt redacted]")
                        detail = re.sub(r"(?i)\bBearer\s+[^\s\"'<>;,]+|\bsk-[A-Za-z0-9_-]+", "[credential redacted]", detail)
                        detail = re.sub(r"data:[^\s\"'<>]+|[A-Za-z0-9+/=_-]{80,}", "[data redacted]", detail)
                        detail = re.sub(r"[\x00-\x1f\x7f]", " ", detail)[:512]
                except (cloud_images.ImageEditError, ValueError, UnicodeError, aiohttp.ClientError, asyncio.TimeoutError):
                    pass
                logging.getLogger(__name__).warning(
                    "Cloud banana HTTP %s request_id=%r detail=%s", response.status, request_id, detail)
                raise BananaError(f"云端 Banana 出图返回 HTTP {response.status}，请联系管理员核对，不要自动重试",
                                  request_id=request_id)
            try:
                raw = await cloud_images.read_limited(response, MAX_RESPONSE_BYTES)
            except cloud_images.ImageEditError:
                raise BananaError("云端 Banana 响应超过大小限制，请联系管理员确认，不要自动重试",
                                  request_id=request_id)
    except BananaError as error:
        error.request_id = error.request_id or request_id
        raise
    except (aiohttp.ClientError, asyncio.TimeoutError):
        raise BananaError("请求未完成，生成状态可能未知。不要自动重试，请联系管理员确认。",
                          status=504, request_id=request_id, generation_unknown=True)
    try:
        payload = json.loads(raw)
        content = payload["choices"][0]["message"]["content"]
        if not isinstance(content, str):
            raise ValueError()
    except (ValueError, UnicodeError, KeyError, IndexError, TypeError):
        raise BananaError("云端 Banana 响应格式无效，请联系管理员确认，不要自动重试", request_id=request_id)
    result = await asyncio.to_thread(extract_image, content, request_id)
    return {"request_id": request_id, "model": config["banana_model"], **result}
