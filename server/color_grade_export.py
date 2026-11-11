"""Apply a browser-baked .cube LUT to a project video with FFmpeg lut3d."""
from __future__ import annotations

import asyncio
import json
import math
import re
import tempfile
import uuid
from pathlib import Path

from aiohttp import web

_CUBE_NAME = re.compile(r"^[A-Za-z0-9._-]{1,120}\.cube$", re.I)
_SAFE_NAME = re.compile(r"^[A-Za-z0-9._-]{1,120}$")
_HEX_COLOR = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
_MAX_CUBE_BYTES = 8 * 1024 * 1024
_MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024
_MAX_VIGNETTE_BYTES = 4096
_MAX_SHARPEN_BYTES = 4096
_MAX_MOTION_BLUR_BYTES = 4096


def _ffmpeg_filter_path(path: Path) -> str:
    """Escape a Windows/POSIX path for an ffmpeg filter argument."""
    text = path.resolve().as_posix()
    return text.replace("\\", "/").replace(":", "\\:").replace("'", "\\'")


def _clamp(value: float, lo: float, hi: float) -> float:
    return min(hi, max(lo, value))


def _parse_hex_color(value: str) -> tuple[float, float, float]:
    raw = value.strip()
    if not _HEX_COLOR.match(raw):
        return (0.0, 0.0, 0.0)
    hex_body = raw[1:]
    if len(hex_body) == 3:
        hex_body = "".join(ch * 2 for ch in hex_body)
    return (
        int(hex_body[0:2], 16) / 255.0,
        int(hex_body[2:4], 16) / 255.0,
        int(hex_body[4:6], 16) / 255.0,
    )


def _normalize_vignette(raw: object) -> dict | None:
    """Return sanitized vignette params, or None when the effect is off/invalid."""
    if not isinstance(raw, dict):
        return None
    if raw.get("enabled") is not True:
        return None
    try:
        size = _clamp(float(raw.get("size", 0.5)), 0.0, 1.0)
        anamorphism = _clamp(float(raw.get("anamorphism", 1.0)), 0.2, 3.0)
        softness = _clamp(float(raw.get("softness", 0.5)), 0.0, 1.0)
    except (TypeError, ValueError):
        return None
    color = raw.get("color", "#000000")
    if not isinstance(color, str):
        color = "#000000"
    r, g, b = _parse_hex_color(color)
    return {
        "size": size,
        "anamorphism": anamorphism,
        "softness": max(softness, 1e-3),
        "color": (r, g, b),
    }


_DURATION = re.compile(r"Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)")
_VIDEO_SIZE = re.compile(r"Video:.*?(\d{2,5})x(\d{2,5})")
_OUT_TIME = re.compile(r"out_time=(\d+):(\d+):(\d+(?:\.\d+)?)")


def progress_ratio(line: str, duration: float) -> float | None:
    """Map one FFmpeg `-progress` line to 0…1. `out_time_ms` is not used: it is microseconds."""
    if duration <= 0:
        return None
    text = line.strip()
    if text == "progress=end":
        return 1.0
    match = _OUT_TIME.fullmatch(text)
    if not match:
        return None
    hours, minutes, seconds = match.groups()
    elapsed = int(hours) * 3600 + int(minutes) * 60 + float(seconds)
    return min(0.99, max(0.0, elapsed / duration))


def write_vignette_mask(path: Path, width: int, height: int, params: dict) -> None:
    """Rasterize the same ellipse as the preview shader. Scaled up by FFmpeg, so a short edge is enough."""
    from PIL import Image

    long_edge = max(width, height, 1)
    scale = min(1.0, 480 / long_edge)
    mask_w = max(2, int(round(width * scale)))
    mask_h = max(2, int(round(height * scale)))
    anamorphism = max(float(params["anamorphism"]), 0.01)
    size = float(params["size"])
    softness = max(float(params["softness"]), 1e-3)
    red, green, blue = params["color"]
    color = (
        int(round(_clamp(red, 0, 1) * 255)),
        int(round(_clamp(green, 0, 1) * 255)),
        int(round(_clamp(blue, 0, 1) * 255)),
    )
    aspect = mask_w / mask_h
    pixels = bytearray(mask_w * mask_h * 4)
    index = 0
    for y in range(mask_h):
        py = (y + 0.5) / mask_h - 0.5
        for x in range(mask_w):
            px = ((x + 0.5) / mask_w - 0.5) * aspect / anamorphism
            dist = 2.0 * math.hypot(px, py)
            t = (dist - size) / softness
            if t <= 0:
                amount = 0.0
            elif t >= 1:
                amount = 1.0
            else:
                amount = t * t * (3.0 - 2.0 * t)
            pixels[index:index + 4] = bytes((*color, int(round(amount * 255))))
            index += 4
    Image.frombytes("RGBA", (mask_w, mask_h), bytes(pixels)).save(path, format="PNG")


def parse_media_probe(stderr: str) -> tuple[int, int, float]:
    size = _VIDEO_SIZE.search(stderr)
    if not size:
        raise web.HTTPBadGateway(text="无法读取视频分辨率")
    width, height = int(size.group(1)), int(size.group(2))
    duration = 0.0
    match = _DURATION.search(stderr)
    if match:
        hours, minutes, seconds = match.groups()
        duration = int(hours) * 3600 + int(minutes) * 60 + float(seconds)
    return width, height, duration


def _normalize_sharpen(raw: object) -> dict | None:
    """Return sanitized unsharp params, or None when the effect is off/invalid."""
    if not isinstance(raw, dict):
        return None
    if raw.get("enabled") is not True:
        return None
    try:
        amount = float(raw.get("amount", 0.5))
        radius = float(raw.get("radius", 1.0))
    except (TypeError, ValueError):
        return None
    amount = _clamp(amount, 0.0, 4.0)
    radius = _clamp(radius, 0.5, 10.0)
    if amount <= 0:
        return None
    matrix = sharpen_matrix_size(radius)
    return {"amount": amount, "radius": radius, "matrix": matrix}


def sharpen_matrix_size(radius: float) -> int:
    """Odd matrix size 3…23 for FFmpeg unsharp, matching the preview radius control."""
    # Half-up so radius*2 .5 cases match JS Math.round (not banker's round).
    rounded = int(max(0.5, radius) * 2 + 0.5) * 2 + 1
    return max(3, min(23, rounded))


def sharpen_unsharp(params: dict) -> str:
    """Luma-only unsharp; chroma left untouched to match the RGB high-pass preview."""
    matrix = int(params["matrix"])
    amount = float(params["amount"])
    return f"unsharp={matrix}:{matrix}:{amount:.4g}:3:3:0"


def _normalize_motion_blur(raw: object) -> dict | None:
    """Return sanitized motion-blur params, or None when the effect is off/invalid."""
    if not isinstance(raw, dict):
        return None
    if raw.get("enabled") is not True:
        return None
    try:
        samples = int(round(float(raw.get("samples", 8))))
        shutter = float(raw.get("shutter", 0.5))
    except (TypeError, ValueError):
        return None
    samples = int(_clamp(samples, 2, 64))
    shutter = _clamp(shutter, 0.0, 1.0)
    frames = motion_blur_mix_frames(samples, shutter)
    if frames is None:
        return None
    return {"samples": samples, "shutter": shutter, "frames": frames}


def motion_blur_mix_frames(samples: int, shutter: float) -> int | None:
    """Map openfilm samples/shutter onto a discrete-video tmix window."""
    if shutter <= 0 or samples < 2:
        return None
    capped = int(_clamp(samples, 2, 64))
    # Half-up (not banker's round) so 8×0.5 → 5, matching JS Math.round.
    span = int(1 + (capped - 1) * shutter + 0.5)
    return max(2, min(capped, span))


def motion_blur_tmix(frames: int) -> str:
    """Equal-weight tmix, matching openfilm's average of shutter samples."""
    n = max(2, min(64, int(frames)))
    weights = " ".join(["1"] * n)
    return f"tmix=frames={n}:weights='{weights}'"


def build_color_grade_vf(cube_path: Path, vignette: dict | None = None) -> str:
    """Single-input lut3d graph. Vignette is a mask overlay, not a geq expression."""
    del vignette
    return f"lut3d='{_ffmpeg_filter_path(cube_path)}'"


def build_grade_args(source: Path, cube_path: Path, temporary: Path, *,
                     mask: Path | None = None, size: tuple[int, int] | None = None,
                     sharpen: dict | None = None,
                     motion_blur: dict | None = None) -> list[str]:
    """FFmpeg args. `-progress pipe:1` reports encode time on stdout.

    Order matches preview: lut3d → unsharp → vignette overlay → tmix.
    """
    args = [
        "-y", "-hide_banner", "-loglevel", "error", "-nostats",
        "-progress", "pipe:1",
        "-i", str(source.resolve()),
    ]
    cube = _ffmpeg_filter_path(cube_path)
    sharp = ""
    if sharpen is not None:
        sharp = "," + sharpen_unsharp(sharpen)
    blur = ""
    if motion_blur is not None:
        blur = "," + motion_blur_tmix(int(motion_blur["frames"]))
    if mask is not None and size is not None:
        width, height = size
        args += ["-i", str(mask.resolve())]
        graph = (
            f"[1:v]scale={width}:{height}:flags=bilinear[vig];"
            f"[0:v]lut3d='{cube}'{sharp}[graded];"
            f"[graded][vig]overlay=format=auto{blur}[vout]"
        )
        args += ["-filter_complex", graph, "-map", "[vout]", "-map", "0:a?"]
    else:
        args += ["-vf", f"lut3d='{cube}'{sharp}{blur}"]
    args += [
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "veryfast",
        "-c:a", "copy",
        "-movflags", "+faststart",
        "-f", "mp4",
        str(temporary),
    ]
    return args


async def _probe_media(exe: Path, source: Path) -> tuple[int, int, float]:
    process = await asyncio.create_subprocess_exec(
        str(exe), "-hide_banner", "-i", str(source),
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _out, err = await process.communicate()
    return parse_media_probe((err or b"").decode("utf-8", "replace"))


async def _run_ffmpeg(exe: Path, args: list[str], *, duration: float = 0.0, on_progress=None) -> None:
    process = await asyncio.create_subprocess_exec(
        str(exe), *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    err_tail = bytearray()

    async def drain_err() -> None:
        assert process.stderr is not None
        while True:
            block = await process.stderr.read(4096)
            if not block:
                break
            err_tail.extend(block)
            if len(err_tail) > 8192:
                del err_tail[:-8192]

    async def drain_out() -> None:
        assert process.stdout is not None
        pending = b""
        while True:
            block = await process.stdout.read(4096)
            if not block:
                break
            pending += block
            while b"\n" in pending:
                raw, pending = pending.split(b"\n", 1)
                if on_progress is None:
                    continue
                ratio = progress_ratio(raw.decode("utf-8", "replace"), duration)
                if ratio is None:
                    continue
                try:
                    await on_progress(ratio)
                except Exception:
                    if process.returncode is None:
                        process.kill()
                    raise

    err_task = asyncio.create_task(drain_err())
    out_task = asyncio.create_task(drain_out())
    try:
        code = await process.wait()
        await err_task
        await out_task
    except (Exception, asyncio.CancelledError):
        if process.returncode is None:
            process.kill()
            await process.wait()
        raise
    if code != 0:
        detail = err_tail.decode("utf-8", "replace")[-2000:]
        raise web.HTTPBadGateway(text=f"FFmpeg 调色失败：{detail or code}")


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
        vignette_raw = None
        sharpen_raw = None
        motion_blur_raw = None
        while True:
            part = await reader.next()
            if part is None:
                break
            if part.name == "project":
                project_id = (await part.text()).strip()
            elif part.name == "video_url":
                video_url = (await part.text()).strip()
            elif part.name == "vignette":
                text = await part.text()
                if len(text.encode("utf-8")) > _MAX_VIGNETTE_BYTES:
                    raise web.HTTPRequestEntityTooLarge(text="暗角参数过大")
                try:
                    vignette_raw = json.loads(text)
                except json.JSONDecodeError as exc:
                    raise web.HTTPBadRequest(text="暗角参数不是合法 JSON") from exc
            elif part.name == "sharpen":
                text = await part.text()
                if len(text.encode("utf-8")) > _MAX_SHARPEN_BYTES:
                    raise web.HTTPRequestEntityTooLarge(text="锐化参数过大")
                try:
                    sharpen_raw = json.loads(text)
                except json.JSONDecodeError as exc:
                    raise web.HTTPBadRequest(text="锐化参数不是合法 JSON") from exc
            elif part.name == "motion_blur":
                text = await part.text()
                if len(text.encode("utf-8")) > _MAX_MOTION_BLUR_BYTES:
                    raise web.HTTPRequestEntityTooLarge(text="动态模糊参数过大")
                try:
                    motion_blur_raw = json.loads(text)
                except json.JSONDecodeError as exc:
                    raise web.HTTPBadRequest(text="动态模糊参数不是合法 JSON") from exc
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
        vignette = _normalize_vignette(vignette_raw)
        sharpen = _normalize_sharpen(sharpen_raw)
        motion_blur = _normalize_motion_blur(motion_blur_raw)
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
        response = web.StreamResponse(status=200, headers={
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
        })
        await response.prepare(request)
        last_ratio = -1.0

        async def emit(payload: dict) -> None:
            await response.write((json.dumps(payload, ensure_ascii=False) + "\n").encode("utf-8"))

        async def on_progress(ratio: float) -> None:
            nonlocal last_ratio
            if ratio < 1 and ratio - last_ratio < 0.01:
                return
            last_ratio = ratio
            await emit({"type": "progress", "ratio": round(ratio, 4)})

        try:
            width, height, duration = await _probe_media(Path(exe), source)
            with tempfile.TemporaryDirectory(prefix="chouka-grade-") as tmp:
                cube_path = Path(tmp) / "grade.cube"
                cube_path.write_bytes(cube_bytes)
                mask = None
                if vignette is not None:
                    mask = Path(tmp) / "vignette.png"
                    write_vignette_mask(mask, width, height, vignette)
                await _run_ffmpeg(
                    Path(exe),
                    build_grade_args(
                        source, cube_path, temporary,
                        mask=mask, size=(width, height) if mask else None,
                        sharpen=sharpen,
                        motion_blur=motion_blur,
                    ),
                    duration=duration,
                    on_progress=on_progress,
                )
            if not temporary.is_file() or temporary.stat().st_size < 1:
                raise web.HTTPBadGateway(text="FFmpeg 未写出调色视频")
            await self.require_project(request, project_id, operate=True)
            temporary.replace(out_path)
            await self.resource_call(self.app, "publish", "upload", out_name)
            await emit({
                "type": "done",
                "kind": "video",
                "ref": f"chouka/{out_name}",
                "url": f"/api/upload/{out_name}",
                "origin": out_name,
                "filename": out_name,
            })
        except Exception as exc:
            temporary.unlink(missing_ok=True)
            out_path.unlink(missing_ok=True)
            message = exc.text if isinstance(exc, web.HTTPException) else str(exc)
            try:
                await emit({"type": "error", "message": message or "视频导出失败"})
            except Exception:
                pass
        await response.write_eof()
        return response


def register_color_grade_routes(app, *, root, ffmpeg_bin, require_project, require_resource,
                                resource_call, kind_of, vid_ext):
    api = ColorGradeExportApi(
        app, root=root, ffmpeg_bin=ffmpeg_bin, require_project=require_project,
        require_resource=require_resource, resource_call=resource_call, kind_of=kind_of,
        vid_ext=vid_ext,
    )
    app.router.add_post("/api/color-grade/video", api.apply)
