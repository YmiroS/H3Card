/* 同源会话与 CSRF：不读取 HttpOnly cookie，不在本地存储密码或令牌。 */

/* 账号组件（按钮/徽章/账号条/对话框）样式随脚本注入：运行面板、费用页没有链接
   主样式表，注入后各页共用一套，颜色用 var() 回退自适应每个页面自己的调色板。 */
(() => {
  const style = document.createElement('style');
  style.textContent = `
  .btn {
    padding: 7px 13px; border: 1px solid var(--line); border-radius: 3px;
    background: var(--panel2, #111726); color: var(--dim, #8f949e);
    letter-spacing: .5px; cursor: pointer; font: inherit;
    transition: color .12s, border-color .12s, box-shadow .12s;
  }
  .btn:hover { color: var(--acc, var(--blue, #00e5ff)); border-color: var(--acc, var(--blue, #00e5ff)); }
  .btn.primary {
    background: var(--acc, var(--blue, #00e5ff)); border-color: var(--acc, var(--blue, #00e5ff));
    color: #04141a; font-weight: 600;
  }
  .btn.primary:hover { box-shadow: 0 0 14px #00e5ff55; color: #04141a; }
  .btn.danger { color: var(--acc2, var(--bad, #ff4d6d)); border-color: #ff2d9540; }
  .btn.danger:hover { border-color: var(--acc2, var(--bad, #ff4d6d)); box-shadow: 0 0 10px #ff2d9520; }
  .btn.sm { padding: 3px 9px; font-size: 11.5px; }
  .btn:disabled { opacity: .45; cursor: not-allowed; }
  .btn:focus-visible { outline: 1px solid var(--acc, var(--blue, #00e5ff)); outline-offset: 2px; }
  .chip {
    display: inline-flex; align-items: center; gap: 6px; padding: 1px 8px;
    border: 1px solid var(--line); border-radius: 2px; font-size: 11px;
    color: #9db1cc; white-space: nowrap;
  }
  .chip .d { width: 5px; height: 5px; border-radius: 50%; background: currentColor;
    box-shadow: 0 0 6px currentColor; }
  .chip.admin, .chip.op { color: var(--acc, var(--blue, #00e5ff)); border-color: #00e5ff44; }
  .chip.on { color: var(--ok, #34d399); border-color: #34d3993a; }
  .chip.off { color: var(--err, var(--bad, #ff3b5c)); border-color: #ff3b5c3a; }
  .account-bar { display: inline-flex; align-items: center; gap: 10px; font-size: 12px; }
  .account-bar .who { color: var(--txt, var(--text, #d8e6f2)); }
  body[data-workspace] { --workspace-width: 72px; padding-left: var(--workspace-width); }
  #workspace-nav {
    --workspace-rail-width: var(--workspace-width); --workspace-reveal: 0; --workspace-extra-display: none;
    position: fixed; inset: 0 auto 0 0; z-index: 60; width: var(--workspace-rail-width); height: 100dvh;
    display: flex; flex-direction: column; box-sizing: border-box; padding: 0 8px; overflow-x: clip;
    background: #0c0e12; border-right: 1px solid #262a32; color: #e5e7eb;
    font: 13px/1.5 "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
  }
  #workspace-nav:is(:focus-within, :has(.account-menu:popover-open)) {
    --workspace-rail-width: 184px; --workspace-reveal: 1; --workspace-extra-display: block;
    box-shadow: 16px 0 40px #0005;
  }
  @media (hover: hover) and (pointer: fine) {
    #workspace-nav:hover {
      --workspace-rail-width: 184px; --workspace-reveal: 1; --workspace-extra-display: block;
      box-shadow: 16px 0 40px #0005;
    }
  }
  #workspace-nav .workspace-brand { display: flex; align-items: center; gap: 10px; min-height: 76px; padding: 12px 11px;
    border: 0; border-radius: 0; background: transparent;
    color: #f3f4f6; text-decoration: none; font-size: 18px; font-weight: 650; letter-spacing: -.4px; }
  .workspace-brand img { width: 32px; height: 32px; object-fit: contain; flex: none; }
  .workspace-brand small { display: block; margin-top: 1px; color: #949ba8; font-size: 10px; letter-spacing: 2px; font-weight: 400; }
  .workspace-links { flex: 1; min-height: 0; overflow: hidden auto; padding-top: 18px; }
  .workspace-nav-label { margin: 0 12px 12px; color: #949ba8; font-size: 10px; letter-spacing: 1.5px; white-space: nowrap; }
  .workspace-nav-group + .workspace-nav-group { margin-top: 16px; padding-top: 16px; border-top: 1px solid #262a32; }
  #workspace-nav :is(.workspace-brand > span, .workspace-link > span, .workspace-nav-label, .account-name) {
    opacity: var(--workspace-reveal); transition: opacity .14s ease-out;
  }
  .workspace-brand > span, .workspace-link > span { flex: none; white-space: nowrap; }
  #workspace-nav .workspace-link { display: flex; align-items: center; gap: 12px; min-height: 46px;
    margin: 4px 0; padding: 10px 17px; border: 1px solid transparent; border-radius: 9px;
    color: #aeb4c0; background: transparent; text-decoration: none; white-space: nowrap; transition: background-color .15s, color .15s; }
  #workspace-nav .workspace-link svg { flex: none; width: 19px; height: 19px; }
  #workspace-nav .workspace-link:hover { background: #181c23; color: #fff; }
  #workspace-nav .workspace-link[aria-current="page"] { background: #192a37; border-color: #284454; color: #bce9ff; }
  #workspace-nav :is(a, button):focus-visible { outline: 2px solid #7dd3fc; outline-offset: 2px; }
  .workspace-footer { flex: none; padding: 16px 0 max(14px, env(safe-area-inset-bottom)); }
  .workspace-presence { display: flex; justify-content: center; gap: calc(8px * var(--workspace-reveal)); align-items: center;
    padding: 0 0 15px; color: #a5acb8; font-size: 10px; white-space: nowrap; }
  .workspace-presence i { display: var(--workspace-extra-display); width: 6px; height: 6px; flex: none;
    border-radius: 50%; background: #34d399; box-shadow: 0 0 0 3px #34d39915; }
  .workspace-presence b { color: #e5e7eb; font-weight: 550; }
  #workspace-nav .account-bar { display: block; width: 100%; margin: 0; padding-top: 12px; border-top: 1px solid #262a32; }
  #workspace-nav .chip { white-space: normal; font-size: 11px; line-height: 1.5; }
  .account-trigger { width: 100%; min-height: 48px; display: flex; align-items: center; gap: 10px;
    padding: 7px 11px; overflow: hidden; border: 1px solid transparent; border-radius: 9px; color: #e5e7eb; background: transparent; font: inherit; cursor: pointer; }
  .account-trigger:hover, .account-trigger[aria-expanded="true"] { background: #1b2028; border-color: #303641; }
  .account-avatar { display: grid; place-items: center; width: 32px; height: 32px; flex: none;
    border-radius: 10px; color: #c7e9ff; background: #243c50; border: 1px solid #36536a; font-size: 14px; font-weight: 650; }
  .account-name { min-width: 0; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 550; }
  .account-menu { position: fixed; inset: auto; margin: 0; box-sizing: border-box; width: min(260px, calc(100vw - 16px));
    max-height: calc(100dvh - 90px); overflow-y: auto; padding: 8px; border: 1px solid #343b47; border-radius: 12px;
    background: #15191f; color: #e5e7eb; box-shadow: 0 20px 70px #0008; font: 13px/1.5 "Microsoft YaHei", system-ui, sans-serif; }
  .account-menu-heading { padding: 10px 12px 13px; margin-bottom: 4px; border-bottom: 1px solid #2b313b; overflow-wrap: anywhere; }
  .account-menu-heading b { display: block; font-weight: 600; }
  .account-menu-heading small { display: block; margin-top: 3px; color: #a5acb8; font-size: 11px; }
  .account-menu .account-action { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 44px;
    padding: 10px 12px; border: 0; border-radius: 7px; color: #dce1e9; background: transparent; text-align: left; font: inherit; cursor: pointer; }
  .account-menu .account-action:hover { background: #262c36; }
  .account-menu .account-action:focus-visible { outline: 2px solid #7dd3fc; outline-offset: -2px; }
  .account-menu .account-action.danger { color: #fda4af; }
  .account-menu .account-action.danger:hover { background: #3c242e; }
  .account-info { margin: 0; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 14px 20px; font-size: 13px; }
  .account-info dt { color: var(--dim, #a5acb8); }
  .account-info dd { margin: 0; overflow-wrap: anywhere; user-select: text; }
  .workspace-breadcrumb { color: var(--dim, #a5acb8); font-size: 12px; }
  body.node-editor[data-workspace] { padding-left: 0; }
  body.node-editor #workspace-nav { display: none; }
  @media (prefers-reduced-motion: reduce) {
    #workspace-nav :is(.workspace-link, .workspace-brand > span, .workspace-link > span, .workspace-nav-label, .account-name) { transition: none; }
  }
  #maintenance-banner {
    position: fixed; inset: 0 0 auto 0; z-index: 1000; min-height: 40px;
    display: grid; grid-template-columns: 48px minmax(0, 1fr); overflow: hidden;
    color: #fff; background: #b91c1c; border-bottom: 1px solid #fca5a5;
    box-shadow: 0 5px 18px #450a0a66; font: 600 13px/40px "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
    pointer-events: none;
  }
  #maintenance-banner[hidden] { display: none; }
  .maintenance-banner-icon {
    display: grid; place-items: center; min-height: 40px; background: #991b1b;
    border-right: 1px solid #fecaca66;
  }
  .maintenance-banner-icon svg { width: 20px; height: 20px; }
  .maintenance-banner-ticker { min-width: 0; overflow: hidden; }
  .maintenance-banner-track {
    display: flex; width: max-content;
    animation: maintenance-banner-scroll 18s linear infinite;
  }
  .maintenance-banner-message {
    width: calc(100vw - 48px); box-sizing: border-box; padding: 0 56px;
    white-space: nowrap; text-align: center;
  }
  @keyframes maintenance-banner-scroll { to { transform: translateX(-50%); } }
  @media (max-width: 640px) {
    #maintenance-banner { grid-template-columns: 42px minmax(0, 1fr); font-size: 12px; }
    .maintenance-banner-message { width: calc(100vw - 42px); padding-inline: 28px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .maintenance-banner-track { width: 100%; min-width: 0; animation: none; }
    .maintenance-banner-message {
      min-width: 0; width: 100%; padding: 8px 16px; white-space: normal;
      line-height: 1.45; overflow: visible; text-overflow: clip;
    }
    .maintenance-banner-message[aria-hidden="true"] { display: none; }
  }
  .auth-dialog {
    /* 主样式表有 * { margin: 0 } 全局重置，会吃掉原生 dialog 的 margin:auto 居中，
       这里必须显式声明，否则弹窗会跑到角落 */
    margin: auto;
    width: min(400px, 92vw); padding: 30px 28px 24px;
    background: var(--panel, #111318); color: var(--txt, var(--text, #f3f4f6));
    border: 1px solid var(--line); border-radius: 3px;
    box-shadow: 0 0 70px #000c;
  }
  .auth-dialog::backdrop { background: #05060dc0; }
  .auth-dialog form { display: grid; gap: 16px; }
  .auth-dialog h2 { font-size: 14px; letter-spacing: 2px; font-weight: 600; margin: 0 0 2px; }
  .auth-dialog h2 b { color: var(--acc, var(--blue, #00e5ff)); font-weight: 600; }
  .auth-dialog input { width: 100%; padding: 11px 12px; font-size: 14px; }
  .auth-dialog .fld > span { font-size: 12px; }
  .auth-dialog .auth-note { margin-bottom: 0; }
  .auth-dialog [role="alert"] { min-height: 18px; margin: 0; color: var(--err, var(--bad, #ff3b5c)); font-size: 12px; }
  .auth-dialog footer { display: flex; justify-content: flex-end; gap: 10px; }
  .auth-dialog footer .btn { padding: 10px 18px; font-size: 13px; }
  @media (prefers-reduced-motion: reduce) { .btn { transition: none; } }
  `;
  document.head.append(style);
})();

(() => {
  let user = null, csrf = '', stopped = false, pendingMe = null, localTest = false;
  let presenceStarted = false, presencePending = null;
  let maintenanceStarted = false, maintenancePending = null;
  const controllers = new Set(), timers = new Set();
  function invalidate(redirect = true) {
    stopped = true; user = null; csrf = '';
    setMaintenanceBanner(false);
    controllers.forEach(c => c.abort()); timers.forEach(clearInterval); timers.clear();
    window.dispatchEvent(new Event('h3auth:expired'));
    if (redirect && location.pathname !== '/login') location.replace('/login');
  }
  async function request(path, options = {}) {
    const url = new URL(path, location.href);
    if (url.origin !== location.origin) throw new Error('只允许同源请求');
    const anonymous = url.pathname === '/api/auth/login' || url.pathname === '/api/auth/register';
    if (stopped && !anonymous) throw new Error('登录已失效');
    const method = (options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !anonymous) {
      if (!csrf) throw new Error('会话未就绪，请重新登录');
      headers.set('X-CSRF-Token', csrf);
    }
    const controller = new AbortController(); controllers.add(controller);
    const abort = () => controller.abort(options.signal.reason);
    if (options.signal?.aborted) abort();
    else options.signal?.addEventListener('abort', abort, {once:true});
    try {
      const response = await fetch(url, {...options, method, headers, credentials:'same-origin', signal:controller.signal});
      const type = response.headers.get('content-type') || '';
      const data = type.includes('json') ? await response.json() : await response.text();
      if (!response.ok) {
        const message = typeof data === 'string' ? data : data.error?.message || data.error || data.message;
        const error = Object.assign(new Error(String(message || `请求失败（${response.status}）`).slice(0, 500)), {status:response.status, data});
        if (response.status === 401 && !anonymous) invalidate(url.pathname !== '/api/auth/me' || location.pathname !== '/login');
        if ([403,404].includes(response.status)) window.dispatchEvent(new CustomEvent('h3auth:denied', {detail:{path:url.pathname, method, error}}));
        throw error;
      }
      if (stopped && !anonymous) throw new Error('登录已失效');
      return data;
    } finally {
      options.signal?.removeEventListener('abort', abort);
      controllers.delete(controller);
    }
  }
  const json = (path, method, body) => request(path, {method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body || {})});
  async function refreshPresence() {
    if (stopped || document.hidden) return;
    if (!presencePending) presencePending = json('/api/auth/presence', 'POST').then(data => {
      const count = document.querySelector('#workspace-nav .workspace-presence b');
      if (count) count.textContent = String(data.online_users);
      window.dispatchEvent(new CustomEvent('h3auth:presence', {detail:data}));
      return data;
    }).finally(() => { presencePending = null; });
    return presencePending;
  }
  function startPresence() {
    if (presenceStarted) return;
    presenceStarted = true;
    refreshPresence().catch(() => {});
    every(refreshPresence, 30000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshPresence().catch(() => {});
    });
  }
  function maintenanceBanner() {
    if (window !== window.top || !document.body) return null;
    let banner = document.getElementById('maintenance-banner');
    if (banner) return banner;
    banner = document.createElement('div');
    banner.id = 'maintenance-banner'; banner.hidden = true;
    banner.setAttribute('role', 'status'); banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-atomic', 'true'); banner.setAttribute('aria-label', '系统维护通知');
    const icon = document.createElement('span'); icon.className = 'maintenance-banner-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/></svg>';
    const ticker = document.createElement('div'); ticker.className = 'maintenance-banner-ticker';
    const track = document.createElement('div'); track.className = 'maintenance-banner-track';
    const message = '系统正在维护更新，当前暂无可用执行节点，请稍后再使用。';
    for (let index = 0; index < 2; index++) {
      const item = document.createElement('span'); item.className = 'maintenance-banner-message';
      item.textContent = message;
      if (index) item.setAttribute('aria-hidden', 'true');
      track.append(item);
    }
    ticker.append(track); banner.append(icon, ticker); document.body.prepend(banner);
    return banner;
  }
  function setMaintenanceBanner(active) {
    const banner = active ? maintenanceBanner() : document.getElementById('maintenance-banner');
    if (banner) banner.hidden = !active;
  }
  async function refreshMaintenance() {
    if (stopped || document.hidden) return;
    if (!maintenancePending) {
      const timeoutController = new AbortController();
      const timeout = setTimeout(() => timeoutController.abort(), 4000);
      maintenancePending = request('/api/health', {
        cache:'no-store', signal:timeoutController.signal,
      }).then(data => {
        setMaintenanceBanner(data.maintenance_active === true);
        return data;
      }).finally(() => {
        clearTimeout(timeout); maintenancePending = null;
      });
    }
    return maintenancePending;
  }
  function startMaintenance() {
    if (window !== window.top || maintenanceStarted) return;
    maintenanceStarted = true;
    refreshMaintenance().catch(() => {});
    every(refreshMaintenance, 5000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshMaintenance().catch(() => {});
    });
  }
  async function me() {
    if (!pendingMe) pendingMe = request('/api/auth/me', {cache:'no-store'}).then(data => {
      user = data.user; csrf = data.csrf_token; localTest = data.local_test === true;
      startPresence(); startMaintenance();
      return user;
    }).finally(() => { pendingMe = null; });
    return pendingMe;
  }
  async function requireUser(admin = false) {
    const current = await me();
    if (admin && current.role !== 'admin') { location.replace('/'); throw new Error('仅管理员可访问'); }
    return current;
  }
  function every(fn, ms) {
    if (stopped) return;
    const timer = setInterval(() => { if (!stopped) Promise.resolve(fn()).catch(() => {}); }, ms);
    timers.add(timer); return timer;
  }
  async function login(username, password) {
    const data = await json('/api/auth/login', 'POST', {username,password});
    user = data.user; csrf = data.csrf_token; stopped = false; return user;
  }
  async function register(username, displayName, password) {
    return json('/api/auth/register', 'POST', {username, display_name: displayName, password});
  }
  async function logout() {
    try { await json('/api/auth/logout', 'POST'); }
    finally { invalidate(); }
  }
  function mountWorkspace() {
    const rail = document.getElementById('workspace-nav');
    if (!rail || rail.querySelector('.workspace-links')) return;
    const icons = {
      canvas: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
      director: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="m3 8 16-5 2 5M7 7l3-4m4 2 3-3M10 12l5 3-5 3z"/>',
      teams: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-2-4"/>',
      controller: '<path d="M3 17V7m6 14V3m6 14V7m6 14V3"/><path d="M1 10h4m2 5h4m2-5h4m2 5h4"/>',
      permissions: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
      costs: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8m-7 4 3 3 3-3m-3 3v4m-3-3h6"/>',
      capacity: '<path d="M4 3v17h17M8 16v-5m5 5V7m5 9V4"/>',
    };
    const nav = document.createElement('nav'); nav.className = 'workspace-links'; nav.setAttribute('aria-label', '工作区导航');
    const addGroup = label => {
      const group = document.createElement('div'); group.className = 'workspace-nav-group';
      group.setAttribute('role', 'group'); group.setAttribute('aria-label', label);
      const heading = document.createElement('div'); heading.className = 'workspace-nav-label';
      heading.textContent = label; heading.setAttribute('aria-hidden', 'true');
      group.append(heading); nav.append(group); return group;
    };
    let group = addGroup('工作区');
    const add = (key, label, href) => {
      const link = document.createElement('a'); link.className = 'workspace-link'; link.href = href;
      link.setAttribute('aria-label', label); link.title = label;
      if (document.body.dataset.workspace === key) link.setAttribute('aria-current', 'page');
      if (key === 'director' && document.body.dataset.workspace === 'canvas') link.id = 'directorbtn';
      link.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[key] + '</svg><span></span>';
      link.querySelector('span').textContent = label; group.append(link);
    };
    add('canvas', '画布', '/'); add('director', '导演工作台', '/director');
    if (user.role === 'admin' || user.team_leader) {
      group = addGroup('管理');
      add('teams', '项目组', '/teams');
    }
    if (user.role === 'admin') {
      add('controller', '运行面板', '/controller'); add('permissions', '账号与权限', '/admin/permissions');
      group = addGroup('统计');
      add('costs', '费用评估', '/controller/costs'); add('capacity', '产能统计', '/controller/capacity');
    }
    rail.querySelector('.workspace-footer').before(nav);
  }
  function mountAccount(container) {
    mountWorkspace();
    const workspace = container.closest('#workspace-nav');
    container.replaceChildren();
    if (localTest) {
      const badge = document.createElement('span'); badge.className = 'chip';
      badge.textContent = '本地测试 · 免登录';
      container.append(badge);
      return;
    }
    let trigger = null, menu = null;
    const closeMenu = () => { if (menu?.matches(':popover-open')) menu.hidePopover(); };
    const displayName = user.display_name?.trim() || user.username;
    const who = document.createElement('span'); who.className = workspace ? 'account-name' : 'who';
    who.textContent = workspace ? displayName : user.username;
    const role = document.createElement('span'); role.className = 'chip' + (user.role === 'admin' ? ' admin' : '');
    const dot = document.createElement('i'); dot.className = 'd';
    const roleText = user.role === 'admin' ? '管理员' : user.team_leader ? '组长' : '普通用户';
    role.append(dot, document.createTextNode(roleText));
    const teams = document.createElement('a'); teams.className = 'btn sm'; teams.href = '/teams'; teams.textContent = '项目组';
    const password = document.createElement('button'); password.className = 'btn sm'; password.textContent = '修改密码';
    password.onclick = () => {
      closeMenu();
      const dialog = document.createElement('dialog'); dialog.className = 'auth-dialog';
      dialog.setAttribute('aria-label', '修改密码');
      dialog.addEventListener('keydown', event => event.stopPropagation());
      dialog.addEventListener('close', () => { dialog.remove(); trigger?.focus(); }, {once:true});
      dialog.innerHTML = '<form><h2>修改密码</h2>'
        + '<label class="fld"><span>当前密码</span><input name="current_password" type="password" autocomplete="current-password" required></label>'
        + '<label class="fld"><span>新密码（至少 8 位）</span><input name="new_password" type="password" autocomplete="new-password" required minlength="8"></label>'
        + '<label class="fld"><span>再输一次新密码</span><input name="confirm_password" type="password" autocomplete="new-password" required minlength="8"></label>'
        + '<p class="auth-note">密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。保存后需要重新登录。</p>'
        + '<p role="alert"></p>'
        + '<footer><button type="button" class="btn">取消</button><button type="submit" class="btn primary">保存</button></footer></form>';
      dialog.querySelector('[type=button]').onclick = () => dialog.close();
      dialog.querySelector('form').onsubmit = async event => {
        event.preventDefault(); const form = event.currentTarget;
        const alert = form.querySelector('[role=alert]');
        const data = Object.fromEntries(new FormData(form));
        if (data.new_password !== data.confirm_password) {
          alert.textContent = '两次输入的新密码不一致';
          form.elements.confirm_password.focus();
          return;
        }
        try {
          // 改密接口会注销当前会话；不要在已移除的对话框上处理随后 /me 的 401。
          await json('/api/auth/password', 'POST', {
            current_password: data.current_password, new_password: data.new_password,
          });
          if (dialog.isConnected) dialog.remove();
          invalidate();
        } catch (error) {
          const alert = dialog.isConnected && dialog.querySelector('[role=alert]');
          if (alert) alert.textContent = error.message;
        }
      };
      document.body.append(dialog); dialog.showModal();
    };
    const exit = document.createElement('button'); exit.className = 'btn sm'; exit.textContent = '退出登录';
    exit.onclick = () => { closeMenu(); logout().catch(() => {}); };
    if (!workspace) {
      container.append(who, role);
      if (user.role === 'admin' || user.team_leader) container.append(teams);
      container.append(password, exit);
      return;
    }
    trigger = document.createElement('button'); trigger.className = 'account-trigger'; trigger.type = 'button';
    trigger.setAttribute('aria-label', '用户菜单：' + displayName); trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'account-menu');
    const avatar = document.createElement('span'); avatar.className = 'account-avatar'; avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = Array.from(displayName)[0]?.toUpperCase() || '?';
    trigger.append(avatar, who);
    menu = document.createElement('div'); menu.className = 'account-menu'; menu.id = 'account-menu'; menu.popover = 'auto';
    menu.setAttribute('aria-label', '账号菜单');
    trigger.popoverTargetElement = menu;
    const heading = document.createElement('div'); heading.className = 'account-menu-heading';
    const name = document.createElement('b'); name.textContent = displayName;
    const detail = document.createElement('small'); detail.textContent = user.username + ' · ' + roleText;
    heading.append(name, detail);
    const info = document.createElement('button'); info.type = 'button'; info.textContent = '用户信息';
    info.onclick = () => {
      closeMenu();
      const dialog = document.createElement('dialog'); dialog.className = 'auth-dialog'; dialog.setAttribute('aria-label', '用户信息');
      dialog.innerHTML = '<form method="dialog"><h2>用户信息</h2><dl class="account-info"></dl><footer><button class="btn primary">关闭</button></footer></form>';
      const list = dialog.querySelector('dl');
      for (const [label, value] of [['姓名 / 花名', user.display_name?.trim() || '未填写'], ['用户名', user.username], ['角色', roleText], ['用户 ID', user.id]]) {
        const term = document.createElement('dt'); term.textContent = label;
        const definition = document.createElement('dd'); definition.textContent = value;
        list.append(term, definition);
      }
      dialog.addEventListener('keydown', event => event.stopPropagation());
      dialog.addEventListener('close', () => { dialog.remove(); trigger.focus(); }, {once:true});
      document.body.append(dialog); dialog.showModal();
    };
    info.className = password.className = 'account-action'; exit.className = 'account-action danger';
    menu.append(heading, info, password, exit);
    menu.addEventListener('keydown', event => event.stopPropagation());
    menu.addEventListener('beforetoggle', event => {
      const open = event.newState === 'open'; trigger.setAttribute('aria-expanded', String(open));
      if (open) {
        const rect = trigger.getBoundingClientRect();
        menu.style.left = Math.max(8, Math.min(rect.left, innerWidth - Math.min(260, innerWidth - 16) - 8)) + 'px';
        menu.style.bottom = Math.max(8, innerHeight - rect.top + 8) + 'px';
        menu.style.maxHeight = Math.max(44, rect.top - 16) + 'px';
        window.addEventListener('resize', closeMenu);
      } else window.removeEventListener('resize', closeMenu);
    });
    container.append(trigger, menu);
  }
  window.H3Auth = {request,json,me,requireUser,every,login,register,logout,mountAccount, get user(){return user;}, get active(){return !!user && !stopped;}};
})();
