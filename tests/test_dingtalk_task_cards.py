"""任务告警卡协议、传输与 Stream 跨循环分发测试；全部使用替身，不联网。"""
import asyncio
import os
import sys
import threading
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'tests'))

from server import dingtalk_approval as dta  # noqa: E402
from test_dingtalk_approval import CONFIG, APPROVER_A, callback_data  # noqa: E402

ALERT_CONFIG = {**CONFIG, 'DINGTALK_TASK_ALERT_TEMPLATE_ID': 'task-alert.schema'}
ROW = {
    'out_track_id': 'task-alert-job-1', 'job_id': 'job-1',
    'worker_name': '开发节点', 'worker_id': 'worker-1', 'task_name': '本地生成任务',
    'project_name': '测试项目', 'card_id': 'card-1', 'submitter': '测试提交人',
    'started_at': 1780000000.0, 'elapsed_seconds': 2161,
    'status': 'alerting', 'message': '运行超过阈值', 'restart_enabled': True,
}
PARAM_KEYS = {
    'title', 'workerName', 'workerId', 'taskName', 'jobId', 'projectName',
    'cardId', 'submitter', 'startTime', 'elapsedText', 'status', 'resultText',
    'restartEnabled', 'lastMessage',
}


def fake_session(responses):
    """记录请求并顺序返回预设 HTTP 响应，不创建网络会话。"""
    session = MagicMock()
    calls = []

    def request(method, url, **kwargs):
        calls.append((method, url, kwargs))
        status, payload = responses.pop(0)
        response = MagicMock(status=status)
        if isinstance(payload, Exception):
            response.json = AsyncMock(side_effect=payload)
        else:
            response.json = AsyncMock(return_value=payload)
        response.text = AsyncMock(return_value='不得读取的敏感原始响应')
        context = MagicMock()
        context.__aenter__ = AsyncMock(return_value=response)
        context.__aexit__ = AsyncMock(return_value=False)
        return context

    session.post.side_effect = lambda url, **kw: request('POST', url, **kw)
    session.put.side_effect = lambda url, **kw: request('PUT', url, **kw)
    return session, calls


class TaskConfigTest(unittest.TestCase):
    def test_optional_template_does_not_change_registration_config(self):
        env = {key: value for key, value in CONFIG.items() if key.startswith('DINGTALK_')}
        with patch.dict(os.environ, env, clear=True):
            config = dta.load_dingtalk_config()
            self.assertEqual(config['DINGTALK_TASK_ALERT_TEMPLATE_ID'], '')
            self.assertEqual(config['approvers'], CONFIG['approvers'])
            os.environ['DINGTALK_TASK_ALERT_TEMPLATE_ID'] = '  task-alert.schema  '
            self.assertEqual(dta.load_dingtalk_config()['DINGTALK_TASK_ALERT_TEMPLATE_ID'],
                             'task-alert.schema')

    def test_no_config_and_template_alone(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertIsNone(dta.load_dingtalk_config())
            os.environ['DINGTALK_TASK_ALERT_TEMPLATE_ID'] = 'task-alert.schema'
            with self.assertRaises(RuntimeError):
                dta.load_dingtalk_config()

    def test_only_two_existing_approvers_allowed(self):
        env = {key: value for key, value in ALERT_CONFIG.items() if key.startswith('DINGTALK_')}
        for approvers in ('one', 'one,two,three', 'one,one'):
            with self.subTest(approvers=approvers), patch.dict(
                    os.environ, {**env, 'DINGTALK_APPROVERS': approvers}, clear=True):
                with self.assertRaises(RuntimeError):
                    dta.load_dingtalk_config()


class TaskParamsTest(unittest.TestCase):
    def test_allowlist_strings_and_explicit_restart_warning(self):
        row = {**ROW, 'prompt': '秘密提示词', 'phone': '13800138000',
               'ip': '192.0.2.10', 'assets': ['秘密素材地址'], 'token': '秘密令牌',
               'attempt_id': '内部执行编号', 'request_id': '内部请求编号',
               'actor_id': '内部操作者编号', 'appSecret': '秘密应用凭据'}
        params = dta.build_task_alert_params(row)
        self.assertEqual(set(params), PARAM_KEYS)
        self.assertEqual(params['title'], '生成任务运行超过 35 分钟')
        self.assertTrue(all(isinstance(value, str) for value in params.values()))
        self.assertEqual(params['elapsedText'], '36分1秒')
        self.assertEqual(params['status'], 'alerting')
        self.assertEqual(params['restartEnabled'], 'true')
        self.assertIn('重启该节点服务（中断当前任务）', params['resultText'])
        self.assertEqual(params['workerId'], ROW['worker_id'])
        self.assertEqual(params['startTime'], dta.time.strftime(
            '%Y-%m-%d %H:%M:%S', dta.time.localtime(ROW['started_at'])))
        for field in set(row) - set(ROW):
            self.assertNotIn(str(row[field]), str(params))
        self.assertNotIn('outTrackId', params)

    def test_title_uses_persisted_threshold_for_every_card_state(self):
        for threshold in (35, 60):
            for status in dta.TASK_ALERT_STATUSES:
                with self.subTest(threshold=threshold, status=status):
                    params = dta.build_task_alert_params(
                        {**ROW, 'threshold_minutes': threshold, 'status': status})
                    self.assertEqual(params['title'], f'生成任务运行超过 {threshold} 分钟')
                    self.assertEqual(set(params), PARAM_KEYS)
                    self.assertTrue(all(isinstance(value, str) for value in params.values()))
                    self.assertEqual(params['restartEnabled'],
                                     'true' if status == 'alerting' else 'false')

    def test_legacy_v3_alert_without_threshold_keeps_historical_title(self):
        params = dta.build_task_alert_params({**ROW, 'task_name': 'H3无损融合单采V3'})
        self.assertEqual(params['title'], '生成任务运行超过 35 分钟')

    def test_all_states_and_disabled_reasons(self):
        for status in dta.TASK_ALERT_STATUSES:
            with self.subTest(status=status):
                params = dta.build_task_alert_params({**ROW, 'status': status})
                self.assertEqual(params['status'], status)
                self.assertEqual(params['restartEnabled'],
                                 'true' if status == 'alerting' else 'false')
                if status != 'alerting':
                    self.assertIn('不可重启', params['resultText'])
                    self.assertTrue(params['resultText'].split('：', 1)[1])

    def test_restart_flag_is_explicit_not_truthy(self):
        for flag in (False, None, 'false', 'False', 'TRUE', 1, 'yes'):
            with self.subTest(flag=flag):
                params = dta.build_task_alert_params({**ROW, 'restart_enabled': flag})
                self.assertEqual(params['restartEnabled'], 'false')
                self.assertIn('不可重启', params['resultText'])
        self.assertEqual(dta.build_task_alert_params(
            {**ROW, 'restart_enabled': 'true'})['restartEnabled'], 'true')

    def test_nonnegative_elapsed_and_missing_display_fields(self):
        for elapsed in (-60, None, 'bad', float('inf'), float('nan')):
            with self.subTest(elapsed=elapsed):
                params = dta.build_task_alert_params(
                    {'status': 'alerting', 'elapsed_seconds': elapsed})
                self.assertEqual(params['elapsedText'], '0分0秒')
                self.assertEqual(params['restartEnabled'], 'false')
                self.assertTrue(all(isinstance(value, str) for value in params.values()))
        self.assertEqual(dta.build_task_alert_params(
            {**ROW, 'elapsed_seconds': 3661})['elapsedText'], '1小时1分1秒')

    def test_invalid_status_rejected(self):
        with self.assertRaises(ValueError):
            dta.build_task_alert_params({**ROW, 'status': 'pending'})


class TaskClientTest(unittest.IsolatedAsyncioTestCase):
    async def test_sixty_minute_title_is_sent_and_updated_with_existing_template_fields(self):
        session, calls = fake_session([
            (200, {'accessToken': 'cached-token', 'expireIn': 7200}),
            (200, {'success': True}), (200, {'success': True}),
        ])
        client = dta.DingTalkClient(ALERT_CONFIG)
        row = {**ROW, 'threshold_minutes': 60, 'elapsed_seconds': 3601,
               'task_name': 'H3无损融合单采V3'}
        await client.deliver_task_alert(session, row)
        await client.update_task_alert(session, {**row, 'status': 'expired'})
        for method, _url, request in calls[1:]:
            with self.subTest(method=method):
                params = request['json']['cardData']['cardParamMap']
                self.assertEqual(set(params), PARAM_KEYS)
                self.assertEqual(params['title'], '生成任务运行超过 60 分钟')
                self.assertEqual(params['elapsedText'], '1小时0分1秒')
                self.assertEqual(request['json']['outTrackId'], ROW['out_track_id'])
        self.assertEqual(calls[1][2]['json']['cardTemplateId'], 'task-alert.schema')
        self.assertEqual(calls[2][2]['json']['cardData']['cardParamMap']['restartEnabled'], 'false')

    async def test_deliver_and_update_same_track_same_group_distinct_template_cached_token(self):
        session, calls = fake_session([
            (200, {'accessToken': 'cached-token', 'expireIn': 7200}),
            (200, {'success': True}), (200, {'result': {'success': True}}),
            (200, {'success': True}),
        ])
        client = dta.DingTalkClient(ALERT_CONFIG)
        await client.deliver_task_alert(session, ROW)
        await client.update_task_alert(session, {**ROW, 'status': 'restart_done'})
        registration = {'out_track_id': 'registration-1', 'id': 'r1', 'status': 'pending',
                        'username': 'user', 'display_name': '用户', 'created_at': 1}
        await client.deliver_card(session, registration)
        self.assertEqual(len(calls), 4)
        alert = calls[1][2]['json']
        update = calls[2][2]['json']
        approval = calls[3][2]['json']
        self.assertEqual(alert['cardTemplateId'], 'task-alert.schema')
        self.assertEqual(approval['cardTemplateId'], CONFIG['DINGTALK_CARD_TEMPLATE_ID'])
        self.assertNotEqual(alert['cardTemplateId'], approval['cardTemplateId'])
        self.assertEqual(alert['outTrackId'], ROW['out_track_id'])
        self.assertEqual(update['outTrackId'], ROW['out_track_id'])
        self.assertEqual(alert['openSpaceId'], approval['openSpaceId'])
        self.assertEqual(alert['openSpaceId'], 'dtv1.card//IM_GROUP.cid-1')
        self.assertEqual(alert['callbackType'], 'STREAM')
        self.assertEqual(alert['imGroupOpenSpaceModel'], {'supportForward': False})
        self.assertEqual(alert['imGroupOpenDeliverModel'], {'robotCode': 'key'})
        self.assertEqual(set(alert['cardData']['cardParamMap']), PARAM_KEYS)
        self.assertEqual(set(update), {'outTrackId', 'cardData'})
        self.assertEqual(update['cardData']['cardParamMap']['restartEnabled'], 'false')
        self.assertEqual(update['cardData']['cardParamMap']['status'], 'restart_done')
        self.assertEqual(approval['cardData']['cardParamMap']['status'], 'pending')
        for call in calls[1:]:
            self.assertEqual(call[2]['headers']['x-acs-dingtalk-access-token'], 'cached-token')
        self.assertEqual(calls[2][0], 'PUT')
        self.assertTrue(calls[2][1].endswith('/v1.0/card/instances'))

    async def test_missing_template_rejects_before_token_request(self):
        for config in (CONFIG, {**CONFIG, 'DINGTALK_TASK_ALERT_TEMPLATE_ID': ' '}):
            for method in ('deliver_task_alert', 'update_task_alert'):
                with self.subTest(method=method, config=config):
                    session, calls = fake_session([])
                    with self.assertRaisesRegex(RuntimeError, 'DINGTALK_TASK_ALERT_TEMPLATE_ID'):
                        await getattr(dta.DingTalkClient(config), method)(session, ROW)
                    self.assertEqual(calls, [])

    async def test_http_failure_never_exposes_response_and_never_retries(self):
        for method in ('deliver_task_alert', 'update_task_alert'):
            for status in (400, 403, 500):
                with self.subTest(method=method, status=status):
                    session, calls = fake_session([
                        (200, {'accessToken': 'sensitive-token'}),
                        (status, {'accessToken': 'sensitive-token', 'message': 'secret appSecret'}),
                    ])
                    with self.assertRaises(RuntimeError) as error:
                        await getattr(dta.DingTalkClient(ALERT_CONFIG), method)(session, ROW)
                    self.assertIn(f'HTTP {status}', str(error.exception))
                    self.assertNotIn('sensitive-token', str(error.exception))
                    self.assertNotIn('appSecret', str(error.exception))
                    self.assertEqual(len(calls), 2)

    async def test_logical_failure_markers_rejected_for_both_methods(self):
        failures = [
            {'success': False}, {'success': 'false'}, {'errcode': 40035},
            {'code': 'InvalidParameter'}, {'errorCode': 'CardInstanceAlreadyExist'},
            {'result': {'success': False}}, {'result': {'errcode': '500'}},
        ]
        for method in ('deliver_task_alert', 'update_task_alert'):
            for failure in failures:
                with self.subTest(method=method, failure=failure):
                    session, calls = fake_session([
                        (200, {'accessToken': 'sensitive-token'}),
                        (200, {**failure, 'message': 'sensitive-token', 'appSecret': 'secret'}),
                    ])
                    with self.assertRaisesRegex(RuntimeError, '逻辑失败') as error:
                        await getattr(dta.DingTalkClient(ALERT_CONFIG), method)(session, ROW)
                    self.assertNotIn('sensitive-token', str(error.exception))
                    self.assertNotIn('secret', str(error.exception))
                    self.assertEqual(len(calls), 2)

    async def test_explicit_success_codes_and_unmarked_response_allowed(self):
        for payload in ({}, {'code': 'OK'}, {'errcode': 0}, {'code': '200'},
                        {'success': True}, {'result': {'success': True}}):
            with self.subTest(payload=payload):
                session, _ = fake_session([
                    (200, {'accessToken': 'token'}), (200, payload),
                ])
                await dta.DingTalkClient(ALERT_CONFIG).deliver_task_alert(session, ROW)

    async def test_invalid_json_and_non_object_response_fail_safely(self):
        for method in ('deliver_task_alert', 'update_task_alert'):
            for payload in (ValueError('sensitive-token'), [], None):
                with self.subTest(method=method, payload=payload):
                    session, _ = fake_session([
                        (200, {'accessToken': 'token'}), (200, payload),
                    ])
                    with self.assertRaises(RuntimeError) as error:
                        await getattr(dta.DingTalkClient(ALERT_CONFIG), method)(session, ROW)
                    self.assertNotIn('sensitive-token', str(error.exception))

    async def test_token_failure_sanitized_before_card_request(self):
        for status, payload in (
                (403, {'accessToken': 'sensitive-token'}),
                (200, {'success': False, 'accessToken': 'sensitive-token'}),
                (200, {'errcode': '403', 'accessToken': 'sensitive-token'}),
                (200, ValueError('sensitive-token'))):
            with self.subTest(status=status, payload=payload):
                session, calls = fake_session([(status, payload)])
                with self.assertRaises(RuntimeError) as error:
                    await dta.DingTalkClient(ALERT_CONFIG).deliver_task_alert(session, ROW)
                self.assertEqual(len(calls), 1)
                self.assertNotIn('sensitive-token', str(error.exception))


class DispatcherTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.loop = asyncio.get_running_loop()
        self.approval = MagicMock()
        self.approval.process_data = AsyncMock(return_value=(200, {'registration': True}))
        self.service = MagicMock()
        self.service.process_callback = AsyncMock(return_value=(200, {'task': True}))
        self.dispatcher = dta.CardCallbackDispatcher(self.approval, self.service, self.loop)
        self.data = callback_data(APPROVER_A, action=dta.TASK_RESTART_ACTION)

    def tearDown(self):
        self.dispatcher.close()

    async def test_registration_and_unknown_actions_keep_original_handler(self):
        for action in ('agree', 'reject', 'unknown', 'restart_other_services'):
            with self.subTest(action=action):
                data = callback_data(APPROVER_A, action=action)
                self.assertEqual(await self.dispatcher.process_data(data),
                                 (200, {'registration': True}))
                self.approval.process_data.assert_awaited_with(data)
        self.service.process_callback.assert_not_awaited()

    async def test_restart_routes_raw_callback_without_trusting_client_worker_or_job(self):
        data = {**self.data, 'worker_id': 'forged-worker', 'job_id': 'forged-job'}
        self.assertEqual(await self.dispatcher.process_data(data), (200, {'task': True}))
        self.service.process_callback.assert_awaited_once_with(data)
        self.approval.process_data.assert_not_awaited()

    async def test_missing_service_falls_back_to_approval_unknown_action(self):
        self.dispatcher.task_alerts = None
        self.assertEqual(await self.dispatcher.process_data(self.data),
                         (200, {'registration': True}))
        self.service.process_callback.assert_not_awaited()

    async def test_malformed_payload_rejected_without_service(self):
        for data in ('bad', {'content': 'invalid json'}, {'content': ['bad']},
                     {'content': {'cardPrivateData': ['bad']}}):
            with self.subTest(data=data):
                self.assertEqual((await self.dispatcher.process_data(data))[0], 400)
        # 空容器与既有注册解析一致，当作没有按钮动作。
        for data in ({'content': []}, {'content': {'cardPrivateData': []}}):
            with self.subTest(data=data):
                self.assertEqual(await self.dispatcher.process_data(data),
                                 (200, {'registration': True}))
        self.service.process_callback.assert_not_awaited()

    async def test_stream_thread_is_bridged_to_setup_main_loop(self):
        main_thread = threading.get_ident()
        observed = []

        async def process(data):
            observed.append((asyncio.get_running_loop(), threading.get_ident(), data))
            return 200, {'bridged': True}

        self.service.process_callback.side_effect = process

        def stream_callback():
            self.assertNotEqual(threading.get_ident(), main_thread)
            return asyncio.run(self.dispatcher.process_data(self.data))

        result = await asyncio.wait_for(asyncio.to_thread(stream_callback), timeout=2)
        self.assertEqual(result, (200, {'bridged': True}))
        self.assertEqual(observed, [(self.loop, main_thread, self.data)])
        self.service.process_callback.assert_awaited_once()

    async def test_timeout_cancels_main_coroutine_without_repeating_action(self):
        cancelled = asyncio.Event()

        async def process(data):
            try:
                await asyncio.Event().wait()
            finally:
                cancelled.set()

        self.service.process_callback.side_effect = process
        self.dispatcher.timeout = 0.02
        result = await asyncio.wait_for(asyncio.to_thread(
            lambda: asyncio.run(self.dispatcher.process_data(self.data))), timeout=2)
        self.assertEqual(result[0], 200)
        self.assertIn('timed out', result[1]['error'])
        await asyncio.wait_for(cancelled.wait(), timeout=2)
        self.service.process_callback.assert_awaited_once()
        self.assertFalse(self.dispatcher._pending)

    async def test_shutdown_cancels_inflight_callback_without_waiting_on_sdk_thread(self):
        entered, cancelled = asyncio.Event(), asyncio.Event()

        async def process(data):
            entered.set()
            try:
                await asyncio.Event().wait()
            finally:
                cancelled.set()

        self.service.process_callback.side_effect = process
        task = asyncio.create_task(asyncio.to_thread(
            lambda: asyncio.run(self.dispatcher.process_data(self.data))))
        await asyncio.wait_for(entered.wait(), timeout=2)
        self.dispatcher.close()
        self.assertEqual((await asyncio.wait_for(task, timeout=2))[0], 503)
        await asyncio.wait_for(cancelled.wait(), timeout=2)
        self.assertEqual((await self.dispatcher.process_data(self.data))[0], 503)
        self.service.process_callback.assert_awaited_once()

    async def test_sdk_cancellation_propagates_to_main_loop(self):
        entered, cancelled = threading.Event(), asyncio.Event()

        async def process(data):
            entered.set()
            try:
                await asyncio.Event().wait()
            finally:
                cancelled.set()

        self.service.process_callback.side_effect = process

        async def stream():
            task = asyncio.create_task(self.dispatcher.process_data(self.data))
            self.assertTrue(await asyncio.to_thread(entered.wait, 2))
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task

        await asyncio.wait_for(asyncio.to_thread(lambda: asyncio.run(stream())), timeout=3)
        await asyncio.wait_for(cancelled.wait(), timeout=2)
        self.service.process_callback.assert_awaited_once()

    async def test_closed_or_stopped_loop_refuses_without_creating_coroutine(self):
        other_loop = asyncio.new_event_loop()
        self.dispatcher.main_loop = other_loop
        try:
            self.assertEqual((await self.dispatcher.process_data(self.data))[0], 503)
            other_loop.close()
            self.assertEqual((await self.dispatcher.process_data(self.data))[0], 503)
            self.service.process_callback.assert_not_awaited()
        finally:
            other_loop.close()

    async def test_scheduling_failure_closes_coroutine(self):
        with patch.object(dta.asyncio, 'run_coroutine_threadsafe',
                          side_effect=RuntimeError('loop closed')) as schedule:
            result = await self.dispatcher.process_data(self.data)
        self.assertEqual(result[0], 503)
        self.assertIsNone(schedule.call_args.args[0].cr_frame)
        self.service.process_callback.assert_not_awaited()
        self.assertFalse(self.dispatcher._pending)

    async def test_service_failure_is_sanitized(self):
        self.service.process_callback.side_effect = RuntimeError('sensitive-token')
        result = await self.dispatcher.process_data(self.data)
        self.assertEqual(result[0], 500)
        self.assertNotIn('sensitive-token', str(result))


class SetupTest(unittest.IsolatedAsyncioTestCase):
    async def test_setup_captures_main_loop_existing_service_and_stop_closes_dispatcher(self):
        service = MagicMock()
        service.process_callback = AsyncMock(return_value=(200, {'task': True}))
        app = {'task_alerts': service}
        with patch.object(dta, 'load_dingtalk_config', return_value=CONFIG), \
                patch.object(dta, 'install_logging_redaction'), \
                patch.object(dta.threading, 'Thread') as thread, \
                patch.object(dta, 'outbox_worker', new_callable=AsyncMock):
            dta.setup_dingtalk(app, MagicMock())
            handler = app['dingtalk']['callback_handler']
            self.assertIs(handler.main_loop, asyncio.get_running_loop())
            self.assertIs(handler.task_alerts, service)
            self.assertEqual(thread.call_args.kwargs['args'][2], handler)
            thread.return_value.start.assert_called_once_with()
            await dta.stop_dingtalk(app)
            self.assertTrue(handler._closing)
            thread.return_value.join.assert_not_called()
            self.assertEqual((await handler.process_data(
                callback_data(APPROVER_A, action=dta.TASK_RESTART_ACTION)))[0], 503)
            service.process_callback.assert_not_awaited()

    async def test_no_configuration_still_disables_registration_module(self):
        app = {'task_alerts': MagicMock()}
        with patch.object(dta, 'load_dingtalk_config', return_value=None), \
                patch.object(dta.threading, 'Thread') as thread:
            dta.setup_dingtalk(app, MagicMock())
            self.assertIsNone(app['dingtalk'])
            thread.assert_not_called()
            await dta.stop_dingtalk(app)

    async def test_stream_registers_exactly_one_topic_handler(self):
        sdk = MagicMock()
        sdk.CallbackHandler = type('CallbackHandler', (), {})
        dispatcher = MagicMock()
        dispatcher.process_data = AsyncMock(return_value=(200, {'routed': True}))
        with patch.dict(sys.modules, {'dingtalk_stream': sdk}), \
                patch.object(dta, 'install_logging_redaction'):
            dta._run_stream_listener(CONFIG, MagicMock(), dispatcher)
        client = sdk.DingTalkStreamClient.return_value
        client.register_callback_handler.assert_called_once()
        topic, bridge = client.register_callback_handler.call_args.args
        self.assertEqual(topic, dta.CARD_TOPIC)
        callback = MagicMock(data=callback_data(APPROVER_A))
        self.assertEqual(await bridge.process(callback), (200, {'routed': True}))
        dispatcher.process_data.assert_awaited_once_with(callback.data)
        client.start_forever.assert_called_once_with()


if __name__ == '__main__':
    unittest.main()
