"""兼容 MP4：网页预览和生成节点共用，上传原片保留为备份。"""
import asyncio
import logging
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
