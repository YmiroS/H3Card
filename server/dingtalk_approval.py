"""钉钉注册审批适配层：Stream 回调监听、发卡/更新卡片、发件箱重试。

协议要点（2026-09-17 测试群实测）：
- 卡片回调 topic ``/v1.0/card/instances/callback``，回调含可信 ``corpId/userId/outTrackId``，
  按钮动作为 ``content.cardPrivateData.actionIds``（agree/reject）；卡片自定义参数不授予身份。
- 回调 ACK 响应更新卡片时 ``cardData`` 必须包一层 ``cardParamMap``。
- 发卡 ``POST /v1.0/card/instances/createAndDeliver``，群投放需
  ``openSpaceId=dtv1.card//IM_GROUP.{conversationId}`` 与 ``imGroupOpenDeliverModel.robotCode``。
- 更新卡片 ``PUT /v1.0/card/instances``（outTrackId + cardData.cardParamMap）。
- 审批决定唯一写入点在 ``AuthStore.decide_registration``；本层只做身份校验与展示更新，
  卡片更新失败由发件箱重试，绝不回滚决定。
"""
import asyncio
import json
import logging
import re
import threading
import time
from pathlib import Path

import aiohttp

from server.auth_store import AuthStore

LOGGER = logging.getLogger('h3card.dingtalk')
CARD_TOPIC = '/v1.0/card/instances/callback'
OPENAPI = 'https://api.dingtalk.com'
# 出站请求绕过环境代理：应用按出口 IP 白名单校验，代理出口会被拒（本机联调已踩坑）。
HTTP_TIMEOUT = aiohttp.ClientTimeout(total=20, sock_connect=10)

_SECRET_PATTERNS = [
    re.compile(r"ticket['\"]?\s*[:=]\s*['\"][^'\"]+['\"]"),
    re.compile(r"access_token[=][^&\s\"']+"),
    re.compile(r"appSecret['\"]?\s*[:=]\s*['\"][^'\"]+['\"]"),
]
_REDACTED_VALUES = []


def install_logging_redaction():
    """给钉钉 SDK 相关 logger 挂脱敏过滤器；密钥与令牌替换后再输出。"""
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('[dingtalk] %(levelname)s %(message)s'))

    class _Filter(logging.Filter):
        def filter(self, record):
            message = str(record.msg)
            if record.args:
                args = record.args if isinstance(record.args, tuple) else (record.args,)
                message = message % tuple(str(a) for a in args)
                record.args = ()
            for pattern in _SECRET_PATTERNS:
                message = pattern.sub('***', message)
            for secret in _REDACTED_VALUES:
                if secret:
                    message = message.replace(secret, '***')
            record.msg = message
            return True

    handler.addFilter(_Filter())
    for name in ('h3card.dingtalk', 'dingtalk_stream', 'dingtalk_stream.client',
                 'dingtalk_stream.handler', 'dingtalk_stream.card_replier'):
        logger = logging.getLogger(name)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False


def load_dingtalk_config():
    """读取环境配置；未配置返回 None，部分配置直接抛错（fail fast，不静默降级）。"""
    import os
    values = {key: os.environ.get(key, '').strip() for key in
              ('DINGTALK_APP_KEY', 'DINGTALK_APP_SECRET', 'DINGTALK_CORP_ID',
               'DINGTALK_APPROVERS', 'DINGTALK_GROUP_CONVERSATION_ID',
               'DINGTALK_CARD_TEMPLATE_ID', 'DINGTALK_ROBOT_CODE',
               'DINGTALK_TASK_ALERT_TEMPLATE_ID')}
    supplied = [key for key, value in values.items() if value]
    if not supplied:
        return None
    required = ('DINGTALK_APP_KEY', 'DINGTALK_APP_SECRET', 'DINGTALK_CORP_ID',
                'DINGTALK_APPROVERS', 'DINGTALK_GROUP_CONVERSATION_ID')
    missing = [key for key in required if not values[key]]
    if missing:
        raise RuntimeError(f'钉钉审批配置不完整，缺少 {", ".join(missing)}；'
                           '请补全或清空全部 DINGTALK_* 配置')
    approvers = [item.strip() for item in values['DINGTALK_APPROVERS'].split(',') if item.strip()]
    if len(approvers) != 2 or len(set(approvers)) != 2:
        raise RuntimeError('DINGTALK_APPROVERS 必须为两位不同审批人的平台 userId')
    values['approvers'] = approvers
    values.setdefault('DINGTALK_ROBOT_CODE', '') or values.update(
        DINGTALK_ROBOT_CODE=values['DINGTALK_APP_KEY'])
    _REDACTED_VALUES.extend([values['DINGTALK_APP_SECRET'], values['DINGTALK_APP_KEY']])
    return values


# ---- 卡片变量构造（与模板“H3Card注册审批联调”的变量契约一致）----

def build_card_params(request_row):
    """pending/终态共用一套完整变量；卡片更新是全量覆盖，不能漏字段。"""
    status_map = {'pending': 'pending', 'approved': 'agree', 'rejected': 'reject'}
    status = status_map.get(request_row['status'], 'pending')
    if request_row['status'] == 'approved':
        result = f"已通过 · 审批人 {request_row['decided_by']}"
    elif request_row['status'] == 'rejected':
        result = f"已拒绝 · 审批人 {request_row['decided_by']}"
    else:
        result = '待审批 · 仅指定审批人可处理'
    return {
        'title': f"{request_row['display_name']} 的 H3Card 注册申请",
        'displayName': request_row['display_name'],
        'username': request_row['username'],
        'resultText': result,
        'createTime': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(request_row['created_at'])),
        'status': status,
        'requestId': request_row['id'],
        'lastMessage': 'H3Card 注册申请',
    }


TASK_RESTART_ACTION = 'restart_task_services'
TASK_ALERT_STATUSES = frozenset({
    'alerting', 'expired', 'restart_pending', 'restart_running',
    'restart_done', 'restart_error',
})


def build_task_alert_params(row):
    """只投影告警模板字段；不转发任务输入、联系方式或节点连接信息。"""
    status = row['status']
    if status not in TASK_ALERT_STATUSES:
        raise ValueError('未知任务告警状态')
    try:
        elapsed = max(0, int(float(row.get('elapsed_seconds') or 0)))
    except (ValueError, TypeError, OverflowError):
        elapsed = 0
    hours, remainder = divmod(elapsed, 3600)
    minutes, seconds = divmod(remainder, 60)
    elapsed_text = f'{hours}小时{minutes}分{seconds}秒' if hours else f'{minutes}分{seconds}秒'
    started_at = row.get('started_at')
    if isinstance(started_at, (int, float)):
        try:
            started_at = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(started_at))
        except (ValueError, OverflowError, OSError):
            started_at = ''
    enabled = status == 'alerting' and (
        row.get('restart_enabled') is True or row.get('restart_enabled') == 'true')
    reasons = {
        'alerting': '当前节点不支持受约束重启或任务已不可重启',
        'expired': '告警已过期，当前任务不可重启',
        'restart_pending': '已申请重启，请勿重复操作',
        'restart_running': '正在重启该节点服务，请勿重复操作',
        'restart_done': '该节点服务已重启，本卡不可再次操作',
        'restart_error': '重启失败，本卡不可再次操作，请人工检查节点',
    }
    result = ('重启该节点服务（中断当前任务） · 仅指定审批人可操作'
              if enabled else f'不可重启：{reasons[status]}')
    return {
        'title': f"生成任务运行超过 {row.get('threshold_minutes', 35)} 分钟",
        'workerName': str(row.get('worker_name') or ''),
        'workerId': str(row.get('worker_id') or ''),
        'taskName': str(row.get('task_name') or ''),
        'jobId': str(row.get('job_id') or ''),
        'projectName': str(row.get('project_name') or ''),
        'cardId': str(row.get('card_id') or ''),
        'submitter': str(row.get('submitter') or ''),
        'startTime': str(started_at or ''),
        'elapsedText': elapsed_text,
        'status': status,
        'resultText': result,
        'restartEnabled': 'true' if enabled else 'false',
        'lastMessage': str(row.get('message') or ''),
    }


def _api_failed(body):
    """仅识别明确失败标记，不把可能含凭据的原始响应拼进异常。"""
    if not isinstance(body, dict):
        return True
    markers = [body]
    if isinstance(body.get('result'), dict):
        markers.append(body['result'])
    for marker in markers:
        if marker.get('success') in (False, 'false', 'False'):
            return True
        for key in ('code', 'errcode', 'errorCode'):
            if key in marker and marker[key] not in (
                    None, '', 0, '0', 200, '200', 'OK', 'ok', 'Success', 'success'):
                return True
    return False


class DingTalkClient:
    """OpenAPI 直连客户端：token 缓存 + 发卡/更新（不走环境代理）。"""

    def __init__(self, config):
        self.config = config
        self._token = ''
        self._token_expires = 0.0

    async def _get_token(self, session):
        if self._token and time.time() < self._token_expires:
            return self._token
        async with session.post(f'{OPENAPI}/v1.0/oauth2/accessToken', json={
            'appKey': self.config['DINGTALK_APP_KEY'],
            'appSecret': self.config['DINGTALK_APP_SECRET'],
        }) as response:
            if response.status != 200:
                raise RuntimeError(f'获取钉钉 token 失败 HTTP {response.status}')
            try:
                body = await response.json(content_type=None)
            except (ValueError, aiohttp.ClientError):
                raise RuntimeError('获取钉钉 token 响应不是有效 JSON') from None
            if _api_failed(body) or not body.get('accessToken'):
                raise RuntimeError('获取钉钉 token 返回逻辑失败')
            self._token = body['accessToken']
            # expireIn 秒，提前 5 分钟失效
            self._token_expires = time.time() + max(body.get('expireIn', 7200) - 300, 60)
            return self._token

    async def _card_request(self, session, method, path, body, *, check_result=False):
        token = await self._get_token(session)
        async with getattr(session, method)(
                f'{OPENAPI}{path}', headers={'x-acs-dingtalk-access-token': token},
                json=body) as response:
            if response.status != 200:
                raise RuntimeError(f'钉钉卡片请求失败 HTTP {response.status}')
            if check_result:
                try:
                    result = await response.json(content_type=None)
                except (ValueError, aiohttp.ClientError):
                    raise RuntimeError('钉钉卡片响应不是有效 JSON') from None
                if _api_failed(result):
                    raise RuntimeError('钉钉卡片请求返回逻辑失败')

    async def _deliver(self, session, template_id, out_track_id, params, *, check_result=False):
        body = {
            'cardTemplateId': template_id,
            'outTrackId': out_track_id,
            'cardData': {'cardParamMap': params},
            'callbackType': 'STREAM',
            'openSpaceId': f"dtv1.card//IM_GROUP.{self.config['DINGTALK_GROUP_CONVERSATION_ID']}",
            'imGroupOpenSpaceModel': {'supportForward': False},
            'imGroupOpenDeliverModel': {'robotCode': self.config['DINGTALK_ROBOT_CODE']},
        }
        await self._card_request(session, 'post', '/v1.0/card/instances/createAndDeliver',
                                 body, check_result=check_result)

    async def _update(self, session, out_track_id, params, *, check_result=False):
        body = {'outTrackId': out_track_id, 'cardData': {'cardParamMap': params}}
        await self._card_request(session, 'put', '/v1.0/card/instances', body,
                                 check_result=check_result)

    async def deliver_card(self, session, request_row):
        await self._deliver(session, self.config['DINGTALK_CARD_TEMPLATE_ID'],
                            request_row['out_track_id'], build_card_params(request_row))

    async def update_card(self, session, request_row):
        await self._update(session, request_row['out_track_id'], build_card_params(request_row))

    def _task_alert_template(self):
        template = self.config.get('DINGTALK_TASK_ALERT_TEMPLATE_ID', '').strip()
        if not template:
            raise RuntimeError('未配置 DINGTALK_TASK_ALERT_TEMPLATE_ID，任务告警未启用')
        return template

    async def deliver_task_alert(self, session, row):
        await self._deliver(session, self._task_alert_template(), row['out_track_id'],
                            build_task_alert_params(row), check_result=True)

    async def update_task_alert(self, session, row):
        self._task_alert_template()
        await self._update(session, row['out_track_id'], build_task_alert_params(row),
                           check_result=True)


async def process_outbox_task(client, session, store, task):
    """处理单个发件箱任务；返回 True 表示完成，False 表示已安排重试。"""
    request = await asyncio.to_thread(store.registration_card_data, task['request_id'])
    try:
        if request is None:
            await asyncio.to_thread(store.finish_outbox, task['id'], done=True)
            return True
        if task['kind'] == 'send_card':
            if request['status'] == 'pending':
                await client.deliver_card(session, request)
            # 已决定的申请跳过发卡，由 update 任务展示终态
        else:
            await client.update_card(session, request)
        await asyncio.to_thread(store.finish_outbox, task['id'], done=True)
        return True
    except Exception as exc:  # noqa: BLE001 单任务失败只影响自身重试
        LOGGER.warning('钉钉通知任务 %s 失败：%s', task['dedupe_key'], exc)
        await asyncio.to_thread(store.finish_outbox, task['id'], error=str(exc))
        return False


async def outbox_worker(app):
    """发件箱后台任务：认领到期任务，发卡或按最新状态更新卡片，失败退避重试。"""
    store: AuthStore = app['auth_store']
    client: DingTalkClient = app['dingtalk']['client']
    session = aiohttp.ClientSession(timeout=HTTP_TIMEOUT, trust_env=False)
    app['dingtalk']['http_session'] = session
    try:
        while True:
            try:
                tasks = await asyncio.to_thread(store.claim_outbox, time.time())
                for task in tasks:
                    await process_outbox_task(client, session, store, task)
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # noqa: BLE001 worker 骨架不让单轮异常退出
                LOGGER.exception('发件箱处理异常: %s', exc)
            await asyncio.sleep(2)
    finally:
        await session.close()


def _parse_card_callback(data):
    """从回调 data 解析可信字段；不依赖 SDK，便于单元测试与协议演进。"""
    if not isinstance(data, dict):
        raise ValueError('回调必须是对象')
    content = data.get('content')
    if isinstance(content, str):
        content = json.loads(content)
    return {'corp_id': data.get('corpId', ''), 'user_id': data.get('userId', ''),
            'out_track_id': data.get('outTrackId', ''), 'content': content or {}}


class ApprovalCardHandler:
    """Stream 卡片回调：身份与白名单校验后写入唯一决定。"""

    def __init__(self, config, store: AuthStore):
        self.config = config
        self.store = store

    async def process_data(self, data):
        """返回 (code, response)；response 带 cardData 时平台实时刷新卡片。"""
        try:
            card = _parse_card_callback(data)
        except (ValueError, TypeError):
            return 400, {'error': 'bad payload'}
        if card['corp_id'] != self.config['DINGTALK_CORP_ID']:
            LOGGER.warning('拒绝非本企业的卡片回调 corp=%s', card['corp_id'])
            return 403, {'error': 'corp mismatch'}
        action = self._action(card)
        if action not in ('agree', 'reject'):
            return 200, {'error': 'unknown action'}
        decision = 'approved' if action == 'agree' else 'rejected'
        if card['user_id'] not in self.config['approvers']:
            # 非指定审批人：不改状态也不改卡片，点击后卡片保持原样
            LOGGER.info('非白名单点击 user=%s action=%s', card['user_id'][:6] + '…', action)
            return 200, {'error': 'not an approver'}
        outcome, request = self.store.decide_registration(
            card['out_track_id'], decision, card['corp_id'], card['user_id'])
        LOGGER.info('审批回调 outcome=%s request=%s', outcome,
                    (request or {}).get('id', '?')[:12])
        if outcome == 'unknown':
            return 404, {'error': 'unknown card'}
        return 200, {'cardData': {'cardParamMap': build_card_params(request)}}

    @staticmethod
    def _action(card):
        private = (card.get('content') or {}).get('cardPrivateData', {})
        for action_id in private.get('actionIds', []):
            if action_id in ('agree', 'reject'):
                return action_id
        return ''


class CardCallbackDispatcher:
    """单一 topic 分流；任务服务始终在装配时的主事件循环执行。"""

    def __init__(self, approval_handler, task_alerts, main_loop, timeout=20):
        self.approval_handler = approval_handler
        self.task_alerts = task_alerts
        self.main_loop = main_loop
        self.timeout = timeout
        self._closing = False
        self._lock = threading.Lock()
        self._pending = set()

    async def _process_task_callback(self, data):
        # 此处已经回到主循环；具体身份、卡片与任务绑定、幂等均由主服务复验。
        with self._lock:
            closing = self._closing
        if closing:
            return 503, {'error': 'task alerts stopping'}
        return await self.task_alerts.process_callback(data)

    def _forget(self, future):
        with self._lock:
            self._pending.discard(future)

    def close(self):
        """拒绝新任务回调并取消桥接等待，不等待或 join SDK 监听线程。"""
        with self._lock:
            self._closing = True
            pending = tuple(self._pending)
        for future in pending:
            future.cancel()

    async def process_data(self, data):
        try:
            card = _parse_card_callback(data)
            actions = (card['content'].get('cardPrivateData') or {}).get('actionIds', [])
        except (ValueError, TypeError, AttributeError):
            return 400, {'error': 'bad payload'}
        if (not isinstance(actions, list) or TASK_RESTART_ACTION not in actions
                or self.task_alerts is None):
            return await self.approval_handler.process_data(data)
        with self._lock:
            if (self._closing or self.main_loop.is_closed()
                    or not self.main_loop.is_running()):
                return 503, {'error': 'task alerts stopping'}
            coroutine = self._process_task_callback(data)
            try:
                future = asyncio.run_coroutine_threadsafe(coroutine, self.main_loop)
            except RuntimeError:
                coroutine.close()
                return 503, {'error': 'task alerts unavailable'}
            self._pending.add(future)
        future.add_done_callback(self._forget)
        try:
            return await asyncio.wait_for(asyncio.wrap_future(future), timeout=self.timeout)
        except asyncio.TimeoutError:
            # 不自行重试危险操作；返回已确认响应，后续状态由主服务的幂等记录决定。
            future.cancel()
            return 200, {'error': 'task callback timed out; do not retry automatically'}
        except asyncio.CancelledError:
            future.cancel()
            with self._lock:
                closing = self._closing
            if closing:
                return 503, {'error': 'task alerts stopping'}
            raise
        except Exception:
            # 服务异常不携带回调载荷或原始异常，防止泄露节点与凭据数据。
            return 500, {'error': 'task callback failed'}


def _run_stream_listener(config, store, handler=None):
    """独立线程运行 SDK 的阻塞循环；进程退出时随 daemon 线程终止。"""
    try:
        import dingtalk_stream
    except ImportError:  # pragma: no cover - 部署缺依赖时给出明确错误
        LOGGER.error('缺少 dingtalk-stream 依赖，注册审批回调不可用')
        return
    install_logging_redaction()

    handler = handler if handler is not None else ApprovalCardHandler(config, store)

    class _Bridge(dingtalk_stream.CallbackHandler):
        async def process(self, callback):
            return await handler.process_data(callback.data)

    credential = dingtalk_stream.Credential(config['DINGTALK_APP_KEY'],
                                            config['DINGTALK_APP_SECRET'])
    client = dingtalk_stream.DingTalkStreamClient(credential)
    client.register_callback_handler(CARD_TOPIC, _Bridge())
    LOGGER.info('钉钉审批 Stream 监听启动（白名单 %s）',
                ','.join(uid[:6] + '…' for uid in config['approvers']))
    try:
        client.start_forever()
    except Exception as exc:  # noqa: BLE001 线程顶层异常记录后退出，不拖垮服务
        LOGGER.exception('钉钉 Stream 监听异常退出: %s', exc)


def setup_dingtalk(app, store: AuthStore):
    """装配：配置齐全才启用；未配置时注册接口由 HTTP 层 fail-closed。"""
    config = load_dingtalk_config()
    if config is None:
        app['dingtalk'] = None
        LOGGER.info('未配置 DINGTALK_*，自主注册审批不启用')
        return
    install_logging_redaction()
    dispatcher = CardCallbackDispatcher(
        ApprovalCardHandler(config, store), app.get('task_alerts'), asyncio.get_running_loop())
    app['dingtalk'] = {'config': config, 'client': DingTalkClient(config),
                       'callback_handler': dispatcher}
    app['dingtalk']['listener'] = threading.Thread(
        target=_run_stream_listener, args=(config, store, dispatcher),
        name='dingtalk-stream', daemon=True)
    app['dingtalk']['listener'].start()
    app['dingtalk']['worker'] = asyncio.create_task(outbox_worker(app))


async def stop_dingtalk(app):
    module = app.get('dingtalk')
    if not module:
        return
    handler = module.get('callback_handler')
    if handler:
        handler.close()
    worker = module.get('worker')
    if worker:
        worker.cancel()
        try:
            await worker
        except asyncio.CancelledError:
            pass
