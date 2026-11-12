"""费用看板专项测试，仅使用临时 SQLite 与本机 HTTP。"""
import asyncio
import csv
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer, make_mocked_request
from server.auth import COOKIE, auth_middleware
from server.auth_store import AuthStore
from server.costs import CostLedger
from server import cost_dashboard as dashboard


class CostDashboardTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.pricing_path = self.root / 'pricing.json'
        self.pricing = {
            'version': 'test-v1', 'currency': 'CNY',
            'rates': {'electricity_per_gpu_hour': .6, 'full_per_gpu_hour': 5},
            'categories': {'image_generation': '图片生成', 'text': '文本', 'image': '图片 API'},
            'capabilities': {'local': {'category': 'image_generation', 'estimated_min': 1,
                                       'estimated_max': 3, 'retail_min': 4, 'retail_max': 6}},
            'api_rates': {'real-model': {'input_per_million_tokens': 2, 'output_per_million_tokens': 4}},
        }
        self.pricing_path.write_text(json.dumps(self.pricing), encoding='utf-8')
        self.ledger = CostLedger(self.root / 'control.db', self.pricing_path)
        self.addCleanup(self.ledger.close)
        self.store = AuthStore(self.root / 'auth.db')
        self.addCleanup(self.store.close)
        self.admin = self.store.create_user('admin', 'Test-password-123', role='admin')
        self.member = self.store.create_user('member', 'Test-password-123')
        self.store.set_ready()
        self.store.create_project('project', self.admin['id'])
        self.session = self.store.login('admin', 'Test-password-123')
        self.origin_patch = mock.patch.dict(os.environ, {'CHOUKA_AUTH_ORIGIN': ''})
        self.origin_patch.start()
        self.addCleanup(self.origin_patch.stop)
        application = web.Application(middlewares=[auth_middleware])
        application['costs'] = self.ledger
        application['auth_store'] = self.store
        dashboard.register_cost_dashboard_routes(application)
        self.client = TestClient(TestServer(application))
        await self.client.start_server()
        self.addAsyncCleanup(self.client.close)
        self.origin = str(self.client.make_url('/')).rstrip('/')
        self.headers = {'Origin': self.origin, 'X-CSRF-Token': self.session['csrf_token'],
                        'Cookie': COOKIE + '=' + self.session['token']}
        self.client.session.headers.update(self.headers)
        self.base = 1_700_000_000

    def local(self, job_id, *, created=None, status='done', owner=None, project='project',
              project_name='测试项目', runtime=3600):
        created = self.base if created is None else created
        job = {'id': job_id, 'capability': 'local', 'created': created, 'status': status,
               'project': project, 'projectName': project_name,
               'cardName': '本地任务', 'worker_id': 'worker-1'}
        if status in ('done', 'error', 'canceled') and runtime is not None:
            job.update(started=created, ended=created + runtime)
        self.ledger.record_job(job)
        if owner:
            self.store.register_job(job_id, 'project', owner['id'])
        return job

    def provider(self, job_id, *, amount=None, currency='CNY', model='real-model', usage=None,
                 user_id=None, event_kind='api', status='done', created=None):
        return self.ledger.record_provider_api(
            job_id=job_id, event_kind=event_kind, capability='api-capability', model=model,
            created_at=self.base if created is None else created, status=status,
            provider_billing=None if amount is None else {'amount': amount, 'currency': currency, 'field': 'usage.cost'},
            usage=usage, user_id=user_id, project_id='project', project_name='测试项目')

    async def get_dashboard(self, **query):
        response = await self.client.get('/api/costs/dashboard', params=query)
        self.assertEqual(response.status, 200, await response.text())
        return await response.json()

    async def test_all_summary_fields_and_independent_filters(self):
        self.local('local-done', owner=self.admin)
        self.local('local-error', status='error')
        self.local('local-running', status='running')
        self.provider('api', amount='2.50')
        self.provider('unknown', model='not-configured')
        result = await self.get_dashboard(detail_source='api', detail_status='unknown', trend_source='generation')
        self.assertEqual(result['overview']['tasks'], 5)
        self.assertEqual(result['overview']['total_cost'], 12.5)
        self.assertEqual(result['overview']['unknown_cost_tasks'], 2)
        self.assertEqual(result['overview']['gpu_hours'], 2)
        self.assertEqual(result['overview']['failed_waste'], 5)
        self.assertEqual(result['local']['tasks'], 3)
        self.assertEqual(result['cloud']['tasks'], 2)
        self.assertEqual(result['details'], {'count': 1, 'total_cost': 0, 'unknown': 1})
        self.assertEqual([item['job_id'] for item in result['jobs']], ['unknown'])
        for metric in (result['overview'], result['local'], result['cloud'],
                       *result['composition']['category'], *result['composition']['capability'],
                       *result['composition']['worker'], *result['trend'], *result['projects'],
                       *result['models'], *result['departments']['generation'], *result['departments']['api']):
            self.assertTrue(set(dashboard.METRIC_FIELDS).issubset(metric))
        self.assertEqual(sum(day['api_cost'] for day in result['trend']), 0)
        self.assertEqual(sum(group['tasks'] for group in result['models']), 2)
        self.assertEqual({'real-model', 'not-configured'}, {group['key'] for group in result['models']})

    async def test_identified_accounts_missing_runtime_and_project_department_totals(self):
        self.ledger.assign_department(self.admin['id'], 'production-1')
        self.local('identified-local', owner=self.admin)
        self.local('unknown-local', runtime=None)
        self.local('other-project', project='other', project_name='另一项目', runtime=None)
        self.provider('identified-api', amount='2.50', user_id=self.admin['id'])
        self.provider('unassigned-api', amount='1.25', user_id=self.member['id'])
        result = await self.get_dashboard(limit='1', detail_source='api',
                                          detail_q='identified-api', trend_source='generation')
        self.assertEqual(len(result['jobs']), 1)
        self.assertEqual(result['details']['count'], 1)
        self.assertEqual(result['overview']['tasks'], 5)
        self.assertEqual(result['overview']['identified_account_tasks'], 3)
        self.assertEqual(result['local']['identified_account_tasks'], 1)
        self.assertEqual(result['cloud']['identified_account_tasks'], 2)
        self.assertEqual(result['overview']['runtime_unknown_tasks'], 2)
        self.assertEqual(result['local']['runtime_unknown_tasks'], 2)
        self.assertEqual(result['cloud']['runtime_unknown_tasks'], 0)
        self.assertEqual(set(result['project_departments']), {'project', 'other'})
        by_department = {row['key']: row for row in result['project_departments']['project']}
        self.assertEqual(set(by_department), {'production-1', 'unassigned', 'unknown'})
        self.assertEqual(by_department['production-1']['tasks'], 2)
        self.assertEqual(by_department['production-1']['total_cost'], 7.5)
        self.assertEqual(by_department['unknown']['runtime_unknown_tasks'], 1)
        self.assertEqual(by_department['unassigned']['total_cost'], 1.25)
        for project in result['projects']:
            departments = result['project_departments'][project['key']]
            for field in dashboard.METRIC_FIELDS:
                self.assertAlmostEqual(sum(row[field] for row in departments), project[field], places=6)
        filtered = await self.get_dashboard(project='project', department='production-1', limit='1')
        self.assertEqual(set(filtered['project_departments']), {'project'})
        self.assertEqual([row['key'] for row in filtered['project_departments']['project']], ['production-1'])
        self.assertEqual(filtered['overview']['identified_account_tasks'], 2)
        self.assertEqual(filtered['overview']['runtime_unknown_tasks'], 0)

    async def test_over_2000_full_aggregation_and_same_timestamp_cursor(self):
        self.local('template', runtime=1)
        with self.ledger.lock, self.ledger.db:
            columns = [row[1] for row in self.ledger.db.execute('PRAGMA table_info(cost_events)')]
            template = dict(self.ledger.db.execute('SELECT * FROM cost_events').fetchone())
            template['total_cost_micros'] = 1_000_000
            template['runtime_seconds'] = 0
            values = []
            for index in range(2105):
                row = dict(template, job_id=f'job-{index:05}')
                values.append(tuple(row[column] for column in columns))
            self.ledger.db.executemany('INSERT INTO cost_events (' + ','.join(columns) + ') VALUES ('
                                       + ','.join('?' for _ in columns) + ')', values)
        submitter = self.store.job_submitters
        calls = []
        def checked(ids):
            calls.append(len(ids))
            self.assertLessEqual(len(ids), 500)
            return submitter(ids)
        seen = []
        with mock.patch.object(self.store, 'job_submitters', side_effect=checked):
            result = await self.get_dashboard(limit='100')
            self.assertEqual(result['overview']['tasks'], 2106)
            self.assertEqual(result['overview']['total_cost'], 2105.001389)
            self.assertEqual(result['details']['count'], 2106)
            first = result
            while True:
                seen.extend(item['job_id'] for item in result['jobs'])
                if not result['next_cursor']:
                    break
                result = await self.get_dashboard(limit='100', cursor=result['next_cursor'])
        self.assertEqual(len(seen), 2106)
        self.assertEqual(len(set(seen)), 2106)
        self.assertEqual(seen, sorted(seen, reverse=True))
        self.assertTrue(calls)
        changed = await self.client.get('/api/costs/dashboard', params={
            'limit': 100, 'cursor': first['next_cursor'], 'detail_source': 'api'})
        self.assertEqual(changed.status, 400)
        response = await self.client.get('/api/costs/dashboard/export')
        exported = list(csv.DictReader(io.StringIO((await response.text()).lstrip('\ufeff'))))
        self.assertEqual(len(exported), 2106)

    async def test_cursor_as_of_reused_and_future_insert_excluded(self):
        self.local('a')
        self.local('b')
        first = await self.get_dashboard(limit='1')
        self.local('future', created=first['as_of'] + 100)
        second = await self.get_dashboard(limit='1', cursor=first['next_cursor'])
        self.assertEqual(second['as_of'], first['as_of'])
        self.assertEqual(second['period'], first['period'])
        self.assertEqual([row['job_id'] for row in second['jobs']], ['a'])
        self.assertEqual(second['overview']['tasks'], 2)
        self.assertIsNone(second['next_cursor'])

    async def test_late_historical_same_timestamp_insert_does_not_change_cursor_selection(self):
        for job_id in ('z-original', 'm-original', 'a-original'):
            self.local(job_id)
        first = await self.get_dashboard(limit='1')
        self.assertEqual(first['jobs'][0]['job_id'], 'z-original')
        payload = dashboard._decode_cursor(self.ledger, first['next_cursor'])
        ceiling = payload['max_rowid']
        # 新入账分别落在下一页之前、之后和更早一天；业务时间均早于 as_of。
        self.local('y-late-same-time')
        self.local('b-late-same-time')
        self.local('older-late', created=self.base - 86400)
        with self.ledger.lock:
            latest = self.ledger.db.execute('SELECT MAX(rowid) FROM cost_events').fetchone()[0]
        self.assertGreater(latest, ceiling)
        seen = [first['jobs'][0]['job_id']]
        result = first
        while result['next_cursor']:
            payload = dashboard._decode_cursor(self.ledger, result['next_cursor'])
            self.assertEqual(payload['max_rowid'], ceiling)
            result = await self.get_dashboard(limit='1', cursor=result['next_cursor'])
            self.assertEqual(result['overview']['tasks'], 3)
            self.assertEqual(result['details']['count'], 3)
            seen.extend(item['job_id'] for item in result['jobs'])
        self.assertEqual(seen, ['z-original', 'm-original', 'a-original'])
        response = await self.client.get('/api/costs/dashboard/export', params={
            'limit': '1', 'cursor': first['next_cursor']})
        self.assertEqual(response.status, 200, await response.text())
        records = list(csv.DictReader(io.StringIO((await response.text()).lstrip('\ufeff'))))
        self.assertEqual([record['job_id'] for record in records], seen)
        fresh = await self.get_dashboard()
        self.assertEqual(fresh['overview']['tasks'], 6)

    async def test_single_page_export_cursor_excludes_late_historical_insert(self):
        self.local('original')
        query = {'limit': '10'}
        first = await self.get_dashboard(**query)
        self.assertIsNone(first['next_cursor'])
        self.assertIsInstance(first['export_cursor'], str)
        self.assertTrue(first['export_cursor'])
        payload = dashboard._decode_cursor(self.ledger, first['export_cursor'])
        self.assertEqual(payload['as_of'], first['as_of'])
        self.local('late-historical', created=self.base - 86400)
        response = await self.client.get('/api/costs/dashboard/export', params={
            **query, 'cursor': first['export_cursor']})
        self.assertEqual(response.status, 200, await response.text())
        records = list(csv.DictReader(io.StringIO((await response.text()).lstrip('\ufeff'))))
        self.assertEqual([record['job_id'] for record in records], ['original'])
        response = await self.client.get('/api/costs/dashboard/export', params=query)
        records = list(csv.DictReader(io.StringIO((await response.text()).lstrip('\ufeff'))))
        self.assertEqual({record['job_id'] for record in records}, {'original', 'late-historical'})
        self.assertEqual((await self.get_dashboard(**query))['details']['count'], 2)
        response = await self.client.get('/api/costs/dashboard/export', params={
            'limit': '11', 'cursor': first['export_cursor']})
        self.assertEqual(response.status, 400)

    async def test_full_single_page_and_final_page_always_have_export_cursor(self):
        for index in range(10):
            self.local(f'original-{index:02}')
        first = await self.get_dashboard(limit='10')
        self.assertIsNone(first['next_cursor'])
        self.assertEqual(len(first['jobs']), 10)
        self.assertIsInstance(first['export_cursor'], str)
        self.local('late-historical', created=self.base - 86400)
        response = await self.client.get('/api/costs/dashboard/export', params={
            'limit': '10', 'cursor': first['export_cursor']})
        self.assertEqual(response.status, 200, await response.text())
        records = list(csv.DictReader(io.StringIO((await response.text()).lstrip('\ufeff'))))
        self.assertEqual(len(records), 10)
        self.assertNotIn('late-historical', {record['job_id'] for record in records})
        fresh = await self.get_dashboard(limit='10')
        self.assertEqual(fresh['details']['count'], 11)
        self.assertIsNotNone(fresh['next_cursor'])
        self.assertEqual(fresh['export_cursor'], fresh['next_cursor'])
        final = await self.get_dashboard(limit='10', cursor=fresh['next_cursor'])
        self.assertIsNone(final['next_cursor'])
        self.assertEqual(len(final['jobs']), 1)
        self.assertIsInstance(final['export_cursor'], str)
        self.local('even-later-historical', created=self.base - 2 * 86400)
        response = await self.client.get('/api/costs/dashboard/export', params={
            'limit': '10', 'cursor': final['export_cursor']})
        self.assertEqual(response.status, 200, await response.text())
        records = list(csv.DictReader(io.StringIO((await response.text()).lstrip('\ufeff'))))
        self.assertEqual(len(records), 11)
        self.assertNotIn('even-later-historical', {record['job_id'] for record in records})

    async def test_empty_ledger_export_cursor_freezes_zero_rowid(self):
        first = await self.get_dashboard(limit='10')
        self.assertIsNone(first['next_cursor'])
        self.assertEqual(first['details']['count'], 0)
        self.assertIsInstance(first['export_cursor'], str)
        payload = dashboard._decode_cursor(self.ledger, first['export_cursor'])
        self.assertEqual(payload['max_rowid'], 0)
        self.assertEqual(payload['last'], [0, ''])
        self.local('late-first-historical')
        response = await self.client.get('/api/costs/dashboard/export', params={
            'limit': '10', 'cursor': first['export_cursor']})
        self.assertEqual(response.status, 200, await response.text())
        records = list(csv.DictReader(io.StringIO((await response.text()).lstrip('\ufeff'))))
        self.assertEqual(records, [])
        response = await self.client.get('/api/costs/dashboard/export', params={'limit': '10'})
        records = list(csv.DictReader(io.StringIO((await response.text()).lstrip('\ufeff'))))
        self.assertEqual([record['job_id'] for record in records], ['late-first-historical'])
        self.assertEqual((await self.get_dashboard(limit='10'))['details']['count'], 1)

    async def test_empty_filtered_selection_export_cursor_excludes_late_matching_record(self):
        self.local('not-selected')
        query = {'limit': '10', 'detail_q': 'target'}
        first = await self.get_dashboard(**query)
        self.assertIsNone(first['next_cursor'])
        self.assertEqual(first['overview']['tasks'], 1)
        self.assertEqual(first['details']['count'], 0)
        self.assertIsInstance(first['export_cursor'], str)
        self.local('target-late-historical', created=self.base - 86400)
        response = await self.client.get('/api/costs/dashboard/export', params={
            **query, 'cursor': first['export_cursor']})
        self.assertEqual(response.status, 200, await response.text())
        records = list(csv.DictReader(io.StringIO((await response.text()).lstrip('\ufeff'))))
        self.assertEqual(records, [])
        response = await self.client.get('/api/costs/dashboard/export', params=query)
        records = list(csv.DictReader(io.StringIO((await response.text()).lstrip('\ufeff'))))
        self.assertEqual([record['job_id'] for record in records], ['target-late-historical'])
        self.assertEqual((await self.get_dashboard(**query))['details']['count'], 1)

    async def test_model_groups_include_only_actual_api_models(self):
        self.local('local-model')
        with self.ledger.lock, self.ledger.db:
            self.ledger.db.execute('UPDATE cost_events SET dimensions_json=? WHERE job_id=?',
                                   (json.dumps({'model': 'local-generation-model'}), 'local-model'))
        for index in range(7):
            self.provider(f'cloud-{index}', model=f'actual-api-model-{index}', amount='1',
                          event_kind='api' if index % 2 else 'image_api')
        result = await self.get_dashboard(detail_source='generation')
        self.assertEqual(result['overview']['tasks'], 8)
        self.assertEqual(result['details']['count'], 1)
        self.assertEqual(len(result['models']), 7)
        self.assertEqual({group['key'] for group in result['models']},
                         {f'actual-api-model-{index}' for index in range(7)})
        self.assertEqual(sum(group['tasks'] for group in result['models']), 7)
        self.assertEqual(sum(group['total_cost'] for group in result['models']), 7)
        self.assertEqual(result['jobs'][0]['model'], 'local-generation-model')

    async def test_invalid_query_and_cursor(self):
        invalid = [
            {'limit': '0'}, {'limit': '101'}, {'limit': '2.0'}, {'limit': '-1'},
            {'from': 'nan'}, {'to': 'inf'}, {'from': '-1'}, {'from': '5', 'to': '4'},
            {'trend_source': 'invalid'}, {'detail_source': 'image_api'}, {'detail_status': 'other'},
            {'detail_dimension': 'department'}, {'detail_day': '2026-02-30'},
            {'detail_day': '2026-1-01'}, {'cursor': ''}, {'cursor': 'bad'}, {'cursor': 'a.b'}, {'unknown': 'x'},
        ]
        for query in invalid:
            response = await self.client.get('/api/costs/dashboard', params=query)
            self.assertEqual(response.status, 400, query)
        response = await self.client.get('/api/costs/dashboard?limit=1&limit=2')
        self.assertEqual(response.status, 400)

    async def test_departments_create_rename_assignment_validation_and_persistence(self):
        response = await self.client.get('/api/costs/catalog')
        catalog = await response.json()
        self.assertEqual(len(catalog['departments']), 3)
        self.assertTrue(all(account['department_id'] is None for account in catalog['accounts']))
        response = await self.client.post('/api/costs/departments', json={'name': '  新制作部  '})
        self.assertEqual(response.status, 201, await response.text())
        department = await response.json()
        self.assertEqual(department['name'], '新制作部')
        duplicate = await self.client.post('/api/costs/departments', json={'name': '新制作部'})
        self.assertEqual(duplicate.status, 409)
        for name in ('', ' ' * 3, 'x' * 51, None, 12, 'bad\nname'):
            response = await self.client.post('/api/costs/departments', json={'name': name})
            self.assertEqual(response.status, 400)
        url = '/api/costs/accounts/' + self.member['id'] + '/department'
        for department_id in ('missing', 1, ''):
            response = await self.client.put(url, json={'department_id': department_id})
            self.assertEqual(response.status, 400)
        response = await self.client.put('/api/costs/accounts/missing/department', json={'department_id': None})
        self.assertEqual(response.status, 400)
        response = await self.client.put(url, json={'department_id': department['id']})
        self.assertEqual(response.status, 200)
        response = await self.client.patch('/api/costs/departments/' + department['id'], json={'name': '已改名'})
        self.assertEqual(response.status, 200)
        reopened = CostLedger(self.root / 'control.db', self.pricing_path)
        try:
            departments, assignments = reopened.department_catalog()
            self.assertEqual(assignments[self.member['id']], department['id'])
            self.assertEqual(next(row['name'] for row in departments if row['id'] == department['id']), '已改名')
        finally:
            reopened.close()
        response = await self.client.put(url, json={'department_id': None})
        self.assertEqual(response.status, 200)
        self.assertNotIn(self.member['id'], self.ledger.department_catalog()[1])

    async def test_snapshot_immutable_legacy_current_assignment_and_unknown(self):
        uid = self.member['id']
        self.ledger.assign_department(uid, 'production-1')
        self.local('legacy', owner=self.member)
        self.local('new', owner=self.member)
        self.ledger.bind_attribution('new', uid)
        self.provider('api-new', amount='1', user_id=uid)
        self.ledger.record_image_api({'id': 'image-old', 'capability': 'banana_api_t2i',
                                      'status': 'done', 'created': self.base}, model=None)
        self.store.register_job('image-old', 'project', uid)
        self.local('unknown', project_name=self.member['username'])
        self.ledger.assign_department(uid, 'production-2')
        self.ledger.save_department('重命名一部', 'production-1')
        self.ledger.bind_attribution('new', self.admin['id'])
        result = await self.get_dashboard()
        jobs = {item['job_id']: item for item in result['jobs']}
        for key in ('new', 'api-new'):
            self.assertEqual(jobs[key]['department_id'], 'production-1')
            self.assertEqual(jobs[key]['department_name'], '制作一部')
            self.assertEqual(jobs[key]['account_id'], uid)
            self.assertEqual(jobs[key]['attribution_basis'], 'snapshot')
        for key in ('legacy', 'image-old'):
            self.assertEqual(jobs[key]['department_id'], 'production-2')
            self.assertEqual(jobs[key]['attribution_basis'], 'current_assignment')
        self.assertIsNone(jobs['unknown']['account_id'])
        self.assertEqual(jobs['unknown']['attribution_basis'], 'unknown')
        filtered = await self.get_dashboard(department='production-1', account=uid)
        self.assertEqual(filtered['overview']['tasks'], 2)
        self.assertEqual((await self.get_dashboard(account='unknown'))['overview']['tasks'], 1)
        self.ledger.assign_department(uid, None)
        self.assertEqual((await self.get_dashboard(department='unassigned'))['overview']['tasks'], 2)
        self.assertEqual((await self.get_dashboard(department='unknown'))['overview']['tasks'], 1)

    async def test_snapshot_without_department_never_acquires_later_department(self):
        self.provider('unassigned-snapshot', user_id=self.member['id'])
        self.ledger.assign_department(self.member['id'], 'production-1')
        result = await self.get_dashboard(department='unassigned')
        self.assertEqual(result['overview']['tasks'], 1)
        self.assertEqual(result['jobs'][0]['attribution_basis'], 'snapshot')
        self.assertIsNone(result['jobs'][0]['department_id'])

    async def test_original_currency_zero_unknown_rate_and_no_double_count(self):
        self.ledger.pricing['api_rates']['real-model']['cached_input_per_million_tokens'] = 2
        self.provider('cny-zero', amount='0', usage={'input_tokens': 1000000, 'output_tokens': 1000000})
        self.provider('usd', amount='1.25', currency='USD')
        self.provider('no-currency', amount='9', currency=None)
        self.provider('unknown-model', model='unknown', usage={'input_tokens': 100, 'output_tokens': 100})
        self.provider('estimate', usage={'input_tokens': 1000000, 'output_tokens': 500000, 'cached_tokens': 500})
        self.provider('supplier', amount='3', usage={'input_tokens': 1000000, 'output_tokens': 1000000})
        self.provider('estimated-zero', usage={'input_tokens': 0, 'output_tokens': 0})
        result = await self.get_dashboard()
        jobs = {item['job_id']: item for item in result['jobs']}
        self.assertEqual(jobs['cny-zero']['recognized_cost'], 0)
        self.assertEqual(jobs['cny-zero']['cost_source'], 'actual')
        self.assertEqual(jobs['estimated-zero']['cost_source'], 'estimated')
        self.assertEqual(jobs['estimated-zero']['recognized_cost'], 0)
        self.assertIsNone(jobs['usd']['recognized_cost'])
        self.assertEqual(jobs['usd']['provider_amount'], '1.25')
        self.assertEqual(jobs['usd']['provider_currency'], 'USD')
        self.assertIsNone(jobs['no-currency']['provider_currency'])
        self.assertIsNone(jobs['unknown-model']['recognized_cost'])
        self.assertEqual(jobs['estimate']['recognized_cost'], 4)
        self.assertEqual(jobs['estimate']['cached_tokens'], 500)
        self.assertEqual(jobs['supplier']['recognized_cost'], 3)
        self.assertEqual(result['overview']['total_cost'], 7)
        self.assertEqual(result['overview']['unknown_cost_tasks'], 3)
        with self.ledger.lock:
            row = self.ledger.db.execute("SELECT total_cost_micros FROM cost_events WHERE job_id='estimate'").fetchone()
        self.assertIsNone(row[0])
        self.ledger.pricing['exchange_rates'] = {'USD': {'rate': '7.2', 'version': 'fx-v1'}}
        self.provider('usd-fx', amount='1.25', currency='USD')
        converted = await self.get_dashboard(detail_q='usd-fx')
        self.assertEqual(converted['jobs'][0]['actual_cost'], 9)
        self.assertEqual(converted['jobs'][0]['dimensions']['exchange_version'], 'fx-v1')
        self.ledger.pricing['exchange_rates']['USD'].pop('version')
        self.provider('usd-no-version', amount='1', currency='USD')
        no_version = await self.get_dashboard(detail_q='usd-no-version')
        self.assertIsNone(no_version['jobs'][0]['recognized_cost'])

    async def test_cached_tokens_exceeding_input_remain_unknown_without_clipping(self):
        self.ledger.pricing['api_rates']['real-model']['cached_input_per_million_tokens'] = .5
        usage = {'input_tokens': 10, 'output_tokens': 20, 'cached_tokens': 11, 'reasoning_tokens': 5}
        for event_kind in ('api', 'image_api'):
            event_id = 'invalid-subset-' + event_kind
            self.provider(event_id, event_kind=event_kind, usage=usage)
            row = self.ledger.db.execute('SELECT * FROM cost_events WHERE job_id=?', (event_id,)).fetchone()
            self.assertEqual(row['cost_source'], 'unknown')
            self.assertEqual(json.loads(row['dimensions_json'])['usage'], usage)
            self.assertEqual(row['prompt_tokens'], 10)
            self.assertEqual(row['completion_tokens'], 20)
            for field in ('total_cost_micros', 'api_cost_micros', 'estimated_min_micros', 'estimated_max_micros'):
                self.assertIsNone(row[field])
        result = await self.get_dashboard()
        self.assertEqual(result['cloud']['unknown_cost_tasks'], 2)
        self.assertEqual(result['cloud']['total_cost'], 0)
        self.assertTrue(all(item['cached_tokens'] == 11 for item in result['jobs']))

    async def test_positive_cached_tokens_need_explicit_valid_cached_rate(self):
        rates = self.ledger.pricing['api_rates']['real-model']
        usage = {'input_tokens': 1000000, 'output_tokens': 500000, 'cached_tokens': 200000}
        for index, cached_rate in enumerate((None, 'invalid', 'NaN', 'Infinity', -1, {})):
            if cached_rate is None:
                rates.pop('cached_input_per_million_tokens', None)
            else:
                rates['cached_input_per_million_tokens'] = cached_rate
            event_id = f'missing-cached-rate-{index}'
            self.provider(event_id, usage=usage)
            row = self.ledger.db.execute('SELECT * FROM cost_events WHERE job_id=?', (event_id,)).fetchone()
            self.assertEqual(row['cost_source'], 'unknown')
            self.assertIsNone(row['estimated_min_micros'])
            self.assertIsNone(row['estimated_max_micros'])
            self.assertIsNone(row['total_cost_micros'])
            self.assertEqual(json.loads(row['dimensions_json'])['usage'], usage)
        rates['cached_input_per_million_tokens'] = 0
        self.provider('explicit-free-cache', usage=usage)
        row = self.ledger.db.execute("SELECT * FROM cost_events WHERE job_id='explicit-free-cache'").fetchone()
        self.assertEqual(row['cost_source'], 'estimated')
        self.assertEqual(row['estimated_min_micros'], 3600000)
        self.assertIsNone(row['total_cost_micros'])
        result = await self.get_dashboard()
        self.assertEqual(result['cloud']['unknown_cost_tasks'], 6)
        self.assertEqual(result['cloud']['estimated_cost'], 3.6)

    async def test_zero_cached_tokens_need_no_cached_price(self):
        rates = self.ledger.pricing['api_rates']['real-model']
        self.assertNotIn('cached_input_per_million_tokens', rates)
        usage = {'input_tokens': 1000000, 'output_tokens': 500000, 'cached_tokens': 0}
        self.provider('zero-cache-missing-rate', usage=usage)
        rates['cached_input_per_million_tokens'] = 'not-a-price'
        self.provider('zero-cache-invalid-rate', usage=usage)
        for event_id in ('zero-cache-missing-rate', 'zero-cache-invalid-rate'):
            row = self.ledger.db.execute('SELECT * FROM cost_events WHERE job_id=?', (event_id,)).fetchone()
            self.assertEqual(row['cost_source'], 'estimated')
            self.assertEqual(row['estimated_min_micros'], 4000000)
            self.assertIsNone(row['total_cost_micros'])
            self.assertEqual(json.loads(row['dimensions_json'])['usage'], usage)
        result = await self.get_dashboard()
        self.assertEqual(result['cloud']['unknown_cost_tasks'], 0)
        self.assertEqual(result['cloud']['estimated_cost'], 8)

    async def test_oversized_provider_amount_preserves_event_evidence_and_actual_zero(self):
        usage = {'input_tokens': 1, 'output_tokens': 2, 'cached_tokens': 3}
        for event_kind in ('api', 'image_api'):
            event_id = 'overflow-' + event_kind
            self.provider(event_id, event_kind=event_kind, amount='1e100', usage=usage,
                          user_id=self.member['id'])
            row = self.ledger.db.execute('SELECT * FROM cost_events WHERE job_id=?', (event_id,)).fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row['cost_source'], 'unknown')
            self.assertIsNone(row['total_cost_micros'])
            self.assertIsNone(row['api_cost_micros'])
            self.assertIsNone(row['estimated_min_micros'])
            dimensions = json.loads(row['dimensions_json'])
            self.assertEqual(dimensions['provider_billing'],
                             {'amount': '1e100', 'currency': 'CNY', 'field': 'usage.cost'})
            self.assertEqual(dimensions['usage'], usage)
            self.assertEqual(self.ledger.db.execute('SELECT user_id FROM cost_attributions WHERE job_id=?',
                                                   (event_id,)).fetchone()[0], self.member['id'])
        self.ledger.record_image_api({'id': 'overflow-image_api', 'status': 'error'}, model=None)
        self.provider('one-micro-over-int64', amount='9223372036854.775808')
        self.provider('at-int64', amount='9223372036854.775807')
        self.provider('actual-zero', amount='0', usage=usage)
        over = self.ledger.db.execute("SELECT * FROM cost_events WHERE job_id='one-micro-over-int64'").fetchone()
        self.assertEqual(over['cost_source'], 'unknown')
        self.assertIsNone(over['total_cost_micros'])
        boundary = self.ledger.db.execute("SELECT * FROM cost_events WHERE job_id='at-int64'").fetchone()
        self.assertEqual(boundary['cost_source'], 'actual')
        self.assertEqual(boundary['total_cost_micros'], 2 ** 63 - 1)
        zero = self.ledger.db.execute("SELECT * FROM cost_events WHERE job_id='actual-zero'").fetchone()
        self.assertEqual(zero['cost_source'], 'actual')
        self.assertEqual(zero['total_cost_micros'], 0)
        self.assertEqual(json.loads(zero['dimensions_json'])['usage'], usage)
        result = await self.get_dashboard()
        jobs = {item['job_id']: item for item in result['jobs']}
        self.assertEqual(result['overview']['tasks'], 5)
        self.assertEqual(result['cloud']['unknown_cost_tasks'], 3)
        self.assertEqual(jobs['overflow-api']['provider_amount'], '1e100')
        self.assertIsNone(jobs['overflow-api']['recognized_cost'])
        self.assertEqual(jobs['overflow-image_api']['provider_currency'], 'CNY')
        self.assertEqual(jobs['actual-zero']['recognized_cost'], 0)
        self.assertEqual(jobs['actual-zero']['cost_source'], 'actual')

    async def test_record_api_returns_id_missing_rate_unknown_estimate_not_actual(self):
        unknown = self.ledger.record_api('text', 'unconfigured', 10, 10, 100)
        estimated = self.ledger.record_api('text', 'real-model', 1000000, 0, 100)
        self.assertTrue(unknown.startswith('api:'))
        self.ledger.bind_attribution(estimated, self.admin['id'])
        result = await self.get_dashboard()
        jobs = {item['job_id']: item for item in result['jobs']}
        self.assertEqual(jobs[unknown]['cost_source'], 'unknown')
        self.assertEqual(jobs[estimated]['cost_source'], 'estimated')
        self.assertEqual(jobs[estimated]['recognized_cost'], 2)
        self.assertEqual(result['overview']['gpu_hours'], 0)

    async def test_provider_explicit_model_source_signature_and_whitelist(self):
        cases = [('response', 'response'), ('config', 'config'), ('unknown', 'unknown'),
                 (None, 'unknown'), ('untrusted-source', 'unknown'), ({'source': 'response'}, 'unknown')]
        for index, (source, expected) in enumerate(cases):
            event_id = f'model-source-{index}'
            self.ledger.record_provider_api(
                job_id=event_id, event_kind='api', capability='chat', model='real-model',
                model_source=source, created_at=self.base, status='done',
                provider_billing={'amount': '0', 'currency': 'CNY', 'field': 'cost'},
                usage=None, user_id=self.member['id'])
            row = self.ledger.db.execute('SELECT * FROM cost_events WHERE job_id=?', (event_id,)).fetchone()
            self.assertEqual(json.loads(row['dimensions_json'])['model_source'], expected)
            self.assertEqual(row['cost_source'], 'actual')
        result = await self.get_dashboard()
        by_id = {item['job_id']: item for item in result['jobs']}
        for index, (_, expected) in enumerate(cases):
            self.assertEqual(by_id[f'model-source-{index}']['dimensions']['model_source'], expected)
        self.ledger.record_provider_api(
            job_id='model-source-0', event_kind='api', capability='chat', model=None,
            created_at=self.base, status='done', provider_billing=None, usage=None, user_id=None)
        row = self.ledger.db.execute("SELECT dimensions_json FROM cost_events WHERE job_id='model-source-0'").fetchone()
        self.assertEqual(json.loads(row[0])['model_source'], 'response')
        self.ledger.record_provider_api(
            job_id='model-source-0', event_kind='api', capability='chat', model='different-model',
            created_at=self.base, status='done', provider_billing=None, usage=None, user_id=None)
        row = self.ledger.db.execute("SELECT dimensions_json FROM cost_events WHERE job_id='model-source-0'").fetchone()
        self.assertEqual(json.loads(row[0])['model_source'], 'unknown')

    async def test_image_model_source_is_explicit_and_survives_lifecycle(self):
        self.ledger.record_image_api({'id': 'lighting-source', 'capability': 'lighting',
                                      'created': self.base, 'status': 'queued', 'model_source': 'config'},
                                     model='configured-model')
        row = self.ledger.db.execute('SELECT dimensions_json FROM cost_events').fetchone()
        self.assertEqual(json.loads(row[0])['model_source'], 'config')
        self.ledger.record_image_api({'id': 'lighting-source', 'status': 'running',
                                      'model_source': 'response',
                                      'provider_billing': {'amount': '0.2', 'currency': 'CNY', 'field': 'cost'}},
                                     model='response-model')
        self.ledger.record_image_api({'id': 'lighting-source', 'status': 'error'}, model=None)
        result = await self.get_dashboard()
        item = result['jobs'][0]
        self.assertEqual(item['model'], 'response-model')
        self.assertEqual(item['dimensions']['model_source'], 'response')
        self.assertEqual(item['actual_cost'], .2)
        self.assertEqual(item['status'], 'error')
        self.assertEqual(result['overview']['gpu_hours'], 0)
        self.ledger.record_image_api({'id': 'implicit-source', 'capability': 'lighting',
                                      'created': self.base, 'status': 'done'}, model='configured-model')
        result = await self.get_dashboard(detail_q='implicit-source')
        self.assertEqual(result['jobs'][0]['dimensions']['model_source'], 'unknown')

    async def test_legacy_api_known_cost_matches_recognized_without_pseudo_actual(self):
        self.provider('actual-two', amount='2')
        self.provider('estimated-four', usage={'input_tokens': 1000000, 'output_tokens': 500000})
        self.provider('estimated-zero', usage={'input_tokens': 0, 'output_tokens': 0}, status='running')
        self.provider('unknown-rate', model='unconfigured', usage={'input_tokens': 10, 'output_tokens': 20})
        self.provider('missing-usage', usage=None, status='queued')
        report = self.ledger.report()
        self.assertEqual(report['overview']['actual_cost'], 2)
        self.assertEqual(report['overview']['estimated_cost'], 4)
        self.assertEqual(report['overview']['total_cost'], 6)
        self.assertEqual(report['overview']['api_cost'], 6)
        self.assertEqual(report['overview']['unknown_cost_tasks'], 2)
        jobs = {item['job_id']: item for item in report['jobs']}
        self.assertEqual(jobs['estimated-four']['cost_source'], 'estimated')
        self.assertEqual(jobs['estimated-four']['actual_cost'], 0)
        self.assertEqual(jobs['estimated-zero']['cost_source'], 'estimated')
        self.assertEqual(jobs['estimated-zero']['recognized_cost'], 0)
        self.assertEqual(jobs['unknown-rate']['cost_source'], 'unknown')
        for event_id in ('estimated-four', 'estimated-zero', 'unknown-rate', 'missing-usage'):
            row = self.ledger.db.execute('SELECT * FROM cost_events WHERE job_id=?', (event_id,)).fetchone()
            self.assertIsNone(row['total_cost_micros'])
            self.assertIsNone(row['api_cost_micros'])
        result = await self.get_dashboard()
        self.assertEqual(report['overview']['api_cost'], result['cloud']['total_cost'])
        self.assertEqual(report['overview']['unknown_cost_tasks'], result['cloud']['unknown_cost_tasks'])
        self.local('gpu')
        report = self.ledger.report()
        self.assertEqual(report['overview']['total_cost'], 11)
        self.assertEqual(report['overview']['actual_cost'], 7)
        self.assertEqual(report['overview']['estimated_cost'], 4)
        self.assertEqual(report['overview']['api_cost'], 6)
        self.assertEqual(report['overview']['gpu_hours'], 1)

    async def test_legacy_failed_and_pending_api_estimates_remain_estimated(self):
        for status in ('done', 'error', 'canceled', 'running', 'queued'):
            self.provider('api-' + status, status=status,
                          usage={'input_tokens': 1000000, 'output_tokens': 500000})
        report = self.ledger.report()
        self.assertEqual(report['overview']['actual_cost'], 0)
        self.assertEqual(report['overview']['estimated_cost'], 20)
        self.assertEqual(report['overview']['api_cost'], 20)
        self.assertEqual(report['overview']['total_cost'], 20)
        self.assertEqual(report['overview']['unknown_cost_tasks'], 0)
        self.assertTrue(all(item['cost_source'] == 'estimated' for item in report['jobs']))
        result = await self.get_dashboard()
        self.assertEqual(result['cloud']['total_cost'], report['overview']['api_cost'])

    async def test_image_provider_and_usage_survive_status_updates(self):
        job = {'id': 'image', 'capability': 'banana_api_t2i', 'created': self.base,
               'status': 'running', 'model': 'real-model', 'user_id': self.member['id'],
               'provider_billing': {'amount': '0', 'currency': 'CNY', 'field': 'billing.amount'},
               'usage': {'input_tokens': 8, 'output_tokens': 9, 'cached_tokens': 2}}
        self.ledger.record_image_api(job, model=job['model'])
        self.ledger.record_image_api({'id': 'image', 'status': 'done'}, model=None)
        self.ledger.record_image_api({'id': 'image', 'status': 'running'}, model=None)
        result = await self.get_dashboard()
        item = result['jobs'][0]
        self.assertEqual(item['status'], 'done')
        self.assertEqual(item['cost_source'], 'actual')
        self.assertEqual(item['recognized_cost'], 0)
        self.assertEqual(item['prompt_tokens'], 8)
        self.assertEqual(item['completion_tokens'], 9)
        self.assertEqual(item['cached_tokens'], 2)
        self.assertEqual(item['provider_amount'], '0')
        self.assertEqual(item['account_id'], self.member['id'])
        self.assertEqual(result['overview']['gpu_hours'], 0)
        self.ledger.record_image_api({'id': 'unconfigured-image', 'capability': 'banana_api_t2i',
                                      'created': self.base, 'status': 'done'}, model=None)
        unknown = await self.get_dashboard(detail_q='unconfigured-image')
        self.assertIsNone(unknown['jobs'][0]['model'])

    async def test_fx_snapshot_and_partial_usage_updates_are_preserved(self):
        self.ledger.pricing['exchange_rates'] = {'USD': {'rate': '7.2', 'version': 'fx-v1'}}
        self.ledger.record_image_api({
            'id': 'fx-image', 'capability': 'banana_api_t2i', 'created': self.base,
            'status': 'running', 'provider_billing': {'amount': '2', 'currency': 'USD', 'field': 'cost'},
            'usage': {'input_tokens': 5, 'output_tokens': 8, 'cached_tokens': 2},
        }, model='real-model')
        self.ledger.pricing['exchange_rates']['USD'] = {'rate': '8', 'version': 'fx-v2'}
        self.ledger.record_image_api({'id': 'fx-image', 'status': 'done',
                                      'usage': {'input_tokens': None, 'output_tokens': None, 'reasoning_tokens': 3}}, model=None)
        result = await self.get_dashboard()
        item = result['jobs'][0]
        self.assertEqual(item['actual_cost'], 14.4)
        self.assertEqual(item['dimensions']['exchange_version'], 'fx-v1')
        self.assertEqual(item['prompt_tokens'], 5)
        self.assertEqual(item['completion_tokens'], 8)
        self.assertEqual(item['cached_tokens'], 2)
        with self.ledger.lock:
            dims = json.loads(self.ledger.db.execute('SELECT dimensions_json FROM cost_events').fetchone()[0])
        self.assertEqual(dims['usage']['reasoning_tokens'], 3)

    async def test_trend_beijing_empty_days_and_detail_dimensions(self):
        start = 1704038400  # 北京时间 2024-01-01 零点。
        self.local('first', created=start + 1)
        self.local('third', created=start + 2 * 86400 + 1, status='error')
        self.provider('api', amount='8', created=start + 2 * 86400 + 2)
        result = await self.get_dashboard(**{'from': str(start), 'to': str(start + 3 * 86400 - 1),
                                             'detail_day': '2024-01-03', 'detail_dimension': 'worker',
                                             'detail_key': 'worker-1'})
        self.assertEqual([day['day'] for day in result['trend']], ['2024-01-01', '2024-01-02', '2024-01-03'])
        self.assertEqual(result['trend'][1]['tasks'], 0)
        self.assertEqual(result['overview']['tasks'], 3)
        self.assertEqual([item['job_id'] for item in result['jobs']], ['third'])
        self.assertEqual(result['details']['count'], 1)
        for dimension, key in (('capability', 'local'), ('category', 'image_generation')):
            filtered = await self.get_dashboard(detail_dimension=dimension, detail_key=key)
            self.assertEqual(filtered['details']['count'], 2)
        filtered = await self.get_dashboard(detail_model='real-model', detail_q='api')
        self.assertEqual(filtered['details']['count'], 1)
        self.assertEqual(filtered['overview']['tasks'], 3)

    async def test_csv_unknown_blank_safe_filename_formula_protection_and_same_selection(self):
        self.local('=formula', project_name=' \t=HYPERLINK("bad")')
        self.provider('unknown', model='unconfigured')
        response = await self.client.get('/api/costs/dashboard/export', params={'limit': '1'})
        self.assertEqual(response.status, 200)
        self.assertEqual(response.headers['Content-Type'], 'text/csv; charset=utf-8')
        self.assertRegex(response.headers['Content-Disposition'], r'^attachment; filename="costs-\d{4}-\d{2}-\d{2}\.csv"$')
        records = list(csv.DictReader(io.StringIO((await response.text()).lstrip('\ufeff'))))
        self.assertEqual(len(records), 2)
        by_id = {row['job_id']: row for row in records}
        self.assertEqual(by_id['unknown']['recognized_cost'], '')
        self.assertIn("'=formula", by_id)
        self.assertTrue(by_id["'=formula"]['project_name'].startswith("'"))
        query = {'detail_status': 'unknown', 'detail_source': 'api'}
        expected = await self.get_dashboard(**query)
        response = await self.client.get('/api/costs/dashboard/export', params=query)
        records = list(csv.DictReader(io.StringIO((await response.text()).lstrip('\ufeff'))))
        self.assertEqual(len(records), expected['details']['count'])
        self.assertEqual(records[0]['job_id'], expected['jobs'][0]['job_id'])

    async def test_legacy_project_key_and_sensitive_data_excluded(self):
        self.local('legacy', project=None, project_name='旧项目')
        with self.ledger.lock, self.ledger.db:
            self.ledger.db.execute('UPDATE cost_events SET dimensions_json=? WHERE job_id=?',
                                   (json.dumps({'prompt': 'SECRET_PROMPT', 'assets': 'SECRET_ASSET',
                                                'outputs': 'SECRET_OUTPUT', 'api_key': 'SECRET_KEY',
                                                'model': 'actual-model'}), 'legacy'))
        result = await self.get_dashboard(project='legacy:旧项目')
        self.assertEqual(result['overview']['tasks'], 1)
        self.assertEqual(result['jobs'][0]['project_basis'], 'legacy_name')
        self.assertIn('无稳定项目', result['jobs'][0]['project_note'])
        self.assertEqual(result['models'], [])
        self.assertEqual(result['jobs'][0]['model'], 'actual-model')
        self.assertNotIn('SECRET_', json.dumps(result))
        response = await self.client.get('/api/costs/catalog')
        catalog = await response.json()
        self.assertEqual(catalog['projects'], [{'id': 'legacy:旧项目', 'name': '旧项目'}])
        self.assertNotIn('password', json.dumps(catalog))

    async def test_snapshot_worker_name_is_display_only_never_identity(self):
        self.local('resolved-worker')
        self.local('ambiguous-worker')
        with self.ledger.lock, self.ledger.db:
            self.ledger.db.execute(
                'UPDATE cost_events SET dimensions_json=? WHERE job_id=?',
                (json.dumps({'worker_name': '快照执行端', 'local_review_import': True,
                             'electricity_basis': 'local_review_recalculated'}), 'resolved-worker'))
            self.ledger.db.execute(
                'UPDATE cost_events SET worker_id=NULL,dimensions_json=? WHERE job_id=?',
                (json.dumps({'worker_name': '歧义执行端', 'local_review_import': True}), 'ambiguous-worker'))
        result = await self.get_dashboard()
        jobs = {item['job_id']: item for item in result['jobs']}
        self.assertEqual(jobs['resolved-worker']['worker_id'], 'worker-1')
        self.assertEqual(jobs['resolved-worker']['worker_name'], '快照执行端')
        self.assertIs(jobs['resolved-worker']['dimensions']['local_review_import'], True)
        self.assertEqual(jobs['resolved-worker']['dimensions']['electricity_basis'], 'local_review_recalculated')
        self.assertEqual(jobs['ambiguous-worker']['worker_id'], 'unassigned')
        self.assertEqual(jobs['ambiguous-worker']['worker_name'], '歧义执行端')
        groups = {group['key']: group for group in result['composition']['worker']}
        self.assertEqual(groups['worker-1']['label'], '快照执行端')
        self.assertEqual(groups['unassigned']['label'], '歧义执行端')
        filtered = await self.get_dashboard(detail_dimension='worker', detail_key='worker-1')
        self.assertEqual(filtered['details']['count'], 1)
        filtered = await self.get_dashboard(detail_dimension='worker', detail_key='快照执行端')
        self.assertEqual(filtered['details']['count'], 0)
        with self.ledger.lock, self.ledger.db:
            self.ledger.db.execute('CREATE TABLE workers(id TEXT PRIMARY KEY,name TEXT)')
            self.ledger.db.execute('INSERT INTO workers(id,name) VALUES(?,?)', ('worker-1', '真实执行端'))
        result = await self.get_dashboard(detail_q='resolved-worker')
        self.assertEqual(result['jobs'][0]['worker_name'], '真实执行端')
        self.assertEqual(result['jobs'][0]['worker_id'], 'worker-1')

    async def test_worker_display_fallback_requires_explicit_local_import(self):
        for index, flag in enumerate((None, False, 'true', 1)):
            job_id = f'not-local-{index}'
            self.local(job_id)
            dims = {'worker_name': '不可信执行端标签'}
            if flag is not None:
                dims['local_review_import'] = flag
            with self.ledger.lock, self.ledger.db:
                self.ledger.db.execute('UPDATE cost_events SET dimensions_json=? WHERE job_id=?',
                                       (json.dumps(dims), job_id))
        result = await self.get_dashboard()
        for item in result['jobs']:
            self.assertEqual(item['worker_id'], 'worker-1')
            self.assertEqual(item['worker_name'], 'worker-1')

    async def test_all_handlers_enforce_admin_without_middleware(self):
        cases = [('GET', '/api/costs/dashboard', dashboard.dashboard),
                 ('GET', '/api/costs/dashboard/export', dashboard.dashboard_export),
                 ('GET', '/api/costs/catalog', dashboard.catalog),
                 ('POST', '/api/costs/departments', dashboard.save_department),
                 ('PATCH', '/api/costs/departments/id', dashboard.save_department),
                 ('PUT', '/api/costs/accounts/id/department', dashboard.assign_department)]
        for method, path, handler in cases:
            request = make_mocked_request(method, path)
            with self.assertRaises(web.HTTPUnauthorized):
                await handler(request)
            request['user'] = self.member
            with self.assertRaises(web.HTTPForbidden):
                await handler(request)

    async def test_real_http_auth_admin_and_csrf_all_write_routes(self):
        writes = [('POST', '/api/costs/departments', {'name': '新部门'}),
                  ('PATCH', '/api/costs/departments/production-1', {'name': '改名'}),
                  ('PUT', '/api/costs/accounts/' + self.member['id'] + '/department', {'department_id': None})]
        for method, path, body in writes:
            for headers in ({'Origin': self.origin, 'X-CSRF-Token': ''},
                            {'Origin': 'https://evil.example', 'X-CSRF-Token': self.session['csrf_token']},
                            {'Origin': self.origin, 'Sec-Fetch-Site': 'cross-site',
                             'X-CSRF-Token': self.session['csrf_token']}):
                response = await self.client.request(method, path, json=body, headers=headers)
                self.assertEqual(response.status, 403, (method, path))
        member_session = self.store.login('member', 'Test-password-123')
        self.client.session.headers.update({'Cookie': COOKIE + '=' + member_session['token'],
                                            'X-CSRF-Token': member_session['csrf_token']})
        for path in ('/api/costs/dashboard', '/api/costs/catalog', '/api/costs/dashboard/export'):
            response = await self.client.get(path)
            self.assertEqual(response.status, 403, path)
        for method, path, body in writes:
            response = await self.client.request(method, path, json=body)
            self.assertEqual(response.status, 403)
        self.client.session.headers.clear()
        for path in ('/api/costs/dashboard', '/api/costs/catalog', '/api/costs/dashboard/export'):
            response = await self.client.get(path)
            self.assertEqual(response.status, 401)


if __name__ == '__main__':
    unittest.main()
