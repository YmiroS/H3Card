import{HttpClient as Br,reactExports as m,errorMessage as ee,jsxRuntimeExports as e,ApiError as Wr}from"./http-DOrwCtZg.js";import{createSessionService as Hr,userSchema as Gr,LoadingRequest as Vr,jsonSchema as W,useWorkspaceRuntime as Kr}from"./main-BOx1JaeR.js";import{object as R,number as H,boolean as Q,_enum as nn,looseObject as V,array as F,string as C,unknown as tr,union as le,literal as ce,discriminatedUnion as Jr,NEVER as Xr,_null as ar,record as kn}from"./monitor-alerts-DAd3X9Za.js";import{reactDomExports as Yr}from"./index-BgVeoShv.js";const Zr=R({maintenance_active:Q().optional(),comfy_online:Q().optional(),sandbox:Q().optional()}),Qr=R({online_users:H().finite().nonnegative()}),et=R({user:Gr});function nt({fetcher:n=window.fetch.bind(window),origin:r=window.location.origin,onExpired:t,onSandbox:a,onDenied:i=()=>{}}){let s=!1;const o=async(f,u)=>{const y=await n(f,u);return s||(y.headers.get("X-H3Card-Sandbox")==="local-copy"&&a(),y.status===403&&i()),y},l=new Br(o,r,()=>{s||t()});let c,d;const p=new Set;return{http:l,session:Hr(l),health(){if(c)return c;const f=new AbortController;p.add(f);const u=window.setTimeout(()=>f.abort(),4e3);return c=l.read("/api/health",Zr,{cache:"no-store",signal:f.signal}).then(y=>(!s&&y.sandbox===!0&&a(),y)).finally(()=>{window.clearTimeout(u),p.delete(f),c=void 0}),c},presence(){return d??=l.json("/api/auth/presence","POST").then(f=>Qr.parse(f)).finally(()=>{d=void 0}),d},async savePhone(f){const u=f.trim();if(!/^1[3-9][0-9]{9}$/.test(u))throw new Error("请输入有效的 11 位中国大陆手机号");const y=et.parse(await l.json("/api/auth/phone","POST",{phone:u})).user;if(!y.phone)throw new Error("手机号尚未保存，请重试");return y},async changePassword(f,u,y){if(u.length<8)throw new Error("新密码至少需要 8 位");if(u!==y)throw new Error("两次输入的新密码不一致");await l.json("/api/auth/password","POST",{current_password:f,new_password:u})},dispose(){s=!0,p.forEach(f=>f.abort()),p.clear(),l.invalidate()}}}function rt(n,r){return!r&&n.phone===""}function Fn(n){return n==="admin"?null:n==="monitor"?"/monitor":"/"}function Ge(n){return n.maintenance_active!==!0?"clear":n.comfy_online===!0?"partial":"blocked"}function tt(n){const[r,t]=m.useState(null),[a,i]=m.useState(!1),[s,o]=m.useState(""),[l,c]=m.useState(0);m.useEffect(()=>{let u=!1,y=!1,k=()=>{};const w=()=>document.hidden?new Promise(g=>{const N=()=>{document.hidden&&!u||(document.removeEventListener("visibilitychange",N),g())};document.addEventListener("visibilitychange",N),k=()=>{document.removeEventListener("visibilitychange",N),g()}}):Promise.resolve(),v=()=>{u||(u=!0,h.dispose(),t(null),o("登录已失效，请重新登录"),n("/login"))},x=g=>{const N=Fn(g.role);return N?(u=!0,h.dispose(),t(null),n(N),!1):!0},h=nt({onExpired:v,onSandbox:()=>{u||i(!0)},onDenied:()=>{u||y||(y=!0,h.session.me().then(g=>{!u&&x(g.user)&&t(N=>N&&{...N,user:g.user,localTest:g.local_test===!0})}).catch(()=>{}).finally(()=>{y=!1}))}});return t(null),o(""),i(!1),(async()=>{try{const g=await h.session.me();if(u||!x(g.user)||(await w(),u))return;const N=await h.health().catch(()=>({}));u||t({user:g.user,localTest:g.local_test===!0,services:h,initialHealth:N})}catch(g){u||o(ee(g))}})(),()=>{u=!0,k(),h.dispose()}},[l,n]);const d=m.useCallback(()=>c(u=>u+1),[]),p=m.useCallback(u=>{const y=Fn(u.role);y?(r?.services.dispose(),t(null),n(y)):t(k=>k&&{...k,user:u})},[r,n]),f=m.useCallback(()=>{r?.services.dispose(),t(null),o("登录已失效，请重新登录"),n("/login")},[r,n]);return{session:r,sandbox:a,error:s,retry:d,updateUser:p,expire:f}}function at(n,r,t=!0){const[a,i]=m.useState(null),[s,o]=m.useState(()=>Ge(r)),[l,c]=m.useState(()=>Ge(r)!=="clear");return m.useEffect(()=>{if(!t)return;let d=!0,p=Ge(r),f;const u=()=>{f=window.setTimeout(()=>{d&&c(!1)},5e3)};p==="partial"&&u();const y=()=>{document.hidden||n.presence().then(h=>{d&&i(h.online_users)}).catch(()=>{})},k=()=>{document.hidden||n.health().then(h=>{if(!d)return;const g=Ge(h);g!==p&&(p=g,window.clearTimeout(f),o(g),c(g!=="clear"),g==="partial"&&u())}).catch(()=>{})};y();const w=window.setInterval(y,3e4),v=window.setInterval(k,5e3),x=()=>{document.hidden||(y(),k())};return document.addEventListener("visibilitychange",x),()=>{d=!1,window.clearTimeout(f),window.clearInterval(w),window.clearInterval(v),document.removeEventListener("visibilitychange",x)}},[n,r,t]),{online:a,maintenance:s,maintenanceVisible:l}}const st={dashboard:"M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1",costs:"M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2M14 11h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-2.5M12 17v1m0 -8v1",capacity:"M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14M4 20h14",permissions:"M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0M8 11v-4a4 4 0 1 1 8 0v4",teams:"M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0 -3 -3.85",refresh:"M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4",chevron:"M9 6l6 6l-6 6",external:"M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6M11 13l9 -9M15 4h5v5",logout:"M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2M9 12h12l-3 -3M18 15l3 -3",alert:"M12 9v4M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0M12 16h.01"};function De({name:n,className:r="",...t}){return e.jsx("svg",{className:`icon ${r}`,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.7,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",...t,children:e.jsx("path",{d:st[n]})})}const it="_application_6b89z_1",ot="_workspace_6b89z_12",lt="_sandbox_6b89z_15",dt="_navigation_6b89z_18",ct="_accountMenu_6b89z_225",pt="_infoRow_6b89z_281",mt="_dialog_6b89z_295",ut="_maintenance_6b89z_361",ht="_notifications_6b89z_409",pe={application:it,workspace:ot,sandbox:lt,navigation:dt,accountMenu:ct,infoRow:pt,dialog:mt,maintenance:ut,notifications:ht},sr=m.createContext({notify:()=>{},registerModal:()=>()=>{}}),ir=()=>m.useContext(sr);function xt({children:n}){const[r,t]=m.useState([]),[a,i]=m.useState([]),s=m.useCallback(c=>(i(d=>[...d,c]),()=>i(d=>d.filter(p=>p!==c))),[]),o=m.useCallback(c=>{const d=typeof c=="string"?{message:c,tone:"status"}:c instanceof Error?{message:c.message,tone:"error"}:{message:c.message,tone:c.tone??"status"};t(p=>p.some(f=>f.message===d.message&&f.tone===d.tone)?p:[...p,d])},[]),l=a.at(-1)??document.body;return e.jsxs(sr.Provider,{value:{notify:o,registerModal:s},children:[n,r.length>0&&Yr.createPortal(e.jsx(ft,{notices:r,dismiss:c=>t(d=>d.filter(p=>p.message!==c)),clear:()=>t([])}),l)]})}function ft({notices:n,dismiss:r,clear:t}){const a=m.useRef(null);m.useEffect(()=>{const s=a.current;if(s?.isConnected)return s.showPopover?.(),()=>{s.isConnected&&s.hidePopover?.()}},[]);const i=s=>{const o=a.current?.contains(document.activeElement),l=a.current?.parentElement;s(),o&&queueMicrotask(()=>{(a.current?.querySelector("button")??l?.querySelector("[data-operation-status],button")??document.querySelector("main"))?.focus({preventScroll:!0})})};return e.jsxs("section",{id:"h3-errors",ref:a,popover:"manual",className:pe.notifications,"aria-label":"操作通知",children:[e.jsxs("div",{className:"h3-error-heading",children:[e.jsx(De,{name:"alert"}),e.jsx("strong",{children:"操作通知"}),e.jsx("button",{type:"button","aria-label":"关闭全部通知",onClick:()=>i(t),children:"全部关闭"})]}),n.map(s=>e.jsxs("div",{className:"h3-error-item","data-tone":s.tone,children:[e.jsx("p",{className:"h3-error-message",role:s.tone==="error"?"alert":"status","aria-atomic":"true",children:s.message}),e.jsx("button",{type:"button","aria-label":`关闭通知：${s.message}`,onClick:()=>i(()=>r(s.message)),children:"×"})]},`${s.tone}:${s.message}`))]})}function ae({title:n,children:r,onClose:t,onSubmit:a,submitLabel:i="确认",className:s="",showFooter:o=!0,dismissible:l=!0,closeLabel:c,id:d}){const p=m.useId(),f=m.useRef(null),u=m.useRef(null),y=m.useRef(!1),k=m.useRef(!1),w=m.useRef(!1),[v,x]=m.useState(!1),[h,g]=m.useState(""),[N]=m.useState(()=>{const _=document.activeElement instanceof HTMLElement?document.activeElement:null;return{element:_,key:_?.dataset.focusKey}}),{registerModal:A}=ir();m.useLayoutEffect(()=>{const _=f.current;if(!_)return;k.current=!0;const M=N.element,b=N.key;_.showModal();const L=A(_);return document.body.classList.add("modal-open"),()=>{k.current=!1,_.querySelectorAll('input[type="password"]').forEach(z=>{z.value=""}),_.open&&_.close(),L();const T=()=>{if(document.querySelector("dialog[open]"))return;document.body.classList.remove("modal-open");const z=b?[...document.querySelectorAll("[data-focus-key]")].find(K=>K.dataset.focusKey===b):null,S=document.querySelector("main");S&&!S.hasAttribute("tabindex")&&(S.tabIndex=-1);const Y=K=>K?.isConnected&&(K.tabIndex>=0||K.hasAttribute("tabindex")||K.isContentEditable)&&!K.closest("[inert],[hidden]")&&!K.matches(':disabled,input[type="hidden"]');(Y(M)?M:Y(z)?z:S)?.focus({preventScroll:!0})};T(),queueMicrotask(T)}},[A,N]),m.useLayoutEffect(()=>{(v||h)&&u.current?.focus({preventScroll:!0})},[v,h]);const O=()=>{y.current||w.current||(w.current=!0,f.current?.querySelectorAll('input[type="password"]').forEach(_=>{_.value=""}),f.current?.open&&f.current.close(),t())},j=_=>{y.current&&(_.preventDefault(),_.stopPropagation())};return e.jsx("dialog",{id:d,ref:f,className:`f-operation-modal admin-dialog ${pe.dialog} ${s}`,"aria-labelledby":p,tabIndex:-1,onCancel:_=>{_.preventDefault(),l&&O()},onClose:_=>{const M=_.currentTarget;if(!(!k.current||w.current||M.open)){if(y.current||!l){M.showModal(),y.current&&u.current?.focus({preventScroll:!0});return}O()}},onClick:_=>{if(_.target!==_.currentTarget||!l)return;const M=_.currentTarget.getBoundingClientRect();(_.clientX<M.left||_.clientX>M.right||_.clientY<M.top||_.clientY>M.bottom)&&O()},onKeyDown:_=>{if(_.stopPropagation(),_.key!=="Tab")return;const M=[..._.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(T=>!T.closest("[inert]")&&!T.hidden).sort((T,z)=>T.compareDocumentPosition(z)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1),b=M[0],L=M.at(-1);if(!b||!L){_.preventDefault(),u.current?.focus();return}_.shiftKey&&(document.activeElement===b||!M.includes(document.activeElement instanceof HTMLElement?document.activeElement:b))?(_.preventDefault(),L.focus()):!_.shiftKey&&(document.activeElement===L||!M.includes(document.activeElement instanceof HTMLElement?document.activeElement:L))&&(_.preventDefault(),b.focus())},children:e.jsxs("form",{"aria-busy":v||void 0,"data-busy":v?"true":void 0,onSubmit:async _=>{_.preventDefault();const M=_.currentTarget;if(!(y.current||!a||!M.reportValidity())){y.current=!0,x(!0),g("");try{await a(M),k.current&&(y.current=!1,O())}catch(b){k.current&&g(`${ee(b)}；输入已保留，可重试。`)}finally{y.current=!1,k.current&&x(!1)}}},children:[e.jsxs("header",{className:"f-dialog-head",children:[e.jsx("h2",{id:p,children:n}),l&&e.jsx("button",{type:"button",className:"close-button","data-cancel":"","aria-label":"关闭弹窗",disabled:v,onClick:O,children:"×"})]}),e.jsxs("div",{className:"f-dialog-body",children:[e.jsx("div",{"data-dialog-content":"",inert:v,onClickCapture:j,onKeyDownCapture:j,onInputCapture:j,onChangeCapture:j,children:r}),e.jsx("p",{ref:u,className:`f-status ${h?"danger":""}`,role:h?"alert":"status",tabIndex:-1,"data-operation-status":"",children:h||(v?"正在提交…":"")})]}),o&&e.jsxs("footer",{className:"f-dialog-foot",children:[e.jsx("button",{type:"button","data-cancel":"",disabled:v,onClick:O,children:c??(a?"取消":"知道了")}),a&&e.jsx("button",{type:"submit",className:"primary",disabled:v,children:v?"正在提交…":i})]})]})})}function gt({user:n,localTest:r,services:t,expire:a}){const[i,s]=m.useState(!1),[o,l]=m.useState(null),[c,d]=m.useState({}),[p,f]=m.useState(!1),u=m.useRef(!1),y=m.useRef(null),k=m.useRef(null),w=n.display_name?.trim()||n.username,v=()=>{s(!1),y.current?.focus({preventScroll:!0})};return m.useLayoutEffect(()=>{const x=k.current;if(x)if(i){const h=y.current?.getBoundingClientRect();h&&d({left:Math.max(8,Math.min(h.left,window.innerWidth-Math.min(260,window.innerWidth-16)-8)),bottom:Math.max(8,window.innerHeight-h.top+8),maxHeight:Math.max(44,h.top-16)}),x.showPopover?.(),x.querySelector("button")?.focus()}else x.hidePopover?.()},[i]),m.useEffect(()=>{if(!i)return;const x=()=>s(!1),h=g=>{g.target instanceof Node&&!k.current?.contains(g.target)&&!y.current?.contains(g.target)&&x()};return window.addEventListener("resize",x),document.addEventListener("pointerdown",h),()=>{window.removeEventListener("resize",x),document.removeEventListener("pointerdown",h)}},[i]),e.jsx("div",{id:"account",className:"account-bar",children:r?e.jsx("span",{className:"chip",children:"本地测试 · 免登录"}):e.jsxs(e.Fragment,{children:[e.jsxs("button",{ref:y,className:"account-trigger",type:"button","aria-label":`用户菜单：${w}`,"aria-haspopup":"menu","aria-expanded":i,"aria-controls":"account-menu","data-focus-key":"admin-account",onClick:()=>s(x=>!x),onKeyDown:x=>{(x.key==="ArrowDown"||x.key==="ArrowUp")&&(x.preventDefault(),s(!0))},children:[e.jsx("span",{className:"account-avatar","aria-hidden":"true",children:Array.from(w)[0]?.toUpperCase()||"?"}),e.jsx("span",{className:"account-name",children:w})]}),e.jsxs("div",{ref:k,id:"account-menu",className:`account-menu ${pe.accountMenu}`,role:"menu","aria-label":"账号菜单",popover:"auto",hidden:!i,style:c,onToggle:x=>{x.newState==="closed"&&s(!1)},onKeyDown:x=>{if(x.stopPropagation(),x.key==="Escape"){x.preventDefault(),v();return}if(x.key==="Tab"){s(!1);return}if(!["ArrowDown","ArrowUp","Home","End"].includes(x.key))return;x.preventDefault();const h=[...x.currentTarget.querySelectorAll('[role="menuitem"]:not(:disabled)')],g=h.findIndex(A=>A===document.activeElement),N=x.key==="Home"?0:x.key==="End"?h.length-1:(g+(x.key==="ArrowDown"?1:-1)+h.length)%h.length;h[N]?.focus()},children:[e.jsxs("div",{className:"account-menu-heading",role:"presentation",children:[e.jsx("b",{children:w}),e.jsxs("small",{children:[n.username," · 管理员"]})]}),e.jsx("button",{type:"button",role:"menuitem",className:"account-action",onClick:()=>{v(),l("info")},children:"用户信息"}),e.jsx("button",{type:"button",role:"menuitem",className:"account-action",onClick:()=>{v(),l("password")},children:"修改密码"}),e.jsxs("button",{type:"button",role:"menuitem",className:"account-action danger",disabled:p,onClick:async()=>{if(!u.current){u.current=!0,f(!0),v();try{await t.session.logout()}catch{}finally{a()}}},children:[e.jsx(De,{name:"logout"}),"退出登录"]})]}),o==="info"&&e.jsx(ae,{title:"用户信息",className:"auth-dialog",onClose:()=>l(null),closeLabel:"关闭",children:e.jsx("dl",{className:"account-info",children:[["姓名 / 花名",n.display_name?.trim()||"未填写"],["用户名",n.username],["手机号",n.phone||"未填写"],["角色","管理员"],["用户 ID",n.id]].map(([x,h])=>e.jsxs("div",{className:pe.infoRow,children:[e.jsx("dt",{children:x}),e.jsx("dd",{children:h})]},x))})}),o==="password"&&e.jsxs(ae,{title:"修改密码",className:"auth-dialog",onClose:()=>l(null),submitLabel:"保存",onSubmit:async x=>{const h=new FormData(x);await t.changePassword(String(h.get("current_password")??""),String(h.get("new_password")??""),String(h.get("confirm_password")??"")),a()},children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"当前密码"}),e.jsx("input",{name:"current_password",type:"password",autoComplete:"current-password",autoFocus:!0,required:!0})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"新密码（至少 8 位）"}),e.jsx("input",{name:"new_password",type:"password",autoComplete:"new-password",required:!0,minLength:8})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"再输一次新密码"}),e.jsx("input",{name:"confirm_password",type:"password",autoComplete:"new-password",required:!0,minLength:8})]}),e.jsx("p",{className:"auth-note",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。保存后需要重新登录。"})]})]})})}const bt=n=>window.location.replace(n);function yt({page:n,children:r,workspace:t=!1}){return e.jsx(vt,{page:n,workspace:t,children:r})}function vt({page:n,children:r,workspace:t}){const{session:a,sandbox:i,error:s,retry:o,updateUser:l,expire:c}=tt(bt);return!a&&!s&&t?e.jsx(Vr,{stage:"正在准备工作区"}):a?e.jsx(xt,{children:e.jsx(wt,{page:n,workspace:t,user:a.user,localTest:a.localTest,services:a.services,initialHealth:a.initialHealth,sandbox:i,updateUser:l,expire:c,children:r})}):e.jsx("main",{id:"main",tabIndex:-1,children:s?e.jsxs("section",{role:"alert",children:[e.jsx("p",{children:s}),e.jsx("a",{href:"/login",children:"前往登录"}),e.jsx("button",{type:"button",onClick:o,children:"重试"})]}):e.jsx("p",{role:"status",children:"正在验证管理员会话…"})})}const jt=[{label:"工作区",links:[{key:"canvas",label:"画布",href:"/",icon:"dashboard"},{key:"director",label:"导演工作台",href:"/director",icon:"external"}]},{label:"管理",links:[{key:"teams",label:"项目组",href:"/teams",icon:"teams"},{key:"controller",label:"运行面板",href:"/controller",icon:"dashboard"},{key:"permissions",label:"账号与权限",href:"/admin/permissions",icon:"permissions"}]},{label:"统计",links:[{key:"costs",label:"费用评估",href:"/controller/costs",icon:"costs"},{key:"capacity",label:"产能统计",href:"/controller/capacity",icon:"capacity"}]}];function wt({page:n,workspace:r,user:t,localTest:a,services:i,initialHealth:s,sandbox:o,children:l,updateUser:c,expire:d}){const{notify:p}=ir(),{online:f,maintenance:u,maintenanceVisible:y}=at(i,s,!r),k=m.useRef(!1),w=m.useRef(!1);m.useEffect(()=>{if(r)return;const h=document.body,g=h.dataset.workspace,N=h.classList.contains("admin-page");return h.classList.add("admin-page"),h.dataset.workspace=n,()=>{N||h.classList.remove("admin-page"),g===void 0?delete h.dataset.workspace:h.dataset.workspace=g}},[n,r]),m.useEffect(()=>{const h=document.body.dataset.adminSandbox;return o&&(document.body.dataset.adminSandbox="local-copy"),()=>{h===void 0?delete document.body.dataset.adminSandbox:document.body.dataset.adminSandbox=h}},[o]);const v=rt(t,a);m.useEffect(()=>{v&&(w.current=!1)},[v]);const x=u==="blocked"?"系统正在维护更新，当前暂无可用执行节点，请稍后再使用。":"部分节点正在维护更新，其他可用节点仍可正常使用。";return e.jsxs("div",{className:`admin-page ${n==="permissions"?"permissions-page":""} ${pe.application} ${r?pe.workspace:""}`,children:[e.jsx("a",{className:"skip-link admin-skip",href:n==="capacity"?"#main-content":"#main",children:"跳到主内容"}),!r&&e.jsxs("aside",{id:"workspace-nav","data-admin-sidebar":"","aria-label":"主导航",className:pe.navigation,children:[e.jsxs("a",{className:"workspace-brand",href:"/","aria-label":"Chouka 创作空间",children:[e.jsx("img",{src:"/icon.png",alt:""}),e.jsxs("span",{children:["Chouka",e.jsx("small",{children:"创作空间"})]})]}),e.jsx("nav",{className:"workspace-links","aria-label":"工作区导航",children:jt.map(h=>e.jsxs("div",{className:"workspace-nav-group",role:"group","aria-label":h.label,children:[e.jsx("div",{className:"workspace-nav-label","aria-hidden":"true",children:h.label}),h.links.map(g=>e.jsxs("a",{className:"workspace-link",href:g.href,title:g.label,"aria-label":g.label,"aria-current":n===g.key?"page":void 0,children:[e.jsx(De,{name:g.icon}),e.jsx("span",{children:g.label})]},g.key))]},h.label))}),e.jsxs("div",{className:"workspace-footer",children:[e.jsxs("div",{className:"workspace-presence",title:"Chouka 系统在线用户（近 90 秒活跃，按账号去重）","aria-live":"polite",children:[e.jsx("i",{"aria-hidden":"true"}),e.jsxs("span",{children:[e.jsx("b",{children:f??"--"})," 人在线"]})]}),e.jsx(gt,{user:t,localTest:a,services:i,expire:d})]})]}),!r&&y&&e.jsxs("div",{id:"maintenance-banner",className:pe.maintenance,role:"status","aria-live":"polite","aria-atomic":"true","aria-label":"系统维护通知",children:[e.jsx("span",{className:"maintenance-banner-icon",children:e.jsx(De,{name:"alert"})}),e.jsx("div",{className:"maintenance-banner-ticker",children:e.jsx("div",{className:"maintenance-banner-track",children:[!1,!0].map(h=>e.jsx("span",{className:"maintenance-banner-message","aria-hidden":h||void 0,children:x},String(h)))})})]}),o&&e.jsx("div",{id:"sandbox-note",className:`notice-box admin-sandbox ${pe.sandbox}`,role:"note",children:"本地隔离数据副本：本页用于本地验收，展示复制的业务数据，不代表正式服务的实时状态。"}),v?e.jsx("main",{id:n==="capacity"?"main-content":"main",tabIndex:-1,children:e.jsx("p",{role:"status",children:"请补充手机号后继续使用。"})}):l({http:i.http,user:t,sandbox:o,notify:p}),v&&e.jsx(ae,{id:"phone-dialog",title:"补充手机号",className:"auth-dialog phone-dialog",dismissible:!1,closeLabel:"退出登录",submitLabel:"保存并继续",onClose:()=>{w.current||k.current||(k.current=!0,i.session.logout().catch(()=>{}).finally(d))},onSubmit:async h=>{const g=await i.savePhone(String(new FormData(h).get("phone")??""));w.current=!0,c(g)},children:e.jsxs(m.Fragment,{children:[e.jsx("p",{id:"phone-note",className:"auth-note",children:"当前账号尚未填写手机号，请补充后继续使用。手机号仅本人和管理员可见，不用于短信验证或登录。"}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"手机号"}),e.jsx("input",{name:"phone",type:"tel",autoFocus:!0,inputMode:"numeric",autoComplete:"tel-national",required:!0,maxLength:11,pattern:"1[3-9][0-9]{9}",placeholder:"请输入 11 位中国大陆手机号","aria-describedby":"phone-note"})]})]})})]})}const or={idle:"空闲",busy:"运行中",syncing:"正在更新",offline:"离线",disabled:"已禁用",error:"异常",queued:"排队中",assigned:"已分配",running:"运行中",done:"已完成",canceled:"已取消",cancel_requested:"正在取消"},_t={idle:"尚未更新",pending:"等待空闲",running:"更新并重启中",done:"更新重启完成",error:"更新重启失败"},B=n=>(typeof n=="number"||typeof n=="string")&&n!==""&&Number.isFinite(Number(n))?Number(n):null,be=n=>B(n)==null?"未获取":String(n),lr=n=>{const r=B(n);return r==null?null:Math.max(0,Math.min(100,r))},$e=n=>{const r=B(n);return r==null?"未记录":new Date(r*1e3).toLocaleString("zh-CN",{hour12:!1})};function Nn(n){const r=B(n);return r==null||r<0?"未记录":r<60?`${Math.round(r)}秒`:r<3600?`${Math.floor(r/60)}分${Math.floor(r%60)}秒`:`${Math.floor(r/3600)}小时${Math.floor(r%3600/60)}分`}function Se(n){const r=B(n);return r==null?"未采集":r>=1024**3?`${(r/1024**3).toFixed(1)} GB`:r>=1024**2?`${(r/1024**2).toFixed(0)} MB`:`${Math.round(r/1024)} KB`}const kt=n=>["idle","done"].includes(n||"")?"ok":["busy","syncing","running","queued","assigned","cancel_requested"].includes(n||"")?"warn":["offline","disabled","error","canceled"].includes(n||"")?"bad":"",We=n=>or[n||""]||n||"未知",Sn=n=>xe(n)?"主节点 · 无需同步":_t[n.sync_status||""]||n.sync_status||"未记录",xe=n=>n.is_primary_node===!0,dr=n=>!xe(n)&&["pending","running"].includes(n.sync_status||""),Je=n=>!xe(n)&&n.sync_status==="error",re=n=>n.state!=="offline",cr=n=>typeof n=="number"||typeof n=="string"&&n.trim()?`Worker v${n}`:"Worker 版本未知",pr=n=>cr(n.capabilities?.agent_version),Nt=(n,r=Date.now())=>{const t=B(n?.health.server_time);return t==null||!n?r/1e3:t+(r-n.receivedAt)/1e3},$n=(n,r)=>{const t=B(n);return t==null?"未记录":`${Nn(Math.max(0,r-t))}前`};function zn(n,r,t){const a=B(n.capabilities?.telemetry?.collected_at);return!t&&re(n)&&a!=null&&r-a<=60&&r-a>=-10}function rn(n){return re(n)?n.enabled===!1||n.enabled===0||n.state==="disabled"?["已禁用接收","bad"]:dr(n)?["同步期间不可接任务","bad"]:n.comfy_online===!1||n.state==="error"?["不可接任务","bad"]:n.busy||n.current_job_id||n.state==="busy"?["正在占用","warn"]:n.state==="idle"&&n.comfy_online===!0?["可接任务","ok"]:["接收状态未知",""]:["不可接任务","bad"]}function Cn(n,r={}){const t=n.capability_comparison||{};if(r.status==="none")return{label:"未设置主节点基准",tone:"warn"};if(r.status==="ambiguous")return{label:"主节点不唯一",tone:"bad"};if(xe(n)&&t.status==="primary")return{label:"主节点基准",tone:r.status==="stale"?"warn":"ok"};const a=t.missing_models?.length||0,i=t.missing_node_classes?.length||0,s=t.extra_models?.length||0,o=t.extra_node_classes?.length||0;let l,c="warn";return t.model_inventory_status==="unknown"?(l=["模型清单未知",i?`节点不全 · 缺 ${i} 个`:""].filter(Boolean).join("；"),i&&(c="bad")):t.status==="unknown"||!t.status?l="清单未知":a||i?(l=[a?`模型不全 · 缺 ${a} 个`:"",i?`节点不全 · 缺 ${i} 个`:""].filter(Boolean).join("；"),c="bad"):t.status==="stale"?l=s||o?"节点离线 · 主节点所需齐全，存在额外清单":"节点离线 · 最后清单一致":s||o?(l=`主节点所需齐全 · ${[s?`额外 ${s} 个模型`:"",o?`额外 ${o} 个节点`:""].filter(Boolean).join("；")}`,c="ok"):(l="清单一致",c="ok"),t.status==="stale"&&(a||i)&&(l=`节点离线 · 最后清单：${l}`),r.status==="stale"&&(l=`基准离线 · ${l}`),{label:l,tone:c}}function xn(n){const r=n.comparisonBaseline;if(r.status==="none")return"未设置主节点，无法比较";if(r.status==="ambiguous")return"检测到多个主节点，无法确定比较基准";const t=n.workers.find(a=>a.id===r.worker_id)?.name||r.worker_id||"未命名主节点";return`${r.status==="stale"?"主节点离线 · 最后清单":"在线主节点"} · ${t} · ${cr(r.agent_version)}`}function He(n){const r=n.capabilities;return r?.telemetry?.gpus?.length?r.telemetry.gpus:(r?.devices||[]).map((t,a)=>{const i=B(t.vram_total),s=B(t.vram_free);return{index:t.index??a,name:t.name||t.device_name||t.type,memory_total_bytes:i,memory_used_bytes:i!=null&&s!=null?Math.max(0,i-s):null,utilization_percent:null,temperature_c:null}})}function mr(n){if(n.capabilities?.telemetry?.memory)return n.capabilities.telemetry.memory;const r=n.capabilities?.system,t=B(r?.ram_total),a=B(r?.ram_free);return{total_bytes:t,used_bytes:t!=null&&a!=null?Math.max(0,t-a):null}}const ur=(n,r)=>r.projects.find(t=>t.id===n.project)?.name||n.projectName||(n.project?"项目已删除":"未归属项目"),fn=16e3;function St(n,r){const t=a=>a>0&&a<n.length&&n.charCodeAt(a)>=56320&&n.charCodeAt(a)<=57343?a-1:a;return n.slice(t(r*fn),t((r+1)*fn))}const U=le([H().finite(),C().refine(n=>n===""||Number.isFinite(Number(n)))]).nullish(),D=C().nullish(),Ve=le([Q(),ce(0),ce(1)]).nullish(),$t=V({used_bytes:U,total_bytes:U}),zt=V({index:U,name:D,utilization_percent:U,memory_used_bytes:U,memory_total_bytes:U,temperature_c:U}),Ct=V({agent_version:le([H(),C()]).nullish(),node_classes:F(C()).nullish(),telemetry:V({hostname:D,collected_at:U,gpus:F(zt).nullish(),memory:$t.nullish()}).nullish(),devices:F(V({index:U,name:D,device_name:D,type:D,vram_total:U,vram_free:U})).nullish(),system:V({ram_total:U,ram_free:U}).nullish()}),On=V({name:D,node_class:D,input:D}),Et=V({status:D,model_inventory_status:D,missing_node_classes:F(C()).nullish(),extra_node_classes:F(C()).nullish(),missing_models:F(On).nullish(),extra_models:F(On).nullish()}),Mt=V({status:D,worker_id:D,agent_version:le([H(),C()]).nullish()}),Pt=V({id:C(),name:D,state:D,enabled:Ve,comfy_online:Ve,busy:Ve,current_job_id:D,last_seen:U,is_primary_node:Ve,sync_status:D,sync_message:D,capability_comparison:Et.nullish(),capabilities:Ct.nullish()}),hr=V({id:C(),status:D,history_only:Q().optional(),permission:D,modelName:D,nodeName:D,card:D,name:D,cardName:D,project:D,projectName:D,progress:U,step:D,created:U,started:U,ended:U,worker_id:D,error:D,capability:D,submitter_display_name:D,submitter_username:D}),Rt=V({ok:Q().nullish(),mode:D,online_workers:U,workers:U,server_time:U,started_at:U,comfy_online:Q().nullish(),jobs:U,capabilities:U,sandbox:Q().nullish(),llm:V({ok:Q().nullish(),model:D}).nullish()}),Lt=V({running_count:U,queued_count:U}),It=V({workers:F(Pt),comparison_baseline:Mt.nullish()}),At=V({jobs:F(hr)}),Tt=nn(["all","queued","running","done","error","canceled"]),Dt=V({jobs:F(hr),next_cursor:C().min(1).nullable(),has_more:Q(),total:H().int().nonnegative()}).refine(n=>n.has_more===(n.next_cursor!==null),{message:"任务历史分页游标不完整"}),Ft=V({projects:F(V({id:C(),name:D}))}),Ot=V({worker_count:U,primary_count:U,skipped_count:U}),qt=V({ok:Q().optional()}),pn=le([H().finite(),C().refine(n=>n!==""&&Number.isFinite(Number(n)))]).transform(Number),qn=tr().transform(n=>(typeof n=="number"||typeof n=="string")&&n!==""&&Number.isFinite(Number(n))?Number(n):null),Ut=V({worker_id:D,gpu_index:U,minutes:U,server_time:U,from:pn,to:pn,gap_seconds:pn.pipe(H().positive()),points:F(V({at:qn,temperature_c:qn}))}).refine(n=>n.to>n.from,{message:"温度历史返回格式不完整"});function Bt(n){return{async history(r,t,a){const i=new URLSearchParams({limit:"50",status:r});return t!==null&&i.set("cursor",t),n.read(`/api/jobs/history?${i}`,Dt,{cache:"no-store",signal:a})},async snapshot(r,t=()=>{}){const a={cache:"no-store",signal:r},[i,s,o,l,c]=await Promise.all([n.read("/api/health",Rt,a).then(d=>(d.sandbox===!0&&!r.aborted&&t(),d)),n.read("/api/status",Lt,a),n.read("/api/workers",It,a),n.read("/api/jobs",At,a),n.read("/api/projects",Ft,a)]);return{health:i,status:s,workers:o.workers,comparisonBaseline:o.comparison_baseline||{status:"none"},jobs:l.jobs,projects:c.projects,receivedAt:Date.now()}},async temperature(r,t,a,i){const s=await n.read(`/api/workers/${encodeURIComponent(r)}/temperature?gpu_index=${t}&minutes=${a}`,Ut,{cache:"no-store",signal:i});if(s.worker_id!=null&&s.worker_id!==r||s.gpu_index!=null&&B(s.gpu_index)!==t||s.minutes!=null&&B(s.minutes)!==a)throw new Error("温度历史与所选节点或范围不一致");return{...s,points:s.points.flatMap(o=>o.at!=null&&o.at>=s.from&&o.at<=s.to?[{...o,at:o.at,temperature_c:o.temperature_c}]:[]).sort((o,l)=>o.at-l.at)}},async deleteWorker(r,t,a){return a(),qt.parse(await n.request(`/api/workers/${encodeURIComponent(r)}`,{method:"DELETE",signal:t}))},async syncAll(r,t){return t(),Ot.parse(await n.request("/api/admin/workers/sync-all",{method:"POST",signal:r,headers:{"Content-Type":"application/json"},body:JSON.stringify({})}))}}}const Un=n=>({filter:n,jobs:[],initialized:!1,loadedPages:0,nextCursor:null,hasMore:!1,total:null,loading:null,error:"",failedAction:null});function mn(n,r){return(B(r.created)??0)-(B(n.created)??0)||(n.id<r.id?1:n.id>r.id?-1:0)}function Wt(n,r){const t=new Map(r.jobs.map(i=>[i.id,i])),a=r.jobs.reduce((i,s)=>!i||mn(s,i)>0?s:i,null);for(const i of n?.jobs||[]){const s=["queued","assigned","running","cancel_requested"].includes(i.status||"");(t.has(i.id)||s||a&&mn(i,a)<=0)&&t.set(i.id,i)}return[...t.values()].filter(i=>{const s=i.status==="assigned"?"queued":i.status==="cancel_requested"?"running":i.status;return r.filter==="all"||s===r.filter}).sort(mn)}class Ht{constructor(r,t=!1){this.service=r,this.state={snapshot:null,history:Un("all"),stale:!1,loading:!1,error:"",isolated:t,mutation:null,deletingWorker:null,refreshed:0}}service;state;listeners=new Set;read=null;historyRead=null;historyEpoch=0;write=null;version=0;disposed=!1;start=()=>{this.disposed=!1,this.refreshAll()};refreshAll=()=>Promise.all([this.refresh(),this.refreshHistory()]);getSnapshot=()=>this.state;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});update(r){this.disposed||(this.state={...this.state,...r},this.listeners.forEach(t=>t()))}isolate=()=>{this.state.isolated||this.update({isolated:!0})};canMutate=()=>!this.disposed&&!!this.state.snapshot&&!this.state.stale&&!this.state.isolated&&!this.state.mutation;guard=()=>{if(this.disposed||!this.state.snapshot||this.state.stale||this.state.isolated)throw new Error("隔离副本或服务状态未就绪，禁止修改设备")};invalidateRead(){++this.version,this.read?.controller.abort(),this.read=null,this.update({loading:!1})}refresh=(r=!1)=>{if(this.disposed||this.state.mutation&&!r)return Promise.resolve();if(this.read)return this.read.promise;const t=++this.version,a=new AbortController;this.update({loading:!0});const i=this.service.snapshot(a.signal,this.isolate).then(s=>{this.disposed||a.signal.aborted||t!==this.version||this.update({snapshot:s,stale:!1,error:"",refreshed:this.state.refreshed+1,isolated:this.state.isolated||s.health.sandbox===!0})}).catch(s=>{this.disposed||a.signal.aborted||t!==this.version||(this.update({stale:!0,error:`读取中间层信息失败：${ee(s)}`}),a.abort())}).finally(()=>{t!==this.version||this.disposed||(this.read=null,this.update({loading:!1}))});return this.read={controller:a,promise:i},i};setHistoryFilter=r=>this.disposed?Promise.resolve():r===this.state.history.filter?this.refreshHistory():(++this.historyEpoch,this.historyRead?.controller.abort(),this.historyRead=null,this.update({history:Un(r)}),this.refreshHistory());refreshHistory=()=>this.readHistory("first");loadMore=()=>this.readHistory("more");retryHistory=()=>this.readHistory(this.state.history.failedAction||"first");readHistory(r){if(this.disposed)return Promise.resolve();if(this.historyRead)return this.historyRead.promise;const t=this.state.history;if(r==="more"&&(!t.initialized||!t.hasMore))return Promise.resolve();const a=r==="more"?t.nextCursor:null,i=this.historyEpoch,s=new AbortController;this.update({history:{...t,loading:r,error:"",failedAction:null}});const o=this.service.history(t.filter,a,s.signal).then(l=>{if(this.disposed||s.signal.aborted||i!==this.historyEpoch)return;if(r==="more"&&l.has_more&&l.next_cursor===a)throw new Error("任务历史游标未推进，请重试");const c=this.state.history,d=new Map(c.jobs.map(f=>[f.id,f]));for(const f of l.jobs)d.set(f.id,f);const p=r==="first"&&c.loadedPages>1;this.update({history:{...c,jobs:[...d.values()],initialized:!0,loadedPages:r==="more"?c.loadedPages+1:Math.max(1,c.loadedPages),total:l.total,nextCursor:p?c.nextCursor:l.next_cursor,hasMore:p?c.hasMore:l.has_more}})}).catch(l=>{this.disposed||s.signal.aborted||i!==this.historyEpoch||this.update({history:{...this.state.history,error:`读取任务历史失败：${ee(l)}`,failedAction:r}})}).finally(()=>{this.disposed||s.signal.aborted||i!==this.historyEpoch||(this.historyRead=null,this.update({history:{...this.state.history,loading:null}}))});return this.historyRead={controller:s,promise:o},o}async mutate(r,t,a){if(this.guard(),this.state.mutation)throw new Error("设备操作正在执行，请稍后重试");this.invalidateRead();const i=new AbortController;this.write=i,this.update({mutation:r,deletingWorker:t});try{const s=await a(i.signal);if(i.signal.aborted||this.disposed)throw new DOMException("操作已取消","AbortError");return await this.refresh(!0),s}catch(s){throw i.signal.aborted||(this.update({error:`${r==="delete"?"删除设备":"更新节点"}失败：${ee(s)}`}),await this.refresh(!0)),s}finally{this.write=null,this.update({mutation:null,deletingWorker:null})}}deleteWorker=r=>this.state.snapshot?.workers.some(t=>t.id===r)?this.mutate("delete",r,t=>this.service.deleteWorker(r,t,this.guard)):Promise.reject(new Error("设备已移除"));syncAll=()=>this.mutate("sync",null,r=>this.service.syncAll(r,this.guard));dispose=()=>{this.disposed=!0,++this.version,this.read?.controller.abort(),this.write?.abort(),++this.historyEpoch,this.historyRead?.controller.abort(),this.historyRead=null,this.read=null,this.listeners.clear()}}function Gt({http:n,sandbox:r}){const t=m.useMemo(()=>Bt(n),[n]),a=m.useMemo(()=>new Ht(t),[t]),i=m.useSyncExternalStore(a.subscribe,a.getSnapshot),[s,o]=m.useState(!0),l=m.useRef(s),[c,d]=m.useState(Date.now);return m.useLayoutEffect(()=>{l.current=s},[s]),m.useLayoutEffect(()=>{r&&a.isolate()},[r,a]),m.useEffect(()=>(a.start(),a.dispose),[a]),m.useEffect(()=>{const p=()=>{document.hidden||(d(Date.now()),l.current&&a.refreshAll())},f=window.setInterval(p,5e3);return document.addEventListener("visibilitychange",p),()=>{window.clearInterval(f),document.removeEventListener("visibilitychange",p)}},[a]),{state:i,store:a,service:t,automatic:s,setAutomatic:o,clock:c}}function Qe({name:n}){return e.jsx("svg",{className:"icon",viewBox:"0 0 24 24","aria-hidden":"true",focusable:"false",children:n==="refresh"?e.jsxs(e.Fragment,{children:[e.jsx("path",{d:"M20 7v5h-5M4 17v-5h5"}),e.jsx("path",{d:"M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 18 17"})]}):n==="chevron"?e.jsx("path",{d:"m9 5 7 7-7 7"}):e.jsxs(e.Fragment,{children:[e.jsx("path",{d:"m12 3 10 18H2L12 3Z"}),e.jsx("path",{d:"M12 9v4m0 3v1"})]})})}function te({children:n}){return e.jsx("span",{className:"cell-secondary",children:n})}function Bn({used:n,total:r,label:t}){const a=B(n),i=B(r),s=a!=null&&i!=null&&i>0?lr(a/i*100):null;return e.jsxs("div",{className:"resource-meter",children:[e.jsxs("span",{className:"small",children:[Se(a)," / ",Se(i)]}),s!=null&&e.jsx(xr,{value:s,label:t})]})}function xr({value:n,label:r}){return e.jsx("div",{className:"util-track",role:"meter","aria-label":r,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":n,children:e.jsx("i",{style:{width:`${n}%`}})})}function Vt({value:n}){const r=B(n),t=lr(r==null?null:r*100);return e.jsxs("div",{className:"utilization",children:[e.jsx("span",{children:t==null?"未采集":`${Math.round(t)}%`}),t!=null&&e.jsx(xr,{value:t,label:"任务过程进度"})]})}function fr({worker:n,snapshot:r}){const t=r.jobs.find(a=>a.id===n.current_job_id);return t?e.jsxs(e.Fragment,{children:[t.cardName||t.name||"未命名卡片",e.jsx(te,{children:ur(t,r)}),e.jsx(te,{children:t.id})]}):n.current_job_id?e.jsxs(e.Fragment,{children:["任务详情暂未载入",e.jsx(te,{children:n.current_job_id})]}):dr(n)?e.jsxs(e.Fragment,{children:[Sn(n),e.jsx(te,{children:n.sync_message||"等待节点反馈"})]}):re(n)?n.busy?e.jsxs(e.Fragment,{children:["ComfyUI 本地任务",e.jsx(te,{children:"非中间层派发"})]}):e.jsx(e.Fragment,{children:rn(n)[1]==="bad"?"不接收新任务":"当前无任务"}):e.jsx(e.Fragment,{children:"非实时"})}function gr({rows:n,className:r,id:t}){return e.jsx("dl",{id:t,className:r,children:n.map(([a,i])=>e.jsx(Kt,{label:a,children:i},a))})}function Kt({label:n,children:r}){return e.jsxs(e.Fragment,{children:[e.jsx("dt",{children:n}),e.jsx("dd",{children:r})]})}function Jt({snapshot:n,items:r,now:t,onError:a}){const i=new Map(n?.workers.map(s=>[s.id,s.name])||[]);return e.jsx(e.Fragment,{children:r.length?r.map(s=>{const o=B(s.started),l=o==null?s.history_only?"耗时未记录":"尚未开始":s.history_only&&B(s.ended)==null?"耗时未记录":Nn((B(s.ended)??t)-o);return e.jsxs("tr",{children:[e.jsx("td",{className:kt(s.status),children:We(s.status)}),e.jsxs("td",{className:"job-origin",children:[s.submitter_display_name?.trim()||s.submitter_username||"未记录提交人",e.jsx(te,{children:n?ur(s,n):s.projectName||"项目未记录"}),e.jsxs(te,{children:["卡片 · ",s.cardName||s.name||"未命名"]})]}),e.jsxs("td",{className:"job-mode",title:s.capability||void 0,children:[s.modelName||s.nodeName||s.name||s.capability||"未记录",e.jsx(te,{children:s.id})]}),e.jsxs("td",{children:[e.jsx(Vt,{value:s.progress}),e.jsx(te,{children:s.step||"步骤未记录"})]}),e.jsx("td",{title:s.worker_id||void 0,children:s.nodeName?.trim()||(s.worker_id?i.get(s.worker_id)||"未知执行端":s.history_only?"未记录":"待分配")}),e.jsx("td",{children:$e(s.created)}),e.jsx("td",{children:s.error?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"danger f-job-error",title:s.error,children:s.error}),e.jsx("button",{type:"button",className:"link-button","data-job-error":s.id,"data-focus-key":`job-error:${s.id}`,onClick:()=>a(s),children:"查看完整错误"})]}):l})]},s.id)}):e.jsx("tr",{children:e.jsx("td",{colSpan:7,children:e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"暂无已加载任务"}),e.jsx("p",{children:"可更换任务状态；历史记录的加载结果见下方状态。"})]})})})})}class Xt{constructor(r,t,a,i){this.service=r,this.id=t,this.gpu=a,this.minutes=i}service;id;gpu;minutes;state={data:null,loading:!1,error:""};listeners=new Set;request=null;version=0;getSnapshot=()=>this.state;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});update(r){this.state={...this.state,...r},this.listeners.forEach(t=>t())}load=async(r=!1)=>{if(r&&this.request)return;this.request?.abort();const t=new AbortController,a=++this.version;this.request=t,this.update({loading:!0,error:"",...r?{}:{data:null}});try{const i=await this.service.temperature(this.id,this.gpu,this.minutes,t.signal);if(t.signal.aborted||a!==this.version)return;this.update({data:i})}catch(i){if(t.signal.aborted||a!==this.version)return;this.update({data:null,error:ee(i)})}finally{a===this.version&&(this.request=null,this.update({loading:!1}))}};dispose=()=>{++this.version,this.request?.abort(),this.request=null}}function Yt(n,r,t){const a=n.points.flatMap(d=>d.temperature_c==null?[]:[d.temperature_c]),i=Math.floor((Math.min(...a)-5)/10)*10,s=Math.ceil((Math.max(...a)+5)/10)*10,o=49,l=r-o-20,c=t-23-45;return{x:d=>o+(d-n.from)/(n.to-n.from)*l,y:d=>23+(s-d)/(s-i)*c,width:r,height:t,left:o,pw:l}}function Zt(n){const r=[];let t=null;for(const a of n.points){if(a.temperature_c==null){t=null;continue}(t==null||a.at-t>n.gap_seconds)&&r.push([]),r[r.length-1]?.push({at:a.at,temperature_c:a.temperature_c}),t=a.at}return r}function Qt(n,r,t,a,i){if(a<70||i<50||!r.points.some(w=>w.temperature_c!=null))return null;const s=n.getContext("2d");if(!s)return null;const o=window.devicePixelRatio||1;n.width=Math.round(a*o),n.height=Math.round(i*o),s.setTransform(o,0,0,o,0,0),s.clearRect(0,0,a,i);const l=Yt(r,a,i),{x:c,y:d,left:p,pw:f}=l,u=r.points.flatMap(w=>w.temperature_c==null?[]:[w.temperature_c]),y=Math.floor((Math.min(...u)-5)/10)*10,k=Math.ceil((Math.max(...u)+5)/10)*10;s.font='12px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',s.lineWidth=1,s.textAlign="right",s.textBaseline="middle";for(let w=0;w<=4;w++){const v=y+(k-y)*w/4,x=d(v);s.strokeStyle="#29313c",s.beginPath(),s.moveTo(p,x),s.lineTo(a-20,x),s.stroke(),s.fillStyle="#a0a6b1",s.fillText(`${Math.round(v)}°`,p-12,x)}s.textBaseline="top";for(let w=0;w<=4;w+=a<600?2:1){const v=new Date((r.from+(r.to-r.from)*w/4)*1e3),x=v.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:!1}),h=t===1440?v.toLocaleDateString("zh-CN",{month:"2-digit",day:"2-digit"})+" "+x:x;s.textAlign=w===0?"left":w===4?"right":"center",s.fillText(h,p+w/4*f,i-27)}s.strokeStyle="#38bdf8",s.lineWidth=2.3,s.lineJoin="round",s.beginPath();for(const w of Zt(r))w.forEach((v,x)=>{x===0?s.moveTo(c(v.at),d(v.temperature_c)):s.lineTo(c(v.at),d(v.temperature_c))});s.stroke(),s.fillStyle="#38bdf8";for(const w of r.points)w.temperature_c!=null&&(s.beginPath(),s.arc(c(w.at),d(w.temperature_c),2.1,0,Math.PI*2),s.fill());return l}const ea="_historyControls_18d3l_1",na="_page_18d3l_7",ra="_workerDialog_18d3l_10",ta="_capabilities_18d3l_13",aa="_temperatureDialog_18d3l_22",Fe={historyControls:ea,page:na,workerDialog:ra,capabilities:ta,temperatureDialog:aa};function sa({worker:n,workerId:r,service:t,now:a,stale:i,revision:s,onClose:o}){const l=n?He(n):[],[c,d]=m.useState(()=>({gpu:B(l[0]?.index)??0,minutes:30}));return e.jsx(ae,{title:n?.name||r,onClose:o,className:`temperature-dialog ${Fe.temperatureDialog}`,showFooter:!1,children:e.jsx(ia,{worker:n,workerId:r,service:t,now:a,stale:i,revision:s,selection:c,onSelect:d})})}function ia({worker:n,workerId:r,service:t,now:a,stale:i,revision:s,selection:o,onSelect:l}){const{gpu:c,minutes:d}=o,p=m.useMemo(()=>new Xt(t,r,c,d),[t,r,c,d]),f=m.useSyncExternalStore(p.subscribe,p.getSnapshot),{data:u,error:y,loading:k}=f,w=m.useRef(null),v=m.useRef(null),x=m.useRef(null),h=m.useRef(null),[g,N]=m.useState(null),A=m.useRef(s),O=n?He(n):[],j=O.find(z=>B(z.index)===c),_=(u?.points||[]).flatMap(z=>z.temperature_c==null?[]:[z.temperature_c]),M=n&&re(n)?zn(n,a,i)?B(j?.temperature_c)??"未采集":"未采集":"非实时";m.useEffect(()=>(p.load(),p.dispose),[p]),m.useEffect(()=>{A.current!==s&&(A.current=s,p.load(!0))},[s,p]),m.useEffect(()=>{const z=w.current,S=v.current;if(!z||!S||!u)return;const Y=()=>{const{width:se,height:ge}=S.getBoundingClientRect();h.current=Qt(z,u,d,se,ge)},K=requestAnimationFrame(Y),Z=new ResizeObserver(Y);return Z.observe(S),()=>{cancelAnimationFrame(K),Z.disconnect(),h.current=null}},[u,d]);const b=g==null?void 0:u?.points[g],L=b?`${$e(b.at)} · ${b.temperature_c==null?"未采集":`${b.temperature_c}°C`}`:"";m.useEffect(()=>{const z=x.current,S=h.current;!z||!S||!b||(z.style.left=`${Math.max(8,Math.min(S.width-z.offsetWidth-8,S.x(b.at)+14))}px`,z.style.top=`${Math.max(8,Math.min(S.height-z.offsetHeight-8,b.temperature_c==null?20:S.y(b.temperature_c)-45))}px`)},[b,L]);const T=[["当前温度",M],["所选时段最高",_.length?Math.max(..._):u?"未采集":"未获取"],["所选时段最低",_.length?Math.min(..._):u?"未采集":"未获取"]];return e.jsxs("div",{className:"modal-shell",children:[e.jsx("header",{className:"modal-header",children:e.jsxs("div",{children:[e.jsx("p",{className:"eyeline",children:"显卡温度趋势"}),e.jsxs("p",{className:"muted","data-temp-description":!0,children:[j?.name||"型号未记录"," / ",n?We(n.state):"节点已移除"]})]})}),e.jsxs("div",{className:"chart-controls",children:[e.jsxs("label",{className:"inline-label",children:["显卡"," ",e.jsx("select",{"data-temp-gpu":!0,"aria-label":"选择显卡",value:c,onChange:z=>{N(null),l({...o,gpu:Number(z.target.value)})},children:O.length?O.map((z,S)=>e.jsxs("option",{value:z.index??0,children:["GPU ",z.index??0," · ",z.name||"未记录型号"]},`${z.index??S}:${S}`)):e.jsx("option",{value:0,children:"GPU 0 · 未采集配置"})})]}),e.jsx("div",{className:"segmented","data-temp-ranges":!0,"aria-label":"温度时间范围",children:[[30,"30 分钟"],[120,"2 小时"],[1440,"24 小时"]].map(([z,S])=>e.jsx("button",{type:"button","data-range":z,"aria-pressed":d===z,onClick:()=>{N(null),l({...o,minutes:z})},children:S},z))})]}),e.jsx("p",{className:"small muted",children:"仅展示真实采集记录；缺失区间不插值、不补造历史。当前温度需60秒内的新鲜遥测。"}),e.jsx("div",{className:"temperature-stats","data-temp-stats":!0,children:T.map(([z,S])=>e.jsxs("div",{className:"temperature-stat",children:[e.jsx("label",{children:z}),e.jsxs("strong",{children:[S,typeof S=="number"&&e.jsx("small",{children:" °C"})]})]},z))}),e.jsxs("div",{className:"chart-area",ref:v,children:[e.jsx("canvas",{ref:w,"data-temp-canvas":!0,hidden:!_.length,tabIndex:0,role:"img","aria-label":`GPU ${c}，${d}分钟真实温度历史，${_.length}个有效采集点；左右方向键查看。`,onPointerMove:z=>{const S=h.current;if(!S||!u?.points.length)return;const Y=u.from+Math.max(0,Math.min(1,(z.clientX-z.currentTarget.getBoundingClientRect().left-S.left)/S.pw))*(u.to-u.from);N(u.points.reduce((K,Z,se)=>Math.abs(Z.at-Y)<Math.abs((u.points[K]?.at??Z.at)-Y)?se:K,0))},onPointerLeave:()=>N(null),onKeyDown:z=>{!u?.points.length||!["ArrowLeft","ArrowRight","Home","End"].includes(z.key)||(z.preventDefault(),N(z.key==="Home"?0:z.key==="End"?u.points.length-1:Math.max(0,Math.min(u.points.length-1,(g??0)+(z.key==="ArrowRight"?1:-1)))))}}),e.jsx("div",{className:"empty-state","data-temp-empty":!0,hidden:_.length>0,role:"status",children:y?e.jsxs(e.Fragment,{children:[e.jsx("b",{children:"温度历史读取失败"}),e.jsx("p",{children:y}),e.jsx("button",{type:"button",onClick:()=>{N(null),p.load()},children:"重试读取"})]}):k||!u?e.jsx("b",{children:"正在读取温度历史…"}):e.jsxs(e.Fragment,{children:[e.jsx("b",{children:"暂无有效温度记录"}),e.jsx("p",{children:"未开始采集、旧版 Worker 未上报或驱动不支持；不显示 0°C。"})]})}),e.jsx("div",{ref:x,className:"chart-tooltip",hidden:!b||!_.length,role:"status",children:L})]}),e.jsxs("footer",{className:"modal-footer",children:[e.jsxs("span",{className:"chart-key",children:[e.jsx("i",{}),e.jsxs("span",{"data-temp-key":!0,children:["GPU ",c," 温度"]})]}),e.jsx("span",{"data-temp-note":!0,children:u?`${$e(u.from)} — ${$e(u.to)}${n&&!re(n)?" · 离线，历史非实时":""}`:""}),e.jsx("span",{className:"keyboard-hint",children:"左右键查看采集点 · Esc关闭"})]})]})}function oa({capabilities:n}){const[r,t]=m.useState(null),[a,i]=m.useState(0),s=m.useRef(null),o=m.useRef(null),l=m.useRef(new Set),c=Math.max(1,Math.ceil((r?.length||0)/fn));m.useEffect(()=>{const f=l.current;return()=>{f.forEach(u=>URL.revokeObjectURL(u)),f.clear()}},[]);const d=f=>{i(f),(f===0||f===c-1)&&o.current?.focus({preventScroll:!0}),o.current&&(o.current.scrollTop=0,o.current.scrollLeft=0)},p=()=>{if(r==null)return;const f=URL.createObjectURL(new Blob([r],{type:"application/json;charset=utf-8"}));l.current.add(f);const u=document.createElement("a");u.href=f,u.download="worker-capabilities.json",u.click()};return e.jsxs("details",{className:Fe.capabilities,"data-capabilities":!0,onToggle:f=>{f.currentTarget.open&&s.current==null&&(s.current=JSON.stringify(n,null,2),t(s.current))},children:[e.jsx("summary",{children:"完整能力与配置（最后上报，非实时配置证据）"}),r!=null&&e.jsxs("div",{children:[e.jsx("p",{className:"small muted",children:"按页查看完整快照；下载可获取全部 JSON，自动刷新不会改变当前快照。"}),e.jsxs("div",{className:"f-toolbar",children:[e.jsx("button",{type:"button","data-config-prev":!0,disabled:a===0,onClick:()=>d(a-1),children:"上一页"}),e.jsxs("span",{className:"small muted","data-config-page":!0,role:"status",children:["第 ",a+1," / ",c," 页"]}),e.jsx("button",{type:"button","data-config-next":!0,disabled:a===c-1,onClick:()=>d(a+1),children:"下一页"}),e.jsx("button",{type:"button","data-config-download":!0,onClick:p,children:"下载完整 JSON"})]}),e.jsx("pre",{ref:o,className:"capabilities-json",tabIndex:0,"aria-label":"当前页能力与配置",children:St(r,a)})]})]})}function Wn({items:n}){return n.length?e.jsx("ul",{className:"inventory-list",children:n.map((r,t)=>e.jsx("li",{children:r},`${t}:${r}`))}):e.jsx("p",{className:"muted small",children:"无"})}function Hn({items:n,unknown:r}){return r?e.jsx("p",{className:"muted small",children:"模型清单未知，无法判断"}):n.length?e.jsx("ul",{className:"inventory-list",children:n.map((t,a)=>e.jsxs("li",{children:[t.name||"未命名模型",e.jsxs("span",{children:[t.node_class||"未知节点"," · ",t.input||"未知输入"]})]},`${a}:${t.name}`))}):e.jsx("p",{className:"muted small",children:"无"})}function la({worker:n,snapshot:r}){const t=n.capability_comparison||{},a=Cn(n,r.comparisonBaseline),i=t.model_inventory_status==="unknown",s=t.missing_node_classes||[],o=t.extra_node_classes||[],l=t.missing_models||[],c=t.extra_models||[];return["none","ambiguous"].includes(r.comparisonBaseline.status||"")||!t.status||t.status==="unknown"&&i&&!s.length&&!o.length?e.jsxs("section",{className:"inventory-audit",children:[e.jsx("h3",{children:"与主节点清单对比"}),e.jsxs("div",{className:"notice-box",children:[e.jsx("b",{className:a.tone,children:a.label}),e.jsxs("p",{children:[xn(r),"。旧版 Worker 或清单字段缺失时不会猜测为完整。"]})]})]}):e.jsxs("section",{className:"inventory-audit",children:[e.jsxs("div",{className:"inventory-heading",children:[e.jsx("h3",{children:"与主节点清单对比"}),e.jsx("span",{className:"f-chip inventory-chip","data-tone":a.tone,children:a.label})]}),e.jsxs("p",{className:"muted small",children:[xn(r),"；文件名、相对路径和版本均按精确值比较。"]}),e.jsxs("div",{className:"inventory-grid",children:[e.jsxs("div",{className:"inventory-block",children:[e.jsxs("h4",{children:["缺失节点类 ",e.jsx("span",{children:s.length})]}),e.jsx(Wn,{items:s}),e.jsxs("h4",{children:["缺失模型 ",e.jsx("span",{children:i?"未知":l.length})]}),e.jsx(Hn,{items:l,unknown:i})]}),e.jsxs("div",{className:"inventory-block",children:[e.jsxs("h4",{children:["额外节点类 ",e.jsx("span",{children:o.length})]}),e.jsx(Wn,{items:o}),e.jsxs("h4",{children:["额外模型 ",e.jsx("span",{children:i?"未知":c.length})]}),e.jsx(Hn,{items:c,unknown:i})]})]})]})}function da({worker:n,snapshot:r,now:t,stale:a,onClose:i}){const s=n.capabilities||{},o=s.telemetry||{},l=mr(n),c=rn(n),d=Cn(n,r.comparisonBaseline),p=[["节点角色",xe(n)?"主节点（不参与文件同步）":"执行节点"],["清单状态",e.jsx("span",{className:d.tone,children:d.label})],["比较基准",xn(r)],["主机",o.hostname||"未记录"],["ComfyUI",re(n)?n.comfy_online===!0?"在线":n.comfy_online===!1?"不可用":"未获取":"非实时"],["任务接收",e.jsx("span",{className:c[1],children:c[0]})],["同步状态",Sn(n)],["同步消息",xe(n)?"此节点已排除在批量文件同步之外":n.sync_message||"未记录"],["最后心跳",`${$e(n.last_seen)} / ${$n(n.last_seen,t)}`],["遥测时间",`${$e(o.collected_at)} · ${zn(n,t,a)?"新鲜采集":"非实时 / 未采集"}`],["节点能力",s.node_classes?`${s.node_classes.length} 个`:"未记录"],["当前任务",e.jsx(fr,{worker:n,snapshot:r})],["系统内存",`${Se(l.used_bytes)} / ${Se(l.total_bytes)}（最后上报）`]];return e.jsxs(ae,{title:`${n.name||n.id} · 节点详情`,onClose:i,className:Fe.workerDialog,children:[e.jsxs("div",{className:"f-tags",children:[e.jsx("span",{className:"f-chip",children:We(n.state)}),e.jsx("span",{className:"f-chip",children:pr(n)}),e.jsxs("span",{className:"f-chip",children:["Worker ID: ",n.id]})]}),e.jsx(gr,{rows:p,className:"f-definition"}),e.jsx(la,{worker:n,snapshot:r}),e.jsx("div",{className:"f-grid2",children:He(n).map((f,u)=>e.jsxs("div",{className:"notice-box",children:[e.jsxs("b",{children:["GPU ",f.index??"未知"," · ",f.name||"未记录"]}),e.jsxs("p",{children:["最后上报：利用率"," ",B(f.utilization_percent)==null?"未采集":`${f.utilization_percent}%`,"；显存"," ",Se(f.memory_used_bytes)," / ",Se(f.memory_total_bytes),"；温度"," ",B(f.temperature_c)==null?"未采集":`${f.temperature_c}°C`]})]},`${f.index??u}:${u}`))}),e.jsx(oa,{capabilities:s})]})}function ca({snapshot:n,now:r,stale:t,mutationDisabled:a,deletingWorker:i,onDetails:s,onTemperature:o,onDelete:l}){return e.jsx(e.Fragment,{children:n.workers.length?n.workers.map(c=>{const d=c.capabilities?.telemetry||{},p=zn(c,r,t),f=He(c),u=mr(c),y=We(c.state),k=rn(c),w=Cn(c,n.comparisonBaseline),v=re(c)?c.comfy_online===!0?"ComfyUI 在线":c.comfy_online===!1?"ComfyUI 不可用":"ComfyUI 未获取":"ComfyUI 非实时";return e.jsxs("tr",{className:re(c)?"":"offline",children:[e.jsxs("td",{children:[e.jsx("strong",{children:c.name||d.hostname||"未命名执行端"}),xe(c)&&e.jsx("span",{className:"f-chip",children:"主节点"}),e.jsx("span",{className:"f-chip worker-version",children:pr(c)}),e.jsx(te,{children:[d.hostname,c.id].filter(Boolean).join(" · ")})]}),e.jsxs("td",{className:"f-worker-status","data-worker-state":y,children:[e.jsx("span",{className:"f-chip",children:y}),e.jsx(te,{children:v}),e.jsx("span",{className:"cell-secondary f-reception","data-tone":k[1],children:k[0]})]}),e.jsx("td",{children:p?f.length?f.map((x,h)=>e.jsxs("div",{className:"f-gpu",children:[e.jsxs("span",{className:"small",children:["GPU ",x.index??"未知"," · ",x.name||"未记录型号"]}),e.jsxs("div",{className:"cell-secondary",children:["显存",e.jsx(Bn,{used:x.memory_used_bytes,total:x.memory_total_bytes,label:`GPU ${x.index??""} 显存`})]})]},`${x.index??h}:${h}`)):"未采集 GPU 指标":e.jsx("span",{className:"muted",children:re(c)?"遥测未采集或已过期":"非实时，不沿用旧读数"})}),e.jsx("td",{children:re(c)?f.length?f.map((x,h)=>e.jsxs("div",{className:"f-gpu",children:[p&&B(x.temperature_c)!=null?`${x.temperature_c}°C`:"未采集",e.jsxs(te,{children:["GPU ",x.index??"未知"]})]},`${x.index??h}:${h}`)):"未采集":"非实时"}),e.jsxs("td",{children:[p?e.jsx(Bn,{used:u.used_bytes,total:u.total_bytes,label:"系统内存"}):"非实时 / 未采集",e.jsx(te,{children:p?"系统可见容量":"最后配置见详情"})]}),e.jsx("td",{children:e.jsx(fr,{worker:c,snapshot:n})}),e.jsxs("td",{children:[e.jsx("span",{className:Je(c)?"danger":"",title:xe(c)?"主节点不参与文件同步":c.sync_message||void 0,children:Sn(c)}),e.jsx("span",{className:"f-chip inventory-chip","data-tone":w.tone,children:w.label}),e.jsxs("span",{className:"cell-secondary",title:c.last_seen==null?"未记录":new Date(Number(c.last_seen)*1e3).toLocaleString("zh-CN",{hour12:!1}),children:["心跳 ",$n(c.last_seen,r)]})]}),e.jsx("td",{children:e.jsxs("div",{className:"f-stack worker-actions",children:[e.jsx("button",{type:"button",className:"link-button","data-worker":c.id,"data-focus-key":`worker-details:${c.id}`,onClick:()=>s(c),children:"节点详情"}),e.jsx("button",{type:"button",className:"icon-button","data-temperature":c.id,"data-focus-key":`worker-temperature:${c.id}`,"aria-label":`查看 ${c.name||c.id} 温度趋势`,onClick:()=>o(c.id),children:e.jsx(Qe,{name:"chevron"})}),e.jsx("button",{type:"button",className:"link-button danger worker-delete","data-delete-worker":c.id,"data-focus-key":`worker-delete:${c.id}`,"aria-label":`删除设备 ${c.name||c.id}`,disabled:a,onClick:()=>l(c),children:i===c.id?"正在删除…":"删除设备"})]})})]},c.id)}):e.jsx("tr",{children:e.jsx("td",{colSpan:8,children:e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"还没有注册执行端"}),e.jsx("p",{children:"执行端注册并上报心跳后，将在此显示状态。"})]})})})})}function pa({snapshot:n,now:r,onDetails:t}){const a=n.workers.filter(i=>!re(i)||Je(i)||["disabled","error"].includes(i.state||""));return a.length?e.jsx(e.Fragment,{children:a.map(i=>e.jsxs("button",{type:"button",className:"attention-item","data-worker":i.id,"data-focus-key":`worker-attention:${i.id}`,onClick:()=>t(i),children:[e.jsxs("span",{className:"attention-top",children:[e.jsx("strong",{className:"danger",children:i.name||i.id}),e.jsx(Qe,{name:"chevron"})]}),e.jsx("b",{className:"danger",children:re(i)?Je(i)?"节点同步失败":We(i.state):"已离线"}),e.jsx("p",{children:re(i)?Je(i)&&i.sync_message?i.sync_message:`${rn(i)[0]}；查看完整节点详情。`:`最后心跳 ${$n(i.last_seen,r)}`})]},i.id))}):e.jsx("p",{className:"muted small",children:"当前没有需要关注的节点异常。"})}function ma(n){const{state:r,store:t,service:a,automatic:i,setAutomatic:s,clock:o}=Gt(n),{snapshot:l,stale:c,loading:d,error:p,isolated:f,mutation:u,deletingWorker:y}=r,[k,w]=m.useState(null),{history:v}=r,x=v.filter,h=Nt(l,Math.max(o,Date.now())),g=l?.health||{},N=l?.status||{},A=n.sandbox||f||c||!l||u!=null,O=()=>w(null),j=S=>{l&&w({kind:"worker",worker:S,snapshot:l})},_=S=>{if(n.sandbox||!t.canMutate()){n.notify("当前不可更新：隔离副本或服务状态未就绪。");return}w(S)},M=()=>{if(n.sandbox||!t.canMutate())throw new Error("隔离副本或服务状态未就绪，禁止修改设备")},b=g.ok===!0?"运行正常":g.ok===!1?"异常":"状态未知",L=g.comfy_online===!0?"可用":g.comfy_online===!1?"不可用":"状态未知",T=[["运行模式",g.mode==="controller"?"Linux 中间层 / Controller":g.mode==="local"?"Windows 单机":g.mode||"未获取"],["可用能力",B(g.capabilities)==null?"未获取":`${g.capabilities} 项`],["任务记录",B(g.jobs)==null?"未获取":`${g.jobs} 条`],["大模型接口",g.llm?g.llm.ok?`已配置 · ${g.llm.model||"型号未记录"}`:"未配置":"未获取"],["页面地址",location.origin+"/controller"],["创作画布",location.origin+"/"]],z=Wt(l,v);return e.jsxs("main",{id:"main",className:Fe.page,tabIndex:-1,"aria-busy":d?!0:void 0,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"运行面板"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{className:"subtitle",id:"service-subtitle",children:l?`中间层${b} / ComfyUI ${L}`:"正在读取中间层运行状态"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{className:"muted small",id:"refresh-state",role:"status",children:d?"正在读取…":c?"连接失败 · 快照非实时":l?`最后刷新 ${new Date(l.receivedAt).toLocaleTimeString("zh-CN",{hour12:!1})}`:"正在加载…"}),e.jsxs("label",{className:"check-label",children:[e.jsx("input",{id:"auto-refresh",type:"checkbox",checked:i,onChange:S=>s(S.target.checked)}),"每5秒刷新"]}),e.jsxs("button",{type:"button",className:"primary",id:"refresh",disabled:d||u!=null,onClick:()=>{t.refreshAll()},children:[e.jsx(Qe,{name:"refresh"}),"立即刷新"]}),e.jsx("button",{type:"button",id:"sync-all",disabled:A,title:n.sandbox||f?"本地隔离数据副本禁止节点同步，不能修改正式机器。":void 0,onClick:()=>_({kind:"sync"}),children:"一键更新全部节点"})]})]}),e.jsxs("div",{id:"error",className:"f-error",role:"alert",hidden:!p,children:[e.jsxs("div",{children:[e.jsx("b",{id:"error-message",children:p}),e.jsx("p",{children:"已载入内容仅为上次快照，不能作为实时状态；未知数据不记为零。"})]}),e.jsx("button",{type:"button",id:"retry",disabled:d||u!=null,onClick:()=>{t.refreshAll()},children:"重试读取"})]}),e.jsxs("section",{className:"metrics f-metrics6","aria-label":"运行概览",children:[e.jsx(je,{id:"service",label:"中间层服务",value:g.ok===!0?"运行正常":g.ok===!1?"异常":"未获取",compact:!0,tone:g.ok===!0?"ok":g.ok===!1?"bad":"",noteId:"service-mode",note:g.mode==="controller"?"Controller 模式":g.mode==="local"?"Windows 单机":g.mode||"等待服务响应"}),e.jsx(je,{id:"workers",label:"在线执行端",value:l?`${be(g.online_workers)} / ${be(g.workers)}`:"未获取",note:"含禁用与同步中的在线节点"}),e.jsx(je,{id:"running",label:"正在运行",value:be(N.running_count),note:"由中间层调度的任务"}),e.jsx(je,{id:"queued",label:"排队任务",value:be(N.queued_count),note:"等待可用执行端"}),e.jsx(je,{id:"comfy",label:"ComfyUI",value:g.comfy_online===!0?"可用":g.comfy_online===!1?"不可用":"未获取",compact:!0,tone:g.comfy_online===!0?"ok":g.comfy_online===!1?"bad":"",note:"单节点状态见下表"}),e.jsx(je,{id:"uptime",label:"服务运行时间",value:B(g.started_at)!=null&&B(g.server_time)!=null?Nn(Number(g.server_time)-Number(g.started_at)):"未获取",compact:!0,note:"本次中间层服务启动至今"})]}),e.jsxs("div",{className:"dashboard-grid",children:[e.jsxs("section",{className:"card","aria-labelledby":"workers-title",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"workers-title",children:"Windows 执行端"}),e.jsx("p",{className:"section-subtitle",children:"状态、任务接收、ComfyUI 与同步分开显示；多显卡不合并显存"})]}),e.jsx("span",{className:"muted small",id:"worker-count",children:l?`${l.workers.length} 台 / ${l.workers.filter(re).reduce((S,Y)=>S+He(Y).length,0)} 张在线GPU`:"正在读取"})]}),e.jsx("div",{className:"table-wrap",children:e.jsxs("table",{className:"workers-table f-workers",children:[e.jsx("thead",{children:e.jsx("tr",{children:["执行端 / 主机","运行与接收状态","GPU / 显存","温度","系统内存","当前任务","同步 / 心跳","详情 / 趋势"].map(S=>e.jsx("th",{scope:"col",children:S},S))})}),e.jsx("tbody",{id:"worker-rows",children:l?e.jsx(ca,{snapshot:l,now:h,stale:c,mutationDisabled:A,deletingWorker:y,onDetails:j,onTemperature:S=>w({kind:"temperature",id:S}),onDelete:S=>_({kind:"delete",worker:S})}):e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"loading-note",children:p?"执行端读取失败，请点击“重试读取”。":"正在读取执行端…"})})})]})}),e.jsx("p",{className:"table-note",children:"显存条按已用容量占总容量的真实比例显示；离线或过期读数不作实时数据。点击行末入口查看真实采集的温度历史。"})]}),e.jsxs("aside",{className:"right-column","aria-label":"需要关注及配置",children:[e.jsxs("section",{className:"card",children:[e.jsx("div",{className:"section-heading",children:e.jsxs("h2",{className:"heading-inline",children:[e.jsx("span",{className:"danger",id:"attention-icon",children:e.jsx(Qe,{name:"alert"})}),"需要关注"]})}),e.jsx("div",{className:"attention-list",id:"attention-list",tabIndex:0,role:"region","aria-label":"需要关注的节点列表",children:l?e.jsx(pa,{snapshot:l,now:h,onDetails:j}):e.jsx("p",{className:"muted small",children:p?"节点状态未获取，不能判断是否存在异常。":"正在读取节点状态…"})})]}),e.jsxs("section",{className:"card",children:[e.jsx("div",{className:"section-heading",children:e.jsx("h2",{children:"服务配置摘要"})}),e.jsx(gr,{id:"config-rows",className:"f-config-definition",rows:T})]})]})]}),e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"最近任务"}),e.jsx("p",{className:"section-subtitle",children:"数据库历史按时间倒序分批加载；实时任务优先显示，归档未记录的信息不作推测"})]}),e.jsxs("label",{className:"filter-label",children:["任务状态",e.jsxs("select",{id:"jobs-filter",value:x,onChange:S=>{const Y=Tt.safeParse(S.target.value);Y.success&&t.setHistoryFilter(Y.data)},children:[e.jsx("option",{value:"all",children:"全部状态"}),["running","queued","done","error","canceled"].map(S=>e.jsx("option",{value:S,children:or[S]},S))]})]})]}),e.jsx("div",{className:"table-wrap f-job-scroll",role:"region","aria-label":"最近任务列表","aria-describedby":"job-note","aria-busy":!!v.loading,tabIndex:0,onScroll:S=>{const{scrollHeight:Y,scrollTop:K,clientHeight:Z}=S.currentTarget;Y-K-Z<=160&&!v.error&&t.loadMore()},children:e.jsxs("table",{className:"jobs-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["状态","姓名 / 项目 / 卡片","模式","过程进度 / 步骤","执行端","创建时间","耗时 / 错误"].map(S=>e.jsx("th",{scope:"col",children:S},S))})}),e.jsx("tbody",{id:"job-rows",children:e.jsx(Jt,{snapshot:l,now:h,items:z,onError:S=>w({kind:"job",job:S})})})]})}),e.jsxs("div",{className:Fe.historyControls,children:[e.jsxs("p",{className:"table-note",id:"job-note",role:"status","aria-live":"polite",children:[v.loading?v.loading==="more"?"正在加载更多历史…":"正在刷新任务历史…":v.initialized?v.hasMore?"向下滚动或点击加载更多。":"历史记录已加载完毕。":"任务历史尚未载入。",` 当前筛选历史共 ${v.total??"未知"} 条，已加载 ${v.jobs.length} 条；合并实时任务后显示 ${z.length} 条。`]}),v.error&&e.jsx("p",{role:"alert",children:v.error}),v.error?e.jsx("button",{type:"button",disabled:!!v.loading,onClick:()=>{t.retryHistory()},children:"重试任务历史"}):e.jsx("button",{type:"button","aria-controls":"job-rows",disabled:!!v.loading||!v.hasMore,onClick:()=>{t.loadMore()},children:"加载更多历史"})]})]})]}),k?.kind==="worker"&&e.jsx(da,{worker:k.worker,snapshot:k.snapshot,now:h,stale:c,onClose:O}),k?.kind==="temperature"&&e.jsx(sa,{workerId:k.id,worker:l?.workers.find(S=>S.id===k.id),service:a,now:h,stale:c,revision:r.refreshed,onClose:O}),k?.kind==="job"&&e.jsxs(ae,{title:"任务错误详情",onClose:O,children:[e.jsxs("p",{children:["任务 ",k.job.id]}),e.jsx("pre",{children:k.job.error||"未记录错误详情"}),e.jsxs("details",{children:[e.jsx("summary",{children:"任务执行记录"}),e.jsx("pre",{children:JSON.stringify(k.job,null,2)})]})]}),k?.kind==="sync"&&e.jsxs(ae,{title:"更新全部节点",onClose:O,submitLabel:"确认更新",onSubmit:async()=>{M();const S=await t.syncAll();n.notify(`已向 ${be(S.worker_count)} 个节点下发更新请求；主节点跳过 ${be(S.primary_count)} 个，旧版跳过 ${be(S.skipped_count)} 个。`)},children:[e.jsx("p",{children:"确认更新全部节点？"}),e.jsx("div",{className:"notice-box",children:"节点空闲后依次同步 ComfyUI 核心、models 和 user，拉取 chouka 最新代码，再按本机 GPU 启动配置重启 ComfyUI 与 Worker。全部服务恢复就绪后才显示完成。忙碌节点等待当前任务结束；离线节点下次上线后执行。主节点作为同步源不会参与更新；旧版节点会跳过，需先手动更新一次 Worker 及配套启动文件。"}),e.jsx("p",{className:"muted small",children:"这是实际节点更新和服务重启操作，确认后将向中间层提交请求。"})]}),k?.kind==="delete"&&e.jsxs(ae,{title:"删除设备",onClose:O,submitLabel:"确认删除设备",onSubmit:async()=>{M(),await t.deleteWorker(k.worker.id),n.notify("设备已删除，历史任务和账单保留。")},children:[e.jsxs("p",{children:["确认删除设备“",k.worker.name||"未命名执行端","”？"]}),e.jsx("div",{className:"notice-box",children:"设备会从列表中移除，历史任务和账单不会删除。设备后续重新注册时会重新出现。"})]})]})}function je({id:n,label:r,value:t,note:a,noteId:i,compact:s=!1,tone:o=""}){return e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:r}),e.jsx("p",{className:`metric-value${s?" compact":""}${o?` ${o}`:""}`,id:n,children:t}),e.jsx("p",{className:"metric-note",id:i,children:a})]})})}const Ae=le([C().min(1),H().finite()]).transform(String),Me=nn(["user","admin","monitor"]),Oe=nn(["read","operate"]),ua=R({id:Ae,username:C(),display_name:C().nullish(),phone:C().nullish(),role:Me,enabled:Q(),team_leader:Q().default(!1),approval_status:C().optional()}),ha=R({id:C().min(1),name:C().nullish(),owner_id:Ae,owner_username:C().nullish(),owner_display_name:C().nullish(),team_id:C().nullish(),team_name:C().nullish()}),Gn=le([R({scope:ce("all"),viewer_id:Ae,permission:Oe}),R({scope:ce("owner").optional(),viewer_id:Ae,owner_id:Ae.refine(n=>n!=="*","无效所有者"),permission:Oe})]),xa=R({requests:F(R({username:C(),display_name:C().nullish(),status:C(),created_at:H().nullish(),decided_by:C().nullish()})),outbox:R({pending:H().int().nonnegative(),oldest_at:H().nullish()}).nullish()}),br={admin:"管理员",user:"普通用户",monitor:"监控展示员"},en={approved:"已通过",pending:"待审批",rejected:"已拒绝"},Xe="全部个人和项目组画布，包括现有及未来新增画布",yr="画布内容和历史费用不变。新所有者的授权访问者将获得相应权限（可操作包含删除）；原所有者及其授权访问者可能失去访问权限。管理员仍可访问全部画布。项目组画布由成员关系授权，不能改为个人归属。";function qe(n){return(n?.username||"未知账号")+(n?.display_name?.trim()?`（${n.display_name.trim()}）`:"")}function de(n,r){return`${qe(n.find(t=>t.id===r))}（ID: ${r}）`}function gn(n,r){const t=r.find(a=>a.id===n.owner_id);return qe({username:n.owner_username||t?.username,display_name:n.owner_display_name||t?.display_name})}function bn(n){return n==="operate"?"可操作（含删除）":"只读"}function vr(n){return n?new Date(n*1e3).toLocaleString("zh-CN",{hour12:!1}):"—"}const me=C().min(1).max(512).refine(n=>n!=="*","无效账号 ID"),jr=C().min(8,"密码至少 8 位").max(1024),fa=R({username:C().trim().min(1,"请输入账号名").max(128),password:jr,role:Me,team_leader:Q()}).refine(n=>n.role!=="monitor"||!n.team_leader,"监控展示员不能担任组长"),ga=Jr("scope",[R({scope:ce("all"),viewer_id:me,permission:Oe}),R({scope:ce("owner"),viewer_id:me,owner_id:me,permission:Oe}).refine(n=>n.viewer_id!==n.owner_id,"访问者和所有者不能是同一个账号。")]),ba=R({owner_id:me,projects:F(R({project_id:C().min(1).max(512),owner_id:me})).min(1,"请选择画布").max(1e3,"每次最多分配 1000 个画布")}).refine(n=>new Set(n.projects.map(r=>r.project_id)).size===n.projects.length,"画布分配清单存在重复项"),Vn=R({}).passthrough(),Kn=n=>`/api/admin/global-grants/${encodeURIComponent(me.parse(n))}`,Jn=n=>`/api/admin/users/${encodeURIComponent(me.parse(n))}`;function ya(n){const r=async(t,a,i)=>{Vn.parse(await n.json(t,a,i))};return{async snapshot(t){const a={signal:t,cache:"no-store"},[i,s,o]=await Promise.all([n.read("/api/admin/users",R({users:F(ua)}),a),n.read("/api/admin/grants",R({grants:F(Gn)}),a),n.read("/api/projects",R({projects:F(ha)}),a)]);return{users:i.users,grants:s.grants,projects:o.projects}},registrations:t=>n.read("/api/admin/registrations",xa,{signal:t,cache:"no-store"}),create:t=>r("/api/admin/users","POST",fa.parse(t)),update:(t,a)=>{const i=le([R({role:Me}).strict(),R({enabled:Q()}).strict(),R({team_leader:Q()}).strict()]).parse(a);return r(Jn(t),"PATCH",i)},resetPassword:(t,a)=>r(`${Jn(t)}/password`,"POST",{password:jr.parse(a)}),saveGrant:t=>{const a=ga.parse(t);return a.scope==="all"?r(Kn(a.viewer_id),"PUT",{permission:a.permission}):r("/api/admin/grants","PUT",{viewer_id:a.viewer_id,owner_id:a.owner_id,permission:a.permission})},async revokeGrant(t){const a=Gn.parse(t),i=a.scope==="all"?Kn(a.viewer_id):`/api/admin/grants/${encodeURIComponent(me.parse(a.viewer_id))}/${encodeURIComponent(me.parse(a.owner_id))}`;Vn.parse(await n.request(i,{method:"DELETE"}))},async assign(t){const a=await n.json("/api/admin/projects/assign","POST",ba.parse(t));return R({count:H().int().nonnegative()}).parse(a).count}}}function we(n,r){const t=new FormData(n).get(r);if(typeof t!="string")throw new Error("表单字段不正确："+r);return t}function va(n,r,t){const a=r.trim().toLowerCase();return n.filter(i=>(!t||i.owner_id===t)&&(!a||(i.name||"").toLowerCase().includes(a)||i.id.toLowerCase().includes(a)))}function ja(n,r){const t=n.filter(i=>!i.team_id),a=t.filter(i=>r.has(i.id)).length;return{personal:t,checked:t.length>0&&a===t.length,indeterminate:a>0&&a<t.length}}function wa(n,r,t,a){const i=n.find(s=>s.id===r);if(!i||i.role==="monitor"||t!=="*"&&!n.some(s=>s.id===t))throw new Error("请选择有效账号和授权范围。");if(r===t)throw new Error("访问者和所有者不能是同一个账号。");return t==="*"?{scope:"all",viewer_id:r,permission:a}:{scope:"owner",viewer_id:r,owner_id:t,permission:a}}function _a(n,r,t,a){const i=n.find(o=>o.id===a&&o.enabled&&o.role!=="monitor");if(!i)throw new Error("请选择有效的启用目标账号。");if(!t.size)throw new Error("请选择个人画布。");if(t.size>1e3)throw new Error("每次最多分配 1000 个画布，请缩小筛选范围后再选择。");const s=r.filter(o=>t.has(o.id));if(s.length!==t.size||s.some(o=>o.team_id))throw new Error("选择包含项目组画布或已变化的画布，请刷新后重新选择。");return{target:i,chosen:s.map(o=>({...o})),payload:{owner_id:i.id,projects:s.map(o=>({project_id:o.id,owner_id:o.owner_id}))}}}function ka({http:n,notify:r}){const t=m.useMemo(()=>ya(n),[n]),[a,i]=m.useState({users:[],projects:[],grants:[]}),[s,o]=m.useState(null),[l,c]=m.useState(""),[d,p]=m.useState(!1),[f,u]=m.useState(!0),[y,k]=m.useState(!1),[w,v]=m.useState(""),[x,h]=m.useState("正在加载真实数据…"),[g,N]=m.useState(new Set),[A,O]=m.useState(""),j=m.useRef(!1),_=m.useRef(!1),M=m.useRef(!1),b=m.useRef(0),L=m.useRef(null),T=m.useRef(r);m.useEffect(()=>{T.current=r},[r]);const z=m.useCallback(async()=>{if(j.current)return;j.current=!0;const K=++b.current,Z=new AbortController;L.current=Z;const se=()=>M.current&&b.current===K;u(!0),h("正在加载真实数据…");try{const ge=await t.snapshot(Z.signal);if(!se())return;i(ge),p(!0),N(new Set);try{const ve=await t.registrations(Z.signal);if(!se())return;o(ve),c("")}catch(ve){if(!se())return;o(null);const Dn="注册申请信息加载失败："+ee(ve);c(Dn),T.current(Dn)}se()&&h("更新于 "+new Date().toLocaleTimeString("zh-CN",{hour12:!1}))}catch(ge){if(!se())return;throw p(!1),h("加载失败，请刷新重试"),ge}finally{se()&&(j.current=!1,u(!1))}},[t]),S=m.useCallback(async()=>{if(!(_.current||j.current)){v("");try{await z()}catch(K){if(!M.current)return;const Z=ee(K);v(Z),T.current(Z)}}},[z]);return m.useEffect(()=>(M.current=!0,S(),()=>{M.current=!1,L.current?.abort(),j.current=!1}),[S]),{...a,service:t,registrations:s,registrationError:l,ready:d,loading:f,mutationBusy:y,error:w,setError:v,refreshNote:x,selected:g,setSelected:N,assignStatus:A,setAssignStatus:O,refreshPage:S,mutate:async(K,Z,se)=>{if(_.current||j.current||!d)throw new Error("另一项操作正在提交或列表尚未就绪，请稍后重试。");_.current=!0,k(!0),v("");try{if(await K(),!M.current)return;se?.(),T.current(Z);try{await z()}catch(ge){if(!M.current)return;const ve="操作已成功，但列表刷新失败，请点击刷新数据后继续："+ee(ge);v(ve),T.current(ve)}}finally{_.current=!1,M.current&&k(!1)}}}}function wr({initial:n="user",onChange:r}){return e.jsxs("label",{className:"field",children:["角色",e.jsx("select",{name:"role",defaultValue:n,onChange:t=>r?.(Me.parse(t.currentTarget.value)),children:["user","admin","monitor"].map(t=>e.jsx("option",{value:t,children:br[t]},t))})]})}function _r(){return e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"field",children:["新密码（至少 8 位）",e.jsx("input",{name:"password",type:"password",minLength:8,maxLength:1024,autoComplete:"new-password",required:!0})]}),e.jsx("p",{className:"notice-box",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。密码不会显示在列表中。"})]})}function Na(){const[n,r]=m.useState("user"),[t,a]=m.useState(!1);return e.jsxs("div",{id:"create",className:"form-grid",children:[e.jsxs("label",{className:"field",children:["账号名",e.jsx("input",{name:"username",required:!0,maxLength:128,autoComplete:"off"})]}),e.jsx(_r,{}),e.jsx(wr,{onChange:i=>{r(i),i==="monitor"&&a(!1)}}),e.jsxs("label",{className:"check-label",children:[e.jsx("input",{name:"team_leader",type:"checkbox",checked:t,disabled:n==="monitor",onChange:i=>a(i.currentTarget.checked)}),"独立授予组长权限"]}),e.jsx("p",{className:"notice-box",children:"创建后账号启用并标记为已通过。监控展示员不能担任组长，密码由管理员重置；其他账号登录后可自行修改。"})]})}function Pe({name:n,id:r}){return e.jsxs("span",{className:"perm-identity",children:[e.jsx("span",{className:"perm-username",children:n}),e.jsxs("span",{className:"perm-user-id",children:["ID: ",r]})]})}function tn({columns:n,children:r}){return e.jsx("tr",{children:e.jsx("td",{colSpan:n,children:r})})}function Sa({users:n,busy:r,ready:t,action:a}){return e.jsx("div",{className:"table-wrap accounts-scroll",tabIndex:0,role:"region","aria-label":"账号列表",children:e.jsxs("table",{className:"accounts-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["账号 / ID","姓名 / 花名","手机号","角色","独立组长权限","启用状态","审批","操作"].map(i=>e.jsx("th",{scope:"col",children:i},i))})}),e.jsxs("tbody",{id:"users",children:[n.map(i=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx(Pe,{name:i.username,id:i.id})}),e.jsx("td",{children:i.display_name||"—"}),e.jsx("td",{children:i.phone||"未填写"}),e.jsx("td",{children:e.jsx("span",{className:"f-chip "+(i.role==="admin"?"admin":""),children:br[i.role]})}),e.jsx("td",{children:i.team_leader?"是":"否"}),e.jsx("td",{children:e.jsx("span",{className:"f-chip "+(i.enabled?"on":"off"),children:i.enabled?"启用":"已停用"})}),e.jsx("td",{children:Object.hasOwn(en,i.approval_status||"")?en[i.approval_status||""]:"—"}),e.jsx("td",{children:e.jsxs("div",{className:"row-actions",children:[e.jsx("button",{type:"button",className:i.enabled?"danger":"",disabled:r,onClick:()=>a(i,"enabled"),children:i.enabled?"停用":"启用"}),e.jsx("button",{type:"button",disabled:r,onClick:()=>a(i,"role"),children:"修改角色"}),i.role!=="monitor"&&e.jsx("button",{type:"button",disabled:r,onClick:()=>a(i,"leader"),children:i.team_leader?"取消组长权限":"设为组长"}),e.jsx("button",{type:"button",disabled:r,onClick:()=>a(i,"password"),children:"重置密码"})]})})]},i.id)),!n.length&&e.jsx(tn,{columns:8,children:t?"暂无账号。":"正在加载账号…"})]})]})})}function $a({data:n,error:r}){return e.jsx("div",{className:"table-wrap registrations-scroll",tabIndex:0,role:"region","aria-label":"注册申请列表",children:e.jsxs("table",{className:"registration-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["账号","姓名 / 花名","状态","申请时间","审批人"].map(t=>e.jsx("th",{scope:"col",children:t},t))})}),e.jsxs("tbody",{id:"registrations",children:[n?.requests.map((t,a)=>e.jsxs("tr",{children:[e.jsx("td",{children:t.username}),e.jsx("td",{children:t.display_name||"—"}),e.jsx("td",{children:Object.hasOwn(en,t.status)?en[t.status]:t.status}),e.jsx("td",{children:vr(t.created_at)}),e.jsx("td",{children:t.decided_by||"—"})]},t.username+"-"+a)),!n?.requests.length&&e.jsx(tn,{columns:5,children:r?"暂时无法加载注册申请，请点击刷新数据重试。":n?"暂无自主注册申请。":"正在加载注册申请…"})]})]})})}function za({grants:n,users:r,busy:t,ready:a,revoke:i}){return e.jsx("div",{className:"table-wrap",tabIndex:0,role:"region","aria-label":"画布授权列表",children:e.jsxs("table",{className:"grant-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["访问者 A","方向","所有者 / 授权范围","权限","操作"].map(s=>e.jsx("th",{scope:"col",children:s},s))})}),e.jsxs("tbody",{id:"grants",children:[n.map(s=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx(Pe,{name:qe(r.find(o=>o.id===s.viewer_id)),id:s.viewer_id})}),e.jsx("td",{children:"→"}),e.jsx("td",{children:s.scope==="all"?e.jsxs(e.Fragment,{children:["所有画布",e.jsx("span",{className:"perm-user-id",children:Xe})]}):e.jsx(Pe,{name:qe(r.find(o=>o.id===s.owner_id)),id:s.owner_id})}),e.jsx("td",{children:bn(s.permission)}),e.jsx("td",{children:e.jsx("button",{type:"button",className:"danger",disabled:t,onClick:()=>i(s),children:"撤销"})})]},s.viewer_id+"-"+(s.scope==="all"?"*":s.owner_id))),!n.length&&e.jsx(tn,{columns:5,children:a?"暂无画布授权。选择访问者与所有者 / 授权范围后保存。":"正在加载授权…"})]})]})})}function Ca({projects:n,users:r,target:t}){return e.jsx("div",{className:"dialog-list",tabIndex:0,role:"region","aria-label":"画布分配确认明细",children:e.jsxs("table",{children:[e.jsx("thead",{children:e.jsx("tr",{children:["画布名称","画布 ID","旧归属","目标归属"].map(a=>e.jsx("th",{scope:"col",children:a},a))})}),e.jsx("tbody",{children:n.map(a=>e.jsxs("tr",{children:[e.jsx("td",{children:a.name||"未命名画布"}),e.jsx("td",{children:a.id}),e.jsx("td",{children:e.jsx(Pe,{name:gn(a,r),id:a.owner_id})}),e.jsx("td",{children:e.jsx(Pe,{name:qe(t),id:t.id})})]},a.id))})]})})}function Ea({projects:n,users:r,busy:t,ready:a,selected:i,setSelected:s,status:o,onConfirm:l,onError:c}){const[d,p]=m.useState(""),[f,u]=m.useState(""),[y,k]=m.useState(""),w=new Map(n.map(j=>[j.owner_id,`${gn(j,r)}（ID: ${j.owner_id}）`])),v=w.has(f)?f:"",x=r.filter(j=>j.enabled&&j.role!=="monitor"),h=x.some(j=>j.id===y)?y:"",g=va(n,d,v),N=ja(g,i),A=m.useRef(null);m.useEffect(()=>{A.current&&(A.current.indeterminate=N.indeterminate)},[N.indeterminate]);const O=j=>{j(),s(new Set)};return e.jsxs("section",{className:"card","aria-labelledby":"history-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"history-heading",tabIndex:-1,children:"历史画布分配"}),e.jsx("span",{className:"small muted",children:"仅个人空间 / 每次最多 1000 个"})]}),e.jsx("div",{className:"f-pad",children:e.jsx("p",{className:"notice-box",children:yr})}),e.jsxs("div",{className:"allocation-tools",children:[e.jsxs("div",{className:"allocation-filters",children:[e.jsxs("label",{className:"field",children:["搜索名称 / ID",e.jsx("input",{id:"project-search",type:"search",autoComplete:"off",placeholder:"输入画布名称或 ID",value:d,disabled:t,onChange:j=>O(()=>p(j.currentTarget.value))})]}),e.jsxs("label",{className:"field",children:["当前所有者",e.jsxs("select",{id:"project-owner",value:v,disabled:t,onChange:j=>O(()=>u(j.currentTarget.value)),children:[e.jsx("option",{value:"",children:"全部所有者"}),[...w].map(([j,_])=>e.jsx("option",{value:j,children:_},j))]})]})]}),e.jsxs("form",{id:"assign",className:"allocation-batch","aria-busy":t,onSubmit:j=>{if(j.preventDefault(),!t)try{l(_a(r,g,i,h))}catch(_){c(ee(_))}},children:[e.jsxs("label",{className:"field",children:["目标账号（仅启用账号）",e.jsxs("select",{name:"owner_id",required:!0,value:h,disabled:t,onChange:j=>k(j.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择目标账号"}),x.map(j=>e.jsx("option",{value:j.id,children:de(r,j.id)},j.id))]})]}),e.jsxs("span",{id:"project-selected",role:"status",children:["已选 ",i.size," 个画布",i.size>1e3?"（超过 1000 个上限）":""]}),e.jsx("button",{id:"assign-submit",className:"primary",disabled:t||!i.size||!h,children:"分配所选画布"}),e.jsx("button",{id:"clear-selection",type:"button",disabled:t||!i.size,onClick:()=>s(new Set),children:"清空选择"})]})]}),e.jsx("p",{id:"assign-status",className:"table-note f-status",role:"status",children:o}),e.jsx("div",{className:"table-wrap history-scroll",tabIndex:0,role:"region","aria-label":"历史画布列表",children:e.jsxs("table",{className:"allocation-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{scope:"col",children:e.jsx("input",{ref:A,id:"project-all",type:"checkbox","aria-label":"全选当前筛选结果中的个人画布",checked:N.checked,disabled:t||!N.personal.length,onChange:j=>s(new Set(j.currentTarget.checked?N.personal.map(_=>_.id):[]))})}),["画布名称","画布 ID","当前所有者","空间"].map(j=>e.jsx("th",{scope:"col",children:j},j))]})}),e.jsxs("tbody",{id:"projects",children:[g.map(j=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("input",{type:"checkbox","data-team":String(!!j.team_id),checked:i.has(j.id),"aria-label":`选择画布 ${j.name||"未命名画布"}（${j.id}）`,disabled:t||!!j.team_id,onChange:_=>{const M=new Set(i);_.currentTarget.checked?M.add(j.id):M.delete(j.id),s(M)}})}),e.jsx("td",{children:j.name||"未命名画布"}),e.jsx("td",{className:"perm-id",children:j.id}),e.jsx("td",{children:e.jsx(Pe,{name:gn(j,r),id:j.owner_id})}),e.jsx("td",{children:j.team_id?e.jsxs(e.Fragment,{children:["项目组：",j.team_name||j.team_id,e.jsx("span",{className:"team-space",children:"由成员关系授权，不可改为个人归属"})]}):"个人空间"})]},j.id)),!g.length&&e.jsx(tn,{columns:5,children:a?"暂无符合条件的画布，请尝试更换搜索词或当前所有者。":"正在加载画布…"})]})]})}),e.jsx("p",{className:"table-note",children:"搜索或切换当前所有者会清空选择。全选只选择当前筛选结果中的个人画布，项目组画布不可选；超过 1000 个时请缩小筛选范围。"})]})}function Ma(n){const r=ka(n),{users:t,grants:a,projects:i,service:s}=r,[o,l]=m.useState(null),[c,d]=m.useState(""),[p,f]=m.useState(""),[u,y]=m.useState(""),k=m.useRef(null),w=r.loading||r.mutationBusy||!r.ready,v=w&&!o,x=b=>{r.setError(b),n.notify(b)},h=b=>{!w&&!o&&l(b)},g=(b,L)=>{const T=e.jsxs("p",{children:["目标账号：",e.jsx("b",{children:de(t,b.id)})]});if(L==="password")return h({title:"重置密码",children:e.jsxs(e.Fragment,{children:[T,e.jsx(_r,{}),e.jsx("p",{className:"notice-box danger",children:"该账号现有会话将失效，需要使用新密码重新登录。请妥善告知本人。"})]}),submitLabel:"确认重置密码",action:Z=>s.resetPassword(b.id,we(Z,"password")),message:"密码已重置"});if(L==="role")return h({title:"修改账号角色",children:e.jsxs(e.Fragment,{children:[T,e.jsx(wr,{initial:b.role}),e.jsx("p",{className:"notice-box danger",children:"管理员天然可访问全部画布。切换为监控展示员会清除组长权限，已有画布授权保留但不生效；其他角色的组长权限不变。修改角色会使该账号现有会话失效；最后一位启用管理员受系统保护。"})]}),submitLabel:"确认修改角色",action:Z=>s.update(b.id,{role:Me.parse(we(Z,"role"))}),message:"账号角色已修改"});const z=L==="enabled",S=z?!b.enabled:!b.team_leader,Y=z?S?"启用账号":"停用账号":S?"授予组长权限":"取消组长权限",K=z?S?"启用不会跳过钉钉注册审批，审批状态保持不变。":"停用后该账号不能继续登录，现有会话失效。不会删除既有项目组关系或画布授权；最后一位启用管理员受系统保护。":S?"授予该用户创建项目组和管理自己创建项目组的权限，不会成为管理员，也不能管理其他人的项目组。现有会话失效后需重新登录。":"取消后不能继续创建或管理项目组，现有会话失效。既有组长归属和成员关系不会被迁移。";h({title:Y,children:e.jsxs(e.Fragment,{children:[T,e.jsx("p",{className:"notice-box",children:K})]}),submitLabel:"确认"+Y,action:()=>s.update(b.id,z?{enabled:S}:{team_leader:S}),message:Y+"成功"})},N=b=>{const L=b.scope==="all"?"所有画布（"+Xe+"）":de(t,b.owner_id);h({title:"确认撤销授权",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:[de(t,b.viewer_id)," → ",L]}),e.jsxs("p",{children:["权限：",bn(b.permission)]}),e.jsx("p",{className:"notice-box danger",children:"撤销后即时重新校验权限，访问者失去这条授权带来的全部画布访问权。此授权不会使其成为管理员；管理员天然权限、项目组成员关系和其他独立授权不受影响。"})]}),submitLabel:"确认撤销授权",action:()=>s.revokeGrant(b),message:"已撤销画布授权"})},A=t.filter(b=>b.role!=="monitor"),O=A.some(b=>b.id===p)?p:"",j=u==="*"||t.some(b=>b.id===u)?u:"",_=[{id:"users",label:"账号总数",value:t.length,note:"角色与独立组长权限分别管理"},{id:"enabled",label:"启用账号",value:t.filter(b=>b.enabled).length,note:"停用不会删除账号或画布授权"},{id:"pending",label:"待审批注册",value:r.registrations?.requests.filter(b=>b.status==="pending").length??"—",note:"仅由钉钉指定审批人处理"},{id:"grants",label:"画布授权",value:a.length,note:"访问者 A → 所有者 / 授权范围"}],M=r.registrations?.outbox;return e.jsxs("main",{id:"main",tabIndex:-1,ref:k,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"账号与权限"}),e.jsx("div",{className:"page-caption",children:e.jsx("p",{className:"subtitle",children:"管理账号、画布访问与历史画布归属"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{id:"refresh-note",className:"refresh-note",role:"status",children:r.refreshNote}),e.jsx("button",{id:"refresh",type:"button",disabled:r.loading||r.mutationBusy||!!o,onClick:()=>{r.refreshPage()},children:"刷新数据"})]})]}),e.jsx("p",{id:"error",className:"page-status",role:"alert",children:r.error}),e.jsx("section",{className:"metrics","aria-label":"权限概览",children:_.map(b=>e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:b.label}),e.jsx("p",{id:"metric-"+b.id,className:"metric-value",children:b.id==="pending"||r.ready||t.length?b.value:"—"}),e.jsx("p",{className:"metric-note",children:b.note})]})},b.id))}),e.jsx("nav",{className:"section-nav","aria-label":"权限管理分区",children:[["accounts","账号管理"],["registrations","注册申请"],["grants","画布授权"],["history","历史画布分配"]].map(([b,L])=>e.jsx("a",{href:"#"+b+"-heading",onClick:()=>k.current?.querySelector("#"+b+"-heading")?.focus(),children:L},b))}),e.jsxs("section",{className:"card","aria-labelledby":"accounts-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"accounts-heading",tabIndex:-1,children:"账号管理"}),e.jsx("p",{className:"section-subtitle",children:"账号角色包括管理员、普通用户和监控展示员。监控展示员仅可查看监控，不能担任组长或访问画布。"})]}),e.jsx("button",{id:"create-user",type:"button",className:"primary",disabled:v,onClick:()=>h({title:"新建账号",children:e.jsx(Na,{}),submitLabel:"创建账号",action:b=>s.create({username:we(b,"username").trim(),password:we(b,"password"),role:Me.parse(we(b,"role")),team_leader:new FormData(b).has("team_leader")}),message:"账号已创建"}),children:"新建账号"})]}),e.jsx(Sa,{users:t,busy:v,ready:r.ready,action:g}),e.jsx("p",{className:"table-note",children:"启停、角色、组长权限及重置密码均需确认。初始密码至少 8 位，请勿使用常见弱密码；监控展示员的密码由管理员重置，其他账号登录后可自行修改。"})]}),e.jsxs("div",{className:"permissions-grid",children:[e.jsxs("section",{className:"card","aria-labelledby":"registrations-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"registrations-heading",tabIndex:-1,children:"注册申请"}),e.jsx("span",{className:"small muted",children:"仅查看钉钉审批结果"})]}),e.jsxs("div",{className:"f-pad form-grid",children:[e.jsx("p",{className:"notice-box",children:"自主注册由钉钉群内两位指定审批人在卡片上处理，任意一人先决生效。网页不提供通过或拒绝操作。"}),e.jsx("p",{id:"outbox-status",className:"f-status",role:"status",children:r.registrationError||(r.registrations?M&&M.pending>0?`审批通知积压 ${M.pending} 条（最早 ${M.oldest_at?vr(M.oldest_at):"时间未知"}），系统会自动重试投递。`:"审批通知投递正常。":"")})]}),e.jsx($a,{data:r.registrations,error:r.registrationError})]}),e.jsxs("section",{className:"card","aria-labelledby":"grants-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"grants-heading",tabIndex:-1,children:"画布授权"}),e.jsx("span",{className:"small muted",children:"访问者 A → 所有者 / 授权范围"})]}),e.jsx("div",{className:"f-pad",children:e.jsx("p",{id:"grant-help",className:"notice-box",children:"选择指定所有者，A 可查看或操作其当前及以后创建的全部个人画布；选择“所有画布”则覆盖全部个人和项目组画布，包括现有及未来新增画布。可操作包含删除；授权不传递，也不会成为管理员。管理员天然可访问全部画布，停用账号不会因授权恢复登录权限。"})}),e.jsxs("form",{id:"grant",className:"grant-form","aria-describedby":"grant-help","aria-busy":r.mutationBusy,onSubmit:b=>{if(b.preventDefault(),!w){d("");try{const L=wa(t,O,j,Oe.parse(we(b.currentTarget,"permission"))),T=L.scope==="all"?"所有画布（"+Xe+"）":de(t,L.owner_id),z=L.scope==="all"?"覆盖"+Xe+"，不受所有者或项目组成员关系限制。":"覆盖所有者当前和以后创建的全部个人画布，不包含项目组画布。";h({title:"确认画布授权",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["访问者 A：",de(t,L.viewer_id)]}),e.jsxs("p",{children:["所有者 / 授权范围：",T]}),e.jsxs("p",{children:["权限：",e.jsx("b",{children:bn(L.permission)})]}),e.jsxs("p",{className:"notice-box danger",children:[z,"可操作包含删除；授权不传递，也不会成为管理员。已有同范围授权将被更新，其他独立授权保留；保存后即时重新校验权限。停用账号不会因此恢复登录。"]})]}),submitLabel:"确认保存授权",action:()=>s.saveGrant(L),message:"画布授权已保存"})}catch(L){const T=ee(L);d(T),n.notify(T)}}},children:[e.jsxs("label",{className:"field",children:["访问者 A",e.jsxs("select",{name:"viewer_id",required:!0,disabled:v,value:O,onChange:b=>f(b.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择账号"}),A.map(b=>e.jsx("option",{value:b.id,children:de(t,b.id)},b.id))]})]}),e.jsxs("label",{className:"field",children:["所有者 / 授权范围",e.jsxs("select",{name:"owner_id",required:!0,disabled:v,value:j,onChange:b=>y(b.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择所有者 / 授权范围"}),e.jsx("option",{value:"*",children:"所有画布（含以后新增）"}),t.map(b=>e.jsx("option",{value:b.id,children:de(t,b.id)},b.id))]})]}),e.jsxs("label",{className:"field",children:["权限",e.jsxs("select",{name:"permission",disabled:v,children:[e.jsx("option",{value:"read",children:"只读"}),e.jsx("option",{value:"operate",children:"可操作（含删除）"})]})]}),e.jsx("button",{id:"grant-submit",className:"primary",disabled:v,children:"保存授权"}),e.jsx("p",{id:"grant-error",className:"danger small",role:"alert",children:c})]}),e.jsx(za,{grants:a,users:t,busy:v,ready:r.ready,revoke:N})]})]}),e.jsx(Ea,{projects:i,users:t,busy:v,ready:r.ready,selected:r.selected,setSelected:r.setSelected,status:r.assignStatus,onError:x,onConfirm:({target:b,chosen:L,payload:T})=>h({title:"确认分配 "+L.length+" 个画布",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["目标账号：",e.jsx("b",{children:de(t,b.id)})]}),e.jsx("p",{className:"notice-box danger",children:yr}),e.jsx(Ca,{projects:L,users:t,target:b})]}),submitLabel:"确认分配所列画布",action:async()=>{const z=await s.assign(T);r.setSelected(new Set),r.setAssignStatus(`分配成功：已将 ${z} 个画布分配给 ${de(t,b.id)}。`)},message:"画布归属已分配"})})]}),o&&e.jsx(ae,{title:o.title,submitLabel:o.submitLabel,onClose:()=>l(null),onSubmit:b=>r.mutate(()=>o.action(b),o.message,o.afterSuccess),children:o.children})]})}const ye=10,kr=2e3,Pa=15e3;function Ra(n){return n==="0"||n==="7"||n==="30"||n==="90"}const q=le([H(),C(),ar()]).optional().transform((n,r)=>{if(n==null||n==="")return n===void 0?void 0:null;const t=typeof n=="number"?n:Number(n);return Number.isFinite(t)?t:(r.addIssue({code:"custom",message:"费用数值必须为有限数字或未知值"}),Xr)}),ne=C().nullish(),La=V({tasks:q,done:q,error:q,canceled:q,retail_min:q,retail_max:q,retail_mid:q,retail_known_tasks:q,retail_unknown_tasks:q,total_cost:q,actual_cost:q,estimated_cost:q,running_accrued:q,gpu_hours:q,electricity_cost:q,api_cost:q,failed_waste:q,unknown_cost_tasks:q}),un=V({key:ne,label:ne,tasks:q,retail_known_tasks:q,retail_unknown_tasks:q,retail_min:q,retail_max:q,retail_mid:q,total_cost:q}),Ia=V({job_id:ne,created_at:q,status:ne,category_name:ne,category:ne,project_name:ne,card_name:ne,capability:ne,worker_name:ne,runtime_seconds:q,retail_source:ne,retail_basis:ne,retail_min:q,retail_max:q,cost_source:ne,recognized_cost:q}),Aa=V({overview:La,jobs:F(Ia).transform(n=>n.slice(0,kr)),currency:ne,pricing_version:le([C(),H()]).nullish(),period:V({from:q,to:q}).nullish(),by_category:F(un).nullish(),by_capability:F(un).nullish(),by_worker:F(un).nullish()});function Ta(n){const r=Aa.safeParse(n);if(!r.success)throw new Error("费用接口返回的数据格式不完整");return r.data}function Da(n,r=Date.now()){const t=new URLSearchParams({limit:String(kr)});return n!=="0"&&t.set("from",String(r/1e3-Number(n)*86400)),`/api/costs?${t}`}function Fa(n){return{async load(r,t){const a=await n.request(Da(r),{cache:"no-store",signal:t});return Ta(a)}}}const Oa={data:null,selectedPeriod:"0",loadedPeriod:"0",page:0,busy:!0,error:null,updatedAt:null};function qa({http:n,notify:r}){const t=m.useMemo(()=>Fa(n),[n]),[a,i]=m.useState(Oa),s=m.useRef("0"),o=m.useRef("0"),l=m.useRef(0),c=m.useRef(!1),d=m.useRef(!1),p=m.useRef(new Set),f=m.useRef(r);m.useEffect(()=>{f.current=r},[r]);const u=m.useCallback(async(h,g,N=!1)=>{if(c.current&&!N)return;const A=++l.current;c.current=!0;const O=new AbortController;p.current.add(O),i(j=>({...j,busy:!0}));try{const j=await t.load(h,O.signal);if(A!==l.current)return;o.current=h,d.current=!1,i(_=>({..._,data:j,loadedPeriod:h,error:null,updatedAt:Date.now(),page:g?0:Math.min(_.page,Math.max(0,Math.ceil(j.jobs.length/ye)-1))}))}catch(j){if(A!==l.current)return;const _=`读取费用统计失败：${ee(j)}`,M=!d.current;d.current=!0,i(b=>({...b,error:_})),M&&f.current(_)}finally{p.current.delete(O),A===l.current&&(c.current=!1,i(j=>({...j,busy:!1})))}},[t]),y=m.useCallback(()=>{l.current+=1,c.current=!1,p.current.forEach(h=>h.abort()),p.current.clear()},[]);m.useEffect(()=>{u(s.current,!1);const h=window.setInterval(()=>{document.hidden||u(s.current,!1)},Pa);return()=>{window.clearInterval(h),y()}},[u,y]);const k=m.useCallback(h=>{s.current=h,i(g=>({...g,selectedPeriod:h})),u(h,!0,!0)},[u]),w=m.useCallback(()=>{u(s.current,!1)},[u]),v=m.useCallback(()=>{const h=s.current!==o.current;u(s.current,h,h)},[u]),x=m.useCallback(h=>{i(g=>({...g,page:Math.max(0,Math.min(g.page+h,Math.max(0,Math.ceil((g.data?.jobs.length??0)/ye)-1)))}))},[]);return{...a,selectPeriod:k,refresh:w,retry:v,changePage:x}}function J(n){return typeof n=="number"&&Number.isFinite(n)?n:null}function ie(n){return J(n)==null?"未获取":String(n)}function ze(n,r){const t=J(n);return t==null?"未知":`${!r||r==="CNY"?"¥":r+" "}${t.toFixed(4)}`}function En(n,r,t){return J(n)==null||J(r)==null?"未知":n===r?ze(n,t):`${ze(n,t)} – ${ze(r,t)}`}function hn(n){const r=J(n);return r==null||!Number.isFinite(new Date(r*1e3).getTime())?"未记录":new Date(r*1e3).toLocaleString("zh-CN",{hour12:!1})}function Ua(n){const r=J(n);return r==null||r<0?"未记录":r<60?`${Math.round(r)}秒`:r<3600?`${Math.floor(r/60)}分${Math.floor(r%60)}秒`:`${Math.floor(r/3600)}小时${Math.floor(r%3600/60)}分`}function Ba(n){return n==="0"?"全部记录":`最近${n}天`}function Wa(n){return{unpriced:J(n.retail_known_tasks)===0&&(J(n.retail_unknown_tasks)??0)>0,allCostsUnknown:(J(n.tasks)??0)>0&&J(n.unknown_cost_tasks)===J(n.tasks)&&J(n.actual_cost)===0&&J(n.estimated_cost)===0}}function Ha(n,r){return J(n.retail_known_tasks)==null?"未获取":n.retail_known_tasks?En(n.retail_min,n.retail_max,r):"未定价"}const Xn={queued:"排队中",assigned:"已分配",running:"运行中",done:"已完成",error:"失败",canceled:"已取消",cancel_requested:"正在取消"},Yn={actual:"实际",estimated:"历史估算",unknown:"未知"},Zn={per_job:"按次",per_segment:"按段",segment_count:"按分段数",output_second_resolution:"按输出秒和分辨率"};function Ga(n,r){const t=n.retail_source==="priced",a=n.retail_source==="not_billable",i=n.retail_source==="unpriced";return{status:(Object.hasOwn(Xn,n.status||"")?Xn[n.status||""]:n.status)||"未知",statusClass:["error","canceled"].includes(n.status||"")?"danger":["running","queued","assigned","cancel_requested"].includes(n.status||"")?"warn":"",basis:t?(Object.hasOwn(Zn,n.retail_basis||"")?Zn[n.retail_basis||""]:n.retail_basis)||"未记录":a?"未完成":i?"未定价":"未获取",basisClass:i?"warn":"muted",retail:t?En(n.retail_min,n.retail_max,r):a?"不计费":i?"未定价":"未知",internal:n.cost_source==="unknown"||!n.cost_source?"未知":ze(n.recognized_cost,r),source:(Object.hasOwn(Yn,n.cost_source||"")?Yn[n.cost_source||""]:n.cost_source)||"来源未记录"}}function he({label:n,id:r,children:t,note:a,noteId:i,compact:s=!0}){return e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:n}),e.jsx("p",{className:`metric-value${s?" compact":""}`,id:r,children:t}),e.jsx("p",{className:"metric-note",id:i,children:a})]})})}function Va({data:n}){const r=n?.overview??{},{unpriced:t,allCostsUnknown:a}=Wa(r),i=o=>ze(o,n?.currency),s=n?t?"未定价":J(r.retail_min)!=null&&J(r.retail_max)!=null&&r.retail_min!==r.retail_max?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"cost-amount",children:i(r.retail_min)})," – ",e.jsx("span",{className:"cost-amount",children:i(r.retail_max)})]}):En(r.retail_min,r.retail_max,n.currency):"未获取";return e.jsxs("section",{className:"metrics f-metrics8","aria-label":"费用概览",children:[e.jsx(he,{label:"建议收费区间",id:"retail-range",note:"按次 / 分段 / 输出秒和分辨率",children:s}),e.jsx(he,{label:"建议收费中值",id:"retail-mid",noteId:"retail-coverage",note:n?`已定价 ${ie(r.retail_known_tasks)} 项 / 未定价 ${ie(r.retail_unknown_tasks)} 项`:"已定价 未获取 / 未定价 未获取",children:n?t?"未定价":i(r.retail_mid):"未获取"}),e.jsx(he,{label:"内部总成本",id:"internal-total",noteId:"internal-split",note:n?a?`实际与历史估算均未记录；未知 ${ie(r.unknown_cost_tasks)} 项`:`实际 ${i(r.actual_cost)} / 历史估算 ${i(r.estimated_cost)}`:"实际 未获取 / 历史估算 未获取",children:n?a?"未知":i(r.total_cost):"未获取"}),e.jsx(he,{label:"内部实际成本",id:"actual",noteId:"running",note:n?`运行中累计 ${i(r.running_accrued)}`:"运行中累计 未获取",children:n?a?"未知":i(r.actual_cost):"未获取"}),e.jsx(he,{label:"GPU 用量",id:"gpu-hours",noteId:"electricity",note:n?`其中电费 ${i(r.electricity_cost)}`:"其中电费 未获取",children:J(r.gpu_hours)==null?"未获取":`${r.gpu_hours?.toFixed(2)} 小时`}),e.jsx(he,{label:"API 成本",id:"api-cost",note:"按输入 / 输出 token",children:n?i(r.api_cost):"未获取"}),e.jsx(he,{label:"失败与取消损耗",id:"waste",noteId:"unknown",note:`已包含于总成本；未知 ${ie(r.unknown_cost_tasks)} 项`,children:n?i(r.failed_waste):"未获取"}),e.jsx(he,{label:"任务数量",id:"tasks",compact:!1,noteId:"statuses",note:`完成 ${ie(r.done)} / 失败 ${ie(r.error)} / 取消 ${ie(r.canceled)}`,children:ie(r.tasks)})]})}const _e=[{key:"category",label:"按类型"},{key:"capability",label:"按能力"},{key:"worker",label:"按执行端"}];function Ka({data:n,failed:r}){const[t,a]=m.useState("category"),i=m.useRef({}),o=n?.[`by_${t}`]?.slice(0,10),l=Math.max(0,...(o??[]).map(d=>J(d.retail_mid)??0));function c(d,p){let f;switch(d.key){case"ArrowRight":case"ArrowDown":f=(p+1)%_e.length;break;case"ArrowLeft":case"ArrowUp":f=(p+_e.length-1)%_e.length;break;case"Home":f=0;break;case"End":f=_e.length-1;break;default:return}d.preventDefault();const u=_e[f];u&&(a(u.key),i.current[u.key]?.focus())}return e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"费用构成"}),e.jsx("p",{className:"section-subtitle",children:"按建议收费中值排序 / 每个视角前10项；条形为相对最大项，不是内部成本占比"})]}),e.jsx("span",{className:"muted small",id:"pricing",children:n?`计价版本 ${n.pricing_version??"未获取"} / 币种 ${n.currency??"未获取"}`:"等待计价信息"})]}),e.jsx("div",{className:"tabs f-pad-tabs",role:"tablist","aria-label":"费用构成视角",children:_e.map((d,p)=>e.jsx("button",{type:"button",role:"tab",id:`cost-tab-${d.key}`,"aria-controls":"cost-panel","aria-selected":t===d.key,tabIndex:t===d.key?0:-1,"data-cost-tab":d.key,ref:f=>{f?i.current[d.key]=f:delete i.current[d.key]},onClick:()=>a(d.key),onKeyDown:f=>c(f,p),children:d.label},d.key))}),e.jsx("div",{className:"f-cost-chart f-pad",id:"cost-panel",role:"tabpanel","aria-labelledby":`cost-tab-${t}`,tabIndex:0,children:n?o?o.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"这个周期内还没有费用构成"}),e.jsx("p",{children:"调整统计周期，或等待任务产生费用记录。"})]}):o.map((d,p)=>{const f=J(d.retail_mid),u=f!=null&&l>0?Math.max(0,Math.min(100,f/l*100)):null;return e.jsxs("div",{className:"f-rank",children:[e.jsxs("div",{children:[e.jsx("b",{title:d.key??void 0,children:d.label||d.key||"未记录"}),e.jsx("strong",{children:Ha(d,n.currency)})]}),e.jsxs("p",{className:"muted small",children:[ie(d.tasks)," 项 · 已定价 ",ie(d.retail_known_tasks)," · 未定价"," ",ie(d.retail_unknown_tasks)," · 已知内部成本"," ",ze(d.total_cost,n.currency)]}),u!=null&&e.jsx("div",{className:"f-track",role:"meter","aria-label":`${d.label||d.key||""} 建议收费中值相对最大项`,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":u,children:e.jsx("i",{style:{width:`${u}%`}})})]},`${d.key??""}-${p}`)}):e.jsx("p",{className:"muted",children:"构成数据未获取，不以零元替代。"}):e.jsx("p",{className:"muted",children:r?"费用构成读取失败，请点击“重试读取”。":"正在读取费用构成…"})})]})}function Ke({children:n}){return e.jsx("span",{className:"cell-secondary",children:n})}function Ja({data:n,page:r,loadedPeriod:t,failed:a,changePage:i,openBasis:s}){const o=n?.jobs??[],l=Math.max(0,Math.ceil(o.length/ye)-1),c=o.slice(r*ye,(r+1)*ye),d=J(n?.overview.tasks);return e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"费用明细"}),e.jsx("p",{className:"section-subtitle",id:"detail-note",children:n?`服务端合计 ${ie(n.overview.tasks)} 条 / 明细已载入 ${o.length} 条${d!=null&&d>o.length?"（接口最多2000条，非完整明细）":""}；汇总不以当前显示页相加替代`:a?"明细未获取，不以空记录或零元代替。":"正在读取；汇总不以当前明细页相加替代"})]}),e.jsx("button",{type:"button",className:"link-button",id:"cost-basis",onClick:s,children:"计价与成本口径"})]}),e.jsx("p",{className:"table-note",id:"period-note",children:n?`当前展示：${Ba(t)} · ${J(n.period?.from)===0?"全部历史":hn(n.period?.from)} — ${hn(n.period?.to)}（按任务创建时间）`:"统计周期正在读取"}),e.jsx("div",{className:"table-wrap",children:e.jsxs("table",{className:"cost-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["时间","状态 / 类型","项目 / 卡片","能力","执行端","耗时","收费依据","建议收费","内部成本 / 来源"].map(p=>e.jsx("th",{scope:"col",children:p},p))})}),e.jsx("tbody",{id:"job-rows",children:n?c.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:9,children:e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"这个周期内还没有费用记录"}),e.jsx("p",{children:"更换统计周期，或等待任务产生费用记录。"})]})})}):c.map((p,f)=>{const u=Ga(p,n.currency);return e.jsxs("tr",{children:[e.jsxs("td",{children:[hn(p.created_at),e.jsx(Ke,{children:p.job_id||"任务ID未记录"})]}),e.jsxs("td",{className:u.statusClass,children:[u.status,e.jsx(Ke,{children:p.category_name||p.category||"类型未记录"})]}),e.jsxs("td",{className:"origin",children:[p.project_name||"未归属项目",e.jsx(Ke,{children:p.card_name||"未记录卡片"})]}),e.jsx("td",{children:p.capability||"未记录"}),e.jsx("td",{children:p.worker_name||"未分配执行端"}),e.jsx("td",{children:Ua(p.runtime_seconds)}),e.jsx("td",{className:u.basisClass,children:u.basis}),e.jsx("td",{children:u.retail}),e.jsxs("td",{children:[u.internal,e.jsx(Ke,{children:u.source})]})]},`${p.job_id??""}-${f}`)}):e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"loading-note",children:a?"费用明细读取失败，请点击“重试读取”。":"正在读取费用明细…"})})})]})}),e.jsxs("div",{className:"f-pager",children:[e.jsx("span",{id:"page-note",children:n?`显示 ${o.length?r*ye+1:0}–${Math.min((r+1)*ye,o.length)} / 已载入 ${o.length} 条`:"尚未载入"}),e.jsx("button",{type:"button",id:"cost-prev",disabled:!n||r===0,onClick:()=>i(-1),children:"上一页"}),e.jsx("button",{type:"button",id:"cost-next",disabled:!n||r>=l,onClick:()=>i(1),children:"下一页"})]})]})}function Xa({onClose:n}){return e.jsx(ae,{title:"计价与成本口径",onClose:n,children:e.jsxs("div",{className:"f-stack",children:[e.jsx("p",{children:"建议收费区间与中值来自计价规则，不是已收款或实际收入。"}),e.jsx("p",{children:"收费依据支持按次、按段、分段数、输出秒和分辨率；未定价不等于免费。未完成任务不计建议收费，但可能产生内部损耗。"}),e.jsx("p",{children:"内部总成本 = 已知实际 + 已知历史估算；未知成本单列，不按零元处理。失败与取消损耗已包含于总成本，不重复相加。运行中累计成本尚可能变化。"}),e.jsx("p",{children:"统计周期以任务创建时间为准，按服务端全量聚合。费用明细最多读取2000条，每页10条；不能把当前显示明细当完整总额，也不从明细重算概览或费用构成。"}),e.jsx("p",{children:"GPU用量、电费、API token成本、实际与历史估算均沿用服务端口径；未记录的字段显示未知，不由前端推测单价或补算。"})]})})}function Ya(n){const r=qa(n),[t,a]=m.useState(!1),i=r.busy?"正在读取…":r.error?"连接失败 · 快照非实时":r.updatedAt!=null?`最后刷新 ${new Date(r.updatedAt).toLocaleTimeString("zh-CN",{hour12:!1})} · 每15秒刷新`:"正在加载 · 每15秒刷新";return e.jsxs("main",{id:"main",tabIndex:-1,"aria-busy":r.busy?!0:void 0,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"费用统计"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{className:"subtitle",children:"建议收费不是实际收入，未知成本不作零元"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsxs("label",{className:"filter-label",children:["统计周期",e.jsxs("select",{id:"period",value:r.selectedPeriod,onChange:s=>{const o=s.currentTarget.value;Ra(o)&&r.selectPeriod(o)},children:[e.jsx("option",{value:"0",children:"全部记录"}),e.jsx("option",{value:"7",children:"最近7天"}),e.jsx("option",{value:"30",children:"最近30天"}),e.jsx("option",{value:"90",children:"最近90天"})]})]}),e.jsx("span",{className:"muted small",id:"refresh-state",role:"status",children:i}),e.jsxs("button",{type:"button",className:"primary",id:"refresh",disabled:r.busy,onClick:r.refresh,children:[e.jsx(De,{name:"refresh"}),"立即刷新"]})]})]}),e.jsxs("div",{id:"error",className:"f-error",role:"alert",hidden:!r.error,children:[e.jsxs("div",{children:[e.jsx("b",{id:"error-message",children:r.error}),e.jsx("p",{children:"下方保留上次成功读取的周期与快照，不代表当前筛选的新数据；未知值不作零元。"})]}),e.jsx("button",{type:"button",id:"retry",onClick:r.retry,children:"重试读取"})]}),e.jsx(Va,{data:r.data}),e.jsx(Ka,{data:r.data,failed:r.error!=null}),e.jsx(Ja,{data:r.data,page:r.page,loadedPeriod:r.loadedPeriod,failed:r.error!=null,changePage:r.changePage,openBasis:()=>a(!0)}),e.jsxs("section",{className:"card padded notice-box","aria-labelledby":"cost-rules-title",children:[e.jsx("h2",{id:"cost-rules-title",children:"计价与成本口径"}),e.jsx("p",{children:"建议收费区间与中值来自规则，不是已收款或实际收入；未定价不等于免费。未完成任务不计建议收费，但可能产生内部损耗。"}),e.jsx("p",{children:"内部总成本 = 已知实际 + 已知历史估算；未知成本单列，不按零元处理。失败与取消损耗已包含于总成本，不重复相加；运行中累计仍可能变化。"}),e.jsx("p",{children:"统计周期按任务创建时间筛选，合计与构成取服务端全量聚合。明细最多读取2000条并分页展示，当前明细页不代表全部成本。"})]})]}),t&&e.jsx(Xa,{onClose:()=>a(!1)})]})}const P=H().finite().nullable().optional(),G=C().nullable().optional(),Te=kn(C(),W),Nr=R({gpus:F(R({name:G,memory_total_bytes:P}).catchall(W)).optional(),cpu:W.optional(),os:W.optional(),memory_total_bytes:P,host_id:G,environment_id:G,model_version:G,disk:G,note:G}).catchall(W),Qn=R({name:G,role:G,precision:W.optional(),precision_source:G,loader_dtype:W.optional()}).catchall(W),yn=R({source:G,complete:Q().optional(),capability_name:G,models:F(Qn).optional(),auxiliary_models:F(Qn).optional()}).catchall(W),Za=R({source:C(),summary:yn,samples:P,measured:P}).catchall(W),Qa=R({key:G,id:G,kind:G,width:W.optional(),height:W.optional(),duration:P,valid:Q().nullable().optional(),outputs:W.optional(),samples:W.optional()}).catchall(W),es=R({total_samples:P,recorded_samples:P,complete_samples:P,total_outputs:P,recorded_outputs:P,variants:F(W).optional()}).catchall(W),ns=R({dimensions:Te.nullable().optional(),parameters:Te.nullable().optional(),expected:Te.nullable().optional(),model_version:G}).catchall(W),Sr={capability:C(),capability_name:G,worker_id:G,worker_name:G,source:C(),dimensions:Te.nullable().optional(),spec:ns.nullable().optional(),output_resolution:es.nullable().optional(),recovered_outputs:W.optional(),runtime_seconds:P,occupied_seconds:P,warnings:F(C()).optional()},rs=R({...Sr,id:C(),spec_key:G,config_id:G,config:Nr.nullable().optional(),config_source:G,cache_condition:W.optional(),samples:P,done:P,error:P,canceled:P,measured:P,mean_seconds:P,p50_seconds:P,p90_seconds:P,last_sample_at:P,reference_per_hour:P,output_count:P,unit:G,seconds_per_unit:P,qualified_seconds_per_unit:P,eligible:Q().nullable().optional(),reviewed:P,accepted:P,benchmark_id:G,days:le([F(C()),H(),ar()]).optional(),model_summary:yn.nullable().optional(),model_evidence:R({total_samples:P,recorded_samples:P,variants:F(Za).optional()}).catchall(W).nullable().optional(),current_model_reference:yn.nullable().optional()}).catchall(W),ts=R({id:C(),name:G,state:C(),last_seen:P,hardware:Nr.nullable().optional(),hardware_source:G,agent_version:P,supports_capacity_telemetry:Q().optional(),tasks:P,done:P,error:P,canceled:P,runtime_seconds:P}).catchall(W),$r=R({...Sr,job_id:C(),group_id:G,status:C(),created_at:P,attempts:W.optional(),outputs:F(Qa).nullable().optional(),review:R({accepted:P,source:G,benchmark_id:G,note:G}).catchall(W).nullable().optional()}).catchall(W),as=R({period:Te.optional(),overview:kn(C(),H().finite().nullable()).default({}),workers:F(ts).default([]),groups:F(rs).default([]),details:F($r).default([]),details_total:H().int().nonnegative()}).catchall(W),ss=R({details:F($r),details_total:H().int().nonnegative()}),zr=R({to:H().int(),mode:ce("historical"),quality:ce("technical"),availability:ce(1),utilization:ce(.75),worker_id:C().min(1),hours:H().finite().min(.1).max(24),price:H().finite().nonnegative().optional(),demands:F(R({group_id:C().min(1),quantity:H().finite().positive()})).min(1)}),is=R({machines:P,total_seconds:P,daily_capacity_seconds:P,price_total:P,lines:F(R({group_id:C(),quantity:P,seconds_per_unit:P,daily_units:P}).catchall(W)).default([]),warnings:F(C()).default([]),assumptions:W.optional()}).catchall(W),Cr=R({host_id:C().max(160).optional(),cpu:C().max(160).optional(),memory_total_bytes:H().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),environment_id:C().max(160).optional(),model_version:C().max(160).optional(),disk:C().max(160).optional(),note:C().max(500).optional()}).strict(),Er=R({accepted:H().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),source:nn(["business","standard"]),benchmark_id:C().max(100),note:C().max(500)}),os=R({processed:H().int().min(0).max(4),recorded:H().int().nonnegative(),total:H().int().nonnegative(),next_offset:H().int().nonnegative().nullable()}).refine(n=>n.recorded<=n.processed,"补采响应格式无效"),er=kn(C(),tr());class ls{constructor(r){this.http=r}http;path(r,t){return`/api/capacity?${new URLSearchParams({to:String(r.to),limit:"100",offset:String(t)})}`}report(r,t){return this.http.read(this.path(r,t),as,{cache:"no-store"})}evidence(r,t){return this.http.read(this.path(r,t),ss,{cache:"no-store"})}async estimate(r){return is.parse(await this.http.json("/api/capacity/estimate","POST",zr.parse(r)))}async profile(r,t){er.parse(await this.http.json(`/api/capacity/workers/${encodeURIComponent(r)}`,"POST",Cr.parse(t)))}async review(r,t){er.parse(await this.http.json(`/api/capacity/jobs/${encodeURIComponent(r)}/review`,"POST",Er.parse(t)))}async probe(r,t,a){const i=await this.http.json(`/api/capacity/jobs/${encodeURIComponent(r)}/probe-outputs`,"POST",{offset:H().int().nonnegative().parse(t)});a();const s=os.safeParse(i);if(!s.success||s.data.next_offset!==null&&(s.data.next_offset<=t||s.data.next_offset>=s.data.total))throw Error("补采响应格式无效，请刷新看板核对结果");return s.data}}const Ie=n=>!!(n.group||n.status||n.source||n.size!==100);class ds{cache=null;pending=null;clear(){this.cache=null,this.pending=null}async all(r,t,a,i){if(!a())return null;if(this.cache?.snapshot===r)return this.cache.records;if(this.pending?.snapshot===r)return this.pending.promise;const s={snapshot:r,promise:Promise.resolve(null)};s.promise=(async()=>{const o=r.report.details_total,l=[];if(!Number.isSafeInteger(o)||o<0)throw Error("明细总数无效，请刷新后重试。");for(let c=0;c<o;c+=100){if(!a())return null;const d=c===r.offset?r.report:await t.evidence(r.range,c);if(!a())return null;if(d.details_total!==o||d.details.length!==Math.min(100,o-c))throw Error("任务证据在读取期间变化或分页不完整，请刷新后重新筛选。");l.push(...d.details),i(l.length,o)}if(new Set(l.map(c=>c.job_id)).size!==l.length)throw Error("任务证据分页出现重复，请刷新后重试。");return a()?(this.cache={snapshot:r,records:l},l):null})(),this.pending=s;try{return await s.promise}finally{this.pending===s&&(this.pending=null)}}}class cs{constructor(r,t){this.service=r,this.notify=t}service;notify;listeners=new Set;loadVersion=0;estimateVersion=0;evidenceVersion=0;appliedRange=null;appliedOffset=0;alive=!0;repository=new ds;mutations=new Set;value={report:null,snapshot:null,ready:!1,revision:0,refreshState:"正在读取全部历史聚合与本页证据…",error:"",writeStatus:"",tab:"machines",technicalOpen:!1,evidenceOpen:!1,mounted:new Set,filters:{group:"",status:"",source:"",size:100},evidence:{records:[],total:0,start:0,size:100,state:"",busy:!1,failed:!1},estimate:null,estimateNote:"填写每日需求后计算。没有样本的场景不能按零耗时处理。",estimateError:"",estimating:!1};getSnapshot=()=>this.value;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});set(r){this.alive&&(this.value={...this.value,...r},this.listeners.forEach(t=>t()))}start(){this.alive=!0,this.load()}dispose(){this.alive=!1,this.loadVersion++,this.estimateVersion++,this.evidenceVersion++,this.repository.clear()}invalidateEstimate=(r="输入或证据已变更，请重新计算。")=>{this.estimateVersion++,this.set({estimate:null,estimateNote:r,estimateError:"",estimating:!1})};resetSnapshot(){this.repository.clear(),this.evidenceVersion++,this.set({snapshot:null,ready:!1})}clear(){this.resetSnapshot(),this.set({report:null,mounted:new Set,evidence:{records:[],total:0,start:0,size:100,state:"",busy:!1,failed:!1}})}activeMounts(){const r=new Set([this.value.tab]);return this.value.tab==="machines"&&this.value.technicalOpen&&r.add("technical"),this.value.evidenceOpen&&r.add("evidence"),r}async load(r=!0,t){const a=r?{to:Math.floor(Date.now()/1e3)}:this.appliedRange;if(!a)return;const i=++this.loadVersion,s=Object.freeze({...a}),o=r?0:t??this.appliedOffset;this.resetSnapshot(),this.invalidateEstimate("证据正在刷新，旧测算已清除。"),this.set({error:"",refreshState:"正在读取全部历史聚合与本页证据…",evidence:{...this.value.evidence,state:""}});try{const l=await this.service.report(s,o);if(!this.alive||i!==this.loadVersion)return;const c=Object.freeze({report:l,range:s,version:i,offset:o});this.appliedRange=s,this.appliedOffset=o;const d={...this.value.filters};if(l.groups.some(p=>p.id===d.group)||(d.group=""),this.set({report:l,snapshot:c,ready:!0,revision:this.value.revision+1,mounted:this.activeMounts(),filters:d,evidence:{records:l.details,total:l.details_total,start:o,size:100,state:"",busy:!1,failed:!1}}),this.value.evidenceOpen&&Ie(d)&&await this.filterEvidence(0),!this.alive||i!==this.loadVersion)return;this.set({refreshState:`最后刷新：${new Date().toLocaleTimeString("zh-CN",{hour12:!1})}`})}catch(l){if(!this.alive||i!==this.loadVersion)return;this.clear();const c=`读取产能数据失败：${ee(l)}。请点击立即刷新重试。`;this.set({error:c,refreshState:"读取失败"}),this.notify(c)}}activate(r){this.set({tab:r}),this.mount()}technical(r){this.set({technicalOpen:r}),this.mount()}evidenceOpen(r){this.set({evidenceOpen:r}),this.mount()}mount(){if(!this.value.ready)return;const r=this.value.mounted.has("evidence"),t=new Set([...this.value.mounted,...this.activeMounts()]);this.set({mounted:t}),!r&&t.has("evidence")&&Ie(this.value.filters)&&this.filterEvidence(0)}showEvidence(r=""){!this.value.ready||!this.value.snapshot||(this.set({evidenceOpen:!0,filters:{...this.value.filters,group:r,status:"",source:""},mounted:new Set([...this.value.mounted,"evidence"])}),this.filterEvidence(0))}filter(r){this.value.ready&&(this.set({filters:{...this.value.filters,...r}}),this.filterEvidence(0))}current(r){return this.alive&&this.value.ready&&this.value.snapshot===r&&r.version===this.loadVersion&&this.value.report===r.report}async filterEvidence(r){const t=this.value.snapshot;if(!t||!this.current(t)||!this.value.mounted.has("evidence"))return;const a=++this.evidenceVersion,i=this.value.filters;if(!Ie(i)){if(t.offset!==0){await this.load(!1,0);return}this.set({evidence:{records:t.report.details,total:t.report.details_total,start:0,size:100,state:"",busy:!1,failed:!1}});return}this.set({evidence:{records:[],total:0,start:0,size:i.size,state:"正在读取同一截止时间下的真实分页证据，完成后筛选；不会按当前页冒充全部任务。",busy:!0,failed:!1}});try{const s=await this.repository.all(t,this.service,()=>this.current(t),(c,d)=>{this.current(t)&&Ie(this.value.filters)&&this.set({evidence:{...this.value.evidence,state:`正在读取真实分页证据 ${c} / ${d} 条；聚合统计保持不变。`}})});if(!s||!this.current(t)||a!==this.evidenceVersion)return;const o=s.filter(c=>(!i.group||c.group_id===i.group)&&(!i.status||c.status===i.status)&&(!i.source||c.source===i.source)),l=Math.min(r,Math.max(0,Math.ceil(o.length/i.size)-1)*i.size);this.set({evidence:{records:o.slice(l,l+i.size),total:o.length,start:l,size:i.size,state:`筛选 ${o.length} / 全集 ${s.length} 条；只改变明细，聚合统计不受筛选或分页影响。`,busy:!1,failed:!1}})}catch(s){if(!this.current(t)||a!==this.evidenceVersion)return;this.set({evidence:{records:[],total:0,start:0,size:i.size,state:`证据筛选失败：${ee(s)}。请立即刷新后重试。`,busy:!1,failed:!0}})}}page(r){const{ready:t,evidence:a,mounted:i,snapshot:s,filters:o}=this.value;if(!t||!s||!i.has("evidence")||a.busy||a.failed)return;const l=Math.max(0,a.start+r*a.size);r>0&&l>=a.total||(Ie(o)?this.filterEvidence(l):this.load(!1,l))}async estimate(r){if(this.invalidateEstimate("正在计算…"),!this.value.ready||!this.value.snapshot){this.estimateFailure("请先点击立即刷新并成功读取证据。");return}const t=this.estimateVersion,a=this.value.snapshot,i=this.value.revision;this.set({estimating:!0});try{const s=await this.service.estimate(r);if(t!==this.estimateVersion||i!==this.value.revision||!this.current(a))return;const l={...a.report.workers.find(d=>d.id===r.worker_id)?.hardware};delete l.note;const c={result:s,payload:r,groups:a.report.groups.filter(d=>r.demands.some(p=>p.group_id===d.id)),hardware:l};this.set({estimate:c,estimating:!1})}catch(s){t===this.estimateVersion&&this.estimateFailure(`测算失败：${ee(s)}`)}}estimateFailure(r){this.set({estimate:null,estimating:!1,estimateNote:"本次未产生测算结果，请检查证据与输入后重试。",estimateError:r}),this.notify(r)}async mutate(r,t,a){if(this.mutations.has(r))throw Error("正在保存，请勿重复提交。");this.mutations.add(r);const i=this.loadVersion;this.set({writeStatus:""}),this.invalidateEstimate(`${t}正在保存，旧测算已清除。`);try{if(await a(),!this.alive)return;i===this.loadVersion?await this.load(!1):(this.loadVersion++,this.clear(),this.invalidateEstimate("证据已更新，请点击立即刷新后重新计算。"),this.set({refreshState:`${t}已更新，请点击立即刷新`})),this.set({writeStatus:`${t}已保存。人工声明不回写历史快照，也不代表自动验证通过。`})}finally{this.mutations.delete(r)}}saveProfile(r,t){return this.mutate(`profile:${r}`,"机器配置",()=>this.service.profile(r,t))}saveReview(r,t){return this.mutate(`review:${r}`,"人工标记",()=>this.service.review(r,t))}probe(r,t){return this.service.probe(r,t,this.probeWritten)}probeVersion(){return this.loadVersion}probeCurrent(r){return this.alive&&r===this.loadVersion&&this.value.report!==null}probeWritten=()=>{this.resetSnapshot(),this.invalidateEstimate("成品尺寸证据已更新，请刷新看板后重新计算。")}}function ps({http:n,notify:r}){const t=m.useMemo(()=>new cs(new ls(n),r),[n,r]),a=m.useSyncExternalStore(t.subscribe,t.getSnapshot);return m.useEffect(()=>(t.start(),()=>t.dispose()),[t]),{controller:t,state:a}}const ms={historical:"历史运行参考",captured:"采集业务样本",standard:"标准样本（人工标签）"},Mn={idle:"在线空闲",online:"在线",busy:"运行中",running:"运行中",offline:"离线",disabled:"已禁用",syncing:"同步中",unavailable:"执行环境不可用",historical:"历史执行端",error:"异常",done:"已完成",canceled:"已取消",queued:"排队中",assigned:"已分配"},I=n=>typeof n=="number"&&Number.isFinite(n),E=n=>n==null||n===""?"未知":typeof n=="object"?JSON.stringify(n):String(n),$=n=>I(n)?n.toLocaleString("zh-CN",{maximumFractionDigits:2}):"未知",X=n=>I(n)?`${$(n)} 秒`:"未知",Le=n=>I(n)?new Date(n*1e3).toLocaleString("zh-CN",{hour12:!1}):"未知",Re=n=>I(n)?`${$(n/1024**3)} GiB`:"未知",oe=n=>ms[n]||`来源未知（${E(n)}）`,Pn=n=>Array.isArray(n.days)?n.days.length:n.days,Ce=n=>n.capability_name?.trim()?n.capability_name:E(n.capability),Mr=n=>Ce(n)===n.capability?Ce(n):`${Ce(n)}（${n.capability}）`,an=n=>typeof n=="string"&&{reported:"机器上报",manual:"人工声明","manual+reported":"机器上报 + 人工声明",unknown:"未知"}[n]||"未知";function Rn(n){return n&&typeof n=="object"&&!Array.isArray(n)?n:{}}function Ue(n,r){if(!n||typeof n!="object")return E(n);const t=Rn(n);return(r==="cpu"?[t.model,t.architecture,I(t.logical_cores)?`${$(t.logical_cores)} 逻辑核`:null]:[t.name,t.release,t.version]).filter(i=>i!=null&&i!=="").map(E).join(" / ")||"未知"}function Be(n){return n?`GPU ${n.gpus?.length?n.gpus.map(t=>`${E(t.name)} / 单卡 ${Re(t.memory_total_bytes)}`).join("；"):"未知"}；CPU ${Ue(n.cpu,"cpu")}；内存 ${Re(n.memory_total_bytes)}；系统 ${Ue(n.os,"os")}；环境 ${E(n.environment_id)}；模型版本 ${E(n.model_version)}；磁盘 ${E(n.disk)}；主机 ID ${E(n.host_id)}`:"未知"}function us(n){const r=n.hardware,t=(r?.gpus||[]).map(a=>[a.name,I(a.memory_total_bytes)?Re(a.memory_total_bytes):null].filter(Boolean).join(" / ")).filter(Boolean);return I(r?.memory_total_bytes)&&t.push(`系统内存 ${Re(r.memory_total_bytes)}`),t.join("；")||"尚未采集硬件信息"}function hs(n){const r=n.hardware;return!r?.cpu||!r.host_id?I(n.agent_version)&&n.agent_version<4||n.supports_capacity_telemetry===!1?"旧版采集程序缺少 CPU 等信息，请升级该 Worker 后补采；已有 GPU 与内存记录仍可查看。":"CPU 或主机信息尚未采集，请检查该 Worker 的采集上报。":!r.environment_id||!r.model_version?"环境或模型版本的人工声明未填写，可在“详细统计与机器配置”中补录。":"当前配置不代表历史任务的执行配置；历史依据见各业务详情。"}const ue=n=>["idle","busy","online","running"].includes(n.state),Ye=n=>I(n.mean_seconds)&&n.mean_seconds>=0&&I(n.measured)&&n.measured>0;function xs(n){if(!I(n)||n<0)return"暂无成功耗时";if(n<1)return`${$(n)} 秒`;const r=Math.round(n),t=Math.floor(r/60),a=r%60;return t?`${$(t)} 分 ${a} 秒`:`${a} 秒`}function sn(n){const r={...n.spec?.dimensions,...n.dimensions},t=[["图片",r.image_count,"张"],["视频",r.video_count,"段"],["音频",r.audio_count,"段"]],a=i=>I(i)&&Number.isSafeInteger(i)&&i>=0;return t.every(([,i])=>!a(i))?["素材信息未记录"]:t.every(([,i])=>i===0)?["未使用图片、视频或音频"]:t.flatMap(([i,s,o])=>a(s)?s>0?[`${i} ${$(s)} ${o}`]:[]:[`${i}数量未记录`])}function Pr(n,r){const t=s=>I(s)&&Number.isSafeInteger(s)&&s>0,a=typeof n.resolution=="string"?n.resolution.match(/^(\d+)\s*[x×]\s*(\d+)(?:\s*\(\d+:\d+\))?$/i):null,i=[[n.output_width,n.output_height],[n.width,n.height],[a?Number(a[1]):null,a?Number(a[2]):null],[r.width,r.height,"期望 "]];for(const[s,o,l=""]of i)if(t(s)&&t(o)){const d={"640x360":"360p","640x480":"480p","854x480":"480p","1280x720":"720p","1920x1080":"1080p","2560x1440":"1440p","3840x2160":"4K"}[`${Math.max(s,o)}x${Math.min(s,o)}`];return d?`${l}${d}${s<o?" 竖屏":""}（${$(s)} × ${$(o)}）`:`${l||"尺寸 "}${$(s)} × ${$(o)}`}return I(n.megapixels)&&n.megapixels>0&&I(n.megapixels*100)?`约 ${$(n.megapixels*100)} 万像素（尺寸未记录）`:null}function on(n,r=!1){const t={...n.spec?.parameters,...n.spec?.dimensions,...n.dimensions},a=n.spec?.expected||{},i=[],s=t.output_duration??t.duration??a.duration;I(s)&&i.push(`请求时长 ${$(s)} 秒`);const o=Pr(t,a);if(o&&i.push(o),r){I(t.megapixels)&&t.megapixels>0&&i.push(`像素设置 ${$(t.megapixels)} MP`);const l=[["帧率",t.output_fps??t.target_fps??t.fps??t.force_rate??a.fps," FPS"],["步数",t.steps," 步"],["帧数",t.frames," 帧"],["长边",t.scale_to_length," px"],["批量",t.batch_size,""]];for(const[c,d,p]of l)I(d)&&i.push(`${c} ${$(d)}${p}`)}return i.join(" / ")||"规格未完整记录"}function Rr(n){return(n?.variants||[]).flatMap(r=>{const t=Rn(r);return typeof t.kind=="string"&&["image","video"].includes(t.kind)&&I(t.width)&&Number.isSafeInteger(t.width)&&t.width>0&&I(t.height)&&Number.isSafeInteger(t.height)&&t.height>0?[{kind:t.kind,width:t.width,height:t.height,outputs:t.outputs,samples:t.samples}]:[]})}function Ln(n){return`${n.kind==="image"?"图片":"视频"} · ${Pr({width:n.width,height:n.height},{})}`}function fs(n){return I(n.width)&&I(n.height)&&Number.isSafeInteger(n.width)&&Number.isSafeInteger(n.height)&&n.width>0&&n.height>0&&["image","video"].includes(n.kind||"")?Ln({kind:n.kind||"",width:n.width,height:n.height}):"尺寸未记录"}const gs=n=>`${sn(n).join(" + ")}｜${on(n)}`;function bs(n){const r=t=>Ye(t)?t.source!=="historical"&&I(t.last_sample_at)?3:t.source==="historical"?2:1:0;return[...n].sort((t,a)=>r(a)-r(t)||(r(t)===3?(a.last_sample_at||0)-(t.last_sample_at||0):0)||(a.samples||0)-(t.samples||0)||(a.measured||0)-(t.measured||0))[0]}function In(n){const r=[...n.warnings||[]],t=Pn(n);return(!I(n.samples)||n.samples<30||!I(t)||t<3)&&r.push("参考样本不足：建议至少 30 个任务且跨 3 天；达到门槛也不是置信保证。"),n.source==="historical"&&r.push("仅成功任务 runtime 参考，未计完整占机、重试及质量损耗；不是合格日产能。"),n.eligible!==!0&&r.push("完整基线证据不足，不作为已验证采购依据。"),[...new Set(r)]}const Ee=n=>{const r={task:"任务",tasks:"任务",image:"张图片",images:"张图片",video:"条视频",videos:"条视频",second:"视频秒",seconds:"视频秒",video_seconds:"视频秒"};return n.source==="historical"?"任务":r[n.unit||""]||E(n.unit)};function Lr(n){const r=Object.hasOwn(n,"model_evidence"),t=n.model_evidence;return{variants:r?(t?.variants||[]).filter(i=>["task_snapshot","archived_task"].includes(i.source)):n.model_summary?.source==="task_snapshot"?[{source:"task_snapshot",summary:n.model_summary,samples:null,measured:null}]:[],hasEvidence:r,total:t?.total_samples,recorded:t?.recorded_samples,reference:n.current_model_reference?.source==="current_template"?n.current_model_reference:null}}const Ne=n=>n?.models||[];function ys(n,r,t){const i={high_noise:"高噪声",low_noise:"低噪声",高噪声:"高噪声",低噪声:"低噪声",base:"基础模型",refiner:"精修模型",生成主模型:"生成主模型",深度模型:"深度模型",放大模型:"放大模型",插帧模型:"插帧模型"}[n.role||""];return i?`${i} · 主模型 ${r+1}`:t>1?`主模型 ${r+1}`:""}function vn(n){const r=[];if(n.precision&&n.precision_source==="filename"&&r.push(`文件标记 ${E(n.precision)}`),n.loader_dtype){const t=E(n.loader_dtype),a=t.split(/\s*\/\s*/).map(s=>s.match(/^(bfloat16|bf16|float(?:8|16|32|64)|fp(?:8|16|32|64))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]),i=a.every(Boolean)?[...new Set(a.map(s=>s?.toUpperCase().replace("BFLOAT16","BF16").replace("FLOAT","FP")))].join(" / "):null;r.push(`加载配置 ${i?`${i}（${t}）`:t}${["default","auto"].includes(t.toLowerCase())?"（实际精度未确认）":""}`)}else n.precision&&n.precision_source==="loader"&&r.push(`加载配置 ${E(n.precision)}`);return r.length||r.push("精度未记录 / 待确认"),r}function vs(n){const r=s=>{if(typeof s!="string")return null;const o=s.split(/\s*\/\s*/).map(l=>l.trim().match(/^(bfloat16|float(?:8|16|32|64)|bf16|fp(?:4|8|16|32|64)|int(?:4|8|16)|nf4|q[2-8]_(?:k(?:_[sml])?|[01]))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]);return o.every(Boolean)?[...new Set(o.map(l=>l?.toUpperCase().replace("BFLOAT16","BF16").replace("FLOAT","FP")))].sort().join(" / "):null},t=n.precision_source==="filename"?r(n.precision):null,a=r(n.loader_dtype)||(n.precision_source==="loader"?r(n.precision):null),i=vn(n).filter(s=>s.startsWith("文件标记 ")?!!t:s.startsWith("加载配置 ")?!!a||["default","auto"].includes(String(n.loader_dtype).toLowerCase()):!1);return i.some(s=>s.startsWith("文件标记 "))||i.unshift("文件标记未记录 / 待确认"),i.some(s=>s.startsWith("加载配置 "))||i.push("加载配置未记录 / 待确认"),i}function Ir(n){return JSON.stringify([n.capability,n.spec_key||`unknown:${n.id}`,n.source,n.spec?.model_version||null,n.config?.model_version||null,n.config?.environment_id||null,n.source==="standard"?n.benchmark_id||`unknown:${n.id}`:null,n.cache_condition||null])}function js(n){const r=new Map,t={none:"无节点结果缓存",loaders:"加载节点缓存",execution:"执行节点缓存",unknown:"未知",mixed:"混合条件"};for(const a of n){const i=Rn(a.cache_condition).kind;r.set(Ir(a),`${Mr(a)} / ${E(a.spec_key)} / ${oe(a.source)} / 模型 ${E(a.spec?.model_version||a.config?.model_version)} / 环境 ${E(a.config?.environment_id)} / 缓存 ${typeof i=="string"&&t[i]||"未知"}${a.source==="standard"?` / 基准 ${E(a.benchmark_id)}`:""}`)}return[...r]}function An(n,r,t,a=[]){return`${r||t.find(i=>i.id===n)?.name||a.find(i=>i.worker_id===n)?.worker_name||"未关联执行端"}（${n||"Worker ID 未知"}）`}function ws(n){return n.review?.source==="standard"?"标准样本（人工声明）":n.review?.source==="business"?"业务样本":"未标记"}function Ar({title:n,children:r,className:t}){const[a,i]=m.useState(!1);return e.jsxs("details",{className:t,onToggle:s=>{s.currentTarget.open&&i(!0)},children:[e.jsx("summary",{children:n}),a&&(typeof r=="function"?r():r)]})}function Ze({title:n,value:r,className:t}){return e.jsx(Ar,{title:n,className:t,children:()=>e.jsx("pre",{children:E(r)})})}function ln({values:n=[],className:r="warn"}){return e.jsx("ul",{className:r,children:n.map((t,a)=>e.jsx("li",{children:t},a))})}function jn({items:n}){return n.map(([r,t])=>e.jsxs("div",{className:"metric",children:[e.jsx("span",{children:r}),e.jsx("strong",{children:$(t)})]},r))}function Tn({headers:n,children:r}){return e.jsx("div",{className:"scroll",tabIndex:0,role:"region","aria-label":n.join(" / "),children:e.jsxs("table",{children:[e.jsx("thead",{children:e.jsx("tr",{children:n.map(t=>e.jsx("th",{scope:"col",children:t},t))})}),e.jsx("tbody",{children:r})]})})}function Tr({resolution:n}){const r=Rr(n);return e.jsxs(e.Fragment,{children:[r.length?e.jsxs(e.Fragment,{children:[new Set(r.map(t=>`${t.width}x${t.height}`)).size>1&&e.jsx("span",{className:"hint",children:"多种成品规格（非单一尺寸）"}),r.map((t,a)=>e.jsx("span",{className:"resolution-variant",children:Ln(t)},a))]}):e.jsx("span",{children:"尺寸未记录"}),I(n?.total_samples)&&n.total_samples>0&&n.complete_samples!==n.total_samples&&e.jsxs("span",{className:"resolution-coverage hint",children:["已知 ",$(n.recorded_samples)," / ",$(n.total_samples)," ","次任务的部分或全部成品"]})]})}function Dr({resolution:n}){return e.jsxs("div",{className:"output-resolution-details",children:[e.jsx("h3",{children:"实际成品"}),e.jsx("div",{className:"actual-resolution",children:e.jsx(Tr,{resolution:n})}),e.jsxs("p",{children:["尺寸覆盖：",$(n?.recorded_samples)," / ",$(n?.total_samples)," ","次已完成任务至少有一个成品尺寸；",$(n?.complete_samples)," /"," ",$(n?.total_samples)," 次已完成任务的全部最终产物都有尺寸。"]}),e.jsxs("p",{children:["已知尺寸产物 ",$(n?.recorded_outputs)," / ",$(n?.total_outputs)," 个",n?.total_outputs==null?"（最终清单不完整，产物总数未知）":"","。"]}),Rr(n).map((r,t)=>e.jsxs("p",{children:[Ln(r),"：",$(r.outputs)," 个产物 / ",$(r.samples)," 次任务"]},t)),e.jsx("p",{className:"hint",children:"同一任务可能包含多种尺寸，各尺寸的任务数不能相加。尺寸来自最终产物记录或受控补采，与技术合格产量、人工验收和采购资格分离；有尺寸不代表技术合格。平均耗时仍为原组成功任务平均，不按尺寸重算。"})]})}function nr({summary:n,origin:r}){const t=Ne(n);return e.jsxs("div",{className:"model-reference",children:[e.jsx("p",{className:"model-origin",children:r}),n.complete===!1&&e.jsx("p",{className:"warn",children:"不完整 / 未确认完整主模型链；动态选择或未知链路不能推断全部主模型。"}),!t.length&&e.jsx("p",{children:"未获取到模型信息，模型待确认。"}),t.map((a,i)=>e.jsx("p",{children:`${ys(a,i,t.length)||"主模型"}：${E(a.name)}；角色：${E(a.role)}；${vn(a).join("；")}；非运行时检测`},i)),!!n.auxiliary_models?.length&&e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"hint",children:"辅助模型（不计入主模型名称或精度）"}),n.auxiliary_models?.map((a,i)=>e.jsx("p",{className:"hint",children:`角色：${E(a.role)}；${E(a.name)}；${vn(a).join("；")}`},i))]})]})}function Fr({g:n}){const r={...n.spec?.dimensions,...n.dimensions},t=Lr(n);return e.jsxs("div",{className:"pad",children:[e.jsxs("p",{children:["输入素材：",sn(n).join(" / ")]}),e.jsxs("p",{children:["生成参数：",on(n,!0)]}),I(r.source_duration)&&e.jsxs("p",{className:"hint",children:["首个输入视频时长：",$(r.source_duration)," 秒（非多段视频合计）"]}),e.jsx("p",{className:"hint",children:"素材数量按任务输入槽位计，同一文件被多次引用也会分别计数；生成参数不是成品实测规格。"}),e.jsxs("p",{children:["来源：",oe(n.source),"；有效耗时样本 ",$(n.measured)," / 总样本 ",$(n.samples),"；成功"," ",$(n.done)," / 失败 ",$(n.error)," / 取消 ",$(n.canceled)]}),e.jsxs("p",{children:["mean：",X(n.mean_seconds),"；P50：",X(n.p50_seconds),"；P90：",X(n.p90_seconds),"；最近成功样本：",Le(n.last_sample_at)]}),e.jsx("p",{className:"hint",children:"平均值仅使用该组成功任务执行耗时；不包含排队，不等于纯 GPU 计算时间，也不是合格日产能。"}),e.jsxs("p",{children:["执行时配置：",Be(n.config),"（",an(n.config_source),"）"]}),e.jsxs("p",{children:["缓存条件：",E(n.cache_condition)]}),e.jsxs("p",{children:["成功 runtime 合计：",X(n.runtime_seconds),"；占机合计：",X(n.occupied_seconds),"；实际产出：",$(n.output_count)," ",Ee(n),"。"]}),e.jsxs("p",{children:["单位技术交付：",X(n.seconds_per_unit)," / ",Ee(n),"；单位人工合格：",X(n.qualified_seconds_per_unit)," / ",Ee(n),"；已人工验收：",$(n.reviewed),"；全组人工合格数量：",$(n.accepted),"。"]}),e.jsxs("p",{className:"hint",children:["技术基线资格：",n.eligible===!0?"服务端判定具备完整基线证据":n.eligible===!1?"证据不足，不作为已验证采购依据":"未记录","；标准场景编号：",E(n.benchmark_id),"。"]}),e.jsx(Dr,{resolution:n.output_resolution}),t.hasEvidence&&e.jsxs("p",{children:["模型记录覆盖 ",$(t.recorded)," / ",$(t.total)," ","次；覆盖数不是完整主模型链的确认。"]}),t.variants.length>1&&e.jsx("p",{className:"warn",children:"不同任务记录对应不同模型组合；每个组合内的主模型才属于同一个图。全组平均耗时不代表任一组合的专属速度。"}),!t.variants.length&&e.jsx("p",{children:"历史未记录可用主模型证据；不能用当前模板补写历史模型与精度。"}),t.variants.map((a,i)=>e.jsx(nr,{summary:a.summary,origin:`历史任务记录组合 ${i+1} · ${a.source==="archived_task"?"保留的原任务记录":"任务提交记录"}${t.hasEvidence?` · ${$(a.samples)} 次记录 / ${$(a.measured)} 次成功耗时`:""}`},i)),t.reference?e.jsxs(e.Fragment,{children:[e.jsx(nr,{summary:t.reference,origin:`当前工具默认配置（非历史执行记录）· ${E(t.reference.capability_name)}`}),e.jsx("p",{className:"warn hint",children:"仅为工具模板默认值，不代表用户画布节点当前选中的模型。历史耗时不代表当前模型速度；参考信息不补齐历史覆盖，也不覆盖历史精度。"})]}):!t.variants.length&&e.jsx("p",{className:"hint",children:"未获取到模型信息：当前工具模板未提供、找不到或无法识别。"}),e.jsx(ln,{values:In(n)}),e.jsxs("p",{className:"hint",children:["采样日期：",E(n.days),"；配置编号：",E(n.config_id),"；采样编号：",n.id]}),e.jsx(Ze,{title:"原始规格与证据",value:{dimensions:n.dimensions,spec:n.spec,output_resolution:n.output_resolution,recovered_outputs:n.recovered_outputs,model_summary:n.model_summary,model_evidence:n.model_evidence,current_model_reference:n.current_model_reference,cache_condition:n.cache_condition}})]})}function Or({groups:n,report:r}){return n.length?e.jsx(Tn,{headers:["业务 / 执行端 / 来源","精确业务规格","样本覆盖","成功任务耗时分布","运行参考 / 产出口径","警告与限制"],children:n.map(t=>e.jsxs("tr",{"data-group-id":t.id,children:[e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsx("strong",{children:Ce(t)}),e.jsxs("p",{className:"hint",children:["能力 ID：",t.capability]}),e.jsx("p",{className:"hint",children:An(t.worker_id,t.worker_name,r.workers,r.groups)}),e.jsx("span",{className:"badge",children:oe(t.source)}),e.jsxs("p",{className:"hint",children:["配置：",E(t.config_id)]}),t.source==="standard"&&e.jsxs("p",{className:"hint",children:["标准场景编号：",E(t.benchmark_id)]})]})}),e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsxs("p",{children:["规格键：",E(t.spec_key)]}),e.jsxs("p",{className:"hint",children:["已知规格：",E(t.dimensions)]}),e.jsx(Ar,{title:"配置 / 规格 / 日期证据",children:()=>e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["执行时配置：",Be(t.config)]}),e.jsxs("p",{children:["配置来源：",an(t.config_source)]}),e.jsxs("p",{children:["采样日期（服务端记录）：",E(t.days)]}),e.jsxs("p",{children:["缓存条件：",E(t.cache_condition)]}),e.jsx("pre",{children:E(t.spec)})]})})]})}),e.jsx("td",{children:e.jsxs("div",{children:[e.jsxs("p",{children:["样本 ",$(t.samples)," / ",$(Pn(t))," 天"]}),e.jsxs("p",{children:["完成 ",$(t.done)," / 失败 ",$(t.error)," / 取消 ",$(t.canceled)]}),e.jsxs("p",{className:"hint",children:["有效耗时样本 ",$(t.measured),"；已人工验收 ",$(t.reviewed)]})]})}),e.jsx("td",{children:e.jsxs("div",{children:[e.jsxs("p",{children:["平均 ",X(t.mean_seconds)]}),e.jsxs("p",{children:["P50 ",X(t.p50_seconds)]}),e.jsxs("p",{children:["P90 ",X(t.p90_seconds)]})]})}),e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsxs("p",{children:["成功任务 runtime 合计 ",X(t.runtime_seconds)]}),e.jsxs("p",{children:["成功任务 / 运行小时（仅 runtime 参考）：",$(t.reference_per_hour)]}),t.source!=="historical"&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["占机合计 ",X(t.occupied_seconds)]}),e.jsxs("p",{children:["实际产出 ",$(t.output_count)," ",Ee(t)]}),e.jsxs("p",{children:["单位技术交付 ",X(t.seconds_per_unit)," / ",Ee(t)]}),e.jsxs("p",{children:["单位人工合格 ",X(t.qualified_seconds_per_unit)," / ",Ee(t)]})]})]})}),e.jsx("td",{className:"wide",children:e.jsx(ln,{values:In(t)})})]},t.id))}):e.jsx("p",{className:"empty",children:"暂无业务规格样本；未测试场景不能推算产能。"})}function _s({items:n}){return e.jsx("dl",{children:n.map(([r,t])=>e.jsxs(m.Fragment,{children:[e.jsx("dt",{children:r}),e.jsx("dd",{children:t})]},r))})}function ks({entries:n,worker:r,title:t,ready:a,onEvidence:i}){const[s,o]=m.useState(()=>bs(n)?.id||""),[l,c]=m.useState(!1),[d,p]=m.useState(!1),f=`summary-evidence-${m.useId().replace(/[^a-zA-Z0-9_-]/g,"")}`,u=n.find(N=>N.id===s)||n[0];if(!u)return null;const y=Lr(u),k=y.variants.length?y.variants.map(N=>N.summary):y.reference?[y.reference]:[],w=k.reduce((N,A)=>N+Math.max(1,Ne(A).length),0)||1,v=n.map(gs),x=new Map;for(const N of v)x.set(N,(x.get(N)||0)+1);const h=y.variants.length?y.variants.length>1||y.hasEvidence&&I(y.recorded)&&I(y.total)&&y.recorded<y.total||y.variants.some(N=>N.summary.complete===!1)?"全组历史任务平均，非某个模型或组合专属速度。":"":y.reference?"此处耗时来自历史任务，不代表当前模型速度。":"",g={"--model-rows":w+1};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"business-row","data-capability":u.capability,"data-selected-group-id":u.id,children:[e.jsxs("div",{className:"matrix-field","data-label":"平均生成时间",children:[e.jsx("span",{className:Ye(u)?"mean-time":"muted",children:Ye(u)?xs(u.mean_seconds):"暂无成功耗时"}),h&&e.jsx("p",{className:"warn hint",children:h}),Ye(u)&&I(u.mean_seconds)&&(u.mean_seconds<1||u.mean_seconds>3600)&&e.jsx("p",{className:"warn hint",children:"耗时异常，请核对详情"})]}),e.jsxs("div",{className:"matrix-samples","data-label":"样本与详情",children:[e.jsxs("p",{className:!I(u.measured)||u.measured<30?"warn hint":"hint",children:[I(u.measured)?u.measured<30?`仅 ${$(u.measured)} 次 / 仅供参考`:`${$(u.measured)} 次成功实测`:"样本数未记录"," ","· ",oe(u.source)]}),e.jsx("button",{type:"button",className:"summary-detail-toggle","aria-expanded":l,"aria-controls":f,onClick:()=>{c(!l),l||p(!0)},children:l?"收起详情":"查看详情"})]}),e.jsxs("div",{className:"matrix-field","data-label":"任务规格",children:[e.jsx("select",{className:"summary-spec",disabled:!a,"aria-label":`${r.name||"机器"} ${t}任务规格`,title:`原组 ${u.id} / 配置 ${E(u.config_id)} / ${oe(u.source)} / 规格键 ${E(u.spec_key)}`,value:u.id,onChange:N=>{a&&(o(N.target.value),p(l))},children:n.map((N,A)=>e.jsx("option",{value:N.id,children:`${v[A]}${(x.get(v[A]||"")||0)>1?` · ${oe(N.source)} · ${I(N.last_sample_at)?Le(N.last_sample_at):"日期未记录"} · 采样 ${A+1}`:""}`},N.id))}),e.jsxs("dl",{className:"selected-spec",children:[e.jsx("dt",{children:"输入素材"}),e.jsx("dd",{className:"input-materials",children:sn(u).map(N=>e.jsx("span",{children:N},N))}),e.jsx("dt",{children:"生成参数"}),e.jsx("dd",{className:"generation-parameters",children:on(u)}),e.jsx("dt",{children:"实际成品"}),e.jsx("dd",{className:"actual-resolution",children:e.jsx(Tr,{resolution:u.output_resolution})})]})]}),e.jsxs("div",{className:"matrix-models",style:g,children:[e.jsx("div",{className:"matrix-field","data-label":"模型名称",children:k.length?k.map((N,A)=>e.jsx("div",{className:"model-variant",children:Ne(N).length?Ne(N).map((O,j)=>e.jsx("div",{className:"model-item",children:e.jsx("p",{className:"model-name",children:O.name||"未获取到模型信息"})},j)):e.jsx("p",{className:"muted",children:"未获取到模型信息"})},A)):e.jsx("span",{className:"muted",children:"未获取到模型信息"})}),e.jsx("div",{className:"matrix-field","data-label":"模型精度",children:k.length?k.map((N,A)=>e.jsx("div",{className:"model-variant",children:Ne(N).length?Ne(N).map((O,j)=>e.jsx("div",{className:"model-item",children:vs(O).map(_=>e.jsx("p",{className:"model-label",children:_},_))},j)):e.jsx("p",{className:"muted",children:"无"})},A)):e.jsx("p",{className:"muted",children:"无"})})]})]}),e.jsx("div",{className:"summary-evidence",id:f,hidden:!l,children:d&&e.jsxs(e.Fragment,{children:[e.jsx(Fr,{g:u},u.id),e.jsx("button",{type:"button","data-evidence-entry":"",disabled:!a,onClick:()=>{a&&i(u.id)},children:"任务证据"})]})})]})}function Ns({report:n,ready:r,includeOffline:t,onProfile:a,onEvidence:i}){const s=n.workers.filter(d=>t||ue(d));if(!s.length)return e.jsx("p",{className:"empty",children:t?"暂无机器记录。":"当前没有在线机器，可勾选“包含离线”查看已登记记录。"});const o=new Set(s.map(d=>d.id)),l=new Map;for(const d of n.groups)if(d.worker_id&&o.has(d.worker_id)){let p=l.get(d.capability);p||(p={title:Ce(d),machines:new Map},l.set(d.capability,p)),p.machines.set(d.worker_id,[...p.machines.get(d.worker_id)||[],d])}l.size||l.set("",{title:"历史记录",machines:new Map});const c={"--machine-count":s.length};return e.jsx("div",{className:"scroll comparison-scroll",tabIndex:0,role:"region","aria-label":"机器产能对比表，可横向滚动",children:e.jsxs("table",{className:"simple-table matrix-table","aria-label":"机器与业务能力对比",style:c,children:[e.jsxs("colgroup",{children:[e.jsx("col",{className:"matrix-axis-col"}),s.map(d=>e.jsx("col",{},d.id))]}),e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"business-axis",scope:"col",children:"业务能力"}),s.map((d,p)=>e.jsxs("th",{className:"machine-heading",scope:"col",id:`summary-machine-${p+1}`,"data-summary-worker-id":d.id,children:[e.jsx("h3",{children:d.name||"未命名机器"}),e.jsx("span",{className:["busy","running"].includes(d.state)?"warn":ue(d)?"online-state":"muted",children:Mn[d.state]||"状态待确认"}),e.jsx("p",{className:"machine-hardware",children:us(d)}),e.jsxs("details",{className:"machine-more",children:[e.jsx("summary",{children:"机器详情"}),e.jsx("p",{children:hs(d)}),e.jsxs("p",{className:"hint",children:["最后上报：",Le(d.last_seen),"；Worker ID：",d.id,"；采集程序版本：",E(d.agent_version)]}),!ue(d)&&e.jsx("p",{className:"hint",children:"此记录当前不可用，配置为最后上报信息，历史速度不代表现在能执行。"}),e.jsx("button",{type:"button",onClick:()=>a(d),children:"查看配置"})]})]},d.id))]})}),e.jsx("tbody",{children:[...l].map(([d,{title:p,machines:f}],u)=>e.jsxs("tr",{className:"capability-row","data-capability":d||void 0,children:[e.jsx("th",{className:"business-axis",scope:"row",id:`summary-business-${u+1}`,children:e.jsx("span",{className:"business-title",children:p})}),s.map((y,k)=>{const w=f.get(y.id);return e.jsx("td",{className:"machine-result","data-summary-worker-id":y.id,headers:`summary-machine-${k+1} summary-business-${u+1}`,children:w?e.jsx(ks,{entries:w,worker:y,title:p,ready:r,onEvidence:i}):e.jsx("p",{className:"matrix-empty",children:"暂无记录；不据此推断是否支持该业务。"})},y.id)})]},d))})]})})}function Ss({report:n,mounted:r,onProfile:t}){const a=n?.overview||{};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"summary",children:[e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"生成任务"}),e.jsx("span",{className:"hint",children:"不是产物数量"})]}),e.jsx("div",{id:"task-metrics",className:"metrics pad",children:r&&e.jsx(jn,{items:[["总任务",a.tasks],["完成",a.done],["失败",a.error],["取消",a.canceled]]})}),e.jsx("p",{id:"coverage",className:"hint pad",children:r&&`历史 ${$(a.historical_tasks)} / 新采集 ${$(a.captured_tasks)}；Worker 未关联 ${$(a.unknown_worker)}；已排除 API ${$(a.excluded_api)}。`})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"实际产物"}),e.jsx("span",{className:"hint",children:"仅已知输出，不从请求推断"})]}),e.jsx("div",{id:"output-metrics",className:"metrics pad",children:r&&e.jsx(jn,{items:[["图片（张）",a.output_images],["视频（条）",a.output_videos],["视频总时长（秒）",a.output_seconds],["产物未知记录",a.unknown_outputs]]})}),e.jsx("p",{className:"hint pad",children:"图片、视频、时长分别统计；未知不记为零，也不计为人工合格。"})]})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"机器配置与状态"}),e.jsx("span",{className:"hint",children:"按 Worker ID 区分，名称相同不合并"})]}),e.jsx("p",{className:"notice hint",children:"配置为当前或最后上报信息，不代表历史执行快照，也不是最低采购配置。系统可见内存不是标称容量，多卡显存不相加。"}),e.jsx("div",{id:"workers",className:"worker-grid",children:r&&n&&(n.workers.length?n.workers.map(i=>{const s=i.hardware,o=["offline","disabled"].includes(i.state)||!I(i.last_seen)||Date.now()/1e3-i.last_seen>120;return e.jsxs("article",{className:"worker","data-worker-id":i.id,children:[e.jsx("h3",{children:E(i.name)}),e.jsxs("p",{className:"hint",children:["Worker ID：",i.id]}),e.jsx("span",{className:"badge",children:Mn[i.state]||i.state}),e.jsxs("p",{className:o?"warn":"hint",children:["最后心跳：",Le(i.last_seen),o?"；状态 / 配置快照已过期或无法确认，请勿视为实时。":""]}),e.jsx(_s,{items:[["GPU",s?.gpus?.length?s.gpus.map((l,c)=>`GPU ${c+1}：${E(l.name)} / 单卡显存 ${Re(l.memory_total_bytes)}`).join(`
`):"未知"],["GPU 数量",s?.gpus?.length?$(s.gpus.length):"未知"],["CPU",Ue(s?.cpu,"cpu")],["内存",Re(s?.memory_total_bytes)],["系统",Ue(s?.os,"os")],["环境",E(s?.environment_id)],["模型版本",E(s?.model_version)],["主机 ID",E(s?.host_id)],["磁盘",E(s?.disk)],["配置备注",E(s?.note)]]}),e.jsxs("p",{className:"hint",children:["配置来源：",an(i.hardware_source),"。人工补录不回写历史快照。"]}),e.jsxs("p",{children:["任务 ",$(i.tasks)," / 完成 ",$(i.done)," / 失败 ",$(i.error)," / 取消"," ",$(i.canceled)]}),e.jsxs("p",{className:"hint",children:["累计 runtime：",X(i.runtime_seconds)]}),i.id&&i.state!=="historical"?e.jsxs("details",{className:"profile-details",children:[e.jsx("summary",{children:"补录机器配置（人工声明）"}),e.jsx("p",{className:"hint",children:"7 个字段仅保存非空新声明，不回写历史快照。"}),e.jsx("button",{type:"button",onClick:()=>t(i),children:"查看 / 补录配置"})]}):e.jsx("p",{className:"hint",children:"历史执行端未关联现存注册记录，不能补录配置。"})]},i.id)}):e.jsx("p",{className:"empty",children:"暂无执行端信息；无法关联的历史任务不会按名称猜测机器。"}))})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"业务规格分组"}),e.jsx("span",{className:"hint",children:"原始统计保留失败、取消与异常记录"})]}),e.jsx("div",{id:"machine-groups",children:r&&n&&e.jsx(Or,{groups:n.groups,report:n})})]})]})}const $s={mode:"historical",quality:"technical",availability:1,utilization:.75},fe=[{id:"zimage_t2i",type:"生图模式",label:"文生图",capabilities:["zimage_t2i","krea2_t2i","qwen_image_2512_t2i","qwen_image_21_t2i"]},{id:"zimage_i2i",type:"生图模式",label:"图生图",capabilities:["zimage_i2i","krea2_i2i","qwen_image_edit_2511_i2i","qwen_image_21_multi","qwen_image_21_i2i"]},{id:"flux2_klein_storyboard9",type:"生图模式",label:"多宫格故事分镜",capabilities:["flux2_klein_storyboard9"]},{id:"flux2_klein_edit",type:"生图模式",label:"参考图编辑(保人物)",capabilities:["flux2_klein_edit"]},{id:"minimax_h3_character_transfer",type:"生视频模式",label:"H3人物迁移",capabilities:["minimax_h3_character_transfer"]},{id:"minimax_h3_flf2v",type:"生视频模式",label:"H3 图生视频",capabilities:["minimax_h3_i2v","minimax_h3_flf2v"]},{id:"minimax_h3_talk2",type:"生视频模式",label:"H3 说话唱歌",capabilities:["minimax_h3_talk1","minimax_h3_talk2"]},{id:"minimax_h3_ref4",type:"生视频模式",label:"H3图片参考",capabilities:["minimax_h3_ref4"]},{id:"minimax_h3_comic20",type:"生视频模式",label:"漫剧4宫格",capabilities:["minimax_h3_comic20"]},{id:"minimax_h3_fusion_v2",type:"生视频模式",label:"H3无损融合单采V2",capabilities:["minimax_h3_fusion_v2"]},{id:"minimax_h3_ref9",type:"生视频模式",label:"H3全能参考",capabilities:["minimax_h3_ref9"]},{id:"minimax_h3_ref_2pass",type:"生视频模式",label:"H3全能参考(高质量)",capabilities:["minimax_h3_ref_2pass"]}],wn=n=>fe.find(r=>n!==void 0&&r.capabilities.includes(n)),zs=n=>JSON.stringify(n.source==="standard"?[n.config_id||null,n.source,n.benchmark_id||`unknown:${n.id}`]:[n.config_id||null,n.source]),Cs=n=>I(n.mean_seconds)&&n.mean_seconds>0&&I(n.measured)&&n.measured>0;function dn(n,r){return n.workers.some(t=>t.id===r&&ue(t))?n.groups.filter(t=>t.worker_id===r&&["historical","captured","standard"].includes(t.source)&&wn(t.capability)&&Cs(t)):[]}const qr=(n,r)=>n<r?-1:n>r?1:0;function Es(n,r){return(r.measured||0)-(n.measured||0)||(r.samples||0)-(n.samples||0)||(r.last_sample_at||0)-(n.last_sample_at||0)||(r.mean_seconds||0)-(n.mean_seconds||0)||qr(n.id,r.id)}function Ms(n,r){const t=new Map;for(const s of r){const o=zs(s);t.set(o,[...t.get(o)||[],s])}const a=[];for(const[s,o]of t){const l=[];for(const c of n){const d=fe.find(f=>f.id===c.mode_id),p=o.filter(f=>d?.capabilities.includes(f.capability)).sort(Es)[0];p&&l.push(p)}l.length===n.length&&a.push({key:s,groups:l,measured:l.reduce((c,d)=>c+(d.measured||0),0)})}a.sort((s,o)=>o.measured-s.measured||qr(s.key,o.key));const i=a[0];if(!i)throw Error("所选模式没有同一电脑、同一配置和来源的共同实测记录，请减少模式或换一台电脑");return i.groups}function Ps(n,r,t,a,i,s){if(!n.workers.some(d=>d.id===t&&ue(d)))throw Error("所选电脑当前不在线，请刷新后重新选择。");const o=dn(n,t),l=new Set;for(const d of s){const p=fe.find(f=>f.id===d.mode_id);if(!p||!o.some(f=>p.capabilities.includes(f.capability)))throw Error("所选模式没有成功耗时记录，请换一个模式或电脑。");if(l.has(d.mode_id))throw Error("同一模式请合并每日需求，不能重复选择。");if(l.add(d.mode_id),!I(Number(d.quantity))||Number(d.quantity)<=0)throw Error("每日需求必须是大于零的有限任务数量。")}if(!s.length)throw Error("请至少添加一个有样本的业务模式。");const c=Ms(s,o);return zr.parse({...r,...$s,worker_id:t,hours:Number(a),...i!==""?{price:Number(i)}:{},demands:s.map((d,p)=>{const f=c[p];if(!f)throw Error("原组证据缺失");return{group_id:f.id,quantity:Number(d.quantity)}})})}const Ur=[{key:"host_id",label:"主机 ID",maxLength:160},{key:"cpu",label:"CPU 型号",maxLength:160},{key:"memory_total_bytes",label:"系统可见内存（GiB）"},{key:"environment_id",label:"执行环境版本",maxLength:160},{key:"model_version",label:"模型版本",maxLength:160},{key:"disk",label:"磁盘配置说明",maxLength:160},{key:"note",label:"配置备注",maxLength:500}];function _n(n,r){if(Array.from(n).some(t=>t.charCodeAt(0)<32||t.charCodeAt(0)===127))throw Error(r)}function Rs(n,r){const t={};for(const{key:a}of Ur){const i=(n[a]||"").trim();if(i)if(_n(i,"配置字段请使用不含控制字符的单行文本。"),a==="memory_total_bytes"){const s=Math.round(Number(i)*1073741824);if(!Number.isSafeInteger(s)||s<=0)throw Error("内存必须是能转换为安全正整数字节的 GiB 数值。");s!==r?.[a]&&(t[a]=s)}else i!==(a==="cpu"?Ue(r?.cpu,"cpu"):r?.[a])&&(t[a]=i)}if(!Object.keys(t).length)throw Error("没有需要保存的修改；留空不会删除已有配置。");return Cr.parse(t)}function Ls(n){const r=n.accepted===""?null:Number(n.accepted);if(r!==null&&(!Number.isSafeInteger(r)||r<0))throw Error("请输入非负整数，或留空表示未验收。");const t=(n.benchmark_id||"").trim(),a=(n.note||"").trim();if(n.source==="standard"&&!t)throw Error("标准样本需要填写标准场景编号；标签不代表自动验证。");return _n(a,"验收备注和标准场景编号请使用单行文本，不含换行或控制字符。"),_n(t,"验收备注和标准场景编号请使用单行文本，不含换行或控制字符。"),Er.parse({accepted:r,source:n.source,benchmark_id:t,note:a})}function Is(n){let r=n==null?"":typeof n=="object"?JSON.stringify(n):String(n);return/^[\s]*[=+\-@]/.test(r)&&(r="'"+r),'"'+r.replace(/"/g,'""')+'"'}function As(n){return"\uFEFF"+[["类别","内容"],["测算口径","历史任务运行参考，不是合格日产能"],["输入与时间范围",n.payload],["当前机器配置（非历史快照）",n.hardware],["测算结果",n.result],...n.groups.map(t=>["场景证据",{...t,warnings:In(t)}])].map(t=>t.map(Is).join(",")).join(`\r
`)}function Ts({worker:n,controller:r,onClose:t}){const[a,i]=m.useState({});return e.jsx(ae,{title:n.state==="historical"?"历史执行端配置":`机器配置与人工补录 · ${n.name||n.id}`,className:"capacity-page",onClose:t,submitLabel:n.state==="historical"?"关闭":"保存人工配置",onSubmit:n.state==="historical"?async()=>{}:async()=>{const s=Rs(a,n.hardware);try{await r.saveProfile(n.id,s)}catch(o){throw Error(`保存失败：${ee(o)}。输入已保留，请检查字段后重试。`)}},children:n.state==="historical"?e.jsx("p",{children:Be(n.hardware)}):e.jsxs("div",{className:"capacity-operation",children:[e.jsxs("details",{children:[e.jsx("summary",{children:"当前 / 最后上报配置"}),e.jsx("p",{children:Be(n.hardware)}),e.jsxs("p",{children:["配置来源：",an(n.hardware_source),"；配置备注：",E(n.hardware?.note)]})]}),e.jsx("p",{className:"notice",children:"仅保存本次修改的非空字段；留空保留原值。内存以 GiB 输入、按字节保存，不是采购标称容量。新声明仅向后生效，不回写历史快照。"}),e.jsx("p",{className:"hint",children:"主机 ID 仅在人工确认属于同一物理机器时填写相同值，不按机器名称合并；同机多个 Worker 不自动代表多倍产能。"}),e.jsx("div",{className:"profile-form",children:Ur.map(({key:s,label:o,maxLength:l})=>e.jsxs("label",{className:"field",children:[e.jsx("span",{children:o}),e.jsx("input",{name:s,type:s==="memory_total_bytes"?"number":"text",min:s==="memory_total_bytes"?"0.000001":void 0,step:s==="memory_total_bytes"?"any":void 0,maxLength:l,placeholder:["model_version","environment_id"].includes(s)?"填写固定版本，勿用 latest / main / unknown":"留空保留现值",value:a[s]||"",onChange:c=>{i({...a,[s]:c.target.value}),r.invalidateEstimate("机器配置输入已更改；请保存后重新计算，未保存内容不会进入测算。")}})]},s))})]})})}function Ds({detail:n,controller:r,onClose:t}){const[a,i]=m.useState({accepted:I(n.review?.accepted)?String(n.review.accepted):"",source:n.review?.source==="standard"?"standard":"business",benchmark_id:n.review?.benchmark_id||"",note:n.review?.note||""}),s=(o,l)=>{i({...a,[o]:l}),r.invalidateEstimate("人工验收输入已变更；未保存内容不会进入测算。")};return e.jsx(ae,{title:`人工验收 · ${n.job_id}`,className:"capacity-page",onClose:t,submitLabel:"保存人工标记",onSubmit:async()=>{const o=Ls(a);try{await r.saveReview(n.job_id,o)}catch(l){throw Error(`保存失败：${ee(l)}`)}},children:e.jsxs("div",{className:"review-form",children:[e.jsxs("p",{children:["任务 ",n.job_id,"；原采集来源：",oe(n.source),"。"]}),e.jsxs("div",{className:"review-fields",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"人工合格产物数量（留空为未验收）"}),e.jsx("input",{name:"accepted",type:"number",min:"0",step:"1",value:a.accepted,onChange:o=>s("accepted",o.target.value)})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"人工样本标签"}),e.jsxs("select",{name:"source",value:a.source,onChange:o=>s("source",o.target.value),children:[e.jsx("option",{value:"business",children:"业务样本"}),e.jsx("option",{value:"standard",children:"标准样本（人工声明）"})]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"标准场景编号（标准样本请填写）"}),e.jsx("input",{name:"benchmark_id",maxLength:100,value:a.benchmark_id,onChange:o=>s("benchmark_id",o.target.value)})]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"验收备注 / 固定条件说明"}),e.jsx("textarea",{name:"note",rows:2,maxLength:500,value:a.note,onChange:o=>s("note",o.target.value)})]}),e.jsx("p",{className:"notice",children:"此操作只保存人工声明，不会自动确认技术规格、缓存条件或标准测试通过；不会将历史记录补写为完整采集证据。"})]})})}function Fs({confirmation:n,onClose:r}){return e.jsx(ae,{title:`确认受控补采 · ${n.detail.job_id}`,className:"capacity-page",onClose:r,submitLabel:"确认本批补采",onSubmit:n.submit,children:e.jsxs("div",{className:"capacity-operation",children:[e.jsxs("p",{className:"notice",children:["任务 ",n.detail.job_id,"；本批偏移 ",n.offset,"，最多处理 4 个可信最终产物。"]}),e.jsx("p",{children:"补采仅添加成品尺寸证据，不修改技术资格、原生成参数、人工合格量或标准标签。最终清单由服务端核验；不会扫描目录，也不会从请求猜测尺寸。"}),e.jsxs("details",{children:[e.jsx("summary",{children:"本页已记录的最终产物（最终以服务端可信清单为准）"}),e.jsx("pre",{children:E(n.detail.outputs)})]})]})})}function Os({detail:n,controller:r,onConfirm:t}){const[a,i]=m.useState(0),[s,o]=m.useState(""),[l,c]=m.useState(!1),d=m.useRef(!0),p=m.useRef(!1),f=m.useRef(0);m.useEffect(()=>(d.current=!0,()=>{d.current=!1}),[]);const u=async(y,k)=>{if(!d.current||!r.probeCurrent(k)||f.current!==y)throw Error("证据页面或批次已变化，请关闭后重新打开。");if(p.current)throw Error("正在补采，请勿重复提交。");p.current=!0,c(!0),o("正在补采本批成品尺寸…"),r.invalidateEstimate("成品尺寸正在补采，旧测算已清除。");try{const w=await r.probe(n.job_id,y);if(!d.current)return;f.current=w.next_offset,i(w.next_offset),o(`本批处理 ${$(w.processed)} 个，成功记录尺寸 ${$(w.recorded)} 个；可信最终产物共 ${$(w.total)} 个。${w.next_offset===null?"补采已完成，刷新看板查看结果。":"尚有后续产物，请点击继续补采；刷新看板查看结果。"}`)}catch(w){const v=`补采失败：${ee(w)}${w instanceof Wr&&w.status===409?"。没有可信最终产物记录，不能猜测成品尺寸。":""}`;throw d.current&&o(v),Error(v)}finally{p.current=!1,d.current&&c(!1)}};return e.jsxs("div",{className:"output-probe",children:[e.jsx("p",{className:"hint",children:"仅按可信最终产物清单补采，每次最多 4 个；不会从输入素材或请求参数猜测尺寸。"}),e.jsx("button",{type:"button",disabled:l||a===null,onClick:()=>{if(p.current||a===null||!d.current)return;const y=a,k=r.probeVersion();t({detail:n,offset:y,submit:()=>u(y,k)})},children:a===null?"补采已完成":a>0?"继续补采成品尺寸":"补采成品尺寸"}),e.jsx("p",{className:"hint",role:"status",children:s})]})}function qs({detail:n,report:r,controller:t,onReview:a,onProbe:i}){const[s,o]=m.useState(!1);return e.jsxs("details",{className:"evidence","data-job-id":n.job_id,onToggle:l=>{l.currentTarget.open&&o(!0)},children:[e.jsxs("summary",{children:[e.jsx("strong",{children:n.job_id}),e.jsx("span",{className:"badge",children:oe(n.source)}),e.jsx("span",{children:` ${Mn[n.status]||n.status} / ${n.capability} / ${An(n.worker_id,n.worker_name,r.workers,r.groups)} / ${Le(n.created_at)}`})]}),e.jsx("div",{className:"evidence-content",children:s&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["任务 runtime：",X(n.runtime_seconds),"；占机：",X(n.occupied_seconds),"；原分组：",E(n.group_id)]}),e.jsx(ln,{values:n.warnings}),e.jsx("div",{className:"f-grid3",children:[["输入素材",sn(n).join(" / ")],["生成参数",on(n,!0)],["技术与人工口径","技术资格以原采集证据及服务端校验为准；尺寸补采与人工标签不修改它。"]].map(([l,c])=>e.jsxs("div",{children:[e.jsx("h3",{children:l}),e.jsx("p",{children:c})]},l))}),e.jsx(Ze,{title:"执行尝试（包含重试）",value:n.attempts}),e.jsx("h3",{children:"实际输出证据"}),n.outputs?.length?e.jsx(Tn,{headers:["产物标识","类型","实际尺寸","视频时长","技术记录"],children:n.outputs.map((l,c)=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("span",{children:l.key||l.id||"未记录"})}),e.jsx("td",{children:e.jsx("span",{children:E(l.kind)})}),e.jsx("td",{children:e.jsx("span",{children:fs(l)})}),e.jsx("td",{children:e.jsx("span",{children:X(l.duration)})}),e.jsx("td",{children:e.jsx("span",{children:l.valid===!0?"采集记录标记有效":l.valid===!1?"未通过 / 待确认":"未记录"})})]},c))}):e.jsx("p",{className:"notice",children:"最终产物清单未记录；不能按请求猜测，也不按零产物处理。"}),e.jsx(Ze,{title:"实际输出原始证据",value:n.outputs}),e.jsxs("p",{children:["人工合格数量：",$(n.review?.accepted),"；样本标签：",ws(n),"；标准场景编号：",E(n.review?.benchmark_id),"；备注：",E(n.review?.note)]}),e.jsx(Dr,{resolution:n.output_resolution}),e.jsx(Ze,{title:"成品尺寸原始证据",className:"output-resolution-raw",value:{output_resolution:n.output_resolution,recovered_outputs:n.recovered_outputs}}),n.status==="done"&&e.jsx(Os,{detail:n,controller:t,onConfirm:i}),["captured","standard"].includes(n.source)?e.jsx("button",{className:"review-open",type:"button",onClick:()=>a(n),children:"人工验收 / 样本标签"}):e.jsx("p",{className:"hint",children:"历史任务不能补写为完整采集证据，不提供采集验收表单。"})]})})]})}function Us({controller:n,onReview:r,onProbe:t}){const a=n.getSnapshot(),{report:i,evidence:s,filters:o,ready:l}=a,c=a.mounted.has("evidence")&&i!==null,d=!l||s.busy||s.failed||!c;return e.jsxs("section",{"aria-labelledby":"evidence-heading",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{id:"evidence-heading",children:"任务证据与人工标记"}),e.jsx("span",{id:"detail-count",className:"hint",children:c&&(s.failed?"筛选未完成":s.busy?"":`当前 ${s.records.length} / 总计 ${$(s.total)} 条；聚合不受分页截断`)})]}),e.jsx("p",{className:"hint pad",children:"明细每页最多 100 条。人工验收 / 标准样本是人工声明，不等于系统自动验证通过；历史记录不可补写为完整采集证据。"}),e.jsx("div",{id:"evidence-filters",children:c&&e.jsxs("div",{className:"evidence-filters",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"独立原分组（按真实 group_id）"}),e.jsxs("select",{id:"evidence-group",disabled:!l,value:o.group,onChange:p=>n.filter({group:p.target.value}),children:[e.jsx("option",{value:"",children:"全部原分组"}),i.groups.map(p=>e.jsx("option",{value:p.id,children:`${Ce(p)} / ${An(p.worker_id,p.worker_name,i.workers,i.groups)} / ${oe(p.source)} / ${p.config_id||"配置未知"} / ${p.id}`},p.id))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"任务状态"}),e.jsxs("select",{id:"evidence-status",disabled:!l,value:o.status,onChange:p=>n.filter({status:p.target.value}),children:[e.jsx("option",{value:"",children:"全部状态"}),[["done","已完成"],["error","失败"],["canceled","已取消"],["queued","排队中"],["running","运行中"]].map(([p,f])=>e.jsx("option",{value:p,children:f},p))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"采集来源"}),e.jsxs("select",{id:"evidence-source",disabled:!l,value:o.source,onChange:p=>n.filter({source:p.target.value}),children:[e.jsx("option",{value:"",children:"全部来源"}),["historical","captured","standard"].map(p=>e.jsx("option",{value:p,children:oe(p)},p))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"每页最多 100 条"}),e.jsx("select",{id:"evidence-size",disabled:!l,value:o.size,onChange:p=>n.filter({size:Number(p.target.value)}),children:[100,50,25,10].map(p=>e.jsxs("option",{value:p,children:[p," 条 / 页"]},p))})]})]})}),e.jsx("p",{id:"evidence-state",className:"hint pad",role:"status",hidden:!s.state,children:s.state}),e.jsx("div",{id:"details",children:c&&!s.busy&&!s.failed&&(s.records.length?s.records.map(p=>e.jsx(qs,{detail:p,report:i,controller:n,onReview:r,onProbe:t},p.job_id)):e.jsx("p",{className:"empty",children:"当前页没有任务证据。可立即刷新，或返回上一页。"}))}),e.jsxs("div",{className:"pager",children:[e.jsx("button",{id:"previous",disabled:d||s.start===0,onClick:()=>n.page(-1),children:"上一页"}),e.jsx("span",{id:"page-note",className:"hint",children:c&&!s.busy&&!s.failed&&`第 ${Math.floor(s.start/s.size)+1} 页`}),e.jsx("button",{id:"next",disabled:d||s.start+s.size>=s.total,onClick:()=>n.page(1),children:"下一页"})]})]})}function Bs(n,r){const t=n.workers.filter(ue);return t.find(a=>a.id===r)?.id||t.find(a=>dn(n,a.id).length)?.id||t[0]?.id||""}function rr(n,r,t){const a=dn(n,r);return{id:t,mode_id:fe.find(i=>a.some(s=>i.capabilities.includes(s.capability)))?.id||"",quantity:""}}function Ws(n,r,t){const[a,i]=m.useState({report:null,worker:"",demands:[],next:1}),[s,o]=m.useState("8"),[l,c]=m.useState("");if(t&&r&&r!==a.report){const x=Bs(r,a.worker);i({report:r,worker:x,demands:[rr(r,x,a.next)],next:a.next+1})}const d=r?dn(r,a.worker):[],p=()=>n.invalidateEstimate(),f=x=>{r&&(i({...a,worker:x,demands:[rr(r,x,a.next)],next:a.next+1}),p())},u=(x,h)=>{i({...a,demands:a.demands.map(g=>g.id===x?{...g,...h}:g)}),p()},y=x=>{i({...a,demands:a.demands.filter(h=>h.id!==x)}),p()},k=x=>{const h=fe.find(g=>g.id===x);return!!(h&&d.some(g=>h.capabilities.includes(g.capability)))};return{inputs:a,groups:d,hours:s,price:l,worker:f,update:u,remove:y,available:k,add:()=>{if(!n.getSnapshot().ready)return;const x=fe.find(h=>!a.demands.some(g=>g.mode_id===h.id)&&k(h.id));x&&(i({...a,demands:[...a.demands,{id:a.next,mode_id:x.id,quantity:""}],next:a.next+1}),p())},submit:async()=>{n.invalidateEstimate("正在计算…");const x=n.getSnapshot().snapshot;try{if(!r||!n.getSnapshot().ready||!x)throw Error("请先点击立即刷新并成功读取证据。");await n.estimate(Ps(r,x.range,a.worker,s,l,a.demands))}catch(h){n.estimateFailure(ee(h))}},setHours:x=>{o(x),p()},setPrice:x=>{c(x),p()}}}function Hs(n){const[r,t]=m.useState("");return m.useEffect(()=>{if(!n)return;const a=URL.createObjectURL(new Blob([As(n)],{type:"text/csv;charset=utf-8"}));return t(a),()=>URL.revokeObjectURL(a)},[n]),n?r:""}function Gs({saved:n,report:r}){const{result:t,payload:a,groups:i}=n;return e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"warn",children:"成功任务处理参考，不是合格产物日产量或采购承诺"}),e.jsxs("p",{className:"result-number",children:["参考机器数：",$(t.machines)," 台"]}),e.jsxs("p",{children:["每日所需参考运行时间：",X(t.total_seconds)]}),e.jsxs("p",{children:["单机每日可用容量时间：",X(t.daily_capacity_seconds)]}),e.jsxs("p",{children:["整机采购小计：",I(t.price_total)?`¥${$(t.price_total)}`:"未计价"]}),e.jsx(Tn,{headers:["业务模式","每日需求","平均任务耗时","单机场景参考日处理量"],children:t.lines.map((s,o)=>{const l=wn(i.find(c=>c.id===s.group_id)?.capability);return e.jsxs("tr",{children:[e.jsx("td",{className:"wide",children:e.jsx("span",{children:l?`${l.type} · ${l.label}`:"业务模式"})}),e.jsx("td",{children:e.jsxs("span",{children:[$(s.quantity)," 任务/天"]})}),e.jsx("td",{children:e.jsx("span",{children:X(s.seconds_per_unit)})}),e.jsx("td",{children:e.jsxs("span",{children:[$(s.daily_units)," 任务/天"]})})]},o)})}),e.jsx("p",{className:"hint",children:"每个模式只参考自动选中的一个实测分组，不保证任意模型、尺寸或缓存规格的产能。"}),e.jsxs("details",{children:[e.jsx("summary",{children:"计算依据"}),e.jsx("h3",{children:"警告与覆盖限制"}),e.jsx(ln,{values:t.warnings}),e.jsx("p",{className:"hint",children:"仅按成功任务平均 runtime 估算；不含完整失败、准备、重试或质量损耗。按同一电脑、配置和来源选择具体原分组，不合并均值。"}),e.jsx("p",{className:"hint",children:"台数 = 向上取整〔各模式任务数量 × 平均任务耗时之和 ÷（小时 × 3600 × 可用时间比例 × 生产容量比例）〕。容量预留不是 GPU 利用率；业务组合与模型切换可能增加损耗，不保证峰值 SLA。"}),a.demands.map(s=>{const o=i.find(l=>l.id===s.group_id);return o&&e.jsxs("div",{children:[e.jsx("h3",{children:wn(o.capability)?.label||"业务模式"}),e.jsxs("p",{children:[Mr(o)," / ",E(o.spec_key),"：",oe(o.source),"；样本"," ",$(o.samples),"；",$(Pn(o))," 天；配置 ",E(o.config_id),o.source==="standard"?`；标准场景编号 ${E(o.benchmark_id)}`:""]}),e.jsx(Fr,{g:o})]},o.id)}),e.jsx("h3",{children:"计算假设"}),e.jsx("pre",{children:E(t.assumptions)}),e.jsxs("p",{className:"hint",children:["Worker ID：",a.worker_id,"；当前在线仅为本次数据快照，不承诺未来状态；当前配置仅作清单参考：",Be(r.workers.find(s=>s.id===a.worker_id)?.hardware),"；时间：全部历史 至 ",Le(a.to),"；",a.hours," 小时 / 可用"," ",$(a.availability*100),"% / 生产容量 ",$(a.utilization*100),"%"]})]})]})}function Vs({controller:n}){const r=n.getSnapshot(),{report:t,ready:a,estimate:i,estimateError:s,estimateNote:o,estimating:l}=r,c=r.mounted.has("purchase")&&t!==null,d=Ws(n,t,c),{inputs:p,groups:f}=d,u=m.useRef(null),y=Hs(i),k=t?.workers.filter(ue)||[],w=!a||!f.length||!p.demands.length||l,v=a?k.some(x=>x.id===p.worker)?f.length?"":"这台电脑暂无这些模式的成功耗时记录，请换一台电脑。":"当前没有在线电脑，请稍后刷新。":"请先刷新并读取电脑状态。";return e.jsxs("div",{className:"procurement",children:[e.jsxs("section",{className:"section",children:[e.jsx("div",{className:"section-head",children:e.jsx("h2",{children:"每日多场景需求"})}),e.jsxs("form",{id:"estimate-form",className:"pad",onSubmit:x=>{x.preventDefault(),x.currentTarget.reportValidity()&&d.submit()},children:[e.jsxs("div",{className:"form-grid",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"电脑显卡配置选择"}),e.jsx("select",{id:"estimate-worker",required:!0,disabled:!a,value:p.worker,onChange:x=>{a&&d.worker(x.target.value)},children:c&&(k.length?k.map(x=>e.jsx("option",{value:x.id,children:x.name||"未命名电脑"},x.id)):e.jsx("option",{value:"",children:"暂无在线电脑"}))})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"每日计划生产小时"}),e.jsx("input",{id:"hours",type:"number",min:"0.1",max:"24",step:"0.1",value:d.hours,required:!0,onChange:x=>d.setHours(x.target.value)})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"整机报价（元，可选）"}),e.jsx("input",{id:"price",type:"number",min:"0",step:"0.01",placeholder:"未填写则不计价格",value:d.price,onChange:x=>d.setPrice(x.target.value)})]})]}),e.jsx("p",{id:"mode-note",className:"notice",children:"按成功任务平均执行耗时参考，不是合格产物日产量或采购承诺。"}),e.jsx("p",{className:"hint",children:"固定按 100% 可用时间、75% 生产容量计算（预留 25% 应对波动）；每日数量按任务/天填写。"}),e.jsxs("div",{children:[e.jsx("h3",{children:"每日需求"}),e.jsx("p",{id:"demand-note",className:"hint",role:"status",children:c&&v}),e.jsx("div",{id:"demands",children:c&&p.demands.map(x=>e.jsxs("div",{className:"demand",children:[e.jsx("select",{className:"demand-group",required:!0,"aria-label":"需求业务模式",disabled:!a||!x.mode_id,value:x.mode_id,onChange:h=>{a&&d.update(x.id,{mode_id:h.target.value})},children:["生图模式","生视频模式"].map(h=>e.jsx("optgroup",{label:h,children:fe.filter(g=>g.type===h).map(g=>e.jsxs("option",{value:g.id,disabled:!d.available(g.id)||p.demands.some(N=>N.id!==x.id&&N.mode_id===g.id),children:[g.type," · ",g.label]},g.id))},h))}),e.jsx("input",{className:"demand-quantity",type:"number",min:"0.01",step:"any",required:!0,placeholder:"任务/天","aria-label":"每日需求数量（任务/天）",disabled:!a||!x.mode_id,value:x.quantity,onChange:h=>d.update(x.id,{quantity:h.target.value})}),e.jsx("button",{type:"button",onClick:()=>d.remove(x.id),children:"移除"})]},x.id))}),e.jsx("button",{id:"add-demand",type:"button",disabled:!c||!a||!fe.some(x=>!p.demands.some(h=>h.mode_id===x.id)&&d.available(x.id)),onClick:d.add,children:"增加场景"})]}),e.jsx("button",{id:"estimate-submit",className:"primary",type:"submit",disabled:!c||w,children:"计算机器需求"})]})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"测算结果与依据"}),e.jsx("button",{id:"export-estimate",disabled:!i||!y,onClick:()=>{n.getSnapshot().estimate&&u.current?.click()},children:"导出测算 CSV"}),e.jsx("a",{ref:u,hidden:!0,href:y||void 0,download:"capacity-estimate.csv",children:"下载测算 CSV"})]}),e.jsx("div",{id:"estimate-error",className:"error",role:"alert",hidden:!s,children:s}),e.jsx("div",{id:"estimate-result",className:"pad","aria-live":"polite",children:i&&t?e.jsx(Gs,{saved:i,report:t}):e.jsx("p",{className:"muted",children:o})})]})]})}const ke=[{id:"machines",label:"机器产能"},{id:"scenarios",label:"场景对比"},{id:"purchase",label:"采购测算"}];function Ks(n){const{controller:r,state:t}=ps(n),{report:a,ready:i,revision:s,mounted:o}=t,[l,c]=m.useState(!1),[d,p]=m.useState(""),[f,u]=m.useState(null),[y,k]=m.useState(null),[w,v]=m.useState(null),x=m.useRef(null),h=m.useRef(null),g=m.useRef([]),[N,A]=m.useState(!1);m.useEffect(()=>{N&&t.tab==="purchase"&&(h.current?.focus(),A(!1))},[N,t.tab]);const O=(b="")=>{r.getSnapshot().ready&&(r.showEvidence(b),x.current?.scrollIntoView({block:"start"}))},j=o.has("scenarios")&&a?js(a.groups):[],_=j.some(([b])=>b===d)?d:j[0]?.[0]||"";a&&o.has("scenarios")&&d!==_&&p(_);const M=a?.overview||{};return e.jsxs("main",{id:"main-content",className:"page capacity-page",tabIndex:-1,children:[e.jsxs("header",{className:"page-header card",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"产能评估"}),e.jsx("p",{className:"subtitle",children:"真实任务与独立规格分组，查看机器产能、证据和每日需求。"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{id:"refresh-state",className:"state",role:"status",children:t.refreshState})})]}),e.jsx("div",{className:"header-actions",children:e.jsx("button",{id:"refresh",type:"button",onClick:()=>{r.load()},children:"立即刷新"})})]}),e.jsx("div",{id:"error",className:"error",role:"alert",hidden:!t.error,children:t.error}),e.jsx("div",{id:"write-status",className:"write-status",role:"status",hidden:!t.writeStatus,children:t.writeStatus}),e.jsx("div",{className:"tabs",role:"tablist","aria-label":"产能评估视图",children:ke.map((b,L)=>e.jsx("button",{id:`tab-${b.id}`,role:"tab",type:"button",ref:T=>{g.current[L]=T},"aria-selected":t.tab===b.id,"aria-controls":`panel-${b.id}`,tabIndex:t.tab===b.id?0:-1,onClick:()=>r.activate(b.id),onKeyDown:T=>{const z=T.key==="ArrowRight"?(L+1)%ke.length:T.key==="ArrowLeft"?(L+ke.length-1)%ke.length:T.key==="Home"?0:T.key==="End"?ke.length-1:void 0;if(z===void 0)return;const S=ke[z];S&&(T.preventDefault(),r.activate(S.id),g.current[z]?.focus())},children:b.label},b.id))}),e.jsx("div",{id:"capacity-stats",className:"metrics","aria-label":"产能数据概览",children:a&&e.jsx(jn,{items:[["当前在线电脑",a.workers.filter(ue).length],["真实任务记录",M.tasks],["独立原规格组",a.groups.length],["产物清单未知任务",M.unknown_outputs]]})}),e.jsxs("section",{id:"panel-machines",role:"tabpanel","aria-labelledby":"tab-machines",tabIndex:0,hidden:t.tab!=="machines",children:[e.jsxs("section",{id:"machine-summary","aria-label":"在线机器业务简览",children:[e.jsxs("div",{className:"summary-toolbar",children:[e.jsx("h2",{id:"online-count",children:a?`当前在线 ${a.workers.filter(ue).length} 台`:"当前在线 — 台"}),e.jsxs("label",{className:"offline-toggle",children:[e.jsx("input",{id:"include-offline",type:"checkbox",checked:l,disabled:!i,onChange:b=>{i&&c(b.target.checked)}}),"包含离线"]})]}),e.jsx("p",{className:"summary-note hint",children:"在线状态是当前状态；业务为全部历史记录中跑过的业务，不代表当前均可执行。平均生成时间仅计成功任务执行耗时，不含排队，非纯 GPU 耗时，也不是合格日产能。同一业务的任务规格、模型或采样条件不同，不能直接按耗时做性能排名。"}),e.jsx("div",{id:"summary-machines",children:o.has("machines")&&a&&e.jsx(Ns,{report:a,ready:i,includeOffline:l,onProfile:u,onEvidence:O},`${s}-${l}`)}),e.jsxs("div",{className:"matrix-actions",children:[e.jsx("button",{type:"button",id:"open-purchase",onClick:()=>{r.activate("purchase"),A(!0)},children:"进入多模式采购测算"}),e.jsx("button",{type:"button",id:"open-evidence",disabled:!i,onClick:()=>O(),children:"展开全部任务证据"})]})]}),e.jsxs("details",{id:"technical-details",className:"section advanced",open:t.technicalOpen,onToggle:b=>r.technical(b.currentTarget.open),children:[e.jsx("summary",{children:"详细统计与机器配置"}),e.jsx(Ss,{report:a,mounted:o.has("technical"),onProfile:u},s)]})]}),e.jsx("section",{id:"panel-scenarios",role:"tabpanel","aria-labelledby":"tab-scenarios",tabIndex:0,hidden:t.tab!=="scenarios",children:e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"同场景证据对比"}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"业务 / 精确规格 / 来源"}),e.jsx("select",{id:"scenario-filter",disabled:!i,value:_,onChange:b=>{i&&p(b.target.value)},children:o.has("scenarios")&&(j.length?j.map(([b,L])=>e.jsx("option",{value:b,children:L},b)):e.jsx("option",{value:"",children:"暂无场景"}))})]})]}),e.jsx("p",{className:"notice hint",children:"只并列相同业务、规格键与证据来源。历史配置、模型版本或缓存条件缺失时，不视为受控跑分；未测试的配置不能按显存或价格推算。"}),e.jsx("div",{id:"scenario-groups",children:o.has("scenarios")&&a&&e.jsx(Or,{groups:a.groups.filter(b=>Ir(b)===_),report:a},`${s}-${_}`)})]})}),e.jsx("section",{id:"panel-purchase",ref:h,role:"tabpanel","aria-labelledby":"tab-purchase",tabIndex:0,hidden:t.tab!=="purchase",children:e.jsx(Vs,{controller:r})}),e.jsxs("details",{id:"task-evidence",ref:x,className:"section advanced",open:t.evidenceOpen,onToggle:b=>r.evidenceOpen(b.currentTarget.open),children:[e.jsx("summary",{children:"任务证据与人工标记"}),e.jsx(Us,{controller:r,onReview:k,onProbe:v},s)]}),f&&e.jsx(Ts,{worker:f,controller:r,onClose:()=>u(null)},f.id),y&&e.jsx(Ds,{detail:y,controller:r,onClose:()=>k(null)},y.job_id),w&&e.jsx(Fs,{confirmation:w,onClose:()=>v(null)})]})}const Js=`:root {\r
  color-scheme: dark;\r
  --bg: #0b0d10;\r
  --panel: #111318;\r
  --surface: #16191f;\r
  --hover: #1b2028;\r
  --text: #f3f4f6;\r
  --muted: #a0a6b1;\r
  --line: #303640;\r
  --soft-line: #252a33;\r
  --blue: #38bdf8;\r
  --red: #fb7185;\r
  --radius: 14px;\r
  --gap: 20px;\r
  --pad: clamp(24px, 1.3vw, 36px);\r
  font-family:\r
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;\r
  font-size: 16px;\r
  font-synthesis: none;\r
}\r
* {\r
  box-sizing: border-box;\r
}\r
body {\r
  margin: 0;\r
  background: var(--bg);\r
  color: var(--text);\r
  line-height: 1.5;\r
}\r
button,\r
input,\r
select {\r
  font: inherit;\r
}\r
button,\r
a,\r
input,\r
select {\r
  -webkit-tap-highlight-color: transparent;\r
}\r
button,\r
select,\r
input {\r
  color: var(--text);\r
}\r
button,\r
select {\r
  cursor: pointer;\r
}\r
button {\r
  display: inline-flex;\r
  align-items: center;\r
  justify-content: center;\r
  gap: 9px;\r
  min-height: 40px;\r
  padding: 8px 15px;\r
  border: 1px solid #39414d;\r
  border-radius: 8px;\r
  background: #1a1f27;\r
  white-space: nowrap;\r
  line-height: 1.3;\r
}\r
button:hover {\r
  background: #252c36;\r
  border-color: #596372;\r
}\r
button:active {\r
  transform: translateY(1px);\r
}\r
button:disabled {\r
  cursor: not-allowed;\r
  opacity: 0.5;\r
}\r
a {\r
  color: var(--blue);\r
  text-decoration: none;\r
}\r
a:hover {\r
  text-decoration: underline;\r
}\r
button:focus-visible,\r
a:focus-visible,\r
input:focus-visible,\r
select:focus-visible,\r
summary:focus-visible {\r
  outline: 2px solid var(--blue);\r
  outline-offset: 4px;\r
}\r
input,\r
select {\r
  min-height: 42px;\r
  border: 1px solid #39414d;\r
  border-radius: 8px;\r
  background: var(--surface);\r
  padding: 8px 12px;\r
  max-width: 100%;\r
  min-width: 0;\r
}\r
input::placeholder {\r
  color: var(--muted);\r
}\r
input[type='checkbox'] {\r
  accent-color: var(--blue);\r
  min-height: 18px;\r
  width: 18px;\r
  height: 18px;\r
  cursor: pointer;\r
}\r
input[type='number'] {\r
  width: 100%;\r
}\r
input:disabled {\r
  opacity: 0.65;\r
}\r
h1,\r
h2,\r
h3,\r
p {\r
  margin: 0;\r
}\r
h1 {\r
  font-size: 30px;\r
  line-height: 1.25;\r
  letter-spacing: -0.025em;\r
  font-weight: 650;\r
}\r
h2 {\r
  font-size: 21px;\r
  font-weight: 620;\r
  line-height: 1.4;\r
}\r
h3 {\r
  font-size: 17px;\r
  font-weight: 600;\r
}\r
small,\r
.small {\r
  font-size: 13px;\r
}\r
.muted {\r
  color: var(--muted);\r
}\r
.danger {\r
  color: var(--red) !important;\r
}\r
.number {\r
  font-variant-numeric: tabular-nums;\r
}\r
.icon {\r
  width: 23px;\r
  height: 23px;\r
  flex-shrink: 0;\r
  fill: none;\r
  stroke: currentColor;\r
  stroke-width: 1.7;\r
  stroke-linecap: round;\r
  stroke-linejoin: round;\r
}\r
.icon-defs {\r
  position: absolute;\r
  width: 0;\r
  height: 0;\r
  overflow: hidden;\r
}\r
.skip-link {\r
  position: fixed;\r
  top: -80px;\r
  left: 20px;\r
  z-index: 1001;\r
  background: var(--text);\r
  color: var(--bg);\r
  padding: 12px;\r
}\r
.skip-link:focus {\r
  top: 12px;\r
}\r
main {\r
  margin: 0;\r
  padding: var(--pad);\r
  min-height: 100dvh;\r
  min-width: 0;\r
  outline: none;\r
}\r
.page {\r
  display: grid;\r
  gap: var(--gap);\r
  animation: none;\r
}\r
.card {\r
  background: var(--panel);\r
  border: 1px solid var(--line);\r
  border-radius: var(--radius);\r
  box-shadow:\r
    inset 0 1px 0 #ffffff04,\r
    0 3px 8px #00000010;\r
  min-width: 0;\r
  overflow: hidden;\r
}\r
.padded {\r
  padding: 24px;\r
}\r
.page-header {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  gap: 20px;\r
  padding: 23px 25px;\r
  min-height: 110px;\r
}\r
.page-header .subtitle {\r
  color: #b5bbc5;\r
  margin-top: 0;\r
  font-size: 14px;\r
}\r
.header-actions {\r
  display: flex;\r
  align-items: center;\r
  justify-content: flex-end;\r
  flex-wrap: wrap;\r
  gap: 12px;\r
}\r
.sample-badge {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 7px;\r
  color: var(--muted);\r
  font-size: 12px;\r
  padding: 4px 9px;\r
  border: 1px solid #343a45;\r
  border-radius: 5px;\r
  white-space: nowrap;\r
}\r
.page-caption {\r
  display: flex;\r
  align-items: center;\r
  flex-wrap: wrap;\r
  gap: 12px;\r
  margin-top: 10px;\r
}\r
.primary {\r
  background: #edf0f5;\r
  color: #15181d;\r
  border-color: #e5e9ef;\r
  font-weight: 600;\r
}\r
.primary:hover {\r
  background: #fff;\r
  border-color: #fff;\r
}\r
.primary .icon {\r
  color: #15181d;\r
}\r
.ghost {\r
  border-color: transparent;\r
  background: transparent;\r
}\r
.ghost:hover {\r
  border-color: var(--line);\r
  background: var(--surface);\r
}\r
.link-button {\r
  padding: 0;\r
  min-height: 32px;\r
  background: none;\r
  border: 0;\r
  color: var(--blue);\r
  font-size: 14px;\r
}\r
.link-button:hover {\r
  background: none;\r
  text-decoration: underline;\r
}\r
.icon-button {\r
  width: 36px;\r
  min-height: 36px;\r
  padding: 6px;\r
  background: transparent;\r
  border-color: transparent;\r
}\r
.icon-button:hover {\r
  background: var(--hover);\r
  border-color: var(--line);\r
}\r
.metrics {\r
  display: grid;\r
  grid-template-columns: repeat(4, minmax(0, 1fr));\r
  gap: var(--gap);\r
}\r
.metric {\r
  display: flex;\r
  align-items: center;\r
  gap: 20px;\r
  padding: 24px;\r
  min-height: 126px;\r
}\r
.metric-mark {\r
  display: grid;\r
  place-items: center;\r
  color: #bdc6d4;\r
  border-right: 1px solid var(--line);\r
  padding-right: 20px;\r
}\r
.metric-mark .icon {\r
  width: 30px;\r
  height: 30px;\r
}\r
.metric-content {\r
  min-width: 0;\r
}\r
.metric-label {\r
  font-size: 14px;\r
  color: #c9ced7;\r
  margin-bottom: 7px;\r
}\r
.metric-value {\r
  font-size: 36px;\r
  line-height: 1.25;\r
  letter-spacing: -0.025em;\r
  font-weight: 650;\r
  white-space: nowrap;\r
  font-variant-numeric: tabular-nums;\r
}\r
.metric-value.compact {\r
  font-size: 28px;\r
}\r
.metric-value .unit {\r
  font-size: 23px;\r
  font-weight: 500;\r
}\r
.metric-note {\r
  font-size: 12px;\r
  color: var(--muted);\r
  margin-top: 10px;\r
}\r
.metric-note.danger {\r
  color: var(--red);\r
}\r
.section-heading {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  gap: 18px;\r
  padding: 20px 24px;\r
}\r
.heading-inline {\r
  display: flex;\r
  gap: 12px;\r
  align-items: center;\r
}\r
.section-subtitle {\r
  font-size: 13px;\r
  color: var(--muted);\r
  margin-top: 4px;\r
}\r
.table-wrap {\r
  overflow: auto;\r
  max-width: 100%;\r
  padding: 0 24px;\r
  scrollbar-width: thin;\r
  scrollbar-color: #3e4652 transparent;\r
}\r
table {\r
  width: 100%;\r
  border-collapse: collapse;\r
  text-align: left;\r
  font-variant-numeric: tabular-nums;\r
}\r
th {\r
  color: #b5bfce;\r
  font-size: 13px;\r
  font-weight: 500;\r
  padding: 12px 12px;\r
  white-space: nowrap;\r
  border-top: 1px solid var(--soft-line);\r
  border-bottom: 1px solid var(--soft-line);\r
}\r
td {\r
  padding: 15px 12px;\r
  border-bottom: 1px solid var(--soft-line);\r
  font-size: 14px;\r
  vertical-align: middle;\r
}\r
th:first-child,\r
td:first-child {\r
  padding-left: 0;\r
}\r
th:last-child,\r
td:last-child {\r
  padding-right: 0;\r
}\r
tbody tr:last-child td {\r
  border-bottom: 0;\r
}\r
tbody tr:hover {\r
  background: #ffffff02;\r
}\r
.cell-secondary {\r
  display: block;\r
  color: var(--muted);\r
  font-size: 12px;\r
  line-height: 1.5;\r
  margin-top: 3px;\r
}\r
.table-note {\r
  padding: 14px 24px;\r
  color: var(--muted);\r
  font-size: 12px;\r
  border-top: 1px solid var(--soft-line);\r
}\r
.dashboard-grid {\r
  display: grid;\r
  grid-template-columns: minmax(0, 1fr) clamp(300px, 18.8vw, 450px);\r
  gap: var(--gap);\r
  align-items: start;\r
}\r
.workers-table {\r
  min-width: 980px;\r
}\r
.workers-table td {\r
  padding-top: 14px;\r
  padding-bottom: 14px;\r
  white-space: nowrap;\r
}\r
.workers-table .machine-name {\r
  font-weight: 550;\r
  letter-spacing: 0.01em;\r
}\r
.workers-table .offline td {\r
  color: #a0a6b1;\r
}\r
.utilization {\r
  display: flex;\r
  align-items: center;\r
  gap: 12px;\r
  min-width: 142px;\r
}\r
.utilization span {\r
  min-width: 33px;\r
}\r
.util-track {\r
  display: block;\r
  flex: 1;\r
  max-width: 138px;\r
  min-width: 70px;\r
  height: 6px;\r
  border-radius: 6px;\r
  background: #303744;\r
  overflow: hidden;\r
}\r
.util-track i {\r
  display: block;\r
  height: 100%;\r
  background: var(--blue);\r
  border-radius: 0;\r
}\r
.right-column {\r
  display: grid;\r
  gap: var(--gap);\r
}\r
.attention-list {\r
  display: grid;\r
  gap: 14px;\r
  padding: 0 22px 22px;\r
  max-height: 360px;\r
  overflow: auto;\r
  align-content: start;\r
  scrollbar-gutter: stable;\r
}\r
.attention-item {\r
  display: block;\r
  text-align: left;\r
  background: #101318;\r
  border: 1px solid #303642;\r
  border-radius: 11px;\r
  padding: 22px;\r
  min-height: 140px;\r
  width: 100%;\r
  white-space: normal;\r
}\r
.attention-item:hover {\r
  background: #171c23;\r
}\r
.attention-item .attention-top {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  gap: 12px;\r
}\r
.attention-item strong {\r
  font-size: 17px;\r
  font-weight: 620;\r
}\r
.attention-item b {\r
  display: block;\r
  margin: 7px 0 10px;\r
  font-weight: 550;\r
  font-size: 15px;\r
}\r
.attention-item p {\r
  font-size: 13px;\r
  color: var(--muted);\r
  line-height: 1.7;\r
}\r
.config-summary {\r
  padding: 22px;\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  gap: 12px;\r
  width: 100%;\r
  background: transparent;\r
  border: 0;\r
  border-radius: 0;\r
}\r
.config-summary h2 {\r
  font-size: 19px;\r
}\r
.config-summary p {\r
  font-size: 13px;\r
  color: var(--muted);\r
  margin-top: 7px;\r
}\r
.jobs-table {\r
  min-width: 950px;\r
}\r
.status-text {\r
  font-weight: 550;\r
  white-space: nowrap;\r
}\r
.filter-label {\r
  display: flex;\r
  align-items: center;\r
  gap: 9px;\r
  font-size: 13px;\r
  color: var(--muted);\r
}\r
.preview-footer {\r
  display: flex;\r
  justify-content: space-between;\r
  gap: 16px;\r
  color: var(--muted);\r
  font-size: 12px;\r
  padding: 0 3px;\r
}\r
.tabs {\r
  display: flex;\r
  gap: 28px;\r
  border-bottom: 1px solid var(--line);\r
  padding: 0 0 1px;\r
  flex-wrap: wrap;\r
}\r
.tabs button {\r
  position: relative;\r
  border: 0;\r
  border-radius: 0;\r
  background: none;\r
  min-height: 45px;\r
  padding: 4px 2px 14px;\r
  color: var(--muted);\r
  font-weight: 550;\r
}\r
.tabs button[aria-selected='true'] {\r
  color: var(--text);\r
}\r
.tabs button[aria-selected='true']::after {\r
  content: '';\r
  position: absolute;\r
  left: 0;\r
  right: 0;\r
  bottom: -1px;\r
  height: 2px;\r
  background: var(--blue);\r
}\r
.cost-layout {\r
  display: grid;\r
  grid-template-columns: minmax(0, 1.5fr) minmax(300px, 1fr);\r
  gap: 38px;\r
  padding: 26px 24px;\r
}\r
.cost-bars {\r
  display: grid;\r
  gap: 24px;\r
}\r
.cost-bar-row {\r
  display: grid;\r
  grid-template-columns: 130px 100px minmax(90px, 1fr) 46px;\r
  gap: 20px;\r
  align-items: center;\r
  font-size: 15px;\r
}\r
.cost-bar-row .bar {\r
  background: #2b3340;\r
  border-radius: 6px;\r
  height: 10px;\r
  overflow: hidden;\r
}\r
.cost-bar-row .bar i {\r
  display: block;\r
  background: var(--blue);\r
  height: 100%;\r
  border-radius: 6px;\r
}\r
.cost-breakdown {\r
  display: grid;\r
  gap: 14px;\r
  border-left: 1px solid var(--line);\r
  padding-left: 32px;\r
}\r
.cost-breakdown div {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  gap: 20px;\r
}\r
.cost-breakdown span {\r
  color: var(--muted);\r
  font-size: 14px;\r
}\r
.cost-breakdown strong {\r
  font-weight: 550;\r
}\r
.cost-table {\r
  min-width: 1120px;\r
}\r
.segmented {\r
  display: inline-flex;\r
  border: 1px solid #3a424f;\r
  border-radius: 8px;\r
  background: var(--surface);\r
  padding: 3px;\r
  gap: 3px;\r
  white-space: nowrap;\r
}\r
.segmented button {\r
  background: transparent;\r
  border: 0;\r
  min-height: 32px;\r
  padding: 6px 14px;\r
  font-size: 13px;\r
  color: #b4bbc6;\r
  border-radius: 5px;\r
}\r
.segmented button[aria-pressed='true'] {\r
  background: #2c3542;\r
  color: #f3f4f6;\r
}\r
.segmented button:hover {\r
  background: #252d38;\r
}\r
.capacity-table {\r
  table-layout: fixed;\r
  min-width: 1270px;\r
}\r
.capacity-table thead th {\r
  padding: 17px 17px;\r
  border-left: 1px solid var(--soft-line);\r
  font-size: 13px;\r
}\r
.capacity-table th:first-child {\r
  width: 190px;\r
  border-left: 0;\r
}\r
.capacity-table th span {\r
  color: var(--muted);\r
  display: block;\r
  font-size: 12px;\r
  margin-top: 4px;\r
}\r
.capacity-table td {\r
  vertical-align: top;\r
  padding: 22px 17px;\r
  border-left: 1px solid var(--soft-line);\r
}\r
.capacity-table td:first-child {\r
  border-left: 0;\r
  padding-left: 0;\r
}\r
.capacity-table .business-label {\r
  font-size: 14px;\r
  font-weight: 600;\r
  margin-bottom: 12px;\r
}\r
.capacity-table .runtime {\r
  font-size: 24px;\r
  line-height: 1.3;\r
  font-weight: 600;\r
  margin-bottom: 18px;\r
}\r
.capacity-spec {\r
  display: grid;\r
  gap: 12px;\r
  font-size: 12px;\r
}\r
.capacity-spec div {\r
  display: grid;\r
  gap: 3px;\r
}\r
.capacity-spec label {\r
  color: var(--muted);\r
  font-size: 11px;\r
}\r
.capacity-spec span {\r
  line-height: 1.6;\r
}\r
.no-record {\r
  font-size: 15px;\r
  color: #abb3bf;\r
  margin-top: 8px;\r
}\r
.evidence-grid {\r
  display: grid;\r
  grid-template-columns: minmax(0, 3fr) minmax(300px, 1fr);\r
  gap: var(--gap);\r
}\r
.evidence-table {\r
  min-width: 1000px;\r
}\r
.purchase-teaser {\r
  display: flex;\r
  flex-direction: column;\r
  gap: 18px;\r
  padding: 24px;\r
}\r
.purchase-teaser p {\r
  color: var(--muted);\r
  font-size: 14px;\r
  line-height: 1.8;\r
}\r
.purchase-teaser small {\r
  color: var(--muted);\r
  font-size: 12px;\r
  line-height: 1.8;\r
}\r
.permissions-top {\r
  display: grid;\r
  grid-template-columns: minmax(0, 2.2fr) minmax(290px, 1fr);\r
  gap: var(--gap);\r
}\r
.permissions-middle {\r
  display: grid;\r
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);\r
  gap: var(--gap);\r
}\r
.accounts-table {\r
  min-width: 850px;\r
}\r
.account-role {\r
  min-height: 33px;\r
  padding: 5px 9px;\r
  font-size: 13px;\r
  width: 128px;\r
}\r
.row-actions {\r
  display: flex;\r
  align-items: center;\r
  flex-wrap: wrap;\r
  gap: 7px;\r
}\r
.row-actions button {\r
  font-size: 12px;\r
  min-height: 32px;\r
  padding: 6px 10px;\r
}\r
.switch {\r
  width: 36px;\r
  height: 20px;\r
  display: inline-block;\r
  position: relative;\r
  border-radius: 20px;\r
  background: #4e5663;\r
  vertical-align: middle;\r
  margin-right: 7px;\r
}\r
.switch:before {\r
  content: '';\r
  position: absolute;\r
  top: 3px;\r
  left: 3px;\r
  width: 14px;\r
  height: 14px;\r
  background: #eef1f6;\r
  border-radius: 50%;\r
}\r
.switch.on {\r
  background: #269dce;\r
}\r
.switch.on:before {\r
  left: 19px;\r
}\r
.form-grid {\r
  display: grid;\r
  gap: 16px;\r
}\r
.field {\r
  display: grid;\r
  gap: 7px;\r
  min-width: 0;\r
  font-size: 13px;\r
  color: #c9cfd9;\r
}\r
.field input,\r
.field select {\r
  width: 100%;\r
}\r
.check-label {\r
  display: flex;\r
  align-items: center;\r
  gap: 9px;\r
  font-size: 13px;\r
  color: #c9cfd9;\r
}\r
.form-card {\r
  padding: 22px 24px;\r
  display: flex;\r
  flex-direction: column;\r
  gap: 20px;\r
}\r
.form-card form {\r
  flex: 1;\r
  align-content: start;\r
}\r
.form-card .primary {\r
  width: 100%;\r
}\r
.grant-form {\r
  display: grid;\r
  grid-template-columns: minmax(110px, 1fr) minmax(110px, 1fr) minmax(120px, 1fr) auto;\r
  gap: 12px;\r
  align-items: end;\r
  padding: 0 24px 22px;\r
}\r
.grant-form .field {\r
  font-size: 12px;\r
}\r
.grant-table {\r
  min-width: 550px;\r
}\r
.allocation-tools {\r
  display: grid;\r
  grid-template-columns: 1.4fr 1fr 1fr auto;\r
  gap: 16px;\r
  padding: 0 24px 20px;\r
  align-items: end;\r
}\r
.allocation-table {\r
  min-width: 850px;\r
}\r
.allocation-table th:first-child {\r
  width: 50px;\r
}\r
.teams-new {\r
  padding: 23px 24px;\r
}\r
.teams-new h2 {\r
  margin-bottom: 18px;\r
}\r
.create-team-form {\r
  display: grid;\r
  grid-template-columns: 1fr auto;\r
  gap: 14px;\r
  align-items: end;\r
}\r
.form-help {\r
  font-size: 12px;\r
  color: var(--muted);\r
  margin-top: 12px;\r
}\r
.team-header {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  gap: 24px;\r
  padding: 22px 24px;\r
}\r
.team-add {\r
  display: flex;\r
  align-items: end;\r
  gap: 12px;\r
}\r
.team-add .field {\r
  min-width: 260px;\r
}\r
.team-table {\r
  min-width: 700px;\r
}\r
.team-table td {\r
  padding-top: 14px;\r
  padding-bottom: 14px;\r
}\r
.role-badge {\r
  padding: 3px 9px;\r
  border: 1px solid #3a424e;\r
  border-radius: 5px;\r
  font-size: 12px;\r
}\r
.empty-state {\r
  display: flex;\r
  flex-direction: column;\r
  align-items: center;\r
  justify-content: center;\r
  gap: 10px;\r
  min-height: 180px;\r
  padding: 30px;\r
  color: var(--muted);\r
  text-align: center;\r
}\r
.empty-state b {\r
  font-size: 18px;\r
  color: var(--text);\r
  font-weight: 550;\r
}\r
.details {\r
  padding: 0 24px 20px;\r
}\r
.details summary {\r
  color: var(--muted);\r
  cursor: pointer;\r
  font-size: 13px;\r
}\r
.details p {\r
  padding-top: 12px;\r
  font-size: 13px;\r
  color: var(--muted);\r
  line-height: 1.9;\r
}\r
.purchase-layout {\r
  display: grid;\r
  grid-template-columns: 1.2fr 1fr;\r
  gap: var(--gap);\r
}\r
.purchase-form {\r
  padding: 24px;\r
  display: grid;\r
  gap: 20px;\r
}\r
.purchase-fields {\r
  display: grid;\r
  grid-template-columns: repeat(3, minmax(0, 1fr));\r
  gap: 16px;\r
}\r
.purchase-mode {\r
  display: grid;\r
  grid-template-columns: minmax(0, 1fr) 140px;\r
  gap: 18px;\r
  align-items: end;\r
  border-top: 1px solid var(--soft-line);\r
  padding-top: 18px;\r
}\r
.purchase-result {\r
  padding: 26px;\r
  display: flex;\r
  flex-direction: column;\r
  gap: 22px;\r
}\r
.purchase-result .result-number {\r
  font-size: 46px;\r
  font-weight: 650;\r
}\r
.scene-table {\r
  min-width: 1100px;\r
}\r
.notice-box {\r
  padding: 14px 18px;\r
  border: 1px solid var(--line);\r
  border-radius: 8px;\r
  background: var(--surface);\r
  font-size: 13px;\r
  color: var(--muted);\r
  line-height: 1.8;\r
}\r
.toast {\r
  position: fixed;\r
  bottom: 28px;\r
  left: 50%;\r
  transform: translateX(-50%);\r
  z-index: 30;\r
  max-width: min(680px, 90vw);\r
  padding: 15px 23px;\r
  border: 1px solid #4a5667;\r
  border-radius: 10px;\r
  background: #222a35;\r
  color: #f3f4f6;\r
  box-shadow: 0 10px 40px #0008;\r
  font-size: 14px;\r
  text-align: center;\r
}\r
.toast[hidden],\r
[hidden] {\r
  display: none !important;\r
}\r
/* 正式管理页补充：账号组件保持真实会话能力，视觉不依赖旧 style.css。 */\r
body.admin-page {\r
  --panel2: var(--surface);\r
  --ok: #7bd99d;\r
  --warn: #f5c96a;\r
  --bad: #fb7185;\r
  --acc: #edf0f5;\r
  --dim: var(--muted);\r
  --txt: var(--text);\r
}\r
body.admin-page #maintenance-banner {\r
  position: sticky;\r
  margin-left: calc(-1 * var(--workspace-width, 72px));\r
}\r
.admin-page .worker-delete {\r
  min-height: 44px;\r
}\r
.admin-page .worker-actions {\r
  flex-direction: row;\r
  align-items: center;\r
  gap: 12px;\r
  white-space: nowrap;\r
}\r
.admin-page main {\r
  max-width: none;\r
  min-width: 0;\r
}\r
.admin-page .ok {\r
  color: var(--ok);\r
}\r
.admin-page .warn {\r
  color: var(--warn);\r
}\r
.admin-page .bad {\r
  color: var(--bad);\r
}\r
.admin-page .f-reception[data-tone='bad'] {\r
  color: var(--bad);\r
}\r
.admin-page .f-reception[data-tone='warn'] {\r
  color: var(--warn);\r
}\r
.admin-page .f-reception[data-tone='ok'] {\r
  color: var(--ok);\r
}\r
.admin-page [data-dialog-content] {\r
  display: grid;\r
  gap: 18px;\r
  min-width: 0;\r
}\r
.admin-page .admin-dialog [data-busy] input,\r
.admin-page .admin-dialog [data-busy] select,\r
.admin-page .admin-dialog [data-busy] textarea {\r
  pointer-events: none;\r
  opacity: 0.7;\r
}\r
.admin-page .metric-value {\r
  overflow-wrap: anywhere;\r
}\r
.admin-page .f-job-error {\r
  display: block;\r
  max-width: 280px;\r
  overflow: hidden;\r
  text-overflow: ellipsis;\r
  white-space: nowrap;\r
}\r
.admin-page .resource-meter {\r
  margin-top: 5px;\r
  display: grid;\r
  gap: 4px;\r
}\r
.admin-page .resource-meter .util-track {\r
  max-width: none;\r
  min-width: 90px;\r
  width: 100%;\r
  height: 4px;\r
}\r
.admin-page .resource-meter .util-track i {\r
  background: #aebaca;\r
}\r
.admin-page .f-worker-status[data-worker-state='异常'] {\r
  --state-text: #fb7185;\r
  --state-border: #6d3541;\r
  --state-bg: #2c1b22;\r
}\r
.admin-page .loading-note {\r
  padding: 24px;\r
  color: var(--muted);\r
}\r
.admin-page .chart-area canvas:focus-visible {\r
  outline: 2px solid var(--blue);\r
  outline-offset: 3px;\r
}\r
.admin-page .f-cost-chart:empty {\r
  display: block;\r
}\r
.admin-page .admin-sandbox {\r
  border-color: #665231;\r
  color: var(--warn);\r
}\r
/* 温度弹窗独占整视口上层，沿用预览尺寸；内部 Canvas 弹性填满余量。 */\r
.admin-page .temperature-dialog {\r
  width: min(1760px, 78vw);\r
  height: min(1000px, 78dvh);\r
  max-width: calc(100vw - 48px);\r
  max-height: calc(100dvh - 48px);\r
  overflow: hidden;\r
  border-radius: 18px;\r
}\r
.admin-page .temperature-dialog form {\r
  height: 100%;\r
  display: block;\r
}\r
.admin-page .temperature-dialog .f-dialog-body {\r
  height: 100%;\r
  padding: 0;\r
  display: block;\r
}\r
.admin-page .temperature-dialog [data-dialog-content] {\r
  display: block;\r
  height: 100%;\r
}\r
.admin-page .temperature-dialog .f-status {\r
  display: none;\r
}\r
.admin-page .temperature-dialog .modal-shell {\r
  height: 100%;\r
}\r
.admin-page .temperature-dialog .chart-area {\r
  min-height: 120px;\r
}\r
.admin-page .temperature-dialog .modal-header .close-button {\r
  flex-shrink: 0;\r
}\r
.admin-page .btn {\r
  font: inherit;\r
  letter-spacing: 0;\r
  border-radius: 8px;\r
  min-height: 40px;\r
  padding: 8px 15px;\r
  border: 1px solid #39414d;\r
  background: #1a1f27;\r
  color: var(--text);\r
}\r
.admin-page .btn:hover {\r
  background: #252c36;\r
  border-color: #596372;\r
  color: var(--text);\r
  box-shadow: none;\r
}\r
.admin-page .btn.primary {\r
  background: #edf0f5;\r
  color: #15181d;\r
  border-color: #e5e9ef;\r
}\r
.admin-page .btn.primary:hover {\r
  background: #fff;\r
  color: #15181d;\r
  box-shadow: none;\r
}\r
.admin-page .btn.danger {\r
  color: var(--red);\r
  box-shadow: none;\r
}\r
.admin-page .btn.sm {\r
  min-height: 32px;\r
  padding: 6px 10px;\r
  font-size: 12px;\r
}\r
.admin-page .auth-dialog {\r
  width: min(440px, 92vw);\r
  height: auto;\r
  border-radius: 14px;\r
}\r
.admin-page .auth-dialog h2 {\r
  letter-spacing: 0;\r
  font-size: 22px;\r
}\r
@media (max-width: 1200px) {\r
  .admin-page .temperature-dialog {\r
    width: 90vw;\r
    height: 82dvh;\r
  }\r
}\r
@media (max-width: 767px) {\r
  .admin-page .temperature-dialog {\r
    width: calc(100vw - 28px);\r
    height: 85dvh;\r
    max-width: calc(100vw - 28px);\r
    max-height: calc(100dvh - 28px);\r
    border-radius: 14px;\r
  }\r
  .admin-page .temperature-dialog .modal-shell {\r
    overflow-y: auto;\r
  }\r
  .admin-page .temperature-dialog .chart-area {\r
    flex: none;\r
    height: 220px;\r
  }\r
  .admin-page .temperature-dialog .temperature-stat strong {\r
    font-size: 23px;\r
  }\r
}\r
/* 原生对话框位于顶层，居中基于整个视口而不是主内容区域。 */\r
dialog {\r
  width: min(1760px, 78vw);\r
  height: min(1000px, 78dvh);\r
  max-width: calc(100vw - 48px);\r
  max-height: calc(100dvh - 48px);\r
  margin: auto;\r
  padding: 0;\r
  border: 1px solid #46505e;\r
  border-radius: 18px;\r
  background: #11151b;\r
  color: var(--text);\r
  box-shadow: 0 26px 110px #0009;\r
  overflow: hidden;\r
}\r
dialog::backdrop {\r
  background: rgba(0, 0, 0, 0.68);\r
}\r
.modal-shell {\r
  display: flex;\r
  flex-direction: column;\r
  height: 100%;\r
  padding: 34px 38px;\r
  gap: 24px;\r
}\r
.modal-header {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: start;\r
  gap: 20px;\r
}\r
.eyeline {\r
  font-size: 14px;\r
  color: var(--muted);\r
  margin-bottom: 8px;\r
}\r
.modal-header h2 {\r
  font-size: 30px;\r
  font-weight: 600;\r
}\r
.modal-header .muted {\r
  font-size: 14px;\r
  margin-top: 8px;\r
}\r
.close-button {\r
  font-size: 30px;\r
  line-height: 1;\r
  width: 42px;\r
  height: 42px;\r
  background: transparent;\r
  border-color: transparent;\r
  padding: 0;\r
  color: #bfc7d1;\r
}\r
.close-button:hover {\r
  background: var(--surface);\r
  border-color: var(--line);\r
}\r
.chart-controls {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  gap: 18px;\r
}\r
.inline-label {\r
  display: flex;\r
  align-items: center;\r
  gap: 12px;\r
  color: var(--muted);\r
  font-size: 14px;\r
}\r
.inline-label select {\r
  min-width: 130px;\r
}\r
.temperature-stats {\r
  display: grid;\r
  grid-template-columns: repeat(3, minmax(0, 1fr));\r
  gap: 20px;\r
  padding: 20px 0;\r
  border-top: 1px solid var(--line);\r
  border-bottom: 1px solid var(--line);\r
}\r
.temperature-stat {\r
  padding-left: 24px;\r
  border-left: 1px solid var(--line);\r
}\r
.temperature-stat:first-child {\r
  padding-left: 0;\r
  border-left: 0;\r
}\r
.temperature-stat label {\r
  color: var(--muted);\r
  font-size: 13px;\r
}\r
.temperature-stat strong {\r
  display: block;\r
  font-size: 34px;\r
  font-weight: 550;\r
  margin-top: 8px;\r
  line-height: 1.2;\r
  font-variant-numeric: tabular-nums;\r
}\r
.temperature-stat strong small {\r
  font-size: 20px;\r
  font-weight: 400;\r
  color: var(--muted);\r
}\r
.chart-area {\r
  position: relative;\r
  flex: 1;\r
  min-height: 180px;\r
  min-width: 0;\r
}\r
.chart-area canvas {\r
  display: block;\r
  width: 100%;\r
  height: 100%;\r
}\r
.chart-area .empty-state {\r
  position: absolute;\r
  inset: 0;\r
}\r
.chart-tooltip {\r
  position: absolute;\r
  pointer-events: none;\r
  background: #232c38;\r
  border: 1px solid #46566b;\r
  padding: 9px 13px;\r
  border-radius: 7px;\r
  font-size: 13px;\r
  box-shadow: 0 8px 20px #0004;\r
  white-space: nowrap;\r
}\r
.modal-footer {\r
  display: flex;\r
  justify-content: space-between;\r
  flex-wrap: wrap;\r
  align-items: center;\r
  gap: 12px;\r
  color: var(--muted);\r
  font-size: 12px;\r
}\r
.chart-key {\r
  display: flex;\r
  align-items: center;\r
  gap: 9px;\r
}\r
.chart-key i {\r
  width: 20px;\r
  height: 2px;\r
  background: var(--blue);\r
}\r
.keyboard-hint {\r
  padding: 3px 7px;\r
  border: 1px solid var(--line);\r
  border-radius: 4px;\r
}\r
body.modal-open {\r
  overflow: hidden;\r
}\r
@media (min-width: 2000px) {\r
  :root {\r
    font-size: 18px;\r
    --gap: 24px;\r
  }\r
  h1 {\r
    font-size: 34px;\r
  }\r
  h2 {\r
    font-size: 23px;\r
  }\r
  .page-header {\r
    min-height: 110px;\r
    padding: 18px 28px;\r
  }\r
  .page-header .subtitle {\r
    font-size: 15px;\r
  }\r
  .page-caption {\r
    margin-top: 7px;\r
  }\r
  .sample-badge {\r
    font-size: 12px;\r
    padding: 3px 8px;\r
  }\r
  .metric {\r
    padding: 17px 26px;\r
    min-height: 120px;\r
  }\r
  .metric-value {\r
    font-size: 39px;\r
    line-height: 1.2;\r
  }\r
  .metric-value.compact {\r
    font-size: 30px;\r
  }\r
  .metric-label {\r
    font-size: 15px;\r
    margin-bottom: 4px;\r
  }\r
  .metric-note {\r
    font-size: 13px;\r
    margin-top: 5px;\r
  }\r
  .section-heading {\r
    padding: 13px 28px;\r
  }\r
  .table-wrap {\r
    padding-left: 28px;\r
    padding-right: 28px;\r
  }\r
  th {\r
    font-size: 14px;\r
    padding: 8px 16px;\r
  }\r
  td {\r
    font-size: 16px;\r
    padding: 10px 16px;\r
  }\r
  .workers-table td,\r
  .jobs-table td {\r
    padding-top: 7px;\r
    padding-bottom: 7px;\r
  }\r
  .cell-secondary {\r
    font-size: 12px;\r
    margin-top: 2px;\r
  }\r
  .table-note {\r
    font-size: 12px;\r
    padding: 9px 28px;\r
  }\r
  .attention-item {\r
    min-height: 140px;\r
    padding: 20px;\r
  }\r
  .attention-item strong {\r
    font-size: 19px;\r
  }\r
  .attention-item b {\r
    font-size: 16px;\r
  }\r
  .attention-item p {\r
    font-size: 14px;\r
  }\r
  .attention-list {\r
    gap: 14px;\r
    padding: 0 24px 22px;\r
  }\r
  .config-summary {\r
    padding: 23px 26px;\r
  }\r
  .config-summary h2 {\r
    font-size: 21px;\r
  }\r
  .config-summary p {\r
    font-size: 14px;\r
  }\r
  .capacity-table th:first-child {\r
    width: 230px;\r
  }\r
  .capacity-table thead th {\r
    font-size: 15px;\r
    padding: 12px 17px;\r
  }\r
  .capacity-table .business-label {\r
    font-size: 16px;\r
  }\r
  .capacity-table .runtime {\r
    font-size: 27px;\r
    margin-bottom: 12px;\r
  }\r
  .capacity-spec {\r
    font-size: 14px;\r
    gap: 9px;\r
  }\r
  .capacity-spec label {\r
    font-size: 12px;\r
  }\r
  .capacity-table td {\r
    padding: 17px 20px;\r
  }\r
  .field,\r
  .check-label {\r
    font-size: 14px;\r
  }\r
  .form-card,\r
  .padded,\r
  .purchase-form,\r
  .purchase-result {\r
    padding: 23px 26px;\r
  }\r
  .team-header {\r
    padding: 20px 28px;\r
  }\r
  .team-table td {\r
    padding-top: 12px;\r
    padding-bottom: 12px;\r
  }\r
  .cost-bar-row {\r
    font-size: 17px;\r
    grid-template-columns: 145px 125px minmax(90px, 1fr) 50px;\r
  }\r
  .cost-breakdown span {\r
    font-size: 16px;\r
  }\r
  .modal-shell {\r
    padding: 40px 46px;\r
    gap: 28px;\r
  }\r
  .modal-header h2 {\r
    font-size: 34px;\r
  }\r
  .temperature-stat strong {\r
    font-size: 42px;\r
  }\r
  .modal-footer {\r
    font-size: 14px;\r
  }\r
  .accounts-table {\r
    min-width: 1040px;\r
  }\r
  .accounts-table td {\r
    padding-top: 10px;\r
    padding-bottom: 10px;\r
  }\r
  .account-role {\r
    font-size: 14px;\r
  }\r
  .row-actions button {\r
    font-size: 13px;\r
  }\r
  .form-grid {\r
    gap: 16px;\r
  }\r
  .grant-form .field {\r
    font-size: 14px;\r
  }\r
  .preview-footer {\r
    font-size: 12px;\r
  }\r
}\r
@media (max-width: 1500px) {\r
  .metric {\r
    padding: 20px;\r
    gap: 12px;\r
  }\r
  .metric-mark {\r
    padding-right: 12px;\r
  }\r
  .metric-value {\r
    font-size: 30px;\r
  }\r
  .metric-value.compact {\r
    font-size: 24px;\r
  }\r
  .metric-mark .icon {\r
    width: 25px;\r
    height: 25px;\r
  }\r
  .metric-note {\r
    font-size: 12px;\r
  }\r
  .permissions-top {\r
    grid-template-columns: minmax(0, 1fr) 290px;\r
  }\r
  .permissions-middle {\r
    grid-template-columns: minmax(0, 1fr);\r
  }\r
  .cost-layout {\r
    grid-template-columns: 1fr;\r
  }\r
  .cost-breakdown {\r
    border-left: 0;\r
    border-top: 1px solid var(--line);\r
    padding: 22px 0 0;\r
  }\r
  .grant-form {\r
    grid-template-columns: repeat(3, minmax(100px, 1fr)) auto;\r
  }\r
  .allocation-tools {\r
    grid-template-columns: 1fr 1fr;\r
  }\r
  .capacity-table th:first-child {\r
    width: 180px;\r
  }\r
  .header-actions .filter-label > span {\r
    display: none;\r
  }\r
  .metric-mark {\r
    display: none;\r
  }\r
}\r
@media (max-width: 1200px) {\r
  .dashboard-grid {\r
    grid-template-columns: minmax(0, 1fr);\r
  }\r
  .right-column {\r
    grid-template-columns: 1.4fr 1fr;\r
    align-items: start;\r
  }\r
  .attention-list {\r
    grid-template-columns: 1fr 1fr;\r
  }\r
  .attention-item {\r
    min-height: 130px;\r
    padding: 18px;\r
  }\r
  .evidence-grid,\r
  .purchase-layout {\r
    grid-template-columns: 1fr;\r
  }\r
  .permissions-top {\r
    grid-template-columns: 1fr;\r
  }\r
  .form-card .form-grid {\r
    grid-template-columns: 1fr 1fr;\r
  }\r
  .form-card .form-grid .primary {\r
    align-self: end;\r
  }\r
  .team-header {\r
    align-items: start;\r
    flex-direction: column;\r
  }\r
  .team-add {\r
    width: 100%;\r
  }\r
  .team-add .field {\r
    flex: 1;\r
  }\r
  .metric-value.compact {\r
    font-size: 22px;\r
  }\r
  .page-header {\r
    align-items: start;\r
  }\r
  .header-actions {\r
    max-width: 50%;\r
  }\r
  .cost-bar-row {\r
    grid-template-columns: 110px 90px minmax(80px, 1fr) 40px;\r
    gap: 14px;\r
  }\r
  dialog {\r
    width: 90vw;\r
    height: 82dvh;\r
  }\r
  .modal-shell {\r
    padding: 25px;\r
    gap: 18px;\r
  }\r
}\r
@media (max-width: 767px) {\r
  :root {\r
    --pad: 15px;\r
    --gap: 15px;\r
    font-size: 14px;\r
  }\r
  .page-header {\r
    flex-direction: column;\r
    padding: 20px;\r
    gap: 17px;\r
  }\r
  .header-actions {\r
    max-width: none;\r
    justify-content: start;\r
  }\r
  h1 {\r
    font-size: 25px;\r
  }\r
  h2 {\r
    font-size: 19px;\r
  }\r
  .metrics {\r
    grid-template-columns: repeat(2, minmax(0, 1fr));\r
  }\r
  .metric {\r
    min-height: 106px;\r
    padding: 15px;\r
  }\r
  .metric-value {\r
    font-size: 28px;\r
  }\r
  .metric-value.compact {\r
    font-size: 21px;\r
    white-space: normal;\r
  }\r
  .metric-note {\r
    font-size: 12px;\r
  }\r
  .metric-label {\r
    font-size: 12px;\r
  }\r
  .right-column,\r
  .attention-list,\r
  .permissions-middle,\r
  .purchase-layout {\r
    grid-template-columns: 1fr;\r
  }\r
  .section-heading {\r
    padding: 18px;\r
    flex-wrap: wrap;\r
  }\r
  .table-wrap {\r
    padding: 0 18px;\r
  }\r
  .table-note {\r
    padding: 14px 18px;\r
  }\r
  .form-card .form-grid,\r
  .grant-form,\r
  .allocation-tools,\r
  .purchase-fields {\r
    grid-template-columns: 1fr;\r
  }\r
  .grant-form {\r
    padding: 0 18px 18px;\r
  }\r
  .allocation-tools {\r
    padding: 0 18px 18px;\r
  }\r
  .team-add,\r
  .create-team-form {\r
    display: grid;\r
    grid-template-columns: 1fr;\r
    width: 100%;\r
  }\r
  .team-add .field {\r
    min-width: 0;\r
  }\r
  .team-header {\r
    padding: 18px;\r
  }\r
  .teams-new {\r
    padding: 18px;\r
  }\r
  .cost-layout {\r
    padding: 20px 18px;\r
    gap: 20px;\r
  }\r
  .cost-bar-row {\r
    grid-template-columns: 90px 80px minmax(50px, 1fr);\r
    gap: 10px;\r
    font-size: 13px;\r
  }\r
  .cost-bar-row .cost-percent {\r
    display: none;\r
  }\r
  .cost-breakdown div {\r
    align-items: start;\r
  }\r
  .preview-footer {\r
    flex-direction: column;\r
    font-size: 11px;\r
  }\r
  .padded,\r
  .form-card {\r
    padding: 20px 18px;\r
  }\r
  .tabs {\r
    gap: 19px;\r
  }\r
  .tabs button {\r
    font-size: 14px;\r
  }\r
  .purchase-mode {\r
    grid-template-columns: 1fr;\r
  }\r
  .segmented button {\r
    padding: 6px 9px;\r
  }\r
  .sample-badge {\r
    font-size: 10px;\r
  }\r
  dialog {\r
    width: calc(100vw - 28px);\r
    height: 85dvh;\r
    max-width: calc(100vw - 28px);\r
    max-height: calc(100dvh - 28px);\r
    border-radius: 14px;\r
  }\r
  .modal-shell {\r
    padding: 20px;\r
    gap: 16px;\r
  }\r
  .modal-header h2 {\r
    font-size: 24px;\r
  }\r
  .modal-header .muted {\r
    font-size: 12px;\r
  }\r
  .chart-controls {\r
    flex-wrap: wrap;\r
  }\r
  .temperature-stats {\r
    gap: 10px;\r
    padding: 16px 0;\r
  }\r
  .temperature-stat {\r
    padding-left: 12px;\r
  }\r
  .temperature-stat strong {\r
    font-size: 27px;\r
  }\r
  .temperature-stat strong small {\r
    font-size: 14px;\r
  }\r
  .modal-footer {\r
    font-size: 11px;\r
  }\r
  .keyboard-hint {\r
    display: none;\r
  }\r
  .chart-area {\r
    min-height: 150px;\r
  }\r
}\r
@media (max-width: 480px) {\r
  :root {\r
    --pad: 12px;\r
    --gap: 12px;\r
  }\r
  .page-header {\r
    padding: 17px;\r
  }\r
  .header-actions {\r
    gap: 8px;\r
  }\r
  .header-actions button {\r
    padding: 8px 10px;\r
    font-size: 12px;\r
  }\r
  .header-actions select {\r
    font-size: 12px;\r
    min-height: 37px;\r
  }\r
  .metric {\r
    padding: 13px;\r
  }\r
  .metric-value {\r
    font-size: 24px;\r
  }\r
  .metric-value.compact {\r
    font-size: 19px;\r
  }\r
  .metric-value .unit {\r
    font-size: 17px;\r
  }\r
  .page-header .subtitle {\r
    font-size: 12px;\r
  }\r
  .metric-note {\r
    font-size: 12px;\r
  }\r
  .modal-footer {\r
    gap: 7px;\r
  }\r
  .temperature-stat label {\r
    font-size: 11px;\r
  }\r
  .temperature-stat strong {\r
    font-size: 24px;\r
  }\r
}\r
@media (prefers-reduced-motion: reduce) {\r
  *,\r
  *:before,\r
  *:after {\r
    animation: none !important;\r
    transition: none !important;\r
    scroll-behavior: auto !important;\r
  }\r
}\r
.admin-page [tabindex='0']:focus-visible {\r
  outline: 2px solid var(--blue);\r
  outline-offset: 3px;\r
}\r
.admin-page .attention-item {\r
  min-height: 112px;\r
  padding: 16px;\r
}\r
@media (max-width: 767px) {\r
  .admin-page :is(main, dialog) button {\r
    min-height: 44px;\r
  }\r
  .admin-page .icon-button {\r
    min-width: 44px;\r
    min-height: 44px;\r
  }\r
  .admin-page .close-button {\r
    width: 44px;\r
    height: 44px;\r
  }\r
  .admin-page .metric-note {\r
    font-size: 12px;\r
  }\r
  .admin-page :is(main, dialog) :is(input:not([type='checkbox']), select, textarea) {\r
    font-size: 16px;\r
    min-height: 44px;\r
  }\r
  .admin-page .check-label,\r
  .admin-page .offline-toggle {\r
    min-height: 44px;\r
  }\r
  .admin-page .attention-list {\r
    max-height: 320px;\r
  }\r
}\r
\r
/* 完整功能版沿用原黑灰主题与圆角尺度，功能密度增加时以折叠和局部滚动承载。 */\r
.f-preview-tools {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  gap: 16px;\r
  margin-bottom: 20px;\r
  padding: 14px 20px;\r
  background: #11151b;\r
  border: 1px dashed #424c5b;\r
  border-radius: 10px;\r
  font-size: 12px;\r
  color: var(--muted);\r
}\r
.f-preview-tools > div:first-child {\r
  display: grid;\r
  gap: 4px;\r
}\r
.f-preview-tools b {\r
  color: #dce1e9;\r
  font-size: 13px;\r
  font-weight: 600;\r
}\r
.f-tools-fields {\r
  display: flex;\r
  align-items: center;\r
  flex-wrap: wrap;\r
  gap: 12px;\r
}\r
.f-tools-fields label {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
}\r
.f-tools-fields select,\r
.f-tools-fields button {\r
  font-size: 12px;\r
  min-height: 34px;\r
  padding: 6px 10px;\r
}\r
.f-metrics6 {\r
  grid-template-columns: repeat(6, minmax(0, 1fr));\r
}\r
.f-metrics8 {\r
  grid-template-columns: repeat(4, minmax(0, 1fr));\r
}\r
.f-metrics6 .metric {\r
  padding: 20px;\r
  min-height: 115px;\r
}\r
.f-metrics6 .metric-mark,\r
.f-metrics8 .metric-mark {\r
  display: none;\r
}\r
.f-metrics6 .metric-value {\r
  font-size: 30px;\r
}\r
.f-metrics6 .metric-value.compact {\r
  font-size: 26px;\r
}\r
.f-metrics8 .metric-content {\r
  width: 100%;\r
}\r
.f-metrics8 .metric-value {\r
  overflow-x: auto;\r
  overflow-wrap: normal;\r
}\r
.f-metrics8 .metric-value.compact {\r
  font-size: 25px;\r
  white-space: nowrap;\r
}\r
.f-metrics8 #retail-range {\r
  white-space: normal;\r
}\r
.f-metrics8 .cost-amount {\r
  display: inline-block;\r
  white-space: nowrap;\r
}\r
.f-metrics8 .metric-note {\r
  line-height: 1.7;\r
}\r
.f-workers {\r
  min-width: 1470px;\r
}\r
.f-workers th,\r
.f-workers td {\r
  white-space: normal;\r
}\r
.f-workers td {\r
  font-size: 13px;\r
  vertical-align: top;\r
  padding-top: 10px;\r
  padding-bottom: 10px;\r
}\r
.f-workers td:nth-child(1) {\r
  min-width: 175px;\r
}\r
.f-workers td:nth-child(2) {\r
  min-width: 150px;\r
}\r
.f-workers td:nth-child(3) {\r
  min-width: 235px;\r
}\r
.f-workers td:nth-child(5) {\r
  min-width: 165px;\r
}\r
.f-workers td:nth-child(6) {\r
  min-width: 170px;\r
}\r
.f-workers .utilization {\r
  margin: 6px 0;\r
}\r
.f-gpu + .f-gpu {\r
  margin-top: 8px;\r
  padding-top: 8px;\r
  border-top: 1px solid var(--soft-line);\r
}\r
.f-workers td:nth-child(3) .f-gpu {\r
  display: grid;\r
  grid-template-columns: minmax(0, 1fr);\r
  gap: 4px;\r
  align-items: center;\r
}\r
.admin-page .f-workers td:nth-child(3) .resource-meter .util-track i {\r
  background: var(--blue);\r
}\r
.f-stack {\r
  display: flex;\r
  flex-direction: column;\r
  align-items: start;\r
  gap: 6px;\r
}\r
.f-job-scroll {\r
  max-height: 520px;\r
}\r
.f-job-scroll th {\r
  position: sticky;\r
  top: 0;\r
  background: var(--panel);\r
  z-index: 1;\r
}\r
.f-worker-status {\r
  --state-text: #a0a6b1;\r
  --state-border: #424956;\r
  --state-bg: #1b2028;\r
}\r
.f-worker-status[data-worker-state='运行中'],\r
.f-worker-status[data-worker-state='正在更新'] {\r
  --state-text: #f5c96a;\r
  --state-border: #665231;\r
  --state-bg: #2b251b;\r
}\r
.f-worker-status[data-worker-state='空闲'] {\r
  --state-text: #7bd99d;\r
  --state-border: #355d43;\r
  --state-bg: #19281f;\r
}\r
.f-worker-status[data-worker-state='离线'],\r
.f-worker-status[data-worker-state='已禁用'] {\r
  --state-text: #fb7185;\r
  --state-border: #6d3541;\r
  --state-bg: #2c1b22;\r
}\r
.f-worker-status .f-chip {\r
  color: var(--state-text);\r
  border-color: var(--state-border);\r
  background: var(--state-bg);\r
}\r
.f-worker-status .f-reception {\r
  color: var(--state-text);\r
}\r
.f-config-definition {\r
  display: grid;\r
  grid-template-columns: 86px minmax(0, 1fr);\r
  gap: 14px 12px;\r
  margin: 0;\r
  padding: 4px 24px 24px;\r
  font-size: 13px;\r
  line-height: 1.7;\r
}\r
.f-config-definition dt {\r
  color: var(--muted);\r
}\r
.f-config-definition dd {\r
  margin: 0;\r
  overflow-wrap: anywhere;\r
  color: #dce1e9;\r
}\r
.f-toolbar {\r
  display: flex;\r
  align-items: end;\r
  justify-content: space-between;\r
  gap: 14px;\r
  flex-wrap: wrap;\r
}\r
.f-fields {\r
  display: grid;\r
  grid-template-columns: repeat(3, minmax(0, 1fr));\r
  gap: 16px;\r
  align-items: end;\r
}\r
.f-grid2 {\r
  display: grid;\r
  grid-template-columns: repeat(2, minmax(0, 1fr));\r
  gap: 20px;\r
}\r
.f-grid3 {\r
  display: grid;\r
  grid-template-columns: repeat(3, minmax(0, 1fr));\r
  gap: 18px;\r
}\r
.f-pad {\r
  padding: 24px;\r
}\r
.f-pad-tabs {\r
  margin: 0 24px;\r
}\r
.f-status {\r
  font-size: 13px;\r
  line-height: 1.8;\r
  color: var(--muted);\r
  margin-top: 12px;\r
  white-space: pre-wrap;\r
  overflow-wrap: anywhere;\r
}\r
.f-status:empty {\r
  display: none;\r
}\r
.f-pager {\r
  display: flex;\r
  align-items: center;\r
  justify-content: flex-end;\r
  gap: 12px;\r
  flex-wrap: wrap;\r
  padding: 16px 24px;\r
  border-top: 1px solid var(--soft-line);\r
  font-size: 13px;\r
  color: var(--muted);\r
}\r
.f-pager span:first-child {\r
  margin-right: auto;\r
}\r
.f-tags {\r
  display: flex;\r
  align-items: center;\r
  gap: 7px;\r
  flex-wrap: wrap;\r
}\r
.f-chip {\r
  display: inline-flex;\r
  align-items: center;\r
  padding: 3px 9px;\r
  border: 1px solid #3a424e;\r
  background: var(--surface);\r
  border-radius: 5px;\r
  font-size: 12px;\r
  line-height: 1.6;\r
  color: #d3d9e3;\r
  white-space: normal;\r
}\r
.f-statgrid {\r
  display: grid;\r
  grid-template-columns: repeat(4, minmax(0, 1fr));\r
  gap: 14px;\r
}\r
.f-stat {\r
  padding: 16px;\r
  background: var(--surface);\r
  border: 1px solid var(--soft-line);\r
  border-radius: 10px;\r
  min-width: 0;\r
}\r
.f-stat span,\r
.f-stat label {\r
  display: block;\r
  color: var(--muted);\r
  font-size: 12px;\r
}\r
.f-stat strong {\r
  display: block;\r
  font-size: 25px;\r
  line-height: 1.4;\r
  margin-top: 8px;\r
  font-weight: 600;\r
  overflow-wrap: anywhere;\r
}\r
.f-summary {\r
  padding: 18px 24px;\r
  cursor: pointer;\r
  font-size: 16px;\r
  color: #dce2ec;\r
  font-weight: 550;\r
}\r
.f-summary::marker {\r
  color: var(--muted);\r
}\r
.f-summary + p {\r
  padding: 0 24px 18px;\r
}\r
.f-table {\r
  min-width: 900px;\r
}\r
.f-table td {\r
  vertical-align: top;\r
  font-size: 14px;\r
}\r
.f-table p + p {\r
  margin-top: 5px;\r
}\r
.f-table select {\r
  max-width: 100%;\r
  font-size: 12px;\r
}\r
.f-table .cell-secondary {\r
  white-space: normal;\r
}\r
.f-definition {\r
  display: grid;\r
  grid-template-columns: 140px minmax(0, 1fr);\r
  gap: 12px 20px;\r
  margin: 20px 0;\r
  font-size: 14px;\r
}\r
.f-definition dt {\r
  color: var(--muted);\r
}\r
.f-definition dd {\r
  margin: 0;\r
  overflow-wrap: anywhere;\r
}\r
.f-operation-modal {\r
  width: min(800px, 88vw);\r
  height: auto;\r
  max-height: 88dvh;\r
  overflow: auto;\r
  border-radius: 14px;\r
}\r
.f-operation-modal form {\r
  display: flex;\r
  flex-direction: column;\r
  min-width: 0;\r
}\r
.f-dialog-head {\r
  display: flex;\r
  align-items: start;\r
  justify-content: space-between;\r
  padding: 24px;\r
  border-bottom: 1px solid var(--line);\r
  gap: 18px;\r
}\r
.f-dialog-head h2 {\r
  font-size: 24px;\r
}\r
.f-dialog-head .eyeline {\r
  font-size: 12px;\r
  display: block;\r
  line-height: 1.7;\r
}\r
.f-dialog-body {\r
  padding: 24px;\r
  display: grid;\r
  gap: 18px;\r
  min-width: 0;\r
}\r
.f-dialog-body .f-status {\r
  margin-top: 0;\r
}\r
.f-dialog-body .f-grid2 {\r
  gap: 12px;\r
}\r
.f-dialog-body pre {\r
  font-size: 12px;\r
}\r
.f-dialog-foot {\r
  display: flex;\r
  justify-content: flex-end;\r
  align-items: center;\r
  gap: 12px;\r
  padding: 18px 24px;\r
  border-top: 1px solid var(--line);\r
  background: #131820;\r
}\r
.f-operation-modal .f-dialog-foot button {\r
  font-size: 14px;\r
}\r
.f-operation-modal .field {\r
  font-size: 14px;\r
}\r
textarea {\r
  font: inherit;\r
  color: var(--text);\r
  background: var(--surface);\r
  border: 1px solid #39414d;\r
  border-radius: 8px;\r
  padding: 10px 12px;\r
  min-width: 0;\r
  width: 100%;\r
  resize: vertical;\r
}\r
textarea:focus-visible {\r
  outline: 2px solid var(--blue);\r
  outline-offset: 3px;\r
}\r
pre {\r
  margin: 0;\r
  padding: 16px;\r
  max-width: 100%;\r
  max-height: 340px;\r
  overflow: auto;\r
  font:\r
    12px/1.8 ui-monospace,\r
    SFMono-Regular,\r
    Consolas,\r
    monospace;\r
  color: #bbc5d4;\r
  background: #0d1117;\r
  border: 1px solid var(--soft-line);\r
  border-radius: 8px;\r
  white-space: pre-wrap;\r
  overflow-wrap: anywhere;\r
}\r
summary {\r
  cursor: pointer;\r
}\r
details > summary {\r
  list-style-position: inside;\r
}\r
details[open] > .f-summary {\r
  border-bottom: 1px solid var(--soft-line);\r
}\r
.notice-box p + p {\r
  margin-top: 9px;\r
}\r
.f-cost-chart {\r
  display: grid;\r
  grid-template-columns: repeat(2, minmax(0, 1fr));\r
  gap: 20px 36px;\r
}\r
.f-rank {\r
  display: grid;\r
  gap: 8px;\r
  min-width: 0;\r
}\r
.f-rank > div:first-child {\r
  display: flex;\r
  justify-content: space-between;\r
  gap: 12px;\r
  font-size: 14px;\r
}\r
.f-rank b {\r
  font-weight: 550;\r
  overflow-wrap: anywhere;\r
}\r
.f-rank strong {\r
  font-weight: 500;\r
  white-space: nowrap;\r
}\r
.f-track {\r
  height: 6px;\r
  border-radius: 6px;\r
  background: #2b3340;\r
  overflow: hidden;\r
}\r
.f-track i {\r
  display: block;\r
  height: 100%;\r
  background: var(--blue);\r
}\r
.f-error {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  gap: 16px;\r
  padding: 18px 22px;\r
  border: 1px solid #6f3e4b;\r
  background: #24171d;\r
  border-radius: 10px;\r
  color: #fda4b4;\r
  font-size: 14px;\r
}\r
.f-error p {\r
  font-size: 13px;\r
  margin-top: 4px;\r
  color: #d4b7bf;\r
}\r
.f-skeleton {\r
  background: #202630;\r
  border: 1px solid #2a313d;\r
  border-radius: 7px;\r
}\r
.f-skeleton-title {\r
  width: 35%;\r
  height: 28px;\r
  margin-bottom: 24px;\r
}\r
.f-skeleton-card {\r
  height: 110px;\r
}\r
.f-skeleton-row {\r
  height: 35px;\r
  margin-top: 18px;\r
}\r
.f-skeleton-row:nth-child(odd) {\r
  width: 90%;\r
}\r
.f-skeleton-row:last-of-type {\r
  margin-bottom: 20px;\r
}\r
.f-dialog-foot {\r
  flex-wrap: wrap;\r
}\r
.f-feedback-label {\r
  margin-right: auto;\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
  font-size: 11px;\r
  color: var(--muted);\r
}\r
.f-feedback-label select {\r
  font-size: 12px;\r
  min-height: 32px;\r
  padding: 5px 8px;\r
}\r
[data-form-error]:empty,\r
[data-cap-error]:empty {\r
  display: none;\r
}\r
[data-admin-form='assign'] {\r
  display: flex;\r
  align-items: flex-end;\r
  flex-wrap: wrap;\r
  gap: 12px;\r
}\r
[data-admin-form='assign'] > .field {\r
  min-width: 220px;\r
}\r
[data-admin-form='assign'] > [data-selected-count] {\r
  align-self: center;\r
  margin: 0;\r
}\r
[data-admin-form='assign'] > button {\r
  min-height: 42px;\r
}\r
[data-admin-form='assign'] > [data-form-error] {\r
  flex-basis: 100%;\r
}\r
.f-toolbar > .f-fields:not(form) {\r
  grid-template-columns: repeat(2, minmax(0, 1fr));\r
  flex: 1;\r
  min-width: 0;\r
  max-width: 740px;\r
}\r
.cap-matrix-scroll {\r
  max-height: min(900px, 65dvh);\r
  overflow: auto;\r
  scrollbar-gutter: stable;\r
}\r
.cap-matrix {\r
  min-width: 2150px;\r
  border-collapse: separate;\r
  border-spacing: 0;\r
}\r
.cap-matrix thead th {\r
  position: sticky;\r
  top: 0;\r
  background: var(--surface);\r
  z-index: 3;\r
  white-space: normal;\r
  overflow-wrap: anywhere;\r
}\r
.cap-matrix tbody th {\r
  position: sticky;\r
  left: 0;\r
  z-index: 2;\r
  background: var(--panel);\r
  vertical-align: top;\r
  white-space: normal;\r
  padding: 20px 16px;\r
}\r
.cap-matrix thead th:first-child {\r
  left: 0;\r
  z-index: 4;\r
}\r
.cap-matrix .form-grid {\r
  gap: 10px;\r
}\r
.cap-matrix .runtime {\r
  font-size: 24px;\r
  margin-bottom: 5px;\r
}\r
.cap-matrix .f-toolbar {\r
  justify-content: flex-start;\r
  gap: 7px;\r
}\r
.cap-matrix button {\r
  font-size: 12px;\r
  min-height: 32px;\r
  padding: 6px 9px;\r
}\r
.cap-matrix .empty-state {\r
  min-height: 90px;\r
  padding: 16px 4px;\r
  font-size: 13px;\r
}\r
.cap-matrix h3 {\r
  color: var(--text);\r
  font-size: 15px;\r
}\r
.cap-matrix select {\r
  font-size: 12px;\r
  min-height: 36px;\r
}\r
.cap-definition {\r
  display: grid;\r
  grid-template-columns: 130px minmax(0, 1fr);\r
  gap: 9px 16px;\r
  margin: 16px 0;\r
  font-size: 13px;\r
}\r
.cap-definition dd {\r
  margin: 0;\r
  overflow-wrap: anywhere;\r
}\r
.cap-demand {\r
  display: grid;\r
  grid-template-columns: minmax(0, 1fr) 120px auto;\r
  gap: 12px;\r
  align-items: end;\r
  padding: 16px 0;\r
  border-top: 1px solid var(--soft-line);\r
}\r
.cap-raw {\r
  margin-top: 12px;\r
}\r
.cap-groups {\r
  min-width: 1500px;\r
}\r
.cap-result-number {\r
  font-size: 42px;\r
  font-weight: 650;\r
}\r
.cap-evidence-item {\r
  border-top: 1px solid var(--soft-line);\r
  padding-top: 16px;\r
  margin-top: 16px;\r
}\r
@media (max-width: 767px) {\r
  .f-toolbar > .f-fields:not(form) {\r
    flex-basis: 100%;\r
    grid-template-columns: 1fr;\r
    max-width: none;\r
  }\r
  [data-admin-form='assign'] {\r
    width: 100%;\r
  }\r
  [data-admin-form='assign'] > .field {\r
    min-width: 0;\r
    width: 100%;\r
  }\r
  .cap-definition {\r
    grid-template-columns: 90px minmax(0, 1fr);\r
  }\r
  .cap-demand {\r
    grid-template-columns: 1fr;\r
  }\r
  .cap-matrix-scroll {\r
    max-height: 70dvh;\r
  }\r
}\r
@media (min-width: 2000px) {\r
  .f-workers td {\r
    font-size: 14px;\r
  }\r
  .f-workers .cell-secondary {\r
    font-size: 12px;\r
  }\r
  .f-metrics6 .metric {\r
    min-height: 116px;\r
  }\r
  .f-metrics6 .metric-value {\r
    font-size: 32px;\r
  }\r
  .f-metrics6 .metric-value.compact {\r
    font-size: 27px;\r
  }\r
  .f-metrics8 .metric-value.compact {\r
    font-size: 28px;\r
  }\r
  .f-table td {\r
    font-size: 15px;\r
  }\r
}\r
@media (max-width: 1700px) {\r
  .f-metrics6 {\r
    grid-template-columns: repeat(3, minmax(0, 1fr));\r
  }\r
  .f-preview-tools {\r
    align-items: start;\r
    flex-direction: column;\r
  }\r
  .f-fields {\r
    grid-template-columns: repeat(2, minmax(0, 1fr));\r
  }\r
  .f-workers {\r
    min-width: 1400px;\r
  }\r
}\r
@media (max-width: 1100px) {\r
  .f-grid3 {\r
    grid-template-columns: repeat(2, minmax(0, 1fr));\r
  }\r
  .f-metrics8 {\r
    grid-template-columns: repeat(2, minmax(0, 1fr));\r
  }\r
  .f-cost-chart {\r
    grid-template-columns: 1fr;\r
  }\r
  .f-statgrid {\r
    grid-template-columns: repeat(2, minmax(0, 1fr));\r
  }\r
}\r
@media (max-width: 767px) {\r
  .f-fields,\r
  .f-grid2,\r
  .f-grid3 {\r
    grid-template-columns: 1fr;\r
  }\r
  .f-metrics6 {\r
    grid-template-columns: repeat(2, minmax(0, 1fr));\r
  }\r
  .f-metrics6 .metric {\r
    padding: 14px;\r
    min-height: 105px;\r
  }\r
  .f-metrics6 .metric-value,\r
  .f-metrics6 .metric-value.compact {\r
    font-size: 23px;\r
  }\r
  .f-preview-tools {\r
    padding: 14px;\r
    gap: 14px;\r
  }\r
  .f-tools-fields {\r
    gap: 10px;\r
    display: grid;\r
    grid-template-columns: 1fr 1fr;\r
    width: 100%;\r
  }\r
  .f-tools-fields label {\r
    flex-direction: column;\r
    align-items: start;\r
    gap: 5px;\r
  }\r
  .f-tools-fields select,\r
  .f-tools-fields button {\r
    width: 100%;\r
  }\r
  .f-tools-fields button {\r
    align-self: end;\r
    font-size: 11px;\r
    padding: 5px;\r
  }\r
  .f-tools-fields select {\r
    font-size: 11px;\r
    padding: 5px;\r
  }\r
  .f-tools-fields label {\r
    font-size: 11px;\r
  }\r
  .f-preview-tools > div:first-child span {\r
    font-size: 11px;\r
  }\r
  .f-pad {\r
    padding: 18px;\r
  }\r
  .f-pad-tabs {\r
    margin: 0 18px;\r
  }\r
  .f-dialog-head,\r
  .f-dialog-body {\r
    padding: 18px;\r
  }\r
  .f-dialog-head h2 {\r
    font-size: 20px;\r
  }\r
  .f-dialog-foot {\r
    padding: 14px 18px;\r
  }\r
  .f-definition {\r
    grid-template-columns: 85px minmax(0, 1fr);\r
    gap: 12px;\r
    font-size: 13px;\r
  }\r
  .f-pager {\r
    padding: 14px 18px;\r
    gap: 8px;\r
  }\r
  .f-pager button {\r
    font-size: 12px;\r
    min-height: 34px;\r
    padding: 6px 9px;\r
  }\r
  .f-rank > div:first-child {\r
    display: grid;\r
    gap: 4px;\r
  }\r
  .f-error {\r
    flex-direction: column;\r
    align-items: start;\r
  }\r
  .f-preview-tools {\r
    margin-bottom: 14px;\r
  }\r
  .f-operation-modal {\r
    width: calc(100vw - 24px);\r
    max-width: calc(100vw - 24px);\r
    height: auto;\r
  }\r
  .chart-controls .inline-label {\r
    font-size: 12px;\r
  }\r
  .chart-controls .inline-label select {\r
    min-width: 100px;\r
    max-width: 175px;\r
  }\r
  .chart-controls {\r
    gap: 10px;\r
  }\r
  .temperature-stats {\r
    margin-top: 0;\r
  }\r
  .modal-shell {\r
    gap: 15px;\r
  }\r
  .f-cost-chart {\r
    gap: 22px;\r
  }\r
  .f-stat strong {\r
    font-size: 21px;\r
  }\r
}\r
@media (max-width: 480px) {\r
  .f-metrics8 {\r
    grid-template-columns: minmax(0, 1fr);\r
  }\r
}\r
.admin-page .worker-version {\r
  display: flex;\r
  width: max-content;\r
  margin-top: 6px;\r
  color: #dce4ee;\r
  background: #171c23;\r
  font-weight: 600;\r
}\r
.admin-page .inventory-chip {\r
  display: flex;\r
  width: max-content;\r
  max-width: 280px;\r
  margin-top: 7px;\r
  line-height: 1.45;\r
}\r
.admin-page .inventory-chip[data-tone='ok'] {\r
  color: var(--ok);\r
  border-color: #315c42;\r
  background: #14231a;\r
}\r
.admin-page .inventory-chip[data-tone='warn'] {\r
  color: var(--warn);\r
  border-color: #665530;\r
  background: #292315;\r
}\r
.admin-page .inventory-chip[data-tone='bad'] {\r
  color: var(--bad);\r
  border-color: #6d3541;\r
  background: #2c1b22;\r
}\r
.admin-page .inventory-audit {\r
  display: grid;\r
  gap: 12px;\r
  border-top: 1px solid var(--soft-line);\r
  padding-top: 18px;\r
}\r
.admin-page .inventory-heading {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  gap: 12px;\r
}\r
.admin-page .inventory-heading .inventory-chip {\r
  margin-top: 0;\r
}\r
.admin-page .inventory-grid {\r
  display: grid;\r
  grid-template-columns: repeat(2, minmax(0, 1fr));\r
  gap: 14px;\r
}\r
.admin-page .inventory-block {\r
  min-width: 0;\r
  padding: 16px;\r
  border: 1px solid var(--line);\r
  border-radius: 8px;\r
  background: var(--surface);\r
}\r
.admin-page .inventory-block h4 {\r
  margin: 0 0 8px;\r
  font-size: 13px;\r
  font-weight: 600;\r
}\r
.admin-page .inventory-block h4:not(:first-child) {\r
  margin-top: 16px;\r
  padding-top: 14px;\r
  border-top: 1px solid var(--soft-line);\r
}\r
.admin-page .inventory-block h4 span {\r
  color: var(--muted);\r
  font-weight: 500;\r
}\r
.admin-page .inventory-list {\r
  max-height: 180px;\r
  margin: 0;\r
  padding-left: 20px;\r
  overflow: auto;\r
  scrollbar-gutter: stable;\r
  color: #dce1e9;\r
  font-size: 13px;\r
  overflow-wrap: anywhere;\r
}\r
.admin-page .inventory-list li + li {\r
  margin-top: 7px;\r
}\r
.admin-page .inventory-list li span {\r
  display: block;\r
  color: var(--muted);\r
  font-size: 11px;\r
}\r
.admin-page [data-capabilities] .f-toolbar {\r
  margin: 12px 0;\r
}\r
.admin-page pre.capabilities-json {\r
  white-space: pre;\r
  overflow-wrap: normal;\r
  min-width: 0;\r
  max-height: 340px;\r
}\r
@media (max-width: 767px) {\r
  .admin-page .inventory-grid {\r
    grid-template-columns: 1fr;\r
  }\r
  .admin-page .inventory-heading {\r
    align-items: flex-start;\r
    flex-direction: column;\r
  }\r
}\r
`,Xs=`.permissions-page .permissions-grid {\r
  display: grid;\r
  grid-template-columns: repeat(2, minmax(0, 1fr));\r
  gap: var(--gap);\r
  align-items: start;\r
}\r
.permissions-page .section-heading {\r
  flex-wrap: wrap;\r
}\r
.permissions-page .page-status:empty,\r
.permissions-page [role='alert']:empty,\r
.permissions-page .f-status:empty {\r
  display: none;\r
}\r
.permissions-page .page-status {\r
  padding: 14px 20px;\r
  border: 1px solid #6f3e4b;\r
  background: #24171d;\r
  border-radius: 10px;\r
  color: #fda4b4;\r
  overflow-wrap: anywhere;\r
}\r
.permissions-page .accounts-table {\r
  min-width: 1050px;\r
}\r
.permissions-page .accounts-table td:first-child {\r
  min-width: 160px;\r
}\r
.permissions-page .row-actions {\r
  min-width: 320px;\r
}\r
.permissions-page .perm-identity {\r
  display: grid;\r
  gap: 3px;\r
  overflow-wrap: anywhere;\r
}\r
.permissions-page .perm-username {\r
  font-weight: 550;\r
}\r
.permissions-page .perm-user-id {\r
  display: block;\r
  color: var(--muted);\r
  font-size: 12px;\r
  overflow-wrap: anywhere;\r
}\r
.permissions-page .f-chip.on {\r
  color: #7bd99d;\r
  border-color: #355d43;\r
  background: #19281f;\r
}\r
.permissions-page .f-chip.off {\r
  color: #fb7185;\r
  border-color: #6d3541;\r
  background: #2c1b22;\r
}\r
.permissions-page .f-chip.admin {\r
  color: #a6d9f4;\r
}\r
.permissions-page .registration-table {\r
  min-width: 600px;\r
}\r
.permissions-page .grant-form {\r
  grid-template-columns: repeat(3, minmax(0, 1fr));\r
  padding-top: 0;\r
}\r
.permissions-page .grant-form button {\r
  justify-self: start;\r
}\r
.permissions-page .allocation-tools {\r
  display: flex;\r
  align-items: end;\r
  gap: 16px;\r
  flex-wrap: wrap;\r
  padding: 0 24px 24px;\r
}\r
.permissions-page .allocation-filters {\r
  display: grid;\r
  grid-template-columns: repeat(2, minmax(150px, 1fr));\r
  gap: 14px;\r
  flex: 1;\r
}\r
.permissions-page .allocation-batch {\r
  display: flex;\r
  align-items: end;\r
  gap: 12px;\r
  flex-wrap: wrap;\r
}\r
.permissions-page .allocation-batch .field {\r
  min-width: 210px;\r
}\r
.permissions-page #project-selected {\r
  align-self: center;\r
  font-size: 13px;\r
  color: var(--muted);\r
}\r
.permissions-page .history-scroll {\r
  max-height: 620px;\r
}\r
.permissions-page .history-scroll th {\r
  position: sticky;\r
  top: 0;\r
  background: var(--panel);\r
  z-index: 1;\r
}\r
.permissions-page .allocation-table td {\r
  overflow-wrap: anywhere;\r
}\r
.permissions-page .perm-id {\r
  max-width: 240px;\r
  font-size: 12px;\r
  color: var(--muted);\r
}\r
.permissions-page .allocation-table .team-space {\r
  display: block;\r
  font-size: 12px;\r
  color: var(--muted);\r
  margin-top: 4px;\r
}\r
.permissions-page .refresh-note {\r
  font-size: 12px;\r
  color: var(--muted);\r
}\r
.permissions-page .dialog-list {\r
  max-height: 320px;\r
  overflow: auto;\r
}\r
.permissions-page .dialog-list table {\r
  min-width: 620px;\r
}\r
.permissions-page .dialog-list td {\r
  overflow-wrap: anywhere;\r
}\r
.permissions-page .dialog-list th {\r
  position: sticky;\r
  top: 0;\r
  background: var(--panel);\r
}\r
.permissions-page .notice-box {\r
  overflow-wrap: anywhere;\r
}\r
.permissions-page .table-wrap {\r
  scrollbar-gutter: stable;\r
}\r
.permissions-page .metric-value {\r
  min-height: 1.25em;\r
}\r
.permissions-page .accounts-scroll,\r
.permissions-page .registrations-scroll {\r
  max-height: 520px;\r
}\r
.permissions-page :is(.accounts-scroll, .registrations-scroll) th {\r
  position: sticky;\r
  top: 0;\r
  background: var(--panel);\r
  z-index: 1;\r
}\r
.permissions-page .section-nav {\r
  display: flex;\r
  gap: 8px;\r
  flex-wrap: wrap;\r
}\r
.permissions-page .section-nav a {\r
  display: flex;\r
  align-items: center;\r
  min-height: 44px;\r
  padding: 9px 14px;\r
  border: 1px solid var(--line);\r
  border-radius: 8px;\r
  background: var(--panel);\r
  font-size: 14px;\r
  color: var(--text);\r
}\r
.permissions-page .section-nav a:hover {\r
  background: var(--hover);\r
  text-decoration: none;\r
}\r
.permissions-page h2[id] {\r
  scroll-margin-top: 24px;\r
}\r
.permissions-page h2[id]:focus-visible {\r
  outline: 2px solid var(--blue);\r
  outline-offset: 4px;\r
}\r
@media (max-width: 1100px) {\r
  .permissions-page .permissions-grid {\r
    grid-template-columns: 1fr;\r
  }\r
}\r
@media (max-width: 767px) {\r
  .permissions-page .allocation-tools {\r
    padding: 0 18px 18px;\r
    display: grid;\r
  }\r
  .permissions-page .allocation-filters {\r
    grid-template-columns: 1fr;\r
  }\r
  .permissions-page .allocation-batch {\r
    display: grid;\r
  }\r
  .permissions-page .allocation-batch .field {\r
    min-width: 0;\r
  }\r
  .permissions-page .grant-form {\r
    grid-template-columns: 1fr;\r
  }\r
  .permissions-page .header-actions {\r
    width: 100%;\r
  }\r
}\r
`,Ys=`/* 页面样式只作用于产能主区及产能对话框，不覆盖共享侧栏。 */\r
@scope (.capacity-page) {\r
  :scope {\r
    color-scheme: dark;\r
    --bg: #0b0d10;\r
    --panel: #111318;\r
    --panel2: #16191f;\r
    --line: #303640;\r
    --muted: #a0a6b1;\r
    --text: #f3f4f6;\r
    --ok: #34d399;\r
    --warn: #fbbf24;\r
    --bad: #fb7185;\r
    --blue: #38bdf8;\r
  }\r
  * {\r
    box-sizing: border-box;\r
  }\r
  [hidden] {\r
    display: none !important;\r
  }\r
  body {\r
    margin: 0;\r
    background: var(--bg);\r
    color: var(--text);\r
    font:\r
      13px/1.6 system-ui,\r
      'Microsoft YaHei',\r
      sans-serif;\r
  }\r
  header {\r
    display: flex;\r
    align-items: center;\r
    flex-wrap: wrap;\r
    gap: 10px;\r
    min-height: 60px;\r
    padding: 10px 22px;\r
    border-bottom: 1px solid var(--line);\r
    background: var(--panel);\r
  }\r
  h1 {\r
    margin: 0;\r
    font-size: 15px;\r
    font-weight: 650;\r
  }\r
  header .state {\r
    margin-right: auto;\r
  }\r
  a,\r
  button,\r
  input,\r
  select,\r
  textarea {\r
    font: inherit;\r
    color: #d3d6dc;\r
    border: 1px solid var(--line);\r
    background: #15181d;\r
    border-radius: 8px;\r
    padding: 7px 11px;\r
  }\r
  a,\r
  button,\r
  select,\r
  summary {\r
    cursor: pointer;\r
  }\r
  a {\r
    text-decoration: none;\r
  }\r
  a:hover,\r
  button:hover {\r
    color: #fff;\r
    border-color: #737985;\r
  }\r
  button:disabled {\r
    opacity: 0.45;\r
    cursor: not-allowed;\r
  }\r
  :focus-visible {\r
    outline: 2px solid var(--blue);\r
    outline-offset: 3px;\r
  }\r
  input,\r
  select,\r
  textarea {\r
    width: 100%;\r
    min-width: 0;\r
  }\r
  main {\r
    max-width: 1440px;\r
    margin: auto;\r
    padding: 24px;\r
  }\r
  h2,\r
  h3,\r
  p {\r
    margin: 0;\r
  }\r
  h2 {\r
    font-size: 14px;\r
    font-weight: 650;\r
  }\r
  h3 {\r
    font-size: 13px;\r
    font-weight: 600;\r
  }\r
  .muted,\r
  .state,\r
  .hint {\r
    color: var(--muted);\r
  }\r
  .hint {\r
    font-size: 12px;\r
  }\r
  .warn {\r
    color: var(--warn);\r
  }\r
  .error {\r
    color: #fecdd3;\r
    background: #351821;\r
    border: 1px solid #713144;\r
    padding: 12px;\r
    border-radius: 8px;\r
    margin-bottom: 14px;\r
  }\r
  .notice {\r
    padding: 12px 15px;\r
    border-left: 3px solid var(--warn);\r
    background: #fbbf2408;\r
  }\r
  .section {\r
    margin-top: 16px;\r
    background: var(--panel);\r
    border: 1px solid var(--line);\r
    border-radius: 12px;\r
    overflow: hidden;\r
  }\r
  .section-head {\r
    display: flex;\r
    flex-wrap: wrap;\r
    align-items: center;\r
    justify-content: space-between;\r
    gap: 10px;\r
    padding: 14px 16px;\r
    border-bottom: 1px solid var(--line);\r
  }\r
  .pad {\r
    padding: 16px;\r
  }\r
  .field {\r
    display: grid;\r
    align-content: start;\r
    gap: 5px;\r
    min-width: 0;\r
  }\r
  .field > span {\r
    color: var(--muted);\r
    font-size: 12px;\r
  }\r
  .tabs {\r
    display: flex;\r
    gap: 8px;\r
    margin-top: 22px;\r
    border-bottom: 1px solid var(--line);\r
  }\r
  .tabs button {\r
    border: 0;\r
    border-bottom: 2px solid transparent;\r
    border-radius: 6px 6px 0 0;\r
    padding: 12px 18px;\r
    background: transparent;\r
  }\r
  .tabs [aria-selected='true'] {\r
    color: var(--blue);\r
    border-bottom-color: var(--blue);\r
    background: #38bdf808;\r
  }\r
  .summary {\r
    display: grid;\r
    grid-template-columns: 1fr 1fr;\r
    gap: 16px;\r
  }\r
  .metrics {\r
    display: grid;\r
    grid-template-columns: repeat(4, minmax(0, 1fr));\r
    gap: 12px;\r
  }\r
  .metric span {\r
    display: block;\r
    color: var(--muted);\r
    font-size: 12px;\r
  }\r
  .metric strong {\r
    display: block;\r
    font-size: 22px;\r
    font-weight: 600;\r
    font-variant-numeric: tabular-nums;\r
  }\r
  .worker-grid {\r
    display: grid;\r
    grid-template-columns: repeat(3, minmax(0, 1fr));\r
    gap: 12px;\r
    padding: 14px;\r
  }\r
  .worker {\r
    min-width: 0;\r
    background: var(--panel2);\r
    border: 1px solid var(--line);\r
    border-radius: 10px;\r
    padding: 14px;\r
    overflow-wrap: anywhere;\r
  }\r
  .worker h3 {\r
    font-size: 15px;\r
  }\r
  .worker p {\r
    margin: 6px 0;\r
  }\r
  .badge {\r
    display: inline-block;\r
    padding: 2px 7px;\r
    border: 1px solid var(--line);\r
    border-radius: 5px;\r
    margin: 2px 5px 2px 0;\r
    font-size: 11px;\r
  }\r
  .worker dl {\r
    display: grid;\r
    grid-template-columns: 70px minmax(0, 1fr);\r
    gap: 5px 10px;\r
  }\r
  dt {\r
    color: var(--muted);\r
  }\r
  dd {\r
    margin: 0;\r
    overflow-wrap: anywhere;\r
  }\r
  .scroll {\r
    overflow: auto;\r
    max-width: 100%;\r
  }\r
  table {\r
    width: 100%;\r
    border-collapse: collapse;\r
    font-variant-numeric: tabular-nums;\r
  }\r
  th,\r
  td {\r
    text-align: left;\r
    vertical-align: top;\r
    padding: 12px 14px;\r
    border-bottom: 1px solid var(--line);\r
  }\r
  th {\r
    font-size: 11px;\r
    font-weight: 600;\r
    color: var(--muted);\r
    white-space: nowrap;\r
    background: #ffffff03;\r
  }\r
  td {\r
    min-width: 110px;\r
  }\r
  td.wide {\r
    min-width: 230px;\r
    max-width: 390px;\r
    overflow-wrap: anywhere;\r
  }\r
  td p {\r
    margin-top: 5px;\r
  }\r
  tbody tr:last-child td {\r
    border-bottom: 0;\r
  }\r
  tbody tr:hover {\r
    background: #ffffff02;\r
  }\r
  ul {\r
    padding-left: 19px;\r
    margin: 6px 0;\r
  }\r
  .empty {\r
    color: var(--muted);\r
    padding: 24px;\r
    text-align: center;\r
  }\r
  .pager {\r
    display: flex;\r
    align-items: center;\r
    flex-wrap: wrap;\r
    justify-content: flex-end;\r
    gap: 12px;\r
    padding: 12px 16px;\r
  }\r
  .evidence {\r
    border-bottom: 1px solid var(--line);\r
    padding: 12px 16px;\r
    overflow-wrap: anywhere;\r
  }\r
  .evidence summary {\r
    line-height: 1.9;\r
  }\r
  .evidence summary .badge {\r
    margin-left: 8px;\r
  }\r
  pre {\r
    white-space: pre-wrap;\r
    overflow-wrap: anywhere;\r
    color: #c2c7d0;\r
    font: 12px/1.6 inherit;\r
    background: var(--bg);\r
    padding: 12px;\r
    border-radius: 6px;\r
    max-height: 360px;\r
    overflow: auto;\r
  }\r
  .review-fields {\r
    display: grid;\r
    grid-template-columns: 1fr 1fr 1fr;\r
    gap: 12px;\r
  }\r
  .review-form {\r
    display: grid;\r
    gap: 12px;\r
    margin-top: 14px;\r
  }\r
  .review-form button {\r
    justify-self: start;\r
  }\r
  .profile-form {\r
    display: grid;\r
    gap: 10px;\r
    margin-top: 12px;\r
  }\r
  .profile-form button {\r
    justify-self: start;\r
  }\r
  .profile-details {\r
    margin-top: 12px;\r
    padding-top: 10px;\r
    border-top: 1px solid var(--line);\r
  }\r
  .write-status {\r
    padding: 10px 12px;\r
    margin-bottom: 14px;\r
    border: 1px solid var(--line);\r
    border-radius: 8px;\r
    color: var(--ok);\r
  }\r
  .worker dd {\r
    white-space: pre-line;\r
  }\r
  .procurement {\r
    display: grid;\r
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);\r
    gap: 16px;\r
    align-items: start;\r
  }\r
  .form-grid {\r
    display: grid;\r
    grid-template-columns: 1fr 1fr;\r
    gap: 12px;\r
  }\r
  #estimate-form {\r
    display: grid;\r
    gap: 16px;\r
  }\r
  .demand {\r
    display: grid;\r
    grid-template-columns: minmax(0, 1fr) 120px auto;\r
    align-items: end;\r
    gap: 10px;\r
    margin: 12px 0;\r
  }\r
  #estimate-result {\r
    display: grid;\r
    gap: 14px;\r
    overflow-wrap: anywhere;\r
  }\r
  .result-number {\r
    font-size: 28px;\r
    font-variant-numeric: tabular-nums;\r
  }\r
  .actions {\r
    display: flex;\r
    align-items: center;\r
    flex-wrap: wrap;\r
    gap: 10px;\r
  }\r
  .primary {\r
    background: #173145;\r
    border-color: #35627c;\r
    color: #e0f2fe;\r
  }\r
  .account-bar {\r
    flex-wrap: wrap;\r
  }\r
  #machine-summary {\r
    margin-top: 20px;\r
  }\r
  .summary-toolbar {\r
    display: flex;\r
    align-items: center;\r
    justify-content: space-between;\r
    flex-wrap: wrap;\r
    gap: 10px;\r
  }\r
  .summary-toolbar h2 {\r
    font-size: 16px;\r
  }\r
  .offline-toggle {\r
    display: flex;\r
    align-items: center;\r
    gap: 8px;\r
  }\r
  .offline-toggle input {\r
    width: auto;\r
    accent-color: var(--blue);\r
  }\r
  .summary-note {\r
    margin: 8px 0 14px;\r
    max-width: 85ch;\r
  }\r
  .comparison-scroll {\r
    max-height: 72vh;\r
    border: 1px solid var(--line);\r
    border-radius: 8px;\r
    background: var(--panel);\r
  }\r
  .online-state {\r
    color: var(--ok);\r
  }\r
  .machine-hardware {\r
    color: var(--muted);\r
    font-size: 12px;\r
    font-variant-numeric: tabular-nums;\r
  }\r
  .simple-table {\r
    table-layout: fixed;\r
    min-width: calc(128px + 300px * var(--machine-count));\r
    border-collapse: separate;\r
    border-spacing: 0;\r
  }\r
  .matrix-axis-col {\r
    width: 128px;\r
  }\r
  .simple-table th,\r
  .simple-table td {\r
    padding: 12px;\r
    border-right: 1px solid var(--line);\r
  }\r
  .simple-table tr > :last-child {\r
    border-right: 0;\r
  }\r
  .simple-table th {\r
    white-space: normal;\r
    font-size: 13px;\r
    font-weight: 400;\r
  }\r
  .simple-table td {\r
    min-width: 0;\r
    overflow-wrap: anywhere;\r
  }\r
  .simple-table thead th {\r
    position: sticky;\r
    top: 0;\r
    z-index: 2;\r
    background: var(--panel2);\r
  }\r
  .simple-table .business-axis {\r
    position: sticky;\r
    left: 0;\r
    z-index: 1;\r
    background: var(--panel2);\r
    color: var(--text);\r
    overflow-wrap: anywhere;\r
  }\r
  .simple-table thead .business-axis {\r
    z-index: 3;\r
  }\r
  .machine-heading {\r
    color: var(--text);\r
    overflow-wrap: anywhere;\r
  }\r
  .machine-heading h3 {\r
    font-size: 15px;\r
  }\r
  .machine-heading .machine-hardware {\r
    margin-top: 5px;\r
  }\r
  .matrix-table .business-row {\r
    display: grid;\r
    gap: 10px;\r
  }\r
  .matrix-models {\r
    display: grid;\r
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);\r
    gap: 12px;\r
  }\r
  .matrix-field {\r
    min-width: 0;\r
  }\r
  .matrix-field::before {\r
    content: attr(data-label);\r
    display: block;\r
    color: var(--muted);\r
    font-size: 11px;\r
    margin-bottom: 3px;\r
  }\r
  .matrix-samples {\r
    display: flex;\r
    align-items: center;\r
    justify-content: space-between;\r
    flex-wrap: wrap;\r
    gap: 6px;\r
  }\r
  .matrix-samples p {\r
    margin: 0;\r
  }\r
  .matrix-samples button {\r
    padding: 4px 8px;\r
  }\r
  .matrix-empty {\r
    color: var(--muted);\r
  }\r
  .simple-table select {\r
    max-width: 100%;\r
    padding: 5px 7px;\r
  }\r
  .selected-spec {\r
    margin: 8px 0 0;\r
  }\r
  .selected-spec dt {\r
    font-size: 11px;\r
    margin-top: 6px;\r
  }\r
  .selected-spec dd {\r
    margin-top: 2px;\r
  }\r
  .input-materials {\r
    display: flex;\r
    flex-wrap: wrap;\r
    gap: 2px 12px;\r
  }\r
  .input-materials span {\r
    overflow-wrap: anywhere;\r
  }\r
  .actual-resolution > span {\r
    display: block;\r
    overflow-wrap: anywhere;\r
  }\r
  .output-probe {\r
    margin: 12px 0;\r
  }\r
  .output-probe p {\r
    margin-top: 6px;\r
  }\r
  .business-title {\r
    font-size: 13px;\r
    font-weight: 600;\r
  }\r
  .mean-time {\r
    display: block;\r
    font-size: 18px;\r
    font-weight: 600;\r
    font-variant-numeric: tabular-nums;\r
  }\r
  .model-label {\r
    display: block;\r
    font-size: 13px;\r
    font-weight: 600;\r
  }\r
  .model-item + .model-item,\r
  .model-variant + .model-variant {\r
    margin-top: 8px;\r
    padding-top: 6px;\r
    border-top: 1px solid var(--line);\r
  }\r
  .model-origin {\r
    margin-bottom: 8px;\r
    color: var(--warn);\r
  }\r
  .model-reference {\r
    margin-top: 12px;\r
    padding-top: 12px;\r
    border-top: 1px solid var(--line);\r
  }\r
  .model-variant {\r
    overflow-wrap: anywhere;\r
  }\r
  .simple-table summary,\r
  .machine-more summary {\r
    color: var(--blue);\r
  }\r
  .summary-evidence {\r
    margin-top: 12px;\r
    max-height: 440px;\r
    overflow: auto;\r
    border-top: 1px solid var(--line);\r
  }\r
  .summary-evidence .pad {\r
    padding: 12px 0;\r
  }\r
  .machine-more {\r
    margin-top: 10px;\r
  }\r
  .machine-more p {\r
    margin-top: 6px;\r
  }\r
  .advanced {\r
    margin-top: 18px;\r
  }\r
  .advanced > summary {\r
    padding: 14px 16px;\r
    color: var(--muted);\r
  }\r
  #technical-details > .summary {\r
    padding: 0 14px;\r
  }\r
  #technical-details > .section {\r
    margin: 14px;\r
  }\r
  @media (max-width: 1100px) {\r
    .worker-grid {\r
      grid-template-columns: repeat(2, minmax(0, 1fr));\r
    }\r
    .summary,\r
    .procurement {\r
      grid-template-columns: 1fr;\r
    }\r
  }\r
  @media (max-width: 700px) {\r
    .matrix-axis-col {\r
      width: 104px;\r
    }\r
    .matrix-table {\r
      min-width: calc(104px + (100vw - var(--workspace-width) - 130px) * var(--machine-count));\r
    }\r
    .matrix-models {\r
      grid-template-columns: 1fr;\r
    }\r
    main {\r
      padding: 12px;\r
    }\r
    header {\r
      padding: 12px;\r
    }\r
    header .state {\r
      width: 100%;\r
      order: 5;\r
    }\r
    .worker-grid {\r
      grid-template-columns: 1fr;\r
      padding: 10px;\r
    }\r
    .metrics {\r
      grid-template-columns: 1fr 1fr;\r
    }\r
    .tabs button {\r
      flex: 1;\r
      padding: 12px 4px;\r
    }\r
    .form-grid,\r
    .review-fields {\r
      grid-template-columns: 1fr;\r
    }\r
    .demand {\r
      grid-template-columns: minmax(0, 1fr) 90px;\r
    }\r
    .demand > button {\r
      grid-column: 2;\r
    }\r
  }\r
  @media (max-width: 480px) {\r
    .demand {\r
      grid-template-columns: minmax(0, 1fr);\r
    }\r
    .demand > button {\r
      grid-column: auto;\r
      justify-self: end;\r
    }\r
  }\r
  @media (prefers-reduced-motion: reduce) {\r
    * {\r
      scroll-behavior: auto !important;\r
      transition: none !important;\r
    }\r
  }\r
  :scope:is(main) {\r
    max-width: none;\r
    margin: 0;\r
    padding: var(--pad);\r
    min-width: 0;\r
    font-size: 14px;\r
    line-height: 1.6;\r
  }\r
  :scope:is(main).page {\r
    gap: var(--gap);\r
    align-content: start;\r
  }\r
  header.page-header {\r
    border: 1px solid var(--line);\r
    border-radius: var(--radius);\r
    padding: 23px 25px;\r
    gap: 20px;\r
  }\r
  h1 {\r
    font-size: 30px;\r
    font-weight: 650;\r
  }\r
  h2 {\r
    font-size: 21px;\r
  }\r
  h3 {\r
    font-size: 17px;\r
  }\r
  .subtitle {\r
    color: #b5bbc5;\r
    font-size: 14px;\r
    margin-top: 8px;\r
  }\r
  a,\r
  button,\r
  input,\r
  select,\r
  textarea {\r
    color: var(--text);\r
  }\r
  button {\r
    min-height: 40px;\r
    background: #1a1f27;\r
    border-color: #39414d;\r
  }\r
  input,\r
  select,\r
  textarea {\r
    background: var(--surface);\r
    border-color: #39414d;\r
    min-height: 42px;\r
  }\r
  .primary {\r
    background: #edf0f5;\r
    color: #15181d;\r
    border-color: #e5e9ef;\r
    font-weight: 600;\r
  }\r
  .primary:hover {\r
    background: #fff;\r
    color: #15181d;\r
  }\r
  .hint {\r
    font-size: 12px;\r
  }\r
  .pad {\r
    padding: 24px;\r
  }\r
  .section {\r
    margin-top: 0;\r
    border-radius: var(--radius);\r
  }\r
  .section-head {\r
    padding: 20px 24px;\r
    border-bottom-color: var(--soft-line);\r
  }\r
  .tabs {\r
    margin-top: 0;\r
    gap: 28px;\r
  }\r
  .tabs button {\r
    background: none;\r
    padding: 4px 2px 14px;\r
    border: 0;\r
    border-radius: 0;\r
    color: var(--muted);\r
  }\r
  .tabs [aria-selected='true'] {\r
    color: var(--text);\r
    background: none;\r
    border-bottom: 0;\r
  }\r
  #capacity-stats {\r
    gap: 14px;\r
  }\r
  #capacity-stats .metric {\r
    display: block;\r
    padding: 16px;\r
    min-height: 100px;\r
    border: 1px solid var(--soft-line);\r
    border-radius: 10px;\r
    background: var(--surface);\r
  }\r
  #capacity-stats strong {\r
    font-size: 25px;\r
    margin-top: 8px;\r
  }\r
  #panel-machines,\r
  #panel-scenarios,\r
  #panel-purchase {\r
    min-width: 0;\r
    display: grid;\r
    gap: 20px;\r
  }\r
  #machine-summary {\r
    margin-top: 0;\r
    border: 1px solid var(--line);\r
    border-radius: var(--radius);\r
    background: var(--panel);\r
    overflow: hidden;\r
  }\r
  .summary-toolbar {\r
    padding: 20px 24px 0;\r
  }\r
  .summary-toolbar h2 {\r
    font-size: 21px;\r
  }\r
  .summary-note {\r
    max-width: none;\r
    margin: 14px 24px 18px;\r
  }\r
  #summary-machines {\r
    padding: 0 24px;\r
  }\r
  .comparison-scroll {\r
    max-height: min(900px, 65dvh);\r
    border: 0;\r
    border-radius: 0;\r
    scrollbar-gutter: stable;\r
  }\r
  .simple-table {\r
    min-width: calc(180px + 340px * var(--machine-count));\r
  }\r
  .matrix-axis-col {\r
    width: 180px;\r
  }\r
  .simple-table th,\r
  .simple-table td {\r
    padding: 20px 16px;\r
    border-color: var(--soft-line);\r
    font-size: 13px;\r
  }\r
  .simple-table thead th {\r
    background: var(--surface);\r
    z-index: 3;\r
  }\r
  .simple-table .business-axis {\r
    background: var(--panel);\r
    z-index: 2;\r
  }\r
  .simple-table thead .business-axis {\r
    background: var(--surface);\r
    z-index: 4;\r
  }\r
  .machine-heading h3 {\r
    font-size: 15px;\r
  }\r
  .business-title {\r
    font-size: 14px;\r
  }\r
  .matrix-table .business-row {\r
    gap: 16px;\r
  }\r
  .matrix-field::before {\r
    font-size: 12px;\r
  }\r
  .mean-time {\r
    font-size: 24px;\r
    line-height: 1.4;\r
    margin: 4px 0;\r
  }\r
  .matrix-models {\r
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);\r
    gap: 12px;\r
  }\r
  .model-label,\r
  .model-name {\r
    font-size: 12px;\r
    font-weight: 400;\r
  }\r
  .selected-spec {\r
    display: grid;\r
    gap: 3px;\r
  }\r
  /* 同图多主模型共用行轨道，长文件名换行时精度仍对应本行模型。 */\r
  .matrix-models {\r
    grid-template-rows: repeat(var(--model-rows, 2), auto);\r
    row-gap: 0;\r
  }\r
  .matrix-models > .matrix-field {\r
    display: grid;\r
    grid-template-rows: subgrid;\r
    grid-row: 1 / span var(--model-rows, 2);\r
  }\r
  .matrix-models > .matrix-field:first-child {\r
    grid-column: 1;\r
  }\r
  .matrix-models > .matrix-field:last-child {\r
    grid-column: 2;\r
  }\r
  .matrix-models .model-variant {\r
    display: contents;\r
  }\r
  .matrix-models .model-item {\r
    padding: 4px 0;\r
  }\r
  .matrix-models .model-variant + .model-variant > .model-item:first-child {\r
    margin-top: 8px;\r
    padding-top: 8px;\r
    border-top: 1px solid var(--line);\r
  }\r
  .selected-spec dt {\r
    margin-top: 8px;\r
  }\r
  .matrix-samples {\r
    justify-content: flex-start;\r
    gap: 8px;\r
  }\r
  .summary-evidence {\r
    max-height: 560px;\r
  }\r
  .summary-evidence .pad {\r
    padding: 16px 0;\r
  }\r
  .matrix-samples button,\r
  .machine-more button {\r
    min-height: 32px;\r
    font-size: 12px;\r
    padding: 6px 9px;\r
  }\r
  .matrix-actions {\r
    display: flex;\r
    flex-wrap: wrap;\r
    gap: 12px;\r
    padding: 24px;\r
  }\r
  #technical-details > summary,\r
  #task-evidence > summary {\r
    padding: 18px 24px;\r
    font-size: 16px;\r
    color: #dce2ec;\r
  }\r
  #technical-details > .summary {\r
    padding: 0 24px;\r
    gap: 20px;\r
  }\r
  #technical-details > .section {\r
    margin: 20px 24px;\r
  }\r
  .metrics .metric {\r
    display: block;\r
    min-height: 0;\r
    padding: 0;\r
  }\r
  .metrics {\r
    gap: 14px;\r
  }\r
  .worker-grid {\r
    grid-template-columns: repeat(2, minmax(0, 1fr));\r
    padding: 24px;\r
    gap: 20px;\r
  }\r
  .worker {\r
    background: var(--panel);\r
    border-radius: 14px;\r
    padding: 24px;\r
  }\r
  .worker dl {\r
    grid-template-columns: 90px minmax(0, 1fr);\r
    gap: 10px 14px;\r
    font-size: 13px;\r
  }\r
  .badge {\r
    background: var(--surface);\r
    border-color: #3a424e;\r
  }\r
  .scroll {\r
    scrollbar-width: thin;\r
    scrollbar-color: #3e4652 transparent;\r
  }\r
  #machine-groups table,\r
  #scenario-groups table {\r
    min-width: 1500px;\r
  }\r
  th,\r
  td {\r
    border-color: var(--soft-line);\r
  }\r
  td {\r
    font-size: 14px;\r
  }\r
  .procurement {\r
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);\r
    gap: 20px;\r
  }\r
  #estimate-form > .form-grid {\r
    grid-template-columns: repeat(3, minmax(0, 1fr));\r
  }\r
  .demand {\r
    padding: 16px 0;\r
    border-top: 1px solid var(--soft-line);\r
  }\r
  .result-number {\r
    font-size: 42px;\r
    font-weight: 650;\r
  }\r
  .notice {\r
    background: var(--surface);\r
    border: 1px solid var(--line);\r
    border-radius: 8px;\r
    padding: 14px 18px;\r
  }\r
  .evidence {\r
    margin: 16px 24px;\r
    border: 1px solid var(--line);\r
    border-radius: 14px;\r
    padding: 0;\r
  }\r
  .evidence > summary {\r
    padding: 18px 24px;\r
    font-size: 14px;\r
  }\r
  .evidence-content {\r
    padding: 0 24px 24px;\r
    display: grid;\r
    gap: 16px;\r
  }\r
  .evidence-filters {\r
    display: grid;\r
    grid-template-columns: 2fr 1fr 1fr 1fr;\r
    gap: 16px;\r
    padding: 0 24px 20px;\r
  }\r
  .pager {\r
    padding: 16px 24px;\r
    border-top: 1px solid var(--soft-line);\r
  }\r
  pre {\r
    margin: 0;\r
    font:\r
      12px/1.8 ui-monospace,\r
      SFMono-Regular,\r
      Consolas,\r
      monospace;\r
    border: 1px solid var(--soft-line);\r
    padding: 16px;\r
  }\r
  .output-resolution-details {\r
    padding: 16px;\r
    border: 1px solid var(--soft-line);\r
    border-radius: 10px;\r
  }\r
  .output-resolution-details p,\r
  .pad > p + p {\r
    margin-top: 9px;\r
  }\r
  .profile-form {\r
    grid-template-columns: 1fr 1fr;\r
  }\r
  .profile-form > p {\r
    grid-column: 1/-1;\r
  }\r
  .profile-form,\r
  .review-form {\r
    margin-top: 0;\r
  }\r
  .review-fields {\r
    grid-template-columns: 1fr 1fr;\r
  }\r
  .review-fields > :last-child {\r
    grid-column: 1/-1;\r
  }\r
  .capacity-operation {\r
    display: grid;\r
    gap: 18px;\r
  }\r
  .profile-details summary {\r
    color: var(--blue);\r
  }\r
  @media (min-width: 2000px) {\r
    h1 {\r
      font-size: 34px;\r
    }\r
    h2,\r
    .summary-toolbar h2 {\r
      font-size: 23px;\r
    }\r
  }\r
  @media (max-width: 1200px) {\r
    .procurement,\r
    .summary {\r
      grid-template-columns: 1fr;\r
    }\r
  }\r
  @media (max-width: 767px) {\r
    main {\r
      padding: var(--pad);\r
    }\r
    header.page-header {\r
      padding: 20px;\r
    }\r
    h1 {\r
      font-size: 25px;\r
    }\r
    h2,\r
    .summary-toolbar h2 {\r
      font-size: 19px;\r
    }\r
    .worker-grid,\r
    .profile-form,\r
    .review-fields,\r
    #estimate-form > .form-grid {\r
      grid-template-columns: 1fr;\r
    }\r
    .evidence-filters {\r
      grid-template-columns: 1fr 1fr;\r
    }\r
    .summary-toolbar {\r
      padding: 18px 18px 0;\r
    }\r
    .summary-note {\r
      margin: 12px 18px;\r
    }\r
    #summary-machines {\r
      padding: 0 18px;\r
    }\r
    .matrix-axis-col {\r
      width: 110px;\r
    }\r
    .simple-table {\r
      min-width: calc(110px + 300px * var(--machine-count));\r
    }\r
    .simple-table th,\r
    .simple-table td {\r
      padding: 16px 12px;\r
    }\r
    .matrix-models {\r
      grid-template-columns: 1fr;\r
    }\r
    .comparison-scroll {\r
      max-height: 70dvh;\r
    }\r
    .evidence {\r
      margin: 12px;\r
    }\r
    .evidence-content {\r
      padding: 0 14px 18px;\r
    }\r
    .pad,\r
    .worker-grid,\r
    .worker {\r
      padding: 18px;\r
    }\r
  }\r
  @media (max-width: 767px) {\r
    .matrix-models {\r
      grid-template-rows: none;\r
      row-gap: 12px;\r
    }\r
    .matrix-models > .matrix-field {\r
      display: block;\r
      grid-column: 1;\r
      grid-row: auto;\r
    }\r
    .matrix-models > .matrix-field:last-child {\r
      grid-column: 1;\r
    }\r
    .matrix-models .model-variant {\r
      display: block;\r
    }\r
    .demand {\r
      grid-template-columns: 1fr;\r
    }\r
    .demand > button {\r
      grid-column: auto;\r
      justify-self: start;\r
    }\r
    .input-materials {\r
      max-width: 180px;\r
    }\r
  }\r
  @media (max-width: 480px) {\r
    .evidence-filters {\r
      grid-template-columns: 1fr;\r
    }\r
    .section-head {\r
      padding: 18px;\r
    }\r
    .tabs {\r
      gap: 18px;\r
    }\r
    .tabs button {\r
      font-size: 13px;\r
    }\r
  }\r
}\r
/* 对话框本身是作用域根，独立限定根节点高度，避免原生上下 inset 拉伸。 */\r
dialog.capacity-page {\r
  height: fit-content;\r
  max-height: 88dvh;\r
}\r
`,Zs=`@scope (.admin-page) {
${Js.replace(/:root\b/g,":scope").replace(/^body \{/m,":scope {").replace(/body\.admin-page\b/g,":scope").replace(/\.admin-page\b/g,":scope")}
${Xs.replace(/\.permissions-page\b/g,":scope.permissions-page")}
${Ys}
}`;function cn({page:n,children:r}){const t=Kr();return m.useLayoutEffect(()=>{const a=document.body;return a.dataset.choukaPage=n,a.dataset.workspace=n,()=>{a.dataset.choukaPage===n&&delete a.dataset.choukaPage,a.dataset.workspace===n&&delete a.dataset.workspace}},[n]),m.useEffect(()=>{let a=!0;return t.auth.me().then(()=>{if(!a)return;const i=document.getElementById("account");i&&!i.childElementCount&&t.auth.mountAccount(i);for(const s of document.querySelectorAll("#workspace-nav a"))new URL(s.href).pathname===location.pathname?s.setAttribute("aria-current","page"):s.removeAttribute("aria-current")}).catch(()=>{}),()=>{a=!1}},[t,n]),e.jsxs(e.Fragment,{children:[e.jsx("style",{children:Zs}),e.jsx(yt,{page:n,workspace:!0,children:r})]})}function ti(){return e.jsx(cn,{page:"controller",children:n=>e.jsx(ma,{...n})})}function ai(){return e.jsx(cn,{page:"permissions",children:n=>e.jsx(Ma,{...n})})}function si(){return e.jsx(cn,{page:"costs",children:n=>e.jsx(Ya,{...n})})}function ii(){return e.jsx(cn,{page:"capacity",children:n=>e.jsx(Ks,{...n})})}export{ii as CapacityWorkspace,ti as ControllerWorkspace,si as CostsWorkspace,ai as PermissionsWorkspace};
