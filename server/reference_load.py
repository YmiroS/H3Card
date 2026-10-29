"""Privacy-safe, best-effort reference load estimates for a submitted API graph.

No I/O is performed here. ``probe`` receives only a recognized file loader's
literal filename; its result and exceptions are never copied to the output.
Effective sizes describe H3's retained tensors, not encoder token counts.
Qwen effective sizes remain unknown. Probe frames/fps/duration may themselves
be container-derived estimates, never verified decoded frame counts. Truncated
groups/counts are lower bounds and complete is false.
"""

import math
import re


_MAX_NUMBER = 2 ** 53 - 1
_MAX_GROUPS = 64
_MAX_REFERENCES = 64
_MAX_DEPTH = 32
_H3 = "MiniMaxH3ReferenceToVideo"
_CONSUMERS = {_H3, "TextEncodeQwenImageEditPlus", "TextEncodeQwenImage21"}
_ID = re.compile(r"[A-Za-z0-9_:.\-]{1,160}\Z")
_H3_SLOTS = (
    (re.compile(r"ref_images\.ref_image_[0-9]+\Z"), "image"),
    (re.compile(r"ref_videos\.ref_video_[0-9]+\Z"), "video"),
    (re.compile(r"ref_video_audios\.ref_video_audio_[0-9]+\Z"), "video_audio"),
    (re.compile(r"ref_audios\.ref_audio_[0-9]+\Z"), "audio"),
)
_RATIOS = {
    "1:1 (Square)": (1, 1), "2:3 (Portrait Photo)": (2, 3),
    "3:2 (Photo)": (3, 2), "3:4 (Portrait Standard)": (3, 4),
    "4:3 (Standard)": (4, 3), "9:16 (Portrait Widescreen)": (9, 16),
    "16:9 (Widescreen)": (16, 9), "21:9 (Ultrawide)": (21, 9),
}
_H3_LENGTH_EXPRESSION = (
    "max(5, round(a * 24)) + (5 - (max(5, round(a * 24)) % 17)) % 17"
)
_KONTEXT_SIZES = (
    (672, 1568), (688, 1504), (720, 1456), (752, 1392), (800, 1328),
    (832, 1248), (880, 1184), (944, 1104), (1024, 1024), (1104, 944),
    (1184, 880), (1248, 832), (1328, 800), (1392, 752), (1456, 720),
    (1504, 688), (1568, 672),
)
_RAW_KEYS = ("width", "height", "frames", "fps", "duration")


def _number(value, *, zero=False, integer=False):
    if type(value) not in (int, float):
        return None
    if not 0 <= value <= _MAX_NUMBER or not math.isfinite(value):
        return None
    if (not zero and value == 0) or (integer and int(value) != value):
        return None
    return int(value) if integer else value


def _node_id(value):
    if type(value) is int:
        value = str(value)
    return value if isinstance(value, str) and _ID.fullmatch(value) else None


def _link(value):
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        return None
    node_id = _node_id(value[0])
    slot = value[1]
    if node_id is None or type(slot) is not int or not 0 <= slot <= _MAX_NUMBER:
        return None
    return node_id, slot


def _inputs(node):
    value = node.get("inputs", {}) if isinstance(node, dict) else {}
    return value if isinstance(value, dict) else {}


def _empty_media(raw=None):
    return {"raw": raw or {}, "type": None, "width": None, "height": None,
            "frames": None, "fps": None, "duration": None}


def _aligned_frames(length):
    length = _number(length, integer=True)
    if length is None:
        return None
    n = max(5, length)
    return _number(n + (5 - n) % 17, integer=True)


def _round32(value):
    return _number(max(32, round(value / 32) * 32), integer=True)


class _Reader:
    def __init__(self, graph, probe):
        self.graph = graph
        self.probe = probe
        self.probes = {}

    def metadata(self, filename):
        # A primitive String link is deliberately NOT a file-loader literal.
        if not isinstance(filename, str) or not filename:
            return {}
        if filename not in self.probes:
            try:
                result = self.probe(filename)
                raw = {}
                if isinstance(result, dict):
                    for key in _RAW_KEYS:
                        raw[key] = _number(result.get(key), integer=key in {"width", "height", "frames"})
                    raw["has_audio"] = result.get("has_audio") is True
                self.probes[filename] = raw
            except Exception:
                self.probes[filename] = {}
        return self.probes[filename]

    def literal(self, value, seen=frozenset()):
        link = _link(value)
        if link is None:
            return value if type(value) in (str, int, float) else None
        if link in seen or len(seen) >= _MAX_DEPTH:
            return None
        node = self.graph.get(link[0], {})
        if not isinstance(node, dict):
            return None
        kind, slot = node.get("class_type"), link[1]
        args = _inputs(node)
        seen = seen | {link}
        resolve = lambda key, default=None: self.literal(args.get(key, default), seen)
        primitives = {"PrimitiveInt", "PrimitiveFloat", "PrimitiveString", "PrimitiveStringMultiline"}
        if kind in primitives and slot == 0:
            result = resolve("value")
            if kind == "PrimitiveInt":
                return _number(result, zero=True, integer=True)
            if kind == "PrimitiveFloat":
                return _number(result, zero=True)
            return result if isinstance(result, str) else None
        if kind == "ResolutionSelector" and slot in (0, 1):
            ratio = resolve("aspect_ratio", "1:1 (Square)")
            mp = _number(resolve("megapixels", 1.0))
            multiple = _number(resolve("multiple", 8), integer=True)
            if isinstance(ratio, str) and ratio in _RATIOS and mp and multiple:
                rw, rh = _RATIOS[ratio]
                scale = math.sqrt(mp * 1024 * 1024 / (rw * rh))
                return _number(round((rw, rh)[slot] * scale / multiple) * multiple, integer=True)
        # Exact expression from the shipped H3 graphs, never eval user text.
        if kind == "ComfyMathExpression" and slot in (0, 1):
            if args.get("expression") == _H3_LENGTH_EXPRESSION:
                seconds = _number(resolve("values.a"), zero=True)
                if seconds is not None:
                    return _aligned_frames(max(5, round(seconds * 24)))
        return None

    def media(self, value, seen=frozenset()):
        link = _link(value)
        if link is None or link in seen or len(seen) >= _MAX_DEPTH:
            return _empty_media()
        node = self.graph.get(link[0], {})
        if not isinstance(node, dict):
            return _empty_media()
        kind, slot = node.get("class_type"), link[1]
        args = _inputs(node)
        seen = seen | {link}
        loaders = {"LoadImage": ("image", 0, "image"),
                   "LoadAudio": ("audio", 0, "audio"),
                   "LoadVideo": ("file", 0, "video")}
        if kind in loaders:
            field, output, media_type = loaders[kind]
            if slot != output:
                return _empty_media()
            raw = self.metadata(args.get(field))
            result = _empty_media(raw)
            result.update({key: raw.get(key) for key in _RAW_KEYS})
            result["type"] = media_type
            return result
        if kind in {"VHS_LoadVideo", "VHS_LoadVideoFFmpeg"}:
            if slot not in (0, 2):
                return _empty_media()
            raw = self.metadata(args.get("video"))
            return self.vhs(kind, slot, args, raw)
        if kind == "GetVideoComponents" and slot in (0, 1):
            upstream = self.media(args.get("video"), seen)
            if upstream["type"] != "video":
                return _empty_media(upstream["raw"])
            result = dict(upstream)
            result["type"] = "image" if slot == 0 else "audio"
            if slot == 1 and not upstream["raw"].get("has_audio"):
                return _empty_media(upstream["raw"])
            return result
        if kind in {"ImageScaleToTotalPixels", "FluxKontextImageScale"} and slot == 0:
            upstream = self.media(args.get("image"), seen)
            result = _empty_media(upstream["raw"])
            w, h = upstream["width"], upstream["height"]
            if upstream["type"] == "image" and w and h:
                if kind == "FluxKontextImageScale":
                    _, w, h = min((abs(w / h - x / y), x, y) for x, y in _KONTEXT_SIZES)
                else:
                    mp = _number(self.literal(args.get("megapixels", 1.0)))
                    steps = _number(self.literal(args.get("resolution_steps", 1)), integer=True)
                    method = self.literal(args.get("upscale_method"))
                    if not mp or not steps or method not in {"nearest-exact", "bilinear", "area", "bicubic", "lanczos"}:
                        return result
                    scale = math.sqrt(mp * 1024 * 1024 / (w * h))
                    w, h = round(w * scale / steps) * steps, round(h * scale / steps) * steps
                w, h = _number(w, integer=True), _number(h, integer=True)
                if w and h:
                    result.update(upstream, width=w, height=h)
            return result
        # Provenance only: an unknown transform is NEVER an effective-size
        # passthrough. Follow a single unambiguous media input to retain raw data.
        edges = [args[key] for key in ("image", "images", "video", "audio")
                 if _link(args.get(key)) is not None]
        if len(edges) == 1:
            return _empty_media(self.media(edges[0], seen)["raw"])
        return _empty_media()

    def vhs(self, kind, slot, args, raw):
        result = _empty_media(raw)
        resolve = lambda key, default: self.literal(args.get(key, default))
        # The current VHS drops legacy force_size. Non-disabled legacy values
        # are still unknown here, rather than assuming another version's resize.
        force_size = resolve("force_size", "Disabled")
        fmt = resolve("format", "None")
        if force_size not in ("Disabled", "disabled", "None") or fmt not in ("None", "AnimateDiff"):
            return result
        if args.get("vae") is not None or args.get("meta_batch") is not None:
            return result
        result["type"] = "image" if slot == 0 else "audio"
        ffmpeg = kind == "VHS_LoadVideoFFmpeg"
        cw = _number(resolve("custom_width", 0), zero=True, integer=True)
        ch = _number(resolve("custom_height", 0), zero=True, integer=True)
        w, h = raw.get("width"), raw.get("height")
        if cw is not None and ch is not None and w and h:
            if cw and ch:
                w, h = cw, ch
            elif cw:
                w, h = cw, h * cw / w
            elif ch:
                w, h = w * ch / h, ch
            if not ffmpeg or cw or ch:
                multiple = 8 if fmt == "AnimateDiff" else 1
                w = int(w / multiple + 0.5) * multiple
                h = int(h / multiple + 0.5) * multiple
            result.update(width=_number(w, integer=True), height=_number(h, integer=True))
        rate = _number(resolve("force_rate", 0), zero=True)
        cap = _number(resolve("frame_load_cap", 0), zero=True, integer=True)
        skip = _number(resolve("skip_first_frames", 0), zero=True, integer=True)
        every = _number(resolve("select_every_nth", 1), integer=True)
        start = _number(resolve("start_time", 0), zero=True)
        if None in (rate, cap, skip, every, start):
            return result
        if (ffmpeg and (skip != 0 or every != 1)) or (not ffmpeg and start != 0):
            return result
        fps = raw.get("fps")
        target = rate or fps
        duration = raw.get("duration")
        source_frames = raw.get("frames")
        if duration is None and source_frames and fps:
            duration = source_frames / fps
        n = None
        if ffmpeg:
            if start == 0 and (rate == 0 or rate == fps) and source_frames:
                n = source_frames
            elif duration is not None and target:
                n = math.floor(max(0, duration - start) * target + 1e-9)
        elif source_frames and (rate == 0 or rate == fps):
            n = source_frames
        elif source_frames and fps and target:
            # cv_frame_generator starts with an already-grabbed first frame;
            # the last frame is not repeated beyond its source timestamp.
            n = math.floor((source_frames - 1) * target / fps + 1e-9) + 1
        elif duration is not None and target:
            n = math.floor(duration * target + 1e-9)
        if n is not None:
            n = max(0, n - skip)
            n = (n + every - 1) // every
            if cap:
                n = min(n, cap)
            result["frames"] = _number(n, integer=True)
        result["fps"] = _number(target / every) if target else None
        if slot == 2:
            # VHS audio extraction uses cap*time_step, not the retained frame
            # count; select_every_nth does not time-stretch the waveform.
            if raw.get("has_audio") and duration is not None and target:
                start = start if ffmpeg else skip / target
                kept = max(0, duration - start)
                if cap:
                    kept = min(kept, cap * every / target)
                result["duration"] = _number(kept)
        elif result["frames"] and result["fps"]:
            result["duration"] = _number(result["frames"] / result["fps"])
        return result


def _slot_kind(node_type, name):
    if not isinstance(name, str):
        return None
    if node_type == _H3:
        for pattern, kind in _H3_SLOTS:
            if pattern.fullmatch(name):
                return kind
    elif node_type == "TextEncodeQwenImageEditPlus":
        return "image" if name in ("image1", "image2", "image3") else None
    elif node_type == "TextEncodeQwenImage21":
        return "image" if re.fullmatch(r"images\.image_[0-9]+", name) else None
    return None


def _reference(reader, name, kind, value, group):
    link = _link(value)
    media = reader.media(value)
    raw = media["raw"]
    result = {"kind": kind, "input": name, "source_node": link[0] if link else None,
              **{"raw_" + key: raw.get(key) for key in _RAW_KEYS},
              "width": None, "height": None, "frames": None, "duration": None,
              "estimated": True}
    if group["node_type"] != _H3:
        return result
    w, h = media["width"], media["height"]
    if kind == "image" and media["type"] == "image":
        result["frames"] = 1
        mode = group["ref_image_size"]
        if w and h and mode is not None:
            if mode == "match":
                gw, gh = group["width"], group["height"]
                if not gw or not gh:
                    return result
                scale = min(1.0, math.sqrt(gw * gh / (w * h)))
            else:
                scale = min(1.0, 2048 / min(w, h))
            result.update(width=_round32(w * scale), height=_round32(h * scale))
    elif kind == "video" and media["type"] == "image":
        if w and h:
            ratio = w / h
            cw, ch = (768 * ratio, 768) if ratio >= 1 else (768, 768 / ratio)
            if cw * ch > 768 * 1344:
                scale = math.sqrt(768 * 1344 / (cw * ch))
                cw, ch = cw * scale, ch * scale
            cw, ch = _round32(cw), _round32(ch)
            if cw and ch and w * h < cw * ch:
                cw, ch = _round32(w), _round32(h)
            result.update(width=cw, height=ch)
        if media["frames"] and group["frames"]:
            n = min(media["frames"], group["frames"])
            if n >= 5:
                n -= (n - 5) % 17
                result.update(frames=n, duration=_number(n / 24))
    elif kind in ("audio", "video_audio") and media["type"] == "audio":
        result["duration"] = media["duration"]
    return result


def _sum_load(references, kind, fields):
    total = 0
    for ref in references:
        if ref["kind"] != kind:
            continue
        product = 1
        for field in fields:
            if ref[field] is None:
                return None
            product *= ref[field]
        total += product
    return _number(total, zero=True)


def _make_reference_load(graph, probe):
    result = {"version": 1, "source": "submitted_graph_estimate", "groups": [], "complete": True}
    if not isinstance(graph, dict):
        result["complete"] = False
        return result
    reader = _Reader(graph, probe)
    for node_id, node in graph.items():
        if not isinstance(node, dict) or node.get("class_type") not in _CONSUMERS:
            continue
        safe_id = _node_id(node_id)
        if safe_id is None or len(result["groups"]) >= _MAX_GROUPS:
            result["complete"] = False
            continue
        args = _inputs(node)
        if not isinstance(node.get("inputs"), dict):
            result["complete"] = False
        node_type = node["class_type"]
        h3 = node_type == _H3
        mode = reader.literal(args.get("ref_image_size", "match")) if h3 else None
        group = {
            "node_id": safe_id, "node_type": node_type,
            "width": _number(reader.literal(args.get("width")), integer=True) if h3 else None,
            "height": _number(reader.literal(args.get("height")), integer=True) if h3 else None,
            "frames": _aligned_frames(reader.literal(args.get("length"))) if h3 else None,
            "ref_image_size": mode if mode in ("max", "match") else None,
            "references": [],
        }
        for name, value in args.items():
            kind = _slot_kind(node_type, name)
            if kind is None or value is None:
                continue
            if len(name) > 160 or _link(value) is None or len(group["references"]) >= _MAX_REFERENCES:
                result["complete"] = False
                continue
            group["references"].append(_reference(reader, name, kind, value, group))
        videos = {ref["input"].rsplit("_", 1)[-1]: ref
                  for ref in group["references"] if ref["kind"] == "video"}
        for ref in group["references"]:
            if ref["kind"] == "video_audio":
                video = videos.get(ref["input"].rsplit("_", 1)[-1])
                if video and video["duration"] is not None and ref["duration"] is not None:
                    ref["duration"] = min(ref["duration"], video["duration"])
                else:
                    ref["duration"] = None
            fields = ("width", "height", "frames") if ref["kind"] in ("image", "video") else ("duration",)
            if any(ref[key] is None for key in fields):
                result["complete"] = False
        for kind in ("image", "video", "audio", "video_audio"):
            group[kind + "_count"] = sum(ref["kind"] == kind for ref in group["references"])
        group["image_pixels"] = _sum_load(group["references"], "image", ("width", "height"))
        group["video_pixel_frames"] = _sum_load(group["references"], "video", ("width", "height", "frames"))
        if group["image_pixels"] is None or group["video_pixel_frames"] is None:
            result["complete"] = False
        result["groups"].append(group)
    return result


def make_reference_load(graph, probe):
    """Return bounded, JSON-safe diagnostics; never alter graph or reject a job.

    ``probe(ref)`` returns width/height/frames/fps/duration/has_audio metadata.
    It is called at most once per distinct literal ref in this invocation.
    Unknown values are None, including partially known loads (never a zero
    placeholder). Empty reference categories alone have zero aggregate load.
    Each consumer stays separate: callers must not sum Qwen positive/negative
    groups as if they were distinct material inventories.
    """
    try:
        return _make_reference_load(graph, probe)
    except Exception:
        # Diagnostics cannot prevent submission, even for malformed API graphs.
        return {"version": 1, "source": "submitted_graph_estimate", "groups": [], "complete": False}
