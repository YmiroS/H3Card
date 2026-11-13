"""Durable, project-authorized image snapshots for creation-agent chat.

Only object keys and content metadata are persisted, never credentials or signed URLs.
Objects are intentionally retained, including on errors/cancellation and across restarts.
"""
import asyncio
import copy
import hashlib
import json
import tempfile
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

from aiohttp import web

from . import cloud_images
from .auth import require_user
from .cloud_chat import ChatError
from .oss_client import OSSClient
from .resource_access import ResourceAccess
from .sr_service import load_oss_config, SRConfigError


def local_image_reference(value):
    """The chat contract accepts only these same-origin relative resource routes."""
    if (not isinstance(value, str) or not value.startswith('/api/')
            or '\\' in value or '#' in value or any(ord(c) < 33 or ord(c) == 127 for c in value)):
        raise ValueError('非法图片资源引用')
    url = urlsplit(value)
    if url.scheme or url.netloc or url.fragment:
        raise ValueError('不允许外链图片')
    for prefix, kind in (('/api/upload/', 'upload'), ('/api/artifact/', 'artifact')):
        if url.path.startswith(prefix) and not url.query:
            return kind, ResourceAccess.normalize(kind, unquote(url.path[len(prefix):]))
    if url.path == '/api/file':
        query = parse_qs(url.query, keep_blank_values=True, strict_parsing=True)
        if set(query) - {'filename', 'subfolder', 'type'} or any(len(v) != 1 for v in query.values()):
            raise ValueError('非法图片查询参数')
        obj = {key: values[0] for key, values in query.items()}
        if obj.get('type') == 'input' and obj.get('subfolder') == 'chouka':
            return 'upload', ResourceAccess.normalize('upload', obj.get('filename'))
        return 'comfy', ResourceAccess.normalize('comfy', obj)
    raise ValueError('无法识别图片资源引用')


def _references(messages):
    refs = {}
    for message in messages:
        if not isinstance(message['content'], list):
            continue
        for part in message['content']:
            if part['type'] == 'image_url':
                value = part['image_url']['url']
                if not value.startswith('data:'):
                    refs[value] = local_image_reference(value)
    return refs


def _snapshot(source, directory):
    # Read a bounded, single snapshot; validate/hash/upload the very same bytes even
    # when the source is changed or removed while the request is in flight.
    with Path(source).open('rb') as handle:
        data = handle.read(cloud_images.MAX_IMAGE_BYTES + 1)
    info = cloud_images.inspect_image(data)
    digest = hashlib.sha256(data).hexdigest()
    target = Path(directory) / (digest + info['extension'])
    target.write_bytes(data)
    return target, digest, info


class CreationAgentImages:
    def __init__(self, store, resources, resolve_path, *, client_factory=None,
                 config_loader=None):
        self.store = store
        self.resources = resources
        self.resolve_path = resolve_path
        self.client_factory = client_factory or OSSClient
        self.config_loader = config_loader or load_oss_config
        self.upload_lock = asyncio.Lock()
        with store._tx():
            store.db.execute('''CREATE TABLE IF NOT EXISTS creation_agent_images (
                project_id TEXT NOT NULL,
                resource_id TEXT NOT NULL REFERENCES resources(resource_id),
                destination TEXT NOT NULL, object_key TEXT NOT NULL,
                content_sha256 TEXT NOT NULL, mime TEXT NOT NULL,
                PRIMARY KEY(project_id, resource_id, destination))''')

    def _authorize(self, user_id, project_id, references):
        # Resolve identity from the trusted resource index, never from a client ID,
        # filename hash, or a previous registry row. Repeat even for cache hits.
        with self.store.lock:
            permission = self.store.project_permission(user_id, project_id)
            if permission is None:
                raise web.HTTPNotFound(text='画布不存在或不可访问')
            if permission != 'operate':
                raise web.HTTPForbidden(text='画布为只读')
            rows = {}
            for value, ref in references.items():
                if (self.resources.reference(value) != ref
                        or not self.resources.authorize(user_id, *ref, project_id=project_id)):
                    raise web.HTTPNotFound(text='图片资源不存在或无权访问')
                rows[ref] = self.resources.lookup(*ref)
            return rows

    async def authorize(self, request, project_id, messages):
        return await asyncio.to_thread(self._authorize, require_user(request)['id'],
                                       project_id, _references(messages))

    def _get(self, project_id, resource_id, destination):
        with self.store.lock:
            row = self.store.db.execute(
                'SELECT object_key FROM creation_agent_images '
                'WHERE project_id=? AND resource_id=? AND destination=?',
                (project_id, resource_id, destination)).fetchone()
            return row['object_key'] if row else None

    def _save(self, project_id, resource_id, destination, key, digest, mime):
        with self.store._tx():
            self.store.db.execute(
                'INSERT INTO creation_agent_images VALUES (?,?,?,?,?,?) '
                'ON CONFLICT(project_id,resource_id,destination) DO NOTHING',
                (project_id, resource_id, destination, key, digest, mime))

    async def prepare(self, request, project_id, messages):
        references = _references(messages)
        if not references:
            return messages
        await self.authorize(request, project_id, messages)
        try:
            config = await asyncio.to_thread(self.config_loader)
        except (SRConfigError, ValueError, TypeError, OSError):
            raise ChatError('创作助手图片存储未配置，请联系管理员', status=503) from None
        oss = config['oss']
        # Credentials (including STS and AK rotation) do not change object identity.
        destination = json.dumps([oss.endpoint, oss.bucket, oss.prefix], separators=(',', ':'))
        client = self.client_factory(request.app['session'], oss)
        urls = {}
        async with self.upload_lock:
            rows = await self.authorize(request, project_id, messages)
            for value, ref in references.items():
                resource_id = rows[ref]['resource_id']
                if ref in urls:
                    continue
                key = await asyncio.to_thread(self._get, project_id, resource_id, destination)
                if key is None:
                    try:
                        source = await self.resolve_path(request, value, project_id)
                        with tempfile.TemporaryDirectory(prefix='chouka-agent-image-') as directory:
                            snapshot = asyncio.create_task(asyncio.to_thread(_snapshot, source, directory))
                            try:
                                path, digest, info = await asyncio.shield(snapshot)
                            except asyncio.CancelledError:
                                # Wait for file IO before removing the temporary local snapshot.
                                await asyncio.gather(snapshot, return_exceptions=True)
                                raise
                            key = client.key('creation-agent-images',
                                             hashlib.sha256(project_id.encode()).hexdigest(),
                                             digest + info['extension'])
                            await self.authorize(request, project_id, messages)
                            await client.put_file(key, path, info['mime'])
                            # Keep the completed mapping even if permission was revoked during
                            # upload; it grants no access and avoids losing an immutable object.
                            await asyncio.to_thread(self._save, project_id, resource_id, destination,
                                                    key, digest, info['mime'])
                    except web.HTTPException:
                        raise
                    except FileNotFoundError:
                        raise ChatError('创作助手图片源文件不存在', status=404) from None
                    except cloud_images.ImageEditError:
                        raise ChatError('创作助手图片无效：仅支持 64 MiB、3200 万像素以内的静态 PNG、JPEG、WebP',
                                        status=422) from None
                    except Exception:
                        # Never surface OSS errors: they may carry URLs, tokens or upstream data.
                        raise ChatError('创作助手图片上传失败，请联系管理员', status=502) from None
                await self.authorize(request, project_id, messages)
                try:
                    urls[ref] = client.presign(key, config['sign_seconds'])
                except Exception:
                    raise ChatError('创作助手图片签名失败，请联系管理员', status=503) from None
        await self.authorize(request, project_id, messages)
        result = copy.deepcopy(messages)
        for message in result:
            if isinstance(message['content'], list):
                for part in message['content']:
                    if part['type'] == 'image_url' and part['image_url']['url'] in references:
                        part['image_url']['url'] = urls[references[part['image_url']['url']]]
        return result
