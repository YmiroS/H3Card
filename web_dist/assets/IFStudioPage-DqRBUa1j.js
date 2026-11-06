import{reactExports as D,jsxRuntimeExports as L}from"./http-DOrwCtZg.js";import{usePageRuntime as Q}from"./usePageRuntime-By_CpbQZ.js";import"./main-BVTZFS1m.js";import"./monitor-alerts-CrEMzfVq.js";const Z=`<main>
  <header class="toolbar">
    <div class="heading"><h1>IF Studio</h1><p>使用本机 IF 账号生成图片或视频，并加入 Chouka 画布。</p></div>
    <div class="import">
      <label for="project">目标画布</label><select id="project" aria-label="选择目标画布"></select>
      <input id="file" type="file" accept="image/*,video/*" hidden>
      <button id="import-btn" type="button" disabled>添加图片／视频到画布</button>
      <a class="external" href="https://ifs.alibaba-inc.com/" target="_blank" rel="noopener noreferrer">单独打开 IF Studio ↗</a>
    </div>
  </header>
  <p id="status" class="status" role="status" aria-live="polite">正在读取可操作画布…</p>
  <section class="generator" aria-label="本机 IF Studio 生成">
    <h2>本机 IF Studio 生成</h2>
    <form id="if-generate-form">
      <label>类型<select id="if-type"><option value="image">图片</option><option value="video">视频</option></select></label>
      <label>模型<select id="if-model" required></select></label>
      <label class="prompt">生成需求<textarea id="if-prompt" required maxlength="4000" placeholder="描述需要生成的画面或视频"></textarea></label>
      <label class="reference">参考图片／视频 HTTPS 地址（可选）<input id="if-reference" type="url" placeholder="https://…"></label>
      <label>IF 技能（可选）<input id="if-skill" type="text" maxlength="120" placeholder="如：商品展示"></label>
      <label><input id="if-continue" type="checkbox" disabled>继续上次 IF 画布</label>
      <button id="if-generate" type="submit" disabled>开始生成</button>
    </form>
    <p id="if-bridge-status" role="status" aria-live="polite">正在连接本机桥接程序…</p>
    <div id="if-results" class="media"></div>
  </section>
  <div id="extension-transfer" class="extension-transfer" hidden>
    <span id="extension-file"></span>
    <button id="extension-confirm" type="button">确认加入所选画布</button>
    <button id="extension-cancel" type="button">取消</button>
  </div>
  <p id="frame-help" class="frame-help">如果下方无法显示或登录，请使用“单独打开 IF Studio”；网站是否允许嵌入由 IF Studio 决定。图片或视频请先从 IF Studio 下载，再通过上方按钮添加到画布。</p>
  <iframe id="if-frame" title="IF Studio 网站" referrerpolicy="strict-origin-when-cross-origin"></iframe>
</main>`,ee=`@scope (body[data-chouka-page="ifStudio"]) {

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

}`;function te(v,C,w,u){const{window:q,document:e,addEventListener:ne,setTimeout:J,clearTimeout:oe,setInterval:ae,clearInterval:ie,requestAnimationFrame:re,cancelAnimationFrame:se,ResizeObserver:le,MutationObserver:de,IntersectionObserver:ce,URL:K}=v,f=C,F=w;q.H3Auth=C,q.H3Notify=w;const V=u.mediaFetch;(()=>{const d=e.getElementById("project"),E=e.getElementById("file"),S=e.getElementById("import-btn"),O=e.getElementById("status"),T=e.getElementById("extension-transfer"),W=e.getElementById("extension-file"),$=e.getElementById("extension-confirm"),X=e.getElementById("extension-cancel");let b=null;new URLSearchParams(location.search).has("extension")?(e.getElementById("if-frame").hidden=!0,e.getElementById("frame-help").textContent="在独立打开的 IF Studio 中点击图片或视频上的“加入 Chouka 画布”，然后在这里确认目标画布。历史会话仍在 IF Studio 独立页面使用。",e.querySelector(".heading p").textContent="从独立 IF Studio 页面接收选中的产物。"):e.getElementById("if-frame").src="https://ifs.alibaba-inc.com/";function c(a,l=!1,i=""){if(O.textContent=a,O.dataset.error=String(l),l&&F.error(a),i){const o=e.createElement("a");o.href=i,o.textContent=" 查看画布",o.style.color="#a9dcff",O.append(o)}}async function Y(){await f.requireUser(),f.mountAccount(e.getElementById("account"));const l=(await f.request("/api/projects")).projects.filter(i=>i.permission==="operate"&&!i.locked);for(const i of l){const o=e.createElement("option");o.value=i.id,o.textContent=i.name,d.append(o)}try{const i=localStorage.getItem(`chouka:last-project:${f.user.id}`);l.some(o=>o.id===i)&&(d.value=i)}catch{}S.disabled=!l.length,c(l.length?"选择目标画布，可在本机生成或导入 IF Studio 产物。":"没有可操作画布，请先到「画布」新建。"),G()}async function P(a){const l=/\.(png|jpe?g|webp|gif|bmp)$/i.test(a.name);if(!l&&!/\.(mp4|webm|mkv|mov|avi)$/i.test(a.name))return c("仅支持画布已接收的图片和视频格式。",!0),!1;const i=d.value;S.disabled=!0,$.disabled=!0,d.disabled=!0;try{c("正在上传素材…");const o=new FormData;o.append("file",a,a.name);const g=(await f.request(`/api/upload?project=${encodeURIComponent(i)}${l?"&local_only=1":""}`,{method:"POST",body:o})).files?.[0];if(!g||!["image","video"].includes(g.kind))throw new Error("上传接口未返回图片或视频");const h=await f.request(`/api/projects/${encodeURIComponent(i)}`);if(h.permission!=="operate"||h.locked)throw new Error("目标画布已不可编辑");c("上传成功，正在添加素材节点…");const B=h.cards.reduce((y,k)=>{const I=/^素材(\d+)$/.exec(k.name||"");return I?Math.max(y,Number(I[1])):y},0)+1,p=h.cards.length,r={id:Array.from(crypto.getRandomValues(new Uint8Array(16)),y=>y.toString(16).padStart(2,"0")).join(""),type:"card_asset",cap:"asset",name:`素材${B}`,x:80+p%3*300,y:80+Math.floor(p/3)*260,params:{},assets:{},status:null,progress:0,outputs:[{...g,filename:(g.origin||g.url).split(/[\\/]/).pop()}]};return await f.json(`/api/projects/${encodeURIComponent(i)}/cards`,"POST",{card:r}),c("已添加到画布。",!1,`/?project=${encodeURIComponent(i)}&card=${encodeURIComponent(r.id)}`),!0}catch(o){return c(`添加失败：${o.message}`,!0),!1}finally{d.disabled=!1,S.disabled=!d.options.length,$.disabled=!d.options.length}}function G(){const a=u.localBridge.baseURL,l=e.getElementById("if-generate-form"),i=e.getElementById("if-type"),o=e.getElementById("if-model"),H=e.getElementById("if-prompt"),g=e.getElementById("if-reference"),h=e.getElementById("if-skill"),B=e.getElementById("if-continue"),p=e.getElementById("if-generate"),r=e.getElementById("if-bridge-status"),y=e.getElementById("if-results"),k=`chouka:if-studio-job:${f.user.id}`;let I=[],z=null;const j=(s,t={})=>u.localBridge.request(s,t);function M(){o.replaceChildren();for(const s of I.filter(t=>t.type===i.value)){const t=e.createElement("option");t.value=s.display_name,t.textContent=s.display_name,o.append(t)}p.disabled=!o.options.length}i.addEventListener("change",M);async function A(s){try{const t=await j(`/runs/${encodeURIComponent(s)}`);if(t.result?.canvas_url){const x=new K(t.result.canvas_url);if(x.protocol==="https:"&&x.hostname==="ifs.alibaba-inc.com"&&!r.querySelector("a")){const m=e.createElement("a");m.href=x.href,m.target="_blank",m.rel="noopener noreferrer",m.textContent=" 打开 IF 画布",r.append(m)}}if(t.state==="starting"||t.state==="running"){t.state==="running"&&(r.firstChild.textContent="IF 正在生成，画布已创建。"),J(()=>A(s),2500);return}if(p.disabled=!o.options.length,t.state==="error"){r.firstChild.textContent=`生成失败：${t.error}`,F.error(r.firstChild.textContent);return}const n=t.result;z={canvas_id:n.canvas_id,session_id:n.session_id},B.disabled=!1,r.firstChild.textContent=n.status==="done"?"IF 生成完成。":n.status==="summary_feedback"&&n.planning_text?.includes("任务执行失败")?`IF 生成失败：${n.planning_text}`:n.status==="summary_feedback"&&n.planning_text?.includes("后台处理中")?"IF 视频仍在后台处理中；可稍后在 IF 画布查看结果。":n.status==="summary_feedback"&&(n.planning_text?.includes("已生成完毕")||n.planning_text?.includes("任务已完成"))?"IF 报告任务已完成，但未返回媒体；请在 IF 画布核查。":n.status==="summary_feedback"?`IF 等待确认：${n.planning_text||n.message||"请在 IF 画布继续"}`:n.status==="ask_user"?"IF 需要补充信息，请在 IF 画布填写表单。":`IF 任务状态：${n.status||"未知"}。`;for(const x of n.downloaded||[]){const m=e.createElement("div"),N=`${a}/runs/${encodeURIComponent(s)}/media/${x.index}`,_=e.createElement(x.type==="video"?"video":"img");_.crossOrigin="anonymous",_.src=N,x.type==="video"&&(_.controls=!0),m.append(_);const R=e.createElement("button");R.type="button",R.textContent="加入所选 Chouka 画布",R.addEventListener("click",async()=>{try{const U=await V(N,{credentials:"omit"});if(!U.ok)throw new Error("本机媒体读取失败");await P(new File([await U.blob()],x.name))}catch(U){c(`添加失败：${U.message}`,!0)}}),m.append(R),y.append(m)}}catch(t){if(p.disabled=!o.options.length,t.message==="任务不存在"){try{localStorage.removeItem(k)}catch{}r.textContent="本机桥接已重启，历史任务请到 IF Studio 画布查看。"}else r.textContent=`本机桥接断开：${t.message}`,F.error(r.textContent)}}l.addEventListener("submit",async s=>{s.preventDefault(),p.disabled=!0,y.replaceChildren(),r.textContent="正在向 IF Studio 提交生成需求…";const t={type:i.value,model:o.value,prompt:H.value.trim()};g.value.trim()&&(t.image=g.value.trim()),h.value.trim()&&(t.skill=h.value.trim()),B.checked&&z&&Object.assign(t,z);try{const n=await j("/runs",{method:"POST",headers:{"Content-Type":"application/json","X-Chouka-IF":"generate"},body:JSON.stringify(t)});r.textContent="IF 已接收生成请求，正在创建画布…";try{localStorage.setItem(k,n.id)}catch{}A(n.id)}catch(n){r.textContent=`提交失败：${n.message}`,F.error(r.textContent),p.disabled=!o.options.length}}),(async()=>{try{if(!(await j("/status")).ready)throw new Error("请先在本机运行 ifs auth login --registry https://ifs.alibaba-inc.com/");I=(await j("/models")).models,M(),r.textContent=`本机 IF 已登录；可选 ${I.filter(n=>n.type==="image").length} 个图像模型、${I.filter(n=>n.type==="video").length} 个视频模型。`;let t;try{t=localStorage.getItem(k)}catch{}t&&(r.textContent="正在恢复上次 IF 生成任务…",p.disabled=!0,A(t))}catch(s){r.textContent=`无法连接 IF：${s.message}。请在本机启动桥接程序，并配置此 Chouka 页面的准确来源。`,F.error(r.textContent)}})()}S.addEventListener("click",()=>E.click()),E.addEventListener("change",()=>{const a=E.files[0];E.value="",a&&P(a)}),q.addEventListener("message",a=>{a.source!==v.nativeWindow||a.origin!==location.origin||a.data?.source!=="chouka-if-extension"||a.data.type!=="file"||!(a.data.file instanceof File)||(b=a.data.file,W.textContent=`待加入：${b.name}（${(b.size/1024/1024).toFixed(1)} MB）`,T.hidden=!1,$.disabled=!d.options.length,c(d.options.length?"选择目标画布后确认添加；文件不会自动上传。":"请先在「画布」新建画布，再从 IF Studio 重新发送素材。",!d.options.length))}),$.addEventListener("click",async()=>{b&&await P(b)&&(b=null,T.hidden=!0)}),X.addEventListener("click",()=>{b=null,T.hidden=!0,c("已取消加入画布。")}),Y().catch(a=>c(`画布列表加载失败：${a.message}`,!0))})()}function ge(){const v=D.useRef(null),C=D.useCallback(u=>{te(u.scope,u.auth,u.notify,u.services)},[]),w=Q(v,"ifStudio","ifstudio","",ee,C);return L.jsxs(L.Fragment,{children:[L.jsx("div",{id:"page-mount",ref:v,dangerouslySetInnerHTML:{__html:Z}}),w&&L.jsx("p",{role:"alert",children:w})]})}export{ge as IFStudioPage};
