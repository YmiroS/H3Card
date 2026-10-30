import{HttpClient as Wr,reactExports as m,errorMessage as ee,jsxRuntimeExports as e,ApiError as Br}from"./http-DOrwCtZg.js";import{createSessionService as Hr,userSchema as Gr,LoadingRequest as Vr,jsonSchema as B,useWorkspaceRuntime as Kr}from"./main-SrzVfL49.js";import{object as R,number as H,boolean as J,_enum as Be,looseObject as V,string as C,literal as le,array as F,unknown as tr,union as ce,discriminatedUnion as Jr,NEVER as Xr,_null as ar,record as kn}from"./monitor-alerts-BXOid_Jf.js";import{reactDomExports as Yr}from"./index-BgVeoShv.js";const Zr=R({maintenance_active:J().optional(),comfy_online:J().optional(),sandbox:J().optional()}),Qr=R({online_users:H().finite().nonnegative()}),et=R({user:Gr});function nt({fetcher:n=window.fetch.bind(window),origin:r=window.location.origin,onExpired:t,onSandbox:a,onDenied:s=()=>{}}){let i=!1;const o=async(g,u)=>{const y=await n(g,u);return i||(y.headers.get("X-H3Card-Sandbox")==="local-copy"&&a(),y.status===403&&s()),y},l=new Wr(o,r,()=>{i||t()});let c,d;const p=new Set;return{http:l,session:Hr(l),health(){if(c)return c;const g=new AbortController;p.add(g);const u=window.setTimeout(()=>g.abort(),4e3);return c=l.read("/api/health",Zr,{cache:"no-store",signal:g.signal}).then(y=>(!i&&y.sandbox===!0&&a(),y)).finally(()=>{window.clearTimeout(u),p.delete(g),c=void 0}),c},presence(){return d??=l.json("/api/auth/presence","POST").then(g=>Qr.parse(g)).finally(()=>{d=void 0}),d},async savePhone(g){const u=g.trim();if(!/^1[3-9][0-9]{9}$/.test(u))throw new Error("请输入有效的 11 位中国大陆手机号");const y=et.parse(await l.json("/api/auth/phone","POST",{phone:u})).user;if(!y.phone)throw new Error("手机号尚未保存，请重试");return y},async changePassword(g,u,y){if(u.length<8)throw new Error("新密码至少需要 8 位");if(u!==y)throw new Error("两次输入的新密码不一致");await l.json("/api/auth/password","POST",{current_password:g,new_password:u})},dispose(){i=!0,p.forEach(g=>g.abort()),p.clear(),l.invalidate()}}}function rt(n,r){return!r&&n.phone===""}function Fn(n){return n==="admin"?null:n==="monitor"?"/monitor":"/"}function Ve(n){return n.maintenance_active!==!0?"clear":n.comfy_online===!0?"partial":"blocked"}function tt(n){const[r,t]=m.useState(null),[a,s]=m.useState(!1),[i,o]=m.useState(""),[l,c]=m.useState(0);m.useEffect(()=>{let u=!1,y=!1,_=()=>{};const j=()=>document.hidden?new Promise(f=>{const k=()=>{document.hidden&&!u||(document.removeEventListener("visibilitychange",k),f())};document.addEventListener("visibilitychange",k),_=()=>{document.removeEventListener("visibilitychange",k),f()}}):Promise.resolve(),v=()=>{u||(u=!0,h.dispose(),t(null),o("登录已失效，请重新登录"),n("/login"))},x=f=>{const k=Fn(f.role);return k?(u=!0,h.dispose(),t(null),n(k),!1):!0},h=nt({onExpired:v,onSandbox:()=>{u||s(!0)},onDenied:()=>{u||y||(y=!0,h.session.me().then(f=>{!u&&x(f.user)&&t(k=>k&&{...k,user:f.user,localTest:f.local_test===!0})}).catch(()=>{}).finally(()=>{y=!1}))}});return t(null),o(""),s(!1),(async()=>{try{const f=await h.session.me();if(u||!x(f.user)||(await j(),u))return;const k=await h.health().catch(()=>({}));u||t({user:f.user,localTest:f.local_test===!0,services:h,initialHealth:k})}catch(f){u||o(ee(f))}})(),()=>{u=!0,_(),h.dispose()}},[l,n]);const d=m.useCallback(()=>c(u=>u+1),[]),p=m.useCallback(u=>{const y=Fn(u.role);y?(r?.services.dispose(),t(null),n(y)):t(_=>_&&{..._,user:u})},[r,n]),g=m.useCallback(()=>{r?.services.dispose(),t(null),o("登录已失效，请重新登录"),n("/login")},[r,n]);return{session:r,sandbox:a,error:i,retry:d,updateUser:p,expire:g}}function at(n,r,t=!0){const[a,s]=m.useState(null),[i,o]=m.useState(()=>Ve(r)),[l,c]=m.useState(()=>Ve(r)!=="clear");return m.useEffect(()=>{if(!t)return;let d=!0,p=Ve(r),g;const u=()=>{g=window.setTimeout(()=>{d&&c(!1)},5e3)};p==="partial"&&u();const y=()=>{document.hidden||n.presence().then(h=>{d&&s(h.online_users)}).catch(()=>{})},_=()=>{document.hidden||n.health().then(h=>{if(!d)return;const f=Ve(h);f!==p&&(p=f,window.clearTimeout(g),o(f),c(f!=="clear"),f==="partial"&&u())}).catch(()=>{})};y();const j=window.setInterval(y,3e4),v=window.setInterval(_,5e3),x=()=>{document.hidden||(y(),_())};return document.addEventListener("visibilitychange",x),()=>{d=!1,window.clearTimeout(g),window.clearInterval(j),window.clearInterval(v),document.removeEventListener("visibilitychange",x)}},[n,r,t]),{online:a,maintenance:i,maintenanceVisible:l}}const st={dashboard:"M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1",costs:"M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2M14 11h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-2.5M12 17v1m0 -8v1",capacity:"M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14M4 20h14",permissions:"M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0M8 11v-4a4 4 0 1 1 8 0v4",teams:"M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0 -3 -3.85",refresh:"M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4",chevron:"M9 6l6 6l-6 6",external:"M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6M11 13l9 -9M15 4h5v5",logout:"M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2M9 12h12l-3 -3M18 15l3 -3",check:"M5 12l4 4l10 -10",info:"M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0 -18M12 11v6M12 7h.01",alert:"M12 9v4M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0M12 16h.01"};function Fe({name:n,className:r="",...t}){return e.jsx("svg",{className:`icon ${r}`,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.7,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",...t,children:e.jsx("path",{d:st[n]})})}const it="_application_gguf9_1",ot="_workspace_gguf9_12",lt="_sandbox_gguf9_15",dt="_navigation_gguf9_18",ct="_accountMenu_gguf9_225",pt="_infoRow_gguf9_281",mt="_dialog_gguf9_295",ut="_maintenance_gguf9_361",ht="_notifications_gguf9_409",xt="_notificationItem_gguf9_441",ft="_notificationHeading_gguf9_466",gt="_notificationIcon_gguf9_477",bt="_notificationMessage_gguf9_495",yt="_notificationLabel_gguf9_504",te={application:it,workspace:ot,sandbox:lt,navigation:dt,accountMenu:ct,infoRow:pt,dialog:mt,maintenance:ut,notifications:ht,notificationItem:xt,notificationHeading:ft,notificationIcon:gt,notificationMessage:bt,notificationLabel:yt},vt={error:"alert",warning:"alert",success:"check",status:"info"},jt={error:"错误",warning:"警告",success:"成功",status:"提示"},sr=m.createContext({notify:()=>{},registerModal:()=>()=>{}}),ir=()=>m.useContext(sr);function wt({children:n}){const[r,t]=m.useState([]),[a,s]=m.useState([]),i=m.useCallback(c=>(s(d=>[...d,c]),()=>s(d=>d.filter(p=>p!==c))),[]),o=m.useCallback(c=>{const d=typeof c=="string"?{message:c,tone:"status"}:c instanceof Error?{message:c.message,tone:"error"}:{message:c.message,tone:c.tone??"status"};t(p=>p.some(g=>g.message===d.message&&g.tone===d.tone)?p:[...p,d])},[]),l=a.at(-1)??document.body;return e.jsxs(sr.Provider,{value:{notify:o,registerModal:i},children:[n,r.length>0&&Yr.createPortal(e.jsx(_t,{notices:r,dismiss:c=>t(d=>d.filter(p=>p!==c)),clear:()=>t([])}),l)]})}function _t({notices:n,dismiss:r,clear:t}){const a=m.useRef(null);m.useEffect(()=>{const o=a.current;if(o?.isConnected)return o.showPopover?.(),()=>{o.isConnected&&o.hidePopover?.()}},[]);const s=o=>{const l=a.current?.contains(document.activeElement),c=a.current?.parentElement;o(),l&&queueMicrotask(()=>{(a.current?.querySelector("button")??c?.querySelector("[data-operation-status],button")??document.querySelector("main"))?.focus({preventScroll:!0})})},i=["error","warning","success","status"].find(o=>n.some(l=>l.tone===o))??"status";return e.jsxs("section",{id:"admin-notifications","data-tone":i,ref:a,popover:"manual",className:te.notifications,"aria-label":"操作通知",children:[e.jsxs("div",{className:te.notificationHeading,children:[e.jsx(Fe,{name:vt[i],className:te.notificationIcon}),e.jsx("strong",{children:"操作通知"}),e.jsx("button",{type:"button","aria-label":"关闭全部通知",onClick:()=>s(t),children:"全部关闭"})]}),n.map(o=>e.jsxs("div",{className:te.notificationItem,"data-tone":o.tone,children:[e.jsxs("p",{className:te.notificationMessage,role:o.tone==="error"?"alert":"status","aria-atomic":"true",children:[e.jsx("span",{className:te.notificationLabel,children:jt[o.tone]}),o.message]}),e.jsx("button",{type:"button","aria-label":`关闭通知：${o.message}`,onClick:()=>s(()=>r(o)),children:"×"})]},`${o.tone}:${o.message}`))]})}function ae({title:n,children:r,onClose:t,onSubmit:a,submitLabel:s="确认",className:i="",showFooter:o=!0,dismissible:l=!0,closeLabel:c,id:d}){const p=m.useId(),g=m.useRef(null),u=m.useRef(null),y=m.useRef(!1),_=m.useRef(!1),j=m.useRef(!1),[v,x]=m.useState(!1),[h,f]=m.useState(""),[k]=m.useState(()=>{const N=document.activeElement instanceof HTMLElement?document.activeElement:null;return{element:N,key:N?.dataset.focusKey}}),{registerModal:T}=ir();m.useLayoutEffect(()=>{const N=g.current;if(!N)return;_.current=!0;const M=k.element,b=k.key;N.showModal();const I=T(N);return document.body.classList.add("modal-open"),()=>{_.current=!1,N.querySelectorAll('input[type="password"]').forEach(z=>{z.value=""}),N.open&&N.close(),I();const D=()=>{if(document.querySelector("dialog[open]"))return;document.body.classList.remove("modal-open");const z=b?[...document.querySelectorAll("[data-focus-key]")].find(K=>K.dataset.focusKey===b):null,S=document.querySelector("main");S&&!S.hasAttribute("tabindex")&&(S.tabIndex=-1);const Z=K=>K?.isConnected&&(K.tabIndex>=0||K.hasAttribute("tabindex")||K.isContentEditable)&&!K.closest("[inert],[hidden]")&&!K.matches(':disabled,input[type="hidden"]');(Z(M)?M:Z(z)?z:S)?.focus({preventScroll:!0})};D(),queueMicrotask(D)}},[T,k]),m.useLayoutEffect(()=>{(v||h)&&u.current?.focus({preventScroll:!0})},[v,h]);const O=()=>{y.current||j.current||(j.current=!0,g.current?.querySelectorAll('input[type="password"]').forEach(N=>{N.value=""}),g.current?.open&&g.current.close(),t())},w=N=>{y.current&&(N.preventDefault(),N.stopPropagation())};return e.jsx("dialog",{id:d,ref:g,className:`f-operation-modal admin-dialog ${te.dialog} ${i}`,"aria-labelledby":p,tabIndex:-1,onCancel:N=>{N.preventDefault(),l&&O()},onClose:N=>{const M=N.currentTarget;if(!(!_.current||j.current||M.open)){if(y.current||!l){M.showModal(),y.current&&u.current?.focus({preventScroll:!0});return}O()}},onClick:N=>{if(N.target!==N.currentTarget||!l)return;const M=N.currentTarget.getBoundingClientRect();(N.clientX<M.left||N.clientX>M.right||N.clientY<M.top||N.clientY>M.bottom)&&O()},onKeyDown:N=>{if(N.stopPropagation(),N.key!=="Tab")return;const M=[...N.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(D=>!D.closest("[inert]")&&!D.hidden).sort((D,z)=>D.compareDocumentPosition(z)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1),b=M[0],I=M.at(-1);if(!b||!I){N.preventDefault(),u.current?.focus();return}N.shiftKey&&(document.activeElement===b||!M.includes(document.activeElement instanceof HTMLElement?document.activeElement:b))?(N.preventDefault(),I.focus()):!N.shiftKey&&(document.activeElement===I||!M.includes(document.activeElement instanceof HTMLElement?document.activeElement:I))&&(N.preventDefault(),b.focus())},children:e.jsxs("form",{"aria-busy":v||void 0,"data-busy":v?"true":void 0,onSubmit:async N=>{N.preventDefault();const M=N.currentTarget;if(!(y.current||!a||!M.reportValidity())){y.current=!0,x(!0),f("");try{await a(M),_.current&&(y.current=!1,O())}catch(b){_.current&&f(`${ee(b)}；输入已保留，可重试。`)}finally{y.current=!1,_.current&&x(!1)}}},children:[e.jsxs("header",{className:"f-dialog-head",children:[e.jsx("h2",{id:p,children:n}),l&&e.jsx("button",{type:"button",className:"close-button","data-cancel":"","aria-label":"关闭弹窗",disabled:v,onClick:O,children:"×"})]}),e.jsxs("div",{className:"f-dialog-body",children:[e.jsx("div",{"data-dialog-content":"",inert:v,onClickCapture:w,onKeyDownCapture:w,onInputCapture:w,onChangeCapture:w,children:r}),e.jsx("p",{ref:u,className:`f-status ${h?"danger":""}`,role:h?"alert":"status",tabIndex:-1,"data-operation-status":"",children:h||(v?"正在提交…":"")})]}),o&&e.jsxs("footer",{className:"f-dialog-foot",children:[e.jsx("button",{type:"button","data-cancel":"",disabled:v,onClick:O,children:c??(a?"取消":"知道了")}),a&&e.jsx("button",{type:"submit",className:"primary",disabled:v,children:v?"正在提交…":s})]})]})})}function kt({user:n,localTest:r,services:t,expire:a}){const[s,i]=m.useState(!1),[o,l]=m.useState(null),[c,d]=m.useState({}),[p,g]=m.useState(!1),u=m.useRef(!1),y=m.useRef(null),_=m.useRef(null),j=n.display_name?.trim()||n.username,v=()=>{i(!1),y.current?.focus({preventScroll:!0})};return m.useLayoutEffect(()=>{const x=_.current;if(x)if(s){const h=y.current?.getBoundingClientRect();h&&d({left:Math.max(8,Math.min(h.left,window.innerWidth-Math.min(260,window.innerWidth-16)-8)),bottom:Math.max(8,window.innerHeight-h.top+8),maxHeight:Math.max(44,h.top-16)}),x.showPopover?.(),x.querySelector("button")?.focus()}else x.hidePopover?.()},[s]),m.useEffect(()=>{if(!s)return;const x=()=>i(!1),h=f=>{f.target instanceof Node&&!_.current?.contains(f.target)&&!y.current?.contains(f.target)&&x()};return window.addEventListener("resize",x),document.addEventListener("pointerdown",h),()=>{window.removeEventListener("resize",x),document.removeEventListener("pointerdown",h)}},[s]),e.jsx("div",{id:"account",className:"account-bar",children:r?e.jsx("span",{className:"chip",children:"本地测试 · 免登录"}):e.jsxs(e.Fragment,{children:[e.jsxs("button",{ref:y,className:"account-trigger",type:"button","aria-label":`用户菜单：${j}`,"aria-haspopup":"menu","aria-expanded":s,"aria-controls":"account-menu","data-focus-key":"admin-account",onClick:()=>i(x=>!x),onKeyDown:x=>{(x.key==="ArrowDown"||x.key==="ArrowUp")&&(x.preventDefault(),i(!0))},children:[e.jsx("span",{className:"account-avatar","aria-hidden":"true",children:Array.from(j)[0]?.toUpperCase()||"?"}),e.jsx("span",{className:"account-name",children:j})]}),e.jsxs("div",{ref:_,id:"account-menu",className:`account-menu ${te.accountMenu}`,role:"menu","aria-label":"账号菜单",popover:"auto",hidden:!s,style:c,onToggle:x=>{x.newState==="closed"&&i(!1)},onKeyDown:x=>{if(x.stopPropagation(),x.key==="Escape"){x.preventDefault(),v();return}if(x.key==="Tab"){i(!1);return}if(!["ArrowDown","ArrowUp","Home","End"].includes(x.key))return;x.preventDefault();const h=[...x.currentTarget.querySelectorAll('[role="menuitem"]:not(:disabled)')],f=h.findIndex(T=>T===document.activeElement),k=x.key==="Home"?0:x.key==="End"?h.length-1:(f+(x.key==="ArrowDown"?1:-1)+h.length)%h.length;h[k]?.focus()},children:[e.jsxs("div",{className:"account-menu-heading",role:"presentation",children:[e.jsx("b",{children:j}),e.jsxs("small",{children:[n.username," · 管理员"]})]}),e.jsx("button",{type:"button",role:"menuitem",className:"account-action",onClick:()=>{v(),l("info")},children:"用户信息"}),e.jsx("button",{type:"button",role:"menuitem",className:"account-action",onClick:()=>{v(),l("password")},children:"修改密码"}),e.jsxs("button",{type:"button",role:"menuitem",className:"account-action danger",disabled:p,onClick:async()=>{if(!u.current){u.current=!0,g(!0),v();try{await t.session.logout()}catch{}finally{a()}}},children:[e.jsx(Fe,{name:"logout"}),"退出登录"]})]}),o==="info"&&e.jsx(ae,{title:"用户信息",className:"auth-dialog",onClose:()=>l(null),closeLabel:"关闭",children:e.jsx("dl",{className:"account-info",children:[["姓名 / 花名",n.display_name?.trim()||"未填写"],["用户名",n.username],["手机号",n.phone||"未填写"],["角色","管理员"],["用户 ID",n.id]].map(([x,h])=>e.jsxs("div",{className:te.infoRow,children:[e.jsx("dt",{children:x}),e.jsx("dd",{children:h})]},x))})}),o==="password"&&e.jsxs(ae,{title:"修改密码",className:"auth-dialog",onClose:()=>l(null),submitLabel:"保存",onSubmit:async x=>{const h=new FormData(x);await t.changePassword(String(h.get("current_password")??""),String(h.get("new_password")??""),String(h.get("confirm_password")??"")),a()},children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"当前密码"}),e.jsx("input",{name:"current_password",type:"password",autoComplete:"current-password",autoFocus:!0,required:!0})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"新密码（至少 8 位）"}),e.jsx("input",{name:"new_password",type:"password",autoComplete:"new-password",required:!0,minLength:8})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"再输一次新密码"}),e.jsx("input",{name:"confirm_password",type:"password",autoComplete:"new-password",required:!0,minLength:8})]}),e.jsx("p",{className:"auth-note",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。保存后需要重新登录。"})]})]})})}const Nt=n=>window.location.replace(n);function St({page:n,children:r,workspace:t=!1}){return e.jsx($t,{page:n,workspace:t,children:r})}function $t({page:n,children:r,workspace:t}){const{session:a,sandbox:s,error:i,retry:o,updateUser:l,expire:c}=tt(Nt);return!a&&!i&&t?e.jsx(Vr,{stage:"正在准备工作区"}):a?e.jsx(wt,{children:e.jsx(Ct,{page:n,workspace:t,user:a.user,localTest:a.localTest,services:a.services,initialHealth:a.initialHealth,sandbox:s,updateUser:l,expire:c,children:r})}):e.jsx("main",{id:"main",tabIndex:-1,children:i?e.jsxs("section",{role:"alert",children:[e.jsx("p",{children:i}),e.jsx("a",{href:"/login",children:"前往登录"}),e.jsx("button",{type:"button",onClick:o,children:"重试"})]}):e.jsx("p",{role:"status",children:"正在验证管理员会话…"})})}const zt=[{label:"工作区",links:[{key:"canvas",label:"画布",href:"/",icon:"dashboard"},{key:"director",label:"导演工作台",href:"/director",icon:"external"}]},{label:"管理",links:[{key:"teams",label:"项目组",href:"/teams",icon:"teams"},{key:"controller",label:"运行面板",href:"/controller",icon:"dashboard"},{key:"permissions",label:"账号与权限",href:"/admin/permissions",icon:"permissions"}]},{label:"统计",links:[{key:"costs",label:"费用评估",href:"/controller/costs",icon:"costs"},{key:"capacity",label:"产能统计",href:"/controller/capacity",icon:"capacity"}]}];function Ct({page:n,workspace:r,user:t,localTest:a,services:s,initialHealth:i,sandbox:o,children:l,updateUser:c,expire:d}){const{notify:p}=ir(),{online:g,maintenance:u,maintenanceVisible:y}=at(s,i,!r),_=m.useRef(!1),j=m.useRef(!1);m.useEffect(()=>{if(r)return;const h=document.body,f=h.dataset.workspace,k=h.classList.contains("admin-page");return h.classList.add("admin-page"),h.dataset.workspace=n,()=>{k||h.classList.remove("admin-page"),f===void 0?delete h.dataset.workspace:h.dataset.workspace=f}},[n,r]),m.useEffect(()=>{const h=document.body.dataset.adminSandbox;return o&&(document.body.dataset.adminSandbox="local-copy"),()=>{h===void 0?delete document.body.dataset.adminSandbox:document.body.dataset.adminSandbox=h}},[o]);const v=rt(t,a);m.useEffect(()=>{v&&(j.current=!1)},[v]);const x=u==="blocked"?"系统正在维护更新，当前暂无可用执行节点，请稍后再使用。":"部分节点正在维护更新，其他可用节点仍可正常使用。";return e.jsxs("div",{className:`admin-page ${n==="permissions"?"permissions-page":""} ${te.application} ${r?te.workspace:""}`,children:[e.jsx("a",{className:"skip-link admin-skip",href:n==="capacity"?"#main-content":"#main",children:"跳到主内容"}),!r&&e.jsxs("aside",{id:"workspace-nav","data-admin-sidebar":"","aria-label":"主导航",className:te.navigation,children:[e.jsxs("a",{className:"workspace-brand",href:"/","aria-label":"Chouka 创作空间",children:[e.jsx("img",{src:"/icon.png",alt:""}),e.jsxs("span",{children:["Chouka",e.jsx("small",{children:"创作空间"})]})]}),e.jsx("nav",{className:"workspace-links","aria-label":"工作区导航",children:zt.map(h=>e.jsxs("div",{className:"workspace-nav-group",role:"group","aria-label":h.label,children:[e.jsx("div",{className:"workspace-nav-label","aria-hidden":"true",children:h.label}),h.links.map(f=>e.jsxs("a",{className:"workspace-link",href:f.href,title:f.label,"aria-label":f.label,"aria-current":n===f.key?"page":void 0,children:[e.jsx(Fe,{name:f.icon}),e.jsx("span",{children:f.label})]},f.key))]},h.label))}),e.jsxs("div",{className:"workspace-footer",children:[e.jsxs("div",{className:"workspace-presence",title:"Chouka 系统在线用户（近 90 秒活跃，按账号去重）","aria-live":"polite",children:[e.jsx("i",{"aria-hidden":"true"}),e.jsxs("span",{children:[e.jsx("b",{children:g??"--"})," 人在线"]})]}),e.jsx(kt,{user:t,localTest:a,services:s,expire:d})]})]}),!r&&y&&e.jsxs("div",{id:"maintenance-banner",className:te.maintenance,role:"status","aria-live":"polite","aria-atomic":"true","aria-label":"系统维护通知",children:[e.jsx("span",{className:"maintenance-banner-icon",children:e.jsx(Fe,{name:"alert"})}),e.jsx("div",{className:"maintenance-banner-ticker",children:e.jsx("div",{className:"maintenance-banner-track",children:[!1,!0].map(h=>e.jsx("span",{className:"maintenance-banner-message","aria-hidden":h||void 0,children:x},String(h)))})})]}),o&&e.jsx("div",{id:"sandbox-note",className:`notice-box admin-sandbox ${te.sandbox}`,role:"note",children:"本地隔离数据副本：本页用于本地验收，展示复制的业务数据，不代表正式服务的实时状态。"}),v?e.jsx("main",{id:n==="capacity"?"main-content":"main",tabIndex:-1,children:e.jsx("p",{role:"status",children:"请补充手机号后继续使用。"})}):l({http:s.http,user:t,sandbox:o,notify:p}),v&&e.jsx(ae,{id:"phone-dialog",title:"补充手机号",className:"auth-dialog phone-dialog",dismissible:!1,closeLabel:"退出登录",submitLabel:"保存并继续",onClose:()=>{j.current||_.current||(_.current=!0,s.session.logout().catch(()=>{}).finally(d))},onSubmit:async h=>{const f=await s.savePhone(String(new FormData(h).get("phone")??""));j.current=!0,c(f)},children:e.jsxs(m.Fragment,{children:[e.jsx("p",{id:"phone-note",className:"auth-note",children:"当前账号尚未填写手机号，请补充后继续使用。手机号仅本人和管理员可见，不用于短信验证或登录。"}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"手机号"}),e.jsx("input",{name:"phone",type:"tel",autoFocus:!0,inputMode:"numeric",autoComplete:"tel-national",required:!0,maxLength:11,pattern:"1[3-9][0-9]{9}",placeholder:"请输入 11 位中国大陆手机号","aria-describedby":"phone-note"})]})]})})]})}const or={idle:"空闲",busy:"运行中",syncing:"正在更新",offline:"离线",disabled:"已禁用",error:"异常",queued:"排队中",assigned:"已分配",running:"运行中",done:"已完成",canceled:"已取消",cancel_requested:"正在取消"},Et={idle:"尚未更新",pending:"等待空闲",running:"更新并重启中",done:"更新重启完成",error:"更新重启失败"},W=n=>(typeof n=="number"||typeof n=="string")&&n!==""&&Number.isFinite(Number(n))?Number(n):null,be=n=>W(n)==null?"未获取":String(n),lr=n=>{const r=W(n);return r==null?null:Math.max(0,Math.min(100,r))},$e=n=>{const r=W(n);return r==null?"未记录":new Date(r*1e3).toLocaleString("zh-CN",{hour12:!1})};function Nn(n){const r=W(n);return r==null||r<0?"未记录":r<60?`${Math.round(r)}秒`:r<3600?`${Math.floor(r/60)}分${Math.floor(r%60)}秒`:`${Math.floor(r/3600)}小时${Math.floor(r%3600/60)}分`}function Se(n){const r=W(n);return r==null?"未采集":r>=1024**3?`${(r/1024**3).toFixed(1)} GB`:r>=1024**2?`${(r/1024**2).toFixed(0)} MB`:`${Math.round(r/1024)} KB`}const Mt=n=>["idle","done"].includes(n||"")?"ok":["busy","syncing","running","queued","assigned","cancel_requested"].includes(n||"")?"warn":["offline","disabled","error","canceled"].includes(n||"")?"bad":"",He=n=>or[n||""]||n||"未知",Sn=n=>{if(me(n))return"主节点 · 无需同步";if(n.sync_action==="restart_services"||n.sync_action==="reboot_host"){const r=n.sync_action==="reboot_host"?"电脑重启":"服务重启",t=n.sync_status;return t==="pending"?`${r} · 等待节点接收`:t==="running"?`${r}中`:t==="done"?`${r}完成`:t==="error"?`${r}失败`:"未记录"}return Et[n.sync_status||""]||n.sync_status||"未记录"},me=n=>n.is_primary_node===!0,dr=n=>!me(n)&&["pending","running"].includes(n.sync_status||""),Xe=n=>!me(n)&&n.sync_status==="error",ne=n=>n.state!=="offline",cr=n=>typeof n=="number"||typeof n=="string"&&n.trim()?`Worker v${n}`:"Worker 版本未知",pr=n=>cr(n.capabilities?.agent_version),Pt=(n,r=Date.now())=>{const t=W(n?.health.server_time);return t==null||!n?r/1e3:t+(r-n.receivedAt)/1e3},$n=(n,r)=>{const t=W(n);return t==null?"未记录":`${Nn(Math.max(0,r-t))}前`};function zn(n,r,t){const a=W(n.capabilities?.telemetry?.collected_at);return!t&&ne(n)&&a!=null&&r-a<=60&&r-a>=-10}function rn(n){return ne(n)?n.enabled===!1||n.enabled===0||n.state==="disabled"?["已禁用接收","bad"]:dr(n)?[["restart_services","reboot_host"].includes(n.sync_action||"")?"维护期间不可接任务":"同步期间不可接任务","bad"]:n.comfy_online===!1||n.state==="error"?["不可接任务","bad"]:n.busy||n.current_job_id||n.state==="busy"?["正在占用","warn"]:n.state==="idle"&&n.comfy_online===!0?["可接任务","ok"]:["接收状态未知",""]:["不可接任务","bad"]}function Cn(n,r={}){const t=n.capability_comparison||{};if(r.status==="none")return{label:"未设置主节点基准",tone:"warn"};if(r.status==="ambiguous")return{label:"主节点不唯一",tone:"bad"};if(me(n)&&t.status==="primary")return{label:"主节点基准",tone:r.status==="stale"?"warn":"ok"};const a=t.missing_models?.length||0,s=t.missing_node_classes?.length||0,i=t.extra_models?.length||0,o=t.extra_node_classes?.length||0;let l,c="warn";return t.model_inventory_status==="unknown"?(l=["模型清单未知",s?`节点不全 · 缺 ${s} 个`:""].filter(Boolean).join("；"),s&&(c="bad")):t.status==="unknown"||!t.status?l="清单未知":a||s?(l=[a?`模型不全 · 缺 ${a} 个`:"",s?`节点不全 · 缺 ${s} 个`:""].filter(Boolean).join("；"),c="bad"):t.status==="stale"?l=i||o?"节点离线 · 主节点所需齐全，存在额外清单":"节点离线 · 最后清单一致":i||o?(l=`主节点所需齐全 · ${[i?`额外 ${i} 个模型`:"",o?`额外 ${o} 个节点`:""].filter(Boolean).join("；")}`,c="ok"):(l="清单一致",c="ok"),t.status==="stale"&&(a||s)&&(l=`节点离线 · 最后清单：${l}`),r.status==="stale"&&(l=`基准离线 · ${l}`),{label:l,tone:c}}function xn(n){const r=n.comparisonBaseline;if(r.status==="none")return"未设置主节点，无法比较";if(r.status==="ambiguous")return"检测到多个主节点，无法确定比较基准";const t=n.workers.find(a=>a.id===r.worker_id)?.name||r.worker_id||"未命名主节点";return`${r.status==="stale"?"主节点离线 · 最后清单":"在线主节点"} · ${t} · ${cr(r.agent_version)}`}function Ge(n){const r=n.capabilities;return r?.telemetry?.gpus?.length?r.telemetry.gpus:(r?.devices||[]).map((t,a)=>{const s=W(t.vram_total),i=W(t.vram_free);return{index:t.index??a,name:t.name||t.device_name||t.type,memory_total_bytes:s,memory_used_bytes:s!=null&&i!=null?Math.max(0,s-i):null,utilization_percent:null,temperature_c:null}})}function mr(n){if(n.capabilities?.telemetry?.memory)return n.capabilities.telemetry.memory;const r=n.capabilities?.system,t=W(r?.ram_total),a=W(r?.ram_free);return{total_bytes:t,used_bytes:t!=null&&a!=null?Math.max(0,t-a):null}}const ur=(n,r)=>r.projects.find(t=>t.id===n.project)?.name||n.projectName||(n.project?"项目已删除":"未归属项目"),fn=16e3;function Rt(n,r){const t=a=>a>0&&a<n.length&&n.charCodeAt(a)>=56320&&n.charCodeAt(a)<=57343?a-1:a;return n.slice(t(r*fn),t((r+1)*fn))}const U=ce([H().finite(),C().refine(n=>n===""||Number.isFinite(Number(n)))]).nullish(),A=C().nullish(),Ke=ce([J(),le(0),le(1)]).nullish(),It=V({used_bytes:U,total_bytes:U}),Lt=V({index:U,name:A,utilization_percent:U,memory_used_bytes:U,memory_total_bytes:U,temperature_c:U}),At=V({agent_version:ce([H(),C()]).nullish(),supports_service_restart:J().nullish(),supports_host_reboot:J().nullish(),node_classes:F(C()).nullish(),telemetry:V({hostname:A,collected_at:U,gpus:F(Lt).nullish(),memory:It.nullish()}).nullish(),devices:F(V({index:U,name:A,device_name:A,type:A,vram_total:U,vram_free:U})).nullish(),system:V({ram_total:U,ram_free:U}).nullish()}),On=V({name:A,node_class:A,input:A}),Tt=V({status:A,model_inventory_status:A,missing_node_classes:F(C()).nullish(),extra_node_classes:F(C()).nullish(),missing_models:F(On).nullish(),extra_models:F(On).nullish()}),Dt=V({status:A,worker_id:A,agent_version:ce([H(),C()]).nullish()}),Ft=V({id:C(),name:A,state:A,enabled:Ke,comfy_online:Ke,busy:Ke,current_job_id:A,last_seen:U,is_primary_node:Ke,sync_status:A,sync_action:A,sync_message:A,capability_comparison:Tt.nullish(),capabilities:At.nullish()}),hr=V({id:C(),status:A,history_only:J().optional(),permission:A,modelName:A,nodeName:A,card:A,name:A,cardName:A,project:A,projectName:A,progress:U,step:A,created:U,started:U,ended:U,worker_id:A,error:A,capability:A,submitter_display_name:A,submitter_username:A}),Ot=V({ok:J().nullish(),mode:A,online_workers:U,workers:U,server_time:U,started_at:U,comfy_online:J().nullish(),jobs:U,capabilities:U,sandbox:J().nullish(),llm:V({ok:J().nullish(),model:A}).nullish()}),qt=V({running_count:U,queued_count:U}),Ut=V({workers:F(Ft),comparison_baseline:Dt.nullish()}),Wt=V({jobs:F(hr)}),Bt=Be(["all","queued","running","done","error","canceled"]),Ht=V({jobs:F(hr),next_cursor:C().min(1).nullable(),has_more:J(),total:H().int().nonnegative()}).refine(n=>n.has_more===(n.next_cursor!==null),{message:"任务历史分页游标不完整"}),Gt=V({projects:F(V({id:C(),name:A}))}),Vt=V({worker_count:U,primary_count:U,skipped_count:U}),Kt=Be(["restart_services","reboot_host"]),Jt=V({ok:le(!0),worker_id:C().min(1),request_id:C().min(1),action:Kt}),Xt=V({ok:J().optional()}),pn=ce([H().finite(),C().refine(n=>n!==""&&Number.isFinite(Number(n)))]).transform(Number),qn=tr().transform(n=>(typeof n=="number"||typeof n=="string")&&n!==""&&Number.isFinite(Number(n))?Number(n):null),Yt=V({worker_id:A,gpu_index:U,minutes:U,server_time:U,from:pn,to:pn,gap_seconds:pn.pipe(H().positive()),points:F(V({at:qn,temperature_c:qn}))}).refine(n=>n.to>n.from,{message:"温度历史返回格式不完整"});function Zt(n){return{async history(r,t,a){const s=new URLSearchParams({limit:"50",status:r});return t!==null&&s.set("cursor",t),n.read(`/api/jobs/history?${s}`,Ht,{cache:"no-store",signal:a})},async snapshot(r,t=()=>{}){const a={cache:"no-store",signal:r},[s,i,o,l,c]=await Promise.all([n.read("/api/health",Ot,a).then(d=>(d.sandbox===!0&&!r.aborted&&t(),d)),n.read("/api/status",qt,a),n.read("/api/workers",Ut,a),n.read("/api/jobs",Wt,a),n.read("/api/projects",Gt,a)]);return{health:s,status:i,workers:o.workers,comparisonBaseline:o.comparison_baseline||{status:"none"},jobs:l.jobs,projects:c.projects,receivedAt:Date.now()}},async temperature(r,t,a,s){const i=await n.read(`/api/workers/${encodeURIComponent(r)}/temperature?gpu_index=${t}&minutes=${a}`,Yt,{cache:"no-store",signal:s});if(i.worker_id!=null&&i.worker_id!==r||i.gpu_index!=null&&W(i.gpu_index)!==t||i.minutes!=null&&W(i.minutes)!==a)throw new Error("温度历史与所选节点或范围不一致");return{...i,points:i.points.flatMap(o=>o.at!=null&&o.at>=i.from&&o.at<=i.to?[{...o,at:o.at,temperature_c:o.temperature_c}]:[]).sort((o,l)=>o.at-l.at)}},async deleteWorker(r,t,a){return a(),Xt.parse(await n.request(`/api/workers/${encodeURIComponent(r)}`,{method:"DELETE",signal:t}))},async restartWorker(r,t,a,s){s();const i=Jt.parse(await n.request(`/api/admin/workers/${encodeURIComponent(r)}/restart`,{method:"POST",signal:a,headers:{"Content-Type":"application/json"},body:JSON.stringify({action:t})}));if(i.worker_id!==r||i.action!==t)throw new Error("重启响应与所选节点或操作不一致");return i},async syncAll(r,t){return t(),Vt.parse(await n.request("/api/admin/workers/sync-all",{method:"POST",signal:r,headers:{"Content-Type":"application/json"},body:JSON.stringify({})}))}}}const Un=n=>({filter:n,jobs:[],initialized:!1,loadedPages:0,nextCursor:null,hasMore:!1,total:null,loading:null,error:"",failedAction:null});function mn(n,r){return(W(r.created)??0)-(W(n.created)??0)||(n.id<r.id?1:n.id>r.id?-1:0)}function Qt(n,r){const t=new Map(r.jobs.map(s=>[s.id,s])),a=r.jobs.reduce((s,i)=>!s||mn(i,s)>0?i:s,null);for(const s of n?.jobs||[]){const i=["queued","assigned","running","cancel_requested"].includes(s.status||"");(t.has(s.id)||i||a&&mn(s,a)<=0)&&t.set(s.id,s)}return[...t.values()].filter(s=>{const i=s.status==="assigned"?"queued":s.status==="cancel_requested"?"running":s.status;return r.filter==="all"||i===r.filter}).sort(mn)}class ea{constructor(r,t=!1){this.service=r,this.state={snapshot:null,history:Un("all"),stale:!1,loading:!1,error:"",isolated:t,mutation:null,deletingWorker:null,refreshed:0}}service;state;listeners=new Set;read=null;historyRead=null;historyEpoch=0;write=null;version=0;disposed=!1;start=()=>{this.disposed=!1,this.refreshAll()};refreshAll=()=>Promise.all([this.refresh(),this.refreshHistory()]);getSnapshot=()=>this.state;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});update(r){this.disposed||(this.state={...this.state,...r},this.listeners.forEach(t=>t()))}isolate=()=>{this.state.isolated||this.update({isolated:!0})};canMutate=()=>!this.disposed&&!!this.state.snapshot&&!this.state.stale&&!this.state.isolated&&!this.state.mutation;guard=()=>{if(this.disposed||!this.state.snapshot||this.state.stale||this.state.isolated)throw new Error("隔离副本或服务状态未就绪，禁止修改设备")};invalidateRead(){++this.version,this.read?.controller.abort(),this.read=null,this.update({loading:!1})}refresh=(r=!1)=>{if(this.disposed||this.state.mutation&&!r)return Promise.resolve();if(this.read)return this.read.promise;const t=++this.version,a=new AbortController;this.update({loading:!0});const s=this.service.snapshot(a.signal,this.isolate).then(i=>{this.disposed||a.signal.aborted||t!==this.version||this.update({snapshot:i,stale:!1,error:"",refreshed:this.state.refreshed+1,isolated:this.state.isolated||i.health.sandbox===!0})}).catch(i=>{this.disposed||a.signal.aborted||t!==this.version||(this.update({stale:!0,error:`读取中间层信息失败：${ee(i)}`}),a.abort())}).finally(()=>{t!==this.version||this.disposed||(this.read=null,this.update({loading:!1}))});return this.read={controller:a,promise:s},s};setHistoryFilter=r=>this.disposed?Promise.resolve():r===this.state.history.filter?this.refreshHistory():(++this.historyEpoch,this.historyRead?.controller.abort(),this.historyRead=null,this.update({history:Un(r)}),this.refreshHistory());refreshHistory=()=>this.readHistory("first");loadMore=()=>this.readHistory("more");retryHistory=()=>this.readHistory(this.state.history.failedAction||"first");readHistory(r){if(this.disposed)return Promise.resolve();if(this.historyRead)return this.historyRead.promise;const t=this.state.history;if(r==="more"&&(!t.initialized||!t.hasMore))return Promise.resolve();const a=r==="more"?t.nextCursor:null,s=this.historyEpoch,i=new AbortController;this.update({history:{...t,loading:r,error:"",failedAction:null}});const o=this.service.history(t.filter,a,i.signal).then(l=>{if(this.disposed||i.signal.aborted||s!==this.historyEpoch)return;if(r==="more"&&l.has_more&&l.next_cursor===a)throw new Error("任务历史游标未推进，请重试");const c=this.state.history,d=new Map(c.jobs.map(g=>[g.id,g]));for(const g of l.jobs)d.set(g.id,g);const p=r==="first"&&c.loadedPages>1;this.update({history:{...c,jobs:[...d.values()],initialized:!0,loadedPages:r==="more"?c.loadedPages+1:Math.max(1,c.loadedPages),total:l.total,nextCursor:p?c.nextCursor:l.next_cursor,hasMore:p?c.hasMore:l.has_more}})}).catch(l=>{this.disposed||i.signal.aborted||s!==this.historyEpoch||this.update({history:{...this.state.history,error:`读取任务历史失败：${ee(l)}`,failedAction:r}})}).finally(()=>{this.disposed||i.signal.aborted||s!==this.historyEpoch||(this.historyRead=null,this.update({history:{...this.state.history,loading:null}}))});return this.historyRead={controller:i,promise:o},o}async mutate(r,t,a){if(this.guard(),this.state.mutation)throw new Error("设备操作正在执行，请稍后重试");this.invalidateRead();const s=new AbortController;this.write=s,this.update({mutation:r,deletingWorker:t});try{const i=await a(s.signal);if(s.signal.aborted||this.disposed)throw new DOMException("操作已取消","AbortError");return await this.refresh(!0),i}catch(i){throw s.signal.aborted||(this.update({error:`${r==="delete"?"删除设备":r==="restart"?"提交重启":"更新节点"}失败：${ee(i)}`}),await this.refresh(!0)),i}finally{this.write=null,this.update({mutation:null,deletingWorker:null})}}deleteWorker=r=>this.state.snapshot?.workers.some(t=>t.id===r)?this.mutate("delete",r,t=>this.service.deleteWorker(r,t,this.guard)):Promise.reject(new Error("设备已移除"));restartWorker=(r,t)=>this.state.snapshot?.workers.some(a=>a.id===r)?this.mutate("restart",null,a=>this.service.restartWorker(r,t,a,this.guard)):Promise.reject(new Error("设备已移除"));syncAll=()=>this.mutate("sync",null,r=>this.service.syncAll(r,this.guard));dispose=()=>{this.disposed=!0,++this.version,this.read?.controller.abort(),this.write?.abort(),++this.historyEpoch,this.historyRead?.controller.abort(),this.historyRead=null,this.read=null,this.listeners.clear()}}function na({http:n,sandbox:r}){const t=m.useMemo(()=>Zt(n),[n]),a=m.useMemo(()=>new ea(t),[t]),s=m.useSyncExternalStore(a.subscribe,a.getSnapshot),[i,o]=m.useState(!0),l=m.useRef(i),[c,d]=m.useState(Date.now);return m.useLayoutEffect(()=>{l.current=i},[i]),m.useLayoutEffect(()=>{r&&a.isolate()},[r,a]),m.useEffect(()=>(a.start(),a.dispose),[a]),m.useEffect(()=>{const p=()=>{document.hidden||(d(Date.now()),l.current&&a.refreshAll())},g=window.setInterval(p,5e3);return document.addEventListener("visibilitychange",p),()=>{window.clearInterval(g),document.removeEventListener("visibilitychange",p)}},[a]),{state:s,store:a,service:t,automatic:i,setAutomatic:o,clock:c}}function en({name:n}){return e.jsx("svg",{className:"icon",viewBox:"0 0 24 24","aria-hidden":"true",focusable:"false",children:n==="refresh"?e.jsxs(e.Fragment,{children:[e.jsx("path",{d:"M20 7v5h-5M4 17v-5h5"}),e.jsx("path",{d:"M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 18 17"})]}):n==="chevron"?e.jsx("path",{d:"m9 5 7 7-7 7"}):e.jsxs(e.Fragment,{children:[e.jsx("path",{d:"m12 3 10 18H2L12 3Z"}),e.jsx("path",{d:"M12 9v4m0 3v1"})]})})}function se({children:n}){return e.jsx("span",{className:"cell-secondary",children:n})}function Wn({used:n,total:r,label:t}){const a=W(n),s=W(r),i=a!=null&&s!=null&&s>0?lr(a/s*100):null;return e.jsxs("div",{className:"resource-meter",children:[e.jsxs("span",{className:"small",children:[Se(a)," / ",Se(s)]}),i!=null&&e.jsx(xr,{value:i,label:t})]})}function xr({value:n,label:r}){return e.jsx("div",{className:"util-track",role:"meter","aria-label":r,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":n,children:e.jsx("i",{style:{width:`${n}%`}})})}function ra({value:n}){const r=W(n),t=lr(r==null?null:r*100);return e.jsxs("div",{className:"utilization",children:[e.jsx("span",{children:t==null?"未采集":`${Math.round(t)}%`}),t!=null&&e.jsx(xr,{value:t,label:"任务过程进度"})]})}function fr({worker:n,snapshot:r}){const t=r.jobs.find(a=>a.id===n.current_job_id);return t?e.jsxs(e.Fragment,{children:[t.cardName||t.name||"未命名卡片",e.jsx(se,{children:ur(t,r)}),e.jsx(se,{children:t.id})]}):n.current_job_id?e.jsxs(e.Fragment,{children:["任务详情暂未载入",e.jsx(se,{children:n.current_job_id})]}):dr(n)?e.jsxs(e.Fragment,{children:[Sn(n),e.jsx(se,{children:n.sync_message||"等待节点反馈"})]}):ne(n)?n.busy?e.jsxs(e.Fragment,{children:["ComfyUI 本地任务",e.jsx(se,{children:"非中间层派发"})]}):e.jsx(e.Fragment,{children:rn(n)[1]==="bad"?"不接收新任务":"当前无任务"}):e.jsx(e.Fragment,{children:"非实时"})}function gr({rows:n,className:r,id:t}){return e.jsx("dl",{id:t,className:r,children:n.map(([a,s])=>e.jsx(ta,{label:a,children:s},a))})}function ta({label:n,children:r}){return e.jsxs(e.Fragment,{children:[e.jsx("dt",{children:n}),e.jsx("dd",{children:r})]})}function aa({snapshot:n,items:r,now:t,onError:a}){const s=new Map(n?.workers.map(i=>[i.id,i.name])||[]);return e.jsx(e.Fragment,{children:r.length?r.map(i=>{const o=W(i.started),l=o==null?i.history_only?"耗时未记录":"尚未开始":i.history_only&&W(i.ended)==null?"耗时未记录":Nn((W(i.ended)??t)-o);return e.jsxs("tr",{children:[e.jsx("td",{className:Mt(i.status),children:He(i.status)}),e.jsxs("td",{className:"job-origin",children:[i.submitter_display_name?.trim()||i.submitter_username||"未记录提交人",e.jsx(se,{children:n?ur(i,n):i.projectName||"项目未记录"}),e.jsxs(se,{children:["卡片 · ",i.cardName||i.name||"未命名"]})]}),e.jsxs("td",{className:"job-mode",title:i.capability||void 0,children:[i.modelName||i.nodeName||i.name||i.capability||"未记录",e.jsx(se,{children:i.id})]}),e.jsxs("td",{children:[e.jsx(ra,{value:i.progress}),e.jsx(se,{children:i.step||"步骤未记录"})]}),e.jsx("td",{title:i.worker_id||void 0,children:i.nodeName?.trim()||(i.worker_id?s.get(i.worker_id)||"未知执行端":i.history_only?"未记录":"待分配")}),e.jsx("td",{children:$e(i.created)}),e.jsx("td",{children:i.error?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"danger f-job-error",title:i.error,children:i.error}),e.jsx("button",{type:"button",className:"link-button","data-job-error":i.id,"data-focus-key":`job-error:${i.id}`,onClick:()=>a(i),children:"查看完整错误"})]}):l})]},i.id)}):e.jsx("tr",{children:e.jsx("td",{colSpan:7,children:e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"暂无已加载任务"}),e.jsx("p",{children:"可更换任务状态；历史记录的加载结果见下方状态。"})]})})})})}class sa{constructor(r,t,a,s){this.service=r,this.id=t,this.gpu=a,this.minutes=s}service;id;gpu;minutes;state={data:null,loading:!1,error:""};listeners=new Set;request=null;version=0;getSnapshot=()=>this.state;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});update(r){this.state={...this.state,...r},this.listeners.forEach(t=>t())}load=async(r=!1)=>{if(r&&this.request)return;this.request?.abort();const t=new AbortController,a=++this.version;this.request=t,this.update({loading:!0,error:"",...r?{}:{data:null}});try{const s=await this.service.temperature(this.id,this.gpu,this.minutes,t.signal);if(t.signal.aborted||a!==this.version)return;this.update({data:s})}catch(s){if(t.signal.aborted||a!==this.version)return;this.update({data:null,error:ee(s)})}finally{a===this.version&&(this.request=null,this.update({loading:!1}))}};dispose=()=>{++this.version,this.request?.abort(),this.request=null}}function ia(n,r,t){const a=n.points.flatMap(d=>d.temperature_c==null?[]:[d.temperature_c]),s=Math.floor((Math.min(...a)-5)/10)*10,i=Math.ceil((Math.max(...a)+5)/10)*10,o=49,l=r-o-20,c=t-23-45;return{x:d=>o+(d-n.from)/(n.to-n.from)*l,y:d=>23+(i-d)/(i-s)*c,width:r,height:t,left:o,pw:l}}function oa(n){const r=[];let t=null;for(const a of n.points){if(a.temperature_c==null){t=null;continue}(t==null||a.at-t>n.gap_seconds)&&r.push([]),r[r.length-1]?.push({at:a.at,temperature_c:a.temperature_c}),t=a.at}return r}function la(n,r,t,a,s){if(a<70||s<50||!r.points.some(j=>j.temperature_c!=null))return null;const i=n.getContext("2d");if(!i)return null;const o=window.devicePixelRatio||1;n.width=Math.round(a*o),n.height=Math.round(s*o),i.setTransform(o,0,0,o,0,0),i.clearRect(0,0,a,s);const l=ia(r,a,s),{x:c,y:d,left:p,pw:g}=l,u=r.points.flatMap(j=>j.temperature_c==null?[]:[j.temperature_c]),y=Math.floor((Math.min(...u)-5)/10)*10,_=Math.ceil((Math.max(...u)+5)/10)*10;i.font='12px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',i.lineWidth=1,i.textAlign="right",i.textBaseline="middle";for(let j=0;j<=4;j++){const v=y+(_-y)*j/4,x=d(v);i.strokeStyle="#29313c",i.beginPath(),i.moveTo(p,x),i.lineTo(a-20,x),i.stroke(),i.fillStyle="#a0a6b1",i.fillText(`${Math.round(v)}°`,p-12,x)}i.textBaseline="top";for(let j=0;j<=4;j+=a<600?2:1){const v=new Date((r.from+(r.to-r.from)*j/4)*1e3),x=v.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:!1}),h=t===1440?v.toLocaleDateString("zh-CN",{month:"2-digit",day:"2-digit"})+" "+x:x;i.textAlign=j===0?"left":j===4?"right":"center",i.fillText(h,p+j/4*g,s-27)}i.strokeStyle="#38bdf8",i.lineWidth=2.3,i.lineJoin="round",i.beginPath();for(const j of oa(r))j.forEach((v,x)=>{x===0?i.moveTo(c(v.at),d(v.temperature_c)):i.lineTo(c(v.at),d(v.temperature_c))});i.stroke(),i.fillStyle="#38bdf8";for(const j of r.points)j.temperature_c!=null&&(i.beginPath(),i.arc(c(j.at),d(j.temperature_c),2.1,0,Math.PI*2),i.fill());return l}const da="_historyControls_181p8_1",ca="_page_181p8_7",pa="_workerDialog_181p8_10",ma="_workerActions_181p8_13",ua="_capabilities_181p8_21",ha="_temperatureDialog_181p8_30",Me={historyControls:da,page:ca,workerDialog:pa,workerActions:ma,capabilities:ua,temperatureDialog:ha};function xa({worker:n,workerId:r,service:t,now:a,stale:s,revision:i,onClose:o}){const l=n?Ge(n):[],[c,d]=m.useState(()=>({gpu:W(l[0]?.index)??0,minutes:30}));return e.jsx(ae,{title:n?.name||r,onClose:o,className:`temperature-dialog ${Me.temperatureDialog}`,showFooter:!1,children:e.jsx(fa,{worker:n,workerId:r,service:t,now:a,stale:s,revision:i,selection:c,onSelect:d})})}function fa({worker:n,workerId:r,service:t,now:a,stale:s,revision:i,selection:o,onSelect:l}){const{gpu:c,minutes:d}=o,p=m.useMemo(()=>new sa(t,r,c,d),[t,r,c,d]),g=m.useSyncExternalStore(p.subscribe,p.getSnapshot),{data:u,error:y,loading:_}=g,j=m.useRef(null),v=m.useRef(null),x=m.useRef(null),h=m.useRef(null),[f,k]=m.useState(null),T=m.useRef(i),O=n?Ge(n):[],w=O.find(z=>W(z.index)===c),N=(u?.points||[]).flatMap(z=>z.temperature_c==null?[]:[z.temperature_c]),M=n&&ne(n)?zn(n,a,s)?W(w?.temperature_c)??"未采集":"未采集":"非实时";m.useEffect(()=>(p.load(),p.dispose),[p]),m.useEffect(()=>{T.current!==i&&(T.current=i,p.load(!0))},[i,p]),m.useEffect(()=>{const z=j.current,S=v.current;if(!z||!S||!u)return;const Z=()=>{const{width:ie,height:ge}=S.getBoundingClientRect();h.current=la(z,u,d,ie,ge)},K=requestAnimationFrame(Z),Q=new ResizeObserver(Z);return Q.observe(S),()=>{cancelAnimationFrame(K),Q.disconnect(),h.current=null}},[u,d]);const b=f==null?void 0:u?.points[f],I=b?`${$e(b.at)} · ${b.temperature_c==null?"未采集":`${b.temperature_c}°C`}`:"";m.useEffect(()=>{const z=x.current,S=h.current;!z||!S||!b||(z.style.left=`${Math.max(8,Math.min(S.width-z.offsetWidth-8,S.x(b.at)+14))}px`,z.style.top=`${Math.max(8,Math.min(S.height-z.offsetHeight-8,b.temperature_c==null?20:S.y(b.temperature_c)-45))}px`)},[b,I]);const D=[["当前温度",M],["所选时段最高",N.length?Math.max(...N):u?"未采集":"未获取"],["所选时段最低",N.length?Math.min(...N):u?"未采集":"未获取"]];return e.jsxs("div",{className:"modal-shell",children:[e.jsx("header",{className:"modal-header",children:e.jsxs("div",{children:[e.jsx("p",{className:"eyeline",children:"显卡温度趋势"}),e.jsxs("p",{className:"muted","data-temp-description":!0,children:[w?.name||"型号未记录"," / ",n?He(n.state):"节点已移除"]})]})}),e.jsxs("div",{className:"chart-controls",children:[e.jsxs("label",{className:"inline-label",children:["显卡"," ",e.jsx("select",{"data-temp-gpu":!0,"aria-label":"选择显卡",value:c,onChange:z=>{k(null),l({...o,gpu:Number(z.target.value)})},children:O.length?O.map((z,S)=>e.jsxs("option",{value:z.index??0,children:["GPU ",z.index??0," · ",z.name||"未记录型号"]},`${z.index??S}:${S}`)):e.jsx("option",{value:0,children:"GPU 0 · 未采集配置"})})]}),e.jsx("div",{className:"segmented","data-temp-ranges":!0,"aria-label":"温度时间范围",children:[[30,"30 分钟"],[120,"2 小时"],[1440,"24 小时"]].map(([z,S])=>e.jsx("button",{type:"button","data-range":z,"aria-pressed":d===z,onClick:()=>{k(null),l({...o,minutes:z})},children:S},z))})]}),e.jsx("p",{className:"small muted",children:"仅展示真实采集记录；缺失区间不插值、不补造历史。当前温度需60秒内的新鲜遥测。"}),e.jsx("div",{className:"temperature-stats","data-temp-stats":!0,children:D.map(([z,S])=>e.jsxs("div",{className:"temperature-stat",children:[e.jsx("label",{children:z}),e.jsxs("strong",{children:[S,typeof S=="number"&&e.jsx("small",{children:" °C"})]})]},z))}),e.jsxs("div",{className:"chart-area",ref:v,children:[e.jsx("canvas",{ref:j,"data-temp-canvas":!0,hidden:!N.length,tabIndex:0,role:"img","aria-label":`GPU ${c}，${d}分钟真实温度历史，${N.length}个有效采集点；左右方向键查看。`,onPointerMove:z=>{const S=h.current;if(!S||!u?.points.length)return;const Z=u.from+Math.max(0,Math.min(1,(z.clientX-z.currentTarget.getBoundingClientRect().left-S.left)/S.pw))*(u.to-u.from);k(u.points.reduce((K,Q,ie)=>Math.abs(Q.at-Z)<Math.abs((u.points[K]?.at??Q.at)-Z)?ie:K,0))},onPointerLeave:()=>k(null),onKeyDown:z=>{!u?.points.length||!["ArrowLeft","ArrowRight","Home","End"].includes(z.key)||(z.preventDefault(),k(z.key==="Home"?0:z.key==="End"?u.points.length-1:Math.max(0,Math.min(u.points.length-1,(f??0)+(z.key==="ArrowRight"?1:-1)))))}}),e.jsx("div",{className:"empty-state","data-temp-empty":!0,hidden:N.length>0,role:"status",children:y?e.jsxs(e.Fragment,{children:[e.jsx("b",{children:"温度历史读取失败"}),e.jsx("p",{children:y}),e.jsx("button",{type:"button",onClick:()=>{k(null),p.load()},children:"重试读取"})]}):_||!u?e.jsx("b",{children:"正在读取温度历史…"}):e.jsxs(e.Fragment,{children:[e.jsx("b",{children:"暂无有效温度记录"}),e.jsx("p",{children:"未开始采集、旧版 Worker 未上报或驱动不支持；不显示 0°C。"})]})}),e.jsx("div",{ref:x,className:"chart-tooltip",hidden:!b||!N.length,role:"status",children:I})]}),e.jsxs("footer",{className:"modal-footer",children:[e.jsxs("span",{className:"chart-key",children:[e.jsx("i",{}),e.jsxs("span",{"data-temp-key":!0,children:["GPU ",c," 温度"]})]}),e.jsx("span",{"data-temp-note":!0,children:u?`${$e(u.from)} — ${$e(u.to)}${n&&!ne(n)?" · 离线，历史非实时":""}`:""}),e.jsx("span",{className:"keyboard-hint",children:"左右键查看采集点 · Esc关闭"})]})]})}function ga({capabilities:n}){const[r,t]=m.useState(null),[a,s]=m.useState(0),i=m.useRef(null),o=m.useRef(null),l=m.useRef(new Set),c=Math.max(1,Math.ceil((r?.length||0)/fn));m.useEffect(()=>{const g=l.current;return()=>{g.forEach(u=>URL.revokeObjectURL(u)),g.clear()}},[]);const d=g=>{s(g),(g===0||g===c-1)&&o.current?.focus({preventScroll:!0}),o.current&&(o.current.scrollTop=0,o.current.scrollLeft=0)},p=()=>{if(r==null)return;const g=URL.createObjectURL(new Blob([r],{type:"application/json;charset=utf-8"}));l.current.add(g);const u=document.createElement("a");u.href=g,u.download="worker-capabilities.json",u.click()};return e.jsxs("details",{className:Me.capabilities,"data-capabilities":!0,onToggle:g=>{g.currentTarget.open&&i.current==null&&(i.current=JSON.stringify(n,null,2),t(i.current))},children:[e.jsx("summary",{children:"完整能力与配置（最后上报，非实时配置证据）"}),r!=null&&e.jsxs("div",{children:[e.jsx("p",{className:"small muted",children:"按页查看完整快照；下载可获取全部 JSON，自动刷新不会改变当前快照。"}),e.jsxs("div",{className:"f-toolbar",children:[e.jsx("button",{type:"button","data-config-prev":!0,disabled:a===0,onClick:()=>d(a-1),children:"上一页"}),e.jsxs("span",{className:"small muted","data-config-page":!0,role:"status",children:["第 ",a+1," / ",c," 页"]}),e.jsx("button",{type:"button","data-config-next":!0,disabled:a===c-1,onClick:()=>d(a+1),children:"下一页"}),e.jsx("button",{type:"button","data-config-download":!0,onClick:p,children:"下载完整 JSON"})]}),e.jsx("pre",{ref:o,className:"capabilities-json",tabIndex:0,"aria-label":"当前页能力与配置",children:Rt(r,a)})]})]})}function Bn({items:n}){return n.length?e.jsx("ul",{className:"inventory-list",children:n.map((r,t)=>e.jsx("li",{children:r},`${t}:${r}`))}):e.jsx("p",{className:"muted small",children:"无"})}function Hn({items:n,unknown:r}){return r?e.jsx("p",{className:"muted small",children:"模型清单未知，无法判断"}):n.length?e.jsx("ul",{className:"inventory-list",children:n.map((t,a)=>e.jsxs("li",{children:[t.name||"未命名模型",e.jsxs("span",{children:[t.node_class||"未知节点"," · ",t.input||"未知输入"]})]},`${a}:${t.name}`))}):e.jsx("p",{className:"muted small",children:"无"})}function ba({worker:n,snapshot:r}){const t=n.capability_comparison||{},a=Cn(n,r.comparisonBaseline),s=t.model_inventory_status==="unknown",i=t.missing_node_classes||[],o=t.extra_node_classes||[],l=t.missing_models||[],c=t.extra_models||[];return["none","ambiguous"].includes(r.comparisonBaseline.status||"")||!t.status||t.status==="unknown"&&s&&!i.length&&!o.length?e.jsxs("section",{className:"inventory-audit",children:[e.jsx("h3",{children:"与主节点清单对比"}),e.jsxs("div",{className:"notice-box",children:[e.jsx("b",{className:a.tone,children:a.label}),e.jsxs("p",{children:[xn(r),"。旧版 Worker 或清单字段缺失时不会猜测为完整。"]})]})]}):e.jsxs("section",{className:"inventory-audit",children:[e.jsxs("div",{className:"inventory-heading",children:[e.jsx("h3",{children:"与主节点清单对比"}),e.jsx("span",{className:"f-chip inventory-chip","data-tone":a.tone,children:a.label})]}),e.jsxs("p",{className:"muted small",children:[xn(r),"；文件名、相对路径和版本均按精确值比较。"]}),e.jsxs("div",{className:"inventory-grid",children:[e.jsxs("div",{className:"inventory-block",children:[e.jsxs("h4",{children:["缺失节点类 ",e.jsx("span",{children:i.length})]}),e.jsx(Bn,{items:i}),e.jsxs("h4",{children:["缺失模型 ",e.jsx("span",{children:s?"未知":l.length})]}),e.jsx(Hn,{items:l,unknown:s})]}),e.jsxs("div",{className:"inventory-block",children:[e.jsxs("h4",{children:["额外节点类 ",e.jsx("span",{children:o.length})]}),e.jsx(Bn,{items:o}),e.jsxs("h4",{children:["额外模型 ",e.jsx("span",{children:s?"未知":c.length})]}),e.jsx(Hn,{items:c,unknown:s})]})]})]})}function ya({worker:n,snapshot:r,now:t,stale:a,restartUnavailable:s,onRestart:i,onClose:o}){const[l,c]=m.useState(null),[d,p]=m.useState(""),g=s||(a?"服务状态已过期，请刷新后重试。":me(n)?"主节点不支持远程重启。":ne(n)?["pending","running"].includes(n.sync_status||"")?"节点已有维护操作，请等待完成。":"":"节点已离线，无法提交重启。"),u=f=>g||(n.capabilities?.[f==="reboot_host"?"supports_host_reboot":"supports_service_restart"]!==!0?"当前 Worker 不支持此操作，请先更新 Worker。":""),y=n.capabilities||{},_=y.telemetry||{},j=mr(n),v=rn(n),x=Cn(n,r.comparisonBaseline),h=[["节点角色",me(n)?"主节点（不参与文件同步）":"执行节点"],["清单状态",e.jsx("span",{className:x.tone,children:x.label})],["比较基准",xn(r)],["主机",_.hostname||"未记录"],["ComfyUI",ne(n)?n.comfy_online===!0?"在线":n.comfy_online===!1?"不可用":"未获取":"非实时"],["任务接收",e.jsx("span",{className:v[1],children:v[0]})],["维护状态",Sn(n)],["维护消息",me(n)?"此节点已排除在批量文件同步之外":n.sync_message||"未记录"],["最后心跳",`${$e(n.last_seen)} / ${$n(n.last_seen,t)}`],["遥测时间",`${$e(_.collected_at)} · ${zn(n,t,a)?"新鲜采集":"非实时 / 未采集"}`],["节点能力",y.node_classes?`${y.node_classes.length} 个`:"未记录"],["当前任务",e.jsx(fr,{worker:n,snapshot:r})],["系统内存",`${Se(j.used_bytes)} / ${Se(j.total_bytes)}（最后上报）`]];return e.jsxs(e.Fragment,{children:[e.jsxs(ae,{title:`${n.name||n.id} · 节点详情`,onClose:o,className:Me.workerDialog,children:[e.jsxs("div",{className:Me.workerActions,role:"group","aria-label":"节点重启操作",children:[e.jsx("button",{type:"button",disabled:!!u("restart_services"),title:u("restart_services")||"重启 ComfyUI 和 Worker，不重启电脑",onClick:()=>c("restart_services"),children:"重启服务"}),e.jsx("button",{type:"button",className:"danger",disabled:!!u("reboot_host"),title:u("reboot_host")||"重启节点所在的整台电脑",onClick:()=>c("reboot_host"),children:"重启节点"})]}),e.jsx("p",{className:"muted small",children:g||(n.capabilities?.supports_service_restart!==!0&&n.capabilities?.supports_host_reboot!==!0?"当前 Worker 不支持远程重启，请先更新 Worker。":"重启服务仅重启 ComfyUI 和 Worker；重启节点将重启整台电脑。节点收到请求后立即执行，会中断当前任务，不等待空闲。")}),d&&e.jsx("p",{className:"notice-box",role:"status",children:d}),e.jsxs("div",{className:"f-tags",children:[e.jsx("span",{className:"f-chip",children:He(n.state)}),e.jsx("span",{className:"f-chip",children:pr(n)}),e.jsxs("span",{className:"f-chip",children:["Worker ID: ",n.id]})]}),e.jsx(gr,{rows:h,className:"f-definition"}),e.jsx(ba,{worker:n,snapshot:r}),e.jsx("div",{className:"f-grid2",children:Ge(n).map((f,k)=>e.jsxs("div",{className:"notice-box",children:[e.jsxs("b",{children:["GPU ",f.index??"未知"," · ",f.name||"未记录"]}),e.jsxs("p",{children:["最后上报：利用率"," ",W(f.utilization_percent)==null?"未采集":`${f.utilization_percent}%`,"；显存 ",Se(f.memory_used_bytes)," / ",Se(f.memory_total_bytes),"；温度"," ",W(f.temperature_c)==null?"未采集":`${f.temperature_c}°C`]})]},`${f.index??k}:${k}`))}),e.jsx(ga,{capabilities:y})]}),l&&e.jsxs(ae,{title:l==="reboot_host"?"重启节点电脑":"重启节点服务",submitLabel:l==="reboot_host"?"确认重启电脑":"确认重启服务",onClose:()=>c(null),onSubmit:async()=>{const f=u(l);if(f)throw new Error(f);await i(l),p(`${l==="reboot_host"?"电脑重启":"服务重启"}请求已提交，节点收到请求后立即执行，会中断当前任务；恢复状态以节点实际回报为准。`)},children:[e.jsxs("p",{children:["目标节点：",e.jsx("strong",{children:n.name||n.id})]}),e.jsx("div",{className:"notice-box",children:l==="reboot_host"?"此操作会重启该节点所在的整台 Windows 电脑，会强制关闭程序，未保存内容可能丢失，所有服务都会暂时离线。电脑恢复后，ComfyUI 和 Worker 是否自动启动取决于该电脑的启动配置。":"此操作只重启该节点的 ComfyUI 和 Worker 服务，不会重启 Windows 电脑，不同步文件或更新代码。"}),e.jsx("p",{children:"节点收到请求后立即执行，会中断当前任务，不等待空闲；提交后暂停向该节点分配新任务。请求已接收不代表重启已完成，请查看节点维护状态。"}),l==="reboot_host"&&e.jsxs("label",{className:"check-label",children:[e.jsx("input",{type:"checkbox",required:!0}),"我确认重启整台电脑，并已处理其他程序和未保存内容"]})]})]})}function va({snapshot:n,now:r,stale:t,mutationDisabled:a,deletingWorker:s,onDetails:i,onTemperature:o,onDelete:l}){return e.jsx(e.Fragment,{children:n.workers.length?n.workers.map(c=>{const d=c.capabilities?.telemetry||{},p=zn(c,r,t),g=Ge(c),u=mr(c),y=He(c.state),_=rn(c),j=Cn(c,n.comparisonBaseline),v=ne(c)?c.comfy_online===!0?"ComfyUI 在线":c.comfy_online===!1?"ComfyUI 不可用":"ComfyUI 未获取":"ComfyUI 非实时";return e.jsxs("tr",{className:ne(c)?"":"offline",children:[e.jsxs("td",{children:[e.jsx("strong",{children:c.name||d.hostname||"未命名执行端"}),me(c)&&e.jsx("span",{className:"f-chip",children:"主节点"}),e.jsx("span",{className:"f-chip worker-version",children:pr(c)}),e.jsx(se,{children:[d.hostname,c.id].filter(Boolean).join(" · ")})]}),e.jsxs("td",{className:"f-worker-status","data-worker-state":y,children:[e.jsx("span",{className:"f-chip",children:y}),e.jsx(se,{children:v}),e.jsx("span",{className:"cell-secondary f-reception","data-tone":_[1],children:_[0]})]}),e.jsx("td",{children:p?g.length?g.map((x,h)=>e.jsxs("div",{className:"f-gpu",children:[e.jsxs("span",{className:"small",children:["GPU ",x.index??"未知"," · ",x.name||"未记录型号"]}),e.jsxs("div",{className:"cell-secondary",children:["显存",e.jsx(Wn,{used:x.memory_used_bytes,total:x.memory_total_bytes,label:`GPU ${x.index??""} 显存`})]})]},`${x.index??h}:${h}`)):"未采集 GPU 指标":e.jsx("span",{className:"muted",children:ne(c)?"遥测未采集或已过期":"非实时，不沿用旧读数"})}),e.jsx("td",{children:ne(c)?g.length?g.map((x,h)=>e.jsxs("div",{className:"f-gpu",children:[p&&W(x.temperature_c)!=null?`${x.temperature_c}°C`:"未采集",e.jsxs(se,{children:["GPU ",x.index??"未知"]})]},`${x.index??h}:${h}`)):"未采集":"非实时"}),e.jsxs("td",{children:[p?e.jsx(Wn,{used:u.used_bytes,total:u.total_bytes,label:"系统内存"}):"非实时 / 未采集",e.jsx(se,{children:p?"系统可见容量":"最后配置见详情"})]}),e.jsx("td",{children:e.jsx(fr,{worker:c,snapshot:n})}),e.jsxs("td",{children:[e.jsx("span",{className:Xe(c)?"danger":"",title:me(c)?"主节点不参与文件同步":c.sync_message||void 0,children:Sn(c)}),e.jsx("span",{className:"f-chip inventory-chip","data-tone":j.tone,children:j.label}),e.jsxs("span",{className:"cell-secondary",title:c.last_seen==null?"未记录":new Date(Number(c.last_seen)*1e3).toLocaleString("zh-CN",{hour12:!1}),children:["心跳 ",$n(c.last_seen,r)]})]}),e.jsx("td",{children:e.jsxs("div",{className:"f-stack worker-actions",children:[e.jsx("button",{type:"button",className:"link-button","data-worker":c.id,"data-focus-key":`worker-details:${c.id}`,onClick:()=>i(c),children:"节点详情"}),e.jsx("button",{type:"button",className:"icon-button","data-temperature":c.id,"data-focus-key":`worker-temperature:${c.id}`,"aria-label":`查看 ${c.name||c.id} 温度趋势`,onClick:()=>o(c.id),children:e.jsx(en,{name:"chevron"})}),e.jsx("button",{type:"button",className:"link-button danger worker-delete","data-delete-worker":c.id,"data-focus-key":`worker-delete:${c.id}`,"aria-label":`删除设备 ${c.name||c.id}`,disabled:a,onClick:()=>l(c),children:s===c.id?"正在删除…":"删除设备"})]})})]},c.id)}):e.jsx("tr",{children:e.jsx("td",{colSpan:8,children:e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"还没有注册执行端"}),e.jsx("p",{children:"执行端注册并上报心跳后，将在此显示状态。"})]})})})})}function ja({snapshot:n,now:r,onDetails:t}){const a=n.workers.filter(s=>!ne(s)||Xe(s)||["disabled","error"].includes(s.state||""));return a.length?e.jsx(e.Fragment,{children:a.map(s=>e.jsxs("button",{type:"button",className:"attention-item","data-worker":s.id,"data-focus-key":`worker-attention:${s.id}`,onClick:()=>t(s),children:[e.jsxs("span",{className:"attention-top",children:[e.jsx("strong",{className:"danger",children:s.name||s.id}),e.jsx(en,{name:"chevron"})]}),e.jsx("b",{className:"danger",children:ne(s)?Xe(s)?"节点同步失败":He(s.state):"已离线"}),e.jsx("p",{children:ne(s)?Xe(s)&&s.sync_message?s.sync_message:`${rn(s)[0]}；查看完整节点详情。`:`最后心跳 ${$n(s.last_seen,r)}`})]},s.id))}):e.jsx("p",{className:"muted small",children:"当前没有需要关注的节点异常。"})}function wa(n){const{state:r,store:t,service:a,automatic:s,setAutomatic:i,clock:o}=na(n),{snapshot:l,stale:c,loading:d,error:p,isolated:g,mutation:u,deletingWorker:y}=r,[_,j]=m.useState(null),{history:v}=r,x=v.filter,h=Pt(l,Math.max(o,Date.now())),f=l?.health||{},k=l?.status||{},T=n.sandbox||g||c||!l||u!=null,O=()=>j(null),w=S=>{l&&j({kind:"worker",worker:S,snapshot:l})},N=S=>{if(n.sandbox||!t.canMutate()){n.notify({message:"当前不可更新：隔离副本或服务状态未就绪。",tone:"warning"});return}j(S)},M=()=>{if(n.sandbox||!t.canMutate())throw new Error("隔离副本或服务状态未就绪，禁止修改设备")},b=f.ok===!0?"运行正常":f.ok===!1?"异常":"状态未知",I=f.comfy_online===!0?"可用":f.comfy_online===!1?"不可用":"状态未知",D=[["运行模式",f.mode==="controller"?"Linux 中间层 / Controller":f.mode==="local"?"Windows 单机":f.mode||"未获取"],["可用能力",W(f.capabilities)==null?"未获取":`${f.capabilities} 项`],["任务记录",W(f.jobs)==null?"未获取":`${f.jobs} 条`],["大模型接口",f.llm?f.llm.ok?`已配置 · ${f.llm.model||"型号未记录"}`:"未配置":"未获取"],["页面地址",location.origin+"/controller"],["创作画布",location.origin+"/"]],z=Qt(l,v);return e.jsxs("main",{id:"main",className:Me.page,tabIndex:-1,"aria-busy":d?!0:void 0,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"运行面板"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{className:"subtitle",id:"service-subtitle",children:l?`中间层${b} / ComfyUI ${I}`:"正在读取中间层运行状态"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{className:"muted small",id:"refresh-state",role:"status",children:d?"正在读取…":c?"连接失败 · 快照非实时":l?`最后刷新 ${new Date(l.receivedAt).toLocaleTimeString("zh-CN",{hour12:!1})}`:"正在加载…"}),e.jsxs("label",{className:"check-label",children:[e.jsx("input",{id:"auto-refresh",type:"checkbox",checked:s,onChange:S=>i(S.target.checked)}),"每5秒刷新"]}),e.jsxs("button",{type:"button",className:"primary",id:"refresh",disabled:d||u!=null,onClick:()=>{t.refreshAll()},children:[e.jsx(en,{name:"refresh"}),"立即刷新"]}),e.jsx("button",{type:"button",id:"sync-all",disabled:T,title:n.sandbox||g?"本地隔离数据副本禁止节点同步，不能修改正式机器。":void 0,onClick:()=>N({kind:"sync"}),children:"一键更新全部节点"})]})]}),e.jsxs("div",{id:"error",className:"f-error",role:"alert",hidden:!p,children:[e.jsxs("div",{children:[e.jsx("b",{id:"error-message",children:p}),e.jsx("p",{children:"已载入内容仅为上次快照，不能作为实时状态；未知数据不记为零。"})]}),e.jsx("button",{type:"button",id:"retry",disabled:d||u!=null,onClick:()=>{t.refreshAll()},children:"重试读取"})]}),e.jsxs("section",{className:"metrics f-metrics6","aria-label":"运行概览",children:[e.jsx(je,{id:"service",label:"中间层服务",value:f.ok===!0?"运行正常":f.ok===!1?"异常":"未获取",compact:!0,tone:f.ok===!0?"ok":f.ok===!1?"bad":"",noteId:"service-mode",note:f.mode==="controller"?"Controller 模式":f.mode==="local"?"Windows 单机":f.mode||"等待服务响应"}),e.jsx(je,{id:"workers",label:"在线执行端",value:l?`${be(f.online_workers)} / ${be(f.workers)}`:"未获取",note:"含禁用与同步中的在线节点"}),e.jsx(je,{id:"running",label:"正在运行",value:be(k.running_count),note:"由中间层调度的任务"}),e.jsx(je,{id:"queued",label:"排队任务",value:be(k.queued_count),note:"等待可用执行端"}),e.jsx(je,{id:"comfy",label:"ComfyUI",value:f.comfy_online===!0?"可用":f.comfy_online===!1?"不可用":"未获取",compact:!0,tone:f.comfy_online===!0?"ok":f.comfy_online===!1?"bad":"",note:"单节点状态见下表"}),e.jsx(je,{id:"uptime",label:"服务运行时间",value:W(f.started_at)!=null&&W(f.server_time)!=null?Nn(Number(f.server_time)-Number(f.started_at)):"未获取",compact:!0,note:"本次中间层服务启动至今"})]}),e.jsxs("div",{className:"dashboard-grid",children:[e.jsxs("section",{className:"card","aria-labelledby":"workers-title",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"workers-title",children:"Windows 执行端"}),e.jsx("p",{className:"section-subtitle",children:"状态、任务接收、ComfyUI 与同步分开显示；多显卡不合并显存"})]}),e.jsx("span",{className:"muted small",id:"worker-count",children:l?`${l.workers.length} 台 / ${l.workers.filter(ne).reduce((S,Z)=>S+Ge(Z).length,0)} 张在线GPU`:"正在读取"})]}),e.jsx("div",{className:"table-wrap",children:e.jsxs("table",{className:"workers-table f-workers",children:[e.jsx("thead",{children:e.jsx("tr",{children:["执行端 / 主机","运行与接收状态","GPU / 显存","温度","系统内存","当前任务","同步 / 心跳","详情 / 趋势"].map(S=>e.jsx("th",{scope:"col",children:S},S))})}),e.jsx("tbody",{id:"worker-rows",children:l?e.jsx(va,{snapshot:l,now:h,stale:c,mutationDisabled:T,deletingWorker:y,onDetails:w,onTemperature:S=>j({kind:"temperature",id:S}),onDelete:S=>N({kind:"delete",worker:S})}):e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"loading-note",children:p?"执行端读取失败，请点击“重试读取”。":"正在读取执行端…"})})})]})}),e.jsx("p",{className:"table-note",children:"显存条按已用容量占总容量的真实比例显示；离线或过期读数不作实时数据。点击行末入口查看真实采集的温度历史。"})]}),e.jsxs("aside",{className:"right-column","aria-label":"需要关注及配置",children:[e.jsxs("section",{className:"card",children:[e.jsx("div",{className:"section-heading",children:e.jsxs("h2",{className:"heading-inline",children:[e.jsx("span",{className:"danger",id:"attention-icon",children:e.jsx(en,{name:"alert"})}),"需要关注"]})}),e.jsx("div",{className:"attention-list",id:"attention-list",tabIndex:0,role:"region","aria-label":"需要关注的节点列表",children:l?e.jsx(ja,{snapshot:l,now:h,onDetails:w}):e.jsx("p",{className:"muted small",children:p?"节点状态未获取，不能判断是否存在异常。":"正在读取节点状态…"})})]}),e.jsxs("section",{className:"card",children:[e.jsx("div",{className:"section-heading",children:e.jsx("h2",{children:"服务配置摘要"})}),e.jsx(gr,{id:"config-rows",className:"f-config-definition",rows:D})]})]})]}),e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"最近任务"}),e.jsx("p",{className:"section-subtitle",children:"数据库历史按时间倒序分批加载；实时任务优先显示，归档未记录的信息不作推测"})]}),e.jsxs("label",{className:"filter-label",children:["任务状态",e.jsxs("select",{id:"jobs-filter",value:x,onChange:S=>{const Z=Bt.safeParse(S.target.value);Z.success&&t.setHistoryFilter(Z.data)},children:[e.jsx("option",{value:"all",children:"全部状态"}),["running","queued","done","error","canceled"].map(S=>e.jsx("option",{value:S,children:or[S]},S))]})]})]}),e.jsx("div",{className:"table-wrap f-job-scroll",role:"region","aria-label":"最近任务列表","aria-describedby":"job-note","aria-busy":!!v.loading,tabIndex:0,onScroll:S=>{const{scrollHeight:Z,scrollTop:K,clientHeight:Q}=S.currentTarget;Z-K-Q<=160&&!v.error&&t.loadMore()},children:e.jsxs("table",{className:"jobs-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["状态","姓名 / 项目 / 卡片","模式","过程进度 / 步骤","执行端","创建时间","耗时 / 错误"].map(S=>e.jsx("th",{scope:"col",children:S},S))})}),e.jsx("tbody",{id:"job-rows",children:e.jsx(aa,{snapshot:l,now:h,items:z,onError:S=>j({kind:"job",job:S})})})]})}),e.jsxs("div",{className:Me.historyControls,children:[e.jsxs("p",{className:"table-note",id:"job-note",role:"status","aria-live":"polite",children:[v.loading?v.loading==="more"?"正在加载更多历史…":"正在刷新任务历史…":v.initialized?v.hasMore?"向下滚动或点击加载更多。":"历史记录已加载完毕。":"任务历史尚未载入。",` 当前筛选历史共 ${v.total??"未知"} 条，已加载 ${v.jobs.length} 条；合并实时任务后显示 ${z.length} 条。`]}),v.error&&e.jsx("p",{role:"alert",children:v.error}),v.error?e.jsx("button",{type:"button",disabled:!!v.loading,onClick:()=>{t.retryHistory()},children:"重试任务历史"}):e.jsx("button",{type:"button","aria-controls":"job-rows",disabled:!!v.loading||!v.hasMore,onClick:()=>{t.loadMore()},children:"加载更多历史"})]})]})]}),_?.kind==="worker"&&e.jsx(ya,{worker:l?.workers.find(S=>S.id===_.worker.id)||_.worker,snapshot:l||_.snapshot,now:h,stale:c,restartUnavailable:n.sandbox||g?"隔离副本禁止重启真实设备。":u!=null?"设备操作正在提交，请稍候。":!l||c?"服务状态未就绪，请刷新后重试。":l.workers.some(S=>S.id===_.worker.id)?"":"该设备已移除或已被新的注册替代。",onRestart:async S=>{M(),await t.restartWorker(_.worker.id,S)},onClose:O}),_?.kind==="temperature"&&e.jsx(xa,{workerId:_.id,worker:l?.workers.find(S=>S.id===_.id),service:a,now:h,stale:c,revision:r.refreshed,onClose:O}),_?.kind==="job"&&e.jsxs(ae,{title:"任务错误详情",onClose:O,children:[e.jsxs("p",{children:["任务 ",_.job.id]}),e.jsx("pre",{children:_.job.error||"未记录错误详情"}),e.jsxs("details",{children:[e.jsx("summary",{children:"任务执行记录"}),e.jsx("pre",{children:JSON.stringify(_.job,null,2)})]})]}),_?.kind==="sync"&&e.jsxs(ae,{title:"更新全部节点",onClose:O,submitLabel:"确认更新",onSubmit:async()=>{M();const S=await t.syncAll();n.notify({message:`已向 ${be(S.worker_count)} 个节点下发更新请求；主节点跳过 ${be(S.primary_count)} 个，旧版跳过 ${be(S.skipped_count)} 个。`,tone:"success"})},children:[e.jsx("p",{children:"确认更新全部节点？"}),e.jsx("div",{className:"notice-box",children:"节点空闲后依次同步 ComfyUI 核心、models 和 user，拉取 chouka 最新代码，再按本机 GPU 启动配置重启 ComfyUI 与 Worker。全部服务恢复就绪后才显示完成。忙碌节点等待当前任务结束；离线节点下次上线后执行。主节点作为同步源不会参与更新；旧版节点会跳过，需先手动更新一次 Worker 及配套启动文件。"}),e.jsx("p",{className:"muted small",children:"这是实际节点更新和服务重启操作，确认后将向中间层提交请求。"})]}),_?.kind==="delete"&&e.jsxs(ae,{title:"删除设备",onClose:O,submitLabel:"确认删除设备",onSubmit:async()=>{M(),await t.deleteWorker(_.worker.id),n.notify({message:"设备已删除，历史任务和账单保留。",tone:"success"})},children:[e.jsxs("p",{children:["确认删除设备“",_.worker.name||"未命名执行端","”？"]}),e.jsx("div",{className:"notice-box",children:"设备会从列表中移除，历史任务和账单不会删除。设备后续重新注册时会重新出现。"})]})]})}function je({id:n,label:r,value:t,note:a,noteId:s,compact:i=!1,tone:o=""}){return e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:r}),e.jsx("p",{className:`metric-value${i?" compact":""}${o?` ${o}`:""}`,id:n,children:t}),e.jsx("p",{className:"metric-note",id:s,children:a})]})})}const Te=ce([C().min(1),H().finite()]).transform(String),Pe=Be(["user","admin","monitor"]),Oe=Be(["read","operate"]),_a=R({id:Te,username:C(),display_name:C().nullish(),phone:C().nullish(),role:Pe,enabled:J(),team_leader:J().default(!1),approval_status:C().optional()}),ka=R({id:C().min(1),name:C().nullish(),owner_id:Te,owner_username:C().nullish(),owner_display_name:C().nullish(),team_id:C().nullish(),team_name:C().nullish()}),Gn=ce([R({scope:le("all"),viewer_id:Te,permission:Oe}),R({scope:le("owner").optional(),viewer_id:Te,owner_id:Te.refine(n=>n!=="*","无效所有者"),permission:Oe})]),Na=R({requests:F(R({username:C(),display_name:C().nullish(),status:C(),created_at:H().nullish(),decided_by:C().nullish()})),outbox:R({pending:H().int().nonnegative(),oldest_at:H().nullish()}).nullish()}),br={admin:"管理员",user:"普通用户",monitor:"监控展示员"},nn={approved:"已通过",pending:"待审批",rejected:"已拒绝"},Ye="全部个人和项目组画布，包括现有及未来新增画布",yr="画布内容和历史费用不变。新所有者的授权访问者将获得相应权限（可操作包含删除）；原所有者及其授权访问者可能失去访问权限。管理员仍可访问全部画布。项目组画布由成员关系授权，不能改为个人归属。";function qe(n){return(n?.username||"未知账号")+(n?.display_name?.trim()?`（${n.display_name.trim()}）`:"")}function pe(n,r){return`${qe(n.find(t=>t.id===r))}（ID: ${r}）`}function gn(n,r){const t=r.find(a=>a.id===n.owner_id);return qe({username:n.owner_username||t?.username,display_name:n.owner_display_name||t?.display_name})}function bn(n){return n==="operate"?"可操作（含删除）":"只读"}function vr(n){return n?new Date(n*1e3).toLocaleString("zh-CN",{hour12:!1}):"—"}const ue=C().min(1).max(512).refine(n=>n!=="*","无效账号 ID"),jr=C().min(8,"密码至少 8 位").max(1024),Sa=R({username:C().trim().min(1,"请输入账号名").max(128),password:jr,role:Pe,team_leader:J()}).refine(n=>n.role!=="monitor"||!n.team_leader,"监控展示员不能担任组长"),$a=Jr("scope",[R({scope:le("all"),viewer_id:ue,permission:Oe}),R({scope:le("owner"),viewer_id:ue,owner_id:ue,permission:Oe}).refine(n=>n.viewer_id!==n.owner_id,"访问者和所有者不能是同一个账号。")]),za=R({owner_id:ue,projects:F(R({project_id:C().min(1).max(512),owner_id:ue})).min(1,"请选择画布").max(1e3,"每次最多分配 1000 个画布")}).refine(n=>new Set(n.projects.map(r=>r.project_id)).size===n.projects.length,"画布分配清单存在重复项"),Vn=R({}).passthrough(),Kn=n=>`/api/admin/global-grants/${encodeURIComponent(ue.parse(n))}`,Jn=n=>`/api/admin/users/${encodeURIComponent(ue.parse(n))}`;function Ca(n){const r=async(t,a,s)=>{Vn.parse(await n.json(t,a,s))};return{async snapshot(t){const a={signal:t,cache:"no-store"},[s,i,o]=await Promise.all([n.read("/api/admin/users",R({users:F(_a)}),a),n.read("/api/admin/grants",R({grants:F(Gn)}),a),n.read("/api/projects",R({projects:F(ka)}),a)]);return{users:s.users,grants:i.grants,projects:o.projects}},registrations:t=>n.read("/api/admin/registrations",Na,{signal:t,cache:"no-store"}),create:t=>r("/api/admin/users","POST",Sa.parse(t)),update:(t,a)=>{const s=ce([R({role:Pe}).strict(),R({enabled:J()}).strict(),R({team_leader:J()}).strict()]).parse(a);return r(Jn(t),"PATCH",s)},resetPassword:(t,a)=>r(`${Jn(t)}/password`,"POST",{password:jr.parse(a)}),saveGrant:t=>{const a=$a.parse(t);return a.scope==="all"?r(Kn(a.viewer_id),"PUT",{permission:a.permission}):r("/api/admin/grants","PUT",{viewer_id:a.viewer_id,owner_id:a.owner_id,permission:a.permission})},async revokeGrant(t){const a=Gn.parse(t),s=a.scope==="all"?Kn(a.viewer_id):`/api/admin/grants/${encodeURIComponent(ue.parse(a.viewer_id))}/${encodeURIComponent(ue.parse(a.owner_id))}`;Vn.parse(await n.request(s,{method:"DELETE"}))},async assign(t){const a=await n.json("/api/admin/projects/assign","POST",za.parse(t));return R({count:H().int().nonnegative()}).parse(a).count}}}function we(n,r){const t=new FormData(n).get(r);if(typeof t!="string")throw new Error("表单字段不正确："+r);return t}function Ea(n,r,t){const a=r.trim().toLowerCase();return n.filter(s=>(!t||s.owner_id===t)&&(!a||(s.name||"").toLowerCase().includes(a)||s.id.toLowerCase().includes(a)))}function Ma(n,r){const t=n.filter(s=>!s.team_id),a=t.filter(s=>r.has(s.id)).length;return{personal:t,checked:t.length>0&&a===t.length,indeterminate:a>0&&a<t.length}}function Pa(n,r,t,a){const s=n.find(i=>i.id===r);if(!s||s.role==="monitor"||t!=="*"&&!n.some(i=>i.id===t))throw new Error("请选择有效账号和授权范围。");if(r===t)throw new Error("访问者和所有者不能是同一个账号。");return t==="*"?{scope:"all",viewer_id:r,permission:a}:{scope:"owner",viewer_id:r,owner_id:t,permission:a}}function Ra(n,r,t,a){const s=n.find(o=>o.id===a&&o.enabled&&o.role!=="monitor");if(!s)throw new Error("请选择有效的启用目标账号。");if(!t.size)throw new Error("请选择个人画布。");if(t.size>1e3)throw new Error("每次最多分配 1000 个画布，请缩小筛选范围后再选择。");const i=r.filter(o=>t.has(o.id));if(i.length!==t.size||i.some(o=>o.team_id))throw new Error("选择包含项目组画布或已变化的画布，请刷新后重新选择。");return{target:s,chosen:i.map(o=>({...o})),payload:{owner_id:s.id,projects:i.map(o=>({project_id:o.id,owner_id:o.owner_id}))}}}function Ia({http:n,notify:r}){const t=m.useMemo(()=>Ca(n),[n]),[a,s]=m.useState({users:[],projects:[],grants:[]}),[i,o]=m.useState(null),[l,c]=m.useState(""),[d,p]=m.useState(!1),[g,u]=m.useState(!0),[y,_]=m.useState(!1),[j,v]=m.useState(""),[x,h]=m.useState("正在加载真实数据…"),[f,k]=m.useState(new Set),[T,O]=m.useState(""),w=m.useRef(!1),N=m.useRef(!1),M=m.useRef(!1),b=m.useRef(0),I=m.useRef(null),D=m.useRef(r);m.useEffect(()=>{D.current=r},[r]);const z=m.useCallback(async()=>{if(w.current)return;w.current=!0;const K=++b.current,Q=new AbortController;I.current=Q;const ie=()=>M.current&&b.current===K;u(!0),h("正在加载真实数据…");try{const ge=await t.snapshot(Q.signal);if(!ie())return;s(ge),p(!0),k(new Set);try{const ve=await t.registrations(Q.signal);if(!ie())return;o(ve),c("")}catch(ve){if(!ie())return;o(null);const Dn="注册申请信息加载失败："+ee(ve);c(Dn),D.current({message:Dn,tone:"error"})}ie()&&h("更新于 "+new Date().toLocaleTimeString("zh-CN",{hour12:!1}))}catch(ge){if(!ie())return;throw p(!1),h("加载失败，请刷新重试"),ge}finally{ie()&&(w.current=!1,u(!1))}},[t]),S=m.useCallback(async()=>{if(!(N.current||w.current)){v("");try{await z()}catch(K){if(!M.current)return;const Q=ee(K);v(Q),D.current({message:Q,tone:"error"})}}},[z]);return m.useEffect(()=>(M.current=!0,S(),()=>{M.current=!1,I.current?.abort(),w.current=!1}),[S]),{...a,service:t,registrations:i,registrationError:l,ready:d,loading:g,mutationBusy:y,error:j,setError:v,refreshNote:x,selected:f,setSelected:k,assignStatus:T,setAssignStatus:O,refreshPage:S,mutate:async(K,Q,ie)=>{if(N.current||w.current||!d)throw new Error("另一项操作正在提交或列表尚未就绪，请稍后重试。");N.current=!0,_(!0),v("");try{if(await K(),!M.current)return;ie?.(),D.current({message:Q,tone:"success"});try{await z()}catch(ge){if(!M.current)return;const ve="操作已成功，但列表刷新失败，请点击刷新数据后继续："+ee(ge);v(ve),D.current({message:ve,tone:"warning"})}}finally{N.current=!1,M.current&&_(!1)}}}}function wr({initial:n="user",onChange:r}){return e.jsxs("label",{className:"field",children:["角色",e.jsx("select",{name:"role",defaultValue:n,onChange:t=>r?.(Pe.parse(t.currentTarget.value)),children:["user","admin","monitor"].map(t=>e.jsx("option",{value:t,children:br[t]},t))})]})}function _r(){return e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"field",children:["新密码（至少 8 位）",e.jsx("input",{name:"password",type:"password",minLength:8,maxLength:1024,autoComplete:"new-password",required:!0})]}),e.jsx("p",{className:"notice-box",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。密码不会显示在列表中。"})]})}function La(){const[n,r]=m.useState("user"),[t,a]=m.useState(!1);return e.jsxs("div",{id:"create",className:"form-grid",children:[e.jsxs("label",{className:"field",children:["账号名",e.jsx("input",{name:"username",required:!0,maxLength:128,autoComplete:"off"})]}),e.jsx(_r,{}),e.jsx(wr,{onChange:s=>{r(s),s==="monitor"&&a(!1)}}),e.jsxs("label",{className:"check-label",children:[e.jsx("input",{name:"team_leader",type:"checkbox",checked:t,disabled:n==="monitor",onChange:s=>a(s.currentTarget.checked)}),"独立授予组长权限"]}),e.jsx("p",{className:"notice-box",children:"创建后账号启用并标记为已通过。监控展示员不能担任组长，密码由管理员重置；其他账号登录后可自行修改。"})]})}function Re({name:n,id:r}){return e.jsxs("span",{className:"perm-identity",children:[e.jsx("span",{className:"perm-username",children:n}),e.jsxs("span",{className:"perm-user-id",children:["ID: ",r]})]})}function tn({columns:n,children:r}){return e.jsx("tr",{children:e.jsx("td",{colSpan:n,children:r})})}function Aa({users:n,busy:r,ready:t,action:a}){return e.jsx("div",{className:"table-wrap accounts-scroll",tabIndex:0,role:"region","aria-label":"账号列表",children:e.jsxs("table",{className:"accounts-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["账号 / ID","姓名 / 花名","手机号","角色","独立组长权限","启用状态","审批","操作"].map(s=>e.jsx("th",{scope:"col",children:s},s))})}),e.jsxs("tbody",{id:"users",children:[n.map(s=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx(Re,{name:s.username,id:s.id})}),e.jsx("td",{children:s.display_name||"—"}),e.jsx("td",{children:s.phone||"未填写"}),e.jsx("td",{children:e.jsx("span",{className:"f-chip "+(s.role==="admin"?"admin":""),children:br[s.role]})}),e.jsx("td",{children:s.team_leader?"是":"否"}),e.jsx("td",{children:e.jsx("span",{className:"f-chip "+(s.enabled?"on":"off"),children:s.enabled?"启用":"已停用"})}),e.jsx("td",{children:Object.hasOwn(nn,s.approval_status||"")?nn[s.approval_status||""]:"—"}),e.jsx("td",{children:e.jsxs("div",{className:"row-actions",children:[e.jsx("button",{type:"button",className:s.enabled?"danger":"",disabled:r,onClick:()=>a(s,"enabled"),children:s.enabled?"停用":"启用"}),e.jsx("button",{type:"button",disabled:r,onClick:()=>a(s,"role"),children:"修改角色"}),s.role!=="monitor"&&e.jsx("button",{type:"button",disabled:r,onClick:()=>a(s,"leader"),children:s.team_leader?"取消组长权限":"设为组长"}),e.jsx("button",{type:"button",disabled:r,onClick:()=>a(s,"password"),children:"重置密码"})]})})]},s.id)),!n.length&&e.jsx(tn,{columns:8,children:t?"暂无账号。":"正在加载账号…"})]})]})})}function Ta({data:n,error:r}){return e.jsx("div",{className:"table-wrap registrations-scroll",tabIndex:0,role:"region","aria-label":"注册申请列表",children:e.jsxs("table",{className:"registration-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["账号","姓名 / 花名","状态","申请时间","审批人"].map(t=>e.jsx("th",{scope:"col",children:t},t))})}),e.jsxs("tbody",{id:"registrations",children:[n?.requests.map((t,a)=>e.jsxs("tr",{children:[e.jsx("td",{children:t.username}),e.jsx("td",{children:t.display_name||"—"}),e.jsx("td",{children:Object.hasOwn(nn,t.status)?nn[t.status]:t.status}),e.jsx("td",{children:vr(t.created_at)}),e.jsx("td",{children:t.decided_by||"—"})]},t.username+"-"+a)),!n?.requests.length&&e.jsx(tn,{columns:5,children:r?"暂时无法加载注册申请，请点击刷新数据重试。":n?"暂无自主注册申请。":"正在加载注册申请…"})]})]})})}function Da({grants:n,users:r,busy:t,ready:a,revoke:s}){return e.jsx("div",{className:"table-wrap",tabIndex:0,role:"region","aria-label":"画布授权列表",children:e.jsxs("table",{className:"grant-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["访问者 A","方向","所有者 / 授权范围","权限","操作"].map(i=>e.jsx("th",{scope:"col",children:i},i))})}),e.jsxs("tbody",{id:"grants",children:[n.map(i=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx(Re,{name:qe(r.find(o=>o.id===i.viewer_id)),id:i.viewer_id})}),e.jsx("td",{children:"→"}),e.jsx("td",{children:i.scope==="all"?e.jsxs(e.Fragment,{children:["所有画布",e.jsx("span",{className:"perm-user-id",children:Ye})]}):e.jsx(Re,{name:qe(r.find(o=>o.id===i.owner_id)),id:i.owner_id})}),e.jsx("td",{children:bn(i.permission)}),e.jsx("td",{children:e.jsx("button",{type:"button",className:"danger",disabled:t,onClick:()=>s(i),children:"撤销"})})]},i.viewer_id+"-"+(i.scope==="all"?"*":i.owner_id))),!n.length&&e.jsx(tn,{columns:5,children:a?"暂无画布授权。选择访问者与所有者 / 授权范围后保存。":"正在加载授权…"})]})]})})}function Fa({projects:n,users:r,target:t}){return e.jsx("div",{className:"dialog-list",tabIndex:0,role:"region","aria-label":"画布分配确认明细",children:e.jsxs("table",{children:[e.jsx("thead",{children:e.jsx("tr",{children:["画布名称","画布 ID","旧归属","目标归属"].map(a=>e.jsx("th",{scope:"col",children:a},a))})}),e.jsx("tbody",{children:n.map(a=>e.jsxs("tr",{children:[e.jsx("td",{children:a.name||"未命名画布"}),e.jsx("td",{children:a.id}),e.jsx("td",{children:e.jsx(Re,{name:gn(a,r),id:a.owner_id})}),e.jsx("td",{children:e.jsx(Re,{name:qe(t),id:t.id})})]},a.id))})]})})}function Oa({projects:n,users:r,busy:t,ready:a,selected:s,setSelected:i,status:o,onConfirm:l,onError:c}){const[d,p]=m.useState(""),[g,u]=m.useState(""),[y,_]=m.useState(""),j=new Map(n.map(w=>[w.owner_id,`${gn(w,r)}（ID: ${w.owner_id}）`])),v=j.has(g)?g:"",x=r.filter(w=>w.enabled&&w.role!=="monitor"),h=x.some(w=>w.id===y)?y:"",f=Ea(n,d,v),k=Ma(f,s),T=m.useRef(null);m.useEffect(()=>{T.current&&(T.current.indeterminate=k.indeterminate)},[k.indeterminate]);const O=w=>{w(),i(new Set)};return e.jsxs("section",{className:"card","aria-labelledby":"history-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"history-heading",tabIndex:-1,children:"历史画布分配"}),e.jsx("span",{className:"small muted",children:"仅个人空间 / 每次最多 1000 个"})]}),e.jsx("div",{className:"f-pad",children:e.jsx("p",{className:"notice-box",children:yr})}),e.jsxs("div",{className:"allocation-tools",children:[e.jsxs("div",{className:"allocation-filters",children:[e.jsxs("label",{className:"field",children:["搜索名称 / ID",e.jsx("input",{id:"project-search",type:"search",autoComplete:"off",placeholder:"输入画布名称或 ID",value:d,disabled:t,onChange:w=>O(()=>p(w.currentTarget.value))})]}),e.jsxs("label",{className:"field",children:["当前所有者",e.jsxs("select",{id:"project-owner",value:v,disabled:t,onChange:w=>O(()=>u(w.currentTarget.value)),children:[e.jsx("option",{value:"",children:"全部所有者"}),[...j].map(([w,N])=>e.jsx("option",{value:w,children:N},w))]})]})]}),e.jsxs("form",{id:"assign",className:"allocation-batch","aria-busy":t,onSubmit:w=>{if(w.preventDefault(),!t)try{l(Ra(r,f,s,h))}catch(N){c(ee(N))}},children:[e.jsxs("label",{className:"field",children:["目标账号（仅启用账号）",e.jsxs("select",{name:"owner_id",required:!0,value:h,disabled:t,onChange:w=>_(w.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择目标账号"}),x.map(w=>e.jsx("option",{value:w.id,children:pe(r,w.id)},w.id))]})]}),e.jsxs("span",{id:"project-selected",role:"status",children:["已选 ",s.size," 个画布",s.size>1e3?"（超过 1000 个上限）":""]}),e.jsx("button",{id:"assign-submit",className:"primary",disabled:t||!s.size||!h,children:"分配所选画布"}),e.jsx("button",{id:"clear-selection",type:"button",disabled:t||!s.size,onClick:()=>i(new Set),children:"清空选择"})]})]}),e.jsx("p",{id:"assign-status",className:"table-note f-status",role:"status",children:o}),e.jsx("div",{className:"table-wrap history-scroll",tabIndex:0,role:"region","aria-label":"历史画布列表",children:e.jsxs("table",{className:"allocation-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{scope:"col",children:e.jsx("input",{ref:T,id:"project-all",type:"checkbox","aria-label":"全选当前筛选结果中的个人画布",checked:k.checked,disabled:t||!k.personal.length,onChange:w=>i(new Set(w.currentTarget.checked?k.personal.map(N=>N.id):[]))})}),["画布名称","画布 ID","当前所有者","空间"].map(w=>e.jsx("th",{scope:"col",children:w},w))]})}),e.jsxs("tbody",{id:"projects",children:[f.map(w=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("input",{type:"checkbox","data-team":String(!!w.team_id),checked:s.has(w.id),"aria-label":`选择画布 ${w.name||"未命名画布"}（${w.id}）`,disabled:t||!!w.team_id,onChange:N=>{const M=new Set(s);N.currentTarget.checked?M.add(w.id):M.delete(w.id),i(M)}})}),e.jsx("td",{children:w.name||"未命名画布"}),e.jsx("td",{className:"perm-id",children:w.id}),e.jsx("td",{children:e.jsx(Re,{name:gn(w,r),id:w.owner_id})}),e.jsx("td",{children:w.team_id?e.jsxs(e.Fragment,{children:["项目组：",w.team_name||w.team_id,e.jsx("span",{className:"team-space",children:"由成员关系授权，不可改为个人归属"})]}):"个人空间"})]},w.id)),!f.length&&e.jsx(tn,{columns:5,children:a?"暂无符合条件的画布，请尝试更换搜索词或当前所有者。":"正在加载画布…"})]})]})}),e.jsx("p",{className:"table-note",children:"搜索或切换当前所有者会清空选择。全选只选择当前筛选结果中的个人画布，项目组画布不可选；超过 1000 个时请缩小筛选范围。"})]})}function qa(n){const r=Ia(n),{users:t,grants:a,projects:s,service:i}=r,[o,l]=m.useState(null),[c,d]=m.useState(""),[p,g]=m.useState(""),[u,y]=m.useState(""),_=m.useRef(null),j=r.loading||r.mutationBusy||!r.ready,v=j&&!o,x=b=>{r.setError(b),n.notify({message:b,tone:"error"})},h=b=>{!j&&!o&&l(b)},f=(b,I)=>{const D=e.jsxs("p",{children:["目标账号：",e.jsx("b",{children:pe(t,b.id)})]});if(I==="password")return h({title:"重置密码",children:e.jsxs(e.Fragment,{children:[D,e.jsx(_r,{}),e.jsx("p",{className:"notice-box danger",children:"该账号现有会话将失效，需要使用新密码重新登录。请妥善告知本人。"})]}),submitLabel:"确认重置密码",action:Q=>i.resetPassword(b.id,we(Q,"password")),message:"密码已重置"});if(I==="role")return h({title:"修改账号角色",children:e.jsxs(e.Fragment,{children:[D,e.jsx(wr,{initial:b.role}),e.jsx("p",{className:"notice-box danger",children:"管理员天然可访问全部画布。切换为监控展示员会清除组长权限，已有画布授权保留但不生效；其他角色的组长权限不变。修改角色会使该账号现有会话失效；最后一位启用管理员受系统保护。"})]}),submitLabel:"确认修改角色",action:Q=>i.update(b.id,{role:Pe.parse(we(Q,"role"))}),message:"账号角色已修改"});const z=I==="enabled",S=z?!b.enabled:!b.team_leader,Z=z?S?"启用账号":"停用账号":S?"授予组长权限":"取消组长权限",K=z?S?"启用不会跳过钉钉注册审批，审批状态保持不变。":"停用后该账号不能继续登录，现有会话失效。不会删除既有项目组关系或画布授权；最后一位启用管理员受系统保护。":S?"授予该用户创建项目组和管理自己创建项目组的权限，不会成为管理员，也不能管理其他人的项目组。现有会话失效后需重新登录。":"取消后不能继续创建或管理项目组，现有会话失效。既有组长归属和成员关系不会被迁移。";h({title:Z,children:e.jsxs(e.Fragment,{children:[D,e.jsx("p",{className:"notice-box",children:K})]}),submitLabel:"确认"+Z,action:()=>i.update(b.id,z?{enabled:S}:{team_leader:S}),message:Z+"成功"})},k=b=>{const I=b.scope==="all"?"所有画布（"+Ye+"）":pe(t,b.owner_id);h({title:"确认撤销授权",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:[pe(t,b.viewer_id)," → ",I]}),e.jsxs("p",{children:["权限：",bn(b.permission)]}),e.jsx("p",{className:"notice-box danger",children:"撤销后即时重新校验权限，访问者失去这条授权带来的全部画布访问权。此授权不会使其成为管理员；管理员天然权限、项目组成员关系和其他独立授权不受影响。"})]}),submitLabel:"确认撤销授权",action:()=>i.revokeGrant(b),message:"已撤销画布授权"})},T=t.filter(b=>b.role!=="monitor"),O=T.some(b=>b.id===p)?p:"",w=u==="*"||t.some(b=>b.id===u)?u:"",N=[{id:"users",label:"账号总数",value:t.length,note:"角色与独立组长权限分别管理"},{id:"enabled",label:"启用账号",value:t.filter(b=>b.enabled).length,note:"停用不会删除账号或画布授权"},{id:"pending",label:"待审批注册",value:r.registrations?.requests.filter(b=>b.status==="pending").length??"—",note:"仅由钉钉指定审批人处理"},{id:"grants",label:"画布授权",value:a.length,note:"访问者 A → 所有者 / 授权范围"}],M=r.registrations?.outbox;return e.jsxs("main",{id:"main",tabIndex:-1,ref:_,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"账号与权限"}),e.jsx("div",{className:"page-caption",children:e.jsx("p",{className:"subtitle",children:"管理账号、画布访问与历史画布归属"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsx("span",{id:"refresh-note",className:"refresh-note",role:"status",children:r.refreshNote}),e.jsx("button",{id:"refresh",type:"button",disabled:r.loading||r.mutationBusy||!!o,onClick:()=>{r.refreshPage()},children:"刷新数据"})]})]}),e.jsx("p",{id:"error",className:"page-status",role:"alert",children:r.error}),e.jsx("section",{className:"metrics","aria-label":"权限概览",children:N.map(b=>e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:b.label}),e.jsx("p",{id:"metric-"+b.id,className:"metric-value",children:b.id==="pending"||r.ready||t.length?b.value:"—"}),e.jsx("p",{className:"metric-note",children:b.note})]})},b.id))}),e.jsx("nav",{className:"section-nav","aria-label":"权限管理分区",children:[["accounts","账号管理"],["registrations","注册申请"],["grants","画布授权"],["history","历史画布分配"]].map(([b,I])=>e.jsx("a",{href:"#"+b+"-heading",onClick:()=>_.current?.querySelector("#"+b+"-heading")?.focus(),children:I},b))}),e.jsxs("section",{className:"card","aria-labelledby":"accounts-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{id:"accounts-heading",tabIndex:-1,children:"账号管理"}),e.jsx("p",{className:"section-subtitle",children:"账号角色包括管理员、普通用户和监控展示员。监控展示员仅可查看监控，不能担任组长或访问画布。"})]}),e.jsx("button",{id:"create-user",type:"button",className:"primary",disabled:v,onClick:()=>h({title:"新建账号",children:e.jsx(La,{}),submitLabel:"创建账号",action:b=>i.create({username:we(b,"username").trim(),password:we(b,"password"),role:Pe.parse(we(b,"role")),team_leader:new FormData(b).has("team_leader")}),message:"账号已创建"}),children:"新建账号"})]}),e.jsx(Aa,{users:t,busy:v,ready:r.ready,action:f}),e.jsx("p",{className:"table-note",children:"启停、角色、组长权限及重置密码均需确认。初始密码至少 8 位，请勿使用常见弱密码；监控展示员的密码由管理员重置，其他账号登录后可自行修改。"})]}),e.jsxs("div",{className:"permissions-grid",children:[e.jsxs("section",{className:"card","aria-labelledby":"registrations-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"registrations-heading",tabIndex:-1,children:"注册申请"}),e.jsx("span",{className:"small muted",children:"仅查看钉钉审批结果"})]}),e.jsxs("div",{className:"f-pad form-grid",children:[e.jsx("p",{className:"notice-box",children:"自主注册由钉钉群内两位指定审批人在卡片上处理，任意一人先决生效。网页不提供通过或拒绝操作。"}),e.jsx("p",{id:"outbox-status",className:"f-status",role:"status",children:r.registrationError||(r.registrations?M&&M.pending>0?`审批通知积压 ${M.pending} 条（最早 ${M.oldest_at?vr(M.oldest_at):"时间未知"}），系统会自动重试投递。`:"审批通知投递正常。":"")})]}),e.jsx(Ta,{data:r.registrations,error:r.registrationError})]}),e.jsxs("section",{className:"card","aria-labelledby":"grants-heading",children:[e.jsxs("div",{className:"section-heading",children:[e.jsx("h2",{id:"grants-heading",tabIndex:-1,children:"画布授权"}),e.jsx("span",{className:"small muted",children:"访问者 A → 所有者 / 授权范围"})]}),e.jsx("div",{className:"f-pad",children:e.jsx("p",{id:"grant-help",className:"notice-box",children:"选择指定所有者，A 可查看或操作其当前及以后创建的全部个人画布；选择“所有画布”则覆盖全部个人和项目组画布，包括现有及未来新增画布。可操作包含删除；授权不传递，也不会成为管理员。管理员天然可访问全部画布，停用账号不会因授权恢复登录权限。"})}),e.jsxs("form",{id:"grant",className:"grant-form","aria-describedby":"grant-help","aria-busy":r.mutationBusy,onSubmit:b=>{if(b.preventDefault(),!j){d("");try{const I=Pa(t,O,w,Oe.parse(we(b.currentTarget,"permission"))),D=I.scope==="all"?"所有画布（"+Ye+"）":pe(t,I.owner_id),z=I.scope==="all"?"覆盖"+Ye+"，不受所有者或项目组成员关系限制。":"覆盖所有者当前和以后创建的全部个人画布，不包含项目组画布。";h({title:"确认画布授权",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["访问者 A：",pe(t,I.viewer_id)]}),e.jsxs("p",{children:["所有者 / 授权范围：",D]}),e.jsxs("p",{children:["权限：",e.jsx("b",{children:bn(I.permission)})]}),e.jsxs("p",{className:"notice-box danger",children:[z,"可操作包含删除；授权不传递，也不会成为管理员。已有同范围授权将被更新，其他独立授权保留；保存后即时重新校验权限。停用账号不会因此恢复登录。"]})]}),submitLabel:"确认保存授权",action:()=>i.saveGrant(I),message:"画布授权已保存"})}catch(I){const D=ee(I);d(D),n.notify({message:D,tone:"error"})}}},children:[e.jsxs("label",{className:"field",children:["访问者 A",e.jsxs("select",{name:"viewer_id",required:!0,disabled:v,value:O,onChange:b=>g(b.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择账号"}),T.map(b=>e.jsx("option",{value:b.id,children:pe(t,b.id)},b.id))]})]}),e.jsxs("label",{className:"field",children:["所有者 / 授权范围",e.jsxs("select",{name:"owner_id",required:!0,disabled:v,value:w,onChange:b=>y(b.currentTarget.value),children:[e.jsx("option",{value:"",children:"请选择所有者 / 授权范围"}),e.jsx("option",{value:"*",children:"所有画布（含以后新增）"}),t.map(b=>e.jsx("option",{value:b.id,children:pe(t,b.id)},b.id))]})]}),e.jsxs("label",{className:"field",children:["权限",e.jsxs("select",{name:"permission",disabled:v,children:[e.jsx("option",{value:"read",children:"只读"}),e.jsx("option",{value:"operate",children:"可操作（含删除）"})]})]}),e.jsx("button",{id:"grant-submit",className:"primary",disabled:v,children:"保存授权"}),e.jsx("p",{id:"grant-error",className:"danger small",role:"alert",children:c})]}),e.jsx(Da,{grants:a,users:t,busy:v,ready:r.ready,revoke:k})]})]}),e.jsx(Oa,{projects:s,users:t,busy:v,ready:r.ready,selected:r.selected,setSelected:r.setSelected,status:r.assignStatus,onError:x,onConfirm:({target:b,chosen:I,payload:D})=>h({title:"确认分配 "+I.length+" 个画布",children:e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["目标账号：",e.jsx("b",{children:pe(t,b.id)})]}),e.jsx("p",{className:"notice-box danger",children:yr}),e.jsx(Fa,{projects:I,users:t,target:b})]}),submitLabel:"确认分配所列画布",action:async()=>{const z=await i.assign(D);r.setSelected(new Set),r.setAssignStatus(`分配成功：已将 ${z} 个画布分配给 ${pe(t,b.id)}。`)},message:"画布归属已分配"})})]}),o&&e.jsx(ae,{title:o.title,submitLabel:o.submitLabel,onClose:()=>l(null),onSubmit:b=>r.mutate(()=>o.action(b),o.message,o.afterSuccess),children:o.children})]})}const ye=10,kr=2e3,Ua=15e3;function Wa(n){return n==="0"||n==="7"||n==="30"||n==="90"}const q=ce([H(),C(),ar()]).optional().transform((n,r)=>{if(n==null||n==="")return n===void 0?void 0:null;const t=typeof n=="number"?n:Number(n);return Number.isFinite(t)?t:(r.addIssue({code:"custom",message:"费用数值必须为有限数字或未知值"}),Xr)}),re=C().nullish(),Ba=V({tasks:q,done:q,error:q,canceled:q,retail_min:q,retail_max:q,retail_mid:q,retail_known_tasks:q,retail_unknown_tasks:q,total_cost:q,actual_cost:q,estimated_cost:q,running_accrued:q,gpu_hours:q,electricity_cost:q,api_cost:q,failed_waste:q,unknown_cost_tasks:q}),un=V({key:re,label:re,tasks:q,retail_known_tasks:q,retail_unknown_tasks:q,retail_min:q,retail_max:q,retail_mid:q,total_cost:q}),Ha=V({job_id:re,created_at:q,status:re,category_name:re,category:re,project_name:re,card_name:re,capability:re,worker_name:re,runtime_seconds:q,retail_source:re,retail_basis:re,retail_min:q,retail_max:q,cost_source:re,recognized_cost:q}),Ga=V({overview:Ba,jobs:F(Ha).transform(n=>n.slice(0,kr)),currency:re,pricing_version:ce([C(),H()]).nullish(),period:V({from:q,to:q}).nullish(),by_category:F(un).nullish(),by_capability:F(un).nullish(),by_worker:F(un).nullish()});function Va(n){const r=Ga.safeParse(n);if(!r.success)throw new Error("费用接口返回的数据格式不完整");return r.data}function Ka(n,r=Date.now()){const t=new URLSearchParams({limit:String(kr)});return n!=="0"&&t.set("from",String(r/1e3-Number(n)*86400)),`/api/costs?${t}`}function Ja(n){return{async load(r,t){const a=await n.request(Ka(r),{cache:"no-store",signal:t});return Va(a)}}}const Xa={data:null,selectedPeriod:"0",loadedPeriod:"0",page:0,busy:!0,error:null,updatedAt:null};function Ya({http:n,notify:r}){const t=m.useMemo(()=>Ja(n),[n]),[a,s]=m.useState(Xa),i=m.useRef("0"),o=m.useRef("0"),l=m.useRef(0),c=m.useRef(!1),d=m.useRef(!1),p=m.useRef(new Set),g=m.useRef(r);m.useEffect(()=>{g.current=r},[r]);const u=m.useCallback(async(h,f,k=!1)=>{if(c.current&&!k)return;const T=++l.current;c.current=!0;const O=new AbortController;p.current.add(O),s(w=>({...w,busy:!0}));try{const w=await t.load(h,O.signal);if(T!==l.current)return;o.current=h,d.current=!1,s(N=>({...N,data:w,loadedPeriod:h,error:null,updatedAt:Date.now(),page:f?0:Math.min(N.page,Math.max(0,Math.ceil(w.jobs.length/ye)-1))}))}catch(w){if(T!==l.current)return;const N=`读取费用统计失败：${ee(w)}`,M=!d.current;d.current=!0,s(b=>({...b,error:N})),M&&g.current({message:N,tone:"error"})}finally{p.current.delete(O),T===l.current&&(c.current=!1,s(w=>({...w,busy:!1})))}},[t]),y=m.useCallback(()=>{l.current+=1,c.current=!1,p.current.forEach(h=>h.abort()),p.current.clear()},[]);m.useEffect(()=>{u(i.current,!1);const h=window.setInterval(()=>{document.hidden||u(i.current,!1)},Ua);return()=>{window.clearInterval(h),y()}},[u,y]);const _=m.useCallback(h=>{i.current=h,s(f=>({...f,selectedPeriod:h})),u(h,!0,!0)},[u]),j=m.useCallback(()=>{u(i.current,!1)},[u]),v=m.useCallback(()=>{const h=i.current!==o.current;u(i.current,h,h)},[u]),x=m.useCallback(h=>{s(f=>({...f,page:Math.max(0,Math.min(f.page+h,Math.max(0,Math.ceil((f.data?.jobs.length??0)/ye)-1)))}))},[]);return{...a,selectPeriod:_,refresh:j,retry:v,changePage:x}}function X(n){return typeof n=="number"&&Number.isFinite(n)?n:null}function oe(n){return X(n)==null?"未获取":String(n)}function ze(n,r){const t=X(n);return t==null?"未知":`${!r||r==="CNY"?"¥":r+" "}${t.toFixed(4)}`}function En(n,r,t){return X(n)==null||X(r)==null?"未知":n===r?ze(n,t):`${ze(n,t)} – ${ze(r,t)}`}function hn(n){const r=X(n);return r==null||!Number.isFinite(new Date(r*1e3).getTime())?"未记录":new Date(r*1e3).toLocaleString("zh-CN",{hour12:!1})}function Za(n){const r=X(n);return r==null||r<0?"未记录":r<60?`${Math.round(r)}秒`:r<3600?`${Math.floor(r/60)}分${Math.floor(r%60)}秒`:`${Math.floor(r/3600)}小时${Math.floor(r%3600/60)}分`}function Qa(n){return n==="0"?"全部记录":`最近${n}天`}function es(n){return{unpriced:X(n.retail_known_tasks)===0&&(X(n.retail_unknown_tasks)??0)>0,allCostsUnknown:(X(n.tasks)??0)>0&&X(n.unknown_cost_tasks)===X(n.tasks)&&X(n.actual_cost)===0&&X(n.estimated_cost)===0}}function ns(n,r){return X(n.retail_known_tasks)==null?"未获取":n.retail_known_tasks?En(n.retail_min,n.retail_max,r):"未定价"}const Xn={queued:"排队中",assigned:"已分配",running:"运行中",done:"已完成",error:"失败",canceled:"已取消",cancel_requested:"正在取消"},Yn={actual:"实际",estimated:"历史估算",unknown:"未知"},Zn={per_job:"按次",per_segment:"按段",segment_count:"按分段数",output_second_resolution:"按输出秒和分辨率"};function rs(n,r){const t=n.retail_source==="priced",a=n.retail_source==="not_billable",s=n.retail_source==="unpriced";return{status:(Object.hasOwn(Xn,n.status||"")?Xn[n.status||""]:n.status)||"未知",statusClass:["error","canceled"].includes(n.status||"")?"danger":["running","queued","assigned","cancel_requested"].includes(n.status||"")?"warn":"",basis:t?(Object.hasOwn(Zn,n.retail_basis||"")?Zn[n.retail_basis||""]:n.retail_basis)||"未记录":a?"未完成":s?"未定价":"未获取",basisClass:s?"warn":"muted",retail:t?En(n.retail_min,n.retail_max,r):a?"不计费":s?"未定价":"未知",internal:n.cost_source==="unknown"||!n.cost_source?"未知":ze(n.recognized_cost,r),source:(Object.hasOwn(Yn,n.cost_source||"")?Yn[n.cost_source||""]:n.cost_source)||"来源未记录"}}function xe({label:n,id:r,children:t,note:a,noteId:s,compact:i=!0}){return e.jsx("article",{className:"card metric",children:e.jsxs("div",{className:"metric-content",children:[e.jsx("p",{className:"metric-label",children:n}),e.jsx("p",{className:`metric-value${i?" compact":""}`,id:r,children:t}),e.jsx("p",{className:"metric-note",id:s,children:a})]})})}function ts({data:n}){const r=n?.overview??{},{unpriced:t,allCostsUnknown:a}=es(r),s=o=>ze(o,n?.currency),i=n?t?"未定价":X(r.retail_min)!=null&&X(r.retail_max)!=null&&r.retail_min!==r.retail_max?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"cost-amount",children:s(r.retail_min)})," – ",e.jsx("span",{className:"cost-amount",children:s(r.retail_max)})]}):En(r.retail_min,r.retail_max,n.currency):"未获取";return e.jsxs("section",{className:"metrics f-metrics8","aria-label":"费用概览",children:[e.jsx(xe,{label:"建议收费区间",id:"retail-range",note:"按次 / 分段 / 输出秒和分辨率",children:i}),e.jsx(xe,{label:"建议收费中值",id:"retail-mid",noteId:"retail-coverage",note:n?`已定价 ${oe(r.retail_known_tasks)} 项 / 未定价 ${oe(r.retail_unknown_tasks)} 项`:"已定价 未获取 / 未定价 未获取",children:n?t?"未定价":s(r.retail_mid):"未获取"}),e.jsx(xe,{label:"内部总成本",id:"internal-total",noteId:"internal-split",note:n?a?`实际与历史估算均未记录；未知 ${oe(r.unknown_cost_tasks)} 项`:`实际 ${s(r.actual_cost)} / 历史估算 ${s(r.estimated_cost)}`:"实际 未获取 / 历史估算 未获取",children:n?a?"未知":s(r.total_cost):"未获取"}),e.jsx(xe,{label:"内部实际成本",id:"actual",noteId:"running",note:n?`运行中累计 ${s(r.running_accrued)}`:"运行中累计 未获取",children:n?a?"未知":s(r.actual_cost):"未获取"}),e.jsx(xe,{label:"GPU 用量",id:"gpu-hours",noteId:"electricity",note:n?`其中电费 ${s(r.electricity_cost)}`:"其中电费 未获取",children:X(r.gpu_hours)==null?"未获取":`${r.gpu_hours?.toFixed(2)} 小时`}),e.jsx(xe,{label:"API 成本",id:"api-cost",note:"按输入 / 输出 token",children:n?s(r.api_cost):"未获取"}),e.jsx(xe,{label:"失败与取消损耗",id:"waste",noteId:"unknown",note:`已包含于总成本；未知 ${oe(r.unknown_cost_tasks)} 项`,children:n?s(r.failed_waste):"未获取"}),e.jsx(xe,{label:"任务数量",id:"tasks",compact:!1,noteId:"statuses",note:`完成 ${oe(r.done)} / 失败 ${oe(r.error)} / 取消 ${oe(r.canceled)}`,children:oe(r.tasks)})]})}const _e=[{key:"category",label:"按类型"},{key:"capability",label:"按能力"},{key:"worker",label:"按执行端"}];function as({data:n,failed:r}){const[t,a]=m.useState("category"),s=m.useRef({}),o=n?.[`by_${t}`]?.slice(0,10),l=Math.max(0,...(o??[]).map(d=>X(d.retail_mid)??0));function c(d,p){let g;switch(d.key){case"ArrowRight":case"ArrowDown":g=(p+1)%_e.length;break;case"ArrowLeft":case"ArrowUp":g=(p+_e.length-1)%_e.length;break;case"Home":g=0;break;case"End":g=_e.length-1;break;default:return}d.preventDefault();const u=_e[g];u&&(a(u.key),s.current[u.key]?.focus())}return e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"费用构成"}),e.jsx("p",{className:"section-subtitle",children:"按建议收费中值排序 / 每个视角前10项；条形为相对最大项，不是内部成本占比"})]}),e.jsx("span",{className:"muted small",id:"pricing",children:n?`计价版本 ${n.pricing_version??"未获取"} / 币种 ${n.currency??"未获取"}`:"等待计价信息"})]}),e.jsx("div",{className:"tabs f-pad-tabs",role:"tablist","aria-label":"费用构成视角",children:_e.map((d,p)=>e.jsx("button",{type:"button",role:"tab",id:`cost-tab-${d.key}`,"aria-controls":"cost-panel","aria-selected":t===d.key,tabIndex:t===d.key?0:-1,"data-cost-tab":d.key,ref:g=>{g?s.current[d.key]=g:delete s.current[d.key]},onClick:()=>a(d.key),onKeyDown:g=>c(g,p),children:d.label},d.key))}),e.jsx("div",{className:"f-cost-chart f-pad",id:"cost-panel",role:"tabpanel","aria-labelledby":`cost-tab-${t}`,tabIndex:0,children:n?o?o.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"这个周期内还没有费用构成"}),e.jsx("p",{children:"调整统计周期，或等待任务产生费用记录。"})]}):o.map((d,p)=>{const g=X(d.retail_mid),u=g!=null&&l>0?Math.max(0,Math.min(100,g/l*100)):null;return e.jsxs("div",{className:"f-rank",children:[e.jsxs("div",{children:[e.jsx("b",{title:d.key??void 0,children:d.label||d.key||"未记录"}),e.jsx("strong",{children:ns(d,n.currency)})]}),e.jsxs("p",{className:"muted small",children:[oe(d.tasks)," 项 · 已定价 ",oe(d.retail_known_tasks)," · 未定价"," ",oe(d.retail_unknown_tasks)," · 已知内部成本"," ",ze(d.total_cost,n.currency)]}),u!=null&&e.jsx("div",{className:"f-track",role:"meter","aria-label":`${d.label||d.key||""} 建议收费中值相对最大项`,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":u,children:e.jsx("i",{style:{width:`${u}%`}})})]},`${d.key??""}-${p}`)}):e.jsx("p",{className:"muted",children:"构成数据未获取，不以零元替代。"}):e.jsx("p",{className:"muted",children:r?"费用构成读取失败，请点击“重试读取”。":"正在读取费用构成…"})})]})}function Je({children:n}){return e.jsx("span",{className:"cell-secondary",children:n})}function ss({data:n,page:r,loadedPeriod:t,failed:a,changePage:s,openBasis:i}){const o=n?.jobs??[],l=Math.max(0,Math.ceil(o.length/ye)-1),c=o.slice(r*ye,(r+1)*ye),d=X(n?.overview.tasks);return e.jsxs("section",{className:"card",children:[e.jsxs("div",{className:"section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"费用明细"}),e.jsx("p",{className:"section-subtitle",id:"detail-note",children:n?`服务端合计 ${oe(n.overview.tasks)} 条 / 明细已载入 ${o.length} 条${d!=null&&d>o.length?"（接口最多2000条，非完整明细）":""}；汇总不以当前显示页相加替代`:a?"明细未获取，不以空记录或零元代替。":"正在读取；汇总不以当前明细页相加替代"})]}),e.jsx("button",{type:"button",className:"link-button",id:"cost-basis",onClick:i,children:"计价与成本口径"})]}),e.jsx("p",{className:"table-note",id:"period-note",children:n?`当前展示：${Qa(t)} · ${X(n.period?.from)===0?"全部历史":hn(n.period?.from)} — ${hn(n.period?.to)}（按任务创建时间）`:"统计周期正在读取"}),e.jsx("div",{className:"table-wrap",children:e.jsxs("table",{className:"cost-table",children:[e.jsx("thead",{children:e.jsx("tr",{children:["时间","状态 / 类型","项目 / 卡片","能力","执行端","耗时","收费依据","建议收费","内部成本 / 来源"].map(p=>e.jsx("th",{scope:"col",children:p},p))})}),e.jsx("tbody",{id:"job-rows",children:n?c.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:9,children:e.jsxs("div",{className:"empty-state",children:[e.jsx("b",{children:"这个周期内还没有费用记录"}),e.jsx("p",{children:"更换统计周期，或等待任务产生费用记录。"})]})})}):c.map((p,g)=>{const u=rs(p,n.currency);return e.jsxs("tr",{children:[e.jsxs("td",{children:[hn(p.created_at),e.jsx(Je,{children:p.job_id||"任务ID未记录"})]}),e.jsxs("td",{className:u.statusClass,children:[u.status,e.jsx(Je,{children:p.category_name||p.category||"类型未记录"})]}),e.jsxs("td",{className:"origin",children:[p.project_name||"未归属项目",e.jsx(Je,{children:p.card_name||"未记录卡片"})]}),e.jsx("td",{children:p.capability||"未记录"}),e.jsx("td",{children:p.worker_name||"未分配执行端"}),e.jsx("td",{children:Za(p.runtime_seconds)}),e.jsx("td",{className:u.basisClass,children:u.basis}),e.jsx("td",{children:u.retail}),e.jsxs("td",{children:[u.internal,e.jsx(Je,{children:u.source})]})]},`${p.job_id??""}-${g}`)}):e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"loading-note",children:a?"费用明细读取失败，请点击“重试读取”。":"正在读取费用明细…"})})})]})}),e.jsxs("div",{className:"f-pager",children:[e.jsx("span",{id:"page-note",children:n?`显示 ${o.length?r*ye+1:0}–${Math.min((r+1)*ye,o.length)} / 已载入 ${o.length} 条`:"尚未载入"}),e.jsx("button",{type:"button",id:"cost-prev",disabled:!n||r===0,onClick:()=>s(-1),children:"上一页"}),e.jsx("button",{type:"button",id:"cost-next",disabled:!n||r>=l,onClick:()=>s(1),children:"下一页"})]})]})}function is({onClose:n}){return e.jsx(ae,{title:"计价与成本口径",onClose:n,children:e.jsxs("div",{className:"f-stack",children:[e.jsx("p",{children:"建议收费区间与中值来自计价规则，不是已收款或实际收入。"}),e.jsx("p",{children:"收费依据支持按次、按段、分段数、输出秒和分辨率；未定价不等于免费。未完成任务不计建议收费，但可能产生内部损耗。"}),e.jsx("p",{children:"内部总成本 = 已知实际 + 已知历史估算；未知成本单列，不按零元处理。失败与取消损耗已包含于总成本，不重复相加。运行中累计成本尚可能变化。"}),e.jsx("p",{children:"统计周期以任务创建时间为准，按服务端全量聚合。费用明细最多读取2000条，每页10条；不能把当前显示明细当完整总额，也不从明细重算概览或费用构成。"}),e.jsx("p",{children:"GPU用量、电费、API token成本、实际与历史估算均沿用服务端口径；未记录的字段显示未知，不由前端推测单价或补算。"})]})})}function os(n){const r=Ya(n),[t,a]=m.useState(!1),s=r.busy?"正在读取…":r.error?"连接失败 · 快照非实时":r.updatedAt!=null?`最后刷新 ${new Date(r.updatedAt).toLocaleTimeString("zh-CN",{hour12:!1})} · 每15秒刷新`:"正在加载 · 每15秒刷新";return e.jsxs("main",{id:"main",tabIndex:-1,"aria-busy":r.busy?!0:void 0,children:[e.jsxs("div",{className:"page",children:[e.jsxs("header",{className:"card page-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"费用统计"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{className:"subtitle",children:"建议收费不是实际收入，未知成本不作零元"})})]}),e.jsxs("div",{className:"header-actions",children:[e.jsxs("label",{className:"filter-label",children:["统计周期",e.jsxs("select",{id:"period",value:r.selectedPeriod,onChange:i=>{const o=i.currentTarget.value;Wa(o)&&r.selectPeriod(o)},children:[e.jsx("option",{value:"0",children:"全部记录"}),e.jsx("option",{value:"7",children:"最近7天"}),e.jsx("option",{value:"30",children:"最近30天"}),e.jsx("option",{value:"90",children:"最近90天"})]})]}),e.jsx("span",{className:"muted small",id:"refresh-state",role:"status",children:s}),e.jsxs("button",{type:"button",className:"primary",id:"refresh",disabled:r.busy,onClick:r.refresh,children:[e.jsx(Fe,{name:"refresh"}),"立即刷新"]})]})]}),e.jsxs("div",{id:"error",className:"f-error",role:"alert",hidden:!r.error,children:[e.jsxs("div",{children:[e.jsx("b",{id:"error-message",children:r.error}),e.jsx("p",{children:"下方保留上次成功读取的周期与快照，不代表当前筛选的新数据；未知值不作零元。"})]}),e.jsx("button",{type:"button",id:"retry",onClick:r.retry,children:"重试读取"})]}),e.jsx(ts,{data:r.data}),e.jsx(as,{data:r.data,failed:r.error!=null}),e.jsx(ss,{data:r.data,page:r.page,loadedPeriod:r.loadedPeriod,failed:r.error!=null,changePage:r.changePage,openBasis:()=>a(!0)}),e.jsxs("section",{className:"card padded notice-box","aria-labelledby":"cost-rules-title",children:[e.jsx("h2",{id:"cost-rules-title",children:"计价与成本口径"}),e.jsx("p",{children:"建议收费区间与中值来自规则，不是已收款或实际收入；未定价不等于免费。未完成任务不计建议收费，但可能产生内部损耗。"}),e.jsx("p",{children:"内部总成本 = 已知实际 + 已知历史估算；未知成本单列，不按零元处理。失败与取消损耗已包含于总成本，不重复相加；运行中累计仍可能变化。"}),e.jsx("p",{children:"统计周期按任务创建时间筛选，合计与构成取服务端全量聚合。明细最多读取2000条并分页展示，当前明细页不代表全部成本。"})]})]}),t&&e.jsx(is,{onClose:()=>a(!1)})]})}const P=H().finite().nullable().optional(),G=C().nullable().optional(),De=kn(C(),B),Nr=R({gpus:F(R({name:G,memory_total_bytes:P}).catchall(B)).optional(),cpu:B.optional(),os:B.optional(),memory_total_bytes:P,host_id:G,environment_id:G,model_version:G,disk:G,note:G}).catchall(B),Qn=R({name:G,role:G,precision:B.optional(),precision_source:G,loader_dtype:B.optional()}).catchall(B),yn=R({source:G,complete:J().optional(),capability_name:G,models:F(Qn).optional(),auxiliary_models:F(Qn).optional()}).catchall(B),ls=R({source:C(),summary:yn,samples:P,measured:P}).catchall(B),ds=R({key:G,id:G,kind:G,width:B.optional(),height:B.optional(),duration:P,valid:J().nullable().optional(),outputs:B.optional(),samples:B.optional()}).catchall(B),cs=R({total_samples:P,recorded_samples:P,complete_samples:P,total_outputs:P,recorded_outputs:P,variants:F(B).optional()}).catchall(B),ps=R({dimensions:De.nullable().optional(),parameters:De.nullable().optional(),expected:De.nullable().optional(),model_version:G}).catchall(B),Sr={capability:C(),capability_name:G,worker_id:G,worker_name:G,source:C(),dimensions:De.nullable().optional(),spec:ps.nullable().optional(),output_resolution:cs.nullable().optional(),recovered_outputs:B.optional(),runtime_seconds:P,occupied_seconds:P,warnings:F(C()).optional()},ms=R({...Sr,id:C(),spec_key:G,config_id:G,config:Nr.nullable().optional(),config_source:G,cache_condition:B.optional(),samples:P,done:P,error:P,canceled:P,measured:P,mean_seconds:P,p50_seconds:P,p90_seconds:P,last_sample_at:P,reference_per_hour:P,output_count:P,unit:G,seconds_per_unit:P,qualified_seconds_per_unit:P,eligible:J().nullable().optional(),reviewed:P,accepted:P,benchmark_id:G,days:ce([F(C()),H(),ar()]).optional(),model_summary:yn.nullable().optional(),model_evidence:R({total_samples:P,recorded_samples:P,variants:F(ls).optional()}).catchall(B).nullable().optional(),current_model_reference:yn.nullable().optional()}).catchall(B),us=R({id:C(),name:G,state:C(),last_seen:P,hardware:Nr.nullable().optional(),hardware_source:G,agent_version:P,supports_capacity_telemetry:J().optional(),tasks:P,done:P,error:P,canceled:P,runtime_seconds:P}).catchall(B),$r=R({...Sr,job_id:C(),group_id:G,status:C(),created_at:P,attempts:B.optional(),outputs:F(ds).nullable().optional(),review:R({accepted:P,source:G,benchmark_id:G,note:G}).catchall(B).nullable().optional()}).catchall(B),hs=R({period:De.optional(),overview:kn(C(),H().finite().nullable()).default({}),workers:F(us).default([]),groups:F(ms).default([]),details:F($r).default([]),details_total:H().int().nonnegative()}).catchall(B),xs=R({details:F($r),details_total:H().int().nonnegative()}),zr=R({to:H().int(),mode:le("historical"),quality:le("technical"),availability:le(1),utilization:le(.75),worker_id:C().min(1),hours:H().finite().min(.1).max(24),price:H().finite().nonnegative().optional(),demands:F(R({group_id:C().min(1),quantity:H().finite().positive()})).min(1)}),fs=R({machines:P,total_seconds:P,daily_capacity_seconds:P,price_total:P,lines:F(R({group_id:C(),quantity:P,seconds_per_unit:P,daily_units:P}).catchall(B)).default([]),warnings:F(C()).default([]),assumptions:B.optional()}).catchall(B),Cr=R({host_id:C().max(160).optional(),cpu:C().max(160).optional(),memory_total_bytes:H().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),environment_id:C().max(160).optional(),model_version:C().max(160).optional(),disk:C().max(160).optional(),note:C().max(500).optional()}).strict(),Er=R({accepted:H().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),source:Be(["business","standard"]),benchmark_id:C().max(100),note:C().max(500)}),gs=R({processed:H().int().min(0).max(4),recorded:H().int().nonnegative(),total:H().int().nonnegative(),next_offset:H().int().nonnegative().nullable()}).refine(n=>n.recorded<=n.processed,"补采响应格式无效"),er=kn(C(),tr());class bs{constructor(r){this.http=r}http;path(r,t){return`/api/capacity?${new URLSearchParams({to:String(r.to),limit:"100",offset:String(t)})}`}report(r,t){return this.http.read(this.path(r,t),hs,{cache:"no-store"})}evidence(r,t){return this.http.read(this.path(r,t),xs,{cache:"no-store"})}async estimate(r){return fs.parse(await this.http.json("/api/capacity/estimate","POST",zr.parse(r)))}async profile(r,t){er.parse(await this.http.json(`/api/capacity/workers/${encodeURIComponent(r)}`,"POST",Cr.parse(t)))}async review(r,t){er.parse(await this.http.json(`/api/capacity/jobs/${encodeURIComponent(r)}/review`,"POST",Er.parse(t)))}async probe(r,t,a){const s=await this.http.json(`/api/capacity/jobs/${encodeURIComponent(r)}/probe-outputs`,"POST",{offset:H().int().nonnegative().parse(t)});a();const i=gs.safeParse(s);if(!i.success||i.data.next_offset!==null&&(i.data.next_offset<=t||i.data.next_offset>=i.data.total))throw Error("补采响应格式无效，请刷新看板核对结果");return i.data}}const Ae=n=>!!(n.group||n.status||n.source||n.size!==100);class ys{cache=null;pending=null;clear(){this.cache=null,this.pending=null}async all(r,t,a,s){if(!a())return null;if(this.cache?.snapshot===r)return this.cache.records;if(this.pending?.snapshot===r)return this.pending.promise;const i={snapshot:r,promise:Promise.resolve(null)};i.promise=(async()=>{const o=r.report.details_total,l=[];if(!Number.isSafeInteger(o)||o<0)throw Error("明细总数无效，请刷新后重试。");for(let c=0;c<o;c+=100){if(!a())return null;const d=c===r.offset?r.report:await t.evidence(r.range,c);if(!a())return null;if(d.details_total!==o||d.details.length!==Math.min(100,o-c))throw Error("任务证据在读取期间变化或分页不完整，请刷新后重新筛选。");l.push(...d.details),s(l.length,o)}if(new Set(l.map(c=>c.job_id)).size!==l.length)throw Error("任务证据分页出现重复，请刷新后重试。");return a()?(this.cache={snapshot:r,records:l},l):null})(),this.pending=i;try{return await i.promise}finally{this.pending===i&&(this.pending=null)}}}class vs{constructor(r,t){this.service=r,this.notify=t}service;notify;listeners=new Set;loadVersion=0;estimateVersion=0;evidenceVersion=0;appliedRange=null;appliedOffset=0;alive=!0;repository=new ys;mutations=new Set;value={report:null,snapshot:null,ready:!1,revision:0,refreshState:"正在读取全部历史聚合与本页证据…",error:"",writeStatus:"",tab:"machines",technicalOpen:!1,evidenceOpen:!1,mounted:new Set,filters:{group:"",status:"",source:"",size:100},evidence:{records:[],total:0,start:0,size:100,state:"",busy:!1,failed:!1},estimate:null,estimateNote:"填写每日需求后计算。没有样本的场景不能按零耗时处理。",estimateError:"",estimating:!1};getSnapshot=()=>this.value;subscribe=r=>(this.listeners.add(r),()=>{this.listeners.delete(r)});set(r){this.alive&&(this.value={...this.value,...r},this.listeners.forEach(t=>t()))}start(){this.alive=!0,this.load()}dispose(){this.alive=!1,this.loadVersion++,this.estimateVersion++,this.evidenceVersion++,this.repository.clear()}invalidateEstimate=(r="输入或证据已变更，请重新计算。")=>{this.estimateVersion++,this.set({estimate:null,estimateNote:r,estimateError:"",estimating:!1})};resetSnapshot(){this.repository.clear(),this.evidenceVersion++,this.set({snapshot:null,ready:!1})}clear(){this.resetSnapshot(),this.set({report:null,mounted:new Set,evidence:{records:[],total:0,start:0,size:100,state:"",busy:!1,failed:!1}})}activeMounts(){const r=new Set([this.value.tab]);return this.value.tab==="machines"&&this.value.technicalOpen&&r.add("technical"),this.value.evidenceOpen&&r.add("evidence"),r}async load(r=!0,t){const a=r?{to:Math.floor(Date.now()/1e3)}:this.appliedRange;if(!a)return;const s=++this.loadVersion,i=Object.freeze({...a}),o=r?0:t??this.appliedOffset;this.resetSnapshot(),this.invalidateEstimate("证据正在刷新，旧测算已清除。"),this.set({error:"",refreshState:"正在读取全部历史聚合与本页证据…",evidence:{...this.value.evidence,state:""}});try{const l=await this.service.report(i,o);if(!this.alive||s!==this.loadVersion)return;const c=Object.freeze({report:l,range:i,version:s,offset:o});this.appliedRange=i,this.appliedOffset=o;const d={...this.value.filters};if(l.groups.some(p=>p.id===d.group)||(d.group=""),this.set({report:l,snapshot:c,ready:!0,revision:this.value.revision+1,mounted:this.activeMounts(),filters:d,evidence:{records:l.details,total:l.details_total,start:o,size:100,state:"",busy:!1,failed:!1}}),this.value.evidenceOpen&&Ae(d)&&await this.filterEvidence(0),!this.alive||s!==this.loadVersion)return;this.set({refreshState:`最后刷新：${new Date().toLocaleTimeString("zh-CN",{hour12:!1})}`})}catch(l){if(!this.alive||s!==this.loadVersion)return;this.clear();const c=`读取产能数据失败：${ee(l)}。请点击立即刷新重试。`;this.set({error:c,refreshState:"读取失败"}),this.notify(c)}}activate(r){this.set({tab:r}),this.mount()}technical(r){this.set({technicalOpen:r}),this.mount()}evidenceOpen(r){this.set({evidenceOpen:r}),this.mount()}mount(){if(!this.value.ready)return;const r=this.value.mounted.has("evidence"),t=new Set([...this.value.mounted,...this.activeMounts()]);this.set({mounted:t}),!r&&t.has("evidence")&&Ae(this.value.filters)&&this.filterEvidence(0)}showEvidence(r=""){!this.value.ready||!this.value.snapshot||(this.set({evidenceOpen:!0,filters:{...this.value.filters,group:r,status:"",source:""},mounted:new Set([...this.value.mounted,"evidence"])}),this.filterEvidence(0))}filter(r){this.value.ready&&(this.set({filters:{...this.value.filters,...r}}),this.filterEvidence(0))}current(r){return this.alive&&this.value.ready&&this.value.snapshot===r&&r.version===this.loadVersion&&this.value.report===r.report}async filterEvidence(r){const t=this.value.snapshot;if(!t||!this.current(t)||!this.value.mounted.has("evidence"))return;const a=++this.evidenceVersion,s=this.value.filters;if(!Ae(s)){if(t.offset!==0){await this.load(!1,0);return}this.set({evidence:{records:t.report.details,total:t.report.details_total,start:0,size:100,state:"",busy:!1,failed:!1}});return}this.set({evidence:{records:[],total:0,start:0,size:s.size,state:"正在读取同一截止时间下的真实分页证据，完成后筛选；不会按当前页冒充全部任务。",busy:!0,failed:!1}});try{const i=await this.repository.all(t,this.service,()=>this.current(t),(c,d)=>{this.current(t)&&Ae(this.value.filters)&&this.set({evidence:{...this.value.evidence,state:`正在读取真实分页证据 ${c} / ${d} 条；聚合统计保持不变。`}})});if(!i||!this.current(t)||a!==this.evidenceVersion)return;const o=i.filter(c=>(!s.group||c.group_id===s.group)&&(!s.status||c.status===s.status)&&(!s.source||c.source===s.source)),l=Math.min(r,Math.max(0,Math.ceil(o.length/s.size)-1)*s.size);this.set({evidence:{records:o.slice(l,l+s.size),total:o.length,start:l,size:s.size,state:`筛选 ${o.length} / 全集 ${i.length} 条；只改变明细，聚合统计不受筛选或分页影响。`,busy:!1,failed:!1}})}catch(i){if(!this.current(t)||a!==this.evidenceVersion)return;this.set({evidence:{records:[],total:0,start:0,size:s.size,state:`证据筛选失败：${ee(i)}。请立即刷新后重试。`,busy:!1,failed:!0}})}}page(r){const{ready:t,evidence:a,mounted:s,snapshot:i,filters:o}=this.value;if(!t||!i||!s.has("evidence")||a.busy||a.failed)return;const l=Math.max(0,a.start+r*a.size);r>0&&l>=a.total||(Ae(o)?this.filterEvidence(l):this.load(!1,l))}async estimate(r){if(this.invalidateEstimate("正在计算…"),!this.value.ready||!this.value.snapshot){this.estimateFailure("请先点击立即刷新并成功读取证据。");return}const t=this.estimateVersion,a=this.value.snapshot,s=this.value.revision;this.set({estimating:!0});try{const i=await this.service.estimate(r);if(t!==this.estimateVersion||s!==this.value.revision||!this.current(a))return;const l={...a.report.workers.find(d=>d.id===r.worker_id)?.hardware};delete l.note;const c={result:i,payload:r,groups:a.report.groups.filter(d=>r.demands.some(p=>p.group_id===d.id)),hardware:l};this.set({estimate:c,estimating:!1})}catch(i){t===this.estimateVersion&&this.estimateFailure(`测算失败：${ee(i)}`)}}estimateFailure(r){this.set({estimate:null,estimating:!1,estimateNote:"本次未产生测算结果，请检查证据与输入后重试。",estimateError:r}),this.notify(r)}async mutate(r,t,a){if(this.mutations.has(r))throw Error("正在保存，请勿重复提交。");this.mutations.add(r);const s=this.loadVersion;this.set({writeStatus:""}),this.invalidateEstimate(`${t}正在保存，旧测算已清除。`);try{if(await a(),!this.alive)return;s===this.loadVersion?await this.load(!1):(this.loadVersion++,this.clear(),this.invalidateEstimate("证据已更新，请点击立即刷新后重新计算。"),this.set({refreshState:`${t}已更新，请点击立即刷新`})),this.set({writeStatus:`${t}已保存。人工声明不回写历史快照，也不代表自动验证通过。`})}finally{this.mutations.delete(r)}}saveProfile(r,t){return this.mutate(`profile:${r}`,"机器配置",()=>this.service.profile(r,t))}saveReview(r,t){return this.mutate(`review:${r}`,"人工标记",()=>this.service.review(r,t))}probe(r,t){return this.service.probe(r,t,this.probeWritten)}probeVersion(){return this.loadVersion}probeCurrent(r){return this.alive&&r===this.loadVersion&&this.value.report!==null}probeWritten=()=>{this.resetSnapshot(),this.invalidateEstimate("成品尺寸证据已更新，请刷新看板后重新计算。")}}function js({http:n,notify:r}){const t=m.useMemo(()=>new vs(new bs(n),s=>r({message:s,tone:"error"})),[n,r]),a=m.useSyncExternalStore(t.subscribe,t.getSnapshot);return m.useEffect(()=>(t.start(),()=>t.dispose()),[t]),{controller:t,state:a}}const ws={historical:"历史运行参考",captured:"采集业务样本",standard:"标准样本（人工标签）"},Mn={idle:"在线空闲",online:"在线",busy:"运行中",running:"运行中",offline:"离线",disabled:"已禁用",syncing:"同步中",unavailable:"执行环境不可用",historical:"历史执行端",error:"异常",done:"已完成",canceled:"已取消",queued:"排队中",assigned:"已分配"},L=n=>typeof n=="number"&&Number.isFinite(n),E=n=>n==null||n===""?"未知":typeof n=="object"?JSON.stringify(n):String(n),$=n=>L(n)?n.toLocaleString("zh-CN",{maximumFractionDigits:2}):"未知",Y=n=>L(n)?`${$(n)} 秒`:"未知",Le=n=>L(n)?new Date(n*1e3).toLocaleString("zh-CN",{hour12:!1}):"未知",Ie=n=>L(n)?`${$(n/1024**3)} GiB`:"未知",de=n=>ws[n]||`来源未知（${E(n)}）`,Pn=n=>Array.isArray(n.days)?n.days.length:n.days,Ce=n=>n.capability_name?.trim()?n.capability_name:E(n.capability),Mr=n=>Ce(n)===n.capability?Ce(n):`${Ce(n)}（${n.capability}）`,an=n=>typeof n=="string"&&{reported:"机器上报",manual:"人工声明","manual+reported":"机器上报 + 人工声明",unknown:"未知"}[n]||"未知";function Rn(n){return n&&typeof n=="object"&&!Array.isArray(n)?n:{}}function Ue(n,r){if(!n||typeof n!="object")return E(n);const t=Rn(n);return(r==="cpu"?[t.model,t.architecture,L(t.logical_cores)?`${$(t.logical_cores)} 逻辑核`:null]:[t.name,t.release,t.version]).filter(s=>s!=null&&s!=="").map(E).join(" / ")||"未知"}function We(n){return n?`GPU ${n.gpus?.length?n.gpus.map(t=>`${E(t.name)} / 单卡 ${Ie(t.memory_total_bytes)}`).join("；"):"未知"}；CPU ${Ue(n.cpu,"cpu")}；内存 ${Ie(n.memory_total_bytes)}；系统 ${Ue(n.os,"os")}；环境 ${E(n.environment_id)}；模型版本 ${E(n.model_version)}；磁盘 ${E(n.disk)}；主机 ID ${E(n.host_id)}`:"未知"}function _s(n){const r=n.hardware,t=(r?.gpus||[]).map(a=>[a.name,L(a.memory_total_bytes)?Ie(a.memory_total_bytes):null].filter(Boolean).join(" / ")).filter(Boolean);return L(r?.memory_total_bytes)&&t.push(`系统内存 ${Ie(r.memory_total_bytes)}`),t.join("；")||"尚未采集硬件信息"}function ks(n){const r=n.hardware;return!r?.cpu||!r.host_id?L(n.agent_version)&&n.agent_version<4||n.supports_capacity_telemetry===!1?"旧版采集程序缺少 CPU 等信息，请升级该 Worker 后补采；已有 GPU 与内存记录仍可查看。":"CPU 或主机信息尚未采集，请检查该 Worker 的采集上报。":!r.environment_id||!r.model_version?"环境或模型版本的人工声明未填写，可在“详细统计与机器配置”中补录。":"当前配置不代表历史任务的执行配置；历史依据见各业务详情。"}const he=n=>["idle","busy","online","running"].includes(n.state),Ze=n=>L(n.mean_seconds)&&n.mean_seconds>=0&&L(n.measured)&&n.measured>0;function Ns(n){if(!L(n)||n<0)return"暂无成功耗时";if(n<1)return`${$(n)} 秒`;const r=Math.round(n),t=Math.floor(r/60),a=r%60;return t?`${$(t)} 分 ${a} 秒`:`${a} 秒`}function sn(n){const r={...n.spec?.dimensions,...n.dimensions},t=[["图片",r.image_count,"张"],["视频",r.video_count,"段"],["音频",r.audio_count,"段"]],a=s=>L(s)&&Number.isSafeInteger(s)&&s>=0;return t.every(([,s])=>!a(s))?["素材信息未记录"]:t.every(([,s])=>s===0)?["未使用图片、视频或音频"]:t.flatMap(([s,i,o])=>a(i)?i>0?[`${s} ${$(i)} ${o}`]:[]:[`${s}数量未记录`])}function Pr(n,r){const t=i=>L(i)&&Number.isSafeInteger(i)&&i>0,a=typeof n.resolution=="string"?n.resolution.match(/^(\d+)\s*[x×]\s*(\d+)(?:\s*\(\d+:\d+\))?$/i):null,s=[[n.output_width,n.output_height],[n.width,n.height],[a?Number(a[1]):null,a?Number(a[2]):null],[r.width,r.height,"期望 "]];for(const[i,o,l=""]of s)if(t(i)&&t(o)){const d={"640x360":"360p","640x480":"480p","854x480":"480p","1280x720":"720p","1920x1080":"1080p","2560x1440":"1440p","3840x2160":"4K"}[`${Math.max(i,o)}x${Math.min(i,o)}`];return d?`${l}${d}${i<o?" 竖屏":""}（${$(i)} × ${$(o)}）`:`${l||"尺寸 "}${$(i)} × ${$(o)}`}return L(n.megapixels)&&n.megapixels>0&&L(n.megapixels*100)?`约 ${$(n.megapixels*100)} 万像素（尺寸未记录）`:null}function on(n,r=!1){const t={...n.spec?.parameters,...n.spec?.dimensions,...n.dimensions},a=n.spec?.expected||{},s=[],i=t.output_duration??t.duration??a.duration;L(i)&&s.push(`请求时长 ${$(i)} 秒`);const o=Pr(t,a);if(o&&s.push(o),r){L(t.megapixels)&&t.megapixels>0&&s.push(`像素设置 ${$(t.megapixels)} MP`);const l=[["帧率",t.output_fps??t.target_fps??t.fps??t.force_rate??a.fps," FPS"],["步数",t.steps," 步"],["帧数",t.frames," 帧"],["长边",t.scale_to_length," px"],["批量",t.batch_size,""]];for(const[c,d,p]of l)L(d)&&s.push(`${c} ${$(d)}${p}`)}return s.join(" / ")||"规格未完整记录"}function Rr(n){return(n?.variants||[]).flatMap(r=>{const t=Rn(r);return typeof t.kind=="string"&&["image","video"].includes(t.kind)&&L(t.width)&&Number.isSafeInteger(t.width)&&t.width>0&&L(t.height)&&Number.isSafeInteger(t.height)&&t.height>0?[{kind:t.kind,width:t.width,height:t.height,outputs:t.outputs,samples:t.samples}]:[]})}function In(n){return`${n.kind==="image"?"图片":"视频"} · ${Pr({width:n.width,height:n.height},{})}`}function Ss(n){return L(n.width)&&L(n.height)&&Number.isSafeInteger(n.width)&&Number.isSafeInteger(n.height)&&n.width>0&&n.height>0&&["image","video"].includes(n.kind||"")?In({kind:n.kind||"",width:n.width,height:n.height}):"尺寸未记录"}const $s=n=>`${sn(n).join(" + ")}｜${on(n)}`;function zs(n){const r=t=>Ze(t)?t.source!=="historical"&&L(t.last_sample_at)?3:t.source==="historical"?2:1:0;return[...n].sort((t,a)=>r(a)-r(t)||(r(t)===3?(a.last_sample_at||0)-(t.last_sample_at||0):0)||(a.samples||0)-(t.samples||0)||(a.measured||0)-(t.measured||0))[0]}function Ln(n){const r=[...n.warnings||[]],t=Pn(n);return(!L(n.samples)||n.samples<30||!L(t)||t<3)&&r.push("参考样本不足：建议至少 30 个任务且跨 3 天；达到门槛也不是置信保证。"),n.source==="historical"&&r.push("仅成功任务 runtime 参考，未计完整占机、重试及质量损耗；不是合格日产能。"),n.eligible!==!0&&r.push("完整基线证据不足，不作为已验证采购依据。"),[...new Set(r)]}const Ee=n=>{const r={task:"任务",tasks:"任务",image:"张图片",images:"张图片",video:"条视频",videos:"条视频",second:"视频秒",seconds:"视频秒",video_seconds:"视频秒"};return n.source==="historical"?"任务":r[n.unit||""]||E(n.unit)};function Ir(n){const r=Object.hasOwn(n,"model_evidence"),t=n.model_evidence;return{variants:r?(t?.variants||[]).filter(s=>["task_snapshot","archived_task"].includes(s.source)):n.model_summary?.source==="task_snapshot"?[{source:"task_snapshot",summary:n.model_summary,samples:null,measured:null}]:[],hasEvidence:r,total:t?.total_samples,recorded:t?.recorded_samples,reference:n.current_model_reference?.source==="current_template"?n.current_model_reference:null}}const Ne=n=>n?.models||[];function Cs(n,r,t){const s={high_noise:"高噪声",low_noise:"低噪声",高噪声:"高噪声",低噪声:"低噪声",base:"基础模型",refiner:"精修模型",生成主模型:"生成主模型",深度模型:"深度模型",放大模型:"放大模型",插帧模型:"插帧模型"}[n.role||""];return s?`${s} · 主模型 ${r+1}`:t>1?`主模型 ${r+1}`:""}function vn(n){const r=[];if(n.precision&&n.precision_source==="filename"&&r.push(`文件标记 ${E(n.precision)}`),n.loader_dtype){const t=E(n.loader_dtype),a=t.split(/\s*\/\s*/).map(i=>i.match(/^(bfloat16|bf16|float(?:8|16|32|64)|fp(?:8|16|32|64))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]),s=a.every(Boolean)?[...new Set(a.map(i=>i?.toUpperCase().replace("BFLOAT16","BF16").replace("FLOAT","FP")))].join(" / "):null;r.push(`加载配置 ${s?`${s}（${t}）`:t}${["default","auto"].includes(t.toLowerCase())?"（实际精度未确认）":""}`)}else n.precision&&n.precision_source==="loader"&&r.push(`加载配置 ${E(n.precision)}`);return r.length||r.push("精度未记录 / 待确认"),r}function Es(n){const r=i=>{if(typeof i!="string")return null;const o=i.split(/\s*\/\s*/).map(l=>l.trim().match(/^(bfloat16|float(?:8|16|32|64)|bf16|fp(?:4|8|16|32|64)|int(?:4|8|16)|nf4|q[2-8]_(?:k(?:_[sml])?|[01]))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]);return o.every(Boolean)?[...new Set(o.map(l=>l?.toUpperCase().replace("BFLOAT16","BF16").replace("FLOAT","FP")))].sort().join(" / "):null},t=n.precision_source==="filename"?r(n.precision):null,a=r(n.loader_dtype)||(n.precision_source==="loader"?r(n.precision):null),s=vn(n).filter(i=>i.startsWith("文件标记 ")?!!t:i.startsWith("加载配置 ")?!!a||["default","auto"].includes(String(n.loader_dtype).toLowerCase()):!1);return s.some(i=>i.startsWith("文件标记 "))||s.unshift("文件标记未记录 / 待确认"),s.some(i=>i.startsWith("加载配置 "))||s.push("加载配置未记录 / 待确认"),s}function Lr(n){return JSON.stringify([n.capability,n.spec_key||`unknown:${n.id}`,n.source,n.spec?.model_version||null,n.config?.model_version||null,n.config?.environment_id||null,n.source==="standard"?n.benchmark_id||`unknown:${n.id}`:null,n.cache_condition||null])}function Ms(n){const r=new Map,t={none:"无节点结果缓存",loaders:"加载节点缓存",execution:"执行节点缓存",unknown:"未知",mixed:"混合条件"};for(const a of n){const s=Rn(a.cache_condition).kind;r.set(Lr(a),`${Mr(a)} / ${E(a.spec_key)} / ${de(a.source)} / 模型 ${E(a.spec?.model_version||a.config?.model_version)} / 环境 ${E(a.config?.environment_id)} / 缓存 ${typeof s=="string"&&t[s]||"未知"}${a.source==="standard"?` / 基准 ${E(a.benchmark_id)}`:""}`)}return[...r]}function An(n,r,t,a=[]){return`${r||t.find(s=>s.id===n)?.name||a.find(s=>s.worker_id===n)?.worker_name||"未关联执行端"}（${n||"Worker ID 未知"}）`}function Ps(n){return n.review?.source==="standard"?"标准样本（人工声明）":n.review?.source==="business"?"业务样本":"未标记"}function Ar({title:n,children:r,className:t}){const[a,s]=m.useState(!1);return e.jsxs("details",{className:t,onToggle:i=>{i.currentTarget.open&&s(!0)},children:[e.jsx("summary",{children:n}),a&&(typeof r=="function"?r():r)]})}function Qe({title:n,value:r,className:t}){return e.jsx(Ar,{title:n,className:t,children:()=>e.jsx("pre",{children:E(r)})})}function ln({values:n=[],className:r="warn"}){return e.jsx("ul",{className:r,children:n.map((t,a)=>e.jsx("li",{children:t},a))})}function jn({items:n}){return n.map(([r,t])=>e.jsxs("div",{className:"metric",children:[e.jsx("span",{children:r}),e.jsx("strong",{children:$(t)})]},r))}function Tn({headers:n,children:r}){return e.jsx("div",{className:"scroll",tabIndex:0,role:"region","aria-label":n.join(" / "),children:e.jsxs("table",{children:[e.jsx("thead",{children:e.jsx("tr",{children:n.map(t=>e.jsx("th",{scope:"col",children:t},t))})}),e.jsx("tbody",{children:r})]})})}function Tr({resolution:n}){const r=Rr(n);return e.jsxs(e.Fragment,{children:[r.length?e.jsxs(e.Fragment,{children:[new Set(r.map(t=>`${t.width}x${t.height}`)).size>1&&e.jsx("span",{className:"hint",children:"多种成品规格（非单一尺寸）"}),r.map((t,a)=>e.jsx("span",{className:"resolution-variant",children:In(t)},a))]}):e.jsx("span",{children:"尺寸未记录"}),L(n?.total_samples)&&n.total_samples>0&&n.complete_samples!==n.total_samples&&e.jsxs("span",{className:"resolution-coverage hint",children:["已知 ",$(n.recorded_samples)," / ",$(n.total_samples)," ","次任务的部分或全部成品"]})]})}function Dr({resolution:n}){return e.jsxs("div",{className:"output-resolution-details",children:[e.jsx("h3",{children:"实际成品"}),e.jsx("div",{className:"actual-resolution",children:e.jsx(Tr,{resolution:n})}),e.jsxs("p",{children:["尺寸覆盖：",$(n?.recorded_samples)," / ",$(n?.total_samples)," ","次已完成任务至少有一个成品尺寸；",$(n?.complete_samples)," /"," ",$(n?.total_samples)," 次已完成任务的全部最终产物都有尺寸。"]}),e.jsxs("p",{children:["已知尺寸产物 ",$(n?.recorded_outputs)," / ",$(n?.total_outputs)," 个",n?.total_outputs==null?"（最终清单不完整，产物总数未知）":"","。"]}),Rr(n).map((r,t)=>e.jsxs("p",{children:[In(r),"：",$(r.outputs)," 个产物 / ",$(r.samples)," 次任务"]},t)),e.jsx("p",{className:"hint",children:"同一任务可能包含多种尺寸，各尺寸的任务数不能相加。尺寸来自最终产物记录或受控补采，与技术合格产量、人工验收和采购资格分离；有尺寸不代表技术合格。平均耗时仍为原组成功任务平均，不按尺寸重算。"})]})}function nr({summary:n,origin:r}){const t=Ne(n);return e.jsxs("div",{className:"model-reference",children:[e.jsx("p",{className:"model-origin",children:r}),n.complete===!1&&e.jsx("p",{className:"warn",children:"不完整 / 未确认完整主模型链；动态选择或未知链路不能推断全部主模型。"}),!t.length&&e.jsx("p",{children:"未获取到模型信息，模型待确认。"}),t.map((a,s)=>e.jsx("p",{children:`${Cs(a,s,t.length)||"主模型"}：${E(a.name)}；角色：${E(a.role)}；${vn(a).join("；")}；非运行时检测`},s)),!!n.auxiliary_models?.length&&e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"hint",children:"辅助模型（不计入主模型名称或精度）"}),n.auxiliary_models?.map((a,s)=>e.jsx("p",{className:"hint",children:`角色：${E(a.role)}；${E(a.name)}；${vn(a).join("；")}`},s))]})]})}function Fr({g:n}){const r={...n.spec?.dimensions,...n.dimensions},t=Ir(n);return e.jsxs("div",{className:"pad",children:[e.jsxs("p",{children:["输入素材：",sn(n).join(" / ")]}),e.jsxs("p",{children:["生成参数：",on(n,!0)]}),L(r.source_duration)&&e.jsxs("p",{className:"hint",children:["首个输入视频时长：",$(r.source_duration)," 秒（非多段视频合计）"]}),e.jsx("p",{className:"hint",children:"素材数量按任务输入槽位计，同一文件被多次引用也会分别计数；生成参数不是成品实测规格。"}),e.jsxs("p",{children:["来源：",de(n.source),"；有效耗时样本 ",$(n.measured)," / 总样本 ",$(n.samples),"；成功"," ",$(n.done)," / 失败 ",$(n.error)," / 取消 ",$(n.canceled)]}),e.jsxs("p",{children:["mean：",Y(n.mean_seconds),"；P50：",Y(n.p50_seconds),"；P90：",Y(n.p90_seconds),"；最近成功样本：",Le(n.last_sample_at)]}),e.jsx("p",{className:"hint",children:"平均值仅使用该组成功任务执行耗时；不包含排队，不等于纯 GPU 计算时间，也不是合格日产能。"}),e.jsxs("p",{children:["执行时配置：",We(n.config),"（",an(n.config_source),"）"]}),e.jsxs("p",{children:["缓存条件：",E(n.cache_condition)]}),e.jsxs("p",{children:["成功 runtime 合计：",Y(n.runtime_seconds),"；占机合计：",Y(n.occupied_seconds),"；实际产出：",$(n.output_count)," ",Ee(n),"。"]}),e.jsxs("p",{children:["单位技术交付：",Y(n.seconds_per_unit)," / ",Ee(n),"；单位人工合格：",Y(n.qualified_seconds_per_unit)," / ",Ee(n),"；已人工验收：",$(n.reviewed),"；全组人工合格数量：",$(n.accepted),"。"]}),e.jsxs("p",{className:"hint",children:["技术基线资格：",n.eligible===!0?"服务端判定具备完整基线证据":n.eligible===!1?"证据不足，不作为已验证采购依据":"未记录","；标准场景编号：",E(n.benchmark_id),"。"]}),e.jsx(Dr,{resolution:n.output_resolution}),t.hasEvidence&&e.jsxs("p",{children:["模型记录覆盖 ",$(t.recorded)," / ",$(t.total)," ","次；覆盖数不是完整主模型链的确认。"]}),t.variants.length>1&&e.jsx("p",{className:"warn",children:"不同任务记录对应不同模型组合；每个组合内的主模型才属于同一个图。全组平均耗时不代表任一组合的专属速度。"}),!t.variants.length&&e.jsx("p",{children:"历史未记录可用主模型证据；不能用当前模板补写历史模型与精度。"}),t.variants.map((a,s)=>e.jsx(nr,{summary:a.summary,origin:`历史任务记录组合 ${s+1} · ${a.source==="archived_task"?"保留的原任务记录":"任务提交记录"}${t.hasEvidence?` · ${$(a.samples)} 次记录 / ${$(a.measured)} 次成功耗时`:""}`},s)),t.reference?e.jsxs(e.Fragment,{children:[e.jsx(nr,{summary:t.reference,origin:`当前工具默认配置（非历史执行记录）· ${E(t.reference.capability_name)}`}),e.jsx("p",{className:"warn hint",children:"仅为工具模板默认值，不代表用户画布节点当前选中的模型。历史耗时不代表当前模型速度；参考信息不补齐历史覆盖，也不覆盖历史精度。"})]}):!t.variants.length&&e.jsx("p",{className:"hint",children:"未获取到模型信息：当前工具模板未提供、找不到或无法识别。"}),e.jsx(ln,{values:Ln(n)}),e.jsxs("p",{className:"hint",children:["采样日期：",E(n.days),"；配置编号：",E(n.config_id),"；采样编号：",n.id]}),e.jsx(Qe,{title:"原始规格与证据",value:{dimensions:n.dimensions,spec:n.spec,output_resolution:n.output_resolution,recovered_outputs:n.recovered_outputs,model_summary:n.model_summary,model_evidence:n.model_evidence,current_model_reference:n.current_model_reference,cache_condition:n.cache_condition}})]})}function Or({groups:n,report:r}){return n.length?e.jsx(Tn,{headers:["业务 / 执行端 / 来源","精确业务规格","样本覆盖","成功任务耗时分布","运行参考 / 产出口径","警告与限制"],children:n.map(t=>e.jsxs("tr",{"data-group-id":t.id,children:[e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsx("strong",{children:Ce(t)}),e.jsxs("p",{className:"hint",children:["能力 ID：",t.capability]}),e.jsx("p",{className:"hint",children:An(t.worker_id,t.worker_name,r.workers,r.groups)}),e.jsx("span",{className:"badge",children:de(t.source)}),e.jsxs("p",{className:"hint",children:["配置：",E(t.config_id)]}),t.source==="standard"&&e.jsxs("p",{className:"hint",children:["标准场景编号：",E(t.benchmark_id)]})]})}),e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsxs("p",{children:["规格键：",E(t.spec_key)]}),e.jsxs("p",{className:"hint",children:["已知规格：",E(t.dimensions)]}),e.jsx(Ar,{title:"配置 / 规格 / 日期证据",children:()=>e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["执行时配置：",We(t.config)]}),e.jsxs("p",{children:["配置来源：",an(t.config_source)]}),e.jsxs("p",{children:["采样日期（服务端记录）：",E(t.days)]}),e.jsxs("p",{children:["缓存条件：",E(t.cache_condition)]}),e.jsx("pre",{children:E(t.spec)})]})})]})}),e.jsx("td",{children:e.jsxs("div",{children:[e.jsxs("p",{children:["样本 ",$(t.samples)," / ",$(Pn(t))," 天"]}),e.jsxs("p",{children:["完成 ",$(t.done)," / 失败 ",$(t.error)," / 取消 ",$(t.canceled)]}),e.jsxs("p",{className:"hint",children:["有效耗时样本 ",$(t.measured),"；已人工验收 ",$(t.reviewed)]})]})}),e.jsx("td",{children:e.jsxs("div",{children:[e.jsxs("p",{children:["平均 ",Y(t.mean_seconds)]}),e.jsxs("p",{children:["P50 ",Y(t.p50_seconds)]}),e.jsxs("p",{children:["P90 ",Y(t.p90_seconds)]})]})}),e.jsx("td",{className:"wide",children:e.jsxs("div",{children:[e.jsxs("p",{children:["成功任务 runtime 合计 ",Y(t.runtime_seconds)]}),e.jsxs("p",{children:["成功任务 / 运行小时（仅 runtime 参考）：",$(t.reference_per_hour)]}),t.source!=="historical"&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["占机合计 ",Y(t.occupied_seconds)]}),e.jsxs("p",{children:["实际产出 ",$(t.output_count)," ",Ee(t)]}),e.jsxs("p",{children:["单位技术交付 ",Y(t.seconds_per_unit)," / ",Ee(t)]}),e.jsxs("p",{children:["单位人工合格 ",Y(t.qualified_seconds_per_unit)," / ",Ee(t)]})]})]})}),e.jsx("td",{className:"wide",children:e.jsx(ln,{values:Ln(t)})})]},t.id))}):e.jsx("p",{className:"empty",children:"暂无业务规格样本；未测试场景不能推算产能。"})}function Rs({items:n}){return e.jsx("dl",{children:n.map(([r,t])=>e.jsxs(m.Fragment,{children:[e.jsx("dt",{children:r}),e.jsx("dd",{children:t})]},r))})}function Is({entries:n,worker:r,title:t,ready:a,onEvidence:s}){const[i,o]=m.useState(()=>zs(n)?.id||""),[l,c]=m.useState(!1),[d,p]=m.useState(!1),g=`summary-evidence-${m.useId().replace(/[^a-zA-Z0-9_-]/g,"")}`,u=n.find(k=>k.id===i)||n[0];if(!u)return null;const y=Ir(u),_=y.variants.length?y.variants.map(k=>k.summary):y.reference?[y.reference]:[],j=_.reduce((k,T)=>k+Math.max(1,Ne(T).length),0)||1,v=n.map($s),x=new Map;for(const k of v)x.set(k,(x.get(k)||0)+1);const h=y.variants.length?y.variants.length>1||y.hasEvidence&&L(y.recorded)&&L(y.total)&&y.recorded<y.total||y.variants.some(k=>k.summary.complete===!1)?"全组历史任务平均，非某个模型或组合专属速度。":"":y.reference?"此处耗时来自历史任务，不代表当前模型速度。":"",f={"--model-rows":j+1};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"business-row","data-capability":u.capability,"data-selected-group-id":u.id,children:[e.jsxs("div",{className:"matrix-field","data-label":"平均生成时间",children:[e.jsx("span",{className:Ze(u)?"mean-time":"muted",children:Ze(u)?Ns(u.mean_seconds):"暂无成功耗时"}),h&&e.jsx("p",{className:"warn hint",children:h}),Ze(u)&&L(u.mean_seconds)&&(u.mean_seconds<1||u.mean_seconds>3600)&&e.jsx("p",{className:"warn hint",children:"耗时异常，请核对详情"})]}),e.jsxs("div",{className:"matrix-samples","data-label":"样本与详情",children:[e.jsxs("p",{className:!L(u.measured)||u.measured<30?"warn hint":"hint",children:[L(u.measured)?u.measured<30?`仅 ${$(u.measured)} 次 / 仅供参考`:`${$(u.measured)} 次成功实测`:"样本数未记录"," ","· ",de(u.source)]}),e.jsx("button",{type:"button",className:"summary-detail-toggle","aria-expanded":l,"aria-controls":g,onClick:()=>{c(!l),l||p(!0)},children:l?"收起详情":"查看详情"})]}),e.jsxs("div",{className:"matrix-field","data-label":"任务规格",children:[e.jsx("select",{className:"summary-spec",disabled:!a,"aria-label":`${r.name||"机器"} ${t}任务规格`,title:`原组 ${u.id} / 配置 ${E(u.config_id)} / ${de(u.source)} / 规格键 ${E(u.spec_key)}`,value:u.id,onChange:k=>{a&&(o(k.target.value),p(l))},children:n.map((k,T)=>e.jsx("option",{value:k.id,children:`${v[T]}${(x.get(v[T]||"")||0)>1?` · ${de(k.source)} · ${L(k.last_sample_at)?Le(k.last_sample_at):"日期未记录"} · 采样 ${T+1}`:""}`},k.id))}),e.jsxs("dl",{className:"selected-spec",children:[e.jsx("dt",{children:"输入素材"}),e.jsx("dd",{className:"input-materials",children:sn(u).map(k=>e.jsx("span",{children:k},k))}),e.jsx("dt",{children:"生成参数"}),e.jsx("dd",{className:"generation-parameters",children:on(u)}),e.jsx("dt",{children:"实际成品"}),e.jsx("dd",{className:"actual-resolution",children:e.jsx(Tr,{resolution:u.output_resolution})})]})]}),e.jsxs("div",{className:"matrix-models",style:f,children:[e.jsx("div",{className:"matrix-field","data-label":"模型名称",children:_.length?_.map((k,T)=>e.jsx("div",{className:"model-variant",children:Ne(k).length?Ne(k).map((O,w)=>e.jsx("div",{className:"model-item",children:e.jsx("p",{className:"model-name",children:O.name||"未获取到模型信息"})},w)):e.jsx("p",{className:"muted",children:"未获取到模型信息"})},T)):e.jsx("span",{className:"muted",children:"未获取到模型信息"})}),e.jsx("div",{className:"matrix-field","data-label":"模型精度",children:_.length?_.map((k,T)=>e.jsx("div",{className:"model-variant",children:Ne(k).length?Ne(k).map((O,w)=>e.jsx("div",{className:"model-item",children:Es(O).map(N=>e.jsx("p",{className:"model-label",children:N},N))},w)):e.jsx("p",{className:"muted",children:"无"})},T)):e.jsx("p",{className:"muted",children:"无"})})]})]}),e.jsx("div",{className:"summary-evidence",id:g,hidden:!l,children:d&&e.jsxs(e.Fragment,{children:[e.jsx(Fr,{g:u},u.id),e.jsx("button",{type:"button","data-evidence-entry":"",disabled:!a,onClick:()=>{a&&s(u.id)},children:"任务证据"})]})})]})}function Ls({report:n,ready:r,includeOffline:t,onProfile:a,onEvidence:s}){const i=n.workers.filter(d=>t||he(d));if(!i.length)return e.jsx("p",{className:"empty",children:t?"暂无机器记录。":"当前没有在线机器，可勾选“包含离线”查看已登记记录。"});const o=new Set(i.map(d=>d.id)),l=new Map;for(const d of n.groups)if(d.worker_id&&o.has(d.worker_id)){let p=l.get(d.capability);p||(p={title:Ce(d),machines:new Map},l.set(d.capability,p)),p.machines.set(d.worker_id,[...p.machines.get(d.worker_id)||[],d])}l.size||l.set("",{title:"历史记录",machines:new Map});const c={"--machine-count":i.length};return e.jsx("div",{className:"scroll comparison-scroll",tabIndex:0,role:"region","aria-label":"机器产能对比表，可横向滚动",children:e.jsxs("table",{className:"simple-table matrix-table","aria-label":"机器与业务能力对比",style:c,children:[e.jsxs("colgroup",{children:[e.jsx("col",{className:"matrix-axis-col"}),i.map(d=>e.jsx("col",{},d.id))]}),e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"business-axis",scope:"col",children:"业务能力"}),i.map((d,p)=>e.jsxs("th",{className:"machine-heading",scope:"col",id:`summary-machine-${p+1}`,"data-summary-worker-id":d.id,children:[e.jsx("h3",{children:d.name||"未命名机器"}),e.jsx("span",{className:["busy","running"].includes(d.state)?"warn":he(d)?"online-state":"muted",children:Mn[d.state]||"状态待确认"}),e.jsx("p",{className:"machine-hardware",children:_s(d)}),e.jsxs("details",{className:"machine-more",children:[e.jsx("summary",{children:"机器详情"}),e.jsx("p",{children:ks(d)}),e.jsxs("p",{className:"hint",children:["最后上报：",Le(d.last_seen),"；Worker ID：",d.id,"；采集程序版本：",E(d.agent_version)]}),!he(d)&&e.jsx("p",{className:"hint",children:"此记录当前不可用，配置为最后上报信息，历史速度不代表现在能执行。"}),e.jsx("button",{type:"button",onClick:()=>a(d),children:"查看配置"})]})]},d.id))]})}),e.jsx("tbody",{children:[...l].map(([d,{title:p,machines:g}],u)=>e.jsxs("tr",{className:"capability-row","data-capability":d||void 0,children:[e.jsx("th",{className:"business-axis",scope:"row",id:`summary-business-${u+1}`,children:e.jsx("span",{className:"business-title",children:p})}),i.map((y,_)=>{const j=g.get(y.id);return e.jsx("td",{className:"machine-result","data-summary-worker-id":y.id,headers:`summary-machine-${_+1} summary-business-${u+1}`,children:j?e.jsx(Is,{entries:j,worker:y,title:p,ready:r,onEvidence:s}):e.jsx("p",{className:"matrix-empty",children:"暂无记录；不据此推断是否支持该业务。"})},y.id)})]},d))})]})})}function As({report:n,mounted:r,onProfile:t}){const a=n?.overview||{};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"summary",children:[e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"生成任务"}),e.jsx("span",{className:"hint",children:"不是产物数量"})]}),e.jsx("div",{id:"task-metrics",className:"metrics pad",children:r&&e.jsx(jn,{items:[["总任务",a.tasks],["完成",a.done],["失败",a.error],["取消",a.canceled]]})}),e.jsx("p",{id:"coverage",className:"hint pad",children:r&&`历史 ${$(a.historical_tasks)} / 新采集 ${$(a.captured_tasks)}；Worker 未关联 ${$(a.unknown_worker)}；已排除 API ${$(a.excluded_api)}。`})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"实际产物"}),e.jsx("span",{className:"hint",children:"仅已知输出，不从请求推断"})]}),e.jsx("div",{id:"output-metrics",className:"metrics pad",children:r&&e.jsx(jn,{items:[["图片（张）",a.output_images],["视频（条）",a.output_videos],["视频总时长（秒）",a.output_seconds],["产物未知记录",a.unknown_outputs]]})}),e.jsx("p",{className:"hint pad",children:"图片、视频、时长分别统计；未知不记为零，也不计为人工合格。"})]})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"机器配置与状态"}),e.jsx("span",{className:"hint",children:"按 Worker ID 区分，名称相同不合并"})]}),e.jsx("p",{className:"notice hint",children:"配置为当前或最后上报信息，不代表历史执行快照，也不是最低采购配置。系统可见内存不是标称容量，多卡显存不相加。"}),e.jsx("div",{id:"workers",className:"worker-grid",children:r&&n&&(n.workers.length?n.workers.map(s=>{const i=s.hardware,o=["offline","disabled"].includes(s.state)||!L(s.last_seen)||Date.now()/1e3-s.last_seen>120;return e.jsxs("article",{className:"worker","data-worker-id":s.id,children:[e.jsx("h3",{children:E(s.name)}),e.jsxs("p",{className:"hint",children:["Worker ID：",s.id]}),e.jsx("span",{className:"badge",children:Mn[s.state]||s.state}),e.jsxs("p",{className:o?"warn":"hint",children:["最后心跳：",Le(s.last_seen),o?"；状态 / 配置快照已过期或无法确认，请勿视为实时。":""]}),e.jsx(Rs,{items:[["GPU",i?.gpus?.length?i.gpus.map((l,c)=>`GPU ${c+1}：${E(l.name)} / 单卡显存 ${Ie(l.memory_total_bytes)}`).join(`
`):"未知"],["GPU 数量",i?.gpus?.length?$(i.gpus.length):"未知"],["CPU",Ue(i?.cpu,"cpu")],["内存",Ie(i?.memory_total_bytes)],["系统",Ue(i?.os,"os")],["环境",E(i?.environment_id)],["模型版本",E(i?.model_version)],["主机 ID",E(i?.host_id)],["磁盘",E(i?.disk)],["配置备注",E(i?.note)]]}),e.jsxs("p",{className:"hint",children:["配置来源：",an(s.hardware_source),"。人工补录不回写历史快照。"]}),e.jsxs("p",{children:["任务 ",$(s.tasks)," / 完成 ",$(s.done)," / 失败 ",$(s.error)," / 取消"," ",$(s.canceled)]}),e.jsxs("p",{className:"hint",children:["累计 runtime：",Y(s.runtime_seconds)]}),s.id&&s.state!=="historical"?e.jsxs("details",{className:"profile-details",children:[e.jsx("summary",{children:"补录机器配置（人工声明）"}),e.jsx("p",{className:"hint",children:"7 个字段仅保存非空新声明，不回写历史快照。"}),e.jsx("button",{type:"button",onClick:()=>t(s),children:"查看 / 补录配置"})]}):e.jsx("p",{className:"hint",children:"历史执行端未关联现存注册记录，不能补录配置。"})]},s.id)}):e.jsx("p",{className:"empty",children:"暂无执行端信息；无法关联的历史任务不会按名称猜测机器。"}))})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"业务规格分组"}),e.jsx("span",{className:"hint",children:"原始统计保留失败、取消与异常记录"})]}),e.jsx("div",{id:"machine-groups",children:r&&n&&e.jsx(Or,{groups:n.groups,report:n})})]})]})}const Ts={mode:"historical",quality:"technical",availability:1,utilization:.75},fe=[{id:"zimage_t2i",type:"生图模式",label:"文生图",capabilities:["zimage_t2i","krea2_t2i","qwen_image_2512_t2i","qwen_image_21_t2i"]},{id:"zimage_i2i",type:"生图模式",label:"图生图",capabilities:["zimage_i2i","krea2_i2i","qwen_image_edit_2511_i2i","qwen_image_21_multi","qwen_image_21_i2i"]},{id:"flux2_klein_storyboard9",type:"生图模式",label:"多宫格故事分镜",capabilities:["flux2_klein_storyboard9"]},{id:"flux2_klein_edit",type:"生图模式",label:"参考图编辑(保人物)",capabilities:["flux2_klein_edit"]},{id:"minimax_h3_character_transfer",type:"生视频模式",label:"H3人物迁移",capabilities:["minimax_h3_character_transfer"]},{id:"minimax_h3_flf2v",type:"生视频模式",label:"H3 图生视频",capabilities:["minimax_h3_i2v","minimax_h3_flf2v"]},{id:"minimax_h3_talk2",type:"生视频模式",label:"H3 说话唱歌",capabilities:["minimax_h3_talk1","minimax_h3_talk2"]},{id:"minimax_h3_ref4",type:"生视频模式",label:"H3图片参考",capabilities:["minimax_h3_ref4"]},{id:"minimax_h3_comic20",type:"生视频模式",label:"漫剧4宫格",capabilities:["minimax_h3_comic20"]},{id:"minimax_h3_fusion_v2",type:"生视频模式",label:"H3无损融合单采V2",capabilities:["minimax_h3_fusion_v2"]},{id:"minimax_h3_ref9",type:"生视频模式",label:"H3全能参考",capabilities:["minimax_h3_ref9"]},{id:"minimax_h3_ref_2pass",type:"生视频模式",label:"H3全能参考(高质量)",capabilities:["minimax_h3_ref_2pass"]}],wn=n=>fe.find(r=>n!==void 0&&r.capabilities.includes(n)),Ds=n=>JSON.stringify(n.source==="standard"?[n.config_id||null,n.source,n.benchmark_id||`unknown:${n.id}`]:[n.config_id||null,n.source]),Fs=n=>L(n.mean_seconds)&&n.mean_seconds>0&&L(n.measured)&&n.measured>0;function dn(n,r){return n.workers.some(t=>t.id===r&&he(t))?n.groups.filter(t=>t.worker_id===r&&["historical","captured","standard"].includes(t.source)&&wn(t.capability)&&Fs(t)):[]}const qr=(n,r)=>n<r?-1:n>r?1:0;function Os(n,r){return(r.measured||0)-(n.measured||0)||(r.samples||0)-(n.samples||0)||(r.last_sample_at||0)-(n.last_sample_at||0)||(r.mean_seconds||0)-(n.mean_seconds||0)||qr(n.id,r.id)}function qs(n,r){const t=new Map;for(const i of r){const o=Ds(i);t.set(o,[...t.get(o)||[],i])}const a=[];for(const[i,o]of t){const l=[];for(const c of n){const d=fe.find(g=>g.id===c.mode_id),p=o.filter(g=>d?.capabilities.includes(g.capability)).sort(Os)[0];p&&l.push(p)}l.length===n.length&&a.push({key:i,groups:l,measured:l.reduce((c,d)=>c+(d.measured||0),0)})}a.sort((i,o)=>o.measured-i.measured||qr(i.key,o.key));const s=a[0];if(!s)throw Error("所选模式没有同一电脑、同一配置和来源的共同实测记录，请减少模式或换一台电脑");return s.groups}function Us(n,r,t,a,s,i){if(!n.workers.some(d=>d.id===t&&he(d)))throw Error("所选电脑当前不在线，请刷新后重新选择。");const o=dn(n,t),l=new Set;for(const d of i){const p=fe.find(g=>g.id===d.mode_id);if(!p||!o.some(g=>p.capabilities.includes(g.capability)))throw Error("所选模式没有成功耗时记录，请换一个模式或电脑。");if(l.has(d.mode_id))throw Error("同一模式请合并每日需求，不能重复选择。");if(l.add(d.mode_id),!L(Number(d.quantity))||Number(d.quantity)<=0)throw Error("每日需求必须是大于零的有限任务数量。")}if(!i.length)throw Error("请至少添加一个有样本的业务模式。");const c=qs(i,o);return zr.parse({...r,...Ts,worker_id:t,hours:Number(a),...s!==""?{price:Number(s)}:{},demands:i.map((d,p)=>{const g=c[p];if(!g)throw Error("原组证据缺失");return{group_id:g.id,quantity:Number(d.quantity)}})})}const Ur=[{key:"host_id",label:"主机 ID",maxLength:160},{key:"cpu",label:"CPU 型号",maxLength:160},{key:"memory_total_bytes",label:"系统可见内存（GiB）"},{key:"environment_id",label:"执行环境版本",maxLength:160},{key:"model_version",label:"模型版本",maxLength:160},{key:"disk",label:"磁盘配置说明",maxLength:160},{key:"note",label:"配置备注",maxLength:500}];function _n(n,r){if(Array.from(n).some(t=>t.charCodeAt(0)<32||t.charCodeAt(0)===127))throw Error(r)}function Ws(n,r){const t={};for(const{key:a}of Ur){const s=(n[a]||"").trim();if(s)if(_n(s,"配置字段请使用不含控制字符的单行文本。"),a==="memory_total_bytes"){const i=Math.round(Number(s)*1073741824);if(!Number.isSafeInteger(i)||i<=0)throw Error("内存必须是能转换为安全正整数字节的 GiB 数值。");i!==r?.[a]&&(t[a]=i)}else s!==(a==="cpu"?Ue(r?.cpu,"cpu"):r?.[a])&&(t[a]=s)}if(!Object.keys(t).length)throw Error("没有需要保存的修改；留空不会删除已有配置。");return Cr.parse(t)}function Bs(n){const r=n.accepted===""?null:Number(n.accepted);if(r!==null&&(!Number.isSafeInteger(r)||r<0))throw Error("请输入非负整数，或留空表示未验收。");const t=(n.benchmark_id||"").trim(),a=(n.note||"").trim();if(n.source==="standard"&&!t)throw Error("标准样本需要填写标准场景编号；标签不代表自动验证。");return _n(a,"验收备注和标准场景编号请使用单行文本，不含换行或控制字符。"),_n(t,"验收备注和标准场景编号请使用单行文本，不含换行或控制字符。"),Er.parse({accepted:r,source:n.source,benchmark_id:t,note:a})}function Hs(n){let r=n==null?"":typeof n=="object"?JSON.stringify(n):String(n);return/^[\s]*[=+\-@]/.test(r)&&(r="'"+r),'"'+r.replace(/"/g,'""')+'"'}function Gs(n){return"\uFEFF"+[["类别","内容"],["测算口径","历史任务运行参考，不是合格日产能"],["输入与时间范围",n.payload],["当前机器配置（非历史快照）",n.hardware],["测算结果",n.result],...n.groups.map(t=>["场景证据",{...t,warnings:Ln(t)}])].map(t=>t.map(Hs).join(",")).join(`\r
`)}function Vs({worker:n,controller:r,onClose:t}){const[a,s]=m.useState({});return e.jsx(ae,{title:n.state==="historical"?"历史执行端配置":`机器配置与人工补录 · ${n.name||n.id}`,className:"capacity-page",onClose:t,submitLabel:n.state==="historical"?"关闭":"保存人工配置",onSubmit:n.state==="historical"?async()=>{}:async()=>{const i=Ws(a,n.hardware);try{await r.saveProfile(n.id,i)}catch(o){throw Error(`保存失败：${ee(o)}。输入已保留，请检查字段后重试。`)}},children:n.state==="historical"?e.jsx("p",{children:We(n.hardware)}):e.jsxs("div",{className:"capacity-operation",children:[e.jsxs("details",{children:[e.jsx("summary",{children:"当前 / 最后上报配置"}),e.jsx("p",{children:We(n.hardware)}),e.jsxs("p",{children:["配置来源：",an(n.hardware_source),"；配置备注：",E(n.hardware?.note)]})]}),e.jsx("p",{className:"notice",children:"仅保存本次修改的非空字段；留空保留原值。内存以 GiB 输入、按字节保存，不是采购标称容量。新声明仅向后生效，不回写历史快照。"}),e.jsx("p",{className:"hint",children:"主机 ID 仅在人工确认属于同一物理机器时填写相同值，不按机器名称合并；同机多个 Worker 不自动代表多倍产能。"}),e.jsx("div",{className:"profile-form",children:Ur.map(({key:i,label:o,maxLength:l})=>e.jsxs("label",{className:"field",children:[e.jsx("span",{children:o}),e.jsx("input",{name:i,type:i==="memory_total_bytes"?"number":"text",min:i==="memory_total_bytes"?"0.000001":void 0,step:i==="memory_total_bytes"?"any":void 0,maxLength:l,placeholder:["model_version","environment_id"].includes(i)?"填写固定版本，勿用 latest / main / unknown":"留空保留现值",value:a[i]||"",onChange:c=>{s({...a,[i]:c.target.value}),r.invalidateEstimate("机器配置输入已更改；请保存后重新计算，未保存内容不会进入测算。")}})]},i))})]})})}function Ks({detail:n,controller:r,onClose:t}){const[a,s]=m.useState({accepted:L(n.review?.accepted)?String(n.review.accepted):"",source:n.review?.source==="standard"?"standard":"business",benchmark_id:n.review?.benchmark_id||"",note:n.review?.note||""}),i=(o,l)=>{s({...a,[o]:l}),r.invalidateEstimate("人工验收输入已变更；未保存内容不会进入测算。")};return e.jsx(ae,{title:`人工验收 · ${n.job_id}`,className:"capacity-page",onClose:t,submitLabel:"保存人工标记",onSubmit:async()=>{const o=Bs(a);try{await r.saveReview(n.job_id,o)}catch(l){throw Error(`保存失败：${ee(l)}`)}},children:e.jsxs("div",{className:"review-form",children:[e.jsxs("p",{children:["任务 ",n.job_id,"；原采集来源：",de(n.source),"。"]}),e.jsxs("div",{className:"review-fields",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"人工合格产物数量（留空为未验收）"}),e.jsx("input",{name:"accepted",type:"number",min:"0",step:"1",value:a.accepted,onChange:o=>i("accepted",o.target.value)})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"人工样本标签"}),e.jsxs("select",{name:"source",value:a.source,onChange:o=>i("source",o.target.value),children:[e.jsx("option",{value:"business",children:"业务样本"}),e.jsx("option",{value:"standard",children:"标准样本（人工声明）"})]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"标准场景编号（标准样本请填写）"}),e.jsx("input",{name:"benchmark_id",maxLength:100,value:a.benchmark_id,onChange:o=>i("benchmark_id",o.target.value)})]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"验收备注 / 固定条件说明"}),e.jsx("textarea",{name:"note",rows:2,maxLength:500,value:a.note,onChange:o=>i("note",o.target.value)})]}),e.jsx("p",{className:"notice",children:"此操作只保存人工声明，不会自动确认技术规格、缓存条件或标准测试通过；不会将历史记录补写为完整采集证据。"})]})})}function Js({confirmation:n,onClose:r}){return e.jsx(ae,{title:`确认受控补采 · ${n.detail.job_id}`,className:"capacity-page",onClose:r,submitLabel:"确认本批补采",onSubmit:n.submit,children:e.jsxs("div",{className:"capacity-operation",children:[e.jsxs("p",{className:"notice",children:["任务 ",n.detail.job_id,"；本批偏移 ",n.offset,"，最多处理 4 个可信最终产物。"]}),e.jsx("p",{children:"补采仅添加成品尺寸证据，不修改技术资格、原生成参数、人工合格量或标准标签。最终清单由服务端核验；不会扫描目录，也不会从请求猜测尺寸。"}),e.jsxs("details",{children:[e.jsx("summary",{children:"本页已记录的最终产物（最终以服务端可信清单为准）"}),e.jsx("pre",{children:E(n.detail.outputs)})]})]})})}function Xs({detail:n,controller:r,onConfirm:t}){const[a,s]=m.useState(0),[i,o]=m.useState(""),[l,c]=m.useState(!1),d=m.useRef(!0),p=m.useRef(!1),g=m.useRef(0);m.useEffect(()=>(d.current=!0,()=>{d.current=!1}),[]);const u=async(y,_)=>{if(!d.current||!r.probeCurrent(_)||g.current!==y)throw Error("证据页面或批次已变化，请关闭后重新打开。");if(p.current)throw Error("正在补采，请勿重复提交。");p.current=!0,c(!0),o("正在补采本批成品尺寸…"),r.invalidateEstimate("成品尺寸正在补采，旧测算已清除。");try{const j=await r.probe(n.job_id,y);if(!d.current)return;g.current=j.next_offset,s(j.next_offset),o(`本批处理 ${$(j.processed)} 个，成功记录尺寸 ${$(j.recorded)} 个；可信最终产物共 ${$(j.total)} 个。${j.next_offset===null?"补采已完成，刷新看板查看结果。":"尚有后续产物，请点击继续补采；刷新看板查看结果。"}`)}catch(j){const v=`补采失败：${ee(j)}${j instanceof Br&&j.status===409?"。没有可信最终产物记录，不能猜测成品尺寸。":""}`;throw d.current&&o(v),Error(v)}finally{p.current=!1,d.current&&c(!1)}};return e.jsxs("div",{className:"output-probe",children:[e.jsx("p",{className:"hint",children:"仅按可信最终产物清单补采，每次最多 4 个；不会从输入素材或请求参数猜测尺寸。"}),e.jsx("button",{type:"button",disabled:l||a===null,onClick:()=>{if(p.current||a===null||!d.current)return;const y=a,_=r.probeVersion();t({detail:n,offset:y,submit:()=>u(y,_)})},children:a===null?"补采已完成":a>0?"继续补采成品尺寸":"补采成品尺寸"}),e.jsx("p",{className:"hint",role:"status",children:i})]})}function Ys({detail:n,report:r,controller:t,onReview:a,onProbe:s}){const[i,o]=m.useState(!1);return e.jsxs("details",{className:"evidence","data-job-id":n.job_id,onToggle:l=>{l.currentTarget.open&&o(!0)},children:[e.jsxs("summary",{children:[e.jsx("strong",{children:n.job_id}),e.jsx("span",{className:"badge",children:de(n.source)}),e.jsx("span",{children:` ${Mn[n.status]||n.status} / ${n.capability} / ${An(n.worker_id,n.worker_name,r.workers,r.groups)} / ${Le(n.created_at)}`})]}),e.jsx("div",{className:"evidence-content",children:i&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["任务 runtime：",Y(n.runtime_seconds),"；占机：",Y(n.occupied_seconds),"；原分组：",E(n.group_id)]}),e.jsx(ln,{values:n.warnings}),e.jsx("div",{className:"f-grid3",children:[["输入素材",sn(n).join(" / ")],["生成参数",on(n,!0)],["技术与人工口径","技术资格以原采集证据及服务端校验为准；尺寸补采与人工标签不修改它。"]].map(([l,c])=>e.jsxs("div",{children:[e.jsx("h3",{children:l}),e.jsx("p",{children:c})]},l))}),e.jsx(Qe,{title:"执行尝试（包含重试）",value:n.attempts}),e.jsx("h3",{children:"实际输出证据"}),n.outputs?.length?e.jsx(Tn,{headers:["产物标识","类型","实际尺寸","视频时长","技术记录"],children:n.outputs.map((l,c)=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("span",{children:l.key||l.id||"未记录"})}),e.jsx("td",{children:e.jsx("span",{children:E(l.kind)})}),e.jsx("td",{children:e.jsx("span",{children:Ss(l)})}),e.jsx("td",{children:e.jsx("span",{children:Y(l.duration)})}),e.jsx("td",{children:e.jsx("span",{children:l.valid===!0?"采集记录标记有效":l.valid===!1?"未通过 / 待确认":"未记录"})})]},c))}):e.jsx("p",{className:"notice",children:"最终产物清单未记录；不能按请求猜测，也不按零产物处理。"}),e.jsx(Qe,{title:"实际输出原始证据",value:n.outputs}),e.jsxs("p",{children:["人工合格数量：",$(n.review?.accepted),"；样本标签：",Ps(n),"；标准场景编号：",E(n.review?.benchmark_id),"；备注：",E(n.review?.note)]}),e.jsx(Dr,{resolution:n.output_resolution}),e.jsx(Qe,{title:"成品尺寸原始证据",className:"output-resolution-raw",value:{output_resolution:n.output_resolution,recovered_outputs:n.recovered_outputs}}),n.status==="done"&&e.jsx(Xs,{detail:n,controller:t,onConfirm:s}),["captured","standard"].includes(n.source)?e.jsx("button",{className:"review-open",type:"button",onClick:()=>a(n),children:"人工验收 / 样本标签"}):e.jsx("p",{className:"hint",children:"历史任务不能补写为完整采集证据，不提供采集验收表单。"})]})})]})}function Zs({controller:n,onReview:r,onProbe:t}){const a=n.getSnapshot(),{report:s,evidence:i,filters:o,ready:l}=a,c=a.mounted.has("evidence")&&s!==null,d=!l||i.busy||i.failed||!c;return e.jsxs("section",{"aria-labelledby":"evidence-heading",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{id:"evidence-heading",children:"任务证据与人工标记"}),e.jsx("span",{id:"detail-count",className:"hint",children:c&&(i.failed?"筛选未完成":i.busy?"":`当前 ${i.records.length} / 总计 ${$(i.total)} 条；聚合不受分页截断`)})]}),e.jsx("p",{className:"hint pad",children:"明细每页最多 100 条。人工验收 / 标准样本是人工声明，不等于系统自动验证通过；历史记录不可补写为完整采集证据。"}),e.jsx("div",{id:"evidence-filters",children:c&&e.jsxs("div",{className:"evidence-filters",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"独立原分组（按真实 group_id）"}),e.jsxs("select",{id:"evidence-group",disabled:!l,value:o.group,onChange:p=>n.filter({group:p.target.value}),children:[e.jsx("option",{value:"",children:"全部原分组"}),s.groups.map(p=>e.jsx("option",{value:p.id,children:`${Ce(p)} / ${An(p.worker_id,p.worker_name,s.workers,s.groups)} / ${de(p.source)} / ${p.config_id||"配置未知"} / ${p.id}`},p.id))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"任务状态"}),e.jsxs("select",{id:"evidence-status",disabled:!l,value:o.status,onChange:p=>n.filter({status:p.target.value}),children:[e.jsx("option",{value:"",children:"全部状态"}),[["done","已完成"],["error","失败"],["canceled","已取消"],["queued","排队中"],["running","运行中"]].map(([p,g])=>e.jsx("option",{value:p,children:g},p))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"采集来源"}),e.jsxs("select",{id:"evidence-source",disabled:!l,value:o.source,onChange:p=>n.filter({source:p.target.value}),children:[e.jsx("option",{value:"",children:"全部来源"}),["historical","captured","standard"].map(p=>e.jsx("option",{value:p,children:de(p)},p))]})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"每页最多 100 条"}),e.jsx("select",{id:"evidence-size",disabled:!l,value:o.size,onChange:p=>n.filter({size:Number(p.target.value)}),children:[100,50,25,10].map(p=>e.jsxs("option",{value:p,children:[p," 条 / 页"]},p))})]})]})}),e.jsx("p",{id:"evidence-state",className:"hint pad",role:"status",hidden:!i.state,children:i.state}),e.jsx("div",{id:"details",children:c&&!i.busy&&!i.failed&&(i.records.length?i.records.map(p=>e.jsx(Ys,{detail:p,report:s,controller:n,onReview:r,onProbe:t},p.job_id)):e.jsx("p",{className:"empty",children:"当前页没有任务证据。可立即刷新，或返回上一页。"}))}),e.jsxs("div",{className:"pager",children:[e.jsx("button",{id:"previous",disabled:d||i.start===0,onClick:()=>n.page(-1),children:"上一页"}),e.jsx("span",{id:"page-note",className:"hint",children:c&&!i.busy&&!i.failed&&`第 ${Math.floor(i.start/i.size)+1} 页`}),e.jsx("button",{id:"next",disabled:d||i.start+i.size>=i.total,onClick:()=>n.page(1),children:"下一页"})]})]})}function Qs(n,r){const t=n.workers.filter(he);return t.find(a=>a.id===r)?.id||t.find(a=>dn(n,a.id).length)?.id||t[0]?.id||""}function rr(n,r,t){const a=dn(n,r);return{id:t,mode_id:fe.find(s=>a.some(i=>s.capabilities.includes(i.capability)))?.id||"",quantity:""}}function ei(n,r,t){const[a,s]=m.useState({report:null,worker:"",demands:[],next:1}),[i,o]=m.useState("8"),[l,c]=m.useState("");if(t&&r&&r!==a.report){const x=Qs(r,a.worker);s({report:r,worker:x,demands:[rr(r,x,a.next)],next:a.next+1})}const d=r?dn(r,a.worker):[],p=()=>n.invalidateEstimate(),g=x=>{r&&(s({...a,worker:x,demands:[rr(r,x,a.next)],next:a.next+1}),p())},u=(x,h)=>{s({...a,demands:a.demands.map(f=>f.id===x?{...f,...h}:f)}),p()},y=x=>{s({...a,demands:a.demands.filter(h=>h.id!==x)}),p()},_=x=>{const h=fe.find(f=>f.id===x);return!!(h&&d.some(f=>h.capabilities.includes(f.capability)))};return{inputs:a,groups:d,hours:i,price:l,worker:g,update:u,remove:y,available:_,add:()=>{if(!n.getSnapshot().ready)return;const x=fe.find(h=>!a.demands.some(f=>f.mode_id===h.id)&&_(h.id));x&&(s({...a,demands:[...a.demands,{id:a.next,mode_id:x.id,quantity:""}],next:a.next+1}),p())},submit:async()=>{n.invalidateEstimate("正在计算…");const x=n.getSnapshot().snapshot;try{if(!r||!n.getSnapshot().ready||!x)throw Error("请先点击立即刷新并成功读取证据。");await n.estimate(Us(r,x.range,a.worker,i,l,a.demands))}catch(h){n.estimateFailure(ee(h))}},setHours:x=>{o(x),p()},setPrice:x=>{c(x),p()}}}function ni(n){const[r,t]=m.useState("");return m.useEffect(()=>{if(!n)return;const a=URL.createObjectURL(new Blob([Gs(n)],{type:"text/csv;charset=utf-8"}));return t(a),()=>URL.revokeObjectURL(a)},[n]),n?r:""}function ri({saved:n,report:r}){const{result:t,payload:a,groups:s}=n;return e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"warn",children:"成功任务处理参考，不是合格产物日产量或采购承诺"}),e.jsxs("p",{className:"result-number",children:["参考机器数：",$(t.machines)," 台"]}),e.jsxs("p",{children:["每日所需参考运行时间：",Y(t.total_seconds)]}),e.jsxs("p",{children:["单机每日可用容量时间：",Y(t.daily_capacity_seconds)]}),e.jsxs("p",{children:["整机采购小计：",L(t.price_total)?`¥${$(t.price_total)}`:"未计价"]}),e.jsx(Tn,{headers:["业务模式","每日需求","平均任务耗时","单机场景参考日处理量"],children:t.lines.map((i,o)=>{const l=wn(s.find(c=>c.id===i.group_id)?.capability);return e.jsxs("tr",{children:[e.jsx("td",{className:"wide",children:e.jsx("span",{children:l?`${l.type} · ${l.label}`:"业务模式"})}),e.jsx("td",{children:e.jsxs("span",{children:[$(i.quantity)," 任务/天"]})}),e.jsx("td",{children:e.jsx("span",{children:Y(i.seconds_per_unit)})}),e.jsx("td",{children:e.jsxs("span",{children:[$(i.daily_units)," 任务/天"]})})]},o)})}),e.jsx("p",{className:"hint",children:"每个模式只参考自动选中的一个实测分组，不保证任意模型、尺寸或缓存规格的产能。"}),e.jsxs("details",{children:[e.jsx("summary",{children:"计算依据"}),e.jsx("h3",{children:"警告与覆盖限制"}),e.jsx(ln,{values:t.warnings}),e.jsx("p",{className:"hint",children:"仅按成功任务平均 runtime 估算；不含完整失败、准备、重试或质量损耗。按同一电脑、配置和来源选择具体原分组，不合并均值。"}),e.jsx("p",{className:"hint",children:"台数 = 向上取整〔各模式任务数量 × 平均任务耗时之和 ÷（小时 × 3600 × 可用时间比例 × 生产容量比例）〕。容量预留不是 GPU 利用率；业务组合与模型切换可能增加损耗，不保证峰值 SLA。"}),a.demands.map(i=>{const o=s.find(l=>l.id===i.group_id);return o&&e.jsxs("div",{children:[e.jsx("h3",{children:wn(o.capability)?.label||"业务模式"}),e.jsxs("p",{children:[Mr(o)," / ",E(o.spec_key),"：",de(o.source),"；样本"," ",$(o.samples),"；",$(Pn(o))," 天；配置 ",E(o.config_id),o.source==="standard"?`；标准场景编号 ${E(o.benchmark_id)}`:""]}),e.jsx(Fr,{g:o})]},o.id)}),e.jsx("h3",{children:"计算假设"}),e.jsx("pre",{children:E(t.assumptions)}),e.jsxs("p",{className:"hint",children:["Worker ID：",a.worker_id,"；当前在线仅为本次数据快照，不承诺未来状态；当前配置仅作清单参考：",We(r.workers.find(i=>i.id===a.worker_id)?.hardware),"；时间：全部历史 至 ",Le(a.to),"；",a.hours," 小时 / 可用"," ",$(a.availability*100),"% / 生产容量 ",$(a.utilization*100),"%"]})]})]})}function ti({controller:n}){const r=n.getSnapshot(),{report:t,ready:a,estimate:s,estimateError:i,estimateNote:o,estimating:l}=r,c=r.mounted.has("purchase")&&t!==null,d=ei(n,t,c),{inputs:p,groups:g}=d,u=m.useRef(null),y=ni(s),_=t?.workers.filter(he)||[],j=!a||!g.length||!p.demands.length||l,v=a?_.some(x=>x.id===p.worker)?g.length?"":"这台电脑暂无这些模式的成功耗时记录，请换一台电脑。":"当前没有在线电脑，请稍后刷新。":"请先刷新并读取电脑状态。";return e.jsxs("div",{className:"procurement",children:[e.jsxs("section",{className:"section",children:[e.jsx("div",{className:"section-head",children:e.jsx("h2",{children:"每日多场景需求"})}),e.jsxs("form",{id:"estimate-form",className:"pad",onSubmit:x=>{x.preventDefault(),x.currentTarget.reportValidity()&&d.submit()},children:[e.jsxs("div",{className:"form-grid",children:[e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"电脑显卡配置选择"}),e.jsx("select",{id:"estimate-worker",required:!0,disabled:!a,value:p.worker,onChange:x=>{a&&d.worker(x.target.value)},children:c&&(_.length?_.map(x=>e.jsx("option",{value:x.id,children:x.name||"未命名电脑"},x.id)):e.jsx("option",{value:"",children:"暂无在线电脑"}))})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"每日计划生产小时"}),e.jsx("input",{id:"hours",type:"number",min:"0.1",max:"24",step:"0.1",value:d.hours,required:!0,onChange:x=>d.setHours(x.target.value)})]}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"整机报价（元，可选）"}),e.jsx("input",{id:"price",type:"number",min:"0",step:"0.01",placeholder:"未填写则不计价格",value:d.price,onChange:x=>d.setPrice(x.target.value)})]})]}),e.jsx("p",{id:"mode-note",className:"notice",children:"按成功任务平均执行耗时参考，不是合格产物日产量或采购承诺。"}),e.jsx("p",{className:"hint",children:"固定按 100% 可用时间、75% 生产容量计算（预留 25% 应对波动）；每日数量按任务/天填写。"}),e.jsxs("div",{children:[e.jsx("h3",{children:"每日需求"}),e.jsx("p",{id:"demand-note",className:"hint",role:"status",children:c&&v}),e.jsx("div",{id:"demands",children:c&&p.demands.map(x=>e.jsxs("div",{className:"demand",children:[e.jsx("select",{className:"demand-group",required:!0,"aria-label":"需求业务模式",disabled:!a||!x.mode_id,value:x.mode_id,onChange:h=>{a&&d.update(x.id,{mode_id:h.target.value})},children:["生图模式","生视频模式"].map(h=>e.jsx("optgroup",{label:h,children:fe.filter(f=>f.type===h).map(f=>e.jsxs("option",{value:f.id,disabled:!d.available(f.id)||p.demands.some(k=>k.id!==x.id&&k.mode_id===f.id),children:[f.type," · ",f.label]},f.id))},h))}),e.jsx("input",{className:"demand-quantity",type:"number",min:"0.01",step:"any",required:!0,placeholder:"任务/天","aria-label":"每日需求数量（任务/天）",disabled:!a||!x.mode_id,value:x.quantity,onChange:h=>d.update(x.id,{quantity:h.target.value})}),e.jsx("button",{type:"button",onClick:()=>d.remove(x.id),children:"移除"})]},x.id))}),e.jsx("button",{id:"add-demand",type:"button",disabled:!c||!a||!fe.some(x=>!p.demands.some(h=>h.mode_id===x.id)&&d.available(x.id)),onClick:d.add,children:"增加场景"})]}),e.jsx("button",{id:"estimate-submit",className:"primary",type:"submit",disabled:!c||j,children:"计算机器需求"})]})]}),e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"测算结果与依据"}),e.jsx("button",{id:"export-estimate",disabled:!s||!y,onClick:()=>{n.getSnapshot().estimate&&u.current?.click()},children:"导出测算 CSV"}),e.jsx("a",{ref:u,hidden:!0,href:y||void 0,download:"capacity-estimate.csv",children:"下载测算 CSV"})]}),e.jsx("div",{id:"estimate-error",className:"error",role:"alert",hidden:!i,children:i}),e.jsx("div",{id:"estimate-result",className:"pad","aria-live":"polite",children:s&&t?e.jsx(ri,{saved:s,report:t}):e.jsx("p",{className:"muted",children:o})})]})]})}const ke=[{id:"machines",label:"机器产能"},{id:"scenarios",label:"场景对比"},{id:"purchase",label:"采购测算"}];function ai(n){const{controller:r,state:t}=js(n),{report:a,ready:s,revision:i,mounted:o}=t,[l,c]=m.useState(!1),[d,p]=m.useState(""),[g,u]=m.useState(null),[y,_]=m.useState(null),[j,v]=m.useState(null),x=m.useRef(null),h=m.useRef(null),f=m.useRef([]),[k,T]=m.useState(!1);m.useEffect(()=>{k&&t.tab==="purchase"&&(h.current?.focus(),T(!1))},[k,t.tab]);const O=(b="")=>{r.getSnapshot().ready&&(r.showEvidence(b),x.current?.scrollIntoView({block:"start"}))},w=o.has("scenarios")&&a?Ms(a.groups):[],N=w.some(([b])=>b===d)?d:w[0]?.[0]||"";a&&o.has("scenarios")&&d!==N&&p(N);const M=a?.overview||{};return e.jsxs("main",{id:"main-content",className:"page capacity-page",tabIndex:-1,children:[e.jsxs("header",{className:"page-header card",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"产能评估"}),e.jsx("p",{className:"subtitle",children:"真实任务与独立规格分组，查看机器产能、证据和每日需求。"}),e.jsx("div",{className:"page-caption",children:e.jsx("span",{id:"refresh-state",className:"state",role:"status",children:t.refreshState})})]}),e.jsx("div",{className:"header-actions",children:e.jsx("button",{id:"refresh",type:"button",onClick:()=>{r.load()},children:"立即刷新"})})]}),e.jsx("div",{id:"error",className:"error",role:"alert",hidden:!t.error,children:t.error}),e.jsx("div",{id:"write-status",className:"write-status",role:"status",hidden:!t.writeStatus,children:t.writeStatus}),e.jsx("div",{className:"tabs",role:"tablist","aria-label":"产能评估视图",children:ke.map((b,I)=>e.jsx("button",{id:`tab-${b.id}`,role:"tab",type:"button",ref:D=>{f.current[I]=D},"aria-selected":t.tab===b.id,"aria-controls":`panel-${b.id}`,tabIndex:t.tab===b.id?0:-1,onClick:()=>r.activate(b.id),onKeyDown:D=>{const z=D.key==="ArrowRight"?(I+1)%ke.length:D.key==="ArrowLeft"?(I+ke.length-1)%ke.length:D.key==="Home"?0:D.key==="End"?ke.length-1:void 0;if(z===void 0)return;const S=ke[z];S&&(D.preventDefault(),r.activate(S.id),f.current[z]?.focus())},children:b.label},b.id))}),e.jsx("div",{id:"capacity-stats",className:"metrics","aria-label":"产能数据概览",children:a&&e.jsx(jn,{items:[["当前在线电脑",a.workers.filter(he).length],["真实任务记录",M.tasks],["独立原规格组",a.groups.length],["产物清单未知任务",M.unknown_outputs]]})}),e.jsxs("section",{id:"panel-machines",role:"tabpanel","aria-labelledby":"tab-machines",tabIndex:0,hidden:t.tab!=="machines",children:[e.jsxs("section",{id:"machine-summary","aria-label":"在线机器业务简览",children:[e.jsxs("div",{className:"summary-toolbar",children:[e.jsx("h2",{id:"online-count",children:a?`当前在线 ${a.workers.filter(he).length} 台`:"当前在线 — 台"}),e.jsxs("label",{className:"offline-toggle",children:[e.jsx("input",{id:"include-offline",type:"checkbox",checked:l,disabled:!s,onChange:b=>{s&&c(b.target.checked)}}),"包含离线"]})]}),e.jsx("p",{className:"summary-note hint",children:"在线状态是当前状态；业务为全部历史记录中跑过的业务，不代表当前均可执行。平均生成时间仅计成功任务执行耗时，不含排队，非纯 GPU 耗时，也不是合格日产能。同一业务的任务规格、模型或采样条件不同，不能直接按耗时做性能排名。"}),e.jsx("div",{id:"summary-machines",children:o.has("machines")&&a&&e.jsx(Ls,{report:a,ready:s,includeOffline:l,onProfile:u,onEvidence:O},`${i}-${l}`)}),e.jsxs("div",{className:"matrix-actions",children:[e.jsx("button",{type:"button",id:"open-purchase",onClick:()=>{r.activate("purchase"),T(!0)},children:"进入多模式采购测算"}),e.jsx("button",{type:"button",id:"open-evidence",disabled:!s,onClick:()=>O(),children:"展开全部任务证据"})]})]}),e.jsxs("details",{id:"technical-details",className:"section advanced",open:t.technicalOpen,onToggle:b=>r.technical(b.currentTarget.open),children:[e.jsx("summary",{children:"详细统计与机器配置"}),e.jsx(As,{report:a,mounted:o.has("technical"),onProfile:u},i)]})]}),e.jsx("section",{id:"panel-scenarios",role:"tabpanel","aria-labelledby":"tab-scenarios",tabIndex:0,hidden:t.tab!=="scenarios",children:e.jsxs("section",{className:"section",children:[e.jsxs("div",{className:"section-head",children:[e.jsx("h2",{children:"同场景证据对比"}),e.jsxs("label",{className:"field",children:[e.jsx("span",{children:"业务 / 精确规格 / 来源"}),e.jsx("select",{id:"scenario-filter",disabled:!s,value:N,onChange:b=>{s&&p(b.target.value)},children:o.has("scenarios")&&(w.length?w.map(([b,I])=>e.jsx("option",{value:b,children:I},b)):e.jsx("option",{value:"",children:"暂无场景"}))})]})]}),e.jsx("p",{className:"notice hint",children:"只并列相同业务、规格键与证据来源。历史配置、模型版本或缓存条件缺失时，不视为受控跑分；未测试的配置不能按显存或价格推算。"}),e.jsx("div",{id:"scenario-groups",children:o.has("scenarios")&&a&&e.jsx(Or,{groups:a.groups.filter(b=>Lr(b)===N),report:a},`${i}-${N}`)})]})}),e.jsx("section",{id:"panel-purchase",ref:h,role:"tabpanel","aria-labelledby":"tab-purchase",tabIndex:0,hidden:t.tab!=="purchase",children:e.jsx(ti,{controller:r})}),e.jsxs("details",{id:"task-evidence",ref:x,className:"section advanced",open:t.evidenceOpen,onToggle:b=>r.evidenceOpen(b.currentTarget.open),children:[e.jsx("summary",{children:"任务证据与人工标记"}),e.jsx(Zs,{controller:r,onReview:_,onProbe:v},i)]}),g&&e.jsx(Vs,{worker:g,controller:r,onClose:()=>u(null)},g.id),y&&e.jsx(Ks,{detail:y,controller:r,onClose:()=>_(null)},y.job_id),j&&e.jsx(Js,{confirmation:j,onClose:()=>v(null)})]})}const si=`:root {\r
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
`,ii=`.permissions-page .permissions-grid {\r
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
`,oi=`/* 页面样式只作用于产能主区及产能对话框，不覆盖共享侧栏。 */\r
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
`,li=`@scope (.admin-page) {
${si.replace(/:root\b/g,":scope").replace(/^body \{/m,":scope {").replace(/body\.admin-page\b/g,":scope").replace(/\.admin-page\b/g,":scope")}
${ii.replace(/\.permissions-page\b/g,":scope.permissions-page")}
${oi}
}`;function cn({page:n,children:r}){const t=Kr();return m.useLayoutEffect(()=>{const a=document.body;return a.dataset.choukaPage=n,a.dataset.workspace=n,()=>{a.dataset.choukaPage===n&&delete a.dataset.choukaPage,a.dataset.workspace===n&&delete a.dataset.workspace}},[n]),m.useEffect(()=>{let a=!0;return t.auth.me().then(()=>{if(!a)return;const s=document.getElementById("account");s&&!s.childElementCount&&t.auth.mountAccount(s);for(const i of document.querySelectorAll("#workspace-nav a"))new URL(i.href).pathname===location.pathname?i.setAttribute("aria-current","page"):i.removeAttribute("aria-current")}).catch(()=>{}),()=>{a=!1}},[t,n]),e.jsxs(e.Fragment,{children:[e.jsx("style",{children:li}),e.jsx(St,{page:n,workspace:!0,children:r})]})}function ui(){return e.jsx(cn,{page:"controller",children:n=>e.jsx(wa,{...n})})}function hi(){return e.jsx(cn,{page:"permissions",children:n=>e.jsx(qa,{...n})})}function xi(){return e.jsx(cn,{page:"costs",children:n=>e.jsx(os,{...n})})}function fi(){return e.jsx(cn,{page:"capacity",children:n=>e.jsx(ai,{...n})})}export{fi as CapacityWorkspace,ui as ControllerWorkspace,xi as CostsWorkspace,hi as PermissionsWorkspace};
