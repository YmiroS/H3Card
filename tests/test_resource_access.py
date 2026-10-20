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

    def test_global_grants_read_bound_personal_and_team_resources_and_revoke_immediately(self):
        team = self.store.create_team('资源团队', self.admin)
        self.store.create_project('team', self.admin, team_id=team['id'])
        comfy = {'filename': 'result.png', 'subfolder': 'team', 'type': 'output'}
        refs = [('upload', 'source.png', 'a'),
                ('artifact', 'job/result.mp4', 'a'), ('comfy', comfy, 'team')]
        for kind, locator, pid in refs[1:]:
            self.access.register(pid, kind, locator)
        for permission in ('read', 'operate'):
            self.store.set_global_grant(self.b, permission)
            for kind, locator, pid in refs:
                with self.subTest(permission=permission, kind=kind):
                    self.assertTrue(self.access.authorize(self.b, kind, locator))
                    self.assertTrue(self.access.authorize(self.b, kind, locator, project_id=pid))
                    self.assertFalse(self.access.authorize(self.b, kind, locator, project_id='b'))
            self.store.delete_global_grant(self.b)
            for kind, locator, pid in refs:
                self.assertFalse(self.access.authorize(self.b, kind, locator))
                self.assertFalse(self.access.authorize(self.b, kind, locator, project_id=pid))
        self.assertEqual(self.store.list_teams(self.b), [])
        self.assertEqual((self.uploads / 'source.png').read_bytes(), b'original')

    def test_global_resource_access_covers_future_owner_and_team_and_preserves_owner_grants(self):
        self.store.set_global_grant(self.b, 'read')
        future = self.store.create_user('future', 'Future-password-123', team_leader=True)['id']
        team = self.store.create_team('未来资源团队', future)
        self.store.create_project('future-personal', future)
        self.store.create_project('future-team', future, team_id=team['id'])
        self.access.register('future-personal', 'upload', 'future-personal.png')
        self.access.register('future-team', 'upload', 'future-team.png')
        for name in ('source.png', 'future-personal.png', 'future-team.png'):
            self.assertTrue(self.access.authorize(self.b, 'upload', name))
        self.store.set_grant(self.b, self.a, 'read')
        self.store.delete_global_grant(self.b)
        self.assertTrue(self.access.authorize(self.b, 'upload', 'source.png'))
        for name in ('future-personal.png', 'future-team.png'):
            self.assertFalse(self.access.authorize(self.b, 'upload', name))
        self.store.delete_grant(self.b, self.a)
        self.assertFalse(self.access.authorize(self.b, 'upload', 'source.png'))

    def test_global_grants_do_not_unlock_unbound_legacy_unknown_or_pending_resources(self):
        self.access.register(None, 'upload', 'legacy.png', legacy=True)
        self.access.register(None, 'upload', 'unbound.png')
        self.access.register(None, 'upload', 'legacy-pending.png', legacy=True, state='pending')
        self.access.register('a', 'upload', 'pending.png', state='pending')
        self.access.register('a', 'upload', 'bound-legacy.png', legacy=True)
        for permission in ('read', 'operate'):
            self.store.set_global_grant(self.b, permission)
            self.store.set_global_grant(self.admin, permission)
            self.assertTrue(self.access.authorize(self.admin, 'upload', 'legacy.png'))
            self.assertFalse(self.access.authorize(self.b, 'upload', 'legacy.png'))
            self.assertFalse(self.access.authorize(self.admin, 'upload', 'legacy.png', project_id='a'))
            for name in ('unbound.png', 'unknown.png', 'legacy-pending.png', 'pending.png'):
                for user in (self.b, self.admin):
                    with self.subTest(permission=permission, resource=name, user=user):
                        self.assertFalse(self.access.authorize(user, 'upload', name))
            self.assertTrue(self.access.authorize(self.b, 'upload', 'bound-legacy.png'))
        self.store.set_project_state('a', 'deleted')
        for user in (self.b, self.admin):
            self.assertFalse(self.access.authorize(user, 'upload', 'bound-legacy.png'))

    def test_global_resource_access_rechecks_account_and_canvas_state(self):
        for permission in ('read', 'operate'):
            self.store.set_global_grant(self.b, permission)
            self.assertTrue(self.access.authorize(self.b, 'upload', 'source.png'))
            self.store.set_user(self.b, enabled=False)
            self.assertFalse(self.access.authorize(self.b, 'upload', 'source.png'))
            self.store.set_user(self.b, enabled=True)
            for status in ('pending', 'rejected', 'approved'):
                with self.store.db:
                    self.store.db.execute('UPDATE users SET approval_status=? WHERE id=?', (status, self.b))
                self.assertEqual(self.access.authorize(self.b, 'upload', 'source.png'), status == 'approved')
            for state in ('pending', 'deleted', 'active'):
                self.store.set_project_state('a', state)
                self.assertEqual(self.access.authorize(self.b, 'upload', 'source.png'), state == 'active')

    def test_global_read_copy_is_independent_but_does_not_allow_forged_binding(self):
        self.store.set_global_grant(self.b, 'read')
        doc = {'assets': {'image': 'chouka/source.png'}}
        with self.assertRaises(PermissionError):
            self.access.validate_document(self.b, 'b', doc)
        with self.assertRaises(PermissionError):
            self.access.register('b', 'upload', 'source.png')
        copied = self.access.copy_document(self.b, 'a', 'b', doc)
        self.assertNotEqual(copied, doc)
        self.store.delete_global_grant(self.b)
        self.assertFalse(self.access.authorize(self.b, 'upload', 'source.png'))
        self.assertTrue(self.access.validate_document(self.b, 'b', copied))
        copied_name = copied['assets']['image'][7:]
        self.assertTrue(self.access.authorize(self.b, 'upload', copied_name))
        self.assertFalse(self.access.authorize(self.a, 'upload', copied_name))
        self.assertEqual((self.uploads / copied_name).read_bytes(), b'original')

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

    def test_copy_card_bundle_reuses_one_independent_resource_for_material_and_slots(self):
        self.store.set_grant(self.b, self.a, 'read')
        media = {'kind': 'image', 'url': '/api/upload/source.png', 'ref': 'chouka/source.png'}
        card = {
            'id': 'generator', 'assets': {'images[0]': media, 'images[1]': media},
            'references': {
                'cards': [{'id': 'material', 'type': 'card_asset', 'outputs': [media]}],
                'edges': [{'from': 'material', 'to': 'generator', 'slot': 'images[0]',
                           'slots': ['images[0]', 'images[1]']}],
            },
        }
        copied = self.access.copy_document(self.b, 'a', 'b', card)
        material = copied['references']['cards'][0]['outputs'][0]
        self.assertNotEqual(material['url'], media['url'])
        self.assertEqual(material, copied['assets']['images[0]'])
        self.assertEqual(material, copied['assets']['images[1]'])
        self.assertEqual(copied['references']['edges'], card['references']['edges'])
        self.assertEqual(self.store.db.execute('SELECT COUNT(*) FROM resources').fetchone()[0], 2)
        self.store.delete_grant(self.b, self.a)
        self.assertTrue(self.access.validate_document(self.b, 'b', copied))
        self.assertEqual((self.uploads / material['ref'][7:]).read_bytes(), b'original')
        self.assertEqual(card['assets']['images[0]'], media)

    def test_copy_batch_reuses_resources_across_selected_cards(self):
        self.store.set_grant(self.b, self.a, 'read')
        media = {'kind': 'image', 'url': '/api/upload/source.png', 'ref': 'chouka/source.png'}
        bundle = {'cards': [
            {'id': 'material', 'outputs': [media]},
            {'id': 'first', 'assets': {'image': media}},
            {'id': 'second', 'assets': {'image': media}, 'references': {
                'cards': [{'id': 'material', 'outputs': [media]}],
                'edges': [{'from': 'material', 'to': 'second', 'slot': 'image'}],
            }},
        ]}
        copied = self.access.copy_document(self.b, 'a', 'b', bundle)
        material, first, second = copied['cards']
        self.assertNotEqual(material['outputs'][0]['url'], media['url'])
        self.assertEqual(material['outputs'][0], first['assets']['image'])
        self.assertEqual(material['outputs'][0], second['assets']['image'])
        self.assertEqual(material['outputs'][0], second['references']['cards'][0]['outputs'][0])
        self.assertEqual(self.store.db.execute('SELECT COUNT(*) FROM resources').fetchone()[0], 2)
        self.store.delete_grant(self.b, self.a)
        self.assertTrue(self.access.validate_document(self.b, 'b', copied))

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
