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
  let user = null, csrf = '', stopped = false, pendingMe = null;
  const controllers = new Set(), timers = new Set();
  function invalidate(redirect = true) {
    stopped = true; user = null; csrf = '';
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
    try {
      const response = await fetch(url, {...options, method, headers, credentials:'same-origin', signal:controller.signal});
      const type = response.headers.get('content-type') || '';
      const data = type.includes('json') ? await response.json() : await response.text();
      if (!response.ok) {
        const message = typeof data === 'string' ? data : data.error?.message || data.error || data.message;
        const error = Object.assign(new Error(String(message || `请求失败（${response.status}）`).slice(0, 500)), {status:response.status, data});
        if (response.status === 401 && !login) invalidate(url.pathname !== '/api/auth/me' || location.pathname !== '/login');
        if ([403,404].includes(response.status)) window.dispatchEvent(new CustomEvent('h3auth:denied', {detail:{path:url.pathname, method, error}}));
        throw error;
      }
      if (stopped && !login) throw new Error('登录已失效');
      return data;
    } finally { controllers.delete(controller); }
  }
  const json = (path, method, body) => request(path, {method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body || {})});
  async function me() {
    if (!pendingMe) pendingMe = request('/api/auth/me', {cache:'no-store'}).then(data => {
      user = data.user; csrf = data.csrf_token; return user;
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
  function mountAccount(container) {
    container.replaceChildren();
    const who = document.createElement('span'); who.className = 'who'; who.textContent = user.username;
    const role = document.createElement('span'); role.className = 'chip' + (user.role === 'admin' ? ' admin' : '');
    const dot = document.createElement('i'); dot.className = 'd';
    role.append(dot, document.createTextNode(user.role === 'admin' ? '管理员' : '普通用户'));
    const password = document.createElement('button'); password.className = 'btn sm'; password.textContent = '修改密码';
    password.onclick = () => {
      const dialog = document.createElement('dialog'); dialog.className = 'auth-dialog';
      dialog.innerHTML = '<form><h2>修改密码</h2>'
        + '<label class="fld"><span>当前密码</span><input name="current_password" type="password" autocomplete="current-password" required></label>'
        + '<label class="fld"><span>新密码（至少 12 位）</span><input name="new_password" type="password" autocomplete="new-password" required minlength="12"></label>'
        + '<label class="fld"><span>再输一次新密码</span><input name="confirm_password" type="password" autocomplete="new-password" required minlength="12"></label>'
        + '<p class="auth-note">保存后当前登录会失效，需要重新登录。</p>'
        + '<p role="alert"></p>'
        + '<footer><button type="button" class="btn">取消</button><button type="submit" class="btn primary">保存</button></footer></form>';
      dialog.querySelector('[type=button]').onclick = () => dialog.remove();
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
    exit.onclick = () => logout().catch(() => {});
    container.append(who, role, password, exit);
  }
  window.H3Auth = {request,json,me,requireUser,every,login,register,logout,mountAccount, get user(){return user;}, get active(){return !!user && !stopped;}};
})();
