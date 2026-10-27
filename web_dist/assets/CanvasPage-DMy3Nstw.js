import{errorMessage as Rr,ApiError as Fi,reactExports as Gt,jsxRuntimeExports as ye}from"./http-DOrwCtZg.js";import{reactDomExports as Rl}from"./index-BgVeoShv.js";import{isLiveTask as za,taskDeleteResultSchema as qi,taskHistoryPageSchema as Ol,formatQueueStatus as Yi,tasksSchema as Al,projectSpaces as Fl,projectListSchema as ql,LoadingRequest as Dl}from"./index-TKnW3h4Q.js";import{usePageRuntime as Bl}from"./usePageRuntime-BBvbqunT.js";import{userSchema as Hl}from"./session-M0f98iVb.js";import{string as La,object as Ul,number as Wl}from"./monitor-alerts-DzGBiSiF.js";import"./json-D9oFO1Iy.js";const Jl=`\r
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
<input type="file" id="picker" style="display:none">`,Xl=`@scope (body[data-chouka-page="canvas"]) {\r
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
}`,Yl=`@scope (body[data-chouka-page="canvas"]) {\r
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
}`,Vl=["image","audio","video"],Ta=[{id:"480P",label:"480P",val:480},{id:"720P",label:"720P",val:720},{id:"1080P",label:"1080P",val:1080},{id:"1440P",label:"1440P",val:1440},{id:"2K",label:"2K",val:2048}],io=[["1:1",1,1],["1:2",1,2],["2:1",2,1],["9:16",9,16],["16:9",16,9],["3:4",3,4],["4:3",4,3],["3:2",3,2],["2:3",2,3],["5:4",5,4],["4:5",4,5],["21:9",21,9],["9:21",9,21]];function Vi(b){return(b&&b.options||[]).map(v=>{const S=/^(\d+)x(\d+)\s+\(([^)]+)\)$/.exec(String(v));if(!S)return null;const P=parseInt(S[1],10),X=parseInt(S[2],10);return{value:v,width:P,height:X,ratio:S[3],short:Math.min(P,X)}}).filter(Boolean)}function Kl(b,v){return Vi(b).find(S=>S.value===v)||null}function Ra(b,v){const S=v.imageControls,P=b.params.image_ratio,X=b.params.image_clarity;return{ratio:io.some(B=>B[0]===P)||S.mode==="i2i"&&P==="original"?P:S.defaultRatio,clarity:Ta.some(B=>B.id===X)?X:S.defaultClarity}}function Ki(b,v,S,P){if(S&&P&&S.id!==P.id&&(S.imageControls||P.imageControls)){const X=d=>[...new Set(d.inputs.filter(I=>!Vl.includes(I.type)&&I.type!=="textarea"&&I.type!=="seed").map(I=>I.key))],B=b.params._imageModelParams||={};B[S.id]=Object.fromEntries(X(S).filter(d=>b.params[d]!=null).map(d=>[d,b.params[d]]));const Z=b.params._imageRatios||={};S.imageControls&&(Z[S.imageControls.mode]=Ra(b,S).ratio);for(const d of new Set([...X(S),...X(P)]))delete b.params[d];Object.assign(b.params,B[P.id]||{}),P.imageControls&&S.imageControls?.mode!==P.imageControls.mode&&(b.params.image_ratio=Z[P.imageControls.mode]||P.imageControls.defaultRatio)}b.cap=v}function Gl({document:b,getCapability:v,getCapabilityById:S,getRunCapability:P,getProject:X,isIF:B,normalizeIFDuration:Z,api:d,save:I,onReferenceChange:ne,ratioWH:oe,multiple:Ae}){function Ue(E,U,O){const j=Ra(E,U),te=b.createElement("div");te.className="cpick image-size-controls";const we=b.createElement("div");we.className="ctitle",we.textContent="画面比例";const ze=b.createElement("div");ze.className="cgrid";const je=U.imageControls.mode==="i2i"?[["original",1,1],...io]:io;for(const[Be,Y,C]of je){const _=b.createElement("button"),K=Be==="original"?"原图":Be;_.className=Be===j.ratio?"on":"",_.innerHTML=`<i style="--ratio:${Y/C}"></i><span>${K}</span>`,_.title=`画面比例 ${K}`,_.onclick=()=>{E.params.image_ratio=Be,I(),O()},ze.appendChild(_)}const qe=b.createElement("div");qe.className="ctitle",qe.textContent="清晰度";const Ee=b.createElement("div");Ee.className="cgrid k";for(const Be of Ta){const Y=b.createElement("button");Y.className=Be.id===j.clarity?"on":"",Y.textContent=Be.label,Y.title=`目标短边 ${Be.val}px，实际尺寸按模型要求对齐`,Y.onclick=()=>{E.params.image_clarity=Be.id,I(),O()},Ee.appendChild(Y)}const De=b.createElement("div");return De.className="image-size-hint",De.textContent=U.imageControls.mode==="i2i"?"清晰度按短边计算；默认保持原图比例。指定比例时，模型可能裁切主图以适配画布。":"清晰度按短边计算；实际尺寸按模型要求对齐。高分辨率会增加显存占用。",te.append(we,ze,qe,Ee,De),te}const $e=E=>E?.kind==="gen"&&E.outputType==="video"&&(E.execution==="if_studio"||E.id.startsWith("minimax_h3_")&&E.inputs.some(U=>U.type==="video")),tt=(E,U)=>$e(U)?(B(E)?v(E):U).inputs.filter(O=>O.type==="video").map(O=>E.assets?.[O.key]).find(O=>O?.ref):null,Me=E=>E&&[E.width,E.height,E.duration].every(U=>Number.isFinite(+U)&&+U>0),ee=new WeakMap;async function ae(E,U=P(E)){const O=tt(E,U);if(!O||Me(O))return;if(ee.has(O))return ee.get(O).promise;const j=X(),te={};return ee.set(O,te),te.promise=d("/api/media?ref="+encodeURIComponent(O.ref)+"&project="+encodeURIComponent(j.id)).then(we=>{if(!Me(we))throw new Error("无法读取参考视频的比例和时长，请重新导入视频");X()!==j||!j.cards.includes(E)||tt(E,U)!==O||(Object.assign(O,we),I())}).catch(we=>{throw te.error=we.message,we}),te.promise}function Ce(E,U=P(E)){const O=tt(E,U);if(!O)return delete E._referenceParameters,delete E.params._reference_video,Promise.resolve();const j=JSON.stringify([U.id,O.ref]);if(E.params._reference_video===j)return Promise.resolve();const te=E._referenceParameters;if(te?.identity===j&&te.source===O)return te.promise;const we=X(),ze=E.params,je={...ze},qe={identity:j,source:O,before:je};E._referenceParameters=qe;const Ee=()=>{if(X()!==we||!we.cards.includes(E)||E.params!==ze||E._referenceParameters!==qe||P(E)!==U||tt(E,U)!==O||!Me(O))return;const De=K=>K.every(pe=>ze[pe]===je[pe]),Be=U.inputs.find(K=>K.key==="aspect_ratio"),Y=+O.width/+O.height;if(Be&&De(["aspect_ratio"]))ze.aspect_ratio=Be.options.reduce((K,pe)=>Math.abs(oe[pe][0]/oe[pe][1]-Y)<Math.abs(oe[K][0]/oe[K][1]-Y)?pe:K);else if(!Be&&De(["width","height","_ratio"])){const K=io.reduce((q,W)=>Math.abs(W[1]/W[2]-Y)<Math.abs(q[1]/q[2]-Y)?W:q),pe=q=>ze[q]??U.inputs.find(W=>W.key===q)?.default,A=Math.min(+pe("width"),+pe("height"));ze._ratio=K[0],ze.width=K[1]>=K[2]?Math.round(A*K[1]/K[2]/Ae)*Ae:A,ze.height=K[1]>=K[2]?A:Math.round(A*K[2]/K[1]/Ae)*Ae}const C=U.inputs.some(K=>K.key==="preview_seconds"),_=C?"preview_seconds":"duration";De([_])&&(ze[_]=C?0:Math.max(1,Math.round(+O.duration)),B(E)&&Z(E)),ze._reference_video=j,I()};return qe.promise=Me(O)?Promise.resolve(Ee()):ae(E,U).then(Ee),qe.promise}function xe(E){Ce(E).catch(()=>{}).finally(()=>ne(E))}function $(E,U){const O=tt(E,U);if(!O||Me(O))return null;const j=b.createElement("div");if(j.className="knobnote",j.setAttribute("role","status"),j.textContent=ee.get(O)?.error||"正在读取参考视频的比例和时长…",ee.get(O)?.error){const te=b.createElement("button");te.type="button",te.textContent="重新读取",te.onclick=()=>{ee.delete(O),delete E._referenceParameters,xe(E),ne(E)},j.appendChild(te)}return j}return{imageClarityPicker:Ue,supportsVideoReference:$e,referenceVideo:tt,videoMetadataReady:Me,ensureReferenceMetadata:ae,syncReferenceParameters:Ce,refreshVideoParameters:xe,videoReferenceStatus:$,switchImageCapability:(E,U)=>Ki(E,U,v(E),S(U))}}const Zl={CLARITY_STEPS:Ta,RATIO_GRID:io,resolutionPresets:Vi,resolutionPreset:Kl,imageSettings:Ra,switchImageCapability:Ki,applyInputPresets:Ql,create:Gl};function Ql(b,v){for(const S of(b.inputs||[]).filter(P=>P.presets)){const P=v[S.key]!=null?v[S.key]:S.default,X=S.presets[P];if(!X)throw new Error(`${S.label}无效：${P}`);v[S.key]=P,Object.assign(v,X)}}const so={"1:1 (Square)":[1,1],"2:3 (Portrait Photo)":[2,3],"3:2 (Photo)":[3,2],"3:4 (Portrait Standard)":[3,4],"4:3 (Standard)":[4,3],"9:16 (Portrait Widescreen)":[9,16],"16:9 (Widescreen)":[16,9],"21:9 (Ultrawide)":[21,9]},pr=[480,544,640,768],Gi={480:832,544:960,640:1152,768:1344},On=32,qo=new Set(["megapixels","width","height","aspect_ratio","resolution","scale_to_length","output_1080p"]),Zi=[{id:"1080p",short:1080},{id:"2K",short:1440},{id:"4K",short:2160}],Di=["3:4",3,4],mt=(b,v)=>b.inputs.find(S=>S.key===v);function Tr(b){return b===null||typeof b=="string"||typeof b=="number"||typeof b=="boolean"?b:void 0}const wt=(b,v)=>v?Tr(b.params[v.key])??v.default:void 0,dr=b=>typeof b=="string"?b:"",Rn=b=>typeof b=="number"||typeof b=="string"?Number(b):NaN,Bi=b=>Number.parseFloat(String(Tr(b)));function Oa(b){return so[dr(b)]??[1,1]}function cr(b,v){const[S,P]=Oa(b),X=Math.sqrt(v*1024*1024/(S*P));return[Math.round(S*X/On)*On,Math.round(P*X/On)*On]}function Qi(b,v){const[S,P]=Oa(b),X=v/Math.min(S,P),B=Math.round(X*X*S*P/(1024*1024)*100)/100;for(const Z of[0,1,-1,2,-2,3,-3]){const d=Math.round((B+Z*.01)*100)/100;if(d>0&&Math.min(...cr(b,d))===v)return d}return B}const Hi=b=>Math.round(b*9/16/On)*On;function es(b){return b.id==="minimax_h3_ref_2pass_bf16"||b.id==="minimax_h3_fusion_v2_bf16"?mt(b,"output_1080p"):void 0}function Bo(b,v){const[S,P]=Oa(b);return{width:Math.round(v*Math.max(1,S/P)/2)*2,height:Math.round(v*Math.max(1,P/S)/2)*2}}function Ui(b,v){const S=es(v);return!S||wt(b,S)!=="on"?null:Bo(wt(b,mt(v,"aspect_ratio")),1080)}function Pa(b,v){if(v.execution!=="if_studio"||v.outputType!=="video")return null;const S=Zi.find(P=>P.id===b.params.if_video_resolution);return S?{label:S.id,...Bo(wt(b,mt(v,"aspect_ratio")),S.short)}:null}function ed(b,v){for(const S of b.querySelectorAll("input, select"))S.addEventListener("input",v),S.addEventListener("change",v);for(const S of b.querySelectorAll('[role="switch"]'))S.addEventListener("click",v)}function td(b){const{document:v,save:S,ratioGrid:P,claritySteps:X,resolutionPresets:B,resolutionPreset:Z}=b,d=$=>{S(),$?.()},I=$=>$.outputType==="video"?pr.map(E=>({id:`${E}p`,label:`${E}p`,val:E})):X;function ne($){let E=null,U=1/0;for(const[O,[j,te]]of Object.entries(so)){const we=Math.abs($[1]/$[2]-j/te);we<U-1e-9&&(U=we,E=O)}return E}function oe($){const E=so[dr($)];return E?P.find(U=>U[1]===E[0]&&U[2]===E[1]):void 0}function Ae($,E){let U="3:4",O=1/0;for(const j of P){const te=Math.abs($/E-j[1]/j[2]);te<O&&(O=te,U=j[0])}return U}function Ue($,E){const U=I($),O=U.find(je=>je.id===E.params._clarity);if(O)return O;const j=Rn(wt(E,mt($,"width"))),te=Rn(wt(E,mt($,"height")));if(!j||!te)return null;let we=null,ze=1/0;for(const je of U){const qe=Math.abs(je.val-Math.min(j,te));qe<ze&&(ze=qe,we=je)}return we}function $e($){const E=v.createElement("div");return E.className="ctitle",E.textContent=$,E}function tt($=!1){const E=v.createElement("div");return E.className=$?"cgrid k":"cgrid",E}function Me($,E,U,O){const j=v.createElement("button");return j.type="button",j.textContent=$,j.className=E?"on":"",j.title=U,j.setAttribute("aria-pressed",String(E)),j.onclick=O,j}function ee($,E,U,O){const j=Me("",E,U,O),te=v.createElement("i");te.style.setProperty("--ratio",String($[1]/$[2]));const we=v.createElement("span");return we.textContent=$[0],j.append(te,we),j}function ae($,E,U){if(E.imageControls)return b.imageClarityPicker($,E,U);const O=mt(E,"aspect_ratio"),j=mt(E,"megapixels"),te=mt(E,"resolution"),we=mt(E,"width")&&mt(E,"height"),ze=mt(E,"scale_to_length"),je=v.createElement("div");if(je.className="cpick",te){const Y=B(te),C=Z(te,wt($,te))??Y[0];if(!C)return je;const _=tt();for(const pe of new Set(Y.map(A=>A.ratio))){const[A=1,q=1]=pe.split(":").map(Number);_.appendChild(ee([pe,A,q],pe===C.ratio,`画面比例 ${pe}`,()=>{const s=Y.filter(T=>T.ratio===pe).reduce((T,ce)=>Math.abs(ce.short-C.short)<Math.abs(T.short-C.short)?ce:T);$.params.resolution=s.value,d(U)}))}const K=tt(!0);for(const pe of Y.filter(A=>A.ratio===C.ratio))K.appendChild(Me(`${pe.width}×${pe.height}`,pe.value===C.value,"",()=>{$.params.resolution=pe.value,d(U)}));return je.append($e("画面比例"),_,$e("分辨率"),K),je}if(ze&&!O){const Y=v.createElement("input");Y.type="number";const C=ze.min||512,_=ze.max||1344,K=ze.step||32;Y.min=String(C),Y.max=String(_),Y.step=String(K),Y.value=String(wt($,ze)??""),Y.style.cssText="width:100%;padding:8px;font-size:14px;border:1px solid #3a3a44;border-radius:4px;background:#1a1a22;color:#fff";const pe=()=>{const W=Number.parseInt(Y.value,10);Number.isNaN(W)||($.params.scale_to_length=Math.max(C,Math.min(_,W)),d(U))};Y.oninput=pe;const A=tt(!0);for(const W of pr){const s=Gi[W];if(s===void 0)continue;const T=Me(`${W}p`,Number(Y.value)===s,`16:9 素材约 ${W}p；最长边 ${s}px，实际短边随素材比例变化`,()=>{Y.value=String(s),pe()});T.disabled=s<C||s>_,A.appendChild(T)}const q=v.createElement("div");return q.style.cssText="font-size:12px;color:#8a8a94;margin-top:4px",q.textContent=`档位按 16:9 素材标注，实际短边随素材比例变化。最长边范围：${C} ~ ${_}，步进 ${K}`,je.append($e("分辨率（最长边）"),A,Y,q),je}const qe=!O&&we,Ee=()=>{const Y=Rn(Tr($.params.width)??we?.default),C=Rn(wt($,mt(E,"height")));return Y&&C?Ae(Y,C):"3:4"};function De(Y){const C=Ue(E,$)??I(E)[1];if(!C)return;const[,_,K]=Y,pe=E.outputType==="video"?On:16;$.params.width=_>=K?Math.round(C.val*_/K/pe)*pe:C.val,$.params.height=_>=K?C.val:Math.round(C.val*K/_/pe)*pe}if(O||qe){const Y=O?wt($,O):dr($.params._ratio)||Ee(),C=O?oe(Y):void 0,_=tt();for(const K of P){const pe=!!qe&&(K[0]===Y||!$.params._ratio&&K[0]===P.find(s=>Math.abs(Rn($.params.width)/Rn($.params.height)-s[1]/s[2])<.02)?.[0]),A=O?K===C:pe,q=ne(K),W=ee(K,A,`画面比例 ${K[0]}`+(O&&q!==Y?`（工作流档位：${q}）`:"（当前）"),()=>{O?$.params.aspect_ratio=q:($.params._ratio=K[0],De(K)),d(U)});O&&!A&&q===Y&&(W.className="near"),_.appendChild(W)}je.append($e("画面比例"),_)}const Be=j?Tr($.params.aspect_ratio)??mt(E,"aspect_ratio")?.default??"16:9 (Widescreen)":null;if(j||we){const Y=j?pr.flatMap(q=>{const W=Qi(Be,q);return W>(j.max??1.1)+.01?[]:[{id:`${q}p`,label:`${q}p`,val:W,p:q}]}):[...I(E)],C=tt(!0),_=Ue(E,$),K=es(E),pe=Ui($,E),A=Pa($,E);for(const q of Y){const W=j?Bi(wt($,j)):_?.val,s=!pe&&!A&&(j?Number.isFinite(W)&&Math.min(...cr(Be,Number(W)))===q.p:W!=null&&Math.abs(W-q.val)<40),T=P.find(N=>N[0]===($.params._ratio||"3:4"))??Di,ce=E.outputType==="video"?On:16,Le=j?cr(Be,q.val).join("×"):T[1]>=T[2]?`${Math.round(q.val*T[1]/T[2]/ce)*ce} × ${q.val}`:`${q.val} × ${Math.round(q.val*T[2]/T[1]/ce)*ce}`;C.appendChild(Me(q.label,s,Le,()=>{if(K&&($.params.output_1080p="off"),delete $.params.if_video_resolution,j)$.params.megapixels=q.val;else{$.params._clarity=q.id;let N=dr($.params._ratio);if(!N){N=Ee();const se=Rn(Tr($.params.width)??we?.default),J=Rn(wt($,mt(E,"height")));se&&J&&($.params._ratio=N)}De(P.find(se=>se[0]===N)??Di)}d(U)}))}if(K){const q=Bo(wt($,mt(E,"aspect_ratio")),1080);C.appendChild(Me("1080p",!!pe,`${q.width}×${q.height}`,()=>{$.params.output_1080p="on",d(U)}))}if(E.execution==="if_studio"&&E.outputType==="video")for(const q of Zi){const W=Bo(wt($,mt(E,"aspect_ratio")),q.short);C.appendChild(Me(q.id,A?.label===q.id,`${W.width}×${W.height}`,()=>{$.params.if_video_resolution=q.id,d(U)}))}if(je.append($e("清晰度"),C),K?.hint){const q=v.createElement("div");q.className="knobnote",q.textContent=K.hint.replace("开启后","1080p 档位").replace("关闭保留原有行为。","其他清晰度档位保留原有行为。"),je.appendChild(q)}}return je}function Ce($,E){if(!E)return null;if(E.imageControls){const Y=b.imageSettings($,E);return`${Y.ratio==="original"?"原图":Y.ratio} · ${Y.clarity}`}const U=mt(E,"aspect_ratio"),O=mt(E,"megapixels"),j=mt(E,"resolution"),te=mt(E,"width"),we=mt(E,"scale_to_length"),ze=E.inputs.find(Y=>Y.presets&&Y.appearance!=="switch"),je=mt(E,"duration"),qe=mt(E,"preview_seconds"),Ee=E.outputType==="video"?mt(E,"sound"):void 0;if(!U&&!O&&!j&&!te&&!we&&!ze&&!je&&!qe&&!Ee)return null;const De=[];if(we&&!U)return De.push(`${wt($,we)}px`),Ee&&De.push(wt($,Ee)==="on"?"有声音":"无声音"),De.join(" · ");if(j){const Y=Z(j,wt($,j));Y&&De.push(Y.ratio,`${Y.width}×${Y.height}`)}else if(U){const Y=wt($,U);De.push(oe(Y)?.[0]??dr(Y).split(" ")[0]??"")}else te&&$.params._ratio&&De.push(dr($.params._ratio));const Be=Ui($,E);if(Be)De.push("1080p",`${Be.width}×${Be.height}`);else if(O){const Y=Bi(wt($,O)),C=Tr($.params.aspect_ratio)??U?.default??"16:9 (Widescreen)",_=Number.isFinite(Y)?Math.min(...cr(C,Y)):null;De.push(Pa($,E)?.label??(_?`${_}p`:"?"))}else if(te){const Y=Ue(E,$);Y&&De.push(Y.label)}if(ze){const Y=wt($,ze),C=ze.options?.find(K=>(K&&typeof K=="object"?K.value:K)===Y),_=C&&typeof C=="object"?C.label:dr(C);_&&De.unshift(_.replace(/（.*$/,""))}if(je&&De.push(`${wt($,je)}秒${qe?"/段":""}`),qe){const Y=wt($,qe);Rn(Y)>0&&De.push(`试前${Y}秒`)}return Ee&&De.push(wt($,Ee)==="on"?"有声音":"无声音"),De.join(" · ")}function xe($,E){const U=$.cap!==E;U&&delete $.params.output_1080p,b.switchImageCapability($,E),U&&delete $.params.output_1080p}return{clarityPicker:ae,paramsBrief:Ce,switchImageCapability:xe}}const nd="_notice_ur2qb_1",rd="_readonly_ur2qb_9",Wi={notice:nd,readonly:rd},Ia="[data-readonly-view], summary, .slinks .nm, a[href]",ts='textarea, input:not([type="range"]):not([type="file"])';function Ji(b,v){if(b.classList.toggle(Wi.readonly,v),b.dataset.readonly=String(v),!v){b.querySelector("[data-readonly-notice]")?.remove();return}if(!b.querySelector("[data-readonly-notice]")){const S=b.ownerDocument.createElement("div");S.dataset.readonlyNotice="",S.className=Wi.notice,S.textContent="只读 · 可查看参数，不能修改或运行",b.prepend(S)}for(const S of b.querySelectorAll(ts))S.readOnly=!0,S.setAttribute("aria-readonly","true");for(const S of b.querySelectorAll('button, select, input[type="range"], input[type="file"]'))S.matches(Ia)||(S.disabled=!0);for(const S of b.querySelectorAll("[contenteditable]"))S.contentEditable="false";for(const S of b.querySelectorAll('[draggable="true"]'))S.draggable=!1}function od(b){const v=b.target;return v instanceof Element?["beforeinput","input","change","paste","drop","dragover","contextmenu"].includes(b.type)?!0:b instanceof KeyboardEvent?v.closest(Ia)?!1:["Backspace","Delete","Enter"," "].includes(b.key)||(b.ctrlKey||b.metaKey)&&["v","x","z","y"].includes(b.key.toLowerCase()):v.closest(ts)?!1:v.closest(".slot.filled")?b.type!=="click":!v.closest(Ia):!1}const Do=b=>b instanceof Fi?b:new Fi(Rr(b),b&&typeof b=="object"&&"status"in b&&typeof b.status=="number"?b.status:0,b);function ad(b){const v=b.setTimeout||globalThis.setTimeout,S=b.clearTimeout||(O=>{O!==null&&globalThis.clearTimeout(O)});let P=null,X=null,B=!1,Z=0,d=0,I=0,ne=null,oe=null;const Ae=new Set;let Ue=Promise.resolve(),$e=Promise.resolve();function tt(O){Ae.add(O);const j=()=>{Ae.delete(O),b.flushPendingProjectSync()};return O.then(j,te=>{oe=Do(te),j()}),O}function Me(){if(b.nodeEditor||!b.isAuthenticated()||!b.getProject())return;S(X);const O=b.getProject()?.id;O&&(X=v(()=>{X=null;const j=b.getView(),te={x:j.x,y:j.y,k:j.k};$e=$e.then(async()=>{if(b.isAuthenticated())try{await b.jput(`/api/projects/${encodeURIComponent(O)}/view`,te)}catch(we){b.getProject()?.id===O&&b.showError("视图保存失败："+Rr(we))}})},400))}function ee(O=!0){O&&b.recordCanvasEdit();const j=b.getProject();if(!b.canSave()||!j||j.locked)return;S(P);const te=j.id;P=v(()=>{P=null,ae(te)},700)}function ae(O=b.getProject()?.id){d++;const j=Ue.catch(()=>{}).then(()=>xe(O)).finally(()=>{d--,b.flushPendingProjectSync()});return Ue=j,j}async function Ce(O,j){const te=await b.api(`/api/projects/${encodeURIComponent(O)}`);if(b.getProject()?.id!==O||te.rev!==j.rev)return null;const we=new Set(te.cards.map(Ee=>Ee.id)),ze=j.cards.filter(Ee=>Ee&&typeof Ee=="object"&&!Array.isArray(Ee)&&!we.has(String(Ee.id)));if(!ze.length)return null;let je=te;for(const Ee of ze){const De=await b.jpost(`/api/projects/${encodeURIComponent(O)}/cards`,{card:Ee,rev:je.rev}),Be=b.getProject();if(Be?.id!==O)throw new Error("恢复节点期间画布已切换");if(je=De.project,Ee&&typeof Ee=="object"&&!Array.isArray(Ee)){const Y=De.card||je.cards.find(_=>_.id===Ee.id),C=Be.cards.find(_=>_.id===Ee.id);if(Y&&C)for(const _ of["created_by","created_by_name","created_at"])Y[_]!==void 0&&(C[_]=Y[_],Ee[_]=Y[_])}}j.rev=je.rev;const qe=b.getProject();if(qe?.id!==O)throw new Error("恢复节点期间画布已切换");return qe.rev=Math.max(qe.rev,j.rev),b.jput(`/api/projects/${encodeURIComponent(O)}`,j)}async function xe(O=b.getProject()?.id){const j=b.getProject();if(!b.canSave()||!j||j.id!==O)return{ok:!1,error:new Error("画布不可保存或已切换")};if(b.nodeEditor&&!b.editorCard())return{ok:!1,error:new Error("此节点已删除或不可访问")};if(b.nodeEditor&&ne?.status===409)return{ok:!1,error:ne};const te=j.id,we={rev:j.rev||0,name:j.name,cards:j.cards.map(b.plain),edges:j.edges,groups:j.groups||[]};B=!0;try{const ze=await b.jput(`/api/projects/${encodeURIComponent(te)}`,we),je=b.getProject();return je?.id!==te?{ok:!1,error:new Error("保存期间画布已切换")}:(je.rev=Math.max(je.rev||0,ze.rev||0),ne=null,{ok:!0})}catch(ze){let je=Do(ze);if(je.status===409&&b.getProject()?.id===te&&!b.nodeEditor&&!I)try{const qe=await Ce(te,we);if(qe){const Ee=b.getProject();return Ee?.id!==te?{ok:!1,error:new Error("保存期间画布已切换")}:(Ee.rev=Math.max(Ee.rev||0,qe.rev||0),ne=null,{ok:!0})}}catch(qe){je=Do(qe)}return b.getProject()?.id===te&&(ne=je),je.status===409&&b.getProject()?.id===te&&!b.nodeEditor&&!I?(b.toast("画布在别处被改过，已重新加载"),await b.openProject(te)):b.showError("保存失败："+je.message),{ok:!1,error:je}}finally{B=!1,b.flushPendingProjectSync()}}async function $(O=b.getProject()?.id,j=!1){I++;try{for(b.flushFocusedControl();;){const te=Ue;if(await te,await Promise.all([...Ae]),b.getProject()?.id!==O)throw new Error("画布已关闭或切换");if(oe)throw oe;if(ne&&[403,404,409].includes(ne.status))throw ne;if(te!==Ue||Ae.size||Z)continue;if(!b.canSave()){if(j&&!ne&&!d&&P===null)return;throw new Error("此画布只读或已锁定，不能保存")}if(b.nodeEditor&&!b.editorCard())throw new Error("此节点已删除，不能保存或重新创建");S(P),P=null;const we=await ae(O);if(!we.ok)throw we.error;if(oe)throw oe;if(!Ae.size&&!Z&&!d&&P===null)return}}catch(te){throw te===oe&&(oe=null),te}finally{I--,b.flushPendingProjectSync()}}function E(){S(P),P=null}function U(O){Z++;const j=Ue.catch(()=>{}).then(O).finally(()=>{Z--,b.flushPendingProjectSync()});return Ue=j,j}return{saveView:Me,save:ee,enqueueSave:ae,flushLocalChanges:$,trackNodeWork:tt,enqueueCardCreate:U,cancelContentSave:E,cancelTimers(){E(),S(X),X=null},resetFailures(){ne=null,oe=null},markWorkFailure(O){oe=Do(O)},beginFlush(){I++},endFlush(){I--,b.flushPendingProjectSync()},get pendingChain(){return Ue},get busy(){return P!==null||B||d>0||Z>0||Ae.size>0||I>0||!!(b.nodeEditor&&ne)},get status(){return Object.freeze({contentSaving:B,pendingCardCreates:Z,pendingContentSaves:d,localFlushes:I,pendingNodeWork:Ae.size,saveScheduled:P!==null,saveFailure:ne,workFailure:oe})}}}const id={create:ad};function ns(b){let v=b;const S=new Set;return{getSnapshot:()=>v,subscribe:P=>(S.add(P),()=>{S.delete(P)}),set:P=>{v=P,S.forEach(X=>X())}}}const Xi=()=>({enabled:!1,initialized:!1,loading:!1,hasMore:!1,total:0,error:null,blocked:!1});function sd(b,v){let S=Xi(),P=new Map;const X=new Set;let B=null,Z=0,d=null,I=-1/0,ne="refresh";function oe(){Z++,d=null,P.clear(),X.clear(),B=null,I=-1/0,S=Xi()}function Ae(){const $e=b?.isAdmin()===!0;return!$e&&S.enabled?(oe(),v()):$e&&!S.enabled&&(S={...S,enabled:!0}),$e&&!S.blocked}function Ue($e,tt=!1){if(!Ae()||!b)return Promise.resolve();if(d)return d;if($e==="older"&&(!S.initialized||!S.hasMore||!B))return Promise.resolve();const Me=(b.now??Date.now)();if($e==="refresh"&&!tt&&Me-I<5e3)return Promise.resolve();const ee=Z,ae=$e==="older"?B:null;$e==="refresh"&&(I=Me),S={...S,loading:!0,error:null};const Ce=Promise.resolve().then(()=>ee!==Z||!b.isAdmin()?null:b.list({limit:50,status:"all",...ae===null?{}:{cursor:ae}})).then(xe=>{if(ee===Z&&!(!Ae()||!xe)){if($e==="older"&&xe.next_cursor===ae)throw new Error("历史分页游标未前进，请重试");P=new Map(P);for(const $ of xe.jobs)X.has($.id)||P.set($.id,$);(!S.initialized||$e==="older"||B===null)&&(B=xe.next_cursor),S={...S,initialized:!0,total:xe.total,hasMore:B!==null}}}).catch(xe=>{if(ee!==Z||!Ae())return;ne=$e;const $=typeof xe=="object"&&xe!==null&&"status"in xe&&(xe.status===401||xe.status===403);$&&(P.clear(),B=null),S={...S,error:Rr(xe),blocked:$,...$?{total:0,hasMore:!1,initialized:!1}:{}}}).finally(()=>{ee!==Z||d!==Ce||(d=null,S={...S,loading:!1},v())});return d=Ce,v(),Ce}return{getSnapshot:()=>S,getJobs:()=>[...P.values()],synchronizeAccess:Ae,refresh:()=>Ue("refresh"),loadMore:()=>Ue("older"),retry:()=>Ue(ne,!0),reset:oe,forgetTask($e){X.add($e),P.delete($e)},forgetLive($e){for(const tt of $e)P.get(tt)?.history_only||P.delete(tt)},renameProject($e,tt){P=new Map([...P].map(([Me,ee])=>[Me,ee.project===$e?{...ee,projectName:tt}:ee]))}}}function ld(b){const v=ns([]);let S=null,P=0,X=0,B=[],Z=!1;const d=new Set,I=sd(b.history,oe);function ne(ee,ae){return(ae.created??0)-(ee.created??0)||(ee.id<ae.id?1:ee.id>ae.id?-1:0)}function oe(){const ee=I.getJobs(),ae=new Set(B.map(U=>U.id)),Ce=new Map(ee.filter(U=>U.history_only||!Z||ae.has(U.id)).map(U=>[U.id,U])),xe=I.getSnapshot(),$=[...ee].sort(ne).at(-1);for(const U of B)(!xe.enabled||za(U)||d.has(U.id)||Ce.has(U.id)||xe.initialized&&$&&ne(U,$)<=0)&&Ce.set(U.id,U);const E=[...Ce.values()];xe.enabled&&E.sort(ne),v.set(E),b.onChange()}function Ae(ee){const ae=ee.filter($=>!$.history_only),Ce=new Set(ae.map($=>$.id)),xe=new Set(B.map($=>$.id));for(const $ of d)Ce.has($)||d.delete($);for(const $ of ae)(za($)||Z&&!xe.has($.id))&&d.add($.id);I.forgetLive(B.filter($=>!Ce.has($.id)).map($=>$.id)),B=ae,Z=!0,oe()}function Ue(){X++,S=null}function $e(){if(I.refresh(),S)return S;const ee=P,ae=X,Ce=(async()=>{let xe;try{xe=await b.list()}catch{return}ee!==P||ae!==X||(Ae(xe),!(ee!==P||ae!==X)&&await b.onJobsChanged(xe.filter($=>!$.history_only)))})().finally(()=>{S===Ce&&(S=null)});return S=Ce,Ce}async function tt(ee){if(ee=v.getSnapshot().find(E=>E.id===ee.id)??ee,ee.history_only||!b.canTask(ee))return;const ae=P,Ce=await b.remove(ee);if(ae!==P)return;const xe=qi.parse(Ce);Ue();const $=v.getSnapshot().find(E=>E.id===ee.id)??ee;xe.ok===!0&&!xe.pending&&!$.history_only&&b.canTask($)&&(I.forgetTask(ee.id),await b.onTaskDeleted?.(ee)),ae===P&&$e()}async function Me(){const ee=B.filter($=>!za($)&&b.canTask($));if(!b.clear||!ee.length)return;const ae=P,Ce=await b.clear();if(ae!==P)return;const xe=qi.parse(Ce);if(xe.ok===!0&&!xe.pending)for(const $ of ee)I.forgetTask($.id);Ue(),$e()}return{...v,setJobs:Ae,pollJobs:$e,deleteTask:tt,clearDoneTasks:Me,getLiveSnapshot:()=>B,getHistorySnapshot:I.getSnapshot,refreshHistory:I.refresh,loadMoreHistory:I.loadMore,retryHistory:I.retry,reset(){P++,Ue(),I.reset(),Ae([]),Z=!1},retainProjects(ee){P++,Ue(),I.reset(),Ae(B.filter(ae=>ae.project&&ee.includes(ae.project))),Z=!1},renameProject(ee,ae){I.renameProject(ee,ae),Ae(B.map(Ce=>Ce.project===ee?{...Ce,projectName:ae}:Ce))}}}function dd(b){return async function(S,{deleted:P=!1}={}){const X=b.getProject();if(!X||!b.canOperate())return;const B=X.cards.filter(d=>d.job&&!b.isIF(d)&&(d.status==="queued"||d.status==="running"||d.status==="canceled")).map(d=>({card:d,job:d.job,status:d.status}));let Z=!1;for(const{card:d,job:I,status:ne}of B){if(b.getProject()!==X||!b.canOperate())return;if(!X.cards.includes(d)||d.job!==I||d.status!==ne)continue;const oe=S.find(Ae=>Ae.id===I);if(oe&&!(!b.canTask(oe)||oe.project&&oe.project!==X.id||oe.card&&oe.card!==d.id)){if(P){d.status="canceled",d.step="",d.job=null,b.paint(d),Z=!0,b.refreshPanel(d);continue}d.status=oe.status,d.progress=oe.progress,d.error=oe.error,d.queue_remaining=oe.queue_remaining,d.queue_ahead=oe.queue_ahead,d.queue_order=oe.queue_order,d.queue_wait_seconds=oe.queue_wait_seconds,d.step=oe.step||"",oe.seed!=null&&(d.seed=oe.seed),oe.started&&oe.ended&&(d.ms=Math.round((oe.ended-oe.started)*1e3)),oe.outputs?.length&&(d.outputs=oe.outputs),b.paint(d),ne!==d.status&&(Z=!0,b.refreshPanel(d),d.status==="done"&&(b.pushHistory(d,oe),b.refreshHistory(d),await b.propagateCardOutputs(d)),d.status==="error"&&b.showError(`「${b.titleOf(d)}」生成失败：${d.error||"未知错误"}`))}}Z&&b.getProject()===X&&b.canOperate()&&b.save(!1)}}function pd(b){return async v=>{if(!Number.isInteger(v.limit)||v.limit<1)throw new Error("无效分页大小");const S=new URLSearchParams({limit:String(v.limit),status:v.status});return v.cursor!==void 0&&S.set("cursor",v.cursor),Ol.parse(await b(`/api/jobs/history?${S}`))}}function cd({document:b,panel:v,button:S,getViewport:P,getUser:X,canTask:B,api:Z,jpost:d,jobProjName:I,fmtEla:ne,histTime:oe,toast:Ae,showError:Ue,confirm:$e,onFocusTask:tt,onJobsChanged:Me,onTaskDeleted:ee=()=>{}}){const ae=ld({list:async()=>Al.parse(await Z("/api/jobs")).jobs,remove:C=>Z(`/api/job/${C.id}`,{method:"DELETE"}),clear:()=>d("/api/jobs/clear"),canTask:B,history:{list:pd(Z),isAdmin:()=>X()?.role==="admin"},onChange(){U(),v.style.display!=="none"&&ze()},onJobsChanged:Me,onTaskDeleted:ee}),Ce=ae.pollJobs,xe={queued:"等待中",running:"运行中",done:"已完成",error:"失败",canceled:"已取消"},$=C=>C.status==="queued"||C.status==="running",E=C=>C.status==="running"?"run":C.status==="queued"?"wait":C.status==="done"?"done":C.status==="error"?"bad":"gone";function U(){const C=ae.getLiveSnapshot().filter($),_=C.find(q=>q.status==="running"),K=S,pe=`${C.length}|${_?Math.round((_.progress||0)*100):-1}`;if(K._sig===pe)return;K._sig=pe,K.classList.toggle("run",!!_),K.classList.toggle("wait",!_&&C.length>0),K.innerHTML=`任务<span class="n">(${C.length})</span>`;const A=_?`运行中 ${Math.round((_.progress||0)*100)}%`:C.length?"等待中":"";if(A){const q=b.createElement("span");q.className="s",q.textContent=A,K.appendChild(q)}K.title=C.length?`${C.length} 个任务没跑完，点开可以看详情、停止或删除`:"现在没有任务在跑，点开看历史"}function O(){v.style.display==="none"?(v.style.display="",S.classList.add("open"),ze(),te(),Ce()):j()}function j(){v.style.display="none",v.innerHTML="",v._sig=null,S.classList.remove("open")}function te(){if(v.style.display==="none")return;const C=8,_=S.getBoundingClientRect();v.style.maxHeight=P().height-_.bottom-C*2+"px";const K=v.offsetWidth;v.style.top=_.bottom+C+"px",v.style.left=Math.max(C,Math.min(_.right-K,P().width-K-C))+"px"}const we=()=>JSON.stringify([ae.getHistorySnapshot(),ae.getSnapshot().map(C=>[C.id,C.status,!!C.error,C.history_only,C.permission,I(C),C.cardName,C.name,C.submitter_display_name,C.submitter_username])]);function ze(){const C=we();if(v._sig===C){for(const ce of v.querySelectorAll(".jrow")){const Le=ae.getSnapshot().find(N=>N.id===ce._id);Le&&qe(ce,Le)}return}v._sig=C;const _=v.querySelector(".jlist"),K=_?_.scrollTop:0;v.innerHTML="";const pe=b.createElement("div");pe.className="jhd";const A=b.createElement("b"),q=ae.getLiveSnapshot().filter($).length;if(A.textContent=q?`任务 · ${q} 个没跑完`:"任务",pe.appendChild(A),ae.getSnapshot().some(ce=>!ce.history_only&&!$(ce))){const ce=b.createElement("button");ce.className="lnk",ce.textContent="清空已结束",ce.title="只清列表里的记录，已经出好的产物还在节点上",ce.onclick=Y,pe.appendChild(ce)}const W=b.createElement("button");W.className="x",W.textContent="✕",W.title="关闭",W.onclick=j,pe.appendChild(W);const s=b.createElement("div");if(s.className="jlist",!ae.getSnapshot().length){const ce=b.createElement("div");ce.className="jempty",ce.textContent="还没有任务。在节点上点「生成」，任务就会出现在这里。",s.appendChild(ce)}for(const ce of ae.getSnapshot())s.appendChild(je(ce));const T=ae.getHistorySnapshot();if(T.enabled){const ce=b.createElement("div");if(ce.className="jhistory",ce.setAttribute("role","status"),ce.setAttribute("aria-live","polite"),ce.textContent=T.loading?"正在加载任务历史…":T.error?`任务历史加载失败：${T.error}`:`已显示 ${ae.getSnapshot().length} 条任务 · 历史共 ${T.total} 条${T.hasMore?"":" · 已加载全部历史"}`,s.appendChild(ce),!T.blocked&&(T.hasMore||T.error||T.loading)){const Le=Ee(T.error?"重试加载任务历史":"加载更早任务",()=>T.error?ae.retryHistory():ae.loadMoreHistory());Le.className="jmore",Le.disabled=T.loading,s.appendChild(Le)}s.onscroll=()=>{const Le=ae.getHistorySnapshot();!Le.loading&&!Le.error&&Le.hasMore&&s.scrollHeight-s.scrollTop-s.clientHeight<=120&&ae.loadMoreHistory()}}v.append(pe,s),s.scrollTop=K}function je(C){const _=b.createElement("div");_.className="jrow "+E(C),_._id=C.id;const K=X()?.role==="admin"?C.submitter_display_name?.trim()||C.submitter_username||"未记录提交人":"";if(K){const N=b.createElement("div");N.className="jowner",N.textContent=K,_.append(N)}const pe=b.createElement("div");pe.className="r1";const A=b.createElement("span");A.className="nm";const q=C.cardName||C.name||C.id,W=I(C);if(W){const N=b.createElement("i");N.className="pj",N.textContent=W+" - ",A.appendChild(N)}const s=b.createElement("span");s.className="cn",s.textContent=q,A.appendChild(s),A.title=(K?`${K} - `:"")+(W?`${W} - `:"")+(C.name&&q!==C.name?`${q}（${C.name}）`:q),_._st=b.createElement("span"),_._st.className="st",pe.append(A,_._st);const T=b.createElement("div");T.className="r2",_._sp=b.createElement("span"),_._sp.className="sp",_._tm=b.createElement("span"),T.append(_._sp,_._tm);const ce=b.createElement("div");if(ce.className="r3",_._node=b.createElement("span"),_._node.className="node",_._step=b.createElement("span"),_._step.className="step",ce.append(_._node,_._step),_.append(pe,T,ce),$(C)&&(!C.history_only||C.progress!=null)){const N=b.createElement("div");N.className="bar",_._bar=b.createElement("i"),N.appendChild(_._bar),_.appendChild(N)}if(C.error){const N=b.createElement("div");N.className="msg",N.textContent=C.error,_.appendChild(N)}const Le=b.createElement("div");return Le.className="acts",C.history_only||($(C)&&Le.appendChild(Ee("停止",()=>De(C))),Le.appendChild(Ee("删除",()=>Be(C),!0))),C.project&&C.card&&Le.appendChild(Ee("看节点",()=>tt(C))),_.appendChild(Le),qe(_,C),_}function qe(C,_){const K=Math.round((_.progress||0)*100);C._st.textContent=_.status==="running"?_.progress==null?"运行中":`运行中 ${K}%`:_.status==="queued"?Yi(_):xe[_.status]||_.status,C._st.title=_.status==="queued"&&_.queue_order||"";const pe=[_.name,_.modelName||_.capability].filter(Boolean).join(" · ");C._sp.textContent!==pe&&(C._sp.textContent=C._sp.title=pe);const A=`执行节点：${_.nodeName||(_.history_only?"未记录":"等待分配")}`;C._node.textContent!==A&&(C._node.textContent=C._node.title=A);const q=_.step?`当前：${_.step}`:"";C._step.textContent!==q&&(C._step.textContent=C._step.title=q);const W=_.started?ne(((_.ended||Date.now()/1e3)-_.started)*1e3):"";C._tm.textContent=(_.created==null?"":oe(_.created*1e3))+(W?` · ${W}`:""),C._bar&&(C._bar.style.width=K+"%")}function Ee(C,_,K){const pe=b.createElement("button");return K&&(pe.className="danger"),pe.textContent=C,pe.onclick=_,pe}async function De(C){if(C=ae.getSnapshot().find(_=>_.id===C.id)||C,C.history_only||!B(C))return Ae("此任务关联的画布为只读，不能停止");try{await d(`/api/job/${C.id}/cancel`)}catch(_){return Ue(_.message)}Ce()}async function Be(C){if(C=ae.getSnapshot().find(_=>_.id===C.id)||C,C.history_only||!B(C))return Ae("此任务关联的画布为只读，不能删除");if(!($(C)&&!$e("这个任务还没跑完，删除会先把它停掉。继续？")))try{await ae.deleteTask(C)}catch(_){return Ue(_.message)}}async function Y(){if(ae.getSnapshot().some(C=>!C.history_only&&!$(C)))try{await ae.clearDoneTasks()}catch(C){return Ue(C.message)}}return{pollJobs:Ce,paintJobsBtn:U,toggleJobs:O,closeJobs:j,placeJobs:te,renderJobs:ze,stopTask:De,delTask:Be,clearDoneJobs:Y,getJobs:ae.getSnapshot,reset:ae.reset,retainProjects:ae.retainProjects,renameProject:ae.renameProject}}const ud={create:cd,createCanvasUpdater:dd};function fd(b,v,S,P,X,B){const{window:Z,document:d,addEventListener:I,setTimeout:ne,clearTimeout:oe,setInterval:Ae,clearInterval:Ue,requestAnimationFrame:$e,cancelAnimationFrame:tt,ResizeObserver:Me,MutationObserver:ee,IntersectionObserver:ae,URL:Ce}=b,xe=X.mediaFetch,$=X.WebSocket,E=id,U=ud,O=Zl;Z.ChoukaImageComposer=B;const j=(e,t=d)=>t.querySelector(e),te=268,we=180,ze=900,je=90,qe=900,Ee=.1,De=5,Be=e=>e.w||te,Y="http://www.w3.org/2000/svg",C=new URLSearchParams(location.search),_=C.get("editor")==="1",K=C.get("project"),pe=C.get("card");_&&d.body.classList.add("node-editor"),d.addEventListener("contextmenu",e=>e.preventDefault());let A=[],q={},W={},s=null,T=[],ce=[],Le="personal",N={x:60,y:70,k:1},se=null,J=new Set,$t=null,st=null,Sn=null,ln=null,jt=new Map,Zt=-1,At=null,An=null,Et=0,Ft=null,qt=!1;const m={side:j("#side"),plist:j("#plist"),dot:j("#dot"),spaceSelect:j("#space-select"),spaceLabel:j("#space-label"),spaceStatus:j("#space-status"),ptitle:j("#ptitle"),hint:j("#hint"),fit:j("#fit"),presenceUsers:j("#presence-users"),stage:j("#stage"),world:j("#world"),wires:j("#wires"),groups:j("#groups"),presenceLayer:j("#presence-layer"),lasso:j("#lasso"),selbar:j("#selbar"),dock:j("#dock"),empty:j("#empty"),panel:j("#panel"),hist:j("#hist"),menu:j("#menu"),tip:j("#tip"),toast:j("#toast"),picker:j("#picker"),jobsbtn:j("#jobsbtn"),jobs:j("#jobs"),view:j("#view"),vbox:j("#view .vbox"),respop:j("#respop"),minimapBtn:j("#minimap-btn"),wiresToggle:j("#wires-toggle"),zoomMenu:j("#zoom-menu"),minimap:j("#minimap"),minimapCanvas:j("#minimap-canvas"),minimapViewport:j("#minimap-viewport"),zoomPercent:j("#zoom-percent")},Ye=E.create({setTimeout:ne,clearTimeout:oe,getProject:()=>s,getView:()=>N,isAuthenticated:()=>v.active,canSave:()=>rn(),nodeEditor:_,editorCard:()=>Hr(),plain:e=>go(e),api:(...e)=>kt(...e),jpost:(...e)=>Yt(...e),jput:(...e)=>dt(...e),recordCanvasEdit:()=>yo(),flushPendingProjectSync:()=>ea(),openProject:e=>vr(e),toast:e=>re(e),showError:e=>Pe(e),flushFocusedControl:()=>{d.activeElement?.closest?.("#panel, #respop")&&d.activeElement.blur()}}),{saveView:Qt,save:Q,enqueueSave:ur,flushLocalChanges:Yn,trackNodeWork:D}=Ye,We=U.createCanvasUpdater({getProject:()=>s,canOperate:()=>fe(),isIF:e=>Ge(e),canTask:e=>fr(e),paint:e=>rt(e),refreshPanel:e=>{m.panel._id===e.id&&ke(e.id)},pushHistory:(e,t)=>Mr(e,t),refreshHistory:e=>{m.hist._id===e.id&&zr(e.id)},propagateCardOutputs:e=>Oi(e),titleOf:e=>he(e),showError:e=>Pe(e),save:e=>Q(e)}),lt=U.create({document:d,panel:m.jobs,button:m.jobsbtn,getViewport:()=>({width:innerWidth,height:innerHeight}),getUser:()=>v.user,canTask:e=>fr(e),api:(...e)=>kt(...e),jpost:(...e)=>Yt(...e),jobProjName:e=>Il(e),fmtEla:e=>sr(e),histTime:e=>_a(e),toast:e=>re(e),showError:e=>Pe(e),confirm:e=>confirm(e),onFocusTask:e=>Ai(e),onJobsChanged:e=>We(e),onTaskDeleted:e=>We([e],{deleted:!0})}),{pollJobs:pt,paintJobsBtn:dn,toggleJobs:Vn,closeJobs:$n,placeJobs:Lt,renderJobs:jn}=lt,fe=(e=s)=>v.active&&e?.permission==="operate",rn=()=>fe()&&!s.locked,fr=e=>v.active&&e?.permission==="operate",Fe=()=>fe()?!0:(re("此画布只读，不能修改或运行"),!1),mr=()=>{if(!s?.id)throw new Error("请先打开可操作画布");return`/api/upload?project=${encodeURIComponent(s.id)}`},Pt=async(e,t=!1)=>{if(!Fe())throw new Error("此画布只读");const n=s,r=new FormData;r.append("file",e,e.name);const o=mr()+(t?"&local_only=1":""),a=await kt(o,{method:"POST",body:r});if(s!==n||!fe())throw new Error("画布已切换或权限已变化，上传已取消");const i=a.files?.[0]||a;if(!i?.url||!i?.ref)throw new Error("上传接口未返回素材");return i};async function kt(e,t={}){const n=(t.method||"GET").toUpperCase();if(!["GET","HEAD"].includes(n)){const r=new Ce(e,location.href);if(/^\/api\/(upload|generate|text|rewrite)$/.test(r.pathname)&&!fe())throw new Error("此画布只读");const o=r.pathname.match(/^\/api\/projects\/([^/]+)(?:\/(rename|copy))?$/);if(o){const a=T.find(i=>i.id===decodeURIComponent(o[1]))||(s?.id===decodeURIComponent(o[1])?s:null);if(!fe(a)||a.locked&&o[2]!=="copy")throw new Error("此画布不可修改")}}return X.request(e,t)}function Fn(){Ye.cancelTimers(),vo(),s=null,se=null,J.clear(),Ft=null,Go(),nn(),Xn(),Yr(),kn(),$n(),Pn(),m.groups.replaceChildren(),m.selbar.style.display="none",Cs(),_&&Cr()}function pn(){if(d.body.classList.toggle("project-readonly",!!s&&!fe()),fe()||(Ye.cancelContentSave(),kn(),Pn()),m.dock.style.display=fe()?"":"none",m.panel._id&&m.panel.dataset.readonly!==String(!fe())&&ke(m.panel._id),s){m.ptitle.textContent=s.name;const e=d.createElement("span");e.className="ro",e.textContent=fe()?s.locked?"试玩画布 · 刷新还原":"":"只读",m.ptitle.append(e)}}Z.addEventListener("h3auth:expired",()=>{Wn=null,lt.reset(),T=[],Fn(),ho()});let xn=!1;Z.addEventListener("h3auth:denied",async({detail:e})=>{if(!(xn||!v.active||!/^\/api\/(projects|job|upload|generate|text|rewrite|media|thumbnail)/.test(e.path))){xn=!0,s&&e.path!=="/api/thumbnail"&&(s.permission="read",pn());try{await wr(),await pt()}finally{xn=!1}}});const Yt=(e,t)=>kt(e,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t||{})}),dt=(e,t)=>kt(e,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}),Pe=e=>S.error(e);let hr=null;function re(e){m.toast.textContent=e,m.toast.style.display="block",oe(hr),hr=ne(()=>m.toast.style.display="none",Math.min(2600+Math.max(0,String(e).length-20)*70,9e3))}const Dt=()=>Math.random().toString(36).slice(2,10),cn=e=>A.find(t=>t.id===e)||A[0],Ct=["image","audio","video"],Ve={image:"图片",video:"视频",audio:"音频"},Nn=(e,t)=>e.id===t||!!(e.ladder&&Object.values(e.ladder).includes(t))||!!(e.route&&Object.values(e.route).some(n=>n.cap===t))||!!(e.modelSwitch&&Object.values(e.modelSwitch).includes(t)),Nt=(e,t)=>e?t&&e.modelSwitch&&e.modelSwitch[t]?e.modelSwitch[t]:e.route?e.route[Object.keys(e.route)[0]].cap:e.id:null,St=e=>{const t=A.find(n=>n.id===e.type);return t&&t.modes.some(n=>Nn(n,e.cap))?t:A.find(n=>n.modes.some(r=>Nn(r,e.cap)))||cn(e.type)},ct=e=>{const t=St(e);return t&&t.modes.find(n=>Nn(n,e.cap))},on=e=>Object.entries((ct(e)||{}).modelSwitch||{}).find(([,t])=>t===e.cap)?.[0],Kn={zimage:"Z-Image",krea2:"Krea2",qwen2511:"Qwen Image Edit 2511",qwen2512:"Qwen Image 2512（双阶段）",qwen21:"Qwen Image 2.1",da3:"Depth Anything 3",depthcrafter:"DepthCrafter"},It=X.localBridge.baseURL;let un=[],fn=null,lo=!1,Gn="",Or=!1,Mn=!1;const Ge=e=>ge(e)?.execution==="if_studio";async function an(e,t={}){return X.localBridge.request(e,t)}function zn(e){switch(e.quota_status){case"limited":return`剩余 ${e.remaining} 次免费`;case"exhausted":return"剩余 0 次 · 免费次数已用完";case"unavailable":return"剩余 0 次 · 未开通";case"free":return"免费使用";case"paid":return"已开通 · 按预算使用";default:return e.quota_status?"次数未知":"次数未知 · 请更新桥接器"}}function Ln(e=!0){return fn||(lo=!0,fn=(async()=>{const t=await an("/status");if(!t.ready)throw new Error("请先在本机登录 IF CLI");return Or=t.reference_reuse===!0,Mn=t.request_recovery===!0,un=(await an("/models")).models,Gn="",un})().catch(t=>{throw Gn=t.message,t}).finally(()=>{fn=null,e&&m.panel._id&&ke(m.panel._id)}),fn)}function Ar(e,t){const n="chouka:if-references:v1:"+JSON.stringify([v.user?.id,t,e.id]);if(e._ifReferences?.key===n)return e._ifReferences;let r;try{r=JSON.parse(sessionStorage.getItem(n))}catch{}const o={key:n,entries:Array.isArray(r?.entries)?r.entries.slice(0,40):[],pending:Array.isArray(r?.pending)?r.pending.slice(0,40):[],job:r?.job||null};return e._ifReferences=o,o}function Bt(e){try{sessionStorage.setItem(e.key,JSON.stringify({entries:e.entries,pending:e.pending,job:e.job}))}catch{}}function Zn(e){try{const n=new Ce(e?.canvas_url);if(n.origin==="https://ifs.alibaba-inc.com"&&!n.username&&!n.password&&n.pathname==="/"&&/^#\/canvas\/c_[A-Za-z0-9_-]+$/.test(n.hash))return n.href}catch{}const t=e?.canvas_id;return typeof t=="string"&&/^c_[A-Za-z0-9_-]+$/.test(t)?`https://ifs.alibaba-inc.com/#/canvas/${t}`:""}function gr(e){if(!Ge(e)||e.status!=="error")return null;const t=Zn({canvas_url:e.if_canvas_url});if(!t)return null;const n=d.createElement("a");n.className="if-canvas-link",n.textContent="打开 IF 画布",n.href=t,n.target="_blank",n.rel="noopener noreferrer",n.title="在新标签页查看 IF 生成失败原因";for(const r of["pointerdown","mousedown","click","dblclick"])n.addEventListener(r,o=>o.stopPropagation());return n}function br(e){if(!Ge(e)||e.status!=="error"||!(e.job||e.if_request_id)||!fe())return null;const t=d.createElement("button");t.type="button",t.className="if-recover-button",t.textContent=e._ifRestoring?"正在查询原产物…":"查询原产物",t.disabled=!!e._ifRestoring,t.title="由发起人在原电脑查询原任务，不会重新提交生成";for(const n of["pointerdown","mousedown","dblclick"])t.addEventListener(n,r=>r.stopPropagation());return t.onclick=n=>{n.stopPropagation(),xr(e)},t}async function xr(e){const t=s;if(!t||!t.cards.includes(e)||!fe()||!Ge(e)||e.status!=="error"||!(e.job||e.if_request_id)||e._ifRestoring||e._ifPolling||!confirm(`请由任务发起人在原电脑操作。
只查询本机桥接器中的原任务并取回产物，不会重新生成。
若桥接器已重启，原记录可能无法恢复。继续查询？`))return;const n={cap:e.cap,job:e.job,request:e.if_request_id,started:e.if_started},r=()=>s===t&&t.cards.includes(e)&&fe()&&e.status==="error"&&e.cap===n.cap&&e.job===n.job&&e.if_request_id===n.request&&e.if_started===n.started;e._ifRestoring=!0,m.panel._id===e.id&&ke(e.id);try{const o=n.job||(await an(`/requests/${encodeURIComponent(n.request)}`)).id;if(!r())return;if(!o)throw new Error("本机桥接器未返回原任务编号");const a=await an(`/runs/${encodeURIComponent(o)}`);if(!r())return;if(a.state==="error")throw new Error("原任务在 IF 中仍为失败："+(a.error||"请打开 IF 画布查看原因"));if(!["starting","running","done"].includes(a.state))throw new Error("原任务状态无法识别，请在 IF 查看");const i={...e,job:o,status:"running",error:null,progress:null,if_started:Number.isFinite(e.if_started)?e.if_started:Date.now(),step:"正在查询原任务并恢复产物"};if(!Tt(i,t.id,"running"))throw new Error("无法保存恢复记录，请检查浏览器存储权限");Object.assign(e,{job:i.job,status:i.status,error:null,progress:null,if_started:i.if_started,step:i.step}),rt(e),m.panel._id===e.id&&ke(e.id),await mn(e,t.id),await ao(e,t.id,a)}catch(o){Pe(o.status===404?"本机未找到原任务，请由发起人在原电脑查询；若桥接器已重启，请到 IF 下载原产物。未重新提交生成。":"查询原产物未完成："+o.message+"；未重新提交生成。")}finally{e._ifRestoring=!1,s===t&&t.cards.includes(e)&&m.panel._id===e.id&&ke(e.id)}}function qn(e,t){return"chouka:if-task:v1:"+JSON.stringify([v.user?.id,t,e.id])}function yn(e,t){let n;try{n=JSON.parse(sessionStorage.getItem(qn(e,t)))}catch{}return!!(n&&n.cap===e.cap&&Number.isFinite(e.if_started)&&n.if_started===e.if_started&&(e.if_request_id?n.if_request_id===e.if_request_id:e.job&&n.job===e.job)&&(!e.job||!n.job||e.job===n.job))}function Tt(e,t,n){const r={phase:n,cap:e.cap,job:e.job,status:e.status,step:e.step,error:e.error,if_started:e.if_started,if_job_cap:e.if_job_cap,if_canvas_url:e.if_canvas_url,ms:e.ms,outputs:e.outputs||[],if_request_id:e.if_request_id,if_submitted_at:e.if_submitted_at,if_pending_prompts:e.if_pending_prompts,inputs:n==="preparing"?{params:e.params,assets:e.assets}:null,entry:e.job?e.history?.find(o=>o.job===e.job):null};try{return sessionStorage.setItem(qn(e,t),JSON.stringify(r)),!0}catch{return!1}}function Qn(e,t){if(!Ge(e))return!1;const n=qn(e,t);let r;try{r=JSON.parse(sessionStorage.getItem(n))}catch{}if(!r||r.cap!==e.cap||!Number.isFinite(r.if_started)||!["preparing","submitting","running","done","error"].includes(r.phase))return!1;const o=r.phase==="submitting"&&r.if_request_id&&r.if_request_id===e.if_request_id&&!r.job&&!e.job&&e.status==="error",a=r.phase==="done"&&r.status==="done"&&r.job&&r.job===e.job&&e.status==="error"&&r.outputs?.length;if((e.if_started||0)>r.if_started||e.if_started===r.if_started&&(e.job&&e.job!==r.job||e.if_request_id&&r.if_request_id&&e.if_request_id!==r.if_request_id||!o&&!a&&e.job===r.job&&["done","error"].includes(e.status))){try{sessionStorage.removeItem(n)}catch{}return!1}for(const i of["job","status","step","error","if_started","if_job_cap","if_canvas_url","ms","outputs","if_request_id","if_submitted_at","if_pending_prompts"])e[i]=r[i];if(e.progress=null,r.entry&&r.entry.job===e.job){e.history||=[];const i=e.history.findIndex(l=>l.job===e.job);i<0?e.history.unshift(r.entry):e.history[i]=r.entry}return r.phase==="preparing"&&r.if_request_id&&r.inputs?(e.params=r.inputs.params,e.assets=r.inputs.assets,e.status="queued",e.error=null,e.step="正在恢复 IF 素材准备",e._ifResumePreparing=!0):r.phase==="submitting"&&r.if_request_id?(e.status="running",e.error=null,e.step="正在向本机 IF 确认原请求"):(r.phase==="preparing"||r.phase==="submitting")&&(e.status="error",e.step="",e.error=r.phase==="preparing"?"上次素材准备因页面离开而中断，尚未提交 IF；请确认后重试":"上次 IF 提交结果尚未确认，请先在 IF 查看是否已创建任务，避免重复生成",Tt(e,t,"error")),!0}async function mn(e,t){const n=e.if_started,r=e.job,o=e.status,a=qn(e,t),i=await ur(t);if(i.ok&&["done","error"].includes(o))try{const l=JSON.parse(sessionStorage.getItem(a));l?.if_started===n&&l.job===r&&l.phase===o&&sessionStorage.removeItem(a)}catch{}return i}function Fr(e){try{const t=new Ce(e);return t.protocol==="https:"&&t.hostname==="ant.alicdn.com"&&!t.port&&!t.username&&!t.password&&t.pathname.startsWith("/bio/img/")}catch{return!1}}function Vt(e,t,n){const r=Ar(e,n);if(r.job===e.job){for(const o of t?.reference_urls||[]){const a=r.pending[o.index];!Number.isInteger(o.index)||!a||a.kind!==o.kind||!Fr(o.url)||(r.entries=r.entries.filter(i=>i.source!==a.source),r.entries.push({...a,url:o.url}))}for(const o of t?.invalid_reference_indices||[]){const a=r.pending[o];a&&(r.entries=r.entries.filter(i=>i.source!==a.source||i.version!==a.version))}Bt(r)}}async function po(e,t){const n=await xe(`/api/if-reference?${new URLSearchParams({url:e.pathname+e.search,type:t})}`,{method:"HEAD",credentials:"same-origin",cache:"no-store"});if(!n.ok)throw new Error(`无法检查引用素材（${n.status}），请确认素材仍存在且有访问权限`);const r=n.headers.get("ETag");if(!r||!/^"[a-f0-9]{64}"$/.test(r))throw new Error("抽卡服务尚不支持引用复用，请更新服务后重试");return r}const he=e=>{const t=ge(e),n=ct(e);return ft(e)?e.name||"素材节点":e.name||(n&&(n.ladder||n.route)?n.name:t?t.name:n?n.name:e.cap)},ht=e=>!!e&&(St(e)||{}).kind==="style",er="@style",Dn="@text",Ze=e=>String(e.slot||"").startsWith("@"),Ht=e=>!!e&&(St(e)||{}).kind==="text",ut=e=>ht(e)||Ht(e),ft=e=>!!e&&(St(e)||{}).kind==="asset",hn=e=>ft(e)&&(e.outputs||[])[0]||null,en=e=>e?ht(e)?String((e.params||{}).style||"").trim():String((e.params||{}).text||"").trim():"",k=e=>((e||{}).params||{}).op||"",R=e=>(s?s.edges:[]).filter(t=>t.to===e.id&&t.slot===Dn).map(t=>at(t.from)).filter(t=>t&&ut(t)).map(t=>({id:t.id,name:he(t),text:en(t)})),z=e=>(e&&e.inputs||[]).filter(t=>t.type==="textarea"&&t.key!=="negative_prompt"&&!t.template&&!t.advanced),le=e=>(s?s.edges:[]).filter(t=>t.to===e.id&&t.slot===er).map(t=>s.cards.find(n=>n.id===t.from)).filter(t=>t&&ut(t)&&en(t));function de(e,t=new Set){if(!e||t.has(e.id))return[];t.add(e.id);const n=[],r=new Set;for(const o of(s?s.edges:[]).filter(a=>a.to===e.id&&!Ze(a))){const a=s.cards.find(i=>i.id===o.from);if(!(!a||ut(a)))for(const i of ue(a,t))r.has(i.id)||(r.add(i.id),n.push(i))}return n}function ue(e,t=new Set){if(!e)return[];const n=le(e);return n.length?n:de(e,t)}function Re(e){return(s?s.cards:[]).filter(t=>!ut(t)&&!le(t).some(n=>n.id===e.id)&&ue(t).some(n=>n.id===e.id))}const ot=e=>ue(e).map(en),Rt=()=>(s?s.cards:[]).filter(ut).forEach(e=>rt(e)),tn="{提示词}",qr=(e,t)=>{const n=e.opt&&e.opt[t];return n&&String(n).trim()?String(n):null},Dr=(e,t)=>e.optUse&&e.optUse[t]?qr(e,t):null,Br=/^(?:For the target video, at [\d.]+ seconds|How the reference pictures align)[^\n]*\n/;function co(e,t){let n=String(e??"");for(const r of t){if(r.includes(tn)){n=r.split(tn).join(n);continue}if(!n.trim()){n=r;continue}const o=n.match(Br);n=o?n.slice(0,o[0].length)+`
`+r+`

`+n.slice(o[0].length).replace(/^\s+/,""):r+`

`+n}return n}const yr=e=>Object.keys(e.assets||{}).filter(t=>t.startsWith("images[")&&e.assets[t]).length;function Ut(e){const t=ct(e);if(!t||!t.ladder)return e.cap;const n=Object.keys(t.ladder).map(Number).sort((o,a)=>o-a),r=Math.max(yr(e),n[0]);return t.ladder[String(n.filter(o=>o<=r).pop())]||e.cap}function Ho(e,t){const n=W[e];return n?.type===t?n:{type:t,api:{image:null,video:null,audio:null},bridge:{image:t==="video"?6:3,video:t==="video"?1:0,audio:0},reference_fallback:!0,note:"该模型引用规格尚未核实，使用画布兜底数量。"}}const ge=e=>{const t=q[e.cap];if(!t||t.execution!=="if_studio")return t||null;const n=un.filter(l=>l.type===t.outputType),r=e.params?.if_model||n[0]?.display_name,o=Ho(r,t.outputType),a=o.bridge,i=t.inputs.filter(l=>l.key!=="if_reference"||a?.image||a?.video).map(l=>l.key==="if_reference"?{...l,label:`参考${a?.image?"图片":""}${a?.image&&a?.video?"／":""}${a?.video?"视频":""} HTTPS 地址（可选）`}:l.key==="duration"?{...l,min:o?.duration?.min??1,max:o?.duration?.max??null,type:o?.duration?.max!=null?"slider":"number",step:1,default:o?.duration?.default??l.default,showHint:!0,hint:o?.duration?.max!=null?`当前模型时长：${o.duration.min}–${o.duration.max} 秒（整数）。`:"当前模型时长范围未核实；请输入正整数秒，不套用其他模型上限。"}:l);for(let l=0;l<(a?.image||0);l++)i.push({key:`images[${l}]`,label:"参考图片",type:"image"});for(let l=0;l<(a?.video||0);l++)i.push({key:`video[${l}]`,label:"参考视频",type:"video"});for(const[l,c]of Object.entries(e.assets||{}))c&&(/^images\[\d+\]$/.test(l)&&c.kind==="image"||/^video\[\d+\]$/.test(l)&&c.kind==="video")&&!i.some(f=>f.key===l)&&i.push({key:l,label:c.kind==="image"?"已保留的参考图片":"已保留的参考视频",type:c.kind});return{...t,inputs:i,slotLimits:{image:{max:a?.image||0},video:{max:a?.video||0},audio:{max:0}}}};function Uo(e){const t=ge(e)?.inputs.find(r=>r.key==="duration");if(!t)return;const n=Number(e.params.duration??t.default);e.params.duration=Math.min(t.max??1/0,Math.max(t.min,Number.isFinite(n)?Math.round(n):t.default))}function Wo(e,t){const n=ct(e),r=n&&n.route&&n.route[t];return r&&r.cap!==e.cap?r:null}function rs(e,t,n){const r=n&&n.kind?Wo(e,n.kind):null;r&&(Un(s.edges.filter(i=>i.to===e.id)),e.cap=r.cap,e.assets={},t={key:r.slot},Kt(e),Qe(),Rt());const o=St(e);let a=!1;return o&&o.id==="card_image"&&n&&n.kind==="image"&&(e.cap==="zimage_t2i"?(tr(e,"zimage_i2i"),e._model||(e._model="zimage"),a=!0):e.cap==="krea2_t2i"&&(tr(e,"krea2_i2i"),e._model||(e._model="krea2"),a=!0),a&&(Kt(e),Qe(),Rt(),ne(()=>ke(e.id),50))),!r&&ni(e.id,t.key)&&(Qe(),Rt()),e.assets[t.key]=n,Bn(e),zt(e),t}const{CLARITY_STEPS:Jo,RATIO_GRID:os,resolutionPresets:as,resolutionPreset:is,imageSettings:Xo,applyInputPresets:ss}=O,Aa=O.create({document:d,getCapability:e=>ge(e),getCapabilityById:e=>q[e],getRunCapability:e=>q[Ut(e)]||ge(e),getProject:()=>s,isIF:e=>Ge(e),normalizeIFDuration:e=>Uo(e),api:(...e)=>kt(...e),save:()=>Q(),onReferenceChange:e=>Fa(e),ratioWH:so,multiple:On}),{imageClarityPicker:ls,referenceVideo:ds,syncReferenceParameters:Yo,refreshVideoParameters:Bn,videoReferenceStatus:ps}=Aa,{clarityPicker:cs,paramsBrief:Vo,switchImageCapability:tr}=td({document:d,save:()=>Q(),claritySteps:Jo,ratioGrid:os,imageClarityPicker:ls,imageSettings:Xo,resolutionPresets:as,resolutionPreset:is,switchImageCapability:(e,t)=>Aa.switchImageCapability(e,t)});function Fa(e){if(!s?.cards.includes(e)||m.panel._id!==e.id)return;const t=Ge(e)?ge(e):q[Ut(e)]||ge(e),n=m.panel.querySelector('button[title^="点开弹窗"]');n&&(n.textContent=`⚙ ${Vo(e,t)||"参数"}`),m.respop._card===e&&m.respop.style.display!=="none"&&(m.respop._cap!==t.id?Pn():m.respop._refill())}const us=e=>(e&&e.inputs||[]).filter(t=>!qo.has(t.key)&&!Ct.includes(t.type)&&t.type!=="textarea"&&(t.type==="seed"||!t.advanced)&&!t.mirror&&!t.rangeOf);function fs(e,t){const n=Ge(e)?ge(e):q[Ut(e)]||ge(e),r=n&&(n.imageControls||n.inputs.some(f=>qo.has(f.key))),o=n?.imageControls?["steps","seed"].map(f=>n.inputs.find(u=>u.key===f&&!u.mirror)).filter(Boolean).map(f=>({...f,label:f.key==="steps"?"采样步数":"种子"})):us(n);if(!r&&!o.length)return re("这个模式没有可调参数");const a=()=>{if(m.panel._id!==e.id)return;const f=m.panel.querySelectorAll(".foot .tcap"),u=f[f.length-1];if(!u||!u.textContent.startsWith("⚙"))return;const p=Vo(e,n);u.textContent=p?`⚙ ${p}`:"⚙ 参数"};let i=!1;const l=()=>{const f=m.respop.contains(d.activeElement)?d.activeElement.id:null;m.respop.innerHTML="";const u=ps(e,n);if(u&&m.respop.appendChild(u),r&&m.respop.appendChild(cs(e,n,l)),o.length){const g=d.createElement("div");g.className=n.imageControls?"pwrap image-basic":"pwrap",r&&(g.style.marginTop="12px");for(const h of o){const x=Ro(e,h);ed(x,a),g.appendChild(x)}m.respop.appendChild(g)}if(n.imageControls){const g=n.inputs.filter(h=>!Ct.includes(h.type)&&h.type!=="textarea"&&h.type!=="seed"&&h.key!=="steps"&&!qo.has(h.key)&&!h.mirror&&!h.rangeOf&&!(n.imageControls.mode==="t2i"&&h.key==="encode_resolution")&&!(Ge(e)&&h.key==="if_reference"));if(g.length){const h=d.createElement("details");h.className="image-advanced",h.open=i;const x=d.createElement("summary");x.textContent="模型专属参数",h.appendChild(x),h.addEventListener("toggle",()=>{!h.isConnected||h.open===i||(i=h.open,c())});for(const w of g)h.appendChild(Ro(e,w));m.respop.appendChild(h)}}const p=d.createElement("button");p.className="x",p.textContent="✕",p.title="关闭 (Esc)",p.onclick=Pn,p.dataset.readonlyView="",m.respop.appendChild(p),Ji(m.respop,!fe()),a(),f&&d.getElementById(f)?.focus({preventScroll:!0})};m.respop._card=e,m.respop._cap=n.id,m.respop._refill=()=>{l();const f=m.respop.getBoundingClientRect();(f.top<8||f.bottom>innerHeight-8)&&c()},l(),m.respop.style.display="",Bn(e);function c(){if(m.respop.style.display==="none"||!t.isConnected)return;const f=t.getBoundingClientRect(),u=f.top-64,p=innerHeight-f.bottom-16;m.respop.style.maxHeight=Math.max(160,Math.max(u,p))+"px";const g=m.respop.offsetWidth,h=m.respop.offsetHeight,x=Math.max(8,Math.min(f.left+f.width/2-g/2,innerWidth-g-8));let w=f.top-h-8;w<56&&(w=Math.max(8,Math.min(f.bottom+8,innerHeight-h-8))),m.respop.style.left=x+"px",m.respop.style.top=w+"px"}c()}const Pn=()=>{m.respop.style.display="none",m.respop._card=null,m.respop._refill=null},ms={image:"图片 (png)",video:"视频 (mp4，含音轨)",audio:"音频"},hs={4:"四宫格",6:"六宫格",9:"九宫格",12:"十二宫格",16:"十六宫格"};function qa(e){const t=e&&e.grid;if(!t)return"";const n=t[0]*t[1];return hs[n]||`${n}格`}function sn(e,t=null){const n=qa(e);if(Ct.includes(e.type)){const o=t&&ge(t),i=(o?o.inputs.filter(u=>u.type===e.type&&(t.assets||{})[u.key]):[]).findIndex(u=>u.key===e.key),l=+(String(e.key).match(/\[(\d+)\]/)||[0,0])[1],c=i>=0?i+1:l+1,f=`${Ve[e.type]||e.type}${c}`;return n?`${f}（${n}）`:f}const r=String(e.label||"").trim();return n?`${r}（${n}）`:r}function gs(e){const t=p=>e.inputs.filter(g=>g.type===p),n=[...new Set(e.inputs.filter(p=>Ct.includes(p.type)).map(p=>p.type))],r=t("textarea"),o=e.inputs.find(p=>p.key==="duration"),a=e.inputs.filter(p=>p.key==="width"||p.key==="height"),i=e.inputs.find(p=>p.key==="aspect_ratio"),l=e.inputs.find(p=>p.key==="megapixels"),c=e.inputs.find(p=>p.key==="scale_to_length"),f=[],u=[];for(const p of n){const g=t(p),h=g.filter(y=>y.required),x=g.filter(y=>!y.required),w=Ve[p]||p;h.length&&f.push(`${w} ×${h.length}：${h.map(y=>sn(y)).join(" / ")}`),x.length&&u.push(`可引用${w}（上限 ${Jn(e,p)}）`)}return n.length||f.push("不需要素材，纯提示词驱动"),r.length&&f.push(r.length>1?`提示词 ×${r.length}`:"提示词"),o&&u.push(o.max==null?"时长范围未核实（正整数秒）":`时长 ${o.min}–${o.max} 秒`),e.imageControls?(u.push(`清晰度 ${Jo.map(p=>p.label).join(" / ")}（短边）`),u.push(e.imageControls.mode==="i2i"?"默认原图比例，也可另选画面比例":"画面比例（13 档）")):(a.length&&u.push("画面宽高"),i&&u.push(`画面比例（${i.options.length} 档，默认 ${i.default}）`),l&&u.push(`分辨率 ${pr[0]}p–${pr[pr.length-1]}p（短边，768p 为 H3 原生）`),c&&u.push(`分辨率长边 ${c.min}–${c.max}，画面比例跟随原图`)),e.inputs.some(p=>p.type==="seed")&&u.push("种子"),{need:f,opt:u,out:ms[e.outputType]||e.outputType,file:e.file||e.id}}function bs(e,t){const n=gs(e),r=d.createElement("div"),o=d.createElement("b");if(o.textContent=t||e.name,r.appendChild(o),e.note){const l=d.createElement("div");l.className="note",l.textContent=e.note,r.appendChild(l)}const a=(l,c)=>{const f=d.createElement("div");f.className="io";const u=d.createElement("i");u.textContent=l;const p=d.createElement("span");p.textContent=c,f.append(u,p),r.appendChild(f)};a("输入",n.need.join("　·　")),n.opt.length&&a("可调",n.opt.join("　·　")),a("产出",n.out);const i=d.createElement("div");return i.className="fn",i.textContent=n.file,r.appendChild(i),r}function uo(e,t,n){const r=d.createElement("div"),o=d.createElement("b");o.textContent=e;const a=d.createElement("div");a.className="note",a.textContent=t,r.append(o,a);for(const[i,l]of n){const c=d.createElement("div");c.className="io";const f=d.createElement("i");f.textContent=i;const u=d.createElement("span");u.textContent=l,c.append(f,u),r.appendChild(c)}return r}function fo(e,t,n){if(!t)return null;const r=Nn(t,e.cap),o=r?t.ladder?Ut(e):e.cap:Nt(t),a=q[o]||q[Nt(t)];if(!a)return uo(n||t.name,"这个模式当前不可用。",[]);const i=bs(a,n||t.name);let l="";if(t.route?l=(t.entry&&t.entry.hint?t.entry.hint:"根据放入的素材类型自动选择工作流。")+(r?`当前会运行「${a.name}」。`:""):t.ladder&&(l="按图片数量自动选择："+Object.keys(t.ladder).map(Number).sort((c,f)=>c-f).map(c=>`${c} 张 → ${(q[t.ladder[c]]||{}).name||t.ladder[c]}`).join("；")+(r?`。当前 ${yr(e)} 张，会运行「${a.name}」。`:"。")),l){const c=d.createElement("div");c.className="note",c.textContent=l,i.insertBefore(c,i.children[1]||null)}return i}function xs(e){const t=St(e);return ht(e)?uo(he(e),`这个节点保存一段可复用的风格描述，不会单独生成产物。连接到生成节点后会并入提示词，并沿产物连线向下游继承；下游节点自己挂风格时会从那里开始覆盖继承。使用 ${tn} 可以指定原提示词插入位置。这里只写画风、色调、光线和镜头质感，具体画面内容留在生成节点。`,[["输入","风格、色调、光线和镜头质感"],["产出","可复用的风格文字"]]):Ht(e)?uo(he(e),"这个节点保存和加工文字。可以连接到生成节点并入提示词，也可以连接到其他文本节点作为加工输入；加工结果会写回节点。",[["输入","节点文字或上游文本"],["产出","可继续连接的文字"]]):ft(e)?uo(he(e),"这个节点保存一份上传素材，不会单独运行。它可以同时连接到多个节点，让同一份图片、视频或音频重复使用；原文件不会被处理。",[["输入","图片、视频或音频"],["产出","可复用的原始素材"]]):fo(e,ct(e),he(e)||t&&t.name)}function ys(e,t){m.tip.innerHTML="",m.tip.appendChild(e),m.tip.style.display="",m.tip.style.left=m.tip.style.top="0px";const n=8,r=52,o=m.stage.getBoundingClientRect(),a=o.left+n,i=o.right-n,l=m.tip.offsetWidth,c=m.tip.offsetHeight;let u=(g=>Math.max(a,Math.min(g,i-l)))(t.left),p=t.bottom+n;p+c>innerHeight-n&&(t.top-n-c>=r?p=t.top-n-c:(p=Math.max(r,innerHeight-n-c),i-(t.right+n)>=l?u=t.right+n:t.left-n-a>=l&&(u=t.left-n-l))),m.tip.style.left=u+"px",m.tip.style.top=p+"px"}const Wt=()=>m.tip.style.display="none";function mo(e,t){let n=null;e.addEventListener("mouseenter",()=>{oe(n),n=ne(()=>{const r=t();r&&e.matches(":hover")&&ys(r,e.getBoundingClientRect())},280)}),e.addEventListener("mouseleave",()=>{oe(n),Wt()}),e.addEventListener("mousedown",()=>{oe(n),Wt()})}function ws(){if(!v.user?.id)return null;try{const e=localStorage.getItem(`chouka:last-project:${v.user.id}`);return T.find(t=>t.id===e)||null}catch{return null}}function vs(e){if(!(_||!v.active||!v.user?.id))try{localStorage.setItem(`chouka:last-project:${v.user.id}`,e)}catch{}}const Da=(async function(){try{await v.requireUser(),v.mountAccount(d.getElementById("account"));const o=await kt("/api/cards",{cache:"no-store"});A=o.cards,q=o.capabilities,W=o.if_model_limits||{},m.dot.classList.toggle("on",!!o.comfy_online)}catch(o){if(Pe("后端未就绪："+o.message),!v.active)return}if(b.disposed||(await wr(),b.disposed))return;Bs();const t=new URLSearchParams(location.search),n=t.get("project"),r=t.get("card");if(n)await vr(n),_?Cr():r&&s?.id===n&&await Ai({project:n,card:r});else if(_)Cr();else{const o=ws();if(o&&await vr(o.id),!s){const a=T.find(i=>i.locked);a&&await vr(a.id)}}await Ba(),v.every(Ba,5e3),v.every(wr,5e3),pt(),v.every(pt,700)})();async function Ba(){try{const e=await kt("/api/health");m.dot.classList.toggle("on",!!e.comfy_online),e.mode==="controller"&&v.user?.role==="admin"?(m.dot.href=X.adminURL("/controller"),m.dot.title="打开运行面板",m.dot.setAttribute("aria-label","打开运行面板")):(m.dot.removeAttribute("href"),m.dot.title="ComfyUI 连接状态",m.dot.setAttribute("aria-label","ComfyUI 连接状态"))}catch{m.dot.classList.remove("on")}}function Ha(e){return X.projectSpaces(e,v.user?.id,ce)}function ho(){P.update({projects:T,teams:ce,selectedSpace:Le,selectedId:s?.id||null,user:v.user})}async function wr(){if(!(!v.active||b.disposed)){try{const e=await X.projects.list();if(b.disposed)return;T=e.projects,ce=e.teams}catch{return}if(s){const e=T.find(t=>t.id===s.id);if(!e)Fn(),lt.retainProjects(T.map(t=>t.id));else{const t=s.permission!==e.permission;Object.assign(s,{permission:e.permission,owner_id:e.owner_id,owner_display_name:e.owner_display_name,team_id:e.team_id,team_name:e.team_name,share_count:e.share_count,shared_team_ids:e.shared_team_ids,shared_personally:e.shared_personally,name:e.name,locked:e.locked}),t&&(nn(),Xn(),nr())}}pn(),ho()}}const ks=()=>P.create();let Ko=0;async function vr(e){if(s&&s.id!==e&&rn()&&Ye.busy)try{await Yn(s.id)}catch(o){Pe("切换前保存失败，已保留当前画布："+o.message);return}Ye.cancelTimers(),vo();const t=++Ko;try{const o=await X.projects.get(e);if(t!==Ko||!v.active)return;s=o}catch(o){return Pe(o.message)}const n=Ha(s);n.includes(Le)||(Le=n[0]||"personal"),ho(),Ft=null,Ye.resetFailures(),qt=!1,s.cards=s.cards||[],s.edges=s.edges||[],s.groups=s.groups||[];const r=[];for(const o of s.cards){const a=ct(o);if(a&&!a.route&&a.id!==o.cap&&!(a.modelSwitch&&Object.values(a.modelSwitch).includes(o.cap))&&(o.cap=a.id),a&&a.modelSwitch){const i=Object.entries(a.modelSwitch).find(([,l])=>l===o.cap);i&&(o._model=i[0])}Qn(o,s.id)&&r.push(o),!Ge(o)&&!ut(o)&&!ft(o)&&o.status==="queued"&&!o.job&&!o._ifResumePreparing&&(o.status="error",o.error="上次提交未取得任务编号，请先检查任务列表，确认后再重试"),zo(o)}for(const o of s.cards)Ht(o)&&(o.cap!=="text"&&(o.cap="text"),!String((o.params||{}).text||"").trim()&&String(o.out||"").trim()&&(o.params=o.params||{},o.params.text=o.out));if(Go(),N=Object.assign({x:60,y:70,k:1},s.view||{}),se=null,J.clear(),nn(),m.empty.style.display="none",m.dock.style.display="",m.fit.style.display="",m.ptitle.textContent=s.name,d.getElementById("directorbtn").href=`/director?project=${encodeURIComponent(s.id)}`,s.locked){const o=d.createElement("span");o.className="ro",o.textContent="试玩画布 · 刷新还原",o.title="这张画布是示例：参数怎么改、节点怎么拖、重跑几遍都随便，改动只在这一次里有效，刷新就回到原样。想留下自己的东西就「＋ 新建项目」",m.ptitle.appendChild(o)}nr();for(const o of s.cards)Ti(o,s.id);if(r.length&&rn()&&!s.locked)for(const o of r)mn(o,s.id);vs(s.id),Ka(s.id),wr()}function Cs(){ka(),m.empty.style.display="",m.world.innerHTML="",m.wires.innerHTML="",rr?.disconnect(),ko.clear(),m.wires.classList.remove("has-flow"),m.ptitle.textContent="",m.dock.style.display="none",m.fit.style.display="none",m.hint.textContent=""}const go=X.plainCard,Ua=["type","cap","name","x","y","w","h","params","assets","opt"];let Hn=[],bo=[],kr=null,xo=null;function Go(){Hn=[],bo=[],kr=null,xo=null}function Wa(){return{cards:s.cards.map(e=>JSON.parse(JSON.stringify(go(e)))),edges:JSON.parse(JSON.stringify(s.edges)),groups:JSON.parse(JSON.stringify(s.groups||[]))}}function Ja(e){return JSON.stringify({cards:e.cards.map(t=>{const n=Object.fromEntries(Ua.filter(r=>t[r]!==void 0).map(r=>[r,t[r]]));return n.id=t.id,t.type==="card_asset"&&(n.outputs=t.outputs),n}),edges:e.edges,groups:e.groups})}function Zo(e="action"){!s||!fe()||_||kr||(kr=Wa(),xo=e)}function yo(){if(!kr||!s)return;const e=Wa(),t=kr,n=xo;if(kr=null,xo=null,Ja(t)===Ja(e))return;const r=Hn[Hn.length-1];n==="typing"&&r?.kind==="typing"&&Date.now()-r.at<1e3?r.after=e:(Hn.push({before:t,after:e,kind:n,at:Date.now()}),Hn.length>80&&Hn.shift()),bo=[]}function _s(e){const t=new Map(s.cards.map(n=>[n.id,n]));s.cards=e.cards.map(n=>{const r=t.get(n.id);if(!r)return JSON.parse(JSON.stringify(n));const o=r;for(const a of Ua)a in n?o[a]=JSON.parse(JSON.stringify(n[a])):delete o[a];return n.type==="card_asset"&&(o.outputs=JSON.parse(JSON.stringify(n.outputs||[]))),o}),s.edges=JSON.parse(JSON.stringify(e.edges)),s.groups=JSON.parse(JSON.stringify(e.groups)),Jt=null,J=new Set([...J].filter(n=>s.cards.some(r=>r.id===n))),se&&!s.cards.some(n=>n.id===se)&&(se=null,nn()),nr(),se&&ke(se),Q()}function Es(e=!1){if(!s||!fe()||_)return;yo();const t=e?bo:Hn,n=e?Hn:bo,r=t.pop();r&&(n.push(r),_s(e?r.after:r.before))}for(const e of["pointerdown","keydown","beforeinput","paste","drop","change"])d.addEventListener(e,t=>{t.target.closest?.("[data-image-composer]")||!s||_||!fe()||t.type==="keydown"&&(t.ctrlKey||t.metaKey)&&/^(z|y)$/i.test(t.key)||Zo(t.type==="beforeinput"?"typing":"action")},!0);function Hr(){return!qt&&s?.id===K?s.cards.find(e=>e.id===pe):null}function Cr(){if(!_)return;const e=Hr();J.clear(),e?(se=e.id,J.add(e.id),e._el?.classList.add("sel"),ke(e.id)):(se=null,m.panel.replaceChildren(Po("此节点已删除或不可访问；不会重新创建。请返回导演台刷新项目。")),m.panel._id=null,m.panel.style.display="",vt())}_&&(Z.ChoukaNodeEditor={async flush(){if(await Da,!Hr())throw new Error("此节点已删除或不可访问");await Yn(K)},payload(){const e=Hr();if(!e)throw new Error("此节点已删除或不可访问");return Na(e)}});const Xa=["#00e5ff","#ff5da2","#9b7bff","#55e68a","#ffb84d","#58a6ff","#f778ba","#d2e75b"];function Ya(e){let t=0;for(const n of String(e||""))t=t*31+n.codePointAt(0)>>>0;return Xa[t%Xa.length]}function Ss(){if(!m.presenceUsers)return;const e=new Map;for(const n of jt.values())e.has(n.user_id)||e.set(n.user_id,n);if(m.presenceUsers.replaceChildren(),m.presenceUsers.classList.toggle("on",e.size>0),!e.size)return;const t=d.createElement("span");t.className="presence-count",t.textContent=`${e.size} 人使用中`,m.presenceUsers.appendChild(t);for(const n of e.values()){const r=d.createElement("span");r.className="presence-avatar";const o=Ya(n.user_id);r.style.background=o,r.style.boxShadow=`0 0 0 1px ${o}`,r.textContent=String(n.name||"协").trim().slice(0,1).toUpperCase(),r.title=`${n.name||"协作者"} · 正在此画布`,m.presenceUsers.appendChild(r)}}function $s(e){if(!m.presenceLayer||e.connection_id===Sn)return null;let t=e._el;if(t?.isConnected)return t;t=d.createElement("div"),t.className="collab-cursor";const n=Ya(e.user_id);t.style.color=n;const r=d.createElement("div");r.className="pointer";const o=d.createElement("div");o.className="label",o.style.backgroundColor=n;const a=d.createElement("span");return a.textContent=e.name||"协作者",o.appendChild(a),t.append(r,o),m.presenceLayer.appendChild(t),e._el=t,t}function Va(e){if(e.connection_id===Sn){e._el?.remove(),e._el=null;return}const t=$s(e);t&&(t.classList.toggle("hidden",!e.visible),e.visible&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&(t.style.transform=`translate(${e.x}px,${e.y}px) scale(${1/N.k})`))}function Qo(){for(const e of jt.values())Va(e)}function js(e,t,n){if(Number.isFinite(n)&&n<Zt)return;Number.isFinite(n)&&(Zt=n),Sn=t||Sn;const r=new Map;for(const o of e||[]){const a=jt.get(o.connection_id);r.set(o.connection_id,Object.assign(a||{},o))}for(const[o,a]of jt)r.has(o)||a._el?.remove();jt=r,Ss(),Qo()}function Ns(e,t){!s||s.id!==e||t<=(s.rev||0)||kt(`/api/projects/${encodeURIComponent(e)}`).then(n=>wo(n)).catch(()=>{})}function wo(e){if(!s||e.id!==s.id||(e.rev||0)<=(s.rev||0))return;if(_&&!(e.cards||[]).some(o=>o.id===pe)&&(qt=!0,Ye.cancelContentSave(),Cr()),Ye.busy||Et){(!Ft||(e.rev||0)>(Ft.rev||0))&&(Ft=e);return}const t=m.panel.style.display!=="none",n=[],r=new Map(s.cards.filter(o=>Ge(o)&&yn(o,s.id)&&["queued","running"].includes(o.status)&&Number.isFinite(o.if_started)).map(o=>[o.id,o]));s.name=e.name,s.cards=(e.cards||[]).map(o=>{const a=r.get(o.id),i=a&&o.if_started===a.if_started&&o.job===a.job;if(a&&o.cap===a.cap&&(o.if_started||0)<=a.if_started&&!(o.if_started===a.if_started&&o.job&&a.job&&o.job!==a.job)&&!(o.if_started===a.if_started&&o.if_request_id&&a.if_request_id&&o.if_request_id!==a.if_request_id)&&!(i&&["done","error"].includes(o.status))){const l=Object.fromEntries(["params","assets","job","status","step","error","progress","if_started","if_job_cap","if_canvas_url","if_request_id","if_submitted_at","if_pending_prompts","ms","outputs","history","_ifPolling","_ifRecovering","_ifResumePreparing"].map(c=>[c,a[c]]));return Object.assign(a,o,l)}return Qn(o,e.id)&&n.push(o),o}),s.edges=e.edges||[],s.groups=e.groups||[],s.rev=e.rev,s.updated=e.updated,s.director=e.director,Go();for(const o of s.cards)zo(o);se&&!s.cards.some(o=>o.id===se)&&(se=null),J=new Set([...J].filter(o=>s.cards.some(a=>a.id===o))),m.ptitle.textContent=s.name,nr();for(const o of s.cards)r.get(o.id)!==o&&Ti(o,s.id);if(n.length&&rn()&&!s.locked)for(const o of n)mn(o,s.id);_||(t&&se?ke(se):se||nn())}function ea(){if(!Ft||Ye.busy||Et)return;const e=Ft;Ft=null,wo(e)}function vo(){if(oe(ln),ln=null,oe(An),An=null,At=null,st=null,Sn=null,Zt=-1,$t){const e=$t;$t=null;try{e.close(1e3,"leave canvas")}catch{}}for(const e of jt.values())e._el?.remove();jt.clear(),m.presenceLayer?.replaceChildren(),m.presenceUsers?.replaceChildren(),m.presenceUsers?.classList.remove("on")}function Ka(e){vo(),st=e;const t=X.presence(e);$t=t,t.onopen=()=>Ns(e,1/0),t.onmessage=n=>{if(t!==$t||st!==e)return;let r;try{r=X.parsePresence(n.data)}catch{return}if(r.type==="presence")js(r.members,r.self,r.version);else if(r.type==="cursor"){const o=jt.get(r.connection_id);if(!o)return;Object.assign(o,r),Va(o)}else r.type==="card-added"?pa(r.card,r.rev):r.type==="project-changed"?wo(r.project):r.type==="project-deleted"&&(re("这张画布已被删除"),Fn(),wr())},t.onclose=()=>{t===$t&&($t=null,st===e&&s?.id===e&&v.active&&(ln=ne(()=>Ka(e),1500)))}}function Ga(e,t,n=!0){At={type:"cursor",x:e,y:t,visible:n},An===null&&(An=ne(()=>{An=null,$t?.readyState===$.OPEN&&At&&$t.send(X.serializeCursor(At)),At=null},50))}function In(){m.world.style.transform=`translate(${N.x}px,${N.y}px) scale(${N.k})`,m.wires.style.transform=m.world.style.transform,m.groups.style.transform=m.world.style.transform,m.presenceLayer&&(m.presenceLayer.style.transform=m.world.style.transform),typeof Qo=="function"&&Qo(),m.wires.setAttribute("width",1),m.wires.setAttribute("height",1),vn(),Ur(),Ms(),va()}function Ms(){m.zoomPercent&&(m.zoomPercent.textContent=Math.round(N.k*100)+"%")}function wn(e,t){const n=m.stage.getBoundingClientRect();return{x:(e-n.left-N.x)/N.k,y:(t-n.top-N.y)/N.k}}let _r=!1;function Ur(){if(!_r||!s||!s.cards.length)return;const e=m.minimapCanvas,t=e.getContext("2d"),n=200,r=150;e.width=n,e.height=r;let o=1/0,a=1/0,i=-1/0,l=-1/0;for(const M of s.cards){const G=Be(M),Xe=M._el?M._el.offsetHeight:200;o=Math.min(o,M.x),a=Math.min(a,M.y),i=Math.max(i,M.x+G),l=Math.max(l,M.y+Xe)}const c=50;o-=c,a-=c,i+=c,l+=c;const f=i-o,u=l-a,p=Math.min(n/f,r/u);t.fillStyle="#070707",t.fillRect(0,0,n,r),t.fillStyle="#f3f4f6",t.strokeStyle="#f3f4f6",t.lineWidth=1;for(const M of s.cards){const G=(M.x-o)*p,Xe=(M.y-a)*p,it=Be(M)*p,Ke=(M._el?M._el.offsetHeight:200)*p;t.fillRect(G,Xe,it,Ke),t.strokeRect(G,Xe,it,Ke)}const g=m.stage.getBoundingClientRect(),h=(-N.x/N.k-o)*p,x=(-N.y/N.k-a)*p,w=g.width/N.k*p,y=g.height/N.k*p;m.minimapViewport.style.left=h+"px",m.minimapViewport.style.top=x+"px",m.minimapViewport.style.width=w+"px",m.minimapViewport.style.height=y+"px",m.minimap._scale=p,m.minimap._minX=o,m.minimap._minY=a}function zs(){_r=!_r,m.minimap.style.display=_r?"":"none",m.minimapBtn.classList.toggle("active",_r),_r&&Ur()}function Ls(){let e=!1;const t=(n,r)=>{if(!e)return;const o=m.minimap.getBoundingClientRect(),a=n-o.left,i=r-o.top,l=m.minimap._scale||1,c=m.minimap._minX||0,f=m.minimap._minY||0,u=a/l+c,p=i/l+f,g=m.stage.getBoundingClientRect();N.x=-u*N.k+g.width/2,N.y=-p*N.k+g.height/2,In(),vt(),Qt()};m.minimapViewport.addEventListener("mousedown",n=>{n.preventDefault(),e=!0}),m.minimap.addEventListener("mousedown",n=>{n.target!==m.minimapViewport&&(n.preventDefault(),e=!0,t(n.clientX,n.clientY))}),I("mousemove",n=>{e&&t(n.clientX,n.clientY)}),I("mouseup",()=>{e=!1})}function nr(){ka(),m.world.innerHTML="";const e=d.createDocumentFragment();for(const t of s.cards)e.appendChild(ta(t));m.world.appendChild(e),In(),Qe(),$r(),m.hint.textContent=`${s.cards.length} 个节点`,Ur(),_&&Cr()}const Za=e=>(q[Ut(e)]||ge(e)||St(e)||{}).outputType||"image",Qa=e=>{const t=ct(e);return!!(t&&t.route)&&!Object.values(e.assets||{}).some(Boolean)};function Er(e){return ht(e)?'<span class="ph">🎨</span>':Ht(e)?'<span class="ph">✍</span>':ft(e)?'<span class="ph">📎</span>':`<span class="ph">${Qa(e)?"🖼🎬":Za(e)==="video"?"🎬":"🖼"}</span>`}const Ps="button,input,textarea,select,audio,.vprog,.cmp,.rz,.port,.inport";function ta(e){const t=St(e),n=d.createElement("div");n.className="card"+(se===e.id?" sel":""),n.dataset.id=e.id,n.style.left=e.x+"px",n.style.top=e.y+"px",n.innerHTML=`
    <div class="ch"><span>${t?t.icon:"▪"}</span><span class="t"></span><button class="x" type="button" title="删除" aria-label="删除节点">✕</button></div>
    <div class="body">${Er(e)}</div>
    <div class="bar"><i></i></div>
    <div class="cf"><span class="kt"></span><span class="st"></span><span class="meta" style="margin-left:auto"></span></div>
    <div class="rz tl" title="拖动改大小（按住 Shift 只改宽）"></div>
    <div class="rz br" title="拖动改大小（按住 Shift 只改宽）"></div>
    <div class="inport"></div>
    <div class="port" title="${ft(e)?"拖到别的节点上 → 这份素材就进它的格子":"拖到空白处 → 用本节点产物新建下游节点"}"></div>`,e._el=n,Tn(e),Kt(e);const r=n.querySelector(".ch .x");return r.onmousedown=o=>o.stopPropagation(),r.onclick=o=>{o.stopPropagation(),xi(e)},n.querySelector(".rz.tl").onmousedown=o=>pi(o,e,n,-1),n.querySelector(".rz.br").onmousedown=o=>pi(o,e,n,1),n.querySelector(".port").onmousedown=o=>Ds(o,e),n.onmousedown=o=>{if(!(o.button===1||o.button===0&&o.shiftKey)){if(o.button===0&&!o.target.closest(Ps))return qs(o,e);o.stopPropagation(),!(o.button===2&&J.has(e.id)&&s.cards.filter(a=>J.has(a.id)).length>1)&&Ot(e.id)}},n.oncontextmenu=o=>{o.stopPropagation(),o.preventDefault(),Wt(),!(J.has(e.id)&&ii(o.clientX,o.clientY))&&(Ot(e.id),Xs(o.clientX,o.clientY,e))},n.ondblclick=o=>{const a=o.target.closest(".body");if(!(!a||ut(e))&&!(ft(e)&&!hn(e))&&!o.target.closest(".vprog")){if(o.target.matches("audio")){const i=o.target.getBoundingClientRect();if(o.clientY>i.bottom-34*N.k)return}for(const i of a.querySelectorAll("video"))ir(i),i.pause();Vr(e,+(o.target.dataset.i||0))}},Is(n.querySelector(".body")),Rs(n.querySelector(".body"),e),mo(n,()=>xs(e)),n.onclick=o=>{!ft(e)||hn(e)||o.target.closest(".body")&&To(e)},rt(e),n}let Sr=null;d.addEventListener("play",e=>{if(!(e.target.paused||!e.target.isConnected)){for(const t of d.querySelectorAll("video, audio"))t!==e.target&&(ir(t),t.pause());Sr=e.target}},!0),d.addEventListener("pause",e=>{Sr===e.target&&(Sr=null)},!0),d.addEventListener("mousedown",e=>{for(const n of d.querySelectorAll("video"))n._playRequest&&!n.closest(".body, .vbox")?.contains(e.target)&&ir(n);if(!Sr)return;const t=Sr.closest(".body, .vbox, .arange");(!t||!t.contains(e.target))&&Sr.pause()},!0);function Is(e){const t=(n,r,o)=>{if(!isFinite(n.duration)||!n.duration)return;const a=o.getBoundingClientRect();n.currentTime=Math.min(Math.max((r-a.left)/a.width,0),1)*n.duration};e.onmousedown=n=>{if(n.button!==0)return;const r=n.target.closest(".vprog");if(r){const c=e.querySelector("video");if(!c)return;n.stopPropagation(),n.preventDefault();const f=!c.paused;c.pause(),t(c,n.clientX,r);const u=g=>t(c,g.clientX,r),p=()=>{d.removeEventListener("mousemove",u),d.removeEventListener("mouseup",p),f&&c.play().catch(()=>{})};d.addEventListener("mousemove",u),d.addEventListener("mouseup",p);return}const o=n.target.closest("video");if(!o)return;const a=n.clientX,i=n.clientY,l=c=>{d.removeEventListener("mouseup",l),!(Math.abs(c.clientX-a)+Math.abs(c.clientY-i)>=4)&&(o._previewController?ir(o):o.paused?il(o):(ir(o),o.pause()))};d.addEventListener("mouseup",l)},e.addEventListener("timeupdate",n=>{const r=e.querySelector(".vprog i"),o=n.target;!r||!isFinite(o.duration)||!o.duration||(r.style.width=o.currentTime/o.duration*100+"%")},!0)}function Tn(e){const t=e._el;if(!t)return;t.style.width=Be(e)+"px";const n=t.querySelector(".body");n.style.height=e.h&&!n.classList.contains("grid")?e.h+"px":""}function Wr(e){const t=e._el;if(!t)return;let n=t.querySelector(".composite-inputs");if(e.cap!=="image_composite"){n?.remove();return}const r=(ge(e)?.inputs||[]).filter(f=>f.type==="image"),o=new Set((s?.edges||[]).filter(f=>f.to===e.id&&!Ze(f)).flatMap(gn)),a=r.filter(f=>e.assets?.[f.key]||o.has(f.key)),i=JSON.stringify(a.map(f=>[f.key,e.assets?.[f.key],o.has(f.key)]));if(n?.dataset.signature===i)return;n||(n=d.createElement("div"),n.className="composite-inputs",t.querySelector(".body").after(n)),n.dataset.signature=i,n.replaceChildren();const l=d.createElement("div");if(l.className="composite-input-label",l.textContent=`引用图片 · ${a.length}/${r.length}`,n.append(l),!a.length){const f=d.createElement("div");f.className="composite-input-hint",f.textContent="从图片节点连线，或在编辑器中上传图片",n.append(f);return}const c=d.createElement("div");c.className="composite-input-list",n.append(c);for(const f of a){const u=e.assets?.[f.key],p=d.createElement("button");if(p.type="button",p.dataset.compositeReference=f.key,p.title=`${f.label} · ${u?.origin||u?.filename||(u?"查看引用图片":"正在导入")}`,p.setAttribute("aria-label",p.title),p.disabled=!u?.url,u?.url){const h=d.createElement("img");h.src=Ei(u.url)||u.url,h.alt=f.label,h.loading="lazy",h.draggable=!1,p.append(h),p.onmousedown=x=>x.stopPropagation(),p.onclick=x=>{x.stopPropagation(),to(u)}}const g=d.createElement("span");g.textContent=u?f.label:"导入中",p.append(g),c.append(p)}}function rt(e){const t=e._el;if(!t)return;Wr(e);const n=t.querySelector(".body"),r=t.querySelector(".st"),o=t.querySelector(".meta"),a=t.querySelector(".bar i");if(ht(e)){const h=String((e.params||{}).style||"").trim();if(n.classList.remove("grid"),n.classList.add("sbody"),Tn(e),n.textContent="",h){const M=d.createElement("div");M.className="stx",M.textContent=h,n.appendChild(M)}else n.innerHTML=Er(e)+'<div class="sempty">在旁边的面板里写一段风格，再把出口拖到生图/生视频节点上</div>';const x=t.querySelector(".port");x&&(x.title="拖到生图/生视频节点上 → 那个节点套用这段风格（拖到空白处会列出所有能挂的玩法）");const w=(s?s.edges:[]).filter(M=>M.from===e.id&&Ze(M)).length,y=Re(e).length;r.className="st",r.textContent=h?"":"还没写",o.textContent=w?`挂了 ${w} 个节点`+(y?` · 连带下游 ${y} 张`:""):"还没挂节点",a.style.width="0%";return}if(Ht(e)){const h=e.status==="running";n.classList.remove("grid"),n.classList.add("sbody"),Tn(e),n.textContent="";const x=d.createElement("textarea");if(x.className="ttxt",x.spellcheck=!1,x.value=String((e.params||{}).text||""),x.placeholder=h?"正在加工，稍等…":"在这里写字；选好加工方式点「↑ 运行」，加工结果就落在这个框里 —— 可以直接改",x.disabled=h,x.oninput=()=>{e.params=e.params||{},e.params.text=x.value;const w=d.querySelector("#panel"),y=w?w.querySelector("textarea"):null;y&&y.placeholder==="在这里写字或直接在节点上写"&&(y.value=x.value),na(e),Q()},n.appendChild(x),h){const w=d.createElement("div");w.className="load cover",n.appendChild(w)}na(e);return}const i=e.outputs||[],l=i[0],c=Ts(e),f=i.map(h=>h.url).join("|")+(c?"|<"+c:""),u=e.status==="queued"||e.status==="running";if(u&&n.dataset.url!=="busy"?(n.dataset.url="busy",n.classList.remove("grid"),Tn(e),n.innerHTML='<div class="load"></div>'):!u&&!i.length&&n.dataset.url==="busy"?(n.dataset.url="",n.innerHTML=Er(e)):ft(e)&&!i.length&&n.dataset.url&&(n.dataset.url="",n.classList.remove("grid"),n.innerHTML=Er(e)),!u&&i.length&&n.dataset.url!==f&&(n.dataset.url=f,n.classList.toggle("grid",i.length>1),Tn(e),i.length>1?(n.style.setProperty("--cols",i.length<=4?2:i.length<=9?3:4),n.innerHTML=i.map((h,x)=>h.kind==="video"?`<video data-video-url="" data-i="${x}" loop preload="none" draggable="false"></video>`:`<img data-i="${x}" alt="" draggable="false">`).join("")):n.innerHTML=l.kind==="video"?'<video data-video-url="" data-i="0" loop preload="none" draggable="false"></video><div class="vprog" title="按住左右拖 → 定位进度（画面上按住是挪节点）"><i></i></div>':l.kind==="audio"?'<audio preload="none" controls style="width:92%"></audio>':c?'<div class="cmp" title="按住左右拖：跟原图对比，看边缘抠干净了没有"><img class="new" alt="" draggable="false" data-i="0"><img class="old" alt="" draggable="false"><div class="cmpx"><i>⇔</i></div><div class="cmptip">按住往右拖 → 回到原图</div></div>':'<img data-i="0" alt="" draggable="false">',al(n,i,c),c&&ei(e),!ut(e)&&!ft(e)))for(let h=0;h<i.length;h++){const x=i[h];if(x.kind==="image"&&!x.width){const w=n.querySelector(`img[data-i="${h}"]`)||n.querySelector("img");if(w&&!w.dataset.thumbnail){const y=()=>{!t.isConnected||e._el!==t||!s?.cards.includes(e)||e.outputs?.[h]!==x||!w.naturalWidth||(x.width=w.naturalWidth,x.height=w.naturalHeight,zt(e),Q())};w.complete&&w.naturalWidth?y():w.onload=y}}else if(x.kind==="video"&&!x.width){const w=n.querySelector(`video[data-i="${h}"]`)||n.querySelector("video");w&&w.readyState>=1?(x.width=w.videoWidth,x.height=w.videoHeight,zt(e),Q()):w&&(w.onloadedmetadata=()=>{!t.isConnected||e._el!==t||!s?.cards.includes(e)||e.outputs?.[h]!==x||(x.width=w.videoWidth,x.height=w.videoHeight,zt(e),Q())})}}if(ft(e)){r.className="st"+(l?" done":""),r.textContent=l?"已就绪":"点节点选文件",r.title=l?"把右边的出口拖到别的节点 → 这份素材就进那个节点的格子里":r.textContent,a.style.width="0%",o.textContent=l?String(l.filename||l.origin||l.url||"").split(/[\\/]/).pop().slice(-22):"",o.title=l&&l.origin||"";return}const p=e.status;r.className="st"+(p==="running"||p==="queued"?" run":p==="done"?" done":p==="error"?" err":""),r.textContent=p==="queued"?Ge(e)&&e.step?e.step:e.job?Yi(e):"正在提交…":p==="running"?(Ge(e)&&!(e.progress>0)?"生成中":`生成中 ${Math.round((e.progress||0)*100)}%`)+(e.step?` · ${e.step}`:""):p==="done"?sr(e.ms)?`已完成 · ${sr(e.ms)}`:"已完成":p==="error"?"失败":p==="canceled"?"已取消":e.cap==="image_composite"?"待合成":"待生成",r.title=r.textContent,a.style.width=(p==="running"||p==="queued"?Ge(e)&&!(e.progress>0)?0:(e.progress||.02)*100:p==="done"?100:0)+"%",o.textContent=e.error?String(e.error).slice(0,40):i.length>1?`${i.length} 张`:l?String(l.filename||l.origin||l.url||"").split(/[\\/]/).pop().slice(-22):"",o.title=e.error||"";const g=gr(e);g&&o.replaceChildren(g)}function na(e){const t=e._el;if(!t)return;const n=t.querySelector(".st"),r=t.querySelector(".meta"),o=t.querySelector(".bar i"),a=k(e),i=e.status==="running",l=en(e),c=t.querySelector(".port");c&&(c.title="拖到生成节点上 → 并进它的提示词；拖到另一个文本节点上 → 当那段加工的输入（拖到空白处会列出能接的地方）");const f=(s?s.edges:[]).filter(g=>g.from===e.id&&Ze(g)).length,u=R(e).length;n.className="st"+(i?" run":e.status==="error"?" err":a&&e.status==="done"?" done":""),i?n.textContent="处理中…":a?n.textContent=e.status==="error"?"失败":e.status==="done"?sr(e.ms)?`已完成 · ${sr(e.ms)}`:"已完成":"待运行":n.textContent=l?"":"还没写",n.title=n.textContent;const p=[];a&&p.push(`输入 ${u} 段`),f&&p.push(`连 ${f} 个节点`),r.textContent=p.join(" · "),r.title=e.error||"",o.style.width=i?"40%":e.status==="done"?"100%":"0%"}function Ts(e){const t=q[Ut(e)];if(!t||!t.compare||t.card==="image")return null;const n=e.outputs||[];if(n.length!==1||n[0].kind!=="image")return null;const r=(t.inputs||[]).find(a=>a.type==="image"),o=r&&(e.assets||{})[r.key];return o&&o.kind==="image"?o.url:null}function ei(e){const t=e._el&&e._el.querySelector(".cmp");if(!t)return;const n=e._cmp==null?0:e._cmp;t.style.setProperty("--x",n*100+"%"),t.classList.toggle("dragged",e._cmp!=null)}function Rs(e,t){e.addEventListener("mousedown",n=>{if(n.button!==0)return;const r=n.target.closest(".cmp");if(!r)return;n.preventDefault();const o=l=>{const c=r.getBoundingClientRect();t._cmp=Math.min(Math.max((l-c.left)/c.width,0),1),ei(t)};o(n.clientX);const a=l=>o(l.clientX),i=()=>{d.removeEventListener("mousemove",a),d.removeEventListener("mouseup",i)};d.addEventListener("mousemove",a),d.addEventListener("mouseup",i)})}const at=e=>(s?s.cards:[]).find(t=>t.id===e)||null;function ti(e,t,n,r=!0){if(!t||!n||n.length<=1)return t?[t]:[];const o=/^(\w+)\[(\d+)\]$/.exec(t),a=e&&ge(e);if(!o||!a)return[t];const i=o[1],l=+o[2],c=n[0]&&n[0].kind,f=r?new Set((s?.edges||[]).filter(p=>p.to===e.id&&!Ze(p)).flatMap(gn)):null,u=(a.inputs||[]).filter(p=>{const g=new RegExp(`^${i}\\[(\\d+)\\]$`).exec(p.key);return g&&+g[1]>=l&&(!c||p.type===c)&&(!r||!(e.assets||{})[p.key]&&!f.has(p.key))}).sort((p,g)=>parseInt(/\[(\d+)\]/.exec(p.key)[1],10)-parseInt(/\[(\d+)\]/.exec(g.key)[1],10)).slice(0,n.length).map(p=>p.key);return u.length?u:[t]}function gn(e){if(!e||Ze(e))return[];if(Array.isArray(e.slots))return[...new Set(e.slots.filter(Boolean))];const t=at(e.from),n=at(e.to),r=t&&t.outputs||[],o=t&&t.history&&t.history[0]&&t.history[0].outputs||[];return ti(n,e.slot,r.length?r:o,!1)}function ra(e){const t=at(e&&e.to);if(!t||!t.assets)return!1;let n=!1;for(const r of gn(e))r in t.assets&&(delete t.assets[r],n=!0);return n&&(Bn(t),zt(t)),n}function Un(e,t=!0){const n=new Set(e||[]);if(!n.size)return!1;if(t)for(const r of n)ra(r);s.edges=s.edges.filter(r=>!n.has(r));for(const r of new Set([...n].map(o=>o.to))){const o=at(r);o&&Wr(o)}return!0}function ni(e,t){const n=[];let r=!1;for(const o of s.edges){if(o.to!==e||Ze(o))continue;const a=gn(o);if(!a.includes(t))continue;const i=a.filter(l=>l!==t);r=!0,i.length?(o.slots=i,o.slot===t&&(o.slot=i[0])):n.push(o)}return Un(n,!1),r}function oa(e){const t=at(e);if(!t)return null;const n=t._el?t._el.offsetHeight:230;return{x:t.x,y:t.y,w:Be(t),h:n}}let Jt=null,rr=null;const ko=new Map;function Os(e,t){const n=new Set(e.cards.map(i=>i.id)),r=new Map,o=new Map;for(const i of e.edges)!n.has(i.from)||!n.has(i.to)||(r.has(i.to)||r.set(i.to,[]),o.has(i.from)||o.set(i.from,[]),r.get(i.to).push(i),o.get(i.from).push(i));const a=(i,l)=>{const c=new Set,f=new Set,u=[...t].filter(p=>n.has(p));for(;u.length;){const p=u.pop();if(!f.has(p)){f.add(p);for(const g of i.get(p)||[])c.add(g),u.push(g[l])}}return c};return{upstream:a(r,"from"),downstream:a(o,"to")}}function ri(e){if(Ze(e))return!1;const t=at(e.from),n=at(e.to);return!!(t&&n&&!ut(t)&&ue(t).length&&!le(n).length)}function aa(e){const t=at(e.from),n=at(e.to),r=o=>o?he(o):"?";return Ze(e)?e.slot===Dn?`文本：${r(t)} → ${r(n)}`:`风格：${r(t)} → ${r(n)}`:`${r(t)} → ${r(n)}${e.version?`（固定分镜版本 · ${e.version.job} · 第 ${e.version.index+1} 张）`:""}`}function oi(){rr?.disconnect();const e=Jt||_?[]:J.size?[...J]:se?[se]:[],{upstream:t,downstream:n}=s&&e.length?Os(s,e):{upstream:new Set,downstream:new Set};m.wires.classList.toggle("has-flow",!!(t.size||n.size));const r=t.size||n.size;if(r||m.wires.querySelector("defs")?.remove(),r&&!m.wires.querySelector("defs")){const o=d.createElementNS(Y,"defs");for(const a of["up","down","both"]){const i=d.createElementNS(Y,"marker");for(const[c,f]of Object.entries({id:`wire-arrow-${a}`,class:`flow-${a}`,viewBox:"0 0 10 8",refX:9,refY:4,markerWidth:10,markerHeight:8,markerUnits:"userSpaceOnUse",orient:"auto"}))i.setAttribute(c,f);const l=d.createElementNS(Y,"polygon");l.setAttribute("points","0,0 9,4 0,8 2.5,4"),i.append(l),o.append(i)}m.wires.append(o),rr||(rr=new ae(a=>{for(const i of a)i.target.classList.toggle("in-view",i.isIntersecting)},{root:m.stage,rootMargin:"80px"}))}for(const[o,a]of ko){const i=t.has(o)?n.has(o)?"both":"up":n.has(o)?"down":"";if(a.line.classList.toggle("sel",o===Jt),a.line.classList.toggle("related",!!i),a.carry?.classList.toggle("related",!!i),!i){a.flow?.remove(),a.flow=null;continue}a.flow||(a.flow=d.createElementNS(Y,"path"),a.flow.setAttribute("d",a.line.getAttribute("d")),a.flow.setAttribute("aria-hidden","true"),a.flow.classList.add("flow"),m.wires.append(a.flow)),a.flow.classList.remove("flow-up","flow-down","flow-both"),a.flow.classList.add(`flow-${i}`),a.flow.setAttribute("marker-end",`url(#wire-arrow-${i})`),rr.observe(a.flow)}}function Qe(e=!0){if(!e){oi(),vn();return}if(rr?.disconnect(),ko.clear(),m.wires.innerHTML="",!s){m.wires.classList.remove("has-flow"),vn();return}for(const t of s.edges){const n=oa(t.from),r=oa(t.to);if(!n||!r)continue;const o=n.x+n.w,a=n.y+n.h/2,i=r.x,l=r.y+r.h/2,c=Math.max(50,Math.abs(i-o)*.5),f=`M${o},${a} C${o+c},${a} ${i-c},${l} ${i},${l}`,u=w=>{const y=d.createElementNS(Y,"path");return w&&y.setAttribute("class",w),y.setAttribute("d",f),m.wires.appendChild(y),y},p=u("hit"),g=d.createElementNS(Y,"title");g.textContent=aa(t)+(ri(t)?"（风格也顺着这根线往下传）":"")+"　点一下选中，Delete 删除",p.appendChild(g),p.addEventListener("mousedown",w=>{w.stopPropagation(),di(t)}),p.addEventListener("contextmenu",w=>{w.preventDefault(),w.stopPropagation(),di(t),Fs(w.clientX,w.clientY,t)});const h=u(Ze(t)?"txt":""),x=ri(t)?u("carry"):null;ko.set(t,{line:h,carry:x,flow:null})}oi(),vn(),$r()}function Co(e){return{x:e.x,y:e.y,w:Be(e),h:e._el?e._el.offsetHeight:230}}function ia(e=te,t=230){const n=m.stage.getBoundingClientRect(),r=wn((n.left+n.right)/2,(n.top+n.bottom)/2),o=r.x-e/2,a=r.y-t/2,i=24,l=(s?s.cards:[]).map(Co),c=(u,p)=>!l.some(g=>u<g.x+g.w+i&&u+e+i>g.x&&p<g.y+g.h+i&&p+t+i>g.y);if(c(o,a))return{x:Math.round(o),y:Math.round(a)};const f=64;for(let u=1;u<=24;u++)for(const[p,g]of[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const h=o+p*u*f,x=a+g*u*f;if(c(h,x))return{x:Math.round(h),y:Math.round(x)}}return{x:Math.round(o),y:Math.round(a)}}function ai(e){let t=1/0,n=1/0,r=-1/0,o=-1/0;for(const a of e){const i=at(a);if(!i)continue;const l=Co(i);t=Math.min(t,l.x),n=Math.min(n,l.y),r=Math.max(r,l.x+l.w),o=Math.max(o,l.y+l.h)}return t===1/0?null:{x:t,y:n,w:r-t,h:o-n}}function As(e){if(!s||!Fe()||!["left","right","top","bottom","center"].includes(e))return;const t=s.cards.filter(y=>J.has(y.id)).map((y,M)=>({c:y,index:M,...Co(y)}));if(t.length<2)return;const n=Math.min(...t.map(y=>y.x)),r=Math.min(...t.map(y=>y.y)),o=Math.max(...t.map(y=>y.x+y.w)),a=Math.max(...t.map(y=>y.y+y.h)),i=e==="left"||e==="right"||e==="center",l=new Map(t.map(y=>[y.c.id,y])),c=new Map(t.map(y=>[y.c.id,new Set])),f=new Map(t.map(y=>[y.c.id,new Set])),u=new Map(t.map(y=>[y.c.id,0]));for(const y of s.edges)y.from===y.to||!l.has(y.from)||!l.has(y.to)||(c.get(y.from).add(y.to),c.get(y.to).add(y.from),f.get(y.from).has(y.to)||(f.get(y.from).add(y.to),u.set(y.to,u.get(y.to)+1)));const p=new Set,g=[],h=(y,M)=>y.x-M.x||y.y-M.y||y.index-M.index;for(const y of t){if(p.has(y.c.id))continue;const M=[],G=[y.c.id];p.add(y.c.id);for(let Ke=0;Ke<G.length;Ke++){const Oe=G[Ke];M.push(l.get(Oe));for(const gt of c.get(Oe))p.has(gt)||(p.add(gt),G.push(gt))}const Xe=new Set(M),it=[];for(;Xe.size;){const Ke=[...Xe].filter(gt=>u.get(gt.c.id)===0),Oe=(Ke.length?Ke:[...Xe]).sort(h)[0];Xe.delete(Oe),it.push(Oe);for(const gt of f.get(Oe.c.id))u.set(gt,u.get(gt)-1)}g.push({items:it,x:Math.min(...M.map(Ke=>Ke.x)),y:Math.min(...M.map(Ke=>Ke.y)),w:M.reduce((Ke,Oe)=>Ke+Oe.w,0)+24*(M.length-1),h:Math.max(...M.map(Ke=>Ke.h))})}g.sort((y,M)=>i?y.y-M.y||y.x-M.x:y.x-M.x||y.y-M.y);let x=i?r:n;const w=[];for(const y of g){let M=i?e==="left"?n:e==="right"?o-y.w:(n+o-y.w)/2:x;const G=i?x:e==="top"?r:a-y.h;for(const Xe of y.items)w.push({...Xe,nx:M,ny:e==="bottom"?G+y.h-Xe.h:G}),M+=Xe.w+24;x+=(i?y.h:y.w)+24}if(w.some(y=>Math.abs(y.nx-y.x)>1e-7||Math.abs(y.ny-y.y)>1e-7)){for(const{c:y,nx:M,ny:G}of w)y.x=M,y.y=G,y._el&&(y._el.style.left=M+"px",y._el.style.top=G+"px");Qe(),vt(),Ur(),Q()}}function ii(e,t){if(!fe()||!s)return!1;const n=s.cards.filter(a=>J.has(a.id));if(n.length<2)return!1;const r=s,o=[["left","左对齐"],["right","右对齐"],["top","顶部对齐"],["bottom","底部对齐"],["center","垂直居中对齐"]].map(([a,i])=>({text:i,run:()=>{s===r&&As(a)}}));return Mt(e,t,"选中节点",[{text:"对齐方式",children:o},{text:`复制选中节点（${n.length} 个）`,run:()=>{s===r&&or()}},{text:`批量重命名（${n.length} 个节点）`,run:()=>{if(s!==r||!fe())return;const a=s.cards.filter(i=>J.has(i.id));a.length>1&&da(a[0])}},{text:`批量删除（${n.length} 个节点）`,danger:!0,run:()=>{s!==r||!fe()||s.cards.filter(a=>J.has(a.id)).length>1&&sa()}}]),!0}function vn(){if(!m.groups)return;let e=m.groups.querySelector(".selbox");if(!J.size){e&&e.remove(),m.selbar.style.display="none";return}const t=ai(J);if(!t)return J.clear(),vn();if(e||(e=d.createElement("div"),e.className="selbox",m.groups.appendChild(e)),e.style.left=t.x-8+"px",e.style.top=t.y-8+"px",e.style.width=t.w+16+"px",e.style.height=t.h+16+"px",J.size<2){m.selbar.style.display="none";return}m.selbar.style.display="";const n=m.stage.getBoundingClientRect(),r=N.x+t.x*N.k,o=N.y+t.y*N.k;m.selbar.style.left=Math.max(4,Math.min(r,n.width-m.selbar.offsetWidth-4))+"px",m.selbar.style.top=Math.max(50,o-m.selbar.offsetHeight-10)+"px"}function $r(){if(m.groups&&(m.groups.querySelectorAll(".ggroup").forEach(e=>e.remove()),!!s))for(const e of s.groups||[]){const t=ai(e.cards);if(!t)continue;const n=12,r=28,o=d.createElement("div");o.className="ggroup",o.style.left=t.x-n+"px",o.style.top=t.y-r+"px",o.style.width=t.w+n*2+"px",o.style.height=t.h+n+r+"px";const a=d.createElement("div");a.className="gglabel",a.textContent=`${e.name}（${e.cards.length}）`,o.appendChild(a),o.onmousedown=i=>{i.button===0&&(i.stopPropagation(),i.preventDefault(),J=new Set(e.cards),Jt=null,Qe(!1),li(i,[...e.cards].map(at).filter(Boolean)))},a.ondblclick=i=>{i.stopPropagation(),si(e)},o.oncontextmenu=i=>{i.preventDefault(),i.stopPropagation(),Mt(i.clientX,i.clientY,e.name,[{icon:"✎",text:"重命名",run:()=>si(e)},{icon:"✕",text:"删除组（节点保留）",danger:!0,run:()=>{Fe()&&(s.groups=s.groups.filter(l=>l!==e),$r(),Q())}}])},m.groups.appendChild(o)}}function si(e){if(!Fe())return;const t=prompt("组名",e.name);t!==null&&(e.name=t.trim().slice(0,30)||e.name,$r(),Q())}function li(e,t,n){if(!fe()||e.button!==0||!t.length)return;e.stopPropagation(),e.preventDefault(),Wt();const r={mx:e.clientX,my:e.clientY,pos:t.map(l=>({c:l,x:l.x,y:l.y}))};let o=!1;const a=l=>{if(!o&&Math.abs(l.clientX-r.mx)+Math.abs(l.clientY-r.my)<4)return;o||(o=!0);const c=(l.clientX-r.mx)/N.k,f=(l.clientY-r.my)/N.k;for(const u of r.pos)u.c.x=Math.round(u.x+c),u.c.y=Math.round(u.y+f),u.c._el&&(u.c._el.style.left=u.c.x+"px",u.c._el.style.top=u.c.y+"px");Qe(),vt()},i=()=>{d.removeEventListener("mousemove",a),d.removeEventListener("mouseup",i),o?(vt(),Q()):n&&n()};d.addEventListener("mousemove",a),d.addEventListener("mouseup",i)}function sa(){if(!Fe())return;const e=s,t=[...J].map(at).filter(Boolean);if(!t.length)return;const n=t.filter(o=>(o.history||[]).length||(o.outputs||[]).length).length;if(!confirm(`删除选中的 ${t.length} 个节点？
`+(n?`其中 ${n} 个节点有历史记录或产物。
`:"")+"相关连线和节点内记录会一并移除，此操作不能撤销；不会删除素材文件。")||s!==e||!fe())return;const r=bi(t.map(o=>o.id));r&&re(`已删除 ${r} 个节点`)}function di(e){Jt=e,se=null,kn(),Wt(),nn();for(const t of s.cards)t._el&&t._el.classList.remove("sel");Qe(),re(aa(e)+" · Delete 删除")}function Fs(e,t,n){const r=at(n.from),o=at(n.to);Mt(e,t,aa(n),[...r?[{icon:"◧",text:`选中上游「${he(r)}」`,run:()=>Ot(r.id)}]:[],...o?[{icon:"◨",text:`选中下游「${he(o)}」`,run:()=>Ot(o.id)}]:[],{icon:"✕",text:n.slot===Dn?"断开这段文本":Ze(n)?"解除这个风格节点":"删除连线",danger:!0,run:()=>Jr(n)}])}function Jr(e){if(!Fe())return;const t=!Ze(e)&&ra(e);Un([e],!1),Jt===e&&(Jt=null),Qe(),Rt(),se&&ke(se),Q(),re(e.slot===Dn?"已断开这段文本输入":Ze(e)?"已解除风格":t?"已删除连线，并清除下游引用":"已删除连线")}function Ot(e){se=e,J.clear(),Jt=null,Qe(!1);for(const t of s.cards)t._el&&t._el.classList.toggle("sel",t.id===e);zr(e),ke(e)}function qs(e,t,n){if(!fe()){e.stopPropagation(),Ot(t.id);return}if(e.button!==0)return;const r=J.has(t.id)&&s.cards.filter(a=>J.has(a.id)).length>1;let o=r?[...J]:null;if(!o){const a=new Set;for(const i of s.groups||[])i.cards.includes(t.id)&&i.cards.forEach(l=>a.add(l));a.size>1&&(o=[...a])}r?kn():Ot(t.id),li(e,o?o.map(at).filter(Boolean):[t],r?()=>Ot(t.id):void 0)}function pi(e,t,n,r){if(!Fe()||e.button!==0)return;e.stopPropagation(),e.preventDefault(),Wt(),Ot(t.id);const o=n.querySelector(".body"),a={mx:e.clientX,my:e.clientY,x:t.x,y:t.y,w:Be(t),h:t.h||o.offsetHeight,ch:n.offsetHeight},i=(u,p,g)=>Math.max(p,Math.min(g,Math.round(u)));let l=!1;const c=u=>{!l&&Math.abs(u.clientX-a.mx)+Math.abs(u.clientY-a.my)<3||(l||(l=!0),t.w=i(a.w+(u.clientX-a.mx)/N.k*r,we,ze),u.shiftKey||(t.h=i(a.h+(u.clientY-a.my)/N.k*r,je,qe)),Tn(t),r<0&&(t.x=a.x+(a.w-t.w),t.y=a.y+(a.ch-n.offsetHeight),n.style.left=t.x+"px",n.style.top=t.y+"px"),Qe(),vt())},f=()=>{d.removeEventListener("mousemove",c),d.removeEventListener("mouseup",f),l&&(vt(),Q())};d.addEventListener("mousemove",c),d.addEventListener("mouseup",f)}function Ds(e,t){if(e.button!==0||!Fe())return;e.stopPropagation(),e.preventDefault(),Wt();const n=oa(t.id),r=d.createElementNS(Y,"path");r.setAttribute("class","tmp"),m.wires.appendChild(r);const o=n.x+n.w,a=n.y+n.h/2;m.world.classList.add("wiring");let i=null;const l=f=>{const u=wn(f.clientX,f.clientY);i=u;const p=Math.max(50,Math.abs(u.x-o)*.5);r.setAttribute("d",`M${o},${a} C${o+p},${a} ${u.x-p},${u.y} ${u.x},${u.y}`)},c=f=>{d.removeEventListener("mousemove",l),d.removeEventListener("mouseup",c),r.remove(),m.world.classList.remove("wiring");const u=f.target.closest&&f.target.closest(".card");u&&u.dataset.id!==t.id?Ci(t,s.cards.find(p=>p.id===u.dataset.id)):i&&nl(t,i,f.clientX,f.clientY)};d.addEventListener("mousemove",l),d.addEventListener("mouseup",c)}function Bs(){for(const o of["beforeinput","input","change","paste","drop","dragover","click","mousedown","pointerdown","contextmenu","keydown"])d.addEventListener(o,a=>{if(fe()||!s)return;const i=a.target;if(i.closest?.("#panel, #respop")){od(a)&&(a.preventDefault(),a.stopImmediatePropagation());return}const c=i.closest?.("#dock, #selbar"),f=i.closest?.("#world input, #world textarea, #world select, #world [contenteditable]"),u=["paste","drop","dragover"].includes(o)&&i.closest?.("#stage");(c||f||u)&&(a.preventDefault(),a.stopImmediatePropagation())},!0);matchMedia("(max-width: 760px)").matches&&d.body.classList.add("collapsed"),j("#toggle").setAttribute("aria-expanded",String(!d.body.classList.contains("collapsed"))),j("#toggle").onclick=()=>{const o=d.body.classList.toggle("collapsed");j("#toggle").setAttribute("aria-expanded",String(!o))},j("#createHere").onclick=ks,Hs(),m.fit.onclick=()=>{N={x:60,y:70,k:1},In(),vt(),Qt()},m.jobsbtn.onclick=Vn,m.selbar.innerHTML="";const e=d.createElement("button");e.className="mkgroup",e.textContent="▦ 打组",e.title="把选中的节点圈成一个组：拖分组框整体移动；双击组名改名，右键框删组（节点保留）",e.onclick=()=>{if(!fe()||J.size<2)return;if(s.groups=s.groups||[],s.groups.find(a=>a.cards.length===J.size&&a.cards.every(i=>J.has(i))))return re("这几张已经是同一组了");s.groups.push({id:Dt(),name:`组 ${s.groups.length+1}`,cards:[...J]}),vn(),$r(),Q(),re("已打组：拖组里的节点或分组框 = 整组一起动；双击组名改名，右键框删组")};const t=d.createElement("button");t.className="renamecards act",t.textContent="批量重命名",t.title="一次填写所有选中节点的新名称，统一确认；留空恢复默认名称",t.onclick=()=>{J.size>1&&da(at([...J][0]))};const n=d.createElement("button");n.className="deletecards act danger",n.textContent="批量删除",n.title="删除框选的所有节点（Delete / Backspace），操作前统一确认",n.onclick=sa,m.selbar.append(e,t,n),m.selbar.onmousedown=o=>o.stopPropagation(),I("resize",()=>{sl(),vt(),Lt(),vn()}),m.stage.addEventListener("mousemove",o=>{jr=wn(o.clientX,o.clientY),Ga(jr.x,jr.y)}),m.stage.addEventListener("mouseleave",()=>{jr=null,Ga(0,0,!1)}),m.stage.addEventListener("mousedown",o=>{if(_||o.target.closest("#selbar")||o.target.closest("#panel"))return;if(o.button===1||o.button===0&&o.shiftKey){o.preventDefault();const f={mx:o.clientX,my:o.clientY,x:N.x,y:N.y};m.stage.classList.add("panning");let u=!1;const p=h=>{u||(u=!0,Ni(!0)),N.x=f.x+h.clientX-f.mx,N.y=f.y+h.clientY-f.my,In()},g=()=>{if(m.stage.classList.remove("panning"),d.removeEventListener("mousemove",p),d.removeEventListener("mouseup",g),u&&o.button===0){const h=x=>{x.preventDefault(),x.stopImmediatePropagation()};d.addEventListener("click",h,{capture:!0,once:!0}),ne(()=>d.removeEventListener("click",h,!0),0)}u&&(Ni(!1),vt(),Qt())};d.addEventListener("mousemove",p),d.addEventListener("mouseup",g);return}if(o.button!==0)return;o.preventDefault(),kn(),$n(),se=null,nn(),Jt=null;for(const f of s?s.cards:[])f._el&&f._el.classList.remove("sel");J.clear(),Qe(!1);const a={mx:o.clientX,my:o.clientY};let i=!1;const l=f=>{if(!i&&Math.abs(f.clientX-a.mx)+Math.abs(f.clientY-a.my)<4)return;i=!0;const u=Math.min(a.mx,f.clientX),p=Math.min(a.my,f.clientY),g=Math.max(a.mx,f.clientX),h=Math.max(a.my,f.clientY),x=m.stage.getBoundingClientRect();m.lasso.style.display="",m.lasso.style.left=u-x.left+"px",m.lasso.style.top=p-x.top+"px",m.lasso.style.width=g-u+"px",m.lasso.style.height=h-p+"px";const w=wn(u,p),y=wn(g,h);if(J.clear(),s)for(const M of s.cards){const G=Co(M);G.x<y.x&&G.x+G.w>w.x&&G.y<y.y&&G.y+G.h>w.y&&J.add(M.id)}vn()},c=()=>{if(d.removeEventListener("mousemove",l),d.removeEventListener("mouseup",c),m.lasso.style.display="none",!!i)if(J.size===1){const f=[...J][0];J.clear(),Ot(f)}else Qe(!1),J.size&&re(`选中 ${J.size} 个节点：拖动整体移动 · 右键对齐 / 批量删除 · Delete 全删 · 上方按钮打组 / 批量重命名 / 批量删除`)};d.addEventListener("mousemove",l),d.addEventListener("mouseup",c)}),m.stage.addEventListener("wheel",o=>{if(_||!s)return;o.preventDefault();const a=wn(o.clientX,o.clientY),i=Math.min(De,Math.max(Ee,N.k*(o.deltaY<0?1.1:1/1.1))),l=m.stage.getBoundingClientRect();N.x=o.clientX-l.left-a.x*i,N.y=o.clientY-l.top-a.y*i,N.k=i,In(),typeof Qt=="function"?Qt():Q()},{passive:!1}),m.stage.addEventListener("contextmenu",o=>{if(o.preventDefault(),_||!fe()||o.target.closest(".card, #panel, #selbar, #dock, #respop")||(Wt(),ii(o.clientX,o.clientY)))return;const a=wn(o.clientX,o.clientY),i=[];i.push({group:"生成节点"});const l=A.find(u=>u.kind==="text");l&&i.push({icon:l.icon||"✍",text:"文本",run:()=>{bn(l.id,a.x,a.y,l.modes[0]?Nt(l.modes[0]):null)}}),A.filter(u=>u.kind==="gen").forEach(u=>{let p=u.name;p==="生图"?p="图片":p==="生视频"&&(p="视频"),i.push({icon:u.icon||"◻",text:p,run:()=>{bn(u.id,a.x,a.y,u.modes[0]?Nt(u.modes[0]):null)}})});const f=A.find(u=>u.id==="card_tools");f&&(i.push({group:"工具"}),i.push({icon:f.icon||"◻",text:"工具",run:()=>bn(f.id,a.x,a.y)})),i.push({group:"其他"}),i.push({icon:"📎",text:"上传素材",run:()=>{const u=d.createElement("input");u.type="file",u.accept="image/*,video/*,audio/*",u.onchange=async p=>{const g=p.target.files[0];if(g)try{const h=await Pt(g),x=A.find(y=>y.kind==="asset");if(!x)return Pe("找不到素材节点定义");const w=bn(x.id,a.x,a.y,x.modes[0].id);if(!w)return;await oo(w,h),re("已上传："+h.origin)}catch(h){Pe("上传失败："+h.message)}},u.click()}}),Wn&&i.push({icon:"⧉",text:"粘贴刚复制的节点（Ctrl+V）",run:()=>{jr=a,fa()}}),i.length>0&&Mt(o.clientX,o.clientY,"画布",i)}),m.stage.addEventListener("dragover",o=>{_||!fe()||(o.preventDefault(),o.dataTransfer.dropEffect="copy")}),m.stage.addEventListener("drop",async o=>{if(_||!fe())return;if(o.preventDefault(),[...o.dataTransfer?.types||[]].includes(Ea)){o.stopPropagation();const f=no;if(no=null,!f||s!==f.project||o.dataTransfer.getData(Ea)!==f.token)return;const u=wn(o.clientX,o.clientY);try{const p=await ya(f.output);if(!await gi(f.project,p,Math.round(u.x-134),Math.round(u.y-84)))return;re(`已建素材节点：${p.origin||f.output.filename||"历史产物"}`)}catch(p){s===f.project&&Pe("导入历史产物失败："+p.message)}return}const a=[...o.dataTransfer?.files||[]];if(!a.length)return;const i=a.filter(f=>f.type.startsWith("image/")||f.type.startsWith("video/")||f.type.startsWith("audio/"));if(!i.length)return re("只支持图片、视频、音频文件");const l=wn(o.clientX,o.clientY),c=s;for(const f of i){if(s!==c||!fe())return;try{const u=await Pt(f),p={x:Math.round(l.x-134),y:Math.round(l.y-84)};if(!await gi(c,u,p.x,p.y))return;re(`已建素材节点：${u.origin||f.name}`),l.x+=50,l.y+=50}catch(u){s===c&&Pe(`上传失败 ${f.name}：${u.message}`)}}}),m.view.addEventListener("mousedown",o=>{o.target===m.view&&Yr()}),I("mousedown",o=>{m.respop.style.display!=="none"&&(m.respop.contains(o.target)||Pn())},!0),I("mousedown",o=>{m.menu.style.display!=="none"&&!m.menu.contains(o.target)&&!o.target.closest(".tcap")&&kn()},!0),d.addEventListener("paste",el),d.addEventListener("keydown",o=>{if(d.querySelector("dialog[data-image-composer][open]"))return;if(m.view.style.display!=="none"&&(o.key==="ArrowLeft"||o.key==="ArrowRight")){o.preventDefault(),ui(o.key==="ArrowRight"?1:-1);return}const a=o.target,i=(a.tagName||"").toLowerCase(),l=i==="input"||i==="textarea"||i==="select"||a.isContentEditable;if(s&&!_&&!l&&m.view.style.display==="none"){if((/Mac/i.test(navigator.platform)?o.metaKey&&!o.ctrlKey:o.ctrlKey&&!o.metaKey)&&!o.altKey&&["z","y"].includes(o.key.toLowerCase())){o.preventDefault(),Es(o.key.toLowerCase()==="y"||o.shiftKey);return}const f=at(se);if(!fe()&&(["Delete","Backspace"].includes(o.key)||(o.ctrlKey||o.metaKey)&&o.key.toLowerCase()==="v")){o.preventDefault();return}if(o.key==="Delete"||o.key==="Backspace"){if(Jt){o.preventDefault(),Jr(Jt);return}if(J.size>1){o.preventDefault(),sa();return}if(f){o.preventDefault(),xi(f);return}}if((o.ctrlKey||o.metaKey)&&!o.shiftKey&&!o.altKey){const u=o.key.toLowerCase();if(u==="c"&&(f||J.size)){o.preventDefault(),or(f);return}if(u==="v"){if(ba())return;o.preventDefault(),fa();return}}if(o.key.toLowerCase()==="h"&&f&&!o.ctrlKey&&!o.metaKey&&!o.shiftKey&&!o.altKey){o.preventDefault();const u=m.stage.getBoundingClientRect(),p=u.top+u.height*.3,g=u.left+u.width*.5,h=f.x+(f._el?f._el.offsetWidth/2:te/2),x=f.y+(f._el?f._el.offsetHeight/2:168/2);N.x=g-h*N.k,N.y=p-x*N.k,In(),vt(),Qt();return}}if(o.key==="Escape"){if(m.respop.style.display!=="none"){Pn();return}if(m.view.style.display!=="none"){Yr();return}if(m.jobs.style.display!=="none"){$n();return}if(kn(),Wt(),!_){se=null,nn(),Jt=null,J.clear(),Qe(!1);for(const c of s?s.cards:[])c._el&&c._el.classList.remove("sel")}}}),m.minimapBtn.onclick=zs,Ls();let r=!0;m.wiresToggle.onclick=()=>{r=!r,m.wires.style.display=r?"":"none",m.wiresToggle.classList.toggle("active",!r),d.querySelectorAll(".card .inp, .card .out").forEach(o=>{o.style.display=r?"":"none"})},m.zoomMenu.onclick=o=>{const a=()=>{typeof Qt=="function"?Qt():Q()},i=c=>{const f=m.stage.getBoundingClientRect(),u=wn(f.left+f.width/2,f.top+f.height/2);N.x=f.width/2-u.x*c,N.y=f.height/2-u.y*c,N.k=c,In(),vt(),a()},l=[...[500,300,200,125,100,75,50,25,10].map(c=>({icon:c>100?"+":c===100?"1:1":"−",text:`${c>100?"放大":c===100?"重置":"缩小"} (${c}%)`,run:()=>i(c/100)})),{icon:"□",text:"适应画布",run:()=>{N={x:60,y:70,k:1},In(),vt(),a()}}];Mt(o.clientX,o.clientY-200,"缩放",l)}}let _o=0;function Mt(e,t,n,r){_o++,m.menu.innerHTML="";const o=d.createElement("div");o.className="hd",o.textContent=n,m.menu.appendChild(o);for(const a of r){if(a.group){const u=d.createElement("div");u.className="grp",u.textContent=a.group,m.menu.appendChild(u);continue}const i=d.createElement("button");i.disabled=!!a.disabled,a.disabled&&(i.style.opacity="0.45"),a.danger&&(i.className="danger");const l=d.createElement("span");l.textContent=a.icon||"▸";const c=d.createElement("span");c.textContent=a.text,i.append(l,c);const f=()=>{m.menu.querySelectorAll(".menu-submenu").forEach(u=>u.style.display="none"),m.menu.querySelectorAll('[aria-haspopup="menu"]').forEach(u=>u.setAttribute("aria-expanded","false"))};if(a.children){const u=d.createElement("span");u.className="submenu-arrow",u.textContent="›",u.setAttribute("aria-hidden","true"),i.appendChild(u),i.setAttribute("aria-label",a.text),i.setAttribute("aria-haspopup","menu"),i.setAttribute("aria-expanded","false");const p=d.createElement("div");p.className="menu-submenu",p.style.display="none",p.setAttribute("aria-label",a.text);for(const h of a.children){const x=d.createElement("button"),w=d.createElement("span");w.textContent=h.icon||"▸";const y=d.createElement("span");y.textContent=h.text,x.append(w,y),x.onclick=()=>{kn(),Wt(),h.run()},p.appendChild(x)}const g=()=>{f(),p.style.display="",i.setAttribute("aria-expanded","true");const h=m.menu.getBoundingClientRect(),x=i.getBoundingClientRect(),w=p.offsetWidth,y=p.offsetHeight,M=h.right+w>innerWidth-8?h.left-w+1:h.right-1;p.style.left=Math.max(8,M)-h.left-m.menu.clientLeft+"px",p.style.top=Math.max(8,Math.min(x.top,innerHeight-y-8))-h.top-m.menu.clientTop+"px"};i.onmouseenter=g,i.onclick=g,i.onkeydown=h=>{h.key==="ArrowRight"&&(h.preventDefault(),g(),p.querySelector("button").focus())},p.onkeydown=h=>{h.key==="ArrowLeft"&&(h.preventDefault(),f(),i.focus())},m.menu.append(i,p)}else i.onmouseenter=f,i.onclick=()=>{kn(),Wt(),a.run()},m.menu.appendChild(i);a.tip&&mo(i,a.tip)}m.menu.style.display="",m.menu.style.left=Math.min(e,innerWidth-m.menu.offsetWidth-8)+"px",m.menu.style.top=Math.min(t,innerHeight-m.menu.offsetHeight-8)+"px"}const kn=()=>{_o++,m.menu.style.display="none"};function Xr(e,t,n){const r=d.createElement("button");r.className="tcap";const o=d.createElement("span");o.textContent=e;const a=d.createElement("i");return a.textContent="▴",r.append(o,a),r.title=t+" —— 点击换",r.onclick=i=>{i.stopPropagation();const l=r.getBoundingClientRect();Mt(l.left,l.bottom+4,t,n());const c=m.menu;l.bottom+c.offsetHeight+12>innerHeight&&(c.style.top=Math.max(48,l.top-c.offsetHeight-8)+"px")},r}function Hs(){const e=(r,o,a,i)=>{const l=d.createElement("button");l.className="dockb",l.title=a;const c=d.createElement("span");c.textContent=r;const f=d.createElement("span");return f.textContent=o,l.append(c,f),l.onmousedown=u=>u.stopPropagation(),l.onclick=u=>{u.stopPropagation(),i(l)},l},t=r=>()=>{if(!s)return;const o=ia();bn(r,o.x,o.y)},n=()=>{const r=d.createElement("div");return r.className="sep",r};m.dock.innerHTML="",m.dock.append(e("↥","上传","选一个图片/视频文件，放进一个素材节点 —— 再把它的出口拖到别的节点上就能反复用",Nl),n(),e("T","文本","新建一个文本节点：存一段字，连到生成节点就并进提示词",t("card_text")),e("▧","图片","新建一个生图节点（默认文生图，玩法在参数面板左下角换）",t("card_image")),e("▷","视频","新建一个生视频节点（默认图生视频，玩法在参数面板左下角换）",t("card_video")),e("◇","工具箱","新建工具箱节点（玩法在参数面板左下角切换）",t("card_tools")))}const ci={video:"放大播放",audio:"放大播放"};let He=null;function Eo(){He?.image&&(He.image.style.transform=`translate3d(${He.x}px, ${He.y}px, 0) scale(${He.scale})`)}function Us(){He?.image&&(He.scale=1,He.x=0,He.y=0,Eo())}function Ws(e){He.image=e,He.scale=1,He.x=0,He.y=0,e.classList.add("vimage"),e.title="滚轮缩放 · 拖拽平移 · 双击还原",Eo(),e.addEventListener("wheel",r=>{if(!He||He.image!==e)return;r.preventDefault();const o=He.scale,a=Math.min(8,Math.max(.2,o*Math.exp(-r.deltaY*.0015)));if(a===o)return;const i=e.getBoundingClientRect(),l=a/o;He.x+=(r.clientX-(i.left+i.width/2))*(1-l),He.y+=(r.clientY-(i.top+i.height/2))*(1-l),He.scale=a,Eo()},{passive:!1});let t=null;e.addEventListener("pointerdown",r=>{r.button!==0||!He||He.image!==e||(r.preventDefault(),t={id:r.pointerId,mx:r.clientX,my:r.clientY,x:He.x,y:He.y},e.setPointerCapture(r.pointerId),e.classList.add("panning"))}),e.addEventListener("pointermove",r=>{!t||r.pointerId!==t.id||!He||He.image!==e||(He.x=t.x+r.clientX-t.mx,He.y=t.y+r.clientY-t.my,Eo())});const n=r=>{!t||r.pointerId!==t.id||(t=null,e.classList.remove("panning"),e.hasPointerCapture(r.pointerId)&&e.releasePointerCapture(r.pointerId))};e.addEventListener("pointerup",n),e.addEventListener("pointercancel",n),e.ondblclick=r=>{r.preventDefault(),Us()}}function Yr(){m.vbox.innerHTML="",m.view.style.display="none",He=null}function Vr(e,t=0,n=null,r=void 0){const o=n||e.outputs||[];if(!o.length){re("这个节点还没有产物，先运行一次");return}He={outs:o,idx:Math.min(Math.max(t,0),o.length-1),seed:r!==void 0?r:e?e.seed:null},fi(),m.view.style.display=""}function ui(e){if(!He)return;const t=He.outs.length;t<2||(He.idx=(He.idx+e+t)%t,fi())}function fi(){const{outs:e,idx:t,seed:n}=He,r=e[t];He.image=null,He.scale=1,He.x=0,He.y=0;const o=d.createElement("div");o.className="vinfo";const a=[r.filename];e.length>1&&a.unshift(`${t+1} / ${e.length}`),n!=null&&a.push("seed "+n);const i=()=>o.textContent=a.join("　·　");let l;if(r.kind==="video"){l=d.createElement("video"),l.controls=l.autoplay=l.loop=!0;const f=()=>{const u=l.play();u&&typeof u.catch=="function"&&u.catch(()=>{})};l.readyState>=3?f():l.addEventListener("canplay",f,{once:!0}),Zr(l,r.url),l.onloadedmetadata=()=>{a.splice(a.indexOf(r.filename)+1,0,`${l.videoWidth}×${l.videoHeight}`,mi(l.duration)),i()}}else r.kind==="audio"?(l=d.createElement("audio"),l.src=r.url,l.controls=l.autoplay=!0,l.onloadedmetadata=()=>{a.splice(a.indexOf(r.filename)+1,0,mi(l.duration)),i()}):(l=d.createElement("img"),l.src=r.url,a.push("滚轮缩放 · 拖拽平移 · 双击还原"),l.onload=()=>{a.splice(a.indexOf(r.filename)+1,0,`${l.naturalWidth}×${l.naturalHeight}`),i()},Ws(l));l.draggable=!1,i();const c=d.createElement("button");if(c.className="vx",c.textContent="✕",c.title="关闭 (Esc)",c.onclick=Yr,m.vbox.innerHTML="",m.vbox.append(l,o,c),e.length>1)for(const[f,u,p]of[["p","‹",-1],["n","›",1]]){const g=d.createElement("button");g.className="vnav "+f,g.textContent=u,g.title=p<0?"上一张 (←)":"下一张 (→)",g.onclick=()=>ui(p),m.vbox.appendChild(g)}}function mi(e){if(!isFinite(e))return"时长未知";const t=Math.round(e);return`${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`}const la=e=>rn()&&!e.locked&&!e.readonly&&!e.read_only&&["card_image","card_video"].includes(e.type)&&ge(e)?.kind==="gen";async function Js(e){const t=s?.id,n=e.id;if(!la(e))return re("此节点或画布不可加入导演台");try{if(await Yn(t),e=s?.cards.find(i=>i.id===n),!e||!la(e))throw new Error("节点已删除、锁定或不可操作");let r=Oo(e);if(!r){Et++;try{const i=await Yt(`/api/projects/${encodeURIComponent(t)}/director/import`,{rev:s.director?.rev||0,canvas_rev:s.rev||0,cards:[n]});if(s?.id!==t)throw new Error("画布已切换");if(r=Oo(e,i.project),!r)throw new Error("导入接口未返回关联镜头");wo(i.project)}finally{Et=Math.max(0,Et-1),ea()}}const o=`/director?project=${encodeURIComponent(t)}&shot=${encodeURIComponent(r.id)}`;Z.open(o,"_blank","noopener"),re("导演镜头已就绪");const a=d.createElement("a");a.href=o,a.target="_blank",a.rel="noopener",a.textContent="打开导演镜头",m.toast.append(" · ",a)}catch(r){Pe("导演台操作失败："+r.message)}}function Xs(e,t,n){if(!fe())return Mt(e,t,he(n),[{text:"复制节点",run:()=>or(n)},...(n.outputs||[]).length?[{text:"预览产物",run:()=>Vr(n)}]:[]]);const r=ge(n),o={icon:"✎",text:J.size>1&&J.has(n.id)?`批量重命名（${J.size} 个节点）`:"重命名节点",run:()=>da(n)};if(ht(n)){const f=s.edges.filter(u=>u.from===n.id&&Ze(u)).length;return Mt(e,t,n.name||"风格化提示词",[o,{icon:"⧉",text:"就地复制一张",run:()=>$o(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>or(n)},...f?[{icon:"⊘",text:`解除挂着的 ${f} 个节点`,run:()=>{s.edges=s.edges.filter(u=>!(u.from===n.id&&Ze(u))),Qe(),Rt(),se&&ke(se),Q()}}]:[],...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>So(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>Gr(n.id)}])}if(Ht(n))return Mt(e,t,n.name||he(n),[...k(n)?[{icon:"↑",text:"运行（加工文本）",run:()=>Ao(n)}]:[],o,{icon:"⧉",text:"就地复制一张",run:()=>$o(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>or(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>So(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>Gr(n.id)}]);if(ft(n)){const f=hn(n);return Mt(e,t,n.name||he(n),[...f?[{icon:"⛶",text:ci[f.kind]||"查看大图",run:()=>to(f)}]:[],...f?[{icon:"⬇",text:`下载${Ve[f.kind]||"文件"}`,run:()=>Kr(f)}]:[],{icon:"📁",text:"选择 / 换文件",run:()=>To(n)},o,{icon:"⧉",text:"就地复制一张",run:()=>$o(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>or(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>So(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>Gr(n.id)}])}const a=n.outputs||[],i=a[0],l=a.length>1?`逐张看大图（${a.length} 张）`:ci[i&&i.kind]||"查看大图",c=a.length>1?`下载全部 ${a.length} 张${i.kind==="video"?"视频":i.kind==="audio"?"音频":"图片"}`:`下载${i?.kind==="video"?"视频":i?.kind==="audio"?"音频":"图片"}`;Mt(e,t,n.name||(r?r.name:"节点"),[...!_&&la(n)?[{text:Oo(n)?"查看导演镜头":"加入导演台",run:()=>Js(n)}]:[],...i?[{icon:"⛶",text:l,run:()=>Vr(n)}]:[],...i?[{icon:"⬇",text:c,run:()=>a.forEach(f=>Kr(f))}]:[],o,{icon:"↑",text:"运行",run:()=>Ao(n)},{icon:"⧉",text:"就地复制一张",run:()=>$o(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>or(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>So(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>Gr(n.id)}])}function Kr(e){const t=d.createElement("a");t.href=e.url,t.download=e.filename.split(/[\\/]/).pop()||"download",d.body.appendChild(t),t.click(),t.remove()}function So(e){Fe()&&(delete e.w,delete e.h,Tn(e),Qe(),vt(),Q())}function da(e){if(!e||!Fe())return;if(J.size>1&&J.has(e.id)){const r=s.cards.filter(o=>J.has(o.id)).sort((o,a)=>o.y-a.y||o.x-a.x);if(r.length>1)return Ys(r)}const t=ge(e),n=prompt("节点名字（留空恢复成工作流名）",e.name||(t?t.name:""));n!==null&&hi([{card:e,name:n}])}function Ys(e){const t=s,n=d.createElement("dialog");n.className="auth-dialog rename-dialog";const r=d.createElement("form"),o=d.createElement("h2");o.id="rename-heading",o.textContent=`批量重命名（${e.length} 个节点）`,n.setAttribute("aria-labelledby",o.id);const a=d.createElement("p");a.className="auth-note",a.textContent="按画布从上到下、从左到右排列。一次填好各节点名称后统一确认；留空恢复默认名称。";const i=d.createElement("div");i.className="rename-list";const l=e.map((p,g)=>{const h=d.createElement("label");h.className="fld";const x=d.createElement("span");x.textContent=`${g+1}. ${he(p)}`;const w=d.createElement("input");return w.type="text",w.maxLength=40,w.value=he(p),w.placeholder=he({...p,name:null}),h.append(x,w),i.appendChild(h),{card:p,input:w}}),c=d.createElement("footer"),f=d.createElement("button");f.type="button",f.className="btn",f.textContent="取消";const u=d.createElement("button");u.type="submit",u.className="btn primary",u.textContent="确认重命名",c.append(f,u),r.append(o,a,i,c),n.appendChild(r),f.onclick=()=>n.close(),n.addEventListener("close",()=>n.remove()),n.addEventListener("keydown",p=>p.stopPropagation()),r.onsubmit=p=>{p.preventDefault(),s===t&&Fe()&&hi(l.map(({card:g,input:h})=>({card:g,name:h.value}))),n.close()},d.body.appendChild(n),n.showModal(),l[0].input.focus(),l[0].input.select()}function hi(e){const t=e.map(({card:r,name:o})=>({card:r,name:o.trim().slice(0,40)||null})).filter(({card:r,name:o})=>s.cards.includes(r)&&o!==(r.name||null)&&!(o&&o===he(r)));if(!t.length)return;const n=new Map;for(const{card:r,name:o}of t){const a=he(r),i=he({...r,name:o});a!==i&&n.set(`@${a}`,`@${i}`)}if(n.size){const r=[...n.keys()].sort((a,i)=>i.length-a.length).map(a=>a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")),o=new RegExp(`(?:${r.join("|")})(?![\\u4e00-\\u9fa5\\w])`,"g");for(const a of s.cards){for(const i of z(ge(a))){const l=a.params?.[i.key];typeof l=="string"&&(a.params[i.key]=l.replace(o,c=>n.get(c)))}for(const i in a.opt||{})typeof a.opt[i]=="string"&&(a.opt[i]=a.opt[i].replace(o,l=>n.get(l)))}}for(const{card:r,name:o}of t)r.name=o,Kt(r);se&&_n(se),Q()}function $o(e){if(Fe())return wi(yi(e),{x:e.x+24+te/2,y:e.y+28+40})}function pa(e,t){if(!s||!e?.id)return;const n=s.cards.find(r=>r.id===e.id);if(n)for(const r of["created_by","created_by_name","created_at"])e[r]!==void 0&&(n[r]=e[r]);else{const r=JSON.parse(JSON.stringify(e));zo(r),s.cards.push(r),m.world.appendChild(ta(r)),Qe(),$r(),Ur(),m.hint.textContent=`${s.cards.length} 个节点`,re(`${r.created_by_name||"协作者"} 添加了「${r.name||"新节点"}」`)}Number.isFinite(t)&&(s.rev=Math.max(s.rev||0,t))}function gi(e,t,n,r){return D((async()=>{const o=()=>s===e&&fe();if(!o())return null;for(;;){const i=Ye.pendingChain;if(await i,!o())return null;if(i===Ye.pendingChain)break}const a=bn("card_asset",n,r,null,!1);return!a||(Ot(a.id),await oo(a,t),!await a._create||!o()||!e.cards.includes(a))?null:a})())}function Vs(e,t){if(!s||e.id!==s.id)return;const n=t.id,r=s.edges.filter(p=>p.from===n||p.to===n),o=(s.groups||[]).filter(p=>p.cards.includes(n)),a=(e.cards||[]).find(p=>p.id===n);if(a)for(const p of["created_by","created_by_name","created_at"])t[p]=a[p];const i=(e.cards||[]).filter(p=>p.id!==n);i.push(t);const l=e.edges||[],c=new Set(l.map(p=>JSON.stringify(p)));for(const p of r){const g=JSON.stringify(p);c.has(g)||(l.push(p),c.add(g))}const f=(e.groups||[]).filter(p=>!p.cards.includes(n));f.push(...o);const u=m.panel.style.display!=="none";Object.assign(s,e,{cards:i,edges:l,groups:f}),Ft&&Ft.rev<=s.rev&&(Ft=null),nr(),u&&se&&ke(se)}function Ks(e){!s||e.created_by||(s.cards=s.cards.filter(t=>t!==e),s.edges=s.edges.filter(t=>t.from!==e.id&&t.to!==e.id),s.groups=(s.groups||[]).map(t=>({...t,cards:t.cards.filter(n=>n!==e.id)})).filter(t=>t.cards.length),J.delete(e.id),se===e.id&&(se=null,nn()),nr())}function Gs(e,t=!1){const n=s,r=n.id;return Ye.enqueueCardCreate(async()=>{try{const o=await Yt(`/api/projects/${encodeURIComponent(r)}/cards`,{card:go(e)});if(t){if(s!==n||!n.cards.includes(e))return!1;const a=o.project.cards.find(i=>i.id===e.id);pa(a,o.project.rev)}else{if(s?.id!==r)return!1;if(!n.cards.includes(e)){const a=o.project.cards.find(i=>i.id===e.id);return n.cards.some(i=>i.id===e.id)?pa(a,o.project.rev):s.rev=Math.max(s.rev||0,o.project.rev||0),!1}Vs(o.project,e)}return!0}catch(o){(t?s===n:s?.id===r)&&(Ye.markWorkFailure(o),Ks(e),Pe("卡片添加失败："+o.message))}})}function bn(e,t,n,r,o=!0){if(!Fe())return null;const a=cn(e);if(!a||!a.modes||!a.modes.length)return Pe(`节点类型 ${e} 不可用：找不到定义或没有模式`),null;const i={id:Dt(),type:e,cap:r||Nt(a.modes[0]),x:Math.round(t),y:Math.round(n),params:{},assets:{},status:null,progress:0,outputs:[]},c=s.cards.filter(u=>St(u)===a).reduce((u,p)=>{if(!p.name)return u;const g=p.name.match(/^(.+?)(\d+)$/);return g?Math.max(u,parseInt(g[2],10)):u},0),f=a.name||a.modes[0].name;return i.name=`${f}${c+1}`,Zo(),s.cards.push(i),m.world.appendChild(ta(i)),o&&Ot(i.id),Qe(),i._create=Gs(i,!o),queueMicrotask(yo),i}function Gr(e){return bi([e])}function bi(e){if(!s||!Fe())return 0;const t=new Set(e),n=new Set(s.cards.filter(r=>t.has(r.id)).map(r=>r.id));if(!n.size)return 0;Un(s.edges.filter(r=>n.has(r.from))),s.cards=s.cards.filter(r=>!n.has(r.id)),s.edges=s.edges.filter(r=>!n.has(r.to));for(const r of n)J.delete(r);if(s.groups){for(const r of s.groups)r.cards=r.cards.filter(o=>!n.has(o));s.groups=s.groups.filter(r=>r.cards.length)}return n.has(se)&&(se=null,nn()),Wt(),n.has(m.hist._id)&&Xn(),Jt=null,nr(),Q(),n.size}function xi(e){if(!s||!Fe()||!e||at(e.id)!==e)return;const t=s,n=e.id,r=he(e),o=(e.history||[]).length,a=(e.outputs||[]).length||o;confirm(`删除「${r}」？
`+(a?`它有 ${o} 轮生成记录或产物，节点内记录删除后无法恢复。
`:"")+"相关连线会一并移除，此操作不能撤销；不会删除素材文件。")&&(s!==t||!fe()||at(n)!==e||Gr(n)&&re(`已删除「${r}」`))}let Wn=null,jr=null,ca=0;function ua(e){return JSON.parse(JSON.stringify({id:e.id,type:e.type,cap:e.cap,name:e.name||null,w:e.w,h:e.h,x:e.x,y:e.y,params:e.params||{},assets:e.assets||{},outputs:e.outputs||[],opt:e.opt,optUse:e.optUse,optStyles:e.optStyles}))}function yi(e){const t=s.edges.filter(r=>r.to===e.id&&r.from!==e.id&&at(r.from)).map(r=>Ze(r)?{...r}:{...r,slots:gn(r)});for(const[r,o]of Object.entries(e.assets||{})){if(!o||t.some(l=>!Ze(l)&&l.slots.includes(r)))continue;const a=typeof o=="string"?[o]:[o.ref,o.url].filter(Boolean),i=s.cards.find(l=>l.id!==e.id&&(l.outputs||[]).some(c=>a.some(f=>f===c.ref||f===c.url)));i&&t.push({from:i.id,to:e.id,slot:r,slots:[r]})}const n=[...new Set(t.map(r=>r.from))].map(r=>{const o=at(r),a=ua(o);if(!ut(o)){const i=t.filter(c=>c.from===r&&!Ze(c)).flatMap(c=>c.slots.map(f=>{const u=e.assets?.[f];return u&&typeof u=="object"?u:a.outputs.find(p=>u&&(p.ref===u||p.url===u))}).filter(Boolean)),l=[...new Map(i.map(c=>[c.ref||c.url||JSON.stringify(c),c])).values()];Object.assign(a,{type:"card_asset",cap:"asset",name:he(o),params:{},assets:{},outputs:l.length?l:a.outputs})}return a});return JSON.parse(JSON.stringify({...ua(e),sourceProject:s.id,references:{cards:n,edges:t}}))}function or(e){const t=!e||J.has(e.id)?s.cards.filter(n=>J.has(n.id)):[e];t.length&&(Wn=t.map(yi),ca=0,re(t.length>1?`已复制 ${t.length} 个节点 · Ctrl / Cmd + V 批量粘贴`:`已复制「${he(t[0])}」${Wn[0].outputs.length?"（包含当前产物）":""} · Ctrl / Cmd + V 粘贴`))}function Zs(e,t){const n=Array.isArray(e)?e:[e],r=n[0],o=r.sourceProject&&r.sourceProject!==s.id,a=new Set(n.map(h=>h.id)),i=new Map,l=n.flatMap(h=>h.references?.edges||[]);if(o)for(const h of n)for(const x of h.references?.cards||[]){if(a.has(x.id))continue;const w=i.get(x.id);w?w.outputs=[...new Map([...w.outputs||[],...x.outputs||[]].map(y=>[y.ref||y.url||JSON.stringify(y),y])).values()]:i.set(x.id,{...x})}if([...n,...i.values()].some(h=>!A.some(x=>x.id===h.type)))throw new Error("这种节点在当前版本里不存在了，粘不了");const c=(h,x,w)=>{const y=bn(h.type,x,w,h.cap,!1);return y?(Object.assign(y,{...ua(h),id:y.id,x:y.x,y:y.y,status:h.outputs?.length?"done":null}),Kt(y),Tn(y),rt(y),zt(y),Li(y),y):null},f=t.x-te/2-r.x,u=t.y-40-r.y,p=new Map,g=[];for(const h of[...n,...i.values()]){const x=c(h,h.x+f,h.y+u);x&&(p.set(h.id,x.id),a.has(h.id)&&g.push(x))}for(const h of l){const x=p.get(h.from)||!o&&h.from,w=p.get(h.to);x&&w&&at(x)&&s.edges.push({...JSON.parse(JSON.stringify(h)),from:x,to:w})}if(!g.length)return null;if(g.length===1)Ot(g[0].id);else{se=null,Jt=null,J=new Set(g.map(h=>h.id)),nn(),Xn();for(const h of s.cards)h._el?.classList.toggle("sel",J.has(h.id));vn()}return Qe(),Rt(),Q(),re(g.length>1?`已粘贴 ${g.length} 个节点`:`已粘贴「${he(g[0])}」`),g.length===1?g[0]:g}function wi(e,t){const n=s;return D((async()=>{try{let r=Array.isArray(e)?e:[e];if(r[0].sourceProject&&r[0].sourceProject!==n.id){const o=r.length>1,a=await Yt(`/api/projects/${encodeURIComponent(n.id)}/copy`,{source_project:r[0].sourceProject,card:o?{cards:r}:r[0]});if(!a.card||o&&!Array.isArray(a.card.cards))throw new Error("复制接口未返回节点");r=o?a.card.cards:[a.card]}for(;;){const o=Ye.pendingChain;if(await o,!fe()||s!==n)throw new Error("画布已切换或权限已变化，未粘贴");if(o===Ye.pendingChain)break}return Zs(r,t)}catch(r){Pe(`粘贴失败：${r.message}`)}})())}function fa(){if(!Fe())return;if(!Wn)return re("还没复制东西：先选中节点，Ctrl / Cmd + C");const e=Wn[0],t=jr||{x:e.x+te/2+24*++ca,y:e.y+40+28*ca};return wi(Wn,t)}const ma={png:"image",jpg:"image",jpeg:"image",webp:"image",gif:"image",bmp:"image",mp4:"video",webm:"video",mkv:"video",mov:"video",avi:"video"},vi={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif","image/bmp":"bmp","video/mp4":"mp4","video/webm":"webm","video/x-matroska":"mkv","video/quicktime":"mov","video/x-msvideo":"avi"};let ha=Promise.resolve();function ga(e){return ma[/\.([a-z0-9]+)$/i.exec(e.name||"")?.[1].toLowerCase()]||ma[vi[e.type]]||null}function ba(){if(!s||m.panel.style.display==="none"||m.panel.style.visibility==="hidden"||m.view.style.display!=="none"||d.querySelector("dialog[open]"))return null;const e=_?Hr():at(m.panel._id);return e&&e.id===m.panel._id?e:null}function jo(e,t){if(ut(e)||ft(e))throw new Error("当前节点不接收图片 / 视频引用，请先打开生成或工具节点的参数面板");const n=St(e),r=ge(e),o=Wo(e,t);let a=e.cap;if(o)a=o.cap;else if(n?.id==="card_image"&&t==="image"&&["zimage_t2i","krea2_t2i"].includes(a))a=a.replace("_t2i","_i2i");else if(n?.id==="card_video"&&t==="video"&&!r?.inputs.some(g=>g.type===t)){const g=n.modes.find(h=>No(h,t));g&&(a=Nt(g))}const i=s.edges.filter(g=>g.to===e.id&&!Ze(g));if(a!==e.cap&&(Object.values(e.assets||{}).some(Boolean)||i.length))throw new Error("引用此素材需要切换模式；为保留已有引用，请先手动选择对应模式");const l=q[a],c=l?.inputs.filter(g=>g.type===t)||[],f=Jn(l,t),u=g=>!!e.assets?.[g.key]||i.some(h=>gn(h).includes(g.key)),p=c.find(g=>!u(g));if(!p||c.filter(u).length>=f)throw new Error(c.length?`${Ve[t]}引用已满，不会覆盖已有素材`:`当前节点没有可接收的${Ve[t]}槽位`);return{cap:a,slot:p}}async function Qs(e,t,n){let r=n.cap;const o=()=>s===t&&rn()&&t.cards.includes(n)&&ba()===n&&n.cap===r;try{if(!o())return;if(!cn("card_asset"))throw new Error("找不到素材节点定义");const a={...n,assets:{...n.assets}};for(const i of e){const l=jo(a,ga(i));a.cap=l.cap,a.assets[l.slot.key]=!0}for(const i of e){if(!o())return;const l=ga(i);jo(n,l);const c=/\.([a-z0-9]+)$/i.exec(i.name||"")?.[1].toLowerCase(),f=ma[c]?i:new File([i],`${i.name||"剪贴板素材"}.${vi[i.type]}`,{type:i.type}),u=await Pt(f,ge(n)?.execution==="browser");if(!o())return;if(u.kind!==l)throw new Error("上传素材类型不匹配，未创建节点或引用");for(;;){const x=Ye.pendingChain;if(await x,!o())return;if(x===Ye.pendingChain)break}jo(n,l);const p=ia(),g=bn("card_asset",p.x,p.y,null,!1);if(!g||(await oo(g,u,!1),!await g._create))return;if(!o()||!t.cards.includes(g)){s===t&&re("素材已导入，但当前节点已改变，未添加引用");return}const h=jo(n,l);h.cap!==n.cap&&(St(n)?.id==="card_image"?(tr(n,h.cap),n._model||(n._model=h.cap.startsWith("krea2")?"krea2":"zimage")):n.cap=h.cap,r=n.cap,Kt(n)),n.assets[h.slot.key]=JSON.parse(JSON.stringify(g.outputs[0])),Bn(n),t.edges.push({from:g.id,to:n.id,slot:h.slot.key,slots:[h.slot.key]}),Qe(),Rt(),zt(n),ke(n.id),Q(),re(`已导入${Ve[l]}素材并引用到「${he(n)}」的${sn(h.slot,n)}`)}}catch(a){s===t&&Pe("剪贴板导入失败："+a.message)}}function el(e){if(e.defaultPrevented||d.querySelector("dialog[data-image-composer][open]"))return;const t=ba();if(!t)return;const n=e.clipboardData,r=[...n?.items||[]].filter(i=>i.kind==="file").map(i=>i.getAsFile()).filter(Boolean),o=r.length?r:[...n?.files||[]];if(o.length){if(e.preventDefault(),!rn())return re("此画布只读或已锁定，不能导入剪贴板素材");const i=o.filter(c=>ga(c));if(!i.length)return re("剪贴板仅支持图片或视频文件");const l=s;ha=ha.then(()=>Qs(i,l,t)),D(ha);return}e.target.closest("input,textarea,select")||e.target.isContentEditable||_||(Wn?(e.preventDefault(),fa()):n?.types.length&&re("剪贴板未提供可读取的图片 / 视频文件；复制路径不能导入，请拖入文件或上传"))}function Jn(e,t){if(!e)return 0;const n=e.slotLimits&&e.slotLimits[t]&&e.slotLimits[t].max;return n??e.inputs.filter(r=>r.type===t).length}function ki(e,t){const n=ge(e);return n?n.inputs.filter(r=>r.type===t&&(e.assets||{})[r.key]).length:0}function tl(e,t){const n=ge(e);if(!n)return null;const r=new Set((s?.edges||[]).filter(o=>o.to===e.id&&!Ze(o)).flatMap(gn));return Ge(e)&&(!Jn(n,t)||ki(e,t)>=Jn(n,t))?null:n.inputs.find(o=>o.type===t&&!e.assets?.[o.key]&&!r.has(o.key))||null}function xa(e,t){if(!Fe()||e.id===t.id)return;if(Ht(t)){if(!en(e))return re(`「${he(e)}」手里还没有字：先写一段，或先运行它`);if(s.edges.some(a=>a.from===e.id&&a.to===t.id&&a.slot===Dn))return re("已经接过了");s.edges.push({from:e.id,to:t.id,slot:Dn}),Qe(),Rt(),se===t.id&&ke(t.id),Q();const o=R(t).length;re(`已把「${he(e)}」的文本接给「${he(t)}」（第 ${o} 段输入）`);return}if(ht(t))return re("风格节点不收输入：它把字写给生成节点用");if(!z(ge(t)).length)return re(`「${he(t)}」不写提示词，接文本节点没有用`);if(!en(e))return re(`「${he(e)}」手里还没有字：先写一段，或先运行它`);if(s.edges.some(o=>o.from===e.id&&o.to===t.id&&o.slot===er))return re("已经挂上了");s.edges.push({from:e.id,to:t.id,slot:er}),Qe(),Rt(),se===t.id&&ke(t.id),Q();const r=Re(e).length;re(`文本已挂给「${he(t)}」`+(r?`，下游 ${r} 个节点也跟着带`:""))}async function Ci(e,t){if(!Fe()||!t)return;if(ut(e))return xa(e,t);if(ut(t))return re("文本节点不收图片/视频素材：把文本节点的出口拖过来才是接文本");if(ft(t))return re("素材节点不收输入：它是把手里那份素材送给别的节点的");const n=e.outputs||[],r=n[0];if(!r)return re(ft(e)?"这个素材节点还是空的：先点它选个文件":"上游还没有产物，先运行它");const o=St(t);let a=!1;o&&o.id==="card_image"&&r.kind==="image"&&(t.cap==="zimage_t2i"?(tr(t,"zimage_i2i"),t._model||(t._model="zimage"),Kt(t),a=!0):t.cap==="krea2_t2i"&&(tr(t,"krea2_i2i"),t._model||(t._model="krea2"),Kt(t),a=!0));const i=ge(t);if(o&&o.id==="card_video"&&r.kind==="video"&&!Ge(t)&&!(i&&i.inputs.some(u=>u.type==="video"))){const u=o.modes.find(p=>No(p,"video"));u&&(Un(s.edges.filter(p=>p.to===t.id&&!Ze(p))),t.assets={},t.cap=Nt(u),Kt(t),a=!0)}const l=Wo(t,r.kind);l&&(Un(s.edges.filter(u=>u.to===t.id)),t.cap=l.cap,t.assets={},Kt(t));const c=l?{key:l.slot,label:Ve[r.kind]||"素材"}:tl(t,r.kind);if(!c){const u=Jn(ge(t),r.kind);return re(u&&ki(t,r.kind)>=u?`${Ve[r.kind]||r.kind}引用已达上限 ${u}`:`下游节点没有可接收的${Ve[r.kind]||r.kind}槽位`)}l||Un(s.edges.filter(u=>u.to===t.id&&gn(u).includes(c.key)));const f={from:e.id,to:t.id,slot:c.key,slots:ti(t,c.key,n)};s.edges.push(f),Wr(t),Qe(),Rt();try{const u=ot(t).length&&z(ge(t)).length,p=Jn(ge(t),r.kind);re(`引用上游产物 → ${sn(c,t)}`+(p?`（上限 ${p}）`:"")+(u?"；上游的风格也跟着传下来了":""));for(let g=0;g<f.slots.length;g++){const h=n[g];if(!h)break;const x=ge(e)?.execution==="browser"&&h.ref?.startsWith("chouka/"),w=ft(e)||x?JSON.parse(JSON.stringify(h)):await ya(h,ge(t)?.execution==="browser");if(!s||!s.edges.includes(f))return;t.assets[f.slots[g]]=w}Bn(t),zt(t),Qe(),(a||se===t.id)&&ke(t.id),Q()}catch(u){s?.edges.includes(f)&&(Un([f]),Wr(t),Qe(),Rt(),se===t.id&&ke(t.id)),Q(),Pe("引用失败："+u.message)}}function No(e,t){if(e.route)return!!e.route[t];const n=q[Nt(e)];return!!n&&n.inputs.some(r=>r.type===t)}async function nl(e,t,n,r){if(!Fe())return;const o=[["card_text","文本"],["card_image","图片"],["card_video","视频"],["card_tools","工具箱"]],a=(e.outputs||[]).length,i=(e.outputs||[])[0]?.kind||(ge(e)||St(e)||{}).outputType;console.log("[spawnDownstream] 上游产物:",{outputCount:a,outputKind:i,fromId:e.id});const l=g=>{const h=[];for(const[x,w]of o){const y=A.find(G=>G.id===x);if(!y||!y.modes.length)continue;let M=null;a>1&&i&&(M=y.modes.find(G=>{if(!g(G))return!1;const Xe=Nt(G),it=q[Xe];if(!it)return!1;const Ke=it.images||0,Oe=it.videos||0,gt=it.audios||0;return console.log("[spawnDownstream] 检查模式:",{mode:G,capId:Xe,imgCount:Ke,vidCount:Oe,audCount:gt,outputCount:a,outputKind:i}),i==="image"&&Ke===a?(console.log("[spawnDownstream] ✓ 找到匹配的图片模式:",Xe),!0):i==="video"&&Oe===a?(console.log("[spawnDownstream] ✓ 找到匹配的视频模式:",Xe),!0):i==="audio"&&gt===a?(console.log("[spawnDownstream] ✓ 找到匹配的音频模式:",Xe),!0):!1})),M||(M=y.modes.find(g)),M&&h.push({icon:y.icon,text:w,run:async()=>{const G=bn(y.id,t.x,t.y-40,Nt(M));G&&(ut(e)?await xa(e,G):await Ci(e,G))}})}return h};if(ut(e)){const g=A.find(x=>x.id==="card_text"),h=[];return g&&g.modes.length&&h.push({icon:g.icon,text:"文本节点（接住这段字当输入）",run:async()=>{const x=bn(g.id,t.x,t.y-40,Nt(g.modes[0]));x&&await xa(e,x)}}),h.push(...l(x=>z(q[Nt(x)]).length)),h.length?Mt(n,r,"把这段文本接给…",h):void 0}if(ft(e)){const g=hn(e);if(!g)return re("这个素材节点还是空的：先点它选个文件");const h=l(w=>No(w,g.kind)),x=Ve[g.kind]||g.kind;return h.length?Mt(n,r,`把这个${x}接给…`,h):re(`没有节点收${x}素材`)}const c=(e.outputs||[])[0],f=c?c.kind:(ge(e)||St(e)||{}).outputType;if(!f)return;const u=l(g=>No(g,f)),p=Ve[f]||f;if(!u.length)return re(`没有节点收${p}素材`);Mt(n,r,`把这个${p}接给…`,u)}async function ya(e,t=!1){const n=s;if(!fe())throw new Error("此画布只读，不能导入素材");const r=await xe(new Ce(e.url,location.href),{credentials:"same-origin"});if(!r.ok)throw new Error(`读取产物失败（${r.status}）`);const o=await r.blob();if(s!==n||!fe())throw new Error("画布已切换或权限已变化，导入已取消");const a=e.filename||new Ce(e.url,location.href).pathname.split("/").pop()||"历史产物",i=new File([o],a.split(/[\\/]/).pop(),{type:o.type});return Pt(i,t)}const ar=new Map;function rl(e,t){if(t?.aborted)return Promise.reject(t.reason);const n=/^\/api\/upload\/([^/?#]+)$/.exec(e);if(!n)return Promise.resolve(e);if(!ar.has(e)){const a={controller:new AbortController,users:new Set,ready:!1};a.promise=(async()=>{const i=a.controller.signal;for(;;){i.throwIfAborted();const l=await kt(`/api/preview/${n[1]}`,{signal:i});if(i.throwIfAborted(),l.status==="ready")return a.ready=!0,l.url;if(l.status==="error")throw new Error(l.error);await new Promise((c,f)=>{const u=()=>{oe(p),f(i.reason)},p=ne(()=>{i.removeEventListener("abort",u),c()},1500);i.addEventListener("abort",u,{once:!0})})}})(),ar.set(e,a),a.promise.catch(()=>{ar.get(e)===a&&ar.delete(e)})}const r=ar.get(e),o={};return r.users.add(o),new Promise((a,i)=>{const l=()=>{t?.removeEventListener("abort",c),r.users.delete(o),!r.ready&&!r.users.size&&(ar.get(e)===r&&ar.delete(e),r.controller.abort())},c=()=>{l(),i(t.reason)};t?.addEventListener("abort",c,{once:!0}),r.promise.then(f=>{l(),a(f)},f=>{l(),i(f)})})}function Zr(e,t,n=()=>!0,r){if(e.playsInline=!0,!/^\/api\/upload\//.test(t)){e.src=t;return}e.dataset.previewOriginal=t;const o=e.getAttribute("poster"),a=e.title;let i;const l=(c,f)=>{e.dataset.previewState=c?"error":"processing",e.title=f;const u=c?["视频转码失败","修复转码后才能生成"]:["正在转码为 MP4","完成后可预览和生成"];e.poster=i="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#111318"/><g fill="#d1d5db" text-anchor="middle" font-family="sans-serif" font-size="25"><text x="320" y="168">${u[0]}</text><text x="320" y="208" font-size="19">${u[1]}</text></g></svg>`)};return l(!1,"服务器正在生成兼容 MP4；原片已备份，转码完成后下游节点使用 MP4 生成。"),rl(t,r).then(c=>{e.dataset.previewOriginal!==t||!n()||(e.dataset.previewState="ready",e.title=a||"MP4 转码已完成，预览和后续生成均使用此版本；原片已备份。",e.getAttribute("poster")===i&&(o?e.poster=o:e.removeAttribute("poster")),e.src=c)}).catch(c=>{r?.aborted||e.dataset.previewOriginal!==t||!n()||(l(!0,c.message||"转码状态加载失败；请检查服务器后重试生成。"),e.removeAttribute("src"),e.load())})}function _i(e){e.querySelectorAll("video[data-video-url]").forEach(t=>{Zr(t,t.dataset.videoUrl)})}const Cn=new Map;let Nr=null,Mo=null,Qr=null,wa=0,eo=null;function va(){!Cn.size||eo!==null||(eo=$e(()=>{eo=null,Ca()}))}Z.addEventListener("resize",va);function Ei(e){return/^\/api\/(upload|artifact)\//.test(e)?`/api/thumbnail?url=${encodeURIComponent(e)}`:null}function Si(e,t){t.controller?.abort(),t.blob&&Ce.revokeObjectURL(t.blob),ir(e),e.tagName==="VIDEO"&&(e.pause(),e.removeAttribute("src"),e.load()),Nr?.unobserve(e),Qr?.unobserve(e),Cn.delete(e)}function ka(){for(const[e,t]of Cn)Si(e,t);Nr?.disconnect(),Mo?.disconnect(),Qr?.disconnect(),Nr=null,Mo=null,Qr=null,tt(eo),eo=null}function Ca(){const e=m.stage.getBoundingClientRect(),t=Z.devicePixelRatio||1;for(const[n,r]of Cn){if(!r.visible||!n.isConnected||r.project!==s||!v.active)continue;const o=n.getBoundingClientRect();if(o.right<=e.left-120||o.left>=e.right+120||o.bottom<=e.top-120||o.top>=e.bottom+120){r.controller?.abort();continue}if(r.fullURL&&!r.original&&Math.max(o.width,o.height)*t>512&&(r.url=r.fullURL,r.original=!0,r.done=!1,r.controller?.abort()),r.loading||r.done||wa>=4)continue;const a=new AbortController;r.controller=a,r.loading=!0,wa++,(async()=>{try{const i=await xe(r.url,{credentials:"same-origin",signal:a.signal});if(a.signal.aborted||Cn.get(n)!==r||r.project!==s||!v.active)return;if(!i.ok)throw i.status===401&&await v.me(),[403,404].includes(i.status)&&Z.dispatchEvent(new CustomEvent("h3auth:denied",{detail:{path:"/api/thumbnail",method:"GET",error:{status:i.status}}})),new Error(`预览加载失败（${i.status}）；可双击查看原文件`);const l=await i.blob();if(a.signal.aborted||Cn.get(n)!==r||!n.isConnected||r.project!==s||!v.active)return;const c=r.blob;r.blob=Ce.createObjectURL(l),n.tagName==="VIDEO"?n.poster=r.blob:n.src=r.blob,c&&Ce.revokeObjectURL(c),r.done=!0}catch(i){!a.signal.aborted&&Cn.get(n)===r&&(r.done=!0,n.title=i.message)}finally{r.loading=!1,r.controller=null,wa--,Ca()}})()}}function ol(e,t){const n=Ei(t);e.tagName==="VIDEO"?(e.dataset.videoUrl=t,e.preload="none",e.title="单击播放；双击放大查看原视频",e.poster="data:image/svg+xml;charset=utf-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="288"><rect width="512" height="288" fill="#111318"/><path d="M238 121v46l40-23z" fill="#b7bbc3"/></svg>')):(e.decoding="async",n&&(e.dataset.thumbnail="true")),Nr||(Nr=new ae(r=>{for(const o of r){const a=Cn.get(o.target);a&&(a.visible=o.isIntersecting,!a.visible&&a.loading&&a.controller?.abort())}Ca()},{root:m.stage,rootMargin:"120px"}),Mo=new ee(()=>{for(const[r,o]of Cn)r.isConnected||Si(r,o)}),Mo.observe(m.world,{childList:!0,subtree:!0}),Qr=new Me(va)),Cn.set(e,{url:n||t,fullURL:n?e.tagName==="VIDEO"?`${n}&size=original`:t:null,original:!1,project:s,visible:!1,loading:!1,done:e.tagName==="VIDEO"&&!n}),Nr.observe(e),Qr.observe(e)}function al(e,t,n){for(const o of e.querySelectorAll("img, video")){const a=o.classList.contains("old")?n:t[+(o.dataset.i||0)]?.url;a&&ol(o,a)}const r=e.querySelector("audio");r&&(r.src=t[0].url)}function ir(e){e._playRequest&&e.pause(),e._playRequest=null,e._previewController?.abort(),e._previewController=null}async function il(e){if(!e.isConnected||!v.active)return;for(const o of d.querySelectorAll("video"))ir(o);const t=s,n={},r=new AbortController;e._playRequest=n,e._previewController=r;try{if(e.getAttribute("src")||(e.preload="metadata",await Zr(e,e.dataset.videoUrl,()=>e._playRequest===n&&e.isConnected&&s===t&&v.active,r.signal)),e._playRequest!==n||!e.isConnected||s!==t||!v.active||e.dataset.previewState==="error")return;await e.play()}catch(o){!r.signal.aborted&&e._playRequest===n&&e.isConnected&&s===t&&(e.title=o.message||"视频暂时无法播放")}finally{e._previewController===r&&(e._previewController=null)}}function to(e){Vr(null,0,[{url:e.url,kind:e.kind,filename:(e.origin||e.url).split(/[\\/]/).pop()}],null)}const $i=20;function Mr(e,t){const n=e.outputs||[],r=Ge(e);if(!n.length&&!r)return;e.history=e.history||[];const o=e.history.find(a=>a.job===t.id);if(o){r&&Object.assign(o,{status:e.status,ms:e.ms??null,outputs:n});return}e.history.unshift({ts:Date.now(),job:t.id,seed:e.seed!=null?e.seed:null,cap:t.capability,ms:e.ms!=null?e.ms:null,outputs:n,...r?{status:e.status}:{},...t.prompts?{prompts:t.prompts.map(a=>({...a}))}:{}}),e.history.length>$i&&(e.history.length=$i)}function zo(e){e.history||(e.history=(e.outputs||[]).length?[{ts:null,seed:e.seed!=null?e.seed:null,cap:e.cap,outputs:e.outputs}]:[])}function sr(e){if(!(e>0))return"";const t=Math.round(e/1e3);if(t<60)return`${t}秒`;const n=Math.floor(t/60);return n<60?`${n}分${t%60}秒`:`${Math.floor(n/60)}时${n%60}分`}function _a(e){if(!e)return"早前";const t=new Date(e),n=a=>String(a).padStart(2,"0"),r=new Date;r.setHours(0,0,0,0);const o=`${n(t.getHours())}:${n(t.getMinutes())}`;return e>=r.getTime()?o:`${n(t.getMonth()+1)}-${n(t.getDate())} ${o}`}function Xn(){m.hist.style.display="none",m.hist.innerHTML="",m.hist._id=null}function ji(e){return Math.max(240,Math.min(e,Math.min(720,innerWidth*.65)))}function sl(){if(!m.hist||m.hist.style.display==="none")return;const e=m.hist.getBoundingClientRect().width,t=ji(e);t!==e&&m.hist.style.setProperty("--hist-width",`${t}px`)}function ll(e){const t=n=>{m.hist.style.setProperty("--hist-width",`${ji(n)}px`),vt(),Lt(),vn()};e.onpointerdown=n=>{if(n.button!==0)return;n.preventDefault();const r=n.clientX,o=m.hist.getBoundingClientRect().width;m.hist.classList.add("resizing"),e.setPointerCapture(n.pointerId),e.onpointermove=a=>t(o+r-a.clientX),e.onpointerup=e.onpointercancel=()=>{m.hist.classList.remove("resizing"),e.onpointermove=e.onpointerup=e.onpointercancel=null}},e.onkeydown=n=>{if(n.key!=="ArrowLeft"&&n.key!=="ArrowRight")return;n.preventDefault();const r=n.shiftKey?40:16;t(m.hist.getBoundingClientRect().width+(n.key==="ArrowLeft"?r:-r))}}function zr(e){const t=s&&s.cards.find(a=>a.id===e);if(!t||ut(t))return Xn();zo(t);const n=d.createElement("div");n.className="hlist",ge(t);const r=d.createElement("button");r.className="hresize",r.type="button",r.title="左右拖动调整历史产物栏宽度",r.setAttribute("aria-label","调整历史产物栏宽度"),ll(r);const o=d.createElement("div");if(o.className="hhd",o.innerHTML='<b>历史产物</b><span class="n"></span><button class="x" title="收起">✕</button>',o.querySelector(".n").textContent=t.history.length?`${t.history.length} 轮`:"",o.querySelector(".x").onclick=Xn,!t.history.length){const a=d.createElement("div");a.className="hempty",a.textContent=`这个节点还没出过东西。
运行一次，每一轮的产物和 seed 都会留在这里。`,a.style.whiteSpace="pre-line",n.appendChild(a)}for(const[a,i]of t.history.entries())n.appendChild(dl(t,i,a===0));m.hist.innerHTML="",m.hist.append(r,o,n),m.hist._id=e,m.hist.style.display=""}async function Lo(e,t){const n=String(e);try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(n);else{const r=d.activeElement,o=d.createElement("textarea");o.value=n,o.style.cssText="position:fixed;top:0;left:0;opacity:0;pointer-events:none",d.body.appendChild(o);try{if(o.focus(),o.select(),!d.execCommand("copy"))throw new Error("复制失败")}finally{o.remove(),r?.focus({preventScroll:!0})}}re(t)}catch{Pe("复制失败，请展开后手动选中文字复制")}}const Ea="application/x-chouka-history-output";let no=null;function dl(e,t,n){const r=t.outputs||[],o=d.createElement("div");o.className="hrun"+(n?" cur":"");const a=d.createElement("div");a.className="rh";const i=q[t.cap]&&q[t.cap].name||"";a.innerHTML='<span class="tag"></span><span class="nm"></span><span class="cnt"></span>',a.querySelector(".tag").textContent=n?"最新":_a(t.ts),a.querySelector(".nm").textContent=n?_a(t.ts):i,a.querySelector(".cnt").textContent=[t.status==="running"?"生成中":t.status==="error"?"失败":r.length>1?`${r.length} 张`:"",sr(t.ms)].filter(Boolean).join(" · "),a.title=i;const l=d.createElement("div");l.className="rg"+(r.length===1?" one":""),l.style.setProperty("--hcols",r.length===1?1:r.length<=4?2:3),l.innerHTML=r.map((p,g)=>p.kind==="video"?`<video data-video-url="${p.url}" data-i="${g}" muted loop preload="metadata" draggable="false"></video>`:p.kind==="audio"?`<div class="rg-a" data-i="${g}" title="${p.filename}">🎵</div>`:`<img src="${p.url}" data-i="${g}" alt="" draggable="false">`).join(""),_i(l);for(const p of l.querySelectorAll("[data-i]"))p.draggable=!0,p.title="单击放大查看；拖到画布创建素材节点";let c=!1;l.ondragstart=p=>{const g=p.target.closest("[data-i]"),h=g&&r[+g.dataset.i];if(!fe()||!h||!["image","video","audio"].includes(h.kind)){p.preventDefault();return}c=!0,no={token:Dt(),project:s,output:{...h}},p.dataTransfer.items.clear(),p.dataTransfer.effectAllowed="copy",p.dataTransfer.setData(Ea,no.token)},l.ondragend=()=>{no=null,ne(()=>{c=!1},0)},l.onclick=p=>{if(c)return;const g=p.target.closest("[data-i]");g&&Vr(e,+g.dataset.i,r,t.seed)},l.oncontextmenu=p=>{p.preventDefault(),p.stopPropagation();const g=p.target.closest("[data-i]");if(!g)return;const h=+g.dataset.i,x=r[h];if(!x)return;const w=[];w.push({icon:"⬇",text:`下载${x.kind==="video"?"视频":x.kind==="audio"?"音频":"图片"}`,run:()=>Kr(x)}),r.length>1&&w.push({icon:"⬇",text:`下载全部 ${r.length} 张${x.kind==="video"?"视频":x.kind==="audio"?"音频":"图片"}`,run:()=>r.forEach(y=>Kr(y))}),Mt(p.clientX,p.clientY,"历史记录",w)},o.append(a,l);const f=d.createElement("div");if(f.className="rs",f.innerHTML="<i>seed</i><span></span>",f.querySelector("span").textContent=t.seed!=null?String(t.seed):"未记录",t.seed!=null){const p=d.createElement("button");p.textContent="复制",p.title="复制 seed",p.onclick=()=>Lo(t.seed,"已复制 seed "+t.seed),f.appendChild(p)}if(o.appendChild(f),t.user_prompt||t.negative_prompt){const p=d.createElement("details");p.className="rp";const g=d.createElement("summary");g.textContent="提示词";const h=d.createElement("div");if(t.user_prompt){const x=d.createElement("div");x.style.display="flex",x.style.justifyContent="space-between",x.style.alignItems="center",x.style.marginBottom="4px";const w=d.createElement("div");w.style.fontWeight="bold",w.textContent="正面提示词：";const y=d.createElement("button");y.textContent="复制",y.style.fontSize="12px",y.style.padding="2px 8px",y.onclick=()=>Lo(t.user_prompt,"已复制正面提示词"),x.append(w,y);const M=d.createElement("div");M.style.marginBottom=t.negative_prompt?"8px":"0",M.textContent=t.user_prompt,h.append(x,M)}if(t.negative_prompt){const x=d.createElement("div");x.style.display="flex",x.style.justifyContent="space-between",x.style.alignItems="center",x.style.marginBottom="4px";const w=d.createElement("div");w.style.fontWeight="bold",w.textContent="负面提示词：";const y=d.createElement("button");y.textContent="复制",y.style.fontSize="12px",y.style.padding="2px 8px",y.onclick=()=>Lo(t.negative_prompt,"已复制负面提示词"),x.append(w,y);const M=d.createElement("div");M.textContent=t.negative_prompt,h.append(x,M)}p.append(g,h),o.appendChild(p)}const u=t.prompts||(t.prompt!=null?[{label:"提示词",text:t.prompt}]:[]);for(const p of u){const g=d.createElement("details");g.className="rp";const h=d.createElement("div");h.className="history-prompt";const x=d.createElement("summary");x.textContent=p.key==="if_original"?"原始提示词":p.key==="if_submitted"?"提交给 IF CLI 的提示词":"当时提交的"+p.label;const w=d.createElement("button");w.textContent="复制",w.type="button",w.className="history-prompt-copy",w.title="复制"+x.textContent,w.onclick=()=>Lo(p.text,"已复制"+p.label);const y=d.createElement("div");y.textContent=p.text||"（本次提交为空）",g.append(x,y),h.append(g,w),o.appendChild(h)}return o}async function pl(e){if(!Fe())return;if(!rn())return re("请先复制示例画布，再保存图片合成");if(d.querySelector("dialog[data-image-composer][open]"))return;const t=s,n=()=>s===t&&rn()&&at(e.id)===e&&e.cap==="image_composite",r=()=>{if(!n())throw new Error("画布、节点或权限已变化，请关闭编辑器后重新打开")},o=async(a,i)=>{r(),Ye.beginFlush();try{Zo(),e.params.composition=JSON.parse(JSON.stringify(a));for(const c of Object.keys(e.assets))c.startsWith("composite:")&&delete e.assets[c];for(const c of a.layers)e.assets[`composite:${c.id}`]={...c.asset};if(i){e.outputs=[i],e.status="done",e.progress=1,e.job=null,e.seed=null,e.ms=null,e.error=null,e.step="",Mr(e,{id:`local:${Dt()}`,capability:e.cap});for(const c of t.edges.filter(f=>f.from===e.id&&!Ze(f)&&!f.version)){const f=at(c.to);if(!f)continue;const u=gn(c);c.slots=u,u.forEach((p,g)=>{g===0?f.assets[p]={...i}:delete f.assets[p]}),zt(f)}}yo(),Ye.cancelContentSave();const l=await ur(t.id);if(!l.ok)throw l.error||new Error("合成保存失败，请重试");r(),rt(e),Qe(),m.panel._id===e.id&&ke(e.id),i&&m.hist._id===e.id&&zr(e.id)}finally{Ye.endFlush()}};try{if(e._create&&await e._create,r(),!Z.ChoukaImageComposer)throw new Error("图片合成组件未加载，请强制刷新页面");const a=new Map,i=(c,f)=>{c?.kind!=="image"||!c.url||a.has(c.url)||a.set(c.url,{...c,name:f||c.origin||c.filename||"图片"})};for(const c of Object.values(e.assets||{}))i(c,c?.origin);for(const c of t.cards)if(c!==e){for(const f of Object.values(c.assets||{}))i(f,`${he(c)} · ${f?.origin||"素材"}`);for(const f of c.outputs||[])i(f,`${he(c)} · 产物`);for(const f of c.history||[])for(const u of f.outputs||[])i(u,`${he(c)} · 历史产物`)}const l=(ge(e)?.inputs||[]).filter(c=>c.type==="image").map(c=>e.assets[c.key]).filter(c=>c?.kind==="image"&&c.url);await Z.ChoukaImageComposer.open({state:e.params.composition?JSON.parse(JSON.stringify(e.params.composition)):null,linkedSources:l,sources:[...a.values()],canEdit:n,upload:async c=>{r();const f=await Pt(c,!0);return r(),f},onSave:c=>o(c),onExport:async(c,f)=>{r();const u=await Pt(new File([c],`composition_${Date.now()}.png`,{type:"image/png"}),!0);r(),await o(f,{...u,filename:u.origin}),re("图片合成已保存，可从输出端口连接下游节点")}})}catch(a){Pe("图片合成："+a.message)}}function nn(){m.panel.style.display="none",m.panel._id=null,Xn()}function Ni(e){m.panel.style.display!=="none"&&(m.panel.style.visibility=e?"hidden":"")}function vt(){if(m.panel.style.display==="none")return;if(Ji(m.panel,!fe()),_){m.panel.style.left="0px",m.panel.style.top="0px",m.panel.style.maxHeight="100%",m.panel.style.visibility="";return}const e=s&&s.cards.find(G=>G.id===m.panel._id);if(!e||!e._el)return nn();const t=8,n=e.x,r=e.y,o=e._el.offsetWidth,a=e._el.offsetHeight,i=n*N.k+N.x,l=r*N.k+N.y,c=o*N.k,f=a*N.k,u=m.stage.getBoundingClientRect(),p=i+c,g=l+f;if(!(p>0&&i<u.width&&g>0&&l<u.height)){m.panel.style.visibility="hidden";return}m.panel.style.visibility="";const x=52;m.panel.style.maxHeight=innerHeight-x-t+"px";const w=m.panel.offsetWidth;m.panel.offsetHeight;const y=i+c/2-w/2,M=l+f+t;m.panel.style.left=y+"px",m.panel.style.top=M+"px"}function ke(e,t=null){if(_&&e!==pe)return;if(_&&qt)return Cr();const n=s?.cards.find(L=>L.id===e);if(!n)return nn();const r=fe()?n:t||Z.structuredClone(go(n)),o=St(r),a=ge(r);Ge(r)&&!lo&&Ln().catch(()=>{});const i=m.panel.querySelector(".pbody"),l=i&&m.panel._id===e?i.scrollTop:0;if(m.panel._id=e,m.panel.innerHTML="",m.panel.style.display="",m.panel.style.visibility="",ht(r))return cl(r);if(Ht(r))return fl(r);if(ft(r))return ul(r);const c=["card_image","card_video","card_tools"].includes(o.id)&&o.modes.length>1;if(o.modes.length>1&&!c){const L=d.createElement("div");L.className="modes";for(const V of o.modes){const _e=d.createElement("button");_e.className=Nn(V,r.cap)?"on":"",_e.textContent=V.name,mo(_e,()=>fo(r,V,V.name)),_e.onclick=()=>{Wt(),r.cap=Nt(V,on(r)),ke(e),Kt(r),Q()},L.appendChild(_e)}m.panel.appendChild(L)}if(!a)return m.panel.appendChild(Po("能力不可用")),vt();const f=a.id==="image_composite"&&a.execution==="browser",u=Ge(r)?a:q[Ut(r)];let p=u&&u!==a?a.inputs.map(L=>{const V=u.inputs.find(_e=>_e.key===L.key);return V&&V.default!==L.default?{...L,default:V.default}:L}):a.inputs;const g=ct(r);if(g&&g.entry){const L=p.findIndex(V=>Ct.includes(V.type));L>=0&&!r.assets[p[L].key]&&(p=p.slice(),p[L]={...p[L],label:g.entry.label})}const h=d.createElement("div");h.className="pbody",m.panel.appendChild(h);const x=d.createElement("div");if(x.className="knobnote clipboard-media-hint",x.textContent="Ctrl / Cmd + V：粘贴截图或图片 / 视频文件，自动创建素材节点并引用到空槽；不覆盖已有引用。复制文件需浏览器提供文件数据，仅路径文字无法导入。",Ge(r)&&(x.textContent=Gn?`本机 IF 不可用：${Gn}。请先安装并登录 IF CLI、启动本机桥接，点模型按钮可重试。`:"IF 使用本机账号；支持按模型数量连接多份引用。引用素材各上传一次，返回的 URL 按「图片1」「视频1」写入提示词，与生成需求一次提交；模型由 CLI 参数指定，随后轮询并保存产物。图片超过 10 MB 时优先转无损 WebP，仍超限再压缩；视频超过 50 MB 时自动转码。仅处理上传副本，原素材不变；本机上传合计不超过 100 MB，音频暂不支持。"),fe()&&h.appendChild(x),Ge(r)){const L=un.filter(ve=>ve.type===a.outputType),V=r.params.if_model||L[0]?.display_name,_e=Ho(V,a.outputType),Te=d.createElement("div");if(Te.className="knobnote",Te.textContent=`${_e.reference_fallback?"画布兜底引用上限（不代表官方支持）":"画布引用上限"}：图片 ${_e.bridge.image} · 视频 ${_e.bridge.video}。${_e.note} 全部引用上传后的 URL 按「图片1」「视频1」与生成需求一次提交，再轮询产物；是否采用全部引用以 IF 实际返回为准，音频暂不可提交。画面比例、清晰度、时长等参数作为生成内容要求发送，模型不保证严格遵守。`,Object.values(r.assets||{}).some(ve=>ve&&Ct.includes(ve.kind)&&!_e?.bridge?.[ve.kind])&&(Te.textContent+=" 已连接的引用保持原样，但不适用于当前模型；可切回原模型或手动移除，运行时不会忽略它。"),h.appendChild(Te),_e?.source){const ve=d.createElement("a");ve.href=_e.source,ve.target="_blank",ve.rel="noopener noreferrer",ve.textContent="供应商 API 参考文档（不作为 IF 引用上限）",h.appendChild(ve)}}if(f){x.textContent="浏览器本地合成，不占 GPU。已连接的图片打开编辑器时自动加入图层，也可上传图片或从画布素材中选择添加。拖动位置、缩放图片，在图层列表调整遮挡顺序。";const L=d.createElement("div");L.className="knobnote";const V=r.params.composition;L.textContent=V?`编辑稿：${V.width} × ${V.height} · ${V.layers.length} 个图层。保存编辑可继续修改；合成输出后可连接下游。`:"尚未创建编辑稿。点击下方「编辑合成」开始，默认画布 1920 × 1080，可修改尺寸和背景。",h.appendChild(L)}if(_){const L=ja(r);if(L.length){const V=d.createElement("div");V.className="director-supplement",V.textContent=`导演补充（只读，提交时追加到提示词）
`+L.join(`
`),h.appendChild(V)}}const w=p.filter(L=>Ct.includes(L.type));if(w.length)if(f){const L=d.createElement("details");L.open=!0;const V=d.createElement("summary");V.textContent="连接图片素材（打开编辑器时自动加入图层）",L.append(V,Pi(r,w,g)),h.appendChild(L)}else h.appendChild(Pi(r,w,g));if(r.cap==="if_image"){const L=p.find(V=>V.key==="if_reference");L&&h.appendChild(Ro(r,L))}const y=new Set;for(const L of w.filter(V=>(r.assets||{})[V.key])){const V=p.filter(_e=>_e.rangeOf===L.key);if(V.length===2){h.appendChild(jl(r,L,V[0],V[1]));for(const _e of V)y.add(_e.key)}}const M=p.filter(L=>L.type==="textarea"&&!L.advanced),G=M.filter(L=>L.template),Xe=M.filter(L=>!L.template),it=Xe.filter(L=>L.pairWith&&p.some(V=>V.key===L.pairWith));it.length>1&&h.appendChild(gl(r,it));for(const L of Xe)(!it.includes(L)||it.length<2)&&h.appendChild(zi(r,L));for(const L of G)h.appendChild(_l(r,L));const Ke=p.filter(L=>!Ct.includes(L.type)&&L.type!=="textarea"&&(L.type==="seed"||!L.advanced)&&!L.mirror&&!y.has(L.key)),Oe=(L,V)=>{if(L.appendChild(Ro(r,V)),V.hint&&!V.showHint){const _e=d.createElement("div");_e.className="knobnote",_e.textContent=V.hint,L.appendChild(_e)}},gt=d.createElement("div");gt.className="pwrap";for(const L of Ke)c||Oe(gt,L);h.appendChild(gt),r.error&&h.appendChild(Po(r.error));const En=gr(r);En&&h.appendChild(En);const bt=br(r);bt&&h.appendChild(bt);const xt=d.createElement("div");if(xt.className="foot",c){const L=o.id==="card_video"?"生视频模式":o.id==="card_tools"?"工具箱模式":"生图模式",V=ct(r)||o.modes[0],_e=Xr(`${o.icon} ${V.name}`,L,()=>{const Te=ve=>({icon:o.icon,text:ve.name+(Nn(ve,r.cap)?"（当前）":""),tip:()=>fo(r,ve,ve.name),run:()=>{if(Ge(r)&&["queued","running"].includes(r.status))return re("请等待本机 IF 任务结束后再切换模式");Wt(),Pn(),tr(r,Nt(ve,on(r))),ke(e),Kt(r),Q()}});return o.id==="card_video"||o.id==="card_image"?[{group:"本地 API"},...o.modes.filter(ve=>ve.id!=="if_video"&&ve.id!=="if_image").map(Te),{group:"云端 API"},...o.modes.filter(ve=>ve.id==="if_video"||ve.id==="if_image").map(Te)]:o.modes.map(Te)});if(mo(_e,()=>fo(r,V,V.name)),xt.appendChild(_e),V.modelSwitch){const Te=on(r),ve=H=>Kn[H]||H,F=Xr(ve(Te)||a.name,o.id==="card_image"?"生图模型":"深度视频模型",()=>Object.entries(V.modelSwitch).map(([H,me])=>({text:ve(H)+(me===r.cap?"（当前）":""),run:()=>{Wt(),Pn(),tr(r,me),r._model=H,ke(e),Kt(r),Q()}})));xt.appendChild(F)}else if(Ge(r)){const Te=un.filter(H=>H.type===a.outputType),ve=Te.find(H=>H.display_name===r.params.if_model)?.display_name||Te[0]?.display_name,F=Xr(ve||"选择 IF 模型","IF 模型",()=>un.some(H=>H.type===a.outputType)?un.filter(H=>H.type===a.outputType).map(H=>({text:H.display_name+(H.display_name===ve?"（当前）":"")+" · "+zn(H),disabled:["exhausted","unavailable"].includes(H.quota_status),run:()=>{Pn(),r.params.if_model=H.display_name;const me=r._referenceParameters,ie=me&&r.params.duration===me.before.duration;Uo(r),ie&&(me.before.duration=r.params.duration),ke(e),Q()}})):[{text:Gn?"重试连接本机 IF":"正在读取本机 IF 模型…",run:()=>Ln().catch(H=>Pe(H.message))}]);F._openIFModels=F.onclick,F.onclick=async H=>{H.stopPropagation(),kn();const me=_o;F.disabled=!0,F.firstChild.textContent="读取剩余次数…";try{await Ln(!1),_o===me&&m.panel._id===e&&s?.cards.includes(r)&&m.panel.querySelector('button[title="IF 模型 —— 点击换"]')?._openIFModels(H)}catch(ie){Pe("读取 IF 剩余次数失败："+ie.message)}finally{F.disabled=!1,F.firstChild.textContent=ve||"选择 IF 模型"}},xt.appendChild(F)}if(!f){const Te=d.createElement("button");Te.className="tcap";const ve=Vo(r,a);Te.textContent=ve?`⚙ ${ve}`:"⚙ 参数",Te.title=Ge(r)?"点开弹窗：比例、清晰度、时长等以内容发送":"点开弹窗：清晰度、画面比例、时长等参数",Te.dataset.readonlyView="",Te.onclick=F=>{F.stopPropagation(),fs(r,Te)},xt.appendChild(Te)}}const Ne=r.status==="queued"||r.status==="running",nt=d.createElement("span");if(nt.style.cssText="color:#8a8a94;font-size:12px",nt.textContent=f?"本地合成 · 输出 PNG":a.outputType==="video"?"输出：视频":"输出：图片",r.status==="done"&&r.ms>0&&(nt.textContent+=` · 上次 ${sr(r.ms)}`),xt.appendChild(nt),Ne&&r.job&&!Ge(r)){const L=d.createElement("button");L.className="cancel",L.textContent="取消",L.onclick=()=>Pl(r),L.style.marginLeft="auto",xt.appendChild(L)}const _t=d.createElement("button");_t.className="go",_t.textContent=f?"编辑合成":"↑",_t.title=f?"打开图片合成编辑器（不使用 ComfyUI）":"运行",f&&(_t.style.cssText="width:auto;min-width:96px;padding:0 14px;border-radius:8px;font-size:13px;flex-shrink:0"),_t.disabled=Ne,_t.onclick=()=>Ao(r),xt.appendChild(_t),m.panel.appendChild(xt),vt(),h.scrollTop=l,Fa(r),Bn(r)}function Po(e){const t=d.createElement("div");return t.className="err",t.textContent=e,t}function cl(e){const t=d.createElement("div");t.className="pbody",m.panel.appendChild(t);const n=d.createElement("div");n.className="pblock";const r=d.createElement("div");r.className="phd";const o=d.createElement("span");o.textContent="风格描述";const a=d.createElement("span");a.className="demo";const i=d.createElement("button");i.textContent="清空",r.append(o,a,i);const l=d.createElement("textarea");l.placeholder="例：蒂姆·波顿式哥特暗黑定格动画质感，冷青灰色调，强侧光硬阴影，胶片颗粒，浅景深，电影级构图",l.value=String((e.params||{}).style||""),l.style.minHeight="120px";const c=()=>{const x=l.value.trim();a.style.display=x?"none":"",a.textContent="⚠ 还没写，挂着也不起作用"},f=()=>{e.params=e.params||{},e.params.style=l.value,c(),rt(e),Q()};l.oninput=f,i.onclick=()=>{l.value="",f(),l.focus()},c(),n.append(r,l),t.appendChild(n);const u=s.edges.filter(x=>x.from===e.id&&Ze(x)),p=d.createElement("div");p.className="slinks";const g=d.createElement("div");if(g.className="atitle",g.textContent=u.length?`挂着 ${u.length} 个节点`:"还没挂给任何节点",p.appendChild(g),!u.length){const x=d.createElement("div");x.className="anote",x.textContent="把右边那颗点拖到一张生图/生视频节点上；拖到空白处会列出所有写提示词的玩法。",p.appendChild(x)}for(const x of u){const w=s.cards.find(Xe=>Xe.id===x.to);if(!w)continue;const y=d.createElement("div");y.className="slink";const M=d.createElement("button");M.className="nm",M.textContent=he(w),M.title="选中这个节点（面板上能看到合并后的提示词）",M.onclick=()=>Ot(w.id);const G=d.createElement("button");G.className="off",G.textContent="解除",G.title="这个节点不再套用本风格",G.onclick=()=>Jr(x),y.append(M,G),p.appendChild(y)}const h=Re(e);if(h.length){const x=d.createElement("div");x.className="atitle",x.textContent=`顺着连线连带 ${h.length} 张`,p.appendChild(x);for(const w of h){const y=d.createElement("div");y.className="slink down";const M=d.createElement("button");M.className="nm",M.textContent=he(w),M.title="选中这个节点（面板上能看到合并后的提示词）",M.onclick=()=>Ot(w.id);const G=d.createElement("span");G.className="off ro",G.textContent="继承",G.title="上游那个节点传下来的，要断就断它们之间那根产物连线",y.append(M,G),p.appendChild(y)}}t.appendChild(p),vt()}function ul(e){const t=d.createElement("div");t.className="pbody",m.panel.appendChild(t);const n=hn(e),r=d.createElement("div");r.className="pblock";const o=d.createElement("div");o.className="phd";const a=d.createElement("span");a.textContent="手里的素材";const i=d.createElement("span");i.className="demo",o.append(a,i),r.appendChild(o);const l=d.createElement("div");l.className="prow";const c=d.createElement("button");if(c.textContent=n?"换一个文件":"选择文件",c.onclick=()=>To(e),l.appendChild(c),n){const h=d.createElement("button");h.textContent="查看大图",h.onclick=()=>to(n),h.dataset.readonlyView="",l.appendChild(h)}const f=d.createElement("button");f.textContent="清空",f.title="把这份素材扔掉，节点变回空（不会删文件本身）",f.onclick=()=>{e.outputs=[];for(const h of s.edges.filter(x=>x.from===e.id&&!Ze(x)))ra(h);rt(e),zt(e),ke(e.id),Q()},l.appendChild(f),i.textContent=n?(n.origin||n.filename||n.url||"").split(/[\\/]/).pop():"还没有文件",i.title=n&&(n.origin||n.filename||n.url)||"",r.appendChild(l),t.appendChild(r);const u=s.edges.filter(h=>h.from===e.id),p=d.createElement("div");p.className="slinks";const g=d.createElement("div");if(g.className="atitle",g.textContent=u.length?`喂给 ${u.length} 个节点`:"还没喂给任何节点",p.appendChild(g),!u.length){const h=d.createElement("div");h.className="anote",h.textContent=n?"把右边那颗点拖到一个节点上，这份素材就进它的格子。":"先在上面选一个文件，再把出口拖到别的节点上。",p.appendChild(h)}for(const h of u){const x=s.cards.find(G=>G.id===h.to);if(!x)continue;const w=d.createElement("div");w.className="slink";const y=d.createElement("button");y.className="nm",y.textContent=he(x),y.title="选中这个节点",y.onclick=()=>Ot(x.id);const M=d.createElement("button");M.className="off",M.textContent="解除",M.title="这个节点不再收这份素材",M.onclick=()=>Jr(h),w.append(y,M),p.appendChild(w)}t.appendChild(p),vt()}const Mi=[["polish","润色","改得更通顺好读，不加料不改意思"],["optimize","优化","删废话、换具体说法，更精炼有表现力"],["expand","扩写","补细节补过渡，写到 2~3 倍长"],["custom","自定义","按下面写的指令处理文字"]];function fl(e){const t=d.createElement("div");t.className="pbody",m.panel.appendChild(t);const n=e.status==="running";e.params=e.params||{};const r=d.createElement("div");r.className="pblock";const o=d.createElement("div");o.className="phd",o.innerHTML="<span>内容</span>";const a=d.createElement("textarea");if(a.placeholder="在这里写字或直接在节点上写",a.value=String(e.params.text||""),a.disabled=n,a.oninput=()=>{e.params.text=a.value;const h=e._el?e._el.querySelector(".body"):null,x=h?h.querySelector("textarea.ttxt"):null;x&&(x.value=a.value),na(e),Q()},r.append(o,a),t.appendChild(r),e.params.op==="custom"){const h=d.createElement("div");h.className="pblock";const x=d.createElement("div");x.className="phd",x.innerHTML="<span>指令</span>";const w=d.createElement("textarea");w.placeholder="例：把接进来的几段整理成一条朋友圈文案，口语一点，带两个 emoji",w.value=String(e.params.instr||""),w.oninput=()=>{e.params.instr=w.value,Q()},h.append(x,w),t.appendChild(h)}const i=s.edges.filter(h=>h.from===e.id&&Ze(h)),l=d.createElement("div");l.className="slinks";const c=d.createElement("div");if(c.className="atitle",c.textContent=i.length?`连着 ${i.length} 个节点`:"还没连给任何节点",l.appendChild(c),!i.length){const h=d.createElement("div");h.className="anote",h.textContent="把右边那颗点拖到生成节点（并进提示词）或别的文本节点（当输入）上；拖到空白处会列出所有能接的地方。",l.appendChild(h)}for(const h of i){const x=s.cards.find(G=>G.id===h.to);if(!x)continue;const w=d.createElement("div");w.className="slink";const y=d.createElement("button");y.className="nm",y.textContent=he(x),y.title="选中这个节点",y.onclick=()=>Ot(x.id);const M=d.createElement("button");M.className="off",M.textContent="解除",M.title="这个节点不再用这段文本",M.onclick=()=>Jr(h),w.append(y,M),l.appendChild(w)}t.appendChild(l),e.error&&t.appendChild(Po(e.error));const f=d.createElement("div");f.className="foot",f.appendChild(Xr((e.params.model||"api")==="local"?"🖥 本地 27B":"☁ 云端 API","模型",()=>[{icon:"☁",text:"云端 API —— 几秒就回，要配好 llm.json",run:()=>{e.params.model="api",ke(e.id),Q()}},{icon:"🖥",text:"本地 27B —— 不花钱，占显存，第一次慢",run:()=>{e.params.model="local",ke(e.id),Q()}}]));const u=h=>h?(Mi.find(x=>x[0]===h)||[0,h])[1]:"不加工";f.appendChild(Xr(u(e.params.op),"加工方式",()=>[{icon:"✍",text:"不加工 —— 就当一个纯文本节点，只存字",run:()=>{e.params.op="",rt(e),ke(e.id),Q()}},...Mi.map(([h,x,w])=>({icon:"✎",text:`${x} —— ${w}`,run:()=>{e.params.op=h,rt(e),ke(e.id),Q()}}))]));const p=d.createElement("span");if(p.style.cssText="color:#8a8a94;font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap",e._lastRun?p.textContent=(e._lastRun.via==="api"?"上次 ☁":"上次 🖥")+(e._lastRun.ms?` · ${(e._lastRun.ms/1e3).toFixed(1)} 秒`:""):e.params.op?p.textContent="结果写回节点 · 上游改了字，重跑一次就用新的":p.textContent="没选加工方式：这个节点只存字",p.title=p.textContent,f.appendChild(p),typeof e.params._prev=="string"&&e.params._prev!==e.params.text){const h=d.createElement("button");h.className="cancel",h.textContent="↩ 恢复运行前的字",h.title="上一次运行之前的节点上原文（只留这一步）",h.onclick=()=>{e.params.text=e.params._prev,delete e.params._prev,rt(e),ke(e.id),Q()},f.appendChild(h)}const g=d.createElement("button");g.className="go",g.textContent="↑",g.title="运行",g.disabled=n||!e.params.op,g.onclick=()=>Ao(e),f.appendChild(g),m.panel.appendChild(f),vt()}async function ml(e){if(!Fe())return;const t=k(e);if(!t)return re("先在上面选一种加工方式（润色 / 优化 / 扩写 / 自定义）");if(e.status==="running")return re("文本加工正在进行中，请稍候");e.error=null,e.status="running",e.ms=null,rt(e),m.panel._id===e.id&&ke(e.id);try{const n=R(e).map(i=>({name:i.name,text:i.text})),r=en(e);r&&n.unshift({name:"节点上的原文",text:r});const o=await Yt("/api/text",{op:t,model:(e.params||{}).model||"api",inputs:n,params:{instr:String((e.params||{}).instr||"")},project:s&&s.id,projectName:s&&s.name,card:e.id,cardName:he(e)});e.params._prev=String((e.params||{}).text||""),e.params.text=o.text,e.status="done",e.ms=o.ms,e._lastRun=o,Q(),rt(e),m.panel._id===e.id&&ke(e.id);const a=s.edges.filter(i=>i.from===e.id&&Ze(i)).length;re(hl(o)+(a?`
已连给 ${a} 个节点，它们下次运行会用这份新文本`:""))}catch(n){e.status="error",e.error=n.message,Ye.markWorkFailure(n),rt(e),m.panel._id===e.id&&ke(e.id),Pe(n.message)}Q()}function hl(e){const t=e.ms>=6e4?`${Math.floor(e.ms/6e4)} 分 ${Math.round(e.ms%6e4/1e3)} 秒`:`${(e.ms/1e3).toFixed(1)} 秒`;return`${e.via==="api"?"✅ 云端 API":"✅ 本地 27B"}，${t}`+(e.warn?`
⚠ ${e.warn}`:"")}function gl(e,t){const n=ge(e),r=t.filter(i=>(e.assets||{})[i.pairWith]),o=i=>sn(n.inputs.find(l=>l.key===i.pairWith)||i,e),a=d.createElement("div");if(a.className="ptabs",(e._tab==null||e._tab<0||e._tab>=r.length)&&(e._tab=r.length?0:-1),r.length){const i=d.createElement("div");i.className="tabs",r.forEach((l,c)=>{const f=d.createElement("button"),u=String(e.params[l.key]!=null?e.params[l.key]:l.default||"").trim();f.textContent=o(l)+(u?" ●":""),f.className=c===e._tab?"on":"",f.dataset.readonlyView="",f.onclick=()=>{e._tab=c,ke(e.id,fe()?null:e)},i.appendChild(f)}),a.appendChild(i),a.appendChild(zi(e,r[e._tab],o(r[e._tab])+" 的提示词"))}else{const i=d.createElement("div");i.className="tabempty",i.textContent="还没有图片引用。添加图片后，这里才显示对应提示词。",a.appendChild(i)}return a}function zi(e,t,n){const r=d.createElement("div");r.className="pblock";const o=t.key==="negative_prompt",a=o?[]:ue(e).map(en),i=o?[]:R(e),l=q[Ut(e)]||ge(e),c=!!(l&&l.rewrite&&t.key===(z(l)[0]||{}).key),f=c?qr(e,t.key):null,u=!!(f&&e.optUse&&e.optUse[t.key]),p=d.createElement("div");p.className="phd";const g=d.createElement("span"),h=a.length+i.length;g.textContent=(n||t.label)+(h&&!u?`（已并入 ${h} 段文本）`:"");const x=d.createElement("span");x.className="demo",x.textContent="⚠ 这是示例文案，改成你要的内容",p.append(g,x),r.appendChild(p),f&&r.appendChild(bl(e,t,u));const w=d.createElement("textarea");w.placeholder=`${n||t.label}：${o?"描述不希望出现的内容":"描述你想要的画面/动作/镜头"}`;const y=e.promptHeights?.[t.key];Number.isFinite(y)&&y>0&&(w.style.height=y+"px");const M=d.createElement("div");M.className="prompt-highlight-wrapper";const G=d.createElement("div");G.className="prompt-highlight-layer",M.appendChild(G),M.appendChild(w);function Xe(){const F=getComputedStyle(w);for(const me of["fontFamily","fontSize","fontWeight","lineHeight","letterSpacing","wordSpacing","textIndent","paddingTop","paddingRight","paddingBottom","paddingLeft","borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth","boxSizing","width","height"])G.style[me]=F[me];G.style.borderStyle="solid",G.style.borderColor="transparent",G.style.whiteSpace="pre-wrap",G.style.overflowWrap=F.overflowWrap,G.style.wordBreak=F.wordBreak||"normal",G.style.top="0px",G.style.left="0px";const H=w.offsetWidth-w.clientWidth;H>0&&(G.style.paddingRight=parseFloat(F.paddingRight)+H+"px")}let it=u?f:e.params[t.key]!=null?e.params[t.key]:o?t.default??"":"";if(!u&&h>0){const F=[];a.length>0&&a.forEach(me=>{F.push(me)}),i.length>0&&i.forEach(me=>{F.push(me.text)});const H=F.join(`

`);w.value=H+(it?`

`+it:`

`)}else w.value=it;function Ke(){const F=et=>et.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),H=w.value;let me="",ie=0;const be=/@([\u4e00-\u9fa5\w]+)/g;let Ie;for(;!o&&(Ie=be.exec(H));)me+=F(H.slice(ie,Ie.index)),me+=`<mark class="at-mention" data-name="${F(Ie[1])}">${F(Ie[0])}</mark>`,ie=Ie.index+Ie[0].length;me+=F(H.slice(ie)),G.innerHTML=me+`
`,G.scrollTop=w.scrollTop}u&&(w.classList.add("optta"),G.classList.add("opt")),w.addEventListener("wheel",F=>{F.stopPropagation()},{passive:!0}),w.addEventListener("keydown",F=>{if(o||F.isComposing||F.key!=="Backspace"&&F.key!=="Delete"||w.selectionStart!==w.selectionEnd)return;const H=w.selectionStart,me=/@([\u4e00-\u9fa5\w]+)/g;let ie;for(;ie=me.exec(w.value);)if(F.key==="Backspace"?H>ie.index&&H<=ie.index+ie[0].length:H>=ie.index&&H<ie.index+ie[0].length){F.preventDefault(),w.setSelectionRange(ie.index,ie.index+ie[0].length),d.execCommand("delete");return}});let Oe=null,gt=-1;w.addEventListener("input",()=>{Ke();const F=w.selectionStart,me=w.value.substring(0,F).match(/@([\u4e00-\u9fa5\w]*)$/);if(me&&!u&&!o){const ie=me[1].toLowerCase();gt=F-me[0].length;const be=[],Ie=new Set(s.edges.filter(Se=>Se.to===e.id).map(Se=>Se.from));s.cards.forEach(Se=>{if(Se.id===e.id||!(ft(Se)||ut(Se)||ht(Se)))return;const Je=he(Se);if(!Je.toLowerCase().includes(ie))return;const Xt=St(Se);be.push({type:"card",section:"canvas",connected:Ie.has(Se.id),card:Se,name:Je,icon:Xt.icon||"◻",label:ft(Se)?"素材":ut(Se)?"文本":"风格"})});const et=q[Ut(e)]||ge(e);et&&et.inputs&&et.inputs.forEach(Se=>{if(!["image","audio","video"].includes(Se.type))return;const yt=e.assets[Se.key];if(!yt||!yt.ref)return;const Je=sn(Se,e);Je.toLowerCase().includes(ie)&&be.push({type:"slot",section:"current",key:Se.key,name:Je,icon:Se.type==="image"?"🖼":Se.type==="audio"?"🎵":"🎬",label:Ve[Se.type]||"素材"})}),be.length>0?En(w,be):bt()}else bt()});function En(F,H){bt(),Oe=d.createElement("div"),Oe.id="menu",Oe.className="at-menu",Oe.style.position="absolute",Oe.style.maxHeight="280px",Oe.style.overflowY="auto";const me=Je=>{const Xt=d.createElement("button");Xt.className="at-menu-item"+(Je.connected?" connected":"");const Lr=d.createElement("span");Lr.className="at-menu-icon",Lr.textContent=Je.icon;const lr=d.createElement("span");lr.className="at-menu-name",lr.textContent=Je.name;const Pr=d.createElement("span");Pr.className="at-menu-type",Pr.textContent=Je.connected?`已连线 · ${Je.label}`:Je.label,Xt.append(Lr,lr,Pr),Xt.onclick=()=>{const Ir=Je.name,Fo=F.value.substring(0,gt),Tl=F.value.substring(F.selectionStart);F.value=Fo+`@${Ir} `+Tl,F.selectionStart=F.selectionEnd=Fo.length+Ir.length+2,u?e.opt[t.key]=F.value:e.params[t.key]=ve(F.value),Te(),Q(),Ke(),bt(),F.focus()},Oe.appendChild(Xt)};for(const[Je,Xt]of[["current","当前素材"],["canvas","画布"]]){const Lr=H.filter(Ir=>Ir.section===Je).sort((Ir,Fo)=>+!!Fo.connected-+!!Ir.connected);if(!Lr.length)continue;const lr=d.createElement("div");lr.className="at-menu-group";const Pr=d.createElement("span");Pr.textContent=Xt,lr.appendChild(Pr),Oe.appendChild(lr),Lr.forEach(me)}const ie=_t(gt)||(()=>{const Je=F.getBoundingClientRect();return{left:Je.left+8,top:Je.top+8,bottom:Je.top+28}})();d.body.appendChild(Oe);const be=Oe.offsetWidth,Ie=Oe.offsetHeight;let et=ie.left-6,Se=ie.top-Ie-6;Se<8&&(Se=ie.bottom+4),et+be>innerWidth-8&&(et=innerWidth-8-be),et<8&&(et=8),Oe.style.left=et+"px",Oe.style.top=Se+"px";const yt=Je=>{(!Oe||!Oe.contains(Je.target)&&Je.target!==F)&&(bt(),d.removeEventListener("mousedown",yt))};ne(()=>d.addEventListener("mousedown",yt),0)}function bt(){Oe&&(Oe.remove(),Oe=null)}r.appendChild(M),Ke();const xt=new Me(()=>{if(!w.isConnected){xt.disconnect();return}if(!w.offsetHeight)return;Xe(),G.scrollTop=w.scrollTop;const F=parseFloat(w.style.height);Number.isFinite(F)&&F>0&&F!==e.promptHeights?.[t.key]&&fe()&&(e.promptHeights=e.promptHeights||{},e.promptHeights[t.key]=F,Q())});xt.observe(w),w.addEventListener("scroll",()=>{G.scrollTop=w.scrollTop});let Ne=null;function nt(F,H){const me=G.querySelectorAll(".at-mention");for(const ie of me){const be=ie.getClientRects();for(const Ie of be)if(F>=Ie.left&&F<=Ie.right&&H>=Ie.top&&H<=Ie.bottom)return ie}return null}function _t(F){const H=[],me=d.createTreeWalker(G,NodeFilter.SHOW_TEXT);for(;me.nextNode();)H.push(me.currentNode);let ie=0,be=null,Ie=0;for(const yt of H){if(ie+yt.length>F){be=yt,Ie=F-ie;break}ie+=yt.length}if(!be){const yt=H[H.length-1];if(!yt)return null;be=yt,Ie=yt.length}const et=d.createRange();et.setStart(be,Ie),et.setEnd(be,Math.min(Ie+1,be.length));const Se=et.getClientRects()[0]||et.getBoundingClientRect();return Se.width===0&&Se.height===0?null:Se}w.addEventListener("mousemove",F=>{const H=nt(F.clientX,F.clientY);if(w.style.cursor=H?"pointer":"",G.querySelectorAll(".at-mention.mhover").forEach(Ie=>Ie.classList.remove("mhover")),H&&H.classList.add("mhover"),!H)return _e();const me=H.dataset.name;if(!me)return;let ie=null;const be=s.cards.find(Ie=>he(Ie)===me);if(be){const Ie=be.outputs||[];Ie.length>0?ie={type:Ie[0].kind,url:Ie[0].url,name:he(be)}:(ut(be)||ht(be))&&(ie={type:"text",text:en(be)||"(空)",name:he(be)})}if(!ie){const Ie=q[Ut(e)]||ge(e);if(Ie&&Ie.inputs){const et=Ie.inputs.find(Se=>sn(Se,e)===me);et&&e.assets[et.key]&&(ie={type:et.type,url:e.assets[et.key].url,name:me})}}ie?V(H,ie):_e()}),w.addEventListener("mouseleave",_e),w.addEventListener("scroll",()=>{G.scrollTop=w.scrollTop,G.scrollLeft=w.scrollLeft,_e()});let L=null;function V(F,H){if(Ne&&L===H.name)return;_e(),L=H.name,Ne=d.createElement("div"),Ne.className="at-mention-preview",Ne.style.cssText=`
      position: fixed; z-index: 100; background: #060a14f7; border: 1px solid var(--acc);
      border-radius: 3px; padding: 8px; box-shadow: 0 12px 36px #000d, 0 0 18px #00e5ff2e;
      backdrop-filter: blur(6px); max-width: 320px; pointer-events: none;
    `;const me=d.createElement("div");if(me.style.cssText="font-size: 11px; color: var(--acc); margin-bottom: 6px; letter-spacing: 1px;",me.textContent=H.name,Ne.appendChild(me),H.type==="image"){const be=d.createElement("img");be.src=H.url,be.style.cssText="max-width: 300px; max-height: 200px; display: block; border-radius: 2px;",Ne.appendChild(be)}else if(H.type==="video"){const be=d.createElement("video");Zr(be,H.url),be.style.cssText="max-width: 300px; max-height: 200px; display: block; border-radius: 2px;",be.muted=!0,be.autoplay=!0,be.loop=!0,Ne.appendChild(be)}else if(H.type==="audio"){const be=d.createElement("div");be.textContent="🎵 "+H.name,be.style.cssText="padding: 12px; color: var(--txt); text-align: center;",Ne.appendChild(be)}else if(H.type==="text"){const be=d.createElement("div");be.textContent=H.text.substring(0,200)+(H.text.length>200?"...":""),be.style.cssText="color: var(--txt); font-size: 12px; line-height: 1.6; max-height: 150px; overflow: hidden;",Ne.appendChild(be)}const ie=F.getBoundingClientRect();Ne.style.left=ie.left+"px",Ne.style.top=ie.bottom+4+"px",d.body.appendChild(Ne)}function _e(){L=null,Ne&&(Ne.remove(),Ne=null)}const Te=()=>{const F=!o&&!u&&!!t.default&&w.value.trim()===String(t.default).trim();x.style.display=F?"":"none",w.classList.toggle("isdemo",F),G.classList.toggle("demo",F)},ve=F=>{if(!F)return"";if(!h)return F.trim();const H=[];a.length>0&&a.forEach(ie=>H.push(ie)),i.length>0&&i.forEach(ie=>H.push(ie.text));const me=H.join(`

`);return F.startsWith(me)?F.substring(me.length).trim().replace(/^\n+/,""):F.trim()};if(w.oninput=()=>{u?e.opt[t.key]=w.value:e.params[t.key]=ve(w.value),Te(),Q()},Te(),c||!u){const F=d.createElement("div");F.className="ptoolbar";const H=!!e._rwBusy,me=e.params._promptModel||"api",ie=d.createElement("button");ie.className="tbtool model";const be=d.createElement("span");be.textContent=me==="local"?"🖥 本地":"☁ 云端";const Ie=d.createElement("i");Ie.textContent="▾",ie.append(be,Ie),ie.title="模型 —— 点击换",ie.onclick=Je=>{Je.stopPropagation();const Xt=ie.getBoundingClientRect();Mt(Xt.left,Xt.bottom+4,"模型",[{icon:"☁",text:"云端 API —— 几秒就回，要配好 llm.json",run:()=>{e.params._promptModel="api",Q(),_n(e)}},{icon:"🖥",text:"本地 27B —— 不花钱，占显存，第一次慢",run:()=>{e.params._promptModel="local",Q(),_n(e)}}])},F.appendChild(ie);const et=d.createElement("button");et.className="tbtool",et.textContent="🌐 翻译",et.disabled=H,et.title="中→英 / 英→中 自动判断（有道翻译）",et.onclick=()=>yl(e,t),F.appendChild(et);const Se=d.createElement("div");Se.style.cssText="display: flex; gap: 4px; margin-left: auto;";const yt=d.createElement("button");if(yt.className="tbtool",yt.textContent=u?"扔掉这份":"清空",yt.title=u?"删掉优化结果，切回你自己写的原词（原词一直没被动过）":"清空提示词",yt.onclick=()=>{if(u)return delete e.opt[t.key],delete e.optUse[t.key],e.optStyle&&delete e.optStyle[t.key],Q(),_n(e);if(e.params[t.key]="",!u&&h>0){const Je=[];a.length>0&&a.forEach(Xt=>{Je.push(Xt)}),i.length>0&&i.forEach(Xt=>{Je.push(Xt.text)}),w.value=Je.join(`

`)}else w.value="";Te(),w.focus(),Q()},Se.appendChild(yt),c){const Je=d.createElement("button");Je.className="tbtool opt",Je.textContent=H?"⏳ 优化中…":"✨ 优化",Je.disabled=H,Je.title="优化提示词：融入风格、补充细节"+(f?`
已有优化结果，再点会覆盖`:"")+`
接入的文本节点会一起融进结果`,Je.onclick=()=>kl(e,t,me),Se.appendChild(Je)}F.appendChild(Se),r.appendChild(F)}if(e._rwErr&&e._rwErr.key===t.key){const F=d.createElement("div");F.className="rwerr",F.textContent="操作失败："+e._rwErr.msg,r.appendChild(F)}return r}function bl(e,t,n){const r=d.createElement("div");r.className="opttabs";const o=(f,u,p)=>{const g=d.createElement("button");return g.className=f?"on":"",g.textContent=u,g.title=p,g.onclick=()=>{e.optUse=e.optUse||{},e.optUse[t.key]=u!=="原词",Q(),_n(e)},g},a=ot(e).join(`

`),i=e.optStyle&&e.optStyle[t.key]||"",l=a!==i;r.append(o(!n,"原词","你自己写的那段。生成时"+(a?"会在前面拼上接入的文本节点":"原样提交")),o(n,"✨优化后","大模型优化出来的那段，已经是这个模型认的格式。"+(i?`
接入的文本已经融在里面了，生成时不再另外拼`:"")+`
原样提交`));const c=d.createElement("span");return c.className="note",n?l?(c.className="note bad",c.textContent="⚠ "+(i?a?"风格节点换过了，这份里还是旧的":"风格节点摘了，这份里还留着它":"风格节点是优化之后挂的，这份里没有它")+" —— 点「重新优化」",c.title="优化结果是一段写死的文字，风格在优化那一刻就烙进去了，之后改风格节点不会让它跟着变。要么重新优化一次，要么切回「原词」。"):c.textContent=a?"已含接入的文本，提交时不再另拼":"按模型认的格式写好了，原样提交":c.textContent=a?"提交时会拼上接入的文本":"",r.appendChild(c),r}const _n=e=>{m.panel._id===e.id&&ke(e.id)};function xl(e){const t=e.ms>=6e4?`${Math.floor(e.ms/6e4)} 分 ${Math.round(e.ms%6e4/1e3)} 秒`:`${(e.ms/1e3).toFixed(1)} 秒`;return`${e.fallback?`⚠ API 没通（${e.fallback}），本地 27B 兜的`:e.via==="api"?`✅ API 改的（${e.model||"远程"}）`:"✅ 本地 27B 改的"}，${t}`+(e.warn?`
⚠ `+e.warn:"")}function yl(e,t){return D(wl(e,t))}async function wl(e,t){if(!Fe())return;if(e._rwBusy)return re("翻译正在进行中，请稍候");const n=!!(e.optUse&&e.optUse[t.key]),r=n&&e.opt&&e.opt[t.key]?String(e.opt[t.key]):String(e.params[t.key]!=null?e.params[t.key]:t.default||"");if(!r.trim())return re("先写点内容再翻译");e._rwBusy=!0,e._rwErr=null,_n(e);try{const o=await Yt("/api/text",{op:"translate",model:"youdao",inputs:[{name:"原文",text:r}],params:{},project:s&&s.id,projectName:s&&s.name,card:e.id,cardName:he(e)});n?(e.opt=e.opt||{},e.opt[t.key]=o.text):e.params[t.key]=o.text,Q(),e._rwBusy=!1,_n(e),re(`翻译完成 · ${(o.ms/1e3).toFixed(1)} 秒 · ${o.model||"翻译服务"}`+(o.warn?`
${o.warn}`:""))}catch(o){e._rwBusy=!1,e._rwErr={key:t.key,msg:o.message},Ye.markWorkFailure(o),_n(e),Pe("翻译失败："+o.message)}}function Sa(e,t){if(!e||!s)return e;const n=q[Ut(t)]||ge(t);if(!n)return e;const r=new Map;let o=1,a=1,i=1;for(const l of n.inputs||[]){const c=t.assets[l.key];if(!c||!c.ref)continue;const f=sn(l,t);l.type==="image"?r.set(f,`<Picture ${o}>`):l.type==="audio"?r.set(f,`<Audio ${a}>`):l.type==="video"&&r.set(f,`<Video ${i}>`);const u=s.cards.find(p=>(p.outputs||[]).some(g=>g.url&&c.url&&g.url===c.url||g.filename&&c.filename&&g.filename===c.filename));if(u){const p=he(u);l.type==="image"?(r.set(p,`<Picture ${o}>`),o++):l.type==="audio"?(r.set(p,`<Audio ${a}>`),a++):l.type==="video"&&(r.set(p,`<Video ${i}>`),i++)}else l.type==="image"?o++:l.type==="audio"?a++:l.type==="video"&&i++}return e.replace(/@([\u4e00-\u9fa5\w]+)/g,(l,c)=>{const f=r.get(c);if(f)return f;const u=s.cards.find(p=>he(p)===c);return u&&(ut(u)||ht(u))&&en(u)||l})}function vl(e){const t={},n=q[Ut(e)]||ge(e);if(!n)return t;for(const r of n.inputs||[]){const o=e.assets[r.key];if(!o||!o.ref)continue;const a=s.cards.find(i=>(i.outputs||[]).some(l=>l.url&&o.url&&l.url===o.url||l.filename&&o.filename&&l.filename===o.filename));a?t[r.key]=he(a):t[r.key]=sn(r,e)}return t}function kl(e,t,n){return D(Cl(e,t,n))}async function Cl(e,t,n){if(!Fe())return;const r=q[Ut(e)]||ge(e);if(!r||!r.rewrite)return;if(e._rwBusy)return re("优化正在进行中，请稍候");const o=String(e.params[t.key]!=null?e.params[t.key]:t.default||""),a=ot(e);if(!o.trim()&&!a.length)return re("先写一句你想要什么，优化才有东西可改");const i=Sa(o,e);e._rwBusy=!0,e._rwErr=null,_n(e);try{await Yo(e);const l=Na(e),c=await Yt("/api/rewrite",{capability:r.id,params:l.params,assets:l.assets,prompt:i,style:a.join(`

`),model:n||"auto",cardInfo:vl(e),project:s&&s.id,projectName:s&&s.name,card:e.id,cardName:he(e)});console.log("=== /api/rewrite 返回数据 ==="),console.log(JSON.stringify(c,null,2)),console.log("=== r.text 内容 ==="),console.log(c.text),console.log("=========================");let f=c.text||"";f=f.replace(/^[\s\S]*?<\/think>/i,""),f=f.replace(/^[\s\S]*?<\/thinking>/i,""),f=f.replace(/^[\s\S]*?<\/thought>/i,""),f=f.trim(),e.opt=e.opt||{},e.optUse=e.optUse||{},e.optStyle=e.optStyle||{},e.opt[t.key]=f,e.optUse[t.key]=!0,e.optStyle[t.key]=a.join(`

`),Q(),re(xl(c))}catch(l){e._rwErr={key:t.key,msg:l.message},Ye.markWorkFailure(l),Pe("优化失败："+l.message)}e._rwBusy=!1,_n(e)}function _l(e,t){const n=d.createElement("div");n.className="tpl";const r=d.createElement("button");r.className="tplhd",r.dataset.readonlyView="";const o=d.createElement("div");o.style.display="none";const a=d.createElement("textarea");a.value=e.params[t.key]!=null?e.params[t.key]:t.default||"";const i=()=>{const f=a.value.trim()!==String(t.default||"").trim(),u=o.style.display!=="none";r.textContent=`${u?"▾":"▸"} ${t.label}`+(f?"（已被改过，出片结构可能跑偏）":"（预设，默认不用动）"),r.classList.toggle("dirty",f),c.style.display=f?"":"none"};r.onclick=()=>{o.style.display=o.style.display==="none"?"":"none",i()};const l=d.createElement("div");l.className="tplnote",l.textContent="⚠ "+(t.note||"预设参数，改了会影响出片。");const c=d.createElement("button");return c.className="tplrst",c.textContent="恢复预设",c.onclick=()=>{a.value=t.default||"",e.params[t.key]=a.value,i(),Q()},a.oninput=()=>{e.params[t.key]=a.value,i(),Q()},o.append(l,a,c),i(),n.append(r,o),n}function Kt(e){if(!e._el)return;const t=e._el.querySelector(".ch .t");t.textContent=he(e),t.classList.toggle("named",!!e.name),zt(e),Li(e)}function zt(e){Wr(e);const t=e._el&&e._el.querySelector(".cf .kt");if(!t)return;if(ht(e)){t.dataset.kind="style",t.textContent="🎨 只加提示词",t.title="这个节点不生成任何东西：把它的出口拖到生图/生视频节点上，提交时这段风格会并进那个节点的提示词";return}if(Ht(e)){t.style.display="",t.dataset.kind="text",t.textContent="✍ 文本",t.title=k(e)?"选了加工方式：点「↑ 运行」把接进来的文本加工后写回这个节点":"存一段文字：连到生成节点就并进提示词，连到别的文本节点就当它的输入；在面板里选加工方式可以让大模型来加工";return}if(ft(e)){const p=hn(e);t.style.display="",t.dataset.kind=p?p.kind:"both";const g=p&&p.width&&p.height?` ${p.width}×${p.height}`:"";t.textContent=p?`📎 ${Ve[p.kind]||p.kind}${g}`:"📎 空的",t.title=p?`${p.origin||""}
把右边的出口拖到别的节点 → 这份素材就进那个节点的格子里`:"点这个节点选一个文件（图片 / 视频 / 音频都收）";const h=e._el.querySelector(".body");!p&&h&&h.querySelector(".ph")&&(h.innerHTML=Er(e));return}const n=ct(e),r=Qa(e),o=Za(e);t.dataset.kind=r?"both":o;const a=(e.outputs||[])[0],i=a&&a.width&&a.height?` ${a.width}×${a.height}`:"";t.textContent=r?"🖼🎬 跟素材":o==="video"?`🎬 视频${i}`:`🖼 图片${i}`;const l=((ge(e)||{}).inputs||[]).filter(p=>Ct.includes(p.type)),c=n&&n.route?Object.keys(n.route):[...new Set(l.map(p=>p.type))],f=[...new Set(l.filter(p=>p.required).map(p=>p.type))];t.title=(r?"放图片就出图片、放视频就出视频":`这个节点出${Ve[o]}`)+(f.length?`；必需${f.map(p=>Ve[p]||p).join(" / ")}素材`:c.length?`；可引用${c.map(p=>Ve[p]||p).join(" / ")}素材`:"；不用素材");const u=e._el.querySelector(".body");!ut(e)&&u&&u.querySelector(".ph")&&(u.innerHTML=Er(e))}function Li(e){const t=e._el&&e._el.querySelector(".inport");if(!t)return;const n=ct(e),r=ge(e);if(ft(e)){t.style.display="none";return}const o=Ht(e),a=n&&n.route?Object.keys(n.route):[...new Set((r?r.inputs:[]).filter(l=>Ct.includes(l.type)).map(l=>l.type))];if(!a.length&&!o){t.style.display="none";return}const i=!ut(e)&&z(r).length;t.style.display="",t.title=o?"文本节点的出口拖到这里：接进来的文字都是这段加工的输入（按连线顺序）":a.length?`上游节点的产物拖到这里（收${a.map(l=>Ve[l]||l).join(" / ")}${i?"，也收文本节点":""}）`:"文本节点的出口拖到这里"}const $a="application/x-chouka-image-slot";function El(e,t,n,r){const o=t.map(g=>g.key),a=o.indexOf(n),i=o.indexOf(r);if(a<0||i<0||a===i)return!1;const l=o.map(g=>({key:g,asset:e.assets[g]})),[c]=l.splice(a,1);l.splice(i,0,c);const f=Object.fromEntries(l.map((g,h)=>[g.key,o[h]]));l.forEach((g,h)=>{e.assets[o[h]]=g.asset});const u=ge(e),p=new Map((u&&u.inputs||[]).filter(g=>g.pairWith).map(g=>[g.pairWith,g.key]));if(o.every(g=>p.has(g))){const g=l.map((x,w)=>({from:p.get(x.key),to:p.get(o[w])}));for(const x of[e.params,e.opt,e.optUse,e.optStyle]){if(!x)continue;const w=g.map(y=>({to:y.to,has:Object.prototype.hasOwnProperty.call(x,y.from),value:x[y.from]}));for(const y of g)delete x[y.to];for(const y of w)y.has&&(x[y.to]=y.value)}const h=o.filter(x=>p.has(x));Number.isInteger(e._tab)&&h[e._tab]&&(e._tab=h.indexOf(f[h[e._tab]]))}for(const g of s&&s.edges||[])g.to!==e.id||Ze(g)||(f[g.slot]&&(g.slot=f[g.slot]),Array.isArray(g.slots)&&(g.slots=g.slots.map(h=>f[h]||h)));return!0}function Sl(e,t,n,r){if(r.length<2)return;n.draggable=!0,n.classList.add("sortable"),n.title+=`
拖拽可调整图片顺序`;const o=a=>Array.from(a.dataTransfer&&a.dataTransfer.types||[]).includes($a);n.ondragstart=a=>{if(!Fe())return a.preventDefault();n._skipClick=!0,a.dataTransfer.effectAllowed="move",a.dataTransfer.setData($a,t.key),$e(()=>n.classList.add("dragging"))},n.ondragenter=a=>{o(a)&&(a.preventDefault(),a.stopPropagation(),n.classList.add("drop-target"))},n.ondragover=a=>{o(a)&&(a.preventDefault(),a.stopPropagation(),a.dataTransfer.dropEffect="move")},n.ondragleave=a=>{n.contains(a.relatedTarget)||n.classList.remove("drop-target")},n.ondrop=a=>{if(!o(a))return;a.preventDefault(),a.stopPropagation(),n.classList.remove("drop-target");const i=a.dataTransfer.getData($a);El(e,r,i,t.key)&&(zt(e),Qe(),Rt(),ke(e.id),Q())},n.ondragend=()=>{n.classList.remove("dragging","drop-target"),ne(()=>{n._skipClick=!1},0)}}function Pi(e,t,n){const r=ge(e),o=d.createElement("div");o.className="slots refs";const a=t.filter(p=>(e.assets||{})[p.key]),i=n&&n.route,l=[...new Set(t.map(p=>p.type))],c=d.createElement("div");if(c.className="refhead",i)c.textContent="引用上限：素材 1 个";else{const p=[];for(const g of l){const h=Jn(r,g);h&&p.push(`${Ve[g]||g} ${h}`)}c.textContent=p.length?`引用上限：${p.join(" · ")}`:"当前模型不支持画布素材引用"}o.appendChild(c);const f=a.filter(p=>p.type==="image");for(const p of a){const g=$l(e,p);p.type==="image"&&Sl(e,p,g,f),o.appendChild(g)}const u=d.createElement("div");if(u.className="refadds",i){if(!a.length&&t.length){const p=d.createElement("button");p.className="refadd",p.textContent="＋ 添加素材（0/1）",p.title="可引用图片或视频，上限 1 个",p.onclick=()=>Io(e,t[0]),u.appendChild(p)}}else for(const p of l){const g=Jn(r,p),h=a.filter(y=>y.type===p).length,x=t.find(y=>y.type===p&&!(e.assets||{})[y.key]);if(!g||h>=g||!x)continue;const w=d.createElement("button");w.className="refadd",w.textContent=`＋ 添加${Ve[p]||p}（${h}/${g}）`,w.title=`${Ve[p]||p}引用上限 ${g}`,w.onclick=()=>Io(e,x),u.appendChild(w)}return u.childElementCount&&o.appendChild(u),o}function $l(e,t){const n=e.assets[t.key],r=d.createElement("div");r.className="slot"+(n?" filled":t.required?" req":""),r.dataset.key=t.key,r.title=(t.hint||sn(t,e))+(t.required?"（必填）":"")+(n?`
单击预览；右键更换、下载或清空素材`:`
单击上传素材`),r.innerHTML='<div class="box"></div><span class="lbl"></span>',r.querySelector(".lbl").textContent=sn(t,e);const o=r.querySelector(".box");return n?(o.innerHTML=n.kind==="image"?`<img src="${n.url}" draggable="false">`:n.kind==="video"?`<video data-video-url="${n.url}" muted draggable="false"></video>`:"🎵",_i(o)):o.textContent=t.type==="audio"?"🎵":t.type==="video"?"🎬":qa(t)?"田":"＋",r.onclick=()=>{if(!r._skipClick)return n?to(n):Io(e,t)},r.oncontextmenu=a=>{a.stopPropagation(),a.preventDefault(),n&&Mt(a.clientX,a.clientY,n.origin||sn(t,e),[{icon:"⛶",text:n.kind==="image"?"查看大图":"放大播放",run:()=>to(n)},{icon:"↻",text:"更换素材",run:()=>Io(e,t)},{icon:"↓",text:"下载素材",run:()=>Kr({...n,filename:n.origin||n.filename||n.url})},{icon:"✕",text:"清空这一格",danger:!0,run:()=>{delete e.assets[t.key],ni(e.id,t.key),zt(e),Qe(),Rt(),ke(e.id),Q()}}])},r}const Ii=e=>{const t=String(e??"").split(":"),n=t.length>1?+t[0]*60+ +t[1]:+t[0];return Number.isFinite(n)?Math.max(0,Math.round(n)):0},ro=e=>`${Math.floor(e/60)}:${String(Math.round(e)%60).padStart(2,"0")}`;function jl(e,t,n,r){const o=d.createElement("div");o.className="arange";const a=d.createElement("div");a.className="atitle",a.textContent="用音频的哪一段",o.appendChild(a);const i=e.assets[t.key];if(!i){const Ne=d.createElement("div");return Ne.className="anote",Ne.textContent=`先在上面的「${sn(t,e)}」传一段音频，这里就能试听、拖着选要用的一段。`,o.appendChild(Ne),o}const l=d.createElement("audio");l.src=i.url,l.preload="metadata",o.appendChild(l);const c=d.createElement("div");c.className="atrack",c.innerHTML='<div class="asel"></div><div class="ahead"></div><div class="ahd s" title="拖动：选段从这里开始"></div><div class="ahd e" title="拖动：选段到这里结束"></div>';const f=c.querySelector(".asel"),u=c.querySelector(".ahead"),p=c.querySelector(".ahd.s"),g=c.querySelector(".ahd.e");o.appendChild(c);const h=d.createElement("div");h.className="aout",o.appendChild(h);const x=d.createElement("div");x.className="abtn",o.appendChild(x);const w=d.createElement("div");w.className="anote",w.textContent="点条子上任意位置就从那儿开始听；听到该起／该停的地方，按下面两个按钮把边界钉在那里。",o.appendChild(w);let y=Ii(e.params[n.key]!=null?e.params[n.key]:n.default),M=Ii(e.params[r.key]!=null?e.params[r.key]:r.default);const G=()=>Math.floor(l.duration)||Math.max(M,1);function Xe(Ne,nt){const _t=G();if(Ne=Math.max(0,Math.min(Math.round(Ne),_t-1)),nt=Math.max(Ne+1,Math.min(Math.round(nt),_t)),Ne===y&&nt===M)return xt();y=Ne,M=nt,e.params[n.key]=ro(y),e.params[r.key]=ro(M),xt(),Q()}l.onloadedmetadata=()=>Xe(y,M);let it=0;const Ke=(Ne,nt)=>{it=nt,l.currentTime=Ne,l.play()};l.ontimeupdate=()=>{it&&l.currentTime>=it&&l.pause(),xt()},l.onplay=l.onpause=l.onended=()=>xt();const Oe=(Ne,nt,_t)=>{const L=d.createElement("button");return L.textContent=Ne,L.title=nt,L.onclick=_t,x.appendChild(L),L},gt=Oe("▶ 试听选段","只放选中的这一段",()=>l.paused?Ke(y,M):l.pause());Oe("▶ 整条","从头放到尾，用来找该从哪儿起",()=>Ke(0,0)),Oe("⇤ 起点钉在这","把选段开头挪到当前播放位置",()=>Xe(Math.floor(l.currentTime),M)),Oe("终点钉在这 ⇥","把选段结尾挪到当前播放位置",()=>Xe(y,Math.ceil(l.currentTime)));const En=Ne=>{const nt=c.getBoundingClientRect();return Math.max(0,Math.min(1,(Ne.clientX-nt.left)/nt.width))*G()},bt=Ne=>nt=>{nt.stopPropagation(),nt.preventDefault();const _t=V=>Ne==="s"?Xe(En(V),M):Xe(y,En(V)),L=()=>{Z.removeEventListener("mousemove",_t),Z.removeEventListener("mouseup",L)};Z.addEventListener("mousemove",_t),Z.addEventListener("mouseup",L)};p.onmousedown=bt("s"),g.onmousedown=bt("e"),c.onmousedown=Ne=>{Ne.stopPropagation(),l.currentTime=En(Ne),xt()};function xt(){const Ne=G(),nt=_t=>Math.max(0,Math.min(_t,Ne))/Ne*100+"%";f.style.left=nt(y),f.style.width=(Math.min(M,Ne)-y)/Ne*100+"%",p.style.left=nt(y),g.style.left=nt(M),u.style.left=nt(l.currentTime),h.textContent=`${ro(y)} → ${ro(M)}　选中 ${M-y} 秒`+(l.duration?`　（整条 ${ro(Math.floor(l.duration))}）`:""),gt.textContent=l.paused?"▶ 试听选段":"⏸ 停"}return xt(),o}function Io(e,t){if(!Fe())return;const n=ct(e),r=n&&n.route&&Object.keys(n.route).length>1&&Object.values(n.route).some(o=>o.slot===t.key);m.picker.accept=r?Object.keys(n.route).map(o=>`${o}/*`).join(","):t.type==="audio"?"audio/*":t.type==="video"?"video/*":"image/*",m.picker.onchange=()=>D((async()=>{const o=m.picker.files[0];if(m.picker.value="",!!o)try{rs(e,t,await Pt(o,ge(e)?.execution==="browser")),ke(e.id),Q()}catch(a){Ye.markWorkFailure(a),Pe("上传失败："+a.message)}})()),m.picker.click()}function To(e,t){Fe()&&(m.picker.accept="image/*,video/*,audio/*",m.picker.onchange=()=>D((async()=>{const n=m.picker.files[0];if(m.picker.value="",!!n)try{const r=await Pt(n);t?await t(r):await oo(e,r)}catch(r){Ye.markWorkFailure(r),Pe("上传失败："+r.message)}})()),m.picker.click())}async function oo(e,t,n=!0){if(!Fe()||!s.cards.includes(e))return;e.outputs=[{...t,filename:(t.origin||t.url).split(/[\\/]/).pop()}],delete e.w,delete e.h,Tn(e),rt(e),Kt(e),n&&ke(e.id),Qe(),Q();const r=s.edges.filter(o=>o.from===e.id&&!Ze(o));for(const o of r){const a=s.cards.find(i=>i.id===o.to);if(!(!a||!a.assets)){for(const i of gn(o))a.assets[i]=JSON.parse(JSON.stringify(e.outputs[0]));Bn(a),zt(a)}}if(t.kind==="image"){const o=new Image;o.onload=()=>{if(!s?.cards.includes(e)||e.outputs[0]?.url!==t.url)return;const a=o.naturalWidth,i=o.naturalHeight;e.outputs[0].width=a,e.outputs[0].height=i,zt(e),Q()},o.src=t.url}else if(t.kind==="video"){const o=d.createElement("video");o.onloadedmetadata=()=>{if(!s?.cards.includes(e)||e.outputs[0]?.url!==t.url)return;const a=o.videoWidth,i=o.videoHeight;e.outputs[0].width=a,e.outputs[0].height=i,zt(e),Q()},Zr(o,t.url)}}function Nl(){Fe()&&s&&To(null,e=>{const t=ia(),n=bn("card_asset",t.x,t.y);n&&(oo(n,e),re(`已放进一个素材节点（${Ve[e.kind]||e.kind}）：把它右边那颗点拖到生图/生视频/工具节点上，这份素材就进那个节点的格子`))})}function Ro(e,t){const n=d.createElement("div");n.className="row";const r=d.createElement("label");r.textContent=t.label,r.title=t.hint||t.label,n.appendChild(r);const o=e.params[t.key]!=null?e.params[t.key]:t.type==="seed"?-1:t.default;if(Ge(e)&&t.key==="duration"){const a=d.createElement("input");a.type="number",a.min=t.min,t.max!=null&&(a.max=t.max),a.step=1,a.required=!0,a.value=o,a.style.width="72px";const i=t.max!=null?d.createElement("input"):null;i&&(i.type="range",i.min=t.min,i.max=t.max,i.step=1,i.value=o,i.oninput=()=>{a.value=i.value,e.params.duration=Number(i.value),Q()},n.appendChild(i)),a.oninput=()=>{e.params.duration=a.value===""?"":Number(a.value),i&&(i.value=a.value),Q()},a.onchange=()=>{Uo(e),a.value=e.params.duration,i&&(i.value=a.value),Q()},n.appendChild(a)}else if(t.type==="slider"){const a=d.createElement("input");a.type="range",a.min=t.min!=null?t.min:1,a.max=t.max!=null?t.max:30,a.step=t.step||1;const i=q[Ut(e)]||ge(e),l=ds(e,i);if(t.key==="duration"&&l&&!i.inputs.some(u=>u.key==="preview_seconds")){const u=[+l.duration,+o].filter(p=>Number.isFinite(p)&&p>0);a.min=Math.min(+a.min,...u),a.max=Math.max(+a.max,...u),a.step="any"}const c=d.createElement("input");c.type="number",c.min=a.min,c.max=a.max,c.step=a.step,c.style.width="72px",a.value=c.value=o??a.min;const f=u=>{a.value=c.value=u,e.params[t.key]=parseFloat(u),Q()};a.oninput=()=>f(a.value),c.oninput=()=>f(c.value),n.appendChild(a),n.appendChild(c)}else if(t.type==="seed"){const a=d.createElement("input");a.type="number",a.style.flex="1",a.value=o??-1,a.oninput=()=>{e.params[t.key]=a.value===""?-1:parseInt(a.value),Q()};const i=d.createElement("button");i.className="dice",i.textContent="🎲 随机",i.title="-1 = 每次随机",i.onclick=()=>{a.value=-1,e.params[t.key]=-1,Q()},n.appendChild(a),n.appendChild(i)}else if(t.type==="textarea"){const a=d.createElement("textarea");a.style.flex="1",a.style.minHeight="48px",a.value=o??"",a.oninput=()=>{e.params[t.key]=a.value,Q()},n.appendChild(a)}else if(t.type==="select"&&t.appearance==="switch"){const a=d.createElement("button");a.type="button",a.className="param-switch",a.id=`param-${e.id}-${t.key}`,r.htmlFor=a.id,a.setAttribute("role","switch"),a.setAttribute("aria-label",t.label);const i=d.createElement("span");i.className="param-switch-track",i.setAttribute("aria-hidden","true");const l=d.createElement("span");l.className="param-switch-thumb",i.appendChild(l);const c=d.createElement("span");c.className="param-switch-state",c.setAttribute("aria-hidden","true"),a.append(i,c);const f=()=>{const u=(e.params[t.key]??t.default)==="on";a.setAttribute("aria-checked",String(u)),c.textContent=u?"开启":"关闭"};a.onclick=()=>{e.params[t.key]=a.getAttribute("aria-checked")==="true"?"off":"on",f(),Q()},f(),n.appendChild(a)}else if(t.type==="select"&&t.options){const a=d.createElement("select");a.style.flex="1";for(const i of t.options){const l=d.createElement("option");l.value=typeof i=="object"?i.value:i,l.textContent=typeof i=="object"?i.label:i,a.appendChild(l)}o!=null&&(a.value=o),a.onchange=()=>{e.params[t.key]=a.value,Q(),t.key==="aspect_ratio"&&ke(e.id)},n.appendChild(a)}else{const a=d.createElement("input");a.type=t.type==="number"?"number":"text",t.min!=null&&(a.min=t.min),t.max!=null&&(a.max=t.max),a.value=o??"",a.style.flex="1",a.oninput=()=>{e.params[t.key]=a.type==="number"?a.value===""?"":parseFloat(a.value):a.value,Q()},n.appendChild(a)}if(t.warnAbove!=null&&t.warning){const a=d.createElement("div");a.className="paramwarn";const i=()=>{const l=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default);a.hidden=!isFinite(l)||l<=t.warnAbove,a.textContent=t.warning};for(const l of n.querySelectorAll("input, select"))l.addEventListener("input",i),l.addEventListener("change",i);i(),n.appendChild(a)}if(t.showHint&&t.hint){const a=d.createElement("div");a.className="knobnote",a.id=`param-${e.id}-${t.key}-hint`,a.textContent=t.hint;const i=[...n.querySelectorAll("input, select, textarea, button")];for(const[l,c]of i.entries())c.id=`param-${e.id}-${t.key}-${l}`,c.setAttribute("aria-describedby",a.id),c.setAttribute("aria-label",t.label+(l?"数值":""));i.length&&(r.htmlFor=i[0].id),n.appendChild(a)}return(t.key==="megapixels"||t.key==="scale_to_length")&&zl(e,t,n),t.key==="frame_load_cap"&&Ml(e,t,n),n}async function Ml(e,t,n){const r=Object.values(e.assets||{}).find(c=>c&&c.kind==="video"),o=d.createElement("span");o.className="resout";const a=d.createElement("div");if(a.className="resline",a.appendChild(o),n.appendChild(a),!r){o.textContent="放进视频后这里显示总帧数";return}let i="读取总帧数…";const l=()=>{if(!r.frames){o.textContent=i;return}const c=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default)||0;o.textContent=`这段共 ${r.frames} 帧`+(r.fps?` · ${(+r.fps).toFixed(0)} fps · ${(+r.duration).toFixed(1)} 秒`:"")+(c>0&&c<r.frames?` → 只跑前 ${c} 帧`:" → 整段都跑")};l();for(const c of n.querySelectorAll("input"))c.addEventListener("input",l);if(!r.frames){try{Object.assign(r,await kt("/api/media?ref="+encodeURIComponent(r.ref)+"&project="+encodeURIComponent(s.id))),r.frames&&Q()}catch(c){Pe(`读取媒体信息失败：${c.message}`)}i="总帧数读不出来（填 0 = 整段，一定没错）",l()}}function zl(e,t,n){const o=ge(e).inputs.find(g=>g.key==="aspect_ratio"),a=o?e.params.aspect_ratio!=null?e.params.aspect_ratio:o.default:"16:9 (Widescreen)",i=d.createElement("span");i.className="resout";const l=[...n.querySelectorAll("input")],c=()=>{const g=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default);if(!isFinite(g)){i.textContent="";return}if(t.key==="megapixels"){const[h,x]=cr(a,g);i.textContent=`${h}×${x} · ${Math.min(h,x)}p`,i.title=`${a}，${g} 百万像素`}else i.textContent=`16:9 素材 → ${Math.round(g)}×${Hi(g)} · ${Hi(g)}p`,i.title="长边固定为这个值，短边按素材原比例算，所以 p 数随素材变"},f=g=>{for(const h of l)h.value=g;e.params[t.key]=g,c(),Q()},u=d.createElement("span");u.className="presets";for(const g of pr){const h=t.key==="megapixels"?Qi(a,g):Gi[g],x=d.createElement("button");x.textContent=g+"p",h>t.max?(x.disabled=!0,x.title=t.key==="megapixels"?`${a} 下 ${g}p 需要 ${h} 百万像素，超过当前参数上限 ${t.max}`:`最长边 ${h}px 超过当前参数上限 ${t.max}`):(x.title=t.key==="megapixels"?`${cr(a,h).join("×")} · 短边 ${g}p`:`16:9 素材约 ${g}p；最长边 ${h}px，实际短边随素材比例变化`,x.onclick=()=>f(h)),u.appendChild(x)}const p=d.createElement("div");p.className="resline",p.append(i,u),n.appendChild(p);for(const g of l)g.addEventListener("input",c);c()}function Oo(e,t=s){return t?.director?.shots?.find(n=>n.id===e.director_shot||n.image?.card===e.id||n.video?.card===e.id)}function ja(e){const t=Oo(e);if(!t)return[];const n=[];return t.shotSize&&n.push("景别："+t.shotSize),(e.director_stage==="video"||t.video?.card===e.id)&&t.movement&&n.push("运镜："+t.movement),s.director.style?.trim()&&n.push("统一画面风格："+s.director.style.trim()),n}function Na(e){const t=q[Ut(e)]||ge(e),n={},r={},o=ot(e),a=ja(e),i=new Set(z(t).map(l=>l.key));for(const l of t.inputs){if(Ct.includes(l.type)||l.mirror)continue;const c=e.params[l.key];if(c!=null?n[l.key]=c:l.type==="seed"?n[l.key]=-1:l.default!==void 0&&(n[l.key]=l.default),!i.has(l.key))continue;const f=Dr(e,l.key);if(f!=null)n[l.key]=f;else{let u=Sa(n[l.key],e);o.length&&(u=co(u,o)),n[l.key]=u}a.length&&l.key==="prompt"&&(n[l.key]+=`
`+a.join(`
`))}if(ss(t,n),t.imageControls){const l=Xo(e,t);n.image_ratio=l.ratio,n.image_clarity=l.clarity;for(const c of qo)delete n[c]}for(const l of t.inputs.filter(c=>Ct.includes(c.type))){const c=e.assets[l.key];c&&c.ref&&(r[l.key]=c.ref)}return{capability:t.id,params:n,assets:r,project:s&&s.id,projectName:s&&s.name,card:e.id,cardName:he(e)}}function Ao(e){return e._ifRestoring?(re("正在查询原产物，请勿重复生成"),Promise.resolve()):(e._runPromise||(e._runPromise=D(Ll(e).finally(()=>{delete e._runPromise}))),e._runPromise)}function Ti(e,t){!Ge(e)||!fe()||!yn(e,t)||(e._ifResumePreparing?(delete e._ifResumePreparing,e._runPromise=D(Ri(e,!0).finally(()=>{delete e._runPromise}))):e.status==="running"&&(e.job?ao(e,t):e.if_request_id&&Ma(e,t)))}async function Ma(e,t){if(e._ifRecovering||s?.id!==t||!fe()||!s.cards.includes(e)||!Ge(e)||!yn(e,t)||e.job||e.status!=="running"||!e.if_request_id)return;e._ifRecovering=!0;let n=!1;try{const r=await an(`/requests/${encodeURIComponent(e.if_request_id)}`);if(s?.id!==t||!fe()||!s.cards.includes(e))return;e.job=r.id,e.error=null,e.step="本机 IF 已接收原请求，正在恢复进度";const o=Ar(e,t);o.job=r.id,Bt(o),Mr(e,{id:r.id,capability:e.if_job_cap||e.cap,prompts:e.if_pending_prompts||[]}),delete e.if_pending_prompts,Tt(e,t,"running"),await mn(e,t),ao(e,t)}catch(r){if(s?.id!==t||!s.cards.includes(e))return;n=r instanceof TypeError||r.status>=500||r.status===404&&Date.now()-(e.if_submitted_at||e.if_started)<12e4,e.step=n?"正在向本机 IF 确认原请求，请勿重复生成":"",n||(e.status="error",e.error="IF 提交结果尚未确认，请先在 IF 查看是否已创建任务，避免重复生成："+r.message),Tt(e,t,"submitting"),n||(Pe(e.error),await mn(e,t))}finally{e._ifRecovering=!1,s?.id===t&&s.cards.includes(e)&&(rt(e),m.panel._id===e.id&&ke(e.id),n&&ne(()=>Ma(e,t),2500))}}async function Ri(e,t=!1){const n=s,r=e.cap,o=[];let a=!1,i=!1;e.status="queued",e.error=null,e.progress=null,e.job=null,e.ms=null,e.step="正在连接本机 IF 并读取模型",e.if_job_cap=r,t||(e.if_started=Date.now(),e.if_request_id=Array.from(crypto.getRandomValues(new Uint8Array(16)),c=>c.toString(16).padStart(2,"0")).join("")),delete e.if_submitted_at,delete e.if_pending_prompts,delete e.if_canvas_url;const l=Tt(e,n.id,"preparing");rt(e),m.panel._id===e.id&&ke(e.id);try{if(!l)throw new Error("无法保存 IF 刷新恢复记录，尚未提交生成；请检查浏览器存储空间和权限");const c=await ur(n.id);if(!c.ok)throw new Error("任务准备状态保存失败，尚未提交 IF："+(c.error?.message||"请重试"));const f=await Ln();if(!Mn)throw new Error("请更新本机 IF 桥接器后重试；当前版本不支持提交期间刷新恢复");if(await Yo(e),s!==n||!fe()||!n.cards.includes(e)||e.cap!==r)throw new Error("画布已切换或权限已变化，已取消 IF 提交");const u=ge(e).outputType,p=f.filter(L=>L.type===u).find(L=>L.display_name===e.params.if_model)||!e.params.if_model&&f.find(L=>L.type===u);if(!p)throw new Error("当前 IF 模型不可用，请重新选择模型");if(["exhausted","unavailable"].includes(p.quota_status))throw new Error(`${p.display_name}：${zn(p)}，尚未提交生成，请选择其他模型`);const g=String(e.params.prompt||""),h=g.trim();if(!h)throw new Error("请先填写 IF 生成需求");const x=Ho(p.display_name,u),w=Object.entries(e.assets||{}).filter(([,L])=>L&&Ct.includes(L.kind)).sort(([L],[V])=>L.localeCompare(V,void 0,{numeric:!0})),y={image:0,video:0,audio:0};for(const[L,V]of w){const _e=L.match(/^(?:images|video)\[(\d+)\]$/);if(!_e||V.kind==="image"!==L.startsWith("images["))throw new Error(`引用槽位与${Ve[V.kind]||V.kind}类型不匹配，请重新连接引用`);if(Number(_e[1])>=(x.bridge[V.kind]||0))throw new Error(`所选模型最多引用图片 ${x.bridge.image} 张、视频 ${x.bridge.video} 个；当前引用槽位超出范围，请移除多余引用或更换模型`);y[V.kind]++}if(Object.keys(y).some(L=>y[L]>(x.bridge[L]||0)))throw new Error("引用数量超出所选 IF 模型的画布槽位");const M={type:u,model:p.display_name,request_id:e.if_request_id,prompt:co(Sa(h,e),ot(e))},G=ja(e);G.length&&(M.prompt+=`
`+G.join(`
`));const Xe=ge(e),it=Xe.inputs,Ke=[];if(u==="image"){const{ratio:L,clarity:V}=Xo(e,Xe),[_e,Te]=L.split(":").map(Number),ve=Jo.find(me=>me.id===V).val,F=_e>=Te?Math.round(ve*_e/Te/16)*16:ve,H=_e>=Te?ve:Math.round(ve*Te/_e/16)*16;Ke.push(`分辨率：${F}×${H}`)}else{const L=it.find(Ie=>Ie.key==="aspect_ratio"),V=it.find(Ie=>Ie.key==="megapixels"),_e=e.params.aspect_ratio??L.default,Te=Number(e.params.megapixels??V.default),ve=Pa(e,Xe),F=ve?[ve.width,ve.height]:cr(_e,Number.isFinite(Te)&&Te>=V.min&&Te<=V.max?Te:V.default),H=it.find(Ie=>Ie.key==="duration"),me=Number(e.params.duration??H.default);if(!Number.isSafeInteger(me)||me<H.min||H.max!=null&&me>H.max)throw new Error(H.max!=null?`当前 IF 模型时长须为 ${H.min}–${H.max} 秒的整数，请修改时长`:"当前 IF 模型时长范围未核实，请输入正整数秒");const[ie,be]=so[_e]||[1,1];Ke.push(`分辨率：${F[0]}×${F[1]}`,`时长：${me}s`,`画面比例：${ie} : ${be}`)}M.prompt+=`

${Ke.join(`
`)}`;const Oe=u==="video"?"视频":"图片",gt=u==="video"?"图片、":"",En=u==="video"?"不要改为生图":"不要改为视频或文字方案";if(M.prompt=`最终交付必须是${Oe}文件，不是${gt}故事板或文字方案。用户已经确认生成需求，请直接生成${Oe}；不要等待用户确认规划、分镜或中间图片，也不要把中间图片当作最终结果。如无法直接完成，请说明原因，${En}。以本条${Oe}目标和以下参数要求为准。

${M.prompt}`,u==="image"&&e.params.if_reference?.trim()){if(!x.bridge.image&&!x.bridge.video)throw new Error("该模型不支持已确认的媒体引用");M.image=e.params.if_reference.trim()}const bt=Ar(e,n.id);bt.pending=[],bt.job=null;const xt=L=>JSON.stringify([L.kind,new Ce(L.url,location.href).href,L.ref||""]),Ne=new Set(w.map(([,L])=>xt(L)));if(bt.entries=bt.entries.filter(L=>Ne.has(L.source)),Bt(bt),w.length){if(!Or)throw new Error("请更新本机 IF 桥接器后重试；当前版本不支持引用复用");M.references=[];for(const[L,[,V]]of w.entries()){const _e=`${Ve[V.kind]}引用（${L+1}/${w.length}）`,Te=new Ce(V.url,location.href);if(Te.origin!==location.origin)throw new Error("IF 仅能上传当前画布内的本机素材");e.step=`正在检查 IF ${_e}是否可复用`,rt(e);const ve=await po(Te,V.kind);if(s!==n||!n.cards.includes(e)||e.cap!==r||!fe())throw new Error("画布已切换或权限已变化，已取消 IF 提交");const F={source:xt(V),version:ve,kind:V.kind};bt.pending.push(F);const H=bt.entries.find(Se=>Se.source===F.source&&Se.version===ve&&Se.kind===V.kind&&Fr(Se.url));if(H){e.step=`正在复用已上传 IF 的${_e}`,rt(e),M.references.push({kind:V.kind,url:H.url});continue}e.step=`正在读取 IF ${_e}`,rt(e);const me=await xe(Te,{credentials:"same-origin",cache:"no-store"});if(!me.ok)throw new Error("无法读取画布引用素材");let ie=await me.blob();const be=V.kind==="image"?["image/png","image/jpeg","image/webp"]:["video/mp4"],Ie=V.kind==="image"?1e7:50*1024*1024;if(!be.includes(ie.type)||ie.size>Ie){e.step=`正在适配 IF ${Ve[V.kind]}上传副本（${L+1}/${w.length}）`,rt(e);const Se=await xe(`/api/if-reference?${new URLSearchParams({url:Te.pathname+Te.search,type:V.kind})}`,{credentials:"same-origin",cache:"no-store",headers:{"If-Match":ve}});if(!Se.ok)throw new Error(`IF 素材自动适配失败：${(await Se.text()).slice(0,500)}`);const yt=ie.size;ie=await Se.blob();const Je=Se.headers.get("X-Chouka-IF-Conversion");if(s!==n||!n.cards.includes(e)||e.cap!==r||!fe())throw new Error("画布已切换或权限已变化，已取消 IF 提交");re(`IF ${Ve[V.kind]}上传副本已${Je==="lossless-webp"?"转换为无损 WebP":"压缩"}（${(yt/1048576).toFixed(1)} → ${(ie.size/1048576).toFixed(1)} MB），原素材保持不变`)}if(!ie.size||!be.includes(ie.type)||ie.size>Ie)throw new Error(`IF 上传副本仍不符合格式或 ${V.kind==="image"?10:50} MB 大小限制，原素材未修改`);if(s!==n||!n.cards.includes(e)||e.cap!==r||!fe())throw new Error("画布已切换或权限已变化，已取消 IF 提交");if(await po(Te,V.kind)!==ve)throw new Error("准备期间引用素材已变化，请重试");e.step=`正在向本机桥接传送${_e}`,rt(e);const et=await an("/assets",{method:"POST",headers:{"X-Chouka-IF":"asset","Content-Type":ie.type},body:ie});if(o.push(et.asset_id),M.references.push({kind:V.kind,asset_id:et.asset_id}),s!==n||!n.cards.includes(e)||e.cap!==r)throw new Error("画布已切换，已取消 IF 提交")}}if(Bt(bt),e.params.if_model=p.display_name,e.status="queued",e.error=null,e.progress=null,e.outputs=[],e.ms=null,e.step="正在交由本机 IF 桥接处理",e.job=null,i=!0,e.if_submitted_at=Date.now(),e.if_pending_prompts=[{key:"if_original",label:"原始提示词",text:g},{key:"if_submitted",label:"提交给 IF CLI 的提示词",text:M.prompt}],!Tt(e,n.id,"submitting"))throw new Error("无法保存 IF 提交恢复记录，尚未提交生成；请检查浏览器存储空间和权限");rt(e),m.panel._id===e.id&&ke(e.id);const nt=await an("/runs",{method:"POST",headers:{"Content-Type":"application/json","X-Chouka-IF":"generate"},body:JSON.stringify(M)});a=!0,e.job=nt.id,e.if_job_cap=r,e.status="running",e.step="本机 IF 正在准备生成任务",bt.job=nt.id,Bt(bt),Mr(e,{id:nt.id,capability:r,prompts:e.if_pending_prompts}),delete e.if_pending_prompts,Tt(e,n.id,"running"),m.hist._id===e.id&&zr(e.id),(await mn(e,n.id)).ok||Pe("IF 任务已提交，服务器状态保存失败；已保留本标签页恢复记录，请勿重复生成"),ao(e,n.id)}catch(c){const f=i&&!a&&(c instanceof TypeError||c instanceof SyntaxError||c.status>=500);if(!a&&!f&&o.length&&await Promise.allSettled(o.map(u=>an(`/assets/${encodeURIComponent(u)}`,{method:"DELETE",headers:{"X-Chouka-IF":"asset"}}))),s!==n||!n.cards.includes(e))return;f?(e.status="running",e.error=null,e.step="正在向本机 IF 确认原请求",Tt(e,n.id,"submitting"),Ma(e,n.id)):(e.status="error",e.error=c.message,e.step="",e.job=null,Tt(e,n.id,"error"),Pe(`「${he(e)}」生成失败：${e.error}`),await mn(e,n.id))}s===n&&n.cards.includes(e)&&(rt(e),m.panel._id===e.id&&ke(e.id))}async function ao(e,t,n=null){if(e._ifPolling||s?.id!==t||!fe()||!Ge(e)||!s.cards.includes(e)||!yn(e,t)||!e.job||e.status!=="running")return;e._ifPolling=!0;const r={job:e.job,request:e.if_request_id,started:e.if_started,cap:e.cap},o=()=>s?.id===t&&fe()&&s.cards.includes(e)&&e.job===r.job&&e.if_request_id===r.request&&e.if_started===r.started&&e.cap===r.cap;let a=!1;try{const i=n||await an(`/runs/${encodeURIComponent(e.job)}`);if(!o())return;Vt(e,i.result,t);const l=Zn(i.result);l&&(e.if_canvas_url=l);const c=e.history?.find(h=>h.job===e.job)?.prompts?.find(h=>h.key==="if_submitted");if(c&&typeof i.result?.submitted_prompt=="string"&&(c.text=i.result.submitted_prompt),i.state==="starting"||i.state==="running"){e.step=i.step||(i.state==="starting"?"本机 IF 正在准备生成任务":"IF 正在生成"),a=!0;return}if(i.state==="error")throw new Error((i.error||"IF 生成失败")+(i.result?.invalid_reference_indices?.length?"；已清除失效引用缓存，重试时仅重新上传失效素材":""));const f=i.result?.downloaded||[],u=ge(e).outputType,p=/请确认|确认后|回复["“]?确认/.test(i.result?.planning_text||"");if(!f.length)throw new Error(p?`IF 要求确认规划或故事板，未直接生成${Ve[u]}；请在 IF 网站查看该会话。`:`IF 未返回${Ve[u]}产物，请在 IF 网站查看该会话。`);const g=[];for(const[h,x]of f.entries()){if(x.type!==ge(e).outputType)continue;e.step=`正在取回 IF ${Ve[x.type]}产物（${h+1}/${f.length}）`,rt(e);const w=await xe(`${It}/runs/${encodeURIComponent(e.job)}/media/${x.index}`,{credentials:"omit"});if(!w.ok)throw w.status>=500||w.status===429?new TypeError("IF 产物暂不可读取"):new Error("无法读取 IF 产物");const y=new File([await w.blob()],x.name);if(!o())return;e.step=`正在保存 IF ${Ve[x.type]}产物（${h+1}/${f.length}）`,rt(e);const M=await Pt(y,x.type==="image");if(!o())return;g.push({...M,filename:x.name})}if(!g.length)throw new Error(u==="video"&&f.some(h=>h.type==="image")?`IF 只生成了故事板图片，尚未生成视频${p?"，并要求确认下一步":""}；请在 IF 网站查看该会话。`:`IF 返回的媒体类型与当前${Ve[u]}节点不符，请在 IF 网站查看该会话。`);e.outputs=g,e.status="done",e.step="",e.error=null,e.ms=Date.now()-(e.if_started||Date.now()),Mr(e,{id:e.job,capability:e.if_job_cap||e.cap}),m.hist._id===e.id&&zr(e.id),Tt(e,t,"done"),await Oi(e)}catch(i){if(!o())return;i instanceof TypeError||/桥接请求失败|Failed to fetch/.test(i.message)?(e.step="IF 连接或产物读取中断，正在重试",a=!0):(e.status="error",e.error=i.message,e.step="",e.ms=Date.now()-(e.if_started||Date.now()),e.job&&Mr(e,{id:e.job,capability:e.if_job_cap||e.cap}),m.hist._id===e.id&&zr(e.id),Pe(`「${he(e)}」生成失败：${i.message}`))}finally{e._ifPolling=!1,o()&&(Tt(e,t,a?"running":e.status),rt(e),m.panel._id===e.id&&ke(e.id),a?ne(()=>ao(e,t),2500):["done","error"].includes(e.status)&&await mn(e,t))}}async function Ll(e){if(!Fe())return;const t=s;if(ht(e))return re("风格节点不用运行：它只把风格并进挂着的那几个节点的提示词");if(Ht(e))return ml(e);if(e.status==="queued"||e.status==="running")return;const n=ge(e);if(!n)return Pe("能力不可用");if(n.id==="image_composite"&&n.execution==="browser")return pl(e);if(n.execution==="if_studio")return Ri(e);if(e.director_shot){if(Ye.cancelContentSave(),await Ye.pendingChain,!(await ur(s.id)).ok||!s.cards.includes(e))return;Et++,delete e.director_selected}e.job=null,e.queue_remaining=null,e.queue_ahead=null,e.error=null,e.progress=0,e.status="queued",e.outputs=[],e.ms=null,e.step="",rt(e),ke(e.id);try{if(await Yo(e),s!==t||!t.cards.includes(e)||!fe())throw new Error("画布已切换或权限变化，未提交生成");const r=Na(e),o=await Yt("/api/generate",r);e.job=o.id,e.seed=o.seed,e.status=o.status,o.project_rev!=null&&s?.id===r.project&&(s.rev=Math.max(s.rev||0,o.project_rev))}catch(r){e.status="error",e.error=r.message,e.job=null,s===t&&Ye.markWorkFailure(r),Pe(`「${he(e)}」提交失败：${r.message}`)}e.director_shot&&(Et=Math.max(0,Et-1)),!(s!==t||!fe())&&(rt(e),m.panel._id===e.id&&ke(e.id),Q(!1),ea())}async function Pl(e){if(e.job)try{await Yt(`/api/job/${e.job}/cancel`)}catch(t){Pe(t.message)}}async function Oi(e){const t=s;Qe();for(const n of t.edges.filter(r=>r.from===e.id&&!Ze(r)&&!r.version)){const r=t.cards.find(i=>i.id===n.to);if(!r)continue;const o=e.outputs||[],a=gn(n);n.slots=a;for(let i=0;i<a.length;i++){if(!o[i]){delete r.assets[a[i]];continue}try{const l=await ya(o[i],ge(r)?.execution==="browser");s===t&&t.edges.includes(n)&&at(r.id)&&(r.assets[a[i]]=l)}catch(l){console.error("导入产物失败:",l),s===t&&Pe(`向「${he(r)}」导入产物失败：${l.message}`)}}if(s!==t)return;Bn(r),zt(r),m.panel._id===r.id&&ke(r.id)}}function Il(e){return e.project?s&&e.project===s.id?s.name:(T.find(t=>t.id===e.project)||{}).name||e.projectName||"":e.projectName||""}async function Ai(e){if(!s||s.id!==e.project){if(!T.some(r=>r.id===e.project))return re("这个任务所在的画布已经不在了");await vr(e.project)}const t=s.cards.find(r=>r.id===e.card);if(!t)return re("这个节点片已经从画布上删掉了");const n=m.stage.getBoundingClientRect();N.x=n.width/2-(t.x+Be(t)/2)*N.k,N.y=n.height/3-t.y*N.k,In(),se=t.id,J.clear(),Jt=null,Qe(!1);for(const r of s.cards)r._el&&r._el.classList.toggle("sel",r.id===t.id);ke(t.id),vt(),Lt(),Qt()}return P.bind({open:vr,refresh:wr,clear:Fn,selectSpace(e){Le=e,s&&!Ha(s).includes(e)&&Fn(),ho()},renamed(e,t,n){s?.id===e&&(s.name=t,typeof n=="number"&&(s.rev=n),pn()),lt.renameProject(e,t)}}),b.onDispose(()=>{Ko++,lt.reset(),s=null,Ye.cancelTimers(),vo(),ka(),rr?.disconnect(),Yr()}),{ready:Da,flush:()=>Yn(void 0,!0),getProject:()=>s,nodeEditor:_?Z.ChoukaNodeEditor:void 0}}function md(b,v,S,P){const{window:X,document:B,addEventListener:Z,setTimeout:d,clearTimeout:I,setInterval:ne,clearInterval:oe,requestAnimationFrame:Ae,cancelAnimationFrame:Ue,ResizeObserver:$e,MutationObserver:tt,IntersectionObserver:Me,URL:ee}=b;X.H3Auth=v,X.H3Notify=S;const ae=P.mediaFetch;return(()=>{const Ce=new ee("/",location.href),xe=8192,$=32e6,E=100,U=512,O=64e6,j=64*1024*1024;let te;const we=W=>JSON.parse(JSON.stringify(W)),ze=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),W=>W.toString(16).padStart(2,"0")).join(""),je=(W,s)=>Number.isFinite(W)&&Number.isFinite(s)&&W>=1&&s>=1&&W<=xe&&s<=xe&&W*s<=$;function qe(W,s){if(!je(W,s))throw new Error("图片或画布超出限制：单边 1–8192 像素，总像素不超过 3200 万。")}function Ee(W){if(typeof W!="string"||!W||W.length>8192)throw new Error("图片地址无效。");const s=new ee(W,location.href),T=s.pathname==="/api/file"||/^\/api\/upload\/[^/]+$/.test(s.pathname)||/^\/api\/artifact\/[^/]+\/[^/]+$/.test(s.pathname);if(!/^https?:$/.test(s.protocol)||s.origin!==location.origin||s.username||s.password||!T||s.hash)throw new Error("仅支持本站受控媒体地址（/api/file、/api/upload/文件名、/api/artifact/项目/文件名）；不接受其他路径、外站、data 或 blob 地址。");if(s.searchParams.sort(),s.href.length>8192)throw new Error("图片地址过长。");return s.href}function De(W){if(!W||W.kind!=="image")throw new Error("只能添加图片资产。");const s=JSON.stringify(W);if(s.length>262144)throw new Error("图片资产描述过大，请勿在编辑稿中嵌入图片数据。");const T=JSON.parse(s);return Ee(T.url),T}function Be(W){const s=T=>typeof T=="string"?T.trim().split(/[\\/]/).filter(Boolean).at(-1):"";return String(s(W.origin)||s(W.filename)||W.name||"图片").slice(0,200)}function Y(W){const s=[`url:${Ee(W.url)}`];if(typeof W.ref=="string"&&W.ref.trim()){if(W.ref.length>8192)throw new Error("图片资源标识过长。");s.push(`ref:${W.ref}`)}return s}function C(W){const s=JSON.stringify(W||{version:1,width:1920,height:1080,background:"transparent",layers:[]});if(s.length>2*1024*1024)throw new Error("编辑稿描述超过 2 MiB，请减少图层或资产元数据。");const T=JSON.parse(s);if(T.version!==1||!Array.isArray(T.layers)||T.layers.length>E)throw new Error("编辑稿版本或图层数量无效（最多 100 层）。");if(qe(T.width,T.height),!Number.isInteger(T.width)||!Number.isInteger(T.height))throw new Error("画布尺寸必须为整数像素。");if(T.background!=="transparent"&&!/^#[a-f\d]{6}$/i.test(T.background))throw new Error("背景必须为透明或六位十六进制颜色。");const ce=new Set;T.layers=T.layers.map(N=>{if(!N||typeof N.id!="string"||!N.id||ce.has(N.id))throw new Error("图层 ID 无效或重复。");if(ce.add(N.id),qe(N.width,N.height),![N.x,N.y,N.angle,N.opacity].every(Number.isFinite)||Math.abs(N.x)>1e5||Math.abs(N.y)>1e5||Math.abs(N.angle)>36e3||N.opacity<0||N.opacity>1)throw new Error("图层位置、角度或透明度无效。");return{id:N.id,name:String(N.name||"图片").slice(0,200),asset:De(N.asset),x:N.x,y:N.y,width:N.width,height:N.height,angle:N.angle,opacity:N.opacity,visible:N.visible!==!1,locked:!!N.locked}});const Le={version:1,width:T.width,height:T.height,background:T.background,layers:T.layers};if(T.linkedSources!==void 0){if(!Array.isArray(T.linkedSources)||T.linkedSources.length>U||T.linkedSources.some(N=>typeof N!="string"||!N||N.length>8196))throw new Error("已连接图片记录无效（最多 512 条有界资源标识）。");Le.linkedSources=[...new Set(T.linkedSources)]}return Le}async function _(W){const s=new Uint8Array(await W.slice(0,1048576).arrayBuffer()),T=new DataView(s.buffer),ce=(se,J)=>String.fromCharCode(...s.subarray(se,se+J));let Le,N;if(s.length>=24&&ce(1,3)==="PNG"&&T.getUint32(0)===2303741511)Le=T.getUint32(16),N=T.getUint32(20);else if(s.length>=10&&/^GIF8[79]a$/.test(ce(0,6)))Le=T.getUint16(6,!0),N=T.getUint16(8,!0);else if(s.length>=26&&ce(0,2)==="BM")T.getUint32(14,!0)===12?(Le=T.getUint16(18,!0),N=T.getUint16(20,!0)):(Le=T.getInt32(18,!0),N=Math.abs(T.getInt32(22,!0)));else if(s.length>=30&&ce(0,4)==="RIFF"&&ce(8,4)==="WEBP")for(let se=12;se+18<=s.length;){const J=ce(se,4),$t=T.getUint32(se+4,!0),st=se+8;if(J==="VP8X"){Le=1+s[st+4]+(s[st+5]<<8)+(s[st+6]<<16),N=1+s[st+7]+(s[st+8]<<8)+(s[st+9]<<16);break}if(J==="VP8 "&&s[st+3]===157&&s[st+4]===1&&s[st+5]===42){Le=T.getUint16(st+6,!0)&16383,N=T.getUint16(st+8,!0)&16383;break}if(J==="VP8L"&&s[st]===47){Le=1+s[st+1]+((s[st+2]&63)<<8),N=1+(s[st+2]>>6)+(s[st+3]<<2)+((s[st+4]&15)<<10);break}se=st+$t+$t%2}else if(s[0]===255&&s[1]===216){let se=2;for(;se+8<s.length&&s[se++]===255;){for(;s[se]===255;)se++;const J=s[se++];if(J===217||J===218)break;if(J===1||J>=208&&J<=215)continue;const $t=T.getUint16(se);if($t<2)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(J)){N=T.getUint16(se+3),Le=T.getUint16(se+5);break}se+=$t}}if(Le===void 0||N===void 0)throw new Error("无法安全识别图片尺寸。请使用标准 PNG、JPEG、WebP、GIF 或 BMP 图片（不支持 SVG / AVIF）。");return qe(Le,N),{width:Le,height:N}}async function K(W){const s=W.body.getReader(),T=[];let ce=0;try{for(;;){const Le=await s.read();if(Le.done)break;if(ce+=Le.value.byteLength,ce>j)throw await s.cancel(),new Error("图片文件不得超过 64 MiB。");T.push(Le.value)}}finally{s.releaseLock()}return new Blob(T,{type:W.headers.get("content-type")?.split(";")[0]||""})}function pe(){return te||(te=(async()=>{if((!X.fabric||X.fabric.version!=="7.4.0")&&await new Promise((W,s)=>{const T=B.createElement("script");T.src=new ee("vendor/fabric.min.js",Ce).href,T.onload=W,T.onerror=()=>{T.remove(),s(new Error("本地 Fabric 加载失败，请刷新重试。"))},B.head.append(T)}),X.fabric?.version!=="7.4.0")throw new Error("需要 Fabric 7.4.0 浏览器构建。")})().catch(W=>{throw te=null,W}),te)}function A(W,s,T){const ce=B.createElement(W);return s&&(ce.className=s),T!==void 0&&(ce.textContent=T),ce}async function q({state:W,sources:s=[],linkedSources:T=[],upload:ce,onSave:Le,onExport:N,canEdit:se=()=>!0}={}){const J=A("dialog","chouka-composer image-composer-dialog");J.setAttribute("data-image-composer","");const $t=`composer-${ze()}`;J.setAttribute("aria-labelledby",$t);const st=A("div","ic-head"),Sn=A("h2","","图片合成");Sn.id=$t;const ln=A("button","ic-button","关闭");ln.type="button",ln.dataset.composerAction="close";const jt=A("button","ic-button","重试载入");jt.type="button",jt.hidden=!0,st.append(Sn,A("span","ic-local","浏览器本地合成 · 原图尺寸输出"),jt,ln);const Zt=A("div","ic-status");Zt.setAttribute("role","status"),Zt.setAttribute("aria-live","polite");const At=A("div","ic-error");At.setAttribute("role","alert"),At.hidden=!0;const An=A("div","ic-body"),Et=A("aside","ic-left"),Ft=A("section","ic-center"),qt=A("aside","ic-right");Et.setAttribute("aria-label","图层和图片素材"),Ft.setAttribute("aria-label","合成画布"),qt.setAttribute("aria-label","图片与画布属性");const m=A("div","ic-toolbar"),Ye=A("div","ic-viewport"),Qt=A("canvas");Qt.setAttribute("aria-label","图片合成编辑画布"),Ye.append(Qt),Ft.append(m,Ye,A("p","ic-hint","拖动图片移动，拖动角点缩放。方向键移动 1px，Shift + 方向键移动 10px。"));const Q=A("div","ic-footer"),ur=A("span","ic-hint","编辑稿仅保存图片引用；合成 PNG 不包含选择框。");An.append(Et,Ft,qt),Q.append(ur),J.append(st,Zt,At,An,Q),B.body.append(J);const Yn=B.activeElement;let D,We,lt=null,pt=!1,dn=!1,Vn=!1,$n="",Lt=[],jn=-1,fe,rn,fr=0,Fe=1,mr=!0,Pt=null,kt=!1;const Fn=new AbortController,pn=new Map,xn=new Map,Yt=()=>X.fabric,dt=()=>{try{return se()===!0}catch(k){return Pe(k),!1}};function Pe(k){At.textContent=k?.message||String(k),At.hidden=!1,console.error("[图片合成]",k)}function hr(){At.hidden=!0,At.textContent=""}function re(){return dn||pt||!Vn?!1:dt()?!0:(Zt.textContent="只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。",Ct(),!1)}function Dt(k,R,z,le=""){const de=A("button",`ic-button ${le}`,R);de.type="button",k.append(de);const ue={撤销:"undo",重做:"redo",适应窗口:"fit",缩小:"zoom-out",放大:"zoom-in","上传图片（支持多选）":"upload",保存编辑稿:"save","合成 PNG":"export",上移:"raise",下移:"lower",置顶:"front",置底:"back",复制:"duplicate",删除:"delete"}[R];return ue&&(de.dataset.composerAction=ue),de.addEventListener("click",()=>{if(re())try{const Re=z();Re?.catch&&Re.catch(Pe)}catch(Re){Pe(Re)}}),de}function cn(k,R,z="number",le={}){const de=A("label","ic-field"),ue=A("span","",R),Re=A("input");return Re.type=z,Object.assign(Re,le),de.append(ue,Re),k.append(de),Re}function Ct(){if(dn)return;const k=dt(),R=pt||!Vn||!k;for(const z of J.querySelectorAll("button,input"))z!==ln&&z!==jt&&(z.disabled=R||z.dataset.inactive==="1");ln.disabled=pt,jt.disabled=pt||!k,J.setAttribute("aria-busy",String(pt)),We&&(We.skipTargetFind=R,We.selection=!1,We.upperCanvasEl.style.pointerEvents=R?"none":"",We.upperCanvasEl.tabIndex=R?-1:0),k||(Zt.textContent="只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。")}async function Ve(k,R){if(re()){pt=!0,hr(),Zt.textContent=k,Ct();try{return await R()}catch(z){dn||Pe(z)}finally{pt=!1,dn||(Zt.textContent=dt()?At.hidden?"就绪 · 更改仅在保存编辑稿后持久化":"操作未完成，请检查提示后重试":"只读：当前工具卡已失效。仅可关闭。",ht())}}}async function Nn(k){const R=Ee(k.url);if(pn.has(R))return pn.get(R);const z=await ae(R,{credentials:"same-origin",redirect:"error",signal:Fn.signal});if(!z.ok)throw new Error(`图片读取失败（HTTP ${z.status}）。`);if(Number(z.headers.get("content-length"))>j)throw new Error("图片文件不得超过 64 MiB。");const le=await K(z);if(le.size>j||!/^image\/(png|jpeg|webp|gif|bmp|x-ms-bmp)$/i.test(le.type))throw new Error("仅支持 PNG、JPEG、WebP、GIF、BMP 图片，单文件最多 64 MiB；不支持 SVG / AVIF。");const de=await _(le);if(fr+de.width*de.height>O)throw new Error("已载入图片总像素超过 6400 万，请关闭后使用较小图片重新编辑。");const ue=await createImageBitmap(le);try{if(qe(ue.width,ue.height),fr+ue.width*ue.height>O)throw new Error("已载入图片总像素超过 6400 万，请关闭后使用较小图片重新编辑。")}catch(Re){throw ue.close(),Re}if(dn)throw ue.close(),new Error("合成器已关闭。");return fr+=ue.width*ue.height,pn.set(R,ue),ue}function Nt(k){const R=pn.get(Ee(k.asset.url));if(!R)throw new Error("图片尚未载入。");const z=new(Yt()).FabricImage(R,{originX:"left",originY:"top",left:k.x,top:k.y,angle:k.angle,scaleX:k.width/R.width,scaleY:k.height/R.height,opacity:k.opacity,visible:k.visible,selectable:!k.locked,evented:!k.locked,lockScalingFlip:!0,objectCaching:!1,cornerColor:"#a0e7cb",borderColor:"#a0e7cb",transparentCorners:!1,cornerSize:12,padding:0});return z.composerId=k.id,z.setControlsVisibility({ml:!Vt.checked,mr:!Vt.checked,mt:!Vt.checked,mb:!Vt.checked}),z}function St(k){const R=Ee(k.url),z=A("span","ic-thumbnail"),le=pn.get(R);if(z.setAttribute("aria-hidden","true"),z.draggable=!1,le){const de=A("canvas"),ue=Math.min(1,220/le.width,120/le.height);de.draggable=!1,de.width=Math.max(1,Math.round(le.width*ue)),de.height=Math.max(1,Math.round(le.height*ue)),de.getContext("2d").drawImage(le,0,0,de.width,de.height),z.append(de)}else{const de=A("img");de.alt="",de.loading="lazy",de.decoding="async",de.draggable=!1;const ue=new ee(R);de.src=/^\/api\/(upload|artifact)\//.test(ue.pathname)?`/api/thumbnail?url=${encodeURIComponent(ue.pathname+ue.search)}`:R,z.append(de)}return z}function ct(){return D?.layers.find(k=>k.id===lt)}function on(){if(!We||!D)return;kt=!0,We.discardActiveObject();for(const z of We.getObjects())We.remove(z),z.dispose();xn.clear(),We.backgroundColor=D.background==="transparent"?"":D.background;for(const z of D.layers){const le=Nt(z);We.add(le),xn.set(z.id,le)}const k=ct(),R=xn.get(lt);R&&k.visible&&!k.locked&&We.setActiveObject(R),kt=!1,fn(),ht(),We.requestRenderAll()}function Kn(){const k=JSON.stringify(D);if(Lt[jn]===k){ht();return}Lt.splice(jn+1),Lt.push(k),Lt.length>60&&Lt.shift(),jn=Lt.length-1,ht()}function It(k){if(!re()||!D)return;const R=we(D);try{k(),D=C(D),on(),Kn(),hr()}catch(z){D=R,on(),Pe(z)}}function un(k){const R=jn+k;if(R<0||R>=Lt.length)return;const z=D.linkedSources;D=JSON.parse(Lt[R]),z&&(D.linkedSources=[...new Set([...D.linkedSources||[],...z])]),jn=R,Lt[R]=JSON.stringify(D),on()}function fn(){if(!We||!D||dn)return;const k=Math.max(80,Ye.clientWidth-32),R=Math.max(80,Ye.clientHeight-32);mr&&(Fe=Math.min(k/D.width,R/D.height,1)),Fe=Math.max(.01,Math.min(Fe,2,4096/Math.max(D.width,D.height),Math.sqrt(8e6/(D.width*D.height)))),We.setDimensions({width:Math.max(1,Math.round(D.width*Fe)),height:Math.max(1,Math.round(D.height*Fe))}),We.setViewportTransform([Fe,0,0,Fe,0,0]),Or.textContent=`${Math.round(Fe*100)}% · ${D.width} × ${D.height} px`}const lo=Dt(m,"撤销",()=>un(-1)),Gn=Dt(m,"重做",()=>un(1));Dt(m,"适应窗口",()=>{mr=!0,fn()}),Dt(m,"缩小",()=>{mr=!1,Fe/=1.25,fn()}),Dt(m,"放大",()=>{mr=!1,Fe*=1.25,fn()});const Or=A("span","ic-zoom");m.append(Or),Et.append(A("h3","","图层"),A("p","ic-hint","从上到下为顶层到底层，可拖动排序"));const Mn=A("div","ic-layers");Mn.setAttribute("aria-label","图层列表"),Et.append(Mn);const Ge=A("div","ic-layer-actions");Et.append(Ge);const an=[];function zn(k,R){const z=Dt(Ge,k,()=>ct()&&R());return an.push(z),z}function Ln(k){It(()=>{const R=D.layers.findIndex(le=>le.id===lt),[z]=D.layers.splice(R,1);D.layers.splice(Math.max(0,Math.min(k,D.layers.length)),0,z)})}zn("上移",()=>Ln(D.layers.findIndex(k=>k.id===lt)+1)),zn("下移",()=>Ln(D.layers.findIndex(k=>k.id===lt)-1)),zn("置顶",()=>Ln(D.layers.length-1)),zn("置底",()=>Ln(0)),zn("复制",()=>It(()=>{if(D.layers.length>=E)throw new Error("最多添加 100 个图层。");const k=we(ct());k.id=ze(),k.name=`${k.name} 副本`,k.x+=20,k.y+=20,D.layers.splice(D.layers.findIndex(R=>R.id===lt)+1,0,k),lt=k.id})),zn("删除",()=>It(()=>{D.layers=D.layers.filter(k=>k.id!==lt),lt=null})),Et.append(A("h3","","添加图片"));const Ar=Dt(Et,"上传图片（支持多选）",()=>Bt.click()),Bt=A("input","ic-file");Bt.type="file",Bt.multiple=!0,Bt.accept="image/png,image/jpeg,image/webp,image/gif,image/bmp",Bt.hidden=!0,Et.append(Bt),Et.append(A("p","ic-hint","可拖入文件或粘贴图片。单边 ≤8192px，总像素 ≤3200万，文件 ≤64MiB。"));const Zn=A("div","ic-sources");Et.append(Zn),qt.append(A("h3","","画布"));const gr=A("div","ic-field-grid");qt.append(gr);const br=cn(gr,"画布宽度 / px","number",{min:1,max:xe,step:1}),xr=cn(gr,"画布高度 / px","number",{min:1,max:xe,step:1});br.dataset.composerField="canvas-width",xr.dataset.composerField="canvas-height";const qn=A("div","ic-background");qt.append(qn);const yn=cn(qn,"透明背景","checkbox");yn.parentElement.classList.add("ic-switch");const Tt=cn(qn,"背景颜色","color");br.addEventListener("change",()=>It(()=>{D.width=Number(br.value)})),xr.addEventListener("change",()=>It(()=>{D.height=Number(xr.value)})),yn.addEventListener("change",()=>It(()=>{D.background=yn.checked?"transparent":Tt.value})),Tt.addEventListener("change",()=>It(()=>{D.background=Tt.value})),qt.append(A("h3","","所选图层"));const Qn=cn(qt,"名称","text",{maxLength:200}),mn=A("div","ic-field-grid");qt.append(mn);const Fr={};for(const[k,R,z,le]of[["x","X / px",-1e5,1e5],["y","Y / px",-1e5,1e5],["width","宽度 / px",1,xe],["height","高度 / px",1,xe],["angle","角度 / °",-36e3,36e3],["opacity","透明度 / %",0,100]]){const de=cn(mn,R,"number",{min:z,max:le,step:k==="opacity"?1:.1});Fr[k]=de,de.dataset.composerField=k,de.addEventListener("change",()=>It(()=>{const ue=ct();if(!ue||ue.locked)return;const Re=Number(de.value);if(de.value.trim()===""||!Number.isFinite(Re))throw new Error("请输入有效数值。");if(Vt.checked&&(k==="width"||k==="height")){const ot=k==="width"?"height":"width";ue[ot]*=Re/ue[k]}ue[k]=k==="opacity"?Re/100:Re}))}const Vt=cn(qt,"锁定宽高比","checkbox",{checked:!0});Vt.parentElement.classList.add("ic-switch"),Vt.addEventListener("change",()=>{if(re()){We.uniformScaling=Vt.checked;for(const k of xn.values())k.setControlsVisibility({ml:!Vt.checked,mr:!Vt.checked,mt:!Vt.checked,mb:!Vt.checked});We.requestRenderAll()}}),Qn.addEventListener("change",()=>It(()=>{const k=ct();k&&!k.locked&&(k.name=Qn.value||"图片")})),qt.append(A("p","ic-hint","X / Y 是图片未旋转时的左上角原点。锁定图层后，需先解锁才能修改属性或在画布移动。"));const po=Dt(Q,"保存编辑稿",ut,"ic-primary"),he=Dt(Q,"合成 PNG",ft,"ic-primary");function ht(){if(!D||dn){Ct();return}const k=ct();br.value=D.width,xr.value=D.height,yn.checked=D.background==="transparent",yn.checked||(Tt.value=D.background),Qn.value=k?.name||"",Qn.dataset.inactive=!k||k.locked?"1":"0";for(const[z,le]of Object.entries(Fr))le.value=k?String(Math.round(k[z]*(z==="opacity"?100:1)*1e3)/1e3):"",le.dataset.inactive=!k||k.locked?"1":"0";lo.dataset.inactive=jn<=0?"1":"0",Gn.dataset.inactive=jn>=Lt.length-1?"1":"0";for(const z of an)z.dataset.inactive=!k||k.locked?"1":"0";Ar.dataset.inactive=typeof ce!="function"?"1":"0",po.dataset.inactive=typeof Le!="function"?"1":"0",he.dataset.inactive=typeof N!="function"?"1":"0",Sn.textContent=`图片合成${JSON.stringify(D)!==$n?" · 未保存":""}`;const R=Mn.contains(B.activeElement);Mn.replaceChildren(),D.layers.length||Mn.append(A("p","ic-empty","尚无图层。上传图片，或从下方画布素材中选择添加。"));for(const z of[...D.layers].reverse()){const le=A("div",`ic-layer${lt===z.id?" is-selected":""}`);le.draggable=!pt&&dt(),le.dataset.layerId=z.id;const de=Be(z.asset),ue=A("button","ic-layer-name");ue.type="button",ue.title=de,ue.dataset.layerAction="select",ue.append(St(z.asset),A("span","ic-asset-name",de)),ue.setAttribute("aria-pressed",String(lt===z.id)),ue.disabled=pt||!dt(),ue.addEventListener("click",()=>{re()&&(lt=z.id,kt=!0,We.discardActiveObject(),!z.locked&&z.visible&&We.setActiveObject(xn.get(z.id)),kt=!1,We.requestRenderAll(),ht())});const Re=A("button","ic-layer-toggle",z.visible?"隐藏":"显示");Re.type="button",Re.setAttribute("aria-label",`${z.visible?"隐藏":"显示"} ${z.name}`),Re.setAttribute("aria-pressed",String(z.visible)),Re.dataset.layerAction="visible",Re.title=Re.getAttribute("aria-label");const ot=A("button","ic-layer-toggle",z.locked?"解锁":"锁定");ot.type="button",ot.setAttribute("aria-label",`${z.locked?"解锁":"锁定"} ${z.name}`),ot.setAttribute("aria-pressed",String(z.locked)),ot.dataset.layerAction="lock",ot.title=ot.getAttribute("aria-label"),Re.disabled=ot.disabled=pt||!dt(),Re.addEventListener("click",()=>It(()=>{z.visible=!z.visible})),ot.addEventListener("click",()=>It(()=>{z.locked=!z.locked})),le.addEventListener("dragstart",tn=>{if(!re()){tn.preventDefault();return}Pt=z.id,tn.dataTransfer.effectAllowed="move",tn.dataTransfer.setData("application/x-chouka-layer",z.id)}),le.addEventListener("dragover",tn=>{Pt&&re()&&(tn.preventDefault(),tn.dataTransfer.dropEffect="move",le.classList.add("is-dragover"))}),le.addEventListener("dragleave",()=>le.classList.remove("is-dragover")),le.addEventListener("dragend",()=>{Pt=null,le.classList.remove("is-dragover")}),le.addEventListener("drop",tn=>{if(!Pt)return;tn.preventDefault(),tn.stopPropagation();const qr=Pt;Pt=null,It(()=>{const Dr=D.layers.findIndex(yr=>yr.id===z.id),Br=D.layers.findIndex(yr=>yr.id===qr);if(Br<0||Dr<0||Br===Dr)return;const[co]=D.layers.splice(Br,1);D.layers.splice(Dr,0,co),lt=qr})});const Rt=A("div","ic-layer-controls");Rt.append(Re,ot),le.append(ue,Rt),Mn.append(le)}Ct(),R&&!pt&&We?.upperCanvasEl.focus({preventScroll:!0})}async function er(k,R){if(D.layers.length+k.length>E)throw new Error("最多添加 100 个图层。");const z=[];for(const le of k){if(!dt())throw new Error("编辑权限已失效，未添加图片。");const de=De(le),ue=await Nn(de);if(!dt())throw new Error("编辑权限已失效，未添加图片。");const Re=Math.max(1/Math.min(ue.width,ue.height),Math.min(1,D.width/ue.width,D.height/ue.height));z.push({id:ze(),name:Be(de),asset:de,x:0,y:0,width:ue.width*Re,height:ue.height*Re,angle:0,opacity:1,visible:!0,locked:!1})}if(!dt())throw new Error("编辑权限已失效，未添加图片。");D=C({...D,...R?{linkedSources:R}:{},layers:D.layers.concat(z)}),lt=z.at(-1)?.id||lt,on(),Kn()}async function Dn(){if(!Array.isArray(T)||T.length>U)throw new Error("已连接图片列表无效或过多（最多 512 项）。");if(!T.length)return;const k=new Set(D.linkedSources||[]),R=new Set(k),z=new Set,le=[];for(const de of D.layers)for(const ue of Y(de.asset))z.add(ue);for(const de of T){const ue=De(de),Re=Y(ue);if(Re.some(ot=>R.has(ot)||z.has(ot)))for(const ot of Re)R.add(ot);Re.some(ot=>k.has(ot)||z.has(ot))||le.push(ue);for(const ot of Re)k.add(ot);if(k.size>U)throw new Error("已连接图片记录已达 512 条上限，请使用“添加图片”手动添加新素材。")}if(!dt())throw new Error("编辑权限已失效，未添加图片。");R.size!==(D.linkedSources||[]).length&&(D=C({...D,linkedSources:[...R]}),Kn()),await er(le,[...k])}async function Ze(k){if(!/^image\/(png|jpeg|webp|gif|bmp|x-ms-bmp)$/i.test(k.type)||!k.size||k.size>j)throw new Error(`${k.name||"粘贴文件"}：仅支持常见位图格式，且文件需在 64 MiB 以内。`);await _(k);const R=await createImageBitmap(k);try{qe(R.width,R.height)}finally{R.close()}}function Ht(k){const R=Array.from(k||[]);if(R.length)return Ve("正在检查和上传图片，请勿关闭…",async()=>{if(typeof ce!="function")throw new Error("尚未配置图片上传回调。");if(D.layers.length+R.length>E)throw new Error("最多添加 100 个图层。");for(const le of R)await Ze(le);const z=[];for(const le of R){if(!dt())throw new Error("编辑权限已失效，已停止上传。");const de=await ce(le);if(!dt())throw new Error("编辑权限已失效，未采用晚到的上传结果。");z.push(De(de))}await er(z)})}Bt.addEventListener("change",()=>{const k=Array.from(Bt.files);Bt.value="",Ht(k)}),J.addEventListener("paste",k=>{if(k.stopPropagation(),k.target.closest('input,textarea,[contenteditable="true"]'))return;const R=Array.from(k.clipboardData?.files||[]);R.length&&(k.preventDefault(),Ht(R))}),J.addEventListener("dragover",k=>{k.stopPropagation(),k.dataTransfer.types.includes("Files")&&(k.preventDefault(),k.dataTransfer.dropEffect=pt||!dt()?"none":"copy")}),J.addEventListener("drop",k=>{k.stopPropagation(),k.preventDefault(),k.dataTransfer.files.length&&Ht(k.dataTransfer.files)}),J.addEventListener("keydown",k=>{if(k.stopPropagation(),k.target.closest('input,textarea,select,[contenteditable="true"]')||k.isComposing)return;const R=k.ctrlKey||k.metaKey,z=k.key.toLowerCase();if(R&&(z==="z"||z==="y")){k.preventDefault(),re()&&un(z==="y"||k.shiftKey?1:-1);return}if(z==="delete"||z==="backspace"){k.preventDefault(),ct()&&!ct().locked&&It(()=>{D.layers=D.layers.filter(de=>de.id!==lt),lt=null});return}const le={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[k.key];le&&(k.preventDefault(),ct()&&!ct().locked&&It(()=>{const de=ct(),ue=k.shiftKey?10:1;de.x+=le[0]*ue,de.y+=le[1]*ue}))});for(const k of["keyup","keypress","copy","cut","pointerdown","pointerup","click","dblclick","wheel"])J.addEventListener(k,R=>R.stopPropagation());async function ut(){await Ve("正在保存编辑稿，请勿关闭…",async()=>{const k=C(D);if(!dt())throw new Error("编辑权限已失效，未保存。");await Le(we(k)),dt()&&($n=JSON.stringify(k))})}async function ft(){await Ve("正在合成原尺寸 PNG，请勿关闭…",async()=>{const k=C(D),R=B.createElement("canvas");let z;try{z=new(Yt()).StaticCanvas(R,{width:k.width,height:k.height,enableRetinaScaling:!1,renderOnAddRemove:!1,backgroundColor:k.background==="transparent"?"":k.background});for(const de of k.layers)de.visible&&z.add(Nt(de));z.renderAll();const le=await new Promise((de,ue)=>R.toBlob(Re=>Re?de(Re):ue(new Error("PNG 编码失败，可能内存不足。")),"image/png"));if(!dt())throw new Error("编辑权限已失效，未提交合成结果。");await N(le,we(k)),$n=JSON.stringify(k)}finally{try{z&&await z.dispose()}finally{R.width=R.height=0}}})}async function hn(k=!1){const R=k===!0;if(dn||pt&&!R||!R&&D&&JSON.stringify(D)!==$n&&!X.confirm("编辑稿有未保存的更改，确定关闭并放弃这些更改吗？"))return!1;dn=!0,Fn.abort(),fe?.disconnect(),oe(rn),J.open&&J.close();try{We&&await We.dispose()}catch(z){console.error("[图片合成] 画布释放失败",z)}finally{for(const z of pn.values())z.close();pn.clear(),xn.clear(),Lt.length=0,J.remove(),Yn?.isConnected&&Yn.focus({preventScroll:!0})}return!0}ln.addEventListener("click",hn),J.addEventListener("cancel",k=>{k.preventDefault(),k.stopPropagation(),hn()}),J.showModal(),ln.focus();async function en(){if(!(pt||dn)){pt=!0,Vn=!1,hr(),jt.hidden=!0,Zt.textContent="正在载入图片合成器…",Ct();try{if(await pe(),We||(We=new(Yt()).Canvas(Qt,{enableRetinaScaling:!1,selection:!1,preserveObjectStacking:!0,uniformScaling:!0,uniScaleKey:null,renderOnAddRemove:!1}),We.upperCanvasEl.tabIndex=0,We.upperCanvasEl.setAttribute("aria-label","图片合成编辑画布，使用方向键移动所选图层"),We.on("mouse:down",()=>{!pt&&dt()&&We.upperCanvasEl.focus({preventScroll:!0})}),We.on("selection:created",k=>{!kt&&!pt&&dt()&&(lt=k.selected?.[0]?.composerId||null,ht())}),We.on("selection:updated",k=>{!kt&&!pt&&dt()&&(lt=k.selected?.[0]?.composerId||null,ht())}),We.on("selection:cleared",()=>{!kt&&!pt&&dt()&&(lt=null,ht())}),We.on("object:modified",k=>{if(kt)return;if(!re()){on();return}const R=k.target,z=D.layers.find(de=>de.id===R?.composerId);if(!z||z.locked){on();return}const le=we(D);try{Object.assign(z,{x:R.left,y:R.top,width:R.width*R.scaleX,height:R.height*R.scaleY,angle:R.angle}),D=C(D),Kn()}catch(de){D=le,on(),Pe(de)}})),!D){const k=C(W);for(const R of k.layers){if(!dt())throw new Error("只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。");await Nn(R.asset)}if(!dt())throw new Error("只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。");D=k,$n=JSON.stringify(D),Lt=[],jn=-1,on(),Kn()}Vn=!0;try{await Dn()}catch(k){Pe(k),jt.hidden=!1}Zn.replaceChildren();for(const k of s)try{const R=De(k),z=Be(R),le=Dt(Zn,"",()=>Ve("正在添加画布图片…",()=>er([R])));le.title=z,le.setAttribute("aria-label",`添加 ${z}`),le.append(St(R),A("span","ic-asset-name",z))}catch(R){Pe(R)}s.length||Zn.append(A("p","ic-hint","当前画布没有可用的图片素材。")),fe?.disconnect(),fe=new $e(fn),fe.observe(Ye)}catch(k){Pe(k),Vn=!1,jt.hidden=!1}finally{pt=!1,Zt.textContent=At.hidden?"就绪 · 添加图片开始合成":"载入存在问题，请检查提示；可重试载入或关闭。",ht()}}}return b.onDispose(()=>{hn(!0)}),jt.addEventListener("click",()=>{dt()&&en()}),rn=ne(Ct,500),await en(),{close:hn}}X.ChoukaImageComposer={open:q}})(),X.ChoukaImageComposer}const hd=ql.extend({selectedId:La().nullable(),selectedSpace:La(),user:Hl.nullable()});function gd(b){const v=ns({projects:[],teams:[],selectedId:null,selectedSpace:"personal",user:null,busy:!1,error:""});let S;async function P(B){if(!v.getSnapshot().busy){v.set({...v.getSnapshot(),busy:!0,error:""});try{await B()}catch(Z){v.set({...v.getSnapshot(),error:Rr(Z)})}finally{v.set({...v.getSnapshot(),busy:!1})}}}const X=B=>B.permission==="operate"&&!B.locked;return{state:v,service:b,bind(B){S=B},update(B){const Z=hd.parse(B);v.set({...v.getSnapshot(),...Z})},selectSpace(B){S?.selectSpace(B)},open(B){return P(async()=>{await S?.open(B)})},create(){return P(async()=>{const B=v.getSnapshot();if(B.selectedSpace==="shared")throw new Error("共享给我的空间不能新建画布，请选择个人空间或项目组");const Z=B.selectedSpace.startsWith("team:")?B.selectedSpace.slice(5):null,d=Z?B.teams.find(oe=>oe.id===Z)?.name:"个人空间",I=window.prompt(`在「${d||"项目组"}」新建画布`,"新项目 "+new Date().toLocaleDateString("zh-CN"));if(I===null)return;const ne=await b.create(I,Z);await S?.refresh(),await S?.open(ne.id)})},rename(B){return P(async()=>{if(!X(B))throw new Error("此画布不可修改");const Z=window.prompt("修改项目名",B.name);if(Z===null)return;const d=Z.trim();if(!d)throw new Error("项目名不能为空");const I=Ul({name:La(),rev:Wl()}).parse(await b.rename(B.id,d));S?.renamed(B.id,I.name,I.rev),await S?.refresh()})},remove(B){return P(async()=>{if(!X(B))throw new Error("此画布不可修改");window.confirm(`删除项目「${B.name}」？（文件会保留为 .deleted）`)&&(await b.remove(B.id),v.getSnapshot().selectedId===B.id&&S?.clear(),await S?.refresh())})},async refresh(){await S?.refresh()},spaces(B){const Z=v.getSnapshot();return Fl(B,Z.user?.id,Z.teams)}}}function bd({project:b,host:v,onClose:S}){const P=Gt.useRef(null),[X,B]=Gt.useState(),[Z,d]=Gt.useState([]),[I,ne]=Gt.useState([]),[oe,Ae]=Gt.useState(""),[Ue,$e]=Gt.useState(!1);Gt.useEffect(()=>{let Me=!0;return P.current?.showModal(),v.service.shares(b.id).then(ee=>{Me&&(B(ee),d(ee.user_ids),ne(ee.team_ids))}).catch(ee=>{Me&&Ae(Rr(ee))}),()=>{Me=!1}},[v,b.id]);const tt=(Me,ee,ae,Ce)=>Ce(ee?[...ae,Me]:ae.filter(xe=>xe!==Me));return ye.jsx("dialog",{ref:P,className:"auth-dialog project-share-dialog",onCancel:S,children:ye.jsxs("form",{onSubmit:async Me=>{Me.preventDefault(),$e(!0),Ae("");try{await v.service.share(b.id,Z,I),await v.refresh(),S()}catch(ee){Ae(Rr(ee))}finally{$e(!1)}},children:[ye.jsxs("h2",{children:["分享「",b.name,"」"]}),ye.jsx("p",{className:"auth-note",children:"被选中的个人或项目组成员可以共同查看、编辑和运行这张画布。画布仍保留在你的个人空间。"}),ye.jsx("div",{className:"share-columns",children:["users","teams"].map(Me=>ye.jsxs("section",{className:"share-targets",children:[ye.jsx("h3",{children:Me==="users"?"个人":"项目组"}),ye.jsxs("div",{className:"share-target-list",children:[X?.[Me].map(ee=>ye.jsxs("label",{className:"share-target",children:[ye.jsx("input",{type:"checkbox",checked:(Me==="users"?Z:I).includes(ee.id),onChange:ae=>tt(ee.id,ae.target.checked,Me==="users"?Z:I,Me==="users"?d:ne)}),ye.jsxs("span",{children:[ee.name||ee.username,ee.display_name?`（${ee.display_name}）`:""]})]},ee.id)),X?.[Me].length===0&&ye.jsx("p",{className:"auth-note",children:"暂无可分享对象"})]})]},Me))}),ye.jsx("p",{role:"alert",children:oe}),ye.jsxs("footer",{children:[ye.jsx("button",{type:"button",className:"btn",onClick:S,children:"取消"}),ye.jsx("button",{className:"btn primary",disabled:!X||Ue,children:Ue?"保存中…":"确定分享"})]})]})})}function xd({host:b}){const v=Gt.useSyncExternalStore(b.state.subscribe,b.state.getSnapshot),[S,P]=Gt.useState(),X=[{value:"personal",label:"个人空间"},...v.projects.some(I=>b.spaces(I).includes("shared"))?[{value:"shared",label:"共享给我的画布"}]:[],...v.teams.map(I=>({value:`team:${I.id}`,label:I.name}))],B=v.projects.filter(I=>b.spaces(I).includes(v.selectedSpace)),Z=new Map;for(const I of B){const ne=v.selectedSpace==="shared"?String(I.owner_id):"";Z.set(ne,[...Z.get(ne)||[],I])}const d=I=>{const ne=I.permission==="operate"&&!I.locked,oe=v.selectedSpace==="personal"&&!I.team_id&&String(I.owner_id)===String(v.user?.id)&&!I.locked;return ye.jsxs("div",{className:`pitem${I.id===v.selectedId?" on":""}`,title:`${I.team_name||I.owner_display_name?.trim()||"未填写姓名"} · ${I.permission==="operate"?"可操作":"只读"}`,onContextMenu:Ae=>{oe&&(Ae.preventDefault(),P(I))},children:[ye.jsx("button",{className:"nm",onClick:()=>{b.open(I.id)},onDoubleClick:()=>ne&&void b.rename(I),children:I.name}),ye.jsx("span",{className:"ct",children:I.cards}),oe&&ye.jsx("button",{className:"pshare",title:"分享给个人或项目组",onClick:()=>P(I),children:"↗"}),ne&&ye.jsxs(ye.Fragment,{children:[ye.jsx("button",{className:"ren",title:"重命名",disabled:v.busy,onClick:()=>{b.rename(I)},children:"✎"}),ye.jsx("button",{className:"del",title:"删除",disabled:v.busy,onClick:()=>{b.remove(I)},children:"✕"})]})]},I.id)};return ye.jsxs(ye.Fragment,{children:[ye.jsx("div",{className:"head",children:ye.jsx("span",{className:"project-panel-title",children:"画布列表"})}),ye.jsxs("button",{id:"newproj",disabled:v.busy,onClick:()=>{b.create()},children:[ye.jsx("span",{"aria-hidden":"true",children:"＋"}),ye.jsx("span",{children:"新建画布"})]}),ye.jsxs("label",{className:"space-picker",children:[ye.jsx("span",{children:"画布空间"}),ye.jsx("select",{id:"space-select",value:v.selectedSpace,onChange:I=>b.selectSpace(I.target.value),"aria-label":"选择个人空间或项目组",children:X.map(I=>ye.jsx("option",{value:I.value,children:I.label},I.value))})]}),ye.jsx("div",{id:"space-label",className:"section-label",children:X.find(I=>I.value===v.selectedSpace)?.label}),ye.jsx("div",{id:"plist",children:[...Z].map(([I,ne])=>I?ye.jsxs("details",{className:"powner",open:!0,children:[ye.jsxs("summary",{children:[ye.jsx("span",{className:"powner-name",children:ne[0]?.owner_display_name?.trim()||"未填写姓名"}),ye.jsx("span",{className:"powner-count",children:ne.length})]}),ye.jsx("div",{className:"powner-items",children:ne.map(d)})]},I):ne.map(d))}),v.error&&ye.jsx("p",{role:"alert",className:"project-error",children:v.error}),ye.jsxs("div",{className:"side-foot",children:[ye.jsx("span",{className:"side-foot-dot"}),ye.jsx("span",{id:"space-status",children:v.selectedSpace==="personal"?"个人画布仅自己可见":v.selectedSpace==="shared"?"由画布所有者授权共享":"项目组画布由全体组员共享"})]}),S&&ye.jsx(bd,{host:b,project:S,onClose:()=>P(void 0)})]})}const yd=Xl+`
`+Yl+`
#side {position:relative} #dot {position:absolute;right:22px;top:28px;width:7px;height:7px;border-radius:50%;background:var(--err)} #dot.on{background:var(--ok)} #react-projects{display:contents}.pitem>.nm {border:0;background:none;color:inherit;text-align:left;min-width:0;cursor:pointer;font:inherit}.project-error{color:#fda4af;padding:12px;font-size:12px}`;function $d(){const b=Gt.useRef(null),[v,S]=Gt.useState(!0),[P,X]=Gt.useState(),[B,Z]=Gt.useState(null),d=Gt.useCallback(ne=>{const oe=gd(ne.services.projects);X(oe),Z(document.getElementById("react-projects"));const Ae=md(ne.scope,ne.auth,ne.notify,ne.services),Ue=fd(ne.scope,ne.auth,ne.notify,oe,ne.services,Ae);ne.beforeLeave(async()=>{await Ue.ready,await Ue.flush()}),Ue.nodeEditor&&(window.ChoukaNodeEditor=Ue.nodeEditor),Ue.ready.then(()=>{ne.scope.disposed||S(!1)},$e=>{ne.scope.disposed||(S(!1),ne.notify.error($e))})},[]),I=Bl(b,"canvas","canvas","canvas-studio",yd,d);return ye.jsxs(ye.Fragment,{children:[ye.jsx("div",{id:"page-mount",ref:b,dangerouslySetInnerHTML:{__html:Jl}}),B&&P&&Rl.createPortal(ye.jsx(xd,{host:P}),B),v&&!I&&ye.jsx(Dl,{stage:"正在准备工作区"}),I&&ye.jsx("p",{role:"alert",children:I})]})}export{$d as CanvasPage};
