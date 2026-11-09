import{HttpClient as Kr,reactExports as m,errorMessage as ee,jsxRuntimeExports as e,ApiError as Jr}from"./http-BHgZKsmB.js";import{createSessionService as Xr,userSchema as Yr,accountProfile as Zr,LoadingRequest as Qr,dinghaiProfileSchema as et,jsonSchema as H,useWorkspaceRuntime as nt}from"./main-DVC47TSw.js";import{object as I,number as V,boolean as J,_enum as Ke,looseObject as G,literal as ie,string as z,array as O,unknown as cr,union as me,ipv4 as rt,discriminatedUnion as tt,NEVER as at,_null as dr,record as Mn}from"./monitor-alerts-BXpxzu-0.js";import{reactDomExports as st}from"./index-BeqcATby.js";const it=I({maintenance_active:J().optional(),comfy_online:J().optional(),sandbox:J().optional()}),ot=I({online_users:V().finite().nonnegative()}),lt=I({user:Yr});function ct({fetcher:n=window.fetch.bind(window),origin:r=window.location.origin,onExpired:t,onSandbox:a,onDenied:i=()=>{}}){let s=!1;const o=async(f,u)=>{const y=await n(f,u);return s||(y.headers.get("X-H3Card-Sandbox")==="local-copy"&&a(),y.status===403&&i()),y},l=new Kr(o,r,()=>{s||t()});let p,d;const c=new Set;return{http:l,session:Xr(l),health(){if(p)return p;const f=new AbortController;c.add(f);const u=window.setTimeout(()=>f.abort(),4e3);return p=l.read("/api/health",it,{cache:"no-store",signal:f.signal}).then(y=>(!s&&y.sandbox===!0&&a(),y)).finally(()=>{window.clearTimeout(u),c.delete(f),p=void 0}),p},presence(){return d??=l.json("/api/auth/presence","POST").then(f=>ot.parse(f)).finally(()=>{d=void 0}),d},async savePhone(f){const u=f.trim();if(!/^1[3-9][0-9]{9}$/.test(u))throw new Error("请输入有效的 11 位中国大陆手机号");const y=lt.parse(await l.json("/api/auth/phone","POST",{phone:u})).user;if(!y.phone)throw new Error("手机号尚未保存，请重试");return y},async changePassword(f,u,y){if(u.length<8)throw new Error("新密码至少需要 8 位");if(u!==y)throw new Error("两次输入的新密码不一致");await l.json("/api/auth/password","POST",{current_password:f,new_password:u})},dispose(){s=!0,c.forEach(f=>f.abort()),c.clear(),l.invalidate()}}}function dt(n,r){return n.local_login_enabled!==!1&&!r&&n.phone===""}function Bn(n){return n==="admin"?null:n==="monitor"?"/monitor":"/"}function Ze(n){return n.maintenance_active!==!0?"clear":n.comfy_online===!0?"partial":"blocked"}function pt(n){const[r,t]=m.useState(null),[a,i]=m.useState(!1),[s,o]=m.useState(""),[l,p]=m.useState(0);m.useEffect(()=>{let u=!1,y=!1,j=()=>{};const w=()=>document.hidden?new Promise(x=>{const _=()=>{document.hidden&&!u||(document.removeEventListener("visibilitychange",_),x())};document.addEventListener("visibilitychange",_),j=()=>{document.removeEventListener("visibilitychange",_),x()}}):Promise.resolve(),v=()=>{u||(u=!0,h.dispose(),t(null),o("登录已失效，请重新登录"),n("/login"))},b=x=>{const _=Bn(x.role);return _?(u=!0,h.dispose(),t(null),n(_),!1):!0},h=ct({onExpired:v,onSandbox:()=>{u||i(!0)},onDenied:()=>{u||y||(y=!0,h.session.me().then(x=>{!u&&b(x.user)&&t(_=>_&&{..._,user:x.user,localTest:x.local_test===!0})}).catch(()=>{}).finally(()=>{y=!1}))}});return t(null),o(""),i(!1),(async()=>{try{const x=await h.session.me();if(u||!b(x.user)||(await w(),u))return;const _=await h.health().catch(()=>({}));u||t({user:x.user,localTest:x.local_test===!0,services:h,initialHealth:_})}catch(x){u||o(ee(x))}})(),()=>{u=!0,j(),h.dispose()}},[l,n]);const d=m.useCallback(()=>p(u=>u+1),[]),c=m.useCallback(u=>{const y=Bn(u.role);y?(r?.services.dispose(),t(null),n(y)):t(j=>j&&{...j,user:u})},[r,n]),f=m.useCallback(()=>{r?.services.dispose(),t(null),o("登录已失效，请重新登录"),n("/login")},[r,n]);return{session:r,sandbox:a,error:s,retry:d,updateUser:c,expire:f}}function mt(n,r,t=!0){const[a,i]=m.useState(null),[s,o]=m.useState(()=>Ze(r)),[l,p]=m.useState(()=>Ze(r)!=="clear");return m.useEffect(()=>{if(!t)return;let d=!0,c=Ze(r),f;const u=()=>{f=window.setTimeout(()=>{d&&p(!1)},5e3)};c==="partial"&&u();const y=()=>{document.hidden||n.presence().then(h=>{d&&i(h.online_users)}).catch(()=>{})},j=()=>{document.hidden||n.health().then(h=>{if(!d)return;const x=Ze(h);x!==c&&(c=x,window.clearTimeout(f),o(x),p(x!=="clear"),x==="partial"&&u())}).catch(()=>{})};y();const w=window.setInterval(y,3e4),v=window.setInterval(j,5e3),b=()=>{document.hidden||(y(),j())};return document.addEventListener("visibilitychange",b),()=>{d=!1,window.clearTimeout(f),window.clearInterval(w),window.clearInterval(v),document.removeEventListener("visibilitychange",b)}},[n,r,t]),{online:a,maintenance:s,maintenanceVisible:l}}const ut={dashboard:"M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1",costs:"M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2M14 11h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-2.5M12 17v1m0 -8v1",capacity:"M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14M4 20h14",permissions:"M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0M8 11v-4a4 4 0 1 1 8 0v4",teams:"M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0 -3 -3.85",refresh:"M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4",chevron:"M9 6l6 6l-6 6",external:"M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6M11 13l9 -9M15 4h5v5",logout:"M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2M9 12h12l-3 -3M18 15l3 -3",check:"M5 12l4 4l10 -10",info:"M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0 -18M12 11v6M12 7h.01",alert:"M12 9v4M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0M12 16h.01"};function We({name:n,className:r="",...t}){return e.jsx("svg",{className:`icon ${r}`,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.7,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",...t,children:e.jsx("path",{d:ut[n]})})}const ht="_application_vf13m_1",xt="_workspace_vf13m_23",ft="_sandbox_vf13m_29",gt="_navigation_vf13m_35",bt="_accountMenu_vf13m_449",yt="_infoRow_vf13m_561",vt="_dialog_vf13m_589",jt="_maintenance_vf13m_721",wt="_notifications_vf13m_817",_t="_notificationItem_vf13m_881",kt="_notificationHeading_vf13m_931",Nt="_notificationIcon_vf13m_953",St="_notificationMessage_vf13m_989",$t="_notificationLabel_vf13m_1007",se={application:ht,workspace:xt,sandbox:ft,navigation:gt,accountMenu:bt,infoRow:yt,dialog:vt,maintenance:jt,notifications:wt,notificationItem:_t,notificationHeading:kt,notificationIcon:Nt,notificationMessage:St,notificationLabel:$t},zt={error:"alert",warning:"alert",success:"check",status:"info"},Ct={error:"错误",warning:"警告",success:"成功",status:"提示"},pr=m.createContext({notify:()=>{},registerModal:()=>()=>{}}),mr=()=>m.useContext(pr);function Mt({children:n}){const[r,t]=m.useState([]),[a,i]=m.useState([]),s=m.useCallback(p=>(i(d=>[...d,p]),()=>i(d=>d.filter(c=>c!==p))),[]),o=m.useCallback(p=>{const d=typeof p=="string"?{message:p,tone:"status"}:p instanceof Error?{message:p.message,tone:"error"}:{message:p.message,tone:p.tone??"status"};t(c=>c.some(f=>f.message===d.message&&f.tone===d.tone)?c:[...c,d])},[]),l=a.at(-1)??document.body;return e.jsxs(pr.Provider,{value:{notify:o,registerModal:s},children:[n,r.length>0&&st.createPortal(e.jsx(Et,{notices:r,dismiss:p=>t(d=>d.filter(c=>c!==p)),clear:()=>t([])}),l)]})}function Et({notices:n,dismiss:r,clear:t}){const a=m.useRef(null);m.useEffect(()=>{const o=a.current;if(o?.isConnected)return o.showPopover?.(),()=>{o.isConnected&&o.hidePopover?.()}},[]);const i=o=>{const l=a.current?.contains(document.activeElement),p=a.current?.parentElement;o(),l&&queueMicrotask(()=>{(a.current?.querySelector("button")??p?.querySelector("[data-operation-status],button")??document.querySelector("main"))?.focus({preventScroll:!0})})},s=["error","warning","success","status"].find(o=>n.some(l=>l.tone===o))??"status";return e.jsxs("section",{id:"admin-notifications","data-tone":s,ref:a,popover:"manual",className:se.notifications,"aria-label":"操作通知",children:[e.jsxs("div",{className:se.notificationHeading,children:[e.jsx(We,{name:zt[s],className:se.notificationIcon}),e.jsx("strong",{children:"操作通知"}),e.jsx("button",{type:"button","aria-label":"关闭全部通知",onClick:()=>i(t),children:"全部关闭"})]}),n.map(o=>e.jsxs("div",{className:se.notificationItem,"data-tone":o.tone,children:[e.jsxs("p",{className:se.notificationMessage,role:o.tone==="error"?"alert":"status","aria-atomic":"true",children:[e.jsx("span",{className:se.notificationLabel,children:Ct[o.tone]}),o.message]}),e.jsx("button",{type:"button","aria-label":`关闭通知：${o.message}`,onClick:()=>i(()=>r(o)),children:"×"})]},`${o.tone}:${o.message}`))]})}function re({title:n,children:r,onClose:t,onSubmit:a,submitLabel:i="确认",className:s="",showFooter:o=!0,dismissible:l=!0,closeLabel:p,id:d}){const c=m.useId(),f=m.useRef(null),u=m.useRef(null),y=m.useRef(!1),j=m.useRef(!1),w=m.useRef(!1),[v,b]=m.useState(!1),[h,x]=m.useState(""),[_]=m.useState(()=>{const S=document.activeElement instanceof HTMLElement?document.activeElement:null;return{element:S,key:S?.dataset.focusKey}}),{registerModal:L}=mr();m.useLayoutEffect(()=>{const S=f.current;if(!S)return;j.current=!0;const P=_.element,g=_.key;S.showModal();const E=L(S);return document.body.classList.add("modal-open"),()=>{j.current=!1,S.querySelectorAll('input[type="password"]').forEach(C=>{C.value=""}),S.open&&S.close(),E();const q=()=>{if(document.querySelector("dialog[open]"))return;document.body.classList.remove("modal-open");const C=g?[...document.querySelectorAll("[data-focus-key]")].find(Z=>Z.dataset.focusKey===g):null,k=document.querySelector("main");k&&!k.hasAttribute("tabindex")&&(k.tabIndex=-1);const X=Z=>Z?.isConnected&&(Z.tabIndex>=0||Z.hasAttribute("tabindex")||Z.isContentEditable)&&!Z.closest("[inert],[hidden]")&&!Z.matches(':disabled,input[type="hidden"]');(X(P)?P:X(C)?C:k)?.focus({preventScroll:!0})};q(),queueMicrotask(q)}},[L,_]),m.useLayoutEffect(()=>{(v||h)&&u.current?.focus({preventScroll:!0})},[v,h]);const A=()=>{y.current||w.current||(w.current=!0,f.current?.querySelectorAll('input[type="password"]').forEach(S=>{S.value=""}),f.current?.open&&f.current.close(),t())},N=S=>{y.current&&(S.preventDefault(),S.stopPropagation())};return e.jsx("dialog",{id:d,ref:f,className:`f-operation-modal admin-dialog ${se.dialog} ${s}`,"aria-labelledby":c,tabIndex:-1,onCancel:S=>{S.preventDefault(),l&&A()},onClose:S=>{const P=S.currentTarget;if(!(!j.current||w.current||P.open)){if(y.current||!l){P.showModal(),y.current&&u.current?.focus({preventScroll:!0});return}A()}},onClick:S=>{if(S.target!==S.currentTarget||!l)return;const P=S.currentTarget.getBoundingClientRect();(S.clientX<P.left||S.clientX>P.right||S.clientY<P.top||S.clientY>P.bottom)&&A()},onKeyDown:S=>{if(S.stopPropagation(),S.key!=="Tab")return;const P=[...S.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(q=>!q.closest("[inert]")&&!q.hidden).sort((q,C)=>q.compareDocumentPosition(C)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1),g=P[0],E=P.at(-1);if(!g||!E){S.preventDefault(),u.current?.focus();return}S.shiftKey&&(document.activeElement===g||!P.includes(document.activeElement instanceof HTMLElement?document.activeElement:g))?(S.preventDefault(),E.focus()):!S.shiftKey&&(document.activeElement===E||!P.includes(document.activeElement instanceof HTMLElement?document.activeElement:E))&&(S.preventDefault(),g.focus())},children:e.jsxs("form",{"aria-busy":v||void 0,"data-busy":v?"true":void 0,onSubmit:async S=>{S.preventDefault();const P=S.currentTarget;if(!(y.current||!a||!P.reportValidity())){y.current=!0,b(!0),x("");try{await a(P),j.current&&(y.current=!1,A())}catch(g){j.current&&x(`${ee(g)}；输入已保留，可重试。`)}finally{y.current=!1,j.current&&b(!1)}}},children:[e.jsxs("header",{className:"f-dialog-head",children:[e.jsx("h2",{id:c,children:n}),l&&e.jsx("button",{type:"button",className:"close-button","data-cancel":"","aria-label":"关闭弹窗",disabled:v,onClick:A,children:"×"})]}),e.jsxs("div",{className:"f-dialog-body",children:[e.jsx("div",{"data-dialog-content":"",inert:v,onClickCapture:N,onKeyDownCapture:N,onInputCapture:N,onChangeCapture:N,children:r}),e.jsx("p",{ref:u,className:`f-status ${h?"danger":""}`,role:h?"alert":"status",tabIndex:-1,"data-operation-status":"",children:h||(v?"正在提交…":"")})]}),o&&e.jsxs("footer",{className:"f-dialog-foot",children:[e.jsx("button",{type:"button","data-cancel":"",disabled:v,onClick:A,children:p??(a?"取消":"知道了")}),a&&e.jsx("button",{type:"submit",className:"primary",disabled:v,children:v?"正在提交…":i})]})]})})}function Pt({user:n,localTest:r,services:t,expire:a}){const[i,s]=m.useState(!1),[o,l]=m.useState(null),[p,d]=m.useState({}),[c,f]=m.useState(!1),u=m.useRef(!1),y=m.useRef(null),j=m.useRef(null),w=Zr(n),v=w.display_name?.trim()||w.username||"定海用户",b=()=>{s(!1),y.current?.focus({preventScroll:!0})};return m.useLayoutEffect(()=>{const h=j.current;if(h)if(i){const x=y.current?.getBoundingClientRect();x&&d({left:Math.max(8,Math.min(x.left,window.innerWidth-Math.min(260,window.innerWidth-16)-8)),bottom:Math.max(8,window.innerHeight-x.top+8),maxHeight:Math.max(44,x.top-16)}),h.showPopover?.(),h.querySelector("button")?.focus()}else h.hidePopover?.()},[i]),m.useEffect(()=>{if(!i)return;const h=()=>s(!1),x=_=>{_.target instanceof Node&&!j.current?.contains(_.target)&&!y.current?.contains(_.target)&&h()};return window.addEventListener("resize",h),document.addEventListener("pointerdown",x),()=>{window.removeEventListener("resize",h),document.removeEventListener("pointerdown",x)}},[i]),e.jsx("div",{id:"account",className:"account-bar",children:r?e.jsx("span",{className:"chip",children:"本地测试 · 免登录"}):e.jsxs(e.Fragment,{children:[e.jsxs("button",{ref:y,className:"account-trigger",type:"button","aria-label":`用户菜单：${v}`,"aria-haspopup":"menu","aria-expanded":i,"aria-controls":"account-menu","data-focus-key":"admin-account",onClick:()=>s(h=>!h),onKeyDown:h=>{(h.key==="ArrowDown"||h.key==="ArrowUp")&&(h.preventDefault(),s(!0))},children:[e.jsx("span",{className:"account-avatar","aria-hidden":"true",children:Array.from(v)[0]?.toUpperCase()||"?"}),e.jsx("span",{className:"account-name",children:v})]}),e.jsxs("div",{ref:j,id:"account-menu",className:`account-menu ${se.accountMenu}`,role:"menu","aria-label":"账号菜单",popover:"auto",hidden:!i,style:p,onToggle:h=>{h.newState==="closed"&&s(!1)},onKeyDown:h=>{if(h.stopPropagation(),h.key==="Escape"){h.preventDefault(),b();return}if(h.key==="Tab"){s(!1);return}if(!["ArrowDown","ArrowUp","Home","End"].includes(h.key))return;h.preventDefault();const x=[...h.currentTarget.querySelectorAll('[role="menuitem"]:not(:disabled)')],_=x.findIndex(A=>A===document.activeElement),L=h.key==="Home"?0:h.key==="End"?x.length-1:(_+(h.key==="ArrowDown"?1:-1)+x.length)%x.length;x[L]?.focus()},children:[e.jsxs("div",{className:"account-menu-heading",role:"presentation",children:[e.jsx("b",{children:v}),e.jsxs("small",{children:[w.username||"未填写"," · 管理员"]})]}),e.jsx("button",{type:"button",role:"menuitem",className:"account-action",onClick:()=>{b(),l("info")},children:"用户信息"}),n.local_login_enabled===!1?e.jsx("p",{className:"auth-note",children:"密码由定海管理"}):e.jsx("button",{type:"button",role:"menuitem",className:"account-action",onClick:()=>{b(),l("password")},children:"修改密码"}),e.jsxs("button",{type:"button",role:"menuitem",className:"account-action danger",disabled:c,onClick:async()=>{if(!u.current){u.current=!0,f(!0),b();try{await t.session.logout()}catch{}finally{a()}}},children:[e.jsx(We,{name:"logout"}),"退出登录"]})]}),o==="info"&&e.jsx(re,{title:"用户信息",className:"auth-dialog",onClose:()=>l(null),closeLabel:"关闭",children:e.jsx("dl",{className:"account-info",children:[["姓名 / 花名",w.display_name?.trim()||"未填写"],["用户名",w.username||"未填写"],["手机号",w.phone||"未填写"],["角色","管理员"],["用户 ID",w.id]].map(([h,x])=>e.jsxs("div",{className:se.infoRow,children:[e.jsx("dt",{children:h}),e.jsx("dd",{children:x})]},h))})}),o==="password"&&n.local_login_enabled!==!1&&e.jsxs(re,{title:"修改密码",className:"auth-dialog",onClose:()=>l(null),submitLabel:"保存",onSubmit:async h=>{const x=new FormData(h);await t.changePassword(String(x.get("current_password")??""),String(x.get("new_password")??""),String(x.get("confirm_password")??"")),a()},children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"当前密码"}),e.jsx("input",{name:"current_password",type:"password",autoComplete:"current-password",autoFocus:!0,required:!0})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"新密码（至少 8 位）"}),e.jsx("input",{name:"new_password",type:"password",autoComplete:"new-password",required:!0,minLength:8})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"再输一次新密码"}),e.jsx("input",{name:"confirm_password",type:"password",autoComplete:"new-password",required:!0,minLength:8})]}),e.jsx("p",{className:"auth-note",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。保存后需要重新登录。"})]})]})})}const Rt=n=>window.location.replace(n);function It({page:n,children:r,workspace:t=!1}){return e.jsx(Lt,{page:n,workspace:t,children:r})}function Lt({page:n,children:r,workspace:t}){const{session:a,sandbox:i,error:s,retry:o,updateUser:l,expire:p}=pt(Rt);return!a&&!s&&t?e.jsx(Qr,{stage:"正在准备工作区"}):a?e.jsx(Mt,{children:e.jsx(Tt,{page:n,workspace:t,user:a.user,localTest:a.localTest,services:a.services,initialHealth:a.initialHealth,sandbox:i,updateUser:l,expire:p,children:r})}):e.jsx("main",{id:"main",tabIndex:-1,children:s?e.jsxs("section",{role:"alert",children:[e.jsx("p",{children:s}),e.jsx("a",{href:"/login",children:"前往登录"}),e.jsx("button",{type:"button",onClick:o,children:"重试"})]}):e.jsx("p",{role:"status",children:"正在验证管理员会话…"})})}const At=[{label:"工作区",links:[{key:"canvas",label:"画布",href:"/",icon:"dashboard"},{key:"director",label:"导演工作台",href:"/director",icon:"external"}]},{label:"管理",links:[{key:"teams",label:"项目组",href:"/teams",icon:"teams"},{key:"controller",label:"运行面板",href:"/controller",icon:"dashboard"},{key:"permissions",label:"账号与权限",href:"/admin/permissions",icon:"permissions"}]},{label:"统计",links:[{key:"costs",label:"费用评估",href:"/controller/costs",icon:"costs"},{key:"capacity",label:"产能统计",href:"/controller/capacity",icon:"capacity"}]}];function Tt({page:n,workspace:r,user:t,localTest:a,services:i,initialHealth:s,sandbox:o,children:l,updateUser:p,expire:d}){const{notify:c}=mr(),{online:f,maintenance:u,maintenanceVisible:y}=mt(i,s,!r),j=m.useRef(!1),w=m.useRef(!1);m.useEffect(()=>{if(r)return;const h=document.body,x=h.dataset.workspace,_=h.classList.contains("admin-page");return h.classList.add("admin-page"),h.dataset.workspace=n,()=>{_||h.classList.remove("admin-page"),x===void 0?delete h.dataset.workspace:h.dataset.workspace=x}},[n,r]),m.useEffect(()=>{const h=document.body.dataset.adminSandbox;return o&&(document.body.dataset.adminSandbox="local-copy"),()=>{h===void 0?delete document.body.dataset.adminSandbox:document.body.dataset.adminSandbox=h}},[o]);const v=dt(t,a);m.useEffect(()=>{v&&(w.current=!1)},[v]);const b=u==="blocked"?"系统正在维护更新，当前暂无可用执行节点，请稍后再使用。":"部分节点正在维护更新，其他可用节点仍可正常使用。";return e.jsxs("div",{className:`admin-page ${n==="permissions"?"permissions-page":""} ${se.application} ${r?se.workspace:""}`,children:[e.jsx("a",{className:"skip-link admin-skip",href:n==="capacity"?"#main-content":"#main",children:"跳到主内容"}),!r&&e.jsxs("aside",{id:"workspace-nav","data-admin-sidebar":"","aria-label":"主导航",className:se.navigation,children:[e.jsxs("a",{className:"workspace-brand",href:"/","aria-label":"Chouka 创作空间",children:[e.jsx("img",{src:"/icon.png",alt:""}),e.jsxs("span",{children:["Chouka",e.jsx("small",{children:"创作空间"})]})]}),e.jsx("nav",{className:"workspace-links","aria-label":"工作区导航",children:At.map(h=>e.jsxs("div",{className:"workspace-nav-group",role:"group","aria-label":h.label,children:[e.jsx("div",{className:"workspace-nav-label","aria-hidden":"true",children:h.label}),h.links.map(x=>e.jsxs("a",{className:"workspace-link",href:x.href,title:x.label,"aria-label":x.label,"aria-current":n===x.key?"page":void 0,children:[e.jsx(We,{name:x.icon}),e.jsx("span",{children:x.label})]},x.key))]},h.label))}),e.jsxs("div",{className:"workspace-footer",children:[e.jsxs("div",{className:"workspace-presence",title:"Chouka 系统在线用户（近 90 秒活跃，按账号去重）","aria-live":"polite",children:[e.jsx("i",{"aria-hidden":"true"}),e.jsxs("span",{children:[e.jsx("b",{children:f??"--"})," 人在线"]})]}),e.jsx(Pt,{user:t,localTest:a,services:i,expire:d})]})]}),!r&&y&&e.jsxs("div",{id:"maintenance-banner",className:se.maintenance,role:"status","aria-live":"polite","aria-atomic":"true","aria-label":"系统维护通知",children:[e.jsx("span",{className:"maintenance-banner-icon",children:e.jsx(We,{name:"alert"})}),e.jsx("div",{className:"maintenance-banner-ticker",children:e.jsx("div",{className:"maintenance-banner-track",children:[!1,!0].map(h=>e.jsx("span",{className:"maintenance-banner-message","aria-hidden":h||void 0,children:b},String(h)))})})]}),o&&e.jsx("div",{id:"sandbox-note",className:`notice-box admin-sandbox ${se.sandbox}`,role:"note",children:"本地隔离数据副本：本页用于本地验收，展示复制的业务数据，不代表正式服务的实时状态。"}),v?e.jsx("main",{id:n==="capacity"?"main-content":"main",tabIndex:-1,children:e.jsx("p",{role:"status",children:"请补充手机号后继续使用。"})}):l({http:i.http,user:t,sandbox:o,notify:c}),v&&e.jsx(re,{id:"phone-dialog",title:"补充手机号",className:"auth-dialog phone-dialog",dismissible:!1,closeLabel:"退出登录",submitLabel:"保存并继续",onClose:()=>{w.current||j.current||(j.current=!0,i.session.logout().catch(()=>{}).finally(d))},onSubmit:async h=>{const x=await i.savePhone(String(new FormData(h).get("phone")??""));w.current=!0,p(x)},children:e.jsxs(m.Fragment,{children:[e.jsx("p",{id:"phone-note",className:"auth-note",children:"当前账号尚未填写手机号，请补充后继续使用。手机号仅本人和管理员可见，不用于短信验证或登录。"}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"手机号"}),e.jsx("input",{name:"phone",type:"tel",autoFocus:!0,inputMode:"numeric",autoComplete:"tel-national",required:!0,maxLength:11,pattern:"1[3-9][0-9]{9}",placeholder:"请输入 11 位中国大陆手机号","aria-describedby":"phone-note"})]})]})})]})}const ur={idle:"空闲",busy:"运行中",syncing:"正在更新",offline:"离线",disabled:"已禁用",error:"异常",queued:"排队中",assigned:"已分配",running:"运行中",done:"已完成",canceled:"已取消",cancel_requested:"正在取消"},Dt={idle:"尚未更新",pending:"等待空闲",running:"更新并重启中",done:"更新重启完成",error:"更新重启失败"},B=n=>(typeof n=="number"||typeof n=="string")&&n!==""&&Number.isFinite(Number(n))?Number(n):null,je=n=>B(n)==null?"未获取":String(n),Ft=n=>{const r=B(n);return r==null?null:Math.max(0,Math.min(100,r))},Ce=n=>{const r=B(n);return r==null?"未记录":new Date(r*1e3).toLocaleString("zh-CN",{hour12:!1})};function En(n){const r=B(n);return r==null||r<0?"未记录":r<60?`${Math.round(r)}秒`:r<3600?`${Math.floor(r/60)}分${Math.floor(r%60)}秒`:`${Math.floor(r/3600)}小时${Math.floor(r%3600/60)}分`}function ye(n){const r=B(n);return r==null?"未采集":r>=1024**3?`${(r/1024**3).toFixed(1)} GB`:r>=1024**2?`${(r/1024**2).toFixed(0)} MB`:`${Math.round(r/1024)} KB`}const Ot=n=>["idle","done"].includes(n||"")?"ok":["busy","syncing","running","queued","assigned","cancel_requested"].includes(n||"")?"warn":["offline","disabled","error","canceled"].includes(n||"")?"bad":"",Je=n=>ur[n||""]||n||"未知",Pn=n=>{if(oe(n))return"主节点 · 无需同步";if(n.sync_action==="restart_services"||n.sync_action==="reboot_host"){const r=n.sync_action==="reboot_host"?"电脑重启":"服务重启",t=n.sync_status;return t==="pending"?`${r} · 等待节点接收`:t==="running"?`${r}中`:t==="done"?`${r}完成`:t==="error"?`${r}失败`:"未记录"}return Dt[n.sync_status||""]||n.sync_status||"未记录"},oe=n=>n.is_primary_node===!0,Me=n=>!oe(n)&&["pending","running"].includes(n.sync_status||""),Ee=n=>!oe(n)&&n.sync_status==="error",te=n=>n.state!=="offline",hr=n=>typeof n=="number"||typeof n=="string"&&n.trim()?`Worker v${n}`:"Worker 版本未知",xr=n=>hr(n.capabilities?.agent_version);function fr(n){const r=n.capabilities?.system,t=r?.comfyui_build_version?.trim(),a=r?.comfyui_version?.trim();return t?`ComfyUI ${t}`:a?`ComfyUI ${a} · 定制版本未记录`:"ComfyUI 版本未记录"}const qt=(n,r=Date.now())=>{const t=B(n?.health.server_time);return t==null||!n?r/1e3:t+(r-n.receivedAt)/1e3},Rn=(n,r)=>{const t=B(n);return t==null?"未记录":`${En(Math.max(0,r-t))}前`};function In(n,r,t){const a=B(n.capabilities?.telemetry?.collected_at);return!t&&te(n)&&a!=null&&r-a<=60&&r-a>=-10}function ln(n){return te(n)?n.enabled===!1||n.enabled===0||n.state==="disabled"?["已禁用接收","bad"]:Me(n)?[["restart_services","reboot_host"].includes(n.sync_action||"")?"维护期间不可接任务":"同步期间不可接任务","bad"]:n.comfy_online===!1||n.state==="error"?["不可接任务","bad"]:n.busy||n.current_job_id||n.state==="busy"?["正在占用","warn"]:n.state==="idle"&&n.comfy_online===!0?["可接任务","ok"]:["接收状态未知",""]:["不可接任务","bad"]}function Ln(n,r={}){const t=n.capability_comparison||{};if(r.status==="none")return{label:"未设置主节点基准",tone:"warn"};if(r.status==="ambiguous")return{label:"主节点不唯一",tone:"bad"};if(oe(n)&&t.status==="primary")return{label:"主节点基准",tone:r.status==="stale"?"warn":"ok"};const a=t.missing_models?.length||0,i=t.missing_node_classes?.length||0,s=t.extra_models?.length||0,o=t.extra_node_classes?.length||0;let l,p="warn";return t.model_inventory_status==="unknown"?(l=["模型清单未知",i?`节点不全 · 缺 ${i} 个`:""].filter(Boolean).join("；"),i&&(p="bad")):t.status==="unknown"||!t.status?l="清单未知":a||i?(l=[a?`模型不全 · 缺 ${a} 个`:"",i?`节点不全 · 缺 ${i} 个`:""].filter(Boolean).join("；"),p="bad"):t.status==="stale"?l=s||o?"节点离线 · 主节点所需齐全，存在额外清单":"节点离线 · 最后清单一致":s||o?(l=`主节点所需齐全 · ${[s?`额外 ${s} 个模型`:"",o?`额外 ${o} 个节点`:""].filter(Boolean).join("；")}`,p="ok"):(l="清单一致",p="ok"),t.status==="stale"&&(a||i)&&(l=`节点离线 · 最后清单：${l}`),r.status==="stale"&&(l=`基准离线 · ${l}`),{label:l,tone:p}}function gr(n,r){if(oe(n))return"主节点作为同步源，不参与同步";if(!te(n))return"设备已离线，请上线后重试";if(n.capabilities?.supports_code_restart!==!0)return"请先升级 Worker 及配套启动文件";if(Me(n))return"设备已有等待中或执行中的维护请求";if(r.status!=="ready")return"主节点基准不可用，请刷新后重试";const t=n.capability_comparison;return!t?.status||["unknown","stale"].includes(t.status)||t.model_inventory_status==="unknown"?"清单未知或已过期，请刷新后重试":!t.missing_models?.length&&!t.missing_node_classes?.length?"主节点所需资源齐全，无需补齐":""}function jn(n){const r=n.comparisonBaseline;if(r.status==="none")return"未设置主节点，无法比较";if(r.status==="ambiguous")return"检测到多个主节点，无法确定比较基准";const t=n.workers.find(a=>a.id===r.worker_id)?.name||r.worker_id||"未命名主节点";return`${r.status==="stale"?"主节点离线 · 最后清单":"在线主节点"} · ${t} · ${hr(r.agent_version)}`}function Xe(n){const r=n.capabilities;return r?.telemetry?.gpus?.length?r.telemetry.gpus:(r?.devices||[]).map((t,a)=>{const i=B(t.vram_total),s=B(t.vram_free);return{index:t.index??a,name:t.name||t.device_name||t.type,memory_total_bytes:i,memory_used_bytes:i!=null&&s!=null?Math.max(0,i-s):null,utilization_percent:null,temperature_c:null}})}function br(n){if(n.capabilities?.telemetry?.memory)return n.capabilities.telemetry.memory;const r=n.capabilities?.system,t=B(r?.ram_total),a=B(r?.ram_free);return{total_bytes:t,used_bytes:t!=null&&a!=null?Math.max(0,t-a):null}}const yr=(n,r)=>r.projects.find(t=>t.id===n.project)?.name||n.projectName||(n.project?"项目已删除":"未归属项目"),wn=16e3;function Ut(n,r){const t=a=>a>0&&a<n.length&&n.charCodeAt(a)>=56320&&n.charCodeAt(a)<=57343?a-1:a;return n.slice(t(r*wn),t((r+1)*wn))}const W=me([V().finite(),z().refine(n=>n===""||Number.isFinite(Number(n)))]).nullish(),T=z().nullish(),Qe=me([J(),ie(0),ie(1)]).nullish(),Wt=G({used_bytes:W,total_bytes:W}),Bt=G({index:W,name:T,utilization_percent:W,memory_used_bytes:W,memory_total_bytes:W,temperature_c:W}),Ht=G({agent_version:me([V(),z()]).nullish(),supports_code_restart:J().nullish(),supports_service_restart:J().nullish(),supports_host_reboot:J().nullish(),node_classes:O(z()).nullish(),telemetry:G({hostname:T,ip_address:z().trim().transform(n=>rt().safeParse(n).success?n:null).nullish(),collected_at:W,gpus:O(Bt).nullish(),memory:Wt.nullish()}).nullish(),devices:O(G({index:W,name:T,device_name:T,type:T,vram_total:W,vram_free:W})).nullish(),system:G({ram_total:W,ram_free:W,comfyui_version:T,comfyui_build_version:T}).nullish()}),Hn=G({name:T,node_class:T,input:T}),Vt=G({status:T,model_inventory_status:T,missing_node_classes:O(z()).nullish(),extra_node_classes:O(z()).nullish(),missing_models:O(Hn).nullish(),extra_models:O(Hn).nullish()}),Gt=G({status:T,worker_id:T,agent_version:me([V(),z()]).nullish()}),Kt=G({id:z(),name:T,state:T,enabled:Qe,comfy_online:Qe,busy:Qe,current_job_id:T,last_seen:W,is_primary_node:Qe,sync_status:T,sync_action:T,sync_message:T,capability_comparison:Vt.nullish(),capabilities:Ht.nullish()}),vr=G({id:z(),status:T,history_only:J().optional(),permission:T,modelName:T,nodeName:T,card:T,name:T,cardName:T,project:T,projectName:T,progress:W,step:T,created:W,started:W,ended:W,worker_id:T,error:T,capability:T,submitter_display_name:T,submitter_username:T}),Jt=G({ok:J().nullish(),mode:T,online_workers:W,workers:W,server_time:W,started_at:W,comfy_online:J().nullish(),jobs:W,capabilities:W,sandbox:J().nullish(),llm:G({ok:J().nullish(),model:T}).nullish()}),Xt=G({running_count:W,queued_count:W}),Yt=G({workers:O(Kt),comparison_baseline:Gt.nullish()}),Zt=G({jobs:O(vr)}),Qt=Ke(["all","queued","running","done","error","canceled"]),ea=G({jobs:O(vr),next_cursor:z().min(1).nullable(),has_more:J(),total:V().int().nonnegative()}).refine(n=>n.has_more===(n.next_cursor!==null),{message:"任务历史分页游标不完整"}),na=G({projects:O(G({id:z(),name:T}))}),ra=G({worker_count:W,primary_count:W,skipped_count:W}),ta=G({ok:ie(!0),worker_id:z().min(1),request_id:z().min(1),action:ie("sync_files")}),aa=Ke(["restart_services","reboot_host"]),sa=G({ok:ie(!0),worker_id:z().min(1),request_id:z().min(1),action:aa}),ia=G({ok:J().optional()}),gn=me([V().finite(),z().refine(n=>n!==""&&Number.isFinite(Number(n)))]).transform(Number),Vn=cr().transform(n=>(typeof n=="number"||typeof n=="string")&&n!==""&&Number.isFinite(Number(n))?Number(n):null),oa=G({worker_id:T,gpu_index:W,minutes:W,server_time:W,from:gn,to:gn,gap_seconds:gn.pipe(V().positive()),points:O(G({at:Vn,temperature_c:Vn}))}).refine(n=>n.to>n.from,{message:"温度历史返回格式不完整"});function la(n){return{async history(r,t,a){const i=new URLSearchParams({limit:"50",status:r});return t!==null&&i.set("cursor",t),n.read(`/api/jobs/history?${i}`,ea,{cache:"no-store",signal:a})},async snapshot(r,t=()=>{}){const a={cache:"no-store",signal:r},[i,s,o,l,p]=await Promise.all([n.read("/api/health",Jt,a).then(d=>(d.sandbox===!0&&!r.aborted&&t(),d)),n.read("/api/status",Xt,a),n.read("/api/workers",Yt,a),n.read("/api/jobs",Zt,a),n.read("/api/projects",na,a)]);return{health:i,status:s,workers:o.workers,comparisonBaseline:o.comparison_baseline||{status:"none"},jobs:l.jobs,projects:p.projects,receivedAt:Date.now()}},async temperature(r,t,a,i){const s=await n.read(`/api/workers/${encodeURIComponent(r)}/temperature?gpu_index=${t}&minutes=${a}`,oa,{cache:"no-store",signal:i});if(s.worker_id!=null&&s.worker_id!==r||s.gpu_index!=null&&B(s.gpu_index)!==t||s.minutes!=null&&B(s.minutes)!==a)throw new Error("温度历史与所选节点或范围不一致");return{...s,points:s.points.flatMap(o=>o.at!=null&&o.at>=s.from&&o.at<=s.to?[{...o,at:o.at,temperature_c:o.temperature_c}]:[]).sort((o,l)=>o.at-l.at)}},async deleteWorker(r,t,a){return a(),ia.parse(await n.request(`/api/workers/${encodeURIComponent(r)}`,{method:"DELETE",signal:t}))},async restartWorker(r,t,a,i){i();const s=sa.parse(await n.request(`/api/admin/workers/${encodeURIComponent(r)}/restart`,{method:"POST",signal:a,headers:{"Content-Type":"application/json"},body:JSON.stringify({action:t})}));if(s.worker_id!==r||s.action!==t)throw new Error("重启响应与所选节点或操作不一致");return s},async syncWorker(r,t,a){a();const i=ta.parse(await n.request(`/api/admin/workers/${encodeURIComponent(r)}/sync`,{method:"POST",signal:t,headers:{"Content-Type":"application/json"},body:JSON.stringify({})}));if(i.worker_id!==r)throw new Error("同步响应与所选设备不一致");return i},async syncAll(r,t){return t(),ra.parse(await n.request("/api/admin/workers/sync-all",{method:"POST",signal:r,headers:{"Content-Type":"application/json"},body:JSON.stringify({})}))}}}const Gn=n=>({filter:n,jobs:[],initialized:!1,loadedPages:0,nextCursor:null,hasMore:!1,total:null,loading:null,error:"",failedAction:null});function bn(n,r){return(B(r.created)??0)-(B(n.created)??0)||(n.id<r.id?1:n.id>r.id?-1:0)}function ca(n,r){const t=new Map(r.jobs.map(i=>[i.id,i])),a=r.jobs.reduce((i,s)=>!i||bn(s,i)>0?s:i,null);for(const i of n?.jobs||[]){const s=["queued","assigned","running","cancel_requested"].includes(i.status||"");(t.has(i.id)||s||a&&bn(i,a)<=0)&&t.set(i.id,i)}return[...t.values()].filter(i=>{const s=i.status==="assigned"?"queued":i.status==="cancel_requested"?"running":i.status;return r.filter==="all"||s===r.filter}).sort(bn)}class da{constructor(r,t=!1){this.service=r,this.state={snapshot:null,history:Gn("all"),stale:!1,loading:!1,error:"",isolated:t,mutation:null,deletingWorker:null,refreshed:0}}service;state;listeners=new Set;read=null;historyRead=null;historyEpoch=0;write=null;version=0;disposed=!1;start=()=>{this.disposed=!1,this.refreshAll()};refreshAll=()=>Promise.all([this.refresh(),this.refreshHistory()]);getSnapshot=()=>this.state;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});update(r){this.disposed||(this.state={...this.state,...r},this.listeners.forEach(t=>t()))}isolate=()=>{this.state.isolated||this.update({isolated:!0})};canMutate=()=>!this.disposed&&!!this.state.snapshot&&!this.state.stale&&!this.state.isolated&&!this.state.mutation;guard=()=>{if(this.disposed||!this.state.snapshot||this.state.stale||this.state.isolated)throw new Error("隔离副本或服务状态未就绪，禁止修改设备")};invalidateRead(){++this.version,this.read?.controller.abort(),this.read=null,this.update({loading:!1})}refresh=(r=!1)=>{if(this.disposed||this.state.mutation&&!r)return Promise.resolve();if(this.read)return this.read.promise;const t=++this.version,a=new AbortController;this.update({loading:!0});const i=this.service.snapshot(a.signal,this.isolate).then(s=>{this.disposed||a.signal.aborted||t!==this.version||this.update({snapshot:s,stale:!1,error:"",refreshed:this.state.refreshed+1,isolated:this.state.isolated||s.health.sandbox===!0})}).catch(s=>{this.disposed||a.signal.aborted||t!==this.version||(this.update({stale:!0,error:`读取中间层信息失败：${ee(s)}`}),a.abort())}).finally(()=>{t!==this.version||this.disposed||(this.read=null,this.update({loading:!1}))});return this.read={controller:a,promise:i},i};setHistoryFilter=r=>this.disposed?Promise.resolve():r===this.state.history.filter?this.refreshHistory():(++this.historyEpoch,this.historyRead?.controller.abort(),this.historyRead=null,this.update({history:Gn(r)}),this.refreshHistory());refreshHistory=()=>this.readHistory("first");loadMore=()=>this.readHistory("more");retryHistory=()=>this.readHistory(this.state.history.failedAction||"first");readHistory(r){if(this.disposed)return Promise.resolve();if(this.historyRead)return this.historyRead.promise;const t=this.state.history;if(r==="more"&&(!t.initialized||!t.hasMore))return Promise.resolve();const a=r==="more"?t.nextCursor:null,i=this.historyEpoch,s=new AbortController;this.update({history:{...t,loading:r,error:"",failedAction:null}});const o=this.service.history(t.filter,a,s.signal).then(l=>{if(this.disposed||s.signal.aborted||i!==this.historyEpoch)return;if(r==="more"&&l.has_more&&l.next_cursor===a)throw new Error("任务历史游标未推进，请重试");const p=this.state.history,d=new Map(p.jobs.map(f=>[f.id,f]));for(const f of l.jobs)d.set(f.id,f);const c=r==="first"&&p.loadedPages>1;this.update({history:{...p,jobs:[...d.values()],initialized:!0,loadedPages:r==="more"?p.loadedPages+1:Math.max(1,p.loadedPages),total:l.total,nextCursor:c?p.nextCursor:l.next_cursor,hasMore:c?p.hasMore:l.has_more}})}).catch(l=>{this.disposed||s.signal.aborted||i!==this.historyEpoch||this.update({history:{...this.state.history,error:`读取任务历史失败：${ee(l)}`,failedAction:r}})}).finally(()=>{this.disposed||s.signal.aborted||i!==this.historyEpoch||(this.historyRead=null,this.update({history:{...this.state.history,loading:null}}))});return this.historyRead={controller:s,promise:o},o}async mutate(r,t,a){if(this.guard(),this.state.mutation)throw new Error("设备操作正在执行，请稍后重试");this.invalidateRead();const i=new AbortController;this.write=i,this.update({mutation:r,deletingWorker:t});try{const s=await a(i.signal);if(i.signal.aborted||this.disposed)throw new DOMException("操作已取消","AbortError");return await this.refresh(!0),s}catch(s){throw i.signal.aborted||(this.update({error:`${r==="delete"?"删除设备":r==="restart"?"提交重启":"更新节点"}失败：${ee(s)}`}),await this.refresh(!0)),s}finally{this.write=null,this.update({mutation:null,deletingWorker:null})}}deleteWorker=r=>this.state.snapshot?.workers.some(t=>t.id===r)?this.mutate("delete",r,t=>this.service.deleteWorker(r,t,this.guard)):Promise.reject(new Error("设备已移除"));restartWorker=(r,t)=>this.state.snapshot?.workers.some(a=>a.id===r)?this.mutate("restart",null,a=>this.service.restartWorker(r,t,a,this.guard)):Promise.reject(new Error("设备已移除"));syncWorker=r=>{const t=this.state.snapshot,a=t?.workers.find(s=>s.id===r);if(!a||!t)return Promise.reject(new Error("设备已移除或被新的注册替代"));const i=gr(a,t.comparisonBaseline);return i?Promise.reject(new Error(i)):this.mutate("sync",null,s=>this.service.syncWorker(r,s,this.guard))};syncAll=()=>this.mutate("sync",null,r=>this.service.syncAll(r,this.guard));dispose=()=>{this.disposed=!0,++this.version,this.read?.controller.abort(),this.write?.abort(),++this.historyEpoch,this.historyRead?.controller.abort(),this.historyRead=null,this.read=null,this.listeners.clear()}}function pa({http:n,sandbox:r}){const t=m.useMemo(()=>la(n),[n]),a=m.useMemo(()=>new da(t),[t]),i=m.useSyncExternalStore(a.subscribe,a.getSnapshot),[s,o]=m.useState(!0),l=m.useRef(s),[p,d]=m.useState(Date.now);return m.useLayoutEffect(()=>{l.current=s},[s]),m.useLayoutEffect(()=>{r&&a.isolate()},[r,a]),m.useEffect(()=>(a.start(),a.dispose),[a]),m.useEffect(()=>{const c=()=>{document.hidden||(d(Date.now()),l.current&&a.refreshAll())},f=window.setInterval(c,5e3);return document.addEventListener("visibilitychange",c),()=>{window.clearInterval(f),document.removeEventListener("visibilitychange",c)}},[a]),{state:i,store:a,service:t,automatic:s,setAutomatic:o,clock:p}}function an({name:n}){return e.jsx("svg",{className:"icon",viewBox:"0 0 24 24","aria-hidden":"true",focusable:"false",children:n==="refresh"?e.jsxs(e.Fragment,{children:[e.jsx("path",{d:"M20 7v5h-5M4 17v-5h5"}),e.jsx("path",{d:"M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 18 17"})]}):n==="chevron"?e.jsx("path",{d:"m9 5 7 7-7 7"}):e.jsxs(e.Fragment,{children:[e.jsx("path",{d:"m12 3 10 18H2L12 3Z"}),e.jsx("path",{d:"M12 9v4m0 3v1"})]})})}function we({children:n}){return e.jsx("span",{className:"cell-secondary",children:n})}function ma({value:n,label:r}){return e.jsx("div",{className:"util-track",role:"meter","aria-label":r,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":n,children:e.jsx("i",{style:{width:`${n}%`}})})}function ua({value:n}){const r=B(n),t=Ft(r==null?null:r*100);return e.jsxs("div",{className:"utilization",children:[e.jsx("span",{children:t==null?"未采集":`${Math.round(t)}%`}),t!=null&&e.jsx(ma,{value:t,label:"任务过程进度"})]})}function jr({worker:n,snapshot:r}){const t=r.jobs.find(a=>a.id===n.current_job_id);if(t){const a=`${t.submitter_display_name?.trim()||t.submitter_username||"未记录提交人"} · ${yr(t,r)} · ${t.cardName||t.name||"未命名卡片"}`;return t.project&&t.card?e.jsx("a",{href:`/?${new URLSearchParams({project:t.project,card:t.card})}`,title:a,children:a}):e.jsx("span",{title:a,children:a})}return n.current_job_id?e.jsx(e.Fragment,{children:"任务详情暂未载入"}):Me(n)?e.jsxs(e.Fragment,{children:[Pn(n),e.jsx(we,{children:n.sync_message||"等待节点反馈"})]}):te(n)?n.busy?e.jsxs(e.Fragment,{children:["ComfyUI 本地任务",e.jsx(we,{children:"非中间层派发"})]}):e.jsx(e.Fragment,{children:ln(n)[1]==="bad"?"不接收新任务":"当前无任务"}):e.jsx(e.Fragment,{children:"非实时"})}function wr({rows:n,className:r,id:t}){return e.jsx("dl",{id:t,className:r,children:n.map(([a,i])=>e.jsx(ha,{label:a,children:i},a))})}function ha({label:n,children:r}){return e.jsxs(e.Fragment,{children:[e.jsx("dt",{children:n}),e.jsx("dd",{children:r})]})}function xa({snapshot:n,items:r,now:t,onError:a}){const i=new Map(n?.workers.map(s=>[s.id,s.name])||[]);return e.jsx(e.Fragment,{children:r.length?r.map(s=>{const o=s.modelName?.trim(),l=s.name?.trim()||s.capability?.trim()||o||"未记录",p=B(s.started),d=p==null?s.history_only?"耗时未记录":"尚未开始":s.history_only&&B(s.ended)==null?"耗时未记录":En((B(s.ended)??t)-p);return e.jsxs("tr",{children:[e.jsx("td",{className:Ot(s.status),children:Je(s.status)}),e.jsxs("td",{className:"job-origin",children:[s.submitter_display_name?.trim()||s.submitter_username||"未记录提交人",e.jsx(we,{children:n?yr(s,n):s.projectName||"项目未记录"}),e.jsxs(we,{children:["卡片 · ",s.cardName||s.name||"未命名"]})]}),e.jsxs("td",{className:"job-mode",title:s.capability||void 0,children:[l,o&&o!==l&&e.jsxs(we,{children:["模型 · ",o]}),e.jsx(we,{children:s.id})]}),e.jsxs("td",{children:[e.jsx(ua,{value:s.progress}),e.jsx(we,{children:s.step||"步骤未记录"})]}),e.jsx("td",{title:s.worker_id||void 0,children:s.nodeName?.trim()||(s.worker_id?i.get(s.worker_id)||"未知执行端":s.history_only?"未记录":"待分配")}),e.jsx("td",{children:Ce(s.created)}),e.jsx("td",{children:s.error?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"danger f-job-error",title:s.error,children:s.error}),e.jsx("button",{type:"button",className:"link-button","data-job-error":s.id,"data-focus-key":`job-error:${s.id}`,onClick:()=>a(s),children:"查看完整错误"})]}):d})]},s.id)}):e.jsx("tr",{children:e.jsx("td",{colSpan:7,children:e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"暂无已加载任务"}),e.jsx("p",{children:"可更换任务状态；历史记录的加载结果见下方状态。"})]})})})})}class fa{constructor(r,t,a,i){this.service=r,this.id=t,this.gpu=a,this.minutes=i}service;id;gpu;minutes;state={data:null,loading:!1,error:""};listeners=new Set;request=null;version=0;getSnapshot=()=>this.state;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});update(r){this.state={...this.state,...r},this.listeners.forEach(t=>t())}load=async(r=!1)=>{if(r&&this.request)return;this.request?.abort();const t=new AbortController,a=++this.version;this.request=t,this.update({loading:!0,error:"",...r?{}:{data:null}});try{const i=await this.service.temperature(this.id,this.gpu,this.minutes,t.signal);if(t.signal.aborted||a!==this.version)return;this.update({data:i})}catch(i){if(t.signal.aborted||a!==this.version)return;this.update({data:null,error:ee(i)})}finally{a===this.version&&(this.request=null,this.update({loading:!1}))}};dispose=()=>{++this.version,this.request?.abort(),this.request=null}}function ga(n,r,t){const a=n.points.flatMap(d=>d.temperature_c==null?[]:[d.temperature_c]),i=Math.floor((Math.min(...a)-5)/10)*10,s=Math.ceil((Math.max(...a)+5)/10)*10,o=49,l=r-o-20,p=t-23-45;return{x:d=>o+(d-n.from)/(n.to-n.from)*l,y:d=>23+(s-d)/(s-i)*p,width:r,height:t,left:o,pw:l}}function ba(n){const r=[];let t=null;for(const a of n.points){if(a.temperature_c==null){t=null;continue}(t==null||a.at-t>n.gap_seconds)&&r.push([]),r[r.length-1]?.push({at:a.at,temperature_c:a.temperature_c}),t=a.at}return r}function ya(n,r,t,a,i){if(a<70||i<50||!r.points.some(w=>w.temperature_c!=null))return null;const s=n.getContext("2d");if(!s)return null;const o=window.devicePixelRatio||1;n.width=Math.round(a*o),n.height=Math.round(i*o),s.setTransform(o,0,0,o,0,0),s.clearRect(0,0,a,i);const l=ga(r,a,i),{x:p,y:d,left:c,pw:f}=l,u=r.points.flatMap(w=>w.temperature_c==null?[]:[w.temperature_c]),y=Math.floor((Math.min(...u)-5)/10)*10,j=Math.ceil((Math.max(...u)+5)/10)*10;s.font='12px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',s.lineWidth=1,s.textAlign="right",s.textBaseline="middle";for(let w=0;w<=4;w++){const v=y+(j-y)*w/4,b=d(v);s.strokeStyle="#29313c",s.beginPath(),s.moveTo(c,b),s.lineTo(a-20,b),s.stroke(),s.fillStyle="#a0a6b1",s.fillText(`${Math.round(v)}°`,c-12,b)}s.textBaseline="top";for(let w=0;w<=4;w+=a<600?2:1){const v=new Date((r.from+(r.to-r.from)*w/4)*1e3),b=v.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:!1}),h=t===1440?v.toLocaleDateString("zh-CN",{month:"2-digit",day:"2-digit"})+" "+b:b;s.textAlign=w===0?"left":w===4?"right":"center",s.fillText(h,c+w/4*f,i-27)}s.strokeStyle="#38bdf8",s.lineWidth=2.3,s.lineJoin="round",s.beginPath();for(const w of ba(r))w.forEach((v,b)=>{b===0?s.moveTo(p(v.at),d(v.temperature_c)):s.lineTo(p(v.at),d(v.temperature_c))});s.stroke(),s.fillStyle="#38bdf8";for(const w of r.points)w.temperature_c!=null&&(s.beginPath(),s.arc(p(w.at),d(w.temperature_c),2.1,0,Math.PI*2),s.fill());return l}const va="_page_7ecgr_1",ja="_overview_7ecgr_1",wa="_workerGrid_7ecgr_107",_a="_workerCard_7ecgr_123",ka="_workerIdentityBlock_7ecgr_147",Na="_workerHeader_7ecgr_177",Sa="_workerService_7ecgr_179",$a="_syncMeta_7ecgr_181",za="_workerName_7ecgr_199",Ca="_workerState_7ecgr_223",Ma="_workerVersions_7ecgr_281",Ea="_resourceNote_7ecgr_283",Pa="_telemetryNote_7ecgr_285",Ra="_sectionLabel_7ecgr_287",Ia="_syncMessage_7ecgr_291",La="_workerResources_7ecgr_321",Aa="_resourceRow_7ecgr_327",Ta="_resourceReadings_7ecgr_329",Da="_resourceTitle_7ecgr_353",Fa="_resourceReading_7ecgr_329",Oa="_resourceLabel_7ecgr_405",qa="_resourceBar_7ecgr_411",Ua="_workerActivity_7ecgr_481",Wa="_workerTask_7ecgr_499",Ba="_workerSync_7ecgr_577",Ha="_inventoryAction_7ecgr_593",Va="_inventoryLabel_7ecgr_595",Ga="_syncActionLabel_7ecgr_683",Ka="_cardActions_7ecgr_705",Ja="_historyControls_7ecgr_773",Xa="_workerDialog_7ecgr_791",Ya="_workerActions_7ecgr_797",Za="_capabilities_7ecgr_813",Qa="_temperatureDialog_7ecgr_831",F={page:va,overview:ja,workerGrid:wa,workerCard:_a,workerIdentityBlock:ka,workerHeader:Na,workerService:Sa,syncMeta:$a,workerName:za,workerState:Ca,workerVersions:Ma,resourceNote:Ea,telemetryNote:Pa,sectionLabel:Ra,syncMessage:Ia,workerResources:La,resourceRow:Aa,resourceReadings:Ta,resourceTitle:Da,resourceReading:Fa,resourceLabel:Oa,resourceBar:qa,workerActivity:Ua,workerTask:Wa,workerSync:Ba,inventoryAction:Ha,inventoryLabel:Va,syncActionLabel:Ga,cardActions:Ka,historyControls:Ja,workerDialog:Xa,workerActions:Ya,capabilities:Za,temperatureDialog:Qa};function es({worker:n,workerId:r,service:t,now:a,stale:i,revision:s,onClose:o}){const l=n?Xe(n):[],[p,d]=m.useState(()=>({gpu:B(l[0]?.index)??0,minutes:30}));return e.jsx(re,{title:n?.name||r,onClose:o,className:`temperature-dialog ${F.temperatureDialog}`,showFooter:!1,children:e.jsx(ns,{worker:n,workerId:r,service:t,now:a,stale:i,revision:s,selection:p,onSelect:d})})}function ns({worker:n,workerId:r,service:t,now:a,stale:i,revision:s,selection:o,onSelect:l}){const{gpu:p,minutes:d}=o,c=m.useMemo(()=>new fa(t,r,p,d),[t,r,p,d]),f=m.useSyncExternalStore(c.subscribe,c.getSnapshot),{data:u,error:y,loading:j}=f,w=m.useRef(null),v=m.useRef(null),b=m.useRef(null),h=m.useRef(null),[x,_]=m.useState(null),L=m.useRef(s),A=n?Xe(n):[],N=A.find(C=>B(C.index)===p),S=(u?.points||[]).flatMap(C=>C.temperature_c==null?[]:[C.temperature_c]),P=n&&te(n)?In(n,a,i)?B(N?.temperature_c)??"未采集":"未采集":"非实时";m.useEffect(()=>(c.load(),c.dispose),[c]),m.useEffect(()=>{L.current!==s&&(L.current=s,c.load(!0))},[s,c]),m.useEffect(()=>{const C=w.current,k=v.current;if(!C||!k||!u)return;const X=()=>{const{width:ue,height:le}=k.getBoundingClientRect();h.current=ya(C,u,d,ue,le)},Z=requestAnimationFrame(X),ne=new ResizeObserver(X);return ne.observe(k),()=>{cancelAnimationFrame(Z),ne.disconnect(),h.current=null}},[u,d]);const g=x==null?void 0:u?.points[x],E=g?`${Ce(g.at)} · ${g.temperature_c==null?"未采集":`${g.temperature_c}°C`}`:"";m.useEffect(()=>{const C=b.current,k=h.current;!C||!k||!g||(C.style.left=`${Math.max(8,Math.min(k.width-C.offsetWidth-8,k.x(g.at)+14))}px`,C.style.top=`${Math.max(8,Math.min(k.height-C.offsetHeight-8,g.temperature_c==null?20:k.y(g.temperature_c)-45))}px`)},[g,E]);const q=[["当前温度",P],["所选时段最高",S.length?Math.max(...S):u?"未采集":"未获取"],["所选时段最低",S.length?Math.min(...S):u?"未采集":"未获取"]];return e.jsxs("div",{className:"modal-shell",children:[e.jsx("header",{className:"modal-header",children:e.jsxs("div",{children:[e.jsx("p",{className:"eyeline",children:"显卡温度趋势"}),e.jsxs("p",{className:"muted","data-temp-description":!0,children:[N?.name||"型号未记录"," / ",n?Je(n.state):"节点已移除"]})]})}),e.jsxs("div",{className:"chart-controls",children:[e.jsxs("label",{className:"inline-label",children:["显卡"," ",e.jsx("select",{"data-temp-gpu":!0,"aria-label":"选择显卡",value:p,onChange:C=>{_(null),l({...o,gpu:Number(C.target.value)})},children:A.length?A.map((C,k)=>e.jsxs("option",{value:C.index??0,children:["GPU ",C.index??0," · ",C.name||"未记录型号"]},`${C.index??k}:${k}`)):e.jsx("option",{value:0,children:"GPU 0 · 未采集配置"})})]}),e.jsx("div",{className:"segmented","data-temp-ranges":!0,"aria-label":"温度时间范围",children:[[30,"30 分钟"],[120,"2 小时"],[1440,"24 小时"]].map(([C,k])=>e.jsx("button",{type:"button","data-range":C,"aria-pressed":d===C,onClick:()=>{_(null),l({...o,minutes:C})},children:k},C))})]}),e.jsx("p",{className:"small muted",children:"仅展示真实采集记录；缺失区间不插值、不补造历史。当前温度需60秒内的新鲜遥测。"}),e.jsx("div",{className:"temperature-stats","data-temp-stats":!0,children:q.map(([C,k])=>e.jsxs("div",{className:"temperature-stat",children:[e.jsx("label",{children:C}),e.jsxs("strong",{children:[k,typeof k=="number"&&e.jsx("small",{children:" °C"})]})]},C))}),e.jsxs("div",{className:"chart-area",ref:v,children:[e.jsx("canvas",{ref:w,"data-temp-canvas":!0,hidden:!S.length,tabIndex:0,role:"img","aria-label":`GPU ${p}，${d}分钟真实温度历史，${S.length}个有效采集点；左右方向键查看。`,onPointerMove:C=>{const k=h.current;if(!k||!u?.points.length)return;const X=u.from+Math.max(0,Math.min(1,(C.clientX-C.currentTarget.getBoundingClientRect().left-k.left)/k.pw))*(u.to-u.from);_(u.points.reduce((Z,ne,ue)=>Math.abs(ne.at-X)<Math.abs((u.points[Z]?.at??ne.at)-X)?ue:Z,0))},onPointerLeave:()=>_(null),onKeyDown:C=>{!u?.points.length||!["ArrowLeft","ArrowRight","Home","End"].includes(C.key)||(C.preventDefault(),_(C.key==="Home"?0:C.key==="End"?u.points.length-1:Math.max(0,Math.min(u.points.length-1,(x??0)+(C.key==="ArrowRight"?1:-1)))))}}),e.jsx("div",{className:"empty-state","data-temp-empty":!0,hidden:S.length>0,role:"status",children:y?e.jsxs(e.Fragment,{children:[e.jsx("b",{children:"温度历史读取失败"}),e.jsx("p",{children:y}),e.jsx("button",{type:"button",onClick:()=>{_(null),c.load()},children:"重试读取"})]}):j||!u?e.jsx("b",{children:"正在读取温度历史…"}):e.jsxs(e.Fragment,{children:[e.jsx("b",{children:"暂无有效温度记录"}),e.jsx("p",{children:"未开始采集、旧版 Worker 未上报或驱动不支持；不显示 0°C。"})]})}),e.jsx("div",{ref:b,className:"chart-tooltip",hidden:!g||!S.length,role:"status",children:E})]}),e.jsxs("footer",{className:"modal-footer",children:[e.jsxs("span",{className:"chart-key",children:[e.jsx("i",{}),e.jsxs("span",{"data-temp-key":!0,children:["GPU ",p," 温度"]})]}),e.jsx("span",{"data-temp-note":!0,children:u?`${Ce(u.from)} — ${Ce(u.to)}${n&&!te(n)?" · 离线，历史非实时":""}`:""}),e.jsx("span",{className:"keyboard-hint",children:"左右键查看采集点 · Esc关闭"})]})]})}function rs({capabilities:n}){const[r,t]=m.useState(null),[a,i]=m.useState(0),s=m.useRef(null),o=m.useRef(null),l=m.useRef(new Set),p=Math.max(1,Math.ceil((r?.length||0)/wn));m.useEffect(()=>{const f=l.current;return()=>{f.forEach(u=>URL.revokeObjectURL(u)),f.clear()}},[]);const d=f=>{i(f),(f===0||f===p-1)&&o.current?.focus({preventScroll:!0}),o.current&&(o.current.scrollTop=0,o.current.scrollLeft=0)},c=()=>{if(r==null)return;const f=URL.createObjectURL(new Blob([r],{type:"application/json;charset=utf-8"}));l.current.add(f);const u=document.createElement("a");u.href=f,u.download="worker-capabilities.json",u.click()};return e.jsxs("details",{className:F.capabilities,"data-capabilities":!0,onToggle:f=>{f.currentTarget.open&&s.current==null&&(s.current=JSON.stringify(n,null,2),t(s.current))},children:[e.jsx("summary",{children:"完整能力与配置（最后上报，非实时配置证据）"}),r!=null&&e.jsxs("div",{children:[e.jsx("p",{className:"small muted",children:"按页查看完整快照；下载可获取全部 JSON，自动刷新不会改变当前快照。"}),e.jsxs("div",{className:"f-toolbar",children:[e.jsx("button",{type:"button","data-config-prev":!0,disabled:a===0,onClick:()=>d(a-1),children:"上一页"}),e.jsxs("span",{className:"small muted","data-config-page":!0,role:"status",children:["第 ",a+1," / ",p," 页"]}),e.jsx("button",{type:"button","data-config-next":!0,disabled:a===p-1,onClick:()=>d(a+1),children:"下一页"}),e.jsx("button",{type:"button","data-config-download":!0,onClick:c,children:"下载完整 JSON"})]}),e.jsx("pre",{ref:o,className:"capabilities-json",tabIndex:0,"aria-label":"当前页能力与配置",children:Ut(r,a)})]})]})}function Kn({items:n}){return n.length?e.jsx("ul",{className:"inventory-list",children:n.map((r,t)=>e.jsx("li",{children:r},`${t}:${r}`))}):e.jsx("p",{className:"muted small",children:"无"})}function Jn({items:n,unknown:r}){return r?e.jsx("p",{className:"muted small",children:"模型清单未知，无法判断"}):n.length?e.jsx("ul",{className:"inventory-list",children:n.map((t,a)=>e.jsxs("li",{children:[t.name||"未命名模型",e.jsxs("span",{children:[t.node_class||"未知节点"," · ",t.input||"未知输入"]})]},`${a}:${t.name}`))}):e.jsx("p",{className:"muted small",children:"无"})}function ts({worker:n,snapshot:r}){const t=n.capability_comparison||{},a=Ln(n,r.comparisonBaseline),i=t.model_inventory_status==="unknown",s=t.missing_node_classes||[],o=t.extra_node_classes||[],l=t.missing_models||[],p=t.extra_models||[];return["none","ambiguous"].includes(r.comparisonBaseline.status||"")||!t.status||t.status==="unknown"&&i&&!s.length&&!o.length?e.jsxs("section",{className:"inventory-audit",children:[e.jsx("h3",{children:"与主节点清单对比"}),e.jsxs("div",{className:"notice-box",children:[e.jsx("b",{className:a.tone,children:a.label}),e.jsxs("p",{children:[jn(r),"。旧版 Worker 或清单字段缺失时不会猜测为完整。"]})]})]}):e.jsxs("section",{className:"inventory-audit",children:[e.jsxs("div",{className:"inventory-heading",children:[e.jsx("h3",{children:"与主节点清单对比"}),e.jsx("span",{className:"f-chip inventory-chip","data-tone":a.tone,children:a.label})]}),e.jsxs("p",{className:"muted small",children:[jn(r),"；文件名、相对路径和版本均按精确值比较。"]}),e.jsxs("div",{className:"inventory-grid",children:[e.jsxs("div",{className:"inventory-block",children:[e.jsxs("h4",{children:["缺失节点类 ",e.jsx("span",{children:s.length})]}),e.jsx(Kn,{items:s}),e.jsxs("h4",{children:["缺失模型 ",e.jsx("span",{children:i?"未知":l.length})]}),e.jsx(Jn,{items:l,unknown:i})]}),e.jsxs("div",{className:"inventory-block",children:[e.jsxs("h4",{children:["额外节点类 ",e.jsx("span",{children:o.length})]}),e.jsx(Kn,{items:o}),e.jsxs("h4",{children:["额外模型 ",e.jsx("span",{children:i?"未知":p.length})]}),e.jsx(Jn,{items:p,unknown:i})]})]})]})}function as({worker:n,snapshot:r,now:t,stale:a,restartUnavailable:i,onRestart:s,onClose:o}){const[l,p]=m.useState(null),[d,c]=m.useState(""),f=i||(a?"服务状态已过期，请刷新后重试。":oe(n)?"主节点不支持远程重启。":te(n)?["pending","running"].includes(n.sync_status||"")?"节点已有维护操作，请等待完成。":"":"节点已离线，无法提交重启。"),u=x=>f||(n.capabilities?.[x==="reboot_host"?"supports_host_reboot":"supports_service_restart"]!==!0?"当前 Worker 不支持此操作，请先更新 Worker。":""),y=n.capabilities||{},j=y.telemetry||{},w=br(n),v=ln(n),b=Ln(n,r.comparisonBaseline),h=[["节点角色",oe(n)?"主节点（不参与文件同步）":"执行节点"],["清单状态",e.jsx("span",{className:b.tone,children:b.label})],["比较基准",jn(r)],["主机",j.hostname||"未记录"],["ComfyUI",te(n)?n.comfy_online===!0?"在线":n.comfy_online===!1?"不可用":"未获取":"非实时"],["任务接收",e.jsx("span",{className:v[1],children:v[0]})],["维护状态",Pn(n)],["维护消息",oe(n)?"此节点已排除在批量文件同步之外":n.sync_message||"未记录"],["最后心跳",`${Ce(n.last_seen)} / ${Rn(n.last_seen,t)}`],["遥测时间",`${Ce(j.collected_at)} · ${In(n,t,a)?"新鲜采集":"非实时 / 未采集"}`],["节点能力",y.node_classes?`${y.node_classes.length} 个`:"未记录"],["当前任务",e.jsx(jr,{worker:n,snapshot:r})],["系统内存",`${ye(w.used_bytes)} / ${ye(w.total_bytes)}（最后上报）`],["IP 地址",j.ip_address?.trim()||"未记录"]];return e.jsxs(e.Fragment,{children:[e.jsxs(re,{title:`${n.name||n.id} · 节点详情`,onClose:o,className:F.workerDialog,children:[e.jsxs("div",{className:F.workerActions,role:"group","aria-label":"节点重启操作",children:[e.jsx("button",{type:"button",disabled:!!u("restart_services"),title:u("restart_services")||"重启 ComfyUI 和 Worker，不重启电脑",onClick:()=>p("restart_services"),children:"重启服务"}),e.jsx("button",{type:"button",className:"danger",disabled:!!u("reboot_host"),title:u("reboot_host")||"重启节点所在的整台电脑",onClick:()=>p("reboot_host"),children:"重启节点"})]}),e.jsx("p",{className:"muted small",children:f||(n.capabilities?.supports_service_restart!==!0&&n.capabilities?.supports_host_reboot!==!0?"当前 Worker 不支持远程重启，请先更新 Worker。":"重启服务仅重启 ComfyUI 和 Worker；重启节点将重启整台电脑。节点收到请求后立即执行，会中断当前任务，不等待空闲。")}),d&&e.jsx("p",{className:"notice-box",role:"status",children:d}),e.jsxs("div",{className:"f-tags",children:[e.jsx("span",{className:"f-chip",children:Je(n.state)}),e.jsx("span",{className:"f-chip",children:xr(n)}),e.jsx("span",{className:"f-chip",children:fr(n)}),e.jsxs("span",{className:"f-chip",children:["Worker ID: ",n.id]})]}),e.jsx(wr,{rows:h,className:"f-definition"}),e.jsx(ts,{worker:n,snapshot:r}),e.jsx("div",{className:"f-grid2",children:Xe(n).map((x,_)=>e.jsxs("div",{className:"notice-box",children:[e.jsxs("b",{children:["GPU ",x.index??"未知"," · ",x.name||"未记录"]}),e.jsxs("p",{children:["最后上报：利用率"," ",B(x.utilization_percent)==null?"未采集":`${x.utilization_percent}%`,"；显存 ",ye(x.memory_used_bytes)," / ",ye(x.memory_total_bytes),"；温度"," ",B(x.temperature_c)==null?"未采集":`${x.temperature_c}°C`]})]},`${x.index??_}:${_}`))}),e.jsx(rs,{capabilities:y})]}),l&&e.jsxs(re,{title:l==="reboot_host"?"重启节点电脑":"重启节点服务",submitLabel:l==="reboot_host"?"确认重启电脑":"确认重启服务",onClose:()=>p(null),onSubmit:async()=>{const x=u(l);if(x)throw new Error(x);await s(l),c(`${l==="reboot_host"?"电脑重启":"服务重启"}请求已提交，节点收到请求后立即执行，会中断当前任务；恢复状态以节点实际回报为准。`)},children:[e.jsxs("p",{children:["目标节点：",e.jsx("strong",{children:n.name||n.id})]}),e.jsx("div",{className:"notice-box",children:l==="reboot_host"?"此操作会重启该节点所在的整台 Windows 电脑，会强制关闭程序，未保存内容可能丢失，所有服务都会暂时离线。电脑恢复后，ComfyUI 和 Worker 是否自动启动取决于该电脑的启动配置。":"此操作只重启该节点的 ComfyUI 和 Worker 服务，不会重启 Windows 电脑，不同步文件或更新代码。"}),e.jsx("p",{children:"节点收到请求后立即执行，会中断当前任务，不等待空闲；提交后暂停向该节点分配新任务。请求已接收不代表重启已完成，请查看节点维护状态。"}),l==="reboot_host"&&e.jsxs("label",{className:"check-label",children:[e.jsx("input",{type:"checkbox",required:!0}),"我确认重启整台电脑，并已处理其他程序和未保存内容"]})]})]})}function Xn(n){return n.state==="busy"||n.state==="running"?0:n.state==="idle"?1:n.state==="offline"?3:2}function ss({snapshot:n,now:r,stale:t,mutationDisabled:a,deletingWorker:i,onDetails:s,onTemperature:o,onDelete:l,onSync:p}){const d=[...n.workers].sort((c,f)=>Xn(c)-Xn(f));return e.jsx(e.Fragment,{children:d.length?d.map(c=>{const f=In(c,r,t),u=Xe(c),y=br(c),j=Je(c.state),w=ln(c),v=Ln(c,n.comparisonBaseline),b=!!(c.capability_comparison?.missing_models?.length||c.capability_comparison?.missing_node_classes?.length),h=gr(c,n.comparisonBaseline),x=te(c)?c.comfy_online===!0?"ComfyUI 在线":c.comfy_online===!1?"ComfyUI 不可用":"ComfyUI 未获取":"ComfyUI 非实时";return e.jsxs("article",{className:F.workerCard,"data-worker-card":c.id,"data-worker-state":c.state||"unknown","aria-label":c.name||c.id,children:[e.jsxs("div",{className:F.workerIdentityBlock,children:[e.jsxs("header",{className:F.workerHeader,children:[e.jsx("div",{className:F.workerName,"data-worker-name":!0,children:e.jsx("strong",{children:c.name||"未命名执行端"})}),e.jsx("span",{className:F.workerState,"data-state":c.state,children:j})]}),e.jsxs("div",{className:F.workerVersions,children:[oe(c)&&e.jsx("span",{className:"f-chip",children:"主节点"}),e.jsx("span",{children:xr(c)}),e.jsx("span",{children:fr(c)})]})]}),e.jsxs("div",{className:F.workerResources,children:[u.map((_,L)=>e.jsx(Yn,{gpu:_,ram:void 0,live:f},`${_.index??L}:${L}`)),!u.length&&e.jsx("p",{className:F.telemetryNote,children:"未采集 GPU 指标"}),e.jsx(Yn,{gpu:void 0,ram:y,live:f}),!f&&e.jsx("p",{className:F.telemetryNote,children:te(c)?"遥测未采集或已过期":"非实时，不沿用旧读数"}),e.jsxs("div",{className:F.workerService,children:[e.jsx("span",{"data-tone":c.comfy_online===!1&&te(c)?"bad":void 0,children:x}),e.jsx("span",{"data-tone":w[1],children:w[0]})]})]}),e.jsxs("div",{className:F.workerActivity,children:[e.jsxs("div",{className:F.workerTask,children:[e.jsx("span",{className:F.sectionLabel,children:"当前任务"}),e.jsx("div",{children:e.jsx(jr,{worker:c,snapshot:n})})]}),e.jsxs("div",{className:F.workerSync,children:[e.jsxs("div",{className:F.syncMeta,children:[e.jsx("span",{className:Ee(c)?"danger":"",children:Pn(c)}),e.jsxs("span",{title:c.last_seen==null?"未记录":new Date(Number(c.last_seen)*1e3).toLocaleString("zh-CN",{hour12:!1}),children:["心跳 ",Rn(c.last_seen,r)]})]}),!oe(c)&&b?e.jsxs("button",{type:"button",className:F.inventoryAction,"data-tone":v.tone,"data-sync-worker":c.id,"data-focus-key":`worker-sync:${c.id}`,"aria-label":`同步设备 ${c.name||c.id}：${v.label}`,disabled:a||!!h,title:h||"仅同步这台设备；点击查看范围并确认",onClick:()=>p(c),children:[e.jsx("span",{children:v.label}),e.jsxs("span",{className:F.syncActionLabel,children:[Me(c)?"维护中":h?"不可同步":"点击同步",e.jsx(an,{name:"chevron"})]})]}):e.jsx("span",{className:F.inventoryLabel,"data-tone":v.tone,children:v.label}),!oe(c)&&b&&h&&!Me(c)&&e.jsx("p",{className:F.syncMessage,children:h}),!oe(c)&&c.sync_message&&(Ee(c)||Me(c))&&e.jsx("p",{className:F.syncMessage,role:Ee(c)?"alert":void 0,children:c.sync_message})]})]}),e.jsxs("footer",{className:F.cardActions,children:[e.jsx("button",{type:"button",className:"link-button","data-worker":c.id,"data-focus-key":`worker-details:${c.id}`,onClick:()=>s(c),children:"节点详情"}),e.jsx("button",{type:"button",className:"link-button","data-temperature":c.id,"data-focus-key":`worker-temperature:${c.id}`,"aria-label":`查看 ${c.name||c.id} 温度趋势`,onClick:()=>o(c.id),children:"温度趋势"}),e.jsx("button",{type:"button",className:"link-button worker-delete danger","data-delete-worker":c.id,"data-focus-key":`worker-delete:${c.id}`,"aria-label":`删除设备 ${c.name||c.id}`,disabled:a,onClick:()=>l(c),children:i===c.id?"正在删除…":"删除设备"})]})]},c.id)}):e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"还没有注册执行端"}),e.jsx("p",{children:"执行端注册并上报心跳后，将在此显示状态。"})]})})}function Yn({gpu:n,ram:r,live:t}){const a=[...n?[{label:`GPU ${n.index??""} 显存`,short:"显存",used:n.memory_used_bytes,total:n.memory_total_bytes,kind:"vram"}]:[],...r?[{label:"系统内存",short:"系统内存",used:r.used_bytes,total:r.total_bytes,kind:"ram"}]:[]].map(s=>{const o=B(s.used),l=B(s.total),p=t&&o!=null&&o>=0&&l!=null&&l>0?Math.max(0,Math.min(100,o/l*100)):null;return{...s,value:p}}),i=t&&n?B(n.temperature_c):null;return e.jsx("div",{className:F.resourceRow,children:e.jsxs("div",{className:F.resourceReadings,children:[n&&e.jsxs("strong",{className:F.resourceTitle,children:[e.jsxs("span",{children:["GPU ",n.index??"未知"," · ",n.name||"未记录型号"]}),e.jsx("span",{children:i==null?"温度未采集":`${i}°C`})]}),a.map(s=>e.jsxs("div",{className:F.resourceReading,"data-resource":s.kind,role:s.value==null?void 0:"meter","aria-label":s.label,"aria-valuemin":s.value==null?void 0:0,"aria-valuemax":s.value==null?void 0:100,"aria-valuenow":s.value??void 0,"aria-valuetext":s.value==null?void 0:`${ye(s.used)} / ${ye(s.total)}，${Math.round(s.value)}%`,children:[e.jsx("span",{className:F.resourceLabel,children:s.short}),e.jsx("span",{children:t?`${ye(s.used)} / ${ye(s.total)}`:"非实时 / 未采集"}),e.jsx("b",{children:s.value==null?"—":`${Math.round(s.value)}%`}),e.jsx("div",{className:F.resourceBar,"data-resource-bar":!0,"aria-hidden":"true",children:s.value!=null&&e.jsx("i",{"data-resource-fill":!0,style:{width:`${s.value}%`}})})]},s.kind)),r&&e.jsx("span",{className:F.resourceNote,children:t?"系统可见容量":"最后配置见详情"})]})})}function is({snapshot:n,now:r,onDetails:t}){const a=n.workers.filter(i=>!te(i)||Ee(i)||["disabled","error"].includes(i.state||""));return a.length?e.jsx(e.Fragment,{children:a.map(i=>e.jsxs("button",{type:"button",className:"attention-item","data-worker":i.id,"data-focus-key":`worker-attention:${i.id}`,onClick:()=>t(i),children:[e.jsxs("span",{className:"attention-top",children:[e.jsx("strong",{className:"danger",children:i.name||i.id}),e.jsx(an,{name:"chevron"})]}),e.jsx("b",{className:"danger",children:te(i)?Ee(i)?"节点同步失败":Je(i.state):"已离线"}),e.jsx("p",{children:te(i)?Ee(i)&&i.sync_message?i.sync_message:`${ln(i)[0]}；查看完整节点详情。`:`最后心跳 ${Rn(i.last_seen,r)}`})]},i.id))}):e.jsx("p",{className:"muted small",children:"当前没有需要关注的节点异常。"})}function os(n){const{state:r,store:t,service:a,automatic:i,setAutomatic:s,clock:o}=pa(n),{snapshot:l,stale:p,loading:d,error:c,isolated:f,mutation:u,deletingWorker:y}=r,[j,w]=m.useState(null),{history:v}=r,b=v.filter,h=qt(l,Math.max(o,Date.now())),x=l?.health||{},_=l?.status||{},L=n.sandbox||f||p||!l||u!=null,A=()=>w(null),N=k=>{l&&w({kind:"worker",worker:k,snapshot:l})},S=k=>{if(n.sandbox||!t.canMutate()){n.notify({message:"当前不可更新：隔离副本或服务状态未就绪。",tone:"warning"});return}w(k)},P=()=>{if(n.sandbox||!t.canMutate())throw new Error("隔离副本或服务状态未就绪，禁止修改设备")},g=x.ok===!0?"运行正常":x.ok===!1?"异常":"状态未知",E=x.comfy_online===!0?"可用":x.comfy_online===!1?"不可用":"状态未知",q=[["运行模式",x.mode==="controller"?"Linux 中间层 / Controller":x.mode==="local"?"Windows 单机":x.mode||"未获取"],["可用能力",B(x.capabilities)==null?"未获取":`${x.capabilities} 项`],["任务记录",B(x.jobs)==null?"未获取":`${x.jobs} 条`],["大模型接口",x.llm?x.llm.ok?`已配置 · ${x.llm.model||"型号未记录"}`:"未配置":"未获取"],["页面地址",location.origin+"/controller"],["创作画布",location.origin+"/"]],C=ca(l,v);return e.jsxs("main",{id:"main",className:F.page,tabIndex:-1,"aria-busy":d?!0:void 0,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"运行面板"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{className:"subtitle",id:"service-subtitle",children:l?`中间层${g} / ComfyUI ${E}`:"正在读取中间层运行状态"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{className:"muted small",id:"refresh-state",role:"status",children:d?"正在读取…":p?"连接失败 · 快照非实时":l?`最后刷新 ${new Date(l.receivedAt).toLocaleTimeString("zh-CN",{hour12:!1})}`:"正在加载…"}),e.jsxs("label",{className:"check-label",children:[e.jsx("input",{id:"auto-refresh",type:"checkbox",checked:i,onChange:k=>s(k.target.checked)}),"每5秒刷新"]}),e.jsxs("button",{type:"button",className:"primary",id:"refresh",disabled:d||u!=null,onClick:()=>{t.refreshAll()},children:[e.jsx(an,{name:"refresh"}),"立即刷新"]}),e.jsx("button",{type:"button",id:"sync-all",disabled:L,title:n.sandbox||f?"本地隔离数据副本禁止节点同步，不能修改正式机器。":void 0,onClick:()=>S({kind:"sync"}),children:"一键更新全部节点"})]})]}),e.jsxs("div",{id:"error",className:"f-error",role:"alert",hidden:!c,children:[e.jsxs("div",{children:[e.jsx("b",{id:"error-message",children:c}),e.jsx("p",{children:"已载入内容仅为上次快照，不能作为实时状态；未知数据不记为零。"})]}),e.jsx("button",{type:"button",id:"retry",disabled:d||u!=null,onClick:()=>{t.refreshAll()},children:"重试读取"})]}),e.jsxs("section",{className:`metrics f-metrics6 ${F.overview}`,"aria-label":"运行概览",children:[e.jsx(ke,{id:"service",label:"中间层服务",value:x.ok===!0?"运行正常":x.ok===!1?"异常":"未获取",compact:!0,tone:x.ok===!0?"ok":x.ok===!1?"bad":"",noteId:"service-mode",note:x.mode==="controller"?"Controller 模式":x.mode==="local"?"Windows 单机":x.mode||"等待服务响应"}),e.jsx(ke,{id:"workers",label:"在线执行端",value:l?`${je(x.online_workers)} / ${je(x.workers)}`:"未获取",note:"含禁用与同步中的在线节点"}),e.jsx(ke,{id:"running",label:"正在运行",value:je(_.running_count),note:"由中间层调度的任务"}),e.jsx(ke,{id:"queued",label:"排队任务",value:je(_.queued_count),note:"等待可用执行端"}),e.jsx(ke,{id:"comfy",label:"ComfyUI",value:x.comfy_online===!0?"可用":x.comfy_online===!1?"不可用":"未获取",compact:!0,tone:x.comfy_online===!0?"ok":x.comfy_online===!1?"bad":"",note:"单节点状态见下方卡片"}),e.jsx(ke,{id:"uptime",label:"服务运行时间",value:B(x.started_at)!=null&&B(x.server_time)!=null?En(Number(x.server_time)-Number(x.started_at)):"未获取",compact:!0,note:"本次中间层服务启动至今"})]}),e.jsxs("div",{className:"dashboard-grid",children:[e.jsxs("section",{className:"card","aria-labelledby":"workers-title",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"workers-title",children:"Windows 执行端"}),e.jsx("p",{className:"section-subtitle",children:"设备资源、当前任务与同步状态"})]}),e.jsx("span",{className:"muted small",id:"worker-count",children:l?`${l.workers.length} 台 / ${l.workers.filter(te).reduce((k,X)=>k+Xe(X).length,0)} 张在线GPU`:"正在读取"})]}),e.jsx("div",{id:"worker-rows",className:F.workerGrid,children:l?e.jsx(ss,{snapshot:l,now:h,stale:p,mutationDisabled:L,deletingWorker:y,onDetails:N,onTemperature:k=>w({kind:"temperature",id:k}),onDelete:k=>S({kind:"delete",worker:k}),onSync:k=>S({kind:"syncWorker",worker:k})}):e.jsx("p",{className:"loading-note",children:c?"执行端读取失败，请点击“重试读取”。":"正在读取执行端…"})}),e.jsx("p",{className:"table-note",children:"显存与内存分条显示，多显卡逐卡列出，系统内存不重复。离线或过期读数不作实时数据。点击清单差异可仅同步该设备。"})]}),e.jsxs("aside",{className:"right-column","aria-label":"需要关注及配置",children:[e.jsxs("section",{className:"card",children:[e.jsx("div",{className:"section-heading",children:e.jsxs("h2",{className:"heading-inline",children:[e.jsx("span",{className:"danger",id:"attention-icon",children:e.jsx(an,{name:"alert"})}),"需要关注"]})}),e.jsx("div",{className:"attention-list",id:"attention-list",tabIndex:0,role:"region","aria-label":"需要关注的节点列表",children:l?e.jsx(is,{snapshot:l,now:h,onDetails:N}):e.jsx("p",{className:"muted small",children:c?"节点状态未获取，不能判断是否存在异常。":"正在读取节点状态…"})})]}),e.jsxs("section",{className:"card",children:[e.jsx("div",{className:"section-heading",children:e.jsx("h2",{children:"服务配置摘要"})}),e.jsx(wr,{id:"config-rows",className:"f-config-definition",rows:q})]})]})]}),e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"最近任务"}),e.jsx("p",{className:"section-subtitle",children:"数据库历史按时间倒序分批加载；实时任务优先显示，归档未记录的信息不作推测"})]}),e.jsxs("label",{className:"filter-label",children:["任务状态",e.jsxs("select",{id:"jobs-filter",value:b,onChange:k=>{const X=Qt.safeParse(k.target.value);X.success&&t.setHistoryFilter(X.data)},children:[e.jsx("option",{value:"all",children:"全部状态"}),["running","queued","done","error","canceled"].map(k=>e.jsx("option",{value:k,children:ur[k]},k))]})]})]}),e.jsx("div",{className:"table-wrap f-job-scroll",role:"region","aria-label":"最近任务列表","aria-describedby":"job-note","aria-busy":!!v.loading,tabIndex:0,onScroll:k=>{const{scrollHeight:X,scrollTop:Z,clientHeight:ne}=k.currentTarget;X-Z-ne<=160&&!v.error&&t.loadMore()},children:e.jsxs("table",{className:"jobs-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["状态","姓名 / 项目 / 卡片","模式","过程进度 / 步骤","执行端","创建时间","耗时 / 错误"].map(k=>e.jsx("th",{scope:"col",children:k},k))})}),e.jsx("tbody",{id:"job-rows",children:e.jsx(xa,{snapshot:l,now:h,items:C,onError:k=>w({kind:"job",job:k})})})]})}),e.jsxs("div",{className:F.historyControls,children:[e.jsxs("p",{className:"table-note",id:"job-note",role:"status","aria-live":"polite",children:[v.loading?v.loading==="more"?"正在加载更多历史…":"正在刷新任务历史…":v.initialized?v.hasMore?"向下滚动或点击加载更多。":"历史记录已加载完毕。":"任务历史尚未载入。",` 当前筛选历史共 ${v.total??"未知"} 条，已加载 ${v.jobs.length} 条；合并实时任务后显示 ${C.length} 条。`]}),v.error&&e.jsx("p",{role:"alert",children:v.error}),v.error?e.jsx("button",{type:"button",disabled:!!v.loading,onClick:()=>{t.retryHistory()},children:"重试任务历史"}):e.jsx("button",{type:"button","aria-controls":"job-rows",disabled:!!v.loading||!v.hasMore,onClick:()=>{t.loadMore()},children:"加载更多历史"})]})]})]}),j?.kind==="worker"&&e.jsx(as,{worker:l?.workers.find(k=>k.id===j.worker.id)||j.worker,snapshot:l||j.snapshot,now:h,stale:p,restartUnavailable:n.sandbox||f?"隔离副本禁止重启真实设备。":u!=null?"设备操作正在提交，请稍候。":!l||p?"服务状态未就绪，请刷新后重试。":l.workers.some(k=>k.id===j.worker.id)?"":"该设备已移除或已被新的注册替代。",onRestart:async k=>{P(),await t.restartWorker(j.worker.id,k)},onClose:A}),j?.kind==="temperature"&&e.jsx(es,{workerId:j.id,worker:l?.workers.find(k=>k.id===j.id),service:a,now:h,stale:p,revision:r.refreshed,onClose:A}),j?.kind==="job"&&e.jsxs(re,{title:"任务错误详情",onClose:A,children:[e.jsxs("p",{children:["任务 ",j.job.id]}),e.jsx("pre",{children:j.job.error||"未记录错误详情"}),e.jsxs("details",{children:[e.jsx("summary",{children:"任务执行记录"}),e.jsx("pre",{children:JSON.stringify(j.job,null,2)})]})]}),j?.kind==="syncWorker"&&e.jsxs(re,{title:"同步单台设备",onClose:A,submitLabel:"确认同步此设备",onSubmit:async()=>{P(),await t.syncWorker(j.worker.id),n.notify({message:`同步请求已提交至“${j.worker.name||j.worker.id}”，等待设备空闲后执行；完成情况以节点反馈为准。`,tone:"success"})},children:[e.jsxs("p",{children:["仅同步这一台设备“",j.worker.name||j.worker.id,"”（",j.worker.id,"），不更新其他设备。"]}),e.jsx("div",{className:"notice-box",children:"设备空闲后同步主节点的 ComfyUI 核心、models 和 user，拉取 chouka 最新代码，再按本机 GPU 启动配置重启 ComfyUI 与 Worker，不重启 Windows。同步会复制或覆盖对应文件，并非仅补齐缺失项；不会清除设备上的全部额外资源。"}),e.jsx("p",{children:"忙碌时等待当前任务结束，不立即中断任务。请求提交不代表同步已完成；同步结束后需重新采集清单核对。"})]}),j?.kind==="sync"&&e.jsxs(re,{title:"更新全部节点",onClose:A,submitLabel:"确认更新",onSubmit:async()=>{P();const k=await t.syncAll();n.notify({message:`已向 ${je(k.worker_count)} 个节点下发更新请求；主节点跳过 ${je(k.primary_count)} 个，旧版跳过 ${je(k.skipped_count)} 个。`,tone:"success"})},children:[e.jsx("p",{children:"确认更新全部节点？"}),e.jsx("div",{className:"notice-box",children:"节点空闲后依次同步 ComfyUI 核心、models 和 user，拉取 chouka 最新代码，再按本机 GPU 启动配置重启 ComfyUI 与 Worker。全部服务恢复就绪后才显示完成。忙碌节点等待当前任务结束；离线节点下次上线后执行。主节点作为同步源不会参与更新；旧版节点会跳过，需先手动更新一次 Worker 及配套启动文件。"}),e.jsx("p",{className:"muted small",children:"这是实际节点更新和服务重启操作，确认后将向中间层提交请求。"})]}),j?.kind==="delete"&&e.jsxs(re,{title:"删除设备",onClose:A,submitLabel:"确认删除设备",onSubmit:async()=>{P(),await t.deleteWorker(j.worker.id),n.notify({message:"设备已删除，历史任务和账单保留。",tone:"success"})},children:[e.jsxs("p",{children:["确认删除设备“",j.worker.name||"未命名执行端","”？"]}),e.jsx("div",{className:"notice-box",children:"设备会从列表中移除，历史任务和账单不会删除。设备后续重新注册时会重新出现。"})]})]})}function ke({id:n,label:r,value:t,note:a,noteId:i,compact:s=!1,tone:o=""}){return e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:r}),e.jsx("p",{className:`metric-value${s?" compact":""}${o?` ${o}`:""}`,id:n,children:t}),e.jsx("p",{className:"metric-note",id:i,children:a})]})})}const qe=me([z().min(1),V().finite()]).transform(String),Le=Ke(["user","admin","monitor"]),Be=Ke(["read","operate"]),ls=I({id:qe,username:z(),display_name:z().nullish(),phone:z().nullish(),role:Le,enabled:J(),team_leader:J().default(!1),approval_status:z().optional(),local_login_enabled:J().optional(),dinghai_identity:et.optional()}),cs=I({id:z().min(1),name:z().nullish(),owner_id:qe,owner_username:z().nullish(),owner_display_name:z().nullish(),team_id:z().nullish(),team_name:z().nullish()}),Zn=me([I({scope:ie("all"),viewer_id:qe,permission:Be}),I({scope:ie("owner").optional(),viewer_id:qe,owner_id:qe.refine(n=>n!=="*","无效所有者"),permission:Be})]),ds=I({requests:O(I({username:z(),display_name:z().nullish(),status:z(),created_at:V().nullish(),decided_by:z().nullish()})),outbox:I({pending:V().int().nonnegative(),oldest_at:V().nullish()}).nullish()}),_r={admin:"管理员",user:"普通用户",monitor:"监控展示员"},sn={approved:"已通过",pending:"待审批",rejected:"已拒绝"},nn="全部个人和项目组画布，包括现有及未来新增画布",kr="画布内容和历史费用不变。新所有者的授权访问者将获得相应权限（可操作包含删除）；原所有者及其授权访问者可能失去访问权限。管理员仍可访问全部画布。项目组画布由成员关系授权，不能改为个人归属。";function He(n){return(n?.username||"未知账号")+(n?.display_name?.trim()?`（${n.display_name.trim()}）`:"")}function pe(n,r){return`${He(n.find(t=>t.id===r))}（ID: ${r}）`}function _n(n,r){const t=r.find(a=>a.id===n.owner_id);return He({username:n.owner_username||t?.username,display_name:n.owner_display_name||t?.display_name})}function kn(n){return n==="operate"?"可操作（含删除）":"只读"}function Nr(n){return n?new Date(n*1e3).toLocaleString("zh-CN",{hour12:!1}):"—"}const he=z().min(1).max(512).refine(n=>n!=="*","无效账号 ID"),Sr=z().min(8,"密码至少 8 位").max(1024),ps=I({username:z().trim().min(1,"请输入账号名").max(128),password:Sr,role:Le,team_leader:J()}).refine(n=>n.role!=="monitor"||!n.team_leader,"监控展示员不能担任组长"),ms=tt("scope",[I({scope:ie("all"),viewer_id:he,permission:Be}),I({scope:ie("owner"),viewer_id:he,owner_id:he,permission:Be}).refine(n=>n.viewer_id!==n.owner_id,"访问者和所有者不能是同一个账号。")]),us=I({owner_id:he,projects:O(I({project_id:z().min(1).max(512),owner_id:he})).min(1,"请选择画布").max(1e3,"每次最多分配 1000 个画布")}).refine(n=>new Set(n.projects.map(r=>r.project_id)).size===n.projects.length,"画布分配清单存在重复项"),hs=I({role:Le.optional(),enabled:J().optional(),team_leader:J().optional(),display_name:z().trim().min(1,"请输入本地姓名 / 花名").max(64).optional(),phone:z().regex(/^(?:1[3-9]\d{9})?$/,"请输入有效的 11 位手机号，或留空清除").optional()}).strict().refine(n=>Object.values(n).some(r=>r!==void 0),"请选择修改内容"),Qn=I({}).passthrough(),er=n=>`/api/admin/global-grants/${encodeURIComponent(he.parse(n))}`,nr=n=>`/api/admin/users/${encodeURIComponent(he.parse(n))}`;function xs(n){const r=async(t,a,i)=>{Qn.parse(await n.json(t,a,i))};return{async snapshot(t){const a={signal:t,cache:"no-store"},[i,s,o]=await Promise.all([n.read("/api/admin/users",I({users:O(ls)}),a),n.read("/api/admin/grants",I({grants:O(Zn)}),a),n.read("/api/projects",I({projects:O(cs)}),a)]);return{users:i.users,grants:s.grants,projects:o.projects}},dispatchPriority:t=>n.read("/api/admin/dispatch-priority",I({enabled:J()}),{signal:t,cache:"no-store"}),setDispatchPriority:t=>r("/api/admin/dispatch-priority","PUT",{enabled:J().parse(t)}),registrations:t=>n.read("/api/admin/registrations",ds,{signal:t,cache:"no-store"}),create:t=>r("/api/admin/users","POST",ps.parse(t)),update:(t,a)=>r(nr(t),"PATCH",hs.parse(a)),resetPassword:(t,a)=>r(`${nr(t)}/password`,"POST",{password:Sr.parse(a)}),saveGrant:t=>{const a=ms.parse(t);return a.scope==="all"?r(er(a.viewer_id),"PUT",{permission:a.permission}):r("/api/admin/grants","PUT",{viewer_id:a.viewer_id,owner_id:a.owner_id,permission:a.permission})},async revokeGrant(t){const a=Zn.parse(t),i=a.scope==="all"?er(a.viewer_id):`/api/admin/grants/${encodeURIComponent(he.parse(a.viewer_id))}/${encodeURIComponent(he.parse(a.owner_id))}`;Qn.parse(await n.request(i,{method:"DELETE"}))},async assign(t){const a=await n.json("/api/admin/projects/assign","POST",us.parse(t));return I({count:V().int().nonnegative()}).parse(a).count}}}function ge(n,r){const t=new FormData(n).get(r);if(typeof t!="string")throw new Error("表单字段不正确："+r);return t}function fs(n,r,t){const a=r.trim().toLowerCase();return n.filter(i=>(!t||i.owner_id===t)&&(!a||(i.name||"").toLowerCase().includes(a)||i.id.toLowerCase().includes(a)))}function gs(n,r){const t=n.filter(i=>!i.team_id),a=t.filter(i=>r.has(i.id)).length;return{personal:t,checked:t.length>0&&a===t.length,indeterminate:a>0&&a<t.length}}function bs(n,r,t,a){const i=n.find(s=>s.id===r);if(!i||i.role==="monitor"||t!=="*"&&!n.some(s=>s.id===t))throw new Error("请选择有效账号和授权范围。");if(r===t)throw new Error("访问者和所有者不能是同一个账号。");return t==="*"?{scope:"all",viewer_id:r,permission:a}:{scope:"owner",viewer_id:r,owner_id:t,permission:a}}function ys(n,r,t,a){const i=n.find(o=>o.id===a&&o.enabled&&o.role!=="monitor");if(!i)throw new Error("请选择有效的启用目标账号。");if(!t.size)throw new Error("请选择个人画布。");if(t.size>1e3)throw new Error("每次最多分配 1000 个画布，请缩小筛选范围后再选择。");const s=r.filter(o=>t.has(o.id));if(s.length!==t.size||s.some(o=>o.team_id))throw new Error("选择包含项目组画布或已变化的画布，请刷新后重新选择。");return{target:i,chosen:s.map(o=>({...o})),payload:{owner_id:i.id,projects:s.map(o=>({project_id:o.id,owner_id:o.owner_id}))}}}function vs({http:n,notify:r}){const t=m.useMemo(()=>xs(n),[n]),[a,i]=m.useState({users:[],projects:[],grants:[]}),[s,o]=m.useState(null),[l,p]=m.useState(null),[d,c]=m.useState(""),[f,u]=m.useState(!1),[y,j]=m.useState(!0),[w,v]=m.useState(!1),[b,h]=m.useState(""),[x,_]=m.useState("正在加载真实数据…"),[L,A]=m.useState(new Set),[N,S]=m.useState(""),P=m.useRef(!1),g=m.useRef(!1),E=m.useRef(!1),q=m.useRef(0),C=m.useRef(null),k=m.useRef(r);m.useEffect(()=>{k.current=r},[r]);const X=m.useCallback(async()=>{if(P.current)return;P.current=!0;const ue=++q.current,le=new AbortController;C.current=le;const fe=()=>E.current&&q.current===ue;j(!0),_("正在加载真实数据…");try{const[Fe,Ye]=await Promise.all([t.snapshot(le.signal),t.dispatchPriority(le.signal)]);if(!fe())return;o(Ye.enabled),i(Fe),u(!0),A(new Set);try{const fn=await t.registrations(le.signal);if(!fe())return;p(fn),c("")}catch(fn){if(!fe())return;p(null);const Wn="注册申请信息加载失败："+ee(fn);c(Wn),k.current({message:Wn,tone:"error"})}fe()&&_("更新于 "+new Date().toLocaleTimeString("zh-CN",{hour12:!1}))}catch(Fe){if(!fe())return;throw u(!1),_("加载失败，请刷新重试"),Fe}finally{fe()&&(P.current=!1,j(!1))}},[t]),Z=m.useCallback(async()=>{if(!(g.current||P.current)){h("");try{await X()}catch(ue){if(!E.current)return;const le=ee(ue);h(le),k.current({message:le,tone:"error"})}}},[X]);return m.useEffect(()=>(E.current=!0,Z(),()=>{E.current=!1,C.current?.abort(),P.current=!1}),[Z]),{...a,dispatchPriority:s,service:t,registrations:l,registrationError:d,ready:f,loading:y,mutationBusy:w,error:b,setError:h,refreshNote:x,selected:L,setSelected:A,assignStatus:N,setAssignStatus:S,refreshPage:Z,mutate:async(ue,le,fe)=>{if(g.current||P.current||!f)throw new Error("另一项操作正在提交或列表尚未就绪，请稍后重试。");g.current=!0,v(!0),h("");try{if(await ue(),!E.current)return;fe?.(),k.current({message:le,tone:"success"});try{await X()}catch(Fe){if(!E.current)return;const Ye="操作已成功，但列表刷新失败，请点击刷新数据后继续："+ee(Fe);h(Ye),k.current({message:Ye,tone:"warning"})}}finally{g.current=!1,E.current&&v(!1)}}}}function $r({initial:n="user",onChange:r}){return e.jsxs("label",{className:"field",children:["角色",e.jsx("select",{name:"role",defaultValue:n,onChange:t=>r?.(Le.parse(t.currentTarget.value)),children:["user","admin","monitor"].map(t=>e.jsx("option",{value:t,children:_r[t]},t))})]})}function js({user:n}){return e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"notice-box",children:"仅编辑本地资料，不修改账号名、内部用户 ID 或定海验证资料。定海资料由定海维护。"}),e.jsxs("label",{className:"field",children:["本地姓名 / 花名",e.jsx("input",{name:"display_name",defaultValue:n.display_name||"",required:!0,maxLength:64})]}),e.jsxs("label",{className:"field",children:["本地手机号",e.jsx("input",{name:"phone",type:"tel",defaultValue:n.phone||"",maxLength:11,pattern:"1[3-9][0-9]{9}",autoComplete:"tel-national"})]}),e.jsx("p",{className:"auth-note",children:"手机号非空时须为有效的 11 位号码；留空可清除。"})]})}function zr(){return e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"field",children:["新密码（至少 8 位）",e.jsx("input",{name:"password",type:"password",minLength:8,maxLength:1024,autoComplete:"new-password",required:!0})]}),e.jsx("p",{className:"notice-box",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。密码不会显示在列表中。"})]})}function ws(){const[n,r]=m.useState("user"),[t,a]=m.useState(!1);return e.jsxs("div",{id:"create",className:"form-grid",children:[e.jsxs("label",{className:"field",children:["账号名",e.jsx("input",{name:"username",required:!0,maxLength:128,autoComplete:"off"})]}),e.jsx(zr,{}),e.jsx($r,{onChange:i=>{r(i),i==="monitor"&&a(!1)}}),e.jsxs("label",{className:"check-label",children:[e.jsx("input",{name:"team_leader",type:"checkbox",checked:t,disabled:n==="monitor",onChange:i=>a(i.currentTarget.checked)}),"独立授予组长权限"]}),e.jsx("p",{className:"notice-box",children:"创建后账号启用并标记为已通过。监控展示员不能担任组长，密码由管理员重置；其他账号登录后可自行修改。"})]})}const _s="_accountIdentity_174mt_1",ks="_dinghaiIdentity_174mt_15",Ns="_priority_174mt_57",Ss="_track_174mt_93",$s="_thumb_174mt_117",ze={accountIdentity:_s,dinghaiIdentity:ks,priority:Ns,switch:"_switch_174mt_73",track:Ss,thumb:$s};function Ae({name:n,id:r,idLabel:t="ID"}){return e.jsxs("span",{className:"perm-identity",children:[e.jsx("span",{className:"perm-username",children:n}),e.jsxs("span",{className:"perm-user-id",children:[t,": ",r]})]})}function cn({columns:n,children:r}){return e.jsx("tr",{children:e.jsx("td",{colSpan:n,children:r})})}function zs({users:n,busy:r,ready:t,action:a}){return e.jsx("div",{className:"table-wrap accounts-scroll",tabIndex:0,role:"region","aria-label":"账号列表",children:e.jsxs("table",{className:"accounts-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["账号 / ID","本地姓名 / 花名","本地手机号","角色","独立组长权限","启用状态","审批","操作"].map(i=>e.jsx("th",{scope:"col",children:i},i))})}),e.jsxs("tbody",{id:"users",children:[n.map(i=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsxs("div",{className:ze.accountIdentity,children:[e.jsx("span",{children:i.local_login_enabled===!1?"定海账号":i.dinghai_identity?"本地账号 · 已绑定定海":"本地账号"}),e.jsx(Ae,{name:i.username,id:i.id,idLabel:"内部用户 ID"}),i.dinghai_identity&&e.jsxs("dl",{className:ze.dinghaiIdentity,"aria-label":"定海验证资料（由定海维护）",children:[e.jsxs("div",{children:[e.jsx("dt",{children:"资料来源"}),e.jsx("dd",{children:"定海验证 · 由定海维护"})]}),[["定海用户名",i.dinghai_identity.username],["定海姓名 / 花名",i.dinghai_identity.display_name],["定海手机号",i.dinghai_identity.phone],["定海 ID",i.dinghai_identity.id]].map(([s,o])=>e.jsxs("div",{children:[e.jsx("dt",{children:s}),e.jsx("dd",{children:o||"未填写"})]},s))]})]})}),e.jsx("td",{children:i.local_login_enabled===!1?"—":i.display_name||"—"}),e.jsx("td",{children:i.local_login_enabled===!1?"—":i.phone||"未填写"}),e.jsx("td",{children:e.jsx("span",{className:"f-chip "+(i.role==="admin"?"admin":""),children:_r[i.role]})}),e.jsx("td",{children:i.team_leader?"是":"否"}),e.jsx("td",{children:e.jsx("span",{className:"f-chip "+(i.enabled?"on":"off"),children:i.enabled?"启用":"已停用"})}),e.jsx("td",{children:Object.hasOwn(sn,i.approval_status||"")?sn[i.approval_status||""]:"—"}),e.jsx("td",{children:e.jsxs("div",{className:"row-actions",children:[e.jsx("button",{type:"button",className:i.enabled?"danger":"",disabled:r,onClick:()=>a(i,"enabled"),children:i.enabled?"停用":"启用"}),e.jsx("button",{type:"button",disabled:r,onClick:()=>a(i,"role"),children:"修改角色"}),i.role!=="monitor"&&e.jsx("button",{type:"button",disabled:r,onClick:()=>a(i,"leader"),children:i.team_leader?"取消组长权限":"设为组长"}),i.local_login_enabled===!1?e.jsx("span",{children:"密码由定海管理"}):e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",disabled:r,onClick:()=>a(i,"profile"),children:"编辑资料"}),e.jsx("button",{type:"button",disabled:r,onClick:()=>a(i,"password"),children:"重置密码"})]})]})})]},i.id)),!n.length&&e.jsx(cn,{columns:8,children:t?"暂无账号。":"正在加载账号…"})]})]})})}function Cs({data:n,error:r}){return e.jsx("div",{className:"table-wrap registrations-scroll",tabIndex:0,role:"region","aria-label":"注册申请列表",children:e.jsxs("table",{className:"registration-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["账号","姓名 / 花名","状态","申请时间","审批人"].map(t=>e.jsx("th",{scope:"col",children:t},t))})}),e.jsxs("tbody",{id:"registrations",children:[n?.requests.map((t,a)=>e.jsxs("tr",{children:[e.jsx("td",{children:t.username}),e.jsx("td",{children:t.display_name||"—"}),e.jsx("td",{children:Object.hasOwn(sn,t.status)?sn[t.status]:t.status}),e.jsx("td",{children:Nr(t.created_at)}),e.jsx("td",{children:t.decided_by||"—"})]},t.username+"-"+a)),!n?.requests.length&&e.jsx(cn,{columns:5,children:r?"暂时无法加载注册申请，请点击刷新数据重试。":n?"暂无自主注册申请。":"正在加载注册申请…"})]})]})})}function Ms({grants:n,users:r,busy:t,ready:a,revoke:i}){return e.jsx("div",{className:"table-wrap",tabIndex:0,role:"region","aria-label":"画布授权列表",children:e.jsxs("table",{className:"grant-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["访问者 A","方向","所有者 / 授权范围","权限","操作"].map(s=>e.jsx("th",{scope:"col",children:s},s))})}),e.jsxs("tbody",{id:"grants",children:[n.map(s=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx(Ae,{name:He(r.find(o=>o.id===s.viewer_id)),id:s.viewer_id})}),e.jsx("td",{children:"→"}),e.jsx("td",{children:s.scope==="all"?e.jsxs(e.Fragment,{children:["所有画布",e.jsx("span",{className:"perm-user-id",children:nn})]}):e.jsx(Ae,{name:He(r.find(o=>o.id===s.owner_id)),id:s.owner_id})}),e.jsx("td",{children:kn(s.permission)}),e.jsx("td",{children:e.jsx("button",{type:"button",className:"danger",disabled:t,onClick:()=>i(s),children:"撤销"})})]},s.viewer_id+"-"+(s.scope==="all"?"*":s.owner_id))),!n.length&&e.jsx(cn,{columns:5,children:a?"暂无画布授权。选择访问者与所有者 / 授权范围后保存。":"正在加载授权…"})]})]})})}function Es({projects:n,users:r,target:t}){return e.jsx("div",{className:"dialog-list",tabIndex:0,role:"region","aria-label":"画布分配确认明细",children:e.jsxs("table",{children:[e.jsx("thead",{children:e.jsx("tr",{children:["画布名称","画布 ID","旧归属","目标归属"].map(a=>e.jsx("th",{scope:"col",children:a},a))})}),e.jsx("tbody",{children:n.map(a=>e.jsxs("tr",{children:[e.jsx("td",{children:a.name||"未命名画布"}),e.jsx("td",{children:a.id}),e.jsx("td",{children:e.jsx(Ae,{name:_n(a,r),id:a.owner_id})}),e.jsx("td",{children:e.jsx(Ae,{name:He(t),id:t.id})})]},a.id))})]})})}function Ps({projects:n,users:r,busy:t,ready:a,selected:i,setSelected:s,status:o,onConfirm:l,onError:p}){const[d,c]=m.useState(""),[f,u]=m.useState(""),[y,j]=m.useState(""),w=new Map(n.map(N=>[N.owner_id,`${_n(N,r)}（ID: ${N.owner_id}）`])),v=w.has(f)?f:"",b=r.filter(N=>N.enabled&&N.role!=="monitor"),h=b.some(N=>N.id===y)?y:"",x=fs(n,d,v),_=gs(x,i),L=m.useRef(null);m.useEffect(()=>{L.current&&(L.current.indeterminate=_.indeterminate)},[_.indeterminate]);const A=N=>{N(),s(new Set)};return e.jsxs("section",{className:"card","aria-labelledby":"history-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"history-heading",tabIndex:-1,children:"历史画布分配"}),e.jsx("span",{className:"small muted",children:"仅个人空间 / 每次最多 1000 个"})]}),e.jsx("div",{className:"f-pad",children:e.jsx("p",{className:"notice-box",children:kr})}),e.jsxs("div",{className:"allocation-tools",children:[e.jsxs("div",{className:"allocation-filters",children:[e.jsxs("label",{className:"field",children:["搜索名称 / ID",e.jsx("input",{id:"project-search",type:"search",autoComplete:"off",placeholder:"输入画布名称或 ID",value:d,disabled:t,onChange:N=>A(()=>c(N.currentTarget.value))})]}),e.jsxs("label",{className:"field",children:["当前所有者",e.jsxs("select",{id:"project-owner",value:v,disabled:t,onChange:N=>A(()=>u(N.currentTarget.value)),children:[e.jsx("option",{value:"",children:"全部所有者"}),[...w].map(([N,S])=>e.jsx("option",{value:N,children:S},N))]})]})]}),e.jsxs("form",{id:"assign",className:"allocation-batch","aria-busy":t,onSubmit:N=>{if(N.preventDefault(),!t)try{l(ys(r,x,i,h))}catch(S){p(ee(S))}},children:[e.jsxs("label",{className:"field",children:["目标账号（仅启用账号）",e.jsxs("select",{name:"owner_id",required:!0,value:h,disabled:t,onChange:N=>j(N.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择目标账号"}),b.map(N=>e.jsx("option",{value:N.id,children:pe(r,N.id)},N.id))]})]}),e.jsxs("span",{id:"project-selected",role:"status",children:["已选 ",i.size," 个画布",i.size>1e3?"（超过 1000 个上限）":""]}),e.jsx("button",{id:"assign-submit",className:"primary",disabled:t||!i.size||!h,children:"分配所选画布"}),e.jsx("button",{id:"clear-selection",type:"button",disabled:t||!i.size,onClick:()=>s(new Set),children:"清空选择"})]})]}),e.jsx("p",{id:"assign-status",className:"table-note f-status",role:"status",children:o}),e.jsx("div",{className:"table-wrap history-scroll",tabIndex:0,role:"region","aria-label":"历史画布列表",children:e.jsxs("table",{className:"allocation-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{scope:"col",children:e.jsx("input",{ref:L,id:"project-all",type:"checkbox","aria-label":"全选当前筛选结果中的个人画布",checked:_.checked,disabled:t||!_.personal.length,onChange:N=>s(new Set(N.currentTarget.checked?_.personal.map(S=>S.id):[]))})}),["画布名称","画布 ID","当前所有者","空间"].map(N=>e.jsx("th",{scope:"col",children:N},N))]})}),e.jsxs("tbody",{id:"projects",children:[x.map(N=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("input",{type:"checkbox","data-team":String(!!N.team_id),checked:i.has(N.id),"aria-label":`选择画布 ${N.name||"未命名画布"}（${N.id}）`,disabled:t||!!N.team_id,onChange:S=>{const P=new Set(i);S.currentTarget.checked?P.add(N.id):P.delete(N.id),s(P)}})}),e.jsx("td",{children:N.name||"未命名画布"}),e.jsx("td",{className:"perm-id",children:N.id}),e.jsx("td",{children:e.jsx(Ae,{name:_n(N,r),id:N.owner_id})}),e.jsx("td",{children:N.team_id?e.jsxs(e.Fragment,{children:["项目组：",N.team_name||N.team_id,e.jsx("span",{className:"team-space",children:"由成员关系授权，不可改为个人归属"})]}):"个人空间"})]},N.id)),!x.length&&e.jsx(cn,{columns:5,children:a?"暂无符合条件的画布，请尝试更换搜索词或当前所有者。":"正在加载画布…"})]})]})}),e.jsx("p",{className:"table-note",children:"搜索或切换当前所有者会清空选择。全选只选择当前筛选结果中的个人画布，项目组画布不可选；超过 1000 个时请缩小筛选范围。"})]})}function Rs(n){const r=vs(n),{users:t,grants:a,projects:i,service:s}=r,[o,l]=m.useState(null),[p,d]=m.useState(""),[c,f]=m.useState(""),[u,y]=m.useState(""),j=m.useRef(null),w=r.loading||r.mutationBusy||!r.ready,v=w&&!o,b=g=>{r.setError(g),n.notify({message:g,tone:"error"})},h=g=>{!w&&!o&&l(g)},x=(g,E)=>{if((E==="password"||E==="profile")&&g.local_login_enabled===!1)return;const q=e.jsxs("p",{children:["目标账号：",e.jsx("b",{children:pe(t,g.id)})]});if(E==="profile")return h({title:"编辑本地资料",children:e.jsxs(e.Fragment,{children:[q,e.jsx(js,{user:g})]}),submitLabel:"保存本地资料",action:ne=>s.update(g.id,{display_name:ge(ne,"display_name"),phone:ge(ne,"phone")}),message:"本地资料已更新"});if(E==="password")return h({title:"重置密码",children:e.jsxs(e.Fragment,{children:[q,e.jsx(zr,{}),e.jsx("p",{className:"notice-box danger",children:"该账号现有会话将失效，需要使用新密码重新登录。请妥善告知本人。"})]}),submitLabel:"确认重置密码",action:ne=>s.resetPassword(g.id,ge(ne,"password")),message:"密码已重置"});if(E==="role")return h({title:"修改账号角色",children:e.jsxs(e.Fragment,{children:[q,e.jsx($r,{initial:g.role}),e.jsx("p",{className:"notice-box danger",children:"管理员天然可访问全部画布。切换为监控展示员会清除组长权限，已有画布授权保留但不生效；其他角色的组长权限不变。修改角色会使该账号现有会话失效；最后一位启用管理员受系统保护。"})]}),submitLabel:"确认修改角色",action:ne=>s.update(g.id,{role:Le.parse(ge(ne,"role"))}),message:"账号角色已修改"});const C=E==="enabled",k=C?!g.enabled:!g.team_leader,X=C?k?"启用账号":"停用账号":k?"授予组长权限":"取消组长权限",Z=C?k?"启用不会跳过钉钉注册审批，审批状态保持不变。":"停用后该账号不能继续登录，现有会话失效。不会删除既有项目组关系或画布授权；最后一位启用管理员受系统保护。":k?"授予该用户创建项目组和管理自己创建项目组的权限，不会成为管理员，也不能管理其他人的项目组。现有会话失效后需重新登录。":"取消后不能继续创建项目组，现有会话失效。已授予的组内组长身份和成员关系保持不变，仍可管理对应项目组。";h({title:X,children:e.jsxs(e.Fragment,{children:[q,e.jsx("p",{className:"notice-box",children:Z})]}),submitLabel:"确认"+X,action:()=>s.update(g.id,C?{enabled:k}:{team_leader:k}),message:X+"成功"})},_=g=>{const E=g.scope==="all"?"所有画布（"+nn+"）":pe(t,g.owner_id);h({title:"确认撤销授权",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:[pe(t,g.viewer_id)," → ",E]}),e.jsxs("p",{children:["权限：",kn(g.permission)]}),e.jsx("p",{className:"notice-box danger",children:"撤销后即时重新校验权限，访问者失去这条授权带来的全部画布访问权。此授权不会使其成为管理员；管理员天然权限、项目组成员关系和其他独立授权不受影响。"})]}),submitLabel:"确认撤销授权",action:()=>s.revokeGrant(g),message:"已撤销画布授权"})},L=t.filter(g=>g.role!=="monitor"),A=L.some(g=>g.id===c)?c:"",N=u==="*"||t.some(g=>g.id===u)?u:"",S=[{id:"users",label:"账号总数",value:t.length,note:"角色与独立组长权限分别管理"},{id:"enabled",label:"启用账号",value:t.filter(g=>g.enabled).length,note:"停用不会删除账号或画布授权"},{id:"pending",label:"待审批注册",value:r.registrations?.requests.filter(g=>g.status==="pending").length??"—",note:"仅由钉钉指定审批人处理"},{id:"grants",label:"画布授权",value:a.length,note:"访问者 A → 所有者 / 授权范围"}],P=r.registrations?.outbox;return e.jsxs("main",{id:"main",tabIndex:-1,ref:j,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"账号与权限"}),e.jsx("div",{className:"page-caption",children:e.jsx("p",{className:"subtitle",children:"管理账号、画布访问与历史画布归属"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{id:"refresh-note",className:"refresh-note",role:"status",children:r.refreshNote}),e.jsx("button",{id:"refresh",type:"button",disabled:r.loading||r.mutationBusy||!!o,onClick:()=>{r.refreshPage()},children:"刷新数据"})]})]}),e.jsx("p",{id:"error",className:"page-status",role:"alert",children:r.error}),e.jsxs("section",{className:`card ${ze.priority}`,"aria-labelledby":"priority-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"priority-heading",children:"管理员项目组任务优先"}),e.jsx("p",{id:"priority-help",className:"section-subtitle",children:"默认关闭。开启后，组长为管理员的项目组内成员提交的排队任务，优先分配兼容的空闲机器，不抢占正在执行的任务。优先任务按提交顺序分配；开关、组成员和组长角色变化实时作用于已排队任务。"}),e.jsx("p",{role:"status",children:r.dispatchPriority===null?"正在读取设置…":r.dispatchPriority?"已开启":"已关闭"})]}),e.jsx("button",{type:"button",role:"switch","aria-checked":r.dispatchPriority===!0,"aria-labelledby":"priority-heading","aria-describedby":"priority-help",className:ze.switch,disabled:v||r.dispatchPriority===null,onClick:()=>{r.mutate(()=>s.setDispatchPriority(!r.dispatchPriority),"任务优先设置已保存").catch(g=>b(ee(g)))},children:e.jsx("span",{className:ze.track,"aria-hidden":"true",children:e.jsx("span",{className:ze.thumb})})})]}),e.jsx("section",{className:"metrics","aria-label":"权限概览",children:S.map(g=>e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:g.label}),e.jsx("p",{id:"metric-"+g.id,className:"metric-value",children:g.id==="pending"||r.ready||t.length?g.value:"—"}),e.jsx("p",{className:"metric-note",children:g.note})]})},g.id))}),e.jsx("nav",{className:"section-nav","aria-label":"权限管理分区",children:[["accounts","账号管理"],["registrations","注册申请"],["grants","画布授权"],["history","历史画布分配"]].map(([g,E])=>e.jsx("a",{href:"#"+g+"-heading",onClick:()=>j.current?.querySelector("#"+g+"-heading")?.focus(),children:E},g))}),e.jsxs("section",{className:"card","aria-labelledby":"accounts-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"accounts-heading",tabIndex:-1,children:"账号管理"}),e.jsx("p",{className:"section-subtitle",children:"账号角色包括管理员、普通用户和监控展示员。监控展示员仅可查看监控，不能担任组长或访问画布。 启停仅影响抽卡访问；定海账号资料和密码请在定海维护。"})]}),e.jsx("button",{id:"create-user",type:"button",className:"primary",disabled:v,onClick:()=>h({title:"新建账号",children:e.jsx(ws,{}),submitLabel:"创建账号",action:g=>s.create({username:ge(g,"username").trim(),password:ge(g,"password"),role:Le.parse(ge(g,"role")),team_leader:new FormData(g).has("team_leader")}),message:"账号已创建"}),children:"新建账号"})]}),e.jsx(zs,{users:t,busy:v,ready:r.ready,action:x}),e.jsx("p",{className:"table-note",children:"启停、角色、组长权限及重置密码均需确认。初始密码至少 8 位，请勿使用常见弱密码；监控展示员的密码由管理员重置，其他账号登录后可自行修改。"})]}),e.jsxs("div",{className:"permissions-grid",children:[e.jsxs("section",{className:"card","aria-labelledby":"registrations-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"registrations-heading",tabIndex:-1,children:"注册申请"}),e.jsx("span",{className:"small muted",children:"仅查看钉钉审批结果"})]}),e.jsxs("div",{className:"f-pad form-grid",children:[e.jsx("p",{className:"notice-box",children:"自主注册由钉钉群内两位指定审批人在卡片上处理，任意一人先决生效。网页不提供通过或拒绝操作。"}),e.jsx("p",{id:"outbox-status",className:"f-status",role:"status",children:r.registrationError||(r.registrations?P&&P.pending>0?`审批通知积压 ${P.pending} 条（最早 ${P.oldest_at?Nr(P.oldest_at):"时间未知"}），系统会自动重试投递。`:"审批通知投递正常。":"")})]}),e.jsx(Cs,{data:r.registrations,error:r.registrationError})]}),e.jsxs("section",{className:"card","aria-labelledby":"grants-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"grants-heading",tabIndex:-1,children:"画布授权"}),e.jsx("span",{className:"small muted",children:"访问者 A → 所有者 / 授权范围"})]}),e.jsx("div",{className:"f-pad",children:e.jsx("p",{id:"grant-help",className:"notice-box",children:"选择指定所有者，A 可查看或操作其当前及以后创建的全部个人画布；选择“所有画布”则覆盖全部个人和项目组画布，包括现有及未来新增画布。可操作包含删除；授权不传递，也不会成为管理员。管理员天然可访问全部画布，停用账号不会因授权恢复登录权限。"})}),e.jsxs("form",{id:"grant",className:"grant-form","aria-describedby":"grant-help","aria-busy":r.mutationBusy,onSubmit:g=>{if(g.preventDefault(),!w){d("");try{const E=bs(t,A,N,Be.parse(ge(g.currentTarget,"permission"))),q=E.scope==="all"?"所有画布（"+nn+"）":pe(t,E.owner_id),C=E.scope==="all"?"覆盖"+nn+"，不受所有者或项目组成员关系限制。":"覆盖所有者当前和以后创建的全部个人画布，不包含项目组画布。";h({title:"确认画布授权",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["访问者 A：",pe(t,E.viewer_id)]}),e.jsxs("p",{children:["所有者 / 授权范围：",q]}),e.jsxs("p",{children:["权限：",e.jsx("b",{children:kn(E.permission)})]}),e.jsxs("p",{className:"notice-box danger",children:[C,"可操作包含删除；授权不传递，也不会成为管理员。已有同范围授权将被更新，其他独立授权保留；保存后即时重新校验权限。停用账号不会因此恢复登录。"]})]}),submitLabel:"确认保存授权",action:()=>s.saveGrant(E),message:"画布授权已保存"})}catch(E){const q=ee(E);d(q),n.notify({message:q,tone:"error"})}}},children:[e.jsxs("label",{className:"field",children:["访问者 A",e.jsxs("select",{name:"viewer_id",required:!0,disabled:v,value:A,onChange:g=>f(g.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择账号"}),L.map(g=>e.jsx("option",{value:g.id,children:pe(t,g.id)},g.id))]})]}),e.jsxs("label",{className:"field",children:["所有者 / 授权范围",e.jsxs("select",{name:"owner_id",required:!0,disabled:v,value:N,onChange:g=>y(g.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择所有者 / 授权范围"}),e.jsx("option",{value:"*",children:"所有画布（含以后新增）"}),t.map(g=>e.jsx("option",{value:g.id,children:pe(t,g.id)},g.id))]})]}),e.jsxs("label",{className:"field",children:["权限",e.jsxs("select",{name:"permission",disabled:v,children:[e.jsx("option",{value:"read",children:"只读"}),e.jsx("option",{value:"operate",children:"可操作（含删除）"})]})]}),e.jsx("button",{id:"grant-submit",className:"primary",disabled:v,children:"保存授权"}),e.jsx("p",{id:"grant-error",className:"danger small",role:"alert",children:p})]}),e.jsx(Ms,{grants:a,users:t,busy:v,ready:r.ready,revoke:_})]})]}),e.jsx(Ps,{projects:i,users:t,busy:v,ready:r.ready,selected:r.selected,setSelected:r.setSelected,status:r.assignStatus,onError:b,onConfirm:({target:g,chosen:E,payload:q})=>h({title:"确认分配 "+E.length+" 个画布",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["目标账号：",e.jsx("b",{children:pe(t,g.id)})]}),e.jsx("p",{className:"notice-box danger",children:kr}),e.jsx(Es,{projects:E,users:t,target:g})]}),submitLabel:"确认分配所列画布",action:async()=>{const C=await s.assign(q);r.setSelected(new Set),r.setAssignStatus(`分配成功：已将 ${C} 个画布分配给 ${pe(t,g.id)}。`)},message:"画布归属已分配"})})]}),o&&e.jsx(re,{title:o.title,submitLabel:o.submitLabel,onClose:()=>l(null),onSubmit:g=>r.mutate(()=>o.action(g),o.message,o.afterSuccess),children:o.children})]})}const _e=10,Cr=2e3,Is=15e3;function Ls(n){return n==="0"||n==="7"||n==="30"||n==="90"}const U=me([V(),z(),dr()]).optional().transform((n,r)=>{if(n==null||n==="")return n===void 0?void 0:null;const t=typeof n=="number"?n:Number(n);return Number.isFinite(t)?t:(r.addIssue({code:"custom",message:"费用数值必须为有限数字或未知值"}),at)}),ae=z().nullish(),As=G({tasks:U,done:U,error:U,canceled:U,retail_min:U,retail_max:U,retail_mid:U,retail_known_tasks:U,retail_unknown_tasks:U,total_cost:U,actual_cost:U,estimated_cost:U,running_accrued:U,gpu_hours:U,electricity_cost:U,api_cost:U,failed_waste:U,unknown_cost_tasks:U}),yn=G({key:ae,label:ae,tasks:U,retail_known_tasks:U,retail_unknown_tasks:U,retail_min:U,retail_max:U,retail_mid:U,total_cost:U}),Ts=G({job_id:ae,created_at:U,status:ae,category_name:ae,category:ae,project_name:ae,card_name:ae,capability:ae,worker_name:ae,runtime_seconds:U,retail_source:ae,retail_basis:ae,retail_min:U,retail_max:U,cost_source:ae,recognized_cost:U}),Ds=G({overview:As,jobs:O(Ts).transform(n=>n.slice(0,Cr)),currency:ae,pricing_version:me([z(),V()]).nullish(),period:G({from:U,to:U}).nullish(),by_category:O(yn).nullish(),by_capability:O(yn).nullish(),by_worker:O(yn).nullish()});function Fs(n){const r=Ds.safeParse(n);if(!r.success)throw new Error("费用接口返回的数据格式不完整");return r.data}function Os(n,r=Date.now()){const t=new URLSearchParams({limit:String(Cr)});return n!=="0"&&t.set("from",String(r/1e3-Number(n)*86400)),`/api/costs?${t}`}function qs(n){return{async load(r,t){const a=await n.request(Os(r),{cache:"no-store",signal:t});return Fs(a)}}}const Us={data:null,selectedPeriod:"0",loadedPeriod:"0",page:0,busy:!0,error:null,updatedAt:null};function Ws({http:n,notify:r}){const t=m.useMemo(()=>qs(n),[n]),[a,i]=m.useState(Us),s=m.useRef("0"),o=m.useRef("0"),l=m.useRef(0),p=m.useRef(!1),d=m.useRef(!1),c=m.useRef(new Set),f=m.useRef(r);m.useEffect(()=>{f.current=r},[r]);const u=m.useCallback(async(h,x,_=!1)=>{if(p.current&&!_)return;const L=++l.current;p.current=!0;const A=new AbortController;c.current.add(A),i(N=>({...N,busy:!0}));try{const N=await t.load(h,A.signal);if(L!==l.current)return;o.current=h,d.current=!1,i(S=>({...S,data:N,loadedPeriod:h,error:null,updatedAt:Date.now(),page:x?0:Math.min(S.page,Math.max(0,Math.ceil(N.jobs.length/_e)-1))}))}catch(N){if(L!==l.current)return;const S=`读取费用统计失败：${ee(N)}`,P=!d.current;d.current=!0,i(g=>({...g,error:S})),P&&f.current({message:S,tone:"error"})}finally{c.current.delete(A),L===l.current&&(p.current=!1,i(N=>({...N,busy:!1})))}},[t]),y=m.useCallback(()=>{l.current+=1,p.current=!1,c.current.forEach(h=>h.abort()),c.current.clear()},[]);m.useEffect(()=>{u(s.current,!1);const h=window.setInterval(()=>{document.hidden||u(s.current,!1)},Is);return()=>{window.clearInterval(h),y()}},[u,y]);const j=m.useCallback(h=>{s.current=h,i(x=>({...x,selectedPeriod:h})),u(h,!0,!0)},[u]),w=m.useCallback(()=>{u(s.current,!1)},[u]),v=m.useCallback(()=>{const h=s.current!==o.current;u(s.current,h,h)},[u]),b=m.useCallback(h=>{i(x=>({...x,page:Math.max(0,Math.min(x.page+h,Math.max(0,Math.ceil((x.data?.jobs.length??0)/_e)-1)))}))},[]);return{...a,selectPeriod:j,refresh:w,retry:v,changePage:b}}const Bs="_retail_1nvzz_1",Hs="_commercial_1nvzz_11",Vs={retail:Bs,commercial:Hs};function Y(n){return typeof n=="number"&&Number.isFinite(n)?n:null}function ce(n){return Y(n)==null?"未获取":String(n)}function Pe(n,r){const t=Y(n);return t==null?"未知":`${!r||r==="CNY"?"¥":r+" "}${t.toFixed(4)}`}function on(n,r,t){return Y(n)==null||Y(r)==null?"未知":n===r?Pe(n,t):`${Pe(n,t)} – ${Pe(r,t)}`}function vn(n){const r=Y(n);return r==null||!Number.isFinite(new Date(r*1e3).getTime())?"未记录":new Date(r*1e3).toLocaleString("zh-CN",{hour12:!1})}function Gs(n){const r=Y(n);return r==null||r<0?"未记录":r<60?`${Math.round(r)}秒`:r<3600?`${Math.floor(r/60)}分${Math.floor(r%60)}秒`:`${Math.floor(r/3600)}小时${Math.floor(r%3600/60)}分`}function Ks(n){return n==="0"?"全部记录":`最近${n}天`}function Js(n){return{unpriced:Y(n.retail_known_tasks)===0&&(Y(n.retail_unknown_tasks)??0)>0,allCostsUnknown:(Y(n.tasks)??0)>0&&Y(n.unknown_cost_tasks)===Y(n.tasks)&&Y(n.actual_cost)===0&&Y(n.estimated_cost)===0}}function Xs(n,r){return Y(n.retail_known_tasks)==null?"未获取":n.retail_known_tasks?on(n.retail_min,n.retail_max,r):"未定价"}const rr={queued:"排队中",assigned:"已分配",running:"运行中",done:"已完成",error:"失败",canceled:"已取消",cancel_requested:"正在取消"},tr={actual:"实际",estimated:"历史估算",unknown:"未知"},ar={per_job:"按次",per_segment:"按段",segment_count:"按分段数",output_second_resolution:"按输出秒和分辨率"};function Ys(n,r){const t=n.retail_source==="priced",a=n.retail_source==="not_billable",i=n.retail_source==="unpriced";return{status:(Object.hasOwn(rr,n.status||"")?rr[n.status||""]:n.status)||"未知",statusClass:["error","canceled"].includes(n.status||"")?"danger":["running","queued","assigned","cancel_requested"].includes(n.status||"")?"warn":"",basis:t?(Object.hasOwn(ar,n.retail_basis||"")?ar[n.retail_basis||""]:n.retail_basis)||"未记录":a?"未完成":i?"未定价":"未获取",basisClass:i?"warn":"muted",retail:t?on(n.retail_min,n.retail_max,r):a?"不计费":i?"未定价":"未知",internal:n.cost_source==="unknown"||!n.cost_source?"未知":Pe(n.recognized_cost,r),source:(Object.hasOwn(tr,n.cost_source||"")?tr[n.cost_source||""]:n.cost_source)||"来源未记录"}}function be({label:n,id:r,children:t,note:a,noteId:i,compact:s=!0,tone:o}){return e.jsx("article",{className:`card metric${o?` ${Vs[o]}`:""}`,children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:n}),e.jsx("p",{className:`metric-value${s?" compact":""}`,id:r,children:t}),e.jsx("p",{className:"metric-note",id:i,children:a})]})})}function Zs({data:n}){const r=n?.overview??{},{unpriced:t,allCostsUnknown:a}=Js(r),i=Y(r.retail_min),s=Y(r.retail_max),o=p=>Pe(p,n?.currency),l=n?t?"未定价":Y(r.retail_min)!=null&&Y(r.retail_max)!=null&&r.retail_min!==r.retail_max?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"cost-amount",children:o(r.retail_min)})," – ",e.jsx("span",{className:"cost-amount",children:o(r.retail_max)})]}):on(r.retail_min,r.retail_max,n.currency):"未获取";return e.jsxs("section",{className:"metrics f-metrics8","aria-label":"费用概览",children:[e.jsx(be,{tone:"retail",label:"建议收费区间",id:"retail-range",note:"按次 / 分段 / 输出秒和分辨率",children:l}),e.jsx(be,{tone:"retail",label:"建议收费中值",id:"retail-mid",noteId:"retail-coverage",note:n?`已定价 ${ce(r.retail_known_tasks)} 项 / 未定价 ${ce(r.retail_unknown_tasks)} 项`:"已定价 未获取 / 未定价 未获取",children:n?t?"未定价":o(r.retail_mid):"未获取"}),e.jsx(be,{tone:"commercial",label:"商用模型等效费用（估算）",id:"internal-total",noteId:"internal-split",note:"按建议收费区间的 5 倍测算 · 非实际支出",children:n?t?"未定价":on(i==null?null:i*5,s==null?null:s*5,n.currency):"未获取"}),e.jsx(be,{label:"内部实际成本",id:"actual",noteId:"running",note:n?`运行中累计 ${o(r.running_accrued)}`:"运行中累计 未获取",children:n?a?"未知":o(r.actual_cost):"未获取"}),e.jsx(be,{label:"GPU 用量",id:"gpu-hours",noteId:"electricity",note:n?`其中电费 ${o(r.electricity_cost)}`:"其中电费 未获取",children:Y(r.gpu_hours)==null?"未获取":`${r.gpu_hours?.toFixed(2)} 小时`}),e.jsx(be,{label:"API 成本",id:"api-cost",note:"按输入 / 输出 token",children:n?o(r.api_cost):"未获取"}),e.jsx(be,{label:"失败与取消损耗",id:"waste",noteId:"unknown",note:`已包含于总成本；未知 ${ce(r.unknown_cost_tasks)} 项`,children:n?o(r.failed_waste):"未获取"}),e.jsx(be,{label:"任务数量",id:"tasks",compact:!1,noteId:"statuses",note:`完成 ${ce(r.done)} / 失败 ${ce(r.error)} / 取消 ${ce(r.canceled)}`,children:ce(r.tasks)})]})}const Ne=[{key:"category",label:"按类型"},{key:"capability",label:"按能力"},{key:"worker",label:"按执行端"}];function Qs({data:n,failed:r}){const[t,a]=m.useState("category"),i=m.useRef({}),o=n?.[`by_${t}`]?.slice(0,10),l=Math.max(0,...(o??[]).map(d=>Y(d.retail_mid)??0));function p(d,c){let f;switch(d.key){case"ArrowRight":case"ArrowDown":f=(c+1)%Ne.length;break;case"ArrowLeft":case"ArrowUp":f=(c+Ne.length-1)%Ne.length;break;case"Home":f=0;break;case"End":f=Ne.length-1;break;default:return}d.preventDefault();const u=Ne[f];u&&(a(u.key),i.current[u.key]?.focus())}return e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"费用构成"}),e.jsx("p",{className:"section-subtitle",children:"按建议收费中值排序 / 每个视角前10项；条形为相对最大项，不是内部成本占比"})]}),e.jsx("span",{className:"muted small",id:"pricing",children:n?`计价版本 ${n.pricing_version??"未获取"} / 币种 ${n.currency??"未获取"}`:"等待计价信息"})]}),e.jsx("div",{className:"tabs f-pad-tabs",role:"tablist","aria-label":"费用构成视角",children:Ne.map((d,c)=>e.jsx("button",{type:"button",role:"tab",id:`cost-tab-${d.key}`,"aria-controls":"cost-panel","aria-selected":t===d.key,tabIndex:t===d.key?0:-1,"data-cost-tab":d.key,ref:f=>{f?i.current[d.key]=f:delete i.current[d.key]},onClick:()=>a(d.key),onKeyDown:f=>p(f,c),children:d.label},d.key))}),e.jsx("div",{className:"f-cost-chart f-pad",id:"cost-panel",role:"tabpanel","aria-labelledby":`cost-tab-${t}`,tabIndex:0,children:n?o?o.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"这个周期内还没有费用构成"}),e.jsx("p",{children:"调整统计周期，或等待任务产生费用记录。"})]}):o.map((d,c)=>{const f=Y(d.retail_mid),u=f!=null&&l>0?Math.max(0,Math.min(100,f/l*100)):null;return e.jsxs("div",{className:"f-rank",children:[e.jsxs("div",{children:[e.jsx("b",{title:d.key??void 0,children:d.label||d.key||"未记录"}),e.jsx("strong",{children:Xs(d,n.currency)})]}),e.jsxs("p",{className:"muted small",children:[ce(d.tasks)," 项 · 已定价 ",ce(d.retail_known_tasks)," · 未定价"," ",ce(d.retail_unknown_tasks)," · 已知内部成本"," ",Pe(d.total_cost,n.currency)]}),u!=null&&e.jsx("div",{className:"f-track",role:"meter","aria-label":`${d.label||d.key||""} 建议收费中值相对最大项`,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":u,children:e.jsx("i",{style:{width:`${u}%`}})})]},`${d.key??""}-${c}`)}):e.jsx("p",{className:"muted",children:"构成数据未获取，不以零元替代。"}):e.jsx("p",{className:"muted",children:r?"费用构成读取失败，请点击“重试读取”。":"正在读取费用构成…"})})]})}function en({children:n}){return e.jsx("span",{className:"cell-secondary",children:n})}function ei({data:n,page:r,loadedPeriod:t,failed:a,changePage:i,openBasis:s}){const o=n?.jobs??[],l=Math.max(0,Math.ceil(o.length/_e)-1),p=o.slice(r*_e,(r+1)*_e),d=Y(n?.overview.tasks);return e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"费用明细"}),e.jsx("p",{className:"section-subtitle",id:"detail-note",children:n?`服务端合计 ${ce(n.overview.tasks)} 条 / 明细已载入 ${o.length} 条${d!=null&&d>o.length?"（接口最多2000条，非完整明细）":""}；汇总不以当前显示页相加替代`:a?"明细未获取，不以空记录或零元代替。":"正在读取；汇总不以当前明细页相加替代"})]}),e.jsx("button",{type:"button",className:"link-button",id:"cost-basis",onClick:s,children:"计价与成本口径"})]}),e.jsx("p",{className:"table-note",id:"period-note",children:n?`当前展示：${Ks(t)} · ${Y(n.period?.from)===0?"全部历史":vn(n.period?.from)} — ${vn(n.period?.to)}（按任务创建时间）`:"统计周期正在读取"}),e.jsx("div",{className:"table-wrap",children:e.jsxs("table",{className:"cost-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["时间","状态 / 类型","项目 / 卡片","能力","执行端","耗时","收费依据","建议收费","内部成本 / 来源"].map(c=>e.jsx("th",{scope:"col",children:c},c))})}),e.jsx("tbody",{id:"job-rows",children:n?p.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:9,children:e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"这个周期内还没有费用记录"}),e.jsx("p",{children:"更换统计周期，或等待任务产生费用记录。"})]})})}):p.map((c,f)=>{const u=Ys(c,n.currency);return e.jsxs("tr",{children:[e.jsxs("td",{children:[vn(c.created_at),e.jsx(en,{children:c.job_id||"任务ID未记录"})]}),e.jsxs("td",{className:u.statusClass,children:[u.status,e.jsx(en,{children:c.category_name||c.category||"类型未记录"})]}),e.jsxs("td",{className:"origin",children:[c.project_name||"未归属项目",e.jsx(en,{children:c.card_name||"未记录卡片"})]}),e.jsx("td",{children:c.capability||"未记录"}),e.jsx("td",{children:c.worker_name||"未分配执行端"}),e.jsx("td",{children:Gs(c.runtime_seconds)}),e.jsx("td",{className:u.basisClass,children:u.basis}),e.jsx("td",{children:u.retail}),e.jsxs("td",{children:[u.internal,e.jsx(en,{children:u.source})]})]},`${c.job_id??""}-${f}`)}):e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"loading-note",children:a?"费用明细读取失败，请点击“重试读取”。":"正在读取费用明细…"})})})]})}),e.jsxs("div",{className:"f-pager",children:[e.jsx("span",{id:"page-note",children:n?`显示 ${o.length?r*_e+1:0}–${Math.min((r+1)*_e,o.length)} / 已载入 ${o.length} 条`:"尚未载入"}),e.jsx("button",{type:"button",id:"cost-prev",disabled:!n||r===0,onClick:()=>i(-1),children:"上一页"}),e.jsx("button",{type:"button",id:"cost-next",disabled:!n||r>=l,onClick:()=>i(1),children:"下一页"})]})]})}function ni({onClose:n}){return e.jsx(re,{title:"计价与成本口径",onClose:n,children:e.jsxs("div",{className:"f-stack",children:[e.jsx("p",{children:"建议收费区间与中值来自计价规则，不是已收款或实际收入。"}),e.jsx("p",{children:"收费依据支持按次、按段、分段数、输出秒和分辨率；未定价不等于免费。未完成任务不计建议收费，但可能产生内部损耗。"}),e.jsx("p",{children:"内部总成本 = 已知实际 + 已知历史估算；未知成本单列，不按零元处理。失败与取消损耗已包含于总成本，不重复相加。运行中累计成本尚可能变化。"}),e.jsx("p",{children:"统计周期以任务创建时间为准，按服务端全量聚合。费用明细最多读取2000条，每页10条；不能把当前显示明细当完整总额，也不从明细重算概览或费用构成。"}),e.jsx("p",{children:"GPU用量、电费、API token成本、实际与历史估算均沿用服务端口径；未记录的字段显示未知，不由前端推测单价或补算。"})]})})}function ri(n){const r=Ws(n),[t,a]=m.useState(!1),i=r.busy?"正在读取…":r.error?"连接失败 · 快照非实时":r.updatedAt!=null?`最后刷新 ${new Date(r.updatedAt).toLocaleTimeString("zh-CN",{hour12:!1})} · 每15秒刷新`:"正在加载 · 每15秒刷新";return e.jsxs("main",{id:"main",tabIndex:-1,"aria-busy":r.busy?!0:void 0,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"费用统计"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{className:"subtitle",children:"建议收费不是实际收入，未知成本不作零元"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsxs("label",{className:"filter-label",children:["统计周期",e.jsxs("select",{id:"period",value:r.selectedPeriod,onChange:s=>{const o=s.currentTarget.value;Ls(o)&&r.selectPeriod(o)},children:[e.jsx("option",{value:"0",children:"全部记录"}),e.jsx("option",{value:"7",children:"最近7天"}),e.jsx("option",{value:"30",children:"最近30天"}),e.jsx("option",{value:"90",children:"最近90天"})]})]}),e.jsx("span",{className:"muted small",id:"refresh-state",role:"status",children:i}),e.jsxs("button",{type:"button",className:"primary",id:"refresh",disabled:r.busy,onClick:r.refresh,children:[e.jsx(We,{name:"refresh"}),"立即刷新"]})]})]}),e.jsxs("div",{id:"error",className:"f-error",role:"alert",hidden:!r.error,children:[e.jsxs("div",{children:[e.jsx("b",{id:"error-message",children:r.error}),e.jsx("p",{children:"下方保留上次成功读取的周期与快照，不代表当前筛选的新数据；未知值不作零元。"})]}),e.jsx("button",{type:"button",id:"retry",onClick:r.retry,children:"重试读取"})]}),e.jsx(Zs,{data:r.data}),e.jsx(Qs,{data:r.data,failed:r.error!=null}),e.jsx(ei,{data:r.data,page:r.page,loadedPeriod:r.loadedPeriod,failed:r.error!=null,changePage:r.changePage,openBasis:()=>a(!0)}),e.jsxs("section",{className:"card padded notice-box","aria-labelledby":"cost-rules-title",children:[e.jsx("h2",{id:"cost-rules-title",children:"计价与成本口径"}),e.jsx("p",{children:"建议收费区间与中值来自规则，不是已收款或实际收入；未定价不等于免费。未完成任务不计建议收费，但可能产生内部损耗。"}),e.jsx("p",{children:"内部总成本 = 已知实际 + 已知历史估算；未知成本单列，不按零元处理。失败与取消损耗已包含于总成本，不重复相加；运行中累计仍可能变化。"}),e.jsx("p",{children:"统计周期按任务创建时间筛选，合计与构成取服务端全量聚合。明细最多读取2000条并分页展示，当前明细页不代表全部成本。"})]})]}),t&&e.jsx(ni,{onClose:()=>a(!1)})]})}const R=V().finite().nullable().optional(),K=z().nullable().optional(),Ue=Mn(z(),H),Mr=I({gpus:O(I({name:K,memory_total_bytes:R}).catchall(H)).optional(),cpu:H.optional(),os:H.optional(),memory_total_bytes:R,host_id:K,environment_id:K,model_version:K,disk:K,note:K}).catchall(H),sr=I({name:K,role:K,precision:H.optional(),precision_source:K,loader_dtype:H.optional()}).catchall(H),Nn=I({source:K,complete:J().optional(),capability_name:K,models:O(sr).optional(),auxiliary_models:O(sr).optional()}).catchall(H),ti=I({source:z(),summary:Nn,samples:R,measured:R}).catchall(H),ai=I({key:K,id:K,kind:K,width:H.optional(),height:H.optional(),duration:R,valid:J().nullable().optional(),outputs:H.optional(),samples:H.optional()}).catchall(H),si=I({total_samples:R,recorded_samples:R,complete_samples:R,total_outputs:R,recorded_outputs:R,variants:O(H).optional()}).catchall(H),ii=I({dimensions:Ue.nullable().optional(),parameters:Ue.nullable().optional(),expected:Ue.nullable().optional(),model_version:K}).catchall(H),Er={capability:z(),capability_name:K,worker_id:K,worker_name:K,source:z(),dimensions:Ue.nullable().optional(),spec:ii.nullable().optional(),output_resolution:si.nullable().optional(),recovered_outputs:H.optional(),runtime_seconds:R,occupied_seconds:R,warnings:O(z()).optional()},oi=I({...Er,id:z(),spec_key:K,config_id:K,config:Mr.nullable().optional(),config_source:K,cache_condition:H.optional(),samples:R,done:R,error:R,canceled:R,measured:R,mean_seconds:R,p50_seconds:R,p90_seconds:R,last_sample_at:R,reference_per_hour:R,output_count:R,unit:K,seconds_per_unit:R,qualified_seconds_per_unit:R,eligible:J().nullable().optional(),reviewed:R,accepted:R,benchmark_id:K,days:me([O(z()),V(),dr()]).optional(),model_summary:Nn.nullable().optional(),model_evidence:I({total_samples:R,recorded_samples:R,variants:O(ti).optional()}).catchall(H).nullable().optional(),current_model_reference:Nn.nullable().optional()}).catchall(H),li=I({id:z(),name:K,state:z(),last_seen:R,hardware:Mr.nullable().optional(),hardware_source:K,agent_version:R,supports_capacity_telemetry:J().optional(),tasks:R,done:R,error:R,canceled:R,runtime_seconds:R}).catchall(H),Pr=I({...Er,job_id:z(),group_id:K,status:z(),created_at:R,attempts:H.optional(),outputs:O(ai).nullable().optional(),review:I({accepted:R,source:K,benchmark_id:K,note:K}).catchall(H).nullable().optional()}).catchall(H),ci=I({period:Ue.optional(),overview:Mn(z(),V().finite().nullable()).default({}),workers:O(li).default([]),groups:O(oi).default([]),details:O(Pr).default([]),details_total:V().int().nonnegative()}).catchall(H),di=I({details:O(Pr),details_total:V().int().nonnegative()}),Rr=I({to:V().int(),mode:ie("historical"),quality:ie("technical"),availability:ie(1),utilization:ie(.75),worker_id:z().min(1),hours:V().finite().min(.1).max(24),price:V().finite().nonnegative().optional(),demands:O(I({group_id:z().min(1),quantity:V().finite().positive()})).min(1)}),pi=I({machines:R,total_seconds:R,daily_capacity_seconds:R,price_total:R,lines:O(I({group_id:z(),quantity:R,seconds_per_unit:R,daily_units:R}).catchall(H)).default([]),warnings:O(z()).default([]),assumptions:H.optional()}).catchall(H),Ir=I({host_id:z().max(160).optional(),cpu:z().max(160).optional(),memory_total_bytes:V().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),environment_id:z().max(160).optional(),model_version:z().max(160).optional(),disk:z().max(160).optional(),note:z().max(500).optional()}).strict(),Lr=I({accepted:V().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),source:Ke(["business","standard"]),benchmark_id:z().max(100),note:z().max(500)}),mi=I({processed:V().int().min(0).max(4),recorded:V().int().nonnegative(),total:V().int().nonnegative(),next_offset:V().int().nonnegative().nullable()}).refine(n=>n.recorded<=n.processed,"补采响应格式无效"),ir=Mn(z(),cr());class ui{constructor(r){this.http=r}http;path(r,t){return`/api/capacity?${new URLSearchParams({to:String(r.to),limit:"100",offset:String(t)})}`}report(r,t){return this.http.read(this.path(r,t),ci,{cache:"no-store"})}evidence(r,t){return this.http.read(this.path(r,t),di,{cache:"no-store"})}async estimate(r){return pi.parse(await this.http.json("/api/capacity/estimate","POST",Rr.parse(r)))}async profile(r,t){ir.parse(await this.http.json(`/api/capacity/workers/${encodeURIComponent(r)}`,"POST",Ir.parse(t)))}async review(r,t){ir.parse(await this.http.json(`/api/capacity/jobs/${encodeURIComponent(r)}/review`,"POST",Lr.parse(t)))}async probe(r,t,a){const i=await this.http.json(`/api/capacity/jobs/${encodeURIComponent(r)}/probe-outputs`,"POST",{offset:V().int().nonnegative().parse(t)});a();const s=mi.safeParse(i);if(!s.success||s.data.next_offset!==null&&(s.data.next_offset<=t||s.data.next_offset>=s.data.total))throw Error("补采响应格式无效，请刷新看板核对结果");return s.data}}const Oe=n=>!!(n.group||n.status||n.source||n.size!==100);class hi{cache=null;pending=null;clear(){this.cache=null,this.pending=null}async all(r,t,a,i){if(!a())return null;if(this.cache?.snapshot===r)return this.cache.records;if(this.pending?.snapshot===r)return this.pending.promise;const s={snapshot:r,promise:Promise.resolve(null)};s.promise=(async()=>{const o=r.report.details_total,l=[];if(!Number.isSafeInteger(o)||o<0)throw Error("明细总数无效，请刷新后重试。");for(let p=0;p<o;p+=100){if(!a())return null;const d=p===r.offset?r.report:await t.evidence(r.range,p);if(!a())return null;if(d.details_total!==o||d.details.length!==Math.min(100,o-p))throw Error("任务证据在读取期间变化或分页不完整，请刷新后重新筛选。");l.push(...d.details),i(l.length,o)}if(new Set(l.map(p=>p.job_id)).size!==l.length)throw Error("任务证据分页出现重复，请刷新后重试。");return a()?(this.cache={snapshot:r,records:l},l):null})(),this.pending=s;try{return await s.promise}finally{this.pending===s&&(this.pending=null)}}}class xi{constructor(r,t){this.service=r,this.notify=t}service;notify;listeners=new Set;loadVersion=0;estimateVersion=0;evidenceVersion=0;appliedRange=null;appliedOffset=0;alive=!0;repository=new hi;mutations=new Set;value={report:null,snapshot:null,ready:!1,revision:0,refreshState:"正在读取全部历史聚合与本页证据…",error:"",writeStatus:"",tab:"machines",technicalOpen:!1,evidenceOpen:!1,mounted:new Set,filters:{group:"",status:"",source:"",size:100},evidence:{records:[],total:0,start:0,size:100,state:"",busy:!1,failed:!1},estimate:null,estimateNote:"填写每日需求后计算。没有样本的场景不能按零耗时处理。",estimateError:"",estimating:!1};getSnapshot=()=>this.value;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});set(r){this.alive&&(this.value={...this.value,...r},this.listeners.forEach(t=>t()))}start(){this.alive=!0,this.load()}dispose(){this.alive=!1,this.loadVersion++,this.estimateVersion++,this.evidenceVersion++,this.repository.clear()}invalidateEstimate=(r="输入或证据已变更，请重新计算。")=>{this.estimateVersion++,this.set({estimate:null,estimateNote:r,estimateError:"",estimating:!1})};resetSnapshot(){this.repository.clear(),this.evidenceVersion++,this.set({snapshot:null,ready:!1})}clear(){this.resetSnapshot(),this.set({report:null,mounted:new Set,evidence:{records:[],total:0,start:0,size:100,state:"",busy:!1,failed:!1}})}activeMounts(){const r=new Set([this.value.tab]);return this.value.tab==="machines"&&this.value.technicalOpen&&r.add("technical"),this.value.evidenceOpen&&r.add("evidence"),r}async load(r=!0,t){const a=r?{to:Math.floor(Date.now()/1e3)}:this.appliedRange;if(!a)return;const i=++this.loadVersion,s=Object.freeze({...a}),o=r?0:t??this.appliedOffset;this.resetSnapshot(),this.invalidateEstimate("证据正在刷新，旧测算已清除。"),this.set({error:"",refreshState:"正在读取全部历史聚合与本页证据…",evidence:{...this.value.evidence,state:""}});try{const l=await this.service.report(s,o);if(!this.alive||i!==this.loadVersion)return;const p=Object.freeze({report:l,range:s,version:i,offset:o});this.appliedRange=s,this.appliedOffset=o;const d={...this.value.filters};if(l.groups.some(c=>c.id===d.group)||(d.group=""),this.set({report:l,snapshot:p,ready:!0,revision:this.value.revision+1,mounted:this.activeMounts(),filters:d,evidence:{records:l.details,total:l.details_total,start:o,size:100,state:"",busy:!1,failed:!1}}),this.value.evidenceOpen&&Oe(d)&&await this.filterEvidence(0),!this.alive||i!==this.loadVersion)return;this.set({refreshState:`最后刷新：${new Date().toLocaleTimeString("zh-CN",{hour12:!1})}`})}catch(l){if(!this.alive||i!==this.loadVersion)return;this.clear();const p=`读取产能数据失败：${ee(l)}。请点击立即刷新重试。`;this.set({error:p,refreshState:"读取失败"}),this.notify(p)}}activate(r){this.set({tab:r}),this.mount()}technical(r){this.set({technicalOpen:r}),this.mount()}evidenceOpen(r){this.set({evidenceOpen:r}),this.mount()}mount(){if(!this.value.ready)return;const r=this.value.mounted.has("evidence"),t=new Set([...this.value.mounted,...this.activeMounts()]);this.set({mounted:t}),!r&&t.has("evidence")&&Oe(this.value.filters)&&this.filterEvidence(0)}showEvidence(r=""){!this.value.ready||!this.value.snapshot||(this.set({evidenceOpen:!0,filters:{...this.value.filters,group:r,status:"",source:""},mounted:new Set([...this.value.mounted,"evidence"])}),this.filterEvidence(0))}filter(r){this.value.ready&&(this.set({filters:{...this.value.filters,...r}}),this.filterEvidence(0))}current(r){return this.alive&&this.value.ready&&this.value.snapshot===r&&r.version===this.loadVersion&&this.value.report===r.report}async filterEvidence(r){const t=this.value.snapshot;if(!t||!this.current(t)||!this.value.mounted.has("evidence"))return;const a=++this.evidenceVersion,i=this.value.filters;if(!Oe(i)){if(t.offset!==0){await this.load(!1,0);return}this.set({evidence:{records:t.report.details,total:t.report.details_total,start:0,size:100,state:"",busy:!1,failed:!1}});return}this.set({evidence:{records:[],total:0,start:0,size:i.size,state:"正在读取同一截止时间下的真实分页证据，完成后筛选；不会按当前页冒充全部任务。",busy:!0,failed:!1}});try{const s=await this.repository.all(t,this.service,()=>this.current(t),(p,d)=>{this.current(t)&&Oe(this.value.filters)&&this.set({evidence:{...this.value.evidence,state:`正在读取真实分页证据 ${p} / ${d} 条；聚合统计保持不变。`}})});if(!s||!this.current(t)||a!==this.evidenceVersion)return;const o=s.filter(p=>(!i.group||p.group_id===i.group)&&(!i.status||p.status===i.status)&&(!i.source||p.source===i.source)),l=Math.min(r,Math.max(0,Math.ceil(o.length/i.size)-1)*i.size);this.set({evidence:{records:o.slice(l,l+i.size),total:o.length,start:l,size:i.size,state:`筛选 ${o.length} / 全集 ${s.length} 条；只改变明细，聚合统计不受筛选或分页影响。`,busy:!1,failed:!1}})}catch(s){if(!this.current(t)||a!==this.evidenceVersion)return;this.set({evidence:{records:[],total:0,start:0,size:i.size,state:`证据筛选失败：${ee(s)}。请立即刷新后重试。`,busy:!1,failed:!0}})}}page(r){const{ready:t,evidence:a,mounted:i,snapshot:s,filters:o}=this.value;if(!t||!s||!i.has("evidence")||a.busy||a.failed)return;const l=Math.max(0,a.start+r*a.size);r>0&&l>=a.total||(Oe(o)?this.filterEvidence(l):this.load(!1,l))}async estimate(r){if(this.invalidateEstimate("正在计算…"),!this.value.ready||!this.value.snapshot){this.estimateFailure("请先点击立即刷新并成功读取证据。");return}const t=this.estimateVersion,a=this.value.snapshot,i=this.value.revision;this.set({estimating:!0});try{const s=await this.service.estimate(r);if(t!==this.estimateVersion||i!==this.value.revision||!this.current(a))return;const l={...a.report.workers.find(d=>d.id===r.worker_id)?.hardware};delete l.note;const p={result:s,payload:r,groups:a.report.groups.filter(d=>r.demands.some(c=>c.group_id===d.id)),hardware:l};this.set({estimate:p,estimating:!1})}catch(s){t===this.estimateVersion&&this.estimateFailure(`测算失败：${ee(s)}`)}}estimateFailure(r){this.set({estimate:null,estimating:!1,estimateNote:"本次未产生测算结果，请检查证据与输入后重试。",estimateError:r}),this.notify(r)}async mutate(r,t,a){if(this.mutations.has(r))throw Error("正在保存，请勿重复提交。");this.mutations.add(r);const i=this.loadVersion;this.set({writeStatus:""}),this.invalidateEstimate(`${t}正在保存，旧测算已清除。`);try{if(await a(),!this.alive)return;i===this.loadVersion?await this.load(!1):(this.loadVersion++,this.clear(),this.invalidateEstimate("证据已更新，请点击立即刷新后重新计算。"),this.set({refreshState:`${t}已更新，请点击立即刷新`})),this.set({writeStatus:`${t}已保存。人工声明不回写历史快照，也不代表自动验证通过。`})}finally{this.mutations.delete(r)}}saveProfile(r,t){return this.mutate(`profile:${r}`,"机器配置",()=>this.service.profile(r,t))}saveReview(r,t){return this.mutate(`review:${r}`,"人工标记",()=>this.service.review(r,t))}probe(r,t){return this.service.probe(r,t,this.probeWritten)}probeVersion(){return this.loadVersion}probeCurrent(r){return this.alive&&r===this.loadVersion&&this.value.report!==null}probeWritten=()=>{this.resetSnapshot(),this.invalidateEstimate("成品尺寸证据已更新，请刷新看板后重新计算。")}}function fi({http:n,notify:r}){const t=m.useMemo(()=>new xi(new ui(n),i=>r({message:i,tone:"error"})),[n,r]),a=m.useSyncExternalStore(t.subscribe,t.getSnapshot);return m.useEffect(()=>(t.start(),()=>t.dispose()),[t]),{controller:t,state:a}}const gi={historical:"历史运行参考",captured:"采集业务样本",standard:"标准样本（人工标签）"},An={idle:"在线空闲",online:"在线",busy:"运行中",running:"运行中",offline:"离线",disabled:"已禁用",syncing:"同步中",unavailable:"执行环境不可用",historical:"历史执行端",error:"异常",done:"已完成",canceled:"已取消",queued:"排队中",assigned:"已分配"},D=n=>typeof n=="number"&&Number.isFinite(n),M=n=>n==null||n===""?"未知":typeof n=="object"?JSON.stringify(n):String(n),$=n=>D(n)?n.toLocaleString("zh-CN",{maximumFractionDigits:2}):"未知",Q=n=>D(n)?`${$(n)} 秒`:"未知",De=n=>D(n)?new Date(n*1e3).toLocaleString("zh-CN",{hour12:!1}):"未知",Te=n=>D(n)?`${$(n/1024**3)} GiB`:"未知",de=n=>gi[n]||`来源未知（${M(n)}）`,Tn=n=>Array.isArray(n.days)?n.days.length:n.days,Re=n=>n.capability_name?.trim()?n.capability_name:M(n.capability),Ar=n=>Re(n)===n.capability?Re(n):`${Re(n)}（${n.capability}）`,dn=n=>typeof n=="string"&&{reported:"机器上报",manual:"人工声明","manual+reported":"机器上报 + 人工声明",unknown:"未知"}[n]||"未知";function Dn(n){return n&&typeof n=="object"&&!Array.isArray(n)?n:{}}function Ve(n,r){if(!n||typeof n!="object")return M(n);const t=Dn(n);return(r==="cpu"?[t.model,t.architecture,D(t.logical_cores)?`${$(t.logical_cores)} 逻辑核`:null]:[t.name,t.release,t.version]).filter(i=>i!=null&&i!=="").map(M).join(" / ")||"未知"}function Ge(n){return n?`GPU ${n.gpus?.length?n.gpus.map(t=>`${M(t.name)} / 单卡 ${Te(t.memory_total_bytes)}`).join("；"):"未知"}；CPU ${Ve(n.cpu,"cpu")}；内存 ${Te(n.memory_total_bytes)}；系统 ${Ve(n.os,"os")}；环境 ${M(n.environment_id)}；模型版本 ${M(n.model_version)}；磁盘 ${M(n.disk)}；主机 ID ${M(n.host_id)}`:"未知"}function bi(n){const r=n.hardware,t=(r?.gpus||[]).map(a=>[a.name,D(a.memory_total_bytes)?Te(a.memory_total_bytes):null].filter(Boolean).join(" / ")).filter(Boolean);return D(r?.memory_total_bytes)&&t.push(`系统内存 ${Te(r.memory_total_bytes)}`),t.join("；")||"尚未采集硬件信息"}function yi(n){const r=n.hardware;return!r?.cpu||!r.host_id?D(n.agent_version)&&n.agent_version<4||n.supports_capacity_telemetry===!1?"旧版采集程序缺少 CPU 等信息，请升级该 Worker 后补采；已有 GPU 与内存记录仍可查看。":"CPU 或主机信息尚未采集，请检查该 Worker 的采集上报。":!r.environment_id||!r.model_version?"环境或模型版本的人工声明未填写，可在“详细统计与机器配置”中补录。":"当前配置不代表历史任务的执行配置；历史依据见各业务详情。"}const xe=n=>["idle","busy","online","running"].includes(n.state),rn=n=>D(n.mean_seconds)&&n.mean_seconds>=0&&D(n.measured)&&n.measured>0;function vi(n){if(!D(n)||n<0)return"暂无成功耗时";if(n<1)return`${$(n)} 秒`;const r=Math.round(n),t=Math.floor(r/60),a=r%60;return t?`${$(t)} 分 ${a} 秒`:`${a} 秒`}function pn(n){const r={...n.spec?.dimensions,...n.dimensions},t=[["图片",r.image_count,"张"],["视频",r.video_count,"段"],["音频",r.audio_count,"段"]],a=i=>D(i)&&Number.isSafeInteger(i)&&i>=0;return t.every(([,i])=>!a(i))?["素材信息未记录"]:t.every(([,i])=>i===0)?["未使用图片、视频或音频"]:t.flatMap(([i,s,o])=>a(s)?s>0?[`${i} ${$(s)} ${o}`]:[]:[`${i}数量未记录`])}function Tr(n,r){const t=s=>D(s)&&Number.isSafeInteger(s)&&s>0,a=typeof n.resolution=="string"?n.resolution.match(/^(\d+)\s*[x×]\s*(\d+)(?:\s*\(\d+:\d+\))?$/i):null,i=[[n.output_width,n.output_height],[n.width,n.height],[a?Number(a[1]):null,a?Number(a[2]):null],[r.width,r.height,"期望 "]];for(const[s,o,l=""]of i)if(t(s)&&t(o)){const d={"640x360":"360p","640x480":"480p","854x480":"480p","1280x720":"720p","1920x1080":"1080p","2560x1440":"1440p","3840x2160":"4K"}[`${Math.max(s,o)}x${Math.min(s,o)}`];return d?`${l}${d}${s<o?" 竖屏":""}（${$(s)} × ${$(o)}）`:`${l||"尺寸 "}${$(s)} × ${$(o)}`}return D(n.megapixels)&&n.megapixels>0&&D(n.megapixels*100)?`约 ${$(n.megapixels*100)} 万像素（尺寸未记录）`:null}function mn(n,r=!1){const t={...n.spec?.parameters,...n.spec?.dimensions,...n.dimensions},a=n.spec?.expected||{},i=[],s=t.output_duration??t.duration??a.duration;D(s)&&i.push(`请求时长 ${$(s)} 秒`);const o=Tr(t,a);if(o&&i.push(o),r){D(t.megapixels)&&t.megapixels>0&&i.push(`像素设置 ${$(t.megapixels)} MP`);const l=[["帧率",t.output_fps??t.target_fps??t.fps??t.force_rate??a.fps," FPS"],["步数",t.steps," 步"],["帧数",t.frames," 帧"],["长边",t.scale_to_length," px"],["批量",t.batch_size,""]];for(const[p,d,c]of l)D(d)&&i.push(`${p} ${$(d)}${c}`)}return i.join(" / ")||"规格未完整记录"}function Dr(n){return(n?.variants||[]).flatMap(r=>{const t=Dn(r);return typeof t.kind=="string"&&["image","video"].includes(t.kind)&&D(t.width)&&Number.isSafeInteger(t.width)&&t.width>0&&D(t.height)&&Number.isSafeInteger(t.height)&&t.height>0?[{kind:t.kind,width:t.width,height:t.height,outputs:t.outputs,samples:t.samples}]:[]})}function Fn(n){return`${n.kind==="image"?"图片":"视频"} · ${Tr({width:n.width,height:n.height},{})}`}function ji(n){return D(n.width)&&D(n.height)&&Number.isSafeInteger(n.width)&&Number.isSafeInteger(n.height)&&n.width>0&&n.height>0&&["image","video"].includes(n.kind||"")?Fn({kind:n.kind||"",width:n.width,height:n.height}):"尺寸未记录"}const wi=n=>`${pn(n).join(" + ")}｜${mn(n)}`;function _i(n){const r=t=>rn(t)?t.source!=="historical"&&D(t.last_sample_at)?3:t.source==="historical"?2:1:0;return[...n].sort((t,a)=>r(a)-r(t)||(r(t)===3?(a.last_sample_at||0)-(t.last_sample_at||0):0)||(a.samples||0)-(t.samples||0)||(a.measured||0)-(t.measured||0))[0]}function On(n){const r=[...n.warnings||[]],t=Tn(n);return(!D(n.samples)||n.samples<30||!D(t)||t<3)&&r.push("参考样本不足：建议至少 30 个任务且跨 3 天；达到门槛也不是置信保证。"),n.source==="historical"&&r.push("仅成功任务 runtime 参考，未计完整占机、重试及质量损耗；不是合格日产能。"),n.eligible!==!0&&r.push("完整基线证据不足，不作为已验证采购依据。"),[...new Set(r)]}const Ie=n=>{const r={task:"任务",tasks:"任务",image:"张图片",images:"张图片",video:"条视频",videos:"条视频",second:"视频秒",seconds:"视频秒",video_seconds:"视频秒"};return n.source==="historical"?"任务":r[n.unit||""]||M(n.unit)};function Fr(n){const r=Object.hasOwn(n,"model_evidence"),t=n.model_evidence;return{variants:r?(t?.variants||[]).filter(i=>["task_snapshot","archived_task"].includes(i.source)):n.model_summary?.source==="task_snapshot"?[{source:"task_snapshot",summary:n.model_summary,samples:null,measured:null}]:[],hasEvidence:r,total:t?.total_samples,recorded:t?.recorded_samples,reference:n.current_model_reference?.source==="current_template"?n.current_model_reference:null}}const $e=n=>n?.models||[];function ki(n,r,t){const i={high_noise:"高噪声",low_noise:"低噪声",高噪声:"高噪声",低噪声:"低噪声",base:"基础模型",refiner:"精修模型",生成主模型:"生成主模型",深度模型:"深度模型",放大模型:"放大模型",插帧模型:"插帧模型"}[n.role||""];return i?`${i} · 主模型 ${r+1}`:t>1?`主模型 ${r+1}`:""}function Sn(n){const r=[];if(n.precision&&n.precision_source==="filename"&&r.push(`文件标记 ${M(n.precision)}`),n.loader_dtype){const t=M(n.loader_dtype),a=t.split(/\s*\/\s*/).map(s=>s.match(/^(bfloat16|bf16|float(?:8|16|32|64)|fp(?:8|16|32|64))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]),i=a.every(Boolean)?[...new Set(a.map(s=>s?.toUpperCase().replace("BFLOAT16","BF16").replace("FLOAT","FP")))].join(" / "):null;r.push(`加载配置 ${i?`${i}（${t}）`:t}${["default","auto"].includes(t.toLowerCase())?"（实际精度未确认）":""}`)}else n.precision&&n.precision_source==="loader"&&r.push(`加载配置 ${M(n.precision)}`);return r.length||r.push("精度未记录 / 待确认"),r}function Ni(n){const r=s=>{if(typeof s!="string")return null;const o=s.split(/\s*\/\s*/).map(l=>l.trim().match(/^(bfloat16|float(?:8|16|32|64)|bf16|fp(?:4|8|16|32|64)|int(?:4|8|16)|nf4|q[2-8]_(?:k(?:_[sml])?|[01]))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]);return o.every(Boolean)?[...new Set(o.map(l=>l?.toUpperCase().replace("BFLOAT16","BF16").replace("FLOAT","FP")))].sort().join(" / "):null},t=n.precision_source==="filename"?r(n.precision):null,a=r(n.loader_dtype)||(n.precision_source==="loader"?r(n.precision):null),i=Sn(n).filter(s=>s.startsWith("文件标记 ")?!!t:s.startsWith("加载配置 ")?!!a||["default","auto"].includes(String(n.loader_dtype).toLowerCase()):!1);return i.some(s=>s.startsWith("文件标记 "))||i.unshift("文件标记未记录 / 待确认"),i.some(s=>s.startsWith("加载配置 "))||i.push("加载配置未记录 / 待确认"),i}function Or(n){return JSON.stringify([n.capability,n.spec_key||`unknown:${n.id}`,n.source,n.spec?.model_version||null,n.config?.model_version||null,n.config?.environment_id||null,n.source==="standard"?n.benchmark_id||`unknown:${n.id}`:null,n.cache_condition||null])}function Si(n){const r=new Map,t={none:"无节点结果缓存",loaders:"加载节点缓存",execution:"执行节点缓存",unknown:"未知",mixed:"混合条件"};for(const a of n){const i=Dn(a.cache_condition).kind;r.set(Or(a),`${Ar(a)} / ${M(a.spec_key)} / ${de(a.source)} / 模型 ${M(a.spec?.model_version||a.config?.model_version)} / 环境 ${M(a.config?.environment_id)} / 缓存 ${typeof i=="string"&&t[i]||"未知"}${a.source==="standard"?` / 基准 ${M(a.benchmark_id)}`:""}`)}return[...r]}function qn(n,r,t,a=[]){return`${r||t.find(i=>i.id===n)?.name||a.find(i=>i.worker_id===n)?.worker_name||"未关联执行端"}（${n||"Worker ID 未知"}）`}function $i(n){return n.review?.source==="standard"?"标准样本（人工声明）":n.review?.source==="business"?"业务样本":"未标记"}function qr({title:n,children:r,className:t}){const[a,i]=m.useState(!1);return e.jsxs("details",{className:t,onToggle:s=>{s.currentTarget.open&&i(!0)},children:[e.jsx("summary",{children:n}),a&&(typeof r=="function"?r():r)]})}function tn({title:n,value:r,className:t}){return e.jsx(qr,{title:n,className:t,children:()=>e.jsx("pre",{children:M(r)})})}function un({values:n=[],className:r="warn"}){return e.jsx("ul",{className:r,children:n.map((t,a)=>e.jsx("li",{children:t},a))})}function $n({items:n}){return n.map(([r,t])=>e.jsxs("div",{className:"metric",children:[e.jsx("span",{children:r}),e.jsx("strong",{children:$(t)})]},r))}function Un({headers:n,children:r}){return e.jsx("div",{className:"scroll",tabIndex:0,role:"region","aria-label":n.join(" / "),children:e.jsxs("table",{children:[e.jsx("thead",{children:e.jsx("tr",{children:n.map(t=>e.jsx("th",{scope:"col",children:t},t))})}),e.jsx("tbody",{children:r})]})})}function Ur({resolution:n}){const r=Dr(n);return e.jsxs(e.Fragment,{children:[r.length?e.jsxs(e.Fragment,{children:[new Set(r.map(t=>`${t.width}x${t.height}`)).size>1&&e.jsx("span",{className:"hint",children:"多种成品规格（非单一尺寸）"}),r.map((t,a)=>e.jsx("span",{className:"resolution-variant",children:Fn(t)},a))]}):e.jsx("span",{children:"尺寸未记录"}),D(n?.total_samples)&&n.total_samples>0&&n.complete_samples!==n.total_samples&&e.jsxs("span",{className:"resolution-coverage hint",children:["已知 ",$(n.recorded_samples)," / ",$(n.total_samples)," ","次任务的部分或全部成品"]})]})}function Wr({resolution:n}){return e.jsxs("div",{className:"output-resolution-details",children:[e.jsx("h3",{children:"实际成品"}),e.jsx("div",{className:"actual-resolution",children:e.jsx(Ur,{resolution:n})}),e.jsxs("p",{children:["尺寸覆盖：",$(n?.recorded_samples)," / ",$(n?.total_samples)," ","次已完成任务至少有一个成品尺寸；",$(n?.complete_samples)," /"," ",$(n?.total_samples)," 次已完成任务的全部最终产物都有尺寸。"]}),e.jsxs("p",{children:["已知尺寸产物 ",$(n?.recorded_outputs)," / ",$(n?.total_outputs)," 个",n?.total_outputs==null?"（最终清单不完整，产物总数未知）":"","。"]}),Dr(n).map((r,t)=>e.jsxs("p",{children:[Fn(r),"：",$(r.outputs)," 个产物 / ",$(r.samples)," 次任务"]},t)),e.jsx("p",{className:"hint",children:"同一任务可能包含多种尺寸，各尺寸的任务数不能相加。尺寸来自最终产物记录或受控补采，与技术合格产量、人工验收和采购资格分离；有尺寸不代表技术合格。平均耗时仍为原组成功任务平均，不按尺寸重算。"})]})}function or({summary:n,origin:r}){const t=$e(n);return e.jsxs("div",{className:"model-reference",children:[e.jsx("p",{className:"model-origin",children:r}),n.complete===!1&&e.jsx("p",{className:"warn",children:"不完整 / 未确认完整主模型链；动态选择或未知链路不能推断全部主模型。"}),!t.length&&e.jsx("p",{children:"未获取到模型信息，模型待确认。"}),t.map((a,i)=>e.jsx("p",{children:`${ki(a,i,t.length)||"主模型"}：${M(a.name)}；角色：${M(a.role)}；${Sn(a).join("；")}；非运行时检测`},i)),!!n.auxiliary_models?.length&&e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"hint",children:"辅助模型（不计入主模型名称或精度）"}),n.auxiliary_models?.map((a,i)=>e.jsx("p",{className:"hint",children:`角色：${M(a.role)}；${M(a.name)}；${Sn(a).join("；")}`},i))]})]})}function Br({g:n}){const r={...n.spec?.dimensions,...n.dimensions},t=Fr(n);return e.jsxs("div",{className:"pad",children:[e.jsxs("p",{children:["输入素材：",pn(n).join(" / ")]}),e.jsxs("p",{children:["生成参数：",mn(n,!0)]}),D(r.source_duration)&&e.jsxs("p",{className:"hint",children:["首个输入视频时长：",$(r.source_duration)," 秒（非多段视频合计）"]}),e.jsx("p",{className:"hint",children:"素材数量按任务输入槽位计，同一文件被多次引用也会分别计数；生成参数不是成品实测规格。"}),e.jsxs("p",{children:["来源：",de(n.source),"；有效耗时样本 ",$(n.measured)," / 总样本 ",$(n.samples),"；成功"," ",$(n.done)," / 失败 ",$(n.error)," / 取消 ",$(n.canceled)]}),e.jsxs("p",{children:["mean：",Q(n.mean_seconds),"；P50：",Q(n.p50_seconds),"；P90：",Q(n.p90_seconds),"；最近成功样本：",De(n.last_sample_at)]}),e.jsx("p",{className:"hint",children:"平均值仅使用该组成功任务执行耗时；不包含排队，不等于纯 GPU 计算时间，也不是合格日产能。"}),e.jsxs("p",{children:["执行时配置：",Ge(n.config),"（",dn(n.config_source),"）"]}),e.jsxs("p",{children:["缓存条件：",M(n.cache_condition)]}),e.jsxs("p",{children:["成功 runtime 合计：",Q(n.runtime_seconds),"；占机合计：",Q(n.occupied_seconds),"；实际产出：",$(n.output_count)," ",Ie(n),"。"]}),e.jsxs("p",{children:["单位技术交付：",Q(n.seconds_per_unit)," / ",Ie(n),"；单位人工合格：",Q(n.qualified_seconds_per_unit)," / ",Ie(n),"；已人工验收：",$(n.reviewed),"；全组人工合格数量：",$(n.accepted),"。"]}),e.jsxs("p",{className:"hint",children:["技术基线资格：",n.eligible===!0?"服务端判定具备完整基线证据":n.eligible===!1?"证据不足，不作为已验证采购依据":"未记录","；标准场景编号：",M(n.benchmark_id),"。"]}),e.jsx(Wr,{resolution:n.output_resolution}),t.hasEvidence&&e.jsxs("p",{children:["模型记录覆盖 ",$(t.recorded)," / ",$(t.total)," ","次；覆盖数不是完整主模型链的确认。"]}),t.variants.length>1&&e.jsx("p",{className:"warn",children:"不同任务记录对应不同模型组合；每个组合内的主模型才属于同一个图。全组平均耗时不代表任一组合的专属速度。"}),!t.variants.length&&e.jsx("p",{children:"历史未记录可用主模型证据；不能用当前模板补写历史模型与精度。"}),t.variants.map((a,i)=>e.jsx(or,{summary:a.summary,origin:`历史任务记录组合 ${i+1} · ${a.source==="archived_task"?"保留的原任务记录":"任务提交记录"}${t.hasEvidence?` · ${$(a.samples)} 次记录 / ${$(a.measured)} 次成功耗时`:""}`},i)),t.reference?e.jsxs(e.Fragment,{children:[e.jsx(or,{summary:t.reference,origin:`当前工具默认配置（非历史执行记录）· ${M(t.reference.capability_name)}`}),e.jsx("p",{className:"warn hint",children:"仅为工具模板默认值，不代表用户画布节点当前选中的模型。历史耗时不代表当前模型速度；参考信息不补齐历史覆盖，也不覆盖历史精度。"})]}):!t.variants.length&&e.jsx("p",{className:"hint",children:"未获取到模型信息：当前工具模板未提供、找不到或无法识别。"}),e.jsx(un,{values:On(n)}),e.jsxs("p",{className:"hint",children:["采样日期：",M(n.days),"；配置编号：",M(n.config_id),"；采样编号：",n.id]}),e.jsx(tn,{title:"原始规格与证据",value:{dimensions:n.dimensions,spec:n.spec,output_resolution:n.output_resolution,recovered_outputs:n.recovered_outputs,model_summary:n.model_summary,model_evidence:n.model_evidence,current_model_reference:n.current_model_reference,cache_condition:n.cache_condition}})]})}function Hr({groups:n,report:r}){return n.length?e.jsx(Un,{headers:["业务 / 执行端 / 来源","精确业务规格","样本覆盖","成功任务耗时分布","运行参考 / 产出口径","警告与限制"],children:n.map(t=>e.jsxs("tr",{"data-group-id":t.id,children:[e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsx("strong",{children:Re(t)}),e.jsxs("p",{className:"hint",children:["能力 ID：",t.capability]}),e.jsx("p",{className:"hint",children:qn(t.worker_id,t.worker_name,r.workers,r.groups)}),e.jsx("span",{className:"badge",children:de(t.source)}),e.jsxs("p",{className:"hint",children:["配置：",M(t.config_id)]}),t.source==="standard"&&e.jsxs("p",{className:"hint",children:["标准场景编号：",M(t.benchmark_id)]})]})}),e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsxs("p",{children:["规格键：",M(t.spec_key)]}),e.jsxs("p",{className:"hint",children:["已知规格：",M(t.dimensions)]}),e.jsx(qr,{title:"配置 / 规格 / 日期证据",children:()=>e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["执行时配置：",Ge(t.config)]}),e.jsxs("p",{children:["配置来源：",dn(t.config_source)]}),e.jsxs("p",{children:["采样日期（服务端记录）：",M(t.days)]}),e.jsxs("p",{children:["缓存条件：",M(t.cache_condition)]}),e.jsx("pre",{children:M(t.spec)})]})})]})}),e.jsx("td",{children:e.jsxs("div",{children:[e.jsxs("p",{children:["样本 ",$(t.samples)," / ",$(Tn(t))," 天"]}),e.jsxs("p",{children:["完成 ",$(t.done)," / 失败 ",$(t.error)," / 取消 ",$(t.canceled)]}),e.jsxs("p",{className:"hint",children:["有效耗时样本 ",$(t.measured),"；已人工验收 ",$(t.reviewed)]})]})}),e.jsx("td",{children:e.jsxs("div",{children:[e.jsxs("p",{children:["平均 ",Q(t.mean_seconds)]}),e.jsxs("p",{children:["P50 ",Q(t.p50_seconds)]}),e.jsxs("p",{children:["P90 ",Q(t.p90_seconds)]})]})}),e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsxs("p",{children:["成功任务 runtime 合计 ",Q(t.runtime_seconds)]}),e.jsxs("p",{children:["成功任务 / 运行小时（仅 runtime 参考）：",$(t.reference_per_hour)]}),t.source!=="historical"&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["占机合计 ",Q(t.occupied_seconds)]}),e.jsxs("p",{children:["实际产出 ",$(t.output_count)," ",Ie(t)]}),e.jsxs("p",{children:["单位技术交付 ",Q(t.seconds_per_unit)," / ",Ie(t)]}),e.jsxs("p",{children:["单位人工合格 ",Q(t.qualified_seconds_per_unit)," / ",Ie(t)]})]})]})}),e.jsx("td",{className:"wide",children:e.jsx(un,{values:On(t)})})]},t.id))}):e.jsx("p",{className:"empty",children:"暂无业务规格样本；未测试场景不能推算产能。"})}function zi({items:n}){return e.jsx("dl",{children:n.map(([r,t])=>e.jsxs(m.Fragment,{children:[e.jsx("dt",{children:r}),e.jsx("dd",{children:t})]},r))})}function Ci({entries:n,worker:r,title:t,ready:a,onEvidence:i}){const[s,o]=m.useState(()=>_i(n)?.id||""),[l,p]=m.useState(!1),[d,c]=m.useState(!1),f=`summary-evidence-${m.useId().replace(/[^a-zA-Z0-9_-]/g,"")}`,u=n.find(_=>_.id===s)||n[0];if(!u)return null;const y=Fr(u),j=y.variants.length?y.variants.map(_=>_.summary):y.reference?[y.reference]:[],w=j.reduce((_,L)=>_+Math.max(1,$e(L).length),0)||1,v=n.map(wi),b=new Map;for(const _ of v)b.set(_,(b.get(_)||0)+1);const h=y.variants.length?y.variants.length>1||y.hasEvidence&&D(y.recorded)&&D(y.total)&&y.recorded<y.total||y.variants.some(_=>_.summary.complete===!1)?"全组历史任务平均，非某个模型或组合专属速度。":"":y.reference?"此处耗时来自历史任务，不代表当前模型速度。":"",x={"--model-rows":w+1};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"business-row","data-capability":u.capability,"data-selected-group-id":u.id,children:[e.jsxs("div",{className:"matrix-field","data-label":"平均生成时间",children:[e.jsx("span",{className:rn(u)?"mean-time":"muted",children:rn(u)?vi(u.mean_seconds):"暂无成功耗时"}),h&&e.jsx("p",{className:"warn hint",children:h}),rn(u)&&D(u.mean_seconds)&&(u.mean_seconds<1||u.mean_seconds>3600)&&e.jsx("p",{className:"warn hint",children:"耗时异常，请核对详情"})]}),e.jsxs("div",{className:"matrix-samples","data-label":"样本与详情",children:[e.jsxs("p",{className:!D(u.measured)||u.measured<30?"warn hint":"hint",children:[D(u.measured)?u.measured<30?`仅 ${$(u.measured)} 次 / 仅供参考`:`${$(u.measured)} 次成功实测`:"样本数未记录"," ","· ",de(u.source)]}),e.jsx("button",{type:"button",className:"summary-detail-toggle","aria-expanded":l,"aria-controls":f,onClick:()=>{p(!l),l||c(!0)},children:l?"收起详情":"查看详情"})]}),e.jsxs("div",{className:"matrix-field","data-label":"任务规格",children:[e.jsx("select",{className:"summary-spec",disabled:!a,"aria-label":`${r.name||"机器"} ${t}任务规格`,title:`原组 ${u.id} / 配置 ${M(u.config_id)} / ${de(u.source)} / 规格键 ${M(u.spec_key)}`,value:u.id,onChange:_=>{a&&(o(_.target.value),c(l))},children:n.map((_,L)=>e.jsx("option",{value:_.id,children:`${v[L]}${(b.get(v[L]||"")||0)>1?` · ${de(_.source)} · ${D(_.last_sample_at)?De(_.last_sample_at):"日期未记录"} · 采样 ${L+1}`:""}`},_.id))}),e.jsxs("dl",{className:"selected-spec",children:[e.jsx("dt",{children:"输入素材"}),e.jsx("dd",{className:"input-materials",children:pn(u).map(_=>e.jsx("span",{children:_},_))}),e.jsx("dt",{children:"生成参数"}),e.jsx("dd",{className:"generation-parameters",children:mn(u)}),e.jsx("dt",{children:"实际成品"}),e.jsx("dd",{className:"actual-resolution",children:e.jsx(Ur,{resolution:u.output_resolution})})]})]}),e.jsxs("div",{className:"matrix-models",style:x,children:[e.jsx("div",{className:"matrix-field","data-label":"模型名称",children:j.length?j.map((_,L)=>e.jsx("div",{className:"model-variant",children:$e(_).length?$e(_).map((A,N)=>e.jsx("div",{className:"model-item",children:e.jsx("p",{className:"model-name",children:A.name||"未获取到模型信息"})},N)):e.jsx("p",{className:"muted",children:"未获取到模型信息"})},L)):e.jsx("span",{className:"muted",children:"未获取到模型信息"})}),e.jsx("div",{className:"matrix-field","data-label":"模型精度",children:j.length?j.map((_,L)=>e.jsx("div",{className:"model-variant",children:$e(_).length?$e(_).map((A,N)=>e.jsx("div",{className:"model-item",children:Ni(A).map(S=>e.jsx("p",{className:"model-label",children:S},S))},N)):e.jsx("p",{className:"muted",children:"无"})},L)):e.jsx("p",{className:"muted",children:"无"})})]})]}),e.jsx("div",{className:"summary-evidence",id:f,hidden:!l,children:d&&e.jsxs(e.Fragment,{children:[e.jsx(Br,{g:u},u.id),e.jsx("button",{type:"button","data-evidence-entry":"",disabled:!a,onClick:()=>{a&&i(u.id)},children:"任务证据"})]})})]})}function Mi({report:n,ready:r,includeOffline:t,onProfile:a,onEvidence:i}){const s=n.workers.filter(d=>t||xe(d));if(!s.length)return e.jsx("p",{className:"empty",children:t?"暂无机器记录。":"当前没有在线机器，可勾选“包含离线”查看已登记记录。"});const o=new Set(s.map(d=>d.id)),l=new Map;for(const d of n.groups)if(d.worker_id&&o.has(d.worker_id)){let c=l.get(d.capability);c||(c={title:Re(d),machines:new Map},l.set(d.capability,c)),c.machines.set(d.worker_id,[...c.machines.get(d.worker_id)||[],d])}l.size||l.set("",{title:"历史记录",machines:new Map});const p={"--machine-count":s.length};return e.jsx("div",{className:"scroll comparison-scroll",tabIndex:0,role:"region","aria-label":"机器产能对比表，可横向滚动",children:e.jsxs("table",{className:"simple-table matrix-table","aria-label":"机器与业务能力对比",style:p,children:[e.jsxs("colgroup",{children:[e.jsx("col",{className:"matrix-axis-col"}),s.map(d=>e.jsx("col",{},d.id))]}),e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"business-axis",scope:"col",children:"业务能力"}),s.map((d,c)=>e.jsxs("th",{className:"machine-heading",scope:"col",id:`summary-machine-${c+1}`,"data-summary-worker-id":d.id,children:[e.jsx("h3",{children:d.name||"未命名机器"}),e.jsx("span",{className:["busy","running"].includes(d.state)?"warn":xe(d)?"online-state":"muted",children:An[d.state]||"状态待确认"}),e.jsx("p",{className:"machine-hardware",children:bi(d)}),e.jsxs("details",{className:"machine-more",children:[e.jsx("summary",{children:"机器详情"}),e.jsx("p",{children:yi(d)}),e.jsxs("p",{className:"hint",children:["最后上报：",De(d.last_seen),"；Worker ID：",d.id,"；采集程序版本：",M(d.agent_version)]}),!xe(d)&&e.jsx("p",{className:"hint",children:"此记录当前不可用，配置为最后上报信息，历史速度不代表现在能执行。"}),e.jsx("button",{type:"button",onClick:()=>a(d),children:"查看配置"})]})]},d.id))]})}),e.jsx("tbody",{children:[...l].map(([d,{title:c,machines:f}],u)=>e.jsxs("tr",{className:"capability-row","data-capability":d||void 0,children:[e.jsx("th",{className:"business-axis",scope:"row",id:`summary-business-${u+1}`,children:e.jsx("span",{className:"business-title",children:c})}),s.map((y,j)=>{const w=f.get(y.id);return e.jsx("td",{className:"machine-result","data-summary-worker-id":y.id,headers:`summary-machine-${j+1} summary-business-${u+1}`,children:w?e.jsx(Ci,{entries:w,worker:y,title:c,ready:r,onEvidence:i}):e.jsx("p",{className:"matrix-empty",children:"暂无记录；不据此推断是否支持该业务。"})},y.id)})]},d))})]})})}function Ei({report:n,mounted:r,onProfile:t}){const a=n?.overview||{};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"summary",children:[e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"生成任务"}),e.jsx("span",{className:"hint",children:"不是产物数量"})]}),e.jsx("div",{id:"task-metrics",className:"metrics pad",children:r&&e.jsx($n,{items:[["总任务",a.tasks],["完成",a.done],["失败",a.error],["取消",a.canceled]]})}),e.jsx("p",{id:"coverage",className:"hint pad",children:r&&`历史 ${$(a.historical_tasks)} / 新采集 ${$(a.captured_tasks)}；Worker 未关联 ${$(a.unknown_worker)}；已排除 API ${$(a.excluded_api)}。`})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"实际产物"}),e.jsx("span",{className:"hint",children:"仅已知输出，不从请求推断"})]}),e.jsx("div",{id:"output-metrics",className:"metrics pad",children:r&&e.jsx($n,{items:[["图片（张）",a.output_images],["视频（条）",a.output_videos],["视频总时长（秒）",a.output_seconds],["产物未知记录",a.unknown_outputs]]})}),e.jsx("p",{className:"hint pad",children:"图片、视频、时长分别统计；未知不记为零，也不计为人工合格。"})]})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"机器配置与状态"}),e.jsx("span",{className:"hint",children:"按 Worker ID 区分，名称相同不合并"})]}),e.jsx("p",{className:"notice hint",children:"配置为当前或最后上报信息，不代表历史执行快照，也不是最低采购配置。系统可见内存不是标称容量，多卡显存不相加。"}),e.jsx("div",{id:"workers",className:"worker-grid",children:r&&n&&(n.workers.length?n.workers.map(i=>{const s=i.hardware,o=["offline","disabled"].includes(i.state)||!D(i.last_seen)||Date.now()/1e3-i.last_seen>120;return e.jsxs("article",{className:"worker","data-worker-id":i.id,children:[e.jsx("h3",{children:M(i.name)}),e.jsxs("p",{className:"hint",children:["Worker ID：",i.id]}),e.jsx("span",{className:"badge",children:An[i.state]||i.state}),e.jsxs("p",{className:o?"warn":"hint",children:["最后心跳：",De(i.last_seen),o?"；状态 / 配置快照已过期或无法确认，请勿视为实时。":""]}),e.jsx(zi,{items:[["GPU",s?.gpus?.length?s.gpus.map((l,p)=>`GPU ${p+1}：${M(l.name)} / 单卡显存 ${Te(l.memory_total_bytes)}`).join(`
`):"未知"],["GPU 数量",s?.gpus?.length?$(s.gpus.length):"未知"],["CPU",Ve(s?.cpu,"cpu")],["内存",Te(s?.memory_total_bytes)],["系统",Ve(s?.os,"os")],["环境",M(s?.environment_id)],["模型版本",M(s?.model_version)],["主机 ID",M(s?.host_id)],["磁盘",M(s?.disk)],["配置备注",M(s?.note)]]}),e.jsxs("p",{className:"hint",children:["配置来源：",dn(i.hardware_source),"。人工补录不回写历史快照。"]}),e.jsxs("p",{children:["任务 ",$(i.tasks)," / 完成 ",$(i.done)," / 失败 ",$(i.error)," / 取消"," ",$(i.canceled)]}),e.jsxs("p",{className:"hint",children:["累计 runtime：",Q(i.runtime_seconds)]}),i.id&&i.state!=="historical"?e.jsxs("details",{className:"profile-details",children:[e.jsx("summary",{children:"补录机器配置（人工声明）"}),e.jsx("p",{className:"hint",children:"7 个字段仅保存非空新声明，不回写历史快照。"}),e.jsx("button",{type:"button",onClick:()=>t(i),children:"查看 / 补录配置"})]}):e.jsx("p",{className:"hint",children:"历史执行端未关联现存注册记录，不能补录配置。"})]},i.id)}):e.jsx("p",{className:"empty",children:"暂无执行端信息；无法关联的历史任务不会按名称猜测机器。"}))})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"业务规格分组"}),e.jsx("span",{className:"hint",children:"原始统计保留失败、取消与异常记录"})]}),e.jsx("div",{id:"machine-groups",children:r&&n&&e.jsx(Hr,{groups:n.groups,report:n})})]})]})}const Pi={mode:"historical",quality:"technical",availability:1,utilization:.75},ve=[{id:"zimage_t2i",type:"生图模式",label:"文生图",capabilities:["zimage_t2i","krea2_t2i","qwen_image_2512_t2i","qwen_image_21_t2i"]},{id:"zimage_i2i",type:"生图模式",label:"图生图",capabilities:["zimage_i2i","krea2_i2i","qwen_image_edit_2511_i2i","qwen_image_21_multi","qwen_image_21_i2i"]},{id:"flux2_klein_storyboard9",type:"生图模式",label:"多宫格故事分镜",capabilities:["flux2_klein_storyboard9"]},{id:"flux2_klein_edit",type:"生图模式",label:"参考图编辑(保人物)",capabilities:["flux2_klein_edit"]},{id:"minimax_h3_character_transfer",type:"生视频模式",label:"H3人物迁移",capabilities:["minimax_h3_character_transfer"]},{id:"minimax_h3_flf2v",type:"生视频模式",label:"H3 图生视频",capabilities:["minimax_h3_i2v","minimax_h3_flf2v"]},{id:"minimax_h3_talk2",type:"生视频模式",label:"H3 说话唱歌",capabilities:["minimax_h3_talk1","minimax_h3_talk2"]},{id:"minimax_h3_ref4",type:"生视频模式",label:"H3图片参考",capabilities:["minimax_h3_ref4"]},{id:"minimax_h3_comic20",type:"生视频模式",label:"漫剧4宫格",capabilities:["minimax_h3_comic20"]},{id:"minimax_h3_fusion_v2",type:"生视频模式",label:"H3无损融合单采V2",capabilities:["minimax_h3_fusion_v2"]},{id:"minimax_h3_fusion_v3",type:"生视频模式",label:"H3无损融合单采V3",capabilities:["minimax_h3_fusion_v3"]},{id:"minimax_h3_ref9",type:"生视频模式",label:"H3全能参考",capabilities:["minimax_h3_ref9"]},{id:"minimax_h3_ref_2pass",type:"生视频模式",label:"H3全能参考(高质量)",capabilities:["minimax_h3_ref_2pass"]}],zn=n=>ve.find(r=>n!==void 0&&r.capabilities.includes(n)),Ri=n=>JSON.stringify(n.source==="standard"?[n.config_id||null,n.source,n.benchmark_id||`unknown:${n.id}`]:[n.config_id||null,n.source]),Ii=n=>D(n.mean_seconds)&&n.mean_seconds>0&&D(n.measured)&&n.measured>0;function hn(n,r){return n.workers.some(t=>t.id===r&&xe(t))?n.groups.filter(t=>t.worker_id===r&&["historical","captured","standard"].includes(t.source)&&zn(t.capability)&&Ii(t)):[]}const Vr=(n,r)=>n<r?-1:n>r?1:0;function Li(n,r){return(r.measured||0)-(n.measured||0)||(r.samples||0)-(n.samples||0)||(r.last_sample_at||0)-(n.last_sample_at||0)||(r.mean_seconds||0)-(n.mean_seconds||0)||Vr(n.id,r.id)}function Ai(n,r){const t=new Map;for(const s of r){const o=Ri(s);t.set(o,[...t.get(o)||[],s])}const a=[];for(const[s,o]of t){const l=[];for(const p of n){const d=ve.find(f=>f.id===p.mode_id),c=o.filter(f=>d?.capabilities.includes(f.capability)).sort(Li)[0];c&&l.push(c)}l.length===n.length&&a.push({key:s,groups:l,measured:l.reduce((p,d)=>p+(d.measured||0),0)})}a.sort((s,o)=>o.measured-s.measured||Vr(s.key,o.key));const i=a[0];if(!i)throw Error("所选模式没有同一电脑、同一配置和来源的共同实测记录，请减少模式或换一台电脑");return i.groups}function Ti(n,r,t,a,i,s){if(!n.workers.some(d=>d.id===t&&xe(d)))throw Error("所选电脑当前不在线，请刷新后重新选择。");const o=hn(n,t),l=new Set;for(const d of s){const c=ve.find(f=>f.id===d.mode_id);if(!c||!o.some(f=>c.capabilities.includes(f.capability)))throw Error("所选模式没有成功耗时记录，请换一个模式或电脑。");if(l.has(d.mode_id))throw Error("同一模式请合并每日需求，不能重复选择。");if(l.add(d.mode_id),!D(Number(d.quantity))||Number(d.quantity)<=0)throw Error("每日需求必须是大于零的有限任务数量。")}if(!s.length)throw Error("请至少添加一个有样本的业务模式。");const p=Ai(s,o);return Rr.parse({...r,...Pi,worker_id:t,hours:Number(a),...i!==""?{price:Number(i)}:{},demands:s.map((d,c)=>{const f=p[c];if(!f)throw Error("原组证据缺失");return{group_id:f.id,quantity:Number(d.quantity)}})})}const Gr=[{key:"host_id",label:"主机 ID",maxLength:160},{key:"cpu",label:"CPU 型号",maxLength:160},{key:"memory_total_bytes",label:"系统可见内存（GiB）"},{key:"environment_id",label:"执行环境版本",maxLength:160},{key:"model_version",label:"模型版本",maxLength:160},{key:"disk",label:"磁盘配置说明",maxLength:160},{key:"note",label:"配置备注",maxLength:500}];function Cn(n,r){if(Array.from(n).some(t=>t.charCodeAt(0)<32||t.charCodeAt(0)===127))throw Error(r)}function Di(n,r){const t={};for(const{key:a}of Gr){const i=(n[a]||"").trim();if(i)if(Cn(i,"配置字段请使用不含控制字符的单行文本。"),a==="memory_total_bytes"){const s=Math.round(Number(i)*1073741824);if(!Number.isSafeInteger(s)||s<=0)throw Error("内存必须是能转换为安全正整数字节的 GiB 数值。");s!==r?.[a]&&(t[a]=s)}else i!==(a==="cpu"?Ve(r?.cpu,"cpu"):r?.[a])&&(t[a]=i)}if(!Object.keys(t).length)throw Error("没有需要保存的修改；留空不会删除已有配置。");return Ir.parse(t)}function Fi(n){const r=n.accepted===""?null:Number(n.accepted);if(r!==null&&(!Number.isSafeInteger(r)||r<0))throw Error("请输入非负整数，或留空表示未验收。");const t=(n.benchmark_id||"").trim(),a=(n.note||"").trim();if(n.source==="standard"&&!t)throw Error("标准样本需要填写标准场景编号；标签不代表自动验证。");return Cn(a,"验收备注和标准场景编号请使用单行文本，不含换行或控制字符。"),Cn(t,"验收备注和标准场景编号请使用单行文本，不含换行或控制字符。"),Lr.parse({accepted:r,source:n.source,benchmark_id:t,note:a})}function Oi(n){let r=n==null?"":typeof n=="object"?JSON.stringify(n):String(n);return/^[\s]*[=+\-@]/.test(r)&&(r="'"+r),'"'+r.replace(/"/g,'""')+'"'}function qi(n){return"\uFEFF"+[["类别","内容"],["测算口径","历史任务运行参考，不是合格日产能"],["输入与时间范围",n.payload],["当前机器配置（非历史快照）",n.hardware],["测算结果",n.result],...n.groups.map(t=>["场景证据",{...t,warnings:On(t)}])].map(t=>t.map(Oi).join(",")).join(`\r
`)}function Ui({worker:n,controller:r,onClose:t}){const[a,i]=m.useState({});return e.jsx(re,{title:n.state==="historical"?"历史执行端配置":`机器配置与人工补录 · ${n.name||n.id}`,className:"capacity-page",onClose:t,submitLabel:n.state==="historical"?"关闭":"保存人工配置",onSubmit:n.state==="historical"?async()=>{}:async()=>{const s=Di(a,n.hardware);try{await r.saveProfile(n.id,s)}catch(o){throw Error(`保存失败：${ee(o)}。输入已保留，请检查字段后重试。`)}},children:n.state==="historical"?e.jsx("p",{children:Ge(n.hardware)}):e.jsxs("div",{className:"capacity-operation",children:[e.jsxs("details",{children:[e.jsx("summary",{children:"当前 / 最后上报配置"}),e.jsx("p",{children:Ge(n.hardware)}),e.jsxs("p",{children:["配置来源：",dn(n.hardware_source),"；配置备注：",M(n.hardware?.note)]})]}),e.jsx("p",{className:"notice",children:"仅保存本次修改的非空字段；留空保留原值。内存以 GiB 输入、按字节保存，不是采购标称容量。新声明仅向后生效，不回写历史快照。"}),e.jsx("p",{className:"hint",children:"主机 ID 仅在人工确认属于同一物理机器时填写相同值，不按机器名称合并；同机多个 Worker 不自动代表多倍产能。"}),e.jsx("div",{className:"profile-form",children:Gr.map(({key:s,label:o,maxLength:l})=>e.jsxs("label",{className:"field",children:[e.jsx("span",{children:o}),e.jsx("input",{name:s,type:s==="memory_total_bytes"?"number":"text",min:s==="memory_total_bytes"?"0.000001":void 0,step:s==="memory_total_bytes"?"any":void 0,maxLength:l,placeholder:["model_version","environment_id"].includes(s)?"填写固定版本，勿用 latest / main / unknown":"留空保留现值",value:a[s]||"",onChange:p=>{i({...a,[s]:p.target.value}),r.invalidateEstimate("机器配置输入已更改；请保存后重新计算，未保存内容不会进入测算。")}})]},s))})]})})}function Wi({detail:n,controller:r,onClose:t}){const[a,i]=m.useState({accepted:D(n.review?.accepted)?String(n.review.accepted):"",source:n.review?.source==="standard"?"standard":"business",benchmark_id:n.review?.benchmark_id||"",note:n.review?.note||""}),s=(o,l)=>{i({...a,[o]:l}),r.invalidateEstimate("人工验收输入已变更；未保存内容不会进入测算。")};return e.jsx(re,{title:`人工验收 · ${n.job_id}`,className:"capacity-page",onClose:t,submitLabel:"保存人工标记",onSubmit:async()=>{const o=Fi(a);try{await r.saveReview(n.job_id,o)}catch(l){throw Error(`保存失败：${ee(l)}`)}},children:e.jsxs("div",{className:"review-form",children:[e.jsxs("p",{children:["任务 ",n.job_id,"；原采集来源：",de(n.source),"。"]}),e.jsxs("div",{className:"review-fields",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"人工合格产物数量（留空为未验收）"}),e.jsx("input",{name:"accepted",type:"number",min:"0",step:"1",value:a.accepted,onChange:o=>s("accepted",o.target.value)})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"人工样本标签"}),e.jsxs("select",{name:"source",value:a.source,onChange:o=>s("source",o.target.value),children:[e.jsx("option",{value:"business",children:"业务样本"}),e.jsx("option",{value:"standard",children:"标准样本（人工声明）"})]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"标准场景编号（标准样本请填写）"}),e.jsx("input",{name:"benchmark_id",maxLength:100,value:a.benchmark_id,onChange:o=>s("benchmark_id",o.target.value)})]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"验收备注 / 固定条件说明"}),e.jsx("textarea",{name:"note",rows:2,maxLength:500,value:a.note,onChange:o=>s("note",o.target.value)})]}),e.jsx("p",{className:"notice",children:"此操作只保存人工声明，不会自动确认技术规格、缓存条件或标准测试通过；不会将历史记录补写为完整采集证据。"})]})})}function Bi({confirmation:n,onClose:r}){return e.jsx(re,{title:`确认受控补采 · ${n.detail.job_id}`,className:"capacity-page",onClose:r,submitLabel:"确认本批补采",onSubmit:n.submit,children:e.jsxs("div",{className:"capacity-operation",children:[e.jsxs("p",{className:"notice",children:["任务 ",n.detail.job_id,"；本批偏移 ",n.offset,"，最多处理 4 个可信最终产物。"]}),e.jsx("p",{children:"补采仅添加成品尺寸证据，不修改技术资格、原生成参数、人工合格量或标准标签。最终清单由服务端核验；不会扫描目录，也不会从请求猜测尺寸。"}),e.jsxs("details",{children:[e.jsx("summary",{children:"本页已记录的最终产物（最终以服务端可信清单为准）"}),e.jsx("pre",{children:M(n.detail.outputs)})]})]})})}function Hi({detail:n,controller:r,onConfirm:t}){const[a,i]=m.useState(0),[s,o]=m.useState(""),[l,p]=m.useState(!1),d=m.useRef(!0),c=m.useRef(!1),f=m.useRef(0);m.useEffect(()=>(d.current=!0,()=>{d.current=!1}),[]);const u=async(y,j)=>{if(!d.current||!r.probeCurrent(j)||f.current!==y)throw Error("证据页面或批次已变化，请关闭后重新打开。");if(c.current)throw Error("正在补采，请勿重复提交。");c.current=!0,p(!0),o("正在补采本批成品尺寸…"),r.invalidateEstimate("成品尺寸正在补采，旧测算已清除。");try{const w=await r.probe(n.job_id,y);if(!d.current)return;f.current=w.next_offset,i(w.next_offset),o(`本批处理 ${$(w.processed)} 个，成功记录尺寸 ${$(w.recorded)} 个；可信最终产物共 ${$(w.total)} 个。${w.next_offset===null?"补采已完成，刷新看板查看结果。":"尚有后续产物，请点击继续补采；刷新看板查看结果。"}`)}catch(w){const v=`补采失败：${ee(w)}${w instanceof Jr&&w.status===409?"。没有可信最终产物记录，不能猜测成品尺寸。":""}`;throw d.current&&o(v),Error(v)}finally{c.current=!1,d.current&&p(!1)}};return e.jsxs("div",{className:"output-probe",children:[e.jsx("p",{className:"hint",children:"仅按可信最终产物清单补采，每次最多 4 个；不会从输入素材或请求参数猜测尺寸。"}),e.jsx("button",{type:"button",disabled:l||a===null,onClick:()=>{if(c.current||a===null||!d.current)return;const y=a,j=r.probeVersion();t({detail:n,offset:y,submit:()=>u(y,j)})},children:a===null?"补采已完成":a>0?"继续补采成品尺寸":"补采成品尺寸"}),e.jsx("p",{className:"hint",role:"status",children:s})]})}function Vi({detail:n,report:r,controller:t,onReview:a,onProbe:i}){const[s,o]=m.useState(!1);return e.jsxs("details",{className:"evidence","data-job-id":n.job_id,onToggle:l=>{l.currentTarget.open&&o(!0)},children:[e.jsxs("summary",{children:[e.jsx("strong",{children:n.job_id}),e.jsx("span",{className:"badge",children:de(n.source)}),e.jsx("span",{children:` ${An[n.status]||n.status} / ${n.capability} / ${qn(n.worker_id,n.worker_name,r.workers,r.groups)} / ${De(n.created_at)}`})]}),e.jsx("div",{className:"evidence-content",children:s&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["任务 runtime：",Q(n.runtime_seconds),"；占机：",Q(n.occupied_seconds),"；原分组：",M(n.group_id)]}),e.jsx(un,{values:n.warnings}),e.jsx("div",{className:"f-grid3",children:[["输入素材",pn(n).join(" / ")],["生成参数",mn(n,!0)],["技术与人工口径","技术资格以原采集证据及服务端校验为准；尺寸补采与人工标签不修改它。"]].map(([l,p])=>e.jsxs("div",{children:[e.jsx("h3",{children:l}),e.jsx("p",{children:p})]},l))}),e.jsx(tn,{title:"执行尝试（包含重试）",value:n.attempts}),e.jsx("h3",{children:"实际输出证据"}),n.outputs?.length?e.jsx(Un,{headers:["产物标识","类型","实际尺寸","视频时长","技术记录"],children:n.outputs.map((l,p)=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("span",{children:l.key||l.id||"未记录"})}),e.jsx("td",{children:e.jsx("span",{children:M(l.kind)})}),e.jsx("td",{children:e.jsx("span",{children:ji(l)})}),e.jsx("td",{children:e.jsx("span",{children:Q(l.duration)})}),e.jsx("td",{children:e.jsx("span",{children:l.valid===!0?"采集记录标记有效":l.valid===!1?"未通过 / 待确认":"未记录"})})]},p))}):e.jsx("p",{className:"notice",children:"最终产物清单未记录；不能按请求猜测，也不按零产物处理。"}),e.jsx(tn,{title:"实际输出原始证据",value:n.outputs}),e.jsxs("p",{children:["人工合格数量：",$(n.review?.accepted),"；样本标签：",$i(n),"；标准场景编号：",M(n.review?.benchmark_id),"；备注：",M(n.review?.note)]}),e.jsx(Wr,{resolution:n.output_resolution}),e.jsx(tn,{title:"成品尺寸原始证据",className:"output-resolution-raw",value:{output_resolution:n.output_resolution,recovered_outputs:n.recovered_outputs}}),n.status==="done"&&e.jsx(Hi,{detail:n,controller:t,onConfirm:i}),["captured","standard"].includes(n.source)?e.jsx("button",{className:"review-open",type:"button",onClick:()=>a(n),children:"人工验收 / 样本标签"}):e.jsx("p",{className:"hint",children:"历史任务不能补写为完整采集证据，不提供采集验收表单。"})]})})]})}function Gi({controller:n,onReview:r,onProbe:t}){const a=n.getSnapshot(),{report:i,evidence:s,filters:o,ready:l}=a,p=a.mounted.has("evidence")&&i!==null,d=!l||s.busy||s.failed||!p;return e.jsxs("section",{"aria-labelledby":"evidence-heading",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{id:"evidence-heading",children:"任务证据与人工标记"}),e.jsx("span",{id:"detail-count",className:"hint",children:p&&(s.failed?"筛选未完成":s.busy?"":`当前 ${s.records.length} / 总计 ${$(s.total)} 条；聚合不受分页截断`)})]}),e.jsx("p",{className:"hint pad",children:"明细每页最多 100 条。人工验收 / 标准样本是人工声明，不等于系统自动验证通过；历史记录不可补写为完整采集证据。"}),e.jsx("div",{id:"evidence-filters",children:p&&e.jsxs("div",{className:"evidence-filters",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"独立原分组（按真实 group_id）"}),e.jsxs("select",{id:"evidence-group",disabled:!l,value:o.group,onChange:c=>n.filter({group:c.target.value}),children:[e.jsx("option",{value:"",children:"全部原分组"}),i.groups.map(c=>e.jsx("option",{value:c.id,children:`${Re(c)} / ${qn(c.worker_id,c.worker_name,i.workers,i.groups)} / ${de(c.source)} / ${c.config_id||"配置未知"} / ${c.id}`},c.id))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"任务状态"}),e.jsxs("select",{id:"evidence-status",disabled:!l,value:o.status,onChange:c=>n.filter({status:c.target.value}),children:[e.jsx("option",{value:"",children:"全部状态"}),[["done","已完成"],["error","失败"],["canceled","已取消"],["queued","排队中"],["running","运行中"]].map(([c,f])=>e.jsx("option",{value:c,children:f},c))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"采集来源"}),e.jsxs("select",{id:"evidence-source",disabled:!l,value:o.source,onChange:c=>n.filter({source:c.target.value}),children:[e.jsx("option",{value:"",children:"全部来源"}),["historical","captured","standard"].map(c=>e.jsx("option",{value:c,children:de(c)},c))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"每页最多 100 条"}),e.jsx("select",{id:"evidence-size",disabled:!l,value:o.size,onChange:c=>n.filter({size:Number(c.target.value)}),children:[100,50,25,10].map(c=>e.jsxs("option",{value:c,children:[c," 条 / 页"]},c))})]})]})}),e.jsx("p",{id:"evidence-state",className:"hint pad",role:"status",hidden:!s.state,children:s.state}),e.jsx("div",{id:"details",children:p&&!s.busy&&!s.failed&&(s.records.length?s.records.map(c=>e.jsx(Vi,{detail:c,report:i,controller:n,onReview:r,onProbe:t},c.job_id)):e.jsx("p",{className:"empty",children:"当前页没有任务证据。可立即刷新，或返回上一页。"}))}),e.jsxs("div",{className:"pager",children:[e.jsx("button",{id:"previous",disabled:d||s.start===0,onClick:()=>n.page(-1),children:"上一页"}),e.jsx("span",{id:"page-note",className:"hint",children:p&&!s.busy&&!s.failed&&`第 ${Math.floor(s.start/s.size)+1} 页`}),e.jsx("button",{id:"next",disabled:d||s.start+s.size>=s.total,onClick:()=>n.page(1),children:"下一页"})]})]})}function Ki(n,r){const t=n.workers.filter(xe);return t.find(a=>a.id===r)?.id||t.find(a=>hn(n,a.id).length)?.id||t[0]?.id||""}function lr(n,r,t){const a=hn(n,r);return{id:t,mode_id:ve.find(i=>a.some(s=>i.capabilities.includes(s.capability)))?.id||"",quantity:""}}function Ji(n,r,t){const[a,i]=m.useState({report:null,worker:"",demands:[],next:1}),[s,o]=m.useState("8"),[l,p]=m.useState("");if(t&&r&&r!==a.report){const b=Ki(r,a.worker);i({report:r,worker:b,demands:[lr(r,b,a.next)],next:a.next+1})}const d=r?hn(r,a.worker):[],c=()=>n.invalidateEstimate(),f=b=>{r&&(i({...a,worker:b,demands:[lr(r,b,a.next)],next:a.next+1}),c())},u=(b,h)=>{i({...a,demands:a.demands.map(x=>x.id===b?{...x,...h}:x)}),c()},y=b=>{i({...a,demands:a.demands.filter(h=>h.id!==b)}),c()},j=b=>{const h=ve.find(x=>x.id===b);return!!(h&&d.some(x=>h.capabilities.includes(x.capability)))};return{inputs:a,groups:d,hours:s,price:l,worker:f,update:u,remove:y,available:j,add:()=>{if(!n.getSnapshot().ready)return;const b=ve.find(h=>!a.demands.some(x=>x.mode_id===h.id)&&j(h.id));b&&(i({...a,demands:[...a.demands,{id:a.next,mode_id:b.id,quantity:""}],next:a.next+1}),c())},submit:async()=>{n.invalidateEstimate("正在计算…");const b=n.getSnapshot().snapshot;try{if(!r||!n.getSnapshot().ready||!b)throw Error("请先点击立即刷新并成功读取证据。");await n.estimate(Ti(r,b.range,a.worker,s,l,a.demands))}catch(h){n.estimateFailure(ee(h))}},setHours:b=>{o(b),c()},setPrice:b=>{p(b),c()}}}function Xi(n){const[r,t]=m.useState("");return m.useEffect(()=>{if(!n)return;const a=URL.createObjectURL(new Blob([qi(n)],{type:"text/csv;charset=utf-8"}));return t(a),()=>URL.revokeObjectURL(a)},[n]),n?r:""}function Yi({saved:n,report:r}){const{result:t,payload:a,groups:i}=n;return e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"warn",children:"成功任务处理参考，不是合格产物日产量或采购承诺"}),e.jsxs("p",{className:"result-number",children:["参考机器数：",$(t.machines)," 台"]}),e.jsxs("p",{children:["每日所需参考运行时间：",Q(t.total_seconds)]}),e.jsxs("p",{children:["单机每日可用容量时间：",Q(t.daily_capacity_seconds)]}),e.jsxs("p",{children:["整机采购小计：",D(t.price_total)?`¥${$(t.price_total)}`:"未计价"]}),e.jsx(Un,{headers:["业务模式","每日需求","平均任务耗时","单机场景参考日处理量"],children:t.lines.map((s,o)=>{const l=zn(i.find(p=>p.id===s.group_id)?.capability);return e.jsxs("tr",{children:[e.jsx("td",{className:"wide",children:e.jsx("span",{children:l?`${l.type} · ${l.label}`:"业务模式"})}),e.jsx("td",{children:e.jsxs("span",{children:[$(s.quantity)," 任务/天"]})}),e.jsx("td",{children:e.jsx("span",{children:Q(s.seconds_per_unit)})}),e.jsx("td",{children:e.jsxs("span",{children:[$(s.daily_units)," 任务/天"]})})]},o)})}),e.jsx("p",{className:"hint",children:"每个模式只参考自动选中的一个实测分组，不保证任意模型、尺寸或缓存规格的产能。"}),e.jsxs("details",{children:[e.jsx("summary",{children:"计算依据"}),e.jsx("h3",{children:"警告与覆盖限制"}),e.jsx(un,{values:t.warnings}),e.jsx("p",{className:"hint",children:"仅按成功任务平均 runtime 估算；不含完整失败、准备、重试或质量损耗。按同一电脑、配置和来源选择具体原分组，不合并均值。"}),e.jsx("p",{className:"hint",children:"台数 = 向上取整〔各模式任务数量 × 平均任务耗时之和 ÷（小时 × 3600 × 可用时间比例 × 生产容量比例）〕。容量预留不是 GPU 利用率；业务组合与模型切换可能增加损耗，不保证峰值 SLA。"}),a.demands.map(s=>{const o=i.find(l=>l.id===s.group_id);return o&&e.jsxs("div",{children:[e.jsx("h3",{children:zn(o.capability)?.label||"业务模式"}),e.jsxs("p",{children:[Ar(o)," / ",M(o.spec_key),"：",de(o.source),"；样本"," ",$(o.samples),"；",$(Tn(o))," 天；配置 ",M(o.config_id),o.source==="standard"?`；标准场景编号 ${M(o.benchmark_id)}`:""]}),e.jsx(Br,{g:o})]},o.id)}),e.jsx("h3",{children:"计算假设"}),e.jsx("pre",{children:M(t.assumptions)}),e.jsxs("p",{className:"hint",children:["Worker ID：",a.worker_id,"；当前在线仅为本次数据快照，不承诺未来状态；当前配置仅作清单参考：",Ge(r.workers.find(s=>s.id===a.worker_id)?.hardware),"；时间：全部历史 至 ",De(a.to),"；",a.hours," 小时 / 可用"," ",$(a.availability*100),"% / 生产容量 ",$(a.utilization*100),"%"]})]})]})}function Zi({controller:n}){const r=n.getSnapshot(),{report:t,ready:a,estimate:i,estimateError:s,estimateNote:o,estimating:l}=r,p=r.mounted.has("purchase")&&t!==null,d=Ji(n,t,p),{inputs:c,groups:f}=d,u=m.useRef(null),y=Xi(i),j=t?.workers.filter(xe)||[],w=!a||!f.length||!c.demands.length||l,v=a?j.some(b=>b.id===c.worker)?f.length?"":"这台电脑暂无这些模式的成功耗时记录，请换一台电脑。":"当前没有在线电脑，请稍后刷新。":"请先刷新并读取电脑状态。";return e.jsxs("div",{className:"procurement",children:[e.jsxs("section",{className:"section",children:[e.jsx("div",{className:"section-head",children:e.jsx("h2",{children:"每日多场景需求"})}),e.jsxs("form",{id:"estimate-form",className:"pad",onSubmit:b=>{b.preventDefault(),b.currentTarget.reportValidity()&&d.submit()},children:[e.jsxs("div",{className:"form-grid",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"电脑显卡配置选择"}),e.jsx("select",{id:"estimate-worker",required:!0,disabled:!a,value:c.worker,onChange:b=>{a&&d.worker(b.target.value)},children:p&&(j.length?j.map(b=>e.jsx("option",{value:b.id,children:b.name||"未命名电脑"},b.id)):e.jsx("option",{value:"",children:"暂无在线电脑"}))})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"每日计划生产小时"}),e.jsx("input",{id:"hours",type:"number",min:"0.1",max:"24",step:"0.1",value:d.hours,required:!0,onChange:b=>d.setHours(b.target.value)})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"整机报价（元，可选）"}),e.jsx("input",{id:"price",type:"number",min:"0",step:"0.01",placeholder:"未填写则不计价格",value:d.price,onChange:b=>d.setPrice(b.target.value)})]})]}),e.jsx("p",{id:"mode-note",className:"notice",children:"按成功任务平均执行耗时参考，不是合格产物日产量或采购承诺。"}),e.jsx("p",{className:"hint",children:"固定按 100% 可用时间、75% 生产容量计算（预留 25% 应对波动）；每日数量按任务/天填写。"}),e.jsxs("div",{children:[e.jsx("h3",{children:"每日需求"}),e.jsx("p",{id:"demand-note",className:"hint",role:"status",children:p&&v}),e.jsx("div",{id:"demands",children:p&&c.demands.map(b=>e.jsxs("div",{className:"demand",children:[e.jsx("select",{className:"demand-group",required:!0,"aria-label":"需求业务模式",disabled:!a||!b.mode_id,value:b.mode_id,onChange:h=>{a&&d.update(b.id,{mode_id:h.target.value})},children:["生图模式","生视频模式"].map(h=>e.jsx("optgroup",{label:h,children:ve.filter(x=>x.type===h).map(x=>e.jsxs("option",{value:x.id,disabled:!d.available(x.id)||c.demands.some(_=>_.id!==b.id&&_.mode_id===x.id),children:[x.type," · ",x.label]},x.id))},h))}),e.jsx("input",{className:"demand-quantity",type:"number",min:"0.01",step:"any",required:!0,placeholder:"任务/天","aria-label":"每日需求数量（任务/天）",disabled:!a||!b.mode_id,value:b.quantity,onChange:h=>d.update(b.id,{quantity:h.target.value})}),e.jsx("button",{type:"button",onClick:()=>d.remove(b.id),children:"移除"})]},b.id))}),e.jsx("button",{id:"add-demand",type:"button",disabled:!p||!a||!ve.some(b=>!c.demands.some(h=>h.mode_id===b.id)&&d.available(b.id)),onClick:d.add,children:"增加场景"})]}),e.jsx("button",{id:"estimate-submit",className:"primary",type:"submit",disabled:!p||w,children:"计算机器需求"})]})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"测算结果与依据"}),e.jsx("button",{id:"export-estimate",disabled:!i||!y,onClick:()=>{n.getSnapshot().estimate&&u.current?.click()},children:"导出测算 CSV"}),e.jsx("a",{ref:u,hidden:!0,href:y||void 0,download:"capacity-estimate.csv",children:"下载测算 CSV"})]}),e.jsx("div",{id:"estimate-error",className:"error",role:"alert",hidden:!s,children:s}),e.jsx("div",{id:"estimate-result",className:"pad","aria-live":"polite",children:i&&t?e.jsx(Yi,{saved:i,report:t}):e.jsx("p",{className:"muted",children:o})})]})]})}const Se=[{id:"machines",label:"机器产能"},{id:"scenarios",label:"场景对比"},{id:"purchase",label:"采购测算"}];function Qi(n){const{controller:r,state:t}=fi(n),{report:a,ready:i,revision:s,mounted:o}=t,[l,p]=m.useState(!1),[d,c]=m.useState(""),[f,u]=m.useState(null),[y,j]=m.useState(null),[w,v]=m.useState(null),b=m.useRef(null),h=m.useRef(null),x=m.useRef([]),[_,L]=m.useState(!1);m.useEffect(()=>{_&&t.tab==="purchase"&&(h.current?.focus(),L(!1))},[_,t.tab]);const A=(g="")=>{r.getSnapshot().ready&&(r.showEvidence(g),b.current?.scrollIntoView({block:"start"}))},N=o.has("scenarios")&&a?Si(a.groups):[],S=N.some(([g])=>g===d)?d:N[0]?.[0]||"";a&&o.has("scenarios")&&d!==S&&c(S);const P=a?.overview||{};return e.jsxs("main",{id:"main-content",className:"page capacity-page",tabIndex:-1,children:[e.jsxs("header",{className:"page-header card",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"产能评估"}),e.jsx("p",{className:"subtitle",children:"真实任务与独立规格分组，查看机器产能、证据和每日需求。"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{id:"refresh-state",className:"state",role:"status",children:t.refreshState})})]}),e.jsx("div",{className:"header-actions",children:e.jsx("button",{id:"refresh",type:"button",onClick:()=>{r.load()},children:"立即刷新"})})]}),e.jsx("div",{id:"error",className:"error",role:"alert",hidden:!t.error,children:t.error}),e.jsx("div",{id:"write-status",className:"write-status",role:"status",hidden:!t.writeStatus,children:t.writeStatus}),e.jsx("div",{className:"tabs",role:"tablist","aria-label":"产能评估视图",children:Se.map((g,E)=>e.jsx("button",{id:`tab-${g.id}`,role:"tab",type:"button",ref:q=>{x.current[E]=q},"aria-selected":t.tab===g.id,"aria-controls":`panel-${g.id}`,tabIndex:t.tab===g.id?0:-1,onClick:()=>r.activate(g.id),onKeyDown:q=>{const C=q.key==="ArrowRight"?(E+1)%Se.length:q.key==="ArrowLeft"?(E+Se.length-1)%Se.length:q.key==="Home"?0:q.key==="End"?Se.length-1:void 0;if(C===void 0)return;const k=Se[C];k&&(q.preventDefault(),r.activate(k.id),x.current[C]?.focus())},children:g.label},g.id))}),e.jsx("div",{id:"capacity-stats",className:"metrics","aria-label":"产能数据概览",children:a&&e.jsx($n,{items:[["当前在线电脑",a.workers.filter(xe).length],["真实任务记录",P.tasks],["独立原规格组",a.groups.length],["产物清单未知任务",P.unknown_outputs]]})}),e.jsxs("section",{id:"panel-machines",role:"tabpanel","aria-labelledby":"tab-machines",tabIndex:0,hidden:t.tab!=="machines",children:[e.jsxs("section",{id:"machine-summary","aria-label":"在线机器业务简览",children:[e.jsxs("div",{className:"summary-toolbar",children:[e.jsx("h2",{id:"online-count",children:a?`当前在线 ${a.workers.filter(xe).length} 台`:"当前在线 — 台"}),e.jsxs("label",{className:"offline-toggle",children:[e.jsx("input",{id:"include-offline",type:"checkbox",checked:l,disabled:!i,onChange:g=>{i&&p(g.target.checked)}}),"包含离线"]})]}),e.jsx("p",{className:"summary-note hint",children:"在线状态是当前状态；业务为全部历史记录中跑过的业务，不代表当前均可执行。平均生成时间仅计成功任务执行耗时，不含排队，非纯 GPU 耗时，也不是合格日产能。同一业务的任务规格、模型或采样条件不同，不能直接按耗时做性能排名。"}),e.jsx("div",{id:"summary-machines",children:o.has("machines")&&a&&e.jsx(Mi,{report:a,ready:i,includeOffline:l,onProfile:u,onEvidence:A},`${s}-${l}`)}),e.jsxs("div",{className:"matrix-actions",children:[e.jsx("button",{type:"button",id:"open-purchase",onClick:()=>{r.activate("purchase"),L(!0)},children:"进入多模式采购测算"}),e.jsx("button",{type:"button",id:"open-evidence",disabled:!i,onClick:()=>A(),children:"展开全部任务证据"})]})]}),e.jsxs("details",{id:"technical-details",className:"section advanced",open:t.technicalOpen,onToggle:g=>r.technical(g.currentTarget.open),children:[e.jsx("summary",{children:"详细统计与机器配置"}),e.jsx(Ei,{report:a,mounted:o.has("technical"),onProfile:u},s)]})]}),e.jsx("section",{id:"panel-scenarios",role:"tabpanel","aria-labelledby":"tab-scenarios",tabIndex:0,hidden:t.tab!=="scenarios",children:e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"同场景证据对比"}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"业务 / 精确规格 / 来源"}),e.jsx("select",{id:"scenario-filter",disabled:!i,value:S,onChange:g=>{i&&c(g.target.value)},children:o.has("scenarios")&&(N.length?N.map(([g,E])=>e.jsx("option",{value:g,children:E},g)):e.jsx("option",{value:"",children:"暂无场景"}))})]})]}),e.jsx("p",{className:"notice hint",children:"只并列相同业务、规格键与证据来源。历史配置、模型版本或缓存条件缺失时，不视为受控跑分；未测试的配置不能按显存或价格推算。"}),e.jsx("div",{id:"scenario-groups",children:o.has("scenarios")&&a&&e.jsx(Hr,{groups:a.groups.filter(g=>Or(g)===S),report:a},`${s}-${S}`)})]})}),e.jsx("section",{id:"panel-purchase",ref:h,role:"tabpanel","aria-labelledby":"tab-purchase",tabIndex:0,hidden:t.tab!=="purchase",children:e.jsx(Zi,{controller:r})}),e.jsxs("details",{id:"task-evidence",ref:b,className:"section advanced",open:t.evidenceOpen,onToggle:g=>r.evidenceOpen(g.currentTarget.open),children:[e.jsx("summary",{children:"任务证据与人工标记"}),e.jsx(Gi,{controller:r,onReview:j,onProbe:v},s)]}),f&&e.jsx(Ui,{worker:f,controller:r,onClose:()=>u(null)},f.id),y&&e.jsx(Wi,{detail:y,controller:r,onClose:()=>j(null)},y.job_id),w&&e.jsx(Bi,{confirmation:w,onClose:()=>v(null)})]})}const eo=`:root {\r
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
`,no=`.permissions-page .permissions-grid {\r
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
`,ro=`/* 页面样式只作用于产能主区及产能对话框，不覆盖共享侧栏。 */\r
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
`,to=`@scope (.admin-page) {
${eo.replace(/:root\b/g,":scope").replace(/^body \{/m,":scope {").replace(/body\.admin-page\b/g,":scope").replace(/\.admin-page\b/g,":scope")}
${no.replace(/\.permissions-page\b/g,":scope.permissions-page")}
${ro}
}`;function xn({page:n,children:r}){const t=nt();return m.useLayoutEffect(()=>{const a=document.body;return a.dataset.choukaPage=n,a.dataset.workspace=n,()=>{a.dataset.choukaPage===n&&delete a.dataset.choukaPage,a.dataset.workspace===n&&delete a.dataset.workspace}},[n]),m.useEffect(()=>{let a=!0;return t.auth.me().then(()=>{if(!a)return;const i=document.getElementById("account");i&&!i.childElementCount&&t.auth.mountAccount(i);for(const s of document.querySelectorAll("#workspace-nav a"))new URL(s.href).pathname===location.pathname?s.setAttribute("aria-current","page"):s.removeAttribute("aria-current")}).catch(()=>{}),()=>{a=!1}},[t,n]),e.jsxs(e.Fragment,{children:[e.jsx("style",{children:to}),e.jsx(It,{page:n,workspace:!0,children:r})]})}function lo(){return e.jsx(xn,{page:"controller",children:n=>e.jsx(os,{...n})})}function co(){return e.jsx(xn,{page:"permissions",children:n=>e.jsx(Rs,{...n})})}function po(){return e.jsx(xn,{page:"costs",children:n=>e.jsx(ri,{...n})})}function mo(){return e.jsx(xn,{page:"capacity",children:n=>e.jsx(Qi,{...n})})}export{mo as CapacityWorkspace,lo as ControllerWorkspace,po as CostsWorkspace,co as PermissionsWorkspace};
