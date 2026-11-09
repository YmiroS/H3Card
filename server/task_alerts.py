"""生成任务超时告警：持久化一次性提醒、钉钉动作与受约束的服务重启。"""
import asyncio
import json
import logging
import math
import sqlite3
import threading
import time
import uuid
from pathlib import Path

import aiohttp

from server import dingtalk_approval as dingtalk

LOGGER = logging.getLogger('h3card.dingtalk')
THRESHOLD_SECONDS = 35 * 60
SCAN_SECONDS = 30
RESTART_ACTION = dingtalk.TASK_RESTART_ACTION


def _timestamp(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value) if math.isfinite(value) and value > 0 else None


def _text(value, fallback='未记录'):
    return value.strip()[:300] if isinstance(value, str) and value.strip() else fallback


class TaskAlertStore:
    """发卡状态和动作审计使用独立库，不改注册申请的外键和审批状态。"""

    def __init__(self, path):
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.execute('PRAGMA journal_mode=WAL')
        with self.db:
            self.db.executescript('''
                CREATE TABLE IF NOT EXISTS task_alerts (
                    job_id TEXT PRIMARY KEY,
                    out_track_id TEXT UNIQUE NOT NULL,
                    snapshot_json TEXT NOT NULL,
                    status TEXT NOT NULL,
                    message TEXT NOT NULL,
                    request_id TEXT UNIQUE,
                    actor_id TEXT,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL,
                    revision INTEGER NOT NULL DEFAULT 1,
                    sent_revision INTEGER NOT NULL DEFAULT 0,
                    delivered INTEGER NOT NULL DEFAULT 0,
                    retry_at REAL NOT NULL DEFAULT 0,
                    failures INTEGER NOT NULL DEFAULT 0,
                    claim_token TEXT,
                    claim_until REAL NOT NULL DEFAULT 0
                );
                CREATE INDEX IF NOT EXISTS task_alerts_delivery
                    ON task_alerts(retry_at, claim_until);
            ''')

    def close(self):
        with self.lock:
            self.db.close()

    def _begin(self):
        # 进程内锁不能保护另一个控制端连接；先获取SQLite写锁再读取并认领。
        if not self.db.in_transaction:
            self.db.execute('BEGIN IMMEDIATE')

    @staticmethod
    def _decode(row):
        if row is None:
            return None
        result = dict(row)
        result.update(json.loads(result.pop('snapshot_json')))
        return result

    def get(self, job_id=None, *, out_track_id=None):
        with self.lock:
            if out_track_id is not None:
                row = self.db.execute('SELECT * FROM task_alerts WHERE out_track_id=?',
                                      (out_track_id,)).fetchone()
            else:
                row = self.db.execute('SELECT * FROM task_alerts WHERE job_id=?',
                                      (job_id,)).fetchone()
            return self._decode(row)

    def create(self, snapshot, now):
        with self.lock, self.db:
            self._begin()
            self.db.execute('''INSERT OR IGNORE INTO task_alerts
                (job_id,out_track_id,snapshot_json,status,message,created_at,updated_at)
                VALUES(?,?,?,'alerting',?,?,?)''', (
                    snapshot['job_id'], 'task-alert-' + uuid.uuid4().hex,
                    json.dumps(snapshot, ensure_ascii=False),
                    snapshot.get('restart_reason') or '任务仍在运行；重启会中断当前任务。',
                    now, now))
            return self.get(snapshot['job_id'])

    def active(self):
        with self.lock:
            return [self._decode(row) for row in self.db.execute(
                "SELECT * FROM task_alerts WHERE status IN ('alerting','restart_pending','restart_running')")]

    def state(self, job_id, status, message, *, restart_enabled=False, expected_revision=None):
        now = time.time()
        with self.lock, self.db:
            self._begin()
            row = self.get(job_id)
            if row is None:
                return None
            if expected_revision is not None and row['revision'] != expected_revision:
                return row
            if (row['status'], row['message'], row['restart_enabled']) == (
                    status, message, restart_enabled):
                return row
            snapshot = json.loads(self.db.execute(
                'SELECT snapshot_json FROM task_alerts WHERE job_id=?', (job_id,)).fetchone()[0])
            snapshot['restart_enabled'] = restart_enabled
            self.db.execute('''UPDATE task_alerts SET status=?,message=?,snapshot_json=?,
                updated_at=?,revision=revision+1,retry_at=0,
                failures=CASE WHEN delivered=1 THEN 0 ELSE failures END WHERE job_id=?''',
                (status, message, json.dumps(snapshot, ensure_ascii=False), now, job_id))
            return self.get(job_id)

    def begin_restart(self, job_id, actor_id):
        with self.lock, self.db:
            self._begin()
            row = self.get(job_id)
            if (not row or row['status'] != 'alerting' or not row['restart_enabled']
                    or row['request_id'] is not None):
                return row
            self.db.execute('''UPDATE task_alerts SET request_id=?,actor_id=?
                WHERE job_id=?''', (uuid.uuid4().hex, actor_id, job_id))
            return self.state(job_id, 'restart_pending', '重启请求已记录，等待节点接收；尚未确认恢复。')

    def claim(self, now):
        token = uuid.uuid4().hex
        with self.lock, self.db:
            self._begin()
            row = self.db.execute('''SELECT * FROM task_alerts
                WHERE revision>sent_revision AND retry_at<=? AND claim_until<=?
                ORDER BY retry_at,created_at LIMIT 1''', (now, now)).fetchone()
            if row is None:
                return None
            self.db.execute('UPDATE task_alerts SET claim_token=?,claim_until=? WHERE job_id=?',
                            (token, now + 120, row['job_id']))
            result = self._decode(row)
            result['delivery_uncertain'] = bool(row['claim_token']) or row['failures'] > 0
            result['claim_token'] = token
            return result

    def finish_delivery(self, claimed, *, success, now):
        with self.lock, self.db:
            self._begin()
            row = self.db.execute('SELECT * FROM task_alerts WHERE job_id=? AND claim_token=?',
                                  (claimed['job_id'], claimed['claim_token'])).fetchone()
            if row is None:
                return
            if success:
                self.db.execute('''UPDATE task_alerts SET delivered=1,
                    sent_revision=MAX(sent_revision,?),retry_at=0,failures=0,
                    claim_token=NULL,claim_until=0 WHERE job_id=?''',
                    (claimed['revision'], claimed['job_id']))
            else:
                failures = row['failures'] + 1
                delay = min(30 * 2 ** min(failures - 1, 7), 3600)
                self.db.execute('''UPDATE task_alerts SET failures=?,retry_at=?,
                    claim_token=NULL,claim_until=0 WHERE job_id=?''',
                    (failures, now + delay, claimed['job_id']))

    def skip_unsent(self, claimed):
        """已结束且从未投递的任务不补发历史告警，保留去重墓碑。"""
        with self.lock, self.db:
            self.db.execute('''UPDATE task_alerts SET sent_revision=revision,
                claim_token=NULL,claim_until=0 WHERE job_id=? AND claim_token=? AND delivered=0''',
                (claimed['job_id'], claimed['claim_token']))


class TaskAlertService:
    def __init__(self, app, jobs_snapshot, path):
        self.app = app
        self.jobs_snapshot = jobs_snapshot
        self.path = path
        self.store = None
        self.config = None
        self.client = None
        self.session = None
        self.worker = None
        self.sender = None
        self.stopping = asyncio.Event()
        self.lock = asyncio.Lock()
        self.callbacks = set()
        self.closing = True

    async def start(self):
        module = self.app.get('dingtalk')
        if not module:
            return
        config = module['config']
        if not config.get('DINGTALK_TASK_ALERT_TEMPLATE_ID'):
            LOGGER.warning('未配置 DINGTALK_TASK_ALERT_TEMPLATE_ID，35分钟任务提醒未启用；注册审批不受影响')
            return
        self.config, self.client = config, module['client']
        self.store = await asyncio.to_thread(TaskAlertStore, self.path)
        self.session = aiohttp.ClientSession(timeout=dingtalk.HTTP_TIMEOUT, trust_env=False)
        self.closing = False
        self.worker = asyncio.create_task(self._run(), name='task-timeout-alerts')
        self.sender = asyncio.create_task(self._send(), name='task-alert-outbox')

    async def stop(self):
        self.closing = True
        self.stopping.set()
        await asyncio.gather(*(task for task in (self.worker, self.sender) if task is not None))
        if self.callbacks:
            await asyncio.gather(*list(self.callbacks), return_exceptions=True)
        if self.session:
            await self.session.close()
        if self.store:
            await asyncio.to_thread(self.store.close)
            self.store = None

    def _jobs(self):
        # 只在应用主循环读取任务；提示词、素材、凭据从不进入告警快照。
        keys = ('id', 'status', 'started', 'ended', 'worker_id', 'execution', 'executor',
                'name', 'capability', 'projectName', 'project', 'cardName', 'card')
        return {job['id']: {key: job.get(key) for key in keys}
                for job in self.jobs_snapshot() if isinstance(job.get('id'), str)}

    async def _execution(self, job):
        if not job or job.get('status') != 'running' or job.get('ended') is not None:
            return None
        execution = job.get('execution') or job.get('executor')
        external = execution in ('cloud_image', 'remote_sr')
        distributed = self.app.get('distributed')
        if distributed is not None and not external:
            return await asyncio.to_thread(distributed.job_execution, job['id'])
        started = _timestamp(job.get('started'))
        if started is None:
            return None
        machine = {'cloud_image': '云端 API', 'remote_sr': '远程超分服务'}.get(execution, '本机')
        return {'job_id': job['id'], 'worker_id': '', 'worker_name': machine,
                'attempt_id': '', 'started_at': started, 'restart_supported': False,
                'restart_reason': ('此任务由外部服务执行，不支持本地节点服务重启。' if external
                                   else '本机任务不提供远程节点重启，请在本机检查服务。')}

    async def _current(self, row):
        execution = await self._execution(self._jobs().get(row['job_id']))
        if not execution:
            return None
        if any(execution.get(key) != row.get(key) for key in (
                'worker_id', 'attempt_id', 'started_at')):
            return None
        return execution

    async def _change(self, row, status, message, *, restart_enabled=False):
        return await asyncio.to_thread(
            self.store.state, row['job_id'], status, message,
            restart_enabled=restart_enabled, expected_revision=row['revision'])

    async def _refresh(self, row):
        if self.closing:
            return row
        if row['status'] == 'alerting':
            execution = await self._current(row)
            if execution is None:
                return await self._change(row, 'expired',
                                          '原任务已结束、取消或执行身份已变化，不能从此告警重启。')
            enabled = execution.get('restart_supported') is True
            return await self._change(
                row, 'alerting',
                ('任务仍在运行；重启会中断当前任务。' if enabled else
                 execution.get('restart_reason') or '当前节点不支持安全重启。'),
                restart_enabled=enabled)
        if row['status'] in ('restart_pending', 'restart_running'):
            distributed = self.app.get('distributed')
            if distributed is None:
                return await self._change(row, 'restart_error', '控制端节点维护不可用，未执行重启。')
            result = await asyncio.to_thread(distributed.alert_restart_status, row['request_id'])
            if result is None:
                # 先持久化动作再发命令：进程在两步之间退出，也只恢复同一个请求。
                if await self._current(row) is None:
                    return await self._change(row, 'restart_error', '原任务已结束或执行身份变化，未执行重启。')
                try:
                    await asyncio.to_thread(distributed.request_alert_restart,
                                            row['worker_id'], row['job_id'],
                                            row['attempt_id'], row['request_id'])
                except (KeyError, ValueError, RuntimeError) as exc:
                    return await self._change(row, 'restart_error', str(exc)[:300])
                result = await asyncio.to_thread(distributed.alert_restart_status, row['request_id'])
            if result:
                statuses = {'pending': 'restart_pending', 'running': 'restart_running',
                            'done': 'restart_done', 'error': 'restart_error'}
                status = statuses.get(result['status'], 'restart_error')
                messages = {'restart_pending': '重启请求已提交，等待节点接收；尚未确认恢复。',
                            'restart_running': '节点正在重启服务；尚未确认恢复。',
                            'restart_done': '节点已确认 ComfyUI 和 Worker 服务恢复。',
                            'restart_error': '重启失败或尚未确认恢复，请检查节点。'}
                return await self._change(row, status, messages[status])
        return row

    async def _scan(self):
        now = time.time()
        for job in self._jobs().values():
            if self.closing:
                return
            if job['status'] != 'running':
                continue
            if await asyncio.to_thread(self.store.get, job['id']):
                continue
            execution = await self._execution(job)
            if not execution:
                continue
            started = _timestamp(execution.get('started_at'))
            if started is None or now - started <= THRESHOLD_SECONDS:
                continue
            submitters = await asyncio.to_thread(self.app['auth_store'].job_submitters, [job['id']])
            submitter = submitters.get(job['id'], {})
            username = _text(submitter.get('submitter_username'), '')
            display = _text(submitter.get('submitter_display_name'), '')
            person = f'{display}（{username}）' if display and username and display != username else (
                display or username or '未记录')
            snapshot = {
                'job_id': job['id'], 'worker_id': execution.get('worker_id') or '',
                'worker_name': _text(execution.get('worker_name')),
                'attempt_id': execution.get('attempt_id') or '', 'started_at': started,
                'elapsed_seconds': int(now - started),
                'task_name': _text(job.get('name'), _text(job.get('capability'))),
                'project_name': _text(job.get('projectName'), _text(job.get('project'))),
                'card_id': _text(job.get('card')), 'submitter': person,
                'restart_enabled': execution.get('restart_supported') is True,
                'restart_reason': execution.get('restart_reason') or '',
            }
            await asyncio.to_thread(self.store.create, snapshot, now)

    async def run_once(self):
        await self._synchronize()
        await self._deliver_pending()

    async def _synchronize(self):
        if self.closing or self.store is None:
            return
        async with self.lock:
            await self._scan()
            for row in await asyncio.to_thread(self.store.active):
                await self._refresh(row)

    async def _deliver_pending(self):
        if self.closing or self.store is None:
            return
        # 投递独立运行，钉钉慢请求不推迟35分钟扫描；网络等待不占用动作锁。
        for _ in range(20):
            if self.closing:
                return
            claimed = await asyncio.to_thread(self.store.claim, time.time())
            if claimed is None:
                return
            async with self.lock:
                current = await self._refresh(await asyncio.to_thread(self.store.get, claimed['job_id']))
                # 网络在途时版本可能变化，完成只确认实际发出的版本，下一轮补更。
                current['claim_token'] = claimed['claim_token']
                current['delivery_uncertain'] = claimed['delivery_uncertain']
                claimed = current
                if (not claimed['delivered'] and not claimed['delivery_uncertain']
                        and claimed['status'] == 'expired'):
                    await asyncio.to_thread(self.store.skip_unsent, claimed)
                    continue
            try:
                if claimed['delivered'] or claimed['status'] == 'expired':
                    # 可能已经发出的过期卡只更新并重试，绝不重新创建历史告警。
                    await self.client.update_task_alert(self.session, claimed)
                elif claimed['delivery_uncertain']:
                    # 首次发卡可能已成功但响应丢失；先尝试更新同一实例，再以同一ID补发。
                    try:
                        await self.client.update_task_alert(self.session, claimed)
                    except Exception:  # noqa: BLE001 未确认既有实例，仍使用原outTrackId投递
                        await self.client.deliver_task_alert(self.session, claimed)
                else:
                    await self.client.deliver_task_alert(self.session, claimed)
            except Exception as exc:  # noqa: BLE001 单张卡失败不阻断其他任务
                LOGGER.warning('任务告警投递失败 job=%s error=%s', claimed['job_id'], type(exc).__name__)
                await asyncio.to_thread(self.store.finish_delivery, claimed,
                                        success=False, now=time.time())
            else:
                await asyncio.to_thread(self.store.finish_delivery, claimed,
                                        success=True, now=time.time())

    async def _run(self):
        while not self.closing:
            try:
                await self._synchronize()
            except Exception as exc:  # noqa: BLE001 后台扫描失败不能退出永久告警
                LOGGER.error('任务告警扫描失败：%s', type(exc).__name__)
            try:
                await asyncio.wait_for(self.stopping.wait(), timeout=SCAN_SECONDS)
            except asyncio.TimeoutError:
                pass

    async def _send(self):
        while not self.closing:
            try:
                await self._deliver_pending()
            except Exception as exc:  # noqa: BLE001 发件箱异常不阻断后续投递
                LOGGER.error('任务告警发件箱失败：%s', type(exc).__name__)
            try:
                await asyncio.wait_for(self.stopping.wait(), timeout=2)
            except asyncio.TimeoutError:
                pass

    async def process_callback(self, data):
        if (self.closing or self.store is None
                or self.app.get('lifecycle', {}).get('shutting_down')):
            return 503, {'error': 'task alerts unavailable'}
        # SDK等待超时或关闭桥接不取消已受理动作；关服会等待此任务结束再关数据库。
        task = asyncio.create_task(self._process_callback(data))
        self.callbacks.add(task)
        task.add_done_callback(self._callback_finished)
        return await asyncio.shield(task)

    def _callback_finished(self, task):
        self.callbacks.discard(task)
        if not task.cancelled() and task.exception() is not None:
            LOGGER.error('任务告警动作处理失败：%s', type(task.exception()).__name__)

    async def _process_callback(self, data):
        try:
            card = dingtalk._parse_card_callback(data)
            content = card['content']
            private = content.get('cardPrivateData', {})
            actions = private.get('actionIds', [])
            if not isinstance(actions, list):
                raise ValueError('动作必须为数组')
        except (ValueError, TypeError, AttributeError):
            return 400, {'error': 'bad payload'}
        if card['corp_id'] != self.config['DINGTALK_CORP_ID']:
            return 403, {'error': 'corp mismatch'}
        if card['user_id'] not in self.config['approvers']:
            return 403, {'error': 'not an approver'}
        if actions != [RESTART_ACTION]:
            return 400, {'error': 'unknown action'}
        track = card['out_track_id']
        if not isinstance(track, str) or not track.startswith('task-alert-'):
            return 404, {'error': 'unknown card'}
        async with self.lock:
            if self.closing or self.app.get('lifecycle', {}).get('shutting_down'):
                return 503, {'error': 'task alerts unavailable'}
            row = await asyncio.to_thread(self.store.get, out_track_id=track)
            if row is None:
                return 404, {'error': 'unknown card'}
            row = await self._refresh(row)
            if row['status'] == 'alerting' and row['restart_enabled']:
                row = await asyncio.to_thread(self.store.begin_restart, row['job_id'], card['user_id'])
                row = await self._refresh(row)
            return 200, {'cardData': {'cardParamMap': dingtalk.build_task_alert_params(row)}}
