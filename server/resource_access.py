"""同步资源索引；仅可信服务端写入归属，客户端引用只能验证。"""
import copy
import hashlib
import json
import os
from pathlib import Path
import shutil
import uuid
from urllib.parse import parse_qs, unquote, urlsplit


def safe_relative(value, *, single=False):
    if not isinstance(value, str) or not value or '\\' in value or '\x00' in value:
        raise ValueError('非法资源路径')
    if unquote(value) != value or value.startswith('/') or any(p in ('', '.', '..') for p in value.split('/')):
        raise ValueError('非法资源路径')
    if single and '/' in value:
        raise ValueError('资源名称不得包含目录')
    return value


class ResourceAccess:
    def __init__(self, store, root, comfy_input=None):
        self.store = store
        self.root = Path(root).resolve()
        self.comfy_input = Path(comfy_input).resolve() if comfy_input else None
        # executescript 会隐式提交，因此在显式事务内逐条执行固定 DDL。
        schema = '''
                CREATE TABLE IF NOT EXISTS resources (
                    resource_id TEXT PRIMARY KEY, kind TEXT NOT NULL,
                    locator TEXT NOT NULL, parent_id TEXT REFERENCES resources(resource_id),
                    legacy INTEGER NOT NULL DEFAULT 0, state TEXT NOT NULL DEFAULT 'ready',
                    external INTEGER NOT NULL DEFAULT 0,
                    UNIQUE(kind, locator));
                CREATE TABLE IF NOT EXISTS project_resources (
                    project_id TEXT NOT NULL, resource_id TEXT NOT NULL REFERENCES resources(resource_id),
                    PRIMARY KEY(project_id, resource_id));
                CREATE TABLE IF NOT EXISTS job_inputs (
                    job_id TEXT NOT NULL, name TEXT NOT NULL,
                    resource_id TEXT NOT NULL REFERENCES resources(resource_id),
                    PRIMARY KEY(job_id, name));
                CREATE TABLE IF NOT EXISTS legacy_jobs (
                    job_id TEXT PRIMARY KEY, discovered_at REAL NOT NULL DEFAULT (unixepoch()),
                    reason TEXT NOT NULL);
        '''
        with store._tx():
            for statement in schema.split(';'):
                if statement.strip():
                    store.db.execute(statement)

    @staticmethod
    def normalize(kind, locator):
        if kind == 'upload':
            return safe_relative(locator, single=True)
        if kind == 'artifact':
            locator = safe_relative(locator)
            if len(locator.split('/')) != 2:
                raise ValueError('产物必须包含任务和文件名')
            return locator
        if kind == 'comfy':
            obj = json.loads(locator) if isinstance(locator, str) else locator
            if not isinstance(obj, dict):
                raise ValueError('非法 Comfy 定位')
            name = safe_relative(obj.get('filename'), single=True)
            sub = obj.get('subfolder') or ''
            if sub:
                safe_relative(sub)
            typ = obj.get('type') or 'output'
            if typ not in ('input', 'output', 'temp'):
                raise ValueError('非法 Comfy 类型')
            return json.dumps({'filename': name, 'subfolder': sub, 'type': typ}, sort_keys=True, separators=(',', ':'))
        raise ValueError('未知资源类型')

    def reference(self, value):
        """解析明确的资源定位；不按普通字符串或 basename 猜测资源。"""
        if isinstance(value, dict):
            return ('comfy', self.normalize('comfy', value)) if value.get('filename') else None
        if not isinstance(value, str) or not value:
            return None
        if value.startswith('chouka/'):
            return 'upload', self.normalize('upload', value[7:])
        url = urlsplit(value)
        if url.scheme or url.netloc or url.fragment:
            raise ValueError('不允许外链资源')
        for prefix, kind in (('/api/upload/', 'upload'), ('/api/artifact/', 'artifact')):
            if url.path.startswith(prefix):
                if url.query:
                    raise ValueError('资源 URL 不允许额外参数')
                return kind, self.normalize(kind, unquote(url.path[len(prefix):]))
        if url.path.startswith('/api/preview/'):
            name = url.path[len('/api/preview/'):]
            if name.endswith('/file'):
                name = name[:-5]
            if url.query:
                raise ValueError('预览不允许额外参数')
            return 'upload', self.normalize('upload', unquote(name))
        if url.path == '/api/file':
            q = parse_qs(url.query, keep_blank_values=True)
            if set(q) - {'filename', 'subfolder', 'type'} or any(len(v) != 1 for v in q.values()):
                raise ValueError('非法文件查询参数')
            obj = {k: v[0] for k, v in q.items()}
            if obj.get('type') == 'input' and obj.get('subfolder') == 'chouka':
                return 'upload', self.normalize('upload', obj.get('filename'))
            return 'comfy', self.normalize('comfy', obj)
        return None

    def _lookup(self, kind, locator):
        locator = self.normalize(kind, locator)
        row = self.store.db.execute('SELECT * FROM resources WHERE kind=? AND locator=?', (kind, locator)).fetchone()
        return dict(row) if row else None

    def lookup(self, kind, locator):
        with self.store.lock:
            return self._lookup(kind, locator)

    def _register(self, project_id, kind, locator, parent_id=None, legacy=False,
                  state='ready', external=False):
        if project_id and not self.store.get_project(project_id):
            raise ValueError('画布未登记')
        if parent_id:
            parent = self.store.db.execute('SELECT resource_id FROM resources WHERE resource_id=?', (parent_id,)).fetchone()
            if not parent:
                raise ValueError('派生来源不存在')
            if project_id and not self.store.db.execute(
                    'SELECT 1 FROM project_resources WHERE project_id=? AND resource_id=?',
                    (project_id, parent_id)).fetchone():
                raise PermissionError('派生来源不属于画布')
        row = self._lookup(kind, locator)
        if row is None:
            rid = uuid.uuid4().hex
            self.store.db.execute('INSERT INTO resources VALUES (?,?,?,?,?,?,?)',
                                  (rid, kind, locator, parent_id, int(legacy), state, int(external)))
        else:
            rid = row['resource_id']
            linked = self.store.db.execute('SELECT project_id FROM project_resources WHERE resource_id=?', (rid,)).fetchall()
            if project_id and linked and project_id not in {r[0] for r in linked} and not legacy:
                raise PermissionError('既有资源不得绑定其他画布，请建立独立副本')
        if project_id:
            self.store.db.execute('INSERT OR IGNORE INTO project_resources VALUES (?,?)', (project_id, rid))
        return self._lookup(kind, locator)

    def register(self, project_id, kind, locator, parent_id=None, legacy=False,
                 state='ready', external=False):
        """仅供上传、可信任务结果、迁移调用；不得直接接受客户端登记请求。"""
        locator = self.normalize(kind, locator)
        if state not in ('pending', 'ready'):
            raise ValueError('非法资源状态')
        with self.store._tx():
            return self._register(project_id, kind, locator, parent_id, legacy, state, external)

    def pending_external_uploads(self, refs):
        """本地模式下尚未送进 Comfy input 的复制素材。"""
        result = []
        with self.store.lock:
            for value in refs:
                ref = self.reference(value)
                if not ref or ref[0] != 'upload':
                    continue
                row = self._lookup(*ref)
                if row and row['external']:
                    result.append(ref[1])
        return result

    def mark_delivered(self, kind, locator):
        with self.store._tx():
            self.store.db.execute('UPDATE resources SET external=0 WHERE kind=? AND locator=?',
                                  (kind, self.normalize(kind, locator)))

    def publish(self, kind, locator):
        locator = self.normalize(kind, locator)
        with self.store._tx():
            self.store.db.execute("UPDATE resources SET state='ready' WHERE kind=? AND locator=?", (kind, locator))

    def authorize(self, user_id, kind, locator, project_id=None):
        with self.store.lock:
            user = self.store.get_user(user_id)
            if not user or not user.get('enabled', True):
                return False
            row = self._lookup(kind, locator)
            if not row or row['state'] != 'ready':
                return False
            pids = [r[0] for r in self.store.db.execute('SELECT project_id FROM project_resources WHERE resource_id=?', (row['resource_id'],))]
            if project_id is not None:
                pids = [pid for pid in pids if pid == project_id]
            return any(self.store.project_permission(user_id, pid) in ('read', 'operate') for pid in pids) or (
                project_id is None and not pids and bool(row['legacy']) and user['role'] == 'admin')

    def references(self, document):
        """只检查 assets、outputs、history 中的显式资源字段，忽略普通参数和元数据。"""
        result = []
        explicit_keys = {'url', 'ref', 'media_url', 'preview_url', 'previewUrl'}

        def add(value, required=True):
            ref = self.reference(value)
            if ref is None:
                if required:
                    raise ValueError('无法识别资源引用')
                return
            result.append(ref)

        def resource_obj(obj):
            # filename/subfolder/type 是 Comfy 输出定位；kind、origin、metadata 不构成定位。
            if isinstance(obj, dict) and obj.get('filename') and not obj.get('url') and (
                    'type' in obj or 'subfolder' in obj or set(obj) <= {'filename', 'subfolder', 'type'}):
                add(obj)
            if isinstance(obj, dict):
                for key in explicit_keys:
                    if obj.get(key):
                        add(obj[key])

        def assets(value):
            if isinstance(value, list):
                for item in value:
                    assets(item)
            elif isinstance(value, dict):
                resource_obj(value)
                if any(key in value for key in explicit_keys) or 'filename' in value:
                    return
                for key, item in value.items():
                    if key in explicit_keys or key in ('filename', 'subfolder', 'type', 'kind', 'origin', 'metadata'):
                        continue
                    if isinstance(item, (dict, list)):
                        assets(item)
                    elif item:
                        add(item)
            elif value:
                add(value)

        def outputs(value):
            if isinstance(value, list):
                for item in value:
                    outputs(item)
            elif isinstance(value, dict):
                resource_obj(value)
                # 有 filename 的输出可带无关展示元数据；只递归嵌套的 outputs/assets/history。
                for key in ('assets', 'outputs', 'history'):
                    if key in value:
                        walk(value[key], key)
            elif value:
                add(value)

        def walk(value, context=None):
            if context == 'assets':
                assets(value)
            elif context == 'outputs':
                outputs(value)
            elif isinstance(value, list):
                for item in value:
                    walk(item, context)
            elif isinstance(value, dict):
                # 任意层级的 assets/outputs/history 键都按资源处理；
                # 其他键只递归查找，不把普通参数文本当文件。
                for key, item in value.items():
                    if key in ('assets', 'outputs', 'history'):
                        walk(item, key)
                    elif isinstance(item, (dict, list)):
                        walk(item, None)

        walk(document)
        return list(dict.fromkeys(result))

    def validate_document(self, user_id, project_id, document):
        with self.store.lock:
            if self.store.project_permission(user_id, project_id) != 'operate':
                raise PermissionError('需要画布操作权限')
            for kind, locator in self.references(document):
                if not self.authorize(user_id, kind, locator, project_id):
                    raise PermissionError('资源不属于当前可访问画布')
        return True

    def validate_assets(self, user_id, project_id, assets):
        return self.validate_document(user_id, project_id, {'assets': assets})

    def register_job_inputs(self, jid, refs):
        """一次事务登记完整输入清单，任何一个输入非法都不会留下部分绑定。"""
        with self.store._tx():
            job = self.store.get_job(jid)
            if not job:
                raise ValueError('任务未登记')
            values = refs.values() if isinstance(refs, dict) else refs
            rows = []
            for value in values:
                if not value:
                    continue
                ref = value if isinstance(value, tuple) and len(value) == 2 else self.reference(value)
                if not ref or ref[0] != 'upload':
                    raise ValueError('Worker 输入必须是已登记上传')
                row = self._lookup(*ref)
                if not row or row['state'] != 'ready' or not self.store.db.execute(
                        'SELECT 1 FROM project_resources WHERE project_id=? AND resource_id=?',
                        (job['project_id'], row['resource_id'])).fetchone():
                    raise PermissionError('任务输入不属于任务画布')
                rows.append((ref[1], row['resource_id']))
            for name, resource_id in rows:
                self.store.db.execute('INSERT OR IGNORE INTO job_inputs VALUES (?,?,?)', (jid, name, resource_id))

    def job_input_allowed(self, jid, name):
        name = safe_relative(name, single=True)
        with self.store.lock:
            job = self.store.get_job(jid)
            project = self.store.get_project(job['project_id']) if job else None
            if not project or project['state'] != 'active':
                return False
            return bool(self.store.db.execute("SELECT 1 FROM job_inputs i JOIN resources r ON i.resource_id=r.resource_id WHERE i.job_id=? AND i.name=? AND r.state='ready'", (jid, name)).fetchone())

    def local_path(self, kind, locator):
        locator = self.normalize(kind, locator)
        if kind in ('upload', 'artifact'):
            base = self.root / 'data' / ('uploads' if kind == 'upload' else 'artifacts')
            path = base / locator
        else:
            obj = json.loads(locator)
            if obj['type'] == 'input':
                if not self.comfy_input:
                    raise ValueError('Comfy input 目录未配置')
                base = self.comfy_input
                path = base / obj['subfolder'] / obj['filename']
            else:
                # 输出只能由 app 在鉴权后从固定 Comfy 上游写入该私有缓存，绝不映射上游目录。
                base = self.root / 'data' / 'comfy-cache'
                suffix = Path(obj['filename']).suffix
                path = base / (hashlib.sha256(locator.encode()).hexdigest() + suffix)
        if not path.resolve().is_relative_to(base.resolve()):
            raise ValueError('资源路径越界')
        return path

    def copy_document(self, user_id, source_pid, target_pid, card):
        with self.store.lock:
            if self.store.project_permission(user_id, source_pid) not in ('read', 'operate') or self.store.project_permission(user_id, target_pid) != 'operate':
                raise PermissionError('复制需要来源读权和目标操作权')
            refs = self.references(card)
            for ref in refs:
                if not self.authorize(user_id, *ref, project_id=source_pid):
                    raise PermissionError('来源画布资源非法')
            if source_pid == target_pid:
                return copy.deepcopy(card)
            paths = {ref: self.local_path(*ref) for ref in refs}
            for ref, path in paths.items():
                if path.is_file():
                    continue
                if ref[0] == 'comfy':
                    # Comfy 输出必须先由服务端鉴权后落入私有缓存，这里不自行抓取。
                    raise ValueError('Comfy 输出尚未缓存，需要服务端受控异步复制')
                raise ValueError('复制来源文件缺失')
            mapping = {}
            for ref, src in paths.items():
                name = uuid.uuid4().hex + src.suffix
                dst = self.root / 'data' / 'uploads' / name
                dst.parent.mkdir(parents=True, exist_ok=True)
                # 每步短事务；文件系统与 SQLite 无法跨介质原子，失败留下可信 pending 供 audit/recover 处理。
                # external=1：这份副本只落在控制端 uploads，尚未送进本地 Comfy input。
                self.register(target_pid, 'upload', name, state='pending', external=True)
                temporary = dst.with_suffix(dst.suffix + '.pending')
                try:
                    shutil.copyfile(src, temporary)
                    os.replace(temporary, dst)
                    self.publish('upload', name)
                finally:
                    temporary.unlink(missing_ok=True)
                mapping[ref] = name

            def mapped(value):
                ref = self.reference(value)
                return mapping.get(ref) if ref else None

            def rewrite(obj, context=None):
                if isinstance(obj, list):
                    return [rewrite(value, context) for value in obj]
                if not isinstance(obj, dict):
                    if context == 'assets' and obj:
                        name = mapped(obj)
                        return 'chouka/' + name if name else obj
                    return obj
                out = {}
                # 产物定位以 url 为准（filename 可能只是显示名）；无 url 才看 Comfy 定位字典。
                if obj.get('url'):
                    output_ref = self.reference(obj['url'])
                elif obj.get('filename') and ('type' in obj or 'subfolder' in obj):
                    output_ref = self.reference(obj)
                else:
                    output_ref = None
                for key, value in obj.items():
                    if key == 'preview_url' or key == 'previewUrl':
                        # 预览是原视频的派生物；目标画布重新按目标原片生成，不能沿用来源预览。
                        ref = self.reference(value) if value else None
                        name = mapping.get(ref)
                        if name:
                            out[key] = '/api/preview/' + name + '/file'
                        continue
                    if key in ('assets', 'outputs', 'history'):
                        out[key] = rewrite(value, key)
                    elif key in ('url', 'ref', 'media_url') and value:
                        name = mapped(value)
                        if name:
                            out[key] = 'chouka/' + name if key == 'ref' else '/api/upload/' + name
                        else:
                            out[key] = value
                    elif context == 'assets' and value and not isinstance(value, (dict, list)) and key not in ('kind', 'origin', 'metadata'):
                        name = mapped(value)
                        out[key] = 'chouka/' + name if name else value
                    else:
                        out[key] = rewrite(value, context) if isinstance(value, (dict, list)) else value
                if output_ref in mapping:
                    name = mapping[output_ref]
                    out.update(filename=name, subfolder='chouka', type='input')
                    out['url'] = '/api/upload/' + name
                return out
            return rewrite(card)

    def is_legacy_job(self, jid):
        with self.store.lock:
            return self.store.db.execute('SELECT 1 FROM legacy_jobs WHERE job_id=?', (jid,)).fetchone() is not None

    def audit(self, recover=False):
        """只审计已登记资源；recover 仅发布已有完整文件的可信 pending 记录。"""
        report = {'missing': [], 'pending': [], 'recovered': []}
        with self.store._tx() if recover else self.store.lock:
            rows = self.store.db.execute('SELECT * FROM resources').fetchall()
            for dbrow in rows:
                row = dict(dbrow)
                try:
                    exists = self.local_path(row['kind'], row['locator']).is_file()
                except ValueError:
                    exists = False
                if row['state'] != 'ready':
                    if recover and exists:
                        self.store.db.execute("UPDATE resources SET state='ready' WHERE resource_id=?", (row['resource_id'],))
                        report['recovered'].append(row)
                    else:
                        report['pending'].append(row)
                if not exists:
                    report['missing'].append(row)
        return report
