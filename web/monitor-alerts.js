(function (root) {
  'use strict';
  const LIMIT = 200;
  const text = value => typeof value === 'string' ? value.slice(0, 800) : '';
  const clone = value => JSON.parse(JSON.stringify(value));

  function create(options = {}) {
    const now = options.now || (() => Date.now() / 1000);
    const storage = options.storage;
    const key = options.key || 'h3-monitor-alerts';
    let events = [], states = new Map(), seen = new Set(), candidates = new Map();
    let initialized = false, sequence = 0, dropped = 0, persistenceAvailable = !!storage;
    let failureSince = null, failures = 0, lastSuccess = null;
    try {
      const raw = storage && storage.getItem(key);
      if (raw && raw.length <= 2000000) {
        const saved = JSON.parse(raw);
        if (saved.version === 1 && Array.isArray(saved.events) && Array.isArray(saved.states) && Array.isArray(saved.seen)) {
          events = saved.events.filter(e => e && typeof e.id === 'string' && typeof e.key === 'string'
            && ['task', 'offline', 'comfy', 'sync', 'connection'].includes(e.kind)
            && typeof e.ack === 'boolean' && typeof e.active === 'boolean' && Number.isFinite(e.at))
            .slice(-LIMIT).map(e => ({id: text(e.id), key: text(e.key), kind: e.kind,
              sourceId: text(e.sourceId), title: text(e.title), detail: text(e.detail), at: e.at,
              ack: e.ack, active: e.active,
              status: ['failed', 'ongoing', 'recovered', 'unknown', 'archived'].includes(e.status) ? e.status : 'unknown',
              recoveredAt: Number.isFinite(e.recoveredAt) ? e.recoveredAt : null,
              meta: Object.fromEntries(['workerName', 'hostname', 'jobId', 'projectName', 'cardName', 'submitter', 'mode'].map(k => [k, text(e.meta && e.meta[k])]))}));
          states = new Map(saved.states.slice(-2000).filter(pair => Array.isArray(pair) && typeof pair[0] === 'string'
            && pair[1] && typeof pair[1].id === 'string').map(([k, v]) => [text(k), {id: text(v.id)}]));
          seen = new Set(saved.seen.slice(-1000).filter(v => typeof v === 'string').map(text));
          sequence = Number.isSafeInteger(saved.sequence) && saved.sequence >= 0 ? saved.sequence : 0;
          dropped = Number.isSafeInteger(saved.dropped) && saved.dropped >= 0 ? saved.dropped : 0;
          initialized = true;
        }
      }
    } catch (_) { persistenceAvailable = false; }

    function save() {
      while (seen.size > 1000) seen.delete(seen.values().next().value);
      // 保留当前故障的去重状态，即使其历史记录已从本屏容量中淘汰。
      while (states.size > 2000) states.delete(states.keys().next().value);
      if (!persistenceAvailable) return;
      try { storage.setItem(key, JSON.stringify({version: 1, events, states: [...states], seen: [...seen], sequence, dropped})); }
      catch (_) { persistenceAvailable = false; }
    }
    function add(kind, sourceId, title, detail, meta, ack, newIds, eventKey) {
      const e = {id: `${++sequence}-${now()}`, key: eventKey, kind, sourceId, title, detail,
        meta, at: now(), ack, active: true, status: kind === 'task' ? 'failed' : 'ongoing', recoveredAt: null};
      events.push(e);
      if (events.length > LIMIT) { events.shift(); dropped++; }
      if (!ack) newIds.push(e.id);
      return e;
    }
    function transition(eventKey, condition, data, initial, newIds) {
      const prior = states.get(eventKey);
      const event = prior && events.find(e => e.id === prior.id);
      if (condition === 'unknown') {
        candidates.delete(eventKey);
        if (event && event.active) event.status = 'unknown';
        return;
      }
      if (condition === 'clear') {
        candidates.delete(eventKey);
        if (event && event.active) { event.active = false; event.status = 'recovered'; event.recoveredAt = now(); }
        states.delete(eventKey);
        return;
      }
      if (prior) { if (event) event.status = 'ongoing'; return; }
      if (data.kind === 'comfy' && !initial) {
        if (!candidates.has(eventKey)) candidates.set(eventKey, now());
        if (now() - candidates.get(eventKey) < 10) return;
      }
      candidates.delete(eventKey);
      const e = add(data.kind, data.sourceId, data.title, data.detail, data.meta, initial, newIds, eventKey);
      states.set(eventKey, {id: e.id});
    }
    function result(newIds) { save(); return {events: clone(events), newIds}; }
    function observe(summary) {
      const newIds = [], initial = !initialized;
      const timestamp = Number.isFinite(summary.health?.server_time) ? summary.health.server_time : now();
      // 页面休眠或长时间没有成功采样，不能把间隔当作服务持续异常的证据。
      if (lastSuccess !== null && (now() - lastSuccess > 15 || now() < lastSuccess)) candidates.clear();
      lastSuccess = now();
      failures = 0; failureSince = null;
      transition('connection', 'clear', {}, initial, newIds);
      if (Array.isArray(summary.jobs)) {
        const current = new Set();
        for (const job of summary.jobs) {
          if (!job || !job.id) continue;
          const eventKey = JSON.stringify(['task', String(job.id), job.ended || job.created || 0]);
          current.add(eventKey);
          if (job.status !== 'error' || seen.has(eventKey)) continue;
          seen.add(eventKey);
          add('task', text(job.id), '任务执行失败', text(job.error) || '任务执行失败，请联系管理员查看日志。',
            {jobId: text(job.id), projectName: text(job.projectName), cardName: text(job.cardName || job.name),
              submitter: text(job.submitter_display_name || job.submitter_username), mode: text(job.capability),
              workerName: text((summary.workers || []).find(w => w.id === job.worker_id)?.name), hostname: ''},
            initial, newIds, eventKey);
        }
        for (const event of events) {
          if (event.kind === 'task') {
            event.active = current.has(event.key);
            event.status = event.active ? 'failed' : 'archived';
          }
        }
      }
      if (Array.isArray(summary.workers)) {
        const touched = new Set();
        for (const worker of summary.workers) {
          if (!worker || !worker.id) continue;
          const id = text(worker.id), name = text(worker.name) || id;
          const meta = {workerName: name, hostname: text(worker.capabilities?.telemetry?.hostname), jobId: text(worker.current_job_id)};
          const fresh = Number.isFinite(worker.last_seen) && timestamp - worker.last_seen <= 60 && timestamp >= worker.last_seen - 60;
          const enabled = worker.enabled === true || worker.enabled === 1;
          const online = fresh && !['offline', 'disabled'].includes(worker.state);
          const maintenance = ['pending', 'running'].includes(worker.sync_status);
          const conditions = {
            offline: !enabled ? 'unknown' : worker.state === 'offline' ? 'active' : online ? 'clear' : 'unknown',
            comfy: !enabled || !online || maintenance ? 'unknown' : worker.comfy_online === false || worker.comfy_online === 0 ? 'active' : worker.comfy_online === true || worker.comfy_online === 1 ? 'clear' : 'unknown',
            sync: worker.is_primary_node ? 'unknown' : worker.sync_status === 'error' ? 'active' : ['done', 'idle'].includes(worker.sync_status) ? 'clear' : 'unknown'
          };
          const descriptions = {
            offline: ['执行端离线', '执行端心跳超时，当前状态不可确认；请管理员检查主机与网络。'],
            comfy: ['ComfyUI 服务异常', '主机仍在线，但 ComfyUI 持续不可用；请管理员检查服务。'],
            sync: ['模型或配置同步失败', '同步明确返回失败，请管理员核查目标文件和执行端日志。']
          };
          for (const kind of ['offline', 'comfy', 'sync']) {
            const eventKey = JSON.stringify([kind, id]);
            touched.add(eventKey);
            transition(eventKey, conditions[kind], {kind, sourceId: id, title: `${name} · ${descriptions[kind][0]}`,
              detail: `${descriptions[kind][1]}${worker.current_job_id ? '' : ' 无关联任务。'}`, meta}, initial, newIds);
          }
        }
        for (const eventKey of new Set([...states.keys(), ...candidates.keys()])) {
          if (eventKey !== 'connection' && !touched.has(eventKey)) transition(eventKey, 'unknown', {}, initial, newIds);
        }
      }
      initialized = true;
      return result(newIds);
    }
    function connectionFailed() {
      const newIds = [];
      if (failureSince === null) failureSince = now();
      failures++;
      candidates.clear();
      for (const event of events) if (event.kind !== 'task' && event.active && event.kind !== 'connection') event.status = 'unknown';
      if (failures >= 2 && now() - failureSince >= 10) {
        transition('connection', 'active', {kind: 'connection', sourceId: 'monitor', title: '监控连接中断',
          detail: '无法取得最新监控快照；不能据此认定所有 Windows 执行端离线。恢复连接后将重新核对状态。', meta: {}}, false, newIds);
      }
      return result(newIds);
    }
    return {observe, connectionFailed,
      getEvents: () => clone(events),
      acknowledge(ids) { const selected = new Set(ids); events.forEach(e => { if (selected.has(e.id)) e.ack = true; }); save(); },
      clear() {
        events = []; states.clear(); seen.clear(); candidates.clear(); initialized = false;
        sequence = 0; dropped = 0; failureSince = null; failures = 0; lastSuccess = null;
        try { if (storage) storage.removeItem(key); } catch (_) { persistenceAvailable = false; }
      },
      get persistenceAvailable() { return persistenceAvailable; },
      get dropped() { return dropped; }
    };
  }
  root.MonitorAlerts = {create};
  if (typeof module !== 'undefined' && module.exports) module.exports = root.MonitorAlerts;
})(globalThis);
