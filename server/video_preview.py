"""兼容 MP4：网页预览和生成节点共用，上传原片保留为备份。"""
import asyncio
import hashlib
import json
import logging
import struct
import uuid
from pathlib import Path
from urllib.parse import quote

from aiohttp import web


class VideoPreviews:
    def __init__(self, uploads, ffmpeg_bin, extensions):
        self.uploads = Path(uploads)
        self.ffmpeg_bin = ffmpeg_bin
        self.extensions = extensions
        self.tasks = {}
        self.states = {}
        self.slots = asyncio.Semaphore(1)

    def source(self, name):
        if (not name or Path(name).name != name or "\\" in name
                or Path(name).suffix.lower() not in self.extensions):
            raise web.HTTPBadRequest(text="无效的视频素材名称")
        path = self.uploads / name
        if not path.resolve().is_relative_to(self.uploads.resolve()) or not path.is_file():
            raise web.HTTPNotFound(text="视频原片不存在")
        return path

    def target(self, name):
        return self.uploads / (name + ".browser.mp4")

    def ensure(self, name):
        self.source(name)
        if self.target(name).is_file():
            return {"status": "ready", "url": f"/api/preview/{quote(name, safe='')}/file"}
        if self.states.get(name, {}).get("status") == "error":
            return dict(self.states[name])
        if name not in self.tasks:
            self.states[name] = {"status": "queued"}
            self.tasks[name] = asyncio.create_task(self.convert(name))
        return dict(self.states[name])

    async def convert(self, name):
        temporary = self.target(name).with_suffix(".part.mp4")
        process = None
        try:
            async with self.slots:
                self.states[name] = {"status": "processing"}
                executable = await asyncio.to_thread(self.ffmpeg_bin)
                if executable is None:
                    self.states[name] = {
                        "status": "error",
                        "error": "服务器未找到 FFmpeg，请安装控制端依赖或系统 FFmpeg 后重启；转码完成后才能生成。",
                    }
                    return
                process = await asyncio.create_subprocess_exec(
                    str(executable), "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
                    "-protocol_whitelist", "file,pipe", "-i", str(self.source(name)),
                    "-map", "0:v:0", "-map", "0:a:0?", "-sn", "-dn",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
                    "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2", "-pix_fmt", "yuv420p",
                    "-threads", "2", "-c:a", "aac", "-b:a", "128k",
                    "-movflags", "+faststart", "-f", "mp4", str(temporary),
                    stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE,
                )
                _, stderr = await asyncio.wait_for(process.communicate(), timeout=1800)
                if process.returncode or not temporary.is_file() or not temporary.stat().st_size:
                    raise RuntimeError(stderr.decode("utf-8", errors="replace")[-2000:])
                temporary.replace(self.target(name))
                self.states[name] = {
                    "status": "ready", "url": f"/api/preview/{quote(name, safe='')}/file",
                }
        except asyncio.CancelledError:
            raise
        except Exception:
            logging.getLogger(__name__).exception("视频预览转码失败：%s", name)
            self.states[name] = {
                "status": "error",
                "error": "视频转码失败，请检查服务器 FFmpeg 日志；原片已保留，修复转码后才能生成。",
            }
        finally:
            if process is not None and process.returncode is None:
                process.kill()
                await process.communicate()
            temporary.unlink(missing_ok=True)
            self.tasks.pop(name, None)
            if self.states.get(name, {}).get("status") != "error":
                self.states.pop(name, None)

    async def close(self):
        tasks = list(self.tasks.values())
        for task in tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


class MediaThumbnails:
    """本地素材的私有 PNG 缓存；与整片视频转码分开限流。"""

    VERSION = "png-rgba-512-v1"
    MAX_SIZE = 512

    def __init__(self, directory, ffmpeg_bin, extensions, *, timeout=30):
        self.directory = Path(directory)
        self.ffmpeg_bin = ffmpeg_bin
        self.extensions = extensions
        self.timeout = timeout
        self.slots = asyncio.Semaphore(2)
        self.tasks = {}
        self.closed = False

    def source_key(self, source):
        source = Path(source).resolve()
        if source.suffix.lower() not in self.extensions:
            raise web.HTTPBadRequest(text="缩略图仅支持图片或视频")
        try:
            stat = source.stat()
            if not source.is_file():
                raise web.HTTPNotFound(text="素材文件不存在")
        except (FileNotFoundError, NotADirectoryError):
            raise web.HTTPNotFound(text="素材文件不存在")
        identity = json.dumps([str(source), stat.st_mtime_ns, stat.st_size, self.VERSION],
                              ensure_ascii=False, separators=(",", ":"))
        return source, hashlib.sha256(identity.encode("utf-8")).hexdigest()

    async def get(self, source):
        if self.closed:
            raise web.HTTPServiceUnavailable(text="缩略图服务已关闭")
        source, key = self.source_key(source)
        target = self.directory / (key + ".png")
        if target.is_file():
            return target
        task = self.tasks.get(key)
        if task is None:
            task = asyncio.create_task(self._convert(source, key, target))
            self.tasks[key] = task
            # 唯一请求断开后任务仍会完成；取出异常，避免无人等待时的事件循环警告。
            task.add_done_callback(self._consume_exception)
        return await asyncio.shield(task)

    @staticmethod
    def _consume_exception(task):
        if not task.cancelled():
            task.exception()

    async def _convert(self, source, key, target):
        try:
            async with self.slots:
                return await self._generate(source, key, target)
        finally:
            self.tasks.pop(key, None)

    async def _generate(self, source, key, target):
        temporary = target.with_name(key + "." + uuid.uuid4().hex + ".part.png")
        process = None
        try:
            executable = await asyncio.to_thread(self.ffmpeg_bin)
            if executable is None:
                raise web.HTTPServiceUnavailable(text="服务器未找到 FFmpeg")
            if self.source_key(source)[1] != key:
                raise web.HTTPConflict(text="素材已变化，请重试")
            self.directory.mkdir(parents=True, exist_ok=True)
            # 默认 autorotate 在缩放前应用方向元数据；RGBA 保留透明度，尺寸不会放大小图。
            spawn = asyncio.create_task(asyncio.create_subprocess_exec(
                str(executable), "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
                "-protocol_whitelist", "file,pipe",
                # 不允许伪装成媒体的播放列表再读取其他本地文件或网络素材。
                "-format_whitelist", "png_pipe,jpeg_pipe,webp_pipe,bmp_pipe,gif,mov,matroska,webm,avi",
                "-threads", "1", "-i", str(source),
                "-map", "0:v:0", "-an", "-sn", "-dn", "-frames:v", "1",
                "-vf", "scale=w='min(512,iw)':h='min(512,ih)':force_original_aspect_ratio=decrease,setsar=1",
                "-filter_threads", "1", "-c:v", "png", "-pix_fmt", "rgba", "-threads", "1",
                "-f", "image2", "-update", "1", str(temporary),
                stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE,
            ))
            try:
                process = await asyncio.shield(spawn)
            except asyncio.CancelledError:
                # 关闭恰好发生在创建子进程时，也必须取得句柄并回收进程。
                process = await spawn
                raise
            _, stderr = await asyncio.wait_for(process.communicate(), self.timeout)
            if process.returncode:
                raise RuntimeError(stderr.decode("utf-8", errors="replace")[-2000:])
            with temporary.open("rb") as file:
                header = file.read(24)
            if (len(header) != 24 or header[:8] != b"\x89PNG\r\n\x1a\n"
                    or header[12:16] != b"IHDR"
                    or not all(0 < size <= self.MAX_SIZE for size in struct.unpack(">II", header[16:24]))):
                raise RuntimeError("缩略图输出不是有效的限定尺寸 PNG")
            if self.source_key(source)[1] != key:
                raise web.HTTPConflict(text="素材已变化，请重试")
            temporary.replace(target)
            return target
        except (asyncio.CancelledError, web.HTTPException):
            raise
        except Exception:
            logging.getLogger(__name__).exception("素材缩略图生成失败：%s", source)
            raise web.HTTPUnprocessableEntity(text="缩略图生成失败，原素材未修改")
        finally:
            try:
                if process is not None and process.returncode is None:
                    try:
                        process.kill()
                    except ProcessLookupError:
                        pass
                    await process.communicate()
            finally:
                temporary.unlink(missing_ok=True)

    async def close(self):
        self.closed = True
        tasks = list(self.tasks.values())
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        self.tasks.clear()


async def preview_status(request):
    previews = request.app["video_previews"]
    return web.json_response(previews.ensure(request.match_info["name"]),
                             headers={"Cache-Control": "no-store"})


async def preview_file(request):
    previews = request.app["video_previews"]
    name = request.match_info["name"]
    previews.source(name)
    path = previews.target(name)
    if not path.is_file():
        raise web.HTTPNotFound(text="视频预览尚未生成")
    return web.FileResponse(path, headers={"Content-Type": "video/mp4"})
