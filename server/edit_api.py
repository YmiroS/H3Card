"""Project-scoped non-destructive editing; export work never enters generation jobs."""
import asyncio
import copy
import json
import math
import os
import re
import shutil
import uuid
from pathlib import Path

from aiohttp import web
from aiohttp.http_exceptions import BadHttpMessage

from .edit_export import EditExports, ExportBusyError, total_duration


MEDIA_FORMATS = ("mov,mp4,m4a,3gp,3g2,mj2,matroska,webm,avi,asf,mpeg,mpegts,"
                 "mp3,wav,ogg,flac,aac,aiff,png_pipe,jpeg_pipe,webp_pipe,bmp_pipe,"
                 "tiff_pipe,gif,apng,image2")


def empty_edit():
    return {"rev": 0, "ratio": "16:9", "resolution": 720, "fps": 30,
            "assets": {}, "clips": [], "audio": [], "texts": []}


def number(value, low, high):
    return (type(value) in (int, float) and low <= value <= high and math.isfinite(value))


def identifier(value):
    return isinstance(value, str) and bool(re.fullmatch(r"[A-Za-z0-9_-]{1,128}", value))


def validate_edit(edit, current):
    if (not isinstance(edit, dict) or set(edit) != set(empty_edit())
            or type(edit["rev"]) is not int or edit["rev"] < 0
            or edit["ratio"] not in ("16:9", "9:16", "1:1")
            or type(edit["resolution"]) is not int or edit["resolution"] not in (720, 1080)
            or type(edit["fps"]) is not int or edit["fps"] != 30
            or not isinstance(edit["assets"], dict)
            or edit["assets"] != current["assets"]):
        raise web.HTTPBadRequest(text="剪辑稿格式不正确，素材必须通过项目素材接口加入")
    assets = current["assets"]
    ids = set()
    for collection, keys in (("clips", {"id", "asset", "in", "out", "speed", "volume", "fit"}),
                             ("audio", {"id", "asset", "in", "out", "start", "volume"}),
                             ("texts", {"id", "text", "start", "end", "x", "y", "size", "color"})):
        items = edit[collection]
        if not isinstance(items, list) or len(items) > 200:
            raise web.HTTPBadRequest(text="每条轨道最多 200 个片段")
        for item in items:
            if not isinstance(item, dict) or set(item) != keys or not identifier(item.get("id")) or item["id"] in ids:
                raise web.HTTPBadRequest(text="片段字段或 ID 不正确")
            ids.add(item["id"])
            if collection == "texts":
                if (not isinstance(item["text"], str) or not 1 <= len(item["text"]) <= 2000
                        or any(ord(c) < 32 and c not in "\n\r\t" for c in item["text"])
                        or not number(item["start"], 0, 3600) or not number(item["end"], 0, 3600)
                        or item["end"] <= item["start"] or not number(item["x"], 0, 1)
                        or not number(item["y"], 0, 1) or not number(item["size"], 16, 96)
                        or not isinstance(item["color"], str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", item["color"])):
                    raise web.HTTPBadRequest(text="字幕内容、时间或样式不正确")
                continue
            if not identifier(item["asset"]) or item["asset"] not in assets:
                raise web.HTTPBadRequest(text="片段素材不存在")
            asset = assets[item["asset"]]
            if (not number(item["in"], 0, 3600) or not number(item["out"], 0, 3600)
                    or item["out"] - item["in"] < 1 / 30 - 1e-7
                    or not number(item["volume"], 0, 2)):
                raise web.HTTPBadRequest(text="片段时间或音量不正确")
            if asset["kind"] != "image" and item["out"] > asset["duration"] + 0.001:
                raise web.HTTPBadRequest(text="截取区间超过原素材时长")
            if collection == "clips":
                if (asset["kind"] not in ("image", "video") or not number(item["speed"], 0.25, 4)
                        or item["fit"] not in ("contain", "cover")
                        or asset["kind"] == "image" and (item["speed"] != 1 or item["in"] != 0)):
                    raise web.HTTPBadRequest(text="画面片段、速度或画面适配不正确")
            elif asset["kind"] != "audio" or not number(item["start"], 0, 3600):
                raise web.HTTPBadRequest(text="音频轨片段不正确")
    spans = sorted((item["start"], item["start"] + item["out"] - item["in"]) for item in edit["audio"])
    if any(end > start + 1e-7 for (_, end), (start, _) in zip(spans, spans[1:])):
        raise web.HTTPBadRequest(text="首版单音频轨不允许片段重叠")
    if total_duration(edit) > 3600:
        raise web.HTTPBadRequest(text="首版成片最长 60 分钟")


class EditApi:
    def __init__(self, app, host):
        self.app, self.host = app, host
        self.exports = EditExports(host.ROOT, host.ffmpeg_bin, self.resolve_asset,
                                   self.authorize, self.publish)

    async def authorize(self, pid, user_id):
        details = await self.host.call_store(self.app, "get_project_for_user", user_id, pid)
        if not details or details.get("permission") != "operate":
            return False
        path = self.host.proj_path(pid)
        return path.is_file() and not json.loads(path.read_text(encoding="utf-8")).get("locked")

    async def project(self, request, operate=False):
        pid = request.match_info["pid"]
        await self.host.require_project(request, pid, operate=operate)
        path = self.host.proj_path(pid)
        if not path.is_file():
            raise web.HTTPNotFound(text="项目不存在")
        project = json.loads(path.read_text(encoding="utf-8"))
        if operate and project.get("locked"):
            raise web.HTTPForbidden(text="只读项目不能保存或导出剪辑")
        return pid, path, project, self.host.require_user(request)["id"]

    async def body(self, request):
        try:
            body = await request.json()
        except (ValueError, UnicodeError):
            raise web.HTTPBadRequest(text="请求必须为 JSON 对象")
        if not isinstance(body, dict):
            raise web.HTTPBadRequest(text="请求必须为 JSON 对象")
        return body

    def revision(self, value, edit):
        if type(value) is not int or value < 0:
            raise web.HTTPBadRequest(text="需要正确的剪辑版本号")
        if value != edit["rev"]:
            raise web.HTTPConflict(text="剪辑已在其他页面修改，请先导出本地剪辑稿再重新加载")

    async def persist(self, request, path, project, edit, asset=None):
        pid = project["id"]
        await self.host.require_project(request, pid, operate=True)
        await self.host.resource_call(self.app, "validate_document", self.host.require_user(request)["id"], pid, edit)
        edit["rev"] += 1
        project["edit"] = edit
        project["updated"] = self.host.time.time()
        self.host.write_project(path, project)
        await self.host.broadcast_collaboration(self.app, pid, {"type": "edit-changed", "rev": edit["rev"]}, authorize=True)
        result = {"edit": edit}
        if asset is not None:
            result["asset"] = asset
        return web.json_response(result)

    async def get(self, request):
        pid, _, project, _ = await self.project(request)
        return web.json_response({"edit": project.get("edit") or empty_edit(), "exports": self.exports.list(pid)})

    async def save(self, request):
        _, path, project, _ = await self.project(request, True)
        current = project.get("edit") or empty_edit()
        body = await self.body(request)
        self.revision(body.get("rev"), current)
        validate_edit(body, current)
        return await self.persist(request, path, project, body)

    async def resolve_asset(self, pid, user_id, asset):
        resource = await self.host.resource_call(self.app, "reference", asset["url"])
        if not resource or not await self.host.resource_call(self.app, "authorize", user_id, *resource, project_id=pid):
            raise web.HTTPNotFound(text="剪辑素材不存在或已失去访问权限")
        kind, locator = resource
        path = await self.host.resource_call(self.app, "local_path", kind, locator)
        if path.is_file():
            return path
        if kind != "comfy":
            raise web.HTTPNotFound(text="剪辑素材文件不存在")
        # Only the fixed configured Comfy upstream is contacted, never client URLs.
        if not await self.authorize(pid, user_id):
            raise web.HTTPForbidden(text="项目已失去操作权限")
        temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".part")
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            async with self.app["session"].get(self.host.COMFY_HTTP + "/view", params=json.loads(locator)) as response:
                if response.status != 200:
                    raise web.HTTPNotFound(text="原始生成产物已不可用")
                with temporary.open("wb") as stream:
                    async for chunk in response.content.iter_chunked(1024 * 1024):
                        stream.write(chunk)
            if not await self.authorize(pid, user_id):
                raise web.HTTPForbidden(text="项目已失去操作权限")
            os.replace(temporary, path)
        finally:
            temporary.unlink(missing_ok=True)
        return path

    async def metadata(self, path, kind):
        executable = await asyncio.to_thread(self.host.ffmpeg_bin)
        if not executable:
            raise web.HTTPServiceUnavailable(text="服务器未找到 FFmpeg，无法读取剪辑素材")
        process = await asyncio.create_subprocess_exec(str(executable), "-nostdin", "-hide_banner",
            "-protocol_whitelist", "file,pipe", "-format_whitelist", MEDIA_FORMATS, "-i", str(path),
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE)
        try:
            _, error = await asyncio.wait_for(process.communicate(), 30)
        except asyncio.TimeoutError:
            raise web.HTTPBadRequest(text="素材读取超时，请检查文件是否完整")
        finally:
            if process.returncode is None:
                process.kill()
                await process.communicate()
        text = error.decode("utf-8", errors="replace")
        duration = self.host.DUR_RE.search(text)
        dimensions = re.search(r"Video:.*?\b(\d{2,5})x(\d{2,5})\b", text)
        seconds = 0
        if duration:
            h, m, s = duration.groups()
            seconds = int(h) * 3600 + int(m) * 60 + float(s)
        # The FFmpeg banner rounds durations to centiseconds, including one-frame videos.
        if kind != "image" and number(seconds, 0.03, 3600):
            seconds = max(1 / 30, seconds)
        if ((kind != "image" and not number(seconds, 1 / 30, 3600))
                or kind != "audio" and not dimensions
                or kind == "audio" and not self.host.AUDIO_STREAM_RE.search(text)):
            raise web.HTTPBadRequest(text="无法读取此素材，视频和音频须有有效时长（最多 60 分钟）")
        return {"duration": seconds if kind != "image" else 5,
                "width": int(dimensions[1]) if dimensions else 0,
                "height": int(dimensions[2]) if dimensions else 0,
                "has_audio": bool(self.host.AUDIO_STREAM_RE.search(text))}

    def asset_capacity(self, edit):
        if len(edit["assets"]) >= 200:
            raise web.HTTPBadRequest(text="首版素材库最多 200 份素材")

    async def add_asset(self, request, project, path, edit, file, name, kind, source=None, parent_id=None):
        self.asset_capacity(edit)
        metadata = await self.metadata(file, kind)
        locator = file.name
        await self.host.resource_call(self.app, "register", project["id"], "upload", locator,
                                      parent_id=parent_id, external=True)
        aid = "asset_" + uuid.uuid4().hex
        asset = {"kind": kind, "url": "/api/upload/" + locator, "ref": "chouka/" + locator,
                 "filename": name, **metadata}
        if source:
            asset["source"] = source
        edit["assets"][aid] = asset
        return await self.persist(request, path, project, edit, {"id": aid, **asset})

    def remove_uncommitted_asset(self, path, file):
        if path.is_file():
            project = json.loads(path.read_text(encoding="utf-8"))
            assets = (project.get("edit") or {}).get("assets", {})
            if any(asset.get("url") == "/api/upload/" + file.name for asset in assets.values()):
                return
        file.unlink(missing_ok=True)

    async def import_asset(self, request):
        pid, path, project, user_id = await self.project(request, True)
        edit = copy.deepcopy(project.get("edit") or empty_edit())
        body = await self.body(request)
        if (not {"rev", "output"} <= set(body) or set(body) - {"rev", "output", "source"}
                or not isinstance(body["output"], dict) or not isinstance(body.get("source", {}), dict)):
            raise web.HTTPBadRequest(text="导入素材需要版本号和项目产物")
        self.revision(body["rev"], edit)
        self.asset_capacity(edit)
        output, source = body["output"], body.get("source") or {}
        if output.get("kind") not in ("image", "video", "audio") or not isinstance(output.get("url"), str):
            raise web.HTTPBadRequest(text="只支持图片、视频和音频素材")
        if source:
            if (set(source) != {"shot", "card", "job", "index"}
                    or any(not identifier(source[k]) for k in ("shot", "card", "job"))
                    or type(source["index"]) is not int or source["index"] < 0):
                raise web.HTTPBadRequest(text="产物版本来源不正确")
            card = next((c for c in project.get("cards", []) if c["id"] == source["card"]), None)
            if not card or card.get("director_shot") != source["shot"]:
                raise web.HTTPBadRequest(text="产物不是此导演镜头的节点")
            if source["job"] not in await self.host.call_store(self.app, "list_project_jobs", pid):
                raise web.HTTPBadRequest(text="产物任务不属于当前项目")
            self.host.sync_card_job(card, self.host.JOBS, self.host.CAPS, pid)
            history = next((h for h in card.get("history", []) if h.get("job") == source["job"]), None)
            outputs = (history or {}).get("outputs") or []
            if source["index"] >= len(outputs) or any(outputs[source["index"]].get(k) != output.get(k) for k in ("url", "kind")):
                raise web.HTTPBadRequest(text="产物不是此节点的已知历史版本")
        original = await self.resolve_asset(pid, user_id, output)
        if self.host.kind_of(original.name) != output["kind"]:
            raise web.HTTPBadRequest(text="素材类型与文件不一致")
        resource = await self.host.resource_call(self.app, "reference", output["url"])
        parent = await self.host.resource_call(self.app, "lookup", *resource)
        folder = self.host.ROOT / "data" / "uploads"
        folder.mkdir(parents=True, exist_ok=True)
        frozen = folder / ("edit_" + uuid.uuid4().hex + original.suffix.lower())
        try:
            await asyncio.to_thread(shutil.copyfile, original, frozen)
            return await self.add_asset(request, project, path, edit, frozen,
                str(output.get("filename") or original.name).split("/")[-1].split("\\")[-1],
                output["kind"], source, parent["resource_id"])
        except BaseException:
            self.remove_uncommitted_asset(path, frozen)
            raise

    async def upload(self, request):
        _, path, project, _ = await self.project(request, True)
        edit = copy.deepcopy(project.get("edit") or empty_edit())
        self.asset_capacity(edit)
        folder = self.host.ROOT / "data" / "uploads"
        folder.mkdir(parents=True, exist_ok=True)
        file = None
        revision = None
        name = None
        if request.content_type != "multipart/form-data":
            raise web.HTTPBadRequest(text="上传素材需要 multipart/form-data 请求")
        try:
            reader = await request.multipart()
            async for part in reader:
                if part.name == "rev":
                    if revision is not None:
                        raise web.HTTPBadRequest(text="版本号重复")
                    text = await part.text()
                    if not re.fullmatch(r"\d{1,12}", text):
                        raise web.HTTPBadRequest(text="版本号不正确")
                    revision = int(text)
                elif part.name == "file" and file is None:
                    name = part.filename or ""
                    suffix = Path(name).suffix.lower()
                    kind = self.host.kind_of(name)
                    if kind not in ("image", "video", "audio"):
                        raise web.HTTPBadRequest(text="只支持图片、视频、音频文件")
                    file = folder / ("edit_" + uuid.uuid4().hex + suffix)
                    size = 0
                    with file.open("wb") as stream:
                        while True:
                            chunk = await part.read_chunk()
                            if not chunk:
                                break
                            size += len(chunk)
                            if size > 512 * 1024 ** 2:
                                raise web.HTTPRequestEntityTooLarge(max_size=512 * 1024 ** 2, actual_size=size)
                            stream.write(chunk)
                    if not size:
                        raise web.HTTPBadRequest(text="素材文件为空")
                else:
                    raise web.HTTPBadRequest(text="请一次上传一份素材")
            if file is None:
                raise web.HTTPBadRequest(text="需要上传素材文件")
            self.revision(revision, edit)
            return await self.add_asset(request, project, path, edit, file, name, kind)
        except (ValueError, AssertionError, BadHttpMessage):
            if file:
                self.remove_uncommitted_asset(path, file)
            raise web.HTTPBadRequest(text="上传素材的 multipart 格式不正确")
        except BaseException:
            if file:
                self.remove_uncommitted_asset(path, file)
            raise

    async def publish(self, pid, user_id, export_id, path):
        if not await self.authorize(pid, user_id):
            raise web.HTTPForbidden(text="项目已失去导出权限")
        locator = export_id + "/" + path.name
        await self.host.resource_call(self.app, "register", pid, "artifact", locator)
        return "/api/artifact/" + locator

    async def start_export(self, request):
        pid, _, project, user_id = await self.project(request, True)
        body = await self.body(request)
        if set(body) != {"rev"}:
            raise web.HTTPBadRequest(text="导出需要剪辑版本号")
        edit = project.get("edit") or empty_edit()
        self.revision(body["rev"], edit)
        validate_edit(edit, edit)
        if not edit["clips"]:
            raise web.HTTPBadRequest(text="请先加入画面片段")
        await self.host.resource_call(self.app, "validate_document", user_id, pid, edit)
        return web.json_response({"export": self.exports.start(pid, user_id, edit)}, status=202)

    async def list_exports(self, request):
        pid, _, _, _ = await self.project(request)
        return web.json_response({"exports": self.exports.list(pid)})

    async def cancel_export(self, request):
        pid, _, _, _ = await self.project(request, True)
        try:
            item = await self.exports.cancel(pid, request.match_info["eid"])
        except ExportBusyError:
            raise web.HTTPConflict(text="导出任务正在另一服务实例运行，请到发起导出的服务取消")
        except KeyError:
            raise web.HTTPNotFound(text="导出任务不存在")
        return web.json_response({"export": item})

    async def download(self, request):
        pid, _, _, _ = await self.project(request)
        try:
            item = self.exports.get(pid, request.match_info["eid"])
        except KeyError:
            raise web.HTTPNotFound(text="导出任务不存在")
        if item["status"] != "done" or not item.get("url"):
            raise web.HTTPConflict(text="成片尚未导出完成")
        resource = await self.host.resource_call(self.app, "reference", item["url"])
        await self.host.require_resource(request, *resource, project_id=pid)
        path = await self.host.resource_call(self.app, "local_path", *resource)
        if not path.is_file():
            raise web.HTTPNotFound(text="导出文件不存在")
        return web.FileResponse(path, headers={"Content-Type": "video/mp4",
            "Content-Disposition": 'attachment; filename="film.mp4"', "X-Content-Type-Options": "nosniff"})


def register_edit_routes(app, host):
    api = EditApi(app, host)
    app["edit_exports"] = api.exports
    prefix = "/api/projects/{pid}/edit"
    app.router.add_get(prefix, api.get)
    app.router.add_put(prefix, api.save)
    app.router.add_post(prefix + "/import", api.import_asset)
    app.router.add_post(prefix + "/upload", api.upload)
    app.router.add_get(prefix + "/exports", api.list_exports)
    app.router.add_post(prefix + "/exports", api.start_export)
    app.router.add_post(prefix + "/exports/{eid}/cancel", api.cancel_export)
    app.router.add_get(prefix + "/exports/{eid}/download", api.download)
