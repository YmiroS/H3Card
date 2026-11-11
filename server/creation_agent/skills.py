"""Skill management for the embedded chat planner; no model or executable access."""
import asyncio
import json
import logging
import os
import re
import stat
import tempfile
import threading
from pathlib import Path

from aiohttp import web

from server.auth import require_admin, require_project

BUILTINS = json.loads(Path(__file__).with_name('builtins.json').read_text(encoding='utf-8'))
BUILTIN_IDS = frozenset(skill['id'] for skill in BUILTINS)
MAX_STORE_BYTES = 8 * 1024 * 1024
MAX_REQUEST_BYTES = 256 * 1024
MAX_SKILLS = 256
ID = re.compile(r'[a-z][a-z0-9-]{1,63}')
LOG = logging.getLogger(__name__)


class SkillError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def validate_id(value):
    if not isinstance(value, str) or not ID.fullmatch(value):
        raise SkillError('Skill ID 必须为 2–64 位小写字母、数字或连字符，且以字母开头')
    return value


def validate_skill(value):
    limits = {'id': 64, 'name': 200, 'description': 2000, 'instruction': 32000}
    if not isinstance(value, dict) or set(value) != set(limits):
        raise SkillError('请提供 ID、名称、简介和文字指南，不支持额外字段')
    result = {}
    for key, limit in limits.items():
        text = value[key]
        if not isinstance(text, str):
            raise SkillError('Skill 字段必须为文字')
        if key != 'id':
            text = text.strip()
        try:
            length = len(text.encode('utf-16-le')) // 2
        except UnicodeError:
            raise SkillError('Skill 包含无效文字') from None
        if not text or length > limit or (key == 'instruction' and '\0' in text):
            raise SkillError(f'Skill 字段 {key} 为空或超过 {limit} 字')
        result[key] = text
    validate_id(result['id'])
    return result


class SkillStore:
    def __init__(self, path):
        self.path = Path(path)
        self.lock = threading.Lock()

    def _read(self):
        try:
            info = self.path.lstat()
        except FileNotFoundError:
            return {}
        if not stat.S_ISREG(info.st_mode) or info.st_size > MAX_STORE_BYTES:
            raise ValueError('Invalid Skill store')
        with self.path.open('rb') as source:
            data = source.read(MAX_STORE_BYTES + 1)
        if len(data) > MAX_STORE_BYTES:
            raise ValueError('Skill store exceeds limit')
        document = json.loads(data)
        if (not isinstance(document, dict) or set(document) != {'version', 'skills'}
                or type(document['version']) is not int or document['version'] != 1
                or not isinstance(document['skills'], list)
                or len(document['skills']) > MAX_SKILLS):
            raise ValueError('Invalid Skill store')
        skills = {}
        for raw in document['skills']:
            try:
                skill = validate_skill(raw)
            except SkillError as error:
                raise ValueError('Invalid stored Skill') from error
            if skill['id'] in BUILTIN_IDS or skill['id'] in skills:
                raise ValueError('Duplicate Skill ID')
            skills[skill['id']] = skill
        return skills

    def list(self):
        with self.lock:
            return list(self._read().values())

    def load(self, key):
        validate_id(key)
        with self.lock:
            skill = self._read().get(key)
            if skill is None:
                raise SkillError('Skill 不存在或已撤销', 404)
            return skill

    def _write(self, skills):
        data = json.dumps({'version': 1, 'skills': list(skills.values())},
                          ensure_ascii=False).encode('utf-8')
        if len(data) > MAX_STORE_BYTES:
            raise SkillError('Skill 存储总量超过限制', 409)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(dir=self.path.parent, prefix='.skills-',
                                             suffix='.tmp', delete=False) as target:
                temporary = Path(target.name)
                target.write(data)
                target.flush()
                os.fsync(target.fileno())
            os.replace(temporary, self.path)
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)

    def publish(self, value):
        skill = validate_skill(value)
        if skill['id'] in BUILTIN_IDS:
            raise SkillError('内置 Skill 不可修改', 409)
        with self.lock:
            skills = self._read()
            skills[skill['id']] = skill
            if len(skills) > MAX_SKILLS:
                raise SkillError('Skill 数量超过限制', 409)
            self._write(skills)

    def revoke(self, key):
        validate_id(key)
        if key in BUILTIN_IDS:
            raise SkillError('内置 Skill 不可撤销', 409)
        with self.lock:
            skills = self._read()
            if key not in skills:
                raise SkillError('Skill 不存在或已撤销', 409)
            del skills[key]
            self._write(skills)


async def store_call(request, method, *args):
    try:
        return await asyncio.to_thread(getattr(request.app['creation_agent_skills'], method), *args)
    except SkillError as error:
        return_error = {400: web.HTTPBadRequest, 404: web.HTTPNotFound,
                        409: web.HTTPConflict}[error.status]
        raise return_error(text=str(error)) from None
    except (OSError, ValueError, RecursionError):
        LOG.exception('Creation Agent Skill store unavailable')
        raise web.HTTPServiceUnavailable(text='Skill 存储暂不可用，请联系管理员') from None


async def admin_list(request):
    require_admin(request)
    return web.json_response({'builtins': BUILTINS, 'skills': await store_call(request, 'list')})


async def publish(request):
    require_admin(request)
    if request.content_type != 'application/json':
        raise web.HTTPBadRequest(text='请求必须为 JSON 对象')
    raw = bytearray()
    async for chunk in request.content.iter_chunked(65536):
        raw.extend(chunk)
        if len(raw) > MAX_REQUEST_BYTES:
            raise web.HTTPRequestEntityTooLarge(max_size=MAX_REQUEST_BYTES, actual_size=len(raw))
    try:
        value = json.loads(raw)
    except (ValueError, UnicodeError, RecursionError):
        raise web.HTTPBadRequest(text='请求必须为有效 JSON 对象') from None
    await store_call(request, 'publish', value)
    return web.json_response({'ok': True})


async def revoke(request):
    require_admin(request)
    await store_call(request, 'revoke', request.match_info['id'])
    return web.json_response({'ok': True})


async def status(request):
    await require_project(request, request.query.get('projectId', ''))
    published = await store_call(request, 'list')
    metadata = [{key: skill[key] for key in ('id', 'name', 'description')} for skill in published]
    return web.json_response({'available': True, 'reason': '', 'engine': 'chat-api',
                              'skills': [*BUILTINS, *metadata]})


async def load(request):
    await require_project(request, request.query.get('projectId', ''))
    return web.json_response(await store_call(request, 'load', request.match_info['id']))


def register_skill_routes(app, path):
    app['creation_agent_skills'] = SkillStore(path)
    app.router.add_get('/api/creation-agent/admin/skills', admin_list)
    app.router.add_post('/api/creation-agent/admin/skills', publish)
    app.router.add_delete('/api/creation-agent/admin/skills/{id}', revoke)
    app.router.add_get('/api/creation-agent/status', status)
    app.router.add_get('/api/creation-agent/skills/{id}', load)
