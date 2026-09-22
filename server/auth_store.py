"""SQLite 账号、会话及归属存储；所有公开方法均可在线程池调用。"""
import hashlib
import os
import secrets
import sqlite3
import threading
import time
import uuid
from contextlib import contextmanager
from pathlib import Path

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError


class AuthError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


class AuthStore:
    def __init__(self, path, session_ttl=86400):
        self.lock = threading.RLock()
        self.session_ttl = session_ttl
        self.hasher = PasswordHasher()
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            os.close(descriptor)
        self.db = sqlite3.connect(str(path), timeout=5, check_same_thread=False,
                                  isolation_level=None)
        self.db.row_factory = sqlite3.Row
        try:
            self.db.execute('PRAGMA foreign_keys=ON')
            self.db.execute('PRAGMA journal_mode=WAL')
            version = self.db.execute('PRAGMA user_version').fetchone()[0]
            migrations = Path(__file__).with_name('migrations')
            if version == 0:
                if self.db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchone():
                    raise AuthError('拒绝初始化无版本的非空数据库')
                self.db.executescript(migrations.joinpath('001_auth.sql').read_text(encoding='utf-8'))
                version = 1
            if version == 1:
                self.db.executescript(migrations.joinpath('002_registration.sql').read_text(encoding='utf-8'))
                version = 2
            if version == 2:
                self.db.executescript(migrations.joinpath('003_teams.sql').read_text(encoding='utf-8'))
                version = 3
            if version == 3:
                self.db.executescript(migrations.joinpath('004_project_shares.sql').read_text(encoding='utf-8'))
                version = 4
            elif version != 4:
                raise AuthError('不支持的认证数据库版本')
            expected = {
                'users': 'id,username,username_key,password_hash,role,enabled,version,created_at,display_name,approval_status,team_leader',
                'sessions': 'token_hash,user_id,csrf_token,expires_at,created_at',
                'user_grants': 'viewer_id,owner_id,permission',
                'project_acl': 'project_id,owner_id,state,created_at,team_id',
                'teams': 'id,name,leader_id,state,created_at,updated_at',
                'team_members': 'team_id,user_id,joined_at',
                'project_user_shares': 'project_id,user_id,created_at',
                'project_team_shares': 'project_id,team_id,created_at',
                'job_acl': 'job_id,project_id,user_id', 'auth_meta': 'key,value',
                'registration_requests': 'id,user_id,username,display_name,status,created_at,decided_at,decided_by,corp_id,out_track_id',
                'notification_outbox': 'id,request_id,kind,dedupe_key,status,attempts,next_try_at,leased_until,created_at,last_error',
            }
            for table, columns in expected.items():
                self.db.execute(f'SELECT {columns} FROM {table} LIMIT 0')
            self._dummy_hash = self.hasher.hash(secrets.token_urlsafe(32))
        except Exception:
            self.db.close()
            raise

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

    def close(self):
        with self.lock:
            self.db.close()

    @staticmethod
    def _safe(row):
        return None if row is None else {'id': row['id'], 'username': row['username'],
                                         'role': row['role'], 'enabled': bool(row['enabled']),
                                         'display_name': row['display_name'],
                                         'approval_status': row['approval_status'],
                                         'team_leader': bool(row['team_leader'])}

    @staticmethod
    def _identifier(value, label):
        if not isinstance(value, str) or not value or len(value) > 512:
            raise AuthError(f'无效{label}')
        return value

    @staticmethod
    def _username(username):
        if not isinstance(username, str):
            raise AuthError('无效用户名')
        username = username.strip()
        if not username or len(username) > 128 or any(ord(char) < 32 for char in username):
            raise AuthError('无效用户名')
        return username, username.casefold()

    @staticmethod
    def _display_name(display_name):
        """注册姓名/花名：必填纯文本，仅作审批人辨认依据。"""
        if not isinstance(display_name, str):
            raise AuthError('无效姓名或花名')
        display_name = display_name.strip()
        if not display_name or len(display_name) > 64 or any(ord(char) < 32 for char in display_name):
            raise AuthError('无效姓名或花名')
        return display_name

    def _user(self, uid):
        self._identifier(uid, '用户 ID')
        row = self.db.execute('SELECT * FROM users WHERE id=?', (uid,)).fetchone()
        if row is None:
            raise AuthError('用户不存在', 404)
        return row

    @staticmethod
    def _password(password):
        if not isinstance(password, str) or not 12 <= len(password) <= 1024:
            raise AuthError('密码长度须为 12 至 1024 个字符')

    @staticmethod
    def _role(role):
        if role not in ('admin', 'user'):
            raise AuthError('无效角色')

    def _check_actor(self, actor_id=None, session_token=None):
        """在写事务内重新确认 API 操作者及会话，避免鉴权后的竞态。"""
        if actor_id is None and session_token is None:
            return
        self._identifier(actor_id, '操作者 ID')
        if not isinstance(session_token, str) or not session_token:
            raise AuthError('会话已失效，请重新登录', 401)
        row = self.db.execute(
            "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id "
            "WHERE s.token_hash=? AND s.expires_at>? AND s.user_id=?",
            (self._digest(session_token), time.time(), actor_id)).fetchone()
        if row is None or not row['enabled'] or row['role'] != 'admin' or row['approval_status'] != 'approved':
            raise AuthError('管理员会话已失效，请重新登录', 401)

    def has_admin(self):
        with self.lock:
            return self.db.execute("SELECT 1 FROM users WHERE enabled=1 AND role='admin'").fetchone() is not None

    def is_ready(self):
        with self.lock:
            row = self.db.execute("SELECT value FROM auth_meta WHERE key='ready'").fetchone()
            return row is not None and row[0] == '1'

    def set_ready(self, ready=True):
        if not isinstance(ready, bool):
            raise AuthError('ready 必须为布尔值')
        with self._tx():
            self.db.execute("INSERT INTO auth_meta VALUES ('ready',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", ('1' if ready else '0',))

    def create_user(self, username, password, role='user', team_leader=False, *, actor_id=None, session_token=None):
        """管理员直接开户：既有特权操作，账号直接生效（approved），不走钉钉审批。"""
        self._role(role)
        if not isinstance(team_leader, bool):
            raise AuthError('team_leader 必须为布尔值')
        self._password(password)
        username, username_key = self._username(username)
        hashed = self.hasher.hash(password)
        uid = uuid.uuid4().hex
        with self._tx():
            self._check_actor(actor_id, session_token)
            try:
                self.db.execute('INSERT INTO users(id,username,username_key,password_hash,role,created_at,display_name,approval_status,team_leader) VALUES(?,?,?,?,?,?,?,?,?)',
                                (uid, username, username_key, hashed, role, time.time(), username, 'approved', int(team_leader)))
            except sqlite3.IntegrityError as exc:
                raise AuthError('用户名已存在', 409) from exc
            return self._safe(self._user(uid))

    def get_user(self, uid):
        self._identifier(uid, '用户 ID')
        with self.lock:
            return self._safe(self.db.execute('SELECT * FROM users WHERE id=?', (uid,)).fetchone())

    def list_users(self):
        with self.lock:
            return [self._safe(row) for row in self.db.execute('SELECT * FROM users ORDER BY created_at,id')]

    def set_user(self, uid, role=None, enabled=None, team_leader=None, *, actor_id=None, session_token=None):
        if role is not None:
            self._role(role)
        if enabled is not None and not isinstance(enabled, bool):
            raise AuthError('enabled 必须为布尔值')
        if team_leader is not None and not isinstance(team_leader, bool):
            raise AuthError('team_leader 必须为布尔值')
        with self._tx():
            self._check_actor(actor_id, session_token)
            old = self._user(uid)
            if role == 'admin' and old['approval_status'] != 'approved':
                raise AuthError('未通过审批的账号不能提升为管理员', 409)
            role = old['role'] if role is None else role
            enabled = bool(old['enabled']) if enabled is None else enabled
            team_leader = bool(old['team_leader']) if team_leader is None else team_leader
            if old['role'] == 'admin' and old['enabled'] and (role != 'admin' or not enabled):
                if self.db.execute("SELECT COUNT(*) FROM users WHERE enabled=1 AND role='admin'").fetchone()[0] <= 1:
                    raise AuthError('不能停用或降级最后一个管理员', 409)
            self.db.execute('UPDATE users SET role=?,enabled=?,team_leader=?,version=version+1 WHERE id=?',
                            (role, int(enabled), int(team_leader), uid))
            self.db.execute('DELETE FROM sessions WHERE user_id=?', (uid,))
            return self._safe(self._user(uid))

    def _verify(self, hashed, password):
        try:
            return isinstance(password, str) and len(password) <= 1024 and self.hasher.verify(hashed, password)
        except (VerificationError, InvalidHashError):
            return False

    def reset_password(self, uid, password, *, actor_id=None, session_token=None):
        self._password(password)
        hashed = self.hasher.hash(password)
        with self._tx():
            self._check_actor(actor_id, session_token)
            self._user(uid)
            self.db.execute('UPDATE users SET password_hash=?,version=version+1 WHERE id=?', (hashed, uid))
            self.db.execute('DELETE FROM sessions WHERE user_id=?', (uid,))

    def change_password(self, uid, current_password, new_password, session_token=None):
        self._password(new_password)
        with self.lock:
            old = dict(self._user(uid))
        if not self._verify(old['password_hash'], current_password):
            raise AuthError('当前密码错误', 403)
        hashed = self.hasher.hash(new_password)
        with self._tx():
            current = self._user(uid)
            if not current['enabled'] or current['version'] != old['version']:
                raise AuthError('账号状态已变化，请重新登录', 401)
            if session_token is not None and self.get_session(session_token) is None:
                raise AuthError('会话已失效', 401)
            self.db.execute('UPDATE users SET password_hash=?,version=version+1 WHERE id=?', (hashed, uid))
            self.db.execute('DELETE FROM sessions WHERE user_id=?', (uid,))

    @staticmethod
    def _digest(token):
        return hashlib.sha256(token.encode()).hexdigest()

    # ---- 用户自主注册与钉钉审批 ----

    def create_registration(self, username, password, display_name):
        """提交注册申请：创建 pending 账号、申请记录与发卡任务（同一事务）。

        不创建会话；同账号重复提交、已拒绝、已存在分别给出明确错误。
        """
        self._password(password)
        username, username_key = self._username(username)
        display_name = self._display_name(display_name)
        hashed = self.hasher.hash(password)
        uid = uuid.uuid4().hex
        request_id = f'reg-{uuid.uuid4().hex}'
        out_track_id = f'{request_id}-{uuid.uuid4().hex[:8]}'
        now = time.time()
        with self._tx():
            old = self.db.execute('SELECT approval_status FROM users WHERE username_key=?',
                                  (username_key,)).fetchone()
            if old is not None:
                if old['approval_status'] == 'pending':
                    raise AuthError('该账号的注册申请正在审批中，请耐心等待', 409)
                if old['approval_status'] == 'rejected':
                    raise AuthError('该账号的注册申请已被拒绝，请联系审批人', 403)
                raise AuthError('用户名已存在', 409)
            self.db.execute(
                'INSERT INTO users(id,username,username_key,password_hash,role,created_at,display_name,approval_status) '
                'VALUES(?,?,?,?,?,?,?,?)',
                (uid, username, username_key, hashed, 'user', now, display_name, 'pending'))
            self.db.execute(
                'INSERT INTO registration_requests(id,user_id,username,display_name,status,created_at,out_track_id) '
                'VALUES(?,?,?,?,?,?,?)',
                (request_id, uid, username, display_name, 'pending', now, out_track_id))
            self.db.execute(
                'INSERT INTO notification_outbox(request_id,kind,dedupe_key,next_try_at,created_at) '
                "VALUES(?,?,?,?,?) ON CONFLICT(dedupe_key) DO NOTHING",
                (request_id, 'send_card', f'send:{request_id}', now, now))
        return {'request_id': request_id, 'username': username, 'display_name': display_name,
                'status': 'pending'}

    def decide_registration(self, out_track_id, decision, approver_corp_id, approver_user_id):
        """钉钉审批决定：仅允许 pending -> 唯一终态，先决生效、重复/反向点击幂等。

        返回 (outcome, request)；outcome ∈ applied / duplicate / unknown。
        决定与卡片更新任务同事务提交；卡片更新失败由发件箱重试，不回滚决定。
        """
        self._identifier(out_track_id, '卡片实例 ID')
        if decision not in ('approved', 'rejected'):
            raise AuthError('无效审批决定')
        self._identifier(approver_user_id, '审批人 ID')
        now = time.time()
        with self._tx():
            row = self.db.execute('SELECT * FROM registration_requests WHERE out_track_id=?',
                                  (out_track_id,)).fetchone()
            if row is None:
                return 'unknown', None
            if row['status'] != 'pending':
                return 'duplicate', dict(row)
            self.db.execute(
                'UPDATE registration_requests SET status=?,decided_at=?,decided_by=?,corp_id=? WHERE id=?',
                (decision, now, approver_user_id, approver_corp_id, row['id']))
            self.db.execute(
                'UPDATE users SET approval_status=?,version=version+1 WHERE id=?',
                (decision, row['user_id']))
            if decision == 'rejected':
                self.db.execute('DELETE FROM sessions WHERE user_id=?', (row['user_id'],))
            self.db.execute(
                'INSERT INTO notification_outbox(request_id,kind,dedupe_key,next_try_at,created_at) '
                "VALUES(?,?,?,?,?) ON CONFLICT(dedupe_key) DO NOTHING",
                (row['id'], 'update_card', f"update:{row['id']}:{decision}", now, now))
            current = self.db.execute('SELECT * FROM registration_requests WHERE id=?',
                                      (row['id'],)).fetchone()
            return 'applied', dict(current)

    def registration_card_data(self, request_id):
        """发卡/更新卡片所需的申请数据（发件箱 worker 使用）。"""
        self._identifier(request_id, '申请 ID')
        with self.lock:
            row = self.db.execute(
                'SELECT r.*,u.enabled FROM registration_requests r JOIN users u ON u.id=r.user_id '
                'WHERE r.id=?', (request_id,)).fetchone()
            return dict(row) if row else None

    def claim_outbox(self, now, lease_seconds=120):
        """认领到期且租约失效的任务；租约防止处理中的任务被重复认领。"""
        with self._tx():
            rows = self.db.execute(
                'SELECT id,request_id,kind,dedupe_key,attempts FROM notification_outbox '
                "WHERE status='pending' AND next_try_at<=? AND leased_until<=? ORDER BY id LIMIT 10",
                (now, now)).fetchall()
            ids = [row['id'] for row in rows]
            if ids:
                marks = ','.join('?' * len(ids))
                self.db.execute(f'UPDATE notification_outbox SET leased_until=? WHERE id IN ({marks})',
                                (now + lease_seconds, *ids))
            return [dict(row) for row in rows]

    def finish_outbox(self, task_id, *, done=False, error='', next_try_at=None):
        """任务完成或退避重试；退避上限 10 分钟，失败任务永久可重试。"""
        if not isinstance(task_id, int):
            raise AuthError('无效任务 ID')
        with self._tx():
            if done:
                self.db.execute("UPDATE notification_outbox SET status='done',last_error='' WHERE id=?",
                                (task_id,))
                return
            row = self.db.execute('SELECT attempts FROM notification_outbox WHERE id=?',
                                  (task_id,)).fetchone()
            if row is None:
                raise AuthError('任务不存在', 404)
            attempts = row['attempts'] + 1
            delay = min(60 * (2 ** min(attempts, 5)), 600)
            when = next_try_at if next_try_at is not None else time.time() + delay
            self.db.execute(
                'UPDATE notification_outbox SET attempts=?,next_try_at=?,leased_until=0,last_error=? WHERE id=?',
                (attempts, when, str(error)[:500], task_id))

    def outbox_backlog(self):
        """管理员页展示的积压概况。"""
        with self.lock:
            row = self.db.execute(
                "SELECT COUNT(*) AS n, MIN(created_at) AS oldest FROM notification_outbox "
                "WHERE status='pending'").fetchone()
            return {'pending': row['n'], 'oldest_at': row['oldest']}

    def list_registrations(self):
        """最近的注册申请（管理页只读展示，不含审批操作）。"""
        with self.lock:
            rows = self.db.execute(
                'SELECT id,username,display_name,status,created_at,decided_at,decided_by '
                'FROM registration_requests ORDER BY created_at DESC LIMIT 200').fetchall()
            return [dict(row) for row in rows]

    def login(self, username, password):
        try:
            _, username_key = self._username(username)
        except AuthError:
            username_key = None
        with self.lock:
            row = self.db.execute('SELECT * FROM users WHERE username_key=?', (username_key,)).fetchone() if username_key else None
            old = dict(row) if row else None
        valid = self._verify(old['password_hash'] if old else self._dummy_hash, password)
        if not valid or not old or not old['enabled']:
            raise AuthError('用户名或密码错误', 401)
        # 密码正确后才反馈本人审批状态；不存在/密码错误统一为同一响应，不泄露状态。
        if old['approval_status'] == 'pending':
            raise AuthError('注册申请审批中，通过后方可登录', 403)
        if old['approval_status'] != 'approved':
            raise AuthError('注册申请已被拒绝，请联系审批人', 403)
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        now = time.time()
        with self._tx():
            current = self._user(old['id'])
            if not current['enabled'] or current['version'] != old['version'] or current['approval_status'] != 'approved':
                raise AuthError('账号状态已变化，请重新登录', 401)
            self.db.execute('DELETE FROM sessions WHERE expires_at<=?', (now,))
            self.db.execute('INSERT INTO sessions VALUES(?,?,?,?,?)',
                            (self._digest(token), old['id'], csrf, now + self.session_ttl, now))
            return {'user': self._safe(current), 'csrf_token': csrf, 'token': token}

    def get_session(self, token):
        if not isinstance(token, str) or not token or len(token) > 256:
            return None
        with self.lock:
            row = self.db.execute(
                "SELECT u.*,s.csrf_token FROM sessions s JOIN users u ON u.id=s.user_id "
                "WHERE s.token_hash=? AND s.expires_at>? AND u.enabled=1 AND u.approval_status='approved'",
                (self._digest(token), time.time())).fetchone()
            return None if row is None else {'user': self._safe(row), 'csrf_token': row['csrf_token']}

    def logout(self, token):
        if not isinstance(token, str) or not token:
            return
        with self._tx():
            self.db.execute('DELETE FROM sessions WHERE token_hash=?', (self._digest(token),))

    @staticmethod
    def _team_name(name):
        if not isinstance(name, str):
            raise AuthError('无效项目组名称')
        name = name.strip()
        if not name or len(name) > 64 or any(ord(char) < 32 for char in name):
            raise AuthError('项目组名称须为 1 至 64 个字符')
        return name

    def _check_team_manager(self, actor_id, team_id=None, session_token=None):
        actor = self._user(actor_id)
        if session_token is not None:
            session = self.get_session(session_token)
            if session is None or session['user']['id'] != actor_id:
                raise AuthError('会话已失效，请重新登录', 401)
        if not actor['enabled'] or actor['approval_status'] != 'approved':
            raise AuthError('账号不可用', 403)
        if actor['role'] != 'admin' and not actor['team_leader']:
            raise AuthError('需要组长权限', 403)
        if team_id is not None:
            self._identifier(team_id, '项目组 ID')
            team = self.db.execute("SELECT * FROM teams WHERE id=? AND state='active'", (team_id,)).fetchone()
            if team is None:
                raise AuthError('项目组不存在', 404)
            if actor['role'] != 'admin' and team['leader_id'] != actor_id:
                raise AuthError('只能管理自己创建的项目组', 403)
            return team
        return actor

    def create_team(self, name, actor_id, session_token=None):
        name = self._team_name(name)
        team_id = uuid.uuid4().hex
        now = time.time()
        with self._tx():
            self._check_team_manager(actor_id, session_token=session_token)
            self.db.execute('INSERT INTO teams(id,name,leader_id,state,created_at,updated_at) VALUES(?,?,?,?,?,?)',
                            (team_id, name, actor_id, 'active', now, now))
            self.db.execute('INSERT INTO team_members(team_id,user_id,joined_at) VALUES(?,?,?)',
                            (team_id, actor_id, now))
            return self._team(team_id)

    def _team(self, team_id):
        row = self.db.execute(
            "SELECT t.*,u.username AS leader_username FROM teams t JOIN users u ON u.id=t.leader_id "
            "WHERE t.id=? AND t.state='active'", (team_id,)).fetchone()
        return dict(row) if row else None

    def list_teams(self, user_id):
        self._identifier(user_id, '用户 ID')
        with self.lock:
            user = self.get_user(user_id)
            if not user or not user['enabled'] or user['approval_status'] != 'approved':
                return []
            if user['role'] == 'admin':
                rows = self.db.execute(
                    "SELECT t.*,u.username AS leader_username FROM teams t JOIN users u ON u.id=t.leader_id "
                    "WHERE t.state='active' ORDER BY t.created_at,t.id").fetchall()
            else:
                rows = self.db.execute(
                    "SELECT t.*,u.username AS leader_username FROM teams t "
                    "JOIN team_members m ON m.team_id=t.id JOIN users u ON u.id=t.leader_id "
                    "WHERE t.state='active' AND m.user_id=? ORDER BY t.created_at,t.id", (user_id,)).fetchall()
            teams = []
            for row in rows:
                members = [dict(member) | {'enabled': bool(member['enabled'])} for member in self.db.execute(
                    'SELECT u.id,u.username,u.display_name,u.enabled FROM team_members m '
                    'JOIN users u ON u.id=m.user_id WHERE m.team_id=? ORDER BY m.joined_at,u.id',
                    (row['id'],)).fetchall()]
                teams.append(dict(row) | {'members': members,
                                          'can_manage': user['role'] == 'admin' or row['leader_id'] == user_id})
            return teams

    def list_team_candidates(self, actor_id, session_token=None):
        with self.lock:
            self._check_team_manager(actor_id, session_token=session_token)
            return [self._safe(row) for row in self.db.execute(
                "SELECT * FROM users WHERE enabled=1 AND approval_status='approved' ORDER BY username_key,id")]

    def add_team_member(self, team_id, user_id, actor_id, session_token=None):
        with self._tx():
            self._check_team_manager(actor_id, team_id, session_token)
            user = self._user(user_id)
            if not user['enabled'] or user['approval_status'] != 'approved':
                raise AuthError('只能添加已启用且审批通过的账号', 409)
            self.db.execute('INSERT OR IGNORE INTO team_members(team_id,user_id,joined_at) VALUES(?,?,?)',
                            (team_id, user_id, time.time()))
            return {'team_id': team_id, 'user_id': user_id}

    def remove_team_member(self, team_id, user_id, actor_id, session_token=None):
        with self._tx():
            team = self._check_team_manager(actor_id, team_id, session_token)
            self._user(user_id)
            if team['leader_id'] == user_id:
                raise AuthError('不能移除项目组组长', 409)
            self.db.execute('DELETE FROM team_members WHERE team_id=? AND user_id=?',
                            (team_id, user_id))

    def list_grants(self):
        with self.lock:
            return [dict(row) for row in self.db.execute('SELECT * FROM user_grants ORDER BY viewer_id,owner_id')]

    def set_grant(self, viewer_id, owner_id, permission, *, actor_id=None, session_token=None):
        if permission not in ('read', 'operate') or viewer_id == owner_id:
            raise AuthError('无效授权')
        with self._tx():
            self._check_actor(actor_id, session_token)
            self._user(viewer_id)
            self._user(owner_id)
            self.db.execute('INSERT INTO user_grants VALUES(?,?,?) ON CONFLICT(viewer_id,owner_id) DO UPDATE SET permission=excluded.permission',
                            (viewer_id, owner_id, permission))
        return {'viewer_id': viewer_id, 'owner_id': owner_id, 'permission': permission}

    def delete_grant(self, viewer_id, owner_id, *, actor_id=None, session_token=None):
        self._identifier(viewer_id, '用户 ID')
        self._identifier(owner_id, '用户 ID')
        with self._tx():
            self._check_actor(actor_id, session_token)
            self.db.execute('DELETE FROM user_grants WHERE viewer_id=? AND owner_id=?', (viewer_id, owner_id))

    def _shareable_project(self, project_id, actor_id):
        project = self.get_project(project_id)
        if not project or project['state'] != 'active':
            raise AuthError('画布不存在或已删除', 404)
        actor = self._user(actor_id)
        if not actor['enabled'] or actor['approval_status'] != 'approved':
            raise AuthError('账号不可用', 403)
        if project['team_id'] is not None:
            raise AuthError('只有个人空间画布可以定向分享', 409)
        if actor['role'] != 'admin' and project['owner_id'] != actor_id:
            raise AuthError('只有画布所有者可以管理分享', 403)
        return project

    def list_project_shares(self, project_id, actor_id):
        self._identifier(project_id, '画布 ID')
        self._identifier(actor_id, '用户 ID')
        with self.lock:
            project = self._shareable_project(project_id, actor_id)
            user_ids = [row[0] for row in self.db.execute(
                'SELECT user_id FROM project_user_shares WHERE project_id=? ORDER BY user_id',
                (project_id,))]
            team_ids = [row[0] for row in self.db.execute(
                'SELECT team_id FROM project_team_shares WHERE project_id=? ORDER BY team_id',
                (project_id,))]
            users = [dict(row) for row in self.db.execute(
                "SELECT id,username,display_name FROM users WHERE enabled=1 AND approval_status='approved' "
                'AND id!=? ORDER BY username_key,id', (project['owner_id'],))]
            teams = [dict(row) for row in self.db.execute(
                "SELECT id,name FROM teams WHERE state='active' ORDER BY name,id")]
            return {'user_ids': user_ids, 'team_ids': team_ids,
                    'users': users, 'teams': teams}

    def set_project_shares(self, project_id, user_ids, team_ids, actor_id):
        self._identifier(project_id, '画布 ID')
        self._identifier(actor_id, '用户 ID')
        if (not isinstance(user_ids, list) or not isinstance(team_ids, list)
                or len(user_ids) > 1000 or len(team_ids) > 1000):
            raise AuthError('分享对象清单不正确')
        for uid in user_ids:
            self._identifier(uid, '用户 ID')
        for team_id in team_ids:
            self._identifier(team_id, '项目组 ID')
        if len(set(user_ids)) != len(user_ids) or len(set(team_ids)) != len(team_ids):
            raise AuthError('分享对象不能重复')
        with self._tx():
            project = self._shareable_project(project_id, actor_id)
            if project['owner_id'] in user_ids:
                raise AuthError('不能把画布分享给自己')
            for uid in user_ids:
                user = self._user(uid)
                if not user['enabled'] or user['approval_status'] != 'approved':
                    raise AuthError('只能分享给已启用且审批通过的账号', 409)
            for team_id in team_ids:
                team = self.db.execute(
                    "SELECT 1 FROM teams WHERE id=? AND state='active'", (team_id,)).fetchone()
                if team is None:
                    raise AuthError('项目组不存在或已删除', 409)
            now = time.time()
            self.db.execute('DELETE FROM project_user_shares WHERE project_id=?', (project_id,))
            self.db.execute('DELETE FROM project_team_shares WHERE project_id=?', (project_id,))
            self.db.executemany(
                'INSERT INTO project_user_shares(project_id,user_id,created_at) VALUES(?,?,?)',
                [(project_id, uid, now) for uid in user_ids])
            self.db.executemany(
                'INSERT INTO project_team_shares(project_id,team_id,created_at) VALUES(?,?,?)',
                [(project_id, team_id, now) for team_id in team_ids])
        return self.list_project_shares(project_id, actor_id)

    def _project_share_summary(self, user, project):
        project_id = project['project_id']
        user_count = self.db.execute(
            'SELECT COUNT(*) FROM project_user_shares WHERE project_id=?', (project_id,)).fetchone()[0]
        team_count = self.db.execute(
            'SELECT COUNT(*) FROM project_team_shares WHERE project_id=?', (project_id,)).fetchone()[0]
        if user['role'] == 'admin' or project['owner_id'] == user['id']:
            team_ids = [row[0] for row in self.db.execute(
                'SELECT team_id FROM project_team_shares WHERE project_id=? ORDER BY team_id',
                (project_id,))]
        else:
            team_ids = [row[0] for row in self.db.execute(
                'SELECT s.team_id FROM project_team_shares s '
                'JOIN team_members m ON m.team_id=s.team_id '
                "JOIN teams t ON t.id=s.team_id AND t.state='active' "
                'WHERE s.project_id=? AND m.user_id=? ORDER BY s.team_id',
                (project_id, user['id']))]
        direct = self.db.execute(
            'SELECT 1 FROM project_user_shares WHERE project_id=? AND user_id=?',
            (project_id, user['id'])).fetchone() is not None
        owner_grant = self.db.execute(
            'SELECT 1 FROM user_grants WHERE viewer_id=? AND owner_id=?',
            (user['id'], project['owner_id'])).fetchone() is not None
        return {'share_count': user_count + team_count,
                'shared_team_ids': team_ids,
                'shared_personally': direct or owner_grant
                or (user['role'] == 'admin' and project['owner_id'] != user['id'])}

    def create_project(self, project_id, owner_id, state='active', team_id=None):
        self._identifier(project_id, '画布 ID')
        if state not in ('pending', 'active', 'deleted'):
            raise AuthError('无效画布状态')
        if team_id is not None:
            self._identifier(team_id, '项目组 ID')
        with self._tx():
            owner = self._user(owner_id)
            if not owner['enabled'] or owner['approval_status'] != 'approved':
                raise AuthError('账号不可用', 403)
            if team_id is not None:
                member = self.db.execute(
                    "SELECT 1 FROM teams t JOIN team_members m ON m.team_id=t.id "
                    "WHERE t.id=? AND t.state='active' AND m.user_id=?", (team_id, owner_id)).fetchone()
                if member is None and owner['role'] != 'admin':
                    raise AuthError('你不是该项目组成员', 403)
            old = self.get_project(project_id)
            if old and (old['owner_id'] != owner_id or old['team_id'] != team_id):
                raise AuthError('画布不能重新绑定归属', 409)
            self.db.execute(
                'INSERT OR IGNORE INTO project_acl(project_id,owner_id,state,created_at,team_id) VALUES(?,?,?,?,?)',
                (project_id, owner_id, state, time.time(), team_id))
            return self.get_project(project_id)

    def assign_projects(self, projects, owner_id, *, actor_id=None, session_token=None):
        if not isinstance(projects, list) or not 1 <= len(projects) <= 1000:
            raise AuthError('每次请选择 1 至 1000 个画布')
        seen = set()
        for item in projects:
            if not isinstance(item, dict) or set(item) != {'project_id', 'owner_id'}:
                raise AuthError('无效画布分配清单')
            pid = self._identifier(item['project_id'], '画布 ID')
            self._identifier(item['owner_id'], '原所有者 ID')
            if pid in seen:
                raise AuthError('画布分配清单存在重复项')
            seen.add(pid)
        with self._tx():
            self._check_actor(actor_id, session_token)
            if not self._user(owner_id)['enabled']:
                raise AuthError('不能分配给已停用账号')
            for item in projects:
                old = self.get_project(item['project_id'])
                if not old or old['state'] != 'active':
                    raise AuthError('画布不存在或已删除，请刷新列表', 409)
                if old['team_id'] is not None:
                    raise AuthError('项目组画布不能重新分配个人归属', 409)
                if old['owner_id'] != item['owner_id']:
                    raise AuthError('画布归属已变化，请刷新后重新分配', 409)
            # 只更新访问归属；任务创建者、业务内容和费用记录保持原样。
            self.db.executemany('UPDATE project_acl SET owner_id=? WHERE project_id=?',
                                [(owner_id, item['project_id']) for item in projects])
        return len(projects)

    def get_project(self, project_id):
        self._identifier(project_id, '画布 ID')
        with self.lock:
            row = self.db.execute(
                'SELECT p.*,t.name AS team_name FROM project_acl p LEFT JOIN teams t ON t.id=p.team_id '
                'WHERE p.project_id=?', (project_id,)).fetchone()
            return dict(row) if row else None

    def project_permission(self, user_id, project_id):
        self._identifier(user_id, '用户 ID')
        self._identifier(project_id, '画布 ID')
        with self.lock:
            user = self.get_user(user_id)
            project = self.get_project(project_id)
            if (not user or not user['enabled'] or user['approval_status'] != 'approved'
                    or not project or project['state'] != 'active'):
                return None
            if user['role'] == 'admin':
                return 'operate'
            if project['team_id'] is not None:
                member = self.db.execute('SELECT 1 FROM team_members WHERE team_id=? AND user_id=?',
                                         (project['team_id'], user_id)).fetchone()
                return 'operate' if member else None
            if project['owner_id'] == user_id:
                return 'operate'
            direct = self.db.execute(
                'SELECT 1 FROM project_user_shares WHERE project_id=? AND user_id=?',
                (project_id, user_id)).fetchone()
            if direct:
                return 'operate'
            team_share = self.db.execute(
                'SELECT 1 FROM project_team_shares s '
                'JOIN team_members m ON m.team_id=s.team_id '
                "JOIN teams t ON t.id=s.team_id AND t.state='active' "
                'WHERE s.project_id=? AND m.user_id=? LIMIT 1', (project_id, user_id)).fetchone()
            if team_share:
                return 'operate'
            row = self.db.execute('SELECT permission FROM user_grants WHERE viewer_id=? AND owner_id=?',
                                  (user_id, project['owner_id'])).fetchone()
            return row[0] if row else None

    def list_projects(self, user_id):
        self._identifier(user_id, '用户 ID')
        with self.lock:
            result = []
            user = self.get_user(user_id)
            if not user or not user['enabled'] or user['approval_status'] != 'approved':
                return result
            for row in self.db.execute(
                    'SELECT p.*,u.username AS owner_username,t.name AS team_name FROM project_acl p '
                    'JOIN users u ON u.id=p.owner_id LEFT JOIN teams t ON t.id=p.team_id '
                    'ORDER BY p.created_at,p.project_id'):
                permission = self.project_permission(user_id, row['project_id'])
                if permission:
                    sharing = ({'share_count': 0, 'shared_team_ids': [], 'shared_personally': False}
                               if row['team_id'] is not None else self._project_share_summary(user, row))
                    result.append(dict(row) | {'permission': permission} | sharing)
            return result

    def get_project_for_user(self, user_id, project_id):
        self._identifier(user_id, '用户 ID')
        self._identifier(project_id, '画布 ID')
        with self.lock:
            permission = self.project_permission(user_id, project_id)
            if permission is None:
                return None
            row = self.db.execute(
                'SELECT p.*,u.username AS owner_username,t.name AS team_name FROM project_acl p '
                'JOIN users u ON u.id=p.owner_id LEFT JOIN teams t ON t.id=p.team_id '
                'WHERE p.project_id=?', (project_id,)).fetchone()
            if row is None:
                return None
            user = self.get_user(user_id)
            sharing = ({'share_count': 0, 'shared_team_ids': [], 'shared_personally': False}
                       if row['team_id'] is not None else self._project_share_summary(user, row))
            return dict(row) | {'permission': permission} | sharing

    def set_project_state(self, project_id, state):
        self._identifier(project_id, '画布 ID')
        if state not in ('pending', 'active', 'deleted'):
            raise AuthError('无效画布状态')
        with self._tx():
            if not self.get_project(project_id):
                raise AuthError('画布不存在', 404)
            self.db.execute('UPDATE project_acl SET state=? WHERE project_id=?', (state, project_id))

    def register_job(self, job_id, project_id, user_id):
        self._identifier(job_id, '任务 ID')
        self._identifier(project_id, '画布 ID')
        with self._tx():
            old = self.get_job(job_id)
            if old and (old['project_id'] != project_id or old['user_id'] != user_id):
                raise AuthError('任务不能重新绑定归属', 409)
            if not self.get_project(project_id):
                raise AuthError('画布不存在', 404)
            self._user(user_id)
            self.db.execute('INSERT OR IGNORE INTO job_acl VALUES(?,?,?)', (job_id, project_id, user_id))
            return self.get_job(job_id)

    def get_job(self, job_id):
        self._identifier(job_id, '任务 ID')
        with self.lock:
            row = self.db.execute('SELECT * FROM job_acl WHERE job_id=?', (job_id,)).fetchone()
            return dict(row) if row else None

    def list_project_jobs(self, project_id):
        self._identifier(project_id, '画布 ID')
        with self.lock:
            return [row[0] for row in self.db.execute('SELECT job_id FROM job_acl WHERE project_id=? ORDER BY job_id', (project_id,))]
