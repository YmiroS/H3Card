"""Apply a browser-baked .cube LUT to a project video with FFmpeg lut3d."""
from __future__ import annotations

import asyncio
import re
import tempfile
import uuid
from pathlib import Path

from aiohttp import web

_CUBE_NAME = re.compile(r"^[A-Za-z0-9._-]{1,120}\.cube$", re.I)
_SAFE_NAME = re.compile(r"^[A-Za-z0-9._-]{1,120}$")
_MAX_CUBE_BYTES = 8 * 1024 * 1024
_MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024


def _ffmpeg_filter_path(path: Path) -> str:
    """Escape a Windows/POSIX path for an ffmpeg filter argument."""
    text = path.resolve().as_posix()
    return text.replace("\\", "/").replace(":", "\\:").replace("'", "\\'")


async def _run_ffmpeg(exe: Path, args: list[str]) -> None:
    process = await asyncio.create_subprocess_exec(
        str(exe), *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _out, err = await process.communicate()
    if process.returncode != 0:
        detail = (err or b"").decode("utf-8", "replace")[-2000:]
        raise web.HTTPBadGateway(text=f"FFmpeg 调色失败：{detail or process.returncode}")


class ColorGradeExportApi:
    def __init__(self, app, *, root, ffmpeg_bin, require_project, require_resource,
                 resource_call, kind_of, vid_ext):
        self.app = app
        self.root = Path(root)
        self.ffmpeg_bin = ffmpeg_bin
        self.require_project = require_project
        self.require_resource = require_resource
        self.resource_call = resource_call
        self.kind_of = kind_of
        self.vid_ext = {ext.lower() for ext in vid_ext}

    async def apply(self, request):
        if request.content_type != "multipart/form-data":
            raise web.HTTPBadRequest(text="请使用 multipart 上传 LUT 与视频参数")
        reader = await request.multipart()
        project_id = None
        video_url = None
        cube_bytes = None
        cube_name = "grade.cube"
        while True:
            part = await reader.next()
            if part is None:
                break
            if part.name == "project":
                project_id = (await part.text()).strip()
            elif part.name == "video_url":
                video_url = (await part.text()).strip()
            elif part.name == "cube":
                cube_name = Path(part.filename or "grade.cube").name
                if not _CUBE_NAME.match(cube_name):
                    raise web.HTTPBadRequest(text="LUT 文件名无效，需为 .cube")
                chunks = bytearray()
                while True:
                    chunk = await part.read_chunk()
                    if not chunk:
                        break
                    chunks.extend(chunk)
                    if len(chunks) > _MAX_CUBE_BYTES:
                        raise web.HTTPRequestEntityTooLarge(text="LUT 过大")
                cube_bytes = bytes(chunks)
            else:
                await part.release()
        if not project_id or not video_url or cube_bytes is None:
            raise web.HTTPBadRequest(text="缺少 project、video_url 或 cube")
        if b"LUT_3D_SIZE" not in cube_bytes:
            raise web.HTTPBadRequest(text="不是有效的 3D LUT（.cube）")
        await self.require_project(request, project_id, operate=True)
        ref = await self.resource_call(self.app, "reference", video_url)
        if not ref:
            raise web.HTTPBadRequest(text="仅支持画布内已登记的视频")
        await self.require_resource(request, *ref, project_id=project_id)
        source = await self.resource_call(self.app, "local_path", *ref)
        if not source.is_file() or source.suffix.lower() not in self.vid_ext:
            raise web.HTTPBadRequest(text="源文件不是可用视频")
        if source.stat().st_size > _MAX_VIDEO_BYTES:
            raise web.HTTPRequestEntityTooLarge(text="源视频过大")
        exe = self.ffmpeg_bin() if callable(self.ffmpeg_bin) else Path(self.ffmpeg_bin)
        if not exe or not Path(exe).is_file():
            raise web.HTTPServiceUnavailable(text="本机未找到 FFmpeg，无法导出视频调色")
        uploads = self.root / "data" / "uploads"
        uploads.mkdir(parents=True, exist_ok=True)
        out_name = f"grade_{uuid.uuid4().hex}.mp4"
        if not _SAFE_NAME.match(out_name):
            raise web.HTTPInternalServerError(text="输出文件名无效")
        out_path = uploads / out_name
        # Keep a real video extension so FFmpeg can pick the muxer (`.mp4.part` fails).
        temporary = out_path.with_name(out_path.stem + ".part.mp4")
        await self.resource_call(
            self.app, "register", project_id, "upload", out_name,
            state="pending", external=True,
        )
        try:
            with tempfile.TemporaryDirectory(prefix="chouka-grade-") as tmp:
                cube_path = Path(tmp) / "grade.cube"
                cube_path.write_bytes(cube_bytes)
                vf = f"lut3d='{_ffmpeg_filter_path(cube_path)}'"
                await _run_ffmpeg(Path(exe), [
                    "-y", "-hide_banner", "-loglevel", "error",
                    "-i", str(source.resolve()),
                    "-vf", vf,
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "veryfast",
                    "-c:a", "copy",
                    "-movflags", "+faststart",
                    "-f", "mp4",
                    str(temporary),
                ])
            if not temporary.is_file() or temporary.stat().st_size < 1:
                raise web.HTTPBadGateway(text="FFmpeg 未写出调色视频")
            await self.require_project(request, project_id, operate=True)
            temporary.replace(out_path)
        except Exception:
            temporary.unlink(missing_ok=True)
            out_path.unlink(missing_ok=True)
            raise
        await self.resource_call(self.app, "publish", "upload", out_name)
        return web.json_response({
            "kind": "video",
            "ref": f"chouka/{out_name}",
            "url": f"/api/upload/{out_name}",
            "origin": out_name,
            "filename": out_name,
        })


def register_color_grade_routes(app, *, root, ffmpeg_bin, require_project, require_resource,
                                resource_call, kind_of, vid_ext):
    api = ColorGradeExportApi(
        app, root=root, ffmpeg_bin=ffmpeg_bin, require_project=require_project,
        require_resource=require_resource, resource_call=resource_call, kind_of=kind_of,
        vid_ext=vid_ext,
    )
    app.router.add_post("/api/color-grade/video", api.apply)
