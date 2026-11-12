"""Skill API regressions with real sessions/CSRF and isolated JSON persistence."""
import concurrent.futures
import io
import json
import stat
import struct
import sys
import tempfile
import unittest
import zipfile
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
                 'description': '供创作使用的简介', 'instruction': '仅在载入后提供的完整指南',
                 'triggers': [], 'autoOutputs': [], 'recommendedModelIds': [], 'references': {},
                 'referenceTriggers': {}, 'enabled': True}, **changes)


def legacy_payload(**changes):
    return {key: value for key, value in skill_payload(**changes).items() if key in skills.CORE_FIELDS}


def zip_bytes(files, compression=zipfile.ZIP_DEFLATED):
    target = io.BytesIO()
    with zipfile.ZipFile(target, 'w', compression=compression) as archive:
        for name, body in files:
            archive.writestr(name, body)
    return target.getvalue()


ZIP_MAIN = '---\nname: Imported Guide\ndescription: 完整导入指南\nid: imported-guide\ntriggers: [图片, H3]\n---\n# 正文\n全部保留\n'


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
        self.assertEqual(await response.json(), {'builtins': skills.BUILTINS, 'skills': skills.BUILTIN_DEFAULTS})
        self.assertFalse(self.path.exists(), 'Listing an empty store must not create it')
        response = await self.publish()
        self.assertEqual(await response.json(), {'ok': True})
        updated = skill_payload(name='更新后的名称', instruction='更新后的完整指南')
        await self.publish(updated)
        listing = await (await self.client.get(ADMIN_URL)).json()
        self.assertEqual(listing['skills'], [*skills.BUILTIN_DEFAULTS, updated], 'Publish replaces, rather than duplicates, an ID')
        response = await self.client.delete(ADMIN_URL + '/custom-guide', headers=self.headers)
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {'ok': True})
        self.assertEqual((await (await self.client.get(ADMIN_URL)).json())['skills'],
                         [*skills.BUILTIN_DEFAULTS, dict(updated, enabled=False)])
        self.assertEqual((await self.client.delete(
            ADMIN_URL + '/custom-guide', headers=self.headers)).status, 200)
        self.assertEqual((await self.client.delete(
            ADMIN_URL + '/missing-guide', headers=self.headers)).status, 409)

    async def test_model_recommendations_publish_status_restart_revoke_restore(self):
        proposed = skill_payload(recommendedModelIds=[' second ', 'first', 'Model', 'model', 'é', 'e\u0301'])
        expected = skill_payload(recommendedModelIds=['second', 'first', 'Model', 'model', 'é', 'e\u0301'])
        await self.publish(proposed)
        self.assertEqual(skills.SkillStore(self.path).load('custom-guide'), expected)
        self.assertEqual(json.loads(self.path.read_bytes()), {'version': 2, 'skills': [expected]})
        listing = await (await self.client.get(ADMIN_URL)).json()
        self.assertEqual(listing['skills'][-1], expected)
        status = await (await self.client.get(STATUS_URL + '?projectId=admin-project')).json()
        self.assertEqual(status['skills'][-1]['recommendedModelIds'], expected['recommendedModelIds'])
        loaded = await (await self.client.get(LOAD_URL + 'custom-guide?projectId=admin-project')).json()
        self.assertEqual(loaded, expected)
        self.assertEqual((await self.client.delete(ADMIN_URL + '/custom-guide', headers=self.headers)).status, 200)
        self.assertEqual(skills.SkillStore(self.path).list()[-1], dict(expected, enabled=False))
        await self.publish(expected)
        self.assertEqual(skills.SkillStore(self.path).load('custom-guide'), expected)

    async def test_execution_summary_round_trip_without_metadata_or_old_data_changes(self):
        approved = {'text': ' 已核对摘要 ', 'sourceFingerprint': 'fnv1a64:0123456789abcdef', 'reviewed': True}
        await self.publish(skill_payload(executionSummary=approved))
        stored = skill_payload(executionSummary=dict(approved, text='已核对摘要'))
        self.assertEqual(skills.SkillStore(self.path).load('custom-guide'), stored)
        self.assertEqual((await (await self.client.get(ADMIN_URL)).json())['skills'][-1], stored)
        self.assertNotIn('executionSummary', skills.metadata(stored))
        self.assertEqual((await (await self.client.get(
            LOAD_URL + 'custom-guide?projectId=admin-project')).json()), stored)
        self.assertEqual(json.loads(self.path.read_bytes())['skills'], [stored])
        await self.publish(skill_payload())
        self.assertNotIn('executionSummary', skills.SkillStore(self.path).load('custom-guide'))

    async def test_invalid_execution_summary_rejected_without_rewriting_store(self):
        await self.publish()
        before = self.path.read_bytes()
        valid = {'text': '摘要', 'sourceFingerprint': 'fnv1a64:0123456789abcdef', 'reviewed': False}
        bad = [None, [], {}, dict(valid, extra='x'), dict(valid, text=' '),
               dict(valid, text='😀' * 4001), dict(valid, text=1),
               dict(valid, sourceFingerprint='fnv1a64:ABCDEF0123456789'),
               dict(valid, sourceFingerprint='fnv1a64:1234'),
               dict(valid, reviewed=1), dict(valid, reviewed='true')]
        for value in bad:
            with self.subTest(value=repr(value)[:70]):
                await self.publish(skill_payload(executionSummary=value), expected=400)
                self.assertEqual(self.path.read_bytes(), before)

    async def test_invalid_model_recommendations_fail_without_writing(self):
        await self.publish()
        before = self.path.read_bytes()
        invalid = ['model', [1], [''], [' \ufeff '], ['x' * 201], ['\0'], ['a\nb'],
                   ['a\u200b'], [' one ', 'one'], [f'm{i}' for i in range(17)],
                   ['😀' * 201]]
        for models in invalid:
            with self.subTest(models=repr(models)[:90]):
                await self.publish(skill_payload(recommendedModelIds=models), expected=400)
                self.assertEqual(self.path.read_bytes(), before)
        await self.publish(skill_payload(recommendedModelIds=['x' * 200, '😀' * 200]))
        self.assertEqual(skills.SkillStore(self.path).load('custom-guide')['recommendedModelIds'],
                         ['x' * 200, '😀' * 200])

    async def test_ecmascript_whitespace_cannot_poison_shared_schema(self):
        for field in ('name', 'description', 'instruction'):
            for whitespace in ('\ufeff', '\u2000\ufeff\u2029'):
                with self.subTest(field=field, whitespace=repr(whitespace)):
                    await self.publish(skill_payload(**{field: whitespace}), expected=400)
        await self.publish(skill_payload(triggers=['\ufeff']), expected=400)
        self.assertFalse(self.path.exists())
        guide = '\ufeff  完整指南保留原文  \ufeff'
        await self.publish(skill_payload(name='\ufeff名称\ufeff', instruction=guide))
        loaded = await (await self.client.get(
            LOAD_URL + 'custom-guide?projectId=admin-project')).json()
        self.assertEqual(loaded['name'], '名称')
        self.assertEqual(loaded['instruction'], guide)

    async def test_custom_skill_persists_across_store_recreation_and_revoke(self):
        await self.publish()
        recreated = skills.SkillStore(self.path)
        self.assertEqual(recreated.list(), [*skills.BUILTIN_DEFAULTS, skill_payload()])
        self.assertEqual(recreated.load('custom-guide'), skill_payload())
        document = json.loads(self.path.read_bytes())
        self.assertEqual(document, {'version': 2, 'skills': [skill_payload()]})
        recreated.revoke('custom-guide')
        self.assertEqual(skills.SkillStore(self.path).list(),
                         [*skills.BUILTIN_DEFAULTS, skill_payload(enabled=False)])
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
        self.assertEqual(status['skills'], [skills.metadata(item) for item in
                         [*skills.BUILTIN_DEFAULTS, skill_payload()]])
        self.assertTrue(all(set(item) == set(skills.METADATA_FIELDS) for item in status['skills']))
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
        self.assertEqual(status['skills'], [skills.metadata(item) for item in skills.BUILTIN_DEFAULTS])

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

    async def test_unauthenticated_requests_are_401_for_all_read_and_mutation_routes(self):
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

    async def test_all_builtins_edit_persist_revoke_and_reenable(self):
        self.assertEqual(len(skills.BUILTIN_IDS), 8)
        for original in skills.BUILTIN_DEFAULTS:
            key = original['id']
            with self.subTest(builtin=key):
                url = LOAD_URL + key + '?projectId=admin-project'
                self.assertEqual(await (await self.client.get(url)).json(), original)
                updated = dict(original, name='可编辑内置名称', description='可编辑简介',
                               instruction='  完整指南\n', triggers=['literal.*', '新关键词'],
                               references={'references/edit.txt': '  全文\n'},
                               referenceTriggers={'references/edit.txt': ['新关键词']})
                await self.publish(updated)
                self.assertEqual(skills.SkillStore(self.path).load(key), updated)
                self.assertEqual(await (await self.client.get(url)).json(), updated)
                response = await self.client.delete(ADMIN_URL + '/' + key, headers=self.headers)
                self.assertEqual(response.status, 200)
                self.assertEqual((await self.client.get(url)).status, 404)
                listing = (await (await self.client.get(ADMIN_URL)).json())['skills']
                self.assertIn(dict(updated, enabled=False), listing)
                status = await (await self.client.get(STATUS_URL + '?projectId=admin-project')).json()
                self.assertNotIn(key, [item['id'] for item in status['skills']])
                await self.publish(dict(updated, enabled=False))
                self.assertEqual((await self.client.get(url)).status, 404)
                await self.publish(updated)
                self.assertEqual(await (await self.client.get(url)).json(), updated)

    async def test_invalid_payload_shapes_types_and_fields_are_400(self):
        invalid = [[], 'text', 1, True, {}, dict(skill_payload(), extra='forbidden')]
        for key in skills.CORE_FIELDS:
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

    async def test_utf16_limits_and_verbatim_guide_unicode_round_trip(self):
        await self.publish(skill_payload(id='ab'))
        await self.publish(skill_payload(id='a' * 64))
        # Supplementary-plane characters occupy two UTF-16 code units, as in the JS UI.
        for field, limit in (('name', 200), ('description', 2000), ('instruction', 128000)):
            for character, units in (('中', 1), ('\U0001d11e', 2)):
                boundary = character * (limit // units)
                with self.subTest(field=field, units=units):
                    await self.publish(skill_payload(**{field: boundary}))
                    self.assertEqual(skills.SkillStore(self.path).load('custom-guide')[field], boundary)
                    before = self.path.read_bytes()
                    await self.publish(skill_payload(**{field: boundary + 'x'}), expected=400)
                    self.assertEqual(self.path.read_bytes(), before)
        await self.publish(skill_payload(name=' 名称 ', instruction=' \n正文\t '))
        self.assertEqual(skills.SkillStore(self.path).load('custom-guide')['name'], '名称')
        self.assertEqual(skills.SkillStore(self.path).load('custom-guide')['instruction'], ' \n正文\t ')

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
        self.assertEqual((await response.json())['skills'], [*skills.BUILTIN_DEFAULTS, skill_payload()])

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
        valid = legacy_payload()
        documents = [
            [], {'version': True, 'skills': []}, {'version': 3, 'skills': []},
            {'version': 1, 'skills': {}}, {'version': 1, 'skills': [], 'extra': 1},
            {'version': 1, 'skills': [valid, valid]},
            {'version': 1, 'skills': [legacy_payload(id=next(iter(skills.BUILTIN_IDS)))]},
            {'version': 1, 'skills': [legacy_payload(instruction='')]},
            {'version': 2, 'skills': [skill_payload(), skill_payload()]},
            {'version': 2, 'skills': [skill_payload(references={'A.md': '', 'a.MD': ''})]},
            {'version': 2, 'skills': [skill_payload(referenceTriggers={'missing.md': []})]},
            {'version': 2, 'skills': [skill_payload(recommendedModelIds=[' one ', 'one'])]},
            {'version': 2, 'skills': [skill_payload(recommendedModelIds=['a\u200b'])]},
            {'version': 2, 'skills': [skill_payload(recommendedModelIds=[f'm{i}' for i in range(17)])]},
            {'version': 1, 'skills': [skill_payload()]},

        ]
        corruptions = [b'{broken json', b'\xff', b'', b'[' * 10000 + b'0' + b']' * 10000,
                       b'{"version":2,"skills":[],"skills":[]}']
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
            self.assertEqual(json.loads(Path(source).read_bytes()), {'version': 2, 'skills': [updated]})
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
        self.assertEqual(skills.SkillStore(self.path).list(), [*skills.BUILTIN_DEFAULTS, skill_payload()])

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
            # Revoked entries remain tombstones and still count toward storage limits.
            await self.publish(skill_payload(id='third-guide'), expected=409)
            self.assertEqual({item['id'] for item in skills.SkillStore(self.path).list()},
                             skills.BUILTIN_IDS | {'custom-guide', 'second-guide'})
            self.assertEqual((await self.client.get(
                LOAD_URL + 'second-guide?projectId=admin-project')).status, 404)
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


    async def test_zip_preview_root_folder_bom_reuse_and_confirm_only_writes(self):
        for prefix, bom in (('', ''), ('one-folder/', '\ufeff')):
            raw = zip_bytes([(prefix + 'SKILL.md', bom + ZIP_MAIN),
                             (prefix + 'references/guide.yaml', '  key: value\n')])
            response = await self.client.post(ADMIN_URL + '/import-zip', data=raw,
                headers=dict(self.headers, **{'Content-Type': 'application/zip'}))
            self.assertEqual(response.status, 200, await response.text())
            preview = await response.json()
            self.assertEqual(preview['files'], ['SKILL.md', 'references/guide.yaml'])
            self.assertEqual(preview['skill'], skill_payload(id='imported-guide', name='Imported Guide',
                description='完整导入指南', instruction=ZIP_MAIN, triggers=['图片', 'H3'],
                references={'references/guide.yaml': '  key: value\n'}))
            self.assertFalse(self.path.exists())
        await self.publish(preview['skill'])
        before = self.path.read_bytes()
        revised = ZIP_MAIN.replace('Imported Guide', 'Updated Guide').replace('全部保留', '完整第二版')
        response = await self.client.post(ADMIN_URL + '/import-zip', data=zip_bytes([('SKILL.md', revised)]),
            headers=dict(self.headers, **{'Content-Type': 'application/zip'}))
        self.assertEqual(response.status, 200)
        updated = (await response.json())['skill']
        self.assertEqual(self.path.read_bytes(), before, 'Reusing an ID is only a preview, not an overwrite')
        await self.publish(updated)
        self.assertEqual(skills.SkillStore(self.path).load('imported-guide'), updated)
        self.assertEqual(len([item for item in skills.SkillStore(self.path).list() if item['id'] == 'imported-guide']), 1)

    async def test_zip_admin_csrf_and_body_security_leaves_store_unchanged(self):
        await self.publish()
        before = self.path.read_bytes()
        url = ADMIN_URL + '/import-zip'
        raw = zip_bytes([('SKILL.md', ZIP_MAIN)])
        for token in (None, '', 'invalid-token'):
            headers = {'Origin': self.origin, 'Content-Type': 'application/zip'}
            if token is not None:
                headers['X-CSRF-Token'] = token
            self.assertEqual((await self.client.post(url, data=raw, headers=headers)).status, 403)
        for body, mime, expected in ((b'bad zip', 'application/zip', 400),
                (raw, 'application/json', 400), (b'x' * (skills.MAX_REQUEST_BYTES + 1), 'application/zip', 413)):
            response = await self.client.post(url, data=body,
                headers=dict(self.headers, **{'Content-Type': mime}))
            self.assertEqual(response.status, expected, await response.text())
        self.auth.create_user('zip-reader', auth_support.PASSWORD)
        self.headers = await self.login('zip-reader')
        response = await self.client.post(url, data=raw,
            headers=dict(self.headers, **{'Content-Type': 'application/zip'}))
        self.assertEqual(response.status, 403)
        self.client.session.cookie_jar.clear()
        self.assertEqual((await self.client.post(url, data=raw, headers=self.headers)).status, 401)
        self.assertEqual(self.path.read_bytes(), before)
        self.assertEqual(list(self.path.parent.glob('.skills-*.tmp')), [])

    async def test_duplicate_json_keys_rejected_without_changes(self):
        await self.publish()
        before = self.path.read_bytes()
        body = json.dumps(skill_payload()).replace('"references": {}',
            '"references": {"same.md":"a", "same.md":"b"}')
        response = await self.client.post(ADMIN_URL, data=body.encode(),
            headers=dict(self.headers, **{'Content-Type': 'application/json'}))
        self.assertEqual(response.status, 400, await response.text())
        self.assertEqual(self.path.read_bytes(), before)

    async def test_zip_chunked_body_limit_is_413(self):
        async def chunks():
            for _ in range(skills.MAX_REQUEST_BYTES // 65536 + 1):
                yield b'x' * 65536
        response = await self.client.post(ADMIN_URL + '/import-zip', data=chunks(),
            headers=dict(self.headers, **{'Content-Type': 'application/zip'}))
        self.assertEqual(response.status, 413, await response.text())
        self.assertFalse(self.path.exists())

    async def test_v2_invalid_fields_fail_closed_for_all_store_operations(self):
        self.path.write_text(json.dumps({'version': 2, 'skills': [skill_payload(enabled='false')]}), encoding='utf-8')
        before = self.path.read_bytes()
        with self.assertLogs(skills.LOG, level='ERROR'):
            await self.publish(expected=503)
            self.assertEqual((await self.client.get(ADMIN_URL)).status, 503)
        self.assertEqual(self.path.read_bytes(), before)


class SkillContractTest(unittest.TestCase):
    def test_defaults_generator_preserves_registration_and_synchronizes_snapshots(self):
        from server.creation_agent.generate_defaults import generate, SNAPSHOT
        expected = json.loads(SNAPSHOT.read_text(encoding='utf-8'))
        formatted = json.dumps(expected, ensure_ascii=False, indent=2) + '\n'
        with mock.patch('pathlib.Path.write_text', autospec=True) as writes, mock.patch(
                'server.creation_agent.generate_defaults.subprocess.run',
                return_value=mock.Mock(stdout=formatted)) as formatter:
            generate()
        self.assertEqual(json.loads(formatter.call_args.kwargs['input']), expected)
        self.assertTrue(formatter.call_args.kwargs['check'])
        self.assertNotIn('shell', formatter.call_args.kwargs)
        self.assertEqual(writes.call_count, 2)
        for call in writes.call_args_list:
            self.assertEqual(json.loads(call.args[1]), expected)
        self.assertEqual({call.args[0] for call in writes.call_args_list}, {
            SNAPSHOT, ROOT / 'frontend/server/creationAgent/builtin_defaults.json'})

    def test_packaged_defaults_include_exact_full_allowlisted_documents(self):
        import re
        source = ROOT / 'frontend/server/creationAgent/skills'
        manifest = (ROOT / 'frontend/src/modules/creationAgent/domain/skillPackages.ts').read_text(encoding='utf-8')
        files = {
            'image-creation': ['instructions.txt'],
            'h3-prompt-writing': ['SKILL.md', 'references/base-en.txt', 'references/ref-en.txt'],
            'gpt-manju-image-optimization': ['SKILL.md', 'references/workflow.md', 'references/prompt-templates.md'],
        }
        for key, block in re.findall(r"id: '([^']+)'[\s\S]*?files: \[([\s\S]*?)\]", manifest):
            files[key] = re.findall(r"'([^']+)'", block)
        self.assertEqual(len(skills.BUILTIN_DEFAULTS), 8)
        for original, skill in zip(skills.BUILTINS, skills.BUILTIN_DEFAULTS):
            self.assertEqual({key: skill[key] for key in ('id', 'name', 'description')}, original)
            main = 'instructions.txt' if skill['id'] == 'image-creation' else 'SKILL.md'
            self.assertEqual(set(skill['references']), set(files[skill['id']]) - {main})
            for filename in files[skill['id']]:
                body = skill['instruction'] if filename == main else skill['references'][filename]
                self.assertEqual(body, (source / skill['id'] / filename).read_bytes().decode('utf-8'))
        env = next(item for item in skills.BUILTIN_DEFAULTS if item['id'] == 'cg-environment-art-director')
        self.assertEqual(len(env['referenceTriggers']), 20)
        self.assertEqual(set(env['references']) - set(env['referenceTriggers']), {
            'references/design-decisions.md', 'references/theme-to-prompt.md',
            'references/scene-state-consistency.md', 'references/spatial-causality.md'})
        self.assertEqual(skills.matching_references(env, ''),
                         {path: body for path, body in env['references'].items() if path not in env['referenceTriggers']})

    def test_literal_or_output_matching_and_reference_rules(self):
        entry = skills.validate_skill(skill_payload(triggers=['H3', 'literal.*', '[x]'],
            autoOutputs=['image'], references={'always.md': 'a', 'never.txt': '', 'topic.yml': 'c'},
            referenceTriggers={'never.txt': [], 'topic.yml': ['TOD', '夜晚']}))
        for text, output, expected in [('h3 test', None, True), ('literalZZ', None, False),
                ('xx literal.* yy', None, True), ('X', None, False), ('', 'image', True), ('', 'video', False)]:
            self.assertEqual(skills.matches_skill(entry, text, output), expected)
        self.assertEqual(skills.matching_references(entry, ''), {'always.md': 'a'})
        self.assertEqual(skills.matching_references(entry, 'today'), {'always.md': 'a', 'topic.yml': 'c'})
        self.assertFalse(skills.matches_skill(dict(entry, enabled=False), 'H3', 'image'))

    def test_optional_defaults_v1_migration_read_only_and_v2_on_write(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'skills.json'
            store = skills.SkillStore(path)
            self.assertEqual(store.list(), skills.BUILTIN_DEFAULTS)
            self.assertFalse(path.exists())
            self.assertEqual(skills.validate_skill(legacy_payload()), skill_payload())
            raw = json.dumps({'version': 1, 'skills': [legacy_payload()]}).encode()
            path.write_bytes(raw)
            self.assertEqual(store.load('custom-guide'), skill_payload())
            store.list()
            self.assertEqual(path.read_bytes(), raw)
            store.publish(skill_payload(name='迁移后'))
            self.assertEqual(json.loads(path.read_bytes()), {'version': 2, 'skills': [skill_payload(name='迁移后')]})
            store.revoke('custom-guide')
            self.assertEqual(skills.SkillStore(path).list()[-1], skill_payload(name='迁移后', enabled=False))

    def test_recommended_model_metadata_is_copied_and_old_entries_default_empty(self):
        self.assertTrue(all(item['recommendedModelIds'] == [] for item in skills.BUILTIN_DEFAULTS))
        legacy = skills.validate_skill(legacy_payload())
        self.assertEqual(legacy['recommendedModelIds'], [])
        item = skills.validate_skill(skill_payload(recommendedModelIds=[' first ', 'second']))
        visible = skills.metadata(item)
        visible['recommendedModelIds'].append('changed')
        self.assertEqual(item['recommendedModelIds'], ['first', 'second'])
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'skills.json'
            path.write_text(json.dumps({'version': 2, 'skills': [legacy_payload()]}), encoding='utf-8')
            self.assertEqual(skills.SkillStore(path).load('custom-guide')['recommendedModelIds'], [])
            path.write_text(json.dumps({'version': 1, 'skills': [legacy_payload()]}), encoding='utf-8')
            self.assertEqual(skills.SkillStore(path).load('custom-guide')['recommendedModelIds'], [])

    def test_reference_paths_keyword_types_and_utf16_limits(self):
        invalid = [
            {'triggers': 'word'}, {'triggers': ['']}, {'triggers': [' ']}, {'triggers': [False]},
            {'triggers': ['a'] * 65}, {'triggers': ['x' * 81]}, {'triggers': ['\U0001d11e' * 41]},
            {'triggers': ['\ud800']}, {'autoOutputs': ['audio']}, {'autoOutputs': 'image'},
            {'autoOutputs': ['image', 'image']}, {'autoOutputs': [{}]}, {'enabled': 1},
            {'references': []}, {'references': {'good.md': False}},
            {'references': {f'{i}.txt': 'x' for i in range(129)}},
            {'references': {'A.md': 'a', 'a.MD': 'b'}},
            {'references': {'é.md': 'a', 'e\u0301.md': 'b'}},
            {'references': {'good.txt': '\ud800'}}, {'references': {'good.txt': '\0'}},
            {'referenceTriggers': []}, {'referenceTriggers': {'missing.md': ['a']}},
            {'references': {'a.md': ''}, 'referenceTriggers': {'a.md': [1]}},
            {'references': {'a.md': ''}, 'referenceTriggers': {'a.md': ['a'] * 65}},
        ]
        for path in ('/a.md', 'C:/a.md', 'a\\b.md', '../a.md', './a.md', 'a/../b.md',
                     'a//b.md', 'a/./b.md', 'a/\n.md', 'a/\x7f.md', 'a/\u200b.md',
                     'a.py', 'a.zip', 'a.json', 'a./b.md', 'a /b.md', 'a' * 158 + '.md'):
            invalid.append({'references': {path: 'x'}})
        for change in invalid:
            with self.subTest(change=repr(change)[:200]), self.assertRaises(skills.SkillError):
                skills.validate_skill(skill_payload(**change))
        for char in ('中', '\U0001d11e'):
            boundary = char * (128000 // (2 if char == '\U0001d11e' else 1))
            self.assertEqual(skills.validate_skill(skill_payload(references={'a.md': boundary}))['references']['a.md'], boundary)
            with self.assertRaises(skills.SkillError):
                skills.validate_skill(skill_payload(references={'a.md': boundary + 'x'}))
        accepted = skill_payload(instruction='x' * 128000, references={
            'a.md': 'x' * 128000, 'b.md': 'x' * 128000, 'c.md': 'x' * 128000, 'd.md': 'x' * 88000})
        skills.validate_skill(accepted)
        accepted['references']['d.md'] += 'x'
        with self.assertRaises(skills.SkillError):
            skills.validate_skill(accepted)
        self.assertEqual(len(skills.validate_skill(skill_payload(triggers=['\U0001d11e' * 40] * 64))['triggers']), 64)
        self.assertEqual(len(skills.validate_skill(skill_payload(references={f'{i}.txt': '' for i in range(128)}))['references']), 128)
        skills.validate_skill(skill_payload(references={'a' * 157 + '.md': ''}))

    def test_thread_lock_preserves_all_concurrent_publications(self):
        with tempfile.TemporaryDirectory() as folder:
            store = skills.SkillStore(Path(folder) / 'skills.json')
            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
                list(pool.map(lambda i: store.publish(skill_payload(id=f'guide-{i}')), range(30)))
            self.assertEqual(len(store.list()), len(skills.BUILTIN_DEFAULTS) + 30)


class ZipImportTest(unittest.TestCase):
    def preview(self, files, **options):
        from server.creation_agent.zip_import import preview_zip
        return preview_zip(zip_bytes(files, **options))

    def test_id_derivation_alias_and_directory_entries(self):
        body = '---\nname: derived-name\ndescription: Description\ntrigger_keywords: [h3]\n---\nBody\n'
        result = self.preview([('SKILL.md', body), ('references/', ''), ('references/中文.txt', '\ufeff内容\n')])
        self.assertEqual(result['skill']['id'], 'derived-name')
        self.assertEqual(result['skill']['triggers'], ['h3'])
        self.assertEqual(result['skill']['references'], {'references/中文.txt': '内容\n'})
        self.assertEqual(result['skill']['instruction'], body)
        body = body.replace('derived-name', '中文名称')
        self.assertEqual(self.preview([('folder-name/SKILL.md', body)])['skill']['id'], 'folder-name')
        with self.assertRaisesRegex(skills.SkillError, '添加 id'):
            self.preview([('SKILL.md', body)])

    def test_unsafe_archive_paths_nontext_ambiguous_layout_and_types(self):
        for path in ('../escape.txt', '/absolute.txt', 'C:/drive.md', 'C:drive.md',
                     'a/../evil.txt', 'a/./evil.txt', 'a//evil.txt',
                     'newline\n.txt', 'nul\0.txt', 'program.py', 'nested.zip', 'image.png',
                     '__MACOSX/._SKILL.md', '.DS_Store', 'a./escape.txt'):
            with self.subTest(path=path), self.assertRaises(skills.SkillError):
                self.preview([('SKILL.md', ZIP_MAIN), (path, 'bad')])
        for files in ([('folder/SKILL.md', ZIP_MAIN), ('other/ref.txt', '')],
                      [('folder/SKILL.md', ZIP_MAIN), ('loose.txt', '')],
                      [('skill.md', ZIP_MAIN)], [('SKILL.md', ZIP_MAIN), ('skill.MD', ZIP_MAIN)],
                      [('SKILL.md', ZIP_MAIN), ('é.md', ''), ('e\u0301.md', '')],
                      [('SKILL.md', b'\xff')], [('references/a.md', '')], []):
            with self.subTest(files=str(files)[:100]), self.assertRaises(skills.SkillError):
                self.preview(files)
        link = zipfile.ZipInfo('references/link.md')
        link.create_system = 3
        link.external_attr = (stat.S_IFLNK | 0o777) << 16
        with self.assertRaisesRegex(skills.SkillError, '符号链接'):
            self.preview([('SKILL.md', ZIP_MAIN), (link, '../../outside')])
        for compression in (zipfile.ZIP_BZIP2, zipfile.ZIP_LZMA):
            with self.subTest(compression=compression), self.assertRaises(skills.SkillError):
                self.preview([('SKILL.md', ZIP_MAIN)], compression=compression)

    def test_yaml_simple_schema_safe_types_alias_depth_and_node_budgets(self):
        invalid = [
            'no frontmatter', '---\nname: missing end', '---\n- list\n---\nbody',
            '---\nname: 42\ndescription: x\nid: valid-id\n---',
            '---\nname: x\ndescription: x\nid: INVALID\n---',
            '---\nname: x\ndescription: x\nid: valid-id\ntriggers: text\n---',
            '---\nname: x\ndescription: x\nid: valid-id\ntriggers: [1]\n---',
            '---\nname: x\ndescription: x\nid: valid-id\ntriggers: []\ntrigger_keywords: []\n---',
            '---\nname: x\nname: duplicate\ndescription: x\nid: valid-id\n---',
            '---\nname: &name x\ndescription: *name\nid: valid-id\n---',
            '---\nname: !!python/object/apply:os.system [anything]\ndescription: x\n---',
            '---\nname: {nested: object}\ndescription: x\n---',
            '---\nname: [' + '[' * 10000 + '0' + ']' * 10000 + ']\n---',
            '---\nname: x\ndescription: x\nid: valid-id\ntriggers: [' + ','.join(['a'] * 3000) + ']\n---',
        ]
        for body in invalid:
            with self.subTest(body=body[:120]), self.assertRaises(skills.SkillError):
                self.preview([('SKILL.md', body)])

    def test_archive_size_count_ratio_and_document_text_budgets(self):
        from server.creation_agent import zip_import
        cases = [
            ([('SKILL.md', ZIP_MAIN), ('large.txt', 'x' * (512 * 1024 + 1))], zipfile.ZIP_STORED),
            ([('SKILL.md', ZIP_MAIN), ('long.txt', 'x' * 128001)], zipfile.ZIP_STORED),
            ([('SKILL.md', ZIP_MAIN), ('bomb.txt', 'x' * 110000)], zipfile.ZIP_DEFLATED),
            ([('SKILL.md', ZIP_MAIN), *[(f'{i}.txt', '') for i in range(128)]], zipfile.ZIP_STORED),
            ([('SKILL.md', ZIP_MAIN), *[(f'{i}.txt', 'x' * 100000) for i in range(22)]], zipfile.ZIP_STORED),
            ([('SKILL.md', ZIP_MAIN), *[(f'{i}/', '') for i in range(513)]], zipfile.ZIP_STORED),
        ]
        for files, compression in cases:
            with self.subTest(case=files[-1][0]), self.assertRaises(skills.SkillError):
                self.preview(files, compression=compression)
        with self.assertRaises(skills.SkillError):
            zip_import.preview_zip(b'x' * (zip_import.MAX_ZIP_BYTES + 1))
        # A highly compressible file <=100 KiB is permitted; UTF-16 validation still applies.
        self.assertEqual(len(self.preview([('SKILL.md', ZIP_MAIN), ('small.txt', 'x' * 100000)])['skill']['references']['small.txt']), 100000)

    def test_malformed_crc_truncated_encrypted_and_bounded_actual_reads(self):
        from server.creation_agent.zip_import import preview_zip
        # On Windows the ZIP writer itself normalizes backslashes; mutate header names directly.
        backslash = zip_bytes([('SKILL.md', ZIP_MAIN), ('folder/evil.txt', 'bad')]).replace(
            b'folder/evil.txt', b'folder\\evil.txt')
        with self.assertRaises(skills.SkillError):
            preview_zip(backslash)
        raw = zip_bytes([('SKILL.md', ZIP_MAIN)], compression=zipfile.ZIP_STORED)
        changed = bytearray(raw)
        changed[changed.index(b'---')] ^= 1
        encrypted = bytearray(raw)
        local = encrypted.index(b'PK\x03\x04')
        central = encrypted.index(b'PK\x01\x02')
        struct.pack_into('<H', encrypted, local + 6, 1)
        struct.pack_into('<H', encrypted, central + 8, 1)
        for body in (b'', b'not zip', raw[:-15], bytes(changed), bytes(encrypted)):
            with self.subTest(body=body[:30]), self.assertRaises(skills.SkillError):
                preview_zip(body)
        # Even if header metadata lies, reads cannot exceed the per-document budget.
        with mock.patch.object(zipfile.ZipFile, 'open', return_value=io.BytesIO(b'x' * (512 * 1024 + 1))):
            with self.assertRaises(skills.SkillError):
                preview_zip(raw)


if __name__ == '__main__':
    unittest.main()
