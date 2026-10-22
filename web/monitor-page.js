/* 专用只读监控页。故障判定与持久化由 MonitorAlerts 负责，页面不推断恢复或生成演示事件。 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const E = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const number = value => value == null || value === '' || typeof value === 'boolean' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
  const known = value => number(value) == null ? '未获取' : String(value);
  const text = value => value == null || value === '' ? '未记录' : String(value);
  const when = value => number(value) == null ? '未记录' : new Date(Number(value) * 1000).toLocaleString('zh-CN', {hour12:false});
  const duration = value => number(value) == null || value < 0 ? '未记录' : value < 60 ? `${Math.floor(value)}秒` : value < 3600 ? `${Math.floor(value / 60)}分${Math.floor(value % 60)}秒` : `${Math.floor(value / 3600)}小时${Math.floor(value % 3600 / 60)}分`;
  const bytes = value => number(value) == null ? '未采集' : value >= 1024 ** 3 ? `${(value / 1024 ** 3).toFixed(1)} GB` : value >= 1024 ** 2 ? `${(value / 1024 ** 2).toFixed(0)} MB` : `${Math.round(value / 1024)} KB`;
  const STATUS = {idle:'空闲',busy:'运行中',syncing:'正在同步',offline:'离线',disabled:'已禁用',error:'失败',failed:'失败',queued:'排队中',assigned:'已分配',running:'运行中',done:'已完成',canceled:'已取消',cancel_requested:'正在取消'};
  const SYNC = {idle:'尚未同步',pending:'等待空闲',running:'同步进行中',done:'同步完成',error:'同步失败',failed:'同步失败'};
  const KINDS = {task:'任务失败',offline:'执行端离线',comfy:'ComfyUI 服务',sync:'模型 / 配置同步',connection:'监控连接'};
  const EVENT_STATUS = {failed:'任务失败',ongoing:'故障持续',recovered:'已恢复',unknown:'状态未知',archived:'已归档'};
  const sub = value => `<span class="sub">${E(value)}</span>`;
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const definition = fields => fields.map(([label,value]) => `<dt>${E(label)}</dt><dd>${E(text(value))}</dd>`).join('');
  let snapshot = null, receivedAt = 0, stale = true, user = null, engine = null, events = [], engineError = '';
  let storageKey = null, storage = null, stopped = false, busy = false, pollTimer = null, clockTimer = null, failureCount = 0;
  let refreshSequence = 0, refreshController = null, resumePending = false, detailSequence = 0, detailController = null, detailIdleTimer = null;
  let detail = null, selectedEvent = null, displayedUnread = [], toastTimer = null;
  let detailTrigger = null, alertTrigger = null;
  const controllers = new Set();
  const nativeFetch = window.fetch.bind(window);
  const now = () => number(snapshot?.health?.server_time) == null ? Date.now() / 1000 : Number(snapshot.health.server_time) + (Date.now() - receivedAt) / 1000;
  const offline = worker => worker?.state === 'offline';
  const fresh = worker => {
    const at = number(worker?.capabilities?.telemetry?.collected_at);
    return !stale && !document.hidden && !offline(worker) && at != null && now() - at >= -10 && now() - at <= 60;
  };
  const gpuList = worker => {
    const caps = worker?.capabilities || {};
    if (Array.isArray(caps.telemetry?.gpus) && caps.telemetry.gpus.length) return caps.telemetry.gpus;
    return Array.isArray(caps.devices) ? caps.devices.map(d => ({index:d.index, name:d.name || d.device_name || d.type, memory_total_bytes:d.vram_total})) : [];
  };
  const workerName = id => snapshot?.workers.find(w => w.id === id)?.name || id || '未分配';
  const tone = state => ['idle','done','recovered'].includes(state) ? 'idle' : ['offline','error','failed','ongoing'].includes(state) ? 'error' : ['busy','running','queued','assigned','syncing'].includes(state) ? 'busy' : '';

  function clearStorage() {
    try { engine?.clear(); } catch { /* 撤权清屏不依赖存储可写。 */ }
    try { if (storageKey) (storage || window.localStorage).removeItem(storageKey); } catch { /* 浏览器可能禁用存储。 */ }
  }
  function stopRequests() {
    stopped = true; refreshSequence++; detailSequence++;
    clearTimeout(pollTimer); clearInterval(clockTimer); clearTimeout(detailIdleTimer); clearTimeout(toastTimer);
    controllers.forEach(c => c.abort()); controllers.clear();
    refreshController?.abort(); detailController?.abort();
  }
  function lock(message) {
    stopRequests(); clearStorage();
    snapshot = null; receivedAt = 0; events = []; displayedUnread = []; selectedEvent = null; engine = null; detail = null; user = null;
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    for (const id of ['worker-rows','job-rows','detail-body','alert-events','event-detail','attention-list','config-rows','monitor-account','refresh-stamp','ack-summary','service-note','online-note','comfy-note','job-note','job-total','worker-count','unread-title','persistence-note']) $(id).replaceChildren();
    for (const id of ['service-value','online-value','running-value','queued-value','comfy-value','incident-value','attention-count']) $(id).textContent = '—';
    $('detail-title').textContent = '只读详情'; $('alert-title').textContent = '运行异常提醒'; $('alert-description').textContent = '';
    $('snapshot-content').hidden = true; $('connection').hidden = true; $('unread-banner').hidden = true; $('toast').hidden = true;
    $('alerts-open').disabled = $('attention-open').disabled = $('refresh').disabled = $('logout').disabled = true;
    $('alert-label').textContent = '异常记录'; $('access-message').textContent = message; $('access-denied').hidden = false;
    $('main').removeAttribute('aria-busy');
  }
  const authFailure = error => {
    if (![401,403].includes(error?.status)) return false;
    lock(error.status === 401 ? '登录已失效。显示内容和本屏提醒已清除，请重新登录。' : '当前账号无权查看监控。显示内容和本屏提醒已清除。');
    return true;
  };

  // 页面级传输边界也覆盖 requireUser/json 内部的认证请求：15 秒包含读取响应体。
  // 普通管理页的 presence/health 等旁路不会从此专用页发到服务器。
  window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
    const method = (options.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const allowed = url.origin === location.origin && (
      method === 'GET' && (url.pathname === '/api/auth/me' || url.pathname === '/api/monitor/summary' || /^\/api\/monitor\/workers\/[^/]+(?:\/temperature)?$/.test(url.pathname)) ||
      method === 'POST' && url.pathname === '/api/auth/logout'
    );
    if (!allowed) throw new Error('只读监控不调用此接口');
    if (stopped && url.pathname !== '/api/auth/logout') throw new Error('监控已停止');
    if (document.hidden && url.pathname !== '/api/auth/logout') throw new DOMException('页面隐藏，暂停读取', 'AbortError');
    const controller = new AbortController(); controllers.add(controller);
    const abort = () => controller.abort(options.signal?.reason);
    if (options.signal?.aborted) abort(); else options.signal?.addEventListener('abort', abort, {once:true});
    const timeout = setTimeout(() => controller.abort(new DOMException('请求超过 15 秒', 'TimeoutError')), 15000);
    try {
      const response = await nativeFetch(url, {...options, method, credentials:'same-origin', cache:'no-store', signal:controller.signal});
      if ([401,403].includes(response.status)) {
        const error = Object.assign(new Error('监控访问已失效'), {status:response.status});
        authFailure(error); throw error;
      }
      const body = await response.text();
      if (controller.signal.aborted) throw controller.signal.reason || new DOMException('请求已取消', 'AbortError');
      if (url.pathname === '/api/auth/me' && response.ok) {
        const data = JSON.parse(body);
        if (data.user?.id != null) storageKey = 'h3-monitor-alerts:' + data.user.id;
        if (!['admin','monitor'].includes(data.user?.role)) {
          const error = Object.assign(new Error('仅管理员和监控展示员可查看'), {status:403});
          authFailure(error); throw error;
        }
      }
      return new Response(response.status === 204 ? null : body, {status:response.status, statusText:response.statusText, headers:response.headers});
    } finally {
      clearTimeout(timeout); options.signal?.removeEventListener('abort', abort); controllers.delete(controller);
    }
  };
  async function get(path, signal) {
    const response = await fetch(path, {signal, credentials:'same-origin', cache:'no-store'});
    if (!response.ok) throw Object.assign(new Error(`读取失败（HTTP ${response.status}）`), {status:response.status});
    return response.json();
  }
  window.addEventListener('h3auth:expired', () => lock('登录已失效。显示内容和本屏提醒已清除，请重新登录。'));
  window.addEventListener('h3auth:denied', event => { if (event.detail?.error?.status === 403) authFailure(event.detail.error); });

  function preserveView(callback) {
    const focused = document.activeElement, key = focused?.dataset.key;
    const scroll = ['worker-scroll','job-scroll','attention-list','alert-events','event-detail'].map(id => [$(id), $(id).scrollLeft, $(id).scrollTop]);
    const x = window.scrollX, y = window.scrollY;
    callback();
    if (key && !focused.isConnected) {
      const target = [...document.querySelectorAll('[data-key]')].find(el => el.dataset.key === key);
      if (target && (!document.querySelector('dialog[open]') || target.closest('dialog[open]'))) target.focus({preventScroll:true});
    }
    for (const [el,left,top] of scroll) { el.scrollLeft = left; el.scrollTop = top; }
    if (window.scrollX !== x || window.scrollY !== y) window.scrollTo(x,y);
  }
  function meter(used, total, label, ram = false) {
    const u = number(used), t = number(total), ratio = u != null && u >= 0 && t > 0 ? Math.max(0,Math.min(100,u/t*100)) : null;
    return `<div class="memory"><span class="sub">${E(bytes(u))} / ${E(bytes(t))}</span>${ratio == null ? '' : `<div class="bar ${ram ? 'ram' : ''}" role="meter" aria-label="${E(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${ratio}"><i style="width:${ratio}%"></i></div>`}</div>`;
  }
  function reception(w) {
    if (offline(w)) return '不可接任务';
    if (w.enabled === false || w.enabled === 0 || w.state === 'disabled') return '已禁用接收';
    if (['pending','running'].includes(w.sync_status) && w.is_primary_node !== true) return '同步期间不可接任务';
    if (w.comfy_online === false || w.state === 'error') return '不可接任务';
    if (w.busy || w.current_job_id || w.state === 'busy') return '正在占用';
    return w.state === 'idle' && w.comfy_online === true && (w.enabled === true || w.enabled === 1) ? '可接任务' : '接收状态未知';
  }
  function renderWorkers() {
    $('worker-count').textContent = `${snapshot.workers.length} 台设备`;
    $('worker-rows').innerHTML = snapshot.workers.map(w => {
      const tele = w.capabilities?.telemetry || {}, live = fresh(w), gpus = gpuList(w), ram = tele.memory || {};
      const job = snapshot.jobs.find(j => j.id === w.current_job_id);
      const faults = events.filter(e => e.kind !== 'task' && e.sourceId === w.id && e.active);
      const nonlive = stale ? '监控断线 · 非实时' : document.hidden ? '页面暂停 · 非实时' : offline(w) ? '离线 · 非实时' : '遥测未采集或已过期';
      return `<tr class="${offline(w) ? 'offline-row' : ''}"><td><strong class="machine">${E(w.name || w.id)}</strong>${w.is_primary_node === true ? '<span class="primary-node">主节点</span>' : ''}${sub(`${tele.hostname || '主机未记录'} · ${w.capabilities?.agent_version == null ? '版本未记录' : 'Worker v' + w.capabilities.agent_version}`)}${sub(w.id)}</td>
        <td><span class="tag ${tone(w.state)}">${E(STATUS[w.state] || w.state || '未知')}</span>${sub(reception(w))}${sub(offline(w) || stale ? 'ComfyUI 非实时' : w.comfy_online === true ? 'ComfyUI 在线' : w.comfy_online === false ? 'ComfyUI 不可用' : 'ComfyUI 未获取')}${faults.map(e => `<button class="link error-copy" data-event="${E(e.id)}" data-key="worker-event:${E(e.id)}">查看${E(KINDS[e.kind] || '异常')}</button>`).join('')}</td>
        <td>${gpus.length ? gpus.map(g => `<div class="gpu"><span class="small">GPU ${E(g.index ?? '未知')} · ${E(g.name || '型号未记录')}</span>${live ? meter(g.memory_used_bytes,g.memory_total_bytes,'显存') : sub(nonlive)}</div>`).join('') : sub('未采集 GPU 配置')}</td>
        <td>${gpus.length ? gpus.map(g => `<div class="gpu"><span class="temperature">${live && number(g.temperature_c) != null ? E(g.temperature_c) + '°C' : live ? '未采集' : '非实时'}</span>${sub('GPU ' + (g.index ?? '未知'))}</div>`).join('') : '未采集'}</td>
        <td>${live ? meter(ram.used_bytes,ram.total_bytes,'系统内存',true) : sub(nonlive)}</td>
        <td>${job ? E(job.cardName || job.name || job.id) + sub(job.projectName || '项目未记录') + sub(job.id) : w.current_job_id ? E(w.current_job_id) + sub('任务详情未获取') : offline(w) || stale ? '非实时' : w.busy ? '忙碌，任务未上报' : '当前无任务'}</td>
        <td><span class="small ${['error','failed'].includes(w.sync_status) ? 'red' : ''}">${w.is_primary_node === true ? '主节点 · 无需同步' : E(SYNC[w.sync_status] || w.sync_status || '同步未记录')}</span>${sub('心跳 ' + (number(w.last_seen) == null ? '未记录' : duration(Math.max(0,now()-w.last_seen)) + '前'))}${stale ? sub('最后快照 · 非实时') : ''}</td>
        <td><div class="row-actions"><button class="link" data-node="${E(w.id)}" data-key="node:${E(w.id)}">详情</button><button class="quiet" data-temp="${E(w.id)}" data-key="temp:${E(w.id)}" aria-label="查看 ${E(w.name || w.id)} 温度趋势">${icon('chart')}</button></div></td></tr>`;
    }).join('') || '<tr><td colspan="8" class="empty">当前没有执行端。注册并上报后会在此显示。</td></tr>';
  }
  function renderJobs() {
    if (!snapshot) return;
    const filter = $('job-filter').value, jobs = snapshot.jobs.filter(j => filter === 'all' || j.status === filter || filter === 'error' && j.status === 'failed');
    $('job-total').textContent = `${snapshot.jobs.length} 条记录`;
    $('job-rows').innerHTML = jobs.map(j => {
      const event = [...events].reverse().find(e => e.kind === 'task' && (e.sourceId === j.id || e.meta?.jobId === j.id));
      const p = number(j.progress), percent = p == null ? null : Math.max(0,Math.min(100,p*100));
      const end = number(j.ended) ?? (['running','assigned','cancel_requested'].includes(j.status) ? Number(snapshot.health?.server_time) || receivedAt/1000 : null);
      const elapsed = number(j.started) == null ? '尚未开始' : end == null ? '耗时未记录' : duration(end-j.started);
      return `<tr class="${['error','failed'].includes(j.status) ? 'job-error-row' : ''}"><td><span class="tag ${tone(j.status)}">${E(STATUS[j.status] || j.status || '未知')}</span></td>
        <td>${E(j.submitter_display_name || j.submitter_username || '提交人未记录')}${sub(j.projectName || '项目未记录')}${sub(j.cardName || '卡片未记录')}</td><td>${E(j.name || j.capability || '业务未记录')}${sub(j.capability)}${sub(j.id)}</td>
        <td><div class="progress">${percent == null ? '未获取' : `${Math.round(percent)}%<div class="bar" role="meter" aria-label="任务过程进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><i style="width:${percent}%"></i></div>`}${sub(j.step || '步骤未记录')}</div></td>
        <td>${E(workerName(j.worker_id))}</td><td>${E(when(j.created))}${sub('开始 ' + when(j.started))}${j.ended != null ? sub('结束 ' + when(j.ended)) : ''}</td>
        <td>${j.error ? `<button class="link error-copy" data-job-error="${E(j.id)}" data-key="job:${E(j.id)}">${E(j.error)}</button>${sub(elapsed)}` : E(elapsed)}${stale && j.status === 'running' ? sub('耗时截至最后快照') : ''}</td>
        <td>${event ? `<button class="link" data-event="${E(event.id)}" data-key="job-event:${E(event.id)}">${event.ack ? '已知晓' : '待知晓'}</button>` : '<span class="muted">—</span>'}</td></tr>`;
    }).join('') || `<tr><td colspan="8" class="empty">${snapshot.jobs.length ? '当前没有此状态的任务。' : '当前没有任务记录。'}</td></tr>`;
    $('job-note').textContent = `接口返回 ${snapshot.jobs.length} 条，当前显示 ${jobs.length} 条；表内滚动查看全部返回记录。`;
  }
  function renderSummary() {
    const h = snapshot.health || {}, s = snapshot.status || {}, workers = snapshot.workers;
    const online = workers.filter(w => w.state && !offline(w));
    $('service-value').textContent = stale ? '状态未知' : h.ok === true ? '运行正常' : h.ok === false ? '服务异常' : '未获取';
    $('service-note').textContent = `${h.mode || '模式未获取'} · 运行 ${number(h.started_at) != null && number(h.server_time) != null ? duration(h.server_time-h.started_at) : '未获取'}`;
    $('online-value').innerHTML = `${online.length} <small>/ ${workers.length} 台</small>`;
    $('online-note').textContent = `${workers.filter(offline).length} 台离线${workers.some(w=>!w.state) ? ' · 含状态未知设备' : ''}${stale ? ' · 最后快照' : ''}`;
    $('running-value').textContent = known(s.running_count); $('queued-value').textContent = known(s.queued_count);
    $('comfy-value').textContent = stale ? '状态未知' : h.comfy_online === true ? '可用' : h.comfy_online === false ? '不可用' : '未获取';
    $('comfy-note').textContent = `${online.filter(w=>w.comfy_online===true).length} / ${online.length} 台在线节点上报可用${stale ? ' · 非实时' : ''}`;
    $('config-rows').innerHTML = definition([['运行模式',h.mode],['可用能力',number(h.capabilities) == null ? '未获取' : h.capabilities + ' 项'],['任务记录',number(h.jobs) == null ? '未获取' : h.jobs + ' 条'],['大模型接口',h.llm?.ok === true ? '可用 · ' + (h.llm.model || '模型未记录') : h.llm?.ok === false ? '不可用' : '未获取'],['展示账号',user?.username],['运行环境',h.sandbox === true ? '隔离副本' : h.sandbox === false ? '非沙箱' : '未获取'],['操作权限','本页仅只读，无管理与创作入口']]);
  }
  function renderPersistence() {
    $('persistence-note').textContent = `本屏提醒不是审计日志 · 最多 200 条 · 已丢弃 ${number(engine?.dropped) ?? 0} 条${engine?.persistenceAvailable === false ? ' · 本地存储不可用，刷新可能丢失提醒' : ''}${engineError ? ' · ' + engineError : ''}`;
    $('persistence-note').classList.toggle('amber', engine?.persistenceAvailable === false || !!engineError);
  }
  function renderEventSummary() {
    const unread = events.filter(e=>!e.ack), attention = events.filter(e=>e.active || !e.ack), active = events.filter(e=>e.active);
    $('incident-value').textContent = engine ? String(active.length) : '未获取';
    $('ack-summary').textContent = `${active.filter(e=>e.kind==='task').length} 个失败任务 · ${active.filter(e=>e.kind!=='task').length} 项设备 / 连接故障`;
    $('attention-count').textContent = String(attention.length);
    $('alert-label').textContent = unread.length ? `异常提醒 ${unread.length}` : `异常记录 ${events.length}`;
    $('alerts-open').classList.toggle('alert-button',unread.length>0);
    $('alerts-open').disabled = $('attention-open').disabled = !engine;
    $('unread-banner').hidden = !unread.length; $('unread-title').textContent = `${unread.length} 条任务 / 设备异常提醒待知晓`;
    $('attention-list').innerHTML = [...attention].reverse().map(e=>`<div class="attention-item"><div class="attention-top"><strong class="${e.active ? 'red' : 'green'}">${E(e.title)}</strong><span class="small">${e.ack ? '已知晓' : '待知晓'}</span></div><p>${E(KINDS[e.kind] || e.kind)} · ${E(e.meta?.workerName || e.meta?.jobId || e.sourceId || '本显示终端')} · ${E(EVENT_STATUS[e.status] || '状态未知')}</p><button class="link" data-event="${E(e.id)}" data-key="attention:${E(e.id)}">查看异常详情</button></div>`).join('') || `<p class="muted small">${engineError || !engine ? '异常提醒不可用，请检查页面组件。' : snapshot ? '当前没有待关注异常。' : '尚未获取机器与任务状态。'}</p>`;
    renderPersistence();
  }
  function renderConnection(message) {
    $('connection').classList.toggle('stale',stale);
    $('connection-label').textContent = message || (document.hidden ? '页面隐藏 · 已暂停读取' : stale ? '监控连接中断 · 最后快照非实时' : '监控连接正常');
    $('refresh-stamp').textContent = receivedAt ? '最后成功读取 ' + new Date(receivedAt).toLocaleTimeString('zh-CN',{hour12:false}) : '尚未获取快照';
    $('freshness').textContent = stale ? '无法确认机器当前状态，不代表全部机器离线' : '每 5 秒读取 · 遥测新鲜度 ≤ 60 秒';
  }
  function render() {
    preserveView(() => {
      if (snapshot) { renderSummary(); renderWorkers(); renderJobs(); }
      renderEventSummary();
      if ($('alert-dialog').open) renderAlerts();
      renderTempStats();
    });
  }
  function observe(result) {
    if (!result || !Array.isArray(result.events)) throw new Error('告警引擎返回格式无效');
    events = result.events; engineError = ''; render();
    if (Array.isArray(result.newIds) && result.newIds.length) openAlerts();
  }
  function schedule(delay) {
    clearTimeout(pollTimer);
    if (!stopped && !document.hidden) pollTimer = setTimeout(refresh,delay);
  }
  async function refresh() {
    if (stopped || !user || document.hidden) return;
    if (busy) return;
    clearTimeout(pollTimer); busy = true;
    const sequence = ++refreshSequence, controller = new AbortController(); refreshController = controller;
    $('refresh').disabled = true; $('main').setAttribute('aria-busy','true');
    if (!snapshot) $('connection-label').textContent = '正在读取监控信息…';
    try {
      const data = await get('/api/monitor/summary',controller.signal);
      if (stopped || sequence !== refreshSequence || document.hidden) return;
      if (!data.health || !data.status || !Array.isArray(data.workers) || !Array.isArray(data.jobs)) throw new Error('监控摘要格式不完整');
      snapshot = data; receivedAt = Date.now(); stale = false; failureCount = 0; renderConnection();
      try { observe(engine.observe(data)); }
      catch { engineError = '异常提醒组件错误，故障状态未重新判定'; render(); }
    } catch (error) {
      if (authFailure(error) || stopped || sequence !== refreshSequence || document.hidden) return;
      stale = true; failureCount++; renderConnection();
      if (!snapshot) {
        $('worker-rows').innerHTML = '<tr><td colspan="8" class="empty">执行端读取失败，请刷新重试。</td></tr>';
        $('job-rows').innerHTML = '<tr><td colspan="8" class="empty">任务读取失败，请刷新重试。</td></tr>';
      }
      try { observe(engine.connectionFailed()); }
      catch { engineError = '异常提醒组件错误，连接提醒暂不可用'; render(); }
    } finally {
      busy = false; refreshController = null;
      if (!stopped) {
        $('refresh').disabled = false; $('main').removeAttribute('aria-busy');
        const delay = resumePending ? 0 : failureCount ? Math.min(30000,5000 * 2 ** Math.min(failureCount-1,3)) : 5000;
        resumePending = false; schedule(delay);
      }
    }
  }

  function captureFocus() { return {element:document.activeElement,key:document.activeElement?.dataset.key}; }
  function restoreFocus(target) {
    if (stopped || document.querySelector('dialog[open]')) return;
    const el = target?.element?.isConnected ? target.element : [...document.querySelectorAll('[data-key]')].find(n=>n.dataset.key===target?.key);
    (el || $('main')).focus({preventScroll:true});
  }
  function notify(message) {
    clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false;
    toastTimer = setTimeout(()=>$('toast').hidden=true,4000);
  }
  function openAlerts(id) {
    if (stopped) return;
    if (!events.length) { notify('当前没有异常记录。'); return; }
    if (!$('alert-dialog').open) {
      alertTrigger = $('detail-dialog').open ? detailTrigger : captureFocus();
      if ($('detail-dialog').open) closeDetail();
    }
    selectedEvent = id || (events.some(e=>e.id===selectedEvent) ? selectedEvent : [...events].reverse().find(e=>!e.ack)?.id || events.at(-1)?.id);
    preserveView(renderAlerts);
    if (!$('alert-dialog').open) $('alert-dialog').showModal();
  }
  function renderAlerts() {
    const list = [...events].reverse();
    if (!list.some(e=>e.id===selectedEvent)) selectedEvent = list[0]?.id;
    displayedUnread = list.filter(e=>!e.ack).map(e=>e.id);
    $('alert-title').textContent = displayedUnread.length ? '运行异常提醒' : '运行异常记录';
    $('alert-description').textContent = `${displayedUnread.length} 条待知晓 · ${list.length} 条本屏记录 · 任务、设备与连接异常`;
    $('alert-events').innerHTML = list.map(e=>`<button class="event-button" data-event-select="${E(e.id)}" data-key="select:${E(e.id)}" data-recovered="${e.status==='recovered'}" aria-pressed="${e.id===selectedEvent}"><span class="event-kind">${e.ack ? '已知晓' : '待知晓'} · ${E(EVENT_STATUS[e.status] || '状态未知')}</span><strong>${E(e.title)}</strong><span>${E(KINDS[e.kind] || e.kind)} · ${E(e.meta?.workerName || e.sourceId || '本显示终端')}</span><span>${E(when(e.at))}</span></button>`).join('');
    const e = list.find(item=>item.id===selectedEvent), meta = e?.meta || {};
    if (!e) { $('event-detail').textContent = '当前没有异常记录。'; return; }
    const fields = e.kind === 'task' ? [['项目',meta.projectName],['提交人',meta.submitter],['卡片',meta.cardName],['执行端',meta.workerName],['任务编号',meta.jobId || e.sourceId],['业务模式',meta.mode]] : [['影响对象',meta.workerName || e.sourceId],['主机',meta.hostname],['故障时关联任务',meta.jobId || '无关联任务记录'],['异常类型',KINDS[e.kind]],['首次发现',when(e.at)],['恢复时间',when(e.recoveredAt)]];
    $('event-detail').innerHTML = `<h3>${E(e.title)}</h3><div class="event-state"><span class="tag ${tone(e.status)}">故障状态：${E(EVENT_STATUS[e.status] || '状态未知')}</span><span class="tag">提醒知晓：${e.ack ? '已知晓' : '待知晓'}</span></div><dl class="event-meta">${fields.map(([label,value])=>`<div><dt>${E(label)}</dt><dd>${E(text(value))}</dd></div>`).join('')}</dl><div class="error-box ${e.status==='recovered' ? 'recovery-box' : ''}"><p>${E(text(e.detail))}</p></div><p class="small muted">${e.kind==='connection' ? '监控断线不代表所有执行端离线。' : e.kind==='task' ? '设备恢复不会重试已失败任务。' : '无任务运行也会记录设备故障。'}请将异常信息交给管理员核查。确认提醒不会改变故障状态。</p><p class="sub">首次发现 ${E(when(e.at))} · 恢复 ${E(when(e.recoveredAt))}</p>`;
    $('ack-alerts').textContent = displayedUnread.length ? `已知晓 ${displayedUnread.length} 条提醒` : '已全部知晓';
    $('ack-alerts').disabled = !displayedUnread.length;
  }
  function resetDetailIdle() {
    clearTimeout(detailIdleTimer);
    if ($('detail-dialog').open && !stopped) detailIdleTimer = setTimeout(closeDetail,60000);
  }
  function closeDetail() {
    detailSequence++; detailController?.abort(); detailController = null; detail = null; clearTimeout(detailIdleTimer);
    $('detail-dialog').close(); $('detail-body').replaceChildren();
  }
  function openDetail(title, model) {
    if (stopped) return false;
    if (!$('detail-dialog').open) detailTrigger = captureFocus();
    detailSequence++; detailController?.abort(); detailController = null;
    detail = model; $('detail-title').textContent = title; $('detail-body').replaceChildren();
    if (!$('detail-dialog').open) $('detail-dialog').showModal();
    resetDetailIdle(); return true;
  }
  function errorPanel(container, message, retry) {
    container.replaceChildren(); const p = document.createElement('p'); p.className = 'red'; p.textContent = message;
    const button = document.createElement('button'); button.textContent = '重试读取'; button.onclick = retry; container.append(p,button);
  }
  function mountPaged(details, value) {
    let raw = null, page = 0, offsets = [];
    details.addEventListener('toggle', () => {
      if (!details.open || raw !== null) return;
      raw = typeof value === 'undefined' ? '未提供' : JSON.stringify(value,null,2);
      offsets = [0];
      // 每页不超过 16000 个 UTF-16 码元，边界不得拆开代理对。
      while (offsets.at(-1) < raw.length) {
        let end = Math.min(raw.length,offsets.at(-1)+16000);
        if (end < raw.length && /[\uD800-\uDBFF]/.test(raw[end-1]) && /[\uDC00-\uDFFF]/.test(raw[end])) end--;
        offsets.push(end);
      }
      if (offsets.length === 1) offsets.push(0);
      const content = document.createElement('div');
      content.innerHTML = '<div class="raw-toolbar"><button data-page-prev>上一页</button><span data-page-label role="status"></span><button data-page-next>下一页</button></div><pre class="raw" tabindex="0" aria-label="当前页安全快照"></pre>';
      details.append(content);
      const pre = content.querySelector('pre'), previous = content.querySelector('[data-page-prev]'), next = content.querySelector('[data-page-next]');
      const draw = () => {
        const focus = document.activeElement;
        pre.textContent = raw.slice(offsets[page],offsets[page+1]); pre.scrollTop = pre.scrollLeft = 0;
        previous.disabled = page === 0; next.disabled = page === offsets.length-2;
        content.querySelector('[data-page-label]').textContent = `第 ${page+1} / ${offsets.length-1} 页`;
        if ((focus===previous && previous.disabled) || (focus===next && next.disabled)) pre.focus({preventScroll:true});
      };
      previous.onclick = () => { if(page>0){page--;draw();} }; next.onclick = () => { if(page<offsets.length-2){page++;draw();} }; draw();
    });
  }
  async function showNode(id) {
    const worker = snapshot?.workers.find(w=>w.id===id); if (!worker || stopped) return;
    const model = {kind:'worker',id};
    if (!openDetail((worker.name || id)+' · 节点详情',model)) return;
    await loadNode(model);
  }
  async function loadNode(model) {
    if (stopped || detail !== model || document.hidden) return;
    const sequence = ++detailSequence; detailController?.abort(); const controller = new AbortController(); detailController = controller;
    $('detail-body').textContent = '正在读取节点安全详情…';
    try {
      const data = await get('/api/monitor/workers/'+encodeURIComponent(model.id),controller.signal);
      if (stopped || detail !== model || sequence !== detailSequence || !$('detail-dialog').open) return;
      if (!data.worker || data.worker.id !== model.id) throw new Error('节点详情格式不完整');
      const w = data.worker, caps = data.capabilities, tele = w.capabilities?.telemetry || {}, compare = data.capability_comparison || {};
      $('detail-body').innerHTML = `<div class="modal-info">打开时的安全配置快照，不是原始配置；秘密字段不由此接口提供。下方读数均为最后上报，非持续实时更新。</div><dl class="definition modal-definition">${definition([['节点角色',w.is_primary_node===true ? '主节点' : w.is_primary_node===false ? '执行节点' : '未记录'],['节点编号',w.id],['主机',tele.hostname],['运行状态',STATUS[w.state] || w.state],['ComfyUI',offline(w) ? '离线 · 非实时' : w.comfy_online===true ? '最后上报可用' : w.comfy_online===false ? '最后上报不可用' : '未获取'],['任务接收',reception(w)],['当前任务',w.current_job_id || '无关联任务记录'],['最后心跳',when(w.last_seen)],['遥测时间',when(tele.collected_at)],['同步状态',SYNC[w.sync_status] || w.sync_status],['同步请求',w.sync_request_id],['请求时间',when(w.sync_requested_at)],['完成时间',when(w.sync_finished_at)],['比较基准',data.comparison_baseline?.worker_id || data.comparison_baseline?.status],['清单状态',compare.status],['模型清单状态',compare.model_inventory_status]])}</dl><div class="modal-info">${gpuList(w).map(g=>`<p>GPU ${E(g.index ?? '未知')} · ${E(g.name || '型号未记录')}：最后上报温度 ${number(g.temperature_c)==null ? '未采集' : E(g.temperature_c)+'°C'}；显存 ${E(bytes(g.memory_used_bytes))} / ${E(bytes(g.memory_total_bytes))}；利用率 ${number(g.utilization_percent)==null ? '未采集' : E(g.utilization_percent)+'%'}</p>`).join('') || '未采集 GPU 配置'}<p>最后上报系统内存 ${E(bytes(tele.memory?.used_bytes))} / ${E(bytes(tele.memory?.total_bytes))}</p></div><details id="comparison-details"><summary>缺失 / 额外清单与比较基准（安全快照，分页）</summary></details><details id="safe-config"><summary>完整能力与配置（安全快照，含节点类，分页）</summary></details>`;
      mountPaged($('comparison-details'),{comparison_baseline:data.comparison_baseline,capability_comparison:data.capability_comparison});
      mountPaged($('safe-config'),caps);
    } catch (error) {
      if (authFailure(error) || stopped || detail !== model || sequence !== detailSequence) return;
      errorPanel($('detail-body'),'节点详情读取失败：'+error.message,()=>loadNode(model));
    } finally { if (detailController === controller) detailController = null; }
  }
  function showJob(id) {
    const job = snapshot?.jobs.find(j=>j.id===id); if(!job)return;
    if (!openDetail('任务错误详情',{kind:'job',id})) return;
    $('detail-body').innerHTML = `<dl class="definition modal-definition">${definition([['任务编号',job.id],['项目',job.projectName],['卡片',job.cardName],['提交人',job.submitter_display_name || job.submitter_username],['错误分类',job.error]])}</dl><details id="job-record"><summary>任务安全记录（分页）</summary></details>`;
    mountPaged($('job-record'),job);
  }
  function showTemperature(id) {
    const worker = snapshot?.workers.find(w=>w.id===id); if(!worker || stopped)return;
    const gpus = gpuList(worker).filter(g=>number(g.index)!=null && Number.isInteger(Number(g.index)) && Number(g.index)>=0);
    const model = {kind:'temperature',id,index:gpus.length ? Number(gpus[0].index) : 0,minutes:30,data:null};
    if (!openDetail((worker.name || id)+' · 温度趋势',model))return;
    $('detail-body').innerHTML = `<p class="modal-info">只展示真实采集记录；缺失区间不插值、不补造历史。当前温度需 60 秒内的新鲜遥测。离线时仅供查看历史。</p><div class="chart-controls"><label>显卡 <select id="temp-gpu">${gpus.length ? gpus.map(g=>`<option value="${Number(g.index)}">GPU ${Number(g.index)} · ${E(g.name || '型号未记录')}</option>`).join('') : '<option value="0">GPU 0 · 未采集配置</option>'}</select></label><div class="segmented" aria-label="温度时间范围">${[[30,'30 分钟'],[120,'2 小时'],[1440,'24 小时']].map(([v,label])=>`<button data-range="${v}" aria-pressed="${v===30}">${label}</button>`).join('')}</div></div><div id="temp-stats" class="mini-stats"></div><div id="temp-chart"></div><p id="temp-note" class="small muted"></p><p id="temp-point" class="small muted" role="status"></p>`;
    $('temp-gpu').onchange = () => { model.index = Number($('temp-gpu').value); loadTemperature(model); };
    $('detail-body').querySelectorAll('[data-range]').forEach(button=>button.onclick=()=>{
      model.minutes = Number(button.dataset.range);
      $('detail-body').querySelectorAll('[data-range]').forEach(b=>b.setAttribute('aria-pressed',String(b===button))); loadTemperature(model);
    });
    loadTemperature(model);
  }
  function renderTempStats() {
    if (detail?.kind !== 'temperature' || !$('temp-stats') || !$('detail-dialog').open) return;
    const w = snapshot?.workers.find(w=>w.id===detail.id), gpu = gpuList(w).find(g=>Number(g.index)===detail.index);
    const current = !w || !fresh(w) ? '非实时' : number(gpu?.temperature_c) == null ? '未采集' : gpu.temperature_c+'°C';
    const values = (detail.data?.points || []).map(p=>p.temperature_c).filter(v=>v!=null);
    const max = values.reduce((a,b)=>Math.max(a,b),-Infinity), min = values.reduce((a,b)=>Math.min(a,b),Infinity), missing = detail.data ? '未采集' : '未获取';
    $('temp-stats').innerHTML = [['当前温度',current],['所选时段最高',values.length ? max+'°C' : missing],['所选时段最低',values.length ? min+'°C' : missing]].map(([label,value])=>`<div><span>${label}</span><strong>${E(value)}</strong></div>`).join('');
  }
  async function loadTemperature(model) {
    if (stopped || detail !== model || document.hidden) return;
    const sequence = ++detailSequence; detailController?.abort(); const controller = new AbortController(); detailController = controller;
    model.data = null; $('temp-chart').textContent = '正在读取温度历史…'; $('temp-note').textContent = ''; $('temp-point').textContent = ''; renderTempStats();
    try {
      const data = await get(`/api/monitor/workers/${encodeURIComponent(model.id)}/temperature?gpu_index=${model.index}&minutes=${model.minutes}`,controller.signal);
      if(stopped || detail!==model || sequence!==detailSequence || !$('detail-dialog').open)return;
      if(!Array.isArray(data.points) || number(data.from)==null || number(data.to)==null || data.to<=data.from || !(number(data.gap_seconds)>0))throw new Error('温度历史格式不完整');
      data.points = data.points.filter(p=>number(p.at)!=null && p.at>=data.from && p.at<=data.to).map(p=>({at:Number(p.at),temperature_c:number(p.temperature_c)})).sort((a,b)=>a.at-b.at);
      model.data = data; renderTempStats(); drawTemperature(model);
      $('temp-note').textContent = `${when(data.from)} — ${when(data.to)} · 历史采集记录${offline(snapshot.workers.find(w=>w.id===model.id)) ? ' · 节点离线，非实时' : ''}`;
    } catch(error) {
      if(authFailure(error) || stopped || detail!==model || sequence!==detailSequence)return;
      errorPanel($('temp-chart'),'温度历史读取失败：'+error.message,()=>loadTemperature(model)); renderTempStats();
    } finally { if(detailController===controller)detailController=null; }
  }
  function drawTemperature(model) {
    const data = model.data, values = data.points.filter(p=>p.temperature_c!=null);
    if(!values.length){$('temp-chart').textContent='暂无有效温度记录。旧版 Worker、驱动不支持或未开始采集时，不显示 0°C。';return;}
    const low = Math.floor((values.reduce((v,p)=>Math.min(v,p.temperature_c),Infinity)-5)/10)*10;
    const high = Math.ceil((values.reduce((v,p)=>Math.max(v,p.temperature_c),-Infinity)+5)/10)*10;
    const x = at=>52+(at-data.from)/(data.to-data.from)*700, y = v=>235-(v-low)/(high-low)*210;
    let previous = null, path = '';
    for(const p of data.points){
      if(p.temperature_c==null){previous=null;continue;}
      path += `${!previous || p.at-previous.at>data.gap_seconds ? 'M' : 'L'}${x(p.at).toFixed(2)} ${y(p.temperature_c).toFixed(2)} `; previous=p;
    }
    $('temp-chart').innerHTML = `<svg class="chart" viewBox="0 0 780 280" tabindex="0" role="img" aria-label="GPU ${model.index}，${model.minutes}分钟真实温度历史，左右键查看采集点">${[0,1,2,3,4].map(i=>{const v=low+(high-low)*i/4;return `<path d="M52 ${y(v)}H752" stroke="#303846"/><text x="8" y="${y(v)+4}">${Math.round(v)}°</text>`;}).join('')}<path data-curve d="${path}" stroke="#70c8ef" stroke-width="2.5" fill="none"/>${values.map(p=>`<circle cx="${x(p.at)}" cy="${y(p.temperature_c)}" r="2.2" fill="#70c8ef"/>`).join('')}<text x="52" y="270">${E(new Date(data.from*1000).toLocaleTimeString('zh-CN',{hour12:false}))}</text><text x="752" y="270" text-anchor="end">${E(new Date(data.to*1000).toLocaleTimeString('zh-CN',{hour12:false}))}</text></svg>`;
    let point = 0;
    const show = index=>{point=index;const p=data.points[point];$('temp-point').textContent=`${when(p.at)} · ${p.temperature_c==null ? '未采集' : p.temperature_c+'°C'}`;};
    const chart = $('temp-chart').querySelector('svg');
    chart.onkeydown = event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();show(event.key==='Home' ? 0 : event.key==='End' ? data.points.length-1 : Math.max(0,Math.min(data.points.length-1,point+(event.key==='ArrowRight'?1:-1))));
    };
    chart.onpointermove = event=>{
      const rect=chart.getBoundingClientRect(),at=data.from+Math.max(0,Math.min(1,((event.clientX-rect.left)/rect.width*780-52)/700))*(data.to-data.from);
      show(data.points.reduce((best,p,i)=>Math.abs(p.at-at)<Math.abs(data.points[best].at-at)?i:best,0));
    };
  }

  $('refresh').onclick = refresh;
  $('job-filter').onchange = ()=>preserveView(renderJobs);
  for(const id of ['alerts-open','attention-open','unread-open'])$(id).onclick=()=>openAlerts();
  $('ack-alerts').onclick = () => {
    if(stopped || !engine)return;
    try { engine.acknowledge([...displayedUnread]); events=engine.getEvents(); render(); $('alert-dialog').close(); }
    catch { engineError='提醒知晓保存失败，请重试'; renderPersistence(); }
  };
  $('fullscreen').onclick = async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
    catch{notify('浏览器未允许全屏，请使用浏览器菜单进入全屏。');}
  };
  document.addEventListener('fullscreenchange',()=>{$('fullscreen').querySelector('span').textContent=document.fullscreenElement?'退出全屏':'全屏展示';});
  $('logout').onclick = async()=>{
    if(stopped)return;
    lock('正在退出登录，显示内容已清除。');
    try { await H3Auth.json('/api/auth/logout','POST',{}); location.replace('/login'); }
    catch(error) {
      if(authFailure(error)){location.replace('/login');return;}
      $('access-message').textContent='显示内容已清除，但退出请求失败，服务端会话可能仍有效。请重试退出。';
      const button=document.createElement('button');button.textContent='重试退出';
      button.onclick=async()=>{button.disabled=true;try{await H3Auth.json('/api/auth/logout','POST',{});location.replace('/login');}catch(e){if(authFailure(e))location.replace('/login');else button.disabled=false;}};
      $('access-denied').append(button);
    }
  };
  document.addEventListener('click',event=>{
    const close=event.target.closest('[data-close]');
    if(close){if(close.closest('dialog')===$('detail-dialog'))closeDetail();else close.closest('dialog').close();return;}
    if(stopped)return;
    const node=event.target.closest('[data-node]'),temp=event.target.closest('[data-temp]'),alert=event.target.closest('[data-event]'),select=event.target.closest('[data-event-select]'),job=event.target.closest('[data-job-error]');
    if(node)showNode(node.dataset.node);if(temp)showTemperature(temp.dataset.temp);if(alert)openAlerts(alert.dataset.event);
    if(select){selectedEvent=select.dataset.eventSelect;preserveView(renderAlerts);}if(job)showJob(job.dataset.jobError);
  });
  $('detail-dialog').addEventListener('cancel',event=>{event.preventDefault();closeDetail();});
  $('detail-dialog').addEventListener('close',()=>{
    // close 事件异步派发；快速重开新详情时不能清除新一轮状态。
    if($('detail-dialog').open)return;
    detailSequence++;detailController?.abort();detailController=null;detail=null;clearTimeout(detailIdleTimer);$('detail-body').replaceChildren();restoreFocus(detailTrigger);
  });
  $('alert-dialog').addEventListener('close',()=>restoreFocus(alertTrigger));
  for(const event of ['pointerdown','keydown','wheel','input'])$('detail-dialog').addEventListener(event,resetDetailIdle,{passive:true});
  document.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);if(!dialog)return;
    const nodes=[...dialog.querySelectorAll('button:not(:disabled),select,summary,[tabindex="0"]')].filter(n=>n.getClientRects().length);
    const first=nodes[0],last=nodes.at(-1);
    if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first?.focus();}
  });
  document.addEventListener('visibilitychange',()=>{
    if(stopped)return;
    if(document.hidden){
      clearTimeout(pollTimer);clearInterval(clockTimer);clockTimer=null;refreshSequence++;refreshController?.abort();detailSequence++;detailController?.abort();stale=true;
      renderConnection('页面隐藏 · 已暂停读取');render();
    }else{
      clock();if(!clockTimer)clockTimer=setInterval(clock,1000);
      renderConnection('恢复可见 · 正在核实最新状态');render();
      if(busy)resumePending=true;else if(user)refresh();else boot();
      if(detail?.kind==='worker')loadNode(detail);else if(detail?.kind==='temperature')loadTemperature(detail);
    }
  });
  window.addEventListener('pagehide',()=>{stopRequests();snapshot=null;events=[];detail=null;});
  window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
  function clock(){
    if(stopped || document.hidden)return;
    const date=new Date();$('clock').textContent=date.toLocaleTimeString('zh-CN',{hour12:false});$('date').textContent=date.toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});
    // 本地新鲜度刷新不请求网络，也不重置详情分页或抢焦点。
    if(snapshot)preserveView(()=>{renderWorkers();renderTempStats();});
  }
  let booting=false;
  async function boot(){
    if(booting || stopped || document.hidden)return;booting=true;
    try{
      // 专用只读入口自行校验角色；不进入普通业务页的手机号补录流程。
      const current=await H3Auth.me();
      if(stopped)return;
      if(!['admin','monitor'].includes(current?.role)){lock('当前账号无权查看监控。');return;}
      user=current;storageKey='h3-monitor-alerts:'+user.id;
      try{storage=window.localStorage;}catch{storage=null;}
      if(!window.MonitorAlerts?.create)throw new Error('异常提醒组件尚未加载，请刷新页面重试');
      engine=window.MonitorAlerts.create({storage,key:storageKey});events=engine.getEvents();
      $('monitor-account').textContent=`${user.display_name || user.username} · ${user.role==='admin' ? '管理员只读查看' : '监控展示员'}`;
      $('logout').disabled=false;renderEventSummary();clock();if(!clockTimer)clockTimer=setInterval(clock,1000);await refresh();
    }catch(error){
      if(authFailure(error) || stopped)return;
      if(document.hidden)return;
      lock('监控无法启动：'+error.message+'。请返回登录或刷新页面重试。');
    }finally{booting=false;}
  }
  clock();boot();
})();
