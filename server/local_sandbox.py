"""准备和管理独立的本机管理验收运行树，不访问正式服务器。"""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import secrets
import re
import shutil
import signal
import sqlite3
import subprocess
import sys
import tarfile
import time


SOURCE = Path(__file__).resolve().parents[1]
REDACTED = '本地副本已清除'
SECRET_KEYS = {'password', 'passwordhash', 'apikey', 'accesstoken', 'refreshtoken',
               'authorization', 'clientsecret', 'workertoken', 'enrollmenttoken',
               'leasetoken', 'csrftoken', 'sessiontoken', 'secret', 'token',
               'credentials', 'credential', 'cookie', 'setcookie', 'privatekey', 'passwd'}
SECRET_TEXT = re.compile(
    r'(?i)\b(?:[\w-]*(?:password|passwd|secret|api[_-]?key|access[_-]?token|'
    r'refresh[_-]?token|authorization|credential|cookie|private[_-]?key)|token)'
    r'[\"\x27]?\s*[:=]\s*(?:\"[^\"]*\"|\x27[^\x27]*\x27|[^\s,;}]+)')
EXTERNAL_URL = re.compile(r'(?i)(?:https?|wss?)://[^\s<>\"\x27]+|(?<!:)//[\w.-]+/[^\s<>\"\x27]*')


def identity_field(key):
    key = str(key).lower()
    return key in {'id', 'name', 'username', 'username_key', 'display_name'} or key.endswith(('_id', '_name'))


def scrub(value):
    if isinstance(value, dict):
        cleaned = {}
        for key, item in value.items():
            normalized = re.sub(r'[^a-z0-9]', '', str(key).lower())
            if normalized.endswith(tuple(SECRET_KEYS)):
                cleaned[key] = REDACTED
            elif identity_field(key) and isinstance(item, str):
                cleaned[key] = item
            else:
                cleaned[key] = scrub(item)
        return cleaned
    if isinstance(value, list):
        return [scrub(item) for item in value]
    if isinstance(value, str):
        try:
            decoded = json.loads(value)
        except (ValueError, TypeError):
            decoded = None
        if isinstance(decoded, (dict, list)):
            return json.dumps(scrub(decoded), ensure_ascii=False)
        value = EXTERNAL_URL.sub(REDACTED, value)
        value = re.sub(r'(?i)\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+', REDACTED, value)
        return SECRET_TEXT.sub(REDACTED, value)
    return value


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    path.chmod(0o600)


def copy_code(destination):
    for folder, suffixes in {
        'server': {'.py', '.sql'}, 'web': {'.html', '.js', '.css', '.png', '.webp', '.svg', '.txt'},
        'manifests': {'.json'}, 'graphs': {'.json'},
    }.items():
        for source in (SOURCE / folder).rglob('*'):
            if source.is_symlink():
                raise ValueError('拒绝代码目录中的符号链接')
            if not source.is_file() or source.suffix not in suffixes or '__pycache__' in source.parts:
                continue
            target = destination / source.relative_to(SOURCE)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
    for name in ('pricing.json',):
        if (SOURCE / name).is_file():
            shutil.copyfile(SOURCE / name, destination / name)


def import_archive(archive_path, destination):
    total = 0
    seen = set()
    with tarfile.open(archive_path, 'r:*') as archive:
        for entry in archive:
            name = PurePosixPath(entry.name)
            if name.is_absolute() or '..' in name.parts or entry.issym() or entry.islnk():
                raise ValueError('备份包含不安全路径或链接')
            if entry.isdir():
                continue
            allowed = (name.as_posix() in {'data/auth.db', 'data/control.db', 'data/jobs.json', 'snapshot.json'}
                       or (len(name.parts) == 3 and name.parts[:2] == ('data', 'projects')
                           and name.suffix == '.json'))
            if not entry.isfile() or not allowed or name.as_posix() in seen:
                raise ValueError('备份含重复文件或范围外内容')
            seen.add(name.as_posix())
            total += entry.size
            if entry.size > 1024 ** 3 or total > 4 * 1024 ** 3:
                raise ValueError('备份超过本地验收限制，请先核对大小')
            target = destination / name.as_posix()
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.extractfile(entry) as source, target.open('xb') as output:
                shutil.copyfileobj(source, output)
            target.chmod(0o600)
    if not {'data/auth.db', 'data/control.db'} <= seen:
        raise ValueError('备份缺少账号库或控制库')


def sanitize_database(path, kind):
    db = sqlite3.connect(path)
    db.execute('PRAGMA secure_delete=ON')
    tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    counts = {}
    try:
        for table in tables:
            quoted = '"' + table.replace('"', '""') + '"'
            counts[table] = db.execute(f'SELECT count(*) FROM {quoted}').fetchone()[0]
            columns = {row[1] for row in db.execute(f'PRAGMA table_info({quoted})')}
            if table in {'sessions', 'notification_outbox'}:
                db.execute(f'DELETE FROM {quoted}')
                continue
            for column in columns:
                col = '"' + column.replace('"', '""') + '"'
                if column in {'password_hash', 'token_hash', 'lease_token_hash'}:
                    db.execute(f'UPDATE {quoted} SET {col}=?', (secrets.token_hex(48),))
                elif table == 'registration_requests' and column in {'corp_id', 'out_track_id'}:
                    db.execute(f'UPDATE {quoted} SET {col}=?', ('',))
                elif table == 'dispatch_jobs' and column == 'lease_expires_at':
                    db.execute(f'UPDATE {quoted} SET {col}=NULL')
                else:
                    for rowid, value in db.execute(f'SELECT rowid,{col} FROM {quoted}').fetchall():
                        if not isinstance(value, str):
                            continue
                        normalized = re.sub(r'[^a-z0-9]', '', column.lower())
                        if normalized.endswith(tuple(SECRET_KEYS)):
                            cleaned = REDACTED
                        elif identity_field(column):
                            continue
                        else:
                            cleaned = scrub(value)
                        if cleaned != value:
                            db.execute(f'UPDATE {quoted} SET {col}=? WHERE rowid=?', (cleaned, rowid))
        db.commit()
        db.execute('VACUUM')
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise ValueError(f'{kind}副本完整性检查失败')
        if db.execute('PRAGMA foreign_key_check').fetchall():
            raise ValueError(f'{kind}副本存在外键关联缺口')
        return counts
    finally:
        db.close()


def prepare(directory, snapshot):
    requested = Path(directory).expanduser().absolute()
    destination = requested.resolve()
    if destination.exists() or requested.is_symlink():
        raise ValueError('目标目录已存在，拒绝覆盖；请指定新的独立目录')
    if SOURCE == destination or SOURCE in destination.parents:
        raise ValueError('验收运行树必须放在项目目录之外')
    os.umask(0o077)
    destination.mkdir(parents=True, mode=0o700)
    import_archive(Path(snapshot).expanduser(), destination)
    counts = {
        'auth': sanitize_database(destination / 'data/auth.db', '账号'),
        'control': sanitize_database(destination / 'data/control.db', '控制'),
    }
    for path in destination.rglob('*.json'):
        write_json(path, scrub(json.loads(path.read_text(encoding='utf-8'))))
    copy_code(destination)
    from server.auth_store import AuthStore
    password = secrets.token_urlsafe(20)
    username = 'ui-review-' + secrets.token_hex(3)
    store = AuthStore(destination / 'data/auth.db')
    try:
        store.create_user(username, password, role='admin', team_leader=True)
        store.set_ready()
    finally:
        store.close()
    write_json(destination / 'local-login.json', {'username': username, 'password': password})
    project_count = len(list((destination / 'data/projects').glob('*.json')))
    with Path(snapshot).expanduser().open('rb') as source:
        archive_digest = hashlib.file_digest(source, 'sha256').hexdigest()
    write_json(destination / 'data/.admin-sandbox.json', {
        'runtime_root': str(destination.resolve()), 'prepared': True,
        'prepared_at': time.time(), 'source_archive_sha256': archive_digest,
        'counts_before_sanitizing': counts, 'project_count': project_count,
        'media_copied': False,
    })
    print(json.dumps({'runtime': str(destination), 'project_count': project_count,
                      'counts': counts, 'login_file': str(destination / 'local-login.json')}, ensure_ascii=False))


def check(directory):
    destination = Path(directory).expanduser().resolve()
    from server.sandbox import validate_runtime
    validate_runtime(destination, destination / 'data/auth.db')
    return destination


def start(directory, port):
    destination = check(directory)
    if not 1024 <= port <= 65535:
        raise ValueError('请使用1024至65535的独立本地端口')
    pid_file = destination / 'process.json'
    if pid_file.exists():
        raise ValueError('存在进程记录，请先确认并停止旧验收服务')
    environment = {key: os.environ[key] for key in ('PATH', 'HOME', 'LANG', 'LC_ALL', 'TMPDIR')
                   if key in os.environ}
    environment.update({'CHOUKA_ADMIN_SANDBOX': '1', 'CHOUKA_EXECUTION_MODE': 'controller',
                        'CHOUKA_PORT': str(port), 'CHOUKA_COMFY_URL': 'http://127.0.0.1:1',
                        'PYTHONUNBUFFERED': '1', 'PYTHONNOUSERSITE': '1'})
    with (destination / 'server.log').open('ab') as log:
        process = subprocess.Popen([sys.executable, '-m', 'server.app'], cwd=destination,
                                   env=environment, stdout=log, stderr=subprocess.STDOUT,
                                   start_new_session=True)
    write_json(pid_file, {'pid': process.pid, 'runtime': str(destination), 'port': port})
    print(json.dumps({'pid': process.pid, 'url': f'http://127.0.0.1:{port}/controller',
                      'log': str(destination / 'server.log')}, ensure_ascii=False))


def stop(directory):
    destination = check(directory)
    pid_file = destination / 'process.json'
    metadata = json.loads(pid_file.read_text(encoding='utf-8'))
    pid = metadata['pid']
    command = subprocess.run(['ps', '-p', str(pid), '-o', 'command='], capture_output=True, text=True).stdout
    cwd = subprocess.run(['lsof', '-a', '-p', str(pid), '-d', 'cwd', '-Fn'],
                         capture_output=True, text=True).stdout
    if '-m server.app' not in command or f'n{destination}\n' not in cwd:
        raise ValueError('进程身份与运行目录不符，拒绝停止；请人工核验进程记录')
    os.kill(pid, signal.SIGTERM)
    pid_file.unlink()
    print('已向本地验收服务发送正常停止信号')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('prepare', 'sync', 'start', 'stop'))
    parser.add_argument('--directory', required=True)
    parser.add_argument('--snapshot')
    parser.add_argument('--port', type=int, default=18299)
    options = parser.parse_args()
    if options.action == 'prepare':
        if not options.snapshot:
            parser.error('prepare需要--snapshot')
        prepare(options.directory, options.snapshot)
    elif options.action == 'sync':
        copy_code(check(options.directory))
        print('仅同步代码，未覆盖验收数据')
    elif options.action == 'start':
        start(options.directory, options.port)
    else:
        stop(options.directory)


if __name__ == '__main__':
    main()
