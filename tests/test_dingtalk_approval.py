"""钉钉审批适配层单元测试：不发任何网络请求。"""
import asyncio
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "tests"))

from auth_support import PASSWORD  # noqa: E402
from server import dingtalk_approval as dta  # noqa: E402
from server.auth_store import AuthStore  # noqa: E402

CORP = 'ding-test-corp'
APPROVER_A, APPROVER_B = '431661', '431662'
CONFIG = {
    'DINGTALK_APP_KEY': 'key', 'DINGTALK_APP_SECRET': 'secret',
    'DINGTALK_CORP_ID': CORP, 'DINGTALK_APPROVERS': f'{APPROVER_A},{APPROVER_B}',
    'DINGTALK_GROUP_CONVERSATION_ID': 'cid-1',
    'DINGTALK_CARD_TEMPLATE_ID': 'tpl.schema', 'DINGTALK_ROBOT_CODE': 'key',
    'approvers': [APPROVER_A, APPROVER_B],
}


def callback_data(user, action='agree', out_track='track-1', corp=CORP):
    import json
    return {'corpId': corp, 'userId': user, 'outTrackId': out_track,
            'type': 'actionCallback',
            'content': json.dumps({'cardPrivateData': {'actionIds': [action]}})}


class ConfigTest(unittest.TestCase):
    def test_none_when_unset(self):
        env = {k: '' for k in list(__import__('os').environ) if k.startswith('DINGTALK_')}
        with patch.dict(__import__('os').environ, env, clear=False):
            for key in list(env):
                __import__('os').environ.pop(key, None)
            # 完全清空后返回 None
            import os
            saved = {k: os.environ.pop(k) for k in list(os.environ) if k.startswith('DINGTALK_')}
            try:
                self.assertIsNone(dta.load_dingtalk_config())
            finally:
                os.environ.update(saved)

    def test_partial_config_fails_fast(self):
        import os
        saved = {k: os.environ.pop(k) for k in list(os.environ) if k.startswith('DINGTALK_')}
        try:
            with patch.dict(os.environ, {'DINGTALK_APP_KEY': 'k'}, clear=False):
                with self.assertRaises(RuntimeError):
                    dta.load_dingtalk_config()
            with patch.dict(os.environ, {
                'DINGTALK_APP_KEY': 'k', 'DINGTALK_APP_SECRET': 's',
                'DINGTALK_CORP_ID': 'c', 'DINGTALK_APPROVERS': 'only-one',
                'DINGTALK_GROUP_CONVERSATION_ID': 'g',
            }, clear=False):
                with self.assertRaises(RuntimeError):
                    dta.load_dingtalk_config()
        finally:
            os.environ.update(saved)


class CardParamsTest(unittest.TestCase):
    def test_param_map_full_and_no_secret(self):
        row = {'id': 'req-1', 'status': 'pending', 'username': 'xm', 'display_name': '小明',
               'created_at': 1780000000.0, 'decided_by': None}
        params = dta.build_card_params(row)
        for key in ('title', 'displayName', 'username', 'resultText', 'createTime',
                    'status', 'requestId', 'lastMessage'):
            self.assertIn(key, params)
        self.assertEqual(params['status'], 'pending')
        row.update({'status': 'approved', 'decided_by': APPROVER_A})
        self.assertEqual(dta.build_card_params(row)['status'], 'agree')
        row['status'] = 'rejected'
        self.assertEqual(dta.build_card_params(row)['status'], 'reject')
        self.assertNotIn(PASSWORD, str(params))


class HandlerTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = AuthStore(Path(self.tmp.name) / 'auth.sqlite')
        self.store.create_user('admin', PASSWORD, 'admin')
        self.handler = dta.ApprovalCardHandler(CONFIG, self.store)
        request = self.store.create_registration('xm', PASSWORD, '小明')
        self.track = self.store.registration_card_data(request['request_id'])['out_track_id']

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def _data(self, user, **kwargs):
        kwargs.setdefault('out_track', self.track)
        return callback_data(user, **kwargs)

    async def test_corp_mismatch_rejected(self):
        code, body = await self.handler.process_data(self._data(APPROVER_A, corp='other'))
        self.assertEqual(code, 403)
        self.assertEqual(self.store.list_registrations()[0]['status'], 'pending')

    async def test_non_approver_click_no_state_change(self):
        code, body = await self.handler.process_data(self._data('999999'))
        self.assertEqual(code, 200)
        self.assertNotIn('cardData', body)
        self.assertEqual(self.store.list_registrations()[0]['status'], 'pending')

    async def test_unknown_action_ignored(self):
        code, _ = await self.handler.process_data(self._data(APPROVER_A, action='hack'))
        self.assertEqual(code, 200)
        self.assertEqual(self.store.list_registrations()[0]['status'], 'pending')

    async def test_approver_agree_applies_and_updates_card(self):
        code, body = await self.handler.process_data(self._data(APPROVER_A))
        self.assertEqual(code, 200)
        self.assertIn('cardParamMap', body['cardData'])
        self.assertEqual(body['cardData']['cardParamMap']['status'], 'agree')
        self.assertEqual(self.store.list_registrations()[0]['status'], 'approved')
        session = self.store.login('xm', PASSWORD)
        self.assertEqual(session['user']['display_name'], '小明')

    async def test_second_decision_is_duplicate(self):
        await self.handler.process_data(self._data(APPROVER_A))
        code, body = await self.handler.process_data(self._data(APPROVER_B, action='reject'))
        self.assertEqual(code, 200)
        self.assertEqual(body['cardData']['cardParamMap']['status'], 'agree')
        self.assertEqual(self.store.list_registrations()[0]['status'], 'approved')

    async def test_unknown_card_404(self):
        code, _ = await self.handler.process_data(callback_data(APPROVER_A, out_track='nope'))
        self.assertEqual(code, 404)

    async def test_bad_payload_400(self):
        code, _ = await self.handler.process_data('not-a-dict')
        self.assertEqual(code, 400)


class ClientTest(unittest.IsolatedAsyncioTestCase):
    def _session_with(self, responses):
        session = MagicMock()
        calls = []

        def make(method_status_json):
            context = AsyncMock()
            response = MagicMock()
            response.status, payload = method_status_json
            response.json = AsyncMock(return_value=payload)
            response.text = AsyncMock(return_value=str(payload))
            context.__aenter__ = AsyncMock(return_value=response)
            context.__aexit__ = AsyncMock(return_value=False)
            return context

        def router(method, url, **kwargs):
            calls.append((method, url, kwargs))
            return make(responses.pop(0))

        session.post = lambda url, **kw: router('POST', url, **kw)
        session.put = lambda url, **kw: router('PUT', url, **kw)
        return session, calls

    async def test_token_cached_and_deliver_body(self):
        session, calls = self._session_with([
            (200, {'accessToken': 'tok-1', 'expireIn': 7200}),
            (200, {'success': True}),
            (200, {'success': True}),  # 第二次发卡不应再取 token
        ])
        client = dta.DingTalkClient(CONFIG)
        row = {'id': 'r', 'status': 'pending', 'username': 'u', 'display_name': 'n',
               'created_at': 1.0, 'decided_by': None, 'out_track_id': 'track-9'}
        await client.deliver_card(session, row)
        await client.deliver_card(session, row)
        token_calls = [c for c in calls if c[1].endswith('/v1.0/oauth2/accessToken')]
        self.assertEqual(len(token_calls), 1)
        deliver = [c for c in calls if 'createAndDeliver' in c[1]][0]
        body = deliver[2]['json']
        self.assertEqual(body['callbackType'], 'STREAM')
        self.assertEqual(body['openSpaceId'], 'dtv1.card//IM_GROUP.cid-1')
        self.assertIn('cardParamMap', body['cardData'])
        self.assertEqual(body['imGroupOpenDeliverModel']['robotCode'], 'key')
        self.assertEqual(deliver[2]['headers']['x-acs-dingtalk-access-token'], 'tok-1')

    async def test_update_card_body(self):
        session, calls = self._session_with([
            (200, {'accessToken': 'tok-1', 'expireIn': 7200}),
            (200, {'success': True}),
        ])
        client = dta.DingTalkClient(CONFIG)
        row = {'id': 'r', 'status': 'rejected', 'username': 'u', 'display_name': 'n',
               'created_at': 1.0, 'decided_by': APPROVER_A, 'out_track_id': 'track-9'}
        await client.update_card(session, row)
        update = [c for c in calls if c[1].endswith('/v1.0/card/instances')][0]
        body = update[2]['json']
        self.assertEqual(body['outTrackId'], 'track-9')
        self.assertEqual(body['cardData']['cardParamMap']['status'], 'reject')

    async def test_failure_raises(self):
        session, _ = self._session_with([
            (200, {'accessToken': 'tok-1', 'expireIn': 7200}),
            (500, {'message': 'boom'}),
        ])
        client = dta.DingTalkClient(CONFIG)
        row = {'id': 'r', 'status': 'pending', 'username': 'u', 'display_name': 'n',
               'created_at': 1.0, 'decided_by': None, 'out_track_id': 't'}
        with self.assertRaises(RuntimeError):
            await client.deliver_card(session, row)


class OutboxTaskTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = AuthStore(Path(self.tmp.name) / 'auth.sqlite')
        self.store.create_user('admin', PASSWORD, 'admin')
        request = self.store.create_registration('xm', PASSWORD, '小明')
        self.request_id = request['request_id']

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    async def test_send_card_then_done(self):
        client = MagicMock()
        client.deliver_card = AsyncMock()
        tasks = await asyncio.to_thread(self.store.claim_outbox, time.time())
        done = await dta.process_outbox_task(client, MagicMock(), self.store, tasks[0])
        self.assertTrue(done)
        client.deliver_card.assert_awaited_once()
        self.assertEqual(self.store.outbox_backlog()['pending'], 0)

    async def test_send_skipped_when_already_decided(self):
        card = self.store.registration_card_data(self.request_id)
        self.store.decide_registration(card['out_track_id'], 'approved', CORP, APPROVER_A)
        client = MagicMock()
        client.deliver_card = AsyncMock()
        client.update_card = AsyncMock()
        # 决定先于发卡到达：send 任务跳过发卡只标记完成，update 任务展示终态
        tasks = await asyncio.to_thread(self.store.claim_outbox, time.time())
        self.assertEqual(len(tasks), 2)
        self.assertTrue(await dta.process_outbox_task(client, MagicMock(), self.store, tasks[0]))
        client.deliver_card.assert_not_awaited()
        await dta.process_outbox_task(client, MagicMock(), self.store, tasks[1])
        client.update_card.assert_awaited_once()

    async def test_failure_schedules_retry(self):
        client = MagicMock()
        client.deliver_card = AsyncMock(side_effect=RuntimeError('net down'))
        tasks = await asyncio.to_thread(self.store.claim_outbox, time.time())
        done = await dta.process_outbox_task(client, MagicMock(), self.store, tasks[0])
        self.assertFalse(done)
        backlog = self.store.outbox_backlog()
        self.assertEqual(backlog['pending'], 1)
        with self.store.lock:
            row = self.store.db.execute('SELECT attempts,last_error FROM notification_outbox').fetchone()
        self.assertEqual(row['attempts'], 1)
        self.assertIn('net down', row['last_error'])


if __name__ == '__main__':
    unittest.main()
