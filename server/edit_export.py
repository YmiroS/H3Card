"""Standalone CPU edit exports; no application, ComfyUI, auth-store or billing imports.

start/list/get are synchronous (start requires a running asyncio loop). Authorization
is asynchronous inside the worker; route callers must also authorize list/get/cancel.
Callbacks: resolve_asset(project, user_id, asset) -> awaitable Path,
authorize(project, user_id) -> awaitable bool, publish(project, user_id, id, Path)
-> awaitable URL. ffmpeg_bin accepts an executable path or a zero-argument resolver.
Subtitles require fontTools and an installed font covering the supplied text.
Shared-root managers observe and refresh foreign records. cancel/cancel_project
raise ExportBusyError for live foreign exports (route callers should map it to
HTTP 409). close cancels only this manager's tasks. OS lifetime locks protect files.
"""
from __future__ import annotations

import asyncio
import errno
import inspect
import json
import math
import os
import re
import shutil
import time
import uuid
from pathlib import Path

__all__ = ["EditExports", "ExportBusyError", "clip_duration", "total_duration"]

_PUBLIC = ("id", "project", "user_id", "status", "progress", "edit_rev",
           "created", "updated", "duration", "filename", "url", "error")
# No playlist / script / network demuxers, even when disguised as an MP4.
_MEDIA_FORMATS = ("mov,mp4,m4a,3gp,3g2,mj2,matroska,webm,avi,mpeg,mpegts,asf,"
                  "mp3,wav,flac,aac,ogg,aiff,gif,image2,png_pipe,jpeg_pipe,webp_pipe,bmp_pipe,tiff_pipe,avif")
_EXTENSIONS = {
    "video": {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v", ".mpg", ".mpeg", ".ts", ".wmv"},
    "image": {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".avif"},
    "audio": {".wav", ".mp3", ".m4a", ".aac", ".flac", ".ogg", ".opus", ".aif", ".aiff"},
}


def _number(value):
    result = float(value)
    if not math.isfinite(result):
        raise ValueError("Edit numbers must be finite")
    return result


def _frames(clip, fps=30):
    fps = _number(fps)
    speed = _number(clip.get("speed", 1))
    length = _number(clip["out"]) - _number(clip["in"])
    if fps <= 0 or speed <= 0 or length <= 0:
        raise ValueError("Clip interval, speed and fps must be positive")
    return max(1, math.floor(length / speed * fps + 0.5))


def clip_duration(clip, fps=30):
    """Frame-quantized seconds, with JavaScript Math.round parity (not bankers' rounding)."""
    return _frames(clip, fps) / float(fps)


def total_duration(edit):
    """Sum integer frame counts before converting to seconds; exports are 30 fps."""
    fps = edit.get("fps", 30)
    return sum(_frames(clip, fps) for clip in edit["clips"]) / float(fps)


def _fmt(number):
    return f"{float(number):.9f}".rstrip("0").rstrip(".") or "0"


def _atempo(speed):
    factors = []
    while speed < 0.5:
        factors.append(0.5)
        speed /= 0.5
    while speed > 2:
        factors.append(2)
        speed /= 2
    factors.append(speed)
    return ",".join(f"atempo={_fmt(value)}" for value in factors)


class ExportBusyError(RuntimeError):
    """Live export belongs to another manager; HTTP adapters should return 409."""


class _ExportLock:
    """OS-owned, nonblocking lock; stable lock files must never be unlinked.

    flock (not POSIX record locks) also excludes another manager in the same
    process. Windows locks one byte using a separate, non-inheritable handle.
    The OS releases either lock on crash; a PID file is not an ownership test.
    """
    def __init__(self, handle):
        self.handle = handle

    @classmethod
    def acquire(cls, path):
        descriptor = os.open(path, os.O_RDWR | os.O_CREAT, 0o600)
        handle = os.fdopen(descriptor, "r+b", buffering=0)
        try:
            if os.name == "nt":
                import msvcrt
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as exc:
            handle.close()
            if exc.errno in {errno.EACCES, errno.EAGAIN, errno.EDEADLK}:
                return None
            raise
        # Byte-range locking past EOF is supported on Windows. Initialize only
        # AFTER acquisition, never write into a byte locked by another owner.
        try:
            if os.fstat(handle.fileno()).st_size == 0:
                handle.write(b"\0")
            return cls(handle)
        except BaseException:
            handle.close()
            raise

    def close(self):
        # Closing the non-inherited descriptor releases the advisory lock.
        self.handle.close()


class EditExports:
    def __init__(self, root, ffmpeg_bin, resolve_asset, authorize, publish):
        self.root = Path(root).resolve()
        self.metadata = self.root / "data" / "edit-exports"
        self.artifacts = self.root / "data" / "artifacts"
        self.work = self.metadata / "work"
        self.lock_dir = self.metadata / "locks"
        self._locks = {}
        for directory in (self.metadata, self.artifacts, self.work, self.lock_dir):
            directory.mkdir(parents=True, exist_ok=True)
        self.ffmpeg_bin = ffmpeg_bin
        self.resolve_asset = resolve_asset
        self.authorize = authorize
        self.publish = publish
        self.records = {}
        self.tasks = {}
        self.processes = {}
        self.slots = asyncio.Semaphore(1)
        self.closed = False
        self._restore()

    def _read_record(self, export_id):
        if not isinstance(export_id, str) or not re.fullmatch(r"[0-9a-f]{32}", export_id):
            return None
        try:
            record = json.loads((self.metadata / (export_id + ".json")).read_text(encoding="utf-8"))
            if record["id"] == export_id and record["status"] in {
                "queued", "running", "done", "error", "canceled"
            }:
                return record
        except (ValueError, KeyError, TypeError, OSError):
            pass
        return None

    def _refresh(self, export_id=None):
        # Never replace the live record object belonging to our own task.
        ids = (path.stem for path in self.metadata.glob("*.json")) if export_id is None else (export_id,)
        for current_id in ids:
            if current_id not in self._locks:
                record = self._read_record(current_id)
                if record is not None:
                    self.records[current_id] = record

    def _restore(self):
        self._refresh()
        for export_id in tuple(self.records):
            try:
                lock = _ExportLock.acquire(self.lock_dir / (export_id + ".lock"))
                if lock is None:
                    # Another application is queued/running or still doing final
                    # cleanup. Observation is allowed; mutations are not.
                    continue
                try:
                    # Re-read AFTER acquiring: the previous owner may have
                    # completed between discovery and this lock acquisition.
                    record = self._read_record(export_id)
                    if record is None:
                        continue
                    self.records[export_id] = record
                    if record["status"] in {"queued", "running"}:
                        self._update(record, status="canceled", error="Export interrupted by restart")
                    self._cleanup(record)
                finally:
                    lock.close()
            except OSError:
                # Failure to acquire/read a lock is never permission to clean.
                continue

    def _finish_task(self, export_id):
        try:
            self._cleanup(self.records[export_id])
        finally:
            self.tasks.pop(export_id, None)
            lock = self._locks.pop(export_id, None)
            if lock is not None:
                lock.close()

    def _persist(self, record):
        target = self.metadata / (record["id"] + ".json")
        temporary = target.with_suffix(".json.tmp")
        try:
            with temporary.open("w", encoding="utf-8") as handle:
                json.dump(record, handle, ensure_ascii=False, allow_nan=False)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, target)
        finally:
            temporary.unlink(missing_ok=True)

    def _update(self, record, **changes):
        record.update(changes, updated=time.time())
        self._persist(record)

    @staticmethod
    def _public(record):
        return json.loads(json.dumps({key: record[key] for key in _PUBLIC if key in record}))

    def start(self, pid, user_id, edit):
        if self.closed:
            raise RuntimeError("Export manager is closed")
        loop = asyncio.get_running_loop()
        snapshot = json.loads(json.dumps(edit, ensure_ascii=False, allow_nan=False))
        self._validate(snapshot)
        export_id = uuid.uuid4().hex
        now = time.time()
        record = dict(id=export_id, project=pid, user_id=user_id, status="queued",
                      progress=0.0, edit_rev=snapshot.get("rev"), created=now, updated=now,
                      duration=total_duration(snapshot), filename="film.mp4", snapshot=snapshot)
        lock = _ExportLock.acquire(self.lock_dir / (export_id + ".lock"))
        if lock is None:
            raise RuntimeError("Export ID is already locked")
        self._locks[export_id] = lock
        try:
            # Publish queued metadata only AFTER taking its lifetime lock.
            self._persist(record)
            self.records[export_id] = record
            task = loop.create_task(self._run(record), name=f"edit-export-{export_id}")
            self.tasks[export_id] = task
            # Also runs if canceled before the coroutine's first instruction.
            task.add_done_callback(lambda finished: self._finish_task(export_id))
        except BaseException:
            self._locks.pop(export_id).close()
            raise
        return self._public(record)

    def list(self, pid):
        self._refresh()
        return [self._public(record) for record in sorted(
            self.records.values(), key=lambda item: item["created"], reverse=True
        ) if record["project"] == pid]

    def get(self, pid, export_id):
        self._refresh(export_id)
        record = self.records.get(export_id)
        if record is None or record["project"] != pid:
            raise KeyError("Export not found in project")
        return self._public(record)

    async def cancel(self, pid, export_id):
        self.get(pid, export_id)
        record = self.records[export_id]
        task = self.tasks.get(export_id)
        if export_id in self._locks:
            if record["status"] in {"queued", "running"}:
                self._update(record, status="canceled")
                task.cancel()
                await asyncio.gather(task, return_exceptions=True)
            return self._public(record)
        if record["status"] in {"queued", "running"}:
            lock = _ExportLock.acquire(self.lock_dir / (export_id + ".lock"))
            if lock is None:
                # No cross-process signaling contract: reject explicitly without
                # mutating status/work. The HTTP adapter maps this error to 409.
                raise ExportBusyError("Export is active in another manager; cancel it on the owning instance")
            try:
                current = self._read_record(export_id)
                if current is None or current["project"] != pid:
                    raise KeyError("Export not found in project")
                record = self.records[export_id] = current
                if record["status"] in {"queued", "running"}:
                    self._update(record, status="canceled")
                    self._cleanup(record)
            finally:
                lock.close()
        return self._public(record)

    async def cancel_project(self, pid):
        self._refresh()
        results = await asyncio.gather(*(self.cancel(pid, record["id"]) for record in
                                         tuple(self.records.values()) if record["project"] == pid),
                                       return_exceptions=True)
        # Finish local cancellations before reporting a foreign-owner conflict.
        for result in results:
            if isinstance(result, BaseException):
                raise result

    async def close(self):
        self.closed = True
        # A shared-root observer must never cancel another manager's exports.
        await asyncio.gather(*(self.cancel(self.records[export_id]["project"], export_id)
                               for export_id in tuple(self.tasks)))
        await asyncio.gather(*tuple(self.tasks.values()), return_exceptions=True)

    async def _check_acl(self, record):
        if not await self.authorize(record["project"], record["user_id"]):
            raise PermissionError("Project export permission denied or revoked")

    def _cleanup(self, record):
        shutil.rmtree(self.work / record["id"], ignore_errors=True)
        if record["status"] != "done":
            shutil.rmtree(self.artifacts / record["id"], ignore_errors=True)

    @staticmethod
    def _validate(edit):
        if edit.get("fps", 30) != 30 or edit.get("ratio") not in {"16:9", "9:16", "1:1"}:
            raise ValueError("Exports require fps=30 and ratio 16:9, 9:16 or 1:1")
        if edit.get("resolution") not in {720, 1080, "720", "1080"}:
            raise ValueError("Export resolution must be 720 or 1080")
        clips, assets = edit["clips"], edit["assets"]
        if not 1 <= len(clips) <= 200 or total_duration(edit) > 3600:
            raise ValueError("Exports require 1..200 clips and duration <=3600 seconds")
        for clip in clips:
            asset = assets[clip["asset"]]
            kind = asset["kind"]
            speed = _number(clip.get("speed", 1))
            if kind not in {"image", "video"} or not 0.25 <= speed <= 4:
                raise ValueError("Invalid main-track asset kind or speed")
            if kind == "image" and speed != 1:
                raise ValueError("Images must use speed=1")
            if _number(clip["in"]) < 0 or clip.get("fit", "contain") not in {"contain", "cover"}:
                raise ValueError("Invalid clip interval or fit")
            if _number(clip.get("volume", 1)) < 0:
                raise ValueError("Volume must be nonnegative")
        previous_end = 0.0
        for item in sorted(edit.get("audio", []), key=lambda item: _number(item["start"])):
            asset = assets[item["asset"]]
            start, source_in, source_out = map(_number, (item["start"], item["in"], item["out"]))
            if (asset["kind"] not in {"audio", "video"} or not asset.get("has_audio", False)
                    or source_in < 0 or source_out <= source_in or start + 1e-7 < previous_end
                    or _number(item.get("volume", 1)) < 0):
                raise ValueError("Invalid or overlapping independent audio items")
            previous_end = start + source_out - source_in
        for item in edit.get("texts", []):
            if (not isinstance(item["text"], str) or "\x00" in item["text"]
                    or not 0 <= _number(item["start"]) < _number(item["end"])
                    or not 0 <= _number(item["x"]) <= 1 or not 0 <= _number(item["y"]) <= 1
                    or not 16 <= _number(item["size"]) <= 96
                    or not 0 <= _number(item.get("opacity", 1)) <= 1
                    or not re.fullmatch(r"#[0-9a-fA-F]{6}", item.get("color", "#ffffff"))):
                raise ValueError("Invalid timed text")

    async def _run(self, record):
        directory = self.work / record["id"]
        try:
            async with self.slots:
                if record["status"] == "canceled":
                    return
                self._update(record, status="running", progress=0.01)
                await asyncio.wait_for(self._check_acl(record), 30)
                executable = self.ffmpeg_bin
                if callable(executable):
                    executable = await asyncio.wait_for(asyncio.to_thread(executable), 30)
                if inspect.isawaitable(executable):
                    executable = await asyncio.wait_for(executable, 30)
                if not executable:
                    raise _ExportError("FFmpeg executable is missing")
                executable = str(executable)
                directory.mkdir(parents=True)
                duration = record["duration"]
                timeout = min(21600, max(180, duration * 20 + len(record["snapshot"]["clips"]) * 30))
                async with asyncio.timeout(timeout):
                    sources = await self._sources(record)
                    temporary = await self._render(record, executable, directory, sources)
                    await self._check_acl(record)
                    final = temporary.with_name("film.mp4")
                    os.replace(temporary, final)
                    await self._check_acl(record)
                    url = await self.publish(record["project"], record["user_id"], record["id"], final)
                    if not isinstance(url, str) or not url:
                        raise _ExportError("Export resource registration did not return a URL")
                    self._update(record, status="done", progress=1.0, url=url)
        except asyncio.CancelledError:
            if record["status"] != "canceled":
                self._update(record, status="canceled")
        except Exception as exc:
            message = str(exc) if isinstance(exc, _ExportError) else (
                "Project export permission denied or revoked" if isinstance(exc, PermissionError)
                else "Export exceeded its time limit" if isinstance(exc, TimeoutError)
                else f"Export failed ({type(exc).__name__})")
            self._update(record, status="error", error=message,
                         diagnostic=record.get("diagnostic") or str(exc)[-8192:])
        # The task's done callback cleans before releasing the lifetime lock,
        # including tasks canceled before _run ever starts.

    async def _sources(self, record):
        edit = record["snapshot"]
        ids = dict.fromkeys(item["asset"] for item in edit["clips"] + edit.get("audio", []))
        sources = {}
        for asset_id in ids:
            await self._check_acl(record)
            asset = edit["assets"][asset_id]
            # Callback receives a copy: it cannot modify the persisted render snapshot.
            path = await self.resolve_asset(record["project"], record["user_id"],
                                            json.loads(json.dumps(asset)))
            await self._check_acl(record)
            path = Path(path).resolve()
            if not path.is_file() or path.suffix.lower() not in _EXTENSIONS.get(asset["kind"], set()):
                raise _ExportError("Resolved asset is missing or is not an allowed media file")
            sources[asset_id] = path
        return sources

    async def _ffmpeg(self, record, executable, directory, arguments, duration):
        args = [executable, "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
                "-filter_threads", "2", "-filter_complex_threads", "2", *arguments]
        spawn = asyncio.create_task(asyncio.create_subprocess_exec(
            *args, cwd=str(directory), stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE))
        try:
            process = await asyncio.shield(spawn)
        except asyncio.CancelledError:
            # Even cancellation during process creation must not leave an orphan.
            try:
                process = await spawn
                await self._stop(process)
            finally:
                raise
        self.processes[record["id"]] = process
        tail = bytearray()

        async def drain():
            while True:
                block = await process.stderr.read(4096)
                if not block:
                    break
                tail.extend(block)
                if len(tail) > 8192:
                    del tail[:-8192]

        reader = asyncio.create_task(drain())
        try:
            await asyncio.wait_for(process.wait(), timeout=min(1800, max(60, duration * 12 + 30)))
            await reader
            if process.returncode:
                record["diagnostic"] = tail.decode("utf-8", errors="replace")
                raise _ExportError("FFmpeg could not render the media (codec, font or input error)")
        finally:
            await self._stop(process)
            await asyncio.gather(reader, return_exceptions=True)
            self.processes.pop(record["id"], None)

    @staticmethod
    async def _stop(process):
        if process.returncode is not None:
            return
        try:
            process.terminate()
        except ProcessLookupError:
            return
        try:
            await asyncio.wait_for(process.wait(), 5)
        except TimeoutError:
            try:
                process.kill()
            except ProcessLookupError:
                pass
            await process.wait()

    @staticmethod
    def _input(path, *options):
        forced = options[options.index("-f") + 1] if "-f" in options else None
        formats = "lavfi" if forced == "lavfi" else (
            "concat," + _MEDIA_FORMATS if forced == "concat" else _MEDIA_FORMATS)
        return ["-protocol_whitelist", "file,pipe", "-format_whitelist", formats,
                "-threads", "2", *options, "-i", str(path)]

    @staticmethod
    def _dimensions(edit):
        short = int(edit["resolution"])
        long = 1280 if short == 720 else 1920
        return {"16:9": (long, short), "9:16": (short, long), "1:1": (short, short)}[edit["ratio"]]

    async def _segment(self, record, executable, directory, sources, clip, index):
        edit = record["snapshot"]
        asset = edit["assets"][clip["asset"]]
        count = _frames(clip)
        duration = count / 30
        width, height = self._dimensions(edit)
        image = asset["kind"] == "image"
        source = sources[clip["asset"]]
        arguments = self._input(source, *(["-ignore_loop", "1"] if image and source.suffix.lower() == ".gif" else []))
        original_audio = not image and asset.get("has_audio", False)
        if not original_audio:
            arguments += self._input("anullsrc=r=48000:cl=stereo", "-f", "lavfi")
        scale = f"scale={width}:{height}:force_original_aspect_ratio="
        geometry = (scale + f"decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black"
                    if clip.get("fit", "contain") == "contain" else
                    scale + f"increase,crop={width}:{height}")
        # Loop the decoded first frame, not a demuxer-specific image2 option;
        # animated GIFs (and any other image animation) become static holds.
        video = ("trim=end_frame=1,loop=loop=-1:size=1:start=0,setpts=N/(30*TB)" if image else
                 f"trim=start={_fmt(clip['in'])}:end={_fmt(clip['out'])},setpts=(PTS-STARTPTS)/{_fmt(clip.get('speed', 1))}")
        # Preserve a sole decoded frame before fps sees EOF. Do this BEFORE
        # geometry too: scale/pad can clear its frame duration / EOF timing.
        # Pad again on the normalized clock for quantization or short-source
        # tails, then trim to the exact contract frame count.
        video += (f",tpad=stop_mode=clone:stop_duration={_fmt(duration)},fps=30:eof_action=pass,"
                  f"tpad=stop_mode=clone:stop_duration={_fmt(duration)},{geometry},setsar=1,"
                  f"trim=end_frame={count},setpts=N/(30*TB),format=yuv420p")
        audio = (f"[0:a:0]atrim=start={_fmt(clip['in'])}:end={_fmt(clip['out'])},asetpts=PTS-STARTPTS,"
                 f"{_atempo(float(clip.get('speed', 1)))},volume={_fmt(clip.get('volume', 1))}"
                 if original_audio else "[1:a:0]anull")
        audio += (f",aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo,apad,"
                  f"atrim=duration={_fmt(duration)},asetpts=N/SR/TB[a]")
        # MOV + integer frame timescales avoid Matroska's millisecond rounding
        # accumulating drift across many one-frame clips. PCM avoids per-clip
        # AAC priming / encoder-delay gaps.
        name = f"segment{index:04d}.mov"
        arguments += ["-filter_complex", f"[0:v:0]{video}[v];{audio}",
                      "-map", "[v]", "-map", "[a]", "-sn", "-dn", "-map_metadata", "-1",
                      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-threads", "2",
                      "-r", "30", "-fps_mode", "cfr", "-bf", "0",
                      "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2",
                      "-video_track_timescale", "30000", "-movie_timescale", "30000",
                      "-t", _fmt(duration), name]
        await self._ffmpeg(record, executable, directory, arguments, duration)
        return name

    async def _music(self, record, executable, directory, sources):
        edit, duration = record["snapshot"], record["duration"]
        items = sorted(edit.get("audio", []), key=lambda item: float(item["start"]))
        if not items:
            return None
        # One continuous independent track, including silence gaps. No atempo:
        # music follows timeline time, not the main-track speed.
        parts = []
        cursor = 0
        total_samples = round(duration * 48000)

        async def part(samples, item=None):
            if samples <= 0:
                return
            name = f"music{len(parts):04d}.wav"
            seconds = samples / 48000
            if item is None:
                args = self._input("anullsrc=r=48000:cl=stereo", "-f", "lavfi")
                audio = "anull"
            else:
                args = self._input(sources[item["asset"]])
                audio = (f"atrim=start={_fmt(item['in'])}:end={_fmt(item['out'])},asetpts=PTS-STARTPTS,"
                         f"volume={_fmt(item.get('volume', 1))}")
            audio += (f",aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo,"
                      f"apad,atrim=end_sample={samples},asetpts=N/SR/TB")
            args += ["-map", "0:a:0", "-vn", "-sn", "-dn", "-af", audio,
                     "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2", "-threads", "2",
                     "-t", _fmt(seconds), name]
            await self._ffmpeg(record, executable, directory, args, seconds)
            parts.append(name)

        for item in items:
            start = max(cursor, min(total_samples, math.floor(float(item["start"]) * 48000 + 0.5)))
            await part(start - cursor)
            cursor = start
            if cursor >= total_samples:
                break
            end = max(cursor, min(total_samples, math.floor((float(item["start"]) + float(item["out"]) -
                                                            float(item["in"])) * 48000 + 0.5)))
            await part(end - cursor, item)
            cursor = end
        await part(total_samples - cursor)
        playlist = directory / "music.txt"
        playlist.write_text("".join(f"file '{name}'\n" for name in parts), encoding="ascii")
        return playlist.name

    async def _render(self, record, executable, directory, sources):
        edit, duration = record["snapshot"], record["duration"]
        names = []
        for index, clip in enumerate(edit["clips"]):
            names.append(await self._segment(record, executable, directory, sources, clip, index))
            self._update(record, progress=0.05 + 0.7 * (index + 1) / len(edit["clips"]))
        playlist = directory / "segments.txt"
        playlist.write_text("".join(f"file '{name}'\n" for name in names), encoding="ascii")
        music = await self._music(record, executable, directory, sources)
        filters = await self._texts(edit, directory)
        self._update(record, progress=0.85)
        args = self._input(playlist.name, "-f", "concat", "-safe", "1")
        if music:
            args += self._input(music, "-f", "concat", "-safe", "1")
            audio = "[0:a:0][1:a:0]amix=inputs=2:duration=first:dropout_transition=0:normalize=0"
        else:
            audio = "[0:a:0]anull"
        audio += f",apad,atrim=duration={_fmt(duration)},asetpts=N/SR/TB[a]"
        args += ["-filter_complex", audio, "-map", "0:v:0", "-map", "[a]", "-sn", "-dn",
                 "-map_metadata", "-1"]
        frame_count = sum(_frames(clip) for clip in edit["clips"])
        # Rebuild the exact 30-fps clock after demuxer concat; never propagate
        # container duration rounding to the final film or text timing.
        video_filters = [f"setpts=N/(30*TB),trim=end_frame={frame_count}", *filters]
        args += ["-vf", ",".join(video_filters), "-c:v", "libx264", "-preset", "veryfast",
                 "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30", "-fps_mode", "cfr", "-bf", "0",
                 "-video_track_timescale", "30000", "-movie_timescale", "30000"]
        destination = self.artifacts / record["id"]
        destination.mkdir(parents=True)
        temporary = destination / "film.part.mp4"
        args += ["-threads", "2", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
                 "-t", _fmt(duration), "-movflags", "+faststart", "-f", "mp4", str(temporary)]
        await self._ffmpeg(record, executable, directory, args, duration)
        if not temporary.is_file() or not temporary.stat().st_size:
            raise _ExportError("FFmpeg did not produce an MP4 file")
        self._update(record, progress=0.98)
        return temporary

    async def _texts(self, edit, directory):
        texts = [item for item in edit.get("texts", [])
                 if item["text"] and float(item["start"]) < total_duration(edit)
                 and _activation_frame(item["start"]) < _activation_frame(item["end"])]
        if not texts:
            return []
        family, font_data = await asyncio.to_thread(_installed_font, "".join(item["text"] for item in texts))
        fonts = directory / "fonts"
        fonts.mkdir()
        (fonts / "font.ttf").write_bytes(font_data)
        width, height = self._dimensions(edit)
        ass = ["[Script Info]", "ScriptType: v4.00+", f"PlayResX: {width}", f"PlayResY: {height}",
               "WrapStyle: 2", "ScaledBorderAndShadow: yes", "[V4+ Styles]",
               "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
               f"Style: Default,{family},32,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,5,0,0,0,1",
               "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
        literal_filters = []
        normal_count = 0
        for index, item in enumerate(texts):
            text = item["text"].replace("\r\n", "\n").replace("\r", "\n").replace("\t", "    ")
            color = item.get("color", "#ffffff")[1:]
            x, y = float(item["x"]) * width, float(item["y"]) * height
            size = float(item["size"])
            opacity = float(item.get("opacity", 1))
            if any(character in text for character in "{}\\"):
                # ASS has no portable literal brace escaping. Never pass these
                # strings to its override parser; drawtext reads a separate UTF-8
                # file with expansion disabled. All filter values are numeric or
                # generated ASCII paths, never user text.
                name = f"text{index:04d}.txt"
                (directory / name).write_text(text, encoding="utf-8")
                literal_filters.append(
                    f"drawtext=fontfile=fonts/font.ttf:textfile={name}:expansion=none:"
                    f"fontsize={_fmt(size)}:fontcolor=0x{color}@{_fmt(opacity)}:"
                    f"borderw=2:bordercolor=black@{_fmt(opacity)}:"
                    f"x={_fmt(x)}-text_w/2:y={_fmt(y)}-text_h/2:"
                    f"enable='gte(n,{_activation_frame(item['start'])})*lt(n,{_activation_frame(item['end'])})'")
            else:
                # Only generated override tags; user text contains neither
                # backslashes nor braces. Apostrophes and DEL are not ASS tags.
                bgr = color[4:6] + color[2:4] + color[0:2]
                alpha = f"{math.floor((1 - opacity) * 255 + 0.5):02X}"
                tags = "{" + f"\\an5\\pos({_fmt(x)},{_fmt(y)})\\fs{_fmt(size)}\\c&H{bgr}&\\alpha&H{alpha}&" + "}"
                payload = text.replace("\n", "\\N")
                ass.append(f"Dialogue: 0,{_ass_time(item['start'])},{_ass_time(item['end'])},Default,,0,0,0,,{tags}{payload}")
                normal_count += 1
        filters = []
        if normal_count:
            (directory / "captions.ass").write_text("\n".join(ass) + "\n", encoding="utf-8")
            # cwd + internal relative paths avoid Windows drive-colon escaping.
            filters.append("subtitles=filename=captions.ass:fontsdir=fonts")
        return filters + literal_filters


class _ExportError(RuntimeError):
    """A safe public error message, with no local paths or raw FFmpeg stderr."""


def _activation_frame(seconds):
    # [start, end) on the final 30-fps grid, with only a tiny arithmetic
    # tolerance at exact frame boundaries. Used by BOTH text renderers.
    return math.ceil(float(seconds) * 30 - 1e-9)


def _ass_time(seconds):
    # ASS can store only centiseconds. Place its threshold after the previous
    # frame and at/before the intended activation frame, not nearest rounding
    # of raw seconds (which can activate a frame too early).
    centiseconds = _activation_frame(seconds) * 100 // 30
    minutes, fraction = divmod(centiseconds, 6000)
    hours, minutes = divmod(minutes, 60)
    whole, fraction = divmod(fraction, 100)
    return f"{hours}:{minutes:02d}:{whole:02d}.{fraction:02d}"


def _installed_font(text):
    """Find an actual installed font with full glyph coverage; never silent tofu.

    Run in a thread. Returns in-memory font bytes, so cancellation cannot race
    work-directory cleanup. A TTC face is extracted as a standalone TTF.
    """
    try:
        from fontTools.ttLib import TTFont, TTLibError
    except ImportError as exc:
        raise _ExportError("Text export requires fontTools; install fonttools and a Chinese/CJK font") from exc
    from io import BytesIO

    required = {ord(character) for character in text if not character.isspace() and ord(character) >= 32
                and ord(character) != 127}
    directories = [Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts",
                   Path("/usr/share/fonts"), Path("/usr/local/share/fonts"),
                   Path.home() / ".local/share/fonts", Path.home() / ".fonts",
                   Path("/System/Library/Fonts"), Path("/Library/Fonts")]
    paths = {path for directory in directories if directory.is_dir()
             for path in directory.rglob("*") if path.suffix.lower() in {".ttf", ".otf", ".ttc"}}
    preferred = ("msyh", "notosanscjk", "notosanssc", "sourcehansans", "simhei", "simsun", "dejavusans", "arial")

    def priority(path):
        name = path.name.lower().replace("-", "")
        return next((index for index, token in enumerate(preferred) if token in name), len(preferred)), str(path)

    for path in sorted(paths, key=priority):
        try:
            with TTFont(str(path), fontNumber=0, lazy=False) as font:
                if not required.issubset(font.getBestCmap() or {}):
                    continue
                family = font["name"].getDebugName(1)
                if not family or any(character in family for character in ",\r\n{}\\"):
                    continue
                buffer = BytesIO()
                font.save(buffer)
                return family, buffer.getvalue()
        except (OSError, KeyError, ValueError, TTLibError):
            continue
    raise _ExportError("No installed font covers the subtitle text (Chinese/CJK font missing); install Noto Sans CJK or Microsoft YaHei")
