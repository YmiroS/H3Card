import asyncio
import hashlib
import os
import sqlite3
import tempfile
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from collections import defaultdict
from pathlib import Path
from unittest.mock import ANY, patch

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer, make_mocked_request
from yarl import URL

from server.auth import COOKIE, auth_middleware, register_auth_routes, require_project
from server.auth_store import AuthError, AuthStore

PASSWORD = 'a-long-test-password'
INVALID_PHONES = (
    None, True, False, 13800138000, 13800138000.0, [], {}, ['13800138000'],
    '', '   ', '1380013800', '138001380000', '12800138000', '10800138000',
    '23800138000', '+8613800138000', '138-00138000', '1380013800a',
    '138 0138000', '13800\n38000', '13800138000\x00',
    '１３８００１３８０００', '١٣٨٠٠١٣٨٠٠٠', '1380013800１', '1380013800١',
    '1380013800¹',
)


class PasswordPolicyTests(unittest.TestCase):
    def test_length_and_type_limits(self):
        for value in (None, 12345678, [], '', 'riverpa', 'riverpath' * 114):
            with self.subTest(value=value), self.assertRaisesRegex(AuthError, '8 至 1024'):
                AuthStore._password(value)
        AuthStore._password('riverpath' * 113 + 'abcdefg')

    def test_no_character_class_requirements(self):
        for value in ('riverpad', 'RIVERPAD', '58294716', '!@#$!@#$',
                      '今天一起去公园吧', 'Riverpad', ' riverpad '):
            with self.subTest(value=value):
                AuthStore._password(value)

    def test_common_sequences_and_repeated_characters_rejected(self):
        for value in ('12345678', '87654321', '123456789', '0123456789',
                      '9876543210', 'abcdefgh', 'HGFEDCBA', 'qwertyui',
                      'asdfghjkl', '11111111', 'AAAAAAAA', '!!!!!!!!',
                      '        ', 'Password', 'PASSWORD123', 'admin123',
                      '12341234', '123123123', ' password ', ' 12345678 '):
            with self.subTest(value=value), self.assertRaisesRegex(AuthError, '密码过于简单'):
                AuthStore._password(value)


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / 'auth.sqlite'
        self.store = AuthStore(self.path)
        self.admin = self.store.create_user('admin', PASSWORD, 'admin')['id']
        self.owner = self.store.create_user('owner', PASSWORD)['id']
        self.viewer = self.store.create_user('viewer', PASSWORD)['id']

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def test_password_policy_applies_to_all_writes_without_side_effects(self):
        session = self.store.login('owner', PASSWORD)
        for value in ('riverpa', '12345678', 'Password', '111111111111'):
            operations = (
                lambda: self.store.create_user('new-user', value),
                lambda: self.store.create_registration('new-user', value, '新人', '13800138000'),
                lambda: self.store.reset_password(self.owner, value),
                lambda: self.store.change_password(self.owner, PASSWORD, value, session['token']),
            )
            for operation in operations:
                with self.subTest(value=value), self.assertRaises(AuthError):
                    operation()
            self.assertEqual(len(self.store.list_users()), 3)
            self.assertEqual(self.store.list_registrations(), [])
            self.assertEqual(self.store.outbox_backlog()['pending'], 0)
            self.assertIsNotNone(self.store.get_session(session['token']))
        self.store.login('owner', PASSWORD)

    def test_eight_character_passwords_work_for_all_writes(self):
        user = self.store.create_user('new-user', 'riverpad')
        session = self.store.login('new-user', 'riverpad')
        self.store.change_password(user['id'], 'riverpad', '58294716', session['token'])
        self.assertIsNone(self.store.get_session(session['token']))
        session = self.store.login('new-user', '58294716')
        self.store.reset_password(user['id'], 'mountain')
        self.assertIsNone(self.store.get_session(session['token']))
        self.store.login('new-user', 'mountain')
        request = self.store.create_registration('new-registration', 'riverpad', '新人', '13800138000')
        self.assertEqual(request['status'], 'pending')
        card = self.store.registration_card_data(request['request_id'])
        self.store.decide_registration(card['out_track_id'], 'approved', 'corp', 'approver')
        self.store.login('new-registration', 'riverpad')

    def test_existing_weak_password_still_logs_in_and_input_is_not_normalized(self):
        with self.store.lock:
            self.store.db.execute('UPDATE users SET password_hash=? WHERE id=?',
                                  (self.store.hasher.hash('111111111111'), self.owner))
        self.store.login('owner', '111111111111')
        self.store.change_password(self.owner, '111111111111', ' Riverpad ')
        self.store.login('owner', ' Riverpad ')
        for value in ('Riverpad', ' riverpad '):
            with self.assertRaises(AuthError):
                self.store.login('owner', value)

    def test_sessions_restart_expiry_and_revoke(self):
        session = self.store.login('ADMIN', PASSWORD)
        with self.store.lock:
            row = self.store.db.execute('SELECT * FROM sessions').fetchone()
            self.assertEqual(row['token_hash'], hashlib.sha256(session['token'].encode()).hexdigest())
            self.assertNotIn(PASSWORD, str(dict(self.store.db.execute('SELECT * FROM users').fetchone())))
        self.store.set_ready()
        self.store.close()
        self.store = AuthStore(self.path)
        self.assertTrue(self.store.is_ready())
        self.assertEqual(self.store.get_session(session['token'])['user']['id'], self.admin)
        with patch('server.auth_store.time.time', return_value=time.time() + 90000):
            self.assertIsNone(self.store.get_session(session['token']))
        self.store.reset_password(self.admin, PASSWORD + '!')
        self.assertIsNone(self.store.get_session(session['token']))
        with self.assertRaises(AuthError):
            self.store.login('admin', PASSWORD)

    def test_phone_trim_persistence_and_sessions_are_preserved(self):
        self.assertEqual(self.store.get_user(self.owner)['phone'], '')
        session = self.store.login('owner', PASSWORD)
        second = self.store.login('owner', PASSWORD)
        sessions_before = set(map(tuple, self.store.db.execute('SELECT * FROM sessions')))
        user_before = dict(self.store._user(self.owner))
        for second_digit in '3456789':
            phone = f'1{second_digit}800138000'
            with self.subTest(phone=phone):
                result = self.store.set_phone(self.owner, f' \t{phone}\r\n',
                                              session_token=session['token'])
                self.assertEqual(result['id'], self.owner)
                self.assertEqual(result['phone'], phone)
                self.assertEqual(dict(self.store._user(self.owner)), user_before | {'phone': phone})
                self.assertEqual(set(map(tuple, self.store.db.execute('SELECT * FROM sessions'))),
                                 sessions_before)
        self.store.close()
        self.store = AuthStore(self.path)
        for token in (session['token'], second['token']):
            self.assertEqual(self.store.get_session(token)['user']['phone'], phone)
        self.assertEqual(self.store.get_session(session['token'])['csrf_token'], session['csrf_token'])
        self.assertEqual(self.store.get_user(self.owner)['phone'], phone)
        self.assertEqual(self.store.login('owner', PASSWORD)['user']['phone'], phone)
        listed = {user['id']: user for user in self.store.list_users()}
        self.assertEqual(listed[self.owner]['phone'], phone)
        self.assertEqual(listed[self.viewer]['phone'], '')

    def test_invalid_phone_types_and_formats_do_not_write(self):
        session = self.store.login('owner', PASSWORD)
        self.store.set_phone(self.owner, '13800138000', session_token=session['token'])
        before = dict(self.store._user(self.owner))
        for phone in INVALID_PHONES:
            with self.subTest(phone=phone):
                with self.assertRaises(AuthError) as ctx:
                    self.store.set_phone(self.owner, phone, session_token=session['token'])
                self.assertEqual(ctx.exception.status, 400)
                self.assertEqual(dict(self.store._user(self.owner)), before)
                self.assertIsNotNone(self.store.get_session(session['token']))

    def test_phone_rejects_invalid_sessions_and_other_users_tokens(self):
        other = self.store.login('admin', PASSWORD)
        for state in ('expired', 'logout', 'disabled', 'pending', 'rejected', 'other',
                      'missing', 'empty', 'unknown'):
            with self.subTest(state=state):
                session = self.store.login('owner', PASSWORD)
                token = session['token']
                self.store.set_phone(self.owner, '13800138000', session_token=token)
                if state == 'expired':
                    self.store.db.execute('UPDATE sessions SET expires_at=0 WHERE token_hash=?',
                                          (hashlib.sha256(token.encode()).hexdigest(),))
                elif state == 'logout':
                    self.store.logout(token)
                elif state == 'disabled':
                    # 保留会话行，验证禁用状态本身就足以拒绝写入。
                    self.store.db.execute('UPDATE users SET enabled=0 WHERE id=?', (self.owner,))
                elif state in ('pending', 'rejected'):
                    self.store.db.execute('UPDATE users SET approval_status=? WHERE id=?',
                                          (state, self.owner))
                elif state == 'other':
                    token = other['token']
                elif state == 'missing':
                    token = None
                elif state == 'empty':
                    token = ''
                elif state == 'unknown':
                    token = 'unknown-session-token'
                before = set(map(tuple, self.store.db.execute('SELECT * FROM users')))
                try:
                    with self.assertRaises(AuthError) as ctx:
                        self.store.set_phone(self.owner, '13900139000', session_token=token)
                    self.assertEqual(ctx.exception.status, 401)
                    self.assertEqual(set(map(tuple, self.store.db.execute('SELECT * FROM users'))), before)
                    self.assertFalse(self.store.db.in_transaction)
                finally:
                    self.store.db.execute("UPDATE users SET enabled=1,approval_status='approved' WHERE id=?",
                                          (self.owner,))
        self.assertIsNotNone(self.store.get_session(other['token']))

    def test_team_candidates_omit_phone_even_when_populated(self):
        self.store.set_user(self.owner, team_leader=True)
        viewer = self.store.login('viewer', PASSWORD)
        self.store.set_phone(self.viewer, '13800138000', session_token=viewer['token'])
        leader = self.store.login('owner', PASSWORD)
        candidates = self.store.list_team_candidates(self.owner, leader['token'])
        self.assertIn(self.viewer, {user['id'] for user in candidates})
        for user in candidates:
            self.assertNotIn('phone', user)
        self.assertEqual(self.store.get_user(self.viewer)['phone'], '13800138000')

    def test_grants_future_nontransitive_and_jobs(self):
        self.store.set_grant(self.viewer, self.owner, 'read')
        self.store.create_project('future', self.owner)
        self.assertEqual(self.store.project_permission(self.viewer, 'future'), 'read')
        self.store.set_grant(self.owner, self.admin, 'operate')
        self.store.create_project('admin-project', self.admin)
        self.assertIsNone(self.store.project_permission(self.viewer, 'admin-project'))
        self.store.set_grant(self.viewer, self.owner, 'operate')
        self.assertEqual(self.store.list_projects(self.viewer)[0]['owner_username'], 'owner')
        self.store.register_job('job', 'future', self.viewer)
        self.store.register_job('job', 'future', self.viewer)
        self.assertEqual(self.store.list_project_jobs('future'), ['job'])
        with self.assertRaises(AuthError):
            self.store.register_job('job', 'admin-project', self.viewer)
        with self.assertRaises(AuthError):
            self.store.create_project('future', self.viewer)
        self.store.create_project('future', self.owner, 'pending')
        with self.assertRaises(AuthError):
            self.store.create_project('bad-state', self.owner, 'other')
        self.assertEqual(self.store.get_project('future')['state'], 'active')
        self.store.set_user(self.viewer, enabled=False)
        self.assertIsNone(self.store.project_permission(self.viewer, 'future'))
        self.store.delete_grant(self.viewer, self.owner)
        self.assertEqual(len(self.store.list_grants()), 1)

    def test_global_grants_cover_current_and_future_personal_and_team_projects(self):
        team = self.store.create_team('已有团队', self.admin)
        self.store.create_project('existing-personal', self.owner)
        self.store.create_project('existing-team', self.admin, team_id=team['id'])
        projects = {'existing-personal', 'existing-team'}
        for permission in ('read', 'operate'):
            self.store.set_global_grant(self.viewer, permission)
            future_owner = self.store.create_user('future-' + permission, PASSWORD, team_leader=True)['id']
            future_team = self.store.create_team('未来团队-' + permission, future_owner)
            personal_pid, team_pid = 'future-personal-' + permission, 'future-team-' + permission
            self.store.create_project(personal_pid, future_owner)
            self.store.create_project(team_pid, future_owner, team_id=future_team['id'])
            projects.update((personal_pid, team_pid))
            for pid in projects:
                with self.subTest(permission=permission, project=pid):
                    self.assertEqual(self.store.project_permission(self.viewer, pid), permission)
            listed = {p['project_id']: p['permission'] for p in self.store.list_projects(self.viewer)}
            self.assertEqual(listed, dict.fromkeys(projects, permission))
        self.assertEqual(self.store.list_teams(self.viewer), [])

    def test_global_read_preserves_stronger_existing_project_permissions(self):
        team = self.store.create_team('成员权限', self.admin)
        self.store.add_team_member(team['id'], self.viewer, self.admin)
        self.store.create_project('own', self.viewer)
        self.store.create_project('member', self.admin, team_id=team['id'])
        for pid in ('direct-share', 'team-share', 'owner-grant', 'global-only'):
            self.store.create_project(pid, self.owner if pid != 'global-only' else self.admin)
        self.store.set_project_shares('direct-share', [self.viewer], [], self.owner)
        self.store.set_project_shares('team-share', [], [team['id']], self.owner)
        self.store.set_grant(self.viewer, self.owner, 'operate')
        self.store.set_global_grant(self.viewer, 'read')
        self.assertEqual(self.store.project_permission(self.viewer, 'global-only'), 'read')
        self.assertEqual(self.store.project_permission(self.admin, 'global-only'), 'operate')
        self.store.set_global_grant(self.admin, 'read')
        self.assertEqual(self.store.project_permission(self.admin, 'direct-share'), 'operate')
        for pid in ('own', 'member', 'direct-share', 'team-share', 'owner-grant'):
            with self.subTest(project=pid):
                self.assertEqual(self.store.project_permission(self.viewer, pid), 'operate')
        # 分享本身也应优先，不能仅因为同一所有者的 operate 授权而通过。
        self.store.delete_grant(self.viewer, self.owner)
        for pid in ('direct-share', 'team-share'):
            self.assertEqual(self.store.project_permission(self.viewer, pid), 'operate')
        self.store.set_grant(self.viewer, self.owner, 'read')
        self.store.set_global_grant(self.viewer, 'operate')
        self.assertEqual(self.store.project_permission(self.viewer, 'owner-grant'), 'operate')

    def test_global_grants_do_not_bypass_account_or_project_state(self):
        team = self.store.create_team('状态检查', self.admin)
        for state in ('active', 'pending', 'deleted'):
            self.store.create_project('personal-' + state, self.owner, state)
            self.store.create_project('team-' + state, self.admin, state, team_id=team['id'])
        for permission in ('read', 'operate'):
            self.store.set_global_grant(self.viewer, permission)
            for prefix in ('personal-', 'team-'):
                self.assertEqual(self.store.project_permission(self.viewer, prefix + 'active'), permission)
                for state in ('pending', 'deleted'):
                    self.assertIsNone(self.store.project_permission(self.viewer, prefix + state))
                    self.assertIsNone(self.store.project_permission(self.admin, prefix + state))
            self.assertIsNone(self.store.project_permission(self.viewer, 'missing'))
            self.store.set_user(self.viewer, enabled=False)
            self.assertEqual(self.store.list_projects(self.viewer), [])
            for pid in ('personal-active', 'team-active'):
                self.assertIsNone(self.store.project_permission(self.viewer, pid))
            self.store.set_user(self.viewer, enabled=True)
            for status in ('pending', 'rejected'):
                with self.store.db:
                    self.store.db.execute('UPDATE users SET approval_status=? WHERE id=?', (status, self.viewer))
                with self.subTest(permission=permission, approval=status):
                    self.assertEqual(self.store.list_projects(self.viewer), [])
                    for pid in ('personal-active', 'team-active'):
                        self.assertIsNone(self.store.project_permission(self.viewer, pid))
            with self.store.db:
                self.store.db.execute("UPDATE users SET approval_status='approved' WHERE id=?", (self.viewer,))

    def test_global_operate_does_not_grant_roles_or_team_management(self):
        team = self.store.create_team('非成员', self.admin)
        self.store.create_project('team', self.admin, team_id=team['id'])
        self.store.create_project('personal', self.owner)
        before = self.store.get_user(self.viewer)
        self.store.set_global_grant(self.viewer, 'operate')
        self.assertEqual(self.store.get_user(self.viewer), before)
        self.assertEqual(before['role'], 'user')
        self.assertFalse(before['team_leader'])
        self.assertEqual(self.store.project_permission(self.viewer, 'team'), 'operate')
        self.assertEqual(self.store.list_teams(self.viewer), [])
        operations = (
            lambda: self.store.create_team('越权团队', self.viewer),
            lambda: self.store.add_team_member(team['id'], self.viewer, self.viewer),
            lambda: self.store.remove_team_member(team['id'], self.admin, self.viewer),
            lambda: self.store.create_project('forbidden', self.viewer, team_id=team['id']),
            lambda: self.store.set_project_shares('personal', [], [], self.viewer),
        )
        for operation in operations:
            with self.assertRaises(AuthError) as denied:
                operation()
            self.assertEqual(denied.exception.status, 403)
        self.assertIsNone(self.store.get_project('forbidden'))
        self.assertEqual([u['id'] for u in self.store.list_teams(self.admin)[0]['members']], [self.admin])

    def test_global_grant_is_nontransitive_and_independently_revocable(self):
        self.store.create_project('owner-project', self.owner)
        self.store.create_project('admin-project', self.admin)
        team = self.store.create_team('独立授权', self.admin)
        self.store.create_project('team-project', self.admin, team_id=team['id'])
        owner_grant = self.store.set_grant(self.viewer, self.owner, 'operate')
        self.store.set_grant(self.owner, self.viewer, 'operate')
        global_grant = self.store.set_global_grant(self.viewer, 'read')
        self.assertEqual(global_grant, {'viewer_id': self.viewer, 'owner_id': None,
                                       'scope': 'all', 'permission': 'read'})
        self.assertIn(owner_grant, self.store.list_grants())
        self.assertIn(global_grant, self.store.list_grants())
        self.assertNotIn('scope', owner_grant)
        self.assertIsNone(self.store.project_permission(self.owner, 'admin-project'))
        self.assertIsNone(self.store.project_permission(self.owner, 'team-project'))
        self.store.delete_grant(self.viewer, self.owner)
        self.assertEqual(self.store.project_permission(self.viewer, 'owner-project'), 'read')
        self.store.set_grant(self.viewer, self.owner, 'operate')
        self.store.set_global_grant(self.viewer, 'operate')
        self.assertIsNone(self.store.project_permission(self.owner, 'admin-project'))
        self.store.set_global_grant(self.viewer, 'read')
        self.assertEqual(len([g for g in self.store.list_grants() if g.get('scope') == 'all']), 1)
        self.store.delete_global_grant(self.viewer)
        self.store.delete_global_grant(self.viewer)
        self.assertEqual(self.store.project_permission(self.viewer, 'owner-project'), 'operate')
        self.assertIsNone(self.store.project_permission(self.viewer, 'admin-project'))
        self.assertIsNone(self.store.project_permission(self.viewer, 'team-project'))
        self.assertIn(owner_grant, self.store.list_grants())
        self.assertFalse(any(g.get('scope') == 'all' for g in self.store.list_grants()))

    def test_global_grants_and_revocation_survive_restart(self):
        self.store.create_project('personal', self.owner)
        team = self.store.create_team('持久化', self.admin)
        self.store.create_project('team', self.admin, team_id=team['id'])
        owner_grant = self.store.set_grant(self.viewer, self.owner, 'read')
        for permission in ('read', 'operate', None):
            if permission is None:
                self.store.delete_global_grant(self.viewer)
            else:
                self.store.set_global_grant(self.viewer, permission)
            self.store.close()
            self.store = AuthStore(self.path)
            self.assertEqual(self.store.project_permission(self.viewer, 'team'), permission)
            self.assertEqual(self.store.project_permission(self.viewer, 'personal'), permission or 'read')
            self.assertIn(owner_grant, self.store.list_grants())
            globals_ = [g for g in self.store.list_grants() if g.get('scope') == 'all']
            self.assertEqual(len(globals_), int(permission is not None))

    def test_global_grant_validation_and_actor_rechecked_inside_transaction(self):
        for viewer, permission in ((None, 'read'), ('', 'read'), ('missing', 'read'),
                                   (self.viewer, None), (self.viewer, 'admin'),
                                   (self.viewer, True), (self.viewer, [])):
            with self.subTest(viewer=viewer, permission=permission), self.assertRaises(AuthError):
                self.store.set_global_grant(viewer, permission)
        self.assertEqual(self.store.list_grants(), [])
        self.store.create_user('backup-admin', PASSWORD, 'admin')
        session = self.store.login('admin', PASSWORD)
        self.store.set_global_grant(self.viewer, 'read', actor_id=self.admin, session_token=session['token'])
        original = self.store._check_actor

        def check_in_transaction(*args, **kwargs):
            self.assertTrue(self.store.db.in_transaction)
            return original(*args, **kwargs)

        user_session = self.store.login('owner', PASSWORD)
        invalid_actors = ((self.owner, user_session['token']),
                          (self.owner, session['token']), (self.admin, None))
        with patch.object(self.store, '_check_actor', side_effect=check_in_transaction):
            for actor, token in invalid_actors:
                for method, args in ((self.store.set_global_grant, (self.viewer, 'operate')),
                                     (self.store.delete_global_grant, (self.viewer,))):
                    with self.subTest(actor=actor, method=method.__name__), self.assertRaises(AuthError):
                        method(*args, actor_id=actor, session_token=token)
                    self.assertEqual(self.store.list_grants()[0]['permission'], 'read')
            self.store.logout(session['token'])
            for method, args in ((self.store.set_global_grant, (self.viewer, 'operate')),
                                 (self.store.delete_global_grant, (self.viewer,))):
                with self.assertRaises(AuthError):
                    method(*args, actor_id=self.admin, session_token=session['token'])
            self.assertEqual(self.store.list_grants()[0]['permission'], 'read')

    def test_team_members_share_team_projects_and_keep_personal_private(self):
        leader = self.store.create_user('leader', PASSWORD, team_leader=True)['id']
        member = self.store.create_user('member', PASSWORD)['id']
        outsider = self.store.create_user('outsider', PASSWORD)['id']
        team = self.store.create_team('项目一组', leader)
        self.store.add_team_member(team['id'], member, leader)
        self.store.create_project('team-project', member, team_id=team['id'])
        self.store.create_project('personal-project', member)
        self.assertEqual(self.store.project_permission(leader, 'team-project'), 'operate')
        self.assertEqual(self.store.project_permission(member, 'team-project'), 'operate')
        self.assertIsNone(self.store.project_permission(outsider, 'team-project'))
        self.assertIsNone(self.store.project_permission(leader, 'personal-project'))
        self.store.set_grant(outsider, member, 'operate')
        self.assertIsNone(self.store.project_permission(outsider, 'team-project'))
        self.assertEqual(self.store.project_permission(outsider, 'personal-project'), 'operate')
        listed = self.store.list_projects(leader)[0]
        self.assertEqual(listed['team_name'], '项目一组')
        self.store.remove_team_member(team['id'], member, leader)
        self.assertIsNone(self.store.project_permission(member, 'team-project'))
        self.assertEqual(self.store.project_permission(member, 'personal-project'), 'operate')

    def test_personal_project_shares_to_users_and_teams(self):
        teammate = self.store.create_user('teammate', PASSWORD)['id']
        outsider = self.store.create_user('outsider', PASSWORD)['id']
        team = self.store.create_team('共享项目组', self.admin)
        self.store.add_team_member(team['id'], teammate, self.admin)
        self.store.create_project('shared-personal', self.owner)
        result = self.store.set_project_shares(
            'shared-personal', [self.viewer], [team['id']], self.owner)
        self.assertEqual(result['user_ids'], [self.viewer])
        self.assertEqual(result['team_ids'], [team['id']])
        self.assertEqual(self.store.project_permission(self.viewer, 'shared-personal'), 'operate')
        self.assertEqual(self.store.project_permission(teammate, 'shared-personal'), 'operate')
        self.assertIsNone(self.store.project_permission(outsider, 'shared-personal'))
        owner_item = self.store.list_projects(self.owner)[0]
        self.assertEqual(owner_item['share_count'], 2)
        viewer_item = self.store.list_projects(self.viewer)[0]
        self.assertTrue(viewer_item['shared_personally'])
        teammate_item = self.store.list_projects(teammate)[0]
        self.assertEqual(teammate_item['shared_team_ids'], [team['id']])
        with self.assertRaises(AuthError):
            self.store.list_project_shares('shared-personal', self.viewer)
        self.store.set_project_shares('shared-personal', [], [], self.owner)
        self.assertIsNone(self.store.project_permission(self.viewer, 'shared-personal'))
        self.assertIsNone(self.store.project_permission(teammate, 'shared-personal'))
        self.store.create_project('team-owned', self.admin, team_id=team['id'])
        with self.assertRaises(AuthError):
            self.store.set_project_shares('team-owned', [outsider], [], self.admin)

    def test_batch_team_members_are_atomic_and_preserve_permissions(self):
        leader = self.store.create_user('leader', PASSWORD, team_leader=True)['id']
        other = self.store.create_user('other-leader', PASSWORD, team_leader=True)['id']
        disabled = self.store.create_user('disabled', PASSWORD)['id']
        self.store.set_user(disabled, enabled=False)
        pending = self.store.create_user('pending', PASSWORD)['id']
        with self.store.db:
            self.store.db.execute("UPDATE users SET approval_status='pending' WHERE id=?", (pending,))
        team = self.store.create_team('批量组员', leader)
        for invalid in (disabled, pending, 'missing'):
            with self.subTest(user=invalid), self.assertRaises(AuthError):
                self.store.add_team_members(team['id'], [self.viewer, invalid], leader)
            self.assertEqual([member['id'] for member in self.store.list_teams(leader)[0]['members']], [leader])
        for actor in (other, self.viewer):
            with self.subTest(actor=actor), self.assertRaises(AuthError):
                self.store.add_team_members(team['id'], [self.viewer, self.owner], actor)
        result = self.store.add_team_members(team['id'], [self.viewer, self.owner], leader)
        self.assertEqual([member['user_id'] for member in result], [self.viewer, self.owner])
        self.store.add_team_members(team['id'], [self.viewer, self.owner], self.admin)
        self.assertEqual(len(self.store.list_teams(leader)[0]['members']), 3)

    def test_batch_team_members_reject_invalid_selections(self):
        team = self.store.create_team('输入校验', self.admin)
        for selection in (None, '', self.viewer, [], [None], [{}], [''],
                          [self.viewer, self.viewer], [self.viewer] * 1001):
            with self.subTest(selection=selection), self.assertRaises(AuthError):
                self.store.add_team_members(team['id'], selection, self.admin)
        self.assertEqual(len(self.store.list_teams(self.admin)[0]['members']), 1)

    def test_project_list_includes_owner_display_name_without_changing_visibility(self):
        with self.store.db:
            self.store.db.execute('UPDATE users SET display_name=? WHERE id=?', ('张三', self.owner))
        self.store.create_project('shared-name', self.owner)
        self.assertEqual(self.store.list_projects(self.viewer), [])
        self.store.set_project_shares('shared-name', [self.viewer], [], self.owner)
        project = self.store.list_projects(self.viewer)[0]
        self.assertEqual(project['owner_id'], self.owner)
        self.assertEqual(project['owner_username'], 'owner')
        self.assertEqual(project['owner_display_name'], '张三')
        self.store.set_project_shares('shared-name', [], [], self.owner)
        self.assertEqual(self.store.list_projects(self.viewer), [])

    def test_team_management_permissions(self):
        leader = self.store.create_user('leader', PASSWORD, team_leader=True)['id']
        other_leader = self.store.create_user('leader2', PASSWORD, team_leader=True)['id']
        team = self.store.create_team('项目一组', leader)
        with self.assertRaises(AuthError):
            self.store.add_team_member(team['id'], self.viewer, other_leader)
        with self.assertRaises(AuthError):
            self.store.create_team('无权限', self.viewer)
        self.store.add_team_member(team['id'], self.viewer, self.admin)
        with self.assertRaises(AuthError):
            self.store.remove_team_member(team['id'], leader, leader)
        self.assertTrue(self.store.list_teams(self.viewer)[0]['members'])

    def test_last_admin_across_connections(self):
        other_id = self.store.create_user('admin2', PASSWORD, 'admin')['id']
        other = AuthStore(self.path)
        barrier = threading.Barrier(2)
        def disable(store, uid):
            barrier.wait()
            try:
                store.set_user(uid, enabled=False)
                return True
            except AuthError:
                return False
        try:
            with ThreadPoolExecutor(2) as pool:
                a = pool.submit(disable, self.store, self.admin)
                b = pool.submit(disable, other, other_id)
                self.assertEqual(sorted([a.result(), b.result()]), [False, True])
            self.assertTrue(self.store.has_admin())
        finally:
            other.close()

    def test_login_hash_race_with_reset(self):
        verified = threading.Event()
        release = threading.Event()
        original = self.store._verify
        def verify(*args):
            result = original(*args)
            verified.set()
            self.assertTrue(release.wait(10))
            return result
        with patch.object(self.store, '_verify', side_effect=verify):
            with ThreadPoolExecutor(1) as pool:
                pending = pool.submit(self.store.login, 'owner', PASSWORD)
                self.assertTrue(verified.wait(10))
                self.store.reset_password(self.owner, PASSWORD + '!')
                release.set()
                with self.assertRaises(AuthError):
                    pending.result()

    def test_concurrent_sessions_and_grants(self):
        def work(index):
            session = self.store.login('viewer', PASSWORD)
            self.store.set_grant(self.viewer, self.owner, 'read' if index % 2 else 'operate')
            self.assertIsNotNone(self.store.get_session(session['token']))
            self.store.logout(session['token'])
        with ThreadPoolExecutor(4) as pool:
            list(pool.map(work, range(8)))
        self.assertEqual(len(self.store.list_grants()), 1)
        self.store.set_user(self.viewer, role='admin')
        session = self.store.login('viewer', PASSWORD)
        self.store.change_password(self.viewer, PASSWORD, PASSWORD + '!', session['token'])
        self.assertIsNone(self.store.get_session(session['token']))

    def test_assign_projects_permissions_and_history(self):
        self.store.create_project('p', self.owner)
        self.store.register_job('j', 'p', self.owner)
        self.store.set_grant(self.viewer, self.owner, 'read')
        self.store.assign_projects([{'project_id': 'p', 'owner_id': self.owner}], self.admin)
        self.assertIsNone(self.store.project_permission(self.owner, 'p'))
        self.assertIsNone(self.store.project_permission(self.viewer, 'p'))
        self.assertEqual(self.store.get_job('j')['user_id'], self.owner)
        self.store.set_grant(self.viewer, self.admin, 'read')
        self.assertEqual(self.store.project_permission(self.viewer, 'p'), 'read')

    def test_assign_projects_atomic_conflict_and_validation(self):
        self.store.create_project('p', self.admin)
        self.store.create_project('q', self.admin)
        for projects in ([], [{'project_id': 'p', 'owner_id': self.admin},
                              {'project_id': 'q', 'owner_id': self.owner}],
                         [{'project_id': 'missing', 'owner_id': self.admin}],
                         [{'project_id': 'p', 'owner_id': self.admin}] * 2):
            with self.assertRaises(AuthError):
                self.store.assign_projects(projects, self.owner)
            self.assertEqual(self.store.get_project('p')['owner_id'], self.admin)
        self.store.set_user(self.owner, enabled=False)
        with self.assertRaises(AuthError):
            self.store.assign_projects([{'project_id': 'p', 'owner_id': self.admin}], self.owner)
        self.store.set_project_state('q', 'deleted')
        with self.assertRaises(AuthError):
            self.store.assign_projects([{'project_id': 'q', 'owner_id': self.admin}], self.viewer)
        session = self.store.login('admin', PASSWORD)
        self.store.logout(session['token'])
        with self.assertRaises(AuthError):
            self.store.assign_projects([{'project_id': 'p', 'owner_id': self.admin}], self.viewer,
                                       actor_id=self.admin, session_token=session['token'])

    def test_project_views_are_independent_per_user(self):
        self.store.create_project('shared', self.owner)
        self.store.set_project_view(self.owner, 'shared', 10.0, 20.0, 1.2)
        self.store.set_project_view(self.viewer, 'shared', -30.0, 40.0, 0.75)
        self.assertEqual(self.store.get_project_view(self.owner, 'shared'),
                         {'x': 10.0, 'y': 20.0, 'k': 1.2})
        self.assertEqual(self.store.get_project_view(self.viewer, 'shared'),
                         {'x': -30.0, 'y': 40.0, 'k': 0.75})

    def test_v5_migration_preserves_existing_auth_and_project_data(self):
        team = self.store.create_team('迁移团队', self.admin)
        self.store.create_project('personal', self.owner)
        self.store.create_project('team', self.admin, team_id=team['id'])
        self.store.set_project_shares('personal', [self.viewer], [team['id']], self.owner)
        owner_grant = self.store.set_grant(self.viewer, self.owner, 'read')
        self.store.set_project_view(self.viewer, 'personal', 12.0, -34.0, 0.8)
        self.store.register_job('legacy-job', 'personal', self.owner)
        session = self.store.login('viewer', PASSWORD)
        self.store.create_registration('pending-user', PASSWORD, '待审批', '13800138000')
        self.store.set_ready()
        legacy = self.path.parent / 'v5.sqlite'
        migrations = Path(__file__).resolve().parents[1] / 'server/migrations'
        db = sqlite3.connect(legacy)
        try:
            for script in sorted(migrations.glob('00[1-5]_*.sql')):
                db.executescript(script.read_text(encoding='utf-8'))
            self.assertEqual(db.execute('PRAGMA user_version').fetchone()[0], 5)
            tables = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")]
            before = {}
            for table in tables:
                columns = ','.join(row[1] for row in db.execute(f'PRAGMA table_info({table})'))
                rows = [tuple(row) for row in self.store.db.execute(f'SELECT {columns} FROM {table} ORDER BY rowid')]
                before[table] = (columns, rows)
                db.execute(f'DELETE FROM {table}')
                if rows:
                    placeholders = ','.join('?' for _ in rows[0])
                    db.executemany(f'INSERT INTO {table} VALUES ({placeholders})', rows)
            db.commit()
        finally:
            db.close()
        migrated = AuthStore(legacy)
        try:
            self.assertEqual(migrated.db.execute('PRAGMA user_version').fetchone()[0], 8)
            for table, (columns, rows) in before.items():
                with self.subTest(table=table):
                    self.assertEqual([tuple(row) for row in migrated.db.execute(
                        f'SELECT {columns} FROM {table} ORDER BY rowid')], rows)
            self.assertEqual(migrated.list_grants(), [owner_grant])
            self.assertTrue(migrated.is_ready())
            self.assertEqual(migrated.get_session(session['token'])['user']['id'], self.viewer)
            self.assertEqual(migrated.project_permission(self.viewer, 'personal'), 'operate')
            self.assertIsNone(migrated.project_permission(self.viewer, 'team'))
            migrated.set_global_grant(self.viewer, 'operate')
            self.assertEqual(migrated.project_permission(self.viewer, 'team'), 'operate')
            columns = migrated.db.execute('PRAGMA table_info(global_canvas_grants)').fetchall()
            self.assertEqual([row['name'] for row in columns], ['viewer_id', 'permission'])
            self.assertEqual(columns[0]['pk'], 1)
        finally:
            migrated.close()

    def test_v5_phone_migration_preserves_existing_data_and_reopens_idempotently(self):
        legacy = self.path.parent / 'v5.sqlite'
        migrations = Path(__file__).resolve().parents[1] / 'server/migrations'
        token = 'existing-v5-session'
        now = time.time()
        with sqlite3.connect(legacy) as db:
            db.execute('PRAGMA foreign_keys=ON')
            # 显式执行旧版迁移构造真实 v5，不能用最新版建库后伪改版本号。
            for name in ('001_auth.sql', '002_registration.sql', '003_teams.sql',
                         '004_project_shares.sql', '005_project_user_views.sql'):
                db.executescript((migrations / name).read_text(encoding='utf-8'))
            self.assertEqual(db.execute('PRAGMA user_version').fetchone()[0], 5)
            self.assertNotIn('phone', {row[1] for row in db.execute('PRAGMA table_info(users)')})
            password_hash = self.store._user(self.owner)['password_hash']
            db.executemany('INSERT INTO users(id,username,username_key,password_hash,role,enabled,'
                           'version,created_at,display_name,approval_status,team_leader) '
                           'VALUES(?,?,?,?,?,?,?,?,?,?,?)', [
                ('old-owner', 'old-owner', 'old-owner', password_hash, 'admin', 1, 3,
                 100.0, '旧组长', 'approved', 1),
                ('old-viewer', 'old-viewer', 'old-viewer', password_hash, 'user', 1, 2,
                 101.0, '旧组员', 'approved', 0),
            ])
            db.execute('INSERT INTO sessions VALUES(?,?,?,?,?)',
                       (hashlib.sha256(token.encode()).hexdigest(), 'old-owner', 'old-csrf',
                        now + 86400, now))
            db.execute("INSERT INTO teams VALUES('old-team','旧项目组','old-owner','active',100,101)")
            db.executemany('INSERT INTO team_members VALUES(?,?,?)',
                           [('old-team', 'old-owner', 100), ('old-team', 'old-viewer', 101)])
            db.executemany('INSERT INTO project_acl VALUES(?,?,?,?,?)', [
                ('old-personal', 'old-owner', 'active', 100, None),
                ('old-team-project', 'old-owner', 'active', 101, 'old-team'),
            ])
            db.execute("INSERT INTO user_grants VALUES('old-viewer','old-owner','read')")
            db.execute("INSERT INTO job_acl VALUES('old-job','old-personal','old-owner')")
            db.execute("INSERT INTO project_user_shares VALUES('old-personal','old-viewer',102)")
            db.execute("INSERT INTO project_team_shares VALUES('old-personal','old-team',103)")
            db.execute("INSERT INTO project_user_views VALUES('old-personal','old-viewer',10,-20,0.75,104)")
            db.execute("UPDATE auth_meta SET value='1' WHERE key='ready'")
            columns = {}
            before = {}
            for (table,) in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"):
                columns[table] = [row[1] for row in db.execute(f'PRAGMA table_info("{table}")')]
                before[table] = set(map(tuple, db.execute(f'SELECT * FROM "{table}"')))
        db.close()

        # 首次升级及重复重开都不应修改旧字段、会话、画布和授权关系。
        for opening in range(2):
            with self.subTest(opening=opening):
                store = AuthStore(legacy)
                try:
                    self.assertEqual(store.db.execute('PRAGMA user_version').fetchone()[0], 8)
                    info = [row for row in store.db.execute('PRAGMA table_info(users)') if row['name'] == 'phone']
                    self.assertEqual(len(info), 1)
                    self.assertEqual((info[0]['type'], info[0]['notnull'], info[0]['dflt_value']),
                                     ('TEXT', 1, "''"))
                    for table, names in columns.items():
                        selected = ','.join(f'"{name}"' for name in names)
                        self.assertEqual(set(map(tuple, store.db.execute(f'SELECT {selected} FROM "{table}"'))),
                                         before[table], table)
                    self.assertEqual([user['phone'] for user in store.list_users()], ['', ''])
                    session = store.get_session(token)
                    self.assertEqual(session['user']['id'], 'old-owner')
                    self.assertEqual(session['user']['phone'], '')
                    self.assertEqual(session['csrf_token'], 'old-csrf')
                    self.assertTrue(store.is_ready())
                    self.assertEqual(store.project_permission('old-viewer', 'old-personal'), 'operate')
                    self.assertEqual(store.project_permission('old-viewer', 'old-team-project'), 'operate')
                    shares = store.list_project_shares('old-personal', 'old-owner')
                    self.assertEqual(shares['user_ids'], ['old-viewer'])
                    self.assertEqual(shares['team_ids'], ['old-team'])
                    self.assertEqual(store.get_project_view('old-viewer', 'old-personal'),
                                     {'x': 10.0, 'y': -20.0, 'k': 0.75})
                    self.assertEqual(store.list_project_jobs('old-personal'), ['old-job'])
                    self.assertEqual(store.db.execute('PRAGMA foreign_key_check').fetchall(), [])
                finally:
                    store.close()

    def test_v6_phone_migration_preserves_global_grants_and_reopens(self):
        legacy = self.path.parent / 'v6.sqlite'
        migrations = Path(__file__).resolve().parents[1] / 'server/migrations'
        # sqlite3's transaction context does not close the connection on Windows.
        with closing(sqlite3.connect(legacy)) as db, db:
            for script in sorted(migrations.glob('00[1-6]_*.sql')):
                db.executescript(script.read_text(encoding='utf-8'))
            self.assertEqual(db.execute('PRAGMA user_version').fetchone()[0], 6)
            db.execute("INSERT INTO users VALUES('v6-user','legacy','legacy','x','user',1,0,100,'旧账号','approved',0)")
            db.execute("INSERT INTO global_canvas_grants VALUES('v6-user','operate')")
            before = tuple(db.execute('SELECT * FROM users').fetchone())
        for opening in range(2):
            with self.subTest(opening=opening):
                store = AuthStore(legacy)
                try:
                    self.assertEqual(store.db.execute('PRAGMA user_version').fetchone()[0], 8)
                    self.assertEqual(tuple(store.db.execute('SELECT * FROM users').fetchone()), before + ('',))
                    self.assertEqual(tuple(store.db.execute('SELECT * FROM global_canvas_grants').fetchone()),
                                     ('v6-user', 'operate'))
                    self.assertEqual(store.db.execute('PRAGMA foreign_key_check').fetchall(), [])
                finally:
                    store.close()

    def test_unknown_schema_rejected(self):
        path = Path(self.tmp.name) / 'future.sqlite'
        db = sqlite3.connect(path)
        db.execute('PRAGMA user_version=9')
        db.close()
        with self.assertRaises(AuthError):
            AuthStore(path)


class RegistrationStoreTests(unittest.TestCase):
    """自主注册与钉钉审批的数据层语义。"""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / 'auth.sqlite'
        self.store = AuthStore(self.path)
        self.admin = self.store.create_user('admin', PASSWORD, 'admin')['id']

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def _register(self, username='zhangsan', display_name='张三', password=PASSWORD,
                  phone='13800138000'):
        return self.store.create_registration(username, password, display_name, phone)

    def test_registration_requires_valid_phone_without_side_effects(self):
        tables = ('users', 'registration_requests', 'notification_outbox')
        before = {table: set(map(tuple, self.store.db.execute(f'SELECT * FROM {table}')))
                  for table in tables}
        with self.assertRaises(TypeError):
            self.store.create_registration('zhangsan', PASSWORD, '张三')
        for phone in INVALID_PHONES:
            with self.subTest(phone=phone):
                with self.assertRaises(AuthError) as ctx:
                    self._register(phone=phone)
                self.assertEqual(ctx.exception.status, 400)
                for table in tables:
                    self.assertEqual(set(map(tuple, self.store.db.execute(f'SELECT * FROM {table}'))),
                                     before[table], table)
        self.assertEqual(self.store.list_registrations(), [])
        self.assertEqual(self.store.outbox_backlog()['pending'], 0)

    def test_registration_phone_is_trimmed_persisted_and_kept_after_approval(self):
        request = self._register(phone=' \t13800138000\r\n')
        user = next(user for user in self.store.list_users() if user['username'] == 'zhangsan')
        self.assertEqual(user['phone'], '13800138000')
        self.assertEqual(self.store.db.execute('SELECT phone FROM users WHERE id=?',
                                              (user['id'],)).fetchone()[0], '13800138000')
        self.assertNotIn('phone', request)
        self.store.close()
        self.store = AuthStore(self.path)
        self.assertEqual(self.store.get_user(user['id'])['phone'], '13800138000')
        card = self.store.registration_card_data(request['request_id'])
        self.assertNotIn('phone', card)
        self.assertNotIn('13800138000', str(card))
        self.store.decide_registration(card['out_track_id'], 'approved', 'corp', 'approver')
        self.assertEqual(self.store.login('zhangsan', PASSWORD)['user']['phone'], '13800138000')

    def test_failed_registration_preserves_existing_phone_and_records(self):
        session = self.store.login('admin', PASSWORD)
        self.store.set_phone(self.admin, '13800138000', session_token=session['token'])
        request = self._register()
        card = self.store.registration_card_data(request['request_id'])
        for state, username, expected in (('approved', 'admin', 409),
                                          ('pending', 'ZHANGSAN', 409),
                                          ('rejected', 'zhangsan', 403)):
            with self.subTest(state=state):
                if state == 'rejected':
                    self.store.decide_registration(card['out_track_id'], 'rejected', 'corp', 'approver')
                before = {table: set(map(tuple, self.store.db.execute(f'SELECT * FROM {table}')))
                          for table in ('users', 'registration_requests', 'notification_outbox')}
                with self.assertRaises(AuthError) as ctx:
                    self._register(username=username, phone='13900139000')
                self.assertEqual(ctx.exception.status, expected)
                for table, rows in before.items():
                    self.assertEqual(set(map(tuple, self.store.db.execute(f'SELECT * FROM {table}'))),
                                     rows, table)
                self.assertEqual(self.store.get_user(self.admin)['phone'], '13800138000')
                self.assertEqual(self.store.get_user(card['user_id'])['phone'], '13800138000')

    def test_v1_database_migrates_to_v2(self):
        legacy = self.path.parent / 'legacy.sqlite'
        db = sqlite3.connect(legacy)
        script = (Path(__file__).resolve().parents[1] / 'server/migrations/001_auth.sql').read_text(encoding='utf-8')
        db.executescript(script)
        db.execute("INSERT INTO users VALUES('u1','old','old','x','user',1,0,100.0)")
        db.execute("INSERT INTO project_acl VALUES('legacy-project','u1','active',100.0)")
        db.execute("UPDATE auth_meta SET value='1' WHERE key='ready'")
        db.commit()
        db.close()
        store = AuthStore(legacy)
        try:
            users = store.list_users()
            self.assertEqual(users[0]['approval_status'], 'approved')
            self.assertEqual(users[0]['display_name'], 'old')
            self.assertFalse(users[0]['team_leader'])
            self.assertEqual(store._user('u1')['enabled'], 1)
            self.assertTrue(store.is_ready())
            self.assertEqual(store.db.execute('PRAGMA user_version').fetchone()[0], 8)
            self.assertEqual(users[0]['phone'], '')
            self.assertIsNone(store.get_project('legacy-project')['team_id'])
            self.assertEqual(store.list_project_shares('legacy-project', 'u1')['user_ids'], [])
        finally:
            store.close()

    def test_registration_pending_blocks_login_and_duplicates(self):
        request = self._register()
        self.assertEqual(request['status'], 'pending')
        user = self.store.list_users()[-1]
        self.assertEqual(user['approval_status'], 'pending')
        self.assertEqual(user['role'], 'user')
        self.assertEqual(user['display_name'], '张三')
        with self.assertRaises(AuthError) as ctx:
            self.store.login('zhangsan', PASSWORD)
        self.assertEqual(ctx.exception.status, 403)
        self.assertIn('审批中', str(ctx.exception))
        with self.assertRaises(AuthError) as ctx:
            self._register()
        self.assertEqual(ctx.exception.status, 409)
        with self.assertRaises(AuthError):
            self._register(username='ZHANGSAN')
        for bad in ('', '  ', 'x' * 65, 'a\nb'):
            with self.assertRaises(AuthError):
                self._register(display_name=bad)

    def test_registration_password_and_wrong_password_silent(self):
        with self.assertRaises(AuthError):
            self._register(password='short')
        self._register()
        with self.assertRaises(AuthError) as ctx:
            self.store.login('zhangsan', 'wrong-password')
        self.assertEqual(ctx.exception.status, 401)
        self.assertEqual(str(ctx.exception), '用户名或密码错误')

    def test_decision_approve_enables_login(self):
        request = self._register()
        card = self.store.registration_card_data(request['request_id'])
        outcome, row = self.store.decide_registration(card['out_track_id'], 'approved', 'corp1', '431661')
        self.assertEqual(outcome, 'applied')
        self.assertEqual(row['status'], 'approved')
        self.assertEqual(row['decided_by'], '431661')
        session = self.store.login('zhangsan', PASSWORD)
        self.assertEqual(session['user']['approval_status'], 'approved')
        self.assertEqual(session['user']['phone'], '13800138000')
        self.assertIsNotNone(self.store.get_session(session['token']))

    def test_decision_reject_blocks_and_reapply_forbidden(self):
        request = self._register()
        card = self.store.registration_card_data(request['request_id'])
        outcome, row = self.store.decide_registration(card['out_track_id'], 'rejected', 'corp1', '431661')
        self.assertEqual(outcome, 'applied')
        with self.assertRaises(AuthError) as ctx:
            self.store.login('zhangsan', PASSWORD)
        self.assertIn('拒绝', str(ctx.exception))
        with self.assertRaises(AuthError) as ctx:
            self._register()
        self.assertEqual(ctx.exception.status, 403)

    def test_decision_idempotent_and_unknown(self):
        request = self._register()
        card = self.store.registration_card_data(request['request_id'])
        self.store.decide_registration(card['out_track_id'], 'approved', 'corp1', 'a')
        outcome, row = self.store.decide_registration(card['out_track_id'], 'rejected', 'corp1', 'b')
        self.assertEqual(outcome, 'duplicate')
        self.assertEqual(row['status'], 'approved')
        self.assertEqual(row['decided_by'], 'a')
        self.assertEqual(self.store.decide_registration('missing', 'approved', 'c', 'd')[0], 'unknown')
        with self.assertRaises(AuthError):
            self.store.decide_registration(card['out_track_id'], 'hack', 'c', 'd')

    def test_admin_operations_cannot_change_approval(self):
        request = self._register()
        user = self.store.list_users()[-1]
        with self.assertRaises(AuthError) as ctx:
            self.store.set_user(user['id'], role='admin')
        self.assertEqual(ctx.exception.status, 409)
        self.store.set_user(user['id'], enabled=False)
        self.store.reset_password(user['id'], PASSWORD + '!')
        refreshed = self.store.list_users()[-1]
        self.assertEqual(refreshed['approval_status'], 'pending')
        self.assertEqual(refreshed['role'], 'user')
        card = self.store.registration_card_data(request['request_id'])
        self.store.decide_registration(card['out_track_id'], 'approved', 'corp', 'x')
        # 停用不因审批通过而自动恢复
        self.assertFalse(self.store.list_users()[-1]['enabled'])

    def test_outbox_lifecycle_and_backoff(self):
        request = self._register()
        tasks = self.store.claim_outbox(time.time())
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]['kind'], 'send_card')
        self.assertEqual(tasks[0]['request_id'], request['request_id'])
        self.assertEqual(self.store.claim_outbox(time.time()), [])
        self.store.finish_outbox(tasks[0]['id'], done=True)
        self.assertEqual(self.store.outbox_backlog()['pending'], 0)

        card = self.store.registration_card_data(request['request_id'])
        self.store.decide_registration(card['out_track_id'], 'approved', 'corp', 'x')
        tasks = self.store.claim_outbox(time.time())
        self.assertEqual(tasks[0]['kind'], 'update_card')
        self.store.finish_outbox(tasks[0]['id'], error='boom')
        backlog = self.store.outbox_backlog()
        self.assertEqual(backlog['pending'], 1)
        with self.store.lock:
            row = self.store.db.execute('SELECT * FROM notification_outbox WHERE id=?',
                                        (tasks[0]['id'],)).fetchone()
        self.assertEqual(row['attempts'], 1)
        self.assertIn('boom', row['last_error'])
        self.assertGreater(row['next_try_at'], time.time())
        # 未到期不可认领，到期后可认领且退避有上限
        self.assertEqual(self.store.claim_outbox(time.time()), [])
        due = self.store.claim_outbox(row['next_try_at'] + 0.1)
        self.assertEqual(len(due), 1)
        for _ in range(8):
            self.store.finish_outbox(due[0]['id'], error='still failing')
        with self.store.lock:
            final = self.store.db.execute('SELECT attempts,next_try_at FROM notification_outbox WHERE id=?',
                                          (tasks[0]['id'],)).fetchone()
        self.assertLessEqual(final['next_try_at'] - time.time(), 600 + 5)

    def test_list_registrations_shape(self):
        self._register('lisi', '李四')
        rows = self.store.list_registrations()
        self.assertEqual(rows[0]['username'], 'lisi')
        self.assertEqual(rows[0]['display_name'], '李四')
        self.assertEqual(rows[0]['status'], 'pending')
        self.assertNotIn('password', ' '.join(rows[0].keys()))
        self.assertNotIn('phone', rows[0])
        self.assertNotIn('13800138000', str(rows))


class HTTPSRedirectConfigTests(unittest.TestCase):
    def test_reject_invalid_redirect_origins(self):
        for origin in ('http://example.test', 'https://', 'https://user:pass@example.test',
                       'https://example.test/path', 'https://example.test?next=elsewhere',
                       'https://example.test#fragment', 'https://example.test:0',
                       'https://example.test:99999', 'https://example.test\n'):
            with self.subTest(origin=origin), patch.dict(os.environ, {'CHOUKA_HTTPS_REDIRECT_ORIGIN': origin}):
                with self.assertRaisesRegex(RuntimeError, 'CHOUKA_HTTPS_REDIRECT_ORIGIN'):
                    register_auth_routes(web.Application(), '.')

    def test_optional_redirect_and_local_test_bypass(self):
        for local_test, origin, expected in (
                (False, '', ''), (False, 'https://example.test:8443/', 'https://example.test:8443'),
                (True, 'https://example.test:8443', '')):
            with self.subTest(local_test=local_test, origin=origin):
                app = web.Application()
                app['local_test'] = local_test
                with patch.dict(os.environ, {'CHOUKA_HTTPS_REDIRECT_ORIGIN': origin}, clear=True):
                    register_auth_routes(app, '.')
                self.assertEqual(app['https_redirect_origin'], expected)

    def test_direct_tls_defaults_to_intranet_https_without_redirect_setting(self):
        tls = {'CHOUKA_TLS_CERT': 'server.crt', 'CHOUKA_TLS_KEY': 'server.key'}
        for settings, expected in (
                ({'CHOUKA_TLS_CERT': 'server.crt'}, ''),
                (tls, 'https://dinghaichouka.youku.com:8443'),
                (tls | {'CHOUKA_HTTPS_REDIRECT_ORIGIN': ''}, 'https://dinghaichouka.youku.com:8443'),
                (tls | {'CHOUKA_HTTPS_PORT': '9443'}, 'https://dinghaichouka.youku.com:9443'),
                (tls | {'CHOUKA_HTTPS_REDIRECT_ORIGIN': 'https://example.test/'}, 'https://example.test')):
            with self.subTest(settings=settings), patch.dict(os.environ, settings, clear=True):
                app = web.Application()
                register_auth_routes(app, '.')
                self.assertEqual(app['https_redirect_origin'], expected)

    def test_local_and_admin_sandboxes_ignore_tls_redirect(self):
        for mode in ('local_test', 'admin_sandbox'):
            with self.subTest(mode=mode), patch.dict(os.environ, {
                    'CHOUKA_TLS_CERT': 'server.crt', 'CHOUKA_TLS_KEY': 'server.key',
                    'CHOUKA_HTTPS_REDIRECT_ORIGIN': 'https://example.test',
            }, clear=True):
                app = web.Application()
                app[mode] = True
                register_auth_routes(app, '.')
                self.assertEqual(app['https_redirect_origin'], '')


class HTTPSRedirectTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = AuthStore(Path(self.tmp.name) / 'auth.sqlite')
        self.store.create_user('admin', PASSWORD, 'admin')
        self.store.set_ready()
        self.target = 'https://dinghaichouka.youku.com:8443'
        app = web.Application(middlewares=[auth_middleware])
        app['auth_store'] = self.store
        with patch.dict(os.environ, {
                'CHOUKA_TLS_CERT': 'server.crt', 'CHOUKA_TLS_KEY': 'server.key',
                'CHOUKA_HTTPS_PORT': '8443',
        }, clear=True):
            register_auth_routes(app, Path(__file__).resolve().parents[1] / 'web')

        async def ok(request):
            return web.json_response({'ok': True})

        async def websocket(request):
            ws = web.WebSocketResponse()
            await ws.prepare(request)
            await ws.send_str('connected')
            await ws.close()
            return ws

        app.router.add_get('/api/business', ok)
        app.router.add_get('/agent/v1/input', ok)
        app.router.add_post('/agent/v1/test', ok)
        app.router.add_get('/socket', websocket)
        self.client = TestClient(TestServer(app))
        await self.client.start_server()

    async def asyncTearDown(self):
        await self.client.close()
        self.store.close()
        self.tmp.cleanup()

    async def test_http_pages_redirect_before_login_preserving_path_and_query(self):
        for path in ('/', '/login', '/director?project=a%2Fb&x=1&x=2',
                     '/if-studio', '/controller/costs', '/auth.js'):
            for method in ('GET', 'HEAD'):
                with self.subTest(path=path, method=method):
                    response = await self.client.request(method, URL(path, encoded=True), allow_redirects=False)
                    self.assertEqual(response.status, 308)
                    self.assertEqual(response.headers['Location'], self.target + path)
                    self.assertEqual(response.headers['Cache-Control'], 'private, no-store')

    async def test_redirect_target_does_not_trust_host_or_forwarded_headers(self):
        response = await self.client.get('/login', headers={
            'Host': 'evil.test', 'X-Forwarded-Proto': 'https',
        }, allow_redirects=False)
        self.assertEqual(response.status, 308)
        self.assertEqual(response.headers['Location'], self.target + '/login')

    async def test_api_posts_worker_and_websocket_keep_existing_behavior(self):
        response = await self.client.get('/api/business', headers={'Accept': 'text/html'}, allow_redirects=False)
        self.assertEqual(response.status, 401)
        self.assertNotIn('Location', response.headers)
        self.assertEqual((await self.client.get('/agent/v1/input', allow_redirects=False)).status, 200)
        self.assertEqual((await self.client.post('/agent/v1/test', allow_redirects=False)).status, 200)
        response = await self.client.post('/api/auth/login', json={
            'username': 'admin', 'password': PASSWORD,
        }, headers={'Origin': str(self.client.make_url('/')).rstrip('/')}, allow_redirects=False)
        self.assertEqual(response.status, 200)
        self.assertEqual((await self.client.get('/api/business', allow_redirects=False)).status, 200)
        async with self.client.ws_connect('/socket') as ws:
            self.assertEqual((await ws.receive()).data, 'connected')
        response = await self.client.post('/login', allow_redirects=False)
        self.assertNotIn(response.status, (301, 302, 303, 307, 308))

    async def test_https_request_does_not_loop(self):
        request = make_mocked_request('GET', '/login', app=self.client.server.app).clone(scheme='https')

        async def ok(request):
            return web.Response(text='HTTPS page')

        response = await auth_middleware(request, ok)
        self.assertEqual(response.status, 200)
        self.assertEqual(response.text, 'HTTPS page')
        self.assertNotIn('Location', response.headers)


class HTTPTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = AuthStore(Path(self.tmp.name) / 'auth.sqlite')
        self.store.create_user('admin', PASSWORD, 'admin')
        self.uid = self.store.create_user('user', PASSWORD)['id']
        app = web.Application(middlewares=[auth_middleware])
        app['auth_store'] = self.store
        app['project_locks'] = defaultdict(asyncio.Lock)
        register_auth_routes(app, self.tmp.name)
        async def ok(request):
            return web.json_response({'ok': True})
        async def project(request):
            return web.json_response(await require_project(
                request, request.match_info.get('pid', 'p'), operate=request.method == 'POST'))
        app.router.add_get('/api/business', ok)
        app.router.add_get('/api/status', ok)
        app.router.add_get('/api/project', project)
        app.router.add_post('/api/project', project)
        app.router.add_get('/api/test/projects/{pid}', project)
        app.router.add_post('/api/test/projects/{pid}', project)
        app.router.add_post('/agent/v1/test', ok)
        self.client = TestClient(TestServer(app))
        await self.client.start_server()
        self.origin = str(self.client.make_url('/')).rstrip('/')

    async def asyncTearDown(self):
        await self.client.close()
        self.store.close()
        self.tmp.cleanup()

    async def login(self, username='admin'):
        response = await self.client.post('/api/auth/login', json={'username': username, 'password': PASSWORD}, headers={'Origin': self.origin})
        self.assertEqual(response.status, 200)
        self.assertIn('HttpOnly', response.headers['Set-Cookie'])
        return await response.json()

    async def test_failclosed_and_ready(self):
        response = await self.client.get('/api/unknown')
        self.assertEqual(response.status, 401)
        self.assertEqual(response.headers['Cache-Control'], 'private, no-store')
        # 迁移未完成时 Worker 通道同样拒绝，避免旧协议绕过资源索引。
        self.assertEqual((await self.client.post('/agent/v1/test')).status, 503)
        await self.login()
        self.assertEqual((await self.client.get('/api/business')).status, 503)
        self.assertEqual((await self.client.get('/api/auth/me')).status, 200)
        self.assertEqual((await self.client.get('/api/admin/users')).status, 200)
        self.store.set_ready()
        self.assertEqual((await self.client.get('/api/business')).status, 200)
        self.assertEqual((await self.client.post('/agent/v1/test')).status, 200)
        self.client.server.app['auth_store'] = None
        self.assertEqual((await self.client.get('/api/business')).status, 503)
        self.assertEqual((await self.client.post('/agent/v1/test')).status, 503)

    async def test_source_csrf_roles_and_logout(self):
        self.assertEqual((await self.client.post('/api/auth/login', json={'username': 'admin', 'password': PASSWORD})).status, 403)
        self.assertEqual((await self.client.post('/api/auth/login', json={'username': 'admin', 'password': PASSWORD}, headers={'Origin': 'https://evil.test'})).status, 403)
        session = await self.login('user')
        self.store.set_ready()
        self.assertEqual((await self.client.get('/api/status')).status, 403)
        self.assertEqual((await self.client.get('/controller', allow_redirects=False)).status, 403)
        self.assertEqual((await self.client.post('/api/auth/logout', headers={'Origin': self.origin})).status, 403)
        response = await self.client.post('/api/auth/logout', headers={'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']})
        self.assertEqual(response.status, 200)
        self.assertEqual((await self.client.get('/api/auth/me')).status, 401)

    async def test_phone_self_service_me_login_and_admin_list(self):
        session = await self.login('user')
        self.assertEqual(session['user']['phone'], '')
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
        self.store.set_ready()
        self.store.create_project('p', self.uid)
        # 补录由前端提示；后端业务接口暂不增加手机号门禁。
        self.assertEqual((await self.client.get('/api/business')).status, 200)
        self.assertEqual((await self.client.post('/api/project', headers=headers)).status, 200)
        self.assertEqual((await self.client.get('/api/admin/users')).status, 403)
        token = self.client.session.cookie_jar.filter_cookies(self.client.make_url('/'))[COOKIE].value
        with patch.object(self.store, 'set_phone', wraps=self.store.set_phone) as set_phone:
            response = await self.client.post('/api/auth/phone', json={'phone': ' \t13800138000\n'},
                                              headers=headers)
            self.assertEqual(response.status, 200, await response.text())
            set_phone.assert_called_once_with(self.uid, ' \t13800138000\n', session_token=token)
        self.assertEqual((await response.json())['user']['phone'], '13800138000')
        self.assertNotIn('Set-Cookie', response.headers)
        response = await self.client.get('/api/auth/me')
        self.assertEqual(response.status, 200)
        identity = await response.json()
        self.assertEqual(identity['user']['id'], self.uid)
        self.assertEqual(identity['user']['phone'], '13800138000')
        self.assertEqual(identity['csrf_token'], session['csrf_token'])
        self.assertEqual(self.store.get_session(token)['user']['phone'], '13800138000')
        self.assertEqual((await self.client.get('/api/admin/users')).status, 403)
        self.assertEqual((await self.login('user'))['user']['phone'], '13800138000')
        await self.login()
        response = await self.client.get('/api/admin/users')
        self.assertEqual(response.status, 200)
        users = {user['id']: user for user in (await response.json())['users']}
        self.assertEqual(users[self.uid]['phone'], '13800138000')
        self.assertTrue(all('phone' in user for user in users.values()))
        self.assertEqual(next(user for user in users.values() if user['username'] == 'admin')['phone'], '')

    async def test_phone_requires_login_same_origin_and_csrf(self):
        url = '/api/auth/phone'
        body = {'phone': '13800138000'}
        response = await self.client.post(url, json=body, headers={'Origin': self.origin})
        self.assertEqual(response.status, 401)
        self.assertEqual(self.store.get_user(self.uid)['phone'], '')
        session = await self.login('user')
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
        before = set(map(tuple, self.store.db.execute('SELECT * FROM users')))
        for invalid_headers in (
            {'Origin': self.origin},
            {**headers, 'X-CSRF-Token': 'wrong-csrf'},
            {**headers, 'Origin': 'https://evil.invalid'},
            {'X-CSRF-Token': session['csrf_token']},
            {**headers, 'Sec-Fetch-Site': 'cross-site'},
        ):
            with self.subTest(headers=invalid_headers):
                response = await self.client.post(url, json=body, headers=invalid_headers)
                self.assertEqual(response.status, 403, await response.text())
                self.assertEqual(set(map(tuple, self.store.db.execute('SELECT * FROM users'))), before)
        response = await self.client.post(url, json=body, headers=headers)
        self.assertEqual(response.status, 200, await response.text())

    async def test_phone_rejects_invalid_json_types_formats_and_identity_fields(self):
        session = await self.login('user')
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
        self.store.set_phone(self.uid, '13800138000', session_token=(
            self.client.session.cookie_jar.filter_cookies(self.client.make_url('/'))[COOKIE].value))
        admin = next(user['id'] for user in self.store.list_users() if user['role'] == 'admin')
        bodies = [{}, [], None, '13800138000']
        bodies.extend({'phone': value} for value in INVALID_PHONES)
        bodies.extend({'phone': '13900139000', field: admin} for field in ('uid', 'user_id', 'id'))
        bodies.append({'phone': '13900139000', 'uid': self.uid})
        before = set(map(tuple, self.store.db.execute('SELECT * FROM users')))
        for body in bodies:
            with self.subTest(body=body):
                response = await self.client.post('/api/auth/phone', json=body, headers=headers)
                self.assertEqual(response.status, 400, await response.text())
                self.assertEqual(set(map(tuple, self.store.db.execute('SELECT * FROM users'))), before)
        response = await self.client.post('/api/auth/phone', data=b'{',
                                          headers={**headers, 'Content-Type': 'application/json'})
        self.assertEqual(response.status, 400)
        self.assertEqual(set(map(tuple, self.store.db.execute('SELECT * FROM users'))), before)
        self.assertEqual((await self.client.get('/api/auth/me')).status, 200)

    async def test_phone_rejects_expired_logged_out_and_inactive_http_sessions(self):
        for state in ('expired', 'logout', 'disabled', 'pending', 'rejected'):
            with self.subTest(state=state):
                session = await self.login('user')
                headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
                token = self.client.session.cookie_jar.filter_cookies(self.client.make_url('/'))[COOKIE].value
                if state == 'expired':
                    self.store.db.execute('UPDATE sessions SET expires_at=0 WHERE token_hash=?',
                                          (hashlib.sha256(token.encode()).hexdigest(),))
                elif state == 'logout':
                    response = await self.client.post('/api/auth/logout', headers=headers)
                    self.assertEqual(response.status, 200)
                elif state == 'disabled':
                    self.store.db.execute('UPDATE users SET enabled=0 WHERE id=?', (self.uid,))
                else:
                    self.store.db.execute('UPDATE users SET approval_status=? WHERE id=?', (state, self.uid))
                try:
                    response = await self.client.post('/api/auth/phone', json={'phone': '13800138000'},
                                                      headers=headers)
                    self.assertEqual(response.status, 401, await response.text())
                    self.assertEqual(self.store.get_user(self.uid)['phone'], '')
                finally:
                    self.store.db.execute("UPDATE users SET enabled=1,approval_status='approved' WHERE id=?",
                                          (self.uid,))

    async def test_admin_assign_projects(self):
        admin = self.store.list_users()[0]['id']
        self.store.create_project('p', admin)
        self.store.set_ready()
        body = {'projects': [{'project_id': 'p', 'owner_id': admin}], 'owner_id': self.uid}
        url = '/api/admin/projects/assign'
        self.assertEqual((await self.client.post(url, json=body)).status, 401)
        session = await self.login('user')
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
        self.assertEqual((await self.client.post(url, json=body, headers=headers)).status, 403)
        session = await self.login()
        headers['X-CSRF-Token'] = session['csrf_token']
        self.assertEqual((await self.client.post(url, json=body, headers={'Origin': self.origin})).status, 403)
        response = await self.client.post(url, json=body, headers=headers)
        self.assertEqual(response.status, 200)
        self.assertEqual((await response.json())['count'], 1)
        self.assertEqual(self.store.get_project('p')['owner_id'], self.uid)
        self.assertEqual((await self.client.post(url, json=body, headers=headers)).status, 409)
        self.assertEqual((await self.client.post(url, json={'projects': [None], 'owner_id': self.uid}, headers=headers)).status, 400)

    async def test_global_grant_api_requires_admin_and_csrf(self):
        self.store.set_ready()
        url = f'/api/admin/global-grants/{self.uid}'
        for method in ('PUT', 'DELETE'):
            response = await self.client.request(method, url, json={'permission': 'read'})
            self.assertEqual(response.status, 401)
        self.assertEqual((await self.client.get('/api/admin/grants')).status, 401)
        for leader in (False, True):
            self.store.set_user(self.uid, team_leader=leader)
            session = await self.login('user')
            headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
            for method in ('PUT', 'DELETE'):
                response = await self.client.request(method, url, json={'permission': 'read'}, headers=headers)
                self.assertEqual(response.status, 403)
            self.assertEqual((await self.client.get('/api/admin/grants')).status, 403)
        session = await self.login()
        for method in ('PUT', 'DELETE'):
            for bad_headers in ({'Origin': self.origin},
                                {'Origin': self.origin, 'X-CSRF-Token': 'wrong'},
                                {'Origin': 'https://evil.test', 'X-CSRF-Token': session['csrf_token']},
                                {'X-CSRF-Token': session['csrf_token']}):
                with self.subTest(method=method, headers=bad_headers):
                    response = await self.client.request(method, url, json={'permission': 'read'}, headers=bad_headers)
                    self.assertEqual(response.status, 403)
        self.assertEqual(self.store.list_grants(), [])

    async def test_global_grant_api_rejects_invalid_requests_without_mutation_or_notification(self):
        session = await self.login()
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
        url = f'/api/admin/global-grants/{self.uid}'
        invalid = ({}, [], None, {'permission': 'admin'}, {'permission': ''},
                   {'permission': None}, {'permission': True}, {'permission': 1},
                   {'permission': []}, {'permission': {}},
                   {'permission': 'read', 'scope': 'all'},
                   {'permission': 'operate', 'viewer_id': self.uid},
                   {'permission': 'read', 'owner_id': self.uid})
        with patch('server.auth.notify_access_changed') as notify:
            for body in invalid:
                with self.subTest(body=body):
                    response = await self.client.put(url, json=body, headers=headers)
                    self.assertEqual(response.status, 400, await response.text())
            response = await self.client.put(url, data='{', headers=headers)
            self.assertEqual(response.status, 400)
            response = await self.client.put('/api/admin/global-grants/missing',
                                             json={'permission': 'read'}, headers=headers)
            self.assertEqual(response.status, 404)
            self.assertEqual(self.store.list_grants(), [])
            notify.assert_not_awaited()

    async def test_global_grant_api_lists_downgrades_and_revokes_with_notifications(self):
        admin = self.store.list_users()[0]['id']
        owner = self.store.create_user('owner', PASSWORD)['id']
        self.store.create_project('p', admin)
        self.store.create_project('owner-project', owner)
        owner_grant = self.store.set_grant(self.uid, owner, 'operate')
        self.store.set_ready()
        session = await self.login()
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
        url = f'/api/admin/global-grants/{self.uid}'
        with patch('server.auth.notify_access_changed') as notify:
            for permission in ('operate', 'read'):
                notify.reset_mock()
                response = await self.client.put(url, json={'permission': permission}, headers=headers)
                self.assertEqual(response.status, 200, await response.text())
                grant = {'viewer_id': self.uid, 'owner_id': None, 'scope': 'all', 'permission': permission}
                self.assertEqual((await response.json())['grant'], grant)
                self.assertEqual(self.store.project_permission(self.uid, 'p'), permission)
                response = await self.client.get('/api/admin/grants')
                self.assertEqual(response.status, 200)
                self.assertCountEqual((await response.json())['grants'], [owner_grant, grant])
                notify.assert_awaited_once_with(ANY, user_ids=[self.uid])
            notify.reset_mock()
            response = await self.client.delete(url, headers=headers)
            self.assertEqual(response.status, 200)
            self.assertEqual(await response.json(), {'ok': True})
            notify.assert_awaited_once_with(ANY, user_ids=[self.uid])
            self.assertIsNone(self.store.project_permission(self.uid, 'p'))
            self.assertEqual(self.store.project_permission(self.uid, 'owner-project'), 'operate')
            response = await self.client.get('/api/admin/grants')
            self.assertEqual((await response.json())['grants'], [owner_grant])
        await self.login('user')
        self.assertEqual((await self.client.get('/api/project')).status, 404)
        self.assertEqual((await self.client.get('/api/test/projects/owner-project')).status, 200)

    async def test_global_grant_http_read_operate_and_team_role_boundaries(self):
        admin = self.store.list_users()[0]['id']
        team = self.store.create_team('全局访问不是成员资格', admin)
        self.store.create_project('p', admin)
        self.store.create_project('team', admin, team_id=team['id'])
        self.store.create_project('pending', admin, 'pending')
        self.store.create_project('deleted', admin, 'deleted')
        self.store.set_ready()
        session = await self.login('user')
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
        for permission in ('read', 'operate'):
            self.store.set_global_grant(self.uid, permission)
            for url in ('/api/project', '/api/test/projects/team'):
                response = await self.client.get(url)
                self.assertEqual(response.status, 200)
                self.assertEqual((await response.json())['permission'], permission)
                response = await self.client.post(url, headers=headers)
                self.assertEqual(response.status, 403 if permission == 'read' else 200)
            for pid in ('pending', 'deleted', 'missing'):
                response = await self.client.get('/api/test/projects/' + pid)
                self.assertEqual(response.status, 404)
            for url in ('/api/status', '/api/admin/users', '/api/admin/grants', '/api/team-candidates'):
                self.assertEqual((await self.client.get(url)).status, 403)
            response = await self.client.get('/api/auth/me')
            user = (await response.json())['user']
            self.assertEqual(user['role'], 'user')
            self.assertFalse(user['team_leader'])
            response = await self.client.get('/api/teams')
            self.assertEqual((await response.json())['teams'], [])
            response = await self.client.post('/api/teams', json={'name': '越权'}, headers=headers)
            self.assertEqual(response.status, 403)
            response = await self.client.post(f"/api/teams/{team['id']}/members",
                                              json={'user_id': self.uid}, headers=headers)
            self.assertEqual(response.status, 403)
        self.store.set_global_grant(self.uid, 'read')
        self.assertEqual((await self.client.post('/api/project', headers=headers)).status, 403)
        self.store.delete_global_grant(self.uid)
        self.assertEqual((await self.client.get('/api/project')).status, 404)
        self.assertEqual((await self.client.get('/api/test/projects/team')).status, 404)

    async def test_global_grant_api_rechecks_actor_after_middleware(self):
        admin = self.store.list_users()[0]['id']
        self.store.set_global_grant(self.uid, 'read')
        url = f'/api/admin/global-grants/{self.uid}'
        for method, name in (('PUT', 'set_global_grant'), ('DELETE', 'delete_global_grant')):
            session = await self.login()
            headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
            original = getattr(self.store, name)

            def revoke_before_write(*args, **kwargs):
                self.assertEqual(kwargs['actor_id'], admin)
                self.assertTrue(kwargs['session_token'])
                self.store.logout(kwargs['session_token'])
                return original(*args, **kwargs)

            with patch.object(self.store, name, side_effect=revoke_before_write), \
                    patch('server.auth.notify_access_changed') as notify:
                response = await self.client.request(method, url, json={'permission': 'operate'}, headers=headers)
                self.assertEqual(response.status, 401, await response.text())
                notify.assert_not_awaited()
            self.assertEqual(self.store.list_grants()[0]['permission'], 'read')

    async def test_team_api_requires_leader_and_manages_members(self):
        member = self.store.create_user('member', PASSWORD)
        member_session = self.store.login('member', PASSWORD)
        self.store.set_phone(member['id'], '13800138000', session_token=member_session['token'])
        normal = self.store.create_user('normal', PASSWORD)
        self.store.set_user(self.uid, team_leader=True)
        self.store.set_ready()
        session = await self.login('user')
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
        response = await self.client.post('/api/teams', json={'name': '项目一组'}, headers=headers)
        self.assertEqual(response.status, 201)
        team = (await response.json())['team']
        response = await self.client.get('/api/team-candidates')
        self.assertEqual(response.status, 200)
        candidates = await response.json()
        self.assertIn(member['id'], {user['id'] for user in candidates['users']})
        for user in candidates['users']:
            self.assertNotIn('phone', user)
        self.assertNotIn('13800138000', str(candidates))
        response = await self.client.post(f"/api/teams/{team['id']}/members",
                                          json={'user_id': member['id']}, headers=headers)
        self.assertEqual(response.status, 201)
        self.assertEqual(len(self.store.list_teams(member['id'])[0]['members']), 2)
        session = await self.login('normal')
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
        self.assertEqual((await self.client.post('/api/teams', json={'name': '越权'}, headers=headers)).status, 403)
        self.assertEqual((await self.client.get('/api/teams')).status, 200)
        self.assertEqual(normal['team_leader'], False)

    async def test_batch_team_member_api_is_atomic_and_requires_manager_and_csrf(self):
        member = self.store.create_user('member', PASSWORD)
        disabled = self.store.create_user('disabled', PASSWORD)
        other = self.store.create_user('other-leader', PASSWORD, team_leader=True)
        self.store.set_user(disabled['id'], enabled=False)
        self.store.set_user(self.uid, team_leader=True)
        self.store.set_ready()
        session = await self.login('user')
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
        team = self.store.create_team('批量添加', self.uid)
        url = f"/api/teams/{team['id']}/members/batch"
        body = {'user_ids': [member['id'], other['id']]}
        response = await self.client.post(url, json=body, headers={'Origin': self.origin})
        self.assertEqual(response.status, 403)
        for invalid in ({}, {'user_ids': []}, {'user_ids': member['id']},
                        {'user_ids': [member['id'], member['id']]}, {'user_ids': [None]},
                        {'user_ids': [member['id']], 'role': 'admin'}):
            response = await self.client.post(url, json=invalid, headers=headers)
            self.assertEqual(response.status, 400, await response.text())
        response = await self.client.post(url, json={'user_ids': [member['id'], disabled['id']]}, headers=headers)
        self.assertEqual(response.status, 409)
        self.assertEqual(len(self.store.list_teams(self.uid)[0]['members']), 1)
        response = await self.client.post(url, json=body, headers=headers)
        self.assertEqual(response.status, 201, await response.text())
        self.assertEqual([item['user_id'] for item in (await response.json())['members']], body['user_ids'])
        self.assertEqual(len(self.store.list_teams(self.uid)[0]['members']), 3)
        for username in ('other-leader', 'member'):
            session = await self.login(username)
            headers['X-CSRF-Token'] = session['csrf_token']
            response = await self.client.post(url, json={'user_ids': [self.uid]}, headers=headers)
            self.assertEqual(response.status, 403)
        session = await self.login()
        headers['X-CSRF-Token'] = session['csrf_token']
        self.assertEqual((await self.client.post(url, json=body, headers=headers)).status, 201)
        self.assertEqual(len(self.store.list_teams(self.uid)[0]['members']), 3)

    async def test_batch_team_member_api_bounds_fixed_and_chunked_json(self):
        member = self.store.create_user('member', PASSWORD)
        self.store.set_user(self.uid, team_leader=True)
        self.store.set_ready()
        session = await self.login('user')
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token'],
                   'Content-Type': 'application/json'}
        team = self.store.create_team('请求大小边界', self.uid)
        url = f"/api/teams/{team['id']}/members/batch"
        body = ('{"user_ids":["' + member['id'] + '"]}').encode('utf-8')
        oversized = body.ljust(70050, b' ')

        async def chunks(payload):
            for start in range(0, len(payload), 4096):
                yield payload[start:start + 4096]

        for payload in (oversized, chunks(oversized)):
            response = await self.client.post(url, data=payload, headers=headers)
            self.assertEqual(response.status, 413, await response.text())
            self.assertEqual(len(self.store.list_teams(self.uid)[0]['members']), 1)
        for payload in (b'{', b'\xff', b'[]', b'{"user_ids":[],"role":"admin"}'):
            response = await self.client.post(url, data=chunks(payload), headers=headers)
            self.assertEqual(response.status, 400, await response.text())
            self.assertEqual(len(self.store.list_teams(self.uid)[0]['members']), 1)
        response = await self.client.post(url, data=chunks(body.ljust(65536, b' ')), headers=headers)
        self.assertEqual(response.status, 201, await response.text())
        self.assertEqual((await response.json())['members'][0]['user_id'], member['id'])
        self.assertEqual(len(self.store.list_teams(self.uid)[0]['members']), 2)

    async def test_rate_limit_and_project_acl(self):
        session = await self.login('user')
        self.store.set_ready()
        self.store.create_project('p', self.uid)
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
        self.assertEqual((await self.client.post('/api/project', headers=headers)).status, 200)
        for _ in range(9):
            await self.client.post('/api/auth/login', json={'username': 'missing', 'password': 'bad'}, headers={'Origin': self.origin})
        self.assertEqual((await self.client.post('/api/auth/login', json={'username': 'missing', 'password': 'bad'}, headers={'Origin': self.origin})).status, 429)

    async def test_register_flow_over_http(self):
        url = '/api/auth/register'
        body = {'username': 'wangwu', 'display_name': '王五', 'password': PASSWORD,
                'phone': '13800138000'}
        # 审批通道未配置：fail-closed，不产生申请
        before = set(map(tuple, self.store.db.execute('SELECT * FROM users')))
        self.assertEqual((await self.client.post(url, json=body, headers={'Origin': self.origin})).status, 503)
        self.assertEqual(set(map(tuple, self.store.db.execute('SELECT * FROM users'))), before)
        self.assertEqual(self.store.list_registrations(), [])
        self.assertEqual(self.store.outbox_backlog()['pending'], 0)
        self.client.server.app['dingtalk'] = {'stub': True}
        # 来源校验与字段校验
        self.assertEqual((await self.client.post(url, json=body)).status, 403)
        self.assertEqual((await self.client.post(url, json={'username': 'a'}, headers={'Origin': self.origin})).status, 400)
        self.assertEqual((await self.client.post(
            url, json={**body, 'password': 'short'},
            headers={'Origin': self.origin})).status, 400)
        # 提交成功 → 201，待审账号不能登录
        response = await self.client.post(url, json=body, headers={'Origin': self.origin})
        self.assertEqual(response.status, 201)
        result = await response.json()
        self.assertEqual(result['status'], 'pending')
        denied = await self.client.post('/api/auth/login', json={'username': 'wangwu', 'password': PASSWORD}, headers={'Origin': self.origin})
        self.assertEqual(denied.status, 403)
        self.assertIn('审批中', (await denied.json())['error'])
        # 重复提交与大写同名在独立用例中验证（避免触碰 IP 限流）
        # 审批通过后可登录；管理员可见申请与姓名
        card = self.store.registration_card_data(result['request_id'])
        self.store.decide_registration(card['out_track_id'], 'approved', 'corp', '431661')
        ok = await self.client.post('/api/auth/login', json={'username': 'wangwu', 'password': PASSWORD}, headers={'Origin': self.origin})
        self.assertEqual(ok.status, 200)
        self.assertEqual((await ok.json())['user']['phone'], '13800138000')
        admin = await self.login()
        registrations = await self.client.get('/api/admin/registrations',
                                              headers={'Origin': self.origin})
        self.assertEqual(registrations.status, 200)
        payload = await registrations.json()
        self.assertEqual(payload['requests'][0]['display_name'], '王五')
        self.assertEqual(payload['requests'][0]['status'], 'approved')
        self.assertNotIn('phone', payload['requests'][0])
        self.assertNotIn('13800138000', str(payload['requests']))
        # 测试内没有发件箱 worker：send + update 两条任务保持待投递状态
        self.assertEqual(payload['outbox']['pending'], 2)
        self.client.server.app['dingtalk'] = None

    async def test_register_missing_and_invalid_phone_leave_no_records_or_phone_loss(self):
        self.client.server.app['dingtalk'] = {'stub': True}
        session = self.store.login('user', PASSWORD)
        self.store.set_phone(self.uid, '13800138000', session_token=session['token'])
        body = {'username': 'new-registration', 'display_name': '新人', 'password': PASSWORD}
        before = {table: set(map(tuple, self.store.db.execute(f'SELECT * FROM {table}')))
                  for table in ('users', 'registration_requests', 'notification_outbox')}
        for invalid in [body] + [{**body, 'phone': phone} for phone in INVALID_PHONES]:
            with self.subTest(body=invalid):
                # 每个输入校验场景独立计数；注册限流另有专门测试，不在此处掩盖 400。
                self.client.server.app['_auth_register_limits'].clear()
                response = await self.client.post('/api/auth/register', json=invalid,
                                                  headers={'Origin': self.origin})
                self.assertEqual(response.status, 400, await response.text())
                for table, rows in before.items():
                    self.assertEqual(set(map(tuple, self.store.db.execute(f'SELECT * FROM {table}'))),
                                     rows, table)
                self.assertEqual(self.store.get_user(self.uid)['phone'], '13800138000')
        self.client.server.app['_auth_register_limits'].clear()
        response = await self.client.post('/api/auth/register', json={
            **body, 'phone': ' \t13800138000\r\n'}, headers={'Origin': self.origin})
        self.assertEqual(response.status, 201, await response.text())
        self.assertEqual((await response.json())['status'], 'pending')
        user = next(user for user in self.store.list_users() if user['username'] == body['username'])
        self.assertEqual(user['phone'], '13800138000')
        self.assertEqual(len(self.store.list_registrations()), 1)
        self.assertEqual(self.store.outbox_backlog()['pending'], 1)
        self.assertEqual(self.store.get_user(self.uid)['phone'], '13800138000')
        self.client.server.app['dingtalk'] = None

    async def test_eight_character_password_policy_over_http(self):
        self.client.server.app['dingtalk'] = {'stub': True}
        session = await self.login()
        headers = {'Origin': self.origin, 'X-CSRF-Token': session['csrf_token']}
        for value, expected in (('12345678', 400), ('riverpad', 201)):
            response = await self.client.post('/api/auth/register', json={
                'username': 'new-registration', 'display_name': '新人', 'password': value,
                'phone': '13800138000',
            }, headers=headers)
            self.assertEqual(response.status, expected)
            response = await self.client.post('/api/admin/users', json={
                'username': 'new-user', 'password': value, 'role': 'user',
            }, headers=headers)
            self.assertEqual(response.status, expected)
        for value, expected in (('Password', 400), ('58294716', 200)):
            response = await self.client.post(f'/api/admin/users/{self.uid}/password',
                                              json={'password': value}, headers=headers)
            self.assertEqual(response.status, expected)
        for value, expected in (('11111111', 400), ('mountain', 200)):
            response = await self.client.post('/api/auth/password', json={
                'current_password': PASSWORD, 'new_password': value,
            }, headers=headers)
            self.assertEqual(response.status, expected)
        self.assertEqual((await self.client.get('/api/auth/me')).status, 401)
        response = await self.client.post('/api/auth/login', json={
            'username': 'admin', 'password': 'mountain',
        }, headers={'Origin': self.origin})
        self.assertEqual(response.status, 200)

    async def test_register_duplicate_and_casefold(self):
        self.client.server.app['dingtalk'] = {'stub': True}
        url = '/api/auth/register'
        body = {'username': 'wangwu', 'display_name': '王五', 'password': PASSWORD,
                'phone': '13800138000'}
        self.assertEqual((await self.client.post(url, json=body, headers={'Origin': self.origin})).status, 201)
        before = {table: set(map(tuple, self.store.db.execute(f'SELECT * FROM {table}')))
                  for table in ('users', 'registration_requests', 'notification_outbox')}
        body['phone'] = '13900139000'
        self.assertEqual((await self.client.post(url, json=body, headers={'Origin': self.origin})).status, 409)
        # 大小写不同视为同名，同样冲突，失败提交不得覆盖原号码或新增任务。
        self.assertEqual((await self.client.post(url, json={**body, 'username': 'WANGWU'}, headers={'Origin': self.origin})).status, 409)
        for table, rows in before.items():
            self.assertEqual(set(map(tuple, self.store.db.execute(f'SELECT * FROM {table}'))), rows, table)
        user = next(user for user in self.store.list_users() if user['username'] == 'wangwu')
        self.assertEqual(user['phone'], '13800138000')
        self.client.server.app['dingtalk'] = None

    async def test_register_rate_limit(self):
        self.client.server.app['dingtalk'] = {'stub': True}
        body = {'username': 'spam', 'display_name': '刷', 'password': PASSWORD,
                'phone': '13800138000'}
        statuses = []
        for _ in range(6):
            response = await self.client.post('/api/auth/register', json=body,
                                              headers={'Origin': self.origin})
            statuses.append(response.status)
        self.assertIn(201, statuses)
        self.assertIn(429, statuses)
        self.client.server.app['dingtalk'] = None


if __name__ == '__main__':
    unittest.main()
