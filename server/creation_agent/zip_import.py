"""Bounded, data-only ZIP preview. Never extracts files or publishes a Skill."""
import io
import re
import stat
import struct
import unicodedata
import zipfile
import zlib

import yaml
from yaml.events import AliasEvent

from .skills import SkillError, validate_id, validate_path, validate_skill

MAX_ZIP_BYTES = 4 * 1024 * 1024
MAX_UNCOMPRESSED = 2 * 1024 * 1024
MAX_DOCUMENT_BYTES = 512 * 1024
MAX_FILES = 128
MAX_YAML_NODES = 2048
MAX_YAML_DEPTH = 20


class MetadataLoader(yaml.SafeLoader):
    """SafeLoader with composition budgets applied before object construction."""
    def __init__(self, stream):
        super().__init__(stream)
        self.node_count = 0
        self.node_depth = 0

    def compose_node(self, parent, index):
        if self.check_event(AliasEvent):
            raise SkillError('YAML 元数据不支持别名或锚点引用')
        self.node_count += 1
        self.node_depth += 1
        if self.node_count > MAX_YAML_NODES or self.node_depth > MAX_YAML_DEPTH:
            raise SkillError('YAML 元数据过深或节点过多，请简化元数据')
        try:
            return super().compose_node(parent, index)
        finally:
            self.node_depth -= 1

    def construct_mapping(self, node, deep=False):
        result = {}
        for key_node, value_node in node.value:
            key = self.construct_object(key_node, deep=deep)
            if not isinstance(key, str) or key in result:
                raise SkillError('YAML 元数据键必须为不重复的文字')
            result[key] = self.construct_object(value_node, deep=deep)
        return result


def frontmatter(body):
    lines = body.splitlines()
    if not lines or lines[0].strip() != '---':
        raise SkillError('SKILL.md 必须以 YAML 元数据开始，包含 name 和 description')
    end = next((i for i in range(1, len(lines)) if lines[i].strip() == '---'), None)
    if end is None:
        raise SkillError('SKILL.md YAML 元数据缺少结束分隔线 ---')
    raw = '\n'.join(lines[1:end])
    value = yaml.load(raw, Loader=MetadataLoader)
    if not isinstance(value, dict):
        raise SkillError('YAML 元数据必须为简单对象，包含 name 和 description')
    for key, item in value.items():
        if key in ('triggers', 'trigger_keywords'):
            if not isinstance(item, list) or any(not isinstance(term, str) for term in item):
                raise SkillError('YAML triggers / trigger_keywords 必须为文字列表')
        elif not isinstance(item, (str, bool, int, float, type(None))):
            raise SkillError('YAML 元数据仅支持简单标量和关键词列表，不支持嵌套对象')
    if 'name' not in value or 'description' not in value:
        raise SkillError('YAML 元数据必须包含 name 和 description')
    if 'triggers' in value and 'trigger_keywords' in value:
        raise SkillError('请只使用 triggers 或 trigger_keywords 其中一个字段')
    return value


def archive_path(path, directory=False):
    if (not path or '\\' in path or ':' in path or path.startswith('/')
            or any(unicodedata.category(c) in ('Cc', 'Cf') for c in path)):
        raise SkillError('ZIP 包含不安全的文件路径')
    path = path[:-1] if directory and path.endswith('/') else path
    if (len(path.encode('utf-16-le')) // 2 > 320
            or any(part in ('', '.', '..') or part.endswith((' ', '.')) for part in path.split('/'))):
        raise SkillError('ZIP 包含不安全或过长的相对路径')
    return unicodedata.normalize('NFC', path).casefold()


def _preview_zip(raw):
    if len(raw) > MAX_ZIP_BYTES:
        raise SkillError('ZIP 压缩文件不能超过 4 MiB')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        entries = archive.infolist()
        # Also cap directory/ignored entries so central directory tricks stay bounded.
        if len(entries) > 512:
            raise SkillError('ZIP 条目过多')
        seen, files, total = set(), [], 0
        for entry in entries:
            if entry.orig_filename != entry.filename:
                raise SkillError('ZIP 文件名包含无效字符')
            normalized = archive_path(entry.filename, entry.is_dir())
            if normalized in seen:
                raise SkillError('ZIP 文件路径重复（忽略大小写及 Unicode 规范化）')
            seen.add(normalized)
            mode = entry.external_attr >> 16
            kind = stat.S_IFMT(mode)
            if kind not in (0, stat.S_IFREG, stat.S_IFDIR) or (kind == stat.S_IFDIR and not entry.is_dir()):
                raise SkillError('ZIP 不支持符号链接或特殊文件')
            if entry.flag_bits & (1 | 64):
                raise SkillError('ZIP 不支持加密文件')
            if entry.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
                raise SkillError('ZIP 只支持 stored / deflate 压缩')
            total += entry.file_size
            if total > MAX_UNCOMPRESSED:
                raise SkillError('ZIP 解压后总量不能超过 2 MiB')
            if entry.file_size > MAX_DOCUMENT_BYTES:
                raise SkillError('ZIP 每个文字文件不能超过 512 KiB，文字另有 128000 UTF-16 字限制')
            if entry.file_size > 100 * 1024 and entry.file_size > 200 * max(1, entry.compress_size):
                raise SkillError('ZIP 文件压缩比例过高')
            if entry.is_dir():
                continue
            if '__MACOSX' in entry.filename.split('/') or entry.filename.split('/')[-1] == '.DS_Store':
                raise SkillError('请从 ZIP 移除 __MACOSX / .DS_Store 系统附带文件')
            if len(files) >= MAX_FILES:
                raise SkillError('ZIP 最多包含 128 个文字文件')
            validate_path(entry.filename.split('/', 1)[-1] if '/' in entry.filename else entry.filename)
            files.append(entry)
        if not files:
            raise SkillError('ZIP 未包含 SKILL.md')
        names = [entry.filename for entry in files]
        prefix = ''
        if 'SKILL.md' not in names:
            folders = {name.split('/')[0] for name in names}
            if len(folders) != 1 or any('/' not in name for name in names):
                raise SkillError('请将 SKILL.md 放在 ZIP 根目录或唯一的外层文件夹中')
            prefix = next(iter(folders)) + '/'
        if prefix + 'SKILL.md' not in names:
            raise SkillError('ZIP 必须包含 SKILL.md（注意大小写）')
        documents, actual_total = {}, 0
        for entry in files:
            relative = entry.filename[len(prefix):]
            validate_path(relative)
            with archive.open(entry) as source:
                data = source.read(min(MAX_DOCUMENT_BYTES, MAX_UNCOMPRESSED - actual_total) + 1)
            actual_total += len(data)
            if len(data) > MAX_DOCUMENT_BYTES or actual_total > MAX_UNCOMPRESSED or len(data) != entry.file_size:
                raise SkillError('ZIP 文字文件超过读取限制或文件大小无效')
            documents[relative] = data.decode('utf-8-sig')
    main = documents.pop('SKILL.md')
    meta = frontmatter(main)
    if 'id' in meta:
        # Never silently discard an explicitly invalid ID and accidentally overwrite another skill.
        key = validate_id(meta['id'])
    else:
        candidates = [meta['name'], prefix[:-1]]
        key = next((candidate for candidate in candidates
                    if isinstance(candidate, str) and re.fullmatch(r'[a-z][a-z0-9-]{1,63}', candidate)), None)
        if key is None:
            raise SkillError('无法推导有效 ID：请在 SKILL.md 元数据中添加 id（2–64 位小写字母、数字或连字符，以字母开头）后重新上传')
    skill = validate_skill({'id': key, 'name': meta['name'], 'description': meta['description'],
        'instruction': main, 'triggers': meta.get('triggers', meta.get('trigger_keywords', [])),
        'autoOutputs': [], 'references': documents, 'referenceTriggers': {}, 'enabled': True})
    return {'skill': skill, 'files': ['SKILL.md', *documents]}


def preview_zip(raw):
    try:
        return _preview_zip(raw)
    except SkillError:
        raise
    except (zipfile.BadZipFile, zipfile.LargeZipFile, UnicodeError, yaml.YAMLError,
            ValueError, TypeError, KeyError, RuntimeError, RecursionError, EOFError,
            NotImplementedError, OSError, zlib.error, struct.error):
        raise SkillError('ZIP 或 UTF-8 / YAML 文字无效，请检查文件格式后重新上传') from None
