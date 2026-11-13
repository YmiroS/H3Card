import{reactExports as a,HttpClient as R,ApiError as D,errorMessage as E,jsxRuntimeExports as n}from"./http-CceZLADw.js";import{createSessionService as L}from"./main-_fIIVATq.js";import"./monitor-alerts-1i8z99sD.js";const z=t=>location.replace(t.role==="monitor"?"/monitor":"/"),q=t=>t instanceof D&&t.status===410;function B(){const[t,j]=a.useState(!1),[u,l]=a.useState(!1),[e,s]=a.useState(""),[y,r]=a.useState(""),[k,v]=a.useState(!1),[g,N]=a.useState(null),[_,i]=a.useState(""),[b,S]=a.useState(!1),x=a.useRef(!1),C=a.useMemo(()=>new R,[]),f=a.useMemo(()=>L(C),[C]);a.useEffect(()=>{let o=!0;return f.me().then(d=>{o&&z(d.user)}).catch(async d=>{if(o){(!(d instanceof D)||d.status!==401)&&s(E(d)),j(!0);try{const w=await f.loginConfig();o&&v(w.dinghai_enabled)}catch{o&&v(!1)}}}),()=>{o=!1,C.invalidate()}},[C,f]);const M=()=>{N(null),i(""),S(!1)};return{ready:t,busy:u,error:e,notice:y,dinghaiEnabled:k,binding:g,bindingError:_,bindingExpired:b,clear:()=>{s(""),r("")},async submit(o,d,w=!1){if(x.current||!t||g||w&&!k)return;x.current=!0,l(!0),s(""),r("");const h=new FormData(o),c=p=>String(h.get(p)||"");o.querySelectorAll('input[type="password"]').forEach(p=>{p.value=""});try{if(d){if(c("password")!==c("confirm_password"))throw new Error("两次输入的密码不一致");await f.register(c("username"),c("display_name"),c("password"),c("phone")),r("注册申请已提交，审批通过后即可登录。"),o.reset()}else if(w){const p=await f.dinghaiLogin(c("username"),c("password"),h.get("bind_existing")==="on");p.status==="authenticated"?z(p.user):(i(""),S(!1),N(p))}else{const p=await f.login(c("username"),c("password"));z(p.user)}}catch(p){s(E(p))}finally{h.delete("password"),h.delete("confirm_password"),x.current=!1,l(!1)}},async confirmBinding(o){if(!g||x.current||b)return;const d=new FormData(o),w=String(d.get("username")||"").trim();if(o.querySelectorAll('input[type="password"]').forEach(h=>{h.value=""}),!w||!d.get("password")){d.delete("password"),i("请输入抽卡账号的用户名和密码。");return}x.current=!0,l(!0),i("");try{const h=f.dinghaiBind(g.binding_csrf,w,String(d.get("password")));d.delete("password");const c=await h;M(),z(c.user)}catch(h){q(h)?(S(!0),i("绑定验证已失效，请取消后重新进行定海登录。")):i(E(h))}finally{d.delete("password"),x.current=!1,l(!1)}},async cancelBinding(){if(!(!g||x.current)){x.current=!0,l(!0),i("");try{await f.dinghaiCancel(g.binding_csrf),M()}catch(o){b||o instanceof D&&[401,403,410].includes(o.status)?(M(),r("绑定验证已失效，请重新进行定海登录。")):i(E(o))}finally{x.current=!1,l(!1)}}}}}const F="_loginMethods_119aj_1",A="_loginMethod_119aj_1",I="_bindingOption_119aj_39",O="_track_119aj_66",P="_thumb_119aj_74",H="_dialog_119aj_111",T="_bindingDetails_119aj_132",Y="_dialogActions_119aj_153",m={loginMethods:F,loginMethod:A,bindingOption:I,switch:"_switch_119aj_48",track:O,thumb:P,dialog:H,bindingDetails:T,dialogActions:Y};function $({binding:t,returnFocus:j,busy:u,error:l,expired:e,onConfirm:s,onCancel:y}){const r=a.useRef(null),k=a.useRef(null),v=a.useRef(null),g=a.useId(),N=a.useId();a.useEffect(()=>{const i=r.current,b=j.current??document.activeElement;if(i)return i.showModal(),k.current?.focus(),()=>{i.close(),b instanceof HTMLElement&&b.isConnected&&b.focus()}},[j]);const _=()=>{u||(v.current&&(v.current.value=""),y())};return n.jsxs("dialog",{ref:r,className:m.dialog,"aria-labelledby":g,"aria-describedby":N,"aria-busy":u,onCancel:i=>{i.preventDefault(),_()},children:[n.jsx("h2",{id:g,children:"绑定已有抽卡账号"}),n.jsx("p",{id:N,className:"auth-description",children:"定海身份验证成功。你已选择绑定已有抽卡账号，请填写抽卡用户名和密码，验证通过后完成绑定并登录。 绑定后继续使用该抽卡账号的权限和数据，以后可直接使用定海账号登录。"}),n.jsx("dl",{className:m.bindingDetails,children:n.jsxs("div",{children:[n.jsx("dt",{children:"定海账号"}),n.jsx("dd",{children:t.dinghai_name})]})}),n.jsxs("form",{className:"auth-form",onSubmit:i=>{i.preventDefault(),s(i.currentTarget)},children:[n.jsxs("label",{className:"auth-field",children:[n.jsx("span",{children:"抽卡用户名"}),n.jsx("input",{ref:k,name:"username",autoComplete:"section-chouka-binding username",autoCapitalize:"none",spellCheck:!1,placeholder:"请输入已有抽卡账号的用户名",required:!0,disabled:u||e})]}),n.jsxs("label",{className:"auth-field",children:[n.jsx("span",{children:"抽卡密码"}),n.jsx("input",{ref:v,name:"password",type:"password",autoComplete:"section-chouka-binding current-password",required:!0,maxLength:1024,disabled:u||e})]}),n.jsx("p",{className:"auth-error",role:"alert",children:l}),n.jsxs("div",{className:m.dialogActions,children:[n.jsx("button",{type:"button",className:"auth-button auth-secondary",disabled:u,onClick:_,children:"取消"}),n.jsx("button",{type:"submit",className:"auth-button auth-primary",disabled:u||e,children:u?"处理中…":"确认绑定并登录"})]})]})]})}const G=`@scope (body[data-chouka-page="session"]) {
/* 登录与注册共用一套布局和控件，不影响画布及管理页样式。 */
:scope {
  color-scheme: dark;
  --auth-bg: #19120f;
  --auth-text: #f4ece0;
  --auth-muted: #c2b4a5;
  --auth-line: #8e7b68;
  --auth-accent: #dfc28e;
  --auth-focus: #eed8aa;
  --auth-control-bg: #2a211cd9;
  --auth-control-height: 52px;
  --auth-radius: 9px;
}

* { box-sizing: border-box; }
:scope, h1, h2, p { margin: 0; }
[hidden] { display: none !important; }

:scope.auth-screen {
  isolation: isolate;
  min-width: 280px;
  min-height: 100dvh;
  background: var(--auth-bg);
  color: var(--auth-text);
  font-family: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  scrollbar-color: var(--auth-line) var(--auth-bg);
}

::selection { color: #251b13; background: var(--auth-focus); }

.auth-backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
  background: var(--auth-bg);
}
.auth-backdrop img {
  display: block;
  width: min(100%, calc(100dvh * 1672 / 941));
  height: auto;
  object-fit: contain;
  object-position: left top;
}
/* 舞台底色铺满视口，原图等比完整显示；仅融合不含角色的画面边缘。 */
@media (min-aspect-ratio: 1672/941) {
  .auth-backdrop img { mask-image: linear-gradient(to right, #000 92%, transparent); }
}
@media (max-aspect-ratio: 1672/941) {
  .auth-backdrop img { mask-image: linear-gradient(to bottom, #000 96%, transparent); }
}

.auth-brand {
  position: absolute;
  top: clamp(22px, 2.6vh, 40px);
  left: 3.6%;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: clamp(18px, 1.25vw, 24px);
  font-weight: 600;
  line-height: 1.4;
}
.auth-brand img { width: 36px; height: auto; display: block; }

.auth-layout {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 24.25%);
  column-gap: 7%;
  padding: 48px 4.8% 48px 3.6%;
}
.auth-intro { padding-top: clamp(38px, 5vh, 72px); }
.auth-intro h1 {
  font-size: clamp(44px, 3.9vw, 88px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -.025em;
}
.auth-intro h1 span { display: block; }
.auth-forms {
  align-self: center;
  justify-self: center;
  width: 100%;
  max-width: 400px;
  min-width: 0;
}
.auth-panel { width: 100%; }
.auth-panel-heading { margin-bottom: 32px; }
.auth-panel-heading h2 {
  font-size: clamp(30px, 2.6vw, 44px);
  font-weight: 600;
  line-height: 1.25;
  margin-bottom: 12px;
  letter-spacing: -.02em;
}
.auth-description {
  font-size: 15px;
  line-height: 1.65;
  font-weight: 400;
  color: var(--auth-muted);
  overflow-wrap: break-word;
}
.auth-contact-note { margin-top: 6px; }
.auth-contacts { display: flex; flex-wrap: wrap; column-gap: 18px; }
.auth-contacts span { white-space: nowrap; font-weight: 400; }
.auth-form { display: grid; gap: 20px; }
.auth-field { display: grid; gap: 9px; min-width: 0; }
.auth-field > span { font-size: 17px; font-weight: 400; line-height: 1.4; }
.auth-field input {
  width: 100%;
  min-width: 0;
  height: var(--auth-control-height);
  padding: 0 18px;
  border: 1px solid var(--auth-line);
  border-radius: var(--auth-radius);
  background: var(--auth-control-bg);
  color: var(--auth-text);
  caret-color: var(--auth-accent);
  font: inherit;
  font-size: 16px;
  transition: border-color .16s;
}
.auth-field input::placeholder { color: var(--auth-muted); opacity: 1; }
.auth-field input:hover:not(:disabled) { border-color: #c2ab8f; }
.auth-field input:focus-visible,
.auth-button:focus-visible {
  outline: 2px solid var(--auth-focus);
  outline-offset: 3px;
}
.auth-field input[aria-invalid="true"] { border-color: #ffb0ad; }
.auth-field input:disabled { opacity: .7; }
.auth-field input:autofill {
  caret-color: var(--auth-text);
  -webkit-text-fill-color: var(--auth-text);
  box-shadow: 0 0 0 1000px #2a211c inset;
}
.auth-actions { display: grid; gap: 14px; margin-top: 8px; }
.auth-button {
  width: 100%;
  min-height: var(--auth-control-height);
  border-radius: var(--auth-radius);
  border: 1px solid transparent;
  padding: 10px 16px;
  font: inherit;
  font-size: 19px;
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;
  transition: background-color .16s, border-color .16s, transform .16s;
}
.auth-primary { background: var(--auth-accent); color: #251b13; }
.auth-primary:hover:not(:disabled) { background: #eed3a0; }
.auth-secondary { background: #19120f40; color: var(--auth-text); border-color: #c4ae91; }
.auth-secondary:hover:not(:disabled) { background: #dfc28e14; border-color: var(--auth-accent); }
.auth-button:active:not(:disabled) { transform: translateY(1px); }
.auth-button:disabled { cursor: wait; opacity: .65; }
.auth-password-note { margin-top: -6px; }
.auth-error {
  color: #ffb0ad;
  font-size: 15px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.auth-error:empty { display: none; }
.auth-notice {
  margin-bottom: 20px;
  padding: 14px 16px;
  background: #30251b;
  border: 1px solid #b69a70;
  border-radius: var(--auth-radius);
  color: #f4e2bd;
  font-size: 15px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.auth-panel-heading h2:focus-visible,
.auth-error:focus-visible,
.auth-notice:focus-visible { outline: 2px solid var(--auth-focus); outline-offset: 5px; }
#register-panel .auth-panel-heading { margin-bottom: 24px; }
#register .auth-actions { margin-top: 0; }

@media (min-width: 1500px) {
  :scope { --auth-control-height: 56px; }
  .auth-field > span { font-size: 18px; }
  .auth-field input { font-size: 18px; }
  .auth-button { font-size: 20px; }
}

@media (max-width: 1100px) and (min-width: 761px) {
  .auth-layout { column-gap: 5%; padding-left: 5.2%; grid-template-columns: minmax(0, 1fr) 350px; }
  .auth-intro { padding-top: 12px; }
  .auth-intro h1 { font-size: clamp(40px, 5.2vw, 56px); }
  .auth-backdrop img {
    margin-top: 220px;
    width: min(100%, calc((100dvh - 220px) * 1672 / 941));
    mask-image: linear-gradient(to bottom, #000 96%, transparent);
  }
  .auth-forms { background: #19120fe6; padding: 24px 20px; }
}

@media (min-width: 1101px) and (max-height: 600px) {
  .auth-intro h1 { font-size: clamp(24px, 5.5dvh, 36px); }
}

@media (max-width: 760px) {
  .auth-brand { position: relative; top: auto; left: auto; padding: 24px 24px 0; font-size: 20px; gap: 10px; }
  .auth-brand img { width: 34px; }
  .auth-backdrop { position: absolute; top: 68px; bottom: auto; height: calc(100vw * 941 / 1000); }
  /* 手机只裁去右侧空舞台，保留角色、完整尾巴和原图全部高度。 */
  .auth-backdrop img {
    width: calc(100vw * 1672 / 1000);
    mask-image: linear-gradient(to bottom, #000 96%, transparent);
  }
  .auth-layout { display: block; min-height: auto; padding: 0 24px 40px; }
  .auth-intro { padding-top: calc(100vw * 941 / 1000 + 18px); padding-bottom: 28px; }
  .auth-intro h1 { font-size: clamp(36px, 9vw, 52px); line-height: 1.15; }
  .auth-forms { max-width: 440px; margin-inline: auto; position: relative; }
  .auth-panel-heading { margin-bottom: 26px; }
  .auth-panel-heading h2 { font-size: 30px; }
  .auth-description { font-size: 14px; }
  .auth-form { gap: 18px; }
  .auth-field > span { font-size: 16px; }
  .auth-field input { background: #2a211c; }
  .auth-secondary { background: var(--auth-bg); }
  .auth-actions { margin-top: 4px; }
}

@media (max-width: 360px) {
  .auth-brand { padding-inline: 20px; }
  .auth-layout { padding-inline: 20px; }
  .auth-contacts { column-gap: 10px; }
}

@media (prefers-reduced-motion: reduce) {
  .auth-field input, .auth-button { transition: none; }
  .auth-button:active:not(:disabled) { transform: none; }
}

}`;function U(){const[t,j]=a.useState(!1),[u,l]=a.useState(!0),e=B(),s=!t&&e.dinghaiEnabled&&u,y=a.useRef(null);return a.useEffect(()=>{document.body.className="auth-screen",document.body.dataset.choukaPage="session";const r=document.createElement("style");return r.textContent=G,document.head.append(r),()=>{r.remove(),document.body.className="",delete document.body.dataset.choukaPage}},[]),n.jsxs(n.Fragment,{children:[n.jsx("div",{className:"auth-backdrop","aria-hidden":"true",children:n.jsx("img",{src:"/auth-art.webp",width:"1672",height:"941",alt:""})}),n.jsxs("header",{className:"auth-brand",children:[n.jsx("img",{src:"/auth-logo.png",width:"152",height:"120",alt:""}),n.jsx("span",{children:"抽卡系统"})]}),n.jsxs("main",{className:"auth-layout",children:[n.jsx("div",{className:"auth-intro",children:n.jsxs("h1",{children:[n.jsx("span",{children:"让想法，"}),n.jsx("span",{children:"成为作品"})]})}),n.jsx("div",{className:"auth-forms",children:n.jsxs("section",{className:"auth-panel",children:[n.jsxs("header",{className:"auth-panel-heading",children:[n.jsx("h2",{children:t?"注册账号":"登录"}),n.jsx("p",{className:"auth-description",children:t?"请填写真实姓名或花名，审批通过后即可登录。":s?"使用定海账号即可登录，无需抽卡账号。首次登录自动开通普通用户；已有绑定继续沿用。":"账号由管理员创建或审批开通"}),t&&n.jsx("p",{className:"auth-description",children:"若提交后长时间无法登录，请通过阿里钉联系彦龙（431661）、禾尚（286633）。"})]}),!t&&e.dinghaiEnabled&&n.jsxs("div",{className:m.loginMethods,role:"group","aria-label":"登录方式",children:[n.jsx("button",{type:"button",className:m.loginMethod,"aria-pressed":!s,disabled:e.busy,onClick:()=>{l(!1),e.clear()},children:"本地登录"}),n.jsx("button",{type:"button",className:m.loginMethod,"aria-pressed":s,disabled:e.busy,onClick:()=>{l(!0),e.clear()},children:"定海登录"})]}),e.notice&&n.jsx("p",{className:"auth-notice",role:"status",children:e.notice}),n.jsxs("form",{className:"auth-form",onChange:()=>{!t&&!e.dinghaiEnabled&&l(!1)},onSubmit:r=>{r.preventDefault(),e.submit(r.currentTarget,t,s)},children:[n.jsxs("label",{className:"auth-field",children:[n.jsx("span",{children:s?"定海账号":"账号"}),n.jsx("input",{name:"username",autoComplete:"username",required:!0,placeholder:s?"请输入定海账号":"请输入账号",disabled:e.busy,autoCapitalize:"none",spellCheck:!1})]}),t&&n.jsxs(n.Fragment,{children:[n.jsxs("label",{className:"auth-field",children:[n.jsx("span",{children:"真实姓名 / 花名"}),n.jsx("input",{name:"display_name",autoComplete:"nickname",required:!0,maxLength:64})]}),n.jsxs("label",{className:"auth-field",children:[n.jsx("span",{children:"手机号"}),n.jsx("input",{name:"phone",type:"tel",inputMode:"numeric",autoComplete:"tel-national",required:!0,maxLength:11,pattern:"1[3-9][0-9]{9}"})]})]}),n.jsxs("label",{className:"auth-field",children:[n.jsxs("span",{children:[s?"定海密码":"密码",t?"（至少 8 位）":""]}),n.jsx("input",{name:"password",type:"password",disabled:e.busy,autoComplete:t?"new-password":"current-password",required:!0,minLength:t?8:void 0,maxLength:1024})]}),t&&n.jsxs(n.Fragment,{children:[n.jsxs("label",{className:"auth-field",children:[n.jsx("span",{children:"再输一次密码"}),n.jsx("input",{name:"confirm_password",type:"password",autoComplete:"new-password",required:!0,minLength:8,maxLength:1024})]}),n.jsx("p",{className:"auth-description auth-password-note",children:"密码无需组合大小写、数字或符号，请勿使用 12345678 等常见弱密码。"})]}),s&&n.jsxs("div",{children:[n.jsxs("label",{className:m.bindingOption,children:[n.jsx("span",{children:"绑定已有抽卡账号"}),n.jsxs("span",{className:m.switch,children:[n.jsx("input",{type:"checkbox",role:"switch",name:"bind_existing","aria-describedby":"binding-help",disabled:e.busy}),n.jsx("span",{className:m.track,"aria-hidden":"true",children:n.jsx("span",{className:m.thumb})})]})]}),n.jsx("p",{id:"binding-help",className:"auth-description",children:"默认关闭，普通定海登录无需开启。仅需沿用已有抽卡账号的权限和画布时开启，再验证抽卡用户名及密码。"})]}),n.jsx("p",{className:"auth-error",role:"alert",children:e.error}),n.jsxs("div",{className:"auth-actions",children:[n.jsx("button",{ref:y,className:"auth-button auth-primary",disabled:!e.ready||e.busy,children:e.ready?e.busy?"提交中…":t?"提交注册申请":"登录":"正在检查登录状态…"}),n.jsx("button",{className:"auth-button auth-secondary",type:"button",disabled:e.busy,onClick:()=>{j(!t),l(!0),e.clear()},children:t?"返回登录":"注册账号"})]})]},`${t}-${s}`)]})})]}),e.binding&&n.jsx($,{binding:e.binding.binding,returnFocus:y,busy:e.busy,error:e.bindingError,expired:e.bindingExpired,onConfirm:r=>{e.confirmBinding(r)},onCancel:()=>{e.cancelBinding()}})]})}export{U as LoginPage};
