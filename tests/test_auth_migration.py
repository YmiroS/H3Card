import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from server.auth_admin import main
from server.auth_store import AuthStore
from server.resource_access import ResourceAccess


def build_legacy_tree(root: Path):
    """构造一份带正常数据、墓碑、未知任务和未知文件的历史目录。"""
    projects = root / 'data' / 'projects'
    projects.mkdir(parents=True)
    uploads = root / 'data' / 'uploads'
    uploads.mkdir(parents=True)
    artifacts = root / 'data' / 'artifacts' / 'oldjob'
    artifacts.mkdir(parents=True)

    (projects / 'demo.json').write_text(json.dumps({
        'id': 'demo', 'name': '示例', 'rev': 3, 'locked': True, 'cards': [],
        'edges': [], 'view': {}, 'created': 1, 'updated': 2,
    }), encoding='utf-8')
    (projects / 'work.json').write_text(json.dumps({
        'id': 'work', 'name': '工作画布', 'rev': 7,
        'cards': [
            {'id': 'c1', 'cap': 'x', 'assets': {'image': 'chouka/a.png'},
             'outputs': [{'url': '/api/upload/a.png', 'filename': 'a.png',
                          'subfolder': 'chouka', 'type': 'input'}],
             'history': [{'outputs': [{'url': '/api/artifact/oldjob/out.mp4'}]}]},
        ],
        'edges': [], 'view': {},
    }), encoding='utf-8')
    (projects / 'gone.json.deleted').write_text(json.dumps({'id': 'gone'}), encoding='utf-8')
    (uploads / 'a.png').write_bytes(b'image')
    (uploads / 'stray.png').write_bytes(b'stray')
    (artifacts / 'out.mp4').write_bytes(b'video')
    (root / 'data' / 'jobs.json').write_text(json.dumps([
        {'id': 'job1', 'status': 'done', 'project': 'work', 'outputs': []},
        {'id': 'job2', 'status': 'done', 'project': 'ghost'},
    ]), encoding='utf-8')


class MigrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        build_legacy_tree(self.root)
        self.db = self.root / 'data' / 'auth.db'
        with patch('getpass.getpass', return_value='Admin-password-123'):
            self.assertEqual(main(['init', '--root', str(self.root)]), 0)
        self.store = AuthStore(self.db)

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def test_init_rejects_second_admin_and_bad_password(self):
        with patch('getpass.getpass', return_value='Admin-password-123'):
            self.assertEqual(main(['init', '--root', str(self.root)]), 1)
        with patch('getpass.getpass', side_effect=['short', 'short']):
            self.assertEqual(main(['init', '--root', str(self.root), '--database',
                                   str(self.root / 'data' / 'fresh.db')]), 1)

    def test_dry_run_writes_nothing(self):
        self.assertFalse(self.store.is_ready())
        report = json.loads(run_capture(self, ['migrate', '--dry-run', '--owner', 'admin']))
        self.assertEqual(len(report['projects']), 3)      # 两个有效画布加一个墓碑
        self.assertTrue(any(item['project_id'] == 'gone' for item in report['projects']))
        self.assertFalse(self.store.is_ready())
        self.assertIsNone(self.store.get_project('work'))
        access = ResourceAccess(self.store, self.root)
        self.assertFalse(access.authorize(
            self.store.list_users()[0]['id'], 'upload', 'a.png'))

    def test_apply_assigns_first_admin_and_marks_ready(self):
        report = json.loads(run_capture(self, ['migrate', '--apply', '--owner', 'admin']))
        self.assertEqual(report['missing'], [])
        self.assertEqual(report['errors'], [])
        self.assertTrue(self.store.is_ready())
        admin = next(u for u in self.store.list_users() if u['role'] == 'admin')
        bob = self.store.create_user('bob', 'Bob-password-1234')['id']
        self.assertEqual(self.store.get_project('work')['owner_id'], admin['id'])
        self.assertEqual(self.store.get_project('work')['state'], 'active')
        self.assertEqual(self.store.get_project('gone')['state'], 'deleted')
        self.assertEqual(self.store.get_project('demo')['owner_id'], admin['id'])
        self.assertEqual(self.store.get_job('job1')['project_id'], 'work')
        access = ResourceAccess(self.store, self.root)
        self.assertTrue(access.authorize(admin['id'], 'upload', 'a.png'))
        self.assertTrue(access.authorize(admin['id'], 'artifact', 'oldjob/out.mp4'))
        self.assertTrue(access.is_legacy_job('job2'))     # 未知任务仅管理员可读
        # 迁移期已存在的无主文件按 legacy 处理：管理员可读，普通账号不可见。
        self.assertTrue(access.authorize(admin['id'], 'upload', 'stray.png'))
        self.assertFalse(access.authorize(bob, 'upload', 'stray.png'))
        self.assertFalse(access.authorize(bob, 'upload', 'a.png'))

    def test_apply_blocks_ready_on_missing_and_is_idempotent(self):
        (self.root / 'data' / 'uploads' / 'a.png').unlink()
        code, report = run(self, ['migrate', '--apply', '--owner', 'admin'])
        self.assertEqual(code, 1)
        self.assertTrue(report['missing'])
        self.assertFalse(self.store.is_ready())
        (self.root / 'data' / 'uploads' / 'a.png').write_bytes(b'image')
        code, report = run(self, ['migrate', '--apply', '--owner', 'admin'])
        self.assertEqual(code, 0)
        self.assertTrue(self.store.is_ready())
        # 重跑不覆盖归属、不复活墓碑。
        code, report = run(self, ['migrate', '--apply', '--owner', 'admin'])
        self.assertEqual(code, 0)
        self.assertEqual(self.store.get_project('gone')['state'], 'deleted')
        self.assertEqual(self.store.list_project_jobs('work'), ['job1'])
        self.assertTrue(self.store.is_ready())

    def test_owner_must_be_first_admin(self):
        with patch('server.auth_store.AuthStore.create_user') as create:
            create.return_value = {'id': 'x', 'username': 'other', 'role': 'user', 'enabled': True}
            self.store.create_user('other', 'Other-password-123')
        self.assertEqual(main(['migrate', '--dry-run', '--owner', 'other',
                               '--root', str(self.root)]), 1)


def run_capture(test, argv):
    """兼容旧调用：报告必须干净（退出码 0）。"""
    code, report = run(test, argv)
    test.assertEqual(code, 0)
    return json.dumps(report, ensure_ascii=False)


def run(test, argv):
    """main 打印 JSON 报告；捕获 stdout 并返回 (退出码, 报告)。"""
    import contextlib
    import io
    buffer = io.StringIO()
    with contextlib.redirect_stdout(buffer):
        code = main(argv + ['--root', str(test.root)])
    return code, json.loads(buffer.getvalue())


if __name__ == '__main__':
    unittest.main()
