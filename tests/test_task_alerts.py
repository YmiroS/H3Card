"""任务告警隔离回归：真实临时SQLite，钉钉出站全部替换为本地桩。"""
import asyncio
import concurrent.futures
import threading
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'server'))
sys.path.insert(0, str(ROOT / 'tests'))

from auth_support import PASSWORD
from distributed import DistributedStore
from server.auth_store import AuthStore
from server.task_alerts import TaskAlertService, TaskAlertStore, THRESHOLD_SECONDS

CONFIG = {'DINGTALK_CORP_ID': 'test-corp', 'approvers': ['approver-a', 'approver-b'],
          'DINGTALK_TASK_ALERT_TEMPLATE_ID': 'task-template'}
START = 1_800_000_000.0
NOW = START + THRESHOLD_SECONDS + 1


def callback(row, user='approver-a', corp='test-corp', action='restart_task_services'):
    return {'corpId': corp, 'userId': user, 'outTrackId': row['out_track_id'],
            'content': json.dumps({'cardPrivateData': {'actionIds': [action],
                                   'worker_id': 'forged-worker', 'job_id': 'forged-job'}})}


def snapshot(job_id='job'):
    return {'job_id': job_id, 'worker_id': 'worker', 'attempt_id': 'attempt',
            'worker_name': '测试机器', 'task_name': '测试任务', 'started_at': START,
            'elapsed_seconds': 2101, 'restart_enabled': True, 'submitter': '测试用户',
            'project_name': '测试画布', 'card_id': 'card'}


class AlertStoreTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / 'alerts.db'
        self.store = TaskAlertStore(self.path)

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def test_job_unique_reopen_and_audit_persist(self):
        first = self.store.create(snapshot(), NOW)
        self.store.create(snapshot(), NOW + 1)
        marked = self.store.begin_restart('job', 'approver-a')
        self.assertEqual(marked['actor_id'], 'approver-a')
        self.assertEqual(marked['status'], 'restart_pending')
        self.assertFalse(marked['restart_enabled'])
        self.assertEqual(self.store.begin_restart('job', 'approver-b')['request_id'], marked['request_id'])
        self.store.close()
        self.store = TaskAlertStore(self.path)
        self.assertEqual(self.store.get('job')['out_track_id'], first['out_track_id'])
        self.assertEqual(self.store.get('job')['request_id'], marked['request_id'])
        self.assertEqual(self.store.get('job')['actor_id'], 'approver-a')

    def test_claim_is_exclusive_across_connections_and_expires(self):
        self.store.create(snapshot(), NOW)
        other = TaskAlertStore(self.path)
        try:
            claimed = self.store.claim(NOW)
            self.assertIsNone(other.claim(NOW))
            self.assertIsNotNone(other.claim(NOW + 121))
            self.store.finish_delivery(claimed, success=True, now=NOW + 122)
            self.assertEqual(self.store.get('job')['delivered'], 0)
        finally:
            other.close()

    def test_concurrent_connections_claim_one_job_once(self):
        self.store.create(snapshot(), NOW)
        other = TaskAlertStore(self.path)
        barrier = threading.Barrier(2)

        def claim(store):
            barrier.wait(timeout=5)
            return store.claim(NOW)

        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                claims = list(pool.map(claim, (self.store, other)))
            self.assertEqual(sum(row is not None for row in claims), 1)
        finally:
            other.close()

    def test_stale_refresh_cannot_revive_card_after_restart_reservation(self):
        stale = self.store.create(snapshot(), NOW)
        pending = self.store.begin_restart('job', 'approver-a')
        current = self.store.state('job', 'alerting', '任务仍运行', restart_enabled=True,
                                   expected_revision=stale['revision'])
        self.assertEqual(current['status'], 'restart_pending')
        self.assertEqual(current['request_id'], pending['request_id'])
        self.assertFalse(current['restart_enabled'])

    def test_concurrent_restart_reservations_keep_first_audit_and_id(self):
        self.store.create(snapshot(), NOW)
        other = TaskAlertStore(self.path)
        barrier = threading.Barrier(2)

        def reserve(pair):
            store, actor = pair
            barrier.wait(timeout=5)
            return store.begin_restart('job', actor)

        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                rows = list(pool.map(reserve, ((self.store, 'a'), (other, 'b'))))
            self.assertEqual(rows[0]['request_id'], rows[1]['request_id'])
            self.assertEqual(rows[0]['actor_id'], rows[1]['actor_id'])
        finally:
            other.close()

    def test_retry_backoff_and_stable_track(self):
        first = self.store.create(snapshot(), NOW)
        claimed = self.store.claim(NOW)
        self.store.finish_delivery(claimed, success=False, now=NOW)
        self.assertIsNone(self.store.claim(NOW + 29))
        second = self.store.claim(NOW + 30)
        self.assertEqual(second['out_track_id'], first['out_track_id'])
        self.store.finish_delivery(second, success=True, now=NOW + 30)
        self.assertIsNone(self.store.claim(NOW + 100))

    def test_inflight_older_version_cannot_ack_newer_update(self):
        self.store.create(snapshot(), NOW)
        claimed = self.store.claim(NOW)
        self.store.state('job', 'expired', '已结束')
        self.store.finish_delivery(claimed, success=True, now=NOW)
        update = self.store.claim(NOW)
        self.assertEqual(update['status'], 'expired')
        self.assertTrue(update['delivered'])
        self.assertGreater(update['revision'], claimed['revision'])

    def test_expired_unsent_keeps_once_only_tombstone(self):
        self.store.create(snapshot(), NOW)
        self.store.state('job', 'expired', '已结束')
        claimed = self.store.claim(NOW)
        self.store.skip_unsent(claimed)
        self.assertIsNone(self.store.claim(NOW + 1000))
        self.assertEqual(self.store.create(snapshot(), NOW + 1000)['status'], 'expired')


class AlertServiceTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.auth = AuthStore(self.root / 'auth.db')
        user = self.auth.create_user('real-submitter', PASSWORD)
        self.auth.create_project('project', user['id'])
        self.auth.register_job('job', 'project', user['id'])
        self.jobs = {'job': {'id': 'job', 'status': 'running', 'started': START,
                             'name': '测试能力', 'project': 'project', 'projectName': '测试项目',
                             'card': 'card', 'submitter_username': 'FORGED',
                             'prompts': [{'text': 'PRIVATE_PROMPT'}], 'phone': 'PRIVATE_PHONE',
                             'inputs': {'secret': 'PRIVATE_INPUT'}}}
        self.app = {'auth_store': self.auth, 'lifecycle': {'shutting_down': False}}
        self.service = TaskAlertService(self.app, lambda: tuple(self.jobs.values()), self.root / 'alerts.db')
        self.service.config = CONFIG
        self.service.store = TaskAlertStore(self.service.path)
        self.service.closing = False
        self.service.client = MagicMock(deliver_task_alert=AsyncMock(), update_task_alert=AsyncMock())
        self.service.session = MagicMock(close=AsyncMock())
        self.distributed = None
        self.clock = patch('server.task_alerts.time.time', return_value=NOW)
        self.clock.start()

    async def asyncTearDown(self):
        await self.service.stop()
        if self.distributed:
            self.distributed.close()
        self.auth.close()
        self.clock.stop()
        self.tmp.cleanup()

    def use_worker(self, *, guarded=True):
        self.distributed = DistributedStore(self.root / 'control.db', lease_seconds=10000,
                                            offline_seconds=10000)
        self.app['distributed'] = self.distributed
        caps = {'node_classes': ['TestNode'], 'supports_service_restart': True,
                'supports_guarded_service_restart': guarded,
                'devices': [{'type': 'cuda', 'name': 'RTX 4090', 'vram_total': 24 * 1024 ** 3}]}
        with patch('server.task_alerts.time.time', return_value=START):
            worker = self.distributed.register_worker('测试机器', caps)
            self.distributed.heartbeat(worker['worker_id'], comfy_online=True)
            self.distributed.enqueue('job', {'capability': 'test', 'graph': {
                '1': {'class_type': 'TestNode', 'inputs': {}}}}, ['TestNode'])
            assigned = self.distributed.acquire(worker['worker_id'])
            self.assertIsNotNone(assigned)
            self.distributed.mark_running('job', worker['worker_id'], assigned['lease_token'])
        self.jobs['job']['worker_id'] = worker['worker_id']
        return worker, assigned

    async def test_strict_threshold_and_queue_excluded(self):
        with patch('server.task_alerts.time.time', return_value=START + THRESHOLD_SECONDS):
            await self.service.run_once()
        self.assertIsNone(self.service.store.get('job'))
        self.jobs['job']['status'] = 'queued'
        await self.service.run_once()
        self.assertIsNone(self.service.store.get('job'))
        self.jobs['job']['status'] = 'running'
        await self.service.run_once()
        self.service.client.deliver_task_alert.assert_awaited_once()

    async def test_fusion_v3_waits_until_strictly_after_sixty_minutes(self):
        self.use_worker()
        self.jobs['job'].update(capability='minimax_h3_fusion_v3', name='已重命名的V3任务',
                                started=START + 3601)
        for elapsed in (2100, 2101, 3599, 3600):
            with self.subTest(elapsed=elapsed), patch(
                    'server.task_alerts.time.time', return_value=START + elapsed):
                await self.service.run_once()
                self.assertIsNone(self.service.store.get('job'))
        self.service.client.deliver_task_alert.assert_not_awaited()
        self.jobs['job']['status'] = 'queued'
        with patch('server.task_alerts.time.time', return_value=START + 3601):
            await self.service.run_once()
            self.assertIsNone(self.service.store.get('job'))
            self.jobs['job']['status'] = 'running'
            await self.service.run_once()
            await self.service.run_once()
        row = self.service.store.get('job')
        self.assertEqual(row['threshold_minutes'], 60)
        self.assertEqual(row['started_at'], START)
        self.assertEqual(row['elapsed_seconds'], 3601)
        self.assertTrue(row['restart_enabled'])
        self.assertEqual(row['task_name'], '已重命名的V3任务')
        self.service.client.deliver_task_alert.assert_awaited_once()
        self.service.client.update_task_alert.assert_not_awaited()

    async def test_other_capabilities_keep_thirty_five_minutes_even_with_v3_name(self):
        job = self.jobs['job']
        capabilities = ('minimax_h3_fusion_v2', 'minimax_h3_fusion_v2_bf16',
                        'minimax_h3_fusion_v3_extra', 'unknown', None)
        self.jobs = {f'job-{index}': dict(job, id=f'job-{index}', capability=capability,
                                        name='H3无损融合单采V3')
                     for index, capability in enumerate(capabilities)}
        with patch('server.task_alerts.time.time', return_value=START + THRESHOLD_SECONDS):
            await self.service.run_once()
        self.assertEqual(self.service.store.active(), [])
        await self.service.run_once()
        self.assertEqual(self.service.client.deliver_task_alert.await_count, len(capabilities))
        for job_id in self.jobs:
            with self.subTest(job_id=job_id):
                row = self.service.store.get(job_id)
                self.assertEqual(row['threshold_minutes'], 35)
                self.assertEqual(row['elapsed_seconds'], 2101)

    async def test_fusion_v3_threshold_persists_across_retry_reopen_and_expiry(self):
        from server.dingtalk_approval import build_task_alert_params

        self.jobs['job'].update(capability='minimax_h3_fusion_v3', name='H3无损融合单采V3')
        self.service.client.deliver_task_alert.side_effect = TimeoutError('response-lost')
        with patch('server.task_alerts.time.time', return_value=START + 3601):
            await self.service.run_once()
        original = self.service.store.get('job')
        self.assertEqual(original['threshold_minutes'], 60)
        self.assertEqual(build_task_alert_params(original)['title'], '生成任务运行超过 60 分钟')
        self.service.store.close()
        self.service.store = TaskAlertStore(self.service.path)
        with patch('server.task_alerts.time.time', return_value=START + 3632):
            await self.service.run_once()
            self.jobs['job']['status'] = 'done'
            await self.service.run_once()
        row = self.service.store.get('job')
        self.assertEqual(row['out_track_id'], original['out_track_id'])
        self.assertEqual(row['threshold_minutes'], 60)
        self.assertEqual(row['status'], 'expired')
        self.assertEqual(build_task_alert_params(row)['title'], '生成任务运行超过 60 分钟')
        self.service.client.deliver_task_alert.assert_awaited_once()
        self.assertEqual(self.service.client.update_task_alert.await_count, 2)

    async def test_once_only_trusted_submitter_and_minimal_snapshot(self):
        await self.service.run_once()
        await self.service.run_once()
        row = self.service.store.get('job')
        self.assertEqual(row['submitter'], 'real-submitter')
        self.assertEqual(row['task_name'], '测试能力')
        self.assertFalse(row['restart_enabled'])
        for secret in ('FORGED', 'PRIVATE_PROMPT', 'PRIVATE_PHONE', 'PRIVATE_INPUT'):
            self.assertNotIn(secret, str(row))
        self.service.client.deliver_task_alert.assert_awaited_once()
        self.service.client.update_task_alert.assert_not_awaited()

    async def test_terminal_and_missing_invalid_future_started_excluded(self):
        for value in (None, 0, -1, True, '1', float('nan'), float('inf'), NOW + 5):
            with self.subTest(started=value):
                self.jobs['job']['started'] = value
                await self.service.run_once()
                self.assertIsNone(self.service.store.get('job'))
        self.jobs['job'].update(started=START, status='done')
        await self.service.run_once()
        self.assertIsNone(self.service.store.get('job'))

    async def test_cloud_and_remote_sr_only_notify(self):
        self.app['distributed'] = MagicMock()
        for executor in ('cloud_image', 'remote_sr'):
            self.jobs['job']['execution'] = executor
            await self.service.run_once()
            row = self.service.store.get('job')
            self.assertFalse(row['restart_enabled'])
            self.assertIn(row['worker_name'], ('云端 API', '远程超分服务'))
            code, _ = await self.service.process_callback(callback(row))
            self.assertEqual(code, 200)
            self.app['distributed'].request_alert_restart.assert_not_called()
        self.app.pop('distributed')

    async def test_expired_sent_card_is_updated_not_redelivered(self):
        await self.service.run_once()
        self.jobs['job']['status'] = 'done'
        await self.service.run_once()
        self.assertEqual(self.service.store.get('job')['status'], 'expired')
        self.service.client.deliver_task_alert.assert_awaited_once()
        self.service.client.update_task_alert.assert_awaited_once()

    async def test_failed_send_retries_same_card_and_restart_does_not_duplicate(self):
        self.service.client.update_task_alert.side_effect = RuntimeError('card-not-created')
        self.service.client.deliver_task_alert.side_effect = RuntimeError('fake-network-error')
        await self.service.run_once()
        row = self.service.store.get('job')
        self.assertEqual(row['failures'], 1)
        self.service.client.deliver_task_alert.side_effect = None
        self.service.store.close()
        self.service.store = TaskAlertStore(self.service.path)
        with patch('server.task_alerts.time.time', return_value=NOW + 31):
            await self.service.run_once()
        calls = self.service.client.deliver_task_alert.await_args_list
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[0].args[1]['out_track_id'], calls[1].args[1]['out_track_id'])
        self.assertTrue(self.service.store.get('job')['delivered'])

    async def test_lost_create_response_recovers_by_updating_same_card(self):
        self.service.client.deliver_task_alert.side_effect = RuntimeError('response-lost')
        await self.service.run_once()
        row = self.service.store.get('job')
        with patch('server.task_alerts.time.time', return_value=NOW + 31):
            await self.service.run_once()
        self.service.client.deliver_task_alert.assert_awaited_once()
        self.service.client.update_task_alert.assert_awaited_once()
        updated = self.service.client.update_task_alert.await_args.args[1]
        self.assertEqual(updated['out_track_id'], row['out_track_id'])
        self.assertTrue(self.service.store.get('job')['delivered'])

    async def test_crash_after_claim_recovers_uncertain_delivery_by_update(self):
        await self.service._scan()
        original = self.service.store.claim(NOW)
        self.service.store.close()
        self.service.store = TaskAlertStore(self.service.path)
        with patch('server.task_alerts.time.time', return_value=NOW + 121):
            await self.service.run_once()
        self.service.client.deliver_task_alert.assert_not_awaited()
        self.service.client.update_task_alert.assert_awaited_once()
        self.assertEqual(self.service.store.get('job')['out_track_id'], original['out_track_id'])

    async def test_ended_before_send_retry_does_not_send_history(self):
        self.service.client.deliver_task_alert.side_effect = RuntimeError('fake-network-error')
        await self.service.run_once()
        self.jobs['job']['status'] = 'done'
        await self.service.run_once()
        self.assertEqual(self.service.store.get('job')['status'], 'expired')
        self.assertIsNone(self.service.store.claim(NOW + 1000))
        self.service.client.deliver_task_alert.assert_awaited_once()
        self.service.client.update_task_alert.assert_awaited_once()

    async def test_lost_create_response_then_finish_updates_visible_card_to_expired(self):
        self.use_worker()
        visible = {}

        async def deliver(_session, row):
            visible.update(status=row['status'], restart_enabled=row['restart_enabled'])
            raise TimeoutError('created-but-response-lost')

        async def update(_session, row):
            visible.update(status=row['status'], restart_enabled=row['restart_enabled'])

        self.service.client.deliver_task_alert.side_effect = deliver
        self.service.client.update_task_alert.side_effect = update
        await self.service.run_once()
        self.jobs['job']['status'] = 'done'
        await self.service.run_once()
        self.assertEqual(visible, {'status': 'expired', 'restart_enabled': False})
        self.assertTrue(self.service.store.get('job')['delivered'])
        self.service.client.deliver_task_alert.assert_awaited_once()

    async def test_crash_after_claim_then_finish_updates_existing_card_without_create(self):
        await self.service._scan()
        original = self.service.store.claim(NOW)
        self.service.store.close()
        self.service.store = TaskAlertStore(self.service.path)
        self.jobs['job']['status'] = 'done'
        with patch('server.task_alerts.time.time', return_value=NOW + 121):
            await self.service.run_once()
        self.service.client.deliver_task_alert.assert_not_awaited()
        self.service.client.update_task_alert.assert_awaited_once()
        row = self.service.client.update_task_alert.await_args.args[1]
        self.assertEqual(row['out_track_id'], original['out_track_id'])
        self.assertEqual(row['status'], 'expired')

    async def test_uncertain_expired_update_failure_keeps_retry_without_creating_history(self):
        self.service.client.deliver_task_alert.side_effect = TimeoutError('response-lost')
        self.service.client.update_task_alert.side_effect = RuntimeError('update-unavailable')
        await self.service.run_once()
        self.jobs['job']['status'] = 'done'
        await self.service.run_once()
        row = self.service.store.get('job')
        self.assertEqual(row['status'], 'expired')
        self.assertLess(row['sent_revision'], row['revision'])
        self.service.client.update_task_alert.side_effect = None
        with patch('server.task_alerts.time.time', return_value=NOW + 61):
            await self.service.run_once()
        self.assertTrue(self.service.store.get('job')['delivered'])
        self.service.client.deliver_task_alert.assert_awaited_once()
        self.assertEqual(self.service.client.update_task_alert.await_count, 2)

    async def test_finished_before_any_delivery_does_not_create_or_update_history(self):
        await self.service._scan()
        self.jobs['job']['status'] = 'done'
        await self.service.run_once()
        self.service.client.deliver_task_alert.assert_not_awaited()
        self.service.client.update_task_alert.assert_not_awaited()
        self.assertIsNone(self.service.store.claim(NOW + 1000))

    async def test_callback_auth_unknown_and_malformed(self):
        await self.service.run_once()
        row = self.service.store.get('job')
        for user, corp in (('other', 'test-corp'), ('approver-a', 'wrong-corp')):
            code, _ = await self.service.process_callback(callback(row, user=user, corp=corp))
            self.assertEqual(code, 403)
        for data in ('bad', {'content': 'bad-json'}, {'content': [1]}, {'content': {'cardPrivateData': []}}):
            code, _ = await self.service.process_callback(data)
            self.assertEqual(code, 400)
        for action in ('agree', 'reboot_host', 'hack'):
            code, _ = await self.service.process_callback(callback(row, action=action))
            self.assertEqual(code, 400)
        unknown = dict(row, out_track_id='task-alert-unknown')
        code, _ = await self.service.process_callback(callback(unknown))
        self.assertEqual(code, 404)
        self.assertIsNone(self.service.store.get('job')['request_id'])

    async def test_shutdown_rejects_new_callback(self):
        await self.service.run_once()
        self.app['lifecycle']['shutting_down'] = True
        code, _ = await self.service.process_callback(callback(self.service.store.get('job')))
        self.assertEqual(code, 503)

    async def test_worker_authoritative_start_and_restart_authorized_once(self):
        worker, assignment = self.use_worker()
        self.jobs['job']['started'] = NOW
        await self.service.run_once()
        row = self.service.store.get('job')
        self.assertEqual(row['started_at'], START)
        self.assertEqual(row['worker_name'], '测试机器')
        self.assertTrue(row['restart_enabled'])
        code, body = await self.service.process_callback(callback(row, user='approver-b'))
        self.assertEqual(code, 200)
        current = self.service.store.get('job')
        self.assertEqual(current['status'], 'restart_pending')
        self.assertEqual(current['actor_id'], 'approver-b')
        self.assertFalse(current['restart_enabled'])
        self.assertEqual(body['cardData']['cardParamMap']['status'], 'restart_pending')
        request_id = current['request_id']
        await asyncio.gather(*(self.service.process_callback(callback(row)) for _ in range(3)))
        self.assertEqual(self.service.store.get('job')['request_id'], request_id)
        self.assertEqual(self.distributed.alert_restart_status(request_id)['status'], 'pending')
        self.assertNotIn('forged', str(self.distributed.alert_restart_status(request_id)))

    async def test_old_worker_can_notify_but_not_restart(self):
        self.use_worker(guarded=False)
        await self.service.run_once()
        row = self.service.store.get('job')
        self.assertFalse(row['restart_enabled'])
        await self.service.process_callback(callback(row))
        self.assertIsNone(self.service.store.get('job')['request_id'])

    async def test_finished_attempt_rejects_old_card(self):
        worker, assignment = self.use_worker()
        await self.service.run_once()
        row = self.service.store.get('job')
        self.distributed.finish('job', worker['worker_id'], assignment['lease_token'], 'done')
        code, _ = await self.service.process_callback(callback(row))
        self.assertEqual(code, 200)
        self.assertEqual(self.service.store.get('job')['status'], 'expired')
        self.assertIsNone(self.service.store.get('job')['request_id'])

    async def test_recover_action_saved_before_command_after_reopen(self):
        self.use_worker()
        await self.service.run_once()
        marked = self.service.store.begin_restart('job', 'approver-a')
        self.service.store.close()
        self.service.store = TaskAlertStore(self.service.path)
        await self.service.run_once()
        result = self.distributed.alert_restart_status(marked['request_id'])
        self.assertEqual(result['status'], 'pending')
        self.assertEqual(self.service.store.get('job')['actor_id'], 'approver-a')

    async def test_slow_delivery_does_not_block_next_timeout_scan(self):
        sending, scanned, release = asyncio.Event(), asyncio.Event(), asyncio.Event()
        await self.service._synchronize()
        original = self.service._scan

        async def scan():
            await original()
            if sending.is_set():
                scanned.set()

        async def slow_deliver(_session, _row):
            sending.set()
            await release.wait()

        with patch.object(self.service, '_scan', side_effect=scan), patch(
                'server.task_alerts.SCAN_SECONDS', 0.01):
            self.service.client.deliver_task_alert.side_effect = slow_deliver
            self.service.worker = asyncio.create_task(self.service._run())
            self.service.sender = asyncio.create_task(self.service._send())
            try:
                await asyncio.wait_for(sending.wait(), timeout=3)
                await asyncio.wait_for(scanned.wait(), timeout=1)
                self.assertFalse(release.is_set())
            finally:
                release.set()
                self.service.closing = True
                self.service.stopping.set()
                await asyncio.gather(self.service.worker, self.service.sender)

    async def test_callback_wait_cancellation_does_not_cancel_accepted_action(self):
        self.use_worker()
        await self.service.run_once()
        entered, release = asyncio.Event(), asyncio.Event()
        original = self.service._process_callback

        async def delayed(data):
            entered.set()
            await release.wait()
            return await original(data)

        with patch.object(self.service, '_process_callback', side_effect=delayed):
            caller = asyncio.create_task(self.service.process_callback(
                callback(self.service.store.get('job'))))
            await entered.wait()
            caller.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await caller
            pending = tuple(self.service.callbacks)
            self.assertEqual(len(pending), 1)
            release.set()
            await asyncio.gather(*pending)
        self.assertEqual(self.service.store.get('job')['status'], 'restart_pending')
        self.assertIsNotNone(self.service.store.get('job')['request_id'])

    async def test_real_maintenance_report_controls_result(self):
        worker, assignment = self.use_worker()
        await self.service.run_once()
        await self.service.process_callback(callback(self.service.store.get('job')))
        row = self.service.store.get('job')
        self.distributed.heartbeat(worker['worker_id'], comfy_online=True, busy=True,
                                   current_job_id='job', maintenance={
                                       'request_id': row['request_id'], 'status': 'running'})
        await self.service.run_once()
        self.assertEqual(self.service.store.get('job')['status'], 'restart_running')
        self.distributed.heartbeat(worker['worker_id'], comfy_online=True, maintenance={
            'request_id': row['request_id'], 'status': 'done', 'message': '已恢复'})
        await self.service.run_once()
        self.assertEqual(self.service.store.get('job')['status'], 'restart_done')
        self.assertFalse(self.service.store.get('job')['restart_enabled'])


class AlertStartupTest(unittest.IsolatedAsyncioTestCase):
    async def test_unconfigured_service_does_not_create_alert_database(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'alerts.db'
            for app in ({}, {'dingtalk': {'config': {}, 'client': MagicMock()}}):
                service = TaskAlertService(app, lambda: (), path)
                await service.start()
                await service.stop()
                self.assertFalse(path.exists())
