"""Data-only managed Skills, shared by management and the chat planner."""
import asyncio
import copy
import json
import logging
import os
import re
import stat
import tempfile
import threading
import unicodedata
from pathlib import Path

from aiohttp import web

from server.auth import require_admin, require_project

BUILTINS = json.loads(Path(__file__).with_name('builtins.json').read_text(encoding='utf-8'))
BUILTIN_IDS = frozenset(skill['id'] for skill in BUILTINS)
MAX_STORE_BYTES = 8 * 1024 * 1024
MAX_REQUEST_BYTES = 4 * 1024 * 1024
MAX_SKILLS = 256
ID = re.compile(r'[a-z][a-z0-9-]{1,63}')
TEXT_EXTENSIONS = frozenset(('.md', '.txt', '.yaml', '.yml'))
# Match ECMAScript String.trim used by the shared browser/Node schemas.
TRIM_SPACE = '\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff'
METADATA_FIELDS = ('id', 'name', 'description', 'triggers', 'autoOutputs', 'recommendedModelIds')
CORE_FIELDS = {'id', 'name', 'description', 'instruction'}
OPTIONAL_FIELDS = {'triggers', 'autoOutputs', 'recommendedModelIds', 'references', 'referenceTriggers', 'enabled', 'executionSummary'}
LOG = logging.getLogger(__name__)


class SkillError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate JSON object key')
        result[key] = value
    return result


def validate_id(value):
    if not isinstance(value, str) or not ID.fullmatch(value):
        raise SkillError('Skill ID 必须为 2–64 位小写字母、数字或连字符，且以字母开头')
    return value


def text_length(value, limit, field, *, required=True):
    if not isinstance(value, str):
        raise SkillError(f'Skill 字段 {field} 必须为文字')
    try:
        length = len(value.encode('utf-16-le')) // 2
    except UnicodeError:
        raise SkillError('Skill 包含无效文字') from None
    if length > limit or '\0' in value or (required and not value.strip(TRIM_SPACE)):
        raise SkillError(f'Skill 字段 {field} 为空、包含无效文字或超过 {limit} 字')
    return length


def validate_path(value):
    text_length(value, 160, '引用文件路径')
    if ('\\' in value or ':' in value or value.startswith('/')
            or any(unicodedata.category(c) in ('Cc', 'Cf') for c in value)
            or any(part in ('', '.', '..') or part.endswith((' ', '.')) for part in value.split('/'))):
        raise SkillError('引用文件必须使用安全相对路径，不能包含绝对路径、反斜杠或 . / .. 分段')
    if Path(value).suffix.lower() not in TEXT_EXTENSIONS:
        raise SkillError('仅支持 md、txt、yaml、yml 文字文件')
    return unicodedata.normalize('NFC', value).casefold()


def validate_keywords(value, field):
    if not isinstance(value, list) or len(value) > 64:
        raise SkillError(f'{field} 必须为最多 64 个关键词的列表')
    for term in value:
        text_length(term, 80, field)
    return list(value)


def validate_skill(value):
    if (not isinstance(value, dict) or not CORE_FIELDS <= value.keys()
            or value.keys() - CORE_FIELDS - OPTIONAL_FIELDS):
        raise SkillError('请提供 ID、名称、简介和文字指南，不支持未知字段')
    result = {}
    for key, limit in (('id', 64), ('name', 200), ('description', 2000), ('instruction', 128000)):
        text_length(value[key], limit, key)
        # Preserve guides verbatim, including frontmatter and final newlines.
        result[key] = value[key] if key in ('id', 'instruction') else value[key].strip(TRIM_SPACE)
    validate_id(result['id'])
    result['triggers'] = validate_keywords(value.get('triggers', []), 'triggers')
    outputs = value.get('autoOutputs', [])
    if (not isinstance(outputs, list) or len(outputs) > 3
            or any(not isinstance(item, str) or item not in ('image', 'video', 'text') for item in outputs)
            or len(set(outputs)) != len(outputs)):
        raise SkillError('autoOutputs 只能包含不重复的 image、video、text')
    result['autoOutputs'] = list(outputs)
    models = value.get('recommendedModelIds', [])
    if not isinstance(models, list) or len(models) > 16:
        raise SkillError('recommendedModelIds 必须为最多 16 个模型 ID 的列表')
    recommended = []
    for model in models:
        if not isinstance(model, str):
            raise SkillError('recommendedModelIds 必须包含文字模型 ID')
        model = model.strip(TRIM_SPACE)
        if not model or len(model) > 200:
            raise SkillError('recommendedModelIds 的模型 ID 必须为 1–200 字')
        if any(unicodedata.category(char) in ('Cc', 'Cf') for char in model):
            raise SkillError('recommendedModelIds 不能包含控制字符')
        if model in recommended:
            raise SkillError('recommendedModelIds 不能重复')
        recommended.append(model)
    result['recommendedModelIds'] = recommended
    refs = value.get('references', {})
    if not isinstance(refs, dict) or len(refs) > 128:
        raise SkillError('references 必须为最多 128 个文字文件的对象')
    seen, total = set(), text_length(result['instruction'], 128000, 'instruction')
    for path, text in refs.items():
        normalized = validate_path(path)
        if normalized in seen:
            raise SkillError('引用文件路径不能重复（忽略大小写及 Unicode 规范化）')
        seen.add(normalized)
        total += text_length(text, 128000, path, required=False)
    if total > 600000:
        raise SkillError('指南和引用文字合计不能超过 600000 字（UTF-16）')
    result['references'] = dict(refs)
    rules = value.get('referenceTriggers', {})
    if not isinstance(rules, dict) or len(rules) > 128:
        raise SkillError('referenceTriggers 必须为引用文件关键词对象')
    for path, terms in rules.items():
        validate_path(path)
        if path not in refs:
            raise SkillError('referenceTriggers 必须指向已有引用文件的精确路径')
        validate_keywords(terms, 'referenceTriggers')
    result['referenceTriggers'] = {path: list(terms) for path, terms in rules.items()}
    if type(value.get('enabled', True)) is not bool:
        raise SkillError('enabled 必须为布尔值')
    result['enabled'] = value.get('enabled', True)
    if 'executionSummary' in value:
        summary = value['executionSummary']
        if (not isinstance(summary, dict) or set(summary) != {'text', 'sourceFingerprint', 'reviewed'}):
            raise SkillError('executionSummary 必须包含 text、sourceFingerprint、reviewed，且不能有其他字段')
        text_length(summary['text'], 8000, 'executionSummary.text')
        fingerprint = summary['sourceFingerprint']
        if not isinstance(fingerprint, str) or not re.fullmatch(r'fnv1a64:[a-f0-9]{16}', fingerprint):
            raise SkillError('executionSummary.sourceFingerprint 格式无效')
        if type(summary['reviewed']) is not bool:
            raise SkillError('executionSummary.reviewed 必须为布尔值')
        result['executionSummary'] = {'text': summary['text'].strip(TRIM_SPACE),
                                      'sourceFingerprint': fingerprint, 'reviewed': summary['reviewed']}
    return result


def matches_keywords(terms, text):
    """Literal case-insensitive OR. Never compile administrator input as regex."""
    folded = text.casefold()
    return any(term.casefold() in folded for term in terms)


def matches_skill(skill, text, output=None):
    return skill['enabled'] and (matches_keywords(skill['triggers'], text)
                                 or output in skill['autoOutputs'])


def matching_references(skill, text):
    rules = skill['referenceTriggers']
    return {path: body for path, body in skill['references'].items()
            if path not in rules or matches_keywords(rules[path], text)}


def metadata(skill):
    return {key: list(skill[key]) if key == 'recommendedModelIds' else skill[key]
            for key in METADATA_FIELDS}


# This packaged snapshot is independent of the optional frontend source checkout.
BUILTIN_DEFAULTS = [validate_skill(item) for item in json.loads(
    Path(__file__).with_name('builtin_defaults.json').read_text(encoding='utf-8'))]
if {item['id'] for item in BUILTIN_DEFAULTS} != BUILTIN_IDS:
    raise ValueError('Packaged Skill defaults do not match builtin IDs')


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
        document = json.loads(data, object_pairs_hook=unique_object)
        if (not isinstance(document, dict) or set(document) != {'version', 'skills'}
                or type(document['version']) is not int or document['version'] not in (1, 2)
                or not isinstance(document['skills'], list)
                or len(document['skills']) > MAX_SKILLS):
            raise ValueError('Invalid Skill store')
        skills = {}
        for raw in document['skills']:
            try:
                if document['version'] == 1 and (not isinstance(raw, dict) or set(raw) != CORE_FIELDS):
                    raise SkillError('Invalid v1 Skill fields')
                skill = validate_skill(raw)
            except SkillError as error:
                raise ValueError('Invalid stored Skill') from error
            if skill['id'] in skills or (document['version'] == 1 and skill['id'] in BUILTIN_IDS):
                raise ValueError('Duplicate Skill ID')
            skills[skill['id']] = skill
        return skills

    @staticmethod
    def _merge(overrides):
        merged = {item['id']: copy.deepcopy(item) for item in BUILTIN_DEFAULTS}
        merged.update(overrides)
        return merged

    def list(self):
        with self.lock:
            return list(self._merge(self._read()).values())

    def load(self, key):
        validate_id(key)
        with self.lock:
            skill = self._merge(self._read()).get(key)
            if skill is None or not skill['enabled']:
                raise SkillError('Skill 不存在或已撤销', 404)
            return skill

    def _write(self, skills):
        data = json.dumps({'version': 2, 'skills': list(skills.values())},
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
        with self.lock:
            skills = self._read()
            skills[skill['id']] = skill
            if len(skills) > MAX_SKILLS:
                raise SkillError('Skill 数量超过限制', 409)
            self._write(skills)

    def revoke(self, key):
        validate_id(key)
        with self.lock:
            skills = self._read()
            skill = self._merge(skills).get(key)
            if skill is None:
                raise SkillError('Skill 不存在', 409)
            skill['enabled'] = False
            skills[key] = skill
            if len(skills) > MAX_SKILLS:
                raise SkillError('Skill 数量超过限制', 409)
            self._write(skills)


def http_skill_error(error):
    return {400: web.HTTPBadRequest, 404: web.HTTPNotFound,
            409: web.HTTPConflict}[error.status](text=str(error))


async def store_call(request, method, *args):
    try:
        return await asyncio.to_thread(getattr(request.app['creation_agent_skills'], method), *args)
    except SkillError as error:
        raise http_skill_error(error) from None
    except (OSError, ValueError, RecursionError):
        LOG.exception('Creation Agent Skill store unavailable')
        raise web.HTTPServiceUnavailable(text='Skill 存储暂不可用，请联系管理员') from None


async def bounded_body(request):
    if request.content_length is not None and request.content_length > MAX_REQUEST_BYTES:
        raise web.HTTPRequestEntityTooLarge(max_size=MAX_REQUEST_BYTES, actual_size=request.content_length)
    raw = bytearray()
    async for chunk in request.content.iter_chunked(65536):
        raw.extend(chunk)
        if len(raw) > MAX_REQUEST_BYTES:
            raise web.HTTPRequestEntityTooLarge(max_size=MAX_REQUEST_BYTES, actual_size=len(raw))
    return bytes(raw)


async def admin_list(request):
    require_admin(request)
    return web.json_response({'builtins': BUILTINS, 'skills': await store_call(request, 'list')})


async def publish(request):
    require_admin(request)
    if request.content_type != 'application/json':
        raise web.HTTPBadRequest(text='请求必须为 JSON 对象')
    raw = await bounded_body(request)
    try:
        value = json.loads(raw, object_pairs_hook=unique_object)
    except (ValueError, UnicodeError, RecursionError):
        raise web.HTTPBadRequest(text='请求必须为有效 JSON 对象') from None
    await store_call(request, 'publish', value)
    return web.json_response({'ok': True})


async def import_zip(request):
    require_admin(request)
    if request.content_type != 'application/zip':
        raise web.HTTPBadRequest(text='请求必须为 application/zip 原始字节')
    from .zip_import import preview_zip
    raw = await bounded_body(request)
    try:
        preview = await asyncio.to_thread(preview_zip, raw)
    except SkillError as error:
        raise http_skill_error(error) from None
    return web.json_response(preview)


async def revoke(request):
    require_admin(request)
    await store_call(request, 'revoke', request.match_info['id'])
    return web.json_response({'ok': True})


async def status(request):
    await require_project(request, request.query.get('projectId', ''))
    published = await store_call(request, 'list')
    return web.json_response({'available': True, 'reason': '', 'engine': 'chat-api',
                              'skills': [metadata(skill) for skill in published if skill['enabled']]})


async def load(request):
    await require_project(request, request.query.get('projectId', ''))
    return web.json_response(await store_call(request, 'load', request.match_info['id']))


def register_skill_routes(app, path):
    app['creation_agent_skills'] = SkillStore(path)
    app.router.add_get('/api/creation-agent/admin/skills', admin_list)
    app.router.add_post('/api/creation-agent/admin/skills', publish)
    app.router.add_post('/api/creation-agent/admin/skills/import-zip', import_zip)
    app.router.add_delete('/api/creation-agent/admin/skills/{id}', revoke)
    app.router.add_get('/api/creation-agent/status', status)
    app.router.add_get('/api/creation-agent/skills/{id}', load)
