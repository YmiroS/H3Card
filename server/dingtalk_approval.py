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
               'DINGTALK_CARD_TEMPLATE_ID', 'DINGTALK_ROBOT_CODE')}
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
            body = await response.json(content_type=None)
            if response.status != 200 or not body.get('accessToken'):
                raise RuntimeError(f"获取钉钉 token 失败 HTTP {response.status}")
            self._token = body['accessToken']
            # expireIn 秒，提前 5 分钟失效
            self._token_expires = time.time() + max(body.get('expireIn', 7200) - 300, 60)
            return self._token

    async def deliver_card(self, session, request_row):
        token = await self._get_token(session)
        body = {
            'cardTemplateId': self.config['DINGTALK_CARD_TEMPLATE_ID'],
            'outTrackId': request_row['out_track_id'],
            'cardData': {'cardParamMap': build_card_params(request_row)},
            'callbackType': 'STREAM',
            'openSpaceId': f"dtv1.card//IM_GROUP.{self.config['DINGTALK_GROUP_CONVERSATION_ID']}",
            'imGroupOpenSpaceModel': {'supportForward': False},
            'imGroupOpenDeliverModel': {'robotCode': self.config['DINGTALK_ROBOT_CODE']},
        }
        async with session.post(f'{OPENAPI}/v1.0/card/instances/createAndDeliver',
                                headers={'x-acs-dingtalk-access-token': token},
                                json=body) as response:
            if response.status != 200:
                raise RuntimeError(f"发卡失败 HTTP {response.status}: {(await response.text())[:200]}")

    async def update_card(self, session, request_row):
        token = await self._get_token(session)
        body = {
            'outTrackId': request_row['out_track_id'],
            'cardData': {'cardParamMap': build_card_params(request_row)},
        }
        async with session.put(f'{OPENAPI}/v1.0/card/instances',
                               headers={'x-acs-dingtalk-access-token': token},
                               json=body) as response:
            if response.status != 200:
                raise RuntimeError(f"更新卡片失败 HTTP {response.status}: {(await response.text())[:200]}")


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


def _run_stream_listener(config, store):
    """独立线程运行 SDK 的阻塞循环；进程退出时随 daemon 线程终止。"""
    try:
        import dingtalk_stream
    except ImportError:  # pragma: no cover - 部署缺依赖时给出明确错误
        LOGGER.error('缺少 dingtalk-stream 依赖，注册审批回调不可用')
        return
    install_logging_redaction()

    handler = ApprovalCardHandler(config, store)

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
    app['dingtalk'] = {'config': config, 'client': DingTalkClient(config)}
    app['dingtalk']['listener'] = threading.Thread(
        target=_run_stream_listener, args=(config, store),
        name='dingtalk-stream', daemon=True)
    app['dingtalk']['listener'].start()
    app['dingtalk']['worker'] = asyncio.create_task(outbox_worker(app))


async def stop_dingtalk(app):
    module = app.get('dingtalk')
    if not module:
        return
    worker = module.get('worker')
    if worker:
        worker.cancel()
        try:
            await worker
        except asyncio.CancelledError:
            pass
