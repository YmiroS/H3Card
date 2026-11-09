"""Read-only, metadata-only model inventory; never traverse reparse points."""
import json
import os
from pathlib import Path
import stat

import yaml

MAX_BYTES = 50 * 1024


def _absolute(path):
    # resolve() would silently follow a symlink/junction before we could reject it.
    return Path(os.path.abspath(os.path.expandvars(os.path.expanduser(str(path)))))


def _link(info):
    return stat.S_ISLNK(info.st_mode) or bool(getattr(info, "st_file_attributes", 0) & 0x400)


def _check_ancestors(path):
    for parent in reversed(path.parents):
        if _link(parent.lstat()):
            raise OSError(f"Refusing linked/reparse ancestor: {parent}")


def scan_inventory(comfy_root, *, offset=0, limit=100, extra_config=None):
    """Return a bounded page, including link metadata but never link targets.

    extra_config is a YAML filename, or a list of YAML filenames; relative names
    are based on comfy_root. Default: comfy_root/extra_model_paths.yaml. Entries
    outside models are explicitly labeled shared; their base_path follows ComfyUI
    YAML semantics (relative to the YAML directory). No weight files are opened.
    size/size_bytes are lstat logical sizes, never allocated or reclaimable space;
    link entries describe the link itself, not its target. st_dev/st_ino/st_nlink
    are raw metadata; file_identity preserves dev:ino exactly for JSON consumers
    with limited integer precision (only available when st_ino is nonzero).
    Pagination is best-effort across a changing filesystem, not a snapshot.
    """
    root = _absolute(comfy_root)
    offset, limit = max(0, int(offset)), max(1, min(100, int(limit)))
    configs = ([root / "extra_model_paths.yaml"] if extra_config is None else
               list(extra_config) if isinstance(extra_config, (list, tuple)) else [extra_config])
    configs = [_absolute(path if Path(path).is_absolute() else root / path) for path in configs]
    result = {"comfy_root": str(root), "extra_config": [str(path) for path in configs],
              "roots": [], "offset": offset, "limit": limit, "entries": [],
              "next_offset": None, "has_more": False, "scan_errors": [],
              "links_followed": False,
              "size_semantics": "logical_bytes_from_lstat_not_allocated_or_reclaimable",
              "pagination": "live filesystem, not a snapshot"}
    sources = [(root / "models", "models", False)]
    errors_truncated = False

    def error(path, message):
        nonlocal errors_truncated
        if len(result["scan_errors"]) < 16:
            result["scan_errors"].append({"path": str(path)[:1024], "error": str(message)[:512]})
        else:
            errors_truncated = True

    for config in configs:
        try:
            _check_ancestors(config)
            info = config.lstat()
            if _link(info) or not stat.S_ISREG(info.st_mode):
                raise OSError("Refusing linked/reparse or non-regular configuration file")
            if info.st_size > 1024 * 1024:
                raise ValueError("Extra model configuration exceeds 1 MiB")
            data = yaml.safe_load(config.read_text(encoding="utf-8")) or {}
            if not isinstance(data, dict):
                raise ValueError("Extra model configuration must be a mapping")
            for group, values in data.items():
                if values is None:
                    continue
                if not isinstance(values, dict):
                    error(config, f"Invalid extra model group: {group}")
                    continue
                base = _absolute(config.parent / os.path.expandvars(os.path.expanduser(str(values.get("base_path", ".")))))
                for category, paths in values.items():
                    if category in {"base_path", "is_default"}:
                        continue
                    if not isinstance(paths, str):
                        error(config, f"Invalid paths for {group}/{category}")
                        continue
                    for path in paths.splitlines():
                        if path.strip():
                            sources.append((_absolute(base / path.strip()), f"{group}/{category}", True))
        except FileNotFoundError as exc:
            if extra_config is not None:
                error(config, exc)
        except (OSError, ValueError, yaml.YAMLError) as exc:
            error(config, exc)

    # Bound configuration metadata too; entries reserve ample room under the wire cap.
    unique = set()
    roots = []
    for path, category, shared in sources:
        identity = os.path.normcase(str(path))
        if identity in unique:
            continue
        if len(roots) >= 64:
            error(path, "Additional configured roots omitted (64-root cap)")
            break
        unique.add(identity)
        roots.append((path, category, shared))
        result["roots"].append({"path": str(path), "category": category, "shared": shared})

    def entries(path, source, shared):
        try:
            info = path.lstat()
            linked = _link(info)
            if linked or stat.S_ISREG(info.st_mode):
                try:
                    relative = os.path.relpath(path, root)
                except ValueError:  # different Windows drive
                    relative = None
                yield {"path": str(path), "relative_path": relative, "root": str(source),
                       "size": info.st_size, "size_bytes": info.st_size, "mtime": info.st_mtime,
                       "st_dev": info.st_dev, "st_ino": info.st_ino, "st_nlink": info.st_nlink,
                       "file_identity": f"{info.st_dev}:{info.st_ino}" if info.st_ino else None,
                       "hardlink": not linked and stat.S_ISREG(info.st_mode) and info.st_nlink > 1,
                       "symlink": stat.S_ISLNK(info.st_mode),
                       "reparse_point": bool(getattr(info, "st_file_attributes", 0) & 0x400),
                       "shared": shared or linked, "type": "link" if linked else "file"}
            elif stat.S_ISDIR(info.st_mode):
                # Close the scandir handle before descending; metadata only, no file opens.
                with os.scandir(path) as directory:
                    names = sorted(item.name for item in directory)
                for name in names:
                    yield from entries(path / name, source, shared)
        except OSError as exc:
            error(path, exc)

    count = 0
    stop = False
    for path, category, shared in roots:
        if stop:
            break
        try:
            _check_ancestors(path)
            for entry in entries(path, path, shared):
                if count < offset:
                    count += 1
                    continue
                if len(result["entries"]) >= limit:
                    result["has_more"] = True
                    stop = True
                    break
                result["entries"].append(entry)
                # ensure_ascii=True is the larger encoding used by many JSON consumers.
                if len(json.dumps(result, ensure_ascii=True).encode("utf-8")) > 48000:
                    result["entries"].pop()
                    result["has_more"] = True
                    stop = True
                    if not result["entries"]:
                        # Path metadata itself cannot fit. Explicitly skip it, without looping forever.
                        error(entry["path"], "Entry metadata exceeds page budget; skipped")
                        count += 1
                    break
                count += 1
        except OSError as exc:
            error(path, exc)
    if result["has_more"]:
        result["next_offset"] = count
    result["scan_errors_truncated"] = errors_truncated
    # Extremely long configuration paths can exceed even the metadata reserve.
    while len(json.dumps(result, ensure_ascii=True).encode("utf-8")) > MAX_BYTES:
        if result["roots"]:
            result["roots"].pop()
        elif result["scan_errors"]:
            result["scan_errors"].pop()
        elif result["extra_config"]:
            result["extra_config"].pop()
        else:
            raise ValueError("Inventory root metadata exceeds 50 KiB")
        result["metadata_truncated"] = True
    return result
