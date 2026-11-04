import{HttpClient as Br,reactExports as m,errorMessage as ne,jsxRuntimeExports as e,ApiError as Hr}from"./http-DOrwCtZg.js";import{createSessionService as Vr,userSchema as Gr,LoadingRequest as Kr,jsonSchema as H,useWorkspaceRuntime as Jr}from"./main-D-c512ei.js";import{object as q,number as V,boolean as Y,_enum as Ve,looseObject as G,literal as ie,string as C,array as O,unknown as ar,union as pe,discriminatedUnion as Xr,NEVER as Yr,_null as ir,record as Sn}from"./monitor-alerts-SRWMPPW3.js";import{reactDomExports as Zr}from"./index-BgVeoShv.js";const Qr=q({maintenance_active:Y().optional(),comfy_online:Y().optional(),sandbox:Y().optional()}),et=q({online_users:V().finite().nonnegative()}),nt=q({user:Gr});function rt({fetcher:n=window.fetch.bind(window),origin:r=window.location.origin,onExpired:t,onSandbox:s,onDenied:i=()=>{}}){let a=!1;const o=async(g,u)=>{const y=await n(g,u);return a||(y.headers.get("X-H3Card-Sandbox")==="local-copy"&&s(),y.status===403&&i()),y},l=new Br(o,r,()=>{a||t()});let p,d;const c=new Set;return{http:l,session:Vr(l),health(){if(p)return p;const g=new AbortController;c.add(g);const u=window.setTimeout(()=>g.abort(),4e3);return p=l.read("/api/health",Qr,{cache:"no-store",signal:g.signal}).then(y=>(!a&&y.sandbox===!0&&s(),y)).finally(()=>{window.clearTimeout(u),c.delete(g),p=void 0}),p},presence(){return d??=l.json("/api/auth/presence","POST").then(g=>et.parse(g)).finally(()=>{d=void 0}),d},async savePhone(g){const u=g.trim();if(!/^1[3-9][0-9]{9}$/.test(u))throw new Error("请输入有效的 11 位中国大陆手机号");const y=nt.parse(await l.json("/api/auth/phone","POST",{phone:u})).user;if(!y.phone)throw new Error("手机号尚未保存，请重试");return y},async changePassword(g,u,y){if(u.length<8)throw new Error("新密码至少需要 8 位");if(u!==y)throw new Error("两次输入的新密码不一致");await l.json("/api/auth/password","POST",{current_password:g,new_password:u})},dispose(){a=!0,c.forEach(g=>g.abort()),c.clear(),l.invalidate()}}}function tt(n,r){return!r&&n.phone===""}function Fn(n){return n==="admin"?null:n==="monitor"?"/monitor":"/"}function Je(n){return n.maintenance_active!==!0?"clear":n.comfy_online===!0?"partial":"blocked"}function st(n){const[r,t]=m.useState(null),[s,i]=m.useState(!1),[a,o]=m.useState(""),[l,p]=m.useState(0);m.useEffect(()=>{let u=!1,y=!1,j=()=>{};const w=()=>document.hidden?new Promise(x=>{const k=()=>{document.hidden&&!u||(document.removeEventListener("visibilitychange",k),x())};document.addEventListener("visibilitychange",k),j=()=>{document.removeEventListener("visibilitychange",k),x()}}):Promise.resolve(),v=()=>{u||(u=!0,h.dispose(),t(null),o("登录已失效，请重新登录"),n("/login"))},f=x=>{const k=Fn(x.role);return k?(u=!0,h.dispose(),t(null),n(k),!1):!0},h=rt({onExpired:v,onSandbox:()=>{u||i(!0)},onDenied:()=>{u||y||(y=!0,h.session.me().then(x=>{!u&&f(x.user)&&t(k=>k&&{...k,user:x.user,localTest:x.local_test===!0})}).catch(()=>{}).finally(()=>{y=!1}))}});return t(null),o(""),i(!1),(async()=>{try{const x=await h.session.me();if(u||!f(x.user)||(await w(),u))return;const k=await h.health().catch(()=>({}));u||t({user:x.user,localTest:x.local_test===!0,services:h,initialHealth:k})}catch(x){u||o(ne(x))}})(),()=>{u=!0,j(),h.dispose()}},[l,n]);const d=m.useCallback(()=>p(u=>u+1),[]),c=m.useCallback(u=>{const y=Fn(u.role);y?(r?.services.dispose(),t(null),n(y)):t(j=>j&&{...j,user:u})},[r,n]),g=m.useCallback(()=>{r?.services.dispose(),t(null),o("登录已失效，请重新登录"),n("/login")},[r,n]);return{session:r,sandbox:s,error:a,retry:d,updateUser:c,expire:g}}function at(n,r,t=!0){const[s,i]=m.useState(null),[a,o]=m.useState(()=>Je(r)),[l,p]=m.useState(()=>Je(r)!=="clear");return m.useEffect(()=>{if(!t)return;let d=!0,c=Je(r),g;const u=()=>{g=window.setTimeout(()=>{d&&p(!1)},5e3)};c==="partial"&&u();const y=()=>{document.hidden||n.presence().then(h=>{d&&i(h.online_users)}).catch(()=>{})},j=()=>{document.hidden||n.health().then(h=>{if(!d)return;const x=Je(h);x!==c&&(c=x,window.clearTimeout(g),o(x),p(x!=="clear"),x==="partial"&&u())}).catch(()=>{})};y();const w=window.setInterval(y,3e4),v=window.setInterval(j,5e3),f=()=>{document.hidden||(y(),j())};return document.addEventListener("visibilitychange",f),()=>{d=!1,window.clearTimeout(g),window.clearInterval(w),window.clearInterval(v),document.removeEventListener("visibilitychange",f)}},[n,r,t]),{online:s,maintenance:a,maintenanceVisible:l}}const it={dashboard:"M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1",costs:"M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2M14 11h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-2.5M12 17v1m0 -8v1",capacity:"M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14M4 20h14",permissions:"M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0M8 11v-4a4 4 0 1 1 8 0v4",teams:"M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0 -3 -3.85",refresh:"M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4",chevron:"M9 6l6 6l-6 6",external:"M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6M11 13l9 -9M15 4h5v5",logout:"M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2M9 12h12l-3 -3M18 15l3 -3",check:"M5 12l4 4l10 -10",info:"M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0 -18M12 11v6M12 7h.01",alert:"M12 9v4M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0M12 16h.01"};function Oe({name:n,className:r="",...t}){return e.jsx("svg",{className:`icon ${r}`,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.7,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",...t,children:e.jsx("path",{d:it[n]})})}const ot="_application_gguf9_1",lt="_workspace_gguf9_12",ct="_sandbox_gguf9_15",dt="_navigation_gguf9_18",pt="_accountMenu_gguf9_225",mt="_infoRow_gguf9_281",ut="_dialog_gguf9_295",ht="_maintenance_gguf9_361",xt="_notifications_gguf9_409",ft="_notificationItem_gguf9_441",gt="_notificationHeading_gguf9_466",bt="_notificationIcon_gguf9_477",yt="_notificationMessage_gguf9_495",vt="_notificationLabel_gguf9_504",ae={application:ot,workspace:lt,sandbox:ct,navigation:dt,accountMenu:pt,infoRow:mt,dialog:ut,maintenance:ht,notifications:xt,notificationItem:ft,notificationHeading:gt,notificationIcon:bt,notificationMessage:yt,notificationLabel:vt},jt={error:"alert",warning:"alert",success:"check",status:"info"},wt={error:"错误",warning:"警告",success:"成功",status:"提示"},or=m.createContext({notify:()=>{},registerModal:()=>()=>{}}),lr=()=>m.useContext(or);function _t({children:n}){const[r,t]=m.useState([]),[s,i]=m.useState([]),a=m.useCallback(p=>(i(d=>[...d,p]),()=>i(d=>d.filter(c=>c!==p))),[]),o=m.useCallback(p=>{const d=typeof p=="string"?{message:p,tone:"status"}:p instanceof Error?{message:p.message,tone:"error"}:{message:p.message,tone:p.tone??"status"};t(c=>c.some(g=>g.message===d.message&&g.tone===d.tone)?c:[...c,d])},[]),l=s.at(-1)??document.body;return e.jsxs(or.Provider,{value:{notify:o,registerModal:a},children:[n,r.length>0&&Zr.createPortal(e.jsx(kt,{notices:r,dismiss:p=>t(d=>d.filter(c=>c!==p)),clear:()=>t([])}),l)]})}function kt({notices:n,dismiss:r,clear:t}){const s=m.useRef(null);m.useEffect(()=>{const o=s.current;if(o?.isConnected)return o.showPopover?.(),()=>{o.isConnected&&o.hidePopover?.()}},[]);const i=o=>{const l=s.current?.contains(document.activeElement),p=s.current?.parentElement;o(),l&&queueMicrotask(()=>{(s.current?.querySelector("button")??p?.querySelector("[data-operation-status],button")??document.querySelector("main"))?.focus({preventScroll:!0})})},a=["error","warning","success","status"].find(o=>n.some(l=>l.tone===o))??"status";return e.jsxs("section",{id:"admin-notifications","data-tone":a,ref:s,popover:"manual",className:ae.notifications,"aria-label":"操作通知",children:[e.jsxs("div",{className:ae.notificationHeading,children:[e.jsx(Oe,{name:jt[a],className:ae.notificationIcon}),e.jsx("strong",{children:"操作通知"}),e.jsx("button",{type:"button","aria-label":"关闭全部通知",onClick:()=>i(t),children:"全部关闭"})]}),n.map(o=>e.jsxs("div",{className:ae.notificationItem,"data-tone":o.tone,children:[e.jsxs("p",{className:ae.notificationMessage,role:o.tone==="error"?"alert":"status","aria-atomic":"true",children:[e.jsx("span",{className:ae.notificationLabel,children:wt[o.tone]}),o.message]}),e.jsx("button",{type:"button","aria-label":`关闭通知：${o.message}`,onClick:()=>i(()=>r(o)),children:"×"})]},`${o.tone}:${o.message}`))]})}function re({title:n,children:r,onClose:t,onSubmit:s,submitLabel:i="确认",className:a="",showFooter:o=!0,dismissible:l=!0,closeLabel:p,id:d}){const c=m.useId(),g=m.useRef(null),u=m.useRef(null),y=m.useRef(!1),j=m.useRef(!1),w=m.useRef(!1),[v,f]=m.useState(!1),[h,x]=m.useState(""),[k]=m.useState(()=>{const N=document.activeElement instanceof HTMLElement?document.activeElement:null;return{element:N,key:N?.dataset.focusKey}}),{registerModal:L}=lr();m.useLayoutEffect(()=>{const N=g.current;if(!N)return;j.current=!0;const E=k.element,b=k.key;N.showModal();const R=L(N);return document.body.classList.add("modal-open"),()=>{j.current=!1,N.querySelectorAll('input[type="password"]').forEach(z=>{z.value=""}),N.open&&N.close(),R();const D=()=>{if(document.querySelector("dialog[open]"))return;document.body.classList.remove("modal-open");const z=b?[...document.querySelectorAll("[data-focus-key]")].find(J=>J.dataset.focusKey===b):null,S=document.querySelector("main");S&&!S.hasAttribute("tabindex")&&(S.tabIndex=-1);const Q=J=>J?.isConnected&&(J.tabIndex>=0||J.hasAttribute("tabindex")||J.isContentEditable)&&!J.closest("[inert],[hidden]")&&!J.matches(':disabled,input[type="hidden"]');(Q(E)?E:Q(z)?z:S)?.focus({preventScroll:!0})};D(),queueMicrotask(D)}},[L,k]),m.useLayoutEffect(()=>{(v||h)&&u.current?.focus({preventScroll:!0})},[v,h]);const T=()=>{y.current||w.current||(w.current=!0,g.current?.querySelectorAll('input[type="password"]').forEach(N=>{N.value=""}),g.current?.open&&g.current.close(),t())},_=N=>{y.current&&(N.preventDefault(),N.stopPropagation())};return e.jsx("dialog",{id:d,ref:g,className:`f-operation-modal admin-dialog ${ae.dialog} ${a}`,"aria-labelledby":c,tabIndex:-1,onCancel:N=>{N.preventDefault(),l&&T()},onClose:N=>{const E=N.currentTarget;if(!(!j.current||w.current||E.open)){if(y.current||!l){E.showModal(),y.current&&u.current?.focus({preventScroll:!0});return}T()}},onClick:N=>{if(N.target!==N.currentTarget||!l)return;const E=N.currentTarget.getBoundingClientRect();(N.clientX<E.left||N.clientX>E.right||N.clientY<E.top||N.clientY>E.bottom)&&T()},onKeyDown:N=>{if(N.stopPropagation(),N.key!=="Tab")return;const E=[...N.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(D=>!D.closest("[inert]")&&!D.hidden).sort((D,z)=>D.compareDocumentPosition(z)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1),b=E[0],R=E.at(-1);if(!b||!R){N.preventDefault(),u.current?.focus();return}N.shiftKey&&(document.activeElement===b||!E.includes(document.activeElement instanceof HTMLElement?document.activeElement:b))?(N.preventDefault(),R.focus()):!N.shiftKey&&(document.activeElement===R||!E.includes(document.activeElement instanceof HTMLElement?document.activeElement:R))&&(N.preventDefault(),b.focus())},children:e.jsxs("form",{"aria-busy":v||void 0,"data-busy":v?"true":void 0,onSubmit:async N=>{N.preventDefault();const E=N.currentTarget;if(!(y.current||!s||!E.reportValidity())){y.current=!0,f(!0),x("");try{await s(E),j.current&&(y.current=!1,T())}catch(b){j.current&&x(`${ne(b)}；输入已保留，可重试。`)}finally{y.current=!1,j.current&&f(!1)}}},children:[e.jsxs("header",{className:"f-dialog-head",children:[e.jsx("h2",{id:c,children:n}),l&&e.jsx("button",{type:"button",className:"close-button","data-cancel":"","aria-label":"关闭弹窗",disabled:v,onClick:T,children:"×"})]}),e.jsxs("div",{className:"f-dialog-body",children:[e.jsx("div",{"data-dialog-content":"",inert:v,onClickCapture:_,onKeyDownCapture:_,onInputCapture:_,onChangeCapture:_,children:r}),e.jsx("p",{ref:u,className:`f-status ${h?"danger":""}`,role:h?"alert":"status",tabIndex:-1,"data-operation-status":"",children:h||(v?"正在提交…":"")})]}),o&&e.jsxs("footer",{className:"f-dialog-foot",children:[e.jsx("button",{type:"button","data-cancel":"",disabled:v,onClick:T,children:p??(s?"取消":"知道了")}),s&&e.jsx("button",{type:"submit",className:"primary",disabled:v,children:v?"正在提交…":i})]})]})})}function Nt({user:n,localTest:r,services:t,expire:s}){const[i,a]=m.useState(!1),[o,l]=m.useState(null),[p,d]=m.useState({}),[c,g]=m.useState(!1),u=m.useRef(!1),y=m.useRef(null),j=m.useRef(null),w=n.display_name?.trim()||n.username,v=()=>{a(!1),y.current?.focus({preventScroll:!0})};return m.useLayoutEffect(()=>{const f=j.current;if(f)if(i){const h=y.current?.getBoundingClientRect();h&&d({left:Math.max(8,Math.min(h.left,window.innerWidth-Math.min(260,window.innerWidth-16)-8)),bottom:Math.max(8,window.innerHeight-h.top+8),maxHeight:Math.max(44,h.top-16)}),f.showPopover?.(),f.querySelector("button")?.focus()}else f.hidePopover?.()},[i]),m.useEffect(()=>{if(!i)return;const f=()=>a(!1),h=x=>{x.target instanceof Node&&!j.current?.contains(x.target)&&!y.current?.contains(x.target)&&f()};return window.addEventListener("resize",f),document.addEventListener("pointerdown",h),()=>{window.removeEventListener("resize",f),document.removeEventListener("pointerdown",h)}},[i]),e.jsx("div",{id:"account",className:"account-bar",children:r?e.jsx("span",{className:"chip",children:"本地测试 · 免登录"}):e.jsxs(e.Fragment,{children:[e.jsxs("button",{ref:y,className:"account-trigger",type:"button","aria-label":`用户菜单：${w}`,"aria-haspopup":"menu","aria-expanded":i,"aria-controls":"account-menu","data-focus-key":"admin-account",onClick:()=>a(f=>!f),onKeyDown:f=>{(f.key==="ArrowDown"||f.key==="ArrowUp")&&(f.preventDefault(),a(!0))},children:[e.jsx("span",{className:"account-avatar","aria-hidden":"true",children:Array.from(w)[0]?.toUpperCase()||"?"}),e.jsx("span",{className:"account-name",children:w})]}),e.jsxs("div",{ref:j,id:"account-menu",className:`account-menu ${ae.accountMenu}`,role:"menu","aria-label":"账号菜单",popover:"auto",hidden:!i,style:p,onToggle:f=>{f.newState==="closed"&&a(!1)},onKeyDown:f=>{if(f.stopPropagation(),f.key==="Escape"){f.preventDefault(),v();return}if(f.key==="Tab"){a(!1);return}if(!["ArrowDown","ArrowUp","Home","End"].includes(f.key))return;f.preventDefault();const h=[...f.currentTarget.querySelectorAll('[role="menuitem"]:not(:disabled)')],x=h.findIndex(L=>L===document.activeElement),k=f.key==="Home"?0:f.key==="End"?h.length-1:(x+(f.key==="ArrowDown"?1:-1)+h.length)%h.length;h[k]?.focus()},children:[e.jsxs("div",{className:"account-menu-heading",role:"presentation",children:[e.jsx("b",{children:w}),e.jsxs("small",{children:[n.username," · 管理员"]})]}),e.jsx("button",{type:"button",role:"menuitem",className:"account-action",onClick:()=>{v(),l("info")},children:"用户信息"}),e.jsx("button",{type:"button",role:"menuitem",className:"account-action",onClick:()=>{v(),l("password")},children:"修改密码"}),e.jsxs("button",{type:"button",role:"menuitem",className:"account-action danger",disabled:c,onClick:async()=>{if(!u.current){u.current=!0,g(!0),v();try{await t.session.logout()}catch{}finally{s()}}},children:[e.jsx(Oe,{name:"logout"}),"退出登录"]})]}),o==="info"&&e.jsx(re,{title:"用户信息",className:"auth-dialog",onClose:()=>l(null),closeLabel:"关闭",children:e.jsx("dl",{className:"account-info",children:[["姓名 / 花名",n.display_name?.trim()||"未填写"],["用户名",n.username],["手机号",n.phone||"未填写"],["角色","管理员"],["用户 ID",n.id]].map(([f,h])=>e.jsxs("div",{className:ae.infoRow,children:[e.jsx("dt",{children:f}),e.jsx("dd",{children:h})]},f))})}),o==="password"&&e.jsxs(re,{title:"修改密码",className:"auth-dialog",onClose:()=>l(null),submitLabel:"保存",onSubmit:async f=>{const h=new FormData(f);await t.changePassword(String(h.get("current_password")??""),String(h.get("new_password")??""),String(h.get("confirm_password")??"")),s()},children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"当前密码"}),e.jsx("input",{name:"current_password",type:"password",autoComplete:"current-password",autoFocus:!0,required:!0})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"新密码（至少 8 位）"}),e.jsx("input",{name:"new_password",type:"password",autoComplete:"new-password",required:!0,minLength:8})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"再输一次新密码"}),e.jsx("input",{name:"confirm_password",type:"password",autoComplete:"new-password",required:!0,minLength:8})]}),e.jsx("p",{className:"auth-note",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。保存后需要重新登录。"})]})]})})}const St=n=>window.location.replace(n);function $t({page:n,children:r,workspace:t=!1}){return e.jsx(zt,{page:n,workspace:t,children:r})}function zt({page:n,children:r,workspace:t}){const{session:s,sandbox:i,error:a,retry:o,updateUser:l,expire:p}=st(St);return!s&&!a&&t?e.jsx(Kr,{stage:"正在准备工作区"}):s?e.jsx(_t,{children:e.jsx(Mt,{page:n,workspace:t,user:s.user,localTest:s.localTest,services:s.services,initialHealth:s.initialHealth,sandbox:i,updateUser:l,expire:p,children:r})}):e.jsx("main",{id:"main",tabIndex:-1,children:a?e.jsxs("section",{role:"alert",children:[e.jsx("p",{children:a}),e.jsx("a",{href:"/login",children:"前往登录"}),e.jsx("button",{type:"button",onClick:o,children:"重试"})]}):e.jsx("p",{role:"status",children:"正在验证管理员会话…"})})}const Ct=[{label:"工作区",links:[{key:"canvas",label:"画布",href:"/",icon:"dashboard"},{key:"director",label:"导演工作台",href:"/director",icon:"external"}]},{label:"管理",links:[{key:"teams",label:"项目组",href:"/teams",icon:"teams"},{key:"controller",label:"运行面板",href:"/controller",icon:"dashboard"},{key:"permissions",label:"账号与权限",href:"/admin/permissions",icon:"permissions"}]},{label:"统计",links:[{key:"costs",label:"费用评估",href:"/controller/costs",icon:"costs"},{key:"capacity",label:"产能统计",href:"/controller/capacity",icon:"capacity"}]}];function Mt({page:n,workspace:r,user:t,localTest:s,services:i,initialHealth:a,sandbox:o,children:l,updateUser:p,expire:d}){const{notify:c}=lr(),{online:g,maintenance:u,maintenanceVisible:y}=at(i,a,!r),j=m.useRef(!1),w=m.useRef(!1);m.useEffect(()=>{if(r)return;const h=document.body,x=h.dataset.workspace,k=h.classList.contains("admin-page");return h.classList.add("admin-page"),h.dataset.workspace=n,()=>{k||h.classList.remove("admin-page"),x===void 0?delete h.dataset.workspace:h.dataset.workspace=x}},[n,r]),m.useEffect(()=>{const h=document.body.dataset.adminSandbox;return o&&(document.body.dataset.adminSandbox="local-copy"),()=>{h===void 0?delete document.body.dataset.adminSandbox:document.body.dataset.adminSandbox=h}},[o]);const v=tt(t,s);m.useEffect(()=>{v&&(w.current=!1)},[v]);const f=u==="blocked"?"系统正在维护更新，当前暂无可用执行节点，请稍后再使用。":"部分节点正在维护更新，其他可用节点仍可正常使用。";return e.jsxs("div",{className:`admin-page ${n==="permissions"?"permissions-page":""} ${ae.application} ${r?ae.workspace:""}`,children:[e.jsx("a",{className:"skip-link admin-skip",href:n==="capacity"?"#main-content":"#main",children:"跳到主内容"}),!r&&e.jsxs("aside",{id:"workspace-nav","data-admin-sidebar":"","aria-label":"主导航",className:ae.navigation,children:[e.jsxs("a",{className:"workspace-brand",href:"/","aria-label":"Chouka 创作空间",children:[e.jsx("img",{src:"/icon.png",alt:""}),e.jsxs("span",{children:["Chouka",e.jsx("small",{children:"创作空间"})]})]}),e.jsx("nav",{className:"workspace-links","aria-label":"工作区导航",children:Ct.map(h=>e.jsxs("div",{className:"workspace-nav-group",role:"group","aria-label":h.label,children:[e.jsx("div",{className:"workspace-nav-label","aria-hidden":"true",children:h.label}),h.links.map(x=>e.jsxs("a",{className:"workspace-link",href:x.href,title:x.label,"aria-label":x.label,"aria-current":n===x.key?"page":void 0,children:[e.jsx(Oe,{name:x.icon}),e.jsx("span",{children:x.label})]},x.key))]},h.label))}),e.jsxs("div",{className:"workspace-footer",children:[e.jsxs("div",{className:"workspace-presence",title:"Chouka 系统在线用户（近 90 秒活跃，按账号去重）","aria-live":"polite",children:[e.jsx("i",{"aria-hidden":"true"}),e.jsxs("span",{children:[e.jsx("b",{children:g??"--"})," 人在线"]})]}),e.jsx(Nt,{user:t,localTest:s,services:i,expire:d})]})]}),!r&&y&&e.jsxs("div",{id:"maintenance-banner",className:ae.maintenance,role:"status","aria-live":"polite","aria-atomic":"true","aria-label":"系统维护通知",children:[e.jsx("span",{className:"maintenance-banner-icon",children:e.jsx(Oe,{name:"alert"})}),e.jsx("div",{className:"maintenance-banner-ticker",children:e.jsx("div",{className:"maintenance-banner-track",children:[!1,!0].map(h=>e.jsx("span",{className:"maintenance-banner-message","aria-hidden":h||void 0,children:f},String(h)))})})]}),o&&e.jsx("div",{id:"sandbox-note",className:`notice-box admin-sandbox ${ae.sandbox}`,role:"note",children:"本地隔离数据副本：本页用于本地验收，展示复制的业务数据，不代表正式服务的实时状态。"}),v?e.jsx("main",{id:n==="capacity"?"main-content":"main",tabIndex:-1,children:e.jsx("p",{role:"status",children:"请补充手机号后继续使用。"})}):l({http:i.http,user:t,sandbox:o,notify:c}),v&&e.jsx(re,{id:"phone-dialog",title:"补充手机号",className:"auth-dialog phone-dialog",dismissible:!1,closeLabel:"退出登录",submitLabel:"保存并继续",onClose:()=>{w.current||j.current||(j.current=!0,i.session.logout().catch(()=>{}).finally(d))},onSubmit:async h=>{const x=await i.savePhone(String(new FormData(h).get("phone")??""));w.current=!0,p(x)},children:e.jsxs(m.Fragment,{children:[e.jsx("p",{id:"phone-note",className:"auth-note",children:"当前账号尚未填写手机号，请补充后继续使用。手机号仅本人和管理员可见，不用于短信验证或登录。"}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"手机号"}),e.jsx("input",{name:"phone",type:"tel",autoFocus:!0,inputMode:"numeric",autoComplete:"tel-national",required:!0,maxLength:11,pattern:"1[3-9][0-9]{9}",placeholder:"请输入 11 位中国大陆手机号","aria-describedby":"phone-note"})]})]})})]})}const cr={idle:"空闲",busy:"运行中",syncing:"正在更新",offline:"离线",disabled:"已禁用",error:"异常",queued:"排队中",assigned:"已分配",running:"运行中",done:"已完成",canceled:"已取消",cancel_requested:"正在取消"},Et={idle:"尚未更新",pending:"等待空闲",running:"更新并重启中",done:"更新重启完成",error:"更新重启失败"},B=n=>(typeof n=="number"||typeof n=="string")&&n!==""&&Number.isFinite(Number(n))?Number(n):null,ye=n=>B(n)==null?"未获取":String(n),Pt=n=>{const r=B(n);return r==null?null:Math.max(0,Math.min(100,r))},ze=n=>{const r=B(n);return r==null?"未记录":new Date(r*1e3).toLocaleString("zh-CN",{hour12:!1})};function $n(n){const r=B(n);return r==null||r<0?"未记录":r<60?`${Math.round(r)}秒`:r<3600?`${Math.floor(r/60)}分${Math.floor(r%60)}秒`:`${Math.floor(r/3600)}小时${Math.floor(r%3600/60)}分`}function fe(n){const r=B(n);return r==null?"未采集":r>=1024**3?`${(r/1024**3).toFixed(1)} GB`:r>=1024**2?`${(r/1024**2).toFixed(0)} MB`:`${Math.round(r/1024)} KB`}const qt=n=>["idle","done"].includes(n||"")?"ok":["busy","syncing","running","queued","assigned","cancel_requested"].includes(n||"")?"warn":["offline","disabled","error","canceled"].includes(n||"")?"bad":"",Ge=n=>cr[n||""]||n||"未知",zn=n=>{if(le(n))return"主节点 · 无需同步";if(n.sync_action==="restart_services"||n.sync_action==="reboot_host"){const r=n.sync_action==="reboot_host"?"电脑重启":"服务重启",t=n.sync_status;return t==="pending"?`${r} · 等待节点接收`:t==="running"?`${r}中`:t==="done"?`${r}完成`:t==="error"?`${r}失败`:"未记录"}return Et[n.sync_status||""]||n.sync_status||"未记录"},le=n=>n.is_primary_node===!0,Ce=n=>!le(n)&&["pending","running"].includes(n.sync_status||""),Me=n=>!le(n)&&n.sync_status==="error",te=n=>n.state!=="offline",dr=n=>typeof n=="number"||typeof n=="string"&&n.trim()?`Worker v${n}`:"Worker 版本未知",pr=n=>dr(n.capabilities?.agent_version);function mr(n){const r=n.capabilities?.system,t=r?.comfyui_build_version?.trim(),s=r?.comfyui_version?.trim();return t?`ComfyUI ${t}`:s?`ComfyUI ${s} · 定制版本未记录`:"ComfyUI 版本未记录"}const Rt=(n,r=Date.now())=>{const t=B(n?.health.server_time);return t==null||!n?r/1e3:t+(r-n.receivedAt)/1e3},Cn=(n,r)=>{const t=B(n);return t==null?"未记录":`${$n(Math.max(0,r-t))}前`};function Mn(n,r,t){const s=B(n.capabilities?.telemetry?.collected_at);return!t&&te(n)&&s!=null&&r-s<=60&&r-s>=-10}function sn(n){return te(n)?n.enabled===!1||n.enabled===0||n.state==="disabled"?["已禁用接收","bad"]:Ce(n)?[["restart_services","reboot_host"].includes(n.sync_action||"")?"维护期间不可接任务":"同步期间不可接任务","bad"]:n.comfy_online===!1||n.state==="error"?["不可接任务","bad"]:n.busy||n.current_job_id||n.state==="busy"?["正在占用","warn"]:n.state==="idle"&&n.comfy_online===!0?["可接任务","ok"]:["接收状态未知",""]:["不可接任务","bad"]}function En(n,r={}){const t=n.capability_comparison||{};if(r.status==="none")return{label:"未设置主节点基准",tone:"warn"};if(r.status==="ambiguous")return{label:"主节点不唯一",tone:"bad"};if(le(n)&&t.status==="primary")return{label:"主节点基准",tone:r.status==="stale"?"warn":"ok"};const s=t.missing_models?.length||0,i=t.missing_node_classes?.length||0,a=t.extra_models?.length||0,o=t.extra_node_classes?.length||0;let l,p="warn";return t.model_inventory_status==="unknown"?(l=["模型清单未知",i?`节点不全 · 缺 ${i} 个`:""].filter(Boolean).join("；"),i&&(p="bad")):t.status==="unknown"||!t.status?l="清单未知":s||i?(l=[s?`模型不全 · 缺 ${s} 个`:"",i?`节点不全 · 缺 ${i} 个`:""].filter(Boolean).join("；"),p="bad"):t.status==="stale"?l=a||o?"节点离线 · 主节点所需齐全，存在额外清单":"节点离线 · 最后清单一致":a||o?(l=`主节点所需齐全 · ${[a?`额外 ${a} 个模型`:"",o?`额外 ${o} 个节点`:""].filter(Boolean).join("；")}`,p="ok"):(l="清单一致",p="ok"),t.status==="stale"&&(s||i)&&(l=`节点离线 · 最后清单：${l}`),r.status==="stale"&&(l=`基准离线 · ${l}`),{label:l,tone:p}}function ur(n,r){if(le(n))return"主节点作为同步源，不参与同步";if(!te(n))return"设备已离线，请上线后重试";if(n.capabilities?.supports_code_restart!==!0)return"请先升级 Worker 及配套启动文件";if(Ce(n))return"设备已有等待中或执行中的维护请求";if(r.status!=="ready")return"主节点基准不可用，请刷新后重试";const t=n.capability_comparison;return!t?.status||["unknown","stale"].includes(t.status)||t.model_inventory_status==="unknown"?"清单未知或已过期，请刷新后重试":!t.missing_models?.length&&!t.missing_node_classes?.length?"主节点所需资源齐全，无需补齐":""}function gn(n){const r=n.comparisonBaseline;if(r.status==="none")return"未设置主节点，无法比较";if(r.status==="ambiguous")return"检测到多个主节点，无法确定比较基准";const t=n.workers.find(s=>s.id===r.worker_id)?.name||r.worker_id||"未命名主节点";return`${r.status==="stale"?"主节点离线 · 最后清单":"在线主节点"} · ${t} · ${dr(r.agent_version)}`}function Ke(n){const r=n.capabilities;return r?.telemetry?.gpus?.length?r.telemetry.gpus:(r?.devices||[]).map((t,s)=>{const i=B(t.vram_total),a=B(t.vram_free);return{index:t.index??s,name:t.name||t.device_name||t.type,memory_total_bytes:i,memory_used_bytes:i!=null&&a!=null?Math.max(0,i-a):null,utilization_percent:null,temperature_c:null}})}function hr(n){if(n.capabilities?.telemetry?.memory)return n.capabilities.telemetry.memory;const r=n.capabilities?.system,t=B(r?.ram_total),s=B(r?.ram_free);return{total_bytes:t,used_bytes:t!=null&&s!=null?Math.max(0,t-s):null}}const xr=(n,r)=>r.projects.find(t=>t.id===n.project)?.name||n.projectName||(n.project?"项目已删除":"未归属项目"),bn=16e3;function Lt(n,r){const t=s=>s>0&&s<n.length&&n.charCodeAt(s)>=56320&&n.charCodeAt(s)<=57343?s-1:s;return n.slice(t(r*bn),t((r+1)*bn))}const W=pe([V().finite(),C().refine(n=>n===""||Number.isFinite(Number(n)))]).nullish(),I=C().nullish(),Xe=pe([Y(),ie(0),ie(1)]).nullish(),It=G({used_bytes:W,total_bytes:W}),At=G({index:W,name:I,utilization_percent:W,memory_used_bytes:W,memory_total_bytes:W,temperature_c:W}),Tt=G({agent_version:pe([V(),C()]).nullish(),supports_code_restart:Y().nullish(),supports_service_restart:Y().nullish(),supports_host_reboot:Y().nullish(),node_classes:O(C()).nullish(),telemetry:G({hostname:I,collected_at:W,gpus:O(At).nullish(),memory:It.nullish()}).nullish(),devices:O(G({index:W,name:I,device_name:I,type:I,vram_total:W,vram_free:W})).nullish(),system:G({ram_total:W,ram_free:W,comfyui_version:I,comfyui_build_version:I}).nullish()}),On=G({name:I,node_class:I,input:I}),Dt=G({status:I,model_inventory_status:I,missing_node_classes:O(C()).nullish(),extra_node_classes:O(C()).nullish(),missing_models:O(On).nullish(),extra_models:O(On).nullish()}),Ft=G({status:I,worker_id:I,agent_version:pe([V(),C()]).nullish()}),Ot=G({id:C(),name:I,state:I,enabled:Xe,comfy_online:Xe,busy:Xe,current_job_id:I,last_seen:W,is_primary_node:Xe,sync_status:I,sync_action:I,sync_message:I,capability_comparison:Dt.nullish(),capabilities:Tt.nullish()}),fr=G({id:C(),status:I,history_only:Y().optional(),permission:I,modelName:I,nodeName:I,card:I,name:I,cardName:I,project:I,projectName:I,progress:W,step:I,created:W,started:W,ended:W,worker_id:I,error:I,capability:I,submitter_display_name:I,submitter_username:I}),Ut=G({ok:Y().nullish(),mode:I,online_workers:W,workers:W,server_time:W,started_at:W,comfy_online:Y().nullish(),jobs:W,capabilities:W,sandbox:Y().nullish(),llm:G({ok:Y().nullish(),model:I}).nullish()}),Wt=G({running_count:W,queued_count:W}),Bt=G({workers:O(Ot),comparison_baseline:Ft.nullish()}),Ht=G({jobs:O(fr)}),Vt=Ve(["all","queued","running","done","error","canceled"]),Gt=G({jobs:O(fr),next_cursor:C().min(1).nullable(),has_more:Y(),total:V().int().nonnegative()}).refine(n=>n.has_more===(n.next_cursor!==null),{message:"任务历史分页游标不完整"}),Kt=G({projects:O(G({id:C(),name:I}))}),Jt=G({worker_count:W,primary_count:W,skipped_count:W}),Xt=G({ok:ie(!0),worker_id:C().min(1),request_id:C().min(1),action:ie("sync_files")}),Yt=Ve(["restart_services","reboot_host"]),Zt=G({ok:ie(!0),worker_id:C().min(1),request_id:C().min(1),action:Yt}),Qt=G({ok:Y().optional()}),un=pe([V().finite(),C().refine(n=>n!==""&&Number.isFinite(Number(n)))]).transform(Number),Un=ar().transform(n=>(typeof n=="number"||typeof n=="string")&&n!==""&&Number.isFinite(Number(n))?Number(n):null),es=G({worker_id:I,gpu_index:W,minutes:W,server_time:W,from:un,to:un,gap_seconds:un.pipe(V().positive()),points:O(G({at:Un,temperature_c:Un}))}).refine(n=>n.to>n.from,{message:"温度历史返回格式不完整"});function ns(n){return{async history(r,t,s){const i=new URLSearchParams({limit:"50",status:r});return t!==null&&i.set("cursor",t),n.read(`/api/jobs/history?${i}`,Gt,{cache:"no-store",signal:s})},async snapshot(r,t=()=>{}){const s={cache:"no-store",signal:r},[i,a,o,l,p]=await Promise.all([n.read("/api/health",Ut,s).then(d=>(d.sandbox===!0&&!r.aborted&&t(),d)),n.read("/api/status",Wt,s),n.read("/api/workers",Bt,s),n.read("/api/jobs",Ht,s),n.read("/api/projects",Kt,s)]);return{health:i,status:a,workers:o.workers,comparisonBaseline:o.comparison_baseline||{status:"none"},jobs:l.jobs,projects:p.projects,receivedAt:Date.now()}},async temperature(r,t,s,i){const a=await n.read(`/api/workers/${encodeURIComponent(r)}/temperature?gpu_index=${t}&minutes=${s}`,es,{cache:"no-store",signal:i});if(a.worker_id!=null&&a.worker_id!==r||a.gpu_index!=null&&B(a.gpu_index)!==t||a.minutes!=null&&B(a.minutes)!==s)throw new Error("温度历史与所选节点或范围不一致");return{...a,points:a.points.flatMap(o=>o.at!=null&&o.at>=a.from&&o.at<=a.to?[{...o,at:o.at,temperature_c:o.temperature_c}]:[]).sort((o,l)=>o.at-l.at)}},async deleteWorker(r,t,s){return s(),Qt.parse(await n.request(`/api/workers/${encodeURIComponent(r)}`,{method:"DELETE",signal:t}))},async restartWorker(r,t,s,i){i();const a=Zt.parse(await n.request(`/api/admin/workers/${encodeURIComponent(r)}/restart`,{method:"POST",signal:s,headers:{"Content-Type":"application/json"},body:JSON.stringify({action:t})}));if(a.worker_id!==r||a.action!==t)throw new Error("重启响应与所选节点或操作不一致");return a},async syncWorker(r,t,s){s();const i=Xt.parse(await n.request(`/api/admin/workers/${encodeURIComponent(r)}/sync`,{method:"POST",signal:t,headers:{"Content-Type":"application/json"},body:JSON.stringify({})}));if(i.worker_id!==r)throw new Error("同步响应与所选设备不一致");return i},async syncAll(r,t){return t(),Jt.parse(await n.request("/api/admin/workers/sync-all",{method:"POST",signal:r,headers:{"Content-Type":"application/json"},body:JSON.stringify({})}))}}}const Wn=n=>({filter:n,jobs:[],initialized:!1,loadedPages:0,nextCursor:null,hasMore:!1,total:null,loading:null,error:"",failedAction:null});function hn(n,r){return(B(r.created)??0)-(B(n.created)??0)||(n.id<r.id?1:n.id>r.id?-1:0)}function rs(n,r){const t=new Map(r.jobs.map(i=>[i.id,i])),s=r.jobs.reduce((i,a)=>!i||hn(a,i)>0?a:i,null);for(const i of n?.jobs||[]){const a=["queued","assigned","running","cancel_requested"].includes(i.status||"");(t.has(i.id)||a||s&&hn(i,s)<=0)&&t.set(i.id,i)}return[...t.values()].filter(i=>{const a=i.status==="assigned"?"queued":i.status==="cancel_requested"?"running":i.status;return r.filter==="all"||a===r.filter}).sort(hn)}class ts{constructor(r,t=!1){this.service=r,this.state={snapshot:null,history:Wn("all"),stale:!1,loading:!1,error:"",isolated:t,mutation:null,deletingWorker:null,refreshed:0}}service;state;listeners=new Set;read=null;historyRead=null;historyEpoch=0;write=null;version=0;disposed=!1;start=()=>{this.disposed=!1,this.refreshAll()};refreshAll=()=>Promise.all([this.refresh(),this.refreshHistory()]);getSnapshot=()=>this.state;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});update(r){this.disposed||(this.state={...this.state,...r},this.listeners.forEach(t=>t()))}isolate=()=>{this.state.isolated||this.update({isolated:!0})};canMutate=()=>!this.disposed&&!!this.state.snapshot&&!this.state.stale&&!this.state.isolated&&!this.state.mutation;guard=()=>{if(this.disposed||!this.state.snapshot||this.state.stale||this.state.isolated)throw new Error("隔离副本或服务状态未就绪，禁止修改设备")};invalidateRead(){++this.version,this.read?.controller.abort(),this.read=null,this.update({loading:!1})}refresh=(r=!1)=>{if(this.disposed||this.state.mutation&&!r)return Promise.resolve();if(this.read)return this.read.promise;const t=++this.version,s=new AbortController;this.update({loading:!0});const i=this.service.snapshot(s.signal,this.isolate).then(a=>{this.disposed||s.signal.aborted||t!==this.version||this.update({snapshot:a,stale:!1,error:"",refreshed:this.state.refreshed+1,isolated:this.state.isolated||a.health.sandbox===!0})}).catch(a=>{this.disposed||s.signal.aborted||t!==this.version||(this.update({stale:!0,error:`读取中间层信息失败：${ne(a)}`}),s.abort())}).finally(()=>{t!==this.version||this.disposed||(this.read=null,this.update({loading:!1}))});return this.read={controller:s,promise:i},i};setHistoryFilter=r=>this.disposed?Promise.resolve():r===this.state.history.filter?this.refreshHistory():(++this.historyEpoch,this.historyRead?.controller.abort(),this.historyRead=null,this.update({history:Wn(r)}),this.refreshHistory());refreshHistory=()=>this.readHistory("first");loadMore=()=>this.readHistory("more");retryHistory=()=>this.readHistory(this.state.history.failedAction||"first");readHistory(r){if(this.disposed)return Promise.resolve();if(this.historyRead)return this.historyRead.promise;const t=this.state.history;if(r==="more"&&(!t.initialized||!t.hasMore))return Promise.resolve();const s=r==="more"?t.nextCursor:null,i=this.historyEpoch,a=new AbortController;this.update({history:{...t,loading:r,error:"",failedAction:null}});const o=this.service.history(t.filter,s,a.signal).then(l=>{if(this.disposed||a.signal.aborted||i!==this.historyEpoch)return;if(r==="more"&&l.has_more&&l.next_cursor===s)throw new Error("任务历史游标未推进，请重试");const p=this.state.history,d=new Map(p.jobs.map(g=>[g.id,g]));for(const g of l.jobs)d.set(g.id,g);const c=r==="first"&&p.loadedPages>1;this.update({history:{...p,jobs:[...d.values()],initialized:!0,loadedPages:r==="more"?p.loadedPages+1:Math.max(1,p.loadedPages),total:l.total,nextCursor:c?p.nextCursor:l.next_cursor,hasMore:c?p.hasMore:l.has_more}})}).catch(l=>{this.disposed||a.signal.aborted||i!==this.historyEpoch||this.update({history:{...this.state.history,error:`读取任务历史失败：${ne(l)}`,failedAction:r}})}).finally(()=>{this.disposed||a.signal.aborted||i!==this.historyEpoch||(this.historyRead=null,this.update({history:{...this.state.history,loading:null}}))});return this.historyRead={controller:a,promise:o},o}async mutate(r,t,s){if(this.guard(),this.state.mutation)throw new Error("设备操作正在执行，请稍后重试");this.invalidateRead();const i=new AbortController;this.write=i,this.update({mutation:r,deletingWorker:t});try{const a=await s(i.signal);if(i.signal.aborted||this.disposed)throw new DOMException("操作已取消","AbortError");return await this.refresh(!0),a}catch(a){throw i.signal.aborted||(this.update({error:`${r==="delete"?"删除设备":r==="restart"?"提交重启":"更新节点"}失败：${ne(a)}`}),await this.refresh(!0)),a}finally{this.write=null,this.update({mutation:null,deletingWorker:null})}}deleteWorker=r=>this.state.snapshot?.workers.some(t=>t.id===r)?this.mutate("delete",r,t=>this.service.deleteWorker(r,t,this.guard)):Promise.reject(new Error("设备已移除"));restartWorker=(r,t)=>this.state.snapshot?.workers.some(s=>s.id===r)?this.mutate("restart",null,s=>this.service.restartWorker(r,t,s,this.guard)):Promise.reject(new Error("设备已移除"));syncWorker=r=>{const t=this.state.snapshot,s=t?.workers.find(a=>a.id===r);if(!s||!t)return Promise.reject(new Error("设备已移除或被新的注册替代"));const i=ur(s,t.comparisonBaseline);return i?Promise.reject(new Error(i)):this.mutate("sync",null,a=>this.service.syncWorker(r,a,this.guard))};syncAll=()=>this.mutate("sync",null,r=>this.service.syncAll(r,this.guard));dispose=()=>{this.disposed=!0,++this.version,this.read?.controller.abort(),this.write?.abort(),++this.historyEpoch,this.historyRead?.controller.abort(),this.historyRead=null,this.read=null,this.listeners.clear()}}function ss({http:n,sandbox:r}){const t=m.useMemo(()=>ns(n),[n]),s=m.useMemo(()=>new ts(t),[t]),i=m.useSyncExternalStore(s.subscribe,s.getSnapshot),[a,o]=m.useState(!0),l=m.useRef(a),[p,d]=m.useState(Date.now);return m.useLayoutEffect(()=>{l.current=a},[a]),m.useLayoutEffect(()=>{r&&s.isolate()},[r,s]),m.useEffect(()=>(s.start(),s.dispose),[s]),m.useEffect(()=>{const c=()=>{document.hidden||(d(Date.now()),l.current&&s.refreshAll())},g=window.setInterval(c,5e3);return document.addEventListener("visibilitychange",c),()=>{window.clearInterval(g),document.removeEventListener("visibilitychange",c)}},[s]),{state:i,store:s,service:t,automatic:a,setAutomatic:o,clock:p}}function nn({name:n}){return e.jsx("svg",{className:"icon",viewBox:"0 0 24 24","aria-hidden":"true",focusable:"false",children:n==="refresh"?e.jsxs(e.Fragment,{children:[e.jsx("path",{d:"M20 7v5h-5M4 17v-5h5"}),e.jsx("path",{d:"M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 18 17"})]}):n==="chevron"?e.jsx("path",{d:"m9 5 7 7-7 7"}):e.jsxs(e.Fragment,{children:[e.jsx("path",{d:"m12 3 10 18H2L12 3Z"}),e.jsx("path",{d:"M12 9v4m0 3v1"})]})})}function $e({children:n}){return e.jsx("span",{className:"cell-secondary",children:n})}function as({value:n,label:r}){return e.jsx("div",{className:"util-track",role:"meter","aria-label":r,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":n,children:e.jsx("i",{style:{width:`${n}%`}})})}function is({value:n}){const r=B(n),t=Pt(r==null?null:r*100);return e.jsxs("div",{className:"utilization",children:[e.jsx("span",{children:t==null?"未采集":`${Math.round(t)}%`}),t!=null&&e.jsx(as,{value:t,label:"任务过程进度"})]})}function gr({worker:n,snapshot:r}){const t=r.jobs.find(s=>s.id===n.current_job_id);if(t){const s=`${t.submitter_display_name?.trim()||t.submitter_username||"未记录提交人"} · ${xr(t,r)} · ${t.cardName||t.name||"未命名卡片"}`;return t.project&&t.card?e.jsx("a",{href:`/?${new URLSearchParams({project:t.project,card:t.card})}`,title:s,children:s}):e.jsx("span",{title:s,children:s})}return n.current_job_id?e.jsx(e.Fragment,{children:"任务详情暂未载入"}):Ce(n)?e.jsxs(e.Fragment,{children:[zn(n),e.jsx($e,{children:n.sync_message||"等待节点反馈"})]}):te(n)?n.busy?e.jsxs(e.Fragment,{children:["ComfyUI 本地任务",e.jsx($e,{children:"非中间层派发"})]}):e.jsx(e.Fragment,{children:sn(n)[1]==="bad"?"不接收新任务":"当前无任务"}):e.jsx(e.Fragment,{children:"非实时"})}function br({rows:n,className:r,id:t}){return e.jsx("dl",{id:t,className:r,children:n.map(([s,i])=>e.jsx(os,{label:s,children:i},s))})}function os({label:n,children:r}){return e.jsxs(e.Fragment,{children:[e.jsx("dt",{children:n}),e.jsx("dd",{children:r})]})}function ls({snapshot:n,items:r,now:t,onError:s}){const i=new Map(n?.workers.map(a=>[a.id,a.name])||[]);return e.jsx(e.Fragment,{children:r.length?r.map(a=>{const o=B(a.started),l=o==null?a.history_only?"耗时未记录":"尚未开始":a.history_only&&B(a.ended)==null?"耗时未记录":$n((B(a.ended)??t)-o);return e.jsxs("tr",{children:[e.jsx("td",{className:qt(a.status),children:Ge(a.status)}),e.jsxs("td",{className:"job-origin",children:[a.submitter_display_name?.trim()||a.submitter_username||"未记录提交人",e.jsx($e,{children:n?xr(a,n):a.projectName||"项目未记录"}),e.jsxs($e,{children:["卡片 · ",a.cardName||a.name||"未命名"]})]}),e.jsxs("td",{className:"job-mode",title:a.capability||void 0,children:[a.modelName||a.nodeName||a.name||a.capability||"未记录",e.jsx($e,{children:a.id})]}),e.jsxs("td",{children:[e.jsx(is,{value:a.progress}),e.jsx($e,{children:a.step||"步骤未记录"})]}),e.jsx("td",{title:a.worker_id||void 0,children:a.nodeName?.trim()||(a.worker_id?i.get(a.worker_id)||"未知执行端":a.history_only?"未记录":"待分配")}),e.jsx("td",{children:ze(a.created)}),e.jsx("td",{children:a.error?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"danger f-job-error",title:a.error,children:a.error}),e.jsx("button",{type:"button",className:"link-button","data-job-error":a.id,"data-focus-key":`job-error:${a.id}`,onClick:()=>s(a),children:"查看完整错误"})]}):l})]},a.id)}):e.jsx("tr",{children:e.jsx("td",{colSpan:7,children:e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"暂无已加载任务"}),e.jsx("p",{children:"可更换任务状态；历史记录的加载结果见下方状态。"})]})})})})}class cs{constructor(r,t,s,i){this.service=r,this.id=t,this.gpu=s,this.minutes=i}service;id;gpu;minutes;state={data:null,loading:!1,error:""};listeners=new Set;request=null;version=0;getSnapshot=()=>this.state;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});update(r){this.state={...this.state,...r},this.listeners.forEach(t=>t())}load=async(r=!1)=>{if(r&&this.request)return;this.request?.abort();const t=new AbortController,s=++this.version;this.request=t,this.update({loading:!0,error:"",...r?{}:{data:null}});try{const i=await this.service.temperature(this.id,this.gpu,this.minutes,t.signal);if(t.signal.aborted||s!==this.version)return;this.update({data:i})}catch(i){if(t.signal.aborted||s!==this.version)return;this.update({data:null,error:ne(i)})}finally{s===this.version&&(this.request=null,this.update({loading:!1}))}};dispose=()=>{++this.version,this.request?.abort(),this.request=null}}function ds(n,r,t){const s=n.points.flatMap(d=>d.temperature_c==null?[]:[d.temperature_c]),i=Math.floor((Math.min(...s)-5)/10)*10,a=Math.ceil((Math.max(...s)+5)/10)*10,o=49,l=r-o-20,p=t-23-45;return{x:d=>o+(d-n.from)/(n.to-n.from)*l,y:d=>23+(a-d)/(a-i)*p,width:r,height:t,left:o,pw:l}}function ps(n){const r=[];let t=null;for(const s of n.points){if(s.temperature_c==null){t=null;continue}(t==null||s.at-t>n.gap_seconds)&&r.push([]),r[r.length-1]?.push({at:s.at,temperature_c:s.temperature_c}),t=s.at}return r}function ms(n,r,t,s,i){if(s<70||i<50||!r.points.some(w=>w.temperature_c!=null))return null;const a=n.getContext("2d");if(!a)return null;const o=window.devicePixelRatio||1;n.width=Math.round(s*o),n.height=Math.round(i*o),a.setTransform(o,0,0,o,0,0),a.clearRect(0,0,s,i);const l=ds(r,s,i),{x:p,y:d,left:c,pw:g}=l,u=r.points.flatMap(w=>w.temperature_c==null?[]:[w.temperature_c]),y=Math.floor((Math.min(...u)-5)/10)*10,j=Math.ceil((Math.max(...u)+5)/10)*10;a.font='12px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',a.lineWidth=1,a.textAlign="right",a.textBaseline="middle";for(let w=0;w<=4;w++){const v=y+(j-y)*w/4,f=d(v);a.strokeStyle="#29313c",a.beginPath(),a.moveTo(c,f),a.lineTo(s-20,f),a.stroke(),a.fillStyle="#a0a6b1",a.fillText(`${Math.round(v)}°`,c-12,f)}a.textBaseline="top";for(let w=0;w<=4;w+=s<600?2:1){const v=new Date((r.from+(r.to-r.from)*w/4)*1e3),f=v.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:!1}),h=t===1440?v.toLocaleDateString("zh-CN",{month:"2-digit",day:"2-digit"})+" "+f:f;a.textAlign=w===0?"left":w===4?"right":"center",a.fillText(h,c+w/4*g,i-27)}a.strokeStyle="#38bdf8",a.lineWidth=2.3,a.lineJoin="round",a.beginPath();for(const w of ps(r))w.forEach((v,f)=>{f===0?a.moveTo(p(v.at),d(v.temperature_c)):a.lineTo(p(v.at),d(v.temperature_c))});a.stroke(),a.fillStyle="#38bdf8";for(const w of r.points)w.temperature_c!=null&&(a.beginPath(),a.arc(p(w.at),d(w.temperature_c),2.1,0,Math.PI*2),a.fill());return l}const us="_page_9iqnq_1",hs="_overview_9iqnq_1",xs="_workerGrid_9iqnq_54",fs="_workerCard_9iqnq_62",gs="_workerIdentityBlock_9iqnq_74",bs="_workerHeader_9iqnq_89",ys="_workerService_9iqnq_90",vs="_syncMeta_9iqnq_91",js="_workerName_9iqnq_100",ws="_workerState_9iqnq_112",_s="_workerVersions_9iqnq_141",ks="_resourceNote_9iqnq_142",Ns="_telemetryNote_9iqnq_143",Ss="_sectionLabel_9iqnq_144",$s="_syncMessage_9iqnq_146",zs="_workerResources_9iqnq_161",Cs="_resourceRow_9iqnq_164",Ms="_resourceReadings_9iqnq_165",Es="_resourceTitle_9iqnq_177",Ps="_resourceReading_9iqnq_165",qs="_resourceLabel_9iqnq_203",Rs="_resourceBar_9iqnq_206",Ls="_workerActivity_9iqnq_241",Is="_workerTask_9iqnq_250",As="_workerSync_9iqnq_289",Ts="_inventoryAction_9iqnq_297",Ds="_inventoryLabel_9iqnq_298",Fs="_syncActionLabel_9iqnq_342",Os="_cardActions_9iqnq_353",Us="_historyControls_9iqnq_387",Ws="_workerDialog_9iqnq_396",Bs="_workerActions_9iqnq_399",Hs="_capabilities_9iqnq_407",Vs="_temperatureDialog_9iqnq_416",F={page:us,overview:hs,workerGrid:xs,workerCard:fs,workerIdentityBlock:gs,workerHeader:bs,workerService:ys,syncMeta:vs,workerName:js,workerState:ws,workerVersions:_s,resourceNote:ks,telemetryNote:Ns,sectionLabel:Ss,syncMessage:$s,workerResources:zs,resourceRow:Cs,resourceReadings:Ms,resourceTitle:Es,resourceReading:Ps,resourceLabel:qs,resourceBar:Rs,workerActivity:Ls,workerTask:Is,workerSync:As,inventoryAction:Ts,inventoryLabel:Ds,syncActionLabel:Fs,cardActions:Os,historyControls:Us,workerDialog:Ws,workerActions:Bs,capabilities:Hs,temperatureDialog:Vs};function Gs({worker:n,workerId:r,service:t,now:s,stale:i,revision:a,onClose:o}){const l=n?Ke(n):[],[p,d]=m.useState(()=>({gpu:B(l[0]?.index)??0,minutes:30}));return e.jsx(re,{title:n?.name||r,onClose:o,className:`temperature-dialog ${F.temperatureDialog}`,showFooter:!1,children:e.jsx(Ks,{worker:n,workerId:r,service:t,now:s,stale:i,revision:a,selection:p,onSelect:d})})}function Ks({worker:n,workerId:r,service:t,now:s,stale:i,revision:a,selection:o,onSelect:l}){const{gpu:p,minutes:d}=o,c=m.useMemo(()=>new cs(t,r,p,d),[t,r,p,d]),g=m.useSyncExternalStore(c.subscribe,c.getSnapshot),{data:u,error:y,loading:j}=g,w=m.useRef(null),v=m.useRef(null),f=m.useRef(null),h=m.useRef(null),[x,k]=m.useState(null),L=m.useRef(a),T=n?Ke(n):[],_=T.find(z=>B(z.index)===p),N=(u?.points||[]).flatMap(z=>z.temperature_c==null?[]:[z.temperature_c]),E=n&&te(n)?Mn(n,s,i)?B(_?.temperature_c)??"未采集":"未采集":"非实时";m.useEffect(()=>(c.load(),c.dispose),[c]),m.useEffect(()=>{L.current!==a&&(L.current=a,c.load(!0))},[a,c]),m.useEffect(()=>{const z=w.current,S=v.current;if(!z||!S||!u)return;const Q=()=>{const{width:oe,height:be}=S.getBoundingClientRect();h.current=ms(z,u,d,oe,be)},J=requestAnimationFrame(Q),ee=new ResizeObserver(Q);return ee.observe(S),()=>{cancelAnimationFrame(J),ee.disconnect(),h.current=null}},[u,d]);const b=x==null?void 0:u?.points[x],R=b?`${ze(b.at)} · ${b.temperature_c==null?"未采集":`${b.temperature_c}°C`}`:"";m.useEffect(()=>{const z=f.current,S=h.current;!z||!S||!b||(z.style.left=`${Math.max(8,Math.min(S.width-z.offsetWidth-8,S.x(b.at)+14))}px`,z.style.top=`${Math.max(8,Math.min(S.height-z.offsetHeight-8,b.temperature_c==null?20:S.y(b.temperature_c)-45))}px`)},[b,R]);const D=[["当前温度",E],["所选时段最高",N.length?Math.max(...N):u?"未采集":"未获取"],["所选时段最低",N.length?Math.min(...N):u?"未采集":"未获取"]];return e.jsxs("div",{className:"modal-shell",children:[e.jsx("header",{className:"modal-header",children:e.jsxs("div",{children:[e.jsx("p",{className:"eyeline",children:"显卡温度趋势"}),e.jsxs("p",{className:"muted","data-temp-description":!0,children:[_?.name||"型号未记录"," / ",n?Ge(n.state):"节点已移除"]})]})}),e.jsxs("div",{className:"chart-controls",children:[e.jsxs("label",{className:"inline-label",children:["显卡"," ",e.jsx("select",{"data-temp-gpu":!0,"aria-label":"选择显卡",value:p,onChange:z=>{k(null),l({...o,gpu:Number(z.target.value)})},children:T.length?T.map((z,S)=>e.jsxs("option",{value:z.index??0,children:["GPU ",z.index??0," · ",z.name||"未记录型号"]},`${z.index??S}:${S}`)):e.jsx("option",{value:0,children:"GPU 0 · 未采集配置"})})]}),e.jsx("div",{className:"segmented","data-temp-ranges":!0,"aria-label":"温度时间范围",children:[[30,"30 分钟"],[120,"2 小时"],[1440,"24 小时"]].map(([z,S])=>e.jsx("button",{type:"button","data-range":z,"aria-pressed":d===z,onClick:()=>{k(null),l({...o,minutes:z})},children:S},z))})]}),e.jsx("p",{className:"small muted",children:"仅展示真实采集记录；缺失区间不插值、不补造历史。当前温度需60秒内的新鲜遥测。"}),e.jsx("div",{className:"temperature-stats","data-temp-stats":!0,children:D.map(([z,S])=>e.jsxs("div",{className:"temperature-stat",children:[e.jsx("label",{children:z}),e.jsxs("strong",{children:[S,typeof S=="number"&&e.jsx("small",{children:" °C"})]})]},z))}),e.jsxs("div",{className:"chart-area",ref:v,children:[e.jsx("canvas",{ref:w,"data-temp-canvas":!0,hidden:!N.length,tabIndex:0,role:"img","aria-label":`GPU ${p}，${d}分钟真实温度历史，${N.length}个有效采集点；左右方向键查看。`,onPointerMove:z=>{const S=h.current;if(!S||!u?.points.length)return;const Q=u.from+Math.max(0,Math.min(1,(z.clientX-z.currentTarget.getBoundingClientRect().left-S.left)/S.pw))*(u.to-u.from);k(u.points.reduce((J,ee,oe)=>Math.abs(ee.at-Q)<Math.abs((u.points[J]?.at??ee.at)-Q)?oe:J,0))},onPointerLeave:()=>k(null),onKeyDown:z=>{!u?.points.length||!["ArrowLeft","ArrowRight","Home","End"].includes(z.key)||(z.preventDefault(),k(z.key==="Home"?0:z.key==="End"?u.points.length-1:Math.max(0,Math.min(u.points.length-1,(x??0)+(z.key==="ArrowRight"?1:-1)))))}}),e.jsx("div",{className:"empty-state","data-temp-empty":!0,hidden:N.length>0,role:"status",children:y?e.jsxs(e.Fragment,{children:[e.jsx("b",{children:"温度历史读取失败"}),e.jsx("p",{children:y}),e.jsx("button",{type:"button",onClick:()=>{k(null),c.load()},children:"重试读取"})]}):j||!u?e.jsx("b",{children:"正在读取温度历史…"}):e.jsxs(e.Fragment,{children:[e.jsx("b",{children:"暂无有效温度记录"}),e.jsx("p",{children:"未开始采集、旧版 Worker 未上报或驱动不支持；不显示 0°C。"})]})}),e.jsx("div",{ref:f,className:"chart-tooltip",hidden:!b||!N.length,role:"status",children:R})]}),e.jsxs("footer",{className:"modal-footer",children:[e.jsxs("span",{className:"chart-key",children:[e.jsx("i",{}),e.jsxs("span",{"data-temp-key":!0,children:["GPU ",p," 温度"]})]}),e.jsx("span",{"data-temp-note":!0,children:u?`${ze(u.from)} — ${ze(u.to)}${n&&!te(n)?" · 离线，历史非实时":""}`:""}),e.jsx("span",{className:"keyboard-hint",children:"左右键查看采集点 · Esc关闭"})]})]})}function Js({capabilities:n}){const[r,t]=m.useState(null),[s,i]=m.useState(0),a=m.useRef(null),o=m.useRef(null),l=m.useRef(new Set),p=Math.max(1,Math.ceil((r?.length||0)/bn));m.useEffect(()=>{const g=l.current;return()=>{g.forEach(u=>URL.revokeObjectURL(u)),g.clear()}},[]);const d=g=>{i(g),(g===0||g===p-1)&&o.current?.focus({preventScroll:!0}),o.current&&(o.current.scrollTop=0,o.current.scrollLeft=0)},c=()=>{if(r==null)return;const g=URL.createObjectURL(new Blob([r],{type:"application/json;charset=utf-8"}));l.current.add(g);const u=document.createElement("a");u.href=g,u.download="worker-capabilities.json",u.click()};return e.jsxs("details",{className:F.capabilities,"data-capabilities":!0,onToggle:g=>{g.currentTarget.open&&a.current==null&&(a.current=JSON.stringify(n,null,2),t(a.current))},children:[e.jsx("summary",{children:"完整能力与配置（最后上报，非实时配置证据）"}),r!=null&&e.jsxs("div",{children:[e.jsx("p",{className:"small muted",children:"按页查看完整快照；下载可获取全部 JSON，自动刷新不会改变当前快照。"}),e.jsxs("div",{className:"f-toolbar",children:[e.jsx("button",{type:"button","data-config-prev":!0,disabled:s===0,onClick:()=>d(s-1),children:"上一页"}),e.jsxs("span",{className:"small muted","data-config-page":!0,role:"status",children:["第 ",s+1," / ",p," 页"]}),e.jsx("button",{type:"button","data-config-next":!0,disabled:s===p-1,onClick:()=>d(s+1),children:"下一页"}),e.jsx("button",{type:"button","data-config-download":!0,onClick:c,children:"下载完整 JSON"})]}),e.jsx("pre",{ref:o,className:"capabilities-json",tabIndex:0,"aria-label":"当前页能力与配置",children:Lt(r,s)})]})]})}function Bn({items:n}){return n.length?e.jsx("ul",{className:"inventory-list",children:n.map((r,t)=>e.jsx("li",{children:r},`${t}:${r}`))}):e.jsx("p",{className:"muted small",children:"无"})}function Hn({items:n,unknown:r}){return r?e.jsx("p",{className:"muted small",children:"模型清单未知，无法判断"}):n.length?e.jsx("ul",{className:"inventory-list",children:n.map((t,s)=>e.jsxs("li",{children:[t.name||"未命名模型",e.jsxs("span",{children:[t.node_class||"未知节点"," · ",t.input||"未知输入"]})]},`${s}:${t.name}`))}):e.jsx("p",{className:"muted small",children:"无"})}function Xs({worker:n,snapshot:r}){const t=n.capability_comparison||{},s=En(n,r.comparisonBaseline),i=t.model_inventory_status==="unknown",a=t.missing_node_classes||[],o=t.extra_node_classes||[],l=t.missing_models||[],p=t.extra_models||[];return["none","ambiguous"].includes(r.comparisonBaseline.status||"")||!t.status||t.status==="unknown"&&i&&!a.length&&!o.length?e.jsxs("section",{className:"inventory-audit",children:[e.jsx("h3",{children:"与主节点清单对比"}),e.jsxs("div",{className:"notice-box",children:[e.jsx("b",{className:s.tone,children:s.label}),e.jsxs("p",{children:[gn(r),"。旧版 Worker 或清单字段缺失时不会猜测为完整。"]})]})]}):e.jsxs("section",{className:"inventory-audit",children:[e.jsxs("div",{className:"inventory-heading",children:[e.jsx("h3",{children:"与主节点清单对比"}),e.jsx("span",{className:"f-chip inventory-chip","data-tone":s.tone,children:s.label})]}),e.jsxs("p",{className:"muted small",children:[gn(r),"；文件名、相对路径和版本均按精确值比较。"]}),e.jsxs("div",{className:"inventory-grid",children:[e.jsxs("div",{className:"inventory-block",children:[e.jsxs("h4",{children:["缺失节点类 ",e.jsx("span",{children:a.length})]}),e.jsx(Bn,{items:a}),e.jsxs("h4",{children:["缺失模型 ",e.jsx("span",{children:i?"未知":l.length})]}),e.jsx(Hn,{items:l,unknown:i})]}),e.jsxs("div",{className:"inventory-block",children:[e.jsxs("h4",{children:["额外节点类 ",e.jsx("span",{children:o.length})]}),e.jsx(Bn,{items:o}),e.jsxs("h4",{children:["额外模型 ",e.jsx("span",{children:i?"未知":p.length})]}),e.jsx(Hn,{items:p,unknown:i})]})]})]})}function Ys({worker:n,snapshot:r,now:t,stale:s,restartUnavailable:i,onRestart:a,onClose:o}){const[l,p]=m.useState(null),[d,c]=m.useState(""),g=i||(s?"服务状态已过期，请刷新后重试。":le(n)?"主节点不支持远程重启。":te(n)?["pending","running"].includes(n.sync_status||"")?"节点已有维护操作，请等待完成。":"":"节点已离线，无法提交重启。"),u=x=>g||(n.capabilities?.[x==="reboot_host"?"supports_host_reboot":"supports_service_restart"]!==!0?"当前 Worker 不支持此操作，请先更新 Worker。":""),y=n.capabilities||{},j=y.telemetry||{},w=hr(n),v=sn(n),f=En(n,r.comparisonBaseline),h=[["节点角色",le(n)?"主节点（不参与文件同步）":"执行节点"],["清单状态",e.jsx("span",{className:f.tone,children:f.label})],["比较基准",gn(r)],["主机",j.hostname||"未记录"],["ComfyUI",te(n)?n.comfy_online===!0?"在线":n.comfy_online===!1?"不可用":"未获取":"非实时"],["任务接收",e.jsx("span",{className:v[1],children:v[0]})],["维护状态",zn(n)],["维护消息",le(n)?"此节点已排除在批量文件同步之外":n.sync_message||"未记录"],["最后心跳",`${ze(n.last_seen)} / ${Cn(n.last_seen,t)}`],["遥测时间",`${ze(j.collected_at)} · ${Mn(n,t,s)?"新鲜采集":"非实时 / 未采集"}`],["节点能力",y.node_classes?`${y.node_classes.length} 个`:"未记录"],["当前任务",e.jsx(gr,{worker:n,snapshot:r})],["系统内存",`${fe(w.used_bytes)} / ${fe(w.total_bytes)}（最后上报）`]];return e.jsxs(e.Fragment,{children:[e.jsxs(re,{title:`${n.name||n.id} · 节点详情`,onClose:o,className:F.workerDialog,children:[e.jsxs("div",{className:F.workerActions,role:"group","aria-label":"节点重启操作",children:[e.jsx("button",{type:"button",disabled:!!u("restart_services"),title:u("restart_services")||"重启 ComfyUI 和 Worker，不重启电脑",onClick:()=>p("restart_services"),children:"重启服务"}),e.jsx("button",{type:"button",className:"danger",disabled:!!u("reboot_host"),title:u("reboot_host")||"重启节点所在的整台电脑",onClick:()=>p("reboot_host"),children:"重启节点"})]}),e.jsx("p",{className:"muted small",children:g||(n.capabilities?.supports_service_restart!==!0&&n.capabilities?.supports_host_reboot!==!0?"当前 Worker 不支持远程重启，请先更新 Worker。":"重启服务仅重启 ComfyUI 和 Worker；重启节点将重启整台电脑。节点收到请求后立即执行，会中断当前任务，不等待空闲。")}),d&&e.jsx("p",{className:"notice-box",role:"status",children:d}),e.jsxs("div",{className:"f-tags",children:[e.jsx("span",{className:"f-chip",children:Ge(n.state)}),e.jsx("span",{className:"f-chip",children:pr(n)}),e.jsx("span",{className:"f-chip",children:mr(n)}),e.jsxs("span",{className:"f-chip",children:["Worker ID: ",n.id]})]}),e.jsx(br,{rows:h,className:"f-definition"}),e.jsx(Xs,{worker:n,snapshot:r}),e.jsx("div",{className:"f-grid2",children:Ke(n).map((x,k)=>e.jsxs("div",{className:"notice-box",children:[e.jsxs("b",{children:["GPU ",x.index??"未知"," · ",x.name||"未记录"]}),e.jsxs("p",{children:["最后上报：利用率"," ",B(x.utilization_percent)==null?"未采集":`${x.utilization_percent}%`,"；显存 ",fe(x.memory_used_bytes)," / ",fe(x.memory_total_bytes),"；温度"," ",B(x.temperature_c)==null?"未采集":`${x.temperature_c}°C`]})]},`${x.index??k}:${k}`))}),e.jsx(Js,{capabilities:y})]}),l&&e.jsxs(re,{title:l==="reboot_host"?"重启节点电脑":"重启节点服务",submitLabel:l==="reboot_host"?"确认重启电脑":"确认重启服务",onClose:()=>p(null),onSubmit:async()=>{const x=u(l);if(x)throw new Error(x);await a(l),c(`${l==="reboot_host"?"电脑重启":"服务重启"}请求已提交，节点收到请求后立即执行，会中断当前任务；恢复状态以节点实际回报为准。`)},children:[e.jsxs("p",{children:["目标节点：",e.jsx("strong",{children:n.name||n.id})]}),e.jsx("div",{className:"notice-box",children:l==="reboot_host"?"此操作会重启该节点所在的整台 Windows 电脑，会强制关闭程序，未保存内容可能丢失，所有服务都会暂时离线。电脑恢复后，ComfyUI 和 Worker 是否自动启动取决于该电脑的启动配置。":"此操作只重启该节点的 ComfyUI 和 Worker 服务，不会重启 Windows 电脑，不同步文件或更新代码。"}),e.jsx("p",{children:"节点收到请求后立即执行，会中断当前任务，不等待空闲；提交后暂停向该节点分配新任务。请求已接收不代表重启已完成，请查看节点维护状态。"}),l==="reboot_host"&&e.jsxs("label",{className:"check-label",children:[e.jsx("input",{type:"checkbox",required:!0}),"我确认重启整台电脑，并已处理其他程序和未保存内容"]})]})]})}function Vn(n){return n.state==="busy"||n.state==="running"?0:n.state==="idle"?1:n.state==="offline"?3:2}function Zs({snapshot:n,now:r,stale:t,mutationDisabled:s,deletingWorker:i,onDetails:a,onTemperature:o,onDelete:l,onSync:p}){const d=[...n.workers].sort((c,g)=>Vn(c)-Vn(g));return e.jsx(e.Fragment,{children:d.length?d.map(c=>{const g=Mn(c,r,t),u=Ke(c),y=hr(c),j=Ge(c.state),w=sn(c),v=En(c,n.comparisonBaseline),f=!!(c.capability_comparison?.missing_models?.length||c.capability_comparison?.missing_node_classes?.length),h=ur(c,n.comparisonBaseline),x=te(c)?c.comfy_online===!0?"ComfyUI 在线":c.comfy_online===!1?"ComfyUI 不可用":"ComfyUI 未获取":"ComfyUI 非实时";return e.jsxs("article",{className:F.workerCard,"data-worker-card":c.id,"data-worker-state":c.state||"unknown","aria-label":c.name||c.id,children:[e.jsxs("div",{className:F.workerIdentityBlock,children:[e.jsxs("header",{className:F.workerHeader,children:[e.jsx("div",{className:F.workerName,"data-worker-name":!0,children:e.jsx("strong",{children:c.name||"未命名执行端"})}),e.jsx("span",{className:F.workerState,"data-state":c.state,children:j})]}),e.jsxs("div",{className:F.workerVersions,children:[le(c)&&e.jsx("span",{className:"f-chip",children:"主节点"}),e.jsx("span",{children:pr(c)}),e.jsx("span",{children:mr(c)})]})]}),e.jsxs("div",{className:F.workerResources,children:[u.map((k,L)=>e.jsx(Gn,{gpu:k,ram:void 0,live:g},`${k.index??L}:${L}`)),!u.length&&e.jsx("p",{className:F.telemetryNote,children:"未采集 GPU 指标"}),e.jsx(Gn,{gpu:void 0,ram:y,live:g}),!g&&e.jsx("p",{className:F.telemetryNote,children:te(c)?"遥测未采集或已过期":"非实时，不沿用旧读数"}),e.jsxs("div",{className:F.workerService,children:[e.jsx("span",{"data-tone":c.comfy_online===!1&&te(c)?"bad":void 0,children:x}),e.jsx("span",{"data-tone":w[1],children:w[0]})]})]}),e.jsxs("div",{className:F.workerActivity,children:[e.jsxs("div",{className:F.workerTask,children:[e.jsx("span",{className:F.sectionLabel,children:"当前任务"}),e.jsx("div",{children:e.jsx(gr,{worker:c,snapshot:n})})]}),e.jsxs("div",{className:F.workerSync,children:[e.jsxs("div",{className:F.syncMeta,children:[e.jsx("span",{className:Me(c)?"danger":"",children:zn(c)}),e.jsxs("span",{title:c.last_seen==null?"未记录":new Date(Number(c.last_seen)*1e3).toLocaleString("zh-CN",{hour12:!1}),children:["心跳 ",Cn(c.last_seen,r)]})]}),!le(c)&&f?e.jsxs("button",{type:"button",className:F.inventoryAction,"data-tone":v.tone,"data-sync-worker":c.id,"data-focus-key":`worker-sync:${c.id}`,"aria-label":`同步设备 ${c.name||c.id}：${v.label}`,disabled:s||!!h,title:h||"仅同步这台设备；点击查看范围并确认",onClick:()=>p(c),children:[e.jsx("span",{children:v.label}),e.jsxs("span",{className:F.syncActionLabel,children:[Ce(c)?"维护中":h?"不可同步":"点击同步",e.jsx(nn,{name:"chevron"})]})]}):e.jsx("span",{className:F.inventoryLabel,"data-tone":v.tone,children:v.label}),!le(c)&&f&&h&&!Ce(c)&&e.jsx("p",{className:F.syncMessage,children:h}),!le(c)&&c.sync_message&&(Me(c)||Ce(c))&&e.jsx("p",{className:F.syncMessage,role:Me(c)?"alert":void 0,children:c.sync_message})]})]}),e.jsxs("footer",{className:F.cardActions,children:[e.jsx("button",{type:"button",className:"link-button","data-worker":c.id,"data-focus-key":`worker-details:${c.id}`,onClick:()=>a(c),children:"节点详情"}),e.jsx("button",{type:"button",className:"link-button","data-temperature":c.id,"data-focus-key":`worker-temperature:${c.id}`,"aria-label":`查看 ${c.name||c.id} 温度趋势`,onClick:()=>o(c.id),children:"温度趋势"}),e.jsx("button",{type:"button",className:"link-button worker-delete danger","data-delete-worker":c.id,"data-focus-key":`worker-delete:${c.id}`,"aria-label":`删除设备 ${c.name||c.id}`,disabled:s,onClick:()=>l(c),children:i===c.id?"正在删除…":"删除设备"})]})]},c.id)}):e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"还没有注册执行端"}),e.jsx("p",{children:"执行端注册并上报心跳后，将在此显示状态。"})]})})}function Gn({gpu:n,ram:r,live:t}){const s=[...n?[{label:`GPU ${n.index??""} 显存`,short:"显存",used:n.memory_used_bytes,total:n.memory_total_bytes,kind:"vram"}]:[],...r?[{label:"系统内存",short:"系统内存",used:r.used_bytes,total:r.total_bytes,kind:"ram"}]:[]].map(a=>{const o=B(a.used),l=B(a.total),p=t&&o!=null&&o>=0&&l!=null&&l>0?Math.max(0,Math.min(100,o/l*100)):null;return{...a,value:p}}),i=t&&n?B(n.temperature_c):null;return e.jsx("div",{className:F.resourceRow,children:e.jsxs("div",{className:F.resourceReadings,children:[n&&e.jsxs("strong",{className:F.resourceTitle,children:[e.jsxs("span",{children:["GPU ",n.index??"未知"," · ",n.name||"未记录型号"]}),e.jsx("span",{children:i==null?"温度未采集":`${i}°C`})]}),s.map(a=>e.jsxs("div",{className:F.resourceReading,"data-resource":a.kind,role:a.value==null?void 0:"meter","aria-label":a.label,"aria-valuemin":a.value==null?void 0:0,"aria-valuemax":a.value==null?void 0:100,"aria-valuenow":a.value??void 0,"aria-valuetext":a.value==null?void 0:`${fe(a.used)} / ${fe(a.total)}，${Math.round(a.value)}%`,children:[e.jsx("span",{className:F.resourceLabel,children:a.short}),e.jsx("span",{children:t?`${fe(a.used)} / ${fe(a.total)}`:"非实时 / 未采集"}),e.jsx("b",{children:a.value==null?"—":`${Math.round(a.value)}%`}),e.jsx("div",{className:F.resourceBar,"data-resource-bar":!0,"aria-hidden":"true",children:a.value!=null&&e.jsx("i",{"data-resource-fill":!0,style:{width:`${a.value}%`}})})]},a.kind)),r&&e.jsx("span",{className:F.resourceNote,children:t?"系统可见容量":"最后配置见详情"})]})})}function Qs({snapshot:n,now:r,onDetails:t}){const s=n.workers.filter(i=>!te(i)||Me(i)||["disabled","error"].includes(i.state||""));return s.length?e.jsx(e.Fragment,{children:s.map(i=>e.jsxs("button",{type:"button",className:"attention-item","data-worker":i.id,"data-focus-key":`worker-attention:${i.id}`,onClick:()=>t(i),children:[e.jsxs("span",{className:"attention-top",children:[e.jsx("strong",{className:"danger",children:i.name||i.id}),e.jsx(nn,{name:"chevron"})]}),e.jsx("b",{className:"danger",children:te(i)?Me(i)?"节点同步失败":Ge(i.state):"已离线"}),e.jsx("p",{children:te(i)?Me(i)&&i.sync_message?i.sync_message:`${sn(i)[0]}；查看完整节点详情。`:`最后心跳 ${Cn(i.last_seen,r)}`})]},i.id))}):e.jsx("p",{className:"muted small",children:"当前没有需要关注的节点异常。"})}function ea(n){const{state:r,store:t,service:s,automatic:i,setAutomatic:a,clock:o}=ss(n),{snapshot:l,stale:p,loading:d,error:c,isolated:g,mutation:u,deletingWorker:y}=r,[j,w]=m.useState(null),{history:v}=r,f=v.filter,h=Rt(l,Math.max(o,Date.now())),x=l?.health||{},k=l?.status||{},L=n.sandbox||g||p||!l||u!=null,T=()=>w(null),_=S=>{l&&w({kind:"worker",worker:S,snapshot:l})},N=S=>{if(n.sandbox||!t.canMutate()){n.notify({message:"当前不可更新：隔离副本或服务状态未就绪。",tone:"warning"});return}w(S)},E=()=>{if(n.sandbox||!t.canMutate())throw new Error("隔离副本或服务状态未就绪，禁止修改设备")},b=x.ok===!0?"运行正常":x.ok===!1?"异常":"状态未知",R=x.comfy_online===!0?"可用":x.comfy_online===!1?"不可用":"状态未知",D=[["运行模式",x.mode==="controller"?"Linux 中间层 / Controller":x.mode==="local"?"Windows 单机":x.mode||"未获取"],["可用能力",B(x.capabilities)==null?"未获取":`${x.capabilities} 项`],["任务记录",B(x.jobs)==null?"未获取":`${x.jobs} 条`],["大模型接口",x.llm?x.llm.ok?`已配置 · ${x.llm.model||"型号未记录"}`:"未配置":"未获取"],["页面地址",location.origin+"/controller"],["创作画布",location.origin+"/"]],z=rs(l,v);return e.jsxs("main",{id:"main",className:F.page,tabIndex:-1,"aria-busy":d?!0:void 0,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"运行面板"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{className:"subtitle",id:"service-subtitle",children:l?`中间层${b} / ComfyUI ${R}`:"正在读取中间层运行状态"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{className:"muted small",id:"refresh-state",role:"status",children:d?"正在读取…":p?"连接失败 · 快照非实时":l?`最后刷新 ${new Date(l.receivedAt).toLocaleTimeString("zh-CN",{hour12:!1})}`:"正在加载…"}),e.jsxs("label",{className:"check-label",children:[e.jsx("input",{id:"auto-refresh",type:"checkbox",checked:i,onChange:S=>a(S.target.checked)}),"每5秒刷新"]}),e.jsxs("button",{type:"button",className:"primary",id:"refresh",disabled:d||u!=null,onClick:()=>{t.refreshAll()},children:[e.jsx(nn,{name:"refresh"}),"立即刷新"]}),e.jsx("button",{type:"button",id:"sync-all",disabled:L,title:n.sandbox||g?"本地隔离数据副本禁止节点同步，不能修改正式机器。":void 0,onClick:()=>N({kind:"sync"}),children:"一键更新全部节点"})]})]}),e.jsxs("div",{id:"error",className:"f-error",role:"alert",hidden:!c,children:[e.jsxs("div",{children:[e.jsx("b",{id:"error-message",children:c}),e.jsx("p",{children:"已载入内容仅为上次快照，不能作为实时状态；未知数据不记为零。"})]}),e.jsx("button",{type:"button",id:"retry",disabled:d||u!=null,onClick:()=>{t.refreshAll()},children:"重试读取"})]}),e.jsxs("section",{className:`metrics f-metrics6 ${F.overview}`,"aria-label":"运行概览",children:[e.jsx(we,{id:"service",label:"中间层服务",value:x.ok===!0?"运行正常":x.ok===!1?"异常":"未获取",compact:!0,tone:x.ok===!0?"ok":x.ok===!1?"bad":"",noteId:"service-mode",note:x.mode==="controller"?"Controller 模式":x.mode==="local"?"Windows 单机":x.mode||"等待服务响应"}),e.jsx(we,{id:"workers",label:"在线执行端",value:l?`${ye(x.online_workers)} / ${ye(x.workers)}`:"未获取",note:"含禁用与同步中的在线节点"}),e.jsx(we,{id:"running",label:"正在运行",value:ye(k.running_count),note:"由中间层调度的任务"}),e.jsx(we,{id:"queued",label:"排队任务",value:ye(k.queued_count),note:"等待可用执行端"}),e.jsx(we,{id:"comfy",label:"ComfyUI",value:x.comfy_online===!0?"可用":x.comfy_online===!1?"不可用":"未获取",compact:!0,tone:x.comfy_online===!0?"ok":x.comfy_online===!1?"bad":"",note:"单节点状态见下方卡片"}),e.jsx(we,{id:"uptime",label:"服务运行时间",value:B(x.started_at)!=null&&B(x.server_time)!=null?$n(Number(x.server_time)-Number(x.started_at)):"未获取",compact:!0,note:"本次中间层服务启动至今"})]}),e.jsxs("div",{className:"dashboard-grid",children:[e.jsxs("section",{className:"card","aria-labelledby":"workers-title",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"workers-title",children:"Windows 执行端"}),e.jsx("p",{className:"section-subtitle",children:"设备资源、当前任务与同步状态"})]}),e.jsx("span",{className:"muted small",id:"worker-count",children:l?`${l.workers.length} 台 / ${l.workers.filter(te).reduce((S,Q)=>S+Ke(Q).length,0)} 张在线GPU`:"正在读取"})]}),e.jsx("div",{id:"worker-rows",className:F.workerGrid,children:l?e.jsx(Zs,{snapshot:l,now:h,stale:p,mutationDisabled:L,deletingWorker:y,onDetails:_,onTemperature:S=>w({kind:"temperature",id:S}),onDelete:S=>N({kind:"delete",worker:S}),onSync:S=>N({kind:"syncWorker",worker:S})}):e.jsx("p",{className:"loading-note",children:c?"执行端读取失败，请点击“重试读取”。":"正在读取执行端…"})}),e.jsx("p",{className:"table-note",children:"显存与内存分条显示，多显卡逐卡列出，系统内存不重复。离线或过期读数不作实时数据。点击清单差异可仅同步该设备。"})]}),e.jsxs("aside",{className:"right-column","aria-label":"需要关注及配置",children:[e.jsxs("section",{className:"card",children:[e.jsx("div",{className:"section-heading",children:e.jsxs("h2",{className:"heading-inline",children:[e.jsx("span",{className:"danger",id:"attention-icon",children:e.jsx(nn,{name:"alert"})}),"需要关注"]})}),e.jsx("div",{className:"attention-list",id:"attention-list",tabIndex:0,role:"region","aria-label":"需要关注的节点列表",children:l?e.jsx(Qs,{snapshot:l,now:h,onDetails:_}):e.jsx("p",{className:"muted small",children:c?"节点状态未获取，不能判断是否存在异常。":"正在读取节点状态…"})})]}),e.jsxs("section",{className:"card",children:[e.jsx("div",{className:"section-heading",children:e.jsx("h2",{children:"服务配置摘要"})}),e.jsx(br,{id:"config-rows",className:"f-config-definition",rows:D})]})]})]}),e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"最近任务"}),e.jsx("p",{className:"section-subtitle",children:"数据库历史按时间倒序分批加载；实时任务优先显示，归档未记录的信息不作推测"})]}),e.jsxs("label",{className:"filter-label",children:["任务状态",e.jsxs("select",{id:"jobs-filter",value:f,onChange:S=>{const Q=Vt.safeParse(S.target.value);Q.success&&t.setHistoryFilter(Q.data)},children:[e.jsx("option",{value:"all",children:"全部状态"}),["running","queued","done","error","canceled"].map(S=>e.jsx("option",{value:S,children:cr[S]},S))]})]})]}),e.jsx("div",{className:"table-wrap f-job-scroll",role:"region","aria-label":"最近任务列表","aria-describedby":"job-note","aria-busy":!!v.loading,tabIndex:0,onScroll:S=>{const{scrollHeight:Q,scrollTop:J,clientHeight:ee}=S.currentTarget;Q-J-ee<=160&&!v.error&&t.loadMore()},children:e.jsxs("table",{className:"jobs-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["状态","姓名 / 项目 / 卡片","模式","过程进度 / 步骤","执行端","创建时间","耗时 / 错误"].map(S=>e.jsx("th",{scope:"col",children:S},S))})}),e.jsx("tbody",{id:"job-rows",children:e.jsx(ls,{snapshot:l,now:h,items:z,onError:S=>w({kind:"job",job:S})})})]})}),e.jsxs("div",{className:F.historyControls,children:[e.jsxs("p",{className:"table-note",id:"job-note",role:"status","aria-live":"polite",children:[v.loading?v.loading==="more"?"正在加载更多历史…":"正在刷新任务历史…":v.initialized?v.hasMore?"向下滚动或点击加载更多。":"历史记录已加载完毕。":"任务历史尚未载入。",` 当前筛选历史共 ${v.total??"未知"} 条，已加载 ${v.jobs.length} 条；合并实时任务后显示 ${z.length} 条。`]}),v.error&&e.jsx("p",{role:"alert",children:v.error}),v.error?e.jsx("button",{type:"button",disabled:!!v.loading,onClick:()=>{t.retryHistory()},children:"重试任务历史"}):e.jsx("button",{type:"button","aria-controls":"job-rows",disabled:!!v.loading||!v.hasMore,onClick:()=>{t.loadMore()},children:"加载更多历史"})]})]})]}),j?.kind==="worker"&&e.jsx(Ys,{worker:l?.workers.find(S=>S.id===j.worker.id)||j.worker,snapshot:l||j.snapshot,now:h,stale:p,restartUnavailable:n.sandbox||g?"隔离副本禁止重启真实设备。":u!=null?"设备操作正在提交，请稍候。":!l||p?"服务状态未就绪，请刷新后重试。":l.workers.some(S=>S.id===j.worker.id)?"":"该设备已移除或已被新的注册替代。",onRestart:async S=>{E(),await t.restartWorker(j.worker.id,S)},onClose:T}),j?.kind==="temperature"&&e.jsx(Gs,{workerId:j.id,worker:l?.workers.find(S=>S.id===j.id),service:s,now:h,stale:p,revision:r.refreshed,onClose:T}),j?.kind==="job"&&e.jsxs(re,{title:"任务错误详情",onClose:T,children:[e.jsxs("p",{children:["任务 ",j.job.id]}),e.jsx("pre",{children:j.job.error||"未记录错误详情"}),e.jsxs("details",{children:[e.jsx("summary",{children:"任务执行记录"}),e.jsx("pre",{children:JSON.stringify(j.job,null,2)})]})]}),j?.kind==="syncWorker"&&e.jsxs(re,{title:"同步单台设备",onClose:T,submitLabel:"确认同步此设备",onSubmit:async()=>{E(),await t.syncWorker(j.worker.id),n.notify({message:`同步请求已提交至“${j.worker.name||j.worker.id}”，等待设备空闲后执行；完成情况以节点反馈为准。`,tone:"success"})},children:[e.jsxs("p",{children:["仅同步这一台设备“",j.worker.name||j.worker.id,"”（",j.worker.id,"），不更新其他设备。"]}),e.jsx("div",{className:"notice-box",children:"设备空闲后同步主节点的 ComfyUI 核心、models 和 user，拉取 chouka 最新代码，再按本机 GPU 启动配置重启 ComfyUI 与 Worker，不重启 Windows。同步会复制或覆盖对应文件，并非仅补齐缺失项；不会清除设备上的全部额外资源。"}),e.jsx("p",{children:"忙碌时等待当前任务结束，不立即中断任务。请求提交不代表同步已完成；同步结束后需重新采集清单核对。"})]}),j?.kind==="sync"&&e.jsxs(re,{title:"更新全部节点",onClose:T,submitLabel:"确认更新",onSubmit:async()=>{E();const S=await t.syncAll();n.notify({message:`已向 ${ye(S.worker_count)} 个节点下发更新请求；主节点跳过 ${ye(S.primary_count)} 个，旧版跳过 ${ye(S.skipped_count)} 个。`,tone:"success"})},children:[e.jsx("p",{children:"确认更新全部节点？"}),e.jsx("div",{className:"notice-box",children:"节点空闲后依次同步 ComfyUI 核心、models 和 user，拉取 chouka 最新代码，再按本机 GPU 启动配置重启 ComfyUI 与 Worker。全部服务恢复就绪后才显示完成。忙碌节点等待当前任务结束；离线节点下次上线后执行。主节点作为同步源不会参与更新；旧版节点会跳过，需先手动更新一次 Worker 及配套启动文件。"}),e.jsx("p",{className:"muted small",children:"这是实际节点更新和服务重启操作，确认后将向中间层提交请求。"})]}),j?.kind==="delete"&&e.jsxs(re,{title:"删除设备",onClose:T,submitLabel:"确认删除设备",onSubmit:async()=>{E(),await t.deleteWorker(j.worker.id),n.notify({message:"设备已删除，历史任务和账单保留。",tone:"success"})},children:[e.jsxs("p",{children:["确认删除设备“",j.worker.name||"未命名执行端","”？"]}),e.jsx("div",{className:"notice-box",children:"设备会从列表中移除，历史任务和账单不会删除。设备后续重新注册时会重新出现。"})]})]})}function we({id:n,label:r,value:t,note:s,noteId:i,compact:a=!1,tone:o=""}){return e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:r}),e.jsx("p",{className:`metric-value${a?" compact":""}${o?` ${o}`:""}`,id:n,children:t}),e.jsx("p",{className:"metric-note",id:i,children:s})]})})}const De=pe([C().min(1),V().finite()]).transform(String),Re=Ve(["user","admin","monitor"]),Ue=Ve(["read","operate"]),na=q({id:De,username:C(),display_name:C().nullish(),phone:C().nullish(),role:Re,enabled:Y(),team_leader:Y().default(!1),approval_status:C().optional()}),ra=q({id:C().min(1),name:C().nullish(),owner_id:De,owner_username:C().nullish(),owner_display_name:C().nullish(),team_id:C().nullish(),team_name:C().nullish()}),Kn=pe([q({scope:ie("all"),viewer_id:De,permission:Ue}),q({scope:ie("owner").optional(),viewer_id:De,owner_id:De.refine(n=>n!=="*","无效所有者"),permission:Ue})]),ta=q({requests:O(q({username:C(),display_name:C().nullish(),status:C(),created_at:V().nullish(),decided_by:C().nullish()})),outbox:q({pending:V().int().nonnegative(),oldest_at:V().nullish()}).nullish()}),yr={admin:"管理员",user:"普通用户",monitor:"监控展示员"},rn={approved:"已通过",pending:"待审批",rejected:"已拒绝"},Ze="全部个人和项目组画布，包括现有及未来新增画布",vr="画布内容和历史费用不变。新所有者的授权访问者将获得相应权限（可操作包含删除）；原所有者及其授权访问者可能失去访问权限。管理员仍可访问全部画布。项目组画布由成员关系授权，不能改为个人归属。";function We(n){return(n?.username||"未知账号")+(n?.display_name?.trim()?`（${n.display_name.trim()}）`:"")}function me(n,r){return`${We(n.find(t=>t.id===r))}（ID: ${r}）`}function yn(n,r){const t=r.find(s=>s.id===n.owner_id);return We({username:n.owner_username||t?.username,display_name:n.owner_display_name||t?.display_name})}function vn(n){return n==="operate"?"可操作（含删除）":"只读"}function jr(n){return n?new Date(n*1e3).toLocaleString("zh-CN",{hour12:!1}):"—"}const ue=C().min(1).max(512).refine(n=>n!=="*","无效账号 ID"),wr=C().min(8,"密码至少 8 位").max(1024),sa=q({username:C().trim().min(1,"请输入账号名").max(128),password:wr,role:Re,team_leader:Y()}).refine(n=>n.role!=="monitor"||!n.team_leader,"监控展示员不能担任组长"),aa=Xr("scope",[q({scope:ie("all"),viewer_id:ue,permission:Ue}),q({scope:ie("owner"),viewer_id:ue,owner_id:ue,permission:Ue}).refine(n=>n.viewer_id!==n.owner_id,"访问者和所有者不能是同一个账号。")]),ia=q({owner_id:ue,projects:O(q({project_id:C().min(1).max(512),owner_id:ue})).min(1,"请选择画布").max(1e3,"每次最多分配 1000 个画布")}).refine(n=>new Set(n.projects.map(r=>r.project_id)).size===n.projects.length,"画布分配清单存在重复项"),Jn=q({}).passthrough(),Xn=n=>`/api/admin/global-grants/${encodeURIComponent(ue.parse(n))}`,Yn=n=>`/api/admin/users/${encodeURIComponent(ue.parse(n))}`;function oa(n){const r=async(t,s,i)=>{Jn.parse(await n.json(t,s,i))};return{async snapshot(t){const s={signal:t,cache:"no-store"},[i,a,o]=await Promise.all([n.read("/api/admin/users",q({users:O(na)}),s),n.read("/api/admin/grants",q({grants:O(Kn)}),s),n.read("/api/projects",q({projects:O(ra)}),s)]);return{users:i.users,grants:a.grants,projects:o.projects}},registrations:t=>n.read("/api/admin/registrations",ta,{signal:t,cache:"no-store"}),create:t=>r("/api/admin/users","POST",sa.parse(t)),update:(t,s)=>{const i=pe([q({role:Re}).strict(),q({enabled:Y()}).strict(),q({team_leader:Y()}).strict()]).parse(s);return r(Yn(t),"PATCH",i)},resetPassword:(t,s)=>r(`${Yn(t)}/password`,"POST",{password:wr.parse(s)}),saveGrant:t=>{const s=aa.parse(t);return s.scope==="all"?r(Xn(s.viewer_id),"PUT",{permission:s.permission}):r("/api/admin/grants","PUT",{viewer_id:s.viewer_id,owner_id:s.owner_id,permission:s.permission})},async revokeGrant(t){const s=Kn.parse(t),i=s.scope==="all"?Xn(s.viewer_id):`/api/admin/grants/${encodeURIComponent(ue.parse(s.viewer_id))}/${encodeURIComponent(ue.parse(s.owner_id))}`;Jn.parse(await n.request(i,{method:"DELETE"}))},async assign(t){const s=await n.json("/api/admin/projects/assign","POST",ia.parse(t));return q({count:V().int().nonnegative()}).parse(s).count}}}function _e(n,r){const t=new FormData(n).get(r);if(typeof t!="string")throw new Error("表单字段不正确："+r);return t}function la(n,r,t){const s=r.trim().toLowerCase();return n.filter(i=>(!t||i.owner_id===t)&&(!s||(i.name||"").toLowerCase().includes(s)||i.id.toLowerCase().includes(s)))}function ca(n,r){const t=n.filter(i=>!i.team_id),s=t.filter(i=>r.has(i.id)).length;return{personal:t,checked:t.length>0&&s===t.length,indeterminate:s>0&&s<t.length}}function da(n,r,t,s){const i=n.find(a=>a.id===r);if(!i||i.role==="monitor"||t!=="*"&&!n.some(a=>a.id===t))throw new Error("请选择有效账号和授权范围。");if(r===t)throw new Error("访问者和所有者不能是同一个账号。");return t==="*"?{scope:"all",viewer_id:r,permission:s}:{scope:"owner",viewer_id:r,owner_id:t,permission:s}}function pa(n,r,t,s){const i=n.find(o=>o.id===s&&o.enabled&&o.role!=="monitor");if(!i)throw new Error("请选择有效的启用目标账号。");if(!t.size)throw new Error("请选择个人画布。");if(t.size>1e3)throw new Error("每次最多分配 1000 个画布，请缩小筛选范围后再选择。");const a=r.filter(o=>t.has(o.id));if(a.length!==t.size||a.some(o=>o.team_id))throw new Error("选择包含项目组画布或已变化的画布，请刷新后重新选择。");return{target:i,chosen:a.map(o=>({...o})),payload:{owner_id:i.id,projects:a.map(o=>({project_id:o.id,owner_id:o.owner_id}))}}}function ma({http:n,notify:r}){const t=m.useMemo(()=>oa(n),[n]),[s,i]=m.useState({users:[],projects:[],grants:[]}),[a,o]=m.useState(null),[l,p]=m.useState(""),[d,c]=m.useState(!1),[g,u]=m.useState(!0),[y,j]=m.useState(!1),[w,v]=m.useState(""),[f,h]=m.useState("正在加载真实数据…"),[x,k]=m.useState(new Set),[L,T]=m.useState(""),_=m.useRef(!1),N=m.useRef(!1),E=m.useRef(!1),b=m.useRef(0),R=m.useRef(null),D=m.useRef(r);m.useEffect(()=>{D.current=r},[r]);const z=m.useCallback(async()=>{if(_.current)return;_.current=!0;const J=++b.current,ee=new AbortController;R.current=ee;const oe=()=>E.current&&b.current===J;u(!0),h("正在加载真实数据…");try{const be=await t.snapshot(ee.signal);if(!oe())return;i(be),c(!0),k(new Set);try{const je=await t.registrations(ee.signal);if(!oe())return;o(je),p("")}catch(je){if(!oe())return;o(null);const Dn="注册申请信息加载失败："+ne(je);p(Dn),D.current({message:Dn,tone:"error"})}oe()&&h("更新于 "+new Date().toLocaleTimeString("zh-CN",{hour12:!1}))}catch(be){if(!oe())return;throw c(!1),h("加载失败，请刷新重试"),be}finally{oe()&&(_.current=!1,u(!1))}},[t]),S=m.useCallback(async()=>{if(!(N.current||_.current)){v("");try{await z()}catch(J){if(!E.current)return;const ee=ne(J);v(ee),D.current({message:ee,tone:"error"})}}},[z]);return m.useEffect(()=>(E.current=!0,S(),()=>{E.current=!1,R.current?.abort(),_.current=!1}),[S]),{...s,service:t,registrations:a,registrationError:l,ready:d,loading:g,mutationBusy:y,error:w,setError:v,refreshNote:f,selected:x,setSelected:k,assignStatus:L,setAssignStatus:T,refreshPage:S,mutate:async(J,ee,oe)=>{if(N.current||_.current||!d)throw new Error("另一项操作正在提交或列表尚未就绪，请稍后重试。");N.current=!0,j(!0),v("");try{if(await J(),!E.current)return;oe?.(),D.current({message:ee,tone:"success"});try{await z()}catch(be){if(!E.current)return;const je="操作已成功，但列表刷新失败，请点击刷新数据后继续："+ne(be);v(je),D.current({message:je,tone:"warning"})}}finally{N.current=!1,E.current&&j(!1)}}}}function _r({initial:n="user",onChange:r}){return e.jsxs("label",{className:"field",children:["角色",e.jsx("select",{name:"role",defaultValue:n,onChange:t=>r?.(Re.parse(t.currentTarget.value)),children:["user","admin","monitor"].map(t=>e.jsx("option",{value:t,children:yr[t]},t))})]})}function kr(){return e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"field",children:["新密码（至少 8 位）",e.jsx("input",{name:"password",type:"password",minLength:8,maxLength:1024,autoComplete:"new-password",required:!0})]}),e.jsx("p",{className:"notice-box",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。密码不会显示在列表中。"})]})}function ua(){const[n,r]=m.useState("user"),[t,s]=m.useState(!1);return e.jsxs("div",{id:"create",className:"form-grid",children:[e.jsxs("label",{className:"field",children:["账号名",e.jsx("input",{name:"username",required:!0,maxLength:128,autoComplete:"off"})]}),e.jsx(kr,{}),e.jsx(_r,{onChange:i=>{r(i),i==="monitor"&&s(!1)}}),e.jsxs("label",{className:"check-label",children:[e.jsx("input",{name:"team_leader",type:"checkbox",checked:t,disabled:n==="monitor",onChange:i=>s(i.currentTarget.checked)}),"独立授予组长权限"]}),e.jsx("p",{className:"notice-box",children:"创建后账号启用并标记为已通过。监控展示员不能担任组长，密码由管理员重置；其他账号登录后可自行修改。"})]})}function Le({name:n,id:r}){return e.jsxs("span",{className:"perm-identity",children:[e.jsx("span",{className:"perm-username",children:n}),e.jsxs("span",{className:"perm-user-id",children:["ID: ",r]})]})}function an({columns:n,children:r}){return e.jsx("tr",{children:e.jsx("td",{colSpan:n,children:r})})}function ha({users:n,busy:r,ready:t,action:s}){return e.jsx("div",{className:"table-wrap accounts-scroll",tabIndex:0,role:"region","aria-label":"账号列表",children:e.jsxs("table",{className:"accounts-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["账号 / ID","姓名 / 花名","手机号","角色","独立组长权限","启用状态","审批","操作"].map(i=>e.jsx("th",{scope:"col",children:i},i))})}),e.jsxs("tbody",{id:"users",children:[n.map(i=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx(Le,{name:i.username,id:i.id})}),e.jsx("td",{children:i.display_name||"—"}),e.jsx("td",{children:i.phone||"未填写"}),e.jsx("td",{children:e.jsx("span",{className:"f-chip "+(i.role==="admin"?"admin":""),children:yr[i.role]})}),e.jsx("td",{children:i.team_leader?"是":"否"}),e.jsx("td",{children:e.jsx("span",{className:"f-chip "+(i.enabled?"on":"off"),children:i.enabled?"启用":"已停用"})}),e.jsx("td",{children:Object.hasOwn(rn,i.approval_status||"")?rn[i.approval_status||""]:"—"}),e.jsx("td",{children:e.jsxs("div",{className:"row-actions",children:[e.jsx("button",{type:"button",className:i.enabled?"danger":"",disabled:r,onClick:()=>s(i,"enabled"),children:i.enabled?"停用":"启用"}),e.jsx("button",{type:"button",disabled:r,onClick:()=>s(i,"role"),children:"修改角色"}),i.role!=="monitor"&&e.jsx("button",{type:"button",disabled:r,onClick:()=>s(i,"leader"),children:i.team_leader?"取消组长权限":"设为组长"}),e.jsx("button",{type:"button",disabled:r,onClick:()=>s(i,"password"),children:"重置密码"})]})})]},i.id)),!n.length&&e.jsx(an,{columns:8,children:t?"暂无账号。":"正在加载账号…"})]})]})})}function xa({data:n,error:r}){return e.jsx("div",{className:"table-wrap registrations-scroll",tabIndex:0,role:"region","aria-label":"注册申请列表",children:e.jsxs("table",{className:"registration-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["账号","姓名 / 花名","状态","申请时间","审批人"].map(t=>e.jsx("th",{scope:"col",children:t},t))})}),e.jsxs("tbody",{id:"registrations",children:[n?.requests.map((t,s)=>e.jsxs("tr",{children:[e.jsx("td",{children:t.username}),e.jsx("td",{children:t.display_name||"—"}),e.jsx("td",{children:Object.hasOwn(rn,t.status)?rn[t.status]:t.status}),e.jsx("td",{children:jr(t.created_at)}),e.jsx("td",{children:t.decided_by||"—"})]},t.username+"-"+s)),!n?.requests.length&&e.jsx(an,{columns:5,children:r?"暂时无法加载注册申请，请点击刷新数据重试。":n?"暂无自主注册申请。":"正在加载注册申请…"})]})]})})}function fa({grants:n,users:r,busy:t,ready:s,revoke:i}){return e.jsx("div",{className:"table-wrap",tabIndex:0,role:"region","aria-label":"画布授权列表",children:e.jsxs("table",{className:"grant-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["访问者 A","方向","所有者 / 授权范围","权限","操作"].map(a=>e.jsx("th",{scope:"col",children:a},a))})}),e.jsxs("tbody",{id:"grants",children:[n.map(a=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx(Le,{name:We(r.find(o=>o.id===a.viewer_id)),id:a.viewer_id})}),e.jsx("td",{children:"→"}),e.jsx("td",{children:a.scope==="all"?e.jsxs(e.Fragment,{children:["所有画布",e.jsx("span",{className:"perm-user-id",children:Ze})]}):e.jsx(Le,{name:We(r.find(o=>o.id===a.owner_id)),id:a.owner_id})}),e.jsx("td",{children:vn(a.permission)}),e.jsx("td",{children:e.jsx("button",{type:"button",className:"danger",disabled:t,onClick:()=>i(a),children:"撤销"})})]},a.viewer_id+"-"+(a.scope==="all"?"*":a.owner_id))),!n.length&&e.jsx(an,{columns:5,children:s?"暂无画布授权。选择访问者与所有者 / 授权范围后保存。":"正在加载授权…"})]})]})})}function ga({projects:n,users:r,target:t}){return e.jsx("div",{className:"dialog-list",tabIndex:0,role:"region","aria-label":"画布分配确认明细",children:e.jsxs("table",{children:[e.jsx("thead",{children:e.jsx("tr",{children:["画布名称","画布 ID","旧归属","目标归属"].map(s=>e.jsx("th",{scope:"col",children:s},s))})}),e.jsx("tbody",{children:n.map(s=>e.jsxs("tr",{children:[e.jsx("td",{children:s.name||"未命名画布"}),e.jsx("td",{children:s.id}),e.jsx("td",{children:e.jsx(Le,{name:yn(s,r),id:s.owner_id})}),e.jsx("td",{children:e.jsx(Le,{name:We(t),id:t.id})})]},s.id))})]})})}function ba({projects:n,users:r,busy:t,ready:s,selected:i,setSelected:a,status:o,onConfirm:l,onError:p}){const[d,c]=m.useState(""),[g,u]=m.useState(""),[y,j]=m.useState(""),w=new Map(n.map(_=>[_.owner_id,`${yn(_,r)}（ID: ${_.owner_id}）`])),v=w.has(g)?g:"",f=r.filter(_=>_.enabled&&_.role!=="monitor"),h=f.some(_=>_.id===y)?y:"",x=la(n,d,v),k=ca(x,i),L=m.useRef(null);m.useEffect(()=>{L.current&&(L.current.indeterminate=k.indeterminate)},[k.indeterminate]);const T=_=>{_(),a(new Set)};return e.jsxs("section",{className:"card","aria-labelledby":"history-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"history-heading",tabIndex:-1,children:"历史画布分配"}),e.jsx("span",{className:"small muted",children:"仅个人空间 / 每次最多 1000 个"})]}),e.jsx("div",{className:"f-pad",children:e.jsx("p",{className:"notice-box",children:vr})}),e.jsxs("div",{className:"allocation-tools",children:[e.jsxs("div",{className:"allocation-filters",children:[e.jsxs("label",{className:"field",children:["搜索名称 / ID",e.jsx("input",{id:"project-search",type:"search",autoComplete:"off",placeholder:"输入画布名称或 ID",value:d,disabled:t,onChange:_=>T(()=>c(_.currentTarget.value))})]}),e.jsxs("label",{className:"field",children:["当前所有者",e.jsxs("select",{id:"project-owner",value:v,disabled:t,onChange:_=>T(()=>u(_.currentTarget.value)),children:[e.jsx("option",{value:"",children:"全部所有者"}),[...w].map(([_,N])=>e.jsx("option",{value:_,children:N},_))]})]})]}),e.jsxs("form",{id:"assign",className:"allocation-batch","aria-busy":t,onSubmit:_=>{if(_.preventDefault(),!t)try{l(pa(r,x,i,h))}catch(N){p(ne(N))}},children:[e.jsxs("label",{className:"field",children:["目标账号（仅启用账号）",e.jsxs("select",{name:"owner_id",required:!0,value:h,disabled:t,onChange:_=>j(_.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择目标账号"}),f.map(_=>e.jsx("option",{value:_.id,children:me(r,_.id)},_.id))]})]}),e.jsxs("span",{id:"project-selected",role:"status",children:["已选 ",i.size," 个画布",i.size>1e3?"（超过 1000 个上限）":""]}),e.jsx("button",{id:"assign-submit",className:"primary",disabled:t||!i.size||!h,children:"分配所选画布"}),e.jsx("button",{id:"clear-selection",type:"button",disabled:t||!i.size,onClick:()=>a(new Set),children:"清空选择"})]})]}),e.jsx("p",{id:"assign-status",className:"table-note f-status",role:"status",children:o}),e.jsx("div",{className:"table-wrap history-scroll",tabIndex:0,role:"region","aria-label":"历史画布列表",children:e.jsxs("table",{className:"allocation-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{scope:"col",children:e.jsx("input",{ref:L,id:"project-all",type:"checkbox","aria-label":"全选当前筛选结果中的个人画布",checked:k.checked,disabled:t||!k.personal.length,onChange:_=>a(new Set(_.currentTarget.checked?k.personal.map(N=>N.id):[]))})}),["画布名称","画布 ID","当前所有者","空间"].map(_=>e.jsx("th",{scope:"col",children:_},_))]})}),e.jsxs("tbody",{id:"projects",children:[x.map(_=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("input",{type:"checkbox","data-team":String(!!_.team_id),checked:i.has(_.id),"aria-label":`选择画布 ${_.name||"未命名画布"}（${_.id}）`,disabled:t||!!_.team_id,onChange:N=>{const E=new Set(i);N.currentTarget.checked?E.add(_.id):E.delete(_.id),a(E)}})}),e.jsx("td",{children:_.name||"未命名画布"}),e.jsx("td",{className:"perm-id",children:_.id}),e.jsx("td",{children:e.jsx(Le,{name:yn(_,r),id:_.owner_id})}),e.jsx("td",{children:_.team_id?e.jsxs(e.Fragment,{children:["项目组：",_.team_name||_.team_id,e.jsx("span",{className:"team-space",children:"由成员关系授权，不可改为个人归属"})]}):"个人空间"})]},_.id)),!x.length&&e.jsx(an,{columns:5,children:s?"暂无符合条件的画布，请尝试更换搜索词或当前所有者。":"正在加载画布…"})]})]})}),e.jsx("p",{className:"table-note",children:"搜索或切换当前所有者会清空选择。全选只选择当前筛选结果中的个人画布，项目组画布不可选；超过 1000 个时请缩小筛选范围。"})]})}function ya(n){const r=ma(n),{users:t,grants:s,projects:i,service:a}=r,[o,l]=m.useState(null),[p,d]=m.useState(""),[c,g]=m.useState(""),[u,y]=m.useState(""),j=m.useRef(null),w=r.loading||r.mutationBusy||!r.ready,v=w&&!o,f=b=>{r.setError(b),n.notify({message:b,tone:"error"})},h=b=>{!w&&!o&&l(b)},x=(b,R)=>{const D=e.jsxs("p",{children:["目标账号：",e.jsx("b",{children:me(t,b.id)})]});if(R==="password")return h({title:"重置密码",children:e.jsxs(e.Fragment,{children:[D,e.jsx(kr,{}),e.jsx("p",{className:"notice-box danger",children:"该账号现有会话将失效，需要使用新密码重新登录。请妥善告知本人。"})]}),submitLabel:"确认重置密码",action:ee=>a.resetPassword(b.id,_e(ee,"password")),message:"密码已重置"});if(R==="role")return h({title:"修改账号角色",children:e.jsxs(e.Fragment,{children:[D,e.jsx(_r,{initial:b.role}),e.jsx("p",{className:"notice-box danger",children:"管理员天然可访问全部画布。切换为监控展示员会清除组长权限，已有画布授权保留但不生效；其他角色的组长权限不变。修改角色会使该账号现有会话失效；最后一位启用管理员受系统保护。"})]}),submitLabel:"确认修改角色",action:ee=>a.update(b.id,{role:Re.parse(_e(ee,"role"))}),message:"账号角色已修改"});const z=R==="enabled",S=z?!b.enabled:!b.team_leader,Q=z?S?"启用账号":"停用账号":S?"授予组长权限":"取消组长权限",J=z?S?"启用不会跳过钉钉注册审批，审批状态保持不变。":"停用后该账号不能继续登录，现有会话失效。不会删除既有项目组关系或画布授权；最后一位启用管理员受系统保护。":S?"授予该用户创建项目组和管理自己创建项目组的权限，不会成为管理员，也不能管理其他人的项目组。现有会话失效后需重新登录。":"取消后不能继续创建或管理项目组，现有会话失效。既有组长归属和成员关系不会被迁移。";h({title:Q,children:e.jsxs(e.Fragment,{children:[D,e.jsx("p",{className:"notice-box",children:J})]}),submitLabel:"确认"+Q,action:()=>a.update(b.id,z?{enabled:S}:{team_leader:S}),message:Q+"成功"})},k=b=>{const R=b.scope==="all"?"所有画布（"+Ze+"）":me(t,b.owner_id);h({title:"确认撤销授权",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:[me(t,b.viewer_id)," → ",R]}),e.jsxs("p",{children:["权限：",vn(b.permission)]}),e.jsx("p",{className:"notice-box danger",children:"撤销后即时重新校验权限，访问者失去这条授权带来的全部画布访问权。此授权不会使其成为管理员；管理员天然权限、项目组成员关系和其他独立授权不受影响。"})]}),submitLabel:"确认撤销授权",action:()=>a.revokeGrant(b),message:"已撤销画布授权"})},L=t.filter(b=>b.role!=="monitor"),T=L.some(b=>b.id===c)?c:"",_=u==="*"||t.some(b=>b.id===u)?u:"",N=[{id:"users",label:"账号总数",value:t.length,note:"角色与独立组长权限分别管理"},{id:"enabled",label:"启用账号",value:t.filter(b=>b.enabled).length,note:"停用不会删除账号或画布授权"},{id:"pending",label:"待审批注册",value:r.registrations?.requests.filter(b=>b.status==="pending").length??"—",note:"仅由钉钉指定审批人处理"},{id:"grants",label:"画布授权",value:s.length,note:"访问者 A → 所有者 / 授权范围"}],E=r.registrations?.outbox;return e.jsxs("main",{id:"main",tabIndex:-1,ref:j,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"账号与权限"}),e.jsx("div",{className:"page-caption",children:e.jsx("p",{className:"subtitle",children:"管理账号、画布访问与历史画布归属"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{id:"refresh-note",className:"refresh-note",role:"status",children:r.refreshNote}),e.jsx("button",{id:"refresh",type:"button",disabled:r.loading||r.mutationBusy||!!o,onClick:()=>{r.refreshPage()},children:"刷新数据"})]})]}),e.jsx("p",{id:"error",className:"page-status",role:"alert",children:r.error}),e.jsx("section",{className:"metrics","aria-label":"权限概览",children:N.map(b=>e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:b.label}),e.jsx("p",{id:"metric-"+b.id,className:"metric-value",children:b.id==="pending"||r.ready||t.length?b.value:"—"}),e.jsx("p",{className:"metric-note",children:b.note})]})},b.id))}),e.jsx("nav",{className:"section-nav","aria-label":"权限管理分区",children:[["accounts","账号管理"],["registrations","注册申请"],["grants","画布授权"],["history","历史画布分配"]].map(([b,R])=>e.jsx("a",{href:"#"+b+"-heading",onClick:()=>j.current?.querySelector("#"+b+"-heading")?.focus(),children:R},b))}),e.jsxs("section",{className:"card","aria-labelledby":"accounts-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"accounts-heading",tabIndex:-1,children:"账号管理"}),e.jsx("p",{className:"section-subtitle",children:"账号角色包括管理员、普通用户和监控展示员。监控展示员仅可查看监控，不能担任组长或访问画布。"})]}),e.jsx("button",{id:"create-user",type:"button",className:"primary",disabled:v,onClick:()=>h({title:"新建账号",children:e.jsx(ua,{}),submitLabel:"创建账号",action:b=>a.create({username:_e(b,"username").trim(),password:_e(b,"password"),role:Re.parse(_e(b,"role")),team_leader:new FormData(b).has("team_leader")}),message:"账号已创建"}),children:"新建账号"})]}),e.jsx(ha,{users:t,busy:v,ready:r.ready,action:x}),e.jsx("p",{className:"table-note",children:"启停、角色、组长权限及重置密码均需确认。初始密码至少 8 位，请勿使用常见弱密码；监控展示员的密码由管理员重置，其他账号登录后可自行修改。"})]}),e.jsxs("div",{className:"permissions-grid",children:[e.jsxs("section",{className:"card","aria-labelledby":"registrations-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"registrations-heading",tabIndex:-1,children:"注册申请"}),e.jsx("span",{className:"small muted",children:"仅查看钉钉审批结果"})]}),e.jsxs("div",{className:"f-pad form-grid",children:[e.jsx("p",{className:"notice-box",children:"自主注册由钉钉群内两位指定审批人在卡片上处理，任意一人先决生效。网页不提供通过或拒绝操作。"}),e.jsx("p",{id:"outbox-status",className:"f-status",role:"status",children:r.registrationError||(r.registrations?E&&E.pending>0?`审批通知积压 ${E.pending} 条（最早 ${E.oldest_at?jr(E.oldest_at):"时间未知"}），系统会自动重试投递。`:"审批通知投递正常。":"")})]}),e.jsx(xa,{data:r.registrations,error:r.registrationError})]}),e.jsxs("section",{className:"card","aria-labelledby":"grants-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"grants-heading",tabIndex:-1,children:"画布授权"}),e.jsx("span",{className:"small muted",children:"访问者 A → 所有者 / 授权范围"})]}),e.jsx("div",{className:"f-pad",children:e.jsx("p",{id:"grant-help",className:"notice-box",children:"选择指定所有者，A 可查看或操作其当前及以后创建的全部个人画布；选择“所有画布”则覆盖全部个人和项目组画布，包括现有及未来新增画布。可操作包含删除；授权不传递，也不会成为管理员。管理员天然可访问全部画布，停用账号不会因授权恢复登录权限。"})}),e.jsxs("form",{id:"grant",className:"grant-form","aria-describedby":"grant-help","aria-busy":r.mutationBusy,onSubmit:b=>{if(b.preventDefault(),!w){d("");try{const R=da(t,T,_,Ue.parse(_e(b.currentTarget,"permission"))),D=R.scope==="all"?"所有画布（"+Ze+"）":me(t,R.owner_id),z=R.scope==="all"?"覆盖"+Ze+"，不受所有者或项目组成员关系限制。":"覆盖所有者当前和以后创建的全部个人画布，不包含项目组画布。";h({title:"确认画布授权",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["访问者 A：",me(t,R.viewer_id)]}),e.jsxs("p",{children:["所有者 / 授权范围：",D]}),e.jsxs("p",{children:["权限：",e.jsx("b",{children:vn(R.permission)})]}),e.jsxs("p",{className:"notice-box danger",children:[z,"可操作包含删除；授权不传递，也不会成为管理员。已有同范围授权将被更新，其他独立授权保留；保存后即时重新校验权限。停用账号不会因此恢复登录。"]})]}),submitLabel:"确认保存授权",action:()=>a.saveGrant(R),message:"画布授权已保存"})}catch(R){const D=ne(R);d(D),n.notify({message:D,tone:"error"})}}},children:[e.jsxs("label",{className:"field",children:["访问者 A",e.jsxs("select",{name:"viewer_id",required:!0,disabled:v,value:T,onChange:b=>g(b.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择账号"}),L.map(b=>e.jsx("option",{value:b.id,children:me(t,b.id)},b.id))]})]}),e.jsxs("label",{className:"field",children:["所有者 / 授权范围",e.jsxs("select",{name:"owner_id",required:!0,disabled:v,value:_,onChange:b=>y(b.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择所有者 / 授权范围"}),e.jsx("option",{value:"*",children:"所有画布（含以后新增）"}),t.map(b=>e.jsx("option",{value:b.id,children:me(t,b.id)},b.id))]})]}),e.jsxs("label",{className:"field",children:["权限",e.jsxs("select",{name:"permission",disabled:v,children:[e.jsx("option",{value:"read",children:"只读"}),e.jsx("option",{value:"operate",children:"可操作（含删除）"})]})]}),e.jsx("button",{id:"grant-submit",className:"primary",disabled:v,children:"保存授权"}),e.jsx("p",{id:"grant-error",className:"danger small",role:"alert",children:p})]}),e.jsx(fa,{grants:s,users:t,busy:v,ready:r.ready,revoke:k})]})]}),e.jsx(ba,{projects:i,users:t,busy:v,ready:r.ready,selected:r.selected,setSelected:r.setSelected,status:r.assignStatus,onError:f,onConfirm:({target:b,chosen:R,payload:D})=>h({title:"确认分配 "+R.length+" 个画布",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["目标账号：",e.jsx("b",{children:me(t,b.id)})]}),e.jsx("p",{className:"notice-box danger",children:vr}),e.jsx(ga,{projects:R,users:t,target:b})]}),submitLabel:"确认分配所列画布",action:async()=>{const z=await a.assign(D);r.setSelected(new Set),r.setAssignStatus(`分配成功：已将 ${z} 个画布分配给 ${me(t,b.id)}。`)},message:"画布归属已分配"})})]}),o&&e.jsx(re,{title:o.title,submitLabel:o.submitLabel,onClose:()=>l(null),onSubmit:b=>r.mutate(()=>o.action(b),o.message,o.afterSuccess),children:o.children})]})}const ve=10,Nr=2e3,va=15e3;function ja(n){return n==="0"||n==="7"||n==="30"||n==="90"}const U=pe([V(),C(),ir()]).optional().transform((n,r)=>{if(n==null||n==="")return n===void 0?void 0:null;const t=typeof n=="number"?n:Number(n);return Number.isFinite(t)?t:(r.addIssue({code:"custom",message:"费用数值必须为有限数字或未知值"}),Yr)}),se=C().nullish(),wa=G({tasks:U,done:U,error:U,canceled:U,retail_min:U,retail_max:U,retail_mid:U,retail_known_tasks:U,retail_unknown_tasks:U,total_cost:U,actual_cost:U,estimated_cost:U,running_accrued:U,gpu_hours:U,electricity_cost:U,api_cost:U,failed_waste:U,unknown_cost_tasks:U}),xn=G({key:se,label:se,tasks:U,retail_known_tasks:U,retail_unknown_tasks:U,retail_min:U,retail_max:U,retail_mid:U,total_cost:U}),_a=G({job_id:se,created_at:U,status:se,category_name:se,category:se,project_name:se,card_name:se,capability:se,worker_name:se,runtime_seconds:U,retail_source:se,retail_basis:se,retail_min:U,retail_max:U,cost_source:se,recognized_cost:U}),ka=G({overview:wa,jobs:O(_a).transform(n=>n.slice(0,Nr)),currency:se,pricing_version:pe([C(),V()]).nullish(),period:G({from:U,to:U}).nullish(),by_category:O(xn).nullish(),by_capability:O(xn).nullish(),by_worker:O(xn).nullish()});function Na(n){const r=ka.safeParse(n);if(!r.success)throw new Error("费用接口返回的数据格式不完整");return r.data}function Sa(n,r=Date.now()){const t=new URLSearchParams({limit:String(Nr)});return n!=="0"&&t.set("from",String(r/1e3-Number(n)*86400)),`/api/costs?${t}`}function $a(n){return{async load(r,t){const s=await n.request(Sa(r),{cache:"no-store",signal:t});return Na(s)}}}const za={data:null,selectedPeriod:"0",loadedPeriod:"0",page:0,busy:!0,error:null,updatedAt:null};function Ca({http:n,notify:r}){const t=m.useMemo(()=>$a(n),[n]),[s,i]=m.useState(za),a=m.useRef("0"),o=m.useRef("0"),l=m.useRef(0),p=m.useRef(!1),d=m.useRef(!1),c=m.useRef(new Set),g=m.useRef(r);m.useEffect(()=>{g.current=r},[r]);const u=m.useCallback(async(h,x,k=!1)=>{if(p.current&&!k)return;const L=++l.current;p.current=!0;const T=new AbortController;c.current.add(T),i(_=>({..._,busy:!0}));try{const _=await t.load(h,T.signal);if(L!==l.current)return;o.current=h,d.current=!1,i(N=>({...N,data:_,loadedPeriod:h,error:null,updatedAt:Date.now(),page:x?0:Math.min(N.page,Math.max(0,Math.ceil(_.jobs.length/ve)-1))}))}catch(_){if(L!==l.current)return;const N=`读取费用统计失败：${ne(_)}`,E=!d.current;d.current=!0,i(b=>({...b,error:N})),E&&g.current({message:N,tone:"error"})}finally{c.current.delete(T),L===l.current&&(p.current=!1,i(_=>({..._,busy:!1})))}},[t]),y=m.useCallback(()=>{l.current+=1,p.current=!1,c.current.forEach(h=>h.abort()),c.current.clear()},[]);m.useEffect(()=>{u(a.current,!1);const h=window.setInterval(()=>{document.hidden||u(a.current,!1)},va);return()=>{window.clearInterval(h),y()}},[u,y]);const j=m.useCallback(h=>{a.current=h,i(x=>({...x,selectedPeriod:h})),u(h,!0,!0)},[u]),w=m.useCallback(()=>{u(a.current,!1)},[u]),v=m.useCallback(()=>{const h=a.current!==o.current;u(a.current,h,h)},[u]),f=m.useCallback(h=>{i(x=>({...x,page:Math.max(0,Math.min(x.page+h,Math.max(0,Math.ceil((x.data?.jobs.length??0)/ve)-1)))}))},[]);return{...s,selectPeriod:j,refresh:w,retry:v,changePage:f}}const Ma="_retail_1ychj_1",Ea="_commercial_1ychj_6",Pa={retail:Ma,commercial:Ea};function X(n){return typeof n=="number"&&Number.isFinite(n)?n:null}function ce(n){return X(n)==null?"未获取":String(n)}function Ee(n,r){const t=X(n);return t==null?"未知":`${!r||r==="CNY"?"¥":r+" "}${t.toFixed(4)}`}function tn(n,r,t){return X(n)==null||X(r)==null?"未知":n===r?Ee(n,t):`${Ee(n,t)} – ${Ee(r,t)}`}function fn(n){const r=X(n);return r==null||!Number.isFinite(new Date(r*1e3).getTime())?"未记录":new Date(r*1e3).toLocaleString("zh-CN",{hour12:!1})}function qa(n){const r=X(n);return r==null||r<0?"未记录":r<60?`${Math.round(r)}秒`:r<3600?`${Math.floor(r/60)}分${Math.floor(r%60)}秒`:`${Math.floor(r/3600)}小时${Math.floor(r%3600/60)}分`}function Ra(n){return n==="0"?"全部记录":`最近${n}天`}function La(n){return{unpriced:X(n.retail_known_tasks)===0&&(X(n.retail_unknown_tasks)??0)>0,allCostsUnknown:(X(n.tasks)??0)>0&&X(n.unknown_cost_tasks)===X(n.tasks)&&X(n.actual_cost)===0&&X(n.estimated_cost)===0}}function Ia(n,r){return X(n.retail_known_tasks)==null?"未获取":n.retail_known_tasks?tn(n.retail_min,n.retail_max,r):"未定价"}const Zn={queued:"排队中",assigned:"已分配",running:"运行中",done:"已完成",error:"失败",canceled:"已取消",cancel_requested:"正在取消"},Qn={actual:"实际",estimated:"历史估算",unknown:"未知"},er={per_job:"按次",per_segment:"按段",segment_count:"按分段数",output_second_resolution:"按输出秒和分辨率"};function Aa(n,r){const t=n.retail_source==="priced",s=n.retail_source==="not_billable",i=n.retail_source==="unpriced";return{status:(Object.hasOwn(Zn,n.status||"")?Zn[n.status||""]:n.status)||"未知",statusClass:["error","canceled"].includes(n.status||"")?"danger":["running","queued","assigned","cancel_requested"].includes(n.status||"")?"warn":"",basis:t?(Object.hasOwn(er,n.retail_basis||"")?er[n.retail_basis||""]:n.retail_basis)||"未记录":s?"未完成":i?"未定价":"未获取",basisClass:i?"warn":"muted",retail:t?tn(n.retail_min,n.retail_max,r):s?"不计费":i?"未定价":"未知",internal:n.cost_source==="unknown"||!n.cost_source?"未知":Ee(n.recognized_cost,r),source:(Object.hasOwn(Qn,n.cost_source||"")?Qn[n.cost_source||""]:n.cost_source)||"来源未记录"}}function xe({label:n,id:r,children:t,note:s,noteId:i,compact:a=!0,tone:o}){return e.jsx("article",{className:`card metric${o?` ${Pa[o]}`:""}`,children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:n}),e.jsx("p",{className:`metric-value${a?" compact":""}`,id:r,children:t}),e.jsx("p",{className:"metric-note",id:i,children:s})]})})}function Ta({data:n}){const r=n?.overview??{},{unpriced:t,allCostsUnknown:s}=La(r),i=X(r.retail_min),a=X(r.retail_max),o=p=>Ee(p,n?.currency),l=n?t?"未定价":X(r.retail_min)!=null&&X(r.retail_max)!=null&&r.retail_min!==r.retail_max?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"cost-amount",children:o(r.retail_min)})," – ",e.jsx("span",{className:"cost-amount",children:o(r.retail_max)})]}):tn(r.retail_min,r.retail_max,n.currency):"未获取";return e.jsxs("section",{className:"metrics f-metrics8","aria-label":"费用概览",children:[e.jsx(xe,{tone:"retail",label:"建议收费区间",id:"retail-range",note:"按次 / 分段 / 输出秒和分辨率",children:l}),e.jsx(xe,{tone:"retail",label:"建议收费中值",id:"retail-mid",noteId:"retail-coverage",note:n?`已定价 ${ce(r.retail_known_tasks)} 项 / 未定价 ${ce(r.retail_unknown_tasks)} 项`:"已定价 未获取 / 未定价 未获取",children:n?t?"未定价":o(r.retail_mid):"未获取"}),e.jsx(xe,{tone:"commercial",label:"商用模型等效费用（估算）",id:"internal-total",noteId:"internal-split",note:"按建议收费区间的 5 倍测算 · 非实际支出",children:n?t?"未定价":tn(i==null?null:i*5,a==null?null:a*5,n.currency):"未获取"}),e.jsx(xe,{label:"内部实际成本",id:"actual",noteId:"running",note:n?`运行中累计 ${o(r.running_accrued)}`:"运行中累计 未获取",children:n?s?"未知":o(r.actual_cost):"未获取"}),e.jsx(xe,{label:"GPU 用量",id:"gpu-hours",noteId:"electricity",note:n?`其中电费 ${o(r.electricity_cost)}`:"其中电费 未获取",children:X(r.gpu_hours)==null?"未获取":`${r.gpu_hours?.toFixed(2)} 小时`}),e.jsx(xe,{label:"API 成本",id:"api-cost",note:"按输入 / 输出 token",children:n?o(r.api_cost):"未获取"}),e.jsx(xe,{label:"失败与取消损耗",id:"waste",noteId:"unknown",note:`已包含于总成本；未知 ${ce(r.unknown_cost_tasks)} 项`,children:n?o(r.failed_waste):"未获取"}),e.jsx(xe,{label:"任务数量",id:"tasks",compact:!1,noteId:"statuses",note:`完成 ${ce(r.done)} / 失败 ${ce(r.error)} / 取消 ${ce(r.canceled)}`,children:ce(r.tasks)})]})}const ke=[{key:"category",label:"按类型"},{key:"capability",label:"按能力"},{key:"worker",label:"按执行端"}];function Da({data:n,failed:r}){const[t,s]=m.useState("category"),i=m.useRef({}),o=n?.[`by_${t}`]?.slice(0,10),l=Math.max(0,...(o??[]).map(d=>X(d.retail_mid)??0));function p(d,c){let g;switch(d.key){case"ArrowRight":case"ArrowDown":g=(c+1)%ke.length;break;case"ArrowLeft":case"ArrowUp":g=(c+ke.length-1)%ke.length;break;case"Home":g=0;break;case"End":g=ke.length-1;break;default:return}d.preventDefault();const u=ke[g];u&&(s(u.key),i.current[u.key]?.focus())}return e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"费用构成"}),e.jsx("p",{className:"section-subtitle",children:"按建议收费中值排序 / 每个视角前10项；条形为相对最大项，不是内部成本占比"})]}),e.jsx("span",{className:"muted small",id:"pricing",children:n?`计价版本 ${n.pricing_version??"未获取"} / 币种 ${n.currency??"未获取"}`:"等待计价信息"})]}),e.jsx("div",{className:"tabs f-pad-tabs",role:"tablist","aria-label":"费用构成视角",children:ke.map((d,c)=>e.jsx("button",{type:"button",role:"tab",id:`cost-tab-${d.key}`,"aria-controls":"cost-panel","aria-selected":t===d.key,tabIndex:t===d.key?0:-1,"data-cost-tab":d.key,ref:g=>{g?i.current[d.key]=g:delete i.current[d.key]},onClick:()=>s(d.key),onKeyDown:g=>p(g,c),children:d.label},d.key))}),e.jsx("div",{className:"f-cost-chart f-pad",id:"cost-panel",role:"tabpanel","aria-labelledby":`cost-tab-${t}`,tabIndex:0,children:n?o?o.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"这个周期内还没有费用构成"}),e.jsx("p",{children:"调整统计周期，或等待任务产生费用记录。"})]}):o.map((d,c)=>{const g=X(d.retail_mid),u=g!=null&&l>0?Math.max(0,Math.min(100,g/l*100)):null;return e.jsxs("div",{className:"f-rank",children:[e.jsxs("div",{children:[e.jsx("b",{title:d.key??void 0,children:d.label||d.key||"未记录"}),e.jsx("strong",{children:Ia(d,n.currency)})]}),e.jsxs("p",{className:"muted small",children:[ce(d.tasks)," 项 · 已定价 ",ce(d.retail_known_tasks)," · 未定价"," ",ce(d.retail_unknown_tasks)," · 已知内部成本"," ",Ee(d.total_cost,n.currency)]}),u!=null&&e.jsx("div",{className:"f-track",role:"meter","aria-label":`${d.label||d.key||""} 建议收费中值相对最大项`,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":u,children:e.jsx("i",{style:{width:`${u}%`}})})]},`${d.key??""}-${c}`)}):e.jsx("p",{className:"muted",children:"构成数据未获取，不以零元替代。"}):e.jsx("p",{className:"muted",children:r?"费用构成读取失败，请点击“重试读取”。":"正在读取费用构成…"})})]})}function Ye({children:n}){return e.jsx("span",{className:"cell-secondary",children:n})}function Fa({data:n,page:r,loadedPeriod:t,failed:s,changePage:i,openBasis:a}){const o=n?.jobs??[],l=Math.max(0,Math.ceil(o.length/ve)-1),p=o.slice(r*ve,(r+1)*ve),d=X(n?.overview.tasks);return e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"费用明细"}),e.jsx("p",{className:"section-subtitle",id:"detail-note",children:n?`服务端合计 ${ce(n.overview.tasks)} 条 / 明细已载入 ${o.length} 条${d!=null&&d>o.length?"（接口最多2000条，非完整明细）":""}；汇总不以当前显示页相加替代`:s?"明细未获取，不以空记录或零元代替。":"正在读取；汇总不以当前明细页相加替代"})]}),e.jsx("button",{type:"button",className:"link-button",id:"cost-basis",onClick:a,children:"计价与成本口径"})]}),e.jsx("p",{className:"table-note",id:"period-note",children:n?`当前展示：${Ra(t)} · ${X(n.period?.from)===0?"全部历史":fn(n.period?.from)} — ${fn(n.period?.to)}（按任务创建时间）`:"统计周期正在读取"}),e.jsx("div",{className:"table-wrap",children:e.jsxs("table",{className:"cost-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["时间","状态 / 类型","项目 / 卡片","能力","执行端","耗时","收费依据","建议收费","内部成本 / 来源"].map(c=>e.jsx("th",{scope:"col",children:c},c))})}),e.jsx("tbody",{id:"job-rows",children:n?p.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:9,children:e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"这个周期内还没有费用记录"}),e.jsx("p",{children:"更换统计周期，或等待任务产生费用记录。"})]})})}):p.map((c,g)=>{const u=Aa(c,n.currency);return e.jsxs("tr",{children:[e.jsxs("td",{children:[fn(c.created_at),e.jsx(Ye,{children:c.job_id||"任务ID未记录"})]}),e.jsxs("td",{className:u.statusClass,children:[u.status,e.jsx(Ye,{children:c.category_name||c.category||"类型未记录"})]}),e.jsxs("td",{className:"origin",children:[c.project_name||"未归属项目",e.jsx(Ye,{children:c.card_name||"未记录卡片"})]}),e.jsx("td",{children:c.capability||"未记录"}),e.jsx("td",{children:c.worker_name||"未分配执行端"}),e.jsx("td",{children:qa(c.runtime_seconds)}),e.jsx("td",{className:u.basisClass,children:u.basis}),e.jsx("td",{children:u.retail}),e.jsxs("td",{children:[u.internal,e.jsx(Ye,{children:u.source})]})]},`${c.job_id??""}-${g}`)}):e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"loading-note",children:s?"费用明细读取失败，请点击“重试读取”。":"正在读取费用明细…"})})})]})}),e.jsxs("div",{className:"f-pager",children:[e.jsx("span",{id:"page-note",children:n?`显示 ${o.length?r*ve+1:0}–${Math.min((r+1)*ve,o.length)} / 已载入 ${o.length} 条`:"尚未载入"}),e.jsx("button",{type:"button",id:"cost-prev",disabled:!n||r===0,onClick:()=>i(-1),children:"上一页"}),e.jsx("button",{type:"button",id:"cost-next",disabled:!n||r>=l,onClick:()=>i(1),children:"下一页"})]})]})}function Oa({onClose:n}){return e.jsx(re,{title:"计价与成本口径",onClose:n,children:e.jsxs("div",{className:"f-stack",children:[e.jsx("p",{children:"建议收费区间与中值来自计价规则，不是已收款或实际收入。"}),e.jsx("p",{children:"收费依据支持按次、按段、分段数、输出秒和分辨率；未定价不等于免费。未完成任务不计建议收费，但可能产生内部损耗。"}),e.jsx("p",{children:"内部总成本 = 已知实际 + 已知历史估算；未知成本单列，不按零元处理。失败与取消损耗已包含于总成本，不重复相加。运行中累计成本尚可能变化。"}),e.jsx("p",{children:"统计周期以任务创建时间为准，按服务端全量聚合。费用明细最多读取2000条，每页10条；不能把当前显示明细当完整总额，也不从明细重算概览或费用构成。"}),e.jsx("p",{children:"GPU用量、电费、API token成本、实际与历史估算均沿用服务端口径；未记录的字段显示未知，不由前端推测单价或补算。"})]})})}function Ua(n){const r=Ca(n),[t,s]=m.useState(!1),i=r.busy?"正在读取…":r.error?"连接失败 · 快照非实时":r.updatedAt!=null?`最后刷新 ${new Date(r.updatedAt).toLocaleTimeString("zh-CN",{hour12:!1})} · 每15秒刷新`:"正在加载 · 每15秒刷新";return e.jsxs("main",{id:"main",tabIndex:-1,"aria-busy":r.busy?!0:void 0,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"费用统计"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{className:"subtitle",children:"建议收费不是实际收入，未知成本不作零元"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsxs("label",{className:"filter-label",children:["统计周期",e.jsxs("select",{id:"period",value:r.selectedPeriod,onChange:a=>{const o=a.currentTarget.value;ja(o)&&r.selectPeriod(o)},children:[e.jsx("option",{value:"0",children:"全部记录"}),e.jsx("option",{value:"7",children:"最近7天"}),e.jsx("option",{value:"30",children:"最近30天"}),e.jsx("option",{value:"90",children:"最近90天"})]})]}),e.jsx("span",{className:"muted small",id:"refresh-state",role:"status",children:i}),e.jsxs("button",{type:"button",className:"primary",id:"refresh",disabled:r.busy,onClick:r.refresh,children:[e.jsx(Oe,{name:"refresh"}),"立即刷新"]})]})]}),e.jsxs("div",{id:"error",className:"f-error",role:"alert",hidden:!r.error,children:[e.jsxs("div",{children:[e.jsx("b",{id:"error-message",children:r.error}),e.jsx("p",{children:"下方保留上次成功读取的周期与快照，不代表当前筛选的新数据；未知值不作零元。"})]}),e.jsx("button",{type:"button",id:"retry",onClick:r.retry,children:"重试读取"})]}),e.jsx(Ta,{data:r.data}),e.jsx(Da,{data:r.data,failed:r.error!=null}),e.jsx(Fa,{data:r.data,page:r.page,loadedPeriod:r.loadedPeriod,failed:r.error!=null,changePage:r.changePage,openBasis:()=>s(!0)}),e.jsxs("section",{className:"card padded notice-box","aria-labelledby":"cost-rules-title",children:[e.jsx("h2",{id:"cost-rules-title",children:"计价与成本口径"}),e.jsx("p",{children:"建议收费区间与中值来自规则，不是已收款或实际收入；未定价不等于免费。未完成任务不计建议收费，但可能产生内部损耗。"}),e.jsx("p",{children:"内部总成本 = 已知实际 + 已知历史估算；未知成本单列，不按零元处理。失败与取消损耗已包含于总成本，不重复相加；运行中累计仍可能变化。"}),e.jsx("p",{children:"统计周期按任务创建时间筛选，合计与构成取服务端全量聚合。明细最多读取2000条并分页展示，当前明细页不代表全部成本。"})]})]}),t&&e.jsx(Oa,{onClose:()=>s(!1)})]})}const P=V().finite().nullable().optional(),K=C().nullable().optional(),Fe=Sn(C(),H),Sr=q({gpus:O(q({name:K,memory_total_bytes:P}).catchall(H)).optional(),cpu:H.optional(),os:H.optional(),memory_total_bytes:P,host_id:K,environment_id:K,model_version:K,disk:K,note:K}).catchall(H),nr=q({name:K,role:K,precision:H.optional(),precision_source:K,loader_dtype:H.optional()}).catchall(H),jn=q({source:K,complete:Y().optional(),capability_name:K,models:O(nr).optional(),auxiliary_models:O(nr).optional()}).catchall(H),Wa=q({source:C(),summary:jn,samples:P,measured:P}).catchall(H),Ba=q({key:K,id:K,kind:K,width:H.optional(),height:H.optional(),duration:P,valid:Y().nullable().optional(),outputs:H.optional(),samples:H.optional()}).catchall(H),Ha=q({total_samples:P,recorded_samples:P,complete_samples:P,total_outputs:P,recorded_outputs:P,variants:O(H).optional()}).catchall(H),Va=q({dimensions:Fe.nullable().optional(),parameters:Fe.nullable().optional(),expected:Fe.nullable().optional(),model_version:K}).catchall(H),$r={capability:C(),capability_name:K,worker_id:K,worker_name:K,source:C(),dimensions:Fe.nullable().optional(),spec:Va.nullable().optional(),output_resolution:Ha.nullable().optional(),recovered_outputs:H.optional(),runtime_seconds:P,occupied_seconds:P,warnings:O(C()).optional()},Ga=q({...$r,id:C(),spec_key:K,config_id:K,config:Sr.nullable().optional(),config_source:K,cache_condition:H.optional(),samples:P,done:P,error:P,canceled:P,measured:P,mean_seconds:P,p50_seconds:P,p90_seconds:P,last_sample_at:P,reference_per_hour:P,output_count:P,unit:K,seconds_per_unit:P,qualified_seconds_per_unit:P,eligible:Y().nullable().optional(),reviewed:P,accepted:P,benchmark_id:K,days:pe([O(C()),V(),ir()]).optional(),model_summary:jn.nullable().optional(),model_evidence:q({total_samples:P,recorded_samples:P,variants:O(Wa).optional()}).catchall(H).nullable().optional(),current_model_reference:jn.nullable().optional()}).catchall(H),Ka=q({id:C(),name:K,state:C(),last_seen:P,hardware:Sr.nullable().optional(),hardware_source:K,agent_version:P,supports_capacity_telemetry:Y().optional(),tasks:P,done:P,error:P,canceled:P,runtime_seconds:P}).catchall(H),zr=q({...$r,job_id:C(),group_id:K,status:C(),created_at:P,attempts:H.optional(),outputs:O(Ba).nullable().optional(),review:q({accepted:P,source:K,benchmark_id:K,note:K}).catchall(H).nullable().optional()}).catchall(H),Ja=q({period:Fe.optional(),overview:Sn(C(),V().finite().nullable()).default({}),workers:O(Ka).default([]),groups:O(Ga).default([]),details:O(zr).default([]),details_total:V().int().nonnegative()}).catchall(H),Xa=q({details:O(zr),details_total:V().int().nonnegative()}),Cr=q({to:V().int(),mode:ie("historical"),quality:ie("technical"),availability:ie(1),utilization:ie(.75),worker_id:C().min(1),hours:V().finite().min(.1).max(24),price:V().finite().nonnegative().optional(),demands:O(q({group_id:C().min(1),quantity:V().finite().positive()})).min(1)}),Ya=q({machines:P,total_seconds:P,daily_capacity_seconds:P,price_total:P,lines:O(q({group_id:C(),quantity:P,seconds_per_unit:P,daily_units:P}).catchall(H)).default([]),warnings:O(C()).default([]),assumptions:H.optional()}).catchall(H),Mr=q({host_id:C().max(160).optional(),cpu:C().max(160).optional(),memory_total_bytes:V().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),environment_id:C().max(160).optional(),model_version:C().max(160).optional(),disk:C().max(160).optional(),note:C().max(500).optional()}).strict(),Er=q({accepted:V().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),source:Ve(["business","standard"]),benchmark_id:C().max(100),note:C().max(500)}),Za=q({processed:V().int().min(0).max(4),recorded:V().int().nonnegative(),total:V().int().nonnegative(),next_offset:V().int().nonnegative().nullable()}).refine(n=>n.recorded<=n.processed,"补采响应格式无效"),rr=Sn(C(),ar());class Qa{constructor(r){this.http=r}http;path(r,t){return`/api/capacity?${new URLSearchParams({to:String(r.to),limit:"100",offset:String(t)})}`}report(r,t){return this.http.read(this.path(r,t),Ja,{cache:"no-store"})}evidence(r,t){return this.http.read(this.path(r,t),Xa,{cache:"no-store"})}async estimate(r){return Ya.parse(await this.http.json("/api/capacity/estimate","POST",Cr.parse(r)))}async profile(r,t){rr.parse(await this.http.json(`/api/capacity/workers/${encodeURIComponent(r)}`,"POST",Mr.parse(t)))}async review(r,t){rr.parse(await this.http.json(`/api/capacity/jobs/${encodeURIComponent(r)}/review`,"POST",Er.parse(t)))}async probe(r,t,s){const i=await this.http.json(`/api/capacity/jobs/${encodeURIComponent(r)}/probe-outputs`,"POST",{offset:V().int().nonnegative().parse(t)});s();const a=Za.safeParse(i);if(!a.success||a.data.next_offset!==null&&(a.data.next_offset<=t||a.data.next_offset>=a.data.total))throw Error("补采响应格式无效，请刷新看板核对结果");return a.data}}const Te=n=>!!(n.group||n.status||n.source||n.size!==100);class ei{cache=null;pending=null;clear(){this.cache=null,this.pending=null}async all(r,t,s,i){if(!s())return null;if(this.cache?.snapshot===r)return this.cache.records;if(this.pending?.snapshot===r)return this.pending.promise;const a={snapshot:r,promise:Promise.resolve(null)};a.promise=(async()=>{const o=r.report.details_total,l=[];if(!Number.isSafeInteger(o)||o<0)throw Error("明细总数无效，请刷新后重试。");for(let p=0;p<o;p+=100){if(!s())return null;const d=p===r.offset?r.report:await t.evidence(r.range,p);if(!s())return null;if(d.details_total!==o||d.details.length!==Math.min(100,o-p))throw Error("任务证据在读取期间变化或分页不完整，请刷新后重新筛选。");l.push(...d.details),i(l.length,o)}if(new Set(l.map(p=>p.job_id)).size!==l.length)throw Error("任务证据分页出现重复，请刷新后重试。");return s()?(this.cache={snapshot:r,records:l},l):null})(),this.pending=a;try{return await a.promise}finally{this.pending===a&&(this.pending=null)}}}class ni{constructor(r,t){this.service=r,this.notify=t}service;notify;listeners=new Set;loadVersion=0;estimateVersion=0;evidenceVersion=0;appliedRange=null;appliedOffset=0;alive=!0;repository=new ei;mutations=new Set;value={report:null,snapshot:null,ready:!1,revision:0,refreshState:"正在读取全部历史聚合与本页证据…",error:"",writeStatus:"",tab:"machines",technicalOpen:!1,evidenceOpen:!1,mounted:new Set,filters:{group:"",status:"",source:"",size:100},evidence:{records:[],total:0,start:0,size:100,state:"",busy:!1,failed:!1},estimate:null,estimateNote:"填写每日需求后计算。没有样本的场景不能按零耗时处理。",estimateError:"",estimating:!1};getSnapshot=()=>this.value;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});set(r){this.alive&&(this.value={...this.value,...r},this.listeners.forEach(t=>t()))}start(){this.alive=!0,this.load()}dispose(){this.alive=!1,this.loadVersion++,this.estimateVersion++,this.evidenceVersion++,this.repository.clear()}invalidateEstimate=(r="输入或证据已变更，请重新计算。")=>{this.estimateVersion++,this.set({estimate:null,estimateNote:r,estimateError:"",estimating:!1})};resetSnapshot(){this.repository.clear(),this.evidenceVersion++,this.set({snapshot:null,ready:!1})}clear(){this.resetSnapshot(),this.set({report:null,mounted:new Set,evidence:{records:[],total:0,start:0,size:100,state:"",busy:!1,failed:!1}})}activeMounts(){const r=new Set([this.value.tab]);return this.value.tab==="machines"&&this.value.technicalOpen&&r.add("technical"),this.value.evidenceOpen&&r.add("evidence"),r}async load(r=!0,t){const s=r?{to:Math.floor(Date.now()/1e3)}:this.appliedRange;if(!s)return;const i=++this.loadVersion,a=Object.freeze({...s}),o=r?0:t??this.appliedOffset;this.resetSnapshot(),this.invalidateEstimate("证据正在刷新，旧测算已清除。"),this.set({error:"",refreshState:"正在读取全部历史聚合与本页证据…",evidence:{...this.value.evidence,state:""}});try{const l=await this.service.report(a,o);if(!this.alive||i!==this.loadVersion)return;const p=Object.freeze({report:l,range:a,version:i,offset:o});this.appliedRange=a,this.appliedOffset=o;const d={...this.value.filters};if(l.groups.some(c=>c.id===d.group)||(d.group=""),this.set({report:l,snapshot:p,ready:!0,revision:this.value.revision+1,mounted:this.activeMounts(),filters:d,evidence:{records:l.details,total:l.details_total,start:o,size:100,state:"",busy:!1,failed:!1}}),this.value.evidenceOpen&&Te(d)&&await this.filterEvidence(0),!this.alive||i!==this.loadVersion)return;this.set({refreshState:`最后刷新：${new Date().toLocaleTimeString("zh-CN",{hour12:!1})}`})}catch(l){if(!this.alive||i!==this.loadVersion)return;this.clear();const p=`读取产能数据失败：${ne(l)}。请点击立即刷新重试。`;this.set({error:p,refreshState:"读取失败"}),this.notify(p)}}activate(r){this.set({tab:r}),this.mount()}technical(r){this.set({technicalOpen:r}),this.mount()}evidenceOpen(r){this.set({evidenceOpen:r}),this.mount()}mount(){if(!this.value.ready)return;const r=this.value.mounted.has("evidence"),t=new Set([...this.value.mounted,...this.activeMounts()]);this.set({mounted:t}),!r&&t.has("evidence")&&Te(this.value.filters)&&this.filterEvidence(0)}showEvidence(r=""){!this.value.ready||!this.value.snapshot||(this.set({evidenceOpen:!0,filters:{...this.value.filters,group:r,status:"",source:""},mounted:new Set([...this.value.mounted,"evidence"])}),this.filterEvidence(0))}filter(r){this.value.ready&&(this.set({filters:{...this.value.filters,...r}}),this.filterEvidence(0))}current(r){return this.alive&&this.value.ready&&this.value.snapshot===r&&r.version===this.loadVersion&&this.value.report===r.report}async filterEvidence(r){const t=this.value.snapshot;if(!t||!this.current(t)||!this.value.mounted.has("evidence"))return;const s=++this.evidenceVersion,i=this.value.filters;if(!Te(i)){if(t.offset!==0){await this.load(!1,0);return}this.set({evidence:{records:t.report.details,total:t.report.details_total,start:0,size:100,state:"",busy:!1,failed:!1}});return}this.set({evidence:{records:[],total:0,start:0,size:i.size,state:"正在读取同一截止时间下的真实分页证据，完成后筛选；不会按当前页冒充全部任务。",busy:!0,failed:!1}});try{const a=await this.repository.all(t,this.service,()=>this.current(t),(p,d)=>{this.current(t)&&Te(this.value.filters)&&this.set({evidence:{...this.value.evidence,state:`正在读取真实分页证据 ${p} / ${d} 条；聚合统计保持不变。`}})});if(!a||!this.current(t)||s!==this.evidenceVersion)return;const o=a.filter(p=>(!i.group||p.group_id===i.group)&&(!i.status||p.status===i.status)&&(!i.source||p.source===i.source)),l=Math.min(r,Math.max(0,Math.ceil(o.length/i.size)-1)*i.size);this.set({evidence:{records:o.slice(l,l+i.size),total:o.length,start:l,size:i.size,state:`筛选 ${o.length} / 全集 ${a.length} 条；只改变明细，聚合统计不受筛选或分页影响。`,busy:!1,failed:!1}})}catch(a){if(!this.current(t)||s!==this.evidenceVersion)return;this.set({evidence:{records:[],total:0,start:0,size:i.size,state:`证据筛选失败：${ne(a)}。请立即刷新后重试。`,busy:!1,failed:!0}})}}page(r){const{ready:t,evidence:s,mounted:i,snapshot:a,filters:o}=this.value;if(!t||!a||!i.has("evidence")||s.busy||s.failed)return;const l=Math.max(0,s.start+r*s.size);r>0&&l>=s.total||(Te(o)?this.filterEvidence(l):this.load(!1,l))}async estimate(r){if(this.invalidateEstimate("正在计算…"),!this.value.ready||!this.value.snapshot){this.estimateFailure("请先点击立即刷新并成功读取证据。");return}const t=this.estimateVersion,s=this.value.snapshot,i=this.value.revision;this.set({estimating:!0});try{const a=await this.service.estimate(r);if(t!==this.estimateVersion||i!==this.value.revision||!this.current(s))return;const l={...s.report.workers.find(d=>d.id===r.worker_id)?.hardware};delete l.note;const p={result:a,payload:r,groups:s.report.groups.filter(d=>r.demands.some(c=>c.group_id===d.id)),hardware:l};this.set({estimate:p,estimating:!1})}catch(a){t===this.estimateVersion&&this.estimateFailure(`测算失败：${ne(a)}`)}}estimateFailure(r){this.set({estimate:null,estimating:!1,estimateNote:"本次未产生测算结果，请检查证据与输入后重试。",estimateError:r}),this.notify(r)}async mutate(r,t,s){if(this.mutations.has(r))throw Error("正在保存，请勿重复提交。");this.mutations.add(r);const i=this.loadVersion;this.set({writeStatus:""}),this.invalidateEstimate(`${t}正在保存，旧测算已清除。`);try{if(await s(),!this.alive)return;i===this.loadVersion?await this.load(!1):(this.loadVersion++,this.clear(),this.invalidateEstimate("证据已更新，请点击立即刷新后重新计算。"),this.set({refreshState:`${t}已更新，请点击立即刷新`})),this.set({writeStatus:`${t}已保存。人工声明不回写历史快照，也不代表自动验证通过。`})}finally{this.mutations.delete(r)}}saveProfile(r,t){return this.mutate(`profile:${r}`,"机器配置",()=>this.service.profile(r,t))}saveReview(r,t){return this.mutate(`review:${r}`,"人工标记",()=>this.service.review(r,t))}probe(r,t){return this.service.probe(r,t,this.probeWritten)}probeVersion(){return this.loadVersion}probeCurrent(r){return this.alive&&r===this.loadVersion&&this.value.report!==null}probeWritten=()=>{this.resetSnapshot(),this.invalidateEstimate("成品尺寸证据已更新，请刷新看板后重新计算。")}}function ri({http:n,notify:r}){const t=m.useMemo(()=>new ni(new Qa(n),i=>r({message:i,tone:"error"})),[n,r]),s=m.useSyncExternalStore(t.subscribe,t.getSnapshot);return m.useEffect(()=>(t.start(),()=>t.dispose()),[t]),{controller:t,state:s}}const ti={historical:"历史运行参考",captured:"采集业务样本",standard:"标准样本（人工标签）"},Pn={idle:"在线空闲",online:"在线",busy:"运行中",running:"运行中",offline:"离线",disabled:"已禁用",syncing:"同步中",unavailable:"执行环境不可用",historical:"历史执行端",error:"异常",done:"已完成",canceled:"已取消",queued:"排队中",assigned:"已分配"},A=n=>typeof n=="number"&&Number.isFinite(n),M=n=>n==null||n===""?"未知":typeof n=="object"?JSON.stringify(n):String(n),$=n=>A(n)?n.toLocaleString("zh-CN",{maximumFractionDigits:2}):"未知",Z=n=>A(n)?`${$(n)} 秒`:"未知",Ae=n=>A(n)?new Date(n*1e3).toLocaleString("zh-CN",{hour12:!1}):"未知",Ie=n=>A(n)?`${$(n/1024**3)} GiB`:"未知",de=n=>ti[n]||`来源未知（${M(n)}）`,qn=n=>Array.isArray(n.days)?n.days.length:n.days,Pe=n=>n.capability_name?.trim()?n.capability_name:M(n.capability),Pr=n=>Pe(n)===n.capability?Pe(n):`${Pe(n)}（${n.capability}）`,on=n=>typeof n=="string"&&{reported:"机器上报",manual:"人工声明","manual+reported":"机器上报 + 人工声明",unknown:"未知"}[n]||"未知";function Rn(n){return n&&typeof n=="object"&&!Array.isArray(n)?n:{}}function Be(n,r){if(!n||typeof n!="object")return M(n);const t=Rn(n);return(r==="cpu"?[t.model,t.architecture,A(t.logical_cores)?`${$(t.logical_cores)} 逻辑核`:null]:[t.name,t.release,t.version]).filter(i=>i!=null&&i!=="").map(M).join(" / ")||"未知"}function He(n){return n?`GPU ${n.gpus?.length?n.gpus.map(t=>`${M(t.name)} / 单卡 ${Ie(t.memory_total_bytes)}`).join("；"):"未知"}；CPU ${Be(n.cpu,"cpu")}；内存 ${Ie(n.memory_total_bytes)}；系统 ${Be(n.os,"os")}；环境 ${M(n.environment_id)}；模型版本 ${M(n.model_version)}；磁盘 ${M(n.disk)}；主机 ID ${M(n.host_id)}`:"未知"}function si(n){const r=n.hardware,t=(r?.gpus||[]).map(s=>[s.name,A(s.memory_total_bytes)?Ie(s.memory_total_bytes):null].filter(Boolean).join(" / ")).filter(Boolean);return A(r?.memory_total_bytes)&&t.push(`系统内存 ${Ie(r.memory_total_bytes)}`),t.join("；")||"尚未采集硬件信息"}function ai(n){const r=n.hardware;return!r?.cpu||!r.host_id?A(n.agent_version)&&n.agent_version<4||n.supports_capacity_telemetry===!1?"旧版采集程序缺少 CPU 等信息，请升级该 Worker 后补采；已有 GPU 与内存记录仍可查看。":"CPU 或主机信息尚未采集，请检查该 Worker 的采集上报。":!r.environment_id||!r.model_version?"环境或模型版本的人工声明未填写，可在“详细统计与机器配置”中补录。":"当前配置不代表历史任务的执行配置；历史依据见各业务详情。"}const he=n=>["idle","busy","online","running"].includes(n.state),Qe=n=>A(n.mean_seconds)&&n.mean_seconds>=0&&A(n.measured)&&n.measured>0;function ii(n){if(!A(n)||n<0)return"暂无成功耗时";if(n<1)return`${$(n)} 秒`;const r=Math.round(n),t=Math.floor(r/60),s=r%60;return t?`${$(t)} 分 ${s} 秒`:`${s} 秒`}function ln(n){const r={...n.spec?.dimensions,...n.dimensions},t=[["图片",r.image_count,"张"],["视频",r.video_count,"段"],["音频",r.audio_count,"段"]],s=i=>A(i)&&Number.isSafeInteger(i)&&i>=0;return t.every(([,i])=>!s(i))?["素材信息未记录"]:t.every(([,i])=>i===0)?["未使用图片、视频或音频"]:t.flatMap(([i,a,o])=>s(a)?a>0?[`${i} ${$(a)} ${o}`]:[]:[`${i}数量未记录`])}function qr(n,r){const t=a=>A(a)&&Number.isSafeInteger(a)&&a>0,s=typeof n.resolution=="string"?n.resolution.match(/^(\d+)\s*[x×]\s*(\d+)(?:\s*\(\d+:\d+\))?$/i):null,i=[[n.output_width,n.output_height],[n.width,n.height],[s?Number(s[1]):null,s?Number(s[2]):null],[r.width,r.height,"期望 "]];for(const[a,o,l=""]of i)if(t(a)&&t(o)){const d={"640x360":"360p","640x480":"480p","854x480":"480p","1280x720":"720p","1920x1080":"1080p","2560x1440":"1440p","3840x2160":"4K"}[`${Math.max(a,o)}x${Math.min(a,o)}`];return d?`${l}${d}${a<o?" 竖屏":""}（${$(a)} × ${$(o)}）`:`${l||"尺寸 "}${$(a)} × ${$(o)}`}return A(n.megapixels)&&n.megapixels>0&&A(n.megapixels*100)?`约 ${$(n.megapixels*100)} 万像素（尺寸未记录）`:null}function cn(n,r=!1){const t={...n.spec?.parameters,...n.spec?.dimensions,...n.dimensions},s=n.spec?.expected||{},i=[],a=t.output_duration??t.duration??s.duration;A(a)&&i.push(`请求时长 ${$(a)} 秒`);const o=qr(t,s);if(o&&i.push(o),r){A(t.megapixels)&&t.megapixels>0&&i.push(`像素设置 ${$(t.megapixels)} MP`);const l=[["帧率",t.output_fps??t.target_fps??t.fps??t.force_rate??s.fps," FPS"],["步数",t.steps," 步"],["帧数",t.frames," 帧"],["长边",t.scale_to_length," px"],["批量",t.batch_size,""]];for(const[p,d,c]of l)A(d)&&i.push(`${p} ${$(d)}${c}`)}return i.join(" / ")||"规格未完整记录"}function Rr(n){return(n?.variants||[]).flatMap(r=>{const t=Rn(r);return typeof t.kind=="string"&&["image","video"].includes(t.kind)&&A(t.width)&&Number.isSafeInteger(t.width)&&t.width>0&&A(t.height)&&Number.isSafeInteger(t.height)&&t.height>0?[{kind:t.kind,width:t.width,height:t.height,outputs:t.outputs,samples:t.samples}]:[]})}function Ln(n){return`${n.kind==="image"?"图片":"视频"} · ${qr({width:n.width,height:n.height},{})}`}function oi(n){return A(n.width)&&A(n.height)&&Number.isSafeInteger(n.width)&&Number.isSafeInteger(n.height)&&n.width>0&&n.height>0&&["image","video"].includes(n.kind||"")?Ln({kind:n.kind||"",width:n.width,height:n.height}):"尺寸未记录"}const li=n=>`${ln(n).join(" + ")}｜${cn(n)}`;function ci(n){const r=t=>Qe(t)?t.source!=="historical"&&A(t.last_sample_at)?3:t.source==="historical"?2:1:0;return[...n].sort((t,s)=>r(s)-r(t)||(r(t)===3?(s.last_sample_at||0)-(t.last_sample_at||0):0)||(s.samples||0)-(t.samples||0)||(s.measured||0)-(t.measured||0))[0]}function In(n){const r=[...n.warnings||[]],t=qn(n);return(!A(n.samples)||n.samples<30||!A(t)||t<3)&&r.push("参考样本不足：建议至少 30 个任务且跨 3 天；达到门槛也不是置信保证。"),n.source==="historical"&&r.push("仅成功任务 runtime 参考，未计完整占机、重试及质量损耗；不是合格日产能。"),n.eligible!==!0&&r.push("完整基线证据不足，不作为已验证采购依据。"),[...new Set(r)]}const qe=n=>{const r={task:"任务",tasks:"任务",image:"张图片",images:"张图片",video:"条视频",videos:"条视频",second:"视频秒",seconds:"视频秒",video_seconds:"视频秒"};return n.source==="historical"?"任务":r[n.unit||""]||M(n.unit)};function Lr(n){const r=Object.hasOwn(n,"model_evidence"),t=n.model_evidence;return{variants:r?(t?.variants||[]).filter(i=>["task_snapshot","archived_task"].includes(i.source)):n.model_summary?.source==="task_snapshot"?[{source:"task_snapshot",summary:n.model_summary,samples:null,measured:null}]:[],hasEvidence:r,total:t?.total_samples,recorded:t?.recorded_samples,reference:n.current_model_reference?.source==="current_template"?n.current_model_reference:null}}const Se=n=>n?.models||[];function di(n,r,t){const i={high_noise:"高噪声",low_noise:"低噪声",高噪声:"高噪声",低噪声:"低噪声",base:"基础模型",refiner:"精修模型",生成主模型:"生成主模型",深度模型:"深度模型",放大模型:"放大模型",插帧模型:"插帧模型"}[n.role||""];return i?`${i} · 主模型 ${r+1}`:t>1?`主模型 ${r+1}`:""}function wn(n){const r=[];if(n.precision&&n.precision_source==="filename"&&r.push(`文件标记 ${M(n.precision)}`),n.loader_dtype){const t=M(n.loader_dtype),s=t.split(/\s*\/\s*/).map(a=>a.match(/^(bfloat16|bf16|float(?:8|16|32|64)|fp(?:8|16|32|64))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]),i=s.every(Boolean)?[...new Set(s.map(a=>a?.toUpperCase().replace("BFLOAT16","BF16").replace("FLOAT","FP")))].join(" / "):null;r.push(`加载配置 ${i?`${i}（${t}）`:t}${["default","auto"].includes(t.toLowerCase())?"（实际精度未确认）":""}`)}else n.precision&&n.precision_source==="loader"&&r.push(`加载配置 ${M(n.precision)}`);return r.length||r.push("精度未记录 / 待确认"),r}function pi(n){const r=a=>{if(typeof a!="string")return null;const o=a.split(/\s*\/\s*/).map(l=>l.trim().match(/^(bfloat16|float(?:8|16|32|64)|bf16|fp(?:4|8|16|32|64)|int(?:4|8|16)|nf4|q[2-8]_(?:k(?:_[sml])?|[01]))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]);return o.every(Boolean)?[...new Set(o.map(l=>l?.toUpperCase().replace("BFLOAT16","BF16").replace("FLOAT","FP")))].sort().join(" / "):null},t=n.precision_source==="filename"?r(n.precision):null,s=r(n.loader_dtype)||(n.precision_source==="loader"?r(n.precision):null),i=wn(n).filter(a=>a.startsWith("文件标记 ")?!!t:a.startsWith("加载配置 ")?!!s||["default","auto"].includes(String(n.loader_dtype).toLowerCase()):!1);return i.some(a=>a.startsWith("文件标记 "))||i.unshift("文件标记未记录 / 待确认"),i.some(a=>a.startsWith("加载配置 "))||i.push("加载配置未记录 / 待确认"),i}function Ir(n){return JSON.stringify([n.capability,n.spec_key||`unknown:${n.id}`,n.source,n.spec?.model_version||null,n.config?.model_version||null,n.config?.environment_id||null,n.source==="standard"?n.benchmark_id||`unknown:${n.id}`:null,n.cache_condition||null])}function mi(n){const r=new Map,t={none:"无节点结果缓存",loaders:"加载节点缓存",execution:"执行节点缓存",unknown:"未知",mixed:"混合条件"};for(const s of n){const i=Rn(s.cache_condition).kind;r.set(Ir(s),`${Pr(s)} / ${M(s.spec_key)} / ${de(s.source)} / 模型 ${M(s.spec?.model_version||s.config?.model_version)} / 环境 ${M(s.config?.environment_id)} / 缓存 ${typeof i=="string"&&t[i]||"未知"}${s.source==="standard"?` / 基准 ${M(s.benchmark_id)}`:""}`)}return[...r]}function An(n,r,t,s=[]){return`${r||t.find(i=>i.id===n)?.name||s.find(i=>i.worker_id===n)?.worker_name||"未关联执行端"}（${n||"Worker ID 未知"}）`}function ui(n){return n.review?.source==="standard"?"标准样本（人工声明）":n.review?.source==="business"?"业务样本":"未标记"}function Ar({title:n,children:r,className:t}){const[s,i]=m.useState(!1);return e.jsxs("details",{className:t,onToggle:a=>{a.currentTarget.open&&i(!0)},children:[e.jsx("summary",{children:n}),s&&(typeof r=="function"?r():r)]})}function en({title:n,value:r,className:t}){return e.jsx(Ar,{title:n,className:t,children:()=>e.jsx("pre",{children:M(r)})})}function dn({values:n=[],className:r="warn"}){return e.jsx("ul",{className:r,children:n.map((t,s)=>e.jsx("li",{children:t},s))})}function _n({items:n}){return n.map(([r,t])=>e.jsxs("div",{className:"metric",children:[e.jsx("span",{children:r}),e.jsx("strong",{children:$(t)})]},r))}function Tn({headers:n,children:r}){return e.jsx("div",{className:"scroll",tabIndex:0,role:"region","aria-label":n.join(" / "),children:e.jsxs("table",{children:[e.jsx("thead",{children:e.jsx("tr",{children:n.map(t=>e.jsx("th",{scope:"col",children:t},t))})}),e.jsx("tbody",{children:r})]})})}function Tr({resolution:n}){const r=Rr(n);return e.jsxs(e.Fragment,{children:[r.length?e.jsxs(e.Fragment,{children:[new Set(r.map(t=>`${t.width}x${t.height}`)).size>1&&e.jsx("span",{className:"hint",children:"多种成品规格（非单一尺寸）"}),r.map((t,s)=>e.jsx("span",{className:"resolution-variant",children:Ln(t)},s))]}):e.jsx("span",{children:"尺寸未记录"}),A(n?.total_samples)&&n.total_samples>0&&n.complete_samples!==n.total_samples&&e.jsxs("span",{className:"resolution-coverage hint",children:["已知 ",$(n.recorded_samples)," / ",$(n.total_samples)," ","次任务的部分或全部成品"]})]})}function Dr({resolution:n}){return e.jsxs("div",{className:"output-resolution-details",children:[e.jsx("h3",{children:"实际成品"}),e.jsx("div",{className:"actual-resolution",children:e.jsx(Tr,{resolution:n})}),e.jsxs("p",{children:["尺寸覆盖：",$(n?.recorded_samples)," / ",$(n?.total_samples)," ","次已完成任务至少有一个成品尺寸；",$(n?.complete_samples)," /"," ",$(n?.total_samples)," 次已完成任务的全部最终产物都有尺寸。"]}),e.jsxs("p",{children:["已知尺寸产物 ",$(n?.recorded_outputs)," / ",$(n?.total_outputs)," 个",n?.total_outputs==null?"（最终清单不完整，产物总数未知）":"","。"]}),Rr(n).map((r,t)=>e.jsxs("p",{children:[Ln(r),"：",$(r.outputs)," 个产物 / ",$(r.samples)," 次任务"]},t)),e.jsx("p",{className:"hint",children:"同一任务可能包含多种尺寸，各尺寸的任务数不能相加。尺寸来自最终产物记录或受控补采，与技术合格产量、人工验收和采购资格分离；有尺寸不代表技术合格。平均耗时仍为原组成功任务平均，不按尺寸重算。"})]})}function tr({summary:n,origin:r}){const t=Se(n);return e.jsxs("div",{className:"model-reference",children:[e.jsx("p",{className:"model-origin",children:r}),n.complete===!1&&e.jsx("p",{className:"warn",children:"不完整 / 未确认完整主模型链；动态选择或未知链路不能推断全部主模型。"}),!t.length&&e.jsx("p",{children:"未获取到模型信息，模型待确认。"}),t.map((s,i)=>e.jsx("p",{children:`${di(s,i,t.length)||"主模型"}：${M(s.name)}；角色：${M(s.role)}；${wn(s).join("；")}；非运行时检测`},i)),!!n.auxiliary_models?.length&&e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"hint",children:"辅助模型（不计入主模型名称或精度）"}),n.auxiliary_models?.map((s,i)=>e.jsx("p",{className:"hint",children:`角色：${M(s.role)}；${M(s.name)}；${wn(s).join("；")}`},i))]})]})}function Fr({g:n}){const r={...n.spec?.dimensions,...n.dimensions},t=Lr(n);return e.jsxs("div",{className:"pad",children:[e.jsxs("p",{children:["输入素材：",ln(n).join(" / ")]}),e.jsxs("p",{children:["生成参数：",cn(n,!0)]}),A(r.source_duration)&&e.jsxs("p",{className:"hint",children:["首个输入视频时长：",$(r.source_duration)," 秒（非多段视频合计）"]}),e.jsx("p",{className:"hint",children:"素材数量按任务输入槽位计，同一文件被多次引用也会分别计数；生成参数不是成品实测规格。"}),e.jsxs("p",{children:["来源：",de(n.source),"；有效耗时样本 ",$(n.measured)," / 总样本 ",$(n.samples),"；成功"," ",$(n.done)," / 失败 ",$(n.error)," / 取消 ",$(n.canceled)]}),e.jsxs("p",{children:["mean：",Z(n.mean_seconds),"；P50：",Z(n.p50_seconds),"；P90：",Z(n.p90_seconds),"；最近成功样本：",Ae(n.last_sample_at)]}),e.jsx("p",{className:"hint",children:"平均值仅使用该组成功任务执行耗时；不包含排队，不等于纯 GPU 计算时间，也不是合格日产能。"}),e.jsxs("p",{children:["执行时配置：",He(n.config),"（",on(n.config_source),"）"]}),e.jsxs("p",{children:["缓存条件：",M(n.cache_condition)]}),e.jsxs("p",{children:["成功 runtime 合计：",Z(n.runtime_seconds),"；占机合计：",Z(n.occupied_seconds),"；实际产出：",$(n.output_count)," ",qe(n),"。"]}),e.jsxs("p",{children:["单位技术交付：",Z(n.seconds_per_unit)," / ",qe(n),"；单位人工合格：",Z(n.qualified_seconds_per_unit)," / ",qe(n),"；已人工验收：",$(n.reviewed),"；全组人工合格数量：",$(n.accepted),"。"]}),e.jsxs("p",{className:"hint",children:["技术基线资格：",n.eligible===!0?"服务端判定具备完整基线证据":n.eligible===!1?"证据不足，不作为已验证采购依据":"未记录","；标准场景编号：",M(n.benchmark_id),"。"]}),e.jsx(Dr,{resolution:n.output_resolution}),t.hasEvidence&&e.jsxs("p",{children:["模型记录覆盖 ",$(t.recorded)," / ",$(t.total)," ","次；覆盖数不是完整主模型链的确认。"]}),t.variants.length>1&&e.jsx("p",{className:"warn",children:"不同任务记录对应不同模型组合；每个组合内的主模型才属于同一个图。全组平均耗时不代表任一组合的专属速度。"}),!t.variants.length&&e.jsx("p",{children:"历史未记录可用主模型证据；不能用当前模板补写历史模型与精度。"}),t.variants.map((s,i)=>e.jsx(tr,{summary:s.summary,origin:`历史任务记录组合 ${i+1} · ${s.source==="archived_task"?"保留的原任务记录":"任务提交记录"}${t.hasEvidence?` · ${$(s.samples)} 次记录 / ${$(s.measured)} 次成功耗时`:""}`},i)),t.reference?e.jsxs(e.Fragment,{children:[e.jsx(tr,{summary:t.reference,origin:`当前工具默认配置（非历史执行记录）· ${M(t.reference.capability_name)}`}),e.jsx("p",{className:"warn hint",children:"仅为工具模板默认值，不代表用户画布节点当前选中的模型。历史耗时不代表当前模型速度；参考信息不补齐历史覆盖，也不覆盖历史精度。"})]}):!t.variants.length&&e.jsx("p",{className:"hint",children:"未获取到模型信息：当前工具模板未提供、找不到或无法识别。"}),e.jsx(dn,{values:In(n)}),e.jsxs("p",{className:"hint",children:["采样日期：",M(n.days),"；配置编号：",M(n.config_id),"；采样编号：",n.id]}),e.jsx(en,{title:"原始规格与证据",value:{dimensions:n.dimensions,spec:n.spec,output_resolution:n.output_resolution,recovered_outputs:n.recovered_outputs,model_summary:n.model_summary,model_evidence:n.model_evidence,current_model_reference:n.current_model_reference,cache_condition:n.cache_condition}})]})}function Or({groups:n,report:r}){return n.length?e.jsx(Tn,{headers:["业务 / 执行端 / 来源","精确业务规格","样本覆盖","成功任务耗时分布","运行参考 / 产出口径","警告与限制"],children:n.map(t=>e.jsxs("tr",{"data-group-id":t.id,children:[e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsx("strong",{children:Pe(t)}),e.jsxs("p",{className:"hint",children:["能力 ID：",t.capability]}),e.jsx("p",{className:"hint",children:An(t.worker_id,t.worker_name,r.workers,r.groups)}),e.jsx("span",{className:"badge",children:de(t.source)}),e.jsxs("p",{className:"hint",children:["配置：",M(t.config_id)]}),t.source==="standard"&&e.jsxs("p",{className:"hint",children:["标准场景编号：",M(t.benchmark_id)]})]})}),e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsxs("p",{children:["规格键：",M(t.spec_key)]}),e.jsxs("p",{className:"hint",children:["已知规格：",M(t.dimensions)]}),e.jsx(Ar,{title:"配置 / 规格 / 日期证据",children:()=>e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["执行时配置：",He(t.config)]}),e.jsxs("p",{children:["配置来源：",on(t.config_source)]}),e.jsxs("p",{children:["采样日期（服务端记录）：",M(t.days)]}),e.jsxs("p",{children:["缓存条件：",M(t.cache_condition)]}),e.jsx("pre",{children:M(t.spec)})]})})]})}),e.jsx("td",{children:e.jsxs("div",{children:[e.jsxs("p",{children:["样本 ",$(t.samples)," / ",$(qn(t))," 天"]}),e.jsxs("p",{children:["完成 ",$(t.done)," / 失败 ",$(t.error)," / 取消 ",$(t.canceled)]}),e.jsxs("p",{className:"hint",children:["有效耗时样本 ",$(t.measured),"；已人工验收 ",$(t.reviewed)]})]})}),e.jsx("td",{children:e.jsxs("div",{children:[e.jsxs("p",{children:["平均 ",Z(t.mean_seconds)]}),e.jsxs("p",{children:["P50 ",Z(t.p50_seconds)]}),e.jsxs("p",{children:["P90 ",Z(t.p90_seconds)]})]})}),e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsxs("p",{children:["成功任务 runtime 合计 ",Z(t.runtime_seconds)]}),e.jsxs("p",{children:["成功任务 / 运行小时（仅 runtime 参考）：",$(t.reference_per_hour)]}),t.source!=="historical"&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["占机合计 ",Z(t.occupied_seconds)]}),e.jsxs("p",{children:["实际产出 ",$(t.output_count)," ",qe(t)]}),e.jsxs("p",{children:["单位技术交付 ",Z(t.seconds_per_unit)," / ",qe(t)]}),e.jsxs("p",{children:["单位人工合格 ",Z(t.qualified_seconds_per_unit)," / ",qe(t)]})]})]})}),e.jsx("td",{className:"wide",children:e.jsx(dn,{values:In(t)})})]},t.id))}):e.jsx("p",{className:"empty",children:"暂无业务规格样本；未测试场景不能推算产能。"})}function hi({items:n}){return e.jsx("dl",{children:n.map(([r,t])=>e.jsxs(m.Fragment,{children:[e.jsx("dt",{children:r}),e.jsx("dd",{children:t})]},r))})}function xi({entries:n,worker:r,title:t,ready:s,onEvidence:i}){const[a,o]=m.useState(()=>ci(n)?.id||""),[l,p]=m.useState(!1),[d,c]=m.useState(!1),g=`summary-evidence-${m.useId().replace(/[^a-zA-Z0-9_-]/g,"")}`,u=n.find(k=>k.id===a)||n[0];if(!u)return null;const y=Lr(u),j=y.variants.length?y.variants.map(k=>k.summary):y.reference?[y.reference]:[],w=j.reduce((k,L)=>k+Math.max(1,Se(L).length),0)||1,v=n.map(li),f=new Map;for(const k of v)f.set(k,(f.get(k)||0)+1);const h=y.variants.length?y.variants.length>1||y.hasEvidence&&A(y.recorded)&&A(y.total)&&y.recorded<y.total||y.variants.some(k=>k.summary.complete===!1)?"全组历史任务平均，非某个模型或组合专属速度。":"":y.reference?"此处耗时来自历史任务，不代表当前模型速度。":"",x={"--model-rows":w+1};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"business-row","data-capability":u.capability,"data-selected-group-id":u.id,children:[e.jsxs("div",{className:"matrix-field","data-label":"平均生成时间",children:[e.jsx("span",{className:Qe(u)?"mean-time":"muted",children:Qe(u)?ii(u.mean_seconds):"暂无成功耗时"}),h&&e.jsx("p",{className:"warn hint",children:h}),Qe(u)&&A(u.mean_seconds)&&(u.mean_seconds<1||u.mean_seconds>3600)&&e.jsx("p",{className:"warn hint",children:"耗时异常，请核对详情"})]}),e.jsxs("div",{className:"matrix-samples","data-label":"样本与详情",children:[e.jsxs("p",{className:!A(u.measured)||u.measured<30?"warn hint":"hint",children:[A(u.measured)?u.measured<30?`仅 ${$(u.measured)} 次 / 仅供参考`:`${$(u.measured)} 次成功实测`:"样本数未记录"," ","· ",de(u.source)]}),e.jsx("button",{type:"button",className:"summary-detail-toggle","aria-expanded":l,"aria-controls":g,onClick:()=>{p(!l),l||c(!0)},children:l?"收起详情":"查看详情"})]}),e.jsxs("div",{className:"matrix-field","data-label":"任务规格",children:[e.jsx("select",{className:"summary-spec",disabled:!s,"aria-label":`${r.name||"机器"} ${t}任务规格`,title:`原组 ${u.id} / 配置 ${M(u.config_id)} / ${de(u.source)} / 规格键 ${M(u.spec_key)}`,value:u.id,onChange:k=>{s&&(o(k.target.value),c(l))},children:n.map((k,L)=>e.jsx("option",{value:k.id,children:`${v[L]}${(f.get(v[L]||"")||0)>1?` · ${de(k.source)} · ${A(k.last_sample_at)?Ae(k.last_sample_at):"日期未记录"} · 采样 ${L+1}`:""}`},k.id))}),e.jsxs("dl",{className:"selected-spec",children:[e.jsx("dt",{children:"输入素材"}),e.jsx("dd",{className:"input-materials",children:ln(u).map(k=>e.jsx("span",{children:k},k))}),e.jsx("dt",{children:"生成参数"}),e.jsx("dd",{className:"generation-parameters",children:cn(u)}),e.jsx("dt",{children:"实际成品"}),e.jsx("dd",{className:"actual-resolution",children:e.jsx(Tr,{resolution:u.output_resolution})})]})]}),e.jsxs("div",{className:"matrix-models",style:x,children:[e.jsx("div",{className:"matrix-field","data-label":"模型名称",children:j.length?j.map((k,L)=>e.jsx("div",{className:"model-variant",children:Se(k).length?Se(k).map((T,_)=>e.jsx("div",{className:"model-item",children:e.jsx("p",{className:"model-name",children:T.name||"未获取到模型信息"})},_)):e.jsx("p",{className:"muted",children:"未获取到模型信息"})},L)):e.jsx("span",{className:"muted",children:"未获取到模型信息"})}),e.jsx("div",{className:"matrix-field","data-label":"模型精度",children:j.length?j.map((k,L)=>e.jsx("div",{className:"model-variant",children:Se(k).length?Se(k).map((T,_)=>e.jsx("div",{className:"model-item",children:pi(T).map(N=>e.jsx("p",{className:"model-label",children:N},N))},_)):e.jsx("p",{className:"muted",children:"无"})},L)):e.jsx("p",{className:"muted",children:"无"})})]})]}),e.jsx("div",{className:"summary-evidence",id:g,hidden:!l,children:d&&e.jsxs(e.Fragment,{children:[e.jsx(Fr,{g:u},u.id),e.jsx("button",{type:"button","data-evidence-entry":"",disabled:!s,onClick:()=>{s&&i(u.id)},children:"任务证据"})]})})]})}function fi({report:n,ready:r,includeOffline:t,onProfile:s,onEvidence:i}){const a=n.workers.filter(d=>t||he(d));if(!a.length)return e.jsx("p",{className:"empty",children:t?"暂无机器记录。":"当前没有在线机器，可勾选“包含离线”查看已登记记录。"});const o=new Set(a.map(d=>d.id)),l=new Map;for(const d of n.groups)if(d.worker_id&&o.has(d.worker_id)){let c=l.get(d.capability);c||(c={title:Pe(d),machines:new Map},l.set(d.capability,c)),c.machines.set(d.worker_id,[...c.machines.get(d.worker_id)||[],d])}l.size||l.set("",{title:"历史记录",machines:new Map});const p={"--machine-count":a.length};return e.jsx("div",{className:"scroll comparison-scroll",tabIndex:0,role:"region","aria-label":"机器产能对比表，可横向滚动",children:e.jsxs("table",{className:"simple-table matrix-table","aria-label":"机器与业务能力对比",style:p,children:[e.jsxs("colgroup",{children:[e.jsx("col",{className:"matrix-axis-col"}),a.map(d=>e.jsx("col",{},d.id))]}),e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"business-axis",scope:"col",children:"业务能力"}),a.map((d,c)=>e.jsxs("th",{className:"machine-heading",scope:"col",id:`summary-machine-${c+1}`,"data-summary-worker-id":d.id,children:[e.jsx("h3",{children:d.name||"未命名机器"}),e.jsx("span",{className:["busy","running"].includes(d.state)?"warn":he(d)?"online-state":"muted",children:Pn[d.state]||"状态待确认"}),e.jsx("p",{className:"machine-hardware",children:si(d)}),e.jsxs("details",{className:"machine-more",children:[e.jsx("summary",{children:"机器详情"}),e.jsx("p",{children:ai(d)}),e.jsxs("p",{className:"hint",children:["最后上报：",Ae(d.last_seen),"；Worker ID：",d.id,"；采集程序版本：",M(d.agent_version)]}),!he(d)&&e.jsx("p",{className:"hint",children:"此记录当前不可用，配置为最后上报信息，历史速度不代表现在能执行。"}),e.jsx("button",{type:"button",onClick:()=>s(d),children:"查看配置"})]})]},d.id))]})}),e.jsx("tbody",{children:[...l].map(([d,{title:c,machines:g}],u)=>e.jsxs("tr",{className:"capability-row","data-capability":d||void 0,children:[e.jsx("th",{className:"business-axis",scope:"row",id:`summary-business-${u+1}`,children:e.jsx("span",{className:"business-title",children:c})}),a.map((y,j)=>{const w=g.get(y.id);return e.jsx("td",{className:"machine-result","data-summary-worker-id":y.id,headers:`summary-machine-${j+1} summary-business-${u+1}`,children:w?e.jsx(xi,{entries:w,worker:y,title:c,ready:r,onEvidence:i}):e.jsx("p",{className:"matrix-empty",children:"暂无记录；不据此推断是否支持该业务。"})},y.id)})]},d))})]})})}function gi({report:n,mounted:r,onProfile:t}){const s=n?.overview||{};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"summary",children:[e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"生成任务"}),e.jsx("span",{className:"hint",children:"不是产物数量"})]}),e.jsx("div",{id:"task-metrics",className:"metrics pad",children:r&&e.jsx(_n,{items:[["总任务",s.tasks],["完成",s.done],["失败",s.error],["取消",s.canceled]]})}),e.jsx("p",{id:"coverage",className:"hint pad",children:r&&`历史 ${$(s.historical_tasks)} / 新采集 ${$(s.captured_tasks)}；Worker 未关联 ${$(s.unknown_worker)}；已排除 API ${$(s.excluded_api)}。`})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"实际产物"}),e.jsx("span",{className:"hint",children:"仅已知输出，不从请求推断"})]}),e.jsx("div",{id:"output-metrics",className:"metrics pad",children:r&&e.jsx(_n,{items:[["图片（张）",s.output_images],["视频（条）",s.output_videos],["视频总时长（秒）",s.output_seconds],["产物未知记录",s.unknown_outputs]]})}),e.jsx("p",{className:"hint pad",children:"图片、视频、时长分别统计；未知不记为零，也不计为人工合格。"})]})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"机器配置与状态"}),e.jsx("span",{className:"hint",children:"按 Worker ID 区分，名称相同不合并"})]}),e.jsx("p",{className:"notice hint",children:"配置为当前或最后上报信息，不代表历史执行快照，也不是最低采购配置。系统可见内存不是标称容量，多卡显存不相加。"}),e.jsx("div",{id:"workers",className:"worker-grid",children:r&&n&&(n.workers.length?n.workers.map(i=>{const a=i.hardware,o=["offline","disabled"].includes(i.state)||!A(i.last_seen)||Date.now()/1e3-i.last_seen>120;return e.jsxs("article",{className:"worker","data-worker-id":i.id,children:[e.jsx("h3",{children:M(i.name)}),e.jsxs("p",{className:"hint",children:["Worker ID：",i.id]}),e.jsx("span",{className:"badge",children:Pn[i.state]||i.state}),e.jsxs("p",{className:o?"warn":"hint",children:["最后心跳：",Ae(i.last_seen),o?"；状态 / 配置快照已过期或无法确认，请勿视为实时。":""]}),e.jsx(hi,{items:[["GPU",a?.gpus?.length?a.gpus.map((l,p)=>`GPU ${p+1}：${M(l.name)} / 单卡显存 ${Ie(l.memory_total_bytes)}`).join(`
`):"未知"],["GPU 数量",a?.gpus?.length?$(a.gpus.length):"未知"],["CPU",Be(a?.cpu,"cpu")],["内存",Ie(a?.memory_total_bytes)],["系统",Be(a?.os,"os")],["环境",M(a?.environment_id)],["模型版本",M(a?.model_version)],["主机 ID",M(a?.host_id)],["磁盘",M(a?.disk)],["配置备注",M(a?.note)]]}),e.jsxs("p",{className:"hint",children:["配置来源：",on(i.hardware_source),"。人工补录不回写历史快照。"]}),e.jsxs("p",{children:["任务 ",$(i.tasks)," / 完成 ",$(i.done)," / 失败 ",$(i.error)," / 取消"," ",$(i.canceled)]}),e.jsxs("p",{className:"hint",children:["累计 runtime：",Z(i.runtime_seconds)]}),i.id&&i.state!=="historical"?e.jsxs("details",{className:"profile-details",children:[e.jsx("summary",{children:"补录机器配置（人工声明）"}),e.jsx("p",{className:"hint",children:"7 个字段仅保存非空新声明，不回写历史快照。"}),e.jsx("button",{type:"button",onClick:()=>t(i),children:"查看 / 补录配置"})]}):e.jsx("p",{className:"hint",children:"历史执行端未关联现存注册记录，不能补录配置。"})]},i.id)}):e.jsx("p",{className:"empty",children:"暂无执行端信息；无法关联的历史任务不会按名称猜测机器。"}))})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"业务规格分组"}),e.jsx("span",{className:"hint",children:"原始统计保留失败、取消与异常记录"})]}),e.jsx("div",{id:"machine-groups",children:r&&n&&e.jsx(Or,{groups:n.groups,report:n})})]})]})}const bi={mode:"historical",quality:"technical",availability:1,utilization:.75},ge=[{id:"zimage_t2i",type:"生图模式",label:"文生图",capabilities:["zimage_t2i","krea2_t2i","qwen_image_2512_t2i","qwen_image_21_t2i"]},{id:"zimage_i2i",type:"生图模式",label:"图生图",capabilities:["zimage_i2i","krea2_i2i","qwen_image_edit_2511_i2i","qwen_image_21_multi","qwen_image_21_i2i"]},{id:"flux2_klein_storyboard9",type:"生图模式",label:"多宫格故事分镜",capabilities:["flux2_klein_storyboard9"]},{id:"flux2_klein_edit",type:"生图模式",label:"参考图编辑(保人物)",capabilities:["flux2_klein_edit"]},{id:"minimax_h3_character_transfer",type:"生视频模式",label:"H3人物迁移",capabilities:["minimax_h3_character_transfer"]},{id:"minimax_h3_flf2v",type:"生视频模式",label:"H3 图生视频",capabilities:["minimax_h3_i2v","minimax_h3_flf2v"]},{id:"minimax_h3_talk2",type:"生视频模式",label:"H3 说话唱歌",capabilities:["minimax_h3_talk1","minimax_h3_talk2"]},{id:"minimax_h3_ref4",type:"生视频模式",label:"H3图片参考",capabilities:["minimax_h3_ref4"]},{id:"minimax_h3_comic20",type:"生视频模式",label:"漫剧4宫格",capabilities:["minimax_h3_comic20"]},{id:"minimax_h3_fusion_v2",type:"生视频模式",label:"H3无损融合单采V2",capabilities:["minimax_h3_fusion_v2"]},{id:"minimax_h3_ref9",type:"生视频模式",label:"H3全能参考",capabilities:["minimax_h3_ref9"]},{id:"minimax_h3_ref_2pass",type:"生视频模式",label:"H3全能参考(高质量)",capabilities:["minimax_h3_ref_2pass"]}],kn=n=>ge.find(r=>n!==void 0&&r.capabilities.includes(n)),yi=n=>JSON.stringify(n.source==="standard"?[n.config_id||null,n.source,n.benchmark_id||`unknown:${n.id}`]:[n.config_id||null,n.source]),vi=n=>A(n.mean_seconds)&&n.mean_seconds>0&&A(n.measured)&&n.measured>0;function pn(n,r){return n.workers.some(t=>t.id===r&&he(t))?n.groups.filter(t=>t.worker_id===r&&["historical","captured","standard"].includes(t.source)&&kn(t.capability)&&vi(t)):[]}const Ur=(n,r)=>n<r?-1:n>r?1:0;function ji(n,r){return(r.measured||0)-(n.measured||0)||(r.samples||0)-(n.samples||0)||(r.last_sample_at||0)-(n.last_sample_at||0)||(r.mean_seconds||0)-(n.mean_seconds||0)||Ur(n.id,r.id)}function wi(n,r){const t=new Map;for(const a of r){const o=yi(a);t.set(o,[...t.get(o)||[],a])}const s=[];for(const[a,o]of t){const l=[];for(const p of n){const d=ge.find(g=>g.id===p.mode_id),c=o.filter(g=>d?.capabilities.includes(g.capability)).sort(ji)[0];c&&l.push(c)}l.length===n.length&&s.push({key:a,groups:l,measured:l.reduce((p,d)=>p+(d.measured||0),0)})}s.sort((a,o)=>o.measured-a.measured||Ur(a.key,o.key));const i=s[0];if(!i)throw Error("所选模式没有同一电脑、同一配置和来源的共同实测记录，请减少模式或换一台电脑");return i.groups}function _i(n,r,t,s,i,a){if(!n.workers.some(d=>d.id===t&&he(d)))throw Error("所选电脑当前不在线，请刷新后重新选择。");const o=pn(n,t),l=new Set;for(const d of a){const c=ge.find(g=>g.id===d.mode_id);if(!c||!o.some(g=>c.capabilities.includes(g.capability)))throw Error("所选模式没有成功耗时记录，请换一个模式或电脑。");if(l.has(d.mode_id))throw Error("同一模式请合并每日需求，不能重复选择。");if(l.add(d.mode_id),!A(Number(d.quantity))||Number(d.quantity)<=0)throw Error("每日需求必须是大于零的有限任务数量。")}if(!a.length)throw Error("请至少添加一个有样本的业务模式。");const p=wi(a,o);return Cr.parse({...r,...bi,worker_id:t,hours:Number(s),...i!==""?{price:Number(i)}:{},demands:a.map((d,c)=>{const g=p[c];if(!g)throw Error("原组证据缺失");return{group_id:g.id,quantity:Number(d.quantity)}})})}const Wr=[{key:"host_id",label:"主机 ID",maxLength:160},{key:"cpu",label:"CPU 型号",maxLength:160},{key:"memory_total_bytes",label:"系统可见内存（GiB）"},{key:"environment_id",label:"执行环境版本",maxLength:160},{key:"model_version",label:"模型版本",maxLength:160},{key:"disk",label:"磁盘配置说明",maxLength:160},{key:"note",label:"配置备注",maxLength:500}];function Nn(n,r){if(Array.from(n).some(t=>t.charCodeAt(0)<32||t.charCodeAt(0)===127))throw Error(r)}function ki(n,r){const t={};for(const{key:s}of Wr){const i=(n[s]||"").trim();if(i)if(Nn(i,"配置字段请使用不含控制字符的单行文本。"),s==="memory_total_bytes"){const a=Math.round(Number(i)*1073741824);if(!Number.isSafeInteger(a)||a<=0)throw Error("内存必须是能转换为安全正整数字节的 GiB 数值。");a!==r?.[s]&&(t[s]=a)}else i!==(s==="cpu"?Be(r?.cpu,"cpu"):r?.[s])&&(t[s]=i)}if(!Object.keys(t).length)throw Error("没有需要保存的修改；留空不会删除已有配置。");return Mr.parse(t)}function Ni(n){const r=n.accepted===""?null:Number(n.accepted);if(r!==null&&(!Number.isSafeInteger(r)||r<0))throw Error("请输入非负整数，或留空表示未验收。");const t=(n.benchmark_id||"").trim(),s=(n.note||"").trim();if(n.source==="standard"&&!t)throw Error("标准样本需要填写标准场景编号；标签不代表自动验证。");return Nn(s,"验收备注和标准场景编号请使用单行文本，不含换行或控制字符。"),Nn(t,"验收备注和标准场景编号请使用单行文本，不含换行或控制字符。"),Er.parse({accepted:r,source:n.source,benchmark_id:t,note:s})}function Si(n){let r=n==null?"":typeof n=="object"?JSON.stringify(n):String(n);return/^[\s]*[=+\-@]/.test(r)&&(r="'"+r),'"'+r.replace(/"/g,'""')+'"'}function $i(n){return"\uFEFF"+[["类别","内容"],["测算口径","历史任务运行参考，不是合格日产能"],["输入与时间范围",n.payload],["当前机器配置（非历史快照）",n.hardware],["测算结果",n.result],...n.groups.map(t=>["场景证据",{...t,warnings:In(t)}])].map(t=>t.map(Si).join(",")).join(`\r
`)}function zi({worker:n,controller:r,onClose:t}){const[s,i]=m.useState({});return e.jsx(re,{title:n.state==="historical"?"历史执行端配置":`机器配置与人工补录 · ${n.name||n.id}`,className:"capacity-page",onClose:t,submitLabel:n.state==="historical"?"关闭":"保存人工配置",onSubmit:n.state==="historical"?async()=>{}:async()=>{const a=ki(s,n.hardware);try{await r.saveProfile(n.id,a)}catch(o){throw Error(`保存失败：${ne(o)}。输入已保留，请检查字段后重试。`)}},children:n.state==="historical"?e.jsx("p",{children:He(n.hardware)}):e.jsxs("div",{className:"capacity-operation",children:[e.jsxs("details",{children:[e.jsx("summary",{children:"当前 / 最后上报配置"}),e.jsx("p",{children:He(n.hardware)}),e.jsxs("p",{children:["配置来源：",on(n.hardware_source),"；配置备注：",M(n.hardware?.note)]})]}),e.jsx("p",{className:"notice",children:"仅保存本次修改的非空字段；留空保留原值。内存以 GiB 输入、按字节保存，不是采购标称容量。新声明仅向后生效，不回写历史快照。"}),e.jsx("p",{className:"hint",children:"主机 ID 仅在人工确认属于同一物理机器时填写相同值，不按机器名称合并；同机多个 Worker 不自动代表多倍产能。"}),e.jsx("div",{className:"profile-form",children:Wr.map(({key:a,label:o,maxLength:l})=>e.jsxs("label",{className:"field",children:[e.jsx("span",{children:o}),e.jsx("input",{name:a,type:a==="memory_total_bytes"?"number":"text",min:a==="memory_total_bytes"?"0.000001":void 0,step:a==="memory_total_bytes"?"any":void 0,maxLength:l,placeholder:["model_version","environment_id"].includes(a)?"填写固定版本，勿用 latest / main / unknown":"留空保留现值",value:s[a]||"",onChange:p=>{i({...s,[a]:p.target.value}),r.invalidateEstimate("机器配置输入已更改；请保存后重新计算，未保存内容不会进入测算。")}})]},a))})]})})}function Ci({detail:n,controller:r,onClose:t}){const[s,i]=m.useState({accepted:A(n.review?.accepted)?String(n.review.accepted):"",source:n.review?.source==="standard"?"standard":"business",benchmark_id:n.review?.benchmark_id||"",note:n.review?.note||""}),a=(o,l)=>{i({...s,[o]:l}),r.invalidateEstimate("人工验收输入已变更；未保存内容不会进入测算。")};return e.jsx(re,{title:`人工验收 · ${n.job_id}`,className:"capacity-page",onClose:t,submitLabel:"保存人工标记",onSubmit:async()=>{const o=Ni(s);try{await r.saveReview(n.job_id,o)}catch(l){throw Error(`保存失败：${ne(l)}`)}},children:e.jsxs("div",{className:"review-form",children:[e.jsxs("p",{children:["任务 ",n.job_id,"；原采集来源：",de(n.source),"。"]}),e.jsxs("div",{className:"review-fields",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"人工合格产物数量（留空为未验收）"}),e.jsx("input",{name:"accepted",type:"number",min:"0",step:"1",value:s.accepted,onChange:o=>a("accepted",o.target.value)})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"人工样本标签"}),e.jsxs("select",{name:"source",value:s.source,onChange:o=>a("source",o.target.value),children:[e.jsx("option",{value:"business",children:"业务样本"}),e.jsx("option",{value:"standard",children:"标准样本（人工声明）"})]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"标准场景编号（标准样本请填写）"}),e.jsx("input",{name:"benchmark_id",maxLength:100,value:s.benchmark_id,onChange:o=>a("benchmark_id",o.target.value)})]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"验收备注 / 固定条件说明"}),e.jsx("textarea",{name:"note",rows:2,maxLength:500,value:s.note,onChange:o=>a("note",o.target.value)})]}),e.jsx("p",{className:"notice",children:"此操作只保存人工声明，不会自动确认技术规格、缓存条件或标准测试通过；不会将历史记录补写为完整采集证据。"})]})})}function Mi({confirmation:n,onClose:r}){return e.jsx(re,{title:`确认受控补采 · ${n.detail.job_id}`,className:"capacity-page",onClose:r,submitLabel:"确认本批补采",onSubmit:n.submit,children:e.jsxs("div",{className:"capacity-operation",children:[e.jsxs("p",{className:"notice",children:["任务 ",n.detail.job_id,"；本批偏移 ",n.offset,"，最多处理 4 个可信最终产物。"]}),e.jsx("p",{children:"补采仅添加成品尺寸证据，不修改技术资格、原生成参数、人工合格量或标准标签。最终清单由服务端核验；不会扫描目录，也不会从请求猜测尺寸。"}),e.jsxs("details",{children:[e.jsx("summary",{children:"本页已记录的最终产物（最终以服务端可信清单为准）"}),e.jsx("pre",{children:M(n.detail.outputs)})]})]})})}function Ei({detail:n,controller:r,onConfirm:t}){const[s,i]=m.useState(0),[a,o]=m.useState(""),[l,p]=m.useState(!1),d=m.useRef(!0),c=m.useRef(!1),g=m.useRef(0);m.useEffect(()=>(d.current=!0,()=>{d.current=!1}),[]);const u=async(y,j)=>{if(!d.current||!r.probeCurrent(j)||g.current!==y)throw Error("证据页面或批次已变化，请关闭后重新打开。");if(c.current)throw Error("正在补采，请勿重复提交。");c.current=!0,p(!0),o("正在补采本批成品尺寸…"),r.invalidateEstimate("成品尺寸正在补采，旧测算已清除。");try{const w=await r.probe(n.job_id,y);if(!d.current)return;g.current=w.next_offset,i(w.next_offset),o(`本批处理 ${$(w.processed)} 个，成功记录尺寸 ${$(w.recorded)} 个；可信最终产物共 ${$(w.total)} 个。${w.next_offset===null?"补采已完成，刷新看板查看结果。":"尚有后续产物，请点击继续补采；刷新看板查看结果。"}`)}catch(w){const v=`补采失败：${ne(w)}${w instanceof Hr&&w.status===409?"。没有可信最终产物记录，不能猜测成品尺寸。":""}`;throw d.current&&o(v),Error(v)}finally{c.current=!1,d.current&&p(!1)}};return e.jsxs("div",{className:"output-probe",children:[e.jsx("p",{className:"hint",children:"仅按可信最终产物清单补采，每次最多 4 个；不会从输入素材或请求参数猜测尺寸。"}),e.jsx("button",{type:"button",disabled:l||s===null,onClick:()=>{if(c.current||s===null||!d.current)return;const y=s,j=r.probeVersion();t({detail:n,offset:y,submit:()=>u(y,j)})},children:s===null?"补采已完成":s>0?"继续补采成品尺寸":"补采成品尺寸"}),e.jsx("p",{className:"hint",role:"status",children:a})]})}function Pi({detail:n,report:r,controller:t,onReview:s,onProbe:i}){const[a,o]=m.useState(!1);return e.jsxs("details",{className:"evidence","data-job-id":n.job_id,onToggle:l=>{l.currentTarget.open&&o(!0)},children:[e.jsxs("summary",{children:[e.jsx("strong",{children:n.job_id}),e.jsx("span",{className:"badge",children:de(n.source)}),e.jsx("span",{children:` ${Pn[n.status]||n.status} / ${n.capability} / ${An(n.worker_id,n.worker_name,r.workers,r.groups)} / ${Ae(n.created_at)}`})]}),e.jsx("div",{className:"evidence-content",children:a&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["任务 runtime：",Z(n.runtime_seconds),"；占机：",Z(n.occupied_seconds),"；原分组：",M(n.group_id)]}),e.jsx(dn,{values:n.warnings}),e.jsx("div",{className:"f-grid3",children:[["输入素材",ln(n).join(" / ")],["生成参数",cn(n,!0)],["技术与人工口径","技术资格以原采集证据及服务端校验为准；尺寸补采与人工标签不修改它。"]].map(([l,p])=>e.jsxs("div",{children:[e.jsx("h3",{children:l}),e.jsx("p",{children:p})]},l))}),e.jsx(en,{title:"执行尝试（包含重试）",value:n.attempts}),e.jsx("h3",{children:"实际输出证据"}),n.outputs?.length?e.jsx(Tn,{headers:["产物标识","类型","实际尺寸","视频时长","技术记录"],children:n.outputs.map((l,p)=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("span",{children:l.key||l.id||"未记录"})}),e.jsx("td",{children:e.jsx("span",{children:M(l.kind)})}),e.jsx("td",{children:e.jsx("span",{children:oi(l)})}),e.jsx("td",{children:e.jsx("span",{children:Z(l.duration)})}),e.jsx("td",{children:e.jsx("span",{children:l.valid===!0?"采集记录标记有效":l.valid===!1?"未通过 / 待确认":"未记录"})})]},p))}):e.jsx("p",{className:"notice",children:"最终产物清单未记录；不能按请求猜测，也不按零产物处理。"}),e.jsx(en,{title:"实际输出原始证据",value:n.outputs}),e.jsxs("p",{children:["人工合格数量：",$(n.review?.accepted),"；样本标签：",ui(n),"；标准场景编号：",M(n.review?.benchmark_id),"；备注：",M(n.review?.note)]}),e.jsx(Dr,{resolution:n.output_resolution}),e.jsx(en,{title:"成品尺寸原始证据",className:"output-resolution-raw",value:{output_resolution:n.output_resolution,recovered_outputs:n.recovered_outputs}}),n.status==="done"&&e.jsx(Ei,{detail:n,controller:t,onConfirm:i}),["captured","standard"].includes(n.source)?e.jsx("button",{className:"review-open",type:"button",onClick:()=>s(n),children:"人工验收 / 样本标签"}):e.jsx("p",{className:"hint",children:"历史任务不能补写为完整采集证据，不提供采集验收表单。"})]})})]})}function qi({controller:n,onReview:r,onProbe:t}){const s=n.getSnapshot(),{report:i,evidence:a,filters:o,ready:l}=s,p=s.mounted.has("evidence")&&i!==null,d=!l||a.busy||a.failed||!p;return e.jsxs("section",{"aria-labelledby":"evidence-heading",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{id:"evidence-heading",children:"任务证据与人工标记"}),e.jsx("span",{id:"detail-count",className:"hint",children:p&&(a.failed?"筛选未完成":a.busy?"":`当前 ${a.records.length} / 总计 ${$(a.total)} 条；聚合不受分页截断`)})]}),e.jsx("p",{className:"hint pad",children:"明细每页最多 100 条。人工验收 / 标准样本是人工声明，不等于系统自动验证通过；历史记录不可补写为完整采集证据。"}),e.jsx("div",{id:"evidence-filters",children:p&&e.jsxs("div",{className:"evidence-filters",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"独立原分组（按真实 group_id）"}),e.jsxs("select",{id:"evidence-group",disabled:!l,value:o.group,onChange:c=>n.filter({group:c.target.value}),children:[e.jsx("option",{value:"",children:"全部原分组"}),i.groups.map(c=>e.jsx("option",{value:c.id,children:`${Pe(c)} / ${An(c.worker_id,c.worker_name,i.workers,i.groups)} / ${de(c.source)} / ${c.config_id||"配置未知"} / ${c.id}`},c.id))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"任务状态"}),e.jsxs("select",{id:"evidence-status",disabled:!l,value:o.status,onChange:c=>n.filter({status:c.target.value}),children:[e.jsx("option",{value:"",children:"全部状态"}),[["done","已完成"],["error","失败"],["canceled","已取消"],["queued","排队中"],["running","运行中"]].map(([c,g])=>e.jsx("option",{value:c,children:g},c))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"采集来源"}),e.jsxs("select",{id:"evidence-source",disabled:!l,value:o.source,onChange:c=>n.filter({source:c.target.value}),children:[e.jsx("option",{value:"",children:"全部来源"}),["historical","captured","standard"].map(c=>e.jsx("option",{value:c,children:de(c)},c))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"每页最多 100 条"}),e.jsx("select",{id:"evidence-size",disabled:!l,value:o.size,onChange:c=>n.filter({size:Number(c.target.value)}),children:[100,50,25,10].map(c=>e.jsxs("option",{value:c,children:[c," 条 / 页"]},c))})]})]})}),e.jsx("p",{id:"evidence-state",className:"hint pad",role:"status",hidden:!a.state,children:a.state}),e.jsx("div",{id:"details",children:p&&!a.busy&&!a.failed&&(a.records.length?a.records.map(c=>e.jsx(Pi,{detail:c,report:i,controller:n,onReview:r,onProbe:t},c.job_id)):e.jsx("p",{className:"empty",children:"当前页没有任务证据。可立即刷新，或返回上一页。"}))}),e.jsxs("div",{className:"pager",children:[e.jsx("button",{id:"previous",disabled:d||a.start===0,onClick:()=>n.page(-1),children:"上一页"}),e.jsx("span",{id:"page-note",className:"hint",children:p&&!a.busy&&!a.failed&&`第 ${Math.floor(a.start/a.size)+1} 页`}),e.jsx("button",{id:"next",disabled:d||a.start+a.size>=a.total,onClick:()=>n.page(1),children:"下一页"})]})]})}function Ri(n,r){const t=n.workers.filter(he);return t.find(s=>s.id===r)?.id||t.find(s=>pn(n,s.id).length)?.id||t[0]?.id||""}function sr(n,r,t){const s=pn(n,r);return{id:t,mode_id:ge.find(i=>s.some(a=>i.capabilities.includes(a.capability)))?.id||"",quantity:""}}function Li(n,r,t){const[s,i]=m.useState({report:null,worker:"",demands:[],next:1}),[a,o]=m.useState("8"),[l,p]=m.useState("");if(t&&r&&r!==s.report){const f=Ri(r,s.worker);i({report:r,worker:f,demands:[sr(r,f,s.next)],next:s.next+1})}const d=r?pn(r,s.worker):[],c=()=>n.invalidateEstimate(),g=f=>{r&&(i({...s,worker:f,demands:[sr(r,f,s.next)],next:s.next+1}),c())},u=(f,h)=>{i({...s,demands:s.demands.map(x=>x.id===f?{...x,...h}:x)}),c()},y=f=>{i({...s,demands:s.demands.filter(h=>h.id!==f)}),c()},j=f=>{const h=ge.find(x=>x.id===f);return!!(h&&d.some(x=>h.capabilities.includes(x.capability)))};return{inputs:s,groups:d,hours:a,price:l,worker:g,update:u,remove:y,available:j,add:()=>{if(!n.getSnapshot().ready)return;const f=ge.find(h=>!s.demands.some(x=>x.mode_id===h.id)&&j(h.id));f&&(i({...s,demands:[...s.demands,{id:s.next,mode_id:f.id,quantity:""}],next:s.next+1}),c())},submit:async()=>{n.invalidateEstimate("正在计算…");const f=n.getSnapshot().snapshot;try{if(!r||!n.getSnapshot().ready||!f)throw Error("请先点击立即刷新并成功读取证据。");await n.estimate(_i(r,f.range,s.worker,a,l,s.demands))}catch(h){n.estimateFailure(ne(h))}},setHours:f=>{o(f),c()},setPrice:f=>{p(f),c()}}}function Ii(n){const[r,t]=m.useState("");return m.useEffect(()=>{if(!n)return;const s=URL.createObjectURL(new Blob([$i(n)],{type:"text/csv;charset=utf-8"}));return t(s),()=>URL.revokeObjectURL(s)},[n]),n?r:""}function Ai({saved:n,report:r}){const{result:t,payload:s,groups:i}=n;return e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"warn",children:"成功任务处理参考，不是合格产物日产量或采购承诺"}),e.jsxs("p",{className:"result-number",children:["参考机器数：",$(t.machines)," 台"]}),e.jsxs("p",{children:["每日所需参考运行时间：",Z(t.total_seconds)]}),e.jsxs("p",{children:["单机每日可用容量时间：",Z(t.daily_capacity_seconds)]}),e.jsxs("p",{children:["整机采购小计：",A(t.price_total)?`¥${$(t.price_total)}`:"未计价"]}),e.jsx(Tn,{headers:["业务模式","每日需求","平均任务耗时","单机场景参考日处理量"],children:t.lines.map((a,o)=>{const l=kn(i.find(p=>p.id===a.group_id)?.capability);return e.jsxs("tr",{children:[e.jsx("td",{className:"wide",children:e.jsx("span",{children:l?`${l.type} · ${l.label}`:"业务模式"})}),e.jsx("td",{children:e.jsxs("span",{children:[$(a.quantity)," 任务/天"]})}),e.jsx("td",{children:e.jsx("span",{children:Z(a.seconds_per_unit)})}),e.jsx("td",{children:e.jsxs("span",{children:[$(a.daily_units)," 任务/天"]})})]},o)})}),e.jsx("p",{className:"hint",children:"每个模式只参考自动选中的一个实测分组，不保证任意模型、尺寸或缓存规格的产能。"}),e.jsxs("details",{children:[e.jsx("summary",{children:"计算依据"}),e.jsx("h3",{children:"警告与覆盖限制"}),e.jsx(dn,{values:t.warnings}),e.jsx("p",{className:"hint",children:"仅按成功任务平均 runtime 估算；不含完整失败、准备、重试或质量损耗。按同一电脑、配置和来源选择具体原分组，不合并均值。"}),e.jsx("p",{className:"hint",children:"台数 = 向上取整〔各模式任务数量 × 平均任务耗时之和 ÷（小时 × 3600 × 可用时间比例 × 生产容量比例）〕。容量预留不是 GPU 利用率；业务组合与模型切换可能增加损耗，不保证峰值 SLA。"}),s.demands.map(a=>{const o=i.find(l=>l.id===a.group_id);return o&&e.jsxs("div",{children:[e.jsx("h3",{children:kn(o.capability)?.label||"业务模式"}),e.jsxs("p",{children:[Pr(o)," / ",M(o.spec_key),"：",de(o.source),"；样本"," ",$(o.samples),"；",$(qn(o))," 天；配置 ",M(o.config_id),o.source==="standard"?`；标准场景编号 ${M(o.benchmark_id)}`:""]}),e.jsx(Fr,{g:o})]},o.id)}),e.jsx("h3",{children:"计算假设"}),e.jsx("pre",{children:M(t.assumptions)}),e.jsxs("p",{className:"hint",children:["Worker ID：",s.worker_id,"；当前在线仅为本次数据快照，不承诺未来状态；当前配置仅作清单参考：",He(r.workers.find(a=>a.id===s.worker_id)?.hardware),"；时间：全部历史 至 ",Ae(s.to),"；",s.hours," 小时 / 可用"," ",$(s.availability*100),"% / 生产容量 ",$(s.utilization*100),"%"]})]})]})}function Ti({controller:n}){const r=n.getSnapshot(),{report:t,ready:s,estimate:i,estimateError:a,estimateNote:o,estimating:l}=r,p=r.mounted.has("purchase")&&t!==null,d=Li(n,t,p),{inputs:c,groups:g}=d,u=m.useRef(null),y=Ii(i),j=t?.workers.filter(he)||[],w=!s||!g.length||!c.demands.length||l,v=s?j.some(f=>f.id===c.worker)?g.length?"":"这台电脑暂无这些模式的成功耗时记录，请换一台电脑。":"当前没有在线电脑，请稍后刷新。":"请先刷新并读取电脑状态。";return e.jsxs("div",{className:"procurement",children:[e.jsxs("section",{className:"section",children:[e.jsx("div",{className:"section-head",children:e.jsx("h2",{children:"每日多场景需求"})}),e.jsxs("form",{id:"estimate-form",className:"pad",onSubmit:f=>{f.preventDefault(),f.currentTarget.reportValidity()&&d.submit()},children:[e.jsxs("div",{className:"form-grid",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"电脑显卡配置选择"}),e.jsx("select",{id:"estimate-worker",required:!0,disabled:!s,value:c.worker,onChange:f=>{s&&d.worker(f.target.value)},children:p&&(j.length?j.map(f=>e.jsx("option",{value:f.id,children:f.name||"未命名电脑"},f.id)):e.jsx("option",{value:"",children:"暂无在线电脑"}))})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"每日计划生产小时"}),e.jsx("input",{id:"hours",type:"number",min:"0.1",max:"24",step:"0.1",value:d.hours,required:!0,onChange:f=>d.setHours(f.target.value)})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"整机报价（元，可选）"}),e.jsx("input",{id:"price",type:"number",min:"0",step:"0.01",placeholder:"未填写则不计价格",value:d.price,onChange:f=>d.setPrice(f.target.value)})]})]}),e.jsx("p",{id:"mode-note",className:"notice",children:"按成功任务平均执行耗时参考，不是合格产物日产量或采购承诺。"}),e.jsx("p",{className:"hint",children:"固定按 100% 可用时间、75% 生产容量计算（预留 25% 应对波动）；每日数量按任务/天填写。"}),e.jsxs("div",{children:[e.jsx("h3",{children:"每日需求"}),e.jsx("p",{id:"demand-note",className:"hint",role:"status",children:p&&v}),e.jsx("div",{id:"demands",children:p&&c.demands.map(f=>e.jsxs("div",{className:"demand",children:[e.jsx("select",{className:"demand-group",required:!0,"aria-label":"需求业务模式",disabled:!s||!f.mode_id,value:f.mode_id,onChange:h=>{s&&d.update(f.id,{mode_id:h.target.value})},children:["生图模式","生视频模式"].map(h=>e.jsx("optgroup",{label:h,children:ge.filter(x=>x.type===h).map(x=>e.jsxs("option",{value:x.id,disabled:!d.available(x.id)||c.demands.some(k=>k.id!==f.id&&k.mode_id===x.id),children:[x.type," · ",x.label]},x.id))},h))}),e.jsx("input",{className:"demand-quantity",type:"number",min:"0.01",step:"any",required:!0,placeholder:"任务/天","aria-label":"每日需求数量（任务/天）",disabled:!s||!f.mode_id,value:f.quantity,onChange:h=>d.update(f.id,{quantity:h.target.value})}),e.jsx("button",{type:"button",onClick:()=>d.remove(f.id),children:"移除"})]},f.id))}),e.jsx("button",{id:"add-demand",type:"button",disabled:!p||!s||!ge.some(f=>!c.demands.some(h=>h.mode_id===f.id)&&d.available(f.id)),onClick:d.add,children:"增加场景"})]}),e.jsx("button",{id:"estimate-submit",className:"primary",type:"submit",disabled:!p||w,children:"计算机器需求"})]})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"测算结果与依据"}),e.jsx("button",{id:"export-estimate",disabled:!i||!y,onClick:()=>{n.getSnapshot().estimate&&u.current?.click()},children:"导出测算 CSV"}),e.jsx("a",{ref:u,hidden:!0,href:y||void 0,download:"capacity-estimate.csv",children:"下载测算 CSV"})]}),e.jsx("div",{id:"estimate-error",className:"error",role:"alert",hidden:!a,children:a}),e.jsx("div",{id:"estimate-result",className:"pad","aria-live":"polite",children:i&&t?e.jsx(Ai,{saved:i,report:t}):e.jsx("p",{className:"muted",children:o})})]})]})}const Ne=[{id:"machines",label:"机器产能"},{id:"scenarios",label:"场景对比"},{id:"purchase",label:"采购测算"}];function Di(n){const{controller:r,state:t}=ri(n),{report:s,ready:i,revision:a,mounted:o}=t,[l,p]=m.useState(!1),[d,c]=m.useState(""),[g,u]=m.useState(null),[y,j]=m.useState(null),[w,v]=m.useState(null),f=m.useRef(null),h=m.useRef(null),x=m.useRef([]),[k,L]=m.useState(!1);m.useEffect(()=>{k&&t.tab==="purchase"&&(h.current?.focus(),L(!1))},[k,t.tab]);const T=(b="")=>{r.getSnapshot().ready&&(r.showEvidence(b),f.current?.scrollIntoView({block:"start"}))},_=o.has("scenarios")&&s?mi(s.groups):[],N=_.some(([b])=>b===d)?d:_[0]?.[0]||"";s&&o.has("scenarios")&&d!==N&&c(N);const E=s?.overview||{};return e.jsxs("main",{id:"main-content",className:"page capacity-page",tabIndex:-1,children:[e.jsxs("header",{className:"page-header card",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"产能评估"}),e.jsx("p",{className:"subtitle",children:"真实任务与独立规格分组，查看机器产能、证据和每日需求。"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{id:"refresh-state",className:"state",role:"status",children:t.refreshState})})]}),e.jsx("div",{className:"header-actions",children:e.jsx("button",{id:"refresh",type:"button",onClick:()=>{r.load()},children:"立即刷新"})})]}),e.jsx("div",{id:"error",className:"error",role:"alert",hidden:!t.error,children:t.error}),e.jsx("div",{id:"write-status",className:"write-status",role:"status",hidden:!t.writeStatus,children:t.writeStatus}),e.jsx("div",{className:"tabs",role:"tablist","aria-label":"产能评估视图",children:Ne.map((b,R)=>e.jsx("button",{id:`tab-${b.id}`,role:"tab",type:"button",ref:D=>{x.current[R]=D},"aria-selected":t.tab===b.id,"aria-controls":`panel-${b.id}`,tabIndex:t.tab===b.id?0:-1,onClick:()=>r.activate(b.id),onKeyDown:D=>{const z=D.key==="ArrowRight"?(R+1)%Ne.length:D.key==="ArrowLeft"?(R+Ne.length-1)%Ne.length:D.key==="Home"?0:D.key==="End"?Ne.length-1:void 0;if(z===void 0)return;const S=Ne[z];S&&(D.preventDefault(),r.activate(S.id),x.current[z]?.focus())},children:b.label},b.id))}),e.jsx("div",{id:"capacity-stats",className:"metrics","aria-label":"产能数据概览",children:s&&e.jsx(_n,{items:[["当前在线电脑",s.workers.filter(he).length],["真实任务记录",E.tasks],["独立原规格组",s.groups.length],["产物清单未知任务",E.unknown_outputs]]})}),e.jsxs("section",{id:"panel-machines",role:"tabpanel","aria-labelledby":"tab-machines",tabIndex:0,hidden:t.tab!=="machines",children:[e.jsxs("section",{id:"machine-summary","aria-label":"在线机器业务简览",children:[e.jsxs("div",{className:"summary-toolbar",children:[e.jsx("h2",{id:"online-count",children:s?`当前在线 ${s.workers.filter(he).length} 台`:"当前在线 — 台"}),e.jsxs("label",{className:"offline-toggle",children:[e.jsx("input",{id:"include-offline",type:"checkbox",checked:l,disabled:!i,onChange:b=>{i&&p(b.target.checked)}}),"包含离线"]})]}),e.jsx("p",{className:"summary-note hint",children:"在线状态是当前状态；业务为全部历史记录中跑过的业务，不代表当前均可执行。平均生成时间仅计成功任务执行耗时，不含排队，非纯 GPU 耗时，也不是合格日产能。同一业务的任务规格、模型或采样条件不同，不能直接按耗时做性能排名。"}),e.jsx("div",{id:"summary-machines",children:o.has("machines")&&s&&e.jsx(fi,{report:s,ready:i,includeOffline:l,onProfile:u,onEvidence:T},`${a}-${l}`)}),e.jsxs("div",{className:"matrix-actions",children:[e.jsx("button",{type:"button",id:"open-purchase",onClick:()=>{r.activate("purchase"),L(!0)},children:"进入多模式采购测算"}),e.jsx("button",{type:"button",id:"open-evidence",disabled:!i,onClick:()=>T(),children:"展开全部任务证据"})]})]}),e.jsxs("details",{id:"technical-details",className:"section advanced",open:t.technicalOpen,onToggle:b=>r.technical(b.currentTarget.open),children:[e.jsx("summary",{children:"详细统计与机器配置"}),e.jsx(gi,{report:s,mounted:o.has("technical"),onProfile:u},a)]})]}),e.jsx("section",{id:"panel-scenarios",role:"tabpanel","aria-labelledby":"tab-scenarios",tabIndex:0,hidden:t.tab!=="scenarios",children:e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"同场景证据对比"}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"业务 / 精确规格 / 来源"}),e.jsx("select",{id:"scenario-filter",disabled:!i,value:N,onChange:b=>{i&&c(b.target.value)},children:o.has("scenarios")&&(_.length?_.map(([b,R])=>e.jsx("option",{value:b,children:R},b)):e.jsx("option",{value:"",children:"暂无场景"}))})]})]}),e.jsx("p",{className:"notice hint",children:"只并列相同业务、规格键与证据来源。历史配置、模型版本或缓存条件缺失时，不视为受控跑分；未测试的配置不能按显存或价格推算。"}),e.jsx("div",{id:"scenario-groups",children:o.has("scenarios")&&s&&e.jsx(Or,{groups:s.groups.filter(b=>Ir(b)===N),report:s},`${a}-${N}`)})]})}),e.jsx("section",{id:"panel-purchase",ref:h,role:"tabpanel","aria-labelledby":"tab-purchase",tabIndex:0,hidden:t.tab!=="purchase",children:e.jsx(Ti,{controller:r})}),e.jsxs("details",{id:"task-evidence",ref:f,className:"section advanced",open:t.evidenceOpen,onToggle:b=>r.evidenceOpen(b.currentTarget.open),children:[e.jsx("summary",{children:"任务证据与人工标记"}),e.jsx(qi,{controller:r,onReview:j,onProbe:v},a)]}),g&&e.jsx(zi,{worker:g,controller:r,onClose:()=>u(null)},g.id),y&&e.jsx(Ci,{detail:y,controller:r,onClose:()=>j(null)},y.job_id),w&&e.jsx(Mi,{confirmation:w,onClose:()=>v(null)})]})}const Fi=`:root {\r
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
`,Oi=`.permissions-page .permissions-grid {\r
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
`,Ui=`/* 页面样式只作用于产能主区及产能对话框，不覆盖共享侧栏。 */\r
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
`,Wi=`@scope (.admin-page) {
${Fi.replace(/:root\b/g,":scope").replace(/^body \{/m,":scope {").replace(/body\.admin-page\b/g,":scope").replace(/\.admin-page\b/g,":scope")}
${Oi.replace(/\.permissions-page\b/g,":scope.permissions-page")}
${Ui}
}`;function mn({page:n,children:r}){const t=Jr();return m.useLayoutEffect(()=>{const s=document.body;return s.dataset.choukaPage=n,s.dataset.workspace=n,()=>{s.dataset.choukaPage===n&&delete s.dataset.choukaPage,s.dataset.workspace===n&&delete s.dataset.workspace}},[n]),m.useEffect(()=>{let s=!0;return t.auth.me().then(()=>{if(!s)return;const i=document.getElementById("account");i&&!i.childElementCount&&t.auth.mountAccount(i);for(const a of document.querySelectorAll("#workspace-nav a"))new URL(a.href).pathname===location.pathname?a.setAttribute("aria-current","page"):a.removeAttribute("aria-current")}).catch(()=>{}),()=>{s=!1}},[t,n]),e.jsxs(e.Fragment,{children:[e.jsx("style",{children:Wi}),e.jsx($t,{page:n,workspace:!0,children:r})]})}function Ki(){return e.jsx(mn,{page:"controller",children:n=>e.jsx(ea,{...n})})}function Ji(){return e.jsx(mn,{page:"permissions",children:n=>e.jsx(ya,{...n})})}function Xi(){return e.jsx(mn,{page:"costs",children:n=>e.jsx(Ua,{...n})})}function Yi(){return e.jsx(mn,{page:"capacity",children:n=>e.jsx(Di,{...n})})}export{Yi as CapacityWorkspace,Ki as ControllerWorkspace,Xi as CostsWorkspace,Ji as PermissionsWorkspace};
