"""仅为 IF 上传制作限额内的临时副本，不改写画布素材。"""
import asyncio
import logging
import math
import re
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from aiohttp import web


LIMITS = {"image": 10_000_000, "video": 50 * 1024 * 1024}


class IFReferenceCopies:
    def __init__(self, ffmpeg_bin):
        self.ffmpeg_bin = ffmpeg_bin
        self.slots = asyncio.Semaphore(2)

    async def command(self, executable, *args, timeout=120, check=True):
        process = None
        spawn = asyncio.create_task(asyncio.create_subprocess_exec(
            str(executable), "-nostdin", "-hide_banner", "-y", *args,
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE,
        ))
        try:
            try:
                process = await asyncio.shield(spawn)
            except asyncio.CancelledError:
                process = await spawn
                raise
            _, stderr = await asyncio.wait_for(process.communicate(), timeout)
            if check and process.returncode:
                logging.getLogger(__name__).warning("IF 副本转码失败：%s", stderr.decode("utf-8", "replace")[-2000:])
                raise web.HTTPUnprocessableEntity(text="IF 上传副本转换失败，请检查素材格式；原素材未修改")
            return stderr.decode("utf-8", "replace")
        except asyncio.TimeoutError:
            raise web.HTTPUnprocessableEntity(text="IF 上传副本压缩超时，原素材未修改")
        finally:
            if process is not None and process.returncode is None:
                try:
                    process.kill()
                except ProcessLookupError:
                    pass
                await process.communicate()

    @asynccontextmanager
    async def prepare(self, source, kind):
        source = Path(source)
        if kind not in LIMITS:
            raise web.HTTPBadRequest(text="IF 引用仅支持图片或视频")
        if not source.is_file():
            raise web.HTTPNotFound(text="引用素材不存在")
        async with self.slots:
            executable = await asyncio.to_thread(self.ffmpeg_bin)
            if executable is None:
                raise web.HTTPServiceUnavailable(text="服务器未找到 FFmpeg，暂不能自动适配 IF 素材")
            with tempfile.TemporaryDirectory(prefix="chouka-if-copy-") as directory:
                directory = Path(directory)
                # 不允许播放列表借转码读取其他本地文件或网络资源。
                inputs = ["-protocol_whitelist", "file,pipe", "-format_whitelist",
                          "png_pipe,jpeg_pipe,webp_pipe,bmp_pipe,gif,mov,matroska,webm,avi",
                          "-threads", "1", "-max_pixels", "100000000"]
                with source.open("rb") as file:
                    if file.read(3) == b"\xff\xd8\xff":
                        inputs += ["-f", "jpeg_pipe"]
                inputs += ["-i", str(source)]
                if kind == "image":
                    target = directory / "reference.webp"
                    method = await self.image(executable, inputs, target)
                else:
                    target = directory / "reference.mp4"
                    await self.video(executable, inputs, target, directory)
                    method = "compressed-mp4"
                yield target, method

    async def image(self, executable, inputs, target):
        attempts = [(1, True, 100), (1, False, 90), (1, False, 75), (1, False, 55),
                    (.75, False, 75), (.5, False, 75), (.35, False, 75), (.25, False, 75), (.125, False, 75)]
        for scale, lossless, quality in attempts:
            filters = (f"scale=w='max(1,trunc(min(16380,iw)*{scale}))':"
                       f"h='max(1,trunc(min(16380,ih)*{scale}))':force_original_aspect_ratio=decrease,setsar=1")
            await self.command(executable, "-loglevel", "error", *inputs,
                "-map", "0:v:0", "-an", "-sn", "-dn", "-frames:v", "1",
                "-vf", filters, "-filter_threads", "1", "-c:v", "libwebp", "-pix_fmt", "bgra",
                "-lossless", "1" if lossless else "0", "-quality", str(quality),
                "-compression_level", "6", "-threads", "1", str(target))
            if target.is_file() and 0 < target.stat().st_size <= LIMITS["image"]:
                return "lossless-webp" if lossless else "compressed-webp"
        raise web.HTTPUnprocessableEntity(text="图片压缩后仍超过 IF 的 10 MB 上限，原素材未修改")

    async def video(self, executable, inputs, target, directory):
        metadata = await self.command(executable, *inputs, timeout=30, check=False)
        match = re.search(r"Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)", metadata)
        if not match:
            raise web.HTTPUnprocessableEntity(text="无法读取完整视频时长，不能按 IF 上限压缩；原片未修改")
        hours, minutes, seconds = map(float, match.groups())
        duration = hours * 3600 + minutes * 60 + seconds
        if not math.isfinite(duration) or duration <= 0:
            raise web.HTTPUnprocessableEntity(text="视频时长无效，原片未修改")
        for safety in (.94, .80):
            total_rate = int(LIMITS["video"] * 8 * safety / duration / 1000)
            audio_rate = max(8, min(96, total_rate // 5))
            video_rate = total_rate - audio_rate
            if video_rate < 24:
                break
            common = ["-map", "0:v:0", "-sn", "-dn", "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
                      "-filter_threads", "1", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                      "-preset", "fast", "-b:v", f"{video_rate}k", "-threads", "2",
                      "-passlogfile", str(directory / "encode")]
            await self.command(executable, "-loglevel", "error", *inputs, *common,
                "-pass", "1", "-an", "-f", "null", "-", timeout=600)
            await self.command(executable, "-loglevel", "error", *inputs, *common,
                "-pass", "2", "-map", "0:a:0?", "-c:a", "aac", "-b:a", f"{audio_rate}k",
                "-movflags", "+faststart", "-f", "mp4", str(target), timeout=600)
            if target.is_file() and 0 < target.stat().st_size <= LIMITS["video"]:
                return
        raise web.HTTPUnprocessableEntity(text="无法在保留完整视频时长和音轨的前提下压至 IF 的 50 MB 上限，原片未修改")
