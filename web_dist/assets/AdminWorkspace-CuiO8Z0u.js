import{HttpClient as Bt,reactExports as m,errorMessage as ne,jsxRuntimeExports as e,ApiError as Ht}from"./http-DOrwCtZg.js";import{createSessionService as Vt,userSchema as Gt,LoadingRequest as Kt,jsonSchema as H,useWorkspaceRuntime as Jt}from"./main-CG6bNhnu.js";import{object as q,number as V,boolean as Y,_enum as Ve,looseObject as G,literal as re,string as C,array as O,unknown as it,union as pe,discriminatedUnion as Xt,NEVER as Yt,_null as rt,record as Sn}from"./monitor-alerts-SRWMPPW3.js";import{reactDomExports as Zt}from"./index-BgVeoShv.js";const Qt=q({maintenance_active:Y().optional(),comfy_online:Y().optional(),sandbox:Y().optional()}),es=q({online_users:V().finite().nonnegative()}),ns=q({user:Gt});function ts({fetcher:n=window.fetch.bind(window),origin:t=window.location.origin,onExpired:s,onSandbox:a,onDenied:r=()=>{}}){let i=!1;const o=async(g,u)=>{const y=await n(g,u);return i||(y.headers.get("X-H3Card-Sandbox")==="local-copy"&&a(),y.status===403&&r()),y},l=new Bt(o,t,()=>{i||s()});let p,d;const c=new Set;return{http:l,session:Vt(l),health(){if(p)return p;const g=new AbortController;c.add(g);const u=window.setTimeout(()=>g.abort(),4e3);return p=l.read("/api/health",Qt,{cache:"no-store",signal:g.signal}).then(y=>(!i&&y.sandbox===!0&&a(),y)).finally(()=>{window.clearTimeout(u),c.delete(g),p=void 0}),p},presence(){return d??=l.json("/api/auth/presence","POST").then(g=>es.parse(g)).finally(()=>{d=void 0}),d},async savePhone(g){const u=g.trim();if(!/^1[3-9][0-9]{9}$/.test(u))throw new Error("请输入有效的 11 位中国大陆手机号");const y=ns.parse(await l.json("/api/auth/phone","POST",{phone:u})).user;if(!y.phone)throw new Error("手机号尚未保存，请重试");return y},async changePassword(g,u,y){if(u.length<8)throw new Error("新密码至少需要 8 位");if(u!==y)throw new Error("两次输入的新密码不一致");await l.json("/api/auth/password","POST",{current_password:g,new_password:u})},dispose(){i=!0,c.forEach(g=>g.abort()),c.clear(),l.invalidate()}}}function ss(n,t){return!t&&n.phone===""}function Fn(n){return n==="admin"?null:n==="monitor"?"/monitor":"/"}function Je(n){return n.maintenance_active!==!0?"clear":n.comfy_online===!0?"partial":"blocked"}function as(n){const[t,s]=m.useState(null),[a,r]=m.useState(!1),[i,o]=m.useState(""),[l,p]=m.useState(0);m.useEffect(()=>{let u=!1,y=!1,j=()=>{};const w=()=>document.hidden?new Promise(x=>{const k=()=>{document.hidden&&!u||(document.removeEventListener("visibilitychange",k),x())};document.addEventListener("visibilitychange",k),j=()=>{document.removeEventListener("visibilitychange",k),x()}}):Promise.resolve(),v=()=>{u||(u=!0,h.dispose(),s(null),o("登录已失效，请重新登录"),n("/login"))},f=x=>{const k=Fn(x.role);return k?(u=!0,h.dispose(),s(null),n(k),!1):!0},h=ts({onExpired:v,onSandbox:()=>{u||r(!0)},onDenied:()=>{u||y||(y=!0,h.session.me().then(x=>{!u&&f(x.user)&&s(k=>k&&{...k,user:x.user,localTest:x.local_test===!0})}).catch(()=>{}).finally(()=>{y=!1}))}});return s(null),o(""),r(!1),(async()=>{try{const x=await h.session.me();if(u||!f(x.user)||(await w(),u))return;const k=await h.health().catch(()=>({}));u||s({user:x.user,localTest:x.local_test===!0,services:h,initialHealth:k})}catch(x){u||o(ne(x))}})(),()=>{u=!0,j(),h.dispose()}},[l,n]);const d=m.useCallback(()=>p(u=>u+1),[]),c=m.useCallback(u=>{const y=Fn(u.role);y?(t?.services.dispose(),s(null),n(y)):s(j=>j&&{...j,user:u})},[t,n]),g=m.useCallback(()=>{t?.services.dispose(),s(null),o("登录已失效，请重新登录"),n("/login")},[t,n]);return{session:t,sandbox:a,error:i,retry:d,updateUser:c,expire:g}}function is(n,t,s=!0){const[a,r]=m.useState(null),[i,o]=m.useState(()=>Je(t)),[l,p]=m.useState(()=>Je(t)!=="clear");return m.useEffect(()=>{if(!s)return;let d=!0,c=Je(t),g;const u=()=>{g=window.setTimeout(()=>{d&&p(!1)},5e3)};c==="partial"&&u();const y=()=>{document.hidden||n.presence().then(h=>{d&&r(h.online_users)}).catch(()=>{})},j=()=>{document.hidden||n.health().then(h=>{if(!d)return;const x=Je(h);x!==c&&(c=x,window.clearTimeout(g),o(x),p(x!=="clear"),x==="partial"&&u())}).catch(()=>{})};y();const w=window.setInterval(y,3e4),v=window.setInterval(j,5e3),f=()=>{document.hidden||(y(),j())};return document.addEventListener("visibilitychange",f),()=>{d=!1,window.clearTimeout(g),window.clearInterval(w),window.clearInterval(v),document.removeEventListener("visibilitychange",f)}},[n,t,s]),{online:a,maintenance:i,maintenanceVisible:l}}const rs={dashboard:"M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1",costs:"M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2M14 11h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-2.5M12 17v1m0 -8v1",capacity:"M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14M4 20h14",permissions:"M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0M8 11v-4a4 4 0 1 1 8 0v4",teams:"M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0 -3 -3.85",refresh:"M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4",chevron:"M9 6l6 6l-6 6",external:"M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6M11 13l9 -9M15 4h5v5",logout:"M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2M9 12h12l-3 -3M18 15l3 -3",check:"M5 12l4 4l10 -10",info:"M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0 -18M12 11v6M12 7h.01",alert:"M12 9v4M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0M12 16h.01"};function Oe({name:n,className:t="",...s}){return e.jsx("svg",{className:`icon ${t}`,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.7,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",...s,children:e.jsx("path",{d:rs[n]})})}const os="_application_gguf9_1",ls="_workspace_gguf9_12",cs="_sandbox_gguf9_15",ds="_navigation_gguf9_18",ps="_accountMenu_gguf9_225",ms="_infoRow_gguf9_281",us="_dialog_gguf9_295",hs="_maintenance_gguf9_361",xs="_notifications_gguf9_409",fs="_notificationItem_gguf9_441",gs="_notificationHeading_gguf9_466",bs="_notificationIcon_gguf9_477",ys="_notificationMessage_gguf9_495",vs="_notificationLabel_gguf9_504",ie={application:os,workspace:ls,sandbox:cs,navigation:ds,accountMenu:ps,infoRow:ms,dialog:us,maintenance:hs,notifications:xs,notificationItem:fs,notificationHeading:gs,notificationIcon:bs,notificationMessage:ys,notificationLabel:vs},js={error:"alert",warning:"alert",success:"check",status:"info"},ws={error:"错误",warning:"警告",success:"成功",status:"提示"},ot=m.createContext({notify:()=>{},registerModal:()=>()=>{}}),lt=()=>m.useContext(ot);function _s({children:n}){const[t,s]=m.useState([]),[a,r]=m.useState([]),i=m.useCallback(p=>(r(d=>[...d,p]),()=>r(d=>d.filter(c=>c!==p))),[]),o=m.useCallback(p=>{const d=typeof p=="string"?{message:p,tone:"status"}:p instanceof Error?{message:p.message,tone:"error"}:{message:p.message,tone:p.tone??"status"};s(c=>c.some(g=>g.message===d.message&&g.tone===d.tone)?c:[...c,d])},[]),l=a.at(-1)??document.body;return e.jsxs(ot.Provider,{value:{notify:o,registerModal:i},children:[n,t.length>0&&Zt.createPortal(e.jsx(ks,{notices:t,dismiss:p=>s(d=>d.filter(c=>c!==p)),clear:()=>s([])}),l)]})}function ks({notices:n,dismiss:t,clear:s}){const a=m.useRef(null);m.useEffect(()=>{const o=a.current;if(o?.isConnected)return o.showPopover?.(),()=>{o.isConnected&&o.hidePopover?.()}},[]);const r=o=>{const l=a.current?.contains(document.activeElement),p=a.current?.parentElement;o(),l&&queueMicrotask(()=>{(a.current?.querySelector("button")??p?.querySelector("[data-operation-status],button")??document.querySelector("main"))?.focus({preventScroll:!0})})},i=["error","warning","success","status"].find(o=>n.some(l=>l.tone===o))??"status";return e.jsxs("section",{id:"admin-notifications","data-tone":i,ref:a,popover:"manual",className:ie.notifications,"aria-label":"操作通知",children:[e.jsxs("div",{className:ie.notificationHeading,children:[e.jsx(Oe,{name:js[i],className:ie.notificationIcon}),e.jsx("strong",{children:"操作通知"}),e.jsx("button",{type:"button","aria-label":"关闭全部通知",onClick:()=>r(s),children:"全部关闭"})]}),n.map(o=>e.jsxs("div",{className:ie.notificationItem,"data-tone":o.tone,children:[e.jsxs("p",{className:ie.notificationMessage,role:o.tone==="error"?"alert":"status","aria-atomic":"true",children:[e.jsx("span",{className:ie.notificationLabel,children:ws[o.tone]}),o.message]}),e.jsx("button",{type:"button","aria-label":`关闭通知：${o.message}`,onClick:()=>r(()=>t(o)),children:"×"})]},`${o.tone}:${o.message}`))]})}function te({title:n,children:t,onClose:s,onSubmit:a,submitLabel:r="确认",className:i="",showFooter:o=!0,dismissible:l=!0,closeLabel:p,id:d}){const c=m.useId(),g=m.useRef(null),u=m.useRef(null),y=m.useRef(!1),j=m.useRef(!1),w=m.useRef(!1),[v,f]=m.useState(!1),[h,x]=m.useState(""),[k]=m.useState(()=>{const N=document.activeElement instanceof HTMLElement?document.activeElement:null;return{element:N,key:N?.dataset.focusKey}}),{registerModal:L}=lt();m.useLayoutEffect(()=>{const N=g.current;if(!N)return;j.current=!0;const E=k.element,b=k.key;N.showModal();const R=L(N);return document.body.classList.add("modal-open"),()=>{j.current=!1,N.querySelectorAll('input[type="password"]').forEach(z=>{z.value=""}),N.open&&N.close(),R();const D=()=>{if(document.querySelector("dialog[open]"))return;document.body.classList.remove("modal-open");const z=b?[...document.querySelectorAll("[data-focus-key]")].find(J=>J.dataset.focusKey===b):null,S=document.querySelector("main");S&&!S.hasAttribute("tabindex")&&(S.tabIndex=-1);const Q=J=>J?.isConnected&&(J.tabIndex>=0||J.hasAttribute("tabindex")||J.isContentEditable)&&!J.closest("[inert],[hidden]")&&!J.matches(':disabled,input[type="hidden"]');(Q(E)?E:Q(z)?z:S)?.focus({preventScroll:!0})};D(),queueMicrotask(D)}},[L,k]),m.useLayoutEffect(()=>{(v||h)&&u.current?.focus({preventScroll:!0})},[v,h]);const T=()=>{y.current||w.current||(w.current=!0,g.current?.querySelectorAll('input[type="password"]').forEach(N=>{N.value=""}),g.current?.open&&g.current.close(),s())},_=N=>{y.current&&(N.preventDefault(),N.stopPropagation())};return e.jsx("dialog",{id:d,ref:g,className:`f-operation-modal admin-dialog ${ie.dialog} ${i}`,"aria-labelledby":c,tabIndex:-1,onCancel:N=>{N.preventDefault(),l&&T()},onClose:N=>{const E=N.currentTarget;if(!(!j.current||w.current||E.open)){if(y.current||!l){E.showModal(),y.current&&u.current?.focus({preventScroll:!0});return}T()}},onClick:N=>{if(N.target!==N.currentTarget||!l)return;const E=N.currentTarget.getBoundingClientRect();(N.clientX<E.left||N.clientX>E.right||N.clientY<E.top||N.clientY>E.bottom)&&T()},onKeyDown:N=>{if(N.stopPropagation(),N.key!=="Tab")return;const E=[...N.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(D=>!D.closest("[inert]")&&!D.hidden).sort((D,z)=>D.compareDocumentPosition(z)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1),b=E[0],R=E.at(-1);if(!b||!R){N.preventDefault(),u.current?.focus();return}N.shiftKey&&(document.activeElement===b||!E.includes(document.activeElement instanceof HTMLElement?document.activeElement:b))?(N.preventDefault(),R.focus()):!N.shiftKey&&(document.activeElement===R||!E.includes(document.activeElement instanceof HTMLElement?document.activeElement:R))&&(N.preventDefault(),b.focus())},children:e.jsxs("form",{"aria-busy":v||void 0,"data-busy":v?"true":void 0,onSubmit:async N=>{N.preventDefault();const E=N.currentTarget;if(!(y.current||!a||!E.reportValidity())){y.current=!0,f(!0),x("");try{await a(E),j.current&&(y.current=!1,T())}catch(b){j.current&&x(`${ne(b)}；输入已保留，可重试。`)}finally{y.current=!1,j.current&&f(!1)}}},children:[e.jsxs("header",{className:"f-dialog-head",children:[e.jsx("h2",{id:c,children:n}),l&&e.jsx("button",{type:"button",className:"close-button","data-cancel":"","aria-label":"关闭弹窗",disabled:v,onClick:T,children:"×"})]}),e.jsxs("div",{className:"f-dialog-body",children:[e.jsx("div",{"data-dialog-content":"",inert:v,onClickCapture:_,onKeyDownCapture:_,onInputCapture:_,onChangeCapture:_,children:t}),e.jsx("p",{ref:u,className:`f-status ${h?"danger":""}`,role:h?"alert":"status",tabIndex:-1,"data-operation-status":"",children:h||(v?"正在提交…":"")})]}),o&&e.jsxs("footer",{className:"f-dialog-foot",children:[e.jsx("button",{type:"button","data-cancel":"",disabled:v,onClick:T,children:p??(a?"取消":"知道了")}),a&&e.jsx("button",{type:"submit",className:"primary",disabled:v,children:v?"正在提交…":r})]})]})})}function Ns({user:n,localTest:t,services:s,expire:a}){const[r,i]=m.useState(!1),[o,l]=m.useState(null),[p,d]=m.useState({}),[c,g]=m.useState(!1),u=m.useRef(!1),y=m.useRef(null),j=m.useRef(null),w=n.display_name?.trim()||n.username,v=()=>{i(!1),y.current?.focus({preventScroll:!0})};return m.useLayoutEffect(()=>{const f=j.current;if(f)if(r){const h=y.current?.getBoundingClientRect();h&&d({left:Math.max(8,Math.min(h.left,window.innerWidth-Math.min(260,window.innerWidth-16)-8)),bottom:Math.max(8,window.innerHeight-h.top+8),maxHeight:Math.max(44,h.top-16)}),f.showPopover?.(),f.querySelector("button")?.focus()}else f.hidePopover?.()},[r]),m.useEffect(()=>{if(!r)return;const f=()=>i(!1),h=x=>{x.target instanceof Node&&!j.current?.contains(x.target)&&!y.current?.contains(x.target)&&f()};return window.addEventListener("resize",f),document.addEventListener("pointerdown",h),()=>{window.removeEventListener("resize",f),document.removeEventListener("pointerdown",h)}},[r]),e.jsx("div",{id:"account",className:"account-bar",children:t?e.jsx("span",{className:"chip",children:"本地测试 · 免登录"}):e.jsxs(e.Fragment,{children:[e.jsxs("button",{ref:y,className:"account-trigger",type:"button","aria-label":`用户菜单：${w}`,"aria-haspopup":"menu","aria-expanded":r,"aria-controls":"account-menu","data-focus-key":"admin-account",onClick:()=>i(f=>!f),onKeyDown:f=>{(f.key==="ArrowDown"||f.key==="ArrowUp")&&(f.preventDefault(),i(!0))},children:[e.jsx("span",{className:"account-avatar","aria-hidden":"true",children:Array.from(w)[0]?.toUpperCase()||"?"}),e.jsx("span",{className:"account-name",children:w})]}),e.jsxs("div",{ref:j,id:"account-menu",className:`account-menu ${ie.accountMenu}`,role:"menu","aria-label":"账号菜单",popover:"auto",hidden:!r,style:p,onToggle:f=>{f.newState==="closed"&&i(!1)},onKeyDown:f=>{if(f.stopPropagation(),f.key==="Escape"){f.preventDefault(),v();return}if(f.key==="Tab"){i(!1);return}if(!["ArrowDown","ArrowUp","Home","End"].includes(f.key))return;f.preventDefault();const h=[...f.currentTarget.querySelectorAll('[role="menuitem"]:not(:disabled)')],x=h.findIndex(L=>L===document.activeElement),k=f.key==="Home"?0:f.key==="End"?h.length-1:(x+(f.key==="ArrowDown"?1:-1)+h.length)%h.length;h[k]?.focus()},children:[e.jsxs("div",{className:"account-menu-heading",role:"presentation",children:[e.jsx("b",{children:w}),e.jsxs("small",{children:[n.username," · 管理员"]})]}),e.jsx("button",{type:"button",role:"menuitem",className:"account-action",onClick:()=>{v(),l("info")},children:"用户信息"}),e.jsx("button",{type:"button",role:"menuitem",className:"account-action",onClick:()=>{v(),l("password")},children:"修改密码"}),e.jsxs("button",{type:"button",role:"menuitem",className:"account-action danger",disabled:c,onClick:async()=>{if(!u.current){u.current=!0,g(!0),v();try{await s.session.logout()}catch{}finally{a()}}},children:[e.jsx(Oe,{name:"logout"}),"退出登录"]})]}),o==="info"&&e.jsx(te,{title:"用户信息",className:"auth-dialog",onClose:()=>l(null),closeLabel:"关闭",children:e.jsx("dl",{className:"account-info",children:[["姓名 / 花名",n.display_name?.trim()||"未填写"],["用户名",n.username],["手机号",n.phone||"未填写"],["角色","管理员"],["用户 ID",n.id]].map(([f,h])=>e.jsxs("div",{className:ie.infoRow,children:[e.jsx("dt",{children:f}),e.jsx("dd",{children:h})]},f))})}),o==="password"&&e.jsxs(te,{title:"修改密码",className:"auth-dialog",onClose:()=>l(null),submitLabel:"保存",onSubmit:async f=>{const h=new FormData(f);await s.changePassword(String(h.get("current_password")??""),String(h.get("new_password")??""),String(h.get("confirm_password")??"")),a()},children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"当前密码"}),e.jsx("input",{name:"current_password",type:"password",autoComplete:"current-password",autoFocus:!0,required:!0})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"新密码（至少 8 位）"}),e.jsx("input",{name:"new_password",type:"password",autoComplete:"new-password",required:!0,minLength:8})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"再输一次新密码"}),e.jsx("input",{name:"confirm_password",type:"password",autoComplete:"new-password",required:!0,minLength:8})]}),e.jsx("p",{className:"auth-note",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。保存后需要重新登录。"})]})]})})}const Ss=n=>window.location.replace(n);function $s({page:n,children:t,workspace:s=!1}){return e.jsx(zs,{page:n,workspace:s,children:t})}function zs({page:n,children:t,workspace:s}){const{session:a,sandbox:r,error:i,retry:o,updateUser:l,expire:p}=as(Ss);return!a&&!i&&s?e.jsx(Kt,{stage:"正在准备工作区"}):a?e.jsx(_s,{children:e.jsx(Ms,{page:n,workspace:s,user:a.user,localTest:a.localTest,services:a.services,initialHealth:a.initialHealth,sandbox:r,updateUser:l,expire:p,children:t})}):e.jsx("main",{id:"main",tabIndex:-1,children:i?e.jsxs("section",{role:"alert",children:[e.jsx("p",{children:i}),e.jsx("a",{href:"/login",children:"前往登录"}),e.jsx("button",{type:"button",onClick:o,children:"重试"})]}):e.jsx("p",{role:"status",children:"正在验证管理员会话…"})})}const Cs=[{label:"工作区",links:[{key:"canvas",label:"画布",href:"/",icon:"dashboard"},{key:"director",label:"导演工作台",href:"/director",icon:"external"}]},{label:"管理",links:[{key:"teams",label:"项目组",href:"/teams",icon:"teams"},{key:"controller",label:"运行面板",href:"/controller",icon:"dashboard"},{key:"permissions",label:"账号与权限",href:"/admin/permissions",icon:"permissions"}]},{label:"统计",links:[{key:"costs",label:"费用评估",href:"/controller/costs",icon:"costs"},{key:"capacity",label:"产能统计",href:"/controller/capacity",icon:"capacity"}]}];function Ms({page:n,workspace:t,user:s,localTest:a,services:r,initialHealth:i,sandbox:o,children:l,updateUser:p,expire:d}){const{notify:c}=lt(),{online:g,maintenance:u,maintenanceVisible:y}=is(r,i,!t),j=m.useRef(!1),w=m.useRef(!1);m.useEffect(()=>{if(t)return;const h=document.body,x=h.dataset.workspace,k=h.classList.contains("admin-page");return h.classList.add("admin-page"),h.dataset.workspace=n,()=>{k||h.classList.remove("admin-page"),x===void 0?delete h.dataset.workspace:h.dataset.workspace=x}},[n,t]),m.useEffect(()=>{const h=document.body.dataset.adminSandbox;return o&&(document.body.dataset.adminSandbox="local-copy"),()=>{h===void 0?delete document.body.dataset.adminSandbox:document.body.dataset.adminSandbox=h}},[o]);const v=ss(s,a);m.useEffect(()=>{v&&(w.current=!1)},[v]);const f=u==="blocked"?"系统正在维护更新，当前暂无可用执行节点，请稍后再使用。":"部分节点正在维护更新，其他可用节点仍可正常使用。";return e.jsxs("div",{className:`admin-page ${n==="permissions"?"permissions-page":""} ${ie.application} ${t?ie.workspace:""}`,children:[e.jsx("a",{className:"skip-link admin-skip",href:n==="capacity"?"#main-content":"#main",children:"跳到主内容"}),!t&&e.jsxs("aside",{id:"workspace-nav","data-admin-sidebar":"","aria-label":"主导航",className:ie.navigation,children:[e.jsxs("a",{className:"workspace-brand",href:"/","aria-label":"Chouka 创作空间",children:[e.jsx("img",{src:"/icon.png",alt:""}),e.jsxs("span",{children:["Chouka",e.jsx("small",{children:"创作空间"})]})]}),e.jsx("nav",{className:"workspace-links","aria-label":"工作区导航",children:Cs.map(h=>e.jsxs("div",{className:"workspace-nav-group",role:"group","aria-label":h.label,children:[e.jsx("div",{className:"workspace-nav-label","aria-hidden":"true",children:h.label}),h.links.map(x=>e.jsxs("a",{className:"workspace-link",href:x.href,title:x.label,"aria-label":x.label,"aria-current":n===x.key?"page":void 0,children:[e.jsx(Oe,{name:x.icon}),e.jsx("span",{children:x.label})]},x.key))]},h.label))}),e.jsxs("div",{className:"workspace-footer",children:[e.jsxs("div",{className:"workspace-presence",title:"Chouka 系统在线用户（近 90 秒活跃，按账号去重）","aria-live":"polite",children:[e.jsx("i",{"aria-hidden":"true"}),e.jsxs("span",{children:[e.jsx("b",{children:g??"--"})," 人在线"]})]}),e.jsx(Ns,{user:s,localTest:a,services:r,expire:d})]})]}),!t&&y&&e.jsxs("div",{id:"maintenance-banner",className:ie.maintenance,role:"status","aria-live":"polite","aria-atomic":"true","aria-label":"系统维护通知",children:[e.jsx("span",{className:"maintenance-banner-icon",children:e.jsx(Oe,{name:"alert"})}),e.jsx("div",{className:"maintenance-banner-ticker",children:e.jsx("div",{className:"maintenance-banner-track",children:[!1,!0].map(h=>e.jsx("span",{className:"maintenance-banner-message","aria-hidden":h||void 0,children:f},String(h)))})})]}),o&&e.jsx("div",{id:"sandbox-note",className:`notice-box admin-sandbox ${ie.sandbox}`,role:"note",children:"本地隔离数据副本：本页用于本地验收，展示复制的业务数据，不代表正式服务的实时状态。"}),v?e.jsx("main",{id:n==="capacity"?"main-content":"main",tabIndex:-1,children:e.jsx("p",{role:"status",children:"请补充手机号后继续使用。"})}):l({http:r.http,user:s,sandbox:o,notify:c}),v&&e.jsx(te,{id:"phone-dialog",title:"补充手机号",className:"auth-dialog phone-dialog",dismissible:!1,closeLabel:"退出登录",submitLabel:"保存并继续",onClose:()=>{w.current||j.current||(j.current=!0,r.session.logout().catch(()=>{}).finally(d))},onSubmit:async h=>{const x=await r.savePhone(String(new FormData(h).get("phone")??""));w.current=!0,p(x)},children:e.jsxs(m.Fragment,{children:[e.jsx("p",{id:"phone-note",className:"auth-note",children:"当前账号尚未填写手机号，请补充后继续使用。手机号仅本人和管理员可见，不用于短信验证或登录。"}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"手机号"}),e.jsx("input",{name:"phone",type:"tel",autoFocus:!0,inputMode:"numeric",autoComplete:"tel-national",required:!0,maxLength:11,pattern:"1[3-9][0-9]{9}",placeholder:"请输入 11 位中国大陆手机号","aria-describedby":"phone-note"})]})]})})]})}const ct={idle:"空闲",busy:"运行中",syncing:"正在更新",offline:"离线",disabled:"已禁用",error:"异常",queued:"排队中",assigned:"已分配",running:"运行中",done:"已完成",canceled:"已取消",cancel_requested:"正在取消"},Es={idle:"尚未更新",pending:"等待空闲",running:"更新并重启中",done:"更新重启完成",error:"更新重启失败"},B=n=>(typeof n=="number"||typeof n=="string")&&n!==""&&Number.isFinite(Number(n))?Number(n):null,ye=n=>B(n)==null?"未获取":String(n),Ps=n=>{const t=B(n);return t==null?null:Math.max(0,Math.min(100,t))},ze=n=>{const t=B(n);return t==null?"未记录":new Date(t*1e3).toLocaleString("zh-CN",{hour12:!1})};function $n(n){const t=B(n);return t==null||t<0?"未记录":t<60?`${Math.round(t)}秒`:t<3600?`${Math.floor(t/60)}分${Math.floor(t%60)}秒`:`${Math.floor(t/3600)}小时${Math.floor(t%3600/60)}分`}function fe(n){const t=B(n);return t==null?"未采集":t>=1024**3?`${(t/1024**3).toFixed(1)} GB`:t>=1024**2?`${(t/1024**2).toFixed(0)} MB`:`${Math.round(t/1024)} KB`}const qs=n=>["idle","done"].includes(n||"")?"ok":["busy","syncing","running","queued","assigned","cancel_requested"].includes(n||"")?"warn":["offline","disabled","error","canceled"].includes(n||"")?"bad":"",Ge=n=>ct[n||""]||n||"未知",zn=n=>{if(le(n))return"主节点 · 无需同步";if(n.sync_action==="restart_services"||n.sync_action==="reboot_host"){const t=n.sync_action==="reboot_host"?"电脑重启":"服务重启",s=n.sync_status;return s==="pending"?`${t} · 等待节点接收`:s==="running"?`${t}中`:s==="done"?`${t}完成`:s==="error"?`${t}失败`:"未记录"}return Es[n.sync_status||""]||n.sync_status||"未记录"},le=n=>n.is_primary_node===!0,Ce=n=>!le(n)&&["pending","running"].includes(n.sync_status||""),Me=n=>!le(n)&&n.sync_status==="error",se=n=>n.state!=="offline",dt=n=>typeof n=="number"||typeof n=="string"&&n.trim()?`Worker v${n}`:"Worker 版本未知",pt=n=>dt(n.capabilities?.agent_version);function mt(n){const t=n.capabilities?.system,s=t?.comfyui_build_version?.trim(),a=t?.comfyui_version?.trim();return s?`ComfyUI ${s}`:a?`ComfyUI ${a} · 定制版本未记录`:"ComfyUI 版本未记录"}const Rs=(n,t=Date.now())=>{const s=B(n?.health.server_time);return s==null||!n?t/1e3:s+(t-n.receivedAt)/1e3},Cn=(n,t)=>{const s=B(n);return s==null?"未记录":`${$n(Math.max(0,t-s))}前`};function Mn(n,t,s){const a=B(n.capabilities?.telemetry?.collected_at);return!s&&se(n)&&a!=null&&t-a<=60&&t-a>=-10}function an(n){return se(n)?n.enabled===!1||n.enabled===0||n.state==="disabled"?["已禁用接收","bad"]:Ce(n)?[["restart_services","reboot_host"].includes(n.sync_action||"")?"维护期间不可接任务":"同步期间不可接任务","bad"]:n.comfy_online===!1||n.state==="error"?["不可接任务","bad"]:n.busy||n.current_job_id||n.state==="busy"?["正在占用","warn"]:n.state==="idle"&&n.comfy_online===!0?["可接任务","ok"]:["接收状态未知",""]:["不可接任务","bad"]}function En(n,t={}){const s=n.capability_comparison||{};if(t.status==="none")return{label:"未设置主节点基准",tone:"warn"};if(t.status==="ambiguous")return{label:"主节点不唯一",tone:"bad"};if(le(n)&&s.status==="primary")return{label:"主节点基准",tone:t.status==="stale"?"warn":"ok"};const a=s.missing_models?.length||0,r=s.missing_node_classes?.length||0,i=s.extra_models?.length||0,o=s.extra_node_classes?.length||0;let l,p="warn";return s.model_inventory_status==="unknown"?(l=["模型清单未知",r?`节点不全 · 缺 ${r} 个`:""].filter(Boolean).join("；"),r&&(p="bad")):s.status==="unknown"||!s.status?l="清单未知":a||r?(l=[a?`模型不全 · 缺 ${a} 个`:"",r?`节点不全 · 缺 ${r} 个`:""].filter(Boolean).join("；"),p="bad"):s.status==="stale"?l=i||o?"节点离线 · 主节点所需齐全，存在额外清单":"节点离线 · 最后清单一致":i||o?(l=`主节点所需齐全 · ${[i?`额外 ${i} 个模型`:"",o?`额外 ${o} 个节点`:""].filter(Boolean).join("；")}`,p="ok"):(l="清单一致",p="ok"),s.status==="stale"&&(a||r)&&(l=`节点离线 · 最后清单：${l}`),t.status==="stale"&&(l=`基准离线 · ${l}`),{label:l,tone:p}}function ut(n,t){if(le(n))return"主节点作为同步源，不参与同步";if(!se(n))return"设备已离线，请上线后重试";if(n.capabilities?.supports_code_restart!==!0)return"请先升级 Worker 及配套启动文件";if(Ce(n))return"设备已有等待中或执行中的维护请求";if(t.status!=="ready")return"主节点基准不可用，请刷新后重试";const s=n.capability_comparison;return!s?.status||["unknown","stale"].includes(s.status)||s.model_inventory_status==="unknown"?"清单未知或已过期，请刷新后重试":!s.missing_models?.length&&!s.missing_node_classes?.length?"主节点所需资源齐全，无需补齐":""}function gn(n){const t=n.comparisonBaseline;if(t.status==="none")return"未设置主节点，无法比较";if(t.status==="ambiguous")return"检测到多个主节点，无法确定比较基准";const s=n.workers.find(a=>a.id===t.worker_id)?.name||t.worker_id||"未命名主节点";return`${t.status==="stale"?"主节点离线 · 最后清单":"在线主节点"} · ${s} · ${dt(t.agent_version)}`}function Ke(n){const t=n.capabilities;return t?.telemetry?.gpus?.length?t.telemetry.gpus:(t?.devices||[]).map((s,a)=>{const r=B(s.vram_total),i=B(s.vram_free);return{index:s.index??a,name:s.name||s.device_name||s.type,memory_total_bytes:r,memory_used_bytes:r!=null&&i!=null?Math.max(0,r-i):null,utilization_percent:null,temperature_c:null}})}function ht(n){if(n.capabilities?.telemetry?.memory)return n.capabilities.telemetry.memory;const t=n.capabilities?.system,s=B(t?.ram_total),a=B(t?.ram_free);return{total_bytes:s,used_bytes:s!=null&&a!=null?Math.max(0,s-a):null}}const xt=(n,t)=>t.projects.find(s=>s.id===n.project)?.name||n.projectName||(n.project?"项目已删除":"未归属项目"),bn=16e3;function Ls(n,t){const s=a=>a>0&&a<n.length&&n.charCodeAt(a)>=56320&&n.charCodeAt(a)<=57343?a-1:a;return n.slice(s(t*bn),s((t+1)*bn))}const W=pe([V().finite(),C().refine(n=>n===""||Number.isFinite(Number(n)))]).nullish(),I=C().nullish(),Xe=pe([Y(),re(0),re(1)]).nullish(),Is=G({used_bytes:W,total_bytes:W}),As=G({index:W,name:I,utilization_percent:W,memory_used_bytes:W,memory_total_bytes:W,temperature_c:W}),Ts=G({agent_version:pe([V(),C()]).nullish(),supports_code_restart:Y().nullish(),supports_service_restart:Y().nullish(),supports_host_reboot:Y().nullish(),node_classes:O(C()).nullish(),telemetry:G({hostname:I,collected_at:W,gpus:O(As).nullish(),memory:Is.nullish()}).nullish(),devices:O(G({index:W,name:I,device_name:I,type:I,vram_total:W,vram_free:W})).nullish(),system:G({ram_total:W,ram_free:W,comfyui_version:I,comfyui_build_version:I}).nullish()}),On=G({name:I,node_class:I,input:I}),Ds=G({status:I,model_inventory_status:I,missing_node_classes:O(C()).nullish(),extra_node_classes:O(C()).nullish(),missing_models:O(On).nullish(),extra_models:O(On).nullish()}),Fs=G({status:I,worker_id:I,agent_version:pe([V(),C()]).nullish()}),Os=G({id:C(),name:I,state:I,enabled:Xe,comfy_online:Xe,busy:Xe,current_job_id:I,last_seen:W,is_primary_node:Xe,sync_status:I,sync_action:I,sync_message:I,capability_comparison:Ds.nullish(),capabilities:Ts.nullish()}),ft=G({id:C(),status:I,history_only:Y().optional(),permission:I,modelName:I,nodeName:I,card:I,name:I,cardName:I,project:I,projectName:I,progress:W,step:I,created:W,started:W,ended:W,worker_id:I,error:I,capability:I,submitter_display_name:I,submitter_username:I}),Us=G({ok:Y().nullish(),mode:I,online_workers:W,workers:W,server_time:W,started_at:W,comfy_online:Y().nullish(),jobs:W,capabilities:W,sandbox:Y().nullish(),llm:G({ok:Y().nullish(),model:I}).nullish()}),Ws=G({running_count:W,queued_count:W}),Bs=G({workers:O(Os),comparison_baseline:Fs.nullish()}),Hs=G({jobs:O(ft)}),Vs=Ve(["all","queued","running","done","error","canceled"]),Gs=G({jobs:O(ft),next_cursor:C().min(1).nullable(),has_more:Y(),total:V().int().nonnegative()}).refine(n=>n.has_more===(n.next_cursor!==null),{message:"任务历史分页游标不完整"}),Ks=G({projects:O(G({id:C(),name:I}))}),Js=G({worker_count:W,primary_count:W,skipped_count:W}),Xs=G({ok:re(!0),worker_id:C().min(1),request_id:C().min(1),action:re("sync_files")}),Ys=Ve(["restart_services","reboot_host"]),Zs=G({ok:re(!0),worker_id:C().min(1),request_id:C().min(1),action:Ys}),Qs=G({ok:Y().optional()}),un=pe([V().finite(),C().refine(n=>n!==""&&Number.isFinite(Number(n)))]).transform(Number),Un=it().transform(n=>(typeof n=="number"||typeof n=="string")&&n!==""&&Number.isFinite(Number(n))?Number(n):null),ea=G({worker_id:I,gpu_index:W,minutes:W,server_time:W,from:un,to:un,gap_seconds:un.pipe(V().positive()),points:O(G({at:Un,temperature_c:Un}))}).refine(n=>n.to>n.from,{message:"温度历史返回格式不完整"});function na(n){return{async history(t,s,a){const r=new URLSearchParams({limit:"50",status:t});return s!==null&&r.set("cursor",s),n.read(`/api/jobs/history?${r}`,Gs,{cache:"no-store",signal:a})},async snapshot(t,s=()=>{}){const a={cache:"no-store",signal:t},[r,i,o,l,p]=await Promise.all([n.read("/api/health",Us,a).then(d=>(d.sandbox===!0&&!t.aborted&&s(),d)),n.read("/api/status",Ws,a),n.read("/api/workers",Bs,a),n.read("/api/jobs",Hs,a),n.read("/api/projects",Ks,a)]);return{health:r,status:i,workers:o.workers,comparisonBaseline:o.comparison_baseline||{status:"none"},jobs:l.jobs,projects:p.projects,receivedAt:Date.now()}},async temperature(t,s,a,r){const i=await n.read(`/api/workers/${encodeURIComponent(t)}/temperature?gpu_index=${s}&minutes=${a}`,ea,{cache:"no-store",signal:r});if(i.worker_id!=null&&i.worker_id!==t||i.gpu_index!=null&&B(i.gpu_index)!==s||i.minutes!=null&&B(i.minutes)!==a)throw new Error("温度历史与所选节点或范围不一致");return{...i,points:i.points.flatMap(o=>o.at!=null&&o.at>=i.from&&o.at<=i.to?[{...o,at:o.at,temperature_c:o.temperature_c}]:[]).sort((o,l)=>o.at-l.at)}},async deleteWorker(t,s,a){return a(),Qs.parse(await n.request(`/api/workers/${encodeURIComponent(t)}`,{method:"DELETE",signal:s}))},async restartWorker(t,s,a,r){r();const i=Zs.parse(await n.request(`/api/admin/workers/${encodeURIComponent(t)}/restart`,{method:"POST",signal:a,headers:{"Content-Type":"application/json"},body:JSON.stringify({action:s})}));if(i.worker_id!==t||i.action!==s)throw new Error("重启响应与所选节点或操作不一致");return i},async syncWorker(t,s,a){a();const r=Xs.parse(await n.request(`/api/admin/workers/${encodeURIComponent(t)}/sync`,{method:"POST",signal:s,headers:{"Content-Type":"application/json"},body:JSON.stringify({})}));if(r.worker_id!==t)throw new Error("同步响应与所选设备不一致");return r},async syncAll(t,s){return s(),Js.parse(await n.request("/api/admin/workers/sync-all",{method:"POST",signal:t,headers:{"Content-Type":"application/json"},body:JSON.stringify({})}))}}}const Wn=n=>({filter:n,jobs:[],initialized:!1,loadedPages:0,nextCursor:null,hasMore:!1,total:null,loading:null,error:"",failedAction:null});function hn(n,t){return(B(t.created)??0)-(B(n.created)??0)||(n.id<t.id?1:n.id>t.id?-1:0)}function ta(n,t){const s=new Map(t.jobs.map(r=>[r.id,r])),a=t.jobs.reduce((r,i)=>!r||hn(i,r)>0?i:r,null);for(const r of n?.jobs||[]){const i=["queued","assigned","running","cancel_requested"].includes(r.status||"");(s.has(r.id)||i||a&&hn(r,a)<=0)&&s.set(r.id,r)}return[...s.values()].filter(r=>{const i=r.status==="assigned"?"queued":r.status==="cancel_requested"?"running":r.status;return t.filter==="all"||i===t.filter}).sort(hn)}class sa{constructor(t,s=!1){this.service=t,this.state={snapshot:null,history:Wn("all"),stale:!1,loading:!1,error:"",isolated:s,mutation:null,deletingWorker:null,refreshed:0}}service;state;listeners=new Set;read=null;historyRead=null;historyEpoch=0;write=null;version=0;disposed=!1;start=()=>{this.disposed=!1,this.refreshAll()};refreshAll=()=>Promise.all([this.refresh(),this.refreshHistory()]);getSnapshot=()=>this.state;subscribe=t=>(this.listeners.add(t),()=>{this.listeners.delete(t)});update(t){this.disposed||(this.state={...this.state,...t},this.listeners.forEach(s=>s()))}isolate=()=>{this.state.isolated||this.update({isolated:!0})};canMutate=()=>!this.disposed&&!!this.state.snapshot&&!this.state.stale&&!this.state.isolated&&!this.state.mutation;guard=()=>{if(this.disposed||!this.state.snapshot||this.state.stale||this.state.isolated)throw new Error("隔离副本或服务状态未就绪，禁止修改设备")};invalidateRead(){++this.version,this.read?.controller.abort(),this.read=null,this.update({loading:!1})}refresh=(t=!1)=>{if(this.disposed||this.state.mutation&&!t)return Promise.resolve();if(this.read)return this.read.promise;const s=++this.version,a=new AbortController;this.update({loading:!0});const r=this.service.snapshot(a.signal,this.isolate).then(i=>{this.disposed||a.signal.aborted||s!==this.version||this.update({snapshot:i,stale:!1,error:"",refreshed:this.state.refreshed+1,isolated:this.state.isolated||i.health.sandbox===!0})}).catch(i=>{this.disposed||a.signal.aborted||s!==this.version||(this.update({stale:!0,error:`读取中间层信息失败：${ne(i)}`}),a.abort())}).finally(()=>{s!==this.version||this.disposed||(this.read=null,this.update({loading:!1}))});return this.read={controller:a,promise:r},r};setHistoryFilter=t=>this.disposed?Promise.resolve():t===this.state.history.filter?this.refreshHistory():(++this.historyEpoch,this.historyRead?.controller.abort(),this.historyRead=null,this.update({history:Wn(t)}),this.refreshHistory());refreshHistory=()=>this.readHistory("first");loadMore=()=>this.readHistory("more");retryHistory=()=>this.readHistory(this.state.history.failedAction||"first");readHistory(t){if(this.disposed)return Promise.resolve();if(this.historyRead)return this.historyRead.promise;const s=this.state.history;if(t==="more"&&(!s.initialized||!s.hasMore))return Promise.resolve();const a=t==="more"?s.nextCursor:null,r=this.historyEpoch,i=new AbortController;this.update({history:{...s,loading:t,error:"",failedAction:null}});const o=this.service.history(s.filter,a,i.signal).then(l=>{if(this.disposed||i.signal.aborted||r!==this.historyEpoch)return;if(t==="more"&&l.has_more&&l.next_cursor===a)throw new Error("任务历史游标未推进，请重试");const p=this.state.history,d=new Map(p.jobs.map(g=>[g.id,g]));for(const g of l.jobs)d.set(g.id,g);const c=t==="first"&&p.loadedPages>1;this.update({history:{...p,jobs:[...d.values()],initialized:!0,loadedPages:t==="more"?p.loadedPages+1:Math.max(1,p.loadedPages),total:l.total,nextCursor:c?p.nextCursor:l.next_cursor,hasMore:c?p.hasMore:l.has_more}})}).catch(l=>{this.disposed||i.signal.aborted||r!==this.historyEpoch||this.update({history:{...this.state.history,error:`读取任务历史失败：${ne(l)}`,failedAction:t}})}).finally(()=>{this.disposed||i.signal.aborted||r!==this.historyEpoch||(this.historyRead=null,this.update({history:{...this.state.history,loading:null}}))});return this.historyRead={controller:i,promise:o},o}async mutate(t,s,a){if(this.guard(),this.state.mutation)throw new Error("设备操作正在执行，请稍后重试");this.invalidateRead();const r=new AbortController;this.write=r,this.update({mutation:t,deletingWorker:s});try{const i=await a(r.signal);if(r.signal.aborted||this.disposed)throw new DOMException("操作已取消","AbortError");return await this.refresh(!0),i}catch(i){throw r.signal.aborted||(this.update({error:`${t==="delete"?"删除设备":t==="restart"?"提交重启":"更新节点"}失败：${ne(i)}`}),await this.refresh(!0)),i}finally{this.write=null,this.update({mutation:null,deletingWorker:null})}}deleteWorker=t=>this.state.snapshot?.workers.some(s=>s.id===t)?this.mutate("delete",t,s=>this.service.deleteWorker(t,s,this.guard)):Promise.reject(new Error("设备已移除"));restartWorker=(t,s)=>this.state.snapshot?.workers.some(a=>a.id===t)?this.mutate("restart",null,a=>this.service.restartWorker(t,s,a,this.guard)):Promise.reject(new Error("设备已移除"));syncWorker=t=>{const s=this.state.snapshot,a=s?.workers.find(i=>i.id===t);if(!a||!s)return Promise.reject(new Error("设备已移除或被新的注册替代"));const r=ut(a,s.comparisonBaseline);return r?Promise.reject(new Error(r)):this.mutate("sync",null,i=>this.service.syncWorker(t,i,this.guard))};syncAll=()=>this.mutate("sync",null,t=>this.service.syncAll(t,this.guard));dispose=()=>{this.disposed=!0,++this.version,this.read?.controller.abort(),this.write?.abort(),++this.historyEpoch,this.historyRead?.controller.abort(),this.historyRead=null,this.read=null,this.listeners.clear()}}function aa({http:n,sandbox:t}){const s=m.useMemo(()=>na(n),[n]),a=m.useMemo(()=>new sa(s),[s]),r=m.useSyncExternalStore(a.subscribe,a.getSnapshot),[i,o]=m.useState(!0),l=m.useRef(i),[p,d]=m.useState(Date.now);return m.useLayoutEffect(()=>{l.current=i},[i]),m.useLayoutEffect(()=>{t&&a.isolate()},[t,a]),m.useEffect(()=>(a.start(),a.dispose),[a]),m.useEffect(()=>{const c=()=>{document.hidden||(d(Date.now()),l.current&&a.refreshAll())},g=window.setInterval(c,5e3);return document.addEventListener("visibilitychange",c),()=>{window.clearInterval(g),document.removeEventListener("visibilitychange",c)}},[a]),{state:r,store:a,service:s,automatic:i,setAutomatic:o,clock:p}}function nn({name:n}){return e.jsx("svg",{className:"icon",viewBox:"0 0 24 24","aria-hidden":"true",focusable:"false",children:n==="refresh"?e.jsxs(e.Fragment,{children:[e.jsx("path",{d:"M20 7v5h-5M4 17v-5h5"}),e.jsx("path",{d:"M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 18 17"})]}):n==="chevron"?e.jsx("path",{d:"m9 5 7 7-7 7"}):e.jsxs(e.Fragment,{children:[e.jsx("path",{d:"m12 3 10 18H2L12 3Z"}),e.jsx("path",{d:"M12 9v4m0 3v1"})]})})}function $e({children:n}){return e.jsx("span",{className:"cell-secondary",children:n})}function ia({value:n,label:t}){return e.jsx("div",{className:"util-track",role:"meter","aria-label":t,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":n,children:e.jsx("i",{style:{width:`${n}%`}})})}function ra({value:n}){const t=B(n),s=Ps(t==null?null:t*100);return e.jsxs("div",{className:"utilization",children:[e.jsx("span",{children:s==null?"未采集":`${Math.round(s)}%`}),s!=null&&e.jsx(ia,{value:s,label:"任务过程进度"})]})}function gt({worker:n,snapshot:t}){const s=t.jobs.find(a=>a.id===n.current_job_id);if(s){const a=`${s.submitter_display_name?.trim()||s.submitter_username||"未记录提交人"} · ${xt(s,t)} · ${s.cardName||s.name||"未命名卡片"}`;return s.project&&s.card?e.jsx("a",{href:`/?${new URLSearchParams({project:s.project,card:s.card})}`,title:a,children:a}):e.jsx("span",{title:a,children:a})}return n.current_job_id?e.jsx(e.Fragment,{children:"任务详情暂未载入"}):Ce(n)?e.jsxs(e.Fragment,{children:[zn(n),e.jsx($e,{children:n.sync_message||"等待节点反馈"})]}):se(n)?n.busy?e.jsxs(e.Fragment,{children:["ComfyUI 本地任务",e.jsx($e,{children:"非中间层派发"})]}):e.jsx(e.Fragment,{children:an(n)[1]==="bad"?"不接收新任务":"当前无任务"}):e.jsx(e.Fragment,{children:"非实时"})}function bt({rows:n,className:t,id:s}){return e.jsx("dl",{id:s,className:t,children:n.map(([a,r])=>e.jsx(oa,{label:a,children:r},a))})}function oa({label:n,children:t}){return e.jsxs(e.Fragment,{children:[e.jsx("dt",{children:n}),e.jsx("dd",{children:t})]})}function la({snapshot:n,items:t,now:s,onError:a}){const r=new Map(n?.workers.map(i=>[i.id,i.name])||[]);return e.jsx(e.Fragment,{children:t.length?t.map(i=>{const o=B(i.started),l=o==null?i.history_only?"耗时未记录":"尚未开始":i.history_only&&B(i.ended)==null?"耗时未记录":$n((B(i.ended)??s)-o);return e.jsxs("tr",{children:[e.jsx("td",{className:qs(i.status),children:Ge(i.status)}),e.jsxs("td",{className:"job-origin",children:[i.submitter_display_name?.trim()||i.submitter_username||"未记录提交人",e.jsx($e,{children:n?xt(i,n):i.projectName||"项目未记录"}),e.jsxs($e,{children:["卡片 · ",i.cardName||i.name||"未命名"]})]}),e.jsxs("td",{className:"job-mode",title:i.capability||void 0,children:[i.modelName||i.nodeName||i.name||i.capability||"未记录",e.jsx($e,{children:i.id})]}),e.jsxs("td",{children:[e.jsx(ra,{value:i.progress}),e.jsx($e,{children:i.step||"步骤未记录"})]}),e.jsx("td",{title:i.worker_id||void 0,children:i.nodeName?.trim()||(i.worker_id?r.get(i.worker_id)||"未知执行端":i.history_only?"未记录":"待分配")}),e.jsx("td",{children:ze(i.created)}),e.jsx("td",{children:i.error?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"danger f-job-error",title:i.error,children:i.error}),e.jsx("button",{type:"button",className:"link-button","data-job-error":i.id,"data-focus-key":`job-error:${i.id}`,onClick:()=>a(i),children:"查看完整错误"})]}):l})]},i.id)}):e.jsx("tr",{children:e.jsx("td",{colSpan:7,children:e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"暂无已加载任务"}),e.jsx("p",{children:"可更换任务状态；历史记录的加载结果见下方状态。"})]})})})})}class ca{constructor(t,s,a,r){this.service=t,this.id=s,this.gpu=a,this.minutes=r}service;id;gpu;minutes;state={data:null,loading:!1,error:""};listeners=new Set;request=null;version=0;getSnapshot=()=>this.state;subscribe=t=>(this.listeners.add(t),()=>{this.listeners.delete(t)});update(t){this.state={...this.state,...t},this.listeners.forEach(s=>s())}load=async(t=!1)=>{if(t&&this.request)return;this.request?.abort();const s=new AbortController,a=++this.version;this.request=s,this.update({loading:!0,error:"",...t?{}:{data:null}});try{const r=await this.service.temperature(this.id,this.gpu,this.minutes,s.signal);if(s.signal.aborted||a!==this.version)return;this.update({data:r})}catch(r){if(s.signal.aborted||a!==this.version)return;this.update({data:null,error:ne(r)})}finally{a===this.version&&(this.request=null,this.update({loading:!1}))}};dispose=()=>{++this.version,this.request?.abort(),this.request=null}}function da(n,t,s){const a=n.points.flatMap(d=>d.temperature_c==null?[]:[d.temperature_c]),r=Math.floor((Math.min(...a)-5)/10)*10,i=Math.ceil((Math.max(...a)+5)/10)*10,o=49,l=t-o-20,p=s-23-45;return{x:d=>o+(d-n.from)/(n.to-n.from)*l,y:d=>23+(i-d)/(i-r)*p,width:t,height:s,left:o,pw:l}}function pa(n){const t=[];let s=null;for(const a of n.points){if(a.temperature_c==null){s=null;continue}(s==null||a.at-s>n.gap_seconds)&&t.push([]),t[t.length-1]?.push({at:a.at,temperature_c:a.temperature_c}),s=a.at}return t}function ma(n,t,s,a,r){if(a<70||r<50||!t.points.some(w=>w.temperature_c!=null))return null;const i=n.getContext("2d");if(!i)return null;const o=window.devicePixelRatio||1;n.width=Math.round(a*o),n.height=Math.round(r*o),i.setTransform(o,0,0,o,0,0),i.clearRect(0,0,a,r);const l=da(t,a,r),{x:p,y:d,left:c,pw:g}=l,u=t.points.flatMap(w=>w.temperature_c==null?[]:[w.temperature_c]),y=Math.floor((Math.min(...u)-5)/10)*10,j=Math.ceil((Math.max(...u)+5)/10)*10;i.font='12px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',i.lineWidth=1,i.textAlign="right",i.textBaseline="middle";for(let w=0;w<=4;w++){const v=y+(j-y)*w/4,f=d(v);i.strokeStyle="#29313c",i.beginPath(),i.moveTo(c,f),i.lineTo(a-20,f),i.stroke(),i.fillStyle="#a0a6b1",i.fillText(`${Math.round(v)}°`,c-12,f)}i.textBaseline="top";for(let w=0;w<=4;w+=a<600?2:1){const v=new Date((t.from+(t.to-t.from)*w/4)*1e3),f=v.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:!1}),h=s===1440?v.toLocaleDateString("zh-CN",{month:"2-digit",day:"2-digit"})+" "+f:f;i.textAlign=w===0?"left":w===4?"right":"center",i.fillText(h,c+w/4*g,r-27)}i.strokeStyle="#38bdf8",i.lineWidth=2.3,i.lineJoin="round",i.beginPath();for(const w of pa(t))w.forEach((v,f)=>{f===0?i.moveTo(p(v.at),d(v.temperature_c)):i.lineTo(p(v.at),d(v.temperature_c))});i.stroke(),i.fillStyle="#38bdf8";for(const w of t.points)w.temperature_c!=null&&(i.beginPath(),i.arc(p(w.at),d(w.temperature_c),2.1,0,Math.PI*2),i.fill());return l}const ua="_page_9iqnq_1",ha="_overview_9iqnq_1",xa="_workerGrid_9iqnq_54",fa="_workerCard_9iqnq_62",ga="_workerIdentityBlock_9iqnq_74",ba="_workerHeader_9iqnq_89",ya="_workerService_9iqnq_90",va="_syncMeta_9iqnq_91",ja="_workerName_9iqnq_100",wa="_workerState_9iqnq_112",_a="_workerVersions_9iqnq_141",ka="_resourceNote_9iqnq_142",Na="_telemetryNote_9iqnq_143",Sa="_sectionLabel_9iqnq_144",$a="_syncMessage_9iqnq_146",za="_workerResources_9iqnq_161",Ca="_resourceRow_9iqnq_164",Ma="_resourceReadings_9iqnq_165",Ea="_resourceTitle_9iqnq_177",Pa="_resourceReading_9iqnq_165",qa="_resourceLabel_9iqnq_203",Ra="_resourceBar_9iqnq_206",La="_workerActivity_9iqnq_241",Ia="_workerTask_9iqnq_250",Aa="_workerSync_9iqnq_289",Ta="_inventoryAction_9iqnq_297",Da="_inventoryLabel_9iqnq_298",Fa="_syncActionLabel_9iqnq_342",Oa="_cardActions_9iqnq_353",Ua="_historyControls_9iqnq_387",Wa="_workerDialog_9iqnq_396",Ba="_workerActions_9iqnq_399",Ha="_capabilities_9iqnq_407",Va="_temperatureDialog_9iqnq_416",F={page:ua,overview:ha,workerGrid:xa,workerCard:fa,workerIdentityBlock:ga,workerHeader:ba,workerService:ya,syncMeta:va,workerName:ja,workerState:wa,workerVersions:_a,resourceNote:ka,telemetryNote:Na,sectionLabel:Sa,syncMessage:$a,workerResources:za,resourceRow:Ca,resourceReadings:Ma,resourceTitle:Ea,resourceReading:Pa,resourceLabel:qa,resourceBar:Ra,workerActivity:La,workerTask:Ia,workerSync:Aa,inventoryAction:Ta,inventoryLabel:Da,syncActionLabel:Fa,cardActions:Oa,historyControls:Ua,workerDialog:Wa,workerActions:Ba,capabilities:Ha,temperatureDialog:Va};function Ga({worker:n,workerId:t,service:s,now:a,stale:r,revision:i,onClose:o}){const l=n?Ke(n):[],[p,d]=m.useState(()=>({gpu:B(l[0]?.index)??0,minutes:30}));return e.jsx(te,{title:n?.name||t,onClose:o,className:`temperature-dialog ${F.temperatureDialog}`,showFooter:!1,children:e.jsx(Ka,{worker:n,workerId:t,service:s,now:a,stale:r,revision:i,selection:p,onSelect:d})})}function Ka({worker:n,workerId:t,service:s,now:a,stale:r,revision:i,selection:o,onSelect:l}){const{gpu:p,minutes:d}=o,c=m.useMemo(()=>new ca(s,t,p,d),[s,t,p,d]),g=m.useSyncExternalStore(c.subscribe,c.getSnapshot),{data:u,error:y,loading:j}=g,w=m.useRef(null),v=m.useRef(null),f=m.useRef(null),h=m.useRef(null),[x,k]=m.useState(null),L=m.useRef(i),T=n?Ke(n):[],_=T.find(z=>B(z.index)===p),N=(u?.points||[]).flatMap(z=>z.temperature_c==null?[]:[z.temperature_c]),E=n&&se(n)?Mn(n,a,r)?B(_?.temperature_c)??"未采集":"未采集":"非实时";m.useEffect(()=>(c.load(),c.dispose),[c]),m.useEffect(()=>{L.current!==i&&(L.current=i,c.load(!0))},[i,c]),m.useEffect(()=>{const z=w.current,S=v.current;if(!z||!S||!u)return;const Q=()=>{const{width:oe,height:be}=S.getBoundingClientRect();h.current=ma(z,u,d,oe,be)},J=requestAnimationFrame(Q),ee=new ResizeObserver(Q);return ee.observe(S),()=>{cancelAnimationFrame(J),ee.disconnect(),h.current=null}},[u,d]);const b=x==null?void 0:u?.points[x],R=b?`${ze(b.at)} · ${b.temperature_c==null?"未采集":`${b.temperature_c}°C`}`:"";m.useEffect(()=>{const z=f.current,S=h.current;!z||!S||!b||(z.style.left=`${Math.max(8,Math.min(S.width-z.offsetWidth-8,S.x(b.at)+14))}px`,z.style.top=`${Math.max(8,Math.min(S.height-z.offsetHeight-8,b.temperature_c==null?20:S.y(b.temperature_c)-45))}px`)},[b,R]);const D=[["当前温度",E],["所选时段最高",N.length?Math.max(...N):u?"未采集":"未获取"],["所选时段最低",N.length?Math.min(...N):u?"未采集":"未获取"]];return e.jsxs("div",{className:"modal-shell",children:[e.jsx("header",{className:"modal-header",children:e.jsxs("div",{children:[e.jsx("p",{className:"eyeline",children:"显卡温度趋势"}),e.jsxs("p",{className:"muted","data-temp-description":!0,children:[_?.name||"型号未记录"," / ",n?Ge(n.state):"节点已移除"]})]})}),e.jsxs("div",{className:"chart-controls",children:[e.jsxs("label",{className:"inline-label",children:["显卡"," ",e.jsx("select",{"data-temp-gpu":!0,"aria-label":"选择显卡",value:p,onChange:z=>{k(null),l({...o,gpu:Number(z.target.value)})},children:T.length?T.map((z,S)=>e.jsxs("option",{value:z.index??0,children:["GPU ",z.index??0," · ",z.name||"未记录型号"]},`${z.index??S}:${S}`)):e.jsx("option",{value:0,children:"GPU 0 · 未采集配置"})})]}),e.jsx("div",{className:"segmented","data-temp-ranges":!0,"aria-label":"温度时间范围",children:[[30,"30 分钟"],[120,"2 小时"],[1440,"24 小时"]].map(([z,S])=>e.jsx("button",{type:"button","data-range":z,"aria-pressed":d===z,onClick:()=>{k(null),l({...o,minutes:z})},children:S},z))})]}),e.jsx("p",{className:"small muted",children:"仅展示真实采集记录；缺失区间不插值、不补造历史。当前温度需60秒内的新鲜遥测。"}),e.jsx("div",{className:"temperature-stats","data-temp-stats":!0,children:D.map(([z,S])=>e.jsxs("div",{className:"temperature-stat",children:[e.jsx("label",{children:z}),e.jsxs("strong",{children:[S,typeof S=="number"&&e.jsx("small",{children:" °C"})]})]},z))}),e.jsxs("div",{className:"chart-area",ref:v,children:[e.jsx("canvas",{ref:w,"data-temp-canvas":!0,hidden:!N.length,tabIndex:0,role:"img","aria-label":`GPU ${p}，${d}分钟真实温度历史，${N.length}个有效采集点；左右方向键查看。`,onPointerMove:z=>{const S=h.current;if(!S||!u?.points.length)return;const Q=u.from+Math.max(0,Math.min(1,(z.clientX-z.currentTarget.getBoundingClientRect().left-S.left)/S.pw))*(u.to-u.from);k(u.points.reduce((J,ee,oe)=>Math.abs(ee.at-Q)<Math.abs((u.points[J]?.at??ee.at)-Q)?oe:J,0))},onPointerLeave:()=>k(null),onKeyDown:z=>{!u?.points.length||!["ArrowLeft","ArrowRight","Home","End"].includes(z.key)||(z.preventDefault(),k(z.key==="Home"?0:z.key==="End"?u.points.length-1:Math.max(0,Math.min(u.points.length-1,(x??0)+(z.key==="ArrowRight"?1:-1)))))}}),e.jsx("div",{className:"empty-state","data-temp-empty":!0,hidden:N.length>0,role:"status",children:y?e.jsxs(e.Fragment,{children:[e.jsx("b",{children:"温度历史读取失败"}),e.jsx("p",{children:y}),e.jsx("button",{type:"button",onClick:()=>{k(null),c.load()},children:"重试读取"})]}):j||!u?e.jsx("b",{children:"正在读取温度历史…"}):e.jsxs(e.Fragment,{children:[e.jsx("b",{children:"暂无有效温度记录"}),e.jsx("p",{children:"未开始采集、旧版 Worker 未上报或驱动不支持；不显示 0°C。"})]})}),e.jsx("div",{ref:f,className:"chart-tooltip",hidden:!b||!N.length,role:"status",children:R})]}),e.jsxs("footer",{className:"modal-footer",children:[e.jsxs("span",{className:"chart-key",children:[e.jsx("i",{}),e.jsxs("span",{"data-temp-key":!0,children:["GPU ",p," 温度"]})]}),e.jsx("span",{"data-temp-note":!0,children:u?`${ze(u.from)} — ${ze(u.to)}${n&&!se(n)?" · 离线，历史非实时":""}`:""}),e.jsx("span",{className:"keyboard-hint",children:"左右键查看采集点 · Esc关闭"})]})]})}function Ja({capabilities:n}){const[t,s]=m.useState(null),[a,r]=m.useState(0),i=m.useRef(null),o=m.useRef(null),l=m.useRef(new Set),p=Math.max(1,Math.ceil((t?.length||0)/bn));m.useEffect(()=>{const g=l.current;return()=>{g.forEach(u=>URL.revokeObjectURL(u)),g.clear()}},[]);const d=g=>{r(g),(g===0||g===p-1)&&o.current?.focus({preventScroll:!0}),o.current&&(o.current.scrollTop=0,o.current.scrollLeft=0)},c=()=>{if(t==null)return;const g=URL.createObjectURL(new Blob([t],{type:"application/json;charset=utf-8"}));l.current.add(g);const u=document.createElement("a");u.href=g,u.download="worker-capabilities.json",u.click()};return e.jsxs("details",{className:F.capabilities,"data-capabilities":!0,onToggle:g=>{g.currentTarget.open&&i.current==null&&(i.current=JSON.stringify(n,null,2),s(i.current))},children:[e.jsx("summary",{children:"完整能力与配置（最后上报，非实时配置证据）"}),t!=null&&e.jsxs("div",{children:[e.jsx("p",{className:"small muted",children:"按页查看完整快照；下载可获取全部 JSON，自动刷新不会改变当前快照。"}),e.jsxs("div",{className:"f-toolbar",children:[e.jsx("button",{type:"button","data-config-prev":!0,disabled:a===0,onClick:()=>d(a-1),children:"上一页"}),e.jsxs("span",{className:"small muted","data-config-page":!0,role:"status",children:["第 ",a+1," / ",p," 页"]}),e.jsx("button",{type:"button","data-config-next":!0,disabled:a===p-1,onClick:()=>d(a+1),children:"下一页"}),e.jsx("button",{type:"button","data-config-download":!0,onClick:c,children:"下载完整 JSON"})]}),e.jsx("pre",{ref:o,className:"capabilities-json",tabIndex:0,"aria-label":"当前页能力与配置",children:Ls(t,a)})]})]})}function Bn({items:n}){return n.length?e.jsx("ul",{className:"inventory-list",children:n.map((t,s)=>e.jsx("li",{children:t},`${s}:${t}`))}):e.jsx("p",{className:"muted small",children:"无"})}function Hn({items:n,unknown:t}){return t?e.jsx("p",{className:"muted small",children:"模型清单未知，无法判断"}):n.length?e.jsx("ul",{className:"inventory-list",children:n.map((s,a)=>e.jsxs("li",{children:[s.name||"未命名模型",e.jsxs("span",{children:[s.node_class||"未知节点"," · ",s.input||"未知输入"]})]},`${a}:${s.name}`))}):e.jsx("p",{className:"muted small",children:"无"})}function Xa({worker:n,snapshot:t}){const s=n.capability_comparison||{},a=En(n,t.comparisonBaseline),r=s.model_inventory_status==="unknown",i=s.missing_node_classes||[],o=s.extra_node_classes||[],l=s.missing_models||[],p=s.extra_models||[];return["none","ambiguous"].includes(t.comparisonBaseline.status||"")||!s.status||s.status==="unknown"&&r&&!i.length&&!o.length?e.jsxs("section",{className:"inventory-audit",children:[e.jsx("h3",{children:"与主节点清单对比"}),e.jsxs("div",{className:"notice-box",children:[e.jsx("b",{className:a.tone,children:a.label}),e.jsxs("p",{children:[gn(t),"。旧版 Worker 或清单字段缺失时不会猜测为完整。"]})]})]}):e.jsxs("section",{className:"inventory-audit",children:[e.jsxs("div",{className:"inventory-heading",children:[e.jsx("h3",{children:"与主节点清单对比"}),e.jsx("span",{className:"f-chip inventory-chip","data-tone":a.tone,children:a.label})]}),e.jsxs("p",{className:"muted small",children:[gn(t),"；文件名、相对路径和版本均按精确值比较。"]}),e.jsxs("div",{className:"inventory-grid",children:[e.jsxs("div",{className:"inventory-block",children:[e.jsxs("h4",{children:["缺失节点类 ",e.jsx("span",{children:i.length})]}),e.jsx(Bn,{items:i}),e.jsxs("h4",{children:["缺失模型 ",e.jsx("span",{children:r?"未知":l.length})]}),e.jsx(Hn,{items:l,unknown:r})]}),e.jsxs("div",{className:"inventory-block",children:[e.jsxs("h4",{children:["额外节点类 ",e.jsx("span",{children:o.length})]}),e.jsx(Bn,{items:o}),e.jsxs("h4",{children:["额外模型 ",e.jsx("span",{children:r?"未知":p.length})]}),e.jsx(Hn,{items:p,unknown:r})]})]})]})}function Ya({worker:n,snapshot:t,now:s,stale:a,restartUnavailable:r,onRestart:i,onClose:o}){const[l,p]=m.useState(null),[d,c]=m.useState(""),g=r||(a?"服务状态已过期，请刷新后重试。":le(n)?"主节点不支持远程重启。":se(n)?["pending","running"].includes(n.sync_status||"")?"节点已有维护操作，请等待完成。":"":"节点已离线，无法提交重启。"),u=x=>g||(n.capabilities?.[x==="reboot_host"?"supports_host_reboot":"supports_service_restart"]!==!0?"当前 Worker 不支持此操作，请先更新 Worker。":""),y=n.capabilities||{},j=y.telemetry||{},w=ht(n),v=an(n),f=En(n,t.comparisonBaseline),h=[["节点角色",le(n)?"主节点（不参与文件同步）":"执行节点"],["清单状态",e.jsx("span",{className:f.tone,children:f.label})],["比较基准",gn(t)],["主机",j.hostname||"未记录"],["ComfyUI",se(n)?n.comfy_online===!0?"在线":n.comfy_online===!1?"不可用":"未获取":"非实时"],["任务接收",e.jsx("span",{className:v[1],children:v[0]})],["维护状态",zn(n)],["维护消息",le(n)?"此节点已排除在批量文件同步之外":n.sync_message||"未记录"],["最后心跳",`${ze(n.last_seen)} / ${Cn(n.last_seen,s)}`],["遥测时间",`${ze(j.collected_at)} · ${Mn(n,s,a)?"新鲜采集":"非实时 / 未采集"}`],["节点能力",y.node_classes?`${y.node_classes.length} 个`:"未记录"],["当前任务",e.jsx(gt,{worker:n,snapshot:t})],["系统内存",`${fe(w.used_bytes)} / ${fe(w.total_bytes)}（最后上报）`]];return e.jsxs(e.Fragment,{children:[e.jsxs(te,{title:`${n.name||n.id} · 节点详情`,onClose:o,className:F.workerDialog,children:[e.jsxs("div",{className:F.workerActions,role:"group","aria-label":"节点重启操作",children:[e.jsx("button",{type:"button",disabled:!!u("restart_services"),title:u("restart_services")||"重启 ComfyUI 和 Worker，不重启电脑",onClick:()=>p("restart_services"),children:"重启服务"}),e.jsx("button",{type:"button",className:"danger",disabled:!!u("reboot_host"),title:u("reboot_host")||"重启节点所在的整台电脑",onClick:()=>p("reboot_host"),children:"重启节点"})]}),e.jsx("p",{className:"muted small",children:g||(n.capabilities?.supports_service_restart!==!0&&n.capabilities?.supports_host_reboot!==!0?"当前 Worker 不支持远程重启，请先更新 Worker。":"重启服务仅重启 ComfyUI 和 Worker；重启节点将重启整台电脑。节点收到请求后立即执行，会中断当前任务，不等待空闲。")}),d&&e.jsx("p",{className:"notice-box",role:"status",children:d}),e.jsxs("div",{className:"f-tags",children:[e.jsx("span",{className:"f-chip",children:Ge(n.state)}),e.jsx("span",{className:"f-chip",children:pt(n)}),e.jsx("span",{className:"f-chip",children:mt(n)}),e.jsxs("span",{className:"f-chip",children:["Worker ID: ",n.id]})]}),e.jsx(bt,{rows:h,className:"f-definition"}),e.jsx(Xa,{worker:n,snapshot:t}),e.jsx("div",{className:"f-grid2",children:Ke(n).map((x,k)=>e.jsxs("div",{className:"notice-box",children:[e.jsxs("b",{children:["GPU ",x.index??"未知"," · ",x.name||"未记录"]}),e.jsxs("p",{children:["最后上报：利用率"," ",B(x.utilization_percent)==null?"未采集":`${x.utilization_percent}%`,"；显存 ",fe(x.memory_used_bytes)," / ",fe(x.memory_total_bytes),"；温度"," ",B(x.temperature_c)==null?"未采集":`${x.temperature_c}°C`]})]},`${x.index??k}:${k}`))}),e.jsx(Ja,{capabilities:y})]}),l&&e.jsxs(te,{title:l==="reboot_host"?"重启节点电脑":"重启节点服务",submitLabel:l==="reboot_host"?"确认重启电脑":"确认重启服务",onClose:()=>p(null),onSubmit:async()=>{const x=u(l);if(x)throw new Error(x);await i(l),c(`${l==="reboot_host"?"电脑重启":"服务重启"}请求已提交，节点收到请求后立即执行，会中断当前任务；恢复状态以节点实际回报为准。`)},children:[e.jsxs("p",{children:["目标节点：",e.jsx("strong",{children:n.name||n.id})]}),e.jsx("div",{className:"notice-box",children:l==="reboot_host"?"此操作会重启该节点所在的整台 Windows 电脑，会强制关闭程序，未保存内容可能丢失，所有服务都会暂时离线。电脑恢复后，ComfyUI 和 Worker 是否自动启动取决于该电脑的启动配置。":"此操作只重启该节点的 ComfyUI 和 Worker 服务，不会重启 Windows 电脑，不同步文件或更新代码。"}),e.jsx("p",{children:"节点收到请求后立即执行，会中断当前任务，不等待空闲；提交后暂停向该节点分配新任务。请求已接收不代表重启已完成，请查看节点维护状态。"}),l==="reboot_host"&&e.jsxs("label",{className:"check-label",children:[e.jsx("input",{type:"checkbox",required:!0}),"我确认重启整台电脑，并已处理其他程序和未保存内容"]})]})]})}function Vn(n){return n.state==="busy"||n.state==="running"?0:n.state==="idle"?1:n.state==="offline"?3:2}function Za({snapshot:n,now:t,stale:s,mutationDisabled:a,deletingWorker:r,onDetails:i,onTemperature:o,onDelete:l,onSync:p}){const d=[...n.workers].sort((c,g)=>Vn(c)-Vn(g));return e.jsx(e.Fragment,{children:d.length?d.map(c=>{const g=Mn(c,t,s),u=Ke(c),y=ht(c),j=Ge(c.state),w=an(c),v=En(c,n.comparisonBaseline),f=!!(c.capability_comparison?.missing_models?.length||c.capability_comparison?.missing_node_classes?.length),h=ut(c,n.comparisonBaseline),x=se(c)?c.comfy_online===!0?"ComfyUI 在线":c.comfy_online===!1?"ComfyUI 不可用":"ComfyUI 未获取":"ComfyUI 非实时";return e.jsxs("article",{className:F.workerCard,"data-worker-card":c.id,"data-worker-state":c.state||"unknown","aria-label":c.name||c.id,children:[e.jsxs("div",{className:F.workerIdentityBlock,children:[e.jsxs("header",{className:F.workerHeader,children:[e.jsx("div",{className:F.workerName,"data-worker-name":!0,children:e.jsx("strong",{children:c.name||"未命名执行端"})}),e.jsx("span",{className:F.workerState,"data-state":c.state,children:j})]}),e.jsxs("div",{className:F.workerVersions,children:[le(c)&&e.jsx("span",{className:"f-chip",children:"主节点"}),e.jsx("span",{children:pt(c)}),e.jsx("span",{children:mt(c)})]})]}),e.jsxs("div",{className:F.workerResources,children:[u.map((k,L)=>e.jsx(Gn,{gpu:k,ram:void 0,live:g},`${k.index??L}:${L}`)),!u.length&&e.jsx("p",{className:F.telemetryNote,children:"未采集 GPU 指标"}),e.jsx(Gn,{gpu:void 0,ram:y,live:g}),!g&&e.jsx("p",{className:F.telemetryNote,children:se(c)?"遥测未采集或已过期":"非实时，不沿用旧读数"}),e.jsxs("div",{className:F.workerService,children:[e.jsx("span",{"data-tone":c.comfy_online===!1&&se(c)?"bad":void 0,children:x}),e.jsx("span",{"data-tone":w[1],children:w[0]})]})]}),e.jsxs("div",{className:F.workerActivity,children:[e.jsxs("div",{className:F.workerTask,children:[e.jsx("span",{className:F.sectionLabel,children:"当前任务"}),e.jsx("div",{children:e.jsx(gt,{worker:c,snapshot:n})})]}),e.jsxs("div",{className:F.workerSync,children:[e.jsxs("div",{className:F.syncMeta,children:[e.jsx("span",{className:Me(c)?"danger":"",children:zn(c)}),e.jsxs("span",{title:c.last_seen==null?"未记录":new Date(Number(c.last_seen)*1e3).toLocaleString("zh-CN",{hour12:!1}),children:["心跳 ",Cn(c.last_seen,t)]})]}),!le(c)&&f?e.jsxs("button",{type:"button",className:F.inventoryAction,"data-tone":v.tone,"data-sync-worker":c.id,"data-focus-key":`worker-sync:${c.id}`,"aria-label":`同步设备 ${c.name||c.id}：${v.label}`,disabled:a||!!h,title:h||"仅同步这台设备；点击查看范围并确认",onClick:()=>p(c),children:[e.jsx("span",{children:v.label}),e.jsxs("span",{className:F.syncActionLabel,children:[Ce(c)?"维护中":h?"不可同步":"点击同步",e.jsx(nn,{name:"chevron"})]})]}):e.jsx("span",{className:F.inventoryLabel,"data-tone":v.tone,children:v.label}),!le(c)&&f&&h&&!Ce(c)&&e.jsx("p",{className:F.syncMessage,children:h}),!le(c)&&c.sync_message&&(Me(c)||Ce(c))&&e.jsx("p",{className:F.syncMessage,role:Me(c)?"alert":void 0,children:c.sync_message})]})]}),e.jsxs("footer",{className:F.cardActions,children:[e.jsx("button",{type:"button",className:"link-button","data-worker":c.id,"data-focus-key":`worker-details:${c.id}`,onClick:()=>i(c),children:"节点详情"}),e.jsx("button",{type:"button",className:"link-button","data-temperature":c.id,"data-focus-key":`worker-temperature:${c.id}`,"aria-label":`查看 ${c.name||c.id} 温度趋势`,onClick:()=>o(c.id),children:"温度趋势"}),e.jsx("button",{type:"button",className:"link-button worker-delete danger","data-delete-worker":c.id,"data-focus-key":`worker-delete:${c.id}`,"aria-label":`删除设备 ${c.name||c.id}`,disabled:a,onClick:()=>l(c),children:r===c.id?"正在删除…":"删除设备"})]})]},c.id)}):e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"还没有注册执行端"}),e.jsx("p",{children:"执行端注册并上报心跳后，将在此显示状态。"})]})})}function Gn({gpu:n,ram:t,live:s}){const a=[...n?[{label:`GPU ${n.index??""} 显存`,short:"显存",used:n.memory_used_bytes,total:n.memory_total_bytes,kind:"vram"}]:[],...t?[{label:"系统内存",short:"系统内存",used:t.used_bytes,total:t.total_bytes,kind:"ram"}]:[]].map(i=>{const o=B(i.used),l=B(i.total),p=s&&o!=null&&o>=0&&l!=null&&l>0?Math.max(0,Math.min(100,o/l*100)):null;return{...i,value:p}}),r=s&&n?B(n.temperature_c):null;return e.jsx("div",{className:F.resourceRow,children:e.jsxs("div",{className:F.resourceReadings,children:[n&&e.jsxs("strong",{className:F.resourceTitle,children:[e.jsxs("span",{children:["GPU ",n.index??"未知"," · ",n.name||"未记录型号"]}),e.jsx("span",{children:r==null?"温度未采集":`${r}°C`})]}),a.map(i=>e.jsxs("div",{className:F.resourceReading,"data-resource":i.kind,role:i.value==null?void 0:"meter","aria-label":i.label,"aria-valuemin":i.value==null?void 0:0,"aria-valuemax":i.value==null?void 0:100,"aria-valuenow":i.value??void 0,"aria-valuetext":i.value==null?void 0:`${fe(i.used)} / ${fe(i.total)}，${Math.round(i.value)}%`,children:[e.jsx("span",{className:F.resourceLabel,children:i.short}),e.jsx("span",{children:s?`${fe(i.used)} / ${fe(i.total)}`:"非实时 / 未采集"}),e.jsx("b",{children:i.value==null?"—":`${Math.round(i.value)}%`}),e.jsx("div",{className:F.resourceBar,"data-resource-bar":!0,"aria-hidden":"true",children:i.value!=null&&e.jsx("i",{"data-resource-fill":!0,style:{width:`${i.value}%`}})})]},i.kind)),t&&e.jsx("span",{className:F.resourceNote,children:s?"系统可见容量":"最后配置见详情"})]})})}function Qa({snapshot:n,now:t,onDetails:s}){const a=n.workers.filter(r=>!se(r)||Me(r)||["disabled","error"].includes(r.state||""));return a.length?e.jsx(e.Fragment,{children:a.map(r=>e.jsxs("button",{type:"button",className:"attention-item","data-worker":r.id,"data-focus-key":`worker-attention:${r.id}`,onClick:()=>s(r),children:[e.jsxs("span",{className:"attention-top",children:[e.jsx("strong",{className:"danger",children:r.name||r.id}),e.jsx(nn,{name:"chevron"})]}),e.jsx("b",{className:"danger",children:se(r)?Me(r)?"节点同步失败":Ge(r.state):"已离线"}),e.jsx("p",{children:se(r)?Me(r)&&r.sync_message?r.sync_message:`${an(r)[0]}；查看完整节点详情。`:`最后心跳 ${Cn(r.last_seen,t)}`})]},r.id))}):e.jsx("p",{className:"muted small",children:"当前没有需要关注的节点异常。"})}function ei(n){const{state:t,store:s,service:a,automatic:r,setAutomatic:i,clock:o}=aa(n),{snapshot:l,stale:p,loading:d,error:c,isolated:g,mutation:u,deletingWorker:y}=t,[j,w]=m.useState(null),{history:v}=t,f=v.filter,h=Rs(l,Math.max(o,Date.now())),x=l?.health||{},k=l?.status||{},L=n.sandbox||g||p||!l||u!=null,T=()=>w(null),_=S=>{l&&w({kind:"worker",worker:S,snapshot:l})},N=S=>{if(n.sandbox||!s.canMutate()){n.notify({message:"当前不可更新：隔离副本或服务状态未就绪。",tone:"warning"});return}w(S)},E=()=>{if(n.sandbox||!s.canMutate())throw new Error("隔离副本或服务状态未就绪，禁止修改设备")},b=x.ok===!0?"运行正常":x.ok===!1?"异常":"状态未知",R=x.comfy_online===!0?"可用":x.comfy_online===!1?"不可用":"状态未知",D=[["运行模式",x.mode==="controller"?"Linux 中间层 / Controller":x.mode==="local"?"Windows 单机":x.mode||"未获取"],["可用能力",B(x.capabilities)==null?"未获取":`${x.capabilities} 项`],["任务记录",B(x.jobs)==null?"未获取":`${x.jobs} 条`],["大模型接口",x.llm?x.llm.ok?`已配置 · ${x.llm.model||"型号未记录"}`:"未配置":"未获取"],["页面地址",location.origin+"/controller"],["创作画布",location.origin+"/"]],z=ta(l,v);return e.jsxs("main",{id:"main",className:F.page,tabIndex:-1,"aria-busy":d?!0:void 0,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"运行面板"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{className:"subtitle",id:"service-subtitle",children:l?`中间层${b} / ComfyUI ${R}`:"正在读取中间层运行状态"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{className:"muted small",id:"refresh-state",role:"status",children:d?"正在读取…":p?"连接失败 · 快照非实时":l?`最后刷新 ${new Date(l.receivedAt).toLocaleTimeString("zh-CN",{hour12:!1})}`:"正在加载…"}),e.jsxs("label",{className:"check-label",children:[e.jsx("input",{id:"auto-refresh",type:"checkbox",checked:r,onChange:S=>i(S.target.checked)}),"每5秒刷新"]}),e.jsxs("button",{type:"button",className:"primary",id:"refresh",disabled:d||u!=null,onClick:()=>{s.refreshAll()},children:[e.jsx(nn,{name:"refresh"}),"立即刷新"]}),e.jsx("button",{type:"button",id:"sync-all",disabled:L,title:n.sandbox||g?"本地隔离数据副本禁止节点同步，不能修改正式机器。":void 0,onClick:()=>N({kind:"sync"}),children:"一键更新全部节点"})]})]}),e.jsxs("div",{id:"error",className:"f-error",role:"alert",hidden:!c,children:[e.jsxs("div",{children:[e.jsx("b",{id:"error-message",children:c}),e.jsx("p",{children:"已载入内容仅为上次快照，不能作为实时状态；未知数据不记为零。"})]}),e.jsx("button",{type:"button",id:"retry",disabled:d||u!=null,onClick:()=>{s.refreshAll()},children:"重试读取"})]}),e.jsxs("section",{className:`metrics f-metrics6 ${F.overview}`,"aria-label":"运行概览",children:[e.jsx(we,{id:"service",label:"中间层服务",value:x.ok===!0?"运行正常":x.ok===!1?"异常":"未获取",compact:!0,tone:x.ok===!0?"ok":x.ok===!1?"bad":"",noteId:"service-mode",note:x.mode==="controller"?"Controller 模式":x.mode==="local"?"Windows 单机":x.mode||"等待服务响应"}),e.jsx(we,{id:"workers",label:"在线执行端",value:l?`${ye(x.online_workers)} / ${ye(x.workers)}`:"未获取",note:"含禁用与同步中的在线节点"}),e.jsx(we,{id:"running",label:"正在运行",value:ye(k.running_count),note:"由中间层调度的任务"}),e.jsx(we,{id:"queued",label:"排队任务",value:ye(k.queued_count),note:"等待可用执行端"}),e.jsx(we,{id:"comfy",label:"ComfyUI",value:x.comfy_online===!0?"可用":x.comfy_online===!1?"不可用":"未获取",compact:!0,tone:x.comfy_online===!0?"ok":x.comfy_online===!1?"bad":"",note:"单节点状态见下方卡片"}),e.jsx(we,{id:"uptime",label:"服务运行时间",value:B(x.started_at)!=null&&B(x.server_time)!=null?$n(Number(x.server_time)-Number(x.started_at)):"未获取",compact:!0,note:"本次中间层服务启动至今"})]}),e.jsxs("div",{className:"dashboard-grid",children:[e.jsxs("section",{className:"card","aria-labelledby":"workers-title",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"workers-title",children:"Windows 执行端"}),e.jsx("p",{className:"section-subtitle",children:"设备资源、当前任务与同步状态"})]}),e.jsx("span",{className:"muted small",id:"worker-count",children:l?`${l.workers.length} 台 / ${l.workers.filter(se).reduce((S,Q)=>S+Ke(Q).length,0)} 张在线GPU`:"正在读取"})]}),e.jsx("div",{id:"worker-rows",className:F.workerGrid,children:l?e.jsx(Za,{snapshot:l,now:h,stale:p,mutationDisabled:L,deletingWorker:y,onDetails:_,onTemperature:S=>w({kind:"temperature",id:S}),onDelete:S=>N({kind:"delete",worker:S}),onSync:S=>N({kind:"syncWorker",worker:S})}):e.jsx("p",{className:"loading-note",children:c?"执行端读取失败，请点击“重试读取”。":"正在读取执行端…"})}),e.jsx("p",{className:"table-note",children:"显存与内存分条显示，多显卡逐卡列出，系统内存不重复。离线或过期读数不作实时数据。点击清单差异可仅同步该设备。"})]}),e.jsxs("aside",{className:"right-column","aria-label":"需要关注及配置",children:[e.jsxs("section",{className:"card",children:[e.jsx("div",{className:"section-heading",children:e.jsxs("h2",{className:"heading-inline",children:[e.jsx("span",{className:"danger",id:"attention-icon",children:e.jsx(nn,{name:"alert"})}),"需要关注"]})}),e.jsx("div",{className:"attention-list",id:"attention-list",tabIndex:0,role:"region","aria-label":"需要关注的节点列表",children:l?e.jsx(Qa,{snapshot:l,now:h,onDetails:_}):e.jsx("p",{className:"muted small",children:c?"节点状态未获取，不能判断是否存在异常。":"正在读取节点状态…"})})]}),e.jsxs("section",{className:"card",children:[e.jsx("div",{className:"section-heading",children:e.jsx("h2",{children:"服务配置摘要"})}),e.jsx(bt,{id:"config-rows",className:"f-config-definition",rows:D})]})]})]}),e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"最近任务"}),e.jsx("p",{className:"section-subtitle",children:"数据库历史按时间倒序分批加载；实时任务优先显示，归档未记录的信息不作推测"})]}),e.jsxs("label",{className:"filter-label",children:["任务状态",e.jsxs("select",{id:"jobs-filter",value:f,onChange:S=>{const Q=Vs.safeParse(S.target.value);Q.success&&s.setHistoryFilter(Q.data)},children:[e.jsx("option",{value:"all",children:"全部状态"}),["running","queued","done","error","canceled"].map(S=>e.jsx("option",{value:S,children:ct[S]},S))]})]})]}),e.jsx("div",{className:"table-wrap f-job-scroll",role:"region","aria-label":"最近任务列表","aria-describedby":"job-note","aria-busy":!!v.loading,tabIndex:0,onScroll:S=>{const{scrollHeight:Q,scrollTop:J,clientHeight:ee}=S.currentTarget;Q-J-ee<=160&&!v.error&&s.loadMore()},children:e.jsxs("table",{className:"jobs-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["状态","姓名 / 项目 / 卡片","模式","过程进度 / 步骤","执行端","创建时间","耗时 / 错误"].map(S=>e.jsx("th",{scope:"col",children:S},S))})}),e.jsx("tbody",{id:"job-rows",children:e.jsx(la,{snapshot:l,now:h,items:z,onError:S=>w({kind:"job",job:S})})})]})}),e.jsxs("div",{className:F.historyControls,children:[e.jsxs("p",{className:"table-note",id:"job-note",role:"status","aria-live":"polite",children:[v.loading?v.loading==="more"?"正在加载更多历史…":"正在刷新任务历史…":v.initialized?v.hasMore?"向下滚动或点击加载更多。":"历史记录已加载完毕。":"任务历史尚未载入。",` 当前筛选历史共 ${v.total??"未知"} 条，已加载 ${v.jobs.length} 条；合并实时任务后显示 ${z.length} 条。`]}),v.error&&e.jsx("p",{role:"alert",children:v.error}),v.error?e.jsx("button",{type:"button",disabled:!!v.loading,onClick:()=>{s.retryHistory()},children:"重试任务历史"}):e.jsx("button",{type:"button","aria-controls":"job-rows",disabled:!!v.loading||!v.hasMore,onClick:()=>{s.loadMore()},children:"加载更多历史"})]})]})]}),j?.kind==="worker"&&e.jsx(Ya,{worker:l?.workers.find(S=>S.id===j.worker.id)||j.worker,snapshot:l||j.snapshot,now:h,stale:p,restartUnavailable:n.sandbox||g?"隔离副本禁止重启真实设备。":u!=null?"设备操作正在提交，请稍候。":!l||p?"服务状态未就绪，请刷新后重试。":l.workers.some(S=>S.id===j.worker.id)?"":"该设备已移除或已被新的注册替代。",onRestart:async S=>{E(),await s.restartWorker(j.worker.id,S)},onClose:T}),j?.kind==="temperature"&&e.jsx(Ga,{workerId:j.id,worker:l?.workers.find(S=>S.id===j.id),service:a,now:h,stale:p,revision:t.refreshed,onClose:T}),j?.kind==="job"&&e.jsxs(te,{title:"任务错误详情",onClose:T,children:[e.jsxs("p",{children:["任务 ",j.job.id]}),e.jsx("pre",{children:j.job.error||"未记录错误详情"}),e.jsxs("details",{children:[e.jsx("summary",{children:"任务执行记录"}),e.jsx("pre",{children:JSON.stringify(j.job,null,2)})]})]}),j?.kind==="syncWorker"&&e.jsxs(te,{title:"同步单台设备",onClose:T,submitLabel:"确认同步此设备",onSubmit:async()=>{E(),await s.syncWorker(j.worker.id),n.notify({message:`同步请求已提交至“${j.worker.name||j.worker.id}”，等待设备空闲后执行；完成情况以节点反馈为准。`,tone:"success"})},children:[e.jsxs("p",{children:["仅同步这一台设备“",j.worker.name||j.worker.id,"”（",j.worker.id,"），不更新其他设备。"]}),e.jsx("div",{className:"notice-box",children:"设备空闲后同步主节点的 ComfyUI 核心、models 和 user，拉取 chouka 最新代码，再按本机 GPU 启动配置重启 ComfyUI 与 Worker，不重启 Windows。同步会复制或覆盖对应文件，并非仅补齐缺失项；不会清除设备上的全部额外资源。"}),e.jsx("p",{children:"忙碌时等待当前任务结束，不立即中断任务。请求提交不代表同步已完成；同步结束后需重新采集清单核对。"})]}),j?.kind==="sync"&&e.jsxs(te,{title:"更新全部节点",onClose:T,submitLabel:"确认更新",onSubmit:async()=>{E();const S=await s.syncAll();n.notify({message:`已向 ${ye(S.worker_count)} 个节点下发更新请求；主节点跳过 ${ye(S.primary_count)} 个，旧版跳过 ${ye(S.skipped_count)} 个。`,tone:"success"})},children:[e.jsx("p",{children:"确认更新全部节点？"}),e.jsx("div",{className:"notice-box",children:"节点空闲后依次同步 ComfyUI 核心、models 和 user，拉取 chouka 最新代码，再按本机 GPU 启动配置重启 ComfyUI 与 Worker。全部服务恢复就绪后才显示完成。忙碌节点等待当前任务结束；离线节点下次上线后执行。主节点作为同步源不会参与更新；旧版节点会跳过，需先手动更新一次 Worker 及配套启动文件。"}),e.jsx("p",{className:"muted small",children:"这是实际节点更新和服务重启操作，确认后将向中间层提交请求。"})]}),j?.kind==="delete"&&e.jsxs(te,{title:"删除设备",onClose:T,submitLabel:"确认删除设备",onSubmit:async()=>{E(),await s.deleteWorker(j.worker.id),n.notify({message:"设备已删除，历史任务和账单保留。",tone:"success"})},children:[e.jsxs("p",{children:["确认删除设备“",j.worker.name||"未命名执行端","”？"]}),e.jsx("div",{className:"notice-box",children:"设备会从列表中移除，历史任务和账单不会删除。设备后续重新注册时会重新出现。"})]})]})}function we({id:n,label:t,value:s,note:a,noteId:r,compact:i=!1,tone:o=""}){return e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:t}),e.jsx("p",{className:`metric-value${i?" compact":""}${o?` ${o}`:""}`,id:n,children:s}),e.jsx("p",{className:"metric-note",id:r,children:a})]})})}const De=pe([C().min(1),V().finite()]).transform(String),Re=Ve(["user","admin","monitor"]),Ue=Ve(["read","operate"]),ni=q({id:De,username:C(),display_name:C().nullish(),phone:C().nullish(),role:Re,enabled:Y(),team_leader:Y().default(!1),approval_status:C().optional()}),ti=q({id:C().min(1),name:C().nullish(),owner_id:De,owner_username:C().nullish(),owner_display_name:C().nullish(),team_id:C().nullish(),team_name:C().nullish()}),Kn=pe([q({scope:re("all"),viewer_id:De,permission:Ue}),q({scope:re("owner").optional(),viewer_id:De,owner_id:De.refine(n=>n!=="*","无效所有者"),permission:Ue})]),si=q({requests:O(q({username:C(),display_name:C().nullish(),status:C(),created_at:V().nullish(),decided_by:C().nullish()})),outbox:q({pending:V().int().nonnegative(),oldest_at:V().nullish()}).nullish()}),yt={admin:"管理员",user:"普通用户",monitor:"监控展示员"},tn={approved:"已通过",pending:"待审批",rejected:"已拒绝"},Ze="全部个人和项目组画布，包括现有及未来新增画布",vt="画布内容和历史费用不变。新所有者的授权访问者将获得相应权限（可操作包含删除）；原所有者及其授权访问者可能失去访问权限。管理员仍可访问全部画布。项目组画布由成员关系授权，不能改为个人归属。";function We(n){return(n?.username||"未知账号")+(n?.display_name?.trim()?`（${n.display_name.trim()}）`:"")}function me(n,t){return`${We(n.find(s=>s.id===t))}（ID: ${t}）`}function yn(n,t){const s=t.find(a=>a.id===n.owner_id);return We({username:n.owner_username||s?.username,display_name:n.owner_display_name||s?.display_name})}function vn(n){return n==="operate"?"可操作（含删除）":"只读"}function jt(n){return n?new Date(n*1e3).toLocaleString("zh-CN",{hour12:!1}):"—"}const ue=C().min(1).max(512).refine(n=>n!=="*","无效账号 ID"),wt=C().min(8,"密码至少 8 位").max(1024),ai=q({username:C().trim().min(1,"请输入账号名").max(128),password:wt,role:Re,team_leader:Y()}).refine(n=>n.role!=="monitor"||!n.team_leader,"监控展示员不能担任组长"),ii=Xt("scope",[q({scope:re("all"),viewer_id:ue,permission:Ue}),q({scope:re("owner"),viewer_id:ue,owner_id:ue,permission:Ue}).refine(n=>n.viewer_id!==n.owner_id,"访问者和所有者不能是同一个账号。")]),ri=q({owner_id:ue,projects:O(q({project_id:C().min(1).max(512),owner_id:ue})).min(1,"请选择画布").max(1e3,"每次最多分配 1000 个画布")}).refine(n=>new Set(n.projects.map(t=>t.project_id)).size===n.projects.length,"画布分配清单存在重复项"),Jn=q({}).passthrough(),Xn=n=>`/api/admin/global-grants/${encodeURIComponent(ue.parse(n))}`,Yn=n=>`/api/admin/users/${encodeURIComponent(ue.parse(n))}`;function oi(n){const t=async(s,a,r)=>{Jn.parse(await n.json(s,a,r))};return{async snapshot(s){const a={signal:s,cache:"no-store"},[r,i,o]=await Promise.all([n.read("/api/admin/users",q({users:O(ni)}),a),n.read("/api/admin/grants",q({grants:O(Kn)}),a),n.read("/api/projects",q({projects:O(ti)}),a)]);return{users:r.users,grants:i.grants,projects:o.projects}},registrations:s=>n.read("/api/admin/registrations",si,{signal:s,cache:"no-store"}),create:s=>t("/api/admin/users","POST",ai.parse(s)),update:(s,a)=>{const r=pe([q({role:Re}).strict(),q({enabled:Y()}).strict(),q({team_leader:Y()}).strict()]).parse(a);return t(Yn(s),"PATCH",r)},resetPassword:(s,a)=>t(`${Yn(s)}/password`,"POST",{password:wt.parse(a)}),saveGrant:s=>{const a=ii.parse(s);return a.scope==="all"?t(Xn(a.viewer_id),"PUT",{permission:a.permission}):t("/api/admin/grants","PUT",{viewer_id:a.viewer_id,owner_id:a.owner_id,permission:a.permission})},async revokeGrant(s){const a=Kn.parse(s),r=a.scope==="all"?Xn(a.viewer_id):`/api/admin/grants/${encodeURIComponent(ue.parse(a.viewer_id))}/${encodeURIComponent(ue.parse(a.owner_id))}`;Jn.parse(await n.request(r,{method:"DELETE"}))},async assign(s){const a=await n.json("/api/admin/projects/assign","POST",ri.parse(s));return q({count:V().int().nonnegative()}).parse(a).count}}}function _e(n,t){const s=new FormData(n).get(t);if(typeof s!="string")throw new Error("表单字段不正确："+t);return s}function li(n,t,s){const a=t.trim().toLowerCase();return n.filter(r=>(!s||r.owner_id===s)&&(!a||(r.name||"").toLowerCase().includes(a)||r.id.toLowerCase().includes(a)))}function ci(n,t){const s=n.filter(r=>!r.team_id),a=s.filter(r=>t.has(r.id)).length;return{personal:s,checked:s.length>0&&a===s.length,indeterminate:a>0&&a<s.length}}function di(n,t,s,a){const r=n.find(i=>i.id===t);if(!r||r.role==="monitor"||s!=="*"&&!n.some(i=>i.id===s))throw new Error("请选择有效账号和授权范围。");if(t===s)throw new Error("访问者和所有者不能是同一个账号。");return s==="*"?{scope:"all",viewer_id:t,permission:a}:{scope:"owner",viewer_id:t,owner_id:s,permission:a}}function pi(n,t,s,a){const r=n.find(o=>o.id===a&&o.enabled&&o.role!=="monitor");if(!r)throw new Error("请选择有效的启用目标账号。");if(!s.size)throw new Error("请选择个人画布。");if(s.size>1e3)throw new Error("每次最多分配 1000 个画布，请缩小筛选范围后再选择。");const i=t.filter(o=>s.has(o.id));if(i.length!==s.size||i.some(o=>o.team_id))throw new Error("选择包含项目组画布或已变化的画布，请刷新后重新选择。");return{target:r,chosen:i.map(o=>({...o})),payload:{owner_id:r.id,projects:i.map(o=>({project_id:o.id,owner_id:o.owner_id}))}}}function mi({http:n,notify:t}){const s=m.useMemo(()=>oi(n),[n]),[a,r]=m.useState({users:[],projects:[],grants:[]}),[i,o]=m.useState(null),[l,p]=m.useState(""),[d,c]=m.useState(!1),[g,u]=m.useState(!0),[y,j]=m.useState(!1),[w,v]=m.useState(""),[f,h]=m.useState("正在加载真实数据…"),[x,k]=m.useState(new Set),[L,T]=m.useState(""),_=m.useRef(!1),N=m.useRef(!1),E=m.useRef(!1),b=m.useRef(0),R=m.useRef(null),D=m.useRef(t);m.useEffect(()=>{D.current=t},[t]);const z=m.useCallback(async()=>{if(_.current)return;_.current=!0;const J=++b.current,ee=new AbortController;R.current=ee;const oe=()=>E.current&&b.current===J;u(!0),h("正在加载真实数据…");try{const be=await s.snapshot(ee.signal);if(!oe())return;r(be),c(!0),k(new Set);try{const je=await s.registrations(ee.signal);if(!oe())return;o(je),p("")}catch(je){if(!oe())return;o(null);const Dn="注册申请信息加载失败："+ne(je);p(Dn),D.current({message:Dn,tone:"error"})}oe()&&h("更新于 "+new Date().toLocaleTimeString("zh-CN",{hour12:!1}))}catch(be){if(!oe())return;throw c(!1),h("加载失败，请刷新重试"),be}finally{oe()&&(_.current=!1,u(!1))}},[s]),S=m.useCallback(async()=>{if(!(N.current||_.current)){v("");try{await z()}catch(J){if(!E.current)return;const ee=ne(J);v(ee),D.current({message:ee,tone:"error"})}}},[z]);return m.useEffect(()=>(E.current=!0,S(),()=>{E.current=!1,R.current?.abort(),_.current=!1}),[S]),{...a,service:s,registrations:i,registrationError:l,ready:d,loading:g,mutationBusy:y,error:w,setError:v,refreshNote:f,selected:x,setSelected:k,assignStatus:L,setAssignStatus:T,refreshPage:S,mutate:async(J,ee,oe)=>{if(N.current||_.current||!d)throw new Error("另一项操作正在提交或列表尚未就绪，请稍后重试。");N.current=!0,j(!0),v("");try{if(await J(),!E.current)return;oe?.(),D.current({message:ee,tone:"success"});try{await z()}catch(be){if(!E.current)return;const je="操作已成功，但列表刷新失败，请点击刷新数据后继续："+ne(be);v(je),D.current({message:je,tone:"warning"})}}finally{N.current=!1,E.current&&j(!1)}}}}function _t({initial:n="user",onChange:t}){return e.jsxs("label",{className:"field",children:["角色",e.jsx("select",{name:"role",defaultValue:n,onChange:s=>t?.(Re.parse(s.currentTarget.value)),children:["user","admin","monitor"].map(s=>e.jsx("option",{value:s,children:yt[s]},s))})]})}function kt(){return e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"field",children:["新密码（至少 8 位）",e.jsx("input",{name:"password",type:"password",minLength:8,maxLength:1024,autoComplete:"new-password",required:!0})]}),e.jsx("p",{className:"notice-box",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。密码不会显示在列表中。"})]})}function ui(){const[n,t]=m.useState("user"),[s,a]=m.useState(!1);return e.jsxs("div",{id:"create",className:"form-grid",children:[e.jsxs("label",{className:"field",children:["账号名",e.jsx("input",{name:"username",required:!0,maxLength:128,autoComplete:"off"})]}),e.jsx(kt,{}),e.jsx(_t,{onChange:r=>{t(r),r==="monitor"&&a(!1)}}),e.jsxs("label",{className:"check-label",children:[e.jsx("input",{name:"team_leader",type:"checkbox",checked:s,disabled:n==="monitor",onChange:r=>a(r.currentTarget.checked)}),"独立授予组长权限"]}),e.jsx("p",{className:"notice-box",children:"创建后账号启用并标记为已通过。监控展示员不能担任组长，密码由管理员重置；其他账号登录后可自行修改。"})]})}function Le({name:n,id:t}){return e.jsxs("span",{className:"perm-identity",children:[e.jsx("span",{className:"perm-username",children:n}),e.jsxs("span",{className:"perm-user-id",children:["ID: ",t]})]})}function rn({columns:n,children:t}){return e.jsx("tr",{children:e.jsx("td",{colSpan:n,children:t})})}function hi({users:n,busy:t,ready:s,action:a}){return e.jsx("div",{className:"table-wrap accounts-scroll",tabIndex:0,role:"region","aria-label":"账号列表",children:e.jsxs("table",{className:"accounts-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["账号 / ID","姓名 / 花名","手机号","角色","独立组长权限","启用状态","审批","操作"].map(r=>e.jsx("th",{scope:"col",children:r},r))})}),e.jsxs("tbody",{id:"users",children:[n.map(r=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx(Le,{name:r.username,id:r.id})}),e.jsx("td",{children:r.display_name||"—"}),e.jsx("td",{children:r.phone||"未填写"}),e.jsx("td",{children:e.jsx("span",{className:"f-chip "+(r.role==="admin"?"admin":""),children:yt[r.role]})}),e.jsx("td",{children:r.team_leader?"是":"否"}),e.jsx("td",{children:e.jsx("span",{className:"f-chip "+(r.enabled?"on":"off"),children:r.enabled?"启用":"已停用"})}),e.jsx("td",{children:Object.hasOwn(tn,r.approval_status||"")?tn[r.approval_status||""]:"—"}),e.jsx("td",{children:e.jsxs("div",{className:"row-actions",children:[e.jsx("button",{type:"button",className:r.enabled?"danger":"",disabled:t,onClick:()=>a(r,"enabled"),children:r.enabled?"停用":"启用"}),e.jsx("button",{type:"button",disabled:t,onClick:()=>a(r,"role"),children:"修改角色"}),r.role!=="monitor"&&e.jsx("button",{type:"button",disabled:t,onClick:()=>a(r,"leader"),children:r.team_leader?"取消组长权限":"设为组长"}),e.jsx("button",{type:"button",disabled:t,onClick:()=>a(r,"password"),children:"重置密码"})]})})]},r.id)),!n.length&&e.jsx(rn,{columns:8,children:s?"暂无账号。":"正在加载账号…"})]})]})})}function xi({data:n,error:t}){return e.jsx("div",{className:"table-wrap registrations-scroll",tabIndex:0,role:"region","aria-label":"注册申请列表",children:e.jsxs("table",{className:"registration-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["账号","姓名 / 花名","状态","申请时间","审批人"].map(s=>e.jsx("th",{scope:"col",children:s},s))})}),e.jsxs("tbody",{id:"registrations",children:[n?.requests.map((s,a)=>e.jsxs("tr",{children:[e.jsx("td",{children:s.username}),e.jsx("td",{children:s.display_name||"—"}),e.jsx("td",{children:Object.hasOwn(tn,s.status)?tn[s.status]:s.status}),e.jsx("td",{children:jt(s.created_at)}),e.jsx("td",{children:s.decided_by||"—"})]},s.username+"-"+a)),!n?.requests.length&&e.jsx(rn,{columns:5,children:t?"暂时无法加载注册申请，请点击刷新数据重试。":n?"暂无自主注册申请。":"正在加载注册申请…"})]})]})})}function fi({grants:n,users:t,busy:s,ready:a,revoke:r}){return e.jsx("div",{className:"table-wrap",tabIndex:0,role:"region","aria-label":"画布授权列表",children:e.jsxs("table",{className:"grant-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["访问者 A","方向","所有者 / 授权范围","权限","操作"].map(i=>e.jsx("th",{scope:"col",children:i},i))})}),e.jsxs("tbody",{id:"grants",children:[n.map(i=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx(Le,{name:We(t.find(o=>o.id===i.viewer_id)),id:i.viewer_id})}),e.jsx("td",{children:"→"}),e.jsx("td",{children:i.scope==="all"?e.jsxs(e.Fragment,{children:["所有画布",e.jsx("span",{className:"perm-user-id",children:Ze})]}):e.jsx(Le,{name:We(t.find(o=>o.id===i.owner_id)),id:i.owner_id})}),e.jsx("td",{children:vn(i.permission)}),e.jsx("td",{children:e.jsx("button",{type:"button",className:"danger",disabled:s,onClick:()=>r(i),children:"撤销"})})]},i.viewer_id+"-"+(i.scope==="all"?"*":i.owner_id))),!n.length&&e.jsx(rn,{columns:5,children:a?"暂无画布授权。选择访问者与所有者 / 授权范围后保存。":"正在加载授权…"})]})]})})}function gi({projects:n,users:t,target:s}){return e.jsx("div",{className:"dialog-list",tabIndex:0,role:"region","aria-label":"画布分配确认明细",children:e.jsxs("table",{children:[e.jsx("thead",{children:e.jsx("tr",{children:["画布名称","画布 ID","旧归属","目标归属"].map(a=>e.jsx("th",{scope:"col",children:a},a))})}),e.jsx("tbody",{children:n.map(a=>e.jsxs("tr",{children:[e.jsx("td",{children:a.name||"未命名画布"}),e.jsx("td",{children:a.id}),e.jsx("td",{children:e.jsx(Le,{name:yn(a,t),id:a.owner_id})}),e.jsx("td",{children:e.jsx(Le,{name:We(s),id:s.id})})]},a.id))})]})})}function bi({projects:n,users:t,busy:s,ready:a,selected:r,setSelected:i,status:o,onConfirm:l,onError:p}){const[d,c]=m.useState(""),[g,u]=m.useState(""),[y,j]=m.useState(""),w=new Map(n.map(_=>[_.owner_id,`${yn(_,t)}（ID: ${_.owner_id}）`])),v=w.has(g)?g:"",f=t.filter(_=>_.enabled&&_.role!=="monitor"),h=f.some(_=>_.id===y)?y:"",x=li(n,d,v),k=ci(x,r),L=m.useRef(null);m.useEffect(()=>{L.current&&(L.current.indeterminate=k.indeterminate)},[k.indeterminate]);const T=_=>{_(),i(new Set)};return e.jsxs("section",{className:"card","aria-labelledby":"history-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"history-heading",tabIndex:-1,children:"历史画布分配"}),e.jsx("span",{className:"small muted",children:"仅个人空间 / 每次最多 1000 个"})]}),e.jsx("div",{className:"f-pad",children:e.jsx("p",{className:"notice-box",children:vt})}),e.jsxs("div",{className:"allocation-tools",children:[e.jsxs("div",{className:"allocation-filters",children:[e.jsxs("label",{className:"field",children:["搜索名称 / ID",e.jsx("input",{id:"project-search",type:"search",autoComplete:"off",placeholder:"输入画布名称或 ID",value:d,disabled:s,onChange:_=>T(()=>c(_.currentTarget.value))})]}),e.jsxs("label",{className:"field",children:["当前所有者",e.jsxs("select",{id:"project-owner",value:v,disabled:s,onChange:_=>T(()=>u(_.currentTarget.value)),children:[e.jsx("option",{value:"",children:"全部所有者"}),[...w].map(([_,N])=>e.jsx("option",{value:_,children:N},_))]})]})]}),e.jsxs("form",{id:"assign",className:"allocation-batch","aria-busy":s,onSubmit:_=>{if(_.preventDefault(),!s)try{l(pi(t,x,r,h))}catch(N){p(ne(N))}},children:[e.jsxs("label",{className:"field",children:["目标账号（仅启用账号）",e.jsxs("select",{name:"owner_id",required:!0,value:h,disabled:s,onChange:_=>j(_.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择目标账号"}),f.map(_=>e.jsx("option",{value:_.id,children:me(t,_.id)},_.id))]})]}),e.jsxs("span",{id:"project-selected",role:"status",children:["已选 ",r.size," 个画布",r.size>1e3?"（超过 1000 个上限）":""]}),e.jsx("button",{id:"assign-submit",className:"primary",disabled:s||!r.size||!h,children:"分配所选画布"}),e.jsx("button",{id:"clear-selection",type:"button",disabled:s||!r.size,onClick:()=>i(new Set),children:"清空选择"})]})]}),e.jsx("p",{id:"assign-status",className:"table-note f-status",role:"status",children:o}),e.jsx("div",{className:"table-wrap history-scroll",tabIndex:0,role:"region","aria-label":"历史画布列表",children:e.jsxs("table",{className:"allocation-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{scope:"col",children:e.jsx("input",{ref:L,id:"project-all",type:"checkbox","aria-label":"全选当前筛选结果中的个人画布",checked:k.checked,disabled:s||!k.personal.length,onChange:_=>i(new Set(_.currentTarget.checked?k.personal.map(N=>N.id):[]))})}),["画布名称","画布 ID","当前所有者","空间"].map(_=>e.jsx("th",{scope:"col",children:_},_))]})}),e.jsxs("tbody",{id:"projects",children:[x.map(_=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("input",{type:"checkbox","data-team":String(!!_.team_id),checked:r.has(_.id),"aria-label":`选择画布 ${_.name||"未命名画布"}（${_.id}）`,disabled:s||!!_.team_id,onChange:N=>{const E=new Set(r);N.currentTarget.checked?E.add(_.id):E.delete(_.id),i(E)}})}),e.jsx("td",{children:_.name||"未命名画布"}),e.jsx("td",{className:"perm-id",children:_.id}),e.jsx("td",{children:e.jsx(Le,{name:yn(_,t),id:_.owner_id})}),e.jsx("td",{children:_.team_id?e.jsxs(e.Fragment,{children:["项目组：",_.team_name||_.team_id,e.jsx("span",{className:"team-space",children:"由成员关系授权，不可改为个人归属"})]}):"个人空间"})]},_.id)),!x.length&&e.jsx(rn,{columns:5,children:a?"暂无符合条件的画布，请尝试更换搜索词或当前所有者。":"正在加载画布…"})]})]})}),e.jsx("p",{className:"table-note",children:"搜索或切换当前所有者会清空选择。全选只选择当前筛选结果中的个人画布，项目组画布不可选；超过 1000 个时请缩小筛选范围。"})]})}function yi(n){const t=mi(n),{users:s,grants:a,projects:r,service:i}=t,[o,l]=m.useState(null),[p,d]=m.useState(""),[c,g]=m.useState(""),[u,y]=m.useState(""),j=m.useRef(null),w=t.loading||t.mutationBusy||!t.ready,v=w&&!o,f=b=>{t.setError(b),n.notify({message:b,tone:"error"})},h=b=>{!w&&!o&&l(b)},x=(b,R)=>{const D=e.jsxs("p",{children:["目标账号：",e.jsx("b",{children:me(s,b.id)})]});if(R==="password")return h({title:"重置密码",children:e.jsxs(e.Fragment,{children:[D,e.jsx(kt,{}),e.jsx("p",{className:"notice-box danger",children:"该账号现有会话将失效，需要使用新密码重新登录。请妥善告知本人。"})]}),submitLabel:"确认重置密码",action:ee=>i.resetPassword(b.id,_e(ee,"password")),message:"密码已重置"});if(R==="role")return h({title:"修改账号角色",children:e.jsxs(e.Fragment,{children:[D,e.jsx(_t,{initial:b.role}),e.jsx("p",{className:"notice-box danger",children:"管理员天然可访问全部画布。切换为监控展示员会清除组长权限，已有画布授权保留但不生效；其他角色的组长权限不变。修改角色会使该账号现有会话失效；最后一位启用管理员受系统保护。"})]}),submitLabel:"确认修改角色",action:ee=>i.update(b.id,{role:Re.parse(_e(ee,"role"))}),message:"账号角色已修改"});const z=R==="enabled",S=z?!b.enabled:!b.team_leader,Q=z?S?"启用账号":"停用账号":S?"授予组长权限":"取消组长权限",J=z?S?"启用不会跳过钉钉注册审批，审批状态保持不变。":"停用后该账号不能继续登录，现有会话失效。不会删除既有项目组关系或画布授权；最后一位启用管理员受系统保护。":S?"授予该用户创建项目组和管理自己创建项目组的权限，不会成为管理员，也不能管理其他人的项目组。现有会话失效后需重新登录。":"取消后不能继续创建项目组，现有会话失效。已授予的组内组长身份和成员关系保持不变，仍可管理对应项目组。";h({title:Q,children:e.jsxs(e.Fragment,{children:[D,e.jsx("p",{className:"notice-box",children:J})]}),submitLabel:"确认"+Q,action:()=>i.update(b.id,z?{enabled:S}:{team_leader:S}),message:Q+"成功"})},k=b=>{const R=b.scope==="all"?"所有画布（"+Ze+"）":me(s,b.owner_id);h({title:"确认撤销授权",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:[me(s,b.viewer_id)," → ",R]}),e.jsxs("p",{children:["权限：",vn(b.permission)]}),e.jsx("p",{className:"notice-box danger",children:"撤销后即时重新校验权限，访问者失去这条授权带来的全部画布访问权。此授权不会使其成为管理员；管理员天然权限、项目组成员关系和其他独立授权不受影响。"})]}),submitLabel:"确认撤销授权",action:()=>i.revokeGrant(b),message:"已撤销画布授权"})},L=s.filter(b=>b.role!=="monitor"),T=L.some(b=>b.id===c)?c:"",_=u==="*"||s.some(b=>b.id===u)?u:"",N=[{id:"users",label:"账号总数",value:s.length,note:"角色与独立组长权限分别管理"},{id:"enabled",label:"启用账号",value:s.filter(b=>b.enabled).length,note:"停用不会删除账号或画布授权"},{id:"pending",label:"待审批注册",value:t.registrations?.requests.filter(b=>b.status==="pending").length??"—",note:"仅由钉钉指定审批人处理"},{id:"grants",label:"画布授权",value:a.length,note:"访问者 A → 所有者 / 授权范围"}],E=t.registrations?.outbox;return e.jsxs("main",{id:"main",tabIndex:-1,ref:j,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"账号与权限"}),e.jsx("div",{className:"page-caption",children:e.jsx("p",{className:"subtitle",children:"管理账号、画布访问与历史画布归属"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{id:"refresh-note",className:"refresh-note",role:"status",children:t.refreshNote}),e.jsx("button",{id:"refresh",type:"button",disabled:t.loading||t.mutationBusy||!!o,onClick:()=>{t.refreshPage()},children:"刷新数据"})]})]}),e.jsx("p",{id:"error",className:"page-status",role:"alert",children:t.error}),e.jsx("section",{className:"metrics","aria-label":"权限概览",children:N.map(b=>e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:b.label}),e.jsx("p",{id:"metric-"+b.id,className:"metric-value",children:b.id==="pending"||t.ready||s.length?b.value:"—"}),e.jsx("p",{className:"metric-note",children:b.note})]})},b.id))}),e.jsx("nav",{className:"section-nav","aria-label":"权限管理分区",children:[["accounts","账号管理"],["registrations","注册申请"],["grants","画布授权"],["history","历史画布分配"]].map(([b,R])=>e.jsx("a",{href:"#"+b+"-heading",onClick:()=>j.current?.querySelector("#"+b+"-heading")?.focus(),children:R},b))}),e.jsxs("section",{className:"card","aria-labelledby":"accounts-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"accounts-heading",tabIndex:-1,children:"账号管理"}),e.jsx("p",{className:"section-subtitle",children:"账号角色包括管理员、普通用户和监控展示员。监控展示员仅可查看监控，不能担任组长或访问画布。"})]}),e.jsx("button",{id:"create-user",type:"button",className:"primary",disabled:v,onClick:()=>h({title:"新建账号",children:e.jsx(ui,{}),submitLabel:"创建账号",action:b=>i.create({username:_e(b,"username").trim(),password:_e(b,"password"),role:Re.parse(_e(b,"role")),team_leader:new FormData(b).has("team_leader")}),message:"账号已创建"}),children:"新建账号"})]}),e.jsx(hi,{users:s,busy:v,ready:t.ready,action:x}),e.jsx("p",{className:"table-note",children:"启停、角色、组长权限及重置密码均需确认。初始密码至少 8 位，请勿使用常见弱密码；监控展示员的密码由管理员重置，其他账号登录后可自行修改。"})]}),e.jsxs("div",{className:"permissions-grid",children:[e.jsxs("section",{className:"card","aria-labelledby":"registrations-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"registrations-heading",tabIndex:-1,children:"注册申请"}),e.jsx("span",{className:"small muted",children:"仅查看钉钉审批结果"})]}),e.jsxs("div",{className:"f-pad form-grid",children:[e.jsx("p",{className:"notice-box",children:"自主注册由钉钉群内两位指定审批人在卡片上处理，任意一人先决生效。网页不提供通过或拒绝操作。"}),e.jsx("p",{id:"outbox-status",className:"f-status",role:"status",children:t.registrationError||(t.registrations?E&&E.pending>0?`审批通知积压 ${E.pending} 条（最早 ${E.oldest_at?jt(E.oldest_at):"时间未知"}），系统会自动重试投递。`:"审批通知投递正常。":"")})]}),e.jsx(xi,{data:t.registrations,error:t.registrationError})]}),e.jsxs("section",{className:"card","aria-labelledby":"grants-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"grants-heading",tabIndex:-1,children:"画布授权"}),e.jsx("span",{className:"small muted",children:"访问者 A → 所有者 / 授权范围"})]}),e.jsx("div",{className:"f-pad",children:e.jsx("p",{id:"grant-help",className:"notice-box",children:"选择指定所有者，A 可查看或操作其当前及以后创建的全部个人画布；选择“所有画布”则覆盖全部个人和项目组画布，包括现有及未来新增画布。可操作包含删除；授权不传递，也不会成为管理员。管理员天然可访问全部画布，停用账号不会因授权恢复登录权限。"})}),e.jsxs("form",{id:"grant",className:"grant-form","aria-describedby":"grant-help","aria-busy":t.mutationBusy,onSubmit:b=>{if(b.preventDefault(),!w){d("");try{const R=di(s,T,_,Ue.parse(_e(b.currentTarget,"permission"))),D=R.scope==="all"?"所有画布（"+Ze+"）":me(s,R.owner_id),z=R.scope==="all"?"覆盖"+Ze+"，不受所有者或项目组成员关系限制。":"覆盖所有者当前和以后创建的全部个人画布，不包含项目组画布。";h({title:"确认画布授权",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["访问者 A：",me(s,R.viewer_id)]}),e.jsxs("p",{children:["所有者 / 授权范围：",D]}),e.jsxs("p",{children:["权限：",e.jsx("b",{children:vn(R.permission)})]}),e.jsxs("p",{className:"notice-box danger",children:[z,"可操作包含删除；授权不传递，也不会成为管理员。已有同范围授权将被更新，其他独立授权保留；保存后即时重新校验权限。停用账号不会因此恢复登录。"]})]}),submitLabel:"确认保存授权",action:()=>i.saveGrant(R),message:"画布授权已保存"})}catch(R){const D=ne(R);d(D),n.notify({message:D,tone:"error"})}}},children:[e.jsxs("label",{className:"field",children:["访问者 A",e.jsxs("select",{name:"viewer_id",required:!0,disabled:v,value:T,onChange:b=>g(b.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择账号"}),L.map(b=>e.jsx("option",{value:b.id,children:me(s,b.id)},b.id))]})]}),e.jsxs("label",{className:"field",children:["所有者 / 授权范围",e.jsxs("select",{name:"owner_id",required:!0,disabled:v,value:_,onChange:b=>y(b.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择所有者 / 授权范围"}),e.jsx("option",{value:"*",children:"所有画布（含以后新增）"}),s.map(b=>e.jsx("option",{value:b.id,children:me(s,b.id)},b.id))]})]}),e.jsxs("label",{className:"field",children:["权限",e.jsxs("select",{name:"permission",disabled:v,children:[e.jsx("option",{value:"read",children:"只读"}),e.jsx("option",{value:"operate",children:"可操作（含删除）"})]})]}),e.jsx("button",{id:"grant-submit",className:"primary",disabled:v,children:"保存授权"}),e.jsx("p",{id:"grant-error",className:"danger small",role:"alert",children:p})]}),e.jsx(fi,{grants:a,users:s,busy:v,ready:t.ready,revoke:k})]})]}),e.jsx(bi,{projects:r,users:s,busy:v,ready:t.ready,selected:t.selected,setSelected:t.setSelected,status:t.assignStatus,onError:f,onConfirm:({target:b,chosen:R,payload:D})=>h({title:"确认分配 "+R.length+" 个画布",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["目标账号：",e.jsx("b",{children:me(s,b.id)})]}),e.jsx("p",{className:"notice-box danger",children:vt}),e.jsx(gi,{projects:R,users:s,target:b})]}),submitLabel:"确认分配所列画布",action:async()=>{const z=await i.assign(D);t.setSelected(new Set),t.setAssignStatus(`分配成功：已将 ${z} 个画布分配给 ${me(s,b.id)}。`)},message:"画布归属已分配"})})]}),o&&e.jsx(te,{title:o.title,submitLabel:o.submitLabel,onClose:()=>l(null),onSubmit:b=>t.mutate(()=>o.action(b),o.message,o.afterSuccess),children:o.children})]})}const ve=10,Nt=2e3,vi=15e3;function ji(n){return n==="0"||n==="7"||n==="30"||n==="90"}const U=pe([V(),C(),rt()]).optional().transform((n,t)=>{if(n==null||n==="")return n===void 0?void 0:null;const s=typeof n=="number"?n:Number(n);return Number.isFinite(s)?s:(t.addIssue({code:"custom",message:"费用数值必须为有限数字或未知值"}),Yt)}),ae=C().nullish(),wi=G({tasks:U,done:U,error:U,canceled:U,retail_min:U,retail_max:U,retail_mid:U,retail_known_tasks:U,retail_unknown_tasks:U,total_cost:U,actual_cost:U,estimated_cost:U,running_accrued:U,gpu_hours:U,electricity_cost:U,api_cost:U,failed_waste:U,unknown_cost_tasks:U}),xn=G({key:ae,label:ae,tasks:U,retail_known_tasks:U,retail_unknown_tasks:U,retail_min:U,retail_max:U,retail_mid:U,total_cost:U}),_i=G({job_id:ae,created_at:U,status:ae,category_name:ae,category:ae,project_name:ae,card_name:ae,capability:ae,worker_name:ae,runtime_seconds:U,retail_source:ae,retail_basis:ae,retail_min:U,retail_max:U,cost_source:ae,recognized_cost:U}),ki=G({overview:wi,jobs:O(_i).transform(n=>n.slice(0,Nt)),currency:ae,pricing_version:pe([C(),V()]).nullish(),period:G({from:U,to:U}).nullish(),by_category:O(xn).nullish(),by_capability:O(xn).nullish(),by_worker:O(xn).nullish()});function Ni(n){const t=ki.safeParse(n);if(!t.success)throw new Error("费用接口返回的数据格式不完整");return t.data}function Si(n,t=Date.now()){const s=new URLSearchParams({limit:String(Nt)});return n!=="0"&&s.set("from",String(t/1e3-Number(n)*86400)),`/api/costs?${s}`}function $i(n){return{async load(t,s){const a=await n.request(Si(t),{cache:"no-store",signal:s});return Ni(a)}}}const zi={data:null,selectedPeriod:"0",loadedPeriod:"0",page:0,busy:!0,error:null,updatedAt:null};function Ci({http:n,notify:t}){const s=m.useMemo(()=>$i(n),[n]),[a,r]=m.useState(zi),i=m.useRef("0"),o=m.useRef("0"),l=m.useRef(0),p=m.useRef(!1),d=m.useRef(!1),c=m.useRef(new Set),g=m.useRef(t);m.useEffect(()=>{g.current=t},[t]);const u=m.useCallback(async(h,x,k=!1)=>{if(p.current&&!k)return;const L=++l.current;p.current=!0;const T=new AbortController;c.current.add(T),r(_=>({..._,busy:!0}));try{const _=await s.load(h,T.signal);if(L!==l.current)return;o.current=h,d.current=!1,r(N=>({...N,data:_,loadedPeriod:h,error:null,updatedAt:Date.now(),page:x?0:Math.min(N.page,Math.max(0,Math.ceil(_.jobs.length/ve)-1))}))}catch(_){if(L!==l.current)return;const N=`读取费用统计失败：${ne(_)}`,E=!d.current;d.current=!0,r(b=>({...b,error:N})),E&&g.current({message:N,tone:"error"})}finally{c.current.delete(T),L===l.current&&(p.current=!1,r(_=>({..._,busy:!1})))}},[s]),y=m.useCallback(()=>{l.current+=1,p.current=!1,c.current.forEach(h=>h.abort()),c.current.clear()},[]);m.useEffect(()=>{u(i.current,!1);const h=window.setInterval(()=>{document.hidden||u(i.current,!1)},vi);return()=>{window.clearInterval(h),y()}},[u,y]);const j=m.useCallback(h=>{i.current=h,r(x=>({...x,selectedPeriod:h})),u(h,!0,!0)},[u]),w=m.useCallback(()=>{u(i.current,!1)},[u]),v=m.useCallback(()=>{const h=i.current!==o.current;u(i.current,h,h)},[u]),f=m.useCallback(h=>{r(x=>({...x,page:Math.max(0,Math.min(x.page+h,Math.max(0,Math.ceil((x.data?.jobs.length??0)/ve)-1)))}))},[]);return{...a,selectPeriod:j,refresh:w,retry:v,changePage:f}}const Mi="_retail_1ychj_1",Ei="_commercial_1ychj_6",Pi={retail:Mi,commercial:Ei};function X(n){return typeof n=="number"&&Number.isFinite(n)?n:null}function ce(n){return X(n)==null?"未获取":String(n)}function Ee(n,t){const s=X(n);return s==null?"未知":`${!t||t==="CNY"?"¥":t+" "}${s.toFixed(4)}`}function sn(n,t,s){return X(n)==null||X(t)==null?"未知":n===t?Ee(n,s):`${Ee(n,s)} – ${Ee(t,s)}`}function fn(n){const t=X(n);return t==null||!Number.isFinite(new Date(t*1e3).getTime())?"未记录":new Date(t*1e3).toLocaleString("zh-CN",{hour12:!1})}function qi(n){const t=X(n);return t==null||t<0?"未记录":t<60?`${Math.round(t)}秒`:t<3600?`${Math.floor(t/60)}分${Math.floor(t%60)}秒`:`${Math.floor(t/3600)}小时${Math.floor(t%3600/60)}分`}function Ri(n){return n==="0"?"全部记录":`最近${n}天`}function Li(n){return{unpriced:X(n.retail_known_tasks)===0&&(X(n.retail_unknown_tasks)??0)>0,allCostsUnknown:(X(n.tasks)??0)>0&&X(n.unknown_cost_tasks)===X(n.tasks)&&X(n.actual_cost)===0&&X(n.estimated_cost)===0}}function Ii(n,t){return X(n.retail_known_tasks)==null?"未获取":n.retail_known_tasks?sn(n.retail_min,n.retail_max,t):"未定价"}const Zn={queued:"排队中",assigned:"已分配",running:"运行中",done:"已完成",error:"失败",canceled:"已取消",cancel_requested:"正在取消"},Qn={actual:"实际",estimated:"历史估算",unknown:"未知"},et={per_job:"按次",per_segment:"按段",segment_count:"按分段数",output_second_resolution:"按输出秒和分辨率"};function Ai(n,t){const s=n.retail_source==="priced",a=n.retail_source==="not_billable",r=n.retail_source==="unpriced";return{status:(Object.hasOwn(Zn,n.status||"")?Zn[n.status||""]:n.status)||"未知",statusClass:["error","canceled"].includes(n.status||"")?"danger":["running","queued","assigned","cancel_requested"].includes(n.status||"")?"warn":"",basis:s?(Object.hasOwn(et,n.retail_basis||"")?et[n.retail_basis||""]:n.retail_basis)||"未记录":a?"未完成":r?"未定价":"未获取",basisClass:r?"warn":"muted",retail:s?sn(n.retail_min,n.retail_max,t):a?"不计费":r?"未定价":"未知",internal:n.cost_source==="unknown"||!n.cost_source?"未知":Ee(n.recognized_cost,t),source:(Object.hasOwn(Qn,n.cost_source||"")?Qn[n.cost_source||""]:n.cost_source)||"来源未记录"}}function xe({label:n,id:t,children:s,note:a,noteId:r,compact:i=!0,tone:o}){return e.jsx("article",{className:`card metric${o?` ${Pi[o]}`:""}`,children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:n}),e.jsx("p",{className:`metric-value${i?" compact":""}`,id:t,children:s}),e.jsx("p",{className:"metric-note",id:r,children:a})]})})}function Ti({data:n}){const t=n?.overview??{},{unpriced:s,allCostsUnknown:a}=Li(t),r=X(t.retail_min),i=X(t.retail_max),o=p=>Ee(p,n?.currency),l=n?s?"未定价":X(t.retail_min)!=null&&X(t.retail_max)!=null&&t.retail_min!==t.retail_max?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"cost-amount",children:o(t.retail_min)})," – ",e.jsx("span",{className:"cost-amount",children:o(t.retail_max)})]}):sn(t.retail_min,t.retail_max,n.currency):"未获取";return e.jsxs("section",{className:"metrics f-metrics8","aria-label":"费用概览",children:[e.jsx(xe,{tone:"retail",label:"建议收费区间",id:"retail-range",note:"按次 / 分段 / 输出秒和分辨率",children:l}),e.jsx(xe,{tone:"retail",label:"建议收费中值",id:"retail-mid",noteId:"retail-coverage",note:n?`已定价 ${ce(t.retail_known_tasks)} 项 / 未定价 ${ce(t.retail_unknown_tasks)} 项`:"已定价 未获取 / 未定价 未获取",children:n?s?"未定价":o(t.retail_mid):"未获取"}),e.jsx(xe,{tone:"commercial",label:"商用模型等效费用（估算）",id:"internal-total",noteId:"internal-split",note:"按建议收费区间的 5 倍测算 · 非实际支出",children:n?s?"未定价":sn(r==null?null:r*5,i==null?null:i*5,n.currency):"未获取"}),e.jsx(xe,{label:"内部实际成本",id:"actual",noteId:"running",note:n?`运行中累计 ${o(t.running_accrued)}`:"运行中累计 未获取",children:n?a?"未知":o(t.actual_cost):"未获取"}),e.jsx(xe,{label:"GPU 用量",id:"gpu-hours",noteId:"electricity",note:n?`其中电费 ${o(t.electricity_cost)}`:"其中电费 未获取",children:X(t.gpu_hours)==null?"未获取":`${t.gpu_hours?.toFixed(2)} 小时`}),e.jsx(xe,{label:"API 成本",id:"api-cost",note:"按输入 / 输出 token",children:n?o(t.api_cost):"未获取"}),e.jsx(xe,{label:"失败与取消损耗",id:"waste",noteId:"unknown",note:`已包含于总成本；未知 ${ce(t.unknown_cost_tasks)} 项`,children:n?o(t.failed_waste):"未获取"}),e.jsx(xe,{label:"任务数量",id:"tasks",compact:!1,noteId:"statuses",note:`完成 ${ce(t.done)} / 失败 ${ce(t.error)} / 取消 ${ce(t.canceled)}`,children:ce(t.tasks)})]})}const ke=[{key:"category",label:"按类型"},{key:"capability",label:"按能力"},{key:"worker",label:"按执行端"}];function Di({data:n,failed:t}){const[s,a]=m.useState("category"),r=m.useRef({}),o=n?.[`by_${s}`]?.slice(0,10),l=Math.max(0,...(o??[]).map(d=>X(d.retail_mid)??0));function p(d,c){let g;switch(d.key){case"ArrowRight":case"ArrowDown":g=(c+1)%ke.length;break;case"ArrowLeft":case"ArrowUp":g=(c+ke.length-1)%ke.length;break;case"Home":g=0;break;case"End":g=ke.length-1;break;default:return}d.preventDefault();const u=ke[g];u&&(a(u.key),r.current[u.key]?.focus())}return e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"费用构成"}),e.jsx("p",{className:"section-subtitle",children:"按建议收费中值排序 / 每个视角前10项；条形为相对最大项，不是内部成本占比"})]}),e.jsx("span",{className:"muted small",id:"pricing",children:n?`计价版本 ${n.pricing_version??"未获取"} / 币种 ${n.currency??"未获取"}`:"等待计价信息"})]}),e.jsx("div",{className:"tabs f-pad-tabs",role:"tablist","aria-label":"费用构成视角",children:ke.map((d,c)=>e.jsx("button",{type:"button",role:"tab",id:`cost-tab-${d.key}`,"aria-controls":"cost-panel","aria-selected":s===d.key,tabIndex:s===d.key?0:-1,"data-cost-tab":d.key,ref:g=>{g?r.current[d.key]=g:delete r.current[d.key]},onClick:()=>a(d.key),onKeyDown:g=>p(g,c),children:d.label},d.key))}),e.jsx("div",{className:"f-cost-chart f-pad",id:"cost-panel",role:"tabpanel","aria-labelledby":`cost-tab-${s}`,tabIndex:0,children:n?o?o.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"这个周期内还没有费用构成"}),e.jsx("p",{children:"调整统计周期，或等待任务产生费用记录。"})]}):o.map((d,c)=>{const g=X(d.retail_mid),u=g!=null&&l>0?Math.max(0,Math.min(100,g/l*100)):null;return e.jsxs("div",{className:"f-rank",children:[e.jsxs("div",{children:[e.jsx("b",{title:d.key??void 0,children:d.label||d.key||"未记录"}),e.jsx("strong",{children:Ii(d,n.currency)})]}),e.jsxs("p",{className:"muted small",children:[ce(d.tasks)," 项 · 已定价 ",ce(d.retail_known_tasks)," · 未定价"," ",ce(d.retail_unknown_tasks)," · 已知内部成本"," ",Ee(d.total_cost,n.currency)]}),u!=null&&e.jsx("div",{className:"f-track",role:"meter","aria-label":`${d.label||d.key||""} 建议收费中值相对最大项`,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":u,children:e.jsx("i",{style:{width:`${u}%`}})})]},`${d.key??""}-${c}`)}):e.jsx("p",{className:"muted",children:"构成数据未获取，不以零元替代。"}):e.jsx("p",{className:"muted",children:t?"费用构成读取失败，请点击“重试读取”。":"正在读取费用构成…"})})]})}function Ye({children:n}){return e.jsx("span",{className:"cell-secondary",children:n})}function Fi({data:n,page:t,loadedPeriod:s,failed:a,changePage:r,openBasis:i}){const o=n?.jobs??[],l=Math.max(0,Math.ceil(o.length/ve)-1),p=o.slice(t*ve,(t+1)*ve),d=X(n?.overview.tasks);return e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"费用明细"}),e.jsx("p",{className:"section-subtitle",id:"detail-note",children:n?`服务端合计 ${ce(n.overview.tasks)} 条 / 明细已载入 ${o.length} 条${d!=null&&d>o.length?"（接口最多2000条，非完整明细）":""}；汇总不以当前显示页相加替代`:a?"明细未获取，不以空记录或零元代替。":"正在读取；汇总不以当前明细页相加替代"})]}),e.jsx("button",{type:"button",className:"link-button",id:"cost-basis",onClick:i,children:"计价与成本口径"})]}),e.jsx("p",{className:"table-note",id:"period-note",children:n?`当前展示：${Ri(s)} · ${X(n.period?.from)===0?"全部历史":fn(n.period?.from)} — ${fn(n.period?.to)}（按任务创建时间）`:"统计周期正在读取"}),e.jsx("div",{className:"table-wrap",children:e.jsxs("table",{className:"cost-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["时间","状态 / 类型","项目 / 卡片","能力","执行端","耗时","收费依据","建议收费","内部成本 / 来源"].map(c=>e.jsx("th",{scope:"col",children:c},c))})}),e.jsx("tbody",{id:"job-rows",children:n?p.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:9,children:e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"这个周期内还没有费用记录"}),e.jsx("p",{children:"更换统计周期，或等待任务产生费用记录。"})]})})}):p.map((c,g)=>{const u=Ai(c,n.currency);return e.jsxs("tr",{children:[e.jsxs("td",{children:[fn(c.created_at),e.jsx(Ye,{children:c.job_id||"任务ID未记录"})]}),e.jsxs("td",{className:u.statusClass,children:[u.status,e.jsx(Ye,{children:c.category_name||c.category||"类型未记录"})]}),e.jsxs("td",{className:"origin",children:[c.project_name||"未归属项目",e.jsx(Ye,{children:c.card_name||"未记录卡片"})]}),e.jsx("td",{children:c.capability||"未记录"}),e.jsx("td",{children:c.worker_name||"未分配执行端"}),e.jsx("td",{children:qi(c.runtime_seconds)}),e.jsx("td",{className:u.basisClass,children:u.basis}),e.jsx("td",{children:u.retail}),e.jsxs("td",{children:[u.internal,e.jsx(Ye,{children:u.source})]})]},`${c.job_id??""}-${g}`)}):e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"loading-note",children:a?"费用明细读取失败，请点击“重试读取”。":"正在读取费用明细…"})})})]})}),e.jsxs("div",{className:"f-pager",children:[e.jsx("span",{id:"page-note",children:n?`显示 ${o.length?t*ve+1:0}–${Math.min((t+1)*ve,o.length)} / 已载入 ${o.length} 条`:"尚未载入"}),e.jsx("button",{type:"button",id:"cost-prev",disabled:!n||t===0,onClick:()=>r(-1),children:"上一页"}),e.jsx("button",{type:"button",id:"cost-next",disabled:!n||t>=l,onClick:()=>r(1),children:"下一页"})]})]})}function Oi({onClose:n}){return e.jsx(te,{title:"计价与成本口径",onClose:n,children:e.jsxs("div",{className:"f-stack",children:[e.jsx("p",{children:"建议收费区间与中值来自计价规则，不是已收款或实际收入。"}),e.jsx("p",{children:"收费依据支持按次、按段、分段数、输出秒和分辨率；未定价不等于免费。未完成任务不计建议收费，但可能产生内部损耗。"}),e.jsx("p",{children:"内部总成本 = 已知实际 + 已知历史估算；未知成本单列，不按零元处理。失败与取消损耗已包含于总成本，不重复相加。运行中累计成本尚可能变化。"}),e.jsx("p",{children:"统计周期以任务创建时间为准，按服务端全量聚合。费用明细最多读取2000条，每页10条；不能把当前显示明细当完整总额，也不从明细重算概览或费用构成。"}),e.jsx("p",{children:"GPU用量、电费、API token成本、实际与历史估算均沿用服务端口径；未记录的字段显示未知，不由前端推测单价或补算。"})]})})}function Ui(n){const t=Ci(n),[s,a]=m.useState(!1),r=t.busy?"正在读取…":t.error?"连接失败 · 快照非实时":t.updatedAt!=null?`最后刷新 ${new Date(t.updatedAt).toLocaleTimeString("zh-CN",{hour12:!1})} · 每15秒刷新`:"正在加载 · 每15秒刷新";return e.jsxs("main",{id:"main",tabIndex:-1,"aria-busy":t.busy?!0:void 0,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"费用统计"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{className:"subtitle",children:"建议收费不是实际收入，未知成本不作零元"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsxs("label",{className:"filter-label",children:["统计周期",e.jsxs("select",{id:"period",value:t.selectedPeriod,onChange:i=>{const o=i.currentTarget.value;ji(o)&&t.selectPeriod(o)},children:[e.jsx("option",{value:"0",children:"全部记录"}),e.jsx("option",{value:"7",children:"最近7天"}),e.jsx("option",{value:"30",children:"最近30天"}),e.jsx("option",{value:"90",children:"最近90天"})]})]}),e.jsx("span",{className:"muted small",id:"refresh-state",role:"status",children:r}),e.jsxs("button",{type:"button",className:"primary",id:"refresh",disabled:t.busy,onClick:t.refresh,children:[e.jsx(Oe,{name:"refresh"}),"立即刷新"]})]})]}),e.jsxs("div",{id:"error",className:"f-error",role:"alert",hidden:!t.error,children:[e.jsxs("div",{children:[e.jsx("b",{id:"error-message",children:t.error}),e.jsx("p",{children:"下方保留上次成功读取的周期与快照，不代表当前筛选的新数据；未知值不作零元。"})]}),e.jsx("button",{type:"button",id:"retry",onClick:t.retry,children:"重试读取"})]}),e.jsx(Ti,{data:t.data}),e.jsx(Di,{data:t.data,failed:t.error!=null}),e.jsx(Fi,{data:t.data,page:t.page,loadedPeriod:t.loadedPeriod,failed:t.error!=null,changePage:t.changePage,openBasis:()=>a(!0)}),e.jsxs("section",{className:"card padded notice-box","aria-labelledby":"cost-rules-title",children:[e.jsx("h2",{id:"cost-rules-title",children:"计价与成本口径"}),e.jsx("p",{children:"建议收费区间与中值来自规则，不是已收款或实际收入；未定价不等于免费。未完成任务不计建议收费，但可能产生内部损耗。"}),e.jsx("p",{children:"内部总成本 = 已知实际 + 已知历史估算；未知成本单列，不按零元处理。失败与取消损耗已包含于总成本，不重复相加；运行中累计仍可能变化。"}),e.jsx("p",{children:"统计周期按任务创建时间筛选，合计与构成取服务端全量聚合。明细最多读取2000条并分页展示，当前明细页不代表全部成本。"})]})]}),s&&e.jsx(Oi,{onClose:()=>a(!1)})]})}const P=V().finite().nullable().optional(),K=C().nullable().optional(),Fe=Sn(C(),H),St=q({gpus:O(q({name:K,memory_total_bytes:P}).catchall(H)).optional(),cpu:H.optional(),os:H.optional(),memory_total_bytes:P,host_id:K,environment_id:K,model_version:K,disk:K,note:K}).catchall(H),nt=q({name:K,role:K,precision:H.optional(),precision_source:K,loader_dtype:H.optional()}).catchall(H),jn=q({source:K,complete:Y().optional(),capability_name:K,models:O(nt).optional(),auxiliary_models:O(nt).optional()}).catchall(H),Wi=q({source:C(),summary:jn,samples:P,measured:P}).catchall(H),Bi=q({key:K,id:K,kind:K,width:H.optional(),height:H.optional(),duration:P,valid:Y().nullable().optional(),outputs:H.optional(),samples:H.optional()}).catchall(H),Hi=q({total_samples:P,recorded_samples:P,complete_samples:P,total_outputs:P,recorded_outputs:P,variants:O(H).optional()}).catchall(H),Vi=q({dimensions:Fe.nullable().optional(),parameters:Fe.nullable().optional(),expected:Fe.nullable().optional(),model_version:K}).catchall(H),$t={capability:C(),capability_name:K,worker_id:K,worker_name:K,source:C(),dimensions:Fe.nullable().optional(),spec:Vi.nullable().optional(),output_resolution:Hi.nullable().optional(),recovered_outputs:H.optional(),runtime_seconds:P,occupied_seconds:P,warnings:O(C()).optional()},Gi=q({...$t,id:C(),spec_key:K,config_id:K,config:St.nullable().optional(),config_source:K,cache_condition:H.optional(),samples:P,done:P,error:P,canceled:P,measured:P,mean_seconds:P,p50_seconds:P,p90_seconds:P,last_sample_at:P,reference_per_hour:P,output_count:P,unit:K,seconds_per_unit:P,qualified_seconds_per_unit:P,eligible:Y().nullable().optional(),reviewed:P,accepted:P,benchmark_id:K,days:pe([O(C()),V(),rt()]).optional(),model_summary:jn.nullable().optional(),model_evidence:q({total_samples:P,recorded_samples:P,variants:O(Wi).optional()}).catchall(H).nullable().optional(),current_model_reference:jn.nullable().optional()}).catchall(H),Ki=q({id:C(),name:K,state:C(),last_seen:P,hardware:St.nullable().optional(),hardware_source:K,agent_version:P,supports_capacity_telemetry:Y().optional(),tasks:P,done:P,error:P,canceled:P,runtime_seconds:P}).catchall(H),zt=q({...$t,job_id:C(),group_id:K,status:C(),created_at:P,attempts:H.optional(),outputs:O(Bi).nullable().optional(),review:q({accepted:P,source:K,benchmark_id:K,note:K}).catchall(H).nullable().optional()}).catchall(H),Ji=q({period:Fe.optional(),overview:Sn(C(),V().finite().nullable()).default({}),workers:O(Ki).default([]),groups:O(Gi).default([]),details:O(zt).default([]),details_total:V().int().nonnegative()}).catchall(H),Xi=q({details:O(zt),details_total:V().int().nonnegative()}),Ct=q({to:V().int(),mode:re("historical"),quality:re("technical"),availability:re(1),utilization:re(.75),worker_id:C().min(1),hours:V().finite().min(.1).max(24),price:V().finite().nonnegative().optional(),demands:O(q({group_id:C().min(1),quantity:V().finite().positive()})).min(1)}),Yi=q({machines:P,total_seconds:P,daily_capacity_seconds:P,price_total:P,lines:O(q({group_id:C(),quantity:P,seconds_per_unit:P,daily_units:P}).catchall(H)).default([]),warnings:O(C()).default([]),assumptions:H.optional()}).catchall(H),Mt=q({host_id:C().max(160).optional(),cpu:C().max(160).optional(),memory_total_bytes:V().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),environment_id:C().max(160).optional(),model_version:C().max(160).optional(),disk:C().max(160).optional(),note:C().max(500).optional()}).strict(),Et=q({accepted:V().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),source:Ve(["business","standard"]),benchmark_id:C().max(100),note:C().max(500)}),Zi=q({processed:V().int().min(0).max(4),recorded:V().int().nonnegative(),total:V().int().nonnegative(),next_offset:V().int().nonnegative().nullable()}).refine(n=>n.recorded<=n.processed,"补采响应格式无效"),tt=Sn(C(),it());class Qi{constructor(t){this.http=t}http;path(t,s){return`/api/capacity?${new URLSearchParams({to:String(t.to),limit:"100",offset:String(s)})}`}report(t,s){return this.http.read(this.path(t,s),Ji,{cache:"no-store"})}evidence(t,s){return this.http.read(this.path(t,s),Xi,{cache:"no-store"})}async estimate(t){return Yi.parse(await this.http.json("/api/capacity/estimate","POST",Ct.parse(t)))}async profile(t,s){tt.parse(await this.http.json(`/api/capacity/workers/${encodeURIComponent(t)}`,"POST",Mt.parse(s)))}async review(t,s){tt.parse(await this.http.json(`/api/capacity/jobs/${encodeURIComponent(t)}/review`,"POST",Et.parse(s)))}async probe(t,s,a){const r=await this.http.json(`/api/capacity/jobs/${encodeURIComponent(t)}/probe-outputs`,"POST",{offset:V().int().nonnegative().parse(s)});a();const i=Zi.safeParse(r);if(!i.success||i.data.next_offset!==null&&(i.data.next_offset<=s||i.data.next_offset>=i.data.total))throw Error("补采响应格式无效，请刷新看板核对结果");return i.data}}const Te=n=>!!(n.group||n.status||n.source||n.size!==100);class er{cache=null;pending=null;clear(){this.cache=null,this.pending=null}async all(t,s,a,r){if(!a())return null;if(this.cache?.snapshot===t)return this.cache.records;if(this.pending?.snapshot===t)return this.pending.promise;const i={snapshot:t,promise:Promise.resolve(null)};i.promise=(async()=>{const o=t.report.details_total,l=[];if(!Number.isSafeInteger(o)||o<0)throw Error("明细总数无效，请刷新后重试。");for(let p=0;p<o;p+=100){if(!a())return null;const d=p===t.offset?t.report:await s.evidence(t.range,p);if(!a())return null;if(d.details_total!==o||d.details.length!==Math.min(100,o-p))throw Error("任务证据在读取期间变化或分页不完整，请刷新后重新筛选。");l.push(...d.details),r(l.length,o)}if(new Set(l.map(p=>p.job_id)).size!==l.length)throw Error("任务证据分页出现重复，请刷新后重试。");return a()?(this.cache={snapshot:t,records:l},l):null})(),this.pending=i;try{return await i.promise}finally{this.pending===i&&(this.pending=null)}}}class nr{constructor(t,s){this.service=t,this.notify=s}service;notify;listeners=new Set;loadVersion=0;estimateVersion=0;evidenceVersion=0;appliedRange=null;appliedOffset=0;alive=!0;repository=new er;mutations=new Set;value={report:null,snapshot:null,ready:!1,revision:0,refreshState:"正在读取全部历史聚合与本页证据…",error:"",writeStatus:"",tab:"machines",technicalOpen:!1,evidenceOpen:!1,mounted:new Set,filters:{group:"",status:"",source:"",size:100},evidence:{records:[],total:0,start:0,size:100,state:"",busy:!1,failed:!1},estimate:null,estimateNote:"填写每日需求后计算。没有样本的场景不能按零耗时处理。",estimateError:"",estimating:!1};getSnapshot=()=>this.value;subscribe=t=>(this.listeners.add(t),()=>{this.listeners.delete(t)});set(t){this.alive&&(this.value={...this.value,...t},this.listeners.forEach(s=>s()))}start(){this.alive=!0,this.load()}dispose(){this.alive=!1,this.loadVersion++,this.estimateVersion++,this.evidenceVersion++,this.repository.clear()}invalidateEstimate=(t="输入或证据已变更，请重新计算。")=>{this.estimateVersion++,this.set({estimate:null,estimateNote:t,estimateError:"",estimating:!1})};resetSnapshot(){this.repository.clear(),this.evidenceVersion++,this.set({snapshot:null,ready:!1})}clear(){this.resetSnapshot(),this.set({report:null,mounted:new Set,evidence:{records:[],total:0,start:0,size:100,state:"",busy:!1,failed:!1}})}activeMounts(){const t=new Set([this.value.tab]);return this.value.tab==="machines"&&this.value.technicalOpen&&t.add("technical"),this.value.evidenceOpen&&t.add("evidence"),t}async load(t=!0,s){const a=t?{to:Math.floor(Date.now()/1e3)}:this.appliedRange;if(!a)return;const r=++this.loadVersion,i=Object.freeze({...a}),o=t?0:s??this.appliedOffset;this.resetSnapshot(),this.invalidateEstimate("证据正在刷新，旧测算已清除。"),this.set({error:"",refreshState:"正在读取全部历史聚合与本页证据…",evidence:{...this.value.evidence,state:""}});try{const l=await this.service.report(i,o);if(!this.alive||r!==this.loadVersion)return;const p=Object.freeze({report:l,range:i,version:r,offset:o});this.appliedRange=i,this.appliedOffset=o;const d={...this.value.filters};if(l.groups.some(c=>c.id===d.group)||(d.group=""),this.set({report:l,snapshot:p,ready:!0,revision:this.value.revision+1,mounted:this.activeMounts(),filters:d,evidence:{records:l.details,total:l.details_total,start:o,size:100,state:"",busy:!1,failed:!1}}),this.value.evidenceOpen&&Te(d)&&await this.filterEvidence(0),!this.alive||r!==this.loadVersion)return;this.set({refreshState:`最后刷新：${new Date().toLocaleTimeString("zh-CN",{hour12:!1})}`})}catch(l){if(!this.alive||r!==this.loadVersion)return;this.clear();const p=`读取产能数据失败：${ne(l)}。请点击立即刷新重试。`;this.set({error:p,refreshState:"读取失败"}),this.notify(p)}}activate(t){this.set({tab:t}),this.mount()}technical(t){this.set({technicalOpen:t}),this.mount()}evidenceOpen(t){this.set({evidenceOpen:t}),this.mount()}mount(){if(!this.value.ready)return;const t=this.value.mounted.has("evidence"),s=new Set([...this.value.mounted,...this.activeMounts()]);this.set({mounted:s}),!t&&s.has("evidence")&&Te(this.value.filters)&&this.filterEvidence(0)}showEvidence(t=""){!this.value.ready||!this.value.snapshot||(this.set({evidenceOpen:!0,filters:{...this.value.filters,group:t,status:"",source:""},mounted:new Set([...this.value.mounted,"evidence"])}),this.filterEvidence(0))}filter(t){this.value.ready&&(this.set({filters:{...this.value.filters,...t}}),this.filterEvidence(0))}current(t){return this.alive&&this.value.ready&&this.value.snapshot===t&&t.version===this.loadVersion&&this.value.report===t.report}async filterEvidence(t){const s=this.value.snapshot;if(!s||!this.current(s)||!this.value.mounted.has("evidence"))return;const a=++this.evidenceVersion,r=this.value.filters;if(!Te(r)){if(s.offset!==0){await this.load(!1,0);return}this.set({evidence:{records:s.report.details,total:s.report.details_total,start:0,size:100,state:"",busy:!1,failed:!1}});return}this.set({evidence:{records:[],total:0,start:0,size:r.size,state:"正在读取同一截止时间下的真实分页证据，完成后筛选；不会按当前页冒充全部任务。",busy:!0,failed:!1}});try{const i=await this.repository.all(s,this.service,()=>this.current(s),(p,d)=>{this.current(s)&&Te(this.value.filters)&&this.set({evidence:{...this.value.evidence,state:`正在读取真实分页证据 ${p} / ${d} 条；聚合统计保持不变。`}})});if(!i||!this.current(s)||a!==this.evidenceVersion)return;const o=i.filter(p=>(!r.group||p.group_id===r.group)&&(!r.status||p.status===r.status)&&(!r.source||p.source===r.source)),l=Math.min(t,Math.max(0,Math.ceil(o.length/r.size)-1)*r.size);this.set({evidence:{records:o.slice(l,l+r.size),total:o.length,start:l,size:r.size,state:`筛选 ${o.length} / 全集 ${i.length} 条；只改变明细，聚合统计不受筛选或分页影响。`,busy:!1,failed:!1}})}catch(i){if(!this.current(s)||a!==this.evidenceVersion)return;this.set({evidence:{records:[],total:0,start:0,size:r.size,state:`证据筛选失败：${ne(i)}。请立即刷新后重试。`,busy:!1,failed:!0}})}}page(t){const{ready:s,evidence:a,mounted:r,snapshot:i,filters:o}=this.value;if(!s||!i||!r.has("evidence")||a.busy||a.failed)return;const l=Math.max(0,a.start+t*a.size);t>0&&l>=a.total||(Te(o)?this.filterEvidence(l):this.load(!1,l))}async estimate(t){if(this.invalidateEstimate("正在计算…"),!this.value.ready||!this.value.snapshot){this.estimateFailure("请先点击立即刷新并成功读取证据。");return}const s=this.estimateVersion,a=this.value.snapshot,r=this.value.revision;this.set({estimating:!0});try{const i=await this.service.estimate(t);if(s!==this.estimateVersion||r!==this.value.revision||!this.current(a))return;const l={...a.report.workers.find(d=>d.id===t.worker_id)?.hardware};delete l.note;const p={result:i,payload:t,groups:a.report.groups.filter(d=>t.demands.some(c=>c.group_id===d.id)),hardware:l};this.set({estimate:p,estimating:!1})}catch(i){s===this.estimateVersion&&this.estimateFailure(`测算失败：${ne(i)}`)}}estimateFailure(t){this.set({estimate:null,estimating:!1,estimateNote:"本次未产生测算结果，请检查证据与输入后重试。",estimateError:t}),this.notify(t)}async mutate(t,s,a){if(this.mutations.has(t))throw Error("正在保存，请勿重复提交。");this.mutations.add(t);const r=this.loadVersion;this.set({writeStatus:""}),this.invalidateEstimate(`${s}正在保存，旧测算已清除。`);try{if(await a(),!this.alive)return;r===this.loadVersion?await this.load(!1):(this.loadVersion++,this.clear(),this.invalidateEstimate("证据已更新，请点击立即刷新后重新计算。"),this.set({refreshState:`${s}已更新，请点击立即刷新`})),this.set({writeStatus:`${s}已保存。人工声明不回写历史快照，也不代表自动验证通过。`})}finally{this.mutations.delete(t)}}saveProfile(t,s){return this.mutate(`profile:${t}`,"机器配置",()=>this.service.profile(t,s))}saveReview(t,s){return this.mutate(`review:${t}`,"人工标记",()=>this.service.review(t,s))}probe(t,s){return this.service.probe(t,s,this.probeWritten)}probeVersion(){return this.loadVersion}probeCurrent(t){return this.alive&&t===this.loadVersion&&this.value.report!==null}probeWritten=()=>{this.resetSnapshot(),this.invalidateEstimate("成品尺寸证据已更新，请刷新看板后重新计算。")}}function tr({http:n,notify:t}){const s=m.useMemo(()=>new nr(new Qi(n),r=>t({message:r,tone:"error"})),[n,t]),a=m.useSyncExternalStore(s.subscribe,s.getSnapshot);return m.useEffect(()=>(s.start(),()=>s.dispose()),[s]),{controller:s,state:a}}const sr={historical:"历史运行参考",captured:"采集业务样本",standard:"标准样本（人工标签）"},Pn={idle:"在线空闲",online:"在线",busy:"运行中",running:"运行中",offline:"离线",disabled:"已禁用",syncing:"同步中",unavailable:"执行环境不可用",historical:"历史执行端",error:"异常",done:"已完成",canceled:"已取消",queued:"排队中",assigned:"已分配"},A=n=>typeof n=="number"&&Number.isFinite(n),M=n=>n==null||n===""?"未知":typeof n=="object"?JSON.stringify(n):String(n),$=n=>A(n)?n.toLocaleString("zh-CN",{maximumFractionDigits:2}):"未知",Z=n=>A(n)?`${$(n)} 秒`:"未知",Ae=n=>A(n)?new Date(n*1e3).toLocaleString("zh-CN",{hour12:!1}):"未知",Ie=n=>A(n)?`${$(n/1024**3)} GiB`:"未知",de=n=>sr[n]||`来源未知（${M(n)}）`,qn=n=>Array.isArray(n.days)?n.days.length:n.days,Pe=n=>n.capability_name?.trim()?n.capability_name:M(n.capability),Pt=n=>Pe(n)===n.capability?Pe(n):`${Pe(n)}（${n.capability}）`,on=n=>typeof n=="string"&&{reported:"机器上报",manual:"人工声明","manual+reported":"机器上报 + 人工声明",unknown:"未知"}[n]||"未知";function Rn(n){return n&&typeof n=="object"&&!Array.isArray(n)?n:{}}function Be(n,t){if(!n||typeof n!="object")return M(n);const s=Rn(n);return(t==="cpu"?[s.model,s.architecture,A(s.logical_cores)?`${$(s.logical_cores)} 逻辑核`:null]:[s.name,s.release,s.version]).filter(r=>r!=null&&r!=="").map(M).join(" / ")||"未知"}function He(n){return n?`GPU ${n.gpus?.length?n.gpus.map(s=>`${M(s.name)} / 单卡 ${Ie(s.memory_total_bytes)}`).join("；"):"未知"}；CPU ${Be(n.cpu,"cpu")}；内存 ${Ie(n.memory_total_bytes)}；系统 ${Be(n.os,"os")}；环境 ${M(n.environment_id)}；模型版本 ${M(n.model_version)}；磁盘 ${M(n.disk)}；主机 ID ${M(n.host_id)}`:"未知"}function ar(n){const t=n.hardware,s=(t?.gpus||[]).map(a=>[a.name,A(a.memory_total_bytes)?Ie(a.memory_total_bytes):null].filter(Boolean).join(" / ")).filter(Boolean);return A(t?.memory_total_bytes)&&s.push(`系统内存 ${Ie(t.memory_total_bytes)}`),s.join("；")||"尚未采集硬件信息"}function ir(n){const t=n.hardware;return!t?.cpu||!t.host_id?A(n.agent_version)&&n.agent_version<4||n.supports_capacity_telemetry===!1?"旧版采集程序缺少 CPU 等信息，请升级该 Worker 后补采；已有 GPU 与内存记录仍可查看。":"CPU 或主机信息尚未采集，请检查该 Worker 的采集上报。":!t.environment_id||!t.model_version?"环境或模型版本的人工声明未填写，可在“详细统计与机器配置”中补录。":"当前配置不代表历史任务的执行配置；历史依据见各业务详情。"}const he=n=>["idle","busy","online","running"].includes(n.state),Qe=n=>A(n.mean_seconds)&&n.mean_seconds>=0&&A(n.measured)&&n.measured>0;function rr(n){if(!A(n)||n<0)return"暂无成功耗时";if(n<1)return`${$(n)} 秒`;const t=Math.round(n),s=Math.floor(t/60),a=t%60;return s?`${$(s)} 分 ${a} 秒`:`${a} 秒`}function ln(n){const t={...n.spec?.dimensions,...n.dimensions},s=[["图片",t.image_count,"张"],["视频",t.video_count,"段"],["音频",t.audio_count,"段"]],a=r=>A(r)&&Number.isSafeInteger(r)&&r>=0;return s.every(([,r])=>!a(r))?["素材信息未记录"]:s.every(([,r])=>r===0)?["未使用图片、视频或音频"]:s.flatMap(([r,i,o])=>a(i)?i>0?[`${r} ${$(i)} ${o}`]:[]:[`${r}数量未记录`])}function qt(n,t){const s=i=>A(i)&&Number.isSafeInteger(i)&&i>0,a=typeof n.resolution=="string"?n.resolution.match(/^(\d+)\s*[x×]\s*(\d+)(?:\s*\(\d+:\d+\))?$/i):null,r=[[n.output_width,n.output_height],[n.width,n.height],[a?Number(a[1]):null,a?Number(a[2]):null],[t.width,t.height,"期望 "]];for(const[i,o,l=""]of r)if(s(i)&&s(o)){const d={"640x360":"360p","640x480":"480p","854x480":"480p","1280x720":"720p","1920x1080":"1080p","2560x1440":"1440p","3840x2160":"4K"}[`${Math.max(i,o)}x${Math.min(i,o)}`];return d?`${l}${d}${i<o?" 竖屏":""}（${$(i)} × ${$(o)}）`:`${l||"尺寸 "}${$(i)} × ${$(o)}`}return A(n.megapixels)&&n.megapixels>0&&A(n.megapixels*100)?`约 ${$(n.megapixels*100)} 万像素（尺寸未记录）`:null}function cn(n,t=!1){const s={...n.spec?.parameters,...n.spec?.dimensions,...n.dimensions},a=n.spec?.expected||{},r=[],i=s.output_duration??s.duration??a.duration;A(i)&&r.push(`请求时长 ${$(i)} 秒`);const o=qt(s,a);if(o&&r.push(o),t){A(s.megapixels)&&s.megapixels>0&&r.push(`像素设置 ${$(s.megapixels)} MP`);const l=[["帧率",s.output_fps??s.target_fps??s.fps??s.force_rate??a.fps," FPS"],["步数",s.steps," 步"],["帧数",s.frames," 帧"],["长边",s.scale_to_length," px"],["批量",s.batch_size,""]];for(const[p,d,c]of l)A(d)&&r.push(`${p} ${$(d)}${c}`)}return r.join(" / ")||"规格未完整记录"}function Rt(n){return(n?.variants||[]).flatMap(t=>{const s=Rn(t);return typeof s.kind=="string"&&["image","video"].includes(s.kind)&&A(s.width)&&Number.isSafeInteger(s.width)&&s.width>0&&A(s.height)&&Number.isSafeInteger(s.height)&&s.height>0?[{kind:s.kind,width:s.width,height:s.height,outputs:s.outputs,samples:s.samples}]:[]})}function Ln(n){return`${n.kind==="image"?"图片":"视频"} · ${qt({width:n.width,height:n.height},{})}`}function or(n){return A(n.width)&&A(n.height)&&Number.isSafeInteger(n.width)&&Number.isSafeInteger(n.height)&&n.width>0&&n.height>0&&["image","video"].includes(n.kind||"")?Ln({kind:n.kind||"",width:n.width,height:n.height}):"尺寸未记录"}const lr=n=>`${ln(n).join(" + ")}｜${cn(n)}`;function cr(n){const t=s=>Qe(s)?s.source!=="historical"&&A(s.last_sample_at)?3:s.source==="historical"?2:1:0;return[...n].sort((s,a)=>t(a)-t(s)||(t(s)===3?(a.last_sample_at||0)-(s.last_sample_at||0):0)||(a.samples||0)-(s.samples||0)||(a.measured||0)-(s.measured||0))[0]}function In(n){const t=[...n.warnings||[]],s=qn(n);return(!A(n.samples)||n.samples<30||!A(s)||s<3)&&t.push("参考样本不足：建议至少 30 个任务且跨 3 天；达到门槛也不是置信保证。"),n.source==="historical"&&t.push("仅成功任务 runtime 参考，未计完整占机、重试及质量损耗；不是合格日产能。"),n.eligible!==!0&&t.push("完整基线证据不足，不作为已验证采购依据。"),[...new Set(t)]}const qe=n=>{const t={task:"任务",tasks:"任务",image:"张图片",images:"张图片",video:"条视频",videos:"条视频",second:"视频秒",seconds:"视频秒",video_seconds:"视频秒"};return n.source==="historical"?"任务":t[n.unit||""]||M(n.unit)};function Lt(n){const t=Object.hasOwn(n,"model_evidence"),s=n.model_evidence;return{variants:t?(s?.variants||[]).filter(r=>["task_snapshot","archived_task"].includes(r.source)):n.model_summary?.source==="task_snapshot"?[{source:"task_snapshot",summary:n.model_summary,samples:null,measured:null}]:[],hasEvidence:t,total:s?.total_samples,recorded:s?.recorded_samples,reference:n.current_model_reference?.source==="current_template"?n.current_model_reference:null}}const Se=n=>n?.models||[];function dr(n,t,s){const r={high_noise:"高噪声",low_noise:"低噪声",高噪声:"高噪声",低噪声:"低噪声",base:"基础模型",refiner:"精修模型",生成主模型:"生成主模型",深度模型:"深度模型",放大模型:"放大模型",插帧模型:"插帧模型"}[n.role||""];return r?`${r} · 主模型 ${t+1}`:s>1?`主模型 ${t+1}`:""}function wn(n){const t=[];if(n.precision&&n.precision_source==="filename"&&t.push(`文件标记 ${M(n.precision)}`),n.loader_dtype){const s=M(n.loader_dtype),a=s.split(/\s*\/\s*/).map(i=>i.match(/^(bfloat16|bf16|float(?:8|16|32|64)|fp(?:8|16|32|64))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]),r=a.every(Boolean)?[...new Set(a.map(i=>i?.toUpperCase().replace("BFLOAT16","BF16").replace("FLOAT","FP")))].join(" / "):null;t.push(`加载配置 ${r?`${r}（${s}）`:s}${["default","auto"].includes(s.toLowerCase())?"（实际精度未确认）":""}`)}else n.precision&&n.precision_source==="loader"&&t.push(`加载配置 ${M(n.precision)}`);return t.length||t.push("精度未记录 / 待确认"),t}function pr(n){const t=i=>{if(typeof i!="string")return null;const o=i.split(/\s*\/\s*/).map(l=>l.trim().match(/^(bfloat16|float(?:8|16|32|64)|bf16|fp(?:4|8|16|32|64)|int(?:4|8|16)|nf4|q[2-8]_(?:k(?:_[sml])?|[01]))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]);return o.every(Boolean)?[...new Set(o.map(l=>l?.toUpperCase().replace("BFLOAT16","BF16").replace("FLOAT","FP")))].sort().join(" / "):null},s=n.precision_source==="filename"?t(n.precision):null,a=t(n.loader_dtype)||(n.precision_source==="loader"?t(n.precision):null),r=wn(n).filter(i=>i.startsWith("文件标记 ")?!!s:i.startsWith("加载配置 ")?!!a||["default","auto"].includes(String(n.loader_dtype).toLowerCase()):!1);return r.some(i=>i.startsWith("文件标记 "))||r.unshift("文件标记未记录 / 待确认"),r.some(i=>i.startsWith("加载配置 "))||r.push("加载配置未记录 / 待确认"),r}function It(n){return JSON.stringify([n.capability,n.spec_key||`unknown:${n.id}`,n.source,n.spec?.model_version||null,n.config?.model_version||null,n.config?.environment_id||null,n.source==="standard"?n.benchmark_id||`unknown:${n.id}`:null,n.cache_condition||null])}function mr(n){const t=new Map,s={none:"无节点结果缓存",loaders:"加载节点缓存",execution:"执行节点缓存",unknown:"未知",mixed:"混合条件"};for(const a of n){const r=Rn(a.cache_condition).kind;t.set(It(a),`${Pt(a)} / ${M(a.spec_key)} / ${de(a.source)} / 模型 ${M(a.spec?.model_version||a.config?.model_version)} / 环境 ${M(a.config?.environment_id)} / 缓存 ${typeof r=="string"&&s[r]||"未知"}${a.source==="standard"?` / 基准 ${M(a.benchmark_id)}`:""}`)}return[...t]}function An(n,t,s,a=[]){return`${t||s.find(r=>r.id===n)?.name||a.find(r=>r.worker_id===n)?.worker_name||"未关联执行端"}（${n||"Worker ID 未知"}）`}function ur(n){return n.review?.source==="standard"?"标准样本（人工声明）":n.review?.source==="business"?"业务样本":"未标记"}function At({title:n,children:t,className:s}){const[a,r]=m.useState(!1);return e.jsxs("details",{className:s,onToggle:i=>{i.currentTarget.open&&r(!0)},children:[e.jsx("summary",{children:n}),a&&(typeof t=="function"?t():t)]})}function en({title:n,value:t,className:s}){return e.jsx(At,{title:n,className:s,children:()=>e.jsx("pre",{children:M(t)})})}function dn({values:n=[],className:t="warn"}){return e.jsx("ul",{className:t,children:n.map((s,a)=>e.jsx("li",{children:s},a))})}function _n({items:n}){return n.map(([t,s])=>e.jsxs("div",{className:"metric",children:[e.jsx("span",{children:t}),e.jsx("strong",{children:$(s)})]},t))}function Tn({headers:n,children:t}){return e.jsx("div",{className:"scroll",tabIndex:0,role:"region","aria-label":n.join(" / "),children:e.jsxs("table",{children:[e.jsx("thead",{children:e.jsx("tr",{children:n.map(s=>e.jsx("th",{scope:"col",children:s},s))})}),e.jsx("tbody",{children:t})]})})}function Tt({resolution:n}){const t=Rt(n);return e.jsxs(e.Fragment,{children:[t.length?e.jsxs(e.Fragment,{children:[new Set(t.map(s=>`${s.width}x${s.height}`)).size>1&&e.jsx("span",{className:"hint",children:"多种成品规格（非单一尺寸）"}),t.map((s,a)=>e.jsx("span",{className:"resolution-variant",children:Ln(s)},a))]}):e.jsx("span",{children:"尺寸未记录"}),A(n?.total_samples)&&n.total_samples>0&&n.complete_samples!==n.total_samples&&e.jsxs("span",{className:"resolution-coverage hint",children:["已知 ",$(n.recorded_samples)," / ",$(n.total_samples)," ","次任务的部分或全部成品"]})]})}function Dt({resolution:n}){return e.jsxs("div",{className:"output-resolution-details",children:[e.jsx("h3",{children:"实际成品"}),e.jsx("div",{className:"actual-resolution",children:e.jsx(Tt,{resolution:n})}),e.jsxs("p",{children:["尺寸覆盖：",$(n?.recorded_samples)," / ",$(n?.total_samples)," ","次已完成任务至少有一个成品尺寸；",$(n?.complete_samples)," /"," ",$(n?.total_samples)," 次已完成任务的全部最终产物都有尺寸。"]}),e.jsxs("p",{children:["已知尺寸产物 ",$(n?.recorded_outputs)," / ",$(n?.total_outputs)," 个",n?.total_outputs==null?"（最终清单不完整，产物总数未知）":"","。"]}),Rt(n).map((t,s)=>e.jsxs("p",{children:[Ln(t),"：",$(t.outputs)," 个产物 / ",$(t.samples)," 次任务"]},s)),e.jsx("p",{className:"hint",children:"同一任务可能包含多种尺寸，各尺寸的任务数不能相加。尺寸来自最终产物记录或受控补采，与技术合格产量、人工验收和采购资格分离；有尺寸不代表技术合格。平均耗时仍为原组成功任务平均，不按尺寸重算。"})]})}function st({summary:n,origin:t}){const s=Se(n);return e.jsxs("div",{className:"model-reference",children:[e.jsx("p",{className:"model-origin",children:t}),n.complete===!1&&e.jsx("p",{className:"warn",children:"不完整 / 未确认完整主模型链；动态选择或未知链路不能推断全部主模型。"}),!s.length&&e.jsx("p",{children:"未获取到模型信息，模型待确认。"}),s.map((a,r)=>e.jsx("p",{children:`${dr(a,r,s.length)||"主模型"}：${M(a.name)}；角色：${M(a.role)}；${wn(a).join("；")}；非运行时检测`},r)),!!n.auxiliary_models?.length&&e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"hint",children:"辅助模型（不计入主模型名称或精度）"}),n.auxiliary_models?.map((a,r)=>e.jsx("p",{className:"hint",children:`角色：${M(a.role)}；${M(a.name)}；${wn(a).join("；")}`},r))]})]})}function Ft({g:n}){const t={...n.spec?.dimensions,...n.dimensions},s=Lt(n);return e.jsxs("div",{className:"pad",children:[e.jsxs("p",{children:["输入素材：",ln(n).join(" / ")]}),e.jsxs("p",{children:["生成参数：",cn(n,!0)]}),A(t.source_duration)&&e.jsxs("p",{className:"hint",children:["首个输入视频时长：",$(t.source_duration)," 秒（非多段视频合计）"]}),e.jsx("p",{className:"hint",children:"素材数量按任务输入槽位计，同一文件被多次引用也会分别计数；生成参数不是成品实测规格。"}),e.jsxs("p",{children:["来源：",de(n.source),"；有效耗时样本 ",$(n.measured)," / 总样本 ",$(n.samples),"；成功"," ",$(n.done)," / 失败 ",$(n.error)," / 取消 ",$(n.canceled)]}),e.jsxs("p",{children:["mean：",Z(n.mean_seconds),"；P50：",Z(n.p50_seconds),"；P90：",Z(n.p90_seconds),"；最近成功样本：",Ae(n.last_sample_at)]}),e.jsx("p",{className:"hint",children:"平均值仅使用该组成功任务执行耗时；不包含排队，不等于纯 GPU 计算时间，也不是合格日产能。"}),e.jsxs("p",{children:["执行时配置：",He(n.config),"（",on(n.config_source),"）"]}),e.jsxs("p",{children:["缓存条件：",M(n.cache_condition)]}),e.jsxs("p",{children:["成功 runtime 合计：",Z(n.runtime_seconds),"；占机合计：",Z(n.occupied_seconds),"；实际产出：",$(n.output_count)," ",qe(n),"。"]}),e.jsxs("p",{children:["单位技术交付：",Z(n.seconds_per_unit)," / ",qe(n),"；单位人工合格：",Z(n.qualified_seconds_per_unit)," / ",qe(n),"；已人工验收：",$(n.reviewed),"；全组人工合格数量：",$(n.accepted),"。"]}),e.jsxs("p",{className:"hint",children:["技术基线资格：",n.eligible===!0?"服务端判定具备完整基线证据":n.eligible===!1?"证据不足，不作为已验证采购依据":"未记录","；标准场景编号：",M(n.benchmark_id),"。"]}),e.jsx(Dt,{resolution:n.output_resolution}),s.hasEvidence&&e.jsxs("p",{children:["模型记录覆盖 ",$(s.recorded)," / ",$(s.total)," ","次；覆盖数不是完整主模型链的确认。"]}),s.variants.length>1&&e.jsx("p",{className:"warn",children:"不同任务记录对应不同模型组合；每个组合内的主模型才属于同一个图。全组平均耗时不代表任一组合的专属速度。"}),!s.variants.length&&e.jsx("p",{children:"历史未记录可用主模型证据；不能用当前模板补写历史模型与精度。"}),s.variants.map((a,r)=>e.jsx(st,{summary:a.summary,origin:`历史任务记录组合 ${r+1} · ${a.source==="archived_task"?"保留的原任务记录":"任务提交记录"}${s.hasEvidence?` · ${$(a.samples)} 次记录 / ${$(a.measured)} 次成功耗时`:""}`},r)),s.reference?e.jsxs(e.Fragment,{children:[e.jsx(st,{summary:s.reference,origin:`当前工具默认配置（非历史执行记录）· ${M(s.reference.capability_name)}`}),e.jsx("p",{className:"warn hint",children:"仅为工具模板默认值，不代表用户画布节点当前选中的模型。历史耗时不代表当前模型速度；参考信息不补齐历史覆盖，也不覆盖历史精度。"})]}):!s.variants.length&&e.jsx("p",{className:"hint",children:"未获取到模型信息：当前工具模板未提供、找不到或无法识别。"}),e.jsx(dn,{values:In(n)}),e.jsxs("p",{className:"hint",children:["采样日期：",M(n.days),"；配置编号：",M(n.config_id),"；采样编号：",n.id]}),e.jsx(en,{title:"原始规格与证据",value:{dimensions:n.dimensions,spec:n.spec,output_resolution:n.output_resolution,recovered_outputs:n.recovered_outputs,model_summary:n.model_summary,model_evidence:n.model_evidence,current_model_reference:n.current_model_reference,cache_condition:n.cache_condition}})]})}function Ot({groups:n,report:t}){return n.length?e.jsx(Tn,{headers:["业务 / 执行端 / 来源","精确业务规格","样本覆盖","成功任务耗时分布","运行参考 / 产出口径","警告与限制"],children:n.map(s=>e.jsxs("tr",{"data-group-id":s.id,children:[e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsx("strong",{children:Pe(s)}),e.jsxs("p",{className:"hint",children:["能力 ID：",s.capability]}),e.jsx("p",{className:"hint",children:An(s.worker_id,s.worker_name,t.workers,t.groups)}),e.jsx("span",{className:"badge",children:de(s.source)}),e.jsxs("p",{className:"hint",children:["配置：",M(s.config_id)]}),s.source==="standard"&&e.jsxs("p",{className:"hint",children:["标准场景编号：",M(s.benchmark_id)]})]})}),e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsxs("p",{children:["规格键：",M(s.spec_key)]}),e.jsxs("p",{className:"hint",children:["已知规格：",M(s.dimensions)]}),e.jsx(At,{title:"配置 / 规格 / 日期证据",children:()=>e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["执行时配置：",He(s.config)]}),e.jsxs("p",{children:["配置来源：",on(s.config_source)]}),e.jsxs("p",{children:["采样日期（服务端记录）：",M(s.days)]}),e.jsxs("p",{children:["缓存条件：",M(s.cache_condition)]}),e.jsx("pre",{children:M(s.spec)})]})})]})}),e.jsx("td",{children:e.jsxs("div",{children:[e.jsxs("p",{children:["样本 ",$(s.samples)," / ",$(qn(s))," 天"]}),e.jsxs("p",{children:["完成 ",$(s.done)," / 失败 ",$(s.error)," / 取消 ",$(s.canceled)]}),e.jsxs("p",{className:"hint",children:["有效耗时样本 ",$(s.measured),"；已人工验收 ",$(s.reviewed)]})]})}),e.jsx("td",{children:e.jsxs("div",{children:[e.jsxs("p",{children:["平均 ",Z(s.mean_seconds)]}),e.jsxs("p",{children:["P50 ",Z(s.p50_seconds)]}),e.jsxs("p",{children:["P90 ",Z(s.p90_seconds)]})]})}),e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsxs("p",{children:["成功任务 runtime 合计 ",Z(s.runtime_seconds)]}),e.jsxs("p",{children:["成功任务 / 运行小时（仅 runtime 参考）：",$(s.reference_per_hour)]}),s.source!=="historical"&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["占机合计 ",Z(s.occupied_seconds)]}),e.jsxs("p",{children:["实际产出 ",$(s.output_count)," ",qe(s)]}),e.jsxs("p",{children:["单位技术交付 ",Z(s.seconds_per_unit)," / ",qe(s)]}),e.jsxs("p",{children:["单位人工合格 ",Z(s.qualified_seconds_per_unit)," / ",qe(s)]})]})]})}),e.jsx("td",{className:"wide",children:e.jsx(dn,{values:In(s)})})]},s.id))}):e.jsx("p",{className:"empty",children:"暂无业务规格样本；未测试场景不能推算产能。"})}function hr({items:n}){return e.jsx("dl",{children:n.map(([t,s])=>e.jsxs(m.Fragment,{children:[e.jsx("dt",{children:t}),e.jsx("dd",{children:s})]},t))})}function xr({entries:n,worker:t,title:s,ready:a,onEvidence:r}){const[i,o]=m.useState(()=>cr(n)?.id||""),[l,p]=m.useState(!1),[d,c]=m.useState(!1),g=`summary-evidence-${m.useId().replace(/[^a-zA-Z0-9_-]/g,"")}`,u=n.find(k=>k.id===i)||n[0];if(!u)return null;const y=Lt(u),j=y.variants.length?y.variants.map(k=>k.summary):y.reference?[y.reference]:[],w=j.reduce((k,L)=>k+Math.max(1,Se(L).length),0)||1,v=n.map(lr),f=new Map;for(const k of v)f.set(k,(f.get(k)||0)+1);const h=y.variants.length?y.variants.length>1||y.hasEvidence&&A(y.recorded)&&A(y.total)&&y.recorded<y.total||y.variants.some(k=>k.summary.complete===!1)?"全组历史任务平均，非某个模型或组合专属速度。":"":y.reference?"此处耗时来自历史任务，不代表当前模型速度。":"",x={"--model-rows":w+1};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"business-row","data-capability":u.capability,"data-selected-group-id":u.id,children:[e.jsxs("div",{className:"matrix-field","data-label":"平均生成时间",children:[e.jsx("span",{className:Qe(u)?"mean-time":"muted",children:Qe(u)?rr(u.mean_seconds):"暂无成功耗时"}),h&&e.jsx("p",{className:"warn hint",children:h}),Qe(u)&&A(u.mean_seconds)&&(u.mean_seconds<1||u.mean_seconds>3600)&&e.jsx("p",{className:"warn hint",children:"耗时异常，请核对详情"})]}),e.jsxs("div",{className:"matrix-samples","data-label":"样本与详情",children:[e.jsxs("p",{className:!A(u.measured)||u.measured<30?"warn hint":"hint",children:[A(u.measured)?u.measured<30?`仅 ${$(u.measured)} 次 / 仅供参考`:`${$(u.measured)} 次成功实测`:"样本数未记录"," ","· ",de(u.source)]}),e.jsx("button",{type:"button",className:"summary-detail-toggle","aria-expanded":l,"aria-controls":g,onClick:()=>{p(!l),l||c(!0)},children:l?"收起详情":"查看详情"})]}),e.jsxs("div",{className:"matrix-field","data-label":"任务规格",children:[e.jsx("select",{className:"summary-spec",disabled:!a,"aria-label":`${t.name||"机器"} ${s}任务规格`,title:`原组 ${u.id} / 配置 ${M(u.config_id)} / ${de(u.source)} / 规格键 ${M(u.spec_key)}`,value:u.id,onChange:k=>{a&&(o(k.target.value),c(l))},children:n.map((k,L)=>e.jsx("option",{value:k.id,children:`${v[L]}${(f.get(v[L]||"")||0)>1?` · ${de(k.source)} · ${A(k.last_sample_at)?Ae(k.last_sample_at):"日期未记录"} · 采样 ${L+1}`:""}`},k.id))}),e.jsxs("dl",{className:"selected-spec",children:[e.jsx("dt",{children:"输入素材"}),e.jsx("dd",{className:"input-materials",children:ln(u).map(k=>e.jsx("span",{children:k},k))}),e.jsx("dt",{children:"生成参数"}),e.jsx("dd",{className:"generation-parameters",children:cn(u)}),e.jsx("dt",{children:"实际成品"}),e.jsx("dd",{className:"actual-resolution",children:e.jsx(Tt,{resolution:u.output_resolution})})]})]}),e.jsxs("div",{className:"matrix-models",style:x,children:[e.jsx("div",{className:"matrix-field","data-label":"模型名称",children:j.length?j.map((k,L)=>e.jsx("div",{className:"model-variant",children:Se(k).length?Se(k).map((T,_)=>e.jsx("div",{className:"model-item",children:e.jsx("p",{className:"model-name",children:T.name||"未获取到模型信息"})},_)):e.jsx("p",{className:"muted",children:"未获取到模型信息"})},L)):e.jsx("span",{className:"muted",children:"未获取到模型信息"})}),e.jsx("div",{className:"matrix-field","data-label":"模型精度",children:j.length?j.map((k,L)=>e.jsx("div",{className:"model-variant",children:Se(k).length?Se(k).map((T,_)=>e.jsx("div",{className:"model-item",children:pr(T).map(N=>e.jsx("p",{className:"model-label",children:N},N))},_)):e.jsx("p",{className:"muted",children:"无"})},L)):e.jsx("p",{className:"muted",children:"无"})})]})]}),e.jsx("div",{className:"summary-evidence",id:g,hidden:!l,children:d&&e.jsxs(e.Fragment,{children:[e.jsx(Ft,{g:u},u.id),e.jsx("button",{type:"button","data-evidence-entry":"",disabled:!a,onClick:()=>{a&&r(u.id)},children:"任务证据"})]})})]})}function fr({report:n,ready:t,includeOffline:s,onProfile:a,onEvidence:r}){const i=n.workers.filter(d=>s||he(d));if(!i.length)return e.jsx("p",{className:"empty",children:s?"暂无机器记录。":"当前没有在线机器，可勾选“包含离线”查看已登记记录。"});const o=new Set(i.map(d=>d.id)),l=new Map;for(const d of n.groups)if(d.worker_id&&o.has(d.worker_id)){let c=l.get(d.capability);c||(c={title:Pe(d),machines:new Map},l.set(d.capability,c)),c.machines.set(d.worker_id,[...c.machines.get(d.worker_id)||[],d])}l.size||l.set("",{title:"历史记录",machines:new Map});const p={"--machine-count":i.length};return e.jsx("div",{className:"scroll comparison-scroll",tabIndex:0,role:"region","aria-label":"机器产能对比表，可横向滚动",children:e.jsxs("table",{className:"simple-table matrix-table","aria-label":"机器与业务能力对比",style:p,children:[e.jsxs("colgroup",{children:[e.jsx("col",{className:"matrix-axis-col"}),i.map(d=>e.jsx("col",{},d.id))]}),e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"business-axis",scope:"col",children:"业务能力"}),i.map((d,c)=>e.jsxs("th",{className:"machine-heading",scope:"col",id:`summary-machine-${c+1}`,"data-summary-worker-id":d.id,children:[e.jsx("h3",{children:d.name||"未命名机器"}),e.jsx("span",{className:["busy","running"].includes(d.state)?"warn":he(d)?"online-state":"muted",children:Pn[d.state]||"状态待确认"}),e.jsx("p",{className:"machine-hardware",children:ar(d)}),e.jsxs("details",{className:"machine-more",children:[e.jsx("summary",{children:"机器详情"}),e.jsx("p",{children:ir(d)}),e.jsxs("p",{className:"hint",children:["最后上报：",Ae(d.last_seen),"；Worker ID：",d.id,"；采集程序版本：",M(d.agent_version)]}),!he(d)&&e.jsx("p",{className:"hint",children:"此记录当前不可用，配置为最后上报信息，历史速度不代表现在能执行。"}),e.jsx("button",{type:"button",onClick:()=>a(d),children:"查看配置"})]})]},d.id))]})}),e.jsx("tbody",{children:[...l].map(([d,{title:c,machines:g}],u)=>e.jsxs("tr",{className:"capability-row","data-capability":d||void 0,children:[e.jsx("th",{className:"business-axis",scope:"row",id:`summary-business-${u+1}`,children:e.jsx("span",{className:"business-title",children:c})}),i.map((y,j)=>{const w=g.get(y.id);return e.jsx("td",{className:"machine-result","data-summary-worker-id":y.id,headers:`summary-machine-${j+1} summary-business-${u+1}`,children:w?e.jsx(xr,{entries:w,worker:y,title:c,ready:t,onEvidence:r}):e.jsx("p",{className:"matrix-empty",children:"暂无记录；不据此推断是否支持该业务。"})},y.id)})]},d))})]})})}function gr({report:n,mounted:t,onProfile:s}){const a=n?.overview||{};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"summary",children:[e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"生成任务"}),e.jsx("span",{className:"hint",children:"不是产物数量"})]}),e.jsx("div",{id:"task-metrics",className:"metrics pad",children:t&&e.jsx(_n,{items:[["总任务",a.tasks],["完成",a.done],["失败",a.error],["取消",a.canceled]]})}),e.jsx("p",{id:"coverage",className:"hint pad",children:t&&`历史 ${$(a.historical_tasks)} / 新采集 ${$(a.captured_tasks)}；Worker 未关联 ${$(a.unknown_worker)}；已排除 API ${$(a.excluded_api)}。`})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"实际产物"}),e.jsx("span",{className:"hint",children:"仅已知输出，不从请求推断"})]}),e.jsx("div",{id:"output-metrics",className:"metrics pad",children:t&&e.jsx(_n,{items:[["图片（张）",a.output_images],["视频（条）",a.output_videos],["视频总时长（秒）",a.output_seconds],["产物未知记录",a.unknown_outputs]]})}),e.jsx("p",{className:"hint pad",children:"图片、视频、时长分别统计；未知不记为零，也不计为人工合格。"})]})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"机器配置与状态"}),e.jsx("span",{className:"hint",children:"按 Worker ID 区分，名称相同不合并"})]}),e.jsx("p",{className:"notice hint",children:"配置为当前或最后上报信息，不代表历史执行快照，也不是最低采购配置。系统可见内存不是标称容量，多卡显存不相加。"}),e.jsx("div",{id:"workers",className:"worker-grid",children:t&&n&&(n.workers.length?n.workers.map(r=>{const i=r.hardware,o=["offline","disabled"].includes(r.state)||!A(r.last_seen)||Date.now()/1e3-r.last_seen>120;return e.jsxs("article",{className:"worker","data-worker-id":r.id,children:[e.jsx("h3",{children:M(r.name)}),e.jsxs("p",{className:"hint",children:["Worker ID：",r.id]}),e.jsx("span",{className:"badge",children:Pn[r.state]||r.state}),e.jsxs("p",{className:o?"warn":"hint",children:["最后心跳：",Ae(r.last_seen),o?"；状态 / 配置快照已过期或无法确认，请勿视为实时。":""]}),e.jsx(hr,{items:[["GPU",i?.gpus?.length?i.gpus.map((l,p)=>`GPU ${p+1}：${M(l.name)} / 单卡显存 ${Ie(l.memory_total_bytes)}`).join(`
`):"未知"],["GPU 数量",i?.gpus?.length?$(i.gpus.length):"未知"],["CPU",Be(i?.cpu,"cpu")],["内存",Ie(i?.memory_total_bytes)],["系统",Be(i?.os,"os")],["环境",M(i?.environment_id)],["模型版本",M(i?.model_version)],["主机 ID",M(i?.host_id)],["磁盘",M(i?.disk)],["配置备注",M(i?.note)]]}),e.jsxs("p",{className:"hint",children:["配置来源：",on(r.hardware_source),"。人工补录不回写历史快照。"]}),e.jsxs("p",{children:["任务 ",$(r.tasks)," / 完成 ",$(r.done)," / 失败 ",$(r.error)," / 取消"," ",$(r.canceled)]}),e.jsxs("p",{className:"hint",children:["累计 runtime：",Z(r.runtime_seconds)]}),r.id&&r.state!=="historical"?e.jsxs("details",{className:"profile-details",children:[e.jsx("summary",{children:"补录机器配置（人工声明）"}),e.jsx("p",{className:"hint",children:"7 个字段仅保存非空新声明，不回写历史快照。"}),e.jsx("button",{type:"button",onClick:()=>s(r),children:"查看 / 补录配置"})]}):e.jsx("p",{className:"hint",children:"历史执行端未关联现存注册记录，不能补录配置。"})]},r.id)}):e.jsx("p",{className:"empty",children:"暂无执行端信息；无法关联的历史任务不会按名称猜测机器。"}))})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"业务规格分组"}),e.jsx("span",{className:"hint",children:"原始统计保留失败、取消与异常记录"})]}),e.jsx("div",{id:"machine-groups",children:t&&n&&e.jsx(Ot,{groups:n.groups,report:n})})]})]})}const br={mode:"historical",quality:"technical",availability:1,utilization:.75},ge=[{id:"zimage_t2i",type:"生图模式",label:"文生图",capabilities:["zimage_t2i","krea2_t2i","qwen_image_2512_t2i","qwen_image_21_t2i"]},{id:"zimage_i2i",type:"生图模式",label:"图生图",capabilities:["zimage_i2i","krea2_i2i","qwen_image_edit_2511_i2i","qwen_image_21_multi","qwen_image_21_i2i"]},{id:"flux2_klein_storyboard9",type:"生图模式",label:"多宫格故事分镜",capabilities:["flux2_klein_storyboard9"]},{id:"flux2_klein_edit",type:"生图模式",label:"参考图编辑(保人物)",capabilities:["flux2_klein_edit"]},{id:"minimax_h3_character_transfer",type:"生视频模式",label:"H3人物迁移",capabilities:["minimax_h3_character_transfer"]},{id:"minimax_h3_flf2v",type:"生视频模式",label:"H3 图生视频",capabilities:["minimax_h3_i2v","minimax_h3_flf2v"]},{id:"minimax_h3_talk2",type:"生视频模式",label:"H3 说话唱歌",capabilities:["minimax_h3_talk1","minimax_h3_talk2"]},{id:"minimax_h3_ref4",type:"生视频模式",label:"H3图片参考",capabilities:["minimax_h3_ref4"]},{id:"minimax_h3_comic20",type:"生视频模式",label:"漫剧4宫格",capabilities:["minimax_h3_comic20"]},{id:"minimax_h3_fusion_v2",type:"生视频模式",label:"H3无损融合单采V2",capabilities:["minimax_h3_fusion_v2"]},{id:"minimax_h3_ref9",type:"生视频模式",label:"H3全能参考",capabilities:["minimax_h3_ref9"]},{id:"minimax_h3_ref_2pass",type:"生视频模式",label:"H3全能参考(高质量)",capabilities:["minimax_h3_ref_2pass"]}],kn=n=>ge.find(t=>n!==void 0&&t.capabilities.includes(n)),yr=n=>JSON.stringify(n.source==="standard"?[n.config_id||null,n.source,n.benchmark_id||`unknown:${n.id}`]:[n.config_id||null,n.source]),vr=n=>A(n.mean_seconds)&&n.mean_seconds>0&&A(n.measured)&&n.measured>0;function pn(n,t){return n.workers.some(s=>s.id===t&&he(s))?n.groups.filter(s=>s.worker_id===t&&["historical","captured","standard"].includes(s.source)&&kn(s.capability)&&vr(s)):[]}const Ut=(n,t)=>n<t?-1:n>t?1:0;function jr(n,t){return(t.measured||0)-(n.measured||0)||(t.samples||0)-(n.samples||0)||(t.last_sample_at||0)-(n.last_sample_at||0)||(t.mean_seconds||0)-(n.mean_seconds||0)||Ut(n.id,t.id)}function wr(n,t){const s=new Map;for(const i of t){const o=yr(i);s.set(o,[...s.get(o)||[],i])}const a=[];for(const[i,o]of s){const l=[];for(const p of n){const d=ge.find(g=>g.id===p.mode_id),c=o.filter(g=>d?.capabilities.includes(g.capability)).sort(jr)[0];c&&l.push(c)}l.length===n.length&&a.push({key:i,groups:l,measured:l.reduce((p,d)=>p+(d.measured||0),0)})}a.sort((i,o)=>o.measured-i.measured||Ut(i.key,o.key));const r=a[0];if(!r)throw Error("所选模式没有同一电脑、同一配置和来源的共同实测记录，请减少模式或换一台电脑");return r.groups}function _r(n,t,s,a,r,i){if(!n.workers.some(d=>d.id===s&&he(d)))throw Error("所选电脑当前不在线，请刷新后重新选择。");const o=pn(n,s),l=new Set;for(const d of i){const c=ge.find(g=>g.id===d.mode_id);if(!c||!o.some(g=>c.capabilities.includes(g.capability)))throw Error("所选模式没有成功耗时记录，请换一个模式或电脑。");if(l.has(d.mode_id))throw Error("同一模式请合并每日需求，不能重复选择。");if(l.add(d.mode_id),!A(Number(d.quantity))||Number(d.quantity)<=0)throw Error("每日需求必须是大于零的有限任务数量。")}if(!i.length)throw Error("请至少添加一个有样本的业务模式。");const p=wr(i,o);return Ct.parse({...t,...br,worker_id:s,hours:Number(a),...r!==""?{price:Number(r)}:{},demands:i.map((d,c)=>{const g=p[c];if(!g)throw Error("原组证据缺失");return{group_id:g.id,quantity:Number(d.quantity)}})})}const Wt=[{key:"host_id",label:"主机 ID",maxLength:160},{key:"cpu",label:"CPU 型号",maxLength:160},{key:"memory_total_bytes",label:"系统可见内存（GiB）"},{key:"environment_id",label:"执行环境版本",maxLength:160},{key:"model_version",label:"模型版本",maxLength:160},{key:"disk",label:"磁盘配置说明",maxLength:160},{key:"note",label:"配置备注",maxLength:500}];function Nn(n,t){if(Array.from(n).some(s=>s.charCodeAt(0)<32||s.charCodeAt(0)===127))throw Error(t)}function kr(n,t){const s={};for(const{key:a}of Wt){const r=(n[a]||"").trim();if(r)if(Nn(r,"配置字段请使用不含控制字符的单行文本。"),a==="memory_total_bytes"){const i=Math.round(Number(r)*1073741824);if(!Number.isSafeInteger(i)||i<=0)throw Error("内存必须是能转换为安全正整数字节的 GiB 数值。");i!==t?.[a]&&(s[a]=i)}else r!==(a==="cpu"?Be(t?.cpu,"cpu"):t?.[a])&&(s[a]=r)}if(!Object.keys(s).length)throw Error("没有需要保存的修改；留空不会删除已有配置。");return Mt.parse(s)}function Nr(n){const t=n.accepted===""?null:Number(n.accepted);if(t!==null&&(!Number.isSafeInteger(t)||t<0))throw Error("请输入非负整数，或留空表示未验收。");const s=(n.benchmark_id||"").trim(),a=(n.note||"").trim();if(n.source==="standard"&&!s)throw Error("标准样本需要填写标准场景编号；标签不代表自动验证。");return Nn(a,"验收备注和标准场景编号请使用单行文本，不含换行或控制字符。"),Nn(s,"验收备注和标准场景编号请使用单行文本，不含换行或控制字符。"),Et.parse({accepted:t,source:n.source,benchmark_id:s,note:a})}function Sr(n){let t=n==null?"":typeof n=="object"?JSON.stringify(n):String(n);return/^[\s]*[=+\-@]/.test(t)&&(t="'"+t),'"'+t.replace(/"/g,'""')+'"'}function $r(n){return"\uFEFF"+[["类别","内容"],["测算口径","历史任务运行参考，不是合格日产能"],["输入与时间范围",n.payload],["当前机器配置（非历史快照）",n.hardware],["测算结果",n.result],...n.groups.map(s=>["场景证据",{...s,warnings:In(s)}])].map(s=>s.map(Sr).join(",")).join(`\r
`)}function zr({worker:n,controller:t,onClose:s}){const[a,r]=m.useState({});return e.jsx(te,{title:n.state==="historical"?"历史执行端配置":`机器配置与人工补录 · ${n.name||n.id}`,className:"capacity-page",onClose:s,submitLabel:n.state==="historical"?"关闭":"保存人工配置",onSubmit:n.state==="historical"?async()=>{}:async()=>{const i=kr(a,n.hardware);try{await t.saveProfile(n.id,i)}catch(o){throw Error(`保存失败：${ne(o)}。输入已保留，请检查字段后重试。`)}},children:n.state==="historical"?e.jsx("p",{children:He(n.hardware)}):e.jsxs("div",{className:"capacity-operation",children:[e.jsxs("details",{children:[e.jsx("summary",{children:"当前 / 最后上报配置"}),e.jsx("p",{children:He(n.hardware)}),e.jsxs("p",{children:["配置来源：",on(n.hardware_source),"；配置备注：",M(n.hardware?.note)]})]}),e.jsx("p",{className:"notice",children:"仅保存本次修改的非空字段；留空保留原值。内存以 GiB 输入、按字节保存，不是采购标称容量。新声明仅向后生效，不回写历史快照。"}),e.jsx("p",{className:"hint",children:"主机 ID 仅在人工确认属于同一物理机器时填写相同值，不按机器名称合并；同机多个 Worker 不自动代表多倍产能。"}),e.jsx("div",{className:"profile-form",children:Wt.map(({key:i,label:o,maxLength:l})=>e.jsxs("label",{className:"field",children:[e.jsx("span",{children:o}),e.jsx("input",{name:i,type:i==="memory_total_bytes"?"number":"text",min:i==="memory_total_bytes"?"0.000001":void 0,step:i==="memory_total_bytes"?"any":void 0,maxLength:l,placeholder:["model_version","environment_id"].includes(i)?"填写固定版本，勿用 latest / main / unknown":"留空保留现值",value:a[i]||"",onChange:p=>{r({...a,[i]:p.target.value}),t.invalidateEstimate("机器配置输入已更改；请保存后重新计算，未保存内容不会进入测算。")}})]},i))})]})})}function Cr({detail:n,controller:t,onClose:s}){const[a,r]=m.useState({accepted:A(n.review?.accepted)?String(n.review.accepted):"",source:n.review?.source==="standard"?"standard":"business",benchmark_id:n.review?.benchmark_id||"",note:n.review?.note||""}),i=(o,l)=>{r({...a,[o]:l}),t.invalidateEstimate("人工验收输入已变更；未保存内容不会进入测算。")};return e.jsx(te,{title:`人工验收 · ${n.job_id}`,className:"capacity-page",onClose:s,submitLabel:"保存人工标记",onSubmit:async()=>{const o=Nr(a);try{await t.saveReview(n.job_id,o)}catch(l){throw Error(`保存失败：${ne(l)}`)}},children:e.jsxs("div",{className:"review-form",children:[e.jsxs("p",{children:["任务 ",n.job_id,"；原采集来源：",de(n.source),"。"]}),e.jsxs("div",{className:"review-fields",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"人工合格产物数量（留空为未验收）"}),e.jsx("input",{name:"accepted",type:"number",min:"0",step:"1",value:a.accepted,onChange:o=>i("accepted",o.target.value)})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"人工样本标签"}),e.jsxs("select",{name:"source",value:a.source,onChange:o=>i("source",o.target.value),children:[e.jsx("option",{value:"business",children:"业务样本"}),e.jsx("option",{value:"standard",children:"标准样本（人工声明）"})]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"标准场景编号（标准样本请填写）"}),e.jsx("input",{name:"benchmark_id",maxLength:100,value:a.benchmark_id,onChange:o=>i("benchmark_id",o.target.value)})]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"验收备注 / 固定条件说明"}),e.jsx("textarea",{name:"note",rows:2,maxLength:500,value:a.note,onChange:o=>i("note",o.target.value)})]}),e.jsx("p",{className:"notice",children:"此操作只保存人工声明，不会自动确认技术规格、缓存条件或标准测试通过；不会将历史记录补写为完整采集证据。"})]})})}function Mr({confirmation:n,onClose:t}){return e.jsx(te,{title:`确认受控补采 · ${n.detail.job_id}`,className:"capacity-page",onClose:t,submitLabel:"确认本批补采",onSubmit:n.submit,children:e.jsxs("div",{className:"capacity-operation",children:[e.jsxs("p",{className:"notice",children:["任务 ",n.detail.job_id,"；本批偏移 ",n.offset,"，最多处理 4 个可信最终产物。"]}),e.jsx("p",{children:"补采仅添加成品尺寸证据，不修改技术资格、原生成参数、人工合格量或标准标签。最终清单由服务端核验；不会扫描目录，也不会从请求猜测尺寸。"}),e.jsxs("details",{children:[e.jsx("summary",{children:"本页已记录的最终产物（最终以服务端可信清单为准）"}),e.jsx("pre",{children:M(n.detail.outputs)})]})]})})}function Er({detail:n,controller:t,onConfirm:s}){const[a,r]=m.useState(0),[i,o]=m.useState(""),[l,p]=m.useState(!1),d=m.useRef(!0),c=m.useRef(!1),g=m.useRef(0);m.useEffect(()=>(d.current=!0,()=>{d.current=!1}),[]);const u=async(y,j)=>{if(!d.current||!t.probeCurrent(j)||g.current!==y)throw Error("证据页面或批次已变化，请关闭后重新打开。");if(c.current)throw Error("正在补采，请勿重复提交。");c.current=!0,p(!0),o("正在补采本批成品尺寸…"),t.invalidateEstimate("成品尺寸正在补采，旧测算已清除。");try{const w=await t.probe(n.job_id,y);if(!d.current)return;g.current=w.next_offset,r(w.next_offset),o(`本批处理 ${$(w.processed)} 个，成功记录尺寸 ${$(w.recorded)} 个；可信最终产物共 ${$(w.total)} 个。${w.next_offset===null?"补采已完成，刷新看板查看结果。":"尚有后续产物，请点击继续补采；刷新看板查看结果。"}`)}catch(w){const v=`补采失败：${ne(w)}${w instanceof Ht&&w.status===409?"。没有可信最终产物记录，不能猜测成品尺寸。":""}`;throw d.current&&o(v),Error(v)}finally{c.current=!1,d.current&&p(!1)}};return e.jsxs("div",{className:"output-probe",children:[e.jsx("p",{className:"hint",children:"仅按可信最终产物清单补采，每次最多 4 个；不会从输入素材或请求参数猜测尺寸。"}),e.jsx("button",{type:"button",disabled:l||a===null,onClick:()=>{if(c.current||a===null||!d.current)return;const y=a,j=t.probeVersion();s({detail:n,offset:y,submit:()=>u(y,j)})},children:a===null?"补采已完成":a>0?"继续补采成品尺寸":"补采成品尺寸"}),e.jsx("p",{className:"hint",role:"status",children:i})]})}function Pr({detail:n,report:t,controller:s,onReview:a,onProbe:r}){const[i,o]=m.useState(!1);return e.jsxs("details",{className:"evidence","data-job-id":n.job_id,onToggle:l=>{l.currentTarget.open&&o(!0)},children:[e.jsxs("summary",{children:[e.jsx("strong",{children:n.job_id}),e.jsx("span",{className:"badge",children:de(n.source)}),e.jsx("span",{children:` ${Pn[n.status]||n.status} / ${n.capability} / ${An(n.worker_id,n.worker_name,t.workers,t.groups)} / ${Ae(n.created_at)}`})]}),e.jsx("div",{className:"evidence-content",children:i&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["任务 runtime：",Z(n.runtime_seconds),"；占机：",Z(n.occupied_seconds),"；原分组：",M(n.group_id)]}),e.jsx(dn,{values:n.warnings}),e.jsx("div",{className:"f-grid3",children:[["输入素材",ln(n).join(" / ")],["生成参数",cn(n,!0)],["技术与人工口径","技术资格以原采集证据及服务端校验为准；尺寸补采与人工标签不修改它。"]].map(([l,p])=>e.jsxs("div",{children:[e.jsx("h3",{children:l}),e.jsx("p",{children:p})]},l))}),e.jsx(en,{title:"执行尝试（包含重试）",value:n.attempts}),e.jsx("h3",{children:"实际输出证据"}),n.outputs?.length?e.jsx(Tn,{headers:["产物标识","类型","实际尺寸","视频时长","技术记录"],children:n.outputs.map((l,p)=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("span",{children:l.key||l.id||"未记录"})}),e.jsx("td",{children:e.jsx("span",{children:M(l.kind)})}),e.jsx("td",{children:e.jsx("span",{children:or(l)})}),e.jsx("td",{children:e.jsx("span",{children:Z(l.duration)})}),e.jsx("td",{children:e.jsx("span",{children:l.valid===!0?"采集记录标记有效":l.valid===!1?"未通过 / 待确认":"未记录"})})]},p))}):e.jsx("p",{className:"notice",children:"最终产物清单未记录；不能按请求猜测，也不按零产物处理。"}),e.jsx(en,{title:"实际输出原始证据",value:n.outputs}),e.jsxs("p",{children:["人工合格数量：",$(n.review?.accepted),"；样本标签：",ur(n),"；标准场景编号：",M(n.review?.benchmark_id),"；备注：",M(n.review?.note)]}),e.jsx(Dt,{resolution:n.output_resolution}),e.jsx(en,{title:"成品尺寸原始证据",className:"output-resolution-raw",value:{output_resolution:n.output_resolution,recovered_outputs:n.recovered_outputs}}),n.status==="done"&&e.jsx(Er,{detail:n,controller:s,onConfirm:r}),["captured","standard"].includes(n.source)?e.jsx("button",{className:"review-open",type:"button",onClick:()=>a(n),children:"人工验收 / 样本标签"}):e.jsx("p",{className:"hint",children:"历史任务不能补写为完整采集证据，不提供采集验收表单。"})]})})]})}function qr({controller:n,onReview:t,onProbe:s}){const a=n.getSnapshot(),{report:r,evidence:i,filters:o,ready:l}=a,p=a.mounted.has("evidence")&&r!==null,d=!l||i.busy||i.failed||!p;return e.jsxs("section",{"aria-labelledby":"evidence-heading",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{id:"evidence-heading",children:"任务证据与人工标记"}),e.jsx("span",{id:"detail-count",className:"hint",children:p&&(i.failed?"筛选未完成":i.busy?"":`当前 ${i.records.length} / 总计 ${$(i.total)} 条；聚合不受分页截断`)})]}),e.jsx("p",{className:"hint pad",children:"明细每页最多 100 条。人工验收 / 标准样本是人工声明，不等于系统自动验证通过；历史记录不可补写为完整采集证据。"}),e.jsx("div",{id:"evidence-filters",children:p&&e.jsxs("div",{className:"evidence-filters",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"独立原分组（按真实 group_id）"}),e.jsxs("select",{id:"evidence-group",disabled:!l,value:o.group,onChange:c=>n.filter({group:c.target.value}),children:[e.jsx("option",{value:"",children:"全部原分组"}),r.groups.map(c=>e.jsx("option",{value:c.id,children:`${Pe(c)} / ${An(c.worker_id,c.worker_name,r.workers,r.groups)} / ${de(c.source)} / ${c.config_id||"配置未知"} / ${c.id}`},c.id))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"任务状态"}),e.jsxs("select",{id:"evidence-status",disabled:!l,value:o.status,onChange:c=>n.filter({status:c.target.value}),children:[e.jsx("option",{value:"",children:"全部状态"}),[["done","已完成"],["error","失败"],["canceled","已取消"],["queued","排队中"],["running","运行中"]].map(([c,g])=>e.jsx("option",{value:c,children:g},c))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"采集来源"}),e.jsxs("select",{id:"evidence-source",disabled:!l,value:o.source,onChange:c=>n.filter({source:c.target.value}),children:[e.jsx("option",{value:"",children:"全部来源"}),["historical","captured","standard"].map(c=>e.jsx("option",{value:c,children:de(c)},c))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"每页最多 100 条"}),e.jsx("select",{id:"evidence-size",disabled:!l,value:o.size,onChange:c=>n.filter({size:Number(c.target.value)}),children:[100,50,25,10].map(c=>e.jsxs("option",{value:c,children:[c," 条 / 页"]},c))})]})]})}),e.jsx("p",{id:"evidence-state",className:"hint pad",role:"status",hidden:!i.state,children:i.state}),e.jsx("div",{id:"details",children:p&&!i.busy&&!i.failed&&(i.records.length?i.records.map(c=>e.jsx(Pr,{detail:c,report:r,controller:n,onReview:t,onProbe:s},c.job_id)):e.jsx("p",{className:"empty",children:"当前页没有任务证据。可立即刷新，或返回上一页。"}))}),e.jsxs("div",{className:"pager",children:[e.jsx("button",{id:"previous",disabled:d||i.start===0,onClick:()=>n.page(-1),children:"上一页"}),e.jsx("span",{id:"page-note",className:"hint",children:p&&!i.busy&&!i.failed&&`第 ${Math.floor(i.start/i.size)+1} 页`}),e.jsx("button",{id:"next",disabled:d||i.start+i.size>=i.total,onClick:()=>n.page(1),children:"下一页"})]})]})}function Rr(n,t){const s=n.workers.filter(he);return s.find(a=>a.id===t)?.id||s.find(a=>pn(n,a.id).length)?.id||s[0]?.id||""}function at(n,t,s){const a=pn(n,t);return{id:s,mode_id:ge.find(r=>a.some(i=>r.capabilities.includes(i.capability)))?.id||"",quantity:""}}function Lr(n,t,s){const[a,r]=m.useState({report:null,worker:"",demands:[],next:1}),[i,o]=m.useState("8"),[l,p]=m.useState("");if(s&&t&&t!==a.report){const f=Rr(t,a.worker);r({report:t,worker:f,demands:[at(t,f,a.next)],next:a.next+1})}const d=t?pn(t,a.worker):[],c=()=>n.invalidateEstimate(),g=f=>{t&&(r({...a,worker:f,demands:[at(t,f,a.next)],next:a.next+1}),c())},u=(f,h)=>{r({...a,demands:a.demands.map(x=>x.id===f?{...x,...h}:x)}),c()},y=f=>{r({...a,demands:a.demands.filter(h=>h.id!==f)}),c()},j=f=>{const h=ge.find(x=>x.id===f);return!!(h&&d.some(x=>h.capabilities.includes(x.capability)))};return{inputs:a,groups:d,hours:i,price:l,worker:g,update:u,remove:y,available:j,add:()=>{if(!n.getSnapshot().ready)return;const f=ge.find(h=>!a.demands.some(x=>x.mode_id===h.id)&&j(h.id));f&&(r({...a,demands:[...a.demands,{id:a.next,mode_id:f.id,quantity:""}],next:a.next+1}),c())},submit:async()=>{n.invalidateEstimate("正在计算…");const f=n.getSnapshot().snapshot;try{if(!t||!n.getSnapshot().ready||!f)throw Error("请先点击立即刷新并成功读取证据。");await n.estimate(_r(t,f.range,a.worker,i,l,a.demands))}catch(h){n.estimateFailure(ne(h))}},setHours:f=>{o(f),c()},setPrice:f=>{p(f),c()}}}function Ir(n){const[t,s]=m.useState("");return m.useEffect(()=>{if(!n)return;const a=URL.createObjectURL(new Blob([$r(n)],{type:"text/csv;charset=utf-8"}));return s(a),()=>URL.revokeObjectURL(a)},[n]),n?t:""}function Ar({saved:n,report:t}){const{result:s,payload:a,groups:r}=n;return e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"warn",children:"成功任务处理参考，不是合格产物日产量或采购承诺"}),e.jsxs("p",{className:"result-number",children:["参考机器数：",$(s.machines)," 台"]}),e.jsxs("p",{children:["每日所需参考运行时间：",Z(s.total_seconds)]}),e.jsxs("p",{children:["单机每日可用容量时间：",Z(s.daily_capacity_seconds)]}),e.jsxs("p",{children:["整机采购小计：",A(s.price_total)?`¥${$(s.price_total)}`:"未计价"]}),e.jsx(Tn,{headers:["业务模式","每日需求","平均任务耗时","单机场景参考日处理量"],children:s.lines.map((i,o)=>{const l=kn(r.find(p=>p.id===i.group_id)?.capability);return e.jsxs("tr",{children:[e.jsx("td",{className:"wide",children:e.jsx("span",{children:l?`${l.type} · ${l.label}`:"业务模式"})}),e.jsx("td",{children:e.jsxs("span",{children:[$(i.quantity)," 任务/天"]})}),e.jsx("td",{children:e.jsx("span",{children:Z(i.seconds_per_unit)})}),e.jsx("td",{children:e.jsxs("span",{children:[$(i.daily_units)," 任务/天"]})})]},o)})}),e.jsx("p",{className:"hint",children:"每个模式只参考自动选中的一个实测分组，不保证任意模型、尺寸或缓存规格的产能。"}),e.jsxs("details",{children:[e.jsx("summary",{children:"计算依据"}),e.jsx("h3",{children:"警告与覆盖限制"}),e.jsx(dn,{values:s.warnings}),e.jsx("p",{className:"hint",children:"仅按成功任务平均 runtime 估算；不含完整失败、准备、重试或质量损耗。按同一电脑、配置和来源选择具体原分组，不合并均值。"}),e.jsx("p",{className:"hint",children:"台数 = 向上取整〔各模式任务数量 × 平均任务耗时之和 ÷（小时 × 3600 × 可用时间比例 × 生产容量比例）〕。容量预留不是 GPU 利用率；业务组合与模型切换可能增加损耗，不保证峰值 SLA。"}),a.demands.map(i=>{const o=r.find(l=>l.id===i.group_id);return o&&e.jsxs("div",{children:[e.jsx("h3",{children:kn(o.capability)?.label||"业务模式"}),e.jsxs("p",{children:[Pt(o)," / ",M(o.spec_key),"：",de(o.source),"；样本"," ",$(o.samples),"；",$(qn(o))," 天；配置 ",M(o.config_id),o.source==="standard"?`；标准场景编号 ${M(o.benchmark_id)}`:""]}),e.jsx(Ft,{g:o})]},o.id)}),e.jsx("h3",{children:"计算假设"}),e.jsx("pre",{children:M(s.assumptions)}),e.jsxs("p",{className:"hint",children:["Worker ID：",a.worker_id,"；当前在线仅为本次数据快照，不承诺未来状态；当前配置仅作清单参考：",He(t.workers.find(i=>i.id===a.worker_id)?.hardware),"；时间：全部历史 至 ",Ae(a.to),"；",a.hours," 小时 / 可用"," ",$(a.availability*100),"% / 生产容量 ",$(a.utilization*100),"%"]})]})]})}function Tr({controller:n}){const t=n.getSnapshot(),{report:s,ready:a,estimate:r,estimateError:i,estimateNote:o,estimating:l}=t,p=t.mounted.has("purchase")&&s!==null,d=Lr(n,s,p),{inputs:c,groups:g}=d,u=m.useRef(null),y=Ir(r),j=s?.workers.filter(he)||[],w=!a||!g.length||!c.demands.length||l,v=a?j.some(f=>f.id===c.worker)?g.length?"":"这台电脑暂无这些模式的成功耗时记录，请换一台电脑。":"当前没有在线电脑，请稍后刷新。":"请先刷新并读取电脑状态。";return e.jsxs("div",{className:"procurement",children:[e.jsxs("section",{className:"section",children:[e.jsx("div",{className:"section-head",children:e.jsx("h2",{children:"每日多场景需求"})}),e.jsxs("form",{id:"estimate-form",className:"pad",onSubmit:f=>{f.preventDefault(),f.currentTarget.reportValidity()&&d.submit()},children:[e.jsxs("div",{className:"form-grid",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"电脑显卡配置选择"}),e.jsx("select",{id:"estimate-worker",required:!0,disabled:!a,value:c.worker,onChange:f=>{a&&d.worker(f.target.value)},children:p&&(j.length?j.map(f=>e.jsx("option",{value:f.id,children:f.name||"未命名电脑"},f.id)):e.jsx("option",{value:"",children:"暂无在线电脑"}))})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"每日计划生产小时"}),e.jsx("input",{id:"hours",type:"number",min:"0.1",max:"24",step:"0.1",value:d.hours,required:!0,onChange:f=>d.setHours(f.target.value)})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"整机报价（元，可选）"}),e.jsx("input",{id:"price",type:"number",min:"0",step:"0.01",placeholder:"未填写则不计价格",value:d.price,onChange:f=>d.setPrice(f.target.value)})]})]}),e.jsx("p",{id:"mode-note",className:"notice",children:"按成功任务平均执行耗时参考，不是合格产物日产量或采购承诺。"}),e.jsx("p",{className:"hint",children:"固定按 100% 可用时间、75% 生产容量计算（预留 25% 应对波动）；每日数量按任务/天填写。"}),e.jsxs("div",{children:[e.jsx("h3",{children:"每日需求"}),e.jsx("p",{id:"demand-note",className:"hint",role:"status",children:p&&v}),e.jsx("div",{id:"demands",children:p&&c.demands.map(f=>e.jsxs("div",{className:"demand",children:[e.jsx("select",{className:"demand-group",required:!0,"aria-label":"需求业务模式",disabled:!a||!f.mode_id,value:f.mode_id,onChange:h=>{a&&d.update(f.id,{mode_id:h.target.value})},children:["生图模式","生视频模式"].map(h=>e.jsx("optgroup",{label:h,children:ge.filter(x=>x.type===h).map(x=>e.jsxs("option",{value:x.id,disabled:!d.available(x.id)||c.demands.some(k=>k.id!==f.id&&k.mode_id===x.id),children:[x.type," · ",x.label]},x.id))},h))}),e.jsx("input",{className:"demand-quantity",type:"number",min:"0.01",step:"any",required:!0,placeholder:"任务/天","aria-label":"每日需求数量（任务/天）",disabled:!a||!f.mode_id,value:f.quantity,onChange:h=>d.update(f.id,{quantity:h.target.value})}),e.jsx("button",{type:"button",onClick:()=>d.remove(f.id),children:"移除"})]},f.id))}),e.jsx("button",{id:"add-demand",type:"button",disabled:!p||!a||!ge.some(f=>!c.demands.some(h=>h.mode_id===f.id)&&d.available(f.id)),onClick:d.add,children:"增加场景"})]}),e.jsx("button",{id:"estimate-submit",className:"primary",type:"submit",disabled:!p||w,children:"计算机器需求"})]})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"测算结果与依据"}),e.jsx("button",{id:"export-estimate",disabled:!r||!y,onClick:()=>{n.getSnapshot().estimate&&u.current?.click()},children:"导出测算 CSV"}),e.jsx("a",{ref:u,hidden:!0,href:y||void 0,download:"capacity-estimate.csv",children:"下载测算 CSV"})]}),e.jsx("div",{id:"estimate-error",className:"error",role:"alert",hidden:!i,children:i}),e.jsx("div",{id:"estimate-result",className:"pad","aria-live":"polite",children:r&&s?e.jsx(Ar,{saved:r,report:s}):e.jsx("p",{className:"muted",children:o})})]})]})}const Ne=[{id:"machines",label:"机器产能"},{id:"scenarios",label:"场景对比"},{id:"purchase",label:"采购测算"}];function Dr(n){const{controller:t,state:s}=tr(n),{report:a,ready:r,revision:i,mounted:o}=s,[l,p]=m.useState(!1),[d,c]=m.useState(""),[g,u]=m.useState(null),[y,j]=m.useState(null),[w,v]=m.useState(null),f=m.useRef(null),h=m.useRef(null),x=m.useRef([]),[k,L]=m.useState(!1);m.useEffect(()=>{k&&s.tab==="purchase"&&(h.current?.focus(),L(!1))},[k,s.tab]);const T=(b="")=>{t.getSnapshot().ready&&(t.showEvidence(b),f.current?.scrollIntoView({block:"start"}))},_=o.has("scenarios")&&a?mr(a.groups):[],N=_.some(([b])=>b===d)?d:_[0]?.[0]||"";a&&o.has("scenarios")&&d!==N&&c(N);const E=a?.overview||{};return e.jsxs("main",{id:"main-content",className:"page capacity-page",tabIndex:-1,children:[e.jsxs("header",{className:"page-header card",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"产能评估"}),e.jsx("p",{className:"subtitle",children:"真实任务与独立规格分组，查看机器产能、证据和每日需求。"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{id:"refresh-state",className:"state",role:"status",children:s.refreshState})})]}),e.jsx("div",{className:"header-actions",children:e.jsx("button",{id:"refresh",type:"button",onClick:()=>{t.load()},children:"立即刷新"})})]}),e.jsx("div",{id:"error",className:"error",role:"alert",hidden:!s.error,children:s.error}),e.jsx("div",{id:"write-status",className:"write-status",role:"status",hidden:!s.writeStatus,children:s.writeStatus}),e.jsx("div",{className:"tabs",role:"tablist","aria-label":"产能评估视图",children:Ne.map((b,R)=>e.jsx("button",{id:`tab-${b.id}`,role:"tab",type:"button",ref:D=>{x.current[R]=D},"aria-selected":s.tab===b.id,"aria-controls":`panel-${b.id}`,tabIndex:s.tab===b.id?0:-1,onClick:()=>t.activate(b.id),onKeyDown:D=>{const z=D.key==="ArrowRight"?(R+1)%Ne.length:D.key==="ArrowLeft"?(R+Ne.length-1)%Ne.length:D.key==="Home"?0:D.key==="End"?Ne.length-1:void 0;if(z===void 0)return;const S=Ne[z];S&&(D.preventDefault(),t.activate(S.id),x.current[z]?.focus())},children:b.label},b.id))}),e.jsx("div",{id:"capacity-stats",className:"metrics","aria-label":"产能数据概览",children:a&&e.jsx(_n,{items:[["当前在线电脑",a.workers.filter(he).length],["真实任务记录",E.tasks],["独立原规格组",a.groups.length],["产物清单未知任务",E.unknown_outputs]]})}),e.jsxs("section",{id:"panel-machines",role:"tabpanel","aria-labelledby":"tab-machines",tabIndex:0,hidden:s.tab!=="machines",children:[e.jsxs("section",{id:"machine-summary","aria-label":"在线机器业务简览",children:[e.jsxs("div",{className:"summary-toolbar",children:[e.jsx("h2",{id:"online-count",children:a?`当前在线 ${a.workers.filter(he).length} 台`:"当前在线 — 台"}),e.jsxs("label",{className:"offline-toggle",children:[e.jsx("input",{id:"include-offline",type:"checkbox",checked:l,disabled:!r,onChange:b=>{r&&p(b.target.checked)}}),"包含离线"]})]}),e.jsx("p",{className:"summary-note hint",children:"在线状态是当前状态；业务为全部历史记录中跑过的业务，不代表当前均可执行。平均生成时间仅计成功任务执行耗时，不含排队，非纯 GPU 耗时，也不是合格日产能。同一业务的任务规格、模型或采样条件不同，不能直接按耗时做性能排名。"}),e.jsx("div",{id:"summary-machines",children:o.has("machines")&&a&&e.jsx(fr,{report:a,ready:r,includeOffline:l,onProfile:u,onEvidence:T},`${i}-${l}`)}),e.jsxs("div",{className:"matrix-actions",children:[e.jsx("button",{type:"button",id:"open-purchase",onClick:()=>{t.activate("purchase"),L(!0)},children:"进入多模式采购测算"}),e.jsx("button",{type:"button",id:"open-evidence",disabled:!r,onClick:()=>T(),children:"展开全部任务证据"})]})]}),e.jsxs("details",{id:"technical-details",className:"section advanced",open:s.technicalOpen,onToggle:b=>t.technical(b.currentTarget.open),children:[e.jsx("summary",{children:"详细统计与机器配置"}),e.jsx(gr,{report:a,mounted:o.has("technical"),onProfile:u},i)]})]}),e.jsx("section",{id:"panel-scenarios",role:"tabpanel","aria-labelledby":"tab-scenarios",tabIndex:0,hidden:s.tab!=="scenarios",children:e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"同场景证据对比"}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"业务 / 精确规格 / 来源"}),e.jsx("select",{id:"scenario-filter",disabled:!r,value:N,onChange:b=>{r&&c(b.target.value)},children:o.has("scenarios")&&(_.length?_.map(([b,R])=>e.jsx("option",{value:b,children:R},b)):e.jsx("option",{value:"",children:"暂无场景"}))})]})]}),e.jsx("p",{className:"notice hint",children:"只并列相同业务、规格键与证据来源。历史配置、模型版本或缓存条件缺失时，不视为受控跑分；未测试的配置不能按显存或价格推算。"}),e.jsx("div",{id:"scenario-groups",children:o.has("scenarios")&&a&&e.jsx(Ot,{groups:a.groups.filter(b=>It(b)===N),report:a},`${i}-${N}`)})]})}),e.jsx("section",{id:"panel-purchase",ref:h,role:"tabpanel","aria-labelledby":"tab-purchase",tabIndex:0,hidden:s.tab!=="purchase",children:e.jsx(Tr,{controller:t})}),e.jsxs("details",{id:"task-evidence",ref:f,className:"section advanced",open:s.evidenceOpen,onToggle:b=>t.evidenceOpen(b.currentTarget.open),children:[e.jsx("summary",{children:"任务证据与人工标记"}),e.jsx(qr,{controller:t,onReview:j,onProbe:v},i)]}),g&&e.jsx(zr,{worker:g,controller:t,onClose:()=>u(null)},g.id),y&&e.jsx(Cr,{detail:y,controller:t,onClose:()=>j(null)},y.job_id),w&&e.jsx(Mr,{confirmation:w,onClose:()=>v(null)})]})}const Fr=`:root {
  color-scheme: dark;
  --bg: #0b0d10;
  --panel: #111318;
  --surface: #16191f;
  --hover: #1b2028;
  --text: #f3f4f6;
  --muted: #a0a6b1;
  --line: #303640;
  --soft-line: #252a33;
  --blue: #38bdf8;
  --red: #fb7185;
  --radius: 14px;
  --gap: 20px;
  --pad: clamp(24px, 1.3vw, 36px);
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 16px;
  font-synthesis: none;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
}
button,
input,
select {
  font: inherit;
}
button,
a,
input,
select {
  -webkit-tap-highlight-color: transparent;
}
button,
select,
input {
  color: var(--text);
}
button,
select {
  cursor: pointer;
}
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 40px;
  padding: 8px 15px;
  border: 1px solid #39414d;
  border-radius: 8px;
  background: #1a1f27;
  white-space: nowrap;
  line-height: 1.3;
}
button:hover {
  background: #252c36;
  border-color: #596372;
}
button:active {
  transform: translateY(1px);
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
a {
  color: var(--blue);
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 4px;
}
input,
select {
  min-height: 42px;
  border: 1px solid #39414d;
  border-radius: 8px;
  background: var(--surface);
  padding: 8px 12px;
  max-width: 100%;
  min-width: 0;
}
input::placeholder {
  color: var(--muted);
}
input[type='checkbox'] {
  accent-color: var(--blue);
  min-height: 18px;
  width: 18px;
  height: 18px;
  cursor: pointer;
}
input[type='number'] {
  width: 100%;
}
input:disabled {
  opacity: 0.65;
}
h1,
h2,
h3,
p {
  margin: 0;
}
h1 {
  font-size: 30px;
  line-height: 1.25;
  letter-spacing: -0.025em;
  font-weight: 650;
}
h2 {
  font-size: 21px;
  font-weight: 620;
  line-height: 1.4;
}
h3 {
  font-size: 17px;
  font-weight: 600;
}
small,
.small {
  font-size: 13px;
}
.muted {
  color: var(--muted);
}
.danger {
  color: var(--red) !important;
}
.number {
  font-variant-numeric: tabular-nums;
}
.icon {
  width: 23px;
  height: 23px;
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.icon-defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}
.skip-link {
  position: fixed;
  top: -80px;
  left: 20px;
  z-index: 1001;
  background: var(--text);
  color: var(--bg);
  padding: 12px;
}
.skip-link:focus {
  top: 12px;
}
main {
  margin: 0;
  padding: var(--pad);
  min-height: 100dvh;
  min-width: 0;
  outline: none;
}
.page {
  display: grid;
  gap: var(--gap);
  animation: none;
}
.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow:
    inset 0 1px 0 #ffffff04,
    0 3px 8px #00000010;
  min-width: 0;
  overflow: hidden;
}
.padded {
  padding: 24px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 23px 25px;
  min-height: 110px;
}
.page-header .subtitle {
  color: #b5bbc5;
  margin-top: 0;
  font-size: 14px;
}
.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}
.sample-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 12px;
  padding: 4px 9px;
  border: 1px solid #343a45;
  border-radius: 5px;
  white-space: nowrap;
}
.page-caption {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
}
.primary {
  background: #edf0f5;
  color: #15181d;
  border-color: #e5e9ef;
  font-weight: 600;
}
.primary:hover {
  background: #fff;
  border-color: #fff;
}
.primary .icon {
  color: #15181d;
}
.ghost {
  border-color: transparent;
  background: transparent;
}
.ghost:hover {
  border-color: var(--line);
  background: var(--surface);
}
.link-button {
  padding: 0;
  min-height: 32px;
  background: none;
  border: 0;
  color: var(--blue);
  font-size: 14px;
}
.link-button:hover {
  background: none;
  text-decoration: underline;
}
.icon-button {
  width: 36px;
  min-height: 36px;
  padding: 6px;
  background: transparent;
  border-color: transparent;
}
.icon-button:hover {
  background: var(--hover);
  border-color: var(--line);
}
.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--gap);
}
.metric {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  min-height: 126px;
}
.metric-mark {
  display: grid;
  place-items: center;
  color: #bdc6d4;
  border-right: 1px solid var(--line);
  padding-right: 20px;
}
.metric-mark .icon {
  width: 30px;
  height: 30px;
}
.metric-content {
  min-width: 0;
}
.metric-label {
  font-size: 14px;
  color: #c9ced7;
  margin-bottom: 7px;
}
.metric-value {
  font-size: 36px;
  line-height: 1.25;
  letter-spacing: -0.025em;
  font-weight: 650;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.metric-value.compact {
  font-size: 28px;
}
.metric-value .unit {
  font-size: 23px;
  font-weight: 500;
}
.metric-note {
  font-size: 12px;
  color: var(--muted);
  margin-top: 10px;
}
.metric-note.danger {
  color: var(--red);
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 24px;
}
.heading-inline {
  display: flex;
  gap: 12px;
  align-items: center;
}
.section-subtitle {
  font-size: 13px;
  color: var(--muted);
  margin-top: 4px;
}
.table-wrap {
  overflow: auto;
  max-width: 100%;
  padding: 0 24px;
  scrollbar-width: thin;
  scrollbar-color: #3e4652 transparent;
}
table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-variant-numeric: tabular-nums;
}
th {
  color: #b5bfce;
  font-size: 13px;
  font-weight: 500;
  padding: 12px 12px;
  white-space: nowrap;
  border-top: 1px solid var(--soft-line);
  border-bottom: 1px solid var(--soft-line);
}
td {
  padding: 15px 12px;
  border-bottom: 1px solid var(--soft-line);
  font-size: 14px;
  vertical-align: middle;
}
th:first-child,
td:first-child {
  padding-left: 0;
}
th:last-child,
td:last-child {
  padding-right: 0;
}
tbody tr:last-child td {
  border-bottom: 0;
}
tbody tr:hover {
  background: #ffffff02;
}
.cell-secondary {
  display: block;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
  margin-top: 3px;
}
.table-note {
  padding: 14px 24px;
  color: var(--muted);
  font-size: 12px;
  border-top: 1px solid var(--soft-line);
}
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(300px, 18.8vw, 450px);
  gap: var(--gap);
  align-items: start;
}
.workers-table {
  min-width: 980px;
}
.workers-table td {
  padding-top: 14px;
  padding-bottom: 14px;
  white-space: nowrap;
}
.workers-table .machine-name {
  font-weight: 550;
  letter-spacing: 0.01em;
}
.workers-table .offline td {
  color: #a0a6b1;
}
.utilization {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 142px;
}
.utilization span {
  min-width: 33px;
}
.util-track {
  display: block;
  flex: 1;
  max-width: 138px;
  min-width: 70px;
  height: 6px;
  border-radius: 6px;
  background: #303744;
  overflow: hidden;
}
.util-track i {
  display: block;
  height: 100%;
  background: var(--blue);
  border-radius: 0;
}
.right-column {
  display: grid;
  gap: var(--gap);
}
.attention-list {
  display: grid;
  gap: 14px;
  padding: 0 22px 22px;
  max-height: 360px;
  overflow: auto;
  align-content: start;
  scrollbar-gutter: stable;
}
.attention-item {
  display: block;
  text-align: left;
  background: #101318;
  border: 1px solid #303642;
  border-radius: 11px;
  padding: 22px;
  min-height: 140px;
  width: 100%;
  white-space: normal;
}
.attention-item:hover {
  background: #171c23;
}
.attention-item .attention-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.attention-item strong {
  font-size: 17px;
  font-weight: 620;
}
.attention-item b {
  display: block;
  margin: 7px 0 10px;
  font-weight: 550;
  font-size: 15px;
}
.attention-item p {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.7;
}
.config-summary {
  padding: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  background: transparent;
  border: 0;
  border-radius: 0;
}
.config-summary h2 {
  font-size: 19px;
}
.config-summary p {
  font-size: 13px;
  color: var(--muted);
  margin-top: 7px;
}
.jobs-table {
  min-width: 950px;
}
.status-text {
  font-weight: 550;
  white-space: nowrap;
}
.filter-label {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  color: var(--muted);
}
.preview-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: var(--muted);
  font-size: 12px;
  padding: 0 3px;
}
.tabs {
  display: flex;
  gap: 28px;
  border-bottom: 1px solid var(--line);
  padding: 0 0 1px;
  flex-wrap: wrap;
}
.tabs button {
  position: relative;
  border: 0;
  border-radius: 0;
  background: none;
  min-height: 45px;
  padding: 4px 2px 14px;
  color: var(--muted);
  font-weight: 550;
}
.tabs button[aria-selected='true'] {
  color: var(--text);
}
.tabs button[aria-selected='true']::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: var(--blue);
}
.cost-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(300px, 1fr);
  gap: 38px;
  padding: 26px 24px;
}
.cost-bars {
  display: grid;
  gap: 24px;
}
.cost-bar-row {
  display: grid;
  grid-template-columns: 130px 100px minmax(90px, 1fr) 46px;
  gap: 20px;
  align-items: center;
  font-size: 15px;
}
.cost-bar-row .bar {
  background: #2b3340;
  border-radius: 6px;
  height: 10px;
  overflow: hidden;
}
.cost-bar-row .bar i {
  display: block;
  background: var(--blue);
  height: 100%;
  border-radius: 6px;
}
.cost-breakdown {
  display: grid;
  gap: 14px;
  border-left: 1px solid var(--line);
  padding-left: 32px;
}
.cost-breakdown div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.cost-breakdown span {
  color: var(--muted);
  font-size: 14px;
}
.cost-breakdown strong {
  font-weight: 550;
}
.cost-table {
  min-width: 1120px;
}
.segmented {
  display: inline-flex;
  border: 1px solid #3a424f;
  border-radius: 8px;
  background: var(--surface);
  padding: 3px;
  gap: 3px;
  white-space: nowrap;
}
.segmented button {
  background: transparent;
  border: 0;
  min-height: 32px;
  padding: 6px 14px;
  font-size: 13px;
  color: #b4bbc6;
  border-radius: 5px;
}
.segmented button[aria-pressed='true'] {
  background: #2c3542;
  color: #f3f4f6;
}
.segmented button:hover {
  background: #252d38;
}
.capacity-table {
  table-layout: fixed;
  min-width: 1270px;
}
.capacity-table thead th {
  padding: 17px 17px;
  border-left: 1px solid var(--soft-line);
  font-size: 13px;
}
.capacity-table th:first-child {
  width: 190px;
  border-left: 0;
}
.capacity-table th span {
  color: var(--muted);
  display: block;
  font-size: 12px;
  margin-top: 4px;
}
.capacity-table td {
  vertical-align: top;
  padding: 22px 17px;
  border-left: 1px solid var(--soft-line);
}
.capacity-table td:first-child {
  border-left: 0;
  padding-left: 0;
}
.capacity-table .business-label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}
.capacity-table .runtime {
  font-size: 24px;
  line-height: 1.3;
  font-weight: 600;
  margin-bottom: 18px;
}
.capacity-spec {
  display: grid;
  gap: 12px;
  font-size: 12px;
}
.capacity-spec div {
  display: grid;
  gap: 3px;
}
.capacity-spec label {
  color: var(--muted);
  font-size: 11px;
}
.capacity-spec span {
  line-height: 1.6;
}
.no-record {
  font-size: 15px;
  color: #abb3bf;
  margin-top: 8px;
}
.evidence-grid {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(300px, 1fr);
  gap: var(--gap);
}
.evidence-table {
  min-width: 1000px;
}
.purchase-teaser {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
}
.purchase-teaser p {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.8;
}
.purchase-teaser small {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.8;
}
.permissions-top {
  display: grid;
  grid-template-columns: minmax(0, 2.2fr) minmax(290px, 1fr);
  gap: var(--gap);
}
.permissions-middle {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
  gap: var(--gap);
}
.accounts-table {
  min-width: 850px;
}
.account-role {
  min-height: 33px;
  padding: 5px 9px;
  font-size: 13px;
  width: 128px;
}
.row-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
}
.row-actions button {
  font-size: 12px;
  min-height: 32px;
  padding: 6px 10px;
}
.switch {
  width: 36px;
  height: 20px;
  display: inline-block;
  position: relative;
  border-radius: 20px;
  background: #4e5663;
  vertical-align: middle;
  margin-right: 7px;
}
.switch:before {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  background: #eef1f6;
  border-radius: 50%;
}
.switch.on {
  background: #269dce;
}
.switch.on:before {
  left: 19px;
}
.form-grid {
  display: grid;
  gap: 16px;
}
.field {
  display: grid;
  gap: 7px;
  min-width: 0;
  font-size: 13px;
  color: #c9cfd9;
}
.field input,
.field select {
  width: 100%;
}
.check-label {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  color: #c9cfd9;
}
.form-card {
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.form-card form {
  flex: 1;
  align-content: start;
}
.form-card .primary {
  width: 100%;
}
.grant-form {
  display: grid;
  grid-template-columns: minmax(110px, 1fr) minmax(110px, 1fr) minmax(120px, 1fr) auto;
  gap: 12px;
  align-items: end;
  padding: 0 24px 22px;
}
.grant-form .field {
  font-size: 12px;
}
.grant-table {
  min-width: 550px;
}
.allocation-tools {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr auto;
  gap: 16px;
  padding: 0 24px 20px;
  align-items: end;
}
.allocation-table {
  min-width: 850px;
}
.allocation-table th:first-child {
  width: 50px;
}
.teams-new {
  padding: 23px 24px;
}
.teams-new h2 {
  margin-bottom: 18px;
}
.create-team-form {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
  align-items: end;
}
.form-help {
  font-size: 12px;
  color: var(--muted);
  margin-top: 12px;
}
.team-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 24px;
}
.team-add {
  display: flex;
  align-items: end;
  gap: 12px;
}
.team-add .field {
  min-width: 260px;
}
.team-table {
  min-width: 700px;
}
.team-table td {
  padding-top: 14px;
  padding-bottom: 14px;
}
.role-badge {
  padding: 3px 9px;
  border: 1px solid #3a424e;
  border-radius: 5px;
  font-size: 12px;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 180px;
  padding: 30px;
  color: var(--muted);
  text-align: center;
}
.empty-state b {
  font-size: 18px;
  color: var(--text);
  font-weight: 550;
}
.details {
  padding: 0 24px 20px;
}
.details summary {
  color: var(--muted);
  cursor: pointer;
  font-size: 13px;
}
.details p {
  padding-top: 12px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.9;
}
.purchase-layout {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: var(--gap);
}
.purchase-form {
  padding: 24px;
  display: grid;
  gap: 20px;
}
.purchase-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.purchase-mode {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px;
  gap: 18px;
  align-items: end;
  border-top: 1px solid var(--soft-line);
  padding-top: 18px;
}
.purchase-result {
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.purchase-result .result-number {
  font-size: 46px;
  font-weight: 650;
}
.scene-table {
  min-width: 1100px;
}
.notice-box {
  padding: 14px 18px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  font-size: 13px;
  color: var(--muted);
  line-height: 1.8;
}
.toast {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  max-width: min(680px, 90vw);
  padding: 15px 23px;
  border: 1px solid #4a5667;
  border-radius: 10px;
  background: #222a35;
  color: #f3f4f6;
  box-shadow: 0 10px 40px #0008;
  font-size: 14px;
  text-align: center;
}
.toast[hidden],
[hidden] {
  display: none !important;
}
/* 正式管理页补充：账号组件保持真实会话能力，视觉不依赖旧 style.css。 */
body.admin-page {
  --panel2: var(--surface);
  --ok: #7bd99d;
  --warn: #f5c96a;
  --bad: #fb7185;
  --acc: #edf0f5;
  --dim: var(--muted);
  --txt: var(--text);
}
body.admin-page #maintenance-banner {
  position: sticky;
  margin-left: calc(-1 * var(--workspace-width, 72px));
}
.admin-page .worker-delete {
  min-height: 44px;
}
.admin-page .worker-actions {
  flex-direction: row;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}
.admin-page main {
  max-width: none;
  min-width: 0;
}
.admin-page .ok {
  color: var(--ok);
}
.admin-page .warn {
  color: var(--warn);
}
.admin-page .bad {
  color: var(--bad);
}
.admin-page .f-reception[data-tone='bad'] {
  color: var(--bad);
}
.admin-page .f-reception[data-tone='warn'] {
  color: var(--warn);
}
.admin-page .f-reception[data-tone='ok'] {
  color: var(--ok);
}
.admin-page [data-dialog-content] {
  display: grid;
  gap: 18px;
  min-width: 0;
}
.admin-page .admin-dialog [data-busy] input,
.admin-page .admin-dialog [data-busy] select,
.admin-page .admin-dialog [data-busy] textarea {
  pointer-events: none;
  opacity: 0.7;
}
.admin-page .metric-value {
  overflow-wrap: anywhere;
}
.admin-page .f-job-error {
  display: block;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.admin-page .resource-meter {
  margin-top: 5px;
  display: grid;
  gap: 4px;
}
.admin-page .resource-meter .util-track {
  max-width: none;
  min-width: 90px;
  width: 100%;
  height: 4px;
}
.admin-page .resource-meter .util-track i {
  background: #aebaca;
}
.admin-page .f-worker-status[data-worker-state='异常'] {
  --state-text: #fb7185;
  --state-border: #6d3541;
  --state-bg: #2c1b22;
}
.admin-page .loading-note {
  padding: 24px;
  color: var(--muted);
}
.admin-page .chart-area canvas:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 3px;
}
.admin-page .f-cost-chart:empty {
  display: block;
}
.admin-page .admin-sandbox {
  border-color: #665231;
  color: var(--warn);
}
/* 温度弹窗独占整视口上层，沿用预览尺寸；内部 Canvas 弹性填满余量。 */
.admin-page .temperature-dialog {
  width: min(1760px, 78vw);
  height: min(1000px, 78dvh);
  max-width: calc(100vw - 48px);
  max-height: calc(100dvh - 48px);
  overflow: hidden;
  border-radius: 18px;
}
.admin-page .temperature-dialog form {
  height: 100%;
  display: block;
}
.admin-page .temperature-dialog .f-dialog-body {
  height: 100%;
  padding: 0;
  display: block;
}
.admin-page .temperature-dialog [data-dialog-content] {
  display: block;
  height: 100%;
}
.admin-page .temperature-dialog .f-status {
  display: none;
}
.admin-page .temperature-dialog .modal-shell {
  height: 100%;
}
.admin-page .temperature-dialog .chart-area {
  min-height: 120px;
}
.admin-page .temperature-dialog .modal-header .close-button {
  flex-shrink: 0;
}
.admin-page .btn {
  font: inherit;
  letter-spacing: 0;
  border-radius: 8px;
  min-height: 40px;
  padding: 8px 15px;
  border: 1px solid #39414d;
  background: #1a1f27;
  color: var(--text);
}
.admin-page .btn:hover {
  background: #252c36;
  border-color: #596372;
  color: var(--text);
  box-shadow: none;
}
.admin-page .btn.primary {
  background: #edf0f5;
  color: #15181d;
  border-color: #e5e9ef;
}
.admin-page .btn.primary:hover {
  background: #fff;
  color: #15181d;
  box-shadow: none;
}
.admin-page .btn.danger {
  color: var(--red);
  box-shadow: none;
}
.admin-page .btn.sm {
  min-height: 32px;
  padding: 6px 10px;
  font-size: 12px;
}
.admin-page .auth-dialog {
  width: min(440px, 92vw);
  height: auto;
  border-radius: 14px;
}
.admin-page .auth-dialog h2 {
  letter-spacing: 0;
  font-size: 22px;
}
@media (max-width: 1200px) {
  .admin-page .temperature-dialog {
    width: 90vw;
    height: 82dvh;
  }
}
@media (max-width: 767px) {
  .admin-page .temperature-dialog {
    width: calc(100vw - 28px);
    height: 85dvh;
    max-width: calc(100vw - 28px);
    max-height: calc(100dvh - 28px);
    border-radius: 14px;
  }
  .admin-page .temperature-dialog .modal-shell {
    overflow-y: auto;
  }
  .admin-page .temperature-dialog .chart-area {
    flex: none;
    height: 220px;
  }
  .admin-page .temperature-dialog .temperature-stat strong {
    font-size: 23px;
  }
}
/* 原生对话框位于顶层，居中基于整个视口而不是主内容区域。 */
dialog {
  width: min(1760px, 78vw);
  height: min(1000px, 78dvh);
  max-width: calc(100vw - 48px);
  max-height: calc(100dvh - 48px);
  margin: auto;
  padding: 0;
  border: 1px solid #46505e;
  border-radius: 18px;
  background: #11151b;
  color: var(--text);
  box-shadow: 0 26px 110px #0009;
  overflow: hidden;
}
dialog::backdrop {
  background: rgba(0, 0, 0, 0.68);
}
.modal-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 34px 38px;
  gap: 24px;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 20px;
}
.eyeline {
  font-size: 14px;
  color: var(--muted);
  margin-bottom: 8px;
}
.modal-header h2 {
  font-size: 30px;
  font-weight: 600;
}
.modal-header .muted {
  font-size: 14px;
  margin-top: 8px;
}
.close-button {
  font-size: 30px;
  line-height: 1;
  width: 42px;
  height: 42px;
  background: transparent;
  border-color: transparent;
  padding: 0;
  color: #bfc7d1;
}
.close-button:hover {
  background: var(--surface);
  border-color: var(--line);
}
.chart-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
}
.inline-label {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted);
  font-size: 14px;
}
.inline-label select {
  min-width: 130px;
}
.temperature-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  padding: 20px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.temperature-stat {
  padding-left: 24px;
  border-left: 1px solid var(--line);
}
.temperature-stat:first-child {
  padding-left: 0;
  border-left: 0;
}
.temperature-stat label {
  color: var(--muted);
  font-size: 13px;
}
.temperature-stat strong {
  display: block;
  font-size: 34px;
  font-weight: 550;
  margin-top: 8px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.temperature-stat strong small {
  font-size: 20px;
  font-weight: 400;
  color: var(--muted);
}
.chart-area {
  position: relative;
  flex: 1;
  min-height: 180px;
  min-width: 0;
}
.chart-area canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.chart-area .empty-state {
  position: absolute;
  inset: 0;
}
.chart-tooltip {
  position: absolute;
  pointer-events: none;
  background: #232c38;
  border: 1px solid #46566b;
  padding: 9px 13px;
  border-radius: 7px;
  font-size: 13px;
  box-shadow: 0 8px 20px #0004;
  white-space: nowrap;
}
.modal-footer {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  color: var(--muted);
  font-size: 12px;
}
.chart-key {
  display: flex;
  align-items: center;
  gap: 9px;
}
.chart-key i {
  width: 20px;
  height: 2px;
  background: var(--blue);
}
.keyboard-hint {
  padding: 3px 7px;
  border: 1px solid var(--line);
  border-radius: 4px;
}
body.modal-open {
  overflow: hidden;
}
@media (min-width: 2000px) {
  :root {
    font-size: 18px;
    --gap: 24px;
  }
  h1 {
    font-size: 34px;
  }
  h2 {
    font-size: 23px;
  }
  .page-header {
    min-height: 110px;
    padding: 18px 28px;
  }
  .page-header .subtitle {
    font-size: 15px;
  }
  .page-caption {
    margin-top: 7px;
  }
  .sample-badge {
    font-size: 12px;
    padding: 3px 8px;
  }
  .metric {
    padding: 17px 26px;
    min-height: 120px;
  }
  .metric-value {
    font-size: 39px;
    line-height: 1.2;
  }
  .metric-value.compact {
    font-size: 30px;
  }
  .metric-label {
    font-size: 15px;
    margin-bottom: 4px;
  }
  .metric-note {
    font-size: 13px;
    margin-top: 5px;
  }
  .section-heading {
    padding: 13px 28px;
  }
  .table-wrap {
    padding-left: 28px;
    padding-right: 28px;
  }
  th {
    font-size: 14px;
    padding: 8px 16px;
  }
  td {
    font-size: 16px;
    padding: 10px 16px;
  }
  .workers-table td,
  .jobs-table td {
    padding-top: 7px;
    padding-bottom: 7px;
  }
  .cell-secondary {
    font-size: 12px;
    margin-top: 2px;
  }
  .table-note {
    font-size: 12px;
    padding: 9px 28px;
  }
  .attention-item {
    min-height: 140px;
    padding: 20px;
  }
  .attention-item strong {
    font-size: 19px;
  }
  .attention-item b {
    font-size: 16px;
  }
  .attention-item p {
    font-size: 14px;
  }
  .attention-list {
    gap: 14px;
    padding: 0 24px 22px;
  }
  .config-summary {
    padding: 23px 26px;
  }
  .config-summary h2 {
    font-size: 21px;
  }
  .config-summary p {
    font-size: 14px;
  }
  .capacity-table th:first-child {
    width: 230px;
  }
  .capacity-table thead th {
    font-size: 15px;
    padding: 12px 17px;
  }
  .capacity-table .business-label {
    font-size: 16px;
  }
  .capacity-table .runtime {
    font-size: 27px;
    margin-bottom: 12px;
  }
  .capacity-spec {
    font-size: 14px;
    gap: 9px;
  }
  .capacity-spec label {
    font-size: 12px;
  }
  .capacity-table td {
    padding: 17px 20px;
  }
  .field,
  .check-label {
    font-size: 14px;
  }
  .form-card,
  .padded,
  .purchase-form,
  .purchase-result {
    padding: 23px 26px;
  }
  .team-header {
    padding: 20px 28px;
  }
  .team-table td {
    padding-top: 12px;
    padding-bottom: 12px;
  }
  .cost-bar-row {
    font-size: 17px;
    grid-template-columns: 145px 125px minmax(90px, 1fr) 50px;
  }
  .cost-breakdown span {
    font-size: 16px;
  }
  .modal-shell {
    padding: 40px 46px;
    gap: 28px;
  }
  .modal-header h2 {
    font-size: 34px;
  }
  .temperature-stat strong {
    font-size: 42px;
  }
  .modal-footer {
    font-size: 14px;
  }
  .accounts-table {
    min-width: 1040px;
  }
  .accounts-table td {
    padding-top: 10px;
    padding-bottom: 10px;
  }
  .account-role {
    font-size: 14px;
  }
  .row-actions button {
    font-size: 13px;
  }
  .form-grid {
    gap: 16px;
  }
  .grant-form .field {
    font-size: 14px;
  }
  .preview-footer {
    font-size: 12px;
  }
}
@media (max-width: 1500px) {
  .metric {
    padding: 20px;
    gap: 12px;
  }
  .metric-mark {
    padding-right: 12px;
  }
  .metric-value {
    font-size: 30px;
  }
  .metric-value.compact {
    font-size: 24px;
  }
  .metric-mark .icon {
    width: 25px;
    height: 25px;
  }
  .metric-note {
    font-size: 12px;
  }
  .permissions-top {
    grid-template-columns: minmax(0, 1fr) 290px;
  }
  .permissions-middle {
    grid-template-columns: minmax(0, 1fr);
  }
  .cost-layout {
    grid-template-columns: 1fr;
  }
  .cost-breakdown {
    border-left: 0;
    border-top: 1px solid var(--line);
    padding: 22px 0 0;
  }
  .grant-form {
    grid-template-columns: repeat(3, minmax(100px, 1fr)) auto;
  }
  .allocation-tools {
    grid-template-columns: 1fr 1fr;
  }
  .capacity-table th:first-child {
    width: 180px;
  }
  .header-actions .filter-label > span {
    display: none;
  }
  .metric-mark {
    display: none;
  }
}
@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .right-column {
    grid-template-columns: 1.4fr 1fr;
    align-items: start;
  }
  .attention-list {
    grid-template-columns: 1fr 1fr;
  }
  .attention-item {
    min-height: 130px;
    padding: 18px;
  }
  .evidence-grid,
  .purchase-layout {
    grid-template-columns: 1fr;
  }
  .permissions-top {
    grid-template-columns: 1fr;
  }
  .form-card .form-grid {
    grid-template-columns: 1fr 1fr;
  }
  .form-card .form-grid .primary {
    align-self: end;
  }
  .team-header {
    align-items: start;
    flex-direction: column;
  }
  .team-add {
    width: 100%;
  }
  .team-add .field {
    flex: 1;
  }
  .metric-value.compact {
    font-size: 22px;
  }
  .page-header {
    align-items: start;
  }
  .header-actions {
    max-width: 50%;
  }
  .cost-bar-row {
    grid-template-columns: 110px 90px minmax(80px, 1fr) 40px;
    gap: 14px;
  }
  dialog {
    width: 90vw;
    height: 82dvh;
  }
  .modal-shell {
    padding: 25px;
    gap: 18px;
  }
}
@media (max-width: 767px) {
  :root {
    --pad: 15px;
    --gap: 15px;
    font-size: 14px;
  }
  .page-header {
    flex-direction: column;
    padding: 20px;
    gap: 17px;
  }
  .header-actions {
    max-width: none;
    justify-content: start;
  }
  h1 {
    font-size: 25px;
  }
  h2 {
    font-size: 19px;
  }
  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .metric {
    min-height: 106px;
    padding: 15px;
  }
  .metric-value {
    font-size: 28px;
  }
  .metric-value.compact {
    font-size: 21px;
    white-space: normal;
  }
  .metric-note {
    font-size: 12px;
  }
  .metric-label {
    font-size: 12px;
  }
  .right-column,
  .attention-list,
  .permissions-middle,
  .purchase-layout {
    grid-template-columns: 1fr;
  }
  .section-heading {
    padding: 18px;
    flex-wrap: wrap;
  }
  .table-wrap {
    padding: 0 18px;
  }
  .table-note {
    padding: 14px 18px;
  }
  .form-card .form-grid,
  .grant-form,
  .allocation-tools,
  .purchase-fields {
    grid-template-columns: 1fr;
  }
  .grant-form {
    padding: 0 18px 18px;
  }
  .allocation-tools {
    padding: 0 18px 18px;
  }
  .team-add,
  .create-team-form {
    display: grid;
    grid-template-columns: 1fr;
    width: 100%;
  }
  .team-add .field {
    min-width: 0;
  }
  .team-header {
    padding: 18px;
  }
  .teams-new {
    padding: 18px;
  }
  .cost-layout {
    padding: 20px 18px;
    gap: 20px;
  }
  .cost-bar-row {
    grid-template-columns: 90px 80px minmax(50px, 1fr);
    gap: 10px;
    font-size: 13px;
  }
  .cost-bar-row .cost-percent {
    display: none;
  }
  .cost-breakdown div {
    align-items: start;
  }
  .preview-footer {
    flex-direction: column;
    font-size: 11px;
  }
  .padded,
  .form-card {
    padding: 20px 18px;
  }
  .tabs {
    gap: 19px;
  }
  .tabs button {
    font-size: 14px;
  }
  .purchase-mode {
    grid-template-columns: 1fr;
  }
  .segmented button {
    padding: 6px 9px;
  }
  .sample-badge {
    font-size: 10px;
  }
  dialog {
    width: calc(100vw - 28px);
    height: 85dvh;
    max-width: calc(100vw - 28px);
    max-height: calc(100dvh - 28px);
    border-radius: 14px;
  }
  .modal-shell {
    padding: 20px;
    gap: 16px;
  }
  .modal-header h2 {
    font-size: 24px;
  }
  .modal-header .muted {
    font-size: 12px;
  }
  .chart-controls {
    flex-wrap: wrap;
  }
  .temperature-stats {
    gap: 10px;
    padding: 16px 0;
  }
  .temperature-stat {
    padding-left: 12px;
  }
  .temperature-stat strong {
    font-size: 27px;
  }
  .temperature-stat strong small {
    font-size: 14px;
  }
  .modal-footer {
    font-size: 11px;
  }
  .keyboard-hint {
    display: none;
  }
  .chart-area {
    min-height: 150px;
  }
}
@media (max-width: 480px) {
  :root {
    --pad: 12px;
    --gap: 12px;
  }
  .page-header {
    padding: 17px;
  }
  .header-actions {
    gap: 8px;
  }
  .header-actions button {
    padding: 8px 10px;
    font-size: 12px;
  }
  .header-actions select {
    font-size: 12px;
    min-height: 37px;
  }
  .metric {
    padding: 13px;
  }
  .metric-value {
    font-size: 24px;
  }
  .metric-value.compact {
    font-size: 19px;
  }
  .metric-value .unit {
    font-size: 17px;
  }
  .page-header .subtitle {
    font-size: 12px;
  }
  .metric-note {
    font-size: 12px;
  }
  .modal-footer {
    gap: 7px;
  }
  .temperature-stat label {
    font-size: 11px;
  }
  .temperature-stat strong {
    font-size: 24px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *:before,
  *:after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
.admin-page [tabindex='0']:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 3px;
}
.admin-page .attention-item {
  min-height: 112px;
  padding: 16px;
}
@media (max-width: 767px) {
  .admin-page :is(main, dialog) button {
    min-height: 44px;
  }
  .admin-page .icon-button {
    min-width: 44px;
    min-height: 44px;
  }
  .admin-page .close-button {
    width: 44px;
    height: 44px;
  }
  .admin-page .metric-note {
    font-size: 12px;
  }
  .admin-page :is(main, dialog) :is(input:not([type='checkbox']), select, textarea) {
    font-size: 16px;
    min-height: 44px;
  }
  .admin-page .check-label,
  .admin-page .offline-toggle {
    min-height: 44px;
  }
  .admin-page .attention-list {
    max-height: 320px;
  }
}

/* 完整功能版沿用原黑灰主题与圆角尺度，功能密度增加时以折叠和局部滚动承载。 */
.f-preview-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding: 14px 20px;
  background: #11151b;
  border: 1px dashed #424c5b;
  border-radius: 10px;
  font-size: 12px;
  color: var(--muted);
}
.f-preview-tools > div:first-child {
  display: grid;
  gap: 4px;
}
.f-preview-tools b {
  color: #dce1e9;
  font-size: 13px;
  font-weight: 600;
}
.f-tools-fields {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.f-tools-fields label {
  display: flex;
  align-items: center;
  gap: 8px;
}
.f-tools-fields select,
.f-tools-fields button {
  font-size: 12px;
  min-height: 34px;
  padding: 6px 10px;
}
.f-metrics6 {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}
.f-metrics8 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.f-metrics6 .metric {
  padding: 20px;
  min-height: 115px;
}
.f-metrics6 .metric-mark,
.f-metrics8 .metric-mark {
  display: none;
}
.f-metrics6 .metric-value {
  font-size: 30px;
}
.f-metrics6 .metric-value.compact {
  font-size: 26px;
}
.f-metrics8 .metric-content {
  width: 100%;
}
.f-metrics8 .metric-value {
  overflow-x: auto;
  overflow-wrap: normal;
}
.f-metrics8 .metric-value.compact {
  font-size: 25px;
  white-space: nowrap;
}
.f-metrics8 #retail-range {
  white-space: normal;
}
.f-metrics8 .cost-amount {
  display: inline-block;
  white-space: nowrap;
}
.f-metrics8 .metric-note {
  line-height: 1.7;
}
.f-workers {
  min-width: 1470px;
}
.f-workers th,
.f-workers td {
  white-space: normal;
}
.f-workers td {
  font-size: 13px;
  vertical-align: top;
  padding-top: 10px;
  padding-bottom: 10px;
}
.f-workers td:nth-child(1) {
  min-width: 175px;
}
.f-workers td:nth-child(2) {
  min-width: 150px;
}
.f-workers td:nth-child(3) {
  min-width: 235px;
}
.f-workers td:nth-child(5) {
  min-width: 165px;
}
.f-workers td:nth-child(6) {
  min-width: 170px;
}
.f-workers .utilization {
  margin: 6px 0;
}
.f-gpu + .f-gpu {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--soft-line);
}
.f-workers td:nth-child(3) .f-gpu {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  align-items: center;
}
.admin-page .f-workers td:nth-child(3) .resource-meter .util-track i {
  background: var(--blue);
}
.f-stack {
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: 6px;
}
.f-job-scroll {
  max-height: 520px;
}
.f-job-scroll th {
  position: sticky;
  top: 0;
  background: var(--panel);
  z-index: 1;
}
.f-worker-status {
  --state-text: #a0a6b1;
  --state-border: #424956;
  --state-bg: #1b2028;
}
.f-worker-status[data-worker-state='运行中'],
.f-worker-status[data-worker-state='正在更新'] {
  --state-text: #f5c96a;
  --state-border: #665231;
  --state-bg: #2b251b;
}
.f-worker-status[data-worker-state='空闲'] {
  --state-text: #7bd99d;
  --state-border: #355d43;
  --state-bg: #19281f;
}
.f-worker-status[data-worker-state='离线'],
.f-worker-status[data-worker-state='已禁用'] {
  --state-text: #fb7185;
  --state-border: #6d3541;
  --state-bg: #2c1b22;
}
.f-worker-status .f-chip {
  color: var(--state-text);
  border-color: var(--state-border);
  background: var(--state-bg);
}
.f-worker-status .f-reception {
  color: var(--state-text);
}
.f-config-definition {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 14px 12px;
  margin: 0;
  padding: 4px 24px 24px;
  font-size: 13px;
  line-height: 1.7;
}
.f-config-definition dt {
  color: var(--muted);
}
.f-config-definition dd {
  margin: 0;
  overflow-wrap: anywhere;
  color: #dce1e9;
}
.f-toolbar {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}
.f-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: end;
}
.f-grid2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.f-grid3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}
.f-pad {
  padding: 24px;
}
.f-pad-tabs {
  margin: 0 24px;
}
.f-status {
  font-size: 13px;
  line-height: 1.8;
  color: var(--muted);
  margin-top: 12px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.f-status:empty {
  display: none;
}
.f-pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  padding: 16px 24px;
  border-top: 1px solid var(--soft-line);
  font-size: 13px;
  color: var(--muted);
}
.f-pager span:first-child {
  margin-right: auto;
}
.f-tags {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}
.f-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border: 1px solid #3a424e;
  background: var(--surface);
  border-radius: 5px;
  font-size: 12px;
  line-height: 1.6;
  color: #d3d9e3;
  white-space: normal;
}
.f-statgrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.f-stat {
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--soft-line);
  border-radius: 10px;
  min-width: 0;
}
.f-stat span,
.f-stat label {
  display: block;
  color: var(--muted);
  font-size: 12px;
}
.f-stat strong {
  display: block;
  font-size: 25px;
  line-height: 1.4;
  margin-top: 8px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.f-summary {
  padding: 18px 24px;
  cursor: pointer;
  font-size: 16px;
  color: #dce2ec;
  font-weight: 550;
}
.f-summary::marker {
  color: var(--muted);
}
.f-summary + p {
  padding: 0 24px 18px;
}
.f-table {
  min-width: 900px;
}
.f-table td {
  vertical-align: top;
  font-size: 14px;
}
.f-table p + p {
  margin-top: 5px;
}
.f-table select {
  max-width: 100%;
  font-size: 12px;
}
.f-table .cell-secondary {
  white-space: normal;
}
.f-definition {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 12px 20px;
  margin: 20px 0;
  font-size: 14px;
}
.f-definition dt {
  color: var(--muted);
}
.f-definition dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.f-operation-modal {
  width: min(800px, 88vw);
  height: auto;
  max-height: 88dvh;
  overflow: auto;
  border-radius: 14px;
}
.f-operation-modal form {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.f-dialog-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid var(--line);
  gap: 18px;
}
.f-dialog-head h2 {
  font-size: 24px;
}
.f-dialog-head .eyeline {
  font-size: 12px;
  display: block;
  line-height: 1.7;
}
.f-dialog-body {
  padding: 24px;
  display: grid;
  gap: 18px;
  min-width: 0;
}
.f-dialog-body .f-status {
  margin-top: 0;
}
.f-dialog-body .f-grid2 {
  gap: 12px;
}
.f-dialog-body pre {
  font-size: 12px;
}
.f-dialog-foot {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 18px 24px;
  border-top: 1px solid var(--line);
  background: #131820;
}
.f-operation-modal .f-dialog-foot button {
  font-size: 14px;
}
.f-operation-modal .field {
  font-size: 14px;
}
textarea {
  font: inherit;
  color: var(--text);
  background: var(--surface);
  border: 1px solid #39414d;
  border-radius: 8px;
  padding: 10px 12px;
  min-width: 0;
  width: 100%;
  resize: vertical;
}
textarea:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 3px;
}
pre {
  margin: 0;
  padding: 16px;
  max-width: 100%;
  max-height: 340px;
  overflow: auto;
  font:
    12px/1.8 ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
  color: #bbc5d4;
  background: #0d1117;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
summary {
  cursor: pointer;
}
details > summary {
  list-style-position: inside;
}
details[open] > .f-summary {
  border-bottom: 1px solid var(--soft-line);
}
.notice-box p + p {
  margin-top: 9px;
}
.f-cost-chart {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 36px;
}
.f-rank {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.f-rank > div:first-child {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
}
.f-rank b {
  font-weight: 550;
  overflow-wrap: anywhere;
}
.f-rank strong {
  font-weight: 500;
  white-space: nowrap;
}
.f-track {
  height: 6px;
  border-radius: 6px;
  background: #2b3340;
  overflow: hidden;
}
.f-track i {
  display: block;
  height: 100%;
  background: var(--blue);
}
.f-error {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  border: 1px solid #6f3e4b;
  background: #24171d;
  border-radius: 10px;
  color: #fda4b4;
  font-size: 14px;
}
.f-error p {
  font-size: 13px;
  margin-top: 4px;
  color: #d4b7bf;
}
.f-skeleton {
  background: #202630;
  border: 1px solid #2a313d;
  border-radius: 7px;
}
.f-skeleton-title {
  width: 35%;
  height: 28px;
  margin-bottom: 24px;
}
.f-skeleton-card {
  height: 110px;
}
.f-skeleton-row {
  height: 35px;
  margin-top: 18px;
}
.f-skeleton-row:nth-child(odd) {
  width: 90%;
}
.f-skeleton-row:last-of-type {
  margin-bottom: 20px;
}
.f-dialog-foot {
  flex-wrap: wrap;
}
.f-feedback-label {
  margin-right: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--muted);
}
.f-feedback-label select {
  font-size: 12px;
  min-height: 32px;
  padding: 5px 8px;
}
[data-form-error]:empty,
[data-cap-error]:empty {
  display: none;
}
[data-admin-form='assign'] {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}
[data-admin-form='assign'] > .field {
  min-width: 220px;
}
[data-admin-form='assign'] > [data-selected-count] {
  align-self: center;
  margin: 0;
}
[data-admin-form='assign'] > button {
  min-height: 42px;
}
[data-admin-form='assign'] > [data-form-error] {
  flex-basis: 100%;
}
.f-toolbar > .f-fields:not(form) {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  flex: 1;
  min-width: 0;
  max-width: 740px;
}
.cap-matrix-scroll {
  max-height: min(900px, 65dvh);
  overflow: auto;
  scrollbar-gutter: stable;
}
.cap-matrix {
  min-width: 2150px;
  border-collapse: separate;
  border-spacing: 0;
}
.cap-matrix thead th {
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 3;
  white-space: normal;
  overflow-wrap: anywhere;
}
.cap-matrix tbody th {
  position: sticky;
  left: 0;
  z-index: 2;
  background: var(--panel);
  vertical-align: top;
  white-space: normal;
  padding: 20px 16px;
}
.cap-matrix thead th:first-child {
  left: 0;
  z-index: 4;
}
.cap-matrix .form-grid {
  gap: 10px;
}
.cap-matrix .runtime {
  font-size: 24px;
  margin-bottom: 5px;
}
.cap-matrix .f-toolbar {
  justify-content: flex-start;
  gap: 7px;
}
.cap-matrix button {
  font-size: 12px;
  min-height: 32px;
  padding: 6px 9px;
}
.cap-matrix .empty-state {
  min-height: 90px;
  padding: 16px 4px;
  font-size: 13px;
}
.cap-matrix h3 {
  color: var(--text);
  font-size: 15px;
}
.cap-matrix select {
  font-size: 12px;
  min-height: 36px;
}
.cap-definition {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  gap: 9px 16px;
  margin: 16px 0;
  font-size: 13px;
}
.cap-definition dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.cap-demand {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px auto;
  gap: 12px;
  align-items: end;
  padding: 16px 0;
  border-top: 1px solid var(--soft-line);
}
.cap-raw {
  margin-top: 12px;
}
.cap-groups {
  min-width: 1500px;
}
.cap-result-number {
  font-size: 42px;
  font-weight: 650;
}
.cap-evidence-item {
  border-top: 1px solid var(--soft-line);
  padding-top: 16px;
  margin-top: 16px;
}
@media (max-width: 767px) {
  .f-toolbar > .f-fields:not(form) {
    flex-basis: 100%;
    grid-template-columns: 1fr;
    max-width: none;
  }
  [data-admin-form='assign'] {
    width: 100%;
  }
  [data-admin-form='assign'] > .field {
    min-width: 0;
    width: 100%;
  }
  .cap-definition {
    grid-template-columns: 90px minmax(0, 1fr);
  }
  .cap-demand {
    grid-template-columns: 1fr;
  }
  .cap-matrix-scroll {
    max-height: 70dvh;
  }
}
@media (min-width: 2000px) {
  .f-workers td {
    font-size: 14px;
  }
  .f-workers .cell-secondary {
    font-size: 12px;
  }
  .f-metrics6 .metric {
    min-height: 116px;
  }
  .f-metrics6 .metric-value {
    font-size: 32px;
  }
  .f-metrics6 .metric-value.compact {
    font-size: 27px;
  }
  .f-metrics8 .metric-value.compact {
    font-size: 28px;
  }
  .f-table td {
    font-size: 15px;
  }
}
@media (max-width: 1700px) {
  .f-metrics6 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .f-preview-tools {
    align-items: start;
    flex-direction: column;
  }
  .f-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .f-workers {
    min-width: 1400px;
  }
}
@media (max-width: 1100px) {
  .f-grid3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .f-metrics8 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .f-cost-chart {
    grid-template-columns: 1fr;
  }
  .f-statgrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 767px) {
  .f-fields,
  .f-grid2,
  .f-grid3 {
    grid-template-columns: 1fr;
  }
  .f-metrics6 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .f-metrics6 .metric {
    padding: 14px;
    min-height: 105px;
  }
  .f-metrics6 .metric-value,
  .f-metrics6 .metric-value.compact {
    font-size: 23px;
  }
  .f-preview-tools {
    padding: 14px;
    gap: 14px;
  }
  .f-tools-fields {
    gap: 10px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
  }
  .f-tools-fields label {
    flex-direction: column;
    align-items: start;
    gap: 5px;
  }
  .f-tools-fields select,
  .f-tools-fields button {
    width: 100%;
  }
  .f-tools-fields button {
    align-self: end;
    font-size: 11px;
    padding: 5px;
  }
  .f-tools-fields select {
    font-size: 11px;
    padding: 5px;
  }
  .f-tools-fields label {
    font-size: 11px;
  }
  .f-preview-tools > div:first-child span {
    font-size: 11px;
  }
  .f-pad {
    padding: 18px;
  }
  .f-pad-tabs {
    margin: 0 18px;
  }
  .f-dialog-head,
  .f-dialog-body {
    padding: 18px;
  }
  .f-dialog-head h2 {
    font-size: 20px;
  }
  .f-dialog-foot {
    padding: 14px 18px;
  }
  .f-definition {
    grid-template-columns: 85px minmax(0, 1fr);
    gap: 12px;
    font-size: 13px;
  }
  .f-pager {
    padding: 14px 18px;
    gap: 8px;
  }
  .f-pager button {
    font-size: 12px;
    min-height: 34px;
    padding: 6px 9px;
  }
  .f-rank > div:first-child {
    display: grid;
    gap: 4px;
  }
  .f-error {
    flex-direction: column;
    align-items: start;
  }
  .f-preview-tools {
    margin-bottom: 14px;
  }
  .f-operation-modal {
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
    height: auto;
  }
  .chart-controls .inline-label {
    font-size: 12px;
  }
  .chart-controls .inline-label select {
    min-width: 100px;
    max-width: 175px;
  }
  .chart-controls {
    gap: 10px;
  }
  .temperature-stats {
    margin-top: 0;
  }
  .modal-shell {
    gap: 15px;
  }
  .f-cost-chart {
    gap: 22px;
  }
  .f-stat strong {
    font-size: 21px;
  }
}
@media (max-width: 480px) {
  .f-metrics8 {
    grid-template-columns: minmax(0, 1fr);
  }
}
.admin-page .worker-version {
  display: flex;
  width: max-content;
  margin-top: 6px;
  color: #dce4ee;
  background: #171c23;
  font-weight: 600;
}
.admin-page .inventory-chip {
  display: flex;
  width: max-content;
  max-width: 280px;
  margin-top: 7px;
  line-height: 1.45;
}
.admin-page .inventory-chip[data-tone='ok'] {
  color: var(--ok);
  border-color: #315c42;
  background: #14231a;
}
.admin-page .inventory-chip[data-tone='warn'] {
  color: var(--warn);
  border-color: #665530;
  background: #292315;
}
.admin-page .inventory-chip[data-tone='bad'] {
  color: var(--bad);
  border-color: #6d3541;
  background: #2c1b22;
}
.admin-page .inventory-audit {
  display: grid;
  gap: 12px;
  border-top: 1px solid var(--soft-line);
  padding-top: 18px;
}
.admin-page .inventory-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.admin-page .inventory-heading .inventory-chip {
  margin-top: 0;
}
.admin-page .inventory-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.admin-page .inventory-block {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
}
.admin-page .inventory-block h4 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
}
.admin-page .inventory-block h4:not(:first-child) {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--soft-line);
}
.admin-page .inventory-block h4 span {
  color: var(--muted);
  font-weight: 500;
}
.admin-page .inventory-list {
  max-height: 180px;
  margin: 0;
  padding-left: 20px;
  overflow: auto;
  scrollbar-gutter: stable;
  color: #dce1e9;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.admin-page .inventory-list li + li {
  margin-top: 7px;
}
.admin-page .inventory-list li span {
  display: block;
  color: var(--muted);
  font-size: 11px;
}
.admin-page [data-capabilities] .f-toolbar {
  margin: 12px 0;
}
.admin-page pre.capabilities-json {
  white-space: pre;
  overflow-wrap: normal;
  min-width: 0;
  max-height: 340px;
}
@media (max-width: 767px) {
  .admin-page .inventory-grid {
    grid-template-columns: 1fr;
  }
  .admin-page .inventory-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
`,Or=`.permissions-page .permissions-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--gap);
  align-items: start;
}
.permissions-page .section-heading {
  flex-wrap: wrap;
}
.permissions-page .page-status:empty,
.permissions-page [role='alert']:empty,
.permissions-page .f-status:empty {
  display: none;
}
.permissions-page .page-status {
  padding: 14px 20px;
  border: 1px solid #6f3e4b;
  background: #24171d;
  border-radius: 10px;
  color: #fda4b4;
  overflow-wrap: anywhere;
}
.permissions-page .accounts-table {
  min-width: 1050px;
}
.permissions-page .accounts-table td:first-child {
  min-width: 160px;
}
.permissions-page .row-actions {
  min-width: 320px;
}
.permissions-page .perm-identity {
  display: grid;
  gap: 3px;
  overflow-wrap: anywhere;
}
.permissions-page .perm-username {
  font-weight: 550;
}
.permissions-page .perm-user-id {
  display: block;
  color: var(--muted);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.permissions-page .f-chip.on {
  color: #7bd99d;
  border-color: #355d43;
  background: #19281f;
}
.permissions-page .f-chip.off {
  color: #fb7185;
  border-color: #6d3541;
  background: #2c1b22;
}
.permissions-page .f-chip.admin {
  color: #a6d9f4;
}
.permissions-page .registration-table {
  min-width: 600px;
}
.permissions-page .grant-form {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding-top: 0;
}
.permissions-page .grant-form button {
  justify-self: start;
}
.permissions-page .allocation-tools {
  display: flex;
  align-items: end;
  gap: 16px;
  flex-wrap: wrap;
  padding: 0 24px 24px;
}
.permissions-page .allocation-filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(150px, 1fr));
  gap: 14px;
  flex: 1;
}
.permissions-page .allocation-batch {
  display: flex;
  align-items: end;
  gap: 12px;
  flex-wrap: wrap;
}
.permissions-page .allocation-batch .field {
  min-width: 210px;
}
.permissions-page #project-selected {
  align-self: center;
  font-size: 13px;
  color: var(--muted);
}
.permissions-page .history-scroll {
  max-height: 620px;
}
.permissions-page .history-scroll th {
  position: sticky;
  top: 0;
  background: var(--panel);
  z-index: 1;
}
.permissions-page .allocation-table td {
  overflow-wrap: anywhere;
}
.permissions-page .perm-id {
  max-width: 240px;
  font-size: 12px;
  color: var(--muted);
}
.permissions-page .allocation-table .team-space {
  display: block;
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
}
.permissions-page .refresh-note {
  font-size: 12px;
  color: var(--muted);
}
.permissions-page .dialog-list {
  max-height: 320px;
  overflow: auto;
}
.permissions-page .dialog-list table {
  min-width: 620px;
}
.permissions-page .dialog-list td {
  overflow-wrap: anywhere;
}
.permissions-page .dialog-list th {
  position: sticky;
  top: 0;
  background: var(--panel);
}
.permissions-page .notice-box {
  overflow-wrap: anywhere;
}
.permissions-page .table-wrap {
  scrollbar-gutter: stable;
}
.permissions-page .metric-value {
  min-height: 1.25em;
}
.permissions-page .accounts-scroll,
.permissions-page .registrations-scroll {
  max-height: 520px;
}
.permissions-page :is(.accounts-scroll, .registrations-scroll) th {
  position: sticky;
  top: 0;
  background: var(--panel);
  z-index: 1;
}
.permissions-page .section-nav {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.permissions-page .section-nav a {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 9px 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  font-size: 14px;
  color: var(--text);
}
.permissions-page .section-nav a:hover {
  background: var(--hover);
  text-decoration: none;
}
.permissions-page h2[id] {
  scroll-margin-top: 24px;
}
.permissions-page h2[id]:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 4px;
}
@media (max-width: 1100px) {
  .permissions-page .permissions-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 767px) {
  .permissions-page .allocation-tools {
    padding: 0 18px 18px;
    display: grid;
  }
  .permissions-page .allocation-filters {
    grid-template-columns: 1fr;
  }
  .permissions-page .allocation-batch {
    display: grid;
  }
  .permissions-page .allocation-batch .field {
    min-width: 0;
  }
  .permissions-page .grant-form {
    grid-template-columns: 1fr;
  }
  .permissions-page .header-actions {
    width: 100%;
  }
}
`,Ur=`/* 页面样式只作用于产能主区及产能对话框，不覆盖共享侧栏。 */
@scope (.capacity-page) {
  :scope {
    color-scheme: dark;
    --bg: #0b0d10;
    --panel: #111318;
    --panel2: #16191f;
    --line: #303640;
    --muted: #a0a6b1;
    --text: #f3f4f6;
    --ok: #34d399;
    --warn: #fbbf24;
    --bad: #fb7185;
    --blue: #38bdf8;
  }
  * {
    box-sizing: border-box;
  }
  [hidden] {
    display: none !important;
  }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font:
      13px/1.6 system-ui,
      'Microsoft YaHei',
      sans-serif;
  }
  header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    min-height: 60px;
    padding: 10px 22px;
    border-bottom: 1px solid var(--line);
    background: var(--panel);
  }
  h1 {
    margin: 0;
    font-size: 15px;
    font-weight: 650;
  }
  header .state {
    margin-right: auto;
  }
  a,
  button,
  input,
  select,
  textarea {
    font: inherit;
    color: #d3d6dc;
    border: 1px solid var(--line);
    background: #15181d;
    border-radius: 8px;
    padding: 7px 11px;
  }
  a,
  button,
  select,
  summary {
    cursor: pointer;
  }
  a {
    text-decoration: none;
  }
  a:hover,
  button:hover {
    color: #fff;
    border-color: #737985;
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  :focus-visible {
    outline: 2px solid var(--blue);
    outline-offset: 3px;
  }
  input,
  select,
  textarea {
    width: 100%;
    min-width: 0;
  }
  main {
    max-width: 1440px;
    margin: auto;
    padding: 24px;
  }
  h2,
  h3,
  p {
    margin: 0;
  }
  h2 {
    font-size: 14px;
    font-weight: 650;
  }
  h3 {
    font-size: 13px;
    font-weight: 600;
  }
  .muted,
  .state,
  .hint {
    color: var(--muted);
  }
  .hint {
    font-size: 12px;
  }
  .warn {
    color: var(--warn);
  }
  .error {
    color: #fecdd3;
    background: #351821;
    border: 1px solid #713144;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 14px;
  }
  .notice {
    padding: 12px 15px;
    border-left: 3px solid var(--warn);
    background: #fbbf2408;
  }
  .section {
    margin-top: 16px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 12px;
    overflow: hidden;
  }
  .section-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--line);
  }
  .pad {
    padding: 16px;
  }
  .field {
    display: grid;
    align-content: start;
    gap: 5px;
    min-width: 0;
  }
  .field > span {
    color: var(--muted);
    font-size: 12px;
  }
  .tabs {
    display: flex;
    gap: 8px;
    margin-top: 22px;
    border-bottom: 1px solid var(--line);
  }
  .tabs button {
    border: 0;
    border-bottom: 2px solid transparent;
    border-radius: 6px 6px 0 0;
    padding: 12px 18px;
    background: transparent;
  }
  .tabs [aria-selected='true'] {
    color: var(--blue);
    border-bottom-color: var(--blue);
    background: #38bdf808;
  }
  .summary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }
  .metric span {
    display: block;
    color: var(--muted);
    font-size: 12px;
  }
  .metric strong {
    display: block;
    font-size: 22px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .worker-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    padding: 14px;
  }
  .worker {
    min-width: 0;
    background: var(--panel2);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 14px;
    overflow-wrap: anywhere;
  }
  .worker h3 {
    font-size: 15px;
  }
  .worker p {
    margin: 6px 0;
  }
  .badge {
    display: inline-block;
    padding: 2px 7px;
    border: 1px solid var(--line);
    border-radius: 5px;
    margin: 2px 5px 2px 0;
    font-size: 11px;
  }
  .worker dl {
    display: grid;
    grid-template-columns: 70px minmax(0, 1fr);
    gap: 5px 10px;
  }
  dt {
    color: var(--muted);
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .scroll {
    overflow: auto;
    max-width: 100%;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }
  th,
  td {
    text-align: left;
    vertical-align: top;
    padding: 12px 14px;
    border-bottom: 1px solid var(--line);
  }
  th {
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
    white-space: nowrap;
    background: #ffffff03;
  }
  td {
    min-width: 110px;
  }
  td.wide {
    min-width: 230px;
    max-width: 390px;
    overflow-wrap: anywhere;
  }
  td p {
    margin-top: 5px;
  }
  tbody tr:last-child td {
    border-bottom: 0;
  }
  tbody tr:hover {
    background: #ffffff02;
  }
  ul {
    padding-left: 19px;
    margin: 6px 0;
  }
  .empty {
    color: var(--muted);
    padding: 24px;
    text-align: center;
  }
  .pager {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 12px;
    padding: 12px 16px;
  }
  .evidence {
    border-bottom: 1px solid var(--line);
    padding: 12px 16px;
    overflow-wrap: anywhere;
  }
  .evidence summary {
    line-height: 1.9;
  }
  .evidence summary .badge {
    margin-left: 8px;
  }
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: #c2c7d0;
    font: 12px/1.6 inherit;
    background: var(--bg);
    padding: 12px;
    border-radius: 6px;
    max-height: 360px;
    overflow: auto;
  }
  .review-fields {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }
  .review-form {
    display: grid;
    gap: 12px;
    margin-top: 14px;
  }
  .review-form button {
    justify-self: start;
  }
  .profile-form {
    display: grid;
    gap: 10px;
    margin-top: 12px;
  }
  .profile-form button {
    justify-self: start;
  }
  .profile-details {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }
  .write-status {
    padding: 10px 12px;
    margin-bottom: 14px;
    border: 1px solid var(--line);
    border-radius: 8px;
    color: var(--ok);
  }
  .worker dd {
    white-space: pre-line;
  }
  .procurement {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  #estimate-form {
    display: grid;
    gap: 16px;
  }
  .demand {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 120px auto;
    align-items: end;
    gap: 10px;
    margin: 12px 0;
  }
  #estimate-result {
    display: grid;
    gap: 14px;
    overflow-wrap: anywhere;
  }
  .result-number {
    font-size: 28px;
    font-variant-numeric: tabular-nums;
  }
  .actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }
  .primary {
    background: #173145;
    border-color: #35627c;
    color: #e0f2fe;
  }
  .account-bar {
    flex-wrap: wrap;
  }
  #machine-summary {
    margin-top: 20px;
  }
  .summary-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
  }
  .summary-toolbar h2 {
    font-size: 16px;
  }
  .offline-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .offline-toggle input {
    width: auto;
    accent-color: var(--blue);
  }
  .summary-note {
    margin: 8px 0 14px;
    max-width: 85ch;
  }
  .comparison-scroll {
    max-height: 72vh;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
  }
  .online-state {
    color: var(--ok);
  }
  .machine-hardware {
    color: var(--muted);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .simple-table {
    table-layout: fixed;
    min-width: calc(128px + 300px * var(--machine-count));
    border-collapse: separate;
    border-spacing: 0;
  }
  .matrix-axis-col {
    width: 128px;
  }
  .simple-table th,
  .simple-table td {
    padding: 12px;
    border-right: 1px solid var(--line);
  }
  .simple-table tr > :last-child {
    border-right: 0;
  }
  .simple-table th {
    white-space: normal;
    font-size: 13px;
    font-weight: 400;
  }
  .simple-table td {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .simple-table thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--panel2);
  }
  .simple-table .business-axis {
    position: sticky;
    left: 0;
    z-index: 1;
    background: var(--panel2);
    color: var(--text);
    overflow-wrap: anywhere;
  }
  .simple-table thead .business-axis {
    z-index: 3;
  }
  .machine-heading {
    color: var(--text);
    overflow-wrap: anywhere;
  }
  .machine-heading h3 {
    font-size: 15px;
  }
  .machine-heading .machine-hardware {
    margin-top: 5px;
  }
  .matrix-table .business-row {
    display: grid;
    gap: 10px;
  }
  .matrix-models {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: 12px;
  }
  .matrix-field {
    min-width: 0;
  }
  .matrix-field::before {
    content: attr(data-label);
    display: block;
    color: var(--muted);
    font-size: 11px;
    margin-bottom: 3px;
  }
  .matrix-samples {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px;
  }
  .matrix-samples p {
    margin: 0;
  }
  .matrix-samples button {
    padding: 4px 8px;
  }
  .matrix-empty {
    color: var(--muted);
  }
  .simple-table select {
    max-width: 100%;
    padding: 5px 7px;
  }
  .selected-spec {
    margin: 8px 0 0;
  }
  .selected-spec dt {
    font-size: 11px;
    margin-top: 6px;
  }
  .selected-spec dd {
    margin-top: 2px;
  }
  .input-materials {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
  }
  .input-materials span {
    overflow-wrap: anywhere;
  }
  .actual-resolution > span {
    display: block;
    overflow-wrap: anywhere;
  }
  .output-probe {
    margin: 12px 0;
  }
  .output-probe p {
    margin-top: 6px;
  }
  .business-title {
    font-size: 13px;
    font-weight: 600;
  }
  .mean-time {
    display: block;
    font-size: 18px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .model-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
  }
  .model-item + .model-item,
  .model-variant + .model-variant {
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid var(--line);
  }
  .model-origin {
    margin-bottom: 8px;
    color: var(--warn);
  }
  .model-reference {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--line);
  }
  .model-variant {
    overflow-wrap: anywhere;
  }
  .simple-table summary,
  .machine-more summary {
    color: var(--blue);
  }
  .summary-evidence {
    margin-top: 12px;
    max-height: 440px;
    overflow: auto;
    border-top: 1px solid var(--line);
  }
  .summary-evidence .pad {
    padding: 12px 0;
  }
  .machine-more {
    margin-top: 10px;
  }
  .machine-more p {
    margin-top: 6px;
  }
  .advanced {
    margin-top: 18px;
  }
  .advanced > summary {
    padding: 14px 16px;
    color: var(--muted);
  }
  #technical-details > .summary {
    padding: 0 14px;
  }
  #technical-details > .section {
    margin: 14px;
  }
  @media (max-width: 1100px) {
    .worker-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .summary,
    .procurement {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 700px) {
    .matrix-axis-col {
      width: 104px;
    }
    .matrix-table {
      min-width: calc(104px + (100vw - var(--workspace-width) - 130px) * var(--machine-count));
    }
    .matrix-models {
      grid-template-columns: 1fr;
    }
    main {
      padding: 12px;
    }
    header {
      padding: 12px;
    }
    header .state {
      width: 100%;
      order: 5;
    }
    .worker-grid {
      grid-template-columns: 1fr;
      padding: 10px;
    }
    .metrics {
      grid-template-columns: 1fr 1fr;
    }
    .tabs button {
      flex: 1;
      padding: 12px 4px;
    }
    .form-grid,
    .review-fields {
      grid-template-columns: 1fr;
    }
    .demand {
      grid-template-columns: minmax(0, 1fr) 90px;
    }
    .demand > button {
      grid-column: 2;
    }
  }
  @media (max-width: 480px) {
    .demand {
      grid-template-columns: minmax(0, 1fr);
    }
    .demand > button {
      grid-column: auto;
      justify-self: end;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    * {
      scroll-behavior: auto !important;
      transition: none !important;
    }
  }
  :scope:is(main) {
    max-width: none;
    margin: 0;
    padding: var(--pad);
    min-width: 0;
    font-size: 14px;
    line-height: 1.6;
  }
  :scope:is(main).page {
    gap: var(--gap);
    align-content: start;
  }
  header.page-header {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 23px 25px;
    gap: 20px;
  }
  h1 {
    font-size: 30px;
    font-weight: 650;
  }
  h2 {
    font-size: 21px;
  }
  h3 {
    font-size: 17px;
  }
  .subtitle {
    color: #b5bbc5;
    font-size: 14px;
    margin-top: 8px;
  }
  a,
  button,
  input,
  select,
  textarea {
    color: var(--text);
  }
  button {
    min-height: 40px;
    background: #1a1f27;
    border-color: #39414d;
  }
  input,
  select,
  textarea {
    background: var(--surface);
    border-color: #39414d;
    min-height: 42px;
  }
  .primary {
    background: #edf0f5;
    color: #15181d;
    border-color: #e5e9ef;
    font-weight: 600;
  }
  .primary:hover {
    background: #fff;
    color: #15181d;
  }
  .hint {
    font-size: 12px;
  }
  .pad {
    padding: 24px;
  }
  .section {
    margin-top: 0;
    border-radius: var(--radius);
  }
  .section-head {
    padding: 20px 24px;
    border-bottom-color: var(--soft-line);
  }
  .tabs {
    margin-top: 0;
    gap: 28px;
  }
  .tabs button {
    background: none;
    padding: 4px 2px 14px;
    border: 0;
    border-radius: 0;
    color: var(--muted);
  }
  .tabs [aria-selected='true'] {
    color: var(--text);
    background: none;
    border-bottom: 0;
  }
  #capacity-stats {
    gap: 14px;
  }
  #capacity-stats .metric {
    display: block;
    padding: 16px;
    min-height: 100px;
    border: 1px solid var(--soft-line);
    border-radius: 10px;
    background: var(--surface);
  }
  #capacity-stats strong {
    font-size: 25px;
    margin-top: 8px;
  }
  #panel-machines,
  #panel-scenarios,
  #panel-purchase {
    min-width: 0;
    display: grid;
    gap: 20px;
  }
  #machine-summary {
    margin-top: 0;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--panel);
    overflow: hidden;
  }
  .summary-toolbar {
    padding: 20px 24px 0;
  }
  .summary-toolbar h2 {
    font-size: 21px;
  }
  .summary-note {
    max-width: none;
    margin: 14px 24px 18px;
  }
  #summary-machines {
    padding: 0 24px;
  }
  .comparison-scroll {
    max-height: min(900px, 65dvh);
    border: 0;
    border-radius: 0;
    scrollbar-gutter: stable;
  }
  .simple-table {
    min-width: calc(180px + 340px * var(--machine-count));
  }
  .matrix-axis-col {
    width: 180px;
  }
  .simple-table th,
  .simple-table td {
    padding: 20px 16px;
    border-color: var(--soft-line);
    font-size: 13px;
  }
  .simple-table thead th {
    background: var(--surface);
    z-index: 3;
  }
  .simple-table .business-axis {
    background: var(--panel);
    z-index: 2;
  }
  .simple-table thead .business-axis {
    background: var(--surface);
    z-index: 4;
  }
  .machine-heading h3 {
    font-size: 15px;
  }
  .business-title {
    font-size: 14px;
  }
  .matrix-table .business-row {
    gap: 16px;
  }
  .matrix-field::before {
    font-size: 12px;
  }
  .mean-time {
    font-size: 24px;
    line-height: 1.4;
    margin: 4px 0;
  }
  .matrix-models {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: 12px;
  }
  .model-label,
  .model-name {
    font-size: 12px;
    font-weight: 400;
  }
  .selected-spec {
    display: grid;
    gap: 3px;
  }
  /* 同图多主模型共用行轨道，长文件名换行时精度仍对应本行模型。 */
  .matrix-models {
    grid-template-rows: repeat(var(--model-rows, 2), auto);
    row-gap: 0;
  }
  .matrix-models > .matrix-field {
    display: grid;
    grid-template-rows: subgrid;
    grid-row: 1 / span var(--model-rows, 2);
  }
  .matrix-models > .matrix-field:first-child {
    grid-column: 1;
  }
  .matrix-models > .matrix-field:last-child {
    grid-column: 2;
  }
  .matrix-models .model-variant {
    display: contents;
  }
  .matrix-models .model-item {
    padding: 4px 0;
  }
  .matrix-models .model-variant + .model-variant > .model-item:first-child {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--line);
  }
  .selected-spec dt {
    margin-top: 8px;
  }
  .matrix-samples {
    justify-content: flex-start;
    gap: 8px;
  }
  .summary-evidence {
    max-height: 560px;
  }
  .summary-evidence .pad {
    padding: 16px 0;
  }
  .matrix-samples button,
  .machine-more button {
    min-height: 32px;
    font-size: 12px;
    padding: 6px 9px;
  }
  .matrix-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 24px;
  }
  #technical-details > summary,
  #task-evidence > summary {
    padding: 18px 24px;
    font-size: 16px;
    color: #dce2ec;
  }
  #technical-details > .summary {
    padding: 0 24px;
    gap: 20px;
  }
  #technical-details > .section {
    margin: 20px 24px;
  }
  .metrics .metric {
    display: block;
    min-height: 0;
    padding: 0;
  }
  .metrics {
    gap: 14px;
  }
  .worker-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 24px;
    gap: 20px;
  }
  .worker {
    background: var(--panel);
    border-radius: 14px;
    padding: 24px;
  }
  .worker dl {
    grid-template-columns: 90px minmax(0, 1fr);
    gap: 10px 14px;
    font-size: 13px;
  }
  .badge {
    background: var(--surface);
    border-color: #3a424e;
  }
  .scroll {
    scrollbar-width: thin;
    scrollbar-color: #3e4652 transparent;
  }
  #machine-groups table,
  #scenario-groups table {
    min-width: 1500px;
  }
  th,
  td {
    border-color: var(--soft-line);
  }
  td {
    font-size: 14px;
  }
  .procurement {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: 20px;
  }
  #estimate-form > .form-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .demand {
    padding: 16px 0;
    border-top: 1px solid var(--soft-line);
  }
  .result-number {
    font-size: 42px;
    font-weight: 650;
  }
  .notice {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 14px 18px;
  }
  .evidence {
    margin: 16px 24px;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 0;
  }
  .evidence > summary {
    padding: 18px 24px;
    font-size: 14px;
  }
  .evidence-content {
    padding: 0 24px 24px;
    display: grid;
    gap: 16px;
  }
  .evidence-filters {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 16px;
    padding: 0 24px 20px;
  }
  .pager {
    padding: 16px 24px;
    border-top: 1px solid var(--soft-line);
  }
  pre {
    margin: 0;
    font:
      12px/1.8 ui-monospace,
      SFMono-Regular,
      Consolas,
      monospace;
    border: 1px solid var(--soft-line);
    padding: 16px;
  }
  .output-resolution-details {
    padding: 16px;
    border: 1px solid var(--soft-line);
    border-radius: 10px;
  }
  .output-resolution-details p,
  .pad > p + p {
    margin-top: 9px;
  }
  .profile-form {
    grid-template-columns: 1fr 1fr;
  }
  .profile-form > p {
    grid-column: 1/-1;
  }
  .profile-form,
  .review-form {
    margin-top: 0;
  }
  .review-fields {
    grid-template-columns: 1fr 1fr;
  }
  .review-fields > :last-child {
    grid-column: 1/-1;
  }
  .capacity-operation {
    display: grid;
    gap: 18px;
  }
  .profile-details summary {
    color: var(--blue);
  }
  @media (min-width: 2000px) {
    h1 {
      font-size: 34px;
    }
    h2,
    .summary-toolbar h2 {
      font-size: 23px;
    }
  }
  @media (max-width: 1200px) {
    .procurement,
    .summary {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 767px) {
    main {
      padding: var(--pad);
    }
    header.page-header {
      padding: 20px;
    }
    h1 {
      font-size: 25px;
    }
    h2,
    .summary-toolbar h2 {
      font-size: 19px;
    }
    .worker-grid,
    .profile-form,
    .review-fields,
    #estimate-form > .form-grid {
      grid-template-columns: 1fr;
    }
    .evidence-filters {
      grid-template-columns: 1fr 1fr;
    }
    .summary-toolbar {
      padding: 18px 18px 0;
    }
    .summary-note {
      margin: 12px 18px;
    }
    #summary-machines {
      padding: 0 18px;
    }
    .matrix-axis-col {
      width: 110px;
    }
    .simple-table {
      min-width: calc(110px + 300px * var(--machine-count));
    }
    .simple-table th,
    .simple-table td {
      padding: 16px 12px;
    }
    .matrix-models {
      grid-template-columns: 1fr;
    }
    .comparison-scroll {
      max-height: 70dvh;
    }
    .evidence {
      margin: 12px;
    }
    .evidence-content {
      padding: 0 14px 18px;
    }
    .pad,
    .worker-grid,
    .worker {
      padding: 18px;
    }
  }
  @media (max-width: 767px) {
    .matrix-models {
      grid-template-rows: none;
      row-gap: 12px;
    }
    .matrix-models > .matrix-field {
      display: block;
      grid-column: 1;
      grid-row: auto;
    }
    .matrix-models > .matrix-field:last-child {
      grid-column: 1;
    }
    .matrix-models .model-variant {
      display: block;
    }
    .demand {
      grid-template-columns: 1fr;
    }
    .demand > button {
      grid-column: auto;
      justify-self: start;
    }
    .input-materials {
      max-width: 180px;
    }
  }
  @media (max-width: 480px) {
    .evidence-filters {
      grid-template-columns: 1fr;
    }
    .section-head {
      padding: 18px;
    }
    .tabs {
      gap: 18px;
    }
    .tabs button {
      font-size: 13px;
    }
  }
}
/* 对话框本身是作用域根，独立限定根节点高度，避免原生上下 inset 拉伸。 */
dialog.capacity-page {
  height: fit-content;
  max-height: 88dvh;
}
`,Wr=`@scope (.admin-page) {
${Fr.replace(/:root\b/g,":scope").replace(/^body \{/m,":scope {").replace(/body\.admin-page\b/g,":scope").replace(/\.admin-page\b/g,":scope")}
${Or.replace(/\.permissions-page\b/g,":scope.permissions-page")}
${Ur}
}`;function mn({page:n,children:t}){const s=Jt();return m.useLayoutEffect(()=>{const a=document.body;return a.dataset.choukaPage=n,a.dataset.workspace=n,()=>{a.dataset.choukaPage===n&&delete a.dataset.choukaPage,a.dataset.workspace===n&&delete a.dataset.workspace}},[n]),m.useEffect(()=>{let a=!0;return s.auth.me().then(()=>{if(!a)return;const r=document.getElementById("account");r&&!r.childElementCount&&s.auth.mountAccount(r);for(const i of document.querySelectorAll("#workspace-nav a"))new URL(i.href).pathname===location.pathname?i.setAttribute("aria-current","page"):i.removeAttribute("aria-current")}).catch(()=>{}),()=>{a=!1}},[s,n]),e.jsxs(e.Fragment,{children:[e.jsx("style",{children:Wr}),e.jsx($s,{page:n,workspace:!0,children:t})]})}function Kr(){return e.jsx(mn,{page:"controller",children:n=>e.jsx(ei,{...n})})}function Jr(){return e.jsx(mn,{page:"permissions",children:n=>e.jsx(yi,{...n})})}function Xr(){return e.jsx(mn,{page:"costs",children:n=>e.jsx(Ui,{...n})})}function Yr(){return e.jsx(mn,{page:"capacity",children:n=>e.jsx(Dr,{...n})})}export{Yr as CapacityWorkspace,Kr as ControllerWorkspace,Xr as CostsWorkspace,Jr as PermissionsWorkspace};
