import{HttpClient as ea,reactExports as p,errorMessage as de,jsxRuntimeExports as e,ApiError as es}from"./http-CceZLADw.js";import{createSessionService as na,userSchema as ta,accountProfile as sa,LoadingRequest as aa,dinghaiProfileSchema as ia,jsonSchema as ue,useWorkspaceRuntime as ra}from"./main-BA8do1u8.js";import{object as F,number as Y,boolean as ie,_enum as Pe,strictObject as ot,string as I,literal as ve,looseObject as ce,array as B,unknown as ns,union as De,ipv4 as la,record as jn,uuid as oa,discriminatedUnion as ca,NEVER as da,_null as ts,date as pa}from"./monitor-alerts-1i8z99sD.js";import{reactDomExports as ua,skillIdSchema as ma,publishedSkillSchema as An,skillMetadataSchema as ha,skillReferencePathSchema as xa}from"./skills-DzICsEQr.js";import{createTeamService as fa}from"./teams-DHabqYx1.js";const ga=F({maintenance_active:ie().optional(),comfy_online:ie().optional(),sandbox:ie().optional()}),ba=F({online_users:Y().finite().nonnegative()}),ja=F({user:ta});function va({fetcher:n=window.fetch.bind(window),origin:t=window.location.origin,onExpired:s,onSandbox:a,onDenied:i=()=>{}}){let r=!1;const l=async(v,h)=>{const g=await n(v,h);return r||(g.headers.get("X-H3Card-Sandbox")==="local-copy"&&a(),g.status===403&&i()),g},c=new ea(l,t,()=>{r||s()});let u,d;const m=new Set;return{http:c,session:na(c),health(){if(u)return u;const v=new AbortController;m.add(v);const h=window.setTimeout(()=>v.abort(),4e3);return u=c.read("/api/health",ga,{cache:"no-store",signal:v.signal}).then(g=>(!r&&g.sandbox===!0&&a(),g)).finally(()=>{window.clearTimeout(h),m.delete(v),u=void 0}),u},presence(){return d??=c.json("/api/auth/presence","POST").then(v=>ba.parse(v)).finally(()=>{d=void 0}),d},async savePhone(v){const h=v.trim();if(!/^1[3-9][0-9]{9}$/.test(h))throw new Error("请输入有效的 11 位中国大陆手机号");const g=ja.parse(await c.json("/api/auth/phone","POST",{phone:h})).user;if(!g.phone)throw new Error("手机号尚未保存，请重试");return g},async changePassword(v,h,g){if(h.length<8)throw new Error("新密码至少需要 8 位");if(h!==g)throw new Error("两次输入的新密码不一致");await c.json("/api/auth/password","POST",{current_password:v,new_password:h})},dispose(){r=!0,m.forEach(v=>v.abort()),m.clear(),c.invalidate()}}}function ya(n,t){return n.local_login_enabled!==!1&&!t&&n.phone===""}function zt(n){return n==="admin"?null:n==="monitor"?"/monitor":"/"}function wn(n){return n.maintenance_active!==!0?"clear":n.comfy_online===!0?"partial":"blocked"}function _a(n){const[t,s]=p.useState(null),[a,i]=p.useState(!1),[r,l]=p.useState(""),[c,u]=p.useState(0);p.useEffect(()=>{let h=!1,g=!1,y=()=>{};const x=()=>document.hidden?new Promise(k=>{const z=()=>{document.hidden&&!h||(document.removeEventListener("visibilitychange",z),k())};document.addEventListener("visibilitychange",z),y=()=>{document.removeEventListener("visibilitychange",z),k()}}):Promise.resolve(),S=()=>{h||(h=!0,f.dispose(),s(null),l("登录已失效，请重新登录"),n("/login"))},w=k=>{const z=zt(k.role);return z?(h=!0,f.dispose(),s(null),n(z),!1):!0},f=va({onExpired:S,onSandbox:()=>{h||i(!0)},onDenied:()=>{h||g||(g=!0,f.session.me().then(k=>{!h&&w(k.user)&&s(z=>z&&{...z,user:k.user,localTest:k.local_test===!0})}).catch(()=>{}).finally(()=>{g=!1}))}});return s(null),l(""),i(!1),(async()=>{try{const k=await f.session.me();if(h||!w(k.user)||(await x(),h))return;const z=await f.health().catch(()=>({}));h||s({user:k.user,localTest:k.local_test===!0,services:f,initialHealth:z})}catch(k){h||l(de(k))}})(),()=>{h=!0,y(),f.dispose()}},[c,n]);const d=p.useCallback(()=>u(h=>h+1),[]),m=p.useCallback(h=>{const g=zt(h.role);g?(t?.services.dispose(),s(null),n(g)):s(y=>y&&{...y,user:h})},[t,n]),v=p.useCallback(()=>{t?.services.dispose(),s(null),l("登录已失效，请重新登录"),n("/login")},[t,n]);return{session:t,sandbox:a,error:r,retry:d,updateUser:m,expire:v}}function wa(n,t,s=!0){const[a,i]=p.useState(null),[r,l]=p.useState(()=>wn(t)),[c,u]=p.useState(()=>wn(t)!=="clear");return p.useEffect(()=>{if(!s)return;let d=!0,m=wn(t),v;const h=()=>{v=window.setTimeout(()=>{d&&u(!1)},5e3)};m==="partial"&&h();const g=()=>{document.hidden||n.presence().then(f=>{d&&i(f.online_users)}).catch(()=>{})},y=()=>{document.hidden||n.health().then(f=>{if(!d)return;const k=wn(f);k!==m&&(m=k,window.clearTimeout(v),l(k),u(k!=="clear"),k==="partial"&&h())}).catch(()=>{})};g();const x=window.setInterval(g,3e4),S=window.setInterval(y,5e3),w=()=>{document.hidden||(g(),y())};return document.addEventListener("visibilitychange",w),()=>{d=!1,window.clearTimeout(v),window.clearInterval(x),window.clearInterval(S),document.removeEventListener("visibilitychange",w)}},[n,t,s]),{online:a,maintenance:r,maintenanceVisible:c}}const ka={dashboard:"M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1",costs:"M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2M14 11h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-2.5M12 17v1m0 -8v1",capacity:"M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14M4 20h14",permissions:"M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0M8 11v-4a4 4 0 1 1 8 0v4",skills:"M12 6a8 8 0 0 0 -8 -2v15a8 8 0 0 1 8 2m0 -15a8 8 0 0 1 8 -2v15a8 8 0 0 0 -8 2m0 -15v15",teams:"M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0 -3 -3.85",refresh:"M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4",chevron:"M9 6l6 6l-6 6",external:"M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6M11 13l9 -9M15 4h5v5",logout:"M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2M9 12h12l-3 -3M18 15l3 -3",check:"M5 12l4 4l10 -10",info:"M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0 -18M12 11v6M12 7h.01",alert:"M12 9v4M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0M12 16h.01"};function Tn({name:n,className:t="",...s}){return e.jsx("svg",{className:`icon ${t}`,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.7,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",...s,children:e.jsx("path",{d:ka[n]})})}const Na="_application_gguf9_1",$a="_workspace_gguf9_12",Sa="_sandbox_gguf9_15",Ca="_navigation_gguf9_18",za="_accountMenu_gguf9_225",Ea="_infoRow_gguf9_281",Pa="_dialog_gguf9_295",Ma="_maintenance_gguf9_361",Ia="_notifications_gguf9_409",Ta="_notificationItem_gguf9_441",qa="_notificationHeading_gguf9_466",Da="_notificationIcon_gguf9_477",Aa="_notificationMessage_gguf9_495",Ra="_notificationLabel_gguf9_504",Ne={application:Na,workspace:$a,sandbox:Sa,navigation:Ca,accountMenu:za,infoRow:Ea,dialog:Pa,maintenance:Ma,notifications:Ia,notificationItem:Ta,notificationHeading:qa,notificationIcon:Da,notificationMessage:Aa,notificationLabel:Ra},La={error:"alert",warning:"alert",success:"check",status:"info"},Fa={error:"错误",warning:"警告",success:"成功",status:"提示"},ss=p.createContext({notify:()=>{},registerModal:()=>()=>{}}),as=()=>p.useContext(ss);function Oa({children:n}){const[t,s]=p.useState([]),[a,i]=p.useState([]),r=p.useCallback(u=>(i(d=>[...d,u]),()=>i(d=>d.filter(m=>m!==u))),[]),l=p.useCallback(u=>{const d=typeof u=="string"?{message:u,tone:"status"}:u instanceof Error?{message:u.message,tone:"error"}:{message:u.message,tone:u.tone??"status"};s(m=>m.some(v=>v.message===d.message&&v.tone===d.tone)?m:[...m,d])},[]),c=a.at(-1)??document.body;return e.jsxs(ss.Provider,{value:{notify:l,registerModal:r},children:[n,t.length>0&&ua.createPortal(e.jsx(Ua,{notices:t,dismiss:u=>s(d=>d.filter(m=>m!==u)),clear:()=>s([])}),c)]})}function Ua({notices:n,dismiss:t,clear:s}){const a=p.useRef(null);p.useEffect(()=>{const l=a.current;if(l?.isConnected)return l.showPopover?.(),()=>{l.isConnected&&l.hidePopover?.()}},[]);const i=l=>{const c=a.current?.contains(document.activeElement),u=a.current?.parentElement;l(),c&&queueMicrotask(()=>{(a.current?.querySelector("button")??u?.querySelector("[data-operation-status],button")??document.querySelector("main"))?.focus({preventScroll:!0})})},r=["error","warning","success","status"].find(l=>n.some(c=>c.tone===l))??"status";return e.jsxs("section",{id:"admin-notifications","data-tone":r,ref:a,popover:"manual",className:Ne.notifications,"aria-label":"操作通知",children:[e.jsxs("div",{className:Ne.notificationHeading,children:[e.jsx(Tn,{name:La[r],className:Ne.notificationIcon}),e.jsx("strong",{children:"操作通知"}),e.jsx("button",{type:"button","aria-label":"关闭全部通知",onClick:()=>i(s),children:"全部关闭"})]}),n.map(l=>e.jsxs("div",{className:Ne.notificationItem,"data-tone":l.tone,children:[e.jsxs("p",{className:Ne.notificationMessage,role:l.tone==="error"?"alert":"status","aria-atomic":"true",children:[e.jsx("span",{className:Ne.notificationLabel,children:Fa[l.tone]}),l.message]}),e.jsx("button",{type:"button","aria-label":`关闭通知：${l.message}`,onClick:()=>i(()=>t(l)),children:"×"})]},`${l.tone}:${l.message}`))]})}function xe({title:n,children:t,onClose:s,onSubmit:a,submitLabel:i="确认",submitDisabled:r=!1,errorFocusRef:l,className:c="",showFooter:u=!0,dismissible:d=!0,closeLabel:m,id:v}){const h=p.useId(),g=p.useRef(null),y=p.useRef(null),x=p.useRef(!1),S=p.useRef(!1),w=p.useRef(!1),[f,k]=p.useState(!1),[z,R]=p.useState(""),[E]=p.useState(()=>{const b=document.activeElement instanceof HTMLElement?document.activeElement:null;return{element:b,key:b?.dataset.focusKey}}),{registerModal:N}=as();p.useLayoutEffect(()=>{const b=g.current;if(!b)return;S.current=!0;const C=E.element,$=E.key;b.showModal();const P=N(b);return document.body.classList.add("modal-open"),()=>{S.current=!1,b.querySelectorAll('input[type="password"]').forEach(Z=>{Z.value=""}),b.open&&b.close(),P();const q=()=>{if(document.querySelector("dialog[open]"))return;document.body.classList.remove("modal-open");const Z=$?[...document.querySelectorAll("[data-focus-key]")].find(D=>D.dataset.focusKey===$):null,G=document.querySelector("main");G&&!G.hasAttribute("tabindex")&&(G.tabIndex=-1);const K=D=>D?.isConnected&&(D.tabIndex>=0||D.hasAttribute("tabindex")||D.isContentEditable)&&!D.closest("[inert],[hidden]")&&!D.matches(':disabled,input[type="hidden"]');(K(C)?C:K(Z)?Z:G)?.focus({preventScroll:!0})};q(),queueMicrotask(q)}},[N,E]),p.useLayoutEffect(()=>{if(z){const b=l?.current??y.current;b?.focus({preventScroll:!0}),b?.scrollIntoView({block:"nearest"})}else f&&y.current?.focus({preventScroll:!0})},[f,z,l]);const A=()=>{x.current||w.current||(w.current=!0,g.current?.querySelectorAll('input[type="password"]').forEach(b=>{b.value=""}),g.current?.open&&g.current.close(),s())},_=b=>{x.current&&(b.preventDefault(),b.stopPropagation())};return e.jsx("dialog",{id:v,ref:g,className:`f-operation-modal admin-dialog ${Ne.dialog} ${c}`,"aria-labelledby":h,tabIndex:-1,onCancel:b=>{b.preventDefault(),d&&A()},onClose:b=>{const C=b.currentTarget;if(!(!S.current||w.current||C.open)){if(x.current||!d){C.showModal(),x.current&&y.current?.focus({preventScroll:!0});return}A()}},onClick:b=>{if(b.target!==b.currentTarget||!d)return;const C=b.currentTarget.getBoundingClientRect();(b.clientX<C.left||b.clientX>C.right||b.clientY<C.top||b.clientY>C.bottom)&&A()},onKeyDown:b=>{if(b.stopPropagation(),b.key!=="Tab")return;const C=[...b.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(q=>!q.closest("[inert]")&&!q.hidden).sort((q,Z)=>q.compareDocumentPosition(Z)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1),$=C[0],P=C.at(-1);if(!$||!P){b.preventDefault(),y.current?.focus();return}b.shiftKey&&(document.activeElement===$||!C.includes(document.activeElement instanceof HTMLElement?document.activeElement:$))?(b.preventDefault(),P.focus()):!b.shiftKey&&(document.activeElement===P||!C.includes(document.activeElement instanceof HTMLElement?document.activeElement:P))&&(b.preventDefault(),$.focus())},children:e.jsxs("form",{"aria-busy":f||void 0,"data-busy":f?"true":void 0,onSubmit:async b=>{b.preventDefault();const C=b.currentTarget;if(!(x.current||r||!a||!C.reportValidity())){x.current=!0,k(!0),R("");try{await a(C),S.current&&(x.current=!1,A())}catch($){S.current&&R(`${de($)}；输入已保留，可重试。`)}finally{x.current=!1,S.current&&k(!1)}}},children:[e.jsxs("header",{className:"f-dialog-head",children:[e.jsx("h2",{id:h,children:n}),d&&e.jsx("button",{type:"button",className:"close-button","data-cancel":"","aria-label":"关闭弹窗",disabled:f,onClick:A,children:"×"})]}),e.jsxs("div",{className:"f-dialog-body",children:[e.jsx("div",{"data-dialog-content":"",inert:f,onClickCapture:_,onKeyDownCapture:_,onInputCapture:_,onChangeCapture:_,children:t}),e.jsx("p",{ref:y,className:`f-status ${z?"danger":""}`,role:z?"alert":"status",tabIndex:-1,"data-operation-status":"",children:z||(f?"正在提交…":"")})]}),u&&e.jsxs("footer",{className:"f-dialog-foot",children:[e.jsx("button",{type:"button","data-cancel":"",disabled:f,onClick:A,children:m??(a?"取消":"知道了")}),a&&e.jsx("button",{type:"submit",className:"primary",disabled:f||r,children:f?"正在提交…":i})]})]})})}function Wa({user:n,localTest:t,services:s,expire:a}){const[i,r]=p.useState(!1),[l,c]=p.useState(null),[u,d]=p.useState({}),[m,v]=p.useState(!1),h=p.useRef(!1),g=p.useRef(null),y=p.useRef(null),x=sa(n),S=x.display_name?.trim()||x.username||"定海用户",w=()=>{r(!1),g.current?.focus({preventScroll:!0})};return p.useLayoutEffect(()=>{const f=y.current;if(f)if(i){const k=g.current?.getBoundingClientRect();k&&d({left:Math.max(8,Math.min(k.left,window.innerWidth-Math.min(260,window.innerWidth-16)-8)),bottom:Math.max(8,window.innerHeight-k.top+8),maxHeight:Math.max(44,k.top-16)}),f.showPopover?.(),f.querySelector("button")?.focus()}else f.hidePopover?.()},[i]),p.useEffect(()=>{if(!i)return;const f=()=>r(!1),k=z=>{z.target instanceof Node&&!y.current?.contains(z.target)&&!g.current?.contains(z.target)&&f()};return window.addEventListener("resize",f),document.addEventListener("pointerdown",k),()=>{window.removeEventListener("resize",f),document.removeEventListener("pointerdown",k)}},[i]),e.jsx("div",{id:"account",className:"account-bar",children:t?e.jsx("span",{className:"chip",children:"本地测试 · 免登录"}):e.jsxs(e.Fragment,{children:[e.jsxs("button",{ref:g,className:"account-trigger",type:"button","aria-label":`用户菜单：${S}`,"aria-haspopup":"menu","aria-expanded":i,"aria-controls":"account-menu","data-focus-key":"admin-account",onClick:()=>r(f=>!f),onKeyDown:f=>{(f.key==="ArrowDown"||f.key==="ArrowUp")&&(f.preventDefault(),r(!0))},children:[e.jsx("span",{className:"account-avatar","aria-hidden":"true",children:Array.from(S)[0]?.toUpperCase()||"?"}),e.jsx("span",{className:"account-name",children:S})]}),e.jsxs("div",{ref:y,id:"account-menu",className:`account-menu ${Ne.accountMenu}`,role:"menu","aria-label":"账号菜单",popover:"auto",hidden:!i,style:u,onToggle:f=>{f.newState==="closed"&&r(!1)},onKeyDown:f=>{if(f.stopPropagation(),f.key==="Escape"){f.preventDefault(),w();return}if(f.key==="Tab"){r(!1);return}if(!["ArrowDown","ArrowUp","Home","End"].includes(f.key))return;f.preventDefault();const k=[...f.currentTarget.querySelectorAll('[role="menuitem"]:not(:disabled)')],z=k.findIndex(E=>E===document.activeElement),R=f.key==="Home"?0:f.key==="End"?k.length-1:(z+(f.key==="ArrowDown"?1:-1)+k.length)%k.length;k[R]?.focus()},children:[e.jsxs("div",{className:"account-menu-heading",role:"presentation",children:[e.jsx("b",{children:S}),e.jsxs("small",{children:[x.username||"未填写"," · 管理员"]})]}),e.jsx("button",{type:"button",role:"menuitem",className:"account-action",onClick:()=>{w(),c("info")},children:"用户信息"}),n.local_login_enabled===!1?e.jsx("p",{className:"auth-note",children:"密码由定海管理"}):e.jsx("button",{type:"button",role:"menuitem",className:"account-action",onClick:()=>{w(),c("password")},children:"修改密码"}),e.jsxs("button",{type:"button",role:"menuitem",className:"account-action danger",disabled:m,onClick:async()=>{if(!h.current){h.current=!0,v(!0),w();try{await s.session.logout()}catch{}finally{a()}}},children:[e.jsx(Tn,{name:"logout"}),"退出登录"]})]}),l==="info"&&e.jsx(xe,{title:"用户信息",className:"auth-dialog",onClose:()=>c(null),closeLabel:"关闭",children:e.jsx("dl",{className:"account-info",children:[["姓名 / 花名",x.display_name?.trim()||"未填写"],["用户名",x.username||"未填写"],["手机号",x.phone||"未填写"],["角色","管理员"],["用户 ID",x.id]].map(([f,k])=>e.jsxs("div",{className:Ne.infoRow,children:[e.jsx("dt",{children:f}),e.jsx("dd",{children:k})]},f))})}),l==="password"&&n.local_login_enabled!==!1&&e.jsxs(xe,{title:"修改密码",className:"auth-dialog",onClose:()=>c(null),submitLabel:"保存",onSubmit:async f=>{const k=new FormData(f);await s.changePassword(String(k.get("current_password")??""),String(k.get("new_password")??""),String(k.get("confirm_password")??"")),a()},children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"当前密码"}),e.jsx("input",{name:"current_password",type:"password",autoComplete:"current-password",autoFocus:!0,required:!0})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"新密码（至少 8 位）"}),e.jsx("input",{name:"new_password",type:"password",autoComplete:"new-password",required:!0,minLength:8})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"再输一次新密码"}),e.jsx("input",{name:"confirm_password",type:"password",autoComplete:"new-password",required:!0,minLength:8})]}),e.jsx("p",{className:"auth-note",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。保存后需要重新登录。"})]})]})})}const Ba=n=>window.location.replace(n);function Va({page:n,children:t,workspace:s=!1}){return e.jsx(Ha,{page:n,workspace:s,children:t})}function Ha({page:n,children:t,workspace:s}){const{session:a,sandbox:i,error:r,retry:l,updateUser:c,expire:u}=_a(Ba);return!a&&!r&&s?e.jsx(aa,{stage:"正在准备工作区"}):a?e.jsx(Oa,{children:e.jsx(Ja,{page:n,workspace:s,user:a.user,localTest:a.localTest,services:a.services,initialHealth:a.initialHealth,sandbox:i,updateUser:c,expire:u,children:t})}):e.jsx("main",{id:"main",tabIndex:-1,children:r?e.jsxs("section",{role:"alert",children:[e.jsx("p",{children:r}),e.jsx("a",{href:"/login",children:"前往登录"}),e.jsx("button",{type:"button",onClick:l,children:"重试"})]}):e.jsx("p",{role:"status",children:"正在验证管理员会话…"})})}const Ga=[{label:"工作区",links:[{key:"canvas",label:"画布",href:"/",icon:"dashboard"},{key:"director",label:"导演工作台",href:"/director",icon:"external"}]},{label:"管理",links:[{key:"teams",label:"项目组",href:"/teams",icon:"teams"},{key:"controller",label:"运行面板",href:"/controller",icon:"dashboard"},{key:"permissions",label:"账号与权限",href:"/admin/permissions",icon:"permissions"},{key:"skills",label:"Skill 管理",href:"/skills",icon:"skills"}]},{label:"统计",links:[{key:"costs",label:"费用评估",href:"/controller/costs",icon:"costs"},{key:"capacity",label:"产能统计",href:"/controller/capacity",icon:"capacity"}]}];function Ja({page:n,workspace:t,user:s,localTest:a,services:i,initialHealth:r,sandbox:l,children:c,updateUser:u,expire:d}){const{notify:m}=as(),{online:v,maintenance:h,maintenanceVisible:g}=wa(i,r,!t),y=p.useRef(!1),x=p.useRef(!1);p.useEffect(()=>{if(t)return;const f=document.body,k=f.dataset.workspace,z=f.classList.contains("admin-page");return f.classList.add("admin-page"),f.dataset.workspace=n,()=>{z||f.classList.remove("admin-page"),k===void 0?delete f.dataset.workspace:f.dataset.workspace=k}},[n,t]),p.useEffect(()=>{const f=document.body.dataset.adminSandbox;return l&&(document.body.dataset.adminSandbox="local-copy"),()=>{f===void 0?delete document.body.dataset.adminSandbox:document.body.dataset.adminSandbox=f}},[l]);const S=ya(s,a);p.useEffect(()=>{S&&(x.current=!1)},[S]);const w=h==="blocked"?"系统正在维护更新，当前暂无可用执行节点，请稍后再使用。":"部分节点正在维护更新，其他可用节点仍可正常使用。";return e.jsxs("div",{className:`admin-page ${n==="permissions"?"permissions-page":""} ${Ne.application} ${t?Ne.workspace:""}`,children:[e.jsx("a",{className:"skip-link admin-skip",href:n==="capacity"?"#main-content":"#main",children:"跳到主内容"}),!t&&e.jsxs("aside",{id:"workspace-nav","data-admin-sidebar":"","aria-label":"主导航",className:Ne.navigation,children:[e.jsxs("a",{className:"workspace-brand",href:"/","aria-label":"Chouka 创作空间",children:[e.jsx("img",{src:"/icon.png",alt:""}),e.jsxs("span",{children:["Chouka",e.jsx("small",{children:"创作空间"})]})]}),e.jsx("nav",{className:"workspace-links","aria-label":"工作区导航",children:Ga.map(f=>e.jsxs("div",{className:"workspace-nav-group",role:"group","aria-label":f.label,children:[e.jsx("div",{className:"workspace-nav-label","aria-hidden":"true",children:f.label}),f.links.map(k=>e.jsxs("a",{className:"workspace-link",href:k.href,title:k.label,"aria-label":k.label,"aria-current":n===k.key?"page":void 0,children:[e.jsx(Tn,{name:k.icon}),e.jsx("span",{children:k.label})]},k.key))]},f.label))}),e.jsxs("div",{className:"workspace-footer",children:[e.jsxs("div",{className:"workspace-presence",title:"Chouka 系统在线用户（近 90 秒活跃，按账号去重）","aria-live":"polite",children:[e.jsx("i",{"aria-hidden":"true"}),e.jsxs("span",{children:[e.jsx("b",{children:v??"--"})," 人在线"]})]}),e.jsx(Wa,{user:s,localTest:a,services:i,expire:d})]})]}),!t&&g&&e.jsxs("div",{id:"maintenance-banner",className:Ne.maintenance,role:"status","aria-live":"polite","aria-atomic":"true","aria-label":"系统维护通知",children:[e.jsx("span",{className:"maintenance-banner-icon",children:e.jsx(Tn,{name:"alert"})}),e.jsx("div",{className:"maintenance-banner-ticker",children:e.jsx("div",{className:"maintenance-banner-track",children:[!1,!0].map(f=>e.jsx("span",{className:"maintenance-banner-message","aria-hidden":f||void 0,children:w},String(f)))})})]}),l&&e.jsx("div",{id:"sandbox-note",className:`notice-box admin-sandbox ${Ne.sandbox}`,role:"note",children:"本地隔离数据副本：本页用于本地验收，展示复制的业务数据，不代表正式服务的实时状态。"}),S?e.jsx("main",{id:n==="capacity"?"main-content":"main",tabIndex:-1,children:e.jsx("p",{role:"status",children:"请补充手机号后继续使用。"})}):c({http:i.http,user:s,sandbox:l,notify:m}),S&&e.jsx(xe,{id:"phone-dialog",title:"补充手机号",className:"auth-dialog phone-dialog",dismissible:!1,closeLabel:"退出登录",submitLabel:"保存并继续",onClose:()=>{x.current||y.current||(y.current=!0,i.session.logout().catch(()=>{}).finally(d))},onSubmit:async f=>{const k=await i.savePhone(String(new FormData(f).get("phone")??""));x.current=!0,u(k)},children:e.jsxs(p.Fragment,{children:[e.jsx("p",{id:"phone-note",className:"auth-note",children:"当前账号尚未填写手机号，请补充后继续使用。手机号仅本人和管理员可见，不用于短信验证或登录。"}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"手机号"}),e.jsx("input",{name:"phone",type:"tel",autoFocus:!0,inputMode:"numeric",autoComplete:"tel-national",required:!0,maxLength:11,pattern:"1[3-9][0-9]{9}",placeholder:"请输入 11 位中国大陆手机号","aria-describedby":"phone-note"})]})]})})]})}function Za(n,t=!0){const s=p.useMemo(()=>fa(n),[n]),[a,i]=p.useState(0),[r,l]=p.useState({teams:null,loading:!0,error:""});return p.useEffect(()=>{if(!t)return;const u=new AbortController;return s.list(u.signal).then(({teams:d})=>{u.signal.aborted||l({teams:d,loading:!1,error:""})}).catch(d=>{u.signal.aborted||l({teams:null,loading:!1,error:`项目组加载失败：${de(d)}`})}),()=>u.abort()},[s,a,t]),{...r,retry:()=>{l({teams:null,loading:!0,error:""}),i(u=>u+1)}}}const le=De([Y().finite(),I().refine(n=>n===""||Number.isFinite(Number(n)))]).nullish(),Q=I().nullish(),kn=De([ie(),ve(0),ve(1)]).nullish(),Ya=ce({used_bytes:le,total_bytes:le}),Ka=ce({index:le,name:Q,utilization_percent:le,memory_used_bytes:le,memory_total_bytes:le,temperature_c:le}),Xa=ce({remote_commands:ce({version:Y(),interpreters:B(I())}).optional(),agent_version:De([Y(),I()]).nullish(),supports_code_restart:ie().nullish(),supports_service_restart:ie().nullish(),supports_host_reboot:ie().nullish(),node_classes:B(I()).nullish(),telemetry:ce({hostname:Q,ip_address:I().trim().transform(n=>la().safeParse(n).success?n:null).nullish(),collected_at:le,gpus:B(Ka).nullish(),memory:Ya.nullish()}).nullish(),devices:B(ce({index:le,name:Q,device_name:Q,type:Q,vram_total:le,vram_free:le})).nullish(),system:ce({ram_total:le,ram_free:le,comfyui_version:Q,comfyui_build_version:Q}).nullish()}),Et=ce({name:Q,node_class:Q,input:Q}),Qa=ce({status:Q,model_inventory_status:Q,missing_node_classes:B(I()).nullish(),extra_node_classes:B(I()).nullish(),missing_models:B(Et).nullish(),extra_models:B(Et).nullish()}),ei=ce({status:Q,worker_id:Q,agent_version:De([Y(),I()]).nullish()}),Rn=ot({start:I().regex(/^([01]\d|2[0-3]):[0-5]\d$/),end:I().regex(/^([01]\d|2[0-3]):[0-5]\d$/),time_zone:I().min(1).refine(n=>{if(!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/.test(n))return!1;try{return new Intl.DateTimeFormat("en",{timeZone:n}),!0}catch{return!1}})}).refine(n=>n.start!==n.end,{message:"每日开始和结束时间不能相同"}),ni=ce({id:I(),name:Q,state:Q,enabled:kn,access_team_id:I().min(1).nullable().optional(),access_expires_at:Y().finite().nullable().optional(),access_daily_window:Rn.nullish(),comfy_online:kn,busy:kn,current_job_id:Q,last_seen:le,is_primary_node:kn,sync_status:Q,sync_action:Q,sync_message:Q,capability_comparison:Qa.nullish(),capabilities:Xa.nullish()}),ti=ot({team_id:I().trim().min(1).nullable(),expires_at:Y().finite().nullable(),daily_window:Rn.nullish()}).refine(n=>n.team_id!==null||n.expires_at===null&&!n.daily_window,{message:"公共设备不能设置专用时段或结束时间"}),si=F({ok:ve(!0),worker_id:I().min(1),access_team_id:I().min(1).nullable(),access_expires_at:Y().finite().nullable(),access_daily_window:Rn.nullish()}).refine(n=>n.access_team_id!==null||n.access_expires_at===null&&!n.access_daily_window),ct=ce({id:I(),status:Q,history_only:ie().optional(),permission:Q,modelName:Q,nodeName:Q,card:Q,name:Q,cardName:Q,project:Q,projectName:Q,progress:le,step:Q,created:le,started:le,ended:le,worker_id:Q,error:Q,capability:Q,submitter_display_name:Q,submitter_username:Q}),ai=ce({ok:ie().nullish(),mode:Q,online_workers:le,workers:le,server_time:le,started_at:le,comfy_online:ie().nullish(),jobs:le,capabilities:le,sandbox:ie().nullish(),llm:ce({ok:ie().nullish(),model:Q}).nullish()}),ii=ce({running_count:le,queued_count:le}),Pt=ce({workers:B(ni),comparison_baseline:ei.nullish()}),ri=ce({jobs:B(ct)}),li=Pe(["all","queued","running","done","error","canceled"]),oi=ce({jobs:B(ct),next_cursor:I().min(1).nullable(),has_more:ie(),total:Y().int().nonnegative()}).refine(n=>n.has_more===(n.next_cursor!==null),{message:"任务历史分页游标不完整"}),ci=ce({projects:B(ce({id:I(),name:Q}))}),di=ce({worker_count:le,primary_count:le,skipped_count:le}),pi=ce({ok:ve(!0),worker_id:I().min(1),request_id:I().min(1),action:ve("sync_files")}),ui=Pe(["restart_services","reboot_host"]),mi=ce({ok:ve(!0),worker_id:I().min(1),request_id:I().min(1),action:ui}),hi=ce({ok:ie().optional()}),Gn=De([Y().finite(),I().refine(n=>n!==""&&Number.isFinite(Number(n)))]).transform(Number),Mt=ns().transform(n=>(typeof n=="number"||typeof n=="string")&&n!==""&&Number.isFinite(Number(n))?Number(n):null),xi=ce({worker_id:Q,gpu_index:le,minutes:le,server_time:le,from:Gn,to:Gn,gap_seconds:Gn.pipe(Y().positive()),points:B(ce({at:Mt,temperature_c:Mt}))}).refine(n=>n.to>n.from,{message:"温度历史返回格式不完整"});function fi(n){return{async save(t,s,a,i){const r=ti.parse(s);i();const l=si.parse(await n.request(`/api/workers/${encodeURIComponent(t)}/access`,{method:"POST",signal:a,headers:{"Content-Type":"application/json"},body:JSON.stringify(r)}));if(l.worker_id!==t||l.access_team_id!==r.team_id||l.access_expires_at!==r.expires_at||JSON.stringify(l.access_daily_window??null)!==JSON.stringify(r.daily_window??null))throw new Error("使用范围响应与所选设备或配置不一致，请刷新核对");return l}}}function is(n,t){if(!n)return!0;const s=new Intl.DateTimeFormat("en-GB",{timeZone:n.time_zone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(t*1e3)),a=`${s.find(i=>i.type==="hour")?.value}:${s.find(i=>i.type==="minute")?.value}`;return n.start<n.end?a>=n.start&&a<n.end:a>=n.start||a<n.end}function dt(n,t){return!n.access_team_id||n.access_expires_at!=null&&n.access_expires_at<=t?{team_id:null,expires_at:null}:{team_id:n.access_team_id,expires_at:n.access_expires_at??null,...n.access_daily_window?{daily_window:n.access_daily_window}:{}}}function gi(n,t){const s=dt(n,t);return is(s.daily_window,t)?s:{team_id:null,expires_at:null}}function Jn(n,t){return n.team_id===t.team_id&&n.expires_at===t.expires_at&&JSON.stringify(n.daily_window??null)===JSON.stringify(t.daily_window??null)}function bi(n,t){const s=new Map;for(const a of n){const i=dt(a,t),r=JSON.stringify([i.team_id,i.expires_at,i.daily_window??null]),l=s.get(r);l?l.workers.push(a):s.set(r,{...i,workers:[a]})}return[...s.values()].sort((a,i)=>+(a.team_id===null)-+(i.team_id===null))}function rs(n){if(n===null)return"";const t=new Date(n*1e3);if(!Number.isFinite(t.getTime()))return"";const s=a=>String(a).padStart(2,"0");return`${t.getFullYear()}-${s(t.getMonth()+1)}-${s(t.getDate())}T${s(t.getHours())}:${s(t.getMinutes())}:${s(t.getSeconds())}`}function Zn(n,t,s,a,i,r){if(n==="public")return{value:{team_id:null,expires_at:null}};const l={};a?.some(d=>d.id===t)||(l.team="请选择有效的项目组");const c=s?new Date(s).getTime()/1e3:null,u=s.replace(/\.\d{1,3}$/,"");return c!==null&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(s)||!Number.isFinite(c)||rs(c)!==(u.length===16?`${u}:00`:u))?l.expiry="请输入有效的本地结束时间（不能是夏令时跳过的时间）":c!==null&&c<=i&&(l.expiry="结束时间必须晚于当前时间"),r&&!Rn.safeParse(r).success&&(l.window="请选择有效且不同的每日开始、结束时间，以及有效时区"),Object.keys(l).length?{errors:l}:{value:{team_id:t,expires_at:c,...r?{daily_window:r}:{}}}}const ji="_page_1vpgb_1",vi="_overview_1vpgb_1",yi="_accessOverview_1vpgb_54",_i="_accessSummary_1vpgb_65",wi="_accessTableWrap_1vpgb_81",ki="_accessTable_1vpgb_81",Ni="_accessCellLabel_1vpgb_122",$i="_selectionToolbar_1vpgb_164",Si="_selectAll_1vpgb_180",Ci="_workerSelection_1vpgb_181",zi="_workerGrid_1vpgb_214",Ei="_workerCard_1vpgb_222",Pi="_workerIdentityBlock_1vpgb_238",Mi="_workerHeader_1vpgb_253",Ii="_workerService_1vpgb_254",Ti="_syncMeta_1vpgb_255",qi="_workerName_1vpgb_264",Di="_workerState_1vpgb_276",Ai="_workerVersions_1vpgb_305",Ri="_resourceNote_1vpgb_306",Li="_telemetryNote_1vpgb_307",Fi="_sectionLabel_1vpgb_308",Oi="_syncMessage_1vpgb_310",Ui="_accessDialog_1vpgb_325",Wi="_accessTargets_1vpgb_339",Bi="_accessOutcomes_1vpgb_340",Vi="_accessMixed_1vpgb_359",Hi="_accessResults_1vpgb_364",Gi="_accessForm_1vpgb_389",Ji="_accessError_1vpgb_406",Zi="_workerAccess_1vpgb_409",Yi="_workerResources_1vpgb_414",Ki="_resourceRow_1vpgb_417",Xi="_resourceReadings_1vpgb_418",Qi="_resourceTitle_1vpgb_430",er="_resourceReading_1vpgb_418",nr="_resourceLabel_1vpgb_456",tr="_resourceBar_1vpgb_459",sr="_workerActivity_1vpgb_494",ar="_workerTask_1vpgb_503",ir="_workerSync_1vpgb_542",rr="_inventoryAction_1vpgb_550",lr="_inventoryLabel_1vpgb_551",or="_syncActionLabel_1vpgb_595",cr="_cardActions_1vpgb_606",dr="_historyControls_1vpgb_644",pr="_workerDialog_1vpgb_653",ur="_workerActions_1vpgb_656",mr="_capabilities_1vpgb_664",hr="_temperatureDialog_1vpgb_673",V={page:ji,overview:vi,accessOverview:yi,accessSummary:_i,accessTableWrap:wi,accessTable:ki,accessCellLabel:Ni,selectionToolbar:$i,selectAll:Si,workerSelection:Ci,workerGrid:zi,workerCard:Ei,workerIdentityBlock:Pi,workerHeader:Mi,workerService:Ii,syncMeta:Ti,workerName:qi,workerState:Di,workerVersions:Ai,resourceNote:Ri,telemetryNote:Li,sectionLabel:Fi,syncMessage:Oi,accessDialog:Ui,accessTargets:Wi,accessOutcomes:Bi,accessMixed:Vi,accessResults:Hi,accessForm:Gi,accessError:Ji,workerAccess:Zi,workerResources:Yi,resourceRow:Ki,resourceReadings:Xi,resourceTitle:Qi,resourceReading:er,resourceLabel:nr,resourceBar:tr,workerActivity:sr,workerTask:ar,workerSync:ir,inventoryAction:rr,inventoryLabel:lr,syncActionLabel:or,cardActions:cr,historyControls:dr,workerDialog:pr,workerActions:ur,capabilities:mr,temperatureDialog:hr};function xr({workers:n,now:t,teams:s,unavailable:a,onSave:i,onClose:r}){const[l]=p.useState(()=>{const j=n.map(ae=>dt(ae,t)),M=j[0]??{team_id:null,expires_at:null},O=j.some(ae=>!Jn(ae,M));return{access:M,mixed:O}}),[c,u]=p.useState(l.mixed?"":l.access.team_id?"team":"public"),[d,m]=p.useState(l.mixed?"":l.access.team_id??""),[v,h]=p.useState(()=>l.mixed?"":rs(l.access.expires_at)),[g,y]=p.useState(!l.mixed&&!!l.access.daily_window),[x,S]=p.useState(l.mixed?"":l.access.daily_window?.start??"09:00"),[w,f]=p.useState(l.mixed?"":l.access.daily_window?.end??"18:00"),[k]=p.useState(!l.mixed&&l.access.daily_window?.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone),z=g?{start:x,end:w,time_zone:k}:null,[R,E]=p.useState(null),[N,A]=p.useState({}),[_,b]=p.useState(!1),C=p.useId(),$=p.useRef(null),P=j=>{if(c!=="team"||s.loading||s.teams===null)return;const M=Zn(c,d,v,s.teams,t,z);A(O=>({...O,[j]:M.errors?.[j]}))},q=c==="team"&&(s.loading||s.teams===null||!s.teams.length),Z=d&&!s.teams?.some(j=>j.id===d),G=c?Zn(c,d,v,s.teams,t,z):null,K=R!==null&&!!G?.value&&Jn(G.value,R.value),D=R?K?`仅重试失败的 ${R.result.failed.length} 台设备`:`保存新配置到全部 ${n.length} 台设备`:"保存使用范围";return e.jsxs(xe,{title:"设备使用范围",className:V.accessDialog,onClose:r,submitLabel:D,errorFocusRef:$,submitDisabled:!!a||!c||q,onSubmit:async()=>{if(a)throw new Error(a);if(!c)throw new Error("请选择统一使用范围");if(c==="team"&&(s.loading||s.teams===null))throw new Error("请先成功加载项目组");const j=Zn(c,d,v,s.teams,t,z);if(b(!0),A(j.errors??{}),j.errors)throw new Error("请修正标注的使用范围配置");const M=R!==null&&Jn(j.value,R.value),O=M?R.result.failed.map(U=>U.worker_id):n.map(U=>U.id),ae=await i(O,j.value),se={succeeded:[...new Set([...M?R.result.succeeded:[],...ae.succeeded])],failed:ae.failed};if(E({value:j.value,result:se}),se.failed.length)throw new Error(`已成功保存 ${se.succeeded.length} 台，${se.failed.length} 台失败；成功设备不会回滚，保持相同配置时仅重试失败设备`)},children:[e.jsxs("p",{children:["已选 ",n.length," 台设备，统一设置使用范围："]}),e.jsx("ul",{className:V.accessTargets,"aria-label":"本次设置的设备",tabIndex:0,children:n.map(j=>e.jsxs("li",{children:[e.jsx("strong",{children:j.name||j.id}),e.jsxs("span",{children:["（",j.id,"）"]})]},j.id))}),e.jsx("div",{className:"notice-box",children:"项目组专用按所有成员授权，组外不可见、不可用；组内任务优先使用专用设备，再使用公共设备。管理员可见全部设备。已有任务不中断。同名或同一节点标识的其他注册也会同步设置。"}),e.jsx("p",{className:"muted small",children:"逐台保存，并非原子操作：遇到失败停止后续保存，已成功的设置不会撤销；配置不变时只重试失败或未提交设备。"}),l.mixed&&e.jsx("p",{className:V.accessMixed,children:"所选设备当前使用范围、每日时段或结束时间不一致，请选择统一使用范围；仅在保存时覆盖原配置。"}),a&&e.jsx("p",{role:"alert",className:"danger",children:a}),e.jsxs("div",{className:V.accessForm,children:[_&&(N.team||N.expiry||N.window)&&e.jsxs("div",{ref:$,tabIndex:-1,role:"alert",className:"danger","aria-label":"请修正使用范围配置",children:[e.jsx("p",{children:"请修正以下配置："}),N.team&&e.jsx("p",{children:e.jsx("a",{href:`#${C}-team`,onClick:j=>{j.preventDefault(),document.getElementById(`${C}-team`)?.focus()},children:N.team})}),N.window&&e.jsx("p",{children:e.jsx("a",{href:`#${C}-start`,onClick:j=>{j.preventDefault(),document.getElementById(`${C}-start`)?.focus()},children:N.window})}),N.expiry&&e.jsx("p",{children:e.jsx("a",{href:`#${C}-expiry`,onClick:j=>{j.preventDefault(),document.getElementById(`${C}-expiry`)?.focus()},children:N.expiry})})]}),R&&e.jsxs("div",{ref:_&&(N.team||N.expiry||N.window)?void 0:$,tabIndex:-1,role:"status","aria-live":"polite","aria-label":"设备使用范围保存结果",className:V.accessResults,children:[e.jsxs("p",{children:["上次保存结果：",R.result.succeeded.length," 台成功，",R.result.failed.length," ","台失败。"]}),e.jsx("ul",{className:V.accessOutcomes,"aria-label":"各设备保存结果",tabIndex:0,children:n.map(j=>{const M=R.result.failed.find(ae=>ae.worker_id===j.id),O=R.result.succeeded.includes(j.id);return e.jsxs("li",{"data-tone":M?"bad":O?"ok":void 0,children:[e.jsxs("strong",{children:[j.name||j.id,"（",j.id,"）"]}),e.jsx("span",{children:M?`失败：${M.error}`:O?"保存成功":"未提交"})]},j.id)})}),e.jsx("p",{children:K?"配置未变：再次保存仅重试失败设备，成功设备不重复提交。":"配置已更改：再次保存会向全部所选设备应用新配置，包括上次成功的设备。"})]}),e.jsx("label",{htmlFor:`${C}-scope`,children:"使用范围"}),e.jsxs("select",{id:`${C}-scope`,value:c,disabled:!!a,onChange:j=>{u(j.target.value),A({})},children:[l.mixed&&e.jsx("option",{value:"",disabled:!0,children:"请选择统一使用范围"}),e.jsx("option",{value:"public",children:"公共"}),e.jsx("option",{value:"team",children:"项目组专用"})]}),c==="team"&&e.jsxs(e.Fragment,{children:[e.jsx("label",{htmlFor:`${C}-team`,children:"授权项目组（所有成员）"}),e.jsxs("select",{id:`${C}-team`,value:d,disabled:!!a||s.loading||s.teams===null,"aria-invalid":!!N.team,"aria-describedby":N.team?`${C}-team-error`:void 0,onBlur:()=>P("team"),onChange:j=>{m(j.target.value),A(M=>({...M,team:void 0}))},children:[e.jsx("option",{value:"",children:"请选择项目组"}),Z&&e.jsxs("option",{value:d,disabled:!0,children:["项目组 ",d,"（未在当前列表中）"]}),s.teams?.map(j=>e.jsx("option",{value:j.id,children:j.name},j.id))]}),s.loading&&e.jsx("p",{role:"status",children:"正在加载项目组…"}),s.error&&e.jsxs("div",{role:"alert",className:"danger",children:[e.jsxs("p",{children:[s.error,"，不能据此判断没有项目组。"]}),e.jsx("button",{type:"button",disabled:!!a,onClick:s.retry,children:"重试加载项目组"})]}),!s.loading&&s.teams?.length===0&&e.jsx("p",{children:"暂无项目组，请先在项目组管理中创建。"}),e.jsx("p",{id:`${C}-team-error`,className:`danger ${V.accessError}`,children:N.team}),e.jsx("label",{htmlFor:`${C}-period`,children:"专用时段"}),e.jsxs("select",{id:`${C}-period`,value:g?"daily":"all",disabled:!!a,onChange:j=>{y(j.target.value==="daily"),A(M=>({...M,window:void 0}))},children:[e.jsx("option",{value:"all",children:"全天专用"}),e.jsx("option",{value:"daily",children:"每天固定时段"})]}),g&&e.jsxs(e.Fragment,{children:[e.jsx("label",{htmlFor:`${C}-start`,children:"每日开始时间"}),e.jsx("input",{id:`${C}-start`,type:"time",value:x,disabled:!!a,"aria-invalid":!!N.window,"aria-describedby":`${C}-window-help ${C}-window-error`,onBlur:()=>P("window"),onChange:j=>{S(j.target.value),A(M=>({...M,window:void 0}))}}),e.jsx("label",{htmlFor:`${C}-end`,children:"每日结束时间"}),e.jsx("input",{id:`${C}-end`,type:"time",value:w,disabled:!!a,"aria-invalid":!!N.window,"aria-describedby":`${C}-window-help ${C}-window-error`,onBlur:()=>P("window"),onChange:j=>{f(j.target.value),A(M=>({...M,window:void 0}))}}),e.jsxs("p",{id:`${C}-window-help`,className:"muted small",children:["时段时区：",k,"。每天重复，开始时专用、结束时恢复公共；结束早于开始表示跨午夜。已有任务不中断。"]}),e.jsx("p",{id:`${C}-window-error`,className:`danger ${V.accessError}`,children:N.window})]}),e.jsx("label",{htmlFor:`${C}-expiry`,children:"结束时间（可选，本地时间）"}),e.jsx("input",{id:`${C}-expiry`,type:"datetime-local",step:"1",value:v,disabled:!!a,"aria-invalid":!!N.expiry,"aria-describedby":`${C}-expiry-help${N.expiry?` ${C}-expiry-error`:""}`,onBlur:()=>P("expiry"),onChange:j=>{h(j.target.value),A(M=>({...M,expiry:void 0}))}}),e.jsxs("p",{id:`${C}-expiry-help`,className:"muted small",children:["当前时区：",Intl.DateTimeFormat().resolvedOptions().timeZone,"。到期后不再启用专用规则，自动恢复公共；不设置则持续按所选专用时段生效。"]}),e.jsx("p",{id:`${C}-expiry-error`,className:`danger ${V.accessError}`,children:N.expiry})]}),c==="public"&&e.jsx("p",{className:"muted small",children:"保存后解除项目组限制、每日时段和结束时间，恢复公共使用；已有任务不中断。"})]})]})}const pt=Pe(["pending","running","succeeded","failed","canceled","timed_out","unknown","skipped","expired"]),ut=Pe(["python","powershell"]),ls=ot({request_key:oa(),all_online:ie(),worker_ids:B(I().min(1)),interpreter:ut,script:I().refine(n=>n.trim().length>0,"请输入脚本"),cwd:I(),timeout_seconds:Y().int().min(5).max(3600)}).refine(n=>n.all_online?n.worker_ids.length===0:n.worker_ids.length>0,{message:"请选择至少一台执行端；全部在线模式不能同时指定设备"});function os(){if(typeof crypto.randomUUID=="function")return crypto.randomUUID();const n=crypto.getRandomValues(new Uint8Array(16)),t=Array.from(n,(s,a)=>(a===6?s&15|64:a===8?s&63|128:s).toString(16).padStart(2,"0")).join("");return`${t.slice(0,8)}-${t.slice(8,12)}-${t.slice(12,16)}-${t.slice(16,20)}-${t.slice(20)}`}const zn=Y().finite(),cs=F({id:I().min(1),created_by:I(),created_at:zn,interpreter:ut,timeout_seconds:Y().int().min(5).max(3600),counts:jn(pt,Y().int().nonnegative().default(0)),target_count:Y().int().nonnegative()}),fr=F({id:I().min(1),batch_id:I().min(1),worker_id:I(),worker_name:I(),host_id:I().nullable(),status:pt,created_at:zn,started_at:zn.nullable(),finished_at:zn.nullable(),cancel_requested:ie(),process_stopped:ie(),exit_code:Y().int().nullable(),stdout:I(),stderr:I(),stdout_truncated:ie(),stderr_truncated:ie(),error:I(),worker_ids:B(I())}),It=F({batch:cs.extend({script:I(),cwd:I(),all_online:ie(),request_key:I()}),executions:B(fr)}).refine(n=>n.executions.every(t=>t.batch_id===n.batch.id),{message:"命令明细批次不一致"}),gr=F({batches:B(cs),next_offset:Y().int().nonnegative().nullable()}),br=F({presets:B(F({id:ve("model_inventory"),label:I(),interpreter:ve("python"),script:I()}))}),ds={pending:{label:"等待执行",tone:"info"},running:{label:"正在执行",tone:"info"},succeeded:{label:"执行成功",tone:"ok"},failed:{label:"执行失败",tone:"bad"},canceled:{label:"已取消",tone:"warn"},timed_out:{label:"执行超时",tone:"warn"},unknown:{label:"状态未知 · 进程可能仍在运行",tone:"warn"},skipped:{label:"已跳过",tone:"warn"},expired:{label:"已过期",tone:"warn"}},Tt=n=>["pending","running","unknown"].includes(n.status)&&!n.cancel_requested,Nn="/api/admin/worker-commands";function jr(n){const t=i=>`${Nn}/${encodeURIComponent(i)}`,s=async(i,r,l,c)=>(c(),n.read(i,It,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r),signal:l})),a=(i,r)=>{if(i.batch.id!==r)throw new Error("返回的命令批次不一致，请刷新核实");return i};return{history(i,r){return n.read(`${Nn}?offset=${i}&limit=20`,gr,{cache:"no-store",signal:r})},presets(i){return n.read(`${Nn}/presets`,br,{cache:"no-store",signal:i})},async detail(i,r){return a(await n.read(t(i),It,{cache:"no-store",signal:r}),i)},async create(i,r,l){const c=ls.parse(i),u=await s(Nn,c,r,l);if(u.batch.request_key!==c.request_key||u.batch.script!==c.script||u.batch.interpreter!==c.interpreter||u.batch.cwd!==c.cwd||u.batch.timeout_seconds!==c.timeout_seconds||u.batch.all_online!==c.all_online)throw new Error("返回的命令与提交内容不一致，请到历史核实；不要更换请求标识重发");return u},async cancel(i,r,l,c){return a(await s(`${t(i)}/cancel`,r?{execution_id:r}:{},l,c),i)},async resolve(i,r,l,c){return a(await s(`${t(i)}/resolve`,{execution_id:r,confirmed_stopped:!0},l,c),i)}}}function vr(n,t,s){const a=p.useMemo(()=>jr(n.http),[n.http]),[i,r]=p.useState([]),[l,c]=p.useState(null),[u,d]=p.useState([]),[m,v]=p.useState(""),[h,g]=p.useState(null),[y,x]=p.useState(null),[S,w]=p.useState(0),[f,k]=p.useState(""),[z,R]=p.useState("bad"),[E,N]=p.useState(""),[A,_]=p.useState(!1),[b,C]=p.useState(!1),$=p.useRef(null),P=p.useRef({context:n,canMutate:s});p.useLayoutEffect(()=>{P.current={context:n,canMutate:s}},[n,s]),p.useEffect(()=>{if(!t)return;const D={controller:new AbortController,detailRead:null,revision:0,busy:!1};$.current=D;const j=D.controller.signal;let M;C(!1),g(null),r([]),d([]),v(""),N(""),a.presets(j).then(ae=>{j.aborted||d(ae.presets)}).catch(ae=>{j.aborted||v(`预设未获取，可手动输入脚本：${de(ae)}`)});const O=async()=>{if(j.aborted)return;if(D.busy){M=setTimeout(()=>{O()},2e3);return}const ae=D.revision,se=new AbortController;D.detailRead=se;const U=()=>se.abort();j.addEventListener("abort",U,{once:!0}),_(!0);try{const[T,W]=await Promise.all([a.history(S,se.signal),y?a.detail(y,se.signal):Promise.resolve(null)]);!j.aborted&&!se.signal.aborted&&ae===D.revision&&(r(T.batches),c(T.next_offset),g(W),N(""))}catch(T){!j.aborted&&!se.signal.aborted&&ae===D.revision&&N(`命令记录读取失败，现有内容可能已过期：${de(T)}`)}finally{j.removeEventListener("abort",U),j.aborted||(_(!1),M=setTimeout(()=>{O()},3e3))}};return O(),()=>{D.controller.abort(),D.detailRead?.abort(),clearTimeout(M),$.current===D&&($.current=null)}},[t,a,S,y]);const q=p.useCallback(async(D,j)=>{const M=$.current;if(!M||M.controller.signal.aborted||M.busy)return!1;const O=()=>{const{context:se,canMutate:U}=P.current;if(M.controller.signal.aborted)throw new DOMException("请求已停止监听","AbortError");if(se.sandbox||se.user.role!=="admin"||!U())throw new Error("当前为隔离副本、权限不足或服务状态未就绪，禁止发送远程命令")};M.busy=!0,M.revision++,M.detailRead?.abort(),C(!0),k("");let ae=!1;try{O(),ae=!0;const se=await D(M.controller.signal,O);return M.controller.signal.aborted?!1:(g(se),x(se.batch.id),P.current.context.notify({message:j,tone:"success"}),!0)}catch(se){if(!M.controller.signal.aborted){const U=ae&&!(se instanceof es&&se.status>=400&&se.status<500),T=se instanceof TypeError?"网络响应未能确认":de(se),W=U?`${T}。请求结果未确认，请先核对历史；创建重试将保留原请求标识。`:`${T}。请求未获受理，输入和请求标识已保留；请核实后再操作。`;k(W),R(U?"warn":"bad"),P.current.context.notify({message:W,tone:U?"warning":"error"})}return!1}finally{M.busy=!1,M.controller.signal.aborted||C(!1)}},[]);return{batches:i,nextOffset:l,presets:u,presetError:m,detail:h,selected:y,offset:S,error:f,errorTone:z,readError:E,loading:A,busy:b,create:D=>q((j,M)=>a.create(D,j,M),"命令批次已受理；不代表执行成功，请查看逐节点结果。"),cancel:D=>h?q((j,M)=>a.cancel(h.batch.id,D,j,M),"取消请求已提交；进程是否停止以执行端反馈为准。"):Promise.resolve(!1),resolve:D=>!h||h.executions.find(j=>j.id===D)?.status!=="unknown"?Promise.resolve(!1):q((j,M)=>a.resolve(h.batch.id,D,j,M),"现场核实记录已提交，请以服务器返回状态为准。"),select:D=>{$.current?.busy||(g(null),x(D),k(""))},page:D=>{$.current?.busy||w(D)}}}const ps={idle:"空闲",busy:"运行中",syncing:"正在更新",offline:"离线",disabled:"已禁用",error:"异常",queued:"排队中",assigned:"已分配",running:"运行中",done:"已完成",canceled:"已取消",cancel_requested:"正在取消"},yr={idle:"尚未更新",pending:"等待空闲",running:"更新并重启中",done:"更新重启完成",error:"更新重启失败"},oe=n=>(typeof n=="number"||typeof n=="string")&&n!==""&&Number.isFinite(Number(n))?Number(n):null,Be=n=>oe(n)==null?"未获取":String(n),_r=n=>{const t=oe(n);return t==null?null:Math.max(0,Math.min(100,t))},Xe=n=>{const t=oe(n);return t==null?"未记录":new Date(t*1e3).toLocaleString("zh-CN",{hour12:!1})};function mt(n){const t=oe(n);return t==null||t<0?"未记录":t<60?`${Math.round(t)}秒`:t<3600?`${Math.floor(t/60)}分${Math.floor(t%60)}秒`:`${Math.floor(t/3600)}小时${Math.floor(t%3600/60)}分`}function Oe(n){const t=oe(n);return t==null?"未采集":t>=1024**3?`${(t/1024**3).toFixed(1)} GB`:t>=1024**2?`${(t/1024**2).toFixed(0)} MB`:`${Math.round(t/1024)} KB`}const wr=n=>["idle","done"].includes(n||"")?"ok":["busy","syncing","running","queued","assigned","cancel_requested"].includes(n||"")?"warn":["offline","disabled","error","canceled"].includes(n||"")?"bad":"",vn=n=>ps[n||""]||n||"未知",ht=n=>{if(Ee(n))return"主节点 · 无需同步";if(n.sync_action==="restart_services"||n.sync_action==="reboot_host"){const t=n.sync_action==="reboot_host"?"电脑重启":"服务重启",s=n.sync_status;return s==="pending"?`${t} · 等待节点接收`:s==="running"?`${t}中`:s==="done"?`${t}完成`:s==="error"?`${t}失败`:"未记录"}return yr[n.sync_status||""]||n.sync_status||"未记录"},Ee=n=>n.is_primary_node===!0,Qe=n=>!Ee(n)&&["pending","running"].includes(n.sync_status||""),en=n=>!Ee(n)&&n.sync_status==="error",_e=n=>n.state!=="offline",us=n=>typeof n=="number"||typeof n=="string"&&n.trim()?`Worker v${n}`:"Worker 版本未知",ms=n=>us(n.capabilities?.agent_version);function hs(n){const t=n.capabilities?.system,s=t?.comfyui_build_version?.trim(),a=t?.comfyui_version?.trim();return s?`ComfyUI ${s}`:a?`ComfyUI ${a} · 定制版本未记录`:"ComfyUI 版本未记录"}const kr=(n,t=Date.now())=>{const s=oe(n?.health.server_time);return s==null||!n?t/1e3:s+(t-n.receivedAt)/1e3},xt=(n,t)=>{const s=oe(n);return s==null?"未记录":`${mt(Math.max(0,t-s))}前`};function ft(n,t,s){const a=oe(n.capabilities?.telemetry?.collected_at);return!s&&_e(n)&&a!=null&&t-a<=60&&t-a>=-10}function Ln(n){return _e(n)?n.enabled===!1||n.enabled===0||n.state==="disabled"?["已禁用接收","bad"]:Qe(n)?[["restart_services","reboot_host"].includes(n.sync_action||"")?"维护期间不可接任务":"同步期间不可接任务","bad"]:n.comfy_online===!1||n.state==="error"?["不可接任务","bad"]:n.busy||n.current_job_id||n.state==="busy"?["正在占用","warn"]:n.state==="idle"&&n.comfy_online===!0?["可接任务","ok"]:["接收状态未知",""]:["不可接任务","bad"]}function gt(n,t={}){const s=n.capability_comparison||{};if(t.status==="none")return{label:"未设置主节点基准",tone:"warn"};if(t.status==="ambiguous")return{label:"主节点不唯一",tone:"bad"};if(Ee(n)&&s.status==="primary")return{label:"主节点基准",tone:t.status==="stale"?"warn":"ok"};const a=s.missing_models?.length||0,i=s.missing_node_classes?.length||0,r=s.extra_models?.length||0,l=s.extra_node_classes?.length||0;let c,u="warn";return s.model_inventory_status==="unknown"?(c=["模型清单未知",i?`节点不全 · 缺 ${i} 个`:""].filter(Boolean).join("；"),i&&(u="bad")):s.status==="unknown"||!s.status?c="清单未知":a||i?(c=[a?`模型不全 · 缺 ${a} 个`:"",i?`节点不全 · 缺 ${i} 个`:""].filter(Boolean).join("；"),u="bad"):s.status==="stale"?c=r||l?"节点离线 · 主节点所需齐全，存在额外清单":"节点离线 · 最后清单一致":r||l?(c=`主节点所需齐全 · ${[r?`额外 ${r} 个模型`:"",l?`额外 ${l} 个节点`:""].filter(Boolean).join("；")}`,u="ok"):(c="清单一致",u="ok"),s.status==="stale"&&(a||i)&&(c=`节点离线 · 最后清单：${c}`),t.status==="stale"&&(c=`基准离线 · ${c}`),{label:c,tone:u}}function xs(n,t){if(Ee(n))return"主节点作为同步源，不参与同步";if(!_e(n))return"设备已离线，请上线后重试";if(n.capabilities?.supports_code_restart!==!0)return"请先升级 Worker 及配套启动文件";if(Qe(n))return"设备已有等待中或执行中的维护请求";if(t.status!=="ready")return"主节点基准不可用，请刷新后重试";const s=n.capability_comparison;return!s?.status||["unknown","stale"].includes(s.status)||s.model_inventory_status==="unknown"?"清单未知或已过期，请刷新后重试":!s.missing_models?.length&&!s.missing_node_classes?.length?"主节点所需资源齐全，无需补齐":""}function Qn(n){const t=n.comparisonBaseline;if(t.status==="none")return"未设置主节点，无法比较";if(t.status==="ambiguous")return"检测到多个主节点，无法确定比较基准";const s=n.workers.find(a=>a.id===t.worker_id)?.name||t.worker_id||"未命名主节点";return`${t.status==="stale"?"主节点离线 · 最后清单":"在线主节点"} · ${s} · ${us(t.agent_version)}`}function yn(n){const t=n.capabilities;return t?.telemetry?.gpus?.length?t.telemetry.gpus:(t?.devices||[]).map((s,a)=>{const i=oe(s.vram_total),r=oe(s.vram_free);return{index:s.index??a,name:s.name||s.device_name||s.type,memory_total_bytes:i,memory_used_bytes:i!=null&&r!=null?Math.max(0,i-r):null,utilization_percent:null,temperature_c:null}})}function fs(n){if(n.capabilities?.telemetry?.memory)return n.capabilities.telemetry.memory;const t=n.capabilities?.system,s=oe(t?.ram_total),a=oe(t?.ram_free);return{total_bytes:s,used_bytes:s!=null&&a!=null?Math.max(0,s-a):null}}const gs=(n,t)=>t.projects.find(s=>s.id===n.project)?.name||n.projectName||(n.project?"项目已删除":"未归属项目"),et=16e3;function Nr(n,t){const s=a=>a>0&&a<n.length&&n.charCodeAt(a)>=56320&&n.charCodeAt(a)<=57343?a-1:a;return n.slice(s(t*et),s((t+1)*et))}const $r="_dialog_1sy2y_1",Sr="_content_1sy2y_5",Cr="_row_1sy2y_10",zr="_stack_1sy2y_16",Er="_editor_1sy2y_17",Pr="_targets_1sy2y_23",Mr="_target_1sy2y_23",Ir="_warning_1sy2y_60",Tr="_execution_1sy2y_67",qr="_identifier_1sy2y_94",he={dialog:$r,content:Sr,row:Cr,stack:zr,editor:Er,targets:Pr,target:Mr,warning:Ir,execution:Tr,identifier:qr};function bs({counts:n}){return e.jsx("div",{className:he.row,children:pt.options.map(t=>{const s=ds[t],a=n[t];return a>0?e.jsxs("span",{"data-tone":s.tone,children:[s.label," ",a]},t):null})})}function Dr({detail:n,disabled:t,onCancel:s,onResolve:a}){const{batch:i,executions:r}=n;return e.jsxs("section",{className:he.stack,"aria-label":"命令批次明细",children:[e.jsxs("h3",{children:["服务器目标快照 · ",i.id]}),e.jsxs("p",{children:["创建人 ",i.created_by," · ",new Date(i.created_at*1e3).toLocaleString("zh-CN")," ·"," ",i.interpreter," · 超时 ",i.timeout_seconds," 秒"]}),e.jsxs("p",{children:["目标 ",i.target_count," · ",i.all_online?"全部在线（由服务器冻结）":"指定执行端"," · cwd：",i.cwd||"执行端默认目录"]}),e.jsx(bs,{counts:i.counts}),e.jsxs("details",{children:[e.jsx("summary",{children:"查看提交的脚本与请求标识"}),e.jsx("pre",{children:i.script}),e.jsxs("p",{children:["request_key：",i.request_key]})]}),e.jsx("button",{type:"button",disabled:t||!r.some(Tt),onClick:()=>s(),children:"取消批次全部"}),r.length===0&&e.jsx("p",{children:"服务器尚未返回逐节点记录；不能据此判断执行成功。"}),r.map(l=>{const c=ds[l.status];return e.jsxs("article",{className:he.execution,"aria-label":`执行结果 ${l.worker_name||l.worker_id}`,children:[e.jsxs("div",{className:he.row,children:[e.jsx("h4",{children:l.worker_name||l.worker_id}),e.jsx("strong",{"data-tone":c.tone,children:c.label})]}),e.jsxs("p",{children:["worker：",l.worker_id," · host：",l.host_id??"未记录"," · 同宿主原 worker：",l.worker_ids.join("、")||"未记录"]}),e.jsxs("p",{children:["开始：",l.started_at===null?"尚未记录":new Date(l.started_at*1e3).toLocaleString("zh-CN")," ","· 结束：",l.finished_at===null?"尚未记录":new Date(l.finished_at*1e3).toLocaleString("zh-CN")]}),e.jsxs("p",{children:["退出码：",l.exit_code??"未返回",l.exit_code===0&&l.status!=="succeeded"?"（仅退出码为 0 不代表执行成功）":""," ","· 进程停止：",l.process_stopped?"已确认":"未确认"," · 取消请求：",l.cancel_requested?"已请求，等待核实停止":"未请求"]}),l.error&&e.jsxs("div",{"data-tone":c.tone,children:[e.jsx("b",{children:l.status==="skipped"?"服务器跳过原因":"服务器说明"}),e.jsx("pre",{children:l.error})]}),e.jsxs("div",{className:he.row,children:[e.jsx("button",{type:"button",disabled:t||!Tt(l),onClick:()=>s(l.id),children:"取消此节点"}),l.status==="unknown"&&e.jsx("button",{type:"button",disabled:t,onClick:()=>a(l.id),children:"现场核实停止后解除占用"})]}),e.jsxs("h5",{children:["标准输出 stdout",l.stdout_truncated?" · 已截断，仅显示服务器保留部分":""]}),e.jsx("pre",{"aria-label":`${l.worker_name||l.worker_id} 标准输出`,tabIndex:0,children:l.stdout||"（暂无输出）"}),e.jsxs("h5",{children:["标准错误 stderr",l.stderr_truncated?" · 已截断，仅显示服务器保留部分":""]}),e.jsx("pre",{"aria-label":`${l.worker_name||l.worker_id} 标准错误`,tabIndex:0,children:l.stderr||"（暂无输出）"})]},l.id)})]})}const Ar=()=>({request_key:os(),all_online:!1,worker_ids:[],interpreter:"python",cwd:"",script:"",timeout_seconds:300});function Rr({context:n,open:t,workers:s,canMutate:a,unavailable:i,onClose:r}){const l=vr(n,t,a),[c,u]=p.useState(Ar),[d,m]=p.useState("edit"),[v,h]=p.useState(!1),[g,y]=p.useState(""),[x,S]=p.useState(null),[w,f]=p.useState(!1),k=p.useRef(null),z=p.useRef(null);p.useEffect(()=>{t&&x&&(k.current?.focus({preventScroll:!0}),k.current?.scrollIntoView({block:"nearest"}))},[t,x]),p.useEffect(()=>{t&&(g||l.error)&&(z.current?.focus({preventScroll:!0}),z.current?.scrollIntoView({block:"nearest"}))},[t,g,l.error]);const R=s.filter(_e),E=i||n.sandbox||n.user.role!=="admin",N=c.all_online?R:R.filter($=>c.worker_ids.includes($.id)),A=!c.all_online&&N.length!==c.worker_ids.length,_=$=>{l.busy||(u(P=>({...P,...$,request_key:os()})),h(!1),y(""))},b=()=>{if(!ls.safeParse(c).success){y("请选择至少一台在线执行端，填写脚本，并将超时设置为 5–3600 的整数秒。");return}if(A){y("已选执行端不在当前在线快照，请重新选择；不会静默删除目标。");return}h(!1),m("confirm")},C=$=>{f(!1),S($)};return t?e.jsx(xe,{title:"远程命令",className:he.dialog,onClose:()=>{h(!1),S(null),f(!1),r()},showFooter:!1,children:e.jsxs("div",{className:he.content,children:[e.jsxs("div",{className:he.warning,children:[e.jsx("b",{children:"仅限管理员执行可信脚本：这是真实 Windows shell，不是沙箱。"}),e.jsx("p",{children:"脚本可修改文件、停止服务或造成不可逆后果。主节点也可执行；旧 Worker 不支持时由服务器明确跳过。同宿主合并、目标冻结和跳过原因以服务器结果为准。"}),e.jsx("p",{children:"命令正文和输出会写入审计历史，请勿填入密码、token 或其他凭证。"}),e.jsx("p",{children:"关闭弹窗只停止页面监听，不取消已提交任务。取消请求也不等于进程已经停止。"})]}),e.jsxs("div",{className:he.row,"aria-label":"命令视图",children:[e.jsx("button",{type:"button",disabled:l.busy,onClick:()=>{m("edit"),S(null)},children:"编辑命令"}),e.jsx("button",{type:"button",disabled:l.busy,onClick:()=>{m("history"),S(null)},children:"命令历史"}),l.selected&&e.jsx("button",{type:"button",disabled:l.busy,onClick:()=>m("detail"),children:"当前批次明细"})]}),E&&e.jsx("p",{className:he.warning,role:"status",children:"隔离副本、权限不足或运行状态未就绪：仅可查看记录，禁止提交、取消和解除占用。"}),(l.error||g)&&e.jsx("p",{ref:z,role:"alert","aria-label":"命令表单反馈","data-tone":g?"bad":l.errorTone,tabIndex:-1,children:g||l.error}),l.readError&&e.jsx("p",{role:"alert","data-tone":"warn",children:l.readError}),d==="edit"&&e.jsxs("fieldset",{className:he.editor,disabled:l.busy,children:[e.jsx("legend",{children:"新命令"}),e.jsxs("label",{children:["目标范围",e.jsxs("select",{value:c.all_online?"all":"selected",onChange:$=>_({all_online:$.target.value==="all",worker_ids:[]}),children:[e.jsx("option",{value:"selected",children:"选择单台 / 多台在线执行端"}),e.jsx("option",{value:"all",children:"全部在线（服务器提交时冻结）"})]})]}),e.jsxs("fieldset",{className:he.targets,disabled:c.all_online,children:[e.jsxs("legend",{children:["在线执行端 · 当前快照 ",R.length," 台"]}),R.length===0&&e.jsx("p",{children:"当前没有在线执行端。"}),R.map($=>{const P=$.capabilities?.remote_commands,q=P&&P.version>=1&&P.interpreters.includes(c.interpreter);return e.jsxs("label",{className:he.target,children:[e.jsx("input",{type:"checkbox",checked:!c.all_online&&c.worker_ids.includes($.id),onChange:Z=>_({worker_ids:Z.target.checked?[...c.worker_ids,$.id]:c.worker_ids.filter(G=>G!==$.id)})}),e.jsxs("span",{children:[$.name||$.id,$.is_primary_node?" · 主节点（可命令）":"",e.jsxs("small",{children:[$.id," ·"," ",q?"已上报解释器支持":P?"未上报当前解释器支持，服务器可能跳过":"旧 Worker / 未上报远程命令能力，服务器将核实并跳过不支持节点"]})]})]},$.id)})]}),A&&e.jsxs("p",{"data-tone":"warn",children:["已选目标已离线或不在快照：",c.worker_ids.filter($=>!R.some(P=>P.id===$)).join("、"),"。请重新选择。"]}),e.jsxs("label",{children:["解释器",e.jsxs("select",{value:c.interpreter,onChange:$=>{const P=ut.safeParse($.target.value);P.success&&_({interpreter:P.data})},children:[e.jsx("option",{value:"python",children:"Python"}),e.jsx("option",{value:"powershell",children:"PowerShell"})]})]}),e.jsxs("label",{children:["工作目录 cwd（空白使用默认目录）",e.jsx("input",{value:c.cwd,onChange:$=>_({cwd:$.target.value})})]}),e.jsxs("label",{children:["超时（秒，5–3600）",e.jsx("input",{type:"number",min:5,max:3600,step:1,value:Number.isNaN(c.timeout_seconds)?"":c.timeout_seconds,onChange:$=>_({timeout_seconds:$.target.valueAsNumber})})]}),e.jsxs("label",{children:["可选预设",e.jsxs("select",{defaultValue:"",onChange:$=>{const P=l.presets.find(q=>q.id===$.target.value);P&&_({interpreter:P.interpreter,script:P.script}),$.target.value=""},children:[e.jsx("option",{value:"",children:"不使用预设 / 手动输入"}),l.presets.map($=>e.jsx("option",{value:$.id,children:$.label},$.id))]})]}),l.presetError&&e.jsx("p",{"data-tone":"warn",children:l.presetError}),e.jsxs("label",{children:["脚本 script",e.jsx("textarea",{rows:12,value:c.script,spellCheck:!1,onChange:$=>_({script:$.target.value})})]}),e.jsx("p",{children:"预设仅填入脚本，不会自动执行。模型盘点为第一页，可在脚本中编辑 offset 后重新确认。"}),e.jsxs("p",{className:he.identifier,children:["请求标识：",c.request_key,"。失败重试保留此标识；编辑命令或目标后生成新标识。"]}),e.jsx("button",{type:"button",className:"primary",disabled:E||l.busy,onClick:b,children:"检查命令并继续"})]}),d==="confirm"&&e.jsxs("section",{className:he.stack,"aria-label":"二次确认命令",children:[e.jsx("h3",{children:"二次确认 · 即将在真实执行端运行"}),e.jsx("p",{children:c.all_online?"全部在线，最终目标由服务器提交时冻结；下列仅为当前快照预览。":"指定以下执行端；同宿主可能合并。"}),e.jsx("ul",{children:N.map($=>e.jsxs("li",{children:[$.name||$.id,"（",$.id,"）",$.is_primary_node?" · 主节点":"",$.capabilities?.remote_commands?"":" · 旧 Worker，可能跳过"]},$.id))}),e.jsxs("p",{children:[c.interpreter," · cwd：",c.cwd||"默认目录"," · 超时 ",c.timeout_seconds," 秒"]}),e.jsx("pre",{children:c.script}),e.jsxs("p",{className:he.identifier,children:["request_key：",c.request_key]}),e.jsxs("label",{className:he.target,children:[e.jsx("input",{type:"checkbox",checked:v,disabled:l.busy,onChange:$=>h($.target.checked)}),"我已核对目标和脚本，理解这不是沙箱并接受不可逆风险"]}),e.jsxs("div",{className:he.row,children:[e.jsx("button",{type:"button",disabled:l.busy,onClick:()=>m("edit"),children:"返回修改"}),e.jsx("button",{type:"button",className:"primary",disabled:E||l.busy||!v||A,onClick:()=>{!v||A||l.create(c).then($=>{$&&(m("detail"),h(!1))})},children:l.busy?"正在提交…":"确认提交远程命令"})]})]}),d==="history"&&e.jsxs("section",{className:he.stack,"aria-label":"命令历史列表",children:[e.jsx("h3",{children:"命令历史"}),l.batches.length===0&&e.jsx("p",{children:l.loading?"正在读取…":l.readError?"历史尚未获取。":"暂无命令批次。"}),l.batches.map($=>e.jsxs("article",{className:he.execution,children:[e.jsxs("button",{type:"button",disabled:l.busy,onClick:()=>{l.select($.id),S(null),m("detail")},children:["查看批次 ",$.id]}),e.jsxs("p",{children:[new Date($.created_at*1e3).toLocaleString("zh-CN")," · ",$.created_by," ·"," ",$.interpreter," · 超时 ",$.timeout_seconds," 秒 · 目标 ",$.target_count]}),e.jsx(bs,{counts:$.counts})]},$.id)),e.jsxs("div",{className:he.row,children:[e.jsx("button",{type:"button",disabled:l.loading||l.busy||l.offset===0,onClick:()=>l.page(Math.max(0,l.offset-20)),children:"上一页"}),e.jsxs("span",{children:["第 ",Math.floor(l.offset/20)+1," 页"]}),e.jsx("button",{type:"button",disabled:l.loading||l.busy||l.nextOffset===null,onClick:()=>{l.nextOffset!==null&&l.page(l.nextOffset)},children:"下一页"})]})]}),d==="detail"&&e.jsxs(e.Fragment,{children:[l.detail?e.jsx(Dr,{detail:l.detail,disabled:E||l.busy||!!l.readError,onCancel:$=>C({kind:"cancel",id:$}),onResolve:$=>C({kind:"resolve",id:$})}):e.jsx("p",{role:"status",children:l.readError?"明细未获取，请等待重试。":"正在读取服务器目标快照…"}),x&&e.jsxs("section",{className:he.warning,ref:k,tabIndex:-1,"aria-label":x.kind==="resolve"?"核实停止确认":"取消命令确认",children:[e.jsx("h3",{children:x.kind==="resolve"?"谨慎确认：仅解除未知执行占用":"确认请求取消"}),e.jsxs("p",{children:["批次 ",l.detail?.batch.id," ·"," ",x.id?`执行记录 ${x.id}`:"批次全部节点"]}),x.kind==="resolve"?e.jsxs(e.Fragment,{children:[e.jsx("p",{children:"只有管理员已到现场或通过可信方式核实该宿主上的命令进程确实停止，才可解除占用。这不会终止进程，也不表示执行成功；错误解除可能导致并发操作。"}),e.jsxs("label",{className:he.target,children:[e.jsx("input",{type:"checkbox",checked:w,disabled:l.busy,onChange:$=>f($.target.checked)}),"我已现场核实该命令进程停止"]})]}):e.jsx("p",{children:"只提交取消请求，不保证进程立即停止。请继续检查逐节点状态，未知状态不能当作已取消。"}),e.jsxs("div",{className:he.row,children:[e.jsx("button",{type:"button",disabled:l.busy,onClick:()=>S(null),children:"返回明细"}),e.jsx("button",{type:"button",disabled:E||l.busy||!!l.readError||x.kind==="resolve"&&!w,onClick:()=>{x.kind==="resolve"&&!w||(x.kind==="resolve"?l.resolve(x.id):l.cancel(x.id)).then($=>{$&&S(null)})},children:l.busy?"正在提交…":x.kind==="resolve"?"确认进程已停止并解除占用":"确认请求取消"})]})]})]}),e.jsx("p",{role:"status",children:l.busy?"正在提交请求，请勿重复操作…":l.loading?"正在刷新命令记录…":"命令记录每 3 秒刷新；状态以服务器反馈为准。"})]})}):null}function Lr(n){return{async worker(t,s){const a=await n.read(`/api/workers?worker_id=${encodeURIComponent(t)}`,Pt,{cache:"no-store",signal:s}),i=a.workers[0];if(a.workers.length!==1||!i||i.id!==t)throw new Error("节点详情与所选设备不一致");return i},async job(t,s){const a=await n.read(`/api/job/${encodeURIComponent(t)}`,ct,{cache:"no-store",signal:s});if(a.id!==t)throw new Error("任务执行记录与所选任务不一致");return a},async history(t,s,a){const i=new URLSearchParams({limit:"50",status:t});return s!==null&&i.set("cursor",s),n.read(`/api/jobs/history?${i}`,oi,{cache:"no-store",signal:a})},async snapshot(t,s=()=>{}){const a={cache:"no-store",signal:t},[i,r,l,c,u]=await Promise.all([n.read("/api/health",ai,a).then(d=>(d.sandbox===!0&&!t.aborted&&s(),d)),n.read("/api/status",ii,a),n.read("/api/workers?summary=1",Pt,a),n.read("/api/jobs?summary=1",ri,a),n.read("/api/projects",ci,a)]);return{health:i,status:r,workers:l.workers,comparisonBaseline:l.comparison_baseline||{status:"none"},jobs:c.jobs,projects:u.projects,receivedAt:Date.now()}},async temperature(t,s,a,i){const r=await n.read(`/api/workers/${encodeURIComponent(t)}/temperature?gpu_index=${s}&minutes=${a}`,xi,{cache:"no-store",signal:i});if(r.worker_id!=null&&r.worker_id!==t||r.gpu_index!=null&&oe(r.gpu_index)!==s||r.minutes!=null&&oe(r.minutes)!==a)throw new Error("温度历史与所选节点或范围不一致");return{...r,points:r.points.flatMap(l=>l.at!=null&&l.at>=r.from&&l.at<=r.to?[{...l,at:l.at,temperature_c:l.temperature_c}]:[]).sort((l,c)=>l.at-c.at)}},async deleteWorker(t,s,a){return a(),hi.parse(await n.request(`/api/workers/${encodeURIComponent(t)}`,{method:"DELETE",signal:s}))},async restartWorker(t,s,a,i){i();const r=mi.parse(await n.request(`/api/admin/workers/${encodeURIComponent(t)}/restart`,{method:"POST",signal:a,headers:{"Content-Type":"application/json"},body:JSON.stringify({action:s})}));if(r.worker_id!==t||r.action!==s)throw new Error("重启响应与所选节点或操作不一致");return r},async syncWorker(t,s,a){a();const i=pi.parse(await n.request(`/api/admin/workers/${encodeURIComponent(t)}/sync`,{method:"POST",signal:s,headers:{"Content-Type":"application/json"},body:JSON.stringify({})}));if(i.worker_id!==t)throw new Error("同步响应与所选设备不一致");return i},async syncAll(t,s){return s(),di.parse(await n.request("/api/admin/workers/sync-all",{method:"POST",signal:t,headers:{"Content-Type":"application/json"},body:JSON.stringify({})}))}}}const qt=n=>({filter:n,jobs:[],initialized:!1,loadedPages:0,nextCursor:null,hasMore:!1,total:null,loading:null,error:"",failedAction:null});function Yn(n,t){return(oe(t.created)??0)-(oe(n.created)??0)||(n.id<t.id?1:n.id>t.id?-1:0)}function Fr(n,t){const s=new Map(t.jobs.map(i=>[i.id,i])),a=t.jobs.reduce((i,r)=>!i||Yn(r,i)>0?r:i,null);for(const i of n?.jobs||[]){const r=["queued","assigned","running","cancel_requested"].includes(i.status||"");(s.has(i.id)||r||a&&Yn(i,a)<=0)&&s.set(i.id,i)}return[...s.values()].filter(i=>{const r=i.status==="assigned"?"queued":i.status==="cancel_requested"?"running":i.status;return t.filter==="all"||r===t.filter}).sort(Yn)}class Or{constructor(t,s=!1){this.service=t,this.state={snapshot:null,history:qt("all"),stale:!1,loading:!1,error:"",isolated:s,mutation:null,deletingWorker:null,refreshed:0}}service;state;listeners=new Set;read=null;historyRead=null;historyEpoch=0;write=null;version=0;disposed=!1;start=()=>{this.disposed=!1,this.refreshAll()};refreshAll=()=>Promise.all([this.refresh(),this.refreshHistory()]);getSnapshot=()=>this.state;subscribe=t=>(this.listeners.add(t),()=>{this.listeners.delete(t)});update(t){this.disposed||(this.state={...this.state,...t},this.listeners.forEach(s=>s()))}isolate=()=>{this.state.isolated||this.update({isolated:!0})};canMutate=()=>!this.disposed&&!!this.state.snapshot&&!this.state.stale&&!this.state.isolated&&!this.state.mutation;guard=()=>{if(this.disposed||!this.state.snapshot||this.state.stale||this.state.isolated)throw new Error("隔离副本或服务状态未就绪，禁止修改设备")};invalidateRead(){++this.version,this.read?.controller.abort(),this.read=null,this.update({loading:!1})}refresh=(t=!1)=>{if(this.disposed||this.state.mutation&&!t)return Promise.resolve();if(this.read)return this.read.promise;const s=++this.version,a=new AbortController;this.update({loading:!0});const i=this.service.snapshot(a.signal,this.isolate).then(r=>{this.disposed||a.signal.aborted||s!==this.version||this.update({snapshot:r,stale:!1,error:"",refreshed:this.state.refreshed+1,isolated:this.state.isolated||r.health.sandbox===!0})}).catch(r=>{this.disposed||a.signal.aborted||s!==this.version||(this.update({stale:!0,error:`读取中间层信息失败：${de(r)}`}),a.abort())}).finally(()=>{s!==this.version||this.disposed||(this.read=null,this.update({loading:!1}))});return this.read={controller:a,promise:i},i};setHistoryFilter=t=>this.disposed?Promise.resolve():t===this.state.history.filter?this.refreshHistory():(++this.historyEpoch,this.historyRead?.controller.abort(),this.historyRead=null,this.update({history:qt(t)}),this.refreshHistory());refreshHistory=()=>this.readHistory("first");loadMore=()=>this.readHistory("more");retryHistory=()=>this.readHistory(this.state.history.failedAction||"first");readHistory(t){if(this.disposed)return Promise.resolve();if(this.historyRead)return this.historyRead.promise;const s=this.state.history;if(t==="more"&&(!s.initialized||!s.hasMore))return Promise.resolve();const a=t==="more"?s.nextCursor:null,i=this.historyEpoch,r=new AbortController;this.update({history:{...s,loading:t,error:"",failedAction:null}});const l=this.service.history(s.filter,a,r.signal).then(c=>{if(this.disposed||r.signal.aborted||i!==this.historyEpoch)return;if(t==="more"&&c.has_more&&c.next_cursor===a)throw new Error("任务历史游标未推进，请重试");const u=this.state.history,d=new Map(u.jobs.map(v=>[v.id,v]));for(const v of c.jobs)d.set(v.id,v);const m=t==="first"&&u.loadedPages>1;this.update({history:{...u,jobs:[...d.values()],initialized:!0,loadedPages:t==="more"?u.loadedPages+1:Math.max(1,u.loadedPages),total:c.total,nextCursor:m?u.nextCursor:c.next_cursor,hasMore:m?u.hasMore:c.has_more}})}).catch(c=>{this.disposed||r.signal.aborted||i!==this.historyEpoch||this.update({history:{...this.state.history,error:`读取任务历史失败：${de(c)}`,failedAction:t}})}).finally(()=>{this.disposed||r.signal.aborted||i!==this.historyEpoch||(this.historyRead=null,this.update({history:{...this.state.history,loading:null}}))});return this.historyRead={controller:r,promise:l},l}async mutate(t,s,a){if(this.guard(),this.state.mutation)throw new Error("设备操作正在执行，请稍后重试");this.invalidateRead();const i=new AbortController;this.write=i,this.update({mutation:t,deletingWorker:s});try{const r=await a(i.signal);if(i.signal.aborted||this.disposed)throw new DOMException("操作已取消","AbortError");return await this.refresh(!0),r}catch(r){throw i.signal.aborted||(this.update({error:`${t==="delete"?"删除设备":t==="restart"?"提交重启":t==="access"?"保存使用范围":"更新节点"}失败：${de(r)}`}),await this.refresh(!0)),r}finally{this.write=null,this.update({mutation:null,deletingWorker:null})}}deleteWorker=t=>this.state.snapshot?.workers.some(s=>s.id===t)?this.mutate("delete",t,s=>this.service.deleteWorker(t,s,this.guard)):Promise.reject(new Error("设备已移除"));restartWorker=(t,s)=>this.state.snapshot?.workers.some(a=>a.id===t)?this.mutate("restart",null,a=>this.service.restartWorker(t,s,a,this.guard)):Promise.reject(new Error("设备已移除"));syncWorker=t=>{const s=this.state.snapshot,a=s?.workers.find(r=>r.id===t);if(!a||!s)return Promise.reject(new Error("设备已移除或被新的注册替代"));const i=xs(a,s.comparisonBaseline);return i?Promise.reject(new Error(i)):this.mutate("sync",null,r=>this.service.syncWorker(t,r,this.guard))};saveAccess=(t,s,a)=>{const i=[...new Set(t)];return i.length?i.some(r=>!this.state.snapshot?.workers.some(l=>l.id===r))?Promise.reject(new Error("所选设备已移除或被新的注册替代，请重新选择")):this.mutate("access",null,async r=>{const l={succeeded:[],failed:[]};for(const[c,u]of i.entries())try{r.throwIfAborted(),await a.save(u,s,r,this.guard),l.succeeded.push(u)}catch(d){if(r.aborted)throw d;l.failed.push({worker_id:u,error:de(d)}),l.failed.push(...i.slice(c+1).map(m=>({worker_id:m,error:"未提交：前一台设备保存失败，已停止后续保存，可重试"})));break}return l}):Promise.reject(new Error("请至少选择一台设备"))};syncAll=()=>this.mutate("sync",null,t=>this.service.syncAll(t,this.guard));dispose=()=>{this.disposed=!0,++this.version,this.read?.controller.abort(),this.write?.abort(),++this.historyEpoch,this.historyRead?.controller.abort(),this.historyRead=null,this.read=null,this.listeners.clear()}}function Ur({http:n,sandbox:t}){const s=p.useMemo(()=>Lr(n),[n]),a=p.useMemo(()=>new Or(s),[s]),i=p.useSyncExternalStore(a.subscribe,a.getSnapshot),[r,l]=p.useState(!0),c=p.useRef(r),[u,d]=p.useState(Date.now);return p.useLayoutEffect(()=>{c.current=r},[r]),p.useLayoutEffect(()=>{t&&a.isolate()},[t,a]),p.useEffect(()=>(a.start(),a.dispose),[a]),p.useEffect(()=>{const m=()=>{document.hidden||(d(Date.now()),c.current&&a.refreshAll())},v=window.setInterval(m,5e3);return document.addEventListener("visibilitychange",m),()=>{window.clearInterval(v),document.removeEventListener("visibilitychange",m)}},[a]),{state:i,store:a,service:s,automatic:r,setAutomatic:l,clock:u}}function js(n,t){const[s,a]=p.useState(0),[i,r]=p.useState({id:t,data:null,error:"",loading:t!==null});return p.useEffect(()=>{const l=new AbortController;return r({id:t,data:null,error:"",loading:t!==null}),t!==null&&n(t,l.signal).then(c=>{l.signal.aborted||r({id:t,data:c,error:"",loading:!1})},c=>{l.signal.aborted||r({id:t,data:null,error:de(c),loading:!1})}),()=>l.abort()},[n,t,s]),{...i.id===t?i:{data:null,error:"",loading:t!==null},retry:()=>a(l=>l+1)}}function qn({name:n}){return e.jsx("svg",{className:"icon",viewBox:"0 0 24 24","aria-hidden":"true",focusable:"false",children:n==="refresh"?e.jsxs(e.Fragment,{children:[e.jsx("path",{d:"M20 7v5h-5M4 17v-5h5"}),e.jsx("path",{d:"M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 18 17"})]}):n==="chevron"?e.jsx("path",{d:"m9 5 7 7-7 7"}):e.jsxs(e.Fragment,{children:[e.jsx("path",{d:"m12 3 10 18H2L12 3Z"}),e.jsx("path",{d:"M12 9v4m0 3v1"})]})})}function He({children:n}){return e.jsx("span",{className:"cell-secondary",children:n})}function Wr({value:n,label:t}){return e.jsx("div",{className:"util-track",role:"meter","aria-label":t,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":n,children:e.jsx("i",{style:{width:`${n}%`}})})}function Br({value:n}){const t=oe(n),s=_r(t==null?null:t*100);return e.jsxs("div",{className:"utilization",children:[e.jsx("span",{children:s==null?"未采集":`${Math.round(s)}%`}),s!=null&&e.jsx(Wr,{value:s,label:"任务过程进度"})]})}function vs({worker:n,snapshot:t}){const s=t.jobs.find(a=>a.id===n.current_job_id);if(s){const a=`${s.submitter_display_name?.trim()||s.submitter_username||"未记录提交人"} · ${gs(s,t)} · ${s.cardName||s.name||"未命名卡片"}`;return s.project&&s.card?e.jsx("a",{href:`/?${new URLSearchParams({project:s.project,card:s.card})}`,title:a,children:a}):e.jsx("span",{title:a,children:a})}return n.current_job_id?e.jsx(e.Fragment,{children:"任务详情暂未载入"}):Qe(n)?e.jsxs(e.Fragment,{children:[ht(n),e.jsx(He,{children:n.sync_message||"等待节点反馈"})]}):_e(n)?n.busy?e.jsxs(e.Fragment,{children:["ComfyUI 本地任务",e.jsx(He,{children:"非中间层派发"})]}):e.jsx(e.Fragment,{children:Ln(n)[1]==="bad"?"不接收新任务":"当前无任务"}):e.jsx(e.Fragment,{children:"非实时"})}function ys({rows:n,className:t,id:s}){return e.jsx("dl",{id:s,className:t,children:n.map(([a,i])=>e.jsx(Vr,{label:a,children:i},a))})}function Vr({label:n,children:t}){return e.jsxs(e.Fragment,{children:[e.jsx("dt",{children:n}),e.jsx("dd",{children:t})]})}function Hr({snapshot:n,items:t,now:s,onError:a}){const i=new Map(n?.workers.map(r=>[r.id,r.name])||[]);return e.jsx(e.Fragment,{children:t.length?t.map(r=>{const l=r.modelName?.trim(),c=r.name?.trim()||r.capability?.trim()||l||"未记录",u=oe(r.started),d=u==null?r.history_only?"耗时未记录":"尚未开始":r.history_only&&oe(r.ended)==null?"耗时未记录":mt((oe(r.ended)??s)-u);return e.jsxs("tr",{children:[e.jsx("td",{className:wr(r.status),children:vn(r.status)}),e.jsxs("td",{className:"job-origin",children:[r.submitter_display_name?.trim()||r.submitter_username||"未记录提交人",e.jsx(He,{children:n?gs(r,n):r.projectName||"项目未记录"}),e.jsxs(He,{children:["卡片 · ",r.cardName||r.name||"未命名"]})]}),e.jsxs("td",{className:"job-mode",title:r.capability||void 0,children:[c,l&&l!==c&&e.jsxs(He,{children:["模型 · ",l]}),e.jsx(He,{children:r.id})]}),e.jsxs("td",{children:[e.jsx(Br,{value:r.progress}),e.jsx(He,{children:r.step||"步骤未记录"})]}),e.jsx("td",{title:r.worker_id||void 0,children:r.nodeName?.trim()||(r.worker_id?i.get(r.worker_id)||"未知执行端":r.history_only?"未记录":"待分配")}),e.jsx("td",{children:Xe(r.created)}),e.jsx("td",{children:r.error?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"danger f-job-error",title:r.error,children:r.error}),e.jsx("button",{type:"button",className:"link-button","data-job-error":r.id,"data-focus-key":`job-error:${r.id}`,onClick:()=>a(r),children:"查看完整错误"})]}):d})]},r.id)}):e.jsx("tr",{children:e.jsx("td",{colSpan:7,children:e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"暂无已加载任务"}),e.jsx("p",{children:"可更换任务状态；历史记录的加载结果见下方状态。"})]})})})})}class Gr{constructor(t,s,a,i){this.service=t,this.id=s,this.gpu=a,this.minutes=i}service;id;gpu;minutes;state={data:null,loading:!1,error:""};listeners=new Set;request=null;version=0;getSnapshot=()=>this.state;subscribe=t=>(this.listeners.add(t),()=>{this.listeners.delete(t)});update(t){this.state={...this.state,...t},this.listeners.forEach(s=>s())}load=async(t=!1)=>{if(t&&this.request)return;this.request?.abort();const s=new AbortController,a=++this.version;this.request=s,this.update({loading:!0,error:"",...t?{}:{data:null}});try{const i=await this.service.temperature(this.id,this.gpu,this.minutes,s.signal);if(s.signal.aborted||a!==this.version)return;this.update({data:i})}catch(i){if(s.signal.aborted||a!==this.version)return;this.update({data:null,error:de(i)})}finally{a===this.version&&(this.request=null,this.update({loading:!1}))}};dispose=()=>{++this.version,this.request?.abort(),this.request=null}}function Jr(n,t,s){const a=n.points.flatMap(d=>d.temperature_c==null?[]:[d.temperature_c]),i=Math.floor((Math.min(...a)-5)/10)*10,r=Math.ceil((Math.max(...a)+5)/10)*10,l=49,c=t-l-20,u=s-23-45;return{x:d=>l+(d-n.from)/(n.to-n.from)*c,y:d=>23+(r-d)/(r-i)*u,width:t,height:s,left:l,pw:c}}function Zr(n){const t=[];let s=null;for(const a of n.points){if(a.temperature_c==null){s=null;continue}(s==null||a.at-s>n.gap_seconds)&&t.push([]),t[t.length-1]?.push({at:a.at,temperature_c:a.temperature_c}),s=a.at}return t}function Yr(n,t,s,a,i){if(a<70||i<50||!t.points.some(x=>x.temperature_c!=null))return null;const r=n.getContext("2d");if(!r)return null;const l=window.devicePixelRatio||1;n.width=Math.round(a*l),n.height=Math.round(i*l),r.setTransform(l,0,0,l,0,0),r.clearRect(0,0,a,i);const c=Jr(t,a,i),{x:u,y:d,left:m,pw:v}=c,h=t.points.flatMap(x=>x.temperature_c==null?[]:[x.temperature_c]),g=Math.floor((Math.min(...h)-5)/10)*10,y=Math.ceil((Math.max(...h)+5)/10)*10;r.font='12px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',r.lineWidth=1,r.textAlign="right",r.textBaseline="middle";for(let x=0;x<=4;x++){const S=g+(y-g)*x/4,w=d(S);r.strokeStyle="#29313c",r.beginPath(),r.moveTo(m,w),r.lineTo(a-20,w),r.stroke(),r.fillStyle="#a0a6b1",r.fillText(`${Math.round(S)}°`,m-12,w)}r.textBaseline="top";for(let x=0;x<=4;x+=a<600?2:1){const S=new Date((t.from+(t.to-t.from)*x/4)*1e3),w=S.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:!1}),f=s===1440?S.toLocaleDateString("zh-CN",{month:"2-digit",day:"2-digit"})+" "+w:w;r.textAlign=x===0?"left":x===4?"right":"center",r.fillText(f,m+x/4*v,i-27)}r.strokeStyle="#38bdf8",r.lineWidth=2.3,r.lineJoin="round",r.beginPath();for(const x of Zr(t))x.forEach((S,w)=>{w===0?r.moveTo(u(S.at),d(S.temperature_c)):r.lineTo(u(S.at),d(S.temperature_c))});r.stroke(),r.fillStyle="#38bdf8";for(const x of t.points)x.temperature_c!=null&&(r.beginPath(),r.arc(u(x.at),d(x.temperature_c),2.1,0,Math.PI*2),r.fill());return c}function Kr({worker:n,workerId:t,service:s,now:a,stale:i,revision:r,onClose:l}){const c=n?yn(n):[],[u,d]=p.useState(()=>({gpu:oe(c[0]?.index)??0,minutes:30}));return e.jsx(xe,{title:n?.name||t,onClose:l,className:`temperature-dialog ${V.temperatureDialog}`,showFooter:!1,children:e.jsx(Xr,{worker:n,workerId:t,service:s,now:a,stale:i,revision:r,selection:u,onSelect:d})})}function Xr({worker:n,workerId:t,service:s,now:a,stale:i,revision:r,selection:l,onSelect:c}){const{gpu:u,minutes:d}=l,m=p.useMemo(()=>new Gr(s,t,u,d),[s,t,u,d]),v=p.useSyncExternalStore(m.subscribe,m.getSnapshot),{data:h,error:g,loading:y}=v,x=p.useRef(null),S=p.useRef(null),w=p.useRef(null),f=p.useRef(null),[k,z]=p.useState(null),R=p.useRef(r),E=n?yn(n):[],N=E.find(P=>oe(P.index)===u),A=(h?.points||[]).flatMap(P=>P.temperature_c==null?[]:[P.temperature_c]),_=n&&_e(n)?ft(n,a,i)?oe(N?.temperature_c)??"未采集":"未采集":"非实时";p.useEffect(()=>(m.load(),m.dispose),[m]),p.useEffect(()=>{R.current!==r&&(R.current=r,m.load(!0))},[r,m]),p.useEffect(()=>{const P=x.current,q=S.current;if(!P||!q||!h)return;const Z=()=>{const{width:D,height:j}=q.getBoundingClientRect();f.current=Yr(P,h,d,D,j)},G=requestAnimationFrame(Z),K=new ResizeObserver(Z);return K.observe(q),()=>{cancelAnimationFrame(G),K.disconnect(),f.current=null}},[h,d]);const b=k==null?void 0:h?.points[k],C=b?`${Xe(b.at)} · ${b.temperature_c==null?"未采集":`${b.temperature_c}°C`}`:"";p.useEffect(()=>{const P=w.current,q=f.current;!P||!q||!b||(P.style.left=`${Math.max(8,Math.min(q.width-P.offsetWidth-8,q.x(b.at)+14))}px`,P.style.top=`${Math.max(8,Math.min(q.height-P.offsetHeight-8,b.temperature_c==null?20:q.y(b.temperature_c)-45))}px`)},[b,C]);const $=[["当前温度",_],["所选时段最高",A.length?Math.max(...A):h?"未采集":"未获取"],["所选时段最低",A.length?Math.min(...A):h?"未采集":"未获取"]];return e.jsxs("div",{className:"modal-shell",children:[e.jsx("header",{className:"modal-header",children:e.jsxs("div",{children:[e.jsx("p",{className:"eyeline",children:"显卡温度趋势"}),e.jsxs("p",{className:"muted","data-temp-description":!0,children:[N?.name||"型号未记录"," / ",n?vn(n.state):"节点已移除"]})]})}),e.jsxs("div",{className:"chart-controls",children:[e.jsxs("label",{className:"inline-label",children:["显卡"," ",e.jsx("select",{"data-temp-gpu":!0,"aria-label":"选择显卡",value:u,onChange:P=>{z(null),c({...l,gpu:Number(P.target.value)})},children:E.length?E.map((P,q)=>e.jsxs("option",{value:P.index??0,children:["GPU ",P.index??0," · ",P.name||"未记录型号"]},`${P.index??q}:${q}`)):e.jsx("option",{value:0,children:"GPU 0 · 未采集配置"})})]}),e.jsx("div",{className:"segmented","data-temp-ranges":!0,"aria-label":"温度时间范围",children:[[30,"30 分钟"],[120,"2 小时"],[1440,"24 小时"]].map(([P,q])=>e.jsx("button",{type:"button","data-range":P,"aria-pressed":d===P,onClick:()=>{z(null),c({...l,minutes:P})},children:q},P))})]}),e.jsx("p",{className:"small muted",children:"仅展示真实采集记录；缺失区间不插值、不补造历史。当前温度需60秒内的新鲜遥测。"}),e.jsx("div",{className:"temperature-stats","data-temp-stats":!0,children:$.map(([P,q])=>e.jsxs("div",{className:"temperature-stat",children:[e.jsx("label",{children:P}),e.jsxs("strong",{children:[q,typeof q=="number"&&e.jsx("small",{children:" °C"})]})]},P))}),e.jsxs("div",{className:"chart-area",ref:S,children:[e.jsx("canvas",{ref:x,"data-temp-canvas":!0,hidden:!A.length,tabIndex:0,role:"img","aria-label":`GPU ${u}，${d}分钟真实温度历史，${A.length}个有效采集点；左右方向键查看。`,onPointerMove:P=>{const q=f.current;if(!q||!h?.points.length)return;const Z=h.from+Math.max(0,Math.min(1,(P.clientX-P.currentTarget.getBoundingClientRect().left-q.left)/q.pw))*(h.to-h.from);z(h.points.reduce((G,K,D)=>Math.abs(K.at-Z)<Math.abs((h.points[G]?.at??K.at)-Z)?D:G,0))},onPointerLeave:()=>z(null),onKeyDown:P=>{!h?.points.length||!["ArrowLeft","ArrowRight","Home","End"].includes(P.key)||(P.preventDefault(),z(P.key==="Home"?0:P.key==="End"?h.points.length-1:Math.max(0,Math.min(h.points.length-1,(k??0)+(P.key==="ArrowRight"?1:-1)))))}}),e.jsx("div",{className:"empty-state","data-temp-empty":!0,hidden:A.length>0,role:"status",children:g?e.jsxs(e.Fragment,{children:[e.jsx("b",{children:"温度历史读取失败"}),e.jsx("p",{children:g}),e.jsx("button",{type:"button",onClick:()=>{z(null),m.load()},children:"重试读取"})]}):y||!h?e.jsx("b",{children:"正在读取温度历史…"}):e.jsxs(e.Fragment,{children:[e.jsx("b",{children:"暂无有效温度记录"}),e.jsx("p",{children:"未开始采集、旧版 Worker 未上报或驱动不支持；不显示 0°C。"})]})}),e.jsx("div",{ref:w,className:"chart-tooltip",hidden:!b||!A.length,role:"status",children:C})]}),e.jsxs("footer",{className:"modal-footer",children:[e.jsxs("span",{className:"chart-key",children:[e.jsx("i",{}),e.jsxs("span",{"data-temp-key":!0,children:["GPU ",u," 温度"]})]}),e.jsx("span",{"data-temp-note":!0,children:h?`${Xe(h.from)} — ${Xe(h.to)}${n&&!_e(n)?" · 离线，历史非实时":""}`:""}),e.jsx("span",{className:"keyboard-hint",children:"左右键查看采集点 · Esc关闭"})]})]})}function Qr({capabilities:n}){const[t,s]=p.useState(null),[a,i]=p.useState(0),r=p.useRef(null),l=p.useRef(null),c=p.useRef(new Set),u=Math.max(1,Math.ceil((t?.length||0)/et));p.useEffect(()=>{const v=c.current;return()=>{v.forEach(h=>URL.revokeObjectURL(h)),v.clear()}},[]);const d=v=>{i(v),(v===0||v===u-1)&&l.current?.focus({preventScroll:!0}),l.current&&(l.current.scrollTop=0,l.current.scrollLeft=0)},m=()=>{if(t==null)return;const v=URL.createObjectURL(new Blob([t],{type:"application/json;charset=utf-8"}));c.current.add(v);const h=document.createElement("a");h.href=v,h.download="worker-capabilities.json",h.click()};return e.jsxs("details",{className:V.capabilities,"data-capabilities":!0,onToggle:v=>{v.currentTarget.open&&r.current==null&&(r.current=JSON.stringify(n,null,2),s(r.current))},children:[e.jsx("summary",{children:"完整能力与配置（最后上报，非实时配置证据）"}),t!=null&&e.jsxs("div",{children:[e.jsx("p",{className:"small muted",children:"按页查看完整快照；下载可获取全部 JSON，自动刷新不会改变当前快照。"}),e.jsxs("div",{className:"f-toolbar",children:[e.jsx("button",{type:"button","data-config-prev":!0,disabled:a===0,onClick:()=>d(a-1),children:"上一页"}),e.jsxs("span",{className:"small muted","data-config-page":!0,role:"status",children:["第 ",a+1," / ",u," 页"]}),e.jsx("button",{type:"button","data-config-next":!0,disabled:a===u-1,onClick:()=>d(a+1),children:"下一页"}),e.jsx("button",{type:"button","data-config-download":!0,onClick:m,children:"下载完整 JSON"})]}),e.jsx("pre",{ref:l,className:"capabilities-json",tabIndex:0,"aria-label":"当前页能力与配置",children:Nr(t,a)})]})]})}function Dt({items:n}){return n.length?e.jsx("ul",{className:"inventory-list",children:n.map((t,s)=>e.jsx("li",{children:t},`${s}:${t}`))}):e.jsx("p",{className:"muted small",children:"无"})}function At({items:n,unknown:t}){return t?e.jsx("p",{className:"muted small",children:"模型清单未知，无法判断"}):n.length?e.jsx("ul",{className:"inventory-list",children:n.map((s,a)=>e.jsxs("li",{children:[s.name||"未命名模型",e.jsxs("span",{children:[s.node_class||"未知节点"," · ",s.input||"未知输入"]})]},`${a}:${s.name}`))}):e.jsx("p",{className:"muted small",children:"无"})}function el({worker:n,snapshot:t}){const s=n.capability_comparison||{},a=gt(n,t.comparisonBaseline),i=s.model_inventory_status==="unknown",r=s.missing_node_classes||[],l=s.extra_node_classes||[],c=s.missing_models||[],u=s.extra_models||[];return["none","ambiguous"].includes(t.comparisonBaseline.status||"")||!s.status||s.status==="unknown"&&i&&!r.length&&!l.length?e.jsxs("section",{className:"inventory-audit",children:[e.jsx("h3",{children:"与主节点清单对比"}),e.jsxs("div",{className:"notice-box",children:[e.jsx("b",{className:a.tone,children:a.label}),e.jsxs("p",{children:[Qn(t),"。旧版 Worker 或清单字段缺失时不会猜测为完整。"]})]})]}):e.jsxs("section",{className:"inventory-audit",children:[e.jsxs("div",{className:"inventory-heading",children:[e.jsx("h3",{children:"与主节点清单对比"}),e.jsx("span",{className:"f-chip inventory-chip","data-tone":a.tone,children:a.label})]}),e.jsxs("p",{className:"muted small",children:[Qn(t),"；文件名、相对路径和版本均按精确值比较。"]}),e.jsxs("div",{className:"inventory-grid",children:[e.jsxs("div",{className:"inventory-block",children:[e.jsxs("h4",{children:["缺失节点类 ",e.jsx("span",{children:r.length})]}),e.jsx(Dt,{items:r}),e.jsxs("h4",{children:["缺失模型 ",e.jsx("span",{children:i?"未知":c.length})]}),e.jsx(At,{items:c,unknown:i})]}),e.jsxs("div",{className:"inventory-block",children:[e.jsxs("h4",{children:["额外节点类 ",e.jsx("span",{children:l.length})]}),e.jsx(Dt,{items:l}),e.jsxs("h4",{children:["额外模型 ",e.jsx("span",{children:i?"未知":u.length})]}),e.jsx(At,{items:u,unknown:i})]})]})]})}function nl({worker:n,service:t,snapshot:s,now:a,stale:i,restartUnavailable:r,onRestart:l,onClose:c}){const u=js(t.worker,n.id),d=u.data?.capabilities,[m,v]=p.useState(null),[h,g]=p.useState(""),y=r||(i?"服务状态已过期，请刷新后重试。":Ee(n)?"主节点不支持远程重启。":_e(n)?["pending","running"].includes(n.sync_status||"")?"节点已有维护操作，请等待完成。":"":"节点已离线，无法提交重启。"),x=E=>y||(n.capabilities?.[E==="reboot_host"?"supports_host_reboot":"supports_service_restart"]!==!0?"当前 Worker 不支持此操作，请先更新 Worker。":""),S=n.capabilities||{},w=S.telemetry||{},f=fs(n),k=Ln(n),z=gt(n,s.comparisonBaseline),R=[["节点角色",Ee(n)?"主节点（不参与文件同步）":"执行节点"],["清单状态",e.jsx("span",{className:z.tone,children:z.label})],["比较基准",Qn(s)],["主机",w.hostname||"未记录"],["ComfyUI",_e(n)?n.comfy_online===!0?"在线":n.comfy_online===!1?"不可用":"未获取":"非实时"],["任务接收",e.jsx("span",{className:k[1],children:k[0]})],["维护状态",ht(n)],["维护消息",Ee(n)?"此节点已排除在批量文件同步之外":n.sync_message||"未记录"],["最后心跳",`${Xe(n.last_seen)} / ${xt(n.last_seen,a)}`],["遥测时间",`${Xe(w.collected_at)} · ${ft(n,a,i)?"新鲜采集":"非实时 / 未采集"}`],["节点能力",u.loading?"正在读取…":u.error?"读取失败":d?.node_classes?`${d.node_classes.length} 个`:"未记录"],["当前任务",e.jsx(vs,{worker:n,snapshot:s})],["系统内存",`${Oe(f.used_bytes)} / ${Oe(f.total_bytes)}（最后上报）`],["IP 地址",w.ip_address?.trim()||"未记录"]];return e.jsxs(e.Fragment,{children:[e.jsxs(xe,{title:`${n.name||n.id} · 节点详情`,onClose:c,className:V.workerDialog,children:[e.jsxs("div",{className:V.workerActions,role:"group","aria-label":"节点重启操作",children:[e.jsx("button",{type:"button",disabled:!!x("restart_services"),title:x("restart_services")||"重启 ComfyUI 和 Worker，不重启电脑",onClick:()=>v("restart_services"),children:"重启服务"}),e.jsx("button",{type:"button",className:"danger",disabled:!!x("reboot_host"),title:x("reboot_host")||"重启节点所在的整台电脑",onClick:()=>v("reboot_host"),children:"重启节点"})]}),e.jsx("p",{className:"muted small",children:y||(n.capabilities?.supports_service_restart!==!0&&n.capabilities?.supports_host_reboot!==!0?"当前 Worker 不支持远程重启，请先更新 Worker。":"重启服务仅重启 ComfyUI 和 Worker；重启节点将重启整台电脑。节点收到请求后立即执行，会中断当前任务，不等待空闲。")}),h&&e.jsx("p",{className:"notice-box",role:"status",children:h}),e.jsxs("div",{className:"f-tags",children:[e.jsx("span",{className:"f-chip",children:vn(n.state)}),e.jsx("span",{className:"f-chip",children:ms(n)}),e.jsx("span",{className:"f-chip",children:hs(n)}),e.jsxs("span",{className:"f-chip",children:["Worker ID: ",n.id]})]}),e.jsx(ys,{rows:R,className:"f-definition"}),e.jsx(el,{worker:n,snapshot:s}),e.jsx("div",{className:"f-grid2",children:yn(n).map((E,N)=>e.jsxs("div",{className:"notice-box",children:[e.jsxs("b",{children:["GPU ",E.index??"未知"," · ",E.name||"未记录"]}),e.jsxs("p",{children:["最后上报：利用率"," ",oe(E.utilization_percent)==null?"未采集":`${E.utilization_percent}%`,"；显存 ",Oe(E.memory_used_bytes)," / ",Oe(E.memory_total_bytes),"；温度"," ",oe(E.temperature_c)==null?"未采集":`${E.temperature_c}°C`]})]},`${E.index??N}:${N}`))}),u.loading&&e.jsx("p",{role:"status",children:"正在读取完整节点能力与配置…"}),u.error&&e.jsxs("div",{role:"alert",children:[e.jsxs("p",{children:["读取完整节点能力与配置失败：",u.error]}),e.jsx("button",{type:"button",onClick:u.retry,children:"重试节点详情"})]}),u.data&&(d?e.jsx(Qr,{capabilities:d}):e.jsx("p",{className:"muted small",children:"未记录完整能力与配置。"}))]}),m&&e.jsxs(xe,{title:m==="reboot_host"?"重启节点电脑":"重启节点服务",submitLabel:m==="reboot_host"?"确认重启电脑":"确认重启服务",onClose:()=>v(null),onSubmit:async()=>{const E=x(m);if(E)throw new Error(E);await l(m),g(`${m==="reboot_host"?"电脑重启":"服务重启"}请求已提交，节点收到请求后立即执行，会中断当前任务；恢复状态以节点实际回报为准。`)},children:[e.jsxs("p",{children:["目标节点：",e.jsx("strong",{children:n.name||n.id})]}),e.jsx("div",{className:"notice-box",children:m==="reboot_host"?"此操作会重启该节点所在的整台 Windows 电脑，会强制关闭程序，未保存内容可能丢失，所有服务都会暂时离线。电脑恢复后，ComfyUI 和 Worker 是否自动启动取决于该电脑的启动配置。":"此操作只重启该节点的 ComfyUI 和 Worker 服务，不会重启 Windows 电脑，不同步文件或更新代码。"}),e.jsx("p",{children:"节点收到请求后立即执行，会中断当前任务，不等待空闲；提交后暂停向该节点分配新任务。请求已接收不代表重启已完成，请查看节点维护状态。"}),m==="reboot_host"&&e.jsxs("label",{className:"check-label",children:[e.jsx("input",{type:"checkbox",required:!0}),"我确认重启整台电脑，并已处理其他程序和未保存内容"]})]})]})}function Rt(n){return n.state==="busy"||n.state==="running"?0:n.state==="idle"?1:n.state==="offline"?3:2}function tl({snapshot:n,now:t,stale:s,mutationDisabled:a,deletingWorker:i,onDetails:r,onTemperature:l,onDelete:c,onSync:u,selectedIds:d,onSelection:m,teams:v}){const h=[...n.workers].sort((g,y)=>Rt(g)-Rt(y));return e.jsx(e.Fragment,{children:h.length?h.map(g=>{const y=ft(g,t,s),x=yn(g),S=fs(g),w=vn(g.state),f=Ln(g),k=gt(g,n.comparisonBaseline),z=!!(g.capability_comparison?.missing_models?.length||g.capability_comparison?.missing_node_classes?.length),R=xs(g,n.comparisonBaseline),E=gi(g,t),N=v?.find(_=>_.id===E.team_id)?.name,A=_e(g)?g.comfy_online===!0?"ComfyUI 在线":g.comfy_online===!1?"ComfyUI 不可用":"ComfyUI 未获取":"ComfyUI 非实时";return e.jsxs("article",{className:V.workerCard,"data-worker-card":g.id,"data-worker-state":g.state||"unknown","data-selected":d?.has(g.id)?"true":void 0,"aria-label":g.name||g.id,children:[e.jsxs("div",{className:V.workerIdentityBlock,children:[e.jsxs("header",{className:V.workerHeader,children:[m?e.jsxs("label",{className:`${V.workerName} ${V.workerSelection}`,"data-worker-name":!0,children:[e.jsx("input",{type:"checkbox","aria-label":`选择设备 ${g.name||g.id}`,checked:d?.has(g.id)??!1,disabled:a,onChange:_=>m(g,_.target.checked)}),e.jsx("strong",{children:g.name||"未命名执行端"})]}):e.jsx("div",{className:V.workerName,"data-worker-name":!0,children:e.jsx("strong",{children:g.name||"未命名执行端"})}),e.jsx("span",{className:V.workerState,"data-state":g.state,children:w})]}),e.jsxs("div",{className:V.workerVersions,children:[Ee(g)&&e.jsx("span",{className:"f-chip",children:"主节点"}),e.jsx("span",{children:ms(g)}),e.jsx("span",{children:hs(g)})]}),e.jsxs("p",{className:V.workerAccess,"data-worker-access":!0,children:["使用范围：",E.team_id?`项目组专用 · ${N||E.team_id}（所有成员）`:"公共",E.team_id&&(E.expires_at===null?" · 手动解除":` · ${new Date(E.expires_at*1e3).toLocaleString("zh-CN",{hour12:!1})} 到期恢复公共`)]})]}),e.jsxs("div",{className:V.workerResources,children:[x.map((_,b)=>e.jsx(Lt,{gpu:_,ram:void 0,live:y},`${_.index??b}:${b}`)),!x.length&&e.jsx("p",{className:V.telemetryNote,children:"未采集 GPU 指标"}),e.jsx(Lt,{gpu:void 0,ram:S,live:y}),!y&&e.jsx("p",{className:V.telemetryNote,children:_e(g)?"遥测未采集或已过期":"非实时，不沿用旧读数"}),e.jsxs("div",{className:V.workerService,children:[e.jsx("span",{"data-tone":g.comfy_online===!1&&_e(g)?"bad":void 0,children:A}),e.jsx("span",{"data-tone":f[1],children:f[0]})]})]}),e.jsxs("div",{className:V.workerActivity,children:[e.jsxs("div",{className:V.workerTask,children:[e.jsx("span",{className:V.sectionLabel,children:"当前任务"}),e.jsx("div",{children:e.jsx(vs,{worker:g,snapshot:n})})]}),e.jsxs("div",{className:V.workerSync,children:[e.jsxs("div",{className:V.syncMeta,children:[e.jsx("span",{className:en(g)?"danger":"",children:ht(g)}),e.jsxs("span",{title:g.last_seen==null?"未记录":new Date(Number(g.last_seen)*1e3).toLocaleString("zh-CN",{hour12:!1}),children:["心跳 ",xt(g.last_seen,t)]})]}),!Ee(g)&&z?e.jsxs("button",{type:"button",className:V.inventoryAction,"data-tone":k.tone,"data-sync-worker":g.id,"data-focus-key":`worker-sync:${g.id}`,"aria-label":`同步设备 ${g.name||g.id}：${k.label}`,disabled:a||!!R,title:R||"仅同步这台设备；点击查看范围并确认",onClick:()=>u(g),children:[e.jsx("span",{children:k.label}),e.jsxs("span",{className:V.syncActionLabel,children:[Qe(g)?"维护中":R?"不可同步":"点击同步",e.jsx(qn,{name:"chevron"})]})]}):e.jsx("span",{className:V.inventoryLabel,"data-tone":k.tone,children:k.label}),!Ee(g)&&z&&R&&!Qe(g)&&e.jsx("p",{className:V.syncMessage,children:R}),!Ee(g)&&g.sync_message&&(en(g)||Qe(g))&&e.jsx("p",{className:V.syncMessage,role:en(g)?"alert":void 0,children:g.sync_message})]})]}),e.jsxs("footer",{className:V.cardActions,children:[e.jsx("button",{type:"button",className:"link-button","data-worker":g.id,"data-focus-key":`worker-details:${g.id}`,onClick:()=>r(g),children:"节点详情"}),e.jsx("button",{type:"button",className:"link-button","data-temperature":g.id,"data-focus-key":`worker-temperature:${g.id}`,"aria-label":`查看 ${g.name||g.id} 温度趋势`,onClick:()=>l(g.id),children:"温度趋势"}),e.jsx("button",{type:"button",className:"link-button worker-delete danger","data-delete-worker":g.id,"data-focus-key":`worker-delete:${g.id}`,"aria-label":`删除设备 ${g.name||g.id}`,disabled:a,onClick:()=>c(g),children:i===g.id?"正在删除…":"删除设备"})]})]},g.id)}):e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"还没有注册执行端"}),e.jsx("p",{children:"执行端注册并上报心跳后，将在此显示状态。"})]})})}function sl({snapshot:n,now:t,stale:s,mutationDisabled:a,teams:i,onEdit:r}){const l=bi(n?.workers??[],t);return e.jsx("section",{className:V.accessOverview,"aria-labelledby":"worker-access-title",children:e.jsxs("details",{children:[e.jsx("summary",{className:V.accessSummary,children:e.jsx("h3",{id:"worker-access-title",children:"已设置的使用范围"})}),e.jsx("p",{className:"muted small",children:"查看当前设备分配，点击“修改设置”可调整项目组、每日专用时段和结束时间，也可恢复公共。时段外公开，但保留每日规则供修改。"}),s&&e.jsx("p",{role:"status",children:"当前为上次快照，刷新成功后才能修改。"}),i.error&&l.some(c=>c.team_id)&&e.jsxs("p",{role:"alert",children:[i.error,"；专用设置仍保留，下方暂显示项目组 ID。",e.jsx("button",{type:"button",disabled:i.loading,onClick:i.retry,children:"重试加载项目组"})]}),n?l.length?e.jsx("div",{className:V.accessTableWrap,children:e.jsxs("table",{className:V.accessTable,"aria-label":"当前设备使用范围",role:"table",children:[e.jsx("thead",{role:"rowgroup",children:e.jsx("tr",{role:"row",children:["使用范围","设备","到期时间","操作"].map(c=>e.jsx("th",{scope:"col",role:"columnheader",children:c},c))})}),e.jsx("tbody",{role:"rowgroup",children:l.map(c=>{const u=JSON.stringify([c.team_id,c.expires_at,c.daily_window??null]),d=i.teams?.find(m=>m.id===c.team_id);return e.jsxs("tr",{role:"row",children:[e.jsxs("td",{role:"cell",children:[e.jsx("span",{className:V.accessCellLabel,"aria-hidden":"true",children:"使用范围"}),e.jsxs("div",{children:[e.jsx("strong",{children:c.team_id?is(c.daily_window,t)?"项目组专用":"公共（专用时段外）":"公共"}),c.team_id&&e.jsxs("p",{children:[d?.name??`项目组 ${c.team_id}`,i.loading?"（名称读取中）":!d&&!i.error?"（未在当前项目组列表中）":"",e.jsx("span",{className:"muted small",children:" · 所有成员"})]})]})]}),e.jsxs("td",{role:"cell",children:[e.jsx("span",{className:V.accessCellLabel,"aria-hidden":"true",children:"设备"}),e.jsxs("div",{children:[e.jsxs("span",{className:"muted small",children:[c.workers.length," 台设备"]}),e.jsx("ul",{"aria-label":"该范围内的设备",children:c.workers.map(m=>e.jsx("li",{children:m.name||m.id},m.id))})]})]}),e.jsxs("td",{role:"cell",children:[e.jsx("span",{className:V.accessCellLabel,"aria-hidden":"true",children:"到期时间"}),c.daily_window&&e.jsxs("p",{children:["每天 ",c.daily_window.start,"—",c.daily_window.end,c.daily_window.start>c.daily_window.end?"（跨午夜）":"",e.jsxs("span",{className:"muted small",children:[" ","· ",c.daily_window.time_zone," · 时段外公共"]})]}),e.jsx("span",{children:c.team_id?c.expires_at===null?"不自动到期（手动解除）":`${new Date(c.expires_at*1e3).toLocaleString("zh-CN",{hour12:!1})} 到期恢复公共`:"不限制"})]}),e.jsxs("td",{role:"cell",children:[e.jsx("span",{className:V.accessCellLabel,"aria-hidden":"true",children:"操作"}),e.jsx("button",{type:"button","data-focus-key":`worker-access-group:${u}`,disabled:a,onClick:()=>r(c.workers),children:"修改设置"})]})]},u)})})]})}):e.jsx("p",{children:"暂无设备，设备注册后会在这里显示当前使用范围。"}):e.jsx("p",{children:s?"使用范围读取失败，请重试读取。":"正在读取已设置的使用范围…"})]})})}function Lt({gpu:n,ram:t,live:s}){const a=[...n?[{label:`GPU ${n.index??""} 显存`,short:"显存",used:n.memory_used_bytes,total:n.memory_total_bytes,kind:"vram"}]:[],...t?[{label:"系统内存",short:"系统内存",used:t.used_bytes,total:t.total_bytes,kind:"ram"}]:[]].map(r=>{const l=oe(r.used),c=oe(r.total),u=s&&l!=null&&l>=0&&c!=null&&c>0?Math.max(0,Math.min(100,l/c*100)):null;return{...r,value:u}}),i=s&&n?oe(n.temperature_c):null;return e.jsx("div",{className:V.resourceRow,children:e.jsxs("div",{className:V.resourceReadings,children:[n&&e.jsxs("strong",{className:V.resourceTitle,children:[e.jsxs("span",{children:["GPU ",n.index??"未知"," · ",n.name||"未记录型号"]}),e.jsx("span",{children:i==null?"温度未采集":`${i}°C`})]}),a.map(r=>e.jsxs("div",{className:V.resourceReading,"data-resource":r.kind,role:r.value==null?void 0:"meter","aria-label":r.label,"aria-valuemin":r.value==null?void 0:0,"aria-valuemax":r.value==null?void 0:100,"aria-valuenow":r.value??void 0,"aria-valuetext":r.value==null?void 0:`${Oe(r.used)} / ${Oe(r.total)}，${Math.round(r.value)}%`,children:[e.jsx("span",{className:V.resourceLabel,children:r.short}),e.jsx("span",{children:s?`${Oe(r.used)} / ${Oe(r.total)}`:"非实时 / 未采集"}),e.jsx("b",{children:r.value==null?"—":`${Math.round(r.value)}%`}),e.jsx("div",{className:V.resourceBar,"data-resource-bar":!0,"aria-hidden":"true",children:r.value!=null&&e.jsx("i",{"data-resource-fill":!0,style:{width:`${r.value}%`}})})]},r.kind)),t&&e.jsx("span",{className:V.resourceNote,children:s?"系统可见容量":"最后配置见详情"})]})})}function al({snapshot:n,now:t,onDetails:s}){const a=n.workers.filter(i=>!_e(i)||en(i)||["disabled","error"].includes(i.state||""));return a.length?e.jsx(e.Fragment,{children:a.map(i=>e.jsxs("button",{type:"button",className:"attention-item","data-worker":i.id,"data-focus-key":`worker-attention:${i.id}`,onClick:()=>s(i),children:[e.jsxs("span",{className:"attention-top",children:[e.jsx("strong",{className:"danger",children:i.name||i.id}),e.jsx(qn,{name:"chevron"})]}),e.jsx("b",{className:"danger",children:_e(i)?en(i)?"节点同步失败":vn(i.state):"已离线"}),e.jsx("p",{children:_e(i)?en(i)&&i.sync_message?i.sync_message:`${Ln(i)[0]}；查看完整节点详情。`:`最后心跳 ${xt(i.last_seen,t)}`})]},i.id))}):e.jsx("p",{className:"muted small",children:"当前没有需要关注的节点异常。"})}function il(n){const{state:t,store:s,service:a,automatic:i,setAutomatic:r,clock:l}=Ur(n),[c,u]=p.useState(!1),d=Za(n.http,c||!!t.snapshot?.workers.some(T=>T.access_team_id)),m=p.useMemo(()=>fi(n.http),[n.http]),{snapshot:v,stale:h,loading:g,error:y,isolated:x,mutation:S,deletingWorker:w}=t,[f,k]=p.useState(null),[z,R]=p.useState(!1),[E,N]=p.useState(()=>new Set),A=v?.workers.filter(T=>E.has(T.id))??[],_=!!v?.workers.length&&A.length===v.workers.length,b=A.length>0&&!_,{history:C}=t,$=C.filter,P=kr(v,Math.max(l,Date.now())),q=v?.health||{},Z=v?.status||{},G=n.sandbox||x||h||!v||S!=null,K=()=>k(null),D=T=>{v&&k({kind:"worker",worker:T,snapshot:v})},j=T=>{if(n.sandbox||!s.canMutate()){n.notify({message:"当前不可更新：隔离副本或服务状态未就绪。",tone:"warning"});return}T.kind==="access"&&u(!0),k(T)},M=()=>{if(n.sandbox||!s.canMutate())throw new Error("隔离副本或服务状态未就绪，禁止修改设备")},O=q.ok===!0?"运行正常":q.ok===!1?"异常":"状态未知",ae=q.comfy_online===!0?"可用":q.comfy_online===!1?"不可用":"状态未知",se=[["运行模式",q.mode==="controller"?"Linux 中间层 / Controller":q.mode==="local"?"Windows 单机":q.mode||"未获取"],["可用能力",oe(q.capabilities)==null?"未获取":`${q.capabilities} 项`],["任务记录",oe(q.jobs)==null?"未获取":`${q.jobs} 条`],["大模型接口",q.llm?q.llm.ok?`已配置 · ${q.llm.model||"型号未记录"}`:"未配置":"未获取"],["页面地址",location.origin+"/controller"],["创作画布",location.origin+"/"]],U=Fr(v,C);return e.jsxs("main",{id:"main",className:V.page,tabIndex:-1,"aria-busy":g?!0:void 0,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"运行面板"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{className:"subtitle",id:"service-subtitle",children:v?`中间层${O} / ComfyUI ${ae}`:"正在读取中间层运行状态"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{className:"muted small",id:"refresh-state",role:"status",children:g?"正在读取…":h?"连接失败 · 快照非实时":v?`最后刷新 ${new Date(v.receivedAt).toLocaleTimeString("zh-CN",{hour12:!1})}`:"正在加载…"}),e.jsxs("label",{className:"check-label",children:[e.jsx("input",{id:"auto-refresh",type:"checkbox",checked:i,onChange:T=>r(T.target.checked)}),"每5秒刷新"]}),e.jsxs("button",{type:"button",className:"primary",id:"refresh",disabled:g||S!=null,onClick:()=>{s.refreshAll()},children:[e.jsx(qn,{name:"refresh"}),"立即刷新"]}),e.jsx("button",{type:"button",id:"sync-all",disabled:G,title:n.sandbox||x?"本地隔离数据副本禁止节点同步，不能修改正式机器。":void 0,onClick:()=>j({kind:"sync"}),children:"一键更新全部节点"})]})]}),e.jsxs("div",{id:"error",className:"f-error",role:"alert",hidden:!y,children:[e.jsxs("div",{children:[e.jsx("b",{id:"error-message",children:y}),e.jsx("p",{children:"已载入内容仅为上次快照，不能作为实时状态；未知数据不记为零。"})]}),e.jsx("button",{type:"button",id:"retry",disabled:g||S!=null,onClick:()=>{s.refreshAll()},children:"重试读取"})]}),e.jsxs("section",{className:`metrics f-metrics6 ${V.overview}`,"aria-label":"运行概览",children:[e.jsx(Ge,{id:"service",label:"中间层服务",value:q.ok===!0?"运行正常":q.ok===!1?"异常":"未获取",compact:!0,tone:q.ok===!0?"ok":q.ok===!1?"bad":"",noteId:"service-mode",note:q.mode==="controller"?"Controller 模式":q.mode==="local"?"Windows 单机":q.mode||"等待服务响应"}),e.jsx(Ge,{id:"workers",label:"在线执行端",value:v?`${Be(q.online_workers)} / ${Be(q.workers)}`:"未获取",note:"含禁用与同步中的在线节点"}),e.jsx(Ge,{id:"running",label:"正在运行",value:Be(Z.running_count),note:"由中间层调度的任务"}),e.jsx(Ge,{id:"queued",label:"排队任务",value:Be(Z.queued_count),note:"等待可用执行端"}),e.jsx(Ge,{id:"comfy",label:"ComfyUI",value:q.comfy_online===!0?"可用":q.comfy_online===!1?"不可用":"未获取",compact:!0,tone:q.comfy_online===!0?"ok":q.comfy_online===!1?"bad":"",note:"单节点状态见下方卡片"}),e.jsx(Ge,{id:"uptime",label:"服务运行时间",value:oe(q.started_at)!=null&&oe(q.server_time)!=null?mt(Number(q.server_time)-Number(q.started_at)):"未获取",compact:!0,note:"本次中间层服务启动至今"})]}),e.jsxs("div",{className:"dashboard-grid",children:[e.jsxs("section",{className:"card","aria-labelledby":"workers-title",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"workers-title",children:"Windows 执行端"}),e.jsx("p",{className:"section-subtitle",children:"设备资源、当前任务与同步状态"})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{className:"muted small",id:"worker-count",children:v?`${v.workers.length} 台 / ${v.workers.filter(_e).reduce((T,W)=>T+yn(W).length,0)} 张在线GPU`:"正在读取"}),e.jsx("button",{type:"button","data-focus-key":"worker-commands",onClick:()=>{k(null),R(!0)},children:"远程命令"})]})]}),e.jsx(sl,{snapshot:v,now:P,stale:h,mutationDisabled:G,teams:d,onEdit:T=>{N(new Set(T.map(W=>W.id))),j({kind:"access",workers:T})}}),e.jsxs("div",{className:V.selectionToolbar,role:"group","aria-label":"设备使用范围批量操作",children:[e.jsxs("label",{className:V.selectAll,children:[e.jsx("input",{type:"checkbox","aria-label":"全选设备","aria-checked":b?"mixed":_,checked:_,ref:T=>{T&&(T.indeterminate=b)},disabled:G||!v?.workers.length,onChange:T=>{G||N(new Set(T.target.checked?v?.workers.map(W=>W.id):[]))}}),"全选设备"]}),e.jsxs("span",{role:"status","aria-live":"polite",children:["已选 ",A.length," 台"]}),e.jsx("button",{type:"button",className:"primary","data-focus-key":"worker-access-batch",disabled:G||A.length===0,onClick:()=>{A.length&&j({kind:"access",workers:A})},children:"批量设置使用范围"}),e.jsx("button",{type:"button",disabled:G||A.length===0,onClick:()=>N(new Set),children:"清除选择"})]}),e.jsx("div",{id:"worker-rows",className:V.workerGrid,children:v?e.jsx(tl,{snapshot:v,now:P,stale:h,mutationDisabled:G,deletingWorker:w,onDetails:D,onTemperature:T=>k({kind:"temperature",id:T}),onDelete:T=>j({kind:"delete",worker:T}),onSync:T=>j({kind:"syncWorker",worker:T}),selectedIds:E,onSelection:(T,W)=>{G||N(ne=>{const ge=new Set(ne);return W?ge.add(T.id):ge.delete(T.id),ge})},teams:d.teams}):e.jsx("p",{className:"loading-note",children:y?"执行端读取失败，请点击“重试读取”。":"正在读取执行端…"})}),e.jsx("p",{className:"table-note",children:"显存与内存分条显示，多显卡逐卡列出，系统内存不重复。离线或过期读数不作实时数据。点击清单差异可仅同步该设备。"})]}),e.jsxs("aside",{className:"right-column","aria-label":"需要关注及配置",children:[e.jsxs("section",{className:"card",children:[e.jsx("div",{className:"section-heading",children:e.jsxs("h2",{className:"heading-inline",children:[e.jsx("span",{className:"danger",id:"attention-icon",children:e.jsx(qn,{name:"alert"})}),"需要关注"]})}),e.jsx("div",{className:"attention-list",id:"attention-list",tabIndex:0,role:"region","aria-label":"需要关注的节点列表",children:v?e.jsx(al,{snapshot:v,now:P,onDetails:D}):e.jsx("p",{className:"muted small",children:y?"节点状态未获取，不能判断是否存在异常。":"正在读取节点状态…"})})]}),e.jsxs("section",{className:"card",children:[e.jsx("div",{className:"section-heading",children:e.jsx("h2",{children:"服务配置摘要"})}),e.jsx(ys,{id:"config-rows",className:"f-config-definition",rows:se})]})]})]}),e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"最近任务"}),e.jsx("p",{className:"section-subtitle",children:"数据库历史按时间倒序分批加载；实时任务优先显示，归档未记录的信息不作推测"})]}),e.jsxs("label",{className:"filter-label",children:["任务状态",e.jsxs("select",{id:"jobs-filter",value:$,onChange:T=>{const W=li.safeParse(T.target.value);W.success&&s.setHistoryFilter(W.data)},children:[e.jsx("option",{value:"all",children:"全部状态"}),["running","queued","done","error","canceled"].map(T=>e.jsx("option",{value:T,children:ps[T]},T))]})]})]}),e.jsx("div",{className:"table-wrap f-job-scroll",role:"region","aria-label":"最近任务列表","aria-describedby":"job-note","aria-busy":!!C.loading,tabIndex:0,onScroll:T=>{const{scrollHeight:W,scrollTop:ne,clientHeight:ge}=T.currentTarget;W-ne-ge<=160&&!C.error&&s.loadMore()},children:e.jsxs("table",{className:"jobs-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["状态","姓名 / 项目 / 卡片","模式","过程进度 / 步骤","执行端","创建时间","耗时 / 错误"].map(T=>e.jsx("th",{scope:"col",children:T},T))})}),e.jsx("tbody",{id:"job-rows",children:e.jsx(Hr,{snapshot:v,now:P,items:U,onError:T=>k({kind:"job",job:T})})})]})}),e.jsxs("div",{className:V.historyControls,children:[e.jsxs("p",{className:"table-note",id:"job-note",role:"status","aria-live":"polite",children:[C.loading?C.loading==="more"?"正在加载更多历史…":"正在刷新任务历史…":C.initialized?C.hasMore?"向下滚动或点击加载更多。":"历史记录已加载完毕。":"任务历史尚未载入。",` 当前筛选历史共 ${C.total??"未知"} 条，已加载 ${C.jobs.length} 条；合并实时任务后显示 ${U.length} 条。`]}),C.error&&e.jsx("p",{role:"alert",children:C.error}),C.error?e.jsx("button",{type:"button",disabled:!!C.loading,onClick:()=>{s.retryHistory()},children:"重试任务历史"}):e.jsx("button",{type:"button","aria-controls":"job-rows",disabled:!!C.loading||!C.hasMore,onClick:()=>{s.loadMore()},children:"加载更多历史"})]})]})]}),e.jsx(Rr,{context:n,open:z,workers:v?.workers??[],canMutate:s.canMutate,unavailable:G,onClose:()=>R(!1)}),f?.kind==="worker"&&e.jsx(nl,{service:a,worker:v?.workers.find(T=>T.id===f.worker.id)||f.worker,snapshot:v||f.snapshot,now:P,stale:h,restartUnavailable:n.sandbox||x?"隔离副本禁止重启真实设备。":S!=null?"设备操作正在提交，请稍候。":!v||h?"服务状态未就绪，请刷新后重试。":v.workers.some(T=>T.id===f.worker.id)?"":"该设备已移除或已被新的注册替代。",onRestart:async T=>{M(),await s.restartWorker(f.worker.id,T)},onClose:K},f.worker.id),f?.kind==="access"&&e.jsx(xr,{workers:f.workers,now:P,teams:d,unavailable:n.sandbox||x?"隔离副本禁止修改设备使用范围。":S!=null?"设备操作正在提交，请稍候。":!v||h?"服务状态未就绪，请刷新后重试。":f.workers.some(T=>!v.workers.some(W=>W.id===T.id))?"所选设备中有设备已移除或已被新的注册替代，请关闭后重新选择。":"",onSave:async(T,W)=>{M();const ne=await s.saveAccess(T,W,m);return ne.failed.length===0&&n.notify({message:"设备使用范围已保存，已有任务不中断。",tone:"success"}),ne},onClose:K},JSON.stringify(f.workers.map(T=>T.id).sort())),f?.kind==="temperature"&&e.jsx(Kr,{workerId:f.id,worker:v?.workers.find(T=>T.id===f.id),service:a,now:P,stale:h,revision:t.refreshed,onClose:K}),f?.kind==="job"&&e.jsx(rl,{job:f.job,service:a,onClose:K},f.job.id),f?.kind==="syncWorker"&&e.jsxs(xe,{title:"同步单台设备",onClose:K,submitLabel:"确认同步此设备",onSubmit:async()=>{M(),await s.syncWorker(f.worker.id),n.notify({message:`同步请求已提交至“${f.worker.name||f.worker.id}”，等待设备空闲后执行；完成情况以节点反馈为准。`,tone:"success"})},children:[e.jsxs("p",{children:["仅同步这一台设备“",f.worker.name||f.worker.id,"”（",f.worker.id,"），不更新其他设备。"]}),e.jsx("div",{className:"notice-box",children:"设备空闲后同步主节点的 ComfyUI 核心、models 和 user，拉取 chouka 最新代码，再按本机 GPU 启动配置重启 ComfyUI 与 Worker，不重启 Windows。同步会复制或覆盖对应文件，并非仅补齐缺失项；不会清除设备上的全部额外资源。"}),e.jsx("p",{children:"忙碌时等待当前任务结束，不立即中断任务。请求提交不代表同步已完成；同步结束后需重新采集清单核对。"})]}),f?.kind==="sync"&&e.jsxs(xe,{title:"更新全部节点",onClose:K,submitLabel:"确认更新",onSubmit:async()=>{M();const T=await s.syncAll();n.notify({message:`已向 ${Be(T.worker_count)} 个节点下发更新请求；主节点跳过 ${Be(T.primary_count)} 个，旧版跳过 ${Be(T.skipped_count)} 个。`,tone:"success"})},children:[e.jsx("p",{children:"确认更新全部节点？"}),e.jsx("div",{className:"notice-box",children:"节点空闲后依次同步 ComfyUI 核心、models 和 user，拉取 chouka 最新代码，再按本机 GPU 启动配置重启 ComfyUI 与 Worker。全部服务恢复就绪后才显示完成。忙碌节点等待当前任务结束；离线节点下次上线后执行。主节点作为同步源不会参与更新；旧版节点会跳过，需先手动更新一次 Worker 及配套启动文件。"}),e.jsx("p",{className:"muted small",children:"这是实际节点更新和服务重启操作，确认后将向中间层提交请求。"})]}),f?.kind==="delete"&&e.jsxs(xe,{title:"删除设备",onClose:K,submitLabel:"确认删除设备",onSubmit:async()=>{M(),await s.deleteWorker(f.worker.id),n.notify({message:"设备已删除，历史任务和账单保留。",tone:"success"})},children:[e.jsxs("p",{children:["确认删除设备“",f.worker.name||"未命名执行端","”？"]}),e.jsx("div",{className:"notice-box",children:"设备会从列表中移除，历史任务和账单不会删除。设备后续重新注册时会重新出现。"})]})]})}function rl({job:n,service:t,onClose:s}){const a=js(t.job,n.history_only===!0?null:n.id),i=n.history_only===!0?n:a.data;return e.jsxs(xe,{title:"任务错误详情",onClose:s,children:[e.jsxs("p",{children:["任务 ",n.id]}),e.jsx("pre",{children:(i??n).error||"未记录错误详情"}),a.loading&&e.jsx("p",{role:"status",children:"正在读取完整任务执行记录…"}),a.error&&e.jsxs("div",{role:"alert",children:[e.jsxs("p",{children:["读取完整任务执行记录失败：",a.error]}),e.jsx("button",{type:"button",onClick:a.retry,children:"重试任务执行记录"})]}),i&&e.jsxs("details",{children:[e.jsx("summary",{children:"任务执行记录"}),e.jsx("pre",{children:JSON.stringify(i,null,2)})]})]})}function Ge({id:n,label:t,value:s,note:a,noteId:i,compact:r=!1,tone:l=""}){return e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:t}),e.jsx("p",{className:`metric-value${r?" compact":""}${l?` ${l}`:""}`,id:n,children:s}),e.jsx("p",{className:"metric-note",id:i,children:a})]})})}const dn=De([I().min(1),Y().finite()]).transform(String),sn=Pe(["user","admin","monitor"]),hn=Pe(["read","operate"]),ll=F({id:dn,username:I(),display_name:I().nullish(),phone:I().nullish(),role:sn,enabled:ie(),team_leader:ie().default(!1),approval_status:I().optional(),local_login_enabled:ie().optional(),dinghai_identity:ia.optional()}),ol=F({id:I().min(1),name:I().nullish(),owner_id:dn,owner_username:I().nullish(),owner_display_name:I().nullish(),team_id:I().nullish(),team_name:I().nullish()}),Ft=De([F({scope:ve("all"),viewer_id:dn,permission:hn}),F({scope:ve("owner").optional(),viewer_id:dn,owner_id:dn.refine(n=>n!=="*","无效所有者"),permission:hn})]),cl=F({requests:B(F({username:I(),display_name:I().nullish(),status:I(),created_at:Y().nullish(),decided_by:I().nullish()})),outbox:F({pending:Y().int().nonnegative(),oldest_at:Y().nullish()}).nullish()}),_s={admin:"管理员",user:"普通用户",monitor:"监控展示员"},Dn={approved:"已通过",pending:"待审批",rejected:"已拒绝"},En="全部个人和项目组画布，包括现有及未来新增画布",ws="画布内容和历史费用不变。新所有者的授权访问者将获得相应权限（可操作包含删除）；原所有者及其授权访问者可能失去访问权限。管理员仍可访问全部画布。项目组画布由成员关系授权，不能改为个人归属。";function xn(n){return(n?.username||"未知账号")+(n?.display_name?.trim()?`（${n.display_name.trim()}）`:"")}function qe(n,t){return`${xn(n.find(s=>s.id===t))}（ID: ${t}）`}function nt(n,t){const s=t.find(a=>a.id===n.owner_id);return xn({username:n.owner_username||s?.username,display_name:n.owner_display_name||s?.display_name})}function tt(n){return n==="operate"?"可操作（含删除）":"只读"}function ks(n){return n?new Date(n*1e3).toLocaleString("zh-CN",{hour12:!1}):"—"}const Ae=I().min(1).max(512).refine(n=>n!=="*","无效账号 ID"),Ns=I().min(8,"密码至少 8 位").max(1024),dl=F({username:I().trim().min(1,"请输入账号名").max(128),password:Ns,role:sn,team_leader:ie()}).refine(n=>n.role!=="monitor"||!n.team_leader,"监控展示员不能担任组长"),pl=ca("scope",[F({scope:ve("all"),viewer_id:Ae,permission:hn}),F({scope:ve("owner"),viewer_id:Ae,owner_id:Ae,permission:hn}).refine(n=>n.viewer_id!==n.owner_id,"访问者和所有者不能是同一个账号。")]),ul=F({owner_id:Ae,projects:B(F({project_id:I().min(1).max(512),owner_id:Ae})).min(1,"请选择画布").max(1e3,"每次最多分配 1000 个画布")}).refine(n=>new Set(n.projects.map(t=>t.project_id)).size===n.projects.length,"画布分配清单存在重复项"),ml=F({role:sn.optional(),enabled:ie().optional(),team_leader:ie().optional(),display_name:I().trim().min(1,"请输入本地姓名 / 花名").max(64).optional(),phone:I().regex(/^(?:1[3-9]\d{9})?$/,"请输入有效的 11 位手机号，或留空清除").optional()}).strict().refine(n=>Object.values(n).some(t=>t!==void 0),"请选择修改内容"),Ot=F({}).passthrough(),Ut=n=>`/api/admin/global-grants/${encodeURIComponent(Ae.parse(n))}`,Wt=n=>`/api/admin/users/${encodeURIComponent(Ae.parse(n))}`;function hl(n){const t=async(s,a,i)=>{Ot.parse(await n.json(s,a,i))};return{async snapshot(s){const a={signal:s,cache:"no-store"},[i,r,l]=await Promise.all([n.read("/api/admin/users",F({users:B(ll)}),a),n.read("/api/admin/grants",F({grants:B(Ft)}),a),n.read("/api/projects",F({projects:B(ol)}),a)]);return{users:i.users,grants:r.grants,projects:l.projects}},dispatchPriority:s=>n.read("/api/admin/dispatch-priority",F({enabled:ie()}),{signal:s,cache:"no-store"}),setDispatchPriority:s=>t("/api/admin/dispatch-priority","PUT",{enabled:ie().parse(s)}),registrations:s=>n.read("/api/admin/registrations",cl,{signal:s,cache:"no-store"}),create:s=>t("/api/admin/users","POST",dl.parse(s)),update:(s,a)=>t(Wt(s),"PATCH",ml.parse(a)),resetPassword:(s,a)=>t(`${Wt(s)}/password`,"POST",{password:Ns.parse(a)}),saveGrant:s=>{const a=pl.parse(s);return a.scope==="all"?t(Ut(a.viewer_id),"PUT",{permission:a.permission}):t("/api/admin/grants","PUT",{viewer_id:a.viewer_id,owner_id:a.owner_id,permission:a.permission})},async revokeGrant(s){const a=Ft.parse(s),i=a.scope==="all"?Ut(a.viewer_id):`/api/admin/grants/${encodeURIComponent(Ae.parse(a.viewer_id))}/${encodeURIComponent(Ae.parse(a.owner_id))}`;Ot.parse(await n.request(i,{method:"DELETE"}))},async assign(s){const a=await n.json("/api/admin/projects/assign","POST",ul.parse(s));return F({count:Y().int().nonnegative()}).parse(a).count}}}function Le(n,t){const s=new FormData(n).get(t);if(typeof s!="string")throw new Error("表单字段不正确："+t);return s}function xl(n,t,s){const a=t.trim().toLowerCase();return n.filter(i=>(!s||i.owner_id===s)&&(!a||(i.name||"").toLowerCase().includes(a)||i.id.toLowerCase().includes(a)))}function fl(n,t){const s=n.filter(i=>!i.team_id),a=s.filter(i=>t.has(i.id)).length;return{personal:s,checked:s.length>0&&a===s.length,indeterminate:a>0&&a<s.length}}function gl(n,t,s,a){const i=n.find(r=>r.id===t);if(!i||i.role==="monitor"||s!=="*"&&!n.some(r=>r.id===s))throw new Error("请选择有效账号和授权范围。");if(t===s)throw new Error("访问者和所有者不能是同一个账号。");return s==="*"?{scope:"all",viewer_id:t,permission:a}:{scope:"owner",viewer_id:t,owner_id:s,permission:a}}function bl(n,t,s,a){const i=n.find(l=>l.id===a&&l.enabled&&l.role!=="monitor");if(!i)throw new Error("请选择有效的启用目标账号。");if(!s.size)throw new Error("请选择个人画布。");if(s.size>1e3)throw new Error("每次最多分配 1000 个画布，请缩小筛选范围后再选择。");const r=t.filter(l=>s.has(l.id));if(r.length!==s.size||r.some(l=>l.team_id))throw new Error("选择包含项目组画布或已变化的画布，请刷新后重新选择。");return{target:i,chosen:r.map(l=>({...l})),payload:{owner_id:i.id,projects:r.map(l=>({project_id:l.id,owner_id:l.owner_id}))}}}function jl({http:n,notify:t}){const s=p.useMemo(()=>hl(n),[n]),[a,i]=p.useState({users:[],projects:[],grants:[]}),[r,l]=p.useState(null),[c,u]=p.useState(null),[d,m]=p.useState(""),[v,h]=p.useState(!1),[g,y]=p.useState(!0),[x,S]=p.useState(!1),[w,f]=p.useState(""),[k,z]=p.useState("正在加载真实数据…"),[R,E]=p.useState(new Set),[N,A]=p.useState(""),_=p.useRef(!1),b=p.useRef(!1),C=p.useRef(!1),$=p.useRef(0),P=p.useRef(null),q=p.useRef(t);p.useEffect(()=>{q.current=t},[t]);const Z=p.useCallback(async()=>{if(_.current)return;_.current=!0;const D=++$.current,j=new AbortController;P.current=j;const M=()=>C.current&&$.current===D;y(!0),z("正在加载真实数据…");try{const[O,ae]=await Promise.all([s.snapshot(j.signal),s.dispatchPriority(j.signal)]);if(!M())return;l(ae.enabled),i(O),h(!0),E(new Set);try{const se=await s.registrations(j.signal);if(!M())return;u(se),m("")}catch(se){if(!M())return;u(null);const U="注册申请信息加载失败："+de(se);m(U),q.current({message:U,tone:"error"})}M()&&z("更新于 "+new Date().toLocaleTimeString("zh-CN",{hour12:!1}))}catch(O){if(!M())return;throw h(!1),z("加载失败，请刷新重试"),O}finally{M()&&(_.current=!1,y(!1))}},[s]),G=p.useCallback(async()=>{if(!(b.current||_.current)){f("");try{await Z()}catch(D){if(!C.current)return;const j=de(D);f(j),q.current({message:j,tone:"error"})}}},[Z]);return p.useEffect(()=>(C.current=!0,G(),()=>{C.current=!1,P.current?.abort(),_.current=!1}),[G]),{...a,dispatchPriority:r,service:s,registrations:c,registrationError:d,ready:v,loading:g,mutationBusy:x,error:w,setError:f,refreshNote:k,selected:R,setSelected:E,assignStatus:N,setAssignStatus:A,refreshPage:G,mutate:async(D,j,M)=>{if(b.current||_.current||!v)throw new Error("另一项操作正在提交或列表尚未就绪，请稍后重试。");b.current=!0,S(!0),f("");try{if(await D(),!C.current)return;M?.(),q.current({message:j,tone:"success"});try{await Z()}catch(O){if(!C.current)return;const ae="操作已成功，但列表刷新失败，请点击刷新数据后继续："+de(O);f(ae),q.current({message:ae,tone:"warning"})}}finally{b.current=!1,C.current&&S(!1)}}}}function $s({initial:n="user",onChange:t}){return e.jsxs("label",{className:"field",children:["角色",e.jsx("select",{name:"role",defaultValue:n,onChange:s=>t?.(sn.parse(s.currentTarget.value)),children:["user","admin","monitor"].map(s=>e.jsx("option",{value:s,children:_s[s]},s))})]})}function vl({user:n}){return e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"notice-box",children:"仅编辑本地资料，不修改账号名、内部用户 ID 或定海验证资料。定海资料由定海维护。"}),e.jsxs("label",{className:"field",children:["本地姓名 / 花名",e.jsx("input",{name:"display_name",defaultValue:n.display_name||"",required:!0,maxLength:64})]}),e.jsxs("label",{className:"field",children:["本地手机号",e.jsx("input",{name:"phone",type:"tel",defaultValue:n.phone||"",maxLength:11,pattern:"1[3-9][0-9]{9}",autoComplete:"tel-national"})]}),e.jsx("p",{className:"auth-note",children:"手机号非空时须为有效的 11 位号码；留空可清除。"})]})}function Ss(){return e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"field",children:["新密码（至少 8 位）",e.jsx("input",{name:"password",type:"password",minLength:8,maxLength:1024,autoComplete:"new-password",required:!0})]}),e.jsx("p",{className:"notice-box",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。密码不会显示在列表中。"})]})}function yl(){const[n,t]=p.useState("user"),[s,a]=p.useState(!1);return e.jsxs("div",{id:"create",className:"form-grid",children:[e.jsxs("label",{className:"field",children:["账号名",e.jsx("input",{name:"username",required:!0,maxLength:128,autoComplete:"off"})]}),e.jsx(Ss,{}),e.jsx($s,{onChange:i=>{t(i),i==="monitor"&&a(!1)}}),e.jsxs("label",{className:"check-label",children:[e.jsx("input",{name:"team_leader",type:"checkbox",checked:s,disabled:n==="monitor",onChange:i=>a(i.currentTarget.checked)}),"独立授予组长权限"]}),e.jsx("p",{className:"notice-box",children:"创建后账号启用并标记为已通过。监控展示员不能担任组长，密码由管理员重置；其他账号登录后可自行修改。"})]})}const _l="_accountIdentity_1xovb_1",wl="_dinghaiIdentity_1xovb_8",kl="_priority_1xovb_29",Nl="_track_1xovb_47",$l="_thumb_1xovb_59",Ke={accountIdentity:_l,dinghaiIdentity:wl,priority:kl,switch:"_switch_1xovb_37",track:Nl,thumb:$l};function an({name:n,id:t,idLabel:s="ID"}){return e.jsxs("span",{className:"perm-identity",children:[e.jsx("span",{className:"perm-username",children:n}),e.jsxs("span",{className:"perm-user-id",children:[s,": ",t]})]})}function Fn({columns:n,children:t}){return e.jsx("tr",{children:e.jsx("td",{colSpan:n,children:t})})}function Sl({users:n,busy:t,ready:s,action:a}){return e.jsx("div",{className:"table-wrap accounts-scroll",tabIndex:0,role:"region","aria-label":"账号列表",children:e.jsxs("table",{className:"accounts-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["账号 / ID","本地姓名 / 花名","本地手机号","角色","独立组长权限","启用状态","审批","操作"].map(i=>e.jsx("th",{scope:"col",children:i},i))})}),e.jsxs("tbody",{id:"users",children:[n.map(i=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsxs("div",{className:Ke.accountIdentity,children:[e.jsx("span",{children:i.local_login_enabled===!1?"定海账号":i.dinghai_identity?"本地账号 · 已绑定定海":"本地账号"}),e.jsx(an,{name:i.username,id:i.id,idLabel:"内部用户 ID"}),i.dinghai_identity&&e.jsxs("dl",{className:Ke.dinghaiIdentity,"aria-label":"定海验证资料（由定海维护）",children:[e.jsxs("div",{children:[e.jsx("dt",{children:"资料来源"}),e.jsx("dd",{children:"定海验证 · 由定海维护"})]}),[["定海用户名",i.dinghai_identity.username],["定海姓名 / 花名",i.dinghai_identity.display_name],["定海手机号",i.dinghai_identity.phone],["定海 ID",i.dinghai_identity.id]].map(([r,l])=>e.jsxs("div",{children:[e.jsx("dt",{children:r}),e.jsx("dd",{children:l||"未填写"})]},r))]})]})}),e.jsx("td",{children:i.local_login_enabled===!1?"—":i.display_name||"—"}),e.jsx("td",{children:i.local_login_enabled===!1?"—":i.phone||"未填写"}),e.jsx("td",{children:e.jsx("span",{className:"f-chip "+(i.role==="admin"?"admin":""),children:_s[i.role]})}),e.jsx("td",{children:i.team_leader?"是":"否"}),e.jsx("td",{children:e.jsx("span",{className:"f-chip "+(i.enabled?"on":"off"),children:i.enabled?"启用":"已停用"})}),e.jsx("td",{children:Object.hasOwn(Dn,i.approval_status||"")?Dn[i.approval_status||""]:"—"}),e.jsx("td",{children:e.jsxs("div",{className:"row-actions",children:[e.jsx("button",{type:"button",className:i.enabled?"danger":"",disabled:t,onClick:()=>a(i,"enabled"),children:i.enabled?"停用":"启用"}),e.jsx("button",{type:"button",disabled:t,onClick:()=>a(i,"role"),children:"修改角色"}),i.role!=="monitor"&&e.jsx("button",{type:"button",disabled:t,onClick:()=>a(i,"leader"),children:i.team_leader?"取消组长权限":"设为组长"}),i.local_login_enabled===!1?e.jsx("span",{children:"密码由定海管理"}):e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",disabled:t,onClick:()=>a(i,"profile"),children:"编辑资料"}),e.jsx("button",{type:"button",disabled:t,onClick:()=>a(i,"password"),children:"重置密码"})]})]})})]},i.id)),!n.length&&e.jsx(Fn,{columns:8,children:s?"暂无账号。":"正在加载账号…"})]})]})})}function Cl({data:n,error:t}){return e.jsx("div",{className:"table-wrap registrations-scroll",tabIndex:0,role:"region","aria-label":"注册申请列表",children:e.jsxs("table",{className:"registration-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["账号","姓名 / 花名","状态","申请时间","审批人"].map(s=>e.jsx("th",{scope:"col",children:s},s))})}),e.jsxs("tbody",{id:"registrations",children:[n?.requests.map((s,a)=>e.jsxs("tr",{children:[e.jsx("td",{children:s.username}),e.jsx("td",{children:s.display_name||"—"}),e.jsx("td",{children:Object.hasOwn(Dn,s.status)?Dn[s.status]:s.status}),e.jsx("td",{children:ks(s.created_at)}),e.jsx("td",{children:s.decided_by||"—"})]},s.username+"-"+a)),!n?.requests.length&&e.jsx(Fn,{columns:5,children:t?"暂时无法加载注册申请，请点击刷新数据重试。":n?"暂无自主注册申请。":"正在加载注册申请…"})]})]})})}function zl({grants:n,users:t,busy:s,ready:a,revoke:i}){return e.jsx("div",{className:"table-wrap",tabIndex:0,role:"region","aria-label":"画布授权列表",children:e.jsxs("table",{className:"grant-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["访问者 A","方向","所有者 / 授权范围","权限","操作"].map(r=>e.jsx("th",{scope:"col",children:r},r))})}),e.jsxs("tbody",{id:"grants",children:[n.map(r=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx(an,{name:xn(t.find(l=>l.id===r.viewer_id)),id:r.viewer_id})}),e.jsx("td",{children:"→"}),e.jsx("td",{children:r.scope==="all"?e.jsxs(e.Fragment,{children:["所有画布",e.jsx("span",{className:"perm-user-id",children:En})]}):e.jsx(an,{name:xn(t.find(l=>l.id===r.owner_id)),id:r.owner_id})}),e.jsx("td",{children:tt(r.permission)}),e.jsx("td",{children:e.jsx("button",{type:"button",className:"danger",disabled:s,onClick:()=>i(r),children:"撤销"})})]},r.viewer_id+"-"+(r.scope==="all"?"*":r.owner_id))),!n.length&&e.jsx(Fn,{columns:5,children:a?"暂无画布授权。选择访问者与所有者 / 授权范围后保存。":"正在加载授权…"})]})]})})}function El({projects:n,users:t,target:s}){return e.jsx("div",{className:"dialog-list",tabIndex:0,role:"region","aria-label":"画布分配确认明细",children:e.jsxs("table",{children:[e.jsx("thead",{children:e.jsx("tr",{children:["画布名称","画布 ID","旧归属","目标归属"].map(a=>e.jsx("th",{scope:"col",children:a},a))})}),e.jsx("tbody",{children:n.map(a=>e.jsxs("tr",{children:[e.jsx("td",{children:a.name||"未命名画布"}),e.jsx("td",{children:a.id}),e.jsx("td",{children:e.jsx(an,{name:nt(a,t),id:a.owner_id})}),e.jsx("td",{children:e.jsx(an,{name:xn(s),id:s.id})})]},a.id))})]})})}function Pl({projects:n,users:t,busy:s,ready:a,selected:i,setSelected:r,status:l,onConfirm:c,onError:u}){const[d,m]=p.useState(""),[v,h]=p.useState(""),[g,y]=p.useState(""),x=new Map(n.map(N=>[N.owner_id,`${nt(N,t)}（ID: ${N.owner_id}）`])),S=x.has(v)?v:"",w=t.filter(N=>N.enabled&&N.role!=="monitor"),f=w.some(N=>N.id===g)?g:"",k=xl(n,d,S),z=fl(k,i),R=p.useRef(null);p.useEffect(()=>{R.current&&(R.current.indeterminate=z.indeterminate)},[z.indeterminate]);const E=N=>{N(),r(new Set)};return e.jsxs("section",{className:"card","aria-labelledby":"history-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"history-heading",tabIndex:-1,children:"历史画布分配"}),e.jsx("span",{className:"small muted",children:"仅个人空间 / 每次最多 1000 个"})]}),e.jsx("div",{className:"f-pad",children:e.jsx("p",{className:"notice-box",children:ws})}),e.jsxs("div",{className:"allocation-tools",children:[e.jsxs("div",{className:"allocation-filters",children:[e.jsxs("label",{className:"field",children:["搜索名称 / ID",e.jsx("input",{id:"project-search",type:"search",autoComplete:"off",placeholder:"输入画布名称或 ID",value:d,disabled:s,onChange:N=>E(()=>m(N.currentTarget.value))})]}),e.jsxs("label",{className:"field",children:["当前所有者",e.jsxs("select",{id:"project-owner",value:S,disabled:s,onChange:N=>E(()=>h(N.currentTarget.value)),children:[e.jsx("option",{value:"",children:"全部所有者"}),[...x].map(([N,A])=>e.jsx("option",{value:N,children:A},N))]})]})]}),e.jsxs("form",{id:"assign",className:"allocation-batch","aria-busy":s,onSubmit:N=>{if(N.preventDefault(),!s)try{c(bl(t,k,i,f))}catch(A){u(de(A))}},children:[e.jsxs("label",{className:"field",children:["目标账号（仅启用账号）",e.jsxs("select",{name:"owner_id",required:!0,value:f,disabled:s,onChange:N=>y(N.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择目标账号"}),w.map(N=>e.jsx("option",{value:N.id,children:qe(t,N.id)},N.id))]})]}),e.jsxs("span",{id:"project-selected",role:"status",children:["已选 ",i.size," 个画布",i.size>1e3?"（超过 1000 个上限）":""]}),e.jsx("button",{id:"assign-submit",className:"primary",disabled:s||!i.size||!f,children:"分配所选画布"}),e.jsx("button",{id:"clear-selection",type:"button",disabled:s||!i.size,onClick:()=>r(new Set),children:"清空选择"})]})]}),e.jsx("p",{id:"assign-status",className:"table-note f-status",role:"status",children:l}),e.jsx("div",{className:"table-wrap history-scroll",tabIndex:0,role:"region","aria-label":"历史画布列表",children:e.jsxs("table",{className:"allocation-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{scope:"col",children:e.jsx("input",{ref:R,id:"project-all",type:"checkbox","aria-label":"全选当前筛选结果中的个人画布",checked:z.checked,disabled:s||!z.personal.length,onChange:N=>r(new Set(N.currentTarget.checked?z.personal.map(A=>A.id):[]))})}),["画布名称","画布 ID","当前所有者","空间"].map(N=>e.jsx("th",{scope:"col",children:N},N))]})}),e.jsxs("tbody",{id:"projects",children:[k.map(N=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("input",{type:"checkbox","data-team":String(!!N.team_id),checked:i.has(N.id),"aria-label":`选择画布 ${N.name||"未命名画布"}（${N.id}）`,disabled:s||!!N.team_id,onChange:A=>{const _=new Set(i);A.currentTarget.checked?_.add(N.id):_.delete(N.id),r(_)}})}),e.jsx("td",{children:N.name||"未命名画布"}),e.jsx("td",{className:"perm-id",children:N.id}),e.jsx("td",{children:e.jsx(an,{name:nt(N,t),id:N.owner_id})}),e.jsx("td",{children:N.team_id?e.jsxs(e.Fragment,{children:["项目组：",N.team_name||N.team_id,e.jsx("span",{className:"team-space",children:"由成员关系授权，不可改为个人归属"})]}):"个人空间"})]},N.id)),!k.length&&e.jsx(Fn,{columns:5,children:a?"暂无符合条件的画布，请尝试更换搜索词或当前所有者。":"正在加载画布…"})]})]})}),e.jsx("p",{className:"table-note",children:"搜索或切换当前所有者会清空选择。全选只选择当前筛选结果中的个人画布，项目组画布不可选；超过 1000 个时请缩小筛选范围。"})]})}function Ml(n){const t=jl(n),{users:s,grants:a,projects:i,service:r}=t,[l,c]=p.useState(null),[u,d]=p.useState(""),[m,v]=p.useState(""),[h,g]=p.useState(""),y=p.useRef(null),x=t.loading||t.mutationBusy||!t.ready,S=x&&!l,w=b=>{t.setError(b),n.notify({message:b,tone:"error"})},f=b=>{!x&&!l&&c(b)},k=(b,C)=>{if((C==="password"||C==="profile")&&b.local_login_enabled===!1)return;const $=e.jsxs("p",{children:["目标账号：",e.jsx("b",{children:qe(s,b.id)})]});if(C==="profile")return f({title:"编辑本地资料",children:e.jsxs(e.Fragment,{children:[$,e.jsx(vl,{user:b})]}),submitLabel:"保存本地资料",action:K=>r.update(b.id,{display_name:Le(K,"display_name"),phone:Le(K,"phone")}),message:"本地资料已更新"});if(C==="password")return f({title:"重置密码",children:e.jsxs(e.Fragment,{children:[$,e.jsx(Ss,{}),e.jsx("p",{className:"notice-box danger",children:"该账号现有会话将失效，需要使用新密码重新登录。请妥善告知本人。"})]}),submitLabel:"确认重置密码",action:K=>r.resetPassword(b.id,Le(K,"password")),message:"密码已重置"});if(C==="role")return f({title:"修改账号角色",children:e.jsxs(e.Fragment,{children:[$,e.jsx($s,{initial:b.role}),e.jsx("p",{className:"notice-box danger",children:"管理员天然可访问全部画布。切换为监控展示员会清除组长权限，已有画布授权保留但不生效；其他角色的组长权限不变。修改角色会使该账号现有会话失效；最后一位启用管理员受系统保护。"})]}),submitLabel:"确认修改角色",action:K=>r.update(b.id,{role:sn.parse(Le(K,"role"))}),message:"账号角色已修改"});const P=C==="enabled",q=P?!b.enabled:!b.team_leader,Z=P?q?"启用账号":"停用账号":q?"授予组长权限":"取消组长权限",G=P?q?"启用不会跳过钉钉注册审批，审批状态保持不变。":"停用后该账号不能继续登录，现有会话失效。不会删除既有项目组关系或画布授权；最后一位启用管理员受系统保护。":q?"授予该用户创建项目组和管理自己创建项目组的权限，不会成为管理员，也不能管理其他人的项目组。现有会话失效后需重新登录。":"取消后不能继续创建项目组，现有会话失效。已授予的组内组长身份和成员关系保持不变，仍可管理对应项目组。";f({title:Z,children:e.jsxs(e.Fragment,{children:[$,e.jsx("p",{className:"notice-box",children:G})]}),submitLabel:"确认"+Z,action:()=>r.update(b.id,P?{enabled:q}:{team_leader:q}),message:Z+"成功"})},z=b=>{const C=b.scope==="all"?"所有画布（"+En+"）":qe(s,b.owner_id);f({title:"确认撤销授权",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:[qe(s,b.viewer_id)," → ",C]}),e.jsxs("p",{children:["权限：",tt(b.permission)]}),e.jsx("p",{className:"notice-box danger",children:"撤销后即时重新校验权限，访问者失去这条授权带来的全部画布访问权。此授权不会使其成为管理员；管理员天然权限、项目组成员关系和其他独立授权不受影响。"})]}),submitLabel:"确认撤销授权",action:()=>r.revokeGrant(b),message:"已撤销画布授权"})},R=s.filter(b=>b.role!=="monitor"),E=R.some(b=>b.id===m)?m:"",N=h==="*"||s.some(b=>b.id===h)?h:"",A=[{id:"users",label:"账号总数",value:s.length,note:"角色与独立组长权限分别管理"},{id:"enabled",label:"启用账号",value:s.filter(b=>b.enabled).length,note:"停用不会删除账号或画布授权"},{id:"pending",label:"待审批注册",value:t.registrations?.requests.filter(b=>b.status==="pending").length??"—",note:"仅由钉钉指定审批人处理"},{id:"grants",label:"画布授权",value:a.length,note:"访问者 A → 所有者 / 授权范围"}],_=t.registrations?.outbox;return e.jsxs("main",{id:"main",tabIndex:-1,ref:y,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"账号与权限"}),e.jsx("div",{className:"page-caption",children:e.jsx("p",{className:"subtitle",children:"管理账号、画布访问与历史画布归属"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{id:"refresh-note",className:"refresh-note",role:"status",children:t.refreshNote}),e.jsx("button",{id:"refresh",type:"button",disabled:t.loading||t.mutationBusy||!!l,onClick:()=>{t.refreshPage()},children:"刷新数据"})]})]}),e.jsx("p",{id:"error",className:"page-status",role:"alert",children:t.error}),e.jsxs("section",{className:`card ${Ke.priority}`,"aria-labelledby":"priority-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"priority-heading",children:"管理员项目组任务优先"}),e.jsx("p",{id:"priority-help",className:"section-subtitle",children:"默认关闭。开启后，组长为管理员的项目组内成员提交的排队任务，优先分配兼容的空闲机器，不抢占正在执行的任务。优先任务按提交顺序分配；开关、组成员和组长角色变化实时作用于已排队任务。"}),e.jsx("p",{role:"status",children:t.dispatchPriority===null?"正在读取设置…":t.dispatchPriority?"已开启":"已关闭"})]}),e.jsx("button",{type:"button",role:"switch","aria-checked":t.dispatchPriority===!0,"aria-labelledby":"priority-heading","aria-describedby":"priority-help",className:Ke.switch,disabled:S||t.dispatchPriority===null,onClick:()=>{t.mutate(()=>r.setDispatchPriority(!t.dispatchPriority),"任务优先设置已保存").catch(b=>w(de(b)))},children:e.jsx("span",{className:Ke.track,"aria-hidden":"true",children:e.jsx("span",{className:Ke.thumb})})})]}),e.jsx("section",{className:"metrics","aria-label":"权限概览",children:A.map(b=>e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:b.label}),e.jsx("p",{id:"metric-"+b.id,className:"metric-value",children:b.id==="pending"||t.ready||s.length?b.value:"—"}),e.jsx("p",{className:"metric-note",children:b.note})]})},b.id))}),e.jsx("nav",{className:"section-nav","aria-label":"权限管理分区",children:[["accounts","账号管理"],["registrations","注册申请"],["grants","画布授权"],["history","历史画布分配"]].map(([b,C])=>e.jsx("a",{href:"#"+b+"-heading",onClick:()=>y.current?.querySelector("#"+b+"-heading")?.focus(),children:C},b))}),e.jsxs("section",{className:"card","aria-labelledby":"accounts-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"accounts-heading",tabIndex:-1,children:"账号管理"}),e.jsx("p",{className:"section-subtitle",children:"账号角色包括管理员、普通用户和监控展示员。监控展示员仅可查看监控，不能担任组长或访问画布。 启停仅影响抽卡访问；定海账号资料和密码请在定海维护。"})]}),e.jsx("button",{id:"create-user",type:"button",className:"primary",disabled:S,onClick:()=>f({title:"新建账号",children:e.jsx(yl,{}),submitLabel:"创建账号",action:b=>r.create({username:Le(b,"username").trim(),password:Le(b,"password"),role:sn.parse(Le(b,"role")),team_leader:new FormData(b).has("team_leader")}),message:"账号已创建"}),children:"新建账号"})]}),e.jsx(Sl,{users:s,busy:S,ready:t.ready,action:k}),e.jsx("p",{className:"table-note",children:"启停、角色、组长权限及重置密码均需确认。初始密码至少 8 位，请勿使用常见弱密码；监控展示员的密码由管理员重置，其他账号登录后可自行修改。"})]}),e.jsxs("div",{className:"permissions-grid",children:[e.jsxs("section",{className:"card","aria-labelledby":"registrations-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"registrations-heading",tabIndex:-1,children:"注册申请"}),e.jsx("span",{className:"small muted",children:"仅查看钉钉审批结果"})]}),e.jsxs("div",{className:"f-pad form-grid",children:[e.jsx("p",{className:"notice-box",children:"自主注册由钉钉群内两位指定审批人在卡片上处理，任意一人先决生效。网页不提供通过或拒绝操作。"}),e.jsx("p",{id:"outbox-status",className:"f-status",role:"status",children:t.registrationError||(t.registrations?_&&_.pending>0?`审批通知积压 ${_.pending} 条（最早 ${_.oldest_at?ks(_.oldest_at):"时间未知"}），系统会自动重试投递。`:"审批通知投递正常。":"")})]}),e.jsx(Cl,{data:t.registrations,error:t.registrationError})]}),e.jsxs("section",{className:"card","aria-labelledby":"grants-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"grants-heading",tabIndex:-1,children:"画布授权"}),e.jsx("span",{className:"small muted",children:"访问者 A → 所有者 / 授权范围"})]}),e.jsx("div",{className:"f-pad",children:e.jsx("p",{id:"grant-help",className:"notice-box",children:"选择指定所有者，A 可查看或操作其当前及以后创建的全部个人画布；选择“所有画布”则覆盖全部个人和项目组画布，包括现有及未来新增画布。可操作包含删除；授权不传递，也不会成为管理员。管理员天然可访问全部画布，停用账号不会因授权恢复登录权限。"})}),e.jsxs("form",{id:"grant",className:"grant-form","aria-describedby":"grant-help","aria-busy":t.mutationBusy,onSubmit:b=>{if(b.preventDefault(),!x){d("");try{const C=gl(s,E,N,hn.parse(Le(b.currentTarget,"permission"))),$=C.scope==="all"?"所有画布（"+En+"）":qe(s,C.owner_id),P=C.scope==="all"?"覆盖"+En+"，不受所有者或项目组成员关系限制。":"覆盖所有者当前和以后创建的全部个人画布，不包含项目组画布。";f({title:"确认画布授权",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["访问者 A：",qe(s,C.viewer_id)]}),e.jsxs("p",{children:["所有者 / 授权范围：",$]}),e.jsxs("p",{children:["权限：",e.jsx("b",{children:tt(C.permission)})]}),e.jsxs("p",{className:"notice-box danger",children:[P,"可操作包含删除；授权不传递，也不会成为管理员。已有同范围授权将被更新，其他独立授权保留；保存后即时重新校验权限。停用账号不会因此恢复登录。"]})]}),submitLabel:"确认保存授权",action:()=>r.saveGrant(C),message:"画布授权已保存"})}catch(C){const $=de(C);d($),n.notify({message:$,tone:"error"})}}},children:[e.jsxs("label",{className:"field",children:["访问者 A",e.jsxs("select",{name:"viewer_id",required:!0,disabled:S,value:E,onChange:b=>v(b.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择账号"}),R.map(b=>e.jsx("option",{value:b.id,children:qe(s,b.id)},b.id))]})]}),e.jsxs("label",{className:"field",children:["所有者 / 授权范围",e.jsxs("select",{name:"owner_id",required:!0,disabled:S,value:N,onChange:b=>g(b.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择所有者 / 授权范围"}),e.jsx("option",{value:"*",children:"所有画布（含以后新增）"}),s.map(b=>e.jsx("option",{value:b.id,children:qe(s,b.id)},b.id))]})]}),e.jsxs("label",{className:"field",children:["权限",e.jsxs("select",{name:"permission",disabled:S,children:[e.jsx("option",{value:"read",children:"只读"}),e.jsx("option",{value:"operate",children:"可操作（含删除）"})]})]}),e.jsx("button",{id:"grant-submit",className:"primary",disabled:S,children:"保存授权"}),e.jsx("p",{id:"grant-error",className:"danger small",role:"alert",children:u})]}),e.jsx(zl,{grants:a,users:s,busy:S,ready:t.ready,revoke:z})]})]}),e.jsx(Pl,{projects:i,users:s,busy:S,ready:t.ready,selected:t.selected,setSelected:t.setSelected,status:t.assignStatus,onError:w,onConfirm:({target:b,chosen:C,payload:$})=>f({title:"确认分配 "+C.length+" 个画布",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["目标账号：",e.jsx("b",{children:qe(s,b.id)})]}),e.jsx("p",{className:"notice-box danger",children:ws}),e.jsx(El,{projects:C,users:s,target:b})]}),submitLabel:"确认分配所列画布",action:async()=>{const P=await r.assign($);t.setSelected(new Set),t.setAssignStatus(`分配成功：已将 ${P} 个画布分配给 ${qe(s,b.id)}。`)},message:"画布归属已分配"})})]}),l&&e.jsx(xe,{title:l.title,submitLabel:l.submitLabel,onClose:()=>c(null),onSubmit:b=>t.mutate(()=>l.action(b),l.message,l.afterSuccess),children:l.children})]})}const $n="/api/creation-agent/admin/skills",Il=F({skill:An,files:B(I())}),Tl=4*1024*1024,ql=F({builtins:B(ha),skills:B(An)});function Dl(n){return{list:t=>n.read($n,ql,{signal:t,cache:"no-store"}),async importZip(t,s){if(t.size>Tl)throw new Error("ZIP 压缩文件不能超过 4 MiB；草稿已保留。");if(!t.name.toLowerCase().endsWith(".zip"))throw new Error("请选择 .zip 文件；草稿已保留。");return Il.parse(await n.request(`${$n}/import-zip`,{method:"POST",headers:{"Content-Type":"application/zip"},body:t,signal:s}))},async publish(t){F({ok:ve(!0)}).parse(await n.json($n,"POST",An.parse(t)))},async revoke(t){F({ok:ve(!0)}).parse(await n.request(`${$n}/${encodeURIComponent(ma.parse(t))}`,{method:"DELETE"}))}}}const Al="_management_1gfcj_1",Rl="_catalog_1gfcj_5",Ll="_catalogItem_1gfcj_11",Fl="_origin_1gfcj_25",Ol="_enabled_1gfcj_30",Ul="_hint_1gfcj_34",Wl="_error_1gfcj_40",Bl="_editor_1gfcj_45",Vl="_fields_1gfcj_46",Hl="_references_1gfcj_47",Gl="_guide_1gfcj_71",Jl="_actions_1gfcj_77",Zl="_options_1gfcj_78",Yl="_upload_1gfcj_89",Kl="_warning_1gfcj_91",Xl="_preview_1gfcj_92",Ql="_check_1gfcj_110",eo="_enableSwitch_1gfcj_124",no="_track_1gfcj_136",to="_thumb_1gfcj_149",X={management:Al,catalog:Rl,catalogItem:Ll,origin:Fl,enabled:Ol,hint:Ul,error:Wl,editor:Bl,fields:Vl,references:Hl,guide:Gl,actions:Jl,options:Zl,upload:Yl,warning:Kl,preview:Xl,check:Ql,enableSwitch:eo,track:no,thumb:to};function so({draft:n,onChange:t}){const s=Object.keys(n.references),[a,i]=p.useState(s[0]??""),[r,l]=p.useState(""),[c,u]=p.useState(""),d=s.includes(a)?a:s[0]??"",m=Object.hasOwn(n.referenceTriggers,d);function v(){if(!window.confirm(`确认从草稿移除参考资料 ${d}？发布后才会生效。`))return;const h={...n.references},g={...n.referenceTriggers};delete h[d],delete g[d],t({...n,references:h,referenceTriggers:g}),i("")}return e.jsxs("section",{className:X.references,"aria-labelledby":"skill-references-heading",children:[e.jsxs("h4",{id:"skill-references-heading",children:["参考资料（",s.length," / 128）"]}),e.jsx("p",{className:X.hint,children:"相对路径仅支持 .md、.txt、.yaml、.yml；不能使用绝对路径或 ..。正文原样保存，不执行脚本。"}),e.jsxs("label",{className:"field",children:["新参考资料路径",e.jsx("input",{value:r,placeholder:"references/guide.md","aria-invalid":!!c,"aria-describedby":c?"skill-reference-path-error":void 0,onChange:h=>{l(h.target.value),u("")}})]}),e.jsx("button",{type:"button",disabled:s.length>=128,onClick:()=>{const h=xa.safeParse(r);if(!h.success){u("请输入有效的相对文字文件路径，不可包含空格、绝对路径或 ..。");return}if(s.some(g=>g.toLowerCase()===h.data.toLowerCase())){u("该参考资料路径已存在（不区分大小写），请直接选择编辑。");return}t({...n,references:{...n.references,[h.data]:""}}),i(h.data),l(""),u("")},children:"添加参考资料"}),c&&e.jsx("p",{id:"skill-reference-path-error",role:"alert",className:X.error,children:c}),s.length?e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"field",children:["选择参考资料",e.jsx("select",{value:d,onChange:h=>i(h.target.value),children:s.map(h=>e.jsx("option",{value:h,children:h},h))})]}),e.jsxs("label",{className:"field",children:["参考资料正文",e.jsx("textarea",{rows:12,className:X.guide,value:n.references[d]??"",onChange:h=>t({...n,references:{...n.references,[d]:h.target.value}})})]}),e.jsxs("p",{className:X.hint,children:["当前正文 ",(n.references[d]??"").length," / 128000 UTF-16 字符"]}),e.jsxs("label",{className:"field",children:["参考资料加载规则",e.jsxs("select",{value:m?"keywords":"always",onChange:h=>{const g={...n.referenceTriggers};h.target.value==="always"?delete g[d]:g[d]=[],t({...n,referenceTriggers:g})},children:[e.jsx("option",{value:"always",children:"始终加载（无关键词规则）"}),e.jsx("option",{value:"keywords",children:"仅匹配关键词时加载"})]})]}),e.jsx("p",{className:X.hint,children:"无规则时随 Skill 始终加载；关键词规则仅在命中任意一个词时加载，留空则不自动加载此资料。"}),m&&e.jsxs("label",{className:"field",children:["参考资料关键词（每行一个）",e.jsx("textarea",{rows:3,value:(n.referenceTriggers[d]??[]).join(`
`),onChange:h=>t({...n,referenceTriggers:{...n.referenceTriggers,[d]:h.target.value.split(`
`)}})})]}),e.jsx("button",{type:"button",className:"danger",onClick:v,children:"移除当前参考资料"})]}):e.jsx("p",{className:X.hint,children:"暂无参考资料，可添加文字指南或从 ZIP 导入。"})]})}const ao=[{value:"image",label:"生图时自动匹配"},{value:"video",label:"视频时自动匹配"},{value:"text",label:"文本时自动匹配"}],io={id:"Skill ID",name:"中文业务名称",description:"简介",instruction:"文字指南",triggers:"触发词",autoOutputs:"自动匹配产物",references:"参考资料",referenceTriggers:"参考资料关键词"},Bt=n=>n.map(t=>t.trim()).filter(Boolean);function ro({draft:n,onChange:t,busy:s,editing:a,collisionName:i,requestError:r,onPublish:l,onReset:c}){const[u,d]=p.useState({}),[m,v]=p.useState("");function h(y,x,S){return e.jsxs("div",{children:[e.jsxs("label",{className:"field",children:[x,S]}),u[y]&&e.jsx("p",{id:`skill-error-${y}`,className:X.error,children:u[y]})]})}function g(y){return{"aria-invalid":!!u[y],"aria-describedby":u[y]?`skill-error-${y}`:void 0}}return e.jsxs("form",{noValidate:!0,"aria-label":"Skill 编辑器","aria-busy":s,className:X.editor,onSubmit:y=>{if(y.preventDefault(),s)return;const x=An.safeParse({...n,triggers:Bt(n.triggers),referenceTriggers:Object.fromEntries(Object.entries(n.referenceTriggers).map(([S,w])=>[S,Bt(w)]))});if(!x.success){const S={};for(const w of x.error.issues){const f=String(w.path[0]??"form");S[f]=`${io[f]??"指南"}${w.path.length>1?`（${w.path.slice(1).join(" / ")}）`:""}：${w.message}`}d(S),y.currentTarget.querySelector("[data-validation-summary]")?.focus();return}if(i&&m!==n.id){d({form:"请先确认覆盖同 ID 的现有 Skill；尚未发布。"});return}d({}),l(x.data)},children:[e.jsx("h3",{children:a?"更新 Skill":"发布 Skill"}),e.jsx("p",{className:X.hint,children:"内置、历史和新建 Skill 使用相同字段；修改仅在点击“发布指南”后生效。"}),e.jsx("div",{"data-validation-summary":"",tabIndex:-1,role:Object.keys(u).length?"alert":void 0,children:Object.keys(u).length>0&&e.jsxs("div",{className:X.error,children:[e.jsx("p",{children:"请修正以下内容，草稿已保留。"}),e.jsx("ul",{children:Object.entries(u).map(([y,x])=>e.jsx("li",{children:x},y))})]})}),e.jsxs("fieldset",{disabled:s,className:X.fields,children:[h("id","Skill ID（小写字母、数字、连字符）",e.jsx("input",{value:n.id,readOnly:a,...g("id"),onChange:y=>{v(""),t({...n,id:y.target.value})}})),h("name","中文业务名称",e.jsx("input",{value:n.name,...g("name"),onChange:y=>t({...n,name:y.target.value})})),h("description","简介",e.jsx("textarea",{rows:3,value:n.description,...g("description"),onChange:y=>t({...n,description:y.target.value})})),h("triggers","触发词（每行一个）",e.jsx("textarea",{rows:4,value:n.triggers.join(`
`),...g("triggers"),onChange:y=>t({...n,triggers:y.target.value.split(`
`)})})),e.jsx("p",{className:X.hint,children:"按字面关键词匹配，任意一个命中即可（OR），不是正则表达式。每行一个，最多 64 个，每个最多 80 字；留空不按关键词自动匹配。"}),e.jsxs("fieldset",{className:X.options,children:[e.jsx("legend",{children:"自动匹配产物（可选）"}),ao.map(({value:y,label:x})=>e.jsxs("label",{className:X.check,children:[e.jsx("input",{type:"checkbox",checked:n.autoOutputs.includes(y),onChange:S=>t({...n,autoOutputs:S.target.checked?[...n.autoOutputs,y]:n.autoOutputs.filter(w=>w!==y)})}),x]},y))]}),e.jsx("p",{className:X.hint,children:"与触发词为 OR 关系；取消全部勾选则不按产物自动匹配。原有漫剧 Skill 的生图匹配设置会保留。"}),e.jsxs("button",{type:"button",role:"switch","aria-checked":n.enabled,"aria-describedby":"skill-enabled-help",className:X.enableSwitch,disabled:s,onClick:()=>t({...n,enabled:!n.enabled}),children:[e.jsx("span",{className:X.track,"aria-hidden":"true",children:e.jsx("span",{className:X.thumb})}),"启用 Skill"]}),e.jsx("p",{id:"skill-enabled-help",className:X.hint,children:"停用后保留全部配置，但不能再选择或加载；重新开启并发布可恢复。"}),h("instruction","文字指南（原文）",e.jsx("textarea",{rows:16,className:X.guide,value:n.instruction,...g("instruction"),onChange:y=>t({...n,instruction:y.target.value})})),e.jsxs("p",{className:X.hint,children:["主指南 ",n.instruction.length," / 128000 UTF-16 字符；每份参考资料同限，合计最多 600000，不截断正文。"]}),e.jsx(so,{draft:n,onChange:t}),(u.references||u.referenceTriggers)&&e.jsx("p",{className:X.error,children:u.references||u.referenceTriggers}),i&&e.jsxs("div",{className:X.warning,role:"note",children:[e.jsxs("p",{children:["同 ID “",n.id,"” 已存在（",i,"）。发布将覆盖现有名称、指南、触发词、参考资料和启用状态，不会新建副本。"]}),e.jsxs("label",{className:X.check,children:[e.jsx("input",{type:"checkbox",checked:m===n.id,onChange:y=>v(y.target.checked?n.id:"")}),"我确认覆盖此 ID 的现有 Skill"]})]}),r&&e.jsx("p",{role:"alert",className:X.error,children:r}),s&&e.jsx("p",{role:"status",children:"正在处理，草稿暂不可编辑…"}),e.jsxs("div",{className:X.actions,children:[e.jsx("button",{type:"submit",className:"primary",disabled:!!i&&m!==n.id,children:"发布指南"}),e.jsx("button",{type:"button",onClick:c,children:"新建 / 清空表单"})]})]})]})}const Vt={id:"",name:"",description:"",instruction:"",triggers:[],autoOutputs:[],references:{},referenceTriggers:{},enabled:!0};function lo({http:n,notify:t}){const s=p.useMemo(()=>Dl(n),[n]),[a,i]=p.useState(null),[r,l]=p.useState(Vt),[c,u]=p.useState(""),[d,m]=p.useState(0),[v,h]=p.useState([]),[g,y]=p.useState(!1),x=p.useRef(!1),S=p.useRef(!1),[w,f]=p.useState(""),[k,z]=p.useState("catalog"),[R,E]=p.useState(""),[N,A]=p.useState(!0),[_,b]=p.useState(0),C=p.useRef(null),$=p.useRef(null);p.useEffect(()=>(S.current=!0,()=>{S.current=!1,C.current?.abort()}),[]),p.useEffect(()=>{const D=new AbortController;return s.list(D.signal).then(j=>{D.signal.aborted||(i(j),E(""),A(!1))},j=>{D.signal.aborted||(E(de(j)),A(!1))}),()=>D.abort()},[s,_]);function P(D,j="",M=[]){l(D),u(j),h(M),m(O=>O+1),f("")}async function q(D,j="catalog"){if(!(x.current||N)){x.current=!0,y(!0),f(""),z(j);try{await D()}catch(M){S.current&&f(`${de(M)}；草稿已保留，可重试。`)}finally{x.current=!1,S.current&&y(!1)}}}async function Z(D,j=!1){j?await s.revoke(D.id):await s.publish(D),S.current&&(i(M=>M&&{...M,skills:M.skills.some(O=>O.id===D.id)?M.skills.map(O=>O.id===D.id?D:O):[...M.skills,D]}),j?c===D.id&&l(M=>({...M,enabled:!1})):P(D,D.id),t({message:D.enabled?"Skill 已发布":"Skill 已停用，配置已保留",tone:"success"}))}const G=g||N,K=a?.skills.find(D=>D.id===r.id&&D.id!==c);return e.jsxs("section",{className:`card ${X.management}`,"aria-labelledby":"skills-heading","aria-busy":G,children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"skills-heading",tabIndex:-1,children:"Skill 管理"}),e.jsx("p",{className:"section-subtitle",children:"统一编辑内置、历史与新建 Skill。ZIP 上传仅预览，不自动发布；停用保留全部配置。"})]}),e.jsx("button",{type:"button",disabled:G,onClick:()=>{A(!0),b(D=>D+1)},children:"刷新列表"})]}),e.jsxs("div",{className:"f-pad",children:[N&&e.jsx("p",{role:"status",children:"正在读取全部 Skill…"}),R&&e.jsxs("p",{role:"alert",className:X.error,children:["Skill 列表加载失败：",R,"。请刷新列表重试。"]}),w&&k==="catalog"&&e.jsx("p",{role:"alert",className:X.error,children:w}),g&&e.jsx("p",{role:"status",children:"正在处理，请稍候…"}),a&&e.jsxs(e.Fragment,{children:[e.jsx("h3",{children:"全部 Skill（含已停用）"}),!a.skills.length&&e.jsx("p",{children:"暂无 Skill，可新建或上传 ZIP。"}),e.jsx("ul",{className:X.catalog,"aria-label":"Skill 列表",children:a.skills.map(D=>e.jsxs("li",{className:X.catalogItem,children:[e.jsxs("div",{children:[e.jsx("strong",{children:D.name}),e.jsx("span",{className:X.origin,children:a.builtins.some(j=>j.id===D.id)?"内置":"自定义 / 导入"}),e.jsx("span",{className:D.enabled?X.enabled:X.hint,children:D.enabled?"已启用":"已停用"}),e.jsx("p",{className:X.hint,children:D.description})]}),e.jsxs("div",{className:X.actions,children:[e.jsx("button",{type:"button",disabled:G,"aria-label":`编辑 ${D.name}`,onClick:()=>{P(D,D.id),$.current?.scrollIntoView({block:"start"}),$.current?.focus({preventScroll:!0})},children:"编辑"}),D.enabled&&e.jsx("button",{type:"button",disabled:G,"aria-label":`停用 ${D.name}`,onClick:()=>{window.confirm(`确认停用 ${D.name}？现有对话也将无法再加载；全部指南和配置会保留，可重新启用。`)&&q(()=>Z({...D,enabled:!1},!0))},children:"停用"})]})]},D.id))}),e.jsxs("fieldset",{disabled:G||!!R,className:X.upload,children:[e.jsx("legend",{children:"上传 ZIP 预览"}),e.jsxs("label",{className:"field",children:["Skill ZIP 文件（最多 4 MiB）",e.jsx("input",{type:"file",accept:".zip,application/zip",onChange:D=>{const j=D.target.files?.[0];D.target.value="",j&&q(async()=>{const M=new AbortController;C.current=M;const O=await s.importZip(j,M.signal);S.current&&P(O.skill,"",O.files)},"upload")}})]}),e.jsx("p",{className:X.hint,children:"ZIP 根目录或唯一外层文件夹中须有含 YAML 元数据的 SKILL.md，可包含文字参考资料；不接受脚本。解析成功后在下方检查和编辑，再手动发布。"}),w&&k==="upload"&&e.jsx("p",{role:"alert",className:X.error,children:w})]}),v.length>0&&e.jsxs("div",{className:X.preview,role:"status",children:[e.jsx("strong",{children:"ZIP 预览已载入，尚未发布"}),e.jsxs("p",{children:["文件清单（",v.length,"）"]}),e.jsx("ul",{children:v.map(D=>e.jsx("li",{children:D},D))})]}),e.jsx("div",{ref:$,tabIndex:-1,children:e.jsx(ro,{draft:r,onChange:l,busy:G||!!R,editing:!!c,collisionName:K?.name,requestError:k==="publish"?w:"",onPublish:D=>{q(()=>Z(D),"publish")},onReset:()=>P(Vt)},d)})]})]})]})}function oo(n){return e.jsx("main",{id:"main",tabIndex:-1,children:e.jsxs("div",{className:"page",children:[e.jsx("header",{className:"card page-header",children:e.jsxs("div",{children:[e.jsx("h1",{children:"Skill 管理"}),e.jsx("p",{className:"subtitle",children:"发布和管理创作助手可读取的文字指南"})]})}),e.jsx(lo,{...n})]})})}const co=2e3,re=De([Y(),I(),ts()]).optional().transform((n,t)=>{if(n==null||n==="")return n===void 0?void 0:null;const s=typeof n=="number"?n:Number(n);return Number.isFinite(s)?s:(t.addIssue({code:"custom",message:"费用数值必须为有限数字或未知值"}),da)}),ke=I().nullish(),po=ce({tasks:re,done:re,error:re,canceled:re,retail_min:re,retail_max:re,retail_mid:re,retail_known_tasks:re,retail_unknown_tasks:re,total_cost:re,actual_cost:re,estimated_cost:re,running_accrued:re,gpu_hours:re,electricity_cost:re,api_cost:re,failed_waste:re,unknown_cost_tasks:re}),Kn=ce({key:ke,label:ke,tasks:re,retail_known_tasks:re,retail_unknown_tasks:re,retail_min:re,retail_max:re,retail_mid:re,total_cost:re}),uo=ce({job_id:ke,created_at:re,status:ke,category_name:ke,category:ke,project_name:ke,card_name:ke,capability:ke,worker_name:ke,runtime_seconds:re,retail_source:ke,retail_basis:ke,retail_min:re,retail_max:re,cost_source:ke,recognized_cost:re});ce({overview:po,jobs:B(uo).transform(n=>n.slice(0,co)),currency:ke,pricing_version:De([I(),Y()]).nullish(),period:ce({from:re,to:re}).nullish(),by_category:B(Kn).nullish(),by_capability:B(Kn).nullish(),by_worker:B(Kn).nullish()});const pe=Y().finite(),fe=I().nullish(),Me=pe.nullish(),pn=F({tasks:pe,done:pe,error:pe,canceled:pe,running:pe,queued:pe,generation_tasks:pe,api_tasks:pe,unknown_cost_tasks:pe,actual_cost:pe,estimated_cost:pe,total_cost:pe,failed_waste:pe,gpu_hours:pe,electricity_cost:pe,retail_min:pe,retail_max:pe,retail_known_tasks:pe,retail_unknown_tasks:pe,identified_account_tasks:pe,runtime_unknown_tasks:pe}),Fe=pn.extend({key:I(),label:I()}),mo=pn.extend({day:pa(),generation_cost:pe,api_cost:pe}),ho=F({job_id:fe,created_at:Me,status:fe,category_name:fe,category:fe,project_name:fe,card_name:fe,capability:fe,worker_name:fe,runtime_seconds:Me,retail_source:fe,retail_basis:fe,retail_min:Me,retail_max:Me,cost_source:fe,recognized_cost:Me,event_kind:fe,actual_cost:Me,estimated_cost:Me,source:Pe(["generation","api"]),account_id:fe,account_name:fe,department_id:fe,department_name:fe,attribution_basis:fe,project_id:fe,model:fe,electricity_cost:Me,prompt_tokens:Me,completion_tokens:Me,cached_tokens:Me,provider_amount:fe,provider_currency:fe,billing_source:fe,request_id:fe,dimensions:F({electricity_basis:I().optional(),local_review_import:ie().optional()}).nullish()}),xo=F({period:F({from:pe.nullable(),to:pe}),as_of:pe,currency:I(),pricing_version:I(),overview:pn,local:pn,cloud:pn,composition:F({category:B(Fe),capability:B(Fe),worker:B(Fe)}),trend:B(mo),projects:B(Fe),models:B(Fe),project_departments:jn(I(),B(Fe)),departments:F({generation:B(Fe),api:B(Fe)}),jobs:B(ho),next_cursor:I().nullable(),export_cursor:I().min(1),details:F({count:pe,total_cost:pe,unknown:pe})}),Pn=F({id:I(),name:I()}),fo=F({id:I(),username:I(),display_name:I(),enabled:ie(),department_id:I().nullable()}),go=F({accounts:B(fo),departments:B(Pn),projects:B(Pn),categories:B(Pn)}),Cs=Pe(["all","generation","api"]),bo=Pe(["all","month","30","7"]);Pe(["category","capability","worker"]);const jo=Pe(["all","actual","estimated","unknown","done","error","canceled","running","queued"]),bt={period:"all",department:"all",account:"all",project:"all",trend_source:"all",trend_category:"all",detail_source:"all",detail_status:"all",detail_q:"",detail_model:"",detail_day:"",detail_dimension:"",detail_key:""},zs={detail_source:"all",detail_status:"all",detail_q:"",detail_model:"",detail_day:"",detail_dimension:"",detail_key:""};function vo(n,t){if(n==="all")return null;if(n!=="month")return t-Number(n)*86400;const s=new Date((t+8*3600)*1e3);return Date.UTC(s.getUTCFullYear(),s.getUTCMonth(),1)/1e3-8*3600}function te(n,t,s=2){if(n==null||!Number.isFinite(n))return"未知";const a=n.toLocaleString("zh-CN",{minimumFractionDigits:s,maximumFractionDigits:s});return t==="CNY"?`¥${a}`:t==="USD"?`$${a} USD`:`${t&&t!=="unknown"?t:"币种未知"} ${a}`}function ye(n,t,s=2){return n.tasks>0&&n.unknown_cost_tasks>=n.tasks?"未知":te(n.total_cost,t,s)}function yo(n,t){return n.cost_source==="unknown"||n.cost_source==null?"未知":te(n.recognized_cost,t,4)}function Es(n){return n.source==="generation"&&n.dimensions?.electricity_basis==="local_review_recomputed"}function fn(n){return n==null?"未记录":new Date(n*1e3).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai",hour12:!1})}function _o(n,t,s){const a=n.filters,i=(m,v)=>{if(v==="all")return{departments:"全部部门",accounts:"全部账号",projects:"全部项目"}[m];if(v==="unknown")return m==="projects"?"项目未知":"提交账号未知";if(m==="departments"&&v==="unassigned")return"未分配部门";const h=t?.[m].find(g=>g.id===v);return h&&("name"in h?h.name:h.display_name||h.username)||(m==="projects"?s?.projects.find(g=>g.key===v)?.label:void 0)||v},r=a.trend_category==="all"?"全部类型":t?.categories.find(m=>m.id===a.trend_category)?.name||s?.composition.category.find(m=>m.key===a.trend_category)?.label||a.trend_category,l={all:"全部来源",generation:"生成任务",api:"云端 API"},c={all:"全部成本与状态",actual:"实际记录",estimated:"历史估算",unknown:"成本未知",done:"完成",error:"失败",canceled:"取消",running:"运行中",queued:"排队中"},u={all:"全部历史",month:"本月",30:"最近30天",7:"最近7天"}[a.period],d=[l[a.detail_source],c[a.detail_status]];if(a.detail_q&&d.push(`搜索“${a.detail_q}”`),a.detail_model&&d.push(`模型 ${s?.models.find(m=>m.key===a.detail_model)?.label||a.detail_model}`),a.detail_day&&d.push(`日期 ${a.detail_day}`),a.detail_dimension){const m={category:"类型",capability:"能力",worker:"执行端"}[a.detail_dimension],v=s?.composition[a.detail_dimension].find(h=>h.key===a.detail_key);d.push(`${m} ${v?.label||a.detail_key}`)}return`${u}；${i("departments",a.department)}；${i("accounts",a.account)}；${i("projects",a.project)}；趋势：${l[a.trend_source]}、${r}；明细：${d.join("、")}；第${n.page+1}页；截止 ${fn(n.to)}（北京时间）`}function Ht(n,t=!1){const s=new URLSearchParams({to:String(n.to)}),a=vo(n.filters.period,n.to);a!==null&&s.set("from",String(a));for(const[i,r]of Object.entries(n.filters))i!=="period"&&r!==""&&s.set(i,r);return s.set("limit","10"),n.cursor!==null&&s.set("cursor",n.cursor),`/api/costs/dashboard${t?"/export":""}?${s}`}function wo(n){const t=(s,a,i,r)=>n.request(s,{method:a,signal:r,headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});return{async load(s,a){const i=await n.request(Ht(s),{cache:"no-store",signal:a}),r=xo.safeParse(i);if(!r.success)throw new Error("费用看板返回的数据格式不完整，请确认后台契约");return r.data},async catalog(s){return go.parse(await n.request("/api/costs/catalog",{cache:"no-store",signal:s}))},async department(s,a,i){const r=await t(s===null?"/api/costs/departments":`/api/costs/departments/${encodeURIComponent(s)}`,s===null?"POST":"PATCH",{name:a},i);return Pn.parse(r)},async assign(s,a,i){return await t(`/api/costs/accounts/${encodeURIComponent(s)}/department`,"PUT",{department_id:a},i),this.catalog(i)},async export(s,a){const r=await(await n.open(Ht(s,!0),{cache:"no-store",signal:a})).blob();if(a.aborted)throw new DOMException("导出已取消","AbortError");return r}}}function Sn(n=bt){return{filters:n,to:Math.floor(Date.now()/1e3),cursor:null,page:0,history:[null]}}function ko({http:n}){const t=p.useMemo(()=>wo(n),[n]),[s,a]=p.useState(Sn),i=p.useRef(s),[r,l]=p.useState(null),[c,u]=p.useState(null),d=p.useRef(null),[m,v]=p.useState(!0),[h,g]=p.useState(""),[y,x]=p.useState(null),[S,w]=p.useState(""),f=p.useRef(!1),k=p.useRef(null),z=p.useRef(new Set),R=p.useRef(0),[E,N]=p.useState(!1),[A,_]=p.useState(""),b=p.useRef(null),C=p.useRef(null),$=p.useRef(null),P=p.useCallback(()=>{$.current!==null&&clearTimeout($.current),C.current!==null&&URL.revokeObjectURL(C.current),C.current=null,$.current=null},[]),q=p.useCallback(async U=>{k.current?.abort();const T=new AbortController;k.current=T,v(!0);try{const W=await t.load(U,T.signal);if(!f.current||T.signal.aborted)return;const ne={data:W,query:U};d.current=ne,l(ne),g("")}catch(W){if(!f.current||T.signal.aborted)return;g(`读取失败：${de(W)}`)}finally{f.current&&k.current===T&&(k.current=null,v(!1))}},[t]),Z=p.useCallback(async U=>{const T=++R.current;try{const W=await t.catalog(U);return f.current&&!U.aborted&&T===R.current&&(x(W),w("")),W}catch(W){throw f.current&&!U.aborted&&T===R.current&&w(`账号与部门读取失败：${de(W)}`),W}},[t]),G=p.useCallback(()=>{const U=new AbortController;z.current.add(U),Z(U.signal).catch(()=>{}).finally(()=>z.current.delete(U))},[Z]),K=p.useCallback(()=>{const U=i.current,T=U.page===0?Sn(U.filters):U;i.current=T,a(T),q(T)},[q]);p.useEffect(()=>{f.current=!0,q(i.current);const U=new AbortController;z.current.add(U),Z(U.signal).catch(()=>{});const T=window.setInterval(()=>{!document.hidden&&k.current===null&&K()},15e3),W=z.current;return()=>{f.current=!1,window.clearInterval(T),k.current?.abort(),k.current=null,W.forEach(ne=>ne.abort()),W.clear(),b.current?.abort(),P()}},[q,K,Z,P]),p.useEffect(()=>{let U=null;const T=async()=>{if(U||document.hidden)return;const ne=new AbortController;U=ne;try{const ge=await t.load(Sn({...bt,period:"month"}),ne.signal);f.current&&!ne.signal.aborted&&u(ge)}catch{f.current&&!ne.signal.aborted&&u(null)}finally{U===ne&&(U=null)}};T();const W=window.setInterval(()=>{T()},15e3);return()=>{window.clearInterval(W),U?.abort()}},[t]);const D=p.useCallback(U=>{const T=Sn({...i.current.filters,...U});i.current=T,a(T),q(T)},[q]),j=p.useCallback(U=>{const T=d.current;if(!T||k.current||JSON.stringify(T.query)!==JSON.stringify(i.current))return;const W=T.query.page+U,ne=U===1?T.data.next_cursor:T.query.history[W];if(W<0||ne===void 0||U===1&&ne===null)return;const ge=[...T.query.history];ge[W]=ne;const Te={...T.query,page:W,cursor:ne,history:ge};i.current=Te,a(Te),q(Te)},[q]),M=p.useCallback(async(U,T)=>{const W=T.trim();if(!W)throw new Error("请输入部门名称");if(y?.departments.some(ge=>ge.id!==U&&ge.name===W))throw new Error("部门名称已存在");const ne=new AbortController;z.current.add(ne);try{await t.department(U,W,ne.signal),await Z(ne.signal),f.current&&K()}finally{z.current.delete(ne)}},[y,t,Z,K]),O=p.useCallback(async(U,T)=>{const W=new AbortController;z.current.add(W);const ne=++R.current;try{const ge=await t.assign(U,T,W.signal);f.current&&!W.signal.aborted&&(ne===R.current&&(x(ge),w("")),K())}finally{z.current.delete(W)}},[t,K]),ae=p.useCallback(()=>{b.current?.abort(),b.current=null,N(!1),P()},[P]),se=p.useCallback(async()=>{ae(),_("");const U=d.current;if(!U){_("尚无成功加载的费用快照，无法导出已加载范围；请先成功读取费用。");return}const T={...U.query,cursor:U.data.export_cursor},W=new AbortController;b.current=W,N(!0);try{const ne=await t.export(T,W.signal);if(!f.current||W.signal.aborted)return;const ge=URL.createObjectURL(ne);C.current=ge;const Te=document.createElement("a");Te.href=ge,Te.download=`费用报表-${T.to}.csv`,Te.click(),$.current=setTimeout(P,1e3)}catch(ne){f.current&&!W.signal.aborted&&_(`导出失败：${de(ne)}`)}finally{f.current&&b.current===W&&(b.current=null,N(!1))}},[t,ae,P]);return{query:s,snapshot:r,budgetMonth:c,busy:m,error:h,catalog:y,catalogError:S,retryCatalog:G,change:D,refresh:K,paginate:j,saveDepartment:M,assign:O,exportCSV:se,cancelExport:ae,exporting:E,exportError:A,stale:r!==null&&JSON.stringify(r.query)!==JSON.stringify(s)}}const No="_page_1vgiq_1",$o="_small_1vgiq_92",So="_muted_1vgiq_95",Co="_blue_1vgiq_98",zo="_green_1vgiq_101",Eo="_amber_1vgiq_104",Po="_red_1vgiq_107",Mo="_error_1vgiq_108",Io="_mono_1vgiq_111",To="_amount_1vgiq_112",qo="_row_1vgiq_117",Do="_actions_1vgiq_118",Ao="_filters_1vgiq_119",Ro="_icon_1vgiq_128",Lo="_topbar_1vgiq_138",Fo="_crumb_1vgiq_148",Oo="_brand_1vgiq_154",Uo="_tag_1vgiq_158",Wo="_btn_1vgiq_179",Bo="_primary_1vgiq_195",Vo="_link_1vgiq_205",Ho="_content_1vgiq_221",Go="_eyebrow_1vgiq_234",Jo="_subtitle_1vgiq_240",Zo="_filter_1vgiq_119",Yo="_nav_1vgiq_282",Ko="_scope_1vgiq_311",Xo="_grid_1vgiq_321",Qo="_card_1vgiq_325",ec="_kpis_1vgiq_332",nc="_kpi_1vgiq_332",tc="_insight_1vgiq_372",sc="_split_1vgiq_390",ac="_segmented_1vgiq_409",ic="_legend_1vgiq_429",rc="_key_1vgiq_436",lc="_local_1vgiq_444",oc="_chart_1vgiq_447",cc="_notice_1vgiq_481",dc="_progress_1vgiq_495",pc="_lower_1vgiq_508",uc="_rank_1vgiq_575",mc="_priority_1vgiq_601",hc="_table_1vgiq_557",xc="_numeric_1vgiq_657",fc="_label_1vgiq_663",gc="_sub_1vgiq_240",bc="_search_1vgiq_725",jc="_pagination_1vgiq_748",vc="_empty_1vgiq_764",yc="_coverage_1vgiq_831",_c="_note_1vgiq_838",wc="_footer_1vgiq_846",kc="_costDialog_1vgiq_856",Nc="_drawer_1vgiq_870",$c="_field_1vgiq_978",Sc="_result_1vgiq_1005",Cc="_timestamp_1vgiq_1050",zc="_extra_1vgiq_1074",o={page:No,small:$o,muted:So,blue:Co,green:zo,amber:Eo,red:Po,error:Mo,mono:Io,amount:To,row:qo,actions:Do,filters:Ao,icon:Ro,topbar:Lo,crumb:Fo,brand:Oo,tag:Uo,btn:Wo,primary:Bo,"icon-button":"_icon-button_1vgiq_201",link:Vo,content:Ho,"page-heading":"_page-heading_1vgiq_227",eyebrow:Go,subtitle:Jo,filter:Zo,nav:Yo,scope:Ko,grid:Xo,card:Qo,kpis:ec,kpi:nc,"gpu-kpi":"_gpu-kpi_1vgiq_343","kpi-label":"_kpi-label_1vgiq_349","kpi-value":"_kpi-value_1vgiq_356","kpi-foot":"_kpi-foot_1vgiq_364",insight:tc,split:sc,"card-head":"_card-head_1vgiq_394","card-body":"_card-body_1vgiq_406",segmented:ac,legend:ic,key:rc,local:lc,chart:oc,"chart-detail":"_chart-detail_1vgiq_456","card-foot":"_card-foot_1vgiq_461","info-row":"_info-row_1vgiq_471",notice:cc,progress:dc,lower:pc,"analysis-card":"_analysis-card_1vgiq_512","analysis-controls":"_analysis-controls_1vgiq_515","trend-summary":"_trend-summary_1vgiq_524","trend-scroll":"_trend-scroll_1vgiq_530","day-hit":"_day-hit_1vgiq_542","daily-data":"_daily-data_1vgiq_549","table-scroll":"_table-scroll_1vgiq_557","composition-table":"_composition-table_1vgiq_560","composition-tools":"_composition-tools_1vgiq_567",rank:uc,"rank-label":"_rank-label_1vgiq_584",priority:mc,"section-head":"_section-head_1vgiq_614",table:hc,numeric:xc,label:fc,sub:gc,"model-name":"_model-name_1vgiq_675","model-mark":"_model-mark_1vgiq_680","mini-kpis":"_mini-kpis_1vgiq_692","mini-kpi":"_mini-kpi_1vgiq_692","equivalent-range":"_equivalent-range_1vgiq_703","section-strip":"_section-strip_1vgiq_713",search:bc,pagination:jc,empty:vc,"project-grid":"_project-grid_1vgiq_777","pricing-option":"_pricing-option_1vgiq_781","project-card":"_project-card_1vgiq_788","department-grid":"_department-grid_1vgiq_800","department-card":"_department-card_1vgiq_804","mapping-banner":"_mapping-banner_1vgiq_813",coverage:yc,note:_c,footer:wc,costDialog:kc,drawer:Nc,"dialog-head":"_dialog-head_1vgiq_923","dialog-body":"_dialog-body_1vgiq_934","modal-body":"_modal-body_1vgiq_935","dialog-footer":"_dialog-footer_1vgiq_954","detail-line":"_detail-line_1vgiq_961",field:$c,"field-row":"_field-row_1vgiq_1000",result:Sc,timestamp:Cc,extra:zc};function $e({name:n}){return e.jsxs("svg",{className:o.icon,viewBox:"0 0 24 24","aria-hidden":"true",children:[n==="info"&&e.jsxs(e.Fragment,{children:[e.jsx("circle",{cx:"12",cy:"12",r:"9"}),e.jsx("path",{d:"M12 11v6m0-10v1"})]}),n==="search"&&e.jsxs(e.Fragment,{children:[e.jsx("circle",{cx:"10",cy:"10",r:"6"}),e.jsx("path",{d:"m15 15 5 5"})]}),n==="chart"&&e.jsx("path",{d:"M4 4v16h16M8 15v-4m5 4V7m5 8v-6"}),n==="alert"&&e.jsxs(e.Fragment,{children:[e.jsx("path",{d:"m12 3 10 18H2L12 3Z"}),e.jsx("path",{d:"M12 9v5m0 3v1"})]}),n==="cloud"&&e.jsx("path",{d:"M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13 1 4.5 4.5 0 0 1 0 9H6Z"}),n==="download"&&e.jsx("path",{d:"M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"}),n==="arrow"&&e.jsx("path",{d:"M5 12h14m-5-5 5 5-5 5"})]})}function Je({label:n,value:t,onChange:s,children:a}){return e.jsxs("label",{className:o.filter,children:[e.jsx("span",{children:n}),e.jsx("select",{"aria-label":n,value:t,onChange:i=>s(i.currentTarget.value),children:a})]})}const je=(n,t=0)=>n.toLocaleString("zh-CN",{maximumFractionDigits:t});function Ec({metric:n,currency:t,generation:s,api:a,modelCount:i}){const r=s??(n.generation_tasks===n.tasks?n:null),l=a??(n.api_tasks===n.tasks?n:null),c=r??n;return e.jsxs("div",{className:`${o.grid} ${o.kpis}`,children:[e.jsxs("article",{className:`${o.card} ${o.kpi}`,children:[e.jsxs("div",{className:o["kpi-label"],children:["成本合计（含估算）",e.jsx($e,{name:"chart"})]}),e.jsx("div",{className:`${o["kpi-value"]} ${o.mono}`,children:ye(n,t)}),e.jsxs("div",{className:o["kpi-foot"],children:[e.jsx("span",{className:`${o.tag} ${o.blue}`,children:"实际 + 历史估算"}),e.jsxs("span",{children:["未知 ",n.unknown_cost_tasks," 条另计"]})]})]}),e.jsxs("article",{className:`${o.card} ${o.kpi}`,children:[e.jsxs("div",{className:o["kpi-label"],children:["任务数量 · 含 API 调用",e.jsx($e,{name:"chart"})]}),e.jsx("div",{className:`${o["kpi-value"]} ${o.mono}`,children:je(n.tasks)}),e.jsxs("div",{className:o["kpi-foot"],children:[e.jsxs("span",{children:["生成任务 ",je(n.generation_tasks)]}),e.jsxs("span",{children:["API 调用 ",je(n.api_tasks)]})]}),e.jsxs("div",{className:o["kpi-foot"],children:["完成 ",je(n.done)," / 失败 ",je(n.error)," / 取消 ",je(n.canceled)]})]}),e.jsxs("article",{className:`${o.card} ${o.kpi}`,children:[e.jsxs("div",{className:o["kpi-label"],children:["生成任务成功率",e.jsx($e,{name:"info"})]}),e.jsx("div",{className:`${o["kpi-value"]} ${o.mono}`,children:r?.generation_tasks?`${(r.done/r.generation_tasks*100).toFixed(1)}%`:"—"}),e.jsxs("div",{className:o["kpi-foot"],children:[e.jsxs("span",{children:["完成 ",je(r?.done??0)," / ",je(r?.generation_tasks??0)]}),e.jsx("span",{children:"仅生成任务，不混入 API 调用"})]})]}),e.jsxs("article",{className:`${o.card} ${o.kpi}`,children:[e.jsxs("div",{className:o["kpi-label"],children:["已记录成本（不含估算）",e.jsx($e,{name:"info"})]}),e.jsx("div",{className:`${o["kpi-value"]} ${o.mono}`,children:ye({...n,total_cost:n.actual_cost},t)}),e.jsxs("div",{className:o["kpi-foot"],children:[e.jsxs("span",{className:o.green,children:["历史估算 ",te(n.estimated_cost,t)]}),e.jsx("span",{children:"非供应商对账结果"})]})]}),e.jsxs("article",{className:`${o.card} ${o.kpi}`,children:[e.jsxs("div",{className:o["kpi-label"],children:["API 已知成本",e.jsx($e,{name:"cloud"})]}),e.jsx("div",{className:`${o["kpi-value"]} ${o.mono}`,children:l?ye(l,t,4):n.api_tasks===0?te(0,t,4):"未知"}),e.jsxs("div",{className:o["kpi-foot"],children:[e.jsxs("span",{className:o.blue,children:[je(n.api_tasks)," 条 API 事件"]}),e.jsx("span",{children:i==null?"模型数量未提供":`${i} 个已记录模型`})]})]}),e.jsxs("article",{className:`${o.card} ${o.kpi}`,children:[e.jsxs("div",{className:o["kpi-label"],children:["失败与取消损耗",e.jsx($e,{name:"alert"})]}),e.jsx("div",{className:`${o["kpi-value"]} ${o.mono}`,children:ye({...n,total_cost:n.failed_waste},t)}),e.jsxs("div",{className:o["kpi-foot"],children:[e.jsxs("span",{className:o.amber,children:[je(n.error+n.canceled)," 条失败 / 取消"]}),e.jsx("span",{children:"已含在总成本内"})]})]}),e.jsxs("article",{className:`${o.card} ${o.kpi} ${o["gpu-kpi"]}`,children:[e.jsxs("div",{children:[e.jsxs("div",{className:o["kpi-label"],children:["GPU 用量",e.jsx($e,{name:"chart"})]}),e.jsx("div",{className:`${o["kpi-value"]} ${o.mono}`,children:c.generation_tasks>0&&c.runtime_unknown_tasks>=c.generation_tasks?"未记录":`${je(c.gpu_hours,2)} 小时`}),e.jsxs("div",{className:o["kpi-foot"],children:["生成任务记录时长 / 不含云端 API",c.runtime_unknown_tasks>0?` · ${je(c.runtime_unknown_tasks)} 条缺耗时未计`:""]})]}),e.jsxs("div",{children:[e.jsx("div",{className:o["kpi-label"],children:"其中电费"}),e.jsx("div",{className:`${o["kpi-value"]} ${o.mono}`,children:te(c.electricity_cost,t,4)}),e.jsx("div",{className:o["kpi-foot"],children:"系统计价电费 · 已包含在成本内，不重复累计"})]})]})]})}function Pc({metric:n,currency:t,source:s}){const a=s==="api"?4:2;return e.jsxs("div",{className:`${o.grid} ${o["mini-kpis"]}`,children:[e.jsxs("article",{className:`${o.card} ${o["mini-kpi"]}`,children:[e.jsxs("span",{className:`${o.muted} ${o.small}`,children:[s==="api"?"API":"本地算力","已知成本"]}),e.jsx("div",{className:o.amount,children:ye(n,t,a)}),e.jsxs("span",{className:`${o.small} ${o.muted}`,children:["已含在总成本内 · 未知 ",n.unknown_cost_tasks," 条另计"]})]}),e.jsxs("article",{className:`${o.card} ${o["mini-kpi"]}`,children:[e.jsx("span",{className:`${o.muted} ${o.small}`,children:"系统实际记录"}),e.jsx("div",{className:o.amount,children:ye({...n,total_cost:n.actual_cost},t,a)}),e.jsxs("span",{className:`${o.small} ${o.muted}`,children:["历史估算 ",te(n.estimated_cost,t,a)," · 非供应商对账"]})]}),e.jsxs("article",{className:`${o.card} ${o["mini-kpi"]}`,children:[e.jsx("span",{className:`${o.muted} ${o.small}`,children:"费用记录 / 成功"}),e.jsxs("div",{className:o.amount,children:[je(n.tasks)," / ",je(n.done)]}),e.jsx("span",{className:`${o.small} ${o.muted}`,children:s==="api"?"仅显示实际采集的用量，不从金额反推 Token":"生成任务账本口径 · 不含 API 事件"})]})]})}function jt({page:n,count:t,previous:s,next:a,disabled:i=!1,pageSize:r=10,noun:l="项"}){return e.jsxs("div",{className:o.pagination,children:[e.jsxs("span",{children:["共 ",t," ",l]}),e.jsxs("div",{className:o.row,children:[e.jsx("button",{className:o.btn,type:"button",disabled:i||n===0,onClick:s,children:"上一页"}),e.jsxs("span",{children:[n+1," / ",Math.max(1,Math.ceil(t/r))]}),e.jsx("button",{className:o.btn,type:"button",disabled:i||(n+1)*r>=t,onClick:a,children:"下一页"})]})]})}function Mc({groups:n,currency:t,title:s,total:a,drill:i,searchLabel:r,controls:l,label:c="类型"}){const[u,d]=p.useState(0),[m,v]=p.useState(""),h=n.filter(y=>y.label.toLocaleLowerCase().includes(m.toLocaleLowerCase())).sort((y,x)=>x.total_cost-y.total_cost||y.key.localeCompare(x.key)),g=Math.min(u,Math.max(0,Math.ceil(h.length/10)-1));return e.jsxs("article",{className:`${o.card} ${o["analysis-card"]}`,"aria-label":s,children:[e.jsxs("div",{className:o["card-head"],children:[e.jsxs("div",{children:[e.jsx("h2",{children:s}),e.jsx("p",{children:"沿用类型 / 能力 / 执行端视角，按已知内部成本排序，而非建议收费。"})]}),r&&e.jsxs("label",{className:o.search,children:[e.jsx($e,{name:"search"}),e.jsx("input",{"aria-label":r,placeholder:r,value:m,onChange:y=>{v(y.currentTarget.value),d(0)}})]})]}),e.jsxs("div",{className:o["composition-tools"],children:[l,e.jsx("span",{className:`${o.muted} ${o.small}`,children:"数量含生成任务与 API 调用；两者拆分列示。"})]}),e.jsx("div",{className:o["table-scroll"],children:e.jsxs("table",{className:`${o.table} ${o["composition-table"]}`,children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:c}),e.jsx("th",{className:o.numeric,children:"任务 / 调用量"}),e.jsx("th",{className:o.numeric,children:"已知成本"}),e.jsx("th",{className:o.numeric,children:"成本占比"}),e.jsx("th",{className:o.numeric,children:"失败 / 取消"}),e.jsx("th",{className:o.numeric,children:"成本未知"}),e.jsx("th",{})]})}),e.jsxs("tbody",{children:[h.slice(g*10,g*10+10).map(y=>{const x=y.tasks>0&&y.unknown_cost_tasks>=y.tasks,S=x||a<=0?null:y.total_cost/a*100;return e.jsxs("tr",{children:[e.jsxs("td",{className:o.label,children:[e.jsx("strong",{children:y.label||"未知"}),c==="能力"&&e.jsx("span",{className:o.sub,children:y.key})]}),e.jsxs("td",{className:o.numeric,children:[je(y.tasks),e.jsxs("span",{className:o.sub,children:["生成 ",je(y.generation_tasks)," / API ",je(y.api_tasks)]})]}),e.jsxs("td",{className:o.numeric,children:[ye(y,t,4),e.jsx("span",{className:o.sub,children:x?"金额待确认":`实际 ${te(y.actual_cost,t,4)} / 估算 ${te(y.estimated_cost,t,4)}`})]}),e.jsxs("td",{className:o.numeric,children:[S==null?"—":`${S.toFixed(1)}%`,S!==null&&e.jsx("div",{className:o.progress,"aria-hidden":"true",children:e.jsx("span",{style:{width:`${Math.min(100,S)}%`}})})]}),e.jsxs("td",{className:o.numeric,children:[je(y.error)," / ",je(y.canceled)]}),e.jsxs("td",{className:o.numeric,children:[je(y.unknown_cost_tasks)," 条"]}),e.jsx("td",{children:e.jsx("button",{type:"button",className:o.link,"aria-label":`查看${y.label}明细`,onClick:()=>i(y),children:"费用明细 →"})})]},y.key)}),h.length===0&&e.jsx("tr",{children:e.jsx("td",{colSpan:7,className:o.empty,children:"当前范围没有费用构成"})})]})]})}),e.jsx(jt,{page:g,count:h.length,previous:()=>d(g-1),next:()=>d(g+1)}),e.jsxs("div",{className:o["card-foot"],children:["全部分组已知成本 ",te(a,t)," · 占比和横条均以当前范围全部已知成本为分母，不是相对最大项，也不是建议收费。"]})]})}function Ic({groups:n,currency:t,drill:s}){const[a,i]=p.useState(""),[r,l]=p.useState(0),c=n.filter(d=>d.label.toLocaleLowerCase().includes(a.toLocaleLowerCase())),u=Math.min(r,Math.max(0,Math.ceil(c.length/10)-1));return e.jsxs("article",{className:o.card,"aria-label":"已记录模型（API / image_api）",children:[e.jsxs("div",{className:o["section-strip"],children:[e.jsxs("div",{children:[e.jsx("h2",{children:"已记录模型"}),e.jsx("span",{className:`${o.muted} ${o.small}`,children:"仅显示已采集字段，不从费用反推 Token 或单价。"})]}),e.jsxs("label",{className:o.search,children:[e.jsx($e,{name:"search"}),e.jsx("input",{"aria-label":"搜索API模型",placeholder:"搜索真实模型名称",value:a,onChange:d=>{i(d.currentTarget.value),l(0)}})]})]}),e.jsx("div",{className:o["table-scroll"],children:e.jsxs("table",{className:o.table,children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"模型"}),e.jsx("th",{children:"记录 / 成功"}),e.jsx("th",{children:"用量与单价"}),e.jsx("th",{className:o.numeric,children:"已知成本"}),e.jsx("th",{children:"成本口径"}),e.jsx("th",{})]})}),e.jsxs("tbody",{children:[c.slice(u*10,u*10+10).map(d=>{const m=d.tasks>0&&d.unknown_cost_tasks>=d.tasks;return e.jsxs("tr",{children:[e.jsx("td",{className:o.label,children:e.jsx("button",{className:o.link,type:"button",onClick:()=>s(d),children:d.label})}),e.jsxs("td",{className:o.mono,children:[d.tasks," / ",d.done]}),e.jsxs("td",{children:[e.jsx("span",{className:o.muted,children:"见逐笔明细"}),e.jsx("span",{className:o.sub,children:"不反推用量或虚构单价"})]}),e.jsx("td",{className:o.numeric,children:ye(d,t,4)}),e.jsxs("td",{children:[m?"待确认":`实际 ${te(d.actual_cost,t,4)}`,e.jsxs("span",{className:o.sub,children:[m?"":`估算 ${te(d.estimated_cost,t,4)} / `,"未知"," ",d.unknown_cost_tasks," 条"]})]}),e.jsx("td",{children:e.jsx("button",{type:"button",className:o.link,"aria-label":`查看${d.label}明细`,onClick:()=>s(d),children:"费用详情 →"})})]},d.key)}),c.length===0&&e.jsx("tr",{children:e.jsx("td",{colSpan:6,className:o.empty,children:"当前范围没有 API 记录"})})]})]})}),e.jsx(jt,{page:u,count:c.length,previous:()=>l(u-1),next:()=>l(u+1)})]})}function Tc(n){const t=[...n].sort((l,c)=>l.day.localeCompare(c.day)),s=t[0],a=t.at(-1);if(!s||!a)return[];const i=new Map(t.map(l=>[l.day,l])),r=[];for(let l=Date.parse(s.day);l<=Date.parse(a.day);l+=864e5){const c=new Date(l).toISOString().slice(0,10);r.push({day:c,data:i.get(c)??null})}return r}const we=(n,t=0)=>n.toLocaleString("zh-CN",{minimumFractionDigits:t,maximumFractionDigits:t}),Ve=(n,t)=>n>0&&t>=n,Ps=n=>n!=null&&n!==0&&Math.abs(n)<1?4:2,Cn=(n,t)=>te(n,t,Ps(n)),Xn=(n,t)=>ye(n,t,Ps(n.total_cost));function qc({days:n,currency:t,drill:s,controls:a}){const[i,r]=p.useState("daily"),[l,c]=p.useState(""),u=p.useRef(new Map),d=p.useMemo(()=>Tc(n),[n]),m=d.find(j=>j.day===l)??[...d].reverse().find(j=>j.data&&j.data.tasks>0)??d.at(-1);let v=0,h=0,g=0,y=0;const x=d.map(j=>(j.data?(v+=j.data.total_cost,h+=j.data.unknown_cost_tasks,g+=j.data.tasks):y++,{...j,cumulative:v,cumulativeUnknown:h,cumulativeCount:g,missingDays:y})),S=x.find(j=>j.day===m?.day),w=x.at(-1),f=m?.data,k=(j,M,O)=>Ve(M,O)?"未知":Cn(j,t),z=x.filter(j=>j.data!==null),R=z.filter(j=>j.data&&!Ve(j.data.tasks,j.data.unknown_cost_tasks)).reduce((j,M)=>!j||(M.data?.total_cost??0)>(j.data?.total_cost??0)?M:j,void 0),E=z.reduce((j,M)=>!j||(M.data?.tasks??0)>(j.data?.tasks??0)?M:j,void 0),N=(Math.max(0,...x.map(j=>i==="daily"?j.data?.total_cost??0:j.cumulative))||1)*1.12,A=Math.max(1,Math.ceil(Math.max(0,...z.map(j=>j.data?.tasks??0))*1.1)),_=602/Math.max(x.length,1),b=62,C=164,$=132,P=298,q=68,Z=[];let G=[];x.forEach((j,M)=>{!j.data||Ve(j.cumulativeCount,j.cumulativeUnknown)?(G.length&&Z.push(G),G=[]):G.push(`${b+_*(M+.5)},${C-$*j.cumulative/N}`)}),G.length&&Z.push(G);const K=!!(f&&f.tasks>0),D=()=>{if(!m)return"无记录，不生成虚构趋势。";if(!f)return`${m.day} · 服务端未返回此日数据，不能将缺失解释为零元。`;const j=i==="cumulative"&&S?`截至当日累计已知 ${k(S.cumulative,S.cumulativeCount,S.cumulativeUnknown)}（未知 ${S.cumulativeUnknown} 条另计${S.missingDays?`，另有 ${S.missingDays} 日数据未返回`:""}）；`:"",M=Ve(f.tasks,f.unknown_cost_tasks);return`${m.day} · ${j}当日已知 ${Xn(f,t)}（实际 ${M?"未知":Cn(f.actual_cost,t)} / 估算 ${M?"未知":Cn(f.estimated_cost,t)}）；生成 ${we(f.generation_tasks)} / API ${we(f.api_tasks)}；完成 ${we(f.done)} / 失败 ${we(f.error)} / 取消 ${we(f.canceled)}；成本未知 ${f.unknown_cost_tasks} 条。${f.tasks?"":"当天无记录。"}`};return e.jsxs("article",{className:o.card,"aria-label":"成本与任务趋势",children:[e.jsxs("div",{className:o["card-head"],children:[e.jsxs("div",{children:[e.jsx("h2",{children:"成本与任务趋势"}),e.jsx("p",{children:"同一时间轴看成本与工作量 · 按创建时间，不是供应商结算日期"})]}),e.jsxs("div",{className:o.segmented,"aria-label":"趋势方式",children:[e.jsx("button",{type:"button","aria-pressed":i==="daily",onClick:()=>r("daily"),children:"每日消耗"}),e.jsx("button",{type:"button","aria-pressed":i==="cumulative",onClick:()=>r("cumulative"),children:"累计成本"})]})]}),e.jsxs("div",{className:o["card-body"],children:[a!=null&&e.jsx("div",{className:o["analysis-controls"],children:a}),e.jsxs("div",{className:o.legend,children:[e.jsxs("span",{children:[e.jsx("i",{className:`${o.key} ${o.local}`,"aria-hidden":"true"}),"本地算力 / 生成任务"]}),e.jsxs("span",{children:[e.jsx("i",{className:o.key,"aria-hidden":"true"}),"云端 API"]}),e.jsx("span",{className:o.amber,children:"△ 有未知成本"}),i==="cumulative"&&e.jsx("span",{children:"上图蓝线：累计已知总成本"})]}),e.jsx("p",{className:o["trend-summary"],children:w?`${Ve(w.cumulativeCount,w.cumulativeUnknown)?"全部成本未知，无法判断成本峰值。":`单日已知成本峰值 ${R?.day} · ${Cn(R?.data?.total_cost,t)}。`} 任务 / 调用峰值 ${E?.day} · ${we(E?.data?.tasks??0)} 条。${y?`另有 ${y} 日数据未返回，峰值仅比较已返回日期。`:""}`:"当前趋势筛选没有记录。请调整来源、类型或全局筛选。"}),e.jsxs("p",{className:`${o.muted} ${o.small}`,children:["上图：成本（",t||"币种未知","） · 下图：每日任务 / API 调用量（条）"]}),e.jsx("div",{className:o["trend-scroll"],role:"region","aria-label":"成本和任务趋势图，可横向滚动",tabIndex:0,children:e.jsx("svg",{className:o.chart,viewBox:"0 0 680 340",role:"group","aria-label":"上图成本，下图每日生成任务与API调用量",children:x.length>0&&e.jsxs(e.Fragment,{children:[e.jsxs("text",{x:b,y:15,children:[i==="daily"?"每日已知成本":"累计已知成本"," / ",t||"币种未知"]}),e.jsx("text",{x:b,y:212,children:"每日任务 / 调用量（条）"}),Array.from({length:4},(j,M)=>{const O=C-$*M/3;return e.jsxs("g",{children:[e.jsx("line",{x1:b,x2:668,y1:O,y2:O,stroke:"var(--cost-line)",strokeDasharray:"3 4"}),e.jsx("text",{x:54,y:O+4,textAnchor:"end",children:we(N*M/3,N<10?4:0)})]},M)}),[0,A].map(j=>{const M=P-q*j/A;return e.jsxs("g",{children:[e.jsx("line",{x1:b,x2:668,y1:M,y2:M,stroke:"var(--cost-line)",strokeDasharray:"3 4"}),e.jsx("text",{x:54,y:M+4,textAnchor:"end",children:we(j)})]},j)}),i==="cumulative"&&Z.map((j,M)=>e.jsx("polyline",{points:j.join(" "),stroke:"var(--cost-blue)",strokeWidth:2,fill:"none"},M)),x.map((j,M)=>{const O=j.data,ae=b+_*(M+.2),se=_*.6,U=b+_*(M+.5),T=O?$*Math.max(0,O.generation_cost)/N:0,W=O?$*O.api_cost/N:0,ne=O?q*O.generation_tasks/A:0,ge=O?q*O.api_tasks/A:0,Te=O?`${j.day} 每日已知成本 ${Xn(O,t)}，生成任务 ${O.generation_tasks}，API调用 ${O.api_tasks}，未知成本 ${O.unknown_cost_tasks}条`:`${j.day} 数据未返回，不补零`,Hn=()=>c(j.day);return e.jsxs("g",{children:[e.jsxs("g",{"data-day":j.day,role:"button","aria-pressed":m?.day===j.day,"aria-label":Te,tabIndex:0,ref:Ce=>{Ce?u.current.set(j.day,Ce):u.current.delete(j.day)},onClick:Hn,onFocus:Hn,onKeyDown:Ce=>{let on=M;if(Ce.key==="ArrowLeft")on=Math.max(0,M-1);else if(Ce.key==="ArrowRight")on=Math.min(x.length-1,M+1);else if(Ce.key==="Home")on=0;else if(Ce.key==="End")on=x.length-1;else if(Ce.key==="Enter"||Ce.key===" "){Ce.preventDefault(),Hn(),Ce.key==="Enter"&&O&&O.tasks>0&&s(j.day);return}else return;Ce.preventDefault();const St=x[on];if(St){const Ct=u.current.get(St.day);Ct?.focus(),Ct?.scrollIntoView?.({block:"nearest",inline:"nearest"})}},children:[e.jsx("rect",{className:o["day-hit"],x:b+_*M,y:24,width:_,height:278,fill:"transparent"}),O&&e.jsxs(e.Fragment,{children:[i==="daily"&&!Ve(O.tasks,O.unknown_cost_tasks)&&e.jsxs(e.Fragment,{children:[e.jsx("rect",{x:ae,y:C-T,width:se,height:T,fill:"var(--cost-muted)"}),e.jsx("rect",{x:ae,y:C-T-W,width:se,height:W,fill:"var(--cost-blue)"})]}),i==="cumulative"&&!Ve(j.cumulativeCount,j.cumulativeUnknown)&&e.jsx("circle",{cx:U,cy:C-$*j.cumulative/N,r:2.5,fill:"var(--cost-blue)"}),e.jsx("rect",{x:ae,y:P-ne,width:se,height:ne,fill:"var(--cost-muted)"}),e.jsx("rect",{x:ae,y:P-ne-ge,width:se,height:ge,fill:"var(--cost-blue)"})]}),(!O||O.unknown_cost_tasks>0)&&e.jsx("path",{d:`M${U},178 l-3,6 h6 z`,fill:"var(--cost-amber, var(--amber))"}),e.jsx("title",{children:Te})]}),(M===0||M===x.length-1||M%Math.ceil(x.length/6)===0&&M<x.length-Math.ceil(x.length/12))&&e.jsx("text",{x:U,y:326,textAnchor:"middle",children:j.day.slice(5).replace("-","/")})]},j.day)})]})})}),e.jsx("div",{className:o["chart-detail"],"aria-live":"polite",children:D()}),e.jsx("button",{className:o.link,type:"button",disabled:!K,onClick:()=>{K&&m&&s(m.day)},children:m?`查看 ${m.day} 当日明细 →`:"查看所选日期明细 →"}),e.jsxs("details",{className:o["daily-data"],children:[e.jsx("summary",{children:"查看每日数据表（支持键盘选择日期）"}),e.jsx("div",{className:o["table-scroll"],children:e.jsxs("table",{className:o.table,children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"日期"}),e.jsx("th",{children:"已知成本"}),e.jsx("th",{children:"生成任务"}),e.jsx("th",{children:"API 调用"}),e.jsx("th",{children:"完成 / 失败 / 取消"}),e.jsx("th",{children:"成本未知"})]})}),e.jsxs("tbody",{children:[!d.length&&e.jsx("tr",{children:e.jsx("td",{colSpan:6,children:"当前范围没有每日数据。"})}),d.map(j=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("button",{className:o.link,type:"button",onClick:()=>c(j.day),children:j.day})}),e.jsx("td",{className:o.numeric,children:j.data?Xn(j.data,t):"数据未返回"}),e.jsx("td",{className:o.numeric,children:j.data?we(j.data.generation_tasks):"未知"}),e.jsx("td",{className:o.numeric,children:j.data?we(j.data.api_tasks):"未知"}),e.jsx("td",{children:j.data?`${we(j.data.done)} / ${we(j.data.error)} / ${we(j.data.canceled)}`:"未知"}),e.jsx("td",{children:j.data?`${j.data.unknown_cost_tasks} 条`:"未知"})]},j.day))]})]})})]}),e.jsx("p",{className:`${o.muted} ${o.small}`,children:"来源与类型仅筛选趋势。图表可横向滚动，点击或键盘选择日期；连续日历轴，服务端明确返回的无记录日展示零，缺失日不补零，未知金额不按零元核价，采集当天尚未结束。"})]}),e.jsx("div",{className:o["card-foot"],children:w?`${d.length} 个自然日 · ${z.filter(j=>j.data&&j.data.tasks>0).length} 个有记录日期 · ${we(w.cumulativeCount)} 条记录 · 已知成本 ${k(w.cumulative,w.cumulativeCount,w.cumulativeUnknown)} · 未知 ${w.cumulativeUnknown} 条另计${y?` · ${y} 日数据未返回`:""}`:"暂无数据"})]})}const Ms={done:"已完成",error:"失败",canceled:"已取消",running:"运行中",queued:"排队",unknown:"未知"},Dc={actual:"实际记录",estimated:"历史估算",unknown:"未知"};function Is(n){const t=n.cost_source||"unknown";return e.jsx("span",{className:`${o.tag} ${o[t==="actual"?"green":t==="estimated"?"blue":"amber"]}`,children:Dc[t]||"成本口径未知"})}function Ac({item:n,currency:t,onClose:s}){const a=[["任务 ID",n.job_id],["请求 ID",n.request_id],["创建时间（北京时间）",fn(n.created_at)],["项目（记录名）",n.project_name],["项目 ID",n.project_id],["提交账号",n.account_name],["账号 ID",n.account_id],["部门（逐笔归属）",n.department_name],["部门 ID",n.department_id],["归属依据",n.attribution_basis],["卡片",n.card_name],["类型",n.category_name||n.category],["能力",n.capability],["模型",n.model],["执行端",n.worker_name],["任务状态",Ms[n.status||"unknown"]||n.status],["来源",n.source==="generation"?"生成任务":"API 事件"],["事件类型",n.event_kind],["实际记录",n.cost_source==="actual"?te(n.actual_cost,t,6):"未记录 / 不适用"],["历史估算",n.cost_source==="estimated"?te(n.estimated_cost,t,6):"未记录 / 不适用"],["计费来源",n.billing_source],["原币金额",n.provider_amount],["原币币种",n.provider_currency],["输入 Token",n.prompt_tokens?.toLocaleString("zh-CN")],["输出 Token",n.completion_tokens?.toLocaleString("zh-CN")],["缓存 Token",n.cached_tokens?.toLocaleString("zh-CN")],...n.source==="generation"?[["GPU / 执行耗时",n.runtime_seconds==null?null:`${n.runtime_seconds} 秒`],["电费（已含成本）",te(n.electricity_cost,t,6)]]:[],["建议收费",`${te(n.retail_min,t,4)}–${te(n.retail_max,t,4)}`],["建议收费来源",n.retail_source],["收费依据",n.retail_basis]];return e.jsxs(xe,{title:"费用记录详情",onClose:s,className:o.costDialog+" "+o.drawer,children:[Is(n),e.jsx("div",{className:o.amount,children:n.cost_source==="unknown"||n.cost_source==null?"未知":te(n.recognized_cost,t,6)}),a.map(([i,r])=>e.jsxs("div",{className:o["detail-line"],children:[e.jsx("span",{children:i}),e.jsx("span",{children:r==null||r===""||r==="unknown"?"未知 / 未采集":r})]},i)),e.jsxs("div",{className:o.notice,children:[n.cost_source==="unknown"||n.cost_source==null?"成本未知，接口中的 0 不能解释为已知零成本。":n.cost_source==="estimated"?"历史估算不是实际结算费用。":"“实际记录”表示平台账本字段，不表示供应商已对账；已知零元不等于免费。"," ","选中记录为读取快照；原币与入账币种不可直接相加，缺失币种不推断为 CNY 或 USD。 归属以服务端逐笔依据为准：新费用保存部门快照；旧费用缺少快照时可能按当前账号映射归属，不代表真实历史部门。"]}),Es(n)&&e.jsx("div",{className:o.notice,children:"本地验收电费为按配置复算，非原逐笔实账。此标记仅适用于本条验收导入记录，不代表生产账本口径。"})]})}function Rc({state:n}){const[t,s]=p.useState(null),a=n.query.filters,i=n.snapshot,r=[];if(a.detail_dimension){const l={category:"类型",capability:"能力",worker:"执行端"}[a.detail_dimension],c=i?.data.composition[a.detail_dimension].find(u=>u.key===a.detail_key);r.push(`${l}：${c?.label||a.detail_key}`)}if(a.detail_model){const l=i?.data.models.find(c=>c.key===a.detail_model);r.push(`模型：${l?.label||a.detail_model}`)}return a.detail_day&&r.push(`创建日期（北京时间）：${a.detail_day}`),e.jsxs("section",{"aria-label":"费用明细",children:[e.jsxs("div",{className:o["section-head"],children:[e.jsxs("div",{children:[e.jsx("h2",{children:"每一笔成本，都可以追溯"}),e.jsx("p",{children:"完整采集费用明细，每页 10 条服务端分页；CSV 导出已加载范围，不限当前页。"})]}),e.jsx("button",{className:o.link,type:"button",onClick:()=>n.change(zs),children:"清空明细筛选"})]}),r.length>0&&e.jsxs("div",{className:o.notice,children:["下钻范围 · ",r.join(" / "),"。与上方筛选共同生效；使用“清空明细筛选”移除此范围。"]}),i&&(n.stale||n.error)&&e.jsxs("div",{className:o.notice,role:"status",children:[n.error||"正在读取所选筛选范围。"," ","以下保留上次成功加载的明细与统计，不代表新筛选已生效。"]}),e.jsxs("article",{className:o.card,children:[e.jsxs("div",{className:o["section-strip"],children:[e.jsxs("div",{className:o.filters,children:[e.jsxs("label",{className:o.filter,children:[e.jsx("span",{children:"来源"}),e.jsxs("select",{"aria-label":"明细来源",value:a.detail_source,onChange:l=>{const c=Cs.safeParse(l.currentTarget.value);c.success&&n.change({detail_source:c.data})},children:[e.jsx("option",{value:"all",children:"全部来源"}),e.jsx("option",{value:"generation",children:"生成任务"}),e.jsx("option",{value:"api",children:"API 事件"})]})]}),e.jsxs("label",{className:o.filter,children:[e.jsx("span",{children:"成本"}),e.jsx("select",{"aria-label":"成本与状态",value:a.detail_status,onChange:l=>{const c=jo.safeParse(l.currentTarget.value);c.success&&n.change({detail_status:c.data})},children:Object.entries({all:"全部成本",actual:"实际记录",estimated:"历史估算",unknown:"成本未知",done:"已完成",error:"失败",canceled:"已取消",running:"运行中",queued:"排队中"}).map(([l,c])=>e.jsx("option",{value:l,children:c},l))})]})]}),e.jsxs("label",{className:o.search,children:[e.jsxs("svg",{className:o.icon,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.5","aria-hidden":"true",children:[e.jsx("circle",{cx:"10.5",cy:"10.5",r:"6.5"}),e.jsx("path",{d:"m16 16 4 4"})]}),e.jsx("input",{"aria-label":"搜索费用记录",value:a.detail_q,onChange:l=>n.change({detail_q:l.currentTarget.value}),placeholder:"搜索任务 / 项目 / 账号 / 能力"})]})]}),e.jsx("div",{className:o["table-scroll"],children:e.jsxs("table",{className:o.table,children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"创建时间 / 任务"}),e.jsx("th",{children:"项目 / 能力"}),e.jsx("th",{children:"提交账号"}),e.jsx("th",{children:"部门 · 逐笔归属"}),e.jsx("th",{children:"状态 / 来源"}),e.jsx("th",{children:"成本口径"}),e.jsx("th",{className:o.numeric,children:"已知成本"}),e.jsx("th",{"aria-label":"详情"})]})}),e.jsxs("tbody",{children:[i?.data.jobs.map((l,c)=>e.jsxs("tr",{children:[e.jsxs("td",{children:[fn(l.created_at),e.jsx("span",{className:`${o.sub} ${o.mono}`,children:l.job_id||l.request_id||"记录 ID 未采集"})]}),e.jsxs("td",{className:o.label,children:[l.project_name||"项目未知",e.jsx("span",{className:o.sub,children:l.capability||l.model||"未采集"})]}),e.jsxs("td",{className:o.label,children:[l.account_name||"提交账号未知",e.jsx("span",{className:o.sub,children:n.catalog?.accounts.find(u=>u.id===l.account_id)?.username||l.account_id||"未记录 / 未能关联"})]}),e.jsx("td",{children:l.department_name||(l.account_id?"未分配 / 未采集":"归属未知")}),e.jsxs("td",{children:[Ms[l.status||"unknown"]||l.status,e.jsx("span",{className:o.sub,children:l.source==="generation"?"生成任务":"API 事件"})]}),e.jsx("td",{children:Is(l)}),e.jsx("td",{className:o.numeric,children:yo(l,i.data.currency)}),e.jsx("td",{children:e.jsx("button",{className:o.link,type:"button",onClick:()=>s({item:l,currency:i.data.currency}),children:"详情 →"})})]},`${l.source}-${l.job_id??l.request_id??"unknown"}-${c}`)),!i?.data.jobs.length&&e.jsx("tr",{children:e.jsx("td",{className:o.empty,colSpan:8,children:i?"当前已加载范围没有费用记录；未采集费用不代表零。":n.error?"费用明细读取失败，尚无成功数据。":"正在读取费用明细…"})})]})]})}),e.jsxs("div",{className:o.pagination,children:[e.jsx("span",{children:i?`已加载筛选共 ${i.data.details.count} 条；已知成本 ${i.data.details.count>0&&i.data.details.unknown>=i.data.details.count?"未知":te(i.data.details.total_cost,i.data.currency,4)}；未知 ${i.data.details.unknown} 条；当前 ${i.data.jobs.length} 条`:"明细未获取，不以空记录或零元代替"}),e.jsxs("div",{className:o.row,children:[e.jsx("button",{className:o.btn,type:"button",disabled:n.busy||n.stale||!i||i.query.page===0,onClick:()=>n.paginate(-1),children:"上一页"}),e.jsxs("span",{children:["第 ",(i?.query.page??0)+1," 页"]}),e.jsx("button",{className:o.btn,type:"button",disabled:n.busy||n.stale||!i?.data.next_cursor,onClick:()=>n.paginate(1),children:"下一页"})]})]}),e.jsx("p",{className:o["card-foot"],children:"翻页保持原查询和固定截止时间；第 2 页起定时刷新沿用该范围，返回首页或重设筛选可更新截止时间。导出不混入读取快照后补录的历史记录。"})]}),t&&e.jsx(Ac,{item:t.item,currency:t.currency,onClose:()=>s(null)})]})}function Lc({state:n}){const[t,s]=p.useState(""),[a,i]=p.useState(0),[r,l]=p.useState(null),[c,u]=p.useState(!1),[d,m]=p.useState(null),[v,h]=p.useState({}),[g,y]=p.useState(null),x=p.useRef(!1),S=p.useId(),w=(n.catalog?.accounts??[]).filter(E=>`${E.username} ${E.display_name}`.toLocaleLowerCase().includes(t.trim().toLocaleLowerCase())).sort((E,N)=>(E.display_name||E.username).localeCompare(N.display_name||N.username,"zh-CN")),f=Math.max(1,Math.ceil(w.length/12)),k=Math.min(a,f-1),z=!n.catalog||n.busy||d!==null,R=async(E,N)=>{if(!(x.current||z||N===(E.department_id??""))){x.current=!0,m(E.id),y(null),h(A=>({...A,[E.id]:""}));try{await n.assign(E.id,N||null),y(E.id)}catch(A){h(_=>({..._,[E.id]:`保存失败：${de(A)}；保留上次确认的归属，请重试。`}))}finally{x.current=!1,m(null)}}};return e.jsxs("section",{"aria-label":"部门与账号",children:[e.jsx("div",{className:o["section-head"],children:e.jsxs("div",{children:[e.jsx("h2",{children:"账号归属设置"}),e.jsx("p",{children:"这里只管理账号归属；部门费用请到“本地算力”或“云端 API”查看。"})]})}),e.jsxs("div",{className:o["mapping-banner"],children:[e.jsx("strong",{children:"归属设置 · 保存到服务器"}),e.jsx("p",{children:"选择部门后真实保存，刷新后仍有效。新费用保存部门快照；旧费用缺少快照时可能按当前账号映射归属，不代表真实历史部门。逐笔归属依据可在明细中查看。"})]}),e.jsxs("article",{className:o.card,children:[e.jsxs("div",{className:o["section-strip"],children:[e.jsxs("div",{children:[e.jsx("h2",{children:"账号列表"}),e.jsx("p",{className:`${o.muted} ${o.small}`,children:"展示全部账号，不受费用筛选影响。"})]}),e.jsxs("div",{className:o.actions,children:[e.jsxs("label",{className:o.search,children:[e.jsxs("svg",{className:o.icon,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.5","aria-hidden":"true",children:[e.jsx("circle",{cx:"10.5",cy:"10.5",r:"6.5"}),e.jsx("path",{d:"m16 16 4 4"})]}),e.jsx("input",{"aria-label":"搜索账号姓名",placeholder:"搜索姓名 / 账号",value:t,onChange:E=>{s(E.currentTarget.value),i(0)}})]}),e.jsx("button",{className:o.btn,type:"button",disabled:z,onClick:()=>l("new"),children:"新增部门"}),e.jsx("button",{className:o.link,type:"button",disabled:z,onClick:()=>u(!0),children:"管理部门"})]})]}),e.jsx("div",{className:o["table-scroll"],children:e.jsxs("table",{className:o.table,children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"账号 / 姓名"}),e.jsx("th",{children:"当前状态"}),e.jsx("th",{children:"部门归属"})]})}),e.jsxs("tbody",{children:[w.slice(k*12,k*12+12).map(E=>{const N=`${S}-${E.id}`,A=d===E.id?"正在保存…":v[E.id]||(g===E.id?"已保存到服务器":"");return e.jsxs("tr",{children:[e.jsxs("td",{className:o.label,children:[e.jsx("strong",{children:E.display_name||E.username}),e.jsxs("span",{className:o.sub,children:[E.username," · ID ",E.id]})]}),e.jsx("td",{children:E.enabled?"已启用":"已停用"}),e.jsxs("td",{children:[e.jsxs("select",{"aria-label":`${E.display_name||E.username} 的部门`,"aria-describedby":A?N:void 0,"aria-invalid":!!v[E.id]||void 0,"aria-busy":d===E.id||void 0,value:E.department_id??"",disabled:z,onChange:_=>{R(E,_.currentTarget.value)},children:[e.jsx("option",{value:"",children:"未分配部门"}),E.department_id&&!n.catalog?.departments.some(_=>_.id===E.department_id)&&e.jsxs("option",{value:E.department_id,children:["部门未知（",E.department_id,"）"]}),n.catalog?.departments.map(_=>e.jsx("option",{value:_.id,children:_.name},_.id))]}),A&&e.jsx("span",{id:N,className:o.sub,role:v[E.id]?"alert":"status",children:A})]})]},E.id)}),!w.length&&e.jsx("tr",{children:e.jsx("td",{className:o.empty,colSpan:3,children:n.catalog?"没有匹配账号，试试姓名或账号。":"账号尚未读取成功"})})]})]})}),e.jsxs("div",{className:o.pagination,children:[e.jsxs("span",{children:[w.length," 个账号 · 每页 12 条 · 归属保存到服务器"]}),e.jsxs("div",{className:o.row,children:[e.jsx("button",{className:o.btn,type:"button",disabled:k===0,onClick:()=>i(k-1),children:"上一页"}),e.jsxs("span",{children:[k+1," / ",f]}),e.jsx("button",{className:o.btn,type:"button",disabled:k+1>=f,onClick:()=>i(k+1),children:"下一页"})]})]})]}),c&&e.jsxs(xe,{title:"管理部门",onClose:()=>u(!1),className:o.costDialog,children:[e.jsx("p",{className:o.muted,children:"部门名称保存到服务器；此处不提供删除或批量重置归属。"}),e.jsx("div",{className:o["table-scroll"],children:e.jsxs("table",{className:o.table,children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"部门名称"}),e.jsx("th",{children:"管理"})]})}),e.jsxs("tbody",{children:[n.catalog?.departments.map(E=>e.jsxs("tr",{children:[e.jsx("td",{children:E.name}),e.jsx("td",{children:e.jsx("button",{className:o.link,type:"button",disabled:z,"aria-label":`重命名${E.name}`,onClick:()=>{u(!1),l(E)},children:"重命名"})})]},E.id)),!n.catalog?.departments.length&&e.jsx("tr",{children:e.jsx("td",{colSpan:2,children:"暂无部门，请使用“新增部门”。"})})]})]})})]}),r&&e.jsxs(xe,{title:r==="new"?"新增部门":"重命名部门",onClose:()=>l(null),submitLabel:"保存部门",className:o.costDialog,onSubmit:async E=>{const N=new FormData(E).get("name");if(typeof N!="string")throw new Error("请输入部门名称");await n.saveDepartment(r==="new"?null:r.id,N)},children:[e.jsx("div",{children:e.jsxs("label",{className:o.field,children:["部门名称",e.jsx("input",{name:"name",required:!0,maxLength:30,defaultValue:r==="new"?"":r.name})]})}),e.jsx("p",{className:o.muted,children:"提交后以服务器重新读取结果为准，失败保留输入，不重置账号归属。"})]})]})}const Ue=`${o.small} ${o.muted}`,Fc=`${o.btn} ${o.primary}`;function Oc({data:n,onClose:t}){return e.jsxs(xe,{title:"数据与成本口径",onClose:t,className:o.costDialog,showFooter:!1,children:[e.jsxs("div",{className:o["modal-body"],children:[e.jsx("h3",{children:"采集与覆盖"}),e.jsxs("p",{children:["通过真实 /api/costs 接口读取，统计截止 ",fn(n?.period.to),"（北京时间），服务端生成时间 ",fn(n?.as_of),"。总览取服务器完整统计，不从当前分页明细重算；定价版本：",n?.pricing_version||"未知","；入账币种：",n?.currency||"未知","。",!n&&"费用尚未读取成功，统计保持未知。"]}),e.jsx("h3",{children:"实际、估算与未知"}),e.jsx("p",{children:"已知总成本 = 实际记录 + 历史估算。unknown 来源即使接口金额为 0，仍显示未知；未知成本包含未完成记录，不能按零元处理。 GPU 小时是用量；电费、失败与取消损耗已含于总成本，不重复相加。"}),n?.jobs.some(Es)&&e.jsx("div",{className:o.notice,children:"当前明细含本地验收导入标记：本地验收电费为按配置复算，非原逐笔实账。此说明不用于未带标记的生产费用。"}),e.jsx("h3",{children:"账号关联与部门归属"}),e.jsx("p",{children:"归属修改写入服务器。新费用按记录快照，旧费用缺少快照时按当前映射；以逐笔 attribution_basis 为准。部门未知与未分配单列，不按项目名猜部门，不把当前映射说成历史所属部门。"}),e.jsx("h3",{children:"范围与指标"}),e.jsx("p",{children:"全局周期、部门、账号、项目按 AND 组合；趋势来源与类型只影响趋势；明细来源、状态、搜索、完整模型名、日期、分组下钻只影响明细。 时间为北京时间，按任务创建时间筛选，to 固定在该次刷新时刻，分页保持相同截止。"}),e.jsx("p",{children:"来源按生成任务账本与 API 事件分开。API 包含 event_kind=api 与 image_api，模型使用服务器 models 分组；生成任务不保证全部是纯本地执行。不能从金额反推 Token 或单价，未记录费用不代表免费。"}),e.jsx("h3",{children:"不伪造财务事实"}),e.jsx("p",{children:"API 费用只反映已采集事件，不代表供应商完整账单或已对账。原币、用量、币种与未采集字段保持未知。 真实预算与收入没有提供，保持未设置或未知。建议收费不是实收，不计算虚构利润率或 ROI；商用模型等效费用仅将本地已定价任务的建议收费区间 × 5，不计入真实成本，也不是供应商报价。"}),e.jsx("div",{className:o.notice,children:"页面读取真实接口，刷新后数据可能变化。预算与计价弹窗仅作本页本地试算，不写费用账本，不改变部门金额或 CSV。"})]}),e.jsx("footer",{className:o["dialog-footer"],children:e.jsx("button",{type:"button",className:o.btn,onClick:t,children:"知道了"})})]})}function Se(n,t,s=!1,a=0){if(n.trim()==="")return!1;const i=Number(n);return Number.isFinite(i)&&i>=a&&i<=t&&(!s||Number.isInteger(i))}function Ts(n){return Se(n.amount,1e8,!0,1)&&Se(n.threshold,100,!0,1)}function qs(n){if(!n)return null;const t=new Date((n.period.to+8*3600)*1e3);if(!Number.isFinite(t.getTime()))return null;const s=t.getUTCFullYear(),a=t.getUTCMonth(),i=Date.UTC(s,a,1)/1e3-8*3600;return n.period.from!==i?null:{label:`${s}-${String(a+1).padStart(2,"0")}`,day:t.getUTCDate(),days:new Date(Date.UTC(s,a+1,0)).getUTCDate()}}function Uc({value:n,onChange:t,data:s,onClose:a}){const[i,r]=p.useState(()=>({...n})),l=p.useId(),c=qs(s);return e.jsxs(xe,{title:"本地预算试算",onClose:a,onSubmit:async()=>{if(!Ts(i))throw new Error("月预算须为正整数，预警阈值须为 1–100 的整数");t({...i})},className:o.costDialog,showFooter:!1,children:[e.jsxs("div",{className:o["modal-body"],children:[e.jsxs("p",{style:{marginBottom:18},children:["固定用于 ",c?.label||"本月（数据读取缺失）"," ","全平台预算，不受当前部门或项目筛选影响。仅本页有效，不修改线上，不写费用账本。"]}),e.jsxs("label",{className:o.field,children:[e.jsx("span",{id:`${l}-label`,children:"月预算 / CNY"}),e.jsx("input",{name:"budget","aria-labelledby":`${l}-label`,"aria-describedby":`${l}-hint`,type:"number",min:"1",max:"100000000",step:"1",value:i.amount,required:!0,placeholder:"请输入预算金额",onChange:u=>r({...i,amount:u.currentTarget.value})}),e.jsx("small",{id:`${l}-hint`,children:"没有预填假预算，正整数。"})]}),e.jsxs("label",{className:o.field,children:["预警阈值 / %",e.jsx("input",{name:"threshold",type:"number",min:"1",max:"100",step:"1",value:i.threshold,required:!0,onChange:u=>r({...i,threshold:u.currentTarget.value})})]})]}),e.jsxs("footer",{className:o["dialog-footer"],children:[e.jsx("button",{type:"button",className:o.btn,onClick:a,children:"取消"}),e.jsx("button",{type:"submit",className:Fc,children:"应用本地试算"})]})]})}function Wc({data:n,settings:t,onEdit:s}){const a=qs(n),i=Ts(t),r=n?.overview.total_cost,l=!!n&&!!a&&r!==void 0&&Number.isFinite(r)&&!(n.overview.tasks>0&&n.overview.unknown_cost_tasks>=n.overview.tasks),c=l&&a&&r!==void 0?r/a.day*a.days:null,u=l&&n?.currency==="CNY"&&i,d=Number(t.amount),m=u&&r!==void 0?r/d*100:null;return e.jsxs("article",{className:o.card,children:[e.jsxs("div",{className:o["card-head"],children:[e.jsxs("div",{children:[e.jsx("h2",{children:"预算与预测"}),e.jsx("p",{children:"不把演示预算混入真实数据"})]}),e.jsx("button",{type:"button",className:o.link,onClick:s,children:"设置试算预算 →"})]}),e.jsxs("div",{className:o["card-body"],children:[e.jsxs("span",{className:Ue,children:[a?.label||"本月数据读取缺失"," · 全平台预算试算（不随筛选）"]}),e.jsx("div",{className:o.amount,children:i?te(d,"CNY"):"尚未设置"}),i?e.jsxs(e.Fragment,{children:[m!==null&&e.jsx("div",{className:o.progress,children:e.jsx("span",{style:{width:`${Math.max(0,Math.min(100,m))}%`}})}),e.jsxs("div",{className:o["info-row"],children:[e.jsx("span",{children:"预算已用"}),e.jsx("span",{children:m===null?"未知":`${m.toFixed(1)}%`})]}),e.jsxs("div",{className:o["info-row"],children:[e.jsxs("span",{children:["预测",u&&c!==null&&c>d?"超出":"剩余"]}),e.jsx("span",{className:u&&c!==null?c>d?o.amber:o.green:void 0,children:u&&c!==null?te(Math.abs(c-d),"CNY"):"未知"})]}),e.jsxs("div",{className:o["info-row"],children:[e.jsxs("span",{children:["预警阈值 ",t.threshold,"%"]}),e.jsx("span",{children:m===null?"未知":m>=Number(t.threshold)?"已触发":"未触发"})]})]}):e.jsx("p",{className:Ue,children:"现有接口没有预算数据，已移除此前的演示预算。"}),e.jsxs("div",{className:o["info-row"],style:{marginTop:22},children:[e.jsx("span",{children:"本月已知成本"}),e.jsx("span",{className:o.mono,children:l&&n?ye(n.overview,n.currency):"未知"})]}),e.jsxs("div",{className:o["info-row"],children:[e.jsx("span",{children:"按本月日均线性外推"}),e.jsx("span",{className:o.mono,children:c!==null&&n?te(c,n.currency):"未知"})]}),e.jsxs("div",{className:o.notice,children:[a&&n?`预测 = 本月已知成本 ÷ 已过 ${a.day} 天 × ${a.days} 天。采集当天尚未结束，不含 ${n.overview.unknown_cost_tasks} 条未知成本，仅供参考。`:"本月全平台数据读取缺失或范围非完整本月，成本、预测及未知条数保持未知，不使用当前筛选范围补算。",a&&n&&!l&&"本月记录成本均未知，不能按零元预测。",l&&n?.currency!=="CNY"&&"入账币种不是 CNY，不与人民币预算比较或默认换汇。","预算由你本地输入，仅本页有效，非真实财务配置，不写费用账本。"]})]})]})}const Gt=[{page:"gpt",name:"GPT 图片",description:"读取本次接口返回的总扣费与币种。金额已经包含的用量不再按图片张数、尺寸或 Token 重复计算；只有单价不等于本次总扣费。",button:"查看计费口径"},{page:"banana",name:"Banana",description:"上游样例包含 usage.cost；以实际返回金额为准，但币种和字段含义需明确，不能默认美元、人民币或每张价格。",button:"查看计费口径"},{page:"agent",name:"画布 Agent",description:"优先使用接口本次扣费；没有金额时，按实际模型与每轮 Token、适用费率估算。工具出图另归对应图片调用，多轮不重复加会话累计值。",button:"查看口径与试算"},{page:"other",name:"其他 API",description:"手工价格试算仅作参考，不代替接口扣费。",button:"手工费率试算"}];function Bc({onClose:n}){const[t,s]=p.useState("menu"),a=p.useRef(null);p.useLayoutEffect(()=>{a.current?.focus({preventScroll:!0})},[t]);const i=Gt.find(l=>l.page===t),r=t==="menu"?"计价规则与试算":t==="other"?"其他 API · 手工费率试算":`${i?.name} · 接口计费口径`;return e.jsxs(xe,{title:r,onClose:n,className:o.costDialog,showFooter:!1,children:[e.jsx("div",{ref:a,tabIndex:-1,className:o["modal-body"],children:t==="menu"?e.jsxs(e.Fragment,{children:[e.jsx("p",{className:Ue,children:"以接口本次扣费为准；价格表、用量估算与已发生扣费分开，不再按官网固定价格重算接口账单。"}),Gt.map(l=>e.jsxs("div",{className:o["pricing-option"],children:[e.jsx("h3",{children:l.name}),e.jsx("p",{className:Ue,children:l.description}),e.jsx("button",{type:"button",className:o.btn,onClick:()=>s(l.page),children:l.button})]},l.page)),e.jsx("div",{className:o.notice,children:"已采集的调用按真实接口中的记录展示；缺失的金额、币种或用量保持未知，明确返回的 0 扣费与缺失分开。 以下仅支持手工摘录核验，不代表已经接通实时供应商费用接口，不发送真实请求。不更改真实账本、部门金额或 CSV。"})]}):t==="other"?e.jsx(Hc,{}):e.jsx(Vc,{agent:t==="agent"},t)}),e.jsxs("footer",{className:o["dialog-footer"],children:[t!=="menu"&&e.jsx("button",{type:"button",className:o.btn,onClick:()=>s("menu"),children:"返回计价规则"}),e.jsx("button",{type:"button",className:o.btn,onClick:n,children:t==="menu"?"知道了":t==="other"?"关闭试算":"关闭"})]})]})}const un=n=>n.toLocaleString("zh-CN",{maximumSignificantDigits:15});function Vc({agent:n}){const[t,s]=p.useState("response"),[a,i]=p.useState({amount:"",reference:"",model:"",input:"",cache:"0",output:"",inputRate:"",cacheRate:"",outputRate:"",currency:"",fx:""}),r=(h,g)=>i(y=>({...y,[h]:g})),l=n&&t==="tokens",c=(h,g,y,x=!1,S=!0)=>e.jsxs("label",{className:o.field,children:[g,e.jsx("input",{type:"number",min:"0",max:y,step:x?"1":"any",required:S,value:a[h],onChange:w=>r(h,w.currentTarget.value)})]}),u=a.currency==="CNY"||a.currency==="USD",d=a.currency!=="USD"||a.fx===""||Se(a.fx,1e6,!1,1e-6);let m="",v=Number(a.amount);return l?!a.model.trim()||a.model.length>120||!["input","cache","output"].every(h=>{const g=h==="input"?a.input:h==="cache"?a.cache:a.output;return Se(g,1e12,!0)})||!Se(a.inputRate,1e6)||!Se(a.outputRate,1e6)||a.cacheRate!==""&&!Se(a.cacheRate,1e6)||!u||!d?m="模型、用量、币种或费率不完整，保持待确认。Token 须为非负整数，汇率须大于 0。":Number(a.cache)>Number(a.input)?m="缓存命中 Token 不能大于输入总 Token。":Number(a.cache)>0&&a.cacheRate===""?m="有缓存命中用量，必须提供缓存单价，不能默认为免费。":v=((Number(a.input)-Number(a.cache))*Number(a.inputRate)+Number(a.cache)*Number(a.cacheRate||"0")+Number(a.output)*Number(a.outputRate))/1e6:(!Se(a.amount,1e9)||!u||!d)&&(m="请提供有效的非负总扣费与已确认币种；缺失保持待确认，汇率须大于 0。"),e.jsxs(e.Fragment,{children:[e.jsx("p",{children:"本次总扣费直接采用接口返回金额，不再乘张数或按官网价重算。只有单价、积分或不明单位时不能当作本次费用。"}),e.jsx("p",{className:o.notice,children:"当前是手工摘录核验，不是实时接口返回，不发送真实请求。缺失的金额、币种或用量保持未知；金额缺失不作 0 元，核验结果不写入真实账本。"}),n&&e.jsxs("label",{className:o.field,children:["计费依据",e.jsxs("select",{value:t,onChange:h=>s(h.currentTarget.value),children:[e.jsx("option",{value:"response",children:"接口返回本次总扣费"}),e.jsx("option",{value:"tokens",children:"无扣费金额 · 按 Token 估算"})]})]}),l?e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:o.field,children:["实际模型与费率版本",e.jsx("input",{maxLength:120,required:!0,placeholder:"不使用默认模型或默认费率",value:a.model,onChange:h=>r("model",h.currentTarget.value)})]}),e.jsxs("div",{className:o["field-row"],children:[c("input","输入总 Token（含缓存命中）",1e12,!0),c("cache","其中缓存命中 Token",1e12,!0)]}),c("output","输出 Token（含已计费思考）",1e12,!0),e.jsx("p",{className:Ue,children:"单位：以下单价均为所选币种 / 百万 Token。缓存是输入子集，先扣除再按缓存价计算；已包含在输出里的思考 Token 不再重复加。"}),e.jsxs("div",{className:o["field-row"],children:[c("inputRate","未缓存输入单价",1e6),c("cacheRate","缓存命中单价",1e6,!1,!1)]}),c("outputRate","输出单价",1e6),e.jsx("p",{className:Ue,children:"仅算单一模型、同一费率档位的 Token 小计。多轮逐请求去重累计，不叠加会话累计值；缓存写入、阶梯费率、独立工具费需按供应商规则另记。"})]}):e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:o.field,children:["接口返回的本次总扣费",e.jsx("input",{type:"number",min:"0",max:"1000000000",step:"any",required:!0,value:a.amount,placeholder:"缺失保持未知；明确返回 0 时可填 0",onChange:h=>r("amount",h.currentTarget.value)})]}),e.jsxs("label",{className:o.field,children:["扣费字段来源 / 请求标识（选填）",e.jsx("input",{maxLength:160,value:a.reference,placeholder:"仅填字段路径或 request_id，不粘贴完整响应或凭据",onChange:h=>r("reference",h.currentTarget.value)})]})]}),e.jsxs("label",{className:o.field,children:["金额 / 单价币种",e.jsxs("select",{required:!0,value:a.currency,onChange:h=>r("currency",h.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择已确认的币种"}),e.jsx("option",{value:"CNY",children:"CNY · 人民币"}),e.jsx("option",{value:"USD",children:"USD · 美元"})]})]}),a.currency==="USD"&&e.jsxs("label",{className:o.field,children:["换算汇率 / 1 USD = CNY（选填）",e.jsx("input",{type:"number",min:"0.000001",max:"1000000",step:"any",value:a.fx,placeholder:"没有汇率时保留原币，不折成人民币",onChange:h=>r("fx",h.currentTarget.value)})]}),e.jsx("div",{className:o.result,role:"status","aria-live":"polite","aria-atomic":"true",children:m||e.jsxs(e.Fragment,{children:[e.jsxs("span",{className:o.small,children:[l?"Token 估算":"接口金额 · 手工摘录核验"," · 非已入账金额"]}),e.jsxs("div",{className:o.amount,children:[l?"≈ ":"",a.currency==="CNY"?"¥":"$",l?un(v):a.amount,a.currency==="USD"?" USD":""]}),a.currency==="USD"&&(a.fx?e.jsxs("div",{className:o["detail-line"],children:[e.jsx("span",{children:"按手填汇率换算（约）"}),e.jsxs("span",{children:["≈ ¥",un(v*Number(a.fx))]})]}):e.jsx("p",{className:Ue,children:"未提供汇率，只保留美元，不与人民币账本相加。"})),e.jsx("p",{className:Ue,children:l?"（输入总量 − 缓存命中）× 输入价 + 缓存命中 × 缓存价 + 输出量 × 输出价，再除以 1,000,000。此为手工费率 Token 估算，不是接口实际扣费。":"直接采用手工摘录的接口本次总扣费，不乘张数、不重算 Token。"})]})}),e.jsx("div",{className:o.notice,children:"接口金额优先；Token 估算只能标为估算，不能覆盖已返回扣费。这里只核验单笔，不汇总或持久化，不计入总览、部门分摊或 CSV，也不代表供应商已对账。"})]})}function Hc(){const[n,t]=p.useState("image"),[s,a]=p.useState({quantity:"",price:"",output:"",outputPrice:"",markup:"0"}),i=(u,d,m=!1,v=1e9)=>e.jsxs("label",{className:o.field,children:[d,e.jsx("input",{type:"number",min:"0",max:v,step:m?"1":"any",required:!0,value:s[u],onChange:h=>a({...s,[u]:h.currentTarget.value})})]}),r=Se(s.quantity,1e9,n==="image")&&Se(s.price,1e9)&&Se(s.markup,1e3)&&(n!=="token"||Se(s.output,1e9)&&Se(s.outputPrice,1e9)),l=Number(s.quantity)*Number(s.price)+(n==="token"?Number(s.output)*Number(s.outputPrice):0),c=l*(1+Number(s.markup)/100);return e.jsxs(e.Fragment,{children:[e.jsx("p",{style:{marginBottom:18},children:"当前接口未提供其他 API 的采购单价。以下仅作手工参考试算，不代替接口本次扣费，不修改真实账本。"}),e.jsxs("label",{className:o.field,children:["计费方式",e.jsxs("select",{value:n,onChange:u=>t(u.currentTarget.value),children:[e.jsx("option",{value:"image",children:"按张"}),e.jsx("option",{value:"second",children:"按输出秒"}),e.jsx("option",{value:"token",children:"输入 / 输出百万 Token"})]})]}),e.jsxs("div",{className:o["field-row"],children:[i("quantity",n==="image"?"用量 / 张":n==="second"?"用量 / 秒":"输入 / 百万 Token",n==="image"),i("price","采购单价 / CNY")]}),n==="token"&&e.jsxs("div",{className:o["field-row"],children:[i("output","输出 / 百万 Token"),i("outputPrice","输出单价 / 每百万 Token")]}),i("markup","成本加成 / %",!1,1e3),e.jsx("div",{className:o.result,role:"status","aria-live":"polite",children:r?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:o.small,children:"建议收费 · 手工试算 / 非收入"}),e.jsxs("div",{className:o.amount,children:["¥",un(c)]}),e.jsxs("div",{className:o["detail-line"],children:[e.jsx("span",{children:"采购成本"}),e.jsxs("span",{children:["¥",un(l)]})]}),e.jsxs("div",{className:o["detail-line"],children:[e.jsx("span",{children:"加成金额"}),e.jsxs("span",{children:["¥",un(c-l)]})]})]}):n==="image"?"请完整填写有效数值；图片张数必须为非负整数。":"请完整填写有效的非负用量、单价与加成。"}),e.jsx("div",{className:o.notice,children:"报价默认未税，不是收入。输入的价格和数量不保存、不加到真实费用。"})]})}const Jt={overview:"经营总览",local:"本地算力",cloud:"云端 API",projects:"项目成本",ledger:"费用明细",departments:"部门与账号"},Zt=[{key:"category",label:"类型"},{key:"capability",label:"能力"},{key:"worker",label:"执行端"}],ze=n=>n.toLocaleString("zh-CN");function Gc({groups:n,currency:t,open:s}){const[a,i]=p.useState(""),[r,l]=p.useState(0),c=n.filter(d=>d.label.toLocaleLowerCase().includes(a.toLocaleLowerCase())),u=Math.min(r,Math.max(0,Math.ceil(c.length/9)-1));return e.jsxs("section",{"aria-label":"项目成本",children:[e.jsxs("div",{className:o["section-head"],children:[e.jsxs("div",{children:[e.jsx("h2",{children:"把投入落到具体项目"}),e.jsx("p",{children:"按记录中的项目标识聚合；历史缺少标识的记录按项目名分组并明确标记。"})]}),e.jsxs("label",{className:o.search,children:[e.jsx($e,{name:"search"}),e.jsx("input",{"aria-label":"搜索项目",placeholder:"搜索项目名称",value:a,onChange:d=>{i(d.currentTarget.value),l(0)}})]})]}),e.jsx("div",{className:`${o.grid} ${o["project-grid"]}`,children:c.slice(u*9,u*9+9).map(d=>e.jsxs("article",{className:`${o.card} ${o["project-card"]}`,children:[e.jsx("h2",{children:d.label}),e.jsxs("span",{className:o.sub,children:["项目费用分组 · ",ze(d.tasks)," 条记录"]}),e.jsx("div",{className:o.amount,children:ye(d,t)}),e.jsxs("div",{className:o["info-row"],children:[e.jsx("span",{children:"实际 / 历史估算"}),e.jsx("span",{children:d.tasks>0&&d.unknown_cost_tasks===d.tasks?"待确认":`${te(d.actual_cost,t)} / ${te(d.estimated_cost,t)}`})]}),e.jsxs("div",{className:o["info-row"],children:[e.jsx("span",{children:"失败与取消损耗"}),e.jsx("span",{className:o.amber,children:te(d.failed_waste,t)})]}),e.jsxs("div",{className:o["info-row"],children:[e.jsx("span",{children:"成功 / 全部记录"}),e.jsxs("span",{children:[d.done," / ",d.tasks]})]}),e.jsxs("div",{className:o["info-row"],children:[e.jsx("span",{children:"提交账号可识别"}),e.jsxs("span",{children:[d.identified_account_tasks," / ",d.tasks]})]}),e.jsx("button",{type:"button",className:o.link,onClick:()=>s(d),children:"查看项目成本 →"})]},d.key))}),c.length===0&&e.jsx("div",{className:o.empty,children:"没有匹配的项目"}),e.jsx(jt,{page:u,count:c.length,pageSize:9,noun:"个项目分组",previous:()=>l(u-1),next:()=>l(u+1)})]})}function Jc({groups:n,currency:t,catalog:s,source:a,configure:i,drill:r}){const l=a==="api"?4:2;return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:o["section-head"],children:[e.jsxs("div",{children:[e.jsx("h2",{children:"部门费用"}),e.jsx("p",{children:"按费用归属汇总；未分配与未知账号费用单列，不遗漏。"})]}),e.jsx("button",{type:"button",className:o.link,onClick:i,children:"设置账号归属 →"})]}),e.jsxs("div",{className:`${o.grid} ${o["department-grid"]}`,children:[s?.departments.map(c=>{const u=n.find(m=>m.key===c.id),d=s.accounts.filter(m=>m.department_id===c.id).length;return e.jsxs("article",{className:`${o.card} ${o["department-card"]}`,children:[e.jsxs("div",{className:o.row,style:{justifyContent:"space-between"},children:[e.jsx("h2",{children:c.name}),e.jsx("span",{className:`${o.tag} ${o.blue}`,children:"费用归属"})]}),e.jsx("div",{className:o.amount,children:u?ye(u,t,l):te(0,t,l)}),e.jsxs("p",{className:`${o.muted} ${o.small}`,children:[d," 个已分配账号 · 当前筛选 ",ze(u?.tasks??0)," 条记录 · 未知成本"," ",u?.unknown_cost_tasks??0," 条"]}),e.jsx("p",{className:`${o.muted} ${o.small}`,children:d?"仅统计当前来源与筛选范围内的费用。":"尚未设置账号归属，不代表部门没有实际支出。"}),e.jsx("button",{type:"button",className:o.link,onClick:()=>r(c.id),children:"查看部门费用 →"})]},c.id)}),!s&&e.jsx("p",{className:o.empty,children:"部门目录尚未读取，不能推断部门费用。"})]}),e.jsx("div",{className:`${o.grid} ${o.coverage}`,children:[{id:"unassigned",label:"未分配部门",tag:"待归属",description:"已知提交账号，可在账号设置中分配部门。"},{id:"unknown",label:"提交账号未知",tag:"数据缺口",description:"无法关联提交账号，保留独立，不猜测归属。"}].map(c=>{const u=n.find(d=>d.key===c.id);return e.jsxs("article",{className:o.card,children:[e.jsxs("div",{className:o["info-row"],children:[e.jsx("h3",{children:c.label}),e.jsx("span",{className:`${o.tag} ${o.amber}`,children:c.tag})]}),e.jsx("div",{className:o.amount,children:u?ye(u,t,l):te(0,t,l)}),e.jsxs("p",{className:`${o.muted} ${o.small}`,children:[ze(u?.tasks??0)," 条记录 · 未知成本 ",u?.unknown_cost_tasks??0," 条"]}),e.jsx("p",{className:`${o.muted} ${o.small}`,children:c.description}),e.jsx("button",{className:o.link,type:"button",onClick:()=>r(c.id),children:"查看费用 →"})]},c.id)})}),e.jsx("div",{className:o.note,children:"新费用以发生时归属快照为准；历史记录缺少快照时使用当前账号归属，不代表真实历史部门。未知成本不按零元计入，实际记录与历史估算分别展示。"})]})}function Zc(n){const t=ko(n),[s,a]=p.useState("overview"),[i,r]=p.useState("category"),[l,c]=p.useState(null),[u,d]=p.useState({amount:"",threshold:"80"}),[m,v]=p.useState(null),[h,g]=p.useState(null),y=t.query.filters,x=t.snapshot?.data,S=t.catalog,w=t.snapshot?.query.filters??y,f=_=>{t.change({...w,...zs,..._}),a("ledger")},k=_=>{x&&g({group:_,departments:x.project_departments[_.key]??[],currency:x.currency})},z=x?[...x.departments.generation,...x.departments.api].filter(_=>_.key==="unknown"):[],R=x?[...x.departments.generation,...x.departments.api].filter(_=>_.key==="unassigned").reduce((_,b)=>_+b.tasks,0):0,E=z.reduce((_,b)=>_+b.tasks,0),N=z.reduce((_,b)=>_+b.total_cost,0),A=(_,b)=>{if(b==="all")return{department:"全部部门",account:"全部账号",project:"全部项目"}[_];if(b==="unknown")return"提交账号未知";if(b==="unassigned")return"未分配部门";if(_==="department")return S?.departments.find($=>$.id===b)?.name??b;if(_==="project")return S?.projects.find($=>$.id===b)?.name??b;const C=S?.accounts.find($=>$.id===b);return C?.display_name||C?.username||b};return e.jsxs("main",{id:"main",tabIndex:-1,className:o.page,"aria-busy":t.busy||void 0,children:[e.jsxs("header",{className:o.topbar,children:[e.jsxs("div",{className:o.crumb,children:[e.jsx("span",{className:o.brand,children:"CHOUKA"}),e.jsx("span",{className:o.muted,children:"/"}),e.jsx("span",{className:`${o.muted} ${o.extra}`,children:"管理工作区"}),e.jsx("span",{className:`${o.muted} ${o.extra}`,children:"/"}),e.jsx("span",{children:"费用评估"})]}),e.jsxs("div",{className:o.actions,children:[e.jsx("span",{className:`${o.timestamp} ${o.small} ${o.muted}`,children:x?`读取于 ${new Date(x.as_of*1e3).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai",hour12:!1})}`:"正在读取费用"}),e.jsx("span",{className:`${o.tag} ${o.green}`,children:n.sandbox?"真实数据 · 隔离副本":"真实费用数据"})]})]}),e.jsxs("div",{className:o.content,children:[e.jsxs("div",{className:o["page-heading"],children:[e.jsxs("div",{children:[e.jsx("div",{className:o.eyebrow,children:"COST INTELLIGENCE"}),e.jsx("h1",{children:"每一笔投入，都有去向。"}),e.jsx("p",{className:o.subtitle,children:"真实费用，看清项目投入；部门成本，从账号归属开始。"})]}),e.jsxs("div",{className:o.actions,children:[e.jsxs("button",{type:"button",className:o.btn,onClick:()=>c("basis"),children:[e.jsx($e,{name:"info"}),"数据与口径"]}),e.jsx("button",{type:"button",className:o.btn,hidden:s==="departments",onClick:()=>c("budget"),children:"预算试算"}),e.jsxs("button",{type:"button",className:`${o.btn} ${o.primary}`,disabled:t.exporting||!t.snapshot,title:"导出已加载范围的完整选集，不限当前页；不使用未成功的筛选","aria-label":"导出已加载范围",hidden:s==="departments",onClick:()=>{t.exportCSV()},children:[e.jsx($e,{name:"download"}),"导出费用报表"]}),t.exporting&&e.jsx("button",{type:"button",className:o.link,onClick:t.cancelExport,children:"取消导出"})]})]}),e.jsxs("div",{className:o.filters,"aria-label":"全局费用筛选",hidden:s==="departments",children:[e.jsxs(Je,{label:"统计周期",value:y.period,onChange:_=>{const b=bo.safeParse(_);b.success&&t.change({period:b.data})},children:[e.jsx("option",{value:"all",children:"全部历史"}),e.jsx("option",{value:"month",children:"本月"}),e.jsx("option",{value:"30",children:"最近 30 天"}),e.jsx("option",{value:"7",children:"最近 7 天"})]}),e.jsxs(Je,{label:"部门",value:y.department,onChange:_=>t.change({department:_}),children:[e.jsx("option",{value:"all",children:"全部部门"}),e.jsx("option",{value:"unassigned",children:"未分配部门"}),e.jsx("option",{value:"unknown",children:"提交账号未知"}),S?.departments.map(_=>e.jsx("option",{value:_.id,children:_.name},_.id))]}),e.jsxs(Je,{label:"账号",value:y.account,onChange:_=>t.change({account:_}),children:[e.jsx("option",{value:"all",children:"全部账号"}),e.jsx("option",{value:"unknown",children:"提交账号未知"}),S?.accounts.map(_=>e.jsx("option",{value:_.id,children:_.display_name||_.username},_.id))]}),e.jsxs(Je,{label:"项目",value:y.project,onChange:_=>t.change({project:_}),children:[e.jsx("option",{value:"all",children:"全部项目"}),S?.projects.map(_=>e.jsx("option",{value:_.id,children:_.name},_.id))]}),e.jsx("button",{type:"button",className:o.link,onClick:()=>t.change(bt),children:"重置筛选"})]}),(t.error||t.catalogError||t.exportError)&&e.jsxs("div",{className:`${o.notice} ${o.error}`,role:"alert",children:[[t.error,t.catalogError,t.exportError].filter(Boolean).join("；"),e.jsx("p",{children:"保留上次成功范围，导出不使用未加载成功的筛选。"}),e.jsx("button",{className:o.link,type:"button",onClick:t.refresh,children:"重试读取费用"}),t.catalogError&&e.jsx("button",{className:o.link,type:"button",onClick:t.retryCatalog,children:"重试账号与部门"})]}),e.jsx("nav",{className:o.nav,"aria-label":"费用分区",children:Object.keys(Jt).map(_=>e.jsx("button",{type:"button","aria-pressed":s===_,onClick:()=>a(_),children:Jt[_]},_))}),e.jsxs("div",{className:o.scope,"data-testid":"loaded-scope",hidden:s==="departments",title:t.snapshot?_o(t.snapshot.query,S,t.snapshot.data):void 0,children:[x?`${x.trend[0]?.day??"无记录"} — ${new Date(x.period.to*1e3).toLocaleDateString("zh-CN",{timeZone:"Asia/Shanghai"})} / ${A("department",w.department)} / ${A("account",w.account)} / ${A("project",w.project)} · 当前 ${ze(x.overview.tasks)} 条 · 部门归属以记录依据为准`:"尚无成功快照",t.stale&&e.jsx("strong",{children:"；当前选择尚未加载成功，仍展示并导出上次成功范围。"}),e.jsx("span",{role:"status",children:t.busy?" · 正在读取…":t.error?" · 读取失败":""})]}),s==="departments"?e.jsx(Lc,{state:t}):s==="ledger"?e.jsx(Rc,{state:t}):x?e.jsxs(e.Fragment,{children:[s==="overview"&&e.jsxs("section",{"aria-label":"经营总览",children:[e.jsx(Ec,{metric:x.overview,currency:x.currency,generation:x.local,api:x.cloud,modelCount:x.models.length}),e.jsxs("div",{className:o.insight,children:[e.jsx($e,{name:"alert"}),e.jsxs("div",{children:[e.jsx("strong",{children:"真实费用已读取，部门归属仍需确认。"})," 当前范围 ",ze(R)," ","条未分配部门，",ze(E)," 条提交账号未知；未知账号对应已知成本"," ",te(N,x.currency),"，不猜测归属。"]}),e.jsx("button",{type:"button",className:o.link,onClick:()=>a("departments"),children:"配置账号归属 →"})]}),e.jsxs("div",{className:`${o.grid} ${o.split}`,children:[e.jsx(qc,{days:x.trend,currency:x.currency,controls:e.jsxs(e.Fragment,{children:[e.jsxs(Je,{label:"趋势来源",value:y.trend_source,onChange:_=>{const b=Cs.safeParse(_);b.success&&t.change({trend_source:b.data})},children:[e.jsx("option",{value:"all",children:"全部来源"}),e.jsx("option",{value:"generation",children:"本地算力（生成任务）"}),e.jsx("option",{value:"api",children:"云端 API"})]}),e.jsxs(Je,{label:"趋势类型",value:y.trend_category,onChange:_=>t.change({trend_category:_}),children:[e.jsx("option",{value:"all",children:"全部类型"}),S?.categories.map(_=>e.jsx("option",{value:_.id,children:_.name},_.id))]})]}),drill:_=>f({detail_day:_,detail_source:w.trend_source,...w.trend_category!=="all"?{detail_dimension:"category",detail_key:w.trend_category}:{}})}),e.jsx(Wc,{data:t.budgetMonth,settings:u,onEdit:()=>c("budget")})]}),e.jsx(Mc,{groups:x.composition[i],title:"费用构成",label:Zt.find(_=>_.key===i)?.label,total:x.overview.total_cost,currency:x.currency,controls:e.jsx("div",{className:o.segmented,"aria-label":"费用构成视角",children:Zt.map(_=>e.jsxs("button",{type:"button","aria-pressed":i===_.key,onClick:()=>r(_.key),children:["按",_.label]},_.key))}),drill:_=>f({detail_dimension:i,detail_key:_.key})},i),e.jsxs("div",{className:`${o.grid} ${o.lower}`,children:[e.jsxs("article",{className:o.card,children:[e.jsxs("div",{className:o["card-head"],children:[e.jsxs("div",{children:[e.jsx("h2",{children:"项目投入排行"}),e.jsx("p",{children:"按记录中的项目标识聚合"})]}),e.jsx("button",{type:"button",className:o.link,onClick:()=>a("projects"),children:"全部 →"})]}),e.jsxs("div",{className:o["card-body"],children:[x.projects.slice(0,4).map(_=>e.jsxs("button",{className:o.rank,type:"button","aria-label":`查看项目 ${_.label}`,onClick:()=>k(_),children:[e.jsxs("div",{className:o["rank-label"],children:[e.jsx("span",{children:_.label}),e.jsx("span",{className:o.mono,children:ye(_,x.currency)})]}),e.jsx("div",{className:o.progress,children:e.jsx("span",{style:{width:`${x.projects[0]?.total_cost?_.total_cost/x.projects[0].total_cost*100:0}%`}})})]},_.key)),x.projects.length===0&&e.jsx("p",{className:o.empty,children:"当前范围没有费用"})]})]}),e.jsxs("article",{className:o.card,children:[e.jsx("div",{className:o["card-head"],children:e.jsxs("div",{children:[e.jsx("h2",{children:"值得关注"}),e.jsx("p",{children:"费用质量与组织归属"})]})}),e.jsxs("div",{className:o["card-body"],children:[e.jsxs("div",{className:o.priority,children:[e.jsxs("strong",{children:[x.overview.unknown_cost_tasks," 条成本未知"]}),e.jsx("p",{children:"不能把未知当作免费。"}),e.jsx("button",{className:o.link,type:"button",onClick:()=>f({detail_status:"unknown"}),children:"查看未知成本 →"})]}),e.jsxs("div",{className:o.priority,children:[e.jsxs("strong",{children:["成功 ",ze(x.overview.done)," / 共 ",ze(x.overview.tasks)," 条"]}),e.jsx("p",{children:"混合图片、视频与文本，不以跨类型均价判断效率。"})]}),e.jsxs("div",{className:o.priority,children:[e.jsx("strong",{children:"报价参考，不是收入"}),e.jsxs("p",{children:["当前建议收费区间 ",te(x.overview.retail_min,x.currency),"–",te(x.overview.retail_max,x.currency),"，来自平台规则，不等于回款。"]})]})]})]})]})]}),(s==="local"||s==="cloud")&&e.jsxs("section",{"aria-label":s==="local"?"本地算力":"云端API",children:[e.jsxs("div",{className:o["section-head"],children:[e.jsxs("div",{children:[e.jsx("h2",{children:s==="local"?"本地算力，按部门看投入":"云端 API，单独看清楚"}),e.jsx("p",{children:s==="local"?"当前按生成任务账本归集，与 API 事件分开；逐笔执行位置以记录为准。":"查看已入账成本、部门分摊与模型明细；尚未采集的云端支出不计入。"})]}),e.jsxs("div",{className:o.actions,children:[e.jsx("button",{type:"button",className:o.btn,onClick:()=>f({detail_source:s==="local"?"generation":"api"}),children:s==="local"?"查看本地算力明细 →":"查看 API 明细 →"}),s==="cloud"&&e.jsx("button",{type:"button",className:o.btn,onClick:()=>c("pricing"),children:"计价规则与试算"})]})]}),e.jsx(Pc,{metric:s==="local"?x.local:x.cloud,currency:x.currency,source:s==="local"?"generation":"api"}),s==="local"&&e.jsxs("article",{className:`${o.card} ${o["mini-kpi"]} ${o["analysis-card"]}`,children:[e.jsx("h2",{children:"商用模型等效费用（估算）"}),e.jsx("div",{className:`${o.amount} ${o["equivalent-range"]} ${o.mono}`,children:x.local.retail_known_tasks?e.jsxs(e.Fragment,{children:[e.jsx("span",{children:te(x.local.retail_min*5,x.currency,4)}),e.jsxs("span",{children:["– ",te(x.local.retail_max*5,x.currency,4)]})]}):x.local.tasks?"未定价":"暂无记录"}),e.jsx("p",{className:`${o.small} ${o.muted}`,children:"沿用原版：建议收费区间 × 5 · 非实际支出，不计入总成本，也不是供应商报价。"}),e.jsxs("p",{className:`${o.small} ${o.muted}`,children:["当前本地算力筛选 · 已定价 ",ze(x.local.retail_known_tasks)," 项 / 未定价"," ",ze(x.local.retail_unknown_tasks)," 项 / 未完成不计建议收费"," ",ze(x.local.tasks-x.local.done)," 项；不含云端 API。"]})]}),e.jsx(Jc,{groups:s==="local"?x.departments.generation:x.departments.api,catalog:S,currency:x.currency,source:s==="local"?"generation":"api",configure:()=>a("departments"),drill:_=>f({department:_,detail_source:s==="local"?"generation":"api"})}),s==="cloud"&&e.jsx(Ic,{groups:x.models,currency:x.currency,drill:_=>v({group:_,currency:x.currency})})]}),s==="projects"&&e.jsx(Gc,{groups:x.projects,currency:x.currency,open:k})]}):e.jsx("p",{children:t.error?"费用读取失败，请重试。":"正在读取服务端完整费用统计…"}),e.jsxs("footer",{className:o.footer,children:[e.jsxs("span",{children:["费用评估 ·"," ",x?`当前范围 ${ze(x.overview.tasks)} 条 · 计价版本 ${x.pricing_version}`:"等待真实费用数据"]}),e.jsx("span",{children:"每 15 秒刷新，页面不可见时暂停 · 未知费用不按零元计入"})]})]}),l==="basis"&&e.jsx(Oc,{data:x??null,onClose:()=>c(null)}),l==="budget"&&e.jsx(Uc,{data:t.budgetMonth,value:u,onChange:d,onClose:()=>c(null)}),l==="pricing"&&e.jsx(Bc,{onClose:()=>c(null)}),m&&e.jsxs(xe,{title:m.group.label,className:`${o.costDialog} ${o.drawer}`,onClose:()=>v(null),showFooter:!1,children:[e.jsxs("div",{className:o["modal-body"],children:[e.jsx("span",{className:`${o.tag} ${o.blue}`,children:"真实 API 账本"}),e.jsx("div",{className:o.amount,children:ye(m.group,m.currency,6)}),[["成本未知",`${m.group.unknown_cost_tasks} 条`],["实际记录",m.group.unknown_cost_tasks===m.group.tasks?"未记录 / 待确认":te(m.group.actual_cost,m.currency,6)],["历史估算",m.group.unknown_cost_tasks===m.group.tasks?"未记录 / 待确认":te(m.group.estimated_cost,m.currency,6)],["记录数 / 成功",`${m.group.tasks} / ${m.group.done}`],["提交账号可识别",`${m.group.identified_account_tasks} 条`],["Token 用量 / 采购单价","见逐笔已采集字段，不反推用量或单价"],["供应商对账状态","接口未提供"]].map(([_,b])=>e.jsxs("div",{className:o["detail-line"],children:[e.jsx("span",{children:_}),e.jsx("span",{children:b})]},_)),e.jsx("div",{className:o.notice,children:"仅使用真实已记录模型名。已知零元不代表免费；缺失金额、币种或用量保持未知，实际记录不表示供应商已对账。"})]}),e.jsxs("div",{className:o["dialog-footer"],children:[e.jsx("button",{type:"button",className:o.btn,onClick:()=>v(null),children:"关闭"}),e.jsx("button",{type:"button",className:`${o.btn} ${o.primary}`,onClick:()=>{f({detail_source:"api",detail_model:m.group.key}),v(null)},children:"查看 API 记录"})]})]}),h&&e.jsxs(xe,{title:h.group.label,className:`${o.costDialog} ${o.drawer}`,onClose:()=>g(null),showFooter:!1,children:[e.jsxs("div",{className:o["modal-body"],children:[e.jsx("p",{children:"所选范围 · 以记录项目标识分组"}),e.jsx("div",{className:o.amount,children:ye(h.group,h.currency)}),[["实际记录",te(h.group.actual_cost,h.currency)],["历史估算",te(h.group.estimated_cost,h.currency)],["失败取消损耗",te(h.group.failed_waste,h.currency)],["成本未知",`${h.group.unknown_cost_tasks} 条`]].map(([_,b])=>e.jsxs("div",{className:o["detail-line"],children:[e.jsx("span",{children:_}),e.jsx("span",{children:b})]},_)),e.jsx("h3",{children:"部门归属"}),h.departments.map(_=>e.jsxs("div",{className:o["detail-line"],children:[e.jsx("span",{children:_.label}),e.jsxs("span",{children:[ye(_,h.currency)," / ",_.tasks," 条"]})]},_.key)),e.jsx("div",{className:o.notice,children:"旧记录按当前账号归属回溯，不代表真实历史部门；未知账号费用保持独立。新记录以发生时归属快照为准。"})]}),e.jsxs("div",{className:o["dialog-footer"],children:[e.jsx("button",{className:o.btn,type:"button",onClick:()=>g(null),children:"关闭"}),e.jsx("button",{className:`${o.btn} ${o.primary}`,type:"button",onClick:()=>{f({project:h.group.key}),g(null)},children:"查看项目费用明细 →"})]})]})]})}const J=Y().finite().nullable().optional(),me=I().nullable().optional(),mn=jn(I(),ue),Ds=F({gpus:B(F({name:me,memory_total_bytes:J}).catchall(ue)).optional(),cpu:ue.optional(),os:ue.optional(),memory_total_bytes:J,host_id:me,environment_id:me,model_version:me,disk:me,note:me}).catchall(ue),Yt=F({name:me,role:me,precision:ue.optional(),precision_source:me,loader_dtype:ue.optional()}).catchall(ue),st=F({source:me,complete:ie().optional(),capability_name:me,models:B(Yt).optional(),auxiliary_models:B(Yt).optional()}).catchall(ue),Yc=F({source:I(),summary:st,samples:J,measured:J}).catchall(ue),Kc=F({key:me,id:me,kind:me,width:ue.optional(),height:ue.optional(),duration:J,valid:ie().nullable().optional(),outputs:ue.optional(),samples:ue.optional()}).catchall(ue),Xc=F({total_samples:J,recorded_samples:J,complete_samples:J,total_outputs:J,recorded_outputs:J,variants:B(ue).optional()}).catchall(ue),Qc=F({dimensions:mn.nullable().optional(),parameters:mn.nullable().optional(),expected:mn.nullable().optional(),model_version:me}).catchall(ue),As={capability:I(),capability_name:me,worker_id:me,worker_name:me,source:I(),dimensions:mn.nullable().optional(),spec:Qc.nullable().optional(),output_resolution:Xc.nullable().optional(),recovered_outputs:ue.optional(),runtime_seconds:J,occupied_seconds:J,warnings:B(I()).optional()},ed=F({...As,id:I(),spec_key:me,config_id:me,config:Ds.nullable().optional(),config_source:me,cache_condition:ue.optional(),samples:J,done:J,error:J,canceled:J,measured:J,mean_seconds:J,p50_seconds:J,p90_seconds:J,last_sample_at:J,reference_per_hour:J,output_count:J,unit:me,seconds_per_unit:J,qualified_seconds_per_unit:J,eligible:ie().nullable().optional(),reviewed:J,accepted:J,benchmark_id:me,days:De([B(I()),Y(),ts()]).optional(),model_summary:st.nullable().optional(),model_evidence:F({total_samples:J,recorded_samples:J,variants:B(Yc).optional()}).catchall(ue).nullable().optional(),current_model_reference:st.nullable().optional()}).catchall(ue),nd=F({id:I(),name:me,state:I(),last_seen:J,hardware:Ds.nullable().optional(),hardware_source:me,agent_version:J,supports_capacity_telemetry:ie().optional(),tasks:J,done:J,error:J,canceled:J,runtime_seconds:J}).catchall(ue),Rs=F({...As,job_id:I(),group_id:me,status:I(),created_at:J,attempts:ue.optional(),outputs:B(Kc).nullable().optional(),review:F({accepted:J,source:me,benchmark_id:me,note:me}).catchall(ue).nullable().optional()}).catchall(ue),td=F({period:mn.optional(),overview:jn(I(),Y().finite().nullable()).default({}),workers:B(nd).default([]),groups:B(ed).default([]),details:B(Rs).default([]),details_total:Y().int().nonnegative()}).catchall(ue),sd=F({details:B(Rs),details_total:Y().int().nonnegative()}),Ls=F({to:Y().int(),mode:ve("historical"),quality:ve("technical"),availability:ve(1),utilization:ve(.75),worker_id:I().min(1),hours:Y().finite().min(.1).max(24),price:Y().finite().nonnegative().optional(),demands:B(F({group_id:I().min(1),quantity:Y().finite().positive()})).min(1)}),ad=F({machines:J,total_seconds:J,daily_capacity_seconds:J,price_total:J,lines:B(F({group_id:I(),quantity:J,seconds_per_unit:J,daily_units:J}).catchall(ue)).default([]),warnings:B(I()).default([]),assumptions:ue.optional()}).catchall(ue),Fs=F({host_id:I().max(160).optional(),cpu:I().max(160).optional(),memory_total_bytes:Y().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),environment_id:I().max(160).optional(),model_version:I().max(160).optional(),disk:I().max(160).optional(),note:I().max(500).optional()}).strict(),Os=F({accepted:Y().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),source:Pe(["business","standard"]),benchmark_id:I().max(100),note:I().max(500)}),id=F({processed:Y().int().min(0).max(4),recorded:Y().int().nonnegative(),total:Y().int().nonnegative(),next_offset:Y().int().nonnegative().nullable()}).refine(n=>n.recorded<=n.processed,"补采响应格式无效"),Kt=jn(I(),ns());class rd{constructor(t){this.http=t}http;path(t,s){return`/api/capacity?${new URLSearchParams({to:String(t.to),limit:"100",offset:String(s)})}`}report(t,s){return this.http.read(this.path(t,s),td,{cache:"no-store"})}evidence(t,s){return this.http.read(this.path(t,s),sd,{cache:"no-store"})}async estimate(t){return ad.parse(await this.http.json("/api/capacity/estimate","POST",Ls.parse(t)))}async profile(t,s){Kt.parse(await this.http.json(`/api/capacity/workers/${encodeURIComponent(t)}`,"POST",Fs.parse(s)))}async review(t,s){Kt.parse(await this.http.json(`/api/capacity/jobs/${encodeURIComponent(t)}/review`,"POST",Os.parse(s)))}async probe(t,s,a){const i=await this.http.json(`/api/capacity/jobs/${encodeURIComponent(t)}/probe-outputs`,"POST",{offset:Y().int().nonnegative().parse(s)});a();const r=id.safeParse(i);if(!r.success||r.data.next_offset!==null&&(r.data.next_offset<=s||r.data.next_offset>=r.data.total))throw Error("补采响应格式无效，请刷新看板核对结果");return r.data}}const cn=n=>!!(n.group||n.status||n.source||n.size!==100);class ld{cache=null;pending=null;clear(){this.cache=null,this.pending=null}async all(t,s,a,i){if(!a())return null;if(this.cache?.snapshot===t)return this.cache.records;if(this.pending?.snapshot===t)return this.pending.promise;const r={snapshot:t,promise:Promise.resolve(null)};r.promise=(async()=>{const l=t.report.details_total,c=[];if(!Number.isSafeInteger(l)||l<0)throw Error("明细总数无效，请刷新后重试。");for(let u=0;u<l;u+=100){if(!a())return null;const d=u===t.offset?t.report:await s.evidence(t.range,u);if(!a())return null;if(d.details_total!==l||d.details.length!==Math.min(100,l-u))throw Error("任务证据在读取期间变化或分页不完整，请刷新后重新筛选。");c.push(...d.details),i(c.length,l)}if(new Set(c.map(u=>u.job_id)).size!==c.length)throw Error("任务证据分页出现重复，请刷新后重试。");return a()?(this.cache={snapshot:t,records:c},c):null})(),this.pending=r;try{return await r.promise}finally{this.pending===r&&(this.pending=null)}}}class od{constructor(t,s){this.service=t,this.notify=s}service;notify;listeners=new Set;loadVersion=0;estimateVersion=0;evidenceVersion=0;appliedRange=null;appliedOffset=0;alive=!0;repository=new ld;mutations=new Set;value={report:null,snapshot:null,ready:!1,revision:0,refreshState:"正在读取全部历史聚合与本页证据…",error:"",writeStatus:"",tab:"machines",technicalOpen:!1,evidenceOpen:!1,mounted:new Set,filters:{group:"",status:"",source:"",size:100},evidence:{records:[],total:0,start:0,size:100,state:"",busy:!1,failed:!1},estimate:null,estimateNote:"填写每日需求后计算。没有样本的场景不能按零耗时处理。",estimateError:"",estimating:!1};getSnapshot=()=>this.value;subscribe=t=>(this.listeners.add(t),()=>{this.listeners.delete(t)});set(t){this.alive&&(this.value={...this.value,...t},this.listeners.forEach(s=>s()))}start(){this.alive=!0,this.load()}dispose(){this.alive=!1,this.loadVersion++,this.estimateVersion++,this.evidenceVersion++,this.repository.clear()}invalidateEstimate=(t="输入或证据已变更，请重新计算。")=>{this.estimateVersion++,this.set({estimate:null,estimateNote:t,estimateError:"",estimating:!1})};resetSnapshot(){this.repository.clear(),this.evidenceVersion++,this.set({snapshot:null,ready:!1})}clear(){this.resetSnapshot(),this.set({report:null,mounted:new Set,evidence:{records:[],total:0,start:0,size:100,state:"",busy:!1,failed:!1}})}activeMounts(){const t=new Set([this.value.tab]);return this.value.tab==="machines"&&this.value.technicalOpen&&t.add("technical"),this.value.evidenceOpen&&t.add("evidence"),t}async load(t=!0,s){const a=t?{to:Math.floor(Date.now()/1e3)}:this.appliedRange;if(!a)return;const i=++this.loadVersion,r=Object.freeze({...a}),l=t?0:s??this.appliedOffset;this.resetSnapshot(),this.invalidateEstimate("证据正在刷新，旧测算已清除。"),this.set({error:"",refreshState:"正在读取全部历史聚合与本页证据…",evidence:{...this.value.evidence,state:""}});try{const c=await this.service.report(r,l);if(!this.alive||i!==this.loadVersion)return;const u=Object.freeze({report:c,range:r,version:i,offset:l});this.appliedRange=r,this.appliedOffset=l;const d={...this.value.filters};if(c.groups.some(m=>m.id===d.group)||(d.group=""),this.set({report:c,snapshot:u,ready:!0,revision:this.value.revision+1,mounted:this.activeMounts(),filters:d,evidence:{records:c.details,total:c.details_total,start:l,size:100,state:"",busy:!1,failed:!1}}),this.value.evidenceOpen&&cn(d)&&await this.filterEvidence(0),!this.alive||i!==this.loadVersion)return;this.set({refreshState:`最后刷新：${new Date().toLocaleTimeString("zh-CN",{hour12:!1})}`})}catch(c){if(!this.alive||i!==this.loadVersion)return;this.clear();const u=`读取产能数据失败：${de(c)}。请点击立即刷新重试。`;this.set({error:u,refreshState:"读取失败"}),this.notify(u)}}activate(t){this.set({tab:t}),this.mount()}technical(t){this.set({technicalOpen:t}),this.mount()}evidenceOpen(t){this.set({evidenceOpen:t}),this.mount()}mount(){if(!this.value.ready)return;const t=this.value.mounted.has("evidence"),s=new Set([...this.value.mounted,...this.activeMounts()]);this.set({mounted:s}),!t&&s.has("evidence")&&cn(this.value.filters)&&this.filterEvidence(0)}showEvidence(t=""){!this.value.ready||!this.value.snapshot||(this.set({evidenceOpen:!0,filters:{...this.value.filters,group:t,status:"",source:""},mounted:new Set([...this.value.mounted,"evidence"])}),this.filterEvidence(0))}filter(t){this.value.ready&&(this.set({filters:{...this.value.filters,...t}}),this.filterEvidence(0))}current(t){return this.alive&&this.value.ready&&this.value.snapshot===t&&t.version===this.loadVersion&&this.value.report===t.report}async filterEvidence(t){const s=this.value.snapshot;if(!s||!this.current(s)||!this.value.mounted.has("evidence"))return;const a=++this.evidenceVersion,i=this.value.filters;if(!cn(i)){if(s.offset!==0){await this.load(!1,0);return}this.set({evidence:{records:s.report.details,total:s.report.details_total,start:0,size:100,state:"",busy:!1,failed:!1}});return}this.set({evidence:{records:[],total:0,start:0,size:i.size,state:"正在读取同一截止时间下的真实分页证据，完成后筛选；不会按当前页冒充全部任务。",busy:!0,failed:!1}});try{const r=await this.repository.all(s,this.service,()=>this.current(s),(u,d)=>{this.current(s)&&cn(this.value.filters)&&this.set({evidence:{...this.value.evidence,state:`正在读取真实分页证据 ${u} / ${d} 条；聚合统计保持不变。`}})});if(!r||!this.current(s)||a!==this.evidenceVersion)return;const l=r.filter(u=>(!i.group||u.group_id===i.group)&&(!i.status||u.status===i.status)&&(!i.source||u.source===i.source)),c=Math.min(t,Math.max(0,Math.ceil(l.length/i.size)-1)*i.size);this.set({evidence:{records:l.slice(c,c+i.size),total:l.length,start:c,size:i.size,state:`筛选 ${l.length} / 全集 ${r.length} 条；只改变明细，聚合统计不受筛选或分页影响。`,busy:!1,failed:!1}})}catch(r){if(!this.current(s)||a!==this.evidenceVersion)return;this.set({evidence:{records:[],total:0,start:0,size:i.size,state:`证据筛选失败：${de(r)}。请立即刷新后重试。`,busy:!1,failed:!0}})}}page(t){const{ready:s,evidence:a,mounted:i,snapshot:r,filters:l}=this.value;if(!s||!r||!i.has("evidence")||a.busy||a.failed)return;const c=Math.max(0,a.start+t*a.size);t>0&&c>=a.total||(cn(l)?this.filterEvidence(c):this.load(!1,c))}async estimate(t){if(this.invalidateEstimate("正在计算…"),!this.value.ready||!this.value.snapshot){this.estimateFailure("请先点击立即刷新并成功读取证据。");return}const s=this.estimateVersion,a=this.value.snapshot,i=this.value.revision;this.set({estimating:!0});try{const r=await this.service.estimate(t);if(s!==this.estimateVersion||i!==this.value.revision||!this.current(a))return;const c={...a.report.workers.find(d=>d.id===t.worker_id)?.hardware};delete c.note;const u={result:r,payload:t,groups:a.report.groups.filter(d=>t.demands.some(m=>m.group_id===d.id)),hardware:c};this.set({estimate:u,estimating:!1})}catch(r){s===this.estimateVersion&&this.estimateFailure(`测算失败：${de(r)}`)}}estimateFailure(t){this.set({estimate:null,estimating:!1,estimateNote:"本次未产生测算结果，请检查证据与输入后重试。",estimateError:t}),this.notify(t)}async mutate(t,s,a){if(this.mutations.has(t))throw Error("正在保存，请勿重复提交。");this.mutations.add(t);const i=this.loadVersion;this.set({writeStatus:""}),this.invalidateEstimate(`${s}正在保存，旧测算已清除。`);try{if(await a(),!this.alive)return;i===this.loadVersion?await this.load(!1):(this.loadVersion++,this.clear(),this.invalidateEstimate("证据已更新，请点击立即刷新后重新计算。"),this.set({refreshState:`${s}已更新，请点击立即刷新`})),this.set({writeStatus:`${s}已保存。人工声明不回写历史快照，也不代表自动验证通过。`})}finally{this.mutations.delete(t)}}saveProfile(t,s){return this.mutate(`profile:${t}`,"机器配置",()=>this.service.profile(t,s))}saveReview(t,s){return this.mutate(`review:${t}`,"人工标记",()=>this.service.review(t,s))}probe(t,s){return this.service.probe(t,s,this.probeWritten)}probeVersion(){return this.loadVersion}probeCurrent(t){return this.alive&&t===this.loadVersion&&this.value.report!==null}probeWritten=()=>{this.resetSnapshot(),this.invalidateEstimate("成品尺寸证据已更新，请刷新看板后重新计算。")}}function cd({http:n,notify:t}){const s=p.useMemo(()=>new od(new rd(n),i=>t({message:i,tone:"error"})),[n,t]),a=p.useSyncExternalStore(s.subscribe,s.getSnapshot);return p.useEffect(()=>(s.start(),()=>s.dispose()),[s]),{controller:s,state:a}}const dd={historical:"历史运行参考",captured:"采集业务样本",standard:"标准样本（人工标签）"},vt={idle:"在线空闲",online:"在线",busy:"运行中",running:"运行中",offline:"离线",disabled:"已禁用",syncing:"同步中",unavailable:"执行环境不可用",historical:"历史执行端",error:"异常",done:"已完成",canceled:"已取消",queued:"排队中",assigned:"已分配"},ee=n=>typeof n=="number"&&Number.isFinite(n),H=n=>n==null||n===""?"未知":typeof n=="object"?JSON.stringify(n):String(n),L=n=>ee(n)?n.toLocaleString("zh-CN",{maximumFractionDigits:2}):"未知",be=n=>ee(n)?`${L(n)} 秒`:"未知",ln=n=>ee(n)?new Date(n*1e3).toLocaleString("zh-CN",{hour12:!1}):"未知",rn=n=>ee(n)?`${L(n/1024**3)} GiB`:"未知",Ie=n=>dd[n]||`来源未知（${H(n)}）`,yt=n=>Array.isArray(n.days)?n.days.length:n.days,nn=n=>n.capability_name?.trim()?n.capability_name:H(n.capability),Us=n=>nn(n)===n.capability?nn(n):`${nn(n)}（${n.capability}）`,On=n=>typeof n=="string"&&{reported:"机器上报",manual:"人工声明","manual+reported":"机器上报 + 人工声明",unknown:"未知"}[n]||"未知";function _t(n){return n&&typeof n=="object"&&!Array.isArray(n)?n:{}}function gn(n,t){if(!n||typeof n!="object")return H(n);const s=_t(n);return(t==="cpu"?[s.model,s.architecture,ee(s.logical_cores)?`${L(s.logical_cores)} 逻辑核`:null]:[s.name,s.release,s.version]).filter(i=>i!=null&&i!=="").map(H).join(" / ")||"未知"}function bn(n){return n?`GPU ${n.gpus?.length?n.gpus.map(s=>`${H(s.name)} / 单卡 ${rn(s.memory_total_bytes)}`).join("；"):"未知"}；CPU ${gn(n.cpu,"cpu")}；内存 ${rn(n.memory_total_bytes)}；系统 ${gn(n.os,"os")}；环境 ${H(n.environment_id)}；模型版本 ${H(n.model_version)}；磁盘 ${H(n.disk)}；主机 ID ${H(n.host_id)}`:"未知"}function pd(n){const t=n.hardware,s=(t?.gpus||[]).map(a=>[a.name,ee(a.memory_total_bytes)?rn(a.memory_total_bytes):null].filter(Boolean).join(" / ")).filter(Boolean);return ee(t?.memory_total_bytes)&&s.push(`系统内存 ${rn(t.memory_total_bytes)}`),s.join("；")||"尚未采集硬件信息"}function ud(n){const t=n.hardware;return!t?.cpu||!t.host_id?ee(n.agent_version)&&n.agent_version<4||n.supports_capacity_telemetry===!1?"旧版采集程序缺少 CPU 等信息，请升级该 Worker 后补采；已有 GPU 与内存记录仍可查看。":"CPU 或主机信息尚未采集，请检查该 Worker 的采集上报。":!t.environment_id||!t.model_version?"环境或模型版本的人工声明未填写，可在“详细统计与机器配置”中补录。":"当前配置不代表历史任务的执行配置；历史依据见各业务详情。"}const Re=n=>["idle","busy","online","running"].includes(n.state),Mn=n=>ee(n.mean_seconds)&&n.mean_seconds>=0&&ee(n.measured)&&n.measured>0;function md(n){if(!ee(n)||n<0)return"暂无成功耗时";if(n<1)return`${L(n)} 秒`;const t=Math.round(n),s=Math.floor(t/60),a=t%60;return s?`${L(s)} 分 ${a} 秒`:`${a} 秒`}function Un(n){const t={...n.spec?.dimensions,...n.dimensions},s=[["图片",t.image_count,"张"],["视频",t.video_count,"段"],["音频",t.audio_count,"段"]],a=i=>ee(i)&&Number.isSafeInteger(i)&&i>=0;return s.every(([,i])=>!a(i))?["素材信息未记录"]:s.every(([,i])=>i===0)?["未使用图片、视频或音频"]:s.flatMap(([i,r,l])=>a(r)?r>0?[`${i} ${L(r)} ${l}`]:[]:[`${i}数量未记录`])}function Ws(n,t){const s=r=>ee(r)&&Number.isSafeInteger(r)&&r>0,a=typeof n.resolution=="string"?n.resolution.match(/^(\d+)\s*[x×]\s*(\d+)(?:\s*\(\d+:\d+\))?$/i):null,i=[[n.output_width,n.output_height],[n.width,n.height],[a?Number(a[1]):null,a?Number(a[2]):null],[t.width,t.height,"期望 "]];for(const[r,l,c=""]of i)if(s(r)&&s(l)){const d={"640x360":"360p","640x480":"480p","854x480":"480p","1280x720":"720p","1920x1080":"1080p","2560x1440":"1440p","3840x2160":"4K"}[`${Math.max(r,l)}x${Math.min(r,l)}`];return d?`${c}${d}${r<l?" 竖屏":""}（${L(r)} × ${L(l)}）`:`${c||"尺寸 "}${L(r)} × ${L(l)}`}return ee(n.megapixels)&&n.megapixels>0&&ee(n.megapixels*100)?`约 ${L(n.megapixels*100)} 万像素（尺寸未记录）`:null}function Wn(n,t=!1){const s={...n.spec?.parameters,...n.spec?.dimensions,...n.dimensions},a=n.spec?.expected||{},i=[],r=s.output_duration??s.duration??a.duration;ee(r)&&i.push(`请求时长 ${L(r)} 秒`);const l=Ws(s,a);if(l&&i.push(l),t){ee(s.megapixels)&&s.megapixels>0&&i.push(`像素设置 ${L(s.megapixels)} MP`);const c=[["帧率",s.output_fps??s.target_fps??s.fps??s.force_rate??a.fps," FPS"],["步数",s.steps," 步"],["帧数",s.frames," 帧"],["长边",s.scale_to_length," px"],["批量",s.batch_size,""]];for(const[u,d,m]of c)ee(d)&&i.push(`${u} ${L(d)}${m}`)}return i.join(" / ")||"规格未完整记录"}function Bs(n){return(n?.variants||[]).flatMap(t=>{const s=_t(t);return typeof s.kind=="string"&&["image","video"].includes(s.kind)&&ee(s.width)&&Number.isSafeInteger(s.width)&&s.width>0&&ee(s.height)&&Number.isSafeInteger(s.height)&&s.height>0?[{kind:s.kind,width:s.width,height:s.height,outputs:s.outputs,samples:s.samples}]:[]})}function wt(n){return`${n.kind==="image"?"图片":"视频"} · ${Ws({width:n.width,height:n.height},{})}`}function hd(n){return ee(n.width)&&ee(n.height)&&Number.isSafeInteger(n.width)&&Number.isSafeInteger(n.height)&&n.width>0&&n.height>0&&["image","video"].includes(n.kind||"")?wt({kind:n.kind||"",width:n.width,height:n.height}):"尺寸未记录"}const xd=n=>`${Un(n).join(" + ")}｜${Wn(n)}`;function fd(n){const t=s=>Mn(s)?s.source!=="historical"&&ee(s.last_sample_at)?3:s.source==="historical"?2:1:0;return[...n].sort((s,a)=>t(a)-t(s)||(t(s)===3?(a.last_sample_at||0)-(s.last_sample_at||0):0)||(a.samples||0)-(s.samples||0)||(a.measured||0)-(s.measured||0))[0]}function kt(n){const t=[...n.warnings||[]],s=yt(n);return(!ee(n.samples)||n.samples<30||!ee(s)||s<3)&&t.push("参考样本不足：建议至少 30 个任务且跨 3 天；达到门槛也不是置信保证。"),n.source==="historical"&&t.push("仅成功任务 runtime 参考，未计完整占机、重试及质量损耗；不是合格日产能。"),n.eligible!==!0&&t.push("完整基线证据不足，不作为已验证采购依据。"),[...new Set(t)]}const tn=n=>{const t={task:"任务",tasks:"任务",image:"张图片",images:"张图片",video:"条视频",videos:"条视频",second:"视频秒",seconds:"视频秒",video_seconds:"视频秒"};return n.source==="historical"?"任务":t[n.unit||""]||H(n.unit)};function Vs(n){const t=Object.hasOwn(n,"model_evidence"),s=n.model_evidence;return{variants:t?(s?.variants||[]).filter(i=>["task_snapshot","archived_task"].includes(i.source)):n.model_summary?.source==="task_snapshot"?[{source:"task_snapshot",summary:n.model_summary,samples:null,measured:null}]:[],hasEvidence:t,total:s?.total_samples,recorded:s?.recorded_samples,reference:n.current_model_reference?.source==="current_template"?n.current_model_reference:null}}const Ye=n=>n?.models||[];function gd(n,t,s){const i={high_noise:"高噪声",low_noise:"低噪声",高噪声:"高噪声",低噪声:"低噪声",base:"基础模型",refiner:"精修模型",生成主模型:"生成主模型",深度模型:"深度模型",放大模型:"放大模型",插帧模型:"插帧模型"}[n.role||""];return i?`${i} · 主模型 ${t+1}`:s>1?`主模型 ${t+1}`:""}function at(n){const t=[];if(n.precision&&n.precision_source==="filename"&&t.push(`文件标记 ${H(n.precision)}`),n.loader_dtype){const s=H(n.loader_dtype),a=s.split(/\s*\/\s*/).map(r=>r.match(/^(bfloat16|bf16|float(?:8|16|32|64)|fp(?:8|16|32|64))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]),i=a.every(Boolean)?[...new Set(a.map(r=>r?.toUpperCase().replace("BFLOAT16","BF16").replace("FLOAT","FP")))].join(" / "):null;t.push(`加载配置 ${i?`${i}（${s}）`:s}${["default","auto"].includes(s.toLowerCase())?"（实际精度未确认）":""}`)}else n.precision&&n.precision_source==="loader"&&t.push(`加载配置 ${H(n.precision)}`);return t.length||t.push("精度未记录 / 待确认"),t}function bd(n){const t=r=>{if(typeof r!="string")return null;const l=r.split(/\s*\/\s*/).map(c=>c.trim().match(/^(bfloat16|float(?:8|16|32|64)|bf16|fp(?:4|8|16|32|64)|int(?:4|8|16)|nf4|q[2-8]_(?:k(?:_[sml])?|[01]))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]);return l.every(Boolean)?[...new Set(l.map(c=>c?.toUpperCase().replace("BFLOAT16","BF16").replace("FLOAT","FP")))].sort().join(" / "):null},s=n.precision_source==="filename"?t(n.precision):null,a=t(n.loader_dtype)||(n.precision_source==="loader"?t(n.precision):null),i=at(n).filter(r=>r.startsWith("文件标记 ")?!!s:r.startsWith("加载配置 ")?!!a||["default","auto"].includes(String(n.loader_dtype).toLowerCase()):!1);return i.some(r=>r.startsWith("文件标记 "))||i.unshift("文件标记未记录 / 待确认"),i.some(r=>r.startsWith("加载配置 "))||i.push("加载配置未记录 / 待确认"),i}function Hs(n){return JSON.stringify([n.capability,n.spec_key||`unknown:${n.id}`,n.source,n.spec?.model_version||null,n.config?.model_version||null,n.config?.environment_id||null,n.source==="standard"?n.benchmark_id||`unknown:${n.id}`:null,n.cache_condition||null])}function jd(n){const t=new Map,s={none:"无节点结果缓存",loaders:"加载节点缓存",execution:"执行节点缓存",unknown:"未知",mixed:"混合条件"};for(const a of n){const i=_t(a.cache_condition).kind;t.set(Hs(a),`${Us(a)} / ${H(a.spec_key)} / ${Ie(a.source)} / 模型 ${H(a.spec?.model_version||a.config?.model_version)} / 环境 ${H(a.config?.environment_id)} / 缓存 ${typeof i=="string"&&s[i]||"未知"}${a.source==="standard"?` / 基准 ${H(a.benchmark_id)}`:""}`)}return[...t]}function Nt(n,t,s,a=[]){return`${t||s.find(i=>i.id===n)?.name||a.find(i=>i.worker_id===n)?.worker_name||"未关联执行端"}（${n||"Worker ID 未知"}）`}function vd(n){return n.review?.source==="standard"?"标准样本（人工声明）":n.review?.source==="business"?"业务样本":"未标记"}function Gs({title:n,children:t,className:s}){const[a,i]=p.useState(!1);return e.jsxs("details",{className:s,onToggle:r=>{r.currentTarget.open&&i(!0)},children:[e.jsx("summary",{children:n}),a&&(typeof t=="function"?t():t)]})}function In({title:n,value:t,className:s}){return e.jsx(Gs,{title:n,className:s,children:()=>e.jsx("pre",{children:H(t)})})}function Bn({values:n=[],className:t="warn"}){return e.jsx("ul",{className:t,children:n.map((s,a)=>e.jsx("li",{children:s},a))})}function it({items:n}){return n.map(([t,s])=>e.jsxs("div",{className:"metric",children:[e.jsx("span",{children:t}),e.jsx("strong",{children:L(s)})]},t))}function $t({headers:n,children:t}){return e.jsx("div",{className:"scroll",tabIndex:0,role:"region","aria-label":n.join(" / "),children:e.jsxs("table",{children:[e.jsx("thead",{children:e.jsx("tr",{children:n.map(s=>e.jsx("th",{scope:"col",children:s},s))})}),e.jsx("tbody",{children:t})]})})}function Js({resolution:n}){const t=Bs(n);return e.jsxs(e.Fragment,{children:[t.length?e.jsxs(e.Fragment,{children:[new Set(t.map(s=>`${s.width}x${s.height}`)).size>1&&e.jsx("span",{className:"hint",children:"多种成品规格（非单一尺寸）"}),t.map((s,a)=>e.jsx("span",{className:"resolution-variant",children:wt(s)},a))]}):e.jsx("span",{children:"尺寸未记录"}),ee(n?.total_samples)&&n.total_samples>0&&n.complete_samples!==n.total_samples&&e.jsxs("span",{className:"resolution-coverage hint",children:["已知 ",L(n.recorded_samples)," / ",L(n.total_samples)," ","次任务的部分或全部成品"]})]})}function Zs({resolution:n}){return e.jsxs("div",{className:"output-resolution-details",children:[e.jsx("h3",{children:"实际成品"}),e.jsx("div",{className:"actual-resolution",children:e.jsx(Js,{resolution:n})}),e.jsxs("p",{children:["尺寸覆盖：",L(n?.recorded_samples)," / ",L(n?.total_samples)," ","次已完成任务至少有一个成品尺寸；",L(n?.complete_samples)," /"," ",L(n?.total_samples)," 次已完成任务的全部最终产物都有尺寸。"]}),e.jsxs("p",{children:["已知尺寸产物 ",L(n?.recorded_outputs)," / ",L(n?.total_outputs)," 个",n?.total_outputs==null?"（最终清单不完整，产物总数未知）":"","。"]}),Bs(n).map((t,s)=>e.jsxs("p",{children:[wt(t),"：",L(t.outputs)," 个产物 / ",L(t.samples)," 次任务"]},s)),e.jsx("p",{className:"hint",children:"同一任务可能包含多种尺寸，各尺寸的任务数不能相加。尺寸来自最终产物记录或受控补采，与技术合格产量、人工验收和采购资格分离；有尺寸不代表技术合格。平均耗时仍为原组成功任务平均，不按尺寸重算。"})]})}function Xt({summary:n,origin:t}){const s=Ye(n);return e.jsxs("div",{className:"model-reference",children:[e.jsx("p",{className:"model-origin",children:t}),n.complete===!1&&e.jsx("p",{className:"warn",children:"不完整 / 未确认完整主模型链；动态选择或未知链路不能推断全部主模型。"}),!s.length&&e.jsx("p",{children:"未获取到模型信息，模型待确认。"}),s.map((a,i)=>e.jsx("p",{children:`${gd(a,i,s.length)||"主模型"}：${H(a.name)}；角色：${H(a.role)}；${at(a).join("；")}；非运行时检测`},i)),!!n.auxiliary_models?.length&&e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"hint",children:"辅助模型（不计入主模型名称或精度）"}),n.auxiliary_models?.map((a,i)=>e.jsx("p",{className:"hint",children:`角色：${H(a.role)}；${H(a.name)}；${at(a).join("；")}`},i))]})]})}function Ys({g:n}){const t={...n.spec?.dimensions,...n.dimensions},s=Vs(n);return e.jsxs("div",{className:"pad",children:[e.jsxs("p",{children:["输入素材：",Un(n).join(" / ")]}),e.jsxs("p",{children:["生成参数：",Wn(n,!0)]}),ee(t.source_duration)&&e.jsxs("p",{className:"hint",children:["首个输入视频时长：",L(t.source_duration)," 秒（非多段视频合计）"]}),e.jsx("p",{className:"hint",children:"素材数量按任务输入槽位计，同一文件被多次引用也会分别计数；生成参数不是成品实测规格。"}),e.jsxs("p",{children:["来源：",Ie(n.source),"；有效耗时样本 ",L(n.measured)," / 总样本 ",L(n.samples),"；成功"," ",L(n.done)," / 失败 ",L(n.error)," / 取消 ",L(n.canceled)]}),e.jsxs("p",{children:["mean：",be(n.mean_seconds),"；P50：",be(n.p50_seconds),"；P90：",be(n.p90_seconds),"；最近成功样本：",ln(n.last_sample_at)]}),e.jsx("p",{className:"hint",children:"平均值仅使用该组成功任务执行耗时；不包含排队，不等于纯 GPU 计算时间，也不是合格日产能。"}),e.jsxs("p",{children:["执行时配置：",bn(n.config),"（",On(n.config_source),"）"]}),e.jsxs("p",{children:["缓存条件：",H(n.cache_condition)]}),e.jsxs("p",{children:["成功 runtime 合计：",be(n.runtime_seconds),"；占机合计：",be(n.occupied_seconds),"；实际产出：",L(n.output_count)," ",tn(n),"。"]}),e.jsxs("p",{children:["单位技术交付：",be(n.seconds_per_unit)," / ",tn(n),"；单位人工合格：",be(n.qualified_seconds_per_unit)," / ",tn(n),"；已人工验收：",L(n.reviewed),"；全组人工合格数量：",L(n.accepted),"。"]}),e.jsxs("p",{className:"hint",children:["技术基线资格：",n.eligible===!0?"服务端判定具备完整基线证据":n.eligible===!1?"证据不足，不作为已验证采购依据":"未记录","；标准场景编号：",H(n.benchmark_id),"。"]}),e.jsx(Zs,{resolution:n.output_resolution}),s.hasEvidence&&e.jsxs("p",{children:["模型记录覆盖 ",L(s.recorded)," / ",L(s.total)," ","次；覆盖数不是完整主模型链的确认。"]}),s.variants.length>1&&e.jsx("p",{className:"warn",children:"不同任务记录对应不同模型组合；每个组合内的主模型才属于同一个图。全组平均耗时不代表任一组合的专属速度。"}),!s.variants.length&&e.jsx("p",{children:"历史未记录可用主模型证据；不能用当前模板补写历史模型与精度。"}),s.variants.map((a,i)=>e.jsx(Xt,{summary:a.summary,origin:`历史任务记录组合 ${i+1} · ${a.source==="archived_task"?"保留的原任务记录":"任务提交记录"}${s.hasEvidence?` · ${L(a.samples)} 次记录 / ${L(a.measured)} 次成功耗时`:""}`},i)),s.reference?e.jsxs(e.Fragment,{children:[e.jsx(Xt,{summary:s.reference,origin:`当前工具默认配置（非历史执行记录）· ${H(s.reference.capability_name)}`}),e.jsx("p",{className:"warn hint",children:"仅为工具模板默认值，不代表用户画布节点当前选中的模型。历史耗时不代表当前模型速度；参考信息不补齐历史覆盖，也不覆盖历史精度。"})]}):!s.variants.length&&e.jsx("p",{className:"hint",children:"未获取到模型信息：当前工具模板未提供、找不到或无法识别。"}),e.jsx(Bn,{values:kt(n)}),e.jsxs("p",{className:"hint",children:["采样日期：",H(n.days),"；配置编号：",H(n.config_id),"；采样编号：",n.id]}),e.jsx(In,{title:"原始规格与证据",value:{dimensions:n.dimensions,spec:n.spec,output_resolution:n.output_resolution,recovered_outputs:n.recovered_outputs,model_summary:n.model_summary,model_evidence:n.model_evidence,current_model_reference:n.current_model_reference,cache_condition:n.cache_condition}})]})}function Ks({groups:n,report:t}){return n.length?e.jsx($t,{headers:["业务 / 执行端 / 来源","精确业务规格","样本覆盖","成功任务耗时分布","运行参考 / 产出口径","警告与限制"],children:n.map(s=>e.jsxs("tr",{"data-group-id":s.id,children:[e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsx("strong",{children:nn(s)}),e.jsxs("p",{className:"hint",children:["能力 ID：",s.capability]}),e.jsx("p",{className:"hint",children:Nt(s.worker_id,s.worker_name,t.workers,t.groups)}),e.jsx("span",{className:"badge",children:Ie(s.source)}),e.jsxs("p",{className:"hint",children:["配置：",H(s.config_id)]}),s.source==="standard"&&e.jsxs("p",{className:"hint",children:["标准场景编号：",H(s.benchmark_id)]})]})}),e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsxs("p",{children:["规格键：",H(s.spec_key)]}),e.jsxs("p",{className:"hint",children:["已知规格：",H(s.dimensions)]}),e.jsx(Gs,{title:"配置 / 规格 / 日期证据",children:()=>e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["执行时配置：",bn(s.config)]}),e.jsxs("p",{children:["配置来源：",On(s.config_source)]}),e.jsxs("p",{children:["采样日期（服务端记录）：",H(s.days)]}),e.jsxs("p",{children:["缓存条件：",H(s.cache_condition)]}),e.jsx("pre",{children:H(s.spec)})]})})]})}),e.jsx("td",{children:e.jsxs("div",{children:[e.jsxs("p",{children:["样本 ",L(s.samples)," / ",L(yt(s))," 天"]}),e.jsxs("p",{children:["完成 ",L(s.done)," / 失败 ",L(s.error)," / 取消 ",L(s.canceled)]}),e.jsxs("p",{className:"hint",children:["有效耗时样本 ",L(s.measured),"；已人工验收 ",L(s.reviewed)]})]})}),e.jsx("td",{children:e.jsxs("div",{children:[e.jsxs("p",{children:["平均 ",be(s.mean_seconds)]}),e.jsxs("p",{children:["P50 ",be(s.p50_seconds)]}),e.jsxs("p",{children:["P90 ",be(s.p90_seconds)]})]})}),e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsxs("p",{children:["成功任务 runtime 合计 ",be(s.runtime_seconds)]}),e.jsxs("p",{children:["成功任务 / 运行小时（仅 runtime 参考）：",L(s.reference_per_hour)]}),s.source!=="historical"&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["占机合计 ",be(s.occupied_seconds)]}),e.jsxs("p",{children:["实际产出 ",L(s.output_count)," ",tn(s)]}),e.jsxs("p",{children:["单位技术交付 ",be(s.seconds_per_unit)," / ",tn(s)]}),e.jsxs("p",{children:["单位人工合格 ",be(s.qualified_seconds_per_unit)," / ",tn(s)]})]})]})}),e.jsx("td",{className:"wide",children:e.jsx(Bn,{values:kt(s)})})]},s.id))}):e.jsx("p",{className:"empty",children:"暂无业务规格样本；未测试场景不能推算产能。"})}function yd({items:n}){return e.jsx("dl",{children:n.map(([t,s])=>e.jsxs(p.Fragment,{children:[e.jsx("dt",{children:t}),e.jsx("dd",{children:s})]},t))})}function _d({entries:n,worker:t,title:s,ready:a,onEvidence:i}){const[r,l]=p.useState(()=>fd(n)?.id||""),[c,u]=p.useState(!1),[d,m]=p.useState(!1),v=`summary-evidence-${p.useId().replace(/[^a-zA-Z0-9_-]/g,"")}`,h=n.find(z=>z.id===r)||n[0];if(!h)return null;const g=Vs(h),y=g.variants.length?g.variants.map(z=>z.summary):g.reference?[g.reference]:[],x=y.reduce((z,R)=>z+Math.max(1,Ye(R).length),0)||1,S=n.map(xd),w=new Map;for(const z of S)w.set(z,(w.get(z)||0)+1);const f=g.variants.length?g.variants.length>1||g.hasEvidence&&ee(g.recorded)&&ee(g.total)&&g.recorded<g.total||g.variants.some(z=>z.summary.complete===!1)?"全组历史任务平均，非某个模型或组合专属速度。":"":g.reference?"此处耗时来自历史任务，不代表当前模型速度。":"",k={"--model-rows":x+1};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"business-row","data-capability":h.capability,"data-selected-group-id":h.id,children:[e.jsxs("div",{className:"matrix-field","data-label":"平均生成时间",children:[e.jsx("span",{className:Mn(h)?"mean-time":"muted",children:Mn(h)?md(h.mean_seconds):"暂无成功耗时"}),f&&e.jsx("p",{className:"warn hint",children:f}),Mn(h)&&ee(h.mean_seconds)&&(h.mean_seconds<1||h.mean_seconds>3600)&&e.jsx("p",{className:"warn hint",children:"耗时异常，请核对详情"})]}),e.jsxs("div",{className:"matrix-samples","data-label":"样本与详情",children:[e.jsxs("p",{className:!ee(h.measured)||h.measured<30?"warn hint":"hint",children:[ee(h.measured)?h.measured<30?`仅 ${L(h.measured)} 次 / 仅供参考`:`${L(h.measured)} 次成功实测`:"样本数未记录"," ","· ",Ie(h.source)]}),e.jsx("button",{type:"button",className:"summary-detail-toggle","aria-expanded":c,"aria-controls":v,onClick:()=>{u(!c),c||m(!0)},children:c?"收起详情":"查看详情"})]}),e.jsxs("div",{className:"matrix-field","data-label":"任务规格",children:[e.jsx("select",{className:"summary-spec",disabled:!a,"aria-label":`${t.name||"机器"} ${s}任务规格`,title:`原组 ${h.id} / 配置 ${H(h.config_id)} / ${Ie(h.source)} / 规格键 ${H(h.spec_key)}`,value:h.id,onChange:z=>{a&&(l(z.target.value),m(c))},children:n.map((z,R)=>e.jsx("option",{value:z.id,children:`${S[R]}${(w.get(S[R]||"")||0)>1?` · ${Ie(z.source)} · ${ee(z.last_sample_at)?ln(z.last_sample_at):"日期未记录"} · 采样 ${R+1}`:""}`},z.id))}),e.jsxs("dl",{className:"selected-spec",children:[e.jsx("dt",{children:"输入素材"}),e.jsx("dd",{className:"input-materials",children:Un(h).map(z=>e.jsx("span",{children:z},z))}),e.jsx("dt",{children:"生成参数"}),e.jsx("dd",{className:"generation-parameters",children:Wn(h)}),e.jsx("dt",{children:"实际成品"}),e.jsx("dd",{className:"actual-resolution",children:e.jsx(Js,{resolution:h.output_resolution})})]})]}),e.jsxs("div",{className:"matrix-models",style:k,children:[e.jsx("div",{className:"matrix-field","data-label":"模型名称",children:y.length?y.map((z,R)=>e.jsx("div",{className:"model-variant",children:Ye(z).length?Ye(z).map((E,N)=>e.jsx("div",{className:"model-item",children:e.jsx("p",{className:"model-name",children:E.name||"未获取到模型信息"})},N)):e.jsx("p",{className:"muted",children:"未获取到模型信息"})},R)):e.jsx("span",{className:"muted",children:"未获取到模型信息"})}),e.jsx("div",{className:"matrix-field","data-label":"模型精度",children:y.length?y.map((z,R)=>e.jsx("div",{className:"model-variant",children:Ye(z).length?Ye(z).map((E,N)=>e.jsx("div",{className:"model-item",children:bd(E).map(A=>e.jsx("p",{className:"model-label",children:A},A))},N)):e.jsx("p",{className:"muted",children:"无"})},R)):e.jsx("p",{className:"muted",children:"无"})})]})]}),e.jsx("div",{className:"summary-evidence",id:v,hidden:!c,children:d&&e.jsxs(e.Fragment,{children:[e.jsx(Ys,{g:h},h.id),e.jsx("button",{type:"button","data-evidence-entry":"",disabled:!a,onClick:()=>{a&&i(h.id)},children:"任务证据"})]})})]})}function wd({report:n,ready:t,includeOffline:s,onProfile:a,onEvidence:i}){const r=n.workers.filter(d=>s||Re(d));if(!r.length)return e.jsx("p",{className:"empty",children:s?"暂无机器记录。":"当前没有在线机器，可勾选“包含离线”查看已登记记录。"});const l=new Set(r.map(d=>d.id)),c=new Map;for(const d of n.groups)if(d.worker_id&&l.has(d.worker_id)){let m=c.get(d.capability);m||(m={title:nn(d),machines:new Map},c.set(d.capability,m)),m.machines.set(d.worker_id,[...m.machines.get(d.worker_id)||[],d])}c.size||c.set("",{title:"历史记录",machines:new Map});const u={"--machine-count":r.length};return e.jsx("div",{className:"scroll comparison-scroll",tabIndex:0,role:"region","aria-label":"机器产能对比表，可横向滚动",children:e.jsxs("table",{className:"simple-table matrix-table","aria-label":"机器与业务能力对比",style:u,children:[e.jsxs("colgroup",{children:[e.jsx("col",{className:"matrix-axis-col"}),r.map(d=>e.jsx("col",{},d.id))]}),e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"business-axis",scope:"col",children:"业务能力"}),r.map((d,m)=>e.jsxs("th",{className:"machine-heading",scope:"col",id:`summary-machine-${m+1}`,"data-summary-worker-id":d.id,children:[e.jsx("h3",{children:d.name||"未命名机器"}),e.jsx("span",{className:["busy","running"].includes(d.state)?"warn":Re(d)?"online-state":"muted",children:vt[d.state]||"状态待确认"}),e.jsx("p",{className:"machine-hardware",children:pd(d)}),e.jsxs("details",{className:"machine-more",children:[e.jsx("summary",{children:"机器详情"}),e.jsx("p",{children:ud(d)}),e.jsxs("p",{className:"hint",children:["最后上报：",ln(d.last_seen),"；Worker ID：",d.id,"；采集程序版本：",H(d.agent_version)]}),!Re(d)&&e.jsx("p",{className:"hint",children:"此记录当前不可用，配置为最后上报信息，历史速度不代表现在能执行。"}),e.jsx("button",{type:"button",onClick:()=>a(d),children:"查看配置"})]})]},d.id))]})}),e.jsx("tbody",{children:[...c].map(([d,{title:m,machines:v}],h)=>e.jsxs("tr",{className:"capability-row","data-capability":d||void 0,children:[e.jsx("th",{className:"business-axis",scope:"row",id:`summary-business-${h+1}`,children:e.jsx("span",{className:"business-title",children:m})}),r.map((g,y)=>{const x=v.get(g.id);return e.jsx("td",{className:"machine-result","data-summary-worker-id":g.id,headers:`summary-machine-${y+1} summary-business-${h+1}`,children:x?e.jsx(_d,{entries:x,worker:g,title:m,ready:t,onEvidence:i}):e.jsx("p",{className:"matrix-empty",children:"暂无记录；不据此推断是否支持该业务。"})},g.id)})]},d))})]})})}function kd({report:n,mounted:t,onProfile:s}){const a=n?.overview||{};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"summary",children:[e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"生成任务"}),e.jsx("span",{className:"hint",children:"不是产物数量"})]}),e.jsx("div",{id:"task-metrics",className:"metrics pad",children:t&&e.jsx(it,{items:[["总任务",a.tasks],["完成",a.done],["失败",a.error],["取消",a.canceled]]})}),e.jsx("p",{id:"coverage",className:"hint pad",children:t&&`历史 ${L(a.historical_tasks)} / 新采集 ${L(a.captured_tasks)}；Worker 未关联 ${L(a.unknown_worker)}；已排除 API ${L(a.excluded_api)}。`})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"实际产物"}),e.jsx("span",{className:"hint",children:"仅已知输出，不从请求推断"})]}),e.jsx("div",{id:"output-metrics",className:"metrics pad",children:t&&e.jsx(it,{items:[["图片（张）",a.output_images],["视频（条）",a.output_videos],["视频总时长（秒）",a.output_seconds],["产物未知记录",a.unknown_outputs]]})}),e.jsx("p",{className:"hint pad",children:"图片、视频、时长分别统计；未知不记为零，也不计为人工合格。"})]})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"机器配置与状态"}),e.jsx("span",{className:"hint",children:"按 Worker ID 区分，名称相同不合并"})]}),e.jsx("p",{className:"notice hint",children:"配置为当前或最后上报信息，不代表历史执行快照，也不是最低采购配置。系统可见内存不是标称容量，多卡显存不相加。"}),e.jsx("div",{id:"workers",className:"worker-grid",children:t&&n&&(n.workers.length?n.workers.map(i=>{const r=i.hardware,l=["offline","disabled"].includes(i.state)||!ee(i.last_seen)||Date.now()/1e3-i.last_seen>120;return e.jsxs("article",{className:"worker","data-worker-id":i.id,children:[e.jsx("h3",{children:H(i.name)}),e.jsxs("p",{className:"hint",children:["Worker ID：",i.id]}),e.jsx("span",{className:"badge",children:vt[i.state]||i.state}),e.jsxs("p",{className:l?"warn":"hint",children:["最后心跳：",ln(i.last_seen),l?"；状态 / 配置快照已过期或无法确认，请勿视为实时。":""]}),e.jsx(yd,{items:[["GPU",r?.gpus?.length?r.gpus.map((c,u)=>`GPU ${u+1}：${H(c.name)} / 单卡显存 ${rn(c.memory_total_bytes)}`).join(`
`):"未知"],["GPU 数量",r?.gpus?.length?L(r.gpus.length):"未知"],["CPU",gn(r?.cpu,"cpu")],["内存",rn(r?.memory_total_bytes)],["系统",gn(r?.os,"os")],["环境",H(r?.environment_id)],["模型版本",H(r?.model_version)],["主机 ID",H(r?.host_id)],["磁盘",H(r?.disk)],["配置备注",H(r?.note)]]}),e.jsxs("p",{className:"hint",children:["配置来源：",On(i.hardware_source),"。人工补录不回写历史快照。"]}),e.jsxs("p",{children:["任务 ",L(i.tasks)," / 完成 ",L(i.done)," / 失败 ",L(i.error)," / 取消"," ",L(i.canceled)]}),e.jsxs("p",{className:"hint",children:["累计 runtime：",be(i.runtime_seconds)]}),i.id&&i.state!=="historical"?e.jsxs("details",{className:"profile-details",children:[e.jsx("summary",{children:"补录机器配置（人工声明）"}),e.jsx("p",{className:"hint",children:"7 个字段仅保存非空新声明，不回写历史快照。"}),e.jsx("button",{type:"button",onClick:()=>s(i),children:"查看 / 补录配置"})]}):e.jsx("p",{className:"hint",children:"历史执行端未关联现存注册记录，不能补录配置。"})]},i.id)}):e.jsx("p",{className:"empty",children:"暂无执行端信息；无法关联的历史任务不会按名称猜测机器。"}))})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"业务规格分组"}),e.jsx("span",{className:"hint",children:"原始统计保留失败、取消与异常记录"})]}),e.jsx("div",{id:"machine-groups",children:t&&n&&e.jsx(Ks,{groups:n.groups,report:n})})]})]})}const Nd={mode:"historical",quality:"technical",availability:1,utilization:.75},We=[{id:"zimage_t2i",type:"生图模式",label:"文生图",capabilities:["zimage_t2i","krea2_t2i","qwen_image_2512_t2i","qwen_image_21_t2i"]},{id:"zimage_i2i",type:"生图模式",label:"图生图",capabilities:["zimage_i2i","krea2_i2i","qwen_image_edit_2511_i2i","qwen_image_21_multi","qwen_image_21_i2i"]},{id:"flux2_klein_storyboard9",type:"生图模式",label:"多宫格故事分镜",capabilities:["flux2_klein_storyboard9"]},{id:"flux2_klein_edit",type:"生图模式",label:"参考图编辑(保人物)",capabilities:["flux2_klein_edit"]},{id:"minimax_h3_character_transfer",type:"生视频模式",label:"H3人物迁移",capabilities:["minimax_h3_character_transfer"]},{id:"minimax_h3_flf2v",type:"生视频模式",label:"H3 图生视频",capabilities:["minimax_h3_i2v","minimax_h3_flf2v"]},{id:"minimax_h3_talk2",type:"生视频模式",label:"H3 说话唱歌",capabilities:["minimax_h3_talk1","minimax_h3_talk2"]},{id:"minimax_h3_ref4",type:"生视频模式",label:"H3图片参考",capabilities:["minimax_h3_ref4"]},{id:"minimax_h3_comic20",type:"生视频模式",label:"漫剧4宫格",capabilities:["minimax_h3_comic20"]},{id:"minimax_h3_fusion_v2",type:"生视频模式",label:"H3无损融合单采V2",capabilities:["minimax_h3_fusion_v2"]},{id:"minimax_h3_fusion_v3",type:"生视频模式",label:"H3无损融合单采V3",capabilities:["minimax_h3_fusion_v3"]},{id:"minimax_h3_ref9",type:"生视频模式",label:"H3全能参考",capabilities:["minimax_h3_ref9"]},{id:"minimax_h3_ref_2pass",type:"生视频模式",label:"H3全能参考(高质量)",capabilities:["minimax_h3_ref_2pass"]}],rt=n=>We.find(t=>n!==void 0&&t.capabilities.includes(n)),$d=n=>JSON.stringify(n.source==="standard"?[n.config_id||null,n.source,n.benchmark_id||`unknown:${n.id}`]:[n.config_id||null,n.source]),Sd=n=>ee(n.mean_seconds)&&n.mean_seconds>0&&ee(n.measured)&&n.measured>0;function Vn(n,t){return n.workers.some(s=>s.id===t&&Re(s))?n.groups.filter(s=>s.worker_id===t&&["historical","captured","standard"].includes(s.source)&&rt(s.capability)&&Sd(s)):[]}const Xs=(n,t)=>n<t?-1:n>t?1:0;function Cd(n,t){return(t.measured||0)-(n.measured||0)||(t.samples||0)-(n.samples||0)||(t.last_sample_at||0)-(n.last_sample_at||0)||(t.mean_seconds||0)-(n.mean_seconds||0)||Xs(n.id,t.id)}function zd(n,t){const s=new Map;for(const r of t){const l=$d(r);s.set(l,[...s.get(l)||[],r])}const a=[];for(const[r,l]of s){const c=[];for(const u of n){const d=We.find(v=>v.id===u.mode_id),m=l.filter(v=>d?.capabilities.includes(v.capability)).sort(Cd)[0];m&&c.push(m)}c.length===n.length&&a.push({key:r,groups:c,measured:c.reduce((u,d)=>u+(d.measured||0),0)})}a.sort((r,l)=>l.measured-r.measured||Xs(r.key,l.key));const i=a[0];if(!i)throw Error("所选模式没有同一电脑、同一配置和来源的共同实测记录，请减少模式或换一台电脑");return i.groups}function Ed(n,t,s,a,i,r){if(!n.workers.some(d=>d.id===s&&Re(d)))throw Error("所选电脑当前不在线，请刷新后重新选择。");const l=Vn(n,s),c=new Set;for(const d of r){const m=We.find(v=>v.id===d.mode_id);if(!m||!l.some(v=>m.capabilities.includes(v.capability)))throw Error("所选模式没有成功耗时记录，请换一个模式或电脑。");if(c.has(d.mode_id))throw Error("同一模式请合并每日需求，不能重复选择。");if(c.add(d.mode_id),!ee(Number(d.quantity))||Number(d.quantity)<=0)throw Error("每日需求必须是大于零的有限任务数量。")}if(!r.length)throw Error("请至少添加一个有样本的业务模式。");const u=zd(r,l);return Ls.parse({...t,...Nd,worker_id:s,hours:Number(a),...i!==""?{price:Number(i)}:{},demands:r.map((d,m)=>{const v=u[m];if(!v)throw Error("原组证据缺失");return{group_id:v.id,quantity:Number(d.quantity)}})})}const Qs=[{key:"host_id",label:"主机 ID",maxLength:160},{key:"cpu",label:"CPU 型号",maxLength:160},{key:"memory_total_bytes",label:"系统可见内存（GiB）"},{key:"environment_id",label:"执行环境版本",maxLength:160},{key:"model_version",label:"模型版本",maxLength:160},{key:"disk",label:"磁盘配置说明",maxLength:160},{key:"note",label:"配置备注",maxLength:500}];function lt(n,t){if(Array.from(n).some(s=>s.charCodeAt(0)<32||s.charCodeAt(0)===127))throw Error(t)}function Pd(n,t){const s={};for(const{key:a}of Qs){const i=(n[a]||"").trim();if(i)if(lt(i,"配置字段请使用不含控制字符的单行文本。"),a==="memory_total_bytes"){const r=Math.round(Number(i)*1073741824);if(!Number.isSafeInteger(r)||r<=0)throw Error("内存必须是能转换为安全正整数字节的 GiB 数值。");r!==t?.[a]&&(s[a]=r)}else i!==(a==="cpu"?gn(t?.cpu,"cpu"):t?.[a])&&(s[a]=i)}if(!Object.keys(s).length)throw Error("没有需要保存的修改；留空不会删除已有配置。");return Fs.parse(s)}function Md(n){const t=n.accepted===""?null:Number(n.accepted);if(t!==null&&(!Number.isSafeInteger(t)||t<0))throw Error("请输入非负整数，或留空表示未验收。");const s=(n.benchmark_id||"").trim(),a=(n.note||"").trim();if(n.source==="standard"&&!s)throw Error("标准样本需要填写标准场景编号；标签不代表自动验证。");return lt(a,"验收备注和标准场景编号请使用单行文本，不含换行或控制字符。"),lt(s,"验收备注和标准场景编号请使用单行文本，不含换行或控制字符。"),Os.parse({accepted:t,source:n.source,benchmark_id:s,note:a})}function Id(n){let t=n==null?"":typeof n=="object"?JSON.stringify(n):String(n);return/^[\s]*[=+\-@]/.test(t)&&(t="'"+t),'"'+t.replace(/"/g,'""')+'"'}function Td(n){return"\uFEFF"+[["类别","内容"],["测算口径","历史任务运行参考，不是合格日产能"],["输入与时间范围",n.payload],["当前机器配置（非历史快照）",n.hardware],["测算结果",n.result],...n.groups.map(s=>["场景证据",{...s,warnings:kt(s)}])].map(s=>s.map(Id).join(",")).join(`\r
`)}function qd({worker:n,controller:t,onClose:s}){const[a,i]=p.useState({});return e.jsx(xe,{title:n.state==="historical"?"历史执行端配置":`机器配置与人工补录 · ${n.name||n.id}`,className:"capacity-page",onClose:s,submitLabel:n.state==="historical"?"关闭":"保存人工配置",onSubmit:n.state==="historical"?async()=>{}:async()=>{const r=Pd(a,n.hardware);try{await t.saveProfile(n.id,r)}catch(l){throw Error(`保存失败：${de(l)}。输入已保留，请检查字段后重试。`)}},children:n.state==="historical"?e.jsx("p",{children:bn(n.hardware)}):e.jsxs("div",{className:"capacity-operation",children:[e.jsxs("details",{children:[e.jsx("summary",{children:"当前 / 最后上报配置"}),e.jsx("p",{children:bn(n.hardware)}),e.jsxs("p",{children:["配置来源：",On(n.hardware_source),"；配置备注：",H(n.hardware?.note)]})]}),e.jsx("p",{className:"notice",children:"仅保存本次修改的非空字段；留空保留原值。内存以 GiB 输入、按字节保存，不是采购标称容量。新声明仅向后生效，不回写历史快照。"}),e.jsx("p",{className:"hint",children:"主机 ID 仅在人工确认属于同一物理机器时填写相同值，不按机器名称合并；同机多个 Worker 不自动代表多倍产能。"}),e.jsx("div",{className:"profile-form",children:Qs.map(({key:r,label:l,maxLength:c})=>e.jsxs("label",{className:"field",children:[e.jsx("span",{children:l}),e.jsx("input",{name:r,type:r==="memory_total_bytes"?"number":"text",min:r==="memory_total_bytes"?"0.000001":void 0,step:r==="memory_total_bytes"?"any":void 0,maxLength:c,placeholder:["model_version","environment_id"].includes(r)?"填写固定版本，勿用 latest / main / unknown":"留空保留现值",value:a[r]||"",onChange:u=>{i({...a,[r]:u.target.value}),t.invalidateEstimate("机器配置输入已更改；请保存后重新计算，未保存内容不会进入测算。")}})]},r))})]})})}function Dd({detail:n,controller:t,onClose:s}){const[a,i]=p.useState({accepted:ee(n.review?.accepted)?String(n.review.accepted):"",source:n.review?.source==="standard"?"standard":"business",benchmark_id:n.review?.benchmark_id||"",note:n.review?.note||""}),r=(l,c)=>{i({...a,[l]:c}),t.invalidateEstimate("人工验收输入已变更；未保存内容不会进入测算。")};return e.jsx(xe,{title:`人工验收 · ${n.job_id}`,className:"capacity-page",onClose:s,submitLabel:"保存人工标记",onSubmit:async()=>{const l=Md(a);try{await t.saveReview(n.job_id,l)}catch(c){throw Error(`保存失败：${de(c)}`)}},children:e.jsxs("div",{className:"review-form",children:[e.jsxs("p",{children:["任务 ",n.job_id,"；原采集来源：",Ie(n.source),"。"]}),e.jsxs("div",{className:"review-fields",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"人工合格产物数量（留空为未验收）"}),e.jsx("input",{name:"accepted",type:"number",min:"0",step:"1",value:a.accepted,onChange:l=>r("accepted",l.target.value)})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"人工样本标签"}),e.jsxs("select",{name:"source",value:a.source,onChange:l=>r("source",l.target.value),children:[e.jsx("option",{value:"business",children:"业务样本"}),e.jsx("option",{value:"standard",children:"标准样本（人工声明）"})]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"标准场景编号（标准样本请填写）"}),e.jsx("input",{name:"benchmark_id",maxLength:100,value:a.benchmark_id,onChange:l=>r("benchmark_id",l.target.value)})]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"验收备注 / 固定条件说明"}),e.jsx("textarea",{name:"note",rows:2,maxLength:500,value:a.note,onChange:l=>r("note",l.target.value)})]}),e.jsx("p",{className:"notice",children:"此操作只保存人工声明，不会自动确认技术规格、缓存条件或标准测试通过；不会将历史记录补写为完整采集证据。"})]})})}function Ad({confirmation:n,onClose:t}){return e.jsx(xe,{title:`确认受控补采 · ${n.detail.job_id}`,className:"capacity-page",onClose:t,submitLabel:"确认本批补采",onSubmit:n.submit,children:e.jsxs("div",{className:"capacity-operation",children:[e.jsxs("p",{className:"notice",children:["任务 ",n.detail.job_id,"；本批偏移 ",n.offset,"，最多处理 4 个可信最终产物。"]}),e.jsx("p",{children:"补采仅添加成品尺寸证据，不修改技术资格、原生成参数、人工合格量或标准标签。最终清单由服务端核验；不会扫描目录，也不会从请求猜测尺寸。"}),e.jsxs("details",{children:[e.jsx("summary",{children:"本页已记录的最终产物（最终以服务端可信清单为准）"}),e.jsx("pre",{children:H(n.detail.outputs)})]})]})})}function Rd({detail:n,controller:t,onConfirm:s}){const[a,i]=p.useState(0),[r,l]=p.useState(""),[c,u]=p.useState(!1),d=p.useRef(!0),m=p.useRef(!1),v=p.useRef(0);p.useEffect(()=>(d.current=!0,()=>{d.current=!1}),[]);const h=async(g,y)=>{if(!d.current||!t.probeCurrent(y)||v.current!==g)throw Error("证据页面或批次已变化，请关闭后重新打开。");if(m.current)throw Error("正在补采，请勿重复提交。");m.current=!0,u(!0),l("正在补采本批成品尺寸…"),t.invalidateEstimate("成品尺寸正在补采，旧测算已清除。");try{const x=await t.probe(n.job_id,g);if(!d.current)return;v.current=x.next_offset,i(x.next_offset),l(`本批处理 ${L(x.processed)} 个，成功记录尺寸 ${L(x.recorded)} 个；可信最终产物共 ${L(x.total)} 个。${x.next_offset===null?"补采已完成，刷新看板查看结果。":"尚有后续产物，请点击继续补采；刷新看板查看结果。"}`)}catch(x){const S=`补采失败：${de(x)}${x instanceof es&&x.status===409?"。没有可信最终产物记录，不能猜测成品尺寸。":""}`;throw d.current&&l(S),Error(S)}finally{m.current=!1,d.current&&u(!1)}};return e.jsxs("div",{className:"output-probe",children:[e.jsx("p",{className:"hint",children:"仅按可信最终产物清单补采，每次最多 4 个；不会从输入素材或请求参数猜测尺寸。"}),e.jsx("button",{type:"button",disabled:c||a===null,onClick:()=>{if(m.current||a===null||!d.current)return;const g=a,y=t.probeVersion();s({detail:n,offset:g,submit:()=>h(g,y)})},children:a===null?"补采已完成":a>0?"继续补采成品尺寸":"补采成品尺寸"}),e.jsx("p",{className:"hint",role:"status",children:r})]})}function Ld({detail:n,report:t,controller:s,onReview:a,onProbe:i}){const[r,l]=p.useState(!1);return e.jsxs("details",{className:"evidence","data-job-id":n.job_id,onToggle:c=>{c.currentTarget.open&&l(!0)},children:[e.jsxs("summary",{children:[e.jsx("strong",{children:n.job_id}),e.jsx("span",{className:"badge",children:Ie(n.source)}),e.jsx("span",{children:` ${vt[n.status]||n.status} / ${n.capability} / ${Nt(n.worker_id,n.worker_name,t.workers,t.groups)} / ${ln(n.created_at)}`})]}),e.jsx("div",{className:"evidence-content",children:r&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["任务 runtime：",be(n.runtime_seconds),"；占机：",be(n.occupied_seconds),"；原分组：",H(n.group_id)]}),e.jsx(Bn,{values:n.warnings}),e.jsx("div",{className:"f-grid3",children:[["输入素材",Un(n).join(" / ")],["生成参数",Wn(n,!0)],["技术与人工口径","技术资格以原采集证据及服务端校验为准；尺寸补采与人工标签不修改它。"]].map(([c,u])=>e.jsxs("div",{children:[e.jsx("h3",{children:c}),e.jsx("p",{children:u})]},c))}),e.jsx(In,{title:"执行尝试（包含重试）",value:n.attempts}),e.jsx("h3",{children:"实际输出证据"}),n.outputs?.length?e.jsx($t,{headers:["产物标识","类型","实际尺寸","视频时长","技术记录"],children:n.outputs.map((c,u)=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("span",{children:c.key||c.id||"未记录"})}),e.jsx("td",{children:e.jsx("span",{children:H(c.kind)})}),e.jsx("td",{children:e.jsx("span",{children:hd(c)})}),e.jsx("td",{children:e.jsx("span",{children:be(c.duration)})}),e.jsx("td",{children:e.jsx("span",{children:c.valid===!0?"采集记录标记有效":c.valid===!1?"未通过 / 待确认":"未记录"})})]},u))}):e.jsx("p",{className:"notice",children:"最终产物清单未记录；不能按请求猜测，也不按零产物处理。"}),e.jsx(In,{title:"实际输出原始证据",value:n.outputs}),e.jsxs("p",{children:["人工合格数量：",L(n.review?.accepted),"；样本标签：",vd(n),"；标准场景编号：",H(n.review?.benchmark_id),"；备注：",H(n.review?.note)]}),e.jsx(Zs,{resolution:n.output_resolution}),e.jsx(In,{title:"成品尺寸原始证据",className:"output-resolution-raw",value:{output_resolution:n.output_resolution,recovered_outputs:n.recovered_outputs}}),n.status==="done"&&e.jsx(Rd,{detail:n,controller:s,onConfirm:i}),["captured","standard"].includes(n.source)?e.jsx("button",{className:"review-open",type:"button",onClick:()=>a(n),children:"人工验收 / 样本标签"}):e.jsx("p",{className:"hint",children:"历史任务不能补写为完整采集证据，不提供采集验收表单。"})]})})]})}function Fd({controller:n,onReview:t,onProbe:s}){const a=n.getSnapshot(),{report:i,evidence:r,filters:l,ready:c}=a,u=a.mounted.has("evidence")&&i!==null,d=!c||r.busy||r.failed||!u;return e.jsxs("section",{"aria-labelledby":"evidence-heading",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{id:"evidence-heading",children:"任务证据与人工标记"}),e.jsx("span",{id:"detail-count",className:"hint",children:u&&(r.failed?"筛选未完成":r.busy?"":`当前 ${r.records.length} / 总计 ${L(r.total)} 条；聚合不受分页截断`)})]}),e.jsx("p",{className:"hint pad",children:"明细每页最多 100 条。人工验收 / 标准样本是人工声明，不等于系统自动验证通过；历史记录不可补写为完整采集证据。"}),e.jsx("div",{id:"evidence-filters",children:u&&e.jsxs("div",{className:"evidence-filters",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"独立原分组（按真实 group_id）"}),e.jsxs("select",{id:"evidence-group",disabled:!c,value:l.group,onChange:m=>n.filter({group:m.target.value}),children:[e.jsx("option",{value:"",children:"全部原分组"}),i.groups.map(m=>e.jsx("option",{value:m.id,children:`${nn(m)} / ${Nt(m.worker_id,m.worker_name,i.workers,i.groups)} / ${Ie(m.source)} / ${m.config_id||"配置未知"} / ${m.id}`},m.id))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"任务状态"}),e.jsxs("select",{id:"evidence-status",disabled:!c,value:l.status,onChange:m=>n.filter({status:m.target.value}),children:[e.jsx("option",{value:"",children:"全部状态"}),[["done","已完成"],["error","失败"],["canceled","已取消"],["queued","排队中"],["running","运行中"]].map(([m,v])=>e.jsx("option",{value:m,children:v},m))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"采集来源"}),e.jsxs("select",{id:"evidence-source",disabled:!c,value:l.source,onChange:m=>n.filter({source:m.target.value}),children:[e.jsx("option",{value:"",children:"全部来源"}),["historical","captured","standard"].map(m=>e.jsx("option",{value:m,children:Ie(m)},m))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"每页最多 100 条"}),e.jsx("select",{id:"evidence-size",disabled:!c,value:l.size,onChange:m=>n.filter({size:Number(m.target.value)}),children:[100,50,25,10].map(m=>e.jsxs("option",{value:m,children:[m," 条 / 页"]},m))})]})]})}),e.jsx("p",{id:"evidence-state",className:"hint pad",role:"status",hidden:!r.state,children:r.state}),e.jsx("div",{id:"details",children:u&&!r.busy&&!r.failed&&(r.records.length?r.records.map(m=>e.jsx(Ld,{detail:m,report:i,controller:n,onReview:t,onProbe:s},m.job_id)):e.jsx("p",{className:"empty",children:"当前页没有任务证据。可立即刷新，或返回上一页。"}))}),e.jsxs("div",{className:"pager",children:[e.jsx("button",{id:"previous",disabled:d||r.start===0,onClick:()=>n.page(-1),children:"上一页"}),e.jsx("span",{id:"page-note",className:"hint",children:u&&!r.busy&&!r.failed&&`第 ${Math.floor(r.start/r.size)+1} 页`}),e.jsx("button",{id:"next",disabled:d||r.start+r.size>=r.total,onClick:()=>n.page(1),children:"下一页"})]})]})}function Od(n,t){const s=n.workers.filter(Re);return s.find(a=>a.id===t)?.id||s.find(a=>Vn(n,a.id).length)?.id||s[0]?.id||""}function Qt(n,t,s){const a=Vn(n,t);return{id:s,mode_id:We.find(i=>a.some(r=>i.capabilities.includes(r.capability)))?.id||"",quantity:""}}function Ud(n,t,s){const[a,i]=p.useState({report:null,worker:"",demands:[],next:1}),[r,l]=p.useState("8"),[c,u]=p.useState("");if(s&&t&&t!==a.report){const w=Od(t,a.worker);i({report:t,worker:w,demands:[Qt(t,w,a.next)],next:a.next+1})}const d=t?Vn(t,a.worker):[],m=()=>n.invalidateEstimate(),v=w=>{t&&(i({...a,worker:w,demands:[Qt(t,w,a.next)],next:a.next+1}),m())},h=(w,f)=>{i({...a,demands:a.demands.map(k=>k.id===w?{...k,...f}:k)}),m()},g=w=>{i({...a,demands:a.demands.filter(f=>f.id!==w)}),m()},y=w=>{const f=We.find(k=>k.id===w);return!!(f&&d.some(k=>f.capabilities.includes(k.capability)))};return{inputs:a,groups:d,hours:r,price:c,worker:v,update:h,remove:g,available:y,add:()=>{if(!n.getSnapshot().ready)return;const w=We.find(f=>!a.demands.some(k=>k.mode_id===f.id)&&y(f.id));w&&(i({...a,demands:[...a.demands,{id:a.next,mode_id:w.id,quantity:""}],next:a.next+1}),m())},submit:async()=>{n.invalidateEstimate("正在计算…");const w=n.getSnapshot().snapshot;try{if(!t||!n.getSnapshot().ready||!w)throw Error("请先点击立即刷新并成功读取证据。");await n.estimate(Ed(t,w.range,a.worker,r,c,a.demands))}catch(f){n.estimateFailure(de(f))}},setHours:w=>{l(w),m()},setPrice:w=>{u(w),m()}}}function Wd(n){const[t,s]=p.useState("");return p.useEffect(()=>{if(!n)return;const a=URL.createObjectURL(new Blob([Td(n)],{type:"text/csv;charset=utf-8"}));return s(a),()=>URL.revokeObjectURL(a)},[n]),n?t:""}function Bd({saved:n,report:t}){const{result:s,payload:a,groups:i}=n;return e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"warn",children:"成功任务处理参考，不是合格产物日产量或采购承诺"}),e.jsxs("p",{className:"result-number",children:["参考机器数：",L(s.machines)," 台"]}),e.jsxs("p",{children:["每日所需参考运行时间：",be(s.total_seconds)]}),e.jsxs("p",{children:["单机每日可用容量时间：",be(s.daily_capacity_seconds)]}),e.jsxs("p",{children:["整机采购小计：",ee(s.price_total)?`¥${L(s.price_total)}`:"未计价"]}),e.jsx($t,{headers:["业务模式","每日需求","平均任务耗时","单机场景参考日处理量"],children:s.lines.map((r,l)=>{const c=rt(i.find(u=>u.id===r.group_id)?.capability);return e.jsxs("tr",{children:[e.jsx("td",{className:"wide",children:e.jsx("span",{children:c?`${c.type} · ${c.label}`:"业务模式"})}),e.jsx("td",{children:e.jsxs("span",{children:[L(r.quantity)," 任务/天"]})}),e.jsx("td",{children:e.jsx("span",{children:be(r.seconds_per_unit)})}),e.jsx("td",{children:e.jsxs("span",{children:[L(r.daily_units)," 任务/天"]})})]},l)})}),e.jsx("p",{className:"hint",children:"每个模式只参考自动选中的一个实测分组，不保证任意模型、尺寸或缓存规格的产能。"}),e.jsxs("details",{children:[e.jsx("summary",{children:"计算依据"}),e.jsx("h3",{children:"警告与覆盖限制"}),e.jsx(Bn,{values:s.warnings}),e.jsx("p",{className:"hint",children:"仅按成功任务平均 runtime 估算；不含完整失败、准备、重试或质量损耗。按同一电脑、配置和来源选择具体原分组，不合并均值。"}),e.jsx("p",{className:"hint",children:"台数 = 向上取整〔各模式任务数量 × 平均任务耗时之和 ÷（小时 × 3600 × 可用时间比例 × 生产容量比例）〕。容量预留不是 GPU 利用率；业务组合与模型切换可能增加损耗，不保证峰值 SLA。"}),a.demands.map(r=>{const l=i.find(c=>c.id===r.group_id);return l&&e.jsxs("div",{children:[e.jsx("h3",{children:rt(l.capability)?.label||"业务模式"}),e.jsxs("p",{children:[Us(l)," / ",H(l.spec_key),"：",Ie(l.source),"；样本"," ",L(l.samples),"；",L(yt(l))," 天；配置 ",H(l.config_id),l.source==="standard"?`；标准场景编号 ${H(l.benchmark_id)}`:""]}),e.jsx(Ys,{g:l})]},l.id)}),e.jsx("h3",{children:"计算假设"}),e.jsx("pre",{children:H(s.assumptions)}),e.jsxs("p",{className:"hint",children:["Worker ID：",a.worker_id,"；当前在线仅为本次数据快照，不承诺未来状态；当前配置仅作清单参考：",bn(t.workers.find(r=>r.id===a.worker_id)?.hardware),"；时间：全部历史 至 ",ln(a.to),"；",a.hours," 小时 / 可用"," ",L(a.availability*100),"% / 生产容量 ",L(a.utilization*100),"%"]})]})]})}function Vd({controller:n}){const t=n.getSnapshot(),{report:s,ready:a,estimate:i,estimateError:r,estimateNote:l,estimating:c}=t,u=t.mounted.has("purchase")&&s!==null,d=Ud(n,s,u),{inputs:m,groups:v}=d,h=p.useRef(null),g=Wd(i),y=s?.workers.filter(Re)||[],x=!a||!v.length||!m.demands.length||c,S=a?y.some(w=>w.id===m.worker)?v.length?"":"这台电脑暂无这些模式的成功耗时记录，请换一台电脑。":"当前没有在线电脑，请稍后刷新。":"请先刷新并读取电脑状态。";return e.jsxs("div",{className:"procurement",children:[e.jsxs("section",{className:"section",children:[e.jsx("div",{className:"section-head",children:e.jsx("h2",{children:"每日多场景需求"})}),e.jsxs("form",{id:"estimate-form",className:"pad",onSubmit:w=>{w.preventDefault(),w.currentTarget.reportValidity()&&d.submit()},children:[e.jsxs("div",{className:"form-grid",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"电脑显卡配置选择"}),e.jsx("select",{id:"estimate-worker",required:!0,disabled:!a,value:m.worker,onChange:w=>{a&&d.worker(w.target.value)},children:u&&(y.length?y.map(w=>e.jsx("option",{value:w.id,children:w.name||"未命名电脑"},w.id)):e.jsx("option",{value:"",children:"暂无在线电脑"}))})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"每日计划生产小时"}),e.jsx("input",{id:"hours",type:"number",min:"0.1",max:"24",step:"0.1",value:d.hours,required:!0,onChange:w=>d.setHours(w.target.value)})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"整机报价（元，可选）"}),e.jsx("input",{id:"price",type:"number",min:"0",step:"0.01",placeholder:"未填写则不计价格",value:d.price,onChange:w=>d.setPrice(w.target.value)})]})]}),e.jsx("p",{id:"mode-note",className:"notice",children:"按成功任务平均执行耗时参考，不是合格产物日产量或采购承诺。"}),e.jsx("p",{className:"hint",children:"固定按 100% 可用时间、75% 生产容量计算（预留 25% 应对波动）；每日数量按任务/天填写。"}),e.jsxs("div",{children:[e.jsx("h3",{children:"每日需求"}),e.jsx("p",{id:"demand-note",className:"hint",role:"status",children:u&&S}),e.jsx("div",{id:"demands",children:u&&m.demands.map(w=>e.jsxs("div",{className:"demand",children:[e.jsx("select",{className:"demand-group",required:!0,"aria-label":"需求业务模式",disabled:!a||!w.mode_id,value:w.mode_id,onChange:f=>{a&&d.update(w.id,{mode_id:f.target.value})},children:["生图模式","生视频模式"].map(f=>e.jsx("optgroup",{label:f,children:We.filter(k=>k.type===f).map(k=>e.jsxs("option",{value:k.id,disabled:!d.available(k.id)||m.demands.some(z=>z.id!==w.id&&z.mode_id===k.id),children:[k.type," · ",k.label]},k.id))},f))}),e.jsx("input",{className:"demand-quantity",type:"number",min:"0.01",step:"any",required:!0,placeholder:"任务/天","aria-label":"每日需求数量（任务/天）",disabled:!a||!w.mode_id,value:w.quantity,onChange:f=>d.update(w.id,{quantity:f.target.value})}),e.jsx("button",{type:"button",onClick:()=>d.remove(w.id),children:"移除"})]},w.id))}),e.jsx("button",{id:"add-demand",type:"button",disabled:!u||!a||!We.some(w=>!m.demands.some(f=>f.mode_id===w.id)&&d.available(w.id)),onClick:d.add,children:"增加场景"})]}),e.jsx("button",{id:"estimate-submit",className:"primary",type:"submit",disabled:!u||x,children:"计算机器需求"})]})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"测算结果与依据"}),e.jsx("button",{id:"export-estimate",disabled:!i||!g,onClick:()=>{n.getSnapshot().estimate&&h.current?.click()},children:"导出测算 CSV"}),e.jsx("a",{ref:h,hidden:!0,href:g||void 0,download:"capacity-estimate.csv",children:"下载测算 CSV"})]}),e.jsx("div",{id:"estimate-error",className:"error",role:"alert",hidden:!r,children:r}),e.jsx("div",{id:"estimate-result",className:"pad","aria-live":"polite",children:i&&s?e.jsx(Bd,{saved:i,report:s}):e.jsx("p",{className:"muted",children:l})})]})]})}const Ze=[{id:"machines",label:"机器产能"},{id:"scenarios",label:"场景对比"},{id:"purchase",label:"采购测算"}];function Hd(n){const{controller:t,state:s}=cd(n),{report:a,ready:i,revision:r,mounted:l}=s,[c,u]=p.useState(!1),[d,m]=p.useState(""),[v,h]=p.useState(null),[g,y]=p.useState(null),[x,S]=p.useState(null),w=p.useRef(null),f=p.useRef(null),k=p.useRef([]),[z,R]=p.useState(!1);p.useEffect(()=>{z&&s.tab==="purchase"&&(f.current?.focus(),R(!1))},[z,s.tab]);const E=(b="")=>{t.getSnapshot().ready&&(t.showEvidence(b),w.current?.scrollIntoView({block:"start"}))},N=l.has("scenarios")&&a?jd(a.groups):[],A=N.some(([b])=>b===d)?d:N[0]?.[0]||"";a&&l.has("scenarios")&&d!==A&&m(A);const _=a?.overview||{};return e.jsxs("main",{id:"main-content",className:"page capacity-page",tabIndex:-1,children:[e.jsxs("header",{className:"page-header card",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"产能评估"}),e.jsx("p",{className:"subtitle",children:"真实任务与独立规格分组，查看机器产能、证据和每日需求。"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{id:"refresh-state",className:"state",role:"status",children:s.refreshState})})]}),e.jsx("div",{className:"header-actions",children:e.jsx("button",{id:"refresh",type:"button",onClick:()=>{t.load()},children:"立即刷新"})})]}),e.jsx("div",{id:"error",className:"error",role:"alert",hidden:!s.error,children:s.error}),e.jsx("div",{id:"write-status",className:"write-status",role:"status",hidden:!s.writeStatus,children:s.writeStatus}),e.jsx("div",{className:"tabs",role:"tablist","aria-label":"产能评估视图",children:Ze.map((b,C)=>e.jsx("button",{id:`tab-${b.id}`,role:"tab",type:"button",ref:$=>{k.current[C]=$},"aria-selected":s.tab===b.id,"aria-controls":`panel-${b.id}`,tabIndex:s.tab===b.id?0:-1,onClick:()=>t.activate(b.id),onKeyDown:$=>{const P=$.key==="ArrowRight"?(C+1)%Ze.length:$.key==="ArrowLeft"?(C+Ze.length-1)%Ze.length:$.key==="Home"?0:$.key==="End"?Ze.length-1:void 0;if(P===void 0)return;const q=Ze[P];q&&($.preventDefault(),t.activate(q.id),k.current[P]?.focus())},children:b.label},b.id))}),e.jsx("div",{id:"capacity-stats",className:"metrics","aria-label":"产能数据概览",children:a&&e.jsx(it,{items:[["当前在线电脑",a.workers.filter(Re).length],["真实任务记录",_.tasks],["独立原规格组",a.groups.length],["产物清单未知任务",_.unknown_outputs]]})}),e.jsxs("section",{id:"panel-machines",role:"tabpanel","aria-labelledby":"tab-machines",tabIndex:0,hidden:s.tab!=="machines",children:[e.jsxs("section",{id:"machine-summary","aria-label":"在线机器业务简览",children:[e.jsxs("div",{className:"summary-toolbar",children:[e.jsx("h2",{id:"online-count",children:a?`当前在线 ${a.workers.filter(Re).length} 台`:"当前在线 — 台"}),e.jsxs("label",{className:"offline-toggle",children:[e.jsx("input",{id:"include-offline",type:"checkbox",checked:c,disabled:!i,onChange:b=>{i&&u(b.target.checked)}}),"包含离线"]})]}),e.jsx("p",{className:"summary-note hint",children:"在线状态是当前状态；业务为全部历史记录中跑过的业务，不代表当前均可执行。平均生成时间仅计成功任务执行耗时，不含排队，非纯 GPU 耗时，也不是合格日产能。同一业务的任务规格、模型或采样条件不同，不能直接按耗时做性能排名。"}),e.jsx("div",{id:"summary-machines",children:l.has("machines")&&a&&e.jsx(wd,{report:a,ready:i,includeOffline:c,onProfile:h,onEvidence:E},`${r}-${c}`)}),e.jsxs("div",{className:"matrix-actions",children:[e.jsx("button",{type:"button",id:"open-purchase",onClick:()=>{t.activate("purchase"),R(!0)},children:"进入多模式采购测算"}),e.jsx("button",{type:"button",id:"open-evidence",disabled:!i,onClick:()=>E(),children:"展开全部任务证据"})]})]}),e.jsxs("details",{id:"technical-details",className:"section advanced",open:s.technicalOpen,onToggle:b=>t.technical(b.currentTarget.open),children:[e.jsx("summary",{children:"详细统计与机器配置"}),e.jsx(kd,{report:a,mounted:l.has("technical"),onProfile:h},r)]})]}),e.jsx("section",{id:"panel-scenarios",role:"tabpanel","aria-labelledby":"tab-scenarios",tabIndex:0,hidden:s.tab!=="scenarios",children:e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"同场景证据对比"}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"业务 / 精确规格 / 来源"}),e.jsx("select",{id:"scenario-filter",disabled:!i,value:A,onChange:b=>{i&&m(b.target.value)},children:l.has("scenarios")&&(N.length?N.map(([b,C])=>e.jsx("option",{value:b,children:C},b)):e.jsx("option",{value:"",children:"暂无场景"}))})]})]}),e.jsx("p",{className:"notice hint",children:"只并列相同业务、规格键与证据来源。历史配置、模型版本或缓存条件缺失时，不视为受控跑分；未测试的配置不能按显存或价格推算。"}),e.jsx("div",{id:"scenario-groups",children:l.has("scenarios")&&a&&e.jsx(Ks,{groups:a.groups.filter(b=>Hs(b)===A),report:a},`${r}-${A}`)})]})}),e.jsx("section",{id:"panel-purchase",ref:f,role:"tabpanel","aria-labelledby":"tab-purchase",tabIndex:0,hidden:s.tab!=="purchase",children:e.jsx(Vd,{controller:t})}),e.jsxs("details",{id:"task-evidence",ref:w,className:"section advanced",open:s.evidenceOpen,onToggle:b=>t.evidenceOpen(b.currentTarget.open),children:[e.jsx("summary",{children:"任务证据与人工标记"}),e.jsx(Fd,{controller:t,onReview:y,onProbe:S},r)]}),v&&e.jsx(qd,{worker:v,controller:t,onClose:()=>h(null)},v.id),g&&e.jsx(Dd,{detail:g,controller:t,onClose:()=>y(null)},g.job_id),x&&e.jsx(Ad,{confirmation:x,onClose:()=>S(null)})]})}const Gd=`:root {
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
`,Jd=`.permissions-page .permissions-grid {
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
`,Zd=`/* 页面样式只作用于产能主区及产能对话框，不覆盖共享侧栏。 */
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
`,Yd=`@scope (.admin-page) {
${Gd.replace(/:root\b/g,":scope").replace(/^body \{/m,":scope {").replace(/body\.admin-page\b/g,":scope").replace(/\.admin-page\b/g,":scope")}
${Jd.replace(/\.permissions-page\b/g,":scope.permissions-page")}
${Zd}
}`;function _n({page:n,children:t}){const s=ra();return p.useLayoutEffect(()=>{const a=document.body;return a.dataset.choukaPage=n,a.dataset.workspace=n,()=>{a.dataset.choukaPage===n&&delete a.dataset.choukaPage,a.dataset.workspace===n&&delete a.dataset.workspace}},[n]),p.useEffect(()=>{let a=!0;return s.auth.me().then(()=>{if(!a)return;const i=document.getElementById("account");i&&!i.childElementCount&&s.auth.mountAccount(i);for(const r of document.querySelectorAll("#workspace-nav a"))new URL(r.href).pathname===location.pathname?r.setAttribute("aria-current","page"):r.removeAttribute("aria-current")}).catch(()=>{}),()=>{a=!1}},[s,n]),e.jsxs(e.Fragment,{children:[e.jsx("style",{children:Yd}),e.jsx(Va,{page:n,workspace:!0,children:t})]})}function tp(){return e.jsx(_n,{page:"controller",children:n=>e.jsx(il,{...n})})}function sp(){return e.jsx(_n,{page:"permissions",children:n=>e.jsx(Ml,{...n})})}function ap(){return e.jsx(_n,{page:"skills",children:n=>e.jsx(oo,{...n})})}function ip(){return e.jsx(_n,{page:"costs",children:n=>e.jsx(Zc,{...n})})}function rp(){return e.jsx(_n,{page:"capacity",children:n=>e.jsx(Hd,{...n})})}export{rp as CapacityWorkspace,tp as ControllerWorkspace,ip as CostsWorkspace,sp as PermissionsWorkspace,ap as SkillsWorkspace};
