import{errorMessage as Or,ApiError as Ha,clientExports as Wl,jsxRuntimeExports as ie,reactExports as pt}from"./http-DOrwCtZg.js";import{reactDomExports as Ul}from"./index-BgVeoShv.js";import{isLiveTask as Ti,taskDeleteResultSchema as Wa,taskHistoryPageSchema as Jl,formatQueueStatus as Qa,tasksSchema as Xl,projectSpaces as Yl,projectListSchema as Vl,LoadingRequest as Kl}from"./index-i3zCBpJu.js";import{object as es,number as lo,string as Ri}from"./monitor-alerts-DzGBiSiF.js";import{usePageRuntime as Gl}from"./usePageRuntime-D-k-HLbb.js";import{userSchema as Zl}from"./session-M0f98iVb.js";import"./json-D9oFO1Iy.js";const Ql=`\r
<!-- ---------- 左侧项目栏 ---------- -->\r
<aside id="side" aria-label="画布项目"><div id="react-projects"></div><a class="dot" id="dot" title="ComfyUI 连接状态" aria-label="ComfyUI 连接状态"></a></aside>\r
\r
<!-- ---------- 主区 ---------- -->\r
<main id="main">\r
  <div id="topbar" aria-label="画布工具栏">\r
    <button class="tbtn icon-btn" id="toggle" title="收起/展开项目栏" aria-label="收起或展开项目栏" aria-controls="side" aria-expanded="true">☰</button>\r
    <span class="crumb">画布</span><span class="crumb-sep">/</span>\r
    <span id="ptitle"></span>\r
    <button class="tbtn" id="fit" style="display:none">适应视图</button>\r
    <span id="hint"></span>\r
    <div id="presence-users" aria-label="当前画布在线成员"></div>\r
    <button class="tbtn" id="jobsbtn" title="查看所有任务">任务</button>\r
  </div>\r
\r
  <div id="stage">\r
    <svg id="wires"></svg>\r
    <div id="groups"></div>\r
    <div id="world"></div>\r
    <div id="presence-layer" aria-hidden="true"></div>\r
    <div id="lasso" style="display:none"></div>\r
    <div id="selbar" style="display:none"></div>\r
    <div id="panel" style="display:none"></div>\r
    <div id="dock" style="display:none"></div>\r
    <div id="canvas-toolbar" aria-label="视图控制">\r
      <button id="minimap-btn" class="toolbar-btn" title="小地图" aria-label="打开小地图">▦</button>\r
      <button id="wires-toggle" class="toolbar-btn" title="显示/隐藏连线" aria-label="显示或隐藏连线">⌁</button>\r
      <button id="zoom-menu" class="toolbar-btn" title="缩放"><span id="zoom-percent">100%</span></button>\r
    </div>\r
    <div id="minimap" style="display:none">\r
      <canvas id="minimap-canvas"></canvas>\r
      <div id="minimap-viewport"></div>\r
    </div>\r
  </div>\r
\r
  <div id="empty">\r
    <div class="empty-icon" aria-hidden="true">◇</div>\r
    <div class="big">开始一张新的创作画布</div>\r
    <div class="empty-copy">组合图片、视频与文本节点，把每一次生成变成可复用的工作流。</div>\r
    <div class="cta">\r
      <button id="createHere"><span aria-hidden="true">＋</span> 新建画布</button>\r
    </div>\r
    <div class="empty-shortcuts"><span>左键拖动框选</span><span>中键 / Shift + 左键拖动画布</span><span>滚轮缩放</span><span>拖动端口连接节点</span></div>\r
  </div>\r
</main>\r
\r
<!-- ---------- 右侧历史产物栏 ---------- -->\r
<aside id="hist" style="display:none"></aside>\r
\r
<div id="jobs" style="display:none"></div>\r
<div id="respop" style="display:none"></div>\r
<div id="view" style="display:none"><div class="vbox"></div></div>\r
<div id="menu" style="display:none"></div>\r
<div id="tip" style="display:none"></div>\r
<div id="toast"></div>\r
<input type="file" id="picker" style="display:none">`,ed=`@scope (body[data-chouka-page="canvas"]) {\r
* { box-sizing: border-box; margin: 0; padding: 0; }\r
:scope {\r
  --bg: #05060d; --panel: #0b0f1c; --panel2: #111726; --line: #1e2a44;\r
  --txt: #d8e6f2; --dim: #6b7f9e;\r
  --acc: #00e5ff;            /* 霓虹青：主色 / 连线 / 选中 */\r
  --acc2: #ff2d95;           /* 霓虹品红：输出端口 / 危险 */\r
  --ok: #4dff9f; --warn: #ffb000; --err: #ff3b5c;\r
  --sty: #b57bff;            /* 紫：风格卡 / 风格连线。它传文字不传产物，要和青/洋红分开 */\r
  --mono: "JetBrains Mono", Consolas, "Cascadia Mono", monospace;\r
  color-scheme: dark;   /* 让原生 select 下拉、滚动条跟着走暗色 */\r
}\r
html, :scope { height: 100%; }\r
:scope {\r
  background: var(--bg); color: var(--txt); overflow: hidden;\r
  font: 13px/1.5 "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;\r
  display: flex;\r
  /* 整个界面一律不可选字：这是个画布，鼠标是用来拖卡/框选/连线的。\r
     一拖就拉出一片蓝色高亮，Ctrl+A 更是直接把满屏文字全选上。\r
     真要选字的地方只有输入框，下面单独开口子 */\r
  user-select: none;\r
}\r
input, textarea { user-select: text; }\r
button { font: inherit; color: inherit; background: none; border: none; cursor: pointer; }\r
input, textarea, select {\r
  font: inherit; color: var(--txt); background: #0a0f1c;\r
  border: 1px solid var(--line); border-radius: 3px; padding: 6px 8px; outline: none;\r
}\r
input:focus, textarea:focus { border-color: var(--acc); box-shadow: 0 0 0 1px #00e5ff40; }\r
textarea { resize: vertical; }\r
input[type=number], input[type=range] { font-family: var(--mono); }\r
::-webkit-scrollbar { width: 8px; height: 8px; }\r
::-webkit-scrollbar-thumb { background: #1e2a44; border-radius: 0; }\r
::-webkit-scrollbar-thumb:hover { background: #2b3d63; }\r
\r
/* ---------- 左侧项目栏 ---------- */\r
#side {\r
  width: 248px; flex: 0 0 248px; background: var(--panel);\r
  border-right: 1px solid var(--line); display: flex; flex-direction: column;\r
  transition: flex-basis .18s ease, width .18s ease; overflow: hidden;\r
  box-shadow: 1px 0 12px #00e5ff10;\r
}\r
:scope.collapsed #side { width: 0; flex-basis: 0; border-right: none; }\r
#side .head { padding: 14px 14px 12px; display: flex; align-items: center; gap: 8px; }\r
/* 左上角那枚图标。带一层跟标题同色的辉光，免得深色底上像贴上去的一块；\r
   flex:none 是防着侧栏收起动画（flex-basis→0）把它压成一条 */\r
#side .head .logo {\r
  width: 26px; height: 26px; flex: none; border-radius: 5px;\r
  filter: drop-shadow(0 0 6px #00e5ff66);\r
}\r
#side .head b {\r
  font-size: 15px; letter-spacing: 3px; color: #eaf6ff;\r
  text-shadow: 0 0 8px #00e5ffcc, 0 0 20px #00e5ff55;\r
}\r
#side .head .dot {\r
  width: 7px; height: 7px; border-radius: 50%; background: var(--err);\r
  box-shadow: 0 0 8px var(--err);\r
}\r
#side .head .dot.on { background: var(--ok); box-shadow: 0 0 8px var(--ok); }\r
#newproj {\r
  margin: 0 12px 10px; padding: 8px; border: 1px dashed var(--line);\r
  border-radius: 3px; color: var(--dim); text-align: center; letter-spacing: 1px;\r
}\r
#newproj:hover { border-color: var(--acc); color: var(--acc); box-shadow: 0 0 12px #00e5ff30 inset; }\r
#plist { flex: 1; overflow-y: auto; padding: 0 8px 12px; }\r
.pitem {\r
  padding: 9px 10px; border-radius: 3px; cursor: pointer;\r
  display: flex; align-items: center; gap: 8px;\r
  border-left: 2px solid transparent;\r
}\r
.pitem:hover { background: var(--panel2); border-left-color: #2b3d63; }\r
.pitem.on {\r
  background: linear-gradient(90deg, #00e5ff1f, transparent);\r
  border-left-color: var(--acc); color: #d9f6ff;\r
}\r
.pitem .nm { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\r
.pitem .ct { color: var(--dim); font-size: 11px; font-family: var(--mono); }\r
.pitem .pshare { color: var(--acc); font-size: 13px; line-height: 1; }\r
.pitem .ren, .pitem .del { color: var(--dim); opacity: 0; padding: 0 2px; }\r
.pitem:hover .ren, .pitem:hover .del { opacity: 1; }\r
.pitem .ren:hover { color: var(--acc); text-shadow: 0 0 8px var(--acc); }\r
.pitem .del:hover { color: var(--acc2); text-shadow: 0 0 8px var(--acc2); }\r
\r
/* ---------- 主区 ---------- */\r
#main { flex: 1; position: relative; overflow: hidden; }\r
#topbar {\r
  position: absolute; z-index: 20; top: 0; left: 0; right: 0; height: 46px;\r
  display: flex; align-items: center; gap: 10px; padding: 0 12px;\r
  background: linear-gradient(#05060df2, #05060d00); pointer-events: none;\r
}\r
#topbar > * { pointer-events: auto; }\r
.tbtn {\r
  padding: 6px 11px; border-radius: 3px;\r
  background: #0c121f; border: 1px solid var(--line); color: var(--dim);\r
  letter-spacing: .5px; text-decoration: none;\r
}\r
.tbtn:hover { color: var(--acc); border-color: var(--acc); box-shadow: 0 0 10px #00e5ff25; }\r
#ptitle { font-weight: 600; letter-spacing: 1px; text-shadow: 0 0 10px #00e5ff40; }\r
/* 「试玩画布 · 刷新还原」：示例上的改动不存盘，说清楚但别抢标题的戏 */\r
#ptitle .ro {\r
  margin-left: 8px; padding: 1px 6px; border-radius: 2px; cursor: help;\r
  font-weight: 400; font-size: 11px; letter-spacing: 0; text-shadow: none;\r
  color: var(--warn); border: 1px solid #5c4300; background: #ffb00012;\r
}\r
#hint { color: var(--dim); font-size: 12px; margin-left: auto; font-family: var(--mono); }\r
#presence-users { display: none; align-items: center; gap: 5px; white-space: nowrap; }\r
#presence-users.on { display: flex; }\r
#presence-users .presence-count {\r
  color: var(--dim); font-size: 11px; margin-right: 2px;\r
}\r
#presence-users .presence-avatar {\r
  width: 25px; height: 25px; border-radius: 50%; display: inline-flex;\r
  align-items: center; justify-content: center; color: #07101c; font-size: 11px;\r
  font-weight: 700; border: 2px solid #070a12; box-shadow: 0 0 0 1px currentColor;\r
}\r
\r
/* 右上角「任务(n)」：颜色本身就是状态 —— 青色在跑、橙色在等、灰的没活儿 */\r
#jobsbtn { display: flex; align-items: center; gap: 7px; white-space: nowrap; }\r
#jobsbtn .n { font-family: var(--mono); font-size: 11px; }\r
#jobsbtn .s { font-size: 11px; opacity: .8; }\r
#jobsbtn.run { color: var(--acc); border-color: var(--acc); box-shadow: 0 0 10px #00e5ff30; }\r
#jobsbtn.wait { color: var(--warn); border-color: #5c4300; }\r
#jobsbtn.open { background: #10192b; }\r
\r
#stage {\r
  position: absolute; inset: 0; cursor: grab;\r
  background-image:\r
    linear-gradient(#0d1830 1px, transparent 1px),\r
    linear-gradient(90deg, #0d1830 1px, transparent 1px);\r
  background-size: 40px 40px;\r
}\r
#stage.panning { cursor: grabbing; }\r
\r
/* ---------- 画布工具条 ---------- */\r
#canvas-toolbar {\r
  position: absolute; bottom: 16px; left: 16px; z-index: 20;\r
  display: flex; gap: 8px; pointer-events: auto;\r
}\r
.toolbar-btn {\r
  width: 40px; height: 40px;\r
  background: #0c121fee; border: 1px solid var(--line);\r
  border-radius: 6px; font-size: 18px;\r
  backdrop-filter: blur(8px);\r
  box-shadow: 0 4px 12px #00000050;\r
  transition: all .15s ease;\r
}\r
#zoom-menu {\r
  width: auto;\r
  padding: 0 12px;\r
  font-size: 13px;\r
  font-family: var(--mono);\r
  letter-spacing: 0.5px;\r
}\r
.toolbar-btn:hover {\r
  border-color: var(--acc);\r
  box-shadow: 0 0 14px #00e5ff35, 0 4px 12px #00000050;\r
  transform: translateY(-1px);\r
}\r
.toolbar-btn:active {\r
  transform: translateY(0);\r
}\r
.toolbar-btn.active {\r
  background: #00e5ff1f;\r
  border-color: var(--acc);\r
  box-shadow: 0 0 18px #00e5ff40 inset, 0 4px 12px #00000050;\r
}\r
\r
/* ---------- 小地图 ---------- */\r
#minimap {\r
  position: absolute; bottom: 72px; left: 16px; z-index: 20;\r
  width: 200px; height: 150px;\r
  background: #0c121fee; border: 1px solid var(--line);\r
  border-radius: 6px; backdrop-filter: blur(8px);\r
  box-shadow: 0 4px 12px #00000050;\r
  overflow: hidden;\r
}\r
#minimap-canvas {\r
  width: 100%; height: 100%;\r
  display: block;\r
}\r
#minimap-viewport {\r
  position: absolute; top: 0; left: 0;\r
  border: 1.5px solid var(--acc);\r
  background: #00e5ff15;\r
  box-shadow: 0 0 8px #00e5ff40;\r
  cursor: move;\r
  pointer-events: auto;\r
}\r
\r
#world { position: absolute; top: 0; left: 0; transform-origin: 0 0; }\r
#presence-layer {\r
  position: absolute; left: 0; top: 0; width: 1px; height: 1px;\r
  overflow: visible; transform-origin: 0 0; pointer-events: none; z-index: 12;\r
}\r
.collab-cursor {\r
  position: absolute; left: 0; top: 0; transform-origin: 0 0;\r
  transition: transform 45ms linear, opacity .12s; pointer-events: none;\r
}\r
.collab-cursor.hidden { opacity: 0; }\r
.collab-cursor .pointer {\r
  width: 0; height: 0; border-top: 13px solid currentColor;\r
  border-right: 9px solid transparent; filter: drop-shadow(0 1px 2px #000b);\r
}\r
.collab-cursor .label {\r
  display: inline-block; margin: -2px 0 0 8px; padding: 3px 6px;\r
  border-radius: 3px; color: #07101c; background: currentColor;\r
  font-size: 11px; font-weight: 700; line-height: 1.2; white-space: nowrap;\r
  box-shadow: 0 2px 8px #0009;\r
}\r
.collab-cursor .label > span { color: #07101c; }\r
\r
/* ---------- 分组 / 框选 ---------- */\r
/* 分组框层：跟 world 同一套 transform，垫在卡片底下（DOM 顺序在 world 之前）。\r
   1×1 的尺寸 + overflow:visible，子元素绝对定位到世界坐标即可 */\r
#groups { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: visible; transform-origin: 0 0; }\r
.ggroup {\r
  position: absolute; border: 1.5px dashed #3d5a8a; border-radius: 8px;\r
  background: #3d5a8a2e;              /* 组内铺一层看得见的底色，一眼认出这是一组 */\r
  box-shadow: 0 0 20px #0004;\r
  cursor: move;\r
}\r
.ggroup:hover { border-color: #5d82c0; background: #3d5a8a3d; }\r
.ggroup .gglabel {\r
  position: absolute; left: 8px; top: -2px; transform: translateY(-100%);\r
  padding: 2px 9px; border: 1px solid #1e2a44; border-bottom: none;\r
  border-radius: 5px 5px 0 0; background: #0c121fee;\r
  color: #8fb4d8; font-size: 11px; letter-spacing: 1px; cursor: move; white-space: nowrap;\r
}\r
.ggroup:hover .gglabel { color: #b9d6f2; }\r
/* 框选时那个青色橡皮筋 */\r
#lasso {\r
  position: absolute; z-index: 15; pointer-events: none;\r
  border: 1px dashed var(--acc); background: #00e5ff10;\r
  box-shadow: 0 0 14px #00e5ff20 inset;\r
}\r
/* 框选住卡片后套在外圈的虚线框（世界坐标，长在 #groups 层里） */\r
#groups .selbox {\r
  position: absolute; border: 1.5px dashed var(--acc); border-radius: 8px;\r
  pointer-events: none; box-shadow: 0 0 16px #00e5ff1c;\r
}\r
/* 框选后浮在包围盒上方的小工具条（打组 / 批量重命名） */\r
#selbar {\r
  position: absolute; z-index: 16; display: flex; gap: 4px; padding: 4px;\r
  background: #080c17f5; border: 1px solid var(--acc); border-radius: 4px;\r
  backdrop-filter: blur(8px); box-shadow: 0 8px 26px #000c, 0 0 14px #00e5ff20;\r
}\r
#selbar button {\r
  padding: 4px 12px; border-radius: 3px; font-size: 12px;\r
  color: var(--txt); border: 1px solid var(--line); background: #0c121f;\r
}\r
#selbar button:hover { color: var(--acc); border-color: var(--acc); box-shadow: 0 0 10px #00e5ff25; }\r
\r
/* 底部工具条：新建卡片的唯一入口。框在 stage 里、贴着底边居中，\r
   但直接盖在画布上会挡住拖卡/框选，所以容器不吃事件、只有按钮吃 */\r
#dock {\r
  position: absolute; z-index: 18; left: 50%; bottom: 14px; transform: translateX(-50%);\r
  display: flex; gap: 6px; padding: 6px;\r
  background: #080c17f0; border: 1px solid var(--acc); border-radius: 4px;\r
  backdrop-filter: blur(8px); box-shadow: 0 10px 30px #000c, 0 0 16px #00e5ff24;\r
  pointer-events: none;\r
}\r
#dock .dockb {\r
  pointer-events: auto; display: flex; align-items: center; gap: 7px;\r
  padding: 7px 13px; border-radius: 3px; font-size: 13px;\r
  color: var(--txt); border: 1px solid var(--line); background: #0c121f; letter-spacing: .5px;\r
}\r
#dock .dockb span:first-child { font-size: 14px; }\r
#dock .dockb:hover { color: var(--acc); border-color: var(--acc); box-shadow: 0 0 10px #00e5ff25; }\r
/* 「上传」跟后面四个不是一类事（它导入现成文件，后面四个是建空卡），中间隔一道 */\r
#dock .sep { width: 1px; margin: 2px 3px; background: var(--line); }\r
#wires {\r
  position: absolute; overflow: visible; pointer-events: none;\r
  left: 0; top: 0; width: 1px; height: 1px; transform-origin: 0 0;\r
}\r
#wires path {\r
  fill: none; stroke: var(--acc); stroke-width: 1.6;\r
  filter: drop-shadow(0 0 4px #00e5ffaa);\r
}\r
#wires path.tmp { stroke: var(--acc2); stroke-dasharray: 6 4; filter: drop-shadow(0 0 5px #ff2d95aa); }\r
/* 风格线：传的是文字不是产物，画成紫色虚线，别让人以为风格卡也出图 */\r
#wires path.txt {\r
  stroke: var(--sty); stroke-width: 1.3; stroke-dasharray: 2 5; stroke-linecap: round;\r
  filter: drop-shadow(0 0 4px #b57bffaa);\r
}\r
/* 每根线底下垫一根透明粗线专管接鼠标：真正那根只有 1.3~1.6px，\r
   画布缩到 0.3 倍时根本点不中 */\r
#wires path.hit {\r
  stroke: transparent; stroke-width: 14; filter: none; pointer-events: stroke; cursor: pointer;\r
}\r
/* 选中的线（在 .txt 后面：风格线选中了保留虚线，只把颜色和粗细顶掉） */\r
#wires path.sel { stroke: #fff; stroke-width: 2.6; filter: drop-shadow(0 0 7px #ffffffcc); }\r
/* 这根产物线上还捎着风格（风格继承没有自己的连线，借的就是这根）：\r
   在实线上再叠一层紫虚线 */\r
#wires path.carry {\r
  stroke: var(--sty); stroke-width: 1.2; stroke-dasharray: 2 6; stroke-linecap: round;\r
  filter: drop-shadow(0 0 3px #b57bffaa);\r
}\r
\r
#empty {\r
  position: absolute; inset: 0; display: flex; flex-direction: column;\r
  align-items: center; justify-content: center; gap: 14px; color: var(--dim);\r
}\r
#empty .big {\r
  font-size: 17px; color: #cfe9ff; letter-spacing: 2px;\r
  text-shadow: 0 0 12px #00e5ff66;\r
}\r
#empty .cta { display: flex; gap: 10px; }\r
#empty .cta button {\r
  padding: 10px 18px; border-radius: 3px; background: #0c121f;\r
  border: 1px solid var(--acc); color: #bdf1ff; letter-spacing: 1px;\r
  box-shadow: 0 0 14px #00e5ff25;\r
}\r
#empty .cta button:hover { background: #00e5ff1a; box-shadow: 0 0 22px #00e5ff55; }\r
\r
/* ---------- 卡片 ---------- */\r
/* 卡片不能 overflow:hidden，否则右侧凸出的输出圆点会被裁掉一半 */\r
/* cursor:move 铺满整张卡：卡片哪儿都能拖（app.js 的 NODRAG 列了例外）。\r
   下面几处例外自己会把光标改回去 —— 视频是 pointer（点=放）、对比线是 ew-resize、\r
   拖角是 nwse-resize，它们按住干的是别的事，光标得跟着说清楚 */\r
.card {\r
  position: absolute; width: 268px; background: var(--panel);\r
  border: 1px solid var(--line); border-radius: 3px;\r
  box-shadow: 0 4px 22px #000b, 0 0 0 1px #00e5ff08;\r
  cursor: move;\r
}\r
/* 四角切角括号 */\r
.card::before, .card::after {\r
  content: ""; position: absolute; width: 11px; height: 11px; pointer-events: none;\r
  border-color: #2b3d63; border-style: solid; border-width: 0;\r
}\r
.card::before { left: -1px; top: -1px; border-left-width: 2px; border-top-width: 2px; }\r
.card::after { right: -1px; bottom: -1px; border-right-width: 2px; border-bottom-width: 2px; }\r
.card:hover::before, .card:hover::after { border-color: #3f5a91; }\r
/* 拖角改大小。上面那两个切角括号正好长在这两个角上，直接当「这里能拖」的提示用，\r
   所以手柄自己不画东西，只是压在括号上的一块透明热区（括号是伪元素，接不到鼠标）。\r
   鼠标压上去时把括号加粗一档成青色，确认抓住了 */\r
.card .rz { position: absolute; width: 15px; height: 15px; z-index: 3; cursor: nwse-resize; }\r
.card .rz.tl { left: -3px; top: -3px; }\r
.card .rz.br { right: -3px; bottom: -3px; }\r
.card .rz:hover::after {\r
  content: ""; position: absolute; inset: 2px;\r
  border: 0 solid var(--acc);\r
}\r
.card .rz.tl:hover::after { border-left-width: 3px; border-top-width: 3px; }\r
.card .rz.br:hover::after { border-right-width: 3px; border-bottom-width: 3px; }\r
.card.sel {\r
  border-color: var(--acc);\r
  box-shadow: 0 4px 26px #000b, 0 0 18px #00e5ff45;\r
}\r
.card.sel::before, .card.sel::after { border-color: var(--acc); }\r
.card .ch {\r
  display: flex; align-items: center; gap: 6px; padding: 7px 9px;\r
  font-size: 12px; color: var(--dim); cursor: move;\r
  background: linear-gradient(90deg, #101a2e, #0b0f1c);\r
  border-bottom: 1px solid var(--line); border-radius: 2px 2px 0 0;\r
}\r
.card .ch .t {\r
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;\r
  color: #c9dff2; letter-spacing: .5px;\r
}\r
.card .ch .t.named { color: var(--acc); }      /* 用户自己改过名字 */\r
.card .ch .x:hover { color: var(--acc2); text-shadow: 0 0 8px var(--acc2); }\r
.card .body {\r
  height: 168px; background: #070a12; display: flex; align-items: center;\r
  justify-content: center; position: relative; overflow: hidden;\r
}\r
.card .body img, .card .body video { width: 100%; height: 100%; object-fit: contain; }\r
.card .composite-inputs { padding: 10px; border-top: 1px solid var(--line); background: var(--panel); }\r
.card .composite-input-label { margin-bottom: 7px; color: var(--dim); font-size: 12px; }\r
.card .composite-input-hint { color: var(--dim); font-size: 12px; line-height: 1.5; }\r
.card .composite-input-list { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }\r
.card .composite-input-list button { position: relative; height: 48px; min-width: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 5px; background: var(--panel2); }\r
.card .composite-input-list button:hover { border-color: var(--acc); }\r
.card .composite-input-list img { width: 100%; height: 100%; object-fit: contain; }\r
.card .composite-input-list span { position: absolute; left: 0; bottom: 0; padding: 1px 3px; border-radius: 0 3px 0 0; background: #080d14dc; color: #fff; font-size: 11px; }\r
.card .composite-input-list button:disabled { cursor: wait; opacity: .65; }\r
/* 视频不给 controls：单击放/停，按住是挪卡（整张卡都能拖），双击进大窗口。\r
   光标留 pointer 不改成 move：能拖是整张卡的通性，这儿要说的是"它还认单击" */\r
.card .body video { cursor: pointer; }\r
/* 自己画的进度条：卡片里唯一的进度反馈，也是唯一能定位进度的地方（画面让给拖卡了），\r
   所以鼠标一进卡片就得变粗 —— 4px 高的条子按不准 */\r
.card .body .vprog {\r
  position: absolute; left: 0; right: 0; bottom: 0; height: 4px;\r
  background: #ffffff1f; cursor: ew-resize; transition: height .12s;\r
}\r
.card:hover .body .vprog { height: 10px; }\r
.card .body .vprog i {\r
  display: block; height: 100%; width: 0;\r
  background: var(--acc); box-shadow: 0 0 8px var(--acc);\r
}\r
/* 生成中的画面区：上一轮的图撤掉换成这个转圈。它只表示"在动、没卡死"，\r
   真进度看下面那条 .bar 和状态字（带百分比和当前步骤） */\r
.card .body .load {\r
  width: 34px; height: 34px; border-radius: 50%;\r
  border: 2px solid #1a2338; border-top-color: var(--acc);\r
  box-shadow: 0 0 12px #00e5ff30;\r
  animation: spin .9s linear infinite;\r
}\r
@keyframes spin { to { transform: rotate(360deg); } }\r
/* 「原图 ↔ 结果」对比线（COMPARE 那几张卡）。--x 是分割位置，百分比，由 applyCmp() 写进来。\r
   格子底：卡片画面区本来就近黑，透明的地方不铺格子跟"黑背景"看着一模一样，\r
   用户会以为没抠掉。整块都能按住拖，所以光标常驻 ew-resize */\r
.card .body .cmp {\r
  --x: 0%;\r
  position: absolute; inset: 0; cursor: ew-resize;\r
  background: #0b0f1c;\r
  background-image:\r
    linear-gradient(45deg, #18203a 25%, transparent 25%, transparent 75%, #18203a 75%),\r
    linear-gradient(45deg, #18203a 25%, transparent 25%, transparent 75%, #18203a 75%);\r
  background-size: 16px 16px;\r
  background-position: 0 0, 8px 8px;\r
}\r
.card .body .cmp img { position: absolute; inset: 0; }\r
/* 原图压在结果上面，从左边裁开：--x 之左是原图（带背景），之右是抠完的 */\r
.card .body .cmp .old { clip-path: inset(0 calc(100% - var(--x)) 0 0); }\r
.card .body .cmpx {\r
  position: absolute; top: 0; bottom: 0; left: var(--x); width: 2px; margin-left: -1px;\r
  background: var(--acc); box-shadow: 0 0 8px #00e5ff88; pointer-events: none;\r
}\r
/* 抓手。x=0 时被画面区的 overflow:hidden 切掉一半，剩半个圆正好当"这儿能拖"的提示 */\r
.card .body .cmpx i {\r
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);\r
  width: 20px; height: 20px; border-radius: 50%;\r
  background: #0b0f1cdd; border: 1px solid var(--acc);\r
  color: var(--acc); font-size: 11px; font-style: normal;\r
  display: flex; align-items: center; justify-content: center;\r
}\r
.card .body .cmptip {\r
  position: absolute; left: 0; right: 0; bottom: 0; padding: 3px 0;\r
  background: #050810c9; color: var(--dim); font-size: 10px; text-align: center;\r
  pointer-events: none;\r
}\r
.card .body .cmp.dragged .cmptip { display: none; }   /* 拖过一次就不用再教了 */\r
/* 一次出一组产物（分镜九宫格）：铺成网格，高度改成自动撑开，不然 168px 里挤 9 张全糊了 */\r
.card .body.grid {\r
  height: auto; display: grid; gap: 2px; padding: 2px;\r
  grid-template-columns: repeat(var(--cols, 3), 1fr);\r
}\r
/* 格子不改光标（还是 move）：整张卡都能拖，唯独这九格显示 zoom-in 就等于说"这儿拖不动"。\r
   双击看大图的提示交给悬停高亮那一圈 */\r
.card .body.grid img, .card .body.grid video {\r
  aspect-ratio: 1; height: auto; object-fit: cover;\r
  background: #0b0f1c;\r
}\r
.card .body.grid img:hover, .card .body.grid video:hover { outline: 1px solid var(--acc); }\r
.card .ph { color: #1e2a44; font-size: 30px; }\r
.card .cf {\r
  padding: 6px 9px; font-size: 11px; color: var(--dim); font-family: var(--mono);\r
  display: flex; align-items: center; gap: 6px; border-top: 1px solid var(--line);\r
  border-radius: 0 0 2px 2px; background: var(--panel);\r
}\r
/* 出图还是出视频。常驻卡脚最左边：卡名和卡片图标都可能看不出类型（工具卡一律 🧩），\r
   而产物出来之前画面区是空的。图片=青、视频=洋红，跟界面里其他地方同一套配色 */\r
.card .cf .kt {\r
  flex: none; padding: 1px 5px; border-radius: 2px;\r
  border: 1px solid currentColor; color: var(--acc); background: #00e5ff14;\r
}\r
.card .cf .kt[data-kind="video"] { color: var(--acc2); background: #ff2d9514; }\r
.card .cf .kt[data-kind="both"] { color: var(--dim); background: transparent; }\r
.card .cf .kt[data-kind="style"] { color: var(--sty); background: #b57bff14; }\r
/* 文本卡同一套紫：它传的也是文字，跟风格卡是一家人 */\r
.card .cf .kt[data-kind="text"] { color: var(--sty); background: #b57bff14; }\r
/* 风格卡的画面区装的是文字：不裁、能滚，字小一点 —— 它是"这张卡在管什么风格"的\r
   一眼预览，不是要在这儿读完整段 */\r
.card .body.sbody {\r
  display: block; padding: 8px 9px; overflow: auto; text-align: left;\r
  background: #0a0814; box-shadow: inset 2px 0 0 var(--sty);\r
}\r
.card .body.sbody .stx {\r
  font-size: 11px; line-height: 1.6; color: #cbb6ff; white-space: pre-wrap; word-break: break-word;\r
}\r
.card .body.sbody .sempty {\r
  margin-top: 6px; font-size: 11px; line-height: 1.6; color: var(--dim); opacity: .8;\r
}\r
.card .body.sbody .ph { display: block; font-size: 22px; color: #33265a; }\r
/* 状态字里带了「正在跑哪一步」，长度不定：挤不下就省略号，别把右边的文件名顶出卡外 */\r
.card .cf .st { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\r
.card .cf .meta { flex: none; max-width: 50%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\r
.card .cf .st.run { color: var(--acc); text-shadow: 0 0 8px #00e5ff88; }\r
.card .cf .st.done { color: var(--ok); }\r
.card .cf .st.err { color: var(--err); }\r
.bar { height: 2px; background: #101827; }\r
.bar i {\r
  display: block; height: 100%; width: 0; transition: width .3s;\r
  background: linear-gradient(90deg, var(--acc2), var(--acc));\r
  box-shadow: 0 0 8px var(--acc);\r
}\r
.port, .inport {\r
  position: absolute; top: 50%; width: 16px; height: 16px;\r
  margin-top: -8px; border-radius: 50%; background: #0b0f1c;\r
  border: 2px solid var(--acc2); cursor: crosshair; z-index: 5;\r
  box-shadow: 0 0 8px #ff2d9566; transition: transform .12s, box-shadow .12s;\r
}\r
.port { right: -8px; }\r
/* 左边那颗绿点是入口，和右边品红的出口分色：一眼看出线该从哪拉到哪 */\r
.inport {\r
  left: -8px; border-color: var(--ok); cursor: default;\r
  box-shadow: 0 0 8px #4dff9f66;\r
}\r
/* 透明外扩：实际可点范围 40×40，不用瞄准那颗小圆点 */\r
.port::before { content: ""; position: absolute; inset: -12px; border-radius: 50%; }\r
.port:hover {\r
  background: var(--acc2); transform: scale(1.3);\r
  box-shadow: 0 0 16px var(--acc2);\r
}\r
/* 正在拉线时所有能接的入口都亮起来，省得一张张试哪张收得下 */\r
.wiring .inport { background: var(--ok); transform: scale(1.3); box-shadow: 0 0 16px var(--ok); }\r
/* ---------- 右侧历史产物栏 ---------- */\r
/* 和左侧项目栏一样是 :scope 的 flex 子项：它一出来画布是被挤窄，而不是被盖住，\r
   否则卡片刚好在右边缘时会被这块面板压在下面点不到 */\r
#hist {\r
  --hist-width: 316px;\r
  position: relative; width: var(--hist-width); flex: 0 0 var(--hist-width); min-width: 240px;\r
  background: var(--panel); border-left: 1px solid var(--line);\r
  display: flex; flex-direction: column; overflow: hidden;\r
  box-shadow: -1px 0 12px #00e5ff10;\r
}\r
#hist .hresize {\r
  position: absolute; z-index: 2; inset: 0 auto 0 -6px; width: 12px; padding: 0;\r
  cursor: ew-resize; touch-action: none;\r
}\r
#hist .hresize::after {\r
  content: ""; position: absolute; left: 5px; top: 0; bottom: 0; width: 1px;\r
  background: transparent; transition: background .15s, box-shadow .15s;\r
}\r
#hist .hresize:hover::after, #hist .hresize:focus-visible::after, #hist.resizing .hresize::after {\r
  background: var(--acc); box-shadow: 0 0 8px var(--acc);\r
}\r
#hist.resizing, #hist.resizing * { cursor: ew-resize !important; user-select: none !important; }\r
#hist .hhd {\r
  display: flex; align-items: center; gap: 8px; padding: 12px 12px 10px;\r
  border-bottom: 1px solid var(--line);\r
}\r
#hist .hhd b {\r
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;\r
  font-size: 13px; color: #eaf6ff; letter-spacing: 1px; text-shadow: 0 0 8px #00e5ff55;\r
}\r
#hist .hhd .n { color: var(--dim); font-size: 11px; font-family: var(--mono); }\r
#hist .hhd .x { color: var(--dim); padding: 0 2px; }\r
#hist .hhd .x:hover { color: var(--acc2); text-shadow: 0 0 8px var(--acc2); }\r
#hist .hlist { flex: 1; min-width: 0; overflow-y: auto; padding: 10px; }\r
#hist .hempty { padding: 20px 4px; color: var(--dim); font-size: 12px; text-align: center; line-height: 1.8; }\r
.hrun {\r
  width: 100%; min-width: 0; height: auto; margin-bottom: 10px;\r
  border: 1px solid var(--line); border-radius: 3px; background: var(--panel2);\r
}\r
.hrun.cur { border-color: var(--acc); box-shadow: 0 0 12px #00e5ff22; }\r
.hrun .rh {\r
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 6px 8px;\r
  font-size: 11px; color: var(--dim); font-family: var(--mono);\r
  border-bottom: 1px solid var(--line);\r
}\r
.hrun .rh .tag { flex: none; color: var(--acc); letter-spacing: 1px; }\r
.hrun .rh .cnt { flex: none; margin-left: auto; white-space: nowrap; }\r
.hrun .rh .nm { flex: 1 1 80px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\r
/* 缩略图网格：产物只在这里成组显示，seed 单独一行，绝不压在画面上 */\r
.hrun .rg {\r
  display: grid; width: 100%; min-width: 0; gap: 2px; padding: 2px;\r
  grid-template-columns: repeat(var(--hcols, 3), minmax(0, 1fr));\r
}\r
.hrun .rg img, .hrun .rg video {\r
  width: 100%; aspect-ratio: 1; object-fit: cover; background: #070a12;\r
  cursor: zoom-in; -webkit-user-drag: element; user-select: none;\r
}\r
/* 只出一张时铺满整行，就别再裁成方块了 */\r
.hrun .rg.one img, .hrun .rg.one video { aspect-ratio: 16 / 10; object-fit: contain; }\r
.hrun .rg img:hover, .hrun .rg video:hover { outline: 1px solid var(--acc); }\r
.hrun .rg .rg-a {\r
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;\r
  background: #070a12; font-size: 20px; color: var(--dim); cursor: zoom-in;\r
}\r
.hrun .rg .rg-a:hover { outline: 1px solid var(--acc); color: var(--acc); }\r
/* seed 专区：独占一行、等宽字体。不给拖选，旁边有复制按钮 */\r
.hrun .rs {\r
  display: flex; align-items: center; gap: 6px; padding: 6px 8px;\r
  font-size: 11px; font-family: var(--mono); border-top: 1px solid var(--line);\r
}\r
.hrun .rs i { font-style: normal; color: var(--dim); }\r
.hrun .rs span { flex: 1; color: var(--acc); word-break: break-all; }\r
.hrun .rs button { color: var(--dim); padding: 0 3px; }\r
.hrun .rs button:hover { color: var(--acc); }\r
/* 套了风格卡的那几轮：当时真提交的整段提示词。默认折起来 —— 它可能很长，\r
   但没有它这一轮就复现不出来（卡上那个框里的字不是跑出这一轮的那段话） */\r
.hrun .rp { border-top: 1px solid var(--line); font-size: 11px; }\r
.hrun .rp summary { padding: 5px 8px; color: var(--sty); cursor: pointer; }\r
.hrun .rp summary:hover { color: #d7c1ff; }\r
.hrun .history-prompt { position: relative; }\r
.hrun .history-prompt summary { padding-right: 64px; min-height: 30px; }\r
.hrun .history-prompt-copy { position: absolute; top: 4px; right: 8px; padding: 2px 8px; font-size: 12px; }\r
.hrun .rp > div {\r
  padding: 0 8px 7px; max-height: 150px; overflow: auto; line-height: 1.6;\r
  color: var(--dim); white-space: pre-wrap; word-break: break-word;\r
}\r
\r
/* ---------- 参数面板 ---------- */\r
#panel {\r
  position: absolute; z-index: 30; width: 780px; background: #080c17f2;\r
  border: 1px solid var(--acc); border-radius: 3px; padding: 12px;\r
  backdrop-filter: blur(8px);\r
  box-shadow: 0 14px 44px #000d, 0 0 22px #00e5ff2e;\r
  /* 竖向三段：模式钉在顶部、参数区滚动、运行按钮钉在底部。\r
     max-height 由 placePanel() 按窗口高度写进 style，这里只负责分段 */\r
  display: flex; flex-direction: column; overflow: hidden;\r
}\r
/* min-height:0 必须有：flex 子项默认 min-height:auto，会被内容撑开而不产生滚动条 */\r
#panel .pbody { flex: 1; min-height: 0; overflow-y: auto; padding-right: 2px; }\r
#panel .modes { display: flex; gap: 4px; margin-bottom: 10px; flex-wrap: wrap; }\r
#panel .modes button {\r
  padding: 4px 9px; border-radius: 2px; font-size: 13px;\r
  color: var(--dim); border: 1px solid var(--line);\r
}\r
#panel .modes button:hover { color: var(--acc); border-color: var(--acc); }\r
#panel .modes button.on {\r
  background: #00e5ff1c; color: #bdf1ff; border-color: var(--acc);\r
  box-shadow: 0 0 10px #00e5ff33;\r
}\r
#panel textarea { width: 100%; min-height: 62px; }\r
#panel .pblock { margin-bottom: 8px; }\r
#panel .pblock textarea { min-height: 88px; }\r
#panel .pblock textarea.isdemo { border-color: var(--warn); color: #ffd88a; }\r
\r
/* @ 提及功能：textarea 文字全透明，可见文字由高亮层显示（@ 标签上色、其他文字白色）。\r
   高亮层不接鼠标事件，所有交互在 textarea 上做 */\r
#panel .prompt-highlight-wrapper { position: relative; }\r
#panel .prompt-highlight-wrapper textarea {\r
  position: relative; z-index: 1;\r
  color: transparent; caret-color: var(--acc);\r
}\r
#panel .prompt-highlight-wrapper textarea::selection {\r
  background: #00e5ff33;\r
}\r
#panel .prompt-highlight-layer {\r
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;\r
  z-index: 2; pointer-events: none;\r
  overflow: hidden; overflow-wrap: break-word;\r
  color: var(--txt); background: none;\r
  border: 0 solid transparent;\r
}\r
#panel .prompt-highlight-layer .at-mention {\r
  /* padding/border 会改变文字布局，导致光标和内容错位\r
     改用 box-shadow/outline 画视觉效果，不占布局空间 */\r
  background: #00e5ff18; color: #bdf1ff;\r
  padding: 0; margin: 0; border: 0;\r
  border-radius: 2px;\r
  outline: 1px solid #00e5ff55; outline-offset: -1px;\r
  box-shadow: 0 0 0 2px #00e5ff08;\r
  font-weight: 500;\r
  box-decoration-break: clone;\r
}\r
#panel .prompt-highlight-layer .at-mention.mhover {\r
  background: #00e5ff28; outline-color: #00e5ff88;\r
  box-shadow: 0 0 0 2px #00e5ff15;\r
}\r
\r
#panel .phd {\r
  display: flex; align-items: center; gap: 8px; margin-bottom: 4px;\r
  font-size: 12px; color: var(--dim); letter-spacing: .5px;\r
}\r
#panel .phd > span:first-child {\r
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;\r
  flex-shrink: 1; min-width: 0;\r
}\r
#panel .phd .demo {\r
  flex: 1; color: var(--warn); overflow: hidden;\r
  text-overflow: ellipsis; white-space: nowrap;\r
}\r
#panel .phd button {\r
  margin-left: auto; padding: 1px 7px; border-radius: 2px;\r
  color: var(--dim); border: 1px solid var(--line);\r
}\r
#panel .phd button:hover { color: var(--acc); border-color: var(--acc); }\r
#panel .prow { display: flex; gap: 6px; flex-wrap: wrap; }\r
#panel .prow button {\r
  padding: 3px 9px; border-radius: 2px; font-size: 13px; color: var(--dim);\r
  border: 1px solid var(--line);\r
}\r
#panel .prow button:hover { color: var(--acc); border-color: var(--acc); }\r
/* 提示词 tab 条：一张图一条提示词，tab 跟着图亮 */\r
#panel .ptabs { margin-bottom: 8px; }\r
#panel .tabs { display: flex; gap: 2px; flex-wrap: wrap; border-bottom: 1px solid var(--line); }\r
#panel .tabs button {\r
  padding: 5px 11px; font-size: 13px; color: var(--dim); font-family: var(--mono);\r
  border: 1px solid var(--line); border-bottom: none; border-radius: 2px 2px 0 0;\r
  margin-bottom: -1px; background: #0a0f1c;\r
}\r
#panel .tabs button:hover { color: var(--acc); }\r
#panel .tabs button.on {\r
  color: #bdf1ff; background: #00e5ff1c; border-color: var(--acc);\r
  border-bottom: 1px solid #080c17; box-shadow: 0 -2px 10px #00e5ff25;\r
}\r
/* 对应的图还没上传：这条提示词根本不会被跑，别让人白写 */\r
#panel .tabs button.off {\r
  color: #33405a; border-style: dashed; cursor: not-allowed; background: none;\r
}\r
#panel .ptabs .pblock { margin: 8px 0 0; }\r
\r
/* ✨优化：本地大模型把大白话改成这个模型认的提示词。优化完这一格有两份词，\r
   页签选哪份就提交哪份 —— 优化后那份自带风格，提交时不再另拼风格卡 */\r
#panel .phd button.rwbtn { color: var(--acc); border-color: #16515c; }\r
#panel .phd button.rwbtn:hover { box-shadow: 0 0 10px #00e5ff30; }\r
#panel .phd button.rwbtn:disabled {\r
  color: var(--warn); border-color: #5c4300; cursor: wait; box-shadow: none;\r
}\r
\r
#panel .opttabs {\r
  display: flex; align-items: flex-end; gap: 2px; margin-bottom: 4px;\r
  border-bottom: 1px solid var(--line);\r
}\r
\r
#panel .opttabs button {\r
  padding: 4px 12px; font-size: 13px; color: var(--dim); font-family: var(--mono);\r
  border: 1px solid var(--line); border-bottom: none; border-radius: 2px 2px 0 0;\r
  margin-bottom: -1px; background: #0a0f1c;\r
}\r
\r
#panel .opttabs button:hover { color: var(--acc); }\r
\r
#panel .opttabs button.on {\r
  color: #bdf1ff; background: #00e5ff1c; border-color: var(--acc);\r
  border-bottom: 1px solid #080c17; box-shadow: 0 -2px 10px #00e5ff25;\r
}\r
\r
/* 「已含风格，提交时不再另拼风格卡」这句提示：优化后那份跟原词的提交规则不一样，\r
   不写出来用户只会以为风格丢了 */\r
#panel .opttabs .note {\r
  margin-left: auto; padding-bottom: 4px; font-size: 12px; color: var(--dim);\r
  letter-spacing: .3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;\r
}\r
\r
/* 风格卡在优化之后被换/摘/新挂了：优化结果里的风格已经不是现在这张了 */\r
#panel .opttabs .note.bad { color: var(--warn); }\r
\r
/* 优化后那份是给模型看的格式化长文（H3 六段式四五百词），框子给高一点 */\r
#panel .pblock textarea.optta {\r
  min-height: 200px; font-size: 13px; line-height: 1.65; color: #cdeef5;\r
  border-color: #16515c;\r
}\r
\r
/* 原词需要镜像层显示 @标签；优化结果不支持 @引用，直接显示原生 textarea。\r
   长英文在 textarea 与镜像层中的换行宽度可能相差一个像素，同时显示会造成文字交叠。 */\r
#panel .pblock .prompt-highlight-wrapper textarea.isdemo { color: transparent; }\r
#panel .pblock .prompt-highlight-wrapper textarea.optta { color: #cdeef5; }\r
#panel .prompt-highlight-layer.demo { color: #ffd88a; }\r
#panel .prompt-highlight-layer.opt { display: none; }\r
\r
#panel .rwerr {\r
  margin-top: 6px; padding: 5px 8px; font-size: 12px; line-height: 1.6;\r
  color: var(--err); border: 1px dashed #5c1526; border-radius: 2px;\r
  background: #ff3b5c10;\r
}\r
\r
/* 提示词底部工具条：模型选择 + 翻译 + 优化 */\r
#panel .ptoolbar {\r
  display: flex; gap: 6px; align-items: center; margin-top: 10px;\r
}\r
#panel .ptoolbar .tbtool {\r
  padding: 4px 10px; font-size: 13px; border-radius: 2px;\r
  border: 1px solid var(--line); color: var(--dim);\r
  background: #0a0f1c;\r
}\r
#panel .ptoolbar .tbtool:hover {\r
  color: var(--acc); border-color: var(--acc);\r
}\r
#panel .ptoolbar .tbtool.model {\r
  /* 模型选择按钮：最左侧，带下拉箭头 */\r
  display: flex; align-items: center; gap: 4px;\r
}\r
#panel .ptoolbar .tbtool.model i {\r
  font-style: normal; opacity: 0.6; font-size: 11px;\r
}\r
#panel .ptoolbar .tbtool.opt {\r
  /* 优化按钮：最右侧，青色高亮 */\r
  margin-left: auto; color: var(--acc); border-color: #16515c;\r
}\r
#panel .ptoolbar .tbtool.opt:hover {\r
  box-shadow: 0 0 10px #00e5ff30;\r
}\r
#panel .ptoolbar .tbtool:disabled {\r
  color: var(--warn); border-color: #5c4300; cursor: wait; opacity: 0.6;\r
}\r
\r
#panel .tabempty { padding: 12px 4px; color: var(--dim); font-size: 13px; }\r
\r
/* ---------- 风格卡 ---------- */\r
/* 挂了风格卡时，上面那个框里的字不是真提交的那段。这块是只读的"实际提交"读数，\r
   跟分辨率/帧数那两条换算读数是同一个路子：面板上显示什么就提交什么 */\r
#panel .stypv {\r
  margin-top: 6px; border: 1px dashed #3a2a63; border-left: 2px solid var(--sty);\r
  border-radius: 2px; background: #0c0918;\r
}\r
#panel .stypv .hd {\r
  padding: 4px 8px; font-size: 12px; letter-spacing: .5px; color: var(--sty);\r
  border-bottom: 1px dashed #2a1f45;\r
}\r
#panel .stypv .tx {\r
  padding: 7px 8px; max-height: 190px; overflow: auto; font-size: 13px; line-height: 1.7;\r
  color: #cbb6ff; white-space: pre-wrap; word-break: break-word;\r
}\r
/* 风格卡面板底部：这段风格现在挂给了哪几张卡 */\r
#panel .slinks {\r
  margin: 10px 0 0; padding: 8px 9px 9px; border: 1px solid var(--line);\r
  border-radius: 2px; background: #0a0f1c;\r
}\r
#panel .slinks .atitle { font-size: 13px; color: var(--dim); letter-spacing: .5px; }\r
#panel .slinks .anote { margin-top: 6px; font-size: 12px; line-height: 1.6; color: var(--dim); opacity: .72; }\r
#panel .slink {\r
  display: flex; align-items: center; gap: 8px; margin-top: 6px;\r
  padding: 4px 6px; border: 1px solid #2a1f45; border-radius: 2px; background: #0c0918;\r
}\r
#panel .slink .nm { flex: 1; text-align: left; color: #cbb6ff; font-size: 13px; }\r
#panel .slink .nm:hover { color: var(--sty); text-decoration: underline; }\r
#panel .slink .off { flex: none; padding: 1px 7px; border-radius: 2px; font-size: 12px; color: var(--dim); border: 1px solid var(--line); }\r
#panel .slink .off:hover { color: var(--err); border-color: var(--err); }\r
/* 顺着产物连线继承的那几张：虚框，「继承」也不是按钮 ——\r
   要断得去断那根产物连线，画成能点的会让人点了没反应 */\r
#panel .slink.down { border-style: dashed; border-color: #241b3a; background: #0a0813; }\r
#panel .slink.down .off.ro { border-style: dashed; cursor: default; }\r
#panel .slink.down .off.ro:hover { color: var(--dim); border-color: var(--line); }\r
#panel .slink + .atitle { display: block; margin-top: 11px; }\r
\r
/* ---------- 文本卡 ---------- */\r
/* 卡片上的正文输入框：铺满画面区、透明，看起来就是「字长在卡片上」。\r
   全局 input/textarea 的底色边框在这里全部退掉 */\r
.card .body.sbody textarea.ttxt {\r
  width: 100%; height: 100%; min-height: 0; resize: none;\r
  background: transparent; border: none; box-shadow: none;\r
  padding: 8px 9px; outline: none;\r
  font-size: 11px; line-height: 1.6; color: #cbb6ff; caret-color: var(--sty);\r
}\r
.card .body.sbody textarea.ttxt::placeholder { color: #4a3a72; }\r
.card .body.sbody textarea.ttxt:focus { box-shadow: inset 0 0 0 1px #b57bff55; }\r
/* 处理中那枚转圈盖在输入框上（输入框此时禁用） */\r
.card .body .load.cover {\r
  position: absolute; left: 50%; top: 50%; margin: -17px 0 0 -17px;\r
  background: #0a0814; z-index: 2;\r
}\r
/* 面板底部工具条的胶囊（模型 / 加工方式）：照参考图那种\r
   「图标+名字+▾」的下拉胶囊，紫系 —— 点开是菜单，不用把选项摊在面板里 */\r
#panel .foot .tcap {\r
  flex: none; display: flex; align-items: center; gap: 5px;\r
  padding: 5px 11px; border-radius: 14px;\r
  color: #cbb6ff; border: 1px solid #2a1f45; background: #b57bff10;\r
}\r
#panel .foot .tcap i { font-style: normal; font-size: 11px; opacity: .65; }\r
#panel .foot .tcap:hover {\r
  border-color: var(--sty); box-shadow: 0 0 8px #b57bff40; color: #d7c1ff;\r
}\r
/* 「⚙ 参数」展开时的状态：胶囊常亮，一眼看出旋钮区开着 */\r
#panel .foot .tcap.on {\r
  color: #bdf1ff; border-color: #16515c; background: #00e5ff14;\r
}\r
\r
/* ---------- ⚙ 参数弹窗（清晰度 + 比例选择器，照参考图） ---------- */\r
#respop {\r
  position: fixed; z-index: 50; width: 380px; padding: 12px 14px 14px;\r
  max-height: calc(100vh - 80px); overflow-y: auto;\r
  background: #080c17f7; border: 1px solid var(--acc); border-radius: 4px;\r
  backdrop-filter: blur(10px);\r
  box-shadow: 0 14px 44px #000d, 0 0 22px #00e5ff2e;\r
}\r
#respop .x {\r
  position: absolute; top: 7px; right: 9px; color: var(--dim); padding: 1px 4px;\r
}\r
#respop .x:hover { color: var(--acc2); }\r
.cpick .ctitle {\r
  margin: 10px 0 6px; font-size: 12px; color: var(--dim); letter-spacing: 1px;\r
}\r
.cpick .ctitle:first-child { margin-top: 0; }\r
.image-size-hint { margin-top: 8px; color: var(--dim); font-size: 11px; line-height: 1.6; }\r
.image-advanced { margin-top: 12px; border-top: 1px solid var(--line); padding-top: 9px; }\r
.image-advanced summary { cursor: pointer; color: var(--dim); font-size: 12px; margin-bottom: 8px; }\r
#respop .image-size-controls .cgrid.k { grid-template-columns: repeat(5, 1fr); }\r
#respop .image-size-controls .cgrid.k button { justify-content: center; }\r
#respop .pwrap .row, #respop .image-advanced .row { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 12px; flex-wrap: wrap; }\r
#respop .pwrap .row > label { flex: 0 0 82px; color: var(--dim); }\r
#respop .image-advanced .row > label { flex: 0 0 92px; color: var(--dim); }\r
#respop .pwrap input[type=range], #respop .image-advanced input[type=range] { flex: 1; min-width: 0; accent-color: #d4d4d8; }\r
#respop .paramwarn { flex: 0 0 100%; padding-left: 90px; color: var(--warn); font-size: 11px; line-height: 1.5; }\r
#respop .knobnote { flex: 0 0 100%; color: var(--dim); font-size: 12px; line-height: 1.5; }\r
.cgrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }\r
.cgrid.k { grid-template-columns: repeat(4, 1fr); }\r
/* 比例格：上面一块小示意图（按真实纵横比画），下面文字。选中=青框亮 */\r
.cgrid button {\r
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;\r
  gap: 5px; padding: 7px 4px 5px; border-radius: 3px;\r
  background: #0a0f1c; border: 1px solid var(--line); color: var(--dim);\r
  font-size: 12px; font-family: var(--mono);\r
}\r
.cgrid button i {\r
  display: block; width: min(26px, calc(22px * var(--ratio))); height: auto; flex: none;\r
  aspect-ratio: var(--ratio);\r
  border: 1.5px solid #3d5a8a; border-radius: 2px; background: #10192b;\r
  /* 在 26×22px 区域内等比缩放，不能只截断竖版高度而保留固定宽度。 */\r
}\r
.cgrid button:hover { color: var(--acc); border-color: #2b6d8a; }\r
.cgrid button.on {\r
  color: #bdf1ff; border-color: var(--acc); background: #00e5ff14;\r
  box-shadow: 0 0 10px #00e5ff25;\r
}\r
.cgrid button.on i { border-color: var(--acc); }\r
/* 折算档（工作流没有精确这个比例，选了会落到最近的档） */\r
.cgrid button.near { border-style: dashed; }\r
/* 清晰度档没有示意图，就是一颗胶囊 */\r
.cgrid.k button { flex-direction: row; padding: 6px 4px; }\r
/* 处理卡输入列表里每段输入：序号圈 + 来源卡名 + 预览 + 断开 */\r
#panel .slink .no {\r
  flex: none; width: 18px; height: 18px; border-radius: 50%;\r
  border: 1px solid #2a1f45; color: var(--sty); font-size: 11px;\r
  display: flex; align-items: center; justify-content: center;\r
  font-family: var(--mono); margin-top: 1px;\r
}\r
#panel .slink .pv {\r
  flex: 0 1 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;\r
  font-size: 12px; color: var(--dim);\r
}\r
#panel .slink:has(.pv) .nm { flex: 0 1 auto; max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\r
\r
/* 作者预设的规范：折叠态只占一行，别让它长得像"又一条提示词" */\r
#panel .tpl { margin: 8px 0; border: 1px dashed var(--line); border-radius: 2px; }\r
#panel .tplhd {\r
  width: 100%; text-align: left; padding: 7px 9px; font-size: 13px; color: var(--dim);\r
  letter-spacing: .5px;\r
}\r
#panel .tplhd:hover { color: var(--acc); }\r
#panel .tplhd.dirty { color: var(--warn); }\r
#panel .tpl .tplnote {\r
  margin: 0 9px 6px; font-size: 12px; line-height: 1.6; color: var(--warn);\r
  border-left: 2px solid var(--warn); padding-left: 7px;\r
}\r
#panel .tpl textarea {\r
  width: calc(100% - 18px); margin: 0 9px; min-height: 132px;\r
  font-family: var(--mono); font-size: 12px; color: #9fb4cc;\r
}\r
#panel .tplrst {\r
  margin: 6px 9px 9px; padding: 3px 9px; border-radius: 2px; font-size: 12px;\r
  color: var(--dim); border: 1px solid var(--line);\r
}\r
#panel .tplrst:hover { color: var(--acc); border-color: var(--acc); }\r
\r
#panel .slots { display: flex; gap: 8px; margin: 10px 0; flex-wrap: wrap; }\r
#panel .slots .refhead {\r
  flex: 0 0 100%; color: var(--dim); font-size: 11px; letter-spacing: .4px;\r
}\r
#panel .slots .refadds { flex: 0 0 100%; display: flex; flex-wrap: wrap; gap: 5px; }\r
#panel .slots .refadd {\r
  padding: 4px 8px; border: 1px dashed var(--line); border-radius: 2px;\r
  color: var(--dim); background: #090e19; font-size: 12px;\r
}\r
#panel .slots .refadd:hover { color: var(--acc); border-color: var(--acc); }\r
.slot { width: 66px; text-align: center; color: var(--dim); font-size: 12px; cursor: pointer; }\r
.slot .box {\r
  width: 66px; height: 52px; border-radius: 2px; background: #0a0f1c;\r
  border: 1px solid var(--line); display: flex; align-items: center;\r
  justify-content: center; overflow: hidden; margin-bottom: 3px; font-size: 18px;\r
}\r
.slot.filled .box { border-color: var(--acc); box-shadow: 0 0 10px #00e5ff2e; }\r
.slot.req .box { border-color: var(--warn); }\r
.slot.sortable { cursor: grab; }\r
.slot.sortable:active { cursor: grabbing; }\r
.slot.dragging { opacity: .35; }\r
.slot.drop-target .box { border-color: var(--acc2); box-shadow: 0 0 14px #ff2d9570; }\r
.slot img, .slot video { width: 100%; height: 100%; object-fit: cover; }\r
.slot:hover .box { border-color: var(--acc2); box-shadow: 0 0 10px #ff2d9540; }\r
#panel .slots .lbl { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\r
/* 音频选区。整块比一般参数行显眼一点（有边框、自己一坨）：它是「要裁哪一段」这件事的\r
   唯一入口，混在旋钮堆里会被当成又一个可以不管的高级参数 */\r
#panel .arange {\r
  margin: 10px 0; padding: 8px 9px 9px; border: 1px solid var(--line);\r
  border-radius: 2px; background: #0a0f1c;\r
}\r
#panel .arange audio { display: none; }        /* 只借它出声，控件是下面这条自己画的 */\r
#panel .arange .atitle { font-size: 13px; color: var(--dim); letter-spacing: .5px; }\r
#panel .arange .atrack {\r
  position: relative; height: 30px; margin: 7px 0 6px; cursor: pointer;\r
  background: #060a13; border: 1px solid var(--line); border-radius: 2px;\r
  /* 竖条纹只为让「拖了多远」看得出来，没有波形数据也有个刻度感 */\r
  background-image: repeating-linear-gradient(90deg, #111c2e 0 1px, transparent 1px 6px);\r
}\r
#panel .arange .asel {\r
  position: absolute; top: 0; bottom: 0; background: #00e5ff1f;\r
  border-left: 1px solid var(--acc); border-right: 1px solid var(--acc);\r
}\r
/* 播放位置。1px 亮线，跟选区两边的边框区分得开 */\r
#panel .arange .ahead {\r
  position: absolute; top: -2px; bottom: -2px; width: 1px;\r
  background: var(--acc2); box-shadow: 0 0 6px var(--acc2); pointer-events: none;\r
}\r
/* 手柄做成骑在边界上的一小竖条，比 1px 边框好抓 */\r
#panel .arange .ahd {\r
  position: absolute; top: -3px; bottom: -3px; width: 9px; margin-left: -4.5px;\r
  border-radius: 2px; background: var(--acc); cursor: ew-resize; z-index: 2;\r
}\r
#panel .arange .ahd:hover { box-shadow: 0 0 9px var(--acc); }\r
#panel .arange .aout { font-family: var(--mono); font-size: 13px; color: var(--acc); }\r
#panel .arange .abtn { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 7px; }\r
#panel .arange .abtn button {\r
  padding: 3px 8px; border-radius: 2px; font-size: 12px; color: var(--dim);\r
  background: #0c121f; border: 1px solid var(--line);\r
}\r
#panel .arange .abtn button:hover { color: var(--acc); border-color: var(--acc); box-shadow: 0 0 8px #00e5ff25; }\r
#panel .arange .anote { font-size: 12px; line-height: 1.6; color: var(--dim); opacity: .72; margin-top: 6px; }\r
#panel .row { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 13px; flex-wrap: wrap; }\r
/* 分辨率行的第二行：换算读数 + 480/544/640/768p 快捷键 */\r
#panel .resline {\r
  flex: 0 0 100%; display: flex; align-items: center; gap: 8px; padding-left: 86px;\r
}\r
#panel .resout { font-family: var(--mono); font-size: 12px; color: var(--acc); }\r
#panel .presets { display: flex; gap: 4px; margin-left: auto; }\r
#panel .presets button {\r
  padding: 1px 6px; border-radius: 2px; font-size: 12px; font-family: var(--mono);\r
  color: var(--dim); border: 1px solid var(--line);\r
}\r
#panel .presets button:hover { color: var(--acc); border-color: var(--acc); box-shadow: 0 0 8px #00e5ff25; }\r
#panel .presets button:disabled {\r
  color: #33405a; border-color: #16202f; cursor: not-allowed; box-shadow: none;\r
}\r
#panel .row label { color: var(--dim); min-width: 78px; letter-spacing: .5px; }\r
#panel .row input[type=range] { flex: 1; accent-color: var(--acc); }\r
#panel .row input[type=number], #panel .row input[type=text] { width: 92px; }\r
#panel .adv { color: var(--dim); font-size: 13px; margin-top: 8px; }\r
#panel .adv .items { margin-top: 4px; padding-left: 6px; border-left: 2px solid var(--line); }\r
/* 旋钮下面那行小字。不限定在 .adv 里：常规旋钮也有说不清的（"每格分辨率"） */\r
#panel .knobnote { font-size: 12px; line-height: 1.5; color: var(--dim); opacity: .72;\r
  margin: -2px 0 8px 0; padding-left: 86px; }   /* 跟 .resline 一样缩进，对齐控件列 */\r
#panel .pbody > .knobnote { padding-left: 0; }\r
#panel .dice { padding: 4px 8px; border-radius: 2px; background: #0c121f; border: 1px solid var(--line); }\r
#panel .dice:hover { color: var(--acc); border-color: var(--acc); }\r
#panel .foot { display: flex; align-items: center; gap: 8px; margin-top: 12px; }\r
#panel .foot .cancel {\r
  padding: 6px 11px; border-radius: 2px; background: #0c121f;\r
  border: 1px solid var(--line); color: var(--dim);\r
}\r
#panel .foot .cancel:hover { color: var(--acc2); border-color: var(--acc2); }\r
#panel .foot .go {\r
  margin-left: auto; width: 36px; height: 36px; border-radius: 50%;\r
  background: var(--acc); color: #04121a; font-size: 17px; font-weight: 700;\r
  box-shadow: 0 0 18px #00e5ff88;\r
}\r
#panel .foot .go:hover { box-shadow: 0 0 26px var(--acc); }\r
#panel .foot .go:disabled {\r
  background: #16202f; color: #45566f; cursor: not-allowed; box-shadow: none;\r
}\r
#panel .err {\r
  color: var(--err); font-size: 13px; margin-top: 8px; word-break: break-all;\r
  border-left: 2px solid var(--err); padding-left: 7px;\r
}\r
\r
/* ---------- 右键菜单 ---------- */\r
#menu {\r
  position: absolute; z-index: 40; min-width: 160px; padding: 5px;\r
  background: #080c17f5; border: 1px solid var(--acc); border-radius: 3px;\r
  backdrop-filter: blur(8px); box-shadow: 0 14px 44px #000d, 0 0 18px #00e5ff2e;\r
}\r
#menu button {\r
  display: flex; align-items: center; gap: 9px; width: 100%;\r
  padding: 8px 10px; border-radius: 2px; text-align: left; color: var(--txt);\r
}\r
#menu button:hover { background: #00e5ff1c; color: #bdf1ff; }\r
#menu button.danger:hover { background: #ff2d951c; color: #ffc2dd; }\r
#menu .grp {\r
  padding: 7px 10px 3px; color: var(--acc); font-size: 11px; letter-spacing: 2px;\r
  opacity: .75;\r
}\r
#menu .grp + button { margin-top: 0; }\r
#menu .hd {\r
  padding: 4px 10px 6px; color: var(--dim); font-size: 11px; letter-spacing: 1px;\r
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;\r
  border-bottom: 1px solid var(--line); margin-bottom: 4px;\r
}\r
#menu.at-menu { min-width: 280px; }\r
#menu.at-menu .at-menu-group {\r
  display: flex; align-items: center; gap: 9px; padding: 8px 9px 4px;\r
  color: var(--dim); font-size: 10px; letter-spacing: 1px;\r
}\r
#menu.at-menu .at-menu-group::after { content: ""; height: 1px; flex: 1; background: var(--line); }\r
#menu.at-menu .at-menu-item { transition: background .12s, color .12s, transform .12s, box-shadow .12s; }\r
#menu.at-menu .at-menu-item:hover, #menu.at-menu .at-menu-item:focus-visible {\r
  color: #fff; background: #00e5ff1c; transform: translateX(2px);\r
  box-shadow: inset 2px 0 0 var(--acc);\r
}\r
#menu.at-menu .at-menu-icon { width: 18px; flex: 0 0 18px; font-size: 14px; text-align: center; }\r
#menu.at-menu .at-menu-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\r
#menu.at-menu .at-menu-type { color: var(--dim); font-size: 11px; white-space: nowrap; }\r
#menu.at-menu .at-menu-item.connected .at-menu-type { color: var(--acc); }\r
\r
/* ---------- 能力说明浮层 ---------- */\r
#tip {\r
  position: absolute; z-index: 60; max-width: 340px; padding: 9px 11px;\r
  background: #060a14f7; border: 1px solid var(--acc); border-radius: 3px;\r
  backdrop-filter: blur(6px); pointer-events: none; font-size: 12px;\r
  box-shadow: 0 12px 36px #000d, 0 0 18px #00e5ff2e;\r
}\r
#tip b {\r
  display: block; color: #bdf1ff; letter-spacing: 1px; margin-bottom: 6px;\r
  text-shadow: 0 0 10px #00e5ff66;\r
}\r
#tip .note {\r
  white-space: pre-line;\r
  margin-bottom: 7px; padding-left: 7px; line-height: 1.6;\r
  border-left: 2px solid var(--warn); color: #ffd88a;\r
}\r
#tip .io { display: flex; gap: 8px; margin-top: 3px; line-height: 1.6; }\r
#tip .io i {\r
  flex: 0 0 30px; font-style: normal; color: var(--acc); font-size: 11px;\r
}\r
#tip .io span { flex: 1; color: var(--txt); }\r
#tip .fn {\r
  margin-top: 7px; padding-top: 6px; border-top: 1px solid var(--line);\r
  color: var(--dim); font-size: 11px; font-family: var(--mono);\r
  word-break: break-all;\r
}\r
\r
/* ---------- 产物大图 / 视频详情 ---------- */\r
/* 卡片和槽位里的图、视频不参与浏览器自带的拖拽：拖出来只会得到一个半透明幽灵图，\r
   还容易被误当成"拖它去连线"。看大图请双击或右键。 */\r
.card .body img, .card .body video, .slot .box img, .slot .box video {\r
  -webkit-user-drag: none; user-select: none;\r
}\r
#view {\r
  position: fixed; inset: 0; z-index: 120; background: #04070ceb;\r
  display: flex; align-items: center; justify-content: center;\r
}\r
#view .vbox {\r
  display: flex; flex-direction: column; align-items: center; gap: 10px;\r
  max-width: 94vw;\r
}\r
#view img, #view video {\r
  max-width: 94vw; max-height: 84vh; background: #070a12;\r
  border: 1px solid var(--line); box-shadow: 0 0 46px #00e5ff20;\r
}\r
#view img.vimage {\r
  cursor: grab; touch-action: none; user-select: none; will-change: transform;\r
  transform-origin: center center;\r
}\r
#view img.vimage.panning { cursor: grabbing; }\r
#view audio { width: min(560px, 80vw); }\r
#view .vinfo {\r
  font-family: var(--mono); font-size: 12px; color: var(--dim);\r
  text-align: center; word-break: break-all; max-width: 94vw;\r
}\r
#view .vx {\r
  position: fixed; top: 14px; right: 18px; width: 32px; height: 32px;\r
  background: #080c17f2; border: 1px solid var(--line); border-radius: 2px;\r
  color: var(--dim);\r
}\r
#view .vx:hover { color: var(--acc); border-color: var(--acc); }\r
/* 一组产物的前后翻页（← →） */\r
#view .vnav {\r
  position: fixed; top: 50%; transform: translateY(-50%);\r
  width: 34px; height: 56px; font-size: 22px; line-height: 1;\r
  background: #080c17f2; border: 1px solid var(--line); border-radius: 2px; color: var(--dim);\r
}\r
#view .vnav:hover { color: var(--acc); border-color: var(--acc); }\r
#view .vnav.p { left: 14px; }\r
#view .vnav.n { right: 18px; }\r
\r
/* ---------- 任务浮窗 ---------- */\r
#jobs {\r
  position: fixed; z-index: 45; width: 356px;\r
  display: flex; flex-direction: column; overflow: hidden;\r
  background: #080c17f5; border: 1px solid var(--acc); border-radius: 3px;\r
  backdrop-filter: blur(8px); box-shadow: 0 14px 44px #000d, 0 0 22px #00e5ff2e;\r
}\r
#jobs .jhd {\r
  display: flex; align-items: center; gap: 8px; padding: 10px 12px;\r
  border-bottom: 1px solid var(--line);\r
}\r
#jobs .jhd b {\r
  flex: 1; font-size: 13px; color: #eaf6ff; letter-spacing: 1px;\r
  text-shadow: 0 0 8px #00e5ff55;\r
}\r
#jobs .jhd .lnk { color: var(--dim); font-size: 11px; }\r
#jobs .jhd .lnk:hover { color: var(--acc); }\r
#jobs .jhd .x { color: var(--dim); padding: 0 2px; }\r
#jobs .jhd .x:hover { color: var(--acc2); text-shadow: 0 0 8px var(--acc2); }\r
/* min-height:0 必须有，否则列表撑开浮窗、滚动条出不来（同 #panel .pbody） */\r
#jobs .jlist { flex: 1; min-height: 0; overflow-y: auto; padding: 8px; }\r
#jobs .jempty { padding: 22px 6px; color: var(--dim); font-size: 12px; text-align: center; line-height: 1.9; }\r
.jrow {\r
  margin-bottom: 8px; padding: 8px 9px; border-radius: 3px;\r
  border: 1px solid var(--line); background: var(--panel2);\r
  border-left-width: 2px; border-left-color: var(--line);\r
}\r
.jrow:last-child { margin-bottom: 0; }\r
.jrow.run { border-left-color: var(--acc); box-shadow: 0 0 12px #00e5ff18; }\r
.jrow.wait { border-left-color: var(--warn); }\r
.jrow.done { border-left-color: var(--ok); }\r
.jrow.bad { border-left-color: var(--err); }\r
.jrow.gone { border-left-color: #3a4763; opacity: .72; }\r
.jrow .jowner { margin-bottom: 4px; color: var(--txt); font-size: 12px; overflow-wrap: anywhere; }\r
.jrow .r1 { display: flex; align-items: center; gap: 8px; }\r
.jrow .r1 .nm { flex: 1; display: flex; align-items: baseline; min-width: 0; }\r
/* 「项目名 - 卡片名」：浮窗只有 356px，挤不下时先截项目名（flex-shrink 给得大得多），\r
   卡片名才是必须看得见的那个。min-width:0 不能省，否则 flex 子项不肯缩 */\r
.jrow .r1 .nm .pj {\r
  flex: 0 8 auto; min-width: 14px; overflow: hidden; text-overflow: ellipsis;\r
  white-space: nowrap; font-style: normal; font-size: 11px; color: var(--dim);\r
}\r
.jrow .r1 .nm .cn { flex: 0 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\r
.jrow .r1 .st { font-size: 11px; font-family: var(--mono); white-space: nowrap; }\r
.jrow.run .r1 .st { color: var(--acc); }\r
.jrow.wait .r1 .st { color: var(--warn); }\r
.jrow.done .r1 .st { color: var(--ok); }\r
.jrow.bad .r1 .st { color: var(--err); }\r
.jrow.gone .r1 .st { color: var(--dim); }\r
.jrow .r2 {\r
  display: flex; gap: 8px; margin-top: 4px; white-space: nowrap;\r
  color: var(--dim); font-size: 11px; font-family: var(--mono);\r
}\r
.jrow .r2 .sp { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\r
.jrow .r3 {\r
  display: flex; gap: 8px; margin-top: 3px; min-width: 0;\r
  color: var(--dim); font-size: 11px; font-family: var(--mono);\r
}\r
.jrow .r3 .node {\r
  flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--txt);\r
}\r
.jrow .r3 .step {\r
  flex: 0 1 45%; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right;\r
}\r
.jrow .bar { margin-top: 6px; }\r
.jrow .msg {\r
  margin-top: 5px; padding-left: 6px; font-size: 11px; line-height: 1.6;\r
  color: #ffa8b8; border-left: 2px solid var(--err); word-break: break-all;\r
  max-height: 54px; overflow-y: auto;\r
}\r
.jrow .acts { display: flex; gap: 6px; margin-top: 7px; }\r
.jrow .acts button {\r
  padding: 3px 9px; border-radius: 2px; font-size: 11px;\r
  border: 1px solid var(--line); color: var(--dim);\r
}\r
.jrow .acts button:hover { color: var(--acc); border-color: var(--acc); }\r
.jrow .acts button.danger:hover { color: var(--acc2); border-color: var(--acc2); }\r
\r
#toast {\r
  position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%);\r
  background: #080c17f5; border: 1px solid var(--acc); padding: 9px 16px;\r
  border-radius: 3px; z-index: 99; display: none; max-width: 70vw;\r
  box-shadow: 0 0 20px #00e5ff33;\r
  /* 提示里会有换行（第一行说走了哪条路，第二行才是警告） */\r
  white-space: pre-line;\r
}\r
\r
/* ==================================================================\r
   Open Canvas visual layer\r
   Design direction adapted from ZeroLu/open-canvas (MIT, 2026 ZeroLu).\r
   Only presentation is overridden here; existing IDs and behavior stay intact.\r
   ================================================================== */\r
:scope {\r
  --bg: #0b0d10;\r
  --panel: #111318;\r
  --panel2: #16191f;\r
  --surface: #0d0f13;\r
  --surface-up: #1a1d24;\r
  --line: rgba(255,255,255,.10);\r
  --line-strong: rgba(255,255,255,.18);\r
  --txt: #f3f4f6;\r
  --dim: #9499a3;\r
  --acc: #38bdf8;\r
  --acc2: #f43f5e;\r
  --ok: #34d399;\r
  --warn: #fbbf24;\r
  --err: #fb7185;\r
  --sty: #a78bfa;\r
  --radius: 10px;\r
  --radius-lg: 14px;\r
  --shadow: 0 14px 40px rgba(0,0,0,.34);\r
  --mono: "Cascadia Code", "SFMono-Regular", Consolas, monospace;\r
}\r
\r
:scope.canvas-studio {\r
  background: var(--bg);\r
  color: var(--txt);\r
  font: 13px/1.5 Inter, "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;\r
}\r
button, input, textarea, select { transition: border-color .16s, background-color .16s, color .16s, box-shadow .16s, transform .16s; }\r
input, textarea, select {\r
  color: var(--txt); background: #0b0d10;\r
  border-color: var(--line); border-radius: 8px; padding: 7px 9px;\r
}\r
input:focus, textarea:focus, select:focus {\r
  border-color: rgba(255,255,255,.34); box-shadow: 0 0 0 3px rgba(255,255,255,.06);\r
}\r
::-webkit-scrollbar { width: 7px; height: 7px; }\r
::-webkit-scrollbar-thumb { background: #343841; border-radius: 10px; }\r
::-webkit-scrollbar-thumb:hover { background: #484d58; }\r
\r
/* App sidebar */\r
#side {\r
  width: 280px; flex-basis: 280px; background: #0e1014;\r
  border-right-color: var(--line); box-shadow: none;\r
}\r
#side .head { min-height: 68px; padding: 14px 16px; gap: 11px; border-bottom: 1px solid var(--line); }\r
#side .project-panel-title { flex: 1; font-size: 13px; font-weight: 600; color: var(--txt); }\r
:scope[data-workspace="canvas"] #main { min-width: 0; }\r
#side .brand-mark {\r
  width: 36px; height: 36px; flex: none; display: grid; place-items: center;\r
  border: 1px solid var(--line); border-radius: 10px; background: rgba(255,255,255,.04);\r
}\r
#side .head .logo { width: 25px; height: 25px; border-radius: 6px; filter: none; }\r
#side .brand-copy { display: flex; flex: 1; min-width: 0; flex-direction: column; line-height: 1.15; }\r
#side .head b { color: #fff; font-size: 15px; letter-spacing: .2px; text-shadow: none; }\r
#side .brand-copy small { margin-top: 4px; color: #696e78; font: 9px/1 var(--mono); letter-spacing: 1.4px; }\r
#side .online-count { display: inline-flex; align-items: center; gap: 4px; color: #858a94; font-size: 10px; white-space: nowrap; }\r
#side .online-count > span { width: 6px; height: 6px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 0 4px rgba(52,211,153,.10); }\r
#side .online-count b { color: #d9dce2; font-size: inherit; font-weight: 650; }\r
#side .head .dot { width: 7px; height: 7px; flex: none; background: var(--err); box-shadow: none; }\r
#side .head .dot.on { background: var(--ok); box-shadow: 0 0 0 4px rgba(52,211,153,.10); }\r
#side .head .dot[href] { position: relative; cursor: pointer; }\r
#side .head .dot[href]::after { content: ""; position: absolute; inset: -9px; border-radius: 50%; }\r
#side .head .dot[href]:focus-visible { outline: 2px solid var(--ok); outline-offset: 6px; }\r
#newproj {\r
  margin: 16px 14px 13px; padding: 9px 12px; display: flex; align-items: center; justify-content: center; gap: 7px;\r
  color: #111318; background: #f3f4f6; border: 1px solid #f3f4f6; border-radius: 9px;\r
  font-weight: 650; letter-spacing: 0;\r
}\r
#newproj:hover { color: #090a0c; background: #fff; border-color: #fff; box-shadow: 0 6px 18px rgba(0,0,0,.24); transform: translateY(-1px); }\r
#side .space-picker { display: grid; gap: 6px; margin: 0 14px 13px; color: #777d87; font-size: 10px; letter-spacing: 1px; }\r
#side .space-picker select { width: 100%; padding: 8px 28px 8px 9px; color: #d9dce2; background: #15181d; border-color: var(--line); border-radius: 7px; }\r
#side .section-label { padding: 4px 17px 7px; color: #666c76; font-size: 10px; font-weight: 650; letter-spacing: 1.2px; text-transform: uppercase; }\r
#plist { padding: 0 9px 12px; }\r
.powner { margin-top: 6px; }\r
.powner > summary {\r
  display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 8px 10px;\r
  color: var(--txt); cursor: pointer; list-style: none; border-radius: 6px;\r
}\r
.powner > summary::-webkit-details-marker { display: none; }\r
.powner > summary::before { content: ''; width: 6px; height: 6px; flex: none;\r
  border-right: 1px solid currentColor; border-bottom: 1px solid currentColor; transform: rotate(-45deg); }\r
.powner[open] > summary::before { transform: rotate(45deg); }\r
.powner > summary:hover { background: var(--panel2); }\r
.powner > summary:focus-visible { outline: 2px solid var(--acc); outline-offset: -2px; }\r
.powner-name { flex: 1; min-width: 0; overflow-wrap: anywhere; }\r
.powner-count { color: var(--dim); font-size: 12px; font-family: var(--mono); }\r
.powner-items { padding-left: 12px; }\r
.pitem { margin: 2px 0; padding: 9px 10px; border: 1px solid transparent; border-radius: 8px; }\r
.pitem:hover { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.06); }\r
.pitem.on { color: #fff; background: rgba(255,255,255,.075); border-color: var(--line); }\r
.pitem .ct { min-width: 24px; padding: 1px 6px; color: #858a94; background: rgba(255,255,255,.05); border-radius: 9px; text-align: center; }\r
.pitem .ren, .pitem .del { border-radius: 5px; }\r
.pitem .ren:hover { color: #fff; text-shadow: none; background: rgba(255,255,255,.08); }\r
.pitem .del:hover { color: var(--err); text-shadow: none; background: rgba(244,63,94,.10); }\r
#side .side-foot { display: flex; align-items: center; gap: 7px; margin: auto 14px 0; padding: 13px 3px 15px; border-top: 1px solid var(--line); color: #6f747e; font-size: 11px; }\r
.side-foot-dot { width: 6px; height: 6px; border-radius: 50%; background: #525761; }\r
\r
/* Canvas header */\r
#main { background: var(--bg); }\r
#topbar {\r
  height: 60px; padding: 0 16px; gap: 9px;\r
  background: rgba(11,13,16,.82); border-bottom: 1px solid var(--line); backdrop-filter: blur(18px);\r
}\r
.tbtn {\r
  padding: 7px 10px; color: #c5c8ce; background: rgba(255,255,255,.035);\r
  border-color: var(--line); border-radius: 8px; letter-spacing: 0;\r
}\r
.tbtn:hover { color: #fff; background: rgba(255,255,255,.075); border-color: var(--line-strong); box-shadow: none; }\r
.tbtn.icon-btn { width: 34px; height: 34px; padding: 0; display: grid; place-items: center; }\r
#topbar .crumb { color: #727781; font-size: 12px; }\r
#topbar .crumb-sep { color: #41454d; }\r
#ptitle { font-size: 13px; font-weight: 600; letter-spacing: 0; text-shadow: none; }\r
#ptitle:empty + #fit { margin-left: 0; }\r
#ptitle .ro { border-radius: 5px; color: var(--warn); background: rgba(251,191,36,.08); border-color: rgba(251,191,36,.24); }\r
#hint { color: #6f747e; }\r
#jobsbtn.run { color: #bae6fd; background: rgba(14,165,233,.10); border-color: rgba(56,189,248,.38); box-shadow: none; }\r
#jobsbtn.wait { color: #fde68a; background: rgba(251,191,36,.08); border-color: rgba(251,191,36,.30); }\r
#jobsbtn.open { background: rgba(255,255,255,.09); }\r
\r
/* Dotted workspace */\r
#stage {\r
  top: 60px;\r
  background-color: #070707;\r
  background-image: radial-gradient(rgba(255,255,255,.08) 1px, transparent 1px);\r
  background-size: 28px 28px;\r
}\r
#canvas-toolbar { bottom: 16px; left: 16px; gap: 6px; padding: 4px; background: rgba(17,19,24,.90); border: 1px solid var(--line); border-radius: 10px; box-shadow: var(--shadow); backdrop-filter: blur(16px); }\r
.toolbar-btn { width: 34px; height: 34px; color: #a5a9b1; background: transparent; border-color: transparent; border-radius: 7px; font-size: 15px; box-shadow: none; backdrop-filter: none; }\r
#zoom-menu { padding: 0 9px; font-size: 11px; }\r
.toolbar-btn:hover { color: #fff; background: rgba(255,255,255,.07); border-color: transparent; box-shadow: none; transform: none; }\r
.toolbar-btn.active { color: #fff; background: rgba(255,255,255,.10); border-color: transparent; box-shadow: none; }\r
#minimap { bottom: 72px; background: rgba(17,19,24,.94); border-color: var(--line); border-radius: 10px; box-shadow: var(--shadow); }\r
#minimap-viewport { border-color: rgba(255,255,255,.7); background: rgba(255,255,255,.07); box-shadow: none; }\r
\r
#empty { gap: 12px; padding: 40px; text-align: center; }\r
#empty .empty-icon { width: 52px; height: 52px; display: grid; place-items: center; color: #a1a6af; border: 1px solid var(--line); border-radius: 14px; background: rgba(255,255,255,.035); font-size: 25px; }\r
#empty .big { color: #f4f4f5; font-size: 20px; font-weight: 650; letter-spacing: -.2px; text-shadow: none; }\r
#empty .empty-copy { max-width: 460px; color: #7d828c; font-size: 13px; }\r
#empty .cta button { padding: 9px 15px; color: #111318; background: #f4f4f5; border-color: #f4f4f5; border-radius: 9px; box-shadow: none; font-weight: 650; letter-spacing: 0; }\r
#empty .cta button:hover { color: #090a0c; background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,.28); transform: translateY(-1px); }\r
#empty .empty-shortcuts { display: flex; gap: 8px; margin-top: 8px; color: #666b74; font-size: 11px; }\r
#empty .empty-shortcuts span { padding: 4px 8px; border: 1px solid rgba(255,255,255,.07); border-radius: 6px; background: rgba(255,255,255,.025); }\r
\r
/* Selection, grouping and creation toolbar */\r
.ggroup { border-color: rgba(148,163,184,.38); border-radius: 14px; background: rgba(71,85,105,.10); box-shadow: none; }\r
.ggroup:hover { border-color: rgba(148,163,184,.60); background: rgba(71,85,105,.15); }\r
.ggroup .gglabel { padding: 3px 9px; color: #a8adb6; background: rgba(17,19,24,.96); border-color: var(--line); border-radius: 7px 7px 0 0; letter-spacing: .2px; }\r
#lasso, #groups .selbox { border-color: rgba(255,255,255,.65); background: rgba(255,255,255,.045); box-shadow: none; }\r
#selbar { padding: 4px; background: rgba(17,19,24,.94); border-color: var(--line-strong); border-radius: 9px; box-shadow: var(--shadow); }\r
#selbar button { padding: 5px 10px; color: #d2d5da; background: rgba(255,255,255,.04); border-color: var(--line); border-radius: 6px; }\r
#selbar button:hover { color: #fff; background: rgba(255,255,255,.08); border-color: var(--line-strong); box-shadow: none; }\r
#dock { bottom: 16px; gap: 3px; padding: 5px; background: rgba(17,19,24,.94); border-color: var(--line); border-radius: 11px; box-shadow: var(--shadow); }\r
#dock .dockb { gap: 7px; padding: 7px 11px; color: #b7bbc3; background: transparent; border-color: transparent; border-radius: 7px; letter-spacing: 0; }\r
#dock .dockb span:first-child { width: 17px; color: #8f949d; font: 15px/1 var(--mono); text-align: center; }\r
#dock .dockb:hover { color: #fff; background: rgba(255,255,255,.075); border-color: transparent; box-shadow: none; }\r
#dock .dockb:hover span:first-child { color: #fff; }\r
#dock .sep { margin: 4px 3px; background: var(--line); }\r
\r
/* Connections — mirrors open-canvas CanvasConnectionEdge. */\r
#wires path { stroke: rgba(255,255,255,.24); stroke-width: 1.5; filter: none; }\r
#wires path.hit { stroke: transparent; stroke-width: 28; filter: none; }\r
#wires path.hit:hover + path,\r
#wires path.sel { stroke: rgba(255,255,255,.88); stroke-width: 2.2; filter: none; }\r
#wires path.tmp { stroke: rgba(255,255,255,.88); stroke-width: 2.2; stroke-dasharray: none; filter: none; }\r
#wires path.txt { stroke: rgba(255,255,255,.24); stroke-dasharray: 3 5; filter: none; }\r
#wires path.carry { stroke: rgba(167,139,250,.54); stroke-width: 1.2; filter: none; opacity: 1; }\r
#wires .flow-up { --wire-flow: #7dd3fc; }\r
#wires .flow-down { --wire-flow: #5eead4; }\r
#wires .flow-both { --wire-flow: #c4b5fd; }\r
#wires.has-flow path:not(.hit):not(.related):not(.flow) { opacity: .22; }\r
#wires path.related { stroke-width: 2; }\r
#wires path.flow {\r
  stroke: var(--wire-flow); stroke-width: 2.6; stroke-linecap: round; stroke-dasharray: 5 19;\r
  pointer-events: none; filter: none; animation: wire-flow 1s linear infinite paused;\r
}\r
#wires path.flow.in-view { animation-play-state: running; }\r
#wires marker { overflow: visible; }\r
#wires marker polygon { fill: var(--wire-flow); }\r
@keyframes wire-flow { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -24; } }\r
@media (prefers-reduced-motion: reduce) { #wires path.flow { animation: none; } }\r
\r
/* Workflow node cards — mirrors open-canvas CanvasNode. */\r
.card {\r
  background: #151515; border-color: rgba(255,255,255,.15); border-radius: 24px;\r
  padding: 16px; box-shadow: 0 25px 70px rgba(0,0,0,.45); backdrop-filter: none;\r
  transition: border-color .2s, box-shadow .2s, transform .2s;\r
}\r
.card::before {\r
  display: block; left: 0; right: 0; top: 0; width: auto; height: 96px;\r
  border: 0; border-radius: 24px 24px 0 0;\r
  background: radial-gradient(circle at top,rgba(255,255,255,.08),transparent 68%);\r
}\r
.card::after { display: none; }\r
.card:hover { border-color: rgba(255,255,255,.28); box-shadow: 0 0 0 1px rgba(255,255,255,.05),0 20px 56px rgba(0,0,0,.52); }\r
.card.sel { border-color: rgba(255,255,255,.55); box-shadow: 0 0 0 1px rgba(255,255,255,.14),0 0 28px rgba(255,255,255,.12),0 25px 70px rgba(0,0,0,.58); }\r
.card:has(.st.run) { box-shadow: 0 0 0 1px rgba(56,189,248,.20),0 0 42px rgba(14,165,233,.18),0 25px 70px rgba(0,0,0,.55); }\r
.card:has(.st.err) { box-shadow: 0 0 0 1px rgba(244,63,94,.14),0 25px 70px rgba(0,0,0,.55); }\r
.card .ch { position: relative; z-index: 1; min-height: 38px; margin-bottom: 12px; padding: 0; gap: 12px; color: #80858f; background: transparent; border: 0; border-radius: 0; }\r
.card .ch > span:first-child { width: 36px; height: 36px; flex: none; display: grid; place-items: center; color: rgba(255,255,255,.80); background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.10); border-radius: 14px; font-size: 14px; }\r
.card:has(.st.run) .ch > span:first-child { color: #e0f2fe; }\r
.card:has(.st.done) .ch > span:first-child { color: #d1fae5; }\r
.card:has(.st.err) .ch > span:first-child { color: #ffe4e6; }\r
.card .ch .t { color: rgba(255,255,255,.92); font-size: 14px; font-weight: 600; letter-spacing: 0; white-space: normal; line-height: 1.35; }\r
.card .ch .t.named { color: #fff; }\r
.card .ch .x { width: 28px; height: 28px; flex: none; color: rgba(255,255,255,.42); border-radius: 9px; }\r
.card .ch .x:hover { color: #fff; background: rgba(255,255,255,.08); text-shadow: none; }\r
.card .body { height: 220px; background: rgba(0,0,0,.60); border: 1px solid rgba(255,255,255,.08); border-radius: 20px; }\r
.card .body.grid { gap: 3px; padding: 3px; background: rgba(0,0,0,.60); border-radius: 20px; }\r
.card .body.grid img:hover, .card .body.grid video:hover { outline-color: rgba(255,255,255,.60); }\r
.card .ph { color: rgba(255,255,255,.24); font-size: 28px; }\r
.card > .bar { height: 3px; margin: 10px 1px 8px; background: rgba(255,255,255,.07); border-radius: 999px; overflow: hidden; }\r
.card .cf { min-height: 24px; padding: 0 1px; color: rgba(255,255,255,.42); background: transparent; border: 0; border-radius: 0; }\r
.card .cf .kt { padding: 2px 7px; color: rgba(255,255,255,.70); background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.10); border-radius: 999px; }\r
.card .cf .kt[data-kind="video"],\r
.card .cf .kt[data-kind="both"],\r
.card .cf .kt[data-kind="style"],\r
.card .cf .kt[data-kind="text"] { color: rgba(255,255,255,.70); background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.10); }\r
.card .cf .st.run { color: #bae6fd; text-shadow: none; }\r
.card .cf .st.done { color: #a7f3d0; }\r
.card .cf .st.err { color: #fecdd3; }\r
.bar i { background: #fff; box-shadow: none; }\r
.card .body .load { border-color: rgba(255,255,255,.12); border-top-color: #fff; box-shadow: none; }\r
.card .body .vprog i { background: #fff; box-shadow: none; }\r
.card .body .cmp { background-color: #0b0d10; background-image: linear-gradient(45deg,#1a1d23 25%,transparent 25%,transparent 75%,#1a1d23 75%),linear-gradient(45deg,#1a1d23 25%,transparent 25%,transparent 75%,#1a1d23 75%); }\r
.card .body .cmpx { background: #f4f4f5; box-shadow: none; }\r
.card .body .cmpx i { color: #fff; background: #111318e8; border-color: rgba(255,255,255,.55); }\r
.card .body.sbody { background: rgba(255,255,255,.03); box-shadow: none; }\r
.card .body.sbody .stx, .card .body.sbody textarea.ttxt { color: rgba(255,255,255,.82); }\r
.card .body.sbody textarea.ttxt { caret-color: #fff; padding: 16px; font-size: 13px; line-height: 1.65; }\r
.card .body.sbody textarea.ttxt:focus { box-shadow: inset 0 0 0 1px rgba(255,255,255,.18); }\r
.card .body.sbody textarea.ttxt::placeholder { color: rgba(255,255,255,.30); }\r
.port, .inport { width: 10px; height: 10px; margin-top: -5px; background: #151515; border: 1px solid rgba(255,255,255,.58); box-shadow: 0 0 0 3px rgba(0,0,0,.34); }\r
.port { right: -5px; }\r
.inport { left: -5px; cursor: crosshair; }\r
.port:hover, .inport:hover { background: #f4f4f5; border-color: #fff; transform: scale(1.35); box-shadow: 0 0 0 4px rgba(255,255,255,.10); }\r
.wiring .inport { background: #f4f4f5; border-color: #fff; transform: scale(1.35); box-shadow: 0 0 0 4px rgba(255,255,255,.10); }\r
.card .rz:hover::after { border-color: rgba(255,255,255,.7); }\r
\r
/* History sidebar */\r
#hist { --hist-width: 340px; background: #0e1014; border-left-color: var(--line); box-shadow: none; }\r
#hist .hhd { min-height: 60px; padding: 13px 14px; border-bottom-color: var(--line); }\r
#hist .hhd b { color: #f4f4f5; font-size: 13px; letter-spacing: 0; text-shadow: none; }\r
#hist .hhd .n { padding: 2px 7px; color: #858a94; background: rgba(255,255,255,.05); border-radius: 8px; }\r
#hist .hhd .x { width: 26px; height: 26px; color: #787d86; border-radius: 6px; }\r
#hist .hhd .x:hover { color: #fff; background: rgba(255,255,255,.07); text-shadow: none; }\r
#hist .hlist { padding: 12px; }\r
#hist .hempty { color: #707680; }\r
.hrun { margin-bottom: 10px; background: #13161b; border-color: var(--line); border-radius: 9px; overflow: hidden; }\r
.hrun.cur { border-color: rgba(255,255,255,.28); box-shadow: none; }\r
.hrun .rh { padding: 7px 9px; border-bottom-color: var(--line); }\r
.hrun .rh .tag { color: #f4f4f5; letter-spacing: .2px; }\r
.hrun .rg { gap: 3px; padding: 3px; }\r
.hrun .rg img:hover, .hrun .rg video:hover { outline-color: rgba(255,255,255,.65); }\r
.hrun .rs, .hrun .rp { border-top-color: var(--line); }\r
.hrun .rs span { color: #d4d4d8; }\r
.hrun .rp summary { color: #a8b2c0; }\r
.hrun .rp summary:hover { color: #fff; }\r
\r
/* Node editor */\r
#panel {\r
  background: rgba(17,19,24,.96); border-color: var(--line-strong); border-radius: 12px;\r
  padding: 14px; backdrop-filter: blur(18px); box-shadow: var(--shadow);\r
}\r
#panel .pbody { padding-right: 5px; }\r
#panel .modes { gap: 5px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--line); }\r
#panel .modes button { padding: 5px 10px; color: #8f949e; background: transparent; border-color: transparent; border-radius: 7px; }\r
#panel .modes button:hover { color: #fff; background: rgba(255,255,255,.05); border-color: transparent; }\r
#panel .modes button.on { color: #fff; background: rgba(255,255,255,.09); border-color: var(--line); box-shadow: none; }\r
#panel textarea { border-radius: 8px; }\r
#panel .phd { color: #9499a3; letter-spacing: 0; }\r
#panel .phd button, #panel .prow button { border-color: var(--line); border-radius: 6px; }\r
#panel .phd button:hover, #panel .prow button:hover { color: #fff; background: rgba(255,255,255,.06); border-color: var(--line-strong); }\r
#panel .tabs, #panel .opttabs { gap: 4px; border-bottom-color: var(--line); }\r
#panel .tabs button, #panel .opttabs button { color: #858a94; background: transparent; border-color: transparent; border-radius: 7px 7px 0 0; }\r
#panel .tabs button:hover, #panel .opttabs button:hover { color: #fff; }\r
#panel .tabs button.on, #panel .opttabs button.on { color: #fff; background: rgba(255,255,255,.07); border-color: var(--line); border-bottom-color: #17191e; box-shadow: none; }\r
#panel .tabs button.off { color: #50545c; }\r
#panel .pblock textarea.isdemo { border-color: rgba(251,191,36,.38); color: #fde68a; }\r
#panel .prompt-highlight-wrapper textarea { caret-color: #fff; }\r
#panel .prompt-highlight-wrapper textarea::selection { background: rgba(255,255,255,.15); }\r
#panel .prompt-highlight-layer .at-mention { color: #bae6fd; background: rgba(14,165,233,.12); outline-color: rgba(56,189,248,.36); box-shadow: none; }\r
#panel .phd button.rwbtn, #panel .ptoolbar .tbtool.opt { color: #dbeafe; border-color: rgba(96,165,250,.28); }\r
#panel .phd button.rwbtn:hover, #panel .ptoolbar .tbtool.opt:hover { box-shadow: none; background: rgba(59,130,246,.08); }\r
#panel .pblock textarea.optta { color: #dbeafe; border-color: rgba(96,165,250,.28); }\r
#panel .prompt-highlight-layer.demo { color: #fde68a; }\r
#panel .prompt-highlight-layer.opt { color: #dbeafe; }\r
#panel .ptoolbar .tbtool { padding: 5px 10px; color: #969ba5; background: rgba(255,255,255,.025); border-color: var(--line); border-radius: 7px; }\r
#panel .ptoolbar .tbtool:hover { color: #fff; background: rgba(255,255,255,.06); border-color: var(--line-strong); }\r
#panel .stypv { background: rgba(14,165,233,.035); border-color: rgba(56,189,248,.25); border-left-color: #38bdf8; border-radius: 8px; }\r
#panel .stypv .hd { color: #7dd3fc; border-bottom-color: rgba(56,189,248,.16); }\r
#panel .stypv .tx { color: #bae6fd; }\r
#panel .slinks { background: rgba(255,255,255,.02); border-color: var(--line); border-radius: 8px; }\r
#panel .slink { background: rgba(56,189,248,.035); border-color: rgba(56,189,248,.18); border-radius: 7px; }\r
#panel .slink .nm { color: #bae6fd; }\r
#panel .slink .nm:hover { color: #fff; }\r
#panel .slink.down { background: rgba(255,255,255,.015); border-color: var(--line); }\r
#panel .foot .tcap { color: #cbd5e1; background: rgba(255,255,255,.035); border-color: var(--line); }\r
#panel .foot .tcap:hover, #panel .foot .tcap.on { color: #fff; background: rgba(255,255,255,.075); border-color: var(--line-strong); box-shadow: none; }\r
#panel .tpl { border-color: var(--line); border-radius: 8px; }\r
#panel .tplhd:hover { color: #fff; }\r
#panel .slots { gap: 9px; }\r
.slot .box { background: #0b0d10; border-color: var(--line); border-radius: 7px; }\r
.slot.filled .box { border-color: rgba(255,255,255,.34); box-shadow: none; }\r
.slot.req .box { border-color: rgba(251,191,36,.36); }\r
.slot:hover .box { border-color: rgba(255,255,255,.52); box-shadow: none; }\r
#panel .slots .refadd { background: rgba(255,255,255,.025); border-color: var(--line); border-radius: 7px; }\r
#panel .slots .refadd:hover { color: #fff; border-color: var(--line-strong); }\r
#panel .arange { background: #0b0d10; border-color: var(--line); border-radius: 8px; }\r
#panel .arange .atrack { background-color: #08090c; border-color: var(--line); border-radius: 6px; }\r
#panel .arange .asel { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.52); }\r
#panel .arange .ahd { background: #e4e4e7; }\r
#panel .arange .aout, #panel .resout { color: #e4e4e7; }\r
#panel .row label { color: #8f949e; letter-spacing: 0; }\r
#panel .row input[type=range] { accent-color: #d4d4d8; }\r
#panel .presets button, #panel .dice, #panel .arange .abtn button { color: #9297a1; background: rgba(255,255,255,.03); border-color: var(--line); border-radius: 6px; }\r
#panel .presets button:hover, #panel .dice:hover, #panel .arange .abtn button:hover { color: #fff; background: rgba(255,255,255,.07); border-color: var(--line-strong); box-shadow: none; }\r
#panel .foot { padding-top: 10px; border-top: 1px solid var(--line); }\r
#panel .foot .cancel { padding: 7px 11px; color: #a1a6af; background: rgba(255,255,255,.03); border-color: var(--line); border-radius: 8px; }\r
#panel .foot .cancel:hover { color: #fff; background: rgba(244,63,94,.10); border-color: rgba(244,63,94,.28); }\r
#panel .foot .go { width: 38px; height: 38px; color: #111318; background: #f4f4f5; box-shadow: none; }\r
#panel .foot .go:hover { background: #fff; box-shadow: 0 7px 20px rgba(0,0,0,.30); transform: translateY(-1px); }\r
#panel .foot .go:disabled { color: #666b74; background: #292c33; }\r
#panel .err, #panel .rwerr { color: #fda4af; }\r
\r
/* Menus, dialogs and feedback */\r
#respop, #menu, #menu .menu-submenu, #tip, #jobs {\r
  background: rgba(17,19,24,.97); border-color: var(--line-strong);\r
  border-radius: 11px; backdrop-filter: blur(18px); box-shadow: var(--shadow);\r
}\r
#respop { padding: 14px 15px 15px; }\r
.cpick .ctitle { color: #9a9fa8; letter-spacing: .3px; }\r
.cgrid { gap: 7px; }\r
.cgrid button { color: #898e98; background: rgba(255,255,255,.025); border-color: var(--line); border-radius: 7px; }\r
.cgrid button i { background: #171a20; border-color: #555b66; border-radius: 3px; }\r
.cgrid button:hover { color: #fff; background: rgba(255,255,255,.055); border-color: var(--line-strong); }\r
.cgrid button.on { color: #fff; background: rgba(255,255,255,.09); border-color: rgba(255,255,255,.34); box-shadow: none; }\r
.cgrid button.on i { border-color: #e4e4e7; }\r
#menu { min-width: 190px; padding: 6px; }\r
#menu .menu-submenu { position: absolute; z-index: 1; min-width: 190px; padding: 6px; border: 1px solid var(--line-strong); }\r
#menu .submenu-arrow { margin-left: auto; padding-left: 12px; color: var(--dim); }\r
#menu button:focus-visible { outline: 1px solid var(--line-strong); outline-offset: -1px; }\r
#menu .hd { padding: 6px 9px 8px; color: #767b85; border-bottom-color: var(--line); letter-spacing: .3px; }\r
#menu .grp { padding: 9px 9px 4px; color: #747983; font-size: 10px; letter-spacing: 1px; }\r
#menu button { padding: 8px 9px; color: #d4d7dc; border-radius: 7px; }\r
#menu button > span:first-child { width: 18px; color: #8f949e; text-align: center; }\r
#menu button:hover { color: #fff; background: rgba(255,255,255,.075); }\r
#menu button.danger:hover { color: #fecdd3; background: rgba(244,63,94,.11); }\r
#tip { padding: 11px 12px; }\r
#tip b { color: #fff; letter-spacing: 0; text-shadow: none; }\r
#tip .note { color: #fde68a; }\r
#tip .io i { color: #a1a6af; }\r
#tip .fn { border-top-color: var(--line); }\r
#view { background: rgba(5,6,8,.91); backdrop-filter: blur(10px); }\r
#view img, #view video { background: #090a0d; border-color: var(--line-strong); border-radius: 10px; box-shadow: 0 24px 80px rgba(0,0,0,.55); }\r
#view .vx, #view .vnav { color: #a4a9b2; background: rgba(17,19,24,.90); border-color: var(--line); border-radius: 8px; }\r
#view .vx:hover, #view .vnav:hover { color: #fff; background: rgba(255,255,255,.08); border-color: var(--line-strong); }\r
#jobs { width: 380px; }\r
#jobs .jhd { border-bottom-color: var(--line); }\r
#jobs .jhd b { color: #fff; letter-spacing: 0; text-shadow: none; }\r
#jobs .jhd .lnk:hover, #jobs .jhd .x:hover { color: #fff; text-shadow: none; }\r
.jrow { background: rgba(255,255,255,.025); border-color: var(--line); border-radius: 8px; }\r
.jrow.run { border-left-color: #38bdf8; box-shadow: none; }\r
.jrow.wait { border-left-color: var(--warn); }\r
.jrow.done { border-left-color: var(--ok); }\r
.jrow.bad { border-left-color: var(--err); }\r
.jrow .acts button { color: #969ba5; background: rgba(255,255,255,.025); border-color: var(--line); border-radius: 6px; }\r
.jrow .acts button:hover { color: #fff; background: rgba(255,255,255,.07); border-color: var(--line-strong); }\r
.jrow .acts button.danger:hover { color: #fecdd3; border-color: rgba(244,63,94,.30); }\r
#toast { bottom: 22px; padding: 10px 15px; color: #f4f4f5; background: rgba(24,27,33,.96); border-color: var(--line-strong); border-radius: 9px; box-shadow: var(--shadow); }\r
\r
@media (max-width: 1050px) {\r
  #side { width: 236px; flex-basis: 236px; }\r
  #hist { --hist-width: 290px; }\r
  #panel { width: min(680px, calc(100vw - 32px)); }\r
}\r
button:focus-visible, a:focus-visible {\r
  outline: 2px solid rgba(255,255,255,.75);\r
  outline-offset: 2px;\r
}\r
.param-switch {\r
  display: inline-flex; align-items: center; gap: 8px; flex: none;\r
  min-width: 44px; min-height: 44px; padding: 0; border-radius: 8px;\r
}\r
.param-switch-track {\r
  position: relative; display: block; flex: none; width: 48px; height: 28px;\r
  border-radius: 999px; background: var(--dim); transition: background-color .18s ease;\r
}\r
.param-switch-thumb {\r
  position: absolute; top: 2px; left: 2px; width: 24px; height: 24px;\r
  border-radius: 50%; background: #fff; box-shadow: 0 1px 3px #0004;\r
  transform: translateX(0); transition: transform .18s ease;\r
}\r
.param-switch[aria-checked="true"] .param-switch-track { background: var(--ok); }\r
.param-switch[aria-checked="true"] .param-switch-thumb { transform: translateX(20px); }\r
.param-switch-state { min-width: 2em; color: var(--dim); }\r
@media (prefers-reduced-motion: reduce) {\r
  .param-switch-track, .param-switch-thumb { transition: none; }\r
}\r
\r
@media (max-width: 760px) {\r
  #side { width: 220px; flex-basis: 220px; }\r
  :scope[data-workspace="canvas"] #side { position: fixed; top: 60px; bottom: 0; left: var(--workspace-width); z-index: 40; transition: none; }\r
  :scope.collapsed #side { width: 0; flex-basis: 0; }\r
  #hist { --hist-width: 320px; position: fixed; inset: 0 0 0 auto; z-index: 80; width: min(var(--hist-width), 90vw); box-shadow: -20px 0 60px rgba(0,0,0,.45); }\r
  #topbar .crumb, #topbar .crumb-sep, #hint { display: none; }\r
  #panel { width: calc(100vw - 24px); }\r
  #dock .dockb { padding: 8px; }\r
  #dock .dockb span:last-child { display: none; }\r
  #empty .empty-shortcuts { display: none; }\r
}\r
\r
\r
/* 同源 iframe 复用真正的节点面板；只隐藏画布层，不隐藏全局弹窗。 */\r
:scope.node-editor #side, :scope.node-editor #topbar, :scope.node-editor #hist,\r
:scope.node-editor #world, :scope.node-editor #wires, :scope.node-editor #groups,\r
:scope.node-editor #presence-layer, :scope.node-editor #dock, :scope.node-editor #canvas-toolbar,\r
:scope.node-editor #minimap, :scope.node-editor #lasso, :scope.node-editor #selbar,\r
:scope.node-editor #empty { display: none !important; }\r
:scope.node-editor #main { width: 100%; height: 100%; min-width: 0; }\r
:scope.node-editor #stage { inset: 0; background: var(--panel); cursor: default; }\r
:scope.node-editor #panel {\r
  position: absolute; left: 0; top: 0; width: 100%; height: 100%; max-height: 100%;\r
  box-sizing: border-box; border: 0; border-radius: 0; box-shadow: none; backdrop-filter: none;\r
}\r
:scope.node-editor #panel .pbody { flex: 1 1 0; min-height: 0; overflow-y: auto; }\r
:scope.node-editor #panel > .modes, :scope.node-editor #panel > .foot { flex-shrink: 0; }\r
:scope.node-editor #panel .foot { flex-wrap: wrap; }\r
:scope.node-editor #panel .director-supplement {\r
  margin-bottom: 12px; padding: 7px 9px; border: 1px solid var(--line);\r
  border-radius: 6px; color: var(--dim); font-size: 12px; white-space: pre-wrap; overflow-wrap: anywhere;\r
}\r
:scope.node-editor #respop { width: min(380px, calc(100vw - 16px)); max-height: calc(100vh - 16px); }\r
:scope.node-editor #toast { max-width: calc(100vw - 24px); }\r
#toast a { color: var(--acc); text-decoration: underline; }\r
.if-canvas-link, .if-recover-button {\r
  display: inline-flex; align-items: center; justify-content: center; padding: 5px 9px;\r
  border: 1px solid #fb7185; border-radius: 6px; background: #881337;\r
  color: #fff1f2; font-size: 12px; line-height: 1.4; text-decoration: none; cursor: pointer;\r
}\r
.if-canvas-link:hover, .if-recover-button:hover { background: #9f1239; }\r
.if-canvas-link:focus-visible, .if-recover-button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }\r
.if-recover-button { min-height: 44px; margin-top: 8px; }\r
.if-recover-button:disabled { opacity: .65; cursor: wait; }\r
.card .meta:has(.if-canvas-link) { overflow: visible; flex-shrink: 0; }\r
.card .if-canvas-link { padding: 2px 6px; font-size: 11px; }\r
\r
/* ================= 只读画布：允许看和平移缩放，改动入口全部收掉 ================= */\r
:scope.project-readonly #dock, :scope.project-readonly #selbar .act,\r
:scope.project-readonly .card .runbtn { display: none !important; }\r
:scope.project-readonly #world { cursor: default; }\r
\r
/* ================= 账号 / 登录 / 权限页（组件样式由 auth.js 注入） ================= */\r
:scope.auth-page { display: block; overflow: auto; }\r
\r
.auth-dialog.rename-dialog { width: min(600px, 94vw); }\r
.rename-dialog .rename-list { display: grid; gap: 12px; max-height: 50vh; overflow: auto; padding: 2px; }\r
.rename-dialog .fld > span { overflow-wrap: anywhere; }\r
\r
.auth-dialog.project-share-dialog { width: min(720px, 94vw); }\r
.project-share-dialog .share-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; min-height: 180px; }\r
.project-share-dialog .share-targets { min-width: 0; padding: 12px; border: 1px solid var(--line); border-radius: 7px; background: var(--panel2); }\r
.project-share-dialog .share-targets h3 { margin: 0 0 9px; font-size: 12px; color: var(--txt); }\r
.project-share-dialog .share-target-list { display: grid; align-content: start; gap: 5px; max-height: 300px; overflow: auto; }\r
.project-share-dialog .share-target { display: flex; align-items: center; gap: 9px; padding: 7px 8px; border-radius: 5px; color: var(--txt); cursor: pointer; }\r
.project-share-dialog .share-target:hover { background: #00e5ff12; }\r
.project-share-dialog .share-target input { flex: none; width: 16px; height: 16px; margin: 0; padding: 0; }\r
.project-share-dialog .share-target span { min-width: 0; overflow-wrap: anywhere; }\r
@media (max-width: 620px) { .project-share-dialog .share-columns { grid-template-columns: 1fr; } }\r
\r
.auth-page .fld, .auth-dialog .fld { display: grid; gap: 5px; }\r
.auth-page .fld > span, .auth-dialog .fld > span {\r
  font-size: 11px; color: var(--dim); letter-spacing: 1px;\r
}\r
.auth-page select, .auth-dialog select {\r
  color: var(--txt); appearance: none; -webkit-appearance: none;\r
  padding-right: 28px;\r
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%236b7f9e' stroke-width='1.5'/%3E%3C/svg%3E");\r
  background-repeat: no-repeat; background-position: right 9px center;\r
}\r
\r
.auth-page [role="alert"] {\r
  min-height: 20px; margin: 0 0 14px; padding: 8px 12px;\r
  color: var(--err); background: #ff3b5c10; border: 1px solid #ff3b5c33;\r
  border-radius: 3px; font-size: 12px; display: none;\r
}\r
.auth-page [role="alert"]:not(:empty) { display: block; }\r
.auth-note { color: var(--dim); font-size: 12px; }\r
.auth-note b { color: var(--txt); }\r
\r
/* 徽记：品牌字 + 辉光，与侧栏同一套 */\r
.brandmark { display: flex; align-items: center; gap: 10px; }\r
.brandmark img { width: 28px; height: 28px; border-radius: 5px;\r
  filter: drop-shadow(0 0 6px #00e5ff66); }\r
.brandmark b { font-size: 16px; letter-spacing: 3px; color: #eaf6ff;\r
  text-shadow: 0 0 8px #00e5ffcc, 0 0 20px #00e5ff55; }\r
\r
/* —— 登录页：唯一的亮点是这张发光的卡 —— */\r
:scope.auth-login {\r
  min-height: 100vh; display: grid; place-items: center; padding: 24px;\r
  background:\r
    radial-gradient(900px 480px at 50% -8%, #00e5ff12, transparent 65%),\r
    linear-gradient(#0d18301f 1px, transparent 1px),\r
    linear-gradient(90deg, #0d18301f 1px, transparent 1px),\r
    var(--bg);\r
  background-size: auto, 40px 40px, 40px 40px, auto;\r
}\r
.login-card {\r
  width: min(420px, 100%); padding: 42px 40px 36px; position: relative;\r
  background: var(--panel); border: 1px solid var(--line); border-radius: 3px;\r
  box-shadow: 0 0 56px #00e5ff14;\r
}\r
.login-card::before {           /* 卡片顶上那一线青光：整套界面的卡语言 */\r
  content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px;\r
  background: linear-gradient(90deg, transparent, var(--acc), transparent);\r
}\r
.login-card .brandmark { justify-content: center; margin-bottom: 10px; }\r
.login-card .brandmark img { width: 36px; height: 36px; }\r
.login-card .brandmark b { font-size: 19px; letter-spacing: 4px; }\r
.login-sub { text-align: center; color: var(--dim); font-size: 12.5px; margin: 6px 0 28px; }\r
.login-card form { display: grid; gap: 18px; }\r
.login-card .fld > span { font-size: 12px; }\r
.login-card input { padding: 11px 12px; font-size: 14px; }\r
.login-card .btn { padding: 12px; font-size: 14px; letter-spacing: 6px; }\r
\r
/* —— 权限管理：管理台布局 —— */\r
.perm-page { max-width: 960px; margin: 0 auto; padding: 0 20px 56px; }\r
.perm-header {\r
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;\r
  padding: 16px 0 14px; border-bottom: 1px solid var(--line); margin-bottom: 20px;\r
}\r
.perm-header .brandmark b { font-size: 14px; }\r
.perm-header nav { display: flex; gap: 8px; }\r
.perm-header .account-bar { margin-left: auto; }\r
.perm-section {\r
  background: var(--panel); border: 1px solid var(--line); border-radius: 3px;\r
  padding: 14px 16px 12px; margin-bottom: 16px;\r
}\r
.perm-section > h2 { font-size: 13px; font-weight: 600; letter-spacing: 2px; color: #eaf6ff; }\r
.perm-section > .auth-note { margin: 4px 0 14px; padding-left: 10px;\r
  border-left: 2px solid #00e5ff33; }\r
.auth-dialog .auth-note { margin-bottom: 2px; }\r
\r
/* 行内表单：桌面一行铺开，窄屏折行 */\r
.form-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: stretch; margin-bottom: 12px; }\r
.form-row .fld { flex: 1 1 130px; min-width: 128px; }\r
.form-row .btn { align-self: flex-end; }\r
.form-row .btn { flex: none; }\r
.grant-arrow {                /* A → B：授权是有方向的，箭头是信息 */\r
  align-self: stretch; display: inline-flex; align-items: center;\r
  color: var(--dim); font-family: var(--mono, monospace); font-size: 15px;\r
}\r
.form-row .grant-arrow { flex: 0 0 auto; }\r
\r
/* 表格 */\r
.table-scroll { overflow: auto; }\r
.perm-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }\r
.perm-table th {\r
  text-align: left; font-weight: 400; font-size: 11px; color: var(--dim);\r
  letter-spacing: 1px; padding: 5px 10px 6px; border-bottom: 1px solid var(--line);\r
  background: #0d1424;\r
}\r
.perm-table td { padding: 7px 10px; border-bottom: 1px solid #1e2a4480; }\r
.perm-table tbody tr:hover td { background: var(--panel2); }\r
.perm-table .acts { display: flex; gap: 6px; flex-wrap: wrap; }\r
\r
#topbar .account-bar { margin-left: 10px; margin-right: 2px; }\r
#topbar .account-bar .btn { pointer-events: auto; }\r
\r
@media (max-width: 700px) {\r
  .perm-page { padding: 0 12px 40px; }\r
  .perm-header { gap: 10px; }\r
}\r
\r
/* 权限页独立主题：限定作用域，并覆盖 auth.js 晚注入的共用组件。 */\r
:scope.permissions-page {\r
  --bg: #0c1015; --panel: #121820; --panel2: #19222d; --line: #28323e;\r
  --txt: #edf2f7; --dim: #94a2b4; --acc: #50bddb; --acc2: #e6a0a6;\r
  --ok: #88bda5; --err: #e6a0a6;\r
  min-width: 0; height: auto; min-height: 100%; background: var(--bg);\r
  font: 13px/1.5 system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;\r
  user-select: text;\r
}\r
.permissions-page .perm-page { width: 100%; max-width: 1280px; padding: 0 32px 56px; }\r
.permissions-page .perm-header {\r
  min-height: 64px; padding: 12px 0; margin: 0; gap: 20px;\r
}\r
.permissions-page .brandmark { flex: none; }\r
.permissions-page .brandmark img { width: 24px; height: 24px; filter: none; }\r
.permissions-page .brandmark b { color: var(--txt); font-size: 14px; letter-spacing: 0; text-shadow: none; }\r
.permissions-page .perm-header nav { gap: 4px; flex-wrap: wrap; }\r
.permissions-page .account-bar { flex-wrap: wrap; gap: 8px; min-width: 0; }\r
.permissions-page .account-bar .who { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\r
.permissions-page .perm-intro { padding: 28px 0 24px; }\r
.permissions-page .perm-intro h1 { font-size: 24px; line-height: 1.3; font-weight: 650; letter-spacing: -.4px; }\r
.permissions-page .perm-intro p { margin-top: 8px; color: var(--dim); font-size: 14px; }\r
.permissions-page .perm-section {\r
  display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 32px;\r
  padding: 28px 0; margin: 0; border: 0; border-top: 1px solid var(--line);\r
  border-radius: 0; background: transparent;\r
}\r
.permissions-page .perm-description h2 { font-size: 16px; font-weight: 600; line-height: 1.5; }\r
.permissions-page .perm-description .auth-note { margin-top: 8px; font-size: 12px; line-height: 1.8; }\r
.permissions-page .auth-note b { font-weight: 500; }\r
.permissions-page .perm-content { min-width: 0; }\r
.permissions-page .form-row { gap: 12px; margin: 0 0 16px; align-items: end; }\r
.permissions-page .form-row .fld { min-width: 0; flex: 1 1 150px; }\r
.permissions-page .fld > span { font-size: 12px; letter-spacing: 0; color: var(--dim); }\r
.permissions-page input:not([type="checkbox"]), .permissions-page select {\r
  width: 100%; min-width: 0; height: 38px; padding: 8px 10px;\r
  background-color: var(--panel); border: 1px solid var(--line); border-radius: 6px;\r
  color: var(--txt); font: inherit; box-shadow: none;\r
}\r
.permissions-page select { padding-right: 30px; text-overflow: ellipsis; }\r
.permissions-page input[type="checkbox"] { width: 16px; height: 16px; vertical-align: middle; accent-color: var(--acc); cursor: pointer; }\r
.permissions-page input::placeholder { color: var(--dim); opacity: .85; }\r
.permissions-page input:disabled, .permissions-page select:disabled { opacity: .5; cursor: not-allowed; }\r
.permissions-page .btn, .permissions-page .tbtn {\r
  display: inline-flex; align-items: center; justify-content: center; min-height: 36px;\r
  padding: 7px 12px; border: 1px solid var(--line); border-radius: 6px;\r
  background: var(--panel); color: var(--txt); font: inherit; font-size: 13px;\r
  letter-spacing: 0; white-space: nowrap; box-shadow: none; text-decoration: none;\r
  transition: background-color .12s, border-color .12s, color .12s;\r
}\r
.permissions-page .btn:hover, .permissions-page .tbtn:hover {\r
  background: var(--panel2); color: var(--txt); border-color: #465566; box-shadow: none;\r
}\r
.permissions-page .btn.primary { background: var(--acc); border-color: var(--acc); color: #0c1015; font-weight: 600; }\r
.permissions-page .btn.primary:hover { background: #74cde5; border-color: #74cde5; color: #0c1015; box-shadow: none; }\r
.permissions-page .btn.sm { min-height: 28px; padding: 4px 8px; font-size: 12px; background: transparent; border-color: transparent; }\r
.permissions-page .btn.sm:hover { background: var(--panel2); border-color: transparent; }\r
.permissions-page .btn.danger { color: var(--dim); border-color: transparent; }\r
.permissions-page .btn.danger:hover { color: var(--err); background: #e6a0a610; border-color: transparent; box-shadow: none; }\r
.permissions-page .btn:disabled { opacity: .45; cursor: not-allowed; }\r
.permissions-page .btn.primary:disabled:hover { background: var(--acc); border-color: var(--acc); }\r
.permissions-page .tbtn { background: transparent; border-color: transparent; color: var(--dim); }\r
.permissions-page :is(button, a, input, select, .table-scroll):focus-visible {\r
  outline: 2px solid var(--acc); outline-offset: 3px; box-shadow: none;\r
}\r
.permissions-page .form-row .grant-arrow { align-self: end; height: 38px; }\r
.permissions-page .table-scroll { max-width: 100%; overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }\r
.permissions-page .perm-table { min-width: 680px; font-size: 13px; }\r
.permissions-page .perm-table th {\r
  padding: 10px 12px; color: var(--dim); background: #161e28;\r
  font-size: 12px; font-weight: 500; letter-spacing: 0; white-space: nowrap;\r
}\r
.permissions-page .perm-table td { height: 48px; padding: 7px 12px; border-bottom: 1px solid var(--line); vertical-align: middle; }\r
.permissions-page .perm-table tbody tr:last-child td { border-bottom: 0; }\r
.permissions-page .perm-table tbody tr:hover td { background: #17212b; }\r
.permissions-page .perm-table .acts { display: table-cell; white-space: nowrap; }\r
.permissions-page .acts .btn + .btn { margin-left: 4px; }\r
.permissions-page .perm-table .grant-arrow { display: table-cell; width: 28px; padding: 7px 0; text-align: center; }\r
.permissions-page .perm-table td[colspan] { height: 88px; text-align: center; color: var(--dim); padding: 20px; }\r
.permissions-page .chip { padding: 2px 7px; border: 1px solid var(--line); border-radius: 6px; font-size: 12px; color: var(--dim); gap: 5px; }\r
.permissions-page .chip .d { box-shadow: none; width: 5px; height: 5px; }\r
.permissions-page .chip.admin, .permissions-page .chip.op { color: #9fcedb; border-color: #304650; }\r
.permissions-page .chip.on { color: var(--ok); border-color: #30463e; }\r
.permissions-page .chip.off { color: var(--dim); border-color: var(--line); }\r
.permissions-page .perm-identity { display: inline-flex; align-items: center; gap: 9px; vertical-align: middle; }\r
.permissions-page .perm-avatar { display: grid; place-items: center; width: 30px; height: 30px; flex: none; background: #253340; color: #b8d6e0; border-radius: 8px; font-size: 13px; font-weight: 600; }\r
.permissions-page .perm-identity-detail { display: grid; min-width: 0; }\r
.permissions-page .perm-username { max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }\r
.permissions-page .perm-user-id { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 12px/1.4 var(--mono); color: var(--dim); }\r
.permissions-page .perm-id { font: 12px/1.5 var(--mono); color: var(--dim); overflow-wrap: anywhere; }\r
.permissions-page .perm-history { display: block; }\r
.permissions-page .perm-history .perm-description { margin-bottom: 20px; }\r
.permissions-page .perm-history .auth-note { max-width: 86ch; }\r
.permissions-page .perm-toolbar { display: flex; flex-wrap: wrap; align-items: end; gap: 16px 24px; padding: 16px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px 8px 0 0; }\r
.permissions-page .perm-toolbar .form-row { margin: 0; }\r
.permissions-page .perm-filters { flex: 1 1 380px; }\r
.permissions-page .perm-batch { flex: 1 1 440px; }\r
.permissions-page #project-selected { align-self: end; padding-bottom: 9px; font-size: 12px; color: var(--dim); white-space: nowrap; }\r
.permissions-page .perm-history .table-scroll { border-radius: 0 0 8px 8px; border-top: 0; }\r
.permissions-page .perm-projects { table-layout: fixed; min-width: 760px; }\r
.permissions-page .perm-projects th:first-child { width: 44px; }\r
.permissions-page .perm-projects th:nth-child(2) { width: 28%; }\r
.permissions-page .perm-projects th:nth-child(3) { width: 20%; }\r
.permissions-page .perm-projects th:nth-child(4) { width: 25%; }\r
.permissions-page .perm-projects td:nth-child(2) { overflow-wrap: anywhere; }\r
.permissions-page #assign-status:empty { display: none; }\r
.permissions-page #assign-status:not(:empty) { padding: 12px 16px; border: 1px solid var(--line); color: var(--ok); }\r
.permissions-page [role="alert"] { border-radius: 6px; background: #e6a0a60d; border-color: #e6a0a633; overflow-wrap: anywhere; }\r
.permissions-page .auth-dialog { border-radius: 8px; background: var(--panel); box-shadow: 0 20px 60px #0008; }\r
.permissions-page .auth-dialog h2 { font-size: 16px; letter-spacing: 0; overflow-wrap: anywhere; }\r
.permissions-page .auth-dialog footer .btn { padding: 7px 12px; }\r
.permissions-page ::-webkit-scrollbar-thumb { background: #364352; border-radius: 6px; }\r
.permissions-page .team-list { display: grid; gap: 18px; }\r
.permissions-page .team-card { padding: 18px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }\r
.permissions-page .team-card > header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }\r
.permissions-page .team-card h3 { margin: 0 0 4px; font-size: 16px; }\r
.permissions-page .team-add-member { margin-bottom: 14px; align-items: start; }\r
.permissions-page .team-member-picker { flex: 1 1 320px; min-width: 0; padding: 10px 12px;\r
  border: 1px solid var(--line); border-radius: 6px; }\r
.permissions-page .team-member-picker legend { padding: 0 4px; color: var(--dim); font-size: 12px; }\r
.permissions-page .team-member-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--dim); }\r
.permissions-page .team-member-toolbar label, .permissions-page .team-member-option {\r
  display: flex; align-items: center; gap: 8px; min-height: 44px; cursor: pointer;\r
}\r
.permissions-page .team-member-choices { display: grid; max-height: 220px; overflow-y: auto; }\r
.permissions-page .team-member-option { padding: 4px 6px; border-radius: 4px; }\r
.permissions-page .team-member-option:hover { background: var(--panel2); }\r
.permissions-page .team-member-option span { min-width: 0; overflow-wrap: anywhere; }\r
.permissions-page .team-member-picker input { flex: none; }\r
.permissions-page .team-member-error { flex: 0 0 100%; color: var(--err); }\r
.permissions-page .team-member-error:empty { display: none; }\r
.permissions-page .team-card .table-scroll { border-radius: 6px; }\r
@media (max-width: 1000px) {\r
  .permissions-page .perm-header .account-bar { margin-left: 0; flex-basis: 100%; }\r
  .permissions-page .perm-section { grid-template-columns: 180px minmax(0, 1fr); gap: 24px; }\r
}\r
@media (max-width: 760px) {\r
  .permissions-page .perm-page { padding: 0 16px 32px; }\r
  .permissions-page .perm-header { gap: 10px 16px; }\r
  .permissions-page .perm-section { grid-template-columns: minmax(0, 1fr); gap: 16px; padding: 24px 0; }\r
  .permissions-page .perm-intro { padding: 24px 0; }\r
  .permissions-page .form-row { display: grid; grid-template-columns: minmax(0, 1fr); }\r
  .permissions-page .form-row .btn { justify-self: start; }\r
  .permissions-page .form-row .grant-arrow { display: none; }\r
  .permissions-page .perm-toolbar { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; padding: 12px; }\r
  .permissions-page .perm-batch { border-top: 1px solid var(--line); padding-top: 16px; }\r
  .permissions-page #project-selected { padding: 0; }\r
  .permissions-page .perm-table:has(tbody td[colspan]) { min-width: 0; table-layout: auto; }\r
  .permissions-page .perm-table:has(tbody td[colspan]) th { white-space: normal; }\r
}\r
@media (prefers-reduced-motion: reduce) {\r
  .permissions-page .btn, .permissions-page .tbtn { transition: none; }\r
}\r
\r
:scope {height:100dvh;}\r
\r
}`,td=`@scope (body[data-chouka-page="canvas"]) {\r
/* Scoped to the native modal; no global editor or Fabric overrides. */\r
dialog.chouka-composer {\r
  --ic-bg:#0e1416; --ic-panel:#151d1f; --ic-field:#101719; --ic-line:#33423e;\r
  --ic-text:#ecf3ef; --ic-muted:#acbcb4; --ic-accent:#a0e7cb; --ic-error:#ffb3a5;\r
  box-sizing:border-box; color-scheme:dark; color:var(--ic-text); background:var(--ic-bg);\r
  width:min(1600px,97vw); height:94dvh; max-width:97vw; max-height:96dvh;\r
  margin:auto; padding:0; border:1px solid #4b665b; border-radius:14px;\r
  font:13px/1.5 "Segoe UI","Microsoft YaHei",sans-serif; overflow:hidden;\r
  box-shadow:0 24px 100px #000a;\r
}\r
dialog.chouka-composer[open] { display:flex; flex-direction:column; }\r
.chouka-composer::backdrop { background:#050a0cdb; }\r
.chouka-composer *, .chouka-composer *::before, .chouka-composer *::after { box-sizing:border-box; }\r
.chouka-composer [hidden] { display:none!important; }\r
.chouka-composer button, .chouka-composer input { font:inherit; }\r
.chouka-composer button { cursor:pointer; }\r
.chouka-composer button:disabled, .chouka-composer input:disabled { opacity:.4; cursor:not-allowed; }\r
.chouka-composer :is(button,input):focus-visible { outline:2px solid var(--ic-accent); outline-offset:2px; }\r
.chouka-composer .ic-head { display:flex; align-items:center; gap:18px; padding:14px 20px; border-bottom:1px solid var(--ic-line); flex:none; }\r
.chouka-composer .ic-head h2 { margin:0; font-size:19px; font-weight:600; color:var(--ic-text); }\r
.chouka-composer .ic-local { flex:1; color:var(--ic-muted); font-size:12px; }\r
.chouka-composer .ic-status { flex:none; min-height:30px; padding:5px 20px; color:var(--ic-accent); border-bottom:1px solid var(--ic-line); overflow-wrap:anywhere; }\r
.chouka-composer .ic-error { flex:none; padding:10px 20px; background:#3b2423; color:var(--ic-error); border-bottom:1px solid #714540; max-height:100px; overflow:auto; overflow-wrap:anywhere; }\r
.chouka-composer .ic-body { display:grid; grid-template-columns:252px minmax(0,1fr) 258px; flex:1; min-height:0; }\r
.chouka-composer .ic-left, .chouka-composer .ic-right { background:var(--ic-panel); padding:16px; overflow:auto; min-width:0; overscroll-behavior:contain; scrollbar-width:thin; }\r
.chouka-composer .ic-left { border-right:1px solid var(--ic-line); }\r
.chouka-composer .ic-right { border-left:1px solid var(--ic-line); }\r
.chouka-composer h3 { margin:0 0 12px; font-size:13px; font-weight:600; color:var(--ic-text); }\r
.chouka-composer h3:not(:first-child) { margin-top:24px; padding-top:16px; border-top:1px solid var(--ic-line); }\r
.chouka-composer .ic-center { display:flex; flex-direction:column; min-width:0; min-height:0; padding:12px; gap:10px; }\r
.chouka-composer .ic-toolbar { display:flex; gap:6px; align-items:center; flex-wrap:wrap; flex:none; }\r
.chouka-composer .ic-button { width:auto; min-height:36px; padding:7px 10px; margin:0; color:var(--ic-text); background:#22302a; border:1px solid #456052; border-radius:6px; white-space:normal; line-height:1.4; transition:background .15s,border-color .15s; }\r
.chouka-composer .ic-button:hover:not(:disabled) { background:#30473a; border-color:#82b59c; }\r
.chouka-composer .ic-primary { background:var(--ic-accent); color:#10291f; border-color:var(--ic-accent); font-weight:600; min-width:104px; }\r
.chouka-composer .ic-primary:hover:not(:disabled) { background:#c3f7df; color:#10291f; }\r
.chouka-composer .ic-zoom { margin-left:auto; font-size:12px; color:var(--ic-muted); font-variant-numeric:tabular-nums; }\r
.chouka-composer .ic-viewport { flex:1; min-height:160px; min-width:0; display:flex; align-items:center; justify-content:center; overflow:auto; padding:16px; background:#080d0f; border:1px solid #293b34; border-radius:8px; overscroll-behavior:contain; }\r
.chouka-composer .ic-viewport .canvas-container { flex:none; box-shadow:0 0 0 1px #66776d,0 8px 28px #0008; background-color:#d5dad6; background-image:linear-gradient(45deg,#acb8af 25%,transparent 25%),linear-gradient(-45deg,#acb8af 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#acb8af 75%),linear-gradient(-45deg,transparent 75%,#acb8af 75%); background-size:20px 20px; background-position:0 0,0 10px,10px -10px,-10px 0; }\r
.chouka-composer .ic-viewport canvas { display:block; max-width:none; max-height:none; touch-action:none; }\r
.chouka-composer .ic-hint { font-size:12px; color:var(--ic-muted); line-height:1.65; margin:8px 0; overflow-wrap:anywhere; }\r
.chouka-composer .ic-center>.ic-hint { flex:none; margin:0; }\r
.chouka-composer .ic-layers { display:grid; gap:6px; min-height:66px; max-height:39vh; overflow:auto; padding:3px; margin:0 -3px; scrollbar-width:thin; }\r
.chouka-composer .ic-empty { font-size:12px; line-height:1.7; padding:12px; color:var(--ic-muted); border:1px dashed var(--ic-line); border-radius:6px; margin:0; }\r
.chouka-composer .ic-layer { display:grid; grid-template-columns:minmax(0,1fr); gap:3px; padding:4px; border:1px solid var(--ic-line); border-radius:8px; background:#10181a; }\r
.chouka-composer .ic-layer.is-selected { border-color:var(--ic-accent); background:#233b2f; }\r
.chouka-composer .ic-layer.is-dragover { outline:2px dashed var(--ic-accent); outline-offset:1px; }\r
.chouka-composer .ic-layer button { min-height:34px; padding:5px; color:var(--ic-text); border:0; border-radius:4px; background:transparent; }\r
.chouka-composer .ic-layer button:hover:not(:disabled) { background:#a0e7cb19; }\r
.chouka-composer .ic-layer-name { display:flex; flex-direction:column; gap:7px; width:100%; min-width:0; text-align:left; font-size:12px; }\r
.chouka-composer .ic-thumbnail { display:flex; flex:none; align-items:center; justify-content:center; width:100%; aspect-ratio:4/3; overflow:hidden; border:1px solid #53645b; border-radius:4px; background-color:#27352f; background-image:conic-gradient(#35463c 25%,transparent 0 50%,#35463c 0 75%,transparent 0); background-size:16px 16px; pointer-events:none; user-select:none; }\r
.chouka-composer .ic-layer-name .ic-thumbnail { aspect-ratio:2/1; }\r
.chouka-composer .ic-thumbnail :is(img,canvas) { display:block; width:100%; height:100%; object-fit:contain; pointer-events:none; }\r
.chouka-composer .ic-asset-name { display:block; width:100%; min-width:0; overflow-wrap:anywhere; white-space:normal; line-height:1.45; }\r
.chouka-composer .ic-layer-controls { display:flex; justify-content:flex-end; gap:6px; padding-top:3px; border-top:1px solid var(--ic-line); }\r
.chouka-composer .ic-layer-controls .ic-layer-toggle { min-width:48px; font-size:12px; color:var(--ic-muted); }\r
.chouka-composer .ic-layer-toggle[aria-pressed=false], .chouka-composer .ic-layer-toggle[data-layer-action=lock][aria-pressed=true] { background:#a0e7cb12; }\r
.chouka-composer .ic-layer-actions { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; margin-top:12px; }\r
.chouka-composer .ic-sources { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-top:12px; }\r
.chouka-composer .ic-sources .ic-button { display:flex; flex-direction:column; align-items:stretch; gap:7px; width:100%; min-width:0; padding:6px; text-align:left; font-size:12px; }\r
.chouka-composer .ic-sources>.ic-hint { grid-column:1 / -1; }\r
.chouka-composer .ic-field { display:flex; flex-direction:column; gap:6px; margin:0 0 14px; min-width:0; color:var(--ic-muted); font-size:12px; }\r
.chouka-composer .ic-field-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:0 10px; }\r
.chouka-composer .ic-field input { width:100%; min-width:0; min-height:36px; border:1px solid #40544a; background:var(--ic-field); color:var(--ic-text); border-radius:5px; padding:7px 8px; margin:0; outline:none; font-variant-numeric:tabular-nums; }\r
.chouka-composer .ic-field input[type=color] { height:38px; padding:4px; cursor:pointer; }\r
.chouka-composer .ic-switch { flex-direction:row; justify-content:space-between; align-items:center; min-height:36px; gap:12px; cursor:pointer; }\r
.chouka-composer .ic-switch input[type=checkbox] { appearance:none; -webkit-appearance:none; position:relative; flex:none; width:38px; height:22px; min-height:22px; padding:0; border:1px solid #56665f; border-radius:20px; background:#35433c; cursor:pointer; transition:background .15s; }\r
.chouka-composer .ic-switch input[type=checkbox]::after { content:""; position:absolute; width:16px; height:16px; top:2px; left:2px; border-radius:50%; background:#e9f1ec; box-shadow:0 1px 3px #0006; transition:transform .15s; }\r
.chouka-composer .ic-switch input[type=checkbox]:checked { background:#73bd98; border-color:#91d4b1; }\r
.chouka-composer .ic-switch input[type=checkbox]:checked::after { transform:translateX(16px); }\r
.chouka-composer .ic-footer { flex:none; display:flex; align-items:center; justify-content:flex-end; gap:10px; padding:12px 20px; border-top:1px solid var(--ic-line); background:var(--ic-panel); }\r
.chouka-composer .ic-footer>.ic-hint { flex:1; margin:0; }\r
@media (min-width:1700px) { .chouka-composer .ic-body { grid-template-columns:280px minmax(0,1fr) 280px; } }\r
@media (max-width:1100px) { .chouka-composer .ic-body { grid-template-columns:205px minmax(0,1fr) 215px; } .chouka-composer .ic-left,.chouka-composer .ic-right { padding:10px; } .chouka-composer .ic-center { padding:8px; } .chouka-composer .ic-toolbar .ic-button { padding:6px; } }\r
@media (max-width:760px) {\r
  dialog.chouka-composer { width:98vw; max-width:98vw; height:96dvh; max-height:98dvh; border-radius:9px; }\r
  .chouka-composer .ic-body { grid-template-columns:minmax(0,1fr) minmax(0,1fr); overflow:auto; align-content:start; }\r
  .chouka-composer .ic-center { grid-column:1 / -1; grid-row:1; height:49dvh; min-height:310px; }\r
  .chouka-composer .ic-left,.chouka-composer .ic-right { overflow:visible; border-top:1px solid var(--ic-line); }\r
  .chouka-composer .ic-left { grid-column:1; border-right:0; } .chouka-composer .ic-right { grid-column:2; }\r
  .chouka-composer .ic-head { padding:10px 12px; gap:10px; } .chouka-composer .ic-local { display:none; } .chouka-composer .ic-head h2 { flex:1; font-size:17px; }\r
  .chouka-composer .ic-footer { flex-wrap:wrap; padding:10px 12px; } .chouka-composer .ic-footer>.ic-hint { flex-basis:100%; }\r
  .chouka-composer .ic-layer-actions { grid-template-columns:repeat(2,minmax(0,1fr)); }\r
  .chouka-composer .ic-field-grid { grid-template-columns:minmax(0,1fr); }\r
  .chouka-composer .ic-button,.chouka-composer .ic-layer button,.chouka-composer .ic-field input { min-height:44px; }\r
  .chouka-composer .ic-switch input[type=checkbox] { min-height:22px; }\r
}\r
@media (max-width:480px) { .chouka-composer .ic-sources { grid-template-columns:minmax(0,1fr); } }\r
@media (prefers-reduced-motion:reduce) { .chouka-composer *, .chouka-composer *::after { transition:none!important; } }\r
\r
}`,nd=["image","audio","video"],Fi=[{id:"480P",label:"480P",val:480},{id:"720P",label:"720P",val:720},{id:"1080P",label:"1080P",val:1080},{id:"1440P",label:"1440P",val:1440},{id:"2K",label:"2K",val:2048}],po=[["1:1",1,1],["1:2",1,2],["2:1",2,1],["9:16",9,16],["16:9",16,9],["3:4",3,4],["4:3",4,3],["3:2",3,2],["2:3",2,3],["5:4",5,4],["4:5",4,5],["21:9",21,9],["9:21",9,21]];function ts(m){return(m&&m.options||[]).map(y=>{const C=/^(\d+)x(\d+)\s+\(([^)]+)\)$/.exec(String(y));if(!C)return null;const N=parseInt(C[1],10),T=parseInt(C[2],10);return{value:y,width:N,height:T,ratio:C[3],short:Math.min(N,T)}}).filter(Boolean)}function rd(m,y){return ts(m).find(C=>C.value===y)||null}function Di(m,y){const C=y.imageControls,N=m.params.image_ratio,T=m.params.image_clarity;return{ratio:po.some(R=>R[0]===N)||C.mode==="i2i"&&N==="original"?N:C.defaultRatio,clarity:Fi.some(R=>R.id===T)?T:C.defaultClarity}}function ns(m,y,C,N){if(C&&N&&C.id!==N.id&&(C.imageControls||N.imageControls)){const T=s=>[...new Set(s.inputs.filter(P=>!nd.includes(P.type)&&P.type!=="textarea"&&P.type!=="seed").map(P=>P.key))],R=m.params._imageModelParams||={};R[C.id]=Object.fromEntries(T(C).filter(s=>m.params[s]!=null).map(s=>[s,m.params[s]]));const q=m.params._imageRatios||={};C.imageControls&&(q[C.imageControls.mode]=Di(m,C).ratio);for(const s of new Set([...T(C),...T(N)]))delete m.params[s];Object.assign(m.params,R[N.id]||{}),N.imageControls&&C.imageControls?.mode!==N.imageControls.mode&&(m.params.image_ratio=q[N.imageControls.mode]||N.imageControls.defaultRatio)}m.cap=y}function od({document:m,getCapability:y,getCapabilityById:C,getRunCapability:N,getProject:T,isIF:R,normalizeIFDuration:q,api:s,save:P,onReferenceChange:G,ratioWH:Z,multiple:Oe}){function De(E,W,F){const j=Di(E,W),Q=m.createElement("div");Q.className="cpick image-size-controls";const _e=m.createElement("div");_e.className="ctitle",_e.textContent="画面比例";const Ie=m.createElement("div");Ie.className="cgrid";const Pe=W.imageControls.mode==="i2i"?[["original",1,1],...po]:po;for(const[Be,ee,_]of Pe){const S=m.createElement("button"),ne=Be==="original"?"原图":Be;S.className=Be===j.ratio?"on":"",S.innerHTML=`<i style="--ratio:${ee/_}"></i><span>${ne}</span>`,S.title=`画面比例 ${ne}`,S.onclick=()=>{E.params.image_ratio=Be,P(),F()},Ie.appendChild(S)}const He=m.createElement("div");He.className="ctitle",He.textContent="清晰度";const $e=m.createElement("div");$e.className="cgrid k";for(const Be of Fi){const ee=m.createElement("button");ee.className=Be.id===j.clarity?"on":"",ee.textContent=Be.label,ee.title=`目标短边 ${Be.val}px，实际尺寸按模型要求对齐`,ee.onclick=()=>{E.params.image_clarity=Be.id,P(),F()},$e.appendChild(ee)}const qe=m.createElement("div");return qe.className="image-size-hint",qe.textContent=W.imageControls.mode==="i2i"?"清晰度按短边计算；默认保持原图比例。指定比例时，模型可能裁切主图以适配画布。":"清晰度按短边计算；实际尺寸按模型要求对齐。高分辨率会增加显存占用。",Q.append(_e,Ie,He,$e,qe),Q}const Se=E=>E?.kind==="gen"&&E.outputType==="video"&&(E.execution==="if_studio"||E.id.startsWith("minimax_h3_")&&E.inputs.some(W=>W.type==="video")),we=(E,W)=>Se(W)?(R(E)?y(E):W).inputs.filter(F=>F.type==="video").map(F=>E.assets?.[F.key]).find(F=>F?.ref):null,Ne=E=>E&&[E.width,E.height,E.duration].every(W=>Number.isFinite(+W)&&+W>0),M=new WeakMap;async function A(E,W=N(E)){const F=we(E,W);if(!F||Ne(F))return;if(M.has(F))return M.get(F).promise;const j=T(),Q={};return M.set(F,Q),Q.promise=s("/api/media?ref="+encodeURIComponent(F.ref)+"&project="+encodeURIComponent(j.id)).then(_e=>{if(!Ne(_e))throw new Error("无法读取参考视频的比例和时长，请重新导入视频");T()!==j||!j.cards.includes(E)||we(E,W)!==F||(Object.assign(F,_e),P())}).catch(_e=>{throw Q.error=_e.message,_e}),Q.promise}function ae(E,W=N(E)){const F=we(E,W);if(!F)return delete E._referenceParameters,delete E.params._reference_video,Promise.resolve();const j=JSON.stringify([W.id,F.ref]);if(E.params._reference_video===j)return Promise.resolve();const Q=E._referenceParameters;if(Q?.identity===j&&Q.source===F)return Q.promise;const _e=T(),Ie=E.params,Pe={...Ie},He={identity:j,source:F,before:Pe};E._referenceParameters=He;const $e=()=>{if(T()!==_e||!_e.cards.includes(E)||E.params!==Ie||E._referenceParameters!==He||N(E)!==W||we(E,W)!==F||!Ne(F))return;const qe=ne=>ne.every(me=>Ie[me]===Pe[me]),Be=W.inputs.find(ne=>ne.key==="aspect_ratio"),ee=+F.width/+F.height;if(Be&&qe(["aspect_ratio"]))Ie.aspect_ratio=Be.options.reduce((ne,me)=>Math.abs(Z[me][0]/Z[me][1]-ee)<Math.abs(Z[ne][0]/Z[ne][1]-ee)?me:ne);else if(!Be&&qe(["width","height","_ratio"])){const ne=po.reduce((J,V)=>Math.abs(V[1]/V[2]-ee)<Math.abs(J[1]/J[2]-ee)?V:J),me=J=>Ie[J]??W.inputs.find(V=>V.key===J)?.default,H=Math.min(+me("width"),+me("height"));Ie._ratio=ne[0],Ie.width=ne[1]>=ne[2]?Math.round(H*ne[1]/ne[2]/Oe)*Oe:H,Ie.height=ne[1]>=ne[2]?H:Math.round(H*ne[2]/ne[1]/Oe)*Oe}const _=W.inputs.some(ne=>ne.key==="preview_seconds"),S=_?"preview_seconds":"duration";qe([S])&&(Ie[S]=_?0:Math.max(1,Math.round(+F.duration)),R(E)&&q(E)),Ie._reference_video=j,P()};return He.promise=Ne(F)?Promise.resolve($e()):A(E,W).then($e),He.promise}function ue(E){ae(E).catch(()=>{}).finally(()=>G(E))}function $(E,W){const F=we(E,W);if(!F||Ne(F))return null;const j=m.createElement("div");if(j.className="knobnote",j.setAttribute("role","status"),j.textContent=M.get(F)?.error||"正在读取参考视频的比例和时长…",M.get(F)?.error){const Q=m.createElement("button");Q.type="button",Q.textContent="重新读取",Q.onclick=()=>{M.delete(F),delete E._referenceParameters,ue(E),G(E)},j.appendChild(Q)}return j}return{imageClarityPicker:De,supportsVideoReference:Se,referenceVideo:we,videoMetadataReady:Ne,ensureReferenceMetadata:A,syncReferenceParameters:ae,refreshVideoParameters:ue,videoReferenceStatus:$,switchImageCapability:(E,W)=>ns(E,W,y(E),C(W))}}const id={CLARITY_STEPS:Fi,RATIO_GRID:po,resolutionPresets:ts,resolutionPreset:rd,imageSettings:Di,switchImageCapability:ns,applyInputPresets:ad,create:od};function ad(m,y){for(const C of(m.inputs||[]).filter(N=>N.presets)){const N=y[C.key]!=null?y[C.key]:C.default,T=C.presets[N];if(!T)throw new Error(`${C.label}无效：${N}`);y[C.key]=N,Object.assign(y,T)}}const co={"1:1 (Square)":[1,1],"2:3 (Portrait Photo)":[2,3],"3:2 (Photo)":[3,2],"3:4 (Portrait Standard)":[3,4],"4:3 (Standard)":[4,3],"9:16 (Portrait Widescreen)":[9,16],"16:9 (Widescreen)":[16,9],"21:9 (Ultrawide)":[21,9]},fr=[480,544,640,768],rs={480:832,544:960,640:1152,768:1344},On=32,Wo=new Set(["megapixels","width","height","aspect_ratio","resolution","scale_to_length","output_1080p"]),os=[{id:"1080p",short:1080},{id:"2K",short:1440},{id:"4K",short:2160}],Ua=["3:4",3,4],ft=(m,y)=>m.inputs.find(C=>C.key===y);function Rr(m){return m===null||typeof m=="string"||typeof m=="number"||typeof m=="boolean"?m:void 0}const yt=(m,y)=>y?Rr(m.params[y.key])??y.default:void 0,ur=m=>typeof m=="string"?m:"",Tn=m=>typeof m=="number"||typeof m=="string"?Number(m):NaN,Ja=m=>Number.parseFloat(String(Rr(m)));function qi(m){return co[ur(m)]??[1,1]}function mr(m,y){const[C,N]=qi(m),T=Math.sqrt(y*1024*1024/(C*N));return[Math.round(C*T/On)*On,Math.round(N*T/On)*On]}function is(m,y){const[C,N]=qi(m),T=y/Math.min(C,N),R=Math.round(T*T*C*N/(1024*1024)*100)/100;for(const q of[0,1,-1,2,-2,3,-3]){const s=Math.round((R+q*.01)*100)/100;if(s>0&&Math.min(...mr(m,s))===y)return s}return R}const Xa=m=>Math.round(m*9/16/On)*On;function as(m){return m.id==="minimax_h3_ref_2pass_bf16"||m.id==="minimax_h3_fusion_v2_bf16"?ft(m,"output_1080p"):void 0}function Xo(m,y){const[C,N]=qi(m);return{width:Math.round(y*Math.max(1,C/N)/2)*2,height:Math.round(y*Math.max(1,N/C)/2)*2}}function Ya(m,y){const C=as(y);return!C||yt(m,C)!=="on"?null:Xo(yt(m,ft(y,"aspect_ratio")),1080)}function Oi(m,y){if(y.execution!=="if_studio"||y.outputType!=="video")return null;const C=os.find(N=>N.id===m.params.if_video_resolution);return C?{label:C.id,...Xo(yt(m,ft(y,"aspect_ratio")),C.short)}:null}function sd(m,y){for(const C of m.querySelectorAll("input, select"))C.addEventListener("input",y),C.addEventListener("change",y);for(const C of m.querySelectorAll('[role="switch"]'))C.addEventListener("click",y)}function ld(m){const{document:y,save:C,ratioGrid:N,claritySteps:T,resolutionPresets:R,resolutionPreset:q}=m,s=$=>{C(),$?.()},P=$=>$.outputType==="video"?fr.map(E=>({id:`${E}p`,label:`${E}p`,val:E})):T;function G($){let E=null,W=1/0;for(const[F,[j,Q]]of Object.entries(co)){const _e=Math.abs($[1]/$[2]-j/Q);_e<W-1e-9&&(W=_e,E=F)}return E}function Z($){const E=co[ur($)];return E?N.find(W=>W[1]===E[0]&&W[2]===E[1]):void 0}function Oe($,E){let W="3:4",F=1/0;for(const j of N){const Q=Math.abs($/E-j[1]/j[2]);Q<F&&(F=Q,W=j[0])}return W}function De($,E){const W=P($),F=W.find(Pe=>Pe.id===E.params._clarity);if(F)return F;const j=Tn(yt(E,ft($,"width"))),Q=Tn(yt(E,ft($,"height")));if(!j||!Q)return null;let _e=null,Ie=1/0;for(const Pe of W){const He=Math.abs(Pe.val-Math.min(j,Q));He<Ie&&(Ie=He,_e=Pe)}return _e}function Se($){const E=y.createElement("div");return E.className="ctitle",E.textContent=$,E}function we($=!1){const E=y.createElement("div");return E.className=$?"cgrid k":"cgrid",E}function Ne($,E,W,F){const j=y.createElement("button");return j.type="button",j.textContent=$,j.className=E?"on":"",j.title=W,j.setAttribute("aria-pressed",String(E)),j.onclick=F,j}function M($,E,W,F){const j=Ne("",E,W,F),Q=y.createElement("i");Q.style.setProperty("--ratio",String($[1]/$[2]));const _e=y.createElement("span");return _e.textContent=$[0],j.append(Q,_e),j}function A($,E,W){if(E.imageControls)return m.imageClarityPicker($,E,W);const F=ft(E,"aspect_ratio"),j=ft(E,"megapixels"),Q=ft(E,"resolution"),_e=ft(E,"width")&&ft(E,"height"),Ie=ft(E,"scale_to_length"),Pe=y.createElement("div");if(Pe.className="cpick",Q){const ee=R(Q),_=q(Q,yt($,Q))??ee[0];if(!_)return Pe;const S=we();for(const me of new Set(ee.map(H=>H.ratio))){const[H=1,J=1]=me.split(":").map(Number);S.appendChild(M([me,H,J],me===_.ratio,`画面比例 ${me}`,()=>{const l=ee.filter(D=>D.ratio===me).reduce((D,he)=>Math.abs(he.short-_.short)<Math.abs(D.short-_.short)?he:D);$.params.resolution=l.value,s(W)}))}const ne=we(!0);for(const me of ee.filter(H=>H.ratio===_.ratio))ne.appendChild(Ne(`${me.width}×${me.height}`,me.value===_.value,"",()=>{$.params.resolution=me.value,s(W)}));return Pe.append(Se("画面比例"),S,Se("分辨率"),ne),Pe}if(Ie&&!F){const ee=y.createElement("input");ee.type="number";const _=Ie.min||512,S=Ie.max||1344,ne=Ie.step||32;ee.min=String(_),ee.max=String(S),ee.step=String(ne),ee.value=String(yt($,Ie)??""),ee.style.cssText="width:100%;padding:8px;font-size:14px;border:1px solid #3a3a44;border-radius:4px;background:#1a1a22;color:#fff";const me=()=>{const V=Number.parseInt(ee.value,10);Number.isNaN(V)||($.params.scale_to_length=Math.max(_,Math.min(S,V)),s(W))};ee.oninput=me;const H=we(!0);for(const V of fr){const l=rs[V];if(l===void 0)continue;const D=Ne(`${V}p`,Number(ee.value)===l,`16:9 素材约 ${V}p；最长边 ${l}px，实际短边随素材比例变化`,()=>{ee.value=String(l),me()});D.disabled=l<_||l>S,H.appendChild(D)}const J=y.createElement("div");return J.style.cssText="font-size:12px;color:#8a8a94;margin-top:4px",J.textContent=`档位按 16:9 素材标注，实际短边随素材比例变化。最长边范围：${_} ~ ${S}，步进 ${ne}`,Pe.append(Se("分辨率（最长边）"),H,ee,J),Pe}const He=!F&&_e,$e=()=>{const ee=Tn(Rr($.params.width)??_e?.default),_=Tn(yt($,ft(E,"height")));return ee&&_?Oe(ee,_):"3:4"};function qe(ee){const _=De(E,$)??P(E)[1];if(!_)return;const[,S,ne]=ee,me=E.outputType==="video"?On:16;$.params.width=S>=ne?Math.round(_.val*S/ne/me)*me:_.val,$.params.height=S>=ne?_.val:Math.round(_.val*ne/S/me)*me}if(F||He){const ee=F?yt($,F):ur($.params._ratio)||$e(),_=F?Z(ee):void 0,S=we();for(const ne of N){const me=!!He&&(ne[0]===ee||!$.params._ratio&&ne[0]===N.find(l=>Math.abs(Tn($.params.width)/Tn($.params.height)-l[1]/l[2])<.02)?.[0]),H=F?ne===_:me,J=G(ne),V=M(ne,H,`画面比例 ${ne[0]}`+(F&&J!==ee?`（工作流档位：${J}）`:"（当前）"),()=>{F?$.params.aspect_ratio=J:($.params._ratio=ne[0],qe(ne)),s(W)});F&&!H&&J===ee&&(V.className="near"),S.appendChild(V)}Pe.append(Se("画面比例"),S)}const Be=j?Rr($.params.aspect_ratio)??ft(E,"aspect_ratio")?.default??"16:9 (Widescreen)":null;if(j||_e){const ee=j?fr.flatMap(J=>{const V=is(Be,J);return V>(j.max??1.1)+.01?[]:[{id:`${J}p`,label:`${J}p`,val:V,p:J}]}):[...P(E)],_=we(!0),S=De(E,$),ne=as(E),me=Ya($,E),H=Oi($,E);for(const J of ee){const V=j?Ja(yt($,j)):S?.val,l=!me&&!H&&(j?Number.isFinite(V)&&Math.min(...mr(Be,Number(V)))===J.p:V!=null&&Math.abs(V-J.val)<40),D=N.find(z=>z[0]===($.params._ratio||"3:4"))??Ua,he=E.outputType==="video"?On:16,Te=j?mr(Be,J.val).join("×"):D[1]>=D[2]?`${Math.round(J.val*D[1]/D[2]/he)*he} × ${J.val}`:`${J.val} × ${Math.round(J.val*D[2]/D[1]/he)*he}`;_.appendChild(Ne(J.label,l,Te,()=>{if(ne&&($.params.output_1080p="off"),delete $.params.if_video_resolution,j)$.params.megapixels=J.val;else{$.params._clarity=J.id;let z=ur($.params._ratio);if(!z){z=$e();const le=Tn(Rr($.params.width)??_e?.default),K=Tn(yt($,ft(E,"height")));le&&K&&($.params._ratio=z)}qe(N.find(le=>le[0]===z)??Ua)}s(W)}))}if(ne){const J=Xo(yt($,ft(E,"aspect_ratio")),1080);_.appendChild(Ne("1080p",!!me,`${J.width}×${J.height}`,()=>{$.params.output_1080p="on",s(W)}))}if(E.execution==="if_studio"&&E.outputType==="video")for(const J of os){const V=Xo(yt($,ft(E,"aspect_ratio")),J.short);_.appendChild(Ne(J.id,H?.label===J.id,`${V.width}×${V.height}`,()=>{$.params.if_video_resolution=J.id,s(W)}))}if(Pe.append(Se("清晰度"),_),ne?.hint){const J=y.createElement("div");J.className="knobnote",J.textContent=ne.hint.replace("开启后","1080p 档位").replace("关闭保留原有行为。","其他清晰度档位保留原有行为。"),Pe.appendChild(J)}}return Pe}function ae($,E){if(!E)return null;if(E.imageControls){const ee=m.imageSettings($,E);return`${ee.ratio==="original"?"原图":ee.ratio} · ${ee.clarity}`}const W=ft(E,"aspect_ratio"),F=ft(E,"megapixels"),j=ft(E,"resolution"),Q=ft(E,"width"),_e=ft(E,"scale_to_length"),Ie=E.inputs.find(ee=>ee.presets&&ee.appearance!=="switch"),Pe=ft(E,"duration"),He=ft(E,"preview_seconds"),$e=E.outputType==="video"?ft(E,"sound"):void 0;if(!W&&!F&&!j&&!Q&&!_e&&!Ie&&!Pe&&!He&&!$e)return null;const qe=[];if(_e&&!W)return qe.push(`${yt($,_e)}px`),$e&&qe.push(yt($,$e)==="on"?"有声音":"无声音"),qe.join(" · ");if(j){const ee=q(j,yt($,j));ee&&qe.push(ee.ratio,`${ee.width}×${ee.height}`)}else if(W){const ee=yt($,W);qe.push(Z(ee)?.[0]??ur(ee).split(" ")[0]??"")}else Q&&$.params._ratio&&qe.push(ur($.params._ratio));const Be=Ya($,E);if(Be)qe.push("1080p",`${Be.width}×${Be.height}`);else if(F){const ee=Ja(yt($,F)),_=Rr($.params.aspect_ratio)??W?.default??"16:9 (Widescreen)",S=Number.isFinite(ee)?Math.min(...mr(_,ee)):null;qe.push(Oi($,E)?.label??(S?`${S}p`:"?"))}else if(Q){const ee=De(E,$);ee&&qe.push(ee.label)}if(Ie){const ee=yt($,Ie),_=Ie.options?.find(ne=>(ne&&typeof ne=="object"?ne.value:ne)===ee),S=_&&typeof _=="object"?_.label:ur(_);S&&qe.unshift(S.replace(/（.*$/,""))}if(Pe&&qe.push(`${yt($,Pe)}秒${He?"/段":""}`),He){const ee=yt($,He);Tn(ee)>0&&qe.push(`试前${ee}秒`)}return $e&&qe.push(yt($,$e)==="on"?"有声音":"无声音"),qe.join(" · ")}function ue($,E){const W=$.cap!==E;W&&delete $.params.output_1080p,m.switchImageCapability($,E),W&&delete $.params.output_1080p}return{clarityPicker:A,paramsBrief:ae,switchImageCapability:ue}}const dd="_notice_ur2qb_1",pd="_readonly_ur2qb_9",Va={notice:dd,readonly:pd},Ai="[data-readonly-view], summary, .slinks .nm, a[href]",ss='textarea, input:not([type="range"]):not([type="file"])';function Ka(m,y){if(m.classList.toggle(Va.readonly,y),m.dataset.readonly=String(y),!y){m.querySelector("[data-readonly-notice]")?.remove();return}if(!m.querySelector("[data-readonly-notice]")){const C=m.ownerDocument.createElement("div");C.dataset.readonlyNotice="",C.className=Va.notice,C.textContent="只读 · 可查看参数，不能修改或运行",m.prepend(C)}for(const C of m.querySelectorAll(ss))C.readOnly=!0,C.setAttribute("aria-readonly","true");for(const C of m.querySelectorAll('button, select, input[type="range"], input[type="file"]'))C.matches(Ai)||(C.disabled=!0);for(const C of m.querySelectorAll("[contenteditable]"))C.contentEditable="false";for(const C of m.querySelectorAll('[draggable="true"]'))C.draggable=!1}function cd(m){const y=m.target;return y instanceof Element?["beforeinput","input","change","paste","drop","dragover","contextmenu"].includes(m.type)?!0:m instanceof KeyboardEvent?y.closest(Ai)?!1:["Backspace","Delete","Enter"," "].includes(m.key)||(m.ctrlKey||m.metaKey)&&["v","x","z","y"].includes(m.key.toLowerCase()):y.closest(ss)?!1:y.closest(".slot.filled")?m.type!=="click":!y.closest(Ai):!1}const Uo=m=>m instanceof Ha?m:new Ha(Or(m),m&&typeof m=="object"&&"status"in m&&typeof m.status=="number"?m.status:0,m);function ud(m){const y=m.setTimeout||globalThis.setTimeout,C=m.clearTimeout||(F=>{F!==null&&globalThis.clearTimeout(F)});let N=null,T=null,R=!1,q=0,s=0,P=0,G=null,Z=null;const Oe=new Set;let De=Promise.resolve(),Se=Promise.resolve();function we(F){Oe.add(F);const j=()=>{Oe.delete(F),m.flushPendingProjectSync()};return F.then(j,Q=>{Z=Uo(Q),j()}),F}function Ne(){if(m.nodeEditor||!m.isAuthenticated()||!m.getProject())return;C(T);const F=m.getProject()?.id;F&&(T=y(()=>{T=null;const j=m.getView(),Q={x:j.x,y:j.y,k:j.k};Se=Se.then(async()=>{if(m.isAuthenticated())try{await m.jput(`/api/projects/${encodeURIComponent(F)}/view`,Q)}catch(_e){m.getProject()?.id===F&&m.showError("视图保存失败："+Or(_e))}})},400))}function M(F=!0){F&&m.recordCanvasEdit();const j=m.getProject();if(!m.canSave()||!j||j.locked)return;C(N);const Q=j.id;N=y(()=>{N=null,A(Q)},700)}function A(F=m.getProject()?.id){s++;const j=De.catch(()=>{}).then(()=>ue(F)).finally(()=>{s--,m.flushPendingProjectSync()});return De=j,j}async function ae(F,j){const Q=await m.api(`/api/projects/${encodeURIComponent(F)}`);if(m.getProject()?.id!==F||Q.rev!==j.rev)return null;const _e=new Set(Q.cards.map($e=>$e.id)),Ie=j.cards.filter($e=>$e&&typeof $e=="object"&&!Array.isArray($e)&&!_e.has(String($e.id)));if(!Ie.length)return null;let Pe=Q;for(const $e of Ie){const qe=await m.jpost(`/api/projects/${encodeURIComponent(F)}/cards`,{card:$e,rev:Pe.rev}),Be=m.getProject();if(Be?.id!==F)throw new Error("恢复节点期间画布已切换");if(Pe=qe.project,$e&&typeof $e=="object"&&!Array.isArray($e)){const ee=qe.card||Pe.cards.find(S=>S.id===$e.id),_=Be.cards.find(S=>S.id===$e.id);if(ee&&_)for(const S of["created_by","created_by_name","created_at"])ee[S]!==void 0&&(_[S]=ee[S],$e[S]=ee[S])}}j.rev=Pe.rev;const He=m.getProject();if(He?.id!==F)throw new Error("恢复节点期间画布已切换");return He.rev=Math.max(He.rev,j.rev),m.jput(`/api/projects/${encodeURIComponent(F)}`,j)}async function ue(F=m.getProject()?.id){const j=m.getProject();if(!m.canSave()||!j||j.id!==F)return{ok:!1,error:new Error("画布不可保存或已切换")};if(m.nodeEditor&&!m.editorCard())return{ok:!1,error:new Error("此节点已删除或不可访问")};if(m.nodeEditor&&G?.status===409)return{ok:!1,error:G};const Q=j.id,_e={rev:j.rev||0,name:j.name,cards:j.cards.map(m.plain),edges:j.edges,groups:j.groups||[]};R=!0;try{const Ie=await m.jput(`/api/projects/${encodeURIComponent(Q)}`,_e),Pe=m.getProject();return Pe?.id!==Q?{ok:!1,error:new Error("保存期间画布已切换")}:(Pe.rev=Math.max(Pe.rev||0,Ie.rev||0),G=null,{ok:!0})}catch(Ie){let Pe=Uo(Ie);if(Pe.status===409&&m.getProject()?.id===Q&&!m.nodeEditor&&!P)try{const He=await ae(Q,_e);if(He){const $e=m.getProject();return $e?.id!==Q?{ok:!1,error:new Error("保存期间画布已切换")}:($e.rev=Math.max($e.rev||0,He.rev||0),G=null,{ok:!0})}}catch(He){Pe=Uo(He)}return m.getProject()?.id===Q&&(G=Pe),Pe.status===409&&m.getProject()?.id===Q&&!m.nodeEditor&&!P?(m.toast("画布在别处被改过，已重新加载"),await m.openProject(Q)):m.showError("保存失败："+Pe.message),{ok:!1,error:Pe}}finally{R=!1,m.flushPendingProjectSync()}}async function $(F=m.getProject()?.id,j=!1){P++;try{for(m.flushFocusedControl();;){const Q=De;if(await Q,await Promise.all([...Oe]),m.getProject()?.id!==F)throw new Error("画布已关闭或切换");if(Z)throw Z;if(G&&[403,404,409].includes(G.status))throw G;if(Q!==De||Oe.size||q)continue;if(!m.canSave()){if(j&&!G&&!s&&N===null)return;throw new Error("此画布只读或已锁定，不能保存")}if(m.nodeEditor&&!m.editorCard())throw new Error("此节点已删除，不能保存或重新创建");C(N),N=null;const _e=await A(F);if(!_e.ok)throw _e.error;if(Z)throw Z;if(!Oe.size&&!q&&!s&&N===null)return}}catch(Q){throw Q===Z&&(Z=null),Q}finally{P--,m.flushPendingProjectSync()}}function E(){C(N),N=null}function W(F){q++;const j=De.catch(()=>{}).then(F).finally(()=>{q--,m.flushPendingProjectSync()});return De=j,j}return{saveView:Ne,save:M,enqueueSave:A,flushLocalChanges:$,trackNodeWork:we,enqueueCardCreate:W,cancelContentSave:E,cancelTimers(){E(),C(T),T=null},resetFailures(){G=null,Z=null},markWorkFailure(F){Z=Uo(F)},beginFlush(){P++},endFlush(){P--,m.flushPendingProjectSync()},get pendingChain(){return De},get busy(){return N!==null||R||s>0||q>0||Oe.size>0||P>0||!!(m.nodeEditor&&G)},get status(){return Object.freeze({contentSaving:R,pendingCardCreates:q,pendingContentSaves:s,localFlushes:P,pendingNodeWork:Oe.size,saveScheduled:N!==null,saveFailure:G,workFailure:Z})}}}const fd={create:ud};function ls(m){let y=m;const C=new Set;return{getSnapshot:()=>y,subscribe:N=>(C.add(N),()=>{C.delete(N)}),set:N=>{y=N,C.forEach(T=>T())}}}const Ga=()=>({enabled:!1,initialized:!1,loading:!1,hasMore:!1,total:0,error:null,blocked:!1});function md(m,y){let C=Ga(),N=new Map;const T=new Set;let R=null,q=0,s=null,P=-1/0,G="refresh";function Z(){q++,s=null,N.clear(),T.clear(),R=null,P=-1/0,C=Ga()}function Oe(){const Se=m?.isAdmin()===!0;return!Se&&C.enabled?(Z(),y()):Se&&!C.enabled&&(C={...C,enabled:!0}),Se&&!C.blocked}function De(Se,we=!1){if(!Oe()||!m)return Promise.resolve();if(s)return s;if(Se==="older"&&(!C.initialized||!C.hasMore||!R))return Promise.resolve();const Ne=(m.now??Date.now)();if(Se==="refresh"&&!we&&Ne-P<5e3)return Promise.resolve();const M=q,A=Se==="older"?R:null;Se==="refresh"&&(P=Ne),C={...C,loading:!0,error:null};const ae=Promise.resolve().then(()=>M!==q||!m.isAdmin()?null:m.list({limit:50,status:"all",...A===null?{}:{cursor:A}})).then(ue=>{if(M===q&&!(!Oe()||!ue)){if(Se==="older"&&ue.next_cursor===A)throw new Error("历史分页游标未前进，请重试");N=new Map(N);for(const $ of ue.jobs)T.has($.id)||N.set($.id,$);(!C.initialized||Se==="older"||R===null)&&(R=ue.next_cursor),C={...C,initialized:!0,total:ue.total,hasMore:R!==null}}}).catch(ue=>{if(M!==q||!Oe())return;G=Se;const $=typeof ue=="object"&&ue!==null&&"status"in ue&&(ue.status===401||ue.status===403);$&&(N.clear(),R=null),C={...C,error:Or(ue),blocked:$,...$?{total:0,hasMore:!1,initialized:!1}:{}}}).finally(()=>{M!==q||s!==ae||(s=null,C={...C,loading:!1},y())});return s=ae,y(),ae}return{getSnapshot:()=>C,getJobs:()=>[...N.values()],synchronizeAccess:Oe,refresh:()=>De("refresh"),loadMore:()=>De("older"),retry:()=>De(G,!0),reset:Z,forgetTask(Se){T.add(Se),N.delete(Se)},forgetLive(Se){for(const we of Se)N.get(we)?.history_only||N.delete(we)},renameProject(Se,we){N=new Map([...N].map(([Ne,M])=>[Ne,M.project===Se?{...M,projectName:we}:M]))}}}function hd(m){const y=ls([]);let C=null,N=0,T=0,R=[],q=!1;const s=new Set,P=md(m.history,Z);function G(M,A){return(A.created??0)-(M.created??0)||(M.id<A.id?1:M.id>A.id?-1:0)}function Z(){const M=P.getJobs(),A=new Set(R.map(W=>W.id)),ae=new Map(M.filter(W=>W.history_only||!q||A.has(W.id)).map(W=>[W.id,W])),ue=P.getSnapshot(),$=[...M].sort(G).at(-1);for(const W of R)(!ue.enabled||Ti(W)||s.has(W.id)||ae.has(W.id)||ue.initialized&&$&&G(W,$)<=0)&&ae.set(W.id,W);const E=[...ae.values()];ue.enabled&&E.sort(G),y.set(E),m.onChange()}function Oe(M){const A=M.filter($=>!$.history_only),ae=new Set(A.map($=>$.id)),ue=new Set(R.map($=>$.id));for(const $ of s)ae.has($)||s.delete($);for(const $ of A)(Ti($)||q&&!ue.has($.id))&&s.add($.id);P.forgetLive(R.filter($=>!ae.has($.id)).map($=>$.id)),R=A,q=!0,Z()}function De(){T++,C=null}function Se(){if(P.refresh(),C)return C;const M=N,A=T,ae=(async()=>{let ue;try{ue=await m.list()}catch{return}M!==N||A!==T||(Oe(ue),!(M!==N||A!==T)&&await m.onJobsChanged(ue.filter($=>!$.history_only)))})().finally(()=>{C===ae&&(C=null)});return C=ae,ae}async function we(M){if(M=y.getSnapshot().find(E=>E.id===M.id)??M,M.history_only||!m.canTask(M))return;const A=N,ae=await m.remove(M);if(A!==N)return;const ue=Wa.parse(ae);De();const $=y.getSnapshot().find(E=>E.id===M.id)??M;ue.ok===!0&&!ue.pending&&!$.history_only&&m.canTask($)&&(P.forgetTask(M.id),await m.onTaskDeleted?.(M)),A===N&&Se()}async function Ne(){const M=R.filter($=>!Ti($)&&m.canTask($));if(!m.clear||!M.length)return;const A=N,ae=await m.clear();if(A!==N)return;const ue=Wa.parse(ae);if(ue.ok===!0&&!ue.pending)for(const $ of M)P.forgetTask($.id);De(),Se()}return{...y,setJobs:Oe,pollJobs:Se,deleteTask:we,clearDoneTasks:Ne,getLiveSnapshot:()=>R,getHistorySnapshot:P.getSnapshot,refreshHistory:P.refresh,loadMoreHistory:P.loadMore,retryHistory:P.retry,reset(){N++,De(),P.reset(),Oe([]),q=!1},retainProjects(M){N++,De(),P.reset(),Oe(R.filter(A=>A.project&&M.includes(A.project))),q=!1},renameProject(M,A){P.renameProject(M,A),Oe(R.map(ae=>ae.project===M?{...ae,projectName:A}:ae))}}}function gd(m){return async function(C,{deleted:N=!1}={}){const T=m.getProject();if(!T||!m.canOperate())return;const R=T.cards.filter(s=>s.job&&!m.isIF(s)&&(s.status==="queued"||s.status==="running"||s.status==="canceled")).map(s=>({card:s,job:s.job,status:s.status}));let q=!1;for(const{card:s,job:P,status:G}of R){if(m.getProject()!==T||!m.canOperate())return;if(!T.cards.includes(s)||s.job!==P||s.status!==G)continue;const Z=C.find(Oe=>Oe.id===P);if(Z&&!(!m.canTask(Z)||Z.project&&Z.project!==T.id||Z.card&&Z.card!==s.id)){if(N){s.status="canceled",s.step="",s.job=null,m.paint(s),q=!0,m.refreshPanel(s);continue}s.status=Z.status,s.progress=Z.progress,s.error=Z.error,s.queue_remaining=Z.queue_remaining,s.queue_ahead=Z.queue_ahead,s.queue_order=Z.queue_order,s.queue_wait_seconds=Z.queue_wait_seconds,s.step=Z.step||"",Z.seed!=null&&(s.seed=Z.seed),Z.started&&Z.ended&&(s.ms=Math.round((Z.ended-Z.started)*1e3)),Z.outputs?.length&&(s.outputs=Z.outputs),m.paint(s),G!==s.status&&(q=!0,m.refreshPanel(s),s.status==="done"&&(m.pushHistory(s,Z),m.refreshHistory(s),await m.propagateCardOutputs(s)),s.status==="error"&&m.showError(`「${m.titleOf(s)}」生成失败：${s.error||"未知错误"}`))}}q&&m.getProject()===T&&m.canOperate()&&m.save(!1)}}function bd(m){return async y=>{if(!Number.isInteger(y.limit)||y.limit<1)throw new Error("无效分页大小");const C=new URLSearchParams({limit:String(y.limit),status:y.status});return y.cursor!==void 0&&C.set("cursor",y.cursor),Jl.parse(await m(`/api/jobs/history?${C}`))}}function xd({document:m,panel:y,button:C,getViewport:N,getUser:T,canTask:R,api:q,jpost:s,jobProjName:P,fmtEla:G,histTime:Z,toast:Oe,showError:De,confirm:Se,onFocusTask:we,onJobsChanged:Ne,onTaskDeleted:M=()=>{}}){const A=hd({list:async()=>Xl.parse(await q("/api/jobs")).jobs,remove:_=>q(`/api/job/${_.id}`,{method:"DELETE"}),clear:()=>s("/api/jobs/clear"),canTask:R,history:{list:bd(q),isAdmin:()=>T()?.role==="admin"},onChange(){W(),y.style.display!=="none"&&Ie()},onJobsChanged:Ne,onTaskDeleted:M}),ae=A.pollJobs,ue={queued:"等待中",running:"运行中",done:"已完成",error:"失败",canceled:"已取消"},$=_=>_.status==="queued"||_.status==="running",E=_=>_.status==="running"?"run":_.status==="queued"?"wait":_.status==="done"?"done":_.status==="error"?"bad":"gone";function W(){const _=A.getLiveSnapshot().filter($),S=_.find(J=>J.status==="running"),ne=C,me=`${_.length}|${S?Math.round((S.progress||0)*100):-1}`;if(ne._sig===me)return;ne._sig=me,ne.classList.toggle("run",!!S),ne.classList.toggle("wait",!S&&_.length>0),ne.innerHTML=`任务<span class="n">(${_.length})</span>`;const H=S?`运行中 ${Math.round((S.progress||0)*100)}%`:_.length?"等待中":"";if(H){const J=m.createElement("span");J.className="s",J.textContent=H,ne.appendChild(J)}ne.title=_.length?`${_.length} 个任务没跑完，点开可以看详情、停止或删除`:"现在没有任务在跑，点开看历史"}function F(){y.style.display==="none"?(y.style.display="",C.classList.add("open"),Ie(),Q(),ae()):j()}function j(){y.style.display="none",y.innerHTML="",y._sig=null,C.classList.remove("open")}function Q(){if(y.style.display==="none")return;const _=8,S=C.getBoundingClientRect();y.style.maxHeight=N().height-S.bottom-_*2+"px";const ne=y.offsetWidth;y.style.top=S.bottom+_+"px",y.style.left=Math.max(_,Math.min(S.right-ne,N().width-ne-_))+"px"}const _e=()=>JSON.stringify([A.getHistorySnapshot(),A.getSnapshot().map(_=>[_.id,_.status,!!_.error,_.history_only,_.permission,P(_),_.cardName,_.name,_.submitter_display_name,_.submitter_username])]);function Ie(){const _=_e();if(y._sig===_){for(const he of y.querySelectorAll(".jrow")){const Te=A.getSnapshot().find(z=>z.id===he._id);Te&&He(he,Te)}return}y._sig=_;const S=y.querySelector(".jlist"),ne=S?S.scrollTop:0;y.innerHTML="";const me=m.createElement("div");me.className="jhd";const H=m.createElement("b"),J=A.getLiveSnapshot().filter($).length;if(H.textContent=J?`任务 · ${J} 个没跑完`:"任务",me.appendChild(H),A.getSnapshot().some(he=>!he.history_only&&!$(he))){const he=m.createElement("button");he.className="lnk",he.textContent="清空已结束",he.title="只清列表里的记录，已经出好的产物还在节点上",he.onclick=ee,me.appendChild(he)}const V=m.createElement("button");V.className="x",V.textContent="✕",V.title="关闭",V.onclick=j,me.appendChild(V);const l=m.createElement("div");if(l.className="jlist",!A.getSnapshot().length){const he=m.createElement("div");he.className="jempty",he.textContent="还没有任务。在节点上点「生成」，任务就会出现在这里。",l.appendChild(he)}for(const he of A.getSnapshot())l.appendChild(Pe(he));const D=A.getHistorySnapshot();if(D.enabled){const he=m.createElement("div");if(he.className="jhistory",he.setAttribute("role","status"),he.setAttribute("aria-live","polite"),he.textContent=D.loading?"正在加载任务历史…":D.error?`任务历史加载失败：${D.error}`:`已显示 ${A.getSnapshot().length} 条任务 · 历史共 ${D.total} 条${D.hasMore?"":" · 已加载全部历史"}`,l.appendChild(he),!D.blocked&&(D.hasMore||D.error||D.loading)){const Te=$e(D.error?"重试加载任务历史":"加载更早任务",()=>D.error?A.retryHistory():A.loadMoreHistory());Te.className="jmore",Te.disabled=D.loading,l.appendChild(Te)}l.onscroll=()=>{const Te=A.getHistorySnapshot();!Te.loading&&!Te.error&&Te.hasMore&&l.scrollHeight-l.scrollTop-l.clientHeight<=120&&A.loadMoreHistory()}}y.append(me,l),l.scrollTop=ne}function Pe(_){const S=m.createElement("div");S.className="jrow "+E(_),S._id=_.id;const ne=T()?.role==="admin"?_.submitter_display_name?.trim()||_.submitter_username||"未记录提交人":"";if(ne){const z=m.createElement("div");z.className="jowner",z.textContent=ne,S.append(z)}const me=m.createElement("div");me.className="r1";const H=m.createElement("span");H.className="nm";const J=_.cardName||_.name||_.id,V=P(_);if(V){const z=m.createElement("i");z.className="pj",z.textContent=V+" - ",H.appendChild(z)}const l=m.createElement("span");l.className="cn",l.textContent=J,H.appendChild(l),H.title=(ne?`${ne} - `:"")+(V?`${V} - `:"")+(_.name&&J!==_.name?`${J}（${_.name}）`:J),S._st=m.createElement("span"),S._st.className="st",me.append(H,S._st);const D=m.createElement("div");D.className="r2",S._sp=m.createElement("span"),S._sp.className="sp",S._tm=m.createElement("span"),D.append(S._sp,S._tm);const he=m.createElement("div");if(he.className="r3",S._node=m.createElement("span"),S._node.className="node",S._step=m.createElement("span"),S._step.className="step",he.append(S._node,S._step),S.append(me,D,he),$(_)&&(!_.history_only||_.progress!=null)){const z=m.createElement("div");z.className="bar",S._bar=m.createElement("i"),z.appendChild(S._bar),S.appendChild(z)}if(_.error){const z=m.createElement("div");z.className="msg",z.textContent=_.error,S.appendChild(z)}const Te=m.createElement("div");return Te.className="acts",_.history_only||($(_)&&Te.appendChild($e("停止",()=>qe(_))),Te.appendChild($e("删除",()=>Be(_),!0))),_.project&&_.card&&Te.appendChild($e("看节点",()=>we(_))),S.appendChild(Te),He(S,_),S}function He(_,S){const ne=Math.round((S.progress||0)*100);_._st.textContent=S.status==="running"?S.progress==null?"运行中":`运行中 ${ne}%`:S.status==="queued"?Qa(S):ue[S.status]||S.status,_._st.title=S.status==="queued"&&S.queue_order||"";const me=[S.name,S.modelName||S.capability].filter(Boolean).join(" · ");_._sp.textContent!==me&&(_._sp.textContent=_._sp.title=me);const H=`执行节点：${S.nodeName||(S.history_only?"未记录":"等待分配")}`;_._node.textContent!==H&&(_._node.textContent=_._node.title=H);const J=S.step?`当前：${S.step}`:"";_._step.textContent!==J&&(_._step.textContent=_._step.title=J);const V=S.started?G(((S.ended||Date.now()/1e3)-S.started)*1e3):"";_._tm.textContent=(S.created==null?"":Z(S.created*1e3))+(V?` · ${V}`:""),_._bar&&(_._bar.style.width=ne+"%")}function $e(_,S,ne){const me=m.createElement("button");return ne&&(me.className="danger"),me.textContent=_,me.onclick=S,me}async function qe(_){if(_=A.getSnapshot().find(S=>S.id===_.id)||_,_.history_only||!R(_))return Oe("此任务关联的画布为只读，不能停止");try{await s(`/api/job/${_.id}/cancel`)}catch(S){return De(S.message)}ae()}async function Be(_){if(_=A.getSnapshot().find(S=>S.id===_.id)||_,_.history_only||!R(_))return Oe("此任务关联的画布为只读，不能删除");if(!($(_)&&!Se("这个任务还没跑完，删除会先把它停掉。继续？")))try{await A.deleteTask(_)}catch(S){return De(S.message)}}async function ee(){if(A.getSnapshot().some(_=>!_.history_only&&!$(_)))try{await A.clearDoneTasks()}catch(_){return De(_.message)}}return{pollJobs:ae,paintJobsBtn:W,toggleJobs:F,closeJobs:j,placeJobs:Q,renderJobs:Ie,stopTask:qe,delTask:Be,clearDoneJobs:ee,getJobs:A.getSnapshot,reset:A.reset,retainProjects:A.retainProjects,renameProject:A.renameProject}}const yd={create:xd,createCanvasUpdater:gd};function wd(m,y,C,N,T,R){const{window:q,document:s,addEventListener:P,setTimeout:G,clearTimeout:Z,setInterval:Oe,clearInterval:De,requestAnimationFrame:Se,cancelAnimationFrame:we,ResizeObserver:Ne,MutationObserver:M,IntersectionObserver:A,URL:ae}=m,ue=T.mediaFetch,$=T.WebSocket,E=fd,W=yd,F=id;q.ChoukaImageComposer=R;const j=(e,t=s)=>t.querySelector(e),Q=268,_e=180,Ie=900,Pe=90,He=900,$e=.1,qe=5,Be=e=>e.w||Q,ee="http://www.w3.org/2000/svg",_=new URLSearchParams(location.search),S=_.get("editor")==="1",ne=_.get("project"),me=_.get("card");S&&s.body.classList.add("node-editor"),s.addEventListener("contextmenu",e=>e.preventDefault());let H=[],J={},V={},l=null,D=[],he=[],Te="personal",z={x:60,y:70,k:1},le=null,K=new Set,Et=null,st=null,Sn=null,un=null,St=new Map,Zt=-1,Ft=null,An=null,Ct=0,Dt=null,Tt=!1;const h={side:j("#side"),plist:j("#plist"),dot:j("#dot"),spaceSelect:j("#space-select"),spaceLabel:j("#space-label"),spaceStatus:j("#space-status"),ptitle:j("#ptitle"),hint:j("#hint"),fit:j("#fit"),presenceUsers:j("#presence-users"),stage:j("#stage"),world:j("#world"),wires:j("#wires"),groups:j("#groups"),presenceLayer:j("#presence-layer"),lasso:j("#lasso"),selbar:j("#selbar"),dock:j("#dock"),empty:j("#empty"),panel:j("#panel"),hist:j("#hist"),menu:j("#menu"),tip:j("#tip"),toast:j("#toast"),picker:j("#picker"),jobsbtn:j("#jobsbtn"),jobs:j("#jobs"),view:j("#view"),vbox:j("#view .vbox"),respop:j("#respop"),minimapBtn:j("#minimap-btn"),wiresToggle:j("#wires-toggle"),zoomMenu:j("#zoom-menu"),minimap:j("#minimap"),minimapCanvas:j("#minimap-canvas"),minimapViewport:j("#minimap-viewport"),zoomPercent:j("#zoom-percent")},Ke=E.create({setTimeout:G,clearTimeout:Z,getProject:()=>l,getView:()=>z,isAuthenticated:()=>y.active,canSave:()=>on(),nodeEditor:S,editorCard:()=>Ur(),plain:e=>wo(e),api:(...e)=>$t(...e),jpost:(...e)=>jt(...e),jput:(...e)=>Ar(...e),recordCanvasEdit:()=>Co(),flushPendingProjectSync:()=>oi(),openProject:e=>kr(e),toast:e=>ce(e),showError:e=>be(e),flushFocusedControl:()=>{s.activeElement?.closest?.("#panel, #respop")&&s.activeElement.blur()}}),{saveView:Qt,save:oe,enqueueSave:hr,flushLocalChanges:Vn,trackNodeWork:X}=Ke,Ue=W.createCanvasUpdater({getProject:()=>l,canOperate:()=>ge(),isIF:e=>Ye(e),canTask:e=>gr(e),paint:e=>rt(e),refreshPanel:e=>{h.panel._id===e.id&&je(e.id)},pushHistory:(e,t)=>zr(e,t),refreshHistory:e=>{h.hist._id===e.id&&Pr(e.id)},propagateCardOutputs:e=>qa(e),titleOf:e=>ve(e),showError:e=>be(e),save:e=>oe(e)}),lt=W.create({document:s,panel:h.jobs,button:h.jobsbtn,getViewport:()=>({width:innerWidth,height:innerHeight}),getUser:()=>y.user,canTask:e=>gr(e),api:(...e)=>$t(...e),jpost:(...e)=>jt(...e),jobProjName:e=>Bl(e),fmtEla:e=>pr(e),histTime:e=>ji(e),toast:e=>ce(e),showError:e=>be(e),confirm:e=>confirm(e),onFocusTask:e=>Ba(e),onJobsChanged:e=>Ue(e),onTaskDeleted:e=>Ue([e],{deleted:!0})}),{pollJobs:ct,paintJobsBtn:fn,toggleJobs:Kn,closeJobs:$n,placeJobs:Rt,renderJobs:jn}=lt,ge=(e=l)=>y.active&&e?.permission==="operate",on=()=>ge()&&!l.locked,gr=e=>y.active&&e?.permission==="operate",Ge=()=>ge()?!0:(ce("此画布只读，不能修改或运行"),!1),an=()=>{if(!l?.id)throw new Error("请先打开可操作画布");return`/api/upload?project=${encodeURIComponent(l.id)}`},Yt=async(e,t=!1)=>{if(!Ge())throw new Error("此画布只读");const n=l,r=new FormData;r.append("file",e,e.name);const o=an()+(t?"&local_only=1":""),i=await $t(o,{method:"POST",body:r});if(l!==n||!ge())throw new Error("画布已切换或权限已变化，上传已取消");const a=i.files?.[0]||i;if(!a?.url||!a?.ref)throw new Error("上传接口未返回素材");return a};async function $t(e,t={}){const n=(t.method||"GET").toUpperCase();if(!["GET","HEAD"].includes(n)){const r=new ae(e,location.href);if(/^\/api\/(upload|generate|text|rewrite)$/.test(r.pathname)&&!ge())throw new Error("此画布只读");const o=r.pathname.match(/^\/api\/projects\/([^/]+)(?:\/(rename|copy))?$/);if(o){const i=D.find(a=>a.id===decodeURIComponent(o[1]))||(l?.id===decodeURIComponent(o[1])?l:null);if(!ge(i)||i.locked&&o[2]!=="copy")throw new Error("此画布不可修改")}}return T.request(e,t)}function Vt(){Ke.cancelTimers(),Eo(),l=null,le=null,K.clear(),Dt=null,ti(),rn(),Yn(),Kr(),kn(),$n(),Pn(),h.groups.replaceChildren(),h.selbar.style.display="none",zs(),S&&_r()}function br(){if(s.body.classList.toggle("project-readonly",!!l&&!ge()),ge()||(Ke.cancelContentSave(),kn(),Pn()),h.dock.style.display=ge()?"":"none",h.panel._id&&h.panel.dataset.readonly!==String(!ge())&&je(h.panel._id),l){h.ptitle.textContent=l.name;const e=s.createElement("span");e.className="ro",e.textContent=ge()?l.locked?"试玩画布 · 刷新还原":"":"只读",h.ptitle.append(e)}}q.addEventListener("h3auth:expired",()=>{Jn=null,lt.reset(),D=[],Vt(),yo()});let en=!1;q.addEventListener("h3auth:denied",async({detail:e})=>{if(!(en||!y.active||!/^\/api\/(projects|job|upload|generate|text|rewrite|media|thumbnail)/.test(e.path))){en=!0,l&&e.path!=="/api/thumbnail"&&(l.permission="read",br());try{await vr(),await ct()}finally{en=!1}}});const jt=(e,t)=>$t(e,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t||{})}),Ar=(e,t)=>$t(e,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}),be=e=>C.error(e);let sn=null;function ce(e){h.toast.textContent=e,h.toast.style.display="block",Z(sn),sn=G(()=>h.toast.style.display="none",Math.min(2600+Math.max(0,String(e).length-20)*70,9e3))}const qt=()=>Math.random().toString(36).slice(2,10),Kt=e=>H.find(t=>t.id===e)||H[0],wt=["image","audio","video"],Je={image:"图片",video:"视频",audio:"音频"},mn=(e,t)=>e.id===t||!!(e.ladder&&Object.values(e.ladder).includes(t))||!!(e.route&&Object.values(e.route).some(n=>n.cap===t))||!!(e.modelSwitch&&Object.values(e.modelSwitch).includes(t)),Nt=(e,t)=>e?t&&e.modelSwitch&&e.modelSwitch[t]?e.modelSwitch[t]:e.route?e.route[Object.keys(e.route)[0]].cap:e.id:null,_t=e=>{const t=H.find(n=>n.id===e.type);return t&&t.modes.some(n=>mn(n,e.cap))?t:H.find(n=>n.modes.some(r=>mn(r,e.cap)))||Kt(e.type)},Bt=e=>{const t=_t(e);return t&&t.modes.find(n=>mn(n,e.cap))},Mt=e=>Object.entries((Bt(e)||{}).modelSwitch||{}).find(([,t])=>t===e.cap)?.[0],yn={zimage:"Z-Image",krea2:"Krea2",qwen2511:"Qwen Image Edit 2511",qwen2512:"Qwen Image 2512（双阶段）",qwen21:"Qwen Image 2.1",da3:"Depth Anything 3",depthcrafter:"DepthCrafter"},Gn=T.localBridge.baseURL;let mt=[],Nn=null,Fn=!1,Zn="",fo=!1,Fr=!1;const Ye=e=>ke(e)?.execution==="if_studio";async function ln(e,t={}){return T.localBridge.request(e,t)}function Dr(e){switch(e.quota_status){case"limited":return`剩余 ${e.remaining} 次免费`;case"exhausted":return"剩余 0 次 · 免费次数已用完";case"unavailable":return"剩余 0 次 · 未开通";case"free":return"免费使用";case"paid":return"已开通 · 按预算使用";default:return e.quota_status?"次数未知":"次数未知 · 请更新桥接器"}}function hn(e=!0){return Nn||(Fn=!0,Nn=(async()=>{const t=await ln("/status");if(!t.ready)throw new Error("请先在本机登录 IF CLI");return fo=t.reference_reuse===!0,Fr=t.request_recovery===!0,mt=(await ln("/models")).models,Zn="",mt})().catch(t=>{throw Zn=t.message,t}).finally(()=>{Nn=null,e&&h.panel._id&&je(h.panel._id)}),Nn)}function Dn(e,t){const n="chouka:if-references:v1:"+JSON.stringify([y.user?.id,t,e.id]);if(e._ifReferences?.key===n)return e._ifReferences;let r;try{r=JSON.parse(sessionStorage.getItem(n))}catch{}const o={key:n,entries:Array.isArray(r?.entries)?r.entries.slice(0,40):[],pending:Array.isArray(r?.pending)?r.pending.slice(0,40):[],job:r?.job||null};return e._ifReferences=o,o}function Qn(e){try{sessionStorage.setItem(e.key,JSON.stringify({entries:e.entries,pending:e.pending,job:e.job}))}catch{}}function dn(e){try{const n=new ae(e?.canvas_url);if(n.origin==="https://ifs.alibaba-inc.com"&&!n.username&&!n.password&&n.pathname==="/"&&/^#\/canvas\/c_[A-Za-z0-9_-]+$/.test(n.hash))return n.href}catch{}const t=e?.canvas_id;return typeof t=="string"&&/^c_[A-Za-z0-9_-]+$/.test(t)?`https://ifs.alibaba-inc.com/#/canvas/${t}`:""}function er(e){if(!Ye(e)||e.status!=="error")return null;const t=dn({canvas_url:e.if_canvas_url});if(!t)return null;const n=s.createElement("a");n.className="if-canvas-link",n.textContent="打开 IF 画布",n.href=t,n.target="_blank",n.rel="noopener noreferrer",n.title="在新标签页查看 IF 生成失败原因";for(const r of["pointerdown","mousedown","click","dblclick"])n.addEventListener(r,o=>o.stopPropagation());return n}function qr(e){if(!Ye(e)||e.status!=="error"||!(e.job||e.if_request_id)||!ge())return null;const t=s.createElement("button");t.type="button",t.className="if-recover-button",t.textContent=e._ifRestoring?"正在查询原产物…":"查询原产物",t.disabled=!!e._ifRestoring,t.title="由发起人在原电脑查询原任务，不会重新提交生成";for(const n of["pointerdown","mousedown","dblclick"])t.addEventListener(n,r=>r.stopPropagation());return t.onclick=n=>{n.stopPropagation(),xr(e)},t}async function xr(e){const t=l;if(!t||!t.cards.includes(e)||!ge()||!Ye(e)||e.status!=="error"||!(e.job||e.if_request_id)||e._ifRestoring||e._ifPolling||!confirm(`请由任务发起人在原电脑操作。
只查询本机桥接器中的原任务并取回产物，不会重新生成。
若桥接器已重启，原记录可能无法恢复。继续查询？`))return;const n={cap:e.cap,job:e.job,request:e.if_request_id,started:e.if_started},r=()=>l===t&&t.cards.includes(e)&&ge()&&e.status==="error"&&e.cap===n.cap&&e.job===n.job&&e.if_request_id===n.request&&e.if_started===n.started;e._ifRestoring=!0,h.panel._id===e.id&&je(e.id);try{const o=n.job||(await ln(`/requests/${encodeURIComponent(n.request)}`)).id;if(!r())return;if(!o)throw new Error("本机桥接器未返回原任务编号");const i=await ln(`/runs/${encodeURIComponent(o)}`);if(!r())return;if(i.state==="error")throw new Error("原任务在 IF 中仍为失败："+(i.error||"请打开 IF 画布查看原因"));if(!["starting","running","done"].includes(i.state))throw new Error("原任务状态无法识别，请在 IF 查看");const a={...e,job:o,status:"running",error:null,progress:null,if_started:Number.isFinite(e.if_started)?e.if_started:Date.now(),step:"正在查询原任务并恢复产物"};if(!zt(a,t.id,"running"))throw new Error("无法保存恢复记录，请检查浏览器存储权限");Object.assign(e,{job:a.job,status:a.status,error:null,progress:null,if_started:a.if_started,step:a.step}),rt(e),h.panel._id===e.id&&je(e.id),await tn(e,t.id),await so(e,t.id,i)}catch(o){be(o.status===404?"本机未找到原任务，请由发起人在原电脑查询；若桥接器已重启，请到 IF 下载原产物。未重新提交生成。":"查询原产物未完成："+o.message+"；未重新提交生成。")}finally{e._ifRestoring=!1,l===t&&t.cards.includes(e)&&h.panel._id===e.id&&je(e.id)}}function Mn(e,t){return"chouka:if-task:v1:"+JSON.stringify([y.user?.id,t,e.id])}function qn(e,t){let n;try{n=JSON.parse(sessionStorage.getItem(Mn(e,t)))}catch{}return!!(n&&n.cap===e.cap&&Number.isFinite(e.if_started)&&n.if_started===e.if_started&&(e.if_request_id?n.if_request_id===e.if_request_id:e.job&&n.job===e.job)&&(!e.job||!n.job||e.job===n.job))}function zt(e,t,n){const r={phase:n,cap:e.cap,job:e.job,status:e.status,step:e.step,error:e.error,if_started:e.if_started,if_job_cap:e.if_job_cap,if_canvas_url:e.if_canvas_url,ms:e.ms,outputs:e.outputs||[],if_request_id:e.if_request_id,if_submitted_at:e.if_submitted_at,if_pending_prompts:e.if_pending_prompts,inputs:n==="preparing"?{params:e.params,assets:e.assets}:null,entry:e.job?e.history?.find(o=>o.job===e.job):null};try{return sessionStorage.setItem(Mn(e,t),JSON.stringify(r)),!0}catch{return!1}}function tr(e,t){if(!Ye(e))return!1;const n=Mn(e,t);let r;try{r=JSON.parse(sessionStorage.getItem(n))}catch{}if(!r||r.cap!==e.cap||!Number.isFinite(r.if_started)||!["preparing","submitting","running","done","error"].includes(r.phase))return!1;const o=r.phase==="submitting"&&r.if_request_id&&r.if_request_id===e.if_request_id&&!r.job&&!e.job&&e.status==="error",i=r.phase==="done"&&r.status==="done"&&r.job&&r.job===e.job&&e.status==="error"&&r.outputs?.length;if((e.if_started||0)>r.if_started||e.if_started===r.if_started&&(e.job&&e.job!==r.job||e.if_request_id&&r.if_request_id&&e.if_request_id!==r.if_request_id||!o&&!i&&e.job===r.job&&["done","error"].includes(e.status))){try{sessionStorage.removeItem(n)}catch{}return!1}for(const a of["job","status","step","error","if_started","if_job_cap","if_canvas_url","ms","outputs","if_request_id","if_submitted_at","if_pending_prompts"])e[a]=r[a];if(e.progress=null,r.entry&&r.entry.job===e.job){e.history||=[];const a=e.history.findIndex(d=>d.job===e.job);a<0?e.history.unshift(r.entry):e.history[a]=r.entry}return r.phase==="preparing"&&r.if_request_id&&r.inputs?(e.params=r.inputs.params,e.assets=r.inputs.assets,e.status="queued",e.error=null,e.step="正在恢复 IF 素材准备",e._ifResumePreparing=!0):r.phase==="submitting"&&r.if_request_id?(e.status="running",e.error=null,e.step="正在向本机 IF 确认原请求"):(r.phase==="preparing"||r.phase==="submitting")&&(e.status="error",e.step="",e.error=r.phase==="preparing"?"上次素材准备因页面离开而中断，尚未提交 IF；请确认后重试":"上次 IF 提交结果尚未确认，请先在 IF 查看是否已创建任务，避免重复生成",zt(e,t,"error")),!0}async function tn(e,t){const n=e.if_started,r=e.job,o=e.status,i=Mn(e,t),a=await hr(t);if(a.ok&&["done","error"].includes(o))try{const d=JSON.parse(sessionStorage.getItem(i));d?.if_started===n&&d.job===r&&d.phase===o&&sessionStorage.removeItem(i)}catch{}return a}function Br(e){try{const t=new ae(e);return t.protocol==="https:"&&t.hostname==="ant.alicdn.com"&&!t.port&&!t.username&&!t.password&&t.pathname.startsWith("/bio/img/")}catch{return!1}}function mo(e,t,n){const r=Dn(e,n);if(r.job===e.job){for(const o of t?.reference_urls||[]){const i=r.pending[o.index];!Number.isInteger(o.index)||!i||i.kind!==o.kind||!Br(o.url)||(r.entries=r.entries.filter(a=>a.source!==i.source),r.entries.push({...i,url:o.url}))}for(const o of t?.invalid_reference_indices||[]){const i=r.pending[o];i&&(r.entries=r.entries.filter(a=>a.source!==i.source||a.version!==i.version))}Qn(r)}}async function Ht(e,t){const n=await ue(`/api/if-reference?${new URLSearchParams({url:e.pathname+e.search,type:t})}`,{method:"HEAD",credentials:"same-origin",cache:"no-store"});if(!n.ok)throw new Error(`无法检查引用素材（${n.status}），请确认素材仍存在且有访问权限`);const r=n.headers.get("ETag");if(!r||!/^"[a-f0-9]{64}"$/.test(r))throw new Error("抽卡服务尚不支持引用复用，请更新服务后重试");return r}const ve=e=>{const t=ke(e),n=Bt(e);return dt(e)?e.name||"素材节点":e.name||(n&&(n.ladder||n.route)?n.name:t?t.name:n?n.name:e.cap)},Wt=e=>!!e&&(_t(e)||{}).kind==="style",Hr="@style",Ot="@text",Ze=e=>String(e.slot||"").startsWith("@"),nn=e=>!!e&&(_t(e)||{}).kind==="text",ut=e=>Wt(e)||nn(e),dt=e=>!!e&&(_t(e)||{}).kind==="asset",Bn=e=>dt(e)&&(e.outputs||[])[0]||null,pn=e=>e?Wt(e)?String((e.params||{}).style||"").trim():String((e.params||{}).text||"").trim():"",zn=e=>((e||{}).params||{}).op||"",nr=e=>(l?l.edges:[]).filter(t=>t.to===e.id&&t.slot===Ot).map(t=>it(t.from)).filter(t=>t&&ut(t)).map(t=>({id:t.id,name:ve(t),text:pn(t)})),k=e=>(e&&e.inputs||[]).filter(t=>t.type==="textarea"&&t.key!=="negative_prompt"&&!t.template&&!t.advanced),B=e=>(l?l.edges:[]).filter(t=>t.to===e.id&&t.slot===Hr).map(t=>l.cards.find(n=>n.id===t.from)).filter(t=>t&&ut(t)&&pn(t));function I(e,t=new Set){if(!e||t.has(e.id))return[];t.add(e.id);const n=[],r=new Set;for(const o of(l?l.edges:[]).filter(i=>i.to===e.id&&!Ze(i))){const i=l.cards.find(a=>a.id===o.from);if(!(!i||ut(i)))for(const a of se(i,t))r.has(a.id)||(r.add(a.id),n.push(a))}return n}function se(e,t=new Set){if(!e)return[];const n=B(e);return n.length?n:I(e,t)}function xe(e){return(l?l.cards:[]).filter(t=>!ut(t)&&!B(t).some(n=>n.id===e.id)&&se(t).some(n=>n.id===e.id))}const de=e=>se(e).map(pn),fe=()=>(l?l.cards:[]).filter(ut).forEach(e=>rt(e)),ot="{提示词}",Wr=(e,t)=>{const n=e.opt&&e.opt[t];return n&&String(n).trim()?String(n):null},gn=(e,t)=>e.optUse&&e.optUse[t]?Wr(e,t):null,ho=/^(?:For the target video, at [\d.]+ seconds|How the reference pictures align)[^\n]*\n/;function yr(e,t){let n=String(e??"");for(const r of t){if(r.includes(ot)){n=r.split(ot).join(n);continue}if(!n.trim()){n=r;continue}const o=n.match(ho);n=o?n.slice(0,o[0].length)+`
`+r+`

`+n.slice(o[0].length).replace(/^\s+/,""):r+`

`+n}return n}const wr=e=>Object.keys(e.assets||{}).filter(t=>t.startsWith("images[")&&e.assets[t]).length;function Pt(e){const t=Bt(e);if(!t||!t.ladder)return e.cap;const n=Object.keys(t.ladder).map(Number).sort((o,i)=>o-i),r=Math.max(wr(e),n[0]);return t.ladder[String(n.filter(o=>o<=r).pop())]||e.cap}function rr(e,t){const n=V[e];return n?.type===t?n:{type:t,api:{image:null,video:null,audio:null},bridge:{image:t==="video"?6:3,video:t==="video"?1:0,audio:0},reference_fallback:!0,note:"该模型引用规格尚未核实，使用画布兜底数量。"}}const ke=e=>{const t=J[e.cap];if(!t||t.execution!=="if_studio")return t||null;const n=mt.filter(d=>d.type===t.outputType),r=e.params?.if_model||n[0]?.display_name,o=rr(r,t.outputType),i=o.bridge,a=t.inputs.filter(d=>d.key!=="if_reference"||i?.image||i?.video).map(d=>d.key==="if_reference"?{...d,label:`参考${i?.image?"图片":""}${i?.image&&i?.video?"／":""}${i?.video?"视频":""} HTTPS 地址（可选）`}:d.key==="duration"?{...d,min:o?.duration?.min??1,max:o?.duration?.max??null,type:o?.duration?.max!=null?"slider":"number",step:1,default:o?.duration?.default??d.default,showHint:!0,hint:o?.duration?.max!=null?`当前模型时长：${o.duration.min}–${o.duration.max} 秒（整数）。`:"当前模型时长范围未核实；请输入正整数秒，不套用其他模型上限。"}:d);for(let d=0;d<(i?.image||0);d++)a.push({key:`images[${d}]`,label:"参考图片",type:"image"});for(let d=0;d<(i?.video||0);d++)a.push({key:`video[${d}]`,label:"参考视频",type:"video"});for(const[d,c]of Object.entries(e.assets||{}))c&&(/^images\[\d+\]$/.test(d)&&c.kind==="image"||/^video\[\d+\]$/.test(d)&&c.kind==="video")&&!a.some(f=>f.key===d)&&a.push({key:d,label:c.kind==="image"?"已保留的参考图片":"已保留的参考视频",type:c.kind});return{...t,inputs:a,slotLimits:{image:{max:i?.image||0},video:{max:i?.video||0},audio:{max:0}}}};function Yo(e){const t=ke(e)?.inputs.find(r=>r.key==="duration");if(!t)return;const n=Number(e.params.duration??t.default);e.params.duration=Math.min(t.max??1/0,Math.max(t.min,Number.isFinite(n)?Math.round(n):t.default))}function Vo(e,t){const n=Bt(e),r=n&&n.route&&n.route[t];return r&&r.cap!==e.cap?r:null}function cs(e,t,n){const r=n&&n.kind?Vo(e,n.kind):null;r&&(Un(l.edges.filter(a=>a.to===e.id)),e.cap=r.cap,e.assets={},t={key:r.slot},Gt(e),et(),fe());const o=_t(e);let i=!1;return o&&o.id==="card_image"&&n&&n.kind==="image"&&(e.cap==="zimage_t2i"?(or(e,"zimage_i2i"),e._model||(e._model="zimage"),i=!0):e.cap==="krea2_t2i"&&(or(e,"krea2_i2i"),e._model||(e._model="krea2"),i=!0),i&&(Gt(e),et(),fe(),G(()=>je(e.id),50))),!r&&aa(e.id,t.key)&&(et(),fe()),e.assets[t.key]=n,Hn(e),It(e),t}const{CLARITY_STEPS:Ko,RATIO_GRID:us,resolutionPresets:fs,resolutionPreset:ms,imageSettings:Go,applyInputPresets:hs}=F,Bi=F.create({document:s,getCapability:e=>ke(e),getCapabilityById:e=>J[e],getRunCapability:e=>J[Pt(e)]||ke(e),getProject:()=>l,isIF:e=>Ye(e),normalizeIFDuration:e=>Yo(e),api:(...e)=>$t(...e),save:()=>oe(),onReferenceChange:e=>Hi(e),ratioWH:co,multiple:On}),{imageClarityPicker:gs,referenceVideo:bs,syncReferenceParameters:Zo,refreshVideoParameters:Hn,videoReferenceStatus:xs}=Bi,{clarityPicker:ys,paramsBrief:Qo,switchImageCapability:or}=ld({document:s,save:()=>oe(),claritySteps:Ko,ratioGrid:us,imageClarityPicker:gs,imageSettings:Go,resolutionPresets:fs,resolutionPreset:ms,switchImageCapability:(e,t)=>Bi.switchImageCapability(e,t)});function Hi(e){if(!l?.cards.includes(e)||h.panel._id!==e.id)return;const t=Ye(e)?ke(e):J[Pt(e)]||ke(e),n=h.panel.querySelector('button[title^="点开弹窗"]');n&&(n.textContent=`⚙ ${Qo(e,t)||"参数"}`),h.respop._card===e&&h.respop.style.display!=="none"&&(h.respop._cap!==t.id?Pn():h.respop._refill())}const ws=e=>(e&&e.inputs||[]).filter(t=>!Wo.has(t.key)&&!wt.includes(t.type)&&t.type!=="textarea"&&(t.type==="seed"||!t.advanced)&&!t.mirror&&!t.rangeOf);function vs(e,t){const n=Ye(e)?ke(e):J[Pt(e)]||ke(e),r=n&&(n.imageControls||n.inputs.some(f=>Wo.has(f.key))),o=n?.imageControls?["steps","seed"].map(f=>n.inputs.find(u=>u.key===f&&!u.mirror)).filter(Boolean).map(f=>({...f,label:f.key==="steps"?"采样步数":"种子"})):ws(n);if(!r&&!o.length)return ce("这个模式没有可调参数");const i=()=>{if(h.panel._id!==e.id)return;const f=h.panel.querySelectorAll(".foot .tcap"),u=f[f.length-1];if(!u||!u.textContent.startsWith("⚙"))return;const p=Qo(e,n);u.textContent=p?`⚙ ${p}`:"⚙ 参数"};let a=!1;const d=()=>{const f=h.respop.contains(s.activeElement)?s.activeElement.id:null;h.respop.innerHTML="";const u=xs(e,n);if(u&&h.respop.appendChild(u),r&&h.respop.appendChild(ys(e,n,d)),o.length){const b=s.createElement("div");b.className=n.imageControls?"pwrap image-basic":"pwrap",r&&(b.style.marginTop="12px");for(const g of o){const x=Do(e,g);sd(x,i),b.appendChild(x)}h.respop.appendChild(b)}if(n.imageControls){const b=n.inputs.filter(g=>!wt.includes(g.type)&&g.type!=="textarea"&&g.type!=="seed"&&g.key!=="steps"&&!Wo.has(g.key)&&!g.mirror&&!g.rangeOf&&!(n.imageControls.mode==="t2i"&&g.key==="encode_resolution")&&!(Ye(e)&&g.key==="if_reference"));if(b.length){const g=s.createElement("details");g.className="image-advanced",g.open=a;const x=s.createElement("summary");x.textContent="模型专属参数",g.appendChild(x),g.addEventListener("toggle",()=>{!g.isConnected||g.open===a||(a=g.open,c())});for(const v of b)g.appendChild(Do(e,v));h.respop.appendChild(g)}}const p=s.createElement("button");p.className="x",p.textContent="✕",p.title="关闭 (Esc)",p.onclick=Pn,p.dataset.readonlyView="",h.respop.appendChild(p),Ka(h.respop,!ge()),i(),f&&s.getElementById(f)?.focus({preventScroll:!0})};h.respop._card=e,h.respop._cap=n.id,h.respop._refill=()=>{d();const f=h.respop.getBoundingClientRect();(f.top<8||f.bottom>innerHeight-8)&&c()},d(),h.respop.style.display="",Hn(e);function c(){if(h.respop.style.display==="none"||!t.isConnected)return;const f=t.getBoundingClientRect(),u=f.top-64,p=innerHeight-f.bottom-16;h.respop.style.maxHeight=Math.max(160,Math.max(u,p))+"px";const b=h.respop.offsetWidth,g=h.respop.offsetHeight,x=Math.max(8,Math.min(f.left+f.width/2-b/2,innerWidth-b-8));let v=f.top-g-8;v<56&&(v=Math.max(8,Math.min(f.bottom+8,innerHeight-g-8))),h.respop.style.left=x+"px",h.respop.style.top=v+"px"}c()}const Pn=()=>{h.respop.style.display="none",h.respop._card=null,h.respop._refill=null},ks={image:"图片 (png)",video:"视频 (mp4，含音轨)",audio:"音频"},Cs={4:"四宫格",6:"六宫格",9:"九宫格",12:"十二宫格",16:"十六宫格"};function Wi(e){const t=e&&e.grid;if(!t)return"";const n=t[0]*t[1];return Cs[n]||`${n}格`}function cn(e,t=null){const n=Wi(e);if(wt.includes(e.type)){const o=t&&ke(t),a=(o?o.inputs.filter(u=>u.type===e.type&&(t.assets||{})[u.key]):[]).findIndex(u=>u.key===e.key),d=+(String(e.key).match(/\[(\d+)\]/)||[0,0])[1],c=a>=0?a+1:d+1,f=`${Je[e.type]||e.type}${c}`;return n?`${f}（${n}）`:f}const r=String(e.label||"").trim();return n?`${r}（${n}）`:r}function _s(e){const t=p=>e.inputs.filter(b=>b.type===p),n=[...new Set(e.inputs.filter(p=>wt.includes(p.type)).map(p=>p.type))],r=t("textarea"),o=e.inputs.find(p=>p.key==="duration"),i=e.inputs.filter(p=>p.key==="width"||p.key==="height"),a=e.inputs.find(p=>p.key==="aspect_ratio"),d=e.inputs.find(p=>p.key==="megapixels"),c=e.inputs.find(p=>p.key==="scale_to_length"),f=[],u=[];for(const p of n){const b=t(p),g=b.filter(w=>w.required),x=b.filter(w=>!w.required),v=Je[p]||p;g.length&&f.push(`${v} ×${g.length}：${g.map(w=>cn(w)).join(" / ")}`),x.length&&u.push(`可引用${v}（上限 ${Xn(e,p)}）`)}return n.length||f.push("不需要素材，纯提示词驱动"),r.length&&f.push(r.length>1?`提示词 ×${r.length}`:"提示词"),o&&u.push(o.max==null?"时长范围未核实（正整数秒）":`时长 ${o.min}–${o.max} 秒`),e.imageControls?(u.push(`清晰度 ${Ko.map(p=>p.label).join(" / ")}（短边）`),u.push(e.imageControls.mode==="i2i"?"默认原图比例，也可另选画面比例":"画面比例（13 档）")):(i.length&&u.push("画面宽高"),a&&u.push(`画面比例（${a.options.length} 档，默认 ${a.default}）`),d&&u.push(`分辨率 ${fr[0]}p–${fr[fr.length-1]}p（短边，768p 为 H3 原生）`),c&&u.push(`分辨率长边 ${c.min}–${c.max}，画面比例跟随原图`)),e.inputs.some(p=>p.type==="seed")&&u.push("种子"),{need:f,opt:u,out:ks[e.outputType]||e.outputType,file:e.file||e.id}}function Es(e,t){const n=_s(e),r=s.createElement("div"),o=s.createElement("b");if(o.textContent=t||e.name,r.appendChild(o),e.note){const d=s.createElement("div");d.className="note",d.textContent=e.note,r.appendChild(d)}const i=(d,c)=>{const f=s.createElement("div");f.className="io";const u=s.createElement("i");u.textContent=d;const p=s.createElement("span");p.textContent=c,f.append(u,p),r.appendChild(f)};i("输入",n.need.join("　·　")),n.opt.length&&i("可调",n.opt.join("　·　")),i("产出",n.out);const a=s.createElement("div");return a.className="fn",a.textContent=n.file,r.appendChild(a),r}function go(e,t,n){const r=s.createElement("div"),o=s.createElement("b");o.textContent=e;const i=s.createElement("div");i.className="note",i.textContent=t,r.append(o,i);for(const[a,d]of n){const c=s.createElement("div");c.className="io";const f=s.createElement("i");f.textContent=a;const u=s.createElement("span");u.textContent=d,c.append(f,u),r.appendChild(c)}return r}function bo(e,t,n){if(!t)return null;const r=mn(t,e.cap),o=r?t.ladder?Pt(e):e.cap:Nt(t),i=J[o]||J[Nt(t)];if(!i)return go(n||t.name,"这个模式当前不可用。",[]);const a=Es(i,n||t.name);let d="";if(t.route?d=(t.entry&&t.entry.hint?t.entry.hint:"根据放入的素材类型自动选择工作流。")+(r?`当前会运行「${i.name}」。`:""):t.ladder&&(d="按图片数量自动选择："+Object.keys(t.ladder).map(Number).sort((c,f)=>c-f).map(c=>`${c} 张 → ${(J[t.ladder[c]]||{}).name||t.ladder[c]}`).join("；")+(r?`。当前 ${wr(e)} 张，会运行「${i.name}」。`:"。")),d){const c=s.createElement("div");c.className="note",c.textContent=d,a.insertBefore(c,a.children[1]||null)}return a}function Ss(e){const t=_t(e);return Wt(e)?go(ve(e),`这个节点保存一段可复用的风格描述，不会单独生成产物。连接到生成节点后会并入提示词，并沿产物连线向下游继承；下游节点自己挂风格时会从那里开始覆盖继承。使用 ${ot} 可以指定原提示词插入位置。这里只写画风、色调、光线和镜头质感，具体画面内容留在生成节点。`,[["输入","风格、色调、光线和镜头质感"],["产出","可复用的风格文字"]]):nn(e)?go(ve(e),"这个节点保存和加工文字。可以连接到生成节点并入提示词，也可以连接到其他文本节点作为加工输入；加工结果会写回节点。",[["输入","节点文字或上游文本"],["产出","可继续连接的文字"]]):dt(e)?go(ve(e),"这个节点保存一份上传素材，不会单独运行。它可以同时连接到多个节点，让同一份图片、视频或音频重复使用；原文件不会被处理。",[["输入","图片、视频或音频"],["产出","可复用的原始素材"]]):bo(e,Bt(e),ve(e)||t&&t.name)}function $s(e,t){h.tip.innerHTML="",h.tip.appendChild(e),h.tip.style.display="",h.tip.style.left=h.tip.style.top="0px";const n=8,r=52,o=h.stage.getBoundingClientRect(),i=o.left+n,a=o.right-n,d=h.tip.offsetWidth,c=h.tip.offsetHeight;let u=(b=>Math.max(i,Math.min(b,a-d)))(t.left),p=t.bottom+n;p+c>innerHeight-n&&(t.top-n-c>=r?p=t.top-n-c:(p=Math.max(r,innerHeight-n-c),a-(t.right+n)>=d?u=t.right+n:t.left-n-i>=d&&(u=t.left-n-d))),h.tip.style.left=u+"px",h.tip.style.top=p+"px"}const Ut=()=>h.tip.style.display="none";function xo(e,t){let n=null;e.addEventListener("mouseenter",()=>{Z(n),n=G(()=>{const r=t();r&&e.matches(":hover")&&$s(r,e.getBoundingClientRect())},280)}),e.addEventListener("mouseleave",()=>{Z(n),Ut()}),e.addEventListener("mousedown",()=>{Z(n),Ut()})}function js(){if(!y.user?.id)return null;try{const e=localStorage.getItem(`chouka:last-project:${y.user.id}`);return D.find(t=>t.id===e)||null}catch{return null}}function Ns(e){if(!(S||!y.active||!y.user?.id))try{localStorage.setItem(`chouka:last-project:${y.user.id}`,e)}catch{}}const Ui=(async function(){try{await y.requireUser(),y.mountAccount(s.getElementById("account"));const o=await $t("/api/cards",{cache:"no-store"});H=o.cards,J=o.capabilities,V=o.if_model_limits||{},h.dot.classList.toggle("on",!!o.comfy_online)}catch(o){if(be("后端未就绪："+o.message),!y.active)return}if(m.disposed||(await vr(),m.disposed))return;Ks();const t=new URLSearchParams(location.search),n=t.get("project"),r=t.get("card");if(n)await kr(n),S?_r():r&&l?.id===n&&await Ba({project:n,card:r});else if(S)_r();else{const o=js();if(o&&await kr(o.id),!l){const i=D.find(a=>a.locked);i&&await kr(i.id)}}await Ji(),y.every(Ji,5e3),y.every(vr,5e3),ct(),y.every(ct,700)})();async function Ji(){try{const e=await $t("/api/health");h.dot.classList.toggle("on",!!e.comfy_online),e.mode==="controller"&&y.user?.role==="admin"?(h.dot.href=T.adminURL("/controller"),h.dot.title="打开运行面板",h.dot.setAttribute("aria-label","打开运行面板")):(h.dot.removeAttribute("href"),h.dot.title="ComfyUI 连接状态",h.dot.setAttribute("aria-label","ComfyUI 连接状态"))}catch{h.dot.classList.remove("on")}}function Xi(e){return T.projectSpaces(e,y.user?.id,he)}function yo(){N.update({projects:D,teams:he,selectedSpace:Te,selectedId:l?.id||null,user:y.user})}async function vr(){if(!(!y.active||m.disposed)){try{const e=await T.projects.list();if(m.disposed)return;D=e.projects,he=e.teams}catch{return}if(l){const e=D.find(t=>t.id===l.id);if(!e)Vt(),lt.retainProjects(D.map(t=>t.id));else{const t=l.permission!==e.permission;Object.assign(l,{permission:e.permission,owner_id:e.owner_id,owner_display_name:e.owner_display_name,team_id:e.team_id,team_name:e.team_name,share_count:e.share_count,shared_team_ids:e.shared_team_ids,shared_personally:e.shared_personally,name:e.name,locked:e.locked}),t&&(rn(),Yn(),ir())}}br(),yo()}}const Ms=()=>N.create();let ei=0;async function kr(e){if(l&&l.id!==e&&on()&&Ke.busy)try{await Vn(l.id)}catch(o){be("切换前保存失败，已保留当前画布："+o.message);return}Ke.cancelTimers(),Eo();const t=++ei;try{const o=await T.projects.get(e);if(t!==ei||!y.active)return;l=o}catch(o){return be(o.message)}const n=Xi(l);n.includes(Te)||(Te=n[0]||"personal"),yo(),Dt=null,Ke.resetFailures(),Tt=!1,l.cards=l.cards||[],l.edges=l.edges||[],l.groups=l.groups||[];const r=[];for(const o of l.cards){const i=Bt(o);if(i&&!i.route&&i.id!==o.cap&&!(i.modelSwitch&&Object.values(i.modelSwitch).includes(o.cap))&&(o.cap=i.id),i&&i.modelSwitch){const a=Object.entries(i.modelSwitch).find(([,d])=>d===o.cap);a&&(o._model=a[0])}tr(o,l.id)&&r.push(o),!Ye(o)&&!ut(o)&&!dt(o)&&o.status==="queued"&&!o.job&&!o._ifResumePreparing&&(o.status="error",o.error="上次提交未取得任务编号，请先检查任务列表，确认后再重试"),To(o)}for(const o of l.cards)nn(o)&&(o.cap!=="text"&&(o.cap="text"),!String((o.params||{}).text||"").trim()&&String(o.out||"").trim()&&(o.params=o.params||{},o.params.text=o.out));if(ti(),z=Object.assign({x:60,y:70,k:1},l.view||{}),le=null,K.clear(),rn(),h.empty.style.display="none",h.dock.style.display="",h.fit.style.display="",h.ptitle.textContent=l.name,s.getElementById("directorbtn").href=`/director?project=${encodeURIComponent(l.id)}`,l.locked){const o=s.createElement("span");o.className="ro",o.textContent="试玩画布 · 刷新还原",o.title="这张画布是示例：参数怎么改、节点怎么拖、重跑几遍都随便，改动只在这一次里有效，刷新就回到原样。想留下自己的东西就「＋ 新建项目」",h.ptitle.appendChild(o)}ir();for(const o of l.cards)Fa(o,l.id);if(r.length&&on()&&!l.locked)for(const o of r)tn(o,l.id);Ns(l.id),ea(l.id),vr()}function zs(){Si(),h.empty.style.display="",h.world.innerHTML="",h.wires.innerHTML="",ar?.disconnect(),So.clear(),h.wires.classList.remove("has-flow"),h.ptitle.textContent="",h.dock.style.display="none",h.fit.style.display="none",h.hint.textContent=""}const wo=T.plainCard,Yi=["type","cap","name","x","y","w","h","params","assets","opt"];let Wn=[],vo=[],Cr=null,ko=null;function ti(){Wn=[],vo=[],Cr=null,ko=null}function Vi(){return{cards:l.cards.map(e=>JSON.parse(JSON.stringify(wo(e)))),edges:JSON.parse(JSON.stringify(l.edges)),groups:JSON.parse(JSON.stringify(l.groups||[]))}}function Ki(e){return JSON.stringify({cards:e.cards.map(t=>{const n=Object.fromEntries(Yi.filter(r=>t[r]!==void 0).map(r=>[r,t[r]]));return n.id=t.id,t.type==="card_asset"&&(n.outputs=t.outputs),n}),edges:e.edges,groups:e.groups})}function ni(e="action"){!l||!ge()||S||Cr||(Cr=Vi(),ko=e)}function Co(){if(!Cr||!l)return;const e=Vi(),t=Cr,n=ko;if(Cr=null,ko=null,Ki(t)===Ki(e))return;const r=Wn[Wn.length-1];n==="typing"&&r?.kind==="typing"&&Date.now()-r.at<1e3?r.after=e:(Wn.push({before:t,after:e,kind:n,at:Date.now()}),Wn.length>80&&Wn.shift()),vo=[]}function Ps(e){const t=new Map(l.cards.map(n=>[n.id,n]));l.cards=e.cards.map(n=>{const r=t.get(n.id);if(!r)return JSON.parse(JSON.stringify(n));const o=r;for(const i of Yi)i in n?o[i]=JSON.parse(JSON.stringify(n[i])):delete o[i];return n.type==="card_asset"&&(o.outputs=JSON.parse(JSON.stringify(n.outputs||[]))),o}),l.edges=JSON.parse(JSON.stringify(e.edges)),l.groups=JSON.parse(JSON.stringify(e.groups)),Jt=null,K=new Set([...K].filter(n=>l.cards.some(r=>r.id===n))),le&&!l.cards.some(n=>n.id===le)&&(le=null,rn()),ir(),le&&je(le),oe()}function Ls(e=!1){if(!l||!ge()||S)return;Co();const t=e?vo:Wn,n=e?Wn:vo,r=t.pop();r&&(n.push(r),Ps(e?r.after:r.before))}for(const e of["pointerdown","keydown","beforeinput","paste","drop","change"])s.addEventListener(e,t=>{t.target.closest?.("[data-image-composer]")||!l||S||!ge()||t.type==="keydown"&&(t.ctrlKey||t.metaKey)&&/^(z|y)$/i.test(t.key)||ni(t.type==="beforeinput"?"typing":"action")},!0);function Ur(){return!Tt&&l?.id===ne?l.cards.find(e=>e.id===me):null}function _r(){if(!S)return;const e=Ur();K.clear(),e?(le=e.id,K.add(e.id),e._el?.classList.add("sel"),je(e.id)):(le=null,h.panel.replaceChildren(Oo("此节点已删除或不可访问；不会重新创建。请返回导演台刷新项目。")),h.panel._id=null,h.panel.style.display="",vt())}S&&(q.ChoukaNodeEditor={async flush(){if(await Ui,!Ur())throw new Error("此节点已删除或不可访问");await Vn(ne)},payload(){const e=Ur();if(!e)throw new Error("此节点已删除或不可访问");return Li(e)}});const Gi=["#00e5ff","#ff5da2","#9b7bff","#55e68a","#ffb84d","#58a6ff","#f778ba","#d2e75b"];function Zi(e){let t=0;for(const n of String(e||""))t=t*31+n.codePointAt(0)>>>0;return Gi[t%Gi.length]}function Is(){if(!h.presenceUsers)return;const e=new Map;for(const n of St.values())e.has(n.user_id)||e.set(n.user_id,n);if(h.presenceUsers.replaceChildren(),h.presenceUsers.classList.toggle("on",e.size>0),!e.size)return;const t=s.createElement("span");t.className="presence-count",t.textContent=`${e.size} 人使用中`,h.presenceUsers.appendChild(t);for(const n of e.values()){const r=s.createElement("span");r.className="presence-avatar";const o=Zi(n.user_id);r.style.background=o,r.style.boxShadow=`0 0 0 1px ${o}`,r.textContent=String(n.name||"协").trim().slice(0,1).toUpperCase(),r.title=`${n.name||"协作者"} · 正在此画布`,h.presenceUsers.appendChild(r)}}function Ts(e){if(!h.presenceLayer||e.connection_id===Sn)return null;let t=e._el;if(t?.isConnected)return t;t=s.createElement("div"),t.className="collab-cursor";const n=Zi(e.user_id);t.style.color=n;const r=s.createElement("div");r.className="pointer";const o=s.createElement("div");o.className="label",o.style.backgroundColor=n;const i=s.createElement("span");return i.textContent=e.name||"协作者",o.appendChild(i),t.append(r,o),h.presenceLayer.appendChild(t),e._el=t,t}function Qi(e){if(e.connection_id===Sn){e._el?.remove(),e._el=null;return}const t=Ts(e);t&&(t.classList.toggle("hidden",!e.visible),e.visible&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&(t.style.transform=`translate(${e.x}px,${e.y}px) scale(${1/z.k})`))}function ri(){for(const e of St.values())Qi(e)}function Rs(e,t,n){if(Number.isFinite(n)&&n<Zt)return;Number.isFinite(n)&&(Zt=n),Sn=t||Sn;const r=new Map;for(const o of e||[]){const i=St.get(o.connection_id);r.set(o.connection_id,Object.assign(i||{},o))}for(const[o,i]of St)r.has(o)||i._el?.remove();St=r,Is(),ri()}function Os(e,t){!l||l.id!==e||t<=(l.rev||0)||$t(`/api/projects/${encodeURIComponent(e)}`).then(n=>_o(n)).catch(()=>{})}function _o(e){if(!l||e.id!==l.id||(e.rev||0)<=(l.rev||0))return;if(S&&!(e.cards||[]).some(o=>o.id===me)&&(Tt=!0,Ke.cancelContentSave(),_r()),Ke.busy||Ct){(!Dt||(e.rev||0)>(Dt.rev||0))&&(Dt=e);return}const t=h.panel.style.display!=="none",n=[],r=new Map(l.cards.filter(o=>Ye(o)&&qn(o,l.id)&&["queued","running"].includes(o.status)&&Number.isFinite(o.if_started)).map(o=>[o.id,o]));l.name=e.name,l.cards=(e.cards||[]).map(o=>{const i=r.get(o.id),a=i&&o.if_started===i.if_started&&o.job===i.job;if(i&&o.cap===i.cap&&(o.if_started||0)<=i.if_started&&!(o.if_started===i.if_started&&o.job&&i.job&&o.job!==i.job)&&!(o.if_started===i.if_started&&o.if_request_id&&i.if_request_id&&o.if_request_id!==i.if_request_id)&&!(a&&["done","error"].includes(o.status))){const d=Object.fromEntries(["params","assets","job","status","step","error","progress","if_started","if_job_cap","if_canvas_url","if_request_id","if_submitted_at","if_pending_prompts","ms","outputs","history","_ifPolling","_ifRecovering","_ifResumePreparing"].map(c=>[c,i[c]]));return Object.assign(i,o,d)}return tr(o,e.id)&&n.push(o),o}),l.edges=e.edges||[],l.groups=e.groups||[],l.rev=e.rev,l.updated=e.updated,l.director=e.director,ti();for(const o of l.cards)To(o);le&&!l.cards.some(o=>o.id===le)&&(le=null),K=new Set([...K].filter(o=>l.cards.some(i=>i.id===o))),h.ptitle.textContent=l.name,ir();for(const o of l.cards)r.get(o.id)!==o&&Fa(o,l.id);if(n.length&&on()&&!l.locked)for(const o of n)tn(o,l.id);S||(t&&le?je(le):le||rn())}function oi(){if(!Dt||Ke.busy||Ct)return;const e=Dt;Dt=null,_o(e)}function Eo(){if(Z(un),un=null,Z(An),An=null,Ft=null,st=null,Sn=null,Zt=-1,Et){const e=Et;Et=null;try{e.close(1e3,"leave canvas")}catch{}}for(const e of St.values())e._el?.remove();St.clear(),h.presenceLayer?.replaceChildren(),h.presenceUsers?.replaceChildren(),h.presenceUsers?.classList.remove("on")}function ea(e){Eo(),st=e;const t=T.presence(e);Et=t,t.onopen=()=>Os(e,1/0),t.onmessage=n=>{if(t!==Et||st!==e)return;let r;try{r=T.parsePresence(n.data)}catch{return}if(r.type==="presence")Rs(r.members,r.self,r.version);else if(r.type==="cursor"){const o=St.get(r.connection_id);if(!o)return;Object.assign(o,r),Qi(o)}else r.type==="card-added"?mi(r.card,r.rev):r.type==="project-changed"?_o(r.project):r.type==="project-deleted"&&(ce("这张画布已被删除"),Vt(),vr())},t.onclose=()=>{t===Et&&(Et=null,st===e&&l?.id===e&&y.active&&(un=G(()=>ea(e),1500)))}}function ta(e,t,n=!0){Ft={type:"cursor",x:e,y:t,visible:n},An===null&&(An=G(()=>{An=null,Et?.readyState===$.OPEN&&Ft&&Et.send(T.serializeCursor(Ft)),Ft=null},50))}function Ln(){h.world.style.transform=`translate(${z.x}px,${z.y}px) scale(${z.k})`,h.wires.style.transform=h.world.style.transform,h.groups.style.transform=h.world.style.transform,h.presenceLayer&&(h.presenceLayer.style.transform=h.world.style.transform),typeof ri=="function"&&ri(),h.wires.setAttribute("width",1),h.wires.setAttribute("height",1),vn(),Jr(),As(),Ei()}function As(){h.zoomPercent&&(h.zoomPercent.textContent=Math.round(z.k*100)+"%")}function wn(e,t){const n=h.stage.getBoundingClientRect();return{x:(e-n.left-z.x)/z.k,y:(t-n.top-z.y)/z.k}}let Er=!1;function Jr(){if(!Er||!l||!l.cards.length)return;const e=h.minimapCanvas,t=e.getContext("2d"),n=200,r=150;e.width=n,e.height=r;let o=1/0,i=1/0,a=-1/0,d=-1/0;for(const L of l.cards){const re=Be(L),Ve=L._el?L._el.offsetHeight:200;o=Math.min(o,L.x),i=Math.min(i,L.y),a=Math.max(a,L.x+re),d=Math.max(d,L.y+Ve)}const c=50;o-=c,i-=c,a+=c,d+=c;const f=a-o,u=d-i,p=Math.min(n/f,r/u);t.fillStyle="#070707",t.fillRect(0,0,n,r),t.fillStyle="#f3f4f6",t.strokeStyle="#f3f4f6",t.lineWidth=1;for(const L of l.cards){const re=(L.x-o)*p,Ve=(L.y-i)*p,at=Be(L)*p,Qe=(L._el?L._el.offsetHeight:200)*p;t.fillRect(re,Ve,at,Qe),t.strokeRect(re,Ve,at,Qe)}const b=h.stage.getBoundingClientRect(),g=(-z.x/z.k-o)*p,x=(-z.y/z.k-i)*p,v=b.width/z.k*p,w=b.height/z.k*p;h.minimapViewport.style.left=g+"px",h.minimapViewport.style.top=x+"px",h.minimapViewport.style.width=v+"px",h.minimapViewport.style.height=w+"px",h.minimap._scale=p,h.minimap._minX=o,h.minimap._minY=i}function Fs(){Er=!Er,h.minimap.style.display=Er?"":"none",h.minimapBtn.classList.toggle("active",Er),Er&&Jr()}function Ds(){let e=!1;const t=(n,r)=>{if(!e)return;const o=h.minimap.getBoundingClientRect(),i=n-o.left,a=r-o.top,d=h.minimap._scale||1,c=h.minimap._minX||0,f=h.minimap._minY||0,u=i/d+c,p=a/d+f,b=h.stage.getBoundingClientRect();z.x=-u*z.k+b.width/2,z.y=-p*z.k+b.height/2,Ln(),vt(),Qt()};h.minimapViewport.addEventListener("mousedown",n=>{n.preventDefault(),e=!0}),h.minimap.addEventListener("mousedown",n=>{n.target!==h.minimapViewport&&(n.preventDefault(),e=!0,t(n.clientX,n.clientY))}),P("mousemove",n=>{e&&t(n.clientX,n.clientY)}),P("mouseup",()=>{e=!1})}function ir(){Si(),h.world.innerHTML="";const e=s.createDocumentFragment();for(const t of l.cards)e.appendChild(ii(t));h.world.appendChild(e),Ln(),et(),jr(),h.hint.textContent=`${l.cards.length} 个节点`,Jr(),S&&_r()}const na=e=>(J[Pt(e)]||ke(e)||_t(e)||{}).outputType||"image",ra=e=>{const t=Bt(e);return!!(t&&t.route)&&!Object.values(e.assets||{}).some(Boolean)};function Sr(e){return Wt(e)?'<span class="ph">🎨</span>':nn(e)?'<span class="ph">✍</span>':dt(e)?'<span class="ph">📎</span>':`<span class="ph">${ra(e)?"🖼🎬":na(e)==="video"?"🎬":"🖼"}</span>`}const qs="button,input,textarea,select,audio,.vprog,.cmp,.rz,.port,.inport";function ii(e){const t=_t(e),n=s.createElement("div");n.className="card"+(le===e.id?" sel":""),n.dataset.id=e.id,n.style.left=e.x+"px",n.style.top=e.y+"px",n.innerHTML=`
    <div class="ch"><span>${t?t.icon:"▪"}</span><span class="t"></span><button class="x" type="button" title="删除" aria-label="删除节点">✕</button></div>
    <div class="body">${Sr(e)}</div>
    <div class="bar"><i></i></div>
    <div class="cf"><span class="kt"></span><span class="st"></span><span class="meta" style="margin-left:auto"></span></div>
    <div class="rz tl" title="拖动改大小（按住 Shift 只改宽）"></div>
    <div class="rz br" title="拖动改大小（按住 Shift 只改宽）"></div>
    <div class="inport"></div>
    <div class="port" title="${dt(e)?"拖到别的节点上 → 这份素材就进它的格子":"拖到空白处 → 用本节点产物新建下游节点"}"></div>`,e._el=n,In(e),Gt(e);const r=n.querySelector(".ch .x");return r.onmousedown=o=>o.stopPropagation(),r.onclick=o=>{o.stopPropagation(),ka(e)},n.querySelector(".rz.tl").onmousedown=o=>ma(o,e,n,-1),n.querySelector(".rz.br").onmousedown=o=>ma(o,e,n,1),n.querySelector(".port").onmousedown=o=>Vs(o,e),n.onmousedown=o=>{if(!(o.button===1||o.button===0&&o.shiftKey)){if(o.button===0&&!o.target.closest(qs))return Ys(o,e);o.stopPropagation(),!(o.button===2&&K.has(e.id)&&l.cards.filter(i=>K.has(i.id)).length>1)&&At(e.id)}},n.oncontextmenu=o=>{o.stopPropagation(),o.preventDefault(),Ut(),!(K.has(e.id)&&pa(o.clientX,o.clientY))&&(At(e.id),tl(o.clientX,o.clientY,e))},n.ondblclick=o=>{const i=o.target.closest(".body");if(!(!i||ut(e))&&!(dt(e)&&!Bn(e))&&!o.target.closest(".vprog")){if(o.target.matches("audio")){const a=o.target.getBoundingClientRect();if(o.clientY>a.bottom-34*z.k)return}for(const a of i.querySelectorAll("video"))dr(a),a.pause();Gr(e,+(o.target.dataset.i||0))}},Bs(n.querySelector(".body")),Ws(n.querySelector(".body"),e),xo(n,()=>Ss(e)),n.onclick=o=>{!dt(e)||Bn(e)||o.target.closest(".body")&&Fo(e)},rt(e),n}let $r=null;s.addEventListener("play",e=>{if(!(e.target.paused||!e.target.isConnected)){for(const t of s.querySelectorAll("video, audio"))t!==e.target&&(dr(t),t.pause());$r=e.target}},!0),s.addEventListener("pause",e=>{$r===e.target&&($r=null)},!0),s.addEventListener("mousedown",e=>{for(const n of s.querySelectorAll("video"))n._playRequest&&!n.closest(".body, .vbox")?.contains(e.target)&&dr(n);if(!$r)return;const t=$r.closest(".body, .vbox, .arange");(!t||!t.contains(e.target))&&$r.pause()},!0);function Bs(e){const t=(n,r,o)=>{if(!isFinite(n.duration)||!n.duration)return;const i=o.getBoundingClientRect();n.currentTime=Math.min(Math.max((r-i.left)/i.width,0),1)*n.duration};e.onmousedown=n=>{if(n.button!==0)return;const r=n.target.closest(".vprog");if(r){const c=e.querySelector("video");if(!c)return;n.stopPropagation(),n.preventDefault();const f=!c.paused;c.pause(),t(c,n.clientX,r);const u=b=>t(c,b.clientX,r),p=()=>{s.removeEventListener("mousemove",u),s.removeEventListener("mouseup",p),f&&c.play().catch(()=>{})};s.addEventListener("mousemove",u),s.addEventListener("mouseup",p);return}const o=n.target.closest("video");if(!o)return;const i=n.clientX,a=n.clientY,d=c=>{s.removeEventListener("mouseup",d),!(Math.abs(c.clientX-i)+Math.abs(c.clientY-a)>=4)&&(o._previewController?dr(o):o.paused?ml(o):(dr(o),o.pause()))};s.addEventListener("mouseup",d)},e.addEventListener("timeupdate",n=>{const r=e.querySelector(".vprog i"),o=n.target;!r||!isFinite(o.duration)||!o.duration||(r.style.width=o.currentTime/o.duration*100+"%")},!0)}function In(e){const t=e._el;if(!t)return;t.style.width=Be(e)+"px";const n=t.querySelector(".body");n.style.height=e.h&&!n.classList.contains("grid")?e.h+"px":""}function Xr(e){const t=e._el;if(!t)return;let n=t.querySelector(".composite-inputs");if(e.cap!=="image_composite"){n?.remove();return}const r=(ke(e)?.inputs||[]).filter(f=>f.type==="image"),o=new Set((l?.edges||[]).filter(f=>f.to===e.id&&!Ze(f)).flatMap(bn)),i=r.filter(f=>e.assets?.[f.key]||o.has(f.key)),a=JSON.stringify(i.map(f=>[f.key,e.assets?.[f.key],o.has(f.key)]));if(n?.dataset.signature===a)return;n||(n=s.createElement("div"),n.className="composite-inputs",t.querySelector(".body").after(n)),n.dataset.signature=a,n.replaceChildren();const d=s.createElement("div");if(d.className="composite-input-label",d.textContent=`引用图片 · ${i.length}/${r.length}`,n.append(d),!i.length){const f=s.createElement("div");f.className="composite-input-hint",f.textContent="从图片节点连线，或在编辑器中上传图片",n.append(f);return}const c=s.createElement("div");c.className="composite-input-list",n.append(c);for(const f of i){const u=e.assets?.[f.key],p=s.createElement("button");if(p.type="button",p.dataset.compositeReference=f.key,p.title=`${f.label} · ${u?.origin||u?.filename||(u?"查看引用图片":"正在导入")}`,p.setAttribute("aria-label",p.title),p.disabled=!u?.url,u?.url){const g=s.createElement("img");g.src=Na(u.url)||u.url,g.alt=f.label,g.loading="lazy",g.draggable=!1,p.append(g),p.onmousedown=x=>x.stopPropagation(),p.onclick=x=>{x.stopPropagation(),ro(u)}}const b=s.createElement("span");b.textContent=u?f.label:"导入中",p.append(b),c.append(p)}}function rt(e){const t=e._el;if(!t)return;Xr(e);const n=t.querySelector(".body"),r=t.querySelector(".st"),o=t.querySelector(".meta"),i=t.querySelector(".bar i");if(Wt(e)){const g=String((e.params||{}).style||"").trim();if(n.classList.remove("grid"),n.classList.add("sbody"),In(e),n.textContent="",g){const L=s.createElement("div");L.className="stx",L.textContent=g,n.appendChild(L)}else n.innerHTML=Sr(e)+'<div class="sempty">在旁边的面板里写一段风格，再把出口拖到生图/生视频节点上</div>';const x=t.querySelector(".port");x&&(x.title="拖到生图/生视频节点上 → 那个节点套用这段风格（拖到空白处会列出所有能挂的玩法）");const v=(l?l.edges:[]).filter(L=>L.from===e.id&&Ze(L)).length,w=xe(e).length;r.className="st",r.textContent=g?"":"还没写",o.textContent=v?`挂了 ${v} 个节点`+(w?` · 连带下游 ${w} 张`:""):"还没挂节点",i.style.width="0%";return}if(nn(e)){const g=e.status==="running";n.classList.remove("grid"),n.classList.add("sbody"),In(e),n.textContent="";const x=s.createElement("textarea");if(x.className="ttxt",x.spellcheck=!1,x.value=String((e.params||{}).text||""),x.placeholder=g?"正在加工，稍等…":"在这里写字；选好加工方式点「↑ 运行」，加工结果就落在这个框里 —— 可以直接改",x.disabled=g,x.oninput=()=>{e.params=e.params||{},e.params.text=x.value;const v=s.querySelector("#panel"),w=v?v.querySelector("textarea"):null;w&&w.placeholder==="在这里写字或直接在节点上写"&&(w.value=x.value),ai(e),oe()},n.appendChild(x),g){const v=s.createElement("div");v.className="load cover",n.appendChild(v)}ai(e);return}const a=e.outputs||[],d=a[0],c=Hs(e),f=a.map(g=>g.url).join("|")+(c?"|<"+c:""),u=e.status==="queued"||e.status==="running";if(u&&n.dataset.url!=="busy"?(n.dataset.url="busy",n.classList.remove("grid"),In(e),n.innerHTML='<div class="load"></div>'):!u&&!a.length&&n.dataset.url==="busy"?(n.dataset.url="",n.innerHTML=Sr(e)):dt(e)&&!a.length&&n.dataset.url&&(n.dataset.url="",n.classList.remove("grid"),n.innerHTML=Sr(e)),!u&&a.length&&n.dataset.url!==f&&(n.dataset.url=f,n.classList.toggle("grid",a.length>1),In(e),a.length>1?(n.style.setProperty("--cols",a.length<=4?2:a.length<=9?3:4),n.innerHTML=a.map((g,x)=>g.kind==="video"?`<video data-video-url="" data-i="${x}" loop preload="none" draggable="false"></video>`:`<img data-i="${x}" alt="" draggable="false">`).join("")):n.innerHTML=d.kind==="video"?'<video data-video-url="" data-i="0" loop preload="none" draggable="false"></video><div class="vprog" title="按住左右拖 → 定位进度（画面上按住是挪节点）"><i></i></div>':d.kind==="audio"?'<audio preload="none" controls style="width:92%"></audio>':c?'<div class="cmp" title="按住左右拖：跟原图对比，看边缘抠干净了没有"><img class="new" alt="" draggable="false" data-i="0"><img class="old" alt="" draggable="false"><div class="cmpx"><i>⇔</i></div><div class="cmptip">按住往右拖 → 回到原图</div></div>':'<img data-i="0" alt="" draggable="false">',fl(n,a,c),c&&oa(e),!ut(e)&&!dt(e)))for(let g=0;g<a.length;g++){const x=a[g];if(x.kind==="image"&&!x.width){const v=n.querySelector(`img[data-i="${g}"]`)||n.querySelector("img");if(v&&!v.dataset.thumbnail){const w=()=>{!t.isConnected||e._el!==t||!l?.cards.includes(e)||e.outputs?.[g]!==x||!v.naturalWidth||(x.width=v.naturalWidth,x.height=v.naturalHeight,It(e),oe())};v.complete&&v.naturalWidth?w():v.onload=w}}else if(x.kind==="video"&&!x.width){const v=n.querySelector(`video[data-i="${g}"]`)||n.querySelector("video");v&&v.readyState>=1?(x.width=v.videoWidth,x.height=v.videoHeight,It(e),oe()):v&&(v.onloadedmetadata=()=>{!t.isConnected||e._el!==t||!l?.cards.includes(e)||e.outputs?.[g]!==x||(x.width=v.videoWidth,x.height=v.videoHeight,It(e),oe())})}}if(dt(e)){r.className="st"+(d?" done":""),r.textContent=d?"已就绪":"点节点选文件",r.title=d?"把右边的出口拖到别的节点 → 这份素材就进那个节点的格子里":r.textContent,i.style.width="0%",o.textContent=d?String(d.filename||d.origin||d.url||"").split(/[\\/]/).pop().slice(-22):"",o.title=d&&d.origin||"";return}const p=e.status;r.className="st"+(p==="running"||p==="queued"?" run":p==="done"?" done":p==="error"?" err":""),r.textContent=p==="queued"?Ye(e)&&e.step?e.step:e.job?Qa(e):"正在提交…":p==="running"?(Ye(e)&&!(e.progress>0)?"生成中":`生成中 ${Math.round((e.progress||0)*100)}%`)+(e.step?` · ${e.step}`:""):p==="done"?pr(e.ms)?`已完成 · ${pr(e.ms)}`:"已完成":p==="error"?"失败":p==="canceled"?"已取消":e.cap==="image_composite"?"待合成":"待生成",r.title=r.textContent,i.style.width=(p==="running"||p==="queued"?Ye(e)&&!(e.progress>0)?0:(e.progress||.02)*100:p==="done"?100:0)+"%",o.textContent=e.error?String(e.error).slice(0,40):a.length>1?`${a.length} 张`:d?String(d.filename||d.origin||d.url||"").split(/[\\/]/).pop().slice(-22):"",o.title=e.error||"";const b=er(e);b&&o.replaceChildren(b)}function ai(e){const t=e._el;if(!t)return;const n=t.querySelector(".st"),r=t.querySelector(".meta"),o=t.querySelector(".bar i"),i=zn(e),a=e.status==="running",d=pn(e),c=t.querySelector(".port");c&&(c.title="拖到生成节点上 → 并进它的提示词；拖到另一个文本节点上 → 当那段加工的输入（拖到空白处会列出能接的地方）");const f=(l?l.edges:[]).filter(b=>b.from===e.id&&Ze(b)).length,u=nr(e).length;n.className="st"+(a?" run":e.status==="error"?" err":i&&e.status==="done"?" done":""),a?n.textContent="处理中…":i?n.textContent=e.status==="error"?"失败":e.status==="done"?pr(e.ms)?`已完成 · ${pr(e.ms)}`:"已完成":"待运行":n.textContent=d?"":"还没写",n.title=n.textContent;const p=[];i&&p.push(`输入 ${u} 段`),f&&p.push(`连 ${f} 个节点`),r.textContent=p.join(" · "),r.title=e.error||"",o.style.width=a?"40%":e.status==="done"?"100%":"0%"}function Hs(e){const t=J[Pt(e)];if(!t||!t.compare||t.card==="image")return null;const n=e.outputs||[];if(n.length!==1||n[0].kind!=="image")return null;const r=(t.inputs||[]).find(i=>i.type==="image"),o=r&&(e.assets||{})[r.key];return o&&o.kind==="image"?o.url:null}function oa(e){const t=e._el&&e._el.querySelector(".cmp");if(!t)return;const n=e._cmp==null?0:e._cmp;t.style.setProperty("--x",n*100+"%"),t.classList.toggle("dragged",e._cmp!=null)}function Ws(e,t){e.addEventListener("mousedown",n=>{if(n.button!==0)return;const r=n.target.closest(".cmp");if(!r)return;n.preventDefault();const o=d=>{const c=r.getBoundingClientRect();t._cmp=Math.min(Math.max((d-c.left)/c.width,0),1),oa(t)};o(n.clientX);const i=d=>o(d.clientX),a=()=>{s.removeEventListener("mousemove",i),s.removeEventListener("mouseup",a)};s.addEventListener("mousemove",i),s.addEventListener("mouseup",a)})}const it=e=>(l?l.cards:[]).find(t=>t.id===e)||null;function ia(e,t,n,r=!0){if(!t||!n||n.length<=1)return t?[t]:[];const o=/^(\w+)\[(\d+)\]$/.exec(t),i=e&&ke(e);if(!o||!i)return[t];const a=o[1],d=+o[2],c=n[0]&&n[0].kind,f=r?new Set((l?.edges||[]).filter(p=>p.to===e.id&&!Ze(p)).flatMap(bn)):null,u=(i.inputs||[]).filter(p=>{const b=new RegExp(`^${a}\\[(\\d+)\\]$`).exec(p.key);return b&&+b[1]>=d&&(!c||p.type===c)&&(!r||!(e.assets||{})[p.key]&&!f.has(p.key))}).sort((p,b)=>parseInt(/\[(\d+)\]/.exec(p.key)[1],10)-parseInt(/\[(\d+)\]/.exec(b.key)[1],10)).slice(0,n.length).map(p=>p.key);return u.length?u:[t]}function bn(e){if(!e||Ze(e))return[];if(Array.isArray(e.slots))return[...new Set(e.slots.filter(Boolean))];const t=it(e.from),n=it(e.to),r=t&&t.outputs||[],o=t&&t.history&&t.history[0]&&t.history[0].outputs||[];return ia(n,e.slot,r.length?r:o,!1)}function si(e){const t=it(e&&e.to);if(!t||!t.assets)return!1;let n=!1;for(const r of bn(e))r in t.assets&&(delete t.assets[r],n=!0);return n&&(Hn(t),It(t)),n}function Un(e,t=!0){const n=new Set(e||[]);if(!n.size)return!1;if(t)for(const r of n)si(r);l.edges=l.edges.filter(r=>!n.has(r));for(const r of new Set([...n].map(o=>o.to))){const o=it(r);o&&Xr(o)}return!0}function aa(e,t){const n=[];let r=!1;for(const o of l.edges){if(o.to!==e||Ze(o))continue;const i=bn(o);if(!i.includes(t))continue;const a=i.filter(d=>d!==t);r=!0,a.length?(o.slots=a,o.slot===t&&(o.slot=a[0])):n.push(o)}return Un(n,!1),r}function li(e){const t=it(e);if(!t)return null;const n=t._el?t._el.offsetHeight:230;return{x:t.x,y:t.y,w:Be(t),h:n}}let Jt=null,ar=null;const So=new Map;function Us(e,t){const n=new Set(e.cards.map(a=>a.id)),r=new Map,o=new Map;for(const a of e.edges)!n.has(a.from)||!n.has(a.to)||(r.has(a.to)||r.set(a.to,[]),o.has(a.from)||o.set(a.from,[]),r.get(a.to).push(a),o.get(a.from).push(a));const i=(a,d)=>{const c=new Set,f=new Set,u=[...t].filter(p=>n.has(p));for(;u.length;){const p=u.pop();if(!f.has(p)){f.add(p);for(const b of a.get(p)||[])c.add(b),u.push(b[d])}}return c};return{upstream:i(r,"from"),downstream:i(o,"to")}}function sa(e){if(Ze(e))return!1;const t=it(e.from),n=it(e.to);return!!(t&&n&&!ut(t)&&se(t).length&&!B(n).length)}function di(e){const t=it(e.from),n=it(e.to),r=o=>o?ve(o):"?";return Ze(e)?e.slot===Ot?`文本：${r(t)} → ${r(n)}`:`风格：${r(t)} → ${r(n)}`:`${r(t)} → ${r(n)}${e.version?`（固定分镜版本 · ${e.version.job} · 第 ${e.version.index+1} 张）`:""}`}function la(){ar?.disconnect();const e=Jt||S?[]:K.size?[...K]:le?[le]:[],{upstream:t,downstream:n}=l&&e.length?Us(l,e):{upstream:new Set,downstream:new Set};h.wires.classList.toggle("has-flow",!!(t.size||n.size));const r=t.size||n.size;if(r||h.wires.querySelector("defs")?.remove(),r&&!h.wires.querySelector("defs")){const o=s.createElementNS(ee,"defs");for(const i of["up","down","both"]){const a=s.createElementNS(ee,"marker");for(const[c,f]of Object.entries({id:`wire-arrow-${i}`,class:`flow-${i}`,viewBox:"0 0 10 8",refX:9,refY:4,markerWidth:10,markerHeight:8,markerUnits:"userSpaceOnUse",orient:"auto"}))a.setAttribute(c,f);const d=s.createElementNS(ee,"polygon");d.setAttribute("points","0,0 9,4 0,8 2.5,4"),a.append(d),o.append(a)}h.wires.append(o),ar||(ar=new A(i=>{for(const a of i)a.target.classList.toggle("in-view",a.isIntersecting)},{root:h.stage,rootMargin:"80px"}))}for(const[o,i]of So){const a=t.has(o)?n.has(o)?"both":"up":n.has(o)?"down":"";if(i.line.classList.toggle("sel",o===Jt),i.line.classList.toggle("related",!!a),i.carry?.classList.toggle("related",!!a),!a){i.flow?.remove(),i.flow=null;continue}i.flow||(i.flow=s.createElementNS(ee,"path"),i.flow.setAttribute("d",i.line.getAttribute("d")),i.flow.setAttribute("aria-hidden","true"),i.flow.classList.add("flow"),h.wires.append(i.flow)),i.flow.classList.remove("flow-up","flow-down","flow-both"),i.flow.classList.add(`flow-${a}`),i.flow.setAttribute("marker-end",`url(#wire-arrow-${a})`),ar.observe(i.flow)}}function et(e=!0){if(!e){la(),vn();return}if(ar?.disconnect(),So.clear(),h.wires.innerHTML="",!l){h.wires.classList.remove("has-flow"),vn();return}for(const t of l.edges){const n=li(t.from),r=li(t.to);if(!n||!r)continue;const o=n.x+n.w,i=n.y+n.h/2,a=r.x,d=r.y+r.h/2,c=Math.max(50,Math.abs(a-o)*.5),f=`M${o},${i} C${o+c},${i} ${a-c},${d} ${a},${d}`,u=v=>{const w=s.createElementNS(ee,"path");return v&&w.setAttribute("class",v),w.setAttribute("d",f),h.wires.appendChild(w),w},p=u("hit"),b=s.createElementNS(ee,"title");b.textContent=di(t)+(sa(t)?"（风格也顺着这根线往下传）":"")+"　点一下选中，Delete 删除",p.appendChild(b),p.addEventListener("mousedown",v=>{v.stopPropagation(),fa(t)}),p.addEventListener("contextmenu",v=>{v.preventDefault(),v.stopPropagation(),fa(t),Xs(v.clientX,v.clientY,t)});const g=u(Ze(t)?"txt":""),x=sa(t)?u("carry"):null;So.set(t,{line:g,carry:x,flow:null})}la(),vn(),jr()}function $o(e){return{x:e.x,y:e.y,w:Be(e),h:e._el?e._el.offsetHeight:230}}function pi(e=Q,t=230){const n=h.stage.getBoundingClientRect(),r=wn((n.left+n.right)/2,(n.top+n.bottom)/2),o=r.x-e/2,i=r.y-t/2,a=24,d=(l?l.cards:[]).map($o),c=(u,p)=>!d.some(b=>u<b.x+b.w+a&&u+e+a>b.x&&p<b.y+b.h+a&&p+t+a>b.y);if(c(o,i))return{x:Math.round(o),y:Math.round(i)};const f=64;for(let u=1;u<=24;u++)for(const[p,b]of[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const g=o+p*u*f,x=i+b*u*f;if(c(g,x))return{x:Math.round(g),y:Math.round(x)}}return{x:Math.round(o),y:Math.round(i)}}function da(e){let t=1/0,n=1/0,r=-1/0,o=-1/0;for(const i of e){const a=it(i);if(!a)continue;const d=$o(a);t=Math.min(t,d.x),n=Math.min(n,d.y),r=Math.max(r,d.x+d.w),o=Math.max(o,d.y+d.h)}return t===1/0?null:{x:t,y:n,w:r-t,h:o-n}}function Js(e){if(!l||!Ge()||!["left","right","top","bottom","center"].includes(e))return;const t=l.cards.filter(w=>K.has(w.id)).map((w,L)=>({c:w,index:L,...$o(w)}));if(t.length<2)return;const n=Math.min(...t.map(w=>w.x)),r=Math.min(...t.map(w=>w.y)),o=Math.max(...t.map(w=>w.x+w.w)),i=Math.max(...t.map(w=>w.y+w.h)),a=e==="left"||e==="right"||e==="center",d=new Map(t.map(w=>[w.c.id,w])),c=new Map(t.map(w=>[w.c.id,new Set])),f=new Map(t.map(w=>[w.c.id,new Set])),u=new Map(t.map(w=>[w.c.id,0]));for(const w of l.edges)w.from===w.to||!d.has(w.from)||!d.has(w.to)||(c.get(w.from).add(w.to),c.get(w.to).add(w.from),f.get(w.from).has(w.to)||(f.get(w.from).add(w.to),u.set(w.to,u.get(w.to)+1)));const p=new Set,b=[],g=(w,L)=>w.x-L.x||w.y-L.y||w.index-L.index;for(const w of t){if(p.has(w.c.id))continue;const L=[],re=[w.c.id];p.add(w.c.id);for(let Qe=0;Qe<re.length;Qe++){const Fe=re[Qe];L.push(d.get(Fe));for(const ht of c.get(Fe))p.has(ht)||(p.add(ht),re.push(ht))}const Ve=new Set(L),at=[];for(;Ve.size;){const Qe=[...Ve].filter(ht=>u.get(ht.c.id)===0),Fe=(Qe.length?Qe:[...Ve]).sort(g)[0];Ve.delete(Fe),at.push(Fe);for(const ht of f.get(Fe.c.id))u.set(ht,u.get(ht)-1)}b.push({items:at,x:Math.min(...L.map(Qe=>Qe.x)),y:Math.min(...L.map(Qe=>Qe.y)),w:L.reduce((Qe,Fe)=>Qe+Fe.w,0)+24*(L.length-1),h:Math.max(...L.map(Qe=>Qe.h))})}b.sort((w,L)=>a?w.y-L.y||w.x-L.x:w.x-L.x||w.y-L.y);let x=a?r:n;const v=[];for(const w of b){let L=a?e==="left"?n:e==="right"?o-w.w:(n+o-w.w)/2:x;const re=a?x:e==="top"?r:i-w.h;for(const Ve of w.items)v.push({...Ve,nx:L,ny:e==="bottom"?re+w.h-Ve.h:re}),L+=Ve.w+24;x+=(a?w.h:w.w)+24}if(v.some(w=>Math.abs(w.nx-w.x)>1e-7||Math.abs(w.ny-w.y)>1e-7)){for(const{c:w,nx:L,ny:re}of v)w.x=L,w.y=re,w._el&&(w._el.style.left=L+"px",w._el.style.top=re+"px");et(),vt(),Jr(),oe()}}function pa(e,t){if(!ge()||!l)return!1;const n=l.cards.filter(i=>K.has(i.id));if(n.length<2)return!1;const r=l,o=[["left","左对齐"],["right","右对齐"],["top","顶部对齐"],["bottom","底部对齐"],["center","垂直居中对齐"]].map(([i,a])=>({text:a,run:()=>{l===r&&Js(i)}}));return Lt(e,t,"选中节点",[{text:"对齐方式",children:o},{text:`复制选中节点（${n.length} 个）`,run:()=>{l===r&&sr()}},{text:`批量重命名（${n.length} 个节点）`,run:()=>{if(l!==r||!ge())return;const i=l.cards.filter(a=>K.has(a.id));i.length>1&&fi(i[0])}},{text:`批量删除（${n.length} 个节点）`,danger:!0,run:()=>{l!==r||!ge()||l.cards.filter(i=>K.has(i.id)).length>1&&ci()}}]),!0}function vn(){if(!h.groups)return;let e=h.groups.querySelector(".selbox");if(!K.size){e&&e.remove(),h.selbar.style.display="none";return}const t=da(K);if(!t)return K.clear(),vn();if(e||(e=s.createElement("div"),e.className="selbox",h.groups.appendChild(e)),e.style.left=t.x-8+"px",e.style.top=t.y-8+"px",e.style.width=t.w+16+"px",e.style.height=t.h+16+"px",K.size<2){h.selbar.style.display="none";return}h.selbar.style.display="";const n=h.stage.getBoundingClientRect(),r=z.x+t.x*z.k,o=z.y+t.y*z.k;h.selbar.style.left=Math.max(4,Math.min(r,n.width-h.selbar.offsetWidth-4))+"px",h.selbar.style.top=Math.max(50,o-h.selbar.offsetHeight-10)+"px"}function jr(){if(h.groups&&(h.groups.querySelectorAll(".ggroup").forEach(e=>e.remove()),!!l))for(const e of l.groups||[]){const t=da(e.cards);if(!t)continue;const n=12,r=28,o=s.createElement("div");o.className="ggroup",o.style.left=t.x-n+"px",o.style.top=t.y-r+"px",o.style.width=t.w+n*2+"px",o.style.height=t.h+n+r+"px";const i=s.createElement("div");i.className="gglabel",i.textContent=`${e.name}（${e.cards.length}）`,o.appendChild(i),o.onmousedown=a=>{a.button===0&&(a.stopPropagation(),a.preventDefault(),K=new Set(e.cards),Jt=null,et(!1),ua(a,[...e.cards].map(it).filter(Boolean)))},i.ondblclick=a=>{a.stopPropagation(),ca(e)},o.oncontextmenu=a=>{a.preventDefault(),a.stopPropagation(),Lt(a.clientX,a.clientY,e.name,[{icon:"✎",text:"重命名",run:()=>ca(e)},{icon:"✕",text:"删除组（节点保留）",danger:!0,run:()=>{Ge()&&(l.groups=l.groups.filter(d=>d!==e),jr(),oe())}}])},h.groups.appendChild(o)}}function ca(e){if(!Ge())return;const t=prompt("组名",e.name);t!==null&&(e.name=t.trim().slice(0,30)||e.name,jr(),oe())}function ua(e,t,n){if(!ge()||e.button!==0||!t.length)return;e.stopPropagation(),e.preventDefault(),Ut();const r={mx:e.clientX,my:e.clientY,pos:t.map(d=>({c:d,x:d.x,y:d.y}))};let o=!1;const i=d=>{if(!o&&Math.abs(d.clientX-r.mx)+Math.abs(d.clientY-r.my)<4)return;o||(o=!0);const c=(d.clientX-r.mx)/z.k,f=(d.clientY-r.my)/z.k;for(const u of r.pos)u.c.x=Math.round(u.x+c),u.c.y=Math.round(u.y+f),u.c._el&&(u.c._el.style.left=u.c.x+"px",u.c._el.style.top=u.c.y+"px");et(),vt()},a=()=>{s.removeEventListener("mousemove",i),s.removeEventListener("mouseup",a),o?(vt(),oe()):n&&n()};s.addEventListener("mousemove",i),s.addEventListener("mouseup",a)}function ci(){if(!Ge())return;const e=l,t=[...K].map(it).filter(Boolean);if(!t.length)return;const n=t.filter(o=>(o.history||[]).length||(o.outputs||[]).length).length;if(!confirm(`删除选中的 ${t.length} 个节点？
`+(n?`其中 ${n} 个节点有历史记录或产物。
`:"")+"相关连线和节点内记录会一并移除，此操作不能撤销；不会删除素材文件。")||l!==e||!ge())return;const r=va(t.map(o=>o.id));r&&ce(`已删除 ${r} 个节点`)}function fa(e){Jt=e,le=null,kn(),Ut(),rn();for(const t of l.cards)t._el&&t._el.classList.remove("sel");et(),ce(di(e)+" · Delete 删除")}function Xs(e,t,n){const r=it(n.from),o=it(n.to);Lt(e,t,di(n),[...r?[{icon:"◧",text:`选中上游「${ve(r)}」`,run:()=>At(r.id)}]:[],...o?[{icon:"◨",text:`选中下游「${ve(o)}」`,run:()=>At(o.id)}]:[],{icon:"✕",text:n.slot===Ot?"断开这段文本":Ze(n)?"解除这个风格节点":"删除连线",danger:!0,run:()=>Yr(n)}])}function Yr(e){if(!Ge())return;const t=!Ze(e)&&si(e);Un([e],!1),Jt===e&&(Jt=null),et(),fe(),le&&je(le),oe(),ce(e.slot===Ot?"已断开这段文本输入":Ze(e)?"已解除风格":t?"已删除连线，并清除下游引用":"已删除连线")}function At(e){le=e,K.clear(),Jt=null,et(!1);for(const t of l.cards)t._el&&t._el.classList.toggle("sel",t.id===e);Pr(e),je(e)}function Ys(e,t,n){if(!ge()){e.stopPropagation(),At(t.id);return}if(e.button!==0)return;const r=K.has(t.id)&&l.cards.filter(i=>K.has(i.id)).length>1;let o=r?[...K]:null;if(!o){const i=new Set;for(const a of l.groups||[])a.cards.includes(t.id)&&a.cards.forEach(d=>i.add(d));i.size>1&&(o=[...i])}r?kn():At(t.id),ua(e,o?o.map(it).filter(Boolean):[t],r?()=>At(t.id):void 0)}function ma(e,t,n,r){if(!Ge()||e.button!==0)return;e.stopPropagation(),e.preventDefault(),Ut(),At(t.id);const o=n.querySelector(".body"),i={mx:e.clientX,my:e.clientY,x:t.x,y:t.y,w:Be(t),h:t.h||o.offsetHeight,ch:n.offsetHeight},a=(u,p,b)=>Math.max(p,Math.min(b,Math.round(u)));let d=!1;const c=u=>{!d&&Math.abs(u.clientX-i.mx)+Math.abs(u.clientY-i.my)<3||(d||(d=!0),t.w=a(i.w+(u.clientX-i.mx)/z.k*r,_e,Ie),u.shiftKey||(t.h=a(i.h+(u.clientY-i.my)/z.k*r,Pe,He)),In(t),r<0&&(t.x=i.x+(i.w-t.w),t.y=i.y+(i.ch-n.offsetHeight),n.style.left=t.x+"px",n.style.top=t.y+"px"),et(),vt())},f=()=>{s.removeEventListener("mousemove",c),s.removeEventListener("mouseup",f),d&&(vt(),oe())};s.addEventListener("mousemove",c),s.addEventListener("mouseup",f)}function Vs(e,t){if(e.button!==0||!Ge())return;e.stopPropagation(),e.preventDefault(),Ut();const n=li(t.id),r=s.createElementNS(ee,"path");r.setAttribute("class","tmp"),h.wires.appendChild(r);const o=n.x+n.w,i=n.y+n.h/2;h.world.classList.add("wiring");let a=null;const d=f=>{const u=wn(f.clientX,f.clientY);a=u;const p=Math.max(50,Math.abs(u.x-o)*.5);r.setAttribute("d",`M${o},${i} C${o+p},${i} ${u.x-p},${u.y} ${u.x},${u.y}`)},c=f=>{s.removeEventListener("mousemove",d),s.removeEventListener("mouseup",c),r.remove(),h.world.classList.remove("wiring");const u=f.target.closest&&f.target.closest(".card");u&&u.dataset.id!==t.id?$a(t,l.cards.find(p=>p.id===u.dataset.id)):a&&pl(t,a,f.clientX,f.clientY)};s.addEventListener("mousemove",d),s.addEventListener("mouseup",c)}function Ks(){for(const o of["beforeinput","input","change","paste","drop","dragover","click","mousedown","pointerdown","contextmenu","keydown"])s.addEventListener(o,i=>{if(ge()||!l)return;const a=i.target;if(a.closest?.("#panel, #respop")){cd(i)&&(i.preventDefault(),i.stopImmediatePropagation());return}const c=a.closest?.("#dock, #selbar"),f=a.closest?.("#world input, #world textarea, #world select, #world [contenteditable]"),u=["paste","drop","dragover"].includes(o)&&a.closest?.("#stage");(c||f||u)&&(i.preventDefault(),i.stopImmediatePropagation())},!0);matchMedia("(max-width: 760px)").matches&&s.body.classList.add("collapsed"),j("#toggle").setAttribute("aria-expanded",String(!s.body.classList.contains("collapsed"))),j("#toggle").onclick=()=>{const o=s.body.classList.toggle("collapsed");j("#toggle").setAttribute("aria-expanded",String(!o))},j("#createHere").onclick=Ms,Gs(),h.fit.onclick=()=>{z={x:60,y:70,k:1},Ln(),vt(),Qt()},h.jobsbtn.onclick=Kn,h.selbar.innerHTML="";const e=s.createElement("button");e.className="mkgroup",e.textContent="▦ 打组",e.title="把选中的节点圈成一个组：拖分组框整体移动；双击组名改名，右键框删组（节点保留）",e.onclick=()=>{if(!ge()||K.size<2)return;if(l.groups=l.groups||[],l.groups.find(i=>i.cards.length===K.size&&i.cards.every(a=>K.has(a))))return ce("这几张已经是同一组了");l.groups.push({id:qt(),name:`组 ${l.groups.length+1}`,cards:[...K]}),vn(),jr(),oe(),ce("已打组：拖组里的节点或分组框 = 整组一起动；双击组名改名，右键框删组")};const t=s.createElement("button");t.className="renamecards act",t.textContent="批量重命名",t.title="一次填写所有选中节点的新名称，统一确认；留空恢复默认名称",t.onclick=()=>{K.size>1&&fi(it([...K][0]))};const n=s.createElement("button");n.className="deletecards act danger",n.textContent="批量删除",n.title="删除框选的所有节点（Delete / Backspace），操作前统一确认",n.onclick=ci,h.selbar.append(e,t,n),h.selbar.onmousedown=o=>o.stopPropagation(),P("resize",()=>{hl(),vt(),Rt(),vn()}),h.stage.addEventListener("mousemove",o=>{Nr=wn(o.clientX,o.clientY),ta(Nr.x,Nr.y)}),h.stage.addEventListener("mouseleave",()=>{Nr=null,ta(0,0,!1)}),h.stage.addEventListener("mousedown",o=>{if(S||o.target.closest("#selbar")||o.target.closest("#panel"))return;if(o.button===1||o.button===0&&o.shiftKey){o.preventDefault();const f={mx:o.clientX,my:o.clientY,x:z.x,y:z.y};h.stage.classList.add("panning");let u=!1;const p=g=>{u||(u=!0,La(!0)),z.x=f.x+g.clientX-f.mx,z.y=f.y+g.clientY-f.my,Ln()},b=()=>{if(h.stage.classList.remove("panning"),s.removeEventListener("mousemove",p),s.removeEventListener("mouseup",b),u&&o.button===0){const g=x=>{x.preventDefault(),x.stopImmediatePropagation()};s.addEventListener("click",g,{capture:!0,once:!0}),G(()=>s.removeEventListener("click",g,!0),0)}u&&(La(!1),vt(),Qt())};s.addEventListener("mousemove",p),s.addEventListener("mouseup",b);return}if(o.button!==0)return;o.preventDefault(),kn(),$n(),le=null,rn(),Jt=null;for(const f of l?l.cards:[])f._el&&f._el.classList.remove("sel");K.clear(),et(!1);const i={mx:o.clientX,my:o.clientY};let a=!1;const d=f=>{if(!a&&Math.abs(f.clientX-i.mx)+Math.abs(f.clientY-i.my)<4)return;a=!0;const u=Math.min(i.mx,f.clientX),p=Math.min(i.my,f.clientY),b=Math.max(i.mx,f.clientX),g=Math.max(i.my,f.clientY),x=h.stage.getBoundingClientRect();h.lasso.style.display="",h.lasso.style.left=u-x.left+"px",h.lasso.style.top=p-x.top+"px",h.lasso.style.width=b-u+"px",h.lasso.style.height=g-p+"px";const v=wn(u,p),w=wn(b,g);if(K.clear(),l)for(const L of l.cards){const re=$o(L);re.x<w.x&&re.x+re.w>v.x&&re.y<w.y&&re.y+re.h>v.y&&K.add(L.id)}vn()},c=()=>{if(s.removeEventListener("mousemove",d),s.removeEventListener("mouseup",c),h.lasso.style.display="none",!!a)if(K.size===1){const f=[...K][0];K.clear(),At(f)}else et(!1),K.size&&ce(`选中 ${K.size} 个节点：拖动整体移动 · 右键对齐 / 批量删除 · Delete 全删 · 上方按钮打组 / 批量重命名 / 批量删除`)};s.addEventListener("mousemove",d),s.addEventListener("mouseup",c)}),h.stage.addEventListener("wheel",o=>{if(S||!l)return;o.preventDefault();const i=wn(o.clientX,o.clientY),a=Math.min(qe,Math.max($e,z.k*(o.deltaY<0?1.1:1/1.1))),d=h.stage.getBoundingClientRect();z.x=o.clientX-d.left-i.x*a,z.y=o.clientY-d.top-i.y*a,z.k=a,Ln(),typeof Qt=="function"?Qt():oe()},{passive:!1}),h.stage.addEventListener("contextmenu",o=>{if(o.preventDefault(),S||!ge()||o.target.closest(".card, #panel, #selbar, #dock, #respop")||(Ut(),pa(o.clientX,o.clientY)))return;const i=wn(o.clientX,o.clientY),a=[];a.push({group:"生成节点"});const d=H.find(u=>u.kind==="text");d&&a.push({icon:d.icon||"✍",text:"文本",run:()=>{xn(d.id,i.x,i.y,d.modes[0]?Nt(d.modes[0]):null)}}),H.filter(u=>u.kind==="gen").forEach(u=>{let p=u.name;p==="生图"?p="图片":p==="生视频"&&(p="视频"),a.push({icon:u.icon||"◻",text:p,run:()=>{xn(u.id,i.x,i.y,u.modes[0]?Nt(u.modes[0]):null)}})});const f=H.find(u=>u.id==="card_tools");f&&(a.push({group:"工具"}),a.push({icon:f.icon||"◻",text:"工具",run:()=>xn(f.id,i.x,i.y)})),a.push({group:"其他"}),a.push({icon:"📎",text:"上传素材",run:()=>{const u=s.createElement("input");u.type="file",u.accept="image/*,video/*,audio/*",u.onchange=async p=>{const b=p.target.files[0];if(b)try{const g=await Yt(b),x=H.find(w=>w.kind==="asset");if(!x)return be("找不到素材节点定义");const v=xn(x.id,i.x,i.y,x.modes[0].id);if(!v)return;await ao(v,g),ce("已上传："+g.origin)}catch(g){be("上传失败："+g.message)}},u.click()}}),Jn&&a.push({icon:"⧉",text:"粘贴刚复制的节点（Ctrl+V）",run:()=>{Nr=i,bi()}}),a.length>0&&Lt(o.clientX,o.clientY,"画布",a)}),h.stage.addEventListener("dragover",o=>{S||!ge()||(o.preventDefault(),o.dataTransfer.dropEffect="copy")}),h.stage.addEventListener("drop",async o=>{if(S||!ge())return;if(o.preventDefault(),[...o.dataTransfer?.types||[]].includes(Ni)){o.stopPropagation();const f=oo;if(oo=null,!f||l!==f.project||o.dataTransfer.getData(Ni)!==f.token)return;const u=wn(o.clientX,o.clientY);try{const p=await Ci(f.output);if(!await wa(f.project,p,Math.round(u.x-134),Math.round(u.y-84)))return;ce(`已建素材节点：${p.origin||f.output.filename||"历史产物"}`)}catch(p){l===f.project&&be("导入历史产物失败："+p.message)}return}const i=[...o.dataTransfer?.files||[]];if(!i.length)return;const a=i.filter(f=>f.type.startsWith("image/")||f.type.startsWith("video/")||f.type.startsWith("audio/"));if(!a.length)return ce("只支持图片、视频、音频文件");const d=wn(o.clientX,o.clientY),c=l;for(const f of a){if(l!==c||!ge())return;try{const u=await Yt(f),p={x:Math.round(d.x-134),y:Math.round(d.y-84)};if(!await wa(c,u,p.x,p.y))return;ce(`已建素材节点：${u.origin||f.name}`),d.x+=50,d.y+=50}catch(u){l===c&&be(`上传失败 ${f.name}：${u.message}`)}}}),h.view.addEventListener("mousedown",o=>{o.target===h.view&&Kr()}),P("mousedown",o=>{h.respop.style.display!=="none"&&(h.respop.contains(o.target)||Pn())},!0),P("mousedown",o=>{h.menu.style.display!=="none"&&!h.menu.contains(o.target)&&!o.target.closest(".tcap")&&kn()},!0),s.addEventListener("paste",ll),s.addEventListener("keydown",o=>{if(s.querySelector("dialog[data-image-composer][open]"))return;if(h.view.style.display!=="none"&&(o.key==="ArrowLeft"||o.key==="ArrowRight")){o.preventDefault(),ga(o.key==="ArrowRight"?1:-1);return}const i=o.target,a=(i.tagName||"").toLowerCase(),d=a==="input"||a==="textarea"||a==="select"||i.isContentEditable;if(l&&!S&&!d&&h.view.style.display==="none"){if((/Mac/i.test(navigator.platform)?o.metaKey&&!o.ctrlKey:o.ctrlKey&&!o.metaKey)&&!o.altKey&&["z","y"].includes(o.key.toLowerCase())){o.preventDefault(),Ls(o.key.toLowerCase()==="y"||o.shiftKey);return}const f=it(le);if(!ge()&&(["Delete","Backspace"].includes(o.key)||(o.ctrlKey||o.metaKey)&&o.key.toLowerCase()==="v")){o.preventDefault();return}if(o.key==="Delete"||o.key==="Backspace"){if(Jt){o.preventDefault(),Yr(Jt);return}if(K.size>1){o.preventDefault(),ci();return}if(f){o.preventDefault(),ka(f);return}}if((o.ctrlKey||o.metaKey)&&!o.shiftKey&&!o.altKey){const u=o.key.toLowerCase();if(u==="c"&&(f||K.size)){o.preventDefault(),sr(f);return}if(u==="v"){if(vi())return;o.preventDefault(),bi();return}}if(o.key.toLowerCase()==="h"&&f&&!o.ctrlKey&&!o.metaKey&&!o.shiftKey&&!o.altKey){o.preventDefault();const u=h.stage.getBoundingClientRect(),p=u.top+u.height*.3,b=u.left+u.width*.5,g=f.x+(f._el?f._el.offsetWidth/2:Q/2),x=f.y+(f._el?f._el.offsetHeight/2:168/2);z.x=b-g*z.k,z.y=p-x*z.k,Ln(),vt(),Qt();return}}if(o.key==="Escape"){if(h.respop.style.display!=="none"){Pn();return}if(h.view.style.display!=="none"){Kr();return}if(h.jobs.style.display!=="none"){$n();return}if(kn(),Ut(),!S){le=null,rn(),Jt=null,K.clear(),et(!1);for(const c of l?l.cards:[])c._el&&c._el.classList.remove("sel")}}}),h.minimapBtn.onclick=Fs,Ds();let r=!0;h.wiresToggle.onclick=()=>{r=!r,h.wires.style.display=r?"":"none",h.wiresToggle.classList.toggle("active",!r),s.querySelectorAll(".card .inp, .card .out").forEach(o=>{o.style.display=r?"":"none"})},h.zoomMenu.onclick=o=>{const i=()=>{typeof Qt=="function"?Qt():oe()},a=c=>{const f=h.stage.getBoundingClientRect(),u=wn(f.left+f.width/2,f.top+f.height/2);z.x=f.width/2-u.x*c,z.y=f.height/2-u.y*c,z.k=c,Ln(),vt(),i()},d=[...[500,300,200,125,100,75,50,25,10].map(c=>({icon:c>100?"+":c===100?"1:1":"−",text:`${c>100?"放大":c===100?"重置":"缩小"} (${c}%)`,run:()=>a(c/100)})),{icon:"□",text:"适应画布",run:()=>{z={x:60,y:70,k:1},Ln(),vt(),i()}}];Lt(o.clientX,o.clientY-200,"缩放",d)}}let jo=0;function Lt(e,t,n,r){jo++,h.menu.innerHTML="";const o=s.createElement("div");o.className="hd",o.textContent=n,h.menu.appendChild(o);for(const i of r){if(i.group){const u=s.createElement("div");u.className="grp",u.textContent=i.group,h.menu.appendChild(u);continue}const a=s.createElement("button");a.disabled=!!i.disabled,i.disabled&&(a.style.opacity="0.45"),i.danger&&(a.className="danger");const d=s.createElement("span");d.textContent=i.icon||"▸";const c=s.createElement("span");c.textContent=i.text,a.append(d,c);const f=()=>{h.menu.querySelectorAll(".menu-submenu").forEach(u=>u.style.display="none"),h.menu.querySelectorAll('[aria-haspopup="menu"]').forEach(u=>u.setAttribute("aria-expanded","false"))};if(i.children){const u=s.createElement("span");u.className="submenu-arrow",u.textContent="›",u.setAttribute("aria-hidden","true"),a.appendChild(u),a.setAttribute("aria-label",i.text),a.setAttribute("aria-haspopup","menu"),a.setAttribute("aria-expanded","false");const p=s.createElement("div");p.className="menu-submenu",p.style.display="none",p.setAttribute("aria-label",i.text);for(const g of i.children){const x=s.createElement("button"),v=s.createElement("span");v.textContent=g.icon||"▸";const w=s.createElement("span");w.textContent=g.text,x.append(v,w),x.onclick=()=>{kn(),Ut(),g.run()},p.appendChild(x)}const b=()=>{f(),p.style.display="",a.setAttribute("aria-expanded","true");const g=h.menu.getBoundingClientRect(),x=a.getBoundingClientRect(),v=p.offsetWidth,w=p.offsetHeight,L=g.right+v>innerWidth-8?g.left-v+1:g.right-1;p.style.left=Math.max(8,L)-g.left-h.menu.clientLeft+"px",p.style.top=Math.max(8,Math.min(x.top,innerHeight-w-8))-g.top-h.menu.clientTop+"px"};a.onmouseenter=b,a.onclick=b,a.onkeydown=g=>{g.key==="ArrowRight"&&(g.preventDefault(),b(),p.querySelector("button").focus())},p.onkeydown=g=>{g.key==="ArrowLeft"&&(g.preventDefault(),f(),a.focus())},h.menu.append(a,p)}else a.onmouseenter=f,a.onclick=()=>{kn(),Ut(),i.run()},h.menu.appendChild(a);i.tip&&xo(a,i.tip)}h.menu.style.display="",h.menu.style.left=Math.min(e,innerWidth-h.menu.offsetWidth-8)+"px",h.menu.style.top=Math.min(t,innerHeight-h.menu.offsetHeight-8)+"px"}const kn=()=>{jo++,h.menu.style.display="none"};function Vr(e,t,n){const r=s.createElement("button");r.className="tcap";const o=s.createElement("span");o.textContent=e;const i=s.createElement("i");return i.textContent="▴",r.append(o,i),r.title=t+" —— 点击换",r.onclick=a=>{a.stopPropagation();const d=r.getBoundingClientRect();Lt(d.left,d.bottom+4,t,n());const c=h.menu;d.bottom+c.offsetHeight+12>innerHeight&&(c.style.top=Math.max(48,d.top-c.offsetHeight-8)+"px")},r}function Gs(){const e=(r,o,i,a)=>{const d=s.createElement("button");d.className="dockb",d.title=i;const c=s.createElement("span");c.textContent=r;const f=s.createElement("span");return f.textContent=o,d.append(c,f),d.onmousedown=u=>u.stopPropagation(),d.onclick=u=>{u.stopPropagation(),a(d)},d},t=r=>()=>{if(!l)return;const o=pi();xn(r,o.x,o.y)},n=()=>{const r=s.createElement("div");return r.className="sep",r};h.dock.innerHTML="",h.dock.append(e("↥","上传","选一个图片/视频文件，放进一个素材节点 —— 再把它的出口拖到别的节点上就能反复用",Ol),n(),e("T","文本","新建一个文本节点：存一段字，连到生成节点就并进提示词",t("card_text")),e("▧","图片","新建一个生图节点（默认文生图，玩法在参数面板左下角换）",t("card_image")),e("▷","视频","新建一个生视频节点（默认图生视频，玩法在参数面板左下角换）",t("card_video")),e("◇","工具箱","新建工具箱节点（玩法在参数面板左下角切换）",t("card_tools")))}const ha={video:"放大播放",audio:"放大播放"};let We=null;function No(){We?.image&&(We.image.style.transform=`translate3d(${We.x}px, ${We.y}px, 0) scale(${We.scale})`)}function Zs(){We?.image&&(We.scale=1,We.x=0,We.y=0,No())}function Qs(e){We.image=e,We.scale=1,We.x=0,We.y=0,e.classList.add("vimage"),e.title="滚轮缩放 · 拖拽平移 · 双击还原",No(),e.addEventListener("wheel",r=>{if(!We||We.image!==e)return;r.preventDefault();const o=We.scale,i=Math.min(8,Math.max(.2,o*Math.exp(-r.deltaY*.0015)));if(i===o)return;const a=e.getBoundingClientRect(),d=i/o;We.x+=(r.clientX-(a.left+a.width/2))*(1-d),We.y+=(r.clientY-(a.top+a.height/2))*(1-d),We.scale=i,No()},{passive:!1});let t=null;e.addEventListener("pointerdown",r=>{r.button!==0||!We||We.image!==e||(r.preventDefault(),t={id:r.pointerId,mx:r.clientX,my:r.clientY,x:We.x,y:We.y},e.setPointerCapture(r.pointerId),e.classList.add("panning"))}),e.addEventListener("pointermove",r=>{!t||r.pointerId!==t.id||!We||We.image!==e||(We.x=t.x+r.clientX-t.mx,We.y=t.y+r.clientY-t.my,No())});const n=r=>{!t||r.pointerId!==t.id||(t=null,e.classList.remove("panning"),e.hasPointerCapture(r.pointerId)&&e.releasePointerCapture(r.pointerId))};e.addEventListener("pointerup",n),e.addEventListener("pointercancel",n),e.ondblclick=r=>{r.preventDefault(),Zs()}}function Kr(){h.vbox.innerHTML="",h.view.style.display="none",We=null}function Gr(e,t=0,n=null,r=void 0){const o=n||e.outputs||[];if(!o.length){ce("这个节点还没有产物，先运行一次");return}We={outs:o,idx:Math.min(Math.max(t,0),o.length-1),seed:r!==void 0?r:e?e.seed:null},ba(),h.view.style.display=""}function ga(e){if(!We)return;const t=We.outs.length;t<2||(We.idx=(We.idx+e+t)%t,ba())}function ba(){const{outs:e,idx:t,seed:n}=We,r=e[t];We.image=null,We.scale=1,We.x=0,We.y=0;const o=s.createElement("div");o.className="vinfo";const i=[r.filename];e.length>1&&i.unshift(`${t+1} / ${e.length}`),n!=null&&i.push("seed "+n);const a=()=>o.textContent=i.join("　·　");let d;if(r.kind==="video"){d=s.createElement("video"),d.controls=d.autoplay=d.loop=!0;const f=()=>{const u=d.play();u&&typeof u.catch=="function"&&u.catch(()=>{})};d.readyState>=3?f():d.addEventListener("canplay",f,{once:!0}),eo(d,r.url),d.onloadedmetadata=()=>{i.splice(i.indexOf(r.filename)+1,0,`${d.videoWidth}×${d.videoHeight}`,xa(d.duration)),a()}}else r.kind==="audio"?(d=s.createElement("audio"),d.src=r.url,d.controls=d.autoplay=!0,d.onloadedmetadata=()=>{i.splice(i.indexOf(r.filename)+1,0,xa(d.duration)),a()}):(d=s.createElement("img"),d.src=r.url,i.push("滚轮缩放 · 拖拽平移 · 双击还原"),d.onload=()=>{i.splice(i.indexOf(r.filename)+1,0,`${d.naturalWidth}×${d.naturalHeight}`),a()},Qs(d));d.draggable=!1,a();const c=s.createElement("button");if(c.className="vx",c.textContent="✕",c.title="关闭 (Esc)",c.onclick=Kr,h.vbox.innerHTML="",h.vbox.append(d,o,c),e.length>1)for(const[f,u,p]of[["p","‹",-1],["n","›",1]]){const b=s.createElement("button");b.className="vnav "+f,b.textContent=u,b.title=p<0?"上一张 (←)":"下一张 (→)",b.onclick=()=>ga(p),h.vbox.appendChild(b)}}function xa(e){if(!isFinite(e))return"时长未知";const t=Math.round(e);return`${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`}const ui=e=>on()&&!e.locked&&!e.readonly&&!e.read_only&&["card_image","card_video"].includes(e.type)&&ke(e)?.kind==="gen";async function el(e){const t=l?.id,n=e.id;if(!ui(e))return ce("此节点或画布不可加入导演台");try{if(await Vn(t),e=l?.cards.find(a=>a.id===n),!e||!ui(e))throw new Error("节点已删除、锁定或不可操作");let r=qo(e);if(!r){Ct++;try{const a=await jt(`/api/projects/${encodeURIComponent(t)}/director/import`,{rev:l.director?.rev||0,canvas_rev:l.rev||0,cards:[n]});if(l?.id!==t)throw new Error("画布已切换");if(r=qo(e,a.project),!r)throw new Error("导入接口未返回关联镜头");_o(a.project)}finally{Ct=Math.max(0,Ct-1),oi()}}const o=`/director?project=${encodeURIComponent(t)}&shot=${encodeURIComponent(r.id)}`;q.open(o,"_blank","noopener"),ce("导演镜头已就绪");const i=s.createElement("a");i.href=o,i.target="_blank",i.rel="noopener",i.textContent="打开导演镜头",h.toast.append(" · ",i)}catch(r){be("导演台操作失败："+r.message)}}function tl(e,t,n){if(!ge())return Lt(e,t,ve(n),[{text:"复制节点",run:()=>sr(n)},...(n.outputs||[]).length?[{text:"预览产物",run:()=>Gr(n)}]:[]]);const r=ke(n),o={icon:"✎",text:K.size>1&&K.has(n.id)?`批量重命名（${K.size} 个节点）`:"重命名节点",run:()=>fi(n)};if(Wt(n)){const f=l.edges.filter(u=>u.from===n.id&&Ze(u)).length;return Lt(e,t,n.name||"风格化提示词",[o,{icon:"⧉",text:"就地复制一张",run:()=>zo(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>sr(n)},...f?[{icon:"⊘",text:`解除挂着的 ${f} 个节点`,run:()=>{l.edges=l.edges.filter(u=>!(u.from===n.id&&Ze(u))),et(),fe(),le&&je(le),oe()}}]:[],...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Mo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>Qr(n.id)}])}if(nn(n))return Lt(e,t,n.name||ve(n),[...zn(n)?[{icon:"↑",text:"运行（加工文本）",run:()=>Bo(n)}]:[],o,{icon:"⧉",text:"就地复制一张",run:()=>zo(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>sr(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Mo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>Qr(n.id)}]);if(dt(n)){const f=Bn(n);return Lt(e,t,n.name||ve(n),[...f?[{icon:"⛶",text:ha[f.kind]||"查看大图",run:()=>ro(f)}]:[],...f?[{icon:"⬇",text:`下载${Je[f.kind]||"文件"}`,run:()=>Zr(f)}]:[],{icon:"📁",text:"选择 / 换文件",run:()=>Fo(n)},o,{icon:"⧉",text:"就地复制一张",run:()=>zo(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>sr(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Mo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>Qr(n.id)}])}const i=n.outputs||[],a=i[0],d=i.length>1?`逐张看大图（${i.length} 张）`:ha[a&&a.kind]||"查看大图",c=i.length>1?`下载全部 ${i.length} 张${a.kind==="video"?"视频":a.kind==="audio"?"音频":"图片"}`:`下载${a?.kind==="video"?"视频":a?.kind==="audio"?"音频":"图片"}`;Lt(e,t,n.name||(r?r.name:"节点"),[...!S&&ui(n)?[{text:qo(n)?"查看导演镜头":"加入导演台",run:()=>el(n)}]:[],...a?[{icon:"⛶",text:d,run:()=>Gr(n)}]:[],...a?[{icon:"⬇",text:c,run:()=>i.forEach(f=>Zr(f))}]:[],o,{icon:"↑",text:"运行",run:()=>Bo(n)},{icon:"⧉",text:"就地复制一张",run:()=>zo(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>sr(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Mo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>Qr(n.id)}])}function Zr(e){const t=s.createElement("a");t.href=e.url,t.download=e.filename.split(/[\\/]/).pop()||"download",s.body.appendChild(t),t.click(),t.remove()}function Mo(e){Ge()&&(delete e.w,delete e.h,In(e),et(),vt(),oe())}function fi(e){if(!e||!Ge())return;if(K.size>1&&K.has(e.id)){const r=l.cards.filter(o=>K.has(o.id)).sort((o,i)=>o.y-i.y||o.x-i.x);if(r.length>1)return nl(r)}const t=ke(e),n=prompt("节点名字（留空恢复成工作流名）",e.name||(t?t.name:""));n!==null&&ya([{card:e,name:n}])}function nl(e){const t=l,n=s.createElement("dialog");n.className="auth-dialog rename-dialog";const r=s.createElement("form"),o=s.createElement("h2");o.id="rename-heading",o.textContent=`批量重命名（${e.length} 个节点）`,n.setAttribute("aria-labelledby",o.id);const i=s.createElement("p");i.className="auth-note",i.textContent="按画布从上到下、从左到右排列。一次填好各节点名称后统一确认；留空恢复默认名称。";const a=s.createElement("div");a.className="rename-list";const d=e.map((p,b)=>{const g=s.createElement("label");g.className="fld";const x=s.createElement("span");x.textContent=`${b+1}. ${ve(p)}`;const v=s.createElement("input");return v.type="text",v.maxLength=40,v.value=ve(p),v.placeholder=ve({...p,name:null}),g.append(x,v),a.appendChild(g),{card:p,input:v}}),c=s.createElement("footer"),f=s.createElement("button");f.type="button",f.className="btn",f.textContent="取消";const u=s.createElement("button");u.type="submit",u.className="btn primary",u.textContent="确认重命名",c.append(f,u),r.append(o,i,a,c),n.appendChild(r),f.onclick=()=>n.close(),n.addEventListener("close",()=>n.remove()),n.addEventListener("keydown",p=>p.stopPropagation()),r.onsubmit=p=>{p.preventDefault(),l===t&&Ge()&&ya(d.map(({card:b,input:g})=>({card:b,name:g.value}))),n.close()},s.body.appendChild(n),n.showModal(),d[0].input.focus(),d[0].input.select()}function ya(e){const t=e.map(({card:r,name:o})=>({card:r,name:o.trim().slice(0,40)||null})).filter(({card:r,name:o})=>l.cards.includes(r)&&o!==(r.name||null)&&!(o&&o===ve(r)));if(!t.length)return;const n=new Map;for(const{card:r,name:o}of t){const i=ve(r),a=ve({...r,name:o});i!==a&&n.set(`@${i}`,`@${a}`)}if(n.size){const r=[...n.keys()].sort((i,a)=>a.length-i.length).map(i=>i.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")),o=new RegExp(`(?:${r.join("|")})(?![\\u4e00-\\u9fa5\\w])`,"g");for(const i of l.cards){for(const a of k(ke(i))){const d=i.params?.[a.key];typeof d=="string"&&(i.params[a.key]=d.replace(o,c=>n.get(c)))}for(const a in i.opt||{})typeof i.opt[a]=="string"&&(i.opt[a]=i.opt[a].replace(o,d=>n.get(d)))}}for(const{card:r,name:o}of t)r.name=o,Gt(r);le&&_n(le),oe()}function zo(e){if(Ge())return _a(Ca(e),{x:e.x+24+Q/2,y:e.y+28+40})}function mi(e,t){if(!l||!e?.id)return;const n=l.cards.find(r=>r.id===e.id);if(n)for(const r of["created_by","created_by_name","created_at"])e[r]!==void 0&&(n[r]=e[r]);else{const r=JSON.parse(JSON.stringify(e));To(r),l.cards.push(r),h.world.appendChild(ii(r)),et(),jr(),Jr(),h.hint.textContent=`${l.cards.length} 个节点`,ce(`${r.created_by_name||"协作者"} 添加了「${r.name||"新节点"}」`)}Number.isFinite(t)&&(l.rev=Math.max(l.rev||0,t))}function wa(e,t,n,r){return X((async()=>{const o=()=>l===e&&ge();if(!o())return null;for(;;){const a=Ke.pendingChain;if(await a,!o())return null;if(a===Ke.pendingChain)break}const i=xn("card_asset",n,r,null,!1);return!i||(At(i.id),await ao(i,t),!await i._create||!o()||!e.cards.includes(i))?null:i})())}function rl(e,t){if(!l||e.id!==l.id)return;const n=t.id,r=l.edges.filter(p=>p.from===n||p.to===n),o=(l.groups||[]).filter(p=>p.cards.includes(n)),i=(e.cards||[]).find(p=>p.id===n);if(i)for(const p of["created_by","created_by_name","created_at"])t[p]=i[p];const a=(e.cards||[]).filter(p=>p.id!==n);a.push(t);const d=e.edges||[],c=new Set(d.map(p=>JSON.stringify(p)));for(const p of r){const b=JSON.stringify(p);c.has(b)||(d.push(p),c.add(b))}const f=(e.groups||[]).filter(p=>!p.cards.includes(n));f.push(...o);const u=h.panel.style.display!=="none";Object.assign(l,e,{cards:a,edges:d,groups:f}),Dt&&Dt.rev<=l.rev&&(Dt=null),ir(),u&&le&&je(le)}function ol(e){!l||e.created_by||(l.cards=l.cards.filter(t=>t!==e),l.edges=l.edges.filter(t=>t.from!==e.id&&t.to!==e.id),l.groups=(l.groups||[]).map(t=>({...t,cards:t.cards.filter(n=>n!==e.id)})).filter(t=>t.cards.length),K.delete(e.id),le===e.id&&(le=null,rn()),ir())}function il(e,t=!1){const n=l,r=n.id;return Ke.enqueueCardCreate(async()=>{try{const o=await jt(`/api/projects/${encodeURIComponent(r)}/cards`,{card:wo(e)});if(t){if(l!==n||!n.cards.includes(e))return!1;const i=o.project.cards.find(a=>a.id===e.id);mi(i,o.project.rev)}else{if(l?.id!==r)return!1;if(!n.cards.includes(e)){const i=o.project.cards.find(a=>a.id===e.id);return n.cards.some(a=>a.id===e.id)?mi(i,o.project.rev):l.rev=Math.max(l.rev||0,o.project.rev||0),!1}rl(o.project,e)}return!0}catch(o){(t?l===n:l?.id===r)&&(Ke.markWorkFailure(o),ol(e),be("卡片添加失败："+o.message))}})}function xn(e,t,n,r,o=!0){if(!Ge())return null;const i=Kt(e);if(!i||!i.modes||!i.modes.length)return be(`节点类型 ${e} 不可用：找不到定义或没有模式`),null;const a={id:qt(),type:e,cap:r||Nt(i.modes[0]),x:Math.round(t),y:Math.round(n),params:{},assets:{},status:null,progress:0,outputs:[]},c=l.cards.filter(u=>_t(u)===i).reduce((u,p)=>{if(!p.name)return u;const b=p.name.match(/^(.+?)(\d+)$/);return b?Math.max(u,parseInt(b[2],10)):u},0),f=i.name||i.modes[0].name;return a.name=`${f}${c+1}`,ni(),l.cards.push(a),h.world.appendChild(ii(a)),o&&At(a.id),et(),a._create=il(a,!o),queueMicrotask(Co),a}function Qr(e){return va([e])}function va(e){if(!l||!Ge())return 0;const t=new Set(e),n=new Set(l.cards.filter(r=>t.has(r.id)).map(r=>r.id));if(!n.size)return 0;Un(l.edges.filter(r=>n.has(r.from))),l.cards=l.cards.filter(r=>!n.has(r.id)),l.edges=l.edges.filter(r=>!n.has(r.to));for(const r of n)K.delete(r);if(l.groups){for(const r of l.groups)r.cards=r.cards.filter(o=>!n.has(o));l.groups=l.groups.filter(r=>r.cards.length)}return n.has(le)&&(le=null,rn()),Ut(),n.has(h.hist._id)&&Yn(),Jt=null,ir(),oe(),n.size}function ka(e){if(!l||!Ge()||!e||it(e.id)!==e)return;const t=l,n=e.id,r=ve(e),o=(e.history||[]).length,i=(e.outputs||[]).length||o;confirm(`删除「${r}」？
`+(i?`它有 ${o} 轮生成记录或产物，节点内记录删除后无法恢复。
`:"")+"相关连线会一并移除，此操作不能撤销；不会删除素材文件。")&&(l!==t||!ge()||it(n)!==e||Qr(n)&&ce(`已删除「${r}」`))}let Jn=null,Nr=null,hi=0;function gi(e){return JSON.parse(JSON.stringify({id:e.id,type:e.type,cap:e.cap,name:e.name||null,w:e.w,h:e.h,x:e.x,y:e.y,params:e.params||{},assets:e.assets||{},outputs:e.outputs||[],opt:e.opt,optUse:e.optUse,optStyles:e.optStyles}))}function Ca(e){const t=l.edges.filter(r=>r.to===e.id&&r.from!==e.id&&it(r.from)).map(r=>Ze(r)?{...r}:{...r,slots:bn(r)});for(const[r,o]of Object.entries(e.assets||{})){if(!o||t.some(d=>!Ze(d)&&d.slots.includes(r)))continue;const i=typeof o=="string"?[o]:[o.ref,o.url].filter(Boolean),a=l.cards.find(d=>d.id!==e.id&&(d.outputs||[]).some(c=>i.some(f=>f===c.ref||f===c.url)));a&&t.push({from:a.id,to:e.id,slot:r,slots:[r]})}const n=[...new Set(t.map(r=>r.from))].map(r=>{const o=it(r),i=gi(o);if(!ut(o)){const a=t.filter(c=>c.from===r&&!Ze(c)).flatMap(c=>c.slots.map(f=>{const u=e.assets?.[f];return u&&typeof u=="object"?u:i.outputs.find(p=>u&&(p.ref===u||p.url===u))}).filter(Boolean)),d=[...new Map(a.map(c=>[c.ref||c.url||JSON.stringify(c),c])).values()];Object.assign(i,{type:"card_asset",cap:"asset",name:ve(o),params:{},assets:{},outputs:d.length?d:i.outputs})}return i});return JSON.parse(JSON.stringify({...gi(e),sourceProject:l.id,references:{cards:n,edges:t}}))}function sr(e){const t=!e||K.has(e.id)?l.cards.filter(n=>K.has(n.id)):[e];t.length&&(Jn=t.map(Ca),hi=0,ce(t.length>1?`已复制 ${t.length} 个节点 · Ctrl / Cmd + V 批量粘贴`:`已复制「${ve(t[0])}」${Jn[0].outputs.length?"（包含当前产物）":""} · Ctrl / Cmd + V 粘贴`))}function al(e,t){const n=Array.isArray(e)?e:[e],r=n[0],o=r.sourceProject&&r.sourceProject!==l.id,i=new Set(n.map(g=>g.id)),a=new Map,d=n.flatMap(g=>g.references?.edges||[]);if(o)for(const g of n)for(const x of g.references?.cards||[]){if(i.has(x.id))continue;const v=a.get(x.id);v?v.outputs=[...new Map([...v.outputs||[],...x.outputs||[]].map(w=>[w.ref||w.url||JSON.stringify(w),w])).values()]:a.set(x.id,{...x})}if([...n,...a.values()].some(g=>!H.some(x=>x.id===g.type)))throw new Error("这种节点在当前版本里不存在了，粘不了");const c=(g,x,v)=>{const w=xn(g.type,x,v,g.cap,!1);return w?(Object.assign(w,{...gi(g),id:w.id,x:w.x,y:w.y,status:g.outputs?.length?"done":null}),Gt(w),In(w),rt(w),It(w),Ra(w),w):null},f=t.x-Q/2-r.x,u=t.y-40-r.y,p=new Map,b=[];for(const g of[...n,...a.values()]){const x=c(g,g.x+f,g.y+u);x&&(p.set(g.id,x.id),i.has(g.id)&&b.push(x))}for(const g of d){const x=p.get(g.from)||!o&&g.from,v=p.get(g.to);x&&v&&it(x)&&l.edges.push({...JSON.parse(JSON.stringify(g)),from:x,to:v})}if(!b.length)return null;if(b.length===1)At(b[0].id);else{le=null,Jt=null,K=new Set(b.map(g=>g.id)),rn(),Yn();for(const g of l.cards)g._el?.classList.toggle("sel",K.has(g.id));vn()}return et(),fe(),oe(),ce(b.length>1?`已粘贴 ${b.length} 个节点`:`已粘贴「${ve(b[0])}」`),b.length===1?b[0]:b}function _a(e,t){const n=l;return X((async()=>{try{let r=Array.isArray(e)?e:[e];if(r[0].sourceProject&&r[0].sourceProject!==n.id){const o=r.length>1,i=await jt(`/api/projects/${encodeURIComponent(n.id)}/copy`,{source_project:r[0].sourceProject,card:o?{cards:r}:r[0]});if(!i.card||o&&!Array.isArray(i.card.cards))throw new Error("复制接口未返回节点");r=o?i.card.cards:[i.card]}for(;;){const o=Ke.pendingChain;if(await o,!ge()||l!==n)throw new Error("画布已切换或权限已变化，未粘贴");if(o===Ke.pendingChain)break}return al(r,t)}catch(r){be(`粘贴失败：${r.message}`)}})())}function bi(){if(!Ge())return;if(!Jn)return ce("还没复制东西：先选中节点，Ctrl / Cmd + C");const e=Jn[0],t=Nr||{x:e.x+Q/2+24*++hi,y:e.y+40+28*hi};return _a(Jn,t)}const xi={png:"image",jpg:"image",jpeg:"image",webp:"image",gif:"image",bmp:"image",mp4:"video",webm:"video",mkv:"video",mov:"video",avi:"video"},Ea={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif","image/bmp":"bmp","video/mp4":"mp4","video/webm":"webm","video/x-matroska":"mkv","video/quicktime":"mov","video/x-msvideo":"avi"};let yi=Promise.resolve();function wi(e){return xi[/\.([a-z0-9]+)$/i.exec(e.name||"")?.[1].toLowerCase()]||xi[Ea[e.type]]||null}function vi(){if(!l||h.panel.style.display==="none"||h.panel.style.visibility==="hidden"||h.view.style.display!=="none"||s.querySelector("dialog[open]"))return null;const e=S?Ur():it(h.panel._id);return e&&e.id===h.panel._id?e:null}function Po(e,t){if(ut(e)||dt(e))throw new Error("当前节点不接收图片 / 视频引用，请先打开生成或工具节点的参数面板");const n=_t(e),r=ke(e),o=Vo(e,t);let i=e.cap;if(o)i=o.cap;else if(n?.id==="card_image"&&t==="image"&&["zimage_t2i","krea2_t2i"].includes(i))i=i.replace("_t2i","_i2i");else if(n?.id==="card_video"&&t==="video"&&!r?.inputs.some(b=>b.type===t)){const b=n.modes.find(g=>Lo(g,t));b&&(i=Nt(b))}const a=l.edges.filter(b=>b.to===e.id&&!Ze(b));if(i!==e.cap&&(Object.values(e.assets||{}).some(Boolean)||a.length))throw new Error("引用此素材需要切换模式；为保留已有引用，请先手动选择对应模式");const d=J[i],c=d?.inputs.filter(b=>b.type===t)||[],f=Xn(d,t),u=b=>!!e.assets?.[b.key]||a.some(g=>bn(g).includes(b.key)),p=c.find(b=>!u(b));if(!p||c.filter(u).length>=f)throw new Error(c.length?`${Je[t]}引用已满，不会覆盖已有素材`:`当前节点没有可接收的${Je[t]}槽位`);return{cap:i,slot:p}}async function sl(e,t,n){let r=n.cap;const o=()=>l===t&&on()&&t.cards.includes(n)&&vi()===n&&n.cap===r;try{if(!o())return;if(!Kt("card_asset"))throw new Error("找不到素材节点定义");const i={...n,assets:{...n.assets}};for(const a of e){const d=Po(i,wi(a));i.cap=d.cap,i.assets[d.slot.key]=!0}for(const a of e){if(!o())return;const d=wi(a);Po(n,d);const c=/\.([a-z0-9]+)$/i.exec(a.name||"")?.[1].toLowerCase(),f=xi[c]?a:new File([a],`${a.name||"剪贴板素材"}.${Ea[a.type]}`,{type:a.type}),u=await Yt(f,ke(n)?.execution==="browser");if(!o())return;if(u.kind!==d)throw new Error("上传素材类型不匹配，未创建节点或引用");for(;;){const x=Ke.pendingChain;if(await x,!o())return;if(x===Ke.pendingChain)break}Po(n,d);const p=pi(),b=xn("card_asset",p.x,p.y,null,!1);if(!b||(await ao(b,u,!1),!await b._create))return;if(!o()||!t.cards.includes(b)){l===t&&ce("素材已导入，但当前节点已改变，未添加引用");return}const g=Po(n,d);g.cap!==n.cap&&(_t(n)?.id==="card_image"?(or(n,g.cap),n._model||(n._model=g.cap.startsWith("krea2")?"krea2":"zimage")):n.cap=g.cap,r=n.cap,Gt(n)),n.assets[g.slot.key]=JSON.parse(JSON.stringify(b.outputs[0])),Hn(n),t.edges.push({from:b.id,to:n.id,slot:g.slot.key,slots:[g.slot.key]}),et(),fe(),It(n),je(n.id),oe(),ce(`已导入${Je[d]}素材并引用到「${ve(n)}」的${cn(g.slot,n)}`)}}catch(i){l===t&&be("剪贴板导入失败："+i.message)}}function ll(e){if(e.defaultPrevented||s.querySelector("dialog[data-image-composer][open]"))return;const t=vi();if(!t)return;const n=e.clipboardData,r=[...n?.items||[]].filter(a=>a.kind==="file").map(a=>a.getAsFile()).filter(Boolean),o=r.length?r:[...n?.files||[]];if(o.length){if(e.preventDefault(),!on())return ce("此画布只读或已锁定，不能导入剪贴板素材");const a=o.filter(c=>wi(c));if(!a.length)return ce("剪贴板仅支持图片或视频文件");const d=l;yi=yi.then(()=>sl(a,d,t)),X(yi);return}e.target.closest("input,textarea,select")||e.target.isContentEditable||S||(Jn?(e.preventDefault(),bi()):n?.types.length&&ce("剪贴板未提供可读取的图片 / 视频文件；复制路径不能导入，请拖入文件或上传"))}function Xn(e,t){if(!e)return 0;const n=e.slotLimits&&e.slotLimits[t]&&e.slotLimits[t].max;return n??e.inputs.filter(r=>r.type===t).length}function Sa(e,t){const n=ke(e);return n?n.inputs.filter(r=>r.type===t&&(e.assets||{})[r.key]).length:0}function dl(e,t){const n=ke(e);if(!n)return null;const r=new Set((l?.edges||[]).filter(o=>o.to===e.id&&!Ze(o)).flatMap(bn));return Ye(e)&&(!Xn(n,t)||Sa(e,t)>=Xn(n,t))?null:n.inputs.find(o=>o.type===t&&!e.assets?.[o.key]&&!r.has(o.key))||null}function ki(e,t){if(!Ge()||e.id===t.id)return;if(nn(t)){if(!pn(e))return ce(`「${ve(e)}」手里还没有字：先写一段，或先运行它`);if(l.edges.some(i=>i.from===e.id&&i.to===t.id&&i.slot===Ot))return ce("已经接过了");l.edges.push({from:e.id,to:t.id,slot:Ot}),et(),fe(),le===t.id&&je(t.id),oe();const o=nr(t).length;ce(`已把「${ve(e)}」的文本接给「${ve(t)}」（第 ${o} 段输入）`);return}if(Wt(t))return ce("风格节点不收输入：它把字写给生成节点用");if(!k(ke(t)).length)return ce(`「${ve(t)}」不写提示词，接文本节点没有用`);if(!pn(e))return ce(`「${ve(e)}」手里还没有字：先写一段，或先运行它`);if(l.edges.some(o=>o.from===e.id&&o.to===t.id&&o.slot===Hr))return ce("已经挂上了");l.edges.push({from:e.id,to:t.id,slot:Hr}),et(),fe(),le===t.id&&je(t.id),oe();const r=xe(e).length;ce(`文本已挂给「${ve(t)}」`+(r?`，下游 ${r} 个节点也跟着带`:""))}async function $a(e,t){if(!Ge()||!t)return;if(ut(e))return ki(e,t);if(ut(t))return ce("文本节点不收图片/视频素材：把文本节点的出口拖过来才是接文本");if(dt(t))return ce("素材节点不收输入：它是把手里那份素材送给别的节点的");const n=e.outputs||[],r=n[0];if(!r)return ce(dt(e)?"这个素材节点还是空的：先点它选个文件":"上游还没有产物，先运行它");const o=_t(t);let i=!1;o&&o.id==="card_image"&&r.kind==="image"&&(t.cap==="zimage_t2i"?(or(t,"zimage_i2i"),t._model||(t._model="zimage"),Gt(t),i=!0):t.cap==="krea2_t2i"&&(or(t,"krea2_i2i"),t._model||(t._model="krea2"),Gt(t),i=!0));const a=ke(t);if(o&&o.id==="card_video"&&r.kind==="video"&&!Ye(t)&&!(a&&a.inputs.some(u=>u.type==="video"))){const u=o.modes.find(p=>Lo(p,"video"));u&&(Un(l.edges.filter(p=>p.to===t.id&&!Ze(p))),t.assets={},t.cap=Nt(u),Gt(t),i=!0)}const d=Vo(t,r.kind);d&&(Un(l.edges.filter(u=>u.to===t.id)),t.cap=d.cap,t.assets={},Gt(t));const c=d?{key:d.slot,label:Je[r.kind]||"素材"}:dl(t,r.kind);if(!c){const u=Xn(ke(t),r.kind);return ce(u&&Sa(t,r.kind)>=u?`${Je[r.kind]||r.kind}引用已达上限 ${u}`:`下游节点没有可接收的${Je[r.kind]||r.kind}槽位`)}d||Un(l.edges.filter(u=>u.to===t.id&&bn(u).includes(c.key)));const f={from:e.id,to:t.id,slot:c.key,slots:ia(t,c.key,n)};l.edges.push(f),Xr(t),et(),fe();try{const u=de(t).length&&k(ke(t)).length,p=Xn(ke(t),r.kind);ce(`引用上游产物 → ${cn(c,t)}`+(p?`（上限 ${p}）`:"")+(u?"；上游的风格也跟着传下来了":""));for(let b=0;b<f.slots.length;b++){const g=n[b];if(!g)break;const x=ke(e)?.execution==="browser"&&g.ref?.startsWith("chouka/"),v=dt(e)||x?JSON.parse(JSON.stringify(g)):await Ci(g,ke(t)?.execution==="browser");if(!l||!l.edges.includes(f))return;t.assets[f.slots[b]]=v}Hn(t),It(t),et(),(i||le===t.id)&&je(t.id),oe()}catch(u){l?.edges.includes(f)&&(Un([f]),Xr(t),et(),fe(),le===t.id&&je(t.id)),oe(),be("引用失败："+u.message)}}function Lo(e,t){if(e.route)return!!e.route[t];const n=J[Nt(e)];return!!n&&n.inputs.some(r=>r.type===t)}async function pl(e,t,n,r){if(!Ge())return;const o=[["card_text","文本"],["card_image","图片"],["card_video","视频"],["card_tools","工具箱"]],i=(e.outputs||[]).length,a=(e.outputs||[])[0]?.kind||(ke(e)||_t(e)||{}).outputType;console.log("[spawnDownstream] 上游产物:",{outputCount:i,outputKind:a,fromId:e.id});const d=b=>{const g=[];for(const[x,v]of o){const w=H.find(re=>re.id===x);if(!w||!w.modes.length)continue;let L=null;i>1&&a&&(L=w.modes.find(re=>{if(!b(re))return!1;const Ve=Nt(re),at=J[Ve];if(!at)return!1;const Qe=at.images||0,Fe=at.videos||0,ht=at.audios||0;return console.log("[spawnDownstream] 检查模式:",{mode:re,capId:Ve,imgCount:Qe,vidCount:Fe,audCount:ht,outputCount:i,outputKind:a}),a==="image"&&Qe===i?(console.log("[spawnDownstream] ✓ 找到匹配的图片模式:",Ve),!0):a==="video"&&Fe===i?(console.log("[spawnDownstream] ✓ 找到匹配的视频模式:",Ve),!0):a==="audio"&&ht===i?(console.log("[spawnDownstream] ✓ 找到匹配的音频模式:",Ve),!0):!1})),L||(L=w.modes.find(b)),L&&g.push({icon:w.icon,text:v,run:async()=>{const re=xn(w.id,t.x,t.y-40,Nt(L));re&&(ut(e)?await ki(e,re):await $a(e,re))}})}return g};if(ut(e)){const b=H.find(x=>x.id==="card_text"),g=[];return b&&b.modes.length&&g.push({icon:b.icon,text:"文本节点（接住这段字当输入）",run:async()=>{const x=xn(b.id,t.x,t.y-40,Nt(b.modes[0]));x&&await ki(e,x)}}),g.push(...d(x=>k(J[Nt(x)]).length)),g.length?Lt(n,r,"把这段文本接给…",g):void 0}if(dt(e)){const b=Bn(e);if(!b)return ce("这个素材节点还是空的：先点它选个文件");const g=d(v=>Lo(v,b.kind)),x=Je[b.kind]||b.kind;return g.length?Lt(n,r,`把这个${x}接给…`,g):ce(`没有节点收${x}素材`)}const c=(e.outputs||[])[0],f=c?c.kind:(ke(e)||_t(e)||{}).outputType;if(!f)return;const u=d(b=>Lo(b,f)),p=Je[f]||f;if(!u.length)return ce(`没有节点收${p}素材`);Lt(n,r,`把这个${p}接给…`,u)}async function Ci(e,t=!1){const n=l;if(!ge())throw new Error("此画布只读，不能导入素材");const r=await ue(new ae(e.url,location.href),{credentials:"same-origin"});if(!r.ok)throw new Error(`读取产物失败（${r.status}）`);const o=await r.blob();if(l!==n||!ge())throw new Error("画布已切换或权限已变化，导入已取消");const i=e.filename||new ae(e.url,location.href).pathname.split("/").pop()||"历史产物",a=new File([o],i.split(/[\\/]/).pop(),{type:o.type});return Yt(a,t)}const lr=new Map;function cl(e,t){if(t?.aborted)return Promise.reject(t.reason);const n=/^\/api\/upload\/([^/?#]+)$/.exec(e);if(!n)return Promise.resolve(e);if(!lr.has(e)){const i={controller:new AbortController,users:new Set,ready:!1};i.promise=(async()=>{const a=i.controller.signal;for(;;){a.throwIfAborted();const d=await $t(`/api/preview/${n[1]}`,{signal:a});if(a.throwIfAborted(),d.status==="ready")return i.ready=!0,d.url;if(d.status==="error")throw new Error(d.error);await new Promise((c,f)=>{const u=()=>{Z(p),f(a.reason)},p=G(()=>{a.removeEventListener("abort",u),c()},1500);a.addEventListener("abort",u,{once:!0})})}})(),lr.set(e,i),i.promise.catch(()=>{lr.get(e)===i&&lr.delete(e)})}const r=lr.get(e),o={};return r.users.add(o),new Promise((i,a)=>{const d=()=>{t?.removeEventListener("abort",c),r.users.delete(o),!r.ready&&!r.users.size&&(lr.get(e)===r&&lr.delete(e),r.controller.abort())},c=()=>{d(),a(t.reason)};t?.addEventListener("abort",c,{once:!0}),r.promise.then(f=>{d(),i(f)},f=>{d(),a(f)})})}function eo(e,t,n=()=>!0,r){if(e.playsInline=!0,!/^\/api\/upload\//.test(t)){e.src=t;return}e.dataset.previewOriginal=t;const o=e.getAttribute("poster"),i=e.title;let a;const d=(c,f)=>{e.dataset.previewState=c?"error":"processing",e.title=f;const u=c?["视频转码失败","修复转码后才能生成"]:["正在转码为 MP4","完成后可预览和生成"];e.poster=a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#111318"/><g fill="#d1d5db" text-anchor="middle" font-family="sans-serif" font-size="25"><text x="320" y="168">${u[0]}</text><text x="320" y="208" font-size="19">${u[1]}</text></g></svg>`)};return d(!1,"服务器正在生成兼容 MP4；原片已备份，转码完成后下游节点使用 MP4 生成。"),cl(t,r).then(c=>{e.dataset.previewOriginal!==t||!n()||(e.dataset.previewState="ready",e.title=i||"MP4 转码已完成，预览和后续生成均使用此版本；原片已备份。",e.getAttribute("poster")===a&&(o?e.poster=o:e.removeAttribute("poster")),e.src=c)}).catch(c=>{r?.aborted||e.dataset.previewOriginal!==t||!n()||(d(!0,c.message||"转码状态加载失败；请检查服务器后重试生成。"),e.removeAttribute("src"),e.load())})}function ja(e){e.querySelectorAll("video[data-video-url]").forEach(t=>{eo(t,t.dataset.videoUrl)})}const Cn=new Map;let Mr=null,Io=null,to=null,_i=0,no=null;function Ei(){!Cn.size||no!==null||(no=Se(()=>{no=null,$i()}))}q.addEventListener("resize",Ei);function Na(e){return/^\/api\/(upload|artifact)\//.test(e)?`/api/thumbnail?url=${encodeURIComponent(e)}`:null}function Ma(e,t){t.controller?.abort(),t.blob&&ae.revokeObjectURL(t.blob),dr(e),e.tagName==="VIDEO"&&(e.pause(),e.removeAttribute("src"),e.load()),Mr?.unobserve(e),to?.unobserve(e),Cn.delete(e)}function Si(){for(const[e,t]of Cn)Ma(e,t);Mr?.disconnect(),Io?.disconnect(),to?.disconnect(),Mr=null,Io=null,to=null,we(no),no=null}function $i(){const e=h.stage.getBoundingClientRect(),t=q.devicePixelRatio||1;for(const[n,r]of Cn){if(!r.visible||!n.isConnected||r.project!==l||!y.active)continue;const o=n.getBoundingClientRect();if(o.right<=e.left-120||o.left>=e.right+120||o.bottom<=e.top-120||o.top>=e.bottom+120){r.controller?.abort();continue}if(r.fullURL&&!r.original&&Math.max(o.width,o.height)*t>512&&(r.url=r.fullURL,r.original=!0,r.done=!1,r.controller?.abort()),r.loading||r.done||_i>=4)continue;const i=new AbortController;r.controller=i,r.loading=!0,_i++,(async()=>{try{const a=await ue(r.url,{credentials:"same-origin",signal:i.signal});if(i.signal.aborted||Cn.get(n)!==r||r.project!==l||!y.active)return;if(!a.ok)throw a.status===401&&await y.me(),[403,404].includes(a.status)&&q.dispatchEvent(new CustomEvent("h3auth:denied",{detail:{path:"/api/thumbnail",method:"GET",error:{status:a.status}}})),new Error(`预览加载失败（${a.status}）；可双击查看原文件`);const d=await a.blob();if(i.signal.aborted||Cn.get(n)!==r||!n.isConnected||r.project!==l||!y.active)return;const c=r.blob;r.blob=ae.createObjectURL(d),n.tagName==="VIDEO"?n.poster=r.blob:n.src=r.blob,c&&ae.revokeObjectURL(c),r.done=!0}catch(a){!i.signal.aborted&&Cn.get(n)===r&&(r.done=!0,n.title=a.message)}finally{r.loading=!1,r.controller=null,_i--,$i()}})()}}function ul(e,t){const n=Na(t);e.tagName==="VIDEO"?(e.dataset.videoUrl=t,e.preload="none",e.title="单击播放；双击放大查看原视频",e.poster="data:image/svg+xml;charset=utf-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="288"><rect width="512" height="288" fill="#111318"/><path d="M238 121v46l40-23z" fill="#b7bbc3"/></svg>')):(e.decoding="async",n&&(e.dataset.thumbnail="true")),Mr||(Mr=new A(r=>{for(const o of r){const i=Cn.get(o.target);i&&(i.visible=o.isIntersecting,!i.visible&&i.loading&&i.controller?.abort())}$i()},{root:h.stage,rootMargin:"120px"}),Io=new M(()=>{for(const[r,o]of Cn)r.isConnected||Ma(r,o)}),Io.observe(h.world,{childList:!0,subtree:!0}),to=new Ne(Ei)),Cn.set(e,{url:n||t,fullURL:n?e.tagName==="VIDEO"?`${n}&size=original`:t:null,original:!1,project:l,visible:!1,loading:!1,done:e.tagName==="VIDEO"&&!n}),Mr.observe(e),to.observe(e)}function fl(e,t,n){for(const o of e.querySelectorAll("img, video")){const i=o.classList.contains("old")?n:t[+(o.dataset.i||0)]?.url;i&&ul(o,i)}const r=e.querySelector("audio");r&&(r.src=t[0].url)}function dr(e){e._playRequest&&e.pause(),e._playRequest=null,e._previewController?.abort(),e._previewController=null}async function ml(e){if(!e.isConnected||!y.active)return;for(const o of s.querySelectorAll("video"))dr(o);const t=l,n={},r=new AbortController;e._playRequest=n,e._previewController=r;try{if(e.getAttribute("src")||(e.preload="metadata",await eo(e,e.dataset.videoUrl,()=>e._playRequest===n&&e.isConnected&&l===t&&y.active,r.signal)),e._playRequest!==n||!e.isConnected||l!==t||!y.active||e.dataset.previewState==="error")return;await e.play()}catch(o){!r.signal.aborted&&e._playRequest===n&&e.isConnected&&l===t&&(e.title=o.message||"视频暂时无法播放")}finally{e._previewController===r&&(e._previewController=null)}}function ro(e){Gr(null,0,[{url:e.url,kind:e.kind,filename:(e.origin||e.url).split(/[\\/]/).pop()}],null)}const za=20;function zr(e,t){const n=e.outputs||[],r=Ye(e);if(!n.length&&!r)return;e.history=e.history||[];const o=e.history.find(i=>i.job===t.id);if(o){r&&Object.assign(o,{status:e.status,ms:e.ms??null,outputs:n});return}e.history.unshift({ts:Date.now(),job:t.id,seed:e.seed!=null?e.seed:null,cap:t.capability,ms:e.ms!=null?e.ms:null,outputs:n,...r?{status:e.status}:{},...t.prompts?{prompts:t.prompts.map(i=>({...i}))}:{}}),e.history.length>za&&(e.history.length=za)}function To(e){e.history||(e.history=(e.outputs||[]).length?[{ts:null,seed:e.seed!=null?e.seed:null,cap:e.cap,outputs:e.outputs}]:[])}function pr(e){if(!(e>0))return"";const t=Math.round(e/1e3);if(t<60)return`${t}秒`;const n=Math.floor(t/60);return n<60?`${n}分${t%60}秒`:`${Math.floor(n/60)}时${n%60}分`}function ji(e){if(!e)return"早前";const t=new Date(e),n=i=>String(i).padStart(2,"0"),r=new Date;r.setHours(0,0,0,0);const o=`${n(t.getHours())}:${n(t.getMinutes())}`;return e>=r.getTime()?o:`${n(t.getMonth()+1)}-${n(t.getDate())} ${o}`}function Yn(){h.hist.style.display="none",h.hist.innerHTML="",h.hist._id=null}function Pa(e){return Math.max(240,Math.min(e,Math.min(720,innerWidth*.65)))}function hl(){if(!h.hist||h.hist.style.display==="none")return;const e=h.hist.getBoundingClientRect().width,t=Pa(e);t!==e&&h.hist.style.setProperty("--hist-width",`${t}px`)}function gl(e){const t=n=>{h.hist.style.setProperty("--hist-width",`${Pa(n)}px`),vt(),Rt(),vn()};e.onpointerdown=n=>{if(n.button!==0)return;n.preventDefault();const r=n.clientX,o=h.hist.getBoundingClientRect().width;h.hist.classList.add("resizing"),e.setPointerCapture(n.pointerId),e.onpointermove=i=>t(o+r-i.clientX),e.onpointerup=e.onpointercancel=()=>{h.hist.classList.remove("resizing"),e.onpointermove=e.onpointerup=e.onpointercancel=null}},e.onkeydown=n=>{if(n.key!=="ArrowLeft"&&n.key!=="ArrowRight")return;n.preventDefault();const r=n.shiftKey?40:16;t(h.hist.getBoundingClientRect().width+(n.key==="ArrowLeft"?r:-r))}}function Pr(e){const t=l&&l.cards.find(i=>i.id===e);if(!t||ut(t))return Yn();To(t);const n=s.createElement("div");n.className="hlist",ke(t);const r=s.createElement("button");r.className="hresize",r.type="button",r.title="左右拖动调整历史产物栏宽度",r.setAttribute("aria-label","调整历史产物栏宽度"),gl(r);const o=s.createElement("div");if(o.className="hhd",o.innerHTML='<b>历史产物</b><span class="n"></span><button class="x" title="收起">✕</button>',o.querySelector(".n").textContent=t.history.length?`${t.history.length} 轮`:"",o.querySelector(".x").onclick=Yn,!t.history.length){const i=s.createElement("div");i.className="hempty",i.textContent=`这个节点还没出过东西。
运行一次，每一轮的产物和 seed 都会留在这里。`,i.style.whiteSpace="pre-line",n.appendChild(i)}for(const[i,a]of t.history.entries())n.appendChild(bl(t,a,i===0));h.hist.innerHTML="",h.hist.append(r,o,n),h.hist._id=e,h.hist.style.display=""}async function Ro(e,t){const n=String(e);try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(n);else{const r=s.activeElement,o=s.createElement("textarea");o.value=n,o.style.cssText="position:fixed;top:0;left:0;opacity:0;pointer-events:none",s.body.appendChild(o);try{if(o.focus(),o.select(),!s.execCommand("copy"))throw new Error("复制失败")}finally{o.remove(),r?.focus({preventScroll:!0})}}ce(t)}catch{be("复制失败，请展开后手动选中文字复制")}}const Ni="application/x-chouka-history-output";let oo=null;function bl(e,t,n){const r=t.outputs||[],o=s.createElement("div");o.className="hrun"+(n?" cur":"");const i=s.createElement("div");i.className="rh";const a=J[t.cap]&&J[t.cap].name||"";i.innerHTML='<span class="tag"></span><span class="nm"></span><span class="cnt"></span>',i.querySelector(".tag").textContent=n?"最新":ji(t.ts),i.querySelector(".nm").textContent=n?ji(t.ts):a,i.querySelector(".cnt").textContent=[t.status==="running"?"生成中":t.status==="error"?"失败":r.length>1?`${r.length} 张`:"",pr(t.ms)].filter(Boolean).join(" · "),i.title=a;const d=s.createElement("div");d.className="rg"+(r.length===1?" one":""),d.style.setProperty("--hcols",r.length===1?1:r.length<=4?2:3),d.innerHTML=r.map((p,b)=>p.kind==="video"?`<video data-video-url="${p.url}" data-i="${b}" muted loop preload="metadata" draggable="false"></video>`:p.kind==="audio"?`<div class="rg-a" data-i="${b}" title="${p.filename}">🎵</div>`:`<img src="${p.url}" data-i="${b}" alt="" draggable="false">`).join(""),ja(d);for(const p of d.querySelectorAll("[data-i]"))p.draggable=!0,p.title="单击放大查看；拖到画布创建素材节点";let c=!1;d.ondragstart=p=>{const b=p.target.closest("[data-i]"),g=b&&r[+b.dataset.i];if(!ge()||!g||!["image","video","audio"].includes(g.kind)){p.preventDefault();return}c=!0,oo={token:qt(),project:l,output:{...g}},p.dataTransfer.items.clear(),p.dataTransfer.effectAllowed="copy",p.dataTransfer.setData(Ni,oo.token)},d.ondragend=()=>{oo=null,G(()=>{c=!1},0)},d.onclick=p=>{if(c)return;const b=p.target.closest("[data-i]");b&&Gr(e,+b.dataset.i,r,t.seed)},d.oncontextmenu=p=>{p.preventDefault(),p.stopPropagation();const b=p.target.closest("[data-i]");if(!b)return;const g=+b.dataset.i,x=r[g];if(!x)return;const v=[];v.push({icon:"⬇",text:`下载${x.kind==="video"?"视频":x.kind==="audio"?"音频":"图片"}`,run:()=>Zr(x)}),r.length>1&&v.push({icon:"⬇",text:`下载全部 ${r.length} 张${x.kind==="video"?"视频":x.kind==="audio"?"音频":"图片"}`,run:()=>r.forEach(w=>Zr(w))}),Lt(p.clientX,p.clientY,"历史记录",v)},o.append(i,d);const f=s.createElement("div");if(f.className="rs",f.innerHTML="<i>seed</i><span></span>",f.querySelector("span").textContent=t.seed!=null?String(t.seed):"未记录",t.seed!=null){const p=s.createElement("button");p.textContent="复制",p.title="复制 seed",p.onclick=()=>Ro(t.seed,"已复制 seed "+t.seed),f.appendChild(p)}if(o.appendChild(f),t.user_prompt||t.negative_prompt){const p=s.createElement("details");p.className="rp";const b=s.createElement("summary");b.textContent="提示词";const g=s.createElement("div");if(t.user_prompt){const x=s.createElement("div");x.style.display="flex",x.style.justifyContent="space-between",x.style.alignItems="center",x.style.marginBottom="4px";const v=s.createElement("div");v.style.fontWeight="bold",v.textContent="正面提示词：";const w=s.createElement("button");w.textContent="复制",w.style.fontSize="12px",w.style.padding="2px 8px",w.onclick=()=>Ro(t.user_prompt,"已复制正面提示词"),x.append(v,w);const L=s.createElement("div");L.style.marginBottom=t.negative_prompt?"8px":"0",L.textContent=t.user_prompt,g.append(x,L)}if(t.negative_prompt){const x=s.createElement("div");x.style.display="flex",x.style.justifyContent="space-between",x.style.alignItems="center",x.style.marginBottom="4px";const v=s.createElement("div");v.style.fontWeight="bold",v.textContent="负面提示词：";const w=s.createElement("button");w.textContent="复制",w.style.fontSize="12px",w.style.padding="2px 8px",w.onclick=()=>Ro(t.negative_prompt,"已复制负面提示词"),x.append(v,w);const L=s.createElement("div");L.textContent=t.negative_prompt,g.append(x,L)}p.append(b,g),o.appendChild(p)}const u=t.prompts||(t.prompt!=null?[{label:"提示词",text:t.prompt}]:[]);for(const p of u){const b=s.createElement("details");b.className="rp";const g=s.createElement("div");g.className="history-prompt";const x=s.createElement("summary");x.textContent=p.key==="if_original"?"原始提示词":p.key==="if_submitted"?"提交给 IF CLI 的提示词":"当时提交的"+p.label;const v=s.createElement("button");v.textContent="复制",v.type="button",v.className="history-prompt-copy",v.title="复制"+x.textContent,v.onclick=()=>Ro(p.text,"已复制"+p.label);const w=s.createElement("div");w.textContent=p.text||"（本次提交为空）",b.append(x,w),g.append(b,v),o.appendChild(g)}return o}async function xl(e){if(!Ge())return;if(!on())return ce("请先复制示例画布，再保存图片合成");if(s.querySelector("dialog[data-image-composer][open]"))return;const t=l,n=()=>l===t&&on()&&it(e.id)===e&&e.cap==="image_composite",r=()=>{if(!n())throw new Error("画布、节点或权限已变化，请关闭编辑器后重新打开")},o=async(i,a)=>{r(),Ke.beginFlush();try{ni(),e.params.composition=JSON.parse(JSON.stringify(i));for(const c of Object.keys(e.assets))c.startsWith("composite:")&&delete e.assets[c];for(const c of i.layers)e.assets[`composite:${c.id}`]={...c.asset};if(a){e.outputs=[a],e.status="done",e.progress=1,e.job=null,e.seed=null,e.ms=null,e.error=null,e.step="",zr(e,{id:`local:${qt()}`,capability:e.cap});for(const c of t.edges.filter(f=>f.from===e.id&&!Ze(f)&&!f.version)){const f=it(c.to);if(!f)continue;const u=bn(c);c.slots=u,u.forEach((p,b)=>{b===0?f.assets[p]={...a}:delete f.assets[p]}),It(f)}}Co(),Ke.cancelContentSave();const d=await hr(t.id);if(!d.ok)throw d.error||new Error("合成保存失败，请重试");r(),rt(e),et(),h.panel._id===e.id&&je(e.id),a&&h.hist._id===e.id&&Pr(e.id)}finally{Ke.endFlush()}};try{if(e._create&&await e._create,r(),!q.ChoukaImageComposer)throw new Error("图片合成组件未加载，请强制刷新页面");const i=new Map,a=(c,f)=>{c?.kind!=="image"||!c.url||i.has(c.url)||i.set(c.url,{...c,name:f||c.origin||c.filename||"图片"})};for(const c of Object.values(e.assets||{}))a(c,c?.origin);for(const c of t.cards)if(c!==e){for(const f of Object.values(c.assets||{}))a(f,`${ve(c)} · ${f?.origin||"素材"}`);for(const f of c.outputs||[])a(f,`${ve(c)} · 产物`);for(const f of c.history||[])for(const u of f.outputs||[])a(u,`${ve(c)} · 历史产物`)}const d=(ke(e)?.inputs||[]).filter(c=>c.type==="image").map(c=>e.assets[c.key]).filter(c=>c?.kind==="image"&&c.url);await q.ChoukaImageComposer.open({state:e.params.composition?JSON.parse(JSON.stringify(e.params.composition)):null,linkedSources:d,sources:[...i.values()],canEdit:n,upload:async c=>{r();const f=await Yt(c,!0);return r(),f},onSave:c=>o(c),onExport:async(c,f)=>{r();const u=await Yt(new File([c],`composition_${Date.now()}.png`,{type:"image/png"}),!0);r(),await o(f,{...u,filename:u.origin}),ce("图片合成已保存，可从输出端口连接下游节点")}})}catch(i){be("图片合成："+i.message)}}function rn(){h.panel.style.display="none",h.panel._id=null,Yn()}function La(e){h.panel.style.display!=="none"&&(h.panel.style.visibility=e?"hidden":"")}function vt(){if(h.panel.style.display==="none")return;if(Ka(h.panel,!ge()),S){h.panel.style.left="0px",h.panel.style.top="0px",h.panel.style.maxHeight="100%",h.panel.style.visibility="";return}const e=l&&l.cards.find(re=>re.id===h.panel._id);if(!e||!e._el)return rn();const t=8,n=e.x,r=e.y,o=e._el.offsetWidth,i=e._el.offsetHeight,a=n*z.k+z.x,d=r*z.k+z.y,c=o*z.k,f=i*z.k,u=h.stage.getBoundingClientRect(),p=a+c,b=d+f;if(!(p>0&&a<u.width&&b>0&&d<u.height)){h.panel.style.visibility="hidden";return}h.panel.style.visibility="";const x=52;h.panel.style.maxHeight=innerHeight-x-t+"px";const v=h.panel.offsetWidth;h.panel.offsetHeight;const w=a+c/2-v/2,L=d+f+t;h.panel.style.left=w+"px",h.panel.style.top=L+"px"}function je(e,t=null){if(S&&e!==me)return;if(S&&Tt)return _r();const n=l?.cards.find(O=>O.id===e);if(!n)return rn();const r=ge()?n:t||q.structuredClone(wo(n)),o=_t(r),i=ke(r);Ye(r)&&!Fn&&hn().catch(()=>{});const a=h.panel.querySelector(".pbody"),d=a&&h.panel._id===e?a.scrollTop:0;if(h.panel._id=e,h.panel.innerHTML="",h.panel.style.display="",h.panel.style.visibility="",Wt(r))return yl(r);if(nn(r))return vl(r);if(dt(r))return wl(r);const c=["card_image","card_video","card_tools"].includes(o.id)&&o.modes.length>1;if(o.modes.length>1&&!c){const O=s.createElement("div");O.className="modes";for(const te of o.modes){const Me=s.createElement("button");Me.className=mn(te,r.cap)?"on":"",Me.textContent=te.name,xo(Me,()=>bo(r,te,te.name)),Me.onclick=()=>{Ut(),r.cap=Nt(te,Mt(r)),je(e),Gt(r),oe()},O.appendChild(Me)}h.panel.appendChild(O)}if(!i)return h.panel.appendChild(Oo("能力不可用")),vt();const f=i.id==="image_composite"&&i.execution==="browser",u=Ye(r)?i:J[Pt(r)];let p=u&&u!==i?i.inputs.map(O=>{const te=u.inputs.find(Me=>Me.key===O.key);return te&&te.default!==O.default?{...O,default:te.default}:O}):i.inputs;const b=Bt(r);if(b&&b.entry){const O=p.findIndex(te=>wt.includes(te.type));O>=0&&!r.assets[p[O].key]&&(p=p.slice(),p[O]={...p[O],label:b.entry.label})}const g=s.createElement("div");g.className="pbody",h.panel.appendChild(g);const x=s.createElement("div");if(x.className="knobnote clipboard-media-hint",x.textContent="Ctrl / Cmd + V：粘贴截图或图片 / 视频文件，自动创建素材节点并引用到空槽；不覆盖已有引用。复制文件需浏览器提供文件数据，仅路径文字无法导入。",Ye(r)&&(x.textContent=Zn?`本机 IF 不可用：${Zn}。请先安装并登录 IF CLI、启动本机桥接，点模型按钮可重试。`:"IF 使用本机账号；支持按模型数量连接多份引用。引用素材各上传一次，返回的 URL 按「图片1」「视频1」写入提示词，与生成需求一次提交；模型由 CLI 参数指定，随后轮询并保存产物。图片超过 10 MB 时优先转无损 WebP，仍超限再压缩；视频超过 50 MB 时自动转码。仅处理上传副本，原素材不变；本机上传合计不超过 100 MB，音频暂不支持。"),ge()&&g.appendChild(x),Ye(r)){const O=mt.filter(Ee=>Ee.type===i.outputType),te=r.params.if_model||O[0]?.display_name,Me=rr(te,i.outputType),Ae=s.createElement("div");if(Ae.className="knobnote",Ae.textContent=`${Me.reference_fallback?"画布兜底引用上限（不代表官方支持）":"画布引用上限"}：图片 ${Me.bridge.image} · 视频 ${Me.bridge.video}。${Me.note} 全部引用上传后的 URL 按「图片1」「视频1」与生成需求一次提交，再轮询产物；是否采用全部引用以 IF 实际返回为准，音频暂不可提交。画面比例、清晰度、时长等参数作为生成内容要求发送，模型不保证严格遵守。`,Object.values(r.assets||{}).some(Ee=>Ee&&wt.includes(Ee.kind)&&!Me?.bridge?.[Ee.kind])&&(Ae.textContent+=" 已连接的引用保持原样，但不适用于当前模型；可切回原模型或手动移除，运行时不会忽略它。"),g.appendChild(Ae),Me?.source){const Ee=s.createElement("a");Ee.href=Me.source,Ee.target="_blank",Ee.rel="noopener noreferrer",Ee.textContent="供应商 API 参考文档（不作为 IF 引用上限）",g.appendChild(Ee)}}if(f){x.textContent="浏览器本地合成，不占 GPU。已连接的图片打开编辑器时自动加入图层，也可上传图片或从画布素材中选择添加。拖动位置、缩放图片，在图层列表调整遮挡顺序。";const O=s.createElement("div");O.className="knobnote";const te=r.params.composition;O.textContent=te?`编辑稿：${te.width} × ${te.height} · ${te.layers.length} 个图层。保存编辑可继续修改；合成输出后可连接下游。`:"尚未创建编辑稿。点击下方「编辑合成」开始，默认画布 1920 × 1080，可修改尺寸和背景。",g.appendChild(O)}if(S){const O=Pi(r);if(O.length){const te=s.createElement("div");te.className="director-supplement",te.textContent=`导演补充（只读，提交时追加到提示词）
`+O.join(`
`),g.appendChild(te)}}const v=p.filter(O=>wt.includes(O.type));if(v.length)if(f){const O=s.createElement("details");O.open=!0;const te=s.createElement("summary");te.textContent="连接图片素材（打开编辑器时自动加入图层）",O.append(te,Oa(r,v,b)),g.appendChild(O)}else g.appendChild(Oa(r,v,b));if(r.cap==="if_image"){const O=p.find(te=>te.key==="if_reference");O&&g.appendChild(Do(r,O))}const w=new Set;for(const O of v.filter(te=>(r.assets||{})[te.key])){const te=p.filter(Me=>Me.rangeOf===O.key);if(te.length===2){g.appendChild(Rl(r,O,te[0],te[1]));for(const Me of te)w.add(Me.key)}}const L=p.filter(O=>O.type==="textarea"&&!O.advanced),re=L.filter(O=>O.template),Ve=L.filter(O=>!O.template),at=Ve.filter(O=>O.pairWith&&p.some(te=>te.key===O.pairWith));at.length>1&&g.appendChild(_l(r,at));for(const O of Ve)(!at.includes(O)||at.length<2)&&g.appendChild(Ta(r,O));for(const O of re)g.appendChild(Pl(r,O));const Qe=p.filter(O=>!wt.includes(O.type)&&O.type!=="textarea"&&(O.type==="seed"||!O.advanced)&&!O.mirror&&!w.has(O.key)),Fe=(O,te)=>{if(O.appendChild(Do(r,te)),te.hint&&!te.showHint){const Me=s.createElement("div");Me.className="knobnote",Me.textContent=te.hint,O.appendChild(Me)}},ht=s.createElement("div");ht.className="pwrap";for(const O of Qe)c||Fe(ht,O);g.appendChild(ht),r.error&&g.appendChild(Oo(r.error));const En=er(r);En&&g.appendChild(En);const gt=qr(r);gt&&g.appendChild(gt);const bt=s.createElement("div");if(bt.className="foot",c){const O=o.id==="card_video"?"生视频模式":o.id==="card_tools"?"工具箱模式":"生图模式",te=Bt(r)||o.modes[0],Me=Vr(`${o.icon} ${te.name}`,O,()=>{const Ae=Ee=>({icon:o.icon,text:Ee.name+(mn(Ee,r.cap)?"（当前）":""),tip:()=>bo(r,Ee,Ee.name),run:()=>{if(Ye(r)&&["queued","running"].includes(r.status))return ce("请等待本机 IF 任务结束后再切换模式");Ut(),Pn(),or(r,Nt(Ee,Mt(r))),je(e),Gt(r),oe()}});return o.id==="card_video"||o.id==="card_image"?[{group:"本地 API"},...o.modes.filter(Ee=>Ee.id!=="if_video"&&Ee.id!=="if_image").map(Ae),{group:"云端 API"},...o.modes.filter(Ee=>Ee.id==="if_video"||Ee.id==="if_image").map(Ae)]:o.modes.map(Ae)});if(xo(Me,()=>bo(r,te,te.name)),bt.appendChild(Me),te.modelSwitch){const Ae=Mt(r),Ee=Y=>yn[Y]||Y,U=Vr(Ee(Ae)||i.name,o.id==="card_image"?"生图模型":"深度视频模型",()=>Object.entries(te.modelSwitch).map(([Y,ye])=>({text:Ee(Y)+(ye===r.cap?"（当前）":""),run:()=>{Ut(),Pn(),or(r,ye),r._model=Y,je(e),Gt(r),oe()}})));bt.appendChild(U)}else if(Ye(r)){const Ae=mt.filter(Y=>Y.type===i.outputType),Ee=Ae.find(Y=>Y.display_name===r.params.if_model)?.display_name||Ae[0]?.display_name,U=Vr(Ee||"选择 IF 模型","IF 模型",()=>mt.some(Y=>Y.type===i.outputType)?mt.filter(Y=>Y.type===i.outputType).map(Y=>({text:Y.display_name+(Y.display_name===Ee?"（当前）":"")+" · "+Dr(Y),disabled:["exhausted","unavailable"].includes(Y.quota_status),run:()=>{Pn(),r.params.if_model=Y.display_name;const ye=r._referenceParameters,pe=ye&&r.params.duration===ye.before.duration;Yo(r),pe&&(ye.before.duration=r.params.duration),je(e),oe()}})):[{text:Zn?"重试连接本机 IF":"正在读取本机 IF 模型…",run:()=>hn().catch(Y=>be(Y.message))}]);U._openIFModels=U.onclick,U.onclick=async Y=>{Y.stopPropagation(),kn();const ye=jo;U.disabled=!0,U.firstChild.textContent="读取剩余次数…";try{await hn(!1),jo===ye&&h.panel._id===e&&l?.cards.includes(r)&&h.panel.querySelector('button[title="IF 模型 —— 点击换"]')?._openIFModels(Y)}catch(pe){be("读取 IF 剩余次数失败："+pe.message)}finally{U.disabled=!1,U.firstChild.textContent=Ee||"选择 IF 模型"}},bt.appendChild(U)}if(!f){const Ae=s.createElement("button");Ae.className="tcap";const Ee=Qo(r,i);Ae.textContent=Ee?`⚙ ${Ee}`:"⚙ 参数",Ae.title=Ye(r)?"点开弹窗：比例、清晰度、时长等以内容发送":"点开弹窗：清晰度、画面比例、时长等参数",Ae.dataset.readonlyView="",Ae.onclick=U=>{U.stopPropagation(),vs(r,Ae)},bt.appendChild(Ae)}}const Le=r.status==="queued"||r.status==="running",nt=s.createElement("span");if(nt.style.cssText="color:#8a8a94;font-size:12px",nt.textContent=f?"本地合成 · 输出 PNG":i.outputType==="video"?"输出：视频":"输出：图片",r.status==="done"&&r.ms>0&&(nt.textContent+=` · 上次 ${pr(r.ms)}`),bt.appendChild(nt),Le&&r.job&&!Ye(r)){const O=s.createElement("button");O.className="cancel",O.textContent="取消",O.onclick=()=>ql(r),O.style.marginLeft="auto",bt.appendChild(O)}const kt=s.createElement("button");kt.className="go",kt.textContent=f?"编辑合成":"↑",kt.title=f?"打开图片合成编辑器（不使用 ComfyUI）":"运行",f&&(kt.style.cssText="width:auto;min-width:96px;padding:0 14px;border-radius:8px;font-size:13px;flex-shrink:0"),kt.disabled=Le,kt.onclick=()=>Bo(r),bt.appendChild(kt),h.panel.appendChild(bt),vt(),g.scrollTop=d,Hi(r),Hn(r)}function Oo(e){const t=s.createElement("div");return t.className="err",t.textContent=e,t}function yl(e){const t=s.createElement("div");t.className="pbody",h.panel.appendChild(t);const n=s.createElement("div");n.className="pblock";const r=s.createElement("div");r.className="phd";const o=s.createElement("span");o.textContent="风格描述";const i=s.createElement("span");i.className="demo";const a=s.createElement("button");a.textContent="清空",r.append(o,i,a);const d=s.createElement("textarea");d.placeholder="例：蒂姆·波顿式哥特暗黑定格动画质感，冷青灰色调，强侧光硬阴影，胶片颗粒，浅景深，电影级构图",d.value=String((e.params||{}).style||""),d.style.minHeight="120px";const c=()=>{const x=d.value.trim();i.style.display=x?"none":"",i.textContent="⚠ 还没写，挂着也不起作用"},f=()=>{e.params=e.params||{},e.params.style=d.value,c(),rt(e),oe()};d.oninput=f,a.onclick=()=>{d.value="",f(),d.focus()},c(),n.append(r,d),t.appendChild(n);const u=l.edges.filter(x=>x.from===e.id&&Ze(x)),p=s.createElement("div");p.className="slinks";const b=s.createElement("div");if(b.className="atitle",b.textContent=u.length?`挂着 ${u.length} 个节点`:"还没挂给任何节点",p.appendChild(b),!u.length){const x=s.createElement("div");x.className="anote",x.textContent="把右边那颗点拖到一张生图/生视频节点上；拖到空白处会列出所有写提示词的玩法。",p.appendChild(x)}for(const x of u){const v=l.cards.find(Ve=>Ve.id===x.to);if(!v)continue;const w=s.createElement("div");w.className="slink";const L=s.createElement("button");L.className="nm",L.textContent=ve(v),L.title="选中这个节点（面板上能看到合并后的提示词）",L.onclick=()=>At(v.id);const re=s.createElement("button");re.className="off",re.textContent="解除",re.title="这个节点不再套用本风格",re.onclick=()=>Yr(x),w.append(L,re),p.appendChild(w)}const g=xe(e);if(g.length){const x=s.createElement("div");x.className="atitle",x.textContent=`顺着连线连带 ${g.length} 张`,p.appendChild(x);for(const v of g){const w=s.createElement("div");w.className="slink down";const L=s.createElement("button");L.className="nm",L.textContent=ve(v),L.title="选中这个节点（面板上能看到合并后的提示词）",L.onclick=()=>At(v.id);const re=s.createElement("span");re.className="off ro",re.textContent="继承",re.title="上游那个节点传下来的，要断就断它们之间那根产物连线",w.append(L,re),p.appendChild(w)}}t.appendChild(p),vt()}function wl(e){const t=s.createElement("div");t.className="pbody",h.panel.appendChild(t);const n=Bn(e),r=s.createElement("div");r.className="pblock";const o=s.createElement("div");o.className="phd";const i=s.createElement("span");i.textContent="手里的素材";const a=s.createElement("span");a.className="demo",o.append(i,a),r.appendChild(o);const d=s.createElement("div");d.className="prow";const c=s.createElement("button");if(c.textContent=n?"换一个文件":"选择文件",c.onclick=()=>Fo(e),d.appendChild(c),n){const g=s.createElement("button");g.textContent="查看大图",g.onclick=()=>ro(n),g.dataset.readonlyView="",d.appendChild(g)}const f=s.createElement("button");f.textContent="清空",f.title="把这份素材扔掉，节点变回空（不会删文件本身）",f.onclick=()=>{e.outputs=[];for(const g of l.edges.filter(x=>x.from===e.id&&!Ze(x)))si(g);rt(e),It(e),je(e.id),oe()},d.appendChild(f),a.textContent=n?(n.origin||n.filename||n.url||"").split(/[\\/]/).pop():"还没有文件",a.title=n&&(n.origin||n.filename||n.url)||"",r.appendChild(d),t.appendChild(r);const u=l.edges.filter(g=>g.from===e.id),p=s.createElement("div");p.className="slinks";const b=s.createElement("div");if(b.className="atitle",b.textContent=u.length?`喂给 ${u.length} 个节点`:"还没喂给任何节点",p.appendChild(b),!u.length){const g=s.createElement("div");g.className="anote",g.textContent=n?"把右边那颗点拖到一个节点上，这份素材就进它的格子。":"先在上面选一个文件，再把出口拖到别的节点上。",p.appendChild(g)}for(const g of u){const x=l.cards.find(re=>re.id===g.to);if(!x)continue;const v=s.createElement("div");v.className="slink";const w=s.createElement("button");w.className="nm",w.textContent=ve(x),w.title="选中这个节点",w.onclick=()=>At(x.id);const L=s.createElement("button");L.className="off",L.textContent="解除",L.title="这个节点不再收这份素材",L.onclick=()=>Yr(g),v.append(w,L),p.appendChild(v)}t.appendChild(p),vt()}const Ia=[["polish","润色","改得更通顺好读，不加料不改意思"],["optimize","优化","删废话、换具体说法，更精炼有表现力"],["expand","扩写","补细节补过渡，写到 2~3 倍长"],["custom","自定义","按下面写的指令处理文字"]];function vl(e){const t=s.createElement("div");t.className="pbody",h.panel.appendChild(t);const n=e.status==="running";e.params=e.params||{};const r=s.createElement("div");r.className="pblock";const o=s.createElement("div");o.className="phd",o.innerHTML="<span>内容</span>";const i=s.createElement("textarea");if(i.placeholder="在这里写字或直接在节点上写",i.value=String(e.params.text||""),i.disabled=n,i.oninput=()=>{e.params.text=i.value;const g=e._el?e._el.querySelector(".body"):null,x=g?g.querySelector("textarea.ttxt"):null;x&&(x.value=i.value),ai(e),oe()},r.append(o,i),t.appendChild(r),e.params.op==="custom"){const g=s.createElement("div");g.className="pblock";const x=s.createElement("div");x.className="phd",x.innerHTML="<span>指令</span>";const v=s.createElement("textarea");v.placeholder="例：把接进来的几段整理成一条朋友圈文案，口语一点，带两个 emoji",v.value=String(e.params.instr||""),v.oninput=()=>{e.params.instr=v.value,oe()},g.append(x,v),t.appendChild(g)}const a=l.edges.filter(g=>g.from===e.id&&Ze(g)),d=s.createElement("div");d.className="slinks";const c=s.createElement("div");if(c.className="atitle",c.textContent=a.length?`连着 ${a.length} 个节点`:"还没连给任何节点",d.appendChild(c),!a.length){const g=s.createElement("div");g.className="anote",g.textContent="把右边那颗点拖到生成节点（并进提示词）或别的文本节点（当输入）上；拖到空白处会列出所有能接的地方。",d.appendChild(g)}for(const g of a){const x=l.cards.find(re=>re.id===g.to);if(!x)continue;const v=s.createElement("div");v.className="slink";const w=s.createElement("button");w.className="nm",w.textContent=ve(x),w.title="选中这个节点",w.onclick=()=>At(x.id);const L=s.createElement("button");L.className="off",L.textContent="解除",L.title="这个节点不再用这段文本",L.onclick=()=>Yr(g),v.append(w,L),d.appendChild(v)}t.appendChild(d),e.error&&t.appendChild(Oo(e.error));const f=s.createElement("div");f.className="foot",f.appendChild(Vr((e.params.model||"api")==="local"?"🖥 本地 27B":"☁ 云端 API","模型",()=>[{icon:"☁",text:"云端 API —— 几秒就回，要配好 llm.json",run:()=>{e.params.model="api",je(e.id),oe()}},{icon:"🖥",text:"本地 27B —— 不花钱，占显存，第一次慢",run:()=>{e.params.model="local",je(e.id),oe()}}]));const u=g=>g?(Ia.find(x=>x[0]===g)||[0,g])[1]:"不加工";f.appendChild(Vr(u(e.params.op),"加工方式",()=>[{icon:"✍",text:"不加工 —— 就当一个纯文本节点，只存字",run:()=>{e.params.op="",rt(e),je(e.id),oe()}},...Ia.map(([g,x,v])=>({icon:"✎",text:`${x} —— ${v}`,run:()=>{e.params.op=g,rt(e),je(e.id),oe()}}))]));const p=s.createElement("span");if(p.style.cssText="color:#8a8a94;font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap",e._lastRun?p.textContent=(e._lastRun.via==="api"?"上次 ☁":"上次 🖥")+(e._lastRun.ms?` · ${(e._lastRun.ms/1e3).toFixed(1)} 秒`:""):e.params.op?p.textContent="结果写回节点 · 上游改了字，重跑一次就用新的":p.textContent="没选加工方式：这个节点只存字",p.title=p.textContent,f.appendChild(p),typeof e.params._prev=="string"&&e.params._prev!==e.params.text){const g=s.createElement("button");g.className="cancel",g.textContent="↩ 恢复运行前的字",g.title="上一次运行之前的节点上原文（只留这一步）",g.onclick=()=>{e.params.text=e.params._prev,delete e.params._prev,rt(e),je(e.id),oe()},f.appendChild(g)}const b=s.createElement("button");b.className="go",b.textContent="↑",b.title="运行",b.disabled=n||!e.params.op,b.onclick=()=>Bo(e),f.appendChild(b),h.panel.appendChild(f),vt()}async function kl(e){if(!Ge())return;const t=zn(e);if(!t)return ce("先在上面选一种加工方式（润色 / 优化 / 扩写 / 自定义）");if(e.status==="running")return ce("文本加工正在进行中，请稍候");e.error=null,e.status="running",e.ms=null,rt(e),h.panel._id===e.id&&je(e.id);try{const n=nr(e).map(a=>({name:a.name,text:a.text})),r=pn(e);r&&n.unshift({name:"节点上的原文",text:r});const o=await jt("/api/text",{op:t,model:(e.params||{}).model||"api",inputs:n,params:{instr:String((e.params||{}).instr||"")},project:l&&l.id,projectName:l&&l.name,card:e.id,cardName:ve(e)});e.params._prev=String((e.params||{}).text||""),e.params.text=o.text,e.status="done",e.ms=o.ms,e._lastRun=o,oe(),rt(e),h.panel._id===e.id&&je(e.id);const i=l.edges.filter(a=>a.from===e.id&&Ze(a)).length;ce(Cl(o)+(i?`
已连给 ${i} 个节点，它们下次运行会用这份新文本`:""))}catch(n){e.status="error",e.error=n.message,Ke.markWorkFailure(n),rt(e),h.panel._id===e.id&&je(e.id),be(n.message)}oe()}function Cl(e){const t=e.ms>=6e4?`${Math.floor(e.ms/6e4)} 分 ${Math.round(e.ms%6e4/1e3)} 秒`:`${(e.ms/1e3).toFixed(1)} 秒`;return`${e.via==="api"?"✅ 云端 API":"✅ 本地 27B"}，${t}`+(e.warn?`
⚠ ${e.warn}`:"")}function _l(e,t){const n=ke(e),r=t.filter(a=>(e.assets||{})[a.pairWith]),o=a=>cn(n.inputs.find(d=>d.key===a.pairWith)||a,e),i=s.createElement("div");if(i.className="ptabs",(e._tab==null||e._tab<0||e._tab>=r.length)&&(e._tab=r.length?0:-1),r.length){const a=s.createElement("div");a.className="tabs",r.forEach((d,c)=>{const f=s.createElement("button"),u=String(e.params[d.key]!=null?e.params[d.key]:d.default||"").trim();f.textContent=o(d)+(u?" ●":""),f.className=c===e._tab?"on":"",f.dataset.readonlyView="",f.onclick=()=>{e._tab=c,je(e.id,ge()?null:e)},a.appendChild(f)}),i.appendChild(a),i.appendChild(Ta(e,r[e._tab],o(r[e._tab])+" 的提示词"))}else{const a=s.createElement("div");a.className="tabempty",a.textContent="还没有图片引用。添加图片后，这里才显示对应提示词。",i.appendChild(a)}return i}function Ta(e,t,n){const r=s.createElement("div");r.className="pblock";const o=t.key==="negative_prompt",i=o?[]:se(e).map(pn),a=o?[]:nr(e),d=J[Pt(e)]||ke(e),c=!!(d&&d.rewrite&&t.key===(k(d)[0]||{}).key),f=c?Wr(e,t.key):null,u=!!(f&&e.optUse&&e.optUse[t.key]),p=s.createElement("div");p.className="phd";const b=s.createElement("span"),g=i.length+a.length;b.textContent=(n||t.label)+(g&&!u?`（已并入 ${g} 段文本）`:"");const x=s.createElement("span");x.className="demo",x.textContent="⚠ 这是示例文案，改成你要的内容",p.append(b,x),r.appendChild(p),f&&r.appendChild(El(e,t,u));const v=s.createElement("textarea");v.placeholder=`${n||t.label}：${o?"描述不希望出现的内容":"描述你想要的画面/动作/镜头"}`;const w=e.promptHeights?.[t.key];Number.isFinite(w)&&w>0&&(v.style.height=w+"px");const L=s.createElement("div");L.className="prompt-highlight-wrapper";const re=s.createElement("div");re.className="prompt-highlight-layer",L.appendChild(re),L.appendChild(v);function Ve(){const U=getComputedStyle(v);for(const ye of["fontFamily","fontSize","fontWeight","lineHeight","letterSpacing","wordSpacing","textIndent","paddingTop","paddingRight","paddingBottom","paddingLeft","borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth","boxSizing","width","height"])re.style[ye]=U[ye];re.style.borderStyle="solid",re.style.borderColor="transparent",re.style.whiteSpace="pre-wrap",re.style.overflowWrap=U.overflowWrap,re.style.wordBreak=U.wordBreak||"normal",re.style.top="0px",re.style.left="0px";const Y=v.offsetWidth-v.clientWidth;Y>0&&(re.style.paddingRight=parseFloat(U.paddingRight)+Y+"px")}let at=u?f:e.params[t.key]!=null?e.params[t.key]:o?t.default??"":"";if(!u&&g>0){const U=[];i.length>0&&i.forEach(ye=>{U.push(ye)}),a.length>0&&a.forEach(ye=>{U.push(ye.text)});const Y=U.join(`

`);v.value=Y+(at?`

`+at:`

`)}else v.value=at;function Qe(){const U=tt=>tt.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),Y=v.value;let ye="",pe=0;const Ce=/@([\u4e00-\u9fa5\w]+)/g;let Re;for(;!o&&(Re=Ce.exec(Y));)ye+=U(Y.slice(pe,Re.index)),ye+=`<mark class="at-mention" data-name="${U(Re[1])}">${U(Re[0])}</mark>`,pe=Re.index+Re[0].length;ye+=U(Y.slice(pe)),re.innerHTML=ye+`
`,re.scrollTop=v.scrollTop}u&&(v.classList.add("optta"),re.classList.add("opt")),v.addEventListener("wheel",U=>{U.stopPropagation()},{passive:!0}),v.addEventListener("keydown",U=>{if(o||U.isComposing||U.key!=="Backspace"&&U.key!=="Delete"||v.selectionStart!==v.selectionEnd)return;const Y=v.selectionStart,ye=/@([\u4e00-\u9fa5\w]+)/g;let pe;for(;pe=ye.exec(v.value);)if(U.key==="Backspace"?Y>pe.index&&Y<=pe.index+pe[0].length:Y>=pe.index&&Y<pe.index+pe[0].length){U.preventDefault(),v.setSelectionRange(pe.index,pe.index+pe[0].length),s.execCommand("delete");return}});let Fe=null,ht=-1;v.addEventListener("input",()=>{Qe();const U=v.selectionStart,ye=v.value.substring(0,U).match(/@([\u4e00-\u9fa5\w]*)$/);if(ye&&!u&&!o){const pe=ye[1].toLowerCase();ht=U-ye[0].length;const Ce=[],Re=new Set(l.edges.filter(ze=>ze.to===e.id).map(ze=>ze.from));l.cards.forEach(ze=>{if(ze.id===e.id||!(dt(ze)||ut(ze)||Wt(ze)))return;const Xe=ve(ze);if(!Xe.toLowerCase().includes(pe))return;const Xt=_t(ze);Ce.push({type:"card",section:"canvas",connected:Re.has(ze.id),card:ze,name:Xe,icon:Xt.icon||"◻",label:dt(ze)?"素材":ut(ze)?"文本":"风格"})});const tt=J[Pt(e)]||ke(e);tt&&tt.inputs&&tt.inputs.forEach(ze=>{if(!["image","audio","video"].includes(ze.type))return;const xt=e.assets[ze.key];if(!xt||!xt.ref)return;const Xe=cn(ze,e);Xe.toLowerCase().includes(pe)&&Ce.push({type:"slot",section:"current",key:ze.key,name:Xe,icon:ze.type==="image"?"🖼":ze.type==="audio"?"🎵":"🎬",label:Je[ze.type]||"素材"})}),Ce.length>0?En(v,Ce):gt()}else gt()});function En(U,Y){gt(),Fe=s.createElement("div"),Fe.id="menu",Fe.className="at-menu",Fe.style.position="absolute",Fe.style.maxHeight="280px",Fe.style.overflowY="auto";const ye=Xe=>{const Xt=s.createElement("button");Xt.className="at-menu-item"+(Xe.connected?" connected":"");const Lr=s.createElement("span");Lr.className="at-menu-icon",Lr.textContent=Xe.icon;const cr=s.createElement("span");cr.className="at-menu-name",cr.textContent=Xe.name;const Ir=s.createElement("span");Ir.className="at-menu-type",Ir.textContent=Xe.connected?`已连线 · ${Xe.label}`:Xe.label,Xt.append(Lr,cr,Ir),Xt.onclick=()=>{const Tr=Xe.name,Ho=U.value.substring(0,ht),Hl=U.value.substring(U.selectionStart);U.value=Ho+`@${Tr} `+Hl,U.selectionStart=U.selectionEnd=Ho.length+Tr.length+2,u?e.opt[t.key]=U.value:e.params[t.key]=Ee(U.value),Ae(),oe(),Qe(),gt(),U.focus()},Fe.appendChild(Xt)};for(const[Xe,Xt]of[["current","当前素材"],["canvas","画布"]]){const Lr=Y.filter(Tr=>Tr.section===Xe).sort((Tr,Ho)=>+!!Ho.connected-+!!Tr.connected);if(!Lr.length)continue;const cr=s.createElement("div");cr.className="at-menu-group";const Ir=s.createElement("span");Ir.textContent=Xt,cr.appendChild(Ir),Fe.appendChild(cr),Lr.forEach(ye)}const pe=kt(ht)||(()=>{const Xe=U.getBoundingClientRect();return{left:Xe.left+8,top:Xe.top+8,bottom:Xe.top+28}})();s.body.appendChild(Fe);const Ce=Fe.offsetWidth,Re=Fe.offsetHeight;let tt=pe.left-6,ze=pe.top-Re-6;ze<8&&(ze=pe.bottom+4),tt+Ce>innerWidth-8&&(tt=innerWidth-8-Ce),tt<8&&(tt=8),Fe.style.left=tt+"px",Fe.style.top=ze+"px";const xt=Xe=>{(!Fe||!Fe.contains(Xe.target)&&Xe.target!==U)&&(gt(),s.removeEventListener("mousedown",xt))};G(()=>s.addEventListener("mousedown",xt),0)}function gt(){Fe&&(Fe.remove(),Fe=null)}r.appendChild(L),Qe();const bt=new Ne(()=>{if(!v.isConnected){bt.disconnect();return}if(!v.offsetHeight)return;Ve(),re.scrollTop=v.scrollTop;const U=parseFloat(v.style.height);Number.isFinite(U)&&U>0&&U!==e.promptHeights?.[t.key]&&ge()&&(e.promptHeights=e.promptHeights||{},e.promptHeights[t.key]=U,oe())});bt.observe(v),v.addEventListener("scroll",()=>{re.scrollTop=v.scrollTop});let Le=null;function nt(U,Y){const ye=re.querySelectorAll(".at-mention");for(const pe of ye){const Ce=pe.getClientRects();for(const Re of Ce)if(U>=Re.left&&U<=Re.right&&Y>=Re.top&&Y<=Re.bottom)return pe}return null}function kt(U){const Y=[],ye=s.createTreeWalker(re,NodeFilter.SHOW_TEXT);for(;ye.nextNode();)Y.push(ye.currentNode);let pe=0,Ce=null,Re=0;for(const xt of Y){if(pe+xt.length>U){Ce=xt,Re=U-pe;break}pe+=xt.length}if(!Ce){const xt=Y[Y.length-1];if(!xt)return null;Ce=xt,Re=xt.length}const tt=s.createRange();tt.setStart(Ce,Re),tt.setEnd(Ce,Math.min(Re+1,Ce.length));const ze=tt.getClientRects()[0]||tt.getBoundingClientRect();return ze.width===0&&ze.height===0?null:ze}v.addEventListener("mousemove",U=>{const Y=nt(U.clientX,U.clientY);if(v.style.cursor=Y?"pointer":"",re.querySelectorAll(".at-mention.mhover").forEach(Re=>Re.classList.remove("mhover")),Y&&Y.classList.add("mhover"),!Y)return Me();const ye=Y.dataset.name;if(!ye)return;let pe=null;const Ce=l.cards.find(Re=>ve(Re)===ye);if(Ce){const Re=Ce.outputs||[];Re.length>0?pe={type:Re[0].kind,url:Re[0].url,name:ve(Ce)}:(ut(Ce)||Wt(Ce))&&(pe={type:"text",text:pn(Ce)||"(空)",name:ve(Ce)})}if(!pe){const Re=J[Pt(e)]||ke(e);if(Re&&Re.inputs){const tt=Re.inputs.find(ze=>cn(ze,e)===ye);tt&&e.assets[tt.key]&&(pe={type:tt.type,url:e.assets[tt.key].url,name:ye})}}pe?te(Y,pe):Me()}),v.addEventListener("mouseleave",Me),v.addEventListener("scroll",()=>{re.scrollTop=v.scrollTop,re.scrollLeft=v.scrollLeft,Me()});let O=null;function te(U,Y){if(Le&&O===Y.name)return;Me(),O=Y.name,Le=s.createElement("div"),Le.className="at-mention-preview",Le.style.cssText=`
      position: fixed; z-index: 100; background: #060a14f7; border: 1px solid var(--acc);
      border-radius: 3px; padding: 8px; box-shadow: 0 12px 36px #000d, 0 0 18px #00e5ff2e;
      backdrop-filter: blur(6px); max-width: 320px; pointer-events: none;
    `;const ye=s.createElement("div");if(ye.style.cssText="font-size: 11px; color: var(--acc); margin-bottom: 6px; letter-spacing: 1px;",ye.textContent=Y.name,Le.appendChild(ye),Y.type==="image"){const Ce=s.createElement("img");Ce.src=Y.url,Ce.style.cssText="max-width: 300px; max-height: 200px; display: block; border-radius: 2px;",Le.appendChild(Ce)}else if(Y.type==="video"){const Ce=s.createElement("video");eo(Ce,Y.url),Ce.style.cssText="max-width: 300px; max-height: 200px; display: block; border-radius: 2px;",Ce.muted=!0,Ce.autoplay=!0,Ce.loop=!0,Le.appendChild(Ce)}else if(Y.type==="audio"){const Ce=s.createElement("div");Ce.textContent="🎵 "+Y.name,Ce.style.cssText="padding: 12px; color: var(--txt); text-align: center;",Le.appendChild(Ce)}else if(Y.type==="text"){const Ce=s.createElement("div");Ce.textContent=Y.text.substring(0,200)+(Y.text.length>200?"...":""),Ce.style.cssText="color: var(--txt); font-size: 12px; line-height: 1.6; max-height: 150px; overflow: hidden;",Le.appendChild(Ce)}const pe=U.getBoundingClientRect();Le.style.left=pe.left+"px",Le.style.top=pe.bottom+4+"px",s.body.appendChild(Le)}function Me(){O=null,Le&&(Le.remove(),Le=null)}const Ae=()=>{const U=!o&&!u&&!!t.default&&v.value.trim()===String(t.default).trim();x.style.display=U?"":"none",v.classList.toggle("isdemo",U),re.classList.toggle("demo",U)},Ee=U=>{if(!U)return"";if(!g)return U.trim();const Y=[];i.length>0&&i.forEach(pe=>Y.push(pe)),a.length>0&&a.forEach(pe=>Y.push(pe.text));const ye=Y.join(`

`);return U.startsWith(ye)?U.substring(ye.length).trim().replace(/^\n+/,""):U.trim()};if(v.oninput=()=>{u?e.opt[t.key]=v.value:e.params[t.key]=Ee(v.value),Ae(),oe()},Ae(),c||!u){const U=s.createElement("div");U.className="ptoolbar";const Y=!!e._rwBusy,ye=e.params._promptModel||"api",pe=s.createElement("button");pe.className="tbtool model";const Ce=s.createElement("span");Ce.textContent=ye==="local"?"🖥 本地":"☁ 云端";const Re=s.createElement("i");Re.textContent="▾",pe.append(Ce,Re),pe.title="模型 —— 点击换",pe.onclick=Xe=>{Xe.stopPropagation();const Xt=pe.getBoundingClientRect();Lt(Xt.left,Xt.bottom+4,"模型",[{icon:"☁",text:"云端 API —— 几秒就回，要配好 llm.json",run:()=>{e.params._promptModel="api",oe(),_n(e)}},{icon:"🖥",text:"本地 27B —— 不花钱，占显存，第一次慢",run:()=>{e.params._promptModel="local",oe(),_n(e)}}])},U.appendChild(pe);const tt=s.createElement("button");tt.className="tbtool",tt.textContent="🌐 翻译",tt.disabled=Y,tt.title="中→英 / 英→中 自动判断（有道翻译）",tt.onclick=()=>$l(e,t),U.appendChild(tt);const ze=s.createElement("div");ze.style.cssText="display: flex; gap: 4px; margin-left: auto;";const xt=s.createElement("button");if(xt.className="tbtool",xt.textContent=u?"扔掉这份":"清空",xt.title=u?"删掉优化结果，切回你自己写的原词（原词一直没被动过）":"清空提示词",xt.onclick=()=>{if(u)return delete e.opt[t.key],delete e.optUse[t.key],e.optStyle&&delete e.optStyle[t.key],oe(),_n(e);if(e.params[t.key]="",!u&&g>0){const Xe=[];i.length>0&&i.forEach(Xt=>{Xe.push(Xt)}),a.length>0&&a.forEach(Xt=>{Xe.push(Xt.text)}),v.value=Xe.join(`

`)}else v.value="";Ae(),v.focus(),oe()},ze.appendChild(xt),c){const Xe=s.createElement("button");Xe.className="tbtool opt",Xe.textContent=Y?"⏳ 优化中…":"✨ 优化",Xe.disabled=Y,Xe.title="优化提示词：融入风格、补充细节"+(f?`
已有优化结果，再点会覆盖`:"")+`
接入的文本节点会一起融进结果`,Xe.onclick=()=>Ml(e,t,ye),ze.appendChild(Xe)}U.appendChild(ze),r.appendChild(U)}if(e._rwErr&&e._rwErr.key===t.key){const U=s.createElement("div");U.className="rwerr",U.textContent="操作失败："+e._rwErr.msg,r.appendChild(U)}return r}function El(e,t,n){const r=s.createElement("div");r.className="opttabs";const o=(f,u,p)=>{const b=s.createElement("button");return b.className=f?"on":"",b.textContent=u,b.title=p,b.onclick=()=>{e.optUse=e.optUse||{},e.optUse[t.key]=u!=="原词",oe(),_n(e)},b},i=de(e).join(`

`),a=e.optStyle&&e.optStyle[t.key]||"",d=i!==a;r.append(o(!n,"原词","你自己写的那段。生成时"+(i?"会在前面拼上接入的文本节点":"原样提交")),o(n,"✨优化后","大模型优化出来的那段，已经是这个模型认的格式。"+(a?`
接入的文本已经融在里面了，生成时不再另外拼`:"")+`
原样提交`));const c=s.createElement("span");return c.className="note",n?d?(c.className="note bad",c.textContent="⚠ "+(a?i?"风格节点换过了，这份里还是旧的":"风格节点摘了，这份里还留着它":"风格节点是优化之后挂的，这份里没有它")+" —— 点「重新优化」",c.title="优化结果是一段写死的文字，风格在优化那一刻就烙进去了，之后改风格节点不会让它跟着变。要么重新优化一次，要么切回「原词」。"):c.textContent=i?"已含接入的文本，提交时不再另拼":"按模型认的格式写好了，原样提交":c.textContent=i?"提交时会拼上接入的文本":"",r.appendChild(c),r}const _n=e=>{h.panel._id===e.id&&je(e.id)};function Sl(e){const t=e.ms>=6e4?`${Math.floor(e.ms/6e4)} 分 ${Math.round(e.ms%6e4/1e3)} 秒`:`${(e.ms/1e3).toFixed(1)} 秒`;return`${e.fallback?`⚠ API 没通（${e.fallback}），本地 27B 兜的`:e.via==="api"?`✅ API 改的（${e.model||"远程"}）`:"✅ 本地 27B 改的"}，${t}`+(e.warn?`
⚠ `+e.warn:"")}function $l(e,t){return X(jl(e,t))}async function jl(e,t){if(!Ge())return;if(e._rwBusy)return ce("翻译正在进行中，请稍候");const n=!!(e.optUse&&e.optUse[t.key]),r=n&&e.opt&&e.opt[t.key]?String(e.opt[t.key]):String(e.params[t.key]!=null?e.params[t.key]:t.default||"");if(!r.trim())return ce("先写点内容再翻译");e._rwBusy=!0,e._rwErr=null,_n(e);try{const o=await jt("/api/text",{op:"translate",model:"youdao",inputs:[{name:"原文",text:r}],params:{},project:l&&l.id,projectName:l&&l.name,card:e.id,cardName:ve(e)});n?(e.opt=e.opt||{},e.opt[t.key]=o.text):e.params[t.key]=o.text,oe(),e._rwBusy=!1,_n(e),ce(`翻译完成 · ${(o.ms/1e3).toFixed(1)} 秒 · ${o.model||"翻译服务"}`+(o.warn?`
${o.warn}`:""))}catch(o){e._rwBusy=!1,e._rwErr={key:t.key,msg:o.message},Ke.markWorkFailure(o),_n(e),be("翻译失败："+o.message)}}function Mi(e,t){if(!e||!l)return e;const n=J[Pt(t)]||ke(t);if(!n)return e;const r=new Map;let o=1,i=1,a=1;for(const d of n.inputs||[]){const c=t.assets[d.key];if(!c||!c.ref)continue;const f=cn(d,t);d.type==="image"?r.set(f,`<Picture ${o}>`):d.type==="audio"?r.set(f,`<Audio ${i}>`):d.type==="video"&&r.set(f,`<Video ${a}>`);const u=l.cards.find(p=>(p.outputs||[]).some(b=>b.url&&c.url&&b.url===c.url||b.filename&&c.filename&&b.filename===c.filename));if(u){const p=ve(u);d.type==="image"?(r.set(p,`<Picture ${o}>`),o++):d.type==="audio"?(r.set(p,`<Audio ${i}>`),i++):d.type==="video"&&(r.set(p,`<Video ${a}>`),a++)}else d.type==="image"?o++:d.type==="audio"?i++:d.type==="video"&&a++}return e.replace(/@([\u4e00-\u9fa5\w]+)/g,(d,c)=>{const f=r.get(c);if(f)return f;const u=l.cards.find(p=>ve(p)===c);return u&&(ut(u)||Wt(u))&&pn(u)||d})}function Nl(e){const t={},n=J[Pt(e)]||ke(e);if(!n)return t;for(const r of n.inputs||[]){const o=e.assets[r.key];if(!o||!o.ref)continue;const i=l.cards.find(a=>(a.outputs||[]).some(d=>d.url&&o.url&&d.url===o.url||d.filename&&o.filename&&d.filename===o.filename));i?t[r.key]=ve(i):t[r.key]=cn(r,e)}return t}function Ml(e,t,n){return X(zl(e,t,n))}async function zl(e,t,n){if(!Ge())return;const r=J[Pt(e)]||ke(e);if(!r||!r.rewrite)return;if(e._rwBusy)return ce("优化正在进行中，请稍候");const o=String(e.params[t.key]!=null?e.params[t.key]:t.default||""),i=de(e);if(!o.trim()&&!i.length)return ce("先写一句你想要什么，优化才有东西可改");const a=Mi(o,e);e._rwBusy=!0,e._rwErr=null,_n(e);try{await Zo(e);const d=Li(e),c=await jt("/api/rewrite",{capability:r.id,params:d.params,assets:d.assets,prompt:a,style:i.join(`

`),model:n||"auto",cardInfo:Nl(e),project:l&&l.id,projectName:l&&l.name,card:e.id,cardName:ve(e)});console.log("=== /api/rewrite 返回数据 ==="),console.log(JSON.stringify(c,null,2)),console.log("=== r.text 内容 ==="),console.log(c.text),console.log("=========================");let f=c.text||"";f=f.replace(/^[\s\S]*?<\/think>/i,""),f=f.replace(/^[\s\S]*?<\/thinking>/i,""),f=f.replace(/^[\s\S]*?<\/thought>/i,""),f=f.trim(),e.opt=e.opt||{},e.optUse=e.optUse||{},e.optStyle=e.optStyle||{},e.opt[t.key]=f,e.optUse[t.key]=!0,e.optStyle[t.key]=i.join(`

`),oe(),ce(Sl(c))}catch(d){e._rwErr={key:t.key,msg:d.message},Ke.markWorkFailure(d),be("优化失败："+d.message)}e._rwBusy=!1,_n(e)}function Pl(e,t){const n=s.createElement("div");n.className="tpl";const r=s.createElement("button");r.className="tplhd",r.dataset.readonlyView="";const o=s.createElement("div");o.style.display="none";const i=s.createElement("textarea");i.value=e.params[t.key]!=null?e.params[t.key]:t.default||"";const a=()=>{const f=i.value.trim()!==String(t.default||"").trim(),u=o.style.display!=="none";r.textContent=`${u?"▾":"▸"} ${t.label}`+(f?"（已被改过，出片结构可能跑偏）":"（预设，默认不用动）"),r.classList.toggle("dirty",f),c.style.display=f?"":"none"};r.onclick=()=>{o.style.display=o.style.display==="none"?"":"none",a()};const d=s.createElement("div");d.className="tplnote",d.textContent="⚠ "+(t.note||"预设参数，改了会影响出片。");const c=s.createElement("button");return c.className="tplrst",c.textContent="恢复预设",c.onclick=()=>{i.value=t.default||"",e.params[t.key]=i.value,a(),oe()},i.oninput=()=>{e.params[t.key]=i.value,a(),oe()},o.append(d,i,c),a(),n.append(r,o),n}function Gt(e){if(!e._el)return;const t=e._el.querySelector(".ch .t");t.textContent=ve(e),t.classList.toggle("named",!!e.name),It(e),Ra(e)}function It(e){Xr(e);const t=e._el&&e._el.querySelector(".cf .kt");if(!t)return;if(Wt(e)){t.dataset.kind="style",t.textContent="🎨 只加提示词",t.title="这个节点不生成任何东西：把它的出口拖到生图/生视频节点上，提交时这段风格会并进那个节点的提示词";return}if(nn(e)){t.style.display="",t.dataset.kind="text",t.textContent="✍ 文本",t.title=zn(e)?"选了加工方式：点「↑ 运行」把接进来的文本加工后写回这个节点":"存一段文字：连到生成节点就并进提示词，连到别的文本节点就当它的输入；在面板里选加工方式可以让大模型来加工";return}if(dt(e)){const p=Bn(e);t.style.display="",t.dataset.kind=p?p.kind:"both";const b=p&&p.width&&p.height?` ${p.width}×${p.height}`:"";t.textContent=p?`📎 ${Je[p.kind]||p.kind}${b}`:"📎 空的",t.title=p?`${p.origin||""}
把右边的出口拖到别的节点 → 这份素材就进那个节点的格子里`:"点这个节点选一个文件（图片 / 视频 / 音频都收）";const g=e._el.querySelector(".body");!p&&g&&g.querySelector(".ph")&&(g.innerHTML=Sr(e));return}const n=Bt(e),r=ra(e),o=na(e);t.dataset.kind=r?"both":o;const i=(e.outputs||[])[0],a=i&&i.width&&i.height?` ${i.width}×${i.height}`:"";t.textContent=r?"🖼🎬 跟素材":o==="video"?`🎬 视频${a}`:`🖼 图片${a}`;const d=((ke(e)||{}).inputs||[]).filter(p=>wt.includes(p.type)),c=n&&n.route?Object.keys(n.route):[...new Set(d.map(p=>p.type))],f=[...new Set(d.filter(p=>p.required).map(p=>p.type))];t.title=(r?"放图片就出图片、放视频就出视频":`这个节点出${Je[o]}`)+(f.length?`；必需${f.map(p=>Je[p]||p).join(" / ")}素材`:c.length?`；可引用${c.map(p=>Je[p]||p).join(" / ")}素材`:"；不用素材");const u=e._el.querySelector(".body");!ut(e)&&u&&u.querySelector(".ph")&&(u.innerHTML=Sr(e))}function Ra(e){const t=e._el&&e._el.querySelector(".inport");if(!t)return;const n=Bt(e),r=ke(e);if(dt(e)){t.style.display="none";return}const o=nn(e),i=n&&n.route?Object.keys(n.route):[...new Set((r?r.inputs:[]).filter(d=>wt.includes(d.type)).map(d=>d.type))];if(!i.length&&!o){t.style.display="none";return}const a=!ut(e)&&k(r).length;t.style.display="",t.title=o?"文本节点的出口拖到这里：接进来的文字都是这段加工的输入（按连线顺序）":i.length?`上游节点的产物拖到这里（收${i.map(d=>Je[d]||d).join(" / ")}${a?"，也收文本节点":""}）`:"文本节点的出口拖到这里"}const zi="application/x-chouka-image-slot";function Ll(e,t,n,r){const o=t.map(b=>b.key),i=o.indexOf(n),a=o.indexOf(r);if(i<0||a<0||i===a)return!1;const d=o.map(b=>({key:b,asset:e.assets[b]})),[c]=d.splice(i,1);d.splice(a,0,c);const f=Object.fromEntries(d.map((b,g)=>[b.key,o[g]]));d.forEach((b,g)=>{e.assets[o[g]]=b.asset});const u=ke(e),p=new Map((u&&u.inputs||[]).filter(b=>b.pairWith).map(b=>[b.pairWith,b.key]));if(o.every(b=>p.has(b))){const b=d.map((x,v)=>({from:p.get(x.key),to:p.get(o[v])}));for(const x of[e.params,e.opt,e.optUse,e.optStyle]){if(!x)continue;const v=b.map(w=>({to:w.to,has:Object.prototype.hasOwnProperty.call(x,w.from),value:x[w.from]}));for(const w of b)delete x[w.to];for(const w of v)w.has&&(x[w.to]=w.value)}const g=o.filter(x=>p.has(x));Number.isInteger(e._tab)&&g[e._tab]&&(e._tab=g.indexOf(f[g[e._tab]]))}for(const b of l&&l.edges||[])b.to!==e.id||Ze(b)||(f[b.slot]&&(b.slot=f[b.slot]),Array.isArray(b.slots)&&(b.slots=b.slots.map(g=>f[g]||g)));return!0}function Il(e,t,n,r){if(r.length<2)return;n.draggable=!0,n.classList.add("sortable"),n.title+=`
拖拽可调整图片顺序`;const o=i=>Array.from(i.dataTransfer&&i.dataTransfer.types||[]).includes(zi);n.ondragstart=i=>{if(!Ge())return i.preventDefault();n._skipClick=!0,i.dataTransfer.effectAllowed="move",i.dataTransfer.setData(zi,t.key),Se(()=>n.classList.add("dragging"))},n.ondragenter=i=>{o(i)&&(i.preventDefault(),i.stopPropagation(),n.classList.add("drop-target"))},n.ondragover=i=>{o(i)&&(i.preventDefault(),i.stopPropagation(),i.dataTransfer.dropEffect="move")},n.ondragleave=i=>{n.contains(i.relatedTarget)||n.classList.remove("drop-target")},n.ondrop=i=>{if(!o(i))return;i.preventDefault(),i.stopPropagation(),n.classList.remove("drop-target");const a=i.dataTransfer.getData(zi);Ll(e,r,a,t.key)&&(It(e),et(),fe(),je(e.id),oe())},n.ondragend=()=>{n.classList.remove("dragging","drop-target"),G(()=>{n._skipClick=!1},0)}}function Oa(e,t,n){const r=ke(e),o=s.createElement("div");o.className="slots refs";const i=t.filter(p=>(e.assets||{})[p.key]),a=n&&n.route,d=[...new Set(t.map(p=>p.type))],c=s.createElement("div");if(c.className="refhead",a)c.textContent="引用上限：素材 1 个";else{const p=[];for(const b of d){const g=Xn(r,b);g&&p.push(`${Je[b]||b} ${g}`)}c.textContent=p.length?`引用上限：${p.join(" · ")}`:"当前模型不支持画布素材引用"}o.appendChild(c);const f=i.filter(p=>p.type==="image");for(const p of i){const b=Tl(e,p);p.type==="image"&&Il(e,p,b,f),o.appendChild(b)}const u=s.createElement("div");if(u.className="refadds",a){if(!i.length&&t.length){const p=s.createElement("button");p.className="refadd",p.textContent="＋ 添加素材（0/1）",p.title="可引用图片或视频，上限 1 个",p.onclick=()=>Ao(e,t[0]),u.appendChild(p)}}else for(const p of d){const b=Xn(r,p),g=i.filter(w=>w.type===p).length,x=t.find(w=>w.type===p&&!(e.assets||{})[w.key]);if(!b||g>=b||!x)continue;const v=s.createElement("button");v.className="refadd",v.textContent=`＋ 添加${Je[p]||p}（${g}/${b}）`,v.title=`${Je[p]||p}引用上限 ${b}`,v.onclick=()=>Ao(e,x),u.appendChild(v)}return u.childElementCount&&o.appendChild(u),o}function Tl(e,t){const n=e.assets[t.key],r=s.createElement("div");r.className="slot"+(n?" filled":t.required?" req":""),r.dataset.key=t.key,r.title=(t.hint||cn(t,e))+(t.required?"（必填）":"")+(n?`
单击预览；右键更换、下载或清空素材`:`
单击上传素材`),r.innerHTML='<div class="box"></div><span class="lbl"></span>',r.querySelector(".lbl").textContent=cn(t,e);const o=r.querySelector(".box");return n?(o.innerHTML=n.kind==="image"?`<img src="${n.url}" draggable="false">`:n.kind==="video"?`<video data-video-url="${n.url}" muted draggable="false"></video>`:"🎵",ja(o)):o.textContent=t.type==="audio"?"🎵":t.type==="video"?"🎬":Wi(t)?"田":"＋",r.onclick=()=>{if(!r._skipClick)return n?ro(n):Ao(e,t)},r.oncontextmenu=i=>{i.stopPropagation(),i.preventDefault(),n&&Lt(i.clientX,i.clientY,n.origin||cn(t,e),[{icon:"⛶",text:n.kind==="image"?"查看大图":"放大播放",run:()=>ro(n)},{icon:"↻",text:"更换素材",run:()=>Ao(e,t)},{icon:"↓",text:"下载素材",run:()=>Zr({...n,filename:n.origin||n.filename||n.url})},{icon:"✕",text:"清空这一格",danger:!0,run:()=>{delete e.assets[t.key],aa(e.id,t.key),It(e),et(),fe(),je(e.id),oe()}}])},r}const Aa=e=>{const t=String(e??"").split(":"),n=t.length>1?+t[0]*60+ +t[1]:+t[0];return Number.isFinite(n)?Math.max(0,Math.round(n)):0},io=e=>`${Math.floor(e/60)}:${String(Math.round(e)%60).padStart(2,"0")}`;function Rl(e,t,n,r){const o=s.createElement("div");o.className="arange";const i=s.createElement("div");i.className="atitle",i.textContent="用音频的哪一段",o.appendChild(i);const a=e.assets[t.key];if(!a){const Le=s.createElement("div");return Le.className="anote",Le.textContent=`先在上面的「${cn(t,e)}」传一段音频，这里就能试听、拖着选要用的一段。`,o.appendChild(Le),o}const d=s.createElement("audio");d.src=a.url,d.preload="metadata",o.appendChild(d);const c=s.createElement("div");c.className="atrack",c.innerHTML='<div class="asel"></div><div class="ahead"></div><div class="ahd s" title="拖动：选段从这里开始"></div><div class="ahd e" title="拖动：选段到这里结束"></div>';const f=c.querySelector(".asel"),u=c.querySelector(".ahead"),p=c.querySelector(".ahd.s"),b=c.querySelector(".ahd.e");o.appendChild(c);const g=s.createElement("div");g.className="aout",o.appendChild(g);const x=s.createElement("div");x.className="abtn",o.appendChild(x);const v=s.createElement("div");v.className="anote",v.textContent="点条子上任意位置就从那儿开始听；听到该起／该停的地方，按下面两个按钮把边界钉在那里。",o.appendChild(v);let w=Aa(e.params[n.key]!=null?e.params[n.key]:n.default),L=Aa(e.params[r.key]!=null?e.params[r.key]:r.default);const re=()=>Math.floor(d.duration)||Math.max(L,1);function Ve(Le,nt){const kt=re();if(Le=Math.max(0,Math.min(Math.round(Le),kt-1)),nt=Math.max(Le+1,Math.min(Math.round(nt),kt)),Le===w&&nt===L)return bt();w=Le,L=nt,e.params[n.key]=io(w),e.params[r.key]=io(L),bt(),oe()}d.onloadedmetadata=()=>Ve(w,L);let at=0;const Qe=(Le,nt)=>{at=nt,d.currentTime=Le,d.play()};d.ontimeupdate=()=>{at&&d.currentTime>=at&&d.pause(),bt()},d.onplay=d.onpause=d.onended=()=>bt();const Fe=(Le,nt,kt)=>{const O=s.createElement("button");return O.textContent=Le,O.title=nt,O.onclick=kt,x.appendChild(O),O},ht=Fe("▶ 试听选段","只放选中的这一段",()=>d.paused?Qe(w,L):d.pause());Fe("▶ 整条","从头放到尾，用来找该从哪儿起",()=>Qe(0,0)),Fe("⇤ 起点钉在这","把选段开头挪到当前播放位置",()=>Ve(Math.floor(d.currentTime),L)),Fe("终点钉在这 ⇥","把选段结尾挪到当前播放位置",()=>Ve(w,Math.ceil(d.currentTime)));const En=Le=>{const nt=c.getBoundingClientRect();return Math.max(0,Math.min(1,(Le.clientX-nt.left)/nt.width))*re()},gt=Le=>nt=>{nt.stopPropagation(),nt.preventDefault();const kt=te=>Le==="s"?Ve(En(te),L):Ve(w,En(te)),O=()=>{q.removeEventListener("mousemove",kt),q.removeEventListener("mouseup",O)};q.addEventListener("mousemove",kt),q.addEventListener("mouseup",O)};p.onmousedown=gt("s"),b.onmousedown=gt("e"),c.onmousedown=Le=>{Le.stopPropagation(),d.currentTime=En(Le),bt()};function bt(){const Le=re(),nt=kt=>Math.max(0,Math.min(kt,Le))/Le*100+"%";f.style.left=nt(w),f.style.width=(Math.min(L,Le)-w)/Le*100+"%",p.style.left=nt(w),b.style.left=nt(L),u.style.left=nt(d.currentTime),g.textContent=`${io(w)} → ${io(L)}　选中 ${L-w} 秒`+(d.duration?`　（整条 ${io(Math.floor(d.duration))}）`:""),ht.textContent=d.paused?"▶ 试听选段":"⏸ 停"}return bt(),o}function Ao(e,t){if(!Ge())return;const n=Bt(e),r=n&&n.route&&Object.keys(n.route).length>1&&Object.values(n.route).some(o=>o.slot===t.key);h.picker.accept=r?Object.keys(n.route).map(o=>`${o}/*`).join(","):t.type==="audio"?"audio/*":t.type==="video"?"video/*":"image/*",h.picker.onchange=()=>X((async()=>{const o=h.picker.files[0];if(h.picker.value="",!!o)try{cs(e,t,await Yt(o,ke(e)?.execution==="browser")),je(e.id),oe()}catch(i){Ke.markWorkFailure(i),be("上传失败："+i.message)}})()),h.picker.click()}function Fo(e,t){Ge()&&(h.picker.accept="image/*,video/*,audio/*",h.picker.onchange=()=>X((async()=>{const n=h.picker.files[0];if(h.picker.value="",!!n)try{const r=await Yt(n);t?await t(r):await ao(e,r)}catch(r){Ke.markWorkFailure(r),be("上传失败："+r.message)}})()),h.picker.click())}async function ao(e,t,n=!0){if(!Ge()||!l.cards.includes(e))return;e.outputs=[{...t,filename:(t.origin||t.url).split(/[\\/]/).pop()}],delete e.w,delete e.h,In(e),rt(e),Gt(e),n&&je(e.id),et(),oe();const r=l.edges.filter(o=>o.from===e.id&&!Ze(o));for(const o of r){const i=l.cards.find(a=>a.id===o.to);if(!(!i||!i.assets)){for(const a of bn(o))i.assets[a]=JSON.parse(JSON.stringify(e.outputs[0]));Hn(i),It(i)}}if(t.kind==="image"){const o=new Image;o.onload=()=>{if(!l?.cards.includes(e)||e.outputs[0]?.url!==t.url)return;const i=o.naturalWidth,a=o.naturalHeight;e.outputs[0].width=i,e.outputs[0].height=a,It(e),oe()},o.src=t.url}else if(t.kind==="video"){const o=s.createElement("video");o.onloadedmetadata=()=>{if(!l?.cards.includes(e)||e.outputs[0]?.url!==t.url)return;const i=o.videoWidth,a=o.videoHeight;e.outputs[0].width=i,e.outputs[0].height=a,It(e),oe()},eo(o,t.url)}}function Ol(){Ge()&&l&&Fo(null,e=>{const t=pi(),n=xn("card_asset",t.x,t.y);n&&(ao(n,e),ce(`已放进一个素材节点（${Je[e.kind]||e.kind}）：把它右边那颗点拖到生图/生视频/工具节点上，这份素材就进那个节点的格子`))})}function Do(e,t){const n=s.createElement("div");n.className="row";const r=s.createElement("label");r.textContent=t.label,r.title=t.hint||t.label,n.appendChild(r);const o=e.params[t.key]!=null?e.params[t.key]:t.type==="seed"?-1:t.default;if(Ye(e)&&t.key==="duration"){const i=s.createElement("input");i.type="number",i.min=t.min,t.max!=null&&(i.max=t.max),i.step=1,i.required=!0,i.value=o,i.style.width="72px";const a=t.max!=null?s.createElement("input"):null;a&&(a.type="range",a.min=t.min,a.max=t.max,a.step=1,a.value=o,a.oninput=()=>{i.value=a.value,e.params.duration=Number(a.value),oe()},n.appendChild(a)),i.oninput=()=>{e.params.duration=i.value===""?"":Number(i.value),a&&(a.value=i.value),oe()},i.onchange=()=>{Yo(e),i.value=e.params.duration,a&&(a.value=i.value),oe()},n.appendChild(i)}else if(t.type==="slider"){const i=s.createElement("input");i.type="range",i.min=t.min!=null?t.min:1,i.max=t.max!=null?t.max:30,i.step=t.step||1;const a=J[Pt(e)]||ke(e),d=bs(e,a);if(t.key==="duration"&&d&&!a.inputs.some(u=>u.key==="preview_seconds")){const u=[+d.duration,+o].filter(p=>Number.isFinite(p)&&p>0);i.min=Math.min(+i.min,...u),i.max=Math.max(+i.max,...u),i.step="any"}const c=s.createElement("input");c.type="number",c.min=i.min,c.max=i.max,c.step=i.step,c.style.width="72px",i.value=c.value=o??i.min;const f=u=>{i.value=c.value=u,e.params[t.key]=parseFloat(u),oe()};i.oninput=()=>f(i.value),c.oninput=()=>f(c.value),n.appendChild(i),n.appendChild(c)}else if(t.type==="seed"){const i=s.createElement("input");i.type="number",i.style.flex="1",i.value=o??-1,i.oninput=()=>{e.params[t.key]=i.value===""?-1:parseInt(i.value),oe()};const a=s.createElement("button");a.className="dice",a.textContent="🎲 随机",a.title="-1 = 每次随机",a.onclick=()=>{i.value=-1,e.params[t.key]=-1,oe()},n.appendChild(i),n.appendChild(a)}else if(t.type==="textarea"){const i=s.createElement("textarea");i.style.flex="1",i.style.minHeight="48px",i.value=o??"",i.oninput=()=>{e.params[t.key]=i.value,oe()},n.appendChild(i)}else if(t.type==="select"&&t.appearance==="switch"){const i=s.createElement("button");i.type="button",i.className="param-switch",i.id=`param-${e.id}-${t.key}`,r.htmlFor=i.id,i.setAttribute("role","switch"),i.setAttribute("aria-label",t.label);const a=s.createElement("span");a.className="param-switch-track",a.setAttribute("aria-hidden","true");const d=s.createElement("span");d.className="param-switch-thumb",a.appendChild(d);const c=s.createElement("span");c.className="param-switch-state",c.setAttribute("aria-hidden","true"),i.append(a,c);const f=()=>{const u=(e.params[t.key]??t.default)==="on";i.setAttribute("aria-checked",String(u)),c.textContent=u?"开启":"关闭"};i.onclick=()=>{e.params[t.key]=i.getAttribute("aria-checked")==="true"?"off":"on",f(),oe()},f(),n.appendChild(i)}else if(t.type==="select"&&t.options){const i=s.createElement("select");i.style.flex="1";for(const a of t.options){const d=s.createElement("option");d.value=typeof a=="object"?a.value:a,d.textContent=typeof a=="object"?a.label:a,i.appendChild(d)}o!=null&&(i.value=o),i.onchange=()=>{e.params[t.key]=i.value,oe(),t.key==="aspect_ratio"&&je(e.id)},n.appendChild(i)}else{const i=s.createElement("input");i.type=t.type==="number"?"number":"text",t.min!=null&&(i.min=t.min),t.max!=null&&(i.max=t.max),i.value=o??"",i.style.flex="1",i.oninput=()=>{e.params[t.key]=i.type==="number"?i.value===""?"":parseFloat(i.value):i.value,oe()},n.appendChild(i)}if(t.warnAbove!=null&&t.warning){const i=s.createElement("div");i.className="paramwarn";const a=()=>{const d=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default);i.hidden=!isFinite(d)||d<=t.warnAbove,i.textContent=t.warning};for(const d of n.querySelectorAll("input, select"))d.addEventListener("input",a),d.addEventListener("change",a);a(),n.appendChild(i)}if(t.showHint&&t.hint){const i=s.createElement("div");i.className="knobnote",i.id=`param-${e.id}-${t.key}-hint`,i.textContent=t.hint;const a=[...n.querySelectorAll("input, select, textarea, button")];for(const[d,c]of a.entries())c.id=`param-${e.id}-${t.key}-${d}`,c.setAttribute("aria-describedby",i.id),c.setAttribute("aria-label",t.label+(d?"数值":""));a.length&&(r.htmlFor=a[0].id),n.appendChild(i)}return(t.key==="megapixels"||t.key==="scale_to_length")&&Fl(e,t,n),t.key==="frame_load_cap"&&Al(e,t,n),n}async function Al(e,t,n){const r=Object.values(e.assets||{}).find(c=>c&&c.kind==="video"),o=s.createElement("span");o.className="resout";const i=s.createElement("div");if(i.className="resline",i.appendChild(o),n.appendChild(i),!r){o.textContent="放进视频后这里显示总帧数";return}let a="读取总帧数…";const d=()=>{if(!r.frames){o.textContent=a;return}const c=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default)||0;o.textContent=`这段共 ${r.frames} 帧`+(r.fps?` · ${(+r.fps).toFixed(0)} fps · ${(+r.duration).toFixed(1)} 秒`:"")+(c>0&&c<r.frames?` → 只跑前 ${c} 帧`:" → 整段都跑")};d();for(const c of n.querySelectorAll("input"))c.addEventListener("input",d);if(!r.frames){try{Object.assign(r,await $t("/api/media?ref="+encodeURIComponent(r.ref)+"&project="+encodeURIComponent(l.id))),r.frames&&oe()}catch(c){be(`读取媒体信息失败：${c.message}`)}a="总帧数读不出来（填 0 = 整段，一定没错）",d()}}function Fl(e,t,n){const o=ke(e).inputs.find(b=>b.key==="aspect_ratio"),i=o?e.params.aspect_ratio!=null?e.params.aspect_ratio:o.default:"16:9 (Widescreen)",a=s.createElement("span");a.className="resout";const d=[...n.querySelectorAll("input")],c=()=>{const b=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default);if(!isFinite(b)){a.textContent="";return}if(t.key==="megapixels"){const[g,x]=mr(i,b);a.textContent=`${g}×${x} · ${Math.min(g,x)}p`,a.title=`${i}，${b} 百万像素`}else a.textContent=`16:9 素材 → ${Math.round(b)}×${Xa(b)} · ${Xa(b)}p`,a.title="长边固定为这个值，短边按素材原比例算，所以 p 数随素材变"},f=b=>{for(const g of d)g.value=b;e.params[t.key]=b,c(),oe()},u=s.createElement("span");u.className="presets";for(const b of fr){const g=t.key==="megapixels"?is(i,b):rs[b],x=s.createElement("button");x.textContent=b+"p",g>t.max?(x.disabled=!0,x.title=t.key==="megapixels"?`${i} 下 ${b}p 需要 ${g} 百万像素，超过当前参数上限 ${t.max}`:`最长边 ${g}px 超过当前参数上限 ${t.max}`):(x.title=t.key==="megapixels"?`${mr(i,g).join("×")} · 短边 ${b}p`:`16:9 素材约 ${b}p；最长边 ${g}px，实际短边随素材比例变化`,x.onclick=()=>f(g)),u.appendChild(x)}const p=s.createElement("div");p.className="resline",p.append(a,u),n.appendChild(p);for(const b of d)b.addEventListener("input",c);c()}function qo(e,t=l){return t?.director?.shots?.find(n=>n.id===e.director_shot||n.image?.card===e.id||n.video?.card===e.id)}function Pi(e){const t=qo(e);if(!t)return[];const n=[];return t.shotSize&&n.push("景别："+t.shotSize),(e.director_stage==="video"||t.video?.card===e.id)&&t.movement&&n.push("运镜："+t.movement),l.director.style?.trim()&&n.push("统一画面风格："+l.director.style.trim()),n}function Li(e){const t=J[Pt(e)]||ke(e),n={},r={},o=de(e),i=Pi(e),a=new Set(k(t).map(d=>d.key));for(const d of t.inputs){if(wt.includes(d.type)||d.mirror)continue;const c=e.params[d.key];if(c!=null?n[d.key]=c:d.type==="seed"?n[d.key]=-1:d.default!==void 0&&(n[d.key]=d.default),!a.has(d.key))continue;const f=gn(e,d.key);if(f!=null)n[d.key]=f;else{let u=Mi(n[d.key],e);o.length&&(u=yr(u,o)),n[d.key]=u}i.length&&d.key==="prompt"&&(n[d.key]+=`
`+i.join(`
`))}if(hs(t,n),t.imageControls){const d=Go(e,t);n.image_ratio=d.ratio,n.image_clarity=d.clarity;for(const c of Wo)delete n[c]}for(const d of t.inputs.filter(c=>wt.includes(c.type))){const c=e.assets[d.key];c&&c.ref&&(r[d.key]=c.ref)}return{capability:t.id,params:n,assets:r,project:l&&l.id,projectName:l&&l.name,card:e.id,cardName:ve(e)}}function Bo(e){return e._ifRestoring?(ce("正在查询原产物，请勿重复生成"),Promise.resolve()):(e._runPromise||(e._runPromise=X(Dl(e).finally(()=>{delete e._runPromise}))),e._runPromise)}function Fa(e,t){!Ye(e)||!ge()||!qn(e,t)||(e._ifResumePreparing?(delete e._ifResumePreparing,e._runPromise=X(Da(e,!0).finally(()=>{delete e._runPromise}))):e.status==="running"&&(e.job?so(e,t):e.if_request_id&&Ii(e,t)))}async function Ii(e,t){if(e._ifRecovering||l?.id!==t||!ge()||!l.cards.includes(e)||!Ye(e)||!qn(e,t)||e.job||e.status!=="running"||!e.if_request_id)return;e._ifRecovering=!0;let n=!1;try{const r=await ln(`/requests/${encodeURIComponent(e.if_request_id)}`);if(l?.id!==t||!ge()||!l.cards.includes(e))return;e.job=r.id,e.error=null,e.step="本机 IF 已接收原请求，正在恢复进度";const o=Dn(e,t);o.job=r.id,Qn(o),zr(e,{id:r.id,capability:e.if_job_cap||e.cap,prompts:e.if_pending_prompts||[]}),delete e.if_pending_prompts,zt(e,t,"running"),await tn(e,t),so(e,t)}catch(r){if(l?.id!==t||!l.cards.includes(e))return;n=r instanceof TypeError||r.status>=500||r.status===404&&Date.now()-(e.if_submitted_at||e.if_started)<12e4,e.step=n?"正在向本机 IF 确认原请求，请勿重复生成":"",n||(e.status="error",e.error="IF 提交结果尚未确认，请先在 IF 查看是否已创建任务，避免重复生成："+r.message),zt(e,t,"submitting"),n||(be(e.error),await tn(e,t))}finally{e._ifRecovering=!1,l?.id===t&&l.cards.includes(e)&&(rt(e),h.panel._id===e.id&&je(e.id),n&&G(()=>Ii(e,t),2500))}}async function Da(e,t=!1){const n=l,r=e.cap,o=[];let i=!1,a=!1;e.status="queued",e.error=null,e.progress=null,e.job=null,e.ms=null,e.step="正在连接本机 IF 并读取模型",e.if_job_cap=r,t||(e.if_started=Date.now(),e.if_request_id=Array.from(crypto.getRandomValues(new Uint8Array(16)),c=>c.toString(16).padStart(2,"0")).join("")),delete e.if_submitted_at,delete e.if_pending_prompts,delete e.if_canvas_url;const d=zt(e,n.id,"preparing");rt(e),h.panel._id===e.id&&je(e.id);try{if(!d)throw new Error("无法保存 IF 刷新恢复记录，尚未提交生成；请检查浏览器存储空间和权限");const c=await hr(n.id);if(!c.ok)throw new Error("任务准备状态保存失败，尚未提交 IF："+(c.error?.message||"请重试"));const f=await hn();if(!Fr)throw new Error("请更新本机 IF 桥接器后重试；当前版本不支持提交期间刷新恢复");if(await Zo(e),l!==n||!ge()||!n.cards.includes(e)||e.cap!==r)throw new Error("画布已切换或权限已变化，已取消 IF 提交");const u=ke(e).outputType,p=f.filter(O=>O.type===u).find(O=>O.display_name===e.params.if_model)||!e.params.if_model&&f.find(O=>O.type===u);if(!p)throw new Error("当前 IF 模型不可用，请重新选择模型");if(["exhausted","unavailable"].includes(p.quota_status))throw new Error(`${p.display_name}：${Dr(p)}，尚未提交生成，请选择其他模型`);const b=String(e.params.prompt||""),g=b.trim();if(!g)throw new Error("请先填写 IF 生成需求");const x=rr(p.display_name,u),v=Object.entries(e.assets||{}).filter(([,O])=>O&&wt.includes(O.kind)).sort(([O],[te])=>O.localeCompare(te,void 0,{numeric:!0})),w={image:0,video:0,audio:0};for(const[O,te]of v){const Me=O.match(/^(?:images|video)\[(\d+)\]$/);if(!Me||te.kind==="image"!==O.startsWith("images["))throw new Error(`引用槽位与${Je[te.kind]||te.kind}类型不匹配，请重新连接引用`);if(Number(Me[1])>=(x.bridge[te.kind]||0))throw new Error(`所选模型最多引用图片 ${x.bridge.image} 张、视频 ${x.bridge.video} 个；当前引用槽位超出范围，请移除多余引用或更换模型`);w[te.kind]++}if(Object.keys(w).some(O=>w[O]>(x.bridge[O]||0)))throw new Error("引用数量超出所选 IF 模型的画布槽位");const L={type:u,model:p.display_name,request_id:e.if_request_id,prompt:yr(Mi(g,e),de(e))},re=Pi(e);re.length&&(L.prompt+=`
`+re.join(`
`));const Ve=ke(e),at=Ve.inputs,Qe=[];if(u==="image"){const{ratio:O,clarity:te}=Go(e,Ve),[Me,Ae]=O.split(":").map(Number),Ee=Ko.find(ye=>ye.id===te).val,U=Me>=Ae?Math.round(Ee*Me/Ae/16)*16:Ee,Y=Me>=Ae?Ee:Math.round(Ee*Ae/Me/16)*16;Qe.push(`分辨率：${U}×${Y}`)}else{const O=at.find(Re=>Re.key==="aspect_ratio"),te=at.find(Re=>Re.key==="megapixels"),Me=e.params.aspect_ratio??O.default,Ae=Number(e.params.megapixels??te.default),Ee=Oi(e,Ve),U=Ee?[Ee.width,Ee.height]:mr(Me,Number.isFinite(Ae)&&Ae>=te.min&&Ae<=te.max?Ae:te.default),Y=at.find(Re=>Re.key==="duration"),ye=Number(e.params.duration??Y.default);if(!Number.isSafeInteger(ye)||ye<Y.min||Y.max!=null&&ye>Y.max)throw new Error(Y.max!=null?`当前 IF 模型时长须为 ${Y.min}–${Y.max} 秒的整数，请修改时长`:"当前 IF 模型时长范围未核实，请输入正整数秒");const[pe,Ce]=co[Me]||[1,1];Qe.push(`分辨率：${U[0]}×${U[1]}`,`时长：${ye}s`,`画面比例：${pe} : ${Ce}`)}L.prompt+=`

${Qe.join(`
`)}`;const Fe=u==="video"?"视频":"图片",ht=u==="video"?"图片、":"",En=u==="video"?"不要改为生图":"不要改为视频或文字方案";if(L.prompt=`最终交付必须是${Fe}文件，不是${ht}故事板或文字方案。用户已经确认生成需求，请直接生成${Fe}；不要等待用户确认规划、分镜或中间图片，也不要把中间图片当作最终结果。如无法直接完成，请说明原因，${En}。以本条${Fe}目标和以下参数要求为准。

${L.prompt}`,u==="image"&&e.params.if_reference?.trim()){if(!x.bridge.image&&!x.bridge.video)throw new Error("该模型不支持已确认的媒体引用");L.image=e.params.if_reference.trim()}const gt=Dn(e,n.id);gt.pending=[],gt.job=null;const bt=O=>JSON.stringify([O.kind,new ae(O.url,location.href).href,O.ref||""]),Le=new Set(v.map(([,O])=>bt(O)));if(gt.entries=gt.entries.filter(O=>Le.has(O.source)),Qn(gt),v.length){if(!fo)throw new Error("请更新本机 IF 桥接器后重试；当前版本不支持引用复用");L.references=[];for(const[O,[,te]]of v.entries()){const Me=`${Je[te.kind]}引用（${O+1}/${v.length}）`,Ae=new ae(te.url,location.href);if(Ae.origin!==location.origin)throw new Error("IF 仅能上传当前画布内的本机素材");e.step=`正在检查 IF ${Me}是否可复用`,rt(e);const Ee=await Ht(Ae,te.kind);if(l!==n||!n.cards.includes(e)||e.cap!==r||!ge())throw new Error("画布已切换或权限已变化，已取消 IF 提交");const U={source:bt(te),version:Ee,kind:te.kind};gt.pending.push(U);const Y=gt.entries.find(ze=>ze.source===U.source&&ze.version===Ee&&ze.kind===te.kind&&Br(ze.url));if(Y){e.step=`正在复用已上传 IF 的${Me}`,rt(e),L.references.push({kind:te.kind,url:Y.url});continue}e.step=`正在读取 IF ${Me}`,rt(e);const ye=await ue(Ae,{credentials:"same-origin",cache:"no-store"});if(!ye.ok)throw new Error("无法读取画布引用素材");let pe=await ye.blob();const Ce=te.kind==="image"?["image/png","image/jpeg","image/webp"]:["video/mp4"],Re=te.kind==="image"?1e7:50*1024*1024;if(!Ce.includes(pe.type)||pe.size>Re){e.step=`正在适配 IF ${Je[te.kind]}上传副本（${O+1}/${v.length}）`,rt(e);const ze=await ue(`/api/if-reference?${new URLSearchParams({url:Ae.pathname+Ae.search,type:te.kind})}`,{credentials:"same-origin",cache:"no-store",headers:{"If-Match":Ee}});if(!ze.ok)throw new Error(`IF 素材自动适配失败：${(await ze.text()).slice(0,500)}`);const xt=pe.size;pe=await ze.blob();const Xe=ze.headers.get("X-Chouka-IF-Conversion");if(l!==n||!n.cards.includes(e)||e.cap!==r||!ge())throw new Error("画布已切换或权限已变化，已取消 IF 提交");ce(`IF ${Je[te.kind]}上传副本已${Xe==="lossless-webp"?"转换为无损 WebP":"压缩"}（${(xt/1048576).toFixed(1)} → ${(pe.size/1048576).toFixed(1)} MB），原素材保持不变`)}if(!pe.size||!Ce.includes(pe.type)||pe.size>Re)throw new Error(`IF 上传副本仍不符合格式或 ${te.kind==="image"?10:50} MB 大小限制，原素材未修改`);if(l!==n||!n.cards.includes(e)||e.cap!==r||!ge())throw new Error("画布已切换或权限已变化，已取消 IF 提交");if(await Ht(Ae,te.kind)!==Ee)throw new Error("准备期间引用素材已变化，请重试");e.step=`正在向本机桥接传送${Me}`,rt(e);const tt=await ln("/assets",{method:"POST",headers:{"X-Chouka-IF":"asset","Content-Type":pe.type},body:pe});if(o.push(tt.asset_id),L.references.push({kind:te.kind,asset_id:tt.asset_id}),l!==n||!n.cards.includes(e)||e.cap!==r)throw new Error("画布已切换，已取消 IF 提交")}}if(Qn(gt),e.params.if_model=p.display_name,e.status="queued",e.error=null,e.progress=null,e.outputs=[],e.ms=null,e.step="正在交由本机 IF 桥接处理",e.job=null,a=!0,e.if_submitted_at=Date.now(),e.if_pending_prompts=[{key:"if_original",label:"原始提示词",text:b},{key:"if_submitted",label:"提交给 IF CLI 的提示词",text:L.prompt}],!zt(e,n.id,"submitting"))throw new Error("无法保存 IF 提交恢复记录，尚未提交生成；请检查浏览器存储空间和权限");rt(e),h.panel._id===e.id&&je(e.id);const nt=await ln("/runs",{method:"POST",headers:{"Content-Type":"application/json","X-Chouka-IF":"generate"},body:JSON.stringify(L)});i=!0,e.job=nt.id,e.if_job_cap=r,e.status="running",e.step="本机 IF 正在准备生成任务",gt.job=nt.id,Qn(gt),zr(e,{id:nt.id,capability:r,prompts:e.if_pending_prompts}),delete e.if_pending_prompts,zt(e,n.id,"running"),h.hist._id===e.id&&Pr(e.id),(await tn(e,n.id)).ok||be("IF 任务已提交，服务器状态保存失败；已保留本标签页恢复记录，请勿重复生成"),so(e,n.id)}catch(c){const f=a&&!i&&(c instanceof TypeError||c instanceof SyntaxError||c.status>=500);if(!i&&!f&&o.length&&await Promise.allSettled(o.map(u=>ln(`/assets/${encodeURIComponent(u)}`,{method:"DELETE",headers:{"X-Chouka-IF":"asset"}}))),l!==n||!n.cards.includes(e))return;f?(e.status="running",e.error=null,e.step="正在向本机 IF 确认原请求",zt(e,n.id,"submitting"),Ii(e,n.id)):(e.status="error",e.error=c.message,e.step="",e.job=null,zt(e,n.id,"error"),be(`「${ve(e)}」生成失败：${e.error}`),await tn(e,n.id))}l===n&&n.cards.includes(e)&&(rt(e),h.panel._id===e.id&&je(e.id))}async function so(e,t,n=null){if(e._ifPolling||l?.id!==t||!ge()||!Ye(e)||!l.cards.includes(e)||!qn(e,t)||!e.job||e.status!=="running")return;e._ifPolling=!0;const r={job:e.job,request:e.if_request_id,started:e.if_started,cap:e.cap},o=()=>l?.id===t&&ge()&&l.cards.includes(e)&&e.job===r.job&&e.if_request_id===r.request&&e.if_started===r.started&&e.cap===r.cap;let i=!1;try{const a=n||await ln(`/runs/${encodeURIComponent(e.job)}`);if(!o())return;mo(e,a.result,t);const d=dn(a.result);d&&(e.if_canvas_url=d);const c=e.history?.find(g=>g.job===e.job)?.prompts?.find(g=>g.key==="if_submitted");if(c&&typeof a.result?.submitted_prompt=="string"&&(c.text=a.result.submitted_prompt),a.state==="starting"||a.state==="running"){e.step=a.step||(a.state==="starting"?"本机 IF 正在准备生成任务":"IF 正在生成"),i=!0;return}if(a.state==="error")throw new Error((a.error||"IF 生成失败")+(a.result?.invalid_reference_indices?.length?"；已清除失效引用缓存，重试时仅重新上传失效素材":""));const f=a.result?.downloaded||[],u=ke(e).outputType,p=/请确认|确认后|回复["“]?确认/.test(a.result?.planning_text||"");if(!f.length)throw new Error(p?`IF 要求确认规划或故事板，未直接生成${Je[u]}；请在 IF 网站查看该会话。`:`IF 未返回${Je[u]}产物，请在 IF 网站查看该会话。`);const b=[];for(const[g,x]of f.entries()){if(x.type!==ke(e).outputType)continue;e.step=`正在取回 IF ${Je[x.type]}产物（${g+1}/${f.length}）`,rt(e);const v=await ue(`${Gn}/runs/${encodeURIComponent(e.job)}/media/${x.index}`,{credentials:"omit"});if(!v.ok)throw v.status>=500||v.status===429?new TypeError("IF 产物暂不可读取"):new Error("无法读取 IF 产物");const w=new File([await v.blob()],x.name);if(!o())return;e.step=`正在保存 IF ${Je[x.type]}产物（${g+1}/${f.length}）`,rt(e);const L=await Yt(w,x.type==="image");if(!o())return;b.push({...L,filename:x.name})}if(!b.length)throw new Error(u==="video"&&f.some(g=>g.type==="image")?`IF 只生成了故事板图片，尚未生成视频${p?"，并要求确认下一步":""}；请在 IF 网站查看该会话。`:`IF 返回的媒体类型与当前${Je[u]}节点不符，请在 IF 网站查看该会话。`);e.outputs=b,e.status="done",e.step="",e.error=null,e.ms=Date.now()-(e.if_started||Date.now()),zr(e,{id:e.job,capability:e.if_job_cap||e.cap}),h.hist._id===e.id&&Pr(e.id),zt(e,t,"done"),await qa(e)}catch(a){if(!o())return;a instanceof TypeError||/桥接请求失败|Failed to fetch/.test(a.message)?(e.step="IF 连接或产物读取中断，正在重试",i=!0):(e.status="error",e.error=a.message,e.step="",e.ms=Date.now()-(e.if_started||Date.now()),e.job&&zr(e,{id:e.job,capability:e.if_job_cap||e.cap}),h.hist._id===e.id&&Pr(e.id),be(`「${ve(e)}」生成失败：${a.message}`))}finally{e._ifPolling=!1,o()&&(zt(e,t,i?"running":e.status),rt(e),h.panel._id===e.id&&je(e.id),i?G(()=>so(e,t),2500):["done","error"].includes(e.status)&&await tn(e,t))}}async function Dl(e){if(!Ge())return;const t=l;if(Wt(e))return ce("风格节点不用运行：它只把风格并进挂着的那几个节点的提示词");if(nn(e))return kl(e);if(e.status==="queued"||e.status==="running")return;const n=ke(e);if(!n)return be("能力不可用");if(n.id==="image_composite"&&n.execution==="browser")return xl(e);if(n.execution==="if_studio")return Da(e);if(e.director_shot){if(Ke.cancelContentSave(),await Ke.pendingChain,!(await hr(l.id)).ok||!l.cards.includes(e))return;Ct++,delete e.director_selected}e.job=null,e.queue_remaining=null,e.queue_ahead=null,e.error=null,e.progress=0,e.status="queued",e.outputs=[],e.ms=null,e.step="",rt(e),je(e.id);try{if(await Zo(e),l!==t||!t.cards.includes(e)||!ge())throw new Error("画布已切换或权限变化，未提交生成");const r=Li(e),o=await jt("/api/generate",r);e.job=o.id,e.seed=o.seed,e.status=o.status,o.project_rev!=null&&l?.id===r.project&&(l.rev=Math.max(l.rev||0,o.project_rev))}catch(r){e.status="error",e.error=r.message,e.job=null,l===t&&Ke.markWorkFailure(r),be(`「${ve(e)}」提交失败：${r.message}`)}e.director_shot&&(Ct=Math.max(0,Ct-1)),!(l!==t||!ge())&&(rt(e),h.panel._id===e.id&&je(e.id),oe(!1),oi())}async function ql(e){if(e.job)try{await jt(`/api/job/${e.job}/cancel`)}catch(t){be(t.message)}}async function qa(e){const t=l;et();for(const n of t.edges.filter(r=>r.from===e.id&&!Ze(r)&&!r.version)){const r=t.cards.find(a=>a.id===n.to);if(!r)continue;const o=e.outputs||[],i=bn(n);n.slots=i;for(let a=0;a<i.length;a++){if(!o[a]){delete r.assets[i[a]];continue}try{const d=await Ci(o[a],ke(r)?.execution==="browser");l===t&&t.edges.includes(n)&&it(r.id)&&(r.assets[i[a]]=d)}catch(d){console.error("导入产物失败:",d),l===t&&be(`向「${ve(r)}」导入产物失败：${d.message}`)}}if(l!==t)return;Hn(r),It(r),h.panel._id===r.id&&je(r.id)}}function Bl(e){return e.project?l&&e.project===l.id?l.name:(D.find(t=>t.id===e.project)||{}).name||e.projectName||"":e.projectName||""}async function Ba(e){if(!l||l.id!==e.project){if(!D.some(r=>r.id===e.project))return ce("这个任务所在的画布已经不在了");await kr(e.project)}const t=l.cards.find(r=>r.id===e.card);if(!t)return ce("这个节点片已经从画布上删掉了");const n=h.stage.getBoundingClientRect();z.x=n.width/2-(t.x+Be(t)/2)*z.k,z.y=n.height/3-t.y*z.k,Ln(),le=t.id,K.clear(),Jt=null,et(!1);for(const r of l.cards)r._el&&r._el.classList.toggle("sel",r.id===t.id);je(t.id),vt(),Rt(),Qt()}return N.bind({open:kr,refresh:vr,clear:Vt,selectSpace(e){Te=e,l&&!Xi(l).includes(e)&&Vt(),yo()},renamed(e,t,n){l?.id===e&&(l.name=t,typeof n=="number"&&(l.rev=n),br()),lt.renameProject(e,t)}}),m.onDispose(()=>{ei++,lt.reset(),l=null,Ke.cancelTimers(),Eo(),Si(),ar?.disconnect(),Kr()}),{ready:Ui,flush:()=>Vn(void 0,!0),getProject:()=>l,nodeEditor:S?q.ChoukaNodeEditor:void 0}}const vd=es({x:lo().int().min(0),y:lo().int().min(0),width:lo().int().min(1),height:lo().int().min(1)}).refine(m=>m.x+m.width<=8192&&m.y+m.height<=8192),Rn=(m,y,C)=>Math.max(y,Math.min(C,m));function ds(m){if(m===void 0)return;const y=vd.safeParse(m);if(!y.success)throw new Error("图片裁剪范围无效，需使用原图范围内的整数像素。");return y.data}function kd(m,y){if(![m,y].every(C=>Number.isFinite(C)&&C>0)||m>8192||y>8192||m*y>32e6)throw new Error("图层尺寸必须大于 0，单边不超过 8192 像素，总像素不超过 3200 万。")}function uo(m,y){const C=m.crop??{x:0,y:0,width:y.width,height:y.height};if(C.x+C.width>y.width||C.y+C.height>y.height)throw new Error("裁剪范围超出原图尺寸。");return C}function Cd(m,y,C){const N=ds(y),T=uo({crop:N},C),R=uo(m,C),q=m.width/R.width,s=m.height/R.height,P=(T.x-R.x)*q,G=(T.y-R.y)*s,Z=m.angle*Math.PI/180;return{x:m.x+P*Math.cos(Z)-G*Math.sin(Z),y:m.y+P*Math.sin(Z)+G*Math.cos(Z),width:T.width*q,height:T.height*s,crop:T.x===0&&T.y===0&&T.width===C.width&&T.height===C.height?void 0:{...T}}}function ps(m){return[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]].map(([y=0,C=0])=>({fx:y,fy:C,x:m.x+(y+1)*m.width/2,y:m.y+(C+1)*m.height/2}))}function Za(m,y,C,N){const T=ps(y).map(R=>({...R,distance:Math.hypot((m.x-R.x)*N.width/C.width,(m.y-R.y)*N.height/C.height)})).sort((R,q)=>R.distance-q.distance)[0];return T&&T.distance<=14?T:m.x>y.x&&m.x<y.x+y.width&&m.y>y.y&&m.y<y.y+y.height?"move":"new"}function _d(m,y,C,N,T){const R=C.x-y.x,q=C.y-y.y;if(N==="move")return{...m,x:Rn(m.x+R,0,T.width-m.width),y:Rn(m.y+q,0,T.height-m.height)};if(N==="new")return{x:Math.min(C.x,y.x),y:Math.min(C.y,y.y),width:Math.max(1,Math.abs(R)),height:Math.max(1,Math.abs(q))};let{x:s,y:P}=m,G=s+m.width,Z=P+m.height;return N.fx<0&&(s=Rn(s+R,0,G-1)),N.fx>0&&(G=Rn(G+R,s+1,T.width)),N.fy<0&&(P=Rn(P+q,0,Z-1)),N.fy>0&&(Z=Rn(Z+q,P+1,T.height)),{x:s,y:P,width:G-s,height:Z-P}}function Ed(m,y,C,N){const T=Number(C);if(!C.trim()||!Number.isFinite(T))return m;const R=y==="x"?N.width-1:y==="y"?N.height-1:y==="width"?N.width-m.x:N.height-m.y,q={...m,[y]:Rn(Math.round(T),y==="x"||y==="y"?0:1,R)};return{...q,width:Math.min(q.width,N.width-q.x),height:Math.min(q.height,N.height-q.y)}}const Sd="_dialog_89jif_1",$d="_stage_89jif_45",jd="_fields_89jif_57",Nd="_actions_89jif_71",Jo={dialog:Sd,stage:$d,fields:jd,actions:Nd},Md=[["x","裁剪 X / px"],["y","裁剪 Y / px"],["width","裁剪宽度 / px"],["height","裁剪高度 / px"]];function zd({session:m,canEdit:y,onApply:C,onClose:N}){const T=pt.useRef(null),R=pt.useRef(null),q=pt.useRef(null),[s,P]=pt.useState(m.rect),[G,Z]=pt.useState({}),[Oe,De]=pt.useState(""),Se=pt.useId(),{bitmap:we}=m;pt.useLayoutEffect(()=>{const M=T.current,A=R.current,ae=document.activeElement;return M?.showModal(),()=>{M?.close(),A&&(A.width=A.height=0),ae instanceof HTMLElement&&ae.isConnected&&ae.focus({preventScroll:!0})}},[]),pt.useLayoutEffect(()=>{const M=R.current,A=M?.getContext("2d");if(!M||!A)return;const ae=Math.min(720/we.width,420/we.height);M.width=Math.max(1,Math.round(we.width*ae)),M.height=Math.max(1,Math.round(we.height*ae));const ue=M.width/we.width,$=M.height/we.height,E=s.x*ue,W=s.y*$,F=s.width*ue,j=s.height*$;A.drawImage(we,0,0,M.width,M.height),A.fillStyle="#000a",A.beginPath(),A.rect(0,0,M.width,M.height),A.rect(E,W,F,j),A.fill("evenodd"),A.strokeStyle="#fff",A.lineWidth=2,A.strokeRect(E,W,F,j),A.strokeStyle="#ffffff88",A.lineWidth=1,A.beginPath();for(const Q of[1/3,2/3])A.moveTo(E+F*Q,W),A.lineTo(E+F*Q,W+j),A.moveTo(E,W+j*Q),A.lineTo(E+F,W+j*Q);A.stroke(),A.fillStyle="#fff";for(const Q of ps(s))A.fillRect(Q.x*ue-4,Q.y*$-4,8,8)},[we,s]);const Ne=M=>{const A=M.currentTarget.getBoundingClientRect();return{x:Rn(Math.round((M.clientX-A.left)*we.width/A.width),0,we.width),y:Rn(Math.round((M.clientY-A.top)*we.height/A.height),0,we.height)}};return ie.jsxs("dialog",{ref:T,"data-image-crop":!0,className:Jo.dialog,"aria-labelledby":Se,onCancel:M=>{M.preventDefault(),M.stopPropagation(),N()},onKeyDown:M=>M.stopPropagation(),onPaste:M=>M.stopPropagation(),onDragOver:M=>{M.preventDefault(),M.stopPropagation()},onDrop:M=>{M.preventDefault(),M.stopPropagation()},children:[ie.jsx("h2",{id:Se,children:"裁剪所选图片"}),ie.jsx("p",{children:"拖动边框调整范围，框内拖动移动，框外拖动重新框选；也可输入原图像素。"}),ie.jsx("div",{className:Jo.stage,children:ie.jsx("canvas",{ref:R,"aria-label":"单张图片裁剪预览，可使用下方数值调整裁剪范围",onPointerDown:M=>{if(M.button!==0||!y()||q.current)return;M.preventDefault();const A=Ne(M),ae=Za(A,s,we,M.currentTarget.getBoundingClientRect());ae==="new"&&(A.x=Math.min(A.x,we.width-1),A.y=Math.min(A.y,we.height-1)),Z({}),q.current={pointerId:M.pointerId,start:A,mode:ae,before:{...s}},M.currentTarget.setPointerCapture(M.pointerId)},onPointerMove:M=>{if(!y())return;const A=Ne(M),ae=q.current;if(ae)ae.pointerId===M.pointerId&&(M.preventDefault(),P(_d(ae.before,ae.start,A,ae.mode,we)));else{const ue=Za(A,s,we,M.currentTarget.getBoundingClientRect());M.currentTarget.style.cursor=typeof ue=="string"?ue==="move"?"move":"crosshair":ue.fx===0?"ns-resize":ue.fy===0?"ew-resize":ue.fx===ue.fy?"nwse-resize":"nesw-resize"}},onLostPointerCapture:()=>{q.current=null}})}),ie.jsx("div",{className:Jo.fields,children:Md.map(([M,A])=>ie.jsxs("label",{children:[ie.jsx("span",{children:A}),ie.jsx("input",{type:"number",step:"1",min:M==="x"||M==="y"?0:1,max:M==="x"?we.width-1:M==="y"?we.height-1:M==="width"?we.width-s.x:we.height-s.y,value:G[M]??s[M],onChange:ae=>Z({...G,[M]:ae.target.value}),onBlur:ae=>{y()&&P(Ed(s,M,ae.target.value,we)),Z(ue=>{const $={...ue};return delete $[M],$})},onKeyDown:ae=>{ae.key==="Enter"&&ae.currentTarget.blur()}})]},M))}),ie.jsxs("p",{role:"status",children:["原图 ",we.width," × ",we.height," px · 保留 ",s.width," × ",s.height," px"]}),Oe&&ie.jsx("p",{role:"alert",children:Oe}),ie.jsxs("div",{className:Jo.actions,children:[ie.jsx("button",{type:"button",onClick:()=>{y()&&(Z({}),P({x:0,y:0,width:we.width,height:we.height}))},children:"恢复原图"}),ie.jsx("button",{type:"button","data-composer-action":"cancel-crop",autoFocus:!0,onClick:N,children:"取消裁剪"}),ie.jsx("button",{type:"button",onClick:()=>{y()&&C(m.id,s)?N():De("裁剪未应用，请检查编辑权限或重新打开裁剪。")},children:"应用裁剪"})]})]})}function Pd({selection:m,enabled:y,canEdit:C,onApply:N}){const[T,R]=pt.useState(null),q=m?.layer.id,s=m?.layer.locked;pt.useEffect(()=>{R(null)},[y,q,s]);const P=pt.useCallback(()=>R(null),[]);return ie.jsxs(ie.Fragment,{children:[ie.jsx("button",{type:"button",className:"ic-button","data-composer-action":"crop",disabled:!y||!m||s,onClick:()=>{!m||m.layer.locked||!C()||R({id:m.layer.id,bitmap:m.bitmap,rect:{...uo(m.layer,m.bitmap)}})},children:"裁剪图片"}),ie.jsx("p",{className:"ic-hint",children:"裁剪只影响所选图片，保留原图，可重新裁剪或恢复原图。"}),T&&ie.jsx(zd,{session:T,canEdit:C,onApply:N,onClose:P})]})}function Ld(m,y){m.dataset.composerCrop="";const C=Wl.createRoot(m);return{update(N){C.render(ie.jsx(Pd,{...y,...N}))},dispose(){C.unmount()}}}function Id(m,y,C,N){const{window:T,document:R,addEventListener:q,setTimeout:s,clearTimeout:P,setInterval:G,clearInterval:Z,requestAnimationFrame:Oe,cancelAnimationFrame:De,ResizeObserver:Se,MutationObserver:we,IntersectionObserver:Ne,URL:M}=m;T.H3Auth=y,T.H3Notify=C;const A=N.mediaFetch;return(()=>{const ae=new M("/",location.href),ue=8192,$=32e6,E=100,W=512,F=64e6,j=64*1024*1024;let Q;const _e=V=>JSON.parse(JSON.stringify(V)),Ie=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),V=>V.toString(16).padStart(2,"0")).join(""),Pe=(V,l)=>Number.isFinite(V)&&Number.isFinite(l)&&V>=1&&l>=1&&V<=ue&&l<=ue&&V*l<=$;function He(V,l){if(!Pe(V,l))throw new Error("图片或画布超出限制：单边 1–8192 像素，总像素不超过 3200 万。")}function $e(V){if(typeof V!="string"||!V||V.length>8192)throw new Error("图片地址无效。");const l=new M(V,location.href),D=l.pathname==="/api/file"||/^\/api\/upload\/[^/]+$/.test(l.pathname)||/^\/api\/artifact\/[^/]+\/[^/]+$/.test(l.pathname);if(!/^https?:$/.test(l.protocol)||l.origin!==location.origin||l.username||l.password||!D||l.hash)throw new Error("仅支持本站受控媒体地址（/api/file、/api/upload/文件名、/api/artifact/项目/文件名）；不接受其他路径、外站、data 或 blob 地址。");if(l.searchParams.sort(),l.href.length>8192)throw new Error("图片地址过长。");return l.href}function qe(V){if(!V||V.kind!=="image")throw new Error("只能添加图片资产。");const l=JSON.stringify(V);if(l.length>262144)throw new Error("图片资产描述过大，请勿在编辑稿中嵌入图片数据。");const D=JSON.parse(l);return $e(D.url),D}function Be(V){const l=D=>typeof D=="string"?D.trim().split(/[\\/]/).filter(Boolean).at(-1):"";return String(l(V.origin)||l(V.filename)||V.name||"图片").slice(0,200)}function ee(V){const l=[`url:${$e(V.url)}`];if(typeof V.ref=="string"&&V.ref.trim()){if(V.ref.length>8192)throw new Error("图片资源标识过长。");l.push(`ref:${V.ref}`)}return l}function _(V){const l=JSON.stringify(V||{version:1,width:1920,height:1080,background:"transparent",layers:[]});if(l.length>2*1024*1024)throw new Error("编辑稿描述超过 2 MiB，请减少图层或资产元数据。");const D=JSON.parse(l);if(D.version!==1||!Array.isArray(D.layers)||D.layers.length>E)throw new Error("编辑稿版本或图层数量无效（最多 100 层）。");if(He(D.width,D.height),!Number.isInteger(D.width)||!Number.isInteger(D.height))throw new Error("画布尺寸必须为整数像素。");if(D.background!=="transparent"&&!/^#[a-f\d]{6}$/i.test(D.background))throw new Error("背景必须为透明或六位十六进制颜色。");const he=new Set;D.layers=D.layers.map(z=>{if(!z||typeof z.id!="string"||!z.id||he.has(z.id))throw new Error("图层 ID 无效或重复。");if(he.add(z.id),kd(z.width,z.height),![z.x,z.y,z.angle,z.opacity].every(Number.isFinite)||Math.abs(z.x)>1e5||Math.abs(z.y)>1e5||Math.abs(z.angle)>36e3||z.opacity<0||z.opacity>1)throw new Error("图层位置、角度或透明度无效。");const le=ds(z.crop);return{id:z.id,name:String(z.name||"图片").slice(0,200),asset:qe(z.asset),x:z.x,y:z.y,width:z.width,height:z.height,angle:z.angle,opacity:z.opacity,visible:z.visible!==!1,locked:!!z.locked,...le?{crop:le}:{}}});const Te={version:1,width:D.width,height:D.height,background:D.background,layers:D.layers};if(D.linkedSources!==void 0){if(!Array.isArray(D.linkedSources)||D.linkedSources.length>W||D.linkedSources.some(z=>typeof z!="string"||!z||z.length>8196))throw new Error("已连接图片记录无效（最多 512 条有界资源标识）。");Te.linkedSources=[...new Set(D.linkedSources)]}return Te}async function S(V){const l=new Uint8Array(await V.slice(0,1048576).arrayBuffer()),D=new DataView(l.buffer),he=(le,K)=>String.fromCharCode(...l.subarray(le,le+K));let Te,z;if(l.length>=24&&he(1,3)==="PNG"&&D.getUint32(0)===2303741511)Te=D.getUint32(16),z=D.getUint32(20);else if(l.length>=10&&/^GIF8[79]a$/.test(he(0,6)))Te=D.getUint16(6,!0),z=D.getUint16(8,!0);else if(l.length>=26&&he(0,2)==="BM")D.getUint32(14,!0)===12?(Te=D.getUint16(18,!0),z=D.getUint16(20,!0)):(Te=D.getInt32(18,!0),z=Math.abs(D.getInt32(22,!0)));else if(l.length>=30&&he(0,4)==="RIFF"&&he(8,4)==="WEBP")for(let le=12;le+18<=l.length;){const K=he(le,4),Et=D.getUint32(le+4,!0),st=le+8;if(K==="VP8X"){Te=1+l[st+4]+(l[st+5]<<8)+(l[st+6]<<16),z=1+l[st+7]+(l[st+8]<<8)+(l[st+9]<<16);break}if(K==="VP8 "&&l[st+3]===157&&l[st+4]===1&&l[st+5]===42){Te=D.getUint16(st+6,!0)&16383,z=D.getUint16(st+8,!0)&16383;break}if(K==="VP8L"&&l[st]===47){Te=1+l[st+1]+((l[st+2]&63)<<8),z=1+(l[st+2]>>6)+(l[st+3]<<2)+((l[st+4]&15)<<10);break}le=st+Et+Et%2}else if(l[0]===255&&l[1]===216){let le=2;for(;le+8<l.length&&l[le++]===255;){for(;l[le]===255;)le++;const K=l[le++];if(K===217||K===218)break;if(K===1||K>=208&&K<=215)continue;const Et=D.getUint16(le);if(Et<2)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(K)){z=D.getUint16(le+3),Te=D.getUint16(le+5);break}le+=Et}}if(Te===void 0||z===void 0)throw new Error("无法安全识别图片尺寸。请使用标准 PNG、JPEG、WebP、GIF 或 BMP 图片（不支持 SVG / AVIF）。");return He(Te,z),{width:Te,height:z}}async function ne(V){const l=V.body.getReader(),D=[];let he=0;try{for(;;){const Te=await l.read();if(Te.done)break;if(he+=Te.value.byteLength,he>j)throw await l.cancel(),new Error("图片文件不得超过 64 MiB。");D.push(Te.value)}}finally{l.releaseLock()}return new Blob(D,{type:V.headers.get("content-type")?.split(";")[0]||""})}function me(){return Q||(Q=(async()=>{if((!T.fabric||T.fabric.version!=="7.4.0")&&await new Promise((V,l)=>{const D=R.createElement("script");D.src=new M("vendor/fabric.min.js",ae).href,D.onload=V,D.onerror=()=>{D.remove(),l(new Error("本地 Fabric 加载失败，请刷新重试。"))},R.head.append(D)}),T.fabric?.version!=="7.4.0")throw new Error("需要 Fabric 7.4.0 浏览器构建。")})().catch(V=>{throw Q=null,V}),Q)}function H(V,l,D){const he=R.createElement(V);return l&&(he.className=l),D!==void 0&&(he.textContent=D),he}async function J({state:V,sources:l=[],linkedSources:D=[],upload:he,onSave:Te,onExport:z,canEdit:le=()=>!0}={}){const K=H("dialog","chouka-composer image-composer-dialog");K.setAttribute("data-image-composer","");const Et=`composer-${Ie()}`;K.setAttribute("aria-labelledby",Et);const st=H("div","ic-head"),Sn=H("h2","","图片合成");Sn.id=Et;const un=H("button","ic-button","关闭");un.type="button",un.dataset.composerAction="close";const St=H("button","ic-button","重试载入");St.type="button",St.hidden=!0,st.append(Sn,H("span","ic-local","浏览器本地合成 · 原图尺寸输出"),St,un);const Zt=H("div","ic-status");Zt.setAttribute("role","status"),Zt.setAttribute("aria-live","polite");const Ft=H("div","ic-error");Ft.setAttribute("role","alert"),Ft.hidden=!0;const An=H("div","ic-body"),Ct=H("aside","ic-left"),Dt=H("section","ic-center"),Tt=H("aside","ic-right");Ct.setAttribute("aria-label","图层和图片素材"),Dt.setAttribute("aria-label","合成画布"),Tt.setAttribute("aria-label","图片与画布属性");const h=H("div","ic-toolbar"),Ke=H("div","ic-viewport"),Qt=H("canvas");Qt.setAttribute("aria-label","图片合成编辑画布"),Ke.append(Qt),Dt.append(h,Ke,H("p","ic-hint","拖动图片移动，拖动角点缩放。方向键移动 1px，Shift + 方向键移动 10px。"));const oe=H("div","ic-footer"),hr=H("span","ic-hint","编辑稿仅保存图片引用；合成 PNG 不包含选择框。");An.append(Ct,Dt,Tt),oe.append(hr),K.append(st,Zt,Ft,An,oe),R.body.append(K);const Vn=R.activeElement;let X,Ue,lt=null,ct=!1,fn=!1,Kn=!1,$n="",Rt=[],jn=-1,ge,on,gr,Ge=0,an=1,Yt=!0,$t=null,Vt=!1;const br=new AbortController,en=new Map,jt=new Map,Ar=()=>T.fabric,be=()=>{try{return le()===!0}catch(k){return sn(k),!1}};function sn(k){Ft.textContent=k?.message||String(k),Ft.hidden=!1,console.error("[图片合成]",k)}function ce(){Ft.hidden=!0,Ft.textContent=""}function qt(){return fn||ct||!Kn?!1:be()?!0:(Zt.textContent="只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。",Je(),!1)}function Kt(k,B,I,se=""){const xe=H("button",`ic-button ${se}`,B);xe.type="button",k.append(xe);const de={撤销:"undo",重做:"redo",适应窗口:"fit",缩小:"zoom-out",放大:"zoom-in","上传图片（支持多选）":"upload",保存编辑稿:"save","合成 PNG":"export",上移:"raise",下移:"lower",置顶:"front",置底:"back",复制:"duplicate",删除:"delete"}[B];return de&&(xe.dataset.composerAction=de),xe.addEventListener("click",()=>{if(qt())try{const fe=I();fe?.catch&&fe.catch(sn)}catch(fe){sn(fe)}}),xe}function wt(k,B,I="number",se={}){const xe=H("label","ic-field"),de=H("span","",B),fe=H("input");return fe.type=I,Object.assign(fe,se),xe.append(de,fe),k.append(xe),fe}function Je(){if(fn)return;const k=be(),B=ct||!Kn||!k;for(const xe of K.querySelectorAll("button,input"))xe.closest("[data-composer-crop]")||xe!==un&&xe!==St&&(xe.disabled=B||xe.dataset.inactive==="1");const I=Mt(),se=I&&en.get($e(I.asset.url));gr?.update({enabled:!B,selection:I&&se?{layer:I,bitmap:se}:null}),un.disabled=ct,St.disabled=ct||!k,K.setAttribute("aria-busy",String(ct)),Ue&&(Ue.skipTargetFind=B,Ue.selection=!1,Ue.upperCanvasEl.style.pointerEvents=B?"none":"",Ue.upperCanvasEl.tabIndex=B?-1:0),k||(Zt.textContent="只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。")}async function mn(k,B){if(qt()){ct=!0,ce(),Zt.textContent=k,Je();try{return await B()}catch(I){fn||sn(I)}finally{ct=!1,fn||(Zt.textContent=be()?Ft.hidden?"就绪 · 更改仅在保存编辑稿后持久化":"操作未完成，请检查提示后重试":"只读：当前工具卡已失效。仅可关闭。",Ot())}}}async function Nt(k){const B=$e(k.url);if(en.has(B))return en.get(B);const I=await A(B,{credentials:"same-origin",redirect:"error",signal:br.signal});if(!I.ok)throw new Error(`图片读取失败（HTTP ${I.status}）。`);if(Number(I.headers.get("content-length"))>j)throw new Error("图片文件不得超过 64 MiB。");const se=await ne(I);if(se.size>j||!/^image\/(png|jpeg|webp|gif|bmp|x-ms-bmp)$/i.test(se.type))throw new Error("仅支持 PNG、JPEG、WebP、GIF、BMP 图片，单文件最多 64 MiB；不支持 SVG / AVIF。");const xe=await S(se);if(Ge+xe.width*xe.height>F)throw new Error("已载入图片总像素超过 6400 万，请关闭后使用较小图片重新编辑。");const de=await createImageBitmap(se);try{if(He(de.width,de.height),Ge+de.width*de.height>F)throw new Error("已载入图片总像素超过 6400 万，请关闭后使用较小图片重新编辑。")}catch(fe){throw de.close(),fe}if(fn)throw de.close(),new Error("合成器已关闭。");return Ge+=de.width*de.height,en.set(B,de),de}function _t(k){const B=en.get($e(k.asset.url));if(!B)throw new Error("图片尚未载入。");const I=uo(k,B),se=new(Ar()).FabricImage(B,{originX:"left",originY:"top",left:k.x,top:k.y,angle:k.angle,cropX:I.x,cropY:I.y,width:I.width,height:I.height,scaleX:k.width/I.width,scaleY:k.height/I.height,opacity:k.opacity,visible:k.visible,selectable:!k.locked,evented:!k.locked,lockScalingFlip:!0,objectCaching:!1,cornerColor:"#a0e7cb",borderColor:"#a0e7cb",transparentCorners:!1,cornerSize:12,padding:0});return se.composerId=k.id,se.setControlsVisibility({ml:!Ht.checked,mr:!Ht.checked,mt:!Ht.checked,mb:!Ht.checked}),se}function Bt(k,B){const I=$e(k.url),se=H("span","ic-thumbnail"),xe=en.get(I);if(se.setAttribute("aria-hidden","true"),se.draggable=!1,xe){const de=uo({crop:B},xe),fe=H("canvas"),ot=Math.min(1,220/de.width,120/de.height);fe.draggable=!1,fe.width=Math.max(1,Math.round(de.width*ot)),fe.height=Math.max(1,Math.round(de.height*ot)),fe.getContext("2d").drawImage(xe,de.x,de.y,de.width,de.height,0,0,fe.width,fe.height),se.append(fe)}else{const de=H("img");de.alt="",de.loading="lazy",de.decoding="async",de.draggable=!1;const fe=new M(I);de.src=/^\/api\/(upload|artifact)\//.test(fe.pathname)?`/api/thumbnail?url=${encodeURIComponent(fe.pathname+fe.search)}`:I,se.append(de)}return se}function Mt(){return X?.layers.find(k=>k.id===lt)}function yn(){if(!Ue||!X)return;Vt=!0,Ue.discardActiveObject();for(const I of Ue.getObjects())Ue.remove(I),I.dispose();jt.clear(),Ue.backgroundColor=X.background==="transparent"?"":X.background;for(const I of X.layers){const se=_t(I);Ue.add(se),jt.set(I.id,se)}const k=Mt(),B=jt.get(lt);B&&k.visible&&!k.locked&&Ue.setActiveObject(B),Vt=!1,Fn(),Ot(),Ue.requestRenderAll()}function Gn(){const k=JSON.stringify(X);if(Rt[jn]===k){Ot();return}Rt.splice(jn+1),Rt.push(k),Rt.length>60&&Rt.shift(),jn=Rt.length-1,Ot()}function mt(k){if(!qt()||!X)return;const B=_e(X);try{return k(),X=_(X),yn(),Gn(),ce(),!0}catch(I){X=B,yn(),sn(I)}}function Nn(k){const B=jn+k;if(B<0||B>=Rt.length)return;const I=X.linkedSources;X=JSON.parse(Rt[B]),I&&(X.linkedSources=[...new Set([...X.linkedSources||[],...I])]),jn=B,Rt[B]=JSON.stringify(X),yn()}function Fn(){if(!Ue||!X||fn)return;const k=Math.max(80,Ke.clientWidth-32),B=Math.max(80,Ke.clientHeight-32);Yt&&(an=Math.min(k/X.width,B/X.height,1)),an=Math.max(.01,Math.min(an,2,4096/Math.max(X.width,X.height),Math.sqrt(8e6/(X.width*X.height)))),Ue.setDimensions({width:Math.max(1,Math.round(X.width*an)),height:Math.max(1,Math.round(X.height*an))}),Ue.setViewportTransform([an,0,0,an,0,0]),Fr.textContent=`${Math.round(an*100)}% · ${X.width} × ${X.height} px`}const Zn=Kt(h,"撤销",()=>Nn(-1)),fo=Kt(h,"重做",()=>Nn(1));Kt(h,"适应窗口",()=>{Yt=!0,Fn()}),Kt(h,"缩小",()=>{Yt=!1,an/=1.25,Fn()}),Kt(h,"放大",()=>{Yt=!1,an*=1.25,Fn()});const Fr=H("span","ic-zoom");h.append(Fr),Ct.append(H("h3","","图层"),H("p","ic-hint","从上到下为顶层到底层，可拖动排序"));const Ye=H("div","ic-layers");Ye.setAttribute("aria-label","图层列表"),Ct.append(Ye);const ln=H("div","ic-layer-actions");Ct.append(ln);const Dr=[];function hn(k,B){const I=Kt(ln,k,()=>Mt()&&B());return Dr.push(I),I}function Dn(k){mt(()=>{const B=X.layers.findIndex(se=>se.id===lt),[I]=X.layers.splice(B,1);X.layers.splice(Math.max(0,Math.min(k,X.layers.length)),0,I)})}hn("上移",()=>Dn(X.layers.findIndex(k=>k.id===lt)+1)),hn("下移",()=>Dn(X.layers.findIndex(k=>k.id===lt)-1)),hn("置顶",()=>Dn(X.layers.length-1)),hn("置底",()=>Dn(0)),hn("复制",()=>mt(()=>{if(X.layers.length>=E)throw new Error("最多添加 100 个图层。");const k=_e(Mt());k.id=Ie(),k.name=`${k.name} 副本`,k.x+=20,k.y+=20,X.layers.splice(X.layers.findIndex(B=>B.id===lt)+1,0,k),lt=k.id})),hn("删除",()=>mt(()=>{X.layers=X.layers.filter(k=>k.id!==lt),lt=null})),Ct.append(H("h3","","添加图片"));const Qn=Kt(Ct,"上传图片（支持多选）",()=>dn.click()),dn=H("input","ic-file");dn.type="file",dn.multiple=!0,dn.accept="image/png,image/jpeg,image/webp,image/gif,image/bmp",dn.hidden=!0,Ct.append(dn),Ct.append(H("p","ic-hint","可拖入文件或粘贴图片。单边 ≤8192px，总像素 ≤3200万，文件 ≤64MiB。"));const er=H("div","ic-sources");Ct.append(er),Tt.append(H("h3","","画布"));const qr=H("div","ic-field-grid");Tt.append(qr);const xr=wt(qr,"画布宽度 / px","number",{min:1,max:ue,step:1}),Mn=wt(qr,"画布高度 / px","number",{min:1,max:ue,step:1});xr.dataset.composerField="canvas-width",Mn.dataset.composerField="canvas-height";const qn=H("div","ic-background");Tt.append(qn);const zt=wt(qn,"透明背景","checkbox");zt.parentElement.classList.add("ic-switch");const tr=wt(qn,"背景颜色","color");xr.addEventListener("change",()=>mt(()=>{X.width=Number(xr.value)})),Mn.addEventListener("change",()=>mt(()=>{X.height=Number(Mn.value)})),zt.addEventListener("change",()=>mt(()=>{X.background=zt.checked?"transparent":tr.value})),tr.addEventListener("change",()=>mt(()=>{X.background=tr.value})),Tt.append(H("h3","","所选图层"));const tn=wt(Tt,"名称","text",{maxLength:200}),Br=H("div","ic-field-grid");Tt.append(Br);const mo={};for(const[k,B,I,se]of[["x","X / px",-1e5,1e5],["y","Y / px",-1e5,1e5],["width","宽度 / px",0,ue],["height","高度 / px",0,ue],["angle","角度 / °",-36e3,36e3],["opacity","透明度 / %",0,100]]){const xe=wt(Br,B,"number",{min:I,max:se,step:k==="opacity"?1:.1});mo[k]=xe,xe.dataset.composerField=k,xe.addEventListener("change",()=>mt(()=>{const de=Mt();if(!de||de.locked)return;const fe=Number(xe.value);if(xe.value.trim()===""||!Number.isFinite(fe))throw new Error("请输入有效数值。");if(Ht.checked&&(k==="width"||k==="height")){const ot=k==="width"?"height":"width";de[ot]*=fe/de[k]}de[k]=k==="opacity"?fe/100:fe}))}const Ht=wt(Tt,"锁定宽高比","checkbox",{checked:!0});Ht.parentElement.classList.add("ic-switch"),Ht.addEventListener("change",()=>{if(qt()){Ue.uniformScaling=Ht.checked;for(const k of jt.values())k.setControlsVisibility({ml:!Ht.checked,mr:!Ht.checked,mt:!Ht.checked,mb:!Ht.checked});Ue.requestRenderAll()}});const ve=H("div");Tt.append(ve),gr=Ld(ve,{canEdit:qt,onApply:(k,B)=>mt(()=>{const I=Mt();if(!I||I.id!==k||I.locked)throw new Error("所选图层已变化，请重新打开裁剪。");Object.assign(I,Cd(I,B,en.get($e(I.asset.url))))})===!0}),tn.addEventListener("change",()=>mt(()=>{const k=Mt();k&&!k.locked&&(k.name=tn.value||"图片")})),Tt.append(H("p","ic-hint","X / Y 是图片未旋转时的左上角原点。锁定图层后，需先解锁才能修改属性或在画布移动。"));const Wt=Kt(oe,"保存编辑稿",Bn,"ic-primary"),Hr=Kt(oe,"合成 PNG",pn,"ic-primary");function Ot(){if(!X||fn){Je();return}const k=Mt();xr.value=X.width,Mn.value=X.height,zt.checked=X.background==="transparent",zt.checked||(tr.value=X.background),tn.value=k?.name||"",tn.dataset.inactive=!k||k.locked?"1":"0";for(const[I,se]of Object.entries(mo))se.value=k?String(Math.round(k[I]*(I==="opacity"?100:1)*1e3)/1e3):"",se.dataset.inactive=!k||k.locked?"1":"0";Zn.dataset.inactive=jn<=0?"1":"0",fo.dataset.inactive=jn>=Rt.length-1?"1":"0";for(const I of Dr)I.dataset.inactive=!k||k.locked?"1":"0";Qn.dataset.inactive=typeof he!="function"?"1":"0",Wt.dataset.inactive=typeof Te!="function"?"1":"0",Hr.dataset.inactive=typeof z!="function"?"1":"0",Sn.textContent=`图片合成${JSON.stringify(X)!==$n?" · 未保存":""}`;const B=Ye.contains(R.activeElement);Ye.replaceChildren(),X.layers.length||Ye.append(H("p","ic-empty","尚无图层。上传图片，或从下方画布素材中选择添加。"));for(const I of[...X.layers].reverse()){const se=H("div",`ic-layer${lt===I.id?" is-selected":""}`);se.draggable=!ct&&be(),se.dataset.layerId=I.id;const xe=Be(I.asset),de=H("button","ic-layer-name");de.type="button",de.title=xe,de.dataset.layerAction="select",de.append(Bt(I.asset,I.crop),H("span","ic-asset-name",xe)),de.setAttribute("aria-pressed",String(lt===I.id)),de.disabled=ct||!be(),de.addEventListener("click",()=>{qt()&&(lt=I.id,Vt=!0,Ue.discardActiveObject(),!I.locked&&I.visible&&Ue.setActiveObject(jt.get(I.id)),Vt=!1,Ue.requestRenderAll(),Ot())});const fe=H("button","ic-layer-toggle",I.visible?"隐藏":"显示");fe.type="button",fe.setAttribute("aria-label",`${I.visible?"隐藏":"显示"} ${I.name}`),fe.setAttribute("aria-pressed",String(I.visible)),fe.dataset.layerAction="visible",fe.title=fe.getAttribute("aria-label");const ot=H("button","ic-layer-toggle",I.locked?"解锁":"锁定");ot.type="button",ot.setAttribute("aria-label",`${I.locked?"解锁":"锁定"} ${I.name}`),ot.setAttribute("aria-pressed",String(I.locked)),ot.dataset.layerAction="lock",ot.title=ot.getAttribute("aria-label"),fe.disabled=ot.disabled=ct||!be(),fe.addEventListener("click",()=>mt(()=>{I.visible=!I.visible})),ot.addEventListener("click",()=>mt(()=>{I.locked=!I.locked})),se.addEventListener("dragstart",gn=>{if(!qt()){gn.preventDefault();return}$t=I.id,gn.dataTransfer.effectAllowed="move",gn.dataTransfer.setData("application/x-chouka-layer",I.id)}),se.addEventListener("dragover",gn=>{$t&&qt()&&(gn.preventDefault(),gn.dataTransfer.dropEffect="move",se.classList.add("is-dragover"))}),se.addEventListener("dragleave",()=>se.classList.remove("is-dragover")),se.addEventListener("dragend",()=>{$t=null,se.classList.remove("is-dragover")}),se.addEventListener("drop",gn=>{if(!$t)return;gn.preventDefault(),gn.stopPropagation();const ho=$t;$t=null,mt(()=>{const yr=X.layers.findIndex(rr=>rr.id===I.id),wr=X.layers.findIndex(rr=>rr.id===ho);if(wr<0||yr<0||wr===yr)return;const[Pt]=X.layers.splice(wr,1);X.layers.splice(yr,0,Pt),lt=ho})});const Wr=H("div","ic-layer-controls");Wr.append(fe,ot),se.append(de,Wr),Ye.append(se)}Je(),B&&!ct&&Ue?.upperCanvasEl.focus({preventScroll:!0})}async function Ze(k,B){if(X.layers.length+k.length>E)throw new Error("最多添加 100 个图层。");const I=[];for(const se of k){if(!be())throw new Error("编辑权限已失效，未添加图片。");const xe=qe(se),de=await Nt(xe);if(!be())throw new Error("编辑权限已失效，未添加图片。");const fe=Math.max(1/Math.min(de.width,de.height),Math.min(1,X.width/de.width,X.height/de.height));I.push({id:Ie(),name:Be(xe),asset:xe,x:0,y:0,width:de.width*fe,height:de.height*fe,angle:0,opacity:1,visible:!0,locked:!1})}if(!be())throw new Error("编辑权限已失效，未添加图片。");X=_({...X,...B?{linkedSources:B}:{},layers:X.layers.concat(I)}),lt=I.at(-1)?.id||lt,yn(),Gn()}async function nn(){if(!Array.isArray(D)||D.length>W)throw new Error("已连接图片列表无效或过多（最多 512 项）。");if(!D.length)return;const k=new Set(X.linkedSources||[]),B=new Set(k),I=new Set,se=[];for(const xe of X.layers)for(const de of ee(xe.asset))I.add(de);for(const xe of D){const de=qe(xe),fe=ee(de);if(fe.some(ot=>B.has(ot)||I.has(ot)))for(const ot of fe)B.add(ot);fe.some(ot=>k.has(ot)||I.has(ot))||se.push(de);for(const ot of fe)k.add(ot);if(k.size>W)throw new Error("已连接图片记录已达 512 条上限，请使用“添加图片”手动添加新素材。")}if(!be())throw new Error("编辑权限已失效，未添加图片。");B.size!==(X.linkedSources||[]).length&&(X=_({...X,linkedSources:[...B]}),Gn()),await Ze(se,[...k])}async function ut(k){if(!/^image\/(png|jpeg|webp|gif|bmp|x-ms-bmp)$/i.test(k.type)||!k.size||k.size>j)throw new Error(`${k.name||"粘贴文件"}：仅支持常见位图格式，且文件需在 64 MiB 以内。`);await S(k);const B=await createImageBitmap(k);try{He(B.width,B.height)}finally{B.close()}}function dt(k){const B=Array.from(k||[]);if(B.length)return mn("正在检查和上传图片，请勿关闭…",async()=>{if(typeof he!="function")throw new Error("尚未配置图片上传回调。");if(X.layers.length+B.length>E)throw new Error("最多添加 100 个图层。");for(const se of B)await ut(se);const I=[];for(const se of B){if(!be())throw new Error("编辑权限已失效，已停止上传。");const xe=await he(se);if(!be())throw new Error("编辑权限已失效，未采用晚到的上传结果。");I.push(qe(xe))}await Ze(I)})}dn.addEventListener("change",()=>{const k=Array.from(dn.files);dn.value="",dt(k)}),K.addEventListener("paste",k=>{if(k.stopPropagation(),k.target.closest('input,textarea,[contenteditable="true"]'))return;const B=Array.from(k.clipboardData?.files||[]);B.length&&(k.preventDefault(),dt(B))}),K.addEventListener("dragover",k=>{k.stopPropagation(),k.dataTransfer.types.includes("Files")&&(k.preventDefault(),k.dataTransfer.dropEffect=ct||!be()?"none":"copy")}),K.addEventListener("drop",k=>{k.stopPropagation(),k.preventDefault(),k.dataTransfer.files.length&&dt(k.dataTransfer.files)}),K.addEventListener("keydown",k=>{if(k.stopPropagation(),k.target.closest('input,textarea,select,[contenteditable="true"]')||k.isComposing)return;const B=k.ctrlKey||k.metaKey,I=k.key.toLowerCase();if(B&&(I==="z"||I==="y")){k.preventDefault(),qt()&&Nn(I==="y"||k.shiftKey?1:-1);return}if(I==="delete"||I==="backspace"){k.preventDefault(),Mt()&&!Mt().locked&&mt(()=>{X.layers=X.layers.filter(xe=>xe.id!==lt),lt=null});return}const se={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[k.key];se&&(k.preventDefault(),Mt()&&!Mt().locked&&mt(()=>{const xe=Mt(),de=k.shiftKey?10:1;xe.x+=se[0]*de,xe.y+=se[1]*de}))});for(const k of["keyup","keypress","copy","cut","pointerdown","pointerup","click","dblclick","wheel"])K.addEventListener(k,B=>B.stopPropagation());async function Bn(){await mn("正在保存编辑稿，请勿关闭…",async()=>{const k=_(X);if(!be())throw new Error("编辑权限已失效，未保存。");await Te(_e(k)),be()&&($n=JSON.stringify(k))})}async function pn(){await mn("正在合成原尺寸 PNG，请勿关闭…",async()=>{const k=_(X),B=R.createElement("canvas");let I;try{I=new(Ar()).StaticCanvas(B,{width:k.width,height:k.height,enableRetinaScaling:!1,renderOnAddRemove:!1,backgroundColor:k.background==="transparent"?"":k.background});for(const xe of k.layers)xe.visible&&I.add(_t(xe));I.renderAll();const se=await new Promise((xe,de)=>B.toBlob(fe=>fe?xe(fe):de(new Error("PNG 编码失败，可能内存不足。")),"image/png"));if(!be())throw new Error("编辑权限已失效，未提交合成结果。");await z(se,_e(k)),$n=JSON.stringify(k)}finally{try{I&&await I.dispose()}finally{B.width=B.height=0}}})}async function zn(k=!1){const B=k===!0;if(fn||ct&&!B||!B&&X&&JSON.stringify(X)!==$n&&!T.confirm("编辑稿有未保存的更改，确定关闭并放弃这些更改吗？"))return!1;fn=!0,br.abort(),ge?.disconnect(),Z(on),gr?.dispose(),K.open&&K.close();try{Ue&&await Ue.dispose()}catch(I){console.error("[图片合成] 画布释放失败",I)}finally{for(const I of en.values())I.close();en.clear(),jt.clear(),Rt.length=0,K.remove(),Vn?.isConnected&&Vn.focus({preventScroll:!0})}return!0}un.addEventListener("click",zn),K.addEventListener("cancel",k=>{k.preventDefault(),k.stopPropagation(),zn()}),K.showModal(),un.focus();async function nr(){if(!(ct||fn)){ct=!0,Kn=!1,ce(),St.hidden=!0,Zt.textContent="正在载入图片合成器…",Je();try{if(await me(),Ue||(Ue=new(Ar()).Canvas(Qt,{enableRetinaScaling:!1,selection:!1,preserveObjectStacking:!0,uniformScaling:!0,uniScaleKey:null,renderOnAddRemove:!1}),Ue.upperCanvasEl.tabIndex=0,Ue.upperCanvasEl.setAttribute("aria-label","图片合成编辑画布，使用方向键移动所选图层"),Ue.on("mouse:down",()=>{!ct&&be()&&Ue.upperCanvasEl.focus({preventScroll:!0})}),Ue.on("selection:created",k=>{!Vt&&!ct&&be()&&(lt=k.selected?.[0]?.composerId||null,Ot())}),Ue.on("selection:updated",k=>{!Vt&&!ct&&be()&&(lt=k.selected?.[0]?.composerId||null,Ot())}),Ue.on("selection:cleared",()=>{!Vt&&!ct&&be()&&(lt=null,Ot())}),Ue.on("object:modified",k=>{if(Vt)return;if(!qt()){yn();return}const B=k.target,I=X.layers.find(xe=>xe.id===B?.composerId);if(!I||I.locked){yn();return}const se=_e(X);try{Object.assign(I,{x:B.left,y:B.top,width:B.width*B.scaleX,height:B.height*B.scaleY,angle:B.angle}),X=_(X),Gn()}catch(xe){X=se,yn(),sn(xe)}})),!X){const k=_(V);for(const B of k.layers){if(!be())throw new Error("只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。");await Nt(B.asset)}if(!be())throw new Error("只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。");X=k,$n=JSON.stringify(X),Rt=[],jn=-1,yn(),Gn()}Kn=!0;try{await nn()}catch(k){sn(k),St.hidden=!1}er.replaceChildren();for(const k of l)try{const B=qe(k),I=Be(B),se=Kt(er,"",()=>mn("正在添加画布图片…",()=>Ze([B])));se.title=I,se.setAttribute("aria-label",`添加 ${I}`),se.append(Bt(B),H("span","ic-asset-name",I))}catch(B){sn(B)}l.length||er.append(H("p","ic-hint","当前画布没有可用的图片素材。")),ge?.disconnect(),ge=new Se(Fn),ge.observe(Ke)}catch(k){sn(k),Kn=!1,St.hidden=!1}finally{ct=!1,Zt.textContent=Ft.hidden?"就绪 · 添加图片开始合成":"载入存在问题，请检查提示；可重试载入或关闭。",Ot()}}}return m.onDispose(()=>{zn(!0)}),St.addEventListener("click",()=>{be()&&nr()}),on=G(Je,500),await nr(),{close:zn}}T.ChoukaImageComposer={open:J}})(),T.ChoukaImageComposer}const Td=Vl.extend({selectedId:Ri().nullable(),selectedSpace:Ri(),user:Zl.nullable()});function Rd(m){const y=ls({projects:[],teams:[],selectedId:null,selectedSpace:"personal",user:null,busy:!1,error:""});let C;async function N(R){if(!y.getSnapshot().busy){y.set({...y.getSnapshot(),busy:!0,error:""});try{await R()}catch(q){y.set({...y.getSnapshot(),error:Or(q)})}finally{y.set({...y.getSnapshot(),busy:!1})}}}const T=R=>R.permission==="operate"&&!R.locked;return{state:y,service:m,bind(R){C=R},update(R){const q=Td.parse(R);y.set({...y.getSnapshot(),...q})},selectSpace(R){C?.selectSpace(R)},open(R){return N(async()=>{await C?.open(R)})},create(){return N(async()=>{const R=y.getSnapshot();if(R.selectedSpace==="shared")throw new Error("共享给我的空间不能新建画布，请选择个人空间或项目组");const q=R.selectedSpace.startsWith("team:")?R.selectedSpace.slice(5):null,s=q?R.teams.find(Z=>Z.id===q)?.name:"个人空间",P=window.prompt(`在「${s||"项目组"}」新建画布`,"新项目 "+new Date().toLocaleDateString("zh-CN"));if(P===null)return;const G=await m.create(P,q);await C?.refresh(),await C?.open(G.id)})},rename(R){return N(async()=>{if(!T(R))throw new Error("此画布不可修改");const q=window.prompt("修改项目名",R.name);if(q===null)return;const s=q.trim();if(!s)throw new Error("项目名不能为空");const P=es({name:Ri(),rev:lo()}).parse(await m.rename(R.id,s));C?.renamed(R.id,P.name,P.rev),await C?.refresh()})},remove(R){return N(async()=>{if(!T(R))throw new Error("此画布不可修改");window.confirm(`删除项目「${R.name}」？（文件会保留为 .deleted）`)&&(await m.remove(R.id),y.getSnapshot().selectedId===R.id&&C?.clear(),await C?.refresh())})},async refresh(){await C?.refresh()},spaces(R){const q=y.getSnapshot();return Yl(R,q.user?.id,q.teams)}}}function Od({project:m,host:y,onClose:C}){const N=pt.useRef(null),[T,R]=pt.useState(),[q,s]=pt.useState([]),[P,G]=pt.useState([]),[Z,Oe]=pt.useState(""),[De,Se]=pt.useState(!1);pt.useEffect(()=>{let Ne=!0;return N.current?.showModal(),y.service.shares(m.id).then(M=>{Ne&&(R(M),s(M.user_ids),G(M.team_ids))}).catch(M=>{Ne&&Oe(Or(M))}),()=>{Ne=!1}},[y,m.id]);const we=(Ne,M,A,ae)=>ae(M?[...A,Ne]:A.filter(ue=>ue!==Ne));return ie.jsx("dialog",{ref:N,className:"auth-dialog project-share-dialog",onCancel:C,children:ie.jsxs("form",{onSubmit:async Ne=>{Ne.preventDefault(),Se(!0),Oe("");try{await y.service.share(m.id,q,P),await y.refresh(),C()}catch(M){Oe(Or(M))}finally{Se(!1)}},children:[ie.jsxs("h2",{children:["分享「",m.name,"」"]}),ie.jsx("p",{className:"auth-note",children:"被选中的个人或项目组成员可以共同查看、编辑和运行这张画布。画布仍保留在你的个人空间。"}),ie.jsx("div",{className:"share-columns",children:["users","teams"].map(Ne=>ie.jsxs("section",{className:"share-targets",children:[ie.jsx("h3",{children:Ne==="users"?"个人":"项目组"}),ie.jsxs("div",{className:"share-target-list",children:[T?.[Ne].map(M=>ie.jsxs("label",{className:"share-target",children:[ie.jsx("input",{type:"checkbox",checked:(Ne==="users"?q:P).includes(M.id),onChange:A=>we(M.id,A.target.checked,Ne==="users"?q:P,Ne==="users"?s:G)}),ie.jsxs("span",{children:[M.name||M.username,M.display_name?`（${M.display_name}）`:""]})]},M.id)),T?.[Ne].length===0&&ie.jsx("p",{className:"auth-note",children:"暂无可分享对象"})]})]},Ne))}),ie.jsx("p",{role:"alert",children:Z}),ie.jsxs("footer",{children:[ie.jsx("button",{type:"button",className:"btn",onClick:C,children:"取消"}),ie.jsx("button",{className:"btn primary",disabled:!T||De,children:De?"保存中…":"确定分享"})]})]})})}function Ad({host:m}){const y=pt.useSyncExternalStore(m.state.subscribe,m.state.getSnapshot),[C,N]=pt.useState(),T=[{value:"personal",label:"个人空间"},...y.projects.some(P=>m.spaces(P).includes("shared"))?[{value:"shared",label:"共享给我的画布"}]:[],...y.teams.map(P=>({value:`team:${P.id}`,label:P.name}))],R=y.projects.filter(P=>m.spaces(P).includes(y.selectedSpace)),q=new Map;for(const P of R){const G=y.selectedSpace==="shared"?String(P.owner_id):"";q.set(G,[...q.get(G)||[],P])}const s=P=>{const G=P.permission==="operate"&&!P.locked,Z=y.selectedSpace==="personal"&&!P.team_id&&String(P.owner_id)===String(y.user?.id)&&!P.locked;return ie.jsxs("div",{className:`pitem${P.id===y.selectedId?" on":""}`,title:`${P.team_name||P.owner_display_name?.trim()||"未填写姓名"} · ${P.permission==="operate"?"可操作":"只读"}`,onContextMenu:Oe=>{Z&&(Oe.preventDefault(),N(P))},children:[ie.jsx("button",{className:"nm",onClick:()=>{m.open(P.id)},onDoubleClick:()=>G&&void m.rename(P),children:P.name}),ie.jsx("span",{className:"ct",children:P.cards}),Z&&ie.jsx("button",{className:"pshare",title:"分享给个人或项目组",onClick:()=>N(P),children:"↗"}),G&&ie.jsxs(ie.Fragment,{children:[ie.jsx("button",{className:"ren",title:"重命名",disabled:y.busy,onClick:()=>{m.rename(P)},children:"✎"}),ie.jsx("button",{className:"del",title:"删除",disabled:y.busy,onClick:()=>{m.remove(P)},children:"✕"})]})]},P.id)};return ie.jsxs(ie.Fragment,{children:[ie.jsx("div",{className:"head",children:ie.jsx("span",{className:"project-panel-title",children:"画布列表"})}),ie.jsxs("button",{id:"newproj",disabled:y.busy,onClick:()=>{m.create()},children:[ie.jsx("span",{"aria-hidden":"true",children:"＋"}),ie.jsx("span",{children:"新建画布"})]}),ie.jsxs("label",{className:"space-picker",children:[ie.jsx("span",{children:"画布空间"}),ie.jsx("select",{id:"space-select",value:y.selectedSpace,onChange:P=>m.selectSpace(P.target.value),"aria-label":"选择个人空间或项目组",children:T.map(P=>ie.jsx("option",{value:P.value,children:P.label},P.value))})]}),ie.jsx("div",{id:"space-label",className:"section-label",children:T.find(P=>P.value===y.selectedSpace)?.label}),ie.jsx("div",{id:"plist",children:[...q].map(([P,G])=>P?ie.jsxs("details",{className:"powner",open:!0,children:[ie.jsxs("summary",{children:[ie.jsx("span",{className:"powner-name",children:G[0]?.owner_display_name?.trim()||"未填写姓名"}),ie.jsx("span",{className:"powner-count",children:G.length})]}),ie.jsx("div",{className:"powner-items",children:G.map(s)})]},P):G.map(s))}),y.error&&ie.jsx("p",{role:"alert",className:"project-error",children:y.error}),ie.jsxs("div",{className:"side-foot",children:[ie.jsx("span",{className:"side-foot-dot"}),ie.jsx("span",{id:"space-status",children:y.selectedSpace==="personal"?"个人画布仅自己可见":y.selectedSpace==="shared"?"由画布所有者授权共享":"项目组画布由全体组员共享"})]}),C&&ie.jsx(Od,{host:m,project:C,onClose:()=>N(void 0)})]})}const Fd=ed+`
`+td+`
#side {position:relative} #dot {position:absolute;right:22px;top:28px;width:7px;height:7px;border-radius:50%;background:var(--err)} #dot.on{background:var(--ok)} #react-projects{display:contents}.pitem>.nm {border:0;background:none;color:inherit;text-align:left;min-width:0;cursor:pointer;font:inherit}.project-error{color:#fda4af;padding:12px;font-size:12px}`;function Xd(){const m=pt.useRef(null),[y,C]=pt.useState(!0),[N,T]=pt.useState(),[R,q]=pt.useState(null),s=pt.useCallback(G=>{const Z=Rd(G.services.projects);T(Z),q(document.getElementById("react-projects"));const Oe=Id(G.scope,G.auth,G.notify,G.services),De=wd(G.scope,G.auth,G.notify,Z,G.services,Oe);G.beforeLeave(async()=>{await De.ready,await De.flush()}),De.nodeEditor&&(window.ChoukaNodeEditor=De.nodeEditor),De.ready.then(()=>{G.scope.disposed||C(!1)},Se=>{G.scope.disposed||(C(!1),G.notify.error(Se))})},[]),P=Gl(m,"canvas","canvas","canvas-studio",Fd,s);return ie.jsxs(ie.Fragment,{children:[ie.jsx("div",{id:"page-mount",ref:m,dangerouslySetInnerHTML:{__html:Ql}}),R&&N&&Ul.createPortal(ie.jsx(Ad,{host:N}),R),y&&!P&&ie.jsx(Kl,{stage:"正在准备工作区"}),P&&ie.jsx("p",{role:"alert",children:P})]})}export{Xd as CanvasPage};
