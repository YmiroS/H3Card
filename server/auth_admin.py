"""本地账号初始化、历史索引迁移与一致性检查（不修改业务数据库）。"""
import argparse
import getpass
import json
from pathlib import Path
import sqlite3

from .auth_store import AuthStore
from .resource_access import ResourceAccess, safe_relative


def migrate(store, root, owner, *, apply=False, comfy_input=None):
    """先完整收集迁移计划；dry-run 不写入归属、不切换 ready。"""
    root = Path(root).resolve()
    users = store.list_users()
    account = next((u for u in users if u['username'].casefold() == owner.casefold()), None)
    admins = [u for u in users if u['role'] == 'admin' and u['enabled']]
    if not account or not admins or account['id'] != admins[0]['id']:
        raise ValueError('历史数据必须归首个启用管理员')
    # dry-run 使用内存副本，避免即使附加 schema 初始化也写入正式账号库。
    if not apply:
        import threading
        from contextlib import contextmanager

        class Snapshot:
            def __init__(self, db):
                self.db = db
                self.lock = threading.RLock()

            @contextmanager
            def _tx(self):
                with self.lock:
                    self.db.execute('BEGIN IMMEDIATE')
                    try:
                        yield
                        self.db.execute('COMMIT')
                    except BaseException:
                        self.db.execute('ROLLBACK')
                        raise

        snapshot = Snapshot(sqlite3.connect(':memory:'))
        snapshot.db.row_factory = sqlite3.Row
        with store.lock:
            store.db.backup(snapshot.db)
        snapshot.get_project = store.get_project
        access = ResourceAccess(snapshot, root, comfy_input)
    else:
        store.set_ready(False)
        access = ResourceAccess(store, root, comfy_input)
    report = {'apply': apply, 'projects': [], 'jobs': [], 'unknown_jobs': [],
              'resources': [], 'missing': [], 'ambiguous': [], 'errors': [], 'pending': []}
    projects = {}
    resources = {}
    jobs = {}

    def add_ref(ref, pid):
        if ref:
            resources.setdefault(ref, set())
            if pid:
                resources[ref].add(pid)

    def scan_doc(doc, pid, label):
        try:
            for ref in access.references(doc):
                add_ref(ref, pid)
        except (ValueError, TypeError, KeyError) as exc:
            report['errors'].append({'source': label, 'error': str(exc)})

    try:
        folder = root / 'data' / 'projects'
        for path in sorted(folder.glob('*.json*')):
            if not (path.name.endswith('.json') or path.name.endswith('.json.deleted')):
                continue
            try:
                doc = json.loads(path.read_text(encoding='utf-8'))
                pid = safe_relative(doc['id'], single=True)
                if path.name not in (pid + '.json', pid + '.json.deleted'):
                    raise ValueError('画布文件名与 ID 不一致')
                state = 'deleted' if path.name.endswith('.deleted') else 'active'
                if pid in projects:
                    # 存在删除墓碑时绝不重新激活。
                    state = 'deleted'
                    report['ambiguous'].append({'project': pid, 'reason': '同时存在有效与删除文件'})
                projects[pid] = state
                scan_doc(doc, pid, str(path))
            except (OSError, ValueError, KeyError, TypeError) as exc:
                report['errors'].append({'source': str(path), 'error': str(exc)})

        jobfile = root / 'data' / 'jobs.json'
        if jobfile.exists():
            try:
                doc = json.loads(jobfile.read_text(encoding='utf-8'))
                items = doc.items() if isinstance(doc, dict) else ((j.get('id') or j.get('job_id'), j) for j in doc)
                for jid, job in items:
                    if not isinstance(job, dict) or not jid:
                        raise ValueError('非法历史任务结构')
                    jobs.setdefault(str(jid), []).append(job)
            except (OSError, ValueError, TypeError, AttributeError) as exc:
                report['errors'].append({'source': str(jobfile), 'error': str(exc)})

        control = root / 'data' / 'control.db'
        if control.exists():
            db = None
            try:
                db = sqlite3.connect(control.as_uri() + '?mode=ro', uri=True)
                if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='dispatch_jobs'").fetchone():
                    for jid, payload in db.execute('SELECT job_id,payload_json FROM dispatch_jobs'):
                        value = json.loads(payload)
                        if not isinstance(value, dict):
                            raise ValueError('非法派发任务结构')
                        jobs.setdefault(jid, []).append(value)
            except (sqlite3.Error, ValueError) as exc:
                report['errors'].append({'source': str(control), 'error': str(exc)})
            finally:
                if db:
                    db.close()

        job_projects = {}
        for jid, records in jobs.items():
            candidates = {r.get('project') or r.get('project_id') for r in records} - {None, ''}
            if len(candidates) > 1:
                report['ambiguous'].append({'job': jid, 'projects': sorted(candidates)})
                pid = None
            else:
                pid = next(iter(candidates), None)
                if pid not in projects and not (pid and store.get_project(pid)):
                    pid = None
            job_projects[jid] = pid
            report['jobs' if pid else 'unknown_jobs'].append({'job_id': jid, 'project_id': pid})
            for record in records:
                scan_doc(record, pid, 'job:' + jid)

        for kind, dirname in (('upload', 'uploads'), ('artifact', 'artifacts')):
            base = root / 'data' / dirname
            for path in sorted(base.rglob('*')):
                if not path.is_file():
                    continue
                locator = path.relative_to(base).as_posix()
                try:
                    locator = access.normalize(kind, locator)
                    access.local_path(kind, locator)
                    pid = job_projects.get(locator.split('/')[0]) if kind == 'artifact' else None
                    add_ref((kind, locator), pid)
                except ValueError as exc:
                    report['errors'].append({'source': str(path), 'error': str(exc)})

        for (kind, locator), pids in sorted(resources.items()):
            if kind in ('upload', 'artifact'):
                try:
                    exists = access.local_path(kind, locator).is_file()
                except ValueError:
                    exists = False
                if not exists:
                    report['missing'].append({'kind': kind, 'locator': locator})
            report['resources'].append({'kind': kind, 'locator': locator, 'projects': sorted(pids), 'legacy': True})
        for pid, state in projects.items():
            old = store.get_project(pid)
            report['projects'].append({'project_id': pid, 'state': old['state'] if old else state,
                                       'owner_id': old['owner_id'] if old else account['id']})
        if apply:
            for pid, state in projects.items():
                old = store.get_project(pid)
                if not old:
                    store.create_project(pid, account['id'], state=state)
                elif state == 'deleted' and old['state'] == 'active':
                    store.set_project_state(pid, 'deleted')
            for jid, pid in job_projects.items():
                if pid and not store.get_job(jid):
                    store.register_job(jid, pid, store.get_project(pid)['owner_id'])
                elif pid and store.get_job(jid)['project_id'] != pid:
                    report['ambiguous'].append({'job': jid, 'reason': '已有任务归属不同'})
                elif not pid:
                    # 无法归属的历史任务仅管理员可见，不伪造画布归属。
                    with store._tx():
                        store.db.execute(
                            'INSERT OR IGNORE INTO legacy_jobs(job_id, reason) VALUES (?,?)',
                            (jid, '历史任务无法归属任何画布'))
            for (kind, locator), pids in resources.items():
                for pid in sorted(pids) or [None]:
                    access.register(pid, kind, locator, legacy=True)
            report['pending'] = access.audit()['pending']
            # 缺失、歧义、解析失败均需人工修复后重跑，不自动开放。
            if not any(report[k] for k in ('missing', 'ambiguous', 'errors', 'pending')):
                store.set_ready(True)
        return report
    finally:
        if not apply:
            snapshot.db.close()


def main(argv=None):
    parser = argparse.ArgumentParser(description='H3Card 本地账号初始化与历史资源迁移')
    sub = parser.add_subparsers(dest='command', required=True)
    for command in ('init', 'migrate', 'audit'):
        cmd = sub.add_parser(command)
        cmd.add_argument('--root', type=Path, default=Path(__file__).resolve().parent.parent)
        cmd.add_argument('--database', type=Path)
        if command == 'init':
            cmd.add_argument('--username', default='admin')
        elif command == 'migrate':
            mode = cmd.add_mutually_exclusive_group(required=True)
            mode.add_argument('--dry-run', action='store_true')
            mode.add_argument('--apply', action='store_true')
            cmd.add_argument('--owner', required=True)
    args = parser.parse_args(argv)
    database = args.database or args.root / 'data' / 'auth.db'
    if args.command != 'init' and not database.is_file():
        parser.error('账号库不存在，请先执行 init')
    store = AuthStore(database)
    try:
        if args.command == 'init':
            ResourceAccess(store, args.root)
            if store.has_admin():
                raise ValueError('管理员已初始化，不允许重复创建首管理员')
            password = getpass.getpass('首管理员密码：')
            if password != getpass.getpass('再次输入密码：'):
                raise ValueError('两次密码不一致')
            store.create_user(args.username, password, role='admin')
            print('管理员已创建；完成迁移前账号功能保持未就绪。')
        elif args.command == 'migrate':
            report = migrate(store, args.root, args.owner, apply=args.apply)
            print(json.dumps(report, ensure_ascii=False, indent=2))
            return 1 if any(report[k] for k in ('missing', 'ambiguous', 'errors', 'pending')) else 0
        else:
            report = ResourceAccess(store, args.root).audit()
            report['ready'] = store.is_ready()
            print(json.dumps(report, ensure_ascii=False, indent=2))
            return 1 if report['missing'] or report['pending'] else 0
    except (ValueError, PermissionError, sqlite3.Error) as exc:
        print('操作失败：' + str(exc))
        return 1
    finally:
        store.close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
