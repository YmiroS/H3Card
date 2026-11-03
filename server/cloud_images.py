"""Server-side OpenAI-compatible image editing; never retries generation requests."""
import asyncio
import base64
import binascii
from io import BytesIO
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
import warnings

import aiohttp
from PIL import Image


CONF = Path(__file__).resolve().parent.parent / "image-edit.json"
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
        raise ImageEditError("image-edit.json 读取失败，请管理员检查配置", status=503)
    if not isinstance(config, dict):
        raise ImageEditError("image-edit.json 必须是 JSON 对象", status=503)
    config = {"base_url": "http://30.245.124.125:8000/v1",
              "model": "gpt-image-2.5-sunburst", "size": "original",
              "quality": "medium", "output_format": "png", **config}
    config["api_key"] = os.environ.get("CHOUKA_IMAGE_API_KEY") or config.get("api_key")
    if config.get("enabled", True) is not True or not config.get("api_key"):
        raise ImageEditError("云端图片编辑未配置，请管理员设置 image-edit.json 或 CHOUKA_IMAGE_API_KEY", status=503)
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


async def edit(session, images, prompt, *, size=None):
    config = load()
    if not isinstance(prompt, str) or not 1 <= len(prompt.strip()) <= 20000:
        raise ImageEditError("图片编辑提示词不能为空，且不得超过 20000 字符", status=400)
    if not isinstance(images, (list, tuple)) or not 1 <= len(images) <= 8:
        raise ImageEditError("图片编辑需要 1 到 8 张有序输入图片", status=400)
    infos = [await asyncio.to_thread(inspect_image, data) for data in images]
    size = config["size"] if size is None else size
    if size == "original":
        size = f"{infos[0]['width']}x{infos[0]['height']}"
    form = aiohttp.FormData()
    for key in ("model", "quality", "output_format"):
        form.add_field(key, config[key])
    form.add_field("size", size)
    form.add_field("prompt", prompt.strip())
    for index, (data, info) in enumerate(zip(images, infos), 1):
        form.add_field("image[]", data, filename=f"image_{index}{info['extension']}",
                       content_type=info["mime"])
    request_id = None
    try:
        async with session.post(
                config["base_url"].rstrip("/") + "/images/edits", data=form,
                headers={"Authorization": f"Bearer {config['api_key']}"},
                allow_redirects=False, proxy=None,
                timeout=aiohttp.ClientTimeout(total=None, connect=10, sock_connect=10, sock_read=450)) as response:
            request_id = response.headers.get("X-Request-ID", "")[:200] or None
            if not 200 <= response.status < 300:
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
        payload = json.loads(body)
    except (ValueError, UnicodeError):
        raise ImageEditError("云端返回的不是有效 JSON，请联系管理员确认结果，不要重复生成", request_id=request_id)
    return await asyncio.to_thread(decode_result, payload, request_id, config["model"])
