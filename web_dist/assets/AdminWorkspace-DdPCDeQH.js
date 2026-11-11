import{HttpClient as Nt,reactExports as d,errorMessage as ie,jsxRuntimeExports as e,ApiError as Pr}from"./http-CceZLADw.js";import{createSessionService as St,userSchema as $t,accountProfile as Ct,LoadingRequest as zt,dinghaiProfileSchema as Et,jsonSchema as te,useWorkspaceRuntime as Mt}from"./main-CUcP8VQT.js";import{object as F,number as V,boolean as X,_enum as Pe,strictObject as Vn,string as z,literal as me,looseObject as ne,array as W,unknown as Ir,union as we,ipv4 as Pt,record as jn,uuid as It,discriminatedUnion as Rt,NEVER as Tt,_null as Rr}from"./monitor-alerts-BXpxzu-0.js";import{reactDomExports as Lt,skillIdSchema as At,publishedSkillSchema as vn,skillMetadataSchema as Dt,skillReferencePathSchema as Ot}from"./skills-DHFahLVd.js";import{createTeamService as Ft}from"./teams-B1wDiWSd.js";const qt=F({maintenance_active:X().optional(),comfy_online:X().optional(),sandbox:X().optional()}),Ut=F({online_users:V().finite().nonnegative()}),Wt=F({user:$t});function Bt({fetcher:n=window.fetch.bind(window),origin:r=window.location.origin,onExpired:t,onSandbox:s,onDenied:a=()=>{}}){let i=!1;const o=async(f,u)=>{const x=await n(f,u);return i||(x.headers.get("X-H3Card-Sandbox")==="local-copy"&&s(),x.status===403&&a()),x},l=new Nt(o,r,()=>{i||t()});let p,c;const m=new Set;return{http:l,session:St(l),health(){if(p)return p;const f=new AbortController;m.add(f);const u=window.setTimeout(()=>f.abort(),4e3);return p=l.read("/api/health",qt,{cache:"no-store",signal:f.signal}).then(x=>(!i&&x.sandbox===!0&&s(),x)).finally(()=>{window.clearTimeout(u),m.delete(f),p=void 0}),p},presence(){return c??=l.json("/api/auth/presence","POST").then(f=>Ut.parse(f)).finally(()=>{c=void 0}),c},async savePhone(f){const u=f.trim();if(!/^1[3-9][0-9]{9}$/.test(u))throw new Error("请输入有效的 11 位中国大陆手机号");const x=Wt.parse(await l.json("/api/auth/phone","POST",{phone:u})).user;if(!x.phone)throw new Error("手机号尚未保存，请重试");return x},async changePassword(f,u,x){if(u.length<8)throw new Error("新密码至少需要 8 位");if(u!==x)throw new Error("两次输入的新密码不一致");await l.json("/api/auth/password","POST",{current_password:f,new_password:u})},dispose(){i=!0,m.forEach(f=>f.abort()),m.clear(),l.invalidate()}}}function Vt(n,r){return n.local_login_enabled!==!1&&!r&&n.phone===""}function lr(n){return n==="admin"?null:n==="monitor"?"/monitor":"/"}function ln(n){return n.maintenance_active!==!0?"clear":n.comfy_online===!0?"partial":"blocked"}function Ht(n){const[r,t]=d.useState(null),[s,a]=d.useState(!1),[i,o]=d.useState(""),[l,p]=d.useState(0);d.useEffect(()=>{let u=!1,x=!1,w=()=>{};const y=()=>document.hidden?new Promise(b=>{const S=()=>{document.hidden&&!u||(document.removeEventListener("visibilitychange",S),b())};document.addEventListener("visibilitychange",S),w=()=>{document.removeEventListener("visibilitychange",S),b()}}):Promise.resolve(),N=()=>{u||(u=!0,h.dispose(),t(null),o("登录已失效，请重新登录"),n("/login"))},j=b=>{const S=lr(b.role);return S?(u=!0,h.dispose(),t(null),n(S),!1):!0},h=Bt({onExpired:N,onSandbox:()=>{u||a(!0)},onDenied:()=>{u||x||(x=!0,h.session.me().then(b=>{!u&&j(b.user)&&t(S=>S&&{...S,user:b.user,localTest:b.local_test===!0})}).catch(()=>{}).finally(()=>{x=!1}))}});return t(null),o(""),a(!1),(async()=>{try{const b=await h.session.me();if(u||!j(b.user)||(await y(),u))return;const S=await h.health().catch(()=>({}));u||t({user:b.user,localTest:b.local_test===!0,services:h,initialHealth:S})}catch(b){u||o(ie(b))}})(),()=>{u=!0,w(),h.dispose()}},[l,n]);const c=d.useCallback(()=>p(u=>u+1),[]),m=d.useCallback(u=>{const x=lr(u.role);x?(r?.services.dispose(),t(null),n(x)):t(w=>w&&{...w,user:u})},[r,n]),f=d.useCallback(()=>{r?.services.dispose(),t(null),o("登录已失效，请重新登录"),n("/login")},[r,n]);return{session:r,sandbox:s,error:i,retry:c,updateUser:m,expire:f}}function Gt(n,r,t=!0){const[s,a]=d.useState(null),[i,o]=d.useState(()=>ln(r)),[l,p]=d.useState(()=>ln(r)!=="clear");return d.useEffect(()=>{if(!t)return;let c=!0,m=ln(r),f;const u=()=>{f=window.setTimeout(()=>{c&&p(!1)},5e3)};m==="partial"&&u();const x=()=>{document.hidden||n.presence().then(h=>{c&&a(h.online_users)}).catch(()=>{})},w=()=>{document.hidden||n.health().then(h=>{if(!c)return;const b=ln(h);b!==m&&(m=b,window.clearTimeout(f),o(b),p(b!=="clear"),b==="partial"&&u())}).catch(()=>{})};x();const y=window.setInterval(x,3e4),N=window.setInterval(w,5e3),j=()=>{document.hidden||(x(),w())};return document.addEventListener("visibilitychange",j),()=>{c=!1,window.clearTimeout(f),window.clearInterval(y),window.clearInterval(N),document.removeEventListener("visibilitychange",j)}},[n,r,t]),{online:s,maintenance:i,maintenanceVisible:l}}const Jt={dashboard:"M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1",costs:"M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2M14 11h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-2.5M12 17v1m0 -8v1",capacity:"M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14M4 20h14",permissions:"M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0M8 11v-4a4 4 0 1 1 8 0v4",skills:"M12 6a8 8 0 0 0 -8 -2v15a8 8 0 0 1 8 2m0 -15a8 8 0 0 1 8 -2v15a8 8 0 0 0 -8 2m0 -15v15",teams:"M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0 -3 -3.85",refresh:"M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4",chevron:"M9 6l6 6l-6 6",external:"M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6M11 13l9 -9M15 4h5v5",logout:"M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2M9 12h12l-3 -3M18 15l3 -3",check:"M5 12l4 4l10 -10",info:"M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0 -18M12 11v6M12 7h.01",alert:"M12 9v4M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0M12 16h.01"};function Qe({name:n,className:r="",...t}){return e.jsx("svg",{className:`icon ${r}`,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.7,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",...t,children:e.jsx("path",{d:Jt[n]})})}const Zt="_application_gguf9_1",Kt="_workspace_gguf9_12",Yt="_sandbox_gguf9_15",Xt="_navigation_gguf9_18",Qt="_accountMenu_gguf9_225",es="_infoRow_gguf9_281",ns="_dialog_gguf9_295",rs="_maintenance_gguf9_361",ts="_notifications_gguf9_409",ss="_notificationItem_gguf9_441",as="_notificationHeading_gguf9_466",is="_notificationIcon_gguf9_477",os="_notificationMessage_gguf9_495",ls="_notificationLabel_gguf9_504",ge={application:Zt,workspace:Kt,sandbox:Yt,navigation:Xt,accountMenu:Qt,infoRow:es,dialog:ns,maintenance:rs,notifications:ts,notificationItem:ss,notificationHeading:as,notificationIcon:is,notificationMessage:os,notificationLabel:ls},cs={error:"alert",warning:"alert",success:"check",status:"info"},ds={error:"错误",warning:"警告",success:"成功",status:"提示"},Tr=d.createContext({notify:()=>{},registerModal:()=>()=>{}}),Lr=()=>d.useContext(Tr);function ps({children:n}){const[r,t]=d.useState([]),[s,a]=d.useState([]),i=d.useCallback(p=>(a(c=>[...c,p]),()=>a(c=>c.filter(m=>m!==p))),[]),o=d.useCallback(p=>{const c=typeof p=="string"?{message:p,tone:"status"}:p instanceof Error?{message:p.message,tone:"error"}:{message:p.message,tone:p.tone??"status"};t(m=>m.some(f=>f.message===c.message&&f.tone===c.tone)?m:[...m,c])},[]),l=s.at(-1)??document.body;return e.jsxs(Tr.Provider,{value:{notify:o,registerModal:i},children:[n,r.length>0&&Lt.createPortal(e.jsx(us,{notices:r,dismiss:p=>t(c=>c.filter(m=>m!==p)),clear:()=>t([])}),l)]})}function us({notices:n,dismiss:r,clear:t}){const s=d.useRef(null);d.useEffect(()=>{const o=s.current;if(o?.isConnected)return o.showPopover?.(),()=>{o.isConnected&&o.hidePopover?.()}},[]);const a=o=>{const l=s.current?.contains(document.activeElement),p=s.current?.parentElement;o(),l&&queueMicrotask(()=>{(s.current?.querySelector("button")??p?.querySelector("[data-operation-status],button")??document.querySelector("main"))?.focus({preventScroll:!0})})},i=["error","warning","success","status"].find(o=>n.some(l=>l.tone===o))??"status";return e.jsxs("section",{id:"admin-notifications","data-tone":i,ref:s,popover:"manual",className:ge.notifications,"aria-label":"操作通知",children:[e.jsxs("div",{className:ge.notificationHeading,children:[e.jsx(Qe,{name:cs[i],className:ge.notificationIcon}),e.jsx("strong",{children:"操作通知"}),e.jsx("button",{type:"button","aria-label":"关闭全部通知",onClick:()=>a(t),children:"全部关闭"})]}),n.map(o=>e.jsxs("div",{className:ge.notificationItem,"data-tone":o.tone,children:[e.jsxs("p",{className:ge.notificationMessage,role:o.tone==="error"?"alert":"status","aria-atomic":"true",children:[e.jsx("span",{className:ge.notificationLabel,children:ds[o.tone]}),o.message]}),e.jsx("button",{type:"button","aria-label":`关闭通知：${o.message}`,onClick:()=>a(()=>r(o)),children:"×"})]},`${o.tone}:${o.message}`))]})}function he({title:n,children:r,onClose:t,onSubmit:s,submitLabel:a="确认",submitDisabled:i=!1,errorFocusRef:o,className:l="",showFooter:p=!0,dismissible:c=!0,closeLabel:m,id:f}){const u=d.useId(),x=d.useRef(null),w=d.useRef(null),y=d.useRef(!1),N=d.useRef(!1),j=d.useRef(!1),[h,b]=d.useState(!1),[S,I]=d.useState(""),[A]=d.useState(()=>{const g=document.activeElement instanceof HTMLElement?document.activeElement:null;return{element:g,key:g?.dataset.focusKey}}),{registerModal:v}=Lr();d.useLayoutEffect(()=>{const g=x.current;if(!g)return;N.current=!0;const _=A.element,k=A.key;g.showModal();const C=v(g);return document.body.classList.add("modal-open"),()=>{N.current=!1,g.querySelectorAll('input[type="password"]').forEach(ee=>{ee.value=""}),g.open&&g.close(),C();const M=()=>{if(document.querySelector("dialog[open]"))return;document.body.classList.remove("modal-open");const ee=k?[...document.querySelectorAll("[data-focus-key]")].find(E=>E.dataset.focusKey===k):null,J=document.querySelector("main");J&&!J.hasAttribute("tabindex")&&(J.tabIndex=-1);const re=E=>E?.isConnected&&(E.tabIndex>=0||E.hasAttribute("tabindex")||E.isContentEditable)&&!E.closest("[inert],[hidden]")&&!E.matches(':disabled,input[type="hidden"]');(re(_)?_:re(ee)?ee:J)?.focus({preventScroll:!0})};M(),queueMicrotask(M)}},[v,A]),d.useLayoutEffect(()=>{if(S){const g=o?.current??w.current;g?.focus({preventScroll:!0}),g?.scrollIntoView({block:"nearest"})}else h&&w.current?.focus({preventScroll:!0})},[h,S,o]);const R=()=>{y.current||j.current||(j.current=!0,x.current?.querySelectorAll('input[type="password"]').forEach(g=>{g.value=""}),x.current?.open&&x.current.close(),t())},O=g=>{y.current&&(g.preventDefault(),g.stopPropagation())};return e.jsx("dialog",{id:f,ref:x,className:`f-operation-modal admin-dialog ${ge.dialog} ${l}`,"aria-labelledby":u,tabIndex:-1,onCancel:g=>{g.preventDefault(),c&&R()},onClose:g=>{const _=g.currentTarget;if(!(!N.current||j.current||_.open)){if(y.current||!c){_.showModal(),y.current&&w.current?.focus({preventScroll:!0});return}R()}},onClick:g=>{if(g.target!==g.currentTarget||!c)return;const _=g.currentTarget.getBoundingClientRect();(g.clientX<_.left||g.clientX>_.right||g.clientY<_.top||g.clientY>_.bottom)&&R()},onKeyDown:g=>{if(g.stopPropagation(),g.key!=="Tab")return;const _=[...g.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(M=>!M.closest("[inert]")&&!M.hidden).sort((M,ee)=>M.compareDocumentPosition(ee)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1),k=_[0],C=_.at(-1);if(!k||!C){g.preventDefault(),w.current?.focus();return}g.shiftKey&&(document.activeElement===k||!_.includes(document.activeElement instanceof HTMLElement?document.activeElement:k))?(g.preventDefault(),C.focus()):!g.shiftKey&&(document.activeElement===C||!_.includes(document.activeElement instanceof HTMLElement?document.activeElement:C))&&(g.preventDefault(),k.focus())},children:e.jsxs("form",{"aria-busy":h||void 0,"data-busy":h?"true":void 0,onSubmit:async g=>{g.preventDefault();const _=g.currentTarget;if(!(y.current||i||!s||!_.reportValidity())){y.current=!0,b(!0),I("");try{await s(_),N.current&&(y.current=!1,R())}catch(k){N.current&&I(`${ie(k)}；输入已保留，可重试。`)}finally{y.current=!1,N.current&&b(!1)}}},children:[e.jsxs("header",{className:"f-dialog-head",children:[e.jsx("h2",{id:u,children:n}),c&&e.jsx("button",{type:"button",className:"close-button","data-cancel":"","aria-label":"关闭弹窗",disabled:h,onClick:R,children:"×"})]}),e.jsxs("div",{className:"f-dialog-body",children:[e.jsx("div",{"data-dialog-content":"",inert:h,onClickCapture:O,onKeyDownCapture:O,onInputCapture:O,onChangeCapture:O,children:r}),e.jsx("p",{ref:w,className:`f-status ${S?"danger":""}`,role:S?"alert":"status",tabIndex:-1,"data-operation-status":"",children:S||(h?"正在提交…":"")})]}),p&&e.jsxs("footer",{className:"f-dialog-foot",children:[e.jsx("button",{type:"button","data-cancel":"",disabled:h,onClick:R,children:m??(s?"取消":"知道了")}),s&&e.jsx("button",{type:"submit",className:"primary",disabled:h||i,children:h?"正在提交…":a})]})]})})}function ms({user:n,localTest:r,services:t,expire:s}){const[a,i]=d.useState(!1),[o,l]=d.useState(null),[p,c]=d.useState({}),[m,f]=d.useState(!1),u=d.useRef(!1),x=d.useRef(null),w=d.useRef(null),y=Ct(n),N=y.display_name?.trim()||y.username||"定海用户",j=()=>{i(!1),x.current?.focus({preventScroll:!0})};return d.useLayoutEffect(()=>{const h=w.current;if(h)if(a){const b=x.current?.getBoundingClientRect();b&&c({left:Math.max(8,Math.min(b.left,window.innerWidth-Math.min(260,window.innerWidth-16)-8)),bottom:Math.max(8,window.innerHeight-b.top+8),maxHeight:Math.max(44,b.top-16)}),h.showPopover?.(),h.querySelector("button")?.focus()}else h.hidePopover?.()},[a]),d.useEffect(()=>{if(!a)return;const h=()=>i(!1),b=S=>{S.target instanceof Node&&!w.current?.contains(S.target)&&!x.current?.contains(S.target)&&h()};return window.addEventListener("resize",h),document.addEventListener("pointerdown",b),()=>{window.removeEventListener("resize",h),document.removeEventListener("pointerdown",b)}},[a]),e.jsx("div",{id:"account",className:"account-bar",children:r?e.jsx("span",{className:"chip",children:"本地测试 · 免登录"}):e.jsxs(e.Fragment,{children:[e.jsxs("button",{ref:x,className:"account-trigger",type:"button","aria-label":`用户菜单：${N}`,"aria-haspopup":"menu","aria-expanded":a,"aria-controls":"account-menu","data-focus-key":"admin-account",onClick:()=>i(h=>!h),onKeyDown:h=>{(h.key==="ArrowDown"||h.key==="ArrowUp")&&(h.preventDefault(),i(!0))},children:[e.jsx("span",{className:"account-avatar","aria-hidden":"true",children:Array.from(N)[0]?.toUpperCase()||"?"}),e.jsx("span",{className:"account-name",children:N})]}),e.jsxs("div",{ref:w,id:"account-menu",className:`account-menu ${ge.accountMenu}`,role:"menu","aria-label":"账号菜单",popover:"auto",hidden:!a,style:p,onToggle:h=>{h.newState==="closed"&&i(!1)},onKeyDown:h=>{if(h.stopPropagation(),h.key==="Escape"){h.preventDefault(),j();return}if(h.key==="Tab"){i(!1);return}if(!["ArrowDown","ArrowUp","Home","End"].includes(h.key))return;h.preventDefault();const b=[...h.currentTarget.querySelectorAll('[role="menuitem"]:not(:disabled)')],S=b.findIndex(A=>A===document.activeElement),I=h.key==="Home"?0:h.key==="End"?b.length-1:(S+(h.key==="ArrowDown"?1:-1)+b.length)%b.length;b[I]?.focus()},children:[e.jsxs("div",{className:"account-menu-heading",role:"presentation",children:[e.jsx("b",{children:N}),e.jsxs("small",{children:[y.username||"未填写"," · 管理员"]})]}),e.jsx("button",{type:"button",role:"menuitem",className:"account-action",onClick:()=>{j(),l("info")},children:"用户信息"}),n.local_login_enabled===!1?e.jsx("p",{className:"auth-note",children:"密码由定海管理"}):e.jsx("button",{type:"button",role:"menuitem",className:"account-action",onClick:()=>{j(),l("password")},children:"修改密码"}),e.jsxs("button",{type:"button",role:"menuitem",className:"account-action danger",disabled:m,onClick:async()=>{if(!u.current){u.current=!0,f(!0),j();try{await t.session.logout()}catch{}finally{s()}}},children:[e.jsx(Qe,{name:"logout"}),"退出登录"]})]}),o==="info"&&e.jsx(he,{title:"用户信息",className:"auth-dialog",onClose:()=>l(null),closeLabel:"关闭",children:e.jsx("dl",{className:"account-info",children:[["姓名 / 花名",y.display_name?.trim()||"未填写"],["用户名",y.username||"未填写"],["手机号",y.phone||"未填写"],["角色","管理员"],["用户 ID",y.id]].map(([h,b])=>e.jsxs("div",{className:ge.infoRow,children:[e.jsx("dt",{children:h}),e.jsx("dd",{children:b})]},h))})}),o==="password"&&n.local_login_enabled!==!1&&e.jsxs(he,{title:"修改密码",className:"auth-dialog",onClose:()=>l(null),submitLabel:"保存",onSubmit:async h=>{const b=new FormData(h);await t.changePassword(String(b.get("current_password")??""),String(b.get("new_password")??""),String(b.get("confirm_password")??"")),s()},children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"当前密码"}),e.jsx("input",{name:"current_password",type:"password",autoComplete:"current-password",autoFocus:!0,required:!0})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"新密码（至少 8 位）"}),e.jsx("input",{name:"new_password",type:"password",autoComplete:"new-password",required:!0,minLength:8})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"再输一次新密码"}),e.jsx("input",{name:"confirm_password",type:"password",autoComplete:"new-password",required:!0,minLength:8})]}),e.jsx("p",{className:"auth-note",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。保存后需要重新登录。"})]})]})})}const hs=n=>window.location.replace(n);function xs({page:n,children:r,workspace:t=!1}){return e.jsx(fs,{page:n,workspace:t,children:r})}function fs({page:n,children:r,workspace:t}){const{session:s,sandbox:a,error:i,retry:o,updateUser:l,expire:p}=Ht(hs);return!s&&!i&&t?e.jsx(zt,{stage:"正在准备工作区"}):s?e.jsx(ps,{children:e.jsx(bs,{page:n,workspace:t,user:s.user,localTest:s.localTest,services:s.services,initialHealth:s.initialHealth,sandbox:a,updateUser:l,expire:p,children:r})}):e.jsx("main",{id:"main",tabIndex:-1,children:i?e.jsxs("section",{role:"alert",children:[e.jsx("p",{children:i}),e.jsx("a",{href:"/login",children:"前往登录"}),e.jsx("button",{type:"button",onClick:o,children:"重试"})]}):e.jsx("p",{role:"status",children:"正在验证管理员会话…"})})}const gs=[{label:"工作区",links:[{key:"canvas",label:"画布",href:"/",icon:"dashboard"},{key:"director",label:"导演工作台",href:"/director",icon:"external"}]},{label:"管理",links:[{key:"teams",label:"项目组",href:"/teams",icon:"teams"},{key:"controller",label:"运行面板",href:"/controller",icon:"dashboard"},{key:"permissions",label:"账号与权限",href:"/admin/permissions",icon:"permissions"},{key:"skills",label:"Skill 管理",href:"/skills",icon:"skills"}]},{label:"统计",links:[{key:"costs",label:"费用评估",href:"/controller/costs",icon:"costs"},{key:"capacity",label:"产能统计",href:"/controller/capacity",icon:"capacity"}]}];function bs({page:n,workspace:r,user:t,localTest:s,services:a,initialHealth:i,sandbox:o,children:l,updateUser:p,expire:c}){const{notify:m}=Lr(),{online:f,maintenance:u,maintenanceVisible:x}=Gt(a,i,!r),w=d.useRef(!1),y=d.useRef(!1);d.useEffect(()=>{if(r)return;const h=document.body,b=h.dataset.workspace,S=h.classList.contains("admin-page");return h.classList.add("admin-page"),h.dataset.workspace=n,()=>{S||h.classList.remove("admin-page"),b===void 0?delete h.dataset.workspace:h.dataset.workspace=b}},[n,r]),d.useEffect(()=>{const h=document.body.dataset.adminSandbox;return o&&(document.body.dataset.adminSandbox="local-copy"),()=>{h===void 0?delete document.body.dataset.adminSandbox:document.body.dataset.adminSandbox=h}},[o]);const N=Vt(t,s);d.useEffect(()=>{N&&(y.current=!1)},[N]);const j=u==="blocked"?"系统正在维护更新，当前暂无可用执行节点，请稍后再使用。":"部分节点正在维护更新，其他可用节点仍可正常使用。";return e.jsxs("div",{className:`admin-page ${n==="permissions"?"permissions-page":""} ${ge.application} ${r?ge.workspace:""}`,children:[e.jsx("a",{className:"skip-link admin-skip",href:n==="capacity"?"#main-content":"#main",children:"跳到主内容"}),!r&&e.jsxs("aside",{id:"workspace-nav","data-admin-sidebar":"","aria-label":"主导航",className:ge.navigation,children:[e.jsxs("a",{className:"workspace-brand",href:"/","aria-label":"Chouka 创作空间",children:[e.jsx("img",{src:"/icon.png",alt:""}),e.jsxs("span",{children:["Chouka",e.jsx("small",{children:"创作空间"})]})]}),e.jsx("nav",{className:"workspace-links","aria-label":"工作区导航",children:gs.map(h=>e.jsxs("div",{className:"workspace-nav-group",role:"group","aria-label":h.label,children:[e.jsx("div",{className:"workspace-nav-label","aria-hidden":"true",children:h.label}),h.links.map(b=>e.jsxs("a",{className:"workspace-link",href:b.href,title:b.label,"aria-label":b.label,"aria-current":n===b.key?"page":void 0,children:[e.jsx(Qe,{name:b.icon}),e.jsx("span",{children:b.label})]},b.key))]},h.label))}),e.jsxs("div",{className:"workspace-footer",children:[e.jsxs("div",{className:"workspace-presence",title:"Chouka 系统在线用户（近 90 秒活跃，按账号去重）","aria-live":"polite",children:[e.jsx("i",{"aria-hidden":"true"}),e.jsxs("span",{children:[e.jsx("b",{children:f??"--"})," 人在线"]})]}),e.jsx(ms,{user:t,localTest:s,services:a,expire:c})]})]}),!r&&x&&e.jsxs("div",{id:"maintenance-banner",className:ge.maintenance,role:"status","aria-live":"polite","aria-atomic":"true","aria-label":"系统维护通知",children:[e.jsx("span",{className:"maintenance-banner-icon",children:e.jsx(Qe,{name:"alert"})}),e.jsx("div",{className:"maintenance-banner-ticker",children:e.jsx("div",{className:"maintenance-banner-track",children:[!1,!0].map(h=>e.jsx("span",{className:"maintenance-banner-message","aria-hidden":h||void 0,children:j},String(h)))})})]}),o&&e.jsx("div",{id:"sandbox-note",className:`notice-box admin-sandbox ${ge.sandbox}`,role:"note",children:"本地隔离数据副本：本页用于本地验收，展示复制的业务数据，不代表正式服务的实时状态。"}),N?e.jsx("main",{id:n==="capacity"?"main-content":"main",tabIndex:-1,children:e.jsx("p",{role:"status",children:"请补充手机号后继续使用。"})}):l({http:a.http,user:t,sandbox:o,notify:m}),N&&e.jsx(he,{id:"phone-dialog",title:"补充手机号",className:"auth-dialog phone-dialog",dismissible:!1,closeLabel:"退出登录",submitLabel:"保存并继续",onClose:()=>{y.current||w.current||(w.current=!0,a.session.logout().catch(()=>{}).finally(c))},onSubmit:async h=>{const b=await a.savePhone(String(new FormData(h).get("phone")??""));y.current=!0,p(b)},children:e.jsxs(d.Fragment,{children:[e.jsx("p",{id:"phone-note",className:"auth-note",children:"当前账号尚未填写手机号，请补充后继续使用。手机号仅本人和管理员可见，不用于短信验证或登录。"}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"手机号"}),e.jsx("input",{name:"phone",type:"tel",autoFocus:!0,inputMode:"numeric",autoComplete:"tel-national",required:!0,maxLength:11,pattern:"1[3-9][0-9]{9}",placeholder:"请输入 11 位中国大陆手机号","aria-describedby":"phone-note"})]})]})})]})}function ys(n,r=!0){const t=d.useMemo(()=>Ft(n),[n]),[s,a]=d.useState(0),[i,o]=d.useState({teams:null,loading:!0,error:""});return d.useEffect(()=>{if(!r)return;const p=new AbortController;return t.list(p.signal).then(({teams:c})=>{p.signal.aborted||o({teams:c,loading:!1,error:""})}).catch(c=>{p.signal.aborted||o({teams:null,loading:!1,error:`项目组加载失败：${ie(c)}`})}),()=>p.abort()},[t,s,r]),{...i,retry:()=>{o({teams:null,loading:!0,error:""}),a(p=>p+1)}}}const Y=we([V().finite(),z().refine(n=>n===""||Number.isFinite(Number(n)))]).nullish(),H=z().nullish(),cn=we([X(),me(0),me(1)]).nullish(),js=ne({used_bytes:Y,total_bytes:Y}),vs=ne({index:Y,name:H,utilization_percent:Y,memory_used_bytes:Y,memory_total_bytes:Y,temperature_c:Y}),ws=ne({remote_commands:ne({version:V(),interpreters:W(z())}).optional(),agent_version:we([V(),z()]).nullish(),supports_code_restart:X().nullish(),supports_service_restart:X().nullish(),supports_host_reboot:X().nullish(),node_classes:W(z()).nullish(),telemetry:ne({hostname:H,ip_address:z().trim().transform(n=>Pt().safeParse(n).success?n:null).nullish(),collected_at:Y,gpus:W(vs).nullish(),memory:js.nullish()}).nullish(),devices:W(ne({index:Y,name:H,device_name:H,type:H,vram_total:Y,vram_free:Y})).nullish(),system:ne({ram_total:Y,ram_free:Y,comfyui_version:H,comfyui_build_version:H}).nullish()}),cr=ne({name:H,node_class:H,input:H}),_s=ne({status:H,model_inventory_status:H,missing_node_classes:W(z()).nullish(),extra_node_classes:W(z()).nullish(),missing_models:W(cr).nullish(),extra_models:W(cr).nullish()}),ks=ne({status:H,worker_id:H,agent_version:we([V(),z()]).nullish()}),wn=Vn({start:z().regex(/^([01]\d|2[0-3]):[0-5]\d$/),end:z().regex(/^([01]\d|2[0-3]):[0-5]\d$/),time_zone:z().min(1).refine(n=>{if(!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/.test(n))return!1;try{return new Intl.DateTimeFormat("en",{timeZone:n}),!0}catch{return!1}})}).refine(n=>n.start!==n.end,{message:"每日开始和结束时间不能相同"}),Ns=ne({id:z(),name:H,state:H,enabled:cn,access_team_id:z().min(1).nullable().optional(),access_expires_at:V().finite().nullable().optional(),access_daily_window:wn.nullish(),comfy_online:cn,busy:cn,current_job_id:H,last_seen:Y,is_primary_node:cn,sync_status:H,sync_action:H,sync_message:H,capability_comparison:_s.nullish(),capabilities:ws.nullish()}),Ss=Vn({team_id:z().trim().min(1).nullable(),expires_at:V().finite().nullable(),daily_window:wn.nullish()}).refine(n=>n.team_id!==null||n.expires_at===null&&!n.daily_window,{message:"公共设备不能设置专用时段或结束时间"}),$s=F({ok:me(!0),worker_id:z().min(1),access_team_id:z().min(1).nullable(),access_expires_at:V().finite().nullable(),access_daily_window:wn.nullish()}).refine(n=>n.access_team_id!==null||n.access_expires_at===null&&!n.access_daily_window),Hn=ne({id:z(),status:H,history_only:X().optional(),permission:H,modelName:H,nodeName:H,card:H,name:H,cardName:H,project:H,projectName:H,progress:Y,step:H,created:Y,started:Y,ended:Y,worker_id:H,error:H,capability:H,submitter_display_name:H,submitter_username:H}),Cs=ne({ok:X().nullish(),mode:H,online_workers:Y,workers:Y,server_time:Y,started_at:Y,comfy_online:X().nullish(),jobs:Y,capabilities:Y,sandbox:X().nullish(),llm:ne({ok:X().nullish(),model:H}).nullish()}),zs=ne({running_count:Y,queued_count:Y}),dr=ne({workers:W(Ns),comparison_baseline:ks.nullish()}),Es=ne({jobs:W(Hn)}),Ms=Pe(["all","queued","running","done","error","canceled"]),Ps=ne({jobs:W(Hn),next_cursor:z().min(1).nullable(),has_more:X(),total:V().int().nonnegative()}).refine(n=>n.has_more===(n.next_cursor!==null),{message:"任务历史分页游标不完整"}),Is=ne({projects:W(ne({id:z(),name:H}))}),Rs=ne({worker_count:Y,primary_count:Y,skipped_count:Y}),Ts=ne({ok:me(!0),worker_id:z().min(1),request_id:z().min(1),action:me("sync_files")}),Ls=Pe(["restart_services","reboot_host"]),As=ne({ok:me(!0),worker_id:z().min(1),request_id:z().min(1),action:Ls}),Ds=ne({ok:X().optional()}),En=we([V().finite(),z().refine(n=>n!==""&&Number.isFinite(Number(n)))]).transform(Number),pr=Ir().transform(n=>(typeof n=="number"||typeof n=="string")&&n!==""&&Number.isFinite(Number(n))?Number(n):null),Os=ne({worker_id:H,gpu_index:Y,minutes:Y,server_time:Y,from:En,to:En,gap_seconds:En.pipe(V().positive()),points:W(ne({at:pr,temperature_c:pr}))}).refine(n=>n.to>n.from,{message:"温度历史返回格式不完整"});function Fs(n){return{async save(r,t,s,a){const i=Ss.parse(t);a();const o=$s.parse(await n.request(`/api/workers/${encodeURIComponent(r)}/access`,{method:"POST",signal:s,headers:{"Content-Type":"application/json"},body:JSON.stringify(i)}));if(o.worker_id!==r||o.access_team_id!==i.team_id||o.access_expires_at!==i.expires_at||JSON.stringify(o.access_daily_window??null)!==JSON.stringify(i.daily_window??null))throw new Error("使用范围响应与所选设备或配置不一致，请刷新核对");return o}}}function Ar(n,r){if(!n)return!0;const t=new Intl.DateTimeFormat("en-GB",{timeZone:n.time_zone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(r*1e3)),s=`${t.find(a=>a.type==="hour")?.value}:${t.find(a=>a.type==="minute")?.value}`;return n.start<n.end?s>=n.start&&s<n.end:s>=n.start||s<n.end}function Gn(n,r){return!n.access_team_id||n.access_expires_at!=null&&n.access_expires_at<=r?{team_id:null,expires_at:null}:{team_id:n.access_team_id,expires_at:n.access_expires_at??null,...n.access_daily_window?{daily_window:n.access_daily_window}:{}}}function qs(n,r){const t=Gn(n,r);return Ar(t.daily_window,r)?t:{team_id:null,expires_at:null}}function Mn(n,r){return n.team_id===r.team_id&&n.expires_at===r.expires_at&&JSON.stringify(n.daily_window??null)===JSON.stringify(r.daily_window??null)}function Us(n,r){const t=new Map;for(const s of n){const a=Gn(s,r),i=JSON.stringify([a.team_id,a.expires_at,a.daily_window??null]),o=t.get(i);o?o.workers.push(s):t.set(i,{...a,workers:[s]})}return[...t.values()].sort((s,a)=>+(s.team_id===null)-+(a.team_id===null))}function Dr(n){if(n===null)return"";const r=new Date(n*1e3);if(!Number.isFinite(r.getTime()))return"";const t=s=>String(s).padStart(2,"0");return`${r.getFullYear()}-${t(r.getMonth()+1)}-${t(r.getDate())}T${t(r.getHours())}:${t(r.getMinutes())}:${t(r.getSeconds())}`}function Pn(n,r,t,s,a,i){if(n==="public")return{value:{team_id:null,expires_at:null}};const o={};s?.some(c=>c.id===r)||(o.team="请选择有效的项目组");const l=t?new Date(t).getTime()/1e3:null,p=t.replace(/\.\d{1,3}$/,"");return l!==null&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(t)||!Number.isFinite(l)||Dr(l)!==(p.length===16?`${p}:00`:p))?o.expiry="请输入有效的本地结束时间（不能是夏令时跳过的时间）":l!==null&&l<=a&&(o.expiry="结束时间必须晚于当前时间"),i&&!wn.safeParse(i).success&&(o.window="请选择有效且不同的每日开始、结束时间，以及有效时区"),Object.keys(o).length?{errors:o}:{value:{team_id:r,expires_at:l,...i?{daily_window:i}:{}}}}const Ws="_page_1vpgb_1",Bs="_overview_1vpgb_1",Vs="_accessOverview_1vpgb_54",Hs="_accessSummary_1vpgb_65",Gs="_accessTableWrap_1vpgb_81",Js="_accessTable_1vpgb_81",Zs="_accessCellLabel_1vpgb_122",Ks="_selectionToolbar_1vpgb_164",Ys="_selectAll_1vpgb_180",Xs="_workerSelection_1vpgb_181",Qs="_workerGrid_1vpgb_214",ea="_workerCard_1vpgb_222",na="_workerIdentityBlock_1vpgb_238",ra="_workerHeader_1vpgb_253",ta="_workerService_1vpgb_254",sa="_syncMeta_1vpgb_255",aa="_workerName_1vpgb_264",ia="_workerState_1vpgb_276",oa="_workerVersions_1vpgb_305",la="_resourceNote_1vpgb_306",ca="_telemetryNote_1vpgb_307",da="_sectionLabel_1vpgb_308",pa="_syncMessage_1vpgb_310",ua="_accessDialog_1vpgb_325",ma="_accessTargets_1vpgb_339",ha="_accessOutcomes_1vpgb_340",xa="_accessMixed_1vpgb_359",fa="_accessResults_1vpgb_364",ga="_accessForm_1vpgb_389",ba="_accessError_1vpgb_406",ya="_workerAccess_1vpgb_409",ja="_workerResources_1vpgb_414",va="_resourceRow_1vpgb_417",wa="_resourceReadings_1vpgb_418",_a="_resourceTitle_1vpgb_430",ka="_resourceReading_1vpgb_418",Na="_resourceLabel_1vpgb_456",Sa="_resourceBar_1vpgb_459",$a="_workerActivity_1vpgb_494",Ca="_workerTask_1vpgb_503",za="_workerSync_1vpgb_542",Ea="_inventoryAction_1vpgb_550",Ma="_inventoryLabel_1vpgb_551",Pa="_syncActionLabel_1vpgb_595",Ia="_cardActions_1vpgb_606",Ra="_historyControls_1vpgb_644",Ta="_workerDialog_1vpgb_653",La="_workerActions_1vpgb_656",Aa="_capabilities_1vpgb_664",Da="_temperatureDialog_1vpgb_673",D={page:Ws,overview:Bs,accessOverview:Vs,accessSummary:Hs,accessTableWrap:Gs,accessTable:Js,accessCellLabel:Zs,selectionToolbar:Ks,selectAll:Ys,workerSelection:Xs,workerGrid:Qs,workerCard:ea,workerIdentityBlock:na,workerHeader:ra,workerService:ta,syncMeta:sa,workerName:aa,workerState:ia,workerVersions:oa,resourceNote:la,telemetryNote:ca,sectionLabel:da,syncMessage:pa,accessDialog:ua,accessTargets:ma,accessOutcomes:ha,accessMixed:xa,accessResults:fa,accessForm:ga,accessError:ba,workerAccess:ya,workerResources:ja,resourceRow:va,resourceReadings:wa,resourceTitle:_a,resourceReading:ka,resourceLabel:Na,resourceBar:Sa,workerActivity:$a,workerTask:Ca,workerSync:za,inventoryAction:Ea,inventoryLabel:Ma,syncActionLabel:Pa,cardActions:Ia,historyControls:Ra,workerDialog:Ta,workerActions:La,capabilities:Aa,temperatureDialog:Da};function Oa({workers:n,now:r,teams:t,unavailable:s,onSave:a,onClose:i}){const[o]=d.useState(()=>{const $=n.map(oe=>Gn(oe,r)),P=$[0]??{team_id:null,expires_at:null},Z=$.some(oe=>!Mn(oe,P));return{access:P,mixed:Z}}),[l,p]=d.useState(o.mixed?"":o.access.team_id?"team":"public"),[c,m]=d.useState(o.mixed?"":o.access.team_id??""),[f,u]=d.useState(()=>o.mixed?"":Dr(o.access.expires_at)),[x,w]=d.useState(!o.mixed&&!!o.access.daily_window),[y,N]=d.useState(o.mixed?"":o.access.daily_window?.start??"09:00"),[j,h]=d.useState(o.mixed?"":o.access.daily_window?.end??"18:00"),[b]=d.useState(!o.mixed&&o.access.daily_window?.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone),S=x?{start:y,end:j,time_zone:b}:null,[I,A]=d.useState(null),[v,R]=d.useState({}),[O,g]=d.useState(!1),_=d.useId(),k=d.useRef(null),C=$=>{if(l!=="team"||t.loading||t.teams===null)return;const P=Pn(l,c,f,t.teams,r,S);R(Z=>({...Z,[$]:P.errors?.[$]}))},M=l==="team"&&(t.loading||t.teams===null||!t.teams.length),ee=c&&!t.teams?.some($=>$.id===c),J=l?Pn(l,c,f,t.teams,r,S):null,re=I!==null&&!!J?.value&&Mn(J.value,I.value),E=I?re?`仅重试失败的 ${I.result.failed.length} 台设备`:`保存新配置到全部 ${n.length} 台设备`:"保存使用范围";return e.jsxs(he,{title:"设备使用范围",className:D.accessDialog,onClose:i,submitLabel:E,errorFocusRef:k,submitDisabled:!!s||!l||M,onSubmit:async()=>{if(s)throw new Error(s);if(!l)throw new Error("请选择统一使用范围");if(l==="team"&&(t.loading||t.teams===null))throw new Error("请先成功加载项目组");const $=Pn(l,c,f,t.teams,r,S);if(g(!0),R($.errors??{}),$.errors)throw new Error("请修正标注的使用范围配置");const P=I!==null&&Mn($.value,I.value),Z=P?I.result.failed.map(ue=>ue.worker_id):n.map(ue=>ue.id),oe=await a(Z,$.value),se={succeeded:[...new Set([...P?I.result.succeeded:[],...oe.succeeded])],failed:oe.failed};if(A({value:$.value,result:se}),se.failed.length)throw new Error(`已成功保存 ${se.succeeded.length} 台，${se.failed.length} 台失败；成功设备不会回滚，保持相同配置时仅重试失败设备`)},children:[e.jsxs("p",{children:["已选 ",n.length," 台设备，统一设置使用范围："]}),e.jsx("ul",{className:D.accessTargets,"aria-label":"本次设置的设备",tabIndex:0,children:n.map($=>e.jsxs("li",{children:[e.jsx("strong",{children:$.name||$.id}),e.jsxs("span",{children:["（",$.id,"）"]})]},$.id))}),e.jsx("div",{className:"notice-box",children:"项目组专用按所有成员授权，组外不可见、不可用；组内任务优先使用专用设备，再使用公共设备。管理员可见全部设备。已有任务不中断。同名或同一节点标识的其他注册也会同步设置。"}),e.jsx("p",{className:"muted small",children:"逐台保存，并非原子操作：遇到失败停止后续保存，已成功的设置不会撤销；配置不变时只重试失败或未提交设备。"}),o.mixed&&e.jsx("p",{className:D.accessMixed,children:"所选设备当前使用范围、每日时段或结束时间不一致，请选择统一使用范围；仅在保存时覆盖原配置。"}),s&&e.jsx("p",{role:"alert",className:"danger",children:s}),e.jsxs("div",{className:D.accessForm,children:[O&&(v.team||v.expiry||v.window)&&e.jsxs("div",{ref:k,tabIndex:-1,role:"alert",className:"danger","aria-label":"请修正使用范围配置",children:[e.jsx("p",{children:"请修正以下配置："}),v.team&&e.jsx("p",{children:e.jsx("a",{href:`#${_}-team`,onClick:$=>{$.preventDefault(),document.getElementById(`${_}-team`)?.focus()},children:v.team})}),v.window&&e.jsx("p",{children:e.jsx("a",{href:`#${_}-start`,onClick:$=>{$.preventDefault(),document.getElementById(`${_}-start`)?.focus()},children:v.window})}),v.expiry&&e.jsx("p",{children:e.jsx("a",{href:`#${_}-expiry`,onClick:$=>{$.preventDefault(),document.getElementById(`${_}-expiry`)?.focus()},children:v.expiry})})]}),I&&e.jsxs("div",{ref:O&&(v.team||v.expiry||v.window)?void 0:k,tabIndex:-1,role:"status","aria-live":"polite","aria-label":"设备使用范围保存结果",className:D.accessResults,children:[e.jsxs("p",{children:["上次保存结果：",I.result.succeeded.length," 台成功，",I.result.failed.length," ","台失败。"]}),e.jsx("ul",{className:D.accessOutcomes,"aria-label":"各设备保存结果",tabIndex:0,children:n.map($=>{const P=I.result.failed.find(oe=>oe.worker_id===$.id),Z=I.result.succeeded.includes($.id);return e.jsxs("li",{"data-tone":P?"bad":Z?"ok":void 0,children:[e.jsxs("strong",{children:[$.name||$.id,"（",$.id,"）"]}),e.jsx("span",{children:P?`失败：${P.error}`:Z?"保存成功":"未提交"})]},$.id)})}),e.jsx("p",{children:re?"配置未变：再次保存仅重试失败设备，成功设备不重复提交。":"配置已更改：再次保存会向全部所选设备应用新配置，包括上次成功的设备。"})]}),e.jsx("label",{htmlFor:`${_}-scope`,children:"使用范围"}),e.jsxs("select",{id:`${_}-scope`,value:l,disabled:!!s,onChange:$=>{p($.target.value),R({})},children:[o.mixed&&e.jsx("option",{value:"",disabled:!0,children:"请选择统一使用范围"}),e.jsx("option",{value:"public",children:"公共"}),e.jsx("option",{value:"team",children:"项目组专用"})]}),l==="team"&&e.jsxs(e.Fragment,{children:[e.jsx("label",{htmlFor:`${_}-team`,children:"授权项目组（所有成员）"}),e.jsxs("select",{id:`${_}-team`,value:c,disabled:!!s||t.loading||t.teams===null,"aria-invalid":!!v.team,"aria-describedby":v.team?`${_}-team-error`:void 0,onBlur:()=>C("team"),onChange:$=>{m($.target.value),R(P=>({...P,team:void 0}))},children:[e.jsx("option",{value:"",children:"请选择项目组"}),ee&&e.jsxs("option",{value:c,disabled:!0,children:["项目组 ",c,"（未在当前列表中）"]}),t.teams?.map($=>e.jsx("option",{value:$.id,children:$.name},$.id))]}),t.loading&&e.jsx("p",{role:"status",children:"正在加载项目组…"}),t.error&&e.jsxs("div",{role:"alert",className:"danger",children:[e.jsxs("p",{children:[t.error,"，不能据此判断没有项目组。"]}),e.jsx("button",{type:"button",disabled:!!s,onClick:t.retry,children:"重试加载项目组"})]}),!t.loading&&t.teams?.length===0&&e.jsx("p",{children:"暂无项目组，请先在项目组管理中创建。"}),e.jsx("p",{id:`${_}-team-error`,className:`danger ${D.accessError}`,children:v.team}),e.jsx("label",{htmlFor:`${_}-period`,children:"专用时段"}),e.jsxs("select",{id:`${_}-period`,value:x?"daily":"all",disabled:!!s,onChange:$=>{w($.target.value==="daily"),R(P=>({...P,window:void 0}))},children:[e.jsx("option",{value:"all",children:"全天专用"}),e.jsx("option",{value:"daily",children:"每天固定时段"})]}),x&&e.jsxs(e.Fragment,{children:[e.jsx("label",{htmlFor:`${_}-start`,children:"每日开始时间"}),e.jsx("input",{id:`${_}-start`,type:"time",value:y,disabled:!!s,"aria-invalid":!!v.window,"aria-describedby":`${_}-window-help ${_}-window-error`,onBlur:()=>C("window"),onChange:$=>{N($.target.value),R(P=>({...P,window:void 0}))}}),e.jsx("label",{htmlFor:`${_}-end`,children:"每日结束时间"}),e.jsx("input",{id:`${_}-end`,type:"time",value:j,disabled:!!s,"aria-invalid":!!v.window,"aria-describedby":`${_}-window-help ${_}-window-error`,onBlur:()=>C("window"),onChange:$=>{h($.target.value),R(P=>({...P,window:void 0}))}}),e.jsxs("p",{id:`${_}-window-help`,className:"muted small",children:["时段时区：",b,"。每天重复，开始时专用、结束时恢复公共；结束早于开始表示跨午夜。已有任务不中断。"]}),e.jsx("p",{id:`${_}-window-error`,className:`danger ${D.accessError}`,children:v.window})]}),e.jsx("label",{htmlFor:`${_}-expiry`,children:"结束时间（可选，本地时间）"}),e.jsx("input",{id:`${_}-expiry`,type:"datetime-local",step:"1",value:f,disabled:!!s,"aria-invalid":!!v.expiry,"aria-describedby":`${_}-expiry-help${v.expiry?` ${_}-expiry-error`:""}`,onBlur:()=>C("expiry"),onChange:$=>{u($.target.value),R(P=>({...P,expiry:void 0}))}}),e.jsxs("p",{id:`${_}-expiry-help`,className:"muted small",children:["当前时区：",Intl.DateTimeFormat().resolvedOptions().timeZone,"。到期后不再启用专用规则，自动恢复公共；不设置则持续按所选专用时段生效。"]}),e.jsx("p",{id:`${_}-expiry-error`,className:`danger ${D.accessError}`,children:v.expiry})]}),l==="public"&&e.jsx("p",{className:"muted small",children:"保存后解除项目组限制、每日时段和结束时间，恢复公共使用；已有任务不中断。"})]})]})}const Jn=Pe(["pending","running","succeeded","failed","canceled","timed_out","unknown","skipped","expired"]),Zn=Pe(["python","powershell"]),Or=Vn({request_key:It(),all_online:X(),worker_ids:W(z().min(1)),interpreter:Zn,script:z().refine(n=>n.trim().length>0,"请输入脚本"),cwd:z(),timeout_seconds:V().int().min(5).max(3600)}).refine(n=>n.all_online?n.worker_ids.length===0:n.worker_ids.length>0,{message:"请选择至少一台执行端；全部在线模式不能同时指定设备"});function Fr(){if(typeof crypto.randomUUID=="function")return crypto.randomUUID();const n=crypto.getRandomValues(new Uint8Array(16)),r=Array.from(n,(t,s)=>(s===6?t&15|64:s===8?t&63|128:t).toString(16).padStart(2,"0")).join("");return`${r.slice(0,8)}-${r.slice(8,12)}-${r.slice(12,16)}-${r.slice(16,20)}-${r.slice(20)}`}const mn=V().finite(),qr=F({id:z().min(1),created_by:z(),created_at:mn,interpreter:Zn,timeout_seconds:V().int().min(5).max(3600),counts:jn(Jn,V().int().nonnegative().default(0)),target_count:V().int().nonnegative()}),Fa=F({id:z().min(1),batch_id:z().min(1),worker_id:z(),worker_name:z(),host_id:z().nullable(),status:Jn,created_at:mn,started_at:mn.nullable(),finished_at:mn.nullable(),cancel_requested:X(),process_stopped:X(),exit_code:V().int().nullable(),stdout:z(),stderr:z(),stdout_truncated:X(),stderr_truncated:X(),error:z(),worker_ids:W(z())}),ur=F({batch:qr.extend({script:z(),cwd:z(),all_online:X(),request_key:z()}),executions:W(Fa)}).refine(n=>n.executions.every(r=>r.batch_id===n.batch.id),{message:"命令明细批次不一致"}),qa=F({batches:W(qr),next_offset:V().int().nonnegative().nullable()}),Ua=F({presets:W(F({id:me("model_inventory"),label:z(),interpreter:me("python"),script:z()}))}),Ur={pending:{label:"等待执行",tone:"info"},running:{label:"正在执行",tone:"info"},succeeded:{label:"执行成功",tone:"ok"},failed:{label:"执行失败",tone:"bad"},canceled:{label:"已取消",tone:"warn"},timed_out:{label:"执行超时",tone:"warn"},unknown:{label:"状态未知 · 进程可能仍在运行",tone:"warn"},skipped:{label:"已跳过",tone:"warn"},expired:{label:"已过期",tone:"warn"}},mr=n=>["pending","running","unknown"].includes(n.status)&&!n.cancel_requested,dn="/api/admin/worker-commands";function Wa(n){const r=a=>`${dn}/${encodeURIComponent(a)}`,t=async(a,i,o,l)=>(l(),n.read(a,ur,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i),signal:o})),s=(a,i)=>{if(a.batch.id!==i)throw new Error("返回的命令批次不一致，请刷新核实");return a};return{history(a,i){return n.read(`${dn}?offset=${a}&limit=20`,qa,{cache:"no-store",signal:i})},presets(a){return n.read(`${dn}/presets`,Ua,{cache:"no-store",signal:a})},async detail(a,i){return s(await n.read(r(a),ur,{cache:"no-store",signal:i}),a)},async create(a,i,o){const l=Or.parse(a),p=await t(dn,l,i,o);if(p.batch.request_key!==l.request_key||p.batch.script!==l.script||p.batch.interpreter!==l.interpreter||p.batch.cwd!==l.cwd||p.batch.timeout_seconds!==l.timeout_seconds||p.batch.all_online!==l.all_online)throw new Error("返回的命令与提交内容不一致，请到历史核实；不要更换请求标识重发");return p},async cancel(a,i,o,l){return s(await t(`${r(a)}/cancel`,i?{execution_id:i}:{},o,l),a)},async resolve(a,i,o,l){return s(await t(`${r(a)}/resolve`,{execution_id:i,confirmed_stopped:!0},o,l),a)}}}function Ba(n,r,t){const s=d.useMemo(()=>Wa(n.http),[n.http]),[a,i]=d.useState([]),[o,l]=d.useState(null),[p,c]=d.useState([]),[m,f]=d.useState(""),[u,x]=d.useState(null),[w,y]=d.useState(null),[N,j]=d.useState(0),[h,b]=d.useState(""),[S,I]=d.useState("bad"),[A,v]=d.useState(""),[R,O]=d.useState(!1),[g,_]=d.useState(!1),k=d.useRef(null),C=d.useRef({context:n,canMutate:t});d.useLayoutEffect(()=>{C.current={context:n,canMutate:t}},[n,t]),d.useEffect(()=>{if(!r)return;const E={controller:new AbortController,detailRead:null,revision:0,busy:!1};k.current=E;const $=E.controller.signal;let P;_(!1),x(null),i([]),c([]),f(""),v(""),s.presets($).then(oe=>{$.aborted||c(oe.presets)}).catch(oe=>{$.aborted||f(`预设未获取，可手动输入脚本：${ie(oe)}`)});const Z=async()=>{if($.aborted)return;if(E.busy){P=setTimeout(()=>{Z()},2e3);return}const oe=E.revision,se=new AbortController;E.detailRead=se;const ue=()=>se.abort();$.addEventListener("abort",ue,{once:!0}),O(!0);try{const[L,de]=await Promise.all([s.history(N,se.signal),w?s.detail(w,se.signal):Promise.resolve(null)]);!$.aborted&&!se.signal.aborted&&oe===E.revision&&(i(L.batches),l(L.next_offset),x(de),v(""))}catch(L){!$.aborted&&!se.signal.aborted&&oe===E.revision&&v(`命令记录读取失败，现有内容可能已过期：${ie(L)}`)}finally{$.removeEventListener("abort",ue),$.aborted||(O(!1),P=setTimeout(()=>{Z()},3e3))}};return Z(),()=>{E.controller.abort(),E.detailRead?.abort(),clearTimeout(P),k.current===E&&(k.current=null)}},[r,s,N,w]);const M=d.useCallback(async(E,$)=>{const P=k.current;if(!P||P.controller.signal.aborted||P.busy)return!1;const Z=()=>{const{context:se,canMutate:ue}=C.current;if(P.controller.signal.aborted)throw new DOMException("请求已停止监听","AbortError");if(se.sandbox||se.user.role!=="admin"||!ue())throw new Error("当前为隔离副本、权限不足或服务状态未就绪，禁止发送远程命令")};P.busy=!0,P.revision++,P.detailRead?.abort(),_(!0),b("");let oe=!1;try{Z(),oe=!0;const se=await E(P.controller.signal,Z);return P.controller.signal.aborted?!1:(x(se),y(se.batch.id),C.current.context.notify({message:$,tone:"success"}),!0)}catch(se){if(!P.controller.signal.aborted){const ue=oe&&!(se instanceof Pr&&se.status>=400&&se.status<500),L=se instanceof TypeError?"网络响应未能确认":ie(se),de=ue?`${L}。请求结果未确认，请先核对历史；创建重试将保留原请求标识。`:`${L}。请求未获受理，输入和请求标识已保留；请核实后再操作。`;b(de),I(ue?"warn":"bad"),C.current.context.notify({message:de,tone:ue?"warning":"error"})}return!1}finally{P.busy=!1,P.controller.signal.aborted||_(!1)}},[]);return{batches:a,nextOffset:o,presets:p,presetError:m,detail:u,selected:w,offset:N,error:h,errorTone:S,readError:A,loading:R,busy:g,create:E=>M(($,P)=>s.create(E,$,P),"命令批次已受理；不代表执行成功，请查看逐节点结果。"),cancel:E=>u?M(($,P)=>s.cancel(u.batch.id,E,$,P),"取消请求已提交；进程是否停止以执行端反馈为准。"):Promise.resolve(!1),resolve:E=>!u||u.executions.find($=>$.id===E)?.status!=="unknown"?Promise.resolve(!1):M(($,P)=>s.resolve(u.batch.id,E,$,P),"现场核实记录已提交，请以服务器返回状态为准。"),select:E=>{k.current?.busy||(x(null),y(E),b(""))},page:E=>{k.current?.busy||j(E)}}}const Wr={idle:"空闲",busy:"运行中",syncing:"正在更新",offline:"离线",disabled:"已禁用",error:"异常",queued:"排队中",assigned:"已分配",running:"运行中",done:"已完成",canceled:"已取消",cancel_requested:"正在取消"},Va={idle:"尚未更新",pending:"等待空闲",running:"更新并重启中",done:"更新重启完成",error:"更新重启失败"},Q=n=>(typeof n=="number"||typeof n=="string")&&n!==""&&Number.isFinite(Number(n))?Number(n):null,ze=n=>Q(n)==null?"未获取":String(n),Ha=n=>{const r=Q(n);return r==null?null:Math.max(0,Math.min(100,r))},Oe=n=>{const r=Q(n);return r==null?"未记录":new Date(r*1e3).toLocaleString("zh-CN",{hour12:!1})};function Kn(n){const r=Q(n);return r==null||r<0?"未记录":r<60?`${Math.round(r)}秒`:r<3600?`${Math.floor(r/60)}分${Math.floor(r%60)}秒`:`${Math.floor(r/3600)}小时${Math.floor(r%3600/60)}分`}function $e(n){const r=Q(n);return r==null?"未采集":r>=1024**3?`${(r/1024**3).toFixed(1)} GB`:r>=1024**2?`${(r/1024**2).toFixed(0)} MB`:`${Math.round(r/1024)} KB`}const Ga=n=>["idle","done"].includes(n||"")?"ok":["busy","syncing","running","queued","assigned","cancel_requested"].includes(n||"")?"warn":["offline","disabled","error","canceled"].includes(n||"")?"bad":"",sn=n=>Wr[n||""]||n||"未知",Yn=n=>{if(be(n))return"主节点 · 无需同步";if(n.sync_action==="restart_services"||n.sync_action==="reboot_host"){const r=n.sync_action==="reboot_host"?"电脑重启":"服务重启",t=n.sync_status;return t==="pending"?`${r} · 等待节点接收`:t==="running"?`${r}中`:t==="done"?`${r}完成`:t==="error"?`${r}失败`:"未记录"}return Va[n.sync_status||""]||n.sync_status||"未记录"},be=n=>n.is_primary_node===!0,Fe=n=>!be(n)&&["pending","running"].includes(n.sync_status||""),qe=n=>!be(n)&&n.sync_status==="error",xe=n=>n.state!=="offline",Br=n=>typeof n=="number"||typeof n=="string"&&n.trim()?`Worker v${n}`:"Worker 版本未知",Vr=n=>Br(n.capabilities?.agent_version);function Hr(n){const r=n.capabilities?.system,t=r?.comfyui_build_version?.trim(),s=r?.comfyui_version?.trim();return t?`ComfyUI ${t}`:s?`ComfyUI ${s} · 定制版本未记录`:"ComfyUI 版本未记录"}const Ja=(n,r=Date.now())=>{const t=Q(n?.health.server_time);return t==null||!n?r/1e3:t+(r-n.receivedAt)/1e3},Xn=(n,r)=>{const t=Q(n);return t==null?"未记录":`${Kn(Math.max(0,r-t))}前`};function Qn(n,r,t){const s=Q(n.capabilities?.telemetry?.collected_at);return!t&&xe(n)&&s!=null&&r-s<=60&&r-s>=-10}function _n(n){return xe(n)?n.enabled===!1||n.enabled===0||n.state==="disabled"?["已禁用接收","bad"]:Fe(n)?[["restart_services","reboot_host"].includes(n.sync_action||"")?"维护期间不可接任务":"同步期间不可接任务","bad"]:n.comfy_online===!1||n.state==="error"?["不可接任务","bad"]:n.busy||n.current_job_id||n.state==="busy"?["正在占用","warn"]:n.state==="idle"&&n.comfy_online===!0?["可接任务","ok"]:["接收状态未知",""]:["不可接任务","bad"]}function er(n,r={}){const t=n.capability_comparison||{};if(r.status==="none")return{label:"未设置主节点基准",tone:"warn"};if(r.status==="ambiguous")return{label:"主节点不唯一",tone:"bad"};if(be(n)&&t.status==="primary")return{label:"主节点基准",tone:r.status==="stale"?"warn":"ok"};const s=t.missing_models?.length||0,a=t.missing_node_classes?.length||0,i=t.extra_models?.length||0,o=t.extra_node_classes?.length||0;let l,p="warn";return t.model_inventory_status==="unknown"?(l=["模型清单未知",a?`节点不全 · 缺 ${a} 个`:""].filter(Boolean).join("；"),a&&(p="bad")):t.status==="unknown"||!t.status?l="清单未知":s||a?(l=[s?`模型不全 · 缺 ${s} 个`:"",a?`节点不全 · 缺 ${a} 个`:""].filter(Boolean).join("；"),p="bad"):t.status==="stale"?l=i||o?"节点离线 · 主节点所需齐全，存在额外清单":"节点离线 · 最后清单一致":i||o?(l=`主节点所需齐全 · ${[i?`额外 ${i} 个模型`:"",o?`额外 ${o} 个节点`:""].filter(Boolean).join("；")}`,p="ok"):(l="清单一致",p="ok"),t.status==="stale"&&(s||a)&&(l=`节点离线 · 最后清单：${l}`),r.status==="stale"&&(l=`基准离线 · ${l}`),{label:l,tone:p}}function Gr(n,r){if(be(n))return"主节点作为同步源，不参与同步";if(!xe(n))return"设备已离线，请上线后重试";if(n.capabilities?.supports_code_restart!==!0)return"请先升级 Worker 及配套启动文件";if(Fe(n))return"设备已有等待中或执行中的维护请求";if(r.status!=="ready")return"主节点基准不可用，请刷新后重试";const t=n.capability_comparison;return!t?.status||["unknown","stale"].includes(t.status)||t.model_inventory_status==="unknown"?"清单未知或已过期，请刷新后重试":!t.missing_models?.length&&!t.missing_node_classes?.length?"主节点所需资源齐全，无需补齐":""}function Ln(n){const r=n.comparisonBaseline;if(r.status==="none")return"未设置主节点，无法比较";if(r.status==="ambiguous")return"检测到多个主节点，无法确定比较基准";const t=n.workers.find(s=>s.id===r.worker_id)?.name||r.worker_id||"未命名主节点";return`${r.status==="stale"?"主节点离线 · 最后清单":"在线主节点"} · ${t} · ${Br(r.agent_version)}`}function an(n){const r=n.capabilities;return r?.telemetry?.gpus?.length?r.telemetry.gpus:(r?.devices||[]).map((t,s)=>{const a=Q(t.vram_total),i=Q(t.vram_free);return{index:t.index??s,name:t.name||t.device_name||t.type,memory_total_bytes:a,memory_used_bytes:a!=null&&i!=null?Math.max(0,a-i):null,utilization_percent:null,temperature_c:null}})}function Jr(n){if(n.capabilities?.telemetry?.memory)return n.capabilities.telemetry.memory;const r=n.capabilities?.system,t=Q(r?.ram_total),s=Q(r?.ram_free);return{total_bytes:t,used_bytes:t!=null&&s!=null?Math.max(0,t-s):null}}const Zr=(n,r)=>r.projects.find(t=>t.id===n.project)?.name||n.projectName||(n.project?"项目已删除":"未归属项目"),An=16e3;function Za(n,r){const t=s=>s>0&&s<n.length&&n.charCodeAt(s)>=56320&&n.charCodeAt(s)<=57343?s-1:s;return n.slice(t(r*An),t((r+1)*An))}const Ka="_dialog_1sy2y_1",Ya="_content_1sy2y_5",Xa="_row_1sy2y_10",Qa="_stack_1sy2y_16",ei="_editor_1sy2y_17",ni="_targets_1sy2y_23",ri="_target_1sy2y_23",ti="_warning_1sy2y_60",si="_execution_1sy2y_67",ai="_identifier_1sy2y_94",le={dialog:Ka,content:Ya,row:Xa,stack:Qa,editor:ei,targets:ni,target:ri,warning:ti,execution:si,identifier:ai};function Kr({counts:n}){return e.jsx("div",{className:le.row,children:Jn.options.map(r=>{const t=Ur[r],s=n[r];return s>0?e.jsxs("span",{"data-tone":t.tone,children:[t.label," ",s]},r):null})})}function ii({detail:n,disabled:r,onCancel:t,onResolve:s}){const{batch:a,executions:i}=n;return e.jsxs("section",{className:le.stack,"aria-label":"命令批次明细",children:[e.jsxs("h3",{children:["服务器目标快照 · ",a.id]}),e.jsxs("p",{children:["创建人 ",a.created_by," · ",new Date(a.created_at*1e3).toLocaleString("zh-CN")," ·"," ",a.interpreter," · 超时 ",a.timeout_seconds," 秒"]}),e.jsxs("p",{children:["目标 ",a.target_count," · ",a.all_online?"全部在线（由服务器冻结）":"指定执行端"," · cwd：",a.cwd||"执行端默认目录"]}),e.jsx(Kr,{counts:a.counts}),e.jsxs("details",{children:[e.jsx("summary",{children:"查看提交的脚本与请求标识"}),e.jsx("pre",{children:a.script}),e.jsxs("p",{children:["request_key：",a.request_key]})]}),e.jsx("button",{type:"button",disabled:r||!i.some(mr),onClick:()=>t(),children:"取消批次全部"}),i.length===0&&e.jsx("p",{children:"服务器尚未返回逐节点记录；不能据此判断执行成功。"}),i.map(o=>{const l=Ur[o.status];return e.jsxs("article",{className:le.execution,"aria-label":`执行结果 ${o.worker_name||o.worker_id}`,children:[e.jsxs("div",{className:le.row,children:[e.jsx("h4",{children:o.worker_name||o.worker_id}),e.jsx("strong",{"data-tone":l.tone,children:l.label})]}),e.jsxs("p",{children:["worker：",o.worker_id," · host：",o.host_id??"未记录"," · 同宿主原 worker：",o.worker_ids.join("、")||"未记录"]}),e.jsxs("p",{children:["开始：",o.started_at===null?"尚未记录":new Date(o.started_at*1e3).toLocaleString("zh-CN")," ","· 结束：",o.finished_at===null?"尚未记录":new Date(o.finished_at*1e3).toLocaleString("zh-CN")]}),e.jsxs("p",{children:["退出码：",o.exit_code??"未返回",o.exit_code===0&&o.status!=="succeeded"?"（仅退出码为 0 不代表执行成功）":""," ","· 进程停止：",o.process_stopped?"已确认":"未确认"," · 取消请求：",o.cancel_requested?"已请求，等待核实停止":"未请求"]}),o.error&&e.jsxs("div",{"data-tone":l.tone,children:[e.jsx("b",{children:o.status==="skipped"?"服务器跳过原因":"服务器说明"}),e.jsx("pre",{children:o.error})]}),e.jsxs("div",{className:le.row,children:[e.jsx("button",{type:"button",disabled:r||!mr(o),onClick:()=>t(o.id),children:"取消此节点"}),o.status==="unknown"&&e.jsx("button",{type:"button",disabled:r,onClick:()=>s(o.id),children:"现场核实停止后解除占用"})]}),e.jsxs("h5",{children:["标准输出 stdout",o.stdout_truncated?" · 已截断，仅显示服务器保留部分":""]}),e.jsx("pre",{"aria-label":`${o.worker_name||o.worker_id} 标准输出`,tabIndex:0,children:o.stdout||"（暂无输出）"}),e.jsxs("h5",{children:["标准错误 stderr",o.stderr_truncated?" · 已截断，仅显示服务器保留部分":""]}),e.jsx("pre",{"aria-label":`${o.worker_name||o.worker_id} 标准错误`,tabIndex:0,children:o.stderr||"（暂无输出）"})]},o.id)})]})}const oi=()=>({request_key:Fr(),all_online:!1,worker_ids:[],interpreter:"python",cwd:"",script:"",timeout_seconds:300});function li({context:n,open:r,workers:t,canMutate:s,unavailable:a,onClose:i}){const o=Ba(n,r,s),[l,p]=d.useState(oi),[c,m]=d.useState("edit"),[f,u]=d.useState(!1),[x,w]=d.useState(""),[y,N]=d.useState(null),[j,h]=d.useState(!1),b=d.useRef(null),S=d.useRef(null);d.useEffect(()=>{r&&y&&(b.current?.focus({preventScroll:!0}),b.current?.scrollIntoView({block:"nearest"}))},[r,y]),d.useEffect(()=>{r&&(x||o.error)&&(S.current?.focus({preventScroll:!0}),S.current?.scrollIntoView({block:"nearest"}))},[r,x,o.error]);const I=t.filter(xe),A=a||n.sandbox||n.user.role!=="admin",v=l.all_online?I:I.filter(k=>l.worker_ids.includes(k.id)),R=!l.all_online&&v.length!==l.worker_ids.length,O=k=>{o.busy||(p(C=>({...C,...k,request_key:Fr()})),u(!1),w(""))},g=()=>{if(!Or.safeParse(l).success){w("请选择至少一台在线执行端，填写脚本，并将超时设置为 5–3600 的整数秒。");return}if(R){w("已选执行端不在当前在线快照，请重新选择；不会静默删除目标。");return}u(!1),m("confirm")},_=k=>{h(!1),N(k)};return r?e.jsx(he,{title:"远程命令",className:le.dialog,onClose:()=>{u(!1),N(null),h(!1),i()},showFooter:!1,children:e.jsxs("div",{className:le.content,children:[e.jsxs("div",{className:le.warning,children:[e.jsx("b",{children:"仅限管理员执行可信脚本：这是真实 Windows shell，不是沙箱。"}),e.jsx("p",{children:"脚本可修改文件、停止服务或造成不可逆后果。主节点也可执行；旧 Worker 不支持时由服务器明确跳过。同宿主合并、目标冻结和跳过原因以服务器结果为准。"}),e.jsx("p",{children:"命令正文和输出会写入审计历史，请勿填入密码、token 或其他凭证。"}),e.jsx("p",{children:"关闭弹窗只停止页面监听，不取消已提交任务。取消请求也不等于进程已经停止。"})]}),e.jsxs("div",{className:le.row,"aria-label":"命令视图",children:[e.jsx("button",{type:"button",disabled:o.busy,onClick:()=>{m("edit"),N(null)},children:"编辑命令"}),e.jsx("button",{type:"button",disabled:o.busy,onClick:()=>{m("history"),N(null)},children:"命令历史"}),o.selected&&e.jsx("button",{type:"button",disabled:o.busy,onClick:()=>m("detail"),children:"当前批次明细"})]}),A&&e.jsx("p",{className:le.warning,role:"status",children:"隔离副本、权限不足或运行状态未就绪：仅可查看记录，禁止提交、取消和解除占用。"}),(o.error||x)&&e.jsx("p",{ref:S,role:"alert","aria-label":"命令表单反馈","data-tone":x?"bad":o.errorTone,tabIndex:-1,children:x||o.error}),o.readError&&e.jsx("p",{role:"alert","data-tone":"warn",children:o.readError}),c==="edit"&&e.jsxs("fieldset",{className:le.editor,disabled:o.busy,children:[e.jsx("legend",{children:"新命令"}),e.jsxs("label",{children:["目标范围",e.jsxs("select",{value:l.all_online?"all":"selected",onChange:k=>O({all_online:k.target.value==="all",worker_ids:[]}),children:[e.jsx("option",{value:"selected",children:"选择单台 / 多台在线执行端"}),e.jsx("option",{value:"all",children:"全部在线（服务器提交时冻结）"})]})]}),e.jsxs("fieldset",{className:le.targets,disabled:l.all_online,children:[e.jsxs("legend",{children:["在线执行端 · 当前快照 ",I.length," 台"]}),I.length===0&&e.jsx("p",{children:"当前没有在线执行端。"}),I.map(k=>{const C=k.capabilities?.remote_commands,M=C&&C.version>=1&&C.interpreters.includes(l.interpreter);return e.jsxs("label",{className:le.target,children:[e.jsx("input",{type:"checkbox",checked:!l.all_online&&l.worker_ids.includes(k.id),onChange:ee=>O({worker_ids:ee.target.checked?[...l.worker_ids,k.id]:l.worker_ids.filter(J=>J!==k.id)})}),e.jsxs("span",{children:[k.name||k.id,k.is_primary_node?" · 主节点（可命令）":"",e.jsxs("small",{children:[k.id," ·"," ",M?"已上报解释器支持":C?"未上报当前解释器支持，服务器可能跳过":"旧 Worker / 未上报远程命令能力，服务器将核实并跳过不支持节点"]})]})]},k.id)})]}),R&&e.jsxs("p",{"data-tone":"warn",children:["已选目标已离线或不在快照：",l.worker_ids.filter(k=>!I.some(C=>C.id===k)).join("、"),"。请重新选择。"]}),e.jsxs("label",{children:["解释器",e.jsxs("select",{value:l.interpreter,onChange:k=>{const C=Zn.safeParse(k.target.value);C.success&&O({interpreter:C.data})},children:[e.jsx("option",{value:"python",children:"Python"}),e.jsx("option",{value:"powershell",children:"PowerShell"})]})]}),e.jsxs("label",{children:["工作目录 cwd（空白使用默认目录）",e.jsx("input",{value:l.cwd,onChange:k=>O({cwd:k.target.value})})]}),e.jsxs("label",{children:["超时（秒，5–3600）",e.jsx("input",{type:"number",min:5,max:3600,step:1,value:Number.isNaN(l.timeout_seconds)?"":l.timeout_seconds,onChange:k=>O({timeout_seconds:k.target.valueAsNumber})})]}),e.jsxs("label",{children:["可选预设",e.jsxs("select",{defaultValue:"",onChange:k=>{const C=o.presets.find(M=>M.id===k.target.value);C&&O({interpreter:C.interpreter,script:C.script}),k.target.value=""},children:[e.jsx("option",{value:"",children:"不使用预设 / 手动输入"}),o.presets.map(k=>e.jsx("option",{value:k.id,children:k.label},k.id))]})]}),o.presetError&&e.jsx("p",{"data-tone":"warn",children:o.presetError}),e.jsxs("label",{children:["脚本 script",e.jsx("textarea",{rows:12,value:l.script,spellCheck:!1,onChange:k=>O({script:k.target.value})})]}),e.jsx("p",{children:"预设仅填入脚本，不会自动执行。模型盘点为第一页，可在脚本中编辑 offset 后重新确认。"}),e.jsxs("p",{className:le.identifier,children:["请求标识：",l.request_key,"。失败重试保留此标识；编辑命令或目标后生成新标识。"]}),e.jsx("button",{type:"button",className:"primary",disabled:A||o.busy,onClick:g,children:"检查命令并继续"})]}),c==="confirm"&&e.jsxs("section",{className:le.stack,"aria-label":"二次确认命令",children:[e.jsx("h3",{children:"二次确认 · 即将在真实执行端运行"}),e.jsx("p",{children:l.all_online?"全部在线，最终目标由服务器提交时冻结；下列仅为当前快照预览。":"指定以下执行端；同宿主可能合并。"}),e.jsx("ul",{children:v.map(k=>e.jsxs("li",{children:[k.name||k.id,"（",k.id,"）",k.is_primary_node?" · 主节点":"",k.capabilities?.remote_commands?"":" · 旧 Worker，可能跳过"]},k.id))}),e.jsxs("p",{children:[l.interpreter," · cwd：",l.cwd||"默认目录"," · 超时 ",l.timeout_seconds," 秒"]}),e.jsx("pre",{children:l.script}),e.jsxs("p",{className:le.identifier,children:["request_key：",l.request_key]}),e.jsxs("label",{className:le.target,children:[e.jsx("input",{type:"checkbox",checked:f,disabled:o.busy,onChange:k=>u(k.target.checked)}),"我已核对目标和脚本，理解这不是沙箱并接受不可逆风险"]}),e.jsxs("div",{className:le.row,children:[e.jsx("button",{type:"button",disabled:o.busy,onClick:()=>m("edit"),children:"返回修改"}),e.jsx("button",{type:"button",className:"primary",disabled:A||o.busy||!f||R,onClick:()=>{!f||R||o.create(l).then(k=>{k&&(m("detail"),u(!1))})},children:o.busy?"正在提交…":"确认提交远程命令"})]})]}),c==="history"&&e.jsxs("section",{className:le.stack,"aria-label":"命令历史列表",children:[e.jsx("h3",{children:"命令历史"}),o.batches.length===0&&e.jsx("p",{children:o.loading?"正在读取…":o.readError?"历史尚未获取。":"暂无命令批次。"}),o.batches.map(k=>e.jsxs("article",{className:le.execution,children:[e.jsxs("button",{type:"button",disabled:o.busy,onClick:()=>{o.select(k.id),N(null),m("detail")},children:["查看批次 ",k.id]}),e.jsxs("p",{children:[new Date(k.created_at*1e3).toLocaleString("zh-CN")," · ",k.created_by," ·"," ",k.interpreter," · 超时 ",k.timeout_seconds," 秒 · 目标 ",k.target_count]}),e.jsx(Kr,{counts:k.counts})]},k.id)),e.jsxs("div",{className:le.row,children:[e.jsx("button",{type:"button",disabled:o.loading||o.busy||o.offset===0,onClick:()=>o.page(Math.max(0,o.offset-20)),children:"上一页"}),e.jsxs("span",{children:["第 ",Math.floor(o.offset/20)+1," 页"]}),e.jsx("button",{type:"button",disabled:o.loading||o.busy||o.nextOffset===null,onClick:()=>{o.nextOffset!==null&&o.page(o.nextOffset)},children:"下一页"})]})]}),c==="detail"&&e.jsxs(e.Fragment,{children:[o.detail?e.jsx(ii,{detail:o.detail,disabled:A||o.busy||!!o.readError,onCancel:k=>_({kind:"cancel",id:k}),onResolve:k=>_({kind:"resolve",id:k})}):e.jsx("p",{role:"status",children:o.readError?"明细未获取，请等待重试。":"正在读取服务器目标快照…"}),y&&e.jsxs("section",{className:le.warning,ref:b,tabIndex:-1,"aria-label":y.kind==="resolve"?"核实停止确认":"取消命令确认",children:[e.jsx("h3",{children:y.kind==="resolve"?"谨慎确认：仅解除未知执行占用":"确认请求取消"}),e.jsxs("p",{children:["批次 ",o.detail?.batch.id," ·"," ",y.id?`执行记录 ${y.id}`:"批次全部节点"]}),y.kind==="resolve"?e.jsxs(e.Fragment,{children:[e.jsx("p",{children:"只有管理员已到现场或通过可信方式核实该宿主上的命令进程确实停止，才可解除占用。这不会终止进程，也不表示执行成功；错误解除可能导致并发操作。"}),e.jsxs("label",{className:le.target,children:[e.jsx("input",{type:"checkbox",checked:j,disabled:o.busy,onChange:k=>h(k.target.checked)}),"我已现场核实该命令进程停止"]})]}):e.jsx("p",{children:"只提交取消请求，不保证进程立即停止。请继续检查逐节点状态，未知状态不能当作已取消。"}),e.jsxs("div",{className:le.row,children:[e.jsx("button",{type:"button",disabled:o.busy,onClick:()=>N(null),children:"返回明细"}),e.jsx("button",{type:"button",disabled:A||o.busy||!!o.readError||y.kind==="resolve"&&!j,onClick:()=>{y.kind==="resolve"&&!j||(y.kind==="resolve"?o.resolve(y.id):o.cancel(y.id)).then(k=>{k&&N(null)})},children:o.busy?"正在提交…":y.kind==="resolve"?"确认进程已停止并解除占用":"确认请求取消"})]})]})]}),e.jsx("p",{role:"status",children:o.busy?"正在提交请求，请勿重复操作…":o.loading?"正在刷新命令记录…":"命令记录每 3 秒刷新；状态以服务器反馈为准。"})]})}):null}function ci(n){return{async worker(r,t){const s=await n.read(`/api/workers?worker_id=${encodeURIComponent(r)}`,dr,{cache:"no-store",signal:t}),a=s.workers[0];if(s.workers.length!==1||!a||a.id!==r)throw new Error("节点详情与所选设备不一致");return a},async job(r,t){const s=await n.read(`/api/job/${encodeURIComponent(r)}`,Hn,{cache:"no-store",signal:t});if(s.id!==r)throw new Error("任务执行记录与所选任务不一致");return s},async history(r,t,s){const a=new URLSearchParams({limit:"50",status:r});return t!==null&&a.set("cursor",t),n.read(`/api/jobs/history?${a}`,Ps,{cache:"no-store",signal:s})},async snapshot(r,t=()=>{}){const s={cache:"no-store",signal:r},[a,i,o,l,p]=await Promise.all([n.read("/api/health",Cs,s).then(c=>(c.sandbox===!0&&!r.aborted&&t(),c)),n.read("/api/status",zs,s),n.read("/api/workers?summary=1",dr,s),n.read("/api/jobs?summary=1",Es,s),n.read("/api/projects",Is,s)]);return{health:a,status:i,workers:o.workers,comparisonBaseline:o.comparison_baseline||{status:"none"},jobs:l.jobs,projects:p.projects,receivedAt:Date.now()}},async temperature(r,t,s,a){const i=await n.read(`/api/workers/${encodeURIComponent(r)}/temperature?gpu_index=${t}&minutes=${s}`,Os,{cache:"no-store",signal:a});if(i.worker_id!=null&&i.worker_id!==r||i.gpu_index!=null&&Q(i.gpu_index)!==t||i.minutes!=null&&Q(i.minutes)!==s)throw new Error("温度历史与所选节点或范围不一致");return{...i,points:i.points.flatMap(o=>o.at!=null&&o.at>=i.from&&o.at<=i.to?[{...o,at:o.at,temperature_c:o.temperature_c}]:[]).sort((o,l)=>o.at-l.at)}},async deleteWorker(r,t,s){return s(),Ds.parse(await n.request(`/api/workers/${encodeURIComponent(r)}`,{method:"DELETE",signal:t}))},async restartWorker(r,t,s,a){a();const i=As.parse(await n.request(`/api/admin/workers/${encodeURIComponent(r)}/restart`,{method:"POST",signal:s,headers:{"Content-Type":"application/json"},body:JSON.stringify({action:t})}));if(i.worker_id!==r||i.action!==t)throw new Error("重启响应与所选节点或操作不一致");return i},async syncWorker(r,t,s){s();const a=Ts.parse(await n.request(`/api/admin/workers/${encodeURIComponent(r)}/sync`,{method:"POST",signal:t,headers:{"Content-Type":"application/json"},body:JSON.stringify({})}));if(a.worker_id!==r)throw new Error("同步响应与所选设备不一致");return a},async syncAll(r,t){return t(),Rs.parse(await n.request("/api/admin/workers/sync-all",{method:"POST",signal:r,headers:{"Content-Type":"application/json"},body:JSON.stringify({})}))}}}const hr=n=>({filter:n,jobs:[],initialized:!1,loadedPages:0,nextCursor:null,hasMore:!1,total:null,loading:null,error:"",failedAction:null});function In(n,r){return(Q(r.created)??0)-(Q(n.created)??0)||(n.id<r.id?1:n.id>r.id?-1:0)}function di(n,r){const t=new Map(r.jobs.map(a=>[a.id,a])),s=r.jobs.reduce((a,i)=>!a||In(i,a)>0?i:a,null);for(const a of n?.jobs||[]){const i=["queued","assigned","running","cancel_requested"].includes(a.status||"");(t.has(a.id)||i||s&&In(a,s)<=0)&&t.set(a.id,a)}return[...t.values()].filter(a=>{const i=a.status==="assigned"?"queued":a.status==="cancel_requested"?"running":a.status;return r.filter==="all"||i===r.filter}).sort(In)}class pi{constructor(r,t=!1){this.service=r,this.state={snapshot:null,history:hr("all"),stale:!1,loading:!1,error:"",isolated:t,mutation:null,deletingWorker:null,refreshed:0}}service;state;listeners=new Set;read=null;historyRead=null;historyEpoch=0;write=null;version=0;disposed=!1;start=()=>{this.disposed=!1,this.refreshAll()};refreshAll=()=>Promise.all([this.refresh(),this.refreshHistory()]);getSnapshot=()=>this.state;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});update(r){this.disposed||(this.state={...this.state,...r},this.listeners.forEach(t=>t()))}isolate=()=>{this.state.isolated||this.update({isolated:!0})};canMutate=()=>!this.disposed&&!!this.state.snapshot&&!this.state.stale&&!this.state.isolated&&!this.state.mutation;guard=()=>{if(this.disposed||!this.state.snapshot||this.state.stale||this.state.isolated)throw new Error("隔离副本或服务状态未就绪，禁止修改设备")};invalidateRead(){++this.version,this.read?.controller.abort(),this.read=null,this.update({loading:!1})}refresh=(r=!1)=>{if(this.disposed||this.state.mutation&&!r)return Promise.resolve();if(this.read)return this.read.promise;const t=++this.version,s=new AbortController;this.update({loading:!0});const a=this.service.snapshot(s.signal,this.isolate).then(i=>{this.disposed||s.signal.aborted||t!==this.version||this.update({snapshot:i,stale:!1,error:"",refreshed:this.state.refreshed+1,isolated:this.state.isolated||i.health.sandbox===!0})}).catch(i=>{this.disposed||s.signal.aborted||t!==this.version||(this.update({stale:!0,error:`读取中间层信息失败：${ie(i)}`}),s.abort())}).finally(()=>{t!==this.version||this.disposed||(this.read=null,this.update({loading:!1}))});return this.read={controller:s,promise:a},a};setHistoryFilter=r=>this.disposed?Promise.resolve():r===this.state.history.filter?this.refreshHistory():(++this.historyEpoch,this.historyRead?.controller.abort(),this.historyRead=null,this.update({history:hr(r)}),this.refreshHistory());refreshHistory=()=>this.readHistory("first");loadMore=()=>this.readHistory("more");retryHistory=()=>this.readHistory(this.state.history.failedAction||"first");readHistory(r){if(this.disposed)return Promise.resolve();if(this.historyRead)return this.historyRead.promise;const t=this.state.history;if(r==="more"&&(!t.initialized||!t.hasMore))return Promise.resolve();const s=r==="more"?t.nextCursor:null,a=this.historyEpoch,i=new AbortController;this.update({history:{...t,loading:r,error:"",failedAction:null}});const o=this.service.history(t.filter,s,i.signal).then(l=>{if(this.disposed||i.signal.aborted||a!==this.historyEpoch)return;if(r==="more"&&l.has_more&&l.next_cursor===s)throw new Error("任务历史游标未推进，请重试");const p=this.state.history,c=new Map(p.jobs.map(f=>[f.id,f]));for(const f of l.jobs)c.set(f.id,f);const m=r==="first"&&p.loadedPages>1;this.update({history:{...p,jobs:[...c.values()],initialized:!0,loadedPages:r==="more"?p.loadedPages+1:Math.max(1,p.loadedPages),total:l.total,nextCursor:m?p.nextCursor:l.next_cursor,hasMore:m?p.hasMore:l.has_more}})}).catch(l=>{this.disposed||i.signal.aborted||a!==this.historyEpoch||this.update({history:{...this.state.history,error:`读取任务历史失败：${ie(l)}`,failedAction:r}})}).finally(()=>{this.disposed||i.signal.aborted||a!==this.historyEpoch||(this.historyRead=null,this.update({history:{...this.state.history,loading:null}}))});return this.historyRead={controller:i,promise:o},o}async mutate(r,t,s){if(this.guard(),this.state.mutation)throw new Error("设备操作正在执行，请稍后重试");this.invalidateRead();const a=new AbortController;this.write=a,this.update({mutation:r,deletingWorker:t});try{const i=await s(a.signal);if(a.signal.aborted||this.disposed)throw new DOMException("操作已取消","AbortError");return await this.refresh(!0),i}catch(i){throw a.signal.aborted||(this.update({error:`${r==="delete"?"删除设备":r==="restart"?"提交重启":r==="access"?"保存使用范围":"更新节点"}失败：${ie(i)}`}),await this.refresh(!0)),i}finally{this.write=null,this.update({mutation:null,deletingWorker:null})}}deleteWorker=r=>this.state.snapshot?.workers.some(t=>t.id===r)?this.mutate("delete",r,t=>this.service.deleteWorker(r,t,this.guard)):Promise.reject(new Error("设备已移除"));restartWorker=(r,t)=>this.state.snapshot?.workers.some(s=>s.id===r)?this.mutate("restart",null,s=>this.service.restartWorker(r,t,s,this.guard)):Promise.reject(new Error("设备已移除"));syncWorker=r=>{const t=this.state.snapshot,s=t?.workers.find(i=>i.id===r);if(!s||!t)return Promise.reject(new Error("设备已移除或被新的注册替代"));const a=Gr(s,t.comparisonBaseline);return a?Promise.reject(new Error(a)):this.mutate("sync",null,i=>this.service.syncWorker(r,i,this.guard))};saveAccess=(r,t,s)=>{const a=[...new Set(r)];return a.length?a.some(i=>!this.state.snapshot?.workers.some(o=>o.id===i))?Promise.reject(new Error("所选设备已移除或被新的注册替代，请重新选择")):this.mutate("access",null,async i=>{const o={succeeded:[],failed:[]};for(const[l,p]of a.entries())try{i.throwIfAborted(),await s.save(p,t,i,this.guard),o.succeeded.push(p)}catch(c){if(i.aborted)throw c;o.failed.push({worker_id:p,error:ie(c)}),o.failed.push(...a.slice(l+1).map(m=>({worker_id:m,error:"未提交：前一台设备保存失败，已停止后续保存，可重试"})));break}return o}):Promise.reject(new Error("请至少选择一台设备"))};syncAll=()=>this.mutate("sync",null,r=>this.service.syncAll(r,this.guard));dispose=()=>{this.disposed=!0,++this.version,this.read?.controller.abort(),this.write?.abort(),++this.historyEpoch,this.historyRead?.controller.abort(),this.historyRead=null,this.read=null,this.listeners.clear()}}function ui({http:n,sandbox:r}){const t=d.useMemo(()=>ci(n),[n]),s=d.useMemo(()=>new pi(t),[t]),a=d.useSyncExternalStore(s.subscribe,s.getSnapshot),[i,o]=d.useState(!0),l=d.useRef(i),[p,c]=d.useState(Date.now);return d.useLayoutEffect(()=>{l.current=i},[i]),d.useLayoutEffect(()=>{r&&s.isolate()},[r,s]),d.useEffect(()=>(s.start(),s.dispose),[s]),d.useEffect(()=>{const m=()=>{document.hidden||(c(Date.now()),l.current&&s.refreshAll())},f=window.setInterval(m,5e3);return document.addEventListener("visibilitychange",m),()=>{window.clearInterval(f),document.removeEventListener("visibilitychange",m)}},[s]),{state:a,store:s,service:t,automatic:i,setAutomatic:o,clock:p}}function Yr(n,r){const[t,s]=d.useState(0),[a,i]=d.useState({id:r,data:null,error:"",loading:r!==null});return d.useEffect(()=>{const o=new AbortController;return i({id:r,data:null,error:"",loading:r!==null}),r!==null&&n(r,o.signal).then(l=>{o.signal.aborted||i({id:r,data:l,error:"",loading:!1})},l=>{o.signal.aborted||i({id:r,data:null,error:ie(l),loading:!1})}),()=>o.abort()},[n,r,t]),{...a.id===r?a:{data:null,error:"",loading:r!==null},retry:()=>s(o=>o+1)}}function gn({name:n}){return e.jsx("svg",{className:"icon",viewBox:"0 0 24 24","aria-hidden":"true",focusable:"false",children:n==="refresh"?e.jsxs(e.Fragment,{children:[e.jsx("path",{d:"M20 7v5h-5M4 17v-5h5"}),e.jsx("path",{d:"M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 18 17"})]}):n==="chevron"?e.jsx("path",{d:"m9 5 7 7-7 7"}):e.jsxs(e.Fragment,{children:[e.jsx("path",{d:"m12 3 10 18H2L12 3Z"}),e.jsx("path",{d:"M12 9v4m0 3v1"})]})})}function Ee({children:n}){return e.jsx("span",{className:"cell-secondary",children:n})}function mi({value:n,label:r}){return e.jsx("div",{className:"util-track",role:"meter","aria-label":r,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":n,children:e.jsx("i",{style:{width:`${n}%`}})})}function hi({value:n}){const r=Q(n),t=Ha(r==null?null:r*100);return e.jsxs("div",{className:"utilization",children:[e.jsx("span",{children:t==null?"未采集":`${Math.round(t)}%`}),t!=null&&e.jsx(mi,{value:t,label:"任务过程进度"})]})}function Xr({worker:n,snapshot:r}){const t=r.jobs.find(s=>s.id===n.current_job_id);if(t){const s=`${t.submitter_display_name?.trim()||t.submitter_username||"未记录提交人"} · ${Zr(t,r)} · ${t.cardName||t.name||"未命名卡片"}`;return t.project&&t.card?e.jsx("a",{href:`/?${new URLSearchParams({project:t.project,card:t.card})}`,title:s,children:s}):e.jsx("span",{title:s,children:s})}return n.current_job_id?e.jsx(e.Fragment,{children:"任务详情暂未载入"}):Fe(n)?e.jsxs(e.Fragment,{children:[Yn(n),e.jsx(Ee,{children:n.sync_message||"等待节点反馈"})]}):xe(n)?n.busy?e.jsxs(e.Fragment,{children:["ComfyUI 本地任务",e.jsx(Ee,{children:"非中间层派发"})]}):e.jsx(e.Fragment,{children:_n(n)[1]==="bad"?"不接收新任务":"当前无任务"}):e.jsx(e.Fragment,{children:"非实时"})}function Qr({rows:n,className:r,id:t}){return e.jsx("dl",{id:t,className:r,children:n.map(([s,a])=>e.jsx(xi,{label:s,children:a},s))})}function xi({label:n,children:r}){return e.jsxs(e.Fragment,{children:[e.jsx("dt",{children:n}),e.jsx("dd",{children:r})]})}function fi({snapshot:n,items:r,now:t,onError:s}){const a=new Map(n?.workers.map(i=>[i.id,i.name])||[]);return e.jsx(e.Fragment,{children:r.length?r.map(i=>{const o=i.modelName?.trim(),l=i.name?.trim()||i.capability?.trim()||o||"未记录",p=Q(i.started),c=p==null?i.history_only?"耗时未记录":"尚未开始":i.history_only&&Q(i.ended)==null?"耗时未记录":Kn((Q(i.ended)??t)-p);return e.jsxs("tr",{children:[e.jsx("td",{className:Ga(i.status),children:sn(i.status)}),e.jsxs("td",{className:"job-origin",children:[i.submitter_display_name?.trim()||i.submitter_username||"未记录提交人",e.jsx(Ee,{children:n?Zr(i,n):i.projectName||"项目未记录"}),e.jsxs(Ee,{children:["卡片 · ",i.cardName||i.name||"未命名"]})]}),e.jsxs("td",{className:"job-mode",title:i.capability||void 0,children:[l,o&&o!==l&&e.jsxs(Ee,{children:["模型 · ",o]}),e.jsx(Ee,{children:i.id})]}),e.jsxs("td",{children:[e.jsx(hi,{value:i.progress}),e.jsx(Ee,{children:i.step||"步骤未记录"})]}),e.jsx("td",{title:i.worker_id||void 0,children:i.nodeName?.trim()||(i.worker_id?a.get(i.worker_id)||"未知执行端":i.history_only?"未记录":"待分配")}),e.jsx("td",{children:Oe(i.created)}),e.jsx("td",{children:i.error?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"danger f-job-error",title:i.error,children:i.error}),e.jsx("button",{type:"button",className:"link-button","data-job-error":i.id,"data-focus-key":`job-error:${i.id}`,onClick:()=>s(i),children:"查看完整错误"})]}):c})]},i.id)}):e.jsx("tr",{children:e.jsx("td",{colSpan:7,children:e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"暂无已加载任务"}),e.jsx("p",{children:"可更换任务状态；历史记录的加载结果见下方状态。"})]})})})})}class gi{constructor(r,t,s,a){this.service=r,this.id=t,this.gpu=s,this.minutes=a}service;id;gpu;minutes;state={data:null,loading:!1,error:""};listeners=new Set;request=null;version=0;getSnapshot=()=>this.state;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});update(r){this.state={...this.state,...r},this.listeners.forEach(t=>t())}load=async(r=!1)=>{if(r&&this.request)return;this.request?.abort();const t=new AbortController,s=++this.version;this.request=t,this.update({loading:!0,error:"",...r?{}:{data:null}});try{const a=await this.service.temperature(this.id,this.gpu,this.minutes,t.signal);if(t.signal.aborted||s!==this.version)return;this.update({data:a})}catch(a){if(t.signal.aborted||s!==this.version)return;this.update({data:null,error:ie(a)})}finally{s===this.version&&(this.request=null,this.update({loading:!1}))}};dispose=()=>{++this.version,this.request?.abort(),this.request=null}}function bi(n,r,t){const s=n.points.flatMap(c=>c.temperature_c==null?[]:[c.temperature_c]),a=Math.floor((Math.min(...s)-5)/10)*10,i=Math.ceil((Math.max(...s)+5)/10)*10,o=49,l=r-o-20,p=t-23-45;return{x:c=>o+(c-n.from)/(n.to-n.from)*l,y:c=>23+(i-c)/(i-a)*p,width:r,height:t,left:o,pw:l}}function yi(n){const r=[];let t=null;for(const s of n.points){if(s.temperature_c==null){t=null;continue}(t==null||s.at-t>n.gap_seconds)&&r.push([]),r[r.length-1]?.push({at:s.at,temperature_c:s.temperature_c}),t=s.at}return r}function ji(n,r,t,s,a){if(s<70||a<50||!r.points.some(y=>y.temperature_c!=null))return null;const i=n.getContext("2d");if(!i)return null;const o=window.devicePixelRatio||1;n.width=Math.round(s*o),n.height=Math.round(a*o),i.setTransform(o,0,0,o,0,0),i.clearRect(0,0,s,a);const l=bi(r,s,a),{x:p,y:c,left:m,pw:f}=l,u=r.points.flatMap(y=>y.temperature_c==null?[]:[y.temperature_c]),x=Math.floor((Math.min(...u)-5)/10)*10,w=Math.ceil((Math.max(...u)+5)/10)*10;i.font='12px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',i.lineWidth=1,i.textAlign="right",i.textBaseline="middle";for(let y=0;y<=4;y++){const N=x+(w-x)*y/4,j=c(N);i.strokeStyle="#29313c",i.beginPath(),i.moveTo(m,j),i.lineTo(s-20,j),i.stroke(),i.fillStyle="#a0a6b1",i.fillText(`${Math.round(N)}°`,m-12,j)}i.textBaseline="top";for(let y=0;y<=4;y+=s<600?2:1){const N=new Date((r.from+(r.to-r.from)*y/4)*1e3),j=N.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:!1}),h=t===1440?N.toLocaleDateString("zh-CN",{month:"2-digit",day:"2-digit"})+" "+j:j;i.textAlign=y===0?"left":y===4?"right":"center",i.fillText(h,m+y/4*f,a-27)}i.strokeStyle="#38bdf8",i.lineWidth=2.3,i.lineJoin="round",i.beginPath();for(const y of yi(r))y.forEach((N,j)=>{j===0?i.moveTo(p(N.at),c(N.temperature_c)):i.lineTo(p(N.at),c(N.temperature_c))});i.stroke(),i.fillStyle="#38bdf8";for(const y of r.points)y.temperature_c!=null&&(i.beginPath(),i.arc(p(y.at),c(y.temperature_c),2.1,0,Math.PI*2),i.fill());return l}function vi({worker:n,workerId:r,service:t,now:s,stale:a,revision:i,onClose:o}){const l=n?an(n):[],[p,c]=d.useState(()=>({gpu:Q(l[0]?.index)??0,minutes:30}));return e.jsx(he,{title:n?.name||r,onClose:o,className:`temperature-dialog ${D.temperatureDialog}`,showFooter:!1,children:e.jsx(wi,{worker:n,workerId:r,service:t,now:s,stale:a,revision:i,selection:p,onSelect:c})})}function wi({worker:n,workerId:r,service:t,now:s,stale:a,revision:i,selection:o,onSelect:l}){const{gpu:p,minutes:c}=o,m=d.useMemo(()=>new gi(t,r,p,c),[t,r,p,c]),f=d.useSyncExternalStore(m.subscribe,m.getSnapshot),{data:u,error:x,loading:w}=f,y=d.useRef(null),N=d.useRef(null),j=d.useRef(null),h=d.useRef(null),[b,S]=d.useState(null),I=d.useRef(i),A=n?an(n):[],v=A.find(C=>Q(C.index)===p),R=(u?.points||[]).flatMap(C=>C.temperature_c==null?[]:[C.temperature_c]),O=n&&xe(n)?Qn(n,s,a)?Q(v?.temperature_c)??"未采集":"未采集":"非实时";d.useEffect(()=>(m.load(),m.dispose),[m]),d.useEffect(()=>{I.current!==i&&(I.current=i,m.load(!0))},[i,m]),d.useEffect(()=>{const C=y.current,M=N.current;if(!C||!M||!u)return;const ee=()=>{const{width:E,height:$}=M.getBoundingClientRect();h.current=ji(C,u,c,E,$)},J=requestAnimationFrame(ee),re=new ResizeObserver(ee);return re.observe(M),()=>{cancelAnimationFrame(J),re.disconnect(),h.current=null}},[u,c]);const g=b==null?void 0:u?.points[b],_=g?`${Oe(g.at)} · ${g.temperature_c==null?"未采集":`${g.temperature_c}°C`}`:"";d.useEffect(()=>{const C=j.current,M=h.current;!C||!M||!g||(C.style.left=`${Math.max(8,Math.min(M.width-C.offsetWidth-8,M.x(g.at)+14))}px`,C.style.top=`${Math.max(8,Math.min(M.height-C.offsetHeight-8,g.temperature_c==null?20:M.y(g.temperature_c)-45))}px`)},[g,_]);const k=[["当前温度",O],["所选时段最高",R.length?Math.max(...R):u?"未采集":"未获取"],["所选时段最低",R.length?Math.min(...R):u?"未采集":"未获取"]];return e.jsxs("div",{className:"modal-shell",children:[e.jsx("header",{className:"modal-header",children:e.jsxs("div",{children:[e.jsx("p",{className:"eyeline",children:"显卡温度趋势"}),e.jsxs("p",{className:"muted","data-temp-description":!0,children:[v?.name||"型号未记录"," / ",n?sn(n.state):"节点已移除"]})]})}),e.jsxs("div",{className:"chart-controls",children:[e.jsxs("label",{className:"inline-label",children:["显卡"," ",e.jsx("select",{"data-temp-gpu":!0,"aria-label":"选择显卡",value:p,onChange:C=>{S(null),l({...o,gpu:Number(C.target.value)})},children:A.length?A.map((C,M)=>e.jsxs("option",{value:C.index??0,children:["GPU ",C.index??0," · ",C.name||"未记录型号"]},`${C.index??M}:${M}`)):e.jsx("option",{value:0,children:"GPU 0 · 未采集配置"})})]}),e.jsx("div",{className:"segmented","data-temp-ranges":!0,"aria-label":"温度时间范围",children:[[30,"30 分钟"],[120,"2 小时"],[1440,"24 小时"]].map(([C,M])=>e.jsx("button",{type:"button","data-range":C,"aria-pressed":c===C,onClick:()=>{S(null),l({...o,minutes:C})},children:M},C))})]}),e.jsx("p",{className:"small muted",children:"仅展示真实采集记录；缺失区间不插值、不补造历史。当前温度需60秒内的新鲜遥测。"}),e.jsx("div",{className:"temperature-stats","data-temp-stats":!0,children:k.map(([C,M])=>e.jsxs("div",{className:"temperature-stat",children:[e.jsx("label",{children:C}),e.jsxs("strong",{children:[M,typeof M=="number"&&e.jsx("small",{children:" °C"})]})]},C))}),e.jsxs("div",{className:"chart-area",ref:N,children:[e.jsx("canvas",{ref:y,"data-temp-canvas":!0,hidden:!R.length,tabIndex:0,role:"img","aria-label":`GPU ${p}，${c}分钟真实温度历史，${R.length}个有效采集点；左右方向键查看。`,onPointerMove:C=>{const M=h.current;if(!M||!u?.points.length)return;const ee=u.from+Math.max(0,Math.min(1,(C.clientX-C.currentTarget.getBoundingClientRect().left-M.left)/M.pw))*(u.to-u.from);S(u.points.reduce((J,re,E)=>Math.abs(re.at-ee)<Math.abs((u.points[J]?.at??re.at)-ee)?E:J,0))},onPointerLeave:()=>S(null),onKeyDown:C=>{!u?.points.length||!["ArrowLeft","ArrowRight","Home","End"].includes(C.key)||(C.preventDefault(),S(C.key==="Home"?0:C.key==="End"?u.points.length-1:Math.max(0,Math.min(u.points.length-1,(b??0)+(C.key==="ArrowRight"?1:-1)))))}}),e.jsx("div",{className:"empty-state","data-temp-empty":!0,hidden:R.length>0,role:"status",children:x?e.jsxs(e.Fragment,{children:[e.jsx("b",{children:"温度历史读取失败"}),e.jsx("p",{children:x}),e.jsx("button",{type:"button",onClick:()=>{S(null),m.load()},children:"重试读取"})]}):w||!u?e.jsx("b",{children:"正在读取温度历史…"}):e.jsxs(e.Fragment,{children:[e.jsx("b",{children:"暂无有效温度记录"}),e.jsx("p",{children:"未开始采集、旧版 Worker 未上报或驱动不支持；不显示 0°C。"})]})}),e.jsx("div",{ref:j,className:"chart-tooltip",hidden:!g||!R.length,role:"status",children:_})]}),e.jsxs("footer",{className:"modal-footer",children:[e.jsxs("span",{className:"chart-key",children:[e.jsx("i",{}),e.jsxs("span",{"data-temp-key":!0,children:["GPU ",p," 温度"]})]}),e.jsx("span",{"data-temp-note":!0,children:u?`${Oe(u.from)} — ${Oe(u.to)}${n&&!xe(n)?" · 离线，历史非实时":""}`:""}),e.jsx("span",{className:"keyboard-hint",children:"左右键查看采集点 · Esc关闭"})]})]})}function _i({capabilities:n}){const[r,t]=d.useState(null),[s,a]=d.useState(0),i=d.useRef(null),o=d.useRef(null),l=d.useRef(new Set),p=Math.max(1,Math.ceil((r?.length||0)/An));d.useEffect(()=>{const f=l.current;return()=>{f.forEach(u=>URL.revokeObjectURL(u)),f.clear()}},[]);const c=f=>{a(f),(f===0||f===p-1)&&o.current?.focus({preventScroll:!0}),o.current&&(o.current.scrollTop=0,o.current.scrollLeft=0)},m=()=>{if(r==null)return;const f=URL.createObjectURL(new Blob([r],{type:"application/json;charset=utf-8"}));l.current.add(f);const u=document.createElement("a");u.href=f,u.download="worker-capabilities.json",u.click()};return e.jsxs("details",{className:D.capabilities,"data-capabilities":!0,onToggle:f=>{f.currentTarget.open&&i.current==null&&(i.current=JSON.stringify(n,null,2),t(i.current))},children:[e.jsx("summary",{children:"完整能力与配置（最后上报，非实时配置证据）"}),r!=null&&e.jsxs("div",{children:[e.jsx("p",{className:"small muted",children:"按页查看完整快照；下载可获取全部 JSON，自动刷新不会改变当前快照。"}),e.jsxs("div",{className:"f-toolbar",children:[e.jsx("button",{type:"button","data-config-prev":!0,disabled:s===0,onClick:()=>c(s-1),children:"上一页"}),e.jsxs("span",{className:"small muted","data-config-page":!0,role:"status",children:["第 ",s+1," / ",p," 页"]}),e.jsx("button",{type:"button","data-config-next":!0,disabled:s===p-1,onClick:()=>c(s+1),children:"下一页"}),e.jsx("button",{type:"button","data-config-download":!0,onClick:m,children:"下载完整 JSON"})]}),e.jsx("pre",{ref:o,className:"capabilities-json",tabIndex:0,"aria-label":"当前页能力与配置",children:Za(r,s)})]})]})}function xr({items:n}){return n.length?e.jsx("ul",{className:"inventory-list",children:n.map((r,t)=>e.jsx("li",{children:r},`${t}:${r}`))}):e.jsx("p",{className:"muted small",children:"无"})}function fr({items:n,unknown:r}){return r?e.jsx("p",{className:"muted small",children:"模型清单未知，无法判断"}):n.length?e.jsx("ul",{className:"inventory-list",children:n.map((t,s)=>e.jsxs("li",{children:[t.name||"未命名模型",e.jsxs("span",{children:[t.node_class||"未知节点"," · ",t.input||"未知输入"]})]},`${s}:${t.name}`))}):e.jsx("p",{className:"muted small",children:"无"})}function ki({worker:n,snapshot:r}){const t=n.capability_comparison||{},s=er(n,r.comparisonBaseline),a=t.model_inventory_status==="unknown",i=t.missing_node_classes||[],o=t.extra_node_classes||[],l=t.missing_models||[],p=t.extra_models||[];return["none","ambiguous"].includes(r.comparisonBaseline.status||"")||!t.status||t.status==="unknown"&&a&&!i.length&&!o.length?e.jsxs("section",{className:"inventory-audit",children:[e.jsx("h3",{children:"与主节点清单对比"}),e.jsxs("div",{className:"notice-box",children:[e.jsx("b",{className:s.tone,children:s.label}),e.jsxs("p",{children:[Ln(r),"。旧版 Worker 或清单字段缺失时不会猜测为完整。"]})]})]}):e.jsxs("section",{className:"inventory-audit",children:[e.jsxs("div",{className:"inventory-heading",children:[e.jsx("h3",{children:"与主节点清单对比"}),e.jsx("span",{className:"f-chip inventory-chip","data-tone":s.tone,children:s.label})]}),e.jsxs("p",{className:"muted small",children:[Ln(r),"；文件名、相对路径和版本均按精确值比较。"]}),e.jsxs("div",{className:"inventory-grid",children:[e.jsxs("div",{className:"inventory-block",children:[e.jsxs("h4",{children:["缺失节点类 ",e.jsx("span",{children:i.length})]}),e.jsx(xr,{items:i}),e.jsxs("h4",{children:["缺失模型 ",e.jsx("span",{children:a?"未知":l.length})]}),e.jsx(fr,{items:l,unknown:a})]}),e.jsxs("div",{className:"inventory-block",children:[e.jsxs("h4",{children:["额外节点类 ",e.jsx("span",{children:o.length})]}),e.jsx(xr,{items:o}),e.jsxs("h4",{children:["额外模型 ",e.jsx("span",{children:a?"未知":p.length})]}),e.jsx(fr,{items:p,unknown:a})]})]})]})}function Ni({worker:n,service:r,snapshot:t,now:s,stale:a,restartUnavailable:i,onRestart:o,onClose:l}){const p=Yr(r.worker,n.id),c=p.data?.capabilities,[m,f]=d.useState(null),[u,x]=d.useState(""),w=i||(a?"服务状态已过期，请刷新后重试。":be(n)?"主节点不支持远程重启。":xe(n)?["pending","running"].includes(n.sync_status||"")?"节点已有维护操作，请等待完成。":"":"节点已离线，无法提交重启。"),y=A=>w||(n.capabilities?.[A==="reboot_host"?"supports_host_reboot":"supports_service_restart"]!==!0?"当前 Worker 不支持此操作，请先更新 Worker。":""),N=n.capabilities||{},j=N.telemetry||{},h=Jr(n),b=_n(n),S=er(n,t.comparisonBaseline),I=[["节点角色",be(n)?"主节点（不参与文件同步）":"执行节点"],["清单状态",e.jsx("span",{className:S.tone,children:S.label})],["比较基准",Ln(t)],["主机",j.hostname||"未记录"],["ComfyUI",xe(n)?n.comfy_online===!0?"在线":n.comfy_online===!1?"不可用":"未获取":"非实时"],["任务接收",e.jsx("span",{className:b[1],children:b[0]})],["维护状态",Yn(n)],["维护消息",be(n)?"此节点已排除在批量文件同步之外":n.sync_message||"未记录"],["最后心跳",`${Oe(n.last_seen)} / ${Xn(n.last_seen,s)}`],["遥测时间",`${Oe(j.collected_at)} · ${Qn(n,s,a)?"新鲜采集":"非实时 / 未采集"}`],["节点能力",p.loading?"正在读取…":p.error?"读取失败":c?.node_classes?`${c.node_classes.length} 个`:"未记录"],["当前任务",e.jsx(Xr,{worker:n,snapshot:t})],["系统内存",`${$e(h.used_bytes)} / ${$e(h.total_bytes)}（最后上报）`],["IP 地址",j.ip_address?.trim()||"未记录"]];return e.jsxs(e.Fragment,{children:[e.jsxs(he,{title:`${n.name||n.id} · 节点详情`,onClose:l,className:D.workerDialog,children:[e.jsxs("div",{className:D.workerActions,role:"group","aria-label":"节点重启操作",children:[e.jsx("button",{type:"button",disabled:!!y("restart_services"),title:y("restart_services")||"重启 ComfyUI 和 Worker，不重启电脑",onClick:()=>f("restart_services"),children:"重启服务"}),e.jsx("button",{type:"button",className:"danger",disabled:!!y("reboot_host"),title:y("reboot_host")||"重启节点所在的整台电脑",onClick:()=>f("reboot_host"),children:"重启节点"})]}),e.jsx("p",{className:"muted small",children:w||(n.capabilities?.supports_service_restart!==!0&&n.capabilities?.supports_host_reboot!==!0?"当前 Worker 不支持远程重启，请先更新 Worker。":"重启服务仅重启 ComfyUI 和 Worker；重启节点将重启整台电脑。节点收到请求后立即执行，会中断当前任务，不等待空闲。")}),u&&e.jsx("p",{className:"notice-box",role:"status",children:u}),e.jsxs("div",{className:"f-tags",children:[e.jsx("span",{className:"f-chip",children:sn(n.state)}),e.jsx("span",{className:"f-chip",children:Vr(n)}),e.jsx("span",{className:"f-chip",children:Hr(n)}),e.jsxs("span",{className:"f-chip",children:["Worker ID: ",n.id]})]}),e.jsx(Qr,{rows:I,className:"f-definition"}),e.jsx(ki,{worker:n,snapshot:t}),e.jsx("div",{className:"f-grid2",children:an(n).map((A,v)=>e.jsxs("div",{className:"notice-box",children:[e.jsxs("b",{children:["GPU ",A.index??"未知"," · ",A.name||"未记录"]}),e.jsxs("p",{children:["最后上报：利用率"," ",Q(A.utilization_percent)==null?"未采集":`${A.utilization_percent}%`,"；显存 ",$e(A.memory_used_bytes)," / ",$e(A.memory_total_bytes),"；温度"," ",Q(A.temperature_c)==null?"未采集":`${A.temperature_c}°C`]})]},`${A.index??v}:${v}`))}),p.loading&&e.jsx("p",{role:"status",children:"正在读取完整节点能力与配置…"}),p.error&&e.jsxs("div",{role:"alert",children:[e.jsxs("p",{children:["读取完整节点能力与配置失败：",p.error]}),e.jsx("button",{type:"button",onClick:p.retry,children:"重试节点详情"})]}),p.data&&(c?e.jsx(_i,{capabilities:c}):e.jsx("p",{className:"muted small",children:"未记录完整能力与配置。"}))]}),m&&e.jsxs(he,{title:m==="reboot_host"?"重启节点电脑":"重启节点服务",submitLabel:m==="reboot_host"?"确认重启电脑":"确认重启服务",onClose:()=>f(null),onSubmit:async()=>{const A=y(m);if(A)throw new Error(A);await o(m),x(`${m==="reboot_host"?"电脑重启":"服务重启"}请求已提交，节点收到请求后立即执行，会中断当前任务；恢复状态以节点实际回报为准。`)},children:[e.jsxs("p",{children:["目标节点：",e.jsx("strong",{children:n.name||n.id})]}),e.jsx("div",{className:"notice-box",children:m==="reboot_host"?"此操作会重启该节点所在的整台 Windows 电脑，会强制关闭程序，未保存内容可能丢失，所有服务都会暂时离线。电脑恢复后，ComfyUI 和 Worker 是否自动启动取决于该电脑的启动配置。":"此操作只重启该节点的 ComfyUI 和 Worker 服务，不会重启 Windows 电脑，不同步文件或更新代码。"}),e.jsx("p",{children:"节点收到请求后立即执行，会中断当前任务，不等待空闲；提交后暂停向该节点分配新任务。请求已接收不代表重启已完成，请查看节点维护状态。"}),m==="reboot_host"&&e.jsxs("label",{className:"check-label",children:[e.jsx("input",{type:"checkbox",required:!0}),"我确认重启整台电脑，并已处理其他程序和未保存内容"]})]})]})}function gr(n){return n.state==="busy"||n.state==="running"?0:n.state==="idle"?1:n.state==="offline"?3:2}function Si({snapshot:n,now:r,stale:t,mutationDisabled:s,deletingWorker:a,onDetails:i,onTemperature:o,onDelete:l,onSync:p,selectedIds:c,onSelection:m,teams:f}){const u=[...n.workers].sort((x,w)=>gr(x)-gr(w));return e.jsx(e.Fragment,{children:u.length?u.map(x=>{const w=Qn(x,r,t),y=an(x),N=Jr(x),j=sn(x.state),h=_n(x),b=er(x,n.comparisonBaseline),S=!!(x.capability_comparison?.missing_models?.length||x.capability_comparison?.missing_node_classes?.length),I=Gr(x,n.comparisonBaseline),A=qs(x,r),v=f?.find(O=>O.id===A.team_id)?.name,R=xe(x)?x.comfy_online===!0?"ComfyUI 在线":x.comfy_online===!1?"ComfyUI 不可用":"ComfyUI 未获取":"ComfyUI 非实时";return e.jsxs("article",{className:D.workerCard,"data-worker-card":x.id,"data-worker-state":x.state||"unknown","data-selected":c?.has(x.id)?"true":void 0,"aria-label":x.name||x.id,children:[e.jsxs("div",{className:D.workerIdentityBlock,children:[e.jsxs("header",{className:D.workerHeader,children:[m?e.jsxs("label",{className:`${D.workerName} ${D.workerSelection}`,"data-worker-name":!0,children:[e.jsx("input",{type:"checkbox","aria-label":`选择设备 ${x.name||x.id}`,checked:c?.has(x.id)??!1,disabled:s,onChange:O=>m(x,O.target.checked)}),e.jsx("strong",{children:x.name||"未命名执行端"})]}):e.jsx("div",{className:D.workerName,"data-worker-name":!0,children:e.jsx("strong",{children:x.name||"未命名执行端"})}),e.jsx("span",{className:D.workerState,"data-state":x.state,children:j})]}),e.jsxs("div",{className:D.workerVersions,children:[be(x)&&e.jsx("span",{className:"f-chip",children:"主节点"}),e.jsx("span",{children:Vr(x)}),e.jsx("span",{children:Hr(x)})]}),e.jsxs("p",{className:D.workerAccess,"data-worker-access":!0,children:["使用范围：",A.team_id?`项目组专用 · ${v||A.team_id}（所有成员）`:"公共",A.team_id&&(A.expires_at===null?" · 手动解除":` · ${new Date(A.expires_at*1e3).toLocaleString("zh-CN",{hour12:!1})} 到期恢复公共`)]})]}),e.jsxs("div",{className:D.workerResources,children:[y.map((O,g)=>e.jsx(br,{gpu:O,ram:void 0,live:w},`${O.index??g}:${g}`)),!y.length&&e.jsx("p",{className:D.telemetryNote,children:"未采集 GPU 指标"}),e.jsx(br,{gpu:void 0,ram:N,live:w}),!w&&e.jsx("p",{className:D.telemetryNote,children:xe(x)?"遥测未采集或已过期":"非实时，不沿用旧读数"}),e.jsxs("div",{className:D.workerService,children:[e.jsx("span",{"data-tone":x.comfy_online===!1&&xe(x)?"bad":void 0,children:R}),e.jsx("span",{"data-tone":h[1],children:h[0]})]})]}),e.jsxs("div",{className:D.workerActivity,children:[e.jsxs("div",{className:D.workerTask,children:[e.jsx("span",{className:D.sectionLabel,children:"当前任务"}),e.jsx("div",{children:e.jsx(Xr,{worker:x,snapshot:n})})]}),e.jsxs("div",{className:D.workerSync,children:[e.jsxs("div",{className:D.syncMeta,children:[e.jsx("span",{className:qe(x)?"danger":"",children:Yn(x)}),e.jsxs("span",{title:x.last_seen==null?"未记录":new Date(Number(x.last_seen)*1e3).toLocaleString("zh-CN",{hour12:!1}),children:["心跳 ",Xn(x.last_seen,r)]})]}),!be(x)&&S?e.jsxs("button",{type:"button",className:D.inventoryAction,"data-tone":b.tone,"data-sync-worker":x.id,"data-focus-key":`worker-sync:${x.id}`,"aria-label":`同步设备 ${x.name||x.id}：${b.label}`,disabled:s||!!I,title:I||"仅同步这台设备；点击查看范围并确认",onClick:()=>p(x),children:[e.jsx("span",{children:b.label}),e.jsxs("span",{className:D.syncActionLabel,children:[Fe(x)?"维护中":I?"不可同步":"点击同步",e.jsx(gn,{name:"chevron"})]})]}):e.jsx("span",{className:D.inventoryLabel,"data-tone":b.tone,children:b.label}),!be(x)&&S&&I&&!Fe(x)&&e.jsx("p",{className:D.syncMessage,children:I}),!be(x)&&x.sync_message&&(qe(x)||Fe(x))&&e.jsx("p",{className:D.syncMessage,role:qe(x)?"alert":void 0,children:x.sync_message})]})]}),e.jsxs("footer",{className:D.cardActions,children:[e.jsx("button",{type:"button",className:"link-button","data-worker":x.id,"data-focus-key":`worker-details:${x.id}`,onClick:()=>i(x),children:"节点详情"}),e.jsx("button",{type:"button",className:"link-button","data-temperature":x.id,"data-focus-key":`worker-temperature:${x.id}`,"aria-label":`查看 ${x.name||x.id} 温度趋势`,onClick:()=>o(x.id),children:"温度趋势"}),e.jsx("button",{type:"button",className:"link-button worker-delete danger","data-delete-worker":x.id,"data-focus-key":`worker-delete:${x.id}`,"aria-label":`删除设备 ${x.name||x.id}`,disabled:s,onClick:()=>l(x),children:a===x.id?"正在删除…":"删除设备"})]})]},x.id)}):e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"还没有注册执行端"}),e.jsx("p",{children:"执行端注册并上报心跳后，将在此显示状态。"})]})})}function $i({snapshot:n,now:r,stale:t,mutationDisabled:s,teams:a,onEdit:i}){const o=Us(n?.workers??[],r);return e.jsx("section",{className:D.accessOverview,"aria-labelledby":"worker-access-title",children:e.jsxs("details",{children:[e.jsx("summary",{className:D.accessSummary,children:e.jsx("h3",{id:"worker-access-title",children:"已设置的使用范围"})}),e.jsx("p",{className:"muted small",children:"查看当前设备分配，点击“修改设置”可调整项目组、每日专用时段和结束时间，也可恢复公共。时段外公开，但保留每日规则供修改。"}),t&&e.jsx("p",{role:"status",children:"当前为上次快照，刷新成功后才能修改。"}),a.error&&o.some(l=>l.team_id)&&e.jsxs("p",{role:"alert",children:[a.error,"；专用设置仍保留，下方暂显示项目组 ID。",e.jsx("button",{type:"button",disabled:a.loading,onClick:a.retry,children:"重试加载项目组"})]}),n?o.length?e.jsx("div",{className:D.accessTableWrap,children:e.jsxs("table",{className:D.accessTable,"aria-label":"当前设备使用范围",role:"table",children:[e.jsx("thead",{role:"rowgroup",children:e.jsx("tr",{role:"row",children:["使用范围","设备","到期时间","操作"].map(l=>e.jsx("th",{scope:"col",role:"columnheader",children:l},l))})}),e.jsx("tbody",{role:"rowgroup",children:o.map(l=>{const p=JSON.stringify([l.team_id,l.expires_at,l.daily_window??null]),c=a.teams?.find(m=>m.id===l.team_id);return e.jsxs("tr",{role:"row",children:[e.jsxs("td",{role:"cell",children:[e.jsx("span",{className:D.accessCellLabel,"aria-hidden":"true",children:"使用范围"}),e.jsxs("div",{children:[e.jsx("strong",{children:l.team_id?Ar(l.daily_window,r)?"项目组专用":"公共（专用时段外）":"公共"}),l.team_id&&e.jsxs("p",{children:[c?.name??`项目组 ${l.team_id}`,a.loading?"（名称读取中）":!c&&!a.error?"（未在当前项目组列表中）":"",e.jsx("span",{className:"muted small",children:" · 所有成员"})]})]})]}),e.jsxs("td",{role:"cell",children:[e.jsx("span",{className:D.accessCellLabel,"aria-hidden":"true",children:"设备"}),e.jsxs("div",{children:[e.jsxs("span",{className:"muted small",children:[l.workers.length," 台设备"]}),e.jsx("ul",{"aria-label":"该范围内的设备",children:l.workers.map(m=>e.jsx("li",{children:m.name||m.id},m.id))})]})]}),e.jsxs("td",{role:"cell",children:[e.jsx("span",{className:D.accessCellLabel,"aria-hidden":"true",children:"到期时间"}),l.daily_window&&e.jsxs("p",{children:["每天 ",l.daily_window.start,"—",l.daily_window.end,l.daily_window.start>l.daily_window.end?"（跨午夜）":"",e.jsxs("span",{className:"muted small",children:[" ","· ",l.daily_window.time_zone," · 时段外公共"]})]}),e.jsx("span",{children:l.team_id?l.expires_at===null?"不自动到期（手动解除）":`${new Date(l.expires_at*1e3).toLocaleString("zh-CN",{hour12:!1})} 到期恢复公共`:"不限制"})]}),e.jsxs("td",{role:"cell",children:[e.jsx("span",{className:D.accessCellLabel,"aria-hidden":"true",children:"操作"}),e.jsx("button",{type:"button","data-focus-key":`worker-access-group:${p}`,disabled:s,onClick:()=>i(l.workers),children:"修改设置"})]})]},p)})})]})}):e.jsx("p",{children:"暂无设备，设备注册后会在这里显示当前使用范围。"}):e.jsx("p",{children:t?"使用范围读取失败，请重试读取。":"正在读取已设置的使用范围…"})]})})}function br({gpu:n,ram:r,live:t}){const s=[...n?[{label:`GPU ${n.index??""} 显存`,short:"显存",used:n.memory_used_bytes,total:n.memory_total_bytes,kind:"vram"}]:[],...r?[{label:"系统内存",short:"系统内存",used:r.used_bytes,total:r.total_bytes,kind:"ram"}]:[]].map(i=>{const o=Q(i.used),l=Q(i.total),p=t&&o!=null&&o>=0&&l!=null&&l>0?Math.max(0,Math.min(100,o/l*100)):null;return{...i,value:p}}),a=t&&n?Q(n.temperature_c):null;return e.jsx("div",{className:D.resourceRow,children:e.jsxs("div",{className:D.resourceReadings,children:[n&&e.jsxs("strong",{className:D.resourceTitle,children:[e.jsxs("span",{children:["GPU ",n.index??"未知"," · ",n.name||"未记录型号"]}),e.jsx("span",{children:a==null?"温度未采集":`${a}°C`})]}),s.map(i=>e.jsxs("div",{className:D.resourceReading,"data-resource":i.kind,role:i.value==null?void 0:"meter","aria-label":i.label,"aria-valuemin":i.value==null?void 0:0,"aria-valuemax":i.value==null?void 0:100,"aria-valuenow":i.value??void 0,"aria-valuetext":i.value==null?void 0:`${$e(i.used)} / ${$e(i.total)}，${Math.round(i.value)}%`,children:[e.jsx("span",{className:D.resourceLabel,children:i.short}),e.jsx("span",{children:t?`${$e(i.used)} / ${$e(i.total)}`:"非实时 / 未采集"}),e.jsx("b",{children:i.value==null?"—":`${Math.round(i.value)}%`}),e.jsx("div",{className:D.resourceBar,"data-resource-bar":!0,"aria-hidden":"true",children:i.value!=null&&e.jsx("i",{"data-resource-fill":!0,style:{width:`${i.value}%`}})})]},i.kind)),r&&e.jsx("span",{className:D.resourceNote,children:t?"系统可见容量":"最后配置见详情"})]})})}function Ci({snapshot:n,now:r,onDetails:t}){const s=n.workers.filter(a=>!xe(a)||qe(a)||["disabled","error"].includes(a.state||""));return s.length?e.jsx(e.Fragment,{children:s.map(a=>e.jsxs("button",{type:"button",className:"attention-item","data-worker":a.id,"data-focus-key":`worker-attention:${a.id}`,onClick:()=>t(a),children:[e.jsxs("span",{className:"attention-top",children:[e.jsx("strong",{className:"danger",children:a.name||a.id}),e.jsx(gn,{name:"chevron"})]}),e.jsx("b",{className:"danger",children:xe(a)?qe(a)?"节点同步失败":sn(a.state):"已离线"}),e.jsx("p",{children:xe(a)?qe(a)&&a.sync_message?a.sync_message:`${_n(a)[0]}；查看完整节点详情。`:`最后心跳 ${Xn(a.last_seen,r)}`})]},a.id))}):e.jsx("p",{className:"muted small",children:"当前没有需要关注的节点异常。"})}function zi(n){const{state:r,store:t,service:s,automatic:a,setAutomatic:i,clock:o}=ui(n),[l,p]=d.useState(!1),c=ys(n.http,l||!!r.snapshot?.workers.some(L=>L.access_team_id)),m=d.useMemo(()=>Fs(n.http),[n.http]),{snapshot:f,stale:u,loading:x,error:w,isolated:y,mutation:N,deletingWorker:j}=r,[h,b]=d.useState(null),[S,I]=d.useState(!1),[A,v]=d.useState(()=>new Set),R=f?.workers.filter(L=>A.has(L.id))??[],O=!!f?.workers.length&&R.length===f.workers.length,g=R.length>0&&!O,{history:_}=r,k=_.filter,C=Ja(f,Math.max(o,Date.now())),M=f?.health||{},ee=f?.status||{},J=n.sandbox||y||u||!f||N!=null,re=()=>b(null),E=L=>{f&&b({kind:"worker",worker:L,snapshot:f})},$=L=>{if(n.sandbox||!t.canMutate()){n.notify({message:"当前不可更新：隔离副本或服务状态未就绪。",tone:"warning"});return}L.kind==="access"&&p(!0),b(L)},P=()=>{if(n.sandbox||!t.canMutate())throw new Error("隔离副本或服务状态未就绪，禁止修改设备")},Z=M.ok===!0?"运行正常":M.ok===!1?"异常":"状态未知",oe=M.comfy_online===!0?"可用":M.comfy_online===!1?"不可用":"状态未知",se=[["运行模式",M.mode==="controller"?"Linux 中间层 / Controller":M.mode==="local"?"Windows 单机":M.mode||"未获取"],["可用能力",Q(M.capabilities)==null?"未获取":`${M.capabilities} 项`],["任务记录",Q(M.jobs)==null?"未获取":`${M.jobs} 条`],["大模型接口",M.llm?M.llm.ok?`已配置 · ${M.llm.model||"型号未记录"}`:"未配置":"未获取"],["页面地址",location.origin+"/controller"],["创作画布",location.origin+"/"]],ue=di(f,_);return e.jsxs("main",{id:"main",className:D.page,tabIndex:-1,"aria-busy":x?!0:void 0,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"运行面板"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{className:"subtitle",id:"service-subtitle",children:f?`中间层${Z} / ComfyUI ${oe}`:"正在读取中间层运行状态"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{className:"muted small",id:"refresh-state",role:"status",children:x?"正在读取…":u?"连接失败 · 快照非实时":f?`最后刷新 ${new Date(f.receivedAt).toLocaleTimeString("zh-CN",{hour12:!1})}`:"正在加载…"}),e.jsxs("label",{className:"check-label",children:[e.jsx("input",{id:"auto-refresh",type:"checkbox",checked:a,onChange:L=>i(L.target.checked)}),"每5秒刷新"]}),e.jsxs("button",{type:"button",className:"primary",id:"refresh",disabled:x||N!=null,onClick:()=>{t.refreshAll()},children:[e.jsx(gn,{name:"refresh"}),"立即刷新"]}),e.jsx("button",{type:"button",id:"sync-all",disabled:J,title:n.sandbox||y?"本地隔离数据副本禁止节点同步，不能修改正式机器。":void 0,onClick:()=>$({kind:"sync"}),children:"一键更新全部节点"})]})]}),e.jsxs("div",{id:"error",className:"f-error",role:"alert",hidden:!w,children:[e.jsxs("div",{children:[e.jsx("b",{id:"error-message",children:w}),e.jsx("p",{children:"已载入内容仅为上次快照，不能作为实时状态；未知数据不记为零。"})]}),e.jsx("button",{type:"button",id:"retry",disabled:x||N!=null,onClick:()=>{t.refreshAll()},children:"重试读取"})]}),e.jsxs("section",{className:`metrics f-metrics6 ${D.overview}`,"aria-label":"运行概览",children:[e.jsx(Re,{id:"service",label:"中间层服务",value:M.ok===!0?"运行正常":M.ok===!1?"异常":"未获取",compact:!0,tone:M.ok===!0?"ok":M.ok===!1?"bad":"",noteId:"service-mode",note:M.mode==="controller"?"Controller 模式":M.mode==="local"?"Windows 单机":M.mode||"等待服务响应"}),e.jsx(Re,{id:"workers",label:"在线执行端",value:f?`${ze(M.online_workers)} / ${ze(M.workers)}`:"未获取",note:"含禁用与同步中的在线节点"}),e.jsx(Re,{id:"running",label:"正在运行",value:ze(ee.running_count),note:"由中间层调度的任务"}),e.jsx(Re,{id:"queued",label:"排队任务",value:ze(ee.queued_count),note:"等待可用执行端"}),e.jsx(Re,{id:"comfy",label:"ComfyUI",value:M.comfy_online===!0?"可用":M.comfy_online===!1?"不可用":"未获取",compact:!0,tone:M.comfy_online===!0?"ok":M.comfy_online===!1?"bad":"",note:"单节点状态见下方卡片"}),e.jsx(Re,{id:"uptime",label:"服务运行时间",value:Q(M.started_at)!=null&&Q(M.server_time)!=null?Kn(Number(M.server_time)-Number(M.started_at)):"未获取",compact:!0,note:"本次中间层服务启动至今"})]}),e.jsxs("div",{className:"dashboard-grid",children:[e.jsxs("section",{className:"card","aria-labelledby":"workers-title",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"workers-title",children:"Windows 执行端"}),e.jsx("p",{className:"section-subtitle",children:"设备资源、当前任务与同步状态"})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{className:"muted small",id:"worker-count",children:f?`${f.workers.length} 台 / ${f.workers.filter(xe).reduce((L,de)=>L+an(de).length,0)} 张在线GPU`:"正在读取"}),e.jsx("button",{type:"button","data-focus-key":"worker-commands",onClick:()=>{b(null),I(!0)},children:"远程命令"})]})]}),e.jsx($i,{snapshot:f,now:C,stale:u,mutationDisabled:J,teams:c,onEdit:L=>{v(new Set(L.map(de=>de.id))),$({kind:"access",workers:L})}}),e.jsxs("div",{className:D.selectionToolbar,role:"group","aria-label":"设备使用范围批量操作",children:[e.jsxs("label",{className:D.selectAll,children:[e.jsx("input",{type:"checkbox","aria-label":"全选设备","aria-checked":g?"mixed":O,checked:O,ref:L=>{L&&(L.indeterminate=g)},disabled:J||!f?.workers.length,onChange:L=>{J||v(new Set(L.target.checked?f?.workers.map(de=>de.id):[]))}}),"全选设备"]}),e.jsxs("span",{role:"status","aria-live":"polite",children:["已选 ",R.length," 台"]}),e.jsx("button",{type:"button",className:"primary","data-focus-key":"worker-access-batch",disabled:J||R.length===0,onClick:()=>{R.length&&$({kind:"access",workers:R})},children:"批量设置使用范围"}),e.jsx("button",{type:"button",disabled:J||R.length===0,onClick:()=>v(new Set),children:"清除选择"})]}),e.jsx("div",{id:"worker-rows",className:D.workerGrid,children:f?e.jsx(Si,{snapshot:f,now:C,stale:u,mutationDisabled:J,deletingWorker:j,onDetails:E,onTemperature:L=>b({kind:"temperature",id:L}),onDelete:L=>$({kind:"delete",worker:L}),onSync:L=>$({kind:"syncWorker",worker:L}),selectedIds:A,onSelection:(L,de)=>{J||v(Ie=>{const Ze=new Set(Ie);return de?Ze.add(L.id):Ze.delete(L.id),Ze})},teams:c.teams}):e.jsx("p",{className:"loading-note",children:w?"执行端读取失败，请点击“重试读取”。":"正在读取执行端…"})}),e.jsx("p",{className:"table-note",children:"显存与内存分条显示，多显卡逐卡列出，系统内存不重复。离线或过期读数不作实时数据。点击清单差异可仅同步该设备。"})]}),e.jsxs("aside",{className:"right-column","aria-label":"需要关注及配置",children:[e.jsxs("section",{className:"card",children:[e.jsx("div",{className:"section-heading",children:e.jsxs("h2",{className:"heading-inline",children:[e.jsx("span",{className:"danger",id:"attention-icon",children:e.jsx(gn,{name:"alert"})}),"需要关注"]})}),e.jsx("div",{className:"attention-list",id:"attention-list",tabIndex:0,role:"region","aria-label":"需要关注的节点列表",children:f?e.jsx(Ci,{snapshot:f,now:C,onDetails:E}):e.jsx("p",{className:"muted small",children:w?"节点状态未获取，不能判断是否存在异常。":"正在读取节点状态…"})})]}),e.jsxs("section",{className:"card",children:[e.jsx("div",{className:"section-heading",children:e.jsx("h2",{children:"服务配置摘要"})}),e.jsx(Qr,{id:"config-rows",className:"f-config-definition",rows:se})]})]})]}),e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"最近任务"}),e.jsx("p",{className:"section-subtitle",children:"数据库历史按时间倒序分批加载；实时任务优先显示，归档未记录的信息不作推测"})]}),e.jsxs("label",{className:"filter-label",children:["任务状态",e.jsxs("select",{id:"jobs-filter",value:k,onChange:L=>{const de=Ms.safeParse(L.target.value);de.success&&t.setHistoryFilter(de.data)},children:[e.jsx("option",{value:"all",children:"全部状态"}),["running","queued","done","error","canceled"].map(L=>e.jsx("option",{value:L,children:Wr[L]},L))]})]})]}),e.jsx("div",{className:"table-wrap f-job-scroll",role:"region","aria-label":"最近任务列表","aria-describedby":"job-note","aria-busy":!!_.loading,tabIndex:0,onScroll:L=>{const{scrollHeight:de,scrollTop:Ie,clientHeight:Ze}=L.currentTarget;de-Ie-Ze<=160&&!_.error&&t.loadMore()},children:e.jsxs("table",{className:"jobs-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["状态","姓名 / 项目 / 卡片","模式","过程进度 / 步骤","执行端","创建时间","耗时 / 错误"].map(L=>e.jsx("th",{scope:"col",children:L},L))})}),e.jsx("tbody",{id:"job-rows",children:e.jsx(fi,{snapshot:f,now:C,items:ue,onError:L=>b({kind:"job",job:L})})})]})}),e.jsxs("div",{className:D.historyControls,children:[e.jsxs("p",{className:"table-note",id:"job-note",role:"status","aria-live":"polite",children:[_.loading?_.loading==="more"?"正在加载更多历史…":"正在刷新任务历史…":_.initialized?_.hasMore?"向下滚动或点击加载更多。":"历史记录已加载完毕。":"任务历史尚未载入。",` 当前筛选历史共 ${_.total??"未知"} 条，已加载 ${_.jobs.length} 条；合并实时任务后显示 ${ue.length} 条。`]}),_.error&&e.jsx("p",{role:"alert",children:_.error}),_.error?e.jsx("button",{type:"button",disabled:!!_.loading,onClick:()=>{t.retryHistory()},children:"重试任务历史"}):e.jsx("button",{type:"button","aria-controls":"job-rows",disabled:!!_.loading||!_.hasMore,onClick:()=>{t.loadMore()},children:"加载更多历史"})]})]})]}),e.jsx(li,{context:n,open:S,workers:f?.workers??[],canMutate:t.canMutate,unavailable:J,onClose:()=>I(!1)}),h?.kind==="worker"&&e.jsx(Ni,{service:s,worker:f?.workers.find(L=>L.id===h.worker.id)||h.worker,snapshot:f||h.snapshot,now:C,stale:u,restartUnavailable:n.sandbox||y?"隔离副本禁止重启真实设备。":N!=null?"设备操作正在提交，请稍候。":!f||u?"服务状态未就绪，请刷新后重试。":f.workers.some(L=>L.id===h.worker.id)?"":"该设备已移除或已被新的注册替代。",onRestart:async L=>{P(),await t.restartWorker(h.worker.id,L)},onClose:re},h.worker.id),h?.kind==="access"&&e.jsx(Oa,{workers:h.workers,now:C,teams:c,unavailable:n.sandbox||y?"隔离副本禁止修改设备使用范围。":N!=null?"设备操作正在提交，请稍候。":!f||u?"服务状态未就绪，请刷新后重试。":h.workers.some(L=>!f.workers.some(de=>de.id===L.id))?"所选设备中有设备已移除或已被新的注册替代，请关闭后重新选择。":"",onSave:async(L,de)=>{P();const Ie=await t.saveAccess(L,de,m);return Ie.failed.length===0&&n.notify({message:"设备使用范围已保存，已有任务不中断。",tone:"success"}),Ie},onClose:re},JSON.stringify(h.workers.map(L=>L.id).sort())),h?.kind==="temperature"&&e.jsx(vi,{workerId:h.id,worker:f?.workers.find(L=>L.id===h.id),service:s,now:C,stale:u,revision:r.refreshed,onClose:re}),h?.kind==="job"&&e.jsx(Ei,{job:h.job,service:s,onClose:re},h.job.id),h?.kind==="syncWorker"&&e.jsxs(he,{title:"同步单台设备",onClose:re,submitLabel:"确认同步此设备",onSubmit:async()=>{P(),await t.syncWorker(h.worker.id),n.notify({message:`同步请求已提交至“${h.worker.name||h.worker.id}”，等待设备空闲后执行；完成情况以节点反馈为准。`,tone:"success"})},children:[e.jsxs("p",{children:["仅同步这一台设备“",h.worker.name||h.worker.id,"”（",h.worker.id,"），不更新其他设备。"]}),e.jsx("div",{className:"notice-box",children:"设备空闲后同步主节点的 ComfyUI 核心、models 和 user，拉取 chouka 最新代码，再按本机 GPU 启动配置重启 ComfyUI 与 Worker，不重启 Windows。同步会复制或覆盖对应文件，并非仅补齐缺失项；不会清除设备上的全部额外资源。"}),e.jsx("p",{children:"忙碌时等待当前任务结束，不立即中断任务。请求提交不代表同步已完成；同步结束后需重新采集清单核对。"})]}),h?.kind==="sync"&&e.jsxs(he,{title:"更新全部节点",onClose:re,submitLabel:"确认更新",onSubmit:async()=>{P();const L=await t.syncAll();n.notify({message:`已向 ${ze(L.worker_count)} 个节点下发更新请求；主节点跳过 ${ze(L.primary_count)} 个，旧版跳过 ${ze(L.skipped_count)} 个。`,tone:"success"})},children:[e.jsx("p",{children:"确认更新全部节点？"}),e.jsx("div",{className:"notice-box",children:"节点空闲后依次同步 ComfyUI 核心、models 和 user，拉取 chouka 最新代码，再按本机 GPU 启动配置重启 ComfyUI 与 Worker。全部服务恢复就绪后才显示完成。忙碌节点等待当前任务结束；离线节点下次上线后执行。主节点作为同步源不会参与更新；旧版节点会跳过，需先手动更新一次 Worker 及配套启动文件。"}),e.jsx("p",{className:"muted small",children:"这是实际节点更新和服务重启操作，确认后将向中间层提交请求。"})]}),h?.kind==="delete"&&e.jsxs(he,{title:"删除设备",onClose:re,submitLabel:"确认删除设备",onSubmit:async()=>{P(),await t.deleteWorker(h.worker.id),n.notify({message:"设备已删除，历史任务和账单保留。",tone:"success"})},children:[e.jsxs("p",{children:["确认删除设备“",h.worker.name||"未命名执行端","”？"]}),e.jsx("div",{className:"notice-box",children:"设备会从列表中移除，历史任务和账单不会删除。设备后续重新注册时会重新出现。"})]})]})}function Ei({job:n,service:r,onClose:t}){const s=Yr(r.job,n.history_only===!0?null:n.id),a=n.history_only===!0?n:s.data;return e.jsxs(he,{title:"任务错误详情",onClose:t,children:[e.jsxs("p",{children:["任务 ",n.id]}),e.jsx("pre",{children:(a??n).error||"未记录错误详情"}),s.loading&&e.jsx("p",{role:"status",children:"正在读取完整任务执行记录…"}),s.error&&e.jsxs("div",{role:"alert",children:[e.jsxs("p",{children:["读取完整任务执行记录失败：",s.error]}),e.jsx("button",{type:"button",onClick:s.retry,children:"重试任务执行记录"})]}),a&&e.jsxs("details",{children:[e.jsx("summary",{children:"任务执行记录"}),e.jsx("pre",{children:JSON.stringify(a,null,2)})]})]})}function Re({id:n,label:r,value:t,note:s,noteId:a,compact:i=!1,tone:o=""}){return e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:r}),e.jsx("p",{className:`metric-value${i?" compact":""}${o?` ${o}`:""}`,id:n,children:t}),e.jsx("p",{className:"metric-note",id:a,children:s})]})})}const Ye=we([z().min(1),V().finite()]).transform(String),Ve=Pe(["user","admin","monitor"]),en=Pe(["read","operate"]),Mi=F({id:Ye,username:z(),display_name:z().nullish(),phone:z().nullish(),role:Ve,enabled:X(),team_leader:X().default(!1),approval_status:z().optional(),local_login_enabled:X().optional(),dinghai_identity:Et.optional()}),Pi=F({id:z().min(1),name:z().nullish(),owner_id:Ye,owner_username:z().nullish(),owner_display_name:z().nullish(),team_id:z().nullish(),team_name:z().nullish()}),yr=we([F({scope:me("all"),viewer_id:Ye,permission:en}),F({scope:me("owner").optional(),viewer_id:Ye,owner_id:Ye.refine(n=>n!=="*","无效所有者"),permission:en})]),Ii=F({requests:W(F({username:z(),display_name:z().nullish(),status:z(),created_at:V().nullish(),decided_by:z().nullish()})),outbox:F({pending:V().int().nonnegative(),oldest_at:V().nullish()}).nullish()}),et={admin:"管理员",user:"普通用户",monitor:"监控展示员"},bn={approved:"已通过",pending:"待审批",rejected:"已拒绝"},hn="全部个人和项目组画布，包括现有及未来新增画布",nt="画布内容和历史费用不变。新所有者的授权访问者将获得相应权限（可操作包含删除）；原所有者及其授权访问者可能失去访问权限。管理员仍可访问全部画布。项目组画布由成员关系授权，不能改为个人归属。";function nn(n){return(n?.username||"未知账号")+(n?.display_name?.trim()?`（${n.display_name.trim()}）`:"")}function ve(n,r){return`${nn(n.find(t=>t.id===r))}（ID: ${r}）`}function Dn(n,r){const t=r.find(s=>s.id===n.owner_id);return nn({username:n.owner_username||t?.username,display_name:n.owner_display_name||t?.display_name})}function On(n){return n==="operate"?"可操作（含删除）":"只读"}function rt(n){return n?new Date(n*1e3).toLocaleString("zh-CN",{hour12:!1}):"—"}const _e=z().min(1).max(512).refine(n=>n!=="*","无效账号 ID"),tt=z().min(8,"密码至少 8 位").max(1024),Ri=F({username:z().trim().min(1,"请输入账号名").max(128),password:tt,role:Ve,team_leader:X()}).refine(n=>n.role!=="monitor"||!n.team_leader,"监控展示员不能担任组长"),Ti=Rt("scope",[F({scope:me("all"),viewer_id:_e,permission:en}),F({scope:me("owner"),viewer_id:_e,owner_id:_e,permission:en}).refine(n=>n.viewer_id!==n.owner_id,"访问者和所有者不能是同一个账号。")]),Li=F({owner_id:_e,projects:W(F({project_id:z().min(1).max(512),owner_id:_e})).min(1,"请选择画布").max(1e3,"每次最多分配 1000 个画布")}).refine(n=>new Set(n.projects.map(r=>r.project_id)).size===n.projects.length,"画布分配清单存在重复项"),Ai=F({role:Ve.optional(),enabled:X().optional(),team_leader:X().optional(),display_name:z().trim().min(1,"请输入本地姓名 / 花名").max(64).optional(),phone:z().regex(/^(?:1[3-9]\d{9})?$/,"请输入有效的 11 位手机号，或留空清除").optional()}).strict().refine(n=>Object.values(n).some(r=>r!==void 0),"请选择修改内容"),jr=F({}).passthrough(),vr=n=>`/api/admin/global-grants/${encodeURIComponent(_e.parse(n))}`,wr=n=>`/api/admin/users/${encodeURIComponent(_e.parse(n))}`;function Di(n){const r=async(t,s,a)=>{jr.parse(await n.json(t,s,a))};return{async snapshot(t){const s={signal:t,cache:"no-store"},[a,i,o]=await Promise.all([n.read("/api/admin/users",F({users:W(Mi)}),s),n.read("/api/admin/grants",F({grants:W(yr)}),s),n.read("/api/projects",F({projects:W(Pi)}),s)]);return{users:a.users,grants:i.grants,projects:o.projects}},dispatchPriority:t=>n.read("/api/admin/dispatch-priority",F({enabled:X()}),{signal:t,cache:"no-store"}),setDispatchPriority:t=>r("/api/admin/dispatch-priority","PUT",{enabled:X().parse(t)}),registrations:t=>n.read("/api/admin/registrations",Ii,{signal:t,cache:"no-store"}),create:t=>r("/api/admin/users","POST",Ri.parse(t)),update:(t,s)=>r(wr(t),"PATCH",Ai.parse(s)),resetPassword:(t,s)=>r(`${wr(t)}/password`,"POST",{password:tt.parse(s)}),saveGrant:t=>{const s=Ti.parse(t);return s.scope==="all"?r(vr(s.viewer_id),"PUT",{permission:s.permission}):r("/api/admin/grants","PUT",{viewer_id:s.viewer_id,owner_id:s.owner_id,permission:s.permission})},async revokeGrant(t){const s=yr.parse(t),a=s.scope==="all"?vr(s.viewer_id):`/api/admin/grants/${encodeURIComponent(_e.parse(s.viewer_id))}/${encodeURIComponent(_e.parse(s.owner_id))}`;jr.parse(await n.request(a,{method:"DELETE"}))},async assign(t){const s=await n.json("/api/admin/projects/assign","POST",Li.parse(t));return F({count:V().int().nonnegative()}).parse(s).count}}}function Ne(n,r){const t=new FormData(n).get(r);if(typeof t!="string")throw new Error("表单字段不正确："+r);return t}function Oi(n,r,t){const s=r.trim().toLowerCase();return n.filter(a=>(!t||a.owner_id===t)&&(!s||(a.name||"").toLowerCase().includes(s)||a.id.toLowerCase().includes(s)))}function Fi(n,r){const t=n.filter(a=>!a.team_id),s=t.filter(a=>r.has(a.id)).length;return{personal:t,checked:t.length>0&&s===t.length,indeterminate:s>0&&s<t.length}}function qi(n,r,t,s){const a=n.find(i=>i.id===r);if(!a||a.role==="monitor"||t!=="*"&&!n.some(i=>i.id===t))throw new Error("请选择有效账号和授权范围。");if(r===t)throw new Error("访问者和所有者不能是同一个账号。");return t==="*"?{scope:"all",viewer_id:r,permission:s}:{scope:"owner",viewer_id:r,owner_id:t,permission:s}}function Ui(n,r,t,s){const a=n.find(o=>o.id===s&&o.enabled&&o.role!=="monitor");if(!a)throw new Error("请选择有效的启用目标账号。");if(!t.size)throw new Error("请选择个人画布。");if(t.size>1e3)throw new Error("每次最多分配 1000 个画布，请缩小筛选范围后再选择。");const i=r.filter(o=>t.has(o.id));if(i.length!==t.size||i.some(o=>o.team_id))throw new Error("选择包含项目组画布或已变化的画布，请刷新后重新选择。");return{target:a,chosen:i.map(o=>({...o})),payload:{owner_id:a.id,projects:i.map(o=>({project_id:o.id,owner_id:o.owner_id}))}}}function Wi({http:n,notify:r}){const t=d.useMemo(()=>Di(n),[n]),[s,a]=d.useState({users:[],projects:[],grants:[]}),[i,o]=d.useState(null),[l,p]=d.useState(null),[c,m]=d.useState(""),[f,u]=d.useState(!1),[x,w]=d.useState(!0),[y,N]=d.useState(!1),[j,h]=d.useState(""),[b,S]=d.useState("正在加载真实数据…"),[I,A]=d.useState(new Set),[v,R]=d.useState(""),O=d.useRef(!1),g=d.useRef(!1),_=d.useRef(!1),k=d.useRef(0),C=d.useRef(null),M=d.useRef(r);d.useEffect(()=>{M.current=r},[r]);const ee=d.useCallback(async()=>{if(O.current)return;O.current=!0;const E=++k.current,$=new AbortController;C.current=$;const P=()=>_.current&&k.current===E;w(!0),S("正在加载真实数据…");try{const[Z,oe]=await Promise.all([t.snapshot($.signal),t.dispatchPriority($.signal)]);if(!P())return;o(oe.enabled),a(Z),u(!0),A(new Set);try{const se=await t.registrations($.signal);if(!P())return;p(se),m("")}catch(se){if(!P())return;p(null);const ue="注册申请信息加载失败："+ie(se);m(ue),M.current({message:ue,tone:"error"})}P()&&S("更新于 "+new Date().toLocaleTimeString("zh-CN",{hour12:!1}))}catch(Z){if(!P())return;throw u(!1),S("加载失败，请刷新重试"),Z}finally{P()&&(O.current=!1,w(!1))}},[t]),J=d.useCallback(async()=>{if(!(g.current||O.current)){h("");try{await ee()}catch(E){if(!_.current)return;const $=ie(E);h($),M.current({message:$,tone:"error"})}}},[ee]);return d.useEffect(()=>(_.current=!0,J(),()=>{_.current=!1,C.current?.abort(),O.current=!1}),[J]),{...s,dispatchPriority:i,service:t,registrations:l,registrationError:c,ready:f,loading:x,mutationBusy:y,error:j,setError:h,refreshNote:b,selected:I,setSelected:A,assignStatus:v,setAssignStatus:R,refreshPage:J,mutate:async(E,$,P)=>{if(g.current||O.current||!f)throw new Error("另一项操作正在提交或列表尚未就绪，请稍后重试。");g.current=!0,N(!0),h("");try{if(await E(),!_.current)return;P?.(),M.current({message:$,tone:"success"});try{await ee()}catch(Z){if(!_.current)return;const oe="操作已成功，但列表刷新失败，请点击刷新数据后继续："+ie(Z);h(oe),M.current({message:oe,tone:"warning"})}}finally{g.current=!1,_.current&&N(!1)}}}}function st({initial:n="user",onChange:r}){return e.jsxs("label",{className:"field",children:["角色",e.jsx("select",{name:"role",defaultValue:n,onChange:t=>r?.(Ve.parse(t.currentTarget.value)),children:["user","admin","monitor"].map(t=>e.jsx("option",{value:t,children:et[t]},t))})]})}function Bi({user:n}){return e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"notice-box",children:"仅编辑本地资料，不修改账号名、内部用户 ID 或定海验证资料。定海资料由定海维护。"}),e.jsxs("label",{className:"field",children:["本地姓名 / 花名",e.jsx("input",{name:"display_name",defaultValue:n.display_name||"",required:!0,maxLength:64})]}),e.jsxs("label",{className:"field",children:["本地手机号",e.jsx("input",{name:"phone",type:"tel",defaultValue:n.phone||"",maxLength:11,pattern:"1[3-9][0-9]{9}",autoComplete:"tel-national"})]}),e.jsx("p",{className:"auth-note",children:"手机号非空时须为有效的 11 位号码；留空可清除。"})]})}function at(){return e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"field",children:["新密码（至少 8 位）",e.jsx("input",{name:"password",type:"password",minLength:8,maxLength:1024,autoComplete:"new-password",required:!0})]}),e.jsx("p",{className:"notice-box",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。密码不会显示在列表中。"})]})}function Vi(){const[n,r]=d.useState("user"),[t,s]=d.useState(!1);return e.jsxs("div",{id:"create",className:"form-grid",children:[e.jsxs("label",{className:"field",children:["账号名",e.jsx("input",{name:"username",required:!0,maxLength:128,autoComplete:"off"})]}),e.jsx(at,{}),e.jsx(st,{onChange:a=>{r(a),a==="monitor"&&s(!1)}}),e.jsxs("label",{className:"check-label",children:[e.jsx("input",{name:"team_leader",type:"checkbox",checked:t,disabled:n==="monitor",onChange:a=>s(a.currentTarget.checked)}),"独立授予组长权限"]}),e.jsx("p",{className:"notice-box",children:"创建后账号启用并标记为已通过。监控展示员不能担任组长，密码由管理员重置；其他账号登录后可自行修改。"})]})}const Hi="_accountIdentity_1xovb_1",Gi="_dinghaiIdentity_1xovb_8",Ji="_priority_1xovb_29",Zi="_track_1xovb_47",Ki="_thumb_1xovb_59",De={accountIdentity:Hi,dinghaiIdentity:Gi,priority:Ji,switch:"_switch_1xovb_37",track:Zi,thumb:Ki};function He({name:n,id:r,idLabel:t="ID"}){return e.jsxs("span",{className:"perm-identity",children:[e.jsx("span",{className:"perm-username",children:n}),e.jsxs("span",{className:"perm-user-id",children:[t,": ",r]})]})}function kn({columns:n,children:r}){return e.jsx("tr",{children:e.jsx("td",{colSpan:n,children:r})})}function Yi({users:n,busy:r,ready:t,action:s}){return e.jsx("div",{className:"table-wrap accounts-scroll",tabIndex:0,role:"region","aria-label":"账号列表",children:e.jsxs("table",{className:"accounts-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["账号 / ID","本地姓名 / 花名","本地手机号","角色","独立组长权限","启用状态","审批","操作"].map(a=>e.jsx("th",{scope:"col",children:a},a))})}),e.jsxs("tbody",{id:"users",children:[n.map(a=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsxs("div",{className:De.accountIdentity,children:[e.jsx("span",{children:a.local_login_enabled===!1?"定海账号":a.dinghai_identity?"本地账号 · 已绑定定海":"本地账号"}),e.jsx(He,{name:a.username,id:a.id,idLabel:"内部用户 ID"}),a.dinghai_identity&&e.jsxs("dl",{className:De.dinghaiIdentity,"aria-label":"定海验证资料（由定海维护）",children:[e.jsxs("div",{children:[e.jsx("dt",{children:"资料来源"}),e.jsx("dd",{children:"定海验证 · 由定海维护"})]}),[["定海用户名",a.dinghai_identity.username],["定海姓名 / 花名",a.dinghai_identity.display_name],["定海手机号",a.dinghai_identity.phone],["定海 ID",a.dinghai_identity.id]].map(([i,o])=>e.jsxs("div",{children:[e.jsx("dt",{children:i}),e.jsx("dd",{children:o||"未填写"})]},i))]})]})}),e.jsx("td",{children:a.local_login_enabled===!1?"—":a.display_name||"—"}),e.jsx("td",{children:a.local_login_enabled===!1?"—":a.phone||"未填写"}),e.jsx("td",{children:e.jsx("span",{className:"f-chip "+(a.role==="admin"?"admin":""),children:et[a.role]})}),e.jsx("td",{children:a.team_leader?"是":"否"}),e.jsx("td",{children:e.jsx("span",{className:"f-chip "+(a.enabled?"on":"off"),children:a.enabled?"启用":"已停用"})}),e.jsx("td",{children:Object.hasOwn(bn,a.approval_status||"")?bn[a.approval_status||""]:"—"}),e.jsx("td",{children:e.jsxs("div",{className:"row-actions",children:[e.jsx("button",{type:"button",className:a.enabled?"danger":"",disabled:r,onClick:()=>s(a,"enabled"),children:a.enabled?"停用":"启用"}),e.jsx("button",{type:"button",disabled:r,onClick:()=>s(a,"role"),children:"修改角色"}),a.role!=="monitor"&&e.jsx("button",{type:"button",disabled:r,onClick:()=>s(a,"leader"),children:a.team_leader?"取消组长权限":"设为组长"}),a.local_login_enabled===!1?e.jsx("span",{children:"密码由定海管理"}):e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",disabled:r,onClick:()=>s(a,"profile"),children:"编辑资料"}),e.jsx("button",{type:"button",disabled:r,onClick:()=>s(a,"password"),children:"重置密码"})]})]})})]},a.id)),!n.length&&e.jsx(kn,{columns:8,children:t?"暂无账号。":"正在加载账号…"})]})]})})}function Xi({data:n,error:r}){return e.jsx("div",{className:"table-wrap registrations-scroll",tabIndex:0,role:"region","aria-label":"注册申请列表",children:e.jsxs("table",{className:"registration-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["账号","姓名 / 花名","状态","申请时间","审批人"].map(t=>e.jsx("th",{scope:"col",children:t},t))})}),e.jsxs("tbody",{id:"registrations",children:[n?.requests.map((t,s)=>e.jsxs("tr",{children:[e.jsx("td",{children:t.username}),e.jsx("td",{children:t.display_name||"—"}),e.jsx("td",{children:Object.hasOwn(bn,t.status)?bn[t.status]:t.status}),e.jsx("td",{children:rt(t.created_at)}),e.jsx("td",{children:t.decided_by||"—"})]},t.username+"-"+s)),!n?.requests.length&&e.jsx(kn,{columns:5,children:r?"暂时无法加载注册申请，请点击刷新数据重试。":n?"暂无自主注册申请。":"正在加载注册申请…"})]})]})})}function Qi({grants:n,users:r,busy:t,ready:s,revoke:a}){return e.jsx("div",{className:"table-wrap",tabIndex:0,role:"region","aria-label":"画布授权列表",children:e.jsxs("table",{className:"grant-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["访问者 A","方向","所有者 / 授权范围","权限","操作"].map(i=>e.jsx("th",{scope:"col",children:i},i))})}),e.jsxs("tbody",{id:"grants",children:[n.map(i=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx(He,{name:nn(r.find(o=>o.id===i.viewer_id)),id:i.viewer_id})}),e.jsx("td",{children:"→"}),e.jsx("td",{children:i.scope==="all"?e.jsxs(e.Fragment,{children:["所有画布",e.jsx("span",{className:"perm-user-id",children:hn})]}):e.jsx(He,{name:nn(r.find(o=>o.id===i.owner_id)),id:i.owner_id})}),e.jsx("td",{children:On(i.permission)}),e.jsx("td",{children:e.jsx("button",{type:"button",className:"danger",disabled:t,onClick:()=>a(i),children:"撤销"})})]},i.viewer_id+"-"+(i.scope==="all"?"*":i.owner_id))),!n.length&&e.jsx(kn,{columns:5,children:s?"暂无画布授权。选择访问者与所有者 / 授权范围后保存。":"正在加载授权…"})]})]})})}function eo({projects:n,users:r,target:t}){return e.jsx("div",{className:"dialog-list",tabIndex:0,role:"region","aria-label":"画布分配确认明细",children:e.jsxs("table",{children:[e.jsx("thead",{children:e.jsx("tr",{children:["画布名称","画布 ID","旧归属","目标归属"].map(s=>e.jsx("th",{scope:"col",children:s},s))})}),e.jsx("tbody",{children:n.map(s=>e.jsxs("tr",{children:[e.jsx("td",{children:s.name||"未命名画布"}),e.jsx("td",{children:s.id}),e.jsx("td",{children:e.jsx(He,{name:Dn(s,r),id:s.owner_id})}),e.jsx("td",{children:e.jsx(He,{name:nn(t),id:t.id})})]},s.id))})]})})}function no({projects:n,users:r,busy:t,ready:s,selected:a,setSelected:i,status:o,onConfirm:l,onError:p}){const[c,m]=d.useState(""),[f,u]=d.useState(""),[x,w]=d.useState(""),y=new Map(n.map(v=>[v.owner_id,`${Dn(v,r)}（ID: ${v.owner_id}）`])),N=y.has(f)?f:"",j=r.filter(v=>v.enabled&&v.role!=="monitor"),h=j.some(v=>v.id===x)?x:"",b=Oi(n,c,N),S=Fi(b,a),I=d.useRef(null);d.useEffect(()=>{I.current&&(I.current.indeterminate=S.indeterminate)},[S.indeterminate]);const A=v=>{v(),i(new Set)};return e.jsxs("section",{className:"card","aria-labelledby":"history-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"history-heading",tabIndex:-1,children:"历史画布分配"}),e.jsx("span",{className:"small muted",children:"仅个人空间 / 每次最多 1000 个"})]}),e.jsx("div",{className:"f-pad",children:e.jsx("p",{className:"notice-box",children:nt})}),e.jsxs("div",{className:"allocation-tools",children:[e.jsxs("div",{className:"allocation-filters",children:[e.jsxs("label",{className:"field",children:["搜索名称 / ID",e.jsx("input",{id:"project-search",type:"search",autoComplete:"off",placeholder:"输入画布名称或 ID",value:c,disabled:t,onChange:v=>A(()=>m(v.currentTarget.value))})]}),e.jsxs("label",{className:"field",children:["当前所有者",e.jsxs("select",{id:"project-owner",value:N,disabled:t,onChange:v=>A(()=>u(v.currentTarget.value)),children:[e.jsx("option",{value:"",children:"全部所有者"}),[...y].map(([v,R])=>e.jsx("option",{value:v,children:R},v))]})]})]}),e.jsxs("form",{id:"assign",className:"allocation-batch","aria-busy":t,onSubmit:v=>{if(v.preventDefault(),!t)try{l(Ui(r,b,a,h))}catch(R){p(ie(R))}},children:[e.jsxs("label",{className:"field",children:["目标账号（仅启用账号）",e.jsxs("select",{name:"owner_id",required:!0,value:h,disabled:t,onChange:v=>w(v.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择目标账号"}),j.map(v=>e.jsx("option",{value:v.id,children:ve(r,v.id)},v.id))]})]}),e.jsxs("span",{id:"project-selected",role:"status",children:["已选 ",a.size," 个画布",a.size>1e3?"（超过 1000 个上限）":""]}),e.jsx("button",{id:"assign-submit",className:"primary",disabled:t||!a.size||!h,children:"分配所选画布"}),e.jsx("button",{id:"clear-selection",type:"button",disabled:t||!a.size,onClick:()=>i(new Set),children:"清空选择"})]})]}),e.jsx("p",{id:"assign-status",className:"table-note f-status",role:"status",children:o}),e.jsx("div",{className:"table-wrap history-scroll",tabIndex:0,role:"region","aria-label":"历史画布列表",children:e.jsxs("table",{className:"allocation-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{scope:"col",children:e.jsx("input",{ref:I,id:"project-all",type:"checkbox","aria-label":"全选当前筛选结果中的个人画布",checked:S.checked,disabled:t||!S.personal.length,onChange:v=>i(new Set(v.currentTarget.checked?S.personal.map(R=>R.id):[]))})}),["画布名称","画布 ID","当前所有者","空间"].map(v=>e.jsx("th",{scope:"col",children:v},v))]})}),e.jsxs("tbody",{id:"projects",children:[b.map(v=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("input",{type:"checkbox","data-team":String(!!v.team_id),checked:a.has(v.id),"aria-label":`选择画布 ${v.name||"未命名画布"}（${v.id}）`,disabled:t||!!v.team_id,onChange:R=>{const O=new Set(a);R.currentTarget.checked?O.add(v.id):O.delete(v.id),i(O)}})}),e.jsx("td",{children:v.name||"未命名画布"}),e.jsx("td",{className:"perm-id",children:v.id}),e.jsx("td",{children:e.jsx(He,{name:Dn(v,r),id:v.owner_id})}),e.jsx("td",{children:v.team_id?e.jsxs(e.Fragment,{children:["项目组：",v.team_name||v.team_id,e.jsx("span",{className:"team-space",children:"由成员关系授权，不可改为个人归属"})]}):"个人空间"})]},v.id)),!b.length&&e.jsx(kn,{columns:5,children:s?"暂无符合条件的画布，请尝试更换搜索词或当前所有者。":"正在加载画布…"})]})]})}),e.jsx("p",{className:"table-note",children:"搜索或切换当前所有者会清空选择。全选只选择当前筛选结果中的个人画布，项目组画布不可选；超过 1000 个时请缩小筛选范围。"})]})}function ro(n){const r=Wi(n),{users:t,grants:s,projects:a,service:i}=r,[o,l]=d.useState(null),[p,c]=d.useState(""),[m,f]=d.useState(""),[u,x]=d.useState(""),w=d.useRef(null),y=r.loading||r.mutationBusy||!r.ready,N=y&&!o,j=g=>{r.setError(g),n.notify({message:g,tone:"error"})},h=g=>{!y&&!o&&l(g)},b=(g,_)=>{if((_==="password"||_==="profile")&&g.local_login_enabled===!1)return;const k=e.jsxs("p",{children:["目标账号：",e.jsx("b",{children:ve(t,g.id)})]});if(_==="profile")return h({title:"编辑本地资料",children:e.jsxs(e.Fragment,{children:[k,e.jsx(Bi,{user:g})]}),submitLabel:"保存本地资料",action:re=>i.update(g.id,{display_name:Ne(re,"display_name"),phone:Ne(re,"phone")}),message:"本地资料已更新"});if(_==="password")return h({title:"重置密码",children:e.jsxs(e.Fragment,{children:[k,e.jsx(at,{}),e.jsx("p",{className:"notice-box danger",children:"该账号现有会话将失效，需要使用新密码重新登录。请妥善告知本人。"})]}),submitLabel:"确认重置密码",action:re=>i.resetPassword(g.id,Ne(re,"password")),message:"密码已重置"});if(_==="role")return h({title:"修改账号角色",children:e.jsxs(e.Fragment,{children:[k,e.jsx(st,{initial:g.role}),e.jsx("p",{className:"notice-box danger",children:"管理员天然可访问全部画布。切换为监控展示员会清除组长权限，已有画布授权保留但不生效；其他角色的组长权限不变。修改角色会使该账号现有会话失效；最后一位启用管理员受系统保护。"})]}),submitLabel:"确认修改角色",action:re=>i.update(g.id,{role:Ve.parse(Ne(re,"role"))}),message:"账号角色已修改"});const C=_==="enabled",M=C?!g.enabled:!g.team_leader,ee=C?M?"启用账号":"停用账号":M?"授予组长权限":"取消组长权限",J=C?M?"启用不会跳过钉钉注册审批，审批状态保持不变。":"停用后该账号不能继续登录，现有会话失效。不会删除既有项目组关系或画布授权；最后一位启用管理员受系统保护。":M?"授予该用户创建项目组和管理自己创建项目组的权限，不会成为管理员，也不能管理其他人的项目组。现有会话失效后需重新登录。":"取消后不能继续创建项目组，现有会话失效。已授予的组内组长身份和成员关系保持不变，仍可管理对应项目组。";h({title:ee,children:e.jsxs(e.Fragment,{children:[k,e.jsx("p",{className:"notice-box",children:J})]}),submitLabel:"确认"+ee,action:()=>i.update(g.id,C?{enabled:M}:{team_leader:M}),message:ee+"成功"})},S=g=>{const _=g.scope==="all"?"所有画布（"+hn+"）":ve(t,g.owner_id);h({title:"确认撤销授权",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:[ve(t,g.viewer_id)," → ",_]}),e.jsxs("p",{children:["权限：",On(g.permission)]}),e.jsx("p",{className:"notice-box danger",children:"撤销后即时重新校验权限，访问者失去这条授权带来的全部画布访问权。此授权不会使其成为管理员；管理员天然权限、项目组成员关系和其他独立授权不受影响。"})]}),submitLabel:"确认撤销授权",action:()=>i.revokeGrant(g),message:"已撤销画布授权"})},I=t.filter(g=>g.role!=="monitor"),A=I.some(g=>g.id===m)?m:"",v=u==="*"||t.some(g=>g.id===u)?u:"",R=[{id:"users",label:"账号总数",value:t.length,note:"角色与独立组长权限分别管理"},{id:"enabled",label:"启用账号",value:t.filter(g=>g.enabled).length,note:"停用不会删除账号或画布授权"},{id:"pending",label:"待审批注册",value:r.registrations?.requests.filter(g=>g.status==="pending").length??"—",note:"仅由钉钉指定审批人处理"},{id:"grants",label:"画布授权",value:s.length,note:"访问者 A → 所有者 / 授权范围"}],O=r.registrations?.outbox;return e.jsxs("main",{id:"main",tabIndex:-1,ref:w,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"账号与权限"}),e.jsx("div",{className:"page-caption",children:e.jsx("p",{className:"subtitle",children:"管理账号、画布访问与历史画布归属"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{id:"refresh-note",className:"refresh-note",role:"status",children:r.refreshNote}),e.jsx("button",{id:"refresh",type:"button",disabled:r.loading||r.mutationBusy||!!o,onClick:()=>{r.refreshPage()},children:"刷新数据"})]})]}),e.jsx("p",{id:"error",className:"page-status",role:"alert",children:r.error}),e.jsxs("section",{className:`card ${De.priority}`,"aria-labelledby":"priority-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"priority-heading",children:"管理员项目组任务优先"}),e.jsx("p",{id:"priority-help",className:"section-subtitle",children:"默认关闭。开启后，组长为管理员的项目组内成员提交的排队任务，优先分配兼容的空闲机器，不抢占正在执行的任务。优先任务按提交顺序分配；开关、组成员和组长角色变化实时作用于已排队任务。"}),e.jsx("p",{role:"status",children:r.dispatchPriority===null?"正在读取设置…":r.dispatchPriority?"已开启":"已关闭"})]}),e.jsx("button",{type:"button",role:"switch","aria-checked":r.dispatchPriority===!0,"aria-labelledby":"priority-heading","aria-describedby":"priority-help",className:De.switch,disabled:N||r.dispatchPriority===null,onClick:()=>{r.mutate(()=>i.setDispatchPriority(!r.dispatchPriority),"任务优先设置已保存").catch(g=>j(ie(g)))},children:e.jsx("span",{className:De.track,"aria-hidden":"true",children:e.jsx("span",{className:De.thumb})})})]}),e.jsx("section",{className:"metrics","aria-label":"权限概览",children:R.map(g=>e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:g.label}),e.jsx("p",{id:"metric-"+g.id,className:"metric-value",children:g.id==="pending"||r.ready||t.length?g.value:"—"}),e.jsx("p",{className:"metric-note",children:g.note})]})},g.id))}),e.jsx("nav",{className:"section-nav","aria-label":"权限管理分区",children:[["accounts","账号管理"],["registrations","注册申请"],["grants","画布授权"],["history","历史画布分配"]].map(([g,_])=>e.jsx("a",{href:"#"+g+"-heading",onClick:()=>w.current?.querySelector("#"+g+"-heading")?.focus(),children:_},g))}),e.jsxs("section",{className:"card","aria-labelledby":"accounts-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"accounts-heading",tabIndex:-1,children:"账号管理"}),e.jsx("p",{className:"section-subtitle",children:"账号角色包括管理员、普通用户和监控展示员。监控展示员仅可查看监控，不能担任组长或访问画布。 启停仅影响抽卡访问；定海账号资料和密码请在定海维护。"})]}),e.jsx("button",{id:"create-user",type:"button",className:"primary",disabled:N,onClick:()=>h({title:"新建账号",children:e.jsx(Vi,{}),submitLabel:"创建账号",action:g=>i.create({username:Ne(g,"username").trim(),password:Ne(g,"password"),role:Ve.parse(Ne(g,"role")),team_leader:new FormData(g).has("team_leader")}),message:"账号已创建"}),children:"新建账号"})]}),e.jsx(Yi,{users:t,busy:N,ready:r.ready,action:b}),e.jsx("p",{className:"table-note",children:"启停、角色、组长权限及重置密码均需确认。初始密码至少 8 位，请勿使用常见弱密码；监控展示员的密码由管理员重置，其他账号登录后可自行修改。"})]}),e.jsxs("div",{className:"permissions-grid",children:[e.jsxs("section",{className:"card","aria-labelledby":"registrations-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"registrations-heading",tabIndex:-1,children:"注册申请"}),e.jsx("span",{className:"small muted",children:"仅查看钉钉审批结果"})]}),e.jsxs("div",{className:"f-pad form-grid",children:[e.jsx("p",{className:"notice-box",children:"自主注册由钉钉群内两位指定审批人在卡片上处理，任意一人先决生效。网页不提供通过或拒绝操作。"}),e.jsx("p",{id:"outbox-status",className:"f-status",role:"status",children:r.registrationError||(r.registrations?O&&O.pending>0?`审批通知积压 ${O.pending} 条（最早 ${O.oldest_at?rt(O.oldest_at):"时间未知"}），系统会自动重试投递。`:"审批通知投递正常。":"")})]}),e.jsx(Xi,{data:r.registrations,error:r.registrationError})]}),e.jsxs("section",{className:"card","aria-labelledby":"grants-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"grants-heading",tabIndex:-1,children:"画布授权"}),e.jsx("span",{className:"small muted",children:"访问者 A → 所有者 / 授权范围"})]}),e.jsx("div",{className:"f-pad",children:e.jsx("p",{id:"grant-help",className:"notice-box",children:"选择指定所有者，A 可查看或操作其当前及以后创建的全部个人画布；选择“所有画布”则覆盖全部个人和项目组画布，包括现有及未来新增画布。可操作包含删除；授权不传递，也不会成为管理员。管理员天然可访问全部画布，停用账号不会因授权恢复登录权限。"})}),e.jsxs("form",{id:"grant",className:"grant-form","aria-describedby":"grant-help","aria-busy":r.mutationBusy,onSubmit:g=>{if(g.preventDefault(),!y){c("");try{const _=qi(t,A,v,en.parse(Ne(g.currentTarget,"permission"))),k=_.scope==="all"?"所有画布（"+hn+"）":ve(t,_.owner_id),C=_.scope==="all"?"覆盖"+hn+"，不受所有者或项目组成员关系限制。":"覆盖所有者当前和以后创建的全部个人画布，不包含项目组画布。";h({title:"确认画布授权",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["访问者 A：",ve(t,_.viewer_id)]}),e.jsxs("p",{children:["所有者 / 授权范围：",k]}),e.jsxs("p",{children:["权限：",e.jsx("b",{children:On(_.permission)})]}),e.jsxs("p",{className:"notice-box danger",children:[C,"可操作包含删除；授权不传递，也不会成为管理员。已有同范围授权将被更新，其他独立授权保留；保存后即时重新校验权限。停用账号不会因此恢复登录。"]})]}),submitLabel:"确认保存授权",action:()=>i.saveGrant(_),message:"画布授权已保存"})}catch(_){const k=ie(_);c(k),n.notify({message:k,tone:"error"})}}},children:[e.jsxs("label",{className:"field",children:["访问者 A",e.jsxs("select",{name:"viewer_id",required:!0,disabled:N,value:A,onChange:g=>f(g.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择账号"}),I.map(g=>e.jsx("option",{value:g.id,children:ve(t,g.id)},g.id))]})]}),e.jsxs("label",{className:"field",children:["所有者 / 授权范围",e.jsxs("select",{name:"owner_id",required:!0,disabled:N,value:v,onChange:g=>x(g.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择所有者 / 授权范围"}),e.jsx("option",{value:"*",children:"所有画布（含以后新增）"}),t.map(g=>e.jsx("option",{value:g.id,children:ve(t,g.id)},g.id))]})]}),e.jsxs("label",{className:"field",children:["权限",e.jsxs("select",{name:"permission",disabled:N,children:[e.jsx("option",{value:"read",children:"只读"}),e.jsx("option",{value:"operate",children:"可操作（含删除）"})]})]}),e.jsx("button",{id:"grant-submit",className:"primary",disabled:N,children:"保存授权"}),e.jsx("p",{id:"grant-error",className:"danger small",role:"alert",children:p})]}),e.jsx(Qi,{grants:s,users:t,busy:N,ready:r.ready,revoke:S})]})]}),e.jsx(no,{projects:a,users:t,busy:N,ready:r.ready,selected:r.selected,setSelected:r.setSelected,status:r.assignStatus,onError:j,onConfirm:({target:g,chosen:_,payload:k})=>h({title:"确认分配 "+_.length+" 个画布",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["目标账号：",e.jsx("b",{children:ve(t,g.id)})]}),e.jsx("p",{className:"notice-box danger",children:nt}),e.jsx(eo,{projects:_,users:t,target:g})]}),submitLabel:"确认分配所列画布",action:async()=>{const C=await i.assign(k);r.setSelected(new Set),r.setAssignStatus(`分配成功：已将 ${C} 个画布分配给 ${ve(t,g.id)}。`)},message:"画布归属已分配"})})]}),o&&e.jsx(he,{title:o.title,submitLabel:o.submitLabel,onClose:()=>l(null),onSubmit:g=>r.mutate(()=>o.action(g),o.message,o.afterSuccess),children:o.children})]})}const pn="/api/creation-agent/admin/skills",to=F({skill:vn,files:W(z())}),so=4*1024*1024,ao=F({builtins:W(Dt),skills:W(vn)});function io(n){return{list:r=>n.read(pn,ao,{signal:r,cache:"no-store"}),async importZip(r,t){if(r.size>so)throw new Error("ZIP 压缩文件不能超过 4 MiB；草稿已保留。");if(!r.name.toLowerCase().endsWith(".zip"))throw new Error("请选择 .zip 文件；草稿已保留。");return to.parse(await n.request(`${pn}/import-zip`,{method:"POST",headers:{"Content-Type":"application/zip"},body:r,signal:t}))},async publish(r){F({ok:me(!0)}).parse(await n.json(pn,"POST",vn.parse(r)))},async revoke(r){F({ok:me(!0)}).parse(await n.request(`${pn}/${encodeURIComponent(At.parse(r))}`,{method:"DELETE"}))}}}const oo="_management_1gfcj_1",lo="_catalog_1gfcj_5",co="_catalogItem_1gfcj_11",po="_origin_1gfcj_25",uo="_enabled_1gfcj_30",mo="_hint_1gfcj_34",ho="_error_1gfcj_40",xo="_editor_1gfcj_45",fo="_fields_1gfcj_46",go="_references_1gfcj_47",bo="_guide_1gfcj_71",yo="_actions_1gfcj_77",jo="_options_1gfcj_78",vo="_upload_1gfcj_89",wo="_warning_1gfcj_91",_o="_preview_1gfcj_92",ko="_check_1gfcj_110",No="_enableSwitch_1gfcj_124",So="_track_1gfcj_136",$o="_thumb_1gfcj_149",B={management:oo,catalog:lo,catalogItem:co,origin:po,enabled:uo,hint:mo,error:ho,editor:xo,fields:fo,references:go,guide:bo,actions:yo,options:jo,upload:vo,warning:wo,preview:_o,check:ko,enableSwitch:No,track:So,thumb:$o};function Co({draft:n,onChange:r}){const t=Object.keys(n.references),[s,a]=d.useState(t[0]??""),[i,o]=d.useState(""),[l,p]=d.useState(""),c=t.includes(s)?s:t[0]??"",m=Object.hasOwn(n.referenceTriggers,c);function f(){if(!window.confirm(`确认从草稿移除参考资料 ${c}？发布后才会生效。`))return;const u={...n.references},x={...n.referenceTriggers};delete u[c],delete x[c],r({...n,references:u,referenceTriggers:x}),a("")}return e.jsxs("section",{className:B.references,"aria-labelledby":"skill-references-heading",children:[e.jsxs("h4",{id:"skill-references-heading",children:["参考资料（",t.length," / 128）"]}),e.jsx("p",{className:B.hint,children:"相对路径仅支持 .md、.txt、.yaml、.yml；不能使用绝对路径或 ..。正文原样保存，不执行脚本。"}),e.jsxs("label",{className:"field",children:["新参考资料路径",e.jsx("input",{value:i,placeholder:"references/guide.md","aria-invalid":!!l,"aria-describedby":l?"skill-reference-path-error":void 0,onChange:u=>{o(u.target.value),p("")}})]}),e.jsx("button",{type:"button",disabled:t.length>=128,onClick:()=>{const u=Ot.safeParse(i);if(!u.success){p("请输入有效的相对文字文件路径，不可包含空格、绝对路径或 ..。");return}if(t.some(x=>x.toLowerCase()===u.data.toLowerCase())){p("该参考资料路径已存在（不区分大小写），请直接选择编辑。");return}r({...n,references:{...n.references,[u.data]:""}}),a(u.data),o(""),p("")},children:"添加参考资料"}),l&&e.jsx("p",{id:"skill-reference-path-error",role:"alert",className:B.error,children:l}),t.length?e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"field",children:["选择参考资料",e.jsx("select",{value:c,onChange:u=>a(u.target.value),children:t.map(u=>e.jsx("option",{value:u,children:u},u))})]}),e.jsxs("label",{className:"field",children:["参考资料正文",e.jsx("textarea",{rows:12,className:B.guide,value:n.references[c]??"",onChange:u=>r({...n,references:{...n.references,[c]:u.target.value}})})]}),e.jsxs("p",{className:B.hint,children:["当前正文 ",(n.references[c]??"").length," / 128000 UTF-16 字符"]}),e.jsxs("label",{className:"field",children:["参考资料加载规则",e.jsxs("select",{value:m?"keywords":"always",onChange:u=>{const x={...n.referenceTriggers};u.target.value==="always"?delete x[c]:x[c]=[],r({...n,referenceTriggers:x})},children:[e.jsx("option",{value:"always",children:"始终加载（无关键词规则）"}),e.jsx("option",{value:"keywords",children:"仅匹配关键词时加载"})]})]}),e.jsx("p",{className:B.hint,children:"无规则时随 Skill 始终加载；关键词规则仅在命中任意一个词时加载，留空则不自动加载此资料。"}),m&&e.jsxs("label",{className:"field",children:["参考资料关键词（每行一个）",e.jsx("textarea",{rows:3,value:(n.referenceTriggers[c]??[]).join(`
`),onChange:u=>r({...n,referenceTriggers:{...n.referenceTriggers,[c]:u.target.value.split(`
`)}})})]}),e.jsx("button",{type:"button",className:"danger",onClick:f,children:"移除当前参考资料"})]}):e.jsx("p",{className:B.hint,children:"暂无参考资料，可添加文字指南或从 ZIP 导入。"})]})}const zo=[{value:"image",label:"生图时自动匹配"},{value:"video",label:"视频时自动匹配"},{value:"text",label:"文本时自动匹配"}],Eo={id:"Skill ID",name:"中文业务名称",description:"简介",instruction:"文字指南",triggers:"触发词",autoOutputs:"自动匹配产物",references:"参考资料",referenceTriggers:"参考资料关键词"},_r=n=>n.map(r=>r.trim()).filter(Boolean);function Mo({draft:n,onChange:r,busy:t,editing:s,collisionName:a,requestError:i,onPublish:o,onReset:l}){const[p,c]=d.useState({}),[m,f]=d.useState("");function u(w,y,N){return e.jsxs("div",{children:[e.jsxs("label",{className:"field",children:[y,N]}),p[w]&&e.jsx("p",{id:`skill-error-${w}`,className:B.error,children:p[w]})]})}function x(w){return{"aria-invalid":!!p[w],"aria-describedby":p[w]?`skill-error-${w}`:void 0}}return e.jsxs("form",{noValidate:!0,"aria-label":"Skill 编辑器","aria-busy":t,className:B.editor,onSubmit:w=>{if(w.preventDefault(),t)return;const y=vn.safeParse({...n,triggers:_r(n.triggers),referenceTriggers:Object.fromEntries(Object.entries(n.referenceTriggers).map(([N,j])=>[N,_r(j)]))});if(!y.success){const N={};for(const j of y.error.issues){const h=String(j.path[0]??"form");N[h]=`${Eo[h]??"指南"}${j.path.length>1?`（${j.path.slice(1).join(" / ")}）`:""}：${j.message}`}c(N),w.currentTarget.querySelector("[data-validation-summary]")?.focus();return}if(a&&m!==n.id){c({form:"请先确认覆盖同 ID 的现有 Skill；尚未发布。"});return}c({}),o(y.data)},children:[e.jsx("h3",{children:s?"更新 Skill":"发布 Skill"}),e.jsx("p",{className:B.hint,children:"内置、历史和新建 Skill 使用相同字段；修改仅在点击“发布指南”后生效。"}),e.jsx("div",{"data-validation-summary":"",tabIndex:-1,role:Object.keys(p).length?"alert":void 0,children:Object.keys(p).length>0&&e.jsxs("div",{className:B.error,children:[e.jsx("p",{children:"请修正以下内容，草稿已保留。"}),e.jsx("ul",{children:Object.entries(p).map(([w,y])=>e.jsx("li",{children:y},w))})]})}),e.jsxs("fieldset",{disabled:t,className:B.fields,children:[u("id","Skill ID（小写字母、数字、连字符）",e.jsx("input",{value:n.id,readOnly:s,...x("id"),onChange:w=>{f(""),r({...n,id:w.target.value})}})),u("name","中文业务名称",e.jsx("input",{value:n.name,...x("name"),onChange:w=>r({...n,name:w.target.value})})),u("description","简介",e.jsx("textarea",{rows:3,value:n.description,...x("description"),onChange:w=>r({...n,description:w.target.value})})),u("triggers","触发词（每行一个）",e.jsx("textarea",{rows:4,value:n.triggers.join(`
`),...x("triggers"),onChange:w=>r({...n,triggers:w.target.value.split(`
`)})})),e.jsx("p",{className:B.hint,children:"按字面关键词匹配，任意一个命中即可（OR），不是正则表达式。每行一个，最多 64 个，每个最多 80 字；留空不按关键词自动匹配。"}),e.jsxs("fieldset",{className:B.options,children:[e.jsx("legend",{children:"自动匹配产物（可选）"}),zo.map(({value:w,label:y})=>e.jsxs("label",{className:B.check,children:[e.jsx("input",{type:"checkbox",checked:n.autoOutputs.includes(w),onChange:N=>r({...n,autoOutputs:N.target.checked?[...n.autoOutputs,w]:n.autoOutputs.filter(j=>j!==w)})}),y]},w))]}),e.jsx("p",{className:B.hint,children:"与触发词为 OR 关系；取消全部勾选则不按产物自动匹配。原有漫剧 Skill 的生图匹配设置会保留。"}),e.jsxs("button",{type:"button",role:"switch","aria-checked":n.enabled,"aria-describedby":"skill-enabled-help",className:B.enableSwitch,disabled:t,onClick:()=>r({...n,enabled:!n.enabled}),children:[e.jsx("span",{className:B.track,"aria-hidden":"true",children:e.jsx("span",{className:B.thumb})}),"启用 Skill"]}),e.jsx("p",{id:"skill-enabled-help",className:B.hint,children:"停用后保留全部配置，但不能再选择或加载；重新开启并发布可恢复。"}),u("instruction","文字指南（原文）",e.jsx("textarea",{rows:16,className:B.guide,value:n.instruction,...x("instruction"),onChange:w=>r({...n,instruction:w.target.value})})),e.jsxs("p",{className:B.hint,children:["主指南 ",n.instruction.length," / 128000 UTF-16 字符；每份参考资料同限，合计最多 600000，不截断正文。"]}),e.jsx(Co,{draft:n,onChange:r}),(p.references||p.referenceTriggers)&&e.jsx("p",{className:B.error,children:p.references||p.referenceTriggers}),a&&e.jsxs("div",{className:B.warning,role:"note",children:[e.jsxs("p",{children:["同 ID “",n.id,"” 已存在（",a,"）。发布将覆盖现有名称、指南、触发词、参考资料和启用状态，不会新建副本。"]}),e.jsxs("label",{className:B.check,children:[e.jsx("input",{type:"checkbox",checked:m===n.id,onChange:w=>f(w.target.checked?n.id:"")}),"我确认覆盖此 ID 的现有 Skill"]})]}),i&&e.jsx("p",{role:"alert",className:B.error,children:i}),t&&e.jsx("p",{role:"status",children:"正在处理，草稿暂不可编辑…"}),e.jsxs("div",{className:B.actions,children:[e.jsx("button",{type:"submit",className:"primary",disabled:!!a&&m!==n.id,children:"发布指南"}),e.jsx("button",{type:"button",onClick:l,children:"新建 / 清空表单"})]})]})]})}const kr={id:"",name:"",description:"",instruction:"",triggers:[],autoOutputs:[],references:{},referenceTriggers:{},enabled:!0};function Po({http:n,notify:r}){const t=d.useMemo(()=>io(n),[n]),[s,a]=d.useState(null),[i,o]=d.useState(kr),[l,p]=d.useState(""),[c,m]=d.useState(0),[f,u]=d.useState([]),[x,w]=d.useState(!1),y=d.useRef(!1),N=d.useRef(!1),[j,h]=d.useState(""),[b,S]=d.useState("catalog"),[I,A]=d.useState(""),[v,R]=d.useState(!0),[O,g]=d.useState(0),_=d.useRef(null),k=d.useRef(null);d.useEffect(()=>(N.current=!0,()=>{N.current=!1,_.current?.abort()}),[]),d.useEffect(()=>{const E=new AbortController;return t.list(E.signal).then($=>{E.signal.aborted||(a($),A(""),R(!1))},$=>{E.signal.aborted||(A(ie($)),R(!1))}),()=>E.abort()},[t,O]);function C(E,$="",P=[]){o(E),p($),u(P),m(Z=>Z+1),h("")}async function M(E,$="catalog"){if(!(y.current||v)){y.current=!0,w(!0),h(""),S($);try{await E()}catch(P){N.current&&h(`${ie(P)}；草稿已保留，可重试。`)}finally{y.current=!1,N.current&&w(!1)}}}async function ee(E,$=!1){$?await t.revoke(E.id):await t.publish(E),N.current&&(a(P=>P&&{...P,skills:P.skills.some(Z=>Z.id===E.id)?P.skills.map(Z=>Z.id===E.id?E:Z):[...P.skills,E]}),$?l===E.id&&o(P=>({...P,enabled:!1})):C(E,E.id),r({message:E.enabled?"Skill 已发布":"Skill 已停用，配置已保留",tone:"success"}))}const J=x||v,re=s?.skills.find(E=>E.id===i.id&&E.id!==l);return e.jsxs("section",{className:`card ${B.management}`,"aria-labelledby":"skills-heading","aria-busy":J,children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"skills-heading",tabIndex:-1,children:"Skill 管理"}),e.jsx("p",{className:"section-subtitle",children:"统一编辑内置、历史与新建 Skill。ZIP 上传仅预览，不自动发布；停用保留全部配置。"})]}),e.jsx("button",{type:"button",disabled:J,onClick:()=>{R(!0),g(E=>E+1)},children:"刷新列表"})]}),e.jsxs("div",{className:"f-pad",children:[v&&e.jsx("p",{role:"status",children:"正在读取全部 Skill…"}),I&&e.jsxs("p",{role:"alert",className:B.error,children:["Skill 列表加载失败：",I,"。请刷新列表重试。"]}),j&&b==="catalog"&&e.jsx("p",{role:"alert",className:B.error,children:j}),x&&e.jsx("p",{role:"status",children:"正在处理，请稍候…"}),s&&e.jsxs(e.Fragment,{children:[e.jsx("h3",{children:"全部 Skill（含已停用）"}),!s.skills.length&&e.jsx("p",{children:"暂无 Skill，可新建或上传 ZIP。"}),e.jsx("ul",{className:B.catalog,"aria-label":"Skill 列表",children:s.skills.map(E=>e.jsxs("li",{className:B.catalogItem,children:[e.jsxs("div",{children:[e.jsx("strong",{children:E.name}),e.jsx("span",{className:B.origin,children:s.builtins.some($=>$.id===E.id)?"内置":"自定义 / 导入"}),e.jsx("span",{className:E.enabled?B.enabled:B.hint,children:E.enabled?"已启用":"已停用"}),e.jsx("p",{className:B.hint,children:E.description})]}),e.jsxs("div",{className:B.actions,children:[e.jsx("button",{type:"button",disabled:J,"aria-label":`编辑 ${E.name}`,onClick:()=>{C(E,E.id),k.current?.scrollIntoView({block:"start"}),k.current?.focus({preventScroll:!0})},children:"编辑"}),E.enabled&&e.jsx("button",{type:"button",disabled:J,"aria-label":`停用 ${E.name}`,onClick:()=>{window.confirm(`确认停用 ${E.name}？现有对话也将无法再加载；全部指南和配置会保留，可重新启用。`)&&M(()=>ee({...E,enabled:!1},!0))},children:"停用"})]})]},E.id))}),e.jsxs("fieldset",{disabled:J||!!I,className:B.upload,children:[e.jsx("legend",{children:"上传 ZIP 预览"}),e.jsxs("label",{className:"field",children:["Skill ZIP 文件（最多 4 MiB）",e.jsx("input",{type:"file",accept:".zip,application/zip",onChange:E=>{const $=E.target.files?.[0];E.target.value="",$&&M(async()=>{const P=new AbortController;_.current=P;const Z=await t.importZip($,P.signal);N.current&&C(Z.skill,"",Z.files)},"upload")}})]}),e.jsx("p",{className:B.hint,children:"ZIP 根目录或唯一外层文件夹中须有含 YAML 元数据的 SKILL.md，可包含文字参考资料；不接受脚本。解析成功后在下方检查和编辑，再手动发布。"}),j&&b==="upload"&&e.jsx("p",{role:"alert",className:B.error,children:j})]}),f.length>0&&e.jsxs("div",{className:B.preview,role:"status",children:[e.jsx("strong",{children:"ZIP 预览已载入，尚未发布"}),e.jsxs("p",{children:["文件清单（",f.length,"）"]}),e.jsx("ul",{children:f.map(E=>e.jsx("li",{children:E},E))})]}),e.jsx("div",{ref:k,tabIndex:-1,children:e.jsx(Mo,{draft:i,onChange:o,busy:J||!!I,editing:!!l,collisionName:re?.name,requestError:b==="publish"?j:"",onPublish:E=>{M(()=>ee(E),"publish")},onReset:()=>C(kr)},c)})]})]})]})}function Io(n){return e.jsx("main",{id:"main",tabIndex:-1,children:e.jsxs("div",{className:"page",children:[e.jsx("header",{className:"card page-header",children:e.jsxs("div",{children:[e.jsx("h1",{children:"Skill 管理"}),e.jsx("p",{className:"subtitle",children:"发布和管理创作助手可读取的文字指南"})]})}),e.jsx(Po,{...n})]})})}const Me=10,it=2e3,Ro=15e3;function To(n){return n==="0"||n==="7"||n==="30"||n==="90"}const K=we([V(),z(),Rr()]).optional().transform((n,r)=>{if(n==null||n==="")return n===void 0?void 0:null;const t=typeof n=="number"?n:Number(n);return Number.isFinite(t)?t:(r.addIssue({code:"custom",message:"费用数值必须为有限数字或未知值"}),Tt)}),fe=z().nullish(),Lo=ne({tasks:K,done:K,error:K,canceled:K,retail_min:K,retail_max:K,retail_mid:K,retail_known_tasks:K,retail_unknown_tasks:K,total_cost:K,actual_cost:K,estimated_cost:K,running_accrued:K,gpu_hours:K,electricity_cost:K,api_cost:K,failed_waste:K,unknown_cost_tasks:K}),Rn=ne({key:fe,label:fe,tasks:K,retail_known_tasks:K,retail_unknown_tasks:K,retail_min:K,retail_max:K,retail_mid:K,total_cost:K}),Ao=ne({job_id:fe,created_at:K,status:fe,category_name:fe,category:fe,project_name:fe,card_name:fe,capability:fe,worker_name:fe,runtime_seconds:K,retail_source:fe,retail_basis:fe,retail_min:K,retail_max:K,cost_source:fe,recognized_cost:K}),Do=ne({overview:Lo,jobs:W(Ao).transform(n=>n.slice(0,it)),currency:fe,pricing_version:we([z(),V()]).nullish(),period:ne({from:K,to:K}).nullish(),by_category:W(Rn).nullish(),by_capability:W(Rn).nullish(),by_worker:W(Rn).nullish()});function Oo(n){const r=Do.safeParse(n);if(!r.success)throw new Error("费用接口返回的数据格式不完整");return r.data}function Fo(n,r=Date.now()){const t=new URLSearchParams({limit:String(it)});return n!=="0"&&t.set("from",String(r/1e3-Number(n)*86400)),`/api/costs?${t}`}function qo(n){return{async load(r,t){const s=await n.request(Fo(r),{cache:"no-store",signal:t});return Oo(s)}}}const Uo={data:null,selectedPeriod:"0",loadedPeriod:"0",page:0,busy:!0,error:null,updatedAt:null};function Wo({http:n,notify:r}){const t=d.useMemo(()=>qo(n),[n]),[s,a]=d.useState(Uo),i=d.useRef("0"),o=d.useRef("0"),l=d.useRef(0),p=d.useRef(!1),c=d.useRef(!1),m=d.useRef(new Set),f=d.useRef(r);d.useEffect(()=>{f.current=r},[r]);const u=d.useCallback(async(h,b,S=!1)=>{if(p.current&&!S)return;const I=++l.current;p.current=!0;const A=new AbortController;m.current.add(A),a(v=>({...v,busy:!0}));try{const v=await t.load(h,A.signal);if(I!==l.current)return;o.current=h,c.current=!1,a(R=>({...R,data:v,loadedPeriod:h,error:null,updatedAt:Date.now(),page:b?0:Math.min(R.page,Math.max(0,Math.ceil(v.jobs.length/Me)-1))}))}catch(v){if(I!==l.current)return;const R=`读取费用统计失败：${ie(v)}`,O=!c.current;c.current=!0,a(g=>({...g,error:R})),O&&f.current({message:R,tone:"error"})}finally{m.current.delete(A),I===l.current&&(p.current=!1,a(v=>({...v,busy:!1})))}},[t]),x=d.useCallback(()=>{l.current+=1,p.current=!1,m.current.forEach(h=>h.abort()),m.current.clear()},[]);d.useEffect(()=>{u(i.current,!1);const h=window.setInterval(()=>{document.hidden||u(i.current,!1)},Ro);return()=>{window.clearInterval(h),x()}},[u,x]);const w=d.useCallback(h=>{i.current=h,a(b=>({...b,selectedPeriod:h})),u(h,!0,!0)},[u]),y=d.useCallback(()=>{u(i.current,!1)},[u]),N=d.useCallback(()=>{const h=i.current!==o.current;u(i.current,h,h)},[u]),j=d.useCallback(h=>{a(b=>({...b,page:Math.max(0,Math.min(b.page+h,Math.max(0,Math.ceil((b.data?.jobs.length??0)/Me)-1)))}))},[]);return{...s,selectPeriod:w,refresh:y,retry:N,changePage:j}}const Bo="_retail_1ychj_1",Vo="_commercial_1ychj_6",Ho={retail:Bo,commercial:Vo};function ce(n){return typeof n=="number"&&Number.isFinite(n)?n:null}function ye(n){return ce(n)==null?"未获取":String(n)}function Ue(n,r){const t=ce(n);return t==null?"未知":`${!r||r==="CNY"?"¥":r+" "}${t.toFixed(4)}`}function yn(n,r,t){return ce(n)==null||ce(r)==null?"未知":n===r?Ue(n,t):`${Ue(n,t)} – ${Ue(r,t)}`}function Tn(n){const r=ce(n);return r==null||!Number.isFinite(new Date(r*1e3).getTime())?"未记录":new Date(r*1e3).toLocaleString("zh-CN",{hour12:!1})}function Go(n){const r=ce(n);return r==null||r<0?"未记录":r<60?`${Math.round(r)}秒`:r<3600?`${Math.floor(r/60)}分${Math.floor(r%60)}秒`:`${Math.floor(r/3600)}小时${Math.floor(r%3600/60)}分`}function Jo(n){return n==="0"?"全部记录":`最近${n}天`}function Zo(n){return{unpriced:ce(n.retail_known_tasks)===0&&(ce(n.retail_unknown_tasks)??0)>0,allCostsUnknown:(ce(n.tasks)??0)>0&&ce(n.unknown_cost_tasks)===ce(n.tasks)&&ce(n.actual_cost)===0&&ce(n.estimated_cost)===0}}function Ko(n,r){return ce(n.retail_known_tasks)==null?"未获取":n.retail_known_tasks?yn(n.retail_min,n.retail_max,r):"未定价"}const Nr={queued:"排队中",assigned:"已分配",running:"运行中",done:"已完成",error:"失败",canceled:"已取消",cancel_requested:"正在取消"},Sr={actual:"实际",estimated:"历史估算",unknown:"未知"},$r={per_job:"按次",per_segment:"按段",segment_count:"按分段数",output_second_resolution:"按输出秒和分辨率"};function Yo(n,r){const t=n.retail_source==="priced",s=n.retail_source==="not_billable",a=n.retail_source==="unpriced";return{status:(Object.hasOwn(Nr,n.status||"")?Nr[n.status||""]:n.status)||"未知",statusClass:["error","canceled"].includes(n.status||"")?"danger":["running","queued","assigned","cancel_requested"].includes(n.status||"")?"warn":"",basis:t?(Object.hasOwn($r,n.retail_basis||"")?$r[n.retail_basis||""]:n.retail_basis)||"未记录":s?"未完成":a?"未定价":"未获取",basisClass:a?"warn":"muted",retail:t?yn(n.retail_min,n.retail_max,r):s?"不计费":a?"未定价":"未知",internal:n.cost_source==="unknown"||!n.cost_source?"未知":Ue(n.recognized_cost,r),source:(Object.hasOwn(Sr,n.cost_source||"")?Sr[n.cost_source||""]:n.cost_source)||"来源未记录"}}function Se({label:n,id:r,children:t,note:s,noteId:a,compact:i=!0,tone:o}){return e.jsx("article",{className:`card metric${o?` ${Ho[o]}`:""}`,children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:n}),e.jsx("p",{className:`metric-value${i?" compact":""}`,id:r,children:t}),e.jsx("p",{className:"metric-note",id:a,children:s})]})})}function Xo({data:n}){const r=n?.overview??{},{unpriced:t,allCostsUnknown:s}=Zo(r),a=ce(r.retail_min),i=ce(r.retail_max),o=p=>Ue(p,n?.currency),l=n?t?"未定价":ce(r.retail_min)!=null&&ce(r.retail_max)!=null&&r.retail_min!==r.retail_max?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"cost-amount",children:o(r.retail_min)})," – ",e.jsx("span",{className:"cost-amount",children:o(r.retail_max)})]}):yn(r.retail_min,r.retail_max,n.currency):"未获取";return e.jsxs("section",{className:"metrics f-metrics8","aria-label":"费用概览",children:[e.jsx(Se,{tone:"retail",label:"建议收费区间",id:"retail-range",note:"按次 / 分段 / 输出秒和分辨率",children:l}),e.jsx(Se,{tone:"retail",label:"建议收费中值",id:"retail-mid",noteId:"retail-coverage",note:n?`已定价 ${ye(r.retail_known_tasks)} 项 / 未定价 ${ye(r.retail_unknown_tasks)} 项`:"已定价 未获取 / 未定价 未获取",children:n?t?"未定价":o(r.retail_mid):"未获取"}),e.jsx(Se,{tone:"commercial",label:"商用模型等效费用（估算）",id:"internal-total",noteId:"internal-split",note:"按建议收费区间的 5 倍测算 · 非实际支出",children:n?t?"未定价":yn(a==null?null:a*5,i==null?null:i*5,n.currency):"未获取"}),e.jsx(Se,{label:"内部实际成本",id:"actual",noteId:"running",note:n?`运行中累计 ${o(r.running_accrued)}`:"运行中累计 未获取",children:n?s?"未知":o(r.actual_cost):"未获取"}),e.jsx(Se,{label:"GPU 用量",id:"gpu-hours",noteId:"electricity",note:n?`其中电费 ${o(r.electricity_cost)}`:"其中电费 未获取",children:ce(r.gpu_hours)==null?"未获取":`${r.gpu_hours?.toFixed(2)} 小时`}),e.jsx(Se,{label:"API 成本",id:"api-cost",note:"按输入 / 输出 token",children:n?o(r.api_cost):"未获取"}),e.jsx(Se,{label:"失败与取消损耗",id:"waste",noteId:"unknown",note:`已包含于总成本；未知 ${ye(r.unknown_cost_tasks)} 项`,children:n?o(r.failed_waste):"未获取"}),e.jsx(Se,{label:"任务数量",id:"tasks",compact:!1,noteId:"statuses",note:`完成 ${ye(r.done)} / 失败 ${ye(r.error)} / 取消 ${ye(r.canceled)}`,children:ye(r.tasks)})]})}const Te=[{key:"category",label:"按类型"},{key:"capability",label:"按能力"},{key:"worker",label:"按执行端"}];function Qo({data:n,failed:r}){const[t,s]=d.useState("category"),a=d.useRef({}),o=n?.[`by_${t}`]?.slice(0,10),l=Math.max(0,...(o??[]).map(c=>ce(c.retail_mid)??0));function p(c,m){let f;switch(c.key){case"ArrowRight":case"ArrowDown":f=(m+1)%Te.length;break;case"ArrowLeft":case"ArrowUp":f=(m+Te.length-1)%Te.length;break;case"Home":f=0;break;case"End":f=Te.length-1;break;default:return}c.preventDefault();const u=Te[f];u&&(s(u.key),a.current[u.key]?.focus())}return e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"费用构成"}),e.jsx("p",{className:"section-subtitle",children:"按建议收费中值排序 / 每个视角前10项；条形为相对最大项，不是内部成本占比"})]}),e.jsx("span",{className:"muted small",id:"pricing",children:n?`计价版本 ${n.pricing_version??"未获取"} / 币种 ${n.currency??"未获取"}`:"等待计价信息"})]}),e.jsx("div",{className:"tabs f-pad-tabs",role:"tablist","aria-label":"费用构成视角",children:Te.map((c,m)=>e.jsx("button",{type:"button",role:"tab",id:`cost-tab-${c.key}`,"aria-controls":"cost-panel","aria-selected":t===c.key,tabIndex:t===c.key?0:-1,"data-cost-tab":c.key,ref:f=>{f?a.current[c.key]=f:delete a.current[c.key]},onClick:()=>s(c.key),onKeyDown:f=>p(f,m),children:c.label},c.key))}),e.jsx("div",{className:"f-cost-chart f-pad",id:"cost-panel",role:"tabpanel","aria-labelledby":`cost-tab-${t}`,tabIndex:0,children:n?o?o.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"这个周期内还没有费用构成"}),e.jsx("p",{children:"调整统计周期，或等待任务产生费用记录。"})]}):o.map((c,m)=>{const f=ce(c.retail_mid),u=f!=null&&l>0?Math.max(0,Math.min(100,f/l*100)):null;return e.jsxs("div",{className:"f-rank",children:[e.jsxs("div",{children:[e.jsx("b",{title:c.key??void 0,children:c.label||c.key||"未记录"}),e.jsx("strong",{children:Ko(c,n.currency)})]}),e.jsxs("p",{className:"muted small",children:[ye(c.tasks)," 项 · 已定价 ",ye(c.retail_known_tasks)," · 未定价"," ",ye(c.retail_unknown_tasks)," · 已知内部成本"," ",Ue(c.total_cost,n.currency)]}),u!=null&&e.jsx("div",{className:"f-track",role:"meter","aria-label":`${c.label||c.key||""} 建议收费中值相对最大项`,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":u,children:e.jsx("i",{style:{width:`${u}%`}})})]},`${c.key??""}-${m}`)}):e.jsx("p",{className:"muted",children:"构成数据未获取，不以零元替代。"}):e.jsx("p",{className:"muted",children:r?"费用构成读取失败，请点击“重试读取”。":"正在读取费用构成…"})})]})}function un({children:n}){return e.jsx("span",{className:"cell-secondary",children:n})}function el({data:n,page:r,loadedPeriod:t,failed:s,changePage:a,openBasis:i}){const o=n?.jobs??[],l=Math.max(0,Math.ceil(o.length/Me)-1),p=o.slice(r*Me,(r+1)*Me),c=ce(n?.overview.tasks);return e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"费用明细"}),e.jsx("p",{className:"section-subtitle",id:"detail-note",children:n?`服务端合计 ${ye(n.overview.tasks)} 条 / 明细已载入 ${o.length} 条${c!=null&&c>o.length?"（接口最多2000条，非完整明细）":""}；汇总不以当前显示页相加替代`:s?"明细未获取，不以空记录或零元代替。":"正在读取；汇总不以当前明细页相加替代"})]}),e.jsx("button",{type:"button",className:"link-button",id:"cost-basis",onClick:i,children:"计价与成本口径"})]}),e.jsx("p",{className:"table-note",id:"period-note",children:n?`当前展示：${Jo(t)} · ${ce(n.period?.from)===0?"全部历史":Tn(n.period?.from)} — ${Tn(n.period?.to)}（按任务创建时间）`:"统计周期正在读取"}),e.jsx("div",{className:"table-wrap",children:e.jsxs("table",{className:"cost-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["时间","状态 / 类型","项目 / 卡片","能力","执行端","耗时","收费依据","建议收费","内部成本 / 来源"].map(m=>e.jsx("th",{scope:"col",children:m},m))})}),e.jsx("tbody",{id:"job-rows",children:n?p.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:9,children:e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"这个周期内还没有费用记录"}),e.jsx("p",{children:"更换统计周期，或等待任务产生费用记录。"})]})})}):p.map((m,f)=>{const u=Yo(m,n.currency);return e.jsxs("tr",{children:[e.jsxs("td",{children:[Tn(m.created_at),e.jsx(un,{children:m.job_id||"任务ID未记录"})]}),e.jsxs("td",{className:u.statusClass,children:[u.status,e.jsx(un,{children:m.category_name||m.category||"类型未记录"})]}),e.jsxs("td",{className:"origin",children:[m.project_name||"未归属项目",e.jsx(un,{children:m.card_name||"未记录卡片"})]}),e.jsx("td",{children:m.capability||"未记录"}),e.jsx("td",{children:m.worker_name||"未分配执行端"}),e.jsx("td",{children:Go(m.runtime_seconds)}),e.jsx("td",{className:u.basisClass,children:u.basis}),e.jsx("td",{children:u.retail}),e.jsxs("td",{children:[u.internal,e.jsx(un,{children:u.source})]})]},`${m.job_id??""}-${f}`)}):e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"loading-note",children:s?"费用明细读取失败，请点击“重试读取”。":"正在读取费用明细…"})})})]})}),e.jsxs("div",{className:"f-pager",children:[e.jsx("span",{id:"page-note",children:n?`显示 ${o.length?r*Me+1:0}–${Math.min((r+1)*Me,o.length)} / 已载入 ${o.length} 条`:"尚未载入"}),e.jsx("button",{type:"button",id:"cost-prev",disabled:!n||r===0,onClick:()=>a(-1),children:"上一页"}),e.jsx("button",{type:"button",id:"cost-next",disabled:!n||r>=l,onClick:()=>a(1),children:"下一页"})]})]})}function nl({onClose:n}){return e.jsx(he,{title:"计价与成本口径",onClose:n,children:e.jsxs("div",{className:"f-stack",children:[e.jsx("p",{children:"建议收费区间与中值来自计价规则，不是已收款或实际收入。"}),e.jsx("p",{children:"收费依据支持按次、按段、分段数、输出秒和分辨率；未定价不等于免费。未完成任务不计建议收费，但可能产生内部损耗。"}),e.jsx("p",{children:"内部总成本 = 已知实际 + 已知历史估算；未知成本单列，不按零元处理。失败与取消损耗已包含于总成本，不重复相加。运行中累计成本尚可能变化。"}),e.jsx("p",{children:"统计周期以任务创建时间为准，按服务端全量聚合。费用明细最多读取2000条，每页10条；不能把当前显示明细当完整总额，也不从明细重算概览或费用构成。"}),e.jsx("p",{children:"GPU用量、电费、API token成本、实际与历史估算均沿用服务端口径；未记录的字段显示未知，不由前端推测单价或补算。"})]})})}function rl(n){const r=Wo(n),[t,s]=d.useState(!1),a=r.busy?"正在读取…":r.error?"连接失败 · 快照非实时":r.updatedAt!=null?`最后刷新 ${new Date(r.updatedAt).toLocaleTimeString("zh-CN",{hour12:!1})} · 每15秒刷新`:"正在加载 · 每15秒刷新";return e.jsxs("main",{id:"main",tabIndex:-1,"aria-busy":r.busy?!0:void 0,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"费用统计"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{className:"subtitle",children:"建议收费不是实际收入，未知成本不作零元"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsxs("label",{className:"filter-label",children:["统计周期",e.jsxs("select",{id:"period",value:r.selectedPeriod,onChange:i=>{const o=i.currentTarget.value;To(o)&&r.selectPeriod(o)},children:[e.jsx("option",{value:"0",children:"全部记录"}),e.jsx("option",{value:"7",children:"最近7天"}),e.jsx("option",{value:"30",children:"最近30天"}),e.jsx("option",{value:"90",children:"最近90天"})]})]}),e.jsx("span",{className:"muted small",id:"refresh-state",role:"status",children:a}),e.jsxs("button",{type:"button",className:"primary",id:"refresh",disabled:r.busy,onClick:r.refresh,children:[e.jsx(Qe,{name:"refresh"}),"立即刷新"]})]})]}),e.jsxs("div",{id:"error",className:"f-error",role:"alert",hidden:!r.error,children:[e.jsxs("div",{children:[e.jsx("b",{id:"error-message",children:r.error}),e.jsx("p",{children:"下方保留上次成功读取的周期与快照，不代表当前筛选的新数据；未知值不作零元。"})]}),e.jsx("button",{type:"button",id:"retry",onClick:r.retry,children:"重试读取"})]}),e.jsx(Xo,{data:r.data}),e.jsx(Qo,{data:r.data,failed:r.error!=null}),e.jsx(el,{data:r.data,page:r.page,loadedPeriod:r.loadedPeriod,failed:r.error!=null,changePage:r.changePage,openBasis:()=>s(!0)}),e.jsxs("section",{className:"card padded notice-box","aria-labelledby":"cost-rules-title",children:[e.jsx("h2",{id:"cost-rules-title",children:"计价与成本口径"}),e.jsx("p",{children:"建议收费区间与中值来自规则，不是已收款或实际收入；未定价不等于免费。未完成任务不计建议收费，但可能产生内部损耗。"}),e.jsx("p",{children:"内部总成本 = 已知实际 + 已知历史估算；未知成本单列，不按零元处理。失败与取消损耗已包含于总成本，不重复相加；运行中累计仍可能变化。"}),e.jsx("p",{children:"统计周期按任务创建时间筛选，合计与构成取服务端全量聚合。明细最多读取2000条并分页展示，当前明细页不代表全部成本。"})]})]}),t&&e.jsx(nl,{onClose:()=>s(!1)})]})}const U=V().finite().nullable().optional(),ae=z().nullable().optional(),Xe=jn(z(),te),ot=F({gpus:W(F({name:ae,memory_total_bytes:U}).catchall(te)).optional(),cpu:te.optional(),os:te.optional(),memory_total_bytes:U,host_id:ae,environment_id:ae,model_version:ae,disk:ae,note:ae}).catchall(te),Cr=F({name:ae,role:ae,precision:te.optional(),precision_source:ae,loader_dtype:te.optional()}).catchall(te),Fn=F({source:ae,complete:X().optional(),capability_name:ae,models:W(Cr).optional(),auxiliary_models:W(Cr).optional()}).catchall(te),tl=F({source:z(),summary:Fn,samples:U,measured:U}).catchall(te),sl=F({key:ae,id:ae,kind:ae,width:te.optional(),height:te.optional(),duration:U,valid:X().nullable().optional(),outputs:te.optional(),samples:te.optional()}).catchall(te),al=F({total_samples:U,recorded_samples:U,complete_samples:U,total_outputs:U,recorded_outputs:U,variants:W(te).optional()}).catchall(te),il=F({dimensions:Xe.nullable().optional(),parameters:Xe.nullable().optional(),expected:Xe.nullable().optional(),model_version:ae}).catchall(te),lt={capability:z(),capability_name:ae,worker_id:ae,worker_name:ae,source:z(),dimensions:Xe.nullable().optional(),spec:il.nullable().optional(),output_resolution:al.nullable().optional(),recovered_outputs:te.optional(),runtime_seconds:U,occupied_seconds:U,warnings:W(z()).optional()},ol=F({...lt,id:z(),spec_key:ae,config_id:ae,config:ot.nullable().optional(),config_source:ae,cache_condition:te.optional(),samples:U,done:U,error:U,canceled:U,measured:U,mean_seconds:U,p50_seconds:U,p90_seconds:U,last_sample_at:U,reference_per_hour:U,output_count:U,unit:ae,seconds_per_unit:U,qualified_seconds_per_unit:U,eligible:X().nullable().optional(),reviewed:U,accepted:U,benchmark_id:ae,days:we([W(z()),V(),Rr()]).optional(),model_summary:Fn.nullable().optional(),model_evidence:F({total_samples:U,recorded_samples:U,variants:W(tl).optional()}).catchall(te).nullable().optional(),current_model_reference:Fn.nullable().optional()}).catchall(te),ll=F({id:z(),name:ae,state:z(),last_seen:U,hardware:ot.nullable().optional(),hardware_source:ae,agent_version:U,supports_capacity_telemetry:X().optional(),tasks:U,done:U,error:U,canceled:U,runtime_seconds:U}).catchall(te),ct=F({...lt,job_id:z(),group_id:ae,status:z(),created_at:U,attempts:te.optional(),outputs:W(sl).nullable().optional(),review:F({accepted:U,source:ae,benchmark_id:ae,note:ae}).catchall(te).nullable().optional()}).catchall(te),cl=F({period:Xe.optional(),overview:jn(z(),V().finite().nullable()).default({}),workers:W(ll).default([]),groups:W(ol).default([]),details:W(ct).default([]),details_total:V().int().nonnegative()}).catchall(te),dl=F({details:W(ct),details_total:V().int().nonnegative()}),dt=F({to:V().int(),mode:me("historical"),quality:me("technical"),availability:me(1),utilization:me(.75),worker_id:z().min(1),hours:V().finite().min(.1).max(24),price:V().finite().nonnegative().optional(),demands:W(F({group_id:z().min(1),quantity:V().finite().positive()})).min(1)}),pl=F({machines:U,total_seconds:U,daily_capacity_seconds:U,price_total:U,lines:W(F({group_id:z(),quantity:U,seconds_per_unit:U,daily_units:U}).catchall(te)).default([]),warnings:W(z()).default([]),assumptions:te.optional()}).catchall(te),pt=F({host_id:z().max(160).optional(),cpu:z().max(160).optional(),memory_total_bytes:V().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),environment_id:z().max(160).optional(),model_version:z().max(160).optional(),disk:z().max(160).optional(),note:z().max(500).optional()}).strict(),ut=F({accepted:V().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),source:Pe(["business","standard"]),benchmark_id:z().max(100),note:z().max(500)}),ul=F({processed:V().int().min(0).max(4),recorded:V().int().nonnegative(),total:V().int().nonnegative(),next_offset:V().int().nonnegative().nullable()}).refine(n=>n.recorded<=n.processed,"补采响应格式无效"),zr=jn(z(),Ir());class ml{constructor(r){this.http=r}http;path(r,t){return`/api/capacity?${new URLSearchParams({to:String(r.to),limit:"100",offset:String(t)})}`}report(r,t){return this.http.read(this.path(r,t),cl,{cache:"no-store"})}evidence(r,t){return this.http.read(this.path(r,t),dl,{cache:"no-store"})}async estimate(r){return pl.parse(await this.http.json("/api/capacity/estimate","POST",dt.parse(r)))}async profile(r,t){zr.parse(await this.http.json(`/api/capacity/workers/${encodeURIComponent(r)}`,"POST",pt.parse(t)))}async review(r,t){zr.parse(await this.http.json(`/api/capacity/jobs/${encodeURIComponent(r)}/review`,"POST",ut.parse(t)))}async probe(r,t,s){const a=await this.http.json(`/api/capacity/jobs/${encodeURIComponent(r)}/probe-outputs`,"POST",{offset:V().int().nonnegative().parse(t)});s();const i=ul.safeParse(a);if(!i.success||i.data.next_offset!==null&&(i.data.next_offset<=t||i.data.next_offset>=i.data.total))throw Error("补采响应格式无效，请刷新看板核对结果");return i.data}}const Ke=n=>!!(n.group||n.status||n.source||n.size!==100);class hl{cache=null;pending=null;clear(){this.cache=null,this.pending=null}async all(r,t,s,a){if(!s())return null;if(this.cache?.snapshot===r)return this.cache.records;if(this.pending?.snapshot===r)return this.pending.promise;const i={snapshot:r,promise:Promise.resolve(null)};i.promise=(async()=>{const o=r.report.details_total,l=[];if(!Number.isSafeInteger(o)||o<0)throw Error("明细总数无效，请刷新后重试。");for(let p=0;p<o;p+=100){if(!s())return null;const c=p===r.offset?r.report:await t.evidence(r.range,p);if(!s())return null;if(c.details_total!==o||c.details.length!==Math.min(100,o-p))throw Error("任务证据在读取期间变化或分页不完整，请刷新后重新筛选。");l.push(...c.details),a(l.length,o)}if(new Set(l.map(p=>p.job_id)).size!==l.length)throw Error("任务证据分页出现重复，请刷新后重试。");return s()?(this.cache={snapshot:r,records:l},l):null})(),this.pending=i;try{return await i.promise}finally{this.pending===i&&(this.pending=null)}}}class xl{constructor(r,t){this.service=r,this.notify=t}service;notify;listeners=new Set;loadVersion=0;estimateVersion=0;evidenceVersion=0;appliedRange=null;appliedOffset=0;alive=!0;repository=new hl;mutations=new Set;value={report:null,snapshot:null,ready:!1,revision:0,refreshState:"正在读取全部历史聚合与本页证据…",error:"",writeStatus:"",tab:"machines",technicalOpen:!1,evidenceOpen:!1,mounted:new Set,filters:{group:"",status:"",source:"",size:100},evidence:{records:[],total:0,start:0,size:100,state:"",busy:!1,failed:!1},estimate:null,estimateNote:"填写每日需求后计算。没有样本的场景不能按零耗时处理。",estimateError:"",estimating:!1};getSnapshot=()=>this.value;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});set(r){this.alive&&(this.value={...this.value,...r},this.listeners.forEach(t=>t()))}start(){this.alive=!0,this.load()}dispose(){this.alive=!1,this.loadVersion++,this.estimateVersion++,this.evidenceVersion++,this.repository.clear()}invalidateEstimate=(r="输入或证据已变更，请重新计算。")=>{this.estimateVersion++,this.set({estimate:null,estimateNote:r,estimateError:"",estimating:!1})};resetSnapshot(){this.repository.clear(),this.evidenceVersion++,this.set({snapshot:null,ready:!1})}clear(){this.resetSnapshot(),this.set({report:null,mounted:new Set,evidence:{records:[],total:0,start:0,size:100,state:"",busy:!1,failed:!1}})}activeMounts(){const r=new Set([this.value.tab]);return this.value.tab==="machines"&&this.value.technicalOpen&&r.add("technical"),this.value.evidenceOpen&&r.add("evidence"),r}async load(r=!0,t){const s=r?{to:Math.floor(Date.now()/1e3)}:this.appliedRange;if(!s)return;const a=++this.loadVersion,i=Object.freeze({...s}),o=r?0:t??this.appliedOffset;this.resetSnapshot(),this.invalidateEstimate("证据正在刷新，旧测算已清除。"),this.set({error:"",refreshState:"正在读取全部历史聚合与本页证据…",evidence:{...this.value.evidence,state:""}});try{const l=await this.service.report(i,o);if(!this.alive||a!==this.loadVersion)return;const p=Object.freeze({report:l,range:i,version:a,offset:o});this.appliedRange=i,this.appliedOffset=o;const c={...this.value.filters};if(l.groups.some(m=>m.id===c.group)||(c.group=""),this.set({report:l,snapshot:p,ready:!0,revision:this.value.revision+1,mounted:this.activeMounts(),filters:c,evidence:{records:l.details,total:l.details_total,start:o,size:100,state:"",busy:!1,failed:!1}}),this.value.evidenceOpen&&Ke(c)&&await this.filterEvidence(0),!this.alive||a!==this.loadVersion)return;this.set({refreshState:`最后刷新：${new Date().toLocaleTimeString("zh-CN",{hour12:!1})}`})}catch(l){if(!this.alive||a!==this.loadVersion)return;this.clear();const p=`读取产能数据失败：${ie(l)}。请点击立即刷新重试。`;this.set({error:p,refreshState:"读取失败"}),this.notify(p)}}activate(r){this.set({tab:r}),this.mount()}technical(r){this.set({technicalOpen:r}),this.mount()}evidenceOpen(r){this.set({evidenceOpen:r}),this.mount()}mount(){if(!this.value.ready)return;const r=this.value.mounted.has("evidence"),t=new Set([...this.value.mounted,...this.activeMounts()]);this.set({mounted:t}),!r&&t.has("evidence")&&Ke(this.value.filters)&&this.filterEvidence(0)}showEvidence(r=""){!this.value.ready||!this.value.snapshot||(this.set({evidenceOpen:!0,filters:{...this.value.filters,group:r,status:"",source:""},mounted:new Set([...this.value.mounted,"evidence"])}),this.filterEvidence(0))}filter(r){this.value.ready&&(this.set({filters:{...this.value.filters,...r}}),this.filterEvidence(0))}current(r){return this.alive&&this.value.ready&&this.value.snapshot===r&&r.version===this.loadVersion&&this.value.report===r.report}async filterEvidence(r){const t=this.value.snapshot;if(!t||!this.current(t)||!this.value.mounted.has("evidence"))return;const s=++this.evidenceVersion,a=this.value.filters;if(!Ke(a)){if(t.offset!==0){await this.load(!1,0);return}this.set({evidence:{records:t.report.details,total:t.report.details_total,start:0,size:100,state:"",busy:!1,failed:!1}});return}this.set({evidence:{records:[],total:0,start:0,size:a.size,state:"正在读取同一截止时间下的真实分页证据，完成后筛选；不会按当前页冒充全部任务。",busy:!0,failed:!1}});try{const i=await this.repository.all(t,this.service,()=>this.current(t),(p,c)=>{this.current(t)&&Ke(this.value.filters)&&this.set({evidence:{...this.value.evidence,state:`正在读取真实分页证据 ${p} / ${c} 条；聚合统计保持不变。`}})});if(!i||!this.current(t)||s!==this.evidenceVersion)return;const o=i.filter(p=>(!a.group||p.group_id===a.group)&&(!a.status||p.status===a.status)&&(!a.source||p.source===a.source)),l=Math.min(r,Math.max(0,Math.ceil(o.length/a.size)-1)*a.size);this.set({evidence:{records:o.slice(l,l+a.size),total:o.length,start:l,size:a.size,state:`筛选 ${o.length} / 全集 ${i.length} 条；只改变明细，聚合统计不受筛选或分页影响。`,busy:!1,failed:!1}})}catch(i){if(!this.current(t)||s!==this.evidenceVersion)return;this.set({evidence:{records:[],total:0,start:0,size:a.size,state:`证据筛选失败：${ie(i)}。请立即刷新后重试。`,busy:!1,failed:!0}})}}page(r){const{ready:t,evidence:s,mounted:a,snapshot:i,filters:o}=this.value;if(!t||!i||!a.has("evidence")||s.busy||s.failed)return;const l=Math.max(0,s.start+r*s.size);r>0&&l>=s.total||(Ke(o)?this.filterEvidence(l):this.load(!1,l))}async estimate(r){if(this.invalidateEstimate("正在计算…"),!this.value.ready||!this.value.snapshot){this.estimateFailure("请先点击立即刷新并成功读取证据。");return}const t=this.estimateVersion,s=this.value.snapshot,a=this.value.revision;this.set({estimating:!0});try{const i=await this.service.estimate(r);if(t!==this.estimateVersion||a!==this.value.revision||!this.current(s))return;const l={...s.report.workers.find(c=>c.id===r.worker_id)?.hardware};delete l.note;const p={result:i,payload:r,groups:s.report.groups.filter(c=>r.demands.some(m=>m.group_id===c.id)),hardware:l};this.set({estimate:p,estimating:!1})}catch(i){t===this.estimateVersion&&this.estimateFailure(`测算失败：${ie(i)}`)}}estimateFailure(r){this.set({estimate:null,estimating:!1,estimateNote:"本次未产生测算结果，请检查证据与输入后重试。",estimateError:r}),this.notify(r)}async mutate(r,t,s){if(this.mutations.has(r))throw Error("正在保存，请勿重复提交。");this.mutations.add(r);const a=this.loadVersion;this.set({writeStatus:""}),this.invalidateEstimate(`${t}正在保存，旧测算已清除。`);try{if(await s(),!this.alive)return;a===this.loadVersion?await this.load(!1):(this.loadVersion++,this.clear(),this.invalidateEstimate("证据已更新，请点击立即刷新后重新计算。"),this.set({refreshState:`${t}已更新，请点击立即刷新`})),this.set({writeStatus:`${t}已保存。人工声明不回写历史快照，也不代表自动验证通过。`})}finally{this.mutations.delete(r)}}saveProfile(r,t){return this.mutate(`profile:${r}`,"机器配置",()=>this.service.profile(r,t))}saveReview(r,t){return this.mutate(`review:${r}`,"人工标记",()=>this.service.review(r,t))}probe(r,t){return this.service.probe(r,t,this.probeWritten)}probeVersion(){return this.loadVersion}probeCurrent(r){return this.alive&&r===this.loadVersion&&this.value.report!==null}probeWritten=()=>{this.resetSnapshot(),this.invalidateEstimate("成品尺寸证据已更新，请刷新看板后重新计算。")}}function fl({http:n,notify:r}){const t=d.useMemo(()=>new xl(new ml(n),a=>r({message:a,tone:"error"})),[n,r]),s=d.useSyncExternalStore(t.subscribe,t.getSnapshot);return d.useEffect(()=>(t.start(),()=>t.dispose()),[t]),{controller:t,state:s}}const gl={historical:"历史运行参考",captured:"采集业务样本",standard:"标准样本（人工标签）"},nr={idle:"在线空闲",online:"在线",busy:"运行中",running:"运行中",offline:"离线",disabled:"已禁用",syncing:"同步中",unavailable:"执行环境不可用",historical:"历史执行端",error:"异常",done:"已完成",canceled:"已取消",queued:"排队中",assigned:"已分配"},G=n=>typeof n=="number"&&Number.isFinite(n),q=n=>n==null||n===""?"未知":typeof n=="object"?JSON.stringify(n):String(n),T=n=>G(n)?n.toLocaleString("zh-CN",{maximumFractionDigits:2}):"未知",pe=n=>G(n)?`${T(n)} 秒`:"未知",Je=n=>G(n)?new Date(n*1e3).toLocaleString("zh-CN",{hour12:!1}):"未知",Ge=n=>G(n)?`${T(n/1024**3)} GiB`:"未知",je=n=>gl[n]||`来源未知（${q(n)}）`,rr=n=>Array.isArray(n.days)?n.days.length:n.days,We=n=>n.capability_name?.trim()?n.capability_name:q(n.capability),mt=n=>We(n)===n.capability?We(n):`${We(n)}（${n.capability}）`,Nn=n=>typeof n=="string"&&{reported:"机器上报",manual:"人工声明","manual+reported":"机器上报 + 人工声明",unknown:"未知"}[n]||"未知";function tr(n){return n&&typeof n=="object"&&!Array.isArray(n)?n:{}}function rn(n,r){if(!n||typeof n!="object")return q(n);const t=tr(n);return(r==="cpu"?[t.model,t.architecture,G(t.logical_cores)?`${T(t.logical_cores)} 逻辑核`:null]:[t.name,t.release,t.version]).filter(a=>a!=null&&a!=="").map(q).join(" / ")||"未知"}function tn(n){return n?`GPU ${n.gpus?.length?n.gpus.map(t=>`${q(t.name)} / 单卡 ${Ge(t.memory_total_bytes)}`).join("；"):"未知"}；CPU ${rn(n.cpu,"cpu")}；内存 ${Ge(n.memory_total_bytes)}；系统 ${rn(n.os,"os")}；环境 ${q(n.environment_id)}；模型版本 ${q(n.model_version)}；磁盘 ${q(n.disk)}；主机 ID ${q(n.host_id)}`:"未知"}function bl(n){const r=n.hardware,t=(r?.gpus||[]).map(s=>[s.name,G(s.memory_total_bytes)?Ge(s.memory_total_bytes):null].filter(Boolean).join(" / ")).filter(Boolean);return G(r?.memory_total_bytes)&&t.push(`系统内存 ${Ge(r.memory_total_bytes)}`),t.join("；")||"尚未采集硬件信息"}function yl(n){const r=n.hardware;return!r?.cpu||!r.host_id?G(n.agent_version)&&n.agent_version<4||n.supports_capacity_telemetry===!1?"旧版采集程序缺少 CPU 等信息，请升级该 Worker 后补采；已有 GPU 与内存记录仍可查看。":"CPU 或主机信息尚未采集，请检查该 Worker 的采集上报。":!r.environment_id||!r.model_version?"环境或模型版本的人工声明未填写，可在“详细统计与机器配置”中补录。":"当前配置不代表历史任务的执行配置；历史依据见各业务详情。"}const ke=n=>["idle","busy","online","running"].includes(n.state),xn=n=>G(n.mean_seconds)&&n.mean_seconds>=0&&G(n.measured)&&n.measured>0;function jl(n){if(!G(n)||n<0)return"暂无成功耗时";if(n<1)return`${T(n)} 秒`;const r=Math.round(n),t=Math.floor(r/60),s=r%60;return t?`${T(t)} 分 ${s} 秒`:`${s} 秒`}function Sn(n){const r={...n.spec?.dimensions,...n.dimensions},t=[["图片",r.image_count,"张"],["视频",r.video_count,"段"],["音频",r.audio_count,"段"]],s=a=>G(a)&&Number.isSafeInteger(a)&&a>=0;return t.every(([,a])=>!s(a))?["素材信息未记录"]:t.every(([,a])=>a===0)?["未使用图片、视频或音频"]:t.flatMap(([a,i,o])=>s(i)?i>0?[`${a} ${T(i)} ${o}`]:[]:[`${a}数量未记录`])}function ht(n,r){const t=i=>G(i)&&Number.isSafeInteger(i)&&i>0,s=typeof n.resolution=="string"?n.resolution.match(/^(\d+)\s*[x×]\s*(\d+)(?:\s*\(\d+:\d+\))?$/i):null,a=[[n.output_width,n.output_height],[n.width,n.height],[s?Number(s[1]):null,s?Number(s[2]):null],[r.width,r.height,"期望 "]];for(const[i,o,l=""]of a)if(t(i)&&t(o)){const c={"640x360":"360p","640x480":"480p","854x480":"480p","1280x720":"720p","1920x1080":"1080p","2560x1440":"1440p","3840x2160":"4K"}[`${Math.max(i,o)}x${Math.min(i,o)}`];return c?`${l}${c}${i<o?" 竖屏":""}（${T(i)} × ${T(o)}）`:`${l||"尺寸 "}${T(i)} × ${T(o)}`}return G(n.megapixels)&&n.megapixels>0&&G(n.megapixels*100)?`约 ${T(n.megapixels*100)} 万像素（尺寸未记录）`:null}function $n(n,r=!1){const t={...n.spec?.parameters,...n.spec?.dimensions,...n.dimensions},s=n.spec?.expected||{},a=[],i=t.output_duration??t.duration??s.duration;G(i)&&a.push(`请求时长 ${T(i)} 秒`);const o=ht(t,s);if(o&&a.push(o),r){G(t.megapixels)&&t.megapixels>0&&a.push(`像素设置 ${T(t.megapixels)} MP`);const l=[["帧率",t.output_fps??t.target_fps??t.fps??t.force_rate??s.fps," FPS"],["步数",t.steps," 步"],["帧数",t.frames," 帧"],["长边",t.scale_to_length," px"],["批量",t.batch_size,""]];for(const[p,c,m]of l)G(c)&&a.push(`${p} ${T(c)}${m}`)}return a.join(" / ")||"规格未完整记录"}function xt(n){return(n?.variants||[]).flatMap(r=>{const t=tr(r);return typeof t.kind=="string"&&["image","video"].includes(t.kind)&&G(t.width)&&Number.isSafeInteger(t.width)&&t.width>0&&G(t.height)&&Number.isSafeInteger(t.height)&&t.height>0?[{kind:t.kind,width:t.width,height:t.height,outputs:t.outputs,samples:t.samples}]:[]})}function sr(n){return`${n.kind==="image"?"图片":"视频"} · ${ht({width:n.width,height:n.height},{})}`}function vl(n){return G(n.width)&&G(n.height)&&Number.isSafeInteger(n.width)&&Number.isSafeInteger(n.height)&&n.width>0&&n.height>0&&["image","video"].includes(n.kind||"")?sr({kind:n.kind||"",width:n.width,height:n.height}):"尺寸未记录"}const wl=n=>`${Sn(n).join(" + ")}｜${$n(n)}`;function _l(n){const r=t=>xn(t)?t.source!=="historical"&&G(t.last_sample_at)?3:t.source==="historical"?2:1:0;return[...n].sort((t,s)=>r(s)-r(t)||(r(t)===3?(s.last_sample_at||0)-(t.last_sample_at||0):0)||(s.samples||0)-(t.samples||0)||(s.measured||0)-(t.measured||0))[0]}function ar(n){const r=[...n.warnings||[]],t=rr(n);return(!G(n.samples)||n.samples<30||!G(t)||t<3)&&r.push("参考样本不足：建议至少 30 个任务且跨 3 天；达到门槛也不是置信保证。"),n.source==="historical"&&r.push("仅成功任务 runtime 参考，未计完整占机、重试及质量损耗；不是合格日产能。"),n.eligible!==!0&&r.push("完整基线证据不足，不作为已验证采购依据。"),[...new Set(r)]}const Be=n=>{const r={task:"任务",tasks:"任务",image:"张图片",images:"张图片",video:"条视频",videos:"条视频",second:"视频秒",seconds:"视频秒",video_seconds:"视频秒"};return n.source==="historical"?"任务":r[n.unit||""]||q(n.unit)};function ft(n){const r=Object.hasOwn(n,"model_evidence"),t=n.model_evidence;return{variants:r?(t?.variants||[]).filter(a=>["task_snapshot","archived_task"].includes(a.source)):n.model_summary?.source==="task_snapshot"?[{source:"task_snapshot",summary:n.model_summary,samples:null,measured:null}]:[],hasEvidence:r,total:t?.total_samples,recorded:t?.recorded_samples,reference:n.current_model_reference?.source==="current_template"?n.current_model_reference:null}}const Ae=n=>n?.models||[];function kl(n,r,t){const a={high_noise:"高噪声",low_noise:"低噪声",高噪声:"高噪声",低噪声:"低噪声",base:"基础模型",refiner:"精修模型",生成主模型:"生成主模型",深度模型:"深度模型",放大模型:"放大模型",插帧模型:"插帧模型"}[n.role||""];return a?`${a} · 主模型 ${r+1}`:t>1?`主模型 ${r+1}`:""}function qn(n){const r=[];if(n.precision&&n.precision_source==="filename"&&r.push(`文件标记 ${q(n.precision)}`),n.loader_dtype){const t=q(n.loader_dtype),s=t.split(/\s*\/\s*/).map(i=>i.match(/^(bfloat16|bf16|float(?:8|16|32|64)|fp(?:8|16|32|64))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]),a=s.every(Boolean)?[...new Set(s.map(i=>i?.toUpperCase().replace("BFLOAT16","BF16").replace("FLOAT","FP")))].join(" / "):null;r.push(`加载配置 ${a?`${a}（${t}）`:t}${["default","auto"].includes(t.toLowerCase())?"（实际精度未确认）":""}`)}else n.precision&&n.precision_source==="loader"&&r.push(`加载配置 ${q(n.precision)}`);return r.length||r.push("精度未记录 / 待确认"),r}function Nl(n){const r=i=>{if(typeof i!="string")return null;const o=i.split(/\s*\/\s*/).map(l=>l.trim().match(/^(bfloat16|float(?:8|16|32|64)|bf16|fp(?:4|8|16|32|64)|int(?:4|8|16)|nf4|q[2-8]_(?:k(?:_[sml])?|[01]))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]);return o.every(Boolean)?[...new Set(o.map(l=>l?.toUpperCase().replace("BFLOAT16","BF16").replace("FLOAT","FP")))].sort().join(" / "):null},t=n.precision_source==="filename"?r(n.precision):null,s=r(n.loader_dtype)||(n.precision_source==="loader"?r(n.precision):null),a=qn(n).filter(i=>i.startsWith("文件标记 ")?!!t:i.startsWith("加载配置 ")?!!s||["default","auto"].includes(String(n.loader_dtype).toLowerCase()):!1);return a.some(i=>i.startsWith("文件标记 "))||a.unshift("文件标记未记录 / 待确认"),a.some(i=>i.startsWith("加载配置 "))||a.push("加载配置未记录 / 待确认"),a}function gt(n){return JSON.stringify([n.capability,n.spec_key||`unknown:${n.id}`,n.source,n.spec?.model_version||null,n.config?.model_version||null,n.config?.environment_id||null,n.source==="standard"?n.benchmark_id||`unknown:${n.id}`:null,n.cache_condition||null])}function Sl(n){const r=new Map,t={none:"无节点结果缓存",loaders:"加载节点缓存",execution:"执行节点缓存",unknown:"未知",mixed:"混合条件"};for(const s of n){const a=tr(s.cache_condition).kind;r.set(gt(s),`${mt(s)} / ${q(s.spec_key)} / ${je(s.source)} / 模型 ${q(s.spec?.model_version||s.config?.model_version)} / 环境 ${q(s.config?.environment_id)} / 缓存 ${typeof a=="string"&&t[a]||"未知"}${s.source==="standard"?` / 基准 ${q(s.benchmark_id)}`:""}`)}return[...r]}function ir(n,r,t,s=[]){return`${r||t.find(a=>a.id===n)?.name||s.find(a=>a.worker_id===n)?.worker_name||"未关联执行端"}（${n||"Worker ID 未知"}）`}function $l(n){return n.review?.source==="standard"?"标准样本（人工声明）":n.review?.source==="business"?"业务样本":"未标记"}function bt({title:n,children:r,className:t}){const[s,a]=d.useState(!1);return e.jsxs("details",{className:t,onToggle:i=>{i.currentTarget.open&&a(!0)},children:[e.jsx("summary",{children:n}),s&&(typeof r=="function"?r():r)]})}function fn({title:n,value:r,className:t}){return e.jsx(bt,{title:n,className:t,children:()=>e.jsx("pre",{children:q(r)})})}function Cn({values:n=[],className:r="warn"}){return e.jsx("ul",{className:r,children:n.map((t,s)=>e.jsx("li",{children:t},s))})}function Un({items:n}){return n.map(([r,t])=>e.jsxs("div",{className:"metric",children:[e.jsx("span",{children:r}),e.jsx("strong",{children:T(t)})]},r))}function or({headers:n,children:r}){return e.jsx("div",{className:"scroll",tabIndex:0,role:"region","aria-label":n.join(" / "),children:e.jsxs("table",{children:[e.jsx("thead",{children:e.jsx("tr",{children:n.map(t=>e.jsx("th",{scope:"col",children:t},t))})}),e.jsx("tbody",{children:r})]})})}function yt({resolution:n}){const r=xt(n);return e.jsxs(e.Fragment,{children:[r.length?e.jsxs(e.Fragment,{children:[new Set(r.map(t=>`${t.width}x${t.height}`)).size>1&&e.jsx("span",{className:"hint",children:"多种成品规格（非单一尺寸）"}),r.map((t,s)=>e.jsx("span",{className:"resolution-variant",children:sr(t)},s))]}):e.jsx("span",{children:"尺寸未记录"}),G(n?.total_samples)&&n.total_samples>0&&n.complete_samples!==n.total_samples&&e.jsxs("span",{className:"resolution-coverage hint",children:["已知 ",T(n.recorded_samples)," / ",T(n.total_samples)," ","次任务的部分或全部成品"]})]})}function jt({resolution:n}){return e.jsxs("div",{className:"output-resolution-details",children:[e.jsx("h3",{children:"实际成品"}),e.jsx("div",{className:"actual-resolution",children:e.jsx(yt,{resolution:n})}),e.jsxs("p",{children:["尺寸覆盖：",T(n?.recorded_samples)," / ",T(n?.total_samples)," ","次已完成任务至少有一个成品尺寸；",T(n?.complete_samples)," /"," ",T(n?.total_samples)," 次已完成任务的全部最终产物都有尺寸。"]}),e.jsxs("p",{children:["已知尺寸产物 ",T(n?.recorded_outputs)," / ",T(n?.total_outputs)," 个",n?.total_outputs==null?"（最终清单不完整，产物总数未知）":"","。"]}),xt(n).map((r,t)=>e.jsxs("p",{children:[sr(r),"：",T(r.outputs)," 个产物 / ",T(r.samples)," 次任务"]},t)),e.jsx("p",{className:"hint",children:"同一任务可能包含多种尺寸，各尺寸的任务数不能相加。尺寸来自最终产物记录或受控补采，与技术合格产量、人工验收和采购资格分离；有尺寸不代表技术合格。平均耗时仍为原组成功任务平均，不按尺寸重算。"})]})}function Er({summary:n,origin:r}){const t=Ae(n);return e.jsxs("div",{className:"model-reference",children:[e.jsx("p",{className:"model-origin",children:r}),n.complete===!1&&e.jsx("p",{className:"warn",children:"不完整 / 未确认完整主模型链；动态选择或未知链路不能推断全部主模型。"}),!t.length&&e.jsx("p",{children:"未获取到模型信息，模型待确认。"}),t.map((s,a)=>e.jsx("p",{children:`${kl(s,a,t.length)||"主模型"}：${q(s.name)}；角色：${q(s.role)}；${qn(s).join("；")}；非运行时检测`},a)),!!n.auxiliary_models?.length&&e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"hint",children:"辅助模型（不计入主模型名称或精度）"}),n.auxiliary_models?.map((s,a)=>e.jsx("p",{className:"hint",children:`角色：${q(s.role)}；${q(s.name)}；${qn(s).join("；")}`},a))]})]})}function vt({g:n}){const r={...n.spec?.dimensions,...n.dimensions},t=ft(n);return e.jsxs("div",{className:"pad",children:[e.jsxs("p",{children:["输入素材：",Sn(n).join(" / ")]}),e.jsxs("p",{children:["生成参数：",$n(n,!0)]}),G(r.source_duration)&&e.jsxs("p",{className:"hint",children:["首个输入视频时长：",T(r.source_duration)," 秒（非多段视频合计）"]}),e.jsx("p",{className:"hint",children:"素材数量按任务输入槽位计，同一文件被多次引用也会分别计数；生成参数不是成品实测规格。"}),e.jsxs("p",{children:["来源：",je(n.source),"；有效耗时样本 ",T(n.measured)," / 总样本 ",T(n.samples),"；成功"," ",T(n.done)," / 失败 ",T(n.error)," / 取消 ",T(n.canceled)]}),e.jsxs("p",{children:["mean：",pe(n.mean_seconds),"；P50：",pe(n.p50_seconds),"；P90：",pe(n.p90_seconds),"；最近成功样本：",Je(n.last_sample_at)]}),e.jsx("p",{className:"hint",children:"平均值仅使用该组成功任务执行耗时；不包含排队，不等于纯 GPU 计算时间，也不是合格日产能。"}),e.jsxs("p",{children:["执行时配置：",tn(n.config),"（",Nn(n.config_source),"）"]}),e.jsxs("p",{children:["缓存条件：",q(n.cache_condition)]}),e.jsxs("p",{children:["成功 runtime 合计：",pe(n.runtime_seconds),"；占机合计：",pe(n.occupied_seconds),"；实际产出：",T(n.output_count)," ",Be(n),"。"]}),e.jsxs("p",{children:["单位技术交付：",pe(n.seconds_per_unit)," / ",Be(n),"；单位人工合格：",pe(n.qualified_seconds_per_unit)," / ",Be(n),"；已人工验收：",T(n.reviewed),"；全组人工合格数量：",T(n.accepted),"。"]}),e.jsxs("p",{className:"hint",children:["技术基线资格：",n.eligible===!0?"服务端判定具备完整基线证据":n.eligible===!1?"证据不足，不作为已验证采购依据":"未记录","；标准场景编号：",q(n.benchmark_id),"。"]}),e.jsx(jt,{resolution:n.output_resolution}),t.hasEvidence&&e.jsxs("p",{children:["模型记录覆盖 ",T(t.recorded)," / ",T(t.total)," ","次；覆盖数不是完整主模型链的确认。"]}),t.variants.length>1&&e.jsx("p",{className:"warn",children:"不同任务记录对应不同模型组合；每个组合内的主模型才属于同一个图。全组平均耗时不代表任一组合的专属速度。"}),!t.variants.length&&e.jsx("p",{children:"历史未记录可用主模型证据；不能用当前模板补写历史模型与精度。"}),t.variants.map((s,a)=>e.jsx(Er,{summary:s.summary,origin:`历史任务记录组合 ${a+1} · ${s.source==="archived_task"?"保留的原任务记录":"任务提交记录"}${t.hasEvidence?` · ${T(s.samples)} 次记录 / ${T(s.measured)} 次成功耗时`:""}`},a)),t.reference?e.jsxs(e.Fragment,{children:[e.jsx(Er,{summary:t.reference,origin:`当前工具默认配置（非历史执行记录）· ${q(t.reference.capability_name)}`}),e.jsx("p",{className:"warn hint",children:"仅为工具模板默认值，不代表用户画布节点当前选中的模型。历史耗时不代表当前模型速度；参考信息不补齐历史覆盖，也不覆盖历史精度。"})]}):!t.variants.length&&e.jsx("p",{className:"hint",children:"未获取到模型信息：当前工具模板未提供、找不到或无法识别。"}),e.jsx(Cn,{values:ar(n)}),e.jsxs("p",{className:"hint",children:["采样日期：",q(n.days),"；配置编号：",q(n.config_id),"；采样编号：",n.id]}),e.jsx(fn,{title:"原始规格与证据",value:{dimensions:n.dimensions,spec:n.spec,output_resolution:n.output_resolution,recovered_outputs:n.recovered_outputs,model_summary:n.model_summary,model_evidence:n.model_evidence,current_model_reference:n.current_model_reference,cache_condition:n.cache_condition}})]})}function wt({groups:n,report:r}){return n.length?e.jsx(or,{headers:["业务 / 执行端 / 来源","精确业务规格","样本覆盖","成功任务耗时分布","运行参考 / 产出口径","警告与限制"],children:n.map(t=>e.jsxs("tr",{"data-group-id":t.id,children:[e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsx("strong",{children:We(t)}),e.jsxs("p",{className:"hint",children:["能力 ID：",t.capability]}),e.jsx("p",{className:"hint",children:ir(t.worker_id,t.worker_name,r.workers,r.groups)}),e.jsx("span",{className:"badge",children:je(t.source)}),e.jsxs("p",{className:"hint",children:["配置：",q(t.config_id)]}),t.source==="standard"&&e.jsxs("p",{className:"hint",children:["标准场景编号：",q(t.benchmark_id)]})]})}),e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsxs("p",{children:["规格键：",q(t.spec_key)]}),e.jsxs("p",{className:"hint",children:["已知规格：",q(t.dimensions)]}),e.jsx(bt,{title:"配置 / 规格 / 日期证据",children:()=>e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["执行时配置：",tn(t.config)]}),e.jsxs("p",{children:["配置来源：",Nn(t.config_source)]}),e.jsxs("p",{children:["采样日期（服务端记录）：",q(t.days)]}),e.jsxs("p",{children:["缓存条件：",q(t.cache_condition)]}),e.jsx("pre",{children:q(t.spec)})]})})]})}),e.jsx("td",{children:e.jsxs("div",{children:[e.jsxs("p",{children:["样本 ",T(t.samples)," / ",T(rr(t))," 天"]}),e.jsxs("p",{children:["完成 ",T(t.done)," / 失败 ",T(t.error)," / 取消 ",T(t.canceled)]}),e.jsxs("p",{className:"hint",children:["有效耗时样本 ",T(t.measured),"；已人工验收 ",T(t.reviewed)]})]})}),e.jsx("td",{children:e.jsxs("div",{children:[e.jsxs("p",{children:["平均 ",pe(t.mean_seconds)]}),e.jsxs("p",{children:["P50 ",pe(t.p50_seconds)]}),e.jsxs("p",{children:["P90 ",pe(t.p90_seconds)]})]})}),e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsxs("p",{children:["成功任务 runtime 合计 ",pe(t.runtime_seconds)]}),e.jsxs("p",{children:["成功任务 / 运行小时（仅 runtime 参考）：",T(t.reference_per_hour)]}),t.source!=="historical"&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["占机合计 ",pe(t.occupied_seconds)]}),e.jsxs("p",{children:["实际产出 ",T(t.output_count)," ",Be(t)]}),e.jsxs("p",{children:["单位技术交付 ",pe(t.seconds_per_unit)," / ",Be(t)]}),e.jsxs("p",{children:["单位人工合格 ",pe(t.qualified_seconds_per_unit)," / ",Be(t)]})]})]})}),e.jsx("td",{className:"wide",children:e.jsx(Cn,{values:ar(t)})})]},t.id))}):e.jsx("p",{className:"empty",children:"暂无业务规格样本；未测试场景不能推算产能。"})}function Cl({items:n}){return e.jsx("dl",{children:n.map(([r,t])=>e.jsxs(d.Fragment,{children:[e.jsx("dt",{children:r}),e.jsx("dd",{children:t})]},r))})}function zl({entries:n,worker:r,title:t,ready:s,onEvidence:a}){const[i,o]=d.useState(()=>_l(n)?.id||""),[l,p]=d.useState(!1),[c,m]=d.useState(!1),f=`summary-evidence-${d.useId().replace(/[^a-zA-Z0-9_-]/g,"")}`,u=n.find(S=>S.id===i)||n[0];if(!u)return null;const x=ft(u),w=x.variants.length?x.variants.map(S=>S.summary):x.reference?[x.reference]:[],y=w.reduce((S,I)=>S+Math.max(1,Ae(I).length),0)||1,N=n.map(wl),j=new Map;for(const S of N)j.set(S,(j.get(S)||0)+1);const h=x.variants.length?x.variants.length>1||x.hasEvidence&&G(x.recorded)&&G(x.total)&&x.recorded<x.total||x.variants.some(S=>S.summary.complete===!1)?"全组历史任务平均，非某个模型或组合专属速度。":"":x.reference?"此处耗时来自历史任务，不代表当前模型速度。":"",b={"--model-rows":y+1};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"business-row","data-capability":u.capability,"data-selected-group-id":u.id,children:[e.jsxs("div",{className:"matrix-field","data-label":"平均生成时间",children:[e.jsx("span",{className:xn(u)?"mean-time":"muted",children:xn(u)?jl(u.mean_seconds):"暂无成功耗时"}),h&&e.jsx("p",{className:"warn hint",children:h}),xn(u)&&G(u.mean_seconds)&&(u.mean_seconds<1||u.mean_seconds>3600)&&e.jsx("p",{className:"warn hint",children:"耗时异常，请核对详情"})]}),e.jsxs("div",{className:"matrix-samples","data-label":"样本与详情",children:[e.jsxs("p",{className:!G(u.measured)||u.measured<30?"warn hint":"hint",children:[G(u.measured)?u.measured<30?`仅 ${T(u.measured)} 次 / 仅供参考`:`${T(u.measured)} 次成功实测`:"样本数未记录"," ","· ",je(u.source)]}),e.jsx("button",{type:"button",className:"summary-detail-toggle","aria-expanded":l,"aria-controls":f,onClick:()=>{p(!l),l||m(!0)},children:l?"收起详情":"查看详情"})]}),e.jsxs("div",{className:"matrix-field","data-label":"任务规格",children:[e.jsx("select",{className:"summary-spec",disabled:!s,"aria-label":`${r.name||"机器"} ${t}任务规格`,title:`原组 ${u.id} / 配置 ${q(u.config_id)} / ${je(u.source)} / 规格键 ${q(u.spec_key)}`,value:u.id,onChange:S=>{s&&(o(S.target.value),m(l))},children:n.map((S,I)=>e.jsx("option",{value:S.id,children:`${N[I]}${(j.get(N[I]||"")||0)>1?` · ${je(S.source)} · ${G(S.last_sample_at)?Je(S.last_sample_at):"日期未记录"} · 采样 ${I+1}`:""}`},S.id))}),e.jsxs("dl",{className:"selected-spec",children:[e.jsx("dt",{children:"输入素材"}),e.jsx("dd",{className:"input-materials",children:Sn(u).map(S=>e.jsx("span",{children:S},S))}),e.jsx("dt",{children:"生成参数"}),e.jsx("dd",{className:"generation-parameters",children:$n(u)}),e.jsx("dt",{children:"实际成品"}),e.jsx("dd",{className:"actual-resolution",children:e.jsx(yt,{resolution:u.output_resolution})})]})]}),e.jsxs("div",{className:"matrix-models",style:b,children:[e.jsx("div",{className:"matrix-field","data-label":"模型名称",children:w.length?w.map((S,I)=>e.jsx("div",{className:"model-variant",children:Ae(S).length?Ae(S).map((A,v)=>e.jsx("div",{className:"model-item",children:e.jsx("p",{className:"model-name",children:A.name||"未获取到模型信息"})},v)):e.jsx("p",{className:"muted",children:"未获取到模型信息"})},I)):e.jsx("span",{className:"muted",children:"未获取到模型信息"})}),e.jsx("div",{className:"matrix-field","data-label":"模型精度",children:w.length?w.map((S,I)=>e.jsx("div",{className:"model-variant",children:Ae(S).length?Ae(S).map((A,v)=>e.jsx("div",{className:"model-item",children:Nl(A).map(R=>e.jsx("p",{className:"model-label",children:R},R))},v)):e.jsx("p",{className:"muted",children:"无"})},I)):e.jsx("p",{className:"muted",children:"无"})})]})]}),e.jsx("div",{className:"summary-evidence",id:f,hidden:!l,children:c&&e.jsxs(e.Fragment,{children:[e.jsx(vt,{g:u},u.id),e.jsx("button",{type:"button","data-evidence-entry":"",disabled:!s,onClick:()=>{s&&a(u.id)},children:"任务证据"})]})})]})}function El({report:n,ready:r,includeOffline:t,onProfile:s,onEvidence:a}){const i=n.workers.filter(c=>t||ke(c));if(!i.length)return e.jsx("p",{className:"empty",children:t?"暂无机器记录。":"当前没有在线机器，可勾选“包含离线”查看已登记记录。"});const o=new Set(i.map(c=>c.id)),l=new Map;for(const c of n.groups)if(c.worker_id&&o.has(c.worker_id)){let m=l.get(c.capability);m||(m={title:We(c),machines:new Map},l.set(c.capability,m)),m.machines.set(c.worker_id,[...m.machines.get(c.worker_id)||[],c])}l.size||l.set("",{title:"历史记录",machines:new Map});const p={"--machine-count":i.length};return e.jsx("div",{className:"scroll comparison-scroll",tabIndex:0,role:"region","aria-label":"机器产能对比表，可横向滚动",children:e.jsxs("table",{className:"simple-table matrix-table","aria-label":"机器与业务能力对比",style:p,children:[e.jsxs("colgroup",{children:[e.jsx("col",{className:"matrix-axis-col"}),i.map(c=>e.jsx("col",{},c.id))]}),e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"business-axis",scope:"col",children:"业务能力"}),i.map((c,m)=>e.jsxs("th",{className:"machine-heading",scope:"col",id:`summary-machine-${m+1}`,"data-summary-worker-id":c.id,children:[e.jsx("h3",{children:c.name||"未命名机器"}),e.jsx("span",{className:["busy","running"].includes(c.state)?"warn":ke(c)?"online-state":"muted",children:nr[c.state]||"状态待确认"}),e.jsx("p",{className:"machine-hardware",children:bl(c)}),e.jsxs("details",{className:"machine-more",children:[e.jsx("summary",{children:"机器详情"}),e.jsx("p",{children:yl(c)}),e.jsxs("p",{className:"hint",children:["最后上报：",Je(c.last_seen),"；Worker ID：",c.id,"；采集程序版本：",q(c.agent_version)]}),!ke(c)&&e.jsx("p",{className:"hint",children:"此记录当前不可用，配置为最后上报信息，历史速度不代表现在能执行。"}),e.jsx("button",{type:"button",onClick:()=>s(c),children:"查看配置"})]})]},c.id))]})}),e.jsx("tbody",{children:[...l].map(([c,{title:m,machines:f}],u)=>e.jsxs("tr",{className:"capability-row","data-capability":c||void 0,children:[e.jsx("th",{className:"business-axis",scope:"row",id:`summary-business-${u+1}`,children:e.jsx("span",{className:"business-title",children:m})}),i.map((x,w)=>{const y=f.get(x.id);return e.jsx("td",{className:"machine-result","data-summary-worker-id":x.id,headers:`summary-machine-${w+1} summary-business-${u+1}`,children:y?e.jsx(zl,{entries:y,worker:x,title:m,ready:r,onEvidence:a}):e.jsx("p",{className:"matrix-empty",children:"暂无记录；不据此推断是否支持该业务。"})},x.id)})]},c))})]})})}function Ml({report:n,mounted:r,onProfile:t}){const s=n?.overview||{};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"summary",children:[e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"生成任务"}),e.jsx("span",{className:"hint",children:"不是产物数量"})]}),e.jsx("div",{id:"task-metrics",className:"metrics pad",children:r&&e.jsx(Un,{items:[["总任务",s.tasks],["完成",s.done],["失败",s.error],["取消",s.canceled]]})}),e.jsx("p",{id:"coverage",className:"hint pad",children:r&&`历史 ${T(s.historical_tasks)} / 新采集 ${T(s.captured_tasks)}；Worker 未关联 ${T(s.unknown_worker)}；已排除 API ${T(s.excluded_api)}。`})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"实际产物"}),e.jsx("span",{className:"hint",children:"仅已知输出，不从请求推断"})]}),e.jsx("div",{id:"output-metrics",className:"metrics pad",children:r&&e.jsx(Un,{items:[["图片（张）",s.output_images],["视频（条）",s.output_videos],["视频总时长（秒）",s.output_seconds],["产物未知记录",s.unknown_outputs]]})}),e.jsx("p",{className:"hint pad",children:"图片、视频、时长分别统计；未知不记为零，也不计为人工合格。"})]})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"机器配置与状态"}),e.jsx("span",{className:"hint",children:"按 Worker ID 区分，名称相同不合并"})]}),e.jsx("p",{className:"notice hint",children:"配置为当前或最后上报信息，不代表历史执行快照，也不是最低采购配置。系统可见内存不是标称容量，多卡显存不相加。"}),e.jsx("div",{id:"workers",className:"worker-grid",children:r&&n&&(n.workers.length?n.workers.map(a=>{const i=a.hardware,o=["offline","disabled"].includes(a.state)||!G(a.last_seen)||Date.now()/1e3-a.last_seen>120;return e.jsxs("article",{className:"worker","data-worker-id":a.id,children:[e.jsx("h3",{children:q(a.name)}),e.jsxs("p",{className:"hint",children:["Worker ID：",a.id]}),e.jsx("span",{className:"badge",children:nr[a.state]||a.state}),e.jsxs("p",{className:o?"warn":"hint",children:["最后心跳：",Je(a.last_seen),o?"；状态 / 配置快照已过期或无法确认，请勿视为实时。":""]}),e.jsx(Cl,{items:[["GPU",i?.gpus?.length?i.gpus.map((l,p)=>`GPU ${p+1}：${q(l.name)} / 单卡显存 ${Ge(l.memory_total_bytes)}`).join(`
`):"未知"],["GPU 数量",i?.gpus?.length?T(i.gpus.length):"未知"],["CPU",rn(i?.cpu,"cpu")],["内存",Ge(i?.memory_total_bytes)],["系统",rn(i?.os,"os")],["环境",q(i?.environment_id)],["模型版本",q(i?.model_version)],["主机 ID",q(i?.host_id)],["磁盘",q(i?.disk)],["配置备注",q(i?.note)]]}),e.jsxs("p",{className:"hint",children:["配置来源：",Nn(a.hardware_source),"。人工补录不回写历史快照。"]}),e.jsxs("p",{children:["任务 ",T(a.tasks)," / 完成 ",T(a.done)," / 失败 ",T(a.error)," / 取消"," ",T(a.canceled)]}),e.jsxs("p",{className:"hint",children:["累计 runtime：",pe(a.runtime_seconds)]}),a.id&&a.state!=="historical"?e.jsxs("details",{className:"profile-details",children:[e.jsx("summary",{children:"补录机器配置（人工声明）"}),e.jsx("p",{className:"hint",children:"7 个字段仅保存非空新声明，不回写历史快照。"}),e.jsx("button",{type:"button",onClick:()=>t(a),children:"查看 / 补录配置"})]}):e.jsx("p",{className:"hint",children:"历史执行端未关联现存注册记录，不能补录配置。"})]},a.id)}):e.jsx("p",{className:"empty",children:"暂无执行端信息；无法关联的历史任务不会按名称猜测机器。"}))})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"业务规格分组"}),e.jsx("span",{className:"hint",children:"原始统计保留失败、取消与异常记录"})]}),e.jsx("div",{id:"machine-groups",children:r&&n&&e.jsx(wt,{groups:n.groups,report:n})})]})]})}const Pl={mode:"historical",quality:"technical",availability:1,utilization:.75},Ce=[{id:"zimage_t2i",type:"生图模式",label:"文生图",capabilities:["zimage_t2i","krea2_t2i","qwen_image_2512_t2i","qwen_image_21_t2i"]},{id:"zimage_i2i",type:"生图模式",label:"图生图",capabilities:["zimage_i2i","krea2_i2i","qwen_image_edit_2511_i2i","qwen_image_21_multi","qwen_image_21_i2i"]},{id:"flux2_klein_storyboard9",type:"生图模式",label:"多宫格故事分镜",capabilities:["flux2_klein_storyboard9"]},{id:"flux2_klein_edit",type:"生图模式",label:"参考图编辑(保人物)",capabilities:["flux2_klein_edit"]},{id:"minimax_h3_character_transfer",type:"生视频模式",label:"H3人物迁移",capabilities:["minimax_h3_character_transfer"]},{id:"minimax_h3_flf2v",type:"生视频模式",label:"H3 图生视频",capabilities:["minimax_h3_i2v","minimax_h3_flf2v"]},{id:"minimax_h3_talk2",type:"生视频模式",label:"H3 说话唱歌",capabilities:["minimax_h3_talk1","minimax_h3_talk2"]},{id:"minimax_h3_ref4",type:"生视频模式",label:"H3图片参考",capabilities:["minimax_h3_ref4"]},{id:"minimax_h3_comic20",type:"生视频模式",label:"漫剧4宫格",capabilities:["minimax_h3_comic20"]},{id:"minimax_h3_fusion_v2",type:"生视频模式",label:"H3无损融合单采V2",capabilities:["minimax_h3_fusion_v2"]},{id:"minimax_h3_fusion_v3",type:"生视频模式",label:"H3无损融合单采V3",capabilities:["minimax_h3_fusion_v3"]},{id:"minimax_h3_ref9",type:"生视频模式",label:"H3全能参考",capabilities:["minimax_h3_ref9"]},{id:"minimax_h3_ref_2pass",type:"生视频模式",label:"H3全能参考(高质量)",capabilities:["minimax_h3_ref_2pass"]}],Wn=n=>Ce.find(r=>n!==void 0&&r.capabilities.includes(n)),Il=n=>JSON.stringify(n.source==="standard"?[n.config_id||null,n.source,n.benchmark_id||`unknown:${n.id}`]:[n.config_id||null,n.source]),Rl=n=>G(n.mean_seconds)&&n.mean_seconds>0&&G(n.measured)&&n.measured>0;function zn(n,r){return n.workers.some(t=>t.id===r&&ke(t))?n.groups.filter(t=>t.worker_id===r&&["historical","captured","standard"].includes(t.source)&&Wn(t.capability)&&Rl(t)):[]}const _t=(n,r)=>n<r?-1:n>r?1:0;function Tl(n,r){return(r.measured||0)-(n.measured||0)||(r.samples||0)-(n.samples||0)||(r.last_sample_at||0)-(n.last_sample_at||0)||(r.mean_seconds||0)-(n.mean_seconds||0)||_t(n.id,r.id)}function Ll(n,r){const t=new Map;for(const i of r){const o=Il(i);t.set(o,[...t.get(o)||[],i])}const s=[];for(const[i,o]of t){const l=[];for(const p of n){const c=Ce.find(f=>f.id===p.mode_id),m=o.filter(f=>c?.capabilities.includes(f.capability)).sort(Tl)[0];m&&l.push(m)}l.length===n.length&&s.push({key:i,groups:l,measured:l.reduce((p,c)=>p+(c.measured||0),0)})}s.sort((i,o)=>o.measured-i.measured||_t(i.key,o.key));const a=s[0];if(!a)throw Error("所选模式没有同一电脑、同一配置和来源的共同实测记录，请减少模式或换一台电脑");return a.groups}function Al(n,r,t,s,a,i){if(!n.workers.some(c=>c.id===t&&ke(c)))throw Error("所选电脑当前不在线，请刷新后重新选择。");const o=zn(n,t),l=new Set;for(const c of i){const m=Ce.find(f=>f.id===c.mode_id);if(!m||!o.some(f=>m.capabilities.includes(f.capability)))throw Error("所选模式没有成功耗时记录，请换一个模式或电脑。");if(l.has(c.mode_id))throw Error("同一模式请合并每日需求，不能重复选择。");if(l.add(c.mode_id),!G(Number(c.quantity))||Number(c.quantity)<=0)throw Error("每日需求必须是大于零的有限任务数量。")}if(!i.length)throw Error("请至少添加一个有样本的业务模式。");const p=Ll(i,o);return dt.parse({...r,...Pl,worker_id:t,hours:Number(s),...a!==""?{price:Number(a)}:{},demands:i.map((c,m)=>{const f=p[m];if(!f)throw Error("原组证据缺失");return{group_id:f.id,quantity:Number(c.quantity)}})})}const kt=[{key:"host_id",label:"主机 ID",maxLength:160},{key:"cpu",label:"CPU 型号",maxLength:160},{key:"memory_total_bytes",label:"系统可见内存（GiB）"},{key:"environment_id",label:"执行环境版本",maxLength:160},{key:"model_version",label:"模型版本",maxLength:160},{key:"disk",label:"磁盘配置说明",maxLength:160},{key:"note",label:"配置备注",maxLength:500}];function Bn(n,r){if(Array.from(n).some(t=>t.charCodeAt(0)<32||t.charCodeAt(0)===127))throw Error(r)}function Dl(n,r){const t={};for(const{key:s}of kt){const a=(n[s]||"").trim();if(a)if(Bn(a,"配置字段请使用不含控制字符的单行文本。"),s==="memory_total_bytes"){const i=Math.round(Number(a)*1073741824);if(!Number.isSafeInteger(i)||i<=0)throw Error("内存必须是能转换为安全正整数字节的 GiB 数值。");i!==r?.[s]&&(t[s]=i)}else a!==(s==="cpu"?rn(r?.cpu,"cpu"):r?.[s])&&(t[s]=a)}if(!Object.keys(t).length)throw Error("没有需要保存的修改；留空不会删除已有配置。");return pt.parse(t)}function Ol(n){const r=n.accepted===""?null:Number(n.accepted);if(r!==null&&(!Number.isSafeInteger(r)||r<0))throw Error("请输入非负整数，或留空表示未验收。");const t=(n.benchmark_id||"").trim(),s=(n.note||"").trim();if(n.source==="standard"&&!t)throw Error("标准样本需要填写标准场景编号；标签不代表自动验证。");return Bn(s,"验收备注和标准场景编号请使用单行文本，不含换行或控制字符。"),Bn(t,"验收备注和标准场景编号请使用单行文本，不含换行或控制字符。"),ut.parse({accepted:r,source:n.source,benchmark_id:t,note:s})}function Fl(n){let r=n==null?"":typeof n=="object"?JSON.stringify(n):String(n);return/^[\s]*[=+\-@]/.test(r)&&(r="'"+r),'"'+r.replace(/"/g,'""')+'"'}function ql(n){return"\uFEFF"+[["类别","内容"],["测算口径","历史任务运行参考，不是合格日产能"],["输入与时间范围",n.payload],["当前机器配置（非历史快照）",n.hardware],["测算结果",n.result],...n.groups.map(t=>["场景证据",{...t,warnings:ar(t)}])].map(t=>t.map(Fl).join(",")).join(`\r
`)}function Ul({worker:n,controller:r,onClose:t}){const[s,a]=d.useState({});return e.jsx(he,{title:n.state==="historical"?"历史执行端配置":`机器配置与人工补录 · ${n.name||n.id}`,className:"capacity-page",onClose:t,submitLabel:n.state==="historical"?"关闭":"保存人工配置",onSubmit:n.state==="historical"?async()=>{}:async()=>{const i=Dl(s,n.hardware);try{await r.saveProfile(n.id,i)}catch(o){throw Error(`保存失败：${ie(o)}。输入已保留，请检查字段后重试。`)}},children:n.state==="historical"?e.jsx("p",{children:tn(n.hardware)}):e.jsxs("div",{className:"capacity-operation",children:[e.jsxs("details",{children:[e.jsx("summary",{children:"当前 / 最后上报配置"}),e.jsx("p",{children:tn(n.hardware)}),e.jsxs("p",{children:["配置来源：",Nn(n.hardware_source),"；配置备注：",q(n.hardware?.note)]})]}),e.jsx("p",{className:"notice",children:"仅保存本次修改的非空字段；留空保留原值。内存以 GiB 输入、按字节保存，不是采购标称容量。新声明仅向后生效，不回写历史快照。"}),e.jsx("p",{className:"hint",children:"主机 ID 仅在人工确认属于同一物理机器时填写相同值，不按机器名称合并；同机多个 Worker 不自动代表多倍产能。"}),e.jsx("div",{className:"profile-form",children:kt.map(({key:i,label:o,maxLength:l})=>e.jsxs("label",{className:"field",children:[e.jsx("span",{children:o}),e.jsx("input",{name:i,type:i==="memory_total_bytes"?"number":"text",min:i==="memory_total_bytes"?"0.000001":void 0,step:i==="memory_total_bytes"?"any":void 0,maxLength:l,placeholder:["model_version","environment_id"].includes(i)?"填写固定版本，勿用 latest / main / unknown":"留空保留现值",value:s[i]||"",onChange:p=>{a({...s,[i]:p.target.value}),r.invalidateEstimate("机器配置输入已更改；请保存后重新计算，未保存内容不会进入测算。")}})]},i))})]})})}function Wl({detail:n,controller:r,onClose:t}){const[s,a]=d.useState({accepted:G(n.review?.accepted)?String(n.review.accepted):"",source:n.review?.source==="standard"?"standard":"business",benchmark_id:n.review?.benchmark_id||"",note:n.review?.note||""}),i=(o,l)=>{a({...s,[o]:l}),r.invalidateEstimate("人工验收输入已变更；未保存内容不会进入测算。")};return e.jsx(he,{title:`人工验收 · ${n.job_id}`,className:"capacity-page",onClose:t,submitLabel:"保存人工标记",onSubmit:async()=>{const o=Ol(s);try{await r.saveReview(n.job_id,o)}catch(l){throw Error(`保存失败：${ie(l)}`)}},children:e.jsxs("div",{className:"review-form",children:[e.jsxs("p",{children:["任务 ",n.job_id,"；原采集来源：",je(n.source),"。"]}),e.jsxs("div",{className:"review-fields",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"人工合格产物数量（留空为未验收）"}),e.jsx("input",{name:"accepted",type:"number",min:"0",step:"1",value:s.accepted,onChange:o=>i("accepted",o.target.value)})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"人工样本标签"}),e.jsxs("select",{name:"source",value:s.source,onChange:o=>i("source",o.target.value),children:[e.jsx("option",{value:"business",children:"业务样本"}),e.jsx("option",{value:"standard",children:"标准样本（人工声明）"})]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"标准场景编号（标准样本请填写）"}),e.jsx("input",{name:"benchmark_id",maxLength:100,value:s.benchmark_id,onChange:o=>i("benchmark_id",o.target.value)})]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"验收备注 / 固定条件说明"}),e.jsx("textarea",{name:"note",rows:2,maxLength:500,value:s.note,onChange:o=>i("note",o.target.value)})]}),e.jsx("p",{className:"notice",children:"此操作只保存人工声明，不会自动确认技术规格、缓存条件或标准测试通过；不会将历史记录补写为完整采集证据。"})]})})}function Bl({confirmation:n,onClose:r}){return e.jsx(he,{title:`确认受控补采 · ${n.detail.job_id}`,className:"capacity-page",onClose:r,submitLabel:"确认本批补采",onSubmit:n.submit,children:e.jsxs("div",{className:"capacity-operation",children:[e.jsxs("p",{className:"notice",children:["任务 ",n.detail.job_id,"；本批偏移 ",n.offset,"，最多处理 4 个可信最终产物。"]}),e.jsx("p",{children:"补采仅添加成品尺寸证据，不修改技术资格、原生成参数、人工合格量或标准标签。最终清单由服务端核验；不会扫描目录，也不会从请求猜测尺寸。"}),e.jsxs("details",{children:[e.jsx("summary",{children:"本页已记录的最终产物（最终以服务端可信清单为准）"}),e.jsx("pre",{children:q(n.detail.outputs)})]})]})})}function Vl({detail:n,controller:r,onConfirm:t}){const[s,a]=d.useState(0),[i,o]=d.useState(""),[l,p]=d.useState(!1),c=d.useRef(!0),m=d.useRef(!1),f=d.useRef(0);d.useEffect(()=>(c.current=!0,()=>{c.current=!1}),[]);const u=async(x,w)=>{if(!c.current||!r.probeCurrent(w)||f.current!==x)throw Error("证据页面或批次已变化，请关闭后重新打开。");if(m.current)throw Error("正在补采，请勿重复提交。");m.current=!0,p(!0),o("正在补采本批成品尺寸…"),r.invalidateEstimate("成品尺寸正在补采，旧测算已清除。");try{const y=await r.probe(n.job_id,x);if(!c.current)return;f.current=y.next_offset,a(y.next_offset),o(`本批处理 ${T(y.processed)} 个，成功记录尺寸 ${T(y.recorded)} 个；可信最终产物共 ${T(y.total)} 个。${y.next_offset===null?"补采已完成，刷新看板查看结果。":"尚有后续产物，请点击继续补采；刷新看板查看结果。"}`)}catch(y){const N=`补采失败：${ie(y)}${y instanceof Pr&&y.status===409?"。没有可信最终产物记录，不能猜测成品尺寸。":""}`;throw c.current&&o(N),Error(N)}finally{m.current=!1,c.current&&p(!1)}};return e.jsxs("div",{className:"output-probe",children:[e.jsx("p",{className:"hint",children:"仅按可信最终产物清单补采，每次最多 4 个；不会从输入素材或请求参数猜测尺寸。"}),e.jsx("button",{type:"button",disabled:l||s===null,onClick:()=>{if(m.current||s===null||!c.current)return;const x=s,w=r.probeVersion();t({detail:n,offset:x,submit:()=>u(x,w)})},children:s===null?"补采已完成":s>0?"继续补采成品尺寸":"补采成品尺寸"}),e.jsx("p",{className:"hint",role:"status",children:i})]})}function Hl({detail:n,report:r,controller:t,onReview:s,onProbe:a}){const[i,o]=d.useState(!1);return e.jsxs("details",{className:"evidence","data-job-id":n.job_id,onToggle:l=>{l.currentTarget.open&&o(!0)},children:[e.jsxs("summary",{children:[e.jsx("strong",{children:n.job_id}),e.jsx("span",{className:"badge",children:je(n.source)}),e.jsx("span",{children:` ${nr[n.status]||n.status} / ${n.capability} / ${ir(n.worker_id,n.worker_name,r.workers,r.groups)} / ${Je(n.created_at)}`})]}),e.jsx("div",{className:"evidence-content",children:i&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["任务 runtime：",pe(n.runtime_seconds),"；占机：",pe(n.occupied_seconds),"；原分组：",q(n.group_id)]}),e.jsx(Cn,{values:n.warnings}),e.jsx("div",{className:"f-grid3",children:[["输入素材",Sn(n).join(" / ")],["生成参数",$n(n,!0)],["技术与人工口径","技术资格以原采集证据及服务端校验为准；尺寸补采与人工标签不修改它。"]].map(([l,p])=>e.jsxs("div",{children:[e.jsx("h3",{children:l}),e.jsx("p",{children:p})]},l))}),e.jsx(fn,{title:"执行尝试（包含重试）",value:n.attempts}),e.jsx("h3",{children:"实际输出证据"}),n.outputs?.length?e.jsx(or,{headers:["产物标识","类型","实际尺寸","视频时长","技术记录"],children:n.outputs.map((l,p)=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("span",{children:l.key||l.id||"未记录"})}),e.jsx("td",{children:e.jsx("span",{children:q(l.kind)})}),e.jsx("td",{children:e.jsx("span",{children:vl(l)})}),e.jsx("td",{children:e.jsx("span",{children:pe(l.duration)})}),e.jsx("td",{children:e.jsx("span",{children:l.valid===!0?"采集记录标记有效":l.valid===!1?"未通过 / 待确认":"未记录"})})]},p))}):e.jsx("p",{className:"notice",children:"最终产物清单未记录；不能按请求猜测，也不按零产物处理。"}),e.jsx(fn,{title:"实际输出原始证据",value:n.outputs}),e.jsxs("p",{children:["人工合格数量：",T(n.review?.accepted),"；样本标签：",$l(n),"；标准场景编号：",q(n.review?.benchmark_id),"；备注：",q(n.review?.note)]}),e.jsx(jt,{resolution:n.output_resolution}),e.jsx(fn,{title:"成品尺寸原始证据",className:"output-resolution-raw",value:{output_resolution:n.output_resolution,recovered_outputs:n.recovered_outputs}}),n.status==="done"&&e.jsx(Vl,{detail:n,controller:t,onConfirm:a}),["captured","standard"].includes(n.source)?e.jsx("button",{className:"review-open",type:"button",onClick:()=>s(n),children:"人工验收 / 样本标签"}):e.jsx("p",{className:"hint",children:"历史任务不能补写为完整采集证据，不提供采集验收表单。"})]})})]})}function Gl({controller:n,onReview:r,onProbe:t}){const s=n.getSnapshot(),{report:a,evidence:i,filters:o,ready:l}=s,p=s.mounted.has("evidence")&&a!==null,c=!l||i.busy||i.failed||!p;return e.jsxs("section",{"aria-labelledby":"evidence-heading",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{id:"evidence-heading",children:"任务证据与人工标记"}),e.jsx("span",{id:"detail-count",className:"hint",children:p&&(i.failed?"筛选未完成":i.busy?"":`当前 ${i.records.length} / 总计 ${T(i.total)} 条；聚合不受分页截断`)})]}),e.jsx("p",{className:"hint pad",children:"明细每页最多 100 条。人工验收 / 标准样本是人工声明，不等于系统自动验证通过；历史记录不可补写为完整采集证据。"}),e.jsx("div",{id:"evidence-filters",children:p&&e.jsxs("div",{className:"evidence-filters",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"独立原分组（按真实 group_id）"}),e.jsxs("select",{id:"evidence-group",disabled:!l,value:o.group,onChange:m=>n.filter({group:m.target.value}),children:[e.jsx("option",{value:"",children:"全部原分组"}),a.groups.map(m=>e.jsx("option",{value:m.id,children:`${We(m)} / ${ir(m.worker_id,m.worker_name,a.workers,a.groups)} / ${je(m.source)} / ${m.config_id||"配置未知"} / ${m.id}`},m.id))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"任务状态"}),e.jsxs("select",{id:"evidence-status",disabled:!l,value:o.status,onChange:m=>n.filter({status:m.target.value}),children:[e.jsx("option",{value:"",children:"全部状态"}),[["done","已完成"],["error","失败"],["canceled","已取消"],["queued","排队中"],["running","运行中"]].map(([m,f])=>e.jsx("option",{value:m,children:f},m))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"采集来源"}),e.jsxs("select",{id:"evidence-source",disabled:!l,value:o.source,onChange:m=>n.filter({source:m.target.value}),children:[e.jsx("option",{value:"",children:"全部来源"}),["historical","captured","standard"].map(m=>e.jsx("option",{value:m,children:je(m)},m))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"每页最多 100 条"}),e.jsx("select",{id:"evidence-size",disabled:!l,value:o.size,onChange:m=>n.filter({size:Number(m.target.value)}),children:[100,50,25,10].map(m=>e.jsxs("option",{value:m,children:[m," 条 / 页"]},m))})]})]})}),e.jsx("p",{id:"evidence-state",className:"hint pad",role:"status",hidden:!i.state,children:i.state}),e.jsx("div",{id:"details",children:p&&!i.busy&&!i.failed&&(i.records.length?i.records.map(m=>e.jsx(Hl,{detail:m,report:a,controller:n,onReview:r,onProbe:t},m.job_id)):e.jsx("p",{className:"empty",children:"当前页没有任务证据。可立即刷新，或返回上一页。"}))}),e.jsxs("div",{className:"pager",children:[e.jsx("button",{id:"previous",disabled:c||i.start===0,onClick:()=>n.page(-1),children:"上一页"}),e.jsx("span",{id:"page-note",className:"hint",children:p&&!i.busy&&!i.failed&&`第 ${Math.floor(i.start/i.size)+1} 页`}),e.jsx("button",{id:"next",disabled:c||i.start+i.size>=i.total,onClick:()=>n.page(1),children:"下一页"})]})]})}function Jl(n,r){const t=n.workers.filter(ke);return t.find(s=>s.id===r)?.id||t.find(s=>zn(n,s.id).length)?.id||t[0]?.id||""}function Mr(n,r,t){const s=zn(n,r);return{id:t,mode_id:Ce.find(a=>s.some(i=>a.capabilities.includes(i.capability)))?.id||"",quantity:""}}function Zl(n,r,t){const[s,a]=d.useState({report:null,worker:"",demands:[],next:1}),[i,o]=d.useState("8"),[l,p]=d.useState("");if(t&&r&&r!==s.report){const j=Jl(r,s.worker);a({report:r,worker:j,demands:[Mr(r,j,s.next)],next:s.next+1})}const c=r?zn(r,s.worker):[],m=()=>n.invalidateEstimate(),f=j=>{r&&(a({...s,worker:j,demands:[Mr(r,j,s.next)],next:s.next+1}),m())},u=(j,h)=>{a({...s,demands:s.demands.map(b=>b.id===j?{...b,...h}:b)}),m()},x=j=>{a({...s,demands:s.demands.filter(h=>h.id!==j)}),m()},w=j=>{const h=Ce.find(b=>b.id===j);return!!(h&&c.some(b=>h.capabilities.includes(b.capability)))};return{inputs:s,groups:c,hours:i,price:l,worker:f,update:u,remove:x,available:w,add:()=>{if(!n.getSnapshot().ready)return;const j=Ce.find(h=>!s.demands.some(b=>b.mode_id===h.id)&&w(h.id));j&&(a({...s,demands:[...s.demands,{id:s.next,mode_id:j.id,quantity:""}],next:s.next+1}),m())},submit:async()=>{n.invalidateEstimate("正在计算…");const j=n.getSnapshot().snapshot;try{if(!r||!n.getSnapshot().ready||!j)throw Error("请先点击立即刷新并成功读取证据。");await n.estimate(Al(r,j.range,s.worker,i,l,s.demands))}catch(h){n.estimateFailure(ie(h))}},setHours:j=>{o(j),m()},setPrice:j=>{p(j),m()}}}function Kl(n){const[r,t]=d.useState("");return d.useEffect(()=>{if(!n)return;const s=URL.createObjectURL(new Blob([ql(n)],{type:"text/csv;charset=utf-8"}));return t(s),()=>URL.revokeObjectURL(s)},[n]),n?r:""}function Yl({saved:n,report:r}){const{result:t,payload:s,groups:a}=n;return e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"warn",children:"成功任务处理参考，不是合格产物日产量或采购承诺"}),e.jsxs("p",{className:"result-number",children:["参考机器数：",T(t.machines)," 台"]}),e.jsxs("p",{children:["每日所需参考运行时间：",pe(t.total_seconds)]}),e.jsxs("p",{children:["单机每日可用容量时间：",pe(t.daily_capacity_seconds)]}),e.jsxs("p",{children:["整机采购小计：",G(t.price_total)?`¥${T(t.price_total)}`:"未计价"]}),e.jsx(or,{headers:["业务模式","每日需求","平均任务耗时","单机场景参考日处理量"],children:t.lines.map((i,o)=>{const l=Wn(a.find(p=>p.id===i.group_id)?.capability);return e.jsxs("tr",{children:[e.jsx("td",{className:"wide",children:e.jsx("span",{children:l?`${l.type} · ${l.label}`:"业务模式"})}),e.jsx("td",{children:e.jsxs("span",{children:[T(i.quantity)," 任务/天"]})}),e.jsx("td",{children:e.jsx("span",{children:pe(i.seconds_per_unit)})}),e.jsx("td",{children:e.jsxs("span",{children:[T(i.daily_units)," 任务/天"]})})]},o)})}),e.jsx("p",{className:"hint",children:"每个模式只参考自动选中的一个实测分组，不保证任意模型、尺寸或缓存规格的产能。"}),e.jsxs("details",{children:[e.jsx("summary",{children:"计算依据"}),e.jsx("h3",{children:"警告与覆盖限制"}),e.jsx(Cn,{values:t.warnings}),e.jsx("p",{className:"hint",children:"仅按成功任务平均 runtime 估算；不含完整失败、准备、重试或质量损耗。按同一电脑、配置和来源选择具体原分组，不合并均值。"}),e.jsx("p",{className:"hint",children:"台数 = 向上取整〔各模式任务数量 × 平均任务耗时之和 ÷（小时 × 3600 × 可用时间比例 × 生产容量比例）〕。容量预留不是 GPU 利用率；业务组合与模型切换可能增加损耗，不保证峰值 SLA。"}),s.demands.map(i=>{const o=a.find(l=>l.id===i.group_id);return o&&e.jsxs("div",{children:[e.jsx("h3",{children:Wn(o.capability)?.label||"业务模式"}),e.jsxs("p",{children:[mt(o)," / ",q(o.spec_key),"：",je(o.source),"；样本"," ",T(o.samples),"；",T(rr(o))," 天；配置 ",q(o.config_id),o.source==="standard"?`；标准场景编号 ${q(o.benchmark_id)}`:""]}),e.jsx(vt,{g:o})]},o.id)}),e.jsx("h3",{children:"计算假设"}),e.jsx("pre",{children:q(t.assumptions)}),e.jsxs("p",{className:"hint",children:["Worker ID：",s.worker_id,"；当前在线仅为本次数据快照，不承诺未来状态；当前配置仅作清单参考：",tn(r.workers.find(i=>i.id===s.worker_id)?.hardware),"；时间：全部历史 至 ",Je(s.to),"；",s.hours," 小时 / 可用"," ",T(s.availability*100),"% / 生产容量 ",T(s.utilization*100),"%"]})]})]})}function Xl({controller:n}){const r=n.getSnapshot(),{report:t,ready:s,estimate:a,estimateError:i,estimateNote:o,estimating:l}=r,p=r.mounted.has("purchase")&&t!==null,c=Zl(n,t,p),{inputs:m,groups:f}=c,u=d.useRef(null),x=Kl(a),w=t?.workers.filter(ke)||[],y=!s||!f.length||!m.demands.length||l,N=s?w.some(j=>j.id===m.worker)?f.length?"":"这台电脑暂无这些模式的成功耗时记录，请换一台电脑。":"当前没有在线电脑，请稍后刷新。":"请先刷新并读取电脑状态。";return e.jsxs("div",{className:"procurement",children:[e.jsxs("section",{className:"section",children:[e.jsx("div",{className:"section-head",children:e.jsx("h2",{children:"每日多场景需求"})}),e.jsxs("form",{id:"estimate-form",className:"pad",onSubmit:j=>{j.preventDefault(),j.currentTarget.reportValidity()&&c.submit()},children:[e.jsxs("div",{className:"form-grid",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"电脑显卡配置选择"}),e.jsx("select",{id:"estimate-worker",required:!0,disabled:!s,value:m.worker,onChange:j=>{s&&c.worker(j.target.value)},children:p&&(w.length?w.map(j=>e.jsx("option",{value:j.id,children:j.name||"未命名电脑"},j.id)):e.jsx("option",{value:"",children:"暂无在线电脑"}))})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"每日计划生产小时"}),e.jsx("input",{id:"hours",type:"number",min:"0.1",max:"24",step:"0.1",value:c.hours,required:!0,onChange:j=>c.setHours(j.target.value)})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"整机报价（元，可选）"}),e.jsx("input",{id:"price",type:"number",min:"0",step:"0.01",placeholder:"未填写则不计价格",value:c.price,onChange:j=>c.setPrice(j.target.value)})]})]}),e.jsx("p",{id:"mode-note",className:"notice",children:"按成功任务平均执行耗时参考，不是合格产物日产量或采购承诺。"}),e.jsx("p",{className:"hint",children:"固定按 100% 可用时间、75% 生产容量计算（预留 25% 应对波动）；每日数量按任务/天填写。"}),e.jsxs("div",{children:[e.jsx("h3",{children:"每日需求"}),e.jsx("p",{id:"demand-note",className:"hint",role:"status",children:p&&N}),e.jsx("div",{id:"demands",children:p&&m.demands.map(j=>e.jsxs("div",{className:"demand",children:[e.jsx("select",{className:"demand-group",required:!0,"aria-label":"需求业务模式",disabled:!s||!j.mode_id,value:j.mode_id,onChange:h=>{s&&c.update(j.id,{mode_id:h.target.value})},children:["生图模式","生视频模式"].map(h=>e.jsx("optgroup",{label:h,children:Ce.filter(b=>b.type===h).map(b=>e.jsxs("option",{value:b.id,disabled:!c.available(b.id)||m.demands.some(S=>S.id!==j.id&&S.mode_id===b.id),children:[b.type," · ",b.label]},b.id))},h))}),e.jsx("input",{className:"demand-quantity",type:"number",min:"0.01",step:"any",required:!0,placeholder:"任务/天","aria-label":"每日需求数量（任务/天）",disabled:!s||!j.mode_id,value:j.quantity,onChange:h=>c.update(j.id,{quantity:h.target.value})}),e.jsx("button",{type:"button",onClick:()=>c.remove(j.id),children:"移除"})]},j.id))}),e.jsx("button",{id:"add-demand",type:"button",disabled:!p||!s||!Ce.some(j=>!m.demands.some(h=>h.mode_id===j.id)&&c.available(j.id)),onClick:c.add,children:"增加场景"})]}),e.jsx("button",{id:"estimate-submit",className:"primary",type:"submit",disabled:!p||y,children:"计算机器需求"})]})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"测算结果与依据"}),e.jsx("button",{id:"export-estimate",disabled:!a||!x,onClick:()=>{n.getSnapshot().estimate&&u.current?.click()},children:"导出测算 CSV"}),e.jsx("a",{ref:u,hidden:!0,href:x||void 0,download:"capacity-estimate.csv",children:"下载测算 CSV"})]}),e.jsx("div",{id:"estimate-error",className:"error",role:"alert",hidden:!i,children:i}),e.jsx("div",{id:"estimate-result",className:"pad","aria-live":"polite",children:a&&t?e.jsx(Yl,{saved:a,report:t}):e.jsx("p",{className:"muted",children:o})})]})]})}const Le=[{id:"machines",label:"机器产能"},{id:"scenarios",label:"场景对比"},{id:"purchase",label:"采购测算"}];function Ql(n){const{controller:r,state:t}=fl(n),{report:s,ready:a,revision:i,mounted:o}=t,[l,p]=d.useState(!1),[c,m]=d.useState(""),[f,u]=d.useState(null),[x,w]=d.useState(null),[y,N]=d.useState(null),j=d.useRef(null),h=d.useRef(null),b=d.useRef([]),[S,I]=d.useState(!1);d.useEffect(()=>{S&&t.tab==="purchase"&&(h.current?.focus(),I(!1))},[S,t.tab]);const A=(g="")=>{r.getSnapshot().ready&&(r.showEvidence(g),j.current?.scrollIntoView({block:"start"}))},v=o.has("scenarios")&&s?Sl(s.groups):[],R=v.some(([g])=>g===c)?c:v[0]?.[0]||"";s&&o.has("scenarios")&&c!==R&&m(R);const O=s?.overview||{};return e.jsxs("main",{id:"main-content",className:"page capacity-page",tabIndex:-1,children:[e.jsxs("header",{className:"page-header card",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"产能评估"}),e.jsx("p",{className:"subtitle",children:"真实任务与独立规格分组，查看机器产能、证据和每日需求。"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{id:"refresh-state",className:"state",role:"status",children:t.refreshState})})]}),e.jsx("div",{className:"header-actions",children:e.jsx("button",{id:"refresh",type:"button",onClick:()=>{r.load()},children:"立即刷新"})})]}),e.jsx("div",{id:"error",className:"error",role:"alert",hidden:!t.error,children:t.error}),e.jsx("div",{id:"write-status",className:"write-status",role:"status",hidden:!t.writeStatus,children:t.writeStatus}),e.jsx("div",{className:"tabs",role:"tablist","aria-label":"产能评估视图",children:Le.map((g,_)=>e.jsx("button",{id:`tab-${g.id}`,role:"tab",type:"button",ref:k=>{b.current[_]=k},"aria-selected":t.tab===g.id,"aria-controls":`panel-${g.id}`,tabIndex:t.tab===g.id?0:-1,onClick:()=>r.activate(g.id),onKeyDown:k=>{const C=k.key==="ArrowRight"?(_+1)%Le.length:k.key==="ArrowLeft"?(_+Le.length-1)%Le.length:k.key==="Home"?0:k.key==="End"?Le.length-1:void 0;if(C===void 0)return;const M=Le[C];M&&(k.preventDefault(),r.activate(M.id),b.current[C]?.focus())},children:g.label},g.id))}),e.jsx("div",{id:"capacity-stats",className:"metrics","aria-label":"产能数据概览",children:s&&e.jsx(Un,{items:[["当前在线电脑",s.workers.filter(ke).length],["真实任务记录",O.tasks],["独立原规格组",s.groups.length],["产物清单未知任务",O.unknown_outputs]]})}),e.jsxs("section",{id:"panel-machines",role:"tabpanel","aria-labelledby":"tab-machines",tabIndex:0,hidden:t.tab!=="machines",children:[e.jsxs("section",{id:"machine-summary","aria-label":"在线机器业务简览",children:[e.jsxs("div",{className:"summary-toolbar",children:[e.jsx("h2",{id:"online-count",children:s?`当前在线 ${s.workers.filter(ke).length} 台`:"当前在线 — 台"}),e.jsxs("label",{className:"offline-toggle",children:[e.jsx("input",{id:"include-offline",type:"checkbox",checked:l,disabled:!a,onChange:g=>{a&&p(g.target.checked)}}),"包含离线"]})]}),e.jsx("p",{className:"summary-note hint",children:"在线状态是当前状态；业务为全部历史记录中跑过的业务，不代表当前均可执行。平均生成时间仅计成功任务执行耗时，不含排队，非纯 GPU 耗时，也不是合格日产能。同一业务的任务规格、模型或采样条件不同，不能直接按耗时做性能排名。"}),e.jsx("div",{id:"summary-machines",children:o.has("machines")&&s&&e.jsx(El,{report:s,ready:a,includeOffline:l,onProfile:u,onEvidence:A},`${i}-${l}`)}),e.jsxs("div",{className:"matrix-actions",children:[e.jsx("button",{type:"button",id:"open-purchase",onClick:()=>{r.activate("purchase"),I(!0)},children:"进入多模式采购测算"}),e.jsx("button",{type:"button",id:"open-evidence",disabled:!a,onClick:()=>A(),children:"展开全部任务证据"})]})]}),e.jsxs("details",{id:"technical-details",className:"section advanced",open:t.technicalOpen,onToggle:g=>r.technical(g.currentTarget.open),children:[e.jsx("summary",{children:"详细统计与机器配置"}),e.jsx(Ml,{report:s,mounted:o.has("technical"),onProfile:u},i)]})]}),e.jsx("section",{id:"panel-scenarios",role:"tabpanel","aria-labelledby":"tab-scenarios",tabIndex:0,hidden:t.tab!=="scenarios",children:e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"同场景证据对比"}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"业务 / 精确规格 / 来源"}),e.jsx("select",{id:"scenario-filter",disabled:!a,value:R,onChange:g=>{a&&m(g.target.value)},children:o.has("scenarios")&&(v.length?v.map(([g,_])=>e.jsx("option",{value:g,children:_},g)):e.jsx("option",{value:"",children:"暂无场景"}))})]})]}),e.jsx("p",{className:"notice hint",children:"只并列相同业务、规格键与证据来源。历史配置、模型版本或缓存条件缺失时，不视为受控跑分；未测试的配置不能按显存或价格推算。"}),e.jsx("div",{id:"scenario-groups",children:o.has("scenarios")&&s&&e.jsx(wt,{groups:s.groups.filter(g=>gt(g)===R),report:s},`${i}-${R}`)})]})}),e.jsx("section",{id:"panel-purchase",ref:h,role:"tabpanel","aria-labelledby":"tab-purchase",tabIndex:0,hidden:t.tab!=="purchase",children:e.jsx(Xl,{controller:r})}),e.jsxs("details",{id:"task-evidence",ref:j,className:"section advanced",open:t.evidenceOpen,onToggle:g=>r.evidenceOpen(g.currentTarget.open),children:[e.jsx("summary",{children:"任务证据与人工标记"}),e.jsx(Gl,{controller:r,onReview:w,onProbe:N},i)]}),f&&e.jsx(Ul,{worker:f,controller:r,onClose:()=>u(null)},f.id),x&&e.jsx(Wl,{detail:x,controller:r,onClose:()=>w(null)},x.job_id),y&&e.jsx(Bl,{confirmation:y,onClose:()=>N(null)})]})}const ec=`:root {\r
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
`,nc=`.permissions-page .permissions-grid {\r
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
`,rc=`/* 页面样式只作用于产能主区及产能对话框，不覆盖共享侧栏。 */\r
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
`,tc=`@scope (.admin-page) {
${ec.replace(/:root\b/g,":scope").replace(/^body \{/m,":scope {").replace(/body\.admin-page\b/g,":scope").replace(/\.admin-page\b/g,":scope")}
${nc.replace(/\.permissions-page\b/g,":scope.permissions-page")}
${rc}
}`;function on({page:n,children:r}){const t=Mt();return d.useLayoutEffect(()=>{const s=document.body;return s.dataset.choukaPage=n,s.dataset.workspace=n,()=>{s.dataset.choukaPage===n&&delete s.dataset.choukaPage,s.dataset.workspace===n&&delete s.dataset.workspace}},[n]),d.useEffect(()=>{let s=!0;return t.auth.me().then(()=>{if(!s)return;const a=document.getElementById("account");a&&!a.childElementCount&&t.auth.mountAccount(a);for(const i of document.querySelectorAll("#workspace-nav a"))new URL(i.href).pathname===location.pathname?i.setAttribute("aria-current","page"):i.removeAttribute("aria-current")}).catch(()=>{}),()=>{s=!1}},[t,n]),e.jsxs(e.Fragment,{children:[e.jsx("style",{children:tc}),e.jsx(xs,{page:n,workspace:!0,children:r})]})}function cc(){return e.jsx(on,{page:"controller",children:n=>e.jsx(zi,{...n})})}function dc(){return e.jsx(on,{page:"permissions",children:n=>e.jsx(ro,{...n})})}function pc(){return e.jsx(on,{page:"skills",children:n=>e.jsx(Io,{...n})})}function uc(){return e.jsx(on,{page:"costs",children:n=>e.jsx(rl,{...n})})}function mc(){return e.jsx(on,{page:"capacity",children:n=>e.jsx(Ql,{...n})})}export{mc as CapacityWorkspace,cc as ControllerWorkspace,uc as CostsWorkspace,dc as PermissionsWorkspace,pc as SkillsWorkspace};
