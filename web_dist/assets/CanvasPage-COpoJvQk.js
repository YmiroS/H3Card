import{errorMessage as to,ApiError as ds,clientExports as Ns,jsxRuntimeExports as X,reactExports as rt}from"./http-DOrwCtZg.js";import{reactDomExports as zs}from"./index-BgVeoShv.js";import{isLiveTask as Zi,taskDeleteResultSchema as cs,taskHistoryPageSchema as Ed,formatQueueStatus as Is,tasksSchema as Sd,projectSpaces as jd,projectListSchema as $d,LoadingRequest as Md}from"./index-gRXuRFvF.js";import{object as Ps,number as _t,strictObject as ta,unknown as $o,array as di,string as Yn,_enum as Nd,looseObject as ui,discriminatedUnion as zd,union as ps,literal as eo,boolean as us}from"./monitor-alerts-DAd3X9Za.js";import{usePageRuntime as Id}from"./usePageRuntime-CCExb0o4.js";import{userSchema as Pd}from"./session-CWTCSf4S.js";import"./json-C6I-PpXc.js";const Ld=`\r
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
<input type="file" id="picker" style="display:none">`,Td=`@scope (body[data-chouka-page="canvas"]) {\r
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
}`,Rd=`@scope (body[data-chouka-page="canvas"]) {\r
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
}`,Od=["image","audio","video"],oa=[{id:"480P",label:"480P",val:480},{id:"720P",label:"720P",val:720},{id:"1080P",label:"1080P",val:1080},{id:"1440P",label:"1440P",val:1440},{id:"2K",label:"2K",val:2048}],jo=[["1:1",1,1],["1:2",1,2],["2:1",2,1],["9:16",9,16],["16:9",16,9],["3:4",3,4],["4:3",4,3],["3:2",3,2],["2:3",2,3],["5:4",5,4],["4:5",4,5],["21:9",21,9],["9:21",9,21]];function Ls(a){return(a&&a.options||[]).map(p=>{const g=/^(\d+)x(\d+)\s+\(([^)]+)\)$/.exec(String(p));if(!g)return null;const w=parseInt(g[1],10),C=parseInt(g[2],10);return{value:p,width:w,height:C,ratio:g[3],short:Math.min(w,C)}}).filter(Boolean)}function Ad(a,p){return Ls(a).find(g=>g.value===p)||null}function ia(a,p){const g=p.imageControls,w=a.params.image_ratio,C=a.params.image_clarity;return{ratio:jo.some(k=>k[0]===w)||g.mode==="i2i"&&w==="original"?w:g.defaultRatio,clarity:oa.some(k=>k.id===C)?C:g.defaultClarity}}function Ts(a,p,g,w){if(g&&w&&g.id!==w.id&&(g.imageControls||w.imageControls)){const C=l=>[...new Set(l.inputs.filter(v=>!Od.includes(v.type)&&v.type!=="textarea"&&v.type!=="seed").map(v=>v.key))],k=a.params._imageModelParams||={};k[g.id]=Object.fromEntries(C(g).filter(l=>a.params[l]!=null).map(l=>[l,a.params[l]]));const N=a.params._imageRatios||={};g.imageControls&&(N[g.imageControls.mode]=ia(a,g).ratio);for(const l of new Set([...C(g),...C(w)]))delete a.params[l];Object.assign(a.params,k[w.id]||{}),w.imageControls&&g.imageControls?.mode!==w.imageControls.mode&&(a.params.image_ratio=N[w.imageControls.mode]||w.imageControls.defaultRatio)}a.cap=p}function Fd({document:a,getCapability:p,getCapabilityById:g,getRunCapability:w,getProject:C,isIF:k,normalizeIFDuration:N,api:l,save:v,onReferenceChange:I,ratioWH:D,multiple:J}){function ce(P,q,W){const A=ia(P,q),oe=a.createElement("div");oe.className="cpick image-size-controls";const M=a.createElement("div");M.className="ctitle",M.textContent="画面比例";const F=a.createElement("div");F.className="cgrid";const ue=q.imageControls.mode==="i2i"?[["original",1,1],...jo]:jo;for(const[Te,de,T]of ue){const R=a.createElement("button"),ge=Te==="original"?"原图":Te;R.className=Te===A.ratio?"on":"",R.innerHTML=`<i style="--ratio:${de/T}"></i><span>${ge}</span>`,R.title=`画面比例 ${ge}`,R.onclick=()=>{P.params.image_ratio=Te,v(),W()},F.appendChild(R)}const Ce=a.createElement("div");Ce.className="ctitle",Ce.textContent="清晰度";const Ee=a.createElement("div");Ee.className="cgrid k";for(const Te of oa){const de=a.createElement("button");de.className=Te.id===A.clarity?"on":"",de.textContent=Te.label,de.title=`目标短边 ${Te.val}px，实际尺寸按模型要求对齐`,de.onclick=()=>{P.params.image_clarity=Te.id,v(),W()},Ee.appendChild(de)}const Ae=a.createElement("div");return Ae.className="image-size-hint",Ae.textContent=q.imageControls.mode==="i2i"?"清晰度按短边计算；默认保持原图比例。指定比例时，模型可能裁切主图以适配画布。":"清晰度按短边计算；实际尺寸按模型要求对齐。高分辨率会增加显存占用。",oe.append(M,F,Ce,Ee,Ae),oe}const V=P=>P?.kind==="gen"&&P.outputType==="video"&&(P.execution==="if_studio"||P.id.startsWith("minimax_h3_")&&P.inputs.some(q=>q.type==="video")),G=(P,q)=>V(q)?(k(P)?p(P):q).inputs.filter(W=>W.type==="video").map(W=>P.assets?.[W.key]).find(W=>W?.ref):null,ee=P=>P&&[P.width,P.height,P.duration].every(q=>Number.isFinite(+q)&&+q>0),z=new WeakMap;async function $(P,q=w(P)){const W=G(P,q);if(!W||ee(W))return;if(z.has(W))return z.get(W).promise;const A=C(),oe={};return z.set(W,oe),oe.promise=l("/api/media?ref="+encodeURIComponent(W.ref)+"&project="+encodeURIComponent(A.id)).then(M=>{if(!ee(M))throw new Error("无法读取参考视频的比例和时长，请重新导入视频");C()!==A||!A.cards.includes(P)||G(P,q)!==W||(Object.assign(W,M),v())}).catch(M=>{throw oe.error=M.message,M}),oe.promise}function te(P,q=w(P)){const W=G(P,q);if(!W)return delete P._referenceParameters,delete P.params._reference_video,Promise.resolve();const A=JSON.stringify([q.id,W.ref]);if(P.params._reference_video===A)return Promise.resolve();const oe=P._referenceParameters;if(oe?.identity===A&&oe.source===W)return oe.promise;const M=C(),F=P.params,ue={...F},Ce={identity:A,source:W,before:ue};P._referenceParameters=Ce;const Ee=()=>{if(C()!==M||!M.cards.includes(P)||P.params!==F||P._referenceParameters!==Ce||w(P)!==q||G(P,q)!==W||!ee(W))return;const Ae=ge=>ge.every(Se=>F[Se]===ue[Se]),Te=q.inputs.find(ge=>ge.key==="aspect_ratio"),de=+W.width/+W.height;if(Te&&Ae(["aspect_ratio"]))F.aspect_ratio=Te.options.reduce((ge,Se)=>Math.abs(D[Se][0]/D[Se][1]-de)<Math.abs(D[ge][0]/D[ge][1]-de)?Se:ge);else if(!Te&&Ae(["width","height","_ratio"])){const ge=jo.reduce((ie,le)=>Math.abs(le[1]/le[2]-de)<Math.abs(ie[1]/ie[2]-de)?le:ie),Se=ie=>F[ie]??q.inputs.find(le=>le.key===ie)?.default,K=Math.min(+Se("width"),+Se("height"));F._ratio=ge[0],F.width=ge[1]>=ge[2]?Math.round(K*ge[1]/ge[2]/J)*J:K,F.height=ge[1]>=ge[2]?K:Math.round(K*ge[2]/ge[1]/J)*J}const T=q.inputs.some(ge=>ge.key==="preview_seconds"),R=T?"preview_seconds":"duration";Ae([R])&&(F[R]=T?0:Math.max(1,Math.round(+W.duration)),k(P)&&N(P)),F._reference_video=A,v()};return Ce.promise=ee(W)?Promise.resolve(Ee()):$(P,q).then(Ee),Ce.promise}function Y(P){te(P).catch(()=>{}).finally(()=>I(P))}function L(P,q){const W=G(P,q);if(!W||ee(W))return null;const A=a.createElement("div");if(A.className="knobnote",A.setAttribute("role","status"),A.textContent=z.get(W)?.error||"正在读取参考视频的比例和时长…",z.get(W)?.error){const oe=a.createElement("button");oe.type="button",oe.textContent="重新读取",oe.onclick=()=>{z.delete(W),delete P._referenceParameters,Y(P),I(P)},A.appendChild(oe)}return A}return{imageClarityPicker:ce,supportsVideoReference:V,referenceVideo:G,videoMetadataReady:ee,ensureReferenceMetadata:$,syncReferenceParameters:te,refreshVideoParameters:Y,videoReferenceStatus:L,switchImageCapability:(P,q)=>Ts(P,q,p(P),g(q))}}const Dd={CLARITY_STEPS:oa,RATIO_GRID:jo,resolutionPresets:Ls,resolutionPreset:Ad,imageSettings:ia,switchImageCapability:Ts,applyInputPresets:qd,create:Fd};function qd(a,p){for(const g of(a.inputs||[]).filter(w=>w.presets)){const w=p[g.key]!=null?p[g.key]:g.default,C=g.presets[w];if(!C)throw new Error(`${g.label}无效：${w}`);p[g.key]=w,Object.assign(p,C)}}const Mo={"1:1 (Square)":[1,1],"2:3 (Portrait Photo)":[2,3],"3:2 (Photo)":[3,2],"3:4 (Portrait Standard)":[3,4],"4:3 (Standard)":[4,3],"9:16 (Portrait Widescreen)":[9,16],"16:9 (Widescreen)":[16,9],"21:9 (Ultrawide)":[21,9]},jr=[480,544,640,768],Rs={480:832,544:960,640:1152,768:1344},Wn=32,ai=new Set(["megapixels","width","height","aspect_ratio","resolution","scale_to_length","output_1080p"]),Os=[{id:"1080p",short:1080},{id:"2K",short:1440},{id:"4K",short:2160}],fs=["3:4",3,4],mt=(a,p)=>a.inputs.find(g=>g.key===p);function Zr(a){return a===null||typeof a=="string"||typeof a=="number"||typeof a=="boolean"?a:void 0}const wt=(a,p)=>p?Zr(a.params[p.key])??p.default:void 0,_r=a=>typeof a=="string"?a:"",Un=a=>typeof a=="number"||typeof a=="string"?Number(a):NaN,ms=a=>Number.parseFloat(String(Zr(a)));function aa(a){return Mo[_r(a)]??[1,1]}function $r(a,p){const[g,w]=aa(a),C=Math.sqrt(p*1024*1024/(g*w));return[Math.round(g*C/Wn)*Wn,Math.round(w*C/Wn)*Wn]}function As(a,p){const[g,w]=aa(a),C=p/Math.min(g,w),k=Math.round(C*C*g*w/(1024*1024)*100)/100;for(const N of[0,1,-1,2,-2,3,-3]){const l=Math.round((k+N*.01)*100)/100;if(l>0&&Math.min(...$r(a,l))===p)return l}return k}const hs=a=>Math.round(a*9/16/Wn)*Wn;function Fs(a){return a.id==="minimax_h3_ref_2pass_bf16"||a.id==="minimax_h3_fusion_v2_bf16"?mt(a,"output_1080p"):void 0}function ci(a,p){const[g,w]=aa(a);return{width:Math.round(p*Math.max(1,g/w)/2)*2,height:Math.round(p*Math.max(1,w/g)/2)*2}}function gs(a,p){const g=Fs(p);return!g||wt(a,g)!=="on"?null:ci(wt(a,mt(p,"aspect_ratio")),1080)}function na(a,p){if(p.execution!=="if_studio"||p.outputType!=="video")return null;const g=Os.find(w=>w.id===a.params.if_video_resolution);return g?{label:g.id,...ci(wt(a,mt(p,"aspect_ratio")),g.short)}:null}function Bd(a,p){for(const g of a.querySelectorAll("input, select"))g.addEventListener("input",p),g.addEventListener("change",p);for(const g of a.querySelectorAll('[role="switch"]'))g.addEventListener("click",p)}function Hd(a){const{document:p,save:g,ratioGrid:w,claritySteps:C,resolutionPresets:k,resolutionPreset:N}=a,l=L=>{g(),L?.()},v=L=>L.outputType==="video"?jr.map(P=>({id:`${P}p`,label:`${P}p`,val:P})):C;function I(L){let P=null,q=1/0;for(const[W,[A,oe]]of Object.entries(Mo)){const M=Math.abs(L[1]/L[2]-A/oe);M<q-1e-9&&(q=M,P=W)}return P}function D(L){const P=Mo[_r(L)];return P?w.find(q=>q[1]===P[0]&&q[2]===P[1]):void 0}function J(L,P){let q="3:4",W=1/0;for(const A of w){const oe=Math.abs(L/P-A[1]/A[2]);oe<W&&(W=oe,q=A[0])}return q}function ce(L,P){const q=v(L),W=q.find(ue=>ue.id===P.params._clarity);if(W)return W;const A=Un(wt(P,mt(L,"width"))),oe=Un(wt(P,mt(L,"height")));if(!A||!oe)return null;let M=null,F=1/0;for(const ue of q){const Ce=Math.abs(ue.val-Math.min(A,oe));Ce<F&&(F=Ce,M=ue)}return M}function V(L){const P=p.createElement("div");return P.className="ctitle",P.textContent=L,P}function G(L=!1){const P=p.createElement("div");return P.className=L?"cgrid k":"cgrid",P}function ee(L,P,q,W){const A=p.createElement("button");return A.type="button",A.textContent=L,A.className=P?"on":"",A.title=q,A.setAttribute("aria-pressed",String(P)),A.onclick=W,A}function z(L,P,q,W){const A=ee("",P,q,W),oe=p.createElement("i");oe.style.setProperty("--ratio",String(L[1]/L[2]));const M=p.createElement("span");return M.textContent=L[0],A.append(oe,M),A}function $(L,P,q){if(P.imageControls)return a.imageClarityPicker(L,P,q);const W=mt(P,"aspect_ratio"),A=mt(P,"megapixels"),oe=mt(P,"resolution"),M=mt(P,"width")&&mt(P,"height"),F=mt(P,"scale_to_length"),ue=p.createElement("div");if(ue.className="cpick",oe){const de=k(oe),T=N(oe,wt(L,oe))??de[0];if(!T)return ue;const R=G();for(const Se of new Set(de.map(K=>K.ratio))){const[K=1,ie=1]=Se.split(":").map(Number);R.appendChild(z([Se,K,ie],Se===T.ratio,`画面比例 ${Se}`,()=>{const c=de.filter(pe=>pe.ratio===Se).reduce((pe,Me)=>Math.abs(Me.short-T.short)<Math.abs(pe.short-T.short)?Me:pe);L.params.resolution=c.value,l(q)}))}const ge=G(!0);for(const Se of de.filter(K=>K.ratio===T.ratio))ge.appendChild(ee(`${Se.width}×${Se.height}`,Se.value===T.value,"",()=>{L.params.resolution=Se.value,l(q)}));return ue.append(V("画面比例"),R,V("分辨率"),ge),ue}if(F&&!W){const de=p.createElement("input");de.type="number";const T=F.min||512,R=F.max||1344,ge=F.step||32;de.min=String(T),de.max=String(R),de.step=String(ge),de.value=String(wt(L,F)??""),de.style.cssText="width:100%;padding:8px;font-size:14px;border:1px solid #3a3a44;border-radius:4px;background:#1a1a22;color:#fff";const Se=()=>{const le=Number.parseInt(de.value,10);Number.isNaN(le)||(L.params.scale_to_length=Math.max(T,Math.min(R,le)),l(q))};de.oninput=Se;const K=G(!0);for(const le of jr){const c=Rs[le];if(c===void 0)continue;const pe=ee(`${le}p`,Number(de.value)===c,`16:9 素材约 ${le}p；最长边 ${c}px，实际短边随素材比例变化`,()=>{de.value=String(c),Se()});pe.disabled=c<T||c>R,K.appendChild(pe)}const ie=p.createElement("div");return ie.style.cssText="font-size:12px;color:#8a8a94;margin-top:4px",ie.textContent=`档位按 16:9 素材标注，实际短边随素材比例变化。最长边范围：${T} ~ ${R}，步进 ${ge}`,ue.append(V("分辨率（最长边）"),K,de,ie),ue}const Ce=!W&&M,Ee=()=>{const de=Un(Zr(L.params.width)??M?.default),T=Un(wt(L,mt(P,"height")));return de&&T?J(de,T):"3:4"};function Ae(de){const T=ce(P,L)??v(P)[1];if(!T)return;const[,R,ge]=de,Se=P.outputType==="video"?Wn:16;L.params.width=R>=ge?Math.round(T.val*R/ge/Se)*Se:T.val,L.params.height=R>=ge?T.val:Math.round(T.val*ge/R/Se)*Se}if(W||Ce){const de=W?wt(L,W):_r(L.params._ratio)||Ee(),T=W?D(de):void 0,R=G();for(const ge of w){const Se=!!Ce&&(ge[0]===de||!L.params._ratio&&ge[0]===w.find(c=>Math.abs(Un(L.params.width)/Un(L.params.height)-c[1]/c[2])<.02)?.[0]),K=W?ge===T:Se,ie=I(ge),le=z(ge,K,`画面比例 ${ge[0]}`+(W&&ie!==de?`（工作流档位：${ie}）`:"（当前）"),()=>{W?L.params.aspect_ratio=ie:(L.params._ratio=ge[0],Ae(ge)),l(q)});W&&!K&&ie===de&&(le.className="near"),R.appendChild(le)}ue.append(V("画面比例"),R)}const Te=A?Zr(L.params.aspect_ratio)??mt(P,"aspect_ratio")?.default??"16:9 (Widescreen)":null;if(A||M){const de=A?jr.flatMap(ie=>{const le=As(Te,ie);return le>(A.max??1.1)+.01?[]:[{id:`${ie}p`,label:`${ie}p`,val:le,p:ie}]}):[...v(P)],T=G(!0),R=ce(P,L),ge=Fs(P),Se=gs(L,P),K=na(L,P);for(const ie of de){const le=A?ms(wt(L,A)):R?.val,c=!Se&&!K&&(A?Number.isFinite(le)&&Math.min(...$r(Te,Number(le)))===ie.p:le!=null&&Math.abs(le-ie.val)<40),pe=w.find(Q=>Q[0]===(L.params._ratio||"3:4"))??fs,Me=P.outputType==="video"?Wn:16,Be=A?$r(Te,ie.val).join("×"):pe[1]>=pe[2]?`${Math.round(ie.val*pe[1]/pe[2]/Me)*Me} × ${ie.val}`:`${ie.val} × ${Math.round(ie.val*pe[2]/pe[1]/Me)*Me}`;T.appendChild(ee(ie.label,c,Be,()=>{if(ge&&(L.params.output_1080p="off"),delete L.params.if_video_resolution,A)L.params.megapixels=ie.val;else{L.params._clarity=ie.id;let Q=_r(L.params._ratio);if(!Q){Q=Ee();const ve=Un(Zr(L.params.width)??M?.default),ae=Un(wt(L,mt(P,"height")));ve&&ae&&(L.params._ratio=Q)}Ae(w.find(ve=>ve[0]===Q)??fs)}l(q)}))}if(ge){const ie=ci(wt(L,mt(P,"aspect_ratio")),1080);T.appendChild(ee("1080p",!!Se,`${ie.width}×${ie.height}`,()=>{L.params.output_1080p="on",l(q)}))}if(P.execution==="if_studio"&&P.outputType==="video")for(const ie of Os){const le=ci(wt(L,mt(P,"aspect_ratio")),ie.short);T.appendChild(ee(ie.id,K?.label===ie.id,`${le.width}×${le.height}`,()=>{L.params.if_video_resolution=ie.id,l(q)}))}if(ue.append(V("清晰度"),T),ge?.hint){const ie=p.createElement("div");ie.className="knobnote",ie.textContent=ge.hint.replace("开启后","1080p 档位").replace("关闭保留原有行为。","其他清晰度档位保留原有行为。"),ue.appendChild(ie)}}return ue}function te(L,P){if(!P)return null;if(P.imageControls){const de=a.imageSettings(L,P);return`${de.ratio==="original"?"原图":de.ratio} · ${de.clarity}`}const q=mt(P,"aspect_ratio"),W=mt(P,"megapixels"),A=mt(P,"resolution"),oe=mt(P,"width"),M=mt(P,"scale_to_length"),F=P.inputs.find(de=>de.presets&&de.appearance!=="switch"),ue=mt(P,"duration"),Ce=mt(P,"preview_seconds"),Ee=P.outputType==="video"?mt(P,"sound"):void 0;if(!q&&!W&&!A&&!oe&&!M&&!F&&!ue&&!Ce&&!Ee)return null;const Ae=[];if(M&&!q)return Ae.push(`${wt(L,M)}px`),Ee&&Ae.push(wt(L,Ee)==="on"?"有声音":"无声音"),Ae.join(" · ");if(A){const de=N(A,wt(L,A));de&&Ae.push(de.ratio,`${de.width}×${de.height}`)}else if(q){const de=wt(L,q);Ae.push(D(de)?.[0]??_r(de).split(" ")[0]??"")}else oe&&L.params._ratio&&Ae.push(_r(L.params._ratio));const Te=gs(L,P);if(Te)Ae.push("1080p",`${Te.width}×${Te.height}`);else if(W){const de=ms(wt(L,W)),T=Zr(L.params.aspect_ratio)??q?.default??"16:9 (Widescreen)",R=Number.isFinite(de)?Math.min(...$r(T,de)):null;Ae.push(na(L,P)?.label??(R?`${R}p`:"?"))}else if(oe){const de=ce(P,L);de&&Ae.push(de.label)}if(F){const de=wt(L,F),T=F.options?.find(ge=>(ge&&typeof ge=="object"?ge.value:ge)===de),R=T&&typeof T=="object"?T.label:_r(T);R&&Ae.unshift(R.replace(/（.*$/,""))}if(ue&&Ae.push(`${wt(L,ue)}秒${Ce?"/段":""}`),Ce){const de=wt(L,Ce);Un(de)>0&&Ae.push(`试前${de}秒`)}return Ee&&Ae.push(wt(L,Ee)==="on"?"有声音":"无声音"),Ae.join(" · ")}function Y(L,P){const q=L.cap!==P;q&&delete L.params.output_1080p,a.switchImageCapability(L,P),q&&delete L.params.output_1080p}return{clarityPicker:$,paramsBrief:te,switchImageCapability:Y}}const Xd="_notice_ur2qb_1",Ud="_readonly_ur2qb_9",bs={notice:Xd,readonly:Ud},ra="[data-readonly-view], summary, .slinks .nm, a[href]",Ds='textarea, input:not([type="range"]):not([type="file"])';function xs(a,p){if(a.classList.toggle(bs.readonly,p),a.dataset.readonly=String(p),!p){a.querySelector("[data-readonly-notice]")?.remove();return}if(!a.querySelector("[data-readonly-notice]")){const g=a.ownerDocument.createElement("div");g.dataset.readonlyNotice="",g.className=bs.notice,g.textContent="只读 · 可查看参数，不能修改或运行",a.prepend(g)}for(const g of a.querySelectorAll(Ds))g.readOnly=!0,g.setAttribute("aria-readonly","true");for(const g of a.querySelectorAll('button, select, input[type="range"], input[type="file"]'))g.matches(ra)||(g.disabled=!0);for(const g of a.querySelectorAll("[contenteditable]"))g.contentEditable="false";for(const g of a.querySelectorAll('[draggable="true"]'))g.draggable=!1}function Wd(a){const p=a.target;return p instanceof Element?["beforeinput","input","change","paste","drop","dragover","contextmenu"].includes(a.type)?!0:a instanceof KeyboardEvent?p.closest(ra)?!1:["Backspace","Delete","Enter"," "].includes(a.key)||(a.ctrlKey||a.metaKey)&&["v","x","z","y"].includes(a.key.toLowerCase()):p.closest(Ds)?!1:p.closest(".slot.filled")?a.type!=="click":!p.closest(ra):!1}const si=a=>a instanceof ds?a:new ds(to(a),a&&typeof a=="object"&&"status"in a&&typeof a.status=="number"?a.status:0,a);function Yd(a){const p=a.setTimeout||globalThis.setTimeout,g=a.clearTimeout||(W=>{W!==null&&globalThis.clearTimeout(W)});let w=null,C=null,k=!1,N=0,l=0,v=0,I=null,D=null;const J=new Set;let ce=Promise.resolve(),V=Promise.resolve();function G(W){J.add(W);const A=()=>{J.delete(W),a.flushPendingProjectSync()};return W.then(A,oe=>{D=si(oe),A()}),W}function ee(){if(a.nodeEditor||!a.isAuthenticated()||!a.getProject())return;g(C);const W=a.getProject()?.id;W&&(C=p(()=>{C=null;const A=a.getView(),oe={x:A.x,y:A.y,k:A.k};V=V.then(async()=>{if(a.isAuthenticated())try{await a.jput(`/api/projects/${encodeURIComponent(W)}/view`,oe)}catch(M){a.getProject()?.id===W&&a.showError("视图保存失败："+to(M))}})},400))}function z(W=!0){W&&a.recordCanvasEdit();const A=a.getProject();if(!a.canSave()||!A||A.locked)return;g(w);const oe=A.id;w=p(()=>{w=null,$(oe)},700)}function $(W=a.getProject()?.id){l++;const A=ce.catch(()=>{}).then(()=>Y(W)).finally(()=>{l--,a.flushPendingProjectSync()});return ce=A,A}async function te(W,A){const oe=await a.api(`/api/projects/${encodeURIComponent(W)}`);if(a.getProject()?.id!==W||oe.rev!==A.rev)return null;const M=new Set(oe.cards.map(Ee=>Ee.id)),F=A.cards.filter(Ee=>Ee&&typeof Ee=="object"&&!Array.isArray(Ee)&&!M.has(String(Ee.id)));if(!F.length)return null;let ue=oe;for(const Ee of F){const Ae=await a.jpost(`/api/projects/${encodeURIComponent(W)}/cards`,{card:Ee,rev:ue.rev}),Te=a.getProject();if(Te?.id!==W)throw new Error("恢复节点期间画布已切换");if(ue=Ae.project,Ee&&typeof Ee=="object"&&!Array.isArray(Ee)){const de=Ae.card||ue.cards.find(R=>R.id===Ee.id),T=Te.cards.find(R=>R.id===Ee.id);if(de&&T)for(const R of["created_by","created_by_name","created_at"])de[R]!==void 0&&(T[R]=de[R],Ee[R]=de[R])}}A.rev=ue.rev;const Ce=a.getProject();if(Ce?.id!==W)throw new Error("恢复节点期间画布已切换");return Ce.rev=Math.max(Ce.rev,A.rev),a.jput(`/api/projects/${encodeURIComponent(W)}`,A)}async function Y(W=a.getProject()?.id){const A=a.getProject();if(!a.canSave()||!A||A.id!==W)return{ok:!1,error:new Error("画布不可保存或已切换")};if(a.nodeEditor&&!a.editorCard())return{ok:!1,error:new Error("此节点已删除或不可访问")};if(a.nodeEditor&&I?.status===409)return{ok:!1,error:I};const oe=A.id,M={rev:A.rev||0,name:A.name,cards:A.cards.map(a.plain),edges:A.edges,groups:A.groups||[]};k=!0;try{const F=await a.jput(`/api/projects/${encodeURIComponent(oe)}`,M),ue=a.getProject();return ue?.id!==oe?{ok:!1,error:new Error("保存期间画布已切换")}:(ue.rev=Math.max(ue.rev||0,F.rev||0),I=null,{ok:!0})}catch(F){let ue=si(F);if(ue.status===409&&a.getProject()?.id===oe&&!a.nodeEditor&&!v)try{const Ce=await te(oe,M);if(Ce){const Ee=a.getProject();return Ee?.id!==oe?{ok:!1,error:new Error("保存期间画布已切换")}:(Ee.rev=Math.max(Ee.rev||0,Ce.rev||0),I=null,{ok:!0})}}catch(Ce){ue=si(Ce)}return a.getProject()?.id===oe&&(I=ue),ue.status===409&&a.getProject()?.id===oe&&!a.nodeEditor&&!v?(a.toast("画布在别处被改过，已重新加载"),await a.openProject(oe)):a.showError("保存失败："+ue.message),{ok:!1,error:ue}}finally{k=!1,a.flushPendingProjectSync()}}async function L(W=a.getProject()?.id,A=!1){v++;try{for(a.flushFocusedControl();;){const oe=ce;if(await oe,await Promise.all([...J]),a.getProject()?.id!==W)throw new Error("画布已关闭或切换");if(D)throw D;if(I&&[403,404,409].includes(I.status))throw I;if(oe!==ce||J.size||N)continue;if(!a.canSave()){if(A&&!I&&!l&&w===null)return;throw new Error("此画布只读或已锁定，不能保存")}if(a.nodeEditor&&!a.editorCard())throw new Error("此节点已删除，不能保存或重新创建");g(w),w=null;const M=await $(W);if(!M.ok)throw M.error;if(D)throw D;if(!J.size&&!N&&!l&&w===null)return}}catch(oe){throw oe===D&&(D=null),oe}finally{v--,a.flushPendingProjectSync()}}function P(){g(w),w=null}function q(W){N++;const A=ce.catch(()=>{}).then(W).finally(()=>{N--,a.flushPendingProjectSync()});return ce=A,A}return{saveView:ee,save:z,enqueueSave:$,flushLocalChanges:L,trackNodeWork:G,enqueueCardCreate:q,cancelContentSave:P,cancelTimers(){P(),g(C),C=null},resetFailures(){I=null,D=null},markWorkFailure(W){D=si(W)},beginFlush(){v++},endFlush(){v--,a.flushPendingProjectSync()},get pendingChain(){return ce},get busy(){return w!==null||k||l>0||N>0||J.size>0||v>0||!!(a.nodeEditor&&I)},get status(){return Object.freeze({contentSaving:k,pendingCardCreates:N,pendingContentSaves:l,localFlushes:v,pendingNodeWork:J.size,saveScheduled:w!==null,saveFailure:I,workFailure:D})}}}const Jd={create:Yd};function qs(a){let p=a;const g=new Set;return{getSnapshot:()=>p,subscribe:w=>(g.add(w),()=>{g.delete(w)}),set:w=>{p=w,g.forEach(C=>C())}}}const ys=()=>({enabled:!1,initialized:!1,loading:!1,hasMore:!1,total:0,error:null,blocked:!1});function Vd(a,p){let g=ys(),w=new Map;const C=new Set;let k=null,N=0,l=null,v=-1/0,I="refresh";function D(){N++,l=null,w.clear(),C.clear(),k=null,v=-1/0,g=ys()}function J(){const V=a?.isAdmin()===!0;return!V&&g.enabled?(D(),p()):V&&!g.enabled&&(g={...g,enabled:!0}),V&&!g.blocked}function ce(V,G=!1){if(!J()||!a)return Promise.resolve();if(l)return l;if(V==="older"&&(!g.initialized||!g.hasMore||!k))return Promise.resolve();const ee=(a.now??Date.now)();if(V==="refresh"&&!G&&ee-v<5e3)return Promise.resolve();const z=N,$=V==="older"?k:null;V==="refresh"&&(v=ee),g={...g,loading:!0,error:null};const te=Promise.resolve().then(()=>z!==N||!a.isAdmin()?null:a.list({limit:50,status:"all",...$===null?{}:{cursor:$}})).then(Y=>{if(z===N&&!(!J()||!Y)){if(V==="older"&&Y.next_cursor===$)throw new Error("历史分页游标未前进，请重试");w=new Map(w);for(const L of Y.jobs)C.has(L.id)||w.set(L.id,L);(!g.initialized||V==="older"||k===null)&&(k=Y.next_cursor),g={...g,initialized:!0,total:Y.total,hasMore:k!==null}}}).catch(Y=>{if(z!==N||!J())return;I=V;const L=typeof Y=="object"&&Y!==null&&"status"in Y&&(Y.status===401||Y.status===403);L&&(w.clear(),k=null),g={...g,error:to(Y),blocked:L,...L?{total:0,hasMore:!1,initialized:!1}:{}}}).finally(()=>{z!==N||l!==te||(l=null,g={...g,loading:!1},p())});return l=te,p(),te}return{getSnapshot:()=>g,getJobs:()=>[...w.values()],synchronizeAccess:J,refresh:()=>ce("refresh"),loadMore:()=>ce("older"),retry:()=>ce(I,!0),reset:D,forgetTask(V){C.add(V),w.delete(V)},forgetLive(V){for(const G of V)w.get(G)?.history_only||w.delete(G)},renameProject(V,G){w=new Map([...w].map(([ee,z])=>[ee,z.project===V?{...z,projectName:G}:z]))}}}function Kd(a){const p=qs([]);let g=null,w=0,C=0,k=[],N=!1;const l=new Set,v=Vd(a.history,D);function I(z,$){return($.created??0)-(z.created??0)||(z.id<$.id?1:z.id>$.id?-1:0)}function D(){const z=v.getJobs(),$=new Set(k.map(q=>q.id)),te=new Map(z.filter(q=>q.history_only||!N||$.has(q.id)).map(q=>[q.id,q])),Y=v.getSnapshot(),L=[...z].sort(I).at(-1);for(const q of k)(!Y.enabled||Zi(q)||l.has(q.id)||te.has(q.id)||Y.initialized&&L&&I(q,L)<=0)&&te.set(q.id,q);const P=[...te.values()];Y.enabled&&P.sort(I),p.set(P),a.onChange()}function J(z){const $=z.filter(L=>!L.history_only),te=new Set($.map(L=>L.id)),Y=new Set(k.map(L=>L.id));for(const L of l)te.has(L)||l.delete(L);for(const L of $)(Zi(L)||N&&!Y.has(L.id))&&l.add(L.id);v.forgetLive(k.filter(L=>!te.has(L.id)).map(L=>L.id)),k=$,N=!0,D()}function ce(){C++,g=null}function V(){if(v.refresh(),g)return g;const z=w,$=C,te=(async()=>{let Y;try{Y=await a.list()}catch{return}z!==w||$!==C||(J(Y),!(z!==w||$!==C)&&await a.onJobsChanged(Y.filter(L=>!L.history_only)))})().finally(()=>{g===te&&(g=null)});return g=te,te}async function G(z){if(z=p.getSnapshot().find(P=>P.id===z.id)??z,z.history_only||!a.canTask(z))return;const $=w,te=await a.remove(z);if($!==w)return;const Y=cs.parse(te);ce();const L=p.getSnapshot().find(P=>P.id===z.id)??z;Y.ok===!0&&!Y.pending&&!L.history_only&&a.canTask(L)&&(v.forgetTask(z.id),await a.onTaskDeleted?.(z)),$===w&&V()}async function ee(){const z=k.filter(L=>!Zi(L)&&a.canTask(L));if(!a.clear||!z.length)return;const $=w,te=await a.clear();if($!==w)return;const Y=cs.parse(te);if(Y.ok===!0&&!Y.pending)for(const L of z)v.forgetTask(L.id);ce(),V()}return{...p,setJobs:J,pollJobs:V,deleteTask:G,clearDoneTasks:ee,getLiveSnapshot:()=>k,getHistorySnapshot:v.getSnapshot,refreshHistory:v.refresh,loadMoreHistory:v.loadMore,retryHistory:v.retry,reset(){w++,ce(),v.reset(),J([]),N=!1},retainProjects(z){w++,ce(),v.reset(),J(k.filter($=>$.project&&z.includes($.project))),N=!1},renameProject(z,$){v.renameProject(z,$),J(k.map(te=>te.project===z?{...te,projectName:$}:te))}}}function Gd(a){return async function(g,{deleted:w=!1}={}){const C=a.getProject();if(!C||!a.canOperate())return;const k=C.cards.filter(l=>l.job&&!a.isIF(l)&&(l.status==="queued"||l.status==="running"||l.status==="canceled")).map(l=>({card:l,job:l.job,status:l.status}));let N=!1;for(const{card:l,job:v,status:I}of k){if(a.getProject()!==C||!a.canOperate())return;if(!C.cards.includes(l)||l.job!==v||l.status!==I)continue;const D=g.find(J=>J.id===v);if(D&&!(!a.canTask(D)||D.project&&D.project!==C.id||D.card&&D.card!==l.id)){if(w){l.status="canceled",l.step="",l.job=null,a.paint(l),N=!0,a.refreshPanel(l);continue}l.status=D.status,l.progress=D.progress,l.error=D.error,l.queue_remaining=D.queue_remaining,l.queue_ahead=D.queue_ahead,l.queue_order=D.queue_order,l.queue_wait_seconds=D.queue_wait_seconds,l.step=D.step||"",D.seed!=null&&(l.seed=D.seed),D.started&&D.ended&&(l.ms=Math.round((D.ended-D.started)*1e3)),D.outputs?.length&&(l.outputs=D.outputs),a.paint(l),I!==l.status&&(N=!0,a.refreshPanel(l),l.status==="done"&&(a.pushHistory(l,D),a.refreshHistory(l),await a.propagateCardOutputs(l)),l.status==="error"&&a.showError(`「${a.titleOf(l)}」生成失败：${l.error||"未知错误"}`))}}N&&a.getProject()===C&&a.canOperate()&&a.save(!1)}}function Zd(a){return async p=>{if(!Number.isInteger(p.limit)||p.limit<1)throw new Error("无效分页大小");const g=new URLSearchParams({limit:String(p.limit),status:p.status});return p.cursor!==void 0&&g.set("cursor",p.cursor),Ed.parse(await a(`/api/jobs/history?${g}`))}}function Qd({document:a,panel:p,button:g,getViewport:w,getUser:C,canTask:k,api:N,jpost:l,jobProjName:v,fmtEla:I,histTime:D,toast:J,showError:ce,confirm:V,onFocusTask:G,onJobsChanged:ee,onTaskDeleted:z=()=>{}}){const $=Kd({list:async()=>Sd.parse(await N("/api/jobs")).jobs,remove:T=>N(`/api/job/${T.id}`,{method:"DELETE"}),clear:()=>l("/api/jobs/clear"),canTask:k,history:{list:Zd(N),isAdmin:()=>C()?.role==="admin"},onChange(){q(),p.style.display!=="none"&&F()},onJobsChanged:ee,onTaskDeleted:z}),te=$.pollJobs,Y={queued:"等待中",running:"运行中",done:"已完成",error:"失败",canceled:"已取消"},L=T=>T.status==="queued"||T.status==="running",P=T=>T.status==="running"?"run":T.status==="queued"?"wait":T.status==="done"?"done":T.status==="error"?"bad":"gone";function q(){const T=$.getLiveSnapshot().filter(L),R=T.find(ie=>ie.status==="running"),ge=g,Se=`${T.length}|${R?Math.round((R.progress||0)*100):-1}`;if(ge._sig===Se)return;ge._sig=Se,ge.classList.toggle("run",!!R),ge.classList.toggle("wait",!R&&T.length>0),ge.innerHTML=`任务<span class="n">(${T.length})</span>`;const K=R?`运行中 ${Math.round((R.progress||0)*100)}%`:T.length?"等待中":"";if(K){const ie=a.createElement("span");ie.className="s",ie.textContent=K,ge.appendChild(ie)}ge.title=T.length?`${T.length} 个任务没跑完，点开可以看详情、停止或删除`:"现在没有任务在跑，点开看历史"}function W(){p.style.display==="none"?(p.style.display="",g.classList.add("open"),F(),oe(),te()):A()}function A(){p.style.display="none",p.innerHTML="",p._sig=null,g.classList.remove("open")}function oe(){if(p.style.display==="none")return;const T=8,R=g.getBoundingClientRect();p.style.maxHeight=w().height-R.bottom-T*2+"px";const ge=p.offsetWidth;p.style.top=R.bottom+T+"px",p.style.left=Math.max(T,Math.min(R.right-ge,w().width-ge-T))+"px"}const M=()=>JSON.stringify([$.getHistorySnapshot(),$.getSnapshot().map(T=>[T.id,T.status,!!T.error,T.history_only,T.permission,v(T),T.cardName,T.name,T.submitter_display_name,T.submitter_username])]);function F(){const T=M();if(p._sig===T){for(const Me of p.querySelectorAll(".jrow")){const Be=$.getSnapshot().find(Q=>Q.id===Me._id);Be&&Ce(Me,Be)}return}p._sig=T;const R=p.querySelector(".jlist"),ge=R?R.scrollTop:0;p.innerHTML="";const Se=a.createElement("div");Se.className="jhd";const K=a.createElement("b"),ie=$.getLiveSnapshot().filter(L).length;if(K.textContent=ie?`任务 · ${ie} 个没跑完`:"任务",Se.appendChild(K),$.getSnapshot().some(Me=>!Me.history_only&&!L(Me))){const Me=a.createElement("button");Me.className="lnk",Me.textContent="清空已结束",Me.title="只清列表里的记录，已经出好的产物还在节点上",Me.onclick=de,Se.appendChild(Me)}const le=a.createElement("button");le.className="x",le.textContent="✕",le.title="关闭",le.onclick=A,Se.appendChild(le);const c=a.createElement("div");if(c.className="jlist",!$.getSnapshot().length){const Me=a.createElement("div");Me.className="jempty",Me.textContent="还没有任务。在节点上点「生成」，任务就会出现在这里。",c.appendChild(Me)}for(const Me of $.getSnapshot())c.appendChild(ue(Me));const pe=$.getHistorySnapshot();if(pe.enabled){const Me=a.createElement("div");if(Me.className="jhistory",Me.setAttribute("role","status"),Me.setAttribute("aria-live","polite"),Me.textContent=pe.loading?"正在加载任务历史…":pe.error?`任务历史加载失败：${pe.error}`:`已显示 ${$.getSnapshot().length} 条任务 · 历史共 ${pe.total} 条${pe.hasMore?"":" · 已加载全部历史"}`,c.appendChild(Me),!pe.blocked&&(pe.hasMore||pe.error||pe.loading)){const Be=Ee(pe.error?"重试加载任务历史":"加载更早任务",()=>pe.error?$.retryHistory():$.loadMoreHistory());Be.className="jmore",Be.disabled=pe.loading,c.appendChild(Be)}c.onscroll=()=>{const Be=$.getHistorySnapshot();!Be.loading&&!Be.error&&Be.hasMore&&c.scrollHeight-c.scrollTop-c.clientHeight<=120&&$.loadMoreHistory()}}p.append(Se,c),c.scrollTop=ge}function ue(T){const R=a.createElement("div");R.className="jrow "+P(T),R._id=T.id;const ge=C()?.role==="admin"?T.submitter_display_name?.trim()||T.submitter_username||"未记录提交人":"";if(ge){const Q=a.createElement("div");Q.className="jowner",Q.textContent=ge,R.append(Q)}const Se=a.createElement("div");Se.className="r1";const K=a.createElement("span");K.className="nm";const ie=T.cardName||T.name||T.id,le=v(T);if(le){const Q=a.createElement("i");Q.className="pj",Q.textContent=le+" - ",K.appendChild(Q)}const c=a.createElement("span");c.className="cn",c.textContent=ie,K.appendChild(c),K.title=(ge?`${ge} - `:"")+(le?`${le} - `:"")+(T.name&&ie!==T.name?`${ie}（${T.name}）`:ie),R._st=a.createElement("span"),R._st.className="st",Se.append(K,R._st);const pe=a.createElement("div");pe.className="r2",R._sp=a.createElement("span"),R._sp.className="sp",R._tm=a.createElement("span"),pe.append(R._sp,R._tm);const Me=a.createElement("div");if(Me.className="r3",R._node=a.createElement("span"),R._node.className="node",R._step=a.createElement("span"),R._step.className="step",Me.append(R._node,R._step),R.append(Se,pe,Me),L(T)&&(!T.history_only||T.progress!=null)){const Q=a.createElement("div");Q.className="bar",R._bar=a.createElement("i"),Q.appendChild(R._bar),R.appendChild(Q)}if(T.error){const Q=a.createElement("div");Q.className="msg",Q.textContent=T.error,R.appendChild(Q)}const Be=a.createElement("div");return Be.className="acts",T.history_only||(L(T)&&Be.appendChild(Ee("停止",()=>Ae(T))),Be.appendChild(Ee("删除",()=>Te(T),!0))),T.project&&T.card&&Be.appendChild(Ee("看节点",()=>G(T))),R.appendChild(Be),Ce(R,T),R}function Ce(T,R){const ge=Math.round((R.progress||0)*100);T._st.textContent=R.status==="running"?R.progress==null?"运行中":`运行中 ${ge}%`:R.status==="queued"?Is(R):Y[R.status]||R.status,T._st.title=R.status==="queued"&&R.queue_order||"";const Se=[R.name,R.modelName||R.capability].filter(Boolean).join(" · ");T._sp.textContent!==Se&&(T._sp.textContent=T._sp.title=Se);const K=`执行节点：${R.nodeName||(R.history_only?"未记录":"等待分配")}`;T._node.textContent!==K&&(T._node.textContent=T._node.title=K);const ie=R.step?`当前：${R.step}`:"";T._step.textContent!==ie&&(T._step.textContent=T._step.title=ie);const le=R.started?I(((R.ended||Date.now()/1e3)-R.started)*1e3):"";T._tm.textContent=(R.created==null?"":D(R.created*1e3))+(le?` · ${le}`:""),T._bar&&(T._bar.style.width=ge+"%")}function Ee(T,R,ge){const Se=a.createElement("button");return ge&&(Se.className="danger"),Se.textContent=T,Se.onclick=R,Se}async function Ae(T){if(T=$.getSnapshot().find(R=>R.id===T.id)||T,T.history_only||!k(T))return J("此任务关联的画布为只读，不能停止");try{await l(`/api/job/${T.id}/cancel`)}catch(R){return ce(R.message)}te()}async function Te(T){if(T=$.getSnapshot().find(R=>R.id===T.id)||T,T.history_only||!k(T))return J("此任务关联的画布为只读，不能删除");if(!(L(T)&&!V("这个任务还没跑完，删除会先把它停掉。继续？")))try{await $.deleteTask(T)}catch(R){return ce(R.message)}}async function de(){if($.getSnapshot().some(T=>!T.history_only&&!L(T)))try{await $.clearDoneTasks()}catch(T){return ce(T.message)}}return{pollJobs:te,paintJobsBtn:q,toggleJobs:W,closeJobs:A,placeJobs:oe,renderJobs:F,stopTask:Ae,delTask:Te,clearDoneJobs:de,getJobs:$.getSnapshot,reset:$.reset,retainProjects:$.retainProjects,renameProject:$.renameProject}}const ec={create:Qd,createCanvasUpdater:Gd};function tc(a,p,g,w,C,k){const{window:N,document:l,addEventListener:v,setTimeout:I,clearTimeout:D,setInterval:J,clearInterval:ce,requestAnimationFrame:V,cancelAnimationFrame:G,ResizeObserver:ee,MutationObserver:z,IntersectionObserver:$,URL:te}=a,Y=C.mediaFetch,L=C.WebSocket,P=Jd,q=ec,W=Dd;N.ChoukaImageComposer=k;const A=(e,t=l)=>t.querySelector(e),oe=268,M=180,F=900,ue=90,Ce=900,Ee=.1,Ae=5,Te=e=>e.w||oe,de="http://www.w3.org/2000/svg",T=new URLSearchParams(location.search),R=T.get("editor")==="1",ge=T.get("project"),Se=T.get("card");R&&l.body.classList.add("node-editor"),l.addEventListener("contextmenu",e=>e.preventDefault());let K=[],ie={},le={},c=null,pe=[],Me=[],Be="personal",Q={x:60,y:70,k:1},ve=null,ae=new Set,$t=null,ct=null,Ln=null,yn=null,Mt=new Map,sn=-1,Xt=null,Jn=null,St=0,Ft=null,Lt=!1;const b={side:A("#side"),plist:A("#plist"),dot:A("#dot"),spaceSelect:A("#space-select"),spaceLabel:A("#space-label"),spaceStatus:A("#space-status"),ptitle:A("#ptitle"),hint:A("#hint"),fit:A("#fit"),presenceUsers:A("#presence-users"),stage:A("#stage"),world:A("#world"),wires:A("#wires"),groups:A("#groups"),presenceLayer:A("#presence-layer"),lasso:A("#lasso"),selbar:A("#selbar"),dock:A("#dock"),empty:A("#empty"),panel:A("#panel"),hist:A("#hist"),menu:A("#menu"),tip:A("#tip"),toast:A("#toast"),picker:A("#picker"),jobsbtn:A("#jobsbtn"),jobs:A("#jobs"),view:A("#view"),vbox:A("#view .vbox"),respop:A("#respop"),minimapBtn:A("#minimap-btn"),wiresToggle:A("#wires-toggle"),zoomMenu:A("#zoom-menu"),minimap:A("#minimap"),minimapCanvas:A("#minimap-canvas"),minimapViewport:A("#minimap-viewport"),zoomPercent:A("#zoom-percent")},Ve=P.create({setTimeout:I,clearTimeout:D,getProject:()=>c,getView:()=>Q,isAuthenticated:()=>p.active,canSave:()=>tn(),nodeEditor:R,editorCard:()=>lo(),plain:e=>Ro(e),api:(...e)=>vt(...e),jpost:(...e)=>Tt(...e),jput:(...e)=>mn(...e),recordCanvasEdit:()=>Fo(),flushPendingProjectSync:()=>vi(),openProject:e=>Ar(e),toast:e=>ye(e),showError:e=>Ue(e),flushFocusedControl:()=>{l.activeElement?.closest?.("#panel, #respop")&&l.activeElement.blur()}}),{saveView:ln,save:xe,enqueueSave:Tn,flushLocalChanges:Mr,trackNodeWork:fn}=Ve,ne=q.createCanvasUpdater({getProject:()=>c,canOperate:()=>ke(),isIF:e=>We(e),canTask:e=>no(e),paint:e=>at(e),refreshPanel:e=>{b.panel._id===e.id&&Pe(e.id)},pushHistory:(e,t)=>Yr(e,t),refreshHistory:e=>{b.hist._id===e.id&&Jr(e.id)},propagateCardOutputs:e=>ss(e),titleOf:e=>Ne(e),showError:e=>Ue(e),save:e=>xe(e)}),_e=q.create({document:l,panel:b.jobs,button:b.jobsbtn,getViewport:()=>({width:innerWidth,height:innerHeight}),getUser:()=>p.user,canTask:e=>no(e),api:(...e)=>vt(...e),jpost:(...e)=>Tt(...e),jobProjName:e=>Cd(e),fmtEla:e=>kr(e),histTime:e=>Ui(e),toast:e=>ye(e),showError:e=>Ue(e),confirm:e=>confirm(e),onFocusTask:e=>ls(e),onJobsChanged:e=>ne(e),onTaskDeleted:e=>ne([e],{deleted:!0})}),{pollJobs:it,paintJobsBtn:gt,toggleJobs:en,closeJobs:kn,placeJobs:Rn,renderJobs:Ut}=_e,ke=(e=c)=>p.active&&e?.permission==="operate",tn=()=>ke()&&!c.locked,no=e=>p.active&&e?.permission==="operate",Ze=()=>ke()?!0:(ye("此画布只读，不能修改或运行"),!1),Nr=()=>{if(!c?.id)throw new Error("请先打开可操作画布");return`/api/upload?project=${encodeURIComponent(c.id)}`},dn=async(e,t=!1)=>{if(!Ze())throw new Error("此画布只读");const n=c,r=new FormData;r.append("file",e,e.name);const o=Nr()+(t?"&local_only=1":""),i=await vt(o,{method:"POST",body:r});if(c!==n||!ke())throw new Error("画布已切换或权限已变化，上传已取消");const s=i.files?.[0]||i;if(!s?.url||!s?.ref)throw new Error("上传接口未返回素材");return s};async function vt(e,t={}){const n=(t.method||"GET").toUpperCase();if(!["GET","HEAD"].includes(n)){const r=new te(e,location.href);if(/^\/api\/(upload|generate|text|rewrite)$/.test(r.pathname)&&!ke())throw new Error("此画布只读");const o=r.pathname.match(/^\/api\/projects\/([^/]+)(?:\/(rename|copy))?$/);if(o){const i=pe.find(s=>s.id===decodeURIComponent(o[1]))||(c?.id===decodeURIComponent(o[1])?c:null);if(!ke(i)||i.locked&&o[2]!=="copy")throw new Error("此画布不可修改")}}return C.request(e,t)}function Wt(){Ve.cancelTimers(),qo(),c=null,ve=null,ae.clear(),Ft=null,xi(),un(),or(),mo(),$n(),kn(),Bn(),b.groups.replaceChildren(),b.selbar.style.display="none",ul(),R&&Dr()}function cn(){if(l.body.classList.toggle("project-readonly",!!c&&!ke()),ke()||(Ve.cancelContentSave(),$n(),Bn()),b.dock.style.display=ke()?"":"none",b.panel._id&&b.panel.dataset.readonly!==String(!ke())&&Pe(b.panel._id),c){b.ptitle.textContent=c.name;const e=l.createElement("span");e.className="ro",e.textContent=ke()?c.locked?"试玩画布 · 刷新还原":"":"只读",b.ptitle.append(e)}}N.addEventListener("h3auth:expired",()=>{nr=null,_e.reset(),pe=[],Wt(),To()});let On=!1;N.addEventListener("h3auth:denied",async({detail:e})=>{if(!(On||!p.active||!/^\/api\/(projects|job|upload|generate|text|rewrite|media|thumbnail)/.test(e.path))){On=!0,c&&e.path!=="/api/thumbnail"&&(c.permission="read",cn());try{await Or(),await it()}finally{On=!1}}});const Tt=(e,t)=>vt(e,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t||{})}),mn=(e,t)=>vt(e,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}),Ue=e=>g.error(e);let nn=null;function ye(e){b.toast.textContent=e,b.toast.style.display="block",D(nn),nn=I(()=>b.toast.style.display="none",Math.min(2600+Math.max(0,String(e).length-20)*70,9e3))}const Vn=()=>Math.random().toString(36).slice(2,10),An=e=>K.find(t=>t.id===e)||K[0],Dt=["image","audio","video"],Qe={image:"图片",video:"视频",audio:"音频"},Cn=(e,t)=>e.id===t||!!(e.ladder&&Object.values(e.ladder).includes(t))||!!(e.route&&Object.values(e.route).some(n=>n.cap===t))||!!(e.modelSwitch&&Object.values(e.modelSwitch).includes(t)),Xe=(e,t)=>e?t&&e.modelSwitch&&e.modelSwitch[t]?e.modelSwitch[t]:e.route?e.route[Object.keys(e.route)[0]].cap:e.id:null,st=e=>{const t=K.find(n=>n.id===e.type);return t&&t.modes.some(n=>Cn(n,e.cap))?t:K.find(n=>n.modes.some(r=>Cn(r,e.cap)))||An(e.type)},qt=e=>{const t=st(e);return t&&t.modes.find(n=>Cn(n,e.cap))},Yt=e=>Object.entries((qt(e)||{}).modelSwitch||{}).find(([,t])=>t===e.cap)?.[0],hn={zimage:"Z-Image",krea2:"Krea2",qwen2511:"Qwen Image Edit 2511",qwen2512:"Qwen Image 2512（双阶段）",qwen21:"Qwen Image 2.1",da3:"Depth Anything 3",depthcrafter:"DepthCrafter"},Fn=C.localBridge.baseURL;let rn=[],_n=null,ro=!1,Dn="",oo=!1,Nt=!1;const We=e=>Z(e)?.execution==="if_studio";async function Jt(e,t={}){return C.localBridge.request(e,t)}function kt(e){switch(e.quota_status){case"limited":return`剩余 ${e.remaining} 次免费`;case"exhausted":return"剩余 0 次 · 免费次数已用完";case"unavailable":return"剩余 0 次 · 未开通";case"free":return"免费使用";case"paid":return"已开通 · 按预算使用";default:return e.quota_status?"次数未知":"次数未知 · 请更新桥接器"}}function Kn(e=!0){return _n||(ro=!0,_n=(async()=>{const t=await Jt("/status");if(!t.ready)throw new Error("请先在本机登录 IF CLI");return oo=t.reference_reuse===!0,Nt=t.request_recovery===!0,rn=(await Jt("/models")).models,Dn="",rn})().catch(t=>{throw Dn=t.message,t}).finally(()=>{_n=null,e&&b.panel._id&&Pe(b.panel._id)}),_n)}function qn(e,t){const n="chouka:if-references:v1:"+JSON.stringify([p.user?.id,t,e.id]);if(e._ifReferences?.key===n)return e._ifReferences;let r;try{r=JSON.parse(sessionStorage.getItem(n))}catch{}const o={key:n,entries:Array.isArray(r?.entries)?r.entries.slice(0,40):[],pending:Array.isArray(r?.pending)?r.pending.slice(0,40):[],job:r?.job||null};return e._ifReferences=o,o}function ar(e){try{sessionStorage.setItem(e.key,JSON.stringify({entries:e.entries,pending:e.pending,job:e.job}))}catch{}}function No(e){try{const n=new te(e?.canvas_url);if(n.origin==="https://ifs.alibaba-inc.com"&&!n.username&&!n.password&&n.pathname==="/"&&/^#\/canvas\/c_[A-Za-z0-9_-]+$/.test(n.hash))return n.href}catch{}const t=e?.canvas_id;return typeof t=="string"&&/^c_[A-Za-z0-9_-]+$/.test(t)?`https://ifs.alibaba-inc.com/#/canvas/${t}`:""}function zr(e){if(!We(e)||e.status!=="error")return null;const t=No({canvas_url:e.if_canvas_url});if(!t)return null;const n=l.createElement("a");n.className="if-canvas-link",n.textContent="打开 IF 画布",n.href=t,n.target="_blank",n.rel="noopener noreferrer",n.title="在新标签页查看 IF 生成失败原因";for(const r of["pointerdown","mousedown","click","dblclick"])n.addEventListener(r,o=>o.stopPropagation());return n}function zo(e){if(!We(e)||e.status!=="error"||!(e.job||e.if_request_id)||!ke())return null;const t=l.createElement("button");t.type="button",t.className="if-recover-button",t.textContent=e._ifRestoring?"正在查询原产物…":"查询原产物",t.disabled=!!e._ifRestoring,t.title="由发起人在原电脑查询原任务，不会重新提交生成";for(const n of["pointerdown","mousedown","dblclick"])t.addEventListener(n,r=>r.stopPropagation());return t.onclick=n=>{n.stopPropagation(),Gn(e)},t}async function Gn(e){const t=c;if(!t||!t.cards.includes(e)||!ke()||!We(e)||e.status!=="error"||!(e.job||e.if_request_id)||e._ifRestoring||e._ifPolling||!confirm(`请由任务发起人在原电脑操作。
只查询本机桥接器中的原任务并取回产物，不会重新生成。
若桥接器已重启，原记录可能无法恢复。继续查询？`))return;const n={cap:e.cap,job:e.job,request:e.if_request_id,started:e.if_started},r=()=>c===t&&t.cards.includes(e)&&ke()&&e.status==="error"&&e.cap===n.cap&&e.job===n.job&&e.if_request_id===n.request&&e.if_started===n.started;e._ifRestoring=!0,b.panel._id===e.id&&Pe(e.id);try{const o=n.job||(await Jt(`/requests/${encodeURIComponent(n.request)}`)).id;if(!r())return;if(!o)throw new Error("本机桥接器未返回原任务编号");const i=await Jt(`/runs/${encodeURIComponent(o)}`);if(!r())return;if(i.state==="error")throw new Error("原任务在 IF 中仍为失败："+(i.error||"请打开 IF 画布查看原因"));if(!["starting","running","done"].includes(i.state))throw new Error("原任务状态无法识别，请在 IF 查看");const s={...e,job:o,status:"running",error:null,progress:null,if_started:Number.isFinite(e.if_started)?e.if_started:Date.now(),step:"正在查询原任务并恢复产物"};if(!zt(s,t.id,"running"))throw new Error("无法保存恢复记录，请检查浏览器存储权限");Object.assign(e,{job:s.job,status:s.status,error:null,progress:null,if_started:s.if_started,step:s.step}),at(e),b.panel._id===e.id&&Pe(e.id),await En(e,t.id),await Eo(e,t.id,i)}catch(o){Ue(o.status===404?"本机未找到原任务，请由发起人在原电脑查询；若桥接器已重启，请到 IF 下载原产物。未重新提交生成。":"查询原产物未完成："+o.message+"；未重新提交生成。")}finally{e._ifRestoring=!1,c===t&&t.cards.includes(e)&&b.panel._id===e.id&&Pe(e.id)}}function sr(e,t){return"chouka:if-task:v1:"+JSON.stringify([p.user?.id,t,e.id])}function lr(e,t){let n;try{n=JSON.parse(sessionStorage.getItem(sr(e,t)))}catch{}return!!(n&&n.cap===e.cap&&Number.isFinite(e.if_started)&&n.if_started===e.if_started&&(e.if_request_id?n.if_request_id===e.if_request_id:e.job&&n.job===e.job)&&(!e.job||!n.job||e.job===n.job))}function zt(e,t,n){const r={phase:n,cap:e.cap,job:e.job,status:e.status,step:e.step,error:e.error,if_started:e.if_started,if_job_cap:e.if_job_cap,if_canvas_url:e.if_canvas_url,ms:e.ms,outputs:e.outputs||[],if_request_id:e.if_request_id,if_submitted_at:e.if_submitted_at,if_pending_prompts:e.if_pending_prompts,inputs:n==="preparing"?{params:e.params,assets:e.assets}:null,entry:e.job?e.history?.find(o=>o.job===e.job):null};try{return sessionStorage.setItem(sr(e,t),JSON.stringify(r)),!0}catch{return!1}}function dr(e,t){if(!We(e))return!1;const n=sr(e,t);let r;try{r=JSON.parse(sessionStorage.getItem(n))}catch{}if(!r||r.cap!==e.cap||!Number.isFinite(r.if_started)||!["preparing","submitting","running","done","error"].includes(r.phase))return!1;const o=r.phase==="submitting"&&r.if_request_id&&r.if_request_id===e.if_request_id&&!r.job&&!e.job&&e.status==="error",i=r.phase==="done"&&r.status==="done"&&r.job&&r.job===e.job&&e.status==="error"&&r.outputs?.length;if((e.if_started||0)>r.if_started||e.if_started===r.if_started&&(e.job&&e.job!==r.job||e.if_request_id&&r.if_request_id&&e.if_request_id!==r.if_request_id||!o&&!i&&e.job===r.job&&["done","error"].includes(e.status))){try{sessionStorage.removeItem(n)}catch{}return!1}for(const s of["job","status","step","error","if_started","if_job_cap","if_canvas_url","ms","outputs","if_request_id","if_submitted_at","if_pending_prompts"])e[s]=r[s];if(e.progress=null,r.entry&&r.entry.job===e.job){e.history||=[];const s=e.history.findIndex(d=>d.job===e.job);s<0?e.history.unshift(r.entry):e.history[s]=r.entry}return r.phase==="preparing"&&r.if_request_id&&r.inputs?(e.params=r.inputs.params,e.assets=r.inputs.assets,e.status="queued",e.error=null,e.step="正在恢复 IF 素材准备",e._ifResumePreparing=!0):r.phase==="submitting"&&r.if_request_id?(e.status="running",e.error=null,e.step="正在向本机 IF 确认原请求"):(r.phase==="preparing"||r.phase==="submitting")&&(e.status="error",e.step="",e.error=r.phase==="preparing"?"上次素材准备因页面离开而中断，尚未提交 IF；请确认后重试":"上次 IF 提交结果尚未确认，请先在 IF 查看是否已创建任务，避免重复生成",zt(e,t,"error")),!0}async function En(e,t){const n=e.if_started,r=e.job,o=e.status,i=sr(e,t),s=await Tn(t);if(s.ok&&["done","error"].includes(o))try{const d=JSON.parse(sessionStorage.getItem(i));d?.if_started===n&&d.job===r&&d.phase===o&&sessionStorage.removeItem(i)}catch{}return s}function gn(e){try{const t=new te(e);return t.protocol==="https:"&&t.hostname==="ant.alicdn.com"&&!t.port&&!t.username&&!t.password&&t.pathname.startsWith("/bio/img/")}catch{return!1}}function Ir(e,t,n){const r=qn(e,n);if(r.job===e.job){for(const o of t?.reference_urls||[]){const i=r.pending[o.index];!Number.isInteger(o.index)||!i||i.kind!==o.kind||!gn(o.url)||(r.entries=r.entries.filter(s=>s.source!==i.source),r.entries.push({...i,url:o.url}))}for(const o of t?.invalid_reference_indices||[]){const i=r.pending[o];i&&(r.entries=r.entries.filter(s=>s.source!==i.source||s.version!==i.version))}ar(r)}}async function Pr(e,t){const n=await Y(`/api/if-reference?${new URLSearchParams({url:e.pathname+e.search,type:t})}`,{method:"HEAD",credentials:"same-origin",cache:"no-store"});if(!n.ok)throw new Error(`无法检查引用素材（${n.status}），请确认素材仍存在且有访问权限`);const r=n.headers.get("ETag");if(!r||!/^"[a-f0-9]{64}"$/.test(r))throw new Error("抽卡服务尚不支持引用复用，请更新服务后重试");return r}const Ne=e=>{const t=Z(e),n=qt(e);return ut(e)?e.name||"素材节点":e.name||(n&&(n.ladder||n.route)?n.name:t?t.name:n?n.name:e.cap)},It=e=>!!e&&(st(e)||{}).kind==="style",cr="@style",bn="@text",Ge=e=>String(e.slot||"").startsWith("@"),Bt=e=>!!e&&(st(e)||{}).kind==="text",pt=e=>It(e)||Bt(e),ut=e=>!!e&&(st(e)||{}).kind==="asset",jt=e=>ut(e)&&(e.outputs||[])[0]||null,pn=e=>e?It(e)?String((e.params||{}).style||"").trim():String((e.params||{}).text||"").trim():"",Lr=e=>((e||{}).params||{}).op||"",Tr=e=>(c?c.edges:[]).filter(t=>t.to===e.id&&t.slot===bn).map(t=>lt(t.from)).filter(t=>t&&pt(t)).map(t=>({id:t.id,name:Ne(t),text:pn(t)})),Rt=e=>(e&&e.inputs||[]).filter(t=>t.type==="textarea"&&t.key!=="negative_prompt"&&!t.template&&!t.advanced),pr=e=>(c?c.edges:[]).filter(t=>t.to===e.id&&t.slot===cr).map(t=>c.cards.find(n=>n.id===t.from)).filter(t=>t&&pt(t)&&pn(t));function fi(e,t=new Set){if(!e||t.has(e.id))return[];t.add(e.id);const n=[],r=new Set;for(const o of(c?c.edges:[]).filter(i=>i.to===e.id&&!Ge(i))){const i=c.cards.find(s=>s.id===o.from);if(!(!i||pt(i)))for(const s of ur(i,t))r.has(s.id)||(r.add(s.id),n.push(s))}return n}function ur(e,t=new Set){if(!e)return[];const n=pr(e);return n.length?n:fi(e,t)}function fr(e){return(c?c.cards:[]).filter(t=>!pt(t)&&!pr(t).some(n=>n.id===e.id)&&ur(t).some(n=>n.id===e.id))}const mr=e=>ur(e).map(pn),Vt=()=>(c?c.cards:[]).filter(pt).forEach(e=>at(e)),Zn="{提示词}",io=(e,t)=>{const n=e.opt&&e.opt[t];return n&&String(n).trim()?String(n):null},E=(e,t)=>e.optUse&&e.optUse[t]?io(e,t):null,H=/^(?:For the target video, at [\d.]+ seconds|How the reference pictures align)[^\n]*\n/;function O(e,t){let n=String(e??"");for(const r of t){if(r.includes(Zn)){n=r.split(Zn).join(n);continue}if(!n.trim()){n=r;continue}const o=n.match(H);n=o?n.slice(0,o[0].length)+`
`+r+`

`+n.slice(o[0].length).replace(/^\s+/,""):r+`

`+n}return n}const fe=e=>Object.keys(e.assets||{}).filter(t=>t.startsWith("images[")&&e.assets[t]).length;function me(e){const t=qt(e);if(!t||!t.ladder)return e.cap;const n=Object.keys(t.ladder).map(Number).sort((o,i)=>o-i),r=Math.max(fe(e),n[0]);return t.ladder[String(n.filter(o=>o<=r).pop())]||e.cap}function je(e,t){const n=le[e];return n?.type===t?n:{type:t,api:{image:null,video:null,audio:null},bridge:{image:t==="video"?6:3,video:t==="video"?1:0,audio:0},reference_fallback:!0,note:"该模型引用规格尚未核实，使用画布兜底数量。"}}const Z=e=>{const t=ie[e.cap];if(!t||t.execution!=="if_studio")return t||null;const n=rn.filter(d=>d.type===t.outputType),r=e.params?.if_model||n[0]?.display_name,o=je(r,t.outputType),i=o.bridge,s=t.inputs.filter(d=>d.key!=="if_reference"||i?.image||i?.video).map(d=>d.key==="if_reference"?{...d,label:`参考${i?.image?"图片":""}${i?.image&&i?.video?"／":""}${i?.video?"视频":""} HTTPS 地址（可选）`}:d.key==="duration"?{...d,min:o?.duration?.min??1,max:o?.duration?.max??null,type:o?.duration?.max!=null?"slider":"number",step:1,default:o?.duration?.default??d.default,showHint:!0,hint:o?.duration?.max!=null?`当前模型时长：${o.duration.min}–${o.duration.max} 秒（整数）。`:"当前模型时长范围未核实；请输入正整数秒，不套用其他模型上限。"}:d);for(let d=0;d<(i?.image||0);d++)s.push({key:`images[${d}]`,label:"参考图片",type:"image"});for(let d=0;d<(i?.video||0);d++)s.push({key:`video[${d}]`,label:"参考视频",type:"video"});for(const[d,f]of Object.entries(e.assets||{}))f&&(/^images\[\d+\]$/.test(d)&&f.kind==="image"||/^video\[\d+\]$/.test(d)&&f.kind==="video")&&!s.some(h=>h.key===d)&&s.push({key:d,label:f.kind==="image"?"已保留的参考图片":"已保留的参考视频",type:f.kind});return{...t,inputs:s,slotLimits:{image:{max:i?.image||0},video:{max:i?.video||0},audio:{max:0}}}};function De(e){const t=Z(e)?.inputs.find(r=>r.key==="duration");if(!t)return;const n=Number(e.params.duration??t.default);e.params.duration=Math.min(t.max??1/0,Math.max(t.min,Number.isFinite(n)?Math.round(n):t.default))}function Pt(e,t){const n=qt(e),r=n&&n.route&&n.route[t];return r&&r.cap!==e.cap?r:null}function on(e,t,n){const r=n&&n.kind?Pt(e,n.kind):null;r&&(tr(c.edges.filter(s=>s.to===e.id)),e.cap=r.cap,e.assets={},t={key:r.slot},an(e),tt(),Vt());const o=st(e);let i=!1;return o&&o.id==="card_image"&&n&&n.kind==="image"&&(e.cap==="zimage_t2i"?(gr(e,"zimage_i2i"),e._model||(e._model="zimage"),i=!0):e.cap==="krea2_t2i"&&(gr(e,"krea2_i2i"),e._model||(e._model="krea2"),i=!0),i&&(an(e),tt(),Vt(),I(()=>Pe(e.id),50))),!r&&Sa(e.id,t.key)&&(tt(),Vt()),e.assets[t.key]=n,Qn(e),At(e),t}const{CLARITY_STEPS:Rr,RATIO_GRID:ao,resolutionPresets:so,resolutionPreset:mi,imageSettings:hr,applyInputPresets:Ks}=W,la=W.create({document:l,getCapability:e=>Z(e),getCapabilityById:e=>ie[e],getRunCapability:e=>ie[me(e)]||Z(e),getProject:()=>c,isIF:e=>We(e),normalizeIFDuration:e=>De(e),api:(...e)=>vt(...e),save:()=>xe(),onReferenceChange:e=>da(e),ratioWH:Mo,multiple:Wn}),{imageClarityPicker:Gs,referenceVideo:Zs,syncReferenceParameters:hi,refreshVideoParameters:Qn,videoReferenceStatus:Qs}=la,{clarityPicker:el,paramsBrief:gi,switchImageCapability:gr}=Hd({document:l,save:()=>xe(),claritySteps:Rr,ratioGrid:ao,imageClarityPicker:Gs,imageSettings:hr,resolutionPresets:so,resolutionPreset:mi,switchImageCapability:(e,t)=>la.switchImageCapability(e,t)});function da(e){if(!c?.cards.includes(e)||b.panel._id!==e.id)return;const t=We(e)?Z(e):ie[me(e)]||Z(e),n=b.panel.querySelector('button[title^="点开弹窗"]');n&&(n.textContent=`⚙ ${gi(e,t)||"参数"}`),b.respop._card===e&&b.respop.style.display!=="none"&&(b.respop._cap!==t.id?Bn():b.respop._refill())}const tl=e=>(e&&e.inputs||[]).filter(t=>!ai.has(t.key)&&!Dt.includes(t.type)&&t.type!=="textarea"&&(t.type==="seed"||!t.advanced)&&!t.mirror&&!t.rangeOf);function nl(e,t){const n=We(e)?Z(e):ie[me(e)]||Z(e),r=n&&(n.imageControls||n.inputs.some(h=>ai.has(h.key))),o=n?.imageControls?["steps","seed"].map(h=>n.inputs.find(m=>m.key===h&&!m.mirror)).filter(Boolean).map(h=>({...h,label:h.key==="steps"?"采样步数":"种子"})):tl(n);if(!r&&!o.length)return ye("这个模式没有可调参数");const i=()=>{if(b.panel._id!==e.id)return;const h=b.panel.querySelectorAll(".foot .tcap"),m=h[h.length-1];if(!m||!m.textContent.startsWith("⚙"))return;const u=gi(e,n);m.textContent=u?`⚙ ${u}`:"⚙ 参数"};let s=!1;const d=()=>{const h=b.respop.contains(l.activeElement)?l.activeElement.id:null;b.respop.innerHTML="";const m=Qs(e,n);if(m&&b.respop.appendChild(m),r&&b.respop.appendChild(el(e,n,d)),o.length){const y=l.createElement("div");y.className=n.imageControls?"pwrap image-basic":"pwrap",r&&(y.style.marginTop="12px");for(const x of o){const _=ni(e,x);Bd(_,i),y.appendChild(_)}b.respop.appendChild(y)}if(n.imageControls){const y=n.inputs.filter(x=>!Dt.includes(x.type)&&x.type!=="textarea"&&x.type!=="seed"&&x.key!=="steps"&&!ai.has(x.key)&&!x.mirror&&!x.rangeOf&&!(n.imageControls.mode==="t2i"&&x.key==="encode_resolution")&&!(We(e)&&x.key==="if_reference"));if(y.length){const x=l.createElement("details");x.className="image-advanced",x.open=s;const _=l.createElement("summary");_.textContent="模型专属参数",x.appendChild(_),x.addEventListener("toggle",()=>{!x.isConnected||x.open===s||(s=x.open,f())});for(const j of y)x.appendChild(ni(e,j));b.respop.appendChild(x)}}const u=l.createElement("button");u.className="x",u.textContent="✕",u.title="关闭 (Esc)",u.onclick=Bn,u.dataset.readonlyView="",b.respop.appendChild(u),xs(b.respop,!ke()),i(),h&&l.getElementById(h)?.focus({preventScroll:!0})};b.respop._card=e,b.respop._cap=n.id,b.respop._refill=()=>{d();const h=b.respop.getBoundingClientRect();(h.top<8||h.bottom>innerHeight-8)&&f()},d(),b.respop.style.display="",Qn(e);function f(){if(b.respop.style.display==="none"||!t.isConnected)return;const h=t.getBoundingClientRect(),m=h.top-64,u=innerHeight-h.bottom-16;b.respop.style.maxHeight=Math.max(160,Math.max(m,u))+"px";const y=b.respop.offsetWidth,x=b.respop.offsetHeight,_=Math.max(8,Math.min(h.left+h.width/2-y/2,innerWidth-y-8));let j=h.top-x-8;j<56&&(j=Math.max(8,Math.min(h.bottom+8,innerHeight-x-8))),b.respop.style.left=_+"px",b.respop.style.top=j+"px"}f()}const Bn=()=>{b.respop.style.display="none",b.respop._card=null,b.respop._refill=null},rl={image:"图片 (png)",video:"视频 (mp4，含音轨)",audio:"音频"},ol={4:"四宫格",6:"六宫格",9:"九宫格",12:"十二宫格",16:"十六宫格"};function ca(e){const t=e&&e.grid;if(!t)return"";const n=t[0]*t[1];return ol[n]||`${n}格`}function xn(e,t=null){const n=ca(e);if(Dt.includes(e.type)){const o=t&&Z(t),s=(o?o.inputs.filter(m=>m.type===e.type&&(t.assets||{})[m.key]):[]).findIndex(m=>m.key===e.key),d=+(String(e.key).match(/\[(\d+)\]/)||[0,0])[1],f=s>=0?s+1:d+1,h=`${Qe[e.type]||e.type}${f}`;return n?`${h}（${n}）`:h}const r=String(e.label||"").trim();return n?`${r}（${n}）`:r}function il(e){const t=u=>e.inputs.filter(y=>y.type===u),n=[...new Set(e.inputs.filter(u=>Dt.includes(u.type)).map(u=>u.type))],r=t("textarea"),o=e.inputs.find(u=>u.key==="duration"),i=e.inputs.filter(u=>u.key==="width"||u.key==="height"),s=e.inputs.find(u=>u.key==="aspect_ratio"),d=e.inputs.find(u=>u.key==="megapixels"),f=e.inputs.find(u=>u.key==="scale_to_length"),h=[],m=[];for(const u of n){const y=t(u),x=y.filter(S=>S.required),_=y.filter(S=>!S.required),j=Qe[u]||u;x.length&&h.push(`${j} ×${x.length}：${x.map(S=>xn(S)).join(" / ")}`),_.length&&m.push(`可引用${j}（上限 ${rr(e,u)}）`)}return n.length||h.push("不需要素材，纯提示词驱动"),r.length&&h.push(r.length>1?`提示词 ×${r.length}`:"提示词"),o&&m.push(o.max==null?"时长范围未核实（正整数秒）":`时长 ${o.min}–${o.max} 秒`),e.imageControls?(m.push(`清晰度 ${Rr.map(u=>u.label).join(" / ")}（短边）`),m.push(e.imageControls.mode==="i2i"?"默认原图比例，也可另选画面比例":"画面比例（13 档）")):(i.length&&m.push("画面宽高"),s&&m.push(`画面比例（${s.options.length} 档，默认 ${s.default}）`),d&&m.push(`分辨率 ${jr[0]}p–${jr[jr.length-1]}p（短边，768p 为 H3 原生）`),f&&m.push(`分辨率长边 ${f.min}–${f.max}，画面比例跟随原图`)),e.inputs.some(u=>u.type==="seed")&&m.push("种子"),{need:h,opt:m,out:rl[e.outputType]||e.outputType,file:e.file||e.id}}function al(e,t){const n=il(e),r=l.createElement("div"),o=l.createElement("b");if(o.textContent=t||e.name,r.appendChild(o),e.note){const d=l.createElement("div");d.className="note",d.textContent=e.note,r.appendChild(d)}const i=(d,f)=>{const h=l.createElement("div");h.className="io";const m=l.createElement("i");m.textContent=d;const u=l.createElement("span");u.textContent=f,h.append(m,u),r.appendChild(h)};i("输入",n.need.join("　·　")),n.opt.length&&i("可调",n.opt.join("　·　")),i("产出",n.out);const s=l.createElement("div");return s.className="fn",s.textContent=n.file,r.appendChild(s),r}function Io(e,t,n){const r=l.createElement("div"),o=l.createElement("b");o.textContent=e;const i=l.createElement("div");i.className="note",i.textContent=t,r.append(o,i);for(const[s,d]of n){const f=l.createElement("div");f.className="io";const h=l.createElement("i");h.textContent=s;const m=l.createElement("span");m.textContent=d,f.append(h,m),r.appendChild(f)}return r}function Po(e,t,n){if(!t)return null;const r=Cn(t,e.cap),o=r?t.ladder?me(e):e.cap:Xe(t),i=ie[o]||ie[Xe(t)];if(!i)return Io(n||t.name,"这个模式当前不可用。",[]);const s=al(i,n||t.name);let d="";if(t.route?d=(t.entry&&t.entry.hint?t.entry.hint:"根据放入的素材类型自动选择工作流。")+(r?`当前会运行「${i.name}」。`:""):t.ladder&&(d="按图片数量自动选择："+Object.keys(t.ladder).map(Number).sort((f,h)=>f-h).map(f=>`${f} 张 → ${(ie[t.ladder[f]]||{}).name||t.ladder[f]}`).join("；")+(r?`。当前 ${fe(e)} 张，会运行「${i.name}」。`:"。")),d){const f=l.createElement("div");f.className="note",f.textContent=d,s.insertBefore(f,s.children[1]||null)}return s}function sl(e){const t=st(e);return It(e)?Io(Ne(e),`这个节点保存一段可复用的风格描述，不会单独生成产物。连接到生成节点后会并入提示词，并沿产物连线向下游继承；下游节点自己挂风格时会从那里开始覆盖继承。使用 ${Zn} 可以指定原提示词插入位置。这里只写画风、色调、光线和镜头质感，具体画面内容留在生成节点。`,[["输入","风格、色调、光线和镜头质感"],["产出","可复用的风格文字"]]):Bt(e)?Io(Ne(e),"这个节点保存和加工文字。可以连接到生成节点并入提示词，也可以连接到其他文本节点作为加工输入；加工结果会写回节点。",[["输入","节点文字或上游文本"],["产出","可继续连接的文字"]]):ut(e)?Io(Ne(e),"这个节点保存一份上传素材，不会单独运行。它可以同时连接到多个节点，让同一份图片、视频或音频重复使用；原文件不会被处理。",[["输入","图片、视频或音频"],["产出","可复用的原始素材"]]):Po(e,qt(e),Ne(e)||t&&t.name)}function ll(e,t){b.tip.innerHTML="",b.tip.appendChild(e),b.tip.style.display="",b.tip.style.left=b.tip.style.top="0px";const n=8,r=52,o=b.stage.getBoundingClientRect(),i=o.left+n,s=o.right-n,d=b.tip.offsetWidth,f=b.tip.offsetHeight;let m=(y=>Math.max(i,Math.min(y,s-d)))(t.left),u=t.bottom+n;u+f>innerHeight-n&&(t.top-n-f>=r?u=t.top-n-f:(u=Math.max(r,innerHeight-n-f),s-(t.right+n)>=d?m=t.right+n:t.left-n-i>=d&&(m=t.left-n-d))),b.tip.style.left=m+"px",b.tip.style.top=u+"px"}const Kt=()=>b.tip.style.display="none";function Lo(e,t){let n=null;e.addEventListener("mouseenter",()=>{D(n),n=I(()=>{const r=t();r&&e.matches(":hover")&&ll(r,e.getBoundingClientRect())},280)}),e.addEventListener("mouseleave",()=>{D(n),Kt()}),e.addEventListener("mousedown",()=>{D(n),Kt()})}function dl(){if(!p.user?.id)return null;try{const e=localStorage.getItem(`chouka:last-project:${p.user.id}`);return pe.find(t=>t.id===e)||null}catch{return null}}function cl(e){if(!(R||!p.active||!p.user?.id))try{localStorage.setItem(`chouka:last-project:${p.user.id}`,e)}catch{}}const pa=(async function(){try{await p.requireUser(),p.mountAccount(l.getElementById("account"));const o=await vt("/api/cards",{cache:"no-store"});K=o.cards,ie=o.capabilities,le=o.if_model_limits||{},b.dot.classList.toggle("on",!!o.comfy_online)}catch(o){if(Ue("后端未就绪："+o.message),!p.active)return}if(a.disposed||(await Or(),a.disposed))return;zl();const t=new URLSearchParams(location.search),n=t.get("project"),r=t.get("card");if(n)await Ar(n),R?Dr():r&&c?.id===n&&await ls({project:n,card:r});else if(R)Dr();else{const o=dl();if(o&&await Ar(o.id),!c){const i=pe.find(s=>s.locked);i&&await Ar(i.id)}}await ua(),p.every(ua,5e3),p.every(Or,5e3),it(),p.every(it,700)})();async function ua(){try{const e=await vt("/api/health");b.dot.classList.toggle("on",!!e.comfy_online),e.mode==="controller"&&p.user?.role==="admin"?(b.dot.href=C.adminURL("/controller"),b.dot.title="打开运行面板",b.dot.setAttribute("aria-label","打开运行面板")):(b.dot.removeAttribute("href"),b.dot.title="ComfyUI 连接状态",b.dot.setAttribute("aria-label","ComfyUI 连接状态"))}catch{b.dot.classList.remove("on")}}function fa(e){return C.projectSpaces(e,p.user?.id,Me)}function To(){w.update({projects:pe,teams:Me,selectedSpace:Be,selectedId:c?.id||null,user:p.user})}async function Or(){if(!(!p.active||a.disposed)){try{const e=await C.projects.list();if(a.disposed)return;pe=e.projects,Me=e.teams}catch{return}if(c){const e=pe.find(t=>t.id===c.id);if(!e)Wt(),_e.retainProjects(pe.map(t=>t.id));else{const t=c.permission!==e.permission;Object.assign(c,{permission:e.permission,owner_id:e.owner_id,owner_display_name:e.owner_display_name,team_id:e.team_id,team_name:e.team_name,share_count:e.share_count,shared_team_ids:e.shared_team_ids,shared_personally:e.shared_personally,name:e.name,locked:e.locked}),t&&(un(),or(),br())}}cn(),To()}}const pl=()=>w.create();let bi=0;async function Ar(e){if(c&&c.id!==e&&tn()&&Ve.busy)try{await Mr(c.id)}catch(o){Ue("切换前保存失败，已保留当前画布："+o.message);return}Ve.cancelTimers(),qo();const t=++bi;try{const o=await C.projects.get(e);if(t!==bi||!p.active)return;c=o}catch(o){return Ue(o.message)}const n=fa(c);n.includes(Be)||(Be=n[0]||"personal"),To(),Ft=null,Ve.resetFailures(),Lt=!1,c.cards=c.cards||[],c.edges=c.edges||[],c.groups=c.groups||[];const r=[];for(const o of c.cards){const i=qt(o);if(i&&!i.route&&i.id!==o.cap&&!(i.modelSwitch&&Object.values(i.modelSwitch).includes(o.cap))&&(o.cap=i.id),i&&i.modelSwitch){const s=Object.entries(i.modelSwitch).find(([,d])=>d===o.cap);s&&(o._model=s[0])}dr(o,c.id)&&r.push(o),!We(o)&&!pt(o)&&!ut(o)&&o.status==="queued"&&!o.job&&!o._ifResumePreparing&&(o.status="error",o.error="上次提交未取得任务编号，请先检查任务列表，确认后再重试"),Go(o)}for(const o of c.cards)Bt(o)&&(o.cap!=="text"&&(o.cap="text"),!String((o.params||{}).text||"").trim()&&String(o.out||"").trim()&&(o.params=o.params||{},o.params.text=o.out));if(xi(),Q=Object.assign({x:60,y:70,k:1},c.view||{}),ve=null,ae.clear(),un(),b.empty.style.display="none",b.dock.style.display="",b.fit.style.display="",b.ptitle.textContent=c.name,l.getElementById("directorbtn").href=`/director?project=${encodeURIComponent(c.id)}`,c.locked){const o=l.createElement("span");o.className="ro",o.textContent="试玩画布 · 刷新还原",o.title="这张画布是示例：参数怎么改、节点怎么拖、重跑几遍都随便，改动只在这一次里有效，刷新就回到原样。想留下自己的东西就「＋ 新建项目」",b.ptitle.appendChild(o)}br();for(const o of c.cards)is(o,c.id);if(r.length&&tn()&&!c.locked)for(const o of r)En(o,c.id);cl(c.id),wa(c.id),Or()}function ul(){Hi(),b.empty.style.display="",b.world.innerHTML="",b.wires.innerHTML="",xr?.disconnect(),Bo.clear(),b.wires.classList.remove("has-flow"),b.ptitle.textContent="",b.dock.style.display="none",b.fit.style.display="none",b.hint.textContent=""}const Ro=C.plainCard,ma=["type","cap","name","x","y","w","h","params","assets","opt"];let er=[],Oo=[],Fr=null,Ao=null;function xi(){er=[],Oo=[],Fr=null,Ao=null}function ha(){return{cards:c.cards.map(e=>JSON.parse(JSON.stringify(Ro(e)))),edges:JSON.parse(JSON.stringify(c.edges)),groups:JSON.parse(JSON.stringify(c.groups||[]))}}function ga(e){return JSON.stringify({cards:e.cards.map(t=>{const n=Object.fromEntries(ma.filter(r=>t[r]!==void 0).map(r=>[r,t[r]]));return n.id=t.id,t.type==="card_asset"&&(n.outputs=t.outputs),n}),edges:e.edges,groups:e.groups})}function yi(e="action"){!c||!ke()||R||Fr||(Fr=ha(),Ao=e)}function Fo(){if(!Fr||!c)return;const e=ha(),t=Fr,n=Ao;if(Fr=null,Ao=null,ga(t)===ga(e))return;const r=er[er.length-1];n==="typing"&&r?.kind==="typing"&&Date.now()-r.at<1e3?r.after=e:(er.push({before:t,after:e,kind:n,at:Date.now()}),er.length>80&&er.shift()),Oo=[]}function fl(e){const t=new Map(c.cards.map(n=>[n.id,n]));c.cards=e.cards.map(n=>{const r=t.get(n.id);if(!r)return JSON.parse(JSON.stringify(n));const o=r;for(const i of ma)i in n?o[i]=JSON.parse(JSON.stringify(n[i])):delete o[i];return n.type==="card_asset"&&(o.outputs=JSON.parse(JSON.stringify(n.outputs||[]))),o}),c.edges=JSON.parse(JSON.stringify(e.edges)),c.groups=JSON.parse(JSON.stringify(e.groups)),Gt=null,ae=new Set([...ae].filter(n=>c.cards.some(r=>r.id===n))),ve&&!c.cards.some(n=>n.id===ve)&&(ve=null,un()),br(),ve&&Pe(ve),xe()}function ml(e=!1){if(!c||!ke()||R)return;Fo();const t=e?Oo:er,n=e?er:Oo,r=t.pop();r&&(n.push(r),fl(e?r.after:r.before))}for(const e of["pointerdown","keydown","beforeinput","paste","drop","change"])l.addEventListener(e,t=>{t.target.closest?.("[data-image-composer]")||!c||R||!ke()||t.type==="keydown"&&(t.ctrlKey||t.metaKey)&&/^(z|y)$/i.test(t.key)||yi(t.type==="beforeinput"?"typing":"action")},!0);function lo(){return!Lt&&c?.id===ge?c.cards.find(e=>e.id===Se):null}function Dr(){if(!R)return;const e=lo();ae.clear(),e?(ve=e.id,ae.add(e.id),e._el?.classList.add("sel"),Pe(e.id)):(ve=null,b.panel.replaceChildren(Qo("此节点已删除或不可访问；不会重新创建。请返回导演台刷新项目。")),b.panel._id=null,b.panel.style.display="",Ct())}R&&(N.ChoukaNodeEditor={async flush(){if(await pa,!lo())throw new Error("此节点已删除或不可访问");await Mr(ge)},payload(){const e=lo();if(!e)throw new Error("此节点已删除或不可访问");return Ki(e)}});const ba=["#00e5ff","#ff5da2","#9b7bff","#55e68a","#ffb84d","#58a6ff","#f778ba","#d2e75b"];function xa(e){let t=0;for(const n of String(e||""))t=t*31+n.codePointAt(0)>>>0;return ba[t%ba.length]}function hl(){if(!b.presenceUsers)return;const e=new Map;for(const n of Mt.values())e.has(n.user_id)||e.set(n.user_id,n);if(b.presenceUsers.replaceChildren(),b.presenceUsers.classList.toggle("on",e.size>0),!e.size)return;const t=l.createElement("span");t.className="presence-count",t.textContent=`${e.size} 人使用中`,b.presenceUsers.appendChild(t);for(const n of e.values()){const r=l.createElement("span");r.className="presence-avatar";const o=xa(n.user_id);r.style.background=o,r.style.boxShadow=`0 0 0 1px ${o}`,r.textContent=String(n.name||"协").trim().slice(0,1).toUpperCase(),r.title=`${n.name||"协作者"} · 正在此画布`,b.presenceUsers.appendChild(r)}}function gl(e){if(!b.presenceLayer||e.connection_id===Ln)return null;let t=e._el;if(t?.isConnected)return t;t=l.createElement("div"),t.className="collab-cursor";const n=xa(e.user_id);t.style.color=n;const r=l.createElement("div");r.className="pointer";const o=l.createElement("div");o.className="label",o.style.backgroundColor=n;const i=l.createElement("span");return i.textContent=e.name||"协作者",o.appendChild(i),t.append(r,o),b.presenceLayer.appendChild(t),e._el=t,t}function ya(e){if(e.connection_id===Ln){e._el?.remove(),e._el=null;return}const t=gl(e);t&&(t.classList.toggle("hidden",!e.visible),e.visible&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&(t.style.transform=`translate(${e.x}px,${e.y}px) scale(${1/Q.k})`))}function wi(){for(const e of Mt.values())ya(e)}function bl(e,t,n){if(Number.isFinite(n)&&n<sn)return;Number.isFinite(n)&&(sn=n),Ln=t||Ln;const r=new Map;for(const o of e||[]){const i=Mt.get(o.connection_id);r.set(o.connection_id,Object.assign(i||{},o))}for(const[o,i]of Mt)r.has(o)||i._el?.remove();Mt=r,hl(),wi()}function xl(e,t){!c||c.id!==e||t<=(c.rev||0)||vt(`/api/projects/${encodeURIComponent(e)}`).then(n=>Do(n)).catch(()=>{})}function Do(e){if(!c||e.id!==c.id||(e.rev||0)<=(c.rev||0))return;if(R&&!(e.cards||[]).some(o=>o.id===Se)&&(Lt=!0,Ve.cancelContentSave(),Dr()),Ve.busy||St){(!Ft||(e.rev||0)>(Ft.rev||0))&&(Ft=e);return}const t=b.panel.style.display!=="none",n=[],r=new Map(c.cards.filter(o=>We(o)&&lr(o,c.id)&&["queued","running"].includes(o.status)&&Number.isFinite(o.if_started)).map(o=>[o.id,o]));c.name=e.name,c.cards=(e.cards||[]).map(o=>{const i=r.get(o.id),s=i&&o.if_started===i.if_started&&o.job===i.job;if(i&&o.cap===i.cap&&(o.if_started||0)<=i.if_started&&!(o.if_started===i.if_started&&o.job&&i.job&&o.job!==i.job)&&!(o.if_started===i.if_started&&o.if_request_id&&i.if_request_id&&o.if_request_id!==i.if_request_id)&&!(s&&["done","error"].includes(o.status))){const d=Object.fromEntries(["params","assets","job","status","step","error","progress","if_started","if_job_cap","if_canvas_url","if_request_id","if_submitted_at","if_pending_prompts","ms","outputs","history","_ifPolling","_ifRecovering","_ifResumePreparing"].map(f=>[f,i[f]]));return Object.assign(i,o,d)}return dr(o,e.id)&&n.push(o),o}),c.edges=e.edges||[],c.groups=e.groups||[],c.rev=e.rev,c.updated=e.updated,c.director=e.director,xi();for(const o of c.cards)Go(o);ve&&!c.cards.some(o=>o.id===ve)&&(ve=null),ae=new Set([...ae].filter(o=>c.cards.some(i=>i.id===o))),b.ptitle.textContent=c.name,br();for(const o of c.cards)r.get(o.id)!==o&&is(o,c.id);if(n.length&&tn()&&!c.locked)for(const o of n)En(o,c.id);R||(t&&ve?Pe(ve):ve||un())}function vi(){if(!Ft||Ve.busy||St)return;const e=Ft;Ft=null,Do(e)}function qo(){if(D(yn),yn=null,D(Jn),Jn=null,Xt=null,ct=null,Ln=null,sn=-1,$t){const e=$t;$t=null;try{e.close(1e3,"leave canvas")}catch{}}for(const e of Mt.values())e._el?.remove();Mt.clear(),b.presenceLayer?.replaceChildren(),b.presenceUsers?.replaceChildren(),b.presenceUsers?.classList.remove("on")}function wa(e){qo(),ct=e;const t=C.presence(e);$t=t,t.onopen=()=>xl(e,1/0),t.onmessage=n=>{if(t!==$t||ct!==e)return;let r;try{r=C.parsePresence(n.data)}catch{return}if(r.type==="presence")bl(r.members,r.self,r.version);else if(r.type==="cursor"){const o=Mt.get(r.connection_id);if(!o)return;Object.assign(o,r),ya(o)}else r.type==="card-added"?zi(r.card,r.rev):r.type==="project-changed"?Do(r.project):r.type==="project-deleted"&&(ye("这张画布已被删除"),Wt(),Or())},t.onclose=()=>{t===$t&&($t=null,ct===e&&c?.id===e&&p.active&&(yn=I(()=>wa(e),1500)))}}function va(e,t,n=!0){Xt={type:"cursor",x:e,y:t,visible:n},Jn===null&&(Jn=I(()=>{Jn=null,$t?.readyState===L.OPEN&&Xt&&$t.send(C.serializeCursor(Xt)),Xt=null},50))}function Hn(){b.world.style.transform=`translate(${Q.x}px,${Q.y}px) scale(${Q.k})`,b.wires.style.transform=b.world.style.transform,b.groups.style.transform=b.world.style.transform,b.presenceLayer&&(b.presenceLayer.style.transform=b.world.style.transform),typeof wi=="function"&&wi(),b.wires.setAttribute("width",1),b.wires.setAttribute("height",1),jn(),co(),yl(),Bi()}function yl(){b.zoomPercent&&(b.zoomPercent.textContent=Math.round(Q.k*100)+"%")}function Sn(e,t){const n=b.stage.getBoundingClientRect();return{x:(e-n.left-Q.x)/Q.k,y:(t-n.top-Q.y)/Q.k}}let qr=!1;function co(){if(!qr||!c||!c.cards.length)return;const e=b.minimapCanvas,t=e.getContext("2d"),n=200,r=150;e.width=n,e.height=r;let o=1/0,i=1/0,s=-1/0,d=-1/0;for(const B of c.cards){const be=Te(B),Ke=B._el?B._el.offsetHeight:200;o=Math.min(o,B.x),i=Math.min(i,B.y),s=Math.max(s,B.x+be),d=Math.max(d,B.y+Ke)}const f=50;o-=f,i-=f,s+=f,d+=f;const h=s-o,m=d-i,u=Math.min(n/h,r/m);t.fillStyle="#070707",t.fillRect(0,0,n,r),t.fillStyle="#f3f4f6",t.strokeStyle="#f3f4f6",t.lineWidth=1;for(const B of c.cards){const be=(B.x-o)*u,Ke=(B.y-i)*u,dt=Te(B)*u,et=(B._el?B._el.offsetHeight:200)*u;t.fillRect(be,Ke,dt,et),t.strokeRect(be,Ke,dt,et)}const y=b.stage.getBoundingClientRect(),x=(-Q.x/Q.k-o)*u,_=(-Q.y/Q.k-i)*u,j=y.width/Q.k*u,S=y.height/Q.k*u;b.minimapViewport.style.left=x+"px",b.minimapViewport.style.top=_+"px",b.minimapViewport.style.width=j+"px",b.minimapViewport.style.height=S+"px",b.minimap._scale=u,b.minimap._minX=o,b.minimap._minY=i}function wl(){qr=!qr,b.minimap.style.display=qr?"":"none",b.minimapBtn.classList.toggle("active",qr),qr&&co()}function vl(){let e=!1;const t=(n,r)=>{if(!e)return;const o=b.minimap.getBoundingClientRect(),i=n-o.left,s=r-o.top,d=b.minimap._scale||1,f=b.minimap._minX||0,h=b.minimap._minY||0,m=i/d+f,u=s/d+h,y=b.stage.getBoundingClientRect();Q.x=-m*Q.k+y.width/2,Q.y=-u*Q.k+y.height/2,Hn(),Ct(),ln()};b.minimapViewport.addEventListener("mousedown",n=>{n.preventDefault(),e=!0}),b.minimap.addEventListener("mousedown",n=>{n.target!==b.minimapViewport&&(n.preventDefault(),e=!0,t(n.clientX,n.clientY))}),v("mousemove",n=>{e&&t(n.clientX,n.clientY)}),v("mouseup",()=>{e=!1})}function br(){Hi(),b.world.innerHTML="";const e=l.createDocumentFragment();for(const t of c.cards)e.appendChild(ki(t));b.world.appendChild(e),Hn(),tt(),Xr(),b.hint.textContent=`${c.cards.length} 个节点`,co(),R&&Dr()}const ka=e=>(ie[me(e)]||Z(e)||st(e)||{}).outputType||"image",Ca=e=>{const t=qt(e);return!!(t&&t.route)&&!Object.values(e.assets||{}).some(Boolean)};function Br(e){return It(e)?'<span class="ph">🎨</span>':Bt(e)?'<span class="ph">✍</span>':ut(e)?'<span class="ph">📎</span>':`<span class="ph">${Ca(e)?"🖼🎬":ka(e)==="video"?"🎬":"🖼"}</span>`}const kl="button,input,textarea,select,audio,.vprog,.cmp,.rz,.port,.inport";function ki(e){const t=st(e),n=l.createElement("div");n.className="card"+(ve===e.id?" sel":""),n.dataset.id=e.id,n.style.left=e.x+"px",n.style.top=e.y+"px",n.innerHTML=`
    <div class="ch"><span>${t?t.icon:"▪"}</span><span class="t"></span><button class="x" type="button" title="删除" aria-label="删除节点">✕</button></div>
    <div class="body">${Br(e)}</div>
    <div class="bar"><i></i></div>
    <div class="cf"><span class="kt"></span><span class="st"></span><span class="meta" style="margin-left:auto"></span></div>
    <div class="rz tl" title="拖动改大小（按住 Shift 只改宽）"></div>
    <div class="rz br" title="拖动改大小（按住 Shift 只改宽）"></div>
    <div class="inport"></div>
    <div class="port" title="${ut(e)?"拖到别的节点上 → 这份素材就进它的格子":"拖到空白处 → 用本节点产物新建下游节点"}"></div>`,e._el=n,Xn(e),an(e);const r=n.querySelector(".ch .x");return r.onmousedown=o=>o.stopPropagation(),r.onclick=o=>{o.stopPropagation(),Ba(e)},n.querySelector(".rz.tl").onmousedown=o=>La(o,e,n,-1),n.querySelector(".rz.br").onmousedown=o=>La(o,e,n,1),n.querySelector(".port").onmousedown=o=>Nl(o,e),n.onmousedown=o=>{if(!(o.button===1||o.button===0&&o.shiftKey)){if(o.button===0&&!o.target.closest(kl))return Ml(o,e);o.stopPropagation(),!(o.button===2&&ae.has(e.id)&&c.cards.filter(i=>ae.has(i.id)).length>1)&&Ht(e.id)}},n.oncontextmenu=o=>{o.stopPropagation(),o.preventDefault(),Kt(),!(ae.has(e.id)&&Na(o.clientX,o.clientY))&&(Ht(e.id),Rl(o.clientX,o.clientY,e))},n.ondblclick=o=>{const i=o.target.closest(".body");if(!(!i||pt(e))&&!(ut(e)&&!jt(e))&&!o.target.closest(".vprog")){if(o.target.matches("audio")){const s=o.target.getBoundingClientRect();if(o.clientY>s.bottom-34*Q.k)return}for(const s of i.querySelectorAll("video"))vr(s),s.pause();ho(e,+(o.target.dataset.i||0))}},Cl(n.querySelector(".body")),El(n.querySelector(".body"),e),Lo(n,()=>sl(e)),n.onclick=o=>{!ut(e)||jt(e)||o.target.closest(".body")&&ti(e)},at(e),n}let Hr=null;l.addEventListener("play",e=>{if(!(e.target.paused||!e.target.isConnected)){for(const t of l.querySelectorAll("video, audio"))t!==e.target&&(vr(t),t.pause());Hr=e.target}},!0),l.addEventListener("pause",e=>{Hr===e.target&&(Hr=null)},!0),l.addEventListener("mousedown",e=>{for(const n of l.querySelectorAll("video"))n._playRequest&&!n.closest(".body, .vbox")?.contains(e.target)&&vr(n);if(!Hr)return;const t=Hr.closest(".body, .vbox, .arange");(!t||!t.contains(e.target))&&Hr.pause()},!0);function Cl(e){const t=(n,r,o)=>{if(!isFinite(n.duration)||!n.duration)return;const i=o.getBoundingClientRect();n.currentTime=Math.min(Math.max((r-i.left)/i.width,0),1)*n.duration};e.onmousedown=n=>{if(n.button!==0)return;const r=n.target.closest(".vprog");if(r){const f=e.querySelector("video");if(!f)return;n.stopPropagation(),n.preventDefault();const h=!f.paused;f.pause(),t(f,n.clientX,r);const m=y=>t(f,y.clientX,r),u=()=>{l.removeEventListener("mousemove",m),l.removeEventListener("mouseup",u),h&&f.play().catch(()=>{})};l.addEventListener("mousemove",m),l.addEventListener("mouseup",u);return}const o=n.target.closest("video");if(!o)return;const i=n.clientX,s=n.clientY,d=f=>{l.removeEventListener("mouseup",d),!(Math.abs(f.clientX-i)+Math.abs(f.clientY-s)>=4)&&(o._previewController?vr(o):o.paused?Vl(o):(vr(o),o.pause()))};l.addEventListener("mouseup",d)},e.addEventListener("timeupdate",n=>{const r=e.querySelector(".vprog i"),o=n.target;!r||!isFinite(o.duration)||!o.duration||(r.style.width=o.currentTime/o.duration*100+"%")},!0)}function Xn(e){const t=e._el;if(!t)return;t.style.width=Te(e)+"px";const n=t.querySelector(".body");n.style.height=e.h&&!n.classList.contains("grid")?e.h+"px":""}function po(e){const t=e._el;if(!t)return;let n=t.querySelector(".composite-inputs");if(e.cap!=="image_composite"){n?.remove();return}const r=(Z(e)?.inputs||[]).filter(h=>h.type==="image"),o=new Set((c?.edges||[]).filter(h=>h.to===e.id&&!Ge(h)).flatMap(wn)),i=r.filter(h=>e.assets?.[h.key]||o.has(h.key)),s=JSON.stringify(i.map(h=>[h.key,e.assets?.[h.key],o.has(h.key)]));if(n?.dataset.signature===s)return;n||(n=l.createElement("div"),n.className="composite-inputs",t.querySelector(".body").after(n)),n.dataset.signature=s,n.replaceChildren();const d=l.createElement("div");if(d.className="composite-input-label",d.textContent=`引用图片 · ${i.length}/${r.length}`,n.append(d),!i.length){const h=l.createElement("div");h.className="composite-input-hint",h.textContent="从图片节点连线，或在编辑器中上传图片",n.append(h);return}const f=l.createElement("div");f.className="composite-input-list",n.append(f);for(const h of i){const m=e.assets?.[h.key],u=l.createElement("button");if(u.type="button",u.dataset.compositeReference=h.key,u.title=`${h.label} · ${m?.origin||m?.filename||(m?"查看引用图片":"正在导入")}`,u.setAttribute("aria-label",u.title),u.disabled=!m?.url,m?.url){const x=l.createElement("img");x.src=Va(m.url)||m.url,x.alt=h.label,x.loading="lazy",x.draggable=!1,u.append(x),u.onmousedown=_=>_.stopPropagation(),u.onclick=_=>{_.stopPropagation(),vo(m)}}const y=l.createElement("span");y.textContent=m?h.label:"导入中",u.append(y),f.append(u)}}function at(e){const t=e._el;if(!t)return;po(e);const n=t.querySelector(".body"),r=t.querySelector(".st"),o=t.querySelector(".meta"),i=t.querySelector(".bar i");if(It(e)){const x=String((e.params||{}).style||"").trim();if(n.classList.remove("grid"),n.classList.add("sbody"),Xn(e),n.textContent="",x){const B=l.createElement("div");B.className="stx",B.textContent=x,n.appendChild(B)}else n.innerHTML=Br(e)+'<div class="sempty">在旁边的面板里写一段风格，再把出口拖到生图/生视频节点上</div>';const _=t.querySelector(".port");_&&(_.title="拖到生图/生视频节点上 → 那个节点套用这段风格（拖到空白处会列出所有能挂的玩法）");const j=(c?c.edges:[]).filter(B=>B.from===e.id&&Ge(B)).length,S=fr(e).length;r.className="st",r.textContent=x?"":"还没写",o.textContent=j?`挂了 ${j} 个节点`+(S?` · 连带下游 ${S} 张`:""):"还没挂节点",i.style.width="0%";return}if(Bt(e)){const x=e.status==="running";n.classList.remove("grid"),n.classList.add("sbody"),Xn(e),n.textContent="";const _=l.createElement("textarea");if(_.className="ttxt",_.spellcheck=!1,_.value=String((e.params||{}).text||""),_.placeholder=x?"正在加工，稍等…":"在这里写字；选好加工方式点「↑ 运行」，加工结果就落在这个框里 —— 可以直接改",_.disabled=x,_.oninput=()=>{e.params=e.params||{},e.params.text=_.value;const j=l.querySelector("#panel"),S=j?j.querySelector("textarea"):null;S&&S.placeholder==="在这里写字或直接在节点上写"&&(S.value=_.value),Ci(e),xe()},n.appendChild(_),x){const j=l.createElement("div");j.className="load cover",n.appendChild(j)}Ci(e);return}const s=e.outputs||[],d=s[0],f=_l(e),h=s.map(x=>x.url).join("|")+(f?"|<"+f:""),m=e.status==="queued"||e.status==="running";if(m&&n.dataset.url!=="busy"?(n.dataset.url="busy",n.classList.remove("grid"),Xn(e),n.innerHTML='<div class="load"></div>'):!m&&!s.length&&n.dataset.url==="busy"?(n.dataset.url="",n.innerHTML=Br(e)):ut(e)&&!s.length&&n.dataset.url&&(n.dataset.url="",n.classList.remove("grid"),n.innerHTML=Br(e)),!m&&s.length&&n.dataset.url!==h&&(n.dataset.url=h,n.classList.toggle("grid",s.length>1),Xn(e),s.length>1?(n.style.setProperty("--cols",s.length<=4?2:s.length<=9?3:4),n.innerHTML=s.map((x,_)=>x.kind==="video"?`<video data-video-url="" data-i="${_}" loop preload="none" draggable="false"></video>`:`<img data-i="${_}" alt="" draggable="false">`).join("")):n.innerHTML=d.kind==="video"?'<video data-video-url="" data-i="0" loop preload="none" draggable="false"></video><div class="vprog" title="按住左右拖 → 定位进度（画面上按住是挪节点）"><i></i></div>':d.kind==="audio"?'<audio preload="none" controls style="width:92%"></audio>':f?'<div class="cmp" title="按住左右拖：跟原图对比，看边缘抠干净了没有"><img class="new" alt="" draggable="false" data-i="0"><img class="old" alt="" draggable="false"><div class="cmpx"><i>⇔</i></div><div class="cmptip">按住往右拖 → 回到原图</div></div>':'<img data-i="0" alt="" draggable="false">',Jl(n,s,f),f&&_a(e),!pt(e)&&!ut(e)))for(let x=0;x<s.length;x++){const _=s[x];if(_.kind==="image"&&!_.width){const j=n.querySelector(`img[data-i="${x}"]`)||n.querySelector("img");if(j&&!j.dataset.thumbnail){const S=()=>{!t.isConnected||e._el!==t||!c?.cards.includes(e)||e.outputs?.[x]!==_||!j.naturalWidth||(_.width=j.naturalWidth,_.height=j.naturalHeight,At(e),xe())};j.complete&&j.naturalWidth?S():j.onload=S}}else if(_.kind==="video"&&!_.width){const j=n.querySelector(`video[data-i="${x}"]`)||n.querySelector("video");j&&j.readyState>=1?(_.width=j.videoWidth,_.height=j.videoHeight,At(e),xe()):j&&(j.onloadedmetadata=()=>{!t.isConnected||e._el!==t||!c?.cards.includes(e)||e.outputs?.[x]!==_||(_.width=j.videoWidth,_.height=j.videoHeight,At(e),xe())})}}if(ut(e)){r.className="st"+(d?" done":""),r.textContent=d?"已就绪":"点节点选文件",r.title=d?"把右边的出口拖到别的节点 → 这份素材就进那个节点的格子里":r.textContent,i.style.width="0%",o.textContent=d?String(d.filename||d.origin||d.url||"").split(/[\\/]/).pop().slice(-22):"",o.title=d&&d.origin||"";return}const u=e.status;r.className="st"+(u==="running"||u==="queued"?" run":u==="done"?" done":u==="error"?" err":""),r.textContent=u==="queued"?We(e)&&e.step?e.step:e.job?Is(e):"正在提交…":u==="running"?(We(e)&&!(e.progress>0)?"生成中":`生成中 ${Math.round((e.progress||0)*100)}%`)+(e.step?` · ${e.step}`:""):u==="done"?kr(e.ms)?`已完成 · ${kr(e.ms)}`:"已完成":u==="error"?"失败":u==="canceled"?"已取消":e.cap==="image_composite"?"待合成":"待生成",r.title=r.textContent,i.style.width=(u==="running"||u==="queued"?We(e)&&!(e.progress>0)?0:(e.progress||.02)*100:u==="done"?100:0)+"%",o.textContent=e.error?String(e.error).slice(0,40):s.length>1?`${s.length} 张`:d?String(d.filename||d.origin||d.url||"").split(/[\\/]/).pop().slice(-22):"",o.title=e.error||"";const y=zr(e);y&&o.replaceChildren(y)}function Ci(e){const t=e._el;if(!t)return;const n=t.querySelector(".st"),r=t.querySelector(".meta"),o=t.querySelector(".bar i"),i=Lr(e),s=e.status==="running",d=pn(e),f=t.querySelector(".port");f&&(f.title="拖到生成节点上 → 并进它的提示词；拖到另一个文本节点上 → 当那段加工的输入（拖到空白处会列出能接的地方）");const h=(c?c.edges:[]).filter(y=>y.from===e.id&&Ge(y)).length,m=Tr(e).length;n.className="st"+(s?" run":e.status==="error"?" err":i&&e.status==="done"?" done":""),s?n.textContent="处理中…":i?n.textContent=e.status==="error"?"失败":e.status==="done"?kr(e.ms)?`已完成 · ${kr(e.ms)}`:"已完成":"待运行":n.textContent=d?"":"还没写",n.title=n.textContent;const u=[];i&&u.push(`输入 ${m} 段`),h&&u.push(`连 ${h} 个节点`),r.textContent=u.join(" · "),r.title=e.error||"",o.style.width=s?"40%":e.status==="done"?"100%":"0%"}function _l(e){const t=ie[me(e)];if(!t||!t.compare||t.card==="image")return null;const n=e.outputs||[];if(n.length!==1||n[0].kind!=="image")return null;const r=(t.inputs||[]).find(i=>i.type==="image"),o=r&&(e.assets||{})[r.key];return o&&o.kind==="image"?o.url:null}function _a(e){const t=e._el&&e._el.querySelector(".cmp");if(!t)return;const n=e._cmp==null?0:e._cmp;t.style.setProperty("--x",n*100+"%"),t.classList.toggle("dragged",e._cmp!=null)}function El(e,t){e.addEventListener("mousedown",n=>{if(n.button!==0)return;const r=n.target.closest(".cmp");if(!r)return;n.preventDefault();const o=d=>{const f=r.getBoundingClientRect();t._cmp=Math.min(Math.max((d-f.left)/f.width,0),1),_a(t)};o(n.clientX);const i=d=>o(d.clientX),s=()=>{l.removeEventListener("mousemove",i),l.removeEventListener("mouseup",s)};l.addEventListener("mousemove",i),l.addEventListener("mouseup",s)})}const lt=e=>(c?c.cards:[]).find(t=>t.id===e)||null;function Ea(e,t,n,r=!0){if(!t||!n||n.length<=1)return t?[t]:[];const o=/^(\w+)\[(\d+)\]$/.exec(t),i=e&&Z(e);if(!o||!i)return[t];const s=o[1],d=+o[2],f=n[0]&&n[0].kind,h=r?new Set((c?.edges||[]).filter(u=>u.to===e.id&&!Ge(u)).flatMap(wn)):null,m=(i.inputs||[]).filter(u=>{const y=new RegExp(`^${s}\\[(\\d+)\\]$`).exec(u.key);return y&&+y[1]>=d&&(!f||u.type===f)&&(!r||!(e.assets||{})[u.key]&&!h.has(u.key))}).sort((u,y)=>parseInt(/\[(\d+)\]/.exec(u.key)[1],10)-parseInt(/\[(\d+)\]/.exec(y.key)[1],10)).slice(0,n.length).map(u=>u.key);return m.length?m:[t]}function wn(e){if(!e||Ge(e))return[];if(Array.isArray(e.slots))return[...new Set(e.slots.filter(Boolean))];const t=lt(e.from),n=lt(e.to),r=t&&t.outputs||[],o=t&&t.history&&t.history[0]&&t.history[0].outputs||[];return Ea(n,e.slot,r.length?r:o,!1)}function _i(e){const t=lt(e&&e.to);if(!t||!t.assets)return!1;let n=!1;for(const r of wn(e))r in t.assets&&(delete t.assets[r],n=!0);return n&&(Qn(t),At(t)),n}function tr(e,t=!0){const n=new Set(e||[]);if(!n.size)return!1;if(t)for(const r of n)_i(r);c.edges=c.edges.filter(r=>!n.has(r));for(const r of new Set([...n].map(o=>o.to))){const o=lt(r);o&&po(o)}return!0}function Sa(e,t){const n=[];let r=!1;for(const o of c.edges){if(o.to!==e||Ge(o))continue;const i=wn(o);if(!i.includes(t))continue;const s=i.filter(d=>d!==t);r=!0,s.length?(o.slots=s,o.slot===t&&(o.slot=s[0])):n.push(o)}return tr(n,!1),r}function Ei(e){const t=lt(e);if(!t)return null;const n=t._el?t._el.offsetHeight:230;return{x:t.x,y:t.y,w:Te(t),h:n}}let Gt=null,xr=null;const Bo=new Map;function Sl(e,t){const n=new Set(e.cards.map(s=>s.id)),r=new Map,o=new Map;for(const s of e.edges)!n.has(s.from)||!n.has(s.to)||(r.has(s.to)||r.set(s.to,[]),o.has(s.from)||o.set(s.from,[]),r.get(s.to).push(s),o.get(s.from).push(s));const i=(s,d)=>{const f=new Set,h=new Set,m=[...t].filter(u=>n.has(u));for(;m.length;){const u=m.pop();if(!h.has(u)){h.add(u);for(const y of s.get(u)||[])f.add(y),m.push(y[d])}}return f};return{upstream:i(r,"from"),downstream:i(o,"to")}}function ja(e){if(Ge(e))return!1;const t=lt(e.from),n=lt(e.to);return!!(t&&n&&!pt(t)&&ur(t).length&&!pr(n).length)}function Si(e){const t=lt(e.from),n=lt(e.to),r=o=>o?Ne(o):"?";return Ge(e)?e.slot===bn?`文本：${r(t)} → ${r(n)}`:`风格：${r(t)} → ${r(n)}`:`${r(t)} → ${r(n)}${e.version?`（固定分镜版本 · ${e.version.job} · 第 ${e.version.index+1} 张）`:""}`}function $a(){xr?.disconnect();const e=Gt||R?[]:ae.size?[...ae]:ve?[ve]:[],{upstream:t,downstream:n}=c&&e.length?Sl(c,e):{upstream:new Set,downstream:new Set};b.wires.classList.toggle("has-flow",!!(t.size||n.size));const r=t.size||n.size;if(r||b.wires.querySelector("defs")?.remove(),r&&!b.wires.querySelector("defs")){const o=l.createElementNS(de,"defs");for(const i of["up","down","both"]){const s=l.createElementNS(de,"marker");for(const[f,h]of Object.entries({id:`wire-arrow-${i}`,class:`flow-${i}`,viewBox:"0 0 10 8",refX:9,refY:4,markerWidth:10,markerHeight:8,markerUnits:"userSpaceOnUse",orient:"auto"}))s.setAttribute(f,h);const d=l.createElementNS(de,"polygon");d.setAttribute("points","0,0 9,4 0,8 2.5,4"),s.append(d),o.append(s)}b.wires.append(o),xr||(xr=new $(i=>{for(const s of i)s.target.classList.toggle("in-view",s.isIntersecting)},{root:b.stage,rootMargin:"80px"}))}for(const[o,i]of Bo){const s=t.has(o)?n.has(o)?"both":"up":n.has(o)?"down":"";if(i.line.classList.toggle("sel",o===Gt),i.line.classList.toggle("related",!!s),i.carry?.classList.toggle("related",!!s),!s){i.flow?.remove(),i.flow=null;continue}i.flow||(i.flow=l.createElementNS(de,"path"),i.flow.setAttribute("d",i.line.getAttribute("d")),i.flow.setAttribute("aria-hidden","true"),i.flow.classList.add("flow"),b.wires.append(i.flow)),i.flow.classList.remove("flow-up","flow-down","flow-both"),i.flow.classList.add(`flow-${s}`),i.flow.setAttribute("marker-end",`url(#wire-arrow-${s})`),xr.observe(i.flow)}}function tt(e=!0){if(!e){$a(),jn();return}if(xr?.disconnect(),Bo.clear(),b.wires.innerHTML="",!c){b.wires.classList.remove("has-flow"),jn();return}for(const t of c.edges){const n=Ei(t.from),r=Ei(t.to);if(!n||!r)continue;const o=n.x+n.w,i=n.y+n.h/2,s=r.x,d=r.y+r.h/2,f=Math.max(50,Math.abs(s-o)*.5),h=`M${o},${i} C${o+f},${i} ${s-f},${d} ${s},${d}`,m=j=>{const S=l.createElementNS(de,"path");return j&&S.setAttribute("class",j),S.setAttribute("d",h),b.wires.appendChild(S),S},u=m("hit"),y=l.createElementNS(de,"title");y.textContent=Si(t)+(ja(t)?"（风格也顺着这根线往下传）":"")+"　点一下选中，Delete 删除",u.appendChild(y),u.addEventListener("mousedown",j=>{j.stopPropagation(),Pa(t)}),u.addEventListener("contextmenu",j=>{j.preventDefault(),j.stopPropagation(),Pa(t),$l(j.clientX,j.clientY,t)});const x=m(Ge(t)?"txt":""),_=ja(t)?m("carry"):null;Bo.set(t,{line:x,carry:_,flow:null})}$a(),jn(),Xr()}function Ho(e){return{x:e.x,y:e.y,w:Te(e),h:e._el?e._el.offsetHeight:230}}function ji(e=oe,t=230){const n=b.stage.getBoundingClientRect(),r=Sn((n.left+n.right)/2,(n.top+n.bottom)/2),o=r.x-e/2,i=r.y-t/2,s=24,d=(c?c.cards:[]).map(Ho),f=(m,u)=>!d.some(y=>m<y.x+y.w+s&&m+e+s>y.x&&u<y.y+y.h+s&&u+t+s>y.y);if(f(o,i))return{x:Math.round(o),y:Math.round(i)};const h=64;for(let m=1;m<=24;m++)for(const[u,y]of[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=o+u*m*h,_=i+y*m*h;if(f(x,_))return{x:Math.round(x),y:Math.round(_)}}return{x:Math.round(o),y:Math.round(i)}}function Ma(e){let t=1/0,n=1/0,r=-1/0,o=-1/0;for(const i of e){const s=lt(i);if(!s)continue;const d=Ho(s);t=Math.min(t,d.x),n=Math.min(n,d.y),r=Math.max(r,d.x+d.w),o=Math.max(o,d.y+d.h)}return t===1/0?null:{x:t,y:n,w:r-t,h:o-n}}function jl(e){if(!c||!Ze()||!["left","right","top","bottom","center"].includes(e))return;const t=c.cards.filter(S=>ae.has(S.id)).map((S,B)=>({c:S,index:B,...Ho(S)}));if(t.length<2)return;const n=Math.min(...t.map(S=>S.x)),r=Math.min(...t.map(S=>S.y)),o=Math.max(...t.map(S=>S.x+S.w)),i=Math.max(...t.map(S=>S.y+S.h)),s=e==="left"||e==="right"||e==="center",d=new Map(t.map(S=>[S.c.id,S])),f=new Map(t.map(S=>[S.c.id,new Set])),h=new Map(t.map(S=>[S.c.id,new Set])),m=new Map(t.map(S=>[S.c.id,0]));for(const S of c.edges)S.from===S.to||!d.has(S.from)||!d.has(S.to)||(f.get(S.from).add(S.to),f.get(S.to).add(S.from),h.get(S.from).has(S.to)||(h.get(S.from).add(S.to),m.set(S.to,m.get(S.to)+1)));const u=new Set,y=[],x=(S,B)=>S.x-B.x||S.y-B.y||S.index-B.index;for(const S of t){if(u.has(S.c.id))continue;const B=[],be=[S.c.id];u.add(S.c.id);for(let et=0;et<be.length;et++){const He=be[et];B.push(d.get(He));for(const ht of f.get(He))u.has(ht)||(u.add(ht),be.push(ht))}const Ke=new Set(B),dt=[];for(;Ke.size;){const et=[...Ke].filter(ht=>m.get(ht.c.id)===0),He=(et.length?et:[...Ke]).sort(x)[0];Ke.delete(He),dt.push(He);for(const ht of h.get(He.c.id))m.set(ht,m.get(ht)-1)}y.push({items:dt,x:Math.min(...B.map(et=>et.x)),y:Math.min(...B.map(et=>et.y)),w:B.reduce((et,He)=>et+He.w,0)+24*(B.length-1),h:Math.max(...B.map(et=>et.h))})}y.sort((S,B)=>s?S.y-B.y||S.x-B.x:S.x-B.x||S.y-B.y);let _=s?r:n;const j=[];for(const S of y){let B=s?e==="left"?n:e==="right"?o-S.w:(n+o-S.w)/2:_;const be=s?_:e==="top"?r:i-S.h;for(const Ke of S.items)j.push({...Ke,nx:B,ny:e==="bottom"?be+S.h-Ke.h:be}),B+=Ke.w+24;_+=(s?S.h:S.w)+24}if(j.some(S=>Math.abs(S.nx-S.x)>1e-7||Math.abs(S.ny-S.y)>1e-7)){for(const{c:S,nx:B,ny:be}of j)S.x=B,S.y=be,S._el&&(S._el.style.left=B+"px",S._el.style.top=be+"px");tt(),Ct(),co(),xe()}}function Na(e,t){if(!ke()||!c)return!1;const n=c.cards.filter(i=>ae.has(i.id));if(n.length<2)return!1;const r=c,o=[["left","左对齐"],["right","右对齐"],["top","顶部对齐"],["bottom","底部对齐"],["center","垂直居中对齐"]].map(([i,s])=>({text:s,run:()=>{c===r&&jl(i)}}));return Ot(e,t,"选中节点",[{text:"对齐方式",children:o},{text:`复制选中节点（${n.length} 个）`,run:()=>{c===r&&yr()}},{text:`批量重命名（${n.length} 个节点）`,run:()=>{if(c!==r||!ke())return;const i=c.cards.filter(s=>ae.has(s.id));i.length>1&&Ni(i[0])}},{text:`批量删除（${n.length} 个节点）`,danger:!0,run:()=>{c!==r||!ke()||c.cards.filter(i=>ae.has(i.id)).length>1&&$i()}}]),!0}function jn(){if(!b.groups)return;let e=b.groups.querySelector(".selbox");if(!ae.size){e&&e.remove(),b.selbar.style.display="none";return}const t=Ma(ae);if(!t)return ae.clear(),jn();if(e||(e=l.createElement("div"),e.className="selbox",b.groups.appendChild(e)),e.style.left=t.x-8+"px",e.style.top=t.y-8+"px",e.style.width=t.w+16+"px",e.style.height=t.h+16+"px",ae.size<2){b.selbar.style.display="none";return}b.selbar.style.display="";const n=b.stage.getBoundingClientRect(),r=Q.x+t.x*Q.k,o=Q.y+t.y*Q.k;b.selbar.style.left=Math.max(4,Math.min(r,n.width-b.selbar.offsetWidth-4))+"px",b.selbar.style.top=Math.max(50,o-b.selbar.offsetHeight-10)+"px"}function Xr(){if(b.groups&&(b.groups.querySelectorAll(".ggroup").forEach(e=>e.remove()),!!c))for(const e of c.groups||[]){const t=Ma(e.cards);if(!t)continue;const n=12,r=28,o=l.createElement("div");o.className="ggroup",o.style.left=t.x-n+"px",o.style.top=t.y-r+"px",o.style.width=t.w+n*2+"px",o.style.height=t.h+n+r+"px";const i=l.createElement("div");i.className="gglabel",i.textContent=`${e.name}（${e.cards.length}）`,o.appendChild(i),o.onmousedown=s=>{s.button===0&&(s.stopPropagation(),s.preventDefault(),ae=new Set(e.cards),Gt=null,tt(!1),Ia(s,[...e.cards].map(lt).filter(Boolean)))},i.ondblclick=s=>{s.stopPropagation(),za(e)},o.oncontextmenu=s=>{s.preventDefault(),s.stopPropagation(),Ot(s.clientX,s.clientY,e.name,[{icon:"✎",text:"重命名",run:()=>za(e)},{icon:"✕",text:"删除组（节点保留）",danger:!0,run:()=>{Ze()&&(c.groups=c.groups.filter(d=>d!==e),Xr(),xe())}}])},b.groups.appendChild(o)}}function za(e){if(!Ze())return;const t=prompt("组名",e.name);t!==null&&(e.name=t.trim().slice(0,30)||e.name,Xr(),xe())}function Ia(e,t,n){if(!ke()||e.button!==0||!t.length)return;e.stopPropagation(),e.preventDefault(),Kt();const r={mx:e.clientX,my:e.clientY,pos:t.map(d=>({c:d,x:d.x,y:d.y}))};let o=!1;const i=d=>{if(!o&&Math.abs(d.clientX-r.mx)+Math.abs(d.clientY-r.my)<4)return;o||(o=!0);const f=(d.clientX-r.mx)/Q.k,h=(d.clientY-r.my)/Q.k;for(const m of r.pos)m.c.x=Math.round(m.x+f),m.c.y=Math.round(m.y+h),m.c._el&&(m.c._el.style.left=m.c.x+"px",m.c._el.style.top=m.c.y+"px");tt(),Ct()},s=()=>{l.removeEventListener("mousemove",i),l.removeEventListener("mouseup",s),o?(Ct(),xe()):n&&n()};l.addEventListener("mousemove",i),l.addEventListener("mouseup",s)}function $i(){if(!Ze())return;const e=c,t=[...ae].map(lt).filter(Boolean);if(!t.length)return;const n=t.filter(o=>(o.history||[]).length||(o.outputs||[]).length).length;if(!confirm(`删除选中的 ${t.length} 个节点？
`+(n?`其中 ${n} 个节点有历史记录或产物。
`:"")+"相关连线和节点内记录会一并移除，此操作不能撤销；不会删除素材文件。")||c!==e||!ke())return;const r=qa(t.map(o=>o.id));r&&ye(`已删除 ${r} 个节点`)}function Pa(e){Gt=e,ve=null,$n(),Kt(),un();for(const t of c.cards)t._el&&t._el.classList.remove("sel");tt(),ye(Si(e)+" · Delete 删除")}function $l(e,t,n){const r=lt(n.from),o=lt(n.to);Ot(e,t,Si(n),[...r?[{icon:"◧",text:`选中上游「${Ne(r)}」`,run:()=>Ht(r.id)}]:[],...o?[{icon:"◨",text:`选中下游「${Ne(o)}」`,run:()=>Ht(o.id)}]:[],{icon:"✕",text:n.slot===bn?"断开这段文本":Ge(n)?"解除这个风格节点":"删除连线",danger:!0,run:()=>uo(n)}])}function uo(e){if(!Ze())return;const t=!Ge(e)&&_i(e);tr([e],!1),Gt===e&&(Gt=null),tt(),Vt(),ve&&Pe(ve),xe(),ye(e.slot===bn?"已断开这段文本输入":Ge(e)?"已解除风格":t?"已删除连线，并清除下游引用":"已删除连线")}function Ht(e){ve=e,ae.clear(),Gt=null,tt(!1);for(const t of c.cards)t._el&&t._el.classList.toggle("sel",t.id===e);Jr(e),Pe(e)}function Ml(e,t,n){if(!ke()){e.stopPropagation(),Ht(t.id);return}if(e.button!==0)return;const r=ae.has(t.id)&&c.cards.filter(i=>ae.has(i.id)).length>1;let o=r?[...ae]:null;if(!o){const i=new Set;for(const s of c.groups||[])s.cards.includes(t.id)&&s.cards.forEach(d=>i.add(d));i.size>1&&(o=[...i])}r?$n():Ht(t.id),Ia(e,o?o.map(lt).filter(Boolean):[t],r?()=>Ht(t.id):void 0)}function La(e,t,n,r){if(!Ze()||e.button!==0)return;e.stopPropagation(),e.preventDefault(),Kt(),Ht(t.id);const o=n.querySelector(".body"),i={mx:e.clientX,my:e.clientY,x:t.x,y:t.y,w:Te(t),h:t.h||o.offsetHeight,ch:n.offsetHeight},s=(m,u,y)=>Math.max(u,Math.min(y,Math.round(m)));let d=!1;const f=m=>{!d&&Math.abs(m.clientX-i.mx)+Math.abs(m.clientY-i.my)<3||(d||(d=!0),t.w=s(i.w+(m.clientX-i.mx)/Q.k*r,M,F),m.shiftKey||(t.h=s(i.h+(m.clientY-i.my)/Q.k*r,ue,Ce)),Xn(t),r<0&&(t.x=i.x+(i.w-t.w),t.y=i.y+(i.ch-n.offsetHeight),n.style.left=t.x+"px",n.style.top=t.y+"px"),tt(),Ct())},h=()=>{l.removeEventListener("mousemove",f),l.removeEventListener("mouseup",h),d&&(Ct(),xe())};l.addEventListener("mousemove",f),l.addEventListener("mouseup",h)}function Nl(e,t){if(e.button!==0||!Ze())return;e.stopPropagation(),e.preventDefault(),Kt();const n=Ei(t.id),r=l.createElementNS(de,"path");r.setAttribute("class","tmp"),b.wires.appendChild(r);const o=n.x+n.w,i=n.y+n.h/2;b.world.classList.add("wiring");let s=null;const d=h=>{const m=Sn(h.clientX,h.clientY);s=m;const u=Math.max(50,Math.abs(m.x-o)*.5);r.setAttribute("d",`M${o},${i} C${o+u},${i} ${m.x-u},${m.y} ${m.x},${m.y}`)},f=h=>{l.removeEventListener("mousemove",d),l.removeEventListener("mouseup",f),r.remove(),b.world.classList.remove("wiring");const m=h.target.closest&&h.target.closest(".card");m&&m.dataset.id!==t.id?Ya(t,c.cards.find(u=>u.id===m.dataset.id)):s&&Ul(t,s,h.clientX,h.clientY)};l.addEventListener("mousemove",d),l.addEventListener("mouseup",f)}function zl(){for(const o of["beforeinput","input","change","paste","drop","dragover","click","mousedown","pointerdown","contextmenu","keydown"])l.addEventListener(o,i=>{if(ke()||!c)return;const s=i.target;if(s.closest?.("#panel, #respop")){Wd(i)&&(i.preventDefault(),i.stopImmediatePropagation());return}const f=s.closest?.("#dock, #selbar"),h=s.closest?.("#world input, #world textarea, #world select, #world [contenteditable]"),m=["paste","drop","dragover"].includes(o)&&s.closest?.("#stage");(f||h||m)&&(i.preventDefault(),i.stopImmediatePropagation())},!0);matchMedia("(max-width: 760px)").matches&&l.body.classList.add("collapsed"),A("#toggle").setAttribute("aria-expanded",String(!l.body.classList.contains("collapsed"))),A("#toggle").onclick=()=>{const o=l.body.classList.toggle("collapsed");A("#toggle").setAttribute("aria-expanded",String(!o))},A("#createHere").onclick=pl,Il(),b.fit.onclick=()=>{Q={x:60,y:70,k:1},Hn(),Ct(),ln()},b.jobsbtn.onclick=en,b.selbar.innerHTML="";const e=l.createElement("button");e.className="mkgroup",e.textContent="▦ 打组",e.title="把选中的节点圈成一个组：拖分组框整体移动；双击组名改名，右键框删组（节点保留）",e.onclick=()=>{if(!ke()||ae.size<2)return;if(c.groups=c.groups||[],c.groups.find(i=>i.cards.length===ae.size&&i.cards.every(s=>ae.has(s))))return ye("这几张已经是同一组了");c.groups.push({id:Vn(),name:`组 ${c.groups.length+1}`,cards:[...ae]}),jn(),Xr(),xe(),ye("已打组：拖组里的节点或分组框 = 整组一起动；双击组名改名，右键框删组")};const t=l.createElement("button");t.className="renamecards act",t.textContent="批量重命名",t.title="一次填写所有选中节点的新名称，统一确认；留空恢复默认名称",t.onclick=()=>{ae.size>1&&Ni(lt([...ae][0]))};const n=l.createElement("button");n.className="deletecards act danger",n.textContent="批量删除",n.title="删除框选的所有节点（Delete / Backspace），操作前统一确认",n.onclick=$i,b.selbar.append(e,t,n),b.selbar.onmousedown=o=>o.stopPropagation(),v("resize",()=>{Kl(),Ct(),Rn(),jn()}),b.stage.addEventListener("mousemove",o=>{Ur=Sn(o.clientX,o.clientY),va(Ur.x,Ur.y)}),b.stage.addEventListener("mouseleave",()=>{Ur=null,va(0,0,!1)}),b.stage.addEventListener("mousedown",o=>{if(R||o.target.closest("#selbar")||o.target.closest("#panel"))return;if(o.button===1||o.button===0&&o.shiftKey){o.preventDefault();const h={mx:o.clientX,my:o.clientY,x:Q.x,y:Q.y};b.stage.classList.add("panning");let m=!1;const u=x=>{m||(m=!0,Qa(!0)),Q.x=h.x+x.clientX-h.mx,Q.y=h.y+x.clientY-h.my,Hn()},y=()=>{if(b.stage.classList.remove("panning"),l.removeEventListener("mousemove",u),l.removeEventListener("mouseup",y),m&&o.button===0){const x=_=>{_.preventDefault(),_.stopImmediatePropagation()};l.addEventListener("click",x,{capture:!0,once:!0}),I(()=>l.removeEventListener("click",x,!0),0)}m&&(Qa(!1),Ct(),ln())};l.addEventListener("mousemove",u),l.addEventListener("mouseup",y);return}if(o.button!==0)return;o.preventDefault(),$n(),kn(),ve=null,un(),Gt=null;for(const h of c?c.cards:[])h._el&&h._el.classList.remove("sel");ae.clear(),tt(!1);const i={mx:o.clientX,my:o.clientY};let s=!1;const d=h=>{if(!s&&Math.abs(h.clientX-i.mx)+Math.abs(h.clientY-i.my)<4)return;s=!0;const m=Math.min(i.mx,h.clientX),u=Math.min(i.my,h.clientY),y=Math.max(i.mx,h.clientX),x=Math.max(i.my,h.clientY),_=b.stage.getBoundingClientRect();b.lasso.style.display="",b.lasso.style.left=m-_.left+"px",b.lasso.style.top=u-_.top+"px",b.lasso.style.width=y-m+"px",b.lasso.style.height=x-u+"px";const j=Sn(m,u),S=Sn(y,x);if(ae.clear(),c)for(const B of c.cards){const be=Ho(B);be.x<S.x&&be.x+be.w>j.x&&be.y<S.y&&be.y+be.h>j.y&&ae.add(B.id)}jn()},f=()=>{if(l.removeEventListener("mousemove",d),l.removeEventListener("mouseup",f),b.lasso.style.display="none",!!s)if(ae.size===1){const h=[...ae][0];ae.clear(),Ht(h)}else tt(!1),ae.size&&ye(`选中 ${ae.size} 个节点：拖动整体移动 · 右键对齐 / 批量删除 · Delete 全删 · 上方按钮打组 / 批量重命名 / 批量删除`)};l.addEventListener("mousemove",d),l.addEventListener("mouseup",f)}),b.stage.addEventListener("wheel",o=>{if(R||!c)return;o.preventDefault();const i=Sn(o.clientX,o.clientY),s=Math.min(Ae,Math.max(Ee,Q.k*(o.deltaY<0?1.1:1/1.1))),d=b.stage.getBoundingClientRect();Q.x=o.clientX-d.left-i.x*s,Q.y=o.clientY-d.top-i.y*s,Q.k=s,Hn(),typeof ln=="function"?ln():xe()},{passive:!1}),b.stage.addEventListener("contextmenu",o=>{if(o.preventDefault(),R||!ke()||o.target.closest(".card, #panel, #selbar, #dock, #respop")||(Kt(),Na(o.clientX,o.clientY)))return;const i=Sn(o.clientX,o.clientY),s=[];s.push({group:"生成节点"});const d=K.find(m=>m.kind==="text");d&&s.push({icon:d.icon||"✍",text:"文本",run:()=>{vn(d.id,i.x,i.y,d.modes[0]?Xe(d.modes[0]):null)}}),K.filter(m=>m.kind==="gen").forEach(m=>{let u=m.name;u==="生图"?u="图片":u==="生视频"&&(u="视频"),s.push({icon:m.icon||"◻",text:u,run:()=>{vn(m.id,i.x,i.y,m.modes[0]?Xe(m.modes[0]):null)}})});const h=K.find(m=>m.id==="card_tools");h&&(s.push({group:"工具"}),s.push({icon:h.icon||"◻",text:"工具",run:()=>vn(h.id,i.x,i.y)})),s.push({group:"其他"}),s.push({icon:"📎",text:"上传素材",run:()=>{const m=l.createElement("input");m.type="file",m.accept="image/*,video/*,audio/*",m.onchange=async u=>{const y=u.target.files[0];if(y)try{const x=await dn(y),_=K.find(S=>S.kind==="asset");if(!_)return Ue("找不到素材节点定义");const j=vn(_.id,i.x,i.y,_.modes[0].id);if(!j)return;await _o(j,x),ye("已上传："+x.origin)}catch(x){Ue("上传失败："+x.message)}},m.click()}}),nr&&s.push({icon:"⧉",text:"粘贴刚复制的节点（Ctrl+V）",run:()=>{Ur=i,Li()}}),s.length>0&&Ot(o.clientX,o.clientY,"画布",s)}),b.stage.addEventListener("dragover",o=>{R||!ke()||(o.preventDefault(),o.dataTransfer.dropEffect="copy")}),b.stage.addEventListener("drop",async o=>{if(R||!ke())return;if(o.preventDefault(),[...o.dataTransfer?.types||[]].includes(Wi)){o.stopPropagation();const h=ko;if(ko=null,!h||c!==h.project||o.dataTransfer.getData(Wi)!==h.token)return;const m=Sn(o.clientX,o.clientY);try{const u=await Di(h.output);if(!await Da(h.project,u,Math.round(m.x-134),Math.round(m.y-84)))return;ye(`已建素材节点：${u.origin||h.output.filename||"历史产物"}`)}catch(u){c===h.project&&Ue("导入历史产物失败："+u.message)}return}const i=[...o.dataTransfer?.files||[]];if(!i.length)return;const s=i.filter(h=>h.type.startsWith("image/")||h.type.startsWith("video/")||h.type.startsWith("audio/"));if(!s.length)return ye("只支持图片、视频、音频文件");const d=Sn(o.clientX,o.clientY),f=c;for(const h of s){if(c!==f||!ke())return;try{const m=await dn(h),u={x:Math.round(d.x-134),y:Math.round(d.y-84)};if(!await Da(f,m,u.x,u.y))return;ye(`已建素材节点：${m.origin||h.name}`),d.x+=50,d.y+=50}catch(m){c===f&&Ue(`上传失败 ${h.name}：${m.message}`)}}}),b.view.addEventListener("mousedown",o=>{o.target===b.view&&mo()}),v("mousedown",o=>{b.respop.style.display!=="none"&&(b.respop.contains(o.target)||Bn())},!0),v("mousedown",o=>{b.menu.style.display!=="none"&&!b.menu.contains(o.target)&&!o.target.closest(".tcap")&&$n()},!0),l.addEventListener("paste",Hl),l.addEventListener("keydown",o=>{if(l.querySelector("dialog[data-image-composer][open]"))return;if(b.view.style.display!=="none"&&(o.key==="ArrowLeft"||o.key==="ArrowRight")){o.preventDefault(),Ra(o.key==="ArrowRight"?1:-1);return}const i=o.target,s=(i.tagName||"").toLowerCase(),d=s==="input"||s==="textarea"||s==="select"||i.isContentEditable;if(c&&!R&&!d&&b.view.style.display==="none"){if((/Mac/i.test(navigator.platform)?o.metaKey&&!o.ctrlKey:o.ctrlKey&&!o.metaKey)&&!o.altKey&&["z","y"].includes(o.key.toLowerCase())){o.preventDefault(),ml(o.key.toLowerCase()==="y"||o.shiftKey);return}const h=lt(ve);if(!ke()&&(["Delete","Backspace"].includes(o.key)||(o.ctrlKey||o.metaKey)&&o.key.toLowerCase()==="v")){o.preventDefault();return}if(o.key==="Delete"||o.key==="Backspace"){if(Gt){o.preventDefault(),uo(Gt);return}if(ae.size>1){o.preventDefault(),$i();return}if(h){o.preventDefault(),Ba(h);return}}if((o.ctrlKey||o.metaKey)&&!o.shiftKey&&!o.altKey){const m=o.key.toLowerCase();if(m==="c"&&(h||ae.size)){o.preventDefault(),yr(h);return}if(m==="v"){if(Ai())return;o.preventDefault(),Li();return}}if(o.key.toLowerCase()==="h"&&h&&!o.ctrlKey&&!o.metaKey&&!o.shiftKey&&!o.altKey){o.preventDefault();const m=b.stage.getBoundingClientRect(),u=m.top+m.height*.3,y=m.left+m.width*.5,x=h.x+(h._el?h._el.offsetWidth/2:oe/2),_=h.y+(h._el?h._el.offsetHeight/2:168/2);Q.x=y-x*Q.k,Q.y=u-_*Q.k,Hn(),Ct(),ln();return}}if(o.key==="Escape"){if(b.respop.style.display!=="none"){Bn();return}if(b.view.style.display!=="none"){mo();return}if(b.jobs.style.display!=="none"){kn();return}if($n(),Kt(),!R){ve=null,un(),Gt=null,ae.clear(),tt(!1);for(const f of c?c.cards:[])f._el&&f._el.classList.remove("sel")}}}),b.minimapBtn.onclick=wl,vl();let r=!0;b.wiresToggle.onclick=()=>{r=!r,b.wires.style.display=r?"":"none",b.wiresToggle.classList.toggle("active",!r),l.querySelectorAll(".card .inp, .card .out").forEach(o=>{o.style.display=r?"":"none"})},b.zoomMenu.onclick=o=>{const i=()=>{typeof ln=="function"?ln():xe()},s=f=>{const h=b.stage.getBoundingClientRect(),m=Sn(h.left+h.width/2,h.top+h.height/2);Q.x=h.width/2-m.x*f,Q.y=h.height/2-m.y*f,Q.k=f,Hn(),Ct(),i()},d=[...[500,300,200,125,100,75,50,25,10].map(f=>({icon:f>100?"+":f===100?"1:1":"−",text:`${f>100?"放大":f===100?"重置":"缩小"} (${f}%)`,run:()=>s(f/100)})),{icon:"□",text:"适应画布",run:()=>{Q={x:60,y:70,k:1},Hn(),Ct(),i()}}];Ot(o.clientX,o.clientY-200,"缩放",d)}}let Xo=0;function Ot(e,t,n,r){Xo++,b.menu.innerHTML="";const o=l.createElement("div");o.className="hd",o.textContent=n,b.menu.appendChild(o);for(const i of r){if(i.group){const m=l.createElement("div");m.className="grp",m.textContent=i.group,b.menu.appendChild(m);continue}const s=l.createElement("button");s.disabled=!!i.disabled,i.disabled&&(s.style.opacity="0.45"),i.danger&&(s.className="danger");const d=l.createElement("span");d.textContent=i.icon||"▸";const f=l.createElement("span");f.textContent=i.text,s.append(d,f);const h=()=>{b.menu.querySelectorAll(".menu-submenu").forEach(m=>m.style.display="none"),b.menu.querySelectorAll('[aria-haspopup="menu"]').forEach(m=>m.setAttribute("aria-expanded","false"))};if(i.children){const m=l.createElement("span");m.className="submenu-arrow",m.textContent="›",m.setAttribute("aria-hidden","true"),s.appendChild(m),s.setAttribute("aria-label",i.text),s.setAttribute("aria-haspopup","menu"),s.setAttribute("aria-expanded","false");const u=l.createElement("div");u.className="menu-submenu",u.style.display="none",u.setAttribute("aria-label",i.text);for(const x of i.children){const _=l.createElement("button"),j=l.createElement("span");j.textContent=x.icon||"▸";const S=l.createElement("span");S.textContent=x.text,_.append(j,S),_.onclick=()=>{$n(),Kt(),x.run()},u.appendChild(_)}const y=()=>{h(),u.style.display="",s.setAttribute("aria-expanded","true");const x=b.menu.getBoundingClientRect(),_=s.getBoundingClientRect(),j=u.offsetWidth,S=u.offsetHeight,B=x.right+j>innerWidth-8?x.left-j+1:x.right-1;u.style.left=Math.max(8,B)-x.left-b.menu.clientLeft+"px",u.style.top=Math.max(8,Math.min(_.top,innerHeight-S-8))-x.top-b.menu.clientTop+"px"};s.onmouseenter=y,s.onclick=y,s.onkeydown=x=>{x.key==="ArrowRight"&&(x.preventDefault(),y(),u.querySelector("button").focus())},u.onkeydown=x=>{x.key==="ArrowLeft"&&(x.preventDefault(),h(),s.focus())},b.menu.append(s,u)}else s.onmouseenter=h,s.onclick=()=>{$n(),Kt(),i.run()},b.menu.appendChild(s);i.tip&&Lo(s,i.tip)}b.menu.style.display="",b.menu.style.left=Math.min(e,innerWidth-b.menu.offsetWidth-8)+"px",b.menu.style.top=Math.min(t,innerHeight-b.menu.offsetHeight-8)+"px"}const $n=()=>{Xo++,b.menu.style.display="none"};function fo(e,t,n){const r=l.createElement("button");r.className="tcap";const o=l.createElement("span");o.textContent=e;const i=l.createElement("i");return i.textContent="▴",r.append(o,i),r.title=t+" —— 点击换",r.onclick=s=>{s.stopPropagation();const d=r.getBoundingClientRect();Ot(d.left,d.bottom+4,t,n());const f=b.menu;d.bottom+f.offsetHeight+12>innerHeight&&(f.style.top=Math.max(48,d.top-f.offsetHeight-8)+"px")},r}function Il(){const e=(r,o,i,s)=>{const d=l.createElement("button");d.className="dockb",d.title=i;const f=l.createElement("span");f.textContent=r;const h=l.createElement("span");return h.textContent=o,d.append(f,h),d.onmousedown=m=>m.stopPropagation(),d.onclick=m=>{m.stopPropagation(),s(d)},d},t=r=>()=>{if(!c)return;const o=ji();vn(r,o.x,o.y)},n=()=>{const r=l.createElement("div");return r.className="sep",r};b.dock.innerHTML="",b.dock.append(e("↥","上传","选一个图片/视频文件，放进一个素材节点 —— 再把它的出口拖到别的节点上就能反复用",xd),n(),e("T","文本","新建一个文本节点：存一段字，连到生成节点就并进提示词",t("card_text")),e("▧","图片","新建一个生图节点（默认文生图，玩法在参数面板左下角换）",t("card_image")),e("▷","视频","新建一个生视频节点（默认图生视频，玩法在参数面板左下角换）",t("card_video")),e("◇","工具箱","新建工具箱节点（玩法在参数面板左下角切换）",t("card_tools")))}const Ta={video:"放大播放",audio:"放大播放"};let Ye=null;function Uo(){Ye?.image&&(Ye.image.style.transform=`translate3d(${Ye.x}px, ${Ye.y}px, 0) scale(${Ye.scale})`)}function Pl(){Ye?.image&&(Ye.scale=1,Ye.x=0,Ye.y=0,Uo())}function Ll(e){Ye.image=e,Ye.scale=1,Ye.x=0,Ye.y=0,e.classList.add("vimage"),e.title="滚轮缩放 · 拖拽平移 · 双击还原",Uo(),e.addEventListener("wheel",r=>{if(!Ye||Ye.image!==e)return;r.preventDefault();const o=Ye.scale,i=Math.min(8,Math.max(.2,o*Math.exp(-r.deltaY*.0015)));if(i===o)return;const s=e.getBoundingClientRect(),d=i/o;Ye.x+=(r.clientX-(s.left+s.width/2))*(1-d),Ye.y+=(r.clientY-(s.top+s.height/2))*(1-d),Ye.scale=i,Uo()},{passive:!1});let t=null;e.addEventListener("pointerdown",r=>{r.button!==0||!Ye||Ye.image!==e||(r.preventDefault(),t={id:r.pointerId,mx:r.clientX,my:r.clientY,x:Ye.x,y:Ye.y},e.setPointerCapture(r.pointerId),e.classList.add("panning"))}),e.addEventListener("pointermove",r=>{!t||r.pointerId!==t.id||!Ye||Ye.image!==e||(Ye.x=t.x+r.clientX-t.mx,Ye.y=t.y+r.clientY-t.my,Uo())});const n=r=>{!t||r.pointerId!==t.id||(t=null,e.classList.remove("panning"),e.hasPointerCapture(r.pointerId)&&e.releasePointerCapture(r.pointerId))};e.addEventListener("pointerup",n),e.addEventListener("pointercancel",n),e.ondblclick=r=>{r.preventDefault(),Pl()}}function mo(){b.vbox.innerHTML="",b.view.style.display="none",Ye=null}function ho(e,t=0,n=null,r=void 0){const o=n||e.outputs||[];if(!o.length){ye("这个节点还没有产物，先运行一次");return}Ye={outs:o,idx:Math.min(Math.max(t,0),o.length-1),seed:r!==void 0?r:e?e.seed:null},Oa(),b.view.style.display=""}function Ra(e){if(!Ye)return;const t=Ye.outs.length;t<2||(Ye.idx=(Ye.idx+e+t)%t,Oa())}function Oa(){const{outs:e,idx:t,seed:n}=Ye,r=e[t];Ye.image=null,Ye.scale=1,Ye.x=0,Ye.y=0;const o=l.createElement("div");o.className="vinfo";const i=[r.filename];e.length>1&&i.unshift(`${t+1} / ${e.length}`),n!=null&&i.push("seed "+n);const s=()=>o.textContent=i.join("　·　");let d;if(r.kind==="video"){d=l.createElement("video"),d.controls=d.autoplay=d.loop=!0;const h=()=>{const m=d.play();m&&typeof m.catch=="function"&&m.catch(()=>{})};d.readyState>=3?h():d.addEventListener("canplay",h,{once:!0}),xo(d,r.url),d.onloadedmetadata=()=>{i.splice(i.indexOf(r.filename)+1,0,`${d.videoWidth}×${d.videoHeight}`,Aa(d.duration)),s()}}else r.kind==="audio"?(d=l.createElement("audio"),d.src=r.url,d.controls=d.autoplay=!0,d.onloadedmetadata=()=>{i.splice(i.indexOf(r.filename)+1,0,Aa(d.duration)),s()}):(d=l.createElement("img"),d.src=r.url,i.push("滚轮缩放 · 拖拽平移 · 双击还原"),d.onload=()=>{i.splice(i.indexOf(r.filename)+1,0,`${d.naturalWidth}×${d.naturalHeight}`),s()},Ll(d));d.draggable=!1,s();const f=l.createElement("button");if(f.className="vx",f.textContent="✕",f.title="关闭 (Esc)",f.onclick=mo,b.vbox.innerHTML="",b.vbox.append(d,o,f),e.length>1)for(const[h,m,u]of[["p","‹",-1],["n","›",1]]){const y=l.createElement("button");y.className="vnav "+h,y.textContent=m,y.title=u<0?"上一张 (←)":"下一张 (→)",y.onclick=()=>Ra(u),b.vbox.appendChild(y)}}function Aa(e){if(!isFinite(e))return"时长未知";const t=Math.round(e);return`${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`}const Mi=e=>tn()&&!e.locked&&!e.readonly&&!e.read_only&&["card_image","card_video"].includes(e.type)&&Z(e)?.kind==="gen";async function Tl(e){const t=c?.id,n=e.id;if(!Mi(e))return ye("此节点或画布不可加入导演台");try{if(await Mr(t),e=c?.cards.find(s=>s.id===n),!e||!Mi(e))throw new Error("节点已删除、锁定或不可操作");let r=ri(e);if(!r){St++;try{const s=await Tt(`/api/projects/${encodeURIComponent(t)}/director/import`,{rev:c.director?.rev||0,canvas_rev:c.rev||0,cards:[n]});if(c?.id!==t)throw new Error("画布已切换");if(r=ri(e,s.project),!r)throw new Error("导入接口未返回关联镜头");Do(s.project)}finally{St=Math.max(0,St-1),vi()}}const o=`/director?project=${encodeURIComponent(t)}&shot=${encodeURIComponent(r.id)}`;N.open(o,"_blank","noopener"),ye("导演镜头已就绪");const i=l.createElement("a");i.href=o,i.target="_blank",i.rel="noopener",i.textContent="打开导演镜头",b.toast.append(" · ",i)}catch(r){Ue("导演台操作失败："+r.message)}}function Rl(e,t,n){if(!ke())return Ot(e,t,Ne(n),[{text:"复制节点",run:()=>yr(n)},...(n.outputs||[]).length?[{text:"预览产物",run:()=>ho(n)}]:[]]);const r=Z(n),o={icon:"✎",text:ae.size>1&&ae.has(n.id)?`批量重命名（${ae.size} 个节点）`:"重命名节点",run:()=>Ni(n)};if(It(n)){const h=c.edges.filter(m=>m.from===n.id&&Ge(m)).length;return Ot(e,t,n.name||"风格化提示词",[o,{icon:"⧉",text:"就地复制一张",run:()=>Yo(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>yr(n)},...h?[{icon:"⊘",text:`解除挂着的 ${h} 个节点`,run:()=>{c.edges=c.edges.filter(m=>!(m.from===n.id&&Ge(m))),tt(),Vt(),ve&&Pe(ve),xe()}}]:[],...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Wo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>bo(n.id)}])}if(Bt(n))return Ot(e,t,n.name||Ne(n),[...Lr(n)?[{icon:"↑",text:"运行（加工文本）",run:()=>oi(n)}]:[],o,{icon:"⧉",text:"就地复制一张",run:()=>Yo(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>yr(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Wo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>bo(n.id)}]);if(ut(n)){const h=jt(n);return Ot(e,t,n.name||Ne(n),[...h?[{icon:"⛶",text:Ta[h.kind]||"查看大图",run:()=>vo(h)}]:[],...h?[{icon:"⬇",text:`下载${Qe[h.kind]||"文件"}`,run:()=>go(h)}]:[],{icon:"📁",text:"选择 / 换文件",run:()=>ti(n)},o,{icon:"⧉",text:"就地复制一张",run:()=>Yo(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>yr(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Wo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>bo(n.id)}])}const i=n.outputs||[],s=i[0],d=i.length>1?`逐张看大图（${i.length} 张）`:Ta[s&&s.kind]||"查看大图",f=i.length>1?`下载全部 ${i.length} 张${s.kind==="video"?"视频":s.kind==="audio"?"音频":"图片"}`:`下载${s?.kind==="video"?"视频":s?.kind==="audio"?"音频":"图片"}`;Ot(e,t,n.name||(r?r.name:"节点"),[...!R&&Mi(n)?[{text:ri(n)?"查看导演镜头":"加入导演台",run:()=>Tl(n)}]:[],...s?[{icon:"⛶",text:d,run:()=>ho(n)}]:[],...s?[{icon:"⬇",text:f,run:()=>i.forEach(h=>go(h))}]:[],o,{icon:"↑",text:"运行",run:()=>oi(n)},{icon:"⧉",text:"就地复制一张",run:()=>Yo(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>yr(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Wo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>bo(n.id)}])}function go(e){const t=l.createElement("a");t.href=e.url,t.download=e.filename.split(/[\\/]/).pop()||"download",l.body.appendChild(t),t.click(),t.remove()}function Wo(e){Ze()&&(delete e.w,delete e.h,Xn(e),tt(),Ct(),xe())}function Ni(e){if(!e||!Ze())return;if(ae.size>1&&ae.has(e.id)){const r=c.cards.filter(o=>ae.has(o.id)).sort((o,i)=>o.y-i.y||o.x-i.x);if(r.length>1)return Ol(r)}const t=Z(e),n=prompt("节点名字（留空恢复成工作流名）",e.name||(t?t.name:""));n!==null&&Fa([{card:e,name:n}])}function Ol(e){const t=c,n=l.createElement("dialog");n.className="auth-dialog rename-dialog";const r=l.createElement("form"),o=l.createElement("h2");o.id="rename-heading",o.textContent=`批量重命名（${e.length} 个节点）`,n.setAttribute("aria-labelledby",o.id);const i=l.createElement("p");i.className="auth-note",i.textContent="按画布从上到下、从左到右排列。一次填好各节点名称后统一确认；留空恢复默认名称。";const s=l.createElement("div");s.className="rename-list";const d=e.map((u,y)=>{const x=l.createElement("label");x.className="fld";const _=l.createElement("span");_.textContent=`${y+1}. ${Ne(u)}`;const j=l.createElement("input");return j.type="text",j.maxLength=40,j.value=Ne(u),j.placeholder=Ne({...u,name:null}),x.append(_,j),s.appendChild(x),{card:u,input:j}}),f=l.createElement("footer"),h=l.createElement("button");h.type="button",h.className="btn",h.textContent="取消";const m=l.createElement("button");m.type="submit",m.className="btn primary",m.textContent="确认重命名",f.append(h,m),r.append(o,i,s,f),n.appendChild(r),h.onclick=()=>n.close(),n.addEventListener("close",()=>n.remove()),n.addEventListener("keydown",u=>u.stopPropagation()),r.onsubmit=u=>{u.preventDefault(),c===t&&Ze()&&Fa(d.map(({card:y,input:x})=>({card:y,name:x.value}))),n.close()},l.body.appendChild(n),n.showModal(),d[0].input.focus(),d[0].input.select()}function Fa(e){const t=e.map(({card:r,name:o})=>({card:r,name:o.trim().slice(0,40)||null})).filter(({card:r,name:o})=>c.cards.includes(r)&&o!==(r.name||null)&&!(o&&o===Ne(r)));if(!t.length)return;const n=new Map;for(const{card:r,name:o}of t){const i=Ne(r),s=Ne({...r,name:o});i!==s&&n.set(`@${i}`,`@${s}`)}if(n.size){const r=[...n.keys()].sort((i,s)=>s.length-i.length).map(i=>i.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")),o=new RegExp(`(?:${r.join("|")})(?![\\u4e00-\\u9fa5\\w])`,"g");for(const i of c.cards){for(const s of Rt(Z(i))){const d=i.params?.[s.key];typeof d=="string"&&(i.params[s.key]=d.replace(o,f=>n.get(f)))}for(const s in i.opt||{})typeof i.opt[s]=="string"&&(i.opt[s]=i.opt[s].replace(o,d=>n.get(d)))}}for(const{card:r,name:o}of t)r.name=o,an(r);ve&&Nn(ve),xe()}function Yo(e){if(Ze())return Xa(Ha(e),{x:e.x+24+oe/2,y:e.y+28+40})}function zi(e,t){if(!c||!e?.id)return;const n=c.cards.find(r=>r.id===e.id);if(n)for(const r of["created_by","created_by_name","created_at"])e[r]!==void 0&&(n[r]=e[r]);else{const r=JSON.parse(JSON.stringify(e));Go(r),c.cards.push(r),b.world.appendChild(ki(r)),tt(),Xr(),co(),b.hint.textContent=`${c.cards.length} 个节点`,ye(`${r.created_by_name||"协作者"} 添加了「${r.name||"新节点"}」`)}Number.isFinite(t)&&(c.rev=Math.max(c.rev||0,t))}function Da(e,t,n,r){return fn((async()=>{const o=()=>c===e&&ke();if(!o())return null;for(;;){const s=Ve.pendingChain;if(await s,!o())return null;if(s===Ve.pendingChain)break}const i=vn("card_asset",n,r,null,!1);return!i||(Ht(i.id),await _o(i,t),!await i._create||!o()||!e.cards.includes(i))?null:i})())}function Al(e,t){if(!c||e.id!==c.id)return;const n=t.id,r=c.edges.filter(u=>u.from===n||u.to===n),o=(c.groups||[]).filter(u=>u.cards.includes(n)),i=(e.cards||[]).find(u=>u.id===n);if(i)for(const u of["created_by","created_by_name","created_at"])t[u]=i[u];const s=(e.cards||[]).filter(u=>u.id!==n);s.push(t);const d=e.edges||[],f=new Set(d.map(u=>JSON.stringify(u)));for(const u of r){const y=JSON.stringify(u);f.has(y)||(d.push(u),f.add(y))}const h=(e.groups||[]).filter(u=>!u.cards.includes(n));h.push(...o);const m=b.panel.style.display!=="none";Object.assign(c,e,{cards:s,edges:d,groups:h}),Ft&&Ft.rev<=c.rev&&(Ft=null),br(),m&&ve&&Pe(ve)}function Fl(e){!c||e.created_by||(c.cards=c.cards.filter(t=>t!==e),c.edges=c.edges.filter(t=>t.from!==e.id&&t.to!==e.id),c.groups=(c.groups||[]).map(t=>({...t,cards:t.cards.filter(n=>n!==e.id)})).filter(t=>t.cards.length),ae.delete(e.id),ve===e.id&&(ve=null,un()),br())}function Dl(e,t=!1){const n=c,r=n.id;return Ve.enqueueCardCreate(async()=>{try{const o=await Tt(`/api/projects/${encodeURIComponent(r)}/cards`,{card:Ro(e)});if(t){if(c!==n||!n.cards.includes(e))return!1;const i=o.project.cards.find(s=>s.id===e.id);zi(i,o.project.rev)}else{if(c?.id!==r)return!1;if(!n.cards.includes(e)){const i=o.project.cards.find(s=>s.id===e.id);return n.cards.some(s=>s.id===e.id)?zi(i,o.project.rev):c.rev=Math.max(c.rev||0,o.project.rev||0),!1}Al(o.project,e)}return!0}catch(o){(t?c===n:c?.id===r)&&(Ve.markWorkFailure(o),Fl(e),Ue("卡片添加失败："+o.message))}})}function vn(e,t,n,r,o=!0){if(!Ze())return null;const i=An(e);if(!i||!i.modes||!i.modes.length)return Ue(`节点类型 ${e} 不可用：找不到定义或没有模式`),null;const s={id:Vn(),type:e,cap:r||Xe(i.modes[0]),x:Math.round(t),y:Math.round(n),params:{},assets:{},status:null,progress:0,outputs:[]},f=c.cards.filter(m=>st(m)===i).reduce((m,u)=>{if(!u.name)return m;const y=u.name.match(/^(.+?)(\d+)$/);return y?Math.max(m,parseInt(y[2],10)):m},0),h=i.name||i.modes[0].name;return s.name=`${h}${f+1}`,yi(),c.cards.push(s),b.world.appendChild(ki(s)),o&&Ht(s.id),tt(),s._create=Dl(s,!o),queueMicrotask(Fo),s}function bo(e){return qa([e])}function qa(e){if(!c||!Ze())return 0;const t=new Set(e),n=new Set(c.cards.filter(r=>t.has(r.id)).map(r=>r.id));if(!n.size)return 0;tr(c.edges.filter(r=>n.has(r.from))),c.cards=c.cards.filter(r=>!n.has(r.id)),c.edges=c.edges.filter(r=>!n.has(r.to));for(const r of n)ae.delete(r);if(c.groups){for(const r of c.groups)r.cards=r.cards.filter(o=>!n.has(o));c.groups=c.groups.filter(r=>r.cards.length)}return n.has(ve)&&(ve=null,un()),Kt(),n.has(b.hist._id)&&or(),Gt=null,br(),xe(),n.size}function Ba(e){if(!c||!Ze()||!e||lt(e.id)!==e)return;const t=c,n=e.id,r=Ne(e),o=(e.history||[]).length,i=(e.outputs||[]).length||o;confirm(`删除「${r}」？
`+(i?`它有 ${o} 轮生成记录或产物，节点内记录删除后无法恢复。
`:"")+"相关连线会一并移除，此操作不能撤销；不会删除素材文件。")&&(c!==t||!ke()||lt(n)!==e||bo(n)&&ye(`已删除「${r}」`))}let nr=null,Ur=null,Ii=0;function Pi(e){return JSON.parse(JSON.stringify({id:e.id,type:e.type,cap:e.cap,name:e.name||null,w:e.w,h:e.h,x:e.x,y:e.y,params:e.params||{},assets:e.assets||{},outputs:e.outputs||[],opt:e.opt,optUse:e.optUse,optStyles:e.optStyles}))}function Ha(e){const t=c.edges.filter(r=>r.to===e.id&&r.from!==e.id&&lt(r.from)).map(r=>Ge(r)?{...r}:{...r,slots:wn(r)});for(const[r,o]of Object.entries(e.assets||{})){if(!o||t.some(d=>!Ge(d)&&d.slots.includes(r)))continue;const i=typeof o=="string"?[o]:[o.ref,o.url].filter(Boolean),s=c.cards.find(d=>d.id!==e.id&&(d.outputs||[]).some(f=>i.some(h=>h===f.ref||h===f.url)));s&&t.push({from:s.id,to:e.id,slot:r,slots:[r]})}const n=[...new Set(t.map(r=>r.from))].map(r=>{const o=lt(r),i=Pi(o);if(!pt(o)){const s=t.filter(f=>f.from===r&&!Ge(f)).flatMap(f=>f.slots.map(h=>{const m=e.assets?.[h];return m&&typeof m=="object"?m:i.outputs.find(u=>m&&(u.ref===m||u.url===m))}).filter(Boolean)),d=[...new Map(s.map(f=>[f.ref||f.url||JSON.stringify(f),f])).values()];Object.assign(i,{type:"card_asset",cap:"asset",name:Ne(o),params:{},assets:{},outputs:d.length?d:i.outputs})}return i});return JSON.parse(JSON.stringify({...Pi(e),sourceProject:c.id,references:{cards:n,edges:t}}))}function yr(e){const t=!e||ae.has(e.id)?c.cards.filter(n=>ae.has(n.id)):[e];t.length&&(nr=t.map(Ha),Ii=0,ye(t.length>1?`已复制 ${t.length} 个节点 · Ctrl / Cmd + V 批量粘贴`:`已复制「${Ne(t[0])}」${nr[0].outputs.length?"（包含当前产物）":""} · Ctrl / Cmd + V 粘贴`))}function ql(e,t){const n=Array.isArray(e)?e:[e],r=n[0],o=r.sourceProject&&r.sourceProject!==c.id,i=new Set(n.map(x=>x.id)),s=new Map,d=n.flatMap(x=>x.references?.edges||[]);if(o)for(const x of n)for(const _ of x.references?.cards||[]){if(i.has(_.id))continue;const j=s.get(_.id);j?j.outputs=[...new Map([...j.outputs||[],..._.outputs||[]].map(S=>[S.ref||S.url||JSON.stringify(S),S])).values()]:s.set(_.id,{..._})}if([...n,...s.values()].some(x=>!K.some(_=>_.id===x.type)))throw new Error("这种节点在当前版本里不存在了，粘不了");const f=(x,_,j)=>{const S=vn(x.type,_,j,x.cap,!1);return S?(Object.assign(S,{...Pi(x),id:S.id,x:S.x,y:S.y,status:x.outputs?.length?"done":null}),an(S),Xn(S),at(S),At(S),ns(S),S):null},h=t.x-oe/2-r.x,m=t.y-40-r.y,u=new Map,y=[];for(const x of[...n,...s.values()]){const _=f(x,x.x+h,x.y+m);_&&(u.set(x.id,_.id),i.has(x.id)&&y.push(_))}for(const x of d){const _=u.get(x.from)||!o&&x.from,j=u.get(x.to);_&&j&&lt(_)&&c.edges.push({...JSON.parse(JSON.stringify(x)),from:_,to:j})}if(!y.length)return null;if(y.length===1)Ht(y[0].id);else{ve=null,Gt=null,ae=new Set(y.map(x=>x.id)),un(),or();for(const x of c.cards)x._el?.classList.toggle("sel",ae.has(x.id));jn()}return tt(),Vt(),xe(),ye(y.length>1?`已粘贴 ${y.length} 个节点`:`已粘贴「${Ne(y[0])}」`),y.length===1?y[0]:y}function Xa(e,t){const n=c;return fn((async()=>{try{let r=Array.isArray(e)?e:[e];if(r[0].sourceProject&&r[0].sourceProject!==n.id){const o=r.length>1,i=await Tt(`/api/projects/${encodeURIComponent(n.id)}/copy`,{source_project:r[0].sourceProject,card:o?{cards:r}:r[0]});if(!i.card||o&&!Array.isArray(i.card.cards))throw new Error("复制接口未返回节点");r=o?i.card.cards:[i.card]}for(;;){const o=Ve.pendingChain;if(await o,!ke()||c!==n)throw new Error("画布已切换或权限已变化，未粘贴");if(o===Ve.pendingChain)break}return ql(r,t)}catch(r){Ue(`粘贴失败：${r.message}`)}})())}function Li(){if(!Ze())return;if(!nr)return ye("还没复制东西：先选中节点，Ctrl / Cmd + C");const e=nr[0],t=Ur||{x:e.x+oe/2+24*++Ii,y:e.y+40+28*Ii};return Xa(nr,t)}const Ti={png:"image",jpg:"image",jpeg:"image",webp:"image",gif:"image",bmp:"image",mp4:"video",webm:"video",mkv:"video",mov:"video",avi:"video"},Ua={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif","image/bmp":"bmp","video/mp4":"mp4","video/webm":"webm","video/x-matroska":"mkv","video/quicktime":"mov","video/x-msvideo":"avi"};let Ri=Promise.resolve();function Oi(e){return Ti[/\.([a-z0-9]+)$/i.exec(e.name||"")?.[1].toLowerCase()]||Ti[Ua[e.type]]||null}function Ai(){if(!c||b.panel.style.display==="none"||b.panel.style.visibility==="hidden"||b.view.style.display!=="none"||l.querySelector("dialog[open]"))return null;const e=R?lo():lt(b.panel._id);return e&&e.id===b.panel._id?e:null}function Jo(e,t){if(pt(e)||ut(e))throw new Error("当前节点不接收图片 / 视频引用，请先打开生成或工具节点的参数面板");const n=st(e),r=Z(e),o=Pt(e,t);let i=e.cap;if(o)i=o.cap;else if(n?.id==="card_image"&&t==="image"&&["zimage_t2i","krea2_t2i"].includes(i))i=i.replace("_t2i","_i2i");else if(n?.id==="card_video"&&t==="video"&&!r?.inputs.some(y=>y.type===t)){const y=n.modes.find(x=>Vo(x,t));y&&(i=Xe(y))}const s=c.edges.filter(y=>y.to===e.id&&!Ge(y));if(i!==e.cap&&(Object.values(e.assets||{}).some(Boolean)||s.length))throw new Error("引用此素材需要切换模式；为保留已有引用，请先手动选择对应模式");const d=ie[i],f=d?.inputs.filter(y=>y.type===t)||[],h=rr(d,t),m=y=>!!e.assets?.[y.key]||s.some(x=>wn(x).includes(y.key)),u=f.find(y=>!m(y));if(!u||f.filter(m).length>=h)throw new Error(f.length?`${Qe[t]}引用已满，不会覆盖已有素材`:`当前节点没有可接收的${Qe[t]}槽位`);return{cap:i,slot:u}}async function Bl(e,t,n){let r=n.cap;const o=()=>c===t&&tn()&&t.cards.includes(n)&&Ai()===n&&n.cap===r;try{if(!o())return;if(!An("card_asset"))throw new Error("找不到素材节点定义");const i={...n,assets:{...n.assets}};for(const s of e){const d=Jo(i,Oi(s));i.cap=d.cap,i.assets[d.slot.key]=!0}for(const s of e){if(!o())return;const d=Oi(s);Jo(n,d);const f=/\.([a-z0-9]+)$/i.exec(s.name||"")?.[1].toLowerCase(),h=Ti[f]?s:new File([s],`${s.name||"剪贴板素材"}.${Ua[s.type]}`,{type:s.type}),m=await dn(h,Z(n)?.execution==="browser");if(!o())return;if(m.kind!==d)throw new Error("上传素材类型不匹配，未创建节点或引用");for(;;){const _=Ve.pendingChain;if(await _,!o())return;if(_===Ve.pendingChain)break}Jo(n,d);const u=ji(),y=vn("card_asset",u.x,u.y,null,!1);if(!y||(await _o(y,m,!1),!await y._create))return;if(!o()||!t.cards.includes(y)){c===t&&ye("素材已导入，但当前节点已改变，未添加引用");return}const x=Jo(n,d);x.cap!==n.cap&&(st(n)?.id==="card_image"?(gr(n,x.cap),n._model||(n._model=x.cap.startsWith("krea2")?"krea2":"zimage")):n.cap=x.cap,r=n.cap,an(n)),n.assets[x.slot.key]=JSON.parse(JSON.stringify(y.outputs[0])),Qn(n),t.edges.push({from:y.id,to:n.id,slot:x.slot.key,slots:[x.slot.key]}),tt(),Vt(),At(n),Pe(n.id),xe(),ye(`已导入${Qe[d]}素材并引用到「${Ne(n)}」的${xn(x.slot,n)}`)}}catch(i){c===t&&Ue("剪贴板导入失败："+i.message)}}function Hl(e){if(e.defaultPrevented||l.querySelector("dialog[data-image-composer][open]"))return;const t=Ai();if(!t)return;const n=e.clipboardData,r=[...n?.items||[]].filter(s=>s.kind==="file").map(s=>s.getAsFile()).filter(Boolean),o=r.length?r:[...n?.files||[]];if(o.length){if(e.preventDefault(),!tn())return ye("此画布只读或已锁定，不能导入剪贴板素材");const s=o.filter(f=>Oi(f));if(!s.length)return ye("剪贴板仅支持图片或视频文件");const d=c;Ri=Ri.then(()=>Bl(s,d,t)),fn(Ri);return}e.target.closest("input,textarea,select")||e.target.isContentEditable||R||(nr?(e.preventDefault(),Li()):n?.types.length&&ye("剪贴板未提供可读取的图片 / 视频文件；复制路径不能导入，请拖入文件或上传"))}function rr(e,t){if(!e)return 0;const n=e.slotLimits&&e.slotLimits[t]&&e.slotLimits[t].max;return n??e.inputs.filter(r=>r.type===t).length}function Wa(e,t){const n=Z(e);return n?n.inputs.filter(r=>r.type===t&&(e.assets||{})[r.key]).length:0}function Xl(e,t){const n=Z(e);if(!n)return null;const r=new Set((c?.edges||[]).filter(o=>o.to===e.id&&!Ge(o)).flatMap(wn));return We(e)&&(!rr(n,t)||Wa(e,t)>=rr(n,t))?null:n.inputs.find(o=>o.type===t&&!e.assets?.[o.key]&&!r.has(o.key))||null}function Fi(e,t){if(!Ze()||e.id===t.id)return;if(Bt(t)){if(!pn(e))return ye(`「${Ne(e)}」手里还没有字：先写一段，或先运行它`);if(c.edges.some(i=>i.from===e.id&&i.to===t.id&&i.slot===bn))return ye("已经接过了");c.edges.push({from:e.id,to:t.id,slot:bn}),tt(),Vt(),ve===t.id&&Pe(t.id),xe();const o=Tr(t).length;ye(`已把「${Ne(e)}」的文本接给「${Ne(t)}」（第 ${o} 段输入）`);return}if(It(t))return ye("风格节点不收输入：它把字写给生成节点用");if(!Rt(Z(t)).length)return ye(`「${Ne(t)}」不写提示词，接文本节点没有用`);if(!pn(e))return ye(`「${Ne(e)}」手里还没有字：先写一段，或先运行它`);if(c.edges.some(o=>o.from===e.id&&o.to===t.id&&o.slot===cr))return ye("已经挂上了");c.edges.push({from:e.id,to:t.id,slot:cr}),tt(),Vt(),ve===t.id&&Pe(t.id),xe();const r=fr(e).length;ye(`文本已挂给「${Ne(t)}」`+(r?`，下游 ${r} 个节点也跟着带`:""))}async function Ya(e,t){if(!Ze()||!t)return;if(pt(e))return Fi(e,t);if(pt(t))return ye("文本节点不收图片/视频素材：把文本节点的出口拖过来才是接文本");if(ut(t))return ye("素材节点不收输入：它是把手里那份素材送给别的节点的");const n=e.outputs||[],r=n[0];if(!r)return ye(ut(e)?"这个素材节点还是空的：先点它选个文件":"上游还没有产物，先运行它");const o=st(t);let i=!1;o&&o.id==="card_image"&&r.kind==="image"&&(t.cap==="zimage_t2i"?(gr(t,"zimage_i2i"),t._model||(t._model="zimage"),an(t),i=!0):t.cap==="krea2_t2i"&&(gr(t,"krea2_i2i"),t._model||(t._model="krea2"),an(t),i=!0));const s=Z(t);if(o&&o.id==="card_video"&&r.kind==="video"&&!We(t)&&!(s&&s.inputs.some(m=>m.type==="video"))){const m=o.modes.find(u=>Vo(u,"video"));m&&(tr(c.edges.filter(u=>u.to===t.id&&!Ge(u))),t.assets={},t.cap=Xe(m),an(t),i=!0)}const d=Pt(t,r.kind);d&&(tr(c.edges.filter(m=>m.to===t.id)),t.cap=d.cap,t.assets={},an(t));const f=d?{key:d.slot,label:Qe[r.kind]||"素材"}:Xl(t,r.kind);if(!f){const m=rr(Z(t),r.kind);return ye(m&&Wa(t,r.kind)>=m?`${Qe[r.kind]||r.kind}引用已达上限 ${m}`:`下游节点没有可接收的${Qe[r.kind]||r.kind}槽位`)}d||tr(c.edges.filter(m=>m.to===t.id&&wn(m).includes(f.key)));const h={from:e.id,to:t.id,slot:f.key,slots:Ea(t,f.key,n)};c.edges.push(h),po(t),tt(),Vt();try{const m=mr(t).length&&Rt(Z(t)).length,u=rr(Z(t),r.kind);ye(`引用上游产物 → ${xn(f,t)}`+(u?`（上限 ${u}）`:"")+(m?"；上游的风格也跟着传下来了":""));for(let y=0;y<h.slots.length;y++){const x=n[y];if(!x)break;const _=Z(e)?.execution==="browser"&&x.ref?.startsWith("chouka/"),j=ut(e)||_?JSON.parse(JSON.stringify(x)):await Di(x,Z(t)?.execution==="browser");if(!c||!c.edges.includes(h))return;t.assets[h.slots[y]]=j}Qn(t),At(t),tt(),(i||ve===t.id)&&Pe(t.id),xe()}catch(m){c?.edges.includes(h)&&(tr([h]),po(t),tt(),Vt(),ve===t.id&&Pe(t.id)),xe(),Ue("引用失败："+m.message)}}function Vo(e,t){if(e.route)return!!e.route[t];const n=ie[Xe(e)];return!!n&&n.inputs.some(r=>r.type===t)}async function Ul(e,t,n,r){if(!Ze())return;const o=[["card_text","文本"],["card_image","图片"],["card_video","视频"],["card_tools","工具箱"]],i=(e.outputs||[]).length,s=(e.outputs||[])[0]?.kind||(Z(e)||st(e)||{}).outputType;console.log("[spawnDownstream] 上游产物:",{outputCount:i,outputKind:s,fromId:e.id});const d=y=>{const x=[];for(const[_,j]of o){const S=K.find(be=>be.id===_);if(!S||!S.modes.length)continue;let B=null;i>1&&s&&(B=S.modes.find(be=>{if(!y(be))return!1;const Ke=Xe(be),dt=ie[Ke];if(!dt)return!1;const et=dt.images||0,He=dt.videos||0,ht=dt.audios||0;return console.log("[spawnDownstream] 检查模式:",{mode:be,capId:Ke,imgCount:et,vidCount:He,audCount:ht,outputCount:i,outputKind:s}),s==="image"&&et===i?(console.log("[spawnDownstream] ✓ 找到匹配的图片模式:",Ke),!0):s==="video"&&He===i?(console.log("[spawnDownstream] ✓ 找到匹配的视频模式:",Ke),!0):s==="audio"&&ht===i?(console.log("[spawnDownstream] ✓ 找到匹配的音频模式:",Ke),!0):!1})),B||(B=S.modes.find(y)),B&&x.push({icon:S.icon,text:j,run:async()=>{const be=vn(S.id,t.x,t.y-40,Xe(B));be&&(pt(e)?await Fi(e,be):await Ya(e,be))}})}return x};if(pt(e)){const y=K.find(_=>_.id==="card_text"),x=[];return y&&y.modes.length&&x.push({icon:y.icon,text:"文本节点（接住这段字当输入）",run:async()=>{const _=vn(y.id,t.x,t.y-40,Xe(y.modes[0]));_&&await Fi(e,_)}}),x.push(...d(_=>Rt(ie[Xe(_)]).length)),x.length?Ot(n,r,"把这段文本接给…",x):void 0}if(ut(e)){const y=jt(e);if(!y)return ye("这个素材节点还是空的：先点它选个文件");const x=d(j=>Vo(j,y.kind)),_=Qe[y.kind]||y.kind;return x.length?Ot(n,r,`把这个${_}接给…`,x):ye(`没有节点收${_}素材`)}const f=(e.outputs||[])[0],h=f?f.kind:(Z(e)||st(e)||{}).outputType;if(!h)return;const m=d(y=>Vo(y,h)),u=Qe[h]||h;if(!m.length)return ye(`没有节点收${u}素材`);Ot(n,r,`把这个${u}接给…`,m)}async function Di(e,t=!1){const n=c;if(!ke())throw new Error("此画布只读，不能导入素材");const r=await Y(new te(e.url,location.href),{credentials:"same-origin"});if(!r.ok)throw new Error(`读取产物失败（${r.status}）`);const o=await r.blob();if(c!==n||!ke())throw new Error("画布已切换或权限已变化，导入已取消");const i=e.filename||new te(e.url,location.href).pathname.split("/").pop()||"历史产物",s=new File([o],i.split(/[\\/]/).pop(),{type:o.type});return dn(s,t)}const wr=new Map;function Wl(e,t){if(t?.aborted)return Promise.reject(t.reason);const n=/^\/api\/upload\/([^/?#]+)$/.exec(e);if(!n)return Promise.resolve(e);if(!wr.has(e)){const i={controller:new AbortController,users:new Set,ready:!1};i.promise=(async()=>{const s=i.controller.signal;for(;;){s.throwIfAborted();const d=await vt(`/api/preview/${n[1]}`,{signal:s});if(s.throwIfAborted(),d.status==="ready")return i.ready=!0,d.url;if(d.status==="error")throw new Error(d.error);await new Promise((f,h)=>{const m=()=>{D(u),h(s.reason)},u=I(()=>{s.removeEventListener("abort",m),f()},1500);s.addEventListener("abort",m,{once:!0})})}})(),wr.set(e,i),i.promise.catch(()=>{wr.get(e)===i&&wr.delete(e)})}const r=wr.get(e),o={};return r.users.add(o),new Promise((i,s)=>{const d=()=>{t?.removeEventListener("abort",f),r.users.delete(o),!r.ready&&!r.users.size&&(wr.get(e)===r&&wr.delete(e),r.controller.abort())},f=()=>{d(),s(t.reason)};t?.addEventListener("abort",f,{once:!0}),r.promise.then(h=>{d(),i(h)},h=>{d(),s(h)})})}function xo(e,t,n=()=>!0,r){if(e.playsInline=!0,!/^\/api\/upload\//.test(t)){e.src=t;return}e.dataset.previewOriginal=t;const o=e.getAttribute("poster"),i=e.title;let s;const d=(f,h)=>{e.dataset.previewState=f?"error":"processing",e.title=h;const m=f?["视频转码失败","修复转码后才能生成"]:["正在转码为 MP4","完成后可预览和生成"];e.poster=s="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#111318"/><g fill="#d1d5db" text-anchor="middle" font-family="sans-serif" font-size="25"><text x="320" y="168">${m[0]}</text><text x="320" y="208" font-size="19">${m[1]}</text></g></svg>`)};return d(!1,"服务器正在生成兼容 MP4；原片已备份，转码完成后下游节点使用 MP4 生成。"),Wl(t,r).then(f=>{e.dataset.previewOriginal!==t||!n()||(e.dataset.previewState="ready",e.title=i||"MP4 转码已完成，预览和后续生成均使用此版本；原片已备份。",e.getAttribute("poster")===s&&(o?e.poster=o:e.removeAttribute("poster")),e.src=f)}).catch(f=>{r?.aborted||e.dataset.previewOriginal!==t||!n()||(d(!0,f.message||"转码状态加载失败；请检查服务器后重试生成。"),e.removeAttribute("src"),e.load())})}function Ja(e){e.querySelectorAll("video[data-video-url]").forEach(t=>{xo(t,t.dataset.videoUrl)})}const Mn=new Map;let Wr=null,Ko=null,yo=null,qi=0,wo=null;function Bi(){!Mn.size||wo!==null||(wo=V(()=>{wo=null,Xi()}))}N.addEventListener("resize",Bi);function Va(e){return/^\/api\/(upload|artifact)\//.test(e)?`/api/thumbnail?url=${encodeURIComponent(e)}`:null}function Ka(e,t){t.controller?.abort(),t.blob&&te.revokeObjectURL(t.blob),vr(e),e.tagName==="VIDEO"&&(e.pause(),e.removeAttribute("src"),e.load()),Wr?.unobserve(e),yo?.unobserve(e),Mn.delete(e)}function Hi(){for(const[e,t]of Mn)Ka(e,t);Wr?.disconnect(),Ko?.disconnect(),yo?.disconnect(),Wr=null,Ko=null,yo=null,G(wo),wo=null}function Xi(){const e=b.stage.getBoundingClientRect(),t=N.devicePixelRatio||1;for(const[n,r]of Mn){if(!r.visible||!n.isConnected||r.project!==c||!p.active)continue;const o=n.getBoundingClientRect();if(o.right<=e.left-120||o.left>=e.right+120||o.bottom<=e.top-120||o.top>=e.bottom+120){r.controller?.abort();continue}if(r.fullURL&&!r.original&&Math.max(o.width,o.height)*t>512&&(r.url=r.fullURL,r.original=!0,r.done=!1,r.controller?.abort()),r.loading||r.done||qi>=4)continue;const i=new AbortController;r.controller=i,r.loading=!0,qi++,(async()=>{try{const s=await Y(r.url,{credentials:"same-origin",signal:i.signal});if(i.signal.aborted||Mn.get(n)!==r||r.project!==c||!p.active)return;if(!s.ok)throw s.status===401&&await p.me(),[403,404].includes(s.status)&&N.dispatchEvent(new CustomEvent("h3auth:denied",{detail:{path:"/api/thumbnail",method:"GET",error:{status:s.status}}})),new Error(`预览加载失败（${s.status}）；可双击查看原文件`);const d=await s.blob();if(i.signal.aborted||Mn.get(n)!==r||!n.isConnected||r.project!==c||!p.active)return;const f=r.blob;r.blob=te.createObjectURL(d),n.tagName==="VIDEO"?n.poster=r.blob:n.src=r.blob,f&&te.revokeObjectURL(f),r.done=!0}catch(s){!i.signal.aborted&&Mn.get(n)===r&&(r.done=!0,n.title=s.message)}finally{r.loading=!1,r.controller=null,qi--,Xi()}})()}}function Yl(e,t){const n=Va(t);e.tagName==="VIDEO"?(e.dataset.videoUrl=t,e.preload="none",e.title="单击播放；双击放大查看原视频",e.poster="data:image/svg+xml;charset=utf-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="288"><rect width="512" height="288" fill="#111318"/><path d="M238 121v46l40-23z" fill="#b7bbc3"/></svg>')):(e.decoding="async",n&&(e.dataset.thumbnail="true")),Wr||(Wr=new $(r=>{for(const o of r){const i=Mn.get(o.target);i&&(i.visible=o.isIntersecting,!i.visible&&i.loading&&i.controller?.abort())}Xi()},{root:b.stage,rootMargin:"120px"}),Ko=new z(()=>{for(const[r,o]of Mn)r.isConnected||Ka(r,o)}),Ko.observe(b.world,{childList:!0,subtree:!0}),yo=new ee(Bi)),Mn.set(e,{url:n||t,fullURL:n?e.tagName==="VIDEO"?`${n}&size=original`:t:null,original:!1,project:c,visible:!1,loading:!1,done:e.tagName==="VIDEO"&&!n}),Wr.observe(e),yo.observe(e)}function Jl(e,t,n){for(const o of e.querySelectorAll("img, video")){const i=o.classList.contains("old")?n:t[+(o.dataset.i||0)]?.url;i&&Yl(o,i)}const r=e.querySelector("audio");r&&(r.src=t[0].url)}function vr(e){e._playRequest&&e.pause(),e._playRequest=null,e._previewController?.abort(),e._previewController=null}async function Vl(e){if(!e.isConnected||!p.active)return;for(const o of l.querySelectorAll("video"))vr(o);const t=c,n={},r=new AbortController;e._playRequest=n,e._previewController=r;try{if(e.getAttribute("src")||(e.preload="metadata",await xo(e,e.dataset.videoUrl,()=>e._playRequest===n&&e.isConnected&&c===t&&p.active,r.signal)),e._playRequest!==n||!e.isConnected||c!==t||!p.active||e.dataset.previewState==="error")return;await e.play()}catch(o){!r.signal.aborted&&e._playRequest===n&&e.isConnected&&c===t&&(e.title=o.message||"视频暂时无法播放")}finally{e._previewController===r&&(e._previewController=null)}}function vo(e){ho(null,0,[{url:e.url,kind:e.kind,filename:(e.origin||e.url).split(/[\\/]/).pop()}],null)}const Ga=20;function Yr(e,t){const n=e.outputs||[],r=We(e);if(!n.length&&!r)return;e.history=e.history||[];const o=e.history.find(i=>i.job===t.id);if(o){r&&Object.assign(o,{status:e.status,ms:e.ms??null,outputs:n});return}e.history.unshift({ts:Date.now(),job:t.id,seed:e.seed!=null?e.seed:null,cap:t.capability,ms:e.ms!=null?e.ms:null,outputs:n,...r?{status:e.status}:{},...t.prompts?{prompts:t.prompts.map(i=>({...i}))}:{}}),e.history.length>Ga&&(e.history.length=Ga)}function Go(e){e.history||(e.history=(e.outputs||[]).length?[{ts:null,seed:e.seed!=null?e.seed:null,cap:e.cap,outputs:e.outputs}]:[])}function kr(e){if(!(e>0))return"";const t=Math.round(e/1e3);if(t<60)return`${t}秒`;const n=Math.floor(t/60);return n<60?`${n}分${t%60}秒`:`${Math.floor(n/60)}时${n%60}分`}function Ui(e){if(!e)return"早前";const t=new Date(e),n=i=>String(i).padStart(2,"0"),r=new Date;r.setHours(0,0,0,0);const o=`${n(t.getHours())}:${n(t.getMinutes())}`;return e>=r.getTime()?o:`${n(t.getMonth()+1)}-${n(t.getDate())} ${o}`}function or(){b.hist.style.display="none",b.hist.innerHTML="",b.hist._id=null}function Za(e){return Math.max(240,Math.min(e,Math.min(720,innerWidth*.65)))}function Kl(){if(!b.hist||b.hist.style.display==="none")return;const e=b.hist.getBoundingClientRect().width,t=Za(e);t!==e&&b.hist.style.setProperty("--hist-width",`${t}px`)}function Gl(e){const t=n=>{b.hist.style.setProperty("--hist-width",`${Za(n)}px`),Ct(),Rn(),jn()};e.onpointerdown=n=>{if(n.button!==0)return;n.preventDefault();const r=n.clientX,o=b.hist.getBoundingClientRect().width;b.hist.classList.add("resizing"),e.setPointerCapture(n.pointerId),e.onpointermove=i=>t(o+r-i.clientX),e.onpointerup=e.onpointercancel=()=>{b.hist.classList.remove("resizing"),e.onpointermove=e.onpointerup=e.onpointercancel=null}},e.onkeydown=n=>{if(n.key!=="ArrowLeft"&&n.key!=="ArrowRight")return;n.preventDefault();const r=n.shiftKey?40:16;t(b.hist.getBoundingClientRect().width+(n.key==="ArrowLeft"?r:-r))}}function Jr(e){const t=c&&c.cards.find(i=>i.id===e);if(!t||pt(t))return or();Go(t);const n=l.createElement("div");n.className="hlist",Z(t);const r=l.createElement("button");r.className="hresize",r.type="button",r.title="左右拖动调整历史产物栏宽度",r.setAttribute("aria-label","调整历史产物栏宽度"),Gl(r);const o=l.createElement("div");if(o.className="hhd",o.innerHTML='<b>历史产物</b><span class="n"></span><button class="x" title="收起">✕</button>',o.querySelector(".n").textContent=t.history.length?`${t.history.length} 轮`:"",o.querySelector(".x").onclick=or,!t.history.length){const i=l.createElement("div");i.className="hempty",i.textContent=`这个节点还没出过东西。
运行一次，每一轮的产物和 seed 都会留在这里。`,i.style.whiteSpace="pre-line",n.appendChild(i)}for(const[i,s]of t.history.entries())n.appendChild(Zl(t,s,i===0));b.hist.innerHTML="",b.hist.append(r,o,n),b.hist._id=e,b.hist.style.display=""}async function Zo(e,t){const n=String(e);try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(n);else{const r=l.activeElement,o=l.createElement("textarea");o.value=n,o.style.cssText="position:fixed;top:0;left:0;opacity:0;pointer-events:none",l.body.appendChild(o);try{if(o.focus(),o.select(),!l.execCommand("copy"))throw new Error("复制失败")}finally{o.remove(),r?.focus({preventScroll:!0})}}ye(t)}catch{Ue("复制失败，请展开后手动选中文字复制")}}const Wi="application/x-chouka-history-output";let ko=null;function Zl(e,t,n){const r=t.outputs||[],o=l.createElement("div");o.className="hrun"+(n?" cur":"");const i=l.createElement("div");i.className="rh";const s=ie[t.cap]&&ie[t.cap].name||"";i.innerHTML='<span class="tag"></span><span class="nm"></span><span class="cnt"></span>',i.querySelector(".tag").textContent=n?"最新":Ui(t.ts),i.querySelector(".nm").textContent=n?Ui(t.ts):s,i.querySelector(".cnt").textContent=[t.status==="running"?"生成中":t.status==="error"?"失败":r.length>1?`${r.length} 张`:"",kr(t.ms)].filter(Boolean).join(" · "),i.title=s;const d=l.createElement("div");d.className="rg"+(r.length===1?" one":""),d.style.setProperty("--hcols",r.length===1?1:r.length<=4?2:3),d.innerHTML=r.map((u,y)=>u.kind==="video"?`<video data-video-url="${u.url}" data-i="${y}" muted loop preload="metadata" draggable="false"></video>`:u.kind==="audio"?`<div class="rg-a" data-i="${y}" title="${u.filename}">🎵</div>`:`<img src="${u.url}" data-i="${y}" alt="" draggable="false">`).join(""),Ja(d);for(const u of d.querySelectorAll("[data-i]"))u.draggable=!0,u.title="单击放大查看；拖到画布创建素材节点";let f=!1;d.ondragstart=u=>{const y=u.target.closest("[data-i]"),x=y&&r[+y.dataset.i];if(!ke()||!x||!["image","video","audio"].includes(x.kind)){u.preventDefault();return}f=!0,ko={token:Vn(),project:c,output:{...x}},u.dataTransfer.items.clear(),u.dataTransfer.effectAllowed="copy",u.dataTransfer.setData(Wi,ko.token)},d.ondragend=()=>{ko=null,I(()=>{f=!1},0)},d.onclick=u=>{if(f)return;const y=u.target.closest("[data-i]");y&&ho(e,+y.dataset.i,r,t.seed)},d.oncontextmenu=u=>{u.preventDefault(),u.stopPropagation();const y=u.target.closest("[data-i]");if(!y)return;const x=+y.dataset.i,_=r[x];if(!_)return;const j=[];j.push({icon:"⬇",text:`下载${_.kind==="video"?"视频":_.kind==="audio"?"音频":"图片"}`,run:()=>go(_)}),r.length>1&&j.push({icon:"⬇",text:`下载全部 ${r.length} 张${_.kind==="video"?"视频":_.kind==="audio"?"音频":"图片"}`,run:()=>r.forEach(S=>go(S))}),Ot(u.clientX,u.clientY,"历史记录",j)},o.append(i,d);const h=l.createElement("div");if(h.className="rs",h.innerHTML="<i>seed</i><span></span>",h.querySelector("span").textContent=t.seed!=null?String(t.seed):"未记录",t.seed!=null){const u=l.createElement("button");u.textContent="复制",u.title="复制 seed",u.onclick=()=>Zo(t.seed,"已复制 seed "+t.seed),h.appendChild(u)}if(o.appendChild(h),t.user_prompt||t.negative_prompt){const u=l.createElement("details");u.className="rp";const y=l.createElement("summary");y.textContent="提示词";const x=l.createElement("div");if(t.user_prompt){const _=l.createElement("div");_.style.display="flex",_.style.justifyContent="space-between",_.style.alignItems="center",_.style.marginBottom="4px";const j=l.createElement("div");j.style.fontWeight="bold",j.textContent="正面提示词：";const S=l.createElement("button");S.textContent="复制",S.style.fontSize="12px",S.style.padding="2px 8px",S.onclick=()=>Zo(t.user_prompt,"已复制正面提示词"),_.append(j,S);const B=l.createElement("div");B.style.marginBottom=t.negative_prompt?"8px":"0",B.textContent=t.user_prompt,x.append(_,B)}if(t.negative_prompt){const _=l.createElement("div");_.style.display="flex",_.style.justifyContent="space-between",_.style.alignItems="center",_.style.marginBottom="4px";const j=l.createElement("div");j.style.fontWeight="bold",j.textContent="负面提示词：";const S=l.createElement("button");S.textContent="复制",S.style.fontSize="12px",S.style.padding="2px 8px",S.onclick=()=>Zo(t.negative_prompt,"已复制负面提示词"),_.append(j,S);const B=l.createElement("div");B.textContent=t.negative_prompt,x.append(_,B)}u.append(y,x),o.appendChild(u)}const m=t.prompts||(t.prompt!=null?[{label:"提示词",text:t.prompt}]:[]);for(const u of m){const y=l.createElement("details");y.className="rp";const x=l.createElement("div");x.className="history-prompt";const _=l.createElement("summary");_.textContent=u.key==="if_original"?"原始提示词":u.key==="if_submitted"?"提交给 IF CLI 的提示词":"当时提交的"+u.label;const j=l.createElement("button");j.textContent="复制",j.type="button",j.className="history-prompt-copy",j.title="复制"+_.textContent,j.onclick=()=>Zo(u.text,"已复制"+u.label);const S=l.createElement("div");S.textContent=u.text||"（本次提交为空）",y.append(_,S),x.append(y,j),o.appendChild(x)}return o}async function Ql(e){if(!Ze())return;if(!tn())return ye("请先复制示例画布，再保存图片合成");if(l.querySelector("dialog[data-image-composer][open]"))return;const t=c,n=()=>c===t&&tn()&&lt(e.id)===e&&e.cap==="image_composite",r=()=>{if(!n())throw new Error("画布、节点或权限已变化，请关闭编辑器后重新打开")},o=async(i,s)=>{r(),Ve.beginFlush();try{yi(),e.params.composition=JSON.parse(JSON.stringify(i));for(const f of Object.keys(e.assets))f.startsWith("composite:")&&delete e.assets[f];for(const f of i.layers)f.kind!=="paint"&&(e.assets[`composite:${f.id}`]={...f.asset});if(s){e.outputs=[s],e.status="done",e.progress=1,e.job=null,e.seed=null,e.ms=null,e.error=null,e.step="",Yr(e,{id:`local:${Vn()}`,capability:e.cap});for(const f of t.edges.filter(h=>h.from===e.id&&!Ge(h)&&!h.version)){const h=lt(f.to);if(!h)continue;const m=wn(f);f.slots=m,m.forEach((u,y)=>{y===0?h.assets[u]={...s}:delete h.assets[u]}),At(h)}}Fo(),Ve.cancelContentSave();const d=await Tn(t.id);if(!d.ok)throw d.error||new Error("合成保存失败，请重试");r(),at(e),tt(),b.panel._id===e.id&&Pe(e.id),s&&b.hist._id===e.id&&Jr(e.id)}finally{Ve.endFlush()}};try{if(e._create&&await e._create,r(),!N.ChoukaImageComposer)throw new Error("图片合成组件未加载，请强制刷新页面");const i=new Map,s=(f,h)=>{f?.kind!=="image"||!f.url||i.has(f.url)||i.set(f.url,{...f,name:h||f.origin||f.filename||"图片"})};for(const f of Object.values(e.assets||{}))s(f,f?.origin);for(const f of t.cards)if(f!==e){for(const h of Object.values(f.assets||{}))s(h,`${Ne(f)} · ${h?.origin||"素材"}`);for(const h of f.outputs||[])s(h,`${Ne(f)} · 产物`);for(const h of f.history||[])for(const m of h.outputs||[])s(m,`${Ne(f)} · 历史产物`)}const d=(Z(e)?.inputs||[]).filter(f=>f.type==="image").map(f=>e.assets[f.key]).filter(f=>f?.kind==="image"&&f.url);await N.ChoukaImageComposer.open({state:e.params.composition?JSON.parse(JSON.stringify(e.params.composition)):null,linkedSources:d,sources:[...i.values()],canEdit:n,upload:async f=>{r();const h=await dn(f,!0);return r(),h},onSave:f=>o(f),onExport:async(f,h)=>{r();const m=await dn(new File([f],`composition_${Date.now()}.png`,{type:"image/png"}),!0);r(),await o(h,{...m,filename:m.origin}),ye("图片合成已保存，可从输出端口连接下游节点")}})}catch(i){Ue("图片合成："+i.message)}}function un(){b.panel.style.display="none",b.panel._id=null,or()}function Qa(e){b.panel.style.display!=="none"&&(b.panel.style.visibility=e?"hidden":"")}function Ct(){if(b.panel.style.display==="none")return;if(xs(b.panel,!ke()),R){b.panel.style.left="0px",b.panel.style.top="0px",b.panel.style.maxHeight="100%",b.panel.style.visibility="";return}const e=c&&c.cards.find(be=>be.id===b.panel._id);if(!e||!e._el)return un();const t=8,n=e.x,r=e.y,o=e._el.offsetWidth,i=e._el.offsetHeight,s=n*Q.k+Q.x,d=r*Q.k+Q.y,f=o*Q.k,h=i*Q.k,m=b.stage.getBoundingClientRect(),u=s+f,y=d+h;if(!(u>0&&s<m.width&&y>0&&d<m.height)){b.panel.style.visibility="hidden";return}b.panel.style.visibility="";const _=52;b.panel.style.maxHeight=innerHeight-_-t+"px";const j=b.panel.offsetWidth;b.panel.offsetHeight;const S=s+f/2-j/2,B=d+h+t;b.panel.style.left=S+"px",b.panel.style.top=B+"px"}function Pe(e,t=null){if(R&&e!==Se)return;if(R&&Lt)return Dr();const n=c?.cards.find(U=>U.id===e);if(!n)return un();const r=ke()?n:t||N.structuredClone(Ro(n)),o=st(r),i=Z(r);We(r)&&!ro&&Kn().catch(()=>{});const s=b.panel.querySelector(".pbody"),d=s&&b.panel._id===e?s.scrollTop:0;if(b.panel._id=e,b.panel.innerHTML="",b.panel.style.display="",b.panel.style.visibility="",It(r))return ed(r);if(Bt(r))return nd(r);if(ut(r))return td(r);const f=["card_image","card_video","card_tools"].includes(o.id)&&o.modes.length>1;if(o.modes.length>1&&!f){const U=l.createElement("div");U.className="modes";for(const he of o.modes){const Le=l.createElement("button");Le.className=Cn(he,r.cap)?"on":"",Le.textContent=he.name,Lo(Le,()=>Po(r,he,he.name)),Le.onclick=()=>{Kt(),r.cap=Xe(he,Yt(r)),Pe(e),an(r),xe()},U.appendChild(Le)}b.panel.appendChild(U)}if(!i)return b.panel.appendChild(Qo("能力不可用")),Ct();const h=i.id==="image_composite"&&i.execution==="browser",m=We(r)?i:ie[me(r)];let u=m&&m!==i?i.inputs.map(U=>{const he=m.inputs.find(Le=>Le.key===U.key);return he&&he.default!==U.default?{...U,default:he.default}:U}):i.inputs;const y=qt(r);if(y&&y.entry){const U=u.findIndex(he=>Dt.includes(he.type));U>=0&&!r.assets[u[U].key]&&(u=u.slice(),u[U]={...u[U],label:y.entry.label})}const x=l.createElement("div");x.className="pbody",b.panel.appendChild(x);const _=l.createElement("div");if(_.className="knobnote clipboard-media-hint",_.textContent="Ctrl / Cmd + V：粘贴截图或图片 / 视频文件，自动创建素材节点并引用到空槽；不覆盖已有引用。复制文件需浏览器提供文件数据，仅路径文字无法导入。",We(r)&&(_.textContent=Dn?`本机 IF 不可用：${Dn}。请先安装并登录 IF CLI、启动本机桥接，点模型按钮可重试。`:"IF 使用本机账号；支持按模型数量连接多份引用。引用素材各上传一次，返回的 URL 按「图片1」「视频1」写入提示词，与生成需求一次提交；模型由 CLI 参数指定，随后轮询并保存产物。图片超过 10 MB 时优先转无损 WebP，仍超限再压缩；视频超过 50 MB 时自动转码。仅处理上传副本，原素材不变；本机上传合计不超过 100 MB，音频暂不支持。"),ke()&&x.appendChild(_),We(r)){const U=rn.filter(Ie=>Ie.type===i.outputType),he=r.params.if_model||U[0]?.display_name,Le=je(he,i.outputType),qe=l.createElement("div");if(qe.className="knobnote",qe.textContent=`${Le.reference_fallback?"画布兜底引用上限（不代表官方支持）":"画布引用上限"}：图片 ${Le.bridge.image} · 视频 ${Le.bridge.video}。${Le.note} 全部引用上传后的 URL 按「图片1」「视频1」与生成需求一次提交，再轮询产物；是否采用全部引用以 IF 实际返回为准，音频暂不可提交。画面比例、清晰度、时长等参数作为生成内容要求发送，模型不保证严格遵守。`,Object.values(r.assets||{}).some(Ie=>Ie&&Dt.includes(Ie.kind)&&!Le?.bridge?.[Ie.kind])&&(qe.textContent+=" 已连接的引用保持原样，但不适用于当前模型；可切回原模型或手动移除，运行时不会忽略它。"),x.appendChild(qe),Le?.source){const Ie=l.createElement("a");Ie.href=Le.source,Ie.target="_blank",Ie.rel="noopener noreferrer",Ie.textContent="供应商 API 参考文档（不作为 IF 引用上限）",x.appendChild(Ie)}}if(h){_.textContent="浏览器本地合成，不占 GPU。已连接的图片打开编辑器时自动加入图层，也可上传图片或从画布素材中选择添加。拖动位置、缩放图片，在图层列表调整遮挡顺序。";const U=l.createElement("div");U.className="knobnote";const he=r.params.composition;U.textContent=he?`编辑稿：${he.width} × ${he.height} · ${he.layers.length} 个图层。保存编辑可继续修改；合成输出后可连接下游。`:"尚未创建编辑稿。点击下方「编辑合成」开始，默认画布 1920 × 1080，可修改尺寸和背景。",x.appendChild(U)}if(R){const U=Vi(r);if(U.length){const he=l.createElement("div");he.className="director-supplement",he.textContent=`导演补充（只读，提交时追加到提示词）
`+U.join(`
`),x.appendChild(he)}}const j=u.filter(U=>Dt.includes(U.type));if(j.length)if(h){const U=l.createElement("details");U.open=!0;const he=l.createElement("summary");he.textContent="连接图片素材（打开编辑器时自动加入图层）",U.append(he,rs(r,j,y)),x.appendChild(U)}else x.appendChild(rs(r,j,y));if(r.cap==="if_image"){const U=u.find(he=>he.key==="if_reference");U&&x.appendChild(ni(r,U))}const S=new Set;for(const U of j.filter(he=>(r.assets||{})[he.key])){const he=u.filter(Le=>Le.rangeOf===U.key);if(he.length===2){x.appendChild(bd(r,U,he[0],he[1]));for(const Le of he)S.add(Le.key)}}const B=u.filter(U=>U.type==="textarea"&&!U.advanced),be=B.filter(U=>U.template),Ke=B.filter(U=>!U.template),dt=Ke.filter(U=>U.pairWith&&u.some(he=>he.key===U.pairWith));dt.length>1&&x.appendChild(id(r,dt));for(const U of Ke)(!dt.includes(U)||dt.length<2)&&x.appendChild(ts(r,U));for(const U of be)x.appendChild(fd(r,U));const et=u.filter(U=>!Dt.includes(U.type)&&U.type!=="textarea"&&(U.type==="seed"||!U.advanced)&&!U.mirror&&!S.has(U.key)),He=(U,he)=>{if(U.appendChild(ni(r,he)),he.hint&&!he.showHint){const Le=l.createElement("div");Le.className="knobnote",Le.textContent=he.hint,U.appendChild(Le)}},ht=l.createElement("div");ht.className="pwrap";for(const U of et)f||He(ht,U);x.appendChild(ht),r.error&&x.appendChild(Qo(r.error));const zn=zr(r);zn&&x.appendChild(zn);const bt=zo(r);bt&&x.appendChild(bt);const xt=l.createElement("div");if(xt.className="foot",f){const U=o.id==="card_video"?"生视频模式":o.id==="card_tools"?"工具箱模式":"生图模式",he=qt(r)||o.modes[0],Le=fo(`${o.icon} ${he.name}`,U,()=>{const qe=Ie=>({icon:o.icon,text:Ie.name+(Cn(Ie,r.cap)?"（当前）":""),tip:()=>Po(r,Ie,Ie.name),run:()=>{if(We(r)&&["queued","running"].includes(r.status))return ye("请等待本机 IF 任务结束后再切换模式");Kt(),Bn(),gr(r,Xe(Ie,Yt(r))),Pe(e),an(r),xe()}});return o.id==="card_video"||o.id==="card_image"?[{group:"本地 API"},...o.modes.filter(Ie=>Ie.id!=="if_video"&&Ie.id!=="if_image").map(qe),{group:"云端 API"},...o.modes.filter(Ie=>Ie.id==="if_video"||Ie.id==="if_image").map(qe)]:o.modes.map(qe)});if(Lo(Le,()=>Po(r,he,he.name)),xt.appendChild(Le),he.modelSwitch){const qe=Yt(r),Ie=se=>hn[se]||se,re=fo(Ie(qe)||i.name,o.id==="card_image"?"生图模型":"深度视频模型",()=>Object.entries(he.modelSwitch).map(([se,$e])=>({text:Ie(se)+($e===r.cap?"（当前）":""),run:()=>{Kt(),Bn(),gr(r,$e),r._model=se,Pe(e),an(r),xe()}})));xt.appendChild(re)}else if(We(r)){const qe=rn.filter(se=>se.type===i.outputType),Ie=qe.find(se=>se.display_name===r.params.if_model)?.display_name||qe[0]?.display_name,re=fo(Ie||"选择 IF 模型","IF 模型",()=>rn.some(se=>se.type===i.outputType)?rn.filter(se=>se.type===i.outputType).map(se=>({text:se.display_name+(se.display_name===Ie?"（当前）":"")+" · "+kt(se),disabled:["exhausted","unavailable"].includes(se.quota_status),run:()=>{Bn(),r.params.if_model=se.display_name;const $e=r._referenceParameters,we=$e&&r.params.duration===$e.before.duration;De(r),we&&($e.before.duration=r.params.duration),Pe(e),xe()}})):[{text:Dn?"重试连接本机 IF":"正在读取本机 IF 模型…",run:()=>Kn().catch(se=>Ue(se.message))}]);re._openIFModels=re.onclick,re.onclick=async se=>{se.stopPropagation(),$n();const $e=Xo;re.disabled=!0,re.firstChild.textContent="读取剩余次数…";try{await Kn(!1),Xo===$e&&b.panel._id===e&&c?.cards.includes(r)&&b.panel.querySelector('button[title="IF 模型 —— 点击换"]')?._openIFModels(se)}catch(we){Ue("读取 IF 剩余次数失败："+we.message)}finally{re.disabled=!1,re.firstChild.textContent=Ie||"选择 IF 模型"}},xt.appendChild(re)}if(!h){const qe=l.createElement("button");qe.className="tcap";const Ie=gi(r,i);qe.textContent=Ie?`⚙ ${Ie}`:"⚙ 参数",qe.title=We(r)?"点开弹窗：比例、清晰度、时长等以内容发送":"点开弹窗：清晰度、画面比例、时长等参数",qe.dataset.readonlyView="",qe.onclick=re=>{re.stopPropagation(),nl(r,qe)},xt.appendChild(qe)}}const Oe=r.status==="queued"||r.status==="running",ot=l.createElement("span");if(ot.style.cssText="color:#8a8a94;font-size:12px",ot.textContent=h?"本地合成 · 输出 PNG":i.outputType==="video"?"输出：视频":"输出：图片",r.status==="done"&&r.ms>0&&(ot.textContent+=` · 上次 ${kr(r.ms)}`),xt.appendChild(ot),Oe&&r.job&&!We(r)){const U=l.createElement("button");U.className="cancel",U.textContent="取消",U.onclick=()=>kd(r),U.style.marginLeft="auto",xt.appendChild(U)}const Et=l.createElement("button");Et.className="go",Et.textContent=h?"编辑合成":"↑",Et.title=h?"打开图片合成编辑器（不使用 ComfyUI）":"运行",h&&(Et.style.cssText="width:auto;min-width:96px;padding:0 14px;border-radius:8px;font-size:13px;flex-shrink:0"),Et.disabled=Oe,Et.onclick=()=>oi(r),xt.appendChild(Et),b.panel.appendChild(xt),Ct(),x.scrollTop=d,da(r),Qn(r)}function Qo(e){const t=l.createElement("div");return t.className="err",t.textContent=e,t}function ed(e){const t=l.createElement("div");t.className="pbody",b.panel.appendChild(t);const n=l.createElement("div");n.className="pblock";const r=l.createElement("div");r.className="phd";const o=l.createElement("span");o.textContent="风格描述";const i=l.createElement("span");i.className="demo";const s=l.createElement("button");s.textContent="清空",r.append(o,i,s);const d=l.createElement("textarea");d.placeholder="例：蒂姆·波顿式哥特暗黑定格动画质感，冷青灰色调，强侧光硬阴影，胶片颗粒，浅景深，电影级构图",d.value=String((e.params||{}).style||""),d.style.minHeight="120px";const f=()=>{const _=d.value.trim();i.style.display=_?"none":"",i.textContent="⚠ 还没写，挂着也不起作用"},h=()=>{e.params=e.params||{},e.params.style=d.value,f(),at(e),xe()};d.oninput=h,s.onclick=()=>{d.value="",h(),d.focus()},f(),n.append(r,d),t.appendChild(n);const m=c.edges.filter(_=>_.from===e.id&&Ge(_)),u=l.createElement("div");u.className="slinks";const y=l.createElement("div");if(y.className="atitle",y.textContent=m.length?`挂着 ${m.length} 个节点`:"还没挂给任何节点",u.appendChild(y),!m.length){const _=l.createElement("div");_.className="anote",_.textContent="把右边那颗点拖到一张生图/生视频节点上；拖到空白处会列出所有写提示词的玩法。",u.appendChild(_)}for(const _ of m){const j=c.cards.find(Ke=>Ke.id===_.to);if(!j)continue;const S=l.createElement("div");S.className="slink";const B=l.createElement("button");B.className="nm",B.textContent=Ne(j),B.title="选中这个节点（面板上能看到合并后的提示词）",B.onclick=()=>Ht(j.id);const be=l.createElement("button");be.className="off",be.textContent="解除",be.title="这个节点不再套用本风格",be.onclick=()=>uo(_),S.append(B,be),u.appendChild(S)}const x=fr(e);if(x.length){const _=l.createElement("div");_.className="atitle",_.textContent=`顺着连线连带 ${x.length} 张`,u.appendChild(_);for(const j of x){const S=l.createElement("div");S.className="slink down";const B=l.createElement("button");B.className="nm",B.textContent=Ne(j),B.title="选中这个节点（面板上能看到合并后的提示词）",B.onclick=()=>Ht(j.id);const be=l.createElement("span");be.className="off ro",be.textContent="继承",be.title="上游那个节点传下来的，要断就断它们之间那根产物连线",S.append(B,be),u.appendChild(S)}}t.appendChild(u),Ct()}function td(e){const t=l.createElement("div");t.className="pbody",b.panel.appendChild(t);const n=jt(e),r=l.createElement("div");r.className="pblock";const o=l.createElement("div");o.className="phd";const i=l.createElement("span");i.textContent="手里的素材";const s=l.createElement("span");s.className="demo",o.append(i,s),r.appendChild(o);const d=l.createElement("div");d.className="prow";const f=l.createElement("button");if(f.textContent=n?"换一个文件":"选择文件",f.onclick=()=>ti(e),d.appendChild(f),n){const x=l.createElement("button");x.textContent="查看大图",x.onclick=()=>vo(n),x.dataset.readonlyView="",d.appendChild(x)}const h=l.createElement("button");h.textContent="清空",h.title="把这份素材扔掉，节点变回空（不会删文件本身）",h.onclick=()=>{e.outputs=[];for(const x of c.edges.filter(_=>_.from===e.id&&!Ge(_)))_i(x);at(e),At(e),Pe(e.id),xe()},d.appendChild(h),s.textContent=n?(n.origin||n.filename||n.url||"").split(/[\\/]/).pop():"还没有文件",s.title=n&&(n.origin||n.filename||n.url)||"",r.appendChild(d),t.appendChild(r);const m=c.edges.filter(x=>x.from===e.id),u=l.createElement("div");u.className="slinks";const y=l.createElement("div");if(y.className="atitle",y.textContent=m.length?`喂给 ${m.length} 个节点`:"还没喂给任何节点",u.appendChild(y),!m.length){const x=l.createElement("div");x.className="anote",x.textContent=n?"把右边那颗点拖到一个节点上，这份素材就进它的格子。":"先在上面选一个文件，再把出口拖到别的节点上。",u.appendChild(x)}for(const x of m){const _=c.cards.find(be=>be.id===x.to);if(!_)continue;const j=l.createElement("div");j.className="slink";const S=l.createElement("button");S.className="nm",S.textContent=Ne(_),S.title="选中这个节点",S.onclick=()=>Ht(_.id);const B=l.createElement("button");B.className="off",B.textContent="解除",B.title="这个节点不再收这份素材",B.onclick=()=>uo(x),j.append(S,B),u.appendChild(j)}t.appendChild(u),Ct()}const es=[["polish","润色","改得更通顺好读，不加料不改意思"],["optimize","优化","删废话、换具体说法，更精炼有表现力"],["expand","扩写","补细节补过渡，写到 2~3 倍长"],["custom","自定义","按下面写的指令处理文字"]];function nd(e){const t=l.createElement("div");t.className="pbody",b.panel.appendChild(t);const n=e.status==="running";e.params=e.params||{};const r=l.createElement("div");r.className="pblock";const o=l.createElement("div");o.className="phd",o.innerHTML="<span>内容</span>";const i=l.createElement("textarea");if(i.placeholder="在这里写字或直接在节点上写",i.value=String(e.params.text||""),i.disabled=n,i.oninput=()=>{e.params.text=i.value;const x=e._el?e._el.querySelector(".body"):null,_=x?x.querySelector("textarea.ttxt"):null;_&&(_.value=i.value),Ci(e),xe()},r.append(o,i),t.appendChild(r),e.params.op==="custom"){const x=l.createElement("div");x.className="pblock";const _=l.createElement("div");_.className="phd",_.innerHTML="<span>指令</span>";const j=l.createElement("textarea");j.placeholder="例：把接进来的几段整理成一条朋友圈文案，口语一点，带两个 emoji",j.value=String(e.params.instr||""),j.oninput=()=>{e.params.instr=j.value,xe()},x.append(_,j),t.appendChild(x)}const s=c.edges.filter(x=>x.from===e.id&&Ge(x)),d=l.createElement("div");d.className="slinks";const f=l.createElement("div");if(f.className="atitle",f.textContent=s.length?`连着 ${s.length} 个节点`:"还没连给任何节点",d.appendChild(f),!s.length){const x=l.createElement("div");x.className="anote",x.textContent="把右边那颗点拖到生成节点（并进提示词）或别的文本节点（当输入）上；拖到空白处会列出所有能接的地方。",d.appendChild(x)}for(const x of s){const _=c.cards.find(be=>be.id===x.to);if(!_)continue;const j=l.createElement("div");j.className="slink";const S=l.createElement("button");S.className="nm",S.textContent=Ne(_),S.title="选中这个节点",S.onclick=()=>Ht(_.id);const B=l.createElement("button");B.className="off",B.textContent="解除",B.title="这个节点不再用这段文本",B.onclick=()=>uo(x),j.append(S,B),d.appendChild(j)}t.appendChild(d),e.error&&t.appendChild(Qo(e.error));const h=l.createElement("div");h.className="foot",h.appendChild(fo((e.params.model||"api")==="local"?"🖥 本地 27B":"☁ 云端 API","模型",()=>[{icon:"☁",text:"云端 API —— 几秒就回，要配好 llm.json",run:()=>{e.params.model="api",Pe(e.id),xe()}},{icon:"🖥",text:"本地 27B —— 不花钱，占显存，第一次慢",run:()=>{e.params.model="local",Pe(e.id),xe()}}]));const m=x=>x?(es.find(_=>_[0]===x)||[0,x])[1]:"不加工";h.appendChild(fo(m(e.params.op),"加工方式",()=>[{icon:"✍",text:"不加工 —— 就当一个纯文本节点，只存字",run:()=>{e.params.op="",at(e),Pe(e.id),xe()}},...es.map(([x,_,j])=>({icon:"✎",text:`${_} —— ${j}`,run:()=>{e.params.op=x,at(e),Pe(e.id),xe()}}))]));const u=l.createElement("span");if(u.style.cssText="color:#8a8a94;font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap",e._lastRun?u.textContent=(e._lastRun.via==="api"?"上次 ☁":"上次 🖥")+(e._lastRun.ms?` · ${(e._lastRun.ms/1e3).toFixed(1)} 秒`:""):e.params.op?u.textContent="结果写回节点 · 上游改了字，重跑一次就用新的":u.textContent="没选加工方式：这个节点只存字",u.title=u.textContent,h.appendChild(u),typeof e.params._prev=="string"&&e.params._prev!==e.params.text){const x=l.createElement("button");x.className="cancel",x.textContent="↩ 恢复运行前的字",x.title="上一次运行之前的节点上原文（只留这一步）",x.onclick=()=>{e.params.text=e.params._prev,delete e.params._prev,at(e),Pe(e.id),xe()},h.appendChild(x)}const y=l.createElement("button");y.className="go",y.textContent="↑",y.title="运行",y.disabled=n||!e.params.op,y.onclick=()=>oi(e),h.appendChild(y),b.panel.appendChild(h),Ct()}async function rd(e){if(!Ze())return;const t=Lr(e);if(!t)return ye("先在上面选一种加工方式（润色 / 优化 / 扩写 / 自定义）");if(e.status==="running")return ye("文本加工正在进行中，请稍候");e.error=null,e.status="running",e.ms=null,at(e),b.panel._id===e.id&&Pe(e.id);try{const n=Tr(e).map(s=>({name:s.name,text:s.text})),r=pn(e);r&&n.unshift({name:"节点上的原文",text:r});const o=await Tt("/api/text",{op:t,model:(e.params||{}).model||"api",inputs:n,params:{instr:String((e.params||{}).instr||"")},project:c&&c.id,projectName:c&&c.name,card:e.id,cardName:Ne(e)});e.params._prev=String((e.params||{}).text||""),e.params.text=o.text,e.status="done",e.ms=o.ms,e._lastRun=o,xe(),at(e),b.panel._id===e.id&&Pe(e.id);const i=c.edges.filter(s=>s.from===e.id&&Ge(s)).length;ye(od(o)+(i?`
已连给 ${i} 个节点，它们下次运行会用这份新文本`:""))}catch(n){e.status="error",e.error=n.message,Ve.markWorkFailure(n),at(e),b.panel._id===e.id&&Pe(e.id),Ue(n.message)}xe()}function od(e){const t=e.ms>=6e4?`${Math.floor(e.ms/6e4)} 分 ${Math.round(e.ms%6e4/1e3)} 秒`:`${(e.ms/1e3).toFixed(1)} 秒`;return`${e.via==="api"?"✅ 云端 API":"✅ 本地 27B"}，${t}`+(e.warn?`
⚠ ${e.warn}`:"")}function id(e,t){const n=Z(e),r=t.filter(s=>(e.assets||{})[s.pairWith]),o=s=>xn(n.inputs.find(d=>d.key===s.pairWith)||s,e),i=l.createElement("div");if(i.className="ptabs",(e._tab==null||e._tab<0||e._tab>=r.length)&&(e._tab=r.length?0:-1),r.length){const s=l.createElement("div");s.className="tabs",r.forEach((d,f)=>{const h=l.createElement("button"),m=String(e.params[d.key]!=null?e.params[d.key]:d.default||"").trim();h.textContent=o(d)+(m?" ●":""),h.className=f===e._tab?"on":"",h.dataset.readonlyView="",h.onclick=()=>{e._tab=f,Pe(e.id,ke()?null:e)},s.appendChild(h)}),i.appendChild(s),i.appendChild(ts(e,r[e._tab],o(r[e._tab])+" 的提示词"))}else{const s=l.createElement("div");s.className="tabempty",s.textContent="还没有图片引用。添加图片后，这里才显示对应提示词。",i.appendChild(s)}return i}function ts(e,t,n){const r=l.createElement("div");r.className="pblock";const o=t.key==="negative_prompt",i=o?[]:ur(e).map(pn),s=o?[]:Tr(e),d=ie[me(e)]||Z(e),f=!!(d&&d.rewrite&&t.key===(Rt(d)[0]||{}).key),h=f?io(e,t.key):null,m=!!(h&&e.optUse&&e.optUse[t.key]),u=l.createElement("div");u.className="phd";const y=l.createElement("span"),x=i.length+s.length;y.textContent=(n||t.label)+(x&&!m?`（已并入 ${x} 段文本）`:"");const _=l.createElement("span");_.className="demo",_.textContent="⚠ 这是示例文案，改成你要的内容",u.append(y,_),r.appendChild(u),h&&r.appendChild(ad(e,t,m));const j=l.createElement("textarea");j.placeholder=`${n||t.label}：${o?"描述不希望出现的内容":"描述你想要的画面/动作/镜头"}`;const S=e.promptHeights?.[t.key];Number.isFinite(S)&&S>0&&(j.style.height=S+"px");const B=l.createElement("div");B.className="prompt-highlight-wrapper";const be=l.createElement("div");be.className="prompt-highlight-layer",B.appendChild(be),B.appendChild(j);function Ke(){const re=getComputedStyle(j);for(const $e of["fontFamily","fontSize","fontWeight","lineHeight","letterSpacing","wordSpacing","textIndent","paddingTop","paddingRight","paddingBottom","paddingLeft","borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth","boxSizing","width","height"])be.style[$e]=re[$e];be.style.borderStyle="solid",be.style.borderColor="transparent",be.style.whiteSpace="pre-wrap",be.style.overflowWrap=re.overflowWrap,be.style.wordBreak=re.wordBreak||"normal",be.style.top="0px",be.style.left="0px";const se=j.offsetWidth-j.clientWidth;se>0&&(be.style.paddingRight=parseFloat(re.paddingRight)+se+"px")}let dt=m?h:e.params[t.key]!=null?e.params[t.key]:o?t.default??"":"";if(!m&&x>0){const re=[];i.length>0&&i.forEach($e=>{re.push($e)}),s.length>0&&s.forEach($e=>{re.push($e.text)});const se=re.join(`

`);j.value=se+(dt?`

`+dt:`

`)}else j.value=dt;function et(){const re=nt=>nt.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),se=j.value;let $e="",we=0;const ze=/@([\u4e00-\u9fa5\w]+)/g;let Fe;for(;!o&&(Fe=ze.exec(se));)$e+=re(se.slice(we,Fe.index)),$e+=`<mark class="at-mention" data-name="${re(Fe[1])}">${re(Fe[0])}</mark>`,we=Fe.index+Fe[0].length;$e+=re(se.slice(we)),be.innerHTML=$e+`
`,be.scrollTop=j.scrollTop}m&&(j.classList.add("optta"),be.classList.add("opt")),j.addEventListener("wheel",re=>{re.stopPropagation()},{passive:!0}),j.addEventListener("keydown",re=>{if(o||re.isComposing||re.key!=="Backspace"&&re.key!=="Delete"||j.selectionStart!==j.selectionEnd)return;const se=j.selectionStart,$e=/@([\u4e00-\u9fa5\w]+)/g;let we;for(;we=$e.exec(j.value);)if(re.key==="Backspace"?se>we.index&&se<=we.index+we[0].length:se>=we.index&&se<we.index+we[0].length){re.preventDefault(),j.setSelectionRange(we.index,we.index+we[0].length),l.execCommand("delete");return}});let He=null,ht=-1;j.addEventListener("input",()=>{et();const re=j.selectionStart,$e=j.value.substring(0,re).match(/@([\u4e00-\u9fa5\w]*)$/);if($e&&!m&&!o){const we=$e[1].toLowerCase();ht=re-$e[0].length;const ze=[],Fe=new Set(c.edges.filter(Re=>Re.to===e.id).map(Re=>Re.from));c.cards.forEach(Re=>{if(Re.id===e.id||!(ut(Re)||pt(Re)||It(Re)))return;const Je=Ne(Re);if(!Je.toLowerCase().includes(we))return;const Zt=st(Re);ze.push({type:"card",section:"canvas",connected:Fe.has(Re.id),card:Re,name:Je,icon:Zt.icon||"◻",label:ut(Re)?"素材":pt(Re)?"文本":"风格"})});const nt=ie[me(e)]||Z(e);nt&&nt.inputs&&nt.inputs.forEach(Re=>{if(!["image","audio","video"].includes(Re.type))return;const yt=e.assets[Re.key];if(!yt||!yt.ref)return;const Je=xn(Re,e);Je.toLowerCase().includes(we)&&ze.push({type:"slot",section:"current",key:Re.key,name:Je,icon:Re.type==="image"?"🖼":Re.type==="audio"?"🎵":"🎬",label:Qe[Re.type]||"素材"})}),ze.length>0?zn(j,ze):bt()}else bt()});function zn(re,se){bt(),He=l.createElement("div"),He.id="menu",He.className="at-menu",He.style.position="absolute",He.style.maxHeight="280px",He.style.overflowY="auto";const $e=Je=>{const Zt=l.createElement("button");Zt.className="at-menu-item"+(Je.connected?" connected":"");const Vr=l.createElement("span");Vr.className="at-menu-icon",Vr.textContent=Je.icon;const Cr=l.createElement("span");Cr.className="at-menu-name",Cr.textContent=Je.name;const Kr=l.createElement("span");Kr.className="at-menu-type",Kr.textContent=Je.connected?`已连线 · ${Je.label}`:Je.label,Zt.append(Vr,Cr,Kr),Zt.onclick=()=>{const Gr=Je.name,ii=re.value.substring(0,ht),_d=re.value.substring(re.selectionStart);re.value=ii+`@${Gr} `+_d,re.selectionStart=re.selectionEnd=ii.length+Gr.length+2,m?e.opt[t.key]=re.value:e.params[t.key]=Ie(re.value),qe(),xe(),et(),bt(),re.focus()},He.appendChild(Zt)};for(const[Je,Zt]of[["current","当前素材"],["canvas","画布"]]){const Vr=se.filter(Gr=>Gr.section===Je).sort((Gr,ii)=>+!!ii.connected-+!!Gr.connected);if(!Vr.length)continue;const Cr=l.createElement("div");Cr.className="at-menu-group";const Kr=l.createElement("span");Kr.textContent=Zt,Cr.appendChild(Kr),He.appendChild(Cr),Vr.forEach($e)}const we=Et(ht)||(()=>{const Je=re.getBoundingClientRect();return{left:Je.left+8,top:Je.top+8,bottom:Je.top+28}})();l.body.appendChild(He);const ze=He.offsetWidth,Fe=He.offsetHeight;let nt=we.left-6,Re=we.top-Fe-6;Re<8&&(Re=we.bottom+4),nt+ze>innerWidth-8&&(nt=innerWidth-8-ze),nt<8&&(nt=8),He.style.left=nt+"px",He.style.top=Re+"px";const yt=Je=>{(!He||!He.contains(Je.target)&&Je.target!==re)&&(bt(),l.removeEventListener("mousedown",yt))};I(()=>l.addEventListener("mousedown",yt),0)}function bt(){He&&(He.remove(),He=null)}r.appendChild(B),et();const xt=new ee(()=>{if(!j.isConnected){xt.disconnect();return}if(!j.offsetHeight)return;Ke(),be.scrollTop=j.scrollTop;const re=parseFloat(j.style.height);Number.isFinite(re)&&re>0&&re!==e.promptHeights?.[t.key]&&ke()&&(e.promptHeights=e.promptHeights||{},e.promptHeights[t.key]=re,xe())});xt.observe(j),j.addEventListener("scroll",()=>{be.scrollTop=j.scrollTop});let Oe=null;function ot(re,se){const $e=be.querySelectorAll(".at-mention");for(const we of $e){const ze=we.getClientRects();for(const Fe of ze)if(re>=Fe.left&&re<=Fe.right&&se>=Fe.top&&se<=Fe.bottom)return we}return null}function Et(re){const se=[],$e=l.createTreeWalker(be,NodeFilter.SHOW_TEXT);for(;$e.nextNode();)se.push($e.currentNode);let we=0,ze=null,Fe=0;for(const yt of se){if(we+yt.length>re){ze=yt,Fe=re-we;break}we+=yt.length}if(!ze){const yt=se[se.length-1];if(!yt)return null;ze=yt,Fe=yt.length}const nt=l.createRange();nt.setStart(ze,Fe),nt.setEnd(ze,Math.min(Fe+1,ze.length));const Re=nt.getClientRects()[0]||nt.getBoundingClientRect();return Re.width===0&&Re.height===0?null:Re}j.addEventListener("mousemove",re=>{const se=ot(re.clientX,re.clientY);if(j.style.cursor=se?"pointer":"",be.querySelectorAll(".at-mention.mhover").forEach(Fe=>Fe.classList.remove("mhover")),se&&se.classList.add("mhover"),!se)return Le();const $e=se.dataset.name;if(!$e)return;let we=null;const ze=c.cards.find(Fe=>Ne(Fe)===$e);if(ze){const Fe=ze.outputs||[];Fe.length>0?we={type:Fe[0].kind,url:Fe[0].url,name:Ne(ze)}:(pt(ze)||It(ze))&&(we={type:"text",text:pn(ze)||"(空)",name:Ne(ze)})}if(!we){const Fe=ie[me(e)]||Z(e);if(Fe&&Fe.inputs){const nt=Fe.inputs.find(Re=>xn(Re,e)===$e);nt&&e.assets[nt.key]&&(we={type:nt.type,url:e.assets[nt.key].url,name:$e})}}we?he(se,we):Le()}),j.addEventListener("mouseleave",Le),j.addEventListener("scroll",()=>{be.scrollTop=j.scrollTop,be.scrollLeft=j.scrollLeft,Le()});let U=null;function he(re,se){if(Oe&&U===se.name)return;Le(),U=se.name,Oe=l.createElement("div"),Oe.className="at-mention-preview",Oe.style.cssText=`
      position: fixed; z-index: 100; background: #060a14f7; border: 1px solid var(--acc);
      border-radius: 3px; padding: 8px; box-shadow: 0 12px 36px #000d, 0 0 18px #00e5ff2e;
      backdrop-filter: blur(6px); max-width: 320px; pointer-events: none;
    `;const $e=l.createElement("div");if($e.style.cssText="font-size: 11px; color: var(--acc); margin-bottom: 6px; letter-spacing: 1px;",$e.textContent=se.name,Oe.appendChild($e),se.type==="image"){const ze=l.createElement("img");ze.src=se.url,ze.style.cssText="max-width: 300px; max-height: 200px; display: block; border-radius: 2px;",Oe.appendChild(ze)}else if(se.type==="video"){const ze=l.createElement("video");xo(ze,se.url),ze.style.cssText="max-width: 300px; max-height: 200px; display: block; border-radius: 2px;",ze.muted=!0,ze.autoplay=!0,ze.loop=!0,Oe.appendChild(ze)}else if(se.type==="audio"){const ze=l.createElement("div");ze.textContent="🎵 "+se.name,ze.style.cssText="padding: 12px; color: var(--txt); text-align: center;",Oe.appendChild(ze)}else if(se.type==="text"){const ze=l.createElement("div");ze.textContent=se.text.substring(0,200)+(se.text.length>200?"...":""),ze.style.cssText="color: var(--txt); font-size: 12px; line-height: 1.6; max-height: 150px; overflow: hidden;",Oe.appendChild(ze)}const we=re.getBoundingClientRect();Oe.style.left=we.left+"px",Oe.style.top=we.bottom+4+"px",l.body.appendChild(Oe)}function Le(){U=null,Oe&&(Oe.remove(),Oe=null)}const qe=()=>{const re=!o&&!m&&!!t.default&&j.value.trim()===String(t.default).trim();_.style.display=re?"":"none",j.classList.toggle("isdemo",re),be.classList.toggle("demo",re)},Ie=re=>{if(!re)return"";if(!x)return re.trim();const se=[];i.length>0&&i.forEach(we=>se.push(we)),s.length>0&&s.forEach(we=>se.push(we.text));const $e=se.join(`

`);return re.startsWith($e)?re.substring($e.length).trim().replace(/^\n+/,""):re.trim()};if(j.oninput=()=>{m?e.opt[t.key]=j.value:e.params[t.key]=Ie(j.value),qe(),xe()},qe(),f||!m){const re=l.createElement("div");re.className="ptoolbar";const se=!!e._rwBusy,$e=e.params._promptModel||"api",we=l.createElement("button");we.className="tbtool model";const ze=l.createElement("span");ze.textContent=$e==="local"?"🖥 本地":"☁ 云端";const Fe=l.createElement("i");Fe.textContent="▾",we.append(ze,Fe),we.title="模型 —— 点击换",we.onclick=Je=>{Je.stopPropagation();const Zt=we.getBoundingClientRect();Ot(Zt.left,Zt.bottom+4,"模型",[{icon:"☁",text:"云端 API —— 几秒就回，要配好 llm.json",run:()=>{e.params._promptModel="api",xe(),Nn(e)}},{icon:"🖥",text:"本地 27B —— 不花钱，占显存，第一次慢",run:()=>{e.params._promptModel="local",xe(),Nn(e)}}])},re.appendChild(we);const nt=l.createElement("button");nt.className="tbtool",nt.textContent="🌐 翻译",nt.disabled=se,nt.title="中→英 / 英→中 自动判断（有道翻译）",nt.onclick=()=>ld(e,t),re.appendChild(nt);const Re=l.createElement("div");Re.style.cssText="display: flex; gap: 4px; margin-left: auto;";const yt=l.createElement("button");if(yt.className="tbtool",yt.textContent=m?"扔掉这份":"清空",yt.title=m?"删掉优化结果，切回你自己写的原词（原词一直没被动过）":"清空提示词",yt.onclick=()=>{if(m)return delete e.opt[t.key],delete e.optUse[t.key],e.optStyle&&delete e.optStyle[t.key],xe(),Nn(e);if(e.params[t.key]="",!m&&x>0){const Je=[];i.length>0&&i.forEach(Zt=>{Je.push(Zt)}),s.length>0&&s.forEach(Zt=>{Je.push(Zt.text)}),j.value=Je.join(`

`)}else j.value="";qe(),j.focus(),xe()},Re.appendChild(yt),f){const Je=l.createElement("button");Je.className="tbtool opt",Je.textContent=se?"⏳ 优化中…":"✨ 优化",Je.disabled=se,Je.title="优化提示词：融入风格、补充细节"+(h?`
已有优化结果，再点会覆盖`:"")+`
接入的文本节点会一起融进结果`,Je.onclick=()=>pd(e,t,$e),Re.appendChild(Je)}re.appendChild(Re),r.appendChild(re)}if(e._rwErr&&e._rwErr.key===t.key){const re=l.createElement("div");re.className="rwerr",re.textContent="操作失败："+e._rwErr.msg,r.appendChild(re)}return r}function ad(e,t,n){const r=l.createElement("div");r.className="opttabs";const o=(h,m,u)=>{const y=l.createElement("button");return y.className=h?"on":"",y.textContent=m,y.title=u,y.onclick=()=>{e.optUse=e.optUse||{},e.optUse[t.key]=m!=="原词",xe(),Nn(e)},y},i=mr(e).join(`

`),s=e.optStyle&&e.optStyle[t.key]||"",d=i!==s;r.append(o(!n,"原词","你自己写的那段。生成时"+(i?"会在前面拼上接入的文本节点":"原样提交")),o(n,"✨优化后","大模型优化出来的那段，已经是这个模型认的格式。"+(s?`
接入的文本已经融在里面了，生成时不再另外拼`:"")+`
原样提交`));const f=l.createElement("span");return f.className="note",n?d?(f.className="note bad",f.textContent="⚠ "+(s?i?"风格节点换过了，这份里还是旧的":"风格节点摘了，这份里还留着它":"风格节点是优化之后挂的，这份里没有它")+" —— 点「重新优化」",f.title="优化结果是一段写死的文字，风格在优化那一刻就烙进去了，之后改风格节点不会让它跟着变。要么重新优化一次，要么切回「原词」。"):f.textContent=i?"已含接入的文本，提交时不再另拼":"按模型认的格式写好了，原样提交":f.textContent=i?"提交时会拼上接入的文本":"",r.appendChild(f),r}const Nn=e=>{b.panel._id===e.id&&Pe(e.id)};function sd(e){const t=e.ms>=6e4?`${Math.floor(e.ms/6e4)} 分 ${Math.round(e.ms%6e4/1e3)} 秒`:`${(e.ms/1e3).toFixed(1)} 秒`;return`${e.fallback?`⚠ API 没通（${e.fallback}），本地 27B 兜的`:e.via==="api"?`✅ API 改的（${e.model||"远程"}）`:"✅ 本地 27B 改的"}，${t}`+(e.warn?`
⚠ `+e.warn:"")}function ld(e,t){return fn(dd(e,t))}async function dd(e,t){if(!Ze())return;if(e._rwBusy)return ye("翻译正在进行中，请稍候");const n=!!(e.optUse&&e.optUse[t.key]),r=n&&e.opt&&e.opt[t.key]?String(e.opt[t.key]):String(e.params[t.key]!=null?e.params[t.key]:t.default||"");if(!r.trim())return ye("先写点内容再翻译");e._rwBusy=!0,e._rwErr=null,Nn(e);try{const o=await Tt("/api/text",{op:"translate",model:"youdao",inputs:[{name:"原文",text:r}],params:{},project:c&&c.id,projectName:c&&c.name,card:e.id,cardName:Ne(e)});n?(e.opt=e.opt||{},e.opt[t.key]=o.text):e.params[t.key]=o.text,xe(),e._rwBusy=!1,Nn(e),ye(`翻译完成 · ${(o.ms/1e3).toFixed(1)} 秒 · ${o.model||"翻译服务"}`+(o.warn?`
${o.warn}`:""))}catch(o){e._rwBusy=!1,e._rwErr={key:t.key,msg:o.message},Ve.markWorkFailure(o),Nn(e),Ue("翻译失败："+o.message)}}function Yi(e,t){if(!e||!c)return e;const n=ie[me(t)]||Z(t);if(!n)return e;const r=new Map;let o=1,i=1,s=1;for(const d of n.inputs||[]){const f=t.assets[d.key];if(!f||!f.ref)continue;const h=xn(d,t);d.type==="image"?r.set(h,`<Picture ${o}>`):d.type==="audio"?r.set(h,`<Audio ${i}>`):d.type==="video"&&r.set(h,`<Video ${s}>`);const m=c.cards.find(u=>(u.outputs||[]).some(y=>y.url&&f.url&&y.url===f.url||y.filename&&f.filename&&y.filename===f.filename));if(m){const u=Ne(m);d.type==="image"?(r.set(u,`<Picture ${o}>`),o++):d.type==="audio"?(r.set(u,`<Audio ${i}>`),i++):d.type==="video"&&(r.set(u,`<Video ${s}>`),s++)}else d.type==="image"?o++:d.type==="audio"?i++:d.type==="video"&&s++}return e.replace(/@([\u4e00-\u9fa5\w]+)/g,(d,f)=>{const h=r.get(f);if(h)return h;const m=c.cards.find(u=>Ne(u)===f);return m&&(pt(m)||It(m))&&pn(m)||d})}function cd(e){const t={},n=ie[me(e)]||Z(e);if(!n)return t;for(const r of n.inputs||[]){const o=e.assets[r.key];if(!o||!o.ref)continue;const i=c.cards.find(s=>(s.outputs||[]).some(d=>d.url&&o.url&&d.url===o.url||d.filename&&o.filename&&d.filename===o.filename));i?t[r.key]=Ne(i):t[r.key]=xn(r,e)}return t}function pd(e,t,n){return fn(ud(e,t,n))}async function ud(e,t,n){if(!Ze())return;const r=ie[me(e)]||Z(e);if(!r||!r.rewrite)return;if(e._rwBusy)return ye("优化正在进行中，请稍候");const o=String(e.params[t.key]!=null?e.params[t.key]:t.default||""),i=mr(e);if(!o.trim()&&!i.length)return ye("先写一句你想要什么，优化才有东西可改");const s=Yi(o,e);e._rwBusy=!0,e._rwErr=null,Nn(e);try{await hi(e);const d=Ki(e),f=await Tt("/api/rewrite",{capability:r.id,params:d.params,assets:d.assets,prompt:s,style:i.join(`

`),model:n||"auto",cardInfo:cd(e),project:c&&c.id,projectName:c&&c.name,card:e.id,cardName:Ne(e)});console.log("=== /api/rewrite 返回数据 ==="),console.log(JSON.stringify(f,null,2)),console.log("=== r.text 内容 ==="),console.log(f.text),console.log("=========================");let h=f.text||"";h=h.replace(/^[\s\S]*?<\/think>/i,""),h=h.replace(/^[\s\S]*?<\/thinking>/i,""),h=h.replace(/^[\s\S]*?<\/thought>/i,""),h=h.trim(),e.opt=e.opt||{},e.optUse=e.optUse||{},e.optStyle=e.optStyle||{},e.opt[t.key]=h,e.optUse[t.key]=!0,e.optStyle[t.key]=i.join(`

`),xe(),ye(sd(f))}catch(d){e._rwErr={key:t.key,msg:d.message},Ve.markWorkFailure(d),Ue("优化失败："+d.message)}e._rwBusy=!1,Nn(e)}function fd(e,t){const n=l.createElement("div");n.className="tpl";const r=l.createElement("button");r.className="tplhd",r.dataset.readonlyView="";const o=l.createElement("div");o.style.display="none";const i=l.createElement("textarea");i.value=e.params[t.key]!=null?e.params[t.key]:t.default||"";const s=()=>{const h=i.value.trim()!==String(t.default||"").trim(),m=o.style.display!=="none";r.textContent=`${m?"▾":"▸"} ${t.label}`+(h?"（已被改过，出片结构可能跑偏）":"（预设，默认不用动）"),r.classList.toggle("dirty",h),f.style.display=h?"":"none"};r.onclick=()=>{o.style.display=o.style.display==="none"?"":"none",s()};const d=l.createElement("div");d.className="tplnote",d.textContent="⚠ "+(t.note||"预设参数，改了会影响出片。");const f=l.createElement("button");return f.className="tplrst",f.textContent="恢复预设",f.onclick=()=>{i.value=t.default||"",e.params[t.key]=i.value,s(),xe()},i.oninput=()=>{e.params[t.key]=i.value,s(),xe()},o.append(d,i,f),s(),n.append(r,o),n}function an(e){if(!e._el)return;const t=e._el.querySelector(".ch .t");t.textContent=Ne(e),t.classList.toggle("named",!!e.name),At(e),ns(e)}function At(e){po(e);const t=e._el&&e._el.querySelector(".cf .kt");if(!t)return;if(It(e)){t.dataset.kind="style",t.textContent="🎨 只加提示词",t.title="这个节点不生成任何东西：把它的出口拖到生图/生视频节点上，提交时这段风格会并进那个节点的提示词";return}if(Bt(e)){t.style.display="",t.dataset.kind="text",t.textContent="✍ 文本",t.title=Lr(e)?"选了加工方式：点「↑ 运行」把接进来的文本加工后写回这个节点":"存一段文字：连到生成节点就并进提示词，连到别的文本节点就当它的输入；在面板里选加工方式可以让大模型来加工";return}if(ut(e)){const u=jt(e);t.style.display="",t.dataset.kind=u?u.kind:"both";const y=u&&u.width&&u.height?` ${u.width}×${u.height}`:"";t.textContent=u?`📎 ${Qe[u.kind]||u.kind}${y}`:"📎 空的",t.title=u?`${u.origin||""}
把右边的出口拖到别的节点 → 这份素材就进那个节点的格子里`:"点这个节点选一个文件（图片 / 视频 / 音频都收）";const x=e._el.querySelector(".body");!u&&x&&x.querySelector(".ph")&&(x.innerHTML=Br(e));return}const n=qt(e),r=Ca(e),o=ka(e);t.dataset.kind=r?"both":o;const i=(e.outputs||[])[0],s=i&&i.width&&i.height?` ${i.width}×${i.height}`:"";t.textContent=r?"🖼🎬 跟素材":o==="video"?`🎬 视频${s}`:`🖼 图片${s}`;const d=((Z(e)||{}).inputs||[]).filter(u=>Dt.includes(u.type)),f=n&&n.route?Object.keys(n.route):[...new Set(d.map(u=>u.type))],h=[...new Set(d.filter(u=>u.required).map(u=>u.type))];t.title=(r?"放图片就出图片、放视频就出视频":`这个节点出${Qe[o]}`)+(h.length?`；必需${h.map(u=>Qe[u]||u).join(" / ")}素材`:f.length?`；可引用${f.map(u=>Qe[u]||u).join(" / ")}素材`:"；不用素材");const m=e._el.querySelector(".body");!pt(e)&&m&&m.querySelector(".ph")&&(m.innerHTML=Br(e))}function ns(e){const t=e._el&&e._el.querySelector(".inport");if(!t)return;const n=qt(e),r=Z(e);if(ut(e)){t.style.display="none";return}const o=Bt(e),i=n&&n.route?Object.keys(n.route):[...new Set((r?r.inputs:[]).filter(d=>Dt.includes(d.type)).map(d=>d.type))];if(!i.length&&!o){t.style.display="none";return}const s=!pt(e)&&Rt(r).length;t.style.display="",t.title=o?"文本节点的出口拖到这里：接进来的文字都是这段加工的输入（按连线顺序）":i.length?`上游节点的产物拖到这里（收${i.map(d=>Qe[d]||d).join(" / ")}${s?"，也收文本节点":""}）`:"文本节点的出口拖到这里"}const Ji="application/x-chouka-image-slot";function md(e,t,n,r){const o=t.map(y=>y.key),i=o.indexOf(n),s=o.indexOf(r);if(i<0||s<0||i===s)return!1;const d=o.map(y=>({key:y,asset:e.assets[y]})),[f]=d.splice(i,1);d.splice(s,0,f);const h=Object.fromEntries(d.map((y,x)=>[y.key,o[x]]));d.forEach((y,x)=>{e.assets[o[x]]=y.asset});const m=Z(e),u=new Map((m&&m.inputs||[]).filter(y=>y.pairWith).map(y=>[y.pairWith,y.key]));if(o.every(y=>u.has(y))){const y=d.map((_,j)=>({from:u.get(_.key),to:u.get(o[j])}));for(const _ of[e.params,e.opt,e.optUse,e.optStyle]){if(!_)continue;const j=y.map(S=>({to:S.to,has:Object.prototype.hasOwnProperty.call(_,S.from),value:_[S.from]}));for(const S of y)delete _[S.to];for(const S of j)S.has&&(_[S.to]=S.value)}const x=o.filter(_=>u.has(_));Number.isInteger(e._tab)&&x[e._tab]&&(e._tab=x.indexOf(h[x[e._tab]]))}for(const y of c&&c.edges||[])y.to!==e.id||Ge(y)||(h[y.slot]&&(y.slot=h[y.slot]),Array.isArray(y.slots)&&(y.slots=y.slots.map(x=>h[x]||x)));return!0}function hd(e,t,n,r){if(r.length<2)return;n.draggable=!0,n.classList.add("sortable"),n.title+=`
拖拽可调整图片顺序`;const o=i=>Array.from(i.dataTransfer&&i.dataTransfer.types||[]).includes(Ji);n.ondragstart=i=>{if(!Ze())return i.preventDefault();n._skipClick=!0,i.dataTransfer.effectAllowed="move",i.dataTransfer.setData(Ji,t.key),V(()=>n.classList.add("dragging"))},n.ondragenter=i=>{o(i)&&(i.preventDefault(),i.stopPropagation(),n.classList.add("drop-target"))},n.ondragover=i=>{o(i)&&(i.preventDefault(),i.stopPropagation(),i.dataTransfer.dropEffect="move")},n.ondragleave=i=>{n.contains(i.relatedTarget)||n.classList.remove("drop-target")},n.ondrop=i=>{if(!o(i))return;i.preventDefault(),i.stopPropagation(),n.classList.remove("drop-target");const s=i.dataTransfer.getData(Ji);md(e,r,s,t.key)&&(At(e),tt(),Vt(),Pe(e.id),xe())},n.ondragend=()=>{n.classList.remove("dragging","drop-target"),I(()=>{n._skipClick=!1},0)}}function rs(e,t,n){const r=Z(e),o=l.createElement("div");o.className="slots refs";const i=t.filter(u=>(e.assets||{})[u.key]),s=n&&n.route,d=[...new Set(t.map(u=>u.type))],f=l.createElement("div");if(f.className="refhead",s)f.textContent="引用上限：素材 1 个";else{const u=[];for(const y of d){const x=rr(r,y);x&&u.push(`${Qe[y]||y} ${x}`)}f.textContent=u.length?`引用上限：${u.join(" · ")}`:"当前模型不支持画布素材引用"}o.appendChild(f);const h=i.filter(u=>u.type==="image");for(const u of i){const y=gd(e,u);u.type==="image"&&hd(e,u,y,h),o.appendChild(y)}const m=l.createElement("div");if(m.className="refadds",s){if(!i.length&&t.length){const u=l.createElement("button");u.className="refadd",u.textContent="＋ 添加素材（0/1）",u.title="可引用图片或视频，上限 1 个",u.onclick=()=>ei(e,t[0]),m.appendChild(u)}}else for(const u of d){const y=rr(r,u),x=i.filter(S=>S.type===u).length,_=t.find(S=>S.type===u&&!(e.assets||{})[S.key]);if(!y||x>=y||!_)continue;const j=l.createElement("button");j.className="refadd",j.textContent=`＋ 添加${Qe[u]||u}（${x}/${y}）`,j.title=`${Qe[u]||u}引用上限 ${y}`,j.onclick=()=>ei(e,_),m.appendChild(j)}return m.childElementCount&&o.appendChild(m),o}function gd(e,t){const n=e.assets[t.key],r=l.createElement("div");r.className="slot"+(n?" filled":t.required?" req":""),r.dataset.key=t.key,r.title=(t.hint||xn(t,e))+(t.required?"（必填）":"")+(n?`
单击预览；右键更换、下载或清空素材`:`
单击上传素材`),r.innerHTML='<div class="box"></div><span class="lbl"></span>',r.querySelector(".lbl").textContent=xn(t,e);const o=r.querySelector(".box");return n?(o.innerHTML=n.kind==="image"?`<img src="${n.url}" draggable="false">`:n.kind==="video"?`<video data-video-url="${n.url}" muted draggable="false"></video>`:"🎵",Ja(o)):o.textContent=t.type==="audio"?"🎵":t.type==="video"?"🎬":ca(t)?"田":"＋",r.onclick=()=>{if(!r._skipClick)return n?vo(n):ei(e,t)},r.oncontextmenu=i=>{i.stopPropagation(),i.preventDefault(),n&&Ot(i.clientX,i.clientY,n.origin||xn(t,e),[{icon:"⛶",text:n.kind==="image"?"查看大图":"放大播放",run:()=>vo(n)},{icon:"↻",text:"更换素材",run:()=>ei(e,t)},{icon:"↓",text:"下载素材",run:()=>go({...n,filename:n.origin||n.filename||n.url})},{icon:"✕",text:"清空这一格",danger:!0,run:()=>{delete e.assets[t.key],Sa(e.id,t.key),At(e),tt(),Vt(),Pe(e.id),xe()}}])},r}const os=e=>{const t=String(e??"").split(":"),n=t.length>1?+t[0]*60+ +t[1]:+t[0];return Number.isFinite(n)?Math.max(0,Math.round(n)):0},Co=e=>`${Math.floor(e/60)}:${String(Math.round(e)%60).padStart(2,"0")}`;function bd(e,t,n,r){const o=l.createElement("div");o.className="arange";const i=l.createElement("div");i.className="atitle",i.textContent="用音频的哪一段",o.appendChild(i);const s=e.assets[t.key];if(!s){const Oe=l.createElement("div");return Oe.className="anote",Oe.textContent=`先在上面的「${xn(t,e)}」传一段音频，这里就能试听、拖着选要用的一段。`,o.appendChild(Oe),o}const d=l.createElement("audio");d.src=s.url,d.preload="metadata",o.appendChild(d);const f=l.createElement("div");f.className="atrack",f.innerHTML='<div class="asel"></div><div class="ahead"></div><div class="ahd s" title="拖动：选段从这里开始"></div><div class="ahd e" title="拖动：选段到这里结束"></div>';const h=f.querySelector(".asel"),m=f.querySelector(".ahead"),u=f.querySelector(".ahd.s"),y=f.querySelector(".ahd.e");o.appendChild(f);const x=l.createElement("div");x.className="aout",o.appendChild(x);const _=l.createElement("div");_.className="abtn",o.appendChild(_);const j=l.createElement("div");j.className="anote",j.textContent="点条子上任意位置就从那儿开始听；听到该起／该停的地方，按下面两个按钮把边界钉在那里。",o.appendChild(j);let S=os(e.params[n.key]!=null?e.params[n.key]:n.default),B=os(e.params[r.key]!=null?e.params[r.key]:r.default);const be=()=>Math.floor(d.duration)||Math.max(B,1);function Ke(Oe,ot){const Et=be();if(Oe=Math.max(0,Math.min(Math.round(Oe),Et-1)),ot=Math.max(Oe+1,Math.min(Math.round(ot),Et)),Oe===S&&ot===B)return xt();S=Oe,B=ot,e.params[n.key]=Co(S),e.params[r.key]=Co(B),xt(),xe()}d.onloadedmetadata=()=>Ke(S,B);let dt=0;const et=(Oe,ot)=>{dt=ot,d.currentTime=Oe,d.play()};d.ontimeupdate=()=>{dt&&d.currentTime>=dt&&d.pause(),xt()},d.onplay=d.onpause=d.onended=()=>xt();const He=(Oe,ot,Et)=>{const U=l.createElement("button");return U.textContent=Oe,U.title=ot,U.onclick=Et,_.appendChild(U),U},ht=He("▶ 试听选段","只放选中的这一段",()=>d.paused?et(S,B):d.pause());He("▶ 整条","从头放到尾，用来找该从哪儿起",()=>et(0,0)),He("⇤ 起点钉在这","把选段开头挪到当前播放位置",()=>Ke(Math.floor(d.currentTime),B)),He("终点钉在这 ⇥","把选段结尾挪到当前播放位置",()=>Ke(S,Math.ceil(d.currentTime)));const zn=Oe=>{const ot=f.getBoundingClientRect();return Math.max(0,Math.min(1,(Oe.clientX-ot.left)/ot.width))*be()},bt=Oe=>ot=>{ot.stopPropagation(),ot.preventDefault();const Et=he=>Oe==="s"?Ke(zn(he),B):Ke(S,zn(he)),U=()=>{N.removeEventListener("mousemove",Et),N.removeEventListener("mouseup",U)};N.addEventListener("mousemove",Et),N.addEventListener("mouseup",U)};u.onmousedown=bt("s"),y.onmousedown=bt("e"),f.onmousedown=Oe=>{Oe.stopPropagation(),d.currentTime=zn(Oe),xt()};function xt(){const Oe=be(),ot=Et=>Math.max(0,Math.min(Et,Oe))/Oe*100+"%";h.style.left=ot(S),h.style.width=(Math.min(B,Oe)-S)/Oe*100+"%",u.style.left=ot(S),y.style.left=ot(B),m.style.left=ot(d.currentTime),x.textContent=`${Co(S)} → ${Co(B)}　选中 ${B-S} 秒`+(d.duration?`　（整条 ${Co(Math.floor(d.duration))}）`:""),ht.textContent=d.paused?"▶ 试听选段":"⏸ 停"}return xt(),o}function ei(e,t){if(!Ze())return;const n=qt(e),r=n&&n.route&&Object.keys(n.route).length>1&&Object.values(n.route).some(o=>o.slot===t.key);b.picker.accept=r?Object.keys(n.route).map(o=>`${o}/*`).join(","):t.type==="audio"?"audio/*":t.type==="video"?"video/*":"image/*",b.picker.onchange=()=>fn((async()=>{const o=b.picker.files[0];if(b.picker.value="",!!o)try{on(e,t,await dn(o,Z(e)?.execution==="browser")),Pe(e.id),xe()}catch(i){Ve.markWorkFailure(i),Ue("上传失败："+i.message)}})()),b.picker.click()}function ti(e,t){Ze()&&(b.picker.accept="image/*,video/*,audio/*",b.picker.onchange=()=>fn((async()=>{const n=b.picker.files[0];if(b.picker.value="",!!n)try{const r=await dn(n);t?await t(r):await _o(e,r)}catch(r){Ve.markWorkFailure(r),Ue("上传失败："+r.message)}})()),b.picker.click())}async function _o(e,t,n=!0){if(!Ze()||!c.cards.includes(e))return;e.outputs=[{...t,filename:(t.origin||t.url).split(/[\\/]/).pop()}],delete e.w,delete e.h,Xn(e),at(e),an(e),n&&Pe(e.id),tt(),xe();const r=c.edges.filter(o=>o.from===e.id&&!Ge(o));for(const o of r){const i=c.cards.find(s=>s.id===o.to);if(!(!i||!i.assets)){for(const s of wn(o))i.assets[s]=JSON.parse(JSON.stringify(e.outputs[0]));Qn(i),At(i)}}if(t.kind==="image"){const o=new Image;o.onload=()=>{if(!c?.cards.includes(e)||e.outputs[0]?.url!==t.url)return;const i=o.naturalWidth,s=o.naturalHeight;e.outputs[0].width=i,e.outputs[0].height=s,At(e),xe()},o.src=t.url}else if(t.kind==="video"){const o=l.createElement("video");o.onloadedmetadata=()=>{if(!c?.cards.includes(e)||e.outputs[0]?.url!==t.url)return;const i=o.videoWidth,s=o.videoHeight;e.outputs[0].width=i,e.outputs[0].height=s,At(e),xe()},xo(o,t.url)}}function xd(){Ze()&&c&&ti(null,e=>{const t=ji(),n=vn("card_asset",t.x,t.y);n&&(_o(n,e),ye(`已放进一个素材节点（${Qe[e.kind]||e.kind}）：把它右边那颗点拖到生图/生视频/工具节点上，这份素材就进那个节点的格子`))})}function ni(e,t){const n=l.createElement("div");n.className="row";const r=l.createElement("label");r.textContent=t.label,r.title=t.hint||t.label,n.appendChild(r);const o=e.params[t.key]!=null?e.params[t.key]:t.type==="seed"?-1:t.default;if(We(e)&&t.key==="duration"){const i=l.createElement("input");i.type="number",i.min=t.min,t.max!=null&&(i.max=t.max),i.step=1,i.required=!0,i.value=o,i.style.width="72px";const s=t.max!=null?l.createElement("input"):null;s&&(s.type="range",s.min=t.min,s.max=t.max,s.step=1,s.value=o,s.oninput=()=>{i.value=s.value,e.params.duration=Number(s.value),xe()},n.appendChild(s)),i.oninput=()=>{e.params.duration=i.value===""?"":Number(i.value),s&&(s.value=i.value),xe()},i.onchange=()=>{De(e),i.value=e.params.duration,s&&(s.value=i.value),xe()},n.appendChild(i)}else if(t.type==="slider"){const i=l.createElement("input");i.type="range",i.min=t.min!=null?t.min:1,i.max=t.max!=null?t.max:30,i.step=t.step||1;const s=ie[me(e)]||Z(e),d=Zs(e,s);if(t.key==="duration"&&d&&!s.inputs.some(m=>m.key==="preview_seconds")){const m=[+d.duration,+o].filter(u=>Number.isFinite(u)&&u>0);i.min=Math.min(+i.min,...m),i.max=Math.max(+i.max,...m),i.step="any"}const f=l.createElement("input");f.type="number",f.min=i.min,f.max=i.max,f.step=i.step,f.style.width="72px",i.value=f.value=o??i.min;const h=m=>{i.value=f.value=m,e.params[t.key]=parseFloat(m),xe()};i.oninput=()=>h(i.value),f.oninput=()=>h(f.value),n.appendChild(i),n.appendChild(f)}else if(t.type==="seed"){const i=l.createElement("input");i.type="number",i.style.flex="1",i.value=o??-1,i.oninput=()=>{e.params[t.key]=i.value===""?-1:parseInt(i.value),xe()};const s=l.createElement("button");s.className="dice",s.textContent="🎲 随机",s.title="-1 = 每次随机",s.onclick=()=>{i.value=-1,e.params[t.key]=-1,xe()},n.appendChild(i),n.appendChild(s)}else if(t.type==="textarea"){const i=l.createElement("textarea");i.style.flex="1",i.style.minHeight="48px",i.value=o??"",i.oninput=()=>{e.params[t.key]=i.value,xe()},n.appendChild(i)}else if(t.type==="select"&&t.appearance==="switch"){const i=l.createElement("button");i.type="button",i.className="param-switch",i.id=`param-${e.id}-${t.key}`,r.htmlFor=i.id,i.setAttribute("role","switch"),i.setAttribute("aria-label",t.label);const s=l.createElement("span");s.className="param-switch-track",s.setAttribute("aria-hidden","true");const d=l.createElement("span");d.className="param-switch-thumb",s.appendChild(d);const f=l.createElement("span");f.className="param-switch-state",f.setAttribute("aria-hidden","true"),i.append(s,f);const h=()=>{const m=(e.params[t.key]??t.default)==="on";i.setAttribute("aria-checked",String(m)),f.textContent=m?"开启":"关闭"};i.onclick=()=>{e.params[t.key]=i.getAttribute("aria-checked")==="true"?"off":"on",h(),xe()},h(),n.appendChild(i)}else if(t.type==="select"&&t.options){const i=l.createElement("select");i.style.flex="1";for(const s of t.options){const d=l.createElement("option");d.value=typeof s=="object"?s.value:s,d.textContent=typeof s=="object"?s.label:s,i.appendChild(d)}o!=null&&(i.value=o),i.onchange=()=>{e.params[t.key]=i.value,xe(),t.key==="aspect_ratio"&&Pe(e.id)},n.appendChild(i)}else{const i=l.createElement("input");i.type=t.type==="number"?"number":"text",t.min!=null&&(i.min=t.min),t.max!=null&&(i.max=t.max),i.value=o??"",i.style.flex="1",i.oninput=()=>{e.params[t.key]=i.type==="number"?i.value===""?"":parseFloat(i.value):i.value,xe()},n.appendChild(i)}if(t.warnAbove!=null&&t.warning){const i=l.createElement("div");i.className="paramwarn";const s=()=>{const d=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default);i.hidden=!isFinite(d)||d<=t.warnAbove,i.textContent=t.warning};for(const d of n.querySelectorAll("input, select"))d.addEventListener("input",s),d.addEventListener("change",s);s(),n.appendChild(i)}if(t.showHint&&t.hint){const i=l.createElement("div");i.className="knobnote",i.id=`param-${e.id}-${t.key}-hint`,i.textContent=t.hint;const s=[...n.querySelectorAll("input, select, textarea, button")];for(const[d,f]of s.entries())f.id=`param-${e.id}-${t.key}-${d}`,f.setAttribute("aria-describedby",i.id),f.setAttribute("aria-label",t.label+(d?"数值":""));s.length&&(r.htmlFor=s[0].id),n.appendChild(i)}return(t.key==="megapixels"||t.key==="scale_to_length")&&wd(e,t,n),t.key==="frame_load_cap"&&yd(e,t,n),n}async function yd(e,t,n){const r=Object.values(e.assets||{}).find(f=>f&&f.kind==="video"),o=l.createElement("span");o.className="resout";const i=l.createElement("div");if(i.className="resline",i.appendChild(o),n.appendChild(i),!r){o.textContent="放进视频后这里显示总帧数";return}let s="读取总帧数…";const d=()=>{if(!r.frames){o.textContent=s;return}const f=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default)||0;o.textContent=`这段共 ${r.frames} 帧`+(r.fps?` · ${(+r.fps).toFixed(0)} fps · ${(+r.duration).toFixed(1)} 秒`:"")+(f>0&&f<r.frames?` → 只跑前 ${f} 帧`:" → 整段都跑")};d();for(const f of n.querySelectorAll("input"))f.addEventListener("input",d);if(!r.frames){try{Object.assign(r,await vt("/api/media?ref="+encodeURIComponent(r.ref)+"&project="+encodeURIComponent(c.id))),r.frames&&xe()}catch(f){Ue(`读取媒体信息失败：${f.message}`)}s="总帧数读不出来（填 0 = 整段，一定没错）",d()}}function wd(e,t,n){const o=Z(e).inputs.find(y=>y.key==="aspect_ratio"),i=o?e.params.aspect_ratio!=null?e.params.aspect_ratio:o.default:"16:9 (Widescreen)",s=l.createElement("span");s.className="resout";const d=[...n.querySelectorAll("input")],f=()=>{const y=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default);if(!isFinite(y)){s.textContent="";return}if(t.key==="megapixels"){const[x,_]=$r(i,y);s.textContent=`${x}×${_} · ${Math.min(x,_)}p`,s.title=`${i}，${y} 百万像素`}else s.textContent=`16:9 素材 → ${Math.round(y)}×${hs(y)} · ${hs(y)}p`,s.title="长边固定为这个值，短边按素材原比例算，所以 p 数随素材变"},h=y=>{for(const x of d)x.value=y;e.params[t.key]=y,f(),xe()},m=l.createElement("span");m.className="presets";for(const y of jr){const x=t.key==="megapixels"?As(i,y):Rs[y],_=l.createElement("button");_.textContent=y+"p",x>t.max?(_.disabled=!0,_.title=t.key==="megapixels"?`${i} 下 ${y}p 需要 ${x} 百万像素，超过当前参数上限 ${t.max}`:`最长边 ${x}px 超过当前参数上限 ${t.max}`):(_.title=t.key==="megapixels"?`${$r(i,x).join("×")} · 短边 ${y}p`:`16:9 素材约 ${y}p；最长边 ${x}px，实际短边随素材比例变化`,_.onclick=()=>h(x)),m.appendChild(_)}const u=l.createElement("div");u.className="resline",u.append(s,m),n.appendChild(u);for(const y of d)y.addEventListener("input",f);f()}function ri(e,t=c){return t?.director?.shots?.find(n=>n.id===e.director_shot||n.image?.card===e.id||n.video?.card===e.id)}function Vi(e){const t=ri(e);if(!t)return[];const n=[];return t.shotSize&&n.push("景别："+t.shotSize),(e.director_stage==="video"||t.video?.card===e.id)&&t.movement&&n.push("运镜："+t.movement),c.director.style?.trim()&&n.push("统一画面风格："+c.director.style.trim()),n}function Ki(e){const t=ie[me(e)]||Z(e),n={},r={},o=mr(e),i=Vi(e),s=new Set(Rt(t).map(d=>d.key));for(const d of t.inputs){if(Dt.includes(d.type)||d.mirror)continue;const f=e.params[d.key];if(f!=null?n[d.key]=f:d.type==="seed"?n[d.key]=-1:d.default!==void 0&&(n[d.key]=d.default),!s.has(d.key))continue;const h=E(e,d.key);if(h!=null)n[d.key]=h;else{let m=Yi(n[d.key],e);o.length&&(m=O(m,o)),n[d.key]=m}i.length&&d.key==="prompt"&&(n[d.key]+=`
`+i.join(`
`))}if(Ks(t,n),t.imageControls){const d=hr(e,t);n.image_ratio=d.ratio,n.image_clarity=d.clarity;for(const f of ai)delete n[f]}for(const d of t.inputs.filter(f=>Dt.includes(f.type))){const f=e.assets[d.key];f&&f.ref&&(r[d.key]=f.ref)}return{capability:t.id,params:n,assets:r,project:c&&c.id,projectName:c&&c.name,card:e.id,cardName:Ne(e)}}function oi(e){return e._ifRestoring?(ye("正在查询原产物，请勿重复生成"),Promise.resolve()):(e._runPromise||(e._runPromise=fn(vd(e).finally(()=>{delete e._runPromise}))),e._runPromise)}function is(e,t){!We(e)||!ke()||!lr(e,t)||(e._ifResumePreparing?(delete e._ifResumePreparing,e._runPromise=fn(as(e,!0).finally(()=>{delete e._runPromise}))):e.status==="running"&&(e.job?Eo(e,t):e.if_request_id&&Gi(e,t)))}async function Gi(e,t){if(e._ifRecovering||c?.id!==t||!ke()||!c.cards.includes(e)||!We(e)||!lr(e,t)||e.job||e.status!=="running"||!e.if_request_id)return;e._ifRecovering=!0;let n=!1;try{const r=await Jt(`/requests/${encodeURIComponent(e.if_request_id)}`);if(c?.id!==t||!ke()||!c.cards.includes(e))return;e.job=r.id,e.error=null,e.step="本机 IF 已接收原请求，正在恢复进度";const o=qn(e,t);o.job=r.id,ar(o),Yr(e,{id:r.id,capability:e.if_job_cap||e.cap,prompts:e.if_pending_prompts||[]}),delete e.if_pending_prompts,zt(e,t,"running"),await En(e,t),Eo(e,t)}catch(r){if(c?.id!==t||!c.cards.includes(e))return;n=r instanceof TypeError||r.status>=500||r.status===404&&Date.now()-(e.if_submitted_at||e.if_started)<12e4,e.step=n?"正在向本机 IF 确认原请求，请勿重复生成":"",n||(e.status="error",e.error="IF 提交结果尚未确认，请先在 IF 查看是否已创建任务，避免重复生成："+r.message),zt(e,t,"submitting"),n||(Ue(e.error),await En(e,t))}finally{e._ifRecovering=!1,c?.id===t&&c.cards.includes(e)&&(at(e),b.panel._id===e.id&&Pe(e.id),n&&I(()=>Gi(e,t),2500))}}async function as(e,t=!1){const n=c,r=e.cap,o=[];let i=!1,s=!1;e.status="queued",e.error=null,e.progress=null,e.job=null,e.ms=null,e.step="正在连接本机 IF 并读取模型",e.if_job_cap=r,t||(e.if_started=Date.now(),e.if_request_id=Array.from(crypto.getRandomValues(new Uint8Array(16)),f=>f.toString(16).padStart(2,"0")).join("")),delete e.if_submitted_at,delete e.if_pending_prompts,delete e.if_canvas_url;const d=zt(e,n.id,"preparing");at(e),b.panel._id===e.id&&Pe(e.id);try{if(!d)throw new Error("无法保存 IF 刷新恢复记录，尚未提交生成；请检查浏览器存储空间和权限");const f=await Tn(n.id);if(!f.ok)throw new Error("任务准备状态保存失败，尚未提交 IF："+(f.error?.message||"请重试"));const h=await Kn();if(!Nt)throw new Error("请更新本机 IF 桥接器后重试；当前版本不支持提交期间刷新恢复");if(await hi(e),c!==n||!ke()||!n.cards.includes(e)||e.cap!==r)throw new Error("画布已切换或权限已变化，已取消 IF 提交");const m=Z(e).outputType,u=h.filter(U=>U.type===m).find(U=>U.display_name===e.params.if_model)||!e.params.if_model&&h.find(U=>U.type===m);if(!u)throw new Error("当前 IF 模型不可用，请重新选择模型");if(["exhausted","unavailable"].includes(u.quota_status))throw new Error(`${u.display_name}：${kt(u)}，尚未提交生成，请选择其他模型`);const y=String(e.params.prompt||""),x=y.trim();if(!x)throw new Error("请先填写 IF 生成需求");const _=je(u.display_name,m),j=Object.entries(e.assets||{}).filter(([,U])=>U&&Dt.includes(U.kind)).sort(([U],[he])=>U.localeCompare(he,void 0,{numeric:!0})),S={image:0,video:0,audio:0};for(const[U,he]of j){const Le=U.match(/^(?:images|video)\[(\d+)\]$/);if(!Le||he.kind==="image"!==U.startsWith("images["))throw new Error(`引用槽位与${Qe[he.kind]||he.kind}类型不匹配，请重新连接引用`);if(Number(Le[1])>=(_.bridge[he.kind]||0))throw new Error(`所选模型最多引用图片 ${_.bridge.image} 张、视频 ${_.bridge.video} 个；当前引用槽位超出范围，请移除多余引用或更换模型`);S[he.kind]++}if(Object.keys(S).some(U=>S[U]>(_.bridge[U]||0)))throw new Error("引用数量超出所选 IF 模型的画布槽位");const B={type:m,model:u.display_name,request_id:e.if_request_id,prompt:O(Yi(x,e),mr(e))},be=Vi(e);be.length&&(B.prompt+=`
`+be.join(`
`));const Ke=Z(e),dt=Ke.inputs,et=[];if(m==="image"){const{ratio:U,clarity:he}=hr(e,Ke),[Le,qe]=U.split(":").map(Number),Ie=Rr.find($e=>$e.id===he).val,re=Le>=qe?Math.round(Ie*Le/qe/16)*16:Ie,se=Le>=qe?Ie:Math.round(Ie*qe/Le/16)*16;et.push(`分辨率：${re}×${se}`)}else{const U=dt.find(Fe=>Fe.key==="aspect_ratio"),he=dt.find(Fe=>Fe.key==="megapixels"),Le=e.params.aspect_ratio??U.default,qe=Number(e.params.megapixels??he.default),Ie=na(e,Ke),re=Ie?[Ie.width,Ie.height]:$r(Le,Number.isFinite(qe)&&qe>=he.min&&qe<=he.max?qe:he.default),se=dt.find(Fe=>Fe.key==="duration"),$e=Number(e.params.duration??se.default);if(!Number.isSafeInteger($e)||$e<se.min||se.max!=null&&$e>se.max)throw new Error(se.max!=null?`当前 IF 模型时长须为 ${se.min}–${se.max} 秒的整数，请修改时长`:"当前 IF 模型时长范围未核实，请输入正整数秒");const[we,ze]=Mo[Le]||[1,1];et.push(`分辨率：${re[0]}×${re[1]}`,`时长：${$e}s`,`画面比例：${we} : ${ze}`)}B.prompt+=`

${et.join(`
`)}`;const He=m==="video"?"视频":"图片",ht=m==="video"?"图片、":"",zn=m==="video"?"不要改为生图":"不要改为视频或文字方案";if(B.prompt=`最终交付必须是${He}文件，不是${ht}故事板或文字方案。用户已经确认生成需求，请直接生成${He}；不要等待用户确认规划、分镜或中间图片，也不要把中间图片当作最终结果。如无法直接完成，请说明原因，${zn}。以本条${He}目标和以下参数要求为准。

${B.prompt}`,m==="image"&&e.params.if_reference?.trim()){if(!_.bridge.image&&!_.bridge.video)throw new Error("该模型不支持已确认的媒体引用");B.image=e.params.if_reference.trim()}const bt=qn(e,n.id);bt.pending=[],bt.job=null;const xt=U=>JSON.stringify([U.kind,new te(U.url,location.href).href,U.ref||""]),Oe=new Set(j.map(([,U])=>xt(U)));if(bt.entries=bt.entries.filter(U=>Oe.has(U.source)),ar(bt),j.length){if(!oo)throw new Error("请更新本机 IF 桥接器后重试；当前版本不支持引用复用");B.references=[];for(const[U,[,he]]of j.entries()){const Le=`${Qe[he.kind]}引用（${U+1}/${j.length}）`,qe=new te(he.url,location.href);if(qe.origin!==location.origin)throw new Error("IF 仅能上传当前画布内的本机素材");e.step=`正在检查 IF ${Le}是否可复用`,at(e);const Ie=await Pr(qe,he.kind);if(c!==n||!n.cards.includes(e)||e.cap!==r||!ke())throw new Error("画布已切换或权限已变化，已取消 IF 提交");const re={source:xt(he),version:Ie,kind:he.kind};bt.pending.push(re);const se=bt.entries.find(Re=>Re.source===re.source&&Re.version===Ie&&Re.kind===he.kind&&gn(Re.url));if(se){e.step=`正在复用已上传 IF 的${Le}`,at(e),B.references.push({kind:he.kind,url:se.url});continue}e.step=`正在读取 IF ${Le}`,at(e);const $e=await Y(qe,{credentials:"same-origin",cache:"no-store"});if(!$e.ok)throw new Error("无法读取画布引用素材");let we=await $e.blob();const ze=he.kind==="image"?["image/png","image/jpeg","image/webp"]:["video/mp4"],Fe=he.kind==="image"?1e7:50*1024*1024;if(!ze.includes(we.type)||we.size>Fe){e.step=`正在适配 IF ${Qe[he.kind]}上传副本（${U+1}/${j.length}）`,at(e);const Re=await Y(`/api/if-reference?${new URLSearchParams({url:qe.pathname+qe.search,type:he.kind})}`,{credentials:"same-origin",cache:"no-store",headers:{"If-Match":Ie}});if(!Re.ok)throw new Error(`IF 素材自动适配失败：${(await Re.text()).slice(0,500)}`);const yt=we.size;we=await Re.blob();const Je=Re.headers.get("X-Chouka-IF-Conversion");if(c!==n||!n.cards.includes(e)||e.cap!==r||!ke())throw new Error("画布已切换或权限已变化，已取消 IF 提交");ye(`IF ${Qe[he.kind]}上传副本已${Je==="lossless-webp"?"转换为无损 WebP":"压缩"}（${(yt/1048576).toFixed(1)} → ${(we.size/1048576).toFixed(1)} MB），原素材保持不变`)}if(!we.size||!ze.includes(we.type)||we.size>Fe)throw new Error(`IF 上传副本仍不符合格式或 ${he.kind==="image"?10:50} MB 大小限制，原素材未修改`);if(c!==n||!n.cards.includes(e)||e.cap!==r||!ke())throw new Error("画布已切换或权限已变化，已取消 IF 提交");if(await Pr(qe,he.kind)!==Ie)throw new Error("准备期间引用素材已变化，请重试");e.step=`正在向本机桥接传送${Le}`,at(e);const nt=await Jt("/assets",{method:"POST",headers:{"X-Chouka-IF":"asset","Content-Type":we.type},body:we});if(o.push(nt.asset_id),B.references.push({kind:he.kind,asset_id:nt.asset_id}),c!==n||!n.cards.includes(e)||e.cap!==r)throw new Error("画布已切换，已取消 IF 提交")}}if(ar(bt),e.params.if_model=u.display_name,e.status="queued",e.error=null,e.progress=null,e.outputs=[],e.ms=null,e.step="正在交由本机 IF 桥接处理",e.job=null,s=!0,e.if_submitted_at=Date.now(),e.if_pending_prompts=[{key:"if_original",label:"原始提示词",text:y},{key:"if_submitted",label:"提交给 IF CLI 的提示词",text:B.prompt}],!zt(e,n.id,"submitting"))throw new Error("无法保存 IF 提交恢复记录，尚未提交生成；请检查浏览器存储空间和权限");at(e),b.panel._id===e.id&&Pe(e.id);const ot=await Jt("/runs",{method:"POST",headers:{"Content-Type":"application/json","X-Chouka-IF":"generate"},body:JSON.stringify(B)});i=!0,e.job=ot.id,e.if_job_cap=r,e.status="running",e.step="本机 IF 正在准备生成任务",bt.job=ot.id,ar(bt),Yr(e,{id:ot.id,capability:r,prompts:e.if_pending_prompts}),delete e.if_pending_prompts,zt(e,n.id,"running"),b.hist._id===e.id&&Jr(e.id),(await En(e,n.id)).ok||Ue("IF 任务已提交，服务器状态保存失败；已保留本标签页恢复记录，请勿重复生成"),Eo(e,n.id)}catch(f){const h=s&&!i&&(f instanceof TypeError||f instanceof SyntaxError||f.status>=500);if(!i&&!h&&o.length&&await Promise.allSettled(o.map(m=>Jt(`/assets/${encodeURIComponent(m)}`,{method:"DELETE",headers:{"X-Chouka-IF":"asset"}}))),c!==n||!n.cards.includes(e))return;h?(e.status="running",e.error=null,e.step="正在向本机 IF 确认原请求",zt(e,n.id,"submitting"),Gi(e,n.id)):(e.status="error",e.error=f.message,e.step="",e.job=null,zt(e,n.id,"error"),Ue(`「${Ne(e)}」生成失败：${e.error}`),await En(e,n.id))}c===n&&n.cards.includes(e)&&(at(e),b.panel._id===e.id&&Pe(e.id))}async function Eo(e,t,n=null){if(e._ifPolling||c?.id!==t||!ke()||!We(e)||!c.cards.includes(e)||!lr(e,t)||!e.job||e.status!=="running")return;e._ifPolling=!0;const r={job:e.job,request:e.if_request_id,started:e.if_started,cap:e.cap},o=()=>c?.id===t&&ke()&&c.cards.includes(e)&&e.job===r.job&&e.if_request_id===r.request&&e.if_started===r.started&&e.cap===r.cap;let i=!1;try{const s=n||await Jt(`/runs/${encodeURIComponent(e.job)}`);if(!o())return;Ir(e,s.result,t);const d=No(s.result);d&&(e.if_canvas_url=d);const f=e.history?.find(x=>x.job===e.job)?.prompts?.find(x=>x.key==="if_submitted");if(f&&typeof s.result?.submitted_prompt=="string"&&(f.text=s.result.submitted_prompt),s.state==="starting"||s.state==="running"){e.step=s.step||(s.state==="starting"?"本机 IF 正在准备生成任务":"IF 正在生成"),i=!0;return}if(s.state==="error")throw new Error((s.error||"IF 生成失败")+(s.result?.invalid_reference_indices?.length?"；已清除失效引用缓存，重试时仅重新上传失效素材":""));const h=s.result?.downloaded||[],m=Z(e).outputType,u=/请确认|确认后|回复["“]?确认/.test(s.result?.planning_text||"");if(!h.length)throw new Error(u?`IF 要求确认规划或故事板，未直接生成${Qe[m]}；请在 IF 网站查看该会话。`:`IF 未返回${Qe[m]}产物，请在 IF 网站查看该会话。`);const y=[];for(const[x,_]of h.entries()){if(_.type!==Z(e).outputType)continue;e.step=`正在取回 IF ${Qe[_.type]}产物（${x+1}/${h.length}）`,at(e);const j=await Y(`${Fn}/runs/${encodeURIComponent(e.job)}/media/${_.index}`,{credentials:"omit"});if(!j.ok)throw j.status>=500||j.status===429?new TypeError("IF 产物暂不可读取"):new Error("无法读取 IF 产物");const S=new File([await j.blob()],_.name);if(!o())return;e.step=`正在保存 IF ${Qe[_.type]}产物（${x+1}/${h.length}）`,at(e);const B=await dn(S,_.type==="image");if(!o())return;y.push({...B,filename:_.name})}if(!y.length)throw new Error(m==="video"&&h.some(x=>x.type==="image")?`IF 只生成了故事板图片，尚未生成视频${u?"，并要求确认下一步":""}；请在 IF 网站查看该会话。`:`IF 返回的媒体类型与当前${Qe[m]}节点不符，请在 IF 网站查看该会话。`);e.outputs=y,e.status="done",e.step="",e.error=null,e.ms=Date.now()-(e.if_started||Date.now()),Yr(e,{id:e.job,capability:e.if_job_cap||e.cap}),b.hist._id===e.id&&Jr(e.id),zt(e,t,"done"),await ss(e)}catch(s){if(!o())return;s instanceof TypeError||/桥接请求失败|Failed to fetch/.test(s.message)?(e.step="IF 连接或产物读取中断，正在重试",i=!0):(e.status="error",e.error=s.message,e.step="",e.ms=Date.now()-(e.if_started||Date.now()),e.job&&Yr(e,{id:e.job,capability:e.if_job_cap||e.cap}),b.hist._id===e.id&&Jr(e.id),Ue(`「${Ne(e)}」生成失败：${s.message}`))}finally{e._ifPolling=!1,o()&&(zt(e,t,i?"running":e.status),at(e),b.panel._id===e.id&&Pe(e.id),i?I(()=>Eo(e,t),2500):["done","error"].includes(e.status)&&await En(e,t))}}async function vd(e){if(!Ze())return;const t=c;if(It(e))return ye("风格节点不用运行：它只把风格并进挂着的那几个节点的提示词");if(Bt(e))return rd(e);if(e.status==="queued"||e.status==="running")return;const n=Z(e);if(!n)return Ue("能力不可用");if(n.id==="image_composite"&&n.execution==="browser")return Ql(e);if(n.execution==="if_studio")return as(e);if(e.director_shot){if(Ve.cancelContentSave(),await Ve.pendingChain,!(await Tn(c.id)).ok||!c.cards.includes(e))return;St++,delete e.director_selected}e.job=null,e.queue_remaining=null,e.queue_ahead=null,e.error=null,e.progress=0,e.status="queued",e.outputs=[],e.ms=null,e.step="",at(e),Pe(e.id);try{if(await hi(e),c!==t||!t.cards.includes(e)||!ke())throw new Error("画布已切换或权限变化，未提交生成");const r=Ki(e),o=await Tt("/api/generate",r);e.job=o.id,e.seed=o.seed,e.status=o.status,o.project_rev!=null&&c?.id===r.project&&(c.rev=Math.max(c.rev||0,o.project_rev))}catch(r){e.status="error",e.error=r.message,e.job=null,c===t&&Ve.markWorkFailure(r),Ue(`「${Ne(e)}」提交失败：${r.message}`)}e.director_shot&&(St=Math.max(0,St-1)),!(c!==t||!ke())&&(at(e),b.panel._id===e.id&&Pe(e.id),xe(!1),vi())}async function kd(e){if(e.job)try{await Tt(`/api/job/${e.job}/cancel`)}catch(t){Ue(t.message)}}async function ss(e){const t=c;tt();for(const n of t.edges.filter(r=>r.from===e.id&&!Ge(r)&&!r.version)){const r=t.cards.find(s=>s.id===n.to);if(!r)continue;const o=e.outputs||[],i=wn(n);n.slots=i;for(let s=0;s<i.length;s++){if(!o[s]){delete r.assets[i[s]];continue}try{const d=await Di(o[s],Z(r)?.execution==="browser");c===t&&t.edges.includes(n)&&lt(r.id)&&(r.assets[i[s]]=d)}catch(d){console.error("导入产物失败:",d),c===t&&Ue(`向「${Ne(r)}」导入产物失败：${d.message}`)}}if(c!==t)return;Qn(r),At(r),b.panel._id===r.id&&Pe(r.id)}}function Cd(e){return e.project?c&&e.project===c.id?c.name:(pe.find(t=>t.id===e.project)||{}).name||e.projectName||"":e.projectName||""}async function ls(e){if(!c||c.id!==e.project){if(!pe.some(r=>r.id===e.project))return ye("这个任务所在的画布已经不在了");await Ar(e.project)}const t=c.cards.find(r=>r.id===e.card);if(!t)return ye("这个节点片已经从画布上删掉了");const n=b.stage.getBoundingClientRect();Q.x=n.width/2-(t.x+Te(t)/2)*Q.k,Q.y=n.height/3-t.y*Q.k,Hn(),ve=t.id,ae.clear(),Gt=null,tt(!1);for(const r of c.cards)r._el&&r._el.classList.toggle("sel",r.id===t.id);Pe(t.id),Ct(),Rn(),ln()}return w.bind({open:Ar,refresh:Or,clear:Wt,selectSpace(e){Be=e,c&&!fa(c).includes(e)&&Wt(),To()},renamed(e,t,n){c?.id===e&&(c.name=t,typeof n=="number"&&(c.rev=n),cn()),_e.renameProject(e,t)}}),a.onDispose(()=>{bi++,_e.reset(),c=null,Ve.cancelTimers(),qo(),Hi(),xr?.disconnect(),mo()}),{ready:pa,flush:()=>Mr(void 0,!0),getProject:()=>c,nodeEditor:R?N.ChoukaNodeEditor:void 0}}const nc=Ps({x:_t().int().min(0),y:_t().int().min(0),width:_t().int().min(1),height:_t().int().min(1)}).refine(a=>a.x+a.width<=8192&&a.y+a.height<=8192),In=(a,p,g)=>Math.max(p,Math.min(g,a));function sa(a){if(a===void 0)return;const p=nc.safeParse(a);if(!p.success)throw new Error("图片裁剪范围无效，需使用原图范围内的整数像素。");return p.data}function pi(a,p){if(![a,p].every(g=>Number.isFinite(g)&&g>0)||a>8192||p>8192||a*p>32e6)throw new Error("图层尺寸必须大于 0，单边不超过 8192 像素，总像素不超过 3200 万。")}function ir(a,p){const g=a.crop??{x:0,y:0,width:p.width,height:p.height};if(g.x+g.width>p.width||g.y+g.height>p.height)throw new Error("裁剪范围超出原图尺寸。");return g}function rc(a,p,g){const w=sa(p),C=ir({crop:w},g),k=ir(a,g),N=a.width/k.width,l=a.height/k.height,v=(C.x-k.x)*N,I=(C.y-k.y)*l,D=a.angle*Math.PI/180;return{x:a.x+v*Math.cos(D)-I*Math.sin(D),y:a.y+v*Math.sin(D)+I*Math.cos(D),width:C.width*N,height:C.height*l,crop:C.x===0&&C.y===0&&C.width===g.width&&C.height===g.height?void 0:{...C}}}function Bs(a){return[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]].map(([p=0,g=0])=>({fx:p,fy:g,x:a.x+(p+1)*a.width/2,y:a.y+(g+1)*a.height/2}))}function ws(a,p,g,w){const C=Bs(p).map(k=>({...k,distance:Math.hypot((a.x-k.x)*w.width/g.width,(a.y-k.y)*w.height/g.height)})).sort((k,N)=>k.distance-N.distance)[0];return C&&C.distance<=14?C:a.x>p.x&&a.x<p.x+p.width&&a.y>p.y&&a.y<p.y+p.height?"move":"new"}function oc(a,p,g,w,C){const k=g.x-p.x,N=g.y-p.y;if(w==="move")return{...a,x:In(a.x+k,0,C.width-a.width),y:In(a.y+N,0,C.height-a.height)};if(w==="new")return{x:Math.min(g.x,p.x),y:Math.min(g.y,p.y),width:Math.max(1,Math.abs(k)),height:Math.max(1,Math.abs(N))};let{x:l,y:v}=a,I=l+a.width,D=v+a.height;return w.fx<0&&(l=In(l+k,0,I-1)),w.fx>0&&(I=In(I+k,l+1,C.width)),w.fy<0&&(v=In(v+N,0,D-1)),w.fy>0&&(D=In(D+N,v+1,C.height)),{x:l,y:v,width:I-l,height:D-v}}function ic(a,p,g,w){const C=Number(g);if(!g.trim()||!Number.isFinite(C))return a;const k=p==="x"?w.width-1:p==="y"?w.height-1:p==="width"?w.width-a.x:w.height-a.y,N={...a,[p]:In(Math.round(C),p==="x"||p==="y"?0:1,k)};return{...N,width:Math.min(N.width,w.width-N.x),height:Math.min(N.height,w.height-N.y)}}const ac="_dialog_89jif_1",sc="_stage_89jif_45",lc="_fields_89jif_57",dc="_actions_89jif_71",li={dialog:ac,stage:sc,fields:lc,actions:dc},cc=[["x","裁剪 X / px"],["y","裁剪 Y / px"],["width","裁剪宽度 / px"],["height","裁剪高度 / px"]];function pc({session:a,canEdit:p,onApply:g,onClose:w}){const C=rt.useRef(null),k=rt.useRef(null),N=rt.useRef(null),[l,v]=rt.useState(a.rect),[I,D]=rt.useState({}),[J,ce]=rt.useState(""),V=rt.useId(),{bitmap:G}=a;rt.useLayoutEffect(()=>{const z=C.current,$=k.current,te=document.activeElement;return z?.showModal(),()=>{z?.close(),$&&($.width=$.height=0),te instanceof HTMLElement&&te.isConnected&&te.focus({preventScroll:!0})}},[]),rt.useLayoutEffect(()=>{const z=k.current,$=z?.getContext("2d");if(!z||!$)return;const te=Math.min(720/G.width,420/G.height);z.width=Math.max(1,Math.round(G.width*te)),z.height=Math.max(1,Math.round(G.height*te));const Y=z.width/G.width,L=z.height/G.height,P=l.x*Y,q=l.y*L,W=l.width*Y,A=l.height*L;$.drawImage(G,0,0,z.width,z.height),$.fillStyle="#000a",$.beginPath(),$.rect(0,0,z.width,z.height),$.rect(P,q,W,A),$.fill("evenodd"),$.strokeStyle="#fff",$.lineWidth=2,$.strokeRect(P,q,W,A),$.strokeStyle="#ffffff88",$.lineWidth=1,$.beginPath();for(const oe of[1/3,2/3])$.moveTo(P+W*oe,q),$.lineTo(P+W*oe,q+A),$.moveTo(P,q+A*oe),$.lineTo(P+W,q+A*oe);$.stroke(),$.fillStyle="#fff";for(const oe of Bs(l))$.fillRect(oe.x*Y-4,oe.y*L-4,8,8)},[G,l]);const ee=z=>{const $=z.currentTarget.getBoundingClientRect();return{x:In(Math.round((z.clientX-$.left)*G.width/$.width),0,G.width),y:In(Math.round((z.clientY-$.top)*G.height/$.height),0,G.height)}};return X.jsxs("dialog",{ref:C,"data-image-crop":!0,className:li.dialog,"aria-labelledby":V,onCancel:z=>{z.preventDefault(),z.stopPropagation(),w()},onKeyDown:z=>z.stopPropagation(),onPaste:z=>z.stopPropagation(),onDragOver:z=>{z.preventDefault(),z.stopPropagation()},onDrop:z=>{z.preventDefault(),z.stopPropagation()},children:[X.jsx("h2",{id:V,children:"裁剪所选图片"}),X.jsx("p",{children:"拖动边框调整范围，框内拖动移动，框外拖动重新框选；也可输入原图像素。"}),X.jsx("div",{className:li.stage,children:X.jsx("canvas",{ref:k,"aria-label":"单张图片裁剪预览，可使用下方数值调整裁剪范围",onPointerDown:z=>{if(z.button!==0||!p()||N.current)return;z.preventDefault();const $=ee(z),te=ws($,l,G,z.currentTarget.getBoundingClientRect());te==="new"&&($.x=Math.min($.x,G.width-1),$.y=Math.min($.y,G.height-1)),D({}),N.current={pointerId:z.pointerId,start:$,mode:te,before:{...l}},z.currentTarget.setPointerCapture(z.pointerId)},onPointerMove:z=>{if(!p())return;const $=ee(z),te=N.current;if(te)te.pointerId===z.pointerId&&(z.preventDefault(),v(oc(te.before,te.start,$,te.mode,G)));else{const Y=ws($,l,G,z.currentTarget.getBoundingClientRect());z.currentTarget.style.cursor=typeof Y=="string"?Y==="move"?"move":"crosshair":Y.fx===0?"ns-resize":Y.fy===0?"ew-resize":Y.fx===Y.fy?"nwse-resize":"nesw-resize"}},onLostPointerCapture:()=>{N.current=null}})}),X.jsx("div",{className:li.fields,children:cc.map(([z,$])=>X.jsxs("label",{children:[X.jsx("span",{children:$}),X.jsx("input",{type:"number",step:"1",min:z==="x"||z==="y"?0:1,max:z==="x"?G.width-1:z==="y"?G.height-1:z==="width"?G.width-l.x:G.height-l.y,value:I[z]??l[z],onChange:te=>D({...I,[z]:te.target.value}),onBlur:te=>{p()&&v(ic(l,z,te.target.value,G)),D(Y=>{const L={...Y};return delete L[z],L})},onKeyDown:te=>{te.key==="Enter"&&te.currentTarget.blur()}})]},z))}),X.jsxs("p",{role:"status",children:["原图 ",G.width," × ",G.height," px · 保留 ",l.width," × ",l.height," px"]}),J&&X.jsx("p",{role:"alert",children:J}),X.jsxs("div",{className:li.actions,children:[X.jsx("button",{type:"button",onClick:()=>{p()&&(D({}),v({x:0,y:0,width:G.width,height:G.height}))},children:"恢复原图"}),X.jsx("button",{type:"button","data-composer-action":"cancel-crop",autoFocus:!0,onClick:w,children:"取消裁剪"}),X.jsx("button",{type:"button",onClick:()=>{p()&&g(a.id,l)?w():ce("裁剪未应用，请检查编辑权限或重新打开裁剪。")},children:"应用裁剪"})]})]})}function uc({selection:a,enabled:p,canEdit:g,onApply:w}){const[C,k]=rt.useState(null),N=a?.layer.id,l=a?.layer.locked;rt.useEffect(()=>{k(null)},[p,N,l]);const v=rt.useCallback(()=>k(null),[]);return X.jsxs(X.Fragment,{children:[X.jsx("button",{type:"button",className:"ic-button","data-composer-action":"crop",disabled:!p||!a||l,onClick:()=>{!a||a.layer.locked||!g()||k({id:a.layer.id,bitmap:a.bitmap,rect:{...ir(a.layer,a.bitmap)}})},children:"裁剪图片"}),X.jsx("p",{className:"ic-hint",children:"裁剪只影响所选图片，保留原图，可重新裁剪或恢复原图。"}),C&&X.jsx(pc,{session:C,canEdit:g,onApply:w,onClose:v})]})}function fc(a,p){a.dataset.composerCrop="";const g=Ns.createRoot(a);return{update(w){g.render(X.jsx(uc,{...p,...w}))},dispose(){g.unmount()}}}const Er=Object.freeze({size:32,color:"#ff4040",opacity:1,hardness:1,strength:8,blockSize:12});function mc(a){return/^#[a-f\d]{6}$/i.test(a)}const vs=_t().min(0).max(1),ks=_t().int().min(1).max(8192),hc=ta({tool:Nd(["paint","erase","restore","blur","mosaic","restoreEffects"]),points:di(ta({x:_t().min(-1e6).max(1e6),y:_t().min(-1e6).max(1e6)})).min(1).max(12e3),sizeX:_t().positive().max(16384),sizeY:_t().positive().max(16384),color:Yn().refine(mc),opacity:vs,hardness:vs,strength:_t().min(0).max(128),blockSize:_t().int().min(1).max(1024),clip:$o().transform(sa).optional()}),Hs=$o().superRefine((a,p)=>{if(!Array.isArray(a)||a.length>1e3){p.addIssue({code:"custom",message:"笔画数量无效或超过 1000。"});return}let g=0;for(const w of a){if(typeof w!="object"||w===null||!("points"in w)){p.addIssue({code:"custom",message:"笔画缺少坐标。"});return}const C=w.points;if(!Array.isArray(C)||C.length>12e3){p.addIssue({code:"custom",message:"单笔坐标数量无效或超过 12000。"});return}if(g+=C.length,g>1e5){p.addIssue({code:"custom",message:"笔画总坐标超过 100000。"});return}}}).pipe(di(hc).max(1e3)),gc=ta({width:ks,height:ks,strokes:Hs}).refine(a=>a.width*a.height<=32e6).refine(a=>a.strokes.every(({clip:p})=>!p||p.x+p.width<=a.width&&p.y+p.height<=a.height));function Xs(a){if(a===void 0)return;const p=Hs.safeParse(a);if(!p.success)throw new Error("图层笔画数据无效：请检查工具、有限数值、笔画数量和坐标数量，不能包含图片数据。");return p.data}function Us(a){const p=gc.safeParse(a);if(!p.success)throw new Error("涂鸦数据无效：单边须为 1–8192 整数像素，总像素不超过 3200 万，笔画或坐标超限。");return p.data}function Ws(a,p){if(pi(p.width,p.height),![a.x,a.y,a.angle,a.width,a.height].every(Number.isFinite)||a.width<=0||a.height<=0)throw new Error("图层位置、旋转或缩放无效。");const g=ir(a,p);if(![g.x,g.y,g.width,g.height].every(Number.isFinite)||g.x<0||g.y<0||g.width<=0||g.height<=0)throw new Error("图层裁剪范围无效。");const w=g.width/a.width,C=g.height/a.height;if(![w,C].every(k=>Number.isFinite(k)&&k>0))throw new Error("图层缩放超出有效范围。");return{crop:g,scaleX:w,scaleY:C}}function Cs(a,p,g){const{crop:w,scaleX:C,scaleY:k}=Ws(a,p);if(![g.x,g.y].every(Number.isFinite))throw new Error("画笔坐标无效。");const N=a.angle%360*Math.PI/180,l=g.x-a.x,v=g.y-a.y,I={x:w.x+(l*Math.cos(N)+v*Math.sin(N))*C,y:w.y+(-l*Math.sin(N)+v*Math.cos(N))*k};if(![I.x,I.y].every(Number.isFinite))throw new Error("画笔坐标超出有效范围。");return I}function bc(a,p,g){const{scaleX:w,scaleY:C}=Ws(a,p);if(!Number.isFinite(g)||g<=0)throw new Error("画笔直径无效。");const k=g*w,N=g*C;if(![k,N].every(l=>Number.isFinite(l)&&l>0))throw new Error("画笔直径超出有效范围。");return{sizeX:k,sizeY:N}}const Ys={id:Yn().min(1).max(200),name:Yn().max(200).default("图片"),x:_t().min(-1e5).max(1e5),y:_t().min(-1e5).max(1e5),width:_t().positive().max(8192),height:_t().positive().max(8192),angle:_t().min(-36e3).max(36e3),opacity:_t().min(0).max(1),visible:us().default(!0),locked:us().default(!1)},Js=ui({kind:eo("image"),url:Yn().min(1)}),xc=ui({...Ys,kind:eo("image").optional(),asset:Js,crop:$o().optional().transform(sa),effects:$o().optional().transform(Xs)}),yc=ui({...Ys,kind:eo("paint"),paint:$o().transform(Us)}),wc=ui({version:ps([eo(1),eo(2)]),width:_t().int().min(1).max(8192),height:_t().int().min(1).max(8192),background:ps([eo("transparent"),Yn().regex(/^#[a-f\d]{6}$/i)]),layers:di(zd("kind",[yc,xc])).max(100),linkedSources:di(Yn().min(1).max(8196)).max(512).optional()});function vc(a,p){const g=a??{version:1,width:1920,height:1080,background:"transparent",layers:[]};if(JSON.stringify(g).length>2*1024*1024)throw new Error("编辑稿描述超过 2 MiB，请减少笔画、图层或资产元数据。");const C=wc.safeParse(g);if(!C.success)throw new Error("编辑稿版本、图层或画布数据无效。");const k=C.data;pi(k.width,k.height);const N=new Set;for(const l of k.layers){if(N.has(l.id))throw new Error("图层 ID 重复。");if(N.add(l.id),pi(l.width,l.height),l.kind==="paint"){if(l.crop!==void 0||l.asset!==void 0||l.effects!==void 0)throw new Error("涂鸦图层不能包含图片裁剪或图片资产。");if(l.paint.strokes.some(v=>["blur","mosaic","restoreEffects"].includes(v.tool)))throw new Error("涂鸦图层只支持画笔、擦除和恢复。")}else{if(l.paint!==void 0)throw new Error("图片图层不能包含涂鸦图层数据。");if(l.asset=Js.parse(p(l.asset)),l.effects?.some(v=>v.tool==="paint"))throw new Error("图片涂色请使用独立涂鸦图层。")}}return k.layers.some(l=>l.kind==="paint"||!!l.effects?.length)&&(k.version=2),k.linkedSources&&(k.linkedSources=[...new Set(k.linkedSources)]),k}function _s(a,p,g){if(a.layers.length>=100)throw new Error("最多添加 100 个图层。");const w=a.layers.filter(l=>l.kind==="paint").length+1,C={kind:"paint",id:p,name:`涂鸦 ${w}`,x:0,y:0,width:a.width,height:a.height,angle:0,opacity:1,visible:!0,locked:!1,paint:{width:a.width,height:a.height,strokes:[]}},k=[...a.layers],N=g===null?k.length:k.findIndex(l=>l.id===g)+1;return k.splice(Math.max(0,N),0,C),{...a,version:2,layers:k}}function kc(a,p,g){const w=a.layers.find(k=>k.id===p);if(!w||w.locked||!w.visible)throw new Error("所选图层已变化、锁定或隐藏，未应用笔画。");if(w.kind!=="paint"&&g.tool==="paint")throw new Error("请使用独立涂鸦图层绘制。");if(w.kind==="paint"&&["blur","mosaic","restoreEffects"].includes(g.tool))throw new Error("请先选择图片图层。");const C=a.layers.map(k=>k.id!==p?k:k.kind==="paint"?{...k,paint:{...k.paint,strokes:[...k.paint.strokes,g]}}:{...k,effects:[...k.effects??[],g]});return{...a,version:2,layers:C}}function Cc(a,p){const g=a.layers.find(w=>w.id===p);if(!g||g.locked||!g.visible)throw new Error("当前图层不可编辑。");return{...a,layers:a.layers.map(w=>w.id!==p?w:w.kind==="paint"?{...w,paint:{...w.paint,strokes:[]}}:{...w,effects:[]})}}const _c=32e6,Ec=8e6,Sc=2,Qi=64;function Pn(a,p){const g=document.createElement("canvas");g.width=a,g.height=p;const w=g.getContext("2d",{willReadFrequently:!0});if(!w)throw g.width=g.height=0,new Error("当前浏览器不支持画笔所需的 Canvas 2D。");return{canvas:g,context:w}}function Qt(a){a&&(a.canvas.width=a.canvas.height=0)}function Es(a){Qt(a.base),Qt(a.output),Qt(a.content),Qt(a.removed);for(const p of a.variants.values())Qt(p);a.variants.clear(),a.signatures.length=0}function jc(a){const p=Pn(a.width,a.height);return p.context.drawImage(a,0,0),p}function $c(a,p,g){let w=1/0,C=1/0,k=-1/0,N=-1/0;for(const J of a.points)w=Math.min(w,J.x),C=Math.min(C,J.y),k=Math.max(k,J.x),N=Math.max(N,J.y);const l=Math.max(0,Math.floor(w-a.sizeX/2-1)),v=Math.max(0,Math.floor(C-a.sizeY/2-1)),I=Math.min(p,Math.ceil(k+a.sizeX/2+1)),D=Math.min(g,Math.ceil(N+a.sizeY/2+1));if(!(I<=l||D<=v||a.opacity===0))return{x:l,y:v,width:I-l,height:D-v}}function Ss(a,p,g){const w=p.points[0];if(!w)return;const C=p.sizeX/2,k=p.sizeY/2;if(a.beginPath(),p.points.length===1){a.ellipse(w.x/C,w.y/k,g,g,0,0,Math.PI*2),a.fill();return}a.moveTo(w.x/C,w.y/k);for(let N=1;N<p.points.length;N++){const l=p.points[N];l&&a.lineTo(l.x/C,l.y/k)}a.lineWidth=g*2,a.lineCap="round",a.lineJoin="round",a.stroke(),a.beginPath(),a.arc(w.x/C,w.y/k,g,0,Math.PI*2),a.fill()}function Mc(a,p,g){const w=p.surface.context;w.fillStyle="#010203",w.fillStyle=g;const C=w.fillStyle;if(w.fillStyle="#040506",w.fillStyle=g,C!==w.fillStyle)throw new Error("画笔颜色无效，请使用合法的 CSS 颜色。");w.globalCompositeOperation="source-in",w.fillRect(0,0,p.width,p.height),w.globalCompositeOperation="source-over",a.context.drawImage(p.surface.canvas,p.x,p.y)}function Nc(a,p,g){if(!a.removed&&g)return;a.removed??=Pn(a.width,a.height);const w=a.removed.context;w.globalCompositeOperation=g?"destination-out":"source-over",w.drawImage(p.surface.canvas,p.x,p.y),w.globalCompositeOperation="source-over"}function zc(a,p){if(!a.base)return;a.content??=Pn(a.width,a.height);const g=a.content.context.getImageData(p.x,p.y,p.width,p.height),w=a.base.context.getImageData(p.x,p.y,p.width,p.height),C=p.surface.context.getImageData(0,0,p.width,p.height);for(let k=0;k<g.data.length;k+=4){const N=(C.data[k+3]??0)/255;if(N===0)continue;const l=g.data[k+3]??0,v=w.data[k+3]??0,I=Math.min(v,l*(1-N)+v*N);for(let D=0;D<3;D++){const J=k+D;g.data[J]=I>0?((g.data[J]??0)*l*(1-N)+(w.data[J]??0)*v*N)/I:0}g.data[k+3]=I}a.content.context.putImageData(g,p.x,p.y)}function Ic(a,p){const g=Pn(a.canvas.width,a.canvas.height);try{if(p>0&&!("filter"in g.context))throw new Error("当前浏览器不支持局部模糊，请更换支持 Canvas 滤镜的浏览器。");g.context.filter=p>0?`blur(${p}px)`:"none",g.context.drawImage(a.canvas,0,0),g.context.filter="none";const w=a.context.getImageData(0,0,a.canvas.width,a.canvas.height),C=g.context.getImageData(0,0,a.canvas.width,a.canvas.height);for(let k=0;k<C.data.length;k+=4)C.data[k+3]===0&&(C.data[k]=w.data[k]??0,C.data[k+1]=w.data[k+1]??0,C.data[k+2]=w.data[k+2]??0),C.data[k+3]=w.data[k+3]??0;return g.context.putImageData(C,0,0),g}catch(w){throw Qt(g),w}}function Pc(a,p){const{width:g,height:w}=a.canvas,C=Pn(g,w);try{const k=a.context.getImageData(0,0,g,w),N=C.context.createImageData(g,w);for(let l=0;l<w;l+=p)for(let v=0;v<g;v+=p){const I=Math.min(g,v+p),D=Math.min(w,l+p);let J=0,ce=0,V=0,G=0;for(let ee=l;ee<D;ee++)for(let z=v;z<I;z++){const $=(ee*g+z)*4,te=k.data[$+3]??0;G+=te,J+=(k.data[$]??0)*te,ce+=(k.data[$+1]??0)*te,V+=(k.data[$+2]??0)*te}for(let ee=l;ee<D;ee++)for(let z=v;z<I;z++){const $=(ee*g+z)*4;N.data[$]=G>0?J/G:0,N.data[$+1]=G>0?ce/G:0,N.data[$+2]=G>0?V/G:0,N.data[$+3]=k.data[$+3]??0}}return C.context.putImageData(N,0,0),C}catch(k){throw Qt(C),k}}function Lc(a,p){if(!a.base)throw new Error("图层缺少原始像素。");if(p.tool==="restoreEffects")return a.base;const g=a.paint?a.content:a.base;if(!g)throw new Error("图层缺少可见像素。");const w=p.tool==="blur"?`blur:${p.strength}`:`mosaic:${p.blockSize}`,C=a.variants.get(w);if(C)return a.variants.delete(w),a.variants.set(w,C),C;const k=a.width*a.height;for(;a.variants.size>0&&(a.variants.size>=Sc||(a.variants.size+1)*k>Ec);){const l=a.variants.entries().next().value;if(!l)break;a.variants.delete(l[0]),Qt(l[1])}const N=p.tool==="blur"?Ic(g,p.strength):Pc(g,p.blockSize);return a.variants.set(w,N),N}function Tc(a,p,g){if(!a.base)return;const w=Lc(a,p);a.content??=jc(a.base.canvas);const C=a.content.context.getImageData(g.x,g.y,g.width,g.height),k=w.context.getImageData(g.x,g.y,g.width,g.height),N=g.surface.context.getImageData(0,0,g.width,g.height);for(let l=0;l<C.data.length;l+=4){const v=(N.data[l+3]??0)/255;if(!(v===0||C.data[l+3]===0))for(let I=0;I<3;I++){const D=l+I,J=C.data[D]??0;C.data[D]=J+((k.data[D]??0)-J)*v}}a.content.context.putImageData(C,g.x,g.y)}function Rc(){const a=new Map;let p=0,g,w=!1;function C(v){const I=a.get(v);I&&(a.delete(v),p-=I.width*I.height,Es(I),Qt(g),g=void 0)}function k(v,I,D){const J=v.clip;if(J&&(J.x+J.width>I||J.y+J.height>D))throw new Error("笔画裁剪范围超出原图尺寸。");const ce=$c(v,I,D);if(!ce)return;g?(g.canvas.width!==ce.width||g.canvas.height!==ce.height)&&(g.canvas.width=ce.width,g.canvas.height=ce.height):g=Pn(ce.width,ce.height);const V=g.context;if(V.setTransform(1,0,0,1,0,0),V.globalCompositeOperation="source-over",V.globalAlpha=1,V.fillStyle="#000",V.fillRect(0,0,ce.width,ce.height),V.setTransform(v.sizeX/2,0,0,v.sizeY/2,-ce.x,-ce.y),v.hardness===1)V.fillStyle=V.strokeStyle="#fff",Ss(V,v,1);else for(let ee=1;ee<=Qi;ee++){const z=Math.round(ee/Qi*255),$=Math.max(1e-6,1-(1-v.hardness)*ee/Qi);V.fillStyle=V.strokeStyle=`rgb(${z},${z},${z})`,Ss(V,v,$)}V.setTransform(1,0,0,1,0,0);const G=V.getImageData(0,0,ce.width,ce.height);for(let ee=0;ee<G.data.length;ee+=4){const z=G.data[ee]??0;G.data[ee]=G.data[ee+1]=G.data[ee+2]=255;const $=ce.x+ee/4%ce.width,te=ce.y+Math.floor(ee/4/ce.width),Y=J&&($<J.x||te<J.y||$>=J.x+J.width||te>=J.y+J.height);G.data[ee+3]=Y?0:Math.round(z*v.opacity)}return V.putImageData(G,0,0),{...ce,surface:g}}function N(v,I,D){for(let V=D;V<I.length;V++){const G=I[V];if(!G)continue;const ee=k(G,v.width,v.height);if(ee){if(v.paint){for(const z of v.variants.values())Qt(z);v.variants.clear()}G.tool==="paint"?(v.base??=Pn(v.width,v.height),v.content??=Pn(v.width,v.height),Mc(v.base,ee,G.color),v.content.context.drawImage(ee.surface.canvas,ee.x,ee.y)):v.paint&&G.tool==="erase"?v.content&&(v.content.context.globalCompositeOperation="destination-out",v.content.context.drawImage(ee.surface.canvas,ee.x,ee.y),v.content.context.globalCompositeOperation="source-over"):v.paint&&G.tool==="restore"?zc(v,ee):G.tool==="erase"||G.tool==="restore"?Nc(v,ee,G.tool==="restore"):Tc(v,G,ee)}}const J=v.output.context;J.clearRect(0,0,v.output.canvas.width,v.output.canvas.height);const ce=v.paint?v.content:v.content??v.base;ce&&J.drawImage(ce.canvas,0,0),!v.paint&&v.removed&&(J.globalCompositeOperation="destination-out",J.drawImage(v.removed.canvas,0,0),J.globalCompositeOperation="source-over")}function l(v,I){if(w)throw new Error("画笔渲染器已释放，不能继续使用。");const D=v.paint===void 0?void 0:Us(v.paint),J=Xs(v.effects);if(D&&J&&J.length>0)throw new Error("涂鸦笔画应保存在 paint 中，不能同时包含图片特效笔画。");const ce=D?D.strokes:J??[];if(!D&&!I)throw new Error("图片笔画渲染缺少原始像素来源。");if(!D&&ce.length===0){if(C(v.id),!I)throw new Error("图片笔画渲染缺少原始像素来源。");return I}if(!D&&ce.some(L=>L.tool==="paint"))throw new Error("图片上不能直接写入涂鸦，请创建独立涂鸦图层。");const V=D?D.width:I?.width??0,G=D?D.height:I?.height??0;if(pi(V,G),!Number.isInteger(V)||!Number.isInteger(G))throw new Error("原图尺寸须为整数像素。");const ee=D?null:I,z=ce.map(L=>JSON.stringify(L));let $=a.get(v.id);const te=$!==void 0&&$.source===ee&&$.paint===(D!==void 0)&&$.width===V&&$.height===G,Y=te&&$!==void 0&&$.signatures.length<=z.length&&$.signatures.every((L,P)=>L===z[P]);if(!Y&&te&&!D&&$)Qt($.content),Qt($.removed),$.content=void 0,$.removed=void 0,$.signatures=[];else if(!Y){const L=V*G,P=$?$.width*$.height:0;if(p-P+L>_c)throw new Error("同时编辑的图层总像素超过3200万，请先减少编辑图层或降低图层尺寸。");C(v.id);const q=D?void 0:Pn(V,G);try{q&&I&&q.context.drawImage(I,0,0),$={source:ee,paint:D!==void 0,width:V,height:G,base:q,output:Pn(V,G),variants:new Map,signatures:[]},a.set(v.id,$),p+=L}catch(W){throw Qt(q),Qt(g),g=void 0,W}}if(!$)throw new Error("无法创建图层笔画缓存。");if(a.delete(v.id),a.set(v.id,$),$.signatures.length===z.length&&Y)return $.output.canvas;try{return N($,ce,$.signatures.length),$.signatures=z,$.output.canvas}catch(L){throw C(v.id),L}}return{render:l,invalidate:C,dispose(){for(const v of a.values())Es(v);a.clear(),p=0,Qt(g),g=void 0,w=!0}}}const Oc="_toolbar_1givo_1",Ac="_properties_1givo_2",Fc="_modes_1givo_12",Dc="_actions_1givo_13",qc="_quickSettings_1givo_14",Bc="_quickField_1givo_32",Hc="_quickColor_1givo_33",Xc="_quickSizeOutput_1givo_46",Uc="_toolbarHint_1givo_57",Wc="_eyedropperHint_1givo_58",Yc="_button_1givo_71",Jc="_heading_1givo_124",Vc="_currentTool_1givo_139",Kc="_target_1givo_144",Gc="_field_1givo_160",Zc="_colorField_1givo_169",Qc="_number_1givo_179",ep="_range_1givo_196",tp="_hints_1givo_229",np="_privacy_1givo_244",ft={toolbar:Oc,properties:Ac,modes:Fc,actions:Dc,quickSettings:qc,quickField:Bc,quickColor:Hc,quickSizeOutput:Xc,toolbarHint:Uc,eyedropperHint:Wc,button:Yc,heading:Jc,currentTool:Vc,target:Kc,field:Gc,colorField:Zc,number:Qc,range:ep,hints:tp,privacy:np},ea={select:"选择",eyedropper:"吸色",paint:"画笔",erase:"橡皮擦",restore:"恢复像素",blur:"模糊",mosaic:"马赛克",restoreEffects:"恢复遮挡"},rp=["select","paint","eyedropper","erase","blur","mosaic"];function js(a){a.target instanceof HTMLInputElement&&!a.ctrlKey&&!a.metaKey&&!a.altKey&&a.stopPropagation()}function Sr(a,p,g,w){const C=typeof a=="string"&&a.trim()===""?NaN:Number(a);return Math.min(g,Math.max(p,Math.round(Number.isFinite(C)?C:w)))}function $s(a){return{size:Sr(a.size,1,512,Er.size),color:a.color,opacity:Sr(a.opacity*100,0,100,Er.opacity*100)/100,hardness:Sr(a.hardness*100,0,100,Er.hardness*100)/100,strength:Sr(a.strength,1,64,Er.strength),blockSize:Sr(a.blockSize,2,128,Er.blockSize)}}function So({label:a,value:p,min:g,max:w,disabled:C,onCommit:k}){const N=rt.useId(),[l,v]=rt.useState(null);return X.jsxs("div",{className:ft.field,children:[X.jsx("label",{htmlFor:N,children:a}),X.jsx("input",{id:N,className:ft.number,type:"number",inputMode:"numeric",min:g,max:w,step:1,disabled:C,value:l??p,onChange:I=>v(I.currentTarget.value),onBlur:I=>{!C&&l!==null&&k(Sr(I.currentTarget.value,g,w,p)),v(null)},onKeyDown:I=>{I.key==="Enter"&&!I.nativeEvent.isComposing&&(I.preventDefault(),I.currentTarget.blur())}}),X.jsx("input",{className:ft.range,type:"range","aria-label":`${a}滑块`,min:g,max:w,step:1,value:p,disabled:C,onChange:I=>{v(null),k(Sr(I.currentTarget.value,g,w,p))}})]})}function op({state:a,ports:p,properties:g}){const{tool:w,enabled:C,canImage:k,canPaint:N,targetKind:l}=a,v=$s(a.settings),I=w==="erase"||w==="restore",D=w==="blur"||w==="mosaic"||w==="restoreEffects",J=N||k,ce=!C||I&&!J||D&&!k,V=rt.useId(),G=rt.useId(),ee=rt.useId(),z=/^#[\da-f]{6}$/i.test(v.color)?v.color:Er.color,$=Y=>{ce||p.onSettings($s({...v,...Y}))},te=(Y,L=ea[Y],P=w===Y)=>{const q=!C||(Y==="erase"||Y==="restore")&&!J||(Y==="blur"||Y==="mosaic"||Y==="restoreEffects")&&!k;return X.jsx("button",{type:"button",className:ft.button,"aria-pressed":P,disabled:q,onClick:()=>{q||p.onTool(Y)},children:L},Y)};return X.jsxs(X.Fragment,{children:[X.jsxs("div",{className:ft.toolbar,role:"group","aria-label":"画布绘制工具",onKeyDown:js,children:[rp.map(Y=>te(Y,ea[Y],w===Y||Y==="erase"&&w==="restore")),X.jsxs("div",{className:ft.quickSettings,role:"group","aria-label":"快捷画笔参数",children:[X.jsxs("div",{className:ft.quickField,children:[X.jsx("label",{htmlFor:ee,children:"快捷笔刷大小 / px"}),X.jsxs("output",{className:ft.quickSizeOutput,htmlFor:ee,children:[v.size," px"]}),X.jsx("input",{id:ee,className:ft.range,type:"range",min:1,max:512,step:1,value:v.size,"aria-valuetext":`${v.size} px`,disabled:ce,onChange:Y=>$({size:Number(Y.currentTarget.value)})})]}),X.jsxs("div",{className:ft.quickColor,children:[X.jsx("label",{htmlFor:G,children:"颜色"}),X.jsx("input",{id:G,type:"color","aria-label":"快捷画笔颜色",value:z,disabled:ce,onChange:Y=>$({color:Y.currentTarget.value})})]})]}),X.jsx("button",{type:"button",className:ft.button,disabled:!C,onClick:()=>{C&&p.onNewPaint()},children:"新建涂鸦"}),X.jsx("p",{className:ft.toolbarHint,children:"滚轮缩放 · 按住鼠标中键平移 · I 吸色"})]}),zs.createPortal(w==="select"?null:X.jsxs("section",{className:ft.properties,"aria-label":"画布画笔参数",onKeyDown:js,children:[X.jsxs("div",{className:ft.heading,children:[X.jsx("h3",{children:"当前工具"}),X.jsx("span",{className:ft.currentTool,children:ea[w]})]}),w==="eyedropper"?X.jsx("p",{className:ft.eyedropperHint,children:"点击合成画面取色；透明区域不改变颜色，取色后返回画笔。"}):X.jsxs(X.Fragment,{children:[X.jsxs("p",{className:ft.target,role:"status",children:["当前目标：",a.targetLabel||"未选择图层",!C&&"（暂不可编辑）"]}),I&&X.jsxs("div",{className:ft.modes,role:"group","aria-label":"橡皮擦模式",children:[te("erase","擦除"),te("restore","恢复像素")]}),D&&X.jsxs("div",{className:ft.modes,role:"group","aria-label":"图片效果模式",children:[te("blur"),te("mosaic"),te("restoreEffects","恢复遮挡")]}),X.jsx(So,{label:"笔刷大小 · 画布 px",value:v.size,min:1,max:512,disabled:ce,onCommit:Y=>$({size:Y})}),w==="paint"&&X.jsxs("div",{className:ft.colorField,children:[X.jsx("label",{htmlFor:V,children:"画笔颜色"}),X.jsx("input",{id:V,type:"color",value:z,disabled:ce,onChange:Y=>$({color:Y.currentTarget.value})})]}),(w==="paint"||I)&&X.jsx(So,{label:"不透明度 · %",value:Math.round(v.opacity*100),min:0,max:100,disabled:ce,onCommit:Y=>$({opacity:Y/100})}),w!=="mosaic"&&X.jsx(So,{label:"笔刷硬度 · %",value:Math.round(v.hardness*100),min:0,max:100,disabled:ce,onCommit:Y=>$({hardness:Y/100})}),w==="blur"&&X.jsx(So,{label:"模糊强度 · 原图 px",value:v.strength,min:1,max:64,disabled:ce,onCommit:Y=>$({strength:Y})}),w==="mosaic"&&X.jsx(So,{label:"马赛克块大小 · 原图 px",value:v.blockSize,min:2,max:128,disabled:ce,onCommit:Y=>$({blockSize:Y})}),X.jsxs("div",{className:ft.actions,children:[X.jsx("button",{type:"button",className:ft.button,disabled:!C,onClick:()=>{C&&p.onNewPaint()},children:"新建涂鸦"}),X.jsx("button",{type:"button",className:ft.button,disabled:!C||!a.canClear,onClick:()=>{C&&a.canClear&&p.onClear()},children:l==="paint"?"清空当前涂鸦":l==="image"?"恢复整张图片效果":"清空当前目标"})]}),X.jsxs("footer",{className:ft.hints,children:[X.jsx("p",{children:"在合成画布上直接绘制。涂鸦是独立图层；橡皮擦与恢复像素作用于所选图片或涂鸦。"}),X.jsx("p",{children:"模糊、马赛克与恢复遮挡只作用于所选图片，保留原图，不改变独立涂鸦。"}),X.jsx("p",{className:ft.privacy,children:"隐私提醒：模糊和马赛克不是安全的敏感信息脱敏方式。"}),X.jsx("p",{"aria-label":"键盘快捷键",children:"I 吸色 · V 选择 · B 画笔 · E 橡皮擦 · [ / ] 大小 · 按住 Space（空格）临时平移"})]})]})]}),g)]})}function ip(a,p,g){a.dataset.composerBrush="",p.dataset.composerBrush="";const w=Ns.createRoot(a);let C=!1;return{update(k){C||w.render(X.jsx(op,{state:k,ports:g,properties:p}))},dispose(){C||(C=!0,w.unmount(),delete a.dataset.composerBrush,delete p.dataset.composerBrush)}}}const ap="_viewport_19d12_1",sp="_stage_19d12_7",lp="_artboard_19d12_20",dp="_surface_19d12_30",cp="_cursor_19d12_39",pp="_center_19d12_65",Qr={viewport:ap,stage:sp,artboard:lp,surface:dp,cursor:cp,center:pp};function up(a){const p=document.createElement("canvas");p.className=Qr.surface,p.dataset.brushSurface="",p.setAttribute("aria-label","涂抹画布"),p.tabIndex=0;const g=document.createElement("span");g.className=Qr.cursor,g.setAttribute("aria-hidden","true"),g.dataset.brushCursor="";const w=document.createElement("span");g.append(w),g.hidden=!0,a.surface.append(p,g);let C="select",k={...Er},N=null,l=0,v=!1,I=null,D=null,J=!1,ce=!1;const V=new AbortController,G=ip(a.toolbar,a.properties,{onTool:M=>{q(),C=M,D=null,J=!0,$()},onSettings:M=>{k=M,D=null,J=!0,$()},onClear:()=>{q(),a.canEdit()&&a.onClear()},onNewPaint:()=>{q(),a.canEdit()&&(a.onNewPaint(),C="paint",$())}});function ee(M){return JSON.stringify([M.layer.id,M.layer.x,M.layer.y,M.layer.width,M.layer.height,M.layer.angle,M.layer.crop,M.source])}function z(M){const F=M.target?.layer;return M.enabled&&(!F||!F.locked&&F.visible)}function $(){if(ce)return;const M=a.getState(),F=M.target;N&&(!M.enabled||F?.layer.locked||F?.layer.visible===!1||N.id!==null&&(!F||ee(F)!==N.signature))&&q(),M.enabled||(v=!1,I&&q());const ue=M.enabled&&(C!=="select"||v||!!I);p.style.pointerEvents=ue?"auto":"none",p.tabIndex=ue?0:-1,p.style.cursor=v||I?I?"grabbing":"grab":"crosshair",Y(),a.onMode(ue),G.update({tool:C,settings:k,enabled:M.enabled,targetLabel:C==="paint"&&F?.layer.kind!=="paint"?"新涂鸦（落笔创建，不修改图片）":F?.layer.name??"请先选择图片或使用画笔",targetKind:F?.layer.kind,canImage:z(M)&&F?.layer.kind==="image",canPaint:z(M)&&!!F,canClear:z(M)&&!!F})}function te(M){const F=p.getBoundingClientRect(),ue=a.getState();return{x:((M.clientX-F.left)*p.width/F.width-ue.offsetX)/ue.scale,y:((M.clientY-F.top)*p.height/F.height-ue.offsetY)/ue.scale}}function Y(){const M=a.surface.getBoundingClientRect(),F=a.getState(),ue=M.width/Math.max(1,p.width),Ce=k.size*F.scale*ue,Ee=D??{x:Math.max(0,Math.min(M.width,(F.offsetX+F.width*F.scale/2)*ue)),y:Math.max(0,Math.min(M.height,(F.offsetY+F.height*F.scale/2)*ue))};g.style.width=g.style.height=`${Ce}px`,g.style.left=`${Ee.x}px`,g.style.top=`${Ee.y}px`,w.textContent=`${k.size} px`,g.hidden=!J||v||!!I||C==="select"||C==="eyedropper"||!z(F)}function L(M){const F=a.surface.getBoundingClientRect();D={x:M.clientX-F.left,y:M.clientY-F.top},J=!0,Y()}function P(){p.getContext("2d")?.clearRect(0,0,p.width,p.height)}function q(){l&&cancelAnimationFrame(l),l=0;const M=N;N=null,M?.id&&a.onPreview(M.id,null);const F=I?.id;I=null,M&&p.hasPointerCapture(M.pointerId)&&p.releasePointerCapture(M.pointerId),F!==void 0&&p.hasPointerCapture(F)&&p.releasePointerCapture(F),P()}function W(){l=0;const M=N;if(!(!M||!a.canEdit()))try{if(M.id!==null)a.onPreview(M.id,M.stroke);else{P();const F=p.getContext("2d"),ue=M.stroke.points[0];if(!F||!ue)return;const Ce=a.getState();F.save(),F.setTransform(Ce.scale,0,0,Ce.scale,Ce.offsetX,Ce.offsetY),F.strokeStyle=F.fillStyle=M.stroke.color,F.globalAlpha=M.stroke.opacity,F.lineWidth=k.size,F.lineCap=F.lineJoin="round",F.beginPath(),F.moveTo(ue.x,ue.y);for(const Ee of M.stroke.points)F.lineTo(Ee.x,Ee.y);F.stroke(),M.stroke.points.length===1&&(F.beginPath(),F.arc(ue.x,ue.y,k.size/2,0,Math.PI*2),F.fill()),F.restore()}}catch(F){q(),a.onError(F)}}function A(){l||(l=requestAnimationFrame(W))}function oe(M){const F=N;if(!F)return;const ue=Cs(F.target.layer,F.target.source,te(M)),Ce=F.stroke.points.at(-1);if(!(Ce&&Math.hypot((ue.x-Ce.x)/F.stroke.sizeX,(ue.y-Ce.y)/F.stroke.sizeY)<.025)){if(F.stroke.points.length>=12e3){q(),a.onError(new Error("单笔过长，请分成多笔绘制。"));return}F.stroke.points.push({x:Math.round(ue.x*100)/100,y:Math.round(ue.y*100)/100})}}return a.surface.addEventListener("wheel",M=>{if(M.preventDefault(),M.stopPropagation(),!a.canEdit())return;q();const F=p.getBoundingClientRect(),ue=M.deltaY*(M.deltaMode===1?16:M.deltaMode===2?F.height:1);a.onZoom({x:(M.clientX-F.left)*p.width/F.width,y:(M.clientY-F.top)*p.height/F.height},Math.exp(-Math.max(-600,Math.min(600,ue))*.002)),$()},{signal:V.signal,passive:!1}),a.surface.addEventListener("pointerdown",M=>{const F=M.button===1;if(M.button!==0&&!F||I||!a.canEdit())return;if(N){if(!F)return;q()}if(C==="select"&&!v&&!F)return;if(M.preventDefault(),M.stopPropagation(),p.focus({preventScroll:!0}),C==="eyedropper"&&!v&&!F){try{const R=a.sampleColor(te(M));R&&(k={...k,color:R},C="paint"),$()}catch(R){a.onError(R)}return}if(v||F){I={id:M.pointerId,x:M.clientX,y:M.clientY,button:F?1:0},p.setPointerCapture(M.pointerId),$();return}const ue=a.getState();if(!z(ue)||C==="select"||C==="eyedropper")return;let Ce=ue.target;const Ee=C==="paint"&&Ce?.layer.kind!=="paint";if(Ee&&(Ce={layer:{id:"",kind:"paint",name:"新涂鸦",x:0,y:0,width:ue.width,height:ue.height,angle:0,locked:!1,visible:!0},source:{width:ue.width,height:ue.height}}),!Ce||(C==="blur"||C==="mosaic"||C==="restoreEffects")&&Ce.layer.kind!=="image")return;const Ae=Cs(Ce.layer,Ce.source,te(M)),Te=ir(Ce.layer,Ce.source);if(Ae.x<Te.x||Ae.y<Te.y||Ae.x>Te.x+Te.width||Ae.y>Te.y+Te.height)return;const de=bc(Ce.layer,Ce.source,k.size),T={tool:C,points:[],...de,color:k.color,opacity:["blur","mosaic","restoreEffects"].includes(C)?1:k.opacity,hardness:C==="mosaic"?1:k.hardness,strength:k.strength,blockSize:k.blockSize,clip:{...Te}};if(Math.max(T.sizeX,T.sizeY)>16384){a.onError(new Error("当前图层缩放过小，请减小笔刷或放大图层后绘制。"));return}N={pointerId:M.pointerId,id:Ee?null:Ce.layer.id,target:Ce,stroke:T,signature:ee(Ce)},oe(M),p.setPointerCapture(M.pointerId),A()},{signal:V.signal,capture:!0}),a.surface.addEventListener("auxclick",M=>{M.button===1&&(M.preventDefault(),M.stopPropagation())},{signal:V.signal}),a.surface.addEventListener("mousedown",M=>{M.button===1&&(M.preventDefault(),M.stopPropagation(),N&&(q(),$()))},{signal:V.signal,capture:!0}),a.surface.addEventListener("mouseup",M=>{I?.button===M.button&&(q(),$())},{signal:V.signal,capture:!0}),p.addEventListener("pointermove",M=>{if(L(M),I?.id===M.pointerId){if(!a.canEdit()||!(M.buttons&(I.button===1?4:1))){q(),$();return}const F=p.getBoundingClientRect();a.onPan((M.clientX-I.x)*p.width/F.width,(M.clientY-I.y)*p.height/F.height),I.x=M.clientX,I.y=M.clientY;return}if(N?.pointerId===M.pointerId){if(!a.canEdit()||M.buttons!==1){q(),$();return}for(const F of M.getCoalescedEvents?.()??[M])oe(F);oe(M),A()}},{signal:V.signal}),p.addEventListener("pointerup",M=>{if(I?.id===M.pointerId){I=null,p.releasePointerCapture(M.pointerId),$();return}const F=N;if(!(!F||F.pointerId!==M.pointerId)){if(!a.canEdit()){q(),$();return}if(oe(M),N===F){N=null,l&&cancelAnimationFrame(l),l=0,P(),p.hasPointerCapture(M.pointerId)&&p.releasePointerCapture(M.pointerId);try{!a.onStroke(F.id,F.stroke)&&F.id&&a.onPreview(F.id,null)}catch(ue){F.id&&a.onPreview(F.id,null),a.onError(ue)}$()}}},{signal:V.signal}),p.addEventListener("pointercancel",()=>{q(),$()},{signal:V.signal}),p.addEventListener("lostpointercapture",()=>{(N||I)&&(q(),$())},{signal:V.signal}),p.addEventListener("pointerleave",()=>{J=!1,g.hidden=!0},{signal:V.signal}),a.dialog.addEventListener("keydown",M=>{if(M.isComposing||M.target instanceof HTMLElement&&M.target.closest('input,textarea,select,[contenteditable="true"],dialog[data-image-crop]'))return;if(M.ctrlKey||M.metaKey||M.altKey){N&&q();return}if(M.code==="Space"){if(M.target instanceof HTMLElement&&M.target.closest('button,a,summary,[role="button"]')||(M.preventDefault(),v))return;v=!0,q(),$();return}const F={v:"select",b:"paint",e:"erase",i:"eyedropper"};if(M.key.toLowerCase()in F){const ue=F[M.key.toLowerCase()];ue&&(q(),C=ue,J=!0,$())}else M.key==="["||M.key==="]"?(M.preventDefault(),k={...k,size:Math.max(1,Math.min(512,k.size+(M.key==="["?-4:4)))},J=!0,$()):M.key==="Escape"&&(N||I||C!=="select")&&(M.preventDefault(),q(),C="select",$())},{signal:V.signal,capture:!0}),a.dialog.addEventListener("keyup",M=>{M.code==="Space"&&(v=!1,I?.button===0&&q(),$())},{signal:V.signal,capture:!0}),window.addEventListener("blur",()=>{v=!1,q(),$()},{signal:V.signal}),{update:$,resize(M,F){p.width===M&&p.height===F||(q(),p.width=M,p.height=F,D=null,$())},cancel:q,dispose(){ce||(q(),ce=!0,V.abort(),G.dispose(),p.width=p.height=0,p.remove(),g.remove(),a.surface.style.cursor="")}}}const Vs=.01,fp=32,Ms=16;function mp(a,p){if(![a.width,a.height].every(w=>Number.isFinite(w)&&w>=0)||![p.width,p.height].every(w=>Number.isFinite(w)&&w>0))throw new Error("视口和画布尺寸无效。");const g=Math.max(Vs,Math.min(Math.max(0,a.width-Ms*2)/p.width,Math.max(0,a.height-Ms*2)/p.height,1));return{scale:g,offsetX:(a.width-p.width*g)/2,offsetY:(a.height-p.height*g)/2}}function hp(a,p,g){if(![a.scale,g].every(k=>Number.isFinite(k)&&k>0)||![a.offsetX,a.offsetY,p.x,p.y].every(Number.isFinite))throw new Error("缩放参数无效。");const w=In(a.scale*g,Vs,fp),C=w/a.scale;return{scale:w,offsetX:p.x-(p.x-a.offsetX)*C,offsetY:p.y-(p.y-a.offsetY)*C}}function gp(a,p,g){const w=Math.floor(p.x),C=Math.floor(p.y);if(!Number.isFinite(w)||!Number.isFinite(C)||w<0||C<0||w>=a.width||C>=a.height)return null;const k=document.createElement("canvas");try{k.width=k.height=1;const N=k.getContext("2d",{willReadFrequently:!0});if(!N)throw new Error("当前浏览器不支持吸色所需的 Canvas 2D。");a.background!=="transparent"&&(N.fillStyle=a.background,N.fillRect(0,0,1,1));for(const J of a.layers){if(!J.visible||J.opacity===0)continue;const ce=g(J),V=ir(J.kind==="paint"?{}:J,ce);N.setTransform(1,0,0,1,J.x-w,J.y-C),N.rotate(J.angle*Math.PI/180),N.globalAlpha=J.opacity,N.drawImage(ce,V.x,V.y,V.width,V.height,0,0,J.width,J.height)}const[l=0,v=0,I=0,D=0]=N.getImageData(0,0,1,1).data;return D===0?null:`#${[l,v,I].map(J=>J.toString(16).padStart(2,"0")).join("")}`}finally{k.width=k.height=0}}function bp(a,p,g,w){const{window:C,document:k,addEventListener:N,setTimeout:l,clearTimeout:v,setInterval:I,clearInterval:D,requestAnimationFrame:J,cancelAnimationFrame:ce,ResizeObserver:V,MutationObserver:G,IntersectionObserver:ee,URL:z}=a;C.H3Auth=p,C.H3Notify=g;const $=w.mediaFetch;return(()=>{const te=new z("/",location.href),Y=8192,L=32e6,P=100,q=512,W=64e6,A=64*1024*1024;let oe;const M=le=>JSON.parse(JSON.stringify(le)),F=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),le=>le.toString(16).padStart(2,"0")).join(""),ue=(le,c)=>Number.isFinite(le)&&Number.isFinite(c)&&le>=1&&c>=1&&le<=Y&&c<=Y&&le*c<=L;function Ce(le,c){if(!ue(le,c))throw new Error("图片或画布超出限制：单边 1–8192 像素，总像素不超过 3200 万。")}function Ee(le){if(typeof le!="string"||!le||le.length>8192)throw new Error("图片地址无效。");const c=new z(le,location.href),pe=c.pathname==="/api/file"||/^\/api\/upload\/[^/]+$/.test(c.pathname)||/^\/api\/artifact\/[^/]+\/[^/]+$/.test(c.pathname);if(!/^https?:$/.test(c.protocol)||c.origin!==location.origin||c.username||c.password||!pe||c.hash)throw new Error("仅支持本站受控媒体地址（/api/file、/api/upload/文件名、/api/artifact/项目/文件名）；不接受其他路径、外站、data 或 blob 地址。");if(c.searchParams.sort(),c.href.length>8192)throw new Error("图片地址过长。");return c.href}function Ae(le){if(!le||le.kind!=="image")throw new Error("只能添加图片资产。");const c=JSON.stringify(le);if(c.length>262144)throw new Error("图片资产描述过大，请勿在编辑稿中嵌入图片数据。");const pe=JSON.parse(c);return Ee(pe.url),pe}function Te(le){const c=pe=>typeof pe=="string"?pe.trim().split(/[\\/]/).filter(Boolean).at(-1):"";return String(c(le.origin)||c(le.filename)||le.name||"图片").slice(0,200)}function de(le){const c=[`url:${Ee(le.url)}`];if(typeof le.ref=="string"&&le.ref.trim()){if(le.ref.length>8192)throw new Error("图片资源标识过长。");c.push(`ref:${le.ref}`)}return c}const T=le=>vc(le,Ae);async function R(le){const c=new Uint8Array(await le.slice(0,1048576).arrayBuffer()),pe=new DataView(c.buffer),Me=(ve,ae)=>String.fromCharCode(...c.subarray(ve,ve+ae));let Be,Q;if(c.length>=24&&Me(1,3)==="PNG"&&pe.getUint32(0)===2303741511)Be=pe.getUint32(16),Q=pe.getUint32(20);else if(c.length>=10&&/^GIF8[79]a$/.test(Me(0,6)))Be=pe.getUint16(6,!0),Q=pe.getUint16(8,!0);else if(c.length>=26&&Me(0,2)==="BM")pe.getUint32(14,!0)===12?(Be=pe.getUint16(18,!0),Q=pe.getUint16(20,!0)):(Be=pe.getInt32(18,!0),Q=Math.abs(pe.getInt32(22,!0)));else if(c.length>=30&&Me(0,4)==="RIFF"&&Me(8,4)==="WEBP")for(let ve=12;ve+18<=c.length;){const ae=Me(ve,4),$t=pe.getUint32(ve+4,!0),ct=ve+8;if(ae==="VP8X"){Be=1+c[ct+4]+(c[ct+5]<<8)+(c[ct+6]<<16),Q=1+c[ct+7]+(c[ct+8]<<8)+(c[ct+9]<<16);break}if(ae==="VP8 "&&c[ct+3]===157&&c[ct+4]===1&&c[ct+5]===42){Be=pe.getUint16(ct+6,!0)&16383,Q=pe.getUint16(ct+8,!0)&16383;break}if(ae==="VP8L"&&c[ct]===47){Be=1+c[ct+1]+((c[ct+2]&63)<<8),Q=1+(c[ct+2]>>6)+(c[ct+3]<<2)+((c[ct+4]&15)<<10);break}ve=ct+$t+$t%2}else if(c[0]===255&&c[1]===216){let ve=2;for(;ve+8<c.length&&c[ve++]===255;){for(;c[ve]===255;)ve++;const ae=c[ve++];if(ae===217||ae===218)break;if(ae===1||ae>=208&&ae<=215)continue;const $t=pe.getUint16(ve);if($t<2)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(ae)){Q=pe.getUint16(ve+3),Be=pe.getUint16(ve+5);break}ve+=$t}}if(Be===void 0||Q===void 0)throw new Error("无法安全识别图片尺寸。请使用标准 PNG、JPEG、WebP、GIF 或 BMP 图片（不支持 SVG / AVIF）。");return Ce(Be,Q),{width:Be,height:Q}}async function ge(le){const c=le.body.getReader(),pe=[];let Me=0;try{for(;;){const Be=await c.read();if(Be.done)break;if(Me+=Be.value.byteLength,Me>A)throw await c.cancel(),new Error("图片文件不得超过 64 MiB。");pe.push(Be.value)}}finally{c.releaseLock()}return new Blob(pe,{type:le.headers.get("content-type")?.split(";")[0]||""})}function Se(){return oe||(oe=(async()=>{if((!C.fabric||C.fabric.version!=="7.4.0")&&await new Promise((le,c)=>{const pe=k.createElement("script");pe.src=new z("vendor/fabric.min.js",te).href,pe.onload=le,pe.onerror=()=>{pe.remove(),c(new Error("本地 Fabric 加载失败，请刷新重试。"))},k.head.append(pe)}),C.fabric?.version!=="7.4.0")throw new Error("需要 Fabric 7.4.0 浏览器构建。")})().catch(le=>{throw oe=null,le}),oe)}function K(le,c,pe){const Me=k.createElement(le);return c&&(Me.className=c),pe!==void 0&&(Me.textContent=pe),Me}async function ie({state:le,sources:c=[],linkedSources:pe=[],upload:Me,onSave:Be,onExport:Q,canEdit:ve=()=>!0}={}){const ae=K("dialog","chouka-composer image-composer-dialog");ae.setAttribute("data-image-composer","");const $t=`composer-${F()}`;ae.setAttribute("aria-labelledby",$t);const ct=K("div","ic-head"),Ln=K("h2","","图片合成");Ln.id=$t;const yn=K("button","ic-button","关闭");yn.type="button",yn.dataset.composerAction="close";const Mt=K("button","ic-button","重试载入");Mt.type="button",Mt.hidden=!0,ct.append(Ln,K("span","ic-local","浏览器本地合成 · 原图尺寸输出"),Mt,yn);const sn=K("div","ic-status");sn.setAttribute("role","status"),sn.setAttribute("aria-live","polite");const Xt=K("div","ic-error");Xt.setAttribute("role","alert"),Xt.hidden=!0;const Jn=K("div","ic-body"),St=K("aside","ic-left"),Ft=K("section","ic-center"),Lt=K("aside","ic-right");St.setAttribute("aria-label","图层和图片素材"),Ft.setAttribute("aria-label","合成画布"),Lt.setAttribute("aria-label","图片与画布属性");const b=K("div","ic-toolbar"),Ve=K("div","ic-viewport"),ln=K("canvas");ln.setAttribute("aria-label","图片合成编辑画布"),Ve.classList.add(Qr.viewport),Ft.classList.add(Qr.center);const xe=K("div",Qr.artboard);xe.dataset.compositionBounds="",Ve.append(ln),Ft.append(b,Ve,K("p","ic-hint","选择工具移动图层；画笔模式直接落笔；按住鼠标中键平移。"));const Tn=K("div","ic-footer"),Mr=K("span","ic-hint","编辑稿保留图片引用与笔画；分享时请导出合成 PNG。");Jn.append(St,Ft,Lt),Tn.append(Mr),ae.append(ct,sn,Xt,Jn,Tn),k.body.append(ae);const fn=k.activeElement;let ne,_e,it=null,gt=!1,en=!1,kn=!1,Rn="",Ut=[],ke=-1,tn,no,Ze,Nr,dn=0,vt=1,Wt=0,cn=0,On=!0,Tt=null,mn=!1;const Ue=new AbortController,nn=new Map,ye=new Map,Vn=new Set,An=Rc(),Dt=K("div"),Qe=K("div");b.prepend(Dt),Lt.prepend(Qe);const Cn=()=>C.fabric,Xe=()=>{try{return ve()===!0}catch(E){return st(E),!1}};function st(E){Xt.textContent=E?.message||String(E),Xt.hidden=!1,console.error("[图片合成]",E)}function qt(){Xt.hidden=!0,Xt.textContent=""}function Yt(){return en||gt||!kn?!1:Xe()?!0:(sn.textContent="只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。",rn(),!1)}function hn(E,H,O,fe=""){const me=K("button",`ic-button ${fe}`,H);me.type="button",E.append(me);const je={撤销:"undo",重做:"redo",适应窗口:"fit",缩小:"zoom-out",放大:"zoom-in","上传图片（支持多选）":"upload",保存编辑稿:"save","合成 PNG":"export",上移:"raise",下移:"lower",置顶:"front",置底:"back",复制:"duplicate",删除:"delete"}[H];return je&&(me.dataset.composerAction=je),me.addEventListener("click",()=>{if(Yt())try{const Z=O();Z?.catch&&Z.catch(st)}catch(Z){st(Z)}}),me}function Fn(E,H,O="number",fe={}){const me=K("label","ic-field"),je=K("span","",H),Z=K("input");return Z.type=O,Object.assign(Z,fe),me.append(je,Z),E.append(me),Z}function rn(){if(en)return;const E=Xe(),H=gt||!kn||!E;for(const me of ae.querySelectorAll("button,input"))me.closest("[data-composer-crop],[data-composer-brush]")||me!==yn&&me!==Mt&&(me.disabled=H||me.dataset.inactive==="1");const O=Nt(),fe=O&&O.kind!=="paint"&&nn.get(Ee(O.asset.url));Ze?.update({enabled:!H,selection:O&&fe?{layer:O,bitmap:fe}:null}),Nr?.update(),yn.disabled=gt,Mt.disabled=gt||!E,ae.setAttribute("aria-busy",String(gt)),_e&&(_e.skipTargetFind=H,_e.selection=!1,_e.upperCanvasEl.style.pointerEvents=H?"none":"",_e.upperCanvasEl.tabIndex=H?-1:0),E||(sn.textContent="只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。")}async function _n(E,H){if(Yt()){gt=!0,qt(),sn.textContent=E,rn();try{return await H()}catch(O){en||st(O)}finally{gt=!1,en||(sn.textContent=Xe()?Xt.hidden?"就绪 · 更改仅在保存编辑稿后持久化":"操作未完成，请检查提示后重试":"只读：当前工具卡已失效。仅可关闭。",Rt())}}}async function ro(E){const H=Ee(E.url);if(nn.has(H))return nn.get(H);const O=await $(H,{credentials:"same-origin",redirect:"error",signal:Ue.signal});if(!O.ok)throw new Error(`图片读取失败（HTTP ${O.status}）。`);if(Number(O.headers.get("content-length"))>A)throw new Error("图片文件不得超过 64 MiB。");const fe=await ge(O);if(fe.size>A||!/^image\/(png|jpeg|webp|gif|bmp|x-ms-bmp)$/i.test(fe.type))throw new Error("仅支持 PNG、JPEG、WebP、GIF、BMP 图片，单文件最多 64 MiB；不支持 SVG / AVIF。");const me=await R(fe);if(dn+me.width*me.height>W)throw new Error("已载入图片总像素超过 6400 万，请关闭后使用较小图片重新编辑。");const je=await createImageBitmap(fe);try{if(Ce(je.width,je.height),dn+je.width*je.height>W)throw new Error("已载入图片总像素超过 6400 万，请关闭后使用较小图片重新编辑。")}catch(Z){throw je.close(),Z}if(en)throw je.close(),new Error("合成器已关闭。");return dn+=je.width*je.height,nn.set(H,je),je}function Dn(E){const H=E.kind==="paint"?null:nn.get(Ee(E.asset.url)),O=An.render(E,H);Vn.add(E.id);const fe=ir(E,O),me=new(Cn()).FabricImage(O,{originX:"left",originY:"top",left:E.x,top:E.y,angle:E.angle,cropX:fe.x,cropY:fe.y,width:fe.width,height:fe.height,scaleX:E.width/fe.width,scaleY:E.height/fe.height,opacity:E.opacity,visible:E.visible,selectable:!E.locked,evented:!E.locked,lockScalingFlip:!0,objectCaching:!1,cornerColor:"#a0e7cb",borderColor:"#a0e7cb",transparentCorners:!1,cornerSize:12,padding:0});return me.composerId=E.id,me.setControlsVisibility({ml:!jt.checked,mr:!jt.checked,mt:!jt.checked,mb:!jt.checked}),me}function oo(E,H,O){const fe=E?Ee(E.url):null,me=K("span","ic-thumbnail"),je=fe&&nn.get(fe),Z=O?An.render(O,je||null):je;if(me.setAttribute("aria-hidden","true"),me.draggable=!1,Z){const De=ir({crop:H},Z),Pt=K("canvas"),on=Math.min(1,220/De.width,120/De.height);Pt.draggable=!1,Pt.width=Math.max(1,Math.round(De.width*on)),Pt.height=Math.max(1,Math.round(De.height*on)),Pt.getContext("2d").drawImage(Z,De.x,De.y,De.width,De.height,0,0,Pt.width,Pt.height),me.append(Pt)}else{const De=K("img");De.alt="",De.loading="lazy",De.decoding="async",De.draggable=!1;const Pt=new z(fe);De.src=/^\/api\/(upload|artifact)\//.test(Pt.pathname)?`/api/thumbnail?url=${encodeURIComponent(Pt.pathname+Pt.search)}`:fe,me.append(De)}return me}function Nt(){return ne?.layers.find(E=>E.id===it)}function We(){if(!_e||!ne)return;mn=!0,_e.discardActiveObject();for(const O of _e.getObjects())_e.remove(O),O.dispose();ye.clear();for(const O of Vn)ne.layers.some(fe=>fe.id===O)||(An.invalidate(O),Vn.delete(O));_e.backgroundColor="";for(const O of ne.layers){const fe=Dn(O);_e.add(fe),ye.set(O.id,fe)}const E=Nt(),H=ye.get(it);H&&E.visible&&!E.locked&&_e.setActiveObject(H),mn=!1,qn(),Rt(),_e.requestRenderAll()}function Jt(){const E=JSON.stringify(ne);if(Ut[ke]===E){Rt();return}for(Ut.splice(ke+1),Ut.push(E);Ut.length>2&&(Ut.length>60||Ut.reduce((H,O)=>H+O.length,0)>8*1024*1024);)Ut.shift();ke=Ut.length-1,Rt()}function kt(E){if(!Yt()||!ne)return;const H=M(ne);try{return E(),ne=T(ne),We(),Jt(),qt(),!0}catch(O){ne=H,We(),st(O)}}function Kn(E){const H=ke+E;if(H<0||H>=Ut.length)return;const O=ne.linkedSources;ne=JSON.parse(Ut[H]),O&&(ne.linkedSources=[...new Set([...ne.linkedSources||[],...O])]),ke=H,Ut[H]=JSON.stringify(ne),We()}function qn(){if(!_e||!ne||en)return;const E=Math.max(1,Math.min(4096,Ve.clientWidth)),H=Math.max(1,Math.min(4096,Ve.clientHeight)),O=Math.min(1,Math.sqrt(8e6/(E*H))),fe={width:Math.max(1,Math.floor(E*O)),height:Math.max(1,Math.floor(H*O))};if(On){const me=mp(fe,ne);vt=me.scale,Wt=me.offsetX,cn=me.offsetY}(_e.width!==fe.width||_e.height!==fe.height)&&(On||(Wt+=(fe.width-_e.width)/2,cn+=(fe.height-_e.height)/2),_e.setDimensions(fe)),_e.setViewportTransform([vt,0,0,vt,Wt,cn]),Object.assign(xe.style,{width:`${ne.width*vt}px`,height:`${ne.height*vt}px`,left:`${Wt}px`,top:`${cn}px`,backgroundColor:ne.background==="transparent"?"":ne.background,backgroundImage:ne.background==="transparent"?"":"none"}),Nr?.resize(_e.width,_e.height),zo.textContent=`${Math.round(vt*100)}% · ${ne.width} × ${ne.height} px`}const ar=hn(b,"撤销",()=>Kn(-1)),No=hn(b,"重做",()=>Kn(1));hn(b,"适应窗口",()=>{On=!0,Wt=cn=0,qn()});function zr(E,H){const O=hp({scale:vt,offsetX:Wt,offsetY:cn},E,H);On=!1,vt=O.scale,Wt=O.offsetX,cn=O.offsetY,qn(),_e.requestRenderAll()}hn(b,"缩小",()=>zr({x:_e.width/2,y:_e.height/2},1/1.25)),hn(b,"放大",()=>zr({x:_e.width/2,y:_e.height/2},1.25));const zo=K("span","ic-zoom");b.append(zo),St.append(K("h3","","图层"),K("p","ic-hint","从上到下为顶层到底层，可拖动排序"));const Gn=K("div","ic-layers");Gn.setAttribute("aria-label","图层列表"),St.append(Gn);const sr=K("div","ic-layer-actions");St.append(sr);const lr=[];function zt(E,H){const O=hn(sr,E,()=>Nt()&&H());return lr.push(O),O}function dr(E){kt(()=>{const H=ne.layers.findIndex(fe=>fe.id===it),[O]=ne.layers.splice(H,1);ne.layers.splice(Math.max(0,Math.min(E,ne.layers.length)),0,O)})}zt("上移",()=>dr(ne.layers.findIndex(E=>E.id===it)+1)),zt("下移",()=>dr(ne.layers.findIndex(E=>E.id===it)-1)),zt("置顶",()=>dr(ne.layers.length-1)),zt("置底",()=>dr(0)),zt("复制",()=>kt(()=>{if(ne.layers.length>=P)throw new Error("最多添加 100 个图层。");const E=M(Nt());E.id=F(),E.name=`${E.name} 副本`,E.x+=20,E.y+=20,ne.layers.splice(ne.layers.findIndex(H=>H.id===it)+1,0,E),it=E.id})),zt("删除",()=>kt(()=>{ne.layers=ne.layers.filter(E=>E.id!==it),it=null})),St.append(K("h3","","添加图片"));const En=hn(St,"上传图片（支持多选）",()=>gn.click()),gn=K("input","ic-file");gn.type="file",gn.multiple=!0,gn.accept="image/png,image/jpeg,image/webp,image/gif,image/bmp",gn.hidden=!0,St.append(gn),St.append(K("p","ic-hint","可拖入文件或粘贴图片。单边 ≤8192px，总像素 ≤3200万，文件 ≤64MiB。"));const Ir=K("div","ic-sources");St.append(Ir),Lt.append(K("h3","","画布"));const Pr=K("div","ic-field-grid");Lt.append(Pr);const Ne=Fn(Pr,"画布宽度 / px","number",{min:1,max:Y,step:1}),It=Fn(Pr,"画布高度 / px","number",{min:1,max:Y,step:1});Ne.dataset.composerField="canvas-width",It.dataset.composerField="canvas-height";const cr=K("div","ic-background");Lt.append(cr);const bn=Fn(cr,"透明背景","checkbox");bn.parentElement.classList.add("ic-switch");const Ge=Fn(cr,"背景颜色","color");Ne.addEventListener("change",()=>kt(()=>{ne.width=Number(Ne.value)})),It.addEventListener("change",()=>kt(()=>{ne.height=Number(It.value)})),bn.addEventListener("change",()=>kt(()=>{ne.background=bn.checked?"transparent":Ge.value})),Ge.addEventListener("change",()=>kt(()=>{ne.background=Ge.value})),Lt.append(K("h3","","所选图层"));const Bt=Fn(Lt,"名称","text",{maxLength:200}),pt=K("div","ic-field-grid");Lt.append(pt);const ut={};for(const[E,H,O,fe]of[["x","X / px",-1e5,1e5],["y","Y / px",-1e5,1e5],["width","宽度 / px",0,Y],["height","高度 / px",0,Y],["angle","角度 / °",-36e3,36e3],["opacity","透明度 / %",0,100]]){const me=Fn(pt,H,"number",{min:O,max:fe,step:E==="opacity"?1:.1});ut[E]=me,me.dataset.composerField=E,me.addEventListener("change",()=>kt(()=>{const je=Nt();if(!je||je.locked)return;const Z=Number(me.value);if(me.value.trim()===""||!Number.isFinite(Z))throw new Error("请输入有效数值。");if(jt.checked&&(E==="width"||E==="height")){const De=E==="width"?"height":"width";je[De]*=Z/je[E]}je[E]=E==="opacity"?Z/100:Z}))}const jt=Fn(Lt,"锁定宽高比","checkbox",{checked:!0});jt.parentElement.classList.add("ic-switch"),jt.addEventListener("change",()=>{if(Yt()){_e.uniformScaling=jt.checked;for(const E of ye.values())E.setControlsVisibility({ml:!jt.checked,mr:!jt.checked,mt:!jt.checked,mb:!jt.checked});_e.requestRenderAll()}});const pn=K("div");Lt.append(pn),Ze=fc(pn,{canEdit:Yt,onApply:(E,H)=>kt(()=>{const O=Nt();if(!O||O.kind==="paint"||O.id!==E||O.locked)throw new Error("所选图层已变化，请重新打开裁剪。");Object.assign(O,rc(O,H,nn.get(Ee(O.asset.url))))})===!0}),Bt.addEventListener("change",()=>kt(()=>{const E=Nt();E&&!E.locked&&(E.name=Bt.value||"图片")})),Lt.append(K("p","ic-hint","X / Y 是图片未旋转时的左上角原点。锁定图层后，需先解锁才能修改属性或在画布移动。"));const Lr=hn(Tn,"保存编辑稿",mr,"ic-primary"),Tr=hn(Tn,"合成 PNG",Vt,"ic-primary");function Rt(){if(!ne||en){rn();return}const E=Nt();Ne.value=ne.width,It.value=ne.height,bn.checked=ne.background==="transparent",bn.checked||(Ge.value=ne.background),Bt.value=E?.name||"",Bt.dataset.inactive=!E||E.locked?"1":"0";for(const[O,fe]of Object.entries(ut))fe.value=E?String(Math.round(E[O]*(O==="opacity"?100:1)*1e3)/1e3):"",fe.dataset.inactive=!E||E.locked?"1":"0";ar.dataset.inactive=ke<=0?"1":"0",No.dataset.inactive=ke>=Ut.length-1?"1":"0";for(const O of lr)O.dataset.inactive=!E||E.locked?"1":"0";En.dataset.inactive=typeof Me!="function"?"1":"0",Lr.dataset.inactive=typeof Be!="function"?"1":"0",Tr.dataset.inactive=typeof Q!="function"?"1":"0",Ln.textContent=`图片合成${JSON.stringify(ne)!==Rn?" · 未保存":""}`;const H=Gn.contains(k.activeElement);Gn.replaceChildren(),ne.layers.length||Gn.append(K("p","ic-empty","尚无图层。上传图片，或从下方画布素材中选择添加。"));for(const O of[...ne.layers].reverse()){const fe=K("div",`ic-layer${it===O.id?" is-selected":""}`);fe.draggable=!gt&&Xe(),fe.dataset.layerId=O.id;const me=O.kind==="paint"?O.name:Te(O.asset),je=K("button","ic-layer-name");je.type="button",je.title=me,je.dataset.layerAction="select",je.append(oo(O.asset,O.crop,O),K("span","ic-asset-name",me)),je.setAttribute("aria-pressed",String(it===O.id)),je.disabled=gt||!Xe(),je.addEventListener("click",()=>{Yt()&&(it=O.id,mn=!0,_e.discardActiveObject(),!O.locked&&O.visible&&_e.setActiveObject(ye.get(O.id)),mn=!1,_e.requestRenderAll(),Rt())});const Z=K("button","ic-layer-toggle",O.visible?"隐藏":"显示");Z.type="button",Z.setAttribute("aria-label",`${O.visible?"隐藏":"显示"} ${O.name}`),Z.setAttribute("aria-pressed",String(O.visible)),Z.dataset.layerAction="visible",Z.title=Z.getAttribute("aria-label");const De=K("button","ic-layer-toggle",O.locked?"解锁":"锁定");De.type="button",De.setAttribute("aria-label",`${O.locked?"解锁":"锁定"} ${O.name}`),De.setAttribute("aria-pressed",String(O.locked)),De.dataset.layerAction="lock",De.title=De.getAttribute("aria-label"),Z.disabled=De.disabled=gt||!Xe(),Z.addEventListener("click",()=>kt(()=>{O.visible=!O.visible})),De.addEventListener("click",()=>kt(()=>{O.locked=!O.locked})),fe.addEventListener("dragstart",on=>{if(!Yt()){on.preventDefault();return}Tt=O.id,on.dataTransfer.effectAllowed="move",on.dataTransfer.setData("application/x-chouka-layer",O.id)}),fe.addEventListener("dragover",on=>{Tt&&Yt()&&(on.preventDefault(),on.dataTransfer.dropEffect="move",fe.classList.add("is-dragover"))}),fe.addEventListener("dragleave",()=>fe.classList.remove("is-dragover")),fe.addEventListener("dragend",()=>{Tt=null,fe.classList.remove("is-dragover")}),fe.addEventListener("drop",on=>{if(!Tt)return;on.preventDefault(),on.stopPropagation();const Rr=Tt;Tt=null,kt(()=>{const ao=ne.layers.findIndex(hr=>hr.id===O.id),so=ne.layers.findIndex(hr=>hr.id===Rr);if(so<0||ao<0||so===ao)return;const[mi]=ne.layers.splice(so,1);ne.layers.splice(ao,0,mi),it=Rr})});const Pt=K("div","ic-layer-controls");Pt.append(Z,De),fe.append(je,Pt),Gn.append(fe)}rn(),H&&!gt&&_e?.upperCanvasEl.focus({preventScroll:!0})}async function pr(E,H){if(ne.layers.length+E.length>P)throw new Error("最多添加 100 个图层。");const O=[];for(const fe of E){if(!Xe())throw new Error("编辑权限已失效，未添加图片。");const me=Ae(fe),je=await ro(me);if(!Xe())throw new Error("编辑权限已失效，未添加图片。");const Z=Math.max(1/Math.min(je.width,je.height),Math.min(1,ne.width/je.width,ne.height/je.height));O.push({id:F(),name:Te(me),asset:me,x:0,y:0,width:je.width*Z,height:je.height*Z,angle:0,opacity:1,visible:!0,locked:!1})}if(!Xe())throw new Error("编辑权限已失效，未添加图片。");ne=T({...ne,...H?{linkedSources:H}:{},layers:ne.layers.concat(O)}),it=O.at(-1)?.id||it,We(),Jt()}async function fi(){if(!Array.isArray(pe)||pe.length>q)throw new Error("已连接图片列表无效或过多（最多 512 项）。");if(!pe.length)return;const E=new Set(ne.linkedSources||[]),H=new Set(E),O=new Set,fe=[];for(const me of ne.layers)if(me.kind!=="paint")for(const je of de(me.asset))O.add(je);for(const me of pe){const je=Ae(me),Z=de(je);if(Z.some(De=>H.has(De)||O.has(De)))for(const De of Z)H.add(De);Z.some(De=>E.has(De)||O.has(De))||fe.push(je);for(const De of Z)E.add(De);if(E.size>q)throw new Error("已连接图片记录已达 512 条上限，请使用“添加图片”手动添加新素材。")}if(!Xe())throw new Error("编辑权限已失效，未添加图片。");H.size!==(ne.linkedSources||[]).length&&(ne=T({...ne,linkedSources:[...H]}),Jt()),await pr(fe,[...E])}async function ur(E){if(!/^image\/(png|jpeg|webp|gif|bmp|x-ms-bmp)$/i.test(E.type)||!E.size||E.size>A)throw new Error(`${E.name||"粘贴文件"}：仅支持常见位图格式，且文件需在 64 MiB 以内。`);await R(E);const H=await createImageBitmap(E);try{Ce(H.width,H.height)}finally{H.close()}}function fr(E){const H=Array.from(E||[]);if(H.length)return _n("正在检查和上传图片，请勿关闭…",async()=>{if(typeof Me!="function")throw new Error("尚未配置图片上传回调。");if(ne.layers.length+H.length>P)throw new Error("最多添加 100 个图层。");for(const fe of H)await ur(fe);const O=[];for(const fe of H){if(!Xe())throw new Error("编辑权限已失效，已停止上传。");const me=await Me(fe);if(!Xe())throw new Error("编辑权限已失效，未采用晚到的上传结果。");O.push(Ae(me))}await pr(O)})}gn.addEventListener("change",()=>{const E=Array.from(gn.files);gn.value="",fr(E)}),ae.addEventListener("paste",E=>{if(E.stopPropagation(),E.target.closest('input,textarea,[contenteditable="true"]'))return;const H=Array.from(E.clipboardData?.files||[]);H.length&&(E.preventDefault(),fr(H))}),ae.addEventListener("dragover",E=>{E.stopPropagation(),E.dataTransfer.types.includes("Files")&&(E.preventDefault(),E.dataTransfer.dropEffect=gt||!Xe()?"none":"copy")}),ae.addEventListener("drop",E=>{E.stopPropagation(),E.preventDefault(),E.dataTransfer.files.length&&fr(E.dataTransfer.files)}),ae.addEventListener("keydown",E=>{if(E.stopPropagation(),E.target.closest('input,textarea,select,[contenteditable="true"]')||E.isComposing)return;const H=E.ctrlKey||E.metaKey,O=E.key.toLowerCase();if(H&&(O==="z"||O==="y")){E.preventDefault(),Yt()&&Kn(O==="y"||E.shiftKey?1:-1);return}if(O==="delete"||O==="backspace"){E.preventDefault(),Nt()&&!Nt().locked&&kt(()=>{ne.layers=ne.layers.filter(me=>me.id!==it),it=null});return}const fe={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[E.key];fe&&(E.preventDefault(),Nt()&&!Nt().locked&&kt(()=>{const me=Nt(),je=E.shiftKey?10:1;me.x+=fe[0]*je,me.y+=fe[1]*je}))});for(const E of["keyup","keypress","copy","cut","pointerdown","pointerup","click","dblclick","wheel"])ae.addEventListener(E,H=>H.stopPropagation());async function mr(){await _n("正在保存编辑稿，请勿关闭…",async()=>{const E=T(ne);if(!Xe())throw new Error("编辑权限已失效，未保存。");await Be(M(E)),Xe()&&(Rn=JSON.stringify(E))})}async function Vt(){await _n("正在合成原尺寸 PNG，请勿关闭…",async()=>{const E=T(ne),H=k.createElement("canvas");let O;try{O=new(Cn()).StaticCanvas(H,{width:E.width,height:E.height,enableRetinaScaling:!1,renderOnAddRemove:!1,backgroundColor:E.background==="transparent"?"":E.background});for(const me of E.layers)me.visible&&O.add(Dn(me));O.renderAll();const fe=await new Promise((me,je)=>H.toBlob(Z=>Z?me(Z):je(new Error("PNG 编码失败，可能内存不足。")),"image/png"));if(!Xe())throw new Error("编辑权限已失效，未提交合成结果。");await Q(fe,M(E)),Rn=JSON.stringify(E)}finally{try{O&&await O.dispose()}finally{H.width=H.height=0}}})}async function Zn(E=!1){const H=E===!0;if(en||gt&&!H||!H&&ne&&JSON.stringify(ne)!==Rn&&!C.confirm("编辑稿有未保存的更改，确定关闭并放弃这些更改吗？"))return!1;en=!0,Ue.abort(),tn?.disconnect(),D(no),Nr?.dispose(),Ze?.dispose(),ae.open&&ae.close();try{_e&&await _e.dispose()}catch(O){console.error("[图片合成] 画布释放失败",O)}finally{for(const O of nn.values())O.close();An.dispose(),nn.clear(),ye.clear(),Ut.length=0,ae.remove(),fn?.isConnected&&fn.focus({preventScroll:!0})}return!0}yn.addEventListener("click",Zn),ae.addEventListener("cancel",E=>{E.preventDefault(),E.stopPropagation(),Zn()}),ae.showModal(),yn.focus();async function io(){if(!(gt||en)){gt=!0,kn=!1,qt(),Mt.hidden=!0,sn.textContent="正在载入图片合成器…",rn();try{if(await Se(),_e||(_e=new(Cn()).Canvas(ln,{enableRetinaScaling:!1,selection:!1,preserveObjectStacking:!0,uniformScaling:!0,uniScaleKey:null,renderOnAddRemove:!1}),_e.wrapperEl.classList.add(Qr.stage),_e.wrapperEl.prepend(xe),_e.upperCanvasEl.tabIndex=0,_e.upperCanvasEl.setAttribute("aria-label","图片合成编辑画布，使用方向键移动所选图层"),_e.on("mouse:down",()=>{!gt&&Xe()&&_e.upperCanvasEl.focus({preventScroll:!0})}),_e.on("selection:created",E=>{!mn&&!gt&&Xe()&&(it=E.selected?.[0]?.composerId||null,Rt())}),_e.on("selection:updated",E=>{!mn&&!gt&&Xe()&&(it=E.selected?.[0]?.composerId||null,Rt())}),_e.on("selection:cleared",()=>{!mn&&!gt&&Xe()&&(it=null,Rt())}),Nr=up({dialog:ae,surface:_e.wrapperEl,toolbar:Dt,properties:Qe,canEdit:Yt,getState:()=>{const E=Nt(),H=E?.kind==="paint"?E.paint:E&&nn.get(Ee(E.asset.url));return{enabled:!en&&!gt&&kn&&Xe(),width:ne?.width||1,height:ne?.height||1,scale:vt,offsetX:Wt,offsetY:cn,target:E&&H?{layer:{...E,kind:E.kind||"image"},source:{width:H.width,height:H.height}}:null}},onMode:E=>{_e.getActiveObject()?.set({hasControls:!E,hasBorders:!E}),_e.requestRenderAll()},onPan:(E,H)=>{On=!1,Wt+=E,cn+=H,qn(),_e.requestRenderAll()},onZoom:zr,sampleColor:E=>gp(ne,E,H=>An.render(H,H.kind==="paint"?null:nn.get(Ee(H.asset.url)))),onNewPaint:()=>kt(()=>{const E=F();ne=_s(ne,E,it),it=E}),onClear:()=>{const E=Nt();E&&C.confirm(E.kind==="paint"?"清空当前涂鸦？此操作可撤销。":"恢复当前图片的全部擦除和遮挡效果？此操作可撤销。")&&kt(()=>{ne=Cc(ne,E.id)})},onStroke:(E,H)=>kt(()=>{const O=E||F();E||(ne=_s(ne,O,it)),ne=kc(ne,O,H),it=O})===!0,onPreview:(E,H)=>{const O=ne?.layers.find(De=>De.id===E),fe=ye.get(E);if(!O||!fe||en)return;const me=H?O.kind==="paint"?{...O,paint:{...O.paint,strokes:[...O.paint.strokes,H]}}:{...O,effects:[...O.effects||[],H]}:O,je=Dn(me),Z=_e.getObjects().indexOf(fe);mn=!0,_e.remove(fe),fe.dispose(),_e.insertAt(Z,je),ye.set(E,je),it===E&&!O.locked&&O.visible&&(_e.setActiveObject(je),je.set({hasControls:!1,hasBorders:!1})),mn=!1,_e.requestRenderAll()},onError:st}),_e.on("object:modified",E=>{if(mn)return;if(!Yt()){We();return}const H=E.target,O=ne.layers.find(me=>me.id===H?.composerId);if(!O||O.locked){We();return}const fe=M(ne);try{Object.assign(O,{x:H.left,y:H.top,width:H.width*H.scaleX,height:H.height*H.scaleY,angle:H.angle}),ne=T(ne),Jt()}catch(me){ne=fe,We(),st(me)}})),!ne){const E=T(le);for(const H of E.layers){if(!Xe())throw new Error("只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。");H.kind!=="paint"&&await ro(H.asset)}if(!Xe())throw new Error("只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。");ne=E,Rn=JSON.stringify(ne),Ut=[],ke=-1,We(),Jt()}kn=!0;try{await fi()}catch(E){st(E),Mt.hidden=!1}Ir.replaceChildren();for(const E of c)try{const H=Ae(E),O=Te(H),fe=hn(Ir,"",()=>_n("正在添加画布图片…",()=>pr([H])));fe.title=O,fe.setAttribute("aria-label",`添加 ${O}`),fe.append(oo(H),K("span","ic-asset-name",O))}catch(H){st(H)}c.length||Ir.append(K("p","ic-hint","当前画布没有可用的图片素材。")),tn?.disconnect(),tn=new V(qn),tn.observe(Ve)}catch(E){st(E),kn=!1,Mt.hidden=!1}finally{gt=!1,sn.textContent=Xt.hidden?"就绪 · 添加图片开始合成":"载入存在问题，请检查提示；可重试载入或关闭。",Rt()}}}return a.onDispose(()=>{Zn(!0)}),Mt.addEventListener("click",()=>{Xe()&&io()}),no=I(rn,500),await io(),{close:Zn}}C.ChoukaImageComposer={open:ie}})(),C.ChoukaImageComposer}const xp=$d.extend({selectedId:Yn().nullable(),selectedSpace:Yn(),user:Pd.nullable()});function yp(a){const p=qs({projects:[],teams:[],selectedId:null,selectedSpace:"personal",user:null,busy:!1,error:""});let g;async function w(k){if(!p.getSnapshot().busy){p.set({...p.getSnapshot(),busy:!0,error:""});try{await k()}catch(N){p.set({...p.getSnapshot(),error:to(N)})}finally{p.set({...p.getSnapshot(),busy:!1})}}}const C=k=>k.permission==="operate"&&!k.locked;return{state:p,service:a,bind(k){g=k},update(k){const N=xp.parse(k);p.set({...p.getSnapshot(),...N})},selectSpace(k){g?.selectSpace(k)},open(k){return w(async()=>{await g?.open(k)})},create(){return w(async()=>{const k=p.getSnapshot();if(k.selectedSpace==="shared")throw new Error("共享给我的空间不能新建画布，请选择个人空间或项目组");const N=k.selectedSpace.startsWith("team:")?k.selectedSpace.slice(5):null,l=N?k.teams.find(D=>D.id===N)?.name:"个人空间",v=window.prompt(`在「${l||"项目组"}」新建画布`,"新项目 "+new Date().toLocaleDateString("zh-CN"));if(v===null)return;const I=await a.create(v,N);await g?.refresh(),await g?.open(I.id)})},rename(k){return w(async()=>{if(!C(k))throw new Error("此画布不可修改");const N=window.prompt("修改项目名",k.name);if(N===null)return;const l=N.trim();if(!l)throw new Error("项目名不能为空");const v=Ps({name:Yn(),rev:_t()}).parse(await a.rename(k.id,l));g?.renamed(k.id,v.name,v.rev),await g?.refresh()})},remove(k){return w(async()=>{if(!C(k))throw new Error("此画布不可修改");window.confirm(`删除项目「${k.name}」？（文件会保留为 .deleted）`)&&(await a.remove(k.id),p.getSnapshot().selectedId===k.id&&g?.clear(),await g?.refresh())})},async refresh(){await g?.refresh()},spaces(k){const N=p.getSnapshot();return jd(k,N.user?.id,N.teams)}}}function wp({project:a,host:p,onClose:g}){const w=rt.useRef(null),[C,k]=rt.useState(),[N,l]=rt.useState([]),[v,I]=rt.useState([]),[D,J]=rt.useState(""),[ce,V]=rt.useState(!1);rt.useEffect(()=>{let ee=!0;return w.current?.showModal(),p.service.shares(a.id).then(z=>{ee&&(k(z),l(z.user_ids),I(z.team_ids))}).catch(z=>{ee&&J(to(z))}),()=>{ee=!1}},[p,a.id]);const G=(ee,z,$,te)=>te(z?[...$,ee]:$.filter(Y=>Y!==ee));return X.jsx("dialog",{ref:w,className:"auth-dialog project-share-dialog",onCancel:g,children:X.jsxs("form",{onSubmit:async ee=>{ee.preventDefault(),V(!0),J("");try{await p.service.share(a.id,N,v),await p.refresh(),g()}catch(z){J(to(z))}finally{V(!1)}},children:[X.jsxs("h2",{children:["分享「",a.name,"」"]}),X.jsx("p",{className:"auth-note",children:"被选中的个人或项目组成员可以共同查看、编辑和运行这张画布。画布仍保留在你的个人空间。"}),X.jsx("div",{className:"share-columns",children:["users","teams"].map(ee=>X.jsxs("section",{className:"share-targets",children:[X.jsx("h3",{children:ee==="users"?"个人":"项目组"}),X.jsxs("div",{className:"share-target-list",children:[C?.[ee].map(z=>X.jsxs("label",{className:"share-target",children:[X.jsx("input",{type:"checkbox",checked:(ee==="users"?N:v).includes(z.id),onChange:$=>G(z.id,$.target.checked,ee==="users"?N:v,ee==="users"?l:I)}),X.jsxs("span",{children:[z.name||z.username,z.display_name?`（${z.display_name}）`:""]})]},z.id)),C?.[ee].length===0&&X.jsx("p",{className:"auth-note",children:"暂无可分享对象"})]})]},ee))}),X.jsx("p",{role:"alert",children:D}),X.jsxs("footer",{children:[X.jsx("button",{type:"button",className:"btn",onClick:g,children:"取消"}),X.jsx("button",{className:"btn primary",disabled:!C||ce,children:ce?"保存中…":"确定分享"})]})]})})}function vp({host:a}){const p=rt.useSyncExternalStore(a.state.subscribe,a.state.getSnapshot),[g,w]=rt.useState(),C=[{value:"personal",label:"个人空间"},...p.projects.some(v=>a.spaces(v).includes("shared"))?[{value:"shared",label:"共享给我的画布"}]:[],...p.teams.map(v=>({value:`team:${v.id}`,label:v.name}))],k=p.projects.filter(v=>a.spaces(v).includes(p.selectedSpace)),N=new Map;for(const v of k){const I=p.selectedSpace==="shared"?String(v.owner_id):"";N.set(I,[...N.get(I)||[],v])}const l=v=>{const I=v.permission==="operate"&&!v.locked,D=p.selectedSpace==="personal"&&!v.team_id&&String(v.owner_id)===String(p.user?.id)&&!v.locked;return X.jsxs("div",{className:`pitem${v.id===p.selectedId?" on":""}`,title:`${v.team_name||v.owner_display_name?.trim()||"未填写姓名"} · ${v.permission==="operate"?"可操作":"只读"}`,onContextMenu:J=>{D&&(J.preventDefault(),w(v))},children:[X.jsx("button",{className:"nm",onClick:()=>{a.open(v.id)},onDoubleClick:()=>I&&void a.rename(v),children:v.name}),X.jsx("span",{className:"ct",children:v.cards}),D&&X.jsx("button",{className:"pshare",title:"分享给个人或项目组",onClick:()=>w(v),children:"↗"}),I&&X.jsxs(X.Fragment,{children:[X.jsx("button",{className:"ren",title:"重命名",disabled:p.busy,onClick:()=>{a.rename(v)},children:"✎"}),X.jsx("button",{className:"del",title:"删除",disabled:p.busy,onClick:()=>{a.remove(v)},children:"✕"})]})]},v.id)};return X.jsxs(X.Fragment,{children:[X.jsx("div",{className:"head",children:X.jsx("span",{className:"project-panel-title",children:"画布列表"})}),X.jsxs("button",{id:"newproj",disabled:p.busy,onClick:()=>{a.create()},children:[X.jsx("span",{"aria-hidden":"true",children:"＋"}),X.jsx("span",{children:"新建画布"})]}),X.jsxs("label",{className:"space-picker",children:[X.jsx("span",{children:"画布空间"}),X.jsx("select",{id:"space-select",value:p.selectedSpace,onChange:v=>a.selectSpace(v.target.value),"aria-label":"选择个人空间或项目组",children:C.map(v=>X.jsx("option",{value:v.value,children:v.label},v.value))})]}),X.jsx("div",{id:"space-label",className:"section-label",children:C.find(v=>v.value===p.selectedSpace)?.label}),X.jsx("div",{id:"plist",children:[...N].map(([v,I])=>v?X.jsxs("details",{className:"powner",open:!0,children:[X.jsxs("summary",{children:[X.jsx("span",{className:"powner-name",children:I[0]?.owner_display_name?.trim()||"未填写姓名"}),X.jsx("span",{className:"powner-count",children:I.length})]}),X.jsx("div",{className:"powner-items",children:I.map(l)})]},v):I.map(l))}),p.error&&X.jsx("p",{role:"alert",className:"project-error",children:p.error}),X.jsxs("div",{className:"side-foot",children:[X.jsx("span",{className:"side-foot-dot"}),X.jsx("span",{id:"space-status",children:p.selectedSpace==="personal"?"个人画布仅自己可见":p.selectedSpace==="shared"?"由画布所有者授权共享":"项目组画布由全体组员共享"})]}),g&&X.jsx(wp,{host:a,project:g,onClose:()=>w(void 0)})]})}const kp=Td+`
`+Rd+`
#side {position:relative} #dot {position:absolute;right:22px;top:28px;width:7px;height:7px;border-radius:50%;background:var(--err)} #dot.on{background:var(--ok)} #react-projects{display:contents}.pitem>.nm {border:0;background:none;color:inherit;text-align:left;min-width:0;cursor:pointer;font:inherit}.project-error{color:#fda4af;padding:12px;font-size:12px}`;function Np(){const a=rt.useRef(null),[p,g]=rt.useState(!0),[w,C]=rt.useState(),[k,N]=rt.useState(null),l=rt.useCallback(I=>{const D=yp(I.services.projects);C(D),N(document.getElementById("react-projects"));const J=bp(I.scope,I.auth,I.notify,I.services),ce=tc(I.scope,I.auth,I.notify,D,I.services,J);I.beforeLeave(async()=>{await ce.ready,await ce.flush()}),ce.nodeEditor&&(window.ChoukaNodeEditor=ce.nodeEditor),ce.ready.then(()=>{I.scope.disposed||g(!1)},V=>{I.scope.disposed||(g(!1),I.notify.error(V))})},[]),v=Id(a,"canvas","canvas","canvas-studio",kp,l);return X.jsxs(X.Fragment,{children:[X.jsx("div",{id:"page-mount",ref:a,dangerouslySetInnerHTML:{__html:Ld}}),k&&w&&zs.createPortal(X.jsx(vp,{host:w}),k),p&&!v&&X.jsx(Md,{stage:"正在准备工作区"}),v&&X.jsx("p",{role:"alert",children:v})]})}export{Np as CanvasPage};
