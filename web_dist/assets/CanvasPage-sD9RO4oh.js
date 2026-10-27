import{errorMessage as Rr,ApiError as Ai,reactExports as Zt,jsxRuntimeExports as ve}from"./http-DOrwCtZg.js";import{reactDomExports as Ll}from"./index-BgVeoShv.js";import{isLiveTask as za,taskDeleteResultSchema as Fi,taskHistoryPageSchema as Pl,formatQueueStatus as Wi,tasksSchema as Il,projectSpaces as Tl,projectListSchema as Rl,LoadingRequest as Ol}from"./index-BJbQMzHh.js";import{usePageRuntime as Al}from"./usePageRuntime-CZQhahIK.js";import{userSchema as Fl}from"./session-M0f98iVb.js";import{string as La,object as Dl,number as ql}from"./monitor-alerts-DzGBiSiF.js";import"./json-D9oFO1Iy.js";const Bl=`\r
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
<input type="file" id="picker" style="display:none">`,Hl=`@scope (body[data-chouka-page="canvas"]) {\r
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
}`,Ul=`@scope (body[data-chouka-page="canvas"]) {\r
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
}`,Wl=["image","audio","video"],Ia=[{id:"480P",label:"480P",val:480},{id:"720P",label:"720P",val:720},{id:"1080P",label:"1080P",val:1080},{id:"1440P",label:"1440P",val:1440},{id:"2K",label:"2K",val:2048}],io=[["1:1",1,1],["1:2",1,2],["2:1",2,1],["9:16",9,16],["16:9",16,9],["3:4",3,4],["4:3",4,3],["3:2",3,2],["2:3",2,3],["5:4",5,4],["4:5",4,5],["21:9",21,9],["9:21",9,21]];function Ji(b){return(b&&b.options||[]).map(k=>{const N=/^(\d+)x(\d+)\s+\(([^)]+)\)$/.exec(String(k));if(!N)return null;const L=parseInt(N[1],10),J=parseInt(N[2],10);return{value:k,width:L,height:J,ratio:N[3],short:Math.min(L,J)}}).filter(Boolean)}function Jl(b,k){return Ji(b).find(N=>N.value===k)||null}function Ta(b,k){const N=k.imageControls,L=b.params.image_ratio,J=b.params.image_clarity;return{ratio:io.some(q=>q[0]===L)||N.mode==="i2i"&&L==="original"?L:N.defaultRatio,clarity:Ia.some(q=>q.id===J)?J:N.defaultClarity}}function Xi(b,k,N,L){if(N&&L&&N.id!==L.id&&(N.imageControls||L.imageControls)){const J=d=>[...new Set(d.inputs.filter(P=>!Wl.includes(P.type)&&P.type!=="textarea"&&P.type!=="seed").map(P=>P.key))],q=b.params._imageModelParams||={};q[N.id]=Object.fromEntries(J(N).filter(d=>b.params[d]!=null).map(d=>[d,b.params[d]]));const G=b.params._imageRatios||={};N.imageControls&&(G[N.imageControls.mode]=Ta(b,N).ratio);for(const d of new Set([...J(N),...J(L)]))delete b.params[d];Object.assign(b.params,q[L.id]||{}),L.imageControls&&N.imageControls?.mode!==L.imageControls.mode&&(b.params.image_ratio=G[L.imageControls.mode]||L.imageControls.defaultRatio)}b.cap=k}function Xl({document:b,getCapability:k,getCapabilityById:N,getRunCapability:L,getProject:J,isIF:q,normalizeIFDuration:G,api:d,save:P,onReferenceChange:ee,ratioWH:re,multiple:Fe}){function We(E,B,R){const $=Ta(E,B),Q=b.createElement("div");Q.className="cpick image-size-controls";const Ce=b.createElement("div");Ce.className="ctitle",Ce.textContent="画面比例";const Le=b.createElement("div");Le.className="cgrid";const Me=B.imageControls.mode==="i2i"?[["original",1,1],...io]:io;for(const[He,X,C]of Me){const _=b.createElement("button"),V=He==="original"?"原图":He;_.className=He===$.ratio?"on":"",_.innerHTML=`<i style="--ratio:${X/C}"></i><span>${V}</span>`,_.title=`画面比例 ${V}`,_.onclick=()=>{E.params.image_ratio=He,P(),R()},Le.appendChild(_)}const qe=b.createElement("div");qe.className="ctitle",qe.textContent="清晰度";const $e=b.createElement("div");$e.className="cgrid k";for(const He of Ia){const X=b.createElement("button");X.className=He.id===$.clarity?"on":"",X.textContent=He.label,X.title=`目标短边 ${He.val}px，实际尺寸按模型要求对齐`,X.onclick=()=>{E.params.image_clarity=He.id,P(),R()},$e.appendChild(X)}const Be=b.createElement("div");return Be.className="image-size-hint",Be.textContent=B.imageControls.mode==="i2i"?"清晰度按短边计算；默认保持原图比例。指定比例时，模型可能裁切主图以适配画布。":"清晰度按短边计算；实际尺寸按模型要求对齐。高分辨率会增加显存占用。",Q.append(Ce,Le,qe,$e,Be),Q}const Ne=E=>E?.kind==="gen"&&E.outputType==="video"&&(E.execution==="if_studio"||E.id.startsWith("minimax_h3_")&&E.inputs.some(B=>B.type==="video")),rt=(E,B)=>Ne(B)?(q(E)?k(E):B).inputs.filter(R=>R.type==="video").map(R=>E.assets?.[R.key]).find(R=>R?.ref):null,ze=E=>E&&[E.width,E.height,E.duration].every(B=>Number.isFinite(+B)&&+B>0),Z=new WeakMap;async function oe(E,B=L(E)){const R=rt(E,B);if(!R||ze(R))return;if(Z.has(R))return Z.get(R).promise;const $=J(),Q={};return Z.set(R,Q),Q.promise=d("/api/media?ref="+encodeURIComponent(R.ref)+"&project="+encodeURIComponent($.id)).then(Ce=>{if(!ze(Ce))throw new Error("无法读取参考视频的比例和时长，请重新导入视频");J()!==$||!$.cards.includes(E)||rt(E,B)!==R||(Object.assign(R,Ce),P())}).catch(Ce=>{throw Q.error=Ce.message,Ce}),Q.promise}function Ee(E,B=L(E)){const R=rt(E,B);if(!R)return delete E._referenceParameters,delete E.params._reference_video,Promise.resolve();const $=JSON.stringify([B.id,R.ref]);if(E.params._reference_video===$)return Promise.resolve();const Q=E._referenceParameters;if(Q?.identity===$&&Q.source===R)return Q.promise;const Ce=J(),Le=E.params,Me={...Le},qe={identity:$,source:R,before:Me};E._referenceParameters=qe;const $e=()=>{if(J()!==Ce||!Ce.cards.includes(E)||E.params!==Le||E._referenceParameters!==qe||L(E)!==B||rt(E,B)!==R||!ze(R))return;const Be=V=>V.every(ce=>Le[ce]===Me[ce]),He=B.inputs.find(V=>V.key==="aspect_ratio"),X=+R.width/+R.height;if(He&&Be(["aspect_ratio"]))Le.aspect_ratio=He.options.reduce((V,ce)=>Math.abs(re[ce][0]/re[ce][1]-X)<Math.abs(re[V][0]/re[V][1]-X)?ce:V);else if(!He&&Be(["width","height","_ratio"])){const V=io.reduce((F,H)=>Math.abs(H[1]/H[2]-X)<Math.abs(F[1]/F[2]-X)?H:F),ce=F=>Le[F]??B.inputs.find(H=>H.key===F)?.default,A=Math.min(+ce("width"),+ce("height"));Le._ratio=V[0],Le.width=V[1]>=V[2]?Math.round(A*V[1]/V[2]/Fe)*Fe:A,Le.height=V[1]>=V[2]?A:Math.round(A*V[2]/V[1]/Fe)*Fe}const C=B.inputs.some(V=>V.key==="preview_seconds"),_=C?"preview_seconds":"duration";Be([_])&&(Le[_]=C?0:Math.max(1,Math.round(+R.duration)),q(E)&&G(E)),Le._reference_video=$,P()};return qe.promise=ze(R)?Promise.resolve($e()):oe(E,B).then($e),qe.promise}function we(E){Ee(E).catch(()=>{}).finally(()=>ee(E))}function S(E,B){const R=rt(E,B);if(!R||ze(R))return null;const $=b.createElement("div");if($.className="knobnote",$.setAttribute("role","status"),$.textContent=Z.get(R)?.error||"正在读取参考视频的比例和时长…",Z.get(R)?.error){const Q=b.createElement("button");Q.type="button",Q.textContent="重新读取",Q.onclick=()=>{Z.delete(R),delete E._referenceParameters,we(E),ee(E)},$.appendChild(Q)}return $}return{imageClarityPicker:We,supportsVideoReference:Ne,referenceVideo:rt,videoMetadataReady:ze,ensureReferenceMetadata:oe,syncReferenceParameters:Ee,refreshVideoParameters:we,videoReferenceStatus:S,switchImageCapability:(E,B)=>Xi(E,B,k(E),N(B))}}const Yl={CLARITY_STEPS:Ia,RATIO_GRID:io,resolutionPresets:Ji,resolutionPreset:Jl,imageSettings:Ta,switchImageCapability:Xi,applyInputPresets:Vl,create:Xl};function Vl(b,k){for(const N of(b.inputs||[]).filter(L=>L.presets)){const L=k[N.key]!=null?k[N.key]:N.default,J=N.presets[L];if(!J)throw new Error(`${N.label}无效：${L}`);k[N.key]=L,Object.assign(k,J)}}const so={"1:1 (Square)":[1,1],"2:3 (Portrait Photo)":[2,3],"3:2 (Photo)":[3,2],"3:4 (Portrait Standard)":[3,4],"4:3 (Standard)":[4,3],"9:16 (Portrait Widescreen)":[9,16],"16:9 (Widescreen)":[16,9],"21:9 (Ultrawide)":[21,9]},pr=[480,544,640,768],Yi={480:832,544:960,640:1152,768:1344},On=32,Fo=new Set(["megapixels","width","height","aspect_ratio","resolution","scale_to_length","output_1080p"]),Vi=[{id:"1080p",short:1080},{id:"2K",short:1440},{id:"4K",short:2160}],Di=["3:4",3,4],ht=(b,k)=>b.inputs.find(N=>N.key===k);function Tr(b){return b===null||typeof b=="string"||typeof b=="number"||typeof b=="boolean"?b:void 0}const vt=(b,k)=>k?Tr(b.params[k.key])??k.default:void 0,dr=b=>typeof b=="string"?b:"",Rn=b=>typeof b=="number"||typeof b=="string"?Number(b):NaN,qi=b=>Number.parseFloat(String(Tr(b)));function Ra(b){return so[dr(b)]??[1,1]}function cr(b,k){const[N,L]=Ra(b),J=Math.sqrt(k*1024*1024/(N*L));return[Math.round(N*J/On)*On,Math.round(L*J/On)*On]}function Ki(b,k){const[N,L]=Ra(b),J=k/Math.min(N,L),q=Math.round(J*J*N*L/(1024*1024)*100)/100;for(const G of[0,1,-1,2,-2,3,-3]){const d=Math.round((q+G*.01)*100)/100;if(d>0&&Math.min(...cr(b,d))===k)return d}return q}const Bi=b=>Math.round(b*9/16/On)*On;function Gi(b){return b.id==="minimax_h3_ref_2pass_bf16"||b.id==="minimax_h3_fusion_v2_bf16"?ht(b,"output_1080p"):void 0}function qo(b,k){const[N,L]=Ra(b);return{width:Math.round(k*Math.max(1,N/L)/2)*2,height:Math.round(k*Math.max(1,L/N)/2)*2}}function Hi(b,k){const N=Gi(k);return!N||vt(b,N)!=="on"?null:qo(vt(b,ht(k,"aspect_ratio")),1080)}function Pa(b,k){if(k.execution!=="if_studio"||k.outputType!=="video")return null;const N=Vi.find(L=>L.id===b.params.if_video_resolution);return N?{label:N.id,...qo(vt(b,ht(k,"aspect_ratio")),N.short)}:null}function Kl(b,k){for(const N of b.querySelectorAll("input, select"))N.addEventListener("input",k),N.addEventListener("change",k);for(const N of b.querySelectorAll('[role="switch"]'))N.addEventListener("click",k)}function Gl(b){const{document:k,save:N,ratioGrid:L,claritySteps:J,resolutionPresets:q,resolutionPreset:G}=b,d=S=>{N(),S?.()},P=S=>S.outputType==="video"?pr.map(E=>({id:`${E}p`,label:`${E}p`,val:E})):J;function ee(S){let E=null,B=1/0;for(const[R,[$,Q]]of Object.entries(so)){const Ce=Math.abs(S[1]/S[2]-$/Q);Ce<B-1e-9&&(B=Ce,E=R)}return E}function re(S){const E=so[dr(S)];return E?L.find(B=>B[1]===E[0]&&B[2]===E[1]):void 0}function Fe(S,E){let B="3:4",R=1/0;for(const $ of L){const Q=Math.abs(S/E-$[1]/$[2]);Q<R&&(R=Q,B=$[0])}return B}function We(S,E){const B=P(S),R=B.find(Me=>Me.id===E.params._clarity);if(R)return R;const $=Rn(vt(E,ht(S,"width"))),Q=Rn(vt(E,ht(S,"height")));if(!$||!Q)return null;let Ce=null,Le=1/0;for(const Me of B){const qe=Math.abs(Me.val-Math.min($,Q));qe<Le&&(Le=qe,Ce=Me)}return Ce}function Ne(S){const E=k.createElement("div");return E.className="ctitle",E.textContent=S,E}function rt(S=!1){const E=k.createElement("div");return E.className=S?"cgrid k":"cgrid",E}function ze(S,E,B,R){const $=k.createElement("button");return $.type="button",$.textContent=S,$.className=E?"on":"",$.title=B,$.setAttribute("aria-pressed",String(E)),$.onclick=R,$}function Z(S,E,B,R){const $=ze("",E,B,R),Q=k.createElement("i");Q.style.setProperty("--ratio",String(S[1]/S[2]));const Ce=k.createElement("span");return Ce.textContent=S[0],$.append(Q,Ce),$}function oe(S,E,B){if(E.imageControls)return b.imageClarityPicker(S,E,B);const R=ht(E,"aspect_ratio"),$=ht(E,"megapixels"),Q=ht(E,"resolution"),Ce=ht(E,"width")&&ht(E,"height"),Le=ht(E,"scale_to_length"),Me=k.createElement("div");if(Me.className="cpick",Q){const X=q(Q),C=G(Q,vt(S,Q))??X[0];if(!C)return Me;const _=rt();for(const ce of new Set(X.map(A=>A.ratio))){const[A=1,F=1]=ce.split(":").map(Number);_.appendChild(Z([ce,A,F],ce===C.ratio,`画面比例 ${ce}`,()=>{const l=X.filter(I=>I.ratio===ce).reduce((I,ue)=>Math.abs(ue.short-C.short)<Math.abs(I.short-C.short)?ue:I);S.params.resolution=l.value,d(B)}))}const V=rt(!0);for(const ce of X.filter(A=>A.ratio===C.ratio))V.appendChild(ze(`${ce.width}×${ce.height}`,ce.value===C.value,"",()=>{S.params.resolution=ce.value,d(B)}));return Me.append(Ne("画面比例"),_,Ne("分辨率"),V),Me}if(Le&&!R){const X=k.createElement("input");X.type="number";const C=Le.min||512,_=Le.max||1344,V=Le.step||32;X.min=String(C),X.max=String(_),X.step=String(V),X.value=String(vt(S,Le)??""),X.style.cssText="width:100%;padding:8px;font-size:14px;border:1px solid #3a3a44;border-radius:4px;background:#1a1a22;color:#fff";const ce=()=>{const H=Number.parseInt(X.value,10);Number.isNaN(H)||(S.params.scale_to_length=Math.max(C,Math.min(_,H)),d(B))};X.oninput=ce;const A=rt(!0);for(const H of pr){const l=Yi[H];if(l===void 0)continue;const I=ze(`${H}p`,Number(X.value)===l,`16:9 素材约 ${H}p；最长边 ${l}px，实际短边随素材比例变化`,()=>{X.value=String(l),ce()});I.disabled=l<C||l>_,A.appendChild(I)}const F=k.createElement("div");return F.style.cssText="font-size:12px;color:#8a8a94;margin-top:4px",F.textContent=`档位按 16:9 素材标注，实际短边随素材比例变化。最长边范围：${C} ~ ${_}，步进 ${V}`,Me.append(Ne("分辨率（最长边）"),A,X,F),Me}const qe=!R&&Ce,$e=()=>{const X=Rn(Tr(S.params.width)??Ce?.default),C=Rn(vt(S,ht(E,"height")));return X&&C?Fe(X,C):"3:4"};function Be(X){const C=We(E,S)??P(E)[1];if(!C)return;const[,_,V]=X,ce=E.outputType==="video"?On:16;S.params.width=_>=V?Math.round(C.val*_/V/ce)*ce:C.val,S.params.height=_>=V?C.val:Math.round(C.val*V/_/ce)*ce}if(R||qe){const X=R?vt(S,R):dr(S.params._ratio)||$e(),C=R?re(X):void 0,_=rt();for(const V of L){const ce=!!qe&&(V[0]===X||!S.params._ratio&&V[0]===L.find(l=>Math.abs(Rn(S.params.width)/Rn(S.params.height)-l[1]/l[2])<.02)?.[0]),A=R?V===C:ce,F=ee(V),H=Z(V,A,`画面比例 ${V[0]}`+(R&&F!==X?`（工作流档位：${F}）`:"（当前）"),()=>{R?S.params.aspect_ratio=F:(S.params._ratio=V[0],Be(V)),d(B)});R&&!A&&F===X&&(H.className="near"),_.appendChild(H)}Me.append(Ne("画面比例"),_)}const He=$?Tr(S.params.aspect_ratio)??ht(E,"aspect_ratio")?.default??"16:9 (Widescreen)":null;if($||Ce){const X=$?pr.flatMap(F=>{const H=Ki(He,F);return H>($.max??1.1)+.01?[]:[{id:`${F}p`,label:`${F}p`,val:H,p:F}]}):[...P(E)],C=rt(!0),_=We(E,S),V=Gi(E),ce=Hi(S,E),A=Pa(S,E);for(const F of X){const H=$?qi(vt(S,$)):_?.val,l=!ce&&!A&&($?Number.isFinite(H)&&Math.min(...cr(He,Number(H)))===F.p:H!=null&&Math.abs(H-F.val)<40),I=L.find(j=>j[0]===(S.params._ratio||"3:4"))??Di,ue=E.outputType==="video"?On:16,Pe=$?cr(He,F.val).join("×"):I[1]>=I[2]?`${Math.round(F.val*I[1]/I[2]/ue)*ue} × ${F.val}`:`${F.val} × ${Math.round(F.val*I[2]/I[1]/ue)*ue}`;C.appendChild(ze(F.label,l,Pe,()=>{if(V&&(S.params.output_1080p="off"),delete S.params.if_video_resolution,$)S.params.megapixels=F.val;else{S.params._clarity=F.id;let j=dr(S.params._ratio);if(!j){j=$e();const ie=Rn(Tr(S.params.width)??Ce?.default),U=Rn(vt(S,ht(E,"height")));ie&&U&&(S.params._ratio=j)}Be(L.find(ie=>ie[0]===j)??Di)}d(B)}))}if(V){const F=qo(vt(S,ht(E,"aspect_ratio")),1080);C.appendChild(ze("1080p",!!ce,`${F.width}×${F.height}`,()=>{S.params.output_1080p="on",d(B)}))}if(E.execution==="if_studio"&&E.outputType==="video")for(const F of Vi){const H=qo(vt(S,ht(E,"aspect_ratio")),F.short);C.appendChild(ze(F.id,A?.label===F.id,`${H.width}×${H.height}`,()=>{S.params.if_video_resolution=F.id,d(B)}))}if(Me.append(Ne("清晰度"),C),V?.hint){const F=k.createElement("div");F.className="knobnote",F.textContent=V.hint.replace("开启后","1080p 档位").replace("关闭保留原有行为。","其他清晰度档位保留原有行为。"),Me.appendChild(F)}}return Me}function Ee(S,E){if(!E)return null;if(E.imageControls){const X=b.imageSettings(S,E);return`${X.ratio==="original"?"原图":X.ratio} · ${X.clarity}`}const B=ht(E,"aspect_ratio"),R=ht(E,"megapixels"),$=ht(E,"resolution"),Q=ht(E,"width"),Ce=ht(E,"scale_to_length"),Le=E.inputs.find(X=>X.presets&&X.appearance!=="switch"),Me=ht(E,"duration"),qe=ht(E,"preview_seconds"),$e=E.outputType==="video"?ht(E,"sound"):void 0;if(!B&&!R&&!$&&!Q&&!Ce&&!Le&&!Me&&!qe&&!$e)return null;const Be=[];if(Ce&&!B)return Be.push(`${vt(S,Ce)}px`),$e&&Be.push(vt(S,$e)==="on"?"有声音":"无声音"),Be.join(" · ");if($){const X=G($,vt(S,$));X&&Be.push(X.ratio,`${X.width}×${X.height}`)}else if(B){const X=vt(S,B);Be.push(re(X)?.[0]??dr(X).split(" ")[0]??"")}else Q&&S.params._ratio&&Be.push(dr(S.params._ratio));const He=Hi(S,E);if(He)Be.push("1080p",`${He.width}×${He.height}`);else if(R){const X=qi(vt(S,R)),C=Tr(S.params.aspect_ratio)??B?.default??"16:9 (Widescreen)",_=Number.isFinite(X)?Math.min(...cr(C,X)):null;Be.push(Pa(S,E)?.label??(_?`${_}p`:"?"))}else if(Q){const X=We(E,S);X&&Be.push(X.label)}if(Le){const X=vt(S,Le),C=Le.options?.find(V=>(V&&typeof V=="object"?V.value:V)===X),_=C&&typeof C=="object"?C.label:dr(C);_&&Be.unshift(_.replace(/（.*$/,""))}if(Me&&Be.push(`${vt(S,Me)}秒${qe?"/段":""}`),qe){const X=vt(S,qe);Rn(X)>0&&Be.push(`试前${X}秒`)}return $e&&Be.push(vt(S,$e)==="on"?"有声音":"无声音"),Be.join(" · ")}function we(S,E){const B=S.cap!==E;B&&delete S.params.output_1080p,b.switchImageCapability(S,E),B&&delete S.params.output_1080p}return{clarityPicker:oe,paramsBrief:Ee,switchImageCapability:we}}const Do=b=>b instanceof Ai?b:new Ai(Rr(b),b&&typeof b=="object"&&"status"in b&&typeof b.status=="number"?b.status:0,b);function Zl(b){const k=b.setTimeout||globalThis.setTimeout,N=b.clearTimeout||(R=>{R!==null&&globalThis.clearTimeout(R)});let L=null,J=null,q=!1,G=0,d=0,P=0,ee=null,re=null;const Fe=new Set;let We=Promise.resolve(),Ne=Promise.resolve();function rt(R){Fe.add(R);const $=()=>{Fe.delete(R),b.flushPendingProjectSync()};return R.then($,Q=>{re=Do(Q),$()}),R}function ze(){if(b.nodeEditor||!b.isAuthenticated()||!b.getProject())return;N(J);const R=b.getProject()?.id;R&&(J=k(()=>{J=null;const $=b.getView(),Q={x:$.x,y:$.y,k:$.k};Ne=Ne.then(async()=>{if(b.isAuthenticated())try{await b.jput(`/api/projects/${encodeURIComponent(R)}/view`,Q)}catch(Ce){b.getProject()?.id===R&&b.showError("视图保存失败："+Rr(Ce))}})},400))}function Z(R=!0){R&&b.recordCanvasEdit();const $=b.getProject();if(!b.canSave()||!$||$.locked)return;N(L);const Q=$.id;L=k(()=>{L=null,oe(Q)},700)}function oe(R=b.getProject()?.id){d++;const $=We.catch(()=>{}).then(()=>we(R)).finally(()=>{d--,b.flushPendingProjectSync()});return We=$,$}async function Ee(R,$){const Q=await b.api(`/api/projects/${encodeURIComponent(R)}`);if(b.getProject()?.id!==R||Q.rev!==$.rev)return null;const Ce=new Set(Q.cards.map($e=>$e.id)),Le=$.cards.filter($e=>$e&&typeof $e=="object"&&!Array.isArray($e)&&!Ce.has(String($e.id)));if(!Le.length)return null;let Me=Q;for(const $e of Le){const Be=await b.jpost(`/api/projects/${encodeURIComponent(R)}/cards`,{card:$e,rev:Me.rev}),He=b.getProject();if(He?.id!==R)throw new Error("恢复节点期间画布已切换");if(Me=Be.project,$e&&typeof $e=="object"&&!Array.isArray($e)){const X=Be.card||Me.cards.find(_=>_.id===$e.id),C=He.cards.find(_=>_.id===$e.id);if(X&&C)for(const _ of["created_by","created_by_name","created_at"])X[_]!==void 0&&(C[_]=X[_],$e[_]=X[_])}}$.rev=Me.rev;const qe=b.getProject();if(qe?.id!==R)throw new Error("恢复节点期间画布已切换");return qe.rev=Math.max(qe.rev,$.rev),b.jput(`/api/projects/${encodeURIComponent(R)}`,$)}async function we(R=b.getProject()?.id){const $=b.getProject();if(!b.canSave()||!$||$.id!==R)return{ok:!1,error:new Error("画布不可保存或已切换")};if(b.nodeEditor&&!b.editorCard())return{ok:!1,error:new Error("此节点已删除或不可访问")};if(b.nodeEditor&&ee?.status===409)return{ok:!1,error:ee};const Q=$.id,Ce={rev:$.rev||0,name:$.name,cards:$.cards.map(b.plain),edges:$.edges,groups:$.groups||[]};q=!0;try{const Le=await b.jput(`/api/projects/${encodeURIComponent(Q)}`,Ce),Me=b.getProject();return Me?.id!==Q?{ok:!1,error:new Error("保存期间画布已切换")}:(Me.rev=Math.max(Me.rev||0,Le.rev||0),ee=null,{ok:!0})}catch(Le){let Me=Do(Le);if(Me.status===409&&b.getProject()?.id===Q&&!b.nodeEditor&&!P)try{const qe=await Ee(Q,Ce);if(qe){const $e=b.getProject();return $e?.id!==Q?{ok:!1,error:new Error("保存期间画布已切换")}:($e.rev=Math.max($e.rev||0,qe.rev||0),ee=null,{ok:!0})}}catch(qe){Me=Do(qe)}return b.getProject()?.id===Q&&(ee=Me),Me.status===409&&b.getProject()?.id===Q&&!b.nodeEditor&&!P?(b.toast("画布在别处被改过，已重新加载"),await b.openProject(Q)):b.showError("保存失败："+Me.message),{ok:!1,error:Me}}finally{q=!1,b.flushPendingProjectSync()}}async function S(R=b.getProject()?.id,$=!1){P++;try{for(b.flushFocusedControl();;){const Q=We;if(await Q,await Promise.all([...Fe]),b.getProject()?.id!==R)throw new Error("画布已关闭或切换");if(re)throw re;if(ee&&[403,404,409].includes(ee.status))throw ee;if(Q!==We||Fe.size||G)continue;if(!b.canSave()){if($&&!ee&&!d&&L===null)return;throw new Error("此画布只读或已锁定，不能保存")}if(b.nodeEditor&&!b.editorCard())throw new Error("此节点已删除，不能保存或重新创建");N(L),L=null;const Ce=await oe(R);if(!Ce.ok)throw Ce.error;if(re)throw re;if(!Fe.size&&!G&&!d&&L===null)return}}catch(Q){throw Q===re&&(re=null),Q}finally{P--,b.flushPendingProjectSync()}}function E(){N(L),L=null}function B(R){G++;const $=We.catch(()=>{}).then(R).finally(()=>{G--,b.flushPendingProjectSync()});return We=$,$}return{saveView:ze,save:Z,enqueueSave:oe,flushLocalChanges:S,trackNodeWork:rt,enqueueCardCreate:B,cancelContentSave:E,cancelTimers(){E(),N(J),J=null},resetFailures(){ee=null,re=null},markWorkFailure(R){re=Do(R)},beginFlush(){P++},endFlush(){P--,b.flushPendingProjectSync()},get pendingChain(){return We},get busy(){return L!==null||q||d>0||G>0||Fe.size>0||P>0||!!(b.nodeEditor&&ee)},get status(){return Object.freeze({contentSaving:q,pendingCardCreates:G,pendingContentSaves:d,localFlushes:P,pendingNodeWork:Fe.size,saveScheduled:L!==null,saveFailure:ee,workFailure:re})}}}const Ql={create:Zl};function Zi(b){let k=b;const N=new Set;return{getSnapshot:()=>k,subscribe:L=>(N.add(L),()=>{N.delete(L)}),set:L=>{k=L,N.forEach(J=>J())}}}const Ui=()=>({enabled:!1,initialized:!1,loading:!1,hasMore:!1,total:0,error:null,blocked:!1});function ed(b,k){let N=Ui(),L=new Map;const J=new Set;let q=null,G=0,d=null,P=-1/0,ee="refresh";function re(){G++,d=null,L.clear(),J.clear(),q=null,P=-1/0,N=Ui()}function Fe(){const Ne=b?.isAdmin()===!0;return!Ne&&N.enabled?(re(),k()):Ne&&!N.enabled&&(N={...N,enabled:!0}),Ne&&!N.blocked}function We(Ne,rt=!1){if(!Fe()||!b)return Promise.resolve();if(d)return d;if(Ne==="older"&&(!N.initialized||!N.hasMore||!q))return Promise.resolve();const ze=(b.now??Date.now)();if(Ne==="refresh"&&!rt&&ze-P<5e3)return Promise.resolve();const Z=G,oe=Ne==="older"?q:null;Ne==="refresh"&&(P=ze),N={...N,loading:!0,error:null};const Ee=Promise.resolve().then(()=>Z!==G||!b.isAdmin()?null:b.list({limit:50,status:"all",...oe===null?{}:{cursor:oe}})).then(we=>{if(Z===G&&!(!Fe()||!we)){if(Ne==="older"&&we.next_cursor===oe)throw new Error("历史分页游标未前进，请重试");L=new Map(L);for(const S of we.jobs)J.has(S.id)||L.set(S.id,S);(!N.initialized||Ne==="older"||q===null)&&(q=we.next_cursor),N={...N,initialized:!0,total:we.total,hasMore:q!==null}}}).catch(we=>{if(Z!==G||!Fe())return;ee=Ne;const S=typeof we=="object"&&we!==null&&"status"in we&&(we.status===401||we.status===403);S&&(L.clear(),q=null),N={...N,error:Rr(we),blocked:S,...S?{total:0,hasMore:!1,initialized:!1}:{}}}).finally(()=>{Z!==G||d!==Ee||(d=null,N={...N,loading:!1},k())});return d=Ee,k(),Ee}return{getSnapshot:()=>N,getJobs:()=>[...L.values()],synchronizeAccess:Fe,refresh:()=>We("refresh"),loadMore:()=>We("older"),retry:()=>We(ee,!0),reset:re,forgetTask(Ne){J.add(Ne),L.delete(Ne)},forgetLive(Ne){for(const rt of Ne)L.get(rt)?.history_only||L.delete(rt)},renameProject(Ne,rt){L=new Map([...L].map(([ze,Z])=>[ze,Z.project===Ne?{...Z,projectName:rt}:Z]))}}}function td(b){const k=Zi([]);let N=null,L=0,J=0,q=[],G=!1;const d=new Set,P=ed(b.history,re);function ee(Z,oe){return(oe.created??0)-(Z.created??0)||(Z.id<oe.id?1:Z.id>oe.id?-1:0)}function re(){const Z=P.getJobs(),oe=new Set(q.map(B=>B.id)),Ee=new Map(Z.filter(B=>B.history_only||!G||oe.has(B.id)).map(B=>[B.id,B])),we=P.getSnapshot(),S=[...Z].sort(ee).at(-1);for(const B of q)(!we.enabled||za(B)||d.has(B.id)||Ee.has(B.id)||we.initialized&&S&&ee(B,S)<=0)&&Ee.set(B.id,B);const E=[...Ee.values()];we.enabled&&E.sort(ee),k.set(E),b.onChange()}function Fe(Z){const oe=Z.filter(S=>!S.history_only),Ee=new Set(oe.map(S=>S.id)),we=new Set(q.map(S=>S.id));for(const S of d)Ee.has(S)||d.delete(S);for(const S of oe)(za(S)||G&&!we.has(S.id))&&d.add(S.id);P.forgetLive(q.filter(S=>!Ee.has(S.id)).map(S=>S.id)),q=oe,G=!0,re()}function We(){J++,N=null}function Ne(){if(P.refresh(),N)return N;const Z=L,oe=J,Ee=(async()=>{let we;try{we=await b.list()}catch{return}Z!==L||oe!==J||(Fe(we),!(Z!==L||oe!==J)&&await b.onJobsChanged(we.filter(S=>!S.history_only)))})().finally(()=>{N===Ee&&(N=null)});return N=Ee,Ee}async function rt(Z){if(Z=k.getSnapshot().find(E=>E.id===Z.id)??Z,Z.history_only||!b.canTask(Z))return;const oe=L,Ee=await b.remove(Z);if(oe!==L)return;const we=Fi.parse(Ee);We();const S=k.getSnapshot().find(E=>E.id===Z.id)??Z;we.ok===!0&&!we.pending&&!S.history_only&&b.canTask(S)&&(P.forgetTask(Z.id),await b.onTaskDeleted?.(Z)),oe===L&&Ne()}async function ze(){const Z=q.filter(S=>!za(S)&&b.canTask(S));if(!b.clear||!Z.length)return;const oe=L,Ee=await b.clear();if(oe!==L)return;const we=Fi.parse(Ee);if(we.ok===!0&&!we.pending)for(const S of Z)P.forgetTask(S.id);We(),Ne()}return{...k,setJobs:Fe,pollJobs:Ne,deleteTask:rt,clearDoneTasks:ze,getLiveSnapshot:()=>q,getHistorySnapshot:P.getSnapshot,refreshHistory:P.refresh,loadMoreHistory:P.loadMore,retryHistory:P.retry,reset(){L++,We(),P.reset(),Fe([]),G=!1},retainProjects(Z){L++,We(),P.reset(),Fe(q.filter(oe=>oe.project&&Z.includes(oe.project))),G=!1},renameProject(Z,oe){P.renameProject(Z,oe),Fe(q.map(Ee=>Ee.project===Z?{...Ee,projectName:oe}:Ee))}}}function nd(b){return async function(N,{deleted:L=!1}={}){const J=b.getProject();if(!J||!b.canOperate())return;const q=J.cards.filter(d=>d.job&&!b.isIF(d)&&(d.status==="queued"||d.status==="running"||d.status==="canceled")).map(d=>({card:d,job:d.job,status:d.status}));let G=!1;for(const{card:d,job:P,status:ee}of q){if(b.getProject()!==J||!b.canOperate())return;if(!J.cards.includes(d)||d.job!==P||d.status!==ee)continue;const re=N.find(Fe=>Fe.id===P);if(re&&!(!b.canTask(re)||re.project&&re.project!==J.id||re.card&&re.card!==d.id)){if(L){d.status="canceled",d.step="",d.job=null,b.paint(d),G=!0,b.refreshPanel(d);continue}d.status=re.status,d.progress=re.progress,d.error=re.error,d.queue_remaining=re.queue_remaining,d.queue_ahead=re.queue_ahead,d.queue_order=re.queue_order,d.queue_wait_seconds=re.queue_wait_seconds,d.step=re.step||"",re.seed!=null&&(d.seed=re.seed),re.started&&re.ended&&(d.ms=Math.round((re.ended-re.started)*1e3)),re.outputs?.length&&(d.outputs=re.outputs),b.paint(d),ee!==d.status&&(G=!0,b.refreshPanel(d),d.status==="done"&&(b.pushHistory(d,re),b.refreshHistory(d),await b.propagateCardOutputs(d)),d.status==="error"&&b.showError(`「${b.titleOf(d)}」生成失败：${d.error||"未知错误"}`))}}G&&b.getProject()===J&&b.canOperate()&&b.save(!1)}}function rd(b){return async k=>{if(!Number.isInteger(k.limit)||k.limit<1)throw new Error("无效分页大小");const N=new URLSearchParams({limit:String(k.limit),status:k.status});return k.cursor!==void 0&&N.set("cursor",k.cursor),Pl.parse(await b(`/api/jobs/history?${N}`))}}function od({document:b,panel:k,button:N,getViewport:L,getUser:J,canTask:q,api:G,jpost:d,jobProjName:P,fmtEla:ee,histTime:re,toast:Fe,showError:We,confirm:Ne,onFocusTask:rt,onJobsChanged:ze,onTaskDeleted:Z=()=>{}}){const oe=td({list:async()=>Il.parse(await G("/api/jobs")).jobs,remove:C=>G(`/api/job/${C.id}`,{method:"DELETE"}),clear:()=>d("/api/jobs/clear"),canTask:q,history:{list:rd(G),isAdmin:()=>J()?.role==="admin"},onChange(){B(),k.style.display!=="none"&&Le()},onJobsChanged:ze,onTaskDeleted:Z}),Ee=oe.pollJobs,we={queued:"等待中",running:"运行中",done:"已完成",error:"失败",canceled:"已取消"},S=C=>C.status==="queued"||C.status==="running",E=C=>C.status==="running"?"run":C.status==="queued"?"wait":C.status==="done"?"done":C.status==="error"?"bad":"gone";function B(){const C=oe.getLiveSnapshot().filter(S),_=C.find(F=>F.status==="running"),V=N,ce=`${C.length}|${_?Math.round((_.progress||0)*100):-1}`;if(V._sig===ce)return;V._sig=ce,V.classList.toggle("run",!!_),V.classList.toggle("wait",!_&&C.length>0),V.innerHTML=`任务<span class="n">(${C.length})</span>`;const A=_?`运行中 ${Math.round((_.progress||0)*100)}%`:C.length?"等待中":"";if(A){const F=b.createElement("span");F.className="s",F.textContent=A,V.appendChild(F)}V.title=C.length?`${C.length} 个任务没跑完，点开可以看详情、停止或删除`:"现在没有任务在跑，点开看历史"}function R(){k.style.display==="none"?(k.style.display="",N.classList.add("open"),Le(),Q(),Ee()):$()}function $(){k.style.display="none",k.innerHTML="",k._sig=null,N.classList.remove("open")}function Q(){if(k.style.display==="none")return;const C=8,_=N.getBoundingClientRect();k.style.maxHeight=L().height-_.bottom-C*2+"px";const V=k.offsetWidth;k.style.top=_.bottom+C+"px",k.style.left=Math.max(C,Math.min(_.right-V,L().width-V-C))+"px"}const Ce=()=>JSON.stringify([oe.getHistorySnapshot(),oe.getSnapshot().map(C=>[C.id,C.status,!!C.error,C.history_only,C.permission,P(C),C.cardName,C.name,C.submitter_display_name,C.submitter_username])]);function Le(){const C=Ce();if(k._sig===C){for(const ue of k.querySelectorAll(".jrow")){const Pe=oe.getSnapshot().find(j=>j.id===ue._id);Pe&&qe(ue,Pe)}return}k._sig=C;const _=k.querySelector(".jlist"),V=_?_.scrollTop:0;k.innerHTML="";const ce=b.createElement("div");ce.className="jhd";const A=b.createElement("b"),F=oe.getLiveSnapshot().filter(S).length;if(A.textContent=F?`任务 · ${F} 个没跑完`:"任务",ce.appendChild(A),oe.getSnapshot().some(ue=>!ue.history_only&&!S(ue))){const ue=b.createElement("button");ue.className="lnk",ue.textContent="清空已结束",ue.title="只清列表里的记录，已经出好的产物还在节点上",ue.onclick=X,ce.appendChild(ue)}const H=b.createElement("button");H.className="x",H.textContent="✕",H.title="关闭",H.onclick=$,ce.appendChild(H);const l=b.createElement("div");if(l.className="jlist",!oe.getSnapshot().length){const ue=b.createElement("div");ue.className="jempty",ue.textContent="还没有任务。在节点上点「生成」，任务就会出现在这里。",l.appendChild(ue)}for(const ue of oe.getSnapshot())l.appendChild(Me(ue));const I=oe.getHistorySnapshot();if(I.enabled){const ue=b.createElement("div");if(ue.className="jhistory",ue.setAttribute("role","status"),ue.setAttribute("aria-live","polite"),ue.textContent=I.loading?"正在加载任务历史…":I.error?`任务历史加载失败：${I.error}`:`已显示 ${oe.getSnapshot().length} 条任务 · 历史共 ${I.total} 条${I.hasMore?"":" · 已加载全部历史"}`,l.appendChild(ue),!I.blocked&&(I.hasMore||I.error||I.loading)){const Pe=$e(I.error?"重试加载任务历史":"加载更早任务",()=>I.error?oe.retryHistory():oe.loadMoreHistory());Pe.className="jmore",Pe.disabled=I.loading,l.appendChild(Pe)}l.onscroll=()=>{const Pe=oe.getHistorySnapshot();!Pe.loading&&!Pe.error&&Pe.hasMore&&l.scrollHeight-l.scrollTop-l.clientHeight<=120&&oe.loadMoreHistory()}}k.append(ce,l),l.scrollTop=V}function Me(C){const _=b.createElement("div");_.className="jrow "+E(C),_._id=C.id;const V=J()?.role==="admin"?C.submitter_display_name?.trim()||C.submitter_username||"未记录提交人":"";if(V){const j=b.createElement("div");j.className="jowner",j.textContent=V,_.append(j)}const ce=b.createElement("div");ce.className="r1";const A=b.createElement("span");A.className="nm";const F=C.cardName||C.name||C.id,H=P(C);if(H){const j=b.createElement("i");j.className="pj",j.textContent=H+" - ",A.appendChild(j)}const l=b.createElement("span");l.className="cn",l.textContent=F,A.appendChild(l),A.title=(V?`${V} - `:"")+(H?`${H} - `:"")+(C.name&&F!==C.name?`${F}（${C.name}）`:F),_._st=b.createElement("span"),_._st.className="st",ce.append(A,_._st);const I=b.createElement("div");I.className="r2",_._sp=b.createElement("span"),_._sp.className="sp",_._tm=b.createElement("span"),I.append(_._sp,_._tm);const ue=b.createElement("div");if(ue.className="r3",_._node=b.createElement("span"),_._node.className="node",_._step=b.createElement("span"),_._step.className="step",ue.append(_._node,_._step),_.append(ce,I,ue),S(C)&&(!C.history_only||C.progress!=null)){const j=b.createElement("div");j.className="bar",_._bar=b.createElement("i"),j.appendChild(_._bar),_.appendChild(j)}if(C.error){const j=b.createElement("div");j.className="msg",j.textContent=C.error,_.appendChild(j)}const Pe=b.createElement("div");return Pe.className="acts",C.history_only||(S(C)&&Pe.appendChild($e("停止",()=>Be(C))),Pe.appendChild($e("删除",()=>He(C),!0))),C.project&&C.card&&Pe.appendChild($e("看节点",()=>rt(C))),_.appendChild(Pe),qe(_,C),_}function qe(C,_){const V=Math.round((_.progress||0)*100);C._st.textContent=_.status==="running"?_.progress==null?"运行中":`运行中 ${V}%`:_.status==="queued"?Wi(_):we[_.status]||_.status,C._st.title=_.status==="queued"&&_.queue_order||"";const ce=[_.name,_.modelName||_.capability].filter(Boolean).join(" · ");C._sp.textContent!==ce&&(C._sp.textContent=C._sp.title=ce);const A=`执行节点：${_.nodeName||(_.history_only?"未记录":"等待分配")}`;C._node.textContent!==A&&(C._node.textContent=C._node.title=A);const F=_.step?`当前：${_.step}`:"";C._step.textContent!==F&&(C._step.textContent=C._step.title=F);const H=_.started?ee(((_.ended||Date.now()/1e3)-_.started)*1e3):"";C._tm.textContent=(_.created==null?"":re(_.created*1e3))+(H?` · ${H}`:""),C._bar&&(C._bar.style.width=V+"%")}function $e(C,_,V){const ce=b.createElement("button");return V&&(ce.className="danger"),ce.textContent=C,ce.onclick=_,ce}async function Be(C){if(C=oe.getSnapshot().find(_=>_.id===C.id)||C,C.history_only||!q(C))return Fe("此任务关联的画布为只读，不能停止");try{await d(`/api/job/${C.id}/cancel`)}catch(_){return We(_.message)}Ee()}async function He(C){if(C=oe.getSnapshot().find(_=>_.id===C.id)||C,C.history_only||!q(C))return Fe("此任务关联的画布为只读，不能删除");if(!(S(C)&&!Ne("这个任务还没跑完，删除会先把它停掉。继续？")))try{await oe.deleteTask(C)}catch(_){return We(_.message)}}async function X(){if(oe.getSnapshot().some(C=>!C.history_only&&!S(C)))try{await oe.clearDoneTasks()}catch(C){return We(C.message)}}return{pollJobs:Ee,paintJobsBtn:B,toggleJobs:R,closeJobs:$,placeJobs:Q,renderJobs:Le,stopTask:Be,delTask:He,clearDoneJobs:X,getJobs:oe.getSnapshot,reset:oe.reset,retainProjects:oe.retainProjects,renameProject:oe.renameProject}}const ad={create:od,createCanvasUpdater:nd};function id(b,k,N,L,J,q){const{window:G,document:d,addEventListener:P,setTimeout:ee,clearTimeout:re,setInterval:Fe,clearInterval:We,requestAnimationFrame:Ne,cancelAnimationFrame:rt,ResizeObserver:ze,MutationObserver:Z,IntersectionObserver:oe,URL:Ee}=b,we=J.mediaFetch,S=J.WebSocket,E=Ql,B=ad,R=Yl;G.ChoukaImageComposer=q;const $=(e,t=d)=>t.querySelector(e),Q=268,Ce=180,Le=900,Me=90,qe=900,$e=.1,Be=5,He=e=>e.w||Q,X="http://www.w3.org/2000/svg",C=new URLSearchParams(location.search),_=C.get("editor")==="1",V=C.get("project"),ce=C.get("card");_&&d.body.classList.add("node-editor"),d.addEventListener("contextmenu",e=>e.preventDefault());let A=[],F={},H={},l=null,I=[],ue=[],Pe="personal",j={x:60,y:70,k:1},ie=null,U=new Set,St=null,st=null,Sn=null,dn=null,$t=new Map,Qt=-1,Ft=null,An=null,_t=0,Dt=null,qt=!1;const m={side:$("#side"),plist:$("#plist"),dot:$("#dot"),spaceSelect:$("#space-select"),spaceLabel:$("#space-label"),spaceStatus:$("#space-status"),ptitle:$("#ptitle"),hint:$("#hint"),fit:$("#fit"),presenceUsers:$("#presence-users"),stage:$("#stage"),world:$("#world"),wires:$("#wires"),groups:$("#groups"),presenceLayer:$("#presence-layer"),lasso:$("#lasso"),selbar:$("#selbar"),dock:$("#dock"),empty:$("#empty"),panel:$("#panel"),hist:$("#hist"),menu:$("#menu"),tip:$("#tip"),toast:$("#toast"),picker:$("#picker"),jobsbtn:$("#jobsbtn"),jobs:$("#jobs"),view:$("#view"),vbox:$("#view .vbox"),respop:$("#respop"),minimapBtn:$("#minimap-btn"),wiresToggle:$("#wires-toggle"),zoomMenu:$("#zoom-menu"),minimap:$("#minimap"),minimapCanvas:$("#minimap-canvas"),minimapViewport:$("#minimap-viewport"),zoomPercent:$("#zoom-percent")},Ye=E.create({setTimeout:ee,clearTimeout:re,getProject:()=>l,getView:()=>j,isAuthenticated:()=>k.active,canSave:()=>on(),nodeEditor:_,editorCard:()=>Hr(),plain:e=>Ko(e),api:(...e)=>kt(...e),jpost:(...e)=>Vt(...e),jput:(...e)=>dt(...e),recordCanvasEdit:()=>xo(),flushPendingProjectSync:()=>ea(),openProject:e=>vr(e),toast:e=>ne(e),showError:e=>Ie(e),flushFocusedControl:()=>{d.activeElement?.closest?.("#panel, #respop")&&d.activeElement.blur()}}),{saveView:en,save:K,enqueueSave:ur,flushLocalChanges:Yn,trackNodeWork:D}=Ye,Je=B.createCanvasUpdater({getProject:()=>l,canOperate:()=>be(),isIF:e=>Qe(e),canTask:e=>fr(e),paint:e=>ot(e),refreshPanel:e=>{m.panel._id===e.id&&Se(e.id)},pushHistory:(e,t)=>Mr(e,t),refreshHistory:e=>{m.hist._id===e.id&&zr(e.id)},propagateCardOutputs:e=>Ri(e),titleOf:e=>he(e),showError:e=>Ie(e),save:e=>K(e)}),lt=B.create({document:d,panel:m.jobs,button:m.jobsbtn,getViewport:()=>({width:innerWidth,height:innerHeight}),getUser:()=>k.user,canTask:e=>fr(e),api:(...e)=>kt(...e),jpost:(...e)=>Vt(...e),jobProjName:e=>Ml(e),fmtEla:e=>sr(e),histTime:e=>_a(e),toast:e=>ne(e),showError:e=>Ie(e),confirm:e=>confirm(e),onFocusTask:e=>Oi(e),onJobsChanged:e=>Je(e),onTaskDeleted:e=>Je([e],{deleted:!0})}),{pollJobs:pt,paintJobsBtn:pn,toggleJobs:Vn,closeJobs:$n,placeJobs:Pt,renderJobs:jn}=lt,be=(e=l)=>k.active&&e?.permission==="operate",on=()=>be()&&!l.locked,fr=e=>k.active&&e?.permission==="operate",De=()=>be()?!0:(ne("此画布只读，不能修改或运行"),!1),mr=()=>{if(!l?.id)throw new Error("请先打开可操作画布");return`/api/upload?project=${encodeURIComponent(l.id)}`},It=async(e,t=!1)=>{if(!De())throw new Error("此画布只读");const n=l,o=new FormData;o.append("file",e,e.name);const r=mr()+(t?"&local_only=1":""),a=await kt(r,{method:"POST",body:o});if(l!==n||!be())throw new Error("画布已切换或权限已变化，上传已取消");const i=a.files?.[0]||a;if(!i?.url||!i?.ref)throw new Error("上传接口未返回素材");return i};async function kt(e,t={}){const n=(t.method||"GET").toUpperCase();if(!["GET","HEAD"].includes(n)){const o=new Ee(e,location.href);if(/^\/api\/(upload|generate|text|rewrite)$/.test(o.pathname)&&!be())throw new Error("此画布只读");const r=o.pathname.match(/^\/api\/projects\/([^/]+)(?:\/(rename|copy))?$/);if(r){const a=I.find(i=>i.id===decodeURIComponent(r[1]))||(l?.id===decodeURIComponent(r[1])?l:null);if(!be(a)||a.locked&&r[2]!=="copy")throw new Error("此画布不可修改")}}return J.request(e,t)}function Fn(){Ye.cancelTimers(),wo(),l=null,ie=null,U.clear(),Dt=null,Go(),rn(),Xn(),Yr(),Cn(),$n(),Pn(),m.groups.replaceChildren(),m.selbar.style.display="none",ys(),_&&Cr()}function cn(){if(d.body.classList.toggle("project-readonly",!!l&&!be()),be()||(Ye.cancelContentSave(),Cn(),Pn()),m.dock.style.display=be()?"":"none",l){m.ptitle.textContent=l.name;const e=d.createElement("span");e.className="ro",e.textContent=be()?l.locked?"试玩画布 · 刷新还原":"":"只读",m.ptitle.append(e)}}G.addEventListener("h3auth:expired",()=>{Wn=null,lt.reset(),I=[],Fn(),ho()});let yn=!1;G.addEventListener("h3auth:denied",async({detail:e})=>{if(!(yn||!k.active||!/^\/api\/(projects|job|upload|generate|text|rewrite|media|thumbnail)/.test(e.path))){yn=!0,l&&e.path!=="/api/thumbnail"&&(l.permission="read",cn());try{await wr(),await pt()}finally{yn=!1}}});const Vt=(e,t)=>kt(e,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t||{})}),dt=(e,t)=>kt(e,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}),Ie=e=>N.error(e);let hr=null;function ne(e){m.toast.textContent=e,m.toast.style.display="block",re(hr),hr=ee(()=>m.toast.style.display="none",Math.min(2600+Math.max(0,String(e).length-20)*70,9e3))}const Bt=()=>Math.random().toString(36).slice(2,10),un=e=>A.find(t=>t.id===e)||A[0],Ct=["image","audio","video"],Ve={image:"图片",video:"视频",audio:"音频"},Nn=(e,t)=>e.id===t||!!(e.ladder&&Object.values(e.ladder).includes(t))||!!(e.route&&Object.values(e.route).some(n=>n.cap===t))||!!(e.modelSwitch&&Object.values(e.modelSwitch).includes(t)),jt=(e,t)=>e?t&&e.modelSwitch&&e.modelSwitch[t]?e.modelSwitch[t]:e.route?e.route[Object.keys(e.route)[0]].cap:e.id:null,Et=e=>{const t=A.find(n=>n.id===e.type);return t&&t.modes.some(n=>Nn(n,e.cap))?t:A.find(n=>n.modes.some(o=>Nn(o,e.cap)))||un(e.type)},ct=e=>{const t=Et(e);return t&&t.modes.find(n=>Nn(n,e.cap))},an=e=>Object.entries((ct(e)||{}).modelSwitch||{}).find(([,t])=>t===e.cap)?.[0],Kn={zimage:"Z-Image",krea2:"Krea2",qwen2511:"Qwen Image Edit 2511",qwen2512:"Qwen Image 2512（双阶段）",qwen21:"Qwen Image 2.1",da3:"Depth Anything 3",depthcrafter:"DepthCrafter"},Tt=J.localBridge.baseURL;let fn=[],mn=null,lo=!1,Gn="",Or=!1,Mn=!1;const Qe=e=>xe(e)?.execution==="if_studio";async function sn(e,t={}){return J.localBridge.request(e,t)}function zn(e){switch(e.quota_status){case"limited":return`剩余 ${e.remaining} 次免费`;case"exhausted":return"剩余 0 次 · 免费次数已用完";case"unavailable":return"剩余 0 次 · 未开通";case"free":return"免费使用";case"paid":return"已开通 · 按预算使用";default:return e.quota_status?"次数未知":"次数未知 · 请更新桥接器"}}function Ln(e=!0){return mn||(lo=!0,mn=(async()=>{const t=await sn("/status");if(!t.ready)throw new Error("请先在本机登录 IF CLI");return Or=t.reference_reuse===!0,Mn=t.request_recovery===!0,fn=(await sn("/models")).models,Gn="",fn})().catch(t=>{throw Gn=t.message,t}).finally(()=>{mn=null,e&&m.panel._id&&Se(m.panel._id)}),mn)}function Ar(e,t){const n="chouka:if-references:v1:"+JSON.stringify([k.user?.id,t,e.id]);if(e._ifReferences?.key===n)return e._ifReferences;let o;try{o=JSON.parse(sessionStorage.getItem(n))}catch{}const r={key:n,entries:Array.isArray(o?.entries)?o.entries.slice(0,40):[],pending:Array.isArray(o?.pending)?o.pending.slice(0,40):[],job:o?.job||null};return e._ifReferences=r,r}function Ht(e){try{sessionStorage.setItem(e.key,JSON.stringify({entries:e.entries,pending:e.pending,job:e.job}))}catch{}}function Zn(e){try{const n=new Ee(e?.canvas_url);if(n.origin==="https://ifs.alibaba-inc.com"&&!n.username&&!n.password&&n.pathname==="/"&&/^#\/canvas\/c_[A-Za-z0-9_-]+$/.test(n.hash))return n.href}catch{}const t=e?.canvas_id;return typeof t=="string"&&/^c_[A-Za-z0-9_-]+$/.test(t)?`https://ifs.alibaba-inc.com/#/canvas/${t}`:""}function gr(e){if(!Qe(e)||e.status!=="error")return null;const t=Zn({canvas_url:e.if_canvas_url});if(!t)return null;const n=d.createElement("a");n.className="if-canvas-link",n.textContent="打开 IF 画布",n.href=t,n.target="_blank",n.rel="noopener noreferrer",n.title="在新标签页查看 IF 生成失败原因";for(const o of["pointerdown","mousedown","click","dblclick"])n.addEventListener(o,r=>r.stopPropagation());return n}function br(e){if(!Qe(e)||e.status!=="error"||!(e.job||e.if_request_id)||!be())return null;const t=d.createElement("button");t.type="button",t.className="if-recover-button",t.textContent=e._ifRestoring?"正在查询原产物…":"查询原产物",t.disabled=!!e._ifRestoring,t.title="由发起人在原电脑查询原任务，不会重新提交生成";for(const n of["pointerdown","mousedown","dblclick"])t.addEventListener(n,o=>o.stopPropagation());return t.onclick=n=>{n.stopPropagation(),xr(e)},t}async function xr(e){const t=l;if(!t||!t.cards.includes(e)||!be()||!Qe(e)||e.status!=="error"||!(e.job||e.if_request_id)||e._ifRestoring||e._ifPolling||!confirm(`请由任务发起人在原电脑操作。
只查询本机桥接器中的原任务并取回产物，不会重新生成。
若桥接器已重启，原记录可能无法恢复。继续查询？`))return;const n={cap:e.cap,job:e.job,request:e.if_request_id,started:e.if_started},o=()=>l===t&&t.cards.includes(e)&&be()&&e.status==="error"&&e.cap===n.cap&&e.job===n.job&&e.if_request_id===n.request&&e.if_started===n.started;e._ifRestoring=!0,m.panel._id===e.id&&Se(e.id);try{const r=n.job||(await sn(`/requests/${encodeURIComponent(n.request)}`)).id;if(!o())return;if(!r)throw new Error("本机桥接器未返回原任务编号");const a=await sn(`/runs/${encodeURIComponent(r)}`);if(!o())return;if(a.state==="error")throw new Error("原任务在 IF 中仍为失败："+(a.error||"请打开 IF 画布查看原因"));if(!["starting","running","done"].includes(a.state))throw new Error("原任务状态无法识别，请在 IF 查看");const i={...e,job:r,status:"running",error:null,progress:null,if_started:Number.isFinite(e.if_started)?e.if_started:Date.now(),step:"正在查询原任务并恢复产物"};if(!Rt(i,t.id,"running"))throw new Error("无法保存恢复记录，请检查浏览器存储权限");Object.assign(e,{job:i.job,status:i.status,error:null,progress:null,if_started:i.if_started,step:i.step}),ot(e),m.panel._id===e.id&&Se(e.id),await hn(e,t.id),await ao(e,t.id,a)}catch(r){Ie(r.status===404?"本机未找到原任务，请由发起人在原电脑查询；若桥接器已重启，请到 IF 下载原产物。未重新提交生成。":"查询原产物未完成："+r.message+"；未重新提交生成。")}finally{e._ifRestoring=!1,l===t&&t.cards.includes(e)&&m.panel._id===e.id&&Se(e.id)}}function Dn(e,t){return"chouka:if-task:v1:"+JSON.stringify([k.user?.id,t,e.id])}function wn(e,t){let n;try{n=JSON.parse(sessionStorage.getItem(Dn(e,t)))}catch{}return!!(n&&n.cap===e.cap&&Number.isFinite(e.if_started)&&n.if_started===e.if_started&&(e.if_request_id?n.if_request_id===e.if_request_id:e.job&&n.job===e.job)&&(!e.job||!n.job||e.job===n.job))}function Rt(e,t,n){const o={phase:n,cap:e.cap,job:e.job,status:e.status,step:e.step,error:e.error,if_started:e.if_started,if_job_cap:e.if_job_cap,if_canvas_url:e.if_canvas_url,ms:e.ms,outputs:e.outputs||[],if_request_id:e.if_request_id,if_submitted_at:e.if_submitted_at,if_pending_prompts:e.if_pending_prompts,inputs:n==="preparing"?{params:e.params,assets:e.assets}:null,entry:e.job?e.history?.find(r=>r.job===e.job):null};try{return sessionStorage.setItem(Dn(e,t),JSON.stringify(o)),!0}catch{return!1}}function Qn(e,t){if(!Qe(e))return!1;const n=Dn(e,t);let o;try{o=JSON.parse(sessionStorage.getItem(n))}catch{}if(!o||o.cap!==e.cap||!Number.isFinite(o.if_started)||!["preparing","submitting","running","done","error"].includes(o.phase))return!1;const r=o.phase==="submitting"&&o.if_request_id&&o.if_request_id===e.if_request_id&&!o.job&&!e.job&&e.status==="error",a=o.phase==="done"&&o.status==="done"&&o.job&&o.job===e.job&&e.status==="error"&&o.outputs?.length;if((e.if_started||0)>o.if_started||e.if_started===o.if_started&&(e.job&&e.job!==o.job||e.if_request_id&&o.if_request_id&&e.if_request_id!==o.if_request_id||!r&&!a&&e.job===o.job&&["done","error"].includes(e.status))){try{sessionStorage.removeItem(n)}catch{}return!1}for(const i of["job","status","step","error","if_started","if_job_cap","if_canvas_url","ms","outputs","if_request_id","if_submitted_at","if_pending_prompts"])e[i]=o[i];if(e.progress=null,o.entry&&o.entry.job===e.job){e.history||=[];const i=e.history.findIndex(s=>s.job===e.job);i<0?e.history.unshift(o.entry):e.history[i]=o.entry}return o.phase==="preparing"&&o.if_request_id&&o.inputs?(e.params=o.inputs.params,e.assets=o.inputs.assets,e.status="queued",e.error=null,e.step="正在恢复 IF 素材准备",e._ifResumePreparing=!0):o.phase==="submitting"&&o.if_request_id?(e.status="running",e.error=null,e.step="正在向本机 IF 确认原请求"):(o.phase==="preparing"||o.phase==="submitting")&&(e.status="error",e.step="",e.error=o.phase==="preparing"?"上次素材准备因页面离开而中断，尚未提交 IF；请确认后重试":"上次 IF 提交结果尚未确认，请先在 IF 查看是否已创建任务，避免重复生成",Rt(e,t,"error")),!0}async function hn(e,t){const n=e.if_started,o=e.job,r=e.status,a=Dn(e,t),i=await ur(t);if(i.ok&&["done","error"].includes(r))try{const s=JSON.parse(sessionStorage.getItem(a));s?.if_started===n&&s.job===o&&s.phase===r&&sessionStorage.removeItem(a)}catch{}return i}function Fr(e){try{const t=new Ee(e);return t.protocol==="https:"&&t.hostname==="ant.alicdn.com"&&!t.port&&!t.username&&!t.password&&t.pathname.startsWith("/bio/img/")}catch{return!1}}function Kt(e,t,n){const o=Ar(e,n);if(o.job===e.job){for(const r of t?.reference_urls||[]){const a=o.pending[r.index];!Number.isInteger(r.index)||!a||a.kind!==r.kind||!Fr(r.url)||(o.entries=o.entries.filter(i=>i.source!==a.source),o.entries.push({...a,url:r.url}))}for(const r of t?.invalid_reference_indices||[]){const a=o.pending[r];a&&(o.entries=o.entries.filter(i=>i.source!==a.source||i.version!==a.version))}Ht(o)}}async function po(e,t){const n=await we(`/api/if-reference?${new URLSearchParams({url:e.pathname+e.search,type:t})}`,{method:"HEAD",credentials:"same-origin",cache:"no-store"});if(!n.ok)throw new Error(`无法检查引用素材（${n.status}），请确认素材仍存在且有访问权限`);const o=n.headers.get("ETag");if(!o||!/^"[a-f0-9]{64}"$/.test(o))throw new Error("抽卡服务尚不支持引用复用，请更新服务后重试");return o}const he=e=>{const t=xe(e),n=ct(e);return ft(e)?e.name||"素材节点":e.name||(n&&(n.ladder||n.route)?n.name:t?t.name:n?n.name:e.cap)},gt=e=>!!e&&(Et(e)||{}).kind==="style",er="@style",qn="@text",et=e=>String(e.slot||"").startsWith("@"),Ut=e=>!!e&&(Et(e)||{}).kind==="text",ut=e=>gt(e)||Ut(e),ft=e=>!!e&&(Et(e)||{}).kind==="asset",gn=e=>ft(e)&&(e.outputs||[])[0]||null,tn=e=>e?gt(e)?String((e.params||{}).style||"").trim():String((e.params||{}).text||"").trim():"",v=e=>((e||{}).params||{}).op||"",T=e=>(l?l.edges:[]).filter(t=>t.to===e.id&&t.slot===qn).map(t=>at(t.from)).filter(t=>t&&ut(t)).map(t=>({id:t.id,name:he(t),text:tn(t)})),z=e=>(e&&e.inputs||[]).filter(t=>t.type==="textarea"&&t.key!=="negative_prompt"&&!t.template&&!t.advanced),se=e=>(l?l.edges:[]).filter(t=>t.to===e.id&&t.slot===er).map(t=>l.cards.find(n=>n.id===t.from)).filter(t=>t&&ut(t)&&tn(t));function pe(e,t=new Set){if(!e||t.has(e.id))return[];t.add(e.id);const n=[],o=new Set;for(const r of(l?l.edges:[]).filter(a=>a.to===e.id&&!et(a))){const a=l.cards.find(i=>i.id===r.from);if(!(!a||ut(a)))for(const i of fe(a,t))o.has(i.id)||(o.add(i.id),n.push(i))}return n}function fe(e,t=new Set){if(!e)return[];const n=se(e);return n.length?n:pe(e,t)}function Oe(e){return(l?l.cards:[]).filter(t=>!ut(t)&&!se(t).some(n=>n.id===e.id)&&fe(t).some(n=>n.id===e.id))}const it=e=>fe(e).map(tn),Ot=()=>(l?l.cards:[]).filter(ut).forEach(e=>ot(e)),nn="{提示词}",Dr=(e,t)=>{const n=e.opt&&e.opt[t];return n&&String(n).trim()?String(n):null},qr=(e,t)=>e.optUse&&e.optUse[t]?Dr(e,t):null,Br=/^(?:For the target video, at [\d.]+ seconds|How the reference pictures align)[^\n]*\n/;function co(e,t){let n=String(e??"");for(const o of t){if(o.includes(nn)){n=o.split(nn).join(n);continue}if(!n.trim()){n=o;continue}const r=n.match(Br);n=r?n.slice(0,r[0].length)+`
`+o+`

`+n.slice(r[0].length).replace(/^\s+/,""):o+`

`+n}return n}const yr=e=>Object.keys(e.assets||{}).filter(t=>t.startsWith("images[")&&e.assets[t]).length;function Wt(e){const t=ct(e);if(!t||!t.ladder)return e.cap;const n=Object.keys(t.ladder).map(Number).sort((r,a)=>r-a),o=Math.max(yr(e),n[0]);return t.ladder[String(n.filter(r=>r<=o).pop())]||e.cap}function Bo(e,t){const n=H[e];return n?.type===t?n:{type:t,api:{image:null,video:null,audio:null},bridge:{image:t==="video"?6:3,video:t==="video"?1:0,audio:0},reference_fallback:!0,note:"该模型引用规格尚未核实，使用画布兜底数量。"}}const xe=e=>{const t=F[e.cap];if(!t||t.execution!=="if_studio")return t||null;const n=fn.filter(s=>s.type===t.outputType),o=e.params?.if_model||n[0]?.display_name,r=Bo(o,t.outputType),a=r.bridge,i=t.inputs.filter(s=>s.key!=="if_reference"||a?.image||a?.video).map(s=>s.key==="if_reference"?{...s,label:`参考${a?.image?"图片":""}${a?.image&&a?.video?"／":""}${a?.video?"视频":""} HTTPS 地址（可选）`}:s.key==="duration"?{...s,min:r?.duration?.min??1,max:r?.duration?.max??null,type:r?.duration?.max!=null?"slider":"number",step:1,default:r?.duration?.default??s.default,showHint:!0,hint:r?.duration?.max!=null?`当前模型时长：${r.duration.min}–${r.duration.max} 秒（整数）。`:"当前模型时长范围未核实；请输入正整数秒，不套用其他模型上限。"}:s);for(let s=0;s<(a?.image||0);s++)i.push({key:`images[${s}]`,label:"参考图片",type:"image"});for(let s=0;s<(a?.video||0);s++)i.push({key:`video[${s}]`,label:"参考视频",type:"video"});for(const[s,c]of Object.entries(e.assets||{}))c&&(/^images\[\d+\]$/.test(s)&&c.kind==="image"||/^video\[\d+\]$/.test(s)&&c.kind==="video")&&!i.some(u=>u.key===s)&&i.push({key:s,label:c.kind==="image"?"已保留的参考图片":"已保留的参考视频",type:c.kind});return{...t,inputs:i,slotLimits:{image:{max:a?.image||0},video:{max:a?.video||0},audio:{max:0}}}};function Ho(e){const t=xe(e)?.inputs.find(o=>o.key==="duration");if(!t)return;const n=Number(e.params.duration??t.default);e.params.duration=Math.min(t.max??1/0,Math.max(t.min,Number.isFinite(n)?Math.round(n):t.default))}function Uo(e,t){const n=ct(e),o=n&&n.route&&n.route[t];return o&&o.cap!==e.cap?o:null}function Qi(e,t,n){const o=n&&n.kind?Uo(e,n.kind):null;o&&(Un(l.edges.filter(i=>i.to===e.id)),e.cap=o.cap,e.assets={},t={key:o.slot},Gt(e),tt(),Ot());const r=Et(e);let a=!1;return r&&r.id==="card_image"&&n&&n.kind==="image"&&(e.cap==="zimage_t2i"?(tr(e,"zimage_i2i"),e._model||(e._model="zimage"),a=!0):e.cap==="krea2_t2i"&&(tr(e,"krea2_i2i"),e._model||(e._model="krea2"),a=!0),a&&(Gt(e),tt(),Ot(),ee(()=>Se(e.id),50))),!o&&ti(e.id,t.key)&&(tt(),Ot()),e.assets[t.key]=n,Bn(e),Mt(e),t}const{CLARITY_STEPS:Wo,RATIO_GRID:es,resolutionPresets:ts,resolutionPreset:ns,imageSettings:Jo,applyInputPresets:rs}=R,Oa=R.create({document:d,getCapability:e=>xe(e),getCapabilityById:e=>F[e],getRunCapability:e=>F[Wt(e)]||xe(e),getProject:()=>l,isIF:e=>Qe(e),normalizeIFDuration:e=>Ho(e),api:(...e)=>kt(...e),save:()=>K(),onReferenceChange:e=>Aa(e),ratioWH:so,multiple:On}),{imageClarityPicker:os,referenceVideo:as,syncReferenceParameters:Xo,refreshVideoParameters:Bn,videoReferenceStatus:is}=Oa,{clarityPicker:ss,paramsBrief:Yo,switchImageCapability:tr}=Gl({document:d,save:()=>K(),claritySteps:Wo,ratioGrid:es,imageClarityPicker:os,imageSettings:Jo,resolutionPresets:ts,resolutionPreset:ns,switchImageCapability:(e,t)=>Oa.switchImageCapability(e,t)});function Aa(e){if(!l?.cards.includes(e)||m.panel._id!==e.id)return;const t=Qe(e)?xe(e):F[Wt(e)]||xe(e),n=m.panel.querySelector('button[title^="点开弹窗"]');n&&(n.textContent=`⚙ ${Yo(e,t)||"参数"}`),m.respop._card===e&&m.respop.style.display!=="none"&&(m.respop._cap!==t.id?Pn():m.respop._refill())}const ls=e=>(e&&e.inputs||[]).filter(t=>!Fo.has(t.key)&&!Ct.includes(t.type)&&t.type!=="textarea"&&(t.type==="seed"||!t.advanced)&&!t.mirror&&!t.rangeOf);function ds(e,t){const n=Qe(e)?xe(e):F[Wt(e)]||xe(e),o=n&&(n.imageControls||n.inputs.some(u=>Fo.has(u.key))),r=n?.imageControls?["steps","seed"].map(u=>n.inputs.find(f=>f.key===u&&!f.mirror)).filter(Boolean).map(u=>({...u,label:u.key==="steps"?"采样步数":"种子"})):ls(n);if(!o&&!r.length)return ne("这个模式没有可调参数");const a=()=>{if(m.panel._id!==e.id)return;const u=m.panel.querySelectorAll(".foot .tcap"),f=u[u.length-1];if(!f||!f.textContent.startsWith("⚙"))return;const p=Yo(e,n);f.textContent=p?`⚙ ${p}`:"⚙ 参数"};let i=!1;const s=()=>{const u=m.respop.contains(d.activeElement)?d.activeElement.id:null;m.respop.innerHTML="";const f=is(e,n);if(f&&m.respop.appendChild(f),o&&m.respop.appendChild(ss(e,n,s)),r.length){const g=d.createElement("div");g.className=n.imageControls?"pwrap image-basic":"pwrap",o&&(g.style.marginTop="12px");for(const h of r){const x=To(e,h);Kl(x,a),g.appendChild(x)}m.respop.appendChild(g)}if(n.imageControls){const g=n.inputs.filter(h=>!Ct.includes(h.type)&&h.type!=="textarea"&&h.type!=="seed"&&h.key!=="steps"&&!Fo.has(h.key)&&!h.mirror&&!h.rangeOf&&!(n.imageControls.mode==="t2i"&&h.key==="encode_resolution")&&!(Qe(e)&&h.key==="if_reference"));if(g.length){const h=d.createElement("details");h.className="image-advanced",h.open=i;const x=d.createElement("summary");x.textContent="模型专属参数",h.appendChild(x),h.addEventListener("toggle",()=>{!h.isConnected||h.open===i||(i=h.open,c())});for(const w of g)h.appendChild(To(e,w));m.respop.appendChild(h)}}const p=d.createElement("button");p.className="x",p.textContent="✕",p.title="关闭 (Esc)",p.onclick=Pn,m.respop.appendChild(p),a(),u&&d.getElementById(u)?.focus({preventScroll:!0})};m.respop._card=e,m.respop._cap=n.id,m.respop._refill=()=>{s();const u=m.respop.getBoundingClientRect();(u.top<8||u.bottom>innerHeight-8)&&c()},s(),m.respop.style.display="",Bn(e);function c(){if(m.respop.style.display==="none"||!t.isConnected)return;const u=t.getBoundingClientRect(),f=u.top-64,p=innerHeight-u.bottom-16;m.respop.style.maxHeight=Math.max(160,Math.max(f,p))+"px";const g=m.respop.offsetWidth,h=m.respop.offsetHeight,x=Math.max(8,Math.min(u.left+u.width/2-g/2,innerWidth-g-8));let w=u.top-h-8;w<56&&(w=Math.max(8,Math.min(u.bottom+8,innerHeight-h-8))),m.respop.style.left=x+"px",m.respop.style.top=w+"px"}c()}const Pn=()=>{m.respop.style.display="none",m.respop._card=null,m.respop._refill=null},ps={image:"图片 (png)",video:"视频 (mp4，含音轨)",audio:"音频"},cs={4:"四宫格",6:"六宫格",9:"九宫格",12:"十二宫格",16:"十六宫格"};function Fa(e){const t=e&&e.grid;if(!t)return"";const n=t[0]*t[1];return cs[n]||`${n}格`}function ln(e,t=null){const n=Fa(e);if(Ct.includes(e.type)){const r=t&&xe(t),i=(r?r.inputs.filter(f=>f.type===e.type&&(t.assets||{})[f.key]):[]).findIndex(f=>f.key===e.key),s=+(String(e.key).match(/\[(\d+)\]/)||[0,0])[1],c=i>=0?i+1:s+1,u=`${Ve[e.type]||e.type}${c}`;return n?`${u}（${n}）`:u}const o=String(e.label||"").trim();return n?`${o}（${n}）`:o}function us(e){const t=p=>e.inputs.filter(g=>g.type===p),n=[...new Set(e.inputs.filter(p=>Ct.includes(p.type)).map(p=>p.type))],o=t("textarea"),r=e.inputs.find(p=>p.key==="duration"),a=e.inputs.filter(p=>p.key==="width"||p.key==="height"),i=e.inputs.find(p=>p.key==="aspect_ratio"),s=e.inputs.find(p=>p.key==="megapixels"),c=e.inputs.find(p=>p.key==="scale_to_length"),u=[],f=[];for(const p of n){const g=t(p),h=g.filter(y=>y.required),x=g.filter(y=>!y.required),w=Ve[p]||p;h.length&&u.push(`${w} ×${h.length}：${h.map(y=>ln(y)).join(" / ")}`),x.length&&f.push(`可引用${w}（上限 ${Jn(e,p)}）`)}return n.length||u.push("不需要素材，纯提示词驱动"),o.length&&u.push(o.length>1?`提示词 ×${o.length}`:"提示词"),r&&f.push(r.max==null?"时长范围未核实（正整数秒）":`时长 ${r.min}–${r.max} 秒`),e.imageControls?(f.push(`清晰度 ${Wo.map(p=>p.label).join(" / ")}（短边）`),f.push(e.imageControls.mode==="i2i"?"默认原图比例，也可另选画面比例":"画面比例（13 档）")):(a.length&&f.push("画面宽高"),i&&f.push(`画面比例（${i.options.length} 档，默认 ${i.default}）`),s&&f.push(`分辨率 ${pr[0]}p–${pr[pr.length-1]}p（短边，768p 为 H3 原生）`),c&&f.push(`分辨率长边 ${c.min}–${c.max}，画面比例跟随原图`)),e.inputs.some(p=>p.type==="seed")&&f.push("种子"),{need:u,opt:f,out:ps[e.outputType]||e.outputType,file:e.file||e.id}}function fs(e,t){const n=us(e),o=d.createElement("div"),r=d.createElement("b");if(r.textContent=t||e.name,o.appendChild(r),e.note){const s=d.createElement("div");s.className="note",s.textContent=e.note,o.appendChild(s)}const a=(s,c)=>{const u=d.createElement("div");u.className="io";const f=d.createElement("i");f.textContent=s;const p=d.createElement("span");p.textContent=c,u.append(f,p),o.appendChild(u)};a("输入",n.need.join("　·　")),n.opt.length&&a("可调",n.opt.join("　·　")),a("产出",n.out);const i=d.createElement("div");return i.className="fn",i.textContent=n.file,o.appendChild(i),o}function uo(e,t,n){const o=d.createElement("div"),r=d.createElement("b");r.textContent=e;const a=d.createElement("div");a.className="note",a.textContent=t,o.append(r,a);for(const[i,s]of n){const c=d.createElement("div");c.className="io";const u=d.createElement("i");u.textContent=i;const f=d.createElement("span");f.textContent=s,c.append(u,f),o.appendChild(c)}return o}function fo(e,t,n){if(!t)return null;const o=Nn(t,e.cap),r=o?t.ladder?Wt(e):e.cap:jt(t),a=F[r]||F[jt(t)];if(!a)return uo(n||t.name,"这个模式当前不可用。",[]);const i=fs(a,n||t.name);let s="";if(t.route?s=(t.entry&&t.entry.hint?t.entry.hint:"根据放入的素材类型自动选择工作流。")+(o?`当前会运行「${a.name}」。`:""):t.ladder&&(s="按图片数量自动选择："+Object.keys(t.ladder).map(Number).sort((c,u)=>c-u).map(c=>`${c} 张 → ${(F[t.ladder[c]]||{}).name||t.ladder[c]}`).join("；")+(o?`。当前 ${yr(e)} 张，会运行「${a.name}」。`:"。")),s){const c=d.createElement("div");c.className="note",c.textContent=s,i.insertBefore(c,i.children[1]||null)}return i}function ms(e){const t=Et(e);return gt(e)?uo(he(e),`这个节点保存一段可复用的风格描述，不会单独生成产物。连接到生成节点后会并入提示词，并沿产物连线向下游继承；下游节点自己挂风格时会从那里开始覆盖继承。使用 ${nn} 可以指定原提示词插入位置。这里只写画风、色调、光线和镜头质感，具体画面内容留在生成节点。`,[["输入","风格、色调、光线和镜头质感"],["产出","可复用的风格文字"]]):Ut(e)?uo(he(e),"这个节点保存和加工文字。可以连接到生成节点并入提示词，也可以连接到其他文本节点作为加工输入；加工结果会写回节点。",[["输入","节点文字或上游文本"],["产出","可继续连接的文字"]]):ft(e)?uo(he(e),"这个节点保存一份上传素材，不会单独运行。它可以同时连接到多个节点，让同一份图片、视频或音频重复使用；原文件不会被处理。",[["输入","图片、视频或音频"],["产出","可复用的原始素材"]]):fo(e,ct(e),he(e)||t&&t.name)}function hs(e,t){m.tip.innerHTML="",m.tip.appendChild(e),m.tip.style.display="",m.tip.style.left=m.tip.style.top="0px";const n=8,o=52,r=m.stage.getBoundingClientRect(),a=r.left+n,i=r.right-n,s=m.tip.offsetWidth,c=m.tip.offsetHeight;let f=(g=>Math.max(a,Math.min(g,i-s)))(t.left),p=t.bottom+n;p+c>innerHeight-n&&(t.top-n-c>=o?p=t.top-n-c:(p=Math.max(o,innerHeight-n-c),i-(t.right+n)>=s?f=t.right+n:t.left-n-a>=s&&(f=t.left-n-s))),m.tip.style.left=f+"px",m.tip.style.top=p+"px"}const Jt=()=>m.tip.style.display="none";function mo(e,t){let n=null;e.addEventListener("mouseenter",()=>{re(n),n=ee(()=>{const o=t();o&&e.matches(":hover")&&hs(o,e.getBoundingClientRect())},280)}),e.addEventListener("mouseleave",()=>{re(n),Jt()}),e.addEventListener("mousedown",()=>{re(n),Jt()})}function gs(){if(!k.user?.id)return null;try{const e=localStorage.getItem(`chouka:last-project:${k.user.id}`);return I.find(t=>t.id===e)||null}catch{return null}}function bs(e){if(!(_||!k.active||!k.user?.id))try{localStorage.setItem(`chouka:last-project:${k.user.id}`,e)}catch{}}const Da=(async function(){try{await k.requireUser(),k.mountAccount(d.getElementById("account"));const r=await kt("/api/cards",{cache:"no-store"});A=r.cards,F=r.capabilities,H=r.if_model_limits||{},m.dot.classList.toggle("on",!!r.comfy_online)}catch(r){if(Ie("后端未就绪："+r.message),!k.active)return}if(b.disposed||(await wr(),b.disposed))return;As();const t=new URLSearchParams(location.search),n=t.get("project"),o=t.get("card");if(n)await vr(n),_?Cr():o&&l?.id===n&&await Oi({project:n,card:o});else if(_)Cr();else{const r=gs();if(r&&await vr(r.id),!l){const a=I.find(i=>i.locked);a&&await vr(a.id)}}await qa(),k.every(qa,5e3),k.every(wr,5e3),pt(),k.every(pt,700)})();async function qa(){try{const e=await kt("/api/health");m.dot.classList.toggle("on",!!e.comfy_online),e.mode==="controller"&&k.user?.role==="admin"?(m.dot.href=J.adminURL("/controller"),m.dot.title="打开运行面板",m.dot.setAttribute("aria-label","打开运行面板")):(m.dot.removeAttribute("href"),m.dot.title="ComfyUI 连接状态",m.dot.setAttribute("aria-label","ComfyUI 连接状态"))}catch{m.dot.classList.remove("on")}}function Ba(e){return J.projectSpaces(e,k.user?.id,ue)}function ho(){L.update({projects:I,teams:ue,selectedSpace:Pe,selectedId:l?.id||null,user:k.user})}async function wr(){if(!(!k.active||b.disposed)){try{const e=await J.projects.list();if(b.disposed)return;I=e.projects,ue=e.teams}catch{return}if(l){const e=I.find(t=>t.id===l.id);if(!e)Fn(),lt.retainProjects(I.map(t=>t.id));else{const t=l.permission!==e.permission;Object.assign(l,{permission:e.permission,owner_id:e.owner_id,owner_display_name:e.owner_display_name,team_id:e.team_id,team_name:e.team_name,share_count:e.share_count,shared_team_ids:e.shared_team_ids,shared_personally:e.shared_personally,name:e.name,locked:e.locked}),t&&(rn(),Xn(),nr())}}cn(),ho()}}const xs=()=>L.create();let Vo=0;async function vr(e){if(l&&l.id!==e&&on()&&Ye.busy)try{await Yn(l.id)}catch(r){Ie("切换前保存失败，已保留当前画布："+r.message);return}Ye.cancelTimers(),wo();const t=++Vo;try{const r=await J.projects.get(e);if(t!==Vo||!k.active)return;l=r}catch(r){return Ie(r.message)}const n=Ba(l);n.includes(Pe)||(Pe=n[0]||"personal"),ho(),Dt=null,Ye.resetFailures(),qt=!1,l.cards=l.cards||[],l.edges=l.edges||[],l.groups=l.groups||[];const o=[];for(const r of l.cards){const a=ct(r);if(a&&!a.route&&a.id!==r.cap&&!(a.modelSwitch&&Object.values(a.modelSwitch).includes(r.cap))&&(r.cap=a.id),a&&a.modelSwitch){const i=Object.entries(a.modelSwitch).find(([,s])=>s===r.cap);i&&(r._model=i[0])}Qn(r,l.id)&&o.push(r),!Qe(r)&&!ut(r)&&!ft(r)&&r.status==="queued"&&!r.job&&!r._ifResumePreparing&&(r.status="error",r.error="上次提交未取得任务编号，请先检查任务列表，确认后再重试"),Mo(r)}for(const r of l.cards)Ut(r)&&(r.cap!=="text"&&(r.cap="text"),!String((r.params||{}).text||"").trim()&&String(r.out||"").trim()&&(r.params=r.params||{},r.params.text=r.out));if(Go(),j=Object.assign({x:60,y:70,k:1},l.view||{}),ie=null,U.clear(),rn(),m.empty.style.display="none",m.dock.style.display="",m.fit.style.display="",m.ptitle.textContent=l.name,d.getElementById("directorbtn").href=`/director?project=${encodeURIComponent(l.id)}`,l.locked){const r=d.createElement("span");r.className="ro",r.textContent="试玩画布 · 刷新还原",r.title="这张画布是示例：参数怎么改、节点怎么拖、重跑几遍都随便，改动只在这一次里有效，刷新就回到原样。想留下自己的东西就「＋ 新建项目」",m.ptitle.appendChild(r)}nr();for(const r of l.cards)Ii(r,l.id);if(o.length&&on()&&!l.locked)for(const r of o)hn(r,l.id);bs(l.id),Va(l.id),wr()}function ys(){ka(),m.empty.style.display="",m.world.innerHTML="",m.wires.innerHTML="",rr?.disconnect(),vo.clear(),m.wires.classList.remove("has-flow"),m.ptitle.textContent="",m.dock.style.display="none",m.fit.style.display="none",m.hint.textContent=""}const Ko=J.plainCard,Ha=["type","cap","name","x","y","w","h","params","assets","opt"];let Hn=[],go=[],kr=null,bo=null;function Go(){Hn=[],go=[],kr=null,bo=null}function Ua(){return{cards:l.cards.map(e=>JSON.parse(JSON.stringify(Ko(e)))),edges:JSON.parse(JSON.stringify(l.edges)),groups:JSON.parse(JSON.stringify(l.groups||[]))}}function Wa(e){return JSON.stringify({cards:e.cards.map(t=>{const n=Object.fromEntries(Ha.filter(o=>t[o]!==void 0).map(o=>[o,t[o]]));return n.id=t.id,t.type==="card_asset"&&(n.outputs=t.outputs),n}),edges:e.edges,groups:e.groups})}function Zo(e="action"){!l||!be()||_||kr||(kr=Ua(),bo=e)}function xo(){if(!kr||!l)return;const e=Ua(),t=kr,n=bo;if(kr=null,bo=null,Wa(t)===Wa(e))return;const o=Hn[Hn.length-1];n==="typing"&&o?.kind==="typing"&&Date.now()-o.at<1e3?o.after=e:(Hn.push({before:t,after:e,kind:n,at:Date.now()}),Hn.length>80&&Hn.shift()),go=[]}function ws(e){const t=new Map(l.cards.map(n=>[n.id,n]));l.cards=e.cards.map(n=>{const o=t.get(n.id);if(!o)return JSON.parse(JSON.stringify(n));const r=o;for(const a of Ha)a in n?r[a]=JSON.parse(JSON.stringify(n[a])):delete r[a];return n.type==="card_asset"&&(r.outputs=JSON.parse(JSON.stringify(n.outputs||[]))),r}),l.edges=JSON.parse(JSON.stringify(e.edges)),l.groups=JSON.parse(JSON.stringify(e.groups)),Xt=null,U=new Set([...U].filter(n=>l.cards.some(o=>o.id===n))),ie&&!l.cards.some(n=>n.id===ie)&&(ie=null,rn()),nr(),ie&&Se(ie),K()}function vs(e=!1){if(!l||!be()||_)return;xo();const t=e?go:Hn,n=e?Hn:go,o=t.pop();o&&(n.push(o),ws(e?o.after:o.before))}for(const e of["pointerdown","keydown","beforeinput","paste","drop","change"])d.addEventListener(e,t=>{t.target.closest?.("[data-image-composer]")||!l||_||!be()||t.type==="keydown"&&(t.ctrlKey||t.metaKey)&&/^(z|y)$/i.test(t.key)||Zo(t.type==="beforeinput"?"typing":"action")},!0);function Hr(){return!qt&&l?.id===V?l.cards.find(e=>e.id===ce):null}function Cr(){if(!_)return;const e=Hr();U.clear(),e?(ie=e.id,U.add(e.id),e._el?.classList.add("sel"),Se(e.id)):(ie=null,m.panel.replaceChildren(Lo("此节点已删除或不可访问；不会重新创建。请返回导演台刷新项目。")),m.panel._id=null,m.panel.style.display="",bt())}_&&(G.ChoukaNodeEditor={async flush(){if(await Da,!Hr())throw new Error("此节点已删除或不可访问");await Yn(V)},payload(){const e=Hr();if(!e)throw new Error("此节点已删除或不可访问");return Na(e)}});const Ja=["#00e5ff","#ff5da2","#9b7bff","#55e68a","#ffb84d","#58a6ff","#f778ba","#d2e75b"];function Xa(e){let t=0;for(const n of String(e||""))t=t*31+n.codePointAt(0)>>>0;return Ja[t%Ja.length]}function ks(){if(!m.presenceUsers)return;const e=new Map;for(const n of $t.values())e.has(n.user_id)||e.set(n.user_id,n);if(m.presenceUsers.replaceChildren(),m.presenceUsers.classList.toggle("on",e.size>0),!e.size)return;const t=d.createElement("span");t.className="presence-count",t.textContent=`${e.size} 人使用中`,m.presenceUsers.appendChild(t);for(const n of e.values()){const o=d.createElement("span");o.className="presence-avatar";const r=Xa(n.user_id);o.style.background=r,o.style.boxShadow=`0 0 0 1px ${r}`,o.textContent=String(n.name||"协").trim().slice(0,1).toUpperCase(),o.title=`${n.name||"协作者"} · 正在此画布`,m.presenceUsers.appendChild(o)}}function Cs(e){if(!m.presenceLayer||e.connection_id===Sn)return null;let t=e._el;if(t?.isConnected)return t;t=d.createElement("div"),t.className="collab-cursor";const n=Xa(e.user_id);t.style.color=n;const o=d.createElement("div");o.className="pointer";const r=d.createElement("div");r.className="label",r.style.backgroundColor=n;const a=d.createElement("span");return a.textContent=e.name||"协作者",r.appendChild(a),t.append(o,r),m.presenceLayer.appendChild(t),e._el=t,t}function Ya(e){if(e.connection_id===Sn){e._el?.remove(),e._el=null;return}const t=Cs(e);t&&(t.classList.toggle("hidden",!e.visible),e.visible&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&(t.style.transform=`translate(${e.x}px,${e.y}px) scale(${1/j.k})`))}function Qo(){for(const e of $t.values())Ya(e)}function _s(e,t,n){if(Number.isFinite(n)&&n<Qt)return;Number.isFinite(n)&&(Qt=n),Sn=t||Sn;const o=new Map;for(const r of e||[]){const a=$t.get(r.connection_id);o.set(r.connection_id,Object.assign(a||{},r))}for(const[r,a]of $t)o.has(r)||a._el?.remove();$t=o,ks(),Qo()}function Es(e,t){!l||l.id!==e||t<=(l.rev||0)||kt(`/api/projects/${encodeURIComponent(e)}`).then(n=>yo(n)).catch(()=>{})}function yo(e){if(!l||e.id!==l.id||(e.rev||0)<=(l.rev||0))return;if(_&&!(e.cards||[]).some(r=>r.id===ce)&&(qt=!0,Ye.cancelContentSave(),Cr()),Ye.busy||_t){(!Dt||(e.rev||0)>(Dt.rev||0))&&(Dt=e);return}const t=m.panel.style.display!=="none",n=[],o=new Map(l.cards.filter(r=>Qe(r)&&wn(r,l.id)&&["queued","running"].includes(r.status)&&Number.isFinite(r.if_started)).map(r=>[r.id,r]));l.name=e.name,l.cards=(e.cards||[]).map(r=>{const a=o.get(r.id),i=a&&r.if_started===a.if_started&&r.job===a.job;if(a&&r.cap===a.cap&&(r.if_started||0)<=a.if_started&&!(r.if_started===a.if_started&&r.job&&a.job&&r.job!==a.job)&&!(r.if_started===a.if_started&&r.if_request_id&&a.if_request_id&&r.if_request_id!==a.if_request_id)&&!(i&&["done","error"].includes(r.status))){const s=Object.fromEntries(["params","assets","job","status","step","error","progress","if_started","if_job_cap","if_canvas_url","if_request_id","if_submitted_at","if_pending_prompts","ms","outputs","history","_ifPolling","_ifRecovering","_ifResumePreparing"].map(c=>[c,a[c]]));return Object.assign(a,r,s)}return Qn(r,e.id)&&n.push(r),r}),l.edges=e.edges||[],l.groups=e.groups||[],l.rev=e.rev,l.updated=e.updated,l.director=e.director,Go();for(const r of l.cards)Mo(r);ie&&!l.cards.some(r=>r.id===ie)&&(ie=null),U=new Set([...U].filter(r=>l.cards.some(a=>a.id===r))),m.ptitle.textContent=l.name,nr();for(const r of l.cards)o.get(r.id)!==r&&Ii(r,l.id);if(n.length&&on()&&!l.locked)for(const r of n)hn(r,l.id);_||(t&&ie?Se(ie):ie||rn())}function ea(){if(!Dt||Ye.busy||_t)return;const e=Dt;Dt=null,yo(e)}function wo(){if(re(dn),dn=null,re(An),An=null,Ft=null,st=null,Sn=null,Qt=-1,St){const e=St;St=null;try{e.close(1e3,"leave canvas")}catch{}}for(const e of $t.values())e._el?.remove();$t.clear(),m.presenceLayer?.replaceChildren(),m.presenceUsers?.replaceChildren(),m.presenceUsers?.classList.remove("on")}function Va(e){wo(),st=e;const t=J.presence(e);St=t,t.onopen=()=>Es(e,1/0),t.onmessage=n=>{if(t!==St||st!==e)return;let o;try{o=J.parsePresence(n.data)}catch{return}if(o.type==="presence")_s(o.members,o.self,o.version);else if(o.type==="cursor"){const r=$t.get(o.connection_id);if(!r)return;Object.assign(r,o),Ya(r)}else o.type==="card-added"?pa(o.card,o.rev):o.type==="project-changed"?yo(o.project):o.type==="project-deleted"&&(ne("这张画布已被删除"),Fn(),wr())},t.onclose=()=>{t===St&&(St=null,st===e&&l?.id===e&&k.active&&(dn=ee(()=>Va(e),1500)))}}function Ka(e,t,n=!0){Ft={type:"cursor",x:e,y:t,visible:n},An===null&&(An=ee(()=>{An=null,St?.readyState===S.OPEN&&Ft&&St.send(J.serializeCursor(Ft)),Ft=null},50))}function In(){m.world.style.transform=`translate(${j.x}px,${j.y}px) scale(${j.k})`,m.wires.style.transform=m.world.style.transform,m.groups.style.transform=m.world.style.transform,m.presenceLayer&&(m.presenceLayer.style.transform=m.world.style.transform),typeof Qo=="function"&&Qo(),m.wires.setAttribute("width",1),m.wires.setAttribute("height",1),kn(),Ur(),Ss(),va()}function Ss(){m.zoomPercent&&(m.zoomPercent.textContent=Math.round(j.k*100)+"%")}function vn(e,t){const n=m.stage.getBoundingClientRect();return{x:(e-n.left-j.x)/j.k,y:(t-n.top-j.y)/j.k}}let _r=!1;function Ur(){if(!_r||!l||!l.cards.length)return;const e=m.minimapCanvas,t=e.getContext("2d"),n=200,o=150;e.width=n,e.height=o;let r=1/0,a=1/0,i=-1/0,s=-1/0;for(const M of l.cards){const Y=He(M),Ke=M._el?M._el.offsetHeight:200;r=Math.min(r,M.x),a=Math.min(a,M.y),i=Math.max(i,M.x+Y),s=Math.max(s,M.y+Ke)}const c=50;r-=c,a-=c,i+=c,s+=c;const u=i-r,f=s-a,p=Math.min(n/u,o/f);t.fillStyle="#070707",t.fillRect(0,0,n,o),t.fillStyle="#f3f4f6",t.strokeStyle="#f3f4f6",t.lineWidth=1;for(const M of l.cards){const Y=(M.x-r)*p,Ke=(M.y-a)*p,mt=He(M)*p,Ge=(M._el?M._el.offsetHeight:200)*p;t.fillRect(Y,Ke,mt,Ge),t.strokeRect(Y,Ke,mt,Ge)}const g=m.stage.getBoundingClientRect(),h=(-j.x/j.k-r)*p,x=(-j.y/j.k-a)*p,w=g.width/j.k*p,y=g.height/j.k*p;m.minimapViewport.style.left=h+"px",m.minimapViewport.style.top=x+"px",m.minimapViewport.style.width=w+"px",m.minimapViewport.style.height=y+"px",m.minimap._scale=p,m.minimap._minX=r,m.minimap._minY=a}function $s(){_r=!_r,m.minimap.style.display=_r?"":"none",m.minimapBtn.classList.toggle("active",_r),_r&&Ur()}function js(){let e=!1;const t=(n,o)=>{if(!e)return;const r=m.minimap.getBoundingClientRect(),a=n-r.left,i=o-r.top,s=m.minimap._scale||1,c=m.minimap._minX||0,u=m.minimap._minY||0,f=a/s+c,p=i/s+u,g=m.stage.getBoundingClientRect();j.x=-f*j.k+g.width/2,j.y=-p*j.k+g.height/2,In(),bt(),en()};m.minimapViewport.addEventListener("mousedown",n=>{n.preventDefault(),e=!0}),m.minimap.addEventListener("mousedown",n=>{n.target!==m.minimapViewport&&(n.preventDefault(),e=!0,t(n.clientX,n.clientY))}),P("mousemove",n=>{e&&t(n.clientX,n.clientY)}),P("mouseup",()=>{e=!1})}function nr(){ka(),m.world.innerHTML="";const e=d.createDocumentFragment();for(const t of l.cards)e.appendChild(ta(t));m.world.appendChild(e),In(),tt(),$r(),m.hint.textContent=`${l.cards.length} 个节点`,Ur(),_&&Cr()}const Ga=e=>(F[Wt(e)]||xe(e)||Et(e)||{}).outputType||"image",Za=e=>{const t=ct(e);return!!(t&&t.route)&&!Object.values(e.assets||{}).some(Boolean)};function Er(e){return gt(e)?'<span class="ph">🎨</span>':Ut(e)?'<span class="ph">✍</span>':ft(e)?'<span class="ph">📎</span>':`<span class="ph">${Za(e)?"🖼🎬":Ga(e)==="video"?"🎬":"🖼"}</span>`}const Ns="button,input,textarea,select,audio,.vprog,.cmp,.rz,.port,.inport";function ta(e){const t=Et(e),n=d.createElement("div");n.className="card"+(ie===e.id?" sel":""),n.dataset.id=e.id,n.style.left=e.x+"px",n.style.top=e.y+"px",n.innerHTML=`
    <div class="ch"><span>${t?t.icon:"▪"}</span><span class="t"></span><button class="x" type="button" title="删除" aria-label="删除节点">✕</button></div>
    <div class="body">${Er(e)}</div>
    <div class="bar"><i></i></div>
    <div class="cf"><span class="kt"></span><span class="st"></span><span class="meta" style="margin-left:auto"></span></div>
    <div class="rz tl" title="拖动改大小（按住 Shift 只改宽）"></div>
    <div class="rz br" title="拖动改大小（按住 Shift 只改宽）"></div>
    <div class="inport"></div>
    <div class="port" title="${ft(e)?"拖到别的节点上 → 这份素材就进它的格子":"拖到空白处 → 用本节点产物新建下游节点"}"></div>`,e._el=n,Tn(e),Gt(e);const o=n.querySelector(".ch .x");return o.onmousedown=r=>r.stopPropagation(),o.onclick=r=>{r.stopPropagation(),bi(e)},n.querySelector(".rz.tl").onmousedown=r=>di(r,e,n,-1),n.querySelector(".rz.br").onmousedown=r=>di(r,e,n,1),n.querySelector(".port").onmousedown=r=>Os(r,e),n.onmousedown=r=>{if(!(r.button===1||r.button===0&&r.shiftKey)){if(r.button===0&&!r.target.closest(Ns))return Rs(r,e);r.stopPropagation(),!(r.button===2&&U.has(e.id)&&l.cards.filter(a=>U.has(a.id)).length>1)&&At(e.id)}},n.oncontextmenu=r=>{r.stopPropagation(),r.preventDefault(),Jt(),!(U.has(e.id)&&ai(r.clientX,r.clientY))&&(At(e.id),Hs(r.clientX,r.clientY,e))},n.ondblclick=r=>{const a=r.target.closest(".body");if(!(!a||ut(e))&&!(ft(e)&&!gn(e))&&!r.target.closest(".vprog")){if(r.target.matches("audio")){const i=r.target.getBoundingClientRect();if(r.clientY>i.bottom-34*j.k)return}for(const i of a.querySelectorAll("video"))ir(i),i.pause();Vr(e,+(r.target.dataset.i||0))}},Ms(n.querySelector(".body")),Ls(n.querySelector(".body"),e),mo(n,()=>ms(e)),n.onclick=r=>{!ft(e)||gn(e)||r.target.closest(".body")&&Io(e)},ot(e),n}let Sr=null;d.addEventListener("play",e=>{if(!(e.target.paused||!e.target.isConnected)){for(const t of d.querySelectorAll("video, audio"))t!==e.target&&(ir(t),t.pause());Sr=e.target}},!0),d.addEventListener("pause",e=>{Sr===e.target&&(Sr=null)},!0),d.addEventListener("mousedown",e=>{for(const n of d.querySelectorAll("video"))n._playRequest&&!n.closest(".body, .vbox")?.contains(e.target)&&ir(n);if(!Sr)return;const t=Sr.closest(".body, .vbox, .arange");(!t||!t.contains(e.target))&&Sr.pause()},!0);function Ms(e){const t=(n,o,r)=>{if(!isFinite(n.duration)||!n.duration)return;const a=r.getBoundingClientRect();n.currentTime=Math.min(Math.max((o-a.left)/a.width,0),1)*n.duration};e.onmousedown=n=>{if(n.button!==0)return;const o=n.target.closest(".vprog");if(o){const c=e.querySelector("video");if(!c)return;n.stopPropagation(),n.preventDefault();const u=!c.paused;c.pause(),t(c,n.clientX,o);const f=g=>t(c,g.clientX,o),p=()=>{d.removeEventListener("mousemove",f),d.removeEventListener("mouseup",p),u&&c.play().catch(()=>{})};d.addEventListener("mousemove",f),d.addEventListener("mouseup",p);return}const r=n.target.closest("video");if(!r)return;const a=n.clientX,i=n.clientY,s=c=>{d.removeEventListener("mouseup",s),!(Math.abs(c.clientX-a)+Math.abs(c.clientY-i)>=4)&&(r._previewController?ir(r):r.paused?nl(r):(ir(r),r.pause()))};d.addEventListener("mouseup",s)},e.addEventListener("timeupdate",n=>{const o=e.querySelector(".vprog i"),r=n.target;!o||!isFinite(r.duration)||!r.duration||(o.style.width=r.currentTime/r.duration*100+"%")},!0)}function Tn(e){const t=e._el;if(!t)return;t.style.width=He(e)+"px";const n=t.querySelector(".body");n.style.height=e.h&&!n.classList.contains("grid")?e.h+"px":""}function Wr(e){const t=e._el;if(!t)return;let n=t.querySelector(".composite-inputs");if(e.cap!=="image_composite"){n?.remove();return}const o=(xe(e)?.inputs||[]).filter(u=>u.type==="image"),r=new Set((l?.edges||[]).filter(u=>u.to===e.id&&!et(u)).flatMap(bn)),a=o.filter(u=>e.assets?.[u.key]||r.has(u.key)),i=JSON.stringify(a.map(u=>[u.key,e.assets?.[u.key],r.has(u.key)]));if(n?.dataset.signature===i)return;n||(n=d.createElement("div"),n.className="composite-inputs",t.querySelector(".body").after(n)),n.dataset.signature=i,n.replaceChildren();const s=d.createElement("div");if(s.className="composite-input-label",s.textContent=`引用图片 · ${a.length}/${o.length}`,n.append(s),!a.length){const u=d.createElement("div");u.className="composite-input-hint",u.textContent="从图片节点连线，或在编辑器中上传图片",n.append(u);return}const c=d.createElement("div");c.className="composite-input-list",n.append(c);for(const u of a){const f=e.assets?.[u.key],p=d.createElement("button");if(p.type="button",p.dataset.compositeReference=u.key,p.title=`${u.label} · ${f?.origin||f?.filename||(f?"查看引用图片":"正在导入")}`,p.setAttribute("aria-label",p.title),p.disabled=!f?.url,f?.url){const h=d.createElement("img");h.src=_i(f.url)||f.url,h.alt=u.label,h.loading="lazy",h.draggable=!1,p.append(h),p.onmousedown=x=>x.stopPropagation(),p.onclick=x=>{x.stopPropagation(),to(f)}}const g=d.createElement("span");g.textContent=f?u.label:"导入中",p.append(g),c.append(p)}}function ot(e){const t=e._el;if(!t)return;Wr(e);const n=t.querySelector(".body"),o=t.querySelector(".st"),r=t.querySelector(".meta"),a=t.querySelector(".bar i");if(gt(e)){const h=String((e.params||{}).style||"").trim();if(n.classList.remove("grid"),n.classList.add("sbody"),Tn(e),n.textContent="",h){const M=d.createElement("div");M.className="stx",M.textContent=h,n.appendChild(M)}else n.innerHTML=Er(e)+'<div class="sempty">在旁边的面板里写一段风格，再把出口拖到生图/生视频节点上</div>';const x=t.querySelector(".port");x&&(x.title="拖到生图/生视频节点上 → 那个节点套用这段风格（拖到空白处会列出所有能挂的玩法）");const w=(l?l.edges:[]).filter(M=>M.from===e.id&&et(M)).length,y=Oe(e).length;o.className="st",o.textContent=h?"":"还没写",r.textContent=w?`挂了 ${w} 个节点`+(y?` · 连带下游 ${y} 张`:""):"还没挂节点",a.style.width="0%";return}if(Ut(e)){const h=e.status==="running";n.classList.remove("grid"),n.classList.add("sbody"),Tn(e),n.textContent="";const x=d.createElement("textarea");if(x.className="ttxt",x.spellcheck=!1,x.value=String((e.params||{}).text||""),x.placeholder=h?"正在加工，稍等…":"在这里写字；选好加工方式点「↑ 运行」，加工结果就落在这个框里 —— 可以直接改",x.disabled=h,x.oninput=()=>{e.params=e.params||{},e.params.text=x.value;const w=d.querySelector("#panel"),y=w?w.querySelector("textarea"):null;y&&y.placeholder==="在这里写字或直接在节点上写"&&(y.value=x.value),na(e),K()},n.appendChild(x),h){const w=d.createElement("div");w.className="load cover",n.appendChild(w)}na(e);return}const i=e.outputs||[],s=i[0],c=zs(e),u=i.map(h=>h.url).join("|")+(c?"|<"+c:""),f=e.status==="queued"||e.status==="running";if(f&&n.dataset.url!=="busy"?(n.dataset.url="busy",n.classList.remove("grid"),Tn(e),n.innerHTML='<div class="load"></div>'):!f&&!i.length&&n.dataset.url==="busy"?(n.dataset.url="",n.innerHTML=Er(e)):ft(e)&&!i.length&&n.dataset.url&&(n.dataset.url="",n.classList.remove("grid"),n.innerHTML=Er(e)),!f&&i.length&&n.dataset.url!==u&&(n.dataset.url=u,n.classList.toggle("grid",i.length>1),Tn(e),i.length>1?(n.style.setProperty("--cols",i.length<=4?2:i.length<=9?3:4),n.innerHTML=i.map((h,x)=>h.kind==="video"?`<video data-video-url="" data-i="${x}" loop preload="none" draggable="false"></video>`:`<img data-i="${x}" alt="" draggable="false">`).join("")):n.innerHTML=s.kind==="video"?'<video data-video-url="" data-i="0" loop preload="none" draggable="false"></video><div class="vprog" title="按住左右拖 → 定位进度（画面上按住是挪节点）"><i></i></div>':s.kind==="audio"?'<audio preload="none" controls style="width:92%"></audio>':c?'<div class="cmp" title="按住左右拖：跟原图对比，看边缘抠干净了没有"><img class="new" alt="" draggable="false" data-i="0"><img class="old" alt="" draggable="false"><div class="cmpx"><i>⇔</i></div><div class="cmptip">按住往右拖 → 回到原图</div></div>':'<img data-i="0" alt="" draggable="false">',tl(n,i,c),c&&Qa(e),!ut(e)&&!ft(e)))for(let h=0;h<i.length;h++){const x=i[h];if(x.kind==="image"&&!x.width){const w=n.querySelector(`img[data-i="${h}"]`)||n.querySelector("img");if(w&&!w.dataset.thumbnail){const y=()=>{!t.isConnected||e._el!==t||!l?.cards.includes(e)||e.outputs?.[h]!==x||!w.naturalWidth||(x.width=w.naturalWidth,x.height=w.naturalHeight,Mt(e),K())};w.complete&&w.naturalWidth?y():w.onload=y}}else if(x.kind==="video"&&!x.width){const w=n.querySelector(`video[data-i="${h}"]`)||n.querySelector("video");w&&w.readyState>=1?(x.width=w.videoWidth,x.height=w.videoHeight,Mt(e),K()):w&&(w.onloadedmetadata=()=>{!t.isConnected||e._el!==t||!l?.cards.includes(e)||e.outputs?.[h]!==x||(x.width=w.videoWidth,x.height=w.videoHeight,Mt(e),K())})}}if(ft(e)){o.className="st"+(s?" done":""),o.textContent=s?"已就绪":"点节点选文件",o.title=s?"把右边的出口拖到别的节点 → 这份素材就进那个节点的格子里":o.textContent,a.style.width="0%",r.textContent=s?String(s.filename||s.origin||s.url||"").split(/[\\/]/).pop().slice(-22):"",r.title=s&&s.origin||"";return}const p=e.status;o.className="st"+(p==="running"||p==="queued"?" run":p==="done"?" done":p==="error"?" err":""),o.textContent=p==="queued"?Qe(e)&&e.step?e.step:e.job?Wi(e):"正在提交…":p==="running"?(Qe(e)&&!(e.progress>0)?"生成中":`生成中 ${Math.round((e.progress||0)*100)}%`)+(e.step?` · ${e.step}`:""):p==="done"?sr(e.ms)?`已完成 · ${sr(e.ms)}`:"已完成":p==="error"?"失败":p==="canceled"?"已取消":e.cap==="image_composite"?"待合成":"待生成",o.title=o.textContent,a.style.width=(p==="running"||p==="queued"?Qe(e)&&!(e.progress>0)?0:(e.progress||.02)*100:p==="done"?100:0)+"%",r.textContent=e.error?String(e.error).slice(0,40):i.length>1?`${i.length} 张`:s?String(s.filename||s.origin||s.url||"").split(/[\\/]/).pop().slice(-22):"",r.title=e.error||"";const g=gr(e);g&&r.replaceChildren(g)}function na(e){const t=e._el;if(!t)return;const n=t.querySelector(".st"),o=t.querySelector(".meta"),r=t.querySelector(".bar i"),a=v(e),i=e.status==="running",s=tn(e),c=t.querySelector(".port");c&&(c.title="拖到生成节点上 → 并进它的提示词；拖到另一个文本节点上 → 当那段加工的输入（拖到空白处会列出能接的地方）");const u=(l?l.edges:[]).filter(g=>g.from===e.id&&et(g)).length,f=T(e).length;n.className="st"+(i?" run":e.status==="error"?" err":a&&e.status==="done"?" done":""),i?n.textContent="处理中…":a?n.textContent=e.status==="error"?"失败":e.status==="done"?sr(e.ms)?`已完成 · ${sr(e.ms)}`:"已完成":"待运行":n.textContent=s?"":"还没写",n.title=n.textContent;const p=[];a&&p.push(`输入 ${f} 段`),u&&p.push(`连 ${u} 个节点`),o.textContent=p.join(" · "),o.title=e.error||"",r.style.width=i?"40%":e.status==="done"?"100%":"0%"}function zs(e){const t=F[Wt(e)];if(!t||!t.compare||t.card==="image")return null;const n=e.outputs||[];if(n.length!==1||n[0].kind!=="image")return null;const o=(t.inputs||[]).find(a=>a.type==="image"),r=o&&(e.assets||{})[o.key];return r&&r.kind==="image"?r.url:null}function Qa(e){const t=e._el&&e._el.querySelector(".cmp");if(!t)return;const n=e._cmp==null?0:e._cmp;t.style.setProperty("--x",n*100+"%"),t.classList.toggle("dragged",e._cmp!=null)}function Ls(e,t){e.addEventListener("mousedown",n=>{if(n.button!==0)return;const o=n.target.closest(".cmp");if(!o)return;n.preventDefault();const r=s=>{const c=o.getBoundingClientRect();t._cmp=Math.min(Math.max((s-c.left)/c.width,0),1),Qa(t)};r(n.clientX);const a=s=>r(s.clientX),i=()=>{d.removeEventListener("mousemove",a),d.removeEventListener("mouseup",i)};d.addEventListener("mousemove",a),d.addEventListener("mouseup",i)})}const at=e=>(l?l.cards:[]).find(t=>t.id===e)||null;function ei(e,t,n,o=!0){if(!t||!n||n.length<=1)return t?[t]:[];const r=/^(\w+)\[(\d+)\]$/.exec(t),a=e&&xe(e);if(!r||!a)return[t];const i=r[1],s=+r[2],c=n[0]&&n[0].kind,u=o?new Set((l?.edges||[]).filter(p=>p.to===e.id&&!et(p)).flatMap(bn)):null,f=(a.inputs||[]).filter(p=>{const g=new RegExp(`^${i}\\[(\\d+)\\]$`).exec(p.key);return g&&+g[1]>=s&&(!c||p.type===c)&&(!o||!(e.assets||{})[p.key]&&!u.has(p.key))}).sort((p,g)=>parseInt(/\[(\d+)\]/.exec(p.key)[1],10)-parseInt(/\[(\d+)\]/.exec(g.key)[1],10)).slice(0,n.length).map(p=>p.key);return f.length?f:[t]}function bn(e){if(!e||et(e))return[];if(Array.isArray(e.slots))return[...new Set(e.slots.filter(Boolean))];const t=at(e.from),n=at(e.to),o=t&&t.outputs||[],r=t&&t.history&&t.history[0]&&t.history[0].outputs||[];return ei(n,e.slot,o.length?o:r,!1)}function ra(e){const t=at(e&&e.to);if(!t||!t.assets)return!1;let n=!1;for(const o of bn(e))o in t.assets&&(delete t.assets[o],n=!0);return n&&(Bn(t),Mt(t)),n}function Un(e,t=!0){const n=new Set(e||[]);if(!n.size)return!1;if(t)for(const o of n)ra(o);l.edges=l.edges.filter(o=>!n.has(o));for(const o of new Set([...n].map(r=>r.to))){const r=at(o);r&&Wr(r)}return!0}function ti(e,t){const n=[];let o=!1;for(const r of l.edges){if(r.to!==e||et(r))continue;const a=bn(r);if(!a.includes(t))continue;const i=a.filter(s=>s!==t);o=!0,i.length?(r.slots=i,r.slot===t&&(r.slot=i[0])):n.push(r)}return Un(n,!1),o}function oa(e){const t=at(e);if(!t)return null;const n=t._el?t._el.offsetHeight:230;return{x:t.x,y:t.y,w:He(t),h:n}}let Xt=null,rr=null;const vo=new Map;function Ps(e,t){const n=new Set(e.cards.map(i=>i.id)),o=new Map,r=new Map;for(const i of e.edges)!n.has(i.from)||!n.has(i.to)||(o.has(i.to)||o.set(i.to,[]),r.has(i.from)||r.set(i.from,[]),o.get(i.to).push(i),r.get(i.from).push(i));const a=(i,s)=>{const c=new Set,u=new Set,f=[...t].filter(p=>n.has(p));for(;f.length;){const p=f.pop();if(!u.has(p)){u.add(p);for(const g of i.get(p)||[])c.add(g),f.push(g[s])}}return c};return{upstream:a(o,"from"),downstream:a(r,"to")}}function ni(e){if(et(e))return!1;const t=at(e.from),n=at(e.to);return!!(t&&n&&!ut(t)&&fe(t).length&&!se(n).length)}function aa(e){const t=at(e.from),n=at(e.to),o=r=>r?he(r):"?";return et(e)?e.slot===qn?`文本：${o(t)} → ${o(n)}`:`风格：${o(t)} → ${o(n)}`:`${o(t)} → ${o(n)}${e.version?`（固定分镜版本 · ${e.version.job} · 第 ${e.version.index+1} 张）`:""}`}function ri(){rr?.disconnect();const e=Xt||_?[]:U.size?[...U]:ie?[ie]:[],{upstream:t,downstream:n}=l&&e.length?Ps(l,e):{upstream:new Set,downstream:new Set};m.wires.classList.toggle("has-flow",!!(t.size||n.size));const o=t.size||n.size;if(o||m.wires.querySelector("defs")?.remove(),o&&!m.wires.querySelector("defs")){const r=d.createElementNS(X,"defs");for(const a of["up","down","both"]){const i=d.createElementNS(X,"marker");for(const[c,u]of Object.entries({id:`wire-arrow-${a}`,class:`flow-${a}`,viewBox:"0 0 10 8",refX:9,refY:4,markerWidth:10,markerHeight:8,markerUnits:"userSpaceOnUse",orient:"auto"}))i.setAttribute(c,u);const s=d.createElementNS(X,"polygon");s.setAttribute("points","0,0 9,4 0,8 2.5,4"),i.append(s),r.append(i)}m.wires.append(r),rr||(rr=new oe(a=>{for(const i of a)i.target.classList.toggle("in-view",i.isIntersecting)},{root:m.stage,rootMargin:"80px"}))}for(const[r,a]of vo){const i=t.has(r)?n.has(r)?"both":"up":n.has(r)?"down":"";if(a.line.classList.toggle("sel",r===Xt),a.line.classList.toggle("related",!!i),a.carry?.classList.toggle("related",!!i),!i){a.flow?.remove(),a.flow=null;continue}a.flow||(a.flow=d.createElementNS(X,"path"),a.flow.setAttribute("d",a.line.getAttribute("d")),a.flow.setAttribute("aria-hidden","true"),a.flow.classList.add("flow"),m.wires.append(a.flow)),a.flow.classList.remove("flow-up","flow-down","flow-both"),a.flow.classList.add(`flow-${i}`),a.flow.setAttribute("marker-end",`url(#wire-arrow-${i})`),rr.observe(a.flow)}}function tt(e=!0){if(!e){ri(),kn();return}if(rr?.disconnect(),vo.clear(),m.wires.innerHTML="",!l){m.wires.classList.remove("has-flow"),kn();return}for(const t of l.edges){const n=oa(t.from),o=oa(t.to);if(!n||!o)continue;const r=n.x+n.w,a=n.y+n.h/2,i=o.x,s=o.y+o.h/2,c=Math.max(50,Math.abs(i-r)*.5),u=`M${r},${a} C${r+c},${a} ${i-c},${s} ${i},${s}`,f=w=>{const y=d.createElementNS(X,"path");return w&&y.setAttribute("class",w),y.setAttribute("d",u),m.wires.appendChild(y),y},p=f("hit"),g=d.createElementNS(X,"title");g.textContent=aa(t)+(ni(t)?"（风格也顺着这根线往下传）":"")+"　点一下选中，Delete 删除",p.appendChild(g),p.addEventListener("mousedown",w=>{w.stopPropagation(),li(t)}),p.addEventListener("contextmenu",w=>{w.preventDefault(),w.stopPropagation(),li(t),Ts(w.clientX,w.clientY,t)});const h=f(et(t)?"txt":""),x=ni(t)?f("carry"):null;vo.set(t,{line:h,carry:x,flow:null})}ri(),kn(),$r()}function ko(e){return{x:e.x,y:e.y,w:He(e),h:e._el?e._el.offsetHeight:230}}function ia(e=Q,t=230){const n=m.stage.getBoundingClientRect(),o=vn((n.left+n.right)/2,(n.top+n.bottom)/2),r=o.x-e/2,a=o.y-t/2,i=24,s=(l?l.cards:[]).map(ko),c=(f,p)=>!s.some(g=>f<g.x+g.w+i&&f+e+i>g.x&&p<g.y+g.h+i&&p+t+i>g.y);if(c(r,a))return{x:Math.round(r),y:Math.round(a)};const u=64;for(let f=1;f<=24;f++)for(const[p,g]of[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const h=r+p*f*u,x=a+g*f*u;if(c(h,x))return{x:Math.round(h),y:Math.round(x)}}return{x:Math.round(r),y:Math.round(a)}}function oi(e){let t=1/0,n=1/0,o=-1/0,r=-1/0;for(const a of e){const i=at(a);if(!i)continue;const s=ko(i);t=Math.min(t,s.x),n=Math.min(n,s.y),o=Math.max(o,s.x+s.w),r=Math.max(r,s.y+s.h)}return t===1/0?null:{x:t,y:n,w:o-t,h:r-n}}function Is(e){if(!l||!De()||!["left","right","top","bottom","center"].includes(e))return;const t=l.cards.filter(y=>U.has(y.id)).map((y,M)=>({c:y,index:M,...ko(y)}));if(t.length<2)return;const n=Math.min(...t.map(y=>y.x)),o=Math.min(...t.map(y=>y.y)),r=Math.max(...t.map(y=>y.x+y.w)),a=Math.max(...t.map(y=>y.y+y.h)),i=e==="left"||e==="right"||e==="center",s=new Map(t.map(y=>[y.c.id,y])),c=new Map(t.map(y=>[y.c.id,new Set])),u=new Map(t.map(y=>[y.c.id,new Set])),f=new Map(t.map(y=>[y.c.id,0]));for(const y of l.edges)y.from===y.to||!s.has(y.from)||!s.has(y.to)||(c.get(y.from).add(y.to),c.get(y.to).add(y.from),u.get(y.from).has(y.to)||(u.get(y.from).add(y.to),f.set(y.to,f.get(y.to)+1)));const p=new Set,g=[],h=(y,M)=>y.x-M.x||y.y-M.y||y.index-M.index;for(const y of t){if(p.has(y.c.id))continue;const M=[],Y=[y.c.id];p.add(y.c.id);for(let Ge=0;Ge<Y.length;Ge++){const Re=Y[Ge];M.push(s.get(Re));for(const xt of c.get(Re))p.has(xt)||(p.add(xt),Y.push(xt))}const Ke=new Set(M),mt=[];for(;Ke.size;){const Ge=[...Ke].filter(xt=>f.get(xt.c.id)===0),Re=(Ge.length?Ge:[...Ke]).sort(h)[0];Ke.delete(Re),mt.push(Re);for(const xt of u.get(Re.c.id))f.set(xt,f.get(xt)-1)}g.push({items:mt,x:Math.min(...M.map(Ge=>Ge.x)),y:Math.min(...M.map(Ge=>Ge.y)),w:M.reduce((Ge,Re)=>Ge+Re.w,0)+24*(M.length-1),h:Math.max(...M.map(Ge=>Ge.h))})}g.sort((y,M)=>i?y.y-M.y||y.x-M.x:y.x-M.x||y.y-M.y);let x=i?o:n;const w=[];for(const y of g){let M=i?e==="left"?n:e==="right"?r-y.w:(n+r-y.w)/2:x;const Y=i?x:e==="top"?o:a-y.h;for(const Ke of y.items)w.push({...Ke,nx:M,ny:e==="bottom"?Y+y.h-Ke.h:Y}),M+=Ke.w+24;x+=(i?y.h:y.w)+24}if(w.some(y=>Math.abs(y.nx-y.x)>1e-7||Math.abs(y.ny-y.y)>1e-7)){for(const{c:y,nx:M,ny:Y}of w)y.x=M,y.y=Y,y._el&&(y._el.style.left=M+"px",y._el.style.top=Y+"px");tt(),bt(),Ur(),K()}}function ai(e,t){if(!be()||!l)return!1;const n=l.cards.filter(a=>U.has(a.id));if(n.length<2)return!1;const o=l,r=[["left","左对齐"],["right","右对齐"],["top","顶部对齐"],["bottom","底部对齐"],["center","垂直居中对齐"]].map(([a,i])=>({text:i,run:()=>{l===o&&Is(a)}}));return Nt(e,t,"选中节点",[{text:"对齐方式",children:r},{text:`复制选中节点（${n.length} 个）`,run:()=>{l===o&&or()}},{text:`批量重命名（${n.length} 个节点）`,run:()=>{if(l!==o||!be())return;const a=l.cards.filter(i=>U.has(i.id));a.length>1&&da(a[0])}},{text:`批量删除（${n.length} 个节点）`,danger:!0,run:()=>{l!==o||!be()||l.cards.filter(a=>U.has(a.id)).length>1&&sa()}}]),!0}function kn(){if(!m.groups)return;let e=m.groups.querySelector(".selbox");if(!U.size){e&&e.remove(),m.selbar.style.display="none";return}const t=oi(U);if(!t)return U.clear(),kn();if(e||(e=d.createElement("div"),e.className="selbox",m.groups.appendChild(e)),e.style.left=t.x-8+"px",e.style.top=t.y-8+"px",e.style.width=t.w+16+"px",e.style.height=t.h+16+"px",U.size<2){m.selbar.style.display="none";return}m.selbar.style.display="";const n=m.stage.getBoundingClientRect(),o=j.x+t.x*j.k,r=j.y+t.y*j.k;m.selbar.style.left=Math.max(4,Math.min(o,n.width-m.selbar.offsetWidth-4))+"px",m.selbar.style.top=Math.max(50,r-m.selbar.offsetHeight-10)+"px"}function $r(){if(m.groups&&(m.groups.querySelectorAll(".ggroup").forEach(e=>e.remove()),!!l))for(const e of l.groups||[]){const t=oi(e.cards);if(!t)continue;const n=12,o=28,r=d.createElement("div");r.className="ggroup",r.style.left=t.x-n+"px",r.style.top=t.y-o+"px",r.style.width=t.w+n*2+"px",r.style.height=t.h+n+o+"px";const a=d.createElement("div");a.className="gglabel",a.textContent=`${e.name}（${e.cards.length}）`,r.appendChild(a),r.onmousedown=i=>{i.button===0&&(i.stopPropagation(),i.preventDefault(),U=new Set(e.cards),Xt=null,tt(!1),si(i,[...e.cards].map(at).filter(Boolean)))},a.ondblclick=i=>{i.stopPropagation(),ii(e)},r.oncontextmenu=i=>{i.preventDefault(),i.stopPropagation(),Nt(i.clientX,i.clientY,e.name,[{icon:"✎",text:"重命名",run:()=>ii(e)},{icon:"✕",text:"删除组（节点保留）",danger:!0,run:()=>{De()&&(l.groups=l.groups.filter(s=>s!==e),$r(),K())}}])},m.groups.appendChild(r)}}function ii(e){if(!De())return;const t=prompt("组名",e.name);t!==null&&(e.name=t.trim().slice(0,30)||e.name,$r(),K())}function si(e,t,n){if(!be()||e.button!==0||!t.length)return;e.stopPropagation(),e.preventDefault(),Jt();const o={mx:e.clientX,my:e.clientY,pos:t.map(s=>({c:s,x:s.x,y:s.y}))};let r=!1;const a=s=>{if(!r&&Math.abs(s.clientX-o.mx)+Math.abs(s.clientY-o.my)<4)return;r||(r=!0);const c=(s.clientX-o.mx)/j.k,u=(s.clientY-o.my)/j.k;for(const f of o.pos)f.c.x=Math.round(f.x+c),f.c.y=Math.round(f.y+u),f.c._el&&(f.c._el.style.left=f.c.x+"px",f.c._el.style.top=f.c.y+"px");tt(),bt()},i=()=>{d.removeEventListener("mousemove",a),d.removeEventListener("mouseup",i),r?(bt(),K()):n&&n()};d.addEventListener("mousemove",a),d.addEventListener("mouseup",i)}function sa(){if(!De())return;const e=l,t=[...U].map(at).filter(Boolean);if(!t.length)return;const n=t.filter(r=>(r.history||[]).length||(r.outputs||[]).length).length;if(!confirm(`删除选中的 ${t.length} 个节点？
`+(n?`其中 ${n} 个节点有历史记录或产物。
`:"")+"相关连线和节点内记录会一并移除，此操作不能撤销；不会删除素材文件。")||l!==e||!be())return;const o=gi(t.map(r=>r.id));o&&ne(`已删除 ${o} 个节点`)}function li(e){Xt=e,ie=null,Cn(),Jt(),rn();for(const t of l.cards)t._el&&t._el.classList.remove("sel");tt(),ne(aa(e)+" · Delete 删除")}function Ts(e,t,n){const o=at(n.from),r=at(n.to);Nt(e,t,aa(n),[...o?[{icon:"◧",text:`选中上游「${he(o)}」`,run:()=>At(o.id)}]:[],...r?[{icon:"◨",text:`选中下游「${he(r)}」`,run:()=>At(r.id)}]:[],{icon:"✕",text:n.slot===qn?"断开这段文本":et(n)?"解除这个风格节点":"删除连线",danger:!0,run:()=>Jr(n)}])}function Jr(e){if(!De())return;const t=!et(e)&&ra(e);Un([e],!1),Xt===e&&(Xt=null),tt(),Ot(),ie&&Se(ie),K(),ne(e.slot===qn?"已断开这段文本输入":et(e)?"已解除风格":t?"已删除连线，并清除下游引用":"已删除连线")}function At(e){ie=e,U.clear(),Xt=null,tt(!1);for(const t of l.cards)t._el&&t._el.classList.toggle("sel",t.id===e);zr(e),Se(e)}function Rs(e,t,n){if(!be()){e.stopPropagation(),At(t.id);return}if(e.button!==0)return;const o=U.has(t.id)&&l.cards.filter(a=>U.has(a.id)).length>1;let r=o?[...U]:null;if(!r){const a=new Set;for(const i of l.groups||[])i.cards.includes(t.id)&&i.cards.forEach(s=>a.add(s));a.size>1&&(r=[...a])}o?Cn():At(t.id),si(e,r?r.map(at).filter(Boolean):[t],o?()=>At(t.id):void 0)}function di(e,t,n,o){if(!De()||e.button!==0)return;e.stopPropagation(),e.preventDefault(),Jt(),At(t.id);const r=n.querySelector(".body"),a={mx:e.clientX,my:e.clientY,x:t.x,y:t.y,w:He(t),h:t.h||r.offsetHeight,ch:n.offsetHeight},i=(f,p,g)=>Math.max(p,Math.min(g,Math.round(f)));let s=!1;const c=f=>{!s&&Math.abs(f.clientX-a.mx)+Math.abs(f.clientY-a.my)<3||(s||(s=!0),t.w=i(a.w+(f.clientX-a.mx)/j.k*o,Ce,Le),f.shiftKey||(t.h=i(a.h+(f.clientY-a.my)/j.k*o,Me,qe)),Tn(t),o<0&&(t.x=a.x+(a.w-t.w),t.y=a.y+(a.ch-n.offsetHeight),n.style.left=t.x+"px",n.style.top=t.y+"px"),tt(),bt())},u=()=>{d.removeEventListener("mousemove",c),d.removeEventListener("mouseup",u),s&&(bt(),K())};d.addEventListener("mousemove",c),d.addEventListener("mouseup",u)}function Os(e,t){if(e.button!==0||!De())return;e.stopPropagation(),e.preventDefault(),Jt();const n=oa(t.id),o=d.createElementNS(X,"path");o.setAttribute("class","tmp"),m.wires.appendChild(o);const r=n.x+n.w,a=n.y+n.h/2;m.world.classList.add("wiring");let i=null;const s=u=>{const f=vn(u.clientX,u.clientY);i=f;const p=Math.max(50,Math.abs(f.x-r)*.5);o.setAttribute("d",`M${r},${a} C${r+p},${a} ${f.x-p},${f.y} ${f.x},${f.y}`)},c=u=>{d.removeEventListener("mousemove",s),d.removeEventListener("mouseup",c),o.remove(),m.world.classList.remove("wiring");const f=u.target.closest&&u.target.closest(".card");f&&f.dataset.id!==t.id?ki(t,l.cards.find(p=>p.id===f.dataset.id)):i&&Zs(t,i,u.clientX,u.clientY)};d.addEventListener("mousemove",s),d.addEventListener("mouseup",c)}function As(){for(const r of["beforeinput","input","change","paste","drop","dragover","click","mousedown"])d.addEventListener(r,a=>{if(be()||!l)return;const i=a.target,s=i.closest?.("#panel, #respop, #dock, #selbar"),c=i.closest?.("#world input, #world textarea, #world select, #world [contenteditable]"),u=["paste","drop","dragover"].includes(r)&&i.closest?.("#stage");(s||c||u)&&(a.preventDefault(),a.stopImmediatePropagation())},!0);matchMedia("(max-width: 760px)").matches&&d.body.classList.add("collapsed"),$("#toggle").setAttribute("aria-expanded",String(!d.body.classList.contains("collapsed"))),$("#toggle").onclick=()=>{const r=d.body.classList.toggle("collapsed");$("#toggle").setAttribute("aria-expanded",String(!r))},$("#createHere").onclick=xs,Fs(),m.fit.onclick=()=>{j={x:60,y:70,k:1},In(),bt(),en()},m.jobsbtn.onclick=Vn,m.selbar.innerHTML="";const e=d.createElement("button");e.className="mkgroup",e.textContent="▦ 打组",e.title="把选中的节点圈成一个组：拖分组框整体移动；双击组名改名，右键框删组（节点保留）",e.onclick=()=>{if(!be()||U.size<2)return;if(l.groups=l.groups||[],l.groups.find(a=>a.cards.length===U.size&&a.cards.every(i=>U.has(i))))return ne("这几张已经是同一组了");l.groups.push({id:Bt(),name:`组 ${l.groups.length+1}`,cards:[...U]}),kn(),$r(),K(),ne("已打组：拖组里的节点或分组框 = 整组一起动；双击组名改名，右键框删组")};const t=d.createElement("button");t.className="renamecards act",t.textContent="批量重命名",t.title="一次填写所有选中节点的新名称，统一确认；留空恢复默认名称",t.onclick=()=>{U.size>1&&da(at([...U][0]))};const n=d.createElement("button");n.className="deletecards act danger",n.textContent="批量删除",n.title="删除框选的所有节点（Delete / Backspace），操作前统一确认",n.onclick=sa,m.selbar.append(e,t,n),m.selbar.onmousedown=r=>r.stopPropagation(),P("resize",()=>{rl(),bt(),Pt(),kn()}),m.stage.addEventListener("mousemove",r=>{jr=vn(r.clientX,r.clientY),Ka(jr.x,jr.y)}),m.stage.addEventListener("mouseleave",()=>{jr=null,Ka(0,0,!1)}),m.stage.addEventListener("mousedown",r=>{if(_||r.target.closest("#selbar")||r.target.closest("#panel"))return;if(r.button===1||r.button===0&&r.shiftKey){r.preventDefault();const u={mx:r.clientX,my:r.clientY,x:j.x,y:j.y};m.stage.classList.add("panning");let f=!1;const p=h=>{f||(f=!0,ji(!0)),j.x=u.x+h.clientX-u.mx,j.y=u.y+h.clientY-u.my,In()},g=()=>{if(m.stage.classList.remove("panning"),d.removeEventListener("mousemove",p),d.removeEventListener("mouseup",g),f&&r.button===0){const h=x=>{x.preventDefault(),x.stopImmediatePropagation()};d.addEventListener("click",h,{capture:!0,once:!0}),ee(()=>d.removeEventListener("click",h,!0),0)}f&&(ji(!1),bt(),en())};d.addEventListener("mousemove",p),d.addEventListener("mouseup",g);return}if(r.button!==0)return;r.preventDefault(),Cn(),$n(),ie=null,rn(),Xt=null;for(const u of l?l.cards:[])u._el&&u._el.classList.remove("sel");U.clear(),tt(!1);const a={mx:r.clientX,my:r.clientY};let i=!1;const s=u=>{if(!i&&Math.abs(u.clientX-a.mx)+Math.abs(u.clientY-a.my)<4)return;i=!0;const f=Math.min(a.mx,u.clientX),p=Math.min(a.my,u.clientY),g=Math.max(a.mx,u.clientX),h=Math.max(a.my,u.clientY),x=m.stage.getBoundingClientRect();m.lasso.style.display="",m.lasso.style.left=f-x.left+"px",m.lasso.style.top=p-x.top+"px",m.lasso.style.width=g-f+"px",m.lasso.style.height=h-p+"px";const w=vn(f,p),y=vn(g,h);if(U.clear(),l)for(const M of l.cards){const Y=ko(M);Y.x<y.x&&Y.x+Y.w>w.x&&Y.y<y.y&&Y.y+Y.h>w.y&&U.add(M.id)}kn()},c=()=>{if(d.removeEventListener("mousemove",s),d.removeEventListener("mouseup",c),m.lasso.style.display="none",!!i)if(U.size===1){const u=[...U][0];U.clear(),At(u)}else tt(!1),U.size&&ne(`选中 ${U.size} 个节点：拖动整体移动 · 右键对齐 / 批量删除 · Delete 全删 · 上方按钮打组 / 批量重命名 / 批量删除`)};d.addEventListener("mousemove",s),d.addEventListener("mouseup",c)}),m.stage.addEventListener("wheel",r=>{if(_||!l)return;r.preventDefault();const a=vn(r.clientX,r.clientY),i=Math.min(Be,Math.max($e,j.k*(r.deltaY<0?1.1:1/1.1))),s=m.stage.getBoundingClientRect();j.x=r.clientX-s.left-a.x*i,j.y=r.clientY-s.top-a.y*i,j.k=i,In(),typeof en=="function"?en():K()},{passive:!1}),m.stage.addEventListener("contextmenu",r=>{if(r.preventDefault(),_||!be()||r.target.closest(".card, #panel, #selbar, #dock, #respop")||(Jt(),ai(r.clientX,r.clientY)))return;const a=vn(r.clientX,r.clientY),i=[];i.push({group:"生成节点"});const s=A.find(f=>f.kind==="text");s&&i.push({icon:s.icon||"✍",text:"文本",run:()=>{xn(s.id,a.x,a.y,s.modes[0]?jt(s.modes[0]):null)}}),A.filter(f=>f.kind==="gen").forEach(f=>{let p=f.name;p==="生图"?p="图片":p==="生视频"&&(p="视频"),i.push({icon:f.icon||"◻",text:p,run:()=>{xn(f.id,a.x,a.y,f.modes[0]?jt(f.modes[0]):null)}})});const u=A.find(f=>f.id==="card_tools");u&&(i.push({group:"工具"}),i.push({icon:u.icon||"◻",text:"工具",run:()=>xn(u.id,a.x,a.y)})),i.push({group:"其他"}),i.push({icon:"📎",text:"上传素材",run:()=>{const f=d.createElement("input");f.type="file",f.accept="image/*,video/*,audio/*",f.onchange=async p=>{const g=p.target.files[0];if(g)try{const h=await It(g),x=A.find(y=>y.kind==="asset");if(!x)return Ie("找不到素材节点定义");const w=xn(x.id,a.x,a.y,x.modes[0].id);if(!w)return;await oo(w,h),ne("已上传："+h.origin)}catch(h){Ie("上传失败："+h.message)}},f.click()}}),Wn&&i.push({icon:"⧉",text:"粘贴刚复制的节点（Ctrl+V）",run:()=>{jr=a,fa()}}),i.length>0&&Nt(r.clientX,r.clientY,"画布",i)}),m.stage.addEventListener("dragover",r=>{_||!be()||(r.preventDefault(),r.dataTransfer.dropEffect="copy")}),m.stage.addEventListener("drop",async r=>{if(_||!be())return;if(r.preventDefault(),[...r.dataTransfer?.types||[]].includes(Ea)){r.stopPropagation();const u=no;if(no=null,!u||l!==u.project||r.dataTransfer.getData(Ea)!==u.token)return;const f=vn(r.clientX,r.clientY);try{const p=await ya(u.output);if(!await hi(u.project,p,Math.round(f.x-134),Math.round(f.y-84)))return;ne(`已建素材节点：${p.origin||u.output.filename||"历史产物"}`)}catch(p){l===u.project&&Ie("导入历史产物失败："+p.message)}return}const a=[...r.dataTransfer?.files||[]];if(!a.length)return;const i=a.filter(u=>u.type.startsWith("image/")||u.type.startsWith("video/")||u.type.startsWith("audio/"));if(!i.length)return ne("只支持图片、视频、音频文件");const s=vn(r.clientX,r.clientY),c=l;for(const u of i){if(l!==c||!be())return;try{const f=await It(u),p={x:Math.round(s.x-134),y:Math.round(s.y-84)};if(!await hi(c,f,p.x,p.y))return;ne(`已建素材节点：${f.origin||u.name}`),s.x+=50,s.y+=50}catch(f){l===c&&Ie(`上传失败 ${u.name}：${f.message}`)}}}),m.view.addEventListener("mousedown",r=>{r.target===m.view&&Yr()}),P("mousedown",r=>{m.respop.style.display!=="none"&&(m.respop.contains(r.target)||Pn())},!0),P("mousedown",r=>{m.menu.style.display!=="none"&&!m.menu.contains(r.target)&&!r.target.closest(".tcap")&&Cn()},!0),d.addEventListener("paste",Ks),d.addEventListener("keydown",r=>{if(d.querySelector("dialog[data-image-composer][open]"))return;if(m.view.style.display!=="none"&&(r.key==="ArrowLeft"||r.key==="ArrowRight")){r.preventDefault(),ci(r.key==="ArrowRight"?1:-1);return}const a=r.target,i=(a.tagName||"").toLowerCase(),s=i==="input"||i==="textarea"||i==="select"||a.isContentEditable;if(l&&!_&&!s&&m.view.style.display==="none"){if((/Mac/i.test(navigator.platform)?r.metaKey&&!r.ctrlKey:r.ctrlKey&&!r.metaKey)&&!r.altKey&&["z","y"].includes(r.key.toLowerCase())){r.preventDefault(),vs(r.key.toLowerCase()==="y"||r.shiftKey);return}const u=at(ie);if(!be()&&(["Delete","Backspace"].includes(r.key)||(r.ctrlKey||r.metaKey)&&r.key.toLowerCase()==="v")){r.preventDefault();return}if(r.key==="Delete"||r.key==="Backspace"){if(Xt){r.preventDefault(),Jr(Xt);return}if(U.size>1){r.preventDefault(),sa();return}if(u){r.preventDefault(),bi(u);return}}if((r.ctrlKey||r.metaKey)&&!r.shiftKey&&!r.altKey){const f=r.key.toLowerCase();if(f==="c"&&(u||U.size)){r.preventDefault(),or(u);return}if(f==="v"){if(ba())return;r.preventDefault(),fa();return}}if(r.key.toLowerCase()==="h"&&u&&!r.ctrlKey&&!r.metaKey&&!r.shiftKey&&!r.altKey){r.preventDefault();const f=m.stage.getBoundingClientRect(),p=f.top+f.height*.3,g=f.left+f.width*.5,h=u.x+(u._el?u._el.offsetWidth/2:Q/2),x=u.y+(u._el?u._el.offsetHeight/2:168/2);j.x=g-h*j.k,j.y=p-x*j.k,In(),bt(),en();return}}if(r.key==="Escape"){if(m.respop.style.display!=="none"){Pn();return}if(m.view.style.display!=="none"){Yr();return}if(m.jobs.style.display!=="none"){$n();return}if(Cn(),Jt(),!_){ie=null,rn(),Xt=null,U.clear(),tt(!1);for(const c of l?l.cards:[])c._el&&c._el.classList.remove("sel")}}}),m.minimapBtn.onclick=$s,js();let o=!0;m.wiresToggle.onclick=()=>{o=!o,m.wires.style.display=o?"":"none",m.wiresToggle.classList.toggle("active",!o),d.querySelectorAll(".card .inp, .card .out").forEach(r=>{r.style.display=o?"":"none"})},m.zoomMenu.onclick=r=>{const a=()=>{typeof en=="function"?en():K()},i=c=>{const u=m.stage.getBoundingClientRect(),f=vn(u.left+u.width/2,u.top+u.height/2);j.x=u.width/2-f.x*c,j.y=u.height/2-f.y*c,j.k=c,In(),bt(),a()},s=[...[500,300,200,125,100,75,50,25,10].map(c=>({icon:c>100?"+":c===100?"1:1":"−",text:`${c>100?"放大":c===100?"重置":"缩小"} (${c}%)`,run:()=>i(c/100)})),{icon:"□",text:"适应画布",run:()=>{j={x:60,y:70,k:1},In(),bt(),a()}}];Nt(r.clientX,r.clientY-200,"缩放",s)}}let Co=0;function Nt(e,t,n,o){Co++,m.menu.innerHTML="";const r=d.createElement("div");r.className="hd",r.textContent=n,m.menu.appendChild(r);for(const a of o){if(a.group){const f=d.createElement("div");f.className="grp",f.textContent=a.group,m.menu.appendChild(f);continue}const i=d.createElement("button");i.disabled=!!a.disabled,a.disabled&&(i.style.opacity="0.45"),a.danger&&(i.className="danger");const s=d.createElement("span");s.textContent=a.icon||"▸";const c=d.createElement("span");c.textContent=a.text,i.append(s,c);const u=()=>{m.menu.querySelectorAll(".menu-submenu").forEach(f=>f.style.display="none"),m.menu.querySelectorAll('[aria-haspopup="menu"]').forEach(f=>f.setAttribute("aria-expanded","false"))};if(a.children){const f=d.createElement("span");f.className="submenu-arrow",f.textContent="›",f.setAttribute("aria-hidden","true"),i.appendChild(f),i.setAttribute("aria-label",a.text),i.setAttribute("aria-haspopup","menu"),i.setAttribute("aria-expanded","false");const p=d.createElement("div");p.className="menu-submenu",p.style.display="none",p.setAttribute("aria-label",a.text);for(const h of a.children){const x=d.createElement("button"),w=d.createElement("span");w.textContent=h.icon||"▸";const y=d.createElement("span");y.textContent=h.text,x.append(w,y),x.onclick=()=>{Cn(),Jt(),h.run()},p.appendChild(x)}const g=()=>{u(),p.style.display="",i.setAttribute("aria-expanded","true");const h=m.menu.getBoundingClientRect(),x=i.getBoundingClientRect(),w=p.offsetWidth,y=p.offsetHeight,M=h.right+w>innerWidth-8?h.left-w+1:h.right-1;p.style.left=Math.max(8,M)-h.left-m.menu.clientLeft+"px",p.style.top=Math.max(8,Math.min(x.top,innerHeight-y-8))-h.top-m.menu.clientTop+"px"};i.onmouseenter=g,i.onclick=g,i.onkeydown=h=>{h.key==="ArrowRight"&&(h.preventDefault(),g(),p.querySelector("button").focus())},p.onkeydown=h=>{h.key==="ArrowLeft"&&(h.preventDefault(),u(),i.focus())},m.menu.append(i,p)}else i.onmouseenter=u,i.onclick=()=>{Cn(),Jt(),a.run()},m.menu.appendChild(i);a.tip&&mo(i,a.tip)}m.menu.style.display="",m.menu.style.left=Math.min(e,innerWidth-m.menu.offsetWidth-8)+"px",m.menu.style.top=Math.min(t,innerHeight-m.menu.offsetHeight-8)+"px"}const Cn=()=>{Co++,m.menu.style.display="none"};function Xr(e,t,n){const o=d.createElement("button");o.className="tcap";const r=d.createElement("span");r.textContent=e;const a=d.createElement("i");return a.textContent="▴",o.append(r,a),o.title=t+" —— 点击换",o.onclick=i=>{i.stopPropagation();const s=o.getBoundingClientRect();Nt(s.left,s.bottom+4,t,n());const c=m.menu;s.bottom+c.offsetHeight+12>innerHeight&&(c.style.top=Math.max(48,s.top-c.offsetHeight-8)+"px")},o}function Fs(){const e=(o,r,a,i)=>{const s=d.createElement("button");s.className="dockb",s.title=a;const c=d.createElement("span");c.textContent=o;const u=d.createElement("span");return u.textContent=r,s.append(c,u),s.onmousedown=f=>f.stopPropagation(),s.onclick=f=>{f.stopPropagation(),i(s)},s},t=o=>()=>{if(!l)return;const r=ia();xn(o,r.x,r.y)},n=()=>{const o=d.createElement("div");return o.className="sep",o};m.dock.innerHTML="",m.dock.append(e("↥","上传","选一个图片/视频文件，放进一个素材节点 —— 再把它的出口拖到别的节点上就能反复用",El),n(),e("T","文本","新建一个文本节点：存一段字，连到生成节点就并进提示词",t("card_text")),e("▧","图片","新建一个生图节点（默认文生图，玩法在参数面板左下角换）",t("card_image")),e("▷","视频","新建一个生视频节点（默认图生视频，玩法在参数面板左下角换）",t("card_video")),e("◇","工具箱","新建工具箱节点（玩法在参数面板左下角切换）",t("card_tools")))}const pi={video:"放大播放",audio:"放大播放"};let Ue=null;function _o(){Ue?.image&&(Ue.image.style.transform=`translate3d(${Ue.x}px, ${Ue.y}px, 0) scale(${Ue.scale})`)}function Ds(){Ue?.image&&(Ue.scale=1,Ue.x=0,Ue.y=0,_o())}function qs(e){Ue.image=e,Ue.scale=1,Ue.x=0,Ue.y=0,e.classList.add("vimage"),e.title="滚轮缩放 · 拖拽平移 · 双击还原",_o(),e.addEventListener("wheel",o=>{if(!Ue||Ue.image!==e)return;o.preventDefault();const r=Ue.scale,a=Math.min(8,Math.max(.2,r*Math.exp(-o.deltaY*.0015)));if(a===r)return;const i=e.getBoundingClientRect(),s=a/r;Ue.x+=(o.clientX-(i.left+i.width/2))*(1-s),Ue.y+=(o.clientY-(i.top+i.height/2))*(1-s),Ue.scale=a,_o()},{passive:!1});let t=null;e.addEventListener("pointerdown",o=>{o.button!==0||!Ue||Ue.image!==e||(o.preventDefault(),t={id:o.pointerId,mx:o.clientX,my:o.clientY,x:Ue.x,y:Ue.y},e.setPointerCapture(o.pointerId),e.classList.add("panning"))}),e.addEventListener("pointermove",o=>{!t||o.pointerId!==t.id||!Ue||Ue.image!==e||(Ue.x=t.x+o.clientX-t.mx,Ue.y=t.y+o.clientY-t.my,_o())});const n=o=>{!t||o.pointerId!==t.id||(t=null,e.classList.remove("panning"),e.hasPointerCapture(o.pointerId)&&e.releasePointerCapture(o.pointerId))};e.addEventListener("pointerup",n),e.addEventListener("pointercancel",n),e.ondblclick=o=>{o.preventDefault(),Ds()}}function Yr(){m.vbox.innerHTML="",m.view.style.display="none",Ue=null}function Vr(e,t=0,n=null,o=void 0){const r=n||e.outputs||[];if(!r.length){ne("这个节点还没有产物，先运行一次");return}Ue={outs:r,idx:Math.min(Math.max(t,0),r.length-1),seed:o!==void 0?o:e?e.seed:null},ui(),m.view.style.display=""}function ci(e){if(!Ue)return;const t=Ue.outs.length;t<2||(Ue.idx=(Ue.idx+e+t)%t,ui())}function ui(){const{outs:e,idx:t,seed:n}=Ue,o=e[t];Ue.image=null,Ue.scale=1,Ue.x=0,Ue.y=0;const r=d.createElement("div");r.className="vinfo";const a=[o.filename];e.length>1&&a.unshift(`${t+1} / ${e.length}`),n!=null&&a.push("seed "+n);const i=()=>r.textContent=a.join("　·　");let s;if(o.kind==="video"){s=d.createElement("video"),s.controls=s.autoplay=s.loop=!0;const u=()=>{const f=s.play();f&&typeof f.catch=="function"&&f.catch(()=>{})};s.readyState>=3?u():s.addEventListener("canplay",u,{once:!0}),Zr(s,o.url),s.onloadedmetadata=()=>{a.splice(a.indexOf(o.filename)+1,0,`${s.videoWidth}×${s.videoHeight}`,fi(s.duration)),i()}}else o.kind==="audio"?(s=d.createElement("audio"),s.src=o.url,s.controls=s.autoplay=!0,s.onloadedmetadata=()=>{a.splice(a.indexOf(o.filename)+1,0,fi(s.duration)),i()}):(s=d.createElement("img"),s.src=o.url,a.push("滚轮缩放 · 拖拽平移 · 双击还原"),s.onload=()=>{a.splice(a.indexOf(o.filename)+1,0,`${s.naturalWidth}×${s.naturalHeight}`),i()},qs(s));s.draggable=!1,i();const c=d.createElement("button");if(c.className="vx",c.textContent="✕",c.title="关闭 (Esc)",c.onclick=Yr,m.vbox.innerHTML="",m.vbox.append(s,r,c),e.length>1)for(const[u,f,p]of[["p","‹",-1],["n","›",1]]){const g=d.createElement("button");g.className="vnav "+u,g.textContent=f,g.title=p<0?"上一张 (←)":"下一张 (→)",g.onclick=()=>ci(p),m.vbox.appendChild(g)}}function fi(e){if(!isFinite(e))return"时长未知";const t=Math.round(e);return`${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`}const la=e=>on()&&!e.locked&&!e.readonly&&!e.read_only&&["card_image","card_video"].includes(e.type)&&xe(e)?.kind==="gen";async function Bs(e){const t=l?.id,n=e.id;if(!la(e))return ne("此节点或画布不可加入导演台");try{if(await Yn(t),e=l?.cards.find(i=>i.id===n),!e||!la(e))throw new Error("节点已删除、锁定或不可操作");let o=Ro(e);if(!o){_t++;try{const i=await Vt(`/api/projects/${encodeURIComponent(t)}/director/import`,{rev:l.director?.rev||0,canvas_rev:l.rev||0,cards:[n]});if(l?.id!==t)throw new Error("画布已切换");if(o=Ro(e,i.project),!o)throw new Error("导入接口未返回关联镜头");yo(i.project)}finally{_t=Math.max(0,_t-1),ea()}}const r=`/director?project=${encodeURIComponent(t)}&shot=${encodeURIComponent(o.id)}`;G.open(r,"_blank","noopener"),ne("导演镜头已就绪");const a=d.createElement("a");a.href=r,a.target="_blank",a.rel="noopener",a.textContent="打开导演镜头",m.toast.append(" · ",a)}catch(o){Ie("导演台操作失败："+o.message)}}function Hs(e,t,n){if(!be())return Nt(e,t,he(n),[{text:"复制节点",run:()=>or(n)},...(n.outputs||[]).length?[{text:"预览产物",run:()=>Vr(n)}]:[]]);const o=xe(n),r={icon:"✎",text:U.size>1&&U.has(n.id)?`批量重命名（${U.size} 个节点）`:"重命名节点",run:()=>da(n)};if(gt(n)){const u=l.edges.filter(f=>f.from===n.id&&et(f)).length;return Nt(e,t,n.name||"风格化提示词",[r,{icon:"⧉",text:"就地复制一张",run:()=>So(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>or(n)},...u?[{icon:"⊘",text:`解除挂着的 ${u} 个节点`,run:()=>{l.edges=l.edges.filter(f=>!(f.from===n.id&&et(f))),tt(),Ot(),ie&&Se(ie),K()}}]:[],...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Eo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>Gr(n.id)}])}if(Ut(n))return Nt(e,t,n.name||he(n),[...v(n)?[{icon:"↑",text:"运行（加工文本）",run:()=>Oo(n)}]:[],r,{icon:"⧉",text:"就地复制一张",run:()=>So(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>or(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Eo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>Gr(n.id)}]);if(ft(n)){const u=gn(n);return Nt(e,t,n.name||he(n),[...u?[{icon:"⛶",text:pi[u.kind]||"查看大图",run:()=>to(u)}]:[],...u?[{icon:"⬇",text:`下载${Ve[u.kind]||"文件"}`,run:()=>Kr(u)}]:[],{icon:"📁",text:"选择 / 换文件",run:()=>Io(n)},r,{icon:"⧉",text:"就地复制一张",run:()=>So(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>or(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Eo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>Gr(n.id)}])}const a=n.outputs||[],i=a[0],s=a.length>1?`逐张看大图（${a.length} 张）`:pi[i&&i.kind]||"查看大图",c=a.length>1?`下载全部 ${a.length} 张${i.kind==="video"?"视频":i.kind==="audio"?"音频":"图片"}`:`下载${i?.kind==="video"?"视频":i?.kind==="audio"?"音频":"图片"}`;Nt(e,t,n.name||(o?o.name:"节点"),[...!_&&la(n)?[{text:Ro(n)?"查看导演镜头":"加入导演台",run:()=>Bs(n)}]:[],...i?[{icon:"⛶",text:s,run:()=>Vr(n)}]:[],...i?[{icon:"⬇",text:c,run:()=>a.forEach(u=>Kr(u))}]:[],r,{icon:"↑",text:"运行",run:()=>Oo(n)},{icon:"⧉",text:"就地复制一张",run:()=>So(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>or(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Eo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>Gr(n.id)}])}function Kr(e){const t=d.createElement("a");t.href=e.url,t.download=e.filename.split(/[\\/]/).pop()||"download",d.body.appendChild(t),t.click(),t.remove()}function Eo(e){De()&&(delete e.w,delete e.h,Tn(e),tt(),bt(),K())}function da(e){if(!e||!De())return;if(U.size>1&&U.has(e.id)){const o=l.cards.filter(r=>U.has(r.id)).sort((r,a)=>r.y-a.y||r.x-a.x);if(o.length>1)return Us(o)}const t=xe(e),n=prompt("节点名字（留空恢复成工作流名）",e.name||(t?t.name:""));n!==null&&mi([{card:e,name:n}])}function Us(e){const t=l,n=d.createElement("dialog");n.className="auth-dialog rename-dialog";const o=d.createElement("form"),r=d.createElement("h2");r.id="rename-heading",r.textContent=`批量重命名（${e.length} 个节点）`,n.setAttribute("aria-labelledby",r.id);const a=d.createElement("p");a.className="auth-note",a.textContent="按画布从上到下、从左到右排列。一次填好各节点名称后统一确认；留空恢复默认名称。";const i=d.createElement("div");i.className="rename-list";const s=e.map((p,g)=>{const h=d.createElement("label");h.className="fld";const x=d.createElement("span");x.textContent=`${g+1}. ${he(p)}`;const w=d.createElement("input");return w.type="text",w.maxLength=40,w.value=he(p),w.placeholder=he({...p,name:null}),h.append(x,w),i.appendChild(h),{card:p,input:w}}),c=d.createElement("footer"),u=d.createElement("button");u.type="button",u.className="btn",u.textContent="取消";const f=d.createElement("button");f.type="submit",f.className="btn primary",f.textContent="确认重命名",c.append(u,f),o.append(r,a,i,c),n.appendChild(o),u.onclick=()=>n.close(),n.addEventListener("close",()=>n.remove()),n.addEventListener("keydown",p=>p.stopPropagation()),o.onsubmit=p=>{p.preventDefault(),l===t&&De()&&mi(s.map(({card:g,input:h})=>({card:g,name:h.value}))),n.close()},d.body.appendChild(n),n.showModal(),s[0].input.focus(),s[0].input.select()}function mi(e){const t=e.map(({card:o,name:r})=>({card:o,name:r.trim().slice(0,40)||null})).filter(({card:o,name:r})=>l.cards.includes(o)&&r!==(o.name||null)&&!(r&&r===he(o)));if(!t.length)return;const n=new Map;for(const{card:o,name:r}of t){const a=he(o),i=he({...o,name:r});a!==i&&n.set(`@${a}`,`@${i}`)}if(n.size){const o=[...n.keys()].sort((a,i)=>i.length-a.length).map(a=>a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")),r=new RegExp(`(?:${o.join("|")})(?![\\u4e00-\\u9fa5\\w])`,"g");for(const a of l.cards){for(const i of z(xe(a))){const s=a.params?.[i.key];typeof s=="string"&&(a.params[i.key]=s.replace(r,c=>n.get(c)))}for(const i in a.opt||{})typeof a.opt[i]=="string"&&(a.opt[i]=a.opt[i].replace(r,s=>n.get(s)))}}for(const{card:o,name:r}of t)o.name=r,Gt(o);ie&&En(ie),K()}function So(e){if(De())return yi(xi(e),{x:e.x+24+Q/2,y:e.y+28+40})}function pa(e,t){if(!l||!e?.id)return;const n=l.cards.find(o=>o.id===e.id);if(n)for(const o of["created_by","created_by_name","created_at"])e[o]!==void 0&&(n[o]=e[o]);else{const o=JSON.parse(JSON.stringify(e));Mo(o),l.cards.push(o),m.world.appendChild(ta(o)),tt(),$r(),Ur(),m.hint.textContent=`${l.cards.length} 个节点`,ne(`${o.created_by_name||"协作者"} 添加了「${o.name||"新节点"}」`)}Number.isFinite(t)&&(l.rev=Math.max(l.rev||0,t))}function hi(e,t,n,o){return D((async()=>{const r=()=>l===e&&be();if(!r())return null;for(;;){const i=Ye.pendingChain;if(await i,!r())return null;if(i===Ye.pendingChain)break}const a=xn("card_asset",n,o,null,!1);return!a||(At(a.id),await oo(a,t),!await a._create||!r()||!e.cards.includes(a))?null:a})())}function Ws(e,t){if(!l||e.id!==l.id)return;const n=t.id,o=l.edges.filter(p=>p.from===n||p.to===n),r=(l.groups||[]).filter(p=>p.cards.includes(n)),a=(e.cards||[]).find(p=>p.id===n);if(a)for(const p of["created_by","created_by_name","created_at"])t[p]=a[p];const i=(e.cards||[]).filter(p=>p.id!==n);i.push(t);const s=e.edges||[],c=new Set(s.map(p=>JSON.stringify(p)));for(const p of o){const g=JSON.stringify(p);c.has(g)||(s.push(p),c.add(g))}const u=(e.groups||[]).filter(p=>!p.cards.includes(n));u.push(...r);const f=m.panel.style.display!=="none";Object.assign(l,e,{cards:i,edges:s,groups:u}),Dt&&Dt.rev<=l.rev&&(Dt=null),nr(),f&&ie&&Se(ie)}function Js(e){!l||e.created_by||(l.cards=l.cards.filter(t=>t!==e),l.edges=l.edges.filter(t=>t.from!==e.id&&t.to!==e.id),l.groups=(l.groups||[]).map(t=>({...t,cards:t.cards.filter(n=>n!==e.id)})).filter(t=>t.cards.length),U.delete(e.id),ie===e.id&&(ie=null,rn()),nr())}function Xs(e,t=!1){const n=l,o=n.id;return Ye.enqueueCardCreate(async()=>{try{const r=await Vt(`/api/projects/${encodeURIComponent(o)}/cards`,{card:Ko(e)});if(t){if(l!==n||!n.cards.includes(e))return!1;const a=r.project.cards.find(i=>i.id===e.id);pa(a,r.project.rev)}else{if(l?.id!==o)return!1;if(!n.cards.includes(e)){const a=r.project.cards.find(i=>i.id===e.id);return n.cards.some(i=>i.id===e.id)?pa(a,r.project.rev):l.rev=Math.max(l.rev||0,r.project.rev||0),!1}Ws(r.project,e)}return!0}catch(r){(t?l===n:l?.id===o)&&(Ye.markWorkFailure(r),Js(e),Ie("卡片添加失败："+r.message))}})}function xn(e,t,n,o,r=!0){if(!De())return null;const a=un(e);if(!a||!a.modes||!a.modes.length)return Ie(`节点类型 ${e} 不可用：找不到定义或没有模式`),null;const i={id:Bt(),type:e,cap:o||jt(a.modes[0]),x:Math.round(t),y:Math.round(n),params:{},assets:{},status:null,progress:0,outputs:[]},c=l.cards.filter(f=>Et(f)===a).reduce((f,p)=>{if(!p.name)return f;const g=p.name.match(/^(.+?)(\d+)$/);return g?Math.max(f,parseInt(g[2],10)):f},0),u=a.name||a.modes[0].name;return i.name=`${u}${c+1}`,Zo(),l.cards.push(i),m.world.appendChild(ta(i)),r&&At(i.id),tt(),i._create=Xs(i,!r),queueMicrotask(xo),i}function Gr(e){return gi([e])}function gi(e){if(!l||!De())return 0;const t=new Set(e),n=new Set(l.cards.filter(o=>t.has(o.id)).map(o=>o.id));if(!n.size)return 0;Un(l.edges.filter(o=>n.has(o.from))),l.cards=l.cards.filter(o=>!n.has(o.id)),l.edges=l.edges.filter(o=>!n.has(o.to));for(const o of n)U.delete(o);if(l.groups){for(const o of l.groups)o.cards=o.cards.filter(r=>!n.has(r));l.groups=l.groups.filter(o=>o.cards.length)}return n.has(ie)&&(ie=null,rn()),Jt(),n.has(m.hist._id)&&Xn(),Xt=null,nr(),K(),n.size}function bi(e){if(!l||!De()||!e||at(e.id)!==e)return;const t=l,n=e.id,o=he(e),r=(e.history||[]).length,a=(e.outputs||[]).length||r;confirm(`删除「${o}」？
`+(a?`它有 ${r} 轮生成记录或产物，节点内记录删除后无法恢复。
`:"")+"相关连线会一并移除，此操作不能撤销；不会删除素材文件。")&&(l!==t||!be()||at(n)!==e||Gr(n)&&ne(`已删除「${o}」`))}let Wn=null,jr=null,ca=0;function ua(e){return JSON.parse(JSON.stringify({id:e.id,type:e.type,cap:e.cap,name:e.name||null,w:e.w,h:e.h,x:e.x,y:e.y,params:e.params||{},assets:e.assets||{},outputs:e.outputs||[],opt:e.opt,optUse:e.optUse,optStyles:e.optStyles}))}function xi(e){const t=l.edges.filter(o=>o.to===e.id&&o.from!==e.id&&at(o.from)).map(o=>et(o)?{...o}:{...o,slots:bn(o)});for(const[o,r]of Object.entries(e.assets||{})){if(!r||t.some(s=>!et(s)&&s.slots.includes(o)))continue;const a=typeof r=="string"?[r]:[r.ref,r.url].filter(Boolean),i=l.cards.find(s=>s.id!==e.id&&(s.outputs||[]).some(c=>a.some(u=>u===c.ref||u===c.url)));i&&t.push({from:i.id,to:e.id,slot:o,slots:[o]})}const n=[...new Set(t.map(o=>o.from))].map(o=>{const r=at(o),a=ua(r);if(!ut(r)){const i=t.filter(c=>c.from===o&&!et(c)).flatMap(c=>c.slots.map(u=>{const f=e.assets?.[u];return f&&typeof f=="object"?f:a.outputs.find(p=>f&&(p.ref===f||p.url===f))}).filter(Boolean)),s=[...new Map(i.map(c=>[c.ref||c.url||JSON.stringify(c),c])).values()];Object.assign(a,{type:"card_asset",cap:"asset",name:he(r),params:{},assets:{},outputs:s.length?s:a.outputs})}return a});return JSON.parse(JSON.stringify({...ua(e),sourceProject:l.id,references:{cards:n,edges:t}}))}function or(e){const t=!e||U.has(e.id)?l.cards.filter(n=>U.has(n.id)):[e];t.length&&(Wn=t.map(xi),ca=0,ne(t.length>1?`已复制 ${t.length} 个节点 · Ctrl / Cmd + V 批量粘贴`:`已复制「${he(t[0])}」${Wn[0].outputs.length?"（包含当前产物）":""} · Ctrl / Cmd + V 粘贴`))}function Ys(e,t){const n=Array.isArray(e)?e:[e],o=n[0],r=o.sourceProject&&o.sourceProject!==l.id,a=new Set(n.map(h=>h.id)),i=new Map,s=n.flatMap(h=>h.references?.edges||[]);if(r)for(const h of n)for(const x of h.references?.cards||[]){if(a.has(x.id))continue;const w=i.get(x.id);w?w.outputs=[...new Map([...w.outputs||[],...x.outputs||[]].map(y=>[y.ref||y.url||JSON.stringify(y),y])).values()]:i.set(x.id,{...x})}if([...n,...i.values()].some(h=>!A.some(x=>x.id===h.type)))throw new Error("这种节点在当前版本里不存在了，粘不了");const c=(h,x,w)=>{const y=xn(h.type,x,w,h.cap,!1);return y?(Object.assign(y,{...ua(h),id:y.id,x:y.x,y:y.y,status:h.outputs?.length?"done":null}),Gt(y),Tn(y),ot(y),Mt(y),zi(y),y):null},u=t.x-Q/2-o.x,f=t.y-40-o.y,p=new Map,g=[];for(const h of[...n,...i.values()]){const x=c(h,h.x+u,h.y+f);x&&(p.set(h.id,x.id),a.has(h.id)&&g.push(x))}for(const h of s){const x=p.get(h.from)||!r&&h.from,w=p.get(h.to);x&&w&&at(x)&&l.edges.push({...JSON.parse(JSON.stringify(h)),from:x,to:w})}if(!g.length)return null;if(g.length===1)At(g[0].id);else{ie=null,Xt=null,U=new Set(g.map(h=>h.id)),rn(),Xn();for(const h of l.cards)h._el?.classList.toggle("sel",U.has(h.id));kn()}return tt(),Ot(),K(),ne(g.length>1?`已粘贴 ${g.length} 个节点`:`已粘贴「${he(g[0])}」`),g.length===1?g[0]:g}function yi(e,t){const n=l;return D((async()=>{try{let o=Array.isArray(e)?e:[e];if(o[0].sourceProject&&o[0].sourceProject!==n.id){const r=o.length>1,a=await Vt(`/api/projects/${encodeURIComponent(n.id)}/copy`,{source_project:o[0].sourceProject,card:r?{cards:o}:o[0]});if(!a.card||r&&!Array.isArray(a.card.cards))throw new Error("复制接口未返回节点");o=r?a.card.cards:[a.card]}for(;;){const r=Ye.pendingChain;if(await r,!be()||l!==n)throw new Error("画布已切换或权限已变化，未粘贴");if(r===Ye.pendingChain)break}return Ys(o,t)}catch(o){Ie(`粘贴失败：${o.message}`)}})())}function fa(){if(!De())return;if(!Wn)return ne("还没复制东西：先选中节点，Ctrl / Cmd + C");const e=Wn[0],t=jr||{x:e.x+Q/2+24*++ca,y:e.y+40+28*ca};return yi(Wn,t)}const ma={png:"image",jpg:"image",jpeg:"image",webp:"image",gif:"image",bmp:"image",mp4:"video",webm:"video",mkv:"video",mov:"video",avi:"video"},wi={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif","image/bmp":"bmp","video/mp4":"mp4","video/webm":"webm","video/x-matroska":"mkv","video/quicktime":"mov","video/x-msvideo":"avi"};let ha=Promise.resolve();function ga(e){return ma[/\.([a-z0-9]+)$/i.exec(e.name||"")?.[1].toLowerCase()]||ma[wi[e.type]]||null}function ba(){if(!l||m.panel.style.display==="none"||m.panel.style.visibility==="hidden"||m.view.style.display!=="none"||d.querySelector("dialog[open]"))return null;const e=_?Hr():at(m.panel._id);return e&&e.id===m.panel._id?e:null}function $o(e,t){if(ut(e)||ft(e))throw new Error("当前节点不接收图片 / 视频引用，请先打开生成或工具节点的参数面板");const n=Et(e),o=xe(e),r=Uo(e,t);let a=e.cap;if(r)a=r.cap;else if(n?.id==="card_image"&&t==="image"&&["zimage_t2i","krea2_t2i"].includes(a))a=a.replace("_t2i","_i2i");else if(n?.id==="card_video"&&t==="video"&&!o?.inputs.some(g=>g.type===t)){const g=n.modes.find(h=>jo(h,t));g&&(a=jt(g))}const i=l.edges.filter(g=>g.to===e.id&&!et(g));if(a!==e.cap&&(Object.values(e.assets||{}).some(Boolean)||i.length))throw new Error("引用此素材需要切换模式；为保留已有引用，请先手动选择对应模式");const s=F[a],c=s?.inputs.filter(g=>g.type===t)||[],u=Jn(s,t),f=g=>!!e.assets?.[g.key]||i.some(h=>bn(h).includes(g.key)),p=c.find(g=>!f(g));if(!p||c.filter(f).length>=u)throw new Error(c.length?`${Ve[t]}引用已满，不会覆盖已有素材`:`当前节点没有可接收的${Ve[t]}槽位`);return{cap:a,slot:p}}async function Vs(e,t,n){let o=n.cap;const r=()=>l===t&&on()&&t.cards.includes(n)&&ba()===n&&n.cap===o;try{if(!r())return;if(!un("card_asset"))throw new Error("找不到素材节点定义");const a={...n,assets:{...n.assets}};for(const i of e){const s=$o(a,ga(i));a.cap=s.cap,a.assets[s.slot.key]=!0}for(const i of e){if(!r())return;const s=ga(i);$o(n,s);const c=/\.([a-z0-9]+)$/i.exec(i.name||"")?.[1].toLowerCase(),u=ma[c]?i:new File([i],`${i.name||"剪贴板素材"}.${wi[i.type]}`,{type:i.type}),f=await It(u,xe(n)?.execution==="browser");if(!r())return;if(f.kind!==s)throw new Error("上传素材类型不匹配，未创建节点或引用");for(;;){const x=Ye.pendingChain;if(await x,!r())return;if(x===Ye.pendingChain)break}$o(n,s);const p=ia(),g=xn("card_asset",p.x,p.y,null,!1);if(!g||(await oo(g,f,!1),!await g._create))return;if(!r()||!t.cards.includes(g)){l===t&&ne("素材已导入，但当前节点已改变，未添加引用");return}const h=$o(n,s);h.cap!==n.cap&&(Et(n)?.id==="card_image"?(tr(n,h.cap),n._model||(n._model=h.cap.startsWith("krea2")?"krea2":"zimage")):n.cap=h.cap,o=n.cap,Gt(n)),n.assets[h.slot.key]=JSON.parse(JSON.stringify(g.outputs[0])),Bn(n),t.edges.push({from:g.id,to:n.id,slot:h.slot.key,slots:[h.slot.key]}),tt(),Ot(),Mt(n),Se(n.id),K(),ne(`已导入${Ve[s]}素材并引用到「${he(n)}」的${ln(h.slot,n)}`)}}catch(a){l===t&&Ie("剪贴板导入失败："+a.message)}}function Ks(e){if(e.defaultPrevented||d.querySelector("dialog[data-image-composer][open]"))return;const t=ba();if(!t)return;const n=e.clipboardData,o=[...n?.items||[]].filter(i=>i.kind==="file").map(i=>i.getAsFile()).filter(Boolean),r=o.length?o:[...n?.files||[]];if(r.length){if(e.preventDefault(),!on())return ne("此画布只读或已锁定，不能导入剪贴板素材");const i=r.filter(c=>ga(c));if(!i.length)return ne("剪贴板仅支持图片或视频文件");const s=l;ha=ha.then(()=>Vs(i,s,t)),D(ha);return}e.target.closest("input,textarea,select")||e.target.isContentEditable||_||(Wn?(e.preventDefault(),fa()):n?.types.length&&ne("剪贴板未提供可读取的图片 / 视频文件；复制路径不能导入，请拖入文件或上传"))}function Jn(e,t){if(!e)return 0;const n=e.slotLimits&&e.slotLimits[t]&&e.slotLimits[t].max;return n??e.inputs.filter(o=>o.type===t).length}function vi(e,t){const n=xe(e);return n?n.inputs.filter(o=>o.type===t&&(e.assets||{})[o.key]).length:0}function Gs(e,t){const n=xe(e);if(!n)return null;const o=new Set((l?.edges||[]).filter(r=>r.to===e.id&&!et(r)).flatMap(bn));return Qe(e)&&(!Jn(n,t)||vi(e,t)>=Jn(n,t))?null:n.inputs.find(r=>r.type===t&&!e.assets?.[r.key]&&!o.has(r.key))||null}function xa(e,t){if(!De()||e.id===t.id)return;if(Ut(t)){if(!tn(e))return ne(`「${he(e)}」手里还没有字：先写一段，或先运行它`);if(l.edges.some(a=>a.from===e.id&&a.to===t.id&&a.slot===qn))return ne("已经接过了");l.edges.push({from:e.id,to:t.id,slot:qn}),tt(),Ot(),ie===t.id&&Se(t.id),K();const r=T(t).length;ne(`已把「${he(e)}」的文本接给「${he(t)}」（第 ${r} 段输入）`);return}if(gt(t))return ne("风格节点不收输入：它把字写给生成节点用");if(!z(xe(t)).length)return ne(`「${he(t)}」不写提示词，接文本节点没有用`);if(!tn(e))return ne(`「${he(e)}」手里还没有字：先写一段，或先运行它`);if(l.edges.some(r=>r.from===e.id&&r.to===t.id&&r.slot===er))return ne("已经挂上了");l.edges.push({from:e.id,to:t.id,slot:er}),tt(),Ot(),ie===t.id&&Se(t.id),K();const o=Oe(e).length;ne(`文本已挂给「${he(t)}」`+(o?`，下游 ${o} 个节点也跟着带`:""))}async function ki(e,t){if(!De()||!t)return;if(ut(e))return xa(e,t);if(ut(t))return ne("文本节点不收图片/视频素材：把文本节点的出口拖过来才是接文本");if(ft(t))return ne("素材节点不收输入：它是把手里那份素材送给别的节点的");const n=e.outputs||[],o=n[0];if(!o)return ne(ft(e)?"这个素材节点还是空的：先点它选个文件":"上游还没有产物，先运行它");const r=Et(t);let a=!1;r&&r.id==="card_image"&&o.kind==="image"&&(t.cap==="zimage_t2i"?(tr(t,"zimage_i2i"),t._model||(t._model="zimage"),Gt(t),a=!0):t.cap==="krea2_t2i"&&(tr(t,"krea2_i2i"),t._model||(t._model="krea2"),Gt(t),a=!0));const i=xe(t);if(r&&r.id==="card_video"&&o.kind==="video"&&!Qe(t)&&!(i&&i.inputs.some(f=>f.type==="video"))){const f=r.modes.find(p=>jo(p,"video"));f&&(Un(l.edges.filter(p=>p.to===t.id&&!et(p))),t.assets={},t.cap=jt(f),Gt(t),a=!0)}const s=Uo(t,o.kind);s&&(Un(l.edges.filter(f=>f.to===t.id)),t.cap=s.cap,t.assets={},Gt(t));const c=s?{key:s.slot,label:Ve[o.kind]||"素材"}:Gs(t,o.kind);if(!c){const f=Jn(xe(t),o.kind);return ne(f&&vi(t,o.kind)>=f?`${Ve[o.kind]||o.kind}引用已达上限 ${f}`:`下游节点没有可接收的${Ve[o.kind]||o.kind}槽位`)}s||Un(l.edges.filter(f=>f.to===t.id&&bn(f).includes(c.key)));const u={from:e.id,to:t.id,slot:c.key,slots:ei(t,c.key,n)};l.edges.push(u),Wr(t),tt(),Ot();try{const f=it(t).length&&z(xe(t)).length,p=Jn(xe(t),o.kind);ne(`引用上游产物 → ${ln(c,t)}`+(p?`（上限 ${p}）`:"")+(f?"；上游的风格也跟着传下来了":""));for(let g=0;g<u.slots.length;g++){const h=n[g];if(!h)break;const x=xe(e)?.execution==="browser"&&h.ref?.startsWith("chouka/"),w=ft(e)||x?JSON.parse(JSON.stringify(h)):await ya(h,xe(t)?.execution==="browser");if(!l||!l.edges.includes(u))return;t.assets[u.slots[g]]=w}Bn(t),Mt(t),tt(),(a||ie===t.id)&&Se(t.id),K()}catch(f){l?.edges.includes(u)&&(Un([u]),Wr(t),tt(),Ot(),ie===t.id&&Se(t.id)),K(),Ie("引用失败："+f.message)}}function jo(e,t){if(e.route)return!!e.route[t];const n=F[jt(e)];return!!n&&n.inputs.some(o=>o.type===t)}async function Zs(e,t,n,o){if(!De())return;const r=[["card_text","文本"],["card_image","图片"],["card_video","视频"],["card_tools","工具箱"]],a=(e.outputs||[]).length,i=(e.outputs||[])[0]?.kind||(xe(e)||Et(e)||{}).outputType;console.log("[spawnDownstream] 上游产物:",{outputCount:a,outputKind:i,fromId:e.id});const s=g=>{const h=[];for(const[x,w]of r){const y=A.find(Y=>Y.id===x);if(!y||!y.modes.length)continue;let M=null;a>1&&i&&(M=y.modes.find(Y=>{if(!g(Y))return!1;const Ke=jt(Y),mt=F[Ke];if(!mt)return!1;const Ge=mt.images||0,Re=mt.videos||0,xt=mt.audios||0;return console.log("[spawnDownstream] 检查模式:",{mode:Y,capId:Ke,imgCount:Ge,vidCount:Re,audCount:xt,outputCount:a,outputKind:i}),i==="image"&&Ge===a?(console.log("[spawnDownstream] ✓ 找到匹配的图片模式:",Ke),!0):i==="video"&&Re===a?(console.log("[spawnDownstream] ✓ 找到匹配的视频模式:",Ke),!0):i==="audio"&&xt===a?(console.log("[spawnDownstream] ✓ 找到匹配的音频模式:",Ke),!0):!1})),M||(M=y.modes.find(g)),M&&h.push({icon:y.icon,text:w,run:async()=>{const Y=xn(y.id,t.x,t.y-40,jt(M));Y&&(ut(e)?await xa(e,Y):await ki(e,Y))}})}return h};if(ut(e)){const g=A.find(x=>x.id==="card_text"),h=[];return g&&g.modes.length&&h.push({icon:g.icon,text:"文本节点（接住这段字当输入）",run:async()=>{const x=xn(g.id,t.x,t.y-40,jt(g.modes[0]));x&&await xa(e,x)}}),h.push(...s(x=>z(F[jt(x)]).length)),h.length?Nt(n,o,"把这段文本接给…",h):void 0}if(ft(e)){const g=gn(e);if(!g)return ne("这个素材节点还是空的：先点它选个文件");const h=s(w=>jo(w,g.kind)),x=Ve[g.kind]||g.kind;return h.length?Nt(n,o,`把这个${x}接给…`,h):ne(`没有节点收${x}素材`)}const c=(e.outputs||[])[0],u=c?c.kind:(xe(e)||Et(e)||{}).outputType;if(!u)return;const f=s(g=>jo(g,u)),p=Ve[u]||u;if(!f.length)return ne(`没有节点收${p}素材`);Nt(n,o,`把这个${p}接给…`,f)}async function ya(e,t=!1){const n=l;if(!be())throw new Error("此画布只读，不能导入素材");const o=await we(new Ee(e.url,location.href),{credentials:"same-origin"});if(!o.ok)throw new Error(`读取产物失败（${o.status}）`);const r=await o.blob();if(l!==n||!be())throw new Error("画布已切换或权限已变化，导入已取消");const a=e.filename||new Ee(e.url,location.href).pathname.split("/").pop()||"历史产物",i=new File([r],a.split(/[\\/]/).pop(),{type:r.type});return It(i,t)}const ar=new Map;function Qs(e,t){if(t?.aborted)return Promise.reject(t.reason);const n=/^\/api\/upload\/([^/?#]+)$/.exec(e);if(!n)return Promise.resolve(e);if(!ar.has(e)){const a={controller:new AbortController,users:new Set,ready:!1};a.promise=(async()=>{const i=a.controller.signal;for(;;){i.throwIfAborted();const s=await kt(`/api/preview/${n[1]}`,{signal:i});if(i.throwIfAborted(),s.status==="ready")return a.ready=!0,s.url;if(s.status==="error")throw new Error(s.error);await new Promise((c,u)=>{const f=()=>{re(p),u(i.reason)},p=ee(()=>{i.removeEventListener("abort",f),c()},1500);i.addEventListener("abort",f,{once:!0})})}})(),ar.set(e,a),a.promise.catch(()=>{ar.get(e)===a&&ar.delete(e)})}const o=ar.get(e),r={};return o.users.add(r),new Promise((a,i)=>{const s=()=>{t?.removeEventListener("abort",c),o.users.delete(r),!o.ready&&!o.users.size&&(ar.get(e)===o&&ar.delete(e),o.controller.abort())},c=()=>{s(),i(t.reason)};t?.addEventListener("abort",c,{once:!0}),o.promise.then(u=>{s(),a(u)},u=>{s(),i(u)})})}function Zr(e,t,n=()=>!0,o){if(e.playsInline=!0,!/^\/api\/upload\//.test(t)){e.src=t;return}e.dataset.previewOriginal=t;const r=e.getAttribute("poster"),a=e.title;let i;const s=(c,u)=>{e.dataset.previewState=c?"error":"processing",e.title=u;const f=c?["视频转码失败","修复转码后才能生成"]:["正在转码为 MP4","完成后可预览和生成"];e.poster=i="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#111318"/><g fill="#d1d5db" text-anchor="middle" font-family="sans-serif" font-size="25"><text x="320" y="168">${f[0]}</text><text x="320" y="208" font-size="19">${f[1]}</text></g></svg>`)};return s(!1,"服务器正在生成兼容 MP4；原片已备份，转码完成后下游节点使用 MP4 生成。"),Qs(t,o).then(c=>{e.dataset.previewOriginal!==t||!n()||(e.dataset.previewState="ready",e.title=a||"MP4 转码已完成，预览和后续生成均使用此版本；原片已备份。",e.getAttribute("poster")===i&&(r?e.poster=r:e.removeAttribute("poster")),e.src=c)}).catch(c=>{o?.aborted||e.dataset.previewOriginal!==t||!n()||(s(!0,c.message||"转码状态加载失败；请检查服务器后重试生成。"),e.removeAttribute("src"),e.load())})}function Ci(e){e.querySelectorAll("video[data-video-url]").forEach(t=>{Zr(t,t.dataset.videoUrl)})}const _n=new Map;let Nr=null,No=null,Qr=null,wa=0,eo=null;function va(){!_n.size||eo!==null||(eo=Ne(()=>{eo=null,Ca()}))}G.addEventListener("resize",va);function _i(e){return/^\/api\/(upload|artifact)\//.test(e)?`/api/thumbnail?url=${encodeURIComponent(e)}`:null}function Ei(e,t){t.controller?.abort(),t.blob&&Ee.revokeObjectURL(t.blob),ir(e),e.tagName==="VIDEO"&&(e.pause(),e.removeAttribute("src"),e.load()),Nr?.unobserve(e),Qr?.unobserve(e),_n.delete(e)}function ka(){for(const[e,t]of _n)Ei(e,t);Nr?.disconnect(),No?.disconnect(),Qr?.disconnect(),Nr=null,No=null,Qr=null,rt(eo),eo=null}function Ca(){const e=m.stage.getBoundingClientRect(),t=G.devicePixelRatio||1;for(const[n,o]of _n){if(!o.visible||!n.isConnected||o.project!==l||!k.active)continue;const r=n.getBoundingClientRect();if(r.right<=e.left-120||r.left>=e.right+120||r.bottom<=e.top-120||r.top>=e.bottom+120){o.controller?.abort();continue}if(o.fullURL&&!o.original&&Math.max(r.width,r.height)*t>512&&(o.url=o.fullURL,o.original=!0,o.done=!1,o.controller?.abort()),o.loading||o.done||wa>=4)continue;const a=new AbortController;o.controller=a,o.loading=!0,wa++,(async()=>{try{const i=await we(o.url,{credentials:"same-origin",signal:a.signal});if(a.signal.aborted||_n.get(n)!==o||o.project!==l||!k.active)return;if(!i.ok)throw i.status===401&&await k.me(),[403,404].includes(i.status)&&G.dispatchEvent(new CustomEvent("h3auth:denied",{detail:{path:"/api/thumbnail",method:"GET",error:{status:i.status}}})),new Error(`预览加载失败（${i.status}）；可双击查看原文件`);const s=await i.blob();if(a.signal.aborted||_n.get(n)!==o||!n.isConnected||o.project!==l||!k.active)return;const c=o.blob;o.blob=Ee.createObjectURL(s),n.tagName==="VIDEO"?n.poster=o.blob:n.src=o.blob,c&&Ee.revokeObjectURL(c),o.done=!0}catch(i){!a.signal.aborted&&_n.get(n)===o&&(o.done=!0,n.title=i.message)}finally{o.loading=!1,o.controller=null,wa--,Ca()}})()}}function el(e,t){const n=_i(t);e.tagName==="VIDEO"?(e.dataset.videoUrl=t,e.preload="none",e.title="单击播放；双击放大查看原视频",e.poster="data:image/svg+xml;charset=utf-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="288"><rect width="512" height="288" fill="#111318"/><path d="M238 121v46l40-23z" fill="#b7bbc3"/></svg>')):(e.decoding="async",n&&(e.dataset.thumbnail="true")),Nr||(Nr=new oe(o=>{for(const r of o){const a=_n.get(r.target);a&&(a.visible=r.isIntersecting,!a.visible&&a.loading&&a.controller?.abort())}Ca()},{root:m.stage,rootMargin:"120px"}),No=new Z(()=>{for(const[o,r]of _n)o.isConnected||Ei(o,r)}),No.observe(m.world,{childList:!0,subtree:!0}),Qr=new ze(va)),_n.set(e,{url:n||t,fullURL:n?e.tagName==="VIDEO"?`${n}&size=original`:t:null,original:!1,project:l,visible:!1,loading:!1,done:e.tagName==="VIDEO"&&!n}),Nr.observe(e),Qr.observe(e)}function tl(e,t,n){for(const r of e.querySelectorAll("img, video")){const a=r.classList.contains("old")?n:t[+(r.dataset.i||0)]?.url;a&&el(r,a)}const o=e.querySelector("audio");o&&(o.src=t[0].url)}function ir(e){e._playRequest&&e.pause(),e._playRequest=null,e._previewController?.abort(),e._previewController=null}async function nl(e){if(!e.isConnected||!k.active)return;for(const r of d.querySelectorAll("video"))ir(r);const t=l,n={},o=new AbortController;e._playRequest=n,e._previewController=o;try{if(e.getAttribute("src")||(e.preload="metadata",await Zr(e,e.dataset.videoUrl,()=>e._playRequest===n&&e.isConnected&&l===t&&k.active,o.signal)),e._playRequest!==n||!e.isConnected||l!==t||!k.active||e.dataset.previewState==="error")return;await e.play()}catch(r){!o.signal.aborted&&e._playRequest===n&&e.isConnected&&l===t&&(e.title=r.message||"视频暂时无法播放")}finally{e._previewController===o&&(e._previewController=null)}}function to(e){Vr(null,0,[{url:e.url,kind:e.kind,filename:(e.origin||e.url).split(/[\\/]/).pop()}],null)}const Si=20;function Mr(e,t){const n=e.outputs||[],o=Qe(e);if(!n.length&&!o)return;e.history=e.history||[];const r=e.history.find(a=>a.job===t.id);if(r){o&&Object.assign(r,{status:e.status,ms:e.ms??null,outputs:n});return}e.history.unshift({ts:Date.now(),job:t.id,seed:e.seed!=null?e.seed:null,cap:t.capability,ms:e.ms!=null?e.ms:null,outputs:n,...o?{status:e.status}:{},...t.prompts?{prompts:t.prompts.map(a=>({...a}))}:{}}),e.history.length>Si&&(e.history.length=Si)}function Mo(e){e.history||(e.history=(e.outputs||[]).length?[{ts:null,seed:e.seed!=null?e.seed:null,cap:e.cap,outputs:e.outputs}]:[])}function sr(e){if(!(e>0))return"";const t=Math.round(e/1e3);if(t<60)return`${t}秒`;const n=Math.floor(t/60);return n<60?`${n}分${t%60}秒`:`${Math.floor(n/60)}时${n%60}分`}function _a(e){if(!e)return"早前";const t=new Date(e),n=a=>String(a).padStart(2,"0"),o=new Date;o.setHours(0,0,0,0);const r=`${n(t.getHours())}:${n(t.getMinutes())}`;return e>=o.getTime()?r:`${n(t.getMonth()+1)}-${n(t.getDate())} ${r}`}function Xn(){m.hist.style.display="none",m.hist.innerHTML="",m.hist._id=null}function $i(e){return Math.max(240,Math.min(e,Math.min(720,innerWidth*.65)))}function rl(){if(!m.hist||m.hist.style.display==="none")return;const e=m.hist.getBoundingClientRect().width,t=$i(e);t!==e&&m.hist.style.setProperty("--hist-width",`${t}px`)}function ol(e){const t=n=>{m.hist.style.setProperty("--hist-width",`${$i(n)}px`),bt(),Pt(),kn()};e.onpointerdown=n=>{if(n.button!==0)return;n.preventDefault();const o=n.clientX,r=m.hist.getBoundingClientRect().width;m.hist.classList.add("resizing"),e.setPointerCapture(n.pointerId),e.onpointermove=a=>t(r+o-a.clientX),e.onpointerup=e.onpointercancel=()=>{m.hist.classList.remove("resizing"),e.onpointermove=e.onpointerup=e.onpointercancel=null}},e.onkeydown=n=>{if(n.key!=="ArrowLeft"&&n.key!=="ArrowRight")return;n.preventDefault();const o=n.shiftKey?40:16;t(m.hist.getBoundingClientRect().width+(n.key==="ArrowLeft"?o:-o))}}function zr(e){const t=l&&l.cards.find(a=>a.id===e);if(!t||ut(t))return Xn();Mo(t);const n=d.createElement("div");n.className="hlist",xe(t);const o=d.createElement("button");o.className="hresize",o.type="button",o.title="左右拖动调整历史产物栏宽度",o.setAttribute("aria-label","调整历史产物栏宽度"),ol(o);const r=d.createElement("div");if(r.className="hhd",r.innerHTML='<b>历史产物</b><span class="n"></span><button class="x" title="收起">✕</button>',r.querySelector(".n").textContent=t.history.length?`${t.history.length} 轮`:"",r.querySelector(".x").onclick=Xn,!t.history.length){const a=d.createElement("div");a.className="hempty",a.textContent=`这个节点还没出过东西。
运行一次，每一轮的产物和 seed 都会留在这里。`,a.style.whiteSpace="pre-line",n.appendChild(a)}for(const[a,i]of t.history.entries())n.appendChild(al(t,i,a===0));m.hist.innerHTML="",m.hist.append(o,r,n),m.hist._id=e,m.hist.style.display=""}async function zo(e,t){const n=String(e);try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(n);else{const o=d.activeElement,r=d.createElement("textarea");r.value=n,r.style.cssText="position:fixed;top:0;left:0;opacity:0;pointer-events:none",d.body.appendChild(r);try{if(r.focus(),r.select(),!d.execCommand("copy"))throw new Error("复制失败")}finally{r.remove(),o?.focus({preventScroll:!0})}}ne(t)}catch{Ie("复制失败，请展开后手动选中文字复制")}}const Ea="application/x-chouka-history-output";let no=null;function al(e,t,n){const o=t.outputs||[],r=d.createElement("div");r.className="hrun"+(n?" cur":"");const a=d.createElement("div");a.className="rh";const i=F[t.cap]&&F[t.cap].name||"";a.innerHTML='<span class="tag"></span><span class="nm"></span><span class="cnt"></span>',a.querySelector(".tag").textContent=n?"最新":_a(t.ts),a.querySelector(".nm").textContent=n?_a(t.ts):i,a.querySelector(".cnt").textContent=[t.status==="running"?"生成中":t.status==="error"?"失败":o.length>1?`${o.length} 张`:"",sr(t.ms)].filter(Boolean).join(" · "),a.title=i;const s=d.createElement("div");s.className="rg"+(o.length===1?" one":""),s.style.setProperty("--hcols",o.length===1?1:o.length<=4?2:3),s.innerHTML=o.map((p,g)=>p.kind==="video"?`<video data-video-url="${p.url}" data-i="${g}" muted loop preload="metadata" draggable="false"></video>`:p.kind==="audio"?`<div class="rg-a" data-i="${g}" title="${p.filename}">🎵</div>`:`<img src="${p.url}" data-i="${g}" alt="" draggable="false">`).join(""),Ci(s);for(const p of s.querySelectorAll("[data-i]"))p.draggable=!0,p.title="单击放大查看；拖到画布创建素材节点";let c=!1;s.ondragstart=p=>{const g=p.target.closest("[data-i]"),h=g&&o[+g.dataset.i];if(!be()||!h||!["image","video","audio"].includes(h.kind)){p.preventDefault();return}c=!0,no={token:Bt(),project:l,output:{...h}},p.dataTransfer.items.clear(),p.dataTransfer.effectAllowed="copy",p.dataTransfer.setData(Ea,no.token)},s.ondragend=()=>{no=null,ee(()=>{c=!1},0)},s.onclick=p=>{if(c)return;const g=p.target.closest("[data-i]");g&&Vr(e,+g.dataset.i,o,t.seed)},s.oncontextmenu=p=>{p.preventDefault(),p.stopPropagation();const g=p.target.closest("[data-i]");if(!g)return;const h=+g.dataset.i,x=o[h];if(!x)return;const w=[];w.push({icon:"⬇",text:`下载${x.kind==="video"?"视频":x.kind==="audio"?"音频":"图片"}`,run:()=>Kr(x)}),o.length>1&&w.push({icon:"⬇",text:`下载全部 ${o.length} 张${x.kind==="video"?"视频":x.kind==="audio"?"音频":"图片"}`,run:()=>o.forEach(y=>Kr(y))}),Nt(p.clientX,p.clientY,"历史记录",w)},r.append(a,s);const u=d.createElement("div");if(u.className="rs",u.innerHTML="<i>seed</i><span></span>",u.querySelector("span").textContent=t.seed!=null?String(t.seed):"未记录",t.seed!=null){const p=d.createElement("button");p.textContent="复制",p.title="复制 seed",p.onclick=()=>zo(t.seed,"已复制 seed "+t.seed),u.appendChild(p)}if(r.appendChild(u),t.user_prompt||t.negative_prompt){const p=d.createElement("details");p.className="rp";const g=d.createElement("summary");g.textContent="提示词";const h=d.createElement("div");if(t.user_prompt){const x=d.createElement("div");x.style.display="flex",x.style.justifyContent="space-between",x.style.alignItems="center",x.style.marginBottom="4px";const w=d.createElement("div");w.style.fontWeight="bold",w.textContent="正面提示词：";const y=d.createElement("button");y.textContent="复制",y.style.fontSize="12px",y.style.padding="2px 8px",y.onclick=()=>zo(t.user_prompt,"已复制正面提示词"),x.append(w,y);const M=d.createElement("div");M.style.marginBottom=t.negative_prompt?"8px":"0",M.textContent=t.user_prompt,h.append(x,M)}if(t.negative_prompt){const x=d.createElement("div");x.style.display="flex",x.style.justifyContent="space-between",x.style.alignItems="center",x.style.marginBottom="4px";const w=d.createElement("div");w.style.fontWeight="bold",w.textContent="负面提示词：";const y=d.createElement("button");y.textContent="复制",y.style.fontSize="12px",y.style.padding="2px 8px",y.onclick=()=>zo(t.negative_prompt,"已复制负面提示词"),x.append(w,y);const M=d.createElement("div");M.textContent=t.negative_prompt,h.append(x,M)}p.append(g,h),r.appendChild(p)}const f=t.prompts||(t.prompt!=null?[{label:"提示词",text:t.prompt}]:[]);for(const p of f){const g=d.createElement("details");g.className="rp";const h=d.createElement("div");h.className="history-prompt";const x=d.createElement("summary");x.textContent=p.key==="if_original"?"原始提示词":p.key==="if_submitted"?"提交给 IF CLI 的提示词":"当时提交的"+p.label;const w=d.createElement("button");w.textContent="复制",w.type="button",w.className="history-prompt-copy",w.title="复制"+x.textContent,w.onclick=()=>zo(p.text,"已复制"+p.label);const y=d.createElement("div");y.textContent=p.text||"（本次提交为空）",g.append(x,y),h.append(g,w),r.appendChild(h)}return r}async function il(e){if(!De())return;if(!on())return ne("请先复制示例画布，再保存图片合成");if(d.querySelector("dialog[data-image-composer][open]"))return;const t=l,n=()=>l===t&&on()&&at(e.id)===e&&e.cap==="image_composite",o=()=>{if(!n())throw new Error("画布、节点或权限已变化，请关闭编辑器后重新打开")},r=async(a,i)=>{o(),Ye.beginFlush();try{Zo(),e.params.composition=JSON.parse(JSON.stringify(a));for(const c of Object.keys(e.assets))c.startsWith("composite:")&&delete e.assets[c];for(const c of a.layers)e.assets[`composite:${c.id}`]={...c.asset};if(i){e.outputs=[i],e.status="done",e.progress=1,e.job=null,e.seed=null,e.ms=null,e.error=null,e.step="",Mr(e,{id:`local:${Bt()}`,capability:e.cap});for(const c of t.edges.filter(u=>u.from===e.id&&!et(u)&&!u.version)){const u=at(c.to);if(!u)continue;const f=bn(c);c.slots=f,f.forEach((p,g)=>{g===0?u.assets[p]={...i}:delete u.assets[p]}),Mt(u)}}xo(),Ye.cancelContentSave();const s=await ur(t.id);if(!s.ok)throw s.error||new Error("合成保存失败，请重试");o(),ot(e),tt(),m.panel._id===e.id&&Se(e.id),i&&m.hist._id===e.id&&zr(e.id)}finally{Ye.endFlush()}};try{if(e._create&&await e._create,o(),!G.ChoukaImageComposer)throw new Error("图片合成组件未加载，请强制刷新页面");const a=new Map,i=(c,u)=>{c?.kind!=="image"||!c.url||a.has(c.url)||a.set(c.url,{...c,name:u||c.origin||c.filename||"图片"})};for(const c of Object.values(e.assets||{}))i(c,c?.origin);for(const c of t.cards)if(c!==e){for(const u of Object.values(c.assets||{}))i(u,`${he(c)} · ${u?.origin||"素材"}`);for(const u of c.outputs||[])i(u,`${he(c)} · 产物`);for(const u of c.history||[])for(const f of u.outputs||[])i(f,`${he(c)} · 历史产物`)}const s=(xe(e)?.inputs||[]).filter(c=>c.type==="image").map(c=>e.assets[c.key]).filter(c=>c?.kind==="image"&&c.url);await G.ChoukaImageComposer.open({state:e.params.composition?JSON.parse(JSON.stringify(e.params.composition)):null,linkedSources:s,sources:[...a.values()],canEdit:n,upload:async c=>{o();const u=await It(c,!0);return o(),u},onSave:c=>r(c),onExport:async(c,u)=>{o();const f=await It(new File([c],`composition_${Date.now()}.png`,{type:"image/png"}),!0);o(),await r(u,{...f,filename:f.origin}),ne("图片合成已保存，可从输出端口连接下游节点")}})}catch(a){Ie("图片合成："+a.message)}}function rn(){m.panel.style.display="none",m.panel._id=null,Xn()}function ji(e){m.panel.style.display!=="none"&&(m.panel.style.visibility=e?"hidden":"")}function bt(){if(m.panel.style.display==="none")return;if(_){m.panel.style.left="0px",m.panel.style.top="0px",m.panel.style.maxHeight="100%",m.panel.style.visibility="";return}const e=l&&l.cards.find(Y=>Y.id===m.panel._id);if(!e||!e._el)return rn();const t=8,n=e.x,o=e.y,r=e._el.offsetWidth,a=e._el.offsetHeight,i=n*j.k+j.x,s=o*j.k+j.y,c=r*j.k,u=a*j.k,f=m.stage.getBoundingClientRect(),p=i+c,g=s+u;if(!(p>0&&i<f.width&&g>0&&s<f.height)){m.panel.style.visibility="hidden";return}m.panel.style.visibility="";const x=52;m.panel.style.maxHeight=innerHeight-x-t+"px";const w=m.panel.offsetWidth;m.panel.offsetHeight;const y=i+c/2-w/2,M=s+u+t;m.panel.style.left=y+"px",m.panel.style.top=M+"px"}function Se(e){if(_&&e!==ce)return;if(_&&qt)return Cr();if(!be()){const O=at(e);if(!O)return;m.panel.replaceChildren(),m.panel._id=e,m.panel.style.display="";const le=d.createElement("strong");le.textContent="只读 · "+he(O);const te=d.createElement("pre");te.textContent=JSON.stringify(O.params||{},null,2),m.panel.append(le,te),bt();return}const t=l.cards.find(O=>O.id===e);if(!t)return rn();const n=Et(t),o=xe(t);Qe(t)&&!lo&&Ln().catch(()=>{});const r=m.panel.querySelector(".pbody"),a=r&&m.panel._id===e?r.scrollTop:0;if(m.panel._id=e,m.panel.innerHTML="",m.panel.style.display="",m.panel.style.visibility="",gt(t))return sl(t);if(Ut(t))return dl(t);if(ft(t))return ll(t);const i=["card_image","card_video","card_tools"].includes(n.id)&&n.modes.length>1;if(n.modes.length>1&&!i){const O=d.createElement("div");O.className="modes";for(const le of n.modes){const te=d.createElement("button");te.className=Nn(le,t.cap)?"on":"",te.textContent=le.name,mo(te,()=>fo(t,le,le.name)),te.onclick=()=>{Jt(),t.cap=jt(le,an(t)),Se(e),Gt(t),K()},O.appendChild(te)}m.panel.appendChild(O)}if(!o)return m.panel.appendChild(Lo("能力不可用")),bt();const s=o.id==="image_composite"&&o.execution==="browser",c=Qe(t)?o:F[Wt(t)];let u=c&&c!==o?o.inputs.map(O=>{const le=c.inputs.find(te=>te.key===O.key);return le&&le.default!==O.default?{...O,default:le.default}:O}):o.inputs;const f=ct(t);if(f&&f.entry){const O=u.findIndex(le=>Ct.includes(le.type));O>=0&&!t.assets[u[O].key]&&(u=u.slice(),u[O]={...u[O],label:f.entry.label})}const p=d.createElement("div");p.className="pbody",m.panel.appendChild(p);const g=d.createElement("div");if(g.className="knobnote clipboard-media-hint",g.textContent="Ctrl / Cmd + V：粘贴截图或图片 / 视频文件，自动创建素材节点并引用到空槽；不覆盖已有引用。复制文件需浏览器提供文件数据，仅路径文字无法导入。",Qe(t)&&(g.textContent=Gn?`本机 IF 不可用：${Gn}。请先安装并登录 IF CLI、启动本机桥接，点模型按钮可重试。`:"IF 使用本机账号；支持按模型数量连接多份引用。引用素材各上传一次，返回的 URL 按「图片1」「视频1」写入提示词，与生成需求一次提交；模型由 CLI 参数指定，随后轮询并保存产物。图片超过 10 MB 时优先转无损 WebP，仍超限再压缩；视频超过 50 MB 时自动转码。仅处理上传副本，原素材不变；本机上传合计不超过 100 MB，音频暂不支持。"),p.appendChild(g),Qe(t)){const O=fn.filter(ge=>ge.type===o.outputType),le=t.params.if_model||O[0]?.display_name,te=Bo(le,o.outputType),me=d.createElement("div");if(me.className="knobnote",me.textContent=`${te.reference_fallback?"画布兜底引用上限（不代表官方支持）":"画布引用上限"}：图片 ${te.bridge.image} · 视频 ${te.bridge.video}。${te.note} 全部引用上传后的 URL 按「图片1」「视频1」与生成需求一次提交，再轮询产物；是否采用全部引用以 IF 实际返回为准，音频暂不可提交。画面比例、清晰度、时长等参数作为生成内容要求发送，模型不保证严格遵守。`,Object.values(t.assets||{}).some(ge=>ge&&Ct.includes(ge.kind)&&!te?.bridge?.[ge.kind])&&(me.textContent+=" 已连接的引用保持原样，但不适用于当前模型；可切回原模型或手动移除，运行时不会忽略它。"),p.appendChild(me),te?.source){const ge=d.createElement("a");ge.href=te.source,ge.target="_blank",ge.rel="noopener noreferrer",ge.textContent="供应商 API 参考文档（不作为 IF 引用上限）",p.appendChild(ge)}}if(s){g.textContent="浏览器本地合成，不占 GPU。已连接的图片打开编辑器时自动加入图层，也可上传图片或从画布素材中选择添加。拖动位置、缩放图片，在图层列表调整遮挡顺序。";const O=d.createElement("div");O.className="knobnote";const le=t.params.composition;O.textContent=le?`编辑稿：${le.width} × ${le.height} · ${le.layers.length} 个图层。保存编辑可继续修改；合成输出后可连接下游。`:"尚未创建编辑稿。点击下方「编辑合成」开始，默认画布 1920 × 1080，可修改尺寸和背景。",p.appendChild(O)}if(_){const O=ja(t);if(O.length){const le=d.createElement("div");le.className="director-supplement",le.textContent=`导演补充（只读，提交时追加到提示词）
`+O.join(`
`),p.appendChild(le)}}const h=u.filter(O=>Ct.includes(O.type));if(h.length)if(s){const O=d.createElement("details");O.open=!0;const le=d.createElement("summary");le.textContent="连接图片素材（打开编辑器时自动加入图层）",O.append(le,Li(t,h,f)),p.appendChild(O)}else p.appendChild(Li(t,h,f));if(t.cap==="if_image"){const O=u.find(le=>le.key==="if_reference");O&&p.appendChild(To(t,O))}const x=new Set;for(const O of h.filter(le=>(t.assets||{})[le.key])){const le=u.filter(te=>te.rangeOf===O.key);if(le.length===2){p.appendChild(_l(t,O,le[0],le[1]));for(const te of le)x.add(te.key)}}const w=u.filter(O=>O.type==="textarea"&&!O.advanced),y=w.filter(O=>O.template),M=w.filter(O=>!O.template),Y=M.filter(O=>O.pairWith&&u.some(le=>le.key===O.pairWith));Y.length>1&&p.appendChild(ul(t,Y));for(const O of M)(!Y.includes(O)||Y.length<2)&&p.appendChild(Mi(t,O));for(const O of y)p.appendChild(wl(t,O));const Ke=u.filter(O=>!Ct.includes(O.type)&&O.type!=="textarea"&&(O.type==="seed"||!O.advanced)&&!O.mirror&&!x.has(O.key)),mt=(O,le)=>{if(O.appendChild(To(t,le)),le.hint&&!le.showHint){const te=d.createElement("div");te.className="knobnote",te.textContent=le.hint,O.appendChild(te)}},Ge=d.createElement("div");Ge.className="pwrap";for(const O of Ke)i||mt(Ge,O);p.appendChild(Ge),t.error&&p.appendChild(Lo(t.error));const Re=gr(t);Re&&p.appendChild(Re);const xt=br(t);xt&&p.appendChild(xt);const zt=d.createElement("div");if(zt.className="foot",i){const O=n.id==="card_video"?"生视频模式":n.id==="card_tools"?"工具箱模式":"生图模式",le=ct(t)||n.modes[0],te=Xr(`${n.icon} ${le.name}`,O,()=>{const me=ge=>({icon:n.icon,text:ge.name+(Nn(ge,t.cap)?"（当前）":""),tip:()=>fo(t,ge,ge.name),run:()=>{if(Qe(t)&&["queued","running"].includes(t.status))return ne("请等待本机 IF 任务结束后再切换模式");Jt(),Pn(),tr(t,jt(ge,an(t))),Se(e),Gt(t),K()}});return n.id==="card_video"||n.id==="card_image"?[{group:"本地 API"},...n.modes.filter(ge=>ge.id!=="if_video"&&ge.id!=="if_image").map(me),{group:"云端 API"},...n.modes.filter(ge=>ge.id==="if_video"||ge.id==="if_image").map(me)]:n.modes.map(me)});if(mo(te,()=>fo(t,le,le.name)),zt.appendChild(te),le.modelSwitch){const me=an(t),ge=Ae=>Kn[Ae]||Ae,Ze=Xr(ge(me)||o.name,n.id==="card_image"?"生图模型":"深度视频模型",()=>Object.entries(le.modelSwitch).map(([Ae,W])=>({text:ge(Ae)+(W===t.cap?"（当前）":""),run:()=>{Jt(),Pn(),tr(t,W),t._model=Ae,Se(e),Gt(t),K()}})));zt.appendChild(Ze)}else if(Qe(t)){const me=fn.filter(Ae=>Ae.type===o.outputType),ge=me.find(Ae=>Ae.display_name===t.params.if_model)?.display_name||me[0]?.display_name,Ze=Xr(ge||"选择 IF 模型","IF 模型",()=>fn.some(Ae=>Ae.type===o.outputType)?fn.filter(Ae=>Ae.type===o.outputType).map(Ae=>({text:Ae.display_name+(Ae.display_name===ge?"（当前）":"")+" · "+zn(Ae),disabled:["exhausted","unavailable"].includes(Ae.quota_status),run:()=>{Pn(),t.params.if_model=Ae.display_name;const W=t._referenceParameters,ae=W&&t.params.duration===W.before.duration;Ho(t),ae&&(W.before.duration=t.params.duration),Se(e),K()}})):[{text:Gn?"重试连接本机 IF":"正在读取本机 IF 模型…",run:()=>Ln().catch(Ae=>Ie(Ae.message))}]);Ze._openIFModels=Ze.onclick,Ze.onclick=async Ae=>{Ae.stopPropagation(),Cn();const W=Co;Ze.disabled=!0,Ze.firstChild.textContent="读取剩余次数…";try{await Ln(!1),Co===W&&m.panel._id===e&&l?.cards.includes(t)&&m.panel.querySelector('button[title="IF 模型 —— 点击换"]')?._openIFModels(Ae)}catch(ae){Ie("读取 IF 剩余次数失败："+ae.message)}finally{Ze.disabled=!1,Ze.firstChild.textContent=ge||"选择 IF 模型"}},zt.appendChild(Ze)}if(!s){const me=d.createElement("button");me.className="tcap";const ge=Yo(t,o);me.textContent=ge?`⚙ ${ge}`:"⚙ 参数",me.title=Qe(t)?"点开弹窗：比例、清晰度、时长等以内容发送":"点开弹窗：清晰度、画面比例、时长等参数",me.onclick=Ze=>{Ze.stopPropagation(),ds(t,me)},zt.appendChild(me)}}const yt=t.status==="queued"||t.status==="running",Lt=d.createElement("span");if(Lt.style.cssText="color:#8a8a94;font-size:12px",Lt.textContent=s?"本地合成 · 输出 PNG":o.outputType==="video"?"输出：视频":"输出：图片",t.status==="done"&&t.ms>0&&(Lt.textContent+=` · 上次 ${sr(t.ms)}`),zt.appendChild(Lt),yt&&t.job&&!Qe(t)){const O=d.createElement("button");O.className="cancel",O.textContent="取消",O.onclick=()=>Nl(t),O.style.marginLeft="auto",zt.appendChild(O)}const ke=d.createElement("button");ke.className="go",ke.textContent=s?"编辑合成":"↑",ke.title=s?"打开图片合成编辑器（不使用 ComfyUI）":"运行",s&&(ke.style.cssText="width:auto;min-width:96px;padding:0 14px;border-radius:8px;font-size:13px;flex-shrink:0"),ke.disabled=yt,ke.onclick=()=>Oo(t),zt.appendChild(ke),m.panel.appendChild(zt),bt(),p.scrollTop=a,Aa(t),Bn(t)}function Lo(e){const t=d.createElement("div");return t.className="err",t.textContent=e,t}function sl(e){const t=d.createElement("div");t.className="pbody",m.panel.appendChild(t);const n=d.createElement("div");n.className="pblock";const o=d.createElement("div");o.className="phd";const r=d.createElement("span");r.textContent="风格描述";const a=d.createElement("span");a.className="demo";const i=d.createElement("button");i.textContent="清空",o.append(r,a,i);const s=d.createElement("textarea");s.placeholder="例：蒂姆·波顿式哥特暗黑定格动画质感，冷青灰色调，强侧光硬阴影，胶片颗粒，浅景深，电影级构图",s.value=String((e.params||{}).style||""),s.style.minHeight="120px";const c=()=>{const x=s.value.trim();a.style.display=x?"none":"",a.textContent="⚠ 还没写，挂着也不起作用"},u=()=>{e.params=e.params||{},e.params.style=s.value,c(),ot(e),K()};s.oninput=u,i.onclick=()=>{s.value="",u(),s.focus()},c(),n.append(o,s),t.appendChild(n);const f=l.edges.filter(x=>x.from===e.id&&et(x)),p=d.createElement("div");p.className="slinks";const g=d.createElement("div");if(g.className="atitle",g.textContent=f.length?`挂着 ${f.length} 个节点`:"还没挂给任何节点",p.appendChild(g),!f.length){const x=d.createElement("div");x.className="anote",x.textContent="把右边那颗点拖到一张生图/生视频节点上；拖到空白处会列出所有写提示词的玩法。",p.appendChild(x)}for(const x of f){const w=l.cards.find(Ke=>Ke.id===x.to);if(!w)continue;const y=d.createElement("div");y.className="slink";const M=d.createElement("button");M.className="nm",M.textContent=he(w),M.title="选中这个节点（面板上能看到合并后的提示词）",M.onclick=()=>At(w.id);const Y=d.createElement("button");Y.className="off",Y.textContent="解除",Y.title="这个节点不再套用本风格",Y.onclick=()=>Jr(x),y.append(M,Y),p.appendChild(y)}const h=Oe(e);if(h.length){const x=d.createElement("div");x.className="atitle",x.textContent=`顺着连线连带 ${h.length} 张`,p.appendChild(x);for(const w of h){const y=d.createElement("div");y.className="slink down";const M=d.createElement("button");M.className="nm",M.textContent=he(w),M.title="选中这个节点（面板上能看到合并后的提示词）",M.onclick=()=>At(w.id);const Y=d.createElement("span");Y.className="off ro",Y.textContent="继承",Y.title="上游那个节点传下来的，要断就断它们之间那根产物连线",y.append(M,Y),p.appendChild(y)}}t.appendChild(p),bt()}function ll(e){const t=d.createElement("div");t.className="pbody",m.panel.appendChild(t);const n=gn(e),o=d.createElement("div");o.className="pblock";const r=d.createElement("div");r.className="phd";const a=d.createElement("span");a.textContent="手里的素材";const i=d.createElement("span");i.className="demo",r.append(a,i),o.appendChild(r);const s=d.createElement("div");s.className="prow";const c=d.createElement("button");if(c.textContent=n?"换一个文件":"选择文件",c.onclick=()=>Io(e),s.appendChild(c),n){const h=d.createElement("button");h.textContent="查看大图",h.onclick=()=>to(n),s.appendChild(h)}const u=d.createElement("button");u.textContent="清空",u.title="把这份素材扔掉，节点变回空（不会删文件本身）",u.onclick=()=>{e.outputs=[];for(const h of l.edges.filter(x=>x.from===e.id&&!et(x)))ra(h);ot(e),Mt(e),Se(e.id),K()},s.appendChild(u),i.textContent=n?(n.origin||n.filename||n.url||"").split(/[\\/]/).pop():"还没有文件",i.title=n&&(n.origin||n.filename||n.url)||"",o.appendChild(s),t.appendChild(o);const f=l.edges.filter(h=>h.from===e.id),p=d.createElement("div");p.className="slinks";const g=d.createElement("div");if(g.className="atitle",g.textContent=f.length?`喂给 ${f.length} 个节点`:"还没喂给任何节点",p.appendChild(g),!f.length){const h=d.createElement("div");h.className="anote",h.textContent=n?"把右边那颗点拖到一个节点上，这份素材就进它的格子。":"先在上面选一个文件，再把出口拖到别的节点上。",p.appendChild(h)}for(const h of f){const x=l.cards.find(Y=>Y.id===h.to);if(!x)continue;const w=d.createElement("div");w.className="slink";const y=d.createElement("button");y.className="nm",y.textContent=he(x),y.title="选中这个节点",y.onclick=()=>At(x.id);const M=d.createElement("button");M.className="off",M.textContent="解除",M.title="这个节点不再收这份素材",M.onclick=()=>Jr(h),w.append(y,M),p.appendChild(w)}t.appendChild(p),bt()}const Ni=[["polish","润色","改得更通顺好读，不加料不改意思"],["optimize","优化","删废话、换具体说法，更精炼有表现力"],["expand","扩写","补细节补过渡，写到 2~3 倍长"],["custom","自定义","按下面写的指令处理文字"]];function dl(e){const t=d.createElement("div");t.className="pbody",m.panel.appendChild(t);const n=e.status==="running";e.params=e.params||{};const o=d.createElement("div");o.className="pblock";const r=d.createElement("div");r.className="phd",r.innerHTML="<span>内容</span>";const a=d.createElement("textarea");if(a.placeholder="在这里写字或直接在节点上写",a.value=String(e.params.text||""),a.disabled=n,a.oninput=()=>{e.params.text=a.value;const h=e._el?e._el.querySelector(".body"):null,x=h?h.querySelector("textarea.ttxt"):null;x&&(x.value=a.value),na(e),K()},o.append(r,a),t.appendChild(o),e.params.op==="custom"){const h=d.createElement("div");h.className="pblock";const x=d.createElement("div");x.className="phd",x.innerHTML="<span>指令</span>";const w=d.createElement("textarea");w.placeholder="例：把接进来的几段整理成一条朋友圈文案，口语一点，带两个 emoji",w.value=String(e.params.instr||""),w.oninput=()=>{e.params.instr=w.value,K()},h.append(x,w),t.appendChild(h)}const i=l.edges.filter(h=>h.from===e.id&&et(h)),s=d.createElement("div");s.className="slinks";const c=d.createElement("div");if(c.className="atitle",c.textContent=i.length?`连着 ${i.length} 个节点`:"还没连给任何节点",s.appendChild(c),!i.length){const h=d.createElement("div");h.className="anote",h.textContent="把右边那颗点拖到生成节点（并进提示词）或别的文本节点（当输入）上；拖到空白处会列出所有能接的地方。",s.appendChild(h)}for(const h of i){const x=l.cards.find(Y=>Y.id===h.to);if(!x)continue;const w=d.createElement("div");w.className="slink";const y=d.createElement("button");y.className="nm",y.textContent=he(x),y.title="选中这个节点",y.onclick=()=>At(x.id);const M=d.createElement("button");M.className="off",M.textContent="解除",M.title="这个节点不再用这段文本",M.onclick=()=>Jr(h),w.append(y,M),s.appendChild(w)}t.appendChild(s),e.error&&t.appendChild(Lo(e.error));const u=d.createElement("div");u.className="foot",u.appendChild(Xr((e.params.model||"api")==="local"?"🖥 本地 27B":"☁ 云端 API","模型",()=>[{icon:"☁",text:"云端 API —— 几秒就回，要配好 llm.json",run:()=>{e.params.model="api",Se(e.id),K()}},{icon:"🖥",text:"本地 27B —— 不花钱，占显存，第一次慢",run:()=>{e.params.model="local",Se(e.id),K()}}]));const f=h=>h?(Ni.find(x=>x[0]===h)||[0,h])[1]:"不加工";u.appendChild(Xr(f(e.params.op),"加工方式",()=>[{icon:"✍",text:"不加工 —— 就当一个纯文本节点，只存字",run:()=>{e.params.op="",ot(e),Se(e.id),K()}},...Ni.map(([h,x,w])=>({icon:"✎",text:`${x} —— ${w}`,run:()=>{e.params.op=h,ot(e),Se(e.id),K()}}))]));const p=d.createElement("span");if(p.style.cssText="color:#8a8a94;font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap",e._lastRun?p.textContent=(e._lastRun.via==="api"?"上次 ☁":"上次 🖥")+(e._lastRun.ms?` · ${(e._lastRun.ms/1e3).toFixed(1)} 秒`:""):e.params.op?p.textContent="结果写回节点 · 上游改了字，重跑一次就用新的":p.textContent="没选加工方式：这个节点只存字",p.title=p.textContent,u.appendChild(p),typeof e.params._prev=="string"&&e.params._prev!==e.params.text){const h=d.createElement("button");h.className="cancel",h.textContent="↩ 恢复运行前的字",h.title="上一次运行之前的节点上原文（只留这一步）",h.onclick=()=>{e.params.text=e.params._prev,delete e.params._prev,ot(e),Se(e.id),K()},u.appendChild(h)}const g=d.createElement("button");g.className="go",g.textContent="↑",g.title="运行",g.disabled=n||!e.params.op,g.onclick=()=>Oo(e),u.appendChild(g),m.panel.appendChild(u),bt()}async function pl(e){if(!De())return;const t=v(e);if(!t)return ne("先在上面选一种加工方式（润色 / 优化 / 扩写 / 自定义）");if(e.status==="running")return ne("文本加工正在进行中，请稍候");e.error=null,e.status="running",e.ms=null,ot(e),m.panel._id===e.id&&Se(e.id);try{const n=T(e).map(i=>({name:i.name,text:i.text})),o=tn(e);o&&n.unshift({name:"节点上的原文",text:o});const r=await Vt("/api/text",{op:t,model:(e.params||{}).model||"api",inputs:n,params:{instr:String((e.params||{}).instr||"")},project:l&&l.id,projectName:l&&l.name,card:e.id,cardName:he(e)});e.params._prev=String((e.params||{}).text||""),e.params.text=r.text,e.status="done",e.ms=r.ms,e._lastRun=r,K(),ot(e),m.panel._id===e.id&&Se(e.id);const a=l.edges.filter(i=>i.from===e.id&&et(i)).length;ne(cl(r)+(a?`
已连给 ${a} 个节点，它们下次运行会用这份新文本`:""))}catch(n){e.status="error",e.error=n.message,Ye.markWorkFailure(n),ot(e),m.panel._id===e.id&&Se(e.id),Ie(n.message)}K()}function cl(e){const t=e.ms>=6e4?`${Math.floor(e.ms/6e4)} 分 ${Math.round(e.ms%6e4/1e3)} 秒`:`${(e.ms/1e3).toFixed(1)} 秒`;return`${e.via==="api"?"✅ 云端 API":"✅ 本地 27B"}，${t}`+(e.warn?`
⚠ ${e.warn}`:"")}function ul(e,t){const n=xe(e),o=t.filter(i=>(e.assets||{})[i.pairWith]),r=i=>ln(n.inputs.find(s=>s.key===i.pairWith)||i,e),a=d.createElement("div");if(a.className="ptabs",(e._tab==null||e._tab<0||e._tab>=o.length)&&(e._tab=o.length?0:-1),o.length){const i=d.createElement("div");i.className="tabs",o.forEach((s,c)=>{const u=d.createElement("button"),f=String(e.params[s.key]!=null?e.params[s.key]:s.default||"").trim();u.textContent=r(s)+(f?" ●":""),u.className=c===e._tab?"on":"",u.onclick=()=>{e._tab=c,Se(e.id)},i.appendChild(u)}),a.appendChild(i),a.appendChild(Mi(e,o[e._tab],r(o[e._tab])+" 的提示词"))}else{const i=d.createElement("div");i.className="tabempty",i.textContent="还没有图片引用。添加图片后，这里才显示对应提示词。",a.appendChild(i)}return a}function Mi(e,t,n){const o=d.createElement("div");o.className="pblock";const r=t.key==="negative_prompt",a=r?[]:fe(e).map(tn),i=r?[]:T(e),s=F[Wt(e)]||xe(e),c=!!(s&&s.rewrite&&t.key===(z(s)[0]||{}).key),u=c?Dr(e,t.key):null,f=!!(u&&e.optUse&&e.optUse[t.key]),p=d.createElement("div");p.className="phd";const g=d.createElement("span"),h=a.length+i.length;g.textContent=(n||t.label)+(h&&!f?`（已并入 ${h} 段文本）`:"");const x=d.createElement("span");x.className="demo",x.textContent="⚠ 这是示例文案，改成你要的内容",p.append(g,x),o.appendChild(p),u&&o.appendChild(fl(e,t,f));const w=d.createElement("textarea");w.placeholder=`${n||t.label}：${r?"描述不希望出现的内容":"描述你想要的画面/动作/镜头"}`;const y=e.promptHeights?.[t.key];Number.isFinite(y)&&y>0&&(w.style.height=y+"px");const M=d.createElement("div");M.className="prompt-highlight-wrapper";const Y=d.createElement("div");Y.className="prompt-highlight-layer",M.appendChild(Y),M.appendChild(w);function Ke(){const W=getComputedStyle(w);for(const _e of["fontFamily","fontSize","fontWeight","lineHeight","letterSpacing","wordSpacing","textIndent","paddingTop","paddingRight","paddingBottom","paddingLeft","borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth","boxSizing","width","height"])Y.style[_e]=W[_e];Y.style.borderStyle="solid",Y.style.borderColor="transparent",Y.style.whiteSpace="pre-wrap",Y.style.overflowWrap=W.overflowWrap,Y.style.wordBreak=W.wordBreak||"normal",Y.style.top="0px",Y.style.left="0px";const ae=w.offsetWidth-w.clientWidth;ae>0&&(Y.style.paddingRight=parseFloat(W.paddingRight)+ae+"px")}let mt=f?u:e.params[t.key]!=null?e.params[t.key]:r?t.default??"":"";if(!f&&h>0){const W=[];a.length>0&&a.forEach(_e=>{W.push(_e)}),i.length>0&&i.forEach(_e=>{W.push(_e.text)});const ae=W.join(`

`);w.value=ae+(mt?`

`+mt:`

`)}else w.value=mt;function Ge(){const W=nt=>nt.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),ae=w.value;let _e="",de=0;const ye=/@([\u4e00-\u9fa5\w]+)/g;let Te;for(;!r&&(Te=ye.exec(ae));)_e+=W(ae.slice(de,Te.index)),_e+=`<mark class="at-mention" data-name="${W(Te[1])}">${W(Te[0])}</mark>`,de=Te.index+Te[0].length;_e+=W(ae.slice(de)),Y.innerHTML=_e+`
`,Y.scrollTop=w.scrollTop}f&&(w.classList.add("optta"),Y.classList.add("opt")),w.addEventListener("wheel",W=>{W.stopPropagation()},{passive:!0}),w.addEventListener("keydown",W=>{if(r||W.isComposing||W.key!=="Backspace"&&W.key!=="Delete"||w.selectionStart!==w.selectionEnd)return;const ae=w.selectionStart,_e=/@([\u4e00-\u9fa5\w]+)/g;let de;for(;de=_e.exec(w.value);)if(W.key==="Backspace"?ae>de.index&&ae<=de.index+de[0].length:ae>=de.index&&ae<de.index+de[0].length){W.preventDefault(),w.setSelectionRange(de.index,de.index+de[0].length),d.execCommand("delete");return}});let Re=null,xt=-1;w.addEventListener("input",()=>{Ge();const W=w.selectionStart,_e=w.value.substring(0,W).match(/@([\u4e00-\u9fa5\w]*)$/);if(_e&&!f&&!r){const de=_e[1].toLowerCase();xt=W-_e[0].length;const ye=[],Te=new Set(l.edges.filter(je=>je.to===e.id).map(je=>je.from));l.cards.forEach(je=>{if(je.id===e.id||!(ft(je)||ut(je)||gt(je)))return;const Xe=he(je);if(!Xe.toLowerCase().includes(de))return;const Yt=Et(je);ye.push({type:"card",section:"canvas",connected:Te.has(je.id),card:je,name:Xe,icon:Yt.icon||"◻",label:ft(je)?"素材":ut(je)?"文本":"风格"})});const nt=F[Wt(e)]||xe(e);nt&&nt.inputs&&nt.inputs.forEach(je=>{if(!["image","audio","video"].includes(je.type))return;const wt=e.assets[je.key];if(!wt||!wt.ref)return;const Xe=ln(je,e);Xe.toLowerCase().includes(de)&&ye.push({type:"slot",section:"current",key:je.key,name:Xe,icon:je.type==="image"?"🖼":je.type==="audio"?"🎵":"🎬",label:Ve[je.type]||"素材"})}),ye.length>0?zt(w,ye):yt()}else yt()});function zt(W,ae){yt(),Re=d.createElement("div"),Re.id="menu",Re.className="at-menu",Re.style.position="absolute",Re.style.maxHeight="280px",Re.style.overflowY="auto";const _e=Xe=>{const Yt=d.createElement("button");Yt.className="at-menu-item"+(Xe.connected?" connected":"");const Lr=d.createElement("span");Lr.className="at-menu-icon",Lr.textContent=Xe.icon;const lr=d.createElement("span");lr.className="at-menu-name",lr.textContent=Xe.name;const Pr=d.createElement("span");Pr.className="at-menu-type",Pr.textContent=Xe.connected?`已连线 · ${Xe.label}`:Xe.label,Yt.append(Lr,lr,Pr),Yt.onclick=()=>{const Ir=Xe.name,Ao=W.value.substring(0,xt),zl=W.value.substring(W.selectionStart);W.value=Ao+`@${Ir} `+zl,W.selectionStart=W.selectionEnd=Ao.length+Ir.length+2,f?e.opt[t.key]=W.value:e.params[t.key]=Ae(W.value),Ze(),K(),Ge(),yt(),W.focus()},Re.appendChild(Yt)};for(const[Xe,Yt]of[["current","当前素材"],["canvas","画布"]]){const Lr=ae.filter(Ir=>Ir.section===Xe).sort((Ir,Ao)=>+!!Ao.connected-+!!Ir.connected);if(!Lr.length)continue;const lr=d.createElement("div");lr.className="at-menu-group";const Pr=d.createElement("span");Pr.textContent=Yt,lr.appendChild(Pr),Re.appendChild(lr),Lr.forEach(_e)}const de=le(xt)||(()=>{const Xe=W.getBoundingClientRect();return{left:Xe.left+8,top:Xe.top+8,bottom:Xe.top+28}})();d.body.appendChild(Re);const ye=Re.offsetWidth,Te=Re.offsetHeight;let nt=de.left-6,je=de.top-Te-6;je<8&&(je=de.bottom+4),nt+ye>innerWidth-8&&(nt=innerWidth-8-ye),nt<8&&(nt=8),Re.style.left=nt+"px",Re.style.top=je+"px";const wt=Xe=>{(!Re||!Re.contains(Xe.target)&&Xe.target!==W)&&(yt(),d.removeEventListener("mousedown",wt))};ee(()=>d.addEventListener("mousedown",wt),0)}function yt(){Re&&(Re.remove(),Re=null)}o.appendChild(M),Ge();const Lt=new ze(()=>{if(!w.isConnected){Lt.disconnect();return}if(!w.offsetHeight)return;Ke(),Y.scrollTop=w.scrollTop;const W=parseFloat(w.style.height);Number.isFinite(W)&&W>0&&W!==e.promptHeights?.[t.key]&&be()&&(e.promptHeights=e.promptHeights||{},e.promptHeights[t.key]=W,K())});Lt.observe(w),w.addEventListener("scroll",()=>{Y.scrollTop=w.scrollTop});let ke=null;function O(W,ae){const _e=Y.querySelectorAll(".at-mention");for(const de of _e){const ye=de.getClientRects();for(const Te of ye)if(W>=Te.left&&W<=Te.right&&ae>=Te.top&&ae<=Te.bottom)return de}return null}function le(W){const ae=[],_e=d.createTreeWalker(Y,NodeFilter.SHOW_TEXT);for(;_e.nextNode();)ae.push(_e.currentNode);let de=0,ye=null,Te=0;for(const wt of ae){if(de+wt.length>W){ye=wt,Te=W-de;break}de+=wt.length}if(!ye){const wt=ae[ae.length-1];if(!wt)return null;ye=wt,Te=wt.length}const nt=d.createRange();nt.setStart(ye,Te),nt.setEnd(ye,Math.min(Te+1,ye.length));const je=nt.getClientRects()[0]||nt.getBoundingClientRect();return je.width===0&&je.height===0?null:je}w.addEventListener("mousemove",W=>{const ae=O(W.clientX,W.clientY);if(w.style.cursor=ae?"pointer":"",Y.querySelectorAll(".at-mention.mhover").forEach(Te=>Te.classList.remove("mhover")),ae&&ae.classList.add("mhover"),!ae)return ge();const _e=ae.dataset.name;if(!_e)return;let de=null;const ye=l.cards.find(Te=>he(Te)===_e);if(ye){const Te=ye.outputs||[];Te.length>0?de={type:Te[0].kind,url:Te[0].url,name:he(ye)}:(ut(ye)||gt(ye))&&(de={type:"text",text:tn(ye)||"(空)",name:he(ye)})}if(!de){const Te=F[Wt(e)]||xe(e);if(Te&&Te.inputs){const nt=Te.inputs.find(je=>ln(je,e)===_e);nt&&e.assets[nt.key]&&(de={type:nt.type,url:e.assets[nt.key].url,name:_e})}}de?me(ae,de):ge()}),w.addEventListener("mouseleave",ge),w.addEventListener("scroll",()=>{Y.scrollTop=w.scrollTop,Y.scrollLeft=w.scrollLeft,ge()});let te=null;function me(W,ae){if(ke&&te===ae.name)return;ge(),te=ae.name,ke=d.createElement("div"),ke.className="at-mention-preview",ke.style.cssText=`
      position: fixed; z-index: 100; background: #060a14f7; border: 1px solid var(--acc);
      border-radius: 3px; padding: 8px; box-shadow: 0 12px 36px #000d, 0 0 18px #00e5ff2e;
      backdrop-filter: blur(6px); max-width: 320px; pointer-events: none;
    `;const _e=d.createElement("div");if(_e.style.cssText="font-size: 11px; color: var(--acc); margin-bottom: 6px; letter-spacing: 1px;",_e.textContent=ae.name,ke.appendChild(_e),ae.type==="image"){const ye=d.createElement("img");ye.src=ae.url,ye.style.cssText="max-width: 300px; max-height: 200px; display: block; border-radius: 2px;",ke.appendChild(ye)}else if(ae.type==="video"){const ye=d.createElement("video");Zr(ye,ae.url),ye.style.cssText="max-width: 300px; max-height: 200px; display: block; border-radius: 2px;",ye.muted=!0,ye.autoplay=!0,ye.loop=!0,ke.appendChild(ye)}else if(ae.type==="audio"){const ye=d.createElement("div");ye.textContent="🎵 "+ae.name,ye.style.cssText="padding: 12px; color: var(--txt); text-align: center;",ke.appendChild(ye)}else if(ae.type==="text"){const ye=d.createElement("div");ye.textContent=ae.text.substring(0,200)+(ae.text.length>200?"...":""),ye.style.cssText="color: var(--txt); font-size: 12px; line-height: 1.6; max-height: 150px; overflow: hidden;",ke.appendChild(ye)}const de=W.getBoundingClientRect();ke.style.left=de.left+"px",ke.style.top=de.bottom+4+"px",d.body.appendChild(ke)}function ge(){te=null,ke&&(ke.remove(),ke=null)}const Ze=()=>{const W=!r&&!f&&!!t.default&&w.value.trim()===String(t.default).trim();x.style.display=W?"":"none",w.classList.toggle("isdemo",W),Y.classList.toggle("demo",W)},Ae=W=>{if(!W)return"";if(!h)return W.trim();const ae=[];a.length>0&&a.forEach(de=>ae.push(de)),i.length>0&&i.forEach(de=>ae.push(de.text));const _e=ae.join(`

`);return W.startsWith(_e)?W.substring(_e.length).trim().replace(/^\n+/,""):W.trim()};if(w.oninput=()=>{f?e.opt[t.key]=w.value:e.params[t.key]=Ae(w.value),Ze(),K()},Ze(),c||!f){const W=d.createElement("div");W.className="ptoolbar";const ae=!!e._rwBusy,_e=e.params._promptModel||"api",de=d.createElement("button");de.className="tbtool model";const ye=d.createElement("span");ye.textContent=_e==="local"?"🖥 本地":"☁ 云端";const Te=d.createElement("i");Te.textContent="▾",de.append(ye,Te),de.title="模型 —— 点击换",de.onclick=Xe=>{Xe.stopPropagation();const Yt=de.getBoundingClientRect();Nt(Yt.left,Yt.bottom+4,"模型",[{icon:"☁",text:"云端 API —— 几秒就回，要配好 llm.json",run:()=>{e.params._promptModel="api",K(),En(e)}},{icon:"🖥",text:"本地 27B —— 不花钱，占显存，第一次慢",run:()=>{e.params._promptModel="local",K(),En(e)}}])},W.appendChild(de);const nt=d.createElement("button");nt.className="tbtool",nt.textContent="🌐 翻译",nt.disabled=ae,nt.title="中→英 / 英→中 自动判断（有道翻译）",nt.onclick=()=>hl(e,t),W.appendChild(nt);const je=d.createElement("div");je.style.cssText="display: flex; gap: 4px; margin-left: auto;";const wt=d.createElement("button");if(wt.className="tbtool",wt.textContent=f?"扔掉这份":"清空",wt.title=f?"删掉优化结果，切回你自己写的原词（原词一直没被动过）":"清空提示词",wt.onclick=()=>{if(f)return delete e.opt[t.key],delete e.optUse[t.key],e.optStyle&&delete e.optStyle[t.key],K(),En(e);if(e.params[t.key]="",!f&&h>0){const Xe=[];a.length>0&&a.forEach(Yt=>{Xe.push(Yt)}),i.length>0&&i.forEach(Yt=>{Xe.push(Yt.text)}),w.value=Xe.join(`

`)}else w.value="";Ze(),w.focus(),K()},je.appendChild(wt),c){const Xe=d.createElement("button");Xe.className="tbtool opt",Xe.textContent=ae?"⏳ 优化中…":"✨ 优化",Xe.disabled=ae,Xe.title="优化提示词：融入风格、补充细节"+(u?`
已有优化结果，再点会覆盖`:"")+`
接入的文本节点会一起融进结果`,Xe.onclick=()=>xl(e,t,_e),je.appendChild(Xe)}W.appendChild(je),o.appendChild(W)}if(e._rwErr&&e._rwErr.key===t.key){const W=d.createElement("div");W.className="rwerr",W.textContent="操作失败："+e._rwErr.msg,o.appendChild(W)}return o}function fl(e,t,n){const o=d.createElement("div");o.className="opttabs";const r=(u,f,p)=>{const g=d.createElement("button");return g.className=u?"on":"",g.textContent=f,g.title=p,g.onclick=()=>{e.optUse=e.optUse||{},e.optUse[t.key]=f!=="原词",K(),En(e)},g},a=it(e).join(`

`),i=e.optStyle&&e.optStyle[t.key]||"",s=a!==i;o.append(r(!n,"原词","你自己写的那段。生成时"+(a?"会在前面拼上接入的文本节点":"原样提交")),r(n,"✨优化后","大模型优化出来的那段，已经是这个模型认的格式。"+(i?`
接入的文本已经融在里面了，生成时不再另外拼`:"")+`
原样提交`));const c=d.createElement("span");return c.className="note",n?s?(c.className="note bad",c.textContent="⚠ "+(i?a?"风格节点换过了，这份里还是旧的":"风格节点摘了，这份里还留着它":"风格节点是优化之后挂的，这份里没有它")+" —— 点「重新优化」",c.title="优化结果是一段写死的文字，风格在优化那一刻就烙进去了，之后改风格节点不会让它跟着变。要么重新优化一次，要么切回「原词」。"):c.textContent=a?"已含接入的文本，提交时不再另拼":"按模型认的格式写好了，原样提交":c.textContent=a?"提交时会拼上接入的文本":"",o.appendChild(c),o}const En=e=>{m.panel._id===e.id&&Se(e.id)};function ml(e){const t=e.ms>=6e4?`${Math.floor(e.ms/6e4)} 分 ${Math.round(e.ms%6e4/1e3)} 秒`:`${(e.ms/1e3).toFixed(1)} 秒`;return`${e.fallback?`⚠ API 没通（${e.fallback}），本地 27B 兜的`:e.via==="api"?`✅ API 改的（${e.model||"远程"}）`:"✅ 本地 27B 改的"}，${t}`+(e.warn?`
⚠ `+e.warn:"")}function hl(e,t){return D(gl(e,t))}async function gl(e,t){if(!De())return;if(e._rwBusy)return ne("翻译正在进行中，请稍候");const n=!!(e.optUse&&e.optUse[t.key]),o=n&&e.opt&&e.opt[t.key]?String(e.opt[t.key]):String(e.params[t.key]!=null?e.params[t.key]:t.default||"");if(!o.trim())return ne("先写点内容再翻译");e._rwBusy=!0,e._rwErr=null,En(e);try{const r=await Vt("/api/text",{op:"translate",model:"youdao",inputs:[{name:"原文",text:o}],params:{},project:l&&l.id,projectName:l&&l.name,card:e.id,cardName:he(e)});n?(e.opt=e.opt||{},e.opt[t.key]=r.text):e.params[t.key]=r.text,K(),e._rwBusy=!1,En(e),ne(`翻译完成 · ${(r.ms/1e3).toFixed(1)} 秒 · ${r.model||"翻译服务"}`+(r.warn?`
${r.warn}`:""))}catch(r){e._rwBusy=!1,e._rwErr={key:t.key,msg:r.message},Ye.markWorkFailure(r),En(e),Ie("翻译失败："+r.message)}}function Sa(e,t){if(!e||!l)return e;const n=F[Wt(t)]||xe(t);if(!n)return e;const o=new Map;let r=1,a=1,i=1;for(const s of n.inputs||[]){const c=t.assets[s.key];if(!c||!c.ref)continue;const u=ln(s,t);s.type==="image"?o.set(u,`<Picture ${r}>`):s.type==="audio"?o.set(u,`<Audio ${a}>`):s.type==="video"&&o.set(u,`<Video ${i}>`);const f=l.cards.find(p=>(p.outputs||[]).some(g=>g.url&&c.url&&g.url===c.url||g.filename&&c.filename&&g.filename===c.filename));if(f){const p=he(f);s.type==="image"?(o.set(p,`<Picture ${r}>`),r++):s.type==="audio"?(o.set(p,`<Audio ${a}>`),a++):s.type==="video"&&(o.set(p,`<Video ${i}>`),i++)}else s.type==="image"?r++:s.type==="audio"?a++:s.type==="video"&&i++}return e.replace(/@([\u4e00-\u9fa5\w]+)/g,(s,c)=>{const u=o.get(c);if(u)return u;const f=l.cards.find(p=>he(p)===c);return f&&(ut(f)||gt(f))&&tn(f)||s})}function bl(e){const t={},n=F[Wt(e)]||xe(e);if(!n)return t;for(const o of n.inputs||[]){const r=e.assets[o.key];if(!r||!r.ref)continue;const a=l.cards.find(i=>(i.outputs||[]).some(s=>s.url&&r.url&&s.url===r.url||s.filename&&r.filename&&s.filename===r.filename));a?t[o.key]=he(a):t[o.key]=ln(o,e)}return t}function xl(e,t,n){return D(yl(e,t,n))}async function yl(e,t,n){if(!De())return;const o=F[Wt(e)]||xe(e);if(!o||!o.rewrite)return;if(e._rwBusy)return ne("优化正在进行中，请稍候");const r=String(e.params[t.key]!=null?e.params[t.key]:t.default||""),a=it(e);if(!r.trim()&&!a.length)return ne("先写一句你想要什么，优化才有东西可改");const i=Sa(r,e);e._rwBusy=!0,e._rwErr=null,En(e);try{await Xo(e);const s=Na(e),c=await Vt("/api/rewrite",{capability:o.id,params:s.params,assets:s.assets,prompt:i,style:a.join(`

`),model:n||"auto",cardInfo:bl(e),project:l&&l.id,projectName:l&&l.name,card:e.id,cardName:he(e)});console.log("=== /api/rewrite 返回数据 ==="),console.log(JSON.stringify(c,null,2)),console.log("=== r.text 内容 ==="),console.log(c.text),console.log("=========================");let u=c.text||"";u=u.replace(/^[\s\S]*?<\/think>/i,""),u=u.replace(/^[\s\S]*?<\/thinking>/i,""),u=u.replace(/^[\s\S]*?<\/thought>/i,""),u=u.trim(),e.opt=e.opt||{},e.optUse=e.optUse||{},e.optStyle=e.optStyle||{},e.opt[t.key]=u,e.optUse[t.key]=!0,e.optStyle[t.key]=a.join(`

`),K(),ne(ml(c))}catch(s){e._rwErr={key:t.key,msg:s.message},Ye.markWorkFailure(s),Ie("优化失败："+s.message)}e._rwBusy=!1,En(e)}function wl(e,t){const n=d.createElement("div");n.className="tpl";const o=d.createElement("button");o.className="tplhd";const r=d.createElement("div");r.style.display="none";const a=d.createElement("textarea");a.value=e.params[t.key]!=null?e.params[t.key]:t.default||"";const i=()=>{const u=a.value.trim()!==String(t.default||"").trim(),f=r.style.display!=="none";o.textContent=`${f?"▾":"▸"} ${t.label}`+(u?"（已被改过，出片结构可能跑偏）":"（预设，默认不用动）"),o.classList.toggle("dirty",u),c.style.display=u?"":"none"};o.onclick=()=>{r.style.display=r.style.display==="none"?"":"none",i()};const s=d.createElement("div");s.className="tplnote",s.textContent="⚠ "+(t.note||"预设参数，改了会影响出片。");const c=d.createElement("button");return c.className="tplrst",c.textContent="恢复预设",c.onclick=()=>{a.value=t.default||"",e.params[t.key]=a.value,i(),K()},a.oninput=()=>{e.params[t.key]=a.value,i(),K()},r.append(s,a,c),i(),n.append(o,r),n}function Gt(e){if(!e._el)return;const t=e._el.querySelector(".ch .t");t.textContent=he(e),t.classList.toggle("named",!!e.name),Mt(e),zi(e)}function Mt(e){Wr(e);const t=e._el&&e._el.querySelector(".cf .kt");if(!t)return;if(gt(e)){t.dataset.kind="style",t.textContent="🎨 只加提示词",t.title="这个节点不生成任何东西：把它的出口拖到生图/生视频节点上，提交时这段风格会并进那个节点的提示词";return}if(Ut(e)){t.style.display="",t.dataset.kind="text",t.textContent="✍ 文本",t.title=v(e)?"选了加工方式：点「↑ 运行」把接进来的文本加工后写回这个节点":"存一段文字：连到生成节点就并进提示词，连到别的文本节点就当它的输入；在面板里选加工方式可以让大模型来加工";return}if(ft(e)){const p=gn(e);t.style.display="",t.dataset.kind=p?p.kind:"both";const g=p&&p.width&&p.height?` ${p.width}×${p.height}`:"";t.textContent=p?`📎 ${Ve[p.kind]||p.kind}${g}`:"📎 空的",t.title=p?`${p.origin||""}
把右边的出口拖到别的节点 → 这份素材就进那个节点的格子里`:"点这个节点选一个文件（图片 / 视频 / 音频都收）";const h=e._el.querySelector(".body");!p&&h&&h.querySelector(".ph")&&(h.innerHTML=Er(e));return}const n=ct(e),o=Za(e),r=Ga(e);t.dataset.kind=o?"both":r;const a=(e.outputs||[])[0],i=a&&a.width&&a.height?` ${a.width}×${a.height}`:"";t.textContent=o?"🖼🎬 跟素材":r==="video"?`🎬 视频${i}`:`🖼 图片${i}`;const s=((xe(e)||{}).inputs||[]).filter(p=>Ct.includes(p.type)),c=n&&n.route?Object.keys(n.route):[...new Set(s.map(p=>p.type))],u=[...new Set(s.filter(p=>p.required).map(p=>p.type))];t.title=(o?"放图片就出图片、放视频就出视频":`这个节点出${Ve[r]}`)+(u.length?`；必需${u.map(p=>Ve[p]||p).join(" / ")}素材`:c.length?`；可引用${c.map(p=>Ve[p]||p).join(" / ")}素材`:"；不用素材");const f=e._el.querySelector(".body");!ut(e)&&f&&f.querySelector(".ph")&&(f.innerHTML=Er(e))}function zi(e){const t=e._el&&e._el.querySelector(".inport");if(!t)return;const n=ct(e),o=xe(e);if(ft(e)){t.style.display="none";return}const r=Ut(e),a=n&&n.route?Object.keys(n.route):[...new Set((o?o.inputs:[]).filter(s=>Ct.includes(s.type)).map(s=>s.type))];if(!a.length&&!r){t.style.display="none";return}const i=!ut(e)&&z(o).length;t.style.display="",t.title=r?"文本节点的出口拖到这里：接进来的文字都是这段加工的输入（按连线顺序）":a.length?`上游节点的产物拖到这里（收${a.map(s=>Ve[s]||s).join(" / ")}${i?"，也收文本节点":""}）`:"文本节点的出口拖到这里"}const $a="application/x-chouka-image-slot";function vl(e,t,n,o){const r=t.map(g=>g.key),a=r.indexOf(n),i=r.indexOf(o);if(a<0||i<0||a===i)return!1;const s=r.map(g=>({key:g,asset:e.assets[g]})),[c]=s.splice(a,1);s.splice(i,0,c);const u=Object.fromEntries(s.map((g,h)=>[g.key,r[h]]));s.forEach((g,h)=>{e.assets[r[h]]=g.asset});const f=xe(e),p=new Map((f&&f.inputs||[]).filter(g=>g.pairWith).map(g=>[g.pairWith,g.key]));if(r.every(g=>p.has(g))){const g=s.map((x,w)=>({from:p.get(x.key),to:p.get(r[w])}));for(const x of[e.params,e.opt,e.optUse,e.optStyle]){if(!x)continue;const w=g.map(y=>({to:y.to,has:Object.prototype.hasOwnProperty.call(x,y.from),value:x[y.from]}));for(const y of g)delete x[y.to];for(const y of w)y.has&&(x[y.to]=y.value)}const h=r.filter(x=>p.has(x));Number.isInteger(e._tab)&&h[e._tab]&&(e._tab=h.indexOf(u[h[e._tab]]))}for(const g of l&&l.edges||[])g.to!==e.id||et(g)||(u[g.slot]&&(g.slot=u[g.slot]),Array.isArray(g.slots)&&(g.slots=g.slots.map(h=>u[h]||h)));return!0}function kl(e,t,n,o){if(o.length<2)return;n.draggable=!0,n.classList.add("sortable"),n.title+=`
拖拽可调整图片顺序`;const r=a=>Array.from(a.dataTransfer&&a.dataTransfer.types||[]).includes($a);n.ondragstart=a=>{if(!De())return a.preventDefault();n._skipClick=!0,a.dataTransfer.effectAllowed="move",a.dataTransfer.setData($a,t.key),Ne(()=>n.classList.add("dragging"))},n.ondragenter=a=>{r(a)&&(a.preventDefault(),a.stopPropagation(),n.classList.add("drop-target"))},n.ondragover=a=>{r(a)&&(a.preventDefault(),a.stopPropagation(),a.dataTransfer.dropEffect="move")},n.ondragleave=a=>{n.contains(a.relatedTarget)||n.classList.remove("drop-target")},n.ondrop=a=>{if(!r(a))return;a.preventDefault(),a.stopPropagation(),n.classList.remove("drop-target");const i=a.dataTransfer.getData($a);vl(e,o,i,t.key)&&(Mt(e),tt(),Ot(),Se(e.id),K())},n.ondragend=()=>{n.classList.remove("dragging","drop-target"),ee(()=>{n._skipClick=!1},0)}}function Li(e,t,n){const o=xe(e),r=d.createElement("div");r.className="slots refs";const a=t.filter(p=>(e.assets||{})[p.key]),i=n&&n.route,s=[...new Set(t.map(p=>p.type))],c=d.createElement("div");if(c.className="refhead",i)c.textContent="引用上限：素材 1 个";else{const p=[];for(const g of s){const h=Jn(o,g);h&&p.push(`${Ve[g]||g} ${h}`)}c.textContent=p.length?`引用上限：${p.join(" · ")}`:"当前模型不支持画布素材引用"}r.appendChild(c);const u=a.filter(p=>p.type==="image");for(const p of a){const g=Cl(e,p);p.type==="image"&&kl(e,p,g,u),r.appendChild(g)}const f=d.createElement("div");if(f.className="refadds",i){if(!a.length&&t.length){const p=d.createElement("button");p.className="refadd",p.textContent="＋ 添加素材（0/1）",p.title="可引用图片或视频，上限 1 个",p.onclick=()=>Po(e,t[0]),f.appendChild(p)}}else for(const p of s){const g=Jn(o,p),h=a.filter(y=>y.type===p).length,x=t.find(y=>y.type===p&&!(e.assets||{})[y.key]);if(!g||h>=g||!x)continue;const w=d.createElement("button");w.className="refadd",w.textContent=`＋ 添加${Ve[p]||p}（${h}/${g}）`,w.title=`${Ve[p]||p}引用上限 ${g}`,w.onclick=()=>Po(e,x),f.appendChild(w)}return f.childElementCount&&r.appendChild(f),r}function Cl(e,t){const n=e.assets[t.key],o=d.createElement("div");o.className="slot"+(n?" filled":t.required?" req":""),o.dataset.key=t.key,o.title=(t.hint||ln(t,e))+(t.required?"（必填）":"")+(n?`
单击预览；右键更换、下载或清空素材`:`
单击上传素材`),o.innerHTML='<div class="box"></div><span class="lbl"></span>',o.querySelector(".lbl").textContent=ln(t,e);const r=o.querySelector(".box");return n?(r.innerHTML=n.kind==="image"?`<img src="${n.url}" draggable="false">`:n.kind==="video"?`<video data-video-url="${n.url}" muted draggable="false"></video>`:"🎵",Ci(r)):r.textContent=t.type==="audio"?"🎵":t.type==="video"?"🎬":Fa(t)?"田":"＋",o.onclick=()=>{if(!o._skipClick)return n?to(n):Po(e,t)},o.oncontextmenu=a=>{a.stopPropagation(),a.preventDefault(),n&&Nt(a.clientX,a.clientY,n.origin||ln(t,e),[{icon:"⛶",text:n.kind==="image"?"查看大图":"放大播放",run:()=>to(n)},{icon:"↻",text:"更换素材",run:()=>Po(e,t)},{icon:"↓",text:"下载素材",run:()=>Kr({...n,filename:n.origin||n.filename||n.url})},{icon:"✕",text:"清空这一格",danger:!0,run:()=>{delete e.assets[t.key],ti(e.id,t.key),Mt(e),tt(),Ot(),Se(e.id),K()}}])},o}const Pi=e=>{const t=String(e??"").split(":"),n=t.length>1?+t[0]*60+ +t[1]:+t[0];return Number.isFinite(n)?Math.max(0,Math.round(n)):0},ro=e=>`${Math.floor(e/60)}:${String(Math.round(e)%60).padStart(2,"0")}`;function _l(e,t,n,o){const r=d.createElement("div");r.className="arange";const a=d.createElement("div");a.className="atitle",a.textContent="用音频的哪一段",r.appendChild(a);const i=e.assets[t.key];if(!i){const ke=d.createElement("div");return ke.className="anote",ke.textContent=`先在上面的「${ln(t,e)}」传一段音频，这里就能试听、拖着选要用的一段。`,r.appendChild(ke),r}const s=d.createElement("audio");s.src=i.url,s.preload="metadata",r.appendChild(s);const c=d.createElement("div");c.className="atrack",c.innerHTML='<div class="asel"></div><div class="ahead"></div><div class="ahd s" title="拖动：选段从这里开始"></div><div class="ahd e" title="拖动：选段到这里结束"></div>';const u=c.querySelector(".asel"),f=c.querySelector(".ahead"),p=c.querySelector(".ahd.s"),g=c.querySelector(".ahd.e");r.appendChild(c);const h=d.createElement("div");h.className="aout",r.appendChild(h);const x=d.createElement("div");x.className="abtn",r.appendChild(x);const w=d.createElement("div");w.className="anote",w.textContent="点条子上任意位置就从那儿开始听；听到该起／该停的地方，按下面两个按钮把边界钉在那里。",r.appendChild(w);let y=Pi(e.params[n.key]!=null?e.params[n.key]:n.default),M=Pi(e.params[o.key]!=null?e.params[o.key]:o.default);const Y=()=>Math.floor(s.duration)||Math.max(M,1);function Ke(ke,O){const le=Y();if(ke=Math.max(0,Math.min(Math.round(ke),le-1)),O=Math.max(ke+1,Math.min(Math.round(O),le)),ke===y&&O===M)return Lt();y=ke,M=O,e.params[n.key]=ro(y),e.params[o.key]=ro(M),Lt(),K()}s.onloadedmetadata=()=>Ke(y,M);let mt=0;const Ge=(ke,O)=>{mt=O,s.currentTime=ke,s.play()};s.ontimeupdate=()=>{mt&&s.currentTime>=mt&&s.pause(),Lt()},s.onplay=s.onpause=s.onended=()=>Lt();const Re=(ke,O,le)=>{const te=d.createElement("button");return te.textContent=ke,te.title=O,te.onclick=le,x.appendChild(te),te},xt=Re("▶ 试听选段","只放选中的这一段",()=>s.paused?Ge(y,M):s.pause());Re("▶ 整条","从头放到尾，用来找该从哪儿起",()=>Ge(0,0)),Re("⇤ 起点钉在这","把选段开头挪到当前播放位置",()=>Ke(Math.floor(s.currentTime),M)),Re("终点钉在这 ⇥","把选段结尾挪到当前播放位置",()=>Ke(y,Math.ceil(s.currentTime)));const zt=ke=>{const O=c.getBoundingClientRect();return Math.max(0,Math.min(1,(ke.clientX-O.left)/O.width))*Y()},yt=ke=>O=>{O.stopPropagation(),O.preventDefault();const le=me=>ke==="s"?Ke(zt(me),M):Ke(y,zt(me)),te=()=>{G.removeEventListener("mousemove",le),G.removeEventListener("mouseup",te)};G.addEventListener("mousemove",le),G.addEventListener("mouseup",te)};p.onmousedown=yt("s"),g.onmousedown=yt("e"),c.onmousedown=ke=>{ke.stopPropagation(),s.currentTime=zt(ke),Lt()};function Lt(){const ke=Y(),O=le=>Math.max(0,Math.min(le,ke))/ke*100+"%";u.style.left=O(y),u.style.width=(Math.min(M,ke)-y)/ke*100+"%",p.style.left=O(y),g.style.left=O(M),f.style.left=O(s.currentTime),h.textContent=`${ro(y)} → ${ro(M)}　选中 ${M-y} 秒`+(s.duration?`　（整条 ${ro(Math.floor(s.duration))}）`:""),xt.textContent=s.paused?"▶ 试听选段":"⏸ 停"}return Lt(),r}function Po(e,t){if(!De())return;const n=ct(e),o=n&&n.route&&Object.keys(n.route).length>1&&Object.values(n.route).some(r=>r.slot===t.key);m.picker.accept=o?Object.keys(n.route).map(r=>`${r}/*`).join(","):t.type==="audio"?"audio/*":t.type==="video"?"video/*":"image/*",m.picker.onchange=()=>D((async()=>{const r=m.picker.files[0];if(m.picker.value="",!!r)try{Qi(e,t,await It(r,xe(e)?.execution==="browser")),Se(e.id),K()}catch(a){Ye.markWorkFailure(a),Ie("上传失败："+a.message)}})()),m.picker.click()}function Io(e,t){De()&&(m.picker.accept="image/*,video/*,audio/*",m.picker.onchange=()=>D((async()=>{const n=m.picker.files[0];if(m.picker.value="",!!n)try{const o=await It(n);t?await t(o):await oo(e,o)}catch(o){Ye.markWorkFailure(o),Ie("上传失败："+o.message)}})()),m.picker.click())}async function oo(e,t,n=!0){if(!De()||!l.cards.includes(e))return;e.outputs=[{...t,filename:(t.origin||t.url).split(/[\\/]/).pop()}],delete e.w,delete e.h,Tn(e),ot(e),Gt(e),n&&Se(e.id),tt(),K();const o=l.edges.filter(r=>r.from===e.id&&!et(r));for(const r of o){const a=l.cards.find(i=>i.id===r.to);if(!(!a||!a.assets)){for(const i of bn(r))a.assets[i]=JSON.parse(JSON.stringify(e.outputs[0]));Bn(a),Mt(a)}}if(t.kind==="image"){const r=new Image;r.onload=()=>{if(!l?.cards.includes(e)||e.outputs[0]?.url!==t.url)return;const a=r.naturalWidth,i=r.naturalHeight;e.outputs[0].width=a,e.outputs[0].height=i,Mt(e),K()},r.src=t.url}else if(t.kind==="video"){const r=d.createElement("video");r.onloadedmetadata=()=>{if(!l?.cards.includes(e)||e.outputs[0]?.url!==t.url)return;const a=r.videoWidth,i=r.videoHeight;e.outputs[0].width=a,e.outputs[0].height=i,Mt(e),K()},Zr(r,t.url)}}function El(){De()&&l&&Io(null,e=>{const t=ia(),n=xn("card_asset",t.x,t.y);n&&(oo(n,e),ne(`已放进一个素材节点（${Ve[e.kind]||e.kind}）：把它右边那颗点拖到生图/生视频/工具节点上，这份素材就进那个节点的格子`))})}function To(e,t){const n=d.createElement("div");n.className="row";const o=d.createElement("label");o.textContent=t.label,o.title=t.hint||t.label,n.appendChild(o);const r=e.params[t.key]!=null?e.params[t.key]:t.type==="seed"?-1:t.default;if(Qe(e)&&t.key==="duration"){const a=d.createElement("input");a.type="number",a.min=t.min,t.max!=null&&(a.max=t.max),a.step=1,a.required=!0,a.value=r,a.style.width="72px";const i=t.max!=null?d.createElement("input"):null;i&&(i.type="range",i.min=t.min,i.max=t.max,i.step=1,i.value=r,i.oninput=()=>{a.value=i.value,e.params.duration=Number(i.value),K()},n.appendChild(i)),a.oninput=()=>{e.params.duration=a.value===""?"":Number(a.value),i&&(i.value=a.value),K()},a.onchange=()=>{Ho(e),a.value=e.params.duration,i&&(i.value=a.value),K()},n.appendChild(a)}else if(t.type==="slider"){const a=d.createElement("input");a.type="range",a.min=t.min!=null?t.min:1,a.max=t.max!=null?t.max:30,a.step=t.step||1;const i=F[Wt(e)]||xe(e),s=as(e,i);if(t.key==="duration"&&s&&!i.inputs.some(f=>f.key==="preview_seconds")){const f=[+s.duration,+r].filter(p=>Number.isFinite(p)&&p>0);a.min=Math.min(+a.min,...f),a.max=Math.max(+a.max,...f),a.step="any"}const c=d.createElement("input");c.type="number",c.min=a.min,c.max=a.max,c.step=a.step,c.style.width="72px",a.value=c.value=r??a.min;const u=f=>{a.value=c.value=f,e.params[t.key]=parseFloat(f),K()};a.oninput=()=>u(a.value),c.oninput=()=>u(c.value),n.appendChild(a),n.appendChild(c)}else if(t.type==="seed"){const a=d.createElement("input");a.type="number",a.style.flex="1",a.value=r??-1,a.oninput=()=>{e.params[t.key]=a.value===""?-1:parseInt(a.value),K()};const i=d.createElement("button");i.className="dice",i.textContent="🎲 随机",i.title="-1 = 每次随机",i.onclick=()=>{a.value=-1,e.params[t.key]=-1,K()},n.appendChild(a),n.appendChild(i)}else if(t.type==="textarea"){const a=d.createElement("textarea");a.style.flex="1",a.style.minHeight="48px",a.value=r??"",a.oninput=()=>{e.params[t.key]=a.value,K()},n.appendChild(a)}else if(t.type==="select"&&t.appearance==="switch"){const a=d.createElement("button");a.type="button",a.className="param-switch",a.id=`param-${e.id}-${t.key}`,o.htmlFor=a.id,a.setAttribute("role","switch"),a.setAttribute("aria-label",t.label);const i=d.createElement("span");i.className="param-switch-track",i.setAttribute("aria-hidden","true");const s=d.createElement("span");s.className="param-switch-thumb",i.appendChild(s);const c=d.createElement("span");c.className="param-switch-state",c.setAttribute("aria-hidden","true"),a.append(i,c);const u=()=>{const f=(e.params[t.key]??t.default)==="on";a.setAttribute("aria-checked",String(f)),c.textContent=f?"开启":"关闭"};a.onclick=()=>{e.params[t.key]=a.getAttribute("aria-checked")==="true"?"off":"on",u(),K()},u(),n.appendChild(a)}else if(t.type==="select"&&t.options){const a=d.createElement("select");a.style.flex="1";for(const i of t.options){const s=d.createElement("option");s.value=typeof i=="object"?i.value:i,s.textContent=typeof i=="object"?i.label:i,a.appendChild(s)}r!=null&&(a.value=r),a.onchange=()=>{e.params[t.key]=a.value,K(),t.key==="aspect_ratio"&&Se(e.id)},n.appendChild(a)}else{const a=d.createElement("input");a.type=t.type==="number"?"number":"text",t.min!=null&&(a.min=t.min),t.max!=null&&(a.max=t.max),a.value=r??"",a.style.flex="1",a.oninput=()=>{e.params[t.key]=a.type==="number"?a.value===""?"":parseFloat(a.value):a.value,K()},n.appendChild(a)}if(t.warnAbove!=null&&t.warning){const a=d.createElement("div");a.className="paramwarn";const i=()=>{const s=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default);a.hidden=!isFinite(s)||s<=t.warnAbove,a.textContent=t.warning};for(const s of n.querySelectorAll("input, select"))s.addEventListener("input",i),s.addEventListener("change",i);i(),n.appendChild(a)}if(t.showHint&&t.hint){const a=d.createElement("div");a.className="knobnote",a.id=`param-${e.id}-${t.key}-hint`,a.textContent=t.hint;const i=[...n.querySelectorAll("input, select, textarea, button")];for(const[s,c]of i.entries())c.id=`param-${e.id}-${t.key}-${s}`,c.setAttribute("aria-describedby",a.id),c.setAttribute("aria-label",t.label+(s?"数值":""));i.length&&(o.htmlFor=i[0].id),n.appendChild(a)}return(t.key==="megapixels"||t.key==="scale_to_length")&&$l(e,t,n),t.key==="frame_load_cap"&&Sl(e,t,n),n}async function Sl(e,t,n){const o=Object.values(e.assets||{}).find(c=>c&&c.kind==="video"),r=d.createElement("span");r.className="resout";const a=d.createElement("div");if(a.className="resline",a.appendChild(r),n.appendChild(a),!o){r.textContent="放进视频后这里显示总帧数";return}let i="读取总帧数…";const s=()=>{if(!o.frames){r.textContent=i;return}const c=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default)||0;r.textContent=`这段共 ${o.frames} 帧`+(o.fps?` · ${(+o.fps).toFixed(0)} fps · ${(+o.duration).toFixed(1)} 秒`:"")+(c>0&&c<o.frames?` → 只跑前 ${c} 帧`:" → 整段都跑")};s();for(const c of n.querySelectorAll("input"))c.addEventListener("input",s);if(!o.frames){try{Object.assign(o,await kt("/api/media?ref="+encodeURIComponent(o.ref)+"&project="+encodeURIComponent(l.id))),o.frames&&K()}catch(c){Ie(`读取媒体信息失败：${c.message}`)}i="总帧数读不出来（填 0 = 整段，一定没错）",s()}}function $l(e,t,n){const r=xe(e).inputs.find(g=>g.key==="aspect_ratio"),a=r?e.params.aspect_ratio!=null?e.params.aspect_ratio:r.default:"16:9 (Widescreen)",i=d.createElement("span");i.className="resout";const s=[...n.querySelectorAll("input")],c=()=>{const g=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default);if(!isFinite(g)){i.textContent="";return}if(t.key==="megapixels"){const[h,x]=cr(a,g);i.textContent=`${h}×${x} · ${Math.min(h,x)}p`,i.title=`${a}，${g} 百万像素`}else i.textContent=`16:9 素材 → ${Math.round(g)}×${Bi(g)} · ${Bi(g)}p`,i.title="长边固定为这个值，短边按素材原比例算，所以 p 数随素材变"},u=g=>{for(const h of s)h.value=g;e.params[t.key]=g,c(),K()},f=d.createElement("span");f.className="presets";for(const g of pr){const h=t.key==="megapixels"?Ki(a,g):Yi[g],x=d.createElement("button");x.textContent=g+"p",h>t.max?(x.disabled=!0,x.title=t.key==="megapixels"?`${a} 下 ${g}p 需要 ${h} 百万像素，超过当前参数上限 ${t.max}`:`最长边 ${h}px 超过当前参数上限 ${t.max}`):(x.title=t.key==="megapixels"?`${cr(a,h).join("×")} · 短边 ${g}p`:`16:9 素材约 ${g}p；最长边 ${h}px，实际短边随素材比例变化`,x.onclick=()=>u(h)),f.appendChild(x)}const p=d.createElement("div");p.className="resline",p.append(i,f),n.appendChild(p);for(const g of s)g.addEventListener("input",c);c()}function Ro(e,t=l){return t?.director?.shots?.find(n=>n.id===e.director_shot||n.image?.card===e.id||n.video?.card===e.id)}function ja(e){const t=Ro(e);if(!t)return[];const n=[];return t.shotSize&&n.push("景别："+t.shotSize),(e.director_stage==="video"||t.video?.card===e.id)&&t.movement&&n.push("运镜："+t.movement),l.director.style?.trim()&&n.push("统一画面风格："+l.director.style.trim()),n}function Na(e){const t=F[Wt(e)]||xe(e),n={},o={},r=it(e),a=ja(e),i=new Set(z(t).map(s=>s.key));for(const s of t.inputs){if(Ct.includes(s.type)||s.mirror)continue;const c=e.params[s.key];if(c!=null?n[s.key]=c:s.type==="seed"?n[s.key]=-1:s.default!==void 0&&(n[s.key]=s.default),!i.has(s.key))continue;const u=qr(e,s.key);if(u!=null)n[s.key]=u;else{let f=Sa(n[s.key],e);r.length&&(f=co(f,r)),n[s.key]=f}a.length&&s.key==="prompt"&&(n[s.key]+=`
`+a.join(`
`))}if(rs(t,n),t.imageControls){const s=Jo(e,t);n.image_ratio=s.ratio,n.image_clarity=s.clarity;for(const c of Fo)delete n[c]}for(const s of t.inputs.filter(c=>Ct.includes(c.type))){const c=e.assets[s.key];c&&c.ref&&(o[s.key]=c.ref)}return{capability:t.id,params:n,assets:o,project:l&&l.id,projectName:l&&l.name,card:e.id,cardName:he(e)}}function Oo(e){return e._ifRestoring?(ne("正在查询原产物，请勿重复生成"),Promise.resolve()):(e._runPromise||(e._runPromise=D(jl(e).finally(()=>{delete e._runPromise}))),e._runPromise)}function Ii(e,t){!Qe(e)||!be()||!wn(e,t)||(e._ifResumePreparing?(delete e._ifResumePreparing,e._runPromise=D(Ti(e,!0).finally(()=>{delete e._runPromise}))):e.status==="running"&&(e.job?ao(e,t):e.if_request_id&&Ma(e,t)))}async function Ma(e,t){if(e._ifRecovering||l?.id!==t||!be()||!l.cards.includes(e)||!Qe(e)||!wn(e,t)||e.job||e.status!=="running"||!e.if_request_id)return;e._ifRecovering=!0;let n=!1;try{const o=await sn(`/requests/${encodeURIComponent(e.if_request_id)}`);if(l?.id!==t||!be()||!l.cards.includes(e))return;e.job=o.id,e.error=null,e.step="本机 IF 已接收原请求，正在恢复进度";const r=Ar(e,t);r.job=o.id,Ht(r),Mr(e,{id:o.id,capability:e.if_job_cap||e.cap,prompts:e.if_pending_prompts||[]}),delete e.if_pending_prompts,Rt(e,t,"running"),await hn(e,t),ao(e,t)}catch(o){if(l?.id!==t||!l.cards.includes(e))return;n=o instanceof TypeError||o.status>=500||o.status===404&&Date.now()-(e.if_submitted_at||e.if_started)<12e4,e.step=n?"正在向本机 IF 确认原请求，请勿重复生成":"",n||(e.status="error",e.error="IF 提交结果尚未确认，请先在 IF 查看是否已创建任务，避免重复生成："+o.message),Rt(e,t,"submitting"),n||(Ie(e.error),await hn(e,t))}finally{e._ifRecovering=!1,l?.id===t&&l.cards.includes(e)&&(ot(e),m.panel._id===e.id&&Se(e.id),n&&ee(()=>Ma(e,t),2500))}}async function Ti(e,t=!1){const n=l,o=e.cap,r=[];let a=!1,i=!1;e.status="queued",e.error=null,e.progress=null,e.job=null,e.ms=null,e.step="正在连接本机 IF 并读取模型",e.if_job_cap=o,t||(e.if_started=Date.now(),e.if_request_id=Array.from(crypto.getRandomValues(new Uint8Array(16)),c=>c.toString(16).padStart(2,"0")).join("")),delete e.if_submitted_at,delete e.if_pending_prompts,delete e.if_canvas_url;const s=Rt(e,n.id,"preparing");ot(e),m.panel._id===e.id&&Se(e.id);try{if(!s)throw new Error("无法保存 IF 刷新恢复记录，尚未提交生成；请检查浏览器存储空间和权限");const c=await ur(n.id);if(!c.ok)throw new Error("任务准备状态保存失败，尚未提交 IF："+(c.error?.message||"请重试"));const u=await Ln();if(!Mn)throw new Error("请更新本机 IF 桥接器后重试；当前版本不支持提交期间刷新恢复");if(await Xo(e),l!==n||!be()||!n.cards.includes(e)||e.cap!==o)throw new Error("画布已切换或权限已变化，已取消 IF 提交");const f=xe(e).outputType,p=u.filter(te=>te.type===f).find(te=>te.display_name===e.params.if_model)||!e.params.if_model&&u.find(te=>te.type===f);if(!p)throw new Error("当前 IF 模型不可用，请重新选择模型");if(["exhausted","unavailable"].includes(p.quota_status))throw new Error(`${p.display_name}：${zn(p)}，尚未提交生成，请选择其他模型`);const g=String(e.params.prompt||""),h=g.trim();if(!h)throw new Error("请先填写 IF 生成需求");const x=Bo(p.display_name,f),w=Object.entries(e.assets||{}).filter(([,te])=>te&&Ct.includes(te.kind)).sort(([te],[me])=>te.localeCompare(me,void 0,{numeric:!0})),y={image:0,video:0,audio:0};for(const[te,me]of w){const ge=te.match(/^(?:images|video)\[(\d+)\]$/);if(!ge||me.kind==="image"!==te.startsWith("images["))throw new Error(`引用槽位与${Ve[me.kind]||me.kind}类型不匹配，请重新连接引用`);if(Number(ge[1])>=(x.bridge[me.kind]||0))throw new Error(`所选模型最多引用图片 ${x.bridge.image} 张、视频 ${x.bridge.video} 个；当前引用槽位超出范围，请移除多余引用或更换模型`);y[me.kind]++}if(Object.keys(y).some(te=>y[te]>(x.bridge[te]||0)))throw new Error("引用数量超出所选 IF 模型的画布槽位");const M={type:f,model:p.display_name,request_id:e.if_request_id,prompt:co(Sa(h,e),it(e))},Y=ja(e);Y.length&&(M.prompt+=`
`+Y.join(`
`));const Ke=xe(e),mt=Ke.inputs,Ge=[];if(f==="image"){const{ratio:te,clarity:me}=Jo(e,Ke),[ge,Ze]=te.split(":").map(Number),Ae=Wo.find(_e=>_e.id===me).val,W=ge>=Ze?Math.round(Ae*ge/Ze/16)*16:Ae,ae=ge>=Ze?Ae:Math.round(Ae*Ze/ge/16)*16;Ge.push(`分辨率：${W}×${ae}`)}else{const te=mt.find(Te=>Te.key==="aspect_ratio"),me=mt.find(Te=>Te.key==="megapixels"),ge=e.params.aspect_ratio??te.default,Ze=Number(e.params.megapixels??me.default),Ae=Pa(e,Ke),W=Ae?[Ae.width,Ae.height]:cr(ge,Number.isFinite(Ze)&&Ze>=me.min&&Ze<=me.max?Ze:me.default),ae=mt.find(Te=>Te.key==="duration"),_e=Number(e.params.duration??ae.default);if(!Number.isSafeInteger(_e)||_e<ae.min||ae.max!=null&&_e>ae.max)throw new Error(ae.max!=null?`当前 IF 模型时长须为 ${ae.min}–${ae.max} 秒的整数，请修改时长`:"当前 IF 模型时长范围未核实，请输入正整数秒");const[de,ye]=so[ge]||[1,1];Ge.push(`分辨率：${W[0]}×${W[1]}`,`时长：${_e}s`,`画面比例：${de} : ${ye}`)}M.prompt+=`

${Ge.join(`
`)}`;const Re=f==="video"?"视频":"图片",xt=f==="video"?"图片、":"",zt=f==="video"?"不要改为生图":"不要改为视频或文字方案";if(M.prompt=`最终交付必须是${Re}文件，不是${xt}故事板或文字方案。用户已经确认生成需求，请直接生成${Re}；不要等待用户确认规划、分镜或中间图片，也不要把中间图片当作最终结果。如无法直接完成，请说明原因，${zt}。以本条${Re}目标和以下参数要求为准。

${M.prompt}`,f==="image"&&e.params.if_reference?.trim()){if(!x.bridge.image&&!x.bridge.video)throw new Error("该模型不支持已确认的媒体引用");M.image=e.params.if_reference.trim()}const yt=Ar(e,n.id);yt.pending=[],yt.job=null;const Lt=te=>JSON.stringify([te.kind,new Ee(te.url,location.href).href,te.ref||""]),ke=new Set(w.map(([,te])=>Lt(te)));if(yt.entries=yt.entries.filter(te=>ke.has(te.source)),Ht(yt),w.length){if(!Or)throw new Error("请更新本机 IF 桥接器后重试；当前版本不支持引用复用");M.references=[];for(const[te,[,me]]of w.entries()){const ge=`${Ve[me.kind]}引用（${te+1}/${w.length}）`,Ze=new Ee(me.url,location.href);if(Ze.origin!==location.origin)throw new Error("IF 仅能上传当前画布内的本机素材");e.step=`正在检查 IF ${ge}是否可复用`,ot(e);const Ae=await po(Ze,me.kind);if(l!==n||!n.cards.includes(e)||e.cap!==o||!be())throw new Error("画布已切换或权限已变化，已取消 IF 提交");const W={source:Lt(me),version:Ae,kind:me.kind};yt.pending.push(W);const ae=yt.entries.find(je=>je.source===W.source&&je.version===Ae&&je.kind===me.kind&&Fr(je.url));if(ae){e.step=`正在复用已上传 IF 的${ge}`,ot(e),M.references.push({kind:me.kind,url:ae.url});continue}e.step=`正在读取 IF ${ge}`,ot(e);const _e=await we(Ze,{credentials:"same-origin",cache:"no-store"});if(!_e.ok)throw new Error("无法读取画布引用素材");let de=await _e.blob();const ye=me.kind==="image"?["image/png","image/jpeg","image/webp"]:["video/mp4"],Te=me.kind==="image"?1e7:50*1024*1024;if(!ye.includes(de.type)||de.size>Te){e.step=`正在适配 IF ${Ve[me.kind]}上传副本（${te+1}/${w.length}）`,ot(e);const je=await we(`/api/if-reference?${new URLSearchParams({url:Ze.pathname+Ze.search,type:me.kind})}`,{credentials:"same-origin",cache:"no-store",headers:{"If-Match":Ae}});if(!je.ok)throw new Error(`IF 素材自动适配失败：${(await je.text()).slice(0,500)}`);const wt=de.size;de=await je.blob();const Xe=je.headers.get("X-Chouka-IF-Conversion");if(l!==n||!n.cards.includes(e)||e.cap!==o||!be())throw new Error("画布已切换或权限已变化，已取消 IF 提交");ne(`IF ${Ve[me.kind]}上传副本已${Xe==="lossless-webp"?"转换为无损 WebP":"压缩"}（${(wt/1048576).toFixed(1)} → ${(de.size/1048576).toFixed(1)} MB），原素材保持不变`)}if(!de.size||!ye.includes(de.type)||de.size>Te)throw new Error(`IF 上传副本仍不符合格式或 ${me.kind==="image"?10:50} MB 大小限制，原素材未修改`);if(l!==n||!n.cards.includes(e)||e.cap!==o||!be())throw new Error("画布已切换或权限已变化，已取消 IF 提交");if(await po(Ze,me.kind)!==Ae)throw new Error("准备期间引用素材已变化，请重试");e.step=`正在向本机桥接传送${ge}`,ot(e);const nt=await sn("/assets",{method:"POST",headers:{"X-Chouka-IF":"asset","Content-Type":de.type},body:de});if(r.push(nt.asset_id),M.references.push({kind:me.kind,asset_id:nt.asset_id}),l!==n||!n.cards.includes(e)||e.cap!==o)throw new Error("画布已切换，已取消 IF 提交")}}if(Ht(yt),e.params.if_model=p.display_name,e.status="queued",e.error=null,e.progress=null,e.outputs=[],e.ms=null,e.step="正在交由本机 IF 桥接处理",e.job=null,i=!0,e.if_submitted_at=Date.now(),e.if_pending_prompts=[{key:"if_original",label:"原始提示词",text:g},{key:"if_submitted",label:"提交给 IF CLI 的提示词",text:M.prompt}],!Rt(e,n.id,"submitting"))throw new Error("无法保存 IF 提交恢复记录，尚未提交生成；请检查浏览器存储空间和权限");ot(e),m.panel._id===e.id&&Se(e.id);const O=await sn("/runs",{method:"POST",headers:{"Content-Type":"application/json","X-Chouka-IF":"generate"},body:JSON.stringify(M)});a=!0,e.job=O.id,e.if_job_cap=o,e.status="running",e.step="本机 IF 正在准备生成任务",yt.job=O.id,Ht(yt),Mr(e,{id:O.id,capability:o,prompts:e.if_pending_prompts}),delete e.if_pending_prompts,Rt(e,n.id,"running"),m.hist._id===e.id&&zr(e.id),(await hn(e,n.id)).ok||Ie("IF 任务已提交，服务器状态保存失败；已保留本标签页恢复记录，请勿重复生成"),ao(e,n.id)}catch(c){const u=i&&!a&&(c instanceof TypeError||c instanceof SyntaxError||c.status>=500);if(!a&&!u&&r.length&&await Promise.allSettled(r.map(f=>sn(`/assets/${encodeURIComponent(f)}`,{method:"DELETE",headers:{"X-Chouka-IF":"asset"}}))),l!==n||!n.cards.includes(e))return;u?(e.status="running",e.error=null,e.step="正在向本机 IF 确认原请求",Rt(e,n.id,"submitting"),Ma(e,n.id)):(e.status="error",e.error=c.message,e.step="",e.job=null,Rt(e,n.id,"error"),Ie(`「${he(e)}」生成失败：${e.error}`),await hn(e,n.id))}l===n&&n.cards.includes(e)&&(ot(e),m.panel._id===e.id&&Se(e.id))}async function ao(e,t,n=null){if(e._ifPolling||l?.id!==t||!be()||!Qe(e)||!l.cards.includes(e)||!wn(e,t)||!e.job||e.status!=="running")return;e._ifPolling=!0;const o={job:e.job,request:e.if_request_id,started:e.if_started,cap:e.cap},r=()=>l?.id===t&&be()&&l.cards.includes(e)&&e.job===o.job&&e.if_request_id===o.request&&e.if_started===o.started&&e.cap===o.cap;let a=!1;try{const i=n||await sn(`/runs/${encodeURIComponent(e.job)}`);if(!r())return;Kt(e,i.result,t);const s=Zn(i.result);s&&(e.if_canvas_url=s);const c=e.history?.find(h=>h.job===e.job)?.prompts?.find(h=>h.key==="if_submitted");if(c&&typeof i.result?.submitted_prompt=="string"&&(c.text=i.result.submitted_prompt),i.state==="starting"||i.state==="running"){e.step=i.step||(i.state==="starting"?"本机 IF 正在准备生成任务":"IF 正在生成"),a=!0;return}if(i.state==="error")throw new Error((i.error||"IF 生成失败")+(i.result?.invalid_reference_indices?.length?"；已清除失效引用缓存，重试时仅重新上传失效素材":""));const u=i.result?.downloaded||[],f=xe(e).outputType,p=/请确认|确认后|回复["“]?确认/.test(i.result?.planning_text||"");if(!u.length)throw new Error(p?`IF 要求确认规划或故事板，未直接生成${Ve[f]}；请在 IF 网站查看该会话。`:`IF 未返回${Ve[f]}产物，请在 IF 网站查看该会话。`);const g=[];for(const[h,x]of u.entries()){if(x.type!==xe(e).outputType)continue;e.step=`正在取回 IF ${Ve[x.type]}产物（${h+1}/${u.length}）`,ot(e);const w=await we(`${Tt}/runs/${encodeURIComponent(e.job)}/media/${x.index}`,{credentials:"omit"});if(!w.ok)throw w.status>=500||w.status===429?new TypeError("IF 产物暂不可读取"):new Error("无法读取 IF 产物");const y=new File([await w.blob()],x.name);if(!r())return;e.step=`正在保存 IF ${Ve[x.type]}产物（${h+1}/${u.length}）`,ot(e);const M=await It(y,x.type==="image");if(!r())return;g.push({...M,filename:x.name})}if(!g.length)throw new Error(f==="video"&&u.some(h=>h.type==="image")?`IF 只生成了故事板图片，尚未生成视频${p?"，并要求确认下一步":""}；请在 IF 网站查看该会话。`:`IF 返回的媒体类型与当前${Ve[f]}节点不符，请在 IF 网站查看该会话。`);e.outputs=g,e.status="done",e.step="",e.error=null,e.ms=Date.now()-(e.if_started||Date.now()),Mr(e,{id:e.job,capability:e.if_job_cap||e.cap}),m.hist._id===e.id&&zr(e.id),Rt(e,t,"done"),await Ri(e)}catch(i){if(!r())return;i instanceof TypeError||/桥接请求失败|Failed to fetch/.test(i.message)?(e.step="IF 连接或产物读取中断，正在重试",a=!0):(e.status="error",e.error=i.message,e.step="",e.ms=Date.now()-(e.if_started||Date.now()),e.job&&Mr(e,{id:e.job,capability:e.if_job_cap||e.cap}),m.hist._id===e.id&&zr(e.id),Ie(`「${he(e)}」生成失败：${i.message}`))}finally{e._ifPolling=!1,r()&&(Rt(e,t,a?"running":e.status),ot(e),m.panel._id===e.id&&Se(e.id),a?ee(()=>ao(e,t),2500):["done","error"].includes(e.status)&&await hn(e,t))}}async function jl(e){if(!De())return;const t=l;if(gt(e))return ne("风格节点不用运行：它只把风格并进挂着的那几个节点的提示词");if(Ut(e))return pl(e);if(e.status==="queued"||e.status==="running")return;const n=xe(e);if(!n)return Ie("能力不可用");if(n.id==="image_composite"&&n.execution==="browser")return il(e);if(n.execution==="if_studio")return Ti(e);if(e.director_shot){if(Ye.cancelContentSave(),await Ye.pendingChain,!(await ur(l.id)).ok||!l.cards.includes(e))return;_t++,delete e.director_selected}e.job=null,e.queue_remaining=null,e.queue_ahead=null,e.error=null,e.progress=0,e.status="queued",e.outputs=[],e.ms=null,e.step="",ot(e),Se(e.id);try{if(await Xo(e),l!==t||!t.cards.includes(e)||!be())throw new Error("画布已切换或权限变化，未提交生成");const o=Na(e),r=await Vt("/api/generate",o);e.job=r.id,e.seed=r.seed,e.status=r.status,r.project_rev!=null&&l?.id===o.project&&(l.rev=Math.max(l.rev||0,r.project_rev))}catch(o){e.status="error",e.error=o.message,e.job=null,l===t&&Ye.markWorkFailure(o),Ie(`「${he(e)}」提交失败：${o.message}`)}e.director_shot&&(_t=Math.max(0,_t-1)),!(l!==t||!be())&&(ot(e),m.panel._id===e.id&&Se(e.id),K(!1),ea())}async function Nl(e){if(e.job)try{await Vt(`/api/job/${e.job}/cancel`)}catch(t){Ie(t.message)}}async function Ri(e){const t=l;tt();for(const n of t.edges.filter(o=>o.from===e.id&&!et(o)&&!o.version)){const o=t.cards.find(i=>i.id===n.to);if(!o)continue;const r=e.outputs||[],a=bn(n);n.slots=a;for(let i=0;i<a.length;i++){if(!r[i]){delete o.assets[a[i]];continue}try{const s=await ya(r[i],xe(o)?.execution==="browser");l===t&&t.edges.includes(n)&&at(o.id)&&(o.assets[a[i]]=s)}catch(s){console.error("导入产物失败:",s),l===t&&Ie(`向「${he(o)}」导入产物失败：${s.message}`)}}if(l!==t)return;Bn(o),Mt(o),m.panel._id===o.id&&Se(o.id)}}function Ml(e){return e.project?l&&e.project===l.id?l.name:(I.find(t=>t.id===e.project)||{}).name||e.projectName||"":e.projectName||""}async function Oi(e){if(!l||l.id!==e.project){if(!I.some(o=>o.id===e.project))return ne("这个任务所在的画布已经不在了");await vr(e.project)}const t=l.cards.find(o=>o.id===e.card);if(!t)return ne("这个节点片已经从画布上删掉了");const n=m.stage.getBoundingClientRect();j.x=n.width/2-(t.x+He(t)/2)*j.k,j.y=n.height/3-t.y*j.k,In(),ie=t.id,U.clear(),Xt=null,tt(!1);for(const o of l.cards)o._el&&o._el.classList.toggle("sel",o.id===t.id);Se(t.id),bt(),Pt(),en()}return L.bind({open:vr,refresh:wr,clear:Fn,selectSpace(e){Pe=e,l&&!Ba(l).includes(e)&&Fn(),ho()},renamed(e,t,n){l?.id===e&&(l.name=t,typeof n=="number"&&(l.rev=n),cn()),lt.renameProject(e,t)}}),b.onDispose(()=>{Vo++,lt.reset(),l=null,Ye.cancelTimers(),wo(),ka(),rr?.disconnect(),Yr()}),{ready:Da,flush:()=>Yn(void 0,!0),getProject:()=>l,nodeEditor:_?G.ChoukaNodeEditor:void 0}}function sd(b,k,N,L){const{window:J,document:q,addEventListener:G,setTimeout:d,clearTimeout:P,setInterval:ee,clearInterval:re,requestAnimationFrame:Fe,cancelAnimationFrame:We,ResizeObserver:Ne,MutationObserver:rt,IntersectionObserver:ze,URL:Z}=b;J.H3Auth=k,J.H3Notify=N;const oe=L.mediaFetch;return(()=>{const Ee=new Z("/",location.href),we=8192,S=32e6,E=100,B=512,R=64e6,$=64*1024*1024;let Q;const Ce=H=>JSON.parse(JSON.stringify(H)),Le=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),H=>H.toString(16).padStart(2,"0")).join(""),Me=(H,l)=>Number.isFinite(H)&&Number.isFinite(l)&&H>=1&&l>=1&&H<=we&&l<=we&&H*l<=S;function qe(H,l){if(!Me(H,l))throw new Error("图片或画布超出限制：单边 1–8192 像素，总像素不超过 3200 万。")}function $e(H){if(typeof H!="string"||!H||H.length>8192)throw new Error("图片地址无效。");const l=new Z(H,location.href),I=l.pathname==="/api/file"||/^\/api\/upload\/[^/]+$/.test(l.pathname)||/^\/api\/artifact\/[^/]+\/[^/]+$/.test(l.pathname);if(!/^https?:$/.test(l.protocol)||l.origin!==location.origin||l.username||l.password||!I||l.hash)throw new Error("仅支持本站受控媒体地址（/api/file、/api/upload/文件名、/api/artifact/项目/文件名）；不接受其他路径、外站、data 或 blob 地址。");if(l.searchParams.sort(),l.href.length>8192)throw new Error("图片地址过长。");return l.href}function Be(H){if(!H||H.kind!=="image")throw new Error("只能添加图片资产。");const l=JSON.stringify(H);if(l.length>262144)throw new Error("图片资产描述过大，请勿在编辑稿中嵌入图片数据。");const I=JSON.parse(l);return $e(I.url),I}function He(H){const l=I=>typeof I=="string"?I.trim().split(/[\\/]/).filter(Boolean).at(-1):"";return String(l(H.origin)||l(H.filename)||H.name||"图片").slice(0,200)}function X(H){const l=[`url:${$e(H.url)}`];if(typeof H.ref=="string"&&H.ref.trim()){if(H.ref.length>8192)throw new Error("图片资源标识过长。");l.push(`ref:${H.ref}`)}return l}function C(H){const l=JSON.stringify(H||{version:1,width:1920,height:1080,background:"transparent",layers:[]});if(l.length>2*1024*1024)throw new Error("编辑稿描述超过 2 MiB，请减少图层或资产元数据。");const I=JSON.parse(l);if(I.version!==1||!Array.isArray(I.layers)||I.layers.length>E)throw new Error("编辑稿版本或图层数量无效（最多 100 层）。");if(qe(I.width,I.height),!Number.isInteger(I.width)||!Number.isInteger(I.height))throw new Error("画布尺寸必须为整数像素。");if(I.background!=="transparent"&&!/^#[a-f\d]{6}$/i.test(I.background))throw new Error("背景必须为透明或六位十六进制颜色。");const ue=new Set;I.layers=I.layers.map(j=>{if(!j||typeof j.id!="string"||!j.id||ue.has(j.id))throw new Error("图层 ID 无效或重复。");if(ue.add(j.id),qe(j.width,j.height),![j.x,j.y,j.angle,j.opacity].every(Number.isFinite)||Math.abs(j.x)>1e5||Math.abs(j.y)>1e5||Math.abs(j.angle)>36e3||j.opacity<0||j.opacity>1)throw new Error("图层位置、角度或透明度无效。");return{id:j.id,name:String(j.name||"图片").slice(0,200),asset:Be(j.asset),x:j.x,y:j.y,width:j.width,height:j.height,angle:j.angle,opacity:j.opacity,visible:j.visible!==!1,locked:!!j.locked}});const Pe={version:1,width:I.width,height:I.height,background:I.background,layers:I.layers};if(I.linkedSources!==void 0){if(!Array.isArray(I.linkedSources)||I.linkedSources.length>B||I.linkedSources.some(j=>typeof j!="string"||!j||j.length>8196))throw new Error("已连接图片记录无效（最多 512 条有界资源标识）。");Pe.linkedSources=[...new Set(I.linkedSources)]}return Pe}async function _(H){const l=new Uint8Array(await H.slice(0,1048576).arrayBuffer()),I=new DataView(l.buffer),ue=(ie,U)=>String.fromCharCode(...l.subarray(ie,ie+U));let Pe,j;if(l.length>=24&&ue(1,3)==="PNG"&&I.getUint32(0)===2303741511)Pe=I.getUint32(16),j=I.getUint32(20);else if(l.length>=10&&/^GIF8[79]a$/.test(ue(0,6)))Pe=I.getUint16(6,!0),j=I.getUint16(8,!0);else if(l.length>=26&&ue(0,2)==="BM")I.getUint32(14,!0)===12?(Pe=I.getUint16(18,!0),j=I.getUint16(20,!0)):(Pe=I.getInt32(18,!0),j=Math.abs(I.getInt32(22,!0)));else if(l.length>=30&&ue(0,4)==="RIFF"&&ue(8,4)==="WEBP")for(let ie=12;ie+18<=l.length;){const U=ue(ie,4),St=I.getUint32(ie+4,!0),st=ie+8;if(U==="VP8X"){Pe=1+l[st+4]+(l[st+5]<<8)+(l[st+6]<<16),j=1+l[st+7]+(l[st+8]<<8)+(l[st+9]<<16);break}if(U==="VP8 "&&l[st+3]===157&&l[st+4]===1&&l[st+5]===42){Pe=I.getUint16(st+6,!0)&16383,j=I.getUint16(st+8,!0)&16383;break}if(U==="VP8L"&&l[st]===47){Pe=1+l[st+1]+((l[st+2]&63)<<8),j=1+(l[st+2]>>6)+(l[st+3]<<2)+((l[st+4]&15)<<10);break}ie=st+St+St%2}else if(l[0]===255&&l[1]===216){let ie=2;for(;ie+8<l.length&&l[ie++]===255;){for(;l[ie]===255;)ie++;const U=l[ie++];if(U===217||U===218)break;if(U===1||U>=208&&U<=215)continue;const St=I.getUint16(ie);if(St<2)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(U)){j=I.getUint16(ie+3),Pe=I.getUint16(ie+5);break}ie+=St}}if(Pe===void 0||j===void 0)throw new Error("无法安全识别图片尺寸。请使用标准 PNG、JPEG、WebP、GIF 或 BMP 图片（不支持 SVG / AVIF）。");return qe(Pe,j),{width:Pe,height:j}}async function V(H){const l=H.body.getReader(),I=[];let ue=0;try{for(;;){const Pe=await l.read();if(Pe.done)break;if(ue+=Pe.value.byteLength,ue>$)throw await l.cancel(),new Error("图片文件不得超过 64 MiB。");I.push(Pe.value)}}finally{l.releaseLock()}return new Blob(I,{type:H.headers.get("content-type")?.split(";")[0]||""})}function ce(){return Q||(Q=(async()=>{if((!J.fabric||J.fabric.version!=="7.4.0")&&await new Promise((H,l)=>{const I=q.createElement("script");I.src=new Z("vendor/fabric.min.js",Ee).href,I.onload=H,I.onerror=()=>{I.remove(),l(new Error("本地 Fabric 加载失败，请刷新重试。"))},q.head.append(I)}),J.fabric?.version!=="7.4.0")throw new Error("需要 Fabric 7.4.0 浏览器构建。")})().catch(H=>{throw Q=null,H}),Q)}function A(H,l,I){const ue=q.createElement(H);return l&&(ue.className=l),I!==void 0&&(ue.textContent=I),ue}async function F({state:H,sources:l=[],linkedSources:I=[],upload:ue,onSave:Pe,onExport:j,canEdit:ie=()=>!0}={}){const U=A("dialog","chouka-composer image-composer-dialog");U.setAttribute("data-image-composer","");const St=`composer-${Le()}`;U.setAttribute("aria-labelledby",St);const st=A("div","ic-head"),Sn=A("h2","","图片合成");Sn.id=St;const dn=A("button","ic-button","关闭");dn.type="button",dn.dataset.composerAction="close";const $t=A("button","ic-button","重试载入");$t.type="button",$t.hidden=!0,st.append(Sn,A("span","ic-local","浏览器本地合成 · 原图尺寸输出"),$t,dn);const Qt=A("div","ic-status");Qt.setAttribute("role","status"),Qt.setAttribute("aria-live","polite");const Ft=A("div","ic-error");Ft.setAttribute("role","alert"),Ft.hidden=!0;const An=A("div","ic-body"),_t=A("aside","ic-left"),Dt=A("section","ic-center"),qt=A("aside","ic-right");_t.setAttribute("aria-label","图层和图片素材"),Dt.setAttribute("aria-label","合成画布"),qt.setAttribute("aria-label","图片与画布属性");const m=A("div","ic-toolbar"),Ye=A("div","ic-viewport"),en=A("canvas");en.setAttribute("aria-label","图片合成编辑画布"),Ye.append(en),Dt.append(m,Ye,A("p","ic-hint","拖动图片移动，拖动角点缩放。方向键移动 1px，Shift + 方向键移动 10px。"));const K=A("div","ic-footer"),ur=A("span","ic-hint","编辑稿仅保存图片引用；合成 PNG 不包含选择框。");An.append(_t,Dt,qt),K.append(ur),U.append(st,Qt,Ft,An,K),q.body.append(U);const Yn=q.activeElement;let D,Je,lt=null,pt=!1,pn=!1,Vn=!1,$n="",Pt=[],jn=-1,be,on,fr=0,De=1,mr=!0,It=null,kt=!1;const Fn=new AbortController,cn=new Map,yn=new Map,Vt=()=>J.fabric,dt=()=>{try{return ie()===!0}catch(v){return Ie(v),!1}};function Ie(v){Ft.textContent=v?.message||String(v),Ft.hidden=!1,console.error("[图片合成]",v)}function hr(){Ft.hidden=!0,Ft.textContent=""}function ne(){return pn||pt||!Vn?!1:dt()?!0:(Qt.textContent="只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。",Ct(),!1)}function Bt(v,T,z,se=""){const pe=A("button",`ic-button ${se}`,T);pe.type="button",v.append(pe);const fe={撤销:"undo",重做:"redo",适应窗口:"fit",缩小:"zoom-out",放大:"zoom-in","上传图片（支持多选）":"upload",保存编辑稿:"save","合成 PNG":"export",上移:"raise",下移:"lower",置顶:"front",置底:"back",复制:"duplicate",删除:"delete"}[T];return fe&&(pe.dataset.composerAction=fe),pe.addEventListener("click",()=>{if(ne())try{const Oe=z();Oe?.catch&&Oe.catch(Ie)}catch(Oe){Ie(Oe)}}),pe}function un(v,T,z="number",se={}){const pe=A("label","ic-field"),fe=A("span","",T),Oe=A("input");return Oe.type=z,Object.assign(Oe,se),pe.append(fe,Oe),v.append(pe),Oe}function Ct(){if(pn)return;const v=dt(),T=pt||!Vn||!v;for(const z of U.querySelectorAll("button,input"))z!==dn&&z!==$t&&(z.disabled=T||z.dataset.inactive==="1");dn.disabled=pt,$t.disabled=pt||!v,U.setAttribute("aria-busy",String(pt)),Je&&(Je.skipTargetFind=T,Je.selection=!1,Je.upperCanvasEl.style.pointerEvents=T?"none":"",Je.upperCanvasEl.tabIndex=T?-1:0),v||(Qt.textContent="只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。")}async function Ve(v,T){if(ne()){pt=!0,hr(),Qt.textContent=v,Ct();try{return await T()}catch(z){pn||Ie(z)}finally{pt=!1,pn||(Qt.textContent=dt()?Ft.hidden?"就绪 · 更改仅在保存编辑稿后持久化":"操作未完成，请检查提示后重试":"只读：当前工具卡已失效。仅可关闭。",gt())}}}async function Nn(v){const T=$e(v.url);if(cn.has(T))return cn.get(T);const z=await oe(T,{credentials:"same-origin",redirect:"error",signal:Fn.signal});if(!z.ok)throw new Error(`图片读取失败（HTTP ${z.status}）。`);if(Number(z.headers.get("content-length"))>$)throw new Error("图片文件不得超过 64 MiB。");const se=await V(z);if(se.size>$||!/^image\/(png|jpeg|webp|gif|bmp|x-ms-bmp)$/i.test(se.type))throw new Error("仅支持 PNG、JPEG、WebP、GIF、BMP 图片，单文件最多 64 MiB；不支持 SVG / AVIF。");const pe=await _(se);if(fr+pe.width*pe.height>R)throw new Error("已载入图片总像素超过 6400 万，请关闭后使用较小图片重新编辑。");const fe=await createImageBitmap(se);try{if(qe(fe.width,fe.height),fr+fe.width*fe.height>R)throw new Error("已载入图片总像素超过 6400 万，请关闭后使用较小图片重新编辑。")}catch(Oe){throw fe.close(),Oe}if(pn)throw fe.close(),new Error("合成器已关闭。");return fr+=fe.width*fe.height,cn.set(T,fe),fe}function jt(v){const T=cn.get($e(v.asset.url));if(!T)throw new Error("图片尚未载入。");const z=new(Vt()).FabricImage(T,{originX:"left",originY:"top",left:v.x,top:v.y,angle:v.angle,scaleX:v.width/T.width,scaleY:v.height/T.height,opacity:v.opacity,visible:v.visible,selectable:!v.locked,evented:!v.locked,lockScalingFlip:!0,objectCaching:!1,cornerColor:"#a0e7cb",borderColor:"#a0e7cb",transparentCorners:!1,cornerSize:12,padding:0});return z.composerId=v.id,z.setControlsVisibility({ml:!Kt.checked,mr:!Kt.checked,mt:!Kt.checked,mb:!Kt.checked}),z}function Et(v){const T=$e(v.url),z=A("span","ic-thumbnail"),se=cn.get(T);if(z.setAttribute("aria-hidden","true"),z.draggable=!1,se){const pe=A("canvas"),fe=Math.min(1,220/se.width,120/se.height);pe.draggable=!1,pe.width=Math.max(1,Math.round(se.width*fe)),pe.height=Math.max(1,Math.round(se.height*fe)),pe.getContext("2d").drawImage(se,0,0,pe.width,pe.height),z.append(pe)}else{const pe=A("img");pe.alt="",pe.loading="lazy",pe.decoding="async",pe.draggable=!1;const fe=new Z(T);pe.src=/^\/api\/(upload|artifact)\//.test(fe.pathname)?`/api/thumbnail?url=${encodeURIComponent(fe.pathname+fe.search)}`:T,z.append(pe)}return z}function ct(){return D?.layers.find(v=>v.id===lt)}function an(){if(!Je||!D)return;kt=!0,Je.discardActiveObject();for(const z of Je.getObjects())Je.remove(z),z.dispose();yn.clear(),Je.backgroundColor=D.background==="transparent"?"":D.background;for(const z of D.layers){const se=jt(z);Je.add(se),yn.set(z.id,se)}const v=ct(),T=yn.get(lt);T&&v.visible&&!v.locked&&Je.setActiveObject(T),kt=!1,mn(),gt(),Je.requestRenderAll()}function Kn(){const v=JSON.stringify(D);if(Pt[jn]===v){gt();return}Pt.splice(jn+1),Pt.push(v),Pt.length>60&&Pt.shift(),jn=Pt.length-1,gt()}function Tt(v){if(!ne()||!D)return;const T=Ce(D);try{v(),D=C(D),an(),Kn(),hr()}catch(z){D=T,an(),Ie(z)}}function fn(v){const T=jn+v;if(T<0||T>=Pt.length)return;const z=D.linkedSources;D=JSON.parse(Pt[T]),z&&(D.linkedSources=[...new Set([...D.linkedSources||[],...z])]),jn=T,Pt[T]=JSON.stringify(D),an()}function mn(){if(!Je||!D||pn)return;const v=Math.max(80,Ye.clientWidth-32),T=Math.max(80,Ye.clientHeight-32);mr&&(De=Math.min(v/D.width,T/D.height,1)),De=Math.max(.01,Math.min(De,2,4096/Math.max(D.width,D.height),Math.sqrt(8e6/(D.width*D.height)))),Je.setDimensions({width:Math.max(1,Math.round(D.width*De)),height:Math.max(1,Math.round(D.height*De))}),Je.setViewportTransform([De,0,0,De,0,0]),Or.textContent=`${Math.round(De*100)}% · ${D.width} × ${D.height} px`}const lo=Bt(m,"撤销",()=>fn(-1)),Gn=Bt(m,"重做",()=>fn(1));Bt(m,"适应窗口",()=>{mr=!0,mn()}),Bt(m,"缩小",()=>{mr=!1,De/=1.25,mn()}),Bt(m,"放大",()=>{mr=!1,De*=1.25,mn()});const Or=A("span","ic-zoom");m.append(Or),_t.append(A("h3","","图层"),A("p","ic-hint","从上到下为顶层到底层，可拖动排序"));const Mn=A("div","ic-layers");Mn.setAttribute("aria-label","图层列表"),_t.append(Mn);const Qe=A("div","ic-layer-actions");_t.append(Qe);const sn=[];function zn(v,T){const z=Bt(Qe,v,()=>ct()&&T());return sn.push(z),z}function Ln(v){Tt(()=>{const T=D.layers.findIndex(se=>se.id===lt),[z]=D.layers.splice(T,1);D.layers.splice(Math.max(0,Math.min(v,D.layers.length)),0,z)})}zn("上移",()=>Ln(D.layers.findIndex(v=>v.id===lt)+1)),zn("下移",()=>Ln(D.layers.findIndex(v=>v.id===lt)-1)),zn("置顶",()=>Ln(D.layers.length-1)),zn("置底",()=>Ln(0)),zn("复制",()=>Tt(()=>{if(D.layers.length>=E)throw new Error("最多添加 100 个图层。");const v=Ce(ct());v.id=Le(),v.name=`${v.name} 副本`,v.x+=20,v.y+=20,D.layers.splice(D.layers.findIndex(T=>T.id===lt)+1,0,v),lt=v.id})),zn("删除",()=>Tt(()=>{D.layers=D.layers.filter(v=>v.id!==lt),lt=null})),_t.append(A("h3","","添加图片"));const Ar=Bt(_t,"上传图片（支持多选）",()=>Ht.click()),Ht=A("input","ic-file");Ht.type="file",Ht.multiple=!0,Ht.accept="image/png,image/jpeg,image/webp,image/gif,image/bmp",Ht.hidden=!0,_t.append(Ht),_t.append(A("p","ic-hint","可拖入文件或粘贴图片。单边 ≤8192px，总像素 ≤3200万，文件 ≤64MiB。"));const Zn=A("div","ic-sources");_t.append(Zn),qt.append(A("h3","","画布"));const gr=A("div","ic-field-grid");qt.append(gr);const br=un(gr,"画布宽度 / px","number",{min:1,max:we,step:1}),xr=un(gr,"画布高度 / px","number",{min:1,max:we,step:1});br.dataset.composerField="canvas-width",xr.dataset.composerField="canvas-height";const Dn=A("div","ic-background");qt.append(Dn);const wn=un(Dn,"透明背景","checkbox");wn.parentElement.classList.add("ic-switch");const Rt=un(Dn,"背景颜色","color");br.addEventListener("change",()=>Tt(()=>{D.width=Number(br.value)})),xr.addEventListener("change",()=>Tt(()=>{D.height=Number(xr.value)})),wn.addEventListener("change",()=>Tt(()=>{D.background=wn.checked?"transparent":Rt.value})),Rt.addEventListener("change",()=>Tt(()=>{D.background=Rt.value})),qt.append(A("h3","","所选图层"));const Qn=un(qt,"名称","text",{maxLength:200}),hn=A("div","ic-field-grid");qt.append(hn);const Fr={};for(const[v,T,z,se]of[["x","X / px",-1e5,1e5],["y","Y / px",-1e5,1e5],["width","宽度 / px",1,we],["height","高度 / px",1,we],["angle","角度 / °",-36e3,36e3],["opacity","透明度 / %",0,100]]){const pe=un(hn,T,"number",{min:z,max:se,step:v==="opacity"?1:.1});Fr[v]=pe,pe.dataset.composerField=v,pe.addEventListener("change",()=>Tt(()=>{const fe=ct();if(!fe||fe.locked)return;const Oe=Number(pe.value);if(pe.value.trim()===""||!Number.isFinite(Oe))throw new Error("请输入有效数值。");if(Kt.checked&&(v==="width"||v==="height")){const it=v==="width"?"height":"width";fe[it]*=Oe/fe[v]}fe[v]=v==="opacity"?Oe/100:Oe}))}const Kt=un(qt,"锁定宽高比","checkbox",{checked:!0});Kt.parentElement.classList.add("ic-switch"),Kt.addEventListener("change",()=>{if(ne()){Je.uniformScaling=Kt.checked;for(const v of yn.values())v.setControlsVisibility({ml:!Kt.checked,mr:!Kt.checked,mt:!Kt.checked,mb:!Kt.checked});Je.requestRenderAll()}}),Qn.addEventListener("change",()=>Tt(()=>{const v=ct();v&&!v.locked&&(v.name=Qn.value||"图片")})),qt.append(A("p","ic-hint","X / Y 是图片未旋转时的左上角原点。锁定图层后，需先解锁才能修改属性或在画布移动。"));const po=Bt(K,"保存编辑稿",ut,"ic-primary"),he=Bt(K,"合成 PNG",ft,"ic-primary");function gt(){if(!D||pn){Ct();return}const v=ct();br.value=D.width,xr.value=D.height,wn.checked=D.background==="transparent",wn.checked||(Rt.value=D.background),Qn.value=v?.name||"",Qn.dataset.inactive=!v||v.locked?"1":"0";for(const[z,se]of Object.entries(Fr))se.value=v?String(Math.round(v[z]*(z==="opacity"?100:1)*1e3)/1e3):"",se.dataset.inactive=!v||v.locked?"1":"0";lo.dataset.inactive=jn<=0?"1":"0",Gn.dataset.inactive=jn>=Pt.length-1?"1":"0";for(const z of sn)z.dataset.inactive=!v||v.locked?"1":"0";Ar.dataset.inactive=typeof ue!="function"?"1":"0",po.dataset.inactive=typeof Pe!="function"?"1":"0",he.dataset.inactive=typeof j!="function"?"1":"0",Sn.textContent=`图片合成${JSON.stringify(D)!==$n?" · 未保存":""}`;const T=Mn.contains(q.activeElement);Mn.replaceChildren(),D.layers.length||Mn.append(A("p","ic-empty","尚无图层。上传图片，或从下方画布素材中选择添加。"));for(const z of[...D.layers].reverse()){const se=A("div",`ic-layer${lt===z.id?" is-selected":""}`);se.draggable=!pt&&dt(),se.dataset.layerId=z.id;const pe=He(z.asset),fe=A("button","ic-layer-name");fe.type="button",fe.title=pe,fe.dataset.layerAction="select",fe.append(Et(z.asset),A("span","ic-asset-name",pe)),fe.setAttribute("aria-pressed",String(lt===z.id)),fe.disabled=pt||!dt(),fe.addEventListener("click",()=>{ne()&&(lt=z.id,kt=!0,Je.discardActiveObject(),!z.locked&&z.visible&&Je.setActiveObject(yn.get(z.id)),kt=!1,Je.requestRenderAll(),gt())});const Oe=A("button","ic-layer-toggle",z.visible?"隐藏":"显示");Oe.type="button",Oe.setAttribute("aria-label",`${z.visible?"隐藏":"显示"} ${z.name}`),Oe.setAttribute("aria-pressed",String(z.visible)),Oe.dataset.layerAction="visible",Oe.title=Oe.getAttribute("aria-label");const it=A("button","ic-layer-toggle",z.locked?"解锁":"锁定");it.type="button",it.setAttribute("aria-label",`${z.locked?"解锁":"锁定"} ${z.name}`),it.setAttribute("aria-pressed",String(z.locked)),it.dataset.layerAction="lock",it.title=it.getAttribute("aria-label"),Oe.disabled=it.disabled=pt||!dt(),Oe.addEventListener("click",()=>Tt(()=>{z.visible=!z.visible})),it.addEventListener("click",()=>Tt(()=>{z.locked=!z.locked})),se.addEventListener("dragstart",nn=>{if(!ne()){nn.preventDefault();return}It=z.id,nn.dataTransfer.effectAllowed="move",nn.dataTransfer.setData("application/x-chouka-layer",z.id)}),se.addEventListener("dragover",nn=>{It&&ne()&&(nn.preventDefault(),nn.dataTransfer.dropEffect="move",se.classList.add("is-dragover"))}),se.addEventListener("dragleave",()=>se.classList.remove("is-dragover")),se.addEventListener("dragend",()=>{It=null,se.classList.remove("is-dragover")}),se.addEventListener("drop",nn=>{if(!It)return;nn.preventDefault(),nn.stopPropagation();const Dr=It;It=null,Tt(()=>{const qr=D.layers.findIndex(yr=>yr.id===z.id),Br=D.layers.findIndex(yr=>yr.id===Dr);if(Br<0||qr<0||Br===qr)return;const[co]=D.layers.splice(Br,1);D.layers.splice(qr,0,co),lt=Dr})});const Ot=A("div","ic-layer-controls");Ot.append(Oe,it),se.append(fe,Ot),Mn.append(se)}Ct(),T&&!pt&&Je?.upperCanvasEl.focus({preventScroll:!0})}async function er(v,T){if(D.layers.length+v.length>E)throw new Error("最多添加 100 个图层。");const z=[];for(const se of v){if(!dt())throw new Error("编辑权限已失效，未添加图片。");const pe=Be(se),fe=await Nn(pe);if(!dt())throw new Error("编辑权限已失效，未添加图片。");const Oe=Math.max(1/Math.min(fe.width,fe.height),Math.min(1,D.width/fe.width,D.height/fe.height));z.push({id:Le(),name:He(pe),asset:pe,x:0,y:0,width:fe.width*Oe,height:fe.height*Oe,angle:0,opacity:1,visible:!0,locked:!1})}if(!dt())throw new Error("编辑权限已失效，未添加图片。");D=C({...D,...T?{linkedSources:T}:{},layers:D.layers.concat(z)}),lt=z.at(-1)?.id||lt,an(),Kn()}async function qn(){if(!Array.isArray(I)||I.length>B)throw new Error("已连接图片列表无效或过多（最多 512 项）。");if(!I.length)return;const v=new Set(D.linkedSources||[]),T=new Set(v),z=new Set,se=[];for(const pe of D.layers)for(const fe of X(pe.asset))z.add(fe);for(const pe of I){const fe=Be(pe),Oe=X(fe);if(Oe.some(it=>T.has(it)||z.has(it)))for(const it of Oe)T.add(it);Oe.some(it=>v.has(it)||z.has(it))||se.push(fe);for(const it of Oe)v.add(it);if(v.size>B)throw new Error("已连接图片记录已达 512 条上限，请使用“添加图片”手动添加新素材。")}if(!dt())throw new Error("编辑权限已失效，未添加图片。");T.size!==(D.linkedSources||[]).length&&(D=C({...D,linkedSources:[...T]}),Kn()),await er(se,[...v])}async function et(v){if(!/^image\/(png|jpeg|webp|gif|bmp|x-ms-bmp)$/i.test(v.type)||!v.size||v.size>$)throw new Error(`${v.name||"粘贴文件"}：仅支持常见位图格式，且文件需在 64 MiB 以内。`);await _(v);const T=await createImageBitmap(v);try{qe(T.width,T.height)}finally{T.close()}}function Ut(v){const T=Array.from(v||[]);if(T.length)return Ve("正在检查和上传图片，请勿关闭…",async()=>{if(typeof ue!="function")throw new Error("尚未配置图片上传回调。");if(D.layers.length+T.length>E)throw new Error("最多添加 100 个图层。");for(const se of T)await et(se);const z=[];for(const se of T){if(!dt())throw new Error("编辑权限已失效，已停止上传。");const pe=await ue(se);if(!dt())throw new Error("编辑权限已失效，未采用晚到的上传结果。");z.push(Be(pe))}await er(z)})}Ht.addEventListener("change",()=>{const v=Array.from(Ht.files);Ht.value="",Ut(v)}),U.addEventListener("paste",v=>{if(v.stopPropagation(),v.target.closest('input,textarea,[contenteditable="true"]'))return;const T=Array.from(v.clipboardData?.files||[]);T.length&&(v.preventDefault(),Ut(T))}),U.addEventListener("dragover",v=>{v.stopPropagation(),v.dataTransfer.types.includes("Files")&&(v.preventDefault(),v.dataTransfer.dropEffect=pt||!dt()?"none":"copy")}),U.addEventListener("drop",v=>{v.stopPropagation(),v.preventDefault(),v.dataTransfer.files.length&&Ut(v.dataTransfer.files)}),U.addEventListener("keydown",v=>{if(v.stopPropagation(),v.target.closest('input,textarea,select,[contenteditable="true"]')||v.isComposing)return;const T=v.ctrlKey||v.metaKey,z=v.key.toLowerCase();if(T&&(z==="z"||z==="y")){v.preventDefault(),ne()&&fn(z==="y"||v.shiftKey?1:-1);return}if(z==="delete"||z==="backspace"){v.preventDefault(),ct()&&!ct().locked&&Tt(()=>{D.layers=D.layers.filter(pe=>pe.id!==lt),lt=null});return}const se={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[v.key];se&&(v.preventDefault(),ct()&&!ct().locked&&Tt(()=>{const pe=ct(),fe=v.shiftKey?10:1;pe.x+=se[0]*fe,pe.y+=se[1]*fe}))});for(const v of["keyup","keypress","copy","cut","pointerdown","pointerup","click","dblclick","wheel"])U.addEventListener(v,T=>T.stopPropagation());async function ut(){await Ve("正在保存编辑稿，请勿关闭…",async()=>{const v=C(D);if(!dt())throw new Error("编辑权限已失效，未保存。");await Pe(Ce(v)),dt()&&($n=JSON.stringify(v))})}async function ft(){await Ve("正在合成原尺寸 PNG，请勿关闭…",async()=>{const v=C(D),T=q.createElement("canvas");let z;try{z=new(Vt()).StaticCanvas(T,{width:v.width,height:v.height,enableRetinaScaling:!1,renderOnAddRemove:!1,backgroundColor:v.background==="transparent"?"":v.background});for(const pe of v.layers)pe.visible&&z.add(jt(pe));z.renderAll();const se=await new Promise((pe,fe)=>T.toBlob(Oe=>Oe?pe(Oe):fe(new Error("PNG 编码失败，可能内存不足。")),"image/png"));if(!dt())throw new Error("编辑权限已失效，未提交合成结果。");await j(se,Ce(v)),$n=JSON.stringify(v)}finally{try{z&&await z.dispose()}finally{T.width=T.height=0}}})}async function gn(v=!1){const T=v===!0;if(pn||pt&&!T||!T&&D&&JSON.stringify(D)!==$n&&!J.confirm("编辑稿有未保存的更改，确定关闭并放弃这些更改吗？"))return!1;pn=!0,Fn.abort(),be?.disconnect(),re(on),U.open&&U.close();try{Je&&await Je.dispose()}catch(z){console.error("[图片合成] 画布释放失败",z)}finally{for(const z of cn.values())z.close();cn.clear(),yn.clear(),Pt.length=0,U.remove(),Yn?.isConnected&&Yn.focus({preventScroll:!0})}return!0}dn.addEventListener("click",gn),U.addEventListener("cancel",v=>{v.preventDefault(),v.stopPropagation(),gn()}),U.showModal(),dn.focus();async function tn(){if(!(pt||pn)){pt=!0,Vn=!1,hr(),$t.hidden=!0,Qt.textContent="正在载入图片合成器…",Ct();try{if(await ce(),Je||(Je=new(Vt()).Canvas(en,{enableRetinaScaling:!1,selection:!1,preserveObjectStacking:!0,uniformScaling:!0,uniScaleKey:null,renderOnAddRemove:!1}),Je.upperCanvasEl.tabIndex=0,Je.upperCanvasEl.setAttribute("aria-label","图片合成编辑画布，使用方向键移动所选图层"),Je.on("mouse:down",()=>{!pt&&dt()&&Je.upperCanvasEl.focus({preventScroll:!0})}),Je.on("selection:created",v=>{!kt&&!pt&&dt()&&(lt=v.selected?.[0]?.composerId||null,gt())}),Je.on("selection:updated",v=>{!kt&&!pt&&dt()&&(lt=v.selected?.[0]?.composerId||null,gt())}),Je.on("selection:cleared",()=>{!kt&&!pt&&dt()&&(lt=null,gt())}),Je.on("object:modified",v=>{if(kt)return;if(!ne()){an();return}const T=v.target,z=D.layers.find(pe=>pe.id===T?.composerId);if(!z||z.locked){an();return}const se=Ce(D);try{Object.assign(z,{x:T.left,y:T.top,width:T.width*T.scaleX,height:T.height*T.scaleY,angle:T.angle}),D=C(D),Kn()}catch(pe){D=se,an(),Ie(pe)}})),!D){const v=C(H);for(const T of v.layers){if(!dt())throw new Error("只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。");await Nn(T.asset)}if(!dt())throw new Error("只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。");D=v,$n=JSON.stringify(D),Pt=[],jn=-1,an(),Kn()}Vn=!0;try{await qn()}catch(v){Ie(v),$t.hidden=!1}Zn.replaceChildren();for(const v of l)try{const T=Be(v),z=He(T),se=Bt(Zn,"",()=>Ve("正在添加画布图片…",()=>er([T])));se.title=z,se.setAttribute("aria-label",`添加 ${z}`),se.append(Et(T),A("span","ic-asset-name",z))}catch(T){Ie(T)}l.length||Zn.append(A("p","ic-hint","当前画布没有可用的图片素材。")),be?.disconnect(),be=new Ne(mn),be.observe(Ye)}catch(v){Ie(v),Vn=!1,$t.hidden=!1}finally{pt=!1,Qt.textContent=Ft.hidden?"就绪 · 添加图片开始合成":"载入存在问题，请检查提示；可重试载入或关闭。",gt()}}}return b.onDispose(()=>{gn(!0)}),$t.addEventListener("click",()=>{dt()&&tn()}),on=ee(Ct,500),await tn(),{close:gn}}J.ChoukaImageComposer={open:F}})(),J.ChoukaImageComposer}const ld=Rl.extend({selectedId:La().nullable(),selectedSpace:La(),user:Fl.nullable()});function dd(b){const k=Zi({projects:[],teams:[],selectedId:null,selectedSpace:"personal",user:null,busy:!1,error:""});let N;async function L(q){if(!k.getSnapshot().busy){k.set({...k.getSnapshot(),busy:!0,error:""});try{await q()}catch(G){k.set({...k.getSnapshot(),error:Rr(G)})}finally{k.set({...k.getSnapshot(),busy:!1})}}}const J=q=>q.permission==="operate"&&!q.locked;return{state:k,service:b,bind(q){N=q},update(q){const G=ld.parse(q);k.set({...k.getSnapshot(),...G})},selectSpace(q){N?.selectSpace(q)},open(q){return L(async()=>{await N?.open(q)})},create(){return L(async()=>{const q=k.getSnapshot();if(q.selectedSpace==="shared")throw new Error("共享给我的空间不能新建画布，请选择个人空间或项目组");const G=q.selectedSpace.startsWith("team:")?q.selectedSpace.slice(5):null,d=G?q.teams.find(re=>re.id===G)?.name:"个人空间",P=window.prompt(`在「${d||"项目组"}」新建画布`,"新项目 "+new Date().toLocaleDateString("zh-CN"));if(P===null)return;const ee=await b.create(P,G);await N?.refresh(),await N?.open(ee.id)})},rename(q){return L(async()=>{if(!J(q))throw new Error("此画布不可修改");const G=window.prompt("修改项目名",q.name);if(G===null)return;const d=G.trim();if(!d)throw new Error("项目名不能为空");const P=Dl({name:La(),rev:ql()}).parse(await b.rename(q.id,d));N?.renamed(q.id,P.name,P.rev),await N?.refresh()})},remove(q){return L(async()=>{if(!J(q))throw new Error("此画布不可修改");window.confirm(`删除项目「${q.name}」？（文件会保留为 .deleted）`)&&(await b.remove(q.id),k.getSnapshot().selectedId===q.id&&N?.clear(),await N?.refresh())})},async refresh(){await N?.refresh()},spaces(q){const G=k.getSnapshot();return Tl(q,G.user?.id,G.teams)}}}function pd({project:b,host:k,onClose:N}){const L=Zt.useRef(null),[J,q]=Zt.useState(),[G,d]=Zt.useState([]),[P,ee]=Zt.useState([]),[re,Fe]=Zt.useState(""),[We,Ne]=Zt.useState(!1);Zt.useEffect(()=>{let ze=!0;return L.current?.showModal(),k.service.shares(b.id).then(Z=>{ze&&(q(Z),d(Z.user_ids),ee(Z.team_ids))}).catch(Z=>{ze&&Fe(Rr(Z))}),()=>{ze=!1}},[k,b.id]);const rt=(ze,Z,oe,Ee)=>Ee(Z?[...oe,ze]:oe.filter(we=>we!==ze));return ve.jsx("dialog",{ref:L,className:"auth-dialog project-share-dialog",onCancel:N,children:ve.jsxs("form",{onSubmit:async ze=>{ze.preventDefault(),Ne(!0),Fe("");try{await k.service.share(b.id,G,P),await k.refresh(),N()}catch(Z){Fe(Rr(Z))}finally{Ne(!1)}},children:[ve.jsxs("h2",{children:["分享「",b.name,"」"]}),ve.jsx("p",{className:"auth-note",children:"被选中的个人或项目组成员可以共同查看、编辑和运行这张画布。画布仍保留在你的个人空间。"}),ve.jsx("div",{className:"share-columns",children:["users","teams"].map(ze=>ve.jsxs("section",{className:"share-targets",children:[ve.jsx("h3",{children:ze==="users"?"个人":"项目组"}),ve.jsxs("div",{className:"share-target-list",children:[J?.[ze].map(Z=>ve.jsxs("label",{className:"share-target",children:[ve.jsx("input",{type:"checkbox",checked:(ze==="users"?G:P).includes(Z.id),onChange:oe=>rt(Z.id,oe.target.checked,ze==="users"?G:P,ze==="users"?d:ee)}),ve.jsxs("span",{children:[Z.name||Z.username,Z.display_name?`（${Z.display_name}）`:""]})]},Z.id)),J?.[ze].length===0&&ve.jsx("p",{className:"auth-note",children:"暂无可分享对象"})]})]},ze))}),ve.jsx("p",{role:"alert",children:re}),ve.jsxs("footer",{children:[ve.jsx("button",{type:"button",className:"btn",onClick:N,children:"取消"}),ve.jsx("button",{className:"btn primary",disabled:!J||We,children:We?"保存中…":"确定分享"})]})]})})}function cd({host:b}){const k=Zt.useSyncExternalStore(b.state.subscribe,b.state.getSnapshot),[N,L]=Zt.useState(),J=[{value:"personal",label:"个人空间"},...k.projects.some(P=>b.spaces(P).includes("shared"))?[{value:"shared",label:"共享给我的画布"}]:[],...k.teams.map(P=>({value:`team:${P.id}`,label:P.name}))],q=k.projects.filter(P=>b.spaces(P).includes(k.selectedSpace)),G=new Map;for(const P of q){const ee=k.selectedSpace==="shared"?String(P.owner_id):"";G.set(ee,[...G.get(ee)||[],P])}const d=P=>{const ee=P.permission==="operate"&&!P.locked,re=k.selectedSpace==="personal"&&!P.team_id&&String(P.owner_id)===String(k.user?.id)&&!P.locked;return ve.jsxs("div",{className:`pitem${P.id===k.selectedId?" on":""}`,title:`${P.team_name||P.owner_display_name?.trim()||"未填写姓名"} · ${P.permission==="operate"?"可操作":"只读"}`,onContextMenu:Fe=>{re&&(Fe.preventDefault(),L(P))},children:[ve.jsx("button",{className:"nm",onClick:()=>{b.open(P.id)},onDoubleClick:()=>ee&&void b.rename(P),children:P.name}),ve.jsx("span",{className:"ct",children:P.cards}),re&&ve.jsx("button",{className:"pshare",title:"分享给个人或项目组",onClick:()=>L(P),children:"↗"}),ee&&ve.jsxs(ve.Fragment,{children:[ve.jsx("button",{className:"ren",title:"重命名",disabled:k.busy,onClick:()=>{b.rename(P)},children:"✎"}),ve.jsx("button",{className:"del",title:"删除",disabled:k.busy,onClick:()=>{b.remove(P)},children:"✕"})]})]},P.id)};return ve.jsxs(ve.Fragment,{children:[ve.jsx("div",{className:"head",children:ve.jsx("span",{className:"project-panel-title",children:"画布列表"})}),ve.jsxs("button",{id:"newproj",disabled:k.busy,onClick:()=>{b.create()},children:[ve.jsx("span",{"aria-hidden":"true",children:"＋"}),ve.jsx("span",{children:"新建画布"})]}),ve.jsxs("label",{className:"space-picker",children:[ve.jsx("span",{children:"画布空间"}),ve.jsx("select",{id:"space-select",value:k.selectedSpace,onChange:P=>b.selectSpace(P.target.value),"aria-label":"选择个人空间或项目组",children:J.map(P=>ve.jsx("option",{value:P.value,children:P.label},P.value))})]}),ve.jsx("div",{id:"space-label",className:"section-label",children:J.find(P=>P.value===k.selectedSpace)?.label}),ve.jsx("div",{id:"plist",children:[...G].map(([P,ee])=>P?ve.jsxs("details",{className:"powner",open:!0,children:[ve.jsxs("summary",{children:[ve.jsx("span",{className:"powner-name",children:ee[0]?.owner_display_name?.trim()||"未填写姓名"}),ve.jsx("span",{className:"powner-count",children:ee.length})]}),ve.jsx("div",{className:"powner-items",children:ee.map(d)})]},P):ee.map(d))}),k.error&&ve.jsx("p",{role:"alert",className:"project-error",children:k.error}),ve.jsxs("div",{className:"side-foot",children:[ve.jsx("span",{className:"side-foot-dot"}),ve.jsx("span",{id:"space-status",children:k.selectedSpace==="personal"?"个人画布仅自己可见":k.selectedSpace==="shared"?"由画布所有者授权共享":"项目组画布由全体组员共享"})]}),N&&ve.jsx(pd,{host:b,project:N,onClose:()=>L(void 0)})]})}const ud=Hl+`
`+Ul+`
#side {position:relative} #dot {position:absolute;right:22px;top:28px;width:7px;height:7px;border-radius:50%;background:var(--err)} #dot.on{background:var(--ok)} #react-projects{display:contents}.pitem>.nm {border:0;background:none;color:inherit;text-align:left;min-width:0;cursor:pointer;font:inherit}.project-error{color:#fda4af;padding:12px;font-size:12px}`;function wd(){const b=Zt.useRef(null),[k,N]=Zt.useState(!0),[L,J]=Zt.useState(),[q,G]=Zt.useState(null),d=Zt.useCallback(ee=>{const re=dd(ee.services.projects);J(re),G(document.getElementById("react-projects"));const Fe=sd(ee.scope,ee.auth,ee.notify,ee.services),We=id(ee.scope,ee.auth,ee.notify,re,ee.services,Fe);ee.beforeLeave(async()=>{await We.ready,await We.flush()}),We.nodeEditor&&(window.ChoukaNodeEditor=We.nodeEditor),We.ready.then(()=>{ee.scope.disposed||N(!1)},Ne=>{ee.scope.disposed||(N(!1),ee.notify.error(Ne))})},[]),P=Al(b,"canvas","canvas","canvas-studio",ud,d);return ve.jsxs(ve.Fragment,{children:[ve.jsx("div",{id:"page-mount",ref:b,dangerouslySetInnerHTML:{__html:Bl}}),q&&L&&Ll.createPortal(ve.jsx(cd,{host:L}),q),k&&!P&&ve.jsx(Ol,{stage:"正在准备工作区"}),P&&ve.jsx("p",{role:"alert",children:P})]})}export{wd as CanvasPage};
