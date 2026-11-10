import{reactExports as i,jsxRuntimeExports as r}from"./http-BHgZKsmB.js";import{usePageRuntime as a}from"./usePageRuntime-wDbASVgs.js";import"./main-0wSCWStg.js";import"./monitor-alerts-BXpxzu-0.js";const o=`@scope (body[data-chouka-page="ifStudio"]) {\r
\r
  :scope { color-scheme: dark; font: 14px/1.5 "Microsoft YaHei", "PingFang SC", system-ui, sans-serif; }\r
  * { box-sizing: border-box; }\r
  :scope { margin: 0; background: #101318; color: #e5e7eb; }\r
  main { min-height: 100dvh; display: flex; flex-direction: column; }\r
  .toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 16px; padding: 14px 20px; border-bottom: 1px solid #303641; background: #171c23; }\r
  .heading { flex: 1; min-width: 180px; }\r
  h1 { font-size: 18px; margin: 0; }\r
  .heading p { margin: 2px 0 0; color: #b8c1cc; font-size: 12px; }\r
  .import { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }\r
  label { color: #d7dce5; }\r
  select, button, .external { min-height: 44px; padding: 9px 14px; border: 1px solid #454d5b; border-radius: 8px; background: #252c36; color: #f3f4f6; font: inherit; }\r
  select { max-width: min(280px, 75vw); }\r
  button, .external { cursor: pointer; text-decoration: none; }\r
  button:hover, .external:hover { background: #35404d; }\r
  button:disabled { opacity: .55; cursor: wait; }\r
  #import-btn { border-color: #397994; background: #20526a; }\r
  :is(select, button, .external):focus-visible { outline: 2px solid #7dd3fc; outline-offset: 2px; }\r
  .status { margin: 0; padding: 7px 20px; min-height: 36px; color: #c4ceda; background: #171c23; }\r
  .status[data-error="true"] { color: #ffb4bc; }\r
  .frame-help { margin: 0; padding: 7px 20px; color: #b8c1cc; border-bottom: 1px solid #303641; }\r
  .frame-help a { color: #a9dcff; }\r
  .generator { margin: 16px 20px; padding: 16px; border: 1px solid #397994; border-radius: 8px; background: #1b2a34; }\r
  .generator h2 { margin: 0 0 10px; font-size: 16px; }\r
  .generator form { display: flex; flex-wrap: wrap; align-items: end; gap: 10px; }\r
  .generator label { display: flex; flex-direction: column; gap: 4px; }\r
  .generator .prompt { flex: 1 1 300px; }\r
  .generator textarea, .generator input { width: 100%; min-height: 44px; padding: 9px; border: 1px solid #454d5b; border-radius: 8px; background: #252c36; color: #f3f4f6; font: inherit; }\r
  .generator textarea { min-height: 70px; resize: vertical; }\r
  .generator .reference { flex: 1 1 250px; }\r
  .generator p { margin: 10px 0 0; }\r
  .generator a { color: #a9dcff; }\r
  .generator .media { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }\r
  .generator .media img, .generator .media video { max-width: min(320px, 90vw); max-height: 260px; }\r
  .extension-transfer { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin: 16px 20px; padding: 16px; border: 1px solid #397994; border-radius: 8px; background: #1b2a34; }\r
  .extension-transfer[hidden], iframe[hidden] { display: none; }\r
  #extension-file { flex: 1; min-width: 180px; overflow-wrap: anywhere; }\r
  iframe { display: block; flex: 1; width: 100%; min-height: 420px; border: 0; background: #fff; }\r
  @media (max-width: 640px) { .toolbar { padding: 12px; } .import { width: 100%; } }\r
\r
}`,t=()=>{};function s(){const e=i.useRef(null),n=a(e,"ifStudio","ifStudio","",o,t);return r.jsx("div",{id:"page-mount",ref:e,children:r.jsxs("main",{"aria-labelledby":"if-studio-unavailable",children:[r.jsxs("header",{className:"toolbar",children:[r.jsxs("div",{className:"heading",children:[r.jsx("h1",{id:"if-studio-unavailable",children:"IF Studio 已停用"}),r.jsx("p",{children:"IF 入口及新建能力已隐藏，历史画布和素材不会删除。"})]}),r.jsx("a",{className:"external",href:"/",children:"返回画布"})]}),n&&r.jsx("p",{role:"alert",children:n})]})})}export{s as IFStudioPage};
