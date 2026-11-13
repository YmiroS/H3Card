import{reactExports as i,jsxRuntimeExports as e}from"./http-CceZLADw.js";import{usePageRuntime as a}from"./usePageRuntime-C43JFxzw.js";import"./main-8GYKWRqr.js";import"./monitor-alerts-1i8z99sD.js";const o=`@scope (body[data-chouka-page="ifStudio"]) {

  :scope { color-scheme: dark; font: 14px/1.5 "Microsoft YaHei", "PingFang SC", system-ui, sans-serif; }
  * { box-sizing: border-box; }
  :scope { margin: 0; background: #101318; color: #e5e7eb; }
  main { min-height: 100dvh; display: flex; flex-direction: column; }
  .toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 16px; padding: 14px 20px; border-bottom: 1px solid #303641; background: #171c23; }
  .heading { flex: 1; min-width: 180px; }
  h1 { font-size: 18px; margin: 0; }
  .heading p { margin: 2px 0 0; color: #b8c1cc; font-size: 12px; }
  .import { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
  label { color: #d7dce5; }
  select, button, .external { min-height: 44px; padding: 9px 14px; border: 1px solid #454d5b; border-radius: 8px; background: #252c36; color: #f3f4f6; font: inherit; }
  select { max-width: min(280px, 75vw); }
  button, .external { cursor: pointer; text-decoration: none; }
  button:hover, .external:hover { background: #35404d; }
  button:disabled { opacity: .55; cursor: wait; }
  #import-btn { border-color: #397994; background: #20526a; }
  :is(select, button, .external):focus-visible { outline: 2px solid #7dd3fc; outline-offset: 2px; }
  .status { margin: 0; padding: 7px 20px; min-height: 36px; color: #c4ceda; background: #171c23; }
  .status[data-error="true"] { color: #ffb4bc; }
  .frame-help { margin: 0; padding: 7px 20px; color: #b8c1cc; border-bottom: 1px solid #303641; }
  .frame-help a { color: #a9dcff; }
  .generator { margin: 16px 20px; padding: 16px; border: 1px solid #397994; border-radius: 8px; background: #1b2a34; }
  .generator h2 { margin: 0 0 10px; font-size: 16px; }
  .generator form { display: flex; flex-wrap: wrap; align-items: end; gap: 10px; }
  .generator label { display: flex; flex-direction: column; gap: 4px; }
  .generator .prompt { flex: 1 1 300px; }
  .generator textarea, .generator input { width: 100%; min-height: 44px; padding: 9px; border: 1px solid #454d5b; border-radius: 8px; background: #252c36; color: #f3f4f6; font: inherit; }
  .generator textarea { min-height: 70px; resize: vertical; }
  .generator .reference { flex: 1 1 250px; }
  .generator p { margin: 10px 0 0; }
  .generator a { color: #a9dcff; }
  .generator .media { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
  .generator .media img, .generator .media video { max-width: min(320px, 90vw); max-height: 260px; }
  .extension-transfer { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin: 16px 20px; padding: 16px; border: 1px solid #397994; border-radius: 8px; background: #1b2a34; }
  .extension-transfer[hidden], iframe[hidden] { display: none; }
  #extension-file { flex: 1; min-width: 180px; overflow-wrap: anywhere; }
  iframe { display: block; flex: 1; width: 100%; min-height: 420px; border: 0; background: #fff; }
  @media (max-width: 640px) { .toolbar { padding: 12px; } .import { width: 100%; } }

}`,t=()=>{};function s(){const r=i.useRef(null),n=a(r,"ifStudio","ifStudio","",o,t);return e.jsx("div",{id:"page-mount",ref:r,children:e.jsxs("main",{"aria-labelledby":"if-studio-unavailable",children:[e.jsxs("header",{className:"toolbar",children:[e.jsxs("div",{className:"heading",children:[e.jsx("h1",{id:"if-studio-unavailable",children:"IF Studio 已停用"}),e.jsx("p",{children:"IF 入口及新建能力已隐藏，历史画布和素材不会删除。"})]}),e.jsx("a",{className:"external",href:"/",children:"返回画布"})]}),n&&e.jsx("p",{role:"alert",children:n})]})})}export{s as IFStudioPage};
