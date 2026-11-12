"""Server-side OpenAI-compatible image editing; never retries generation requests."""
import asyncio
import base64
import binascii
import ipaddress
from io import BytesIO
import json
import logging
import os
from pathlib import Path
import re
from urllib.parse import urlsplit
import warnings

import aiohttp
from aiohttp.resolver import ThreadedResolver
from PIL import Image
from yarl import URL

from . import provider_billing


CONF = Path(__file__).resolve().parent.parent / "cloud-ai-config.json"
MAX_IMAGE_BYTES = 64 * 1024 * 1024
MAX_PIXELS = 32_000_000
MAX_RESPONSE_BYTES = (MAX_IMAGE_BYTES + 2) // 3 * 4 + 1024 * 1024
FORMATS = {"PNG": (".png", "image/png"), "JPEG": (".jpg", "image/jpeg"),
           "WEBP": (".webp", "image/webp")}


class ImageEditError(Exception):
    def __init__(self, message, *, status=502, request_id=None, generation_unknown=False):
        super().__init__(message)
        self.status = status
        self.request_id = request_id
        self.generation_unknown = generation_unknown

    def response(self):
        return {"error": str(self), "request_id": self.request_id,
                "generation_unknown": self.generation_unknown, "retryable": False}


def load():
    try:
        config = json.loads(CONF.read_text(encoding="utf-8-sig")) if CONF.exists() else {}
    except (OSError, ValueError):
        raise ImageEditError("cloud-ai-config.json 读取失败，请管理员检查配置", status=503)
    if not isinstance(config, dict):
        raise ImageEditError("cloud-ai-config.json 必须是 JSON 对象", status=503)
    config = {"base_url": "http://30.245.124.125:8000/v1",
              "model": "gpt-image-2.5-sunburst", "size": "original",
              "quality": "medium", "output_format": "png", **config}
    config["api_key"] = os.environ.get("CHOUKA_IMAGE_API_KEY") or config.get("api_key")
    if config.get("enabled", True) is not True or not config.get("api_key"):
        raise ImageEditError("云端图片编辑未配置，请管理员设置 cloud-ai-config.json 或 CHOUKA_IMAGE_API_KEY", status=503)
    if not all(isinstance(config.get(key), str) and config[key].strip()
               for key in ("base_url", "model", "api_key", "size", "quality", "output_format")):
        raise ImageEditError("云端图片编辑配置不完整", status=503)
    try:
        url = urlsplit(config["base_url"])
        valid_url = (url.scheme in ("http", "https") and url.hostname
                     and not url.username and not url.password and not url.query and not url.fragment)
        url.port
    except ValueError:
        valid_url = False
    if not valid_url or any(ord(c) < 33 for c in config["base_url"]):
        raise ImageEditError("云端图片编辑 base_url 无效", status=503)
    if any(ord(c) < 33 for c in config["api_key"]):
        raise ImageEditError("云端图片编辑 API Key 格式无效", status=503)
    return config


def inspect_image(data):
    if not data or len(data) > MAX_IMAGE_BYTES:
        raise ImageEditError("图片必须在 1 字节到 64 MiB 之间", status=422)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as image:
                if image.format not in FORMATS or image.width * image.height > MAX_PIXELS:
                    raise ValueError("unsupported image")
                if getattr(image, "is_animated", False):
                    raise ValueError("animated image")
                extension, mime = FORMATS[image.format]
                width, height = image.size
                image.verify()
            with Image.open(BytesIO(data)) as image:
                image.load()
    except (OSError, ValueError, SyntaxError, Image.DecompressionBombWarning,
            Image.DecompressionBombError):
        raise ImageEditError("图片无效：仅支持不超过 3200 万像素的静态 PNG、JPEG 或 WebP", status=422)
    return {"extension": extension, "mime": mime, "width": width, "height": height}


async def read_limited(response, limit):
    body = bytearray()
    async for chunk in response.content.iter_chunked(64 * 1024):
        body.extend(chunk)
        if len(body) > limit:
            raise ImageEditError("云端图片响应超过大小限制")
    return bytes(body)


def decode_result(payload, request_id, model):
    if (not isinstance(payload, dict) or not isinstance(payload.get("data"), list)
            or len(payload["data"]) != 1 or not isinstance(payload["data"][0], dict)):
        raise ImageEditError("云端图片编辑必须返回一张图片，请管理员确认结果后再操作", request_id=request_id)
    item = payload["data"][0]
    result = {"request_id": request_id, "model": model}
    if "b64_json" in item:
        encoded = item["b64_json"]
        if not isinstance(encoded, str) or len(encoded) > MAX_RESPONSE_BYTES:
            raise ImageEditError("云端图片 Base64 格式无效", request_id=request_id)
        try:
            data = base64.b64decode(encoded, validate=True)
        except (ValueError, binascii.Error):
            raise ImageEditError("云端图片 Base64 校验失败", request_id=request_id)
        try:
            info = inspect_image(data)
        except ImageEditError:
            raise ImageEditError("云端返回的内容不是有效图片", request_id=request_id)
        return {**result, **info, "image_bytes": data}
    if "url" in item:
        value = item["url"]
        try:
            url = urlsplit(value) if isinstance(value, str) else None
            valid = (url and url.scheme in ("http", "https") and url.hostname
                     and not url.username and not url.password and not url.fragment
                     and not any(ord(c) < 33 for c in value))
        except ValueError:
            valid = False
        if not valid:
            raise ImageEditError("云端返回的图片链接无效", request_id=request_id)
        return {**result, "result_url": value}
    raise ImageEditError("云端结果缺少 b64_json 或 url", request_id=request_id)


async def edit(session, images, prompt, *, end_user_name, end_user_phone, size=None, quality=None,
               on_metadata=None):
    config = load()
    if not isinstance(prompt, str) or not 1 <= len(prompt.strip()) <= 20000:
        raise ImageEditError("图片编辑提示词不能为空，且不得超过 20000 字符", status=400)
    if not isinstance(images, (list, tuple)) or not 1 <= len(images) <= 8:
        raise ImageEditError("图片编辑需要 1 到 8 张有序输入图片", status=400)
    infos = [await asyncio.to_thread(inspect_image, data) for data in images]
    size = config["size"] if size is None else size
    if size == "original":
        size = f"{infos[0]['width']}x{infos[0]['height']}"
    if quality is not None:
        if quality not in ("low", "medium", "high"):
            raise ImageEditError("图片质量只支持 low、medium 或 high", status=400)
        config = {**config, "quality": quality}
    form = aiohttp.FormData()
    for key in ("model", "quality", "output_format"):
        form.add_field(key, config[key])
    form.add_field("size", size)
    form.add_field("prompt", prompt.strip())
    for index, (data, info) in enumerate(zip(images, infos), 1):
        form.add_field("image[]", data, filename=f"image_{index}{info['extension']}",
                       content_type=info["mime"])
    return await request_image(session, config, prompt.strip(), "/images/edits", data=form,
                               end_user_name=end_user_name, end_user_phone=end_user_phone,
                               on_metadata=on_metadata)


async def generate(session, prompt, *, end_user_name, end_user_phone,
                   size="1024x1024", quality="high", on_metadata=None):
    config = load()
    if not isinstance(prompt, str) or not 1 <= len(prompt.strip()) <= 32000:
        raise ImageEditError("生图提示词不能为空，且不得超过 32000 字符", status=400)
    dimensions = re.fullmatch(r"([1-9]\d{0,6})x([1-9]\d{0,6})", size) if isinstance(size, str) else None
    if (not dimensions or any(int(side) % 16 for side in dimensions.groups())
            or int(dimensions[1]) * int(dimensions[2]) > MAX_PIXELS):
        raise ImageEditError("文生图宽高必须为 16 的倍数，且不得超过 3200 万像素", status=400)
    if quality not in ("low", "medium", "high"):
        raise ImageEditError("图片质量只支持 low、medium 或 high", status=400)
    body = {"model": config["model"], "prompt": prompt.strip(), "n": 1,
            "size": size, "quality": quality, "output_format": config["output_format"],
            "output_compression": 100}
    result = await request_image(session, config, prompt.strip(), "/images/generations", json=body,
                                 end_user_name=end_user_name, end_user_phone=end_user_phone,
                                 on_metadata=on_metadata)
    if "result_url" in result:
        return await download_result(result, config)
    return result


class PublicImageResolver(ThreadedResolver):
    async def resolve(self, host, port=0, family=0):
        records = await super().resolve(host, port, family)
        if not records or any(not ipaddress.ip_address(record["host"]).is_global
                              or ipaddress.ip_address(record["host"]).is_multicast for record in records):
            raise OSError("Non-public image result address")
        return records


async def download_result(result, config):
    request_id = result["request_id"]
    try:
        value = result["result_url"]
        if len(value) > 16384:
            raise ValueError("Image result URL exceeds limit")
        url = URL(value, encoded=True)
        if url.user is not None or url.password is not None or url.fragment:
            raise ValueError("Invalid image result URL")
        # Only the administrator-configured gateway may use a private/HTTP origin.
        same_origin = url.origin() == URL(config["base_url"]).origin()
        if not same_origin:
            if url.scheme != "https" or url.port != 443:
                raise ValueError("Image result must use public HTTPS")
            try:
                address = ipaddress.ip_address(url.host)
            except ValueError:
                address = None
            if address is not None and (not address.is_global or address.is_multicast):
                raise ValueError("Non-public image result address")
        connector = aiohttp.TCPConnector(
            resolver=None if same_origin else PublicImageResolver(), use_dns_cache=False, limit=1)
        # Do not reuse API headers, cookies, proxy configuration or connection credentials.
        async with aiohttp.ClientSession(
                connector=connector, trust_env=False, cookie_jar=aiohttp.DummyCookieJar(),
                auto_decompress=False,
                timeout=aiohttp.ClientTimeout(total=60, connect=10, sock_connect=10, sock_read=30)) as download:
            async with download.get(url, allow_redirects=False, proxy=None) as response:
                if response.status != 200:
                    raise ValueError("Image result download failed")
                if response.content_length is not None and response.content_length > MAX_IMAGE_BYTES:
                    raise ValueError("Image result exceeds limit")
                data = await read_limited(response, MAX_IMAGE_BYTES)
        info = await asyncio.to_thread(inspect_image, data)
    except (ImageEditError, ValueError, OSError, aiohttp.ClientError, asyncio.TimeoutError):
        raise ImageEditError("云端已返回图片，但结果下载或校验失败。请联系管理员确认，不要重复生成。",
                             request_id=request_id, generation_unknown=True) from None
    return {**{key: result[key] for key in ("request_id", "model", "model_source", "provider_billing", "usage")
               if key in result}, **info, "image_bytes": data}


async def request_image(session, config, prompt, endpoint, *, end_user_name, end_user_phone,
                        on_metadata=None, **payload):
    request_id = None
    try:
        async with session.post(
                config["base_url"].rstrip("/") + endpoint, **payload,
                headers={"Authorization": f"Bearer {config['api_key']}",
                         "X-End-User-Name": end_user_name,
                         "X-End-User-Phone": end_user_phone},
                allow_redirects=False, proxy=None,
                timeout=aiohttp.ClientTimeout(total=None, connect=10, sock_connect=10, sock_read=450)) as response:
            request_id = response.headers.get("X-Request-ID", "")
            if (not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", request_id)
                    or config["api_key"] in request_id):
                request_id = None
            if not 200 <= response.status < 300:
                detail = "无可用结构化错误详情"
                try:
                    payload = provider_billing.loads(await read_limited(response, 16 * 1024))
                    if on_metadata:
                        await on_metadata({**provider_billing.normalize(payload, config["model"], config),
                                           "request_id": request_id})
                    error = payload.get("error", payload.get("detail", payload.get("message"))) if isinstance(payload, dict) else None
                    if isinstance(error, dict):
                        error = "; ".join(f"{key}={error[key]}" for key in ("message", "type", "param", "code")
                                          if isinstance(error.get(key), str))
                    if isinstance(error, str) and error.strip():
                        detail = error.replace(config["api_key"], "[redacted]").replace(prompt.strip(), "[prompt redacted]")
                        detail = re.sub(r"(?i)\bBearer\s+[^\s\"'<>;,]+|\bsk-[A-Za-z0-9_-]+", "[credential redacted]", detail)
                        detail = re.sub(r"data:[^\s\"'<>]+|[A-Za-z0-9+/=_-]{80,}", "[data redacted]", detail)
                        detail = re.sub(r"[\x00-\x1f\x7f]", " ", detail)[:512]
                except (ImageEditError, ValueError, UnicodeError, aiohttp.ClientError, asyncio.TimeoutError):
                    pass
                logging.getLogger(__name__).warning(
                    "Cloud image edit HTTP %s request_id=%r detail=%s", response.status, request_id, detail)
                raise ImageEditError(f"云端图片编辑返回 HTTP {response.status}，请联系管理员核对，不要自动重试",
                                     request_id=request_id)
            body = await read_limited(response, MAX_RESPONSE_BYTES)
    except ImageEditError as error:
        error.request_id = error.request_id or request_id
        raise
    except (aiohttp.ClientError, asyncio.TimeoutError):
        raise ImageEditError("请求未完成，生成状态可能未知。不要自动重试，请联系管理员确认。",
                             status=504, request_id=request_id, generation_unknown=True)
    try:
        payload = provider_billing.loads(body)
    except (ValueError, UnicodeError):
        raise ImageEditError("云端返回的不是有效 JSON，请联系管理员确认结果，不要重复生成", request_id=request_id)
    metadata = {**provider_billing.normalize(payload, config["model"], config), "request_id": request_id}
    # 先持久化扣费证据，再解码、下载或后处理；图片无效不代表供应商没有扣费。
    if on_metadata:
        await on_metadata(metadata)
    result = await asyncio.to_thread(decode_result, payload, request_id, metadata["model"])
    return {**result, **metadata}
