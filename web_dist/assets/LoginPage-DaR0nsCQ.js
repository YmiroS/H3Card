import{reactExports as e,HttpClient as b,errorMessage as m,jsxRuntimeExports as n}from"./http-DOrwCtZg.js";import{createSessionService as w}from"./main-Ezvw2YZb.js";import"./monitor-alerts-DAd3X9Za.js";function v(){const[r,l]=e.useState(!1),[t,a]=e.useState(!1),[x,d]=e.useState(""),[g,c]=e.useState(""),u=e.useMemo(()=>new b,[]),p=e.useMemo(()=>w(u),[u]);return e.useEffect(()=>{let s=!0;return p.me().then(o=>{s&&location.replace(o.user.role==="monitor"?"/monitor":"/")}).catch(o=>{s&&((!("status"in Object(o))||o.status!==401)&&d(m(o)),l(!0))}),()=>{s=!1,u.invalidate()}},[u,p]),{ready:r,busy:t,error:x,notice:g,clear:()=>{d(""),c("")},async submit(s,o){if(t||!r)return;a(!0),d("");const f=new FormData(s),i=h=>String(f.get(h)||"");try{if(o){if(i("password")!==i("confirm_password"))throw new Error("两次输入的密码不一致");await p.register(i("username"),i("display_name"),i("password"),i("phone")),c("注册申请已提交，审批通过后即可登录。"),s.reset()}else{const h=await p.login(i("username"),i("password"));location.replace(h.user.role==="monitor"?"/monitor":"/")}}catch(h){d(m(h))}finally{a(!1)}}}}const y=`@scope (body[data-chouka-page="session"]) {\r
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
}`;function z(){const[r,l]=e.useState(!1),t=v();return e.useEffect(()=>{document.body.className="auth-screen",document.body.dataset.choukaPage="session";const a=document.createElement("style");return a.textContent=y,document.head.append(a),()=>{a.remove(),document.body.className="",delete document.body.dataset.choukaPage}},[]),n.jsxs(n.Fragment,{children:[n.jsx("div",{className:"auth-backdrop","aria-hidden":"true",children:n.jsx("img",{src:"/auth-art.webp",width:"1672",height:"941",alt:""})}),n.jsxs("header",{className:"auth-brand",children:[n.jsx("img",{src:"/auth-logo.png",width:"152",height:"120",alt:""}),n.jsx("span",{children:"抽卡系统"})]}),n.jsxs("main",{className:"auth-layout",children:[n.jsx("div",{className:"auth-intro",children:n.jsxs("h1",{children:[n.jsx("span",{children:"让想法，"}),n.jsx("span",{children:"成为作品"})]})}),n.jsx("div",{className:"auth-forms",children:n.jsxs("section",{className:"auth-panel",children:[n.jsxs("header",{className:"auth-panel-heading",children:[n.jsx("h2",{children:r?"注册账号":"登录"}),n.jsx("p",{className:"auth-description",children:r?"请填写真实姓名或花名，审批通过后即可登录。":"账号由管理员创建或审批开通"}),r&&n.jsx("p",{className:"auth-description",children:"若提交后长时间无法登录，请通过阿里钉联系彦龙（431661）、禾尚（286633）。"})]}),t.notice&&n.jsx("p",{className:"auth-notice",role:"status",children:t.notice}),n.jsxs("form",{className:"auth-form",onSubmit:a=>{a.preventDefault(),t.submit(a.currentTarget,r)},children:[n.jsxs("label",{className:"auth-field",children:[n.jsx("span",{children:"账号"}),n.jsx("input",{name:"username",autoComplete:"username",required:!0,placeholder:"请输入账号",autoCapitalize:"none",spellCheck:!1})]}),r&&n.jsxs(n.Fragment,{children:[n.jsxs("label",{className:"auth-field",children:[n.jsx("span",{children:"真实姓名 / 花名"}),n.jsx("input",{name:"display_name",autoComplete:"nickname",required:!0,maxLength:64})]}),n.jsxs("label",{className:"auth-field",children:[n.jsx("span",{children:"手机号"}),n.jsx("input",{name:"phone",type:"tel",inputMode:"numeric",autoComplete:"tel-national",required:!0,maxLength:11,pattern:"1[3-9][0-9]{9}"})]})]}),n.jsxs("label",{className:"auth-field",children:[n.jsxs("span",{children:["密码",r?"（至少 8 位）":""]}),n.jsx("input",{name:"password",type:"password",autoComplete:r?"new-password":"current-password",required:!0,minLength:r?8:void 0,maxLength:1024})]}),r&&n.jsxs(n.Fragment,{children:[n.jsxs("label",{className:"auth-field",children:[n.jsx("span",{children:"再输一次密码"}),n.jsx("input",{name:"confirm_password",type:"password",autoComplete:"new-password",required:!0,minLength:8,maxLength:1024})]}),n.jsx("p",{className:"auth-description auth-password-note",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。"})]}),n.jsx("p",{className:"auth-error",role:"alert",children:t.error}),n.jsxs("div",{className:"auth-actions",children:[n.jsx("button",{className:"auth-button auth-primary",disabled:!t.ready||t.busy,children:t.ready?t.busy?"提交中…":r?"提交注册申请":"登录":"正在检查登录状态…"}),n.jsx("button",{className:"auth-button auth-secondary",type:"button",disabled:t.busy,onClick:()=>{l(!r),t.clear()},children:r?"返回登录":"注册账号"})]})]},String(r))]})})]})]})}export{z as LoginPage};
