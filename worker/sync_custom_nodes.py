"""Synchronize authoritative custom nodes, backing up replaced and removed files."""
import argparse
import hashlib
import os
from pathlib import Path
import shutil
import stat
import tempfile


EXCLUDED_DIRECTORIES = {".git", ".venv", "venv", "node_modules"}
CODE_SUFFIXES = {
    ".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".json",
    ".yaml", ".yml", ".toml", ".txt", ".ini", ".cfg", ".html", ".css",
    ".vue", ".sh", ".bat", ".ps1", ".pth", ".xml", ".md", ".cu", ".cpp", ".h",
}


def check_path(path):
    for part in (path, *path.parents):
        if part.exists() or part.is_symlink():
            info = part.lstat()
            if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & 0x400:
                raise RuntimeError(f"Refusing linked/reparse path: {part}")


def inventory(root, *, source):
    files, directories = {}, set()
    if not root.exists():
        return files, directories

    def visit(directory):
        for path in directory.iterdir():
            check_path(path)
            relative = path.relative_to(root)
            if path.is_dir():
                if path.name.lower() in EXCLUDED_DIRECTORIES:
                    continue
                if source and path.name == "__pycache__":
                    continue
                directories.add(relative)
                visit(path)
            elif path.is_file():
                if source and path.suffix.lower() in {".pyc", ".pyo"}:
                    continue
                files[relative] = path
            else:
                raise RuntimeError(f"Unsupported file type: {path}")

    visit(root)
    return files, directories


def digest(path):
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(block)
    return value.digest()


def differs(source, destination):
    before, after = source.stat(), destination.stat()
    if before.st_size != after.st_size:
        return True
    if source.suffix.lower() in CODE_SUFFIXES:
        return digest(source) != digest(destination)
    return before.st_mtime_ns != after.st_mtime_ns


def synchronize(source, destination, backup_root, *, dry_run=False):
    source, destination, backup_root = [Path(os.path.abspath(p)) for p in
                                        (source, destination, backup_root)]
    for path in (source, destination, backup_root):
        check_path(path)
    for left, right in ((source, destination), (source, backup_root), (destination, backup_root)):
        if left == right or left in right.parents or right in left.parents:
            raise RuntimeError("Source, destination and backup roots must be separate trees")
    if not source.is_dir():
        raise RuntimeError(f"Source custom_nodes directory is missing: {source}")
    source_files, source_dirs = inventory(source, source=True)
    target_files, target_dirs = inventory(destination, source=False)
    if not source_files:
        raise RuntimeError("Source custom_nodes is empty; refusing to remove worker nodes")
    conflicts = (source_files.keys() & target_dirs) | (source_dirs & target_files.keys())
    if conflicts:
        raise RuntimeError(f"File/directory conflict; resolve before synchronization: {sorted(conflicts)}")
    added = sorted(source_files.keys() - target_files.keys())
    changed = sorted(name for name in source_files.keys() & target_files.keys()
                     if differs(source_files[name], target_files[name]))
    removed = sorted(target_files.keys() - source_files.keys())
    print(f"Custom nodes: {len(added)} added, {len(changed)} replaced, {len(removed)} removed", flush=True)
    for action, names in (("ADD", added), ("REPLACE", changed), ("REMOVE", removed)):
        for name in names:
            print(f"{action}: {name}", flush=True)
    if dry_run:
        return
    # Complete all backups before replacing or deleting any node file.
    if changed or removed:
        backup_root.mkdir(parents=True, exist_ok=True)
        backup = Path(tempfile.mkdtemp(prefix="custom-nodes-", dir=backup_root))
        print(f"Custom node backup: {backup}", flush=True)
        for name in changed + removed:
            saved = backup / name
            saved.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target_files[name], saved)
    for name in sorted(source_dirs, key=lambda p: (len(p.parts), p)):
        (destination / name).mkdir(parents=True, exist_ok=True)
    destination.mkdir(parents=True, exist_ok=True)
    for name in added + changed:
        target = destination / name
        # Same-directory replacement avoids leaving a truncated Python file on copy failure.
        handle, staging = tempfile.mkstemp(prefix=".chouka-sync-", dir=target.parent)
        os.close(handle)
        try:
            shutil.copy2(source_files[name], staging)
            os.replace(staging, target)
        finally:
            if os.path.exists(staging):
                os.unlink(staging)
    for name in removed:
        target_files[name].unlink()
    for name in sorted(target_dirs - source_dirs, key=lambda p: (-len(p.parts), p)):
        directory = destination / name
        # Excluded local tooling directories may still live inside this directory.
        if not any(directory.iterdir()):
            directory.rmdir()


def clear_core_cache(root, *, dry_run=False):
    root = Path(os.path.abspath(root))
    check_path(root)
    protected = {"models", "user", "input", "output", "temp", "custom_nodes",
                 ".github", "tests", "tests-unit", "config", "styles", "comfyui-editutils"}
    cached_files, cache_dirs = [], []

    def visit(directory):
        for path in directory.iterdir():
            if path.name.lower() in EXCLUDED_DIRECTORIES:
                continue
            if directory == root and path.name.lower() in protected:
                continue
            check_path(path)
            if path.is_dir():
                if path.name == "__pycache__":
                    cache_dirs.append(path)
                visit(path)
            elif path.suffix.lower() in {".pyc", ".pyo"}:
                cached_files.append(path)

    visit(root)
    for path in cached_files:
        print(f"CLEAR CORE CACHE: {path.relative_to(root)}", flush=True)
        if not dry_run:
            path.unlink()
    if not dry_run:
        for path in sorted(cache_dirs, key=lambda p: -len(p.parts)):
            if not any(path.iterdir()):
                path.rmdir()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--source", type=Path)
    mode.add_argument("--clear-core-cache", type=Path)
    parser.add_argument("--destination", type=Path)
    parser.add_argument("--backup-root", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.source and (args.destination is None or args.backup_root is None):
        parser.error("--source requires --destination and --backup-root")
    try:
        if args.clear_core_cache:
            clear_core_cache(args.clear_core_cache, dry_run=args.dry_run)
        else:
            synchronize(args.source, args.destination, args.backup_root, dry_run=args.dry_run)
    except (OSError, RuntimeError) as exc:
        raise SystemExit(f"Custom node synchronization failed: {exc}") from exc


if __name__ == "__main__":
    main()
