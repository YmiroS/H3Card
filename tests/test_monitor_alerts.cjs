const test = require('node:test');
const assert = require('node:assert/strict');
// Test the engine shipped to /monitor; isolated snapshots need only web_dist, not frontend/.
let create;
test.before(async () => {
  ({create} = await require('./helpers/admin-built-resources.cjs').loadAlertEngine());
});
function fixture() {
  let time = 1000;
  const values = new Map();
  const storage = {getItem: k => values.get(k), setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)};
  const options = {storage, key: 'account-1', now: () => time};
  const tracker = create(options);
  const worker = {id: 'w1', name: '测试机器', enabled: true, state: 'idle', last_seen: time, comfy_online: true, sync_status: 'idle'};
  const summary = {workers: [worker], jobs: []};
  return {tracker, options, values, worker, summary, tick(n = 5) { time += n; worker.last_seen = time; }};
}
function failJob(id) { return {id, status: 'error', created: 100, ended: 110, error: '执行失败', projectName: '项目', cardName: '卡片'}; }

test('历史异常已知晓，新失败弹窗且持续去重，确认不改变故障', () => {
  const f = fixture(); f.summary.jobs.push(failJob('old'));
  assert.deepEqual(f.tracker.observe(f.summary).newIds, []);
  assert.equal(f.tracker.getEvents()[0].ack, true);
  f.summary.jobs.push(failJob('new'));
  const r = f.tracker.observe(f.summary); assert.equal(r.newIds.length, 1);
  assert.deepEqual(f.tracker.observe(f.summary).newIds, []);
  f.tracker.acknowledge(r.newIds);
  assert.equal(f.tracker.getEvents()[1].active, true);
  assert.equal(f.tracker.getEvents()[1].status, 'failed');
});

test('四类异常聚合，无关联任务设备仍告警，服务不误改任务', () => {
  const f = fixture(); f.tracker.observe(f.summary);
  f.summary.workers.push({...f.worker, id: 'w2', name: '离线机器', state: 'offline'});
  f.worker.comfy_online = false; f.worker.sync_status = 'error';
  f.summary.jobs.push(failJob('job'));
  assert.equal(f.tracker.observe(f.summary).newIds.length, 3);
  f.tick(10); assert.equal(f.tracker.observe(f.summary).newIds.length, 1);
  assert.deepEqual(new Set(f.tracker.getEvents().map(e => e.kind)), new Set(['task', 'offline', 'comfy', 'sync']));
  assert.ok(f.tracker.getEvents().filter(e => e.kind !== 'task').every(e => e.detail.includes('无关联任务')));
  assert.equal(f.summary.jobs[0].status, 'error');
});

test('恢复不自动知晓，恢复复发为新事件，旧失败任务不变', () => {
  const f = fixture(); f.tracker.observe(f.summary);
  f.worker.state = 'offline'; f.summary.jobs.push(failJob('job'));
  const r = f.tracker.observe(f.summary);
  f.worker.state = 'idle'; f.tick(); f.tracker.observe(f.summary);
  const old = f.tracker.getEvents().find(e => e.kind === 'offline');
  assert.equal(old.ack, false); assert.equal(old.active, false); assert.equal(old.recoveredAt, 1005);
  assert.equal(f.tracker.getEvents().find(e => e.kind === 'task').status, 'failed');
  f.worker.state = 'offline';
  const next = f.tracker.observe(f.summary); assert.equal(next.newIds.length, 1);
  assert.ok(!r.newIds.includes(next.newIds[0]));
});

test('ComfyUI短暂不可用及维护不报警，未知不伪造恢复', () => {
  const f = fixture(); f.tracker.observe(f.summary);
  f.worker.comfy_online = false; f.tracker.observe(f.summary); f.tick(5);
  f.worker.sync_status = 'running'; f.tracker.observe(f.summary); f.tick(20);
  f.worker.sync_status = 'done'; assert.equal(f.tracker.observe(f.summary).newIds.length, 0);
  f.tick(10); assert.equal(f.tracker.observe(f.summary).newIds.length, 1);
  f.worker.state = 'offline'; f.tracker.observe(f.summary);
  const event = f.tracker.getEvents().find(e => e.kind === 'comfy');
  assert.equal(event.status, 'unknown'); assert.equal(event.active, true); assert.equal(event.recoveredAt, null);
  f.worker.state = 'idle'; f.worker.comfy_online = true;
  f.tracker.observe(f.summary); assert.equal(f.tracker.getEvents().find(e => e.kind === 'comfy').status, 'recovered');
});

test('过期心跳、禁用、同步维护和缺失状态不制造服务恢复', () => {
  const f = fixture(); f.worker.comfy_online = false; f.tracker.observe(f.summary);
  for (const patch of [{last_seen: 1}, {enabled: false}, {sync_status: 'pending'}, {comfy_online: null}]) {
    Object.assign(f.worker, {last_seen: 1000, enabled: true, sync_status: 'idle', comfy_online: false}, patch);
    f.tracker.observe(f.summary);
    assert.equal(f.tracker.getEvents()[0].status, 'unknown');
    assert.equal(f.tracker.getEvents()[0].recoveredAt, null);
  }
});

test('同步进行中不是恢复，完成后再次error才产生复发', () => {
  const f = fixture(); f.tracker.observe(f.summary); f.worker.sync_status = 'error';
  f.tracker.observe(f.summary); f.worker.sync_status = 'running'; f.tracker.observe(f.summary);
  assert.equal(f.tracker.getEvents()[0].active, true);
  f.worker.sync_status = 'error'; assert.equal(f.tracker.observe(f.summary).newIds.length, 0);
  f.worker.sync_status = 'done'; f.tracker.observe(f.summary);
  f.worker.sync_status = 'error'; assert.equal(f.tracker.observe(f.summary).newIds.length, 1);
});

test('连接断网单独防抖，恢复保留未读且支持复发', () => {
  const f = fixture(); f.tracker.observe(f.summary);
  assert.equal(f.tracker.connectionFailed().newIds.length, 0); f.tick(5);
  assert.equal(f.tracker.connectionFailed().newIds.length, 0); f.tick(5);
  assert.equal(f.tracker.connectionFailed().newIds.length, 1);
  assert.equal(f.tracker.connectionFailed().newIds.length, 0);
  f.tracker.observe(f.summary);
  assert.equal(f.tracker.getEvents()[0].ack, false); assert.equal(f.tracker.getEvents()[0].status, 'recovered');
  f.tracker.connectionFailed(); f.tick(10); assert.equal(f.tracker.connectionFailed().newIds.length, 1);
  assert.equal(f.worker.state, 'idle');
});

test('网络错误打断Comfy持续采样，节点消失不视为恢复', () => {
  const f = fixture(); f.tracker.observe(f.summary); f.worker.comfy_online = false;
  f.tracker.observe(f.summary); f.tick(8); f.tracker.connectionFailed(); f.tick(8);
  assert.equal(f.tracker.observe(f.summary).newIds.length, 0); f.tick(10);
  assert.equal(f.tracker.observe(f.summary).newIds.length, 1);
  f.summary.workers = []; f.tracker.observe(f.summary);
  assert.equal(f.tracker.getEvents()[0].status, 'unknown'); assert.equal(f.tracker.getEvents()[0].active, true);
});

test('本屏持久化按账号隔离，重开不重复提醒，清除缓存', () => {
  const f = fixture(); f.tracker.observe(f.summary); f.worker.state = 'offline';
  f.tracker.observe(f.summary);
  const reopened = create(f.options);
  assert.equal(reopened.observe(f.summary).newIds.length, 0); assert.equal(reopened.getEvents()[0].ack, false);
  const other = create({...f.options, key: 'account-2'}); assert.equal(other.getEvents().length, 0);
  reopened.clear(); assert.equal(f.values.has('account-1'), false); assert.equal(reopened.getEvents().length, 0);
});

test('休眠间隔不能作为连续采样，服务端时间避免本机时钟偏差', () => {
  const f = fixture(); f.tracker.observe(f.summary); f.worker.comfy_online = false;
  f.tracker.observe(f.summary); f.tick(300);
  assert.equal(f.tracker.observe(f.summary).newIds.length, 0);
  f.tick(10); assert.equal(f.tracker.observe(f.summary).newIds.length, 1);
  const g = fixture(); g.summary.health = {server_time: 9000}; g.worker.last_seen = 9000;
  g.worker.comfy_online = false; g.tracker.observe(g.summary);
  assert.equal(g.tracker.getEvents()[0].kind, 'comfy');
});

test('存储不可用或内容损坏时降级，不阻断新告警', () => {
  for (const storage of [{getItem() { throw Error('denied'); }}, {getItem: () => '{', setItem() {}}, {getItem: () => null, setItem() { throw Error('full'); }}]) {
    const tracker = create({storage}); tracker.observe({jobs: [], workers: []});
    assert.equal(tracker.observe({jobs: [failJob('j')], workers: []}).newIds.length, 1);
    assert.equal(tracker.persistenceAvailable, false);
    tracker.clear();
  }
});

test('事件容量200、任务去重1000有界，淘汰设备事件不重复弹窗', () => {
  const f = fixture(); f.tracker.observe(f.summary); f.worker.state = 'offline'; f.tracker.observe(f.summary);
  for (let i = 0; i < 1100; i++) { f.summary.jobs = [failJob(`j${i}`)]; f.tracker.observe(f.summary); }
  assert.equal(f.tracker.getEvents().length, 200); assert.equal(f.tracker.dropped, 901);
  assert.equal(f.tracker.observe(f.summary).newIds.length, 0);
  const saved = JSON.parse(f.values.get('account-1')); assert.equal(saved.seen.length, 1000);
  const reopened = create(f.options); assert.equal(reopened.observe(f.summary).newIds.length, 0);
});

test('任务移出近期窗口归档而不是恢复，成功任务不报警，快照不可从外部修改', () => {
  const f = fixture(); f.summary.jobs = [failJob('j')]; f.tracker.observe(f.summary);
  f.summary.jobs = [{id: 'ok', status: 'done'}]; assert.equal(f.tracker.observe(f.summary).newIds.length, 0);
  assert.equal(f.tracker.getEvents()[0].status, 'archived'); assert.equal(f.tracker.getEvents()[0].recoveredAt, null);
  const events = f.tracker.getEvents(); events[0].ack = false;
  assert.equal(f.tracker.getEvents()[0].ack, true);
});
