import{a as Ee}from"./index-DfB5YslK.js";import{l as We,d as ce,s as r,n as E,b as D,_ as De,a as L,r as W,o as S,f as le,g as ge,p as be,h as J,i as Ve,A as Ne,j as $e,k as Ge,H as Je}from"./session-DpSlpDLM.js";const I=We(()=>ce([r(),E().finite(),D(),De(),L(I),W(r(),I)]));function Le(n){const c=new WeakSet;function s(a){if(a===null||typeof a=="string"||typeof a=="boolean"||typeof a=="number"&&Number.isFinite(a))return a;if(typeof a!="object"||a===null)throw new Error("持久化数据必须是 JSON");if(a instanceof Node||Object.getPrototypeOf(a)!==Object.prototype&&!Array.isArray(a))throw new Error("持久化数据不能包含 DOM 或运行时实例");if(c.has(a))throw new Error("持久化数据存在循环引用");c.add(a);const e=Array.isArray(a)?a.map(s):Object.fromEntries(Object.entries(a).filter(([,x])=>x!==void 0).map(([x,w])=>[x,s(w)]));return c.delete(a),e}return s(n)}const Ye=le(["queued","running","done","error","canceled"]),_e=S({id:r(),status:Ye,project:r().optional(),card:r().optional(),permission:le(["read","operate"]).optional(),progress:E().nullable().optional(),error:r().nullable().optional(),step:r().nullable().optional(),seed:ce([E(),r()]).nullable().optional(),queue_remaining:E().nullable().optional(),started:E().nullable().optional(),ended:E().nullable().optional(),outputs:L(W(r(),ge())).optional()}).passthrough(),Ke=S({jobs:L(_e)}),wt=S({ok:D().optional(),pending:D().optional()}).passthrough(),Xe=S({capability:r(),params:W(r(),I),assets:W(r(),r()),project:r(),projectName:r().optional(),card:r(),cardName:r().optional()});function Qe(){let n=!1;const c=[],s=new Set,a=new Set,e=new Set,x=new AbortController,w=new Set,v=d=>{for(const l of d)for(const f of l.addedNodes)f instanceof Element&&!f.closest("#root")&&w.add(f)},h=new MutationObserver(v);h.observe(document.body,{childList:!0}),h.observe(document.head,{childList:!0});function y(d){return new Proxy(d,{get(l,f){if(f==="addEventListener")return(Q,oe,re)=>{n||(l.addEventListener(Q,oe,re),c.push(()=>l.removeEventListener(Q,oe,re)))};const X=Reflect.get(l,f,l);return typeof X=="function"?X.bind(l):X}})}const b=new Map,t=new Proxy(y(window),{get(d,l){if(b.has(l))return b.get(l);const f=Reflect.get(d,l,d);return f===window?t:f},set(d,l,f){return b.set(l,f),!0}}),g=(d,l=0)=>{if(n)return 0;const f=window.setTimeout(()=>{s.delete(f),n||d()},l);return s.add(f),f},R=d=>{window.clearTimeout(d),d!==void 0&&s.delete(d)},q=(d,l)=>{if(n)return 0;const f=window.setInterval(()=>{n||d()},l);return a.add(f),f},G=d=>{window.clearInterval(d),d!==void 0&&a.delete(d)},O=d=>{if(n)return 0;const l=window.requestAnimationFrame(f=>{e.delete(l),n||d(f)});return e.add(l),l},U=d=>{window.cancelAnimationFrame(d),e.delete(d)},_=(d,l)=>fetch(d,{...l,signal:l?.signal?AbortSignal.any([l.signal,x.signal]):x.signal});class N extends WebSocket{constructor(l,f){super(l,f),c.push(()=>{this.onclose=null,this.onmessage=null,this.onopen=null,this.close(1e3,"editor disposed")})}}class P extends ResizeObserver{constructor(l){super(l),c.push(()=>this.disconnect())}}class de extends MutationObserver{constructor(l){super(l),c.push(()=>this.disconnect())}}class Y extends IntersectionObserver{constructor(l,f){super(l,f),c.push(()=>this.disconnect())}}class K extends URL{static createObjectURL(l){const f=URL.createObjectURL(l);return c.push(()=>URL.revokeObjectURL(f)),f}}return{nativeWindow:window,window:t,document:y(document),addEventListener:t.addEventListener.bind(t),setTimeout:g,clearTimeout:R,setInterval:q,clearInterval:G,requestAnimationFrame:O,cancelAnimationFrame:U,fetch:_,URL:K,WebSocket:N,ResizeObserver:P,MutationObserver:de,IntersectionObserver:Y,signal:x.signal,get disposed(){return n},onDispose(d){c.push(d)},dispose(){if(!n){n=!0,x.abort(),v(h.takeRecords()),h.disconnect(),s.forEach(window.clearTimeout),a.forEach(window.clearInterval),e.forEach(window.cancelAnimationFrame);for(const d of c.reverse())d();w.forEach(d=>d.remove()),b.clear()}}}}const Se=(n,c)=>{const s=new URL(n||c,window.location.origin);if(!["http:","https:"].includes(s.protocol)||s.username||s.password)throw new Error("服务地址必须为 HTTP(S) URL");return s.href.replace(/\/$/,"")},ae=Object.freeze({ifBridgeURL:Se("http://127.0.0.1:8278","http://127.0.0.1:8278"),adminBaseURL:Se("/",window.location.origin)}),Ze=S({url:r(),ref:r().optional(),kind:r().optional()}).catchall(I),je=S({id:r().min(1),type:r(),cap:r().optional(),x:E().finite(),y:E().finite(),params:W(r(),I).default({}),assets:W(r(),I).default({}),status:r().nullable().optional(),job:r().nullable().optional(),outputs:L(Ze).optional(),history:L(I).optional()}).catchall(I),et=S({from:r(),to:r(),slot:r().optional()}).catchall(I),tt=S({id:r(),name:r().optional(),cards:L(r())}).catchall(I),nt=S({x:E().finite(),y:E().finite(),k:E().positive()}),Me=S({id:r().min(1),name:r(),rev:E().int().nonnegative().default(0),cards:be(n=>n??[],L(je)),edges:be(n=>n??[],L(et)),groups:be(n=>n??[],L(tt)),view:nt.optional(),permission:le(["read","operate"]).optional(),locked:D().optional()}).catchall(I).superRefine((n,c)=>{const s=n.cards.map(a=>a.id);new Set(s).size!==s.length&&c.addIssue({code:"custom",message:"节点 ID 重复"})});function se(n){return Me.parse(n)}function Te(n){if(!n||typeof n!="object"||!("cards"in n)||!Array.isArray(n.cards))throw new Error("画布缺少节点数组");const c=n.cards.map(a=>{if(!a||typeof a!="object")throw new Error("节点格式无效");return Object.fromEntries(Object.entries(a).filter(([e])=>!e.startsWith("_")))}),s=se(Le({...n,cards:c}));return{rev:s.rev,name:s.name,cards:s.cards,edges:s.edges,groups:s.groups}}const Ce=S({connection_id:r(),user_id:ce([r(),E()]),name:r(),x:E().nullable(),y:E().nullable(),visible:D()}),at=Ve("type",[S({type:J("presence"),members:L(Ce),self:r(),version:E().int()}),Ce.extend({type:J("cursor")}),S({type:J("card-added"),card:je,rev:E().int()}),S({type:J("project-changed"),project:Me}),S({type:J("project-deleted")})]),ot=S({type:J("cursor"),x:E().finite(),y:E().finite(),visible:D()});function rt(n){const c=JSON.parse(n);return at.parse(c)}function it(n){return JSON.stringify(ot.parse(n))}const st=S({id:r(),name:r(),cards:E().default(0),permission:le(["read","operate"]),owner_id:ce([r(),E()]).optional(),owner_display_name:r().optional(),team_id:r().nullable().optional(),team_name:r().nullable().optional(),locked:D().optional(),shared_personally:D().optional(),shared_team_ids:L(r()).optional(),share_count:E().optional()}),ct=S({id:r(),name:r()}),Oe=S({projects:L(st),teams:L(ct).default([])});function lt(n,c,s){if(n.team_id)return s.some(x=>x.id===n.team_id)?[`team:${n.team_id}`]:["shared"];const a=String(n.owner_id)===String(c),e=a?["personal"]:[];!a&&n.shared_personally&&e.push("shared");for(const x of n.shared_team_ids||[])e.push(`team:${x}`);return!a&&!e.length&&e.push("shared"),e}const Ae=S({id:r(),name:r().optional(),username:r().optional(),display_name:r().optional()}),dt=S({users:L(Ae).default([]),teams:L(Ae).default([]),user_ids:L(r()).default([]),team_ids:L(r()).default([])});function pt(n){const c=s=>`/api/projects/${encodeURIComponent(s)}`;return{list:()=>n.read("/api/projects",Oe),get:async s=>se(await n.request(c(s))),create:async(s,a)=>se(await n.json("/api/projects","POST",{name:s,team_id:a})),rename:(s,a)=>n.json(`${c(s)}/rename`,"POST",{name:a}),remove:s=>n.request(c(s),{method:"DELETE"}),save:(s,a)=>n.json(c(s),"PUT",Te(a)),shares:s=>n.read(`${c(s)}/shares`,dt),share:(s,a,e)=>n.json(`${c(s)}/shares`,"PUT",{user_ids:a,team_ids:e})}}function ut(n){return{baseURL:ae.ifBridgeURL,async request(c,s={}){const a=new URL(ae.ifBridgeURL+c);if(a.origin!==new URL(ae.ifBridgeURL).origin)throw new Error("桥接地址无效");const e=await n(a,{...s,credentials:"omit"}),x=await e.json();if(!e.ok)throw new Ne($e(x,`本机桥接返回 ${e.status}`),e.status,x);return x}}}const ft=S({cards:L(W(r(),ge())),capabilities:W(r(),W(r(),ge()))}).passthrough(),mt=n=>{if(!n||typeof n!="object"||Array.isArray(n))throw new Error("节点格式无效");return Le(Object.fromEntries(Object.entries(n).filter(([c])=>!c.startsWith("_"))))};function ht(n,c){const s=ut(c.fetch);async function a(w,v={}){const h=new URL(w,window.location.href),y=(v.method||"GET").toUpperCase();let b=v;if(y==="PUT"&&/^\/api\/projects\/[^/]+$/.test(h.pathname)&&typeof v.body=="string"){const g=JSON.parse(v.body);g&&typeof g=="object"&&"cards"in g&&(b={...v,body:JSON.stringify(Te({id:decodeURIComponent(h.pathname.split("/").at(-1)||""),...g}))})}y==="POST"&&h.pathname==="/api/generate"&&typeof b.body=="string"&&Xe.parse(JSON.parse(b.body));const t=await n.request(w,{...b,signal:v.signal?AbortSignal.any([v.signal,c.signal]):c.signal});return["/api/auth/me","/api/auth/login"].includes(h.pathname)?Ge.parse(t):y==="GET"&&/^\/api\/projects\/[^/]+$/.test(h.pathname)?se(t):y==="GET"&&h.pathname==="/api/projects"?Oe.parse(t):y==="GET"&&h.pathname==="/api/jobs"?Ke.parse(t):y==="POST"&&h.pathname==="/api/generate"?_e.parse(t):y==="GET"&&h.pathname==="/api/cards"?ft.parse(t):t}const e=async(w,v)=>{const h=new URL(w instanceof Request?w.url:String(w),window.location.href),y=h.origin===window.location.origin&&h.pathname.startsWith("/api/"),b=h.origin===new URL(s.baseURL).origin;if(!y&&!b)throw new Error("仅支持本站媒体或已配置的本机 IF 桥接");const t=await c.fetch(w,{...v,credentials:b?"omit":"same-origin"});return y&&t.status===401&&(n.invalidate(),window.dispatchEvent(new Event("h3auth:expired"))),y&&[403,404].includes(t.status)&&window.dispatchEvent(new CustomEvent("h3auth:denied",{detail:{path:h.pathname,method:v?.method||"GET",error:new Ne("媒体不可访问",t.status,null)}})),t};return{request:a,json:(w,v,h={})=>a(w,{method:v,headers:{"Content-Type":"application/json"},body:JSON.stringify(h)}),adminURL:w=>ae.adminBaseURL+w,parsePresence:rt,serializeCursor:it,projects:pt(n),projectSpaces:lt,plainCard:mt,localBridge:s,mediaFetch:e,WebSocket:c.WebSocket,presence(w){const v=new URL(`/api/projects/${encodeURIComponent(w)}/presence`,window.location.href);return v.protocol=v.protocol==="https:"?"wss:":"ws:",new c.WebSocket(v)}}}function bt(n,c,s){const{window:a,document:e,setTimeout:x,clearTimeout:w,setInterval:v,clearInterval:h,MutationObserver:y}=n;let b;return(()=>{const t=e.createElement("style");t.textContent=`
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
  `,t.textContent=`@scope (body[data-chouka-page]) {
`+t.textContent.replaceAll("body",":scope")+`
}`,e.head.append(t)})(),(()=>{let t;const g=new Map;function R(){if(!t||!g.size)return;const O=[...e.querySelectorAll("dialog:modal")].at(-1)||e.body;t.parentElement!==O&&(t.hidePopover&&t.matches(":popover-open")&&t.hidePopover(),O.append(t)),t.style.top=e.querySelector("#maintenance-banner:not([hidden])")?"56px":"16px",t.showPopover&&!t.matches(":popover-open")&&t.showPopover()}function q(O){const U=t.contains(e.activeElement);g.get(O)?.remove(),g.delete(O),g.size?U&&t.querySelector("button").focus({preventScroll:!0}):(t.hidePopover&&t.matches(":popover-open")&&t.hidePopover(),t.hidden=!0)}function G(O){if(n.disposed)return;const U=String(O?.message||O||"操作失败，请重试");try{if(a.parent!==a&&a.parent.H3Notify)return a.parent.H3Notify.error(U)}catch{}if(!t){t=e.createElement("section"),t.id="h3-errors",t.hidden=!0,t.setAttribute("aria-label","错误通知"),typeof t.showPopover=="function"&&t.setAttribute("popover","manual");const _=e.createElement("div");_.className="h3-error-heading",_.innerHTML='<span class="h3-error-icon" aria-hidden="true">!</span><strong>操作失败</strong>';const N=e.createElement("button");N.type="button",N.textContent="全部关闭",N.setAttribute("aria-label","关闭全部错误通知"),N.onclick=()=>{for(const P of[...g.keys()])q(P)},_.append(N),t.append(_),new y(R).observe(e.body,{subtree:!0,childList:!0,attributes:!0,attributeFilter:["open","hidden"]})}if(g.has(U))t.hidden=!1,R();else{const _=e.createElement("div");_.className="h3-error-item";const N=e.createElement("p");N.className="h3-error-message",N.setAttribute("role","alert"),N.setAttribute("aria-atomic","true"),N.textContent=U;const P=e.createElement("button");P.type="button",P.textContent="×",P.setAttribute("aria-label","关闭此错误通知"),P.onclick=()=>q(U),_.append(N,P),t.append(_),g.set(U,_),t.hidden=!1,R(),_.scrollIntoView({block:"nearest"})}}b={error:G},a.H3Notify=b})(),(()=>{let t=null,g=!1,R=null,q=!1,G=!1,O=null,U=!1,_=null,N="clear",P=null;const de=new Set,Y=new Set;function K(o=!0){g=!0,t=null,c.invalidate(),xe(),N="clear",Z(!1),de.forEach(p=>p.abort()),Y.forEach(h),Y.clear(),a.dispatchEvent(new Event("h3auth:expired")),o&&location.pathname!=="/login"&&location.replace("/login")}a.addEventListener("h3auth:expired",()=>{g||K()});const d=(o,p={})=>c.request(o,p),l=(o,p,i)=>d(o,{method:p,headers:{"Content-Type":"application/json"},body:JSON.stringify(i||{})});async function f(){if(!(g||e.hidden))return O||(O=l("/api/auth/presence","POST").then(o=>{const p=e.querySelector("#workspace-nav .workspace-presence b");return p&&(p.textContent=String(o.online_users)),a.dispatchEvent(new CustomEvent("h3auth:presence",{detail:o})),o}).finally(()=>{O=null})),O}function X(){G||(G=!0,f().catch(()=>{}),ue(f,3e4),e.addEventListener("visibilitychange",()=>{e.hidden||f().catch(()=>{})}))}const Q="系统正在维护更新，当前暂无可用执行节点，请稍后再使用。",oe="部分节点正在维护更新，其他可用节点仍可正常使用。",re=5e3;function Pe(){if(a!==a.top||!e.body)return null;let o=e.getElementById("maintenance-banner");if(o)return o;o=e.createElement("div"),o.id="maintenance-banner",o.hidden=!0,o.setAttribute("role","status"),o.setAttribute("aria-live","polite"),o.setAttribute("aria-atomic","true"),o.setAttribute("aria-label","系统维护通知");const p=e.createElement("span");p.className="maintenance-banner-icon",p.setAttribute("aria-hidden","true"),p.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/></svg>';const i=e.createElement("div");i.className="maintenance-banner-ticker";const m=e.createElement("div");m.className="maintenance-banner-track";for(let k=0;k<2;k++){const C=e.createElement("span");C.className="maintenance-banner-message",C.textContent=Q,k&&C.setAttribute("aria-hidden","true"),m.append(C)}return i.append(m),o.append(p,i),e.body.prepend(o),o}function Z(o,p){const i=o?Pe():e.getElementById("maintenance-banner");i&&(p&&i.querySelectorAll(".maintenance-banner-message").forEach(m=>{m.textContent=p}),i.hidden=!o)}function xe(){P!==null&&w(P),P=null}function ze(o){const p=o.maintenance_active!==!0?"clear":o.comfy_online===!0?"partial":"blocked";p!==N&&(N=p,xe(),p==="clear"?Z(!1):p==="blocked"?Z(!0,Q):(Z(!0,oe),P=x(()=>{P=null,N==="partial"&&Z(!1)},re)))}async function pe(){if(!(g||e.hidden)){if(!_){const o=new AbortController,p=x(()=>o.abort(),4e3);_=d("/api/health",{cache:"no-store",signal:o.signal}).then(i=>(ze(i),i)).finally(()=>{w(p),_=null})}return _}}function Re(){a!==a.top||U||(U=!0,pe().catch(()=>{}),ue(pe,5e3),e.addEventListener("visibilitychange",()=>{e.hidden||pe().catch(()=>{})}))}async function we(){return R||(R=d("/api/auth/me",{cache:"no-store"}).then(o=>(t=o.user,o.csrf_token,q=o.local_test===!0,X(),Re(),t)).finally(()=>{R=null})),R}let ee=null;function qe(){return q||t.phone!==""?Promise.resolve():ee||(ee=new Promise((o,p)=>{const i=e.createElement("dialog");i.className="auth-dialog phone-dialog",i.id="phone-dialog",i.setAttribute("aria-labelledby","phone-title"),i.setAttribute("aria-describedby","phone-note"),i.innerHTML='<form><h2 id="phone-title">补充手机号</h2><p id="phone-note" class="auth-note">当前账号尚未填写手机号，请补充后继续使用。手机号仅本人和管理员可见，不用于短信验证或登录。</p><label class="fld"><span>手机号</span><input name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" required maxlength="11" pattern="1[3-9][0-9]{9}" placeholder="请输入 11 位中国大陆手机号" aria-describedby="phone-error" autofocus></label><p id="phone-error" role="alert"></p><footer><button type="button" class="btn">退出登录</button><button type="submit" class="btn primary">保存并继续</button></footer></form>';const m=i.querySelector("form"),k=m.elements.phone,C=i.querySelector("[role=alert]"),j=i.querySelector("[type=submit]"),A=i.querySelector("[type=button]");let M=!1;const T=z=>{a.removeEventListener("h3auth:expired",V),i.close(),i.remove(),z?p(z):o()},V=()=>T(new Error("登录已失效，请重新登录"));a.addEventListener("h3auth:expired",V,{once:!0}),i.addEventListener("cancel",z=>z.preventDefault()),i.addEventListener("keydown",z=>z.stopPropagation()),k.oninput=()=>{k.setCustomValidity(""),C.textContent=""},k.oninvalid=()=>{k.setCustomValidity("请输入有效的 11 位中国大陆手机号")},A.onclick=async()=>{M||(M=!0,j.disabled=A.disabled=!0,await fe().catch(()=>{}))},m.onsubmit=async z=>{if(z.preventDefault(),!M){M=!0,j.disabled=A.disabled=!0,k.readOnly=!0,j.textContent="正在保存…",C.textContent="";try{t=(await l("/api/auth/phone","POST",{phone:k.value.trim()})).user,T()}catch(B){i.isConnected&&(C.textContent=B.message,k.focus(),b.error(B.message))}finally{M=!1,j.disabled=A.disabled=!1,k.readOnly=!1,j.textContent="保存并继续"}}},e.body.append(i),i.showModal()}).finally(()=>{ee=null}),ee)}async function Ue(o=!1){const p=await we();if(o&&p.role!=="admin")throw location.replace("/"),new Error("仅管理员可访问");return await qe(),t}function ue(o,p){if(g)return;const i=v(()=>{g||Promise.resolve(o()).catch(()=>{})},p);return Y.add(i),i}async function He(o,p){const i=await l("/api/auth/login","POST",{username:o,password:p});return t=i.user,i.csrf_token,g=!1,t}async function Ie(o,p,i,m){return l("/api/auth/register","POST",{username:o,display_name:p,password:i,phone:m})}async function fe(){try{await l("/api/auth/logout","POST")}finally{K()}}function Be(){const o=e.getElementById("workspace-nav");if(!o||o.querySelector(".workspace-links"))return;const p={canvas:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',director:'<rect x="3" y="8" width="18" height="13" rx="2"/><path d="m3 8 16-5 2 5M7 7l3-4m4 2 3-3M10 12l5 3-5 3z"/>',teams:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-2-4"/>',controller:'<path d="M3 17V7m6 14V3m6 14V7m6 14V3"/><path d="M1 10h4m2 5h4m2-5h4m2 5h4"/>',permissions:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',costs:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8m-7 4 3 3 3-3m-3 3v4m-3-3h6"/>',capacity:'<path d="M4 3v17h17M8 16v-5m5 5V7m5 9V4"/>'},i=e.createElement("nav");i.className="workspace-links",i.setAttribute("aria-label","工作区导航");const m=j=>{const A=e.createElement("div");A.className="workspace-nav-group",A.setAttribute("role","group"),A.setAttribute("aria-label",j);const M=e.createElement("div");return M.className="workspace-nav-label",M.textContent=j,M.setAttribute("aria-hidden","true"),A.append(M),i.append(A),A};let k=m("工作区");const C=(j,A,M)=>{const T=e.createElement("a");T.className="workspace-link",T.href=["/controller","/admin/permissions","/controller/costs","/controller/capacity"].includes(M)?s+M:M,T.setAttribute("aria-label",A),T.title=A,e.body.dataset.workspace===j&&T.setAttribute("aria-current","page"),j==="director"&&e.body.dataset.workspace==="canvas"&&(T.id="directorbtn"),T.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p[j]+"</svg><span></span>",T.querySelector("span").textContent=A,k.append(T)};C("canvas","画布","/"),C("director","导演工作台","/director"),(t.role==="admin"||t.team_leader)&&(k=m("管理"),C("teams","项目组","/teams")),t.role==="admin"&&(C("controller","运行面板","/controller"),C("permissions","账号与权限","/admin/permissions"),k=m("统计"),C("costs","费用评估","/controller/costs"),C("capacity","产能统计","/controller/capacity")),o.querySelector(".workspace-footer").before(i)}function Fe(o){Be();const p=o.closest("#workspace-nav");if(o.replaceChildren(),q){const u=e.createElement("span");u.className="chip",u.textContent="本地测试 · 免登录",o.append(u);return}let i=null,m=null;const k=()=>{m?.matches(":popover-open")&&m.hidePopover()},C=t.display_name?.trim()||t.username,j=e.createElement("span");j.className=p?"account-name":"who",j.textContent=p?C:t.username;const A=e.createElement("span");A.className="chip"+(t.role==="admin"?" admin":"");const M=e.createElement("i");M.className="d";const T=t.role==="admin"?"管理员":t.team_leader?"组长":"普通用户";A.append(M,e.createTextNode(T));const V=e.createElement("a");V.className="btn sm",V.href="/teams",V.textContent="项目组";const z=e.createElement("button");z.className="btn sm",z.textContent="修改密码",z.onclick=()=>{k();const u=e.createElement("dialog");u.className="auth-dialog",u.setAttribute("aria-label","修改密码"),u.addEventListener("keydown",F=>F.stopPropagation()),u.addEventListener("close",()=>{u.remove(),i?.focus()},{once:!0}),u.innerHTML='<form><h2>修改密码</h2><label class="fld"><span>当前密码</span><input name="current_password" type="password" autocomplete="current-password" required></label><label class="fld"><span>新密码（至少 8 位）</span><input name="new_password" type="password" autocomplete="new-password" required minlength="8"></label><label class="fld"><span>再输一次新密码</span><input name="confirm_password" type="password" autocomplete="new-password" required minlength="8"></label><p class="auth-note">密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。保存后需要重新登录。</p><p role="alert"></p><footer><button type="button" class="btn">取消</button><button type="submit" class="btn primary">保存</button></footer></form>',u.querySelector("[type=button]").onclick=()=>u.close(),u.querySelector("form").onsubmit=async F=>{F.preventDefault();const H=F.currentTarget,he=H.querySelector("[role=alert]"),$=Object.fromEntries(new FormData(H));if($.new_password!==$.confirm_password){he.textContent="两次输入的新密码不一致",H.elements.confirm_password.focus();return}try{await l("/api/auth/password","POST",{current_password:$.current_password,new_password:$.new_password}),u.isConnected&&u.remove(),K()}catch(ne){const ke=u.isConnected&&u.querySelector("[role=alert]");ke&&(ke.textContent=ne.message),b.error(ne.message)}},e.body.append(u),u.showModal()};const B=e.createElement("button");if(B.className="btn sm",B.textContent="退出登录",B.onclick=()=>{k(),fe().catch(()=>{})},!p){o.append(j,A),(t.role==="admin"||t.team_leader)&&o.append(V),o.append(z,B);return}i=e.createElement("button"),i.className="account-trigger",i.type="button",i.setAttribute("aria-label","用户菜单："+C),i.setAttribute("aria-expanded","false"),i.setAttribute("aria-controls","account-menu");const ie=e.createElement("span");ie.className="account-avatar",ie.setAttribute("aria-hidden","true"),ie.textContent=Array.from(C)[0]?.toUpperCase()||"?",i.append(ie,j),m=e.createElement("div"),m.className="account-menu",m.id="account-menu",m.popover="auto",m.setAttribute("aria-label","账号菜单"),i.popoverTargetElement=m;const me=e.createElement("div");me.className="account-menu-heading";const ve=e.createElement("b");ve.textContent=C;const ye=e.createElement("small");ye.textContent=t.username+" · "+T,me.append(ve,ye);const te=e.createElement("button");te.type="button",te.textContent="用户信息",te.onclick=()=>{k();const u=e.createElement("dialog");u.className="auth-dialog",u.setAttribute("aria-label","用户信息"),u.innerHTML='<form method="dialog"><h2>用户信息</h2><dl class="account-info"></dl><footer><button class="btn primary">关闭</button></footer></form>';const F=u.querySelector("dl");for(const[H,he]of[["姓名 / 花名",t.display_name?.trim()||"未填写"],["用户名",t.username],["手机号",t.phone||"未填写"],["角色",T],["用户 ID",t.id]]){const $=e.createElement("dt");$.textContent=H;const ne=e.createElement("dd");ne.textContent=he,F.append($,ne)}u.addEventListener("keydown",H=>H.stopPropagation()),u.addEventListener("close",()=>{u.remove(),i.focus()},{once:!0}),e.body.append(u),u.showModal()},te.className=z.className="account-action",B.className="account-action danger",m.append(me,te,z,B),m.addEventListener("keydown",u=>u.stopPropagation()),m.addEventListener("beforetoggle",u=>{const F=u.newState==="open";if(i.setAttribute("aria-expanded",String(F)),F){const H=i.getBoundingClientRect();m.style.left=Math.max(8,Math.min(H.left,innerWidth-Math.min(260,innerWidth-16)-8))+"px",m.style.bottom=Math.max(8,innerHeight-H.top+8)+"px",m.style.maxHeight=Math.max(44,H.top-16)+"px",a.addEventListener("resize",k)}else a.removeEventListener("resize",k)}),o.append(i,m)}a.H3Auth={request:d,json:l,me:we,requireUser:Ue,every:ue,login:He,register:Ie,logout:fe,mountAccount:Fe,get user(){return t},get active(){return!!t&&!g}}})(),{auth:a.H3Auth,notify:b}}function vt(n,c,s,a,e,x){const[w,v]=Ee.useState("");return Ee.useEffect(()=>{if(!n.current)return;document.body.className=a,document.body.dataset.workspace=s,document.body.dataset.choukaPage=c;const h=document.createElement("style");h.textContent=e+`
#root,#page-mount {display:contents}`,document.head.append(h);const y=Qe(),b=new Je(y.fetch),t=ht(b,y),{auth:g,notify:R}=bt(y,{...b,request:t.request,json:t.json,invalidate:b.invalidate.bind(b)},ae.adminBaseURL);window.H3Notify=R;try{x({scope:y,auth:g,notify:R,services:t,http:b})}catch(q){v(q instanceof Error?q.message:String(q))}return()=>{delete window.H3Notify,delete window.ChoukaNodeEditor,y.dispose(),b.invalidate(),h.remove(),delete document.body.dataset.workspace,delete document.body.dataset.choukaPage,document.body.className=""}},[n,c,s,a,e,x]),w}export{Ke as a,Oe as b,lt as p,wt as t,vt as u};
