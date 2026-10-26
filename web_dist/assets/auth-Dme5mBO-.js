(()=>{const e=document.createElement("style");e.textContent=`
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
  #h3-errors {
    box-sizing: border-box; position: fixed; inset: 16px 12px auto; margin: 0 auto;
    width: min(720px, calc(100vw - 24px)); max-height: min(55dvh, 480px); overflow: auto;
    padding: 0; color: #fff1f2; background: #38151c; border: 2px solid #fb7185;
    border-radius: 12px; box-shadow: 0 12px 40px #0009; z-index: 2147483647;
    font: 14px/1.6 "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
    text-align: left; white-space: normal; pointer-events: auto;
  }
  #h3-errors[hidden] { display: none; }
  #h3-errors::backdrop { background: transparent; pointer-events: none; }
  #h3-errors .h3-error-heading { display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; background: #9f1239; color: #fff; }
  #h3-errors .h3-error-heading strong { flex: 1; font-size: 16px; }
  #h3-errors .h3-error-icon { display: grid; place-items: center; width: 24px; height: 24px;
    border: 2px solid currentColor; border-radius: 50%; font-weight: 800; }
  #h3-errors .h3-error-item { display: flex; align-items: flex-start; gap: 12px;
    padding: 14px; border-top: 1px solid #fb71854d; }
  #h3-errors .h3-error-message { flex: 1; min-width: 0; margin: 0; color: #fff1f2;
    font: inherit; white-space: pre-wrap; overflow-wrap: anywhere; user-select: text; }
  #h3-errors button { flex: none; display: grid; place-items: center; min-width: 36px;
    min-height: 36px; padding: 4px 8px; margin: 0; border: 1px solid #fda4af80;
    border-radius: 6px; background: transparent; color: #fff; font: inherit; cursor: pointer; }
  #h3-errors button:hover { background: #ffffff20; }
  #h3-errors button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
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
  .auth-dialog.phone-dialog { box-sizing: border-box; width: min(440px, calc(100vw - 32px));
    max-height: calc(100dvh - 32px); overflow-y: auto; border-color: #343b47; border-radius: 12px;
    box-shadow: 0 24px 70px #0008; font: 14px/1.6 "Microsoft YaHei", "PingFang SC", system-ui, sans-serif; }
  .phone-dialog h2 { font-size: 18px; letter-spacing: 0; }
  .phone-dialog .auth-note { color: var(--dim, var(--muted, #a5acb8)); font-size: 14px; }
  .phone-dialog .fld { display: grid; gap: 8px; }
  .phone-dialog .fld > span { font-size: 14px; }
  .phone-dialog input { box-sizing: border-box; min-width: 0; min-height: 44px; border: 1px solid #424b59;
    border-radius: 8px; background: var(--panel2, #16191f); color: var(--txt, var(--text, #f3f4f6)); font: inherit; }
  .phone-dialog input::placeholder { color: #a5acb8; }
  .phone-dialog :is(input, button):focus-visible { outline: 2px solid #7dd3fc; outline-offset: 3px; }
  .phone-dialog footer .btn { min-height: 44px; border-color: #424b59; border-radius: 8px; color: #e5e7eb; }
  .phone-dialog footer .btn.primary { color: #111318; background: #f3f4f6; border-color: #f3f4f6; }
  .phone-dialog footer .btn:hover { color: #fff; border-color: #7dd3fc; box-shadow: none; }
  .phone-dialog footer .btn.primary:hover { color: #111318; background: #dce1e9; }
  @media (prefers-reduced-motion: reduce) { .btn { transition: none; } }
  `,document.head.append(e)})();(()=>{let e;const b=new Map;function x(){if(!e||!b.size)return;const y=[...document.querySelectorAll("dialog:modal")].at(-1)||document.body;e.parentElement!==y&&(e.hidePopover&&e.matches(":popover-open")&&e.hidePopover(),y.append(e)),e.style.top=document.querySelector("#maintenance-banner:not([hidden])")?"56px":"16px",e.showPopover&&!e.matches(":popover-open")&&e.showPopover()}function C(y){const w=e.contains(document.activeElement);b.get(y)?.remove(),b.delete(y),b.size?w&&e.querySelector("button").focus({preventScroll:!0}):(e.hidePopover&&e.matches(":popover-open")&&e.hidePopover(),e.hidden=!0)}function A(y){const w=String(y?.message||y||"操作失败，请重试");try{if(window.parent!==window&&window.parent.H3Notify)return window.parent.H3Notify.error(w)}catch{}if(!e){e=document.createElement("section"),e.id="h3-errors",e.hidden=!0,e.setAttribute("aria-label","错误通知"),typeof e.showPopover=="function"&&e.setAttribute("popover","manual");const g=document.createElement("div");g.className="h3-error-heading",g.innerHTML='<span class="h3-error-icon" aria-hidden="true">!</span><strong>操作失败</strong>';const m=document.createElement("button");m.type="button",m.textContent="全部关闭",m.setAttribute("aria-label","关闭全部错误通知"),m.onclick=()=>{for(const v of[...b.keys()])C(v)},g.append(m),e.append(g),new MutationObserver(x).observe(document.body,{subtree:!0,childList:!0,attributes:!0,attributeFilter:["open","hidden"]})}if(b.has(w))e.hidden=!1,x();else{const g=document.createElement("div");g.className="h3-error-item";const m=document.createElement("p");m.className="h3-error-message",m.setAttribute("role","alert"),m.setAttribute("aria-atomic","true"),m.textContent=w;const v=document.createElement("button");v.type="button",v.textContent="×",v.setAttribute("aria-label","关闭此错误通知"),v.onclick=()=>C(w),g.append(m,v),e.append(g),b.set(w,g),e.hidden=!1,x(),g.scrollIntoView({block:"nearest"})}}window.H3Notify={error:A}})();(()=>{let e=null,b="",x=!1,C=null,A=!1,y=!1,w=null,g=!1,m=null,v="clear",S=null;const H=new Set,O=new Set;function I(n=!0){x=!0,e=null,b="",R(),v="clear",z(!1),H.forEach(o=>o.abort()),O.forEach(clearInterval),O.clear(),window.dispatchEvent(new Event("h3auth:expired")),n&&!["/login","/login.html"].includes(location.pathname)&&location.replace("/login")}async function L(n,o={}){const t=new URL(n,location.href);if(t.origin!==location.origin)throw new Error("只允许同源请求");const a=t.pathname==="/api/auth/login"||t.pathname==="/api/auth/register";if(x&&!a)throw new Error("登录已失效");const i=(o.method||"GET").toUpperCase(),s=new Headers(o.headers);if(!["GET","HEAD","OPTIONS"].includes(i)&&!a){if(!b)throw new Error("会话未就绪，请重新登录");s.set("X-CSRF-Token",b)}const l=new AbortController;H.add(l);const c=()=>l.abort(o.signal.reason);o.signal?.aborted?c():o.signal?.addEventListener("abort",c,{once:!0});try{const d=await fetch(t,{...o,method:i,headers:s,credentials:"same-origin",signal:l.signal}),f=(d.headers.get("content-type")||"").includes("json")?await d.json():await d.text();if(!d.ok){const u=typeof f=="string"?f:f.error?.message||f.error||f.message,h=Object.assign(new Error(String(u||`请求失败（${d.status}）`).slice(0,500)),{status:d.status,data:f});throw d.status===401&&!a&&I(t.pathname!=="/api/auth/me"||!["/login","/login.html"].includes(location.pathname)),[403,404].includes(d.status)&&window.dispatchEvent(new CustomEvent("h3auth:denied",{detail:{path:t.pathname,method:i,error:h}})),h}if(x&&!a)throw new Error("登录已失效");return f}finally{o.signal?.removeEventListener("abort",c),H.delete(l)}}const M=(n,o,t)=>L(n,{method:o,headers:{"Content-Type":"application/json"},body:JSON.stringify(t||{})});async function j(){if(!(x||e?.role==="monitor"||document.hidden))return w||(w=M("/api/auth/presence","POST").then(n=>{const o=document.querySelector("#workspace-nav .workspace-presence b");return o&&(o.textContent=String(n.online_users)),window.dispatchEvent(new CustomEvent("h3auth:presence",{detail:n})),n}).finally(()=>{w=null})),w}function K(){y||(y=!0,j().catch(()=>{}),B(j,3e4),document.addEventListener("visibilitychange",()=>{document.hidden||j().catch(()=>{})}))}const Y="系统正在维护更新，当前暂无可用执行节点，请稍后再使用。",$="部分节点正在维护更新，其他可用节点仍可正常使用。",Q=5e3;function Z(){if(window!==window.top||!document.body)return null;let n=document.getElementById("maintenance-banner");if(n)return n;n=document.createElement("div"),n.id="maintenance-banner",n.hidden=!0,n.setAttribute("role","status"),n.setAttribute("aria-live","polite"),n.setAttribute("aria-atomic","true"),n.setAttribute("aria-label","系统维护通知");const o=document.createElement("span");o.className="maintenance-banner-icon",o.setAttribute("aria-hidden","true"),o.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/></svg>';const t=document.createElement("div");t.className="maintenance-banner-ticker";const a=document.createElement("div");a.className="maintenance-banner-track";for(let i=0;i<2;i++){const s=document.createElement("span");s.className="maintenance-banner-message",s.textContent=Y,i&&s.setAttribute("aria-hidden","true"),a.append(s)}return t.append(a),n.append(o,t),document.body.prepend(n),n}function z(n,o){const t=n?Z():document.getElementById("maintenance-banner");t&&(o&&t.querySelectorAll(".maintenance-banner-message").forEach(a=>{a.textContent=o}),t.hidden=!n)}function R(){S!==null&&clearTimeout(S),S=null}function ee(n){const o=n.maintenance_active!==!0?"clear":n.comfy_online===!0?"partial":"blocked";o!==v&&(v=o,R(),o==="clear"?z(!1):o==="blocked"?z(!0,Y):(z(!0,$),S=setTimeout(()=>{S=null,v==="partial"&&z(!1)},Q)))}async function V(){if(!(x||e?.role==="monitor"||document.hidden)){if(!m){const n=new AbortController,o=setTimeout(()=>n.abort(),4e3);m=L("/api/health",{cache:"no-store",signal:n.signal}).then(t=>(ee(t),t)).finally(()=>{clearTimeout(o),m=null})}return m}}function te(){window!==window.top||g||(g=!0,V().catch(()=>{}),B(V,5e3),document.addEventListener("visibilitychange",()=>{document.hidden||V().catch(()=>{})}))}async function U(){return C||(C=L("/api/auth/me",{cache:"no-store"}).then(n=>(e=n.user,b=n.csrf_token,A=n.local_test===!0,e.role!=="monitor"&&(K(),te()),e)).finally(()=>{C=null})),C}let P=null;function ne(){return A||e.role==="monitor"||e.phone!==""?Promise.resolve():P||(P=new Promise((n,o)=>{const t=document.createElement("dialog");t.className="auth-dialog phone-dialog",t.id="phone-dialog",t.setAttribute("aria-labelledby","phone-title"),t.setAttribute("aria-describedby","phone-note"),t.innerHTML='<form><h2 id="phone-title">补充手机号</h2><p id="phone-note" class="auth-note">当前账号尚未填写手机号，请补充后继续使用。手机号仅本人和管理员可见，不用于短信验证或登录。</p><label class="fld"><span>手机号</span><input name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" required maxlength="11" pattern="1[3-9][0-9]{9}" placeholder="请输入 11 位中国大陆手机号" aria-describedby="phone-error" autofocus></label><p id="phone-error" role="alert"></p><footer><button type="button" class="btn">退出登录</button><button type="submit" class="btn primary">保存并继续</button></footer></form>';const a=t.querySelector("form"),i=a.elements.phone,s=t.querySelector("[role=alert]"),l=t.querySelector("[type=submit]"),c=t.querySelector("[type=button]");let d=!1;const p=u=>{window.removeEventListener("h3auth:expired",f),t.close(),t.remove(),u?o(u):n()},f=()=>p(new Error("登录已失效，请重新登录"));window.addEventListener("h3auth:expired",f,{once:!0}),t.addEventListener("cancel",u=>u.preventDefault()),t.addEventListener("keydown",u=>u.stopPropagation()),i.oninput=()=>{i.setCustomValidity(""),s.textContent=""},i.oninvalid=()=>{i.setCustomValidity("请输入有效的 11 位中国大陆手机号")},c.onclick=async()=>{d||(d=!0,l.disabled=c.disabled=!0,await D().catch(()=>{}))},a.onsubmit=async u=>{if(u.preventDefault(),!d){d=!0,l.disabled=c.disabled=!0,i.readOnly=!0,l.textContent="正在保存…",s.textContent="";try{e=(await M("/api/auth/phone","POST",{phone:i.value.trim()})).user,p()}catch(h){t.isConnected&&(s.textContent=h.message,i.focus(),H3Notify.error(h.message))}finally{d=!1,l.disabled=c.disabled=!1,i.readOnly=!1,l.textContent="保存并继续"}}},document.body.append(t),t.showModal()}).finally(()=>{P=null}),P)}async function oe(n=!1){const o=await U();if(n&&o.role!=="admin")throw location.replace(o.role==="monitor"?"/monitor":"/"),new Error("仅管理员可访问");return await ne(),e}function B(n,o){if(x)return;const t=setInterval(()=>{x||Promise.resolve(n()).catch(()=>{})},o);return O.add(t),t}async function ae(n,o){const t=await M("/api/auth/login","POST",{username:n,password:o});return e=t.user,b=t.csrf_token,x=!1,e}async function re(n,o,t,a){return M("/api/auth/register","POST",{username:n,display_name:o,password:t,phone:a})}async function D(){try{await M("/api/auth/logout","POST")}finally{I()}}function ie(){const n=document.getElementById("workspace-nav");if(!n||e.role==="monitor"||n.querySelector(".workspace-links"))return;const o={canvas:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',director:'<rect x="3" y="8" width="18" height="13" rx="2"/><path d="m3 8 16-5 2 5M7 7l3-4m4 2 3-3M10 12l5 3-5 3z"/>',teams:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-2-4"/>',controller:'<path d="M3 17V7m6 14V3m6 14V7m6 14V3"/><path d="M1 10h4m2 5h4m2-5h4m2 5h4"/>',permissions:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',costs:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8m-7 4 3 3 3-3m-3 3v4m-3-3h6"/>',capacity:'<path d="M4 3v17h17M8 16v-5m5 5V7m5 9V4"/>'},t=document.createElement("nav");t.className="workspace-links",t.setAttribute("aria-label","工作区导航");const a=l=>{const c=document.createElement("div");c.className="workspace-nav-group",c.setAttribute("role","group"),c.setAttribute("aria-label",l);const d=document.createElement("div");return d.className="workspace-nav-label",d.textContent=l,d.setAttribute("aria-hidden","true"),c.append(d),t.append(c),c};let i=a("工作区");const s=(l,c,d)=>{const p=document.createElement("a");p.className="workspace-link",p.href=d,p.setAttribute("aria-label",c),p.title=c,document.body.dataset.workspace===l&&p.setAttribute("aria-current","page"),l==="director"&&document.body.dataset.workspace==="canvas"&&(p.id="directorbtn"),p.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+o[l]+"</svg><span></span>",p.querySelector("span").textContent=c,i.append(p)};s("canvas","画布","/"),s("director","导演工作台","/director"),(e.role==="admin"||e.team_leader)&&(i=a("管理"),s("teams","项目组","/teams")),e.role==="admin"&&(s("controller","运行面板","/controller"),s("permissions","账号与权限","/admin/permissions"),i=a("统计"),s("costs","费用评估","/controller/costs"),s("capacity","产能统计","/controller/capacity")),n.querySelector(".workspace-footer").before(t)}function se(n){ie();const o=n.closest("#workspace-nav");if(n.replaceChildren(),A){const r=document.createElement("span");r.className="chip",r.textContent="本地测试 · 免登录",n.append(r);return}let t=null,a=null;const i=()=>{a?.matches(":popover-open")&&a.hidePopover()},s=e.display_name?.trim()||e.username,l=document.createElement("span");l.className=o?"account-name":"who",l.textContent=o?s:e.username;const c=document.createElement("span");c.className="chip"+(e.role==="admin"?" admin":"");const d=document.createElement("i");d.className="d";const p=e.role==="admin"?"管理员":e.role==="monitor"?"监控展示员":e.team_leader?"组长":"普通用户";c.append(d,document.createTextNode(p));const f=document.createElement("a");f.className="btn sm",f.href="/teams",f.textContent="项目组";const u=document.createElement("button");u.className="btn sm",u.textContent="修改密码",u.onclick=()=>{i();const r=document.createElement("dialog");r.className="auth-dialog",r.setAttribute("aria-label","修改密码"),r.addEventListener("keydown",E=>E.stopPropagation()),r.addEventListener("close",()=>{r.remove(),t?.focus()},{once:!0}),r.innerHTML='<form><h2>修改密码</h2><label class="fld"><span>当前密码</span><input name="current_password" type="password" autocomplete="current-password" required></label><label class="fld"><span>新密码（至少 8 位）</span><input name="new_password" type="password" autocomplete="new-password" required minlength="8"></label><label class="fld"><span>再输一次新密码</span><input name="confirm_password" type="password" autocomplete="new-password" required minlength="8"></label><p class="auth-note">密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。保存后需要重新登录。</p><p role="alert"></p><footer><button type="button" class="btn">取消</button><button type="submit" class="btn primary">保存</button></footer></form>',r.querySelector("[type=button]").onclick=()=>r.close(),r.querySelector("form").onsubmit=async E=>{E.preventDefault();const k=E.currentTarget,G=k.querySelector("[role=alert]"),N=Object.fromEntries(new FormData(k));if(N.new_password!==N.confirm_password){G.textContent="两次输入的新密码不一致",k.elements.confirm_password.focus();return}try{await M("/api/auth/password","POST",{current_password:N.current_password,new_password:N.new_password}),r.isConnected&&r.remove(),I()}catch(_){const J=r.isConnected&&r.querySelector("[role=alert]");J&&(J.textContent=_.message),H3Notify.error(_.message)}},document.body.append(r),r.showModal()};const h=document.createElement("button");if(h.className="btn sm",h.textContent="退出登录",h.onclick=()=>{i(),D().catch(()=>{})},e.role==="monitor"){n.append(l,c,h);return}if(!o){n.append(l,c),(e.role==="admin"||e.team_leader)&&n.append(f),n.append(u,h);return}t=document.createElement("button"),t.className="account-trigger",t.type="button",t.setAttribute("aria-label","用户菜单："+s),t.setAttribute("aria-expanded","false"),t.setAttribute("aria-controls","account-menu");const q=document.createElement("span");q.className="account-avatar",q.setAttribute("aria-hidden","true"),q.textContent=Array.from(s)[0]?.toUpperCase()||"?",t.append(q,l),a=document.createElement("div"),a.className="account-menu",a.id="account-menu",a.popover="auto",a.setAttribute("aria-label","账号菜单"),t.popoverTargetElement=a;const F=document.createElement("div");F.className="account-menu-heading";const W=document.createElement("b");W.textContent=s;const X=document.createElement("small");X.textContent=e.username+" · "+p,F.append(W,X);const T=document.createElement("button");T.type="button",T.textContent="用户信息",T.onclick=()=>{i();const r=document.createElement("dialog");r.className="auth-dialog",r.setAttribute("aria-label","用户信息"),r.innerHTML='<form method="dialog"><h2>用户信息</h2><dl class="account-info"></dl><footer><button class="btn primary">关闭</button></footer></form>';const E=r.querySelector("dl");for(const[k,G]of[["姓名 / 花名",e.display_name?.trim()||"未填写"],["用户名",e.username],["手机号",e.phone||"未填写"],["角色",p],["用户 ID",e.id]]){const N=document.createElement("dt");N.textContent=k;const _=document.createElement("dd");_.textContent=G,E.append(N,_)}r.addEventListener("keydown",k=>k.stopPropagation()),r.addEventListener("close",()=>{r.remove(),t.focus()},{once:!0}),document.body.append(r),r.showModal()},T.className=u.className="account-action",h.className="account-action danger",a.append(F,T,u,h),a.addEventListener("keydown",r=>r.stopPropagation()),a.addEventListener("beforetoggle",r=>{const E=r.newState==="open";if(t.setAttribute("aria-expanded",String(E)),E){const k=t.getBoundingClientRect();a.style.left=Math.max(8,Math.min(k.left,innerWidth-Math.min(260,innerWidth-16)-8))+"px",a.style.bottom=Math.max(8,innerHeight-k.top+8)+"px",a.style.maxHeight=Math.max(44,k.top-16)+"px",window.addEventListener("resize",i)}else window.removeEventListener("resize",i)}),n.append(t,a)}window.H3Auth={request:L,json:M,me:U,requireUser:oe,every:B,login:ae,register:re,logout:D,mountAccount:se,get user(){return e},get active(){return!!e&&!x}}})();
