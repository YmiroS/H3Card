import{HttpClient as bt,reactExports as d,errorMessage as re,jsxRuntimeExports as e,ApiError as Nr}from"./http-CceZLADw.js";import{createSessionService as yt,userSchema as jt,accountProfile as vt,LoadingRequest as _t,dinghaiProfileSchema as wt,jsonSchema as ee,useWorkspaceRuntime as kt}from"./main-CkIFYdbY.js";import{object as A,number as U,boolean as Y,_enum as Me,strictObject as Sr,string as z,literal as ce,looseObject as Q,array as q,unknown as $r,union as ve,ipv4 as Nt,record as bn,uuid as St,discriminatedUnion as $t,NEVER as Ct,_null as Cr}from"./monitor-alerts-BXpxzu-0.js";import{reactDomExports as zt,skillIdSchema as Et,publishedSkillSchema as yn}from"./skills-myRBgh_b.js";import{createTeamService as Mt}from"./teams-B1wDiWSd.js";const Pt=A({maintenance_active:Y().optional(),comfy_online:Y().optional(),sandbox:Y().optional()}),It=A({online_users:U().finite().nonnegative()}),Rt=A({user:jt});function Lt({fetcher:n=window.fetch.bind(window),origin:r=window.location.origin,onExpired:t,onSandbox:s,onDenied:i=()=>{}}){let a=!1;const o=async(g,x)=>{const m=await n(g,x);return a||(m.headers.get("X-H3Card-Sandbox")==="local-copy"&&s(),m.status===403&&i()),m},l=new bt(o,r,()=>{a||t()});let p,c;const u=new Set;return{http:l,session:yt(l),health(){if(p)return p;const g=new AbortController;u.add(g);const x=window.setTimeout(()=>g.abort(),4e3);return p=l.read("/api/health",Pt,{cache:"no-store",signal:g.signal}).then(m=>(!a&&m.sandbox===!0&&s(),m)).finally(()=>{window.clearTimeout(x),u.delete(g),p=void 0}),p},presence(){return c??=l.json("/api/auth/presence","POST").then(g=>It.parse(g)).finally(()=>{c=void 0}),c},async savePhone(g){const x=g.trim();if(!/^1[3-9][0-9]{9}$/.test(x))throw new Error("请输入有效的 11 位中国大陆手机号");const m=Rt.parse(await l.json("/api/auth/phone","POST",{phone:x})).user;if(!m.phone)throw new Error("手机号尚未保存，请重试");return m},async changePassword(g,x,m){if(x.length<8)throw new Error("新密码至少需要 8 位");if(x!==m)throw new Error("两次输入的新密码不一致");await l.json("/api/auth/password","POST",{current_password:g,new_password:x})},dispose(){a=!0,u.forEach(g=>g.abort()),u.clear(),l.invalidate()}}}function At(n,r){return n.local_login_enabled!==!1&&!r&&n.phone===""}function sr(n){return n==="admin"?null:n==="monitor"?"/monitor":"/"}function on(n){return n.maintenance_active!==!0?"clear":n.comfy_online===!0?"partial":"blocked"}function Tt(n){const[r,t]=d.useState(null),[s,i]=d.useState(!1),[a,o]=d.useState(""),[l,p]=d.useState(0);d.useEffect(()=>{let x=!1,m=!1,_=()=>{};const y=()=>document.hidden?new Promise(b=>{const k=()=>{document.hidden&&!x||(document.removeEventListener("visibilitychange",k),b())};document.addEventListener("visibilitychange",k),_=()=>{document.removeEventListener("visibilitychange",k),b()}}):Promise.resolve(),N=()=>{x||(x=!0,h.dispose(),t(null),o("登录已失效，请重新登录"),n("/login"))},w=b=>{const k=sr(b.role);return k?(x=!0,h.dispose(),t(null),n(k),!1):!0},h=Lt({onExpired:N,onSandbox:()=>{x||i(!0)},onDenied:()=>{x||m||(m=!0,h.session.me().then(b=>{!x&&w(b.user)&&t(k=>k&&{...k,user:b.user,localTest:b.local_test===!0})}).catch(()=>{}).finally(()=>{m=!1}))}});return t(null),o(""),i(!1),(async()=>{try{const b=await h.session.me();if(x||!w(b.user)||(await y(),x))return;const k=await h.health().catch(()=>({}));x||t({user:b.user,localTest:b.local_test===!0,services:h,initialHealth:k})}catch(b){x||o(re(b))}})(),()=>{x=!0,_(),h.dispose()}},[l,n]);const c=d.useCallback(()=>p(x=>x+1),[]),u=d.useCallback(x=>{const m=sr(x.role);m?(r?.services.dispose(),t(null),n(m)):t(_=>_&&{..._,user:x})},[r,n]),g=d.useCallback(()=>{r?.services.dispose(),t(null),o("登录已失效，请重新登录"),n("/login")},[r,n]);return{session:r,sandbox:s,error:a,retry:c,updateUser:u,expire:g}}function Dt(n,r,t=!0){const[s,i]=d.useState(null),[a,o]=d.useState(()=>on(r)),[l,p]=d.useState(()=>on(r)!=="clear");return d.useEffect(()=>{if(!t)return;let c=!0,u=on(r),g;const x=()=>{g=window.setTimeout(()=>{c&&p(!1)},5e3)};u==="partial"&&x();const m=()=>{document.hidden||n.presence().then(h=>{c&&i(h.online_users)}).catch(()=>{})},_=()=>{document.hidden||n.health().then(h=>{if(!c)return;const b=on(h);b!==u&&(u=b,window.clearTimeout(g),o(b),p(b!=="clear"),b==="partial"&&x())}).catch(()=>{})};m();const y=window.setInterval(m,3e4),N=window.setInterval(_,5e3),w=()=>{document.hidden||(m(),_())};return document.addEventListener("visibilitychange",w),()=>{c=!1,window.clearTimeout(g),window.clearInterval(y),window.clearInterval(N),document.removeEventListener("visibilitychange",w)}},[n,r,t]),{online:s,maintenance:a,maintenanceVisible:l}}const Ot={dashboard:"M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1",costs:"M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2M14 11h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-2.5M12 17v1m0 -8v1",capacity:"M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14M4 20h14",permissions:"M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0M8 11v-4a4 4 0 1 1 8 0v4",skills:"M12 6a8 8 0 0 0 -8 -2v15a8 8 0 0 1 8 2m0 -15a8 8 0 0 1 8 -2v15a8 8 0 0 0 -8 2m0 -15v15",teams:"M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0 -3 -3.85",refresh:"M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4",chevron:"M9 6l6 6l-6 6",external:"M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6M11 13l9 -9M15 4h5v5",logout:"M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2M9 12h12l-3 -3M18 15l3 -3",check:"M5 12l4 4l10 -10",info:"M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0 -18M12 11v6M12 7h.01",alert:"M12 9v4M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0M12 16h.01"};function Ze({name:n,className:r="",...t}){return e.jsx("svg",{className:`icon ${r}`,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.7,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",...t,children:e.jsx("path",{d:Ot[n]})})}const Ft="_application_gguf9_1",qt="_workspace_gguf9_12",Ut="_sandbox_gguf9_15",Wt="_navigation_gguf9_18",Bt="_accountMenu_gguf9_225",Vt="_infoRow_gguf9_281",Ht="_dialog_gguf9_295",Gt="_maintenance_gguf9_361",Jt="_notifications_gguf9_409",Kt="_notificationItem_gguf9_441",Yt="_notificationHeading_gguf9_466",Xt="_notificationIcon_gguf9_477",Zt="_notificationMessage_gguf9_495",Qt="_notificationLabel_gguf9_504",fe={application:Ft,workspace:qt,sandbox:Ut,navigation:Wt,accountMenu:Bt,infoRow:Vt,dialog:Ht,maintenance:Gt,notifications:Jt,notificationItem:Kt,notificationHeading:Yt,notificationIcon:Xt,notificationMessage:Zt,notificationLabel:Qt},es={error:"alert",warning:"alert",success:"check",status:"info"},ns={error:"错误",warning:"警告",success:"成功",status:"提示"},zr=d.createContext({notify:()=>{},registerModal:()=>()=>{}}),Er=()=>d.useContext(zr);function rs({children:n}){const[r,t]=d.useState([]),[s,i]=d.useState([]),a=d.useCallback(p=>(i(c=>[...c,p]),()=>i(c=>c.filter(u=>u!==p))),[]),o=d.useCallback(p=>{const c=typeof p=="string"?{message:p,tone:"status"}:p instanceof Error?{message:p.message,tone:"error"}:{message:p.message,tone:p.tone??"status"};t(u=>u.some(g=>g.message===c.message&&g.tone===c.tone)?u:[...u,c])},[]),l=s.at(-1)??document.body;return e.jsxs(zr.Provider,{value:{notify:o,registerModal:a},children:[n,r.length>0&&zt.createPortal(e.jsx(ts,{notices:r,dismiss:p=>t(c=>c.filter(u=>u!==p)),clear:()=>t([])}),l)]})}function ts({notices:n,dismiss:r,clear:t}){const s=d.useRef(null);d.useEffect(()=>{const o=s.current;if(o?.isConnected)return o.showPopover?.(),()=>{o.isConnected&&o.hidePopover?.()}},[]);const i=o=>{const l=s.current?.contains(document.activeElement),p=s.current?.parentElement;o(),l&&queueMicrotask(()=>{(s.current?.querySelector("button")??p?.querySelector("[data-operation-status],button")??document.querySelector("main"))?.focus({preventScroll:!0})})},a=["error","warning","success","status"].find(o=>n.some(l=>l.tone===o))??"status";return e.jsxs("section",{id:"admin-notifications","data-tone":a,ref:s,popover:"manual",className:fe.notifications,"aria-label":"操作通知",children:[e.jsxs("div",{className:fe.notificationHeading,children:[e.jsx(Ze,{name:es[a],className:fe.notificationIcon}),e.jsx("strong",{children:"操作通知"}),e.jsx("button",{type:"button","aria-label":"关闭全部通知",onClick:()=>i(t),children:"全部关闭"})]}),n.map(o=>e.jsxs("div",{className:fe.notificationItem,"data-tone":o.tone,children:[e.jsxs("p",{className:fe.notificationMessage,role:o.tone==="error"?"alert":"status","aria-atomic":"true",children:[e.jsx("span",{className:fe.notificationLabel,children:ns[o.tone]}),o.message]}),e.jsx("button",{type:"button","aria-label":`关闭通知：${o.message}`,onClick:()=>i(()=>r(o)),children:"×"})]},`${o.tone}:${o.message}`))]})}function de({title:n,children:r,onClose:t,onSubmit:s,submitLabel:i="确认",submitDisabled:a=!1,errorFocusRef:o,className:l="",showFooter:p=!0,dismissible:c=!0,closeLabel:u,id:g}){const x=d.useId(),m=d.useRef(null),_=d.useRef(null),y=d.useRef(!1),N=d.useRef(!1),w=d.useRef(!1),[h,b]=d.useState(!1),[k,R]=d.useState(""),[D]=d.useState(()=>{const f=document.activeElement instanceof HTMLElement?document.activeElement:null;return{element:f,key:f?.dataset.focusKey}}),{registerModal:C}=Er();d.useLayoutEffect(()=>{const f=m.current;if(!f)return;N.current=!0;const v=D.element,j=D.key;f.showModal();const S=C(f);return document.body.classList.add("modal-open"),()=>{N.current=!1,f.querySelectorAll('input[type="password"]').forEach(Z=>{Z.value=""}),f.open&&f.close(),S();const $=()=>{if(document.querySelector("dialog[open]"))return;document.body.classList.remove("modal-open");const Z=j?[...document.querySelectorAll("[data-focus-key]")].find(O=>O.dataset.focusKey===j):null,G=document.querySelector("main");G&&!G.hasAttribute("tabindex")&&(G.tabIndex=-1);const te=O=>O?.isConnected&&(O.tabIndex>=0||O.hasAttribute("tabindex")||O.isContentEditable)&&!O.closest("[inert],[hidden]")&&!O.matches(':disabled,input[type="hidden"]');(te(v)?v:te(Z)?Z:G)?.focus({preventScroll:!0})};$(),queueMicrotask($)}},[C,D]),d.useLayoutEffect(()=>{if(k){const f=o?.current??_.current;f?.focus({preventScroll:!0}),f?.scrollIntoView({block:"nearest"})}else h&&_.current?.focus({preventScroll:!0})},[h,k,o]);const P=()=>{y.current||w.current||(w.current=!0,m.current?.querySelectorAll('input[type="password"]').forEach(f=>{f.value=""}),m.current?.open&&m.current.close(),t())},T=f=>{y.current&&(f.preventDefault(),f.stopPropagation())};return e.jsx("dialog",{id:g,ref:m,className:`f-operation-modal admin-dialog ${fe.dialog} ${l}`,"aria-labelledby":x,tabIndex:-1,onCancel:f=>{f.preventDefault(),c&&P()},onClose:f=>{const v=f.currentTarget;if(!(!N.current||w.current||v.open)){if(y.current||!c){v.showModal(),y.current&&_.current?.focus({preventScroll:!0});return}P()}},onClick:f=>{if(f.target!==f.currentTarget||!c)return;const v=f.currentTarget.getBoundingClientRect();(f.clientX<v.left||f.clientX>v.right||f.clientY<v.top||f.clientY>v.bottom)&&P()},onKeyDown:f=>{if(f.stopPropagation(),f.key!=="Tab")return;const v=[...f.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter($=>!$.closest("[inert]")&&!$.hidden).sort(($,Z)=>$.compareDocumentPosition(Z)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1),j=v[0],S=v.at(-1);if(!j||!S){f.preventDefault(),_.current?.focus();return}f.shiftKey&&(document.activeElement===j||!v.includes(document.activeElement instanceof HTMLElement?document.activeElement:j))?(f.preventDefault(),S.focus()):!f.shiftKey&&(document.activeElement===S||!v.includes(document.activeElement instanceof HTMLElement?document.activeElement:S))&&(f.preventDefault(),j.focus())},children:e.jsxs("form",{"aria-busy":h||void 0,"data-busy":h?"true":void 0,onSubmit:async f=>{f.preventDefault();const v=f.currentTarget;if(!(y.current||a||!s||!v.reportValidity())){y.current=!0,b(!0),R("");try{await s(v),N.current&&(y.current=!1,P())}catch(j){N.current&&R(`${re(j)}；输入已保留，可重试。`)}finally{y.current=!1,N.current&&b(!1)}}},children:[e.jsxs("header",{className:"f-dialog-head",children:[e.jsx("h2",{id:x,children:n}),c&&e.jsx("button",{type:"button",className:"close-button","data-cancel":"","aria-label":"关闭弹窗",disabled:h,onClick:P,children:"×"})]}),e.jsxs("div",{className:"f-dialog-body",children:[e.jsx("div",{"data-dialog-content":"",inert:h,onClickCapture:T,onKeyDownCapture:T,onInputCapture:T,onChangeCapture:T,children:r}),e.jsx("p",{ref:_,className:`f-status ${k?"danger":""}`,role:k?"alert":"status",tabIndex:-1,"data-operation-status":"",children:k||(h?"正在提交…":"")})]}),p&&e.jsxs("footer",{className:"f-dialog-foot",children:[e.jsx("button",{type:"button","data-cancel":"",disabled:h,onClick:P,children:u??(s?"取消":"知道了")}),s&&e.jsx("button",{type:"submit",className:"primary",disabled:h||a,children:h?"正在提交…":i})]})]})})}function ss({user:n,localTest:r,services:t,expire:s}){const[i,a]=d.useState(!1),[o,l]=d.useState(null),[p,c]=d.useState({}),[u,g]=d.useState(!1),x=d.useRef(!1),m=d.useRef(null),_=d.useRef(null),y=vt(n),N=y.display_name?.trim()||y.username||"定海用户",w=()=>{a(!1),m.current?.focus({preventScroll:!0})};return d.useLayoutEffect(()=>{const h=_.current;if(h)if(i){const b=m.current?.getBoundingClientRect();b&&c({left:Math.max(8,Math.min(b.left,window.innerWidth-Math.min(260,window.innerWidth-16)-8)),bottom:Math.max(8,window.innerHeight-b.top+8),maxHeight:Math.max(44,b.top-16)}),h.showPopover?.(),h.querySelector("button")?.focus()}else h.hidePopover?.()},[i]),d.useEffect(()=>{if(!i)return;const h=()=>a(!1),b=k=>{k.target instanceof Node&&!_.current?.contains(k.target)&&!m.current?.contains(k.target)&&h()};return window.addEventListener("resize",h),document.addEventListener("pointerdown",b),()=>{window.removeEventListener("resize",h),document.removeEventListener("pointerdown",b)}},[i]),e.jsx("div",{id:"account",className:"account-bar",children:r?e.jsx("span",{className:"chip",children:"本地测试 · 免登录"}):e.jsxs(e.Fragment,{children:[e.jsxs("button",{ref:m,className:"account-trigger",type:"button","aria-label":`用户菜单：${N}`,"aria-haspopup":"menu","aria-expanded":i,"aria-controls":"account-menu","data-focus-key":"admin-account",onClick:()=>a(h=>!h),onKeyDown:h=>{(h.key==="ArrowDown"||h.key==="ArrowUp")&&(h.preventDefault(),a(!0))},children:[e.jsx("span",{className:"account-avatar","aria-hidden":"true",children:Array.from(N)[0]?.toUpperCase()||"?"}),e.jsx("span",{className:"account-name",children:N})]}),e.jsxs("div",{ref:_,id:"account-menu",className:`account-menu ${fe.accountMenu}`,role:"menu","aria-label":"账号菜单",popover:"auto",hidden:!i,style:p,onToggle:h=>{h.newState==="closed"&&a(!1)},onKeyDown:h=>{if(h.stopPropagation(),h.key==="Escape"){h.preventDefault(),w();return}if(h.key==="Tab"){a(!1);return}if(!["ArrowDown","ArrowUp","Home","End"].includes(h.key))return;h.preventDefault();const b=[...h.currentTarget.querySelectorAll('[role="menuitem"]:not(:disabled)')],k=b.findIndex(D=>D===document.activeElement),R=h.key==="Home"?0:h.key==="End"?b.length-1:(k+(h.key==="ArrowDown"?1:-1)+b.length)%b.length;b[R]?.focus()},children:[e.jsxs("div",{className:"account-menu-heading",role:"presentation",children:[e.jsx("b",{children:N}),e.jsxs("small",{children:[y.username||"未填写"," · 管理员"]})]}),e.jsx("button",{type:"button",role:"menuitem",className:"account-action",onClick:()=>{w(),l("info")},children:"用户信息"}),n.local_login_enabled===!1?e.jsx("p",{className:"auth-note",children:"密码由定海管理"}):e.jsx("button",{type:"button",role:"menuitem",className:"account-action",onClick:()=>{w(),l("password")},children:"修改密码"}),e.jsxs("button",{type:"button",role:"menuitem",className:"account-action danger",disabled:u,onClick:async()=>{if(!x.current){x.current=!0,g(!0),w();try{await t.session.logout()}catch{}finally{s()}}},children:[e.jsx(Ze,{name:"logout"}),"退出登录"]})]}),o==="info"&&e.jsx(de,{title:"用户信息",className:"auth-dialog",onClose:()=>l(null),closeLabel:"关闭",children:e.jsx("dl",{className:"account-info",children:[["姓名 / 花名",y.display_name?.trim()||"未填写"],["用户名",y.username||"未填写"],["手机号",y.phone||"未填写"],["角色","管理员"],["用户 ID",y.id]].map(([h,b])=>e.jsxs("div",{className:fe.infoRow,children:[e.jsx("dt",{children:h}),e.jsx("dd",{children:b})]},h))})}),o==="password"&&n.local_login_enabled!==!1&&e.jsxs(de,{title:"修改密码",className:"auth-dialog",onClose:()=>l(null),submitLabel:"保存",onSubmit:async h=>{const b=new FormData(h);await t.changePassword(String(b.get("current_password")??""),String(b.get("new_password")??""),String(b.get("confirm_password")??"")),s()},children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"当前密码"}),e.jsx("input",{name:"current_password",type:"password",autoComplete:"current-password",autoFocus:!0,required:!0})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"新密码（至少 8 位）"}),e.jsx("input",{name:"new_password",type:"password",autoComplete:"new-password",required:!0,minLength:8})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"再输一次新密码"}),e.jsx("input",{name:"confirm_password",type:"password",autoComplete:"new-password",required:!0,minLength:8})]}),e.jsx("p",{className:"auth-note",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。保存后需要重新登录。"})]})]})})}const as=n=>window.location.replace(n);function is({page:n,children:r,workspace:t=!1}){return e.jsx(os,{page:n,workspace:t,children:r})}function os({page:n,children:r,workspace:t}){const{session:s,sandbox:i,error:a,retry:o,updateUser:l,expire:p}=Tt(as);return!s&&!a&&t?e.jsx(_t,{stage:"正在准备工作区"}):s?e.jsx(rs,{children:e.jsx(cs,{page:n,workspace:t,user:s.user,localTest:s.localTest,services:s.services,initialHealth:s.initialHealth,sandbox:i,updateUser:l,expire:p,children:r})}):e.jsx("main",{id:"main",tabIndex:-1,children:a?e.jsxs("section",{role:"alert",children:[e.jsx("p",{children:a}),e.jsx("a",{href:"/login",children:"前往登录"}),e.jsx("button",{type:"button",onClick:o,children:"重试"})]}):e.jsx("p",{role:"status",children:"正在验证管理员会话…"})})}const ls=[{label:"工作区",links:[{key:"canvas",label:"画布",href:"/",icon:"dashboard"},{key:"director",label:"导演工作台",href:"/director",icon:"external"}]},{label:"管理",links:[{key:"teams",label:"项目组",href:"/teams",icon:"teams"},{key:"controller",label:"运行面板",href:"/controller",icon:"dashboard"},{key:"permissions",label:"账号与权限",href:"/admin/permissions",icon:"permissions"},{key:"skills",label:"Skill 管理",href:"/skills",icon:"skills"}]},{label:"统计",links:[{key:"costs",label:"费用评估",href:"/controller/costs",icon:"costs"},{key:"capacity",label:"产能统计",href:"/controller/capacity",icon:"capacity"}]}];function cs({page:n,workspace:r,user:t,localTest:s,services:i,initialHealth:a,sandbox:o,children:l,updateUser:p,expire:c}){const{notify:u}=Er(),{online:g,maintenance:x,maintenanceVisible:m}=Dt(i,a,!r),_=d.useRef(!1),y=d.useRef(!1);d.useEffect(()=>{if(r)return;const h=document.body,b=h.dataset.workspace,k=h.classList.contains("admin-page");return h.classList.add("admin-page"),h.dataset.workspace=n,()=>{k||h.classList.remove("admin-page"),b===void 0?delete h.dataset.workspace:h.dataset.workspace=b}},[n,r]),d.useEffect(()=>{const h=document.body.dataset.adminSandbox;return o&&(document.body.dataset.adminSandbox="local-copy"),()=>{h===void 0?delete document.body.dataset.adminSandbox:document.body.dataset.adminSandbox=h}},[o]);const N=At(t,s);d.useEffect(()=>{N&&(y.current=!1)},[N]);const w=x==="blocked"?"系统正在维护更新，当前暂无可用执行节点，请稍后再使用。":"部分节点正在维护更新，其他可用节点仍可正常使用。";return e.jsxs("div",{className:`admin-page ${n==="permissions"?"permissions-page":""} ${fe.application} ${r?fe.workspace:""}`,children:[e.jsx("a",{className:"skip-link admin-skip",href:n==="capacity"?"#main-content":"#main",children:"跳到主内容"}),!r&&e.jsxs("aside",{id:"workspace-nav","data-admin-sidebar":"","aria-label":"主导航",className:fe.navigation,children:[e.jsxs("a",{className:"workspace-brand",href:"/","aria-label":"Chouka 创作空间",children:[e.jsx("img",{src:"/icon.png",alt:""}),e.jsxs("span",{children:["Chouka",e.jsx("small",{children:"创作空间"})]})]}),e.jsx("nav",{className:"workspace-links","aria-label":"工作区导航",children:ls.map(h=>e.jsxs("div",{className:"workspace-nav-group",role:"group","aria-label":h.label,children:[e.jsx("div",{className:"workspace-nav-label","aria-hidden":"true",children:h.label}),h.links.map(b=>e.jsxs("a",{className:"workspace-link",href:b.href,title:b.label,"aria-label":b.label,"aria-current":n===b.key?"page":void 0,children:[e.jsx(Ze,{name:b.icon}),e.jsx("span",{children:b.label})]},b.key))]},h.label))}),e.jsxs("div",{className:"workspace-footer",children:[e.jsxs("div",{className:"workspace-presence",title:"Chouka 系统在线用户（近 90 秒活跃，按账号去重）","aria-live":"polite",children:[e.jsx("i",{"aria-hidden":"true"}),e.jsxs("span",{children:[e.jsx("b",{children:g??"--"})," 人在线"]})]}),e.jsx(ss,{user:t,localTest:s,services:i,expire:c})]})]}),!r&&m&&e.jsxs("div",{id:"maintenance-banner",className:fe.maintenance,role:"status","aria-live":"polite","aria-atomic":"true","aria-label":"系统维护通知",children:[e.jsx("span",{className:"maintenance-banner-icon",children:e.jsx(Ze,{name:"alert"})}),e.jsx("div",{className:"maintenance-banner-ticker",children:e.jsx("div",{className:"maintenance-banner-track",children:[!1,!0].map(h=>e.jsx("span",{className:"maintenance-banner-message","aria-hidden":h||void 0,children:w},String(h)))})})]}),o&&e.jsx("div",{id:"sandbox-note",className:`notice-box admin-sandbox ${fe.sandbox}`,role:"note",children:"本地隔离数据副本：本页用于本地验收，展示复制的业务数据，不代表正式服务的实时状态。"}),N?e.jsx("main",{id:n==="capacity"?"main-content":"main",tabIndex:-1,children:e.jsx("p",{role:"status",children:"请补充手机号后继续使用。"})}):l({http:i.http,user:t,sandbox:o,notify:u}),N&&e.jsx(de,{id:"phone-dialog",title:"补充手机号",className:"auth-dialog phone-dialog",dismissible:!1,closeLabel:"退出登录",submitLabel:"保存并继续",onClose:()=>{y.current||_.current||(_.current=!0,i.session.logout().catch(()=>{}).finally(c))},onSubmit:async h=>{const b=await i.savePhone(String(new FormData(h).get("phone")??""));y.current=!0,p(b)},children:e.jsxs(d.Fragment,{children:[e.jsx("p",{id:"phone-note",className:"auth-note",children:"当前账号尚未填写手机号，请补充后继续使用。手机号仅本人和管理员可见，不用于短信验证或登录。"}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"手机号"}),e.jsx("input",{name:"phone",type:"tel",autoFocus:!0,inputMode:"numeric",autoComplete:"tel-national",required:!0,maxLength:11,pattern:"1[3-9][0-9]{9}",placeholder:"请输入 11 位中国大陆手机号","aria-describedby":"phone-note"})]})]})})]})}function ds(n,r=!0){const t=d.useMemo(()=>Mt(n),[n]),[s,i]=d.useState(0),[a,o]=d.useState({teams:null,loading:!0,error:""});return d.useEffect(()=>{if(!r)return;const p=new AbortController;return t.list(p.signal).then(({teams:c})=>{p.signal.aborted||o({teams:c,loading:!1,error:""})}).catch(c=>{p.signal.aborted||o({teams:null,loading:!1,error:`项目组加载失败：${re(c)}`})}),()=>p.abort()},[t,s,r]),{...a,retry:()=>{o({teams:null,loading:!0,error:""}),i(p=>p+1)}}}const K=ve([U().finite(),z().refine(n=>n===""||Number.isFinite(Number(n)))]).nullish(),W=z().nullish(),ln=ve([Y(),ce(0),ce(1)]).nullish(),ps=Q({used_bytes:K,total_bytes:K}),us=Q({index:K,name:W,utilization_percent:K,memory_used_bytes:K,memory_total_bytes:K,temperature_c:K}),ms=Q({remote_commands:Q({version:U(),interpreters:q(z())}).optional(),agent_version:ve([U(),z()]).nullish(),supports_code_restart:Y().nullish(),supports_service_restart:Y().nullish(),supports_host_reboot:Y().nullish(),node_classes:q(z()).nullish(),telemetry:Q({hostname:W,ip_address:z().trim().transform(n=>Nt().safeParse(n).success?n:null).nullish(),collected_at:K,gpus:q(us).nullish(),memory:ps.nullish()}).nullish(),devices:q(Q({index:K,name:W,device_name:W,type:W,vram_total:K,vram_free:K})).nullish(),system:Q({ram_total:K,ram_free:K,comfyui_version:W,comfyui_build_version:W}).nullish()}),ar=Q({name:W,node_class:W,input:W}),hs=Q({status:W,model_inventory_status:W,missing_node_classes:q(z()).nullish(),extra_node_classes:q(z()).nullish(),missing_models:q(ar).nullish(),extra_models:q(ar).nullish()}),xs=Q({status:W,worker_id:W,agent_version:ve([U(),z()]).nullish()}),fs=Q({id:z(),name:W,state:W,enabled:ln,access_team_id:z().min(1).nullable().optional(),access_expires_at:U().finite().nullable().optional(),comfy_online:ln,busy:ln,current_job_id:W,last_seen:K,is_primary_node:ln,sync_status:W,sync_action:W,sync_message:W,capability_comparison:hs.nullish(),capabilities:ms.nullish()}),gs=Sr({team_id:z().trim().min(1).nullable(),expires_at:U().finite().nullable()}).refine(n=>n.team_id!==null||n.expires_at===null,{message:"公共设备不能设置结束时间"}),bs=A({ok:ce(!0),worker_id:z().min(1),access_team_id:z().min(1).nullable(),access_expires_at:U().finite().nullable()}).refine(n=>n.access_team_id!==null||n.access_expires_at===null),Mr=Q({id:z(),status:W,history_only:Y().optional(),permission:W,modelName:W,nodeName:W,card:W,name:W,cardName:W,project:W,projectName:W,progress:K,step:W,created:K,started:K,ended:K,worker_id:W,error:W,capability:W,submitter_display_name:W,submitter_username:W}),ys=Q({ok:Y().nullish(),mode:W,online_workers:K,workers:K,server_time:K,started_at:K,comfy_online:Y().nullish(),jobs:K,capabilities:K,sandbox:Y().nullish(),llm:Q({ok:Y().nullish(),model:W}).nullish()}),js=Q({running_count:K,queued_count:K}),vs=Q({workers:q(fs),comparison_baseline:xs.nullish()}),_s=Q({jobs:q(Mr)}),ws=Me(["all","queued","running","done","error","canceled"]),ks=Q({jobs:q(Mr),next_cursor:z().min(1).nullable(),has_more:Y(),total:U().int().nonnegative()}).refine(n=>n.has_more===(n.next_cursor!==null),{message:"任务历史分页游标不完整"}),Ns=Q({projects:q(Q({id:z(),name:W}))}),Ss=Q({worker_count:K,primary_count:K,skipped_count:K}),$s=Q({ok:ce(!0),worker_id:z().min(1),request_id:z().min(1),action:ce("sync_files")}),Cs=Me(["restart_services","reboot_host"]),zs=Q({ok:ce(!0),worker_id:z().min(1),request_id:z().min(1),action:Cs}),Es=Q({ok:Y().optional()}),$n=ve([U().finite(),z().refine(n=>n!==""&&Number.isFinite(Number(n)))]).transform(Number),ir=$r().transform(n=>(typeof n=="number"||typeof n=="string")&&n!==""&&Number.isFinite(Number(n))?Number(n):null),Ms=Q({worker_id:W,gpu_index:K,minutes:K,server_time:K,from:$n,to:$n,gap_seconds:$n.pipe(U().positive()),points:q(Q({at:ir,temperature_c:ir}))}).refine(n=>n.to>n.from,{message:"温度历史返回格式不完整"});function Ps(n){return{async save(r,t,s,i){const a=gs.parse(t);i();const o=bs.parse(await n.request(`/api/workers/${encodeURIComponent(r)}/access`,{method:"POST",signal:s,headers:{"Content-Type":"application/json"},body:JSON.stringify(a)}));if(o.worker_id!==r||o.access_team_id!==a.team_id||o.access_expires_at!==a.expires_at)throw new Error("使用范围响应与所选设备或配置不一致，请刷新核对");return o}}}function Wn(n,r){return!n.access_team_id||n.access_expires_at!=null&&n.access_expires_at<=r?{team_id:null,expires_at:null}:{team_id:n.access_team_id,expires_at:n.access_expires_at??null}}function Is(n,r){const t=new Map;for(const s of n){const i=Wn(s,r),a=JSON.stringify([i.team_id,i.expires_at]),o=t.get(a);o?o.workers.push(s):t.set(a,{...i,workers:[s]})}return[...t.values()].sort((s,i)=>+(s.team_id===null)-+(i.team_id===null))}function Pr(n){if(n===null)return"";const r=new Date(n*1e3);if(!Number.isFinite(r.getTime()))return"";const t=s=>String(s).padStart(2,"0");return`${r.getFullYear()}-${t(r.getMonth()+1)}-${t(r.getDate())}T${t(r.getHours())}:${t(r.getMinutes())}:${t(r.getSeconds())}`}function Cn(n,r,t,s,i){if(n==="public")return{value:{team_id:null,expires_at:null}};const a={};s?.some(p=>p.id===r)||(a.team="请选择有效的项目组");const o=t?new Date(t).getTime()/1e3:null,l=t.replace(/\.\d{1,3}$/,"");return o!==null&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(t)||!Number.isFinite(o)||Pr(o)!==(l.length===16?`${l}:00`:l))?a.expiry="请输入有效的本地结束时间（不能是夏令时跳过的时间）":o!==null&&o<=i&&(a.expiry="结束时间必须晚于当前时间"),Object.keys(a).length?{errors:a}:{value:{team_id:r,expires_at:o}}}const Rs="_page_1vpgb_1",Ls="_overview_1vpgb_1",As="_accessOverview_1vpgb_54",Ts="_accessSummary_1vpgb_65",Ds="_accessTableWrap_1vpgb_81",Os="_accessTable_1vpgb_81",Fs="_accessCellLabel_1vpgb_122",qs="_selectionToolbar_1vpgb_164",Us="_selectAll_1vpgb_180",Ws="_workerSelection_1vpgb_181",Bs="_workerGrid_1vpgb_214",Vs="_workerCard_1vpgb_222",Hs="_workerIdentityBlock_1vpgb_238",Gs="_workerHeader_1vpgb_253",Js="_workerService_1vpgb_254",Ks="_syncMeta_1vpgb_255",Ys="_workerName_1vpgb_264",Xs="_workerState_1vpgb_276",Zs="_workerVersions_1vpgb_305",Qs="_resourceNote_1vpgb_306",ea="_telemetryNote_1vpgb_307",na="_sectionLabel_1vpgb_308",ra="_syncMessage_1vpgb_310",ta="_accessDialog_1vpgb_325",sa="_accessTargets_1vpgb_339",aa="_accessOutcomes_1vpgb_340",ia="_accessMixed_1vpgb_359",oa="_accessResults_1vpgb_364",la="_accessForm_1vpgb_389",ca="_accessError_1vpgb_406",da="_workerAccess_1vpgb_409",pa="_workerResources_1vpgb_414",ua="_resourceRow_1vpgb_417",ma="_resourceReadings_1vpgb_418",ha="_resourceTitle_1vpgb_430",xa="_resourceReading_1vpgb_418",fa="_resourceLabel_1vpgb_456",ga="_resourceBar_1vpgb_459",ba="_workerActivity_1vpgb_494",ya="_workerTask_1vpgb_503",ja="_workerSync_1vpgb_542",va="_inventoryAction_1vpgb_550",_a="_inventoryLabel_1vpgb_551",wa="_syncActionLabel_1vpgb_595",ka="_cardActions_1vpgb_606",Na="_historyControls_1vpgb_644",Sa="_workerDialog_1vpgb_653",$a="_workerActions_1vpgb_656",Ca="_capabilities_1vpgb_664",za="_temperatureDialog_1vpgb_673",I={page:Rs,overview:Ls,accessOverview:As,accessSummary:Ts,accessTableWrap:Ds,accessTable:Os,accessCellLabel:Fs,selectionToolbar:qs,selectAll:Us,workerSelection:Ws,workerGrid:Bs,workerCard:Vs,workerIdentityBlock:Hs,workerHeader:Gs,workerService:Js,syncMeta:Ks,workerName:Ys,workerState:Xs,workerVersions:Zs,resourceNote:Qs,telemetryNote:ea,sectionLabel:na,syncMessage:ra,accessDialog:ta,accessTargets:sa,accessOutcomes:aa,accessMixed:ia,accessResults:oa,accessForm:la,accessError:ca,workerAccess:da,workerResources:pa,resourceRow:ua,resourceReadings:ma,resourceTitle:ha,resourceReading:xa,resourceLabel:fa,resourceBar:ga,workerActivity:ba,workerTask:ya,workerSync:ja,inventoryAction:va,inventoryLabel:_a,syncActionLabel:wa,cardActions:ka,historyControls:Na,workerDialog:Sa,workerActions:$a,capabilities:Ca,temperatureDialog:za};function Ea({workers:n,now:r,teams:t,unavailable:s,onSave:i,onClose:a}){const[o]=d.useState(()=>{const v=n.map($=>Wn($,r)),j=v[0]??{team_id:null,expires_at:null},S=v.some($=>$.team_id!==j.team_id||$.expires_at!==j.expires_at);return{access:j,mixed:S}}),[l,p]=d.useState(o.mixed?"":o.access.team_id?"team":"public"),[c,u]=d.useState(o.mixed?"":o.access.team_id??""),[g,x]=d.useState(()=>o.mixed?"":Pr(o.access.expires_at)),[m,_]=d.useState(null),[y,N]=d.useState({}),[w,h]=d.useState(!1),b=d.useId(),k=d.useRef(null),R=v=>{if(l!=="team"||t.loading||t.teams===null)return;const j=Cn(l,c,g,t.teams,r);N(S=>({...S,[v]:j.errors?.[v]}))},D=l==="team"&&(t.loading||t.teams===null||!t.teams.length),C=c&&!t.teams?.some(v=>v.id===c),P=l?Cn(l,c,g,t.teams,r):null,T=m!==null&&!!P?.value&&P.value.team_id===m.value.team_id&&P.value.expires_at===m.value.expires_at,f=m?T?`仅重试失败的 ${m.result.failed.length} 台设备`:`保存新配置到全部 ${n.length} 台设备`:"保存使用范围";return e.jsxs(de,{title:"设备使用范围",className:I.accessDialog,onClose:a,submitLabel:f,errorFocusRef:k,submitDisabled:!!s||!l||D,onSubmit:async()=>{if(s)throw new Error(s);if(!l)throw new Error("请选择统一使用范围");if(l==="team"&&(t.loading||t.teams===null))throw new Error("请先成功加载项目组");const v=Cn(l,c,g,t.teams,r);if(h(!0),N(v.errors??{}),v.errors)throw new Error("请修正标注的使用范围配置");const j=m!==null&&v.value.team_id===m.value.team_id&&v.value.expires_at===m.value.expires_at,S=j?m.result.failed.map(G=>G.worker_id):n.map(G=>G.id),$=await i(S,v.value),Z={succeeded:[...new Set([...j?m.result.succeeded:[],...$.succeeded])],failed:$.failed};if(_({value:v.value,result:Z}),Z.failed.length)throw new Error(`已成功保存 ${Z.succeeded.length} 台，${Z.failed.length} 台失败；成功设备不会回滚，保持相同配置时仅重试失败设备`)},children:[e.jsxs("p",{children:["已选 ",n.length," 台设备，统一设置使用范围："]}),e.jsx("ul",{className:I.accessTargets,"aria-label":"本次设置的设备",tabIndex:0,children:n.map(v=>e.jsxs("li",{children:[e.jsx("strong",{children:v.name||v.id}),e.jsxs("span",{children:["（",v.id,"）"]})]},v.id))}),e.jsx("div",{className:"notice-box",children:"项目组专用按所有成员授权，组外不可见、不可用；组内任务优先使用专用设备，再使用公共设备。管理员可见全部设备。已有任务不中断。同名或同一节点标识的其他注册也会同步设置。"}),e.jsx("p",{className:"muted small",children:"逐台保存，并非原子操作：遇到失败停止后续保存，已成功的设置不会撤销；配置不变时只重试失败或未提交设备。"}),o.mixed&&e.jsx("p",{className:I.accessMixed,children:"所选设备当前使用范围或结束时间不一致，请选择统一使用范围；仅在保存时覆盖原配置。"}),s&&e.jsx("p",{role:"alert",className:"danger",children:s}),e.jsxs("div",{className:I.accessForm,children:[w&&(y.team||y.expiry)&&e.jsxs("div",{ref:k,tabIndex:-1,role:"alert",className:"danger","aria-label":"请修正使用范围配置",children:[e.jsx("p",{children:"请修正以下配置："}),y.team&&e.jsx("p",{children:e.jsx("a",{href:`#${b}-team`,onClick:v=>{v.preventDefault(),document.getElementById(`${b}-team`)?.focus()},children:y.team})}),y.expiry&&e.jsx("p",{children:e.jsx("a",{href:`#${b}-expiry`,onClick:v=>{v.preventDefault(),document.getElementById(`${b}-expiry`)?.focus()},children:y.expiry})})]}),m&&e.jsxs("div",{ref:w&&(y.team||y.expiry)?void 0:k,tabIndex:-1,role:"status","aria-live":"polite","aria-label":"设备使用范围保存结果",className:I.accessResults,children:[e.jsxs("p",{children:["上次保存结果：",m.result.succeeded.length," 台成功，",m.result.failed.length," ","台失败。"]}),e.jsx("ul",{className:I.accessOutcomes,"aria-label":"各设备保存结果",tabIndex:0,children:n.map(v=>{const j=m.result.failed.find($=>$.worker_id===v.id),S=m.result.succeeded.includes(v.id);return e.jsxs("li",{"data-tone":j?"bad":S?"ok":void 0,children:[e.jsxs("strong",{children:[v.name||v.id,"（",v.id,"）"]}),e.jsx("span",{children:j?`失败：${j.error}`:S?"保存成功":"未提交"})]},v.id)})}),e.jsx("p",{children:T?"配置未变：再次保存仅重试失败设备，成功设备不重复提交。":"配置已更改：再次保存会向全部所选设备应用新配置，包括上次成功的设备。"})]}),e.jsx("label",{htmlFor:`${b}-scope`,children:"使用范围"}),e.jsxs("select",{id:`${b}-scope`,value:l,disabled:!!s,onChange:v=>{p(v.target.value),N({})},children:[o.mixed&&e.jsx("option",{value:"",disabled:!0,children:"请选择统一使用范围"}),e.jsx("option",{value:"public",children:"公共"}),e.jsx("option",{value:"team",children:"项目组专用"})]}),l==="team"&&e.jsxs(e.Fragment,{children:[e.jsx("label",{htmlFor:`${b}-team`,children:"授权项目组（所有成员）"}),e.jsxs("select",{id:`${b}-team`,value:c,disabled:!!s||t.loading||t.teams===null,"aria-invalid":!!y.team,"aria-describedby":y.team?`${b}-team-error`:void 0,onBlur:()=>R("team"),onChange:v=>{u(v.target.value),N(j=>({...j,team:void 0}))},children:[e.jsx("option",{value:"",children:"请选择项目组"}),C&&e.jsxs("option",{value:c,disabled:!0,children:["项目组 ",c,"（未在当前列表中）"]}),t.teams?.map(v=>e.jsx("option",{value:v.id,children:v.name},v.id))]}),t.loading&&e.jsx("p",{role:"status",children:"正在加载项目组…"}),t.error&&e.jsxs("div",{role:"alert",className:"danger",children:[e.jsxs("p",{children:[t.error,"，不能据此判断没有项目组。"]}),e.jsx("button",{type:"button",disabled:!!s,onClick:t.retry,children:"重试加载项目组"})]}),!t.loading&&t.teams?.length===0&&e.jsx("p",{children:"暂无项目组，请先在项目组管理中创建。"}),e.jsx("p",{id:`${b}-team-error`,className:`danger ${I.accessError}`,children:y.team}),e.jsx("label",{htmlFor:`${b}-expiry`,children:"结束时间（可选，本地时间）"}),e.jsx("input",{id:`${b}-expiry`,type:"datetime-local",step:"1",value:g,disabled:!!s,"aria-invalid":!!y.expiry,"aria-describedby":`${b}-expiry-help${y.expiry?` ${b}-expiry-error`:""}`,onBlur:()=>R("expiry"),onChange:v=>{x(v.target.value),N(j=>({...j,expiry:void 0}))}}),e.jsxs("p",{id:`${b}-expiry-help`,className:"muted small",children:["当前时区：",Intl.DateTimeFormat().resolvedOptions().timeZone,"。到期自动恢复公共；不设置则保持专用，直到手动解除。"]}),e.jsx("p",{id:`${b}-expiry-error`,className:`danger ${I.accessError}`,children:y.expiry})]}),l==="public"&&e.jsx("p",{className:"muted small",children:"保存后解除项目组限制和结束时间，恢复公共使用；已有任务不中断。"})]})]})}const Bn=Me(["pending","running","succeeded","failed","canceled","timed_out","unknown","skipped","expired"]),Vn=Me(["python","powershell"]),Ir=Sr({request_key:St(),all_online:Y(),worker_ids:q(z().min(1)),interpreter:Vn,script:z().refine(n=>n.trim().length>0,"请输入脚本"),cwd:z(),timeout_seconds:U().int().min(5).max(3600)}).refine(n=>n.all_online?n.worker_ids.length===0:n.worker_ids.length>0,{message:"请选择至少一台执行端；全部在线模式不能同时指定设备"});function Rr(){if(typeof crypto.randomUUID=="function")return crypto.randomUUID();const n=crypto.getRandomValues(new Uint8Array(16)),r=Array.from(n,(t,s)=>(s===6?t&15|64:s===8?t&63|128:t).toString(16).padStart(2,"0")).join("");return`${r.slice(0,8)}-${r.slice(8,12)}-${r.slice(12,16)}-${r.slice(16,20)}-${r.slice(20)}`}const pn=U().finite(),Lr=A({id:z().min(1),created_by:z(),created_at:pn,interpreter:Vn,timeout_seconds:U().int().min(5).max(3600),counts:bn(Bn,U().int().nonnegative().default(0)),target_count:U().int().nonnegative()}),Ma=A({id:z().min(1),batch_id:z().min(1),worker_id:z(),worker_name:z(),host_id:z().nullable(),status:Bn,created_at:pn,started_at:pn.nullable(),finished_at:pn.nullable(),cancel_requested:Y(),process_stopped:Y(),exit_code:U().int().nullable(),stdout:z(),stderr:z(),stdout_truncated:Y(),stderr_truncated:Y(),error:z(),worker_ids:q(z())}),or=A({batch:Lr.extend({script:z(),cwd:z(),all_online:Y(),request_key:z()}),executions:q(Ma)}).refine(n=>n.executions.every(r=>r.batch_id===n.batch.id),{message:"命令明细批次不一致"}),Pa=A({batches:q(Lr),next_offset:U().int().nonnegative().nullable()}),Ia=A({presets:q(A({id:ce("model_inventory"),label:z(),interpreter:ce("python"),script:z()}))}),Ar={pending:{label:"等待执行",tone:"info"},running:{label:"正在执行",tone:"info"},succeeded:{label:"执行成功",tone:"ok"},failed:{label:"执行失败",tone:"bad"},canceled:{label:"已取消",tone:"warn"},timed_out:{label:"执行超时",tone:"warn"},unknown:{label:"状态未知 · 进程可能仍在运行",tone:"warn"},skipped:{label:"已跳过",tone:"warn"},expired:{label:"已过期",tone:"warn"}},lr=n=>["pending","running","unknown"].includes(n.status)&&!n.cancel_requested,cn="/api/admin/worker-commands";function Ra(n){const r=i=>`${cn}/${encodeURIComponent(i)}`,t=async(i,a,o,l)=>(l(),n.read(i,or,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a),signal:o})),s=(i,a)=>{if(i.batch.id!==a)throw new Error("返回的命令批次不一致，请刷新核实");return i};return{history(i,a){return n.read(`${cn}?offset=${i}&limit=20`,Pa,{cache:"no-store",signal:a})},presets(i){return n.read(`${cn}/presets`,Ia,{cache:"no-store",signal:i})},async detail(i,a){return s(await n.read(r(i),or,{cache:"no-store",signal:a}),i)},async create(i,a,o){const l=Ir.parse(i),p=await t(cn,l,a,o);if(p.batch.request_key!==l.request_key||p.batch.script!==l.script||p.batch.interpreter!==l.interpreter||p.batch.cwd!==l.cwd||p.batch.timeout_seconds!==l.timeout_seconds||p.batch.all_online!==l.all_online)throw new Error("返回的命令与提交内容不一致，请到历史核实；不要更换请求标识重发");return p},async cancel(i,a,o,l){return s(await t(`${r(i)}/cancel`,a?{execution_id:a}:{},o,l),i)},async resolve(i,a,o,l){return s(await t(`${r(i)}/resolve`,{execution_id:a,confirmed_stopped:!0},o,l),i)}}}function La(n,r,t){const s=d.useMemo(()=>Ra(n.http),[n.http]),[i,a]=d.useState([]),[o,l]=d.useState(null),[p,c]=d.useState([]),[u,g]=d.useState(""),[x,m]=d.useState(null),[_,y]=d.useState(null),[N,w]=d.useState(0),[h,b]=d.useState(""),[k,R]=d.useState("bad"),[D,C]=d.useState(""),[P,T]=d.useState(!1),[f,v]=d.useState(!1),j=d.useRef(null),S=d.useRef({context:n,canMutate:t});d.useLayoutEffect(()=>{S.current={context:n,canMutate:t}},[n,t]),d.useEffect(()=>{if(!r)return;const O={controller:new AbortController,detailRead:null,revision:0,busy:!1};j.current=O;const V=O.controller.signal;let H;v(!1),m(null),a([]),c([]),g(""),C(""),s.presets(V).then(pe=>{V.aborted||c(pe.presets)}).catch(pe=>{V.aborted||g(`预设未获取，可手动输入脚本：${re(pe)}`)});const me=async()=>{if(V.aborted)return;if(O.busy){H=setTimeout(()=>{me()},2e3);return}const pe=O.revision,se=new AbortController;O.detailRead=se;const he=()=>se.abort();V.addEventListener("abort",he,{once:!0}),T(!0);try{const[M,oe]=await Promise.all([s.history(N,se.signal),_?s.detail(_,se.signal):Promise.resolve(null)]);!V.aborted&&!se.signal.aborted&&pe===O.revision&&(a(M.batches),l(M.next_offset),m(oe),C(""))}catch(M){!V.aborted&&!se.signal.aborted&&pe===O.revision&&C(`命令记录读取失败，现有内容可能已过期：${re(M)}`)}finally{V.removeEventListener("abort",he),V.aborted||(T(!1),H=setTimeout(()=>{me()},3e3))}};return me(),()=>{O.controller.abort(),O.detailRead?.abort(),clearTimeout(H),j.current===O&&(j.current=null)}},[r,s,N,_]);const $=d.useCallback(async(O,V)=>{const H=j.current;if(!H||H.controller.signal.aborted||H.busy)return!1;const me=()=>{const{context:se,canMutate:he}=S.current;if(H.controller.signal.aborted)throw new DOMException("请求已停止监听","AbortError");if(se.sandbox||se.user.role!=="admin"||!he())throw new Error("当前为隔离副本、权限不足或服务状态未就绪，禁止发送远程命令")};H.busy=!0,H.revision++,H.detailRead?.abort(),v(!0),b("");let pe=!1;try{me(),pe=!0;const se=await O(H.controller.signal,me);return H.controller.signal.aborted?!1:(m(se),y(se.batch.id),S.current.context.notify({message:V,tone:"success"}),!0)}catch(se){if(!H.controller.signal.aborted){const he=pe&&!(se instanceof Nr&&se.status>=400&&se.status<500),M=se instanceof TypeError?"网络响应未能确认":re(se),oe=he?`${M}。请求结果未确认，请先核对历史；创建重试将保留原请求标识。`:`${M}。请求未获受理，输入和请求标识已保留；请核实后再操作。`;b(oe),R(he?"warn":"bad"),S.current.context.notify({message:oe,tone:he?"warning":"error"})}return!1}finally{H.busy=!1,H.controller.signal.aborted||v(!1)}},[]);return{batches:i,nextOffset:o,presets:p,presetError:u,detail:x,selected:_,offset:N,error:h,errorTone:k,readError:D,loading:P,busy:f,create:O=>$((V,H)=>s.create(O,V,H),"命令批次已受理；不代表执行成功，请查看逐节点结果。"),cancel:O=>x?$((V,H)=>s.cancel(x.batch.id,O,V,H),"取消请求已提交；进程是否停止以执行端反馈为准。"):Promise.resolve(!1),resolve:O=>!x||x.executions.find(V=>V.id===O)?.status!=="unknown"?Promise.resolve(!1):$((V,H)=>s.resolve(x.batch.id,O,V,H),"现场核实记录已提交，请以服务器返回状态为准。"),select:O=>{j.current?.busy||(m(null),y(O),b(""))},page:O=>{j.current?.busy||w(O)}}}const Tr={idle:"空闲",busy:"运行中",syncing:"正在更新",offline:"离线",disabled:"已禁用",error:"异常",queued:"排队中",assigned:"已分配",running:"运行中",done:"已完成",canceled:"已取消",cancel_requested:"正在取消"},Aa={idle:"尚未更新",pending:"等待空闲",running:"更新并重启中",done:"更新重启完成",error:"更新重启失败"},X=n=>(typeof n=="number"||typeof n=="string")&&n!==""&&Number.isFinite(Number(n))?Number(n):null,Ce=n=>X(n)==null?"未获取":String(n),Ta=n=>{const r=X(n);return r==null?null:Math.max(0,Math.min(100,r))},De=n=>{const r=X(n);return r==null?"未记录":new Date(r*1e3).toLocaleString("zh-CN",{hour12:!1})};function Hn(n){const r=X(n);return r==null||r<0?"未记录":r<60?`${Math.round(r)}秒`:r<3600?`${Math.floor(r/60)}分${Math.floor(r%60)}秒`:`${Math.floor(r/3600)}小时${Math.floor(r%3600/60)}分`}function Se(n){const r=X(n);return r==null?"未采集":r>=1024**3?`${(r/1024**3).toFixed(1)} GB`:r>=1024**2?`${(r/1024**2).toFixed(0)} MB`:`${Math.round(r/1024)} KB`}const Da=n=>["idle","done"].includes(n||"")?"ok":["busy","syncing","running","queued","assigned","cancel_requested"].includes(n||"")?"warn":["offline","disabled","error","canceled"].includes(n||"")?"bad":"",tn=n=>Tr[n||""]||n||"未知",Gn=n=>{if(ge(n))return"主节点 · 无需同步";if(n.sync_action==="restart_services"||n.sync_action==="reboot_host"){const r=n.sync_action==="reboot_host"?"电脑重启":"服务重启",t=n.sync_status;return t==="pending"?`${r} · 等待节点接收`:t==="running"?`${r}中`:t==="done"?`${r}完成`:t==="error"?`${r}失败`:"未记录"}return Aa[n.sync_status||""]||n.sync_status||"未记录"},ge=n=>n.is_primary_node===!0,Oe=n=>!ge(n)&&["pending","running"].includes(n.sync_status||""),Fe=n=>!ge(n)&&n.sync_status==="error",ue=n=>n.state!=="offline",Dr=n=>typeof n=="number"||typeof n=="string"&&n.trim()?`Worker v${n}`:"Worker 版本未知",Or=n=>Dr(n.capabilities?.agent_version);function Fr(n){const r=n.capabilities?.system,t=r?.comfyui_build_version?.trim(),s=r?.comfyui_version?.trim();return t?`ComfyUI ${t}`:s?`ComfyUI ${s} · 定制版本未记录`:"ComfyUI 版本未记录"}const Oa=(n,r=Date.now())=>{const t=X(n?.health.server_time);return t==null||!n?r/1e3:t+(r-n.receivedAt)/1e3},Jn=(n,r)=>{const t=X(n);return t==null?"未记录":`${Hn(Math.max(0,r-t))}前`};function Kn(n,r,t){const s=X(n.capabilities?.telemetry?.collected_at);return!t&&ue(n)&&s!=null&&r-s<=60&&r-s>=-10}function jn(n){return ue(n)?n.enabled===!1||n.enabled===0||n.state==="disabled"?["已禁用接收","bad"]:Oe(n)?[["restart_services","reboot_host"].includes(n.sync_action||"")?"维护期间不可接任务":"同步期间不可接任务","bad"]:n.comfy_online===!1||n.state==="error"?["不可接任务","bad"]:n.busy||n.current_job_id||n.state==="busy"?["正在占用","warn"]:n.state==="idle"&&n.comfy_online===!0?["可接任务","ok"]:["接收状态未知",""]:["不可接任务","bad"]}function Yn(n,r={}){const t=n.capability_comparison||{};if(r.status==="none")return{label:"未设置主节点基准",tone:"warn"};if(r.status==="ambiguous")return{label:"主节点不唯一",tone:"bad"};if(ge(n)&&t.status==="primary")return{label:"主节点基准",tone:r.status==="stale"?"warn":"ok"};const s=t.missing_models?.length||0,i=t.missing_node_classes?.length||0,a=t.extra_models?.length||0,o=t.extra_node_classes?.length||0;let l,p="warn";return t.model_inventory_status==="unknown"?(l=["模型清单未知",i?`节点不全 · 缺 ${i} 个`:""].filter(Boolean).join("；"),i&&(p="bad")):t.status==="unknown"||!t.status?l="清单未知":s||i?(l=[s?`模型不全 · 缺 ${s} 个`:"",i?`节点不全 · 缺 ${i} 个`:""].filter(Boolean).join("；"),p="bad"):t.status==="stale"?l=a||o?"节点离线 · 主节点所需齐全，存在额外清单":"节点离线 · 最后清单一致":a||o?(l=`主节点所需齐全 · ${[a?`额外 ${a} 个模型`:"",o?`额外 ${o} 个节点`:""].filter(Boolean).join("；")}`,p="ok"):(l="清单一致",p="ok"),t.status==="stale"&&(s||i)&&(l=`节点离线 · 最后清单：${l}`),r.status==="stale"&&(l=`基准离线 · ${l}`),{label:l,tone:p}}function qr(n,r){if(ge(n))return"主节点作为同步源，不参与同步";if(!ue(n))return"设备已离线，请上线后重试";if(n.capabilities?.supports_code_restart!==!0)return"请先升级 Worker 及配套启动文件";if(Oe(n))return"设备已有等待中或执行中的维护请求";if(r.status!=="ready")return"主节点基准不可用，请刷新后重试";const t=n.capability_comparison;return!t?.status||["unknown","stale"].includes(t.status)||t.model_inventory_status==="unknown"?"清单未知或已过期，请刷新后重试":!t.missing_models?.length&&!t.missing_node_classes?.length?"主节点所需资源齐全，无需补齐":""}function Rn(n){const r=n.comparisonBaseline;if(r.status==="none")return"未设置主节点，无法比较";if(r.status==="ambiguous")return"检测到多个主节点，无法确定比较基准";const t=n.workers.find(s=>s.id===r.worker_id)?.name||r.worker_id||"未命名主节点";return`${r.status==="stale"?"主节点离线 · 最后清单":"在线主节点"} · ${t} · ${Dr(r.agent_version)}`}function sn(n){const r=n.capabilities;return r?.telemetry?.gpus?.length?r.telemetry.gpus:(r?.devices||[]).map((t,s)=>{const i=X(t.vram_total),a=X(t.vram_free);return{index:t.index??s,name:t.name||t.device_name||t.type,memory_total_bytes:i,memory_used_bytes:i!=null&&a!=null?Math.max(0,i-a):null,utilization_percent:null,temperature_c:null}})}function Ur(n){if(n.capabilities?.telemetry?.memory)return n.capabilities.telemetry.memory;const r=n.capabilities?.system,t=X(r?.ram_total),s=X(r?.ram_free);return{total_bytes:t,used_bytes:t!=null&&s!=null?Math.max(0,t-s):null}}const Wr=(n,r)=>r.projects.find(t=>t.id===n.project)?.name||n.projectName||(n.project?"项目已删除":"未归属项目"),Ln=16e3;function Fa(n,r){const t=s=>s>0&&s<n.length&&n.charCodeAt(s)>=56320&&n.charCodeAt(s)<=57343?s-1:s;return n.slice(t(r*Ln),t((r+1)*Ln))}const qa="_dialog_1sy2y_1",Ua="_content_1sy2y_5",Wa="_row_1sy2y_10",Ba="_stack_1sy2y_16",Va="_editor_1sy2y_17",Ha="_targets_1sy2y_23",Ga="_target_1sy2y_23",Ja="_warning_1sy2y_60",Ka="_execution_1sy2y_67",Ya="_identifier_1sy2y_94",ae={dialog:qa,content:Ua,row:Wa,stack:Ba,editor:Va,targets:Ha,target:Ga,warning:Ja,execution:Ka,identifier:Ya};function Br({counts:n}){return e.jsx("div",{className:ae.row,children:Bn.options.map(r=>{const t=Ar[r],s=n[r];return s>0?e.jsxs("span",{"data-tone":t.tone,children:[t.label," ",s]},r):null})})}function Xa({detail:n,disabled:r,onCancel:t,onResolve:s}){const{batch:i,executions:a}=n;return e.jsxs("section",{className:ae.stack,"aria-label":"命令批次明细",children:[e.jsxs("h3",{children:["服务器目标快照 · ",i.id]}),e.jsxs("p",{children:["创建人 ",i.created_by," · ",new Date(i.created_at*1e3).toLocaleString("zh-CN")," ·"," ",i.interpreter," · 超时 ",i.timeout_seconds," 秒"]}),e.jsxs("p",{children:["目标 ",i.target_count," · ",i.all_online?"全部在线（由服务器冻结）":"指定执行端"," · cwd：",i.cwd||"执行端默认目录"]}),e.jsx(Br,{counts:i.counts}),e.jsxs("details",{children:[e.jsx("summary",{children:"查看提交的脚本与请求标识"}),e.jsx("pre",{children:i.script}),e.jsxs("p",{children:["request_key：",i.request_key]})]}),e.jsx("button",{type:"button",disabled:r||!a.some(lr),onClick:()=>t(),children:"取消批次全部"}),a.length===0&&e.jsx("p",{children:"服务器尚未返回逐节点记录；不能据此判断执行成功。"}),a.map(o=>{const l=Ar[o.status];return e.jsxs("article",{className:ae.execution,"aria-label":`执行结果 ${o.worker_name||o.worker_id}`,children:[e.jsxs("div",{className:ae.row,children:[e.jsx("h4",{children:o.worker_name||o.worker_id}),e.jsx("strong",{"data-tone":l.tone,children:l.label})]}),e.jsxs("p",{children:["worker：",o.worker_id," · host：",o.host_id??"未记录"," · 同宿主原 worker：",o.worker_ids.join("、")||"未记录"]}),e.jsxs("p",{children:["开始：",o.started_at===null?"尚未记录":new Date(o.started_at*1e3).toLocaleString("zh-CN")," ","· 结束：",o.finished_at===null?"尚未记录":new Date(o.finished_at*1e3).toLocaleString("zh-CN")]}),e.jsxs("p",{children:["退出码：",o.exit_code??"未返回",o.exit_code===0&&o.status!=="succeeded"?"（仅退出码为 0 不代表执行成功）":""," ","· 进程停止：",o.process_stopped?"已确认":"未确认"," · 取消请求：",o.cancel_requested?"已请求，等待核实停止":"未请求"]}),o.error&&e.jsxs("div",{"data-tone":l.tone,children:[e.jsx("b",{children:o.status==="skipped"?"服务器跳过原因":"服务器说明"}),e.jsx("pre",{children:o.error})]}),e.jsxs("div",{className:ae.row,children:[e.jsx("button",{type:"button",disabled:r||!lr(o),onClick:()=>t(o.id),children:"取消此节点"}),o.status==="unknown"&&e.jsx("button",{type:"button",disabled:r,onClick:()=>s(o.id),children:"现场核实停止后解除占用"})]}),e.jsxs("h5",{children:["标准输出 stdout",o.stdout_truncated?" · 已截断，仅显示服务器保留部分":""]}),e.jsx("pre",{"aria-label":`${o.worker_name||o.worker_id} 标准输出`,tabIndex:0,children:o.stdout||"（暂无输出）"}),e.jsxs("h5",{children:["标准错误 stderr",o.stderr_truncated?" · 已截断，仅显示服务器保留部分":""]}),e.jsx("pre",{"aria-label":`${o.worker_name||o.worker_id} 标准错误`,tabIndex:0,children:o.stderr||"（暂无输出）"})]},o.id)})]})}const Za=()=>({request_key:Rr(),all_online:!1,worker_ids:[],interpreter:"python",cwd:"",script:"",timeout_seconds:300});function Qa({context:n,open:r,workers:t,canMutate:s,unavailable:i,onClose:a}){const o=La(n,r,s),[l,p]=d.useState(Za),[c,u]=d.useState("edit"),[g,x]=d.useState(!1),[m,_]=d.useState(""),[y,N]=d.useState(null),[w,h]=d.useState(!1),b=d.useRef(null),k=d.useRef(null);d.useEffect(()=>{r&&y&&(b.current?.focus({preventScroll:!0}),b.current?.scrollIntoView({block:"nearest"}))},[r,y]),d.useEffect(()=>{r&&(m||o.error)&&(k.current?.focus({preventScroll:!0}),k.current?.scrollIntoView({block:"nearest"}))},[r,m,o.error]);const R=t.filter(ue),D=i||n.sandbox||n.user.role!=="admin",C=l.all_online?R:R.filter(j=>l.worker_ids.includes(j.id)),P=!l.all_online&&C.length!==l.worker_ids.length,T=j=>{o.busy||(p(S=>({...S,...j,request_key:Rr()})),x(!1),_(""))},f=()=>{if(!Ir.safeParse(l).success){_("请选择至少一台在线执行端，填写脚本，并将超时设置为 5–3600 的整数秒。");return}if(P){_("已选执行端不在当前在线快照，请重新选择；不会静默删除目标。");return}x(!1),u("confirm")},v=j=>{h(!1),N(j)};return r?e.jsx(de,{title:"远程命令",className:ae.dialog,onClose:()=>{x(!1),N(null),h(!1),a()},showFooter:!1,children:e.jsxs("div",{className:ae.content,children:[e.jsxs("div",{className:ae.warning,children:[e.jsx("b",{children:"仅限管理员执行可信脚本：这是真实 Windows shell，不是沙箱。"}),e.jsx("p",{children:"脚本可修改文件、停止服务或造成不可逆后果。主节点也可执行；旧 Worker 不支持时由服务器明确跳过。同宿主合并、目标冻结和跳过原因以服务器结果为准。"}),e.jsx("p",{children:"命令正文和输出会写入审计历史，请勿填入密码、token 或其他凭证。"}),e.jsx("p",{children:"关闭弹窗只停止页面监听，不取消已提交任务。取消请求也不等于进程已经停止。"})]}),e.jsxs("div",{className:ae.row,"aria-label":"命令视图",children:[e.jsx("button",{type:"button",disabled:o.busy,onClick:()=>{u("edit"),N(null)},children:"编辑命令"}),e.jsx("button",{type:"button",disabled:o.busy,onClick:()=>{u("history"),N(null)},children:"命令历史"}),o.selected&&e.jsx("button",{type:"button",disabled:o.busy,onClick:()=>u("detail"),children:"当前批次明细"})]}),D&&e.jsx("p",{className:ae.warning,role:"status",children:"隔离副本、权限不足或运行状态未就绪：仅可查看记录，禁止提交、取消和解除占用。"}),(o.error||m)&&e.jsx("p",{ref:k,role:"alert","aria-label":"命令表单反馈","data-tone":m?"bad":o.errorTone,tabIndex:-1,children:m||o.error}),o.readError&&e.jsx("p",{role:"alert","data-tone":"warn",children:o.readError}),c==="edit"&&e.jsxs("fieldset",{className:ae.editor,disabled:o.busy,children:[e.jsx("legend",{children:"新命令"}),e.jsxs("label",{children:["目标范围",e.jsxs("select",{value:l.all_online?"all":"selected",onChange:j=>T({all_online:j.target.value==="all",worker_ids:[]}),children:[e.jsx("option",{value:"selected",children:"选择单台 / 多台在线执行端"}),e.jsx("option",{value:"all",children:"全部在线（服务器提交时冻结）"})]})]}),e.jsxs("fieldset",{className:ae.targets,disabled:l.all_online,children:[e.jsxs("legend",{children:["在线执行端 · 当前快照 ",R.length," 台"]}),R.length===0&&e.jsx("p",{children:"当前没有在线执行端。"}),R.map(j=>{const S=j.capabilities?.remote_commands,$=S&&S.version>=1&&S.interpreters.includes(l.interpreter);return e.jsxs("label",{className:ae.target,children:[e.jsx("input",{type:"checkbox",checked:!l.all_online&&l.worker_ids.includes(j.id),onChange:Z=>T({worker_ids:Z.target.checked?[...l.worker_ids,j.id]:l.worker_ids.filter(G=>G!==j.id)})}),e.jsxs("span",{children:[j.name||j.id,j.is_primary_node?" · 主节点（可命令）":"",e.jsxs("small",{children:[j.id," ·"," ",$?"已上报解释器支持":S?"未上报当前解释器支持，服务器可能跳过":"旧 Worker / 未上报远程命令能力，服务器将核实并跳过不支持节点"]})]})]},j.id)})]}),P&&e.jsxs("p",{"data-tone":"warn",children:["已选目标已离线或不在快照：",l.worker_ids.filter(j=>!R.some(S=>S.id===j)).join("、"),"。请重新选择。"]}),e.jsxs("label",{children:["解释器",e.jsxs("select",{value:l.interpreter,onChange:j=>{const S=Vn.safeParse(j.target.value);S.success&&T({interpreter:S.data})},children:[e.jsx("option",{value:"python",children:"Python"}),e.jsx("option",{value:"powershell",children:"PowerShell"})]})]}),e.jsxs("label",{children:["工作目录 cwd（空白使用默认目录）",e.jsx("input",{value:l.cwd,onChange:j=>T({cwd:j.target.value})})]}),e.jsxs("label",{children:["超时（秒，5–3600）",e.jsx("input",{type:"number",min:5,max:3600,step:1,value:Number.isNaN(l.timeout_seconds)?"":l.timeout_seconds,onChange:j=>T({timeout_seconds:j.target.valueAsNumber})})]}),e.jsxs("label",{children:["可选预设",e.jsxs("select",{defaultValue:"",onChange:j=>{const S=o.presets.find($=>$.id===j.target.value);S&&T({interpreter:S.interpreter,script:S.script}),j.target.value=""},children:[e.jsx("option",{value:"",children:"不使用预设 / 手动输入"}),o.presets.map(j=>e.jsx("option",{value:j.id,children:j.label},j.id))]})]}),o.presetError&&e.jsx("p",{"data-tone":"warn",children:o.presetError}),e.jsxs("label",{children:["脚本 script",e.jsx("textarea",{rows:12,value:l.script,spellCheck:!1,onChange:j=>T({script:j.target.value})})]}),e.jsx("p",{children:"预设仅填入脚本，不会自动执行。模型盘点为第一页，可在脚本中编辑 offset 后重新确认。"}),e.jsxs("p",{className:ae.identifier,children:["请求标识：",l.request_key,"。失败重试保留此标识；编辑命令或目标后生成新标识。"]}),e.jsx("button",{type:"button",className:"primary",disabled:D||o.busy,onClick:f,children:"检查命令并继续"})]}),c==="confirm"&&e.jsxs("section",{className:ae.stack,"aria-label":"二次确认命令",children:[e.jsx("h3",{children:"二次确认 · 即将在真实执行端运行"}),e.jsx("p",{children:l.all_online?"全部在线，最终目标由服务器提交时冻结；下列仅为当前快照预览。":"指定以下执行端；同宿主可能合并。"}),e.jsx("ul",{children:C.map(j=>e.jsxs("li",{children:[j.name||j.id,"（",j.id,"）",j.is_primary_node?" · 主节点":"",j.capabilities?.remote_commands?"":" · 旧 Worker，可能跳过"]},j.id))}),e.jsxs("p",{children:[l.interpreter," · cwd：",l.cwd||"默认目录"," · 超时 ",l.timeout_seconds," 秒"]}),e.jsx("pre",{children:l.script}),e.jsxs("p",{className:ae.identifier,children:["request_key：",l.request_key]}),e.jsxs("label",{className:ae.target,children:[e.jsx("input",{type:"checkbox",checked:g,disabled:o.busy,onChange:j=>x(j.target.checked)}),"我已核对目标和脚本，理解这不是沙箱并接受不可逆风险"]}),e.jsxs("div",{className:ae.row,children:[e.jsx("button",{type:"button",disabled:o.busy,onClick:()=>u("edit"),children:"返回修改"}),e.jsx("button",{type:"button",className:"primary",disabled:D||o.busy||!g||P,onClick:()=>{!g||P||o.create(l).then(j=>{j&&(u("detail"),x(!1))})},children:o.busy?"正在提交…":"确认提交远程命令"})]})]}),c==="history"&&e.jsxs("section",{className:ae.stack,"aria-label":"命令历史列表",children:[e.jsx("h3",{children:"命令历史"}),o.batches.length===0&&e.jsx("p",{children:o.loading?"正在读取…":o.readError?"历史尚未获取。":"暂无命令批次。"}),o.batches.map(j=>e.jsxs("article",{className:ae.execution,children:[e.jsxs("button",{type:"button",disabled:o.busy,onClick:()=>{o.select(j.id),N(null),u("detail")},children:["查看批次 ",j.id]}),e.jsxs("p",{children:[new Date(j.created_at*1e3).toLocaleString("zh-CN")," · ",j.created_by," ·"," ",j.interpreter," · 超时 ",j.timeout_seconds," 秒 · 目标 ",j.target_count]}),e.jsx(Br,{counts:j.counts})]},j.id)),e.jsxs("div",{className:ae.row,children:[e.jsx("button",{type:"button",disabled:o.loading||o.busy||o.offset===0,onClick:()=>o.page(Math.max(0,o.offset-20)),children:"上一页"}),e.jsxs("span",{children:["第 ",Math.floor(o.offset/20)+1," 页"]}),e.jsx("button",{type:"button",disabled:o.loading||o.busy||o.nextOffset===null,onClick:()=>{o.nextOffset!==null&&o.page(o.nextOffset)},children:"下一页"})]})]}),c==="detail"&&e.jsxs(e.Fragment,{children:[o.detail?e.jsx(Xa,{detail:o.detail,disabled:D||o.busy||!!o.readError,onCancel:j=>v({kind:"cancel",id:j}),onResolve:j=>v({kind:"resolve",id:j})}):e.jsx("p",{role:"status",children:o.readError?"明细未获取，请等待重试。":"正在读取服务器目标快照…"}),y&&e.jsxs("section",{className:ae.warning,ref:b,tabIndex:-1,"aria-label":y.kind==="resolve"?"核实停止确认":"取消命令确认",children:[e.jsx("h3",{children:y.kind==="resolve"?"谨慎确认：仅解除未知执行占用":"确认请求取消"}),e.jsxs("p",{children:["批次 ",o.detail?.batch.id," ·"," ",y.id?`执行记录 ${y.id}`:"批次全部节点"]}),y.kind==="resolve"?e.jsxs(e.Fragment,{children:[e.jsx("p",{children:"只有管理员已到现场或通过可信方式核实该宿主上的命令进程确实停止，才可解除占用。这不会终止进程，也不表示执行成功；错误解除可能导致并发操作。"}),e.jsxs("label",{className:ae.target,children:[e.jsx("input",{type:"checkbox",checked:w,disabled:o.busy,onChange:j=>h(j.target.checked)}),"我已现场核实该命令进程停止"]})]}):e.jsx("p",{children:"只提交取消请求，不保证进程立即停止。请继续检查逐节点状态，未知状态不能当作已取消。"}),e.jsxs("div",{className:ae.row,children:[e.jsx("button",{type:"button",disabled:o.busy,onClick:()=>N(null),children:"返回明细"}),e.jsx("button",{type:"button",disabled:D||o.busy||!!o.readError||y.kind==="resolve"&&!w,onClick:()=>{y.kind==="resolve"&&!w||(y.kind==="resolve"?o.resolve(y.id):o.cancel(y.id)).then(j=>{j&&N(null)})},children:o.busy?"正在提交…":y.kind==="resolve"?"确认进程已停止并解除占用":"确认请求取消"})]})]})]}),e.jsx("p",{role:"status",children:o.busy?"正在提交请求，请勿重复操作…":o.loading?"正在刷新命令记录…":"命令记录每 3 秒刷新；状态以服务器反馈为准。"})]})}):null}function ei(n){return{async history(r,t,s){const i=new URLSearchParams({limit:"50",status:r});return t!==null&&i.set("cursor",t),n.read(`/api/jobs/history?${i}`,ks,{cache:"no-store",signal:s})},async snapshot(r,t=()=>{}){const s={cache:"no-store",signal:r},[i,a,o,l,p]=await Promise.all([n.read("/api/health",ys,s).then(c=>(c.sandbox===!0&&!r.aborted&&t(),c)),n.read("/api/status",js,s),n.read("/api/workers",vs,s),n.read("/api/jobs",_s,s),n.read("/api/projects",Ns,s)]);return{health:i,status:a,workers:o.workers,comparisonBaseline:o.comparison_baseline||{status:"none"},jobs:l.jobs,projects:p.projects,receivedAt:Date.now()}},async temperature(r,t,s,i){const a=await n.read(`/api/workers/${encodeURIComponent(r)}/temperature?gpu_index=${t}&minutes=${s}`,Ms,{cache:"no-store",signal:i});if(a.worker_id!=null&&a.worker_id!==r||a.gpu_index!=null&&X(a.gpu_index)!==t||a.minutes!=null&&X(a.minutes)!==s)throw new Error("温度历史与所选节点或范围不一致");return{...a,points:a.points.flatMap(o=>o.at!=null&&o.at>=a.from&&o.at<=a.to?[{...o,at:o.at,temperature_c:o.temperature_c}]:[]).sort((o,l)=>o.at-l.at)}},async deleteWorker(r,t,s){return s(),Es.parse(await n.request(`/api/workers/${encodeURIComponent(r)}`,{method:"DELETE",signal:t}))},async restartWorker(r,t,s,i){i();const a=zs.parse(await n.request(`/api/admin/workers/${encodeURIComponent(r)}/restart`,{method:"POST",signal:s,headers:{"Content-Type":"application/json"},body:JSON.stringify({action:t})}));if(a.worker_id!==r||a.action!==t)throw new Error("重启响应与所选节点或操作不一致");return a},async syncWorker(r,t,s){s();const i=$s.parse(await n.request(`/api/admin/workers/${encodeURIComponent(r)}/sync`,{method:"POST",signal:t,headers:{"Content-Type":"application/json"},body:JSON.stringify({})}));if(i.worker_id!==r)throw new Error("同步响应与所选设备不一致");return i},async syncAll(r,t){return t(),Ss.parse(await n.request("/api/admin/workers/sync-all",{method:"POST",signal:r,headers:{"Content-Type":"application/json"},body:JSON.stringify({})}))}}}const cr=n=>({filter:n,jobs:[],initialized:!1,loadedPages:0,nextCursor:null,hasMore:!1,total:null,loading:null,error:"",failedAction:null});function zn(n,r){return(X(r.created)??0)-(X(n.created)??0)||(n.id<r.id?1:n.id>r.id?-1:0)}function ni(n,r){const t=new Map(r.jobs.map(i=>[i.id,i])),s=r.jobs.reduce((i,a)=>!i||zn(a,i)>0?a:i,null);for(const i of n?.jobs||[]){const a=["queued","assigned","running","cancel_requested"].includes(i.status||"");(t.has(i.id)||a||s&&zn(i,s)<=0)&&t.set(i.id,i)}return[...t.values()].filter(i=>{const a=i.status==="assigned"?"queued":i.status==="cancel_requested"?"running":i.status;return r.filter==="all"||a===r.filter}).sort(zn)}class ri{constructor(r,t=!1){this.service=r,this.state={snapshot:null,history:cr("all"),stale:!1,loading:!1,error:"",isolated:t,mutation:null,deletingWorker:null,refreshed:0}}service;state;listeners=new Set;read=null;historyRead=null;historyEpoch=0;write=null;version=0;disposed=!1;start=()=>{this.disposed=!1,this.refreshAll()};refreshAll=()=>Promise.all([this.refresh(),this.refreshHistory()]);getSnapshot=()=>this.state;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});update(r){this.disposed||(this.state={...this.state,...r},this.listeners.forEach(t=>t()))}isolate=()=>{this.state.isolated||this.update({isolated:!0})};canMutate=()=>!this.disposed&&!!this.state.snapshot&&!this.state.stale&&!this.state.isolated&&!this.state.mutation;guard=()=>{if(this.disposed||!this.state.snapshot||this.state.stale||this.state.isolated)throw new Error("隔离副本或服务状态未就绪，禁止修改设备")};invalidateRead(){++this.version,this.read?.controller.abort(),this.read=null,this.update({loading:!1})}refresh=(r=!1)=>{if(this.disposed||this.state.mutation&&!r)return Promise.resolve();if(this.read)return this.read.promise;const t=++this.version,s=new AbortController;this.update({loading:!0});const i=this.service.snapshot(s.signal,this.isolate).then(a=>{this.disposed||s.signal.aborted||t!==this.version||this.update({snapshot:a,stale:!1,error:"",refreshed:this.state.refreshed+1,isolated:this.state.isolated||a.health.sandbox===!0})}).catch(a=>{this.disposed||s.signal.aborted||t!==this.version||(this.update({stale:!0,error:`读取中间层信息失败：${re(a)}`}),s.abort())}).finally(()=>{t!==this.version||this.disposed||(this.read=null,this.update({loading:!1}))});return this.read={controller:s,promise:i},i};setHistoryFilter=r=>this.disposed?Promise.resolve():r===this.state.history.filter?this.refreshHistory():(++this.historyEpoch,this.historyRead?.controller.abort(),this.historyRead=null,this.update({history:cr(r)}),this.refreshHistory());refreshHistory=()=>this.readHistory("first");loadMore=()=>this.readHistory("more");retryHistory=()=>this.readHistory(this.state.history.failedAction||"first");readHistory(r){if(this.disposed)return Promise.resolve();if(this.historyRead)return this.historyRead.promise;const t=this.state.history;if(r==="more"&&(!t.initialized||!t.hasMore))return Promise.resolve();const s=r==="more"?t.nextCursor:null,i=this.historyEpoch,a=new AbortController;this.update({history:{...t,loading:r,error:"",failedAction:null}});const o=this.service.history(t.filter,s,a.signal).then(l=>{if(this.disposed||a.signal.aborted||i!==this.historyEpoch)return;if(r==="more"&&l.has_more&&l.next_cursor===s)throw new Error("任务历史游标未推进，请重试");const p=this.state.history,c=new Map(p.jobs.map(g=>[g.id,g]));for(const g of l.jobs)c.set(g.id,g);const u=r==="first"&&p.loadedPages>1;this.update({history:{...p,jobs:[...c.values()],initialized:!0,loadedPages:r==="more"?p.loadedPages+1:Math.max(1,p.loadedPages),total:l.total,nextCursor:u?p.nextCursor:l.next_cursor,hasMore:u?p.hasMore:l.has_more}})}).catch(l=>{this.disposed||a.signal.aborted||i!==this.historyEpoch||this.update({history:{...this.state.history,error:`读取任务历史失败：${re(l)}`,failedAction:r}})}).finally(()=>{this.disposed||a.signal.aborted||i!==this.historyEpoch||(this.historyRead=null,this.update({history:{...this.state.history,loading:null}}))});return this.historyRead={controller:a,promise:o},o}async mutate(r,t,s){if(this.guard(),this.state.mutation)throw new Error("设备操作正在执行，请稍后重试");this.invalidateRead();const i=new AbortController;this.write=i,this.update({mutation:r,deletingWorker:t});try{const a=await s(i.signal);if(i.signal.aborted||this.disposed)throw new DOMException("操作已取消","AbortError");return await this.refresh(!0),a}catch(a){throw i.signal.aborted||(this.update({error:`${r==="delete"?"删除设备":r==="restart"?"提交重启":r==="access"?"保存使用范围":"更新节点"}失败：${re(a)}`}),await this.refresh(!0)),a}finally{this.write=null,this.update({mutation:null,deletingWorker:null})}}deleteWorker=r=>this.state.snapshot?.workers.some(t=>t.id===r)?this.mutate("delete",r,t=>this.service.deleteWorker(r,t,this.guard)):Promise.reject(new Error("设备已移除"));restartWorker=(r,t)=>this.state.snapshot?.workers.some(s=>s.id===r)?this.mutate("restart",null,s=>this.service.restartWorker(r,t,s,this.guard)):Promise.reject(new Error("设备已移除"));syncWorker=r=>{const t=this.state.snapshot,s=t?.workers.find(a=>a.id===r);if(!s||!t)return Promise.reject(new Error("设备已移除或被新的注册替代"));const i=qr(s,t.comparisonBaseline);return i?Promise.reject(new Error(i)):this.mutate("sync",null,a=>this.service.syncWorker(r,a,this.guard))};saveAccess=(r,t,s)=>{const i=[...new Set(r)];return i.length?i.some(a=>!this.state.snapshot?.workers.some(o=>o.id===a))?Promise.reject(new Error("所选设备已移除或被新的注册替代，请重新选择")):this.mutate("access",null,async a=>{const o={succeeded:[],failed:[]};for(const[l,p]of i.entries())try{a.throwIfAborted(),await s.save(p,t,a,this.guard),o.succeeded.push(p)}catch(c){if(a.aborted)throw c;o.failed.push({worker_id:p,error:re(c)}),o.failed.push(...i.slice(l+1).map(u=>({worker_id:u,error:"未提交：前一台设备保存失败，已停止后续保存，可重试"})));break}return o}):Promise.reject(new Error("请至少选择一台设备"))};syncAll=()=>this.mutate("sync",null,r=>this.service.syncAll(r,this.guard));dispose=()=>{this.disposed=!0,++this.version,this.read?.controller.abort(),this.write?.abort(),++this.historyEpoch,this.historyRead?.controller.abort(),this.historyRead=null,this.read=null,this.listeners.clear()}}function ti({http:n,sandbox:r}){const t=d.useMemo(()=>ei(n),[n]),s=d.useMemo(()=>new ri(t),[t]),i=d.useSyncExternalStore(s.subscribe,s.getSnapshot),[a,o]=d.useState(!0),l=d.useRef(a),[p,c]=d.useState(Date.now);return d.useLayoutEffect(()=>{l.current=a},[a]),d.useLayoutEffect(()=>{r&&s.isolate()},[r,s]),d.useEffect(()=>(s.start(),s.dispose),[s]),d.useEffect(()=>{const u=()=>{document.hidden||(c(Date.now()),l.current&&s.refreshAll())},g=window.setInterval(u,5e3);return document.addEventListener("visibilitychange",u),()=>{window.clearInterval(g),document.removeEventListener("visibilitychange",u)}},[s]),{state:i,store:s,service:t,automatic:a,setAutomatic:o,clock:p}}function xn({name:n}){return e.jsx("svg",{className:"icon",viewBox:"0 0 24 24","aria-hidden":"true",focusable:"false",children:n==="refresh"?e.jsxs(e.Fragment,{children:[e.jsx("path",{d:"M20 7v5h-5M4 17v-5h5"}),e.jsx("path",{d:"M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 18 17"})]}):n==="chevron"?e.jsx("path",{d:"m9 5 7 7-7 7"}):e.jsxs(e.Fragment,{children:[e.jsx("path",{d:"m12 3 10 18H2L12 3Z"}),e.jsx("path",{d:"M12 9v4m0 3v1"})]})})}function ze({children:n}){return e.jsx("span",{className:"cell-secondary",children:n})}function si({value:n,label:r}){return e.jsx("div",{className:"util-track",role:"meter","aria-label":r,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":n,children:e.jsx("i",{style:{width:`${n}%`}})})}function ai({value:n}){const r=X(n),t=Ta(r==null?null:r*100);return e.jsxs("div",{className:"utilization",children:[e.jsx("span",{children:t==null?"未采集":`${Math.round(t)}%`}),t!=null&&e.jsx(si,{value:t,label:"任务过程进度"})]})}function Vr({worker:n,snapshot:r}){const t=r.jobs.find(s=>s.id===n.current_job_id);if(t){const s=`${t.submitter_display_name?.trim()||t.submitter_username||"未记录提交人"} · ${Wr(t,r)} · ${t.cardName||t.name||"未命名卡片"}`;return t.project&&t.card?e.jsx("a",{href:`/?${new URLSearchParams({project:t.project,card:t.card})}`,title:s,children:s}):e.jsx("span",{title:s,children:s})}return n.current_job_id?e.jsx(e.Fragment,{children:"任务详情暂未载入"}):Oe(n)?e.jsxs(e.Fragment,{children:[Gn(n),e.jsx(ze,{children:n.sync_message||"等待节点反馈"})]}):ue(n)?n.busy?e.jsxs(e.Fragment,{children:["ComfyUI 本地任务",e.jsx(ze,{children:"非中间层派发"})]}):e.jsx(e.Fragment,{children:jn(n)[1]==="bad"?"不接收新任务":"当前无任务"}):e.jsx(e.Fragment,{children:"非实时"})}function Hr({rows:n,className:r,id:t}){return e.jsx("dl",{id:t,className:r,children:n.map(([s,i])=>e.jsx(ii,{label:s,children:i},s))})}function ii({label:n,children:r}){return e.jsxs(e.Fragment,{children:[e.jsx("dt",{children:n}),e.jsx("dd",{children:r})]})}function oi({snapshot:n,items:r,now:t,onError:s}){const i=new Map(n?.workers.map(a=>[a.id,a.name])||[]);return e.jsx(e.Fragment,{children:r.length?r.map(a=>{const o=a.modelName?.trim(),l=a.name?.trim()||a.capability?.trim()||o||"未记录",p=X(a.started),c=p==null?a.history_only?"耗时未记录":"尚未开始":a.history_only&&X(a.ended)==null?"耗时未记录":Hn((X(a.ended)??t)-p);return e.jsxs("tr",{children:[e.jsx("td",{className:Da(a.status),children:tn(a.status)}),e.jsxs("td",{className:"job-origin",children:[a.submitter_display_name?.trim()||a.submitter_username||"未记录提交人",e.jsx(ze,{children:n?Wr(a,n):a.projectName||"项目未记录"}),e.jsxs(ze,{children:["卡片 · ",a.cardName||a.name||"未命名"]})]}),e.jsxs("td",{className:"job-mode",title:a.capability||void 0,children:[l,o&&o!==l&&e.jsxs(ze,{children:["模型 · ",o]}),e.jsx(ze,{children:a.id})]}),e.jsxs("td",{children:[e.jsx(ai,{value:a.progress}),e.jsx(ze,{children:a.step||"步骤未记录"})]}),e.jsx("td",{title:a.worker_id||void 0,children:a.nodeName?.trim()||(a.worker_id?i.get(a.worker_id)||"未知执行端":a.history_only?"未记录":"待分配")}),e.jsx("td",{children:De(a.created)}),e.jsx("td",{children:a.error?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"danger f-job-error",title:a.error,children:a.error}),e.jsx("button",{type:"button",className:"link-button","data-job-error":a.id,"data-focus-key":`job-error:${a.id}`,onClick:()=>s(a),children:"查看完整错误"})]}):c})]},a.id)}):e.jsx("tr",{children:e.jsx("td",{colSpan:7,children:e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"暂无已加载任务"}),e.jsx("p",{children:"可更换任务状态；历史记录的加载结果见下方状态。"})]})})})})}class li{constructor(r,t,s,i){this.service=r,this.id=t,this.gpu=s,this.minutes=i}service;id;gpu;minutes;state={data:null,loading:!1,error:""};listeners=new Set;request=null;version=0;getSnapshot=()=>this.state;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});update(r){this.state={...this.state,...r},this.listeners.forEach(t=>t())}load=async(r=!1)=>{if(r&&this.request)return;this.request?.abort();const t=new AbortController,s=++this.version;this.request=t,this.update({loading:!0,error:"",...r?{}:{data:null}});try{const i=await this.service.temperature(this.id,this.gpu,this.minutes,t.signal);if(t.signal.aborted||s!==this.version)return;this.update({data:i})}catch(i){if(t.signal.aborted||s!==this.version)return;this.update({data:null,error:re(i)})}finally{s===this.version&&(this.request=null,this.update({loading:!1}))}};dispose=()=>{++this.version,this.request?.abort(),this.request=null}}function ci(n,r,t){const s=n.points.flatMap(c=>c.temperature_c==null?[]:[c.temperature_c]),i=Math.floor((Math.min(...s)-5)/10)*10,a=Math.ceil((Math.max(...s)+5)/10)*10,o=49,l=r-o-20,p=t-23-45;return{x:c=>o+(c-n.from)/(n.to-n.from)*l,y:c=>23+(a-c)/(a-i)*p,width:r,height:t,left:o,pw:l}}function di(n){const r=[];let t=null;for(const s of n.points){if(s.temperature_c==null){t=null;continue}(t==null||s.at-t>n.gap_seconds)&&r.push([]),r[r.length-1]?.push({at:s.at,temperature_c:s.temperature_c}),t=s.at}return r}function pi(n,r,t,s,i){if(s<70||i<50||!r.points.some(y=>y.temperature_c!=null))return null;const a=n.getContext("2d");if(!a)return null;const o=window.devicePixelRatio||1;n.width=Math.round(s*o),n.height=Math.round(i*o),a.setTransform(o,0,0,o,0,0),a.clearRect(0,0,s,i);const l=ci(r,s,i),{x:p,y:c,left:u,pw:g}=l,x=r.points.flatMap(y=>y.temperature_c==null?[]:[y.temperature_c]),m=Math.floor((Math.min(...x)-5)/10)*10,_=Math.ceil((Math.max(...x)+5)/10)*10;a.font='12px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',a.lineWidth=1,a.textAlign="right",a.textBaseline="middle";for(let y=0;y<=4;y++){const N=m+(_-m)*y/4,w=c(N);a.strokeStyle="#29313c",a.beginPath(),a.moveTo(u,w),a.lineTo(s-20,w),a.stroke(),a.fillStyle="#a0a6b1",a.fillText(`${Math.round(N)}°`,u-12,w)}a.textBaseline="top";for(let y=0;y<=4;y+=s<600?2:1){const N=new Date((r.from+(r.to-r.from)*y/4)*1e3),w=N.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:!1}),h=t===1440?N.toLocaleDateString("zh-CN",{month:"2-digit",day:"2-digit"})+" "+w:w;a.textAlign=y===0?"left":y===4?"right":"center",a.fillText(h,u+y/4*g,i-27)}a.strokeStyle="#38bdf8",a.lineWidth=2.3,a.lineJoin="round",a.beginPath();for(const y of di(r))y.forEach((N,w)=>{w===0?a.moveTo(p(N.at),c(N.temperature_c)):a.lineTo(p(N.at),c(N.temperature_c))});a.stroke(),a.fillStyle="#38bdf8";for(const y of r.points)y.temperature_c!=null&&(a.beginPath(),a.arc(p(y.at),c(y.temperature_c),2.1,0,Math.PI*2),a.fill());return l}function ui({worker:n,workerId:r,service:t,now:s,stale:i,revision:a,onClose:o}){const l=n?sn(n):[],[p,c]=d.useState(()=>({gpu:X(l[0]?.index)??0,minutes:30}));return e.jsx(de,{title:n?.name||r,onClose:o,className:`temperature-dialog ${I.temperatureDialog}`,showFooter:!1,children:e.jsx(mi,{worker:n,workerId:r,service:t,now:s,stale:i,revision:a,selection:p,onSelect:c})})}function mi({worker:n,workerId:r,service:t,now:s,stale:i,revision:a,selection:o,onSelect:l}){const{gpu:p,minutes:c}=o,u=d.useMemo(()=>new li(t,r,p,c),[t,r,p,c]),g=d.useSyncExternalStore(u.subscribe,u.getSnapshot),{data:x,error:m,loading:_}=g,y=d.useRef(null),N=d.useRef(null),w=d.useRef(null),h=d.useRef(null),[b,k]=d.useState(null),R=d.useRef(a),D=n?sn(n):[],C=D.find(S=>X(S.index)===p),P=(x?.points||[]).flatMap(S=>S.temperature_c==null?[]:[S.temperature_c]),T=n&&ue(n)?Kn(n,s,i)?X(C?.temperature_c)??"未采集":"未采集":"非实时";d.useEffect(()=>(u.load(),u.dispose),[u]),d.useEffect(()=>{R.current!==a&&(R.current=a,u.load(!0))},[a,u]),d.useEffect(()=>{const S=y.current,$=N.current;if(!S||!$||!x)return;const Z=()=>{const{width:O,height:V}=$.getBoundingClientRect();h.current=pi(S,x,c,O,V)},G=requestAnimationFrame(Z),te=new ResizeObserver(Z);return te.observe($),()=>{cancelAnimationFrame(G),te.disconnect(),h.current=null}},[x,c]);const f=b==null?void 0:x?.points[b],v=f?`${De(f.at)} · ${f.temperature_c==null?"未采集":`${f.temperature_c}°C`}`:"";d.useEffect(()=>{const S=w.current,$=h.current;!S||!$||!f||(S.style.left=`${Math.max(8,Math.min($.width-S.offsetWidth-8,$.x(f.at)+14))}px`,S.style.top=`${Math.max(8,Math.min($.height-S.offsetHeight-8,f.temperature_c==null?20:$.y(f.temperature_c)-45))}px`)},[f,v]);const j=[["当前温度",T],["所选时段最高",P.length?Math.max(...P):x?"未采集":"未获取"],["所选时段最低",P.length?Math.min(...P):x?"未采集":"未获取"]];return e.jsxs("div",{className:"modal-shell",children:[e.jsx("header",{className:"modal-header",children:e.jsxs("div",{children:[e.jsx("p",{className:"eyeline",children:"显卡温度趋势"}),e.jsxs("p",{className:"muted","data-temp-description":!0,children:[C?.name||"型号未记录"," / ",n?tn(n.state):"节点已移除"]})]})}),e.jsxs("div",{className:"chart-controls",children:[e.jsxs("label",{className:"inline-label",children:["显卡"," ",e.jsx("select",{"data-temp-gpu":!0,"aria-label":"选择显卡",value:p,onChange:S=>{k(null),l({...o,gpu:Number(S.target.value)})},children:D.length?D.map((S,$)=>e.jsxs("option",{value:S.index??0,children:["GPU ",S.index??0," · ",S.name||"未记录型号"]},`${S.index??$}:${$}`)):e.jsx("option",{value:0,children:"GPU 0 · 未采集配置"})})]}),e.jsx("div",{className:"segmented","data-temp-ranges":!0,"aria-label":"温度时间范围",children:[[30,"30 分钟"],[120,"2 小时"],[1440,"24 小时"]].map(([S,$])=>e.jsx("button",{type:"button","data-range":S,"aria-pressed":c===S,onClick:()=>{k(null),l({...o,minutes:S})},children:$},S))})]}),e.jsx("p",{className:"small muted",children:"仅展示真实采集记录；缺失区间不插值、不补造历史。当前温度需60秒内的新鲜遥测。"}),e.jsx("div",{className:"temperature-stats","data-temp-stats":!0,children:j.map(([S,$])=>e.jsxs("div",{className:"temperature-stat",children:[e.jsx("label",{children:S}),e.jsxs("strong",{children:[$,typeof $=="number"&&e.jsx("small",{children:" °C"})]})]},S))}),e.jsxs("div",{className:"chart-area",ref:N,children:[e.jsx("canvas",{ref:y,"data-temp-canvas":!0,hidden:!P.length,tabIndex:0,role:"img","aria-label":`GPU ${p}，${c}分钟真实温度历史，${P.length}个有效采集点；左右方向键查看。`,onPointerMove:S=>{const $=h.current;if(!$||!x?.points.length)return;const Z=x.from+Math.max(0,Math.min(1,(S.clientX-S.currentTarget.getBoundingClientRect().left-$.left)/$.pw))*(x.to-x.from);k(x.points.reduce((G,te,O)=>Math.abs(te.at-Z)<Math.abs((x.points[G]?.at??te.at)-Z)?O:G,0))},onPointerLeave:()=>k(null),onKeyDown:S=>{!x?.points.length||!["ArrowLeft","ArrowRight","Home","End"].includes(S.key)||(S.preventDefault(),k(S.key==="Home"?0:S.key==="End"?x.points.length-1:Math.max(0,Math.min(x.points.length-1,(b??0)+(S.key==="ArrowRight"?1:-1)))))}}),e.jsx("div",{className:"empty-state","data-temp-empty":!0,hidden:P.length>0,role:"status",children:m?e.jsxs(e.Fragment,{children:[e.jsx("b",{children:"温度历史读取失败"}),e.jsx("p",{children:m}),e.jsx("button",{type:"button",onClick:()=>{k(null),u.load()},children:"重试读取"})]}):_||!x?e.jsx("b",{children:"正在读取温度历史…"}):e.jsxs(e.Fragment,{children:[e.jsx("b",{children:"暂无有效温度记录"}),e.jsx("p",{children:"未开始采集、旧版 Worker 未上报或驱动不支持；不显示 0°C。"})]})}),e.jsx("div",{ref:w,className:"chart-tooltip",hidden:!f||!P.length,role:"status",children:v})]}),e.jsxs("footer",{className:"modal-footer",children:[e.jsxs("span",{className:"chart-key",children:[e.jsx("i",{}),e.jsxs("span",{"data-temp-key":!0,children:["GPU ",p," 温度"]})]}),e.jsx("span",{"data-temp-note":!0,children:x?`${De(x.from)} — ${De(x.to)}${n&&!ue(n)?" · 离线，历史非实时":""}`:""}),e.jsx("span",{className:"keyboard-hint",children:"左右键查看采集点 · Esc关闭"})]})]})}function hi({capabilities:n}){const[r,t]=d.useState(null),[s,i]=d.useState(0),a=d.useRef(null),o=d.useRef(null),l=d.useRef(new Set),p=Math.max(1,Math.ceil((r?.length||0)/Ln));d.useEffect(()=>{const g=l.current;return()=>{g.forEach(x=>URL.revokeObjectURL(x)),g.clear()}},[]);const c=g=>{i(g),(g===0||g===p-1)&&o.current?.focus({preventScroll:!0}),o.current&&(o.current.scrollTop=0,o.current.scrollLeft=0)},u=()=>{if(r==null)return;const g=URL.createObjectURL(new Blob([r],{type:"application/json;charset=utf-8"}));l.current.add(g);const x=document.createElement("a");x.href=g,x.download="worker-capabilities.json",x.click()};return e.jsxs("details",{className:I.capabilities,"data-capabilities":!0,onToggle:g=>{g.currentTarget.open&&a.current==null&&(a.current=JSON.stringify(n,null,2),t(a.current))},children:[e.jsx("summary",{children:"完整能力与配置（最后上报，非实时配置证据）"}),r!=null&&e.jsxs("div",{children:[e.jsx("p",{className:"small muted",children:"按页查看完整快照；下载可获取全部 JSON，自动刷新不会改变当前快照。"}),e.jsxs("div",{className:"f-toolbar",children:[e.jsx("button",{type:"button","data-config-prev":!0,disabled:s===0,onClick:()=>c(s-1),children:"上一页"}),e.jsxs("span",{className:"small muted","data-config-page":!0,role:"status",children:["第 ",s+1," / ",p," 页"]}),e.jsx("button",{type:"button","data-config-next":!0,disabled:s===p-1,onClick:()=>c(s+1),children:"下一页"}),e.jsx("button",{type:"button","data-config-download":!0,onClick:u,children:"下载完整 JSON"})]}),e.jsx("pre",{ref:o,className:"capabilities-json",tabIndex:0,"aria-label":"当前页能力与配置",children:Fa(r,s)})]})]})}function dr({items:n}){return n.length?e.jsx("ul",{className:"inventory-list",children:n.map((r,t)=>e.jsx("li",{children:r},`${t}:${r}`))}):e.jsx("p",{className:"muted small",children:"无"})}function pr({items:n,unknown:r}){return r?e.jsx("p",{className:"muted small",children:"模型清单未知，无法判断"}):n.length?e.jsx("ul",{className:"inventory-list",children:n.map((t,s)=>e.jsxs("li",{children:[t.name||"未命名模型",e.jsxs("span",{children:[t.node_class||"未知节点"," · ",t.input||"未知输入"]})]},`${s}:${t.name}`))}):e.jsx("p",{className:"muted small",children:"无"})}function xi({worker:n,snapshot:r}){const t=n.capability_comparison||{},s=Yn(n,r.comparisonBaseline),i=t.model_inventory_status==="unknown",a=t.missing_node_classes||[],o=t.extra_node_classes||[],l=t.missing_models||[],p=t.extra_models||[];return["none","ambiguous"].includes(r.comparisonBaseline.status||"")||!t.status||t.status==="unknown"&&i&&!a.length&&!o.length?e.jsxs("section",{className:"inventory-audit",children:[e.jsx("h3",{children:"与主节点清单对比"}),e.jsxs("div",{className:"notice-box",children:[e.jsx("b",{className:s.tone,children:s.label}),e.jsxs("p",{children:[Rn(r),"。旧版 Worker 或清单字段缺失时不会猜测为完整。"]})]})]}):e.jsxs("section",{className:"inventory-audit",children:[e.jsxs("div",{className:"inventory-heading",children:[e.jsx("h3",{children:"与主节点清单对比"}),e.jsx("span",{className:"f-chip inventory-chip","data-tone":s.tone,children:s.label})]}),e.jsxs("p",{className:"muted small",children:[Rn(r),"；文件名、相对路径和版本均按精确值比较。"]}),e.jsxs("div",{className:"inventory-grid",children:[e.jsxs("div",{className:"inventory-block",children:[e.jsxs("h4",{children:["缺失节点类 ",e.jsx("span",{children:a.length})]}),e.jsx(dr,{items:a}),e.jsxs("h4",{children:["缺失模型 ",e.jsx("span",{children:i?"未知":l.length})]}),e.jsx(pr,{items:l,unknown:i})]}),e.jsxs("div",{className:"inventory-block",children:[e.jsxs("h4",{children:["额外节点类 ",e.jsx("span",{children:o.length})]}),e.jsx(dr,{items:o}),e.jsxs("h4",{children:["额外模型 ",e.jsx("span",{children:i?"未知":p.length})]}),e.jsx(pr,{items:p,unknown:i})]})]})]})}function fi({worker:n,snapshot:r,now:t,stale:s,restartUnavailable:i,onRestart:a,onClose:o}){const[l,p]=d.useState(null),[c,u]=d.useState(""),g=i||(s?"服务状态已过期，请刷新后重试。":ge(n)?"主节点不支持远程重启。":ue(n)?["pending","running"].includes(n.sync_status||"")?"节点已有维护操作，请等待完成。":"":"节点已离线，无法提交重启。"),x=b=>g||(n.capabilities?.[b==="reboot_host"?"supports_host_reboot":"supports_service_restart"]!==!0?"当前 Worker 不支持此操作，请先更新 Worker。":""),m=n.capabilities||{},_=m.telemetry||{},y=Ur(n),N=jn(n),w=Yn(n,r.comparisonBaseline),h=[["节点角色",ge(n)?"主节点（不参与文件同步）":"执行节点"],["清单状态",e.jsx("span",{className:w.tone,children:w.label})],["比较基准",Rn(r)],["主机",_.hostname||"未记录"],["ComfyUI",ue(n)?n.comfy_online===!0?"在线":n.comfy_online===!1?"不可用":"未获取":"非实时"],["任务接收",e.jsx("span",{className:N[1],children:N[0]})],["维护状态",Gn(n)],["维护消息",ge(n)?"此节点已排除在批量文件同步之外":n.sync_message||"未记录"],["最后心跳",`${De(n.last_seen)} / ${Jn(n.last_seen,t)}`],["遥测时间",`${De(_.collected_at)} · ${Kn(n,t,s)?"新鲜采集":"非实时 / 未采集"}`],["节点能力",m.node_classes?`${m.node_classes.length} 个`:"未记录"],["当前任务",e.jsx(Vr,{worker:n,snapshot:r})],["系统内存",`${Se(y.used_bytes)} / ${Se(y.total_bytes)}（最后上报）`],["IP 地址",_.ip_address?.trim()||"未记录"]];return e.jsxs(e.Fragment,{children:[e.jsxs(de,{title:`${n.name||n.id} · 节点详情`,onClose:o,className:I.workerDialog,children:[e.jsxs("div",{className:I.workerActions,role:"group","aria-label":"节点重启操作",children:[e.jsx("button",{type:"button",disabled:!!x("restart_services"),title:x("restart_services")||"重启 ComfyUI 和 Worker，不重启电脑",onClick:()=>p("restart_services"),children:"重启服务"}),e.jsx("button",{type:"button",className:"danger",disabled:!!x("reboot_host"),title:x("reboot_host")||"重启节点所在的整台电脑",onClick:()=>p("reboot_host"),children:"重启节点"})]}),e.jsx("p",{className:"muted small",children:g||(n.capabilities?.supports_service_restart!==!0&&n.capabilities?.supports_host_reboot!==!0?"当前 Worker 不支持远程重启，请先更新 Worker。":"重启服务仅重启 ComfyUI 和 Worker；重启节点将重启整台电脑。节点收到请求后立即执行，会中断当前任务，不等待空闲。")}),c&&e.jsx("p",{className:"notice-box",role:"status",children:c}),e.jsxs("div",{className:"f-tags",children:[e.jsx("span",{className:"f-chip",children:tn(n.state)}),e.jsx("span",{className:"f-chip",children:Or(n)}),e.jsx("span",{className:"f-chip",children:Fr(n)}),e.jsxs("span",{className:"f-chip",children:["Worker ID: ",n.id]})]}),e.jsx(Hr,{rows:h,className:"f-definition"}),e.jsx(xi,{worker:n,snapshot:r}),e.jsx("div",{className:"f-grid2",children:sn(n).map((b,k)=>e.jsxs("div",{className:"notice-box",children:[e.jsxs("b",{children:["GPU ",b.index??"未知"," · ",b.name||"未记录"]}),e.jsxs("p",{children:["最后上报：利用率"," ",X(b.utilization_percent)==null?"未采集":`${b.utilization_percent}%`,"；显存 ",Se(b.memory_used_bytes)," / ",Se(b.memory_total_bytes),"；温度"," ",X(b.temperature_c)==null?"未采集":`${b.temperature_c}°C`]})]},`${b.index??k}:${k}`))}),e.jsx(hi,{capabilities:m})]}),l&&e.jsxs(de,{title:l==="reboot_host"?"重启节点电脑":"重启节点服务",submitLabel:l==="reboot_host"?"确认重启电脑":"确认重启服务",onClose:()=>p(null),onSubmit:async()=>{const b=x(l);if(b)throw new Error(b);await a(l),u(`${l==="reboot_host"?"电脑重启":"服务重启"}请求已提交，节点收到请求后立即执行，会中断当前任务；恢复状态以节点实际回报为准。`)},children:[e.jsxs("p",{children:["目标节点：",e.jsx("strong",{children:n.name||n.id})]}),e.jsx("div",{className:"notice-box",children:l==="reboot_host"?"此操作会重启该节点所在的整台 Windows 电脑，会强制关闭程序，未保存内容可能丢失，所有服务都会暂时离线。电脑恢复后，ComfyUI 和 Worker 是否自动启动取决于该电脑的启动配置。":"此操作只重启该节点的 ComfyUI 和 Worker 服务，不会重启 Windows 电脑，不同步文件或更新代码。"}),e.jsx("p",{children:"节点收到请求后立即执行，会中断当前任务，不等待空闲；提交后暂停向该节点分配新任务。请求已接收不代表重启已完成，请查看节点维护状态。"}),l==="reboot_host"&&e.jsxs("label",{className:"check-label",children:[e.jsx("input",{type:"checkbox",required:!0}),"我确认重启整台电脑，并已处理其他程序和未保存内容"]})]})]})}function ur(n){return n.state==="busy"||n.state==="running"?0:n.state==="idle"?1:n.state==="offline"?3:2}function gi({snapshot:n,now:r,stale:t,mutationDisabled:s,deletingWorker:i,onDetails:a,onTemperature:o,onDelete:l,onSync:p,selectedIds:c,onSelection:u,teams:g}){const x=[...n.workers].sort((m,_)=>ur(m)-ur(_));return e.jsx(e.Fragment,{children:x.length?x.map(m=>{const _=Kn(m,r,t),y=sn(m),N=Ur(m),w=tn(m.state),h=jn(m),b=Yn(m,n.comparisonBaseline),k=!!(m.capability_comparison?.missing_models?.length||m.capability_comparison?.missing_node_classes?.length),R=qr(m,n.comparisonBaseline),D=Wn(m,r),C=g?.find(T=>T.id===D.team_id)?.name,P=ue(m)?m.comfy_online===!0?"ComfyUI 在线":m.comfy_online===!1?"ComfyUI 不可用":"ComfyUI 未获取":"ComfyUI 非实时";return e.jsxs("article",{className:I.workerCard,"data-worker-card":m.id,"data-worker-state":m.state||"unknown","data-selected":c?.has(m.id)?"true":void 0,"aria-label":m.name||m.id,children:[e.jsxs("div",{className:I.workerIdentityBlock,children:[e.jsxs("header",{className:I.workerHeader,children:[u?e.jsxs("label",{className:`${I.workerName} ${I.workerSelection}`,"data-worker-name":!0,children:[e.jsx("input",{type:"checkbox","aria-label":`选择设备 ${m.name||m.id}`,checked:c?.has(m.id)??!1,disabled:s,onChange:T=>u(m,T.target.checked)}),e.jsx("strong",{children:m.name||"未命名执行端"})]}):e.jsx("div",{className:I.workerName,"data-worker-name":!0,children:e.jsx("strong",{children:m.name||"未命名执行端"})}),e.jsx("span",{className:I.workerState,"data-state":m.state,children:w})]}),e.jsxs("div",{className:I.workerVersions,children:[ge(m)&&e.jsx("span",{className:"f-chip",children:"主节点"}),e.jsx("span",{children:Or(m)}),e.jsx("span",{children:Fr(m)})]}),e.jsxs("p",{className:I.workerAccess,"data-worker-access":!0,children:["使用范围：",D.team_id?`项目组专用 · ${C||D.team_id}（所有成员）`:"公共",D.team_id&&(D.expires_at===null?" · 手动解除":` · ${new Date(D.expires_at*1e3).toLocaleString("zh-CN",{hour12:!1})} 到期恢复公共`)]})]}),e.jsxs("div",{className:I.workerResources,children:[y.map((T,f)=>e.jsx(mr,{gpu:T,ram:void 0,live:_},`${T.index??f}:${f}`)),!y.length&&e.jsx("p",{className:I.telemetryNote,children:"未采集 GPU 指标"}),e.jsx(mr,{gpu:void 0,ram:N,live:_}),!_&&e.jsx("p",{className:I.telemetryNote,children:ue(m)?"遥测未采集或已过期":"非实时，不沿用旧读数"}),e.jsxs("div",{className:I.workerService,children:[e.jsx("span",{"data-tone":m.comfy_online===!1&&ue(m)?"bad":void 0,children:P}),e.jsx("span",{"data-tone":h[1],children:h[0]})]})]}),e.jsxs("div",{className:I.workerActivity,children:[e.jsxs("div",{className:I.workerTask,children:[e.jsx("span",{className:I.sectionLabel,children:"当前任务"}),e.jsx("div",{children:e.jsx(Vr,{worker:m,snapshot:n})})]}),e.jsxs("div",{className:I.workerSync,children:[e.jsxs("div",{className:I.syncMeta,children:[e.jsx("span",{className:Fe(m)?"danger":"",children:Gn(m)}),e.jsxs("span",{title:m.last_seen==null?"未记录":new Date(Number(m.last_seen)*1e3).toLocaleString("zh-CN",{hour12:!1}),children:["心跳 ",Jn(m.last_seen,r)]})]}),!ge(m)&&k?e.jsxs("button",{type:"button",className:I.inventoryAction,"data-tone":b.tone,"data-sync-worker":m.id,"data-focus-key":`worker-sync:${m.id}`,"aria-label":`同步设备 ${m.name||m.id}：${b.label}`,disabled:s||!!R,title:R||"仅同步这台设备；点击查看范围并确认",onClick:()=>p(m),children:[e.jsx("span",{children:b.label}),e.jsxs("span",{className:I.syncActionLabel,children:[Oe(m)?"维护中":R?"不可同步":"点击同步",e.jsx(xn,{name:"chevron"})]})]}):e.jsx("span",{className:I.inventoryLabel,"data-tone":b.tone,children:b.label}),!ge(m)&&k&&R&&!Oe(m)&&e.jsx("p",{className:I.syncMessage,children:R}),!ge(m)&&m.sync_message&&(Fe(m)||Oe(m))&&e.jsx("p",{className:I.syncMessage,role:Fe(m)?"alert":void 0,children:m.sync_message})]})]}),e.jsxs("footer",{className:I.cardActions,children:[e.jsx("button",{type:"button",className:"link-button","data-worker":m.id,"data-focus-key":`worker-details:${m.id}`,onClick:()=>a(m),children:"节点详情"}),e.jsx("button",{type:"button",className:"link-button","data-temperature":m.id,"data-focus-key":`worker-temperature:${m.id}`,"aria-label":`查看 ${m.name||m.id} 温度趋势`,onClick:()=>o(m.id),children:"温度趋势"}),e.jsx("button",{type:"button",className:"link-button worker-delete danger","data-delete-worker":m.id,"data-focus-key":`worker-delete:${m.id}`,"aria-label":`删除设备 ${m.name||m.id}`,disabled:s,onClick:()=>l(m),children:i===m.id?"正在删除…":"删除设备"})]})]},m.id)}):e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"还没有注册执行端"}),e.jsx("p",{children:"执行端注册并上报心跳后，将在此显示状态。"})]})})}function bi({snapshot:n,now:r,stale:t,mutationDisabled:s,teams:i,onEdit:a}){const o=Is(n?.workers??[],r);return e.jsx("section",{className:I.accessOverview,"aria-labelledby":"worker-access-title",children:e.jsxs("details",{children:[e.jsx("summary",{className:I.accessSummary,children:e.jsx("h3",{id:"worker-access-title",children:"已设置的使用范围"})}),e.jsx("p",{className:"muted small",children:"查看当前设备分配，点击“修改设置”可调整该行设备的项目组或结束时间，也可恢复公共。不同结束时间分别列出。"}),t&&e.jsx("p",{role:"status",children:"当前为上次快照，刷新成功后才能修改。"}),i.error&&o.some(l=>l.team_id)&&e.jsxs("p",{role:"alert",children:[i.error,"；专用设置仍保留，下方暂显示项目组 ID。",e.jsx("button",{type:"button",disabled:i.loading,onClick:i.retry,children:"重试加载项目组"})]}),n?o.length?e.jsx("div",{className:I.accessTableWrap,children:e.jsxs("table",{className:I.accessTable,"aria-label":"当前设备使用范围",role:"table",children:[e.jsx("thead",{role:"rowgroup",children:e.jsx("tr",{role:"row",children:["使用范围","设备","到期时间","操作"].map(l=>e.jsx("th",{scope:"col",role:"columnheader",children:l},l))})}),e.jsx("tbody",{role:"rowgroup",children:o.map(l=>{const p=JSON.stringify([l.team_id,l.expires_at]),c=i.teams?.find(u=>u.id===l.team_id);return e.jsxs("tr",{role:"row",children:[e.jsxs("td",{role:"cell",children:[e.jsx("span",{className:I.accessCellLabel,"aria-hidden":"true",children:"使用范围"}),e.jsxs("div",{children:[e.jsx("strong",{children:l.team_id?"项目组专用":"公共"}),l.team_id&&e.jsxs("p",{children:[c?.name??`项目组 ${l.team_id}`,i.loading?"（名称读取中）":!c&&!i.error?"（未在当前项目组列表中）":"",e.jsx("span",{className:"muted small",children:" · 所有成员"})]})]})]}),e.jsxs("td",{role:"cell",children:[e.jsx("span",{className:I.accessCellLabel,"aria-hidden":"true",children:"设备"}),e.jsxs("div",{children:[e.jsxs("span",{className:"muted small",children:[l.workers.length," 台设备"]}),e.jsx("ul",{"aria-label":"该范围内的设备",children:l.workers.map(u=>e.jsx("li",{children:u.name||u.id},u.id))})]})]}),e.jsxs("td",{role:"cell",children:[e.jsx("span",{className:I.accessCellLabel,"aria-hidden":"true",children:"到期时间"}),e.jsx("span",{children:l.team_id?l.expires_at===null?"不自动到期（手动解除）":`${new Date(l.expires_at*1e3).toLocaleString("zh-CN",{hour12:!1})} 到期恢复公共`:"不限制"})]}),e.jsxs("td",{role:"cell",children:[e.jsx("span",{className:I.accessCellLabel,"aria-hidden":"true",children:"操作"}),e.jsx("button",{type:"button","data-focus-key":`worker-access-group:${p}`,disabled:s,onClick:()=>a(l.workers),children:"修改设置"})]})]},p)})})]})}):e.jsx("p",{children:"暂无设备，设备注册后会在这里显示当前使用范围。"}):e.jsx("p",{children:t?"使用范围读取失败，请重试读取。":"正在读取已设置的使用范围…"})]})})}function mr({gpu:n,ram:r,live:t}){const s=[...n?[{label:`GPU ${n.index??""} 显存`,short:"显存",used:n.memory_used_bytes,total:n.memory_total_bytes,kind:"vram"}]:[],...r?[{label:"系统内存",short:"系统内存",used:r.used_bytes,total:r.total_bytes,kind:"ram"}]:[]].map(a=>{const o=X(a.used),l=X(a.total),p=t&&o!=null&&o>=0&&l!=null&&l>0?Math.max(0,Math.min(100,o/l*100)):null;return{...a,value:p}}),i=t&&n?X(n.temperature_c):null;return e.jsx("div",{className:I.resourceRow,children:e.jsxs("div",{className:I.resourceReadings,children:[n&&e.jsxs("strong",{className:I.resourceTitle,children:[e.jsxs("span",{children:["GPU ",n.index??"未知"," · ",n.name||"未记录型号"]}),e.jsx("span",{children:i==null?"温度未采集":`${i}°C`})]}),s.map(a=>e.jsxs("div",{className:I.resourceReading,"data-resource":a.kind,role:a.value==null?void 0:"meter","aria-label":a.label,"aria-valuemin":a.value==null?void 0:0,"aria-valuemax":a.value==null?void 0:100,"aria-valuenow":a.value??void 0,"aria-valuetext":a.value==null?void 0:`${Se(a.used)} / ${Se(a.total)}，${Math.round(a.value)}%`,children:[e.jsx("span",{className:I.resourceLabel,children:a.short}),e.jsx("span",{children:t?`${Se(a.used)} / ${Se(a.total)}`:"非实时 / 未采集"}),e.jsx("b",{children:a.value==null?"—":`${Math.round(a.value)}%`}),e.jsx("div",{className:I.resourceBar,"data-resource-bar":!0,"aria-hidden":"true",children:a.value!=null&&e.jsx("i",{"data-resource-fill":!0,style:{width:`${a.value}%`}})})]},a.kind)),r&&e.jsx("span",{className:I.resourceNote,children:t?"系统可见容量":"最后配置见详情"})]})})}function yi({snapshot:n,now:r,onDetails:t}){const s=n.workers.filter(i=>!ue(i)||Fe(i)||["disabled","error"].includes(i.state||""));return s.length?e.jsx(e.Fragment,{children:s.map(i=>e.jsxs("button",{type:"button",className:"attention-item","data-worker":i.id,"data-focus-key":`worker-attention:${i.id}`,onClick:()=>t(i),children:[e.jsxs("span",{className:"attention-top",children:[e.jsx("strong",{className:"danger",children:i.name||i.id}),e.jsx(xn,{name:"chevron"})]}),e.jsx("b",{className:"danger",children:ue(i)?Fe(i)?"节点同步失败":tn(i.state):"已离线"}),e.jsx("p",{children:ue(i)?Fe(i)&&i.sync_message?i.sync_message:`${jn(i)[0]}；查看完整节点详情。`:`最后心跳 ${Jn(i.last_seen,r)}`})]},i.id))}):e.jsx("p",{className:"muted small",children:"当前没有需要关注的节点异常。"})}function ji(n){const{state:r,store:t,service:s,automatic:i,setAutomatic:a,clock:o}=ti(n),[l,p]=d.useState(!1),c=ds(n.http,l||!!r.snapshot?.workers.some(M=>M.access_team_id)),u=d.useMemo(()=>Ps(n.http),[n.http]),{snapshot:g,stale:x,loading:m,error:_,isolated:y,mutation:N,deletingWorker:w}=r,[h,b]=d.useState(null),[k,R]=d.useState(!1),[D,C]=d.useState(()=>new Set),P=g?.workers.filter(M=>D.has(M.id))??[],T=!!g?.workers.length&&P.length===g.workers.length,f=P.length>0&&!T,{history:v}=r,j=v.filter,S=Oa(g,Math.max(o,Date.now())),$=g?.health||{},Z=g?.status||{},G=n.sandbox||y||x||!g||N!=null,te=()=>b(null),O=M=>{g&&b({kind:"worker",worker:M,snapshot:g})},V=M=>{if(n.sandbox||!t.canMutate()){n.notify({message:"当前不可更新：隔离副本或服务状态未就绪。",tone:"warning"});return}M.kind==="access"&&p(!0),b(M)},H=()=>{if(n.sandbox||!t.canMutate())throw new Error("隔离副本或服务状态未就绪，禁止修改设备")},me=$.ok===!0?"运行正常":$.ok===!1?"异常":"状态未知",pe=$.comfy_online===!0?"可用":$.comfy_online===!1?"不可用":"状态未知",se=[["运行模式",$.mode==="controller"?"Linux 中间层 / Controller":$.mode==="local"?"Windows 单机":$.mode||"未获取"],["可用能力",X($.capabilities)==null?"未获取":`${$.capabilities} 项`],["任务记录",X($.jobs)==null?"未获取":`${$.jobs} 条`],["大模型接口",$.llm?$.llm.ok?`已配置 · ${$.llm.model||"型号未记录"}`:"未配置":"未获取"],["页面地址",location.origin+"/controller"],["创作画布",location.origin+"/"]],he=ni(g,v);return e.jsxs("main",{id:"main",className:I.page,tabIndex:-1,"aria-busy":m?!0:void 0,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"运行面板"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{className:"subtitle",id:"service-subtitle",children:g?`中间层${me} / ComfyUI ${pe}`:"正在读取中间层运行状态"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{className:"muted small",id:"refresh-state",role:"status",children:m?"正在读取…":x?"连接失败 · 快照非实时":g?`最后刷新 ${new Date(g.receivedAt).toLocaleTimeString("zh-CN",{hour12:!1})}`:"正在加载…"}),e.jsxs("label",{className:"check-label",children:[e.jsx("input",{id:"auto-refresh",type:"checkbox",checked:i,onChange:M=>a(M.target.checked)}),"每5秒刷新"]}),e.jsxs("button",{type:"button",className:"primary",id:"refresh",disabled:m||N!=null,onClick:()=>{t.refreshAll()},children:[e.jsx(xn,{name:"refresh"}),"立即刷新"]}),e.jsx("button",{type:"button",id:"sync-all",disabled:G,title:n.sandbox||y?"本地隔离数据副本禁止节点同步，不能修改正式机器。":void 0,onClick:()=>V({kind:"sync"}),children:"一键更新全部节点"})]})]}),e.jsxs("div",{id:"error",className:"f-error",role:"alert",hidden:!_,children:[e.jsxs("div",{children:[e.jsx("b",{id:"error-message",children:_}),e.jsx("p",{children:"已载入内容仅为上次快照，不能作为实时状态；未知数据不记为零。"})]}),e.jsx("button",{type:"button",id:"retry",disabled:m||N!=null,onClick:()=>{t.refreshAll()},children:"重试读取"})]}),e.jsxs("section",{className:`metrics f-metrics6 ${I.overview}`,"aria-label":"运行概览",children:[e.jsx(Ie,{id:"service",label:"中间层服务",value:$.ok===!0?"运行正常":$.ok===!1?"异常":"未获取",compact:!0,tone:$.ok===!0?"ok":$.ok===!1?"bad":"",noteId:"service-mode",note:$.mode==="controller"?"Controller 模式":$.mode==="local"?"Windows 单机":$.mode||"等待服务响应"}),e.jsx(Ie,{id:"workers",label:"在线执行端",value:g?`${Ce($.online_workers)} / ${Ce($.workers)}`:"未获取",note:"含禁用与同步中的在线节点"}),e.jsx(Ie,{id:"running",label:"正在运行",value:Ce(Z.running_count),note:"由中间层调度的任务"}),e.jsx(Ie,{id:"queued",label:"排队任务",value:Ce(Z.queued_count),note:"等待可用执行端"}),e.jsx(Ie,{id:"comfy",label:"ComfyUI",value:$.comfy_online===!0?"可用":$.comfy_online===!1?"不可用":"未获取",compact:!0,tone:$.comfy_online===!0?"ok":$.comfy_online===!1?"bad":"",note:"单节点状态见下方卡片"}),e.jsx(Ie,{id:"uptime",label:"服务运行时间",value:X($.started_at)!=null&&X($.server_time)!=null?Hn(Number($.server_time)-Number($.started_at)):"未获取",compact:!0,note:"本次中间层服务启动至今"})]}),e.jsxs("div",{className:"dashboard-grid",children:[e.jsxs("section",{className:"card","aria-labelledby":"workers-title",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"workers-title",children:"Windows 执行端"}),e.jsx("p",{className:"section-subtitle",children:"设备资源、当前任务与同步状态"})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{className:"muted small",id:"worker-count",children:g?`${g.workers.length} 台 / ${g.workers.filter(ue).reduce((M,oe)=>M+sn(oe).length,0)} 张在线GPU`:"正在读取"}),e.jsx("button",{type:"button","data-focus-key":"worker-commands",onClick:()=>{b(null),R(!0)},children:"远程命令"})]})]}),e.jsx(bi,{snapshot:g,now:S,stale:x,mutationDisabled:G,teams:c,onEdit:M=>{C(new Set(M.map(oe=>oe.id))),V({kind:"access",workers:M})}}),e.jsxs("div",{className:I.selectionToolbar,role:"group","aria-label":"设备使用范围批量操作",children:[e.jsxs("label",{className:I.selectAll,children:[e.jsx("input",{type:"checkbox","aria-label":"全选设备","aria-checked":f?"mixed":T,checked:T,ref:M=>{M&&(M.indeterminate=f)},disabled:G||!g?.workers.length,onChange:M=>{G||C(new Set(M.target.checked?g?.workers.map(oe=>oe.id):[]))}}),"全选设备"]}),e.jsxs("span",{role:"status","aria-live":"polite",children:["已选 ",P.length," 台"]}),e.jsx("button",{type:"button",className:"primary","data-focus-key":"worker-access-batch",disabled:G||P.length===0,onClick:()=>{P.length&&V({kind:"access",workers:P})},children:"批量设置使用范围"}),e.jsx("button",{type:"button",disabled:G||P.length===0,onClick:()=>C(new Set),children:"清除选择"})]}),e.jsx("div",{id:"worker-rows",className:I.workerGrid,children:g?e.jsx(gi,{snapshot:g,now:S,stale:x,mutationDisabled:G,deletingWorker:w,onDetails:O,onTemperature:M=>b({kind:"temperature",id:M}),onDelete:M=>V({kind:"delete",worker:M}),onSync:M=>V({kind:"syncWorker",worker:M}),selectedIds:D,onSelection:(M,oe)=>{G||C(Pe=>{const Je=new Set(Pe);return oe?Je.add(M.id):Je.delete(M.id),Je})},teams:c.teams}):e.jsx("p",{className:"loading-note",children:_?"执行端读取失败，请点击“重试读取”。":"正在读取执行端…"})}),e.jsx("p",{className:"table-note",children:"显存与内存分条显示，多显卡逐卡列出，系统内存不重复。离线或过期读数不作实时数据。点击清单差异可仅同步该设备。"})]}),e.jsxs("aside",{className:"right-column","aria-label":"需要关注及配置",children:[e.jsxs("section",{className:"card",children:[e.jsx("div",{className:"section-heading",children:e.jsxs("h2",{className:"heading-inline",children:[e.jsx("span",{className:"danger",id:"attention-icon",children:e.jsx(xn,{name:"alert"})}),"需要关注"]})}),e.jsx("div",{className:"attention-list",id:"attention-list",tabIndex:0,role:"region","aria-label":"需要关注的节点列表",children:g?e.jsx(yi,{snapshot:g,now:S,onDetails:O}):e.jsx("p",{className:"muted small",children:_?"节点状态未获取，不能判断是否存在异常。":"正在读取节点状态…"})})]}),e.jsxs("section",{className:"card",children:[e.jsx("div",{className:"section-heading",children:e.jsx("h2",{children:"服务配置摘要"})}),e.jsx(Hr,{id:"config-rows",className:"f-config-definition",rows:se})]})]})]}),e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"最近任务"}),e.jsx("p",{className:"section-subtitle",children:"数据库历史按时间倒序分批加载；实时任务优先显示，归档未记录的信息不作推测"})]}),e.jsxs("label",{className:"filter-label",children:["任务状态",e.jsxs("select",{id:"jobs-filter",value:j,onChange:M=>{const oe=ws.safeParse(M.target.value);oe.success&&t.setHistoryFilter(oe.data)},children:[e.jsx("option",{value:"all",children:"全部状态"}),["running","queued","done","error","canceled"].map(M=>e.jsx("option",{value:M,children:Tr[M]},M))]})]})]}),e.jsx("div",{className:"table-wrap f-job-scroll",role:"region","aria-label":"最近任务列表","aria-describedby":"job-note","aria-busy":!!v.loading,tabIndex:0,onScroll:M=>{const{scrollHeight:oe,scrollTop:Pe,clientHeight:Je}=M.currentTarget;oe-Pe-Je<=160&&!v.error&&t.loadMore()},children:e.jsxs("table",{className:"jobs-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["状态","姓名 / 项目 / 卡片","模式","过程进度 / 步骤","执行端","创建时间","耗时 / 错误"].map(M=>e.jsx("th",{scope:"col",children:M},M))})}),e.jsx("tbody",{id:"job-rows",children:e.jsx(oi,{snapshot:g,now:S,items:he,onError:M=>b({kind:"job",job:M})})})]})}),e.jsxs("div",{className:I.historyControls,children:[e.jsxs("p",{className:"table-note",id:"job-note",role:"status","aria-live":"polite",children:[v.loading?v.loading==="more"?"正在加载更多历史…":"正在刷新任务历史…":v.initialized?v.hasMore?"向下滚动或点击加载更多。":"历史记录已加载完毕。":"任务历史尚未载入。",` 当前筛选历史共 ${v.total??"未知"} 条，已加载 ${v.jobs.length} 条；合并实时任务后显示 ${he.length} 条。`]}),v.error&&e.jsx("p",{role:"alert",children:v.error}),v.error?e.jsx("button",{type:"button",disabled:!!v.loading,onClick:()=>{t.retryHistory()},children:"重试任务历史"}):e.jsx("button",{type:"button","aria-controls":"job-rows",disabled:!!v.loading||!v.hasMore,onClick:()=>{t.loadMore()},children:"加载更多历史"})]})]})]}),e.jsx(Qa,{context:n,open:k,workers:g?.workers??[],canMutate:t.canMutate,unavailable:G,onClose:()=>R(!1)}),h?.kind==="worker"&&e.jsx(fi,{worker:g?.workers.find(M=>M.id===h.worker.id)||h.worker,snapshot:g||h.snapshot,now:S,stale:x,restartUnavailable:n.sandbox||y?"隔离副本禁止重启真实设备。":N!=null?"设备操作正在提交，请稍候。":!g||x?"服务状态未就绪，请刷新后重试。":g.workers.some(M=>M.id===h.worker.id)?"":"该设备已移除或已被新的注册替代。",onRestart:async M=>{H(),await t.restartWorker(h.worker.id,M)},onClose:te}),h?.kind==="access"&&e.jsx(Ea,{workers:h.workers,now:S,teams:c,unavailable:n.sandbox||y?"隔离副本禁止修改设备使用范围。":N!=null?"设备操作正在提交，请稍候。":!g||x?"服务状态未就绪，请刷新后重试。":h.workers.some(M=>!g.workers.some(oe=>oe.id===M.id))?"所选设备中有设备已移除或已被新的注册替代，请关闭后重新选择。":"",onSave:async(M,oe)=>{H();const Pe=await t.saveAccess(M,oe,u);return Pe.failed.length===0&&n.notify({message:"设备使用范围已保存，已有任务不中断。",tone:"success"}),Pe},onClose:te},JSON.stringify(h.workers.map(M=>M.id).sort())),h?.kind==="temperature"&&e.jsx(ui,{workerId:h.id,worker:g?.workers.find(M=>M.id===h.id),service:s,now:S,stale:x,revision:r.refreshed,onClose:te}),h?.kind==="job"&&e.jsxs(de,{title:"任务错误详情",onClose:te,children:[e.jsxs("p",{children:["任务 ",h.job.id]}),e.jsx("pre",{children:h.job.error||"未记录错误详情"}),e.jsxs("details",{children:[e.jsx("summary",{children:"任务执行记录"}),e.jsx("pre",{children:JSON.stringify(h.job,null,2)})]})]}),h?.kind==="syncWorker"&&e.jsxs(de,{title:"同步单台设备",onClose:te,submitLabel:"确认同步此设备",onSubmit:async()=>{H(),await t.syncWorker(h.worker.id),n.notify({message:`同步请求已提交至“${h.worker.name||h.worker.id}”，等待设备空闲后执行；完成情况以节点反馈为准。`,tone:"success"})},children:[e.jsxs("p",{children:["仅同步这一台设备“",h.worker.name||h.worker.id,"”（",h.worker.id,"），不更新其他设备。"]}),e.jsx("div",{className:"notice-box",children:"设备空闲后同步主节点的 ComfyUI 核心、models 和 user，拉取 chouka 最新代码，再按本机 GPU 启动配置重启 ComfyUI 与 Worker，不重启 Windows。同步会复制或覆盖对应文件，并非仅补齐缺失项；不会清除设备上的全部额外资源。"}),e.jsx("p",{children:"忙碌时等待当前任务结束，不立即中断任务。请求提交不代表同步已完成；同步结束后需重新采集清单核对。"})]}),h?.kind==="sync"&&e.jsxs(de,{title:"更新全部节点",onClose:te,submitLabel:"确认更新",onSubmit:async()=>{H();const M=await t.syncAll();n.notify({message:`已向 ${Ce(M.worker_count)} 个节点下发更新请求；主节点跳过 ${Ce(M.primary_count)} 个，旧版跳过 ${Ce(M.skipped_count)} 个。`,tone:"success"})},children:[e.jsx("p",{children:"确认更新全部节点？"}),e.jsx("div",{className:"notice-box",children:"节点空闲后依次同步 ComfyUI 核心、models 和 user，拉取 chouka 最新代码，再按本机 GPU 启动配置重启 ComfyUI 与 Worker。全部服务恢复就绪后才显示完成。忙碌节点等待当前任务结束；离线节点下次上线后执行。主节点作为同步源不会参与更新；旧版节点会跳过，需先手动更新一次 Worker 及配套启动文件。"}),e.jsx("p",{className:"muted small",children:"这是实际节点更新和服务重启操作，确认后将向中间层提交请求。"})]}),h?.kind==="delete"&&e.jsxs(de,{title:"删除设备",onClose:te,submitLabel:"确认删除设备",onSubmit:async()=>{H(),await t.deleteWorker(h.worker.id),n.notify({message:"设备已删除，历史任务和账单保留。",tone:"success"})},children:[e.jsxs("p",{children:["确认删除设备“",h.worker.name||"未命名执行端","”？"]}),e.jsx("div",{className:"notice-box",children:"设备会从列表中移除，历史任务和账单不会删除。设备后续重新注册时会重新出现。"})]})]})}function Ie({id:n,label:r,value:t,note:s,noteId:i,compact:a=!1,tone:o=""}){return e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:r}),e.jsx("p",{className:`metric-value${a?" compact":""}${o?` ${o}`:""}`,id:n,children:t}),e.jsx("p",{className:"metric-note",id:i,children:s})]})})}const Ye=ve([z().min(1),U().finite()]).transform(String),Be=Me(["user","admin","monitor"]),Qe=Me(["read","operate"]),vi=A({id:Ye,username:z(),display_name:z().nullish(),phone:z().nullish(),role:Be,enabled:Y(),team_leader:Y().default(!1),approval_status:z().optional(),local_login_enabled:Y().optional(),dinghai_identity:wt.optional()}),_i=A({id:z().min(1),name:z().nullish(),owner_id:Ye,owner_username:z().nullish(),owner_display_name:z().nullish(),team_id:z().nullish(),team_name:z().nullish()}),hr=ve([A({scope:ce("all"),viewer_id:Ye,permission:Qe}),A({scope:ce("owner").optional(),viewer_id:Ye,owner_id:Ye.refine(n=>n!=="*","无效所有者"),permission:Qe})]),wi=A({requests:q(A({username:z(),display_name:z().nullish(),status:z(),created_at:U().nullish(),decided_by:z().nullish()})),outbox:A({pending:U().int().nonnegative(),oldest_at:U().nullish()}).nullish()}),Gr={admin:"管理员",user:"普通用户",monitor:"监控展示员"},fn={approved:"已通过",pending:"待审批",rejected:"已拒绝"},un="全部个人和项目组画布，包括现有及未来新增画布",Jr="画布内容和历史费用不变。新所有者的授权访问者将获得相应权限（可操作包含删除）；原所有者及其授权访问者可能失去访问权限。管理员仍可访问全部画布。项目组画布由成员关系授权，不能改为个人归属。";function en(n){return(n?.username||"未知账号")+(n?.display_name?.trim()?`（${n.display_name.trim()}）`:"")}function je(n,r){return`${en(n.find(t=>t.id===r))}（ID: ${r}）`}function An(n,r){const t=r.find(s=>s.id===n.owner_id);return en({username:n.owner_username||t?.username,display_name:n.owner_display_name||t?.display_name})}function Tn(n){return n==="operate"?"可操作（含删除）":"只读"}function Kr(n){return n?new Date(n*1e3).toLocaleString("zh-CN",{hour12:!1}):"—"}const _e=z().min(1).max(512).refine(n=>n!=="*","无效账号 ID"),Yr=z().min(8,"密码至少 8 位").max(1024),ki=A({username:z().trim().min(1,"请输入账号名").max(128),password:Yr,role:Be,team_leader:Y()}).refine(n=>n.role!=="monitor"||!n.team_leader,"监控展示员不能担任组长"),Ni=$t("scope",[A({scope:ce("all"),viewer_id:_e,permission:Qe}),A({scope:ce("owner"),viewer_id:_e,owner_id:_e,permission:Qe}).refine(n=>n.viewer_id!==n.owner_id,"访问者和所有者不能是同一个账号。")]),Si=A({owner_id:_e,projects:q(A({project_id:z().min(1).max(512),owner_id:_e})).min(1,"请选择画布").max(1e3,"每次最多分配 1000 个画布")}).refine(n=>new Set(n.projects.map(r=>r.project_id)).size===n.projects.length,"画布分配清单存在重复项"),$i=A({role:Be.optional(),enabled:Y().optional(),team_leader:Y().optional(),display_name:z().trim().min(1,"请输入本地姓名 / 花名").max(64).optional(),phone:z().regex(/^(?:1[3-9]\d{9})?$/,"请输入有效的 11 位手机号，或留空清除").optional()}).strict().refine(n=>Object.values(n).some(r=>r!==void 0),"请选择修改内容"),xr=A({}).passthrough(),fr=n=>`/api/admin/global-grants/${encodeURIComponent(_e.parse(n))}`,gr=n=>`/api/admin/users/${encodeURIComponent(_e.parse(n))}`;function Ci(n){const r=async(t,s,i)=>{xr.parse(await n.json(t,s,i))};return{async snapshot(t){const s={signal:t,cache:"no-store"},[i,a,o]=await Promise.all([n.read("/api/admin/users",A({users:q(vi)}),s),n.read("/api/admin/grants",A({grants:q(hr)}),s),n.read("/api/projects",A({projects:q(_i)}),s)]);return{users:i.users,grants:a.grants,projects:o.projects}},dispatchPriority:t=>n.read("/api/admin/dispatch-priority",A({enabled:Y()}),{signal:t,cache:"no-store"}),setDispatchPriority:t=>r("/api/admin/dispatch-priority","PUT",{enabled:Y().parse(t)}),registrations:t=>n.read("/api/admin/registrations",wi,{signal:t,cache:"no-store"}),create:t=>r("/api/admin/users","POST",ki.parse(t)),update:(t,s)=>r(gr(t),"PATCH",$i.parse(s)),resetPassword:(t,s)=>r(`${gr(t)}/password`,"POST",{password:Yr.parse(s)}),saveGrant:t=>{const s=Ni.parse(t);return s.scope==="all"?r(fr(s.viewer_id),"PUT",{permission:s.permission}):r("/api/admin/grants","PUT",{viewer_id:s.viewer_id,owner_id:s.owner_id,permission:s.permission})},async revokeGrant(t){const s=hr.parse(t),i=s.scope==="all"?fr(s.viewer_id):`/api/admin/grants/${encodeURIComponent(_e.parse(s.viewer_id))}/${encodeURIComponent(_e.parse(s.owner_id))}`;xr.parse(await n.request(i,{method:"DELETE"}))},async assign(t){const s=await n.json("/api/admin/projects/assign","POST",Si.parse(t));return A({count:U().int().nonnegative()}).parse(s).count}}}function ke(n,r){const t=new FormData(n).get(r);if(typeof t!="string")throw new Error("表单字段不正确："+r);return t}function zi(n,r,t){const s=r.trim().toLowerCase();return n.filter(i=>(!t||i.owner_id===t)&&(!s||(i.name||"").toLowerCase().includes(s)||i.id.toLowerCase().includes(s)))}function Ei(n,r){const t=n.filter(i=>!i.team_id),s=t.filter(i=>r.has(i.id)).length;return{personal:t,checked:t.length>0&&s===t.length,indeterminate:s>0&&s<t.length}}function Mi(n,r,t,s){const i=n.find(a=>a.id===r);if(!i||i.role==="monitor"||t!=="*"&&!n.some(a=>a.id===t))throw new Error("请选择有效账号和授权范围。");if(r===t)throw new Error("访问者和所有者不能是同一个账号。");return t==="*"?{scope:"all",viewer_id:r,permission:s}:{scope:"owner",viewer_id:r,owner_id:t,permission:s}}function Pi(n,r,t,s){const i=n.find(o=>o.id===s&&o.enabled&&o.role!=="monitor");if(!i)throw new Error("请选择有效的启用目标账号。");if(!t.size)throw new Error("请选择个人画布。");if(t.size>1e3)throw new Error("每次最多分配 1000 个画布，请缩小筛选范围后再选择。");const a=r.filter(o=>t.has(o.id));if(a.length!==t.size||a.some(o=>o.team_id))throw new Error("选择包含项目组画布或已变化的画布，请刷新后重新选择。");return{target:i,chosen:a.map(o=>({...o})),payload:{owner_id:i.id,projects:a.map(o=>({project_id:o.id,owner_id:o.owner_id}))}}}function Ii({http:n,notify:r}){const t=d.useMemo(()=>Ci(n),[n]),[s,i]=d.useState({users:[],projects:[],grants:[]}),[a,o]=d.useState(null),[l,p]=d.useState(null),[c,u]=d.useState(""),[g,x]=d.useState(!1),[m,_]=d.useState(!0),[y,N]=d.useState(!1),[w,h]=d.useState(""),[b,k]=d.useState("正在加载真实数据…"),[R,D]=d.useState(new Set),[C,P]=d.useState(""),T=d.useRef(!1),f=d.useRef(!1),v=d.useRef(!1),j=d.useRef(0),S=d.useRef(null),$=d.useRef(r);d.useEffect(()=>{$.current=r},[r]);const Z=d.useCallback(async()=>{if(T.current)return;T.current=!0;const O=++j.current,V=new AbortController;S.current=V;const H=()=>v.current&&j.current===O;_(!0),k("正在加载真实数据…");try{const[me,pe]=await Promise.all([t.snapshot(V.signal),t.dispatchPriority(V.signal)]);if(!H())return;o(pe.enabled),i(me),x(!0),D(new Set);try{const se=await t.registrations(V.signal);if(!H())return;p(se),u("")}catch(se){if(!H())return;p(null);const he="注册申请信息加载失败："+re(se);u(he),$.current({message:he,tone:"error"})}H()&&k("更新于 "+new Date().toLocaleTimeString("zh-CN",{hour12:!1}))}catch(me){if(!H())return;throw x(!1),k("加载失败，请刷新重试"),me}finally{H()&&(T.current=!1,_(!1))}},[t]),G=d.useCallback(async()=>{if(!(f.current||T.current)){h("");try{await Z()}catch(O){if(!v.current)return;const V=re(O);h(V),$.current({message:V,tone:"error"})}}},[Z]);return d.useEffect(()=>(v.current=!0,G(),()=>{v.current=!1,S.current?.abort(),T.current=!1}),[G]),{...s,dispatchPriority:a,service:t,registrations:l,registrationError:c,ready:g,loading:m,mutationBusy:y,error:w,setError:h,refreshNote:b,selected:R,setSelected:D,assignStatus:C,setAssignStatus:P,refreshPage:G,mutate:async(O,V,H)=>{if(f.current||T.current||!g)throw new Error("另一项操作正在提交或列表尚未就绪，请稍后重试。");f.current=!0,N(!0),h("");try{if(await O(),!v.current)return;H?.(),$.current({message:V,tone:"success"});try{await Z()}catch(me){if(!v.current)return;const pe="操作已成功，但列表刷新失败，请点击刷新数据后继续："+re(me);h(pe),$.current({message:pe,tone:"warning"})}}finally{f.current=!1,v.current&&N(!1)}}}}function Xr({initial:n="user",onChange:r}){return e.jsxs("label",{className:"field",children:["角色",e.jsx("select",{name:"role",defaultValue:n,onChange:t=>r?.(Be.parse(t.currentTarget.value)),children:["user","admin","monitor"].map(t=>e.jsx("option",{value:t,children:Gr[t]},t))})]})}function Ri({user:n}){return e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"notice-box",children:"仅编辑本地资料，不修改账号名、内部用户 ID 或定海验证资料。定海资料由定海维护。"}),e.jsxs("label",{className:"field",children:["本地姓名 / 花名",e.jsx("input",{name:"display_name",defaultValue:n.display_name||"",required:!0,maxLength:64})]}),e.jsxs("label",{className:"field",children:["本地手机号",e.jsx("input",{name:"phone",type:"tel",defaultValue:n.phone||"",maxLength:11,pattern:"1[3-9][0-9]{9}",autoComplete:"tel-national"})]}),e.jsx("p",{className:"auth-note",children:"手机号非空时须为有效的 11 位号码；留空可清除。"})]})}function Zr(){return e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"field",children:["新密码（至少 8 位）",e.jsx("input",{name:"password",type:"password",minLength:8,maxLength:1024,autoComplete:"new-password",required:!0})]}),e.jsx("p",{className:"notice-box",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。密码不会显示在列表中。"})]})}function Li(){const[n,r]=d.useState("user"),[t,s]=d.useState(!1);return e.jsxs("div",{id:"create",className:"form-grid",children:[e.jsxs("label",{className:"field",children:["账号名",e.jsx("input",{name:"username",required:!0,maxLength:128,autoComplete:"off"})]}),e.jsx(Zr,{}),e.jsx(Xr,{onChange:i=>{r(i),i==="monitor"&&s(!1)}}),e.jsxs("label",{className:"check-label",children:[e.jsx("input",{name:"team_leader",type:"checkbox",checked:t,disabled:n==="monitor",onChange:i=>s(i.currentTarget.checked)}),"独立授予组长权限"]}),e.jsx("p",{className:"notice-box",children:"创建后账号启用并标记为已通过。监控展示员不能担任组长，密码由管理员重置；其他账号登录后可自行修改。"})]})}const Ai="_accountIdentity_1xovb_1",Ti="_dinghaiIdentity_1xovb_8",Di="_priority_1xovb_29",Oi="_track_1xovb_47",Fi="_thumb_1xovb_59",Te={accountIdentity:Ai,dinghaiIdentity:Ti,priority:Di,switch:"_switch_1xovb_37",track:Oi,thumb:Fi};function Ve({name:n,id:r,idLabel:t="ID"}){return e.jsxs("span",{className:"perm-identity",children:[e.jsx("span",{className:"perm-username",children:n}),e.jsxs("span",{className:"perm-user-id",children:[t,": ",r]})]})}function vn({columns:n,children:r}){return e.jsx("tr",{children:e.jsx("td",{colSpan:n,children:r})})}function qi({users:n,busy:r,ready:t,action:s}){return e.jsx("div",{className:"table-wrap accounts-scroll",tabIndex:0,role:"region","aria-label":"账号列表",children:e.jsxs("table",{className:"accounts-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["账号 / ID","本地姓名 / 花名","本地手机号","角色","独立组长权限","启用状态","审批","操作"].map(i=>e.jsx("th",{scope:"col",children:i},i))})}),e.jsxs("tbody",{id:"users",children:[n.map(i=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsxs("div",{className:Te.accountIdentity,children:[e.jsx("span",{children:i.local_login_enabled===!1?"定海账号":i.dinghai_identity?"本地账号 · 已绑定定海":"本地账号"}),e.jsx(Ve,{name:i.username,id:i.id,idLabel:"内部用户 ID"}),i.dinghai_identity&&e.jsxs("dl",{className:Te.dinghaiIdentity,"aria-label":"定海验证资料（由定海维护）",children:[e.jsxs("div",{children:[e.jsx("dt",{children:"资料来源"}),e.jsx("dd",{children:"定海验证 · 由定海维护"})]}),[["定海用户名",i.dinghai_identity.username],["定海姓名 / 花名",i.dinghai_identity.display_name],["定海手机号",i.dinghai_identity.phone],["定海 ID",i.dinghai_identity.id]].map(([a,o])=>e.jsxs("div",{children:[e.jsx("dt",{children:a}),e.jsx("dd",{children:o||"未填写"})]},a))]})]})}),e.jsx("td",{children:i.local_login_enabled===!1?"—":i.display_name||"—"}),e.jsx("td",{children:i.local_login_enabled===!1?"—":i.phone||"未填写"}),e.jsx("td",{children:e.jsx("span",{className:"f-chip "+(i.role==="admin"?"admin":""),children:Gr[i.role]})}),e.jsx("td",{children:i.team_leader?"是":"否"}),e.jsx("td",{children:e.jsx("span",{className:"f-chip "+(i.enabled?"on":"off"),children:i.enabled?"启用":"已停用"})}),e.jsx("td",{children:Object.hasOwn(fn,i.approval_status||"")?fn[i.approval_status||""]:"—"}),e.jsx("td",{children:e.jsxs("div",{className:"row-actions",children:[e.jsx("button",{type:"button",className:i.enabled?"danger":"",disabled:r,onClick:()=>s(i,"enabled"),children:i.enabled?"停用":"启用"}),e.jsx("button",{type:"button",disabled:r,onClick:()=>s(i,"role"),children:"修改角色"}),i.role!=="monitor"&&e.jsx("button",{type:"button",disabled:r,onClick:()=>s(i,"leader"),children:i.team_leader?"取消组长权限":"设为组长"}),i.local_login_enabled===!1?e.jsx("span",{children:"密码由定海管理"}):e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",disabled:r,onClick:()=>s(i,"profile"),children:"编辑资料"}),e.jsx("button",{type:"button",disabled:r,onClick:()=>s(i,"password"),children:"重置密码"})]})]})})]},i.id)),!n.length&&e.jsx(vn,{columns:8,children:t?"暂无账号。":"正在加载账号…"})]})]})})}function Ui({data:n,error:r}){return e.jsx("div",{className:"table-wrap registrations-scroll",tabIndex:0,role:"region","aria-label":"注册申请列表",children:e.jsxs("table",{className:"registration-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["账号","姓名 / 花名","状态","申请时间","审批人"].map(t=>e.jsx("th",{scope:"col",children:t},t))})}),e.jsxs("tbody",{id:"registrations",children:[n?.requests.map((t,s)=>e.jsxs("tr",{children:[e.jsx("td",{children:t.username}),e.jsx("td",{children:t.display_name||"—"}),e.jsx("td",{children:Object.hasOwn(fn,t.status)?fn[t.status]:t.status}),e.jsx("td",{children:Kr(t.created_at)}),e.jsx("td",{children:t.decided_by||"—"})]},t.username+"-"+s)),!n?.requests.length&&e.jsx(vn,{columns:5,children:r?"暂时无法加载注册申请，请点击刷新数据重试。":n?"暂无自主注册申请。":"正在加载注册申请…"})]})]})})}function Wi({grants:n,users:r,busy:t,ready:s,revoke:i}){return e.jsx("div",{className:"table-wrap",tabIndex:0,role:"region","aria-label":"画布授权列表",children:e.jsxs("table",{className:"grant-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["访问者 A","方向","所有者 / 授权范围","权限","操作"].map(a=>e.jsx("th",{scope:"col",children:a},a))})}),e.jsxs("tbody",{id:"grants",children:[n.map(a=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx(Ve,{name:en(r.find(o=>o.id===a.viewer_id)),id:a.viewer_id})}),e.jsx("td",{children:"→"}),e.jsx("td",{children:a.scope==="all"?e.jsxs(e.Fragment,{children:["所有画布",e.jsx("span",{className:"perm-user-id",children:un})]}):e.jsx(Ve,{name:en(r.find(o=>o.id===a.owner_id)),id:a.owner_id})}),e.jsx("td",{children:Tn(a.permission)}),e.jsx("td",{children:e.jsx("button",{type:"button",className:"danger",disabled:t,onClick:()=>i(a),children:"撤销"})})]},a.viewer_id+"-"+(a.scope==="all"?"*":a.owner_id))),!n.length&&e.jsx(vn,{columns:5,children:s?"暂无画布授权。选择访问者与所有者 / 授权范围后保存。":"正在加载授权…"})]})]})})}function Bi({projects:n,users:r,target:t}){return e.jsx("div",{className:"dialog-list",tabIndex:0,role:"region","aria-label":"画布分配确认明细",children:e.jsxs("table",{children:[e.jsx("thead",{children:e.jsx("tr",{children:["画布名称","画布 ID","旧归属","目标归属"].map(s=>e.jsx("th",{scope:"col",children:s},s))})}),e.jsx("tbody",{children:n.map(s=>e.jsxs("tr",{children:[e.jsx("td",{children:s.name||"未命名画布"}),e.jsx("td",{children:s.id}),e.jsx("td",{children:e.jsx(Ve,{name:An(s,r),id:s.owner_id})}),e.jsx("td",{children:e.jsx(Ve,{name:en(t),id:t.id})})]},s.id))})]})})}function Vi({projects:n,users:r,busy:t,ready:s,selected:i,setSelected:a,status:o,onConfirm:l,onError:p}){const[c,u]=d.useState(""),[g,x]=d.useState(""),[m,_]=d.useState(""),y=new Map(n.map(C=>[C.owner_id,`${An(C,r)}（ID: ${C.owner_id}）`])),N=y.has(g)?g:"",w=r.filter(C=>C.enabled&&C.role!=="monitor"),h=w.some(C=>C.id===m)?m:"",b=zi(n,c,N),k=Ei(b,i),R=d.useRef(null);d.useEffect(()=>{R.current&&(R.current.indeterminate=k.indeterminate)},[k.indeterminate]);const D=C=>{C(),a(new Set)};return e.jsxs("section",{className:"card","aria-labelledby":"history-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"history-heading",tabIndex:-1,children:"历史画布分配"}),e.jsx("span",{className:"small muted",children:"仅个人空间 / 每次最多 1000 个"})]}),e.jsx("div",{className:"f-pad",children:e.jsx("p",{className:"notice-box",children:Jr})}),e.jsxs("div",{className:"allocation-tools",children:[e.jsxs("div",{className:"allocation-filters",children:[e.jsxs("label",{className:"field",children:["搜索名称 / ID",e.jsx("input",{id:"project-search",type:"search",autoComplete:"off",placeholder:"输入画布名称或 ID",value:c,disabled:t,onChange:C=>D(()=>u(C.currentTarget.value))})]}),e.jsxs("label",{className:"field",children:["当前所有者",e.jsxs("select",{id:"project-owner",value:N,disabled:t,onChange:C=>D(()=>x(C.currentTarget.value)),children:[e.jsx("option",{value:"",children:"全部所有者"}),[...y].map(([C,P])=>e.jsx("option",{value:C,children:P},C))]})]})]}),e.jsxs("form",{id:"assign",className:"allocation-batch","aria-busy":t,onSubmit:C=>{if(C.preventDefault(),!t)try{l(Pi(r,b,i,h))}catch(P){p(re(P))}},children:[e.jsxs("label",{className:"field",children:["目标账号（仅启用账号）",e.jsxs("select",{name:"owner_id",required:!0,value:h,disabled:t,onChange:C=>_(C.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择目标账号"}),w.map(C=>e.jsx("option",{value:C.id,children:je(r,C.id)},C.id))]})]}),e.jsxs("span",{id:"project-selected",role:"status",children:["已选 ",i.size," 个画布",i.size>1e3?"（超过 1000 个上限）":""]}),e.jsx("button",{id:"assign-submit",className:"primary",disabled:t||!i.size||!h,children:"分配所选画布"}),e.jsx("button",{id:"clear-selection",type:"button",disabled:t||!i.size,onClick:()=>a(new Set),children:"清空选择"})]})]}),e.jsx("p",{id:"assign-status",className:"table-note f-status",role:"status",children:o}),e.jsx("div",{className:"table-wrap history-scroll",tabIndex:0,role:"region","aria-label":"历史画布列表",children:e.jsxs("table",{className:"allocation-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{scope:"col",children:e.jsx("input",{ref:R,id:"project-all",type:"checkbox","aria-label":"全选当前筛选结果中的个人画布",checked:k.checked,disabled:t||!k.personal.length,onChange:C=>a(new Set(C.currentTarget.checked?k.personal.map(P=>P.id):[]))})}),["画布名称","画布 ID","当前所有者","空间"].map(C=>e.jsx("th",{scope:"col",children:C},C))]})}),e.jsxs("tbody",{id:"projects",children:[b.map(C=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("input",{type:"checkbox","data-team":String(!!C.team_id),checked:i.has(C.id),"aria-label":`选择画布 ${C.name||"未命名画布"}（${C.id}）`,disabled:t||!!C.team_id,onChange:P=>{const T=new Set(i);P.currentTarget.checked?T.add(C.id):T.delete(C.id),a(T)}})}),e.jsx("td",{children:C.name||"未命名画布"}),e.jsx("td",{className:"perm-id",children:C.id}),e.jsx("td",{children:e.jsx(Ve,{name:An(C,r),id:C.owner_id})}),e.jsx("td",{children:C.team_id?e.jsxs(e.Fragment,{children:["项目组：",C.team_name||C.team_id,e.jsx("span",{className:"team-space",children:"由成员关系授权，不可改为个人归属"})]}):"个人空间"})]},C.id)),!b.length&&e.jsx(vn,{columns:5,children:s?"暂无符合条件的画布，请尝试更换搜索词或当前所有者。":"正在加载画布…"})]})]})}),e.jsx("p",{className:"table-note",children:"搜索或切换当前所有者会清空选择。全选只选择当前筛选结果中的个人画布，项目组画布不可选；超过 1000 个时请缩小筛选范围。"})]})}function Hi(n){const r=Ii(n),{users:t,grants:s,projects:i,service:a}=r,[o,l]=d.useState(null),[p,c]=d.useState(""),[u,g]=d.useState(""),[x,m]=d.useState(""),_=d.useRef(null),y=r.loading||r.mutationBusy||!r.ready,N=y&&!o,w=f=>{r.setError(f),n.notify({message:f,tone:"error"})},h=f=>{!y&&!o&&l(f)},b=(f,v)=>{if((v==="password"||v==="profile")&&f.local_login_enabled===!1)return;const j=e.jsxs("p",{children:["目标账号：",e.jsx("b",{children:je(t,f.id)})]});if(v==="profile")return h({title:"编辑本地资料",children:e.jsxs(e.Fragment,{children:[j,e.jsx(Ri,{user:f})]}),submitLabel:"保存本地资料",action:te=>a.update(f.id,{display_name:ke(te,"display_name"),phone:ke(te,"phone")}),message:"本地资料已更新"});if(v==="password")return h({title:"重置密码",children:e.jsxs(e.Fragment,{children:[j,e.jsx(Zr,{}),e.jsx("p",{className:"notice-box danger",children:"该账号现有会话将失效，需要使用新密码重新登录。请妥善告知本人。"})]}),submitLabel:"确认重置密码",action:te=>a.resetPassword(f.id,ke(te,"password")),message:"密码已重置"});if(v==="role")return h({title:"修改账号角色",children:e.jsxs(e.Fragment,{children:[j,e.jsx(Xr,{initial:f.role}),e.jsx("p",{className:"notice-box danger",children:"管理员天然可访问全部画布。切换为监控展示员会清除组长权限，已有画布授权保留但不生效；其他角色的组长权限不变。修改角色会使该账号现有会话失效；最后一位启用管理员受系统保护。"})]}),submitLabel:"确认修改角色",action:te=>a.update(f.id,{role:Be.parse(ke(te,"role"))}),message:"账号角色已修改"});const S=v==="enabled",$=S?!f.enabled:!f.team_leader,Z=S?$?"启用账号":"停用账号":$?"授予组长权限":"取消组长权限",G=S?$?"启用不会跳过钉钉注册审批，审批状态保持不变。":"停用后该账号不能继续登录，现有会话失效。不会删除既有项目组关系或画布授权；最后一位启用管理员受系统保护。":$?"授予该用户创建项目组和管理自己创建项目组的权限，不会成为管理员，也不能管理其他人的项目组。现有会话失效后需重新登录。":"取消后不能继续创建项目组，现有会话失效。已授予的组内组长身份和成员关系保持不变，仍可管理对应项目组。";h({title:Z,children:e.jsxs(e.Fragment,{children:[j,e.jsx("p",{className:"notice-box",children:G})]}),submitLabel:"确认"+Z,action:()=>a.update(f.id,S?{enabled:$}:{team_leader:$}),message:Z+"成功"})},k=f=>{const v=f.scope==="all"?"所有画布（"+un+"）":je(t,f.owner_id);h({title:"确认撤销授权",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:[je(t,f.viewer_id)," → ",v]}),e.jsxs("p",{children:["权限：",Tn(f.permission)]}),e.jsx("p",{className:"notice-box danger",children:"撤销后即时重新校验权限，访问者失去这条授权带来的全部画布访问权。此授权不会使其成为管理员；管理员天然权限、项目组成员关系和其他独立授权不受影响。"})]}),submitLabel:"确认撤销授权",action:()=>a.revokeGrant(f),message:"已撤销画布授权"})},R=t.filter(f=>f.role!=="monitor"),D=R.some(f=>f.id===u)?u:"",C=x==="*"||t.some(f=>f.id===x)?x:"",P=[{id:"users",label:"账号总数",value:t.length,note:"角色与独立组长权限分别管理"},{id:"enabled",label:"启用账号",value:t.filter(f=>f.enabled).length,note:"停用不会删除账号或画布授权"},{id:"pending",label:"待审批注册",value:r.registrations?.requests.filter(f=>f.status==="pending").length??"—",note:"仅由钉钉指定审批人处理"},{id:"grants",label:"画布授权",value:s.length,note:"访问者 A → 所有者 / 授权范围"}],T=r.registrations?.outbox;return e.jsxs("main",{id:"main",tabIndex:-1,ref:_,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"账号与权限"}),e.jsx("div",{className:"page-caption",children:e.jsx("p",{className:"subtitle",children:"管理账号、画布访问与历史画布归属"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{id:"refresh-note",className:"refresh-note",role:"status",children:r.refreshNote}),e.jsx("button",{id:"refresh",type:"button",disabled:r.loading||r.mutationBusy||!!o,onClick:()=>{r.refreshPage()},children:"刷新数据"})]})]}),e.jsx("p",{id:"error",className:"page-status",role:"alert",children:r.error}),e.jsxs("section",{className:`card ${Te.priority}`,"aria-labelledby":"priority-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"priority-heading",children:"管理员项目组任务优先"}),e.jsx("p",{id:"priority-help",className:"section-subtitle",children:"默认关闭。开启后，组长为管理员的项目组内成员提交的排队任务，优先分配兼容的空闲机器，不抢占正在执行的任务。优先任务按提交顺序分配；开关、组成员和组长角色变化实时作用于已排队任务。"}),e.jsx("p",{role:"status",children:r.dispatchPriority===null?"正在读取设置…":r.dispatchPriority?"已开启":"已关闭"})]}),e.jsx("button",{type:"button",role:"switch","aria-checked":r.dispatchPriority===!0,"aria-labelledby":"priority-heading","aria-describedby":"priority-help",className:Te.switch,disabled:N||r.dispatchPriority===null,onClick:()=>{r.mutate(()=>a.setDispatchPriority(!r.dispatchPriority),"任务优先设置已保存").catch(f=>w(re(f)))},children:e.jsx("span",{className:Te.track,"aria-hidden":"true",children:e.jsx("span",{className:Te.thumb})})})]}),e.jsx("section",{className:"metrics","aria-label":"权限概览",children:P.map(f=>e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:f.label}),e.jsx("p",{id:"metric-"+f.id,className:"metric-value",children:f.id==="pending"||r.ready||t.length?f.value:"—"}),e.jsx("p",{className:"metric-note",children:f.note})]})},f.id))}),e.jsx("nav",{className:"section-nav","aria-label":"权限管理分区",children:[["accounts","账号管理"],["registrations","注册申请"],["grants","画布授权"],["history","历史画布分配"]].map(([f,v])=>e.jsx("a",{href:"#"+f+"-heading",onClick:()=>_.current?.querySelector("#"+f+"-heading")?.focus(),children:v},f))}),e.jsxs("section",{className:"card","aria-labelledby":"accounts-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"accounts-heading",tabIndex:-1,children:"账号管理"}),e.jsx("p",{className:"section-subtitle",children:"账号角色包括管理员、普通用户和监控展示员。监控展示员仅可查看监控，不能担任组长或访问画布。 启停仅影响抽卡访问；定海账号资料和密码请在定海维护。"})]}),e.jsx("button",{id:"create-user",type:"button",className:"primary",disabled:N,onClick:()=>h({title:"新建账号",children:e.jsx(Li,{}),submitLabel:"创建账号",action:f=>a.create({username:ke(f,"username").trim(),password:ke(f,"password"),role:Be.parse(ke(f,"role")),team_leader:new FormData(f).has("team_leader")}),message:"账号已创建"}),children:"新建账号"})]}),e.jsx(qi,{users:t,busy:N,ready:r.ready,action:b}),e.jsx("p",{className:"table-note",children:"启停、角色、组长权限及重置密码均需确认。初始密码至少 8 位，请勿使用常见弱密码；监控展示员的密码由管理员重置，其他账号登录后可自行修改。"})]}),e.jsxs("div",{className:"permissions-grid",children:[e.jsxs("section",{className:"card","aria-labelledby":"registrations-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"registrations-heading",tabIndex:-1,children:"注册申请"}),e.jsx("span",{className:"small muted",children:"仅查看钉钉审批结果"})]}),e.jsxs("div",{className:"f-pad form-grid",children:[e.jsx("p",{className:"notice-box",children:"自主注册由钉钉群内两位指定审批人在卡片上处理，任意一人先决生效。网页不提供通过或拒绝操作。"}),e.jsx("p",{id:"outbox-status",className:"f-status",role:"status",children:r.registrationError||(r.registrations?T&&T.pending>0?`审批通知积压 ${T.pending} 条（最早 ${T.oldest_at?Kr(T.oldest_at):"时间未知"}），系统会自动重试投递。`:"审批通知投递正常。":"")})]}),e.jsx(Ui,{data:r.registrations,error:r.registrationError})]}),e.jsxs("section",{className:"card","aria-labelledby":"grants-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"grants-heading",tabIndex:-1,children:"画布授权"}),e.jsx("span",{className:"small muted",children:"访问者 A → 所有者 / 授权范围"})]}),e.jsx("div",{className:"f-pad",children:e.jsx("p",{id:"grant-help",className:"notice-box",children:"选择指定所有者，A 可查看或操作其当前及以后创建的全部个人画布；选择“所有画布”则覆盖全部个人和项目组画布，包括现有及未来新增画布。可操作包含删除；授权不传递，也不会成为管理员。管理员天然可访问全部画布，停用账号不会因授权恢复登录权限。"})}),e.jsxs("form",{id:"grant",className:"grant-form","aria-describedby":"grant-help","aria-busy":r.mutationBusy,onSubmit:f=>{if(f.preventDefault(),!y){c("");try{const v=Mi(t,D,C,Qe.parse(ke(f.currentTarget,"permission"))),j=v.scope==="all"?"所有画布（"+un+"）":je(t,v.owner_id),S=v.scope==="all"?"覆盖"+un+"，不受所有者或项目组成员关系限制。":"覆盖所有者当前和以后创建的全部个人画布，不包含项目组画布。";h({title:"确认画布授权",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["访问者 A：",je(t,v.viewer_id)]}),e.jsxs("p",{children:["所有者 / 授权范围：",j]}),e.jsxs("p",{children:["权限：",e.jsx("b",{children:Tn(v.permission)})]}),e.jsxs("p",{className:"notice-box danger",children:[S,"可操作包含删除；授权不传递，也不会成为管理员。已有同范围授权将被更新，其他独立授权保留；保存后即时重新校验权限。停用账号不会因此恢复登录。"]})]}),submitLabel:"确认保存授权",action:()=>a.saveGrant(v),message:"画布授权已保存"})}catch(v){const j=re(v);c(j),n.notify({message:j,tone:"error"})}}},children:[e.jsxs("label",{className:"field",children:["访问者 A",e.jsxs("select",{name:"viewer_id",required:!0,disabled:N,value:D,onChange:f=>g(f.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择账号"}),R.map(f=>e.jsx("option",{value:f.id,children:je(t,f.id)},f.id))]})]}),e.jsxs("label",{className:"field",children:["所有者 / 授权范围",e.jsxs("select",{name:"owner_id",required:!0,disabled:N,value:C,onChange:f=>m(f.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择所有者 / 授权范围"}),e.jsx("option",{value:"*",children:"所有画布（含以后新增）"}),t.map(f=>e.jsx("option",{value:f.id,children:je(t,f.id)},f.id))]})]}),e.jsxs("label",{className:"field",children:["权限",e.jsxs("select",{name:"permission",disabled:N,children:[e.jsx("option",{value:"read",children:"只读"}),e.jsx("option",{value:"operate",children:"可操作（含删除）"})]})]}),e.jsx("button",{id:"grant-submit",className:"primary",disabled:N,children:"保存授权"}),e.jsx("p",{id:"grant-error",className:"danger small",role:"alert",children:p})]}),e.jsx(Wi,{grants:s,users:t,busy:N,ready:r.ready,revoke:k})]})]}),e.jsx(Vi,{projects:i,users:t,busy:N,ready:r.ready,selected:r.selected,setSelected:r.setSelected,status:r.assignStatus,onError:w,onConfirm:({target:f,chosen:v,payload:j})=>h({title:"确认分配 "+v.length+" 个画布",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["目标账号：",e.jsx("b",{children:je(t,f.id)})]}),e.jsx("p",{className:"notice-box danger",children:Jr}),e.jsx(Bi,{projects:v,users:t,target:f})]}),submitLabel:"确认分配所列画布",action:async()=>{const S=await a.assign(j);r.setSelected(new Set),r.setAssignStatus(`分配成功：已将 ${S} 个画布分配给 ${je(t,f.id)}。`)},message:"画布归属已分配"})})]}),o&&e.jsx(de,{title:o.title,submitLabel:o.submitLabel,onClose:()=>l(null),onSubmit:f=>r.mutate(()=>o.action(f),o.message,o.afterSuccess),children:o.children})]})}const En="/api/creation-agent/admin/skills",Gi=yn.omit({instruction:!0}),Ji=A({builtins:q(Gi),skills:q(yn)});function Ki(n){return{list:r=>n.read(En,Ji,{signal:r,cache:"no-store"}),async publish(r){A({ok:ce(!0)}).parse(await n.json(En,"POST",yn.parse(r)))},async revoke(r){A({ok:ce(!0)}).parse(await n.request(`${En}/${encodeURIComponent(Et.parse(r))}`,{method:"DELETE"}))}}}const Mn={id:"",name:"",description:"",instruction:""};function Yi({http:n,notify:r}){const t=d.useMemo(()=>Ki(n),[n]),[s,i]=d.useState(null),[a,o]=d.useState(Mn),[l,p]=d.useState(!1),[c,u]=d.useState(""),[g,x]=d.useState(!0);d.useEffect(()=>{const _=new AbortController;return t.list(_.signal).then(y=>{_.signal.aborted||(i(y),x(!1))},y=>{_.signal.aborted||(u(re(y)),x(!1))}),()=>_.abort()},[t]);async function m(_,y){if(!l){p(!0),u("");try{await _(),r({message:y,tone:"success"}),o(Mn);try{i(await t.list())}catch(N){u("发布状态刷新失败，请重新打开页面："+re(N))}}catch(N){const w=re(N);u(w),r({message:w,tone:"error"})}finally{p(!1)}}}return e.jsxs("section",{className:"card","aria-labelledby":"skills-heading",children:[e.jsx("div",{className:"section-heading",children:e.jsxs("div",{children:[e.jsx("h2",{id:"skills-heading",tabIndex:-1,children:"Skill 管理"}),e.jsx("p",{className:"section-subtitle",children:"仅发布文字创作指南。发布后供服务端创作助手读取；撤销后不可再选择或加载。内置 Skill 不可修改。"})]})}),e.jsxs("div",{className:"f-pad form-grid",children:[g&&e.jsx("p",{role:"status",children:"正在读取已发布 Skill…"}),c&&e.jsx("p",{role:"alert",className:"danger",children:c}),s&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["内置 Skill：",s.builtins.map(_=>_.name).join("、")]}),e.jsx("h3",{children:"已发布"}),!s.skills.length&&e.jsx("p",{children:"暂无已发布的自定义 Skill。"}),e.jsx("ul",{children:s.skills.map(_=>e.jsxs("li",{children:[e.jsx("strong",{children:_.name}),"（",_.id,"）— ",_.description," ",e.jsx("button",{type:"button",disabled:l,onClick:()=>o(_),children:"编辑"})," ",e.jsx("button",{type:"button",disabled:l,onClick:()=>{window.confirm(`确认撤销 ${_.name}？现有对话中也将无法再加载该 Skill。`)&&m(()=>t.revoke(_.id),"Skill 已撤销")},children:"撤销"})]},_.id))}),e.jsxs("form",{onSubmit:_=>{_.preventDefault();const y=yn.safeParse(a);if(!y.success){u("请填写有效 ID、名称、简介与指南（最多 32000 字）。");return}m(()=>t.publish(y.data),"Skill 已发布")},children:[e.jsx("h3",{children:s.skills.some(_=>_.id===a.id)?"更新 Skill":"发布 Skill"}),e.jsxs("label",{className:"field",children:["Skill ID（小写字母、数字、连字符）",e.jsx("input",{required:!0,pattern:"[a-z][a-z0-9-]{1,63}",maxLength:64,value:a.id,disabled:l||s.skills.some(_=>_.id===a.id),onChange:_=>o({...a,id:_.target.value})})]}),e.jsxs("label",{className:"field",children:["中文业务名称",e.jsx("input",{required:!0,maxLength:200,value:a.name,disabled:l,onChange:_=>o({...a,name:_.target.value})})]}),e.jsxs("label",{className:"field",children:["简介",e.jsx("textarea",{required:!0,maxLength:2e3,value:a.description,disabled:l,onChange:_=>o({...a,description:_.target.value})})]}),e.jsxs("label",{className:"field",children:["文字指南（不支持上传文件、代码执行或读取任意路径）",e.jsx("textarea",{required:!0,maxLength:32e3,rows:10,value:a.instruction,disabled:l,onChange:_=>o({...a,instruction:_.target.value})})]}),e.jsx("button",{type:"submit",className:"primary",disabled:l,children:"发布指南"})," ",e.jsx("button",{type:"button",disabled:l,onClick:()=>o(Mn),children:"清空表单"})]})]})]})]})}function Xi(n){return e.jsx("main",{id:"main",tabIndex:-1,children:e.jsxs("div",{className:"page",children:[e.jsx("header",{className:"card page-header",children:e.jsxs("div",{children:[e.jsx("h1",{children:"Skill 管理"}),e.jsx("p",{className:"subtitle",children:"发布和管理创作助手可读取的文字指南"})]})}),e.jsx(Yi,{...n})]})})}const Ee=10,Qr=2e3,Zi=15e3;function Qi(n){return n==="0"||n==="7"||n==="30"||n==="90"}const J=ve([U(),z(),Cr()]).optional().transform((n,r)=>{if(n==null||n==="")return n===void 0?void 0:null;const t=typeof n=="number"?n:Number(n);return Number.isFinite(t)?t:(r.addIssue({code:"custom",message:"费用数值必须为有限数字或未知值"}),Ct)}),xe=z().nullish(),eo=Q({tasks:J,done:J,error:J,canceled:J,retail_min:J,retail_max:J,retail_mid:J,retail_known_tasks:J,retail_unknown_tasks:J,total_cost:J,actual_cost:J,estimated_cost:J,running_accrued:J,gpu_hours:J,electricity_cost:J,api_cost:J,failed_waste:J,unknown_cost_tasks:J}),Pn=Q({key:xe,label:xe,tasks:J,retail_known_tasks:J,retail_unknown_tasks:J,retail_min:J,retail_max:J,retail_mid:J,total_cost:J}),no=Q({job_id:xe,created_at:J,status:xe,category_name:xe,category:xe,project_name:xe,card_name:xe,capability:xe,worker_name:xe,runtime_seconds:J,retail_source:xe,retail_basis:xe,retail_min:J,retail_max:J,cost_source:xe,recognized_cost:J}),ro=Q({overview:eo,jobs:q(no).transform(n=>n.slice(0,Qr)),currency:xe,pricing_version:ve([z(),U()]).nullish(),period:Q({from:J,to:J}).nullish(),by_category:q(Pn).nullish(),by_capability:q(Pn).nullish(),by_worker:q(Pn).nullish()});function to(n){const r=ro.safeParse(n);if(!r.success)throw new Error("费用接口返回的数据格式不完整");return r.data}function so(n,r=Date.now()){const t=new URLSearchParams({limit:String(Qr)});return n!=="0"&&t.set("from",String(r/1e3-Number(n)*86400)),`/api/costs?${t}`}function ao(n){return{async load(r,t){const s=await n.request(so(r),{cache:"no-store",signal:t});return to(s)}}}const io={data:null,selectedPeriod:"0",loadedPeriod:"0",page:0,busy:!0,error:null,updatedAt:null};function oo({http:n,notify:r}){const t=d.useMemo(()=>ao(n),[n]),[s,i]=d.useState(io),a=d.useRef("0"),o=d.useRef("0"),l=d.useRef(0),p=d.useRef(!1),c=d.useRef(!1),u=d.useRef(new Set),g=d.useRef(r);d.useEffect(()=>{g.current=r},[r]);const x=d.useCallback(async(h,b,k=!1)=>{if(p.current&&!k)return;const R=++l.current;p.current=!0;const D=new AbortController;u.current.add(D),i(C=>({...C,busy:!0}));try{const C=await t.load(h,D.signal);if(R!==l.current)return;o.current=h,c.current=!1,i(P=>({...P,data:C,loadedPeriod:h,error:null,updatedAt:Date.now(),page:b?0:Math.min(P.page,Math.max(0,Math.ceil(C.jobs.length/Ee)-1))}))}catch(C){if(R!==l.current)return;const P=`读取费用统计失败：${re(C)}`,T=!c.current;c.current=!0,i(f=>({...f,error:P})),T&&g.current({message:P,tone:"error"})}finally{u.current.delete(D),R===l.current&&(p.current=!1,i(C=>({...C,busy:!1})))}},[t]),m=d.useCallback(()=>{l.current+=1,p.current=!1,u.current.forEach(h=>h.abort()),u.current.clear()},[]);d.useEffect(()=>{x(a.current,!1);const h=window.setInterval(()=>{document.hidden||x(a.current,!1)},Zi);return()=>{window.clearInterval(h),m()}},[x,m]);const _=d.useCallback(h=>{a.current=h,i(b=>({...b,selectedPeriod:h})),x(h,!0,!0)},[x]),y=d.useCallback(()=>{x(a.current,!1)},[x]),N=d.useCallback(()=>{const h=a.current!==o.current;x(a.current,h,h)},[x]),w=d.useCallback(h=>{i(b=>({...b,page:Math.max(0,Math.min(b.page+h,Math.max(0,Math.ceil((b.data?.jobs.length??0)/Ee)-1)))}))},[]);return{...s,selectPeriod:_,refresh:y,retry:N,changePage:w}}const lo="_retail_1ychj_1",co="_commercial_1ychj_6",po={retail:lo,commercial:co};function ie(n){return typeof n=="number"&&Number.isFinite(n)?n:null}function be(n){return ie(n)==null?"未获取":String(n)}function qe(n,r){const t=ie(n);return t==null?"未知":`${!r||r==="CNY"?"¥":r+" "}${t.toFixed(4)}`}function gn(n,r,t){return ie(n)==null||ie(r)==null?"未知":n===r?qe(n,t):`${qe(n,t)} – ${qe(r,t)}`}function In(n){const r=ie(n);return r==null||!Number.isFinite(new Date(r*1e3).getTime())?"未记录":new Date(r*1e3).toLocaleString("zh-CN",{hour12:!1})}function uo(n){const r=ie(n);return r==null||r<0?"未记录":r<60?`${Math.round(r)}秒`:r<3600?`${Math.floor(r/60)}分${Math.floor(r%60)}秒`:`${Math.floor(r/3600)}小时${Math.floor(r%3600/60)}分`}function mo(n){return n==="0"?"全部记录":`最近${n}天`}function ho(n){return{unpriced:ie(n.retail_known_tasks)===0&&(ie(n.retail_unknown_tasks)??0)>0,allCostsUnknown:(ie(n.tasks)??0)>0&&ie(n.unknown_cost_tasks)===ie(n.tasks)&&ie(n.actual_cost)===0&&ie(n.estimated_cost)===0}}function xo(n,r){return ie(n.retail_known_tasks)==null?"未获取":n.retail_known_tasks?gn(n.retail_min,n.retail_max,r):"未定价"}const br={queued:"排队中",assigned:"已分配",running:"运行中",done:"已完成",error:"失败",canceled:"已取消",cancel_requested:"正在取消"},yr={actual:"实际",estimated:"历史估算",unknown:"未知"},jr={per_job:"按次",per_segment:"按段",segment_count:"按分段数",output_second_resolution:"按输出秒和分辨率"};function fo(n,r){const t=n.retail_source==="priced",s=n.retail_source==="not_billable",i=n.retail_source==="unpriced";return{status:(Object.hasOwn(br,n.status||"")?br[n.status||""]:n.status)||"未知",statusClass:["error","canceled"].includes(n.status||"")?"danger":["running","queued","assigned","cancel_requested"].includes(n.status||"")?"warn":"",basis:t?(Object.hasOwn(jr,n.retail_basis||"")?jr[n.retail_basis||""]:n.retail_basis)||"未记录":s?"未完成":i?"未定价":"未获取",basisClass:i?"warn":"muted",retail:t?gn(n.retail_min,n.retail_max,r):s?"不计费":i?"未定价":"未知",internal:n.cost_source==="unknown"||!n.cost_source?"未知":qe(n.recognized_cost,r),source:(Object.hasOwn(yr,n.cost_source||"")?yr[n.cost_source||""]:n.cost_source)||"来源未记录"}}function Ne({label:n,id:r,children:t,note:s,noteId:i,compact:a=!0,tone:o}){return e.jsx("article",{className:`card metric${o?` ${po[o]}`:""}`,children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:n}),e.jsx("p",{className:`metric-value${a?" compact":""}`,id:r,children:t}),e.jsx("p",{className:"metric-note",id:i,children:s})]})})}function go({data:n}){const r=n?.overview??{},{unpriced:t,allCostsUnknown:s}=ho(r),i=ie(r.retail_min),a=ie(r.retail_max),o=p=>qe(p,n?.currency),l=n?t?"未定价":ie(r.retail_min)!=null&&ie(r.retail_max)!=null&&r.retail_min!==r.retail_max?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"cost-amount",children:o(r.retail_min)})," – ",e.jsx("span",{className:"cost-amount",children:o(r.retail_max)})]}):gn(r.retail_min,r.retail_max,n.currency):"未获取";return e.jsxs("section",{className:"metrics f-metrics8","aria-label":"费用概览",children:[e.jsx(Ne,{tone:"retail",label:"建议收费区间",id:"retail-range",note:"按次 / 分段 / 输出秒和分辨率",children:l}),e.jsx(Ne,{tone:"retail",label:"建议收费中值",id:"retail-mid",noteId:"retail-coverage",note:n?`已定价 ${be(r.retail_known_tasks)} 项 / 未定价 ${be(r.retail_unknown_tasks)} 项`:"已定价 未获取 / 未定价 未获取",children:n?t?"未定价":o(r.retail_mid):"未获取"}),e.jsx(Ne,{tone:"commercial",label:"商用模型等效费用（估算）",id:"internal-total",noteId:"internal-split",note:"按建议收费区间的 5 倍测算 · 非实际支出",children:n?t?"未定价":gn(i==null?null:i*5,a==null?null:a*5,n.currency):"未获取"}),e.jsx(Ne,{label:"内部实际成本",id:"actual",noteId:"running",note:n?`运行中累计 ${o(r.running_accrued)}`:"运行中累计 未获取",children:n?s?"未知":o(r.actual_cost):"未获取"}),e.jsx(Ne,{label:"GPU 用量",id:"gpu-hours",noteId:"electricity",note:n?`其中电费 ${o(r.electricity_cost)}`:"其中电费 未获取",children:ie(r.gpu_hours)==null?"未获取":`${r.gpu_hours?.toFixed(2)} 小时`}),e.jsx(Ne,{label:"API 成本",id:"api-cost",note:"按输入 / 输出 token",children:n?o(r.api_cost):"未获取"}),e.jsx(Ne,{label:"失败与取消损耗",id:"waste",noteId:"unknown",note:`已包含于总成本；未知 ${be(r.unknown_cost_tasks)} 项`,children:n?o(r.failed_waste):"未获取"}),e.jsx(Ne,{label:"任务数量",id:"tasks",compact:!1,noteId:"statuses",note:`完成 ${be(r.done)} / 失败 ${be(r.error)} / 取消 ${be(r.canceled)}`,children:be(r.tasks)})]})}const Re=[{key:"category",label:"按类型"},{key:"capability",label:"按能力"},{key:"worker",label:"按执行端"}];function bo({data:n,failed:r}){const[t,s]=d.useState("category"),i=d.useRef({}),o=n?.[`by_${t}`]?.slice(0,10),l=Math.max(0,...(o??[]).map(c=>ie(c.retail_mid)??0));function p(c,u){let g;switch(c.key){case"ArrowRight":case"ArrowDown":g=(u+1)%Re.length;break;case"ArrowLeft":case"ArrowUp":g=(u+Re.length-1)%Re.length;break;case"Home":g=0;break;case"End":g=Re.length-1;break;default:return}c.preventDefault();const x=Re[g];x&&(s(x.key),i.current[x.key]?.focus())}return e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"费用构成"}),e.jsx("p",{className:"section-subtitle",children:"按建议收费中值排序 / 每个视角前10项；条形为相对最大项，不是内部成本占比"})]}),e.jsx("span",{className:"muted small",id:"pricing",children:n?`计价版本 ${n.pricing_version??"未获取"} / 币种 ${n.currency??"未获取"}`:"等待计价信息"})]}),e.jsx("div",{className:"tabs f-pad-tabs",role:"tablist","aria-label":"费用构成视角",children:Re.map((c,u)=>e.jsx("button",{type:"button",role:"tab",id:`cost-tab-${c.key}`,"aria-controls":"cost-panel","aria-selected":t===c.key,tabIndex:t===c.key?0:-1,"data-cost-tab":c.key,ref:g=>{g?i.current[c.key]=g:delete i.current[c.key]},onClick:()=>s(c.key),onKeyDown:g=>p(g,u),children:c.label},c.key))}),e.jsx("div",{className:"f-cost-chart f-pad",id:"cost-panel",role:"tabpanel","aria-labelledby":`cost-tab-${t}`,tabIndex:0,children:n?o?o.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"这个周期内还没有费用构成"}),e.jsx("p",{children:"调整统计周期，或等待任务产生费用记录。"})]}):o.map((c,u)=>{const g=ie(c.retail_mid),x=g!=null&&l>0?Math.max(0,Math.min(100,g/l*100)):null;return e.jsxs("div",{className:"f-rank",children:[e.jsxs("div",{children:[e.jsx("b",{title:c.key??void 0,children:c.label||c.key||"未记录"}),e.jsx("strong",{children:xo(c,n.currency)})]}),e.jsxs("p",{className:"muted small",children:[be(c.tasks)," 项 · 已定价 ",be(c.retail_known_tasks)," · 未定价"," ",be(c.retail_unknown_tasks)," · 已知内部成本"," ",qe(c.total_cost,n.currency)]}),x!=null&&e.jsx("div",{className:"f-track",role:"meter","aria-label":`${c.label||c.key||""} 建议收费中值相对最大项`,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":x,children:e.jsx("i",{style:{width:`${x}%`}})})]},`${c.key??""}-${u}`)}):e.jsx("p",{className:"muted",children:"构成数据未获取，不以零元替代。"}):e.jsx("p",{className:"muted",children:r?"费用构成读取失败，请点击“重试读取”。":"正在读取费用构成…"})})]})}function dn({children:n}){return e.jsx("span",{className:"cell-secondary",children:n})}function yo({data:n,page:r,loadedPeriod:t,failed:s,changePage:i,openBasis:a}){const o=n?.jobs??[],l=Math.max(0,Math.ceil(o.length/Ee)-1),p=o.slice(r*Ee,(r+1)*Ee),c=ie(n?.overview.tasks);return e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"费用明细"}),e.jsx("p",{className:"section-subtitle",id:"detail-note",children:n?`服务端合计 ${be(n.overview.tasks)} 条 / 明细已载入 ${o.length} 条${c!=null&&c>o.length?"（接口最多2000条，非完整明细）":""}；汇总不以当前显示页相加替代`:s?"明细未获取，不以空记录或零元代替。":"正在读取；汇总不以当前明细页相加替代"})]}),e.jsx("button",{type:"button",className:"link-button",id:"cost-basis",onClick:a,children:"计价与成本口径"})]}),e.jsx("p",{className:"table-note",id:"period-note",children:n?`当前展示：${mo(t)} · ${ie(n.period?.from)===0?"全部历史":In(n.period?.from)} — ${In(n.period?.to)}（按任务创建时间）`:"统计周期正在读取"}),e.jsx("div",{className:"table-wrap",children:e.jsxs("table",{className:"cost-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["时间","状态 / 类型","项目 / 卡片","能力","执行端","耗时","收费依据","建议收费","内部成本 / 来源"].map(u=>e.jsx("th",{scope:"col",children:u},u))})}),e.jsx("tbody",{id:"job-rows",children:n?p.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:9,children:e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"这个周期内还没有费用记录"}),e.jsx("p",{children:"更换统计周期，或等待任务产生费用记录。"})]})})}):p.map((u,g)=>{const x=fo(u,n.currency);return e.jsxs("tr",{children:[e.jsxs("td",{children:[In(u.created_at),e.jsx(dn,{children:u.job_id||"任务ID未记录"})]}),e.jsxs("td",{className:x.statusClass,children:[x.status,e.jsx(dn,{children:u.category_name||u.category||"类型未记录"})]}),e.jsxs("td",{className:"origin",children:[u.project_name||"未归属项目",e.jsx(dn,{children:u.card_name||"未记录卡片"})]}),e.jsx("td",{children:u.capability||"未记录"}),e.jsx("td",{children:u.worker_name||"未分配执行端"}),e.jsx("td",{children:uo(u.runtime_seconds)}),e.jsx("td",{className:x.basisClass,children:x.basis}),e.jsx("td",{children:x.retail}),e.jsxs("td",{children:[x.internal,e.jsx(dn,{children:x.source})]})]},`${u.job_id??""}-${g}`)}):e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"loading-note",children:s?"费用明细读取失败，请点击“重试读取”。":"正在读取费用明细…"})})})]})}),e.jsxs("div",{className:"f-pager",children:[e.jsx("span",{id:"page-note",children:n?`显示 ${o.length?r*Ee+1:0}–${Math.min((r+1)*Ee,o.length)} / 已载入 ${o.length} 条`:"尚未载入"}),e.jsx("button",{type:"button",id:"cost-prev",disabled:!n||r===0,onClick:()=>i(-1),children:"上一页"}),e.jsx("button",{type:"button",id:"cost-next",disabled:!n||r>=l,onClick:()=>i(1),children:"下一页"})]})]})}function jo({onClose:n}){return e.jsx(de,{title:"计价与成本口径",onClose:n,children:e.jsxs("div",{className:"f-stack",children:[e.jsx("p",{children:"建议收费区间与中值来自计价规则，不是已收款或实际收入。"}),e.jsx("p",{children:"收费依据支持按次、按段、分段数、输出秒和分辨率；未定价不等于免费。未完成任务不计建议收费，但可能产生内部损耗。"}),e.jsx("p",{children:"内部总成本 = 已知实际 + 已知历史估算；未知成本单列，不按零元处理。失败与取消损耗已包含于总成本，不重复相加。运行中累计成本尚可能变化。"}),e.jsx("p",{children:"统计周期以任务创建时间为准，按服务端全量聚合。费用明细最多读取2000条，每页10条；不能把当前显示明细当完整总额，也不从明细重算概览或费用构成。"}),e.jsx("p",{children:"GPU用量、电费、API token成本、实际与历史估算均沿用服务端口径；未记录的字段显示未知，不由前端推测单价或补算。"})]})})}function vo(n){const r=oo(n),[t,s]=d.useState(!1),i=r.busy?"正在读取…":r.error?"连接失败 · 快照非实时":r.updatedAt!=null?`最后刷新 ${new Date(r.updatedAt).toLocaleTimeString("zh-CN",{hour12:!1})} · 每15秒刷新`:"正在加载 · 每15秒刷新";return e.jsxs("main",{id:"main",tabIndex:-1,"aria-busy":r.busy?!0:void 0,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"费用统计"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{className:"subtitle",children:"建议收费不是实际收入，未知成本不作零元"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsxs("label",{className:"filter-label",children:["统计周期",e.jsxs("select",{id:"period",value:r.selectedPeriod,onChange:a=>{const o=a.currentTarget.value;Qi(o)&&r.selectPeriod(o)},children:[e.jsx("option",{value:"0",children:"全部记录"}),e.jsx("option",{value:"7",children:"最近7天"}),e.jsx("option",{value:"30",children:"最近30天"}),e.jsx("option",{value:"90",children:"最近90天"})]})]}),e.jsx("span",{className:"muted small",id:"refresh-state",role:"status",children:i}),e.jsxs("button",{type:"button",className:"primary",id:"refresh",disabled:r.busy,onClick:r.refresh,children:[e.jsx(Ze,{name:"refresh"}),"立即刷新"]})]})]}),e.jsxs("div",{id:"error",className:"f-error",role:"alert",hidden:!r.error,children:[e.jsxs("div",{children:[e.jsx("b",{id:"error-message",children:r.error}),e.jsx("p",{children:"下方保留上次成功读取的周期与快照，不代表当前筛选的新数据；未知值不作零元。"})]}),e.jsx("button",{type:"button",id:"retry",onClick:r.retry,children:"重试读取"})]}),e.jsx(go,{data:r.data}),e.jsx(bo,{data:r.data,failed:r.error!=null}),e.jsx(yo,{data:r.data,page:r.page,loadedPeriod:r.loadedPeriod,failed:r.error!=null,changePage:r.changePage,openBasis:()=>s(!0)}),e.jsxs("section",{className:"card padded notice-box","aria-labelledby":"cost-rules-title",children:[e.jsx("h2",{id:"cost-rules-title",children:"计价与成本口径"}),e.jsx("p",{children:"建议收费区间与中值来自规则，不是已收款或实际收入；未定价不等于免费。未完成任务不计建议收费，但可能产生内部损耗。"}),e.jsx("p",{children:"内部总成本 = 已知实际 + 已知历史估算；未知成本单列，不按零元处理。失败与取消损耗已包含于总成本，不重复相加；运行中累计仍可能变化。"}),e.jsx("p",{children:"统计周期按任务创建时间筛选，合计与构成取服务端全量聚合。明细最多读取2000条并分页展示，当前明细页不代表全部成本。"})]})]}),t&&e.jsx(jo,{onClose:()=>s(!1)})]})}const F=U().finite().nullable().optional(),ne=z().nullable().optional(),Xe=bn(z(),ee),et=A({gpus:q(A({name:ne,memory_total_bytes:F}).catchall(ee)).optional(),cpu:ee.optional(),os:ee.optional(),memory_total_bytes:F,host_id:ne,environment_id:ne,model_version:ne,disk:ne,note:ne}).catchall(ee),vr=A({name:ne,role:ne,precision:ee.optional(),precision_source:ne,loader_dtype:ee.optional()}).catchall(ee),Dn=A({source:ne,complete:Y().optional(),capability_name:ne,models:q(vr).optional(),auxiliary_models:q(vr).optional()}).catchall(ee),_o=A({source:z(),summary:Dn,samples:F,measured:F}).catchall(ee),wo=A({key:ne,id:ne,kind:ne,width:ee.optional(),height:ee.optional(),duration:F,valid:Y().nullable().optional(),outputs:ee.optional(),samples:ee.optional()}).catchall(ee),ko=A({total_samples:F,recorded_samples:F,complete_samples:F,total_outputs:F,recorded_outputs:F,variants:q(ee).optional()}).catchall(ee),No=A({dimensions:Xe.nullable().optional(),parameters:Xe.nullable().optional(),expected:Xe.nullable().optional(),model_version:ne}).catchall(ee),nt={capability:z(),capability_name:ne,worker_id:ne,worker_name:ne,source:z(),dimensions:Xe.nullable().optional(),spec:No.nullable().optional(),output_resolution:ko.nullable().optional(),recovered_outputs:ee.optional(),runtime_seconds:F,occupied_seconds:F,warnings:q(z()).optional()},So=A({...nt,id:z(),spec_key:ne,config_id:ne,config:et.nullable().optional(),config_source:ne,cache_condition:ee.optional(),samples:F,done:F,error:F,canceled:F,measured:F,mean_seconds:F,p50_seconds:F,p90_seconds:F,last_sample_at:F,reference_per_hour:F,output_count:F,unit:ne,seconds_per_unit:F,qualified_seconds_per_unit:F,eligible:Y().nullable().optional(),reviewed:F,accepted:F,benchmark_id:ne,days:ve([q(z()),U(),Cr()]).optional(),model_summary:Dn.nullable().optional(),model_evidence:A({total_samples:F,recorded_samples:F,variants:q(_o).optional()}).catchall(ee).nullable().optional(),current_model_reference:Dn.nullable().optional()}).catchall(ee),$o=A({id:z(),name:ne,state:z(),last_seen:F,hardware:et.nullable().optional(),hardware_source:ne,agent_version:F,supports_capacity_telemetry:Y().optional(),tasks:F,done:F,error:F,canceled:F,runtime_seconds:F}).catchall(ee),rt=A({...nt,job_id:z(),group_id:ne,status:z(),created_at:F,attempts:ee.optional(),outputs:q(wo).nullable().optional(),review:A({accepted:F,source:ne,benchmark_id:ne,note:ne}).catchall(ee).nullable().optional()}).catchall(ee),Co=A({period:Xe.optional(),overview:bn(z(),U().finite().nullable()).default({}),workers:q($o).default([]),groups:q(So).default([]),details:q(rt).default([]),details_total:U().int().nonnegative()}).catchall(ee),zo=A({details:q(rt),details_total:U().int().nonnegative()}),tt=A({to:U().int(),mode:ce("historical"),quality:ce("technical"),availability:ce(1),utilization:ce(.75),worker_id:z().min(1),hours:U().finite().min(.1).max(24),price:U().finite().nonnegative().optional(),demands:q(A({group_id:z().min(1),quantity:U().finite().positive()})).min(1)}),Eo=A({machines:F,total_seconds:F,daily_capacity_seconds:F,price_total:F,lines:q(A({group_id:z(),quantity:F,seconds_per_unit:F,daily_units:F}).catchall(ee)).default([]),warnings:q(z()).default([]),assumptions:ee.optional()}).catchall(ee),st=A({host_id:z().max(160).optional(),cpu:z().max(160).optional(),memory_total_bytes:U().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),environment_id:z().max(160).optional(),model_version:z().max(160).optional(),disk:z().max(160).optional(),note:z().max(500).optional()}).strict(),at=A({accepted:U().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),source:Me(["business","standard"]),benchmark_id:z().max(100),note:z().max(500)}),Mo=A({processed:U().int().min(0).max(4),recorded:U().int().nonnegative(),total:U().int().nonnegative(),next_offset:U().int().nonnegative().nullable()}).refine(n=>n.recorded<=n.processed,"补采响应格式无效"),_r=bn(z(),$r());class Po{constructor(r){this.http=r}http;path(r,t){return`/api/capacity?${new URLSearchParams({to:String(r.to),limit:"100",offset:String(t)})}`}report(r,t){return this.http.read(this.path(r,t),Co,{cache:"no-store"})}evidence(r,t){return this.http.read(this.path(r,t),zo,{cache:"no-store"})}async estimate(r){return Eo.parse(await this.http.json("/api/capacity/estimate","POST",tt.parse(r)))}async profile(r,t){_r.parse(await this.http.json(`/api/capacity/workers/${encodeURIComponent(r)}`,"POST",st.parse(t)))}async review(r,t){_r.parse(await this.http.json(`/api/capacity/jobs/${encodeURIComponent(r)}/review`,"POST",at.parse(t)))}async probe(r,t,s){const i=await this.http.json(`/api/capacity/jobs/${encodeURIComponent(r)}/probe-outputs`,"POST",{offset:U().int().nonnegative().parse(t)});s();const a=Mo.safeParse(i);if(!a.success||a.data.next_offset!==null&&(a.data.next_offset<=t||a.data.next_offset>=a.data.total))throw Error("补采响应格式无效，请刷新看板核对结果");return a.data}}const Ke=n=>!!(n.group||n.status||n.source||n.size!==100);class Io{cache=null;pending=null;clear(){this.cache=null,this.pending=null}async all(r,t,s,i){if(!s())return null;if(this.cache?.snapshot===r)return this.cache.records;if(this.pending?.snapshot===r)return this.pending.promise;const a={snapshot:r,promise:Promise.resolve(null)};a.promise=(async()=>{const o=r.report.details_total,l=[];if(!Number.isSafeInteger(o)||o<0)throw Error("明细总数无效，请刷新后重试。");for(let p=0;p<o;p+=100){if(!s())return null;const c=p===r.offset?r.report:await t.evidence(r.range,p);if(!s())return null;if(c.details_total!==o||c.details.length!==Math.min(100,o-p))throw Error("任务证据在读取期间变化或分页不完整，请刷新后重新筛选。");l.push(...c.details),i(l.length,o)}if(new Set(l.map(p=>p.job_id)).size!==l.length)throw Error("任务证据分页出现重复，请刷新后重试。");return s()?(this.cache={snapshot:r,records:l},l):null})(),this.pending=a;try{return await a.promise}finally{this.pending===a&&(this.pending=null)}}}class Ro{constructor(r,t){this.service=r,this.notify=t}service;notify;listeners=new Set;loadVersion=0;estimateVersion=0;evidenceVersion=0;appliedRange=null;appliedOffset=0;alive=!0;repository=new Io;mutations=new Set;value={report:null,snapshot:null,ready:!1,revision:0,refreshState:"正在读取全部历史聚合与本页证据…",error:"",writeStatus:"",tab:"machines",technicalOpen:!1,evidenceOpen:!1,mounted:new Set,filters:{group:"",status:"",source:"",size:100},evidence:{records:[],total:0,start:0,size:100,state:"",busy:!1,failed:!1},estimate:null,estimateNote:"填写每日需求后计算。没有样本的场景不能按零耗时处理。",estimateError:"",estimating:!1};getSnapshot=()=>this.value;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});set(r){this.alive&&(this.value={...this.value,...r},this.listeners.forEach(t=>t()))}start(){this.alive=!0,this.load()}dispose(){this.alive=!1,this.loadVersion++,this.estimateVersion++,this.evidenceVersion++,this.repository.clear()}invalidateEstimate=(r="输入或证据已变更，请重新计算。")=>{this.estimateVersion++,this.set({estimate:null,estimateNote:r,estimateError:"",estimating:!1})};resetSnapshot(){this.repository.clear(),this.evidenceVersion++,this.set({snapshot:null,ready:!1})}clear(){this.resetSnapshot(),this.set({report:null,mounted:new Set,evidence:{records:[],total:0,start:0,size:100,state:"",busy:!1,failed:!1}})}activeMounts(){const r=new Set([this.value.tab]);return this.value.tab==="machines"&&this.value.technicalOpen&&r.add("technical"),this.value.evidenceOpen&&r.add("evidence"),r}async load(r=!0,t){const s=r?{to:Math.floor(Date.now()/1e3)}:this.appliedRange;if(!s)return;const i=++this.loadVersion,a=Object.freeze({...s}),o=r?0:t??this.appliedOffset;this.resetSnapshot(),this.invalidateEstimate("证据正在刷新，旧测算已清除。"),this.set({error:"",refreshState:"正在读取全部历史聚合与本页证据…",evidence:{...this.value.evidence,state:""}});try{const l=await this.service.report(a,o);if(!this.alive||i!==this.loadVersion)return;const p=Object.freeze({report:l,range:a,version:i,offset:o});this.appliedRange=a,this.appliedOffset=o;const c={...this.value.filters};if(l.groups.some(u=>u.id===c.group)||(c.group=""),this.set({report:l,snapshot:p,ready:!0,revision:this.value.revision+1,mounted:this.activeMounts(),filters:c,evidence:{records:l.details,total:l.details_total,start:o,size:100,state:"",busy:!1,failed:!1}}),this.value.evidenceOpen&&Ke(c)&&await this.filterEvidence(0),!this.alive||i!==this.loadVersion)return;this.set({refreshState:`最后刷新：${new Date().toLocaleTimeString("zh-CN",{hour12:!1})}`})}catch(l){if(!this.alive||i!==this.loadVersion)return;this.clear();const p=`读取产能数据失败：${re(l)}。请点击立即刷新重试。`;this.set({error:p,refreshState:"读取失败"}),this.notify(p)}}activate(r){this.set({tab:r}),this.mount()}technical(r){this.set({technicalOpen:r}),this.mount()}evidenceOpen(r){this.set({evidenceOpen:r}),this.mount()}mount(){if(!this.value.ready)return;const r=this.value.mounted.has("evidence"),t=new Set([...this.value.mounted,...this.activeMounts()]);this.set({mounted:t}),!r&&t.has("evidence")&&Ke(this.value.filters)&&this.filterEvidence(0)}showEvidence(r=""){!this.value.ready||!this.value.snapshot||(this.set({evidenceOpen:!0,filters:{...this.value.filters,group:r,status:"",source:""},mounted:new Set([...this.value.mounted,"evidence"])}),this.filterEvidence(0))}filter(r){this.value.ready&&(this.set({filters:{...this.value.filters,...r}}),this.filterEvidence(0))}current(r){return this.alive&&this.value.ready&&this.value.snapshot===r&&r.version===this.loadVersion&&this.value.report===r.report}async filterEvidence(r){const t=this.value.snapshot;if(!t||!this.current(t)||!this.value.mounted.has("evidence"))return;const s=++this.evidenceVersion,i=this.value.filters;if(!Ke(i)){if(t.offset!==0){await this.load(!1,0);return}this.set({evidence:{records:t.report.details,total:t.report.details_total,start:0,size:100,state:"",busy:!1,failed:!1}});return}this.set({evidence:{records:[],total:0,start:0,size:i.size,state:"正在读取同一截止时间下的真实分页证据，完成后筛选；不会按当前页冒充全部任务。",busy:!0,failed:!1}});try{const a=await this.repository.all(t,this.service,()=>this.current(t),(p,c)=>{this.current(t)&&Ke(this.value.filters)&&this.set({evidence:{...this.value.evidence,state:`正在读取真实分页证据 ${p} / ${c} 条；聚合统计保持不变。`}})});if(!a||!this.current(t)||s!==this.evidenceVersion)return;const o=a.filter(p=>(!i.group||p.group_id===i.group)&&(!i.status||p.status===i.status)&&(!i.source||p.source===i.source)),l=Math.min(r,Math.max(0,Math.ceil(o.length/i.size)-1)*i.size);this.set({evidence:{records:o.slice(l,l+i.size),total:o.length,start:l,size:i.size,state:`筛选 ${o.length} / 全集 ${a.length} 条；只改变明细，聚合统计不受筛选或分页影响。`,busy:!1,failed:!1}})}catch(a){if(!this.current(t)||s!==this.evidenceVersion)return;this.set({evidence:{records:[],total:0,start:0,size:i.size,state:`证据筛选失败：${re(a)}。请立即刷新后重试。`,busy:!1,failed:!0}})}}page(r){const{ready:t,evidence:s,mounted:i,snapshot:a,filters:o}=this.value;if(!t||!a||!i.has("evidence")||s.busy||s.failed)return;const l=Math.max(0,s.start+r*s.size);r>0&&l>=s.total||(Ke(o)?this.filterEvidence(l):this.load(!1,l))}async estimate(r){if(this.invalidateEstimate("正在计算…"),!this.value.ready||!this.value.snapshot){this.estimateFailure("请先点击立即刷新并成功读取证据。");return}const t=this.estimateVersion,s=this.value.snapshot,i=this.value.revision;this.set({estimating:!0});try{const a=await this.service.estimate(r);if(t!==this.estimateVersion||i!==this.value.revision||!this.current(s))return;const l={...s.report.workers.find(c=>c.id===r.worker_id)?.hardware};delete l.note;const p={result:a,payload:r,groups:s.report.groups.filter(c=>r.demands.some(u=>u.group_id===c.id)),hardware:l};this.set({estimate:p,estimating:!1})}catch(a){t===this.estimateVersion&&this.estimateFailure(`测算失败：${re(a)}`)}}estimateFailure(r){this.set({estimate:null,estimating:!1,estimateNote:"本次未产生测算结果，请检查证据与输入后重试。",estimateError:r}),this.notify(r)}async mutate(r,t,s){if(this.mutations.has(r))throw Error("正在保存，请勿重复提交。");this.mutations.add(r);const i=this.loadVersion;this.set({writeStatus:""}),this.invalidateEstimate(`${t}正在保存，旧测算已清除。`);try{if(await s(),!this.alive)return;i===this.loadVersion?await this.load(!1):(this.loadVersion++,this.clear(),this.invalidateEstimate("证据已更新，请点击立即刷新后重新计算。"),this.set({refreshState:`${t}已更新，请点击立即刷新`})),this.set({writeStatus:`${t}已保存。人工声明不回写历史快照，也不代表自动验证通过。`})}finally{this.mutations.delete(r)}}saveProfile(r,t){return this.mutate(`profile:${r}`,"机器配置",()=>this.service.profile(r,t))}saveReview(r,t){return this.mutate(`review:${r}`,"人工标记",()=>this.service.review(r,t))}probe(r,t){return this.service.probe(r,t,this.probeWritten)}probeVersion(){return this.loadVersion}probeCurrent(r){return this.alive&&r===this.loadVersion&&this.value.report!==null}probeWritten=()=>{this.resetSnapshot(),this.invalidateEstimate("成品尺寸证据已更新，请刷新看板后重新计算。")}}function Lo({http:n,notify:r}){const t=d.useMemo(()=>new Ro(new Po(n),i=>r({message:i,tone:"error"})),[n,r]),s=d.useSyncExternalStore(t.subscribe,t.getSnapshot);return d.useEffect(()=>(t.start(),()=>t.dispose()),[t]),{controller:t,state:s}}const Ao={historical:"历史运行参考",captured:"采集业务样本",standard:"标准样本（人工标签）"},Xn={idle:"在线空闲",online:"在线",busy:"运行中",running:"运行中",offline:"离线",disabled:"已禁用",syncing:"同步中",unavailable:"执行环境不可用",historical:"历史执行端",error:"异常",done:"已完成",canceled:"已取消",queued:"排队中",assigned:"已分配"},B=n=>typeof n=="number"&&Number.isFinite(n),L=n=>n==null||n===""?"未知":typeof n=="object"?JSON.stringify(n):String(n),E=n=>B(n)?n.toLocaleString("zh-CN",{maximumFractionDigits:2}):"未知",le=n=>B(n)?`${E(n)} 秒`:"未知",Ge=n=>B(n)?new Date(n*1e3).toLocaleString("zh-CN",{hour12:!1}):"未知",He=n=>B(n)?`${E(n/1024**3)} GiB`:"未知",ye=n=>Ao[n]||`来源未知（${L(n)}）`,Zn=n=>Array.isArray(n.days)?n.days.length:n.days,Ue=n=>n.capability_name?.trim()?n.capability_name:L(n.capability),it=n=>Ue(n)===n.capability?Ue(n):`${Ue(n)}（${n.capability}）`,_n=n=>typeof n=="string"&&{reported:"机器上报",manual:"人工声明","manual+reported":"机器上报 + 人工声明",unknown:"未知"}[n]||"未知";function Qn(n){return n&&typeof n=="object"&&!Array.isArray(n)?n:{}}function nn(n,r){if(!n||typeof n!="object")return L(n);const t=Qn(n);return(r==="cpu"?[t.model,t.architecture,B(t.logical_cores)?`${E(t.logical_cores)} 逻辑核`:null]:[t.name,t.release,t.version]).filter(i=>i!=null&&i!=="").map(L).join(" / ")||"未知"}function rn(n){return n?`GPU ${n.gpus?.length?n.gpus.map(t=>`${L(t.name)} / 单卡 ${He(t.memory_total_bytes)}`).join("；"):"未知"}；CPU ${nn(n.cpu,"cpu")}；内存 ${He(n.memory_total_bytes)}；系统 ${nn(n.os,"os")}；环境 ${L(n.environment_id)}；模型版本 ${L(n.model_version)}；磁盘 ${L(n.disk)}；主机 ID ${L(n.host_id)}`:"未知"}function To(n){const r=n.hardware,t=(r?.gpus||[]).map(s=>[s.name,B(s.memory_total_bytes)?He(s.memory_total_bytes):null].filter(Boolean).join(" / ")).filter(Boolean);return B(r?.memory_total_bytes)&&t.push(`系统内存 ${He(r.memory_total_bytes)}`),t.join("；")||"尚未采集硬件信息"}function Do(n){const r=n.hardware;return!r?.cpu||!r.host_id?B(n.agent_version)&&n.agent_version<4||n.supports_capacity_telemetry===!1?"旧版采集程序缺少 CPU 等信息，请升级该 Worker 后补采；已有 GPU 与内存记录仍可查看。":"CPU 或主机信息尚未采集，请检查该 Worker 的采集上报。":!r.environment_id||!r.model_version?"环境或模型版本的人工声明未填写，可在“详细统计与机器配置”中补录。":"当前配置不代表历史任务的执行配置；历史依据见各业务详情。"}const we=n=>["idle","busy","online","running"].includes(n.state),mn=n=>B(n.mean_seconds)&&n.mean_seconds>=0&&B(n.measured)&&n.measured>0;function Oo(n){if(!B(n)||n<0)return"暂无成功耗时";if(n<1)return`${E(n)} 秒`;const r=Math.round(n),t=Math.floor(r/60),s=r%60;return t?`${E(t)} 分 ${s} 秒`:`${s} 秒`}function wn(n){const r={...n.spec?.dimensions,...n.dimensions},t=[["图片",r.image_count,"张"],["视频",r.video_count,"段"],["音频",r.audio_count,"段"]],s=i=>B(i)&&Number.isSafeInteger(i)&&i>=0;return t.every(([,i])=>!s(i))?["素材信息未记录"]:t.every(([,i])=>i===0)?["未使用图片、视频或音频"]:t.flatMap(([i,a,o])=>s(a)?a>0?[`${i} ${E(a)} ${o}`]:[]:[`${i}数量未记录`])}function ot(n,r){const t=a=>B(a)&&Number.isSafeInteger(a)&&a>0,s=typeof n.resolution=="string"?n.resolution.match(/^(\d+)\s*[x×]\s*(\d+)(?:\s*\(\d+:\d+\))?$/i):null,i=[[n.output_width,n.output_height],[n.width,n.height],[s?Number(s[1]):null,s?Number(s[2]):null],[r.width,r.height,"期望 "]];for(const[a,o,l=""]of i)if(t(a)&&t(o)){const c={"640x360":"360p","640x480":"480p","854x480":"480p","1280x720":"720p","1920x1080":"1080p","2560x1440":"1440p","3840x2160":"4K"}[`${Math.max(a,o)}x${Math.min(a,o)}`];return c?`${l}${c}${a<o?" 竖屏":""}（${E(a)} × ${E(o)}）`:`${l||"尺寸 "}${E(a)} × ${E(o)}`}return B(n.megapixels)&&n.megapixels>0&&B(n.megapixels*100)?`约 ${E(n.megapixels*100)} 万像素（尺寸未记录）`:null}function kn(n,r=!1){const t={...n.spec?.parameters,...n.spec?.dimensions,...n.dimensions},s=n.spec?.expected||{},i=[],a=t.output_duration??t.duration??s.duration;B(a)&&i.push(`请求时长 ${E(a)} 秒`);const o=ot(t,s);if(o&&i.push(o),r){B(t.megapixels)&&t.megapixels>0&&i.push(`像素设置 ${E(t.megapixels)} MP`);const l=[["帧率",t.output_fps??t.target_fps??t.fps??t.force_rate??s.fps," FPS"],["步数",t.steps," 步"],["帧数",t.frames," 帧"],["长边",t.scale_to_length," px"],["批量",t.batch_size,""]];for(const[p,c,u]of l)B(c)&&i.push(`${p} ${E(c)}${u}`)}return i.join(" / ")||"规格未完整记录"}function lt(n){return(n?.variants||[]).flatMap(r=>{const t=Qn(r);return typeof t.kind=="string"&&["image","video"].includes(t.kind)&&B(t.width)&&Number.isSafeInteger(t.width)&&t.width>0&&B(t.height)&&Number.isSafeInteger(t.height)&&t.height>0?[{kind:t.kind,width:t.width,height:t.height,outputs:t.outputs,samples:t.samples}]:[]})}function er(n){return`${n.kind==="image"?"图片":"视频"} · ${ot({width:n.width,height:n.height},{})}`}function Fo(n){return B(n.width)&&B(n.height)&&Number.isSafeInteger(n.width)&&Number.isSafeInteger(n.height)&&n.width>0&&n.height>0&&["image","video"].includes(n.kind||"")?er({kind:n.kind||"",width:n.width,height:n.height}):"尺寸未记录"}const qo=n=>`${wn(n).join(" + ")}｜${kn(n)}`;function Uo(n){const r=t=>mn(t)?t.source!=="historical"&&B(t.last_sample_at)?3:t.source==="historical"?2:1:0;return[...n].sort((t,s)=>r(s)-r(t)||(r(t)===3?(s.last_sample_at||0)-(t.last_sample_at||0):0)||(s.samples||0)-(t.samples||0)||(s.measured||0)-(t.measured||0))[0]}function nr(n){const r=[...n.warnings||[]],t=Zn(n);return(!B(n.samples)||n.samples<30||!B(t)||t<3)&&r.push("参考样本不足：建议至少 30 个任务且跨 3 天；达到门槛也不是置信保证。"),n.source==="historical"&&r.push("仅成功任务 runtime 参考，未计完整占机、重试及质量损耗；不是合格日产能。"),n.eligible!==!0&&r.push("完整基线证据不足，不作为已验证采购依据。"),[...new Set(r)]}const We=n=>{const r={task:"任务",tasks:"任务",image:"张图片",images:"张图片",video:"条视频",videos:"条视频",second:"视频秒",seconds:"视频秒",video_seconds:"视频秒"};return n.source==="historical"?"任务":r[n.unit||""]||L(n.unit)};function ct(n){const r=Object.hasOwn(n,"model_evidence"),t=n.model_evidence;return{variants:r?(t?.variants||[]).filter(i=>["task_snapshot","archived_task"].includes(i.source)):n.model_summary?.source==="task_snapshot"?[{source:"task_snapshot",summary:n.model_summary,samples:null,measured:null}]:[],hasEvidence:r,total:t?.total_samples,recorded:t?.recorded_samples,reference:n.current_model_reference?.source==="current_template"?n.current_model_reference:null}}const Ae=n=>n?.models||[];function Wo(n,r,t){const i={high_noise:"高噪声",low_noise:"低噪声",高噪声:"高噪声",低噪声:"低噪声",base:"基础模型",refiner:"精修模型",生成主模型:"生成主模型",深度模型:"深度模型",放大模型:"放大模型",插帧模型:"插帧模型"}[n.role||""];return i?`${i} · 主模型 ${r+1}`:t>1?`主模型 ${r+1}`:""}function On(n){const r=[];if(n.precision&&n.precision_source==="filename"&&r.push(`文件标记 ${L(n.precision)}`),n.loader_dtype){const t=L(n.loader_dtype),s=t.split(/\s*\/\s*/).map(a=>a.match(/^(bfloat16|bf16|float(?:8|16|32|64)|fp(?:8|16|32|64))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]),i=s.every(Boolean)?[...new Set(s.map(a=>a?.toUpperCase().replace("BFLOAT16","BF16").replace("FLOAT","FP")))].join(" / "):null;r.push(`加载配置 ${i?`${i}（${t}）`:t}${["default","auto"].includes(t.toLowerCase())?"（实际精度未确认）":""}`)}else n.precision&&n.precision_source==="loader"&&r.push(`加载配置 ${L(n.precision)}`);return r.length||r.push("精度未记录 / 待确认"),r}function Bo(n){const r=a=>{if(typeof a!="string")return null;const o=a.split(/\s*\/\s*/).map(l=>l.trim().match(/^(bfloat16|float(?:8|16|32|64)|bf16|fp(?:4|8|16|32|64)|int(?:4|8|16)|nf4|q[2-8]_(?:k(?:_[sml])?|[01]))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]);return o.every(Boolean)?[...new Set(o.map(l=>l?.toUpperCase().replace("BFLOAT16","BF16").replace("FLOAT","FP")))].sort().join(" / "):null},t=n.precision_source==="filename"?r(n.precision):null,s=r(n.loader_dtype)||(n.precision_source==="loader"?r(n.precision):null),i=On(n).filter(a=>a.startsWith("文件标记 ")?!!t:a.startsWith("加载配置 ")?!!s||["default","auto"].includes(String(n.loader_dtype).toLowerCase()):!1);return i.some(a=>a.startsWith("文件标记 "))||i.unshift("文件标记未记录 / 待确认"),i.some(a=>a.startsWith("加载配置 "))||i.push("加载配置未记录 / 待确认"),i}function dt(n){return JSON.stringify([n.capability,n.spec_key||`unknown:${n.id}`,n.source,n.spec?.model_version||null,n.config?.model_version||null,n.config?.environment_id||null,n.source==="standard"?n.benchmark_id||`unknown:${n.id}`:null,n.cache_condition||null])}function Vo(n){const r=new Map,t={none:"无节点结果缓存",loaders:"加载节点缓存",execution:"执行节点缓存",unknown:"未知",mixed:"混合条件"};for(const s of n){const i=Qn(s.cache_condition).kind;r.set(dt(s),`${it(s)} / ${L(s.spec_key)} / ${ye(s.source)} / 模型 ${L(s.spec?.model_version||s.config?.model_version)} / 环境 ${L(s.config?.environment_id)} / 缓存 ${typeof i=="string"&&t[i]||"未知"}${s.source==="standard"?` / 基准 ${L(s.benchmark_id)}`:""}`)}return[...r]}function rr(n,r,t,s=[]){return`${r||t.find(i=>i.id===n)?.name||s.find(i=>i.worker_id===n)?.worker_name||"未关联执行端"}（${n||"Worker ID 未知"}）`}function Ho(n){return n.review?.source==="standard"?"标准样本（人工声明）":n.review?.source==="business"?"业务样本":"未标记"}function pt({title:n,children:r,className:t}){const[s,i]=d.useState(!1);return e.jsxs("details",{className:t,onToggle:a=>{a.currentTarget.open&&i(!0)},children:[e.jsx("summary",{children:n}),s&&(typeof r=="function"?r():r)]})}function hn({title:n,value:r,className:t}){return e.jsx(pt,{title:n,className:t,children:()=>e.jsx("pre",{children:L(r)})})}function Nn({values:n=[],className:r="warn"}){return e.jsx("ul",{className:r,children:n.map((t,s)=>e.jsx("li",{children:t},s))})}function Fn({items:n}){return n.map(([r,t])=>e.jsxs("div",{className:"metric",children:[e.jsx("span",{children:r}),e.jsx("strong",{children:E(t)})]},r))}function tr({headers:n,children:r}){return e.jsx("div",{className:"scroll",tabIndex:0,role:"region","aria-label":n.join(" / "),children:e.jsxs("table",{children:[e.jsx("thead",{children:e.jsx("tr",{children:n.map(t=>e.jsx("th",{scope:"col",children:t},t))})}),e.jsx("tbody",{children:r})]})})}function ut({resolution:n}){const r=lt(n);return e.jsxs(e.Fragment,{children:[r.length?e.jsxs(e.Fragment,{children:[new Set(r.map(t=>`${t.width}x${t.height}`)).size>1&&e.jsx("span",{className:"hint",children:"多种成品规格（非单一尺寸）"}),r.map((t,s)=>e.jsx("span",{className:"resolution-variant",children:er(t)},s))]}):e.jsx("span",{children:"尺寸未记录"}),B(n?.total_samples)&&n.total_samples>0&&n.complete_samples!==n.total_samples&&e.jsxs("span",{className:"resolution-coverage hint",children:["已知 ",E(n.recorded_samples)," / ",E(n.total_samples)," ","次任务的部分或全部成品"]})]})}function mt({resolution:n}){return e.jsxs("div",{className:"output-resolution-details",children:[e.jsx("h3",{children:"实际成品"}),e.jsx("div",{className:"actual-resolution",children:e.jsx(ut,{resolution:n})}),e.jsxs("p",{children:["尺寸覆盖：",E(n?.recorded_samples)," / ",E(n?.total_samples)," ","次已完成任务至少有一个成品尺寸；",E(n?.complete_samples)," /"," ",E(n?.total_samples)," 次已完成任务的全部最终产物都有尺寸。"]}),e.jsxs("p",{children:["已知尺寸产物 ",E(n?.recorded_outputs)," / ",E(n?.total_outputs)," 个",n?.total_outputs==null?"（最终清单不完整，产物总数未知）":"","。"]}),lt(n).map((r,t)=>e.jsxs("p",{children:[er(r),"：",E(r.outputs)," 个产物 / ",E(r.samples)," 次任务"]},t)),e.jsx("p",{className:"hint",children:"同一任务可能包含多种尺寸，各尺寸的任务数不能相加。尺寸来自最终产物记录或受控补采，与技术合格产量、人工验收和采购资格分离；有尺寸不代表技术合格。平均耗时仍为原组成功任务平均，不按尺寸重算。"})]})}function wr({summary:n,origin:r}){const t=Ae(n);return e.jsxs("div",{className:"model-reference",children:[e.jsx("p",{className:"model-origin",children:r}),n.complete===!1&&e.jsx("p",{className:"warn",children:"不完整 / 未确认完整主模型链；动态选择或未知链路不能推断全部主模型。"}),!t.length&&e.jsx("p",{children:"未获取到模型信息，模型待确认。"}),t.map((s,i)=>e.jsx("p",{children:`${Wo(s,i,t.length)||"主模型"}：${L(s.name)}；角色：${L(s.role)}；${On(s).join("；")}；非运行时检测`},i)),!!n.auxiliary_models?.length&&e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"hint",children:"辅助模型（不计入主模型名称或精度）"}),n.auxiliary_models?.map((s,i)=>e.jsx("p",{className:"hint",children:`角色：${L(s.role)}；${L(s.name)}；${On(s).join("；")}`},i))]})]})}function ht({g:n}){const r={...n.spec?.dimensions,...n.dimensions},t=ct(n);return e.jsxs("div",{className:"pad",children:[e.jsxs("p",{children:["输入素材：",wn(n).join(" / ")]}),e.jsxs("p",{children:["生成参数：",kn(n,!0)]}),B(r.source_duration)&&e.jsxs("p",{className:"hint",children:["首个输入视频时长：",E(r.source_duration)," 秒（非多段视频合计）"]}),e.jsx("p",{className:"hint",children:"素材数量按任务输入槽位计，同一文件被多次引用也会分别计数；生成参数不是成品实测规格。"}),e.jsxs("p",{children:["来源：",ye(n.source),"；有效耗时样本 ",E(n.measured)," / 总样本 ",E(n.samples),"；成功"," ",E(n.done)," / 失败 ",E(n.error)," / 取消 ",E(n.canceled)]}),e.jsxs("p",{children:["mean：",le(n.mean_seconds),"；P50：",le(n.p50_seconds),"；P90：",le(n.p90_seconds),"；最近成功样本：",Ge(n.last_sample_at)]}),e.jsx("p",{className:"hint",children:"平均值仅使用该组成功任务执行耗时；不包含排队，不等于纯 GPU 计算时间，也不是合格日产能。"}),e.jsxs("p",{children:["执行时配置：",rn(n.config),"（",_n(n.config_source),"）"]}),e.jsxs("p",{children:["缓存条件：",L(n.cache_condition)]}),e.jsxs("p",{children:["成功 runtime 合计：",le(n.runtime_seconds),"；占机合计：",le(n.occupied_seconds),"；实际产出：",E(n.output_count)," ",We(n),"。"]}),e.jsxs("p",{children:["单位技术交付：",le(n.seconds_per_unit)," / ",We(n),"；单位人工合格：",le(n.qualified_seconds_per_unit)," / ",We(n),"；已人工验收：",E(n.reviewed),"；全组人工合格数量：",E(n.accepted),"。"]}),e.jsxs("p",{className:"hint",children:["技术基线资格：",n.eligible===!0?"服务端判定具备完整基线证据":n.eligible===!1?"证据不足，不作为已验证采购依据":"未记录","；标准场景编号：",L(n.benchmark_id),"。"]}),e.jsx(mt,{resolution:n.output_resolution}),t.hasEvidence&&e.jsxs("p",{children:["模型记录覆盖 ",E(t.recorded)," / ",E(t.total)," ","次；覆盖数不是完整主模型链的确认。"]}),t.variants.length>1&&e.jsx("p",{className:"warn",children:"不同任务记录对应不同模型组合；每个组合内的主模型才属于同一个图。全组平均耗时不代表任一组合的专属速度。"}),!t.variants.length&&e.jsx("p",{children:"历史未记录可用主模型证据；不能用当前模板补写历史模型与精度。"}),t.variants.map((s,i)=>e.jsx(wr,{summary:s.summary,origin:`历史任务记录组合 ${i+1} · ${s.source==="archived_task"?"保留的原任务记录":"任务提交记录"}${t.hasEvidence?` · ${E(s.samples)} 次记录 / ${E(s.measured)} 次成功耗时`:""}`},i)),t.reference?e.jsxs(e.Fragment,{children:[e.jsx(wr,{summary:t.reference,origin:`当前工具默认配置（非历史执行记录）· ${L(t.reference.capability_name)}`}),e.jsx("p",{className:"warn hint",children:"仅为工具模板默认值，不代表用户画布节点当前选中的模型。历史耗时不代表当前模型速度；参考信息不补齐历史覆盖，也不覆盖历史精度。"})]}):!t.variants.length&&e.jsx("p",{className:"hint",children:"未获取到模型信息：当前工具模板未提供、找不到或无法识别。"}),e.jsx(Nn,{values:nr(n)}),e.jsxs("p",{className:"hint",children:["采样日期：",L(n.days),"；配置编号：",L(n.config_id),"；采样编号：",n.id]}),e.jsx(hn,{title:"原始规格与证据",value:{dimensions:n.dimensions,spec:n.spec,output_resolution:n.output_resolution,recovered_outputs:n.recovered_outputs,model_summary:n.model_summary,model_evidence:n.model_evidence,current_model_reference:n.current_model_reference,cache_condition:n.cache_condition}})]})}function xt({groups:n,report:r}){return n.length?e.jsx(tr,{headers:["业务 / 执行端 / 来源","精确业务规格","样本覆盖","成功任务耗时分布","运行参考 / 产出口径","警告与限制"],children:n.map(t=>e.jsxs("tr",{"data-group-id":t.id,children:[e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsx("strong",{children:Ue(t)}),e.jsxs("p",{className:"hint",children:["能力 ID：",t.capability]}),e.jsx("p",{className:"hint",children:rr(t.worker_id,t.worker_name,r.workers,r.groups)}),e.jsx("span",{className:"badge",children:ye(t.source)}),e.jsxs("p",{className:"hint",children:["配置：",L(t.config_id)]}),t.source==="standard"&&e.jsxs("p",{className:"hint",children:["标准场景编号：",L(t.benchmark_id)]})]})}),e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsxs("p",{children:["规格键：",L(t.spec_key)]}),e.jsxs("p",{className:"hint",children:["已知规格：",L(t.dimensions)]}),e.jsx(pt,{title:"配置 / 规格 / 日期证据",children:()=>e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["执行时配置：",rn(t.config)]}),e.jsxs("p",{children:["配置来源：",_n(t.config_source)]}),e.jsxs("p",{children:["采样日期（服务端记录）：",L(t.days)]}),e.jsxs("p",{children:["缓存条件：",L(t.cache_condition)]}),e.jsx("pre",{children:L(t.spec)})]})})]})}),e.jsx("td",{children:e.jsxs("div",{children:[e.jsxs("p",{children:["样本 ",E(t.samples)," / ",E(Zn(t))," 天"]}),e.jsxs("p",{children:["完成 ",E(t.done)," / 失败 ",E(t.error)," / 取消 ",E(t.canceled)]}),e.jsxs("p",{className:"hint",children:["有效耗时样本 ",E(t.measured),"；已人工验收 ",E(t.reviewed)]})]})}),e.jsx("td",{children:e.jsxs("div",{children:[e.jsxs("p",{children:["平均 ",le(t.mean_seconds)]}),e.jsxs("p",{children:["P50 ",le(t.p50_seconds)]}),e.jsxs("p",{children:["P90 ",le(t.p90_seconds)]})]})}),e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsxs("p",{children:["成功任务 runtime 合计 ",le(t.runtime_seconds)]}),e.jsxs("p",{children:["成功任务 / 运行小时（仅 runtime 参考）：",E(t.reference_per_hour)]}),t.source!=="historical"&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["占机合计 ",le(t.occupied_seconds)]}),e.jsxs("p",{children:["实际产出 ",E(t.output_count)," ",We(t)]}),e.jsxs("p",{children:["单位技术交付 ",le(t.seconds_per_unit)," / ",We(t)]}),e.jsxs("p",{children:["单位人工合格 ",le(t.qualified_seconds_per_unit)," / ",We(t)]})]})]})}),e.jsx("td",{className:"wide",children:e.jsx(Nn,{values:nr(t)})})]},t.id))}):e.jsx("p",{className:"empty",children:"暂无业务规格样本；未测试场景不能推算产能。"})}function Go({items:n}){return e.jsx("dl",{children:n.map(([r,t])=>e.jsxs(d.Fragment,{children:[e.jsx("dt",{children:r}),e.jsx("dd",{children:t})]},r))})}function Jo({entries:n,worker:r,title:t,ready:s,onEvidence:i}){const[a,o]=d.useState(()=>Uo(n)?.id||""),[l,p]=d.useState(!1),[c,u]=d.useState(!1),g=`summary-evidence-${d.useId().replace(/[^a-zA-Z0-9_-]/g,"")}`,x=n.find(k=>k.id===a)||n[0];if(!x)return null;const m=ct(x),_=m.variants.length?m.variants.map(k=>k.summary):m.reference?[m.reference]:[],y=_.reduce((k,R)=>k+Math.max(1,Ae(R).length),0)||1,N=n.map(qo),w=new Map;for(const k of N)w.set(k,(w.get(k)||0)+1);const h=m.variants.length?m.variants.length>1||m.hasEvidence&&B(m.recorded)&&B(m.total)&&m.recorded<m.total||m.variants.some(k=>k.summary.complete===!1)?"全组历史任务平均，非某个模型或组合专属速度。":"":m.reference?"此处耗时来自历史任务，不代表当前模型速度。":"",b={"--model-rows":y+1};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"business-row","data-capability":x.capability,"data-selected-group-id":x.id,children:[e.jsxs("div",{className:"matrix-field","data-label":"平均生成时间",children:[e.jsx("span",{className:mn(x)?"mean-time":"muted",children:mn(x)?Oo(x.mean_seconds):"暂无成功耗时"}),h&&e.jsx("p",{className:"warn hint",children:h}),mn(x)&&B(x.mean_seconds)&&(x.mean_seconds<1||x.mean_seconds>3600)&&e.jsx("p",{className:"warn hint",children:"耗时异常，请核对详情"})]}),e.jsxs("div",{className:"matrix-samples","data-label":"样本与详情",children:[e.jsxs("p",{className:!B(x.measured)||x.measured<30?"warn hint":"hint",children:[B(x.measured)?x.measured<30?`仅 ${E(x.measured)} 次 / 仅供参考`:`${E(x.measured)} 次成功实测`:"样本数未记录"," ","· ",ye(x.source)]}),e.jsx("button",{type:"button",className:"summary-detail-toggle","aria-expanded":l,"aria-controls":g,onClick:()=>{p(!l),l||u(!0)},children:l?"收起详情":"查看详情"})]}),e.jsxs("div",{className:"matrix-field","data-label":"任务规格",children:[e.jsx("select",{className:"summary-spec",disabled:!s,"aria-label":`${r.name||"机器"} ${t}任务规格`,title:`原组 ${x.id} / 配置 ${L(x.config_id)} / ${ye(x.source)} / 规格键 ${L(x.spec_key)}`,value:x.id,onChange:k=>{s&&(o(k.target.value),u(l))},children:n.map((k,R)=>e.jsx("option",{value:k.id,children:`${N[R]}${(w.get(N[R]||"")||0)>1?` · ${ye(k.source)} · ${B(k.last_sample_at)?Ge(k.last_sample_at):"日期未记录"} · 采样 ${R+1}`:""}`},k.id))}),e.jsxs("dl",{className:"selected-spec",children:[e.jsx("dt",{children:"输入素材"}),e.jsx("dd",{className:"input-materials",children:wn(x).map(k=>e.jsx("span",{children:k},k))}),e.jsx("dt",{children:"生成参数"}),e.jsx("dd",{className:"generation-parameters",children:kn(x)}),e.jsx("dt",{children:"实际成品"}),e.jsx("dd",{className:"actual-resolution",children:e.jsx(ut,{resolution:x.output_resolution})})]})]}),e.jsxs("div",{className:"matrix-models",style:b,children:[e.jsx("div",{className:"matrix-field","data-label":"模型名称",children:_.length?_.map((k,R)=>e.jsx("div",{className:"model-variant",children:Ae(k).length?Ae(k).map((D,C)=>e.jsx("div",{className:"model-item",children:e.jsx("p",{className:"model-name",children:D.name||"未获取到模型信息"})},C)):e.jsx("p",{className:"muted",children:"未获取到模型信息"})},R)):e.jsx("span",{className:"muted",children:"未获取到模型信息"})}),e.jsx("div",{className:"matrix-field","data-label":"模型精度",children:_.length?_.map((k,R)=>e.jsx("div",{className:"model-variant",children:Ae(k).length?Ae(k).map((D,C)=>e.jsx("div",{className:"model-item",children:Bo(D).map(P=>e.jsx("p",{className:"model-label",children:P},P))},C)):e.jsx("p",{className:"muted",children:"无"})},R)):e.jsx("p",{className:"muted",children:"无"})})]})]}),e.jsx("div",{className:"summary-evidence",id:g,hidden:!l,children:c&&e.jsxs(e.Fragment,{children:[e.jsx(ht,{g:x},x.id),e.jsx("button",{type:"button","data-evidence-entry":"",disabled:!s,onClick:()=>{s&&i(x.id)},children:"任务证据"})]})})]})}function Ko({report:n,ready:r,includeOffline:t,onProfile:s,onEvidence:i}){const a=n.workers.filter(c=>t||we(c));if(!a.length)return e.jsx("p",{className:"empty",children:t?"暂无机器记录。":"当前没有在线机器，可勾选“包含离线”查看已登记记录。"});const o=new Set(a.map(c=>c.id)),l=new Map;for(const c of n.groups)if(c.worker_id&&o.has(c.worker_id)){let u=l.get(c.capability);u||(u={title:Ue(c),machines:new Map},l.set(c.capability,u)),u.machines.set(c.worker_id,[...u.machines.get(c.worker_id)||[],c])}l.size||l.set("",{title:"历史记录",machines:new Map});const p={"--machine-count":a.length};return e.jsx("div",{className:"scroll comparison-scroll",tabIndex:0,role:"region","aria-label":"机器产能对比表，可横向滚动",children:e.jsxs("table",{className:"simple-table matrix-table","aria-label":"机器与业务能力对比",style:p,children:[e.jsxs("colgroup",{children:[e.jsx("col",{className:"matrix-axis-col"}),a.map(c=>e.jsx("col",{},c.id))]}),e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"business-axis",scope:"col",children:"业务能力"}),a.map((c,u)=>e.jsxs("th",{className:"machine-heading",scope:"col",id:`summary-machine-${u+1}`,"data-summary-worker-id":c.id,children:[e.jsx("h3",{children:c.name||"未命名机器"}),e.jsx("span",{className:["busy","running"].includes(c.state)?"warn":we(c)?"online-state":"muted",children:Xn[c.state]||"状态待确认"}),e.jsx("p",{className:"machine-hardware",children:To(c)}),e.jsxs("details",{className:"machine-more",children:[e.jsx("summary",{children:"机器详情"}),e.jsx("p",{children:Do(c)}),e.jsxs("p",{className:"hint",children:["最后上报：",Ge(c.last_seen),"；Worker ID：",c.id,"；采集程序版本：",L(c.agent_version)]}),!we(c)&&e.jsx("p",{className:"hint",children:"此记录当前不可用，配置为最后上报信息，历史速度不代表现在能执行。"}),e.jsx("button",{type:"button",onClick:()=>s(c),children:"查看配置"})]})]},c.id))]})}),e.jsx("tbody",{children:[...l].map(([c,{title:u,machines:g}],x)=>e.jsxs("tr",{className:"capability-row","data-capability":c||void 0,children:[e.jsx("th",{className:"business-axis",scope:"row",id:`summary-business-${x+1}`,children:e.jsx("span",{className:"business-title",children:u})}),a.map((m,_)=>{const y=g.get(m.id);return e.jsx("td",{className:"machine-result","data-summary-worker-id":m.id,headers:`summary-machine-${_+1} summary-business-${x+1}`,children:y?e.jsx(Jo,{entries:y,worker:m,title:u,ready:r,onEvidence:i}):e.jsx("p",{className:"matrix-empty",children:"暂无记录；不据此推断是否支持该业务。"})},m.id)})]},c))})]})})}function Yo({report:n,mounted:r,onProfile:t}){const s=n?.overview||{};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"summary",children:[e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"生成任务"}),e.jsx("span",{className:"hint",children:"不是产物数量"})]}),e.jsx("div",{id:"task-metrics",className:"metrics pad",children:r&&e.jsx(Fn,{items:[["总任务",s.tasks],["完成",s.done],["失败",s.error],["取消",s.canceled]]})}),e.jsx("p",{id:"coverage",className:"hint pad",children:r&&`历史 ${E(s.historical_tasks)} / 新采集 ${E(s.captured_tasks)}；Worker 未关联 ${E(s.unknown_worker)}；已排除 API ${E(s.excluded_api)}。`})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"实际产物"}),e.jsx("span",{className:"hint",children:"仅已知输出，不从请求推断"})]}),e.jsx("div",{id:"output-metrics",className:"metrics pad",children:r&&e.jsx(Fn,{items:[["图片（张）",s.output_images],["视频（条）",s.output_videos],["视频总时长（秒）",s.output_seconds],["产物未知记录",s.unknown_outputs]]})}),e.jsx("p",{className:"hint pad",children:"图片、视频、时长分别统计；未知不记为零，也不计为人工合格。"})]})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"机器配置与状态"}),e.jsx("span",{className:"hint",children:"按 Worker ID 区分，名称相同不合并"})]}),e.jsx("p",{className:"notice hint",children:"配置为当前或最后上报信息，不代表历史执行快照，也不是最低采购配置。系统可见内存不是标称容量，多卡显存不相加。"}),e.jsx("div",{id:"workers",className:"worker-grid",children:r&&n&&(n.workers.length?n.workers.map(i=>{const a=i.hardware,o=["offline","disabled"].includes(i.state)||!B(i.last_seen)||Date.now()/1e3-i.last_seen>120;return e.jsxs("article",{className:"worker","data-worker-id":i.id,children:[e.jsx("h3",{children:L(i.name)}),e.jsxs("p",{className:"hint",children:["Worker ID：",i.id]}),e.jsx("span",{className:"badge",children:Xn[i.state]||i.state}),e.jsxs("p",{className:o?"warn":"hint",children:["最后心跳：",Ge(i.last_seen),o?"；状态 / 配置快照已过期或无法确认，请勿视为实时。":""]}),e.jsx(Go,{items:[["GPU",a?.gpus?.length?a.gpus.map((l,p)=>`GPU ${p+1}：${L(l.name)} / 单卡显存 ${He(l.memory_total_bytes)}`).join(`
`):"未知"],["GPU 数量",a?.gpus?.length?E(a.gpus.length):"未知"],["CPU",nn(a?.cpu,"cpu")],["内存",He(a?.memory_total_bytes)],["系统",nn(a?.os,"os")],["环境",L(a?.environment_id)],["模型版本",L(a?.model_version)],["主机 ID",L(a?.host_id)],["磁盘",L(a?.disk)],["配置备注",L(a?.note)]]}),e.jsxs("p",{className:"hint",children:["配置来源：",_n(i.hardware_source),"。人工补录不回写历史快照。"]}),e.jsxs("p",{children:["任务 ",E(i.tasks)," / 完成 ",E(i.done)," / 失败 ",E(i.error)," / 取消"," ",E(i.canceled)]}),e.jsxs("p",{className:"hint",children:["累计 runtime：",le(i.runtime_seconds)]}),i.id&&i.state!=="historical"?e.jsxs("details",{className:"profile-details",children:[e.jsx("summary",{children:"补录机器配置（人工声明）"}),e.jsx("p",{className:"hint",children:"7 个字段仅保存非空新声明，不回写历史快照。"}),e.jsx("button",{type:"button",onClick:()=>t(i),children:"查看 / 补录配置"})]}):e.jsx("p",{className:"hint",children:"历史执行端未关联现存注册记录，不能补录配置。"})]},i.id)}):e.jsx("p",{className:"empty",children:"暂无执行端信息；无法关联的历史任务不会按名称猜测机器。"}))})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"业务规格分组"}),e.jsx("span",{className:"hint",children:"原始统计保留失败、取消与异常记录"})]}),e.jsx("div",{id:"machine-groups",children:r&&n&&e.jsx(xt,{groups:n.groups,report:n})})]})]})}const Xo={mode:"historical",quality:"technical",availability:1,utilization:.75},$e=[{id:"zimage_t2i",type:"生图模式",label:"文生图",capabilities:["zimage_t2i","krea2_t2i","qwen_image_2512_t2i","qwen_image_21_t2i"]},{id:"zimage_i2i",type:"生图模式",label:"图生图",capabilities:["zimage_i2i","krea2_i2i","qwen_image_edit_2511_i2i","qwen_image_21_multi","qwen_image_21_i2i"]},{id:"flux2_klein_storyboard9",type:"生图模式",label:"多宫格故事分镜",capabilities:["flux2_klein_storyboard9"]},{id:"flux2_klein_edit",type:"生图模式",label:"参考图编辑(保人物)",capabilities:["flux2_klein_edit"]},{id:"minimax_h3_character_transfer",type:"生视频模式",label:"H3人物迁移",capabilities:["minimax_h3_character_transfer"]},{id:"minimax_h3_flf2v",type:"生视频模式",label:"H3 图生视频",capabilities:["minimax_h3_i2v","minimax_h3_flf2v"]},{id:"minimax_h3_talk2",type:"生视频模式",label:"H3 说话唱歌",capabilities:["minimax_h3_talk1","minimax_h3_talk2"]},{id:"minimax_h3_ref4",type:"生视频模式",label:"H3图片参考",capabilities:["minimax_h3_ref4"]},{id:"minimax_h3_comic20",type:"生视频模式",label:"漫剧4宫格",capabilities:["minimax_h3_comic20"]},{id:"minimax_h3_fusion_v2",type:"生视频模式",label:"H3无损融合单采V2",capabilities:["minimax_h3_fusion_v2"]},{id:"minimax_h3_fusion_v3",type:"生视频模式",label:"H3无损融合单采V3",capabilities:["minimax_h3_fusion_v3"]},{id:"minimax_h3_ref9",type:"生视频模式",label:"H3全能参考",capabilities:["minimax_h3_ref9"]},{id:"minimax_h3_ref_2pass",type:"生视频模式",label:"H3全能参考(高质量)",capabilities:["minimax_h3_ref_2pass"]}],qn=n=>$e.find(r=>n!==void 0&&r.capabilities.includes(n)),Zo=n=>JSON.stringify(n.source==="standard"?[n.config_id||null,n.source,n.benchmark_id||`unknown:${n.id}`]:[n.config_id||null,n.source]),Qo=n=>B(n.mean_seconds)&&n.mean_seconds>0&&B(n.measured)&&n.measured>0;function Sn(n,r){return n.workers.some(t=>t.id===r&&we(t))?n.groups.filter(t=>t.worker_id===r&&["historical","captured","standard"].includes(t.source)&&qn(t.capability)&&Qo(t)):[]}const ft=(n,r)=>n<r?-1:n>r?1:0;function el(n,r){return(r.measured||0)-(n.measured||0)||(r.samples||0)-(n.samples||0)||(r.last_sample_at||0)-(n.last_sample_at||0)||(r.mean_seconds||0)-(n.mean_seconds||0)||ft(n.id,r.id)}function nl(n,r){const t=new Map;for(const a of r){const o=Zo(a);t.set(o,[...t.get(o)||[],a])}const s=[];for(const[a,o]of t){const l=[];for(const p of n){const c=$e.find(g=>g.id===p.mode_id),u=o.filter(g=>c?.capabilities.includes(g.capability)).sort(el)[0];u&&l.push(u)}l.length===n.length&&s.push({key:a,groups:l,measured:l.reduce((p,c)=>p+(c.measured||0),0)})}s.sort((a,o)=>o.measured-a.measured||ft(a.key,o.key));const i=s[0];if(!i)throw Error("所选模式没有同一电脑、同一配置和来源的共同实测记录，请减少模式或换一台电脑");return i.groups}function rl(n,r,t,s,i,a){if(!n.workers.some(c=>c.id===t&&we(c)))throw Error("所选电脑当前不在线，请刷新后重新选择。");const o=Sn(n,t),l=new Set;for(const c of a){const u=$e.find(g=>g.id===c.mode_id);if(!u||!o.some(g=>u.capabilities.includes(g.capability)))throw Error("所选模式没有成功耗时记录，请换一个模式或电脑。");if(l.has(c.mode_id))throw Error("同一模式请合并每日需求，不能重复选择。");if(l.add(c.mode_id),!B(Number(c.quantity))||Number(c.quantity)<=0)throw Error("每日需求必须是大于零的有限任务数量。")}if(!a.length)throw Error("请至少添加一个有样本的业务模式。");const p=nl(a,o);return tt.parse({...r,...Xo,worker_id:t,hours:Number(s),...i!==""?{price:Number(i)}:{},demands:a.map((c,u)=>{const g=p[u];if(!g)throw Error("原组证据缺失");return{group_id:g.id,quantity:Number(c.quantity)}})})}const gt=[{key:"host_id",label:"主机 ID",maxLength:160},{key:"cpu",label:"CPU 型号",maxLength:160},{key:"memory_total_bytes",label:"系统可见内存（GiB）"},{key:"environment_id",label:"执行环境版本",maxLength:160},{key:"model_version",label:"模型版本",maxLength:160},{key:"disk",label:"磁盘配置说明",maxLength:160},{key:"note",label:"配置备注",maxLength:500}];function Un(n,r){if(Array.from(n).some(t=>t.charCodeAt(0)<32||t.charCodeAt(0)===127))throw Error(r)}function tl(n,r){const t={};for(const{key:s}of gt){const i=(n[s]||"").trim();if(i)if(Un(i,"配置字段请使用不含控制字符的单行文本。"),s==="memory_total_bytes"){const a=Math.round(Number(i)*1073741824);if(!Number.isSafeInteger(a)||a<=0)throw Error("内存必须是能转换为安全正整数字节的 GiB 数值。");a!==r?.[s]&&(t[s]=a)}else i!==(s==="cpu"?nn(r?.cpu,"cpu"):r?.[s])&&(t[s]=i)}if(!Object.keys(t).length)throw Error("没有需要保存的修改；留空不会删除已有配置。");return st.parse(t)}function sl(n){const r=n.accepted===""?null:Number(n.accepted);if(r!==null&&(!Number.isSafeInteger(r)||r<0))throw Error("请输入非负整数，或留空表示未验收。");const t=(n.benchmark_id||"").trim(),s=(n.note||"").trim();if(n.source==="standard"&&!t)throw Error("标准样本需要填写标准场景编号；标签不代表自动验证。");return Un(s,"验收备注和标准场景编号请使用单行文本，不含换行或控制字符。"),Un(t,"验收备注和标准场景编号请使用单行文本，不含换行或控制字符。"),at.parse({accepted:r,source:n.source,benchmark_id:t,note:s})}function al(n){let r=n==null?"":typeof n=="object"?JSON.stringify(n):String(n);return/^[\s]*[=+\-@]/.test(r)&&(r="'"+r),'"'+r.replace(/"/g,'""')+'"'}function il(n){return"\uFEFF"+[["类别","内容"],["测算口径","历史任务运行参考，不是合格日产能"],["输入与时间范围",n.payload],["当前机器配置（非历史快照）",n.hardware],["测算结果",n.result],...n.groups.map(t=>["场景证据",{...t,warnings:nr(t)}])].map(t=>t.map(al).join(",")).join(`\r
`)}function ol({worker:n,controller:r,onClose:t}){const[s,i]=d.useState({});return e.jsx(de,{title:n.state==="historical"?"历史执行端配置":`机器配置与人工补录 · ${n.name||n.id}`,className:"capacity-page",onClose:t,submitLabel:n.state==="historical"?"关闭":"保存人工配置",onSubmit:n.state==="historical"?async()=>{}:async()=>{const a=tl(s,n.hardware);try{await r.saveProfile(n.id,a)}catch(o){throw Error(`保存失败：${re(o)}。输入已保留，请检查字段后重试。`)}},children:n.state==="historical"?e.jsx("p",{children:rn(n.hardware)}):e.jsxs("div",{className:"capacity-operation",children:[e.jsxs("details",{children:[e.jsx("summary",{children:"当前 / 最后上报配置"}),e.jsx("p",{children:rn(n.hardware)}),e.jsxs("p",{children:["配置来源：",_n(n.hardware_source),"；配置备注：",L(n.hardware?.note)]})]}),e.jsx("p",{className:"notice",children:"仅保存本次修改的非空字段；留空保留原值。内存以 GiB 输入、按字节保存，不是采购标称容量。新声明仅向后生效，不回写历史快照。"}),e.jsx("p",{className:"hint",children:"主机 ID 仅在人工确认属于同一物理机器时填写相同值，不按机器名称合并；同机多个 Worker 不自动代表多倍产能。"}),e.jsx("div",{className:"profile-form",children:gt.map(({key:a,label:o,maxLength:l})=>e.jsxs("label",{className:"field",children:[e.jsx("span",{children:o}),e.jsx("input",{name:a,type:a==="memory_total_bytes"?"number":"text",min:a==="memory_total_bytes"?"0.000001":void 0,step:a==="memory_total_bytes"?"any":void 0,maxLength:l,placeholder:["model_version","environment_id"].includes(a)?"填写固定版本，勿用 latest / main / unknown":"留空保留现值",value:s[a]||"",onChange:p=>{i({...s,[a]:p.target.value}),r.invalidateEstimate("机器配置输入已更改；请保存后重新计算，未保存内容不会进入测算。")}})]},a))})]})})}function ll({detail:n,controller:r,onClose:t}){const[s,i]=d.useState({accepted:B(n.review?.accepted)?String(n.review.accepted):"",source:n.review?.source==="standard"?"standard":"business",benchmark_id:n.review?.benchmark_id||"",note:n.review?.note||""}),a=(o,l)=>{i({...s,[o]:l}),r.invalidateEstimate("人工验收输入已变更；未保存内容不会进入测算。")};return e.jsx(de,{title:`人工验收 · ${n.job_id}`,className:"capacity-page",onClose:t,submitLabel:"保存人工标记",onSubmit:async()=>{const o=sl(s);try{await r.saveReview(n.job_id,o)}catch(l){throw Error(`保存失败：${re(l)}`)}},children:e.jsxs("div",{className:"review-form",children:[e.jsxs("p",{children:["任务 ",n.job_id,"；原采集来源：",ye(n.source),"。"]}),e.jsxs("div",{className:"review-fields",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"人工合格产物数量（留空为未验收）"}),e.jsx("input",{name:"accepted",type:"number",min:"0",step:"1",value:s.accepted,onChange:o=>a("accepted",o.target.value)})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"人工样本标签"}),e.jsxs("select",{name:"source",value:s.source,onChange:o=>a("source",o.target.value),children:[e.jsx("option",{value:"business",children:"业务样本"}),e.jsx("option",{value:"standard",children:"标准样本（人工声明）"})]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"标准场景编号（标准样本请填写）"}),e.jsx("input",{name:"benchmark_id",maxLength:100,value:s.benchmark_id,onChange:o=>a("benchmark_id",o.target.value)})]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"验收备注 / 固定条件说明"}),e.jsx("textarea",{name:"note",rows:2,maxLength:500,value:s.note,onChange:o=>a("note",o.target.value)})]}),e.jsx("p",{className:"notice",children:"此操作只保存人工声明，不会自动确认技术规格、缓存条件或标准测试通过；不会将历史记录补写为完整采集证据。"})]})})}function cl({confirmation:n,onClose:r}){return e.jsx(de,{title:`确认受控补采 · ${n.detail.job_id}`,className:"capacity-page",onClose:r,submitLabel:"确认本批补采",onSubmit:n.submit,children:e.jsxs("div",{className:"capacity-operation",children:[e.jsxs("p",{className:"notice",children:["任务 ",n.detail.job_id,"；本批偏移 ",n.offset,"，最多处理 4 个可信最终产物。"]}),e.jsx("p",{children:"补采仅添加成品尺寸证据，不修改技术资格、原生成参数、人工合格量或标准标签。最终清单由服务端核验；不会扫描目录，也不会从请求猜测尺寸。"}),e.jsxs("details",{children:[e.jsx("summary",{children:"本页已记录的最终产物（最终以服务端可信清单为准）"}),e.jsx("pre",{children:L(n.detail.outputs)})]})]})})}function dl({detail:n,controller:r,onConfirm:t}){const[s,i]=d.useState(0),[a,o]=d.useState(""),[l,p]=d.useState(!1),c=d.useRef(!0),u=d.useRef(!1),g=d.useRef(0);d.useEffect(()=>(c.current=!0,()=>{c.current=!1}),[]);const x=async(m,_)=>{if(!c.current||!r.probeCurrent(_)||g.current!==m)throw Error("证据页面或批次已变化，请关闭后重新打开。");if(u.current)throw Error("正在补采，请勿重复提交。");u.current=!0,p(!0),o("正在补采本批成品尺寸…"),r.invalidateEstimate("成品尺寸正在补采，旧测算已清除。");try{const y=await r.probe(n.job_id,m);if(!c.current)return;g.current=y.next_offset,i(y.next_offset),o(`本批处理 ${E(y.processed)} 个，成功记录尺寸 ${E(y.recorded)} 个；可信最终产物共 ${E(y.total)} 个。${y.next_offset===null?"补采已完成，刷新看板查看结果。":"尚有后续产物，请点击继续补采；刷新看板查看结果。"}`)}catch(y){const N=`补采失败：${re(y)}${y instanceof Nr&&y.status===409?"。没有可信最终产物记录，不能猜测成品尺寸。":""}`;throw c.current&&o(N),Error(N)}finally{u.current=!1,c.current&&p(!1)}};return e.jsxs("div",{className:"output-probe",children:[e.jsx("p",{className:"hint",children:"仅按可信最终产物清单补采，每次最多 4 个；不会从输入素材或请求参数猜测尺寸。"}),e.jsx("button",{type:"button",disabled:l||s===null,onClick:()=>{if(u.current||s===null||!c.current)return;const m=s,_=r.probeVersion();t({detail:n,offset:m,submit:()=>x(m,_)})},children:s===null?"补采已完成":s>0?"继续补采成品尺寸":"补采成品尺寸"}),e.jsx("p",{className:"hint",role:"status",children:a})]})}function pl({detail:n,report:r,controller:t,onReview:s,onProbe:i}){const[a,o]=d.useState(!1);return e.jsxs("details",{className:"evidence","data-job-id":n.job_id,onToggle:l=>{l.currentTarget.open&&o(!0)},children:[e.jsxs("summary",{children:[e.jsx("strong",{children:n.job_id}),e.jsx("span",{className:"badge",children:ye(n.source)}),e.jsx("span",{children:` ${Xn[n.status]||n.status} / ${n.capability} / ${rr(n.worker_id,n.worker_name,r.workers,r.groups)} / ${Ge(n.created_at)}`})]}),e.jsx("div",{className:"evidence-content",children:a&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["任务 runtime：",le(n.runtime_seconds),"；占机：",le(n.occupied_seconds),"；原分组：",L(n.group_id)]}),e.jsx(Nn,{values:n.warnings}),e.jsx("div",{className:"f-grid3",children:[["输入素材",wn(n).join(" / ")],["生成参数",kn(n,!0)],["技术与人工口径","技术资格以原采集证据及服务端校验为准；尺寸补采与人工标签不修改它。"]].map(([l,p])=>e.jsxs("div",{children:[e.jsx("h3",{children:l}),e.jsx("p",{children:p})]},l))}),e.jsx(hn,{title:"执行尝试（包含重试）",value:n.attempts}),e.jsx("h3",{children:"实际输出证据"}),n.outputs?.length?e.jsx(tr,{headers:["产物标识","类型","实际尺寸","视频时长","技术记录"],children:n.outputs.map((l,p)=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("span",{children:l.key||l.id||"未记录"})}),e.jsx("td",{children:e.jsx("span",{children:L(l.kind)})}),e.jsx("td",{children:e.jsx("span",{children:Fo(l)})}),e.jsx("td",{children:e.jsx("span",{children:le(l.duration)})}),e.jsx("td",{children:e.jsx("span",{children:l.valid===!0?"采集记录标记有效":l.valid===!1?"未通过 / 待确认":"未记录"})})]},p))}):e.jsx("p",{className:"notice",children:"最终产物清单未记录；不能按请求猜测，也不按零产物处理。"}),e.jsx(hn,{title:"实际输出原始证据",value:n.outputs}),e.jsxs("p",{children:["人工合格数量：",E(n.review?.accepted),"；样本标签：",Ho(n),"；标准场景编号：",L(n.review?.benchmark_id),"；备注：",L(n.review?.note)]}),e.jsx(mt,{resolution:n.output_resolution}),e.jsx(hn,{title:"成品尺寸原始证据",className:"output-resolution-raw",value:{output_resolution:n.output_resolution,recovered_outputs:n.recovered_outputs}}),n.status==="done"&&e.jsx(dl,{detail:n,controller:t,onConfirm:i}),["captured","standard"].includes(n.source)?e.jsx("button",{className:"review-open",type:"button",onClick:()=>s(n),children:"人工验收 / 样本标签"}):e.jsx("p",{className:"hint",children:"历史任务不能补写为完整采集证据，不提供采集验收表单。"})]})})]})}function ul({controller:n,onReview:r,onProbe:t}){const s=n.getSnapshot(),{report:i,evidence:a,filters:o,ready:l}=s,p=s.mounted.has("evidence")&&i!==null,c=!l||a.busy||a.failed||!p;return e.jsxs("section",{"aria-labelledby":"evidence-heading",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{id:"evidence-heading",children:"任务证据与人工标记"}),e.jsx("span",{id:"detail-count",className:"hint",children:p&&(a.failed?"筛选未完成":a.busy?"":`当前 ${a.records.length} / 总计 ${E(a.total)} 条；聚合不受分页截断`)})]}),e.jsx("p",{className:"hint pad",children:"明细每页最多 100 条。人工验收 / 标准样本是人工声明，不等于系统自动验证通过；历史记录不可补写为完整采集证据。"}),e.jsx("div",{id:"evidence-filters",children:p&&e.jsxs("div",{className:"evidence-filters",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"独立原分组（按真实 group_id）"}),e.jsxs("select",{id:"evidence-group",disabled:!l,value:o.group,onChange:u=>n.filter({group:u.target.value}),children:[e.jsx("option",{value:"",children:"全部原分组"}),i.groups.map(u=>e.jsx("option",{value:u.id,children:`${Ue(u)} / ${rr(u.worker_id,u.worker_name,i.workers,i.groups)} / ${ye(u.source)} / ${u.config_id||"配置未知"} / ${u.id}`},u.id))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"任务状态"}),e.jsxs("select",{id:"evidence-status",disabled:!l,value:o.status,onChange:u=>n.filter({status:u.target.value}),children:[e.jsx("option",{value:"",children:"全部状态"}),[["done","已完成"],["error","失败"],["canceled","已取消"],["queued","排队中"],["running","运行中"]].map(([u,g])=>e.jsx("option",{value:u,children:g},u))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"采集来源"}),e.jsxs("select",{id:"evidence-source",disabled:!l,value:o.source,onChange:u=>n.filter({source:u.target.value}),children:[e.jsx("option",{value:"",children:"全部来源"}),["historical","captured","standard"].map(u=>e.jsx("option",{value:u,children:ye(u)},u))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"每页最多 100 条"}),e.jsx("select",{id:"evidence-size",disabled:!l,value:o.size,onChange:u=>n.filter({size:Number(u.target.value)}),children:[100,50,25,10].map(u=>e.jsxs("option",{value:u,children:[u," 条 / 页"]},u))})]})]})}),e.jsx("p",{id:"evidence-state",className:"hint pad",role:"status",hidden:!a.state,children:a.state}),e.jsx("div",{id:"details",children:p&&!a.busy&&!a.failed&&(a.records.length?a.records.map(u=>e.jsx(pl,{detail:u,report:i,controller:n,onReview:r,onProbe:t},u.job_id)):e.jsx("p",{className:"empty",children:"当前页没有任务证据。可立即刷新，或返回上一页。"}))}),e.jsxs("div",{className:"pager",children:[e.jsx("button",{id:"previous",disabled:c||a.start===0,onClick:()=>n.page(-1),children:"上一页"}),e.jsx("span",{id:"page-note",className:"hint",children:p&&!a.busy&&!a.failed&&`第 ${Math.floor(a.start/a.size)+1} 页`}),e.jsx("button",{id:"next",disabled:c||a.start+a.size>=a.total,onClick:()=>n.page(1),children:"下一页"})]})]})}function ml(n,r){const t=n.workers.filter(we);return t.find(s=>s.id===r)?.id||t.find(s=>Sn(n,s.id).length)?.id||t[0]?.id||""}function kr(n,r,t){const s=Sn(n,r);return{id:t,mode_id:$e.find(i=>s.some(a=>i.capabilities.includes(a.capability)))?.id||"",quantity:""}}function hl(n,r,t){const[s,i]=d.useState({report:null,worker:"",demands:[],next:1}),[a,o]=d.useState("8"),[l,p]=d.useState("");if(t&&r&&r!==s.report){const w=ml(r,s.worker);i({report:r,worker:w,demands:[kr(r,w,s.next)],next:s.next+1})}const c=r?Sn(r,s.worker):[],u=()=>n.invalidateEstimate(),g=w=>{r&&(i({...s,worker:w,demands:[kr(r,w,s.next)],next:s.next+1}),u())},x=(w,h)=>{i({...s,demands:s.demands.map(b=>b.id===w?{...b,...h}:b)}),u()},m=w=>{i({...s,demands:s.demands.filter(h=>h.id!==w)}),u()},_=w=>{const h=$e.find(b=>b.id===w);return!!(h&&c.some(b=>h.capabilities.includes(b.capability)))};return{inputs:s,groups:c,hours:a,price:l,worker:g,update:x,remove:m,available:_,add:()=>{if(!n.getSnapshot().ready)return;const w=$e.find(h=>!s.demands.some(b=>b.mode_id===h.id)&&_(h.id));w&&(i({...s,demands:[...s.demands,{id:s.next,mode_id:w.id,quantity:""}],next:s.next+1}),u())},submit:async()=>{n.invalidateEstimate("正在计算…");const w=n.getSnapshot().snapshot;try{if(!r||!n.getSnapshot().ready||!w)throw Error("请先点击立即刷新并成功读取证据。");await n.estimate(rl(r,w.range,s.worker,a,l,s.demands))}catch(h){n.estimateFailure(re(h))}},setHours:w=>{o(w),u()},setPrice:w=>{p(w),u()}}}function xl(n){const[r,t]=d.useState("");return d.useEffect(()=>{if(!n)return;const s=URL.createObjectURL(new Blob([il(n)],{type:"text/csv;charset=utf-8"}));return t(s),()=>URL.revokeObjectURL(s)},[n]),n?r:""}function fl({saved:n,report:r}){const{result:t,payload:s,groups:i}=n;return e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"warn",children:"成功任务处理参考，不是合格产物日产量或采购承诺"}),e.jsxs("p",{className:"result-number",children:["参考机器数：",E(t.machines)," 台"]}),e.jsxs("p",{children:["每日所需参考运行时间：",le(t.total_seconds)]}),e.jsxs("p",{children:["单机每日可用容量时间：",le(t.daily_capacity_seconds)]}),e.jsxs("p",{children:["整机采购小计：",B(t.price_total)?`¥${E(t.price_total)}`:"未计价"]}),e.jsx(tr,{headers:["业务模式","每日需求","平均任务耗时","单机场景参考日处理量"],children:t.lines.map((a,o)=>{const l=qn(i.find(p=>p.id===a.group_id)?.capability);return e.jsxs("tr",{children:[e.jsx("td",{className:"wide",children:e.jsx("span",{children:l?`${l.type} · ${l.label}`:"业务模式"})}),e.jsx("td",{children:e.jsxs("span",{children:[E(a.quantity)," 任务/天"]})}),e.jsx("td",{children:e.jsx("span",{children:le(a.seconds_per_unit)})}),e.jsx("td",{children:e.jsxs("span",{children:[E(a.daily_units)," 任务/天"]})})]},o)})}),e.jsx("p",{className:"hint",children:"每个模式只参考自动选中的一个实测分组，不保证任意模型、尺寸或缓存规格的产能。"}),e.jsxs("details",{children:[e.jsx("summary",{children:"计算依据"}),e.jsx("h3",{children:"警告与覆盖限制"}),e.jsx(Nn,{values:t.warnings}),e.jsx("p",{className:"hint",children:"仅按成功任务平均 runtime 估算；不含完整失败、准备、重试或质量损耗。按同一电脑、配置和来源选择具体原分组，不合并均值。"}),e.jsx("p",{className:"hint",children:"台数 = 向上取整〔各模式任务数量 × 平均任务耗时之和 ÷（小时 × 3600 × 可用时间比例 × 生产容量比例）〕。容量预留不是 GPU 利用率；业务组合与模型切换可能增加损耗，不保证峰值 SLA。"}),s.demands.map(a=>{const o=i.find(l=>l.id===a.group_id);return o&&e.jsxs("div",{children:[e.jsx("h3",{children:qn(o.capability)?.label||"业务模式"}),e.jsxs("p",{children:[it(o)," / ",L(o.spec_key),"：",ye(o.source),"；样本"," ",E(o.samples),"；",E(Zn(o))," 天；配置 ",L(o.config_id),o.source==="standard"?`；标准场景编号 ${L(o.benchmark_id)}`:""]}),e.jsx(ht,{g:o})]},o.id)}),e.jsx("h3",{children:"计算假设"}),e.jsx("pre",{children:L(t.assumptions)}),e.jsxs("p",{className:"hint",children:["Worker ID：",s.worker_id,"；当前在线仅为本次数据快照，不承诺未来状态；当前配置仅作清单参考：",rn(r.workers.find(a=>a.id===s.worker_id)?.hardware),"；时间：全部历史 至 ",Ge(s.to),"；",s.hours," 小时 / 可用"," ",E(s.availability*100),"% / 生产容量 ",E(s.utilization*100),"%"]})]})]})}function gl({controller:n}){const r=n.getSnapshot(),{report:t,ready:s,estimate:i,estimateError:a,estimateNote:o,estimating:l}=r,p=r.mounted.has("purchase")&&t!==null,c=hl(n,t,p),{inputs:u,groups:g}=c,x=d.useRef(null),m=xl(i),_=t?.workers.filter(we)||[],y=!s||!g.length||!u.demands.length||l,N=s?_.some(w=>w.id===u.worker)?g.length?"":"这台电脑暂无这些模式的成功耗时记录，请换一台电脑。":"当前没有在线电脑，请稍后刷新。":"请先刷新并读取电脑状态。";return e.jsxs("div",{className:"procurement",children:[e.jsxs("section",{className:"section",children:[e.jsx("div",{className:"section-head",children:e.jsx("h2",{children:"每日多场景需求"})}),e.jsxs("form",{id:"estimate-form",className:"pad",onSubmit:w=>{w.preventDefault(),w.currentTarget.reportValidity()&&c.submit()},children:[e.jsxs("div",{className:"form-grid",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"电脑显卡配置选择"}),e.jsx("select",{id:"estimate-worker",required:!0,disabled:!s,value:u.worker,onChange:w=>{s&&c.worker(w.target.value)},children:p&&(_.length?_.map(w=>e.jsx("option",{value:w.id,children:w.name||"未命名电脑"},w.id)):e.jsx("option",{value:"",children:"暂无在线电脑"}))})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"每日计划生产小时"}),e.jsx("input",{id:"hours",type:"number",min:"0.1",max:"24",step:"0.1",value:c.hours,required:!0,onChange:w=>c.setHours(w.target.value)})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"整机报价（元，可选）"}),e.jsx("input",{id:"price",type:"number",min:"0",step:"0.01",placeholder:"未填写则不计价格",value:c.price,onChange:w=>c.setPrice(w.target.value)})]})]}),e.jsx("p",{id:"mode-note",className:"notice",children:"按成功任务平均执行耗时参考，不是合格产物日产量或采购承诺。"}),e.jsx("p",{className:"hint",children:"固定按 100% 可用时间、75% 生产容量计算（预留 25% 应对波动）；每日数量按任务/天填写。"}),e.jsxs("div",{children:[e.jsx("h3",{children:"每日需求"}),e.jsx("p",{id:"demand-note",className:"hint",role:"status",children:p&&N}),e.jsx("div",{id:"demands",children:p&&u.demands.map(w=>e.jsxs("div",{className:"demand",children:[e.jsx("select",{className:"demand-group",required:!0,"aria-label":"需求业务模式",disabled:!s||!w.mode_id,value:w.mode_id,onChange:h=>{s&&c.update(w.id,{mode_id:h.target.value})},children:["生图模式","生视频模式"].map(h=>e.jsx("optgroup",{label:h,children:$e.filter(b=>b.type===h).map(b=>e.jsxs("option",{value:b.id,disabled:!c.available(b.id)||u.demands.some(k=>k.id!==w.id&&k.mode_id===b.id),children:[b.type," · ",b.label]},b.id))},h))}),e.jsx("input",{className:"demand-quantity",type:"number",min:"0.01",step:"any",required:!0,placeholder:"任务/天","aria-label":"每日需求数量（任务/天）",disabled:!s||!w.mode_id,value:w.quantity,onChange:h=>c.update(w.id,{quantity:h.target.value})}),e.jsx("button",{type:"button",onClick:()=>c.remove(w.id),children:"移除"})]},w.id))}),e.jsx("button",{id:"add-demand",type:"button",disabled:!p||!s||!$e.some(w=>!u.demands.some(h=>h.mode_id===w.id)&&c.available(w.id)),onClick:c.add,children:"增加场景"})]}),e.jsx("button",{id:"estimate-submit",className:"primary",type:"submit",disabled:!p||y,children:"计算机器需求"})]})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"测算结果与依据"}),e.jsx("button",{id:"export-estimate",disabled:!i||!m,onClick:()=>{n.getSnapshot().estimate&&x.current?.click()},children:"导出测算 CSV"}),e.jsx("a",{ref:x,hidden:!0,href:m||void 0,download:"capacity-estimate.csv",children:"下载测算 CSV"})]}),e.jsx("div",{id:"estimate-error",className:"error",role:"alert",hidden:!a,children:a}),e.jsx("div",{id:"estimate-result",className:"pad","aria-live":"polite",children:i&&t?e.jsx(fl,{saved:i,report:t}):e.jsx("p",{className:"muted",children:o})})]})]})}const Le=[{id:"machines",label:"机器产能"},{id:"scenarios",label:"场景对比"},{id:"purchase",label:"采购测算"}];function bl(n){const{controller:r,state:t}=Lo(n),{report:s,ready:i,revision:a,mounted:o}=t,[l,p]=d.useState(!1),[c,u]=d.useState(""),[g,x]=d.useState(null),[m,_]=d.useState(null),[y,N]=d.useState(null),w=d.useRef(null),h=d.useRef(null),b=d.useRef([]),[k,R]=d.useState(!1);d.useEffect(()=>{k&&t.tab==="purchase"&&(h.current?.focus(),R(!1))},[k,t.tab]);const D=(f="")=>{r.getSnapshot().ready&&(r.showEvidence(f),w.current?.scrollIntoView({block:"start"}))},C=o.has("scenarios")&&s?Vo(s.groups):[],P=C.some(([f])=>f===c)?c:C[0]?.[0]||"";s&&o.has("scenarios")&&c!==P&&u(P);const T=s?.overview||{};return e.jsxs("main",{id:"main-content",className:"page capacity-page",tabIndex:-1,children:[e.jsxs("header",{className:"page-header card",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"产能评估"}),e.jsx("p",{className:"subtitle",children:"真实任务与独立规格分组，查看机器产能、证据和每日需求。"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{id:"refresh-state",className:"state",role:"status",children:t.refreshState})})]}),e.jsx("div",{className:"header-actions",children:e.jsx("button",{id:"refresh",type:"button",onClick:()=>{r.load()},children:"立即刷新"})})]}),e.jsx("div",{id:"error",className:"error",role:"alert",hidden:!t.error,children:t.error}),e.jsx("div",{id:"write-status",className:"write-status",role:"status",hidden:!t.writeStatus,children:t.writeStatus}),e.jsx("div",{className:"tabs",role:"tablist","aria-label":"产能评估视图",children:Le.map((f,v)=>e.jsx("button",{id:`tab-${f.id}`,role:"tab",type:"button",ref:j=>{b.current[v]=j},"aria-selected":t.tab===f.id,"aria-controls":`panel-${f.id}`,tabIndex:t.tab===f.id?0:-1,onClick:()=>r.activate(f.id),onKeyDown:j=>{const S=j.key==="ArrowRight"?(v+1)%Le.length:j.key==="ArrowLeft"?(v+Le.length-1)%Le.length:j.key==="Home"?0:j.key==="End"?Le.length-1:void 0;if(S===void 0)return;const $=Le[S];$&&(j.preventDefault(),r.activate($.id),b.current[S]?.focus())},children:f.label},f.id))}),e.jsx("div",{id:"capacity-stats",className:"metrics","aria-label":"产能数据概览",children:s&&e.jsx(Fn,{items:[["当前在线电脑",s.workers.filter(we).length],["真实任务记录",T.tasks],["独立原规格组",s.groups.length],["产物清单未知任务",T.unknown_outputs]]})}),e.jsxs("section",{id:"panel-machines",role:"tabpanel","aria-labelledby":"tab-machines",tabIndex:0,hidden:t.tab!=="machines",children:[e.jsxs("section",{id:"machine-summary","aria-label":"在线机器业务简览",children:[e.jsxs("div",{className:"summary-toolbar",children:[e.jsx("h2",{id:"online-count",children:s?`当前在线 ${s.workers.filter(we).length} 台`:"当前在线 — 台"}),e.jsxs("label",{className:"offline-toggle",children:[e.jsx("input",{id:"include-offline",type:"checkbox",checked:l,disabled:!i,onChange:f=>{i&&p(f.target.checked)}}),"包含离线"]})]}),e.jsx("p",{className:"summary-note hint",children:"在线状态是当前状态；业务为全部历史记录中跑过的业务，不代表当前均可执行。平均生成时间仅计成功任务执行耗时，不含排队，非纯 GPU 耗时，也不是合格日产能。同一业务的任务规格、模型或采样条件不同，不能直接按耗时做性能排名。"}),e.jsx("div",{id:"summary-machines",children:o.has("machines")&&s&&e.jsx(Ko,{report:s,ready:i,includeOffline:l,onProfile:x,onEvidence:D},`${a}-${l}`)}),e.jsxs("div",{className:"matrix-actions",children:[e.jsx("button",{type:"button",id:"open-purchase",onClick:()=>{r.activate("purchase"),R(!0)},children:"进入多模式采购测算"}),e.jsx("button",{type:"button",id:"open-evidence",disabled:!i,onClick:()=>D(),children:"展开全部任务证据"})]})]}),e.jsxs("details",{id:"technical-details",className:"section advanced",open:t.technicalOpen,onToggle:f=>r.technical(f.currentTarget.open),children:[e.jsx("summary",{children:"详细统计与机器配置"}),e.jsx(Yo,{report:s,mounted:o.has("technical"),onProfile:x},a)]})]}),e.jsx("section",{id:"panel-scenarios",role:"tabpanel","aria-labelledby":"tab-scenarios",tabIndex:0,hidden:t.tab!=="scenarios",children:e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"同场景证据对比"}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"业务 / 精确规格 / 来源"}),e.jsx("select",{id:"scenario-filter",disabled:!i,value:P,onChange:f=>{i&&u(f.target.value)},children:o.has("scenarios")&&(C.length?C.map(([f,v])=>e.jsx("option",{value:f,children:v},f)):e.jsx("option",{value:"",children:"暂无场景"}))})]})]}),e.jsx("p",{className:"notice hint",children:"只并列相同业务、规格键与证据来源。历史配置、模型版本或缓存条件缺失时，不视为受控跑分；未测试的配置不能按显存或价格推算。"}),e.jsx("div",{id:"scenario-groups",children:o.has("scenarios")&&s&&e.jsx(xt,{groups:s.groups.filter(f=>dt(f)===P),report:s},`${a}-${P}`)})]})}),e.jsx("section",{id:"panel-purchase",ref:h,role:"tabpanel","aria-labelledby":"tab-purchase",tabIndex:0,hidden:t.tab!=="purchase",children:e.jsx(gl,{controller:r})}),e.jsxs("details",{id:"task-evidence",ref:w,className:"section advanced",open:t.evidenceOpen,onToggle:f=>r.evidenceOpen(f.currentTarget.open),children:[e.jsx("summary",{children:"任务证据与人工标记"}),e.jsx(ul,{controller:r,onReview:_,onProbe:N},a)]}),g&&e.jsx(ol,{worker:g,controller:r,onClose:()=>x(null)},g.id),m&&e.jsx(ll,{detail:m,controller:r,onClose:()=>_(null)},m.job_id),y&&e.jsx(cl,{confirmation:y,onClose:()=>N(null)})]})}const yl=`:root {\r
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
`,jl=`.permissions-page .permissions-grid {\r
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
`,vl=`/* 页面样式只作用于产能主区及产能对话框，不覆盖共享侧栏。 */\r
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
`,_l=`@scope (.admin-page) {
${yl.replace(/:root\b/g,":scope").replace(/^body \{/m,":scope {").replace(/body\.admin-page\b/g,":scope").replace(/\.admin-page\b/g,":scope")}
${jl.replace(/\.permissions-page\b/g,":scope.permissions-page")}
${vl}
}`;function an({page:n,children:r}){const t=kt();return d.useLayoutEffect(()=>{const s=document.body;return s.dataset.choukaPage=n,s.dataset.workspace=n,()=>{s.dataset.choukaPage===n&&delete s.dataset.choukaPage,s.dataset.workspace===n&&delete s.dataset.workspace}},[n]),d.useEffect(()=>{let s=!0;return t.auth.me().then(()=>{if(!s)return;const i=document.getElementById("account");i&&!i.childElementCount&&t.auth.mountAccount(i);for(const a of document.querySelectorAll("#workspace-nav a"))new URL(a.href).pathname===location.pathname?a.setAttribute("aria-current","page"):a.removeAttribute("aria-current")}).catch(()=>{}),()=>{s=!1}},[t,n]),e.jsxs(e.Fragment,{children:[e.jsx("style",{children:_l}),e.jsx(is,{page:n,workspace:!0,children:r})]})}function Cl(){return e.jsx(an,{page:"controller",children:n=>e.jsx(ji,{...n})})}function zl(){return e.jsx(an,{page:"permissions",children:n=>e.jsx(Hi,{...n})})}function El(){return e.jsx(an,{page:"skills",children:n=>e.jsx(Xi,{...n})})}function Ml(){return e.jsx(an,{page:"costs",children:n=>e.jsx(vo,{...n})})}function Pl(){return e.jsx(an,{page:"capacity",children:n=>e.jsx(bl,{...n})})}export{Pl as CapacityWorkspace,Cl as ControllerWorkspace,Ml as CostsWorkspace,zl as PermissionsWorkspace,El as SkillsWorkspace};
