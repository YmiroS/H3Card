"""Generate a private texture preview from the card's current trusted image."""
import asyncio
import json
import os
import re
import uuid

import aiohttp
from aiohttp import web

from . import cloud_images
from .project_repository import InvalidProjectId


def selected_image(card):
    if card.get("type") != "card_tools" or card.get("cap") != "texture_enhance":
        raise web.HTTPBadRequest(text="请选择质感提升工具卡片")
    outputs = card.get("outputs") or []
    if outputs:
        if len(outputs) != 1 or not isinstance(outputs[0], dict) or outputs[0].get("kind") != "image":
            raise web.HTTPConflict(text="质感编辑只支持一张已应用图片")
        return outputs[0], "applied"
    image = (card.get("assets") or {}).get("images[0]")
    if not isinstance(image, dict) or image.get("kind") != "image":
        raise web.HTTPBadRequest(text="请先为当前卡片连接上游图片")
    return image, "upstream"


def source_version(card):
    return json.dumps({"type": card.get("type"), "cap": card.get("cap"),
                       "input": (card.get("assets") or {}).get("images[0]"),
                       "outputs": card.get("outputs") or []}, sort_keys=True)


class TextureApi:
    def __init__(self, app, *, root, comfy_http, require_project,
                 require_resource, resource_call):
        self.app = app
        self.root = root
        self.comfy_http = comfy_http
        self.require_project = require_project
        self.require_resource = require_resource
        self.resource_call = resource_call

    async def card(self, request, project_id, card_id):
        await self.require_project(request, project_id, operate=True)
        try:
            project = self.app["project_repository"].read(project_id)
        except (FileNotFoundError, InvalidProjectId):
            raise web.HTTPNotFound(text="画布不存在")
        if project.get("locked"):
            raise web.HTTPForbidden(text="此画布只读，不能生成")
        card = next((c for c in project.get("cards", []) if c.get("id") == card_id), None)
        if not card:
            raise web.HTTPNotFound(text="卡片不存在")
        selected_image(card)
        return card

    async def source(self, request, project_id, image):
        value = image.get("url") or image.get("ref") or image
        ref = await self.resource_call(self.app, "reference", value)
        if not ref:
            raise web.HTTPBadRequest(text="质感编辑只接受画布内已登记的图片")
        await self.require_resource(request, *ref, project_id=project_id)
        path = await self.resource_call(self.app, "local_path", *ref)
        if ref[0] == "comfy" and not path.is_file():
            async with self.app["session"].get(
                    self.comfy_http + "/view", params=json.loads(ref[1]), allow_redirects=False,
                    timeout=aiohttp.ClientTimeout(total=60, connect=10)) as response:
                if response.status != 200:
                    raise web.HTTPNotFound(text="上游图片已不可用")
                data = await cloud_images.read_limited(response, cloud_images.MAX_IMAGE_BYTES)
        else:
            def read():
                with path.open("rb") as source:
                    return source.read(cloud_images.MAX_IMAGE_BYTES + 1)
            try:
                data = await asyncio.to_thread(read)
            except FileNotFoundError:
                raise web.HTTPNotFound(text="上游图片已不可用")
        info = await asyncio.to_thread(cloud_images.inspect_image, data)
        await self.require_resource(request, *ref, project_id=project_id)
        return data, ref, info

    async def generate(self, request):
        temporary_base = None
        reader = None
        try:
            if request.content_type == "multipart/form-data":
                reader = await request.multipart()
                part = await reader.next()
                if part is None or part.name != "metadata":
                    raise web.HTTPBadRequest(text="缺少编辑请求元数据")
                metadata = bytearray()
                while True:
                    chunk = await part.read_chunk()
                    if not chunk:
                        break
                    metadata.extend(chunk)
                    if len(metadata) > 65536:
                        raise web.HTTPBadRequest(text="编辑请求元数据过大")
                body = json.loads(metadata)
            else:
                body = await request.json()
        except (ValueError, UnicodeError):
            raise web.HTTPBadRequest(text="请求必须为 JSON 对象")
        if (not isinstance(body, dict) or set(body) != {"project", "card", "prompt"}
                or not all(isinstance(body[key], str) and re.fullmatch(r"[A-Za-z0-9_-]{1,128}", body[key])
                           for key in ("project", "card"))
                or not isinstance(body["prompt"], str) or not 1 <= len(body["prompt"].strip()) <= 20000):
            raise web.HTTPBadRequest(text="必须提供画布、卡片和编辑提示词，不接受外部图片地址或凭据")
        project_id, card_id = body["project"], body["card"]
        card = await self.card(request, project_id, card_id)
        # A canceled client may retry while its previous upstream call is still running.
        # Each request returns only a private preview; applying it remains explicit.
        try:
            version = source_version(card)
            image, source_kind = selected_image(card)
            data, ref, info = await self.source(request, project_id, image)
            if reader is not None:
                part = await reader.next()
                if part is None or part.name != "base":
                    raise web.HTTPBadRequest(text="缺少临时底图")
                temporary_base = bytearray()
                while True:
                    chunk = await part.read_chunk(1024 * 1024)
                    if not chunk:
                        break
                    temporary_base.extend(chunk)
                    if len(temporary_base) > cloud_images.MAX_IMAGE_BYTES:
                        raise web.HTTPRequestEntityTooLarge(
                            max_size=cloud_images.MAX_IMAGE_BYTES, actual_size=len(temporary_base))
                if await reader.next() is not None:
                    raise web.HTTPBadRequest(text="不接受额外的编辑请求字段")
                data = bytes(temporary_base)
                info = await asyncio.to_thread(cloud_images.inspect_image, data)
            cloud_images.load()  # Fail before uploading any image when credentials are missing.
            latest = await self.card(request, project_id, card_id)
            if source_version(latest) != version:
                raise web.HTTPConflict(text="编辑底图已变化，未提交生成")
            result = await cloud_images.edit(self.app["session"], [data], body["prompt"],
                                             size=f"{info['width']}x{info['height']}")
            if "image_bytes" in result and (result["width"], result["height"]) != (info["width"], info["height"]):
                raise cloud_images.ImageEditError(
                    f"云端返回图片尺寸 {result['width']}x{result['height']} 与本轮底图 "
                    f"{info['width']}x{info['height']} 不一致，未保存结果，也未缩放。请联系管理员核对，不要重复生成或自动重试。",
                    request_id=result["request_id"])
            # Do not lock the whole project while a cloud request is in flight.
            async with self.app["project_locks"][project_id]:
                latest = await self.card(request, project_id, card_id)
                if source_version(latest) != version:
                    return web.json_response({"error": "编辑底图已变化，未采用本次结果，请联系管理员确认后再生成",
                                              "request_id": result["request_id"], "retryable": False}, status=409)
                await self.require_resource(request, *ref, project_id=project_id)
                response = {"source_kind": source_kind, "source": {"url": image.get("url"),
                            "width": info["width"], "height": info["height"]},
                            "request_id": result["request_id"], "model": result["model"], "image": None}
                if result.get("result_url"):
                    return web.json_response({**response, "result_url": result["result_url"],
                                              "warning": "服务返回图片链接，未自动下载或发送调用 Key；请管理员确认获取方式，不要重复生成"})
                name = f"texture_{uuid.uuid4().hex}{result['extension']}"
                path = self.root / "data" / "uploads" / name
                parent = await self.resource_call(self.app, "lookup", *ref)
                temporary = path.with_suffix(path.suffix + ".part")
                try:
                    path.parent.mkdir(parents=True, exist_ok=True)
                    await asyncio.to_thread(temporary.write_bytes, result["image_bytes"])
                    await self.require_project(request, project_id, operate=True)
                    os.replace(temporary, path)
                    await self.resource_call(self.app, "register", project_id, "upload", name,
                                             parent_id=parent["resource_id"], external=True)
                except Exception as error:
                    temporary.unlink(missing_ok=True)
                    path.unlink(missing_ok=True)
                    if isinstance(error, OSError):
                        raise cloud_images.ImageEditError(
                            "云端已返回结果，但预览保存失败。请联系管理员核对，不要重复生成。",
                            status=500, request_id=result["request_id"]) from error
                    raise
                response["image"] = {"kind": "image", "url": f"/api/upload/{name}",
                                     "ref": f"chouka/{name}", "origin": "质感编辑预览",
                                     "width": result["width"], "height": result["height"]}
                return web.json_response(response)
        except cloud_images.ImageEditError as error:
            return web.json_response(error.response(), status=error.status)


def register_texture_routes(app, **dependencies):
    api = TextureApi(app, **dependencies)
    app.router.add_post("/api/texture/edit", api.generate)
