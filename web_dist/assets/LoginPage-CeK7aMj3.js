import{reactExports as r,HttpClient as R,ApiError as D,errorMessage as E,jsxRuntimeExports as n}from"./http-CceZLADw.js";import{createSessionService as L}from"./main-jeF3Ord4.js";import"./monitor-alerts-BXpxzu-0.js";const z=t=>location.replace(t.role==="monitor"?"/monitor":"/"),q=t=>t instanceof D&&t.status===410;function B(){const[t,j]=r.useState(!1),[u,l]=r.useState(!1),[e,i]=r.useState(""),[y,s]=r.useState(""),[k,v]=r.useState(!1),[g,N]=r.useState(null),[_,a]=r.useState(""),[b,S]=r.useState(!1),x=r.useRef(!1),C=r.useMemo(()=>new R,[]),f=r.useMemo(()=>L(C),[C]);r.useEffect(()=>{let o=!0;return f.me().then(d=>{o&&z(d.user)}).catch(async d=>{if(o){(!(d instanceof D)||d.status!==401)&&i(E(d)),j(!0);try{const w=await f.loginConfig();o&&v(w.dinghai_enabled)}catch{o&&v(!1)}}}),()=>{o=!1,C.invalidate()}},[C,f]);const M=()=>{N(null),a(""),S(!1)};return{ready:t,busy:u,error:e,notice:y,dinghaiEnabled:k,binding:g,bindingError:_,bindingExpired:b,clear:()=>{i(""),s("")},async submit(o,d,w=!1){if(x.current||!t||g||w&&!k)return;x.current=!0,l(!0),i(""),s("");const h=new FormData(o),c=p=>String(h.get(p)||"");o.querySelectorAll('input[type="password"]').forEach(p=>{p.value=""});try{if(d){if(c("password")!==c("confirm_password"))throw new Error("两次输入的密码不一致");await f.register(c("username"),c("display_name"),c("password"),c("phone")),s("注册申请已提交，审批通过后即可登录。"),o.reset()}else if(w){const p=await f.dinghaiLogin(c("username"),c("password"),h.get("bind_existing")==="on");p.status==="authenticated"?z(p.user):(a(""),S(!1),N(p))}else{const p=await f.login(c("username"),c("password"));z(p.user)}}catch(p){i(E(p))}finally{h.delete("password"),h.delete("confirm_password"),x.current=!1,l(!1)}},async confirmBinding(o){if(!g||x.current||b)return;const d=new FormData(o),w=String(d.get("username")||"").trim();if(o.querySelectorAll('input[type="password"]').forEach(h=>{h.value=""}),!w||!d.get("password")){d.delete("password"),a("请输入抽卡账号的用户名和密码。");return}x.current=!0,l(!0),a("");try{const h=f.dinghaiBind(g.binding_csrf,w,String(d.get("password")));d.delete("password");const c=await h;M(),z(c.user)}catch(h){q(h)?(S(!0),a("绑定验证已失效，请取消后重新进行定海登录。")):a(E(h))}finally{d.delete("password"),x.current=!1,l(!1)}},async cancelBinding(){if(!(!g||x.current)){x.current=!0,l(!0),a("");try{await f.dinghaiCancel(g.binding_csrf),M()}catch(o){b||o instanceof D&&[401,403,410].includes(o.status)?(M(),s("绑定验证已失效，请重新进行定海登录。")):a(E(o))}finally{x.current=!1,l(!1)}}}}}const F="_loginMethods_119aj_1",A="_loginMethod_119aj_1",I="_bindingOption_119aj_39",O="_track_119aj_66",P="_thumb_119aj_74",H="_dialog_119aj_111",T="_bindingDetails_119aj_132",Y="_dialogActions_119aj_153",m={loginMethods:F,loginMethod:A,bindingOption:I,switch:"_switch_119aj_48",track:O,thumb:P,dialog:H,bindingDetails:T,dialogActions:Y};function $({binding:t,returnFocus:j,busy:u,error:l,expired:e,onConfirm:i,onCancel:y}){const s=r.useRef(null),k=r.useRef(null),v=r.useRef(null),g=r.useId(),N=r.useId();r.useEffect(()=>{const a=s.current,b=j.current??document.activeElement;if(a)return a.showModal(),k.current?.focus(),()=>{a.close(),b instanceof HTMLElement&&b.isConnected&&b.focus()}},[j]);const _=()=>{u||(v.current&&(v.current.value=""),y())};return n.jsxs("dialog",{ref:s,className:m.dialog,"aria-labelledby":g,"aria-describedby":N,"aria-busy":u,onCancel:a=>{a.preventDefault(),_()},children:[n.jsx("h2",{id:g,children:"绑定已有抽卡账号"}),n.jsx("p",{id:N,className:"auth-description",children:"定海身份验证成功。你已选择绑定已有抽卡账号，请填写抽卡用户名和密码，验证通过后完成绑定并登录。 绑定后继续使用该抽卡账号的权限和数据，以后可直接使用定海账号登录。"}),n.jsx("dl",{className:m.bindingDetails,children:n.jsxs("div",{children:[n.jsx("dt",{children:"定海账号"}),n.jsx("dd",{children:t.dinghai_name})]})}),n.jsxs("form",{className:"auth-form",onSubmit:a=>{a.preventDefault(),i(a.currentTarget)},children:[n.jsxs("label",{className:"auth-field",children:[n.jsx("span",{children:"抽卡用户名"}),n.jsx("input",{ref:k,name:"username",autoComplete:"section-chouka-binding username",autoCapitalize:"none",spellCheck:!1,placeholder:"请输入已有抽卡账号的用户名",required:!0,disabled:u||e})]}),n.jsxs("label",{className:"auth-field",children:[n.jsx("span",{children:"抽卡密码"}),n.jsx("input",{ref:v,name:"password",type:"password",autoComplete:"section-chouka-binding current-password",required:!0,maxLength:1024,disabled:u||e})]}),n.jsx("p",{className:"auth-error",role:"alert",children:l}),n.jsxs("div",{className:m.dialogActions,children:[n.jsx("button",{type:"button",className:"auth-button auth-secondary",disabled:u,onClick:_,children:"取消"}),n.jsx("button",{type:"submit",className:"auth-button auth-primary",disabled:u||e,children:u?"处理中…":"确认绑定并登录"})]})]})]})}const G=`@scope (body[data-chouka-page="session"]) {\r
/* 登录与注册共用一套布局和控件，不影响画布及管理页样式。 */\r
:scope {\r
  color-scheme: dark;\r
  --auth-bg: #19120f;\r
  --auth-text: #f4ece0;\r
  --auth-muted: #c2b4a5;\r
  --auth-line: #8e7b68;\r
  --auth-accent: #dfc28e;\r
  --auth-focus: #eed8aa;\r
  --auth-control-bg: #2a211cd9;\r
  --auth-control-height: 52px;\r
  --auth-radius: 9px;\r
}\r
\r
* { box-sizing: border-box; }\r
:scope, h1, h2, p { margin: 0; }\r
[hidden] { display: none !important; }\r
\r
:scope.auth-screen {\r
  isolation: isolate;\r
  min-width: 280px;\r
  min-height: 100dvh;\r
  background: var(--auth-bg);\r
  color: var(--auth-text);\r
  font-family: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;\r
  -webkit-font-smoothing: antialiased;\r
  scrollbar-color: var(--auth-line) var(--auth-bg);\r
}\r
\r
::selection { color: #251b13; background: var(--auth-focus); }\r
\r
.auth-backdrop {\r
  position: fixed;\r
  inset: 0;\r
  z-index: -1;\r
  pointer-events: none;\r
  overflow: hidden;\r
  background: var(--auth-bg);\r
}\r
.auth-backdrop img {\r
  display: block;\r
  width: min(100%, calc(100dvh * 1672 / 941));\r
  height: auto;\r
  object-fit: contain;\r
  object-position: left top;\r
}\r
/* 舞台底色铺满视口，原图等比完整显示；仅融合不含角色的画面边缘。 */\r
@media (min-aspect-ratio: 1672/941) {\r
  .auth-backdrop img { mask-image: linear-gradient(to right, #000 92%, transparent); }\r
}\r
@media (max-aspect-ratio: 1672/941) {\r
  .auth-backdrop img { mask-image: linear-gradient(to bottom, #000 96%, transparent); }\r
}\r
\r
.auth-brand {\r
  position: absolute;\r
  top: clamp(22px, 2.6vh, 40px);\r
  left: 3.6%;\r
  display: flex;\r
  align-items: center;\r
  gap: 12px;\r
  font-size: clamp(18px, 1.25vw, 24px);\r
  font-weight: 600;\r
  line-height: 1.4;\r
}\r
.auth-brand img { width: 36px; height: auto; display: block; }\r
\r
.auth-layout {\r
  min-height: 100dvh;\r
  display: grid;\r
  grid-template-columns: minmax(0, 1fr) minmax(320px, 24.25%);\r
  column-gap: 7%;\r
  padding: 48px 4.8% 48px 3.6%;\r
}\r
.auth-intro { padding-top: clamp(38px, 5vh, 72px); }\r
.auth-intro h1 {\r
  font-size: clamp(44px, 3.9vw, 88px);\r
  font-weight: 700;\r
  line-height: 1.2;\r
  letter-spacing: -.025em;\r
}\r
.auth-intro h1 span { display: block; }\r
.auth-forms {\r
  align-self: center;\r
  justify-self: center;\r
  width: 100%;\r
  max-width: 400px;\r
  min-width: 0;\r
}\r
.auth-panel { width: 100%; }\r
.auth-panel-heading { margin-bottom: 32px; }\r
.auth-panel-heading h2 {\r
  font-size: clamp(30px, 2.6vw, 44px);\r
  font-weight: 600;\r
  line-height: 1.25;\r
  margin-bottom: 12px;\r
  letter-spacing: -.02em;\r
}\r
.auth-description {\r
  font-size: 15px;\r
  line-height: 1.65;\r
  font-weight: 400;\r
  color: var(--auth-muted);\r
  overflow-wrap: break-word;\r
}\r
.auth-contact-note { margin-top: 6px; }\r
.auth-contacts { display: flex; flex-wrap: wrap; column-gap: 18px; }\r
.auth-contacts span { white-space: nowrap; font-weight: 400; }\r
.auth-form { display: grid; gap: 20px; }\r
.auth-field { display: grid; gap: 9px; min-width: 0; }\r
.auth-field > span { font-size: 17px; font-weight: 400; line-height: 1.4; }\r
.auth-field input {\r
  width: 100%;\r
  min-width: 0;\r
  height: var(--auth-control-height);\r
  padding: 0 18px;\r
  border: 1px solid var(--auth-line);\r
  border-radius: var(--auth-radius);\r
  background: var(--auth-control-bg);\r
  color: var(--auth-text);\r
  caret-color: var(--auth-accent);\r
  font: inherit;\r
  font-size: 16px;\r
  transition: border-color .16s;\r
}\r
.auth-field input::placeholder { color: var(--auth-muted); opacity: 1; }\r
.auth-field input:hover:not(:disabled) { border-color: #c2ab8f; }\r
.auth-field input:focus-visible,\r
.auth-button:focus-visible {\r
  outline: 2px solid var(--auth-focus);\r
  outline-offset: 3px;\r
}\r
.auth-field input[aria-invalid="true"] { border-color: #ffb0ad; }\r
.auth-field input:disabled { opacity: .7; }\r
.auth-field input:autofill {\r
  caret-color: var(--auth-text);\r
  -webkit-text-fill-color: var(--auth-text);\r
  box-shadow: 0 0 0 1000px #2a211c inset;\r
}\r
.auth-actions { display: grid; gap: 14px; margin-top: 8px; }\r
.auth-button {\r
  width: 100%;\r
  min-height: var(--auth-control-height);\r
  border-radius: var(--auth-radius);\r
  border: 1px solid transparent;\r
  padding: 10px 16px;\r
  font: inherit;\r
  font-size: 19px;\r
  font-weight: 500;\r
  line-height: 1.4;\r
  cursor: pointer;\r
  transition: background-color .16s, border-color .16s, transform .16s;\r
}\r
.auth-primary { background: var(--auth-accent); color: #251b13; }\r
.auth-primary:hover:not(:disabled) { background: #eed3a0; }\r
.auth-secondary { background: #19120f40; color: var(--auth-text); border-color: #c4ae91; }\r
.auth-secondary:hover:not(:disabled) { background: #dfc28e14; border-color: var(--auth-accent); }\r
.auth-button:active:not(:disabled) { transform: translateY(1px); }\r
.auth-button:disabled { cursor: wait; opacity: .65; }\r
.auth-password-note { margin-top: -6px; }\r
.auth-error {\r
  color: #ffb0ad;\r
  font-size: 15px;\r
  line-height: 1.6;\r
  overflow-wrap: anywhere;\r
}\r
.auth-error:empty { display: none; }\r
.auth-notice {\r
  margin-bottom: 20px;\r
  padding: 14px 16px;\r
  background: #30251b;\r
  border: 1px solid #b69a70;\r
  border-radius: var(--auth-radius);\r
  color: #f4e2bd;\r
  font-size: 15px;\r
  line-height: 1.6;\r
  overflow-wrap: anywhere;\r
}\r
.auth-panel-heading h2:focus-visible,\r
.auth-error:focus-visible,\r
.auth-notice:focus-visible { outline: 2px solid var(--auth-focus); outline-offset: 5px; }\r
#register-panel .auth-panel-heading { margin-bottom: 24px; }\r
#register .auth-actions { margin-top: 0; }\r
\r
@media (min-width: 1500px) {\r
  :scope { --auth-control-height: 56px; }\r
  .auth-field > span { font-size: 18px; }\r
  .auth-field input { font-size: 18px; }\r
  .auth-button { font-size: 20px; }\r
}\r
\r
@media (max-width: 1100px) and (min-width: 761px) {\r
  .auth-layout { column-gap: 5%; padding-left: 5.2%; grid-template-columns: minmax(0, 1fr) 350px; }\r
  .auth-intro { padding-top: 12px; }\r
  .auth-intro h1 { font-size: clamp(40px, 5.2vw, 56px); }\r
  .auth-backdrop img {\r
    margin-top: 220px;\r
    width: min(100%, calc((100dvh - 220px) * 1672 / 941));\r
    mask-image: linear-gradient(to bottom, #000 96%, transparent);\r
  }\r
  .auth-forms { background: #19120fe6; padding: 24px 20px; }\r
}\r
\r
@media (min-width: 1101px) and (max-height: 600px) {\r
  .auth-intro h1 { font-size: clamp(24px, 5.5dvh, 36px); }\r
}\r
\r
@media (max-width: 760px) {\r
  .auth-brand { position: relative; top: auto; left: auto; padding: 24px 24px 0; font-size: 20px; gap: 10px; }\r
  .auth-brand img { width: 34px; }\r
  .auth-backdrop { position: absolute; top: 68px; bottom: auto; height: calc(100vw * 941 / 1000); }\r
  /* 手机只裁去右侧空舞台，保留角色、完整尾巴和原图全部高度。 */\r
  .auth-backdrop img {\r
    width: calc(100vw * 1672 / 1000);\r
    mask-image: linear-gradient(to bottom, #000 96%, transparent);\r
  }\r
  .auth-layout { display: block; min-height: auto; padding: 0 24px 40px; }\r
  .auth-intro { padding-top: calc(100vw * 941 / 1000 + 18px); padding-bottom: 28px; }\r
  .auth-intro h1 { font-size: clamp(36px, 9vw, 52px); line-height: 1.15; }\r
  .auth-forms { max-width: 440px; margin-inline: auto; position: relative; }\r
  .auth-panel-heading { margin-bottom: 26px; }\r
  .auth-panel-heading h2 { font-size: 30px; }\r
  .auth-description { font-size: 14px; }\r
  .auth-form { gap: 18px; }\r
  .auth-field > span { font-size: 16px; }\r
  .auth-field input { background: #2a211c; }\r
  .auth-secondary { background: var(--auth-bg); }\r
  .auth-actions { margin-top: 4px; }\r
}\r
\r
@media (max-width: 360px) {\r
  .auth-brand { padding-inline: 20px; }\r
  .auth-layout { padding-inline: 20px; }\r
  .auth-contacts { column-gap: 10px; }\r
}\r
\r
@media (prefers-reduced-motion: reduce) {\r
  .auth-field input, .auth-button { transition: none; }\r
  .auth-button:active:not(:disabled) { transform: none; }\r
}\r
\r
}`;function U(){const[t,j]=r.useState(!1),[u,l]=r.useState(!0),e=B(),i=!t&&e.dinghaiEnabled&&u,y=r.useRef(null);return r.useEffect(()=>{document.body.className="auth-screen",document.body.dataset.choukaPage="session";const s=document.createElement("style");return s.textContent=G,document.head.append(s),()=>{s.remove(),document.body.className="",delete document.body.dataset.choukaPage}},[]),n.jsxs(n.Fragment,{children:[n.jsx("div",{className:"auth-backdrop","aria-hidden":"true",children:n.jsx("img",{src:"/auth-art.webp",width:"1672",height:"941",alt:""})}),n.jsxs("header",{className:"auth-brand",children:[n.jsx("img",{src:"/auth-logo.png",width:"152",height:"120",alt:""}),n.jsx("span",{children:"抽卡系统"})]}),n.jsxs("main",{className:"auth-layout",children:[n.jsx("div",{className:"auth-intro",children:n.jsxs("h1",{children:[n.jsx("span",{children:"让想法，"}),n.jsx("span",{children:"成为作品"})]})}),n.jsx("div",{className:"auth-forms",children:n.jsxs("section",{className:"auth-panel",children:[n.jsxs("header",{className:"auth-panel-heading",children:[n.jsx("h2",{children:t?"注册账号":"登录"}),n.jsx("p",{className:"auth-description",children:t?"请填写真实姓名或花名，审批通过后即可登录。":i?"使用定海账号即可登录，无需抽卡账号。首次登录自动开通普通用户；已有绑定继续沿用。":"账号由管理员创建或审批开通"}),t&&n.jsx("p",{className:"auth-description",children:"若提交后长时间无法登录，请通过阿里钉联系彦龙（431661）、禾尚（286633）。"})]}),!t&&e.dinghaiEnabled&&n.jsxs("div",{className:m.loginMethods,role:"group","aria-label":"登录方式",children:[n.jsx("button",{type:"button",className:m.loginMethod,"aria-pressed":!i,disabled:e.busy,onClick:()=>{l(!1),e.clear()},children:"本地登录"}),n.jsx("button",{type:"button",className:m.loginMethod,"aria-pressed":i,disabled:e.busy,onClick:()=>{l(!0),e.clear()},children:"定海登录"})]}),e.notice&&n.jsx("p",{className:"auth-notice",role:"status",children:e.notice}),n.jsxs("form",{className:"auth-form",onChange:()=>{!t&&!e.dinghaiEnabled&&l(!1)},onSubmit:s=>{s.preventDefault(),e.submit(s.currentTarget,t,i)},children:[n.jsxs("label",{className:"auth-field",children:[n.jsx("span",{children:i?"定海账号":"账号"}),n.jsx("input",{name:"username",autoComplete:"username",required:!0,placeholder:i?"请输入定海账号":"请输入账号",disabled:e.busy,autoCapitalize:"none",spellCheck:!1})]}),t&&n.jsxs(n.Fragment,{children:[n.jsxs("label",{className:"auth-field",children:[n.jsx("span",{children:"真实姓名 / 花名"}),n.jsx("input",{name:"display_name",autoComplete:"nickname",required:!0,maxLength:64})]}),n.jsxs("label",{className:"auth-field",children:[n.jsx("span",{children:"手机号"}),n.jsx("input",{name:"phone",type:"tel",inputMode:"numeric",autoComplete:"tel-national",required:!0,maxLength:11,pattern:"1[3-9][0-9]{9}"})]})]}),n.jsxs("label",{className:"auth-field",children:[n.jsxs("span",{children:[i?"定海密码":"密码",t?"（至少 8 位）":""]}),n.jsx("input",{name:"password",type:"password",disabled:e.busy,autoComplete:t?"new-password":"current-password",required:!0,minLength:t?8:void 0,maxLength:1024})]}),t&&n.jsxs(n.Fragment,{children:[n.jsxs("label",{className:"auth-field",children:[n.jsx("span",{children:"再输一次密码"}),n.jsx("input",{name:"confirm_password",type:"password",autoComplete:"new-password",required:!0,minLength:8,maxLength:1024})]}),n.jsx("p",{className:"auth-description auth-password-note",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。"})]}),i&&n.jsxs("div",{children:[n.jsxs("label",{className:m.bindingOption,children:[n.jsx("span",{children:"绑定已有抽卡账号"}),n.jsxs("span",{className:m.switch,children:[n.jsx("input",{type:"checkbox",role:"switch",name:"bind_existing","aria-describedby":"binding-help",disabled:e.busy}),n.jsx("span",{className:m.track,"aria-hidden":"true",children:n.jsx("span",{className:m.thumb})})]})]}),n.jsx("p",{id:"binding-help",className:"auth-description",children:"默认关闭，普通定海登录无需开启。仅需沿用已有抽卡账号的权限和画布时开启，再验证抽卡用户名及密码。"})]}),n.jsx("p",{className:"auth-error",role:"alert",children:e.error}),n.jsxs("div",{className:"auth-actions",children:[n.jsx("button",{ref:y,className:"auth-button auth-primary",disabled:!e.ready||e.busy,children:e.ready?e.busy?"提交中…":t?"提交注册申请":"登录":"正在检查登录状态…"}),n.jsx("button",{className:"auth-button auth-secondary",type:"button",disabled:e.busy,onClick:()=>{j(!t),l(!0),e.clear()},children:t?"返回登录":"注册账号"})]})]},`${t}-${i}`)]})})]}),e.binding&&n.jsx($,{binding:e.binding.binding,returnFocus:y,busy:e.busy,error:e.bindingError,expired:e.bindingExpired,onConfirm:s=>{e.confirmBinding(s)},onCancel:()=>{e.cancelBinding()}})]})}export{U as LoginPage};
