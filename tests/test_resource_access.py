import json
from pathlib import Path
import tempfile
import unittest

from server.auth_store import AuthStore
from server.resource_access import ResourceAccess


class ResourceAccessTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.store = AuthStore(self.root / 'auth.db')
        self.admin = self.store.create_user('admin', 'Admin-password-123', role='admin')['id']
        self.a = self.store.create_user('alice', 'Alice-password-123')['id']
        self.b = self.store.create_user('bob', 'Bob-password-123')['id']
        self.store.create_project('a', self.a)
        self.store.create_project('b', self.b)
        self.access = ResourceAccess(self.store, self.root)
        self.uploads = self.root / 'data' / 'uploads'
        self.uploads.mkdir(parents=True)
        (self.uploads / 'source.png').write_bytes(b'original')
        self.resource = self.access.register('a', 'upload', 'source.png')

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def test_current_grants_and_deleted_project(self):
        self.assertFalse(self.access.authorize(self.b, 'upload', 'source.png'))
        self.store.set_grant(self.b, self.a, 'read')
        self.assertTrue(self.access.authorize(self.b, 'upload', 'source.png'))
        self.store.delete_grant(self.b, self.a)
        self.assertFalse(self.access.authorize(self.b, 'upload', 'source.png'))
        self.store.set_project_state('a', 'deleted')
        self.assertFalse(self.access.authorize(self.admin, 'upload', 'source.png'))

    def test_assignment_moves_resource_access_not_files(self):
        self.store.assign_projects([{'project_id': 'a', 'owner_id': self.a}], self.b)
        self.assertFalse(self.access.authorize(self.a, 'upload', 'source.png'))
        self.assertTrue(self.access.authorize(self.b, 'upload', 'source.png'))
        self.assertEqual((self.uploads / 'source.png').read_bytes(), b'original')

    def test_unknown_legacy_and_unknown_new(self):
        self.access.register(None, 'upload', 'legacy.png', legacy=True)
        self.assertTrue(self.access.authorize(self.admin, 'upload', 'legacy.png'))
        self.assertFalse(self.access.authorize(self.a, 'upload', 'legacy.png'))
        self.assertFalse(self.access.authorize(self.admin, 'upload', 'new.png'))
        self.access.register('a', 'upload', 'pending.png', state='pending')
        self.assertFalse(self.access.authorize(self.admin, 'upload', 'pending.png'))
        self.assertEqual(len(self.access.audit()['pending']), 1)

    def test_forged_save_cannot_bind_even_readable_resource(self):
        self.store.set_grant(self.b, self.a, 'read')
        doc = {'assets': {'image': 'chouka/source.png'}}
        with self.assertRaises(PermissionError):
            self.access.validate_document(self.b, 'b', doc)
        with self.assertRaises(PermissionError):
            self.access.register('b', 'upload', 'source.png')
        self.assertTrue(self.access.validate_document(self.a, 'a', doc))
        with self.assertRaises(ValueError):
            self.access.validate_document(self.a, 'a', {'history': [{'outputs': [{'url': 'https://evil.test/a.png'}]}]})
        self.assertTrue(self.access.validate_document(self.a, 'a', {'params': {'prompt': 'https://example.test/../说明.png'}}))

    def test_copy_independent_and_structure_preserved(self):
        card = {'id': 'card', 'data': {'assets': {'image': 'chouka/source.png'}, 'outputs': [{'url': '/api/upload/source.png', 'filename': 'source.png', 'type': 'input', 'subfolder': 'chouka'}]}, 'params': {'prompt': '不应变化'}}
        with self.assertRaises(PermissionError):
            self.access.copy_document(self.b, 'a', 'b', card)
        self.store.set_grant(self.b, self.a, 'read')
        result = self.access.copy_document(self.b, 'a', 'b', card)
        self.assertEqual(result['params'], card['params'])
        self.assertNotEqual(result['data']['assets'], card['data']['assets'])
        self.assertEqual(result['data']['outputs'][0]['url'], '/api/upload/' + result['data']['outputs'][0]['filename'])
        self.store.delete_grant(self.b, self.a)
        self.assertTrue(self.access.validate_document(self.b, 'b', result))
        name = result['data']['assets']['image'][7:]
        self.assertEqual((self.uploads / name).read_bytes(), b'original')
        with self.assertRaises(PermissionError):
            self.access.copy_document(self.a, 'a', 'b', card)

    def test_input_index_survives_job_display_pruning(self):
        self.store.register_job('job1', 'a', self.a)
        self.access.register_job_inputs('job1', {'image': 'chouka/source.png'})
        self.assertTrue(self.access.job_input_allowed('job1', 'source.png'))
        self.assertFalse(self.access.job_input_allowed('job1', 'other.png'))
        self.access.register('a', 'upload', 'converted.mp4', parent_id=self.resource['resource_id'])
        self.access.register_job_inputs('job1', ['chouka/converted.mp4'])
        self.assertTrue(self.access.job_input_allowed('job1', 'converted.mp4'))
        self.store.close()
        self.store = AuthStore(self.root / 'auth.db')
        self.access = ResourceAccess(self.store, self.root)
        self.assertTrue(self.access.job_input_allowed('job1', 'source.png'))
        self.store.set_project_state('a', 'deleted')
        self.assertFalse(self.access.job_input_allowed('job1', 'source.png'))

    def test_traversal_and_comfy_full_locator(self):
        for value in ('../secret', '/secret', 'a/b', '%2e%2e', 'a\\b'):
            with self.assertRaises(ValueError):
                self.access.register('a', 'upload', value)
        for url in ('/api/file?filename=x&filename=y', '/api/file?filename=x&subfolder=../x', '//evil/x'):
            with self.assertRaises(ValueError):
                self.access.reference(url)
        one = dict(filename='x.png', subfolder='a', type='output')
        two = dict(filename='x.png', subfolder='b', type='output')
        self.access.register('a', 'comfy', one)
        self.assertTrue(self.access.authorize(self.a, 'comfy', one))
        self.assertFalse(self.access.authorize(self.a, 'comfy', two))
        self.assertTrue(self.access.validate_document(self.a, 'a', {'outputs': [one]}))
        self.store.set_grant(self.b, self.a, 'read')
        with self.assertRaisesRegex(ValueError, '异步复制'):
            self.access.copy_document(self.b, 'a', 'b', {'outputs': [one]})


if __name__ == '__main__':
    unittest.main()
