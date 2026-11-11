"""Skill API regressions with real sessions/CSRF and isolated JSON persistence."""
import json
import sys
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'tests'))

import auth_support
from server.creation_agent import skills

ADMIN_URL = '/api/creation-agent/admin/skills'
STATUS_URL = '/api/creation-agent/status'
LOAD_URL = '/api/creation-agent/skills/'


def skill_payload(**changes):
    return dict({'id': 'custom-guide', 'name': '自定义指南',
                 'description': '供创作使用的简介', 'instruction': '仅在载入后提供的完整指南'}, **changes)


class SkillRoutesTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def asyncSetUp(self):
        self.auth_setup()
        self.addCleanup(self.auth_teardown)
        # A developer's deployment environment must never redirect local fixture login.
        environment = mock.patch.dict('os.environ', {
            'CHOUKA_AUTH_ORIGIN': '', 'CHOUKA_HTTPS_REDIRECT_ORIGIN': '',
            'CHOUKA_HTTP_REDIRECT_ORIGIN': '', 'CHOUKA_TLS_CERT': '', 'CHOUKA_TLS_KEY': '',
        })
        environment.start()
        self.addCleanup(environment.stop)
        self.path = self.root / 'data' / 'creation-agent-skills.json'
        self.own_project('admin-project')
        app = self.build_app()
        skills.register_skill_routes(app, self.path)
        await self.start_client(app)
        self.addAsyncCleanup(self.client.close)
        # Send mutation headers explicitly so missing-CSRF tests really omit them.
        self.client.session.headers.clear()

    async def publish(self, payload=None, expected=200):
        response = await self.client.post(
            ADMIN_URL, json=skill_payload() if payload is None else payload, headers=self.headers)
        self.assertEqual(response.status, expected, await response.text())
        return response

    async def test_admin_list_publish_update_revoke(self):
        response = await self.client.get(ADMIN_URL)
        self.assertEqual(response.status, 200)
        self.assertEqual(await response.json(), {'builtins': skills.BUILTINS, 'skills': []})
        self.assertFalse(self.path.exists(), 'Listing an empty store must not create it')
        response = await self.publish()
        self.assertEqual(await response.json(), {'ok': True})
        updated = skill_payload(name='更新后的名称', instruction='更新后的完整指南')
        await self.publish(updated)
        listing = await (await self.client.get(ADMIN_URL)).json()
        self.assertEqual(listing['skills'], [updated], 'Publish replaces, rather than duplicates, an ID')
        response = await self.client.delete(ADMIN_URL + '/custom-guide', headers=self.headers)
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {'ok': True})
        self.assertEqual((await (await self.client.get(ADMIN_URL)).json())['skills'], [])
        self.assertEqual((await self.client.delete(
            ADMIN_URL + '/custom-guide', headers=self.headers)).status, 409)

    async def test_custom_skill_persists_across_store_recreation_and_revoke(self):
        await self.publish()
        recreated = skills.SkillStore(self.path)
        self.assertEqual(recreated.list(), [skill_payload()])
        self.assertEqual(recreated.load('custom-guide'), skill_payload())
        document = json.loads(self.path.read_bytes())
        self.assertEqual(document, {'version': 1, 'skills': [skill_payload()]})
        recreated.revoke('custom-guide')
        self.assertEqual(skills.SkillStore(self.path).list(), [])
        response = await self.client.get(LOAD_URL + 'custom-guide?projectId=admin-project')
        self.assertEqual(response.status, 404)

    async def test_status_metadata_load_update_and_revoke_for_project_owner(self):
        await self.publish()
        reader = self.auth.create_user('reader', auth_support.PASSWORD)
        self.own_project('reader-project', owner=reader)
        self.headers = await self.login('reader')
        response = await self.client.get(STATUS_URL, params={'projectId': 'reader-project'})
        self.assertEqual(response.status, 200, await response.text())
        status = await response.json()
        self.assertEqual({key: status[key] for key in ('available', 'reason', 'engine')},
                         {'available': True, 'reason': '', 'engine': 'chat-api'})
        self.assertEqual(status['skills'], [*skills.BUILTINS, {
            key: skill_payload()[key] for key in ('id', 'name', 'description')}])
        self.assertTrue(all(set(item) == {'id', 'name', 'description'} for item in status['skills']))
        load_url = LOAD_URL + 'custom-guide?projectId=reader-project'
        response = await self.client.get(load_url)
        self.assertEqual(response.status, 200)
        self.assertEqual(await response.json(), skill_payload())

        self.headers = await self.login()
        updated = skill_payload(instruction='发布的第二版指南')
        await self.publish(updated)
        self.headers = await self.login('reader')
        self.assertEqual(await (await self.client.get(load_url)).json(), updated)
        self.headers = await self.login()
        self.assertEqual((await self.client.delete(
            ADMIN_URL + '/custom-guide', headers=self.headers)).status, 200)
        self.headers = await self.login('reader')
        self.assertEqual((await self.client.get(load_url)).status, 404)
        status = await (await self.client.get(STATUS_URL + '?projectId=reader-project')).json()
        self.assertEqual(status['skills'], skills.BUILTINS)

    async def test_project_scope_is_checked_for_status_and_load(self):
        await self.publish()
        viewer = self.auth.create_user('viewer', auth_support.PASSWORD)
        self.own_project('viewer-project', owner=viewer)
        self.headers = await self.login('viewer')
        for endpoint in (STATUS_URL, LOAD_URL + 'custom-guide'):
            for project_id in ('admin-project', 'missing-project'):
                with self.subTest(endpoint=endpoint, project_id=project_id):
                    response = await self.client.get(endpoint, params={'projectId': project_id})
                    self.assertEqual(response.status, 404, await response.text())
            self.assertEqual((await self.client.get(endpoint, params={'projectId': ''})).status, 400)
            self.assertEqual((await self.client.get(endpoint)).status, 400)
            self.assertEqual((await self.client.get(
                endpoint, params={'projectId': 'viewer-project'})).status, 200)
        self.assertEqual((await self.client.get(
            LOAD_URL + 'missing-guide?projectId=viewer-project')).status, 404)
        # Read permission is sufficient, but revocation applies on the next request.
        self.auth.set_grant(viewer['id'], self.admin['id'], 'read')
        for endpoint in (STATUS_URL, LOAD_URL + 'custom-guide'):
            self.assertEqual((await self.client.get(
                endpoint, params={'projectId': 'admin-project'})).status, 200)
        self.auth.delete_grant(viewer['id'], self.admin['id'])
        for endpoint in (STATUS_URL, LOAD_URL + 'custom-guide'):
            self.assertEqual((await self.client.get(
                endpoint, params={'projectId': 'admin-project'})).status, 404)

    async def test_unauthenticated_requests_are_401_for_all_five_routes(self):
        self.client.session.cookie_jar.clear()
        for method, url, options in (
            ('GET', ADMIN_URL, {}),
            ('POST', ADMIN_URL, {'json': skill_payload()}),
            ('DELETE', ADMIN_URL + '/custom-guide', {}),
            ('GET', STATUS_URL + '?projectId=admin-project', {}),
            ('GET', LOAD_URL + 'custom-guide?projectId=admin-project', {}),
        ):
            with self.subTest(method=method, url=url):
                response = await self.client.request(method, url, headers=self.headers, **options)
                self.assertEqual(response.status, 401, await response.text())
        self.assertFalse(self.path.exists())

    async def test_non_admin_cannot_list_publish_or_revoke(self):
        await self.publish()
        before = self.path.read_bytes()
        self.auth.create_user('ordinary', auth_support.PASSWORD)
        self.headers = await self.login('ordinary')
        for method, url, options in (
            ('GET', ADMIN_URL, {}),
            ('POST', ADMIN_URL, {'json': skill_payload(instruction='不应写入')}),
            ('DELETE', ADMIN_URL + '/custom-guide', {}),
        ):
            with self.subTest(method=method):
                response = await self.client.request(method, url, headers=self.headers, **options)
                self.assertEqual(response.status, 403, await response.text())
        self.assertEqual(self.path.read_bytes(), before)

    async def test_missing_and_bad_csrf_prevent_publish_and_revoke(self):
        await self.publish()
        before = self.path.read_bytes()
        for csrf in (None, '', 'invalid-token'):
            headers = {'Origin': self.origin}
            if csrf is not None:
                headers['X-CSRF-Token'] = csrf
            for method, url, options in (
                ('POST', ADMIN_URL, {'json': skill_payload(instruction='不应写入')}),
                ('DELETE', ADMIN_URL + '/custom-guide', {}),
            ):
                with self.subTest(method=method, csrf=csrf):
                    response = await self.client.request(method, url, headers=headers, **options)
                    self.assertEqual(response.status, 403, await response.text())
                    self.assertEqual(self.path.read_bytes(), before)

    async def test_builtin_ids_are_protected_and_not_loaded_from_server(self):
        self.assertTrue(skills.BUILTIN_IDS)
        for key in sorted(skills.BUILTIN_IDS):
            with self.subTest(builtin=key):
                await self.publish(skill_payload(id=key), expected=409)
                response = await self.client.delete(ADMIN_URL + '/' + key, headers=self.headers)
                self.assertEqual(response.status, 409, await response.text())
                response = await self.client.get(LOAD_URL + key + '?projectId=admin-project')
                self.assertEqual(response.status, 404, 'Builtin instructions live only in the frontend bundle')
        self.assertFalse(self.path.exists())

    async def test_invalid_payload_shapes_types_and_fields_are_400(self):
        invalid = [[], 'text', 1, True, {}, dict(skill_payload(), extra='forbidden')]
        for key in skill_payload():
            missing = skill_payload()
            del missing[key]
            invalid.append(missing)
            invalid.extend(skill_payload(**{key: value}) for value in (None, False, 1, [], {}))
        for index, payload in enumerate(invalid):
            with self.subTest(case=index):
                await self.publish(payload, expected=400)
        response = await self.client.post(ADMIN_URL, data='null',
            headers=dict(self.headers, **{'Content-Type': 'application/json'}))
        self.assertEqual(response.status, 400)
        self.assertFalse(self.path.exists())

    async def test_invalid_ids_and_text_are_400_without_changing_store(self):
        await self.publish()
        before = self.path.read_bytes()
        for key in ('', 'a', 'a' * 65, 'Uppercase', '1start', '-start', 'has_space ',
                    'with_underscore', '../escape', 'a/b', 'a\\b', '中文', 'ab\n', 'ab\0'):
            with self.subTest(invalid_id=repr(key)):
                await self.publish(skill_payload(id=key), expected=400)
        for field in ('name', 'description', 'instruction'):
            for value in ('', ' \n\t ', '\ud800', '\udfff'):
                with self.subTest(field=field, value=repr(value)):
                    await self.publish(skill_payload(**{field: value}), expected=400)
        await self.publish(skill_payload(instruction='before\0after'), expected=400)
        for endpoint in (ADMIN_URL + '/Invalid-id', LOAD_URL + 'Invalid-id?projectId=admin-project'):
            method = 'DELETE' if endpoint.startswith(ADMIN_URL) else 'GET'
            response = await self.client.request(method, endpoint, headers=self.headers)
            self.assertEqual(response.status, 400, await response.text())
        self.assertEqual(self.path.read_bytes(), before)

    async def test_utf16_limits_and_trimmed_unicode_round_trip(self):
        await self.publish(skill_payload(id='ab'))
        await self.publish(skill_payload(id='a' * 64))
        # Supplementary-plane characters occupy two UTF-16 code units, as in the JS UI.
        for field, limit in (('name', 200), ('description', 2000), ('instruction', 32000)):
            for character, units in (('中', 1), ('\U0001d11e', 2)):
                boundary = character * (limit // units)
                with self.subTest(field=field, units=units):
                    payload = skill_payload(**{field: ' \n' + boundary + '\t '})
                    await self.publish(payload)
                    self.assertEqual(skills.SkillStore(self.path).load('custom-guide')[field], boundary)
                    before = self.path.read_bytes()
                    await self.publish(skill_payload(**{field: boundary + 'x'}), expected=400)
                    self.assertEqual(self.path.read_bytes(), before)

    async def test_non_json_malformed_json_and_invalid_encoding_are_400(self):
        for body, content_type in ((b'{}', 'text/plain'), (b'{', 'application/json'),
                                   (b'\xff', 'application/json'), (b'', 'application/json')):
            with self.subTest(body=body, content_type=content_type):
                response = await self.client.post(ADMIN_URL, data=body,
                    headers=dict(self.headers, **{'Content-Type': content_type}))
                self.assertEqual(response.status, 400, await response.text())
        self.assertFalse(self.path.exists())

    async def test_deeply_nested_json_is_400_without_changing_store(self):
        await self.publish()
        before = self.path.read_bytes()
        body = b'[' * 10000 + b'0' + b']' * 10000
        response = await self.client.post(ADMIN_URL, data=body,
            headers=dict(self.headers, **{'Content-Type': 'application/json'}))
        self.assertEqual(response.status, 400, await response.text())
        self.assertEqual(self.path.read_bytes(), before)
        response = await self.client.get(ADMIN_URL)
        self.assertEqual(response.status, 200)
        self.assertEqual((await response.json())['skills'], [skill_payload()])

    async def test_oversized_fixed_and_chunked_requests_are_413(self):
        await self.publish()
        before = self.path.read_bytes()
        oversized = b' ' * (skills.MAX_REQUEST_BYTES + 1)

        async def chunks():
            for offset in range(0, len(oversized), 16384):
                yield oversized[offset:offset + 16384]

        for streamed in (False, True):
            with self.subTest(chunked=streamed):
                response = await self.client.post(ADMIN_URL, data=chunks() if streamed else oversized,
                    headers=dict(self.headers, **{'Content-Type': 'application/json'}))
                self.assertEqual(response.status, 413, await response.text())
                self.assertEqual(self.path.read_bytes(), before)

    async def test_corrupt_stores_return_503_without_overwrite(self):
        valid = skill_payload()
        documents = [
            [], {'version': True, 'skills': []}, {'version': 2, 'skills': []},
            {'version': 1, 'skills': {}}, {'version': 1, 'skills': [], 'extra': 1},
            {'version': 1, 'skills': [valid, valid]},
            {'version': 1, 'skills': [skill_payload(id=next(iter(skills.BUILTIN_IDS)))]},
            {'version': 1, 'skills': [skill_payload(instruction='')]},
        ]
        corruptions = [b'{broken json', b'\xff', b'', b'[' * 10000 + b'0' + b']' * 10000]
        corruptions.extend(json.dumps(document).encode('utf-8') for document in documents)
        for index, contents in enumerate(corruptions):
            with self.subTest(case=index):
                self.path.write_bytes(contents)
                with self.assertLogs(skills.LOG, level='ERROR'):
                    for method, url, options in (
                        ('GET', ADMIN_URL, {}),
                        ('GET', STATUS_URL + '?projectId=admin-project', {}),
                        ('GET', LOAD_URL + 'custom-guide?projectId=admin-project', {}),
                        ('POST', ADMIN_URL, {'json': skill_payload()}),
                        ('DELETE', ADMIN_URL + '/custom-guide', {}),
                    ):
                        response = await self.client.request(method, url, headers=self.headers, **options)
                        self.assertEqual(response.status, 503, await response.text())
                        self.assertEqual(self.path.read_bytes(), contents)
                self.assertEqual(list(self.path.parent.glob('.skills-*.tmp')), [])

    async def test_failed_atomic_replace_preserves_original_and_cleans_temp_file(self):
        await self.publish()
        before = self.path.read_bytes()
        updated = skill_payload(instruction='替换失败时不得损坏原版')

        def fail_replace(source, destination):
            self.assertEqual(Path(source).parent, self.path.parent)
            self.assertEqual(Path(destination), self.path)
            self.assertEqual(json.loads(Path(source).read_bytes()), {'version': 1, 'skills': [updated]})
            self.assertEqual(self.path.read_bytes(), before)
            raise OSError('synthetic atomic replace failure')

        with mock.patch.object(skills.os, 'replace', side_effect=fail_replace) as replace, \
                self.assertLogs(skills.LOG, level='ERROR'):
            await self.publish(updated, expected=503)
            replace.assert_called_once()
        self.assertEqual(self.path.read_bytes(), before)
        self.assertEqual(list(self.path.parent.glob('.skills-*.tmp')), [])
        self.assertEqual(skills.SkillStore(self.path).load('custom-guide'), skill_payload())
        await self.publish(updated)
        self.assertEqual(skills.SkillStore(self.path).load('custom-guide'), updated)

    async def test_failed_flush_before_first_publish_leaves_no_store_or_temp(self):
        with mock.patch.object(skills.os, 'fsync', side_effect=OSError('synthetic fsync failure')), \
                self.assertLogs(skills.LOG, level='ERROR'):
            await self.publish(expected=503)
        self.assertFalse(self.path.exists())
        self.assertEqual(list(self.path.parent.glob('.skills-*.tmp')), [])
        await self.publish()
        self.assertEqual(skills.SkillStore(self.path).list(), [skill_payload()])

    async def test_count_limit_rejects_new_ids_but_allows_updates_and_revoke(self):
        with mock.patch.object(skills, 'MAX_SKILLS', 2):
            await self.publish()
            await self.publish(skill_payload(id='second-guide'))
            before = self.path.read_bytes()
            await self.publish(skill_payload(id='third-guide'), expected=409)
            self.assertEqual(self.path.read_bytes(), before)
            updated = skill_payload(instruction='数量满额仍能更新')
            await self.publish(updated)
            self.assertEqual(skills.SkillStore(self.path).load('custom-guide'), updated)
            self.assertEqual((await self.client.delete(
                ADMIN_URL + '/second-guide', headers=self.headers)).status, 200)
            await self.publish(skill_payload(id='third-guide'))
            self.assertEqual({item['id'] for item in skills.SkillStore(self.path).list()},
                             {'custom-guide', 'third-guide'})
        # A preexisting store above the configured count cap is not silently truncated.
        before = self.path.read_bytes()
        with mock.patch.object(skills, 'MAX_SKILLS', 1), self.assertLogs(skills.LOG, level='ERROR'):
            response = await self.client.get(ADMIN_URL)
            self.assertEqual(response.status, 503)
            await self.publish(expected=503)
        self.assertEqual(self.path.read_bytes(), before)

    async def test_store_byte_limit_rejects_write_and_oversized_existing_store(self):
        await self.publish()
        before = self.path.read_bytes()
        with mock.patch.object(skills, 'MAX_STORE_BYTES', len(before) + 10):
            await self.publish(skill_payload(instruction='中' * 1000), expected=409)
            self.assertEqual(self.path.read_bytes(), before)
            self.assertEqual((await self.client.get(ADMIN_URL)).status, 200)
        with mock.patch.object(skills, 'MAX_STORE_BYTES', len(before) - 1), \
                self.assertLogs(skills.LOG, level='ERROR'):
            for method, url, options in (
                ('GET', ADMIN_URL, {}),
                ('POST', ADMIN_URL, {'json': skill_payload()}),
                ('DELETE', ADMIN_URL + '/custom-guide', {}),
            ):
                response = await self.client.request(method, url, headers=self.headers, **options)
                self.assertEqual(response.status, 503, await response.text())
                self.assertEqual(self.path.read_bytes(), before)
        self.assertEqual(skills.SkillStore(self.path).load('custom-guide'), skill_payload())


if __name__ == '__main__':
    unittest.main()
