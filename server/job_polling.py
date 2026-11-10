"""Permission-projected task deltas; retain fingerprints, never job payloads."""
import asyncio
from collections import OrderedDict
import hashlib
import json
import re

from aiohttp import web


class JobPollCache:
    def __init__(self, limit=64, per_user_limit=4):
        self.limit = limit
        self.per_user_limit = per_user_limit
        self.users = OrderedDict()

    def get(self, user_id, cursor):
        snapshots = self.users.get(user_id)
        if snapshots is None:
            return None
        snapshot = snapshots.get(cursor)
        if snapshot is not None:
            snapshots.move_to_end(cursor)
            self.users.move_to_end(user_id)
        return snapshot

    def put(self, user_id, cursor, snapshot):
        snapshots = self.users.setdefault(user_id, OrderedDict())
        snapshots[cursor] = snapshot
        snapshots.move_to_end(cursor)
        self.users.move_to_end(user_id)
        # A busy user's revisions must not evict every other user's baseline.
        while len(snapshots) > self.per_user_limit:
            snapshots.popitem(last=False)
        while len(self.users) > self.limit:
            self.users.popitem(last=False)


CACHE_KEY = web.AppKey("job_poll_cache", JobPollCache)


def encode_delta(jobs, previous):
    fingerprints = {}
    changed = []
    revision = hashlib.sha256()
    for job in jobs:
        encoded = json.dumps(job, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        fingerprint = hashlib.sha256(encoded).digest()
        fingerprints[job["id"]] = fingerprint
        revision.update(fingerprint)
        if previous is None or previous.get(job["id"]) != fingerprint:
            changed.append(encoded)
    cursor = revision.hexdigest()
    removed = [] if previous is None else [jid for jid in previous if jid not in fingerprints]
    metadata = json.dumps({"cursor": cursor, "reset": previous is None, "removed": removed},
                          ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    body = b'{"jobs":[' + b",".join(changed) + b"]," + metadata[1:]
    return body, cursor, fingerprints


async def job_poll_response(request, jobs, user_id):
    cursor = request.query.get("cursor")
    if cursor is not None and not re.fullmatch(r"[0-9a-f]{64}", cursor):
        raise web.HTTPBadRequest(text="非法任务轮询游标")
    cache = request.app[CACHE_KEY]
    previous = cache.get(user_id, cursor) if cursor else None
    body, revision, fingerprints = await asyncio.to_thread(encode_delta, jobs, previous)
    cache.put(user_id, revision, fingerprints)
    response = web.Response(body=body, content_type="application/json", charset="utf-8",
                            headers={"Cache-Control": "private, no-store", "Vary": "Accept-Encoding"},
                            zlib_executor_size=65536)
    encodings = {}
    for item in request.headers.get("Accept-Encoding", "").lower().split(","):
        coding, *parameters = item.strip().split(";")
        quality = 1.0
        for parameter in parameters:
            key, separator, value = parameter.strip().partition("=")
            if key == "q":
                quality = (float(value) if separator and re.fullmatch(
                    r"(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)", value) else 0.0)
        encodings[coding] = quality
    if len(body) > 65536 and encodings.get("gzip", encodings.get("*", 0)) > 0:
        response.enable_compression(force=web.ContentCoding.gzip)
    return response
