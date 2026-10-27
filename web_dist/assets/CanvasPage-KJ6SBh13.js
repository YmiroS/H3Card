import{errorMessage as Kr,ApiError as ss,clientExports as $s,jsxRuntimeExports as W,reactExports as lt}from"./http-DOrwCtZg.js";import{reactDomExports as js}from"./index-BgVeoShv.js";import{isLiveTask as Ki,taskDeleteResultSchema as ls,taskHistoryPageSchema as kd,formatQueueStatus as Ms,tasksSchema as Cd,projectSpaces as _d,projectListSchema as Ed,LoadingRequest as Sd}from"./index-rjCuUloM.js";import{object as Ns,number as St,strictObject as Qi,unknown as Eo,array as si,string as Wn,_enum as $d,looseObject as ci,discriminatedUnion as jd,union as ds,literal as Vr,boolean as cs}from"./monitor-alerts-DAd3X9Za.js";import{usePageRuntime as Md}from"./usePageRuntime-_JCqtNdF.js";import{userSchema as Nd}from"./session-CWTCSf4S.js";import"./json-C6I-PpXc.js";const zd=`\r
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
<input type="file" id="picker" style="display:none">`,Id=`@scope (body[data-chouka-page="canvas"]) {\r
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
}`,Pd=`@scope (body[data-chouka-page="canvas"]) {\r
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
}`,Ld=["image","audio","video"],na=[{id:"480P",label:"480P",val:480},{id:"720P",label:"720P",val:720},{id:"1080P",label:"1080P",val:1080},{id:"1440P",label:"1440P",val:1440},{id:"2K",label:"2K",val:2048}],_o=[["1:1",1,1],["1:2",1,2],["2:1",2,1],["9:16",9,16],["16:9",16,9],["3:4",3,4],["4:3",4,3],["3:2",3,2],["2:3",2,3],["5:4",5,4],["4:5",4,5],["21:9",21,9],["9:21",9,21]];function zs(l){return(l&&l.options||[]).map(u=>{const b=/^(\d+)x(\d+)\s+\(([^)]+)\)$/.exec(String(u));if(!b)return null;const w=parseInt(b[1],10),_=parseInt(b[2],10);return{value:u,width:w,height:_,ratio:b[3],short:Math.min(w,_)}}).filter(Boolean)}function Td(l,u){return zs(l).find(b=>b.value===u)||null}function ra(l,u){const b=u.imageControls,w=l.params.image_ratio,_=l.params.image_clarity;return{ratio:_o.some(C=>C[0]===w)||b.mode==="i2i"&&w==="original"?w:b.defaultRatio,clarity:na.some(C=>C.id===_)?_:b.defaultClarity}}function Is(l,u,b,w){if(b&&w&&b.id!==w.id&&(b.imageControls||w.imageControls)){const _=s=>[...new Set(s.inputs.filter(v=>!Ld.includes(v.type)&&v.type!=="textarea"&&v.type!=="seed").map(v=>v.key))],C=l.params._imageModelParams||={};C[b.id]=Object.fromEntries(_(b).filter(s=>l.params[s]!=null).map(s=>[s,l.params[s]]));const T=l.params._imageRatios||={};b.imageControls&&(T[b.imageControls.mode]=ra(l,b).ratio);for(const s of new Set([..._(b),..._(w)]))delete l.params[s];Object.assign(l.params,C[w.id]||{}),w.imageControls&&b.imageControls?.mode!==w.imageControls.mode&&(l.params.image_ratio=T[w.imageControls.mode]||w.imageControls.defaultRatio)}l.cap=u}function Rd({document:l,getCapability:u,getCapabilityById:b,getRunCapability:w,getProject:_,isIF:C,normalizeIFDuration:T,api:s,save:v,onReferenceChange:A,ratioWH:D,multiple:oe}){function le(P,j,N){const z=ra(P,j),Y=l.createElement("div");Y.className="cpick image-size-controls";const ke=l.createElement("div");ke.className="ctitle",ke.textContent="画面比例";const $e=l.createElement("div");$e.className="cgrid";const Ie=j.imageControls.mode==="i2i"?[["original",1,1],..._o]:_o;for(const[We,ie,R]of Ie){const O=l.createElement("button"),de=We==="original"?"原图":We;O.className=We===z.ratio?"on":"",O.innerHTML=`<i style="--ratio:${ie/R}"></i><span>${de}</span>`,O.title=`画面比例 ${de}`,O.onclick=()=>{P.params.image_ratio=We,v(),N()},$e.appendChild(O)}const Be=l.createElement("div");Be.className="ctitle",Be.textContent="清晰度";const Me=l.createElement("div");Me.className="cgrid k";for(const We of na){const ie=l.createElement("button");ie.className=We.id===z.clarity?"on":"",ie.textContent=We.label,ie.title=`目标短边 ${We.val}px，实际尺寸按模型要求对齐`,ie.onclick=()=>{P.params.image_clarity=We.id,v(),N()},Me.appendChild(ie)}const Ue=l.createElement("div");return Ue.className="image-size-hint",Ue.textContent=j.imageControls.mode==="i2i"?"清晰度按短边计算；默认保持原图比例。指定比例时，模型可能裁切主图以适配画布。":"清晰度按短边计算；实际尺寸按模型要求对齐。高分辨率会增加显存占用。",Y.append(ke,$e,Be,Me,Ue),Y}const re=P=>P?.kind==="gen"&&P.outputType==="video"&&(P.execution==="if_studio"||P.id.startsWith("minimax_h3_")&&P.inputs.some(j=>j.type==="video")),B=(P,j)=>re(j)?(C(P)?u(P):j).inputs.filter(N=>N.type==="video").map(N=>P.assets?.[N.key]).find(N=>N?.ref):null,G=P=>P&&[P.width,P.height,P.duration].every(j=>Number.isFinite(+j)&&+j>0),M=new WeakMap;async function I(P,j=w(P)){const N=B(P,j);if(!N||G(N))return;if(M.has(N))return M.get(N).promise;const z=_(),Y={};return M.set(N,Y),Y.promise=s("/api/media?ref="+encodeURIComponent(N.ref)+"&project="+encodeURIComponent(z.id)).then(ke=>{if(!G(ke))throw new Error("无法读取参考视频的比例和时长，请重新导入视频");_()!==z||!z.cards.includes(P)||B(P,j)!==N||(Object.assign(N,ke),v())}).catch(ke=>{throw Y.error=ke.message,ke}),Y.promise}function X(P,j=w(P)){const N=B(P,j);if(!N)return delete P._referenceParameters,delete P.params._reference_video,Promise.resolve();const z=JSON.stringify([j.id,N.ref]);if(P.params._reference_video===z)return Promise.resolve();const Y=P._referenceParameters;if(Y?.identity===z&&Y.source===N)return Y.promise;const ke=_(),$e=P.params,Ie={...$e},Be={identity:z,source:N,before:Ie};P._referenceParameters=Be;const Me=()=>{if(_()!==ke||!ke.cards.includes(P)||P.params!==$e||P._referenceParameters!==Be||w(P)!==j||B(P,j)!==N||!G(N))return;const Ue=de=>de.every(ye=>$e[ye]===Ie[ye]),We=j.inputs.find(de=>de.key==="aspect_ratio"),ie=+N.width/+N.height;if(We&&Ue(["aspect_ratio"]))$e.aspect_ratio=We.options.reduce((de,ye)=>Math.abs(D[ye][0]/D[ye][1]-ie)<Math.abs(D[de][0]/D[de][1]-ie)?ye:de);else if(!We&&Ue(["width","height","_ratio"])){const de=_o.reduce((Q,ne)=>Math.abs(ne[1]/ne[2]-ie)<Math.abs(Q[1]/Q[2]-ie)?ne:Q),ye=Q=>$e[Q]??j.inputs.find(ne=>ne.key===Q)?.default,V=Math.min(+ye("width"),+ye("height"));$e._ratio=de[0],$e.width=de[1]>=de[2]?Math.round(V*de[1]/de[2]/oe)*oe:V,$e.height=de[1]>=de[2]?V:Math.round(V*de[2]/de[1]/oe)*oe}const R=j.inputs.some(de=>de.key==="preview_seconds"),O=R?"preview_seconds":"duration";Ue([O])&&($e[O]=R?0:Math.max(1,Math.round(+N.duration)),C(P)&&T(P)),$e._reference_video=z,v()};return Be.promise=G(N)?Promise.resolve(Me()):I(P,j).then(Me),Be.promise}function ue(P){X(P).catch(()=>{}).finally(()=>A(P))}function L(P,j){const N=B(P,j);if(!N||G(N))return null;const z=l.createElement("div");if(z.className="knobnote",z.setAttribute("role","status"),z.textContent=M.get(N)?.error||"正在读取参考视频的比例和时长…",M.get(N)?.error){const Y=l.createElement("button");Y.type="button",Y.textContent="重新读取",Y.onclick=()=>{M.delete(N),delete P._referenceParameters,ue(P),A(P)},z.appendChild(Y)}return z}return{imageClarityPicker:le,supportsVideoReference:re,referenceVideo:B,videoMetadataReady:G,ensureReferenceMetadata:I,syncReferenceParameters:X,refreshVideoParameters:ue,videoReferenceStatus:L,switchImageCapability:(P,j)=>Is(P,j,u(P),b(j))}}const Od={CLARITY_STEPS:na,RATIO_GRID:_o,resolutionPresets:zs,resolutionPreset:Td,imageSettings:ra,switchImageCapability:Is,applyInputPresets:Ad,create:Rd};function Ad(l,u){for(const b of(l.inputs||[]).filter(w=>w.presets)){const w=u[b.key]!=null?u[b.key]:b.default,_=b.presets[w];if(!_)throw new Error(`${b.label}无效：${w}`);u[b.key]=w,Object.assign(u,_)}}const So={"1:1 (Square)":[1,1],"2:3 (Portrait Photo)":[2,3],"3:2 (Photo)":[3,2],"3:4 (Portrait Standard)":[3,4],"4:3 (Standard)":[4,3],"9:16 (Portrait Widescreen)":[9,16],"16:9 (Widescreen)":[16,9],"21:9 (Ultrawide)":[21,9]},kr=[480,544,640,768],Ps={480:832,544:960,640:1152,768:1344},Un=32,oi=new Set(["megapixels","width","height","aspect_ratio","resolution","scale_to_length","output_1080p"]),Ls=[{id:"1080p",short:1080},{id:"2K",short:1440},{id:"4K",short:2160}],ps=["3:4",3,4],bt=(l,u)=>l.inputs.find(b=>b.key===u);function Yr(l){return l===null||typeof l=="string"||typeof l=="number"||typeof l=="boolean"?l:void 0}const kt=(l,u)=>u?Yr(l.params[u.key])??u.default:void 0,yr=l=>typeof l=="string"?l:"",Bn=l=>typeof l=="number"||typeof l=="string"?Number(l):NaN,us=l=>Number.parseFloat(String(Yr(l)));function oa(l){return So[yr(l)]??[1,1]}function Cr(l,u){const[b,w]=oa(l),_=Math.sqrt(u*1024*1024/(b*w));return[Math.round(b*_/Un)*Un,Math.round(w*_/Un)*Un]}function Ts(l,u){const[b,w]=oa(l),_=u/Math.min(b,w),C=Math.round(_*_*b*w/(1024*1024)*100)/100;for(const T of[0,1,-1,2,-2,3,-3]){const s=Math.round((C+T*.01)*100)/100;if(s>0&&Math.min(...Cr(l,s))===u)return s}return C}const fs=l=>Math.round(l*9/16/Un)*Un;function Rs(l){return l.id==="minimax_h3_ref_2pass_bf16"||l.id==="minimax_h3_fusion_v2_bf16"?bt(l,"output_1080p"):void 0}function li(l,u){const[b,w]=oa(l);return{width:Math.round(u*Math.max(1,b/w)/2)*2,height:Math.round(u*Math.max(1,w/b)/2)*2}}function ms(l,u){const b=Rs(u);return!b||kt(l,b)!=="on"?null:li(kt(l,bt(u,"aspect_ratio")),1080)}function ea(l,u){if(u.execution!=="if_studio"||u.outputType!=="video")return null;const b=Ls.find(w=>w.id===l.params.if_video_resolution);return b?{label:b.id,...li(kt(l,bt(u,"aspect_ratio")),b.short)}:null}function Fd(l,u){for(const b of l.querySelectorAll("input, select"))b.addEventListener("input",u),b.addEventListener("change",u);for(const b of l.querySelectorAll('[role="switch"]'))b.addEventListener("click",u)}function Dd(l){const{document:u,save:b,ratioGrid:w,claritySteps:_,resolutionPresets:C,resolutionPreset:T}=l,s=L=>{b(),L?.()},v=L=>L.outputType==="video"?kr.map(P=>({id:`${P}p`,label:`${P}p`,val:P})):_;function A(L){let P=null,j=1/0;for(const[N,[z,Y]]of Object.entries(So)){const ke=Math.abs(L[1]/L[2]-z/Y);ke<j-1e-9&&(j=ke,P=N)}return P}function D(L){const P=So[yr(L)];return P?w.find(j=>j[1]===P[0]&&j[2]===P[1]):void 0}function oe(L,P){let j="3:4",N=1/0;for(const z of w){const Y=Math.abs(L/P-z[1]/z[2]);Y<N&&(N=Y,j=z[0])}return j}function le(L,P){const j=v(L),N=j.find(Ie=>Ie.id===P.params._clarity);if(N)return N;const z=Bn(kt(P,bt(L,"width"))),Y=Bn(kt(P,bt(L,"height")));if(!z||!Y)return null;let ke=null,$e=1/0;for(const Ie of j){const Be=Math.abs(Ie.val-Math.min(z,Y));Be<$e&&($e=Be,ke=Ie)}return ke}function re(L){const P=u.createElement("div");return P.className="ctitle",P.textContent=L,P}function B(L=!1){const P=u.createElement("div");return P.className=L?"cgrid k":"cgrid",P}function G(L,P,j,N){const z=u.createElement("button");return z.type="button",z.textContent=L,z.className=P?"on":"",z.title=j,z.setAttribute("aria-pressed",String(P)),z.onclick=N,z}function M(L,P,j,N){const z=G("",P,j,N),Y=u.createElement("i");Y.style.setProperty("--ratio",String(L[1]/L[2]));const ke=u.createElement("span");return ke.textContent=L[0],z.append(Y,ke),z}function I(L,P,j){if(P.imageControls)return l.imageClarityPicker(L,P,j);const N=bt(P,"aspect_ratio"),z=bt(P,"megapixels"),Y=bt(P,"resolution"),ke=bt(P,"width")&&bt(P,"height"),$e=bt(P,"scale_to_length"),Ie=u.createElement("div");if(Ie.className="cpick",Y){const ie=C(Y),R=T(Y,kt(L,Y))??ie[0];if(!R)return Ie;const O=B();for(const ye of new Set(ie.map(V=>V.ratio))){const[V=1,Q=1]=ye.split(":").map(Number);O.appendChild(M([ye,V,Q],ye===R.ratio,`画面比例 ${ye}`,()=>{const c=ie.filter(ae=>ae.ratio===ye).reduce((ae,Ee)=>Math.abs(Ee.short-R.short)<Math.abs(ae.short-R.short)?Ee:ae);L.params.resolution=c.value,s(j)}))}const de=B(!0);for(const ye of ie.filter(V=>V.ratio===R.ratio))de.appendChild(G(`${ye.width}×${ye.height}`,ye.value===R.value,"",()=>{L.params.resolution=ye.value,s(j)}));return Ie.append(re("画面比例"),O,re("分辨率"),de),Ie}if($e&&!N){const ie=u.createElement("input");ie.type="number";const R=$e.min||512,O=$e.max||1344,de=$e.step||32;ie.min=String(R),ie.max=String(O),ie.step=String(de),ie.value=String(kt(L,$e)??""),ie.style.cssText="width:100%;padding:8px;font-size:14px;border:1px solid #3a3a44;border-radius:4px;background:#1a1a22;color:#fff";const ye=()=>{const ne=Number.parseInt(ie.value,10);Number.isNaN(ne)||(L.params.scale_to_length=Math.max(R,Math.min(O,ne)),s(j))};ie.oninput=ye;const V=B(!0);for(const ne of kr){const c=Ps[ne];if(c===void 0)continue;const ae=G(`${ne}p`,Number(ie.value)===c,`16:9 素材约 ${ne}p；最长边 ${c}px，实际短边随素材比例变化`,()=>{ie.value=String(c),ye()});ae.disabled=c<R||c>O,V.appendChild(ae)}const Q=u.createElement("div");return Q.style.cssText="font-size:12px;color:#8a8a94;margin-top:4px",Q.textContent=`档位按 16:9 素材标注，实际短边随素材比例变化。最长边范围：${R} ~ ${O}，步进 ${de}`,Ie.append(re("分辨率（最长边）"),V,ie,Q),Ie}const Be=!N&&ke,Me=()=>{const ie=Bn(Yr(L.params.width)??ke?.default),R=Bn(kt(L,bt(P,"height")));return ie&&R?oe(ie,R):"3:4"};function Ue(ie){const R=le(P,L)??v(P)[1];if(!R)return;const[,O,de]=ie,ye=P.outputType==="video"?Un:16;L.params.width=O>=de?Math.round(R.val*O/de/ye)*ye:R.val,L.params.height=O>=de?R.val:Math.round(R.val*de/O/ye)*ye}if(N||Be){const ie=N?kt(L,N):yr(L.params._ratio)||Me(),R=N?D(ie):void 0,O=B();for(const de of w){const ye=!!Be&&(de[0]===ie||!L.params._ratio&&de[0]===w.find(c=>Math.abs(Bn(L.params.width)/Bn(L.params.height)-c[1]/c[2])<.02)?.[0]),V=N?de===R:ye,Q=A(de),ne=M(de,V,`画面比例 ${de[0]}`+(N&&Q!==ie?`（工作流档位：${Q}）`:"（当前）"),()=>{N?L.params.aspect_ratio=Q:(L.params._ratio=de[0],Ue(de)),s(j)});N&&!V&&Q===ie&&(ne.className="near"),O.appendChild(ne)}Ie.append(re("画面比例"),O)}const We=z?Yr(L.params.aspect_ratio)??bt(P,"aspect_ratio")?.default??"16:9 (Widescreen)":null;if(z||ke){const ie=z?kr.flatMap(Q=>{const ne=Ts(We,Q);return ne>(z.max??1.1)+.01?[]:[{id:`${Q}p`,label:`${Q}p`,val:ne,p:Q}]}):[...v(P)],R=B(!0),O=le(P,L),de=Rs(P),ye=ms(L,P),V=ea(L,P);for(const Q of ie){const ne=z?us(kt(L,z)):O?.val,c=!ye&&!V&&(z?Number.isFinite(ne)&&Math.min(...Cr(We,Number(ne)))===Q.p:ne!=null&&Math.abs(ne-Q.val)<40),ae=w.find(K=>K[0]===(L.params._ratio||"3:4"))??ps,Ee=P.outputType==="video"?Un:16,qe=z?Cr(We,Q.val).join("×"):ae[1]>=ae[2]?`${Math.round(Q.val*ae[1]/ae[2]/Ee)*Ee} × ${Q.val}`:`${Q.val} × ${Math.round(Q.val*ae[2]/ae[1]/Ee)*Ee}`;R.appendChild(G(Q.label,c,qe,()=>{if(de&&(L.params.output_1080p="off"),delete L.params.if_video_resolution,z)L.params.megapixels=Q.val;else{L.params._clarity=Q.id;let K=yr(L.params._ratio);if(!K){K=Me();const ge=Bn(Yr(L.params.width)??ke?.default),ee=Bn(kt(L,bt(P,"height")));ge&&ee&&(L.params._ratio=K)}Ue(w.find(ge=>ge[0]===K)??ps)}s(j)}))}if(de){const Q=li(kt(L,bt(P,"aspect_ratio")),1080);R.appendChild(G("1080p",!!ye,`${Q.width}×${Q.height}`,()=>{L.params.output_1080p="on",s(j)}))}if(P.execution==="if_studio"&&P.outputType==="video")for(const Q of Ls){const ne=li(kt(L,bt(P,"aspect_ratio")),Q.short);R.appendChild(G(Q.id,V?.label===Q.id,`${ne.width}×${ne.height}`,()=>{L.params.if_video_resolution=Q.id,s(j)}))}if(Ie.append(re("清晰度"),R),de?.hint){const Q=u.createElement("div");Q.className="knobnote",Q.textContent=de.hint.replace("开启后","1080p 档位").replace("关闭保留原有行为。","其他清晰度档位保留原有行为。"),Ie.appendChild(Q)}}return Ie}function X(L,P){if(!P)return null;if(P.imageControls){const ie=l.imageSettings(L,P);return`${ie.ratio==="original"?"原图":ie.ratio} · ${ie.clarity}`}const j=bt(P,"aspect_ratio"),N=bt(P,"megapixels"),z=bt(P,"resolution"),Y=bt(P,"width"),ke=bt(P,"scale_to_length"),$e=P.inputs.find(ie=>ie.presets&&ie.appearance!=="switch"),Ie=bt(P,"duration"),Be=bt(P,"preview_seconds"),Me=P.outputType==="video"?bt(P,"sound"):void 0;if(!j&&!N&&!z&&!Y&&!ke&&!$e&&!Ie&&!Be&&!Me)return null;const Ue=[];if(ke&&!j)return Ue.push(`${kt(L,ke)}px`),Me&&Ue.push(kt(L,Me)==="on"?"有声音":"无声音"),Ue.join(" · ");if(z){const ie=T(z,kt(L,z));ie&&Ue.push(ie.ratio,`${ie.width}×${ie.height}`)}else if(j){const ie=kt(L,j);Ue.push(D(ie)?.[0]??yr(ie).split(" ")[0]??"")}else Y&&L.params._ratio&&Ue.push(yr(L.params._ratio));const We=ms(L,P);if(We)Ue.push("1080p",`${We.width}×${We.height}`);else if(N){const ie=us(kt(L,N)),R=Yr(L.params.aspect_ratio)??j?.default??"16:9 (Widescreen)",O=Number.isFinite(ie)?Math.min(...Cr(R,ie)):null;Ue.push(ea(L,P)?.label??(O?`${O}p`:"?"))}else if(Y){const ie=le(P,L);ie&&Ue.push(ie.label)}if($e){const ie=kt(L,$e),R=$e.options?.find(de=>(de&&typeof de=="object"?de.value:de)===ie),O=R&&typeof R=="object"?R.label:yr(R);O&&Ue.unshift(O.replace(/（.*$/,""))}if(Ie&&Ue.push(`${kt(L,Ie)}秒${Be?"/段":""}`),Be){const ie=kt(L,Be);Bn(ie)>0&&Ue.push(`试前${ie}秒`)}return Me&&Ue.push(kt(L,Me)==="on"?"有声音":"无声音"),Ue.join(" · ")}function ue(L,P){const j=L.cap!==P;j&&delete L.params.output_1080p,l.switchImageCapability(L,P),j&&delete L.params.output_1080p}return{clarityPicker:I,paramsBrief:X,switchImageCapability:ue}}const qd="_notice_ur2qb_1",Bd="_readonly_ur2qb_9",hs={notice:qd,readonly:Bd},ta="[data-readonly-view], summary, .slinks .nm, a[href]",Os='textarea, input:not([type="range"]):not([type="file"])';function gs(l,u){if(l.classList.toggle(hs.readonly,u),l.dataset.readonly=String(u),!u){l.querySelector("[data-readonly-notice]")?.remove();return}if(!l.querySelector("[data-readonly-notice]")){const b=l.ownerDocument.createElement("div");b.dataset.readonlyNotice="",b.className=hs.notice,b.textContent="只读 · 可查看参数，不能修改或运行",l.prepend(b)}for(const b of l.querySelectorAll(Os))b.readOnly=!0,b.setAttribute("aria-readonly","true");for(const b of l.querySelectorAll('button, select, input[type="range"], input[type="file"]'))b.matches(ta)||(b.disabled=!0);for(const b of l.querySelectorAll("[contenteditable]"))b.contentEditable="false";for(const b of l.querySelectorAll('[draggable="true"]'))b.draggable=!1}function Hd(l){const u=l.target;return u instanceof Element?["beforeinput","input","change","paste","drop","dragover","contextmenu"].includes(l.type)?!0:l instanceof KeyboardEvent?u.closest(ta)?!1:["Backspace","Delete","Enter"," "].includes(l.key)||(l.ctrlKey||l.metaKey)&&["v","x","z","y"].includes(l.key.toLowerCase()):u.closest(Os)?!1:u.closest(".slot.filled")?l.type!=="click":!u.closest(ta):!1}const ii=l=>l instanceof ss?l:new ss(Kr(l),l&&typeof l=="object"&&"status"in l&&typeof l.status=="number"?l.status:0,l);function Ud(l){const u=l.setTimeout||globalThis.setTimeout,b=l.clearTimeout||(N=>{N!==null&&globalThis.clearTimeout(N)});let w=null,_=null,C=!1,T=0,s=0,v=0,A=null,D=null;const oe=new Set;let le=Promise.resolve(),re=Promise.resolve();function B(N){oe.add(N);const z=()=>{oe.delete(N),l.flushPendingProjectSync()};return N.then(z,Y=>{D=ii(Y),z()}),N}function G(){if(l.nodeEditor||!l.isAuthenticated()||!l.getProject())return;b(_);const N=l.getProject()?.id;N&&(_=u(()=>{_=null;const z=l.getView(),Y={x:z.x,y:z.y,k:z.k};re=re.then(async()=>{if(l.isAuthenticated())try{await l.jput(`/api/projects/${encodeURIComponent(N)}/view`,Y)}catch(ke){l.getProject()?.id===N&&l.showError("视图保存失败："+Kr(ke))}})},400))}function M(N=!0){N&&l.recordCanvasEdit();const z=l.getProject();if(!l.canSave()||!z||z.locked)return;b(w);const Y=z.id;w=u(()=>{w=null,I(Y)},700)}function I(N=l.getProject()?.id){s++;const z=le.catch(()=>{}).then(()=>ue(N)).finally(()=>{s--,l.flushPendingProjectSync()});return le=z,z}async function X(N,z){const Y=await l.api(`/api/projects/${encodeURIComponent(N)}`);if(l.getProject()?.id!==N||Y.rev!==z.rev)return null;const ke=new Set(Y.cards.map(Me=>Me.id)),$e=z.cards.filter(Me=>Me&&typeof Me=="object"&&!Array.isArray(Me)&&!ke.has(String(Me.id)));if(!$e.length)return null;let Ie=Y;for(const Me of $e){const Ue=await l.jpost(`/api/projects/${encodeURIComponent(N)}/cards`,{card:Me,rev:Ie.rev}),We=l.getProject();if(We?.id!==N)throw new Error("恢复节点期间画布已切换");if(Ie=Ue.project,Me&&typeof Me=="object"&&!Array.isArray(Me)){const ie=Ue.card||Ie.cards.find(O=>O.id===Me.id),R=We.cards.find(O=>O.id===Me.id);if(ie&&R)for(const O of["created_by","created_by_name","created_at"])ie[O]!==void 0&&(R[O]=ie[O],Me[O]=ie[O])}}z.rev=Ie.rev;const Be=l.getProject();if(Be?.id!==N)throw new Error("恢复节点期间画布已切换");return Be.rev=Math.max(Be.rev,z.rev),l.jput(`/api/projects/${encodeURIComponent(N)}`,z)}async function ue(N=l.getProject()?.id){const z=l.getProject();if(!l.canSave()||!z||z.id!==N)return{ok:!1,error:new Error("画布不可保存或已切换")};if(l.nodeEditor&&!l.editorCard())return{ok:!1,error:new Error("此节点已删除或不可访问")};if(l.nodeEditor&&A?.status===409)return{ok:!1,error:A};const Y=z.id,ke={rev:z.rev||0,name:z.name,cards:z.cards.map(l.plain),edges:z.edges,groups:z.groups||[]};C=!0;try{const $e=await l.jput(`/api/projects/${encodeURIComponent(Y)}`,ke),Ie=l.getProject();return Ie?.id!==Y?{ok:!1,error:new Error("保存期间画布已切换")}:(Ie.rev=Math.max(Ie.rev||0,$e.rev||0),A=null,{ok:!0})}catch($e){let Ie=ii($e);if(Ie.status===409&&l.getProject()?.id===Y&&!l.nodeEditor&&!v)try{const Be=await X(Y,ke);if(Be){const Me=l.getProject();return Me?.id!==Y?{ok:!1,error:new Error("保存期间画布已切换")}:(Me.rev=Math.max(Me.rev||0,Be.rev||0),A=null,{ok:!0})}}catch(Be){Ie=ii(Be)}return l.getProject()?.id===Y&&(A=Ie),Ie.status===409&&l.getProject()?.id===Y&&!l.nodeEditor&&!v?(l.toast("画布在别处被改过，已重新加载"),await l.openProject(Y)):l.showError("保存失败："+Ie.message),{ok:!1,error:Ie}}finally{C=!1,l.flushPendingProjectSync()}}async function L(N=l.getProject()?.id,z=!1){v++;try{for(l.flushFocusedControl();;){const Y=le;if(await Y,await Promise.all([...oe]),l.getProject()?.id!==N)throw new Error("画布已关闭或切换");if(D)throw D;if(A&&[403,404,409].includes(A.status))throw A;if(Y!==le||oe.size||T)continue;if(!l.canSave()){if(z&&!A&&!s&&w===null)return;throw new Error("此画布只读或已锁定，不能保存")}if(l.nodeEditor&&!l.editorCard())throw new Error("此节点已删除，不能保存或重新创建");b(w),w=null;const ke=await I(N);if(!ke.ok)throw ke.error;if(D)throw D;if(!oe.size&&!T&&!s&&w===null)return}}catch(Y){throw Y===D&&(D=null),Y}finally{v--,l.flushPendingProjectSync()}}function P(){b(w),w=null}function j(N){T++;const z=le.catch(()=>{}).then(N).finally(()=>{T--,l.flushPendingProjectSync()});return le=z,z}return{saveView:G,save:M,enqueueSave:I,flushLocalChanges:L,trackNodeWork:B,enqueueCardCreate:j,cancelContentSave:P,cancelTimers(){P(),b(_),_=null},resetFailures(){A=null,D=null},markWorkFailure(N){D=ii(N)},beginFlush(){v++},endFlush(){v--,l.flushPendingProjectSync()},get pendingChain(){return le},get busy(){return w!==null||C||s>0||T>0||oe.size>0||v>0||!!(l.nodeEditor&&A)},get status(){return Object.freeze({contentSaving:C,pendingCardCreates:T,pendingContentSaves:s,localFlushes:v,pendingNodeWork:oe.size,saveScheduled:w!==null,saveFailure:A,workFailure:D})}}}const Wd={create:Ud};function As(l){let u=l;const b=new Set;return{getSnapshot:()=>u,subscribe:w=>(b.add(w),()=>{b.delete(w)}),set:w=>{u=w,b.forEach(_=>_())}}}const bs=()=>({enabled:!1,initialized:!1,loading:!1,hasMore:!1,total:0,error:null,blocked:!1});function Xd(l,u){let b=bs(),w=new Map;const _=new Set;let C=null,T=0,s=null,v=-1/0,A="refresh";function D(){T++,s=null,w.clear(),_.clear(),C=null,v=-1/0,b=bs()}function oe(){const re=l?.isAdmin()===!0;return!re&&b.enabled?(D(),u()):re&&!b.enabled&&(b={...b,enabled:!0}),re&&!b.blocked}function le(re,B=!1){if(!oe()||!l)return Promise.resolve();if(s)return s;if(re==="older"&&(!b.initialized||!b.hasMore||!C))return Promise.resolve();const G=(l.now??Date.now)();if(re==="refresh"&&!B&&G-v<5e3)return Promise.resolve();const M=T,I=re==="older"?C:null;re==="refresh"&&(v=G),b={...b,loading:!0,error:null};const X=Promise.resolve().then(()=>M!==T||!l.isAdmin()?null:l.list({limit:50,status:"all",...I===null?{}:{cursor:I}})).then(ue=>{if(M===T&&!(!oe()||!ue)){if(re==="older"&&ue.next_cursor===I)throw new Error("历史分页游标未前进，请重试");w=new Map(w);for(const L of ue.jobs)_.has(L.id)||w.set(L.id,L);(!b.initialized||re==="older"||C===null)&&(C=ue.next_cursor),b={...b,initialized:!0,total:ue.total,hasMore:C!==null}}}).catch(ue=>{if(M!==T||!oe())return;A=re;const L=typeof ue=="object"&&ue!==null&&"status"in ue&&(ue.status===401||ue.status===403);L&&(w.clear(),C=null),b={...b,error:Kr(ue),blocked:L,...L?{total:0,hasMore:!1,initialized:!1}:{}}}).finally(()=>{M!==T||s!==X||(s=null,b={...b,loading:!1},u())});return s=X,u(),X}return{getSnapshot:()=>b,getJobs:()=>[...w.values()],synchronizeAccess:oe,refresh:()=>le("refresh"),loadMore:()=>le("older"),retry:()=>le(A,!0),reset:D,forgetTask(re){_.add(re),w.delete(re)},forgetLive(re){for(const B of re)w.get(B)?.history_only||w.delete(B)},renameProject(re,B){w=new Map([...w].map(([G,M])=>[G,M.project===re?{...M,projectName:B}:M]))}}}function Jd(l){const u=As([]);let b=null,w=0,_=0,C=[],T=!1;const s=new Set,v=Xd(l.history,D);function A(M,I){return(I.created??0)-(M.created??0)||(M.id<I.id?1:M.id>I.id?-1:0)}function D(){const M=v.getJobs(),I=new Set(C.map(j=>j.id)),X=new Map(M.filter(j=>j.history_only||!T||I.has(j.id)).map(j=>[j.id,j])),ue=v.getSnapshot(),L=[...M].sort(A).at(-1);for(const j of C)(!ue.enabled||Ki(j)||s.has(j.id)||X.has(j.id)||ue.initialized&&L&&A(j,L)<=0)&&X.set(j.id,j);const P=[...X.values()];ue.enabled&&P.sort(A),u.set(P),l.onChange()}function oe(M){const I=M.filter(L=>!L.history_only),X=new Set(I.map(L=>L.id)),ue=new Set(C.map(L=>L.id));for(const L of s)X.has(L)||s.delete(L);for(const L of I)(Ki(L)||T&&!ue.has(L.id))&&s.add(L.id);v.forgetLive(C.filter(L=>!X.has(L.id)).map(L=>L.id)),C=I,T=!0,D()}function le(){_++,b=null}function re(){if(v.refresh(),b)return b;const M=w,I=_,X=(async()=>{let ue;try{ue=await l.list()}catch{return}M!==w||I!==_||(oe(ue),!(M!==w||I!==_)&&await l.onJobsChanged(ue.filter(L=>!L.history_only)))})().finally(()=>{b===X&&(b=null)});return b=X,X}async function B(M){if(M=u.getSnapshot().find(P=>P.id===M.id)??M,M.history_only||!l.canTask(M))return;const I=w,X=await l.remove(M);if(I!==w)return;const ue=ls.parse(X);le();const L=u.getSnapshot().find(P=>P.id===M.id)??M;ue.ok===!0&&!ue.pending&&!L.history_only&&l.canTask(L)&&(v.forgetTask(M.id),await l.onTaskDeleted?.(M)),I===w&&re()}async function G(){const M=C.filter(L=>!Ki(L)&&l.canTask(L));if(!l.clear||!M.length)return;const I=w,X=await l.clear();if(I!==w)return;const ue=ls.parse(X);if(ue.ok===!0&&!ue.pending)for(const L of M)v.forgetTask(L.id);le(),re()}return{...u,setJobs:oe,pollJobs:re,deleteTask:B,clearDoneTasks:G,getLiveSnapshot:()=>C,getHistorySnapshot:v.getSnapshot,refreshHistory:v.refresh,loadMoreHistory:v.loadMore,retryHistory:v.retry,reset(){w++,le(),v.reset(),oe([]),T=!1},retainProjects(M){w++,le(),v.reset(),oe(C.filter(I=>I.project&&M.includes(I.project))),T=!1},renameProject(M,I){v.renameProject(M,I),oe(C.map(X=>X.project===M?{...X,projectName:I}:X))}}}function Yd(l){return async function(b,{deleted:w=!1}={}){const _=l.getProject();if(!_||!l.canOperate())return;const C=_.cards.filter(s=>s.job&&!l.isIF(s)&&(s.status==="queued"||s.status==="running"||s.status==="canceled")).map(s=>({card:s,job:s.job,status:s.status}));let T=!1;for(const{card:s,job:v,status:A}of C){if(l.getProject()!==_||!l.canOperate())return;if(!_.cards.includes(s)||s.job!==v||s.status!==A)continue;const D=b.find(oe=>oe.id===v);if(D&&!(!l.canTask(D)||D.project&&D.project!==_.id||D.card&&D.card!==s.id)){if(w){s.status="canceled",s.step="",s.job=null,l.paint(s),T=!0,l.refreshPanel(s);continue}s.status=D.status,s.progress=D.progress,s.error=D.error,s.queue_remaining=D.queue_remaining,s.queue_ahead=D.queue_ahead,s.queue_order=D.queue_order,s.queue_wait_seconds=D.queue_wait_seconds,s.step=D.step||"",D.seed!=null&&(s.seed=D.seed),D.started&&D.ended&&(s.ms=Math.round((D.ended-D.started)*1e3)),D.outputs?.length&&(s.outputs=D.outputs),l.paint(s),A!==s.status&&(T=!0,l.refreshPanel(s),s.status==="done"&&(l.pushHistory(s,D),l.refreshHistory(s),await l.propagateCardOutputs(s)),s.status==="error"&&l.showError(`「${l.titleOf(s)}」生成失败：${s.error||"未知错误"}`))}}T&&l.getProject()===_&&l.canOperate()&&l.save(!1)}}function Vd(l){return async u=>{if(!Number.isInteger(u.limit)||u.limit<1)throw new Error("无效分页大小");const b=new URLSearchParams({limit:String(u.limit),status:u.status});return u.cursor!==void 0&&b.set("cursor",u.cursor),kd.parse(await l(`/api/jobs/history?${b}`))}}function Kd({document:l,panel:u,button:b,getViewport:w,getUser:_,canTask:C,api:T,jpost:s,jobProjName:v,fmtEla:A,histTime:D,toast:oe,showError:le,confirm:re,onFocusTask:B,onJobsChanged:G,onTaskDeleted:M=()=>{}}){const I=Jd({list:async()=>Cd.parse(await T("/api/jobs")).jobs,remove:R=>T(`/api/job/${R.id}`,{method:"DELETE"}),clear:()=>s("/api/jobs/clear"),canTask:C,history:{list:Vd(T),isAdmin:()=>_()?.role==="admin"},onChange(){j(),u.style.display!=="none"&&$e()},onJobsChanged:G,onTaskDeleted:M}),X=I.pollJobs,ue={queued:"等待中",running:"运行中",done:"已完成",error:"失败",canceled:"已取消"},L=R=>R.status==="queued"||R.status==="running",P=R=>R.status==="running"?"run":R.status==="queued"?"wait":R.status==="done"?"done":R.status==="error"?"bad":"gone";function j(){const R=I.getLiveSnapshot().filter(L),O=R.find(Q=>Q.status==="running"),de=b,ye=`${R.length}|${O?Math.round((O.progress||0)*100):-1}`;if(de._sig===ye)return;de._sig=ye,de.classList.toggle("run",!!O),de.classList.toggle("wait",!O&&R.length>0),de.innerHTML=`任务<span class="n">(${R.length})</span>`;const V=O?`运行中 ${Math.round((O.progress||0)*100)}%`:R.length?"等待中":"";if(V){const Q=l.createElement("span");Q.className="s",Q.textContent=V,de.appendChild(Q)}de.title=R.length?`${R.length} 个任务没跑完，点开可以看详情、停止或删除`:"现在没有任务在跑，点开看历史"}function N(){u.style.display==="none"?(u.style.display="",b.classList.add("open"),$e(),Y(),X()):z()}function z(){u.style.display="none",u.innerHTML="",u._sig=null,b.classList.remove("open")}function Y(){if(u.style.display==="none")return;const R=8,O=b.getBoundingClientRect();u.style.maxHeight=w().height-O.bottom-R*2+"px";const de=u.offsetWidth;u.style.top=O.bottom+R+"px",u.style.left=Math.max(R,Math.min(O.right-de,w().width-de-R))+"px"}const ke=()=>JSON.stringify([I.getHistorySnapshot(),I.getSnapshot().map(R=>[R.id,R.status,!!R.error,R.history_only,R.permission,v(R),R.cardName,R.name,R.submitter_display_name,R.submitter_username])]);function $e(){const R=ke();if(u._sig===R){for(const Ee of u.querySelectorAll(".jrow")){const qe=I.getSnapshot().find(K=>K.id===Ee._id);qe&&Be(Ee,qe)}return}u._sig=R;const O=u.querySelector(".jlist"),de=O?O.scrollTop:0;u.innerHTML="";const ye=l.createElement("div");ye.className="jhd";const V=l.createElement("b"),Q=I.getLiveSnapshot().filter(L).length;if(V.textContent=Q?`任务 · ${Q} 个没跑完`:"任务",ye.appendChild(V),I.getSnapshot().some(Ee=>!Ee.history_only&&!L(Ee))){const Ee=l.createElement("button");Ee.className="lnk",Ee.textContent="清空已结束",Ee.title="只清列表里的记录，已经出好的产物还在节点上",Ee.onclick=ie,ye.appendChild(Ee)}const ne=l.createElement("button");ne.className="x",ne.textContent="✕",ne.title="关闭",ne.onclick=z,ye.appendChild(ne);const c=l.createElement("div");if(c.className="jlist",!I.getSnapshot().length){const Ee=l.createElement("div");Ee.className="jempty",Ee.textContent="还没有任务。在节点上点「生成」，任务就会出现在这里。",c.appendChild(Ee)}for(const Ee of I.getSnapshot())c.appendChild(Ie(Ee));const ae=I.getHistorySnapshot();if(ae.enabled){const Ee=l.createElement("div");if(Ee.className="jhistory",Ee.setAttribute("role","status"),Ee.setAttribute("aria-live","polite"),Ee.textContent=ae.loading?"正在加载任务历史…":ae.error?`任务历史加载失败：${ae.error}`:`已显示 ${I.getSnapshot().length} 条任务 · 历史共 ${ae.total} 条${ae.hasMore?"":" · 已加载全部历史"}`,c.appendChild(Ee),!ae.blocked&&(ae.hasMore||ae.error||ae.loading)){const qe=Me(ae.error?"重试加载任务历史":"加载更早任务",()=>ae.error?I.retryHistory():I.loadMoreHistory());qe.className="jmore",qe.disabled=ae.loading,c.appendChild(qe)}c.onscroll=()=>{const qe=I.getHistorySnapshot();!qe.loading&&!qe.error&&qe.hasMore&&c.scrollHeight-c.scrollTop-c.clientHeight<=120&&I.loadMoreHistory()}}u.append(ye,c),c.scrollTop=de}function Ie(R){const O=l.createElement("div");O.className="jrow "+P(R),O._id=R.id;const de=_()?.role==="admin"?R.submitter_display_name?.trim()||R.submitter_username||"未记录提交人":"";if(de){const K=l.createElement("div");K.className="jowner",K.textContent=de,O.append(K)}const ye=l.createElement("div");ye.className="r1";const V=l.createElement("span");V.className="nm";const Q=R.cardName||R.name||R.id,ne=v(R);if(ne){const K=l.createElement("i");K.className="pj",K.textContent=ne+" - ",V.appendChild(K)}const c=l.createElement("span");c.className="cn",c.textContent=Q,V.appendChild(c),V.title=(de?`${de} - `:"")+(ne?`${ne} - `:"")+(R.name&&Q!==R.name?`${Q}（${R.name}）`:Q),O._st=l.createElement("span"),O._st.className="st",ye.append(V,O._st);const ae=l.createElement("div");ae.className="r2",O._sp=l.createElement("span"),O._sp.className="sp",O._tm=l.createElement("span"),ae.append(O._sp,O._tm);const Ee=l.createElement("div");if(Ee.className="r3",O._node=l.createElement("span"),O._node.className="node",O._step=l.createElement("span"),O._step.className="step",Ee.append(O._node,O._step),O.append(ye,ae,Ee),L(R)&&(!R.history_only||R.progress!=null)){const K=l.createElement("div");K.className="bar",O._bar=l.createElement("i"),K.appendChild(O._bar),O.appendChild(K)}if(R.error){const K=l.createElement("div");K.className="msg",K.textContent=R.error,O.appendChild(K)}const qe=l.createElement("div");return qe.className="acts",R.history_only||(L(R)&&qe.appendChild(Me("停止",()=>Ue(R))),qe.appendChild(Me("删除",()=>We(R),!0))),R.project&&R.card&&qe.appendChild(Me("看节点",()=>B(R))),O.appendChild(qe),Be(O,R),O}function Be(R,O){const de=Math.round((O.progress||0)*100);R._st.textContent=O.status==="running"?O.progress==null?"运行中":`运行中 ${de}%`:O.status==="queued"?Ms(O):ue[O.status]||O.status,R._st.title=O.status==="queued"&&O.queue_order||"";const ye=[O.name,O.modelName||O.capability].filter(Boolean).join(" · ");R._sp.textContent!==ye&&(R._sp.textContent=R._sp.title=ye);const V=`执行节点：${O.nodeName||(O.history_only?"未记录":"等待分配")}`;R._node.textContent!==V&&(R._node.textContent=R._node.title=V);const Q=O.step?`当前：${O.step}`:"";R._step.textContent!==Q&&(R._step.textContent=R._step.title=Q);const ne=O.started?A(((O.ended||Date.now()/1e3)-O.started)*1e3):"";R._tm.textContent=(O.created==null?"":D(O.created*1e3))+(ne?` · ${ne}`:""),R._bar&&(R._bar.style.width=de+"%")}function Me(R,O,de){const ye=l.createElement("button");return de&&(ye.className="danger"),ye.textContent=R,ye.onclick=O,ye}async function Ue(R){if(R=I.getSnapshot().find(O=>O.id===R.id)||R,R.history_only||!C(R))return oe("此任务关联的画布为只读，不能停止");try{await s(`/api/job/${R.id}/cancel`)}catch(O){return le(O.message)}X()}async function We(R){if(R=I.getSnapshot().find(O=>O.id===R.id)||R,R.history_only||!C(R))return oe("此任务关联的画布为只读，不能删除");if(!(L(R)&&!re("这个任务还没跑完，删除会先把它停掉。继续？")))try{await I.deleteTask(R)}catch(O){return le(O.message)}}async function ie(){if(I.getSnapshot().some(R=>!R.history_only&&!L(R)))try{await I.clearDoneTasks()}catch(R){return le(R.message)}}return{pollJobs:X,paintJobsBtn:j,toggleJobs:N,closeJobs:z,placeJobs:Y,renderJobs:$e,stopTask:Ue,delTask:We,clearDoneJobs:ie,getJobs:I.getSnapshot,reset:I.reset,retainProjects:I.retainProjects,renameProject:I.renameProject}}const Gd={create:Kd,createCanvasUpdater:Yd};function Zd(l,u,b,w,_,C){const{window:T,document:s,addEventListener:v,setTimeout:A,clearTimeout:D,setInterval:oe,clearInterval:le,requestAnimationFrame:re,cancelAnimationFrame:B,ResizeObserver:G,MutationObserver:M,IntersectionObserver:I,URL:X}=l,ue=_.mediaFetch,L=_.WebSocket,P=Wd,j=Gd,N=Od;T.ChoukaImageComposer=C;const z=(e,t=s)=>t.querySelector(e),Y=268,ke=180,$e=900,Ie=90,Be=900,Me=.1,Ue=5,We=e=>e.w||Y,ie="http://www.w3.org/2000/svg",R=new URLSearchParams(location.search),O=R.get("editor")==="1",de=R.get("project"),ye=R.get("card");O&&s.body.classList.add("node-editor"),s.addEventListener("contextmenu",e=>e.preventDefault());let V=[],Q={},ne={},c=null,ae=[],Ee=[],qe="personal",K={x:60,y:70,k:1},ge=null,ee=new Set,zt=null,ut=null,Nn=null,un=null,It=new Map,en=-1,Ut=null,Xn=null,Mt=0,Wt=null,Rt=!1;const g={side:z("#side"),plist:z("#plist"),dot:z("#dot"),spaceSelect:z("#space-select"),spaceLabel:z("#space-label"),spaceStatus:z("#space-status"),ptitle:z("#ptitle"),hint:z("#hint"),fit:z("#fit"),presenceUsers:z("#presence-users"),stage:z("#stage"),world:z("#world"),wires:z("#wires"),groups:z("#groups"),presenceLayer:z("#presence-layer"),lasso:z("#lasso"),selbar:z("#selbar"),dock:z("#dock"),empty:z("#empty"),panel:z("#panel"),hist:z("#hist"),menu:z("#menu"),tip:z("#tip"),toast:z("#toast"),picker:z("#picker"),jobsbtn:z("#jobsbtn"),jobs:z("#jobs"),view:z("#view"),vbox:z("#view .vbox"),respop:z("#respop"),minimapBtn:z("#minimap-btn"),wiresToggle:z("#wires-toggle"),zoomMenu:z("#zoom-menu"),minimap:z("#minimap"),minimapCanvas:z("#minimap-canvas"),minimapViewport:z("#minimap-viewport"),zoomPercent:z("#zoom-percent")},Ve=P.create({setTimeout:A,clearTimeout:D,getProject:()=>c,getView:()=>K,isAuthenticated:()=>u.active,canSave:()=>sn(),nodeEditor:O,editorCard:()=>io(),plain:e=>Lo(e),api:(...e)=>Ft(...e),jpost:(...e)=>_t(...e),jput:(...e)=>$o(...e),recordCanvasEdit:()=>Oo(),flushPendingProjectSync:()=>yi(),openProject:e=>Lr(e),toast:e=>be(e),showError:e=>Re(e),flushFocusedControl:()=>{s.activeElement?.closest?.("#panel, #respop")&&s.activeElement.blur()}}),{saveView:tn,save:pe,enqueueSave:Er,flushLocalChanges:ar,trackNodeWork:J}=Ve,Pe=j.createCanvasUpdater({getProject:()=>c,canOperate:()=>we(),isIF:e=>Ke(e),canTask:e=>Sr(e),paint:e=>st(e),refreshPanel:e=>{g.panel._id===e.id&&ze(e.id)},pushHistory:(e,t)=>Hr(e,t),refreshHistory:e=>{g.hist._id===e.id&&Ur(e.id)},propagateCardOutputs:e=>is(e),titleOf:e=>Se(e),showError:e=>Re(e),save:e=>pe(e)}),nt=j.create({document:s,panel:g.jobs,button:g.jobsbtn,getViewport:()=>({width:innerWidth,height:innerHeight}),getUser:()=>u.user,canTask:e=>Sr(e),api:(...e)=>Ft(...e),jpost:(...e)=>_t(...e),jobProjName:e=>wd(e),fmtEla:e=>br(e),histTime:e=>Hi(e),toast:e=>be(e),showError:e=>Re(e),confirm:e=>confirm(e),onFocusTask:e=>as(e),onJobsChanged:e=>Pe(e),onTaskDeleted:e=>Pe([e],{deleted:!0})}),{pollJobs:ft,paintJobsBtn:nn,toggleJobs:Jn,closeJobs:zn,placeJobs:Pt,renderJobs:In}=nt,we=(e=c)=>u.active&&e?.permission==="operate",sn=()=>we()&&!c.locked,Sr=e=>u.active&&e?.permission==="operate",Ze=()=>we()?!0:(be("此画布只读，不能修改或运行"),!1),Gr=()=>{if(!c?.id)throw new Error("请先打开可操作画布");return`/api/upload?project=${encodeURIComponent(c.id)}`},Ct=async(e,t=!1)=>{if(!Ze())throw new Error("此画布只读");const n=c,r=new FormData;r.append("file",e,e.name);const o=Gr()+(t?"&local_only=1":""),i=await Ft(o,{method:"POST",body:r});if(c!==n||!we())throw new Error("画布已切换或权限已变化，上传已取消");const a=i.files?.[0]||i;if(!a?.url||!a?.ref)throw new Error("上传接口未返回素材");return a};async function Ft(e,t={}){const n=(t.method||"GET").toUpperCase();if(!["GET","HEAD"].includes(n)){const r=new X(e,location.href);if(/^\/api\/(upload|generate|text|rewrite)$/.test(r.pathname)&&!we())throw new Error("此画布只读");const o=r.pathname.match(/^\/api\/projects\/([^/]+)(?:\/(rename|copy))?$/);if(o){const i=ae.find(a=>a.id===decodeURIComponent(o[1]))||(c?.id===decodeURIComponent(o[1])?c:null);if(!we(i)||i.locked&&o[2]!=="copy")throw new Error("此画布不可修改")}}return _.request(e,t)}function wn(){Ve.cancelTimers(),Fo(),c=null,ge=null,ee.clear(),Wt=null,gi(),an(),ir(),po(),En(),zn(),Fn(),g.groups.replaceChildren(),g.selbar.style.display="none",dl(),O&&Rr()}function Pn(){if(s.body.classList.toggle("project-readonly",!!c&&!we()),we()||(Ve.cancelContentSave(),En(),Fn()),g.dock.style.display=we()?"":"none",g.panel._id&&g.panel.dataset.readonly!==String(!we())&&ze(g.panel._id),c){g.ptitle.textContent=c.name;const e=s.createElement("span");e.className="ro",e.textContent=we()?c.locked?"试玩画布 · 刷新还原":"":"只读",g.ptitle.append(e)}}T.addEventListener("h3auth:expired",()=>{rr=null,nt.reset(),ae=[],wn(),Po()});let vn=!1;T.addEventListener("h3auth:denied",async({detail:e})=>{if(!(vn||!u.active||!/^\/api\/(projects|job|upload|generate|text|rewrite|media|thumbnail)/.test(e.path))){vn=!0,c&&e.path!=="/api/thumbnail"&&(c.permission="read",Pn());try{await Pr(),await ft()}finally{vn=!1}}});const _t=(e,t)=>Ft(e,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t||{})}),$o=(e,t)=>Ft(e,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}),Re=e=>b.error(e);let fn=null;function be(e){g.toast.textContent=e,g.toast.style.display="block",D(fn),fn=A(()=>g.toast.style.display="none",Math.min(2600+Math.max(0,String(e).length-20)*70,9e3))}const Ln=()=>Math.random().toString(36).slice(2,10),$r=e=>V.find(t=>t.id===e)||V[0],Dt=["image","audio","video"],Qe={image:"图片",video:"视频",audio:"音频"},rt=(e,t)=>e.id===t||!!(e.ladder&&Object.values(e.ladder).includes(t))||!!(e.route&&Object.values(e.route).some(n=>n.cap===t))||!!(e.modelSwitch&&Object.values(e.modelSwitch).includes(t)),mt=(e,t)=>e?t&&e.modelSwitch&&e.modelSwitch[t]?e.modelSwitch[t]:e.route?e.route[Object.keys(e.route)[0]].cap:e.id:null,$t=e=>{const t=V.find(n=>n.id===e.type);return t&&t.modes.some(n=>rt(n,e.cap))?t:V.find(n=>n.modes.some(r=>rt(r,e.cap)))||$r(e.type)},gt=e=>{const t=$t(e);return t&&t.modes.find(n=>rt(n,e.cap))},Kt=e=>Object.entries((gt(e)||{}).modelSwitch||{}).find(([,t])=>t===e.cap)?.[0],Tn={zimage:"Z-Image",krea2:"Krea2",qwen2511:"Qwen Image Edit 2511",qwen2512:"Qwen Image 2512（双阶段）",qwen21:"Qwen Image 2.1",da3:"Depth Anything 3",depthcrafter:"DepthCrafter"},Yn=_.localBridge.baseURL;let ln=[],Vn=null,jr=!1,Kn="",Lt=!1,mn=!1;const Ke=e=>me(e)?.execution==="if_studio";async function dt(e,t={}){return _.localBridge.request(e,t)}function Mr(e){switch(e.quota_status){case"limited":return`剩余 ${e.remaining} 次免费`;case"exhausted":return"剩余 0 次 · 免费次数已用完";case"unavailable":return"剩余 0 次 · 未开通";case"free":return"免费使用";case"paid":return"已开通 · 按预算使用";default:return e.quota_status?"次数未知":"次数未知 · 请更新桥接器"}}function hn(e=!0){return Vn||(jr=!0,Vn=(async()=>{const t=await dt("/status");if(!t.ready)throw new Error("请先在本机登录 IF CLI");return Lt=t.reference_reuse===!0,mn=t.request_recovery===!0,ln=(await dt("/models")).models,Kn="",ln})().catch(t=>{throw Kn=t.message,t}).finally(()=>{Vn=null,e&&g.panel._id&&ze(g.panel._id)}),Vn)}function Zr(e,t){const n="chouka:if-references:v1:"+JSON.stringify([u.user?.id,t,e.id]);if(e._ifReferences?.key===n)return e._ifReferences;let r;try{r=JSON.parse(sessionStorage.getItem(n))}catch{}const o={key:n,entries:Array.isArray(r?.entries)?r.entries.slice(0,40):[],pending:Array.isArray(r?.pending)?r.pending.slice(0,40):[],job:r?.job||null};return e._ifReferences=o,o}function sr(e){try{sessionStorage.setItem(e.key,JSON.stringify({entries:e.entries,pending:e.pending,job:e.job}))}catch{}}function Qr(e){try{const n=new X(e?.canvas_url);if(n.origin==="https://ifs.alibaba-inc.com"&&!n.username&&!n.password&&n.pathname==="/"&&/^#\/canvas\/c_[A-Za-z0-9_-]+$/.test(n.hash))return n.href}catch{}const t=e?.canvas_id;return typeof t=="string"&&/^c_[A-Za-z0-9_-]+$/.test(t)?`https://ifs.alibaba-inc.com/#/canvas/${t}`:""}function Rn(e){if(!Ke(e)||e.status!=="error")return null;const t=Qr({canvas_url:e.if_canvas_url});if(!t)return null;const n=s.createElement("a");n.className="if-canvas-link",n.textContent="打开 IF 画布",n.href=t,n.target="_blank",n.rel="noopener noreferrer",n.title="在新标签页查看 IF 生成失败原因";for(const r of["pointerdown","mousedown","click","dblclick"])n.addEventListener(r,o=>o.stopPropagation());return n}function jo(e){if(!Ke(e)||e.status!=="error"||!(e.job||e.if_request_id)||!we())return null;const t=s.createElement("button");t.type="button",t.className="if-recover-button",t.textContent=e._ifRestoring?"正在查询原产物…":"查询原产物",t.disabled=!!e._ifRestoring,t.title="由发起人在原电脑查询原任务，不会重新提交生成";for(const n of["pointerdown","mousedown","dblclick"])t.addEventListener(n,r=>r.stopPropagation());return t.onclick=n=>{n.stopPropagation(),Mo(e)},t}async function Mo(e){const t=c;if(!t||!t.cards.includes(e)||!we()||!Ke(e)||e.status!=="error"||!(e.job||e.if_request_id)||e._ifRestoring||e._ifPolling||!confirm(`请由任务发起人在原电脑操作。
只查询本机桥接器中的原任务并取回产物，不会重新生成。
若桥接器已重启，原记录可能无法恢复。继续查询？`))return;const n={cap:e.cap,job:e.job,request:e.if_request_id,started:e.if_started},r=()=>c===t&&t.cards.includes(e)&&we()&&e.status==="error"&&e.cap===n.cap&&e.job===n.job&&e.if_request_id===n.request&&e.if_started===n.started;e._ifRestoring=!0,g.panel._id===e.id&&ze(e.id);try{const o=n.job||(await dt(`/requests/${encodeURIComponent(n.request)}`)).id;if(!r())return;if(!o)throw new Error("本机桥接器未返回原任务编号");const i=await dt(`/runs/${encodeURIComponent(o)}`);if(!r())return;if(i.state==="error")throw new Error("原任务在 IF 中仍为失败："+(i.error||"请打开 IF 画布查看原因"));if(!["starting","running","done"].includes(i.state))throw new Error("原任务状态无法识别，请在 IF 查看");const a={...e,job:o,status:"running",error:null,progress:null,if_started:Number.isFinite(e.if_started)?e.if_started:Date.now(),step:"正在查询原任务并恢复产物"};if(!rn(a,t.id,"running"))throw new Error("无法保存恢复记录，请检查浏览器存储权限");Object.assign(e,{job:a.job,status:a.status,error:null,progress:null,if_started:a.if_started,step:a.step}),st(e),g.panel._id===e.id&&ze(e.id),await on(e,t.id),await ko(e,t.id,i)}catch(o){Re(o.status===404?"本机未找到原任务，请由发起人在原电脑查询；若桥接器已重启，请到 IF 下载原产物。未重新提交生成。":"查询原产物未完成："+o.message+"；未重新提交生成。")}finally{e._ifRestoring=!1,c===t&&t.cards.includes(e)&&g.panel._id===e.id&&ze(e.id)}}function gn(e,t){return"chouka:if-task:v1:"+JSON.stringify([u.user?.id,t,e.id])}function On(e,t){let n;try{n=JSON.parse(sessionStorage.getItem(gn(e,t)))}catch{}return!!(n&&n.cap===e.cap&&Number.isFinite(e.if_started)&&n.if_started===e.if_started&&(e.if_request_id?n.if_request_id===e.if_request_id:e.job&&n.job===e.job)&&(!e.job||!n.job||e.job===n.job))}function rn(e,t,n){const r={phase:n,cap:e.cap,job:e.job,status:e.status,step:e.step,error:e.error,if_started:e.if_started,if_job_cap:e.if_job_cap,if_canvas_url:e.if_canvas_url,ms:e.ms,outputs:e.outputs||[],if_request_id:e.if_request_id,if_submitted_at:e.if_submitted_at,if_pending_prompts:e.if_pending_prompts,inputs:n==="preparing"?{params:e.params,assets:e.assets}:null,entry:e.job?e.history?.find(o=>o.job===e.job):null};try{return sessionStorage.setItem(gn(e,t),JSON.stringify(r)),!0}catch{return!1}}function dn(e,t){if(!Ke(e))return!1;const n=gn(e,t);let r;try{r=JSON.parse(sessionStorage.getItem(n))}catch{}if(!r||r.cap!==e.cap||!Number.isFinite(r.if_started)||!["preparing","submitting","running","done","error"].includes(r.phase))return!1;const o=r.phase==="submitting"&&r.if_request_id&&r.if_request_id===e.if_request_id&&!r.job&&!e.job&&e.status==="error",i=r.phase==="done"&&r.status==="done"&&r.job&&r.job===e.job&&e.status==="error"&&r.outputs?.length;if((e.if_started||0)>r.if_started||e.if_started===r.if_started&&(e.job&&e.job!==r.job||e.if_request_id&&r.if_request_id&&e.if_request_id!==r.if_request_id||!o&&!i&&e.job===r.job&&["done","error"].includes(e.status))){try{sessionStorage.removeItem(n)}catch{}return!1}for(const a of["job","status","step","error","if_started","if_job_cap","if_canvas_url","ms","outputs","if_request_id","if_submitted_at","if_pending_prompts"])e[a]=r[a];if(e.progress=null,r.entry&&r.entry.job===e.job){e.history||=[];const a=e.history.findIndex(d=>d.job===e.job);a<0?e.history.unshift(r.entry):e.history[a]=r.entry}return r.phase==="preparing"&&r.if_request_id&&r.inputs?(e.params=r.inputs.params,e.assets=r.inputs.assets,e.status="queued",e.error=null,e.step="正在恢复 IF 素材准备",e._ifResumePreparing=!0):r.phase==="submitting"&&r.if_request_id?(e.status="running",e.error=null,e.step="正在向本机 IF 确认原请求"):(r.phase==="preparing"||r.phase==="submitting")&&(e.status="error",e.step="",e.error=r.phase==="preparing"?"上次素材准备因页面离开而中断，尚未提交 IF；请确认后重试":"上次 IF 提交结果尚未确认，请先在 IF 查看是否已创建任务，避免重复生成",rn(e,t,"error")),!0}async function on(e,t){const n=e.if_started,r=e.job,o=e.status,i=gn(e,t),a=await Er(t);if(a.ok&&["done","error"].includes(o))try{const d=JSON.parse(sessionStorage.getItem(i));d?.if_started===n&&d.job===r&&d.phase===o&&sessionStorage.removeItem(i)}catch{}return a}function Nr(e){try{const t=new X(e);return t.protocol==="https:"&&t.hostname==="ant.alicdn.com"&&!t.port&&!t.username&&!t.password&&t.pathname.startsWith("/bio/img/")}catch{return!1}}function zr(e,t,n){const r=Zr(e,n);if(r.job===e.job){for(const o of t?.reference_urls||[]){const i=r.pending[o.index];!Number.isInteger(o.index)||!i||i.kind!==o.kind||!Nr(o.url)||(r.entries=r.entries.filter(a=>a.source!==i.source),r.entries.push({...i,url:o.url}))}for(const o of t?.invalid_reference_indices||[]){const i=r.pending[o];i&&(r.entries=r.entries.filter(a=>a.source!==i.source||a.version!==i.version))}sr(r)}}async function lr(e,t){const n=await ue(`/api/if-reference?${new URLSearchParams({url:e.pathname+e.search,type:t})}`,{method:"HEAD",credentials:"same-origin",cache:"no-store"});if(!n.ok)throw new Error(`无法检查引用素材（${n.status}），请确认素材仍存在且有访问权限`);const r=n.headers.get("ETag");if(!r||!/^"[a-f0-9]{64}"$/.test(r))throw new Error("抽卡服务尚不支持引用复用，请更新服务后重试");return r}const Se=e=>{const t=me(e),n=gt(e);return ht(e)?e.name||"素材节点":e.name||(n&&(n.ladder||n.route)?n.name:t?t.name:n?n.name:e.cap)},Nt=e=>!!e&&($t(e)||{}).kind==="style",Gn="@style",bn="@text",tt=e=>String(e.slot||"").startsWith("@"),Gt=e=>!!e&&($t(e)||{}).kind==="text",Ge=e=>Nt(e)||Gt(e),ht=e=>!!e&&($t(e)||{}).kind==="asset",Zn=e=>ht(e)&&(e.outputs||[])[0]||null,cn=e=>e?Nt(e)?String((e.params||{}).style||"").trim():String((e.params||{}).text||"").trim():"",Zt=e=>((e||{}).params||{}).op||"",Qn=e=>(c?c.edges:[]).filter(t=>t.to===e.id&&t.slot===bn).map(t=>ct(t.from)).filter(t=>t&&Ge(t)).map(t=>({id:t.id,name:Se(t),text:cn(t)})),An=e=>(e&&e.inputs||[]).filter(t=>t.type==="textarea"&&t.key!=="negative_prompt"&&!t.template&&!t.advanced),eo=e=>(c?c.edges:[]).filter(t=>t.to===e.id&&t.slot===Gn).map(t=>c.cards.find(n=>n.id===t.from)).filter(t=>t&&Ge(t)&&cn(t));function to(e,t=new Set){if(!e||t.has(e.id))return[];t.add(e.id);const n=[],r=new Set;for(const o of(c?c.edges:[]).filter(i=>i.to===e.id&&!tt(i))){const i=c.cards.find(a=>a.id===o.from);if(!(!i||Ge(i)))for(const a of dr(i,t))r.has(a.id)||(r.add(a.id),n.push(a))}return n}function dr(e,t=new Set){if(!e)return[];const n=eo(e);return n.length?n:to(e,t)}function no(e){return(c?c.cards:[]).filter(t=>!Ge(t)&&!eo(t).some(n=>n.id===e.id)&&dr(t).some(n=>n.id===e.id))}const kn=e=>dr(e).map(cn),qt=()=>(c?c.cards:[]).filter(Ge).forEach(e=>st(e)),E="{提示词}",U=(e,t)=>{const n=e.opt&&e.opt[t];return n&&String(n).trim()?String(n):null},F=(e,t)=>e.optUse&&e.optUse[t]?U(e,t):null,fe=/^(?:For the target video, at [\d.]+ seconds|How the reference pictures align)[^\n]*\n/;function xe(e,t){let n=String(e??"");for(const r of t){if(r.includes(E)){n=r.split(E).join(n);continue}if(!n.trim()){n=r;continue}const o=n.match(fe);n=o?n.slice(0,o[0].length)+`
`+r+`

`+n.slice(o[0].length).replace(/^\s+/,""):r+`

`+n}return n}const Ce=e=>Object.keys(e.assets||{}).filter(t=>t.startsWith("images[")&&e.assets[t]).length;function ve(e){const t=gt(e);if(!t||!t.ladder)return e.cap;const n=Object.keys(t.ladder).map(Number).sort((o,i)=>o-i),r=Math.max(Ce(e),n[0]);return t.ladder[String(n.filter(o=>o<=r).pop())]||e.cap}function Fe(e,t){const n=ne[e];return n?.type===t?n:{type:t,api:{image:null,video:null,audio:null},bridge:{image:t==="video"?6:3,video:t==="video"?1:0,audio:0},reference_fallback:!0,note:"该模型引用规格尚未核实，使用画布兜底数量。"}}const me=e=>{const t=Q[e.cap];if(!t||t.execution!=="if_studio")return t||null;const n=ln.filter(d=>d.type===t.outputType),r=e.params?.if_model||n[0]?.display_name,o=Fe(r,t.outputType),i=o.bridge,a=t.inputs.filter(d=>d.key!=="if_reference"||i?.image||i?.video).map(d=>d.key==="if_reference"?{...d,label:`参考${i?.image?"图片":""}${i?.image&&i?.video?"／":""}${i?.video?"视频":""} HTTPS 地址（可选）`}:d.key==="duration"?{...d,min:o?.duration?.min??1,max:o?.duration?.max??null,type:o?.duration?.max!=null?"slider":"number",step:1,default:o?.duration?.default??d.default,showHint:!0,hint:o?.duration?.max!=null?`当前模型时长：${o.duration.min}–${o.duration.max} 秒（整数）。`:"当前模型时长范围未核实；请输入正整数秒，不套用其他模型上限。"}:d);for(let d=0;d<(i?.image||0);d++)a.push({key:`images[${d}]`,label:"参考图片",type:"image"});for(let d=0;d<(i?.video||0);d++)a.push({key:`video[${d}]`,label:"参考视频",type:"video"});for(const[d,f]of Object.entries(e.assets||{}))f&&(/^images\[\d+\]$/.test(d)&&f.kind==="image"||/^video\[\d+\]$/.test(d)&&f.kind==="video")&&!a.some(h=>h.key===d)&&a.push({key:d,label:f.kind==="image"?"已保留的参考图片":"已保留的参考视频",type:f.kind});return{...t,inputs:a,slotLimits:{image:{max:i?.image||0},video:{max:i?.video||0},audio:{max:0}}}};function Bt(e){const t=me(e)?.inputs.find(r=>r.key==="duration");if(!t)return;const n=Number(e.params.duration??t.default);e.params.duration=Math.min(t.max??1/0,Math.max(t.min,Number.isFinite(n)?Math.round(n):t.default))}function Ir(e,t){const n=gt(e),r=n&&n.route&&n.route[t];return r&&r.cap!==e.cap?r:null}function ro(e,t,n){const r=n&&n.kind?Ir(e,n.kind):null;r&&(nr(c.edges.filter(a=>a.to===e.id)),e.cap=r.cap,e.assets={},t={key:r.slot},Qt(e),ot(),qt());const o=$t(e);let i=!1;return o&&o.id==="card_image"&&n&&n.kind==="image"&&(e.cap==="zimage_t2i"?(pr(e,"zimage_i2i"),e._model||(e._model="zimage"),i=!0):e.cap==="krea2_t2i"&&(pr(e,"krea2_i2i"),e._model||(e._model="krea2"),i=!0),i&&(Qt(e),ot(),qt(),A(()=>ze(e.id),50))),!r&&_a(e.id,t.key)&&(ot(),qt()),e.assets[t.key]=n,er(e),At(e),t}const{CLARITY_STEPS:cr,RATIO_GRID:pi,resolutionPresets:oo,resolutionPreset:Xs,imageSettings:ui,applyInputPresets:Js}=N,aa=N.create({document:s,getCapability:e=>me(e),getCapabilityById:e=>Q[e],getRunCapability:e=>Q[ve(e)]||me(e),getProject:()=>c,isIF:e=>Ke(e),normalizeIFDuration:e=>Bt(e),api:(...e)=>Ft(...e),save:()=>pe(),onReferenceChange:e=>sa(e),ratioWH:So,multiple:Un}),{imageClarityPicker:Ys,referenceVideo:Vs,syncReferenceParameters:fi,refreshVideoParameters:er,videoReferenceStatus:Ks}=aa,{clarityPicker:Gs,paramsBrief:mi,switchImageCapability:pr}=Dd({document:s,save:()=>pe(),claritySteps:cr,ratioGrid:pi,imageClarityPicker:Ys,imageSettings:ui,resolutionPresets:oo,resolutionPreset:Xs,switchImageCapability:(e,t)=>aa.switchImageCapability(e,t)});function sa(e){if(!c?.cards.includes(e)||g.panel._id!==e.id)return;const t=Ke(e)?me(e):Q[ve(e)]||me(e),n=g.panel.querySelector('button[title^="点开弹窗"]');n&&(n.textContent=`⚙ ${mi(e,t)||"参数"}`),g.respop._card===e&&g.respop.style.display!=="none"&&(g.respop._cap!==t.id?Fn():g.respop._refill())}const Zs=e=>(e&&e.inputs||[]).filter(t=>!oi.has(t.key)&&!Dt.includes(t.type)&&t.type!=="textarea"&&(t.type==="seed"||!t.advanced)&&!t.mirror&&!t.rangeOf);function Qs(e,t){const n=Ke(e)?me(e):Q[ve(e)]||me(e),r=n&&(n.imageControls||n.inputs.some(h=>oi.has(h.key))),o=n?.imageControls?["steps","seed"].map(h=>n.inputs.find(m=>m.key===h&&!m.mirror)).filter(Boolean).map(h=>({...h,label:h.key==="steps"?"采样步数":"种子"})):Zs(n);if(!r&&!o.length)return be("这个模式没有可调参数");const i=()=>{if(g.panel._id!==e.id)return;const h=g.panel.querySelectorAll(".foot .tcap"),m=h[h.length-1];if(!m||!m.textContent.startsWith("⚙"))return;const p=mi(e,n);m.textContent=p?`⚙ ${p}`:"⚙ 参数"};let a=!1;const d=()=>{const h=g.respop.contains(s.activeElement)?s.activeElement.id:null;g.respop.innerHTML="";const m=Ks(e,n);if(m&&g.respop.appendChild(m),r&&g.respop.appendChild(Gs(e,n,d)),o.length){const y=s.createElement("div");y.className=n.imageControls?"pwrap image-basic":"pwrap",r&&(y.style.marginTop="12px");for(const x of o){const k=ei(e,x);Fd(k,i),y.appendChild(k)}g.respop.appendChild(y)}if(n.imageControls){const y=n.inputs.filter(x=>!Dt.includes(x.type)&&x.type!=="textarea"&&x.type!=="seed"&&x.key!=="steps"&&!oi.has(x.key)&&!x.mirror&&!x.rangeOf&&!(n.imageControls.mode==="t2i"&&x.key==="encode_resolution")&&!(Ke(e)&&x.key==="if_reference"));if(y.length){const x=s.createElement("details");x.className="image-advanced",x.open=a;const k=s.createElement("summary");k.textContent="模型专属参数",x.appendChild(k),x.addEventListener("toggle",()=>{!x.isConnected||x.open===a||(a=x.open,f())});for(const $ of y)x.appendChild(ei(e,$));g.respop.appendChild(x)}}const p=s.createElement("button");p.className="x",p.textContent="✕",p.title="关闭 (Esc)",p.onclick=Fn,p.dataset.readonlyView="",g.respop.appendChild(p),gs(g.respop,!we()),i(),h&&s.getElementById(h)?.focus({preventScroll:!0})};g.respop._card=e,g.respop._cap=n.id,g.respop._refill=()=>{d();const h=g.respop.getBoundingClientRect();(h.top<8||h.bottom>innerHeight-8)&&f()},d(),g.respop.style.display="",er(e);function f(){if(g.respop.style.display==="none"||!t.isConnected)return;const h=t.getBoundingClientRect(),m=h.top-64,p=innerHeight-h.bottom-16;g.respop.style.maxHeight=Math.max(160,Math.max(m,p))+"px";const y=g.respop.offsetWidth,x=g.respop.offsetHeight,k=Math.max(8,Math.min(h.left+h.width/2-y/2,innerWidth-y-8));let $=h.top-x-8;$<56&&($=Math.max(8,Math.min(h.bottom+8,innerHeight-x-8))),g.respop.style.left=k+"px",g.respop.style.top=$+"px"}f()}const Fn=()=>{g.respop.style.display="none",g.respop._card=null,g.respop._refill=null},el={image:"图片 (png)",video:"视频 (mp4，含音轨)",audio:"音频"},tl={4:"四宫格",6:"六宫格",9:"九宫格",12:"十二宫格",16:"十六宫格"};function la(e){const t=e&&e.grid;if(!t)return"";const n=t[0]*t[1];return tl[n]||`${n}格`}function pn(e,t=null){const n=la(e);if(Dt.includes(e.type)){const o=t&&me(t),a=(o?o.inputs.filter(m=>m.type===e.type&&(t.assets||{})[m.key]):[]).findIndex(m=>m.key===e.key),d=+(String(e.key).match(/\[(\d+)\]/)||[0,0])[1],f=a>=0?a+1:d+1,h=`${Qe[e.type]||e.type}${f}`;return n?`${h}（${n}）`:h}const r=String(e.label||"").trim();return n?`${r}（${n}）`:r}function nl(e){const t=p=>e.inputs.filter(y=>y.type===p),n=[...new Set(e.inputs.filter(p=>Dt.includes(p.type)).map(p=>p.type))],r=t("textarea"),o=e.inputs.find(p=>p.key==="duration"),i=e.inputs.filter(p=>p.key==="width"||p.key==="height"),a=e.inputs.find(p=>p.key==="aspect_ratio"),d=e.inputs.find(p=>p.key==="megapixels"),f=e.inputs.find(p=>p.key==="scale_to_length"),h=[],m=[];for(const p of n){const y=t(p),x=y.filter(S=>S.required),k=y.filter(S=>!S.required),$=Qe[p]||p;x.length&&h.push(`${$} ×${x.length}：${x.map(S=>pn(S)).join(" / ")}`),k.length&&m.push(`可引用${$}（上限 ${or(e,p)}）`)}return n.length||h.push("不需要素材，纯提示词驱动"),r.length&&h.push(r.length>1?`提示词 ×${r.length}`:"提示词"),o&&m.push(o.max==null?"时长范围未核实（正整数秒）":`时长 ${o.min}–${o.max} 秒`),e.imageControls?(m.push(`清晰度 ${cr.map(p=>p.label).join(" / ")}（短边）`),m.push(e.imageControls.mode==="i2i"?"默认原图比例，也可另选画面比例":"画面比例（13 档）")):(i.length&&m.push("画面宽高"),a&&m.push(`画面比例（${a.options.length} 档，默认 ${a.default}）`),d&&m.push(`分辨率 ${kr[0]}p–${kr[kr.length-1]}p（短边，768p 为 H3 原生）`),f&&m.push(`分辨率长边 ${f.min}–${f.max}，画面比例跟随原图`)),e.inputs.some(p=>p.type==="seed")&&m.push("种子"),{need:h,opt:m,out:el[e.outputType]||e.outputType,file:e.file||e.id}}function rl(e,t){const n=nl(e),r=s.createElement("div"),o=s.createElement("b");if(o.textContent=t||e.name,r.appendChild(o),e.note){const d=s.createElement("div");d.className="note",d.textContent=e.note,r.appendChild(d)}const i=(d,f)=>{const h=s.createElement("div");h.className="io";const m=s.createElement("i");m.textContent=d;const p=s.createElement("span");p.textContent=f,h.append(m,p),r.appendChild(h)};i("输入",n.need.join("　·　")),n.opt.length&&i("可调",n.opt.join("　·　")),i("产出",n.out);const a=s.createElement("div");return a.className="fn",a.textContent=n.file,r.appendChild(a),r}function No(e,t,n){const r=s.createElement("div"),o=s.createElement("b");o.textContent=e;const i=s.createElement("div");i.className="note",i.textContent=t,r.append(o,i);for(const[a,d]of n){const f=s.createElement("div");f.className="io";const h=s.createElement("i");h.textContent=a;const m=s.createElement("span");m.textContent=d,f.append(h,m),r.appendChild(f)}return r}function zo(e,t,n){if(!t)return null;const r=rt(t,e.cap),o=r?t.ladder?ve(e):e.cap:mt(t),i=Q[o]||Q[mt(t)];if(!i)return No(n||t.name,"这个模式当前不可用。",[]);const a=rl(i,n||t.name);let d="";if(t.route?d=(t.entry&&t.entry.hint?t.entry.hint:"根据放入的素材类型自动选择工作流。")+(r?`当前会运行「${i.name}」。`:""):t.ladder&&(d="按图片数量自动选择："+Object.keys(t.ladder).map(Number).sort((f,h)=>f-h).map(f=>`${f} 张 → ${(Q[t.ladder[f]]||{}).name||t.ladder[f]}`).join("；")+(r?`。当前 ${Ce(e)} 张，会运行「${i.name}」。`:"。")),d){const f=s.createElement("div");f.className="note",f.textContent=d,a.insertBefore(f,a.children[1]||null)}return a}function ol(e){const t=$t(e);return Nt(e)?No(Se(e),`这个节点保存一段可复用的风格描述，不会单独生成产物。连接到生成节点后会并入提示词，并沿产物连线向下游继承；下游节点自己挂风格时会从那里开始覆盖继承。使用 ${E} 可以指定原提示词插入位置。这里只写画风、色调、光线和镜头质感，具体画面内容留在生成节点。`,[["输入","风格、色调、光线和镜头质感"],["产出","可复用的风格文字"]]):Gt(e)?No(Se(e),"这个节点保存和加工文字。可以连接到生成节点并入提示词，也可以连接到其他文本节点作为加工输入；加工结果会写回节点。",[["输入","节点文字或上游文本"],["产出","可继续连接的文字"]]):ht(e)?No(Se(e),"这个节点保存一份上传素材，不会单独运行。它可以同时连接到多个节点，让同一份图片、视频或音频重复使用；原文件不会被处理。",[["输入","图片、视频或音频"],["产出","可复用的原始素材"]]):zo(e,gt(e),Se(e)||t&&t.name)}function il(e,t){g.tip.innerHTML="",g.tip.appendChild(e),g.tip.style.display="",g.tip.style.left=g.tip.style.top="0px";const n=8,r=52,o=g.stage.getBoundingClientRect(),i=o.left+n,a=o.right-n,d=g.tip.offsetWidth,f=g.tip.offsetHeight;let m=(y=>Math.max(i,Math.min(y,a-d)))(t.left),p=t.bottom+n;p+f>innerHeight-n&&(t.top-n-f>=r?p=t.top-n-f:(p=Math.max(r,innerHeight-n-f),a-(t.right+n)>=d?m=t.right+n:t.left-n-i>=d&&(m=t.left-n-d))),g.tip.style.left=m+"px",g.tip.style.top=p+"px"}const Xt=()=>g.tip.style.display="none";function Io(e,t){let n=null;e.addEventListener("mouseenter",()=>{D(n),n=A(()=>{const r=t();r&&e.matches(":hover")&&il(r,e.getBoundingClientRect())},280)}),e.addEventListener("mouseleave",()=>{D(n),Xt()}),e.addEventListener("mousedown",()=>{D(n),Xt()})}function al(){if(!u.user?.id)return null;try{const e=localStorage.getItem(`chouka:last-project:${u.user.id}`);return ae.find(t=>t.id===e)||null}catch{return null}}function sl(e){if(!(O||!u.active||!u.user?.id))try{localStorage.setItem(`chouka:last-project:${u.user.id}`,e)}catch{}}const da=(async function(){try{await u.requireUser(),u.mountAccount(s.getElementById("account"));const o=await Ft("/api/cards",{cache:"no-store"});V=o.cards,Q=o.capabilities,ne=o.if_model_limits||{},g.dot.classList.toggle("on",!!o.comfy_online)}catch(o){if(Re("后端未就绪："+o.message),!u.active)return}if(l.disposed||(await Pr(),l.disposed))return;jl();const t=new URLSearchParams(location.search),n=t.get("project"),r=t.get("card");if(n)await Lr(n),O?Rr():r&&c?.id===n&&await as({project:n,card:r});else if(O)Rr();else{const o=al();if(o&&await Lr(o.id),!c){const i=ae.find(a=>a.locked);i&&await Lr(i.id)}}await ca(),u.every(ca,5e3),u.every(Pr,5e3),ft(),u.every(ft,700)})();async function ca(){try{const e=await Ft("/api/health");g.dot.classList.toggle("on",!!e.comfy_online),e.mode==="controller"&&u.user?.role==="admin"?(g.dot.href=_.adminURL("/controller"),g.dot.title="打开运行面板",g.dot.setAttribute("aria-label","打开运行面板")):(g.dot.removeAttribute("href"),g.dot.title="ComfyUI 连接状态",g.dot.setAttribute("aria-label","ComfyUI 连接状态"))}catch{g.dot.classList.remove("on")}}function pa(e){return _.projectSpaces(e,u.user?.id,Ee)}function Po(){w.update({projects:ae,teams:Ee,selectedSpace:qe,selectedId:c?.id||null,user:u.user})}async function Pr(){if(!(!u.active||l.disposed)){try{const e=await _.projects.list();if(l.disposed)return;ae=e.projects,Ee=e.teams}catch{return}if(c){const e=ae.find(t=>t.id===c.id);if(!e)wn(),nt.retainProjects(ae.map(t=>t.id));else{const t=c.permission!==e.permission;Object.assign(c,{permission:e.permission,owner_id:e.owner_id,owner_display_name:e.owner_display_name,team_id:e.team_id,team_name:e.team_name,share_count:e.share_count,shared_team_ids:e.shared_team_ids,shared_personally:e.shared_personally,name:e.name,locked:e.locked}),t&&(an(),ir(),ur())}}Pn(),Po()}}const ll=()=>w.create();let hi=0;async function Lr(e){if(c&&c.id!==e&&sn()&&Ve.busy)try{await ar(c.id)}catch(o){Re("切换前保存失败，已保留当前画布："+o.message);return}Ve.cancelTimers(),Fo();const t=++hi;try{const o=await _.projects.get(e);if(t!==hi||!u.active)return;c=o}catch(o){return Re(o.message)}const n=pa(c);n.includes(qe)||(qe=n[0]||"personal"),Po(),Wt=null,Ve.resetFailures(),Rt=!1,c.cards=c.cards||[],c.edges=c.edges||[],c.groups=c.groups||[];const r=[];for(const o of c.cards){const i=gt(o);if(i&&!i.route&&i.id!==o.cap&&!(i.modelSwitch&&Object.values(i.modelSwitch).includes(o.cap))&&(o.cap=i.id),i&&i.modelSwitch){const a=Object.entries(i.modelSwitch).find(([,d])=>d===o.cap);a&&(o._model=a[0])}dn(o,c.id)&&r.push(o),!Ke(o)&&!Ge(o)&&!ht(o)&&o.status==="queued"&&!o.job&&!o._ifResumePreparing&&(o.status="error",o.error="上次提交未取得任务编号，请先检查任务列表，确认后再重试"),Vo(o)}for(const o of c.cards)Gt(o)&&(o.cap!=="text"&&(o.cap="text"),!String((o.params||{}).text||"").trim()&&String(o.out||"").trim()&&(o.params=o.params||{},o.params.text=o.out));if(gi(),K=Object.assign({x:60,y:70,k:1},c.view||{}),ge=null,ee.clear(),an(),g.empty.style.display="none",g.dock.style.display="",g.fit.style.display="",g.ptitle.textContent=c.name,s.getElementById("directorbtn").href=`/director?project=${encodeURIComponent(c.id)}`,c.locked){const o=s.createElement("span");o.className="ro",o.textContent="试玩画布 · 刷新还原",o.title="这张画布是示例：参数怎么改、节点怎么拖、重跑几遍都随便，改动只在这一次里有效，刷新就回到原样。想留下自己的东西就「＋ 新建项目」",g.ptitle.appendChild(o)}ur();for(const o of c.cards)rs(o,c.id);if(r.length&&sn()&&!c.locked)for(const o of r)on(o,c.id);sl(c.id),xa(c.id),Pr()}function dl(){qi(),g.empty.style.display="",g.world.innerHTML="",g.wires.innerHTML="",fr?.disconnect(),Do.clear(),g.wires.classList.remove("has-flow"),g.ptitle.textContent="",g.dock.style.display="none",g.fit.style.display="none",g.hint.textContent=""}const Lo=_.plainCard,ua=["type","cap","name","x","y","w","h","params","assets","opt"];let tr=[],To=[],Tr=null,Ro=null;function gi(){tr=[],To=[],Tr=null,Ro=null}function fa(){return{cards:c.cards.map(e=>JSON.parse(JSON.stringify(Lo(e)))),edges:JSON.parse(JSON.stringify(c.edges)),groups:JSON.parse(JSON.stringify(c.groups||[]))}}function ma(e){return JSON.stringify({cards:e.cards.map(t=>{const n=Object.fromEntries(ua.filter(r=>t[r]!==void 0).map(r=>[r,t[r]]));return n.id=t.id,t.type==="card_asset"&&(n.outputs=t.outputs),n}),edges:e.edges,groups:e.groups})}function bi(e="action"){!c||!we()||O||Tr||(Tr=fa(),Ro=e)}function Oo(){if(!Tr||!c)return;const e=fa(),t=Tr,n=Ro;if(Tr=null,Ro=null,ma(t)===ma(e))return;const r=tr[tr.length-1];n==="typing"&&r?.kind==="typing"&&Date.now()-r.at<1e3?r.after=e:(tr.push({before:t,after:e,kind:n,at:Date.now()}),tr.length>80&&tr.shift()),To=[]}function cl(e){const t=new Map(c.cards.map(n=>[n.id,n]));c.cards=e.cards.map(n=>{const r=t.get(n.id);if(!r)return JSON.parse(JSON.stringify(n));const o=r;for(const i of ua)i in n?o[i]=JSON.parse(JSON.stringify(n[i])):delete o[i];return n.type==="card_asset"&&(o.outputs=JSON.parse(JSON.stringify(n.outputs||[]))),o}),c.edges=JSON.parse(JSON.stringify(e.edges)),c.groups=JSON.parse(JSON.stringify(e.groups)),Jt=null,ee=new Set([...ee].filter(n=>c.cards.some(r=>r.id===n))),ge&&!c.cards.some(n=>n.id===ge)&&(ge=null,an()),ur(),ge&&ze(ge),pe()}function pl(e=!1){if(!c||!we()||O)return;Oo();const t=e?To:tr,n=e?tr:To,r=t.pop();r&&(n.push(r),cl(e?r.after:r.before))}for(const e of["pointerdown","keydown","beforeinput","paste","drop","change"])s.addEventListener(e,t=>{t.target.closest?.("[data-image-composer]")||!c||O||!we()||t.type==="keydown"&&(t.ctrlKey||t.metaKey)&&/^(z|y)$/i.test(t.key)||bi(t.type==="beforeinput"?"typing":"action")},!0);function io(){return!Rt&&c?.id===de?c.cards.find(e=>e.id===ye):null}function Rr(){if(!O)return;const e=io();ee.clear(),e?(ge=e.id,ee.add(e.id),e._el?.classList.add("sel"),ze(e.id)):(ge=null,g.panel.replaceChildren(Go("此节点已删除或不可访问；不会重新创建。请返回导演台刷新项目。")),g.panel._id=null,g.panel.style.display="",Et())}O&&(T.ChoukaNodeEditor={async flush(){if(await da,!io())throw new Error("此节点已删除或不可访问");await ar(de)},payload(){const e=io();if(!e)throw new Error("此节点已删除或不可访问");return Yi(e)}});const ha=["#00e5ff","#ff5da2","#9b7bff","#55e68a","#ffb84d","#58a6ff","#f778ba","#d2e75b"];function ga(e){let t=0;for(const n of String(e||""))t=t*31+n.codePointAt(0)>>>0;return ha[t%ha.length]}function ul(){if(!g.presenceUsers)return;const e=new Map;for(const n of It.values())e.has(n.user_id)||e.set(n.user_id,n);if(g.presenceUsers.replaceChildren(),g.presenceUsers.classList.toggle("on",e.size>0),!e.size)return;const t=s.createElement("span");t.className="presence-count",t.textContent=`${e.size} 人使用中`,g.presenceUsers.appendChild(t);for(const n of e.values()){const r=s.createElement("span");r.className="presence-avatar";const o=ga(n.user_id);r.style.background=o,r.style.boxShadow=`0 0 0 1px ${o}`,r.textContent=String(n.name||"协").trim().slice(0,1).toUpperCase(),r.title=`${n.name||"协作者"} · 正在此画布`,g.presenceUsers.appendChild(r)}}function fl(e){if(!g.presenceLayer||e.connection_id===Nn)return null;let t=e._el;if(t?.isConnected)return t;t=s.createElement("div"),t.className="collab-cursor";const n=ga(e.user_id);t.style.color=n;const r=s.createElement("div");r.className="pointer";const o=s.createElement("div");o.className="label",o.style.backgroundColor=n;const i=s.createElement("span");return i.textContent=e.name||"协作者",o.appendChild(i),t.append(r,o),g.presenceLayer.appendChild(t),e._el=t,t}function ba(e){if(e.connection_id===Nn){e._el?.remove(),e._el=null;return}const t=fl(e);t&&(t.classList.toggle("hidden",!e.visible),e.visible&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&(t.style.transform=`translate(${e.x}px,${e.y}px) scale(${1/K.k})`))}function xi(){for(const e of It.values())ba(e)}function ml(e,t,n){if(Number.isFinite(n)&&n<en)return;Number.isFinite(n)&&(en=n),Nn=t||Nn;const r=new Map;for(const o of e||[]){const i=It.get(o.connection_id);r.set(o.connection_id,Object.assign(i||{},o))}for(const[o,i]of It)r.has(o)||i._el?.remove();It=r,ul(),xi()}function hl(e,t){!c||c.id!==e||t<=(c.rev||0)||Ft(`/api/projects/${encodeURIComponent(e)}`).then(n=>Ao(n)).catch(()=>{})}function Ao(e){if(!c||e.id!==c.id||(e.rev||0)<=(c.rev||0))return;if(O&&!(e.cards||[]).some(o=>o.id===ye)&&(Rt=!0,Ve.cancelContentSave(),Rr()),Ve.busy||Mt){(!Wt||(e.rev||0)>(Wt.rev||0))&&(Wt=e);return}const t=g.panel.style.display!=="none",n=[],r=new Map(c.cards.filter(o=>Ke(o)&&On(o,c.id)&&["queued","running"].includes(o.status)&&Number.isFinite(o.if_started)).map(o=>[o.id,o]));c.name=e.name,c.cards=(e.cards||[]).map(o=>{const i=r.get(o.id),a=i&&o.if_started===i.if_started&&o.job===i.job;if(i&&o.cap===i.cap&&(o.if_started||0)<=i.if_started&&!(o.if_started===i.if_started&&o.job&&i.job&&o.job!==i.job)&&!(o.if_started===i.if_started&&o.if_request_id&&i.if_request_id&&o.if_request_id!==i.if_request_id)&&!(a&&["done","error"].includes(o.status))){const d=Object.fromEntries(["params","assets","job","status","step","error","progress","if_started","if_job_cap","if_canvas_url","if_request_id","if_submitted_at","if_pending_prompts","ms","outputs","history","_ifPolling","_ifRecovering","_ifResumePreparing"].map(f=>[f,i[f]]));return Object.assign(i,o,d)}return dn(o,e.id)&&n.push(o),o}),c.edges=e.edges||[],c.groups=e.groups||[],c.rev=e.rev,c.updated=e.updated,c.director=e.director,gi();for(const o of c.cards)Vo(o);ge&&!c.cards.some(o=>o.id===ge)&&(ge=null),ee=new Set([...ee].filter(o=>c.cards.some(i=>i.id===o))),g.ptitle.textContent=c.name,ur();for(const o of c.cards)r.get(o.id)!==o&&rs(o,c.id);if(n.length&&sn()&&!c.locked)for(const o of n)on(o,c.id);O||(t&&ge?ze(ge):ge||an())}function yi(){if(!Wt||Ve.busy||Mt)return;const e=Wt;Wt=null,Ao(e)}function Fo(){if(D(un),un=null,D(Xn),Xn=null,Ut=null,ut=null,Nn=null,en=-1,zt){const e=zt;zt=null;try{e.close(1e3,"leave canvas")}catch{}}for(const e of It.values())e._el?.remove();It.clear(),g.presenceLayer?.replaceChildren(),g.presenceUsers?.replaceChildren(),g.presenceUsers?.classList.remove("on")}function xa(e){Fo(),ut=e;const t=_.presence(e);zt=t,t.onopen=()=>hl(e,1/0),t.onmessage=n=>{if(t!==zt||ut!==e)return;let r;try{r=_.parsePresence(n.data)}catch{return}if(r.type==="presence")ml(r.members,r.self,r.version);else if(r.type==="cursor"){const o=It.get(r.connection_id);if(!o)return;Object.assign(o,r),ba(o)}else r.type==="card-added"?Mi(r.card,r.rev):r.type==="project-changed"?Ao(r.project):r.type==="project-deleted"&&(be("这张画布已被删除"),wn(),Pr())},t.onclose=()=>{t===zt&&(zt=null,ut===e&&c?.id===e&&u.active&&(un=A(()=>xa(e),1500)))}}function ya(e,t,n=!0){Ut={type:"cursor",x:e,y:t,visible:n},Xn===null&&(Xn=A(()=>{Xn=null,zt?.readyState===L.OPEN&&Ut&&zt.send(_.serializeCursor(Ut)),Ut=null},50))}function Dn(){g.world.style.transform=`translate(${K.x}px,${K.y}px) scale(${K.k})`,g.wires.style.transform=g.world.style.transform,g.groups.style.transform=g.world.style.transform,g.presenceLayer&&(g.presenceLayer.style.transform=g.world.style.transform),typeof xi=="function"&&xi(),g.wires.setAttribute("width",1),g.wires.setAttribute("height",1),_n(),ao(),gl(),Di()}function gl(){g.zoomPercent&&(g.zoomPercent.textContent=Math.round(K.k*100)+"%")}function Cn(e,t){const n=g.stage.getBoundingClientRect();return{x:(e-n.left-K.x)/K.k,y:(t-n.top-K.y)/K.k}}let Or=!1;function ao(){if(!Or||!c||!c.cards.length)return;const e=g.minimapCanvas,t=e.getContext("2d"),n=200,r=150;e.width=n,e.height=r;let o=1/0,i=1/0,a=-1/0,d=-1/0;for(const q of c.cards){const ce=We(q),Ye=q._el?q._el.offsetHeight:200;o=Math.min(o,q.x),i=Math.min(i,q.y),a=Math.max(a,q.x+ce),d=Math.max(d,q.y+Ye)}const f=50;o-=f,i-=f,a+=f,d+=f;const h=a-o,m=d-i,p=Math.min(n/h,r/m);t.fillStyle="#070707",t.fillRect(0,0,n,r),t.fillStyle="#f3f4f6",t.strokeStyle="#f3f4f6",t.lineWidth=1;for(const q of c.cards){const ce=(q.x-o)*p,Ye=(q.y-i)*p,pt=We(q)*p,et=(q._el?q._el.offsetHeight:200)*p;t.fillRect(ce,Ye,pt,et),t.strokeRect(ce,Ye,pt,et)}const y=g.stage.getBoundingClientRect(),x=(-K.x/K.k-o)*p,k=(-K.y/K.k-i)*p,$=y.width/K.k*p,S=y.height/K.k*p;g.minimapViewport.style.left=x+"px",g.minimapViewport.style.top=k+"px",g.minimapViewport.style.width=$+"px",g.minimapViewport.style.height=S+"px",g.minimap._scale=p,g.minimap._minX=o,g.minimap._minY=i}function bl(){Or=!Or,g.minimap.style.display=Or?"":"none",g.minimapBtn.classList.toggle("active",Or),Or&&ao()}function xl(){let e=!1;const t=(n,r)=>{if(!e)return;const o=g.minimap.getBoundingClientRect(),i=n-o.left,a=r-o.top,d=g.minimap._scale||1,f=g.minimap._minX||0,h=g.minimap._minY||0,m=i/d+f,p=a/d+h,y=g.stage.getBoundingClientRect();K.x=-m*K.k+y.width/2,K.y=-p*K.k+y.height/2,Dn(),Et(),tn()};g.minimapViewport.addEventListener("mousedown",n=>{n.preventDefault(),e=!0}),g.minimap.addEventListener("mousedown",n=>{n.target!==g.minimapViewport&&(n.preventDefault(),e=!0,t(n.clientX,n.clientY))}),v("mousemove",n=>{e&&t(n.clientX,n.clientY)}),v("mouseup",()=>{e=!1})}function ur(){qi(),g.world.innerHTML="";const e=s.createDocumentFragment();for(const t of c.cards)e.appendChild(wi(t));g.world.appendChild(e),Dn(),ot(),Dr(),g.hint.textContent=`${c.cards.length} 个节点`,ao(),O&&Rr()}const wa=e=>(Q[ve(e)]||me(e)||$t(e)||{}).outputType||"image",va=e=>{const t=gt(e);return!!(t&&t.route)&&!Object.values(e.assets||{}).some(Boolean)};function Ar(e){return Nt(e)?'<span class="ph">🎨</span>':Gt(e)?'<span class="ph">✍</span>':ht(e)?'<span class="ph">📎</span>':`<span class="ph">${va(e)?"🖼🎬":wa(e)==="video"?"🎬":"🖼"}</span>`}const yl="button,input,textarea,select,audio,.vprog,.cmp,.rz,.port,.inport";function wi(e){const t=$t(e),n=s.createElement("div");n.className="card"+(ge===e.id?" sel":""),n.dataset.id=e.id,n.style.left=e.x+"px",n.style.top=e.y+"px",n.innerHTML=`
    <div class="ch"><span>${t?t.icon:"▪"}</span><span class="t"></span><button class="x" type="button" title="删除" aria-label="删除节点">✕</button></div>
    <div class="body">${Ar(e)}</div>
    <div class="bar"><i></i></div>
    <div class="cf"><span class="kt"></span><span class="st"></span><span class="meta" style="margin-left:auto"></span></div>
    <div class="rz tl" title="拖动改大小（按住 Shift 只改宽）"></div>
    <div class="rz br" title="拖动改大小（按住 Shift 只改宽）"></div>
    <div class="inport"></div>
    <div class="port" title="${ht(e)?"拖到别的节点上 → 这份素材就进它的格子":"拖到空白处 → 用本节点产物新建下游节点"}"></div>`,e._el=n,qn(e),Qt(e);const r=n.querySelector(".ch .x");return r.onmousedown=o=>o.stopPropagation(),r.onclick=o=>{o.stopPropagation(),Da(e)},n.querySelector(".rz.tl").onmousedown=o=>Ia(o,e,n,-1),n.querySelector(".rz.br").onmousedown=o=>Ia(o,e,n,1),n.querySelector(".port").onmousedown=o=>$l(o,e),n.onmousedown=o=>{if(!(o.button===1||o.button===0&&o.shiftKey)){if(o.button===0&&!o.target.closest(yl))return Sl(o,e);o.stopPropagation(),!(o.button===2&&ee.has(e.id)&&c.cards.filter(i=>ee.has(i.id)).length>1)&&Ht(e.id)}},n.oncontextmenu=o=>{o.stopPropagation(),o.preventDefault(),Xt(),!(ee.has(e.id)&&ja(o.clientX,o.clientY))&&(Ht(e.id),Pl(o.clientX,o.clientY,e))},n.ondblclick=o=>{const i=o.target.closest(".body");if(!(!i||Ge(e))&&!(ht(e)&&!Zn(e))&&!o.target.closest(".vprog")){if(o.target.matches("audio")){const a=o.target.getBoundingClientRect();if(o.clientY>a.bottom-34*K.k)return}for(const a of i.querySelectorAll("video"))gr(a),a.pause();uo(e,+(o.target.dataset.i||0))}},wl(n.querySelector(".body")),kl(n.querySelector(".body"),e),Io(n,()=>ol(e)),n.onclick=o=>{!ht(e)||Zn(e)||o.target.closest(".body")&&Qo(e)},st(e),n}let Fr=null;s.addEventListener("play",e=>{if(!(e.target.paused||!e.target.isConnected)){for(const t of s.querySelectorAll("video, audio"))t!==e.target&&(gr(t),t.pause());Fr=e.target}},!0),s.addEventListener("pause",e=>{Fr===e.target&&(Fr=null)},!0),s.addEventListener("mousedown",e=>{for(const n of s.querySelectorAll("video"))n._playRequest&&!n.closest(".body, .vbox")?.contains(e.target)&&gr(n);if(!Fr)return;const t=Fr.closest(".body, .vbox, .arange");(!t||!t.contains(e.target))&&Fr.pause()},!0);function wl(e){const t=(n,r,o)=>{if(!isFinite(n.duration)||!n.duration)return;const i=o.getBoundingClientRect();n.currentTime=Math.min(Math.max((r-i.left)/i.width,0),1)*n.duration};e.onmousedown=n=>{if(n.button!==0)return;const r=n.target.closest(".vprog");if(r){const f=e.querySelector("video");if(!f)return;n.stopPropagation(),n.preventDefault();const h=!f.paused;f.pause(),t(f,n.clientX,r);const m=y=>t(f,y.clientX,r),p=()=>{s.removeEventListener("mousemove",m),s.removeEventListener("mouseup",p),h&&f.play().catch(()=>{})};s.addEventListener("mousemove",m),s.addEventListener("mouseup",p);return}const o=n.target.closest("video");if(!o)return;const i=n.clientX,a=n.clientY,d=f=>{s.removeEventListener("mouseup",d),!(Math.abs(f.clientX-i)+Math.abs(f.clientY-a)>=4)&&(o._previewController?gr(o):o.paused?Xl(o):(gr(o),o.pause()))};s.addEventListener("mouseup",d)},e.addEventListener("timeupdate",n=>{const r=e.querySelector(".vprog i"),o=n.target;!r||!isFinite(o.duration)||!o.duration||(r.style.width=o.currentTime/o.duration*100+"%")},!0)}function qn(e){const t=e._el;if(!t)return;t.style.width=We(e)+"px";const n=t.querySelector(".body");n.style.height=e.h&&!n.classList.contains("grid")?e.h+"px":""}function so(e){const t=e._el;if(!t)return;let n=t.querySelector(".composite-inputs");if(e.cap!=="image_composite"){n?.remove();return}const r=(me(e)?.inputs||[]).filter(h=>h.type==="image"),o=new Set((c?.edges||[]).filter(h=>h.to===e.id&&!tt(h)).flatMap(xn)),i=r.filter(h=>e.assets?.[h.key]||o.has(h.key)),a=JSON.stringify(i.map(h=>[h.key,e.assets?.[h.key],o.has(h.key)]));if(n?.dataset.signature===a)return;n||(n=s.createElement("div"),n.className="composite-inputs",t.querySelector(".body").after(n)),n.dataset.signature=a,n.replaceChildren();const d=s.createElement("div");if(d.className="composite-input-label",d.textContent=`引用图片 · ${i.length}/${r.length}`,n.append(d),!i.length){const h=s.createElement("div");h.className="composite-input-hint",h.textContent="从图片节点连线，或在编辑器中上传图片",n.append(h);return}const f=s.createElement("div");f.className="composite-input-list",n.append(f);for(const h of i){const m=e.assets?.[h.key],p=s.createElement("button");if(p.type="button",p.dataset.compositeReference=h.key,p.title=`${h.label} · ${m?.origin||m?.filename||(m?"查看引用图片":"正在导入")}`,p.setAttribute("aria-label",p.title),p.disabled=!m?.url,m?.url){const x=s.createElement("img");x.src=Ja(m.url)||m.url,x.alt=h.label,x.loading="lazy",x.draggable=!1,p.append(x),p.onmousedown=k=>k.stopPropagation(),p.onclick=k=>{k.stopPropagation(),xo(m)}}const y=s.createElement("span");y.textContent=m?h.label:"导入中",p.append(y),f.append(p)}}function st(e){const t=e._el;if(!t)return;so(e);const n=t.querySelector(".body"),r=t.querySelector(".st"),o=t.querySelector(".meta"),i=t.querySelector(".bar i");if(Nt(e)){const x=String((e.params||{}).style||"").trim();if(n.classList.remove("grid"),n.classList.add("sbody"),qn(e),n.textContent="",x){const q=s.createElement("div");q.className="stx",q.textContent=x,n.appendChild(q)}else n.innerHTML=Ar(e)+'<div class="sempty">在旁边的面板里写一段风格，再把出口拖到生图/生视频节点上</div>';const k=t.querySelector(".port");k&&(k.title="拖到生图/生视频节点上 → 那个节点套用这段风格（拖到空白处会列出所有能挂的玩法）");const $=(c?c.edges:[]).filter(q=>q.from===e.id&&tt(q)).length,S=no(e).length;r.className="st",r.textContent=x?"":"还没写",o.textContent=$?`挂了 ${$} 个节点`+(S?` · 连带下游 ${S} 张`:""):"还没挂节点",i.style.width="0%";return}if(Gt(e)){const x=e.status==="running";n.classList.remove("grid"),n.classList.add("sbody"),qn(e),n.textContent="";const k=s.createElement("textarea");if(k.className="ttxt",k.spellcheck=!1,k.value=String((e.params||{}).text||""),k.placeholder=x?"正在加工，稍等…":"在这里写字；选好加工方式点「↑ 运行」，加工结果就落在这个框里 —— 可以直接改",k.disabled=x,k.oninput=()=>{e.params=e.params||{},e.params.text=k.value;const $=s.querySelector("#panel"),S=$?$.querySelector("textarea"):null;S&&S.placeholder==="在这里写字或直接在节点上写"&&(S.value=k.value),vi(e),pe()},n.appendChild(k),x){const $=s.createElement("div");$.className="load cover",n.appendChild($)}vi(e);return}const a=e.outputs||[],d=a[0],f=vl(e),h=a.map(x=>x.url).join("|")+(f?"|<"+f:""),m=e.status==="queued"||e.status==="running";if(m&&n.dataset.url!=="busy"?(n.dataset.url="busy",n.classList.remove("grid"),qn(e),n.innerHTML='<div class="load"></div>'):!m&&!a.length&&n.dataset.url==="busy"?(n.dataset.url="",n.innerHTML=Ar(e)):ht(e)&&!a.length&&n.dataset.url&&(n.dataset.url="",n.classList.remove("grid"),n.innerHTML=Ar(e)),!m&&a.length&&n.dataset.url!==h&&(n.dataset.url=h,n.classList.toggle("grid",a.length>1),qn(e),a.length>1?(n.style.setProperty("--cols",a.length<=4?2:a.length<=9?3:4),n.innerHTML=a.map((x,k)=>x.kind==="video"?`<video data-video-url="" data-i="${k}" loop preload="none" draggable="false"></video>`:`<img data-i="${k}" alt="" draggable="false">`).join("")):n.innerHTML=d.kind==="video"?'<video data-video-url="" data-i="0" loop preload="none" draggable="false"></video><div class="vprog" title="按住左右拖 → 定位进度（画面上按住是挪节点）"><i></i></div>':d.kind==="audio"?'<audio preload="none" controls style="width:92%"></audio>':f?'<div class="cmp" title="按住左右拖：跟原图对比，看边缘抠干净了没有"><img class="new" alt="" draggable="false" data-i="0"><img class="old" alt="" draggable="false"><div class="cmpx"><i>⇔</i></div><div class="cmptip">按住往右拖 → 回到原图</div></div>':'<img data-i="0" alt="" draggable="false">',Wl(n,a,f),f&&ka(e),!Ge(e)&&!ht(e)))for(let x=0;x<a.length;x++){const k=a[x];if(k.kind==="image"&&!k.width){const $=n.querySelector(`img[data-i="${x}"]`)||n.querySelector("img");if($&&!$.dataset.thumbnail){const S=()=>{!t.isConnected||e._el!==t||!c?.cards.includes(e)||e.outputs?.[x]!==k||!$.naturalWidth||(k.width=$.naturalWidth,k.height=$.naturalHeight,At(e),pe())};$.complete&&$.naturalWidth?S():$.onload=S}}else if(k.kind==="video"&&!k.width){const $=n.querySelector(`video[data-i="${x}"]`)||n.querySelector("video");$&&$.readyState>=1?(k.width=$.videoWidth,k.height=$.videoHeight,At(e),pe()):$&&($.onloadedmetadata=()=>{!t.isConnected||e._el!==t||!c?.cards.includes(e)||e.outputs?.[x]!==k||(k.width=$.videoWidth,k.height=$.videoHeight,At(e),pe())})}}if(ht(e)){r.className="st"+(d?" done":""),r.textContent=d?"已就绪":"点节点选文件",r.title=d?"把右边的出口拖到别的节点 → 这份素材就进那个节点的格子里":r.textContent,i.style.width="0%",o.textContent=d?String(d.filename||d.origin||d.url||"").split(/[\\/]/).pop().slice(-22):"",o.title=d&&d.origin||"";return}const p=e.status;r.className="st"+(p==="running"||p==="queued"?" run":p==="done"?" done":p==="error"?" err":""),r.textContent=p==="queued"?Ke(e)&&e.step?e.step:e.job?Ms(e):"正在提交…":p==="running"?(Ke(e)&&!(e.progress>0)?"生成中":`生成中 ${Math.round((e.progress||0)*100)}%`)+(e.step?` · ${e.step}`:""):p==="done"?br(e.ms)?`已完成 · ${br(e.ms)}`:"已完成":p==="error"?"失败":p==="canceled"?"已取消":e.cap==="image_composite"?"待合成":"待生成",r.title=r.textContent,i.style.width=(p==="running"||p==="queued"?Ke(e)&&!(e.progress>0)?0:(e.progress||.02)*100:p==="done"?100:0)+"%",o.textContent=e.error?String(e.error).slice(0,40):a.length>1?`${a.length} 张`:d?String(d.filename||d.origin||d.url||"").split(/[\\/]/).pop().slice(-22):"",o.title=e.error||"";const y=Rn(e);y&&o.replaceChildren(y)}function vi(e){const t=e._el;if(!t)return;const n=t.querySelector(".st"),r=t.querySelector(".meta"),o=t.querySelector(".bar i"),i=Zt(e),a=e.status==="running",d=cn(e),f=t.querySelector(".port");f&&(f.title="拖到生成节点上 → 并进它的提示词；拖到另一个文本节点上 → 当那段加工的输入（拖到空白处会列出能接的地方）");const h=(c?c.edges:[]).filter(y=>y.from===e.id&&tt(y)).length,m=Qn(e).length;n.className="st"+(a?" run":e.status==="error"?" err":i&&e.status==="done"?" done":""),a?n.textContent="处理中…":i?n.textContent=e.status==="error"?"失败":e.status==="done"?br(e.ms)?`已完成 · ${br(e.ms)}`:"已完成":"待运行":n.textContent=d?"":"还没写",n.title=n.textContent;const p=[];i&&p.push(`输入 ${m} 段`),h&&p.push(`连 ${h} 个节点`),r.textContent=p.join(" · "),r.title=e.error||"",o.style.width=a?"40%":e.status==="done"?"100%":"0%"}function vl(e){const t=Q[ve(e)];if(!t||!t.compare||t.card==="image")return null;const n=e.outputs||[];if(n.length!==1||n[0].kind!=="image")return null;const r=(t.inputs||[]).find(i=>i.type==="image"),o=r&&(e.assets||{})[r.key];return o&&o.kind==="image"?o.url:null}function ka(e){const t=e._el&&e._el.querySelector(".cmp");if(!t)return;const n=e._cmp==null?0:e._cmp;t.style.setProperty("--x",n*100+"%"),t.classList.toggle("dragged",e._cmp!=null)}function kl(e,t){e.addEventListener("mousedown",n=>{if(n.button!==0)return;const r=n.target.closest(".cmp");if(!r)return;n.preventDefault();const o=d=>{const f=r.getBoundingClientRect();t._cmp=Math.min(Math.max((d-f.left)/f.width,0),1),ka(t)};o(n.clientX);const i=d=>o(d.clientX),a=()=>{s.removeEventListener("mousemove",i),s.removeEventListener("mouseup",a)};s.addEventListener("mousemove",i),s.addEventListener("mouseup",a)})}const ct=e=>(c?c.cards:[]).find(t=>t.id===e)||null;function Ca(e,t,n,r=!0){if(!t||!n||n.length<=1)return t?[t]:[];const o=/^(\w+)\[(\d+)\]$/.exec(t),i=e&&me(e);if(!o||!i)return[t];const a=o[1],d=+o[2],f=n[0]&&n[0].kind,h=r?new Set((c?.edges||[]).filter(p=>p.to===e.id&&!tt(p)).flatMap(xn)):null,m=(i.inputs||[]).filter(p=>{const y=new RegExp(`^${a}\\[(\\d+)\\]$`).exec(p.key);return y&&+y[1]>=d&&(!f||p.type===f)&&(!r||!(e.assets||{})[p.key]&&!h.has(p.key))}).sort((p,y)=>parseInt(/\[(\d+)\]/.exec(p.key)[1],10)-parseInt(/\[(\d+)\]/.exec(y.key)[1],10)).slice(0,n.length).map(p=>p.key);return m.length?m:[t]}function xn(e){if(!e||tt(e))return[];if(Array.isArray(e.slots))return[...new Set(e.slots.filter(Boolean))];const t=ct(e.from),n=ct(e.to),r=t&&t.outputs||[],o=t&&t.history&&t.history[0]&&t.history[0].outputs||[];return Ca(n,e.slot,r.length?r:o,!1)}function ki(e){const t=ct(e&&e.to);if(!t||!t.assets)return!1;let n=!1;for(const r of xn(e))r in t.assets&&(delete t.assets[r],n=!0);return n&&(er(t),At(t)),n}function nr(e,t=!0){const n=new Set(e||[]);if(!n.size)return!1;if(t)for(const r of n)ki(r);c.edges=c.edges.filter(r=>!n.has(r));for(const r of new Set([...n].map(o=>o.to))){const o=ct(r);o&&so(o)}return!0}function _a(e,t){const n=[];let r=!1;for(const o of c.edges){if(o.to!==e||tt(o))continue;const i=xn(o);if(!i.includes(t))continue;const a=i.filter(d=>d!==t);r=!0,a.length?(o.slots=a,o.slot===t&&(o.slot=a[0])):n.push(o)}return nr(n,!1),r}function Ci(e){const t=ct(e);if(!t)return null;const n=t._el?t._el.offsetHeight:230;return{x:t.x,y:t.y,w:We(t),h:n}}let Jt=null,fr=null;const Do=new Map;function Cl(e,t){const n=new Set(e.cards.map(a=>a.id)),r=new Map,o=new Map;for(const a of e.edges)!n.has(a.from)||!n.has(a.to)||(r.has(a.to)||r.set(a.to,[]),o.has(a.from)||o.set(a.from,[]),r.get(a.to).push(a),o.get(a.from).push(a));const i=(a,d)=>{const f=new Set,h=new Set,m=[...t].filter(p=>n.has(p));for(;m.length;){const p=m.pop();if(!h.has(p)){h.add(p);for(const y of a.get(p)||[])f.add(y),m.push(y[d])}}return f};return{upstream:i(r,"from"),downstream:i(o,"to")}}function Ea(e){if(tt(e))return!1;const t=ct(e.from),n=ct(e.to);return!!(t&&n&&!Ge(t)&&dr(t).length&&!eo(n).length)}function _i(e){const t=ct(e.from),n=ct(e.to),r=o=>o?Se(o):"?";return tt(e)?e.slot===bn?`文本：${r(t)} → ${r(n)}`:`风格：${r(t)} → ${r(n)}`:`${r(t)} → ${r(n)}${e.version?`（固定分镜版本 · ${e.version.job} · 第 ${e.version.index+1} 张）`:""}`}function Sa(){fr?.disconnect();const e=Jt||O?[]:ee.size?[...ee]:ge?[ge]:[],{upstream:t,downstream:n}=c&&e.length?Cl(c,e):{upstream:new Set,downstream:new Set};g.wires.classList.toggle("has-flow",!!(t.size||n.size));const r=t.size||n.size;if(r||g.wires.querySelector("defs")?.remove(),r&&!g.wires.querySelector("defs")){const o=s.createElementNS(ie,"defs");for(const i of["up","down","both"]){const a=s.createElementNS(ie,"marker");for(const[f,h]of Object.entries({id:`wire-arrow-${i}`,class:`flow-${i}`,viewBox:"0 0 10 8",refX:9,refY:4,markerWidth:10,markerHeight:8,markerUnits:"userSpaceOnUse",orient:"auto"}))a.setAttribute(f,h);const d=s.createElementNS(ie,"polygon");d.setAttribute("points","0,0 9,4 0,8 2.5,4"),a.append(d),o.append(a)}g.wires.append(o),fr||(fr=new I(i=>{for(const a of i)a.target.classList.toggle("in-view",a.isIntersecting)},{root:g.stage,rootMargin:"80px"}))}for(const[o,i]of Do){const a=t.has(o)?n.has(o)?"both":"up":n.has(o)?"down":"";if(i.line.classList.toggle("sel",o===Jt),i.line.classList.toggle("related",!!a),i.carry?.classList.toggle("related",!!a),!a){i.flow?.remove(),i.flow=null;continue}i.flow||(i.flow=s.createElementNS(ie,"path"),i.flow.setAttribute("d",i.line.getAttribute("d")),i.flow.setAttribute("aria-hidden","true"),i.flow.classList.add("flow"),g.wires.append(i.flow)),i.flow.classList.remove("flow-up","flow-down","flow-both"),i.flow.classList.add(`flow-${a}`),i.flow.setAttribute("marker-end",`url(#wire-arrow-${a})`),fr.observe(i.flow)}}function ot(e=!0){if(!e){Sa(),_n();return}if(fr?.disconnect(),Do.clear(),g.wires.innerHTML="",!c){g.wires.classList.remove("has-flow"),_n();return}for(const t of c.edges){const n=Ci(t.from),r=Ci(t.to);if(!n||!r)continue;const o=n.x+n.w,i=n.y+n.h/2,a=r.x,d=r.y+r.h/2,f=Math.max(50,Math.abs(a-o)*.5),h=`M${o},${i} C${o+f},${i} ${a-f},${d} ${a},${d}`,m=$=>{const S=s.createElementNS(ie,"path");return $&&S.setAttribute("class",$),S.setAttribute("d",h),g.wires.appendChild(S),S},p=m("hit"),y=s.createElementNS(ie,"title");y.textContent=_i(t)+(Ea(t)?"（风格也顺着这根线往下传）":"")+"　点一下选中，Delete 删除",p.appendChild(y),p.addEventListener("mousedown",$=>{$.stopPropagation(),za(t)}),p.addEventListener("contextmenu",$=>{$.preventDefault(),$.stopPropagation(),za(t),El($.clientX,$.clientY,t)});const x=m(tt(t)?"txt":""),k=Ea(t)?m("carry"):null;Do.set(t,{line:x,carry:k,flow:null})}Sa(),_n(),Dr()}function qo(e){return{x:e.x,y:e.y,w:We(e),h:e._el?e._el.offsetHeight:230}}function Ei(e=Y,t=230){const n=g.stage.getBoundingClientRect(),r=Cn((n.left+n.right)/2,(n.top+n.bottom)/2),o=r.x-e/2,i=r.y-t/2,a=24,d=(c?c.cards:[]).map(qo),f=(m,p)=>!d.some(y=>m<y.x+y.w+a&&m+e+a>y.x&&p<y.y+y.h+a&&p+t+a>y.y);if(f(o,i))return{x:Math.round(o),y:Math.round(i)};const h=64;for(let m=1;m<=24;m++)for(const[p,y]of[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=o+p*m*h,k=i+y*m*h;if(f(x,k))return{x:Math.round(x),y:Math.round(k)}}return{x:Math.round(o),y:Math.round(i)}}function $a(e){let t=1/0,n=1/0,r=-1/0,o=-1/0;for(const i of e){const a=ct(i);if(!a)continue;const d=qo(a);t=Math.min(t,d.x),n=Math.min(n,d.y),r=Math.max(r,d.x+d.w),o=Math.max(o,d.y+d.h)}return t===1/0?null:{x:t,y:n,w:r-t,h:o-n}}function _l(e){if(!c||!Ze()||!["left","right","top","bottom","center"].includes(e))return;const t=c.cards.filter(S=>ee.has(S.id)).map((S,q)=>({c:S,index:q,...qo(S)}));if(t.length<2)return;const n=Math.min(...t.map(S=>S.x)),r=Math.min(...t.map(S=>S.y)),o=Math.max(...t.map(S=>S.x+S.w)),i=Math.max(...t.map(S=>S.y+S.h)),a=e==="left"||e==="right"||e==="center",d=new Map(t.map(S=>[S.c.id,S])),f=new Map(t.map(S=>[S.c.id,new Set])),h=new Map(t.map(S=>[S.c.id,new Set])),m=new Map(t.map(S=>[S.c.id,0]));for(const S of c.edges)S.from===S.to||!d.has(S.from)||!d.has(S.to)||(f.get(S.from).add(S.to),f.get(S.to).add(S.from),h.get(S.from).has(S.to)||(h.get(S.from).add(S.to),m.set(S.to,m.get(S.to)+1)));const p=new Set,y=[],x=(S,q)=>S.x-q.x||S.y-q.y||S.index-q.index;for(const S of t){if(p.has(S.c.id))continue;const q=[],ce=[S.c.id];p.add(S.c.id);for(let et=0;et<ce.length;et++){const He=ce[et];q.push(d.get(He));for(const xt of f.get(He))p.has(xt)||(p.add(xt),ce.push(xt))}const Ye=new Set(q),pt=[];for(;Ye.size;){const et=[...Ye].filter(xt=>m.get(xt.c.id)===0),He=(et.length?et:[...Ye]).sort(x)[0];Ye.delete(He),pt.push(He);for(const xt of h.get(He.c.id))m.set(xt,m.get(xt)-1)}y.push({items:pt,x:Math.min(...q.map(et=>et.x)),y:Math.min(...q.map(et=>et.y)),w:q.reduce((et,He)=>et+He.w,0)+24*(q.length-1),h:Math.max(...q.map(et=>et.h))})}y.sort((S,q)=>a?S.y-q.y||S.x-q.x:S.x-q.x||S.y-q.y);let k=a?r:n;const $=[];for(const S of y){let q=a?e==="left"?n:e==="right"?o-S.w:(n+o-S.w)/2:k;const ce=a?k:e==="top"?r:i-S.h;for(const Ye of S.items)$.push({...Ye,nx:q,ny:e==="bottom"?ce+S.h-Ye.h:ce}),q+=Ye.w+24;k+=(a?S.h:S.w)+24}if($.some(S=>Math.abs(S.nx-S.x)>1e-7||Math.abs(S.ny-S.y)>1e-7)){for(const{c:S,nx:q,ny:ce}of $)S.x=q,S.y=ce,S._el&&(S._el.style.left=q+"px",S._el.style.top=ce+"px");ot(),Et(),ao(),pe()}}function ja(e,t){if(!we()||!c)return!1;const n=c.cards.filter(i=>ee.has(i.id));if(n.length<2)return!1;const r=c,o=[["left","左对齐"],["right","右对齐"],["top","顶部对齐"],["bottom","底部对齐"],["center","垂直居中对齐"]].map(([i,a])=>({text:a,run:()=>{c===r&&_l(i)}}));return Ot(e,t,"选中节点",[{text:"对齐方式",children:o},{text:`复制选中节点（${n.length} 个）`,run:()=>{c===r&&mr()}},{text:`批量重命名（${n.length} 个节点）`,run:()=>{if(c!==r||!we())return;const i=c.cards.filter(a=>ee.has(a.id));i.length>1&&ji(i[0])}},{text:`批量删除（${n.length} 个节点）`,danger:!0,run:()=>{c!==r||!we()||c.cards.filter(i=>ee.has(i.id)).length>1&&Si()}}]),!0}function _n(){if(!g.groups)return;let e=g.groups.querySelector(".selbox");if(!ee.size){e&&e.remove(),g.selbar.style.display="none";return}const t=$a(ee);if(!t)return ee.clear(),_n();if(e||(e=s.createElement("div"),e.className="selbox",g.groups.appendChild(e)),e.style.left=t.x-8+"px",e.style.top=t.y-8+"px",e.style.width=t.w+16+"px",e.style.height=t.h+16+"px",ee.size<2){g.selbar.style.display="none";return}g.selbar.style.display="";const n=g.stage.getBoundingClientRect(),r=K.x+t.x*K.k,o=K.y+t.y*K.k;g.selbar.style.left=Math.max(4,Math.min(r,n.width-g.selbar.offsetWidth-4))+"px",g.selbar.style.top=Math.max(50,o-g.selbar.offsetHeight-10)+"px"}function Dr(){if(g.groups&&(g.groups.querySelectorAll(".ggroup").forEach(e=>e.remove()),!!c))for(const e of c.groups||[]){const t=$a(e.cards);if(!t)continue;const n=12,r=28,o=s.createElement("div");o.className="ggroup",o.style.left=t.x-n+"px",o.style.top=t.y-r+"px",o.style.width=t.w+n*2+"px",o.style.height=t.h+n+r+"px";const i=s.createElement("div");i.className="gglabel",i.textContent=`${e.name}（${e.cards.length}）`,o.appendChild(i),o.onmousedown=a=>{a.button===0&&(a.stopPropagation(),a.preventDefault(),ee=new Set(e.cards),Jt=null,ot(!1),Na(a,[...e.cards].map(ct).filter(Boolean)))},i.ondblclick=a=>{a.stopPropagation(),Ma(e)},o.oncontextmenu=a=>{a.preventDefault(),a.stopPropagation(),Ot(a.clientX,a.clientY,e.name,[{icon:"✎",text:"重命名",run:()=>Ma(e)},{icon:"✕",text:"删除组（节点保留）",danger:!0,run:()=>{Ze()&&(c.groups=c.groups.filter(d=>d!==e),Dr(),pe())}}])},g.groups.appendChild(o)}}function Ma(e){if(!Ze())return;const t=prompt("组名",e.name);t!==null&&(e.name=t.trim().slice(0,30)||e.name,Dr(),pe())}function Na(e,t,n){if(!we()||e.button!==0||!t.length)return;e.stopPropagation(),e.preventDefault(),Xt();const r={mx:e.clientX,my:e.clientY,pos:t.map(d=>({c:d,x:d.x,y:d.y}))};let o=!1;const i=d=>{if(!o&&Math.abs(d.clientX-r.mx)+Math.abs(d.clientY-r.my)<4)return;o||(o=!0);const f=(d.clientX-r.mx)/K.k,h=(d.clientY-r.my)/K.k;for(const m of r.pos)m.c.x=Math.round(m.x+f),m.c.y=Math.round(m.y+h),m.c._el&&(m.c._el.style.left=m.c.x+"px",m.c._el.style.top=m.c.y+"px");ot(),Et()},a=()=>{s.removeEventListener("mousemove",i),s.removeEventListener("mouseup",a),o?(Et(),pe()):n&&n()};s.addEventListener("mousemove",i),s.addEventListener("mouseup",a)}function Si(){if(!Ze())return;const e=c,t=[...ee].map(ct).filter(Boolean);if(!t.length)return;const n=t.filter(o=>(o.history||[]).length||(o.outputs||[]).length).length;if(!confirm(`删除选中的 ${t.length} 个节点？
`+(n?`其中 ${n} 个节点有历史记录或产物。
`:"")+"相关连线和节点内记录会一并移除，此操作不能撤销；不会删除素材文件。")||c!==e||!we())return;const r=Fa(t.map(o=>o.id));r&&be(`已删除 ${r} 个节点`)}function za(e){Jt=e,ge=null,En(),Xt(),an();for(const t of c.cards)t._el&&t._el.classList.remove("sel");ot(),be(_i(e)+" · Delete 删除")}function El(e,t,n){const r=ct(n.from),o=ct(n.to);Ot(e,t,_i(n),[...r?[{icon:"◧",text:`选中上游「${Se(r)}」`,run:()=>Ht(r.id)}]:[],...o?[{icon:"◨",text:`选中下游「${Se(o)}」`,run:()=>Ht(o.id)}]:[],{icon:"✕",text:n.slot===bn?"断开这段文本":tt(n)?"解除这个风格节点":"删除连线",danger:!0,run:()=>lo(n)}])}function lo(e){if(!Ze())return;const t=!tt(e)&&ki(e);nr([e],!1),Jt===e&&(Jt=null),ot(),qt(),ge&&ze(ge),pe(),be(e.slot===bn?"已断开这段文本输入":tt(e)?"已解除风格":t?"已删除连线，并清除下游引用":"已删除连线")}function Ht(e){ge=e,ee.clear(),Jt=null,ot(!1);for(const t of c.cards)t._el&&t._el.classList.toggle("sel",t.id===e);Ur(e),ze(e)}function Sl(e,t,n){if(!we()){e.stopPropagation(),Ht(t.id);return}if(e.button!==0)return;const r=ee.has(t.id)&&c.cards.filter(i=>ee.has(i.id)).length>1;let o=r?[...ee]:null;if(!o){const i=new Set;for(const a of c.groups||[])a.cards.includes(t.id)&&a.cards.forEach(d=>i.add(d));i.size>1&&(o=[...i])}r?En():Ht(t.id),Na(e,o?o.map(ct).filter(Boolean):[t],r?()=>Ht(t.id):void 0)}function Ia(e,t,n,r){if(!Ze()||e.button!==0)return;e.stopPropagation(),e.preventDefault(),Xt(),Ht(t.id);const o=n.querySelector(".body"),i={mx:e.clientX,my:e.clientY,x:t.x,y:t.y,w:We(t),h:t.h||o.offsetHeight,ch:n.offsetHeight},a=(m,p,y)=>Math.max(p,Math.min(y,Math.round(m)));let d=!1;const f=m=>{!d&&Math.abs(m.clientX-i.mx)+Math.abs(m.clientY-i.my)<3||(d||(d=!0),t.w=a(i.w+(m.clientX-i.mx)/K.k*r,ke,$e),m.shiftKey||(t.h=a(i.h+(m.clientY-i.my)/K.k*r,Ie,Be)),qn(t),r<0&&(t.x=i.x+(i.w-t.w),t.y=i.y+(i.ch-n.offsetHeight),n.style.left=t.x+"px",n.style.top=t.y+"px"),ot(),Et())},h=()=>{s.removeEventListener("mousemove",f),s.removeEventListener("mouseup",h),d&&(Et(),pe())};s.addEventListener("mousemove",f),s.addEventListener("mouseup",h)}function $l(e,t){if(e.button!==0||!Ze())return;e.stopPropagation(),e.preventDefault(),Xt();const n=Ci(t.id),r=s.createElementNS(ie,"path");r.setAttribute("class","tmp"),g.wires.appendChild(r);const o=n.x+n.w,i=n.y+n.h/2;g.world.classList.add("wiring");let a=null;const d=h=>{const m=Cn(h.clientX,h.clientY);a=m;const p=Math.max(50,Math.abs(m.x-o)*.5);r.setAttribute("d",`M${o},${i} C${o+p},${i} ${m.x-p},${m.y} ${m.x},${m.y}`)},f=h=>{s.removeEventListener("mousemove",d),s.removeEventListener("mouseup",f),r.remove(),g.world.classList.remove("wiring");const m=h.target.closest&&h.target.closest(".card");m&&m.dataset.id!==t.id?Wa(t,c.cards.find(p=>p.id===m.dataset.id)):a&&Bl(t,a,h.clientX,h.clientY)};s.addEventListener("mousemove",d),s.addEventListener("mouseup",f)}function jl(){for(const o of["beforeinput","input","change","paste","drop","dragover","click","mousedown","pointerdown","contextmenu","keydown"])s.addEventListener(o,i=>{if(we()||!c)return;const a=i.target;if(a.closest?.("#panel, #respop")){Hd(i)&&(i.preventDefault(),i.stopImmediatePropagation());return}const f=a.closest?.("#dock, #selbar"),h=a.closest?.("#world input, #world textarea, #world select, #world [contenteditable]"),m=["paste","drop","dragover"].includes(o)&&a.closest?.("#stage");(f||h||m)&&(i.preventDefault(),i.stopImmediatePropagation())},!0);matchMedia("(max-width: 760px)").matches&&s.body.classList.add("collapsed"),z("#toggle").setAttribute("aria-expanded",String(!s.body.classList.contains("collapsed"))),z("#toggle").onclick=()=>{const o=s.body.classList.toggle("collapsed");z("#toggle").setAttribute("aria-expanded",String(!o))},z("#createHere").onclick=ll,Ml(),g.fit.onclick=()=>{K={x:60,y:70,k:1},Dn(),Et(),tn()},g.jobsbtn.onclick=Jn,g.selbar.innerHTML="";const e=s.createElement("button");e.className="mkgroup",e.textContent="▦ 打组",e.title="把选中的节点圈成一个组：拖分组框整体移动；双击组名改名，右键框删组（节点保留）",e.onclick=()=>{if(!we()||ee.size<2)return;if(c.groups=c.groups||[],c.groups.find(i=>i.cards.length===ee.size&&i.cards.every(a=>ee.has(a))))return be("这几张已经是同一组了");c.groups.push({id:Ln(),name:`组 ${c.groups.length+1}`,cards:[...ee]}),_n(),Dr(),pe(),be("已打组：拖组里的节点或分组框 = 整组一起动；双击组名改名，右键框删组")};const t=s.createElement("button");t.className="renamecards act",t.textContent="批量重命名",t.title="一次填写所有选中节点的新名称，统一确认；留空恢复默认名称",t.onclick=()=>{ee.size>1&&ji(ct([...ee][0]))};const n=s.createElement("button");n.className="deletecards act danger",n.textContent="批量删除",n.title="删除框选的所有节点（Delete / Backspace），操作前统一确认",n.onclick=Si,g.selbar.append(e,t,n),g.selbar.onmousedown=o=>o.stopPropagation(),v("resize",()=>{Jl(),Et(),Pt(),_n()}),g.stage.addEventListener("mousemove",o=>{qr=Cn(o.clientX,o.clientY),ya(qr.x,qr.y)}),g.stage.addEventListener("mouseleave",()=>{qr=null,ya(0,0,!1)}),g.stage.addEventListener("mousedown",o=>{if(O||o.target.closest("#selbar")||o.target.closest("#panel"))return;if(o.button===1||o.button===0&&o.shiftKey){o.preventDefault();const h={mx:o.clientX,my:o.clientY,x:K.x,y:K.y};g.stage.classList.add("panning");let m=!1;const p=x=>{m||(m=!0,Ga(!0)),K.x=h.x+x.clientX-h.mx,K.y=h.y+x.clientY-h.my,Dn()},y=()=>{if(g.stage.classList.remove("panning"),s.removeEventListener("mousemove",p),s.removeEventListener("mouseup",y),m&&o.button===0){const x=k=>{k.preventDefault(),k.stopImmediatePropagation()};s.addEventListener("click",x,{capture:!0,once:!0}),A(()=>s.removeEventListener("click",x,!0),0)}m&&(Ga(!1),Et(),tn())};s.addEventListener("mousemove",p),s.addEventListener("mouseup",y);return}if(o.button!==0)return;o.preventDefault(),En(),zn(),ge=null,an(),Jt=null;for(const h of c?c.cards:[])h._el&&h._el.classList.remove("sel");ee.clear(),ot(!1);const i={mx:o.clientX,my:o.clientY};let a=!1;const d=h=>{if(!a&&Math.abs(h.clientX-i.mx)+Math.abs(h.clientY-i.my)<4)return;a=!0;const m=Math.min(i.mx,h.clientX),p=Math.min(i.my,h.clientY),y=Math.max(i.mx,h.clientX),x=Math.max(i.my,h.clientY),k=g.stage.getBoundingClientRect();g.lasso.style.display="",g.lasso.style.left=m-k.left+"px",g.lasso.style.top=p-k.top+"px",g.lasso.style.width=y-m+"px",g.lasso.style.height=x-p+"px";const $=Cn(m,p),S=Cn(y,x);if(ee.clear(),c)for(const q of c.cards){const ce=qo(q);ce.x<S.x&&ce.x+ce.w>$.x&&ce.y<S.y&&ce.y+ce.h>$.y&&ee.add(q.id)}_n()},f=()=>{if(s.removeEventListener("mousemove",d),s.removeEventListener("mouseup",f),g.lasso.style.display="none",!!a)if(ee.size===1){const h=[...ee][0];ee.clear(),Ht(h)}else ot(!1),ee.size&&be(`选中 ${ee.size} 个节点：拖动整体移动 · 右键对齐 / 批量删除 · Delete 全删 · 上方按钮打组 / 批量重命名 / 批量删除`)};s.addEventListener("mousemove",d),s.addEventListener("mouseup",f)}),g.stage.addEventListener("wheel",o=>{if(O||!c)return;o.preventDefault();const i=Cn(o.clientX,o.clientY),a=Math.min(Ue,Math.max(Me,K.k*(o.deltaY<0?1.1:1/1.1))),d=g.stage.getBoundingClientRect();K.x=o.clientX-d.left-i.x*a,K.y=o.clientY-d.top-i.y*a,K.k=a,Dn(),typeof tn=="function"?tn():pe()},{passive:!1}),g.stage.addEventListener("contextmenu",o=>{if(o.preventDefault(),O||!we()||o.target.closest(".card, #panel, #selbar, #dock, #respop")||(Xt(),ja(o.clientX,o.clientY)))return;const i=Cn(o.clientX,o.clientY),a=[];a.push({group:"生成节点"});const d=V.find(m=>m.kind==="text");d&&a.push({icon:d.icon||"✍",text:"文本",run:()=>{yn(d.id,i.x,i.y,d.modes[0]?mt(d.modes[0]):null)}}),V.filter(m=>m.kind==="gen").forEach(m=>{let p=m.name;p==="生图"?p="图片":p==="生视频"&&(p="视频"),a.push({icon:m.icon||"◻",text:p,run:()=>{yn(m.id,i.x,i.y,m.modes[0]?mt(m.modes[0]):null)}})});const h=V.find(m=>m.id==="card_tools");h&&(a.push({group:"工具"}),a.push({icon:h.icon||"◻",text:"工具",run:()=>yn(h.id,i.x,i.y)})),a.push({group:"其他"}),a.push({icon:"📎",text:"上传素材",run:()=>{const m=s.createElement("input");m.type="file",m.accept="image/*,video/*,audio/*",m.onchange=async p=>{const y=p.target.files[0];if(y)try{const x=await Ct(y),k=V.find(S=>S.kind==="asset");if(!k)return Re("找不到素材节点定义");const $=yn(k.id,i.x,i.y,k.modes[0].id);if(!$)return;await vo($,x),be("已上传："+x.origin)}catch(x){Re("上传失败："+x.message)}},m.click()}}),rr&&a.push({icon:"⧉",text:"粘贴刚复制的节点（Ctrl+V）",run:()=>{qr=i,Ii()}}),a.length>0&&Ot(o.clientX,o.clientY,"画布",a)}),g.stage.addEventListener("dragover",o=>{O||!we()||(o.preventDefault(),o.dataTransfer.dropEffect="copy")}),g.stage.addEventListener("drop",async o=>{if(O||!we())return;if(o.preventDefault(),[...o.dataTransfer?.types||[]].includes(Ui)){o.stopPropagation();const h=yo;if(yo=null,!h||c!==h.project||o.dataTransfer.getData(Ui)!==h.token)return;const m=Cn(o.clientX,o.clientY);try{const p=await Ai(h.output);if(!await Aa(h.project,p,Math.round(m.x-134),Math.round(m.y-84)))return;be(`已建素材节点：${p.origin||h.output.filename||"历史产物"}`)}catch(p){c===h.project&&Re("导入历史产物失败："+p.message)}return}const i=[...o.dataTransfer?.files||[]];if(!i.length)return;const a=i.filter(h=>h.type.startsWith("image/")||h.type.startsWith("video/")||h.type.startsWith("audio/"));if(!a.length)return be("只支持图片、视频、音频文件");const d=Cn(o.clientX,o.clientY),f=c;for(const h of a){if(c!==f||!we())return;try{const m=await Ct(h),p={x:Math.round(d.x-134),y:Math.round(d.y-84)};if(!await Aa(f,m,p.x,p.y))return;be(`已建素材节点：${m.origin||h.name}`),d.x+=50,d.y+=50}catch(m){c===f&&Re(`上传失败 ${h.name}：${m.message}`)}}}),g.view.addEventListener("mousedown",o=>{o.target===g.view&&po()}),v("mousedown",o=>{g.respop.style.display!=="none"&&(g.respop.contains(o.target)||Fn())},!0),v("mousedown",o=>{g.menu.style.display!=="none"&&!g.menu.contains(o.target)&&!o.target.closest(".tcap")&&En()},!0),s.addEventListener("paste",Dl),s.addEventListener("keydown",o=>{if(s.querySelector("dialog[data-image-composer][open]"))return;if(g.view.style.display!=="none"&&(o.key==="ArrowLeft"||o.key==="ArrowRight")){o.preventDefault(),La(o.key==="ArrowRight"?1:-1);return}const i=o.target,a=(i.tagName||"").toLowerCase(),d=a==="input"||a==="textarea"||a==="select"||i.isContentEditable;if(c&&!O&&!d&&g.view.style.display==="none"){if((/Mac/i.test(navigator.platform)?o.metaKey&&!o.ctrlKey:o.ctrlKey&&!o.metaKey)&&!o.altKey&&["z","y"].includes(o.key.toLowerCase())){o.preventDefault(),pl(o.key.toLowerCase()==="y"||o.shiftKey);return}const h=ct(ge);if(!we()&&(["Delete","Backspace"].includes(o.key)||(o.ctrlKey||o.metaKey)&&o.key.toLowerCase()==="v")){o.preventDefault();return}if(o.key==="Delete"||o.key==="Backspace"){if(Jt){o.preventDefault(),lo(Jt);return}if(ee.size>1){o.preventDefault(),Si();return}if(h){o.preventDefault(),Da(h);return}}if((o.ctrlKey||o.metaKey)&&!o.shiftKey&&!o.altKey){const m=o.key.toLowerCase();if(m==="c"&&(h||ee.size)){o.preventDefault(),mr(h);return}if(m==="v"){if(Ri())return;o.preventDefault(),Ii();return}}if(o.key.toLowerCase()==="h"&&h&&!o.ctrlKey&&!o.metaKey&&!o.shiftKey&&!o.altKey){o.preventDefault();const m=g.stage.getBoundingClientRect(),p=m.top+m.height*.3,y=m.left+m.width*.5,x=h.x+(h._el?h._el.offsetWidth/2:Y/2),k=h.y+(h._el?h._el.offsetHeight/2:168/2);K.x=y-x*K.k,K.y=p-k*K.k,Dn(),Et(),tn();return}}if(o.key==="Escape"){if(g.respop.style.display!=="none"){Fn();return}if(g.view.style.display!=="none"){po();return}if(g.jobs.style.display!=="none"){zn();return}if(En(),Xt(),!O){ge=null,an(),Jt=null,ee.clear(),ot(!1);for(const f of c?c.cards:[])f._el&&f._el.classList.remove("sel")}}}),g.minimapBtn.onclick=bl,xl();let r=!0;g.wiresToggle.onclick=()=>{r=!r,g.wires.style.display=r?"":"none",g.wiresToggle.classList.toggle("active",!r),s.querySelectorAll(".card .inp, .card .out").forEach(o=>{o.style.display=r?"":"none"})},g.zoomMenu.onclick=o=>{const i=()=>{typeof tn=="function"?tn():pe()},a=f=>{const h=g.stage.getBoundingClientRect(),m=Cn(h.left+h.width/2,h.top+h.height/2);K.x=h.width/2-m.x*f,K.y=h.height/2-m.y*f,K.k=f,Dn(),Et(),i()},d=[...[500,300,200,125,100,75,50,25,10].map(f=>({icon:f>100?"+":f===100?"1:1":"−",text:`${f>100?"放大":f===100?"重置":"缩小"} (${f}%)`,run:()=>a(f/100)})),{icon:"□",text:"适应画布",run:()=>{K={x:60,y:70,k:1},Dn(),Et(),i()}}];Ot(o.clientX,o.clientY-200,"缩放",d)}}let Bo=0;function Ot(e,t,n,r){Bo++,g.menu.innerHTML="";const o=s.createElement("div");o.className="hd",o.textContent=n,g.menu.appendChild(o);for(const i of r){if(i.group){const m=s.createElement("div");m.className="grp",m.textContent=i.group,g.menu.appendChild(m);continue}const a=s.createElement("button");a.disabled=!!i.disabled,i.disabled&&(a.style.opacity="0.45"),i.danger&&(a.className="danger");const d=s.createElement("span");d.textContent=i.icon||"▸";const f=s.createElement("span");f.textContent=i.text,a.append(d,f);const h=()=>{g.menu.querySelectorAll(".menu-submenu").forEach(m=>m.style.display="none"),g.menu.querySelectorAll('[aria-haspopup="menu"]').forEach(m=>m.setAttribute("aria-expanded","false"))};if(i.children){const m=s.createElement("span");m.className="submenu-arrow",m.textContent="›",m.setAttribute("aria-hidden","true"),a.appendChild(m),a.setAttribute("aria-label",i.text),a.setAttribute("aria-haspopup","menu"),a.setAttribute("aria-expanded","false");const p=s.createElement("div");p.className="menu-submenu",p.style.display="none",p.setAttribute("aria-label",i.text);for(const x of i.children){const k=s.createElement("button"),$=s.createElement("span");$.textContent=x.icon||"▸";const S=s.createElement("span");S.textContent=x.text,k.append($,S),k.onclick=()=>{En(),Xt(),x.run()},p.appendChild(k)}const y=()=>{h(),p.style.display="",a.setAttribute("aria-expanded","true");const x=g.menu.getBoundingClientRect(),k=a.getBoundingClientRect(),$=p.offsetWidth,S=p.offsetHeight,q=x.right+$>innerWidth-8?x.left-$+1:x.right-1;p.style.left=Math.max(8,q)-x.left-g.menu.clientLeft+"px",p.style.top=Math.max(8,Math.min(k.top,innerHeight-S-8))-x.top-g.menu.clientTop+"px"};a.onmouseenter=y,a.onclick=y,a.onkeydown=x=>{x.key==="ArrowRight"&&(x.preventDefault(),y(),p.querySelector("button").focus())},p.onkeydown=x=>{x.key==="ArrowLeft"&&(x.preventDefault(),h(),a.focus())},g.menu.append(a,p)}else a.onmouseenter=h,a.onclick=()=>{En(),Xt(),i.run()},g.menu.appendChild(a);i.tip&&Io(a,i.tip)}g.menu.style.display="",g.menu.style.left=Math.min(e,innerWidth-g.menu.offsetWidth-8)+"px",g.menu.style.top=Math.min(t,innerHeight-g.menu.offsetHeight-8)+"px"}const En=()=>{Bo++,g.menu.style.display="none"};function co(e,t,n){const r=s.createElement("button");r.className="tcap";const o=s.createElement("span");o.textContent=e;const i=s.createElement("i");return i.textContent="▴",r.append(o,i),r.title=t+" —— 点击换",r.onclick=a=>{a.stopPropagation();const d=r.getBoundingClientRect();Ot(d.left,d.bottom+4,t,n());const f=g.menu;d.bottom+f.offsetHeight+12>innerHeight&&(f.style.top=Math.max(48,d.top-f.offsetHeight-8)+"px")},r}function Ml(){const e=(r,o,i,a)=>{const d=s.createElement("button");d.className="dockb",d.title=i;const f=s.createElement("span");f.textContent=r;const h=s.createElement("span");return h.textContent=o,d.append(f,h),d.onmousedown=m=>m.stopPropagation(),d.onclick=m=>{m.stopPropagation(),a(d)},d},t=r=>()=>{if(!c)return;const o=Ei();yn(r,o.x,o.y)},n=()=>{const r=s.createElement("div");return r.className="sep",r};g.dock.innerHTML="",g.dock.append(e("↥","上传","选一个图片/视频文件，放进一个素材节点 —— 再把它的出口拖到别的节点上就能反复用",hd),n(),e("T","文本","新建一个文本节点：存一段字，连到生成节点就并进提示词",t("card_text")),e("▧","图片","新建一个生图节点（默认文生图，玩法在参数面板左下角换）",t("card_image")),e("▷","视频","新建一个生视频节点（默认图生视频，玩法在参数面板左下角换）",t("card_video")),e("◇","工具箱","新建工具箱节点（玩法在参数面板左下角切换）",t("card_tools")))}const Pa={video:"放大播放",audio:"放大播放"};let Xe=null;function Ho(){Xe?.image&&(Xe.image.style.transform=`translate3d(${Xe.x}px, ${Xe.y}px, 0) scale(${Xe.scale})`)}function Nl(){Xe?.image&&(Xe.scale=1,Xe.x=0,Xe.y=0,Ho())}function zl(e){Xe.image=e,Xe.scale=1,Xe.x=0,Xe.y=0,e.classList.add("vimage"),e.title="滚轮缩放 · 拖拽平移 · 双击还原",Ho(),e.addEventListener("wheel",r=>{if(!Xe||Xe.image!==e)return;r.preventDefault();const o=Xe.scale,i=Math.min(8,Math.max(.2,o*Math.exp(-r.deltaY*.0015)));if(i===o)return;const a=e.getBoundingClientRect(),d=i/o;Xe.x+=(r.clientX-(a.left+a.width/2))*(1-d),Xe.y+=(r.clientY-(a.top+a.height/2))*(1-d),Xe.scale=i,Ho()},{passive:!1});let t=null;e.addEventListener("pointerdown",r=>{r.button!==0||!Xe||Xe.image!==e||(r.preventDefault(),t={id:r.pointerId,mx:r.clientX,my:r.clientY,x:Xe.x,y:Xe.y},e.setPointerCapture(r.pointerId),e.classList.add("panning"))}),e.addEventListener("pointermove",r=>{!t||r.pointerId!==t.id||!Xe||Xe.image!==e||(Xe.x=t.x+r.clientX-t.mx,Xe.y=t.y+r.clientY-t.my,Ho())});const n=r=>{!t||r.pointerId!==t.id||(t=null,e.classList.remove("panning"),e.hasPointerCapture(r.pointerId)&&e.releasePointerCapture(r.pointerId))};e.addEventListener("pointerup",n),e.addEventListener("pointercancel",n),e.ondblclick=r=>{r.preventDefault(),Nl()}}function po(){g.vbox.innerHTML="",g.view.style.display="none",Xe=null}function uo(e,t=0,n=null,r=void 0){const o=n||e.outputs||[];if(!o.length){be("这个节点还没有产物，先运行一次");return}Xe={outs:o,idx:Math.min(Math.max(t,0),o.length-1),seed:r!==void 0?r:e?e.seed:null},Ta(),g.view.style.display=""}function La(e){if(!Xe)return;const t=Xe.outs.length;t<2||(Xe.idx=(Xe.idx+e+t)%t,Ta())}function Ta(){const{outs:e,idx:t,seed:n}=Xe,r=e[t];Xe.image=null,Xe.scale=1,Xe.x=0,Xe.y=0;const o=s.createElement("div");o.className="vinfo";const i=[r.filename];e.length>1&&i.unshift(`${t+1} / ${e.length}`),n!=null&&i.push("seed "+n);const a=()=>o.textContent=i.join("　·　");let d;if(r.kind==="video"){d=s.createElement("video"),d.controls=d.autoplay=d.loop=!0;const h=()=>{const m=d.play();m&&typeof m.catch=="function"&&m.catch(()=>{})};d.readyState>=3?h():d.addEventListener("canplay",h,{once:!0}),ho(d,r.url),d.onloadedmetadata=()=>{i.splice(i.indexOf(r.filename)+1,0,`${d.videoWidth}×${d.videoHeight}`,Ra(d.duration)),a()}}else r.kind==="audio"?(d=s.createElement("audio"),d.src=r.url,d.controls=d.autoplay=!0,d.onloadedmetadata=()=>{i.splice(i.indexOf(r.filename)+1,0,Ra(d.duration)),a()}):(d=s.createElement("img"),d.src=r.url,i.push("滚轮缩放 · 拖拽平移 · 双击还原"),d.onload=()=>{i.splice(i.indexOf(r.filename)+1,0,`${d.naturalWidth}×${d.naturalHeight}`),a()},zl(d));d.draggable=!1,a();const f=s.createElement("button");if(f.className="vx",f.textContent="✕",f.title="关闭 (Esc)",f.onclick=po,g.vbox.innerHTML="",g.vbox.append(d,o,f),e.length>1)for(const[h,m,p]of[["p","‹",-1],["n","›",1]]){const y=s.createElement("button");y.className="vnav "+h,y.textContent=m,y.title=p<0?"上一张 (←)":"下一张 (→)",y.onclick=()=>La(p),g.vbox.appendChild(y)}}function Ra(e){if(!isFinite(e))return"时长未知";const t=Math.round(e);return`${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`}const $i=e=>sn()&&!e.locked&&!e.readonly&&!e.read_only&&["card_image","card_video"].includes(e.type)&&me(e)?.kind==="gen";async function Il(e){const t=c?.id,n=e.id;if(!$i(e))return be("此节点或画布不可加入导演台");try{if(await ar(t),e=c?.cards.find(a=>a.id===n),!e||!$i(e))throw new Error("节点已删除、锁定或不可操作");let r=ti(e);if(!r){Mt++;try{const a=await _t(`/api/projects/${encodeURIComponent(t)}/director/import`,{rev:c.director?.rev||0,canvas_rev:c.rev||0,cards:[n]});if(c?.id!==t)throw new Error("画布已切换");if(r=ti(e,a.project),!r)throw new Error("导入接口未返回关联镜头");Ao(a.project)}finally{Mt=Math.max(0,Mt-1),yi()}}const o=`/director?project=${encodeURIComponent(t)}&shot=${encodeURIComponent(r.id)}`;T.open(o,"_blank","noopener"),be("导演镜头已就绪");const i=s.createElement("a");i.href=o,i.target="_blank",i.rel="noopener",i.textContent="打开导演镜头",g.toast.append(" · ",i)}catch(r){Re("导演台操作失败："+r.message)}}function Pl(e,t,n){if(!we())return Ot(e,t,Se(n),[{text:"复制节点",run:()=>mr(n)},...(n.outputs||[]).length?[{text:"预览产物",run:()=>uo(n)}]:[]]);const r=me(n),o={icon:"✎",text:ee.size>1&&ee.has(n.id)?`批量重命名（${ee.size} 个节点）`:"重命名节点",run:()=>ji(n)};if(Nt(n)){const h=c.edges.filter(m=>m.from===n.id&&tt(m)).length;return Ot(e,t,n.name||"风格化提示词",[o,{icon:"⧉",text:"就地复制一张",run:()=>Wo(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>mr(n)},...h?[{icon:"⊘",text:`解除挂着的 ${h} 个节点`,run:()=>{c.edges=c.edges.filter(m=>!(m.from===n.id&&tt(m))),ot(),qt(),ge&&ze(ge),pe()}}]:[],...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Uo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>mo(n.id)}])}if(Gt(n))return Ot(e,t,n.name||Se(n),[...Zt(n)?[{icon:"↑",text:"运行（加工文本）",run:()=>ni(n)}]:[],o,{icon:"⧉",text:"就地复制一张",run:()=>Wo(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>mr(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Uo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>mo(n.id)}]);if(ht(n)){const h=Zn(n);return Ot(e,t,n.name||Se(n),[...h?[{icon:"⛶",text:Pa[h.kind]||"查看大图",run:()=>xo(h)}]:[],...h?[{icon:"⬇",text:`下载${Qe[h.kind]||"文件"}`,run:()=>fo(h)}]:[],{icon:"📁",text:"选择 / 换文件",run:()=>Qo(n)},o,{icon:"⧉",text:"就地复制一张",run:()=>Wo(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>mr(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Uo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>mo(n.id)}])}const i=n.outputs||[],a=i[0],d=i.length>1?`逐张看大图（${i.length} 张）`:Pa[a&&a.kind]||"查看大图",f=i.length>1?`下载全部 ${i.length} 张${a.kind==="video"?"视频":a.kind==="audio"?"音频":"图片"}`:`下载${a?.kind==="video"?"视频":a?.kind==="audio"?"音频":"图片"}`;Ot(e,t,n.name||(r?r.name:"节点"),[...!O&&$i(n)?[{text:ti(n)?"查看导演镜头":"加入导演台",run:()=>Il(n)}]:[],...a?[{icon:"⛶",text:d,run:()=>uo(n)}]:[],...a?[{icon:"⬇",text:f,run:()=>i.forEach(h=>fo(h))}]:[],o,{icon:"↑",text:"运行",run:()=>ni(n)},{icon:"⧉",text:"就地复制一张",run:()=>Wo(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>mr(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Uo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>mo(n.id)}])}function fo(e){const t=s.createElement("a");t.href=e.url,t.download=e.filename.split(/[\\/]/).pop()||"download",s.body.appendChild(t),t.click(),t.remove()}function Uo(e){Ze()&&(delete e.w,delete e.h,qn(e),ot(),Et(),pe())}function ji(e){if(!e||!Ze())return;if(ee.size>1&&ee.has(e.id)){const r=c.cards.filter(o=>ee.has(o.id)).sort((o,i)=>o.y-i.y||o.x-i.x);if(r.length>1)return Ll(r)}const t=me(e),n=prompt("节点名字（留空恢复成工作流名）",e.name||(t?t.name:""));n!==null&&Oa([{card:e,name:n}])}function Ll(e){const t=c,n=s.createElement("dialog");n.className="auth-dialog rename-dialog";const r=s.createElement("form"),o=s.createElement("h2");o.id="rename-heading",o.textContent=`批量重命名（${e.length} 个节点）`,n.setAttribute("aria-labelledby",o.id);const i=s.createElement("p");i.className="auth-note",i.textContent="按画布从上到下、从左到右排列。一次填好各节点名称后统一确认；留空恢复默认名称。";const a=s.createElement("div");a.className="rename-list";const d=e.map((p,y)=>{const x=s.createElement("label");x.className="fld";const k=s.createElement("span");k.textContent=`${y+1}. ${Se(p)}`;const $=s.createElement("input");return $.type="text",$.maxLength=40,$.value=Se(p),$.placeholder=Se({...p,name:null}),x.append(k,$),a.appendChild(x),{card:p,input:$}}),f=s.createElement("footer"),h=s.createElement("button");h.type="button",h.className="btn",h.textContent="取消";const m=s.createElement("button");m.type="submit",m.className="btn primary",m.textContent="确认重命名",f.append(h,m),r.append(o,i,a,f),n.appendChild(r),h.onclick=()=>n.close(),n.addEventListener("close",()=>n.remove()),n.addEventListener("keydown",p=>p.stopPropagation()),r.onsubmit=p=>{p.preventDefault(),c===t&&Ze()&&Oa(d.map(({card:y,input:x})=>({card:y,name:x.value}))),n.close()},s.body.appendChild(n),n.showModal(),d[0].input.focus(),d[0].input.select()}function Oa(e){const t=e.map(({card:r,name:o})=>({card:r,name:o.trim().slice(0,40)||null})).filter(({card:r,name:o})=>c.cards.includes(r)&&o!==(r.name||null)&&!(o&&o===Se(r)));if(!t.length)return;const n=new Map;for(const{card:r,name:o}of t){const i=Se(r),a=Se({...r,name:o});i!==a&&n.set(`@${i}`,`@${a}`)}if(n.size){const r=[...n.keys()].sort((i,a)=>a.length-i.length).map(i=>i.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")),o=new RegExp(`(?:${r.join("|")})(?![\\u4e00-\\u9fa5\\w])`,"g");for(const i of c.cards){for(const a of An(me(i))){const d=i.params?.[a.key];typeof d=="string"&&(i.params[a.key]=d.replace(o,f=>n.get(f)))}for(const a in i.opt||{})typeof i.opt[a]=="string"&&(i.opt[a]=i.opt[a].replace(o,d=>n.get(d)))}}for(const{card:r,name:o}of t)r.name=o,Qt(r);ge&&$n(ge),pe()}function Wo(e){if(Ze())return Ba(qa(e),{x:e.x+24+Y/2,y:e.y+28+40})}function Mi(e,t){if(!c||!e?.id)return;const n=c.cards.find(r=>r.id===e.id);if(n)for(const r of["created_by","created_by_name","created_at"])e[r]!==void 0&&(n[r]=e[r]);else{const r=JSON.parse(JSON.stringify(e));Vo(r),c.cards.push(r),g.world.appendChild(wi(r)),ot(),Dr(),ao(),g.hint.textContent=`${c.cards.length} 个节点`,be(`${r.created_by_name||"协作者"} 添加了「${r.name||"新节点"}」`)}Number.isFinite(t)&&(c.rev=Math.max(c.rev||0,t))}function Aa(e,t,n,r){return J((async()=>{const o=()=>c===e&&we();if(!o())return null;for(;;){const a=Ve.pendingChain;if(await a,!o())return null;if(a===Ve.pendingChain)break}const i=yn("card_asset",n,r,null,!1);return!i||(Ht(i.id),await vo(i,t),!await i._create||!o()||!e.cards.includes(i))?null:i})())}function Tl(e,t){if(!c||e.id!==c.id)return;const n=t.id,r=c.edges.filter(p=>p.from===n||p.to===n),o=(c.groups||[]).filter(p=>p.cards.includes(n)),i=(e.cards||[]).find(p=>p.id===n);if(i)for(const p of["created_by","created_by_name","created_at"])t[p]=i[p];const a=(e.cards||[]).filter(p=>p.id!==n);a.push(t);const d=e.edges||[],f=new Set(d.map(p=>JSON.stringify(p)));for(const p of r){const y=JSON.stringify(p);f.has(y)||(d.push(p),f.add(y))}const h=(e.groups||[]).filter(p=>!p.cards.includes(n));h.push(...o);const m=g.panel.style.display!=="none";Object.assign(c,e,{cards:a,edges:d,groups:h}),Wt&&Wt.rev<=c.rev&&(Wt=null),ur(),m&&ge&&ze(ge)}function Rl(e){!c||e.created_by||(c.cards=c.cards.filter(t=>t!==e),c.edges=c.edges.filter(t=>t.from!==e.id&&t.to!==e.id),c.groups=(c.groups||[]).map(t=>({...t,cards:t.cards.filter(n=>n!==e.id)})).filter(t=>t.cards.length),ee.delete(e.id),ge===e.id&&(ge=null,an()),ur())}function Ol(e,t=!1){const n=c,r=n.id;return Ve.enqueueCardCreate(async()=>{try{const o=await _t(`/api/projects/${encodeURIComponent(r)}/cards`,{card:Lo(e)});if(t){if(c!==n||!n.cards.includes(e))return!1;const i=o.project.cards.find(a=>a.id===e.id);Mi(i,o.project.rev)}else{if(c?.id!==r)return!1;if(!n.cards.includes(e)){const i=o.project.cards.find(a=>a.id===e.id);return n.cards.some(a=>a.id===e.id)?Mi(i,o.project.rev):c.rev=Math.max(c.rev||0,o.project.rev||0),!1}Tl(o.project,e)}return!0}catch(o){(t?c===n:c?.id===r)&&(Ve.markWorkFailure(o),Rl(e),Re("卡片添加失败："+o.message))}})}function yn(e,t,n,r,o=!0){if(!Ze())return null;const i=$r(e);if(!i||!i.modes||!i.modes.length)return Re(`节点类型 ${e} 不可用：找不到定义或没有模式`),null;const a={id:Ln(),type:e,cap:r||mt(i.modes[0]),x:Math.round(t),y:Math.round(n),params:{},assets:{},status:null,progress:0,outputs:[]},f=c.cards.filter(m=>$t(m)===i).reduce((m,p)=>{if(!p.name)return m;const y=p.name.match(/^(.+?)(\d+)$/);return y?Math.max(m,parseInt(y[2],10)):m},0),h=i.name||i.modes[0].name;return a.name=`${h}${f+1}`,bi(),c.cards.push(a),g.world.appendChild(wi(a)),o&&Ht(a.id),ot(),a._create=Ol(a,!o),queueMicrotask(Oo),a}function mo(e){return Fa([e])}function Fa(e){if(!c||!Ze())return 0;const t=new Set(e),n=new Set(c.cards.filter(r=>t.has(r.id)).map(r=>r.id));if(!n.size)return 0;nr(c.edges.filter(r=>n.has(r.from))),c.cards=c.cards.filter(r=>!n.has(r.id)),c.edges=c.edges.filter(r=>!n.has(r.to));for(const r of n)ee.delete(r);if(c.groups){for(const r of c.groups)r.cards=r.cards.filter(o=>!n.has(o));c.groups=c.groups.filter(r=>r.cards.length)}return n.has(ge)&&(ge=null,an()),Xt(),n.has(g.hist._id)&&ir(),Jt=null,ur(),pe(),n.size}function Da(e){if(!c||!Ze()||!e||ct(e.id)!==e)return;const t=c,n=e.id,r=Se(e),o=(e.history||[]).length,i=(e.outputs||[]).length||o;confirm(`删除「${r}」？
`+(i?`它有 ${o} 轮生成记录或产物，节点内记录删除后无法恢复。
`:"")+"相关连线会一并移除，此操作不能撤销；不会删除素材文件。")&&(c!==t||!we()||ct(n)!==e||mo(n)&&be(`已删除「${r}」`))}let rr=null,qr=null,Ni=0;function zi(e){return JSON.parse(JSON.stringify({id:e.id,type:e.type,cap:e.cap,name:e.name||null,w:e.w,h:e.h,x:e.x,y:e.y,params:e.params||{},assets:e.assets||{},outputs:e.outputs||[],opt:e.opt,optUse:e.optUse,optStyles:e.optStyles}))}function qa(e){const t=c.edges.filter(r=>r.to===e.id&&r.from!==e.id&&ct(r.from)).map(r=>tt(r)?{...r}:{...r,slots:xn(r)});for(const[r,o]of Object.entries(e.assets||{})){if(!o||t.some(d=>!tt(d)&&d.slots.includes(r)))continue;const i=typeof o=="string"?[o]:[o.ref,o.url].filter(Boolean),a=c.cards.find(d=>d.id!==e.id&&(d.outputs||[]).some(f=>i.some(h=>h===f.ref||h===f.url)));a&&t.push({from:a.id,to:e.id,slot:r,slots:[r]})}const n=[...new Set(t.map(r=>r.from))].map(r=>{const o=ct(r),i=zi(o);if(!Ge(o)){const a=t.filter(f=>f.from===r&&!tt(f)).flatMap(f=>f.slots.map(h=>{const m=e.assets?.[h];return m&&typeof m=="object"?m:i.outputs.find(p=>m&&(p.ref===m||p.url===m))}).filter(Boolean)),d=[...new Map(a.map(f=>[f.ref||f.url||JSON.stringify(f),f])).values()];Object.assign(i,{type:"card_asset",cap:"asset",name:Se(o),params:{},assets:{},outputs:d.length?d:i.outputs})}return i});return JSON.parse(JSON.stringify({...zi(e),sourceProject:c.id,references:{cards:n,edges:t}}))}function mr(e){const t=!e||ee.has(e.id)?c.cards.filter(n=>ee.has(n.id)):[e];t.length&&(rr=t.map(qa),Ni=0,be(t.length>1?`已复制 ${t.length} 个节点 · Ctrl / Cmd + V 批量粘贴`:`已复制「${Se(t[0])}」${rr[0].outputs.length?"（包含当前产物）":""} · Ctrl / Cmd + V 粘贴`))}function Al(e,t){const n=Array.isArray(e)?e:[e],r=n[0],o=r.sourceProject&&r.sourceProject!==c.id,i=new Set(n.map(x=>x.id)),a=new Map,d=n.flatMap(x=>x.references?.edges||[]);if(o)for(const x of n)for(const k of x.references?.cards||[]){if(i.has(k.id))continue;const $=a.get(k.id);$?$.outputs=[...new Map([...$.outputs||[],...k.outputs||[]].map(S=>[S.ref||S.url||JSON.stringify(S),S])).values()]:a.set(k.id,{...k})}if([...n,...a.values()].some(x=>!V.some(k=>k.id===x.type)))throw new Error("这种节点在当前版本里不存在了，粘不了");const f=(x,k,$)=>{const S=yn(x.type,k,$,x.cap,!1);return S?(Object.assign(S,{...zi(x),id:S.id,x:S.x,y:S.y,status:x.outputs?.length?"done":null}),Qt(S),qn(S),st(S),At(S),es(S),S):null},h=t.x-Y/2-r.x,m=t.y-40-r.y,p=new Map,y=[];for(const x of[...n,...a.values()]){const k=f(x,x.x+h,x.y+m);k&&(p.set(x.id,k.id),i.has(x.id)&&y.push(k))}for(const x of d){const k=p.get(x.from)||!o&&x.from,$=p.get(x.to);k&&$&&ct(k)&&c.edges.push({...JSON.parse(JSON.stringify(x)),from:k,to:$})}if(!y.length)return null;if(y.length===1)Ht(y[0].id);else{ge=null,Jt=null,ee=new Set(y.map(x=>x.id)),an(),ir();for(const x of c.cards)x._el?.classList.toggle("sel",ee.has(x.id));_n()}return ot(),qt(),pe(),be(y.length>1?`已粘贴 ${y.length} 个节点`:`已粘贴「${Se(y[0])}」`),y.length===1?y[0]:y}function Ba(e,t){const n=c;return J((async()=>{try{let r=Array.isArray(e)?e:[e];if(r[0].sourceProject&&r[0].sourceProject!==n.id){const o=r.length>1,i=await _t(`/api/projects/${encodeURIComponent(n.id)}/copy`,{source_project:r[0].sourceProject,card:o?{cards:r}:r[0]});if(!i.card||o&&!Array.isArray(i.card.cards))throw new Error("复制接口未返回节点");r=o?i.card.cards:[i.card]}for(;;){const o=Ve.pendingChain;if(await o,!we()||c!==n)throw new Error("画布已切换或权限已变化，未粘贴");if(o===Ve.pendingChain)break}return Al(r,t)}catch(r){Re(`粘贴失败：${r.message}`)}})())}function Ii(){if(!Ze())return;if(!rr)return be("还没复制东西：先选中节点，Ctrl / Cmd + C");const e=rr[0],t=qr||{x:e.x+Y/2+24*++Ni,y:e.y+40+28*Ni};return Ba(rr,t)}const Pi={png:"image",jpg:"image",jpeg:"image",webp:"image",gif:"image",bmp:"image",mp4:"video",webm:"video",mkv:"video",mov:"video",avi:"video"},Ha={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif","image/bmp":"bmp","video/mp4":"mp4","video/webm":"webm","video/x-matroska":"mkv","video/quicktime":"mov","video/x-msvideo":"avi"};let Li=Promise.resolve();function Ti(e){return Pi[/\.([a-z0-9]+)$/i.exec(e.name||"")?.[1].toLowerCase()]||Pi[Ha[e.type]]||null}function Ri(){if(!c||g.panel.style.display==="none"||g.panel.style.visibility==="hidden"||g.view.style.display!=="none"||s.querySelector("dialog[open]"))return null;const e=O?io():ct(g.panel._id);return e&&e.id===g.panel._id?e:null}function Xo(e,t){if(Ge(e)||ht(e))throw new Error("当前节点不接收图片 / 视频引用，请先打开生成或工具节点的参数面板");const n=$t(e),r=me(e),o=Ir(e,t);let i=e.cap;if(o)i=o.cap;else if(n?.id==="card_image"&&t==="image"&&["zimage_t2i","krea2_t2i"].includes(i))i=i.replace("_t2i","_i2i");else if(n?.id==="card_video"&&t==="video"&&!r?.inputs.some(y=>y.type===t)){const y=n.modes.find(x=>Jo(x,t));y&&(i=mt(y))}const a=c.edges.filter(y=>y.to===e.id&&!tt(y));if(i!==e.cap&&(Object.values(e.assets||{}).some(Boolean)||a.length))throw new Error("引用此素材需要切换模式；为保留已有引用，请先手动选择对应模式");const d=Q[i],f=d?.inputs.filter(y=>y.type===t)||[],h=or(d,t),m=y=>!!e.assets?.[y.key]||a.some(x=>xn(x).includes(y.key)),p=f.find(y=>!m(y));if(!p||f.filter(m).length>=h)throw new Error(f.length?`${Qe[t]}引用已满，不会覆盖已有素材`:`当前节点没有可接收的${Qe[t]}槽位`);return{cap:i,slot:p}}async function Fl(e,t,n){let r=n.cap;const o=()=>c===t&&sn()&&t.cards.includes(n)&&Ri()===n&&n.cap===r;try{if(!o())return;if(!$r("card_asset"))throw new Error("找不到素材节点定义");const i={...n,assets:{...n.assets}};for(const a of e){const d=Xo(i,Ti(a));i.cap=d.cap,i.assets[d.slot.key]=!0}for(const a of e){if(!o())return;const d=Ti(a);Xo(n,d);const f=/\.([a-z0-9]+)$/i.exec(a.name||"")?.[1].toLowerCase(),h=Pi[f]?a:new File([a],`${a.name||"剪贴板素材"}.${Ha[a.type]}`,{type:a.type}),m=await Ct(h,me(n)?.execution==="browser");if(!o())return;if(m.kind!==d)throw new Error("上传素材类型不匹配，未创建节点或引用");for(;;){const k=Ve.pendingChain;if(await k,!o())return;if(k===Ve.pendingChain)break}Xo(n,d);const p=Ei(),y=yn("card_asset",p.x,p.y,null,!1);if(!y||(await vo(y,m,!1),!await y._create))return;if(!o()||!t.cards.includes(y)){c===t&&be("素材已导入，但当前节点已改变，未添加引用");return}const x=Xo(n,d);x.cap!==n.cap&&($t(n)?.id==="card_image"?(pr(n,x.cap),n._model||(n._model=x.cap.startsWith("krea2")?"krea2":"zimage")):n.cap=x.cap,r=n.cap,Qt(n)),n.assets[x.slot.key]=JSON.parse(JSON.stringify(y.outputs[0])),er(n),t.edges.push({from:y.id,to:n.id,slot:x.slot.key,slots:[x.slot.key]}),ot(),qt(),At(n),ze(n.id),pe(),be(`已导入${Qe[d]}素材并引用到「${Se(n)}」的${pn(x.slot,n)}`)}}catch(i){c===t&&Re("剪贴板导入失败："+i.message)}}function Dl(e){if(e.defaultPrevented||s.querySelector("dialog[data-image-composer][open]"))return;const t=Ri();if(!t)return;const n=e.clipboardData,r=[...n?.items||[]].filter(a=>a.kind==="file").map(a=>a.getAsFile()).filter(Boolean),o=r.length?r:[...n?.files||[]];if(o.length){if(e.preventDefault(),!sn())return be("此画布只读或已锁定，不能导入剪贴板素材");const a=o.filter(f=>Ti(f));if(!a.length)return be("剪贴板仅支持图片或视频文件");const d=c;Li=Li.then(()=>Fl(a,d,t)),J(Li);return}e.target.closest("input,textarea,select")||e.target.isContentEditable||O||(rr?(e.preventDefault(),Ii()):n?.types.length&&be("剪贴板未提供可读取的图片 / 视频文件；复制路径不能导入，请拖入文件或上传"))}function or(e,t){if(!e)return 0;const n=e.slotLimits&&e.slotLimits[t]&&e.slotLimits[t].max;return n??e.inputs.filter(r=>r.type===t).length}function Ua(e,t){const n=me(e);return n?n.inputs.filter(r=>r.type===t&&(e.assets||{})[r.key]).length:0}function ql(e,t){const n=me(e);if(!n)return null;const r=new Set((c?.edges||[]).filter(o=>o.to===e.id&&!tt(o)).flatMap(xn));return Ke(e)&&(!or(n,t)||Ua(e,t)>=or(n,t))?null:n.inputs.find(o=>o.type===t&&!e.assets?.[o.key]&&!r.has(o.key))||null}function Oi(e,t){if(!Ze()||e.id===t.id)return;if(Gt(t)){if(!cn(e))return be(`「${Se(e)}」手里还没有字：先写一段，或先运行它`);if(c.edges.some(i=>i.from===e.id&&i.to===t.id&&i.slot===bn))return be("已经接过了");c.edges.push({from:e.id,to:t.id,slot:bn}),ot(),qt(),ge===t.id&&ze(t.id),pe();const o=Qn(t).length;be(`已把「${Se(e)}」的文本接给「${Se(t)}」（第 ${o} 段输入）`);return}if(Nt(t))return be("风格节点不收输入：它把字写给生成节点用");if(!An(me(t)).length)return be(`「${Se(t)}」不写提示词，接文本节点没有用`);if(!cn(e))return be(`「${Se(e)}」手里还没有字：先写一段，或先运行它`);if(c.edges.some(o=>o.from===e.id&&o.to===t.id&&o.slot===Gn))return be("已经挂上了");c.edges.push({from:e.id,to:t.id,slot:Gn}),ot(),qt(),ge===t.id&&ze(t.id),pe();const r=no(e).length;be(`文本已挂给「${Se(t)}」`+(r?`，下游 ${r} 个节点也跟着带`:""))}async function Wa(e,t){if(!Ze()||!t)return;if(Ge(e))return Oi(e,t);if(Ge(t))return be("文本节点不收图片/视频素材：把文本节点的出口拖过来才是接文本");if(ht(t))return be("素材节点不收输入：它是把手里那份素材送给别的节点的");const n=e.outputs||[],r=n[0];if(!r)return be(ht(e)?"这个素材节点还是空的：先点它选个文件":"上游还没有产物，先运行它");const o=$t(t);let i=!1;o&&o.id==="card_image"&&r.kind==="image"&&(t.cap==="zimage_t2i"?(pr(t,"zimage_i2i"),t._model||(t._model="zimage"),Qt(t),i=!0):t.cap==="krea2_t2i"&&(pr(t,"krea2_i2i"),t._model||(t._model="krea2"),Qt(t),i=!0));const a=me(t);if(o&&o.id==="card_video"&&r.kind==="video"&&!Ke(t)&&!(a&&a.inputs.some(m=>m.type==="video"))){const m=o.modes.find(p=>Jo(p,"video"));m&&(nr(c.edges.filter(p=>p.to===t.id&&!tt(p))),t.assets={},t.cap=mt(m),Qt(t),i=!0)}const d=Ir(t,r.kind);d&&(nr(c.edges.filter(m=>m.to===t.id)),t.cap=d.cap,t.assets={},Qt(t));const f=d?{key:d.slot,label:Qe[r.kind]||"素材"}:ql(t,r.kind);if(!f){const m=or(me(t),r.kind);return be(m&&Ua(t,r.kind)>=m?`${Qe[r.kind]||r.kind}引用已达上限 ${m}`:`下游节点没有可接收的${Qe[r.kind]||r.kind}槽位`)}d||nr(c.edges.filter(m=>m.to===t.id&&xn(m).includes(f.key)));const h={from:e.id,to:t.id,slot:f.key,slots:Ca(t,f.key,n)};c.edges.push(h),so(t),ot(),qt();try{const m=kn(t).length&&An(me(t)).length,p=or(me(t),r.kind);be(`引用上游产物 → ${pn(f,t)}`+(p?`（上限 ${p}）`:"")+(m?"；上游的风格也跟着传下来了":""));for(let y=0;y<h.slots.length;y++){const x=n[y];if(!x)break;const k=me(e)?.execution==="browser"&&x.ref?.startsWith("chouka/"),$=ht(e)||k?JSON.parse(JSON.stringify(x)):await Ai(x,me(t)?.execution==="browser");if(!c||!c.edges.includes(h))return;t.assets[h.slots[y]]=$}er(t),At(t),ot(),(i||ge===t.id)&&ze(t.id),pe()}catch(m){c?.edges.includes(h)&&(nr([h]),so(t),ot(),qt(),ge===t.id&&ze(t.id)),pe(),Re("引用失败："+m.message)}}function Jo(e,t){if(e.route)return!!e.route[t];const n=Q[mt(e)];return!!n&&n.inputs.some(r=>r.type===t)}async function Bl(e,t,n,r){if(!Ze())return;const o=[["card_text","文本"],["card_image","图片"],["card_video","视频"],["card_tools","工具箱"]],i=(e.outputs||[]).length,a=(e.outputs||[])[0]?.kind||(me(e)||$t(e)||{}).outputType;console.log("[spawnDownstream] 上游产物:",{outputCount:i,outputKind:a,fromId:e.id});const d=y=>{const x=[];for(const[k,$]of o){const S=V.find(ce=>ce.id===k);if(!S||!S.modes.length)continue;let q=null;i>1&&a&&(q=S.modes.find(ce=>{if(!y(ce))return!1;const Ye=mt(ce),pt=Q[Ye];if(!pt)return!1;const et=pt.images||0,He=pt.videos||0,xt=pt.audios||0;return console.log("[spawnDownstream] 检查模式:",{mode:ce,capId:Ye,imgCount:et,vidCount:He,audCount:xt,outputCount:i,outputKind:a}),a==="image"&&et===i?(console.log("[spawnDownstream] ✓ 找到匹配的图片模式:",Ye),!0):a==="video"&&He===i?(console.log("[spawnDownstream] ✓ 找到匹配的视频模式:",Ye),!0):a==="audio"&&xt===i?(console.log("[spawnDownstream] ✓ 找到匹配的音频模式:",Ye),!0):!1})),q||(q=S.modes.find(y)),q&&x.push({icon:S.icon,text:$,run:async()=>{const ce=yn(S.id,t.x,t.y-40,mt(q));ce&&(Ge(e)?await Oi(e,ce):await Wa(e,ce))}})}return x};if(Ge(e)){const y=V.find(k=>k.id==="card_text"),x=[];return y&&y.modes.length&&x.push({icon:y.icon,text:"文本节点（接住这段字当输入）",run:async()=>{const k=yn(y.id,t.x,t.y-40,mt(y.modes[0]));k&&await Oi(e,k)}}),x.push(...d(k=>An(Q[mt(k)]).length)),x.length?Ot(n,r,"把这段文本接给…",x):void 0}if(ht(e)){const y=Zn(e);if(!y)return be("这个素材节点还是空的：先点它选个文件");const x=d($=>Jo($,y.kind)),k=Qe[y.kind]||y.kind;return x.length?Ot(n,r,`把这个${k}接给…`,x):be(`没有节点收${k}素材`)}const f=(e.outputs||[])[0],h=f?f.kind:(me(e)||$t(e)||{}).outputType;if(!h)return;const m=d(y=>Jo(y,h)),p=Qe[h]||h;if(!m.length)return be(`没有节点收${p}素材`);Ot(n,r,`把这个${p}接给…`,m)}async function Ai(e,t=!1){const n=c;if(!we())throw new Error("此画布只读，不能导入素材");const r=await ue(new X(e.url,location.href),{credentials:"same-origin"});if(!r.ok)throw new Error(`读取产物失败（${r.status}）`);const o=await r.blob();if(c!==n||!we())throw new Error("画布已切换或权限已变化，导入已取消");const i=e.filename||new X(e.url,location.href).pathname.split("/").pop()||"历史产物",a=new File([o],i.split(/[\\/]/).pop(),{type:o.type});return Ct(a,t)}const hr=new Map;function Hl(e,t){if(t?.aborted)return Promise.reject(t.reason);const n=/^\/api\/upload\/([^/?#]+)$/.exec(e);if(!n)return Promise.resolve(e);if(!hr.has(e)){const i={controller:new AbortController,users:new Set,ready:!1};i.promise=(async()=>{const a=i.controller.signal;for(;;){a.throwIfAborted();const d=await Ft(`/api/preview/${n[1]}`,{signal:a});if(a.throwIfAborted(),d.status==="ready")return i.ready=!0,d.url;if(d.status==="error")throw new Error(d.error);await new Promise((f,h)=>{const m=()=>{D(p),h(a.reason)},p=A(()=>{a.removeEventListener("abort",m),f()},1500);a.addEventListener("abort",m,{once:!0})})}})(),hr.set(e,i),i.promise.catch(()=>{hr.get(e)===i&&hr.delete(e)})}const r=hr.get(e),o={};return r.users.add(o),new Promise((i,a)=>{const d=()=>{t?.removeEventListener("abort",f),r.users.delete(o),!r.ready&&!r.users.size&&(hr.get(e)===r&&hr.delete(e),r.controller.abort())},f=()=>{d(),a(t.reason)};t?.addEventListener("abort",f,{once:!0}),r.promise.then(h=>{d(),i(h)},h=>{d(),a(h)})})}function ho(e,t,n=()=>!0,r){if(e.playsInline=!0,!/^\/api\/upload\//.test(t)){e.src=t;return}e.dataset.previewOriginal=t;const o=e.getAttribute("poster"),i=e.title;let a;const d=(f,h)=>{e.dataset.previewState=f?"error":"processing",e.title=h;const m=f?["视频转码失败","修复转码后才能生成"]:["正在转码为 MP4","完成后可预览和生成"];e.poster=a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#111318"/><g fill="#d1d5db" text-anchor="middle" font-family="sans-serif" font-size="25"><text x="320" y="168">${m[0]}</text><text x="320" y="208" font-size="19">${m[1]}</text></g></svg>`)};return d(!1,"服务器正在生成兼容 MP4；原片已备份，转码完成后下游节点使用 MP4 生成。"),Hl(t,r).then(f=>{e.dataset.previewOriginal!==t||!n()||(e.dataset.previewState="ready",e.title=i||"MP4 转码已完成，预览和后续生成均使用此版本；原片已备份。",e.getAttribute("poster")===a&&(o?e.poster=o:e.removeAttribute("poster")),e.src=f)}).catch(f=>{r?.aborted||e.dataset.previewOriginal!==t||!n()||(d(!0,f.message||"转码状态加载失败；请检查服务器后重试生成。"),e.removeAttribute("src"),e.load())})}function Xa(e){e.querySelectorAll("video[data-video-url]").forEach(t=>{ho(t,t.dataset.videoUrl)})}const Sn=new Map;let Br=null,Yo=null,go=null,Fi=0,bo=null;function Di(){!Sn.size||bo!==null||(bo=re(()=>{bo=null,Bi()}))}T.addEventListener("resize",Di);function Ja(e){return/^\/api\/(upload|artifact)\//.test(e)?`/api/thumbnail?url=${encodeURIComponent(e)}`:null}function Ya(e,t){t.controller?.abort(),t.blob&&X.revokeObjectURL(t.blob),gr(e),e.tagName==="VIDEO"&&(e.pause(),e.removeAttribute("src"),e.load()),Br?.unobserve(e),go?.unobserve(e),Sn.delete(e)}function qi(){for(const[e,t]of Sn)Ya(e,t);Br?.disconnect(),Yo?.disconnect(),go?.disconnect(),Br=null,Yo=null,go=null,B(bo),bo=null}function Bi(){const e=g.stage.getBoundingClientRect(),t=T.devicePixelRatio||1;for(const[n,r]of Sn){if(!r.visible||!n.isConnected||r.project!==c||!u.active)continue;const o=n.getBoundingClientRect();if(o.right<=e.left-120||o.left>=e.right+120||o.bottom<=e.top-120||o.top>=e.bottom+120){r.controller?.abort();continue}if(r.fullURL&&!r.original&&Math.max(o.width,o.height)*t>512&&(r.url=r.fullURL,r.original=!0,r.done=!1,r.controller?.abort()),r.loading||r.done||Fi>=4)continue;const i=new AbortController;r.controller=i,r.loading=!0,Fi++,(async()=>{try{const a=await ue(r.url,{credentials:"same-origin",signal:i.signal});if(i.signal.aborted||Sn.get(n)!==r||r.project!==c||!u.active)return;if(!a.ok)throw a.status===401&&await u.me(),[403,404].includes(a.status)&&T.dispatchEvent(new CustomEvent("h3auth:denied",{detail:{path:"/api/thumbnail",method:"GET",error:{status:a.status}}})),new Error(`预览加载失败（${a.status}）；可双击查看原文件`);const d=await a.blob();if(i.signal.aborted||Sn.get(n)!==r||!n.isConnected||r.project!==c||!u.active)return;const f=r.blob;r.blob=X.createObjectURL(d),n.tagName==="VIDEO"?n.poster=r.blob:n.src=r.blob,f&&X.revokeObjectURL(f),r.done=!0}catch(a){!i.signal.aborted&&Sn.get(n)===r&&(r.done=!0,n.title=a.message)}finally{r.loading=!1,r.controller=null,Fi--,Bi()}})()}}function Ul(e,t){const n=Ja(t);e.tagName==="VIDEO"?(e.dataset.videoUrl=t,e.preload="none",e.title="单击播放；双击放大查看原视频",e.poster="data:image/svg+xml;charset=utf-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="288"><rect width="512" height="288" fill="#111318"/><path d="M238 121v46l40-23z" fill="#b7bbc3"/></svg>')):(e.decoding="async",n&&(e.dataset.thumbnail="true")),Br||(Br=new I(r=>{for(const o of r){const i=Sn.get(o.target);i&&(i.visible=o.isIntersecting,!i.visible&&i.loading&&i.controller?.abort())}Bi()},{root:g.stage,rootMargin:"120px"}),Yo=new M(()=>{for(const[r,o]of Sn)r.isConnected||Ya(r,o)}),Yo.observe(g.world,{childList:!0,subtree:!0}),go=new G(Di)),Sn.set(e,{url:n||t,fullURL:n?e.tagName==="VIDEO"?`${n}&size=original`:t:null,original:!1,project:c,visible:!1,loading:!1,done:e.tagName==="VIDEO"&&!n}),Br.observe(e),go.observe(e)}function Wl(e,t,n){for(const o of e.querySelectorAll("img, video")){const i=o.classList.contains("old")?n:t[+(o.dataset.i||0)]?.url;i&&Ul(o,i)}const r=e.querySelector("audio");r&&(r.src=t[0].url)}function gr(e){e._playRequest&&e.pause(),e._playRequest=null,e._previewController?.abort(),e._previewController=null}async function Xl(e){if(!e.isConnected||!u.active)return;for(const o of s.querySelectorAll("video"))gr(o);const t=c,n={},r=new AbortController;e._playRequest=n,e._previewController=r;try{if(e.getAttribute("src")||(e.preload="metadata",await ho(e,e.dataset.videoUrl,()=>e._playRequest===n&&e.isConnected&&c===t&&u.active,r.signal)),e._playRequest!==n||!e.isConnected||c!==t||!u.active||e.dataset.previewState==="error")return;await e.play()}catch(o){!r.signal.aborted&&e._playRequest===n&&e.isConnected&&c===t&&(e.title=o.message||"视频暂时无法播放")}finally{e._previewController===r&&(e._previewController=null)}}function xo(e){uo(null,0,[{url:e.url,kind:e.kind,filename:(e.origin||e.url).split(/[\\/]/).pop()}],null)}const Va=20;function Hr(e,t){const n=e.outputs||[],r=Ke(e);if(!n.length&&!r)return;e.history=e.history||[];const o=e.history.find(i=>i.job===t.id);if(o){r&&Object.assign(o,{status:e.status,ms:e.ms??null,outputs:n});return}e.history.unshift({ts:Date.now(),job:t.id,seed:e.seed!=null?e.seed:null,cap:t.capability,ms:e.ms!=null?e.ms:null,outputs:n,...r?{status:e.status}:{},...t.prompts?{prompts:t.prompts.map(i=>({...i}))}:{}}),e.history.length>Va&&(e.history.length=Va)}function Vo(e){e.history||(e.history=(e.outputs||[]).length?[{ts:null,seed:e.seed!=null?e.seed:null,cap:e.cap,outputs:e.outputs}]:[])}function br(e){if(!(e>0))return"";const t=Math.round(e/1e3);if(t<60)return`${t}秒`;const n=Math.floor(t/60);return n<60?`${n}分${t%60}秒`:`${Math.floor(n/60)}时${n%60}分`}function Hi(e){if(!e)return"早前";const t=new Date(e),n=i=>String(i).padStart(2,"0"),r=new Date;r.setHours(0,0,0,0);const o=`${n(t.getHours())}:${n(t.getMinutes())}`;return e>=r.getTime()?o:`${n(t.getMonth()+1)}-${n(t.getDate())} ${o}`}function ir(){g.hist.style.display="none",g.hist.innerHTML="",g.hist._id=null}function Ka(e){return Math.max(240,Math.min(e,Math.min(720,innerWidth*.65)))}function Jl(){if(!g.hist||g.hist.style.display==="none")return;const e=g.hist.getBoundingClientRect().width,t=Ka(e);t!==e&&g.hist.style.setProperty("--hist-width",`${t}px`)}function Yl(e){const t=n=>{g.hist.style.setProperty("--hist-width",`${Ka(n)}px`),Et(),Pt(),_n()};e.onpointerdown=n=>{if(n.button!==0)return;n.preventDefault();const r=n.clientX,o=g.hist.getBoundingClientRect().width;g.hist.classList.add("resizing"),e.setPointerCapture(n.pointerId),e.onpointermove=i=>t(o+r-i.clientX),e.onpointerup=e.onpointercancel=()=>{g.hist.classList.remove("resizing"),e.onpointermove=e.onpointerup=e.onpointercancel=null}},e.onkeydown=n=>{if(n.key!=="ArrowLeft"&&n.key!=="ArrowRight")return;n.preventDefault();const r=n.shiftKey?40:16;t(g.hist.getBoundingClientRect().width+(n.key==="ArrowLeft"?r:-r))}}function Ur(e){const t=c&&c.cards.find(i=>i.id===e);if(!t||Ge(t))return ir();Vo(t);const n=s.createElement("div");n.className="hlist",me(t);const r=s.createElement("button");r.className="hresize",r.type="button",r.title="左右拖动调整历史产物栏宽度",r.setAttribute("aria-label","调整历史产物栏宽度"),Yl(r);const o=s.createElement("div");if(o.className="hhd",o.innerHTML='<b>历史产物</b><span class="n"></span><button class="x" title="收起">✕</button>',o.querySelector(".n").textContent=t.history.length?`${t.history.length} 轮`:"",o.querySelector(".x").onclick=ir,!t.history.length){const i=s.createElement("div");i.className="hempty",i.textContent=`这个节点还没出过东西。
运行一次，每一轮的产物和 seed 都会留在这里。`,i.style.whiteSpace="pre-line",n.appendChild(i)}for(const[i,a]of t.history.entries())n.appendChild(Vl(t,a,i===0));g.hist.innerHTML="",g.hist.append(r,o,n),g.hist._id=e,g.hist.style.display=""}async function Ko(e,t){const n=String(e);try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(n);else{const r=s.activeElement,o=s.createElement("textarea");o.value=n,o.style.cssText="position:fixed;top:0;left:0;opacity:0;pointer-events:none",s.body.appendChild(o);try{if(o.focus(),o.select(),!s.execCommand("copy"))throw new Error("复制失败")}finally{o.remove(),r?.focus({preventScroll:!0})}}be(t)}catch{Re("复制失败，请展开后手动选中文字复制")}}const Ui="application/x-chouka-history-output";let yo=null;function Vl(e,t,n){const r=t.outputs||[],o=s.createElement("div");o.className="hrun"+(n?" cur":"");const i=s.createElement("div");i.className="rh";const a=Q[t.cap]&&Q[t.cap].name||"";i.innerHTML='<span class="tag"></span><span class="nm"></span><span class="cnt"></span>',i.querySelector(".tag").textContent=n?"最新":Hi(t.ts),i.querySelector(".nm").textContent=n?Hi(t.ts):a,i.querySelector(".cnt").textContent=[t.status==="running"?"生成中":t.status==="error"?"失败":r.length>1?`${r.length} 张`:"",br(t.ms)].filter(Boolean).join(" · "),i.title=a;const d=s.createElement("div");d.className="rg"+(r.length===1?" one":""),d.style.setProperty("--hcols",r.length===1?1:r.length<=4?2:3),d.innerHTML=r.map((p,y)=>p.kind==="video"?`<video data-video-url="${p.url}" data-i="${y}" muted loop preload="metadata" draggable="false"></video>`:p.kind==="audio"?`<div class="rg-a" data-i="${y}" title="${p.filename}">🎵</div>`:`<img src="${p.url}" data-i="${y}" alt="" draggable="false">`).join(""),Xa(d);for(const p of d.querySelectorAll("[data-i]"))p.draggable=!0,p.title="单击放大查看；拖到画布创建素材节点";let f=!1;d.ondragstart=p=>{const y=p.target.closest("[data-i]"),x=y&&r[+y.dataset.i];if(!we()||!x||!["image","video","audio"].includes(x.kind)){p.preventDefault();return}f=!0,yo={token:Ln(),project:c,output:{...x}},p.dataTransfer.items.clear(),p.dataTransfer.effectAllowed="copy",p.dataTransfer.setData(Ui,yo.token)},d.ondragend=()=>{yo=null,A(()=>{f=!1},0)},d.onclick=p=>{if(f)return;const y=p.target.closest("[data-i]");y&&uo(e,+y.dataset.i,r,t.seed)},d.oncontextmenu=p=>{p.preventDefault(),p.stopPropagation();const y=p.target.closest("[data-i]");if(!y)return;const x=+y.dataset.i,k=r[x];if(!k)return;const $=[];$.push({icon:"⬇",text:`下载${k.kind==="video"?"视频":k.kind==="audio"?"音频":"图片"}`,run:()=>fo(k)}),r.length>1&&$.push({icon:"⬇",text:`下载全部 ${r.length} 张${k.kind==="video"?"视频":k.kind==="audio"?"音频":"图片"}`,run:()=>r.forEach(S=>fo(S))}),Ot(p.clientX,p.clientY,"历史记录",$)},o.append(i,d);const h=s.createElement("div");if(h.className="rs",h.innerHTML="<i>seed</i><span></span>",h.querySelector("span").textContent=t.seed!=null?String(t.seed):"未记录",t.seed!=null){const p=s.createElement("button");p.textContent="复制",p.title="复制 seed",p.onclick=()=>Ko(t.seed,"已复制 seed "+t.seed),h.appendChild(p)}if(o.appendChild(h),t.user_prompt||t.negative_prompt){const p=s.createElement("details");p.className="rp";const y=s.createElement("summary");y.textContent="提示词";const x=s.createElement("div");if(t.user_prompt){const k=s.createElement("div");k.style.display="flex",k.style.justifyContent="space-between",k.style.alignItems="center",k.style.marginBottom="4px";const $=s.createElement("div");$.style.fontWeight="bold",$.textContent="正面提示词：";const S=s.createElement("button");S.textContent="复制",S.style.fontSize="12px",S.style.padding="2px 8px",S.onclick=()=>Ko(t.user_prompt,"已复制正面提示词"),k.append($,S);const q=s.createElement("div");q.style.marginBottom=t.negative_prompt?"8px":"0",q.textContent=t.user_prompt,x.append(k,q)}if(t.negative_prompt){const k=s.createElement("div");k.style.display="flex",k.style.justifyContent="space-between",k.style.alignItems="center",k.style.marginBottom="4px";const $=s.createElement("div");$.style.fontWeight="bold",$.textContent="负面提示词：";const S=s.createElement("button");S.textContent="复制",S.style.fontSize="12px",S.style.padding="2px 8px",S.onclick=()=>Ko(t.negative_prompt,"已复制负面提示词"),k.append($,S);const q=s.createElement("div");q.textContent=t.negative_prompt,x.append(k,q)}p.append(y,x),o.appendChild(p)}const m=t.prompts||(t.prompt!=null?[{label:"提示词",text:t.prompt}]:[]);for(const p of m){const y=s.createElement("details");y.className="rp";const x=s.createElement("div");x.className="history-prompt";const k=s.createElement("summary");k.textContent=p.key==="if_original"?"原始提示词":p.key==="if_submitted"?"提交给 IF CLI 的提示词":"当时提交的"+p.label;const $=s.createElement("button");$.textContent="复制",$.type="button",$.className="history-prompt-copy",$.title="复制"+k.textContent,$.onclick=()=>Ko(p.text,"已复制"+p.label);const S=s.createElement("div");S.textContent=p.text||"（本次提交为空）",y.append(k,S),x.append(y,$),o.appendChild(x)}return o}async function Kl(e){if(!Ze())return;if(!sn())return be("请先复制示例画布，再保存图片合成");if(s.querySelector("dialog[data-image-composer][open]"))return;const t=c,n=()=>c===t&&sn()&&ct(e.id)===e&&e.cap==="image_composite",r=()=>{if(!n())throw new Error("画布、节点或权限已变化，请关闭编辑器后重新打开")},o=async(i,a)=>{r(),Ve.beginFlush();try{bi(),e.params.composition=JSON.parse(JSON.stringify(i));for(const f of Object.keys(e.assets))f.startsWith("composite:")&&delete e.assets[f];for(const f of i.layers)f.kind!=="paint"&&(e.assets[`composite:${f.id}`]={...f.asset});if(a){e.outputs=[a],e.status="done",e.progress=1,e.job=null,e.seed=null,e.ms=null,e.error=null,e.step="",Hr(e,{id:`local:${Ln()}`,capability:e.cap});for(const f of t.edges.filter(h=>h.from===e.id&&!tt(h)&&!h.version)){const h=ct(f.to);if(!h)continue;const m=xn(f);f.slots=m,m.forEach((p,y)=>{y===0?h.assets[p]={...a}:delete h.assets[p]}),At(h)}}Oo(),Ve.cancelContentSave();const d=await Er(t.id);if(!d.ok)throw d.error||new Error("合成保存失败，请重试");r(),st(e),ot(),g.panel._id===e.id&&ze(e.id),a&&g.hist._id===e.id&&Ur(e.id)}finally{Ve.endFlush()}};try{if(e._create&&await e._create,r(),!T.ChoukaImageComposer)throw new Error("图片合成组件未加载，请强制刷新页面");const i=new Map,a=(f,h)=>{f?.kind!=="image"||!f.url||i.has(f.url)||i.set(f.url,{...f,name:h||f.origin||f.filename||"图片"})};for(const f of Object.values(e.assets||{}))a(f,f?.origin);for(const f of t.cards)if(f!==e){for(const h of Object.values(f.assets||{}))a(h,`${Se(f)} · ${h?.origin||"素材"}`);for(const h of f.outputs||[])a(h,`${Se(f)} · 产物`);for(const h of f.history||[])for(const m of h.outputs||[])a(m,`${Se(f)} · 历史产物`)}const d=(me(e)?.inputs||[]).filter(f=>f.type==="image").map(f=>e.assets[f.key]).filter(f=>f?.kind==="image"&&f.url);await T.ChoukaImageComposer.open({state:e.params.composition?JSON.parse(JSON.stringify(e.params.composition)):null,linkedSources:d,sources:[...i.values()],canEdit:n,upload:async f=>{r();const h=await Ct(f,!0);return r(),h},onSave:f=>o(f),onExport:async(f,h)=>{r();const m=await Ct(new File([f],`composition_${Date.now()}.png`,{type:"image/png"}),!0);r(),await o(h,{...m,filename:m.origin}),be("图片合成已保存，可从输出端口连接下游节点")}})}catch(i){Re("图片合成："+i.message)}}function an(){g.panel.style.display="none",g.panel._id=null,ir()}function Ga(e){g.panel.style.display!=="none"&&(g.panel.style.visibility=e?"hidden":"")}function Et(){if(g.panel.style.display==="none")return;if(gs(g.panel,!we()),O){g.panel.style.left="0px",g.panel.style.top="0px",g.panel.style.maxHeight="100%",g.panel.style.visibility="";return}const e=c&&c.cards.find(ce=>ce.id===g.panel._id);if(!e||!e._el)return an();const t=8,n=e.x,r=e.y,o=e._el.offsetWidth,i=e._el.offsetHeight,a=n*K.k+K.x,d=r*K.k+K.y,f=o*K.k,h=i*K.k,m=g.stage.getBoundingClientRect(),p=a+f,y=d+h;if(!(p>0&&a<m.width&&y>0&&d<m.height)){g.panel.style.visibility="hidden";return}g.panel.style.visibility="";const k=52;g.panel.style.maxHeight=innerHeight-k-t+"px";const $=g.panel.offsetWidth;g.panel.offsetHeight;const S=a+f/2-$/2,q=d+h+t;g.panel.style.left=S+"px",g.panel.style.top=q+"px"}function ze(e,t=null){if(O&&e!==ye)return;if(O&&Rt)return Rr();const n=c?.cards.find(H=>H.id===e);if(!n)return an();const r=we()?n:t||T.structuredClone(Lo(n)),o=$t(r),i=me(r);Ke(r)&&!jr&&hn().catch(()=>{});const a=g.panel.querySelector(".pbody"),d=a&&g.panel._id===e?a.scrollTop:0;if(g.panel._id=e,g.panel.innerHTML="",g.panel.style.display="",g.panel.style.visibility="",Nt(r))return Gl(r);if(Gt(r))return Ql(r);if(ht(r))return Zl(r);const f=["card_image","card_video","card_tools"].includes(o.id)&&o.modes.length>1;if(o.modes.length>1&&!f){const H=s.createElement("div");H.className="modes";for(const se of o.modes){const Le=s.createElement("button");Le.className=rt(se,r.cap)?"on":"",Le.textContent=se.name,Io(Le,()=>zo(r,se,se.name)),Le.onclick=()=>{Xt(),r.cap=mt(se,Kt(r)),ze(e),Qt(r),pe()},H.appendChild(Le)}g.panel.appendChild(H)}if(!i)return g.panel.appendChild(Go("能力不可用")),Et();const h=i.id==="image_composite"&&i.execution==="browser",m=Ke(r)?i:Q[ve(r)];let p=m&&m!==i?i.inputs.map(H=>{const se=m.inputs.find(Le=>Le.key===H.key);return se&&se.default!==H.default?{...H,default:se.default}:H}):i.inputs;const y=gt(r);if(y&&y.entry){const H=p.findIndex(se=>Dt.includes(se.type));H>=0&&!r.assets[p[H].key]&&(p=p.slice(),p[H]={...p[H],label:y.entry.label})}const x=s.createElement("div");x.className="pbody",g.panel.appendChild(x);const k=s.createElement("div");if(k.className="knobnote clipboard-media-hint",k.textContent="Ctrl / Cmd + V：粘贴截图或图片 / 视频文件，自动创建素材节点并引用到空槽；不覆盖已有引用。复制文件需浏览器提供文件数据，仅路径文字无法导入。",Ke(r)&&(k.textContent=Kn?`本机 IF 不可用：${Kn}。请先安装并登录 IF CLI、启动本机桥接，点模型按钮可重试。`:"IF 使用本机账号；支持按模型数量连接多份引用。引用素材各上传一次，返回的 URL 按「图片1」「视频1」写入提示词，与生成需求一次提交；模型由 CLI 参数指定，随后轮询并保存产物。图片超过 10 MB 时优先转无损 WebP，仍超限再压缩；视频超过 50 MB 时自动转码。仅处理上传副本，原素材不变；本机上传合计不超过 100 MB，音频暂不支持。"),we()&&x.appendChild(k),Ke(r)){const H=ln.filter(Ne=>Ne.type===i.outputType),se=r.params.if_model||H[0]?.display_name,Le=Fe(se,i.outputType),De=s.createElement("div");if(De.className="knobnote",De.textContent=`${Le.reference_fallback?"画布兜底引用上限（不代表官方支持）":"画布引用上限"}：图片 ${Le.bridge.image} · 视频 ${Le.bridge.video}。${Le.note} 全部引用上传后的 URL 按「图片1」「视频1」与生成需求一次提交，再轮询产物；是否采用全部引用以 IF 实际返回为准，音频暂不可提交。画面比例、清晰度、时长等参数作为生成内容要求发送，模型不保证严格遵守。`,Object.values(r.assets||{}).some(Ne=>Ne&&Dt.includes(Ne.kind)&&!Le?.bridge?.[Ne.kind])&&(De.textContent+=" 已连接的引用保持原样，但不适用于当前模型；可切回原模型或手动移除，运行时不会忽略它。"),x.appendChild(De),Le?.source){const Ne=s.createElement("a");Ne.href=Le.source,Ne.target="_blank",Ne.rel="noopener noreferrer",Ne.textContent="供应商 API 参考文档（不作为 IF 引用上限）",x.appendChild(Ne)}}if(h){k.textContent="浏览器本地合成，不占 GPU。已连接的图片打开编辑器时自动加入图层，也可上传图片或从画布素材中选择添加。拖动位置、缩放图片，在图层列表调整遮挡顺序。";const H=s.createElement("div");H.className="knobnote";const se=r.params.composition;H.textContent=se?`编辑稿：${se.width} × ${se.height} · ${se.layers.length} 个图层。保存编辑可继续修改；合成输出后可连接下游。`:"尚未创建编辑稿。点击下方「编辑合成」开始，默认画布 1920 × 1080，可修改尺寸和背景。",x.appendChild(H)}if(O){const H=Ji(r);if(H.length){const se=s.createElement("div");se.className="director-supplement",se.textContent=`导演补充（只读，提交时追加到提示词）
`+H.join(`
`),x.appendChild(se)}}const $=p.filter(H=>Dt.includes(H.type));if($.length)if(h){const H=s.createElement("details");H.open=!0;const se=s.createElement("summary");se.textContent="连接图片素材（打开编辑器时自动加入图层）",H.append(se,ts(r,$,y)),x.appendChild(H)}else x.appendChild(ts(r,$,y));if(r.cap==="if_image"){const H=p.find(se=>se.key==="if_reference");H&&x.appendChild(ei(r,H))}const S=new Set;for(const H of $.filter(se=>(r.assets||{})[se.key])){const se=p.filter(Le=>Le.rangeOf===H.key);if(se.length===2){x.appendChild(md(r,H,se[0],se[1]));for(const Le of se)S.add(Le.key)}}const q=p.filter(H=>H.type==="textarea"&&!H.advanced),ce=q.filter(H=>H.template),Ye=q.filter(H=>!H.template),pt=Ye.filter(H=>H.pairWith&&p.some(se=>se.key===H.pairWith));pt.length>1&&x.appendChild(nd(r,pt));for(const H of Ye)(!pt.includes(H)||pt.length<2)&&x.appendChild(Qa(r,H));for(const H of ce)x.appendChild(cd(r,H));const et=p.filter(H=>!Dt.includes(H.type)&&H.type!=="textarea"&&(H.type==="seed"||!H.advanced)&&!H.mirror&&!S.has(H.key)),He=(H,se)=>{if(H.appendChild(ei(r,se)),se.hint&&!se.showHint){const Le=s.createElement("div");Le.className="knobnote",Le.textContent=se.hint,H.appendChild(Le)}},xt=s.createElement("div");xt.className="pwrap";for(const H of et)f||He(xt,H);x.appendChild(xt),r.error&&x.appendChild(Go(r.error));const jn=Rn(r);jn&&x.appendChild(jn);const yt=jo(r);yt&&x.appendChild(yt);const wt=s.createElement("div");if(wt.className="foot",f){const H=o.id==="card_video"?"生视频模式":o.id==="card_tools"?"工具箱模式":"生图模式",se=gt(r)||o.modes[0],Le=co(`${o.icon} ${se.name}`,H,()=>{const De=Ne=>({icon:o.icon,text:Ne.name+(rt(Ne,r.cap)?"（当前）":""),tip:()=>zo(r,Ne,Ne.name),run:()=>{if(Ke(r)&&["queued","running"].includes(r.status))return be("请等待本机 IF 任务结束后再切换模式");Xt(),Fn(),pr(r,mt(Ne,Kt(r))),ze(e),Qt(r),pe()}});return o.id==="card_video"||o.id==="card_image"?[{group:"本地 API"},...o.modes.filter(Ne=>Ne.id!=="if_video"&&Ne.id!=="if_image").map(De),{group:"云端 API"},...o.modes.filter(Ne=>Ne.id==="if_video"||Ne.id==="if_image").map(De)]:o.modes.map(De)});if(Io(Le,()=>zo(r,se,se.name)),wt.appendChild(Le),se.modelSwitch){const De=Kt(r),Ne=te=>Tn[te]||te,Z=co(Ne(De)||i.name,o.id==="card_image"?"生图模型":"深度视频模型",()=>Object.entries(se.modelSwitch).map(([te,_e])=>({text:Ne(te)+(_e===r.cap?"（当前）":""),run:()=>{Xt(),Fn(),pr(r,_e),r._model=te,ze(e),Qt(r),pe()}})));wt.appendChild(Z)}else if(Ke(r)){const De=ln.filter(te=>te.type===i.outputType),Ne=De.find(te=>te.display_name===r.params.if_model)?.display_name||De[0]?.display_name,Z=co(Ne||"选择 IF 模型","IF 模型",()=>ln.some(te=>te.type===i.outputType)?ln.filter(te=>te.type===i.outputType).map(te=>({text:te.display_name+(te.display_name===Ne?"（当前）":"")+" · "+Mr(te),disabled:["exhausted","unavailable"].includes(te.quota_status),run:()=>{Fn(),r.params.if_model=te.display_name;const _e=r._referenceParameters,he=_e&&r.params.duration===_e.before.duration;Bt(r),he&&(_e.before.duration=r.params.duration),ze(e),pe()}})):[{text:Kn?"重试连接本机 IF":"正在读取本机 IF 模型…",run:()=>hn().catch(te=>Re(te.message))}]);Z._openIFModels=Z.onclick,Z.onclick=async te=>{te.stopPropagation(),En();const _e=Bo;Z.disabled=!0,Z.firstChild.textContent="读取剩余次数…";try{await hn(!1),Bo===_e&&g.panel._id===e&&c?.cards.includes(r)&&g.panel.querySelector('button[title="IF 模型 —— 点击换"]')?._openIFModels(te)}catch(he){Re("读取 IF 剩余次数失败："+he.message)}finally{Z.disabled=!1,Z.firstChild.textContent=Ne||"选择 IF 模型"}},wt.appendChild(Z)}if(!h){const De=s.createElement("button");De.className="tcap";const Ne=mi(r,i);De.textContent=Ne?`⚙ ${Ne}`:"⚙ 参数",De.title=Ke(r)?"点开弹窗：比例、清晰度、时长等以内容发送":"点开弹窗：清晰度、画面比例、时长等参数",De.dataset.readonlyView="",De.onclick=Z=>{Z.stopPropagation(),Qs(r,De)},wt.appendChild(De)}}const Oe=r.status==="queued"||r.status==="running",at=s.createElement("span");if(at.style.cssText="color:#8a8a94;font-size:12px",at.textContent=h?"本地合成 · 输出 PNG":i.outputType==="video"?"输出：视频":"输出：图片",r.status==="done"&&r.ms>0&&(at.textContent+=` · 上次 ${br(r.ms)}`),wt.appendChild(at),Oe&&r.job&&!Ke(r)){const H=s.createElement("button");H.className="cancel",H.textContent="取消",H.onclick=()=>yd(r),H.style.marginLeft="auto",wt.appendChild(H)}const jt=s.createElement("button");jt.className="go",jt.textContent=h?"编辑合成":"↑",jt.title=h?"打开图片合成编辑器（不使用 ComfyUI）":"运行",h&&(jt.style.cssText="width:auto;min-width:96px;padding:0 14px;border-radius:8px;font-size:13px;flex-shrink:0"),jt.disabled=Oe,jt.onclick=()=>ni(r),wt.appendChild(jt),g.panel.appendChild(wt),Et(),x.scrollTop=d,sa(r),er(r)}function Go(e){const t=s.createElement("div");return t.className="err",t.textContent=e,t}function Gl(e){const t=s.createElement("div");t.className="pbody",g.panel.appendChild(t);const n=s.createElement("div");n.className="pblock";const r=s.createElement("div");r.className="phd";const o=s.createElement("span");o.textContent="风格描述";const i=s.createElement("span");i.className="demo";const a=s.createElement("button");a.textContent="清空",r.append(o,i,a);const d=s.createElement("textarea");d.placeholder="例：蒂姆·波顿式哥特暗黑定格动画质感，冷青灰色调，强侧光硬阴影，胶片颗粒，浅景深，电影级构图",d.value=String((e.params||{}).style||""),d.style.minHeight="120px";const f=()=>{const k=d.value.trim();i.style.display=k?"none":"",i.textContent="⚠ 还没写，挂着也不起作用"},h=()=>{e.params=e.params||{},e.params.style=d.value,f(),st(e),pe()};d.oninput=h,a.onclick=()=>{d.value="",h(),d.focus()},f(),n.append(r,d),t.appendChild(n);const m=c.edges.filter(k=>k.from===e.id&&tt(k)),p=s.createElement("div");p.className="slinks";const y=s.createElement("div");if(y.className="atitle",y.textContent=m.length?`挂着 ${m.length} 个节点`:"还没挂给任何节点",p.appendChild(y),!m.length){const k=s.createElement("div");k.className="anote",k.textContent="把右边那颗点拖到一张生图/生视频节点上；拖到空白处会列出所有写提示词的玩法。",p.appendChild(k)}for(const k of m){const $=c.cards.find(Ye=>Ye.id===k.to);if(!$)continue;const S=s.createElement("div");S.className="slink";const q=s.createElement("button");q.className="nm",q.textContent=Se($),q.title="选中这个节点（面板上能看到合并后的提示词）",q.onclick=()=>Ht($.id);const ce=s.createElement("button");ce.className="off",ce.textContent="解除",ce.title="这个节点不再套用本风格",ce.onclick=()=>lo(k),S.append(q,ce),p.appendChild(S)}const x=no(e);if(x.length){const k=s.createElement("div");k.className="atitle",k.textContent=`顺着连线连带 ${x.length} 张`,p.appendChild(k);for(const $ of x){const S=s.createElement("div");S.className="slink down";const q=s.createElement("button");q.className="nm",q.textContent=Se($),q.title="选中这个节点（面板上能看到合并后的提示词）",q.onclick=()=>Ht($.id);const ce=s.createElement("span");ce.className="off ro",ce.textContent="继承",ce.title="上游那个节点传下来的，要断就断它们之间那根产物连线",S.append(q,ce),p.appendChild(S)}}t.appendChild(p),Et()}function Zl(e){const t=s.createElement("div");t.className="pbody",g.panel.appendChild(t);const n=Zn(e),r=s.createElement("div");r.className="pblock";const o=s.createElement("div");o.className="phd";const i=s.createElement("span");i.textContent="手里的素材";const a=s.createElement("span");a.className="demo",o.append(i,a),r.appendChild(o);const d=s.createElement("div");d.className="prow";const f=s.createElement("button");if(f.textContent=n?"换一个文件":"选择文件",f.onclick=()=>Qo(e),d.appendChild(f),n){const x=s.createElement("button");x.textContent="查看大图",x.onclick=()=>xo(n),x.dataset.readonlyView="",d.appendChild(x)}const h=s.createElement("button");h.textContent="清空",h.title="把这份素材扔掉，节点变回空（不会删文件本身）",h.onclick=()=>{e.outputs=[];for(const x of c.edges.filter(k=>k.from===e.id&&!tt(k)))ki(x);st(e),At(e),ze(e.id),pe()},d.appendChild(h),a.textContent=n?(n.origin||n.filename||n.url||"").split(/[\\/]/).pop():"还没有文件",a.title=n&&(n.origin||n.filename||n.url)||"",r.appendChild(d),t.appendChild(r);const m=c.edges.filter(x=>x.from===e.id),p=s.createElement("div");p.className="slinks";const y=s.createElement("div");if(y.className="atitle",y.textContent=m.length?`喂给 ${m.length} 个节点`:"还没喂给任何节点",p.appendChild(y),!m.length){const x=s.createElement("div");x.className="anote",x.textContent=n?"把右边那颗点拖到一个节点上，这份素材就进它的格子。":"先在上面选一个文件，再把出口拖到别的节点上。",p.appendChild(x)}for(const x of m){const k=c.cards.find(ce=>ce.id===x.to);if(!k)continue;const $=s.createElement("div");$.className="slink";const S=s.createElement("button");S.className="nm",S.textContent=Se(k),S.title="选中这个节点",S.onclick=()=>Ht(k.id);const q=s.createElement("button");q.className="off",q.textContent="解除",q.title="这个节点不再收这份素材",q.onclick=()=>lo(x),$.append(S,q),p.appendChild($)}t.appendChild(p),Et()}const Za=[["polish","润色","改得更通顺好读，不加料不改意思"],["optimize","优化","删废话、换具体说法，更精炼有表现力"],["expand","扩写","补细节补过渡，写到 2~3 倍长"],["custom","自定义","按下面写的指令处理文字"]];function Ql(e){const t=s.createElement("div");t.className="pbody",g.panel.appendChild(t);const n=e.status==="running";e.params=e.params||{};const r=s.createElement("div");r.className="pblock";const o=s.createElement("div");o.className="phd",o.innerHTML="<span>内容</span>";const i=s.createElement("textarea");if(i.placeholder="在这里写字或直接在节点上写",i.value=String(e.params.text||""),i.disabled=n,i.oninput=()=>{e.params.text=i.value;const x=e._el?e._el.querySelector(".body"):null,k=x?x.querySelector("textarea.ttxt"):null;k&&(k.value=i.value),vi(e),pe()},r.append(o,i),t.appendChild(r),e.params.op==="custom"){const x=s.createElement("div");x.className="pblock";const k=s.createElement("div");k.className="phd",k.innerHTML="<span>指令</span>";const $=s.createElement("textarea");$.placeholder="例：把接进来的几段整理成一条朋友圈文案，口语一点，带两个 emoji",$.value=String(e.params.instr||""),$.oninput=()=>{e.params.instr=$.value,pe()},x.append(k,$),t.appendChild(x)}const a=c.edges.filter(x=>x.from===e.id&&tt(x)),d=s.createElement("div");d.className="slinks";const f=s.createElement("div");if(f.className="atitle",f.textContent=a.length?`连着 ${a.length} 个节点`:"还没连给任何节点",d.appendChild(f),!a.length){const x=s.createElement("div");x.className="anote",x.textContent="把右边那颗点拖到生成节点（并进提示词）或别的文本节点（当输入）上；拖到空白处会列出所有能接的地方。",d.appendChild(x)}for(const x of a){const k=c.cards.find(ce=>ce.id===x.to);if(!k)continue;const $=s.createElement("div");$.className="slink";const S=s.createElement("button");S.className="nm",S.textContent=Se(k),S.title="选中这个节点",S.onclick=()=>Ht(k.id);const q=s.createElement("button");q.className="off",q.textContent="解除",q.title="这个节点不再用这段文本",q.onclick=()=>lo(x),$.append(S,q),d.appendChild($)}t.appendChild(d),e.error&&t.appendChild(Go(e.error));const h=s.createElement("div");h.className="foot",h.appendChild(co((e.params.model||"api")==="local"?"🖥 本地 27B":"☁ 云端 API","模型",()=>[{icon:"☁",text:"云端 API —— 几秒就回，要配好 llm.json",run:()=>{e.params.model="api",ze(e.id),pe()}},{icon:"🖥",text:"本地 27B —— 不花钱，占显存，第一次慢",run:()=>{e.params.model="local",ze(e.id),pe()}}]));const m=x=>x?(Za.find(k=>k[0]===x)||[0,x])[1]:"不加工";h.appendChild(co(m(e.params.op),"加工方式",()=>[{icon:"✍",text:"不加工 —— 就当一个纯文本节点，只存字",run:()=>{e.params.op="",st(e),ze(e.id),pe()}},...Za.map(([x,k,$])=>({icon:"✎",text:`${k} —— ${$}`,run:()=>{e.params.op=x,st(e),ze(e.id),pe()}}))]));const p=s.createElement("span");if(p.style.cssText="color:#8a8a94;font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap",e._lastRun?p.textContent=(e._lastRun.via==="api"?"上次 ☁":"上次 🖥")+(e._lastRun.ms?` · ${(e._lastRun.ms/1e3).toFixed(1)} 秒`:""):e.params.op?p.textContent="结果写回节点 · 上游改了字，重跑一次就用新的":p.textContent="没选加工方式：这个节点只存字",p.title=p.textContent,h.appendChild(p),typeof e.params._prev=="string"&&e.params._prev!==e.params.text){const x=s.createElement("button");x.className="cancel",x.textContent="↩ 恢复运行前的字",x.title="上一次运行之前的节点上原文（只留这一步）",x.onclick=()=>{e.params.text=e.params._prev,delete e.params._prev,st(e),ze(e.id),pe()},h.appendChild(x)}const y=s.createElement("button");y.className="go",y.textContent="↑",y.title="运行",y.disabled=n||!e.params.op,y.onclick=()=>ni(e),h.appendChild(y),g.panel.appendChild(h),Et()}async function ed(e){if(!Ze())return;const t=Zt(e);if(!t)return be("先在上面选一种加工方式（润色 / 优化 / 扩写 / 自定义）");if(e.status==="running")return be("文本加工正在进行中，请稍候");e.error=null,e.status="running",e.ms=null,st(e),g.panel._id===e.id&&ze(e.id);try{const n=Qn(e).map(a=>({name:a.name,text:a.text})),r=cn(e);r&&n.unshift({name:"节点上的原文",text:r});const o=await _t("/api/text",{op:t,model:(e.params||{}).model||"api",inputs:n,params:{instr:String((e.params||{}).instr||"")},project:c&&c.id,projectName:c&&c.name,card:e.id,cardName:Se(e)});e.params._prev=String((e.params||{}).text||""),e.params.text=o.text,e.status="done",e.ms=o.ms,e._lastRun=o,pe(),st(e),g.panel._id===e.id&&ze(e.id);const i=c.edges.filter(a=>a.from===e.id&&tt(a)).length;be(td(o)+(i?`
已连给 ${i} 个节点，它们下次运行会用这份新文本`:""))}catch(n){e.status="error",e.error=n.message,Ve.markWorkFailure(n),st(e),g.panel._id===e.id&&ze(e.id),Re(n.message)}pe()}function td(e){const t=e.ms>=6e4?`${Math.floor(e.ms/6e4)} 分 ${Math.round(e.ms%6e4/1e3)} 秒`:`${(e.ms/1e3).toFixed(1)} 秒`;return`${e.via==="api"?"✅ 云端 API":"✅ 本地 27B"}，${t}`+(e.warn?`
⚠ ${e.warn}`:"")}function nd(e,t){const n=me(e),r=t.filter(a=>(e.assets||{})[a.pairWith]),o=a=>pn(n.inputs.find(d=>d.key===a.pairWith)||a,e),i=s.createElement("div");if(i.className="ptabs",(e._tab==null||e._tab<0||e._tab>=r.length)&&(e._tab=r.length?0:-1),r.length){const a=s.createElement("div");a.className="tabs",r.forEach((d,f)=>{const h=s.createElement("button"),m=String(e.params[d.key]!=null?e.params[d.key]:d.default||"").trim();h.textContent=o(d)+(m?" ●":""),h.className=f===e._tab?"on":"",h.dataset.readonlyView="",h.onclick=()=>{e._tab=f,ze(e.id,we()?null:e)},a.appendChild(h)}),i.appendChild(a),i.appendChild(Qa(e,r[e._tab],o(r[e._tab])+" 的提示词"))}else{const a=s.createElement("div");a.className="tabempty",a.textContent="还没有图片引用。添加图片后，这里才显示对应提示词。",i.appendChild(a)}return i}function Qa(e,t,n){const r=s.createElement("div");r.className="pblock";const o=t.key==="negative_prompt",i=o?[]:dr(e).map(cn),a=o?[]:Qn(e),d=Q[ve(e)]||me(e),f=!!(d&&d.rewrite&&t.key===(An(d)[0]||{}).key),h=f?U(e,t.key):null,m=!!(h&&e.optUse&&e.optUse[t.key]),p=s.createElement("div");p.className="phd";const y=s.createElement("span"),x=i.length+a.length;y.textContent=(n||t.label)+(x&&!m?`（已并入 ${x} 段文本）`:"");const k=s.createElement("span");k.className="demo",k.textContent="⚠ 这是示例文案，改成你要的内容",p.append(y,k),r.appendChild(p),h&&r.appendChild(rd(e,t,m));const $=s.createElement("textarea");$.placeholder=`${n||t.label}：${o?"描述不希望出现的内容":"描述你想要的画面/动作/镜头"}`;const S=e.promptHeights?.[t.key];Number.isFinite(S)&&S>0&&($.style.height=S+"px");const q=s.createElement("div");q.className="prompt-highlight-wrapper";const ce=s.createElement("div");ce.className="prompt-highlight-layer",q.appendChild(ce),q.appendChild($);function Ye(){const Z=getComputedStyle($);for(const _e of["fontFamily","fontSize","fontWeight","lineHeight","letterSpacing","wordSpacing","textIndent","paddingTop","paddingRight","paddingBottom","paddingLeft","borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth","boxSizing","width","height"])ce.style[_e]=Z[_e];ce.style.borderStyle="solid",ce.style.borderColor="transparent",ce.style.whiteSpace="pre-wrap",ce.style.overflowWrap=Z.overflowWrap,ce.style.wordBreak=Z.wordBreak||"normal",ce.style.top="0px",ce.style.left="0px";const te=$.offsetWidth-$.clientWidth;te>0&&(ce.style.paddingRight=parseFloat(Z.paddingRight)+te+"px")}let pt=m?h:e.params[t.key]!=null?e.params[t.key]:o?t.default??"":"";if(!m&&x>0){const Z=[];i.length>0&&i.forEach(_e=>{Z.push(_e)}),a.length>0&&a.forEach(_e=>{Z.push(_e.text)});const te=Z.join(`

`);$.value=te+(pt?`

`+pt:`

`)}else $.value=pt;function et(){const Z=it=>it.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),te=$.value;let _e="",he=0;const je=/@([\u4e00-\u9fa5\w]+)/g;let Ae;for(;!o&&(Ae=je.exec(te));)_e+=Z(te.slice(he,Ae.index)),_e+=`<mark class="at-mention" data-name="${Z(Ae[1])}">${Z(Ae[0])}</mark>`,he=Ae.index+Ae[0].length;_e+=Z(te.slice(he)),ce.innerHTML=_e+`
`,ce.scrollTop=$.scrollTop}m&&($.classList.add("optta"),ce.classList.add("opt")),$.addEventListener("wheel",Z=>{Z.stopPropagation()},{passive:!0}),$.addEventListener("keydown",Z=>{if(o||Z.isComposing||Z.key!=="Backspace"&&Z.key!=="Delete"||$.selectionStart!==$.selectionEnd)return;const te=$.selectionStart,_e=/@([\u4e00-\u9fa5\w]+)/g;let he;for(;he=_e.exec($.value);)if(Z.key==="Backspace"?te>he.index&&te<=he.index+he[0].length:te>=he.index&&te<he.index+he[0].length){Z.preventDefault(),$.setSelectionRange(he.index,he.index+he[0].length),s.execCommand("delete");return}});let He=null,xt=-1;$.addEventListener("input",()=>{et();const Z=$.selectionStart,_e=$.value.substring(0,Z).match(/@([\u4e00-\u9fa5\w]*)$/);if(_e&&!m&&!o){const he=_e[1].toLowerCase();xt=Z-_e[0].length;const je=[],Ae=new Set(c.edges.filter(Te=>Te.to===e.id).map(Te=>Te.from));c.cards.forEach(Te=>{if(Te.id===e.id||!(ht(Te)||Ge(Te)||Nt(Te)))return;const Je=Se(Te);if(!Je.toLowerCase().includes(he))return;const Yt=$t(Te);je.push({type:"card",section:"canvas",connected:Ae.has(Te.id),card:Te,name:Je,icon:Yt.icon||"◻",label:ht(Te)?"素材":Ge(Te)?"文本":"风格"})});const it=Q[ve(e)]||me(e);it&&it.inputs&&it.inputs.forEach(Te=>{if(!["image","audio","video"].includes(Te.type))return;const vt=e.assets[Te.key];if(!vt||!vt.ref)return;const Je=pn(Te,e);Je.toLowerCase().includes(he)&&je.push({type:"slot",section:"current",key:Te.key,name:Je,icon:Te.type==="image"?"🖼":Te.type==="audio"?"🎵":"🎬",label:Qe[Te.type]||"素材"})}),je.length>0?jn($,je):yt()}else yt()});function jn(Z,te){yt(),He=s.createElement("div"),He.id="menu",He.className="at-menu",He.style.position="absolute",He.style.maxHeight="280px",He.style.overflowY="auto";const _e=Je=>{const Yt=s.createElement("button");Yt.className="at-menu-item"+(Je.connected?" connected":"");const Wr=s.createElement("span");Wr.className="at-menu-icon",Wr.textContent=Je.icon;const xr=s.createElement("span");xr.className="at-menu-name",xr.textContent=Je.name;const Xr=s.createElement("span");Xr.className="at-menu-type",Xr.textContent=Je.connected?`已连线 · ${Je.label}`:Je.label,Yt.append(Wr,xr,Xr),Yt.onclick=()=>{const Jr=Je.name,ri=Z.value.substring(0,xt),vd=Z.value.substring(Z.selectionStart);Z.value=ri+`@${Jr} `+vd,Z.selectionStart=Z.selectionEnd=ri.length+Jr.length+2,m?e.opt[t.key]=Z.value:e.params[t.key]=Ne(Z.value),De(),pe(),et(),yt(),Z.focus()},He.appendChild(Yt)};for(const[Je,Yt]of[["current","当前素材"],["canvas","画布"]]){const Wr=te.filter(Jr=>Jr.section===Je).sort((Jr,ri)=>+!!ri.connected-+!!Jr.connected);if(!Wr.length)continue;const xr=s.createElement("div");xr.className="at-menu-group";const Xr=s.createElement("span");Xr.textContent=Yt,xr.appendChild(Xr),He.appendChild(xr),Wr.forEach(_e)}const he=jt(xt)||(()=>{const Je=Z.getBoundingClientRect();return{left:Je.left+8,top:Je.top+8,bottom:Je.top+28}})();s.body.appendChild(He);const je=He.offsetWidth,Ae=He.offsetHeight;let it=he.left-6,Te=he.top-Ae-6;Te<8&&(Te=he.bottom+4),it+je>innerWidth-8&&(it=innerWidth-8-je),it<8&&(it=8),He.style.left=it+"px",He.style.top=Te+"px";const vt=Je=>{(!He||!He.contains(Je.target)&&Je.target!==Z)&&(yt(),s.removeEventListener("mousedown",vt))};A(()=>s.addEventListener("mousedown",vt),0)}function yt(){He&&(He.remove(),He=null)}r.appendChild(q),et();const wt=new G(()=>{if(!$.isConnected){wt.disconnect();return}if(!$.offsetHeight)return;Ye(),ce.scrollTop=$.scrollTop;const Z=parseFloat($.style.height);Number.isFinite(Z)&&Z>0&&Z!==e.promptHeights?.[t.key]&&we()&&(e.promptHeights=e.promptHeights||{},e.promptHeights[t.key]=Z,pe())});wt.observe($),$.addEventListener("scroll",()=>{ce.scrollTop=$.scrollTop});let Oe=null;function at(Z,te){const _e=ce.querySelectorAll(".at-mention");for(const he of _e){const je=he.getClientRects();for(const Ae of je)if(Z>=Ae.left&&Z<=Ae.right&&te>=Ae.top&&te<=Ae.bottom)return he}return null}function jt(Z){const te=[],_e=s.createTreeWalker(ce,NodeFilter.SHOW_TEXT);for(;_e.nextNode();)te.push(_e.currentNode);let he=0,je=null,Ae=0;for(const vt of te){if(he+vt.length>Z){je=vt,Ae=Z-he;break}he+=vt.length}if(!je){const vt=te[te.length-1];if(!vt)return null;je=vt,Ae=vt.length}const it=s.createRange();it.setStart(je,Ae),it.setEnd(je,Math.min(Ae+1,je.length));const Te=it.getClientRects()[0]||it.getBoundingClientRect();return Te.width===0&&Te.height===0?null:Te}$.addEventListener("mousemove",Z=>{const te=at(Z.clientX,Z.clientY);if($.style.cursor=te?"pointer":"",ce.querySelectorAll(".at-mention.mhover").forEach(Ae=>Ae.classList.remove("mhover")),te&&te.classList.add("mhover"),!te)return Le();const _e=te.dataset.name;if(!_e)return;let he=null;const je=c.cards.find(Ae=>Se(Ae)===_e);if(je){const Ae=je.outputs||[];Ae.length>0?he={type:Ae[0].kind,url:Ae[0].url,name:Se(je)}:(Ge(je)||Nt(je))&&(he={type:"text",text:cn(je)||"(空)",name:Se(je)})}if(!he){const Ae=Q[ve(e)]||me(e);if(Ae&&Ae.inputs){const it=Ae.inputs.find(Te=>pn(Te,e)===_e);it&&e.assets[it.key]&&(he={type:it.type,url:e.assets[it.key].url,name:_e})}}he?se(te,he):Le()}),$.addEventListener("mouseleave",Le),$.addEventListener("scroll",()=>{ce.scrollTop=$.scrollTop,ce.scrollLeft=$.scrollLeft,Le()});let H=null;function se(Z,te){if(Oe&&H===te.name)return;Le(),H=te.name,Oe=s.createElement("div"),Oe.className="at-mention-preview",Oe.style.cssText=`
      position: fixed; z-index: 100; background: #060a14f7; border: 1px solid var(--acc);
      border-radius: 3px; padding: 8px; box-shadow: 0 12px 36px #000d, 0 0 18px #00e5ff2e;
      backdrop-filter: blur(6px); max-width: 320px; pointer-events: none;
    `;const _e=s.createElement("div");if(_e.style.cssText="font-size: 11px; color: var(--acc); margin-bottom: 6px; letter-spacing: 1px;",_e.textContent=te.name,Oe.appendChild(_e),te.type==="image"){const je=s.createElement("img");je.src=te.url,je.style.cssText="max-width: 300px; max-height: 200px; display: block; border-radius: 2px;",Oe.appendChild(je)}else if(te.type==="video"){const je=s.createElement("video");ho(je,te.url),je.style.cssText="max-width: 300px; max-height: 200px; display: block; border-radius: 2px;",je.muted=!0,je.autoplay=!0,je.loop=!0,Oe.appendChild(je)}else if(te.type==="audio"){const je=s.createElement("div");je.textContent="🎵 "+te.name,je.style.cssText="padding: 12px; color: var(--txt); text-align: center;",Oe.appendChild(je)}else if(te.type==="text"){const je=s.createElement("div");je.textContent=te.text.substring(0,200)+(te.text.length>200?"...":""),je.style.cssText="color: var(--txt); font-size: 12px; line-height: 1.6; max-height: 150px; overflow: hidden;",Oe.appendChild(je)}const he=Z.getBoundingClientRect();Oe.style.left=he.left+"px",Oe.style.top=he.bottom+4+"px",s.body.appendChild(Oe)}function Le(){H=null,Oe&&(Oe.remove(),Oe=null)}const De=()=>{const Z=!o&&!m&&!!t.default&&$.value.trim()===String(t.default).trim();k.style.display=Z?"":"none",$.classList.toggle("isdemo",Z),ce.classList.toggle("demo",Z)},Ne=Z=>{if(!Z)return"";if(!x)return Z.trim();const te=[];i.length>0&&i.forEach(he=>te.push(he)),a.length>0&&a.forEach(he=>te.push(he.text));const _e=te.join(`

`);return Z.startsWith(_e)?Z.substring(_e.length).trim().replace(/^\n+/,""):Z.trim()};if($.oninput=()=>{m?e.opt[t.key]=$.value:e.params[t.key]=Ne($.value),De(),pe()},De(),f||!m){const Z=s.createElement("div");Z.className="ptoolbar";const te=!!e._rwBusy,_e=e.params._promptModel||"api",he=s.createElement("button");he.className="tbtool model";const je=s.createElement("span");je.textContent=_e==="local"?"🖥 本地":"☁ 云端";const Ae=s.createElement("i");Ae.textContent="▾",he.append(je,Ae),he.title="模型 —— 点击换",he.onclick=Je=>{Je.stopPropagation();const Yt=he.getBoundingClientRect();Ot(Yt.left,Yt.bottom+4,"模型",[{icon:"☁",text:"云端 API —— 几秒就回，要配好 llm.json",run:()=>{e.params._promptModel="api",pe(),$n(e)}},{icon:"🖥",text:"本地 27B —— 不花钱，占显存，第一次慢",run:()=>{e.params._promptModel="local",pe(),$n(e)}}])},Z.appendChild(he);const it=s.createElement("button");it.className="tbtool",it.textContent="🌐 翻译",it.disabled=te,it.title="中→英 / 英→中 自动判断（有道翻译）",it.onclick=()=>id(e,t),Z.appendChild(it);const Te=s.createElement("div");Te.style.cssText="display: flex; gap: 4px; margin-left: auto;";const vt=s.createElement("button");if(vt.className="tbtool",vt.textContent=m?"扔掉这份":"清空",vt.title=m?"删掉优化结果，切回你自己写的原词（原词一直没被动过）":"清空提示词",vt.onclick=()=>{if(m)return delete e.opt[t.key],delete e.optUse[t.key],e.optStyle&&delete e.optStyle[t.key],pe(),$n(e);if(e.params[t.key]="",!m&&x>0){const Je=[];i.length>0&&i.forEach(Yt=>{Je.push(Yt)}),a.length>0&&a.forEach(Yt=>{Je.push(Yt.text)}),$.value=Je.join(`

`)}else $.value="";De(),$.focus(),pe()},Te.appendChild(vt),f){const Je=s.createElement("button");Je.className="tbtool opt",Je.textContent=te?"⏳ 优化中…":"✨ 优化",Je.disabled=te,Je.title="优化提示词：融入风格、补充细节"+(h?`
已有优化结果，再点会覆盖`:"")+`
接入的文本节点会一起融进结果`,Je.onclick=()=>ld(e,t,_e),Te.appendChild(Je)}Z.appendChild(Te),r.appendChild(Z)}if(e._rwErr&&e._rwErr.key===t.key){const Z=s.createElement("div");Z.className="rwerr",Z.textContent="操作失败："+e._rwErr.msg,r.appendChild(Z)}return r}function rd(e,t,n){const r=s.createElement("div");r.className="opttabs";const o=(h,m,p)=>{const y=s.createElement("button");return y.className=h?"on":"",y.textContent=m,y.title=p,y.onclick=()=>{e.optUse=e.optUse||{},e.optUse[t.key]=m!=="原词",pe(),$n(e)},y},i=kn(e).join(`

`),a=e.optStyle&&e.optStyle[t.key]||"",d=i!==a;r.append(o(!n,"原词","你自己写的那段。生成时"+(i?"会在前面拼上接入的文本节点":"原样提交")),o(n,"✨优化后","大模型优化出来的那段，已经是这个模型认的格式。"+(a?`
接入的文本已经融在里面了，生成时不再另外拼`:"")+`
原样提交`));const f=s.createElement("span");return f.className="note",n?d?(f.className="note bad",f.textContent="⚠ "+(a?i?"风格节点换过了，这份里还是旧的":"风格节点摘了，这份里还留着它":"风格节点是优化之后挂的，这份里没有它")+" —— 点「重新优化」",f.title="优化结果是一段写死的文字，风格在优化那一刻就烙进去了，之后改风格节点不会让它跟着变。要么重新优化一次，要么切回「原词」。"):f.textContent=i?"已含接入的文本，提交时不再另拼":"按模型认的格式写好了，原样提交":f.textContent=i?"提交时会拼上接入的文本":"",r.appendChild(f),r}const $n=e=>{g.panel._id===e.id&&ze(e.id)};function od(e){const t=e.ms>=6e4?`${Math.floor(e.ms/6e4)} 分 ${Math.round(e.ms%6e4/1e3)} 秒`:`${(e.ms/1e3).toFixed(1)} 秒`;return`${e.fallback?`⚠ API 没通（${e.fallback}），本地 27B 兜的`:e.via==="api"?`✅ API 改的（${e.model||"远程"}）`:"✅ 本地 27B 改的"}，${t}`+(e.warn?`
⚠ `+e.warn:"")}function id(e,t){return J(ad(e,t))}async function ad(e,t){if(!Ze())return;if(e._rwBusy)return be("翻译正在进行中，请稍候");const n=!!(e.optUse&&e.optUse[t.key]),r=n&&e.opt&&e.opt[t.key]?String(e.opt[t.key]):String(e.params[t.key]!=null?e.params[t.key]:t.default||"");if(!r.trim())return be("先写点内容再翻译");e._rwBusy=!0,e._rwErr=null,$n(e);try{const o=await _t("/api/text",{op:"translate",model:"youdao",inputs:[{name:"原文",text:r}],params:{},project:c&&c.id,projectName:c&&c.name,card:e.id,cardName:Se(e)});n?(e.opt=e.opt||{},e.opt[t.key]=o.text):e.params[t.key]=o.text,pe(),e._rwBusy=!1,$n(e),be(`翻译完成 · ${(o.ms/1e3).toFixed(1)} 秒 · ${o.model||"翻译服务"}`+(o.warn?`
${o.warn}`:""))}catch(o){e._rwBusy=!1,e._rwErr={key:t.key,msg:o.message},Ve.markWorkFailure(o),$n(e),Re("翻译失败："+o.message)}}function Wi(e,t){if(!e||!c)return e;const n=Q[ve(t)]||me(t);if(!n)return e;const r=new Map;let o=1,i=1,a=1;for(const d of n.inputs||[]){const f=t.assets[d.key];if(!f||!f.ref)continue;const h=pn(d,t);d.type==="image"?r.set(h,`<Picture ${o}>`):d.type==="audio"?r.set(h,`<Audio ${i}>`):d.type==="video"&&r.set(h,`<Video ${a}>`);const m=c.cards.find(p=>(p.outputs||[]).some(y=>y.url&&f.url&&y.url===f.url||y.filename&&f.filename&&y.filename===f.filename));if(m){const p=Se(m);d.type==="image"?(r.set(p,`<Picture ${o}>`),o++):d.type==="audio"?(r.set(p,`<Audio ${i}>`),i++):d.type==="video"&&(r.set(p,`<Video ${a}>`),a++)}else d.type==="image"?o++:d.type==="audio"?i++:d.type==="video"&&a++}return e.replace(/@([\u4e00-\u9fa5\w]+)/g,(d,f)=>{const h=r.get(f);if(h)return h;const m=c.cards.find(p=>Se(p)===f);return m&&(Ge(m)||Nt(m))&&cn(m)||d})}function sd(e){const t={},n=Q[ve(e)]||me(e);if(!n)return t;for(const r of n.inputs||[]){const o=e.assets[r.key];if(!o||!o.ref)continue;const i=c.cards.find(a=>(a.outputs||[]).some(d=>d.url&&o.url&&d.url===o.url||d.filename&&o.filename&&d.filename===o.filename));i?t[r.key]=Se(i):t[r.key]=pn(r,e)}return t}function ld(e,t,n){return J(dd(e,t,n))}async function dd(e,t,n){if(!Ze())return;const r=Q[ve(e)]||me(e);if(!r||!r.rewrite)return;if(e._rwBusy)return be("优化正在进行中，请稍候");const o=String(e.params[t.key]!=null?e.params[t.key]:t.default||""),i=kn(e);if(!o.trim()&&!i.length)return be("先写一句你想要什么，优化才有东西可改");const a=Wi(o,e);e._rwBusy=!0,e._rwErr=null,$n(e);try{await fi(e);const d=Yi(e),f=await _t("/api/rewrite",{capability:r.id,params:d.params,assets:d.assets,prompt:a,style:i.join(`

`),model:n||"auto",cardInfo:sd(e),project:c&&c.id,projectName:c&&c.name,card:e.id,cardName:Se(e)});console.log("=== /api/rewrite 返回数据 ==="),console.log(JSON.stringify(f,null,2)),console.log("=== r.text 内容 ==="),console.log(f.text),console.log("=========================");let h=f.text||"";h=h.replace(/^[\s\S]*?<\/think>/i,""),h=h.replace(/^[\s\S]*?<\/thinking>/i,""),h=h.replace(/^[\s\S]*?<\/thought>/i,""),h=h.trim(),e.opt=e.opt||{},e.optUse=e.optUse||{},e.optStyle=e.optStyle||{},e.opt[t.key]=h,e.optUse[t.key]=!0,e.optStyle[t.key]=i.join(`

`),pe(),be(od(f))}catch(d){e._rwErr={key:t.key,msg:d.message},Ve.markWorkFailure(d),Re("优化失败："+d.message)}e._rwBusy=!1,$n(e)}function cd(e,t){const n=s.createElement("div");n.className="tpl";const r=s.createElement("button");r.className="tplhd",r.dataset.readonlyView="";const o=s.createElement("div");o.style.display="none";const i=s.createElement("textarea");i.value=e.params[t.key]!=null?e.params[t.key]:t.default||"";const a=()=>{const h=i.value.trim()!==String(t.default||"").trim(),m=o.style.display!=="none";r.textContent=`${m?"▾":"▸"} ${t.label}`+(h?"（已被改过，出片结构可能跑偏）":"（预设，默认不用动）"),r.classList.toggle("dirty",h),f.style.display=h?"":"none"};r.onclick=()=>{o.style.display=o.style.display==="none"?"":"none",a()};const d=s.createElement("div");d.className="tplnote",d.textContent="⚠ "+(t.note||"预设参数，改了会影响出片。");const f=s.createElement("button");return f.className="tplrst",f.textContent="恢复预设",f.onclick=()=>{i.value=t.default||"",e.params[t.key]=i.value,a(),pe()},i.oninput=()=>{e.params[t.key]=i.value,a(),pe()},o.append(d,i,f),a(),n.append(r,o),n}function Qt(e){if(!e._el)return;const t=e._el.querySelector(".ch .t");t.textContent=Se(e),t.classList.toggle("named",!!e.name),At(e),es(e)}function At(e){so(e);const t=e._el&&e._el.querySelector(".cf .kt");if(!t)return;if(Nt(e)){t.dataset.kind="style",t.textContent="🎨 只加提示词",t.title="这个节点不生成任何东西：把它的出口拖到生图/生视频节点上，提交时这段风格会并进那个节点的提示词";return}if(Gt(e)){t.style.display="",t.dataset.kind="text",t.textContent="✍ 文本",t.title=Zt(e)?"选了加工方式：点「↑ 运行」把接进来的文本加工后写回这个节点":"存一段文字：连到生成节点就并进提示词，连到别的文本节点就当它的输入；在面板里选加工方式可以让大模型来加工";return}if(ht(e)){const p=Zn(e);t.style.display="",t.dataset.kind=p?p.kind:"both";const y=p&&p.width&&p.height?` ${p.width}×${p.height}`:"";t.textContent=p?`📎 ${Qe[p.kind]||p.kind}${y}`:"📎 空的",t.title=p?`${p.origin||""}
把右边的出口拖到别的节点 → 这份素材就进那个节点的格子里`:"点这个节点选一个文件（图片 / 视频 / 音频都收）";const x=e._el.querySelector(".body");!p&&x&&x.querySelector(".ph")&&(x.innerHTML=Ar(e));return}const n=gt(e),r=va(e),o=wa(e);t.dataset.kind=r?"both":o;const i=(e.outputs||[])[0],a=i&&i.width&&i.height?` ${i.width}×${i.height}`:"";t.textContent=r?"🖼🎬 跟素材":o==="video"?`🎬 视频${a}`:`🖼 图片${a}`;const d=((me(e)||{}).inputs||[]).filter(p=>Dt.includes(p.type)),f=n&&n.route?Object.keys(n.route):[...new Set(d.map(p=>p.type))],h=[...new Set(d.filter(p=>p.required).map(p=>p.type))];t.title=(r?"放图片就出图片、放视频就出视频":`这个节点出${Qe[o]}`)+(h.length?`；必需${h.map(p=>Qe[p]||p).join(" / ")}素材`:f.length?`；可引用${f.map(p=>Qe[p]||p).join(" / ")}素材`:"；不用素材");const m=e._el.querySelector(".body");!Ge(e)&&m&&m.querySelector(".ph")&&(m.innerHTML=Ar(e))}function es(e){const t=e._el&&e._el.querySelector(".inport");if(!t)return;const n=gt(e),r=me(e);if(ht(e)){t.style.display="none";return}const o=Gt(e),i=n&&n.route?Object.keys(n.route):[...new Set((r?r.inputs:[]).filter(d=>Dt.includes(d.type)).map(d=>d.type))];if(!i.length&&!o){t.style.display="none";return}const a=!Ge(e)&&An(r).length;t.style.display="",t.title=o?"文本节点的出口拖到这里：接进来的文字都是这段加工的输入（按连线顺序）":i.length?`上游节点的产物拖到这里（收${i.map(d=>Qe[d]||d).join(" / ")}${a?"，也收文本节点":""}）`:"文本节点的出口拖到这里"}const Xi="application/x-chouka-image-slot";function pd(e,t,n,r){const o=t.map(y=>y.key),i=o.indexOf(n),a=o.indexOf(r);if(i<0||a<0||i===a)return!1;const d=o.map(y=>({key:y,asset:e.assets[y]})),[f]=d.splice(i,1);d.splice(a,0,f);const h=Object.fromEntries(d.map((y,x)=>[y.key,o[x]]));d.forEach((y,x)=>{e.assets[o[x]]=y.asset});const m=me(e),p=new Map((m&&m.inputs||[]).filter(y=>y.pairWith).map(y=>[y.pairWith,y.key]));if(o.every(y=>p.has(y))){const y=d.map((k,$)=>({from:p.get(k.key),to:p.get(o[$])}));for(const k of[e.params,e.opt,e.optUse,e.optStyle]){if(!k)continue;const $=y.map(S=>({to:S.to,has:Object.prototype.hasOwnProperty.call(k,S.from),value:k[S.from]}));for(const S of y)delete k[S.to];for(const S of $)S.has&&(k[S.to]=S.value)}const x=o.filter(k=>p.has(k));Number.isInteger(e._tab)&&x[e._tab]&&(e._tab=x.indexOf(h[x[e._tab]]))}for(const y of c&&c.edges||[])y.to!==e.id||tt(y)||(h[y.slot]&&(y.slot=h[y.slot]),Array.isArray(y.slots)&&(y.slots=y.slots.map(x=>h[x]||x)));return!0}function ud(e,t,n,r){if(r.length<2)return;n.draggable=!0,n.classList.add("sortable"),n.title+=`
拖拽可调整图片顺序`;const o=i=>Array.from(i.dataTransfer&&i.dataTransfer.types||[]).includes(Xi);n.ondragstart=i=>{if(!Ze())return i.preventDefault();n._skipClick=!0,i.dataTransfer.effectAllowed="move",i.dataTransfer.setData(Xi,t.key),re(()=>n.classList.add("dragging"))},n.ondragenter=i=>{o(i)&&(i.preventDefault(),i.stopPropagation(),n.classList.add("drop-target"))},n.ondragover=i=>{o(i)&&(i.preventDefault(),i.stopPropagation(),i.dataTransfer.dropEffect="move")},n.ondragleave=i=>{n.contains(i.relatedTarget)||n.classList.remove("drop-target")},n.ondrop=i=>{if(!o(i))return;i.preventDefault(),i.stopPropagation(),n.classList.remove("drop-target");const a=i.dataTransfer.getData(Xi);pd(e,r,a,t.key)&&(At(e),ot(),qt(),ze(e.id),pe())},n.ondragend=()=>{n.classList.remove("dragging","drop-target"),A(()=>{n._skipClick=!1},0)}}function ts(e,t,n){const r=me(e),o=s.createElement("div");o.className="slots refs";const i=t.filter(p=>(e.assets||{})[p.key]),a=n&&n.route,d=[...new Set(t.map(p=>p.type))],f=s.createElement("div");if(f.className="refhead",a)f.textContent="引用上限：素材 1 个";else{const p=[];for(const y of d){const x=or(r,y);x&&p.push(`${Qe[y]||y} ${x}`)}f.textContent=p.length?`引用上限：${p.join(" · ")}`:"当前模型不支持画布素材引用"}o.appendChild(f);const h=i.filter(p=>p.type==="image");for(const p of i){const y=fd(e,p);p.type==="image"&&ud(e,p,y,h),o.appendChild(y)}const m=s.createElement("div");if(m.className="refadds",a){if(!i.length&&t.length){const p=s.createElement("button");p.className="refadd",p.textContent="＋ 添加素材（0/1）",p.title="可引用图片或视频，上限 1 个",p.onclick=()=>Zo(e,t[0]),m.appendChild(p)}}else for(const p of d){const y=or(r,p),x=i.filter(S=>S.type===p).length,k=t.find(S=>S.type===p&&!(e.assets||{})[S.key]);if(!y||x>=y||!k)continue;const $=s.createElement("button");$.className="refadd",$.textContent=`＋ 添加${Qe[p]||p}（${x}/${y}）`,$.title=`${Qe[p]||p}引用上限 ${y}`,$.onclick=()=>Zo(e,k),m.appendChild($)}return m.childElementCount&&o.appendChild(m),o}function fd(e,t){const n=e.assets[t.key],r=s.createElement("div");r.className="slot"+(n?" filled":t.required?" req":""),r.dataset.key=t.key,r.title=(t.hint||pn(t,e))+(t.required?"（必填）":"")+(n?`
单击预览；右键更换、下载或清空素材`:`
单击上传素材`),r.innerHTML='<div class="box"></div><span class="lbl"></span>',r.querySelector(".lbl").textContent=pn(t,e);const o=r.querySelector(".box");return n?(o.innerHTML=n.kind==="image"?`<img src="${n.url}" draggable="false">`:n.kind==="video"?`<video data-video-url="${n.url}" muted draggable="false"></video>`:"🎵",Xa(o)):o.textContent=t.type==="audio"?"🎵":t.type==="video"?"🎬":la(t)?"田":"＋",r.onclick=()=>{if(!r._skipClick)return n?xo(n):Zo(e,t)},r.oncontextmenu=i=>{i.stopPropagation(),i.preventDefault(),n&&Ot(i.clientX,i.clientY,n.origin||pn(t,e),[{icon:"⛶",text:n.kind==="image"?"查看大图":"放大播放",run:()=>xo(n)},{icon:"↻",text:"更换素材",run:()=>Zo(e,t)},{icon:"↓",text:"下载素材",run:()=>fo({...n,filename:n.origin||n.filename||n.url})},{icon:"✕",text:"清空这一格",danger:!0,run:()=>{delete e.assets[t.key],_a(e.id,t.key),At(e),ot(),qt(),ze(e.id),pe()}}])},r}const ns=e=>{const t=String(e??"").split(":"),n=t.length>1?+t[0]*60+ +t[1]:+t[0];return Number.isFinite(n)?Math.max(0,Math.round(n)):0},wo=e=>`${Math.floor(e/60)}:${String(Math.round(e)%60).padStart(2,"0")}`;function md(e,t,n,r){const o=s.createElement("div");o.className="arange";const i=s.createElement("div");i.className="atitle",i.textContent="用音频的哪一段",o.appendChild(i);const a=e.assets[t.key];if(!a){const Oe=s.createElement("div");return Oe.className="anote",Oe.textContent=`先在上面的「${pn(t,e)}」传一段音频，这里就能试听、拖着选要用的一段。`,o.appendChild(Oe),o}const d=s.createElement("audio");d.src=a.url,d.preload="metadata",o.appendChild(d);const f=s.createElement("div");f.className="atrack",f.innerHTML='<div class="asel"></div><div class="ahead"></div><div class="ahd s" title="拖动：选段从这里开始"></div><div class="ahd e" title="拖动：选段到这里结束"></div>';const h=f.querySelector(".asel"),m=f.querySelector(".ahead"),p=f.querySelector(".ahd.s"),y=f.querySelector(".ahd.e");o.appendChild(f);const x=s.createElement("div");x.className="aout",o.appendChild(x);const k=s.createElement("div");k.className="abtn",o.appendChild(k);const $=s.createElement("div");$.className="anote",$.textContent="点条子上任意位置就从那儿开始听；听到该起／该停的地方，按下面两个按钮把边界钉在那里。",o.appendChild($);let S=ns(e.params[n.key]!=null?e.params[n.key]:n.default),q=ns(e.params[r.key]!=null?e.params[r.key]:r.default);const ce=()=>Math.floor(d.duration)||Math.max(q,1);function Ye(Oe,at){const jt=ce();if(Oe=Math.max(0,Math.min(Math.round(Oe),jt-1)),at=Math.max(Oe+1,Math.min(Math.round(at),jt)),Oe===S&&at===q)return wt();S=Oe,q=at,e.params[n.key]=wo(S),e.params[r.key]=wo(q),wt(),pe()}d.onloadedmetadata=()=>Ye(S,q);let pt=0;const et=(Oe,at)=>{pt=at,d.currentTime=Oe,d.play()};d.ontimeupdate=()=>{pt&&d.currentTime>=pt&&d.pause(),wt()},d.onplay=d.onpause=d.onended=()=>wt();const He=(Oe,at,jt)=>{const H=s.createElement("button");return H.textContent=Oe,H.title=at,H.onclick=jt,k.appendChild(H),H},xt=He("▶ 试听选段","只放选中的这一段",()=>d.paused?et(S,q):d.pause());He("▶ 整条","从头放到尾，用来找该从哪儿起",()=>et(0,0)),He("⇤ 起点钉在这","把选段开头挪到当前播放位置",()=>Ye(Math.floor(d.currentTime),q)),He("终点钉在这 ⇥","把选段结尾挪到当前播放位置",()=>Ye(S,Math.ceil(d.currentTime)));const jn=Oe=>{const at=f.getBoundingClientRect();return Math.max(0,Math.min(1,(Oe.clientX-at.left)/at.width))*ce()},yt=Oe=>at=>{at.stopPropagation(),at.preventDefault();const jt=se=>Oe==="s"?Ye(jn(se),q):Ye(S,jn(se)),H=()=>{T.removeEventListener("mousemove",jt),T.removeEventListener("mouseup",H)};T.addEventListener("mousemove",jt),T.addEventListener("mouseup",H)};p.onmousedown=yt("s"),y.onmousedown=yt("e"),f.onmousedown=Oe=>{Oe.stopPropagation(),d.currentTime=jn(Oe),wt()};function wt(){const Oe=ce(),at=jt=>Math.max(0,Math.min(jt,Oe))/Oe*100+"%";h.style.left=at(S),h.style.width=(Math.min(q,Oe)-S)/Oe*100+"%",p.style.left=at(S),y.style.left=at(q),m.style.left=at(d.currentTime),x.textContent=`${wo(S)} → ${wo(q)}　选中 ${q-S} 秒`+(d.duration?`　（整条 ${wo(Math.floor(d.duration))}）`:""),xt.textContent=d.paused?"▶ 试听选段":"⏸ 停"}return wt(),o}function Zo(e,t){if(!Ze())return;const n=gt(e),r=n&&n.route&&Object.keys(n.route).length>1&&Object.values(n.route).some(o=>o.slot===t.key);g.picker.accept=r?Object.keys(n.route).map(o=>`${o}/*`).join(","):t.type==="audio"?"audio/*":t.type==="video"?"video/*":"image/*",g.picker.onchange=()=>J((async()=>{const o=g.picker.files[0];if(g.picker.value="",!!o)try{ro(e,t,await Ct(o,me(e)?.execution==="browser")),ze(e.id),pe()}catch(i){Ve.markWorkFailure(i),Re("上传失败："+i.message)}})()),g.picker.click()}function Qo(e,t){Ze()&&(g.picker.accept="image/*,video/*,audio/*",g.picker.onchange=()=>J((async()=>{const n=g.picker.files[0];if(g.picker.value="",!!n)try{const r=await Ct(n);t?await t(r):await vo(e,r)}catch(r){Ve.markWorkFailure(r),Re("上传失败："+r.message)}})()),g.picker.click())}async function vo(e,t,n=!0){if(!Ze()||!c.cards.includes(e))return;e.outputs=[{...t,filename:(t.origin||t.url).split(/[\\/]/).pop()}],delete e.w,delete e.h,qn(e),st(e),Qt(e),n&&ze(e.id),ot(),pe();const r=c.edges.filter(o=>o.from===e.id&&!tt(o));for(const o of r){const i=c.cards.find(a=>a.id===o.to);if(!(!i||!i.assets)){for(const a of xn(o))i.assets[a]=JSON.parse(JSON.stringify(e.outputs[0]));er(i),At(i)}}if(t.kind==="image"){const o=new Image;o.onload=()=>{if(!c?.cards.includes(e)||e.outputs[0]?.url!==t.url)return;const i=o.naturalWidth,a=o.naturalHeight;e.outputs[0].width=i,e.outputs[0].height=a,At(e),pe()},o.src=t.url}else if(t.kind==="video"){const o=s.createElement("video");o.onloadedmetadata=()=>{if(!c?.cards.includes(e)||e.outputs[0]?.url!==t.url)return;const i=o.videoWidth,a=o.videoHeight;e.outputs[0].width=i,e.outputs[0].height=a,At(e),pe()},ho(o,t.url)}}function hd(){Ze()&&c&&Qo(null,e=>{const t=Ei(),n=yn("card_asset",t.x,t.y);n&&(vo(n,e),be(`已放进一个素材节点（${Qe[e.kind]||e.kind}）：把它右边那颗点拖到生图/生视频/工具节点上，这份素材就进那个节点的格子`))})}function ei(e,t){const n=s.createElement("div");n.className="row";const r=s.createElement("label");r.textContent=t.label,r.title=t.hint||t.label,n.appendChild(r);const o=e.params[t.key]!=null?e.params[t.key]:t.type==="seed"?-1:t.default;if(Ke(e)&&t.key==="duration"){const i=s.createElement("input");i.type="number",i.min=t.min,t.max!=null&&(i.max=t.max),i.step=1,i.required=!0,i.value=o,i.style.width="72px";const a=t.max!=null?s.createElement("input"):null;a&&(a.type="range",a.min=t.min,a.max=t.max,a.step=1,a.value=o,a.oninput=()=>{i.value=a.value,e.params.duration=Number(a.value),pe()},n.appendChild(a)),i.oninput=()=>{e.params.duration=i.value===""?"":Number(i.value),a&&(a.value=i.value),pe()},i.onchange=()=>{Bt(e),i.value=e.params.duration,a&&(a.value=i.value),pe()},n.appendChild(i)}else if(t.type==="slider"){const i=s.createElement("input");i.type="range",i.min=t.min!=null?t.min:1,i.max=t.max!=null?t.max:30,i.step=t.step||1;const a=Q[ve(e)]||me(e),d=Vs(e,a);if(t.key==="duration"&&d&&!a.inputs.some(m=>m.key==="preview_seconds")){const m=[+d.duration,+o].filter(p=>Number.isFinite(p)&&p>0);i.min=Math.min(+i.min,...m),i.max=Math.max(+i.max,...m),i.step="any"}const f=s.createElement("input");f.type="number",f.min=i.min,f.max=i.max,f.step=i.step,f.style.width="72px",i.value=f.value=o??i.min;const h=m=>{i.value=f.value=m,e.params[t.key]=parseFloat(m),pe()};i.oninput=()=>h(i.value),f.oninput=()=>h(f.value),n.appendChild(i),n.appendChild(f)}else if(t.type==="seed"){const i=s.createElement("input");i.type="number",i.style.flex="1",i.value=o??-1,i.oninput=()=>{e.params[t.key]=i.value===""?-1:parseInt(i.value),pe()};const a=s.createElement("button");a.className="dice",a.textContent="🎲 随机",a.title="-1 = 每次随机",a.onclick=()=>{i.value=-1,e.params[t.key]=-1,pe()},n.appendChild(i),n.appendChild(a)}else if(t.type==="textarea"){const i=s.createElement("textarea");i.style.flex="1",i.style.minHeight="48px",i.value=o??"",i.oninput=()=>{e.params[t.key]=i.value,pe()},n.appendChild(i)}else if(t.type==="select"&&t.appearance==="switch"){const i=s.createElement("button");i.type="button",i.className="param-switch",i.id=`param-${e.id}-${t.key}`,r.htmlFor=i.id,i.setAttribute("role","switch"),i.setAttribute("aria-label",t.label);const a=s.createElement("span");a.className="param-switch-track",a.setAttribute("aria-hidden","true");const d=s.createElement("span");d.className="param-switch-thumb",a.appendChild(d);const f=s.createElement("span");f.className="param-switch-state",f.setAttribute("aria-hidden","true"),i.append(a,f);const h=()=>{const m=(e.params[t.key]??t.default)==="on";i.setAttribute("aria-checked",String(m)),f.textContent=m?"开启":"关闭"};i.onclick=()=>{e.params[t.key]=i.getAttribute("aria-checked")==="true"?"off":"on",h(),pe()},h(),n.appendChild(i)}else if(t.type==="select"&&t.options){const i=s.createElement("select");i.style.flex="1";for(const a of t.options){const d=s.createElement("option");d.value=typeof a=="object"?a.value:a,d.textContent=typeof a=="object"?a.label:a,i.appendChild(d)}o!=null&&(i.value=o),i.onchange=()=>{e.params[t.key]=i.value,pe(),t.key==="aspect_ratio"&&ze(e.id)},n.appendChild(i)}else{const i=s.createElement("input");i.type=t.type==="number"?"number":"text",t.min!=null&&(i.min=t.min),t.max!=null&&(i.max=t.max),i.value=o??"",i.style.flex="1",i.oninput=()=>{e.params[t.key]=i.type==="number"?i.value===""?"":parseFloat(i.value):i.value,pe()},n.appendChild(i)}if(t.warnAbove!=null&&t.warning){const i=s.createElement("div");i.className="paramwarn";const a=()=>{const d=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default);i.hidden=!isFinite(d)||d<=t.warnAbove,i.textContent=t.warning};for(const d of n.querySelectorAll("input, select"))d.addEventListener("input",a),d.addEventListener("change",a);a(),n.appendChild(i)}if(t.showHint&&t.hint){const i=s.createElement("div");i.className="knobnote",i.id=`param-${e.id}-${t.key}-hint`,i.textContent=t.hint;const a=[...n.querySelectorAll("input, select, textarea, button")];for(const[d,f]of a.entries())f.id=`param-${e.id}-${t.key}-${d}`,f.setAttribute("aria-describedby",i.id),f.setAttribute("aria-label",t.label+(d?"数值":""));a.length&&(r.htmlFor=a[0].id),n.appendChild(i)}return(t.key==="megapixels"||t.key==="scale_to_length")&&bd(e,t,n),t.key==="frame_load_cap"&&gd(e,t,n),n}async function gd(e,t,n){const r=Object.values(e.assets||{}).find(f=>f&&f.kind==="video"),o=s.createElement("span");o.className="resout";const i=s.createElement("div");if(i.className="resline",i.appendChild(o),n.appendChild(i),!r){o.textContent="放进视频后这里显示总帧数";return}let a="读取总帧数…";const d=()=>{if(!r.frames){o.textContent=a;return}const f=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default)||0;o.textContent=`这段共 ${r.frames} 帧`+(r.fps?` · ${(+r.fps).toFixed(0)} fps · ${(+r.duration).toFixed(1)} 秒`:"")+(f>0&&f<r.frames?` → 只跑前 ${f} 帧`:" → 整段都跑")};d();for(const f of n.querySelectorAll("input"))f.addEventListener("input",d);if(!r.frames){try{Object.assign(r,await Ft("/api/media?ref="+encodeURIComponent(r.ref)+"&project="+encodeURIComponent(c.id))),r.frames&&pe()}catch(f){Re(`读取媒体信息失败：${f.message}`)}a="总帧数读不出来（填 0 = 整段，一定没错）",d()}}function bd(e,t,n){const o=me(e).inputs.find(y=>y.key==="aspect_ratio"),i=o?e.params.aspect_ratio!=null?e.params.aspect_ratio:o.default:"16:9 (Widescreen)",a=s.createElement("span");a.className="resout";const d=[...n.querySelectorAll("input")],f=()=>{const y=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default);if(!isFinite(y)){a.textContent="";return}if(t.key==="megapixels"){const[x,k]=Cr(i,y);a.textContent=`${x}×${k} · ${Math.min(x,k)}p`,a.title=`${i}，${y} 百万像素`}else a.textContent=`16:9 素材 → ${Math.round(y)}×${fs(y)} · ${fs(y)}p`,a.title="长边固定为这个值，短边按素材原比例算，所以 p 数随素材变"},h=y=>{for(const x of d)x.value=y;e.params[t.key]=y,f(),pe()},m=s.createElement("span");m.className="presets";for(const y of kr){const x=t.key==="megapixels"?Ts(i,y):Ps[y],k=s.createElement("button");k.textContent=y+"p",x>t.max?(k.disabled=!0,k.title=t.key==="megapixels"?`${i} 下 ${y}p 需要 ${x} 百万像素，超过当前参数上限 ${t.max}`:`最长边 ${x}px 超过当前参数上限 ${t.max}`):(k.title=t.key==="megapixels"?`${Cr(i,x).join("×")} · 短边 ${y}p`:`16:9 素材约 ${y}p；最长边 ${x}px，实际短边随素材比例变化`,k.onclick=()=>h(x)),m.appendChild(k)}const p=s.createElement("div");p.className="resline",p.append(a,m),n.appendChild(p);for(const y of d)y.addEventListener("input",f);f()}function ti(e,t=c){return t?.director?.shots?.find(n=>n.id===e.director_shot||n.image?.card===e.id||n.video?.card===e.id)}function Ji(e){const t=ti(e);if(!t)return[];const n=[];return t.shotSize&&n.push("景别："+t.shotSize),(e.director_stage==="video"||t.video?.card===e.id)&&t.movement&&n.push("运镜："+t.movement),c.director.style?.trim()&&n.push("统一画面风格："+c.director.style.trim()),n}function Yi(e){const t=Q[ve(e)]||me(e),n={},r={},o=kn(e),i=Ji(e),a=new Set(An(t).map(d=>d.key));for(const d of t.inputs){if(Dt.includes(d.type)||d.mirror)continue;const f=e.params[d.key];if(f!=null?n[d.key]=f:d.type==="seed"?n[d.key]=-1:d.default!==void 0&&(n[d.key]=d.default),!a.has(d.key))continue;const h=F(e,d.key);if(h!=null)n[d.key]=h;else{let m=Wi(n[d.key],e);o.length&&(m=xe(m,o)),n[d.key]=m}i.length&&d.key==="prompt"&&(n[d.key]+=`
`+i.join(`
`))}if(Js(t,n),t.imageControls){const d=ui(e,t);n.image_ratio=d.ratio,n.image_clarity=d.clarity;for(const f of oi)delete n[f]}for(const d of t.inputs.filter(f=>Dt.includes(f.type))){const f=e.assets[d.key];f&&f.ref&&(r[d.key]=f.ref)}return{capability:t.id,params:n,assets:r,project:c&&c.id,projectName:c&&c.name,card:e.id,cardName:Se(e)}}function ni(e){return e._ifRestoring?(be("正在查询原产物，请勿重复生成"),Promise.resolve()):(e._runPromise||(e._runPromise=J(xd(e).finally(()=>{delete e._runPromise}))),e._runPromise)}function rs(e,t){!Ke(e)||!we()||!On(e,t)||(e._ifResumePreparing?(delete e._ifResumePreparing,e._runPromise=J(os(e,!0).finally(()=>{delete e._runPromise}))):e.status==="running"&&(e.job?ko(e,t):e.if_request_id&&Vi(e,t)))}async function Vi(e,t){if(e._ifRecovering||c?.id!==t||!we()||!c.cards.includes(e)||!Ke(e)||!On(e,t)||e.job||e.status!=="running"||!e.if_request_id)return;e._ifRecovering=!0;let n=!1;try{const r=await dt(`/requests/${encodeURIComponent(e.if_request_id)}`);if(c?.id!==t||!we()||!c.cards.includes(e))return;e.job=r.id,e.error=null,e.step="本机 IF 已接收原请求，正在恢复进度";const o=Zr(e,t);o.job=r.id,sr(o),Hr(e,{id:r.id,capability:e.if_job_cap||e.cap,prompts:e.if_pending_prompts||[]}),delete e.if_pending_prompts,rn(e,t,"running"),await on(e,t),ko(e,t)}catch(r){if(c?.id!==t||!c.cards.includes(e))return;n=r instanceof TypeError||r.status>=500||r.status===404&&Date.now()-(e.if_submitted_at||e.if_started)<12e4,e.step=n?"正在向本机 IF 确认原请求，请勿重复生成":"",n||(e.status="error",e.error="IF 提交结果尚未确认，请先在 IF 查看是否已创建任务，避免重复生成："+r.message),rn(e,t,"submitting"),n||(Re(e.error),await on(e,t))}finally{e._ifRecovering=!1,c?.id===t&&c.cards.includes(e)&&(st(e),g.panel._id===e.id&&ze(e.id),n&&A(()=>Vi(e,t),2500))}}async function os(e,t=!1){const n=c,r=e.cap,o=[];let i=!1,a=!1;e.status="queued",e.error=null,e.progress=null,e.job=null,e.ms=null,e.step="正在连接本机 IF 并读取模型",e.if_job_cap=r,t||(e.if_started=Date.now(),e.if_request_id=Array.from(crypto.getRandomValues(new Uint8Array(16)),f=>f.toString(16).padStart(2,"0")).join("")),delete e.if_submitted_at,delete e.if_pending_prompts,delete e.if_canvas_url;const d=rn(e,n.id,"preparing");st(e),g.panel._id===e.id&&ze(e.id);try{if(!d)throw new Error("无法保存 IF 刷新恢复记录，尚未提交生成；请检查浏览器存储空间和权限");const f=await Er(n.id);if(!f.ok)throw new Error("任务准备状态保存失败，尚未提交 IF："+(f.error?.message||"请重试"));const h=await hn();if(!mn)throw new Error("请更新本机 IF 桥接器后重试；当前版本不支持提交期间刷新恢复");if(await fi(e),c!==n||!we()||!n.cards.includes(e)||e.cap!==r)throw new Error("画布已切换或权限已变化，已取消 IF 提交");const m=me(e).outputType,p=h.filter(H=>H.type===m).find(H=>H.display_name===e.params.if_model)||!e.params.if_model&&h.find(H=>H.type===m);if(!p)throw new Error("当前 IF 模型不可用，请重新选择模型");if(["exhausted","unavailable"].includes(p.quota_status))throw new Error(`${p.display_name}：${Mr(p)}，尚未提交生成，请选择其他模型`);const y=String(e.params.prompt||""),x=y.trim();if(!x)throw new Error("请先填写 IF 生成需求");const k=Fe(p.display_name,m),$=Object.entries(e.assets||{}).filter(([,H])=>H&&Dt.includes(H.kind)).sort(([H],[se])=>H.localeCompare(se,void 0,{numeric:!0})),S={image:0,video:0,audio:0};for(const[H,se]of $){const Le=H.match(/^(?:images|video)\[(\d+)\]$/);if(!Le||se.kind==="image"!==H.startsWith("images["))throw new Error(`引用槽位与${Qe[se.kind]||se.kind}类型不匹配，请重新连接引用`);if(Number(Le[1])>=(k.bridge[se.kind]||0))throw new Error(`所选模型最多引用图片 ${k.bridge.image} 张、视频 ${k.bridge.video} 个；当前引用槽位超出范围，请移除多余引用或更换模型`);S[se.kind]++}if(Object.keys(S).some(H=>S[H]>(k.bridge[H]||0)))throw new Error("引用数量超出所选 IF 模型的画布槽位");const q={type:m,model:p.display_name,request_id:e.if_request_id,prompt:xe(Wi(x,e),kn(e))},ce=Ji(e);ce.length&&(q.prompt+=`
`+ce.join(`
`));const Ye=me(e),pt=Ye.inputs,et=[];if(m==="image"){const{ratio:H,clarity:se}=ui(e,Ye),[Le,De]=H.split(":").map(Number),Ne=cr.find(_e=>_e.id===se).val,Z=Le>=De?Math.round(Ne*Le/De/16)*16:Ne,te=Le>=De?Ne:Math.round(Ne*De/Le/16)*16;et.push(`分辨率：${Z}×${te}`)}else{const H=pt.find(Ae=>Ae.key==="aspect_ratio"),se=pt.find(Ae=>Ae.key==="megapixels"),Le=e.params.aspect_ratio??H.default,De=Number(e.params.megapixels??se.default),Ne=ea(e,Ye),Z=Ne?[Ne.width,Ne.height]:Cr(Le,Number.isFinite(De)&&De>=se.min&&De<=se.max?De:se.default),te=pt.find(Ae=>Ae.key==="duration"),_e=Number(e.params.duration??te.default);if(!Number.isSafeInteger(_e)||_e<te.min||te.max!=null&&_e>te.max)throw new Error(te.max!=null?`当前 IF 模型时长须为 ${te.min}–${te.max} 秒的整数，请修改时长`:"当前 IF 模型时长范围未核实，请输入正整数秒");const[he,je]=So[Le]||[1,1];et.push(`分辨率：${Z[0]}×${Z[1]}`,`时长：${_e}s`,`画面比例：${he} : ${je}`)}q.prompt+=`

${et.join(`
`)}`;const He=m==="video"?"视频":"图片",xt=m==="video"?"图片、":"",jn=m==="video"?"不要改为生图":"不要改为视频或文字方案";if(q.prompt=`最终交付必须是${He}文件，不是${xt}故事板或文字方案。用户已经确认生成需求，请直接生成${He}；不要等待用户确认规划、分镜或中间图片，也不要把中间图片当作最终结果。如无法直接完成，请说明原因，${jn}。以本条${He}目标和以下参数要求为准。

${q.prompt}`,m==="image"&&e.params.if_reference?.trim()){if(!k.bridge.image&&!k.bridge.video)throw new Error("该模型不支持已确认的媒体引用");q.image=e.params.if_reference.trim()}const yt=Zr(e,n.id);yt.pending=[],yt.job=null;const wt=H=>JSON.stringify([H.kind,new X(H.url,location.href).href,H.ref||""]),Oe=new Set($.map(([,H])=>wt(H)));if(yt.entries=yt.entries.filter(H=>Oe.has(H.source)),sr(yt),$.length){if(!Lt)throw new Error("请更新本机 IF 桥接器后重试；当前版本不支持引用复用");q.references=[];for(const[H,[,se]]of $.entries()){const Le=`${Qe[se.kind]}引用（${H+1}/${$.length}）`,De=new X(se.url,location.href);if(De.origin!==location.origin)throw new Error("IF 仅能上传当前画布内的本机素材");e.step=`正在检查 IF ${Le}是否可复用`,st(e);const Ne=await lr(De,se.kind);if(c!==n||!n.cards.includes(e)||e.cap!==r||!we())throw new Error("画布已切换或权限已变化，已取消 IF 提交");const Z={source:wt(se),version:Ne,kind:se.kind};yt.pending.push(Z);const te=yt.entries.find(Te=>Te.source===Z.source&&Te.version===Ne&&Te.kind===se.kind&&Nr(Te.url));if(te){e.step=`正在复用已上传 IF 的${Le}`,st(e),q.references.push({kind:se.kind,url:te.url});continue}e.step=`正在读取 IF ${Le}`,st(e);const _e=await ue(De,{credentials:"same-origin",cache:"no-store"});if(!_e.ok)throw new Error("无法读取画布引用素材");let he=await _e.blob();const je=se.kind==="image"?["image/png","image/jpeg","image/webp"]:["video/mp4"],Ae=se.kind==="image"?1e7:50*1024*1024;if(!je.includes(he.type)||he.size>Ae){e.step=`正在适配 IF ${Qe[se.kind]}上传副本（${H+1}/${$.length}）`,st(e);const Te=await ue(`/api/if-reference?${new URLSearchParams({url:De.pathname+De.search,type:se.kind})}`,{credentials:"same-origin",cache:"no-store",headers:{"If-Match":Ne}});if(!Te.ok)throw new Error(`IF 素材自动适配失败：${(await Te.text()).slice(0,500)}`);const vt=he.size;he=await Te.blob();const Je=Te.headers.get("X-Chouka-IF-Conversion");if(c!==n||!n.cards.includes(e)||e.cap!==r||!we())throw new Error("画布已切换或权限已变化，已取消 IF 提交");be(`IF ${Qe[se.kind]}上传副本已${Je==="lossless-webp"?"转换为无损 WebP":"压缩"}（${(vt/1048576).toFixed(1)} → ${(he.size/1048576).toFixed(1)} MB），原素材保持不变`)}if(!he.size||!je.includes(he.type)||he.size>Ae)throw new Error(`IF 上传副本仍不符合格式或 ${se.kind==="image"?10:50} MB 大小限制，原素材未修改`);if(c!==n||!n.cards.includes(e)||e.cap!==r||!we())throw new Error("画布已切换或权限已变化，已取消 IF 提交");if(await lr(De,se.kind)!==Ne)throw new Error("准备期间引用素材已变化，请重试");e.step=`正在向本机桥接传送${Le}`,st(e);const it=await dt("/assets",{method:"POST",headers:{"X-Chouka-IF":"asset","Content-Type":he.type},body:he});if(o.push(it.asset_id),q.references.push({kind:se.kind,asset_id:it.asset_id}),c!==n||!n.cards.includes(e)||e.cap!==r)throw new Error("画布已切换，已取消 IF 提交")}}if(sr(yt),e.params.if_model=p.display_name,e.status="queued",e.error=null,e.progress=null,e.outputs=[],e.ms=null,e.step="正在交由本机 IF 桥接处理",e.job=null,a=!0,e.if_submitted_at=Date.now(),e.if_pending_prompts=[{key:"if_original",label:"原始提示词",text:y},{key:"if_submitted",label:"提交给 IF CLI 的提示词",text:q.prompt}],!rn(e,n.id,"submitting"))throw new Error("无法保存 IF 提交恢复记录，尚未提交生成；请检查浏览器存储空间和权限");st(e),g.panel._id===e.id&&ze(e.id);const at=await dt("/runs",{method:"POST",headers:{"Content-Type":"application/json","X-Chouka-IF":"generate"},body:JSON.stringify(q)});i=!0,e.job=at.id,e.if_job_cap=r,e.status="running",e.step="本机 IF 正在准备生成任务",yt.job=at.id,sr(yt),Hr(e,{id:at.id,capability:r,prompts:e.if_pending_prompts}),delete e.if_pending_prompts,rn(e,n.id,"running"),g.hist._id===e.id&&Ur(e.id),(await on(e,n.id)).ok||Re("IF 任务已提交，服务器状态保存失败；已保留本标签页恢复记录，请勿重复生成"),ko(e,n.id)}catch(f){const h=a&&!i&&(f instanceof TypeError||f instanceof SyntaxError||f.status>=500);if(!i&&!h&&o.length&&await Promise.allSettled(o.map(m=>dt(`/assets/${encodeURIComponent(m)}`,{method:"DELETE",headers:{"X-Chouka-IF":"asset"}}))),c!==n||!n.cards.includes(e))return;h?(e.status="running",e.error=null,e.step="正在向本机 IF 确认原请求",rn(e,n.id,"submitting"),Vi(e,n.id)):(e.status="error",e.error=f.message,e.step="",e.job=null,rn(e,n.id,"error"),Re(`「${Se(e)}」生成失败：${e.error}`),await on(e,n.id))}c===n&&n.cards.includes(e)&&(st(e),g.panel._id===e.id&&ze(e.id))}async function ko(e,t,n=null){if(e._ifPolling||c?.id!==t||!we()||!Ke(e)||!c.cards.includes(e)||!On(e,t)||!e.job||e.status!=="running")return;e._ifPolling=!0;const r={job:e.job,request:e.if_request_id,started:e.if_started,cap:e.cap},o=()=>c?.id===t&&we()&&c.cards.includes(e)&&e.job===r.job&&e.if_request_id===r.request&&e.if_started===r.started&&e.cap===r.cap;let i=!1;try{const a=n||await dt(`/runs/${encodeURIComponent(e.job)}`);if(!o())return;zr(e,a.result,t);const d=Qr(a.result);d&&(e.if_canvas_url=d);const f=e.history?.find(x=>x.job===e.job)?.prompts?.find(x=>x.key==="if_submitted");if(f&&typeof a.result?.submitted_prompt=="string"&&(f.text=a.result.submitted_prompt),a.state==="starting"||a.state==="running"){e.step=a.step||(a.state==="starting"?"本机 IF 正在准备生成任务":"IF 正在生成"),i=!0;return}if(a.state==="error")throw new Error((a.error||"IF 生成失败")+(a.result?.invalid_reference_indices?.length?"；已清除失效引用缓存，重试时仅重新上传失效素材":""));const h=a.result?.downloaded||[],m=me(e).outputType,p=/请确认|确认后|回复["“]?确认/.test(a.result?.planning_text||"");if(!h.length)throw new Error(p?`IF 要求确认规划或故事板，未直接生成${Qe[m]}；请在 IF 网站查看该会话。`:`IF 未返回${Qe[m]}产物，请在 IF 网站查看该会话。`);const y=[];for(const[x,k]of h.entries()){if(k.type!==me(e).outputType)continue;e.step=`正在取回 IF ${Qe[k.type]}产物（${x+1}/${h.length}）`,st(e);const $=await ue(`${Yn}/runs/${encodeURIComponent(e.job)}/media/${k.index}`,{credentials:"omit"});if(!$.ok)throw $.status>=500||$.status===429?new TypeError("IF 产物暂不可读取"):new Error("无法读取 IF 产物");const S=new File([await $.blob()],k.name);if(!o())return;e.step=`正在保存 IF ${Qe[k.type]}产物（${x+1}/${h.length}）`,st(e);const q=await Ct(S,k.type==="image");if(!o())return;y.push({...q,filename:k.name})}if(!y.length)throw new Error(m==="video"&&h.some(x=>x.type==="image")?`IF 只生成了故事板图片，尚未生成视频${p?"，并要求确认下一步":""}；请在 IF 网站查看该会话。`:`IF 返回的媒体类型与当前${Qe[m]}节点不符，请在 IF 网站查看该会话。`);e.outputs=y,e.status="done",e.step="",e.error=null,e.ms=Date.now()-(e.if_started||Date.now()),Hr(e,{id:e.job,capability:e.if_job_cap||e.cap}),g.hist._id===e.id&&Ur(e.id),rn(e,t,"done"),await is(e)}catch(a){if(!o())return;a instanceof TypeError||/桥接请求失败|Failed to fetch/.test(a.message)?(e.step="IF 连接或产物读取中断，正在重试",i=!0):(e.status="error",e.error=a.message,e.step="",e.ms=Date.now()-(e.if_started||Date.now()),e.job&&Hr(e,{id:e.job,capability:e.if_job_cap||e.cap}),g.hist._id===e.id&&Ur(e.id),Re(`「${Se(e)}」生成失败：${a.message}`))}finally{e._ifPolling=!1,o()&&(rn(e,t,i?"running":e.status),st(e),g.panel._id===e.id&&ze(e.id),i?A(()=>ko(e,t),2500):["done","error"].includes(e.status)&&await on(e,t))}}async function xd(e){if(!Ze())return;const t=c;if(Nt(e))return be("风格节点不用运行：它只把风格并进挂着的那几个节点的提示词");if(Gt(e))return ed(e);if(e.status==="queued"||e.status==="running")return;const n=me(e);if(!n)return Re("能力不可用");if(n.id==="image_composite"&&n.execution==="browser")return Kl(e);if(n.execution==="if_studio")return os(e);if(e.director_shot){if(Ve.cancelContentSave(),await Ve.pendingChain,!(await Er(c.id)).ok||!c.cards.includes(e))return;Mt++,delete e.director_selected}e.job=null,e.queue_remaining=null,e.queue_ahead=null,e.error=null,e.progress=0,e.status="queued",e.outputs=[],e.ms=null,e.step="",st(e),ze(e.id);try{if(await fi(e),c!==t||!t.cards.includes(e)||!we())throw new Error("画布已切换或权限变化，未提交生成");const r=Yi(e),o=await _t("/api/generate",r);e.job=o.id,e.seed=o.seed,e.status=o.status,o.project_rev!=null&&c?.id===r.project&&(c.rev=Math.max(c.rev||0,o.project_rev))}catch(r){e.status="error",e.error=r.message,e.job=null,c===t&&Ve.markWorkFailure(r),Re(`「${Se(e)}」提交失败：${r.message}`)}e.director_shot&&(Mt=Math.max(0,Mt-1)),!(c!==t||!we())&&(st(e),g.panel._id===e.id&&ze(e.id),pe(!1),yi())}async function yd(e){if(e.job)try{await _t(`/api/job/${e.job}/cancel`)}catch(t){Re(t.message)}}async function is(e){const t=c;ot();for(const n of t.edges.filter(r=>r.from===e.id&&!tt(r)&&!r.version)){const r=t.cards.find(a=>a.id===n.to);if(!r)continue;const o=e.outputs||[],i=xn(n);n.slots=i;for(let a=0;a<i.length;a++){if(!o[a]){delete r.assets[i[a]];continue}try{const d=await Ai(o[a],me(r)?.execution==="browser");c===t&&t.edges.includes(n)&&ct(r.id)&&(r.assets[i[a]]=d)}catch(d){console.error("导入产物失败:",d),c===t&&Re(`向「${Se(r)}」导入产物失败：${d.message}`)}}if(c!==t)return;er(r),At(r),g.panel._id===r.id&&ze(r.id)}}function wd(e){return e.project?c&&e.project===c.id?c.name:(ae.find(t=>t.id===e.project)||{}).name||e.projectName||"":e.projectName||""}async function as(e){if(!c||c.id!==e.project){if(!ae.some(r=>r.id===e.project))return be("这个任务所在的画布已经不在了");await Lr(e.project)}const t=c.cards.find(r=>r.id===e.card);if(!t)return be("这个节点片已经从画布上删掉了");const n=g.stage.getBoundingClientRect();K.x=n.width/2-(t.x+We(t)/2)*K.k,K.y=n.height/3-t.y*K.k,Dn(),ge=t.id,ee.clear(),Jt=null,ot(!1);for(const r of c.cards)r._el&&r._el.classList.toggle("sel",r.id===t.id);ze(t.id),Et(),Pt(),tn()}return w.bind({open:Lr,refresh:Pr,clear:wn,selectSpace(e){qe=e,c&&!pa(c).includes(e)&&wn(),Po()},renamed(e,t,n){c?.id===e&&(c.name=t,typeof n=="number"&&(c.rev=n),Pn()),nt.renameProject(e,t)}}),l.onDispose(()=>{hi++,nt.reset(),c=null,Ve.cancelTimers(),Fo(),qi(),fr?.disconnect(),po()}),{ready:da,flush:()=>ar(void 0,!0),getProject:()=>c,nodeEditor:O?T.ChoukaNodeEditor:void 0}}const Qd=Ns({x:St().int().min(0),y:St().int().min(0),width:St().int().min(1),height:St().int().min(1)}).refine(l=>l.x+l.width<=8192&&l.y+l.height<=8192),Hn=(l,u,b)=>Math.max(u,Math.min(b,l));function ia(l){if(l===void 0)return;const u=Qd.safeParse(l);if(!u.success)throw new Error("图片裁剪范围无效，需使用原图范围内的整数像素。");return u.data}function di(l,u){if(![l,u].every(b=>Number.isFinite(b)&&b>0)||l>8192||u>8192||l*u>32e6)throw new Error("图层尺寸必须大于 0，单边不超过 8192 像素，总像素不超过 3200 万。")}function _r(l,u){const b=l.crop??{x:0,y:0,width:u.width,height:u.height};if(b.x+b.width>u.width||b.y+b.height>u.height)throw new Error("裁剪范围超出原图尺寸。");return b}function ec(l,u,b){const w=ia(u),_=_r({crop:w},b),C=_r(l,b),T=l.width/C.width,s=l.height/C.height,v=(_.x-C.x)*T,A=(_.y-C.y)*s,D=l.angle*Math.PI/180;return{x:l.x+v*Math.cos(D)-A*Math.sin(D),y:l.y+v*Math.sin(D)+A*Math.cos(D),width:_.width*T,height:_.height*s,crop:_.x===0&&_.y===0&&_.width===b.width&&_.height===b.height?void 0:{..._}}}function Fs(l){return[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]].map(([u=0,b=0])=>({fx:u,fy:b,x:l.x+(u+1)*l.width/2,y:l.y+(b+1)*l.height/2}))}function xs(l,u,b,w){const _=Fs(u).map(C=>({...C,distance:Math.hypot((l.x-C.x)*w.width/b.width,(l.y-C.y)*w.height/b.height)})).sort((C,T)=>C.distance-T.distance)[0];return _&&_.distance<=14?_:l.x>u.x&&l.x<u.x+u.width&&l.y>u.y&&l.y<u.y+u.height?"move":"new"}function tc(l,u,b,w,_){const C=b.x-u.x,T=b.y-u.y;if(w==="move")return{...l,x:Hn(l.x+C,0,_.width-l.width),y:Hn(l.y+T,0,_.height-l.height)};if(w==="new")return{x:Math.min(b.x,u.x),y:Math.min(b.y,u.y),width:Math.max(1,Math.abs(C)),height:Math.max(1,Math.abs(T))};let{x:s,y:v}=l,A=s+l.width,D=v+l.height;return w.fx<0&&(s=Hn(s+C,0,A-1)),w.fx>0&&(A=Hn(A+C,s+1,_.width)),w.fy<0&&(v=Hn(v+T,0,D-1)),w.fy>0&&(D=Hn(D+T,v+1,_.height)),{x:s,y:v,width:A-s,height:D-v}}function nc(l,u,b,w){const _=Number(b);if(!b.trim()||!Number.isFinite(_))return l;const C=u==="x"?w.width-1:u==="y"?w.height-1:u==="width"?w.width-l.x:w.height-l.y,T={...l,[u]:Hn(Math.round(_),u==="x"||u==="y"?0:1,C)};return{...T,width:Math.min(T.width,w.width-T.x),height:Math.min(T.height,w.height-T.y)}}const rc="_dialog_89jif_1",oc="_stage_89jif_45",ic="_fields_89jif_57",ac="_actions_89jif_71",ai={dialog:rc,stage:oc,fields:ic,actions:ac},sc=[["x","裁剪 X / px"],["y","裁剪 Y / px"],["width","裁剪宽度 / px"],["height","裁剪高度 / px"]];function lc({session:l,canEdit:u,onApply:b,onClose:w}){const _=lt.useRef(null),C=lt.useRef(null),T=lt.useRef(null),[s,v]=lt.useState(l.rect),[A,D]=lt.useState({}),[oe,le]=lt.useState(""),re=lt.useId(),{bitmap:B}=l;lt.useLayoutEffect(()=>{const M=_.current,I=C.current,X=document.activeElement;return M?.showModal(),()=>{M?.close(),I&&(I.width=I.height=0),X instanceof HTMLElement&&X.isConnected&&X.focus({preventScroll:!0})}},[]),lt.useLayoutEffect(()=>{const M=C.current,I=M?.getContext("2d");if(!M||!I)return;const X=Math.min(720/B.width,420/B.height);M.width=Math.max(1,Math.round(B.width*X)),M.height=Math.max(1,Math.round(B.height*X));const ue=M.width/B.width,L=M.height/B.height,P=s.x*ue,j=s.y*L,N=s.width*ue,z=s.height*L;I.drawImage(B,0,0,M.width,M.height),I.fillStyle="#000a",I.beginPath(),I.rect(0,0,M.width,M.height),I.rect(P,j,N,z),I.fill("evenodd"),I.strokeStyle="#fff",I.lineWidth=2,I.strokeRect(P,j,N,z),I.strokeStyle="#ffffff88",I.lineWidth=1,I.beginPath();for(const Y of[1/3,2/3])I.moveTo(P+N*Y,j),I.lineTo(P+N*Y,j+z),I.moveTo(P,j+z*Y),I.lineTo(P+N,j+z*Y);I.stroke(),I.fillStyle="#fff";for(const Y of Fs(s))I.fillRect(Y.x*ue-4,Y.y*L-4,8,8)},[B,s]);const G=M=>{const I=M.currentTarget.getBoundingClientRect();return{x:Hn(Math.round((M.clientX-I.left)*B.width/I.width),0,B.width),y:Hn(Math.round((M.clientY-I.top)*B.height/I.height),0,B.height)}};return W.jsxs("dialog",{ref:_,"data-image-crop":!0,className:ai.dialog,"aria-labelledby":re,onCancel:M=>{M.preventDefault(),M.stopPropagation(),w()},onKeyDown:M=>M.stopPropagation(),onPaste:M=>M.stopPropagation(),onDragOver:M=>{M.preventDefault(),M.stopPropagation()},onDrop:M=>{M.preventDefault(),M.stopPropagation()},children:[W.jsx("h2",{id:re,children:"裁剪所选图片"}),W.jsx("p",{children:"拖动边框调整范围，框内拖动移动，框外拖动重新框选；也可输入原图像素。"}),W.jsx("div",{className:ai.stage,children:W.jsx("canvas",{ref:C,"aria-label":"单张图片裁剪预览，可使用下方数值调整裁剪范围",onPointerDown:M=>{if(M.button!==0||!u()||T.current)return;M.preventDefault();const I=G(M),X=xs(I,s,B,M.currentTarget.getBoundingClientRect());X==="new"&&(I.x=Math.min(I.x,B.width-1),I.y=Math.min(I.y,B.height-1)),D({}),T.current={pointerId:M.pointerId,start:I,mode:X,before:{...s}},M.currentTarget.setPointerCapture(M.pointerId)},onPointerMove:M=>{if(!u())return;const I=G(M),X=T.current;if(X)X.pointerId===M.pointerId&&(M.preventDefault(),v(tc(X.before,X.start,I,X.mode,B)));else{const ue=xs(I,s,B,M.currentTarget.getBoundingClientRect());M.currentTarget.style.cursor=typeof ue=="string"?ue==="move"?"move":"crosshair":ue.fx===0?"ns-resize":ue.fy===0?"ew-resize":ue.fx===ue.fy?"nwse-resize":"nesw-resize"}},onLostPointerCapture:()=>{T.current=null}})}),W.jsx("div",{className:ai.fields,children:sc.map(([M,I])=>W.jsxs("label",{children:[W.jsx("span",{children:I}),W.jsx("input",{type:"number",step:"1",min:M==="x"||M==="y"?0:1,max:M==="x"?B.width-1:M==="y"?B.height-1:M==="width"?B.width-s.x:B.height-s.y,value:A[M]??s[M],onChange:X=>D({...A,[M]:X.target.value}),onBlur:X=>{u()&&v(nc(s,M,X.target.value,B)),D(ue=>{const L={...ue};return delete L[M],L})},onKeyDown:X=>{X.key==="Enter"&&X.currentTarget.blur()}})]},M))}),W.jsxs("p",{role:"status",children:["原图 ",B.width," × ",B.height," px · 保留 ",s.width," × ",s.height," px"]}),oe&&W.jsx("p",{role:"alert",children:oe}),W.jsxs("div",{className:ai.actions,children:[W.jsx("button",{type:"button",onClick:()=>{u()&&(D({}),v({x:0,y:0,width:B.width,height:B.height}))},children:"恢复原图"}),W.jsx("button",{type:"button","data-composer-action":"cancel-crop",autoFocus:!0,onClick:w,children:"取消裁剪"}),W.jsx("button",{type:"button",onClick:()=>{u()&&b(l.id,s)?w():le("裁剪未应用，请检查编辑权限或重新打开裁剪。")},children:"应用裁剪"})]})]})}function dc({selection:l,enabled:u,canEdit:b,onApply:w}){const[_,C]=lt.useState(null),T=l?.layer.id,s=l?.layer.locked;lt.useEffect(()=>{C(null)},[u,T,s]);const v=lt.useCallback(()=>C(null),[]);return W.jsxs(W.Fragment,{children:[W.jsx("button",{type:"button",className:"ic-button","data-composer-action":"crop",disabled:!u||!l||s,onClick:()=>{!l||l.layer.locked||!b()||C({id:l.layer.id,bitmap:l.bitmap,rect:{..._r(l.layer,l.bitmap)}})},children:"裁剪图片"}),W.jsx("p",{className:"ic-hint",children:"裁剪只影响所选图片，保留原图，可重新裁剪或恢复原图。"}),_&&W.jsx(lc,{session:_,canEdit:b,onApply:w,onClose:v})]})}function cc(l,u){l.dataset.composerCrop="";const b=$s.createRoot(l);return{update(w){b.render(W.jsx(dc,{...u,...w}))},dispose(){b.unmount()}}}const wr=Object.freeze({size:32,color:"#ff4040",opacity:1,hardness:1,strength:8,blockSize:12});function pc(l){return/^#[a-f\d]{6}$/i.test(l)}const ys=St().min(0).max(1),ws=St().int().min(1).max(8192),uc=Qi({tool:$d(["paint","erase","restore","blur","mosaic","restoreEffects"]),points:si(Qi({x:St().min(-1e6).max(1e6),y:St().min(-1e6).max(1e6)})).min(1).max(12e3),sizeX:St().positive().max(16384),sizeY:St().positive().max(16384),color:Wn().refine(pc),opacity:ys,hardness:ys,strength:St().min(0).max(128),blockSize:St().int().min(1).max(1024),clip:Eo().transform(ia).optional()}),Ds=Eo().superRefine((l,u)=>{if(!Array.isArray(l)||l.length>1e3){u.addIssue({code:"custom",message:"笔画数量无效或超过 1000。"});return}let b=0;for(const w of l){if(typeof w!="object"||w===null||!("points"in w)){u.addIssue({code:"custom",message:"笔画缺少坐标。"});return}const _=w.points;if(!Array.isArray(_)||_.length>12e3){u.addIssue({code:"custom",message:"单笔坐标数量无效或超过 12000。"});return}if(b+=_.length,b>1e5){u.addIssue({code:"custom",message:"笔画总坐标超过 100000。"});return}}}).pipe(si(uc).max(1e3)),fc=Qi({width:ws,height:ws,strokes:Ds}).refine(l=>l.width*l.height<=32e6).refine(l=>l.strokes.every(({clip:u})=>!u||u.x+u.width<=l.width&&u.y+u.height<=l.height));function qs(l){if(l===void 0)return;const u=Ds.safeParse(l);if(!u.success)throw new Error("图层笔画数据无效：请检查工具、有限数值、笔画数量和坐标数量，不能包含图片数据。");return u.data}function Bs(l){const u=fc.safeParse(l);if(!u.success)throw new Error("涂鸦数据无效：单边须为 1–8192 整数像素，总像素不超过 3200 万，笔画或坐标超限。");return u.data}function Hs(l,u){if(di(u.width,u.height),![l.x,l.y,l.angle,l.width,l.height].every(Number.isFinite)||l.width<=0||l.height<=0)throw new Error("图层位置、旋转或缩放无效。");const b=_r(l,u);if(![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.x<0||b.y<0||b.width<=0||b.height<=0)throw new Error("图层裁剪范围无效。");const w=b.width/l.width,_=b.height/l.height;if(![w,_].every(C=>Number.isFinite(C)&&C>0))throw new Error("图层缩放超出有效范围。");return{crop:b,scaleX:w,scaleY:_}}function vs(l,u,b){const{crop:w,scaleX:_,scaleY:C}=Hs(l,u);if(![b.x,b.y].every(Number.isFinite))throw new Error("画笔坐标无效。");const T=l.angle%360*Math.PI/180,s=b.x-l.x,v=b.y-l.y,A={x:w.x+(s*Math.cos(T)+v*Math.sin(T))*_,y:w.y+(-s*Math.sin(T)+v*Math.cos(T))*C};if(![A.x,A.y].every(Number.isFinite))throw new Error("画笔坐标超出有效范围。");return A}function mc(l,u,b){const{scaleX:w,scaleY:_}=Hs(l,u);if(!Number.isFinite(b)||b<=0)throw new Error("画笔直径无效。");const C=b*w,T=b*_;if(![C,T].every(s=>Number.isFinite(s)&&s>0))throw new Error("画笔直径超出有效范围。");return{sizeX:C,sizeY:T}}const Us={id:Wn().min(1).max(200),name:Wn().max(200).default("图片"),x:St().min(-1e5).max(1e5),y:St().min(-1e5).max(1e5),width:St().positive().max(8192),height:St().positive().max(8192),angle:St().min(-36e3).max(36e3),opacity:St().min(0).max(1),visible:cs().default(!0),locked:cs().default(!1)},Ws=ci({kind:Vr("image"),url:Wn().min(1)}),hc=ci({...Us,kind:Vr("image").optional(),asset:Ws,crop:Eo().optional().transform(ia),effects:Eo().optional().transform(qs)}),gc=ci({...Us,kind:Vr("paint"),paint:Eo().transform(Bs)}),bc=ci({version:ds([Vr(1),Vr(2)]),width:St().int().min(1).max(8192),height:St().int().min(1).max(8192),background:ds([Vr("transparent"),Wn().regex(/^#[a-f\d]{6}$/i)]),layers:si(jd("kind",[gc,hc])).max(100),linkedSources:si(Wn().min(1).max(8196)).max(512).optional()});function xc(l,u){const b=l??{version:1,width:1920,height:1080,background:"transparent",layers:[]};if(JSON.stringify(b).length>2*1024*1024)throw new Error("编辑稿描述超过 2 MiB，请减少笔画、图层或资产元数据。");const _=bc.safeParse(b);if(!_.success)throw new Error("编辑稿版本、图层或画布数据无效。");const C=_.data;di(C.width,C.height);const T=new Set;for(const s of C.layers){if(T.has(s.id))throw new Error("图层 ID 重复。");if(T.add(s.id),di(s.width,s.height),s.kind==="paint"){if(s.crop!==void 0||s.asset!==void 0||s.effects!==void 0)throw new Error("涂鸦图层不能包含图片裁剪或图片资产。");if(s.paint.strokes.some(v=>["blur","mosaic","restoreEffects"].includes(v.tool)))throw new Error("涂鸦图层只支持画笔、擦除和恢复。")}else{if(s.paint!==void 0)throw new Error("图片图层不能包含涂鸦图层数据。");if(s.asset=Ws.parse(u(s.asset)),s.effects?.some(v=>v.tool==="paint"))throw new Error("图片涂色请使用独立涂鸦图层。")}}return C.layers.some(s=>s.kind==="paint"||!!s.effects?.length)&&(C.version=2),C.linkedSources&&(C.linkedSources=[...new Set(C.linkedSources)]),C}function ks(l,u,b){if(l.layers.length>=100)throw new Error("最多添加 100 个图层。");const w=l.layers.filter(s=>s.kind==="paint").length+1,_={kind:"paint",id:u,name:`涂鸦 ${w}`,x:0,y:0,width:l.width,height:l.height,angle:0,opacity:1,visible:!0,locked:!1,paint:{width:l.width,height:l.height,strokes:[]}},C=[...l.layers],T=b===null?C.length:C.findIndex(s=>s.id===b)+1;return C.splice(Math.max(0,T),0,_),{...l,version:2,layers:C}}function yc(l,u,b){const w=l.layers.find(C=>C.id===u);if(!w||w.locked||!w.visible)throw new Error("所选图层已变化、锁定或隐藏，未应用笔画。");if(w.kind!=="paint"&&b.tool==="paint")throw new Error("请使用独立涂鸦图层绘制。");if(w.kind==="paint"&&["blur","mosaic","restoreEffects"].includes(b.tool))throw new Error("请先选择图片图层。");const _=l.layers.map(C=>C.id!==u?C:C.kind==="paint"?{...C,paint:{...C.paint,strokes:[...C.paint.strokes,b]}}:{...C,effects:[...C.effects??[],b]});return{...l,version:2,layers:_}}function wc(l,u){const b=l.layers.find(w=>w.id===u);if(!b||b.locked||!b.visible)throw new Error("当前图层不可编辑。");return{...l,layers:l.layers.map(w=>w.id!==u?w:w.kind==="paint"?{...w,paint:{...w.paint,strokes:[]}}:{...w,effects:[]})}}const vc=32e6,kc=8e6,Cc=2,Gi=64;function Mn(l,u){const b=document.createElement("canvas");b.width=l,b.height=u;const w=b.getContext("2d",{willReadFrequently:!0});if(!w)throw b.width=b.height=0,new Error("当前浏览器不支持画笔所需的 Canvas 2D。");return{canvas:b,context:w}}function Vt(l){l&&(l.canvas.width=l.canvas.height=0)}function Cs(l){Vt(l.base),Vt(l.output),Vt(l.content),Vt(l.removed);for(const u of l.variants.values())Vt(u);l.variants.clear(),l.signatures.length=0}function _c(l){const u=Mn(l.width,l.height);return u.context.drawImage(l,0,0),u}function Ec(l,u,b){let w=1/0,_=1/0,C=-1/0,T=-1/0;for(const oe of l.points)w=Math.min(w,oe.x),_=Math.min(_,oe.y),C=Math.max(C,oe.x),T=Math.max(T,oe.y);const s=Math.max(0,Math.floor(w-l.sizeX/2-1)),v=Math.max(0,Math.floor(_-l.sizeY/2-1)),A=Math.min(u,Math.ceil(C+l.sizeX/2+1)),D=Math.min(b,Math.ceil(T+l.sizeY/2+1));if(!(A<=s||D<=v||l.opacity===0))return{x:s,y:v,width:A-s,height:D-v}}function _s(l,u,b){const w=u.points[0];if(!w)return;const _=u.sizeX/2,C=u.sizeY/2;if(l.beginPath(),u.points.length===1){l.ellipse(w.x/_,w.y/C,b,b,0,0,Math.PI*2),l.fill();return}l.moveTo(w.x/_,w.y/C);for(let T=1;T<u.points.length;T++){const s=u.points[T];s&&l.lineTo(s.x/_,s.y/C)}l.lineWidth=b*2,l.lineCap="round",l.lineJoin="round",l.stroke(),l.beginPath(),l.arc(w.x/_,w.y/C,b,0,Math.PI*2),l.fill()}function Sc(l,u,b){const w=u.surface.context;w.fillStyle="#010203",w.fillStyle=b;const _=w.fillStyle;if(w.fillStyle="#040506",w.fillStyle=b,_!==w.fillStyle)throw new Error("画笔颜色无效，请使用合法的 CSS 颜色。");w.globalCompositeOperation="source-in",w.fillRect(0,0,u.width,u.height),w.globalCompositeOperation="source-over",l.context.drawImage(u.surface.canvas,u.x,u.y)}function $c(l,u,b){if(!l.removed&&b)return;l.removed??=Mn(l.width,l.height);const w=l.removed.context;w.globalCompositeOperation=b?"destination-out":"source-over",w.drawImage(u.surface.canvas,u.x,u.y),w.globalCompositeOperation="source-over"}function jc(l,u){if(!l.base)return;l.content??=Mn(l.width,l.height);const b=l.content.context.getImageData(u.x,u.y,u.width,u.height),w=l.base.context.getImageData(u.x,u.y,u.width,u.height),_=u.surface.context.getImageData(0,0,u.width,u.height);for(let C=0;C<b.data.length;C+=4){const T=(_.data[C+3]??0)/255;if(T===0)continue;const s=b.data[C+3]??0,v=w.data[C+3]??0,A=Math.min(v,s*(1-T)+v*T);for(let D=0;D<3;D++){const oe=C+D;b.data[oe]=A>0?((b.data[oe]??0)*s*(1-T)+(w.data[oe]??0)*v*T)/A:0}b.data[C+3]=A}l.content.context.putImageData(b,u.x,u.y)}function Mc(l,u){const b=Mn(l.canvas.width,l.canvas.height);try{if(u>0&&!("filter"in b.context))throw new Error("当前浏览器不支持局部模糊，请更换支持 Canvas 滤镜的浏览器。");b.context.filter=u>0?`blur(${u}px)`:"none",b.context.drawImage(l.canvas,0,0),b.context.filter="none";const w=l.context.getImageData(0,0,l.canvas.width,l.canvas.height),_=b.context.getImageData(0,0,l.canvas.width,l.canvas.height);for(let C=0;C<_.data.length;C+=4)_.data[C+3]===0&&(_.data[C]=w.data[C]??0,_.data[C+1]=w.data[C+1]??0,_.data[C+2]=w.data[C+2]??0),_.data[C+3]=w.data[C+3]??0;return b.context.putImageData(_,0,0),b}catch(w){throw Vt(b),w}}function Nc(l,u){const{width:b,height:w}=l.canvas,_=Mn(b,w);try{const C=l.context.getImageData(0,0,b,w),T=_.context.createImageData(b,w);for(let s=0;s<w;s+=u)for(let v=0;v<b;v+=u){const A=Math.min(b,v+u),D=Math.min(w,s+u);let oe=0,le=0,re=0,B=0;for(let G=s;G<D;G++)for(let M=v;M<A;M++){const I=(G*b+M)*4,X=C.data[I+3]??0;B+=X,oe+=(C.data[I]??0)*X,le+=(C.data[I+1]??0)*X,re+=(C.data[I+2]??0)*X}for(let G=s;G<D;G++)for(let M=v;M<A;M++){const I=(G*b+M)*4;T.data[I]=B>0?oe/B:0,T.data[I+1]=B>0?le/B:0,T.data[I+2]=B>0?re/B:0,T.data[I+3]=C.data[I+3]??0}}return _.context.putImageData(T,0,0),_}catch(C){throw Vt(_),C}}function zc(l,u){if(!l.base)throw new Error("图层缺少原始像素。");if(u.tool==="restoreEffects")return l.base;const b=l.paint?l.content:l.base;if(!b)throw new Error("图层缺少可见像素。");const w=u.tool==="blur"?`blur:${u.strength}`:`mosaic:${u.blockSize}`,_=l.variants.get(w);if(_)return l.variants.delete(w),l.variants.set(w,_),_;const C=l.width*l.height;for(;l.variants.size>0&&(l.variants.size>=Cc||(l.variants.size+1)*C>kc);){const s=l.variants.entries().next().value;if(!s)break;l.variants.delete(s[0]),Vt(s[1])}const T=u.tool==="blur"?Mc(b,u.strength):Nc(b,u.blockSize);return l.variants.set(w,T),T}function Ic(l,u,b){if(!l.base)return;const w=zc(l,u);l.content??=_c(l.base.canvas);const _=l.content.context.getImageData(b.x,b.y,b.width,b.height),C=w.context.getImageData(b.x,b.y,b.width,b.height),T=b.surface.context.getImageData(0,0,b.width,b.height);for(let s=0;s<_.data.length;s+=4){const v=(T.data[s+3]??0)/255;if(!(v===0||_.data[s+3]===0))for(let A=0;A<3;A++){const D=s+A,oe=_.data[D]??0;_.data[D]=oe+((C.data[D]??0)-oe)*v}}l.content.context.putImageData(_,b.x,b.y)}function Pc(){const l=new Map;let u=0,b,w=!1;function _(v){const A=l.get(v);A&&(l.delete(v),u-=A.width*A.height,Cs(A),Vt(b),b=void 0)}function C(v,A,D){const oe=v.clip;if(oe&&(oe.x+oe.width>A||oe.y+oe.height>D))throw new Error("笔画裁剪范围超出原图尺寸。");const le=Ec(v,A,D);if(!le)return;b?(b.canvas.width!==le.width||b.canvas.height!==le.height)&&(b.canvas.width=le.width,b.canvas.height=le.height):b=Mn(le.width,le.height);const re=b.context;if(re.setTransform(1,0,0,1,0,0),re.globalCompositeOperation="source-over",re.globalAlpha=1,re.fillStyle="#000",re.fillRect(0,0,le.width,le.height),re.setTransform(v.sizeX/2,0,0,v.sizeY/2,-le.x,-le.y),v.hardness===1)re.fillStyle=re.strokeStyle="#fff",_s(re,v,1);else for(let G=1;G<=Gi;G++){const M=Math.round(G/Gi*255),I=Math.max(1e-6,1-(1-v.hardness)*G/Gi);re.fillStyle=re.strokeStyle=`rgb(${M},${M},${M})`,_s(re,v,I)}re.setTransform(1,0,0,1,0,0);const B=re.getImageData(0,0,le.width,le.height);for(let G=0;G<B.data.length;G+=4){const M=B.data[G]??0;B.data[G]=B.data[G+1]=B.data[G+2]=255;const I=le.x+G/4%le.width,X=le.y+Math.floor(G/4/le.width),ue=oe&&(I<oe.x||X<oe.y||I>=oe.x+oe.width||X>=oe.y+oe.height);B.data[G+3]=ue?0:Math.round(M*v.opacity)}return re.putImageData(B,0,0),{...le,surface:b}}function T(v,A,D){for(let re=D;re<A.length;re++){const B=A[re];if(!B)continue;const G=C(B,v.width,v.height);if(G){if(v.paint){for(const M of v.variants.values())Vt(M);v.variants.clear()}B.tool==="paint"?(v.base??=Mn(v.width,v.height),v.content??=Mn(v.width,v.height),Sc(v.base,G,B.color),v.content.context.drawImage(G.surface.canvas,G.x,G.y)):v.paint&&B.tool==="erase"?v.content&&(v.content.context.globalCompositeOperation="destination-out",v.content.context.drawImage(G.surface.canvas,G.x,G.y),v.content.context.globalCompositeOperation="source-over"):v.paint&&B.tool==="restore"?jc(v,G):B.tool==="erase"||B.tool==="restore"?$c(v,G,B.tool==="restore"):Ic(v,B,G)}}const oe=v.output.context;oe.clearRect(0,0,v.output.canvas.width,v.output.canvas.height);const le=v.paint?v.content:v.content??v.base;le&&oe.drawImage(le.canvas,0,0),!v.paint&&v.removed&&(oe.globalCompositeOperation="destination-out",oe.drawImage(v.removed.canvas,0,0),oe.globalCompositeOperation="source-over")}function s(v,A){if(w)throw new Error("画笔渲染器已释放，不能继续使用。");const D=v.paint===void 0?void 0:Bs(v.paint),oe=qs(v.effects);if(D&&oe&&oe.length>0)throw new Error("涂鸦笔画应保存在 paint 中，不能同时包含图片特效笔画。");const le=D?D.strokes:oe??[];if(!D&&!A)throw new Error("图片笔画渲染缺少原始像素来源。");if(!D&&le.length===0){if(_(v.id),!A)throw new Error("图片笔画渲染缺少原始像素来源。");return A}if(!D&&le.some(L=>L.tool==="paint"))throw new Error("图片上不能直接写入涂鸦，请创建独立涂鸦图层。");const re=D?D.width:A?.width??0,B=D?D.height:A?.height??0;if(di(re,B),!Number.isInteger(re)||!Number.isInteger(B))throw new Error("原图尺寸须为整数像素。");const G=D?null:A,M=le.map(L=>JSON.stringify(L));let I=l.get(v.id);const X=I!==void 0&&I.source===G&&I.paint===(D!==void 0)&&I.width===re&&I.height===B,ue=X&&I!==void 0&&I.signatures.length<=M.length&&I.signatures.every((L,P)=>L===M[P]);if(!ue&&X&&!D&&I)Vt(I.content),Vt(I.removed),I.content=void 0,I.removed=void 0,I.signatures=[];else if(!ue){const L=re*B,P=I?I.width*I.height:0;if(u-P+L>vc)throw new Error("同时编辑的图层总像素超过3200万，请先减少编辑图层或降低图层尺寸。");_(v.id);const j=D?void 0:Mn(re,B);try{j&&A&&j.context.drawImage(A,0,0),I={source:G,paint:D!==void 0,width:re,height:B,base:j,output:Mn(re,B),variants:new Map,signatures:[]},l.set(v.id,I),u+=L}catch(N){throw Vt(j),Vt(b),b=void 0,N}}if(!I)throw new Error("无法创建图层笔画缓存。");if(l.delete(v.id),l.set(v.id,I),I.signatures.length===M.length&&ue)return I.output.canvas;try{return T(I,le,I.signatures.length),I.signatures=M,I.output.canvas}catch(L){throw _(v.id),L}}return{render:s,invalidate:_,dispose(){for(const v of l.values())Cs(v);l.clear(),u=0,Vt(b),b=void 0,w=!0}}}const Lc="_toolbar_1foyw_1",Tc="_properties_1foyw_2",Rc="_modes_1foyw_11",Oc="_actions_1foyw_12",Ac="_button_1foyw_24",Fc="_heading_1foyw_77",Dc="_currentTool_1foyw_92",qc="_target_1foyw_97",Bc="_field_1foyw_113",Hc="_colorField_1foyw_122",Uc="_number_1foyw_130",Wc="_range_1foyw_146",Xc="_hints_1foyw_178",Jc="_privacy_1foyw_193",Tt={toolbar:Lc,properties:Tc,modes:Rc,actions:Oc,button:Ac,heading:Fc,currentTool:Dc,target:qc,field:Bc,colorField:Hc,number:Uc,range:Wc,hints:Xc,privacy:Jc},Zi={select:"选择",paint:"画笔",erase:"橡皮擦",restore:"恢复像素",blur:"模糊",mosaic:"马赛克",restoreEffects:"恢复遮挡"},Yc=["select","paint","erase","blur","mosaic"];function vr(l,u,b,w){const _=typeof l=="string"&&l.trim()===""?NaN:Number(l);return Math.min(b,Math.max(u,Math.round(Number.isFinite(_)?_:w)))}function Es(l){return{size:vr(l.size,1,512,wr.size),color:l.color,opacity:vr(l.opacity*100,0,100,wr.opacity*100)/100,hardness:vr(l.hardness*100,0,100,wr.hardness*100)/100,strength:vr(l.strength,1,64,wr.strength),blockSize:vr(l.blockSize,2,128,wr.blockSize)}}function Co({label:l,value:u,min:b,max:w,disabled:_,onCommit:C}){const T=lt.useId(),[s,v]=lt.useState(null);return W.jsxs("div",{className:Tt.field,children:[W.jsx("label",{htmlFor:T,children:l}),W.jsx("input",{id:T,className:Tt.number,type:"number",inputMode:"numeric",min:b,max:w,step:1,disabled:_,value:s??u,onChange:A=>v(A.currentTarget.value),onBlur:A=>{!_&&s!==null&&C(vr(A.currentTarget.value,b,w,u)),v(null)},onKeyDown:A=>{A.key==="Enter"&&!A.nativeEvent.isComposing&&(A.preventDefault(),A.currentTarget.blur())}}),W.jsx("input",{className:Tt.range,type:"range","aria-label":`${l}滑块`,min:b,max:w,step:1,value:u,disabled:_,onChange:A=>{v(null),C(vr(A.currentTarget.value,b,w,u))}})]})}function Vc({state:l,ports:u,properties:b}){const{tool:w,enabled:_,canImage:C,canPaint:T,targetKind:s}=l,v=Es(l.settings),A=w==="erase"||w==="restore",D=w==="blur"||w==="mosaic"||w==="restoreEffects",oe=T||C,le=!_||A&&!oe||D&&!C,re=lt.useId(),B=M=>{le||u.onSettings(Es({...v,...M}))},G=(M,I=Zi[M],X=w===M)=>{const ue=!_||(M==="erase"||M==="restore")&&!oe||(M==="blur"||M==="mosaic"||M==="restoreEffects")&&!C;return W.jsx("button",{type:"button",className:Tt.button,"aria-pressed":X,disabled:ue,onClick:()=>{ue||u.onTool(M)},children:I},M)};return W.jsxs(W.Fragment,{children:[W.jsxs("div",{className:Tt.toolbar,role:"group","aria-label":"画布绘制工具",children:[Yc.map(M=>G(M,Zi[M],w===M||M==="erase"&&w==="restore")),w==="select"&&W.jsx("button",{type:"button",className:Tt.button,disabled:!_,onClick:()=>{_&&u.onNewPaint()},children:"新建涂鸦"})]}),js.createPortal(w==="select"?null:W.jsxs("section",{className:Tt.properties,"aria-label":"画布画笔参数",onKeyDown:M=>{M.target instanceof HTMLInputElement&&!M.ctrlKey&&!M.metaKey&&!M.altKey&&M.stopPropagation()},children:[W.jsxs("div",{className:Tt.heading,children:[W.jsx("h3",{children:"当前工具"}),W.jsx("span",{className:Tt.currentTool,children:Zi[w]})]}),W.jsxs("p",{className:Tt.target,role:"status",children:["当前目标：",l.targetLabel||"未选择图层",!_&&"（暂不可编辑）"]}),A&&W.jsxs("div",{className:Tt.modes,role:"group","aria-label":"橡皮擦模式",children:[G("erase","擦除"),G("restore","恢复像素")]}),D&&W.jsxs("div",{className:Tt.modes,role:"group","aria-label":"图片效果模式",children:[G("blur"),G("mosaic"),G("restoreEffects","恢复遮挡")]}),W.jsx(Co,{label:"笔刷大小 · 画布 px",value:v.size,min:1,max:512,disabled:le,onCommit:M=>B({size:M})}),w==="paint"&&W.jsxs("div",{className:Tt.colorField,children:[W.jsx("label",{htmlFor:re,children:"画笔颜色"}),W.jsx("input",{id:re,type:"color",value:/^#[\da-f]{6}$/i.test(v.color)?v.color:wr.color,disabled:le,onChange:M=>B({color:M.currentTarget.value})})]}),(w==="paint"||A)&&W.jsx(Co,{label:"不透明度 · %",value:Math.round(v.opacity*100),min:0,max:100,disabled:le,onCommit:M=>B({opacity:M/100})}),w!=="mosaic"&&W.jsx(Co,{label:"笔刷硬度 · %",value:Math.round(v.hardness*100),min:0,max:100,disabled:le,onCommit:M=>B({hardness:M/100})}),w==="blur"&&W.jsx(Co,{label:"模糊强度 · 原图 px",value:v.strength,min:1,max:64,disabled:le,onCommit:M=>B({strength:M})}),w==="mosaic"&&W.jsx(Co,{label:"马赛克块大小 · 原图 px",value:v.blockSize,min:2,max:128,disabled:le,onCommit:M=>B({blockSize:M})}),W.jsxs("div",{className:Tt.actions,children:[W.jsx("button",{type:"button",className:Tt.button,disabled:!_,onClick:()=>{_&&u.onNewPaint()},children:"新建涂鸦"}),W.jsx("button",{type:"button",className:Tt.button,disabled:!_||!l.canClear,onClick:()=>{_&&l.canClear&&u.onClear()},children:s==="paint"?"清空当前涂鸦":s==="image"?"恢复整张图片效果":"清空当前目标"})]}),W.jsxs("footer",{className:Tt.hints,children:[W.jsx("p",{children:"在合成画布上直接绘制。涂鸦是独立图层；橡皮擦与恢复像素作用于所选图片或涂鸦。"}),W.jsx("p",{children:"模糊、马赛克与恢复遮挡只作用于所选图片，保留原图，不改变独立涂鸦。"}),W.jsx("p",{className:Tt.privacy,children:"隐私提醒：模糊和马赛克不是安全的敏感信息脱敏方式。"}),W.jsx("p",{"aria-label":"键盘快捷键",children:"V 选择 · B 画笔 · E 橡皮擦 · [ / ] 大小 · 空格 平移"})]})]}),b)]})}function Kc(l,u,b){l.dataset.composerBrush="",u.dataset.composerBrush="";const w=$s.createRoot(l);let _=!1;return{update(C){_||w.render(W.jsx(Vc,{state:C,ports:b,properties:u}))},dispose(){_||(_=!0,w.unmount(),delete l.dataset.composerBrush,delete u.dataset.composerBrush)}}}const Gc="_surface_qr8hp_1",Zc="_cursor_qr8hp_10",Ss={surface:Gc,cursor:Zc};function Qc(l){const u=document.createElement("canvas");u.className=Ss.surface,u.dataset.brushSurface="",u.setAttribute("aria-label","涂抹画布"),u.tabIndex=0;const b=document.createElement("span");b.className=Ss.cursor,b.setAttribute("aria-hidden","true"),b.hidden=!0,l.surface.append(u,b);let w="select",_={...wr},C=null,T=0,s=!1,v=null,A=!1;const D=new AbortController,oe=Kc(l.toolbar,l.properties,{onTool:j=>{X(),w=j,B()},onSettings:j=>{_=j,B()},onClear:()=>{X(),l.canEdit()&&l.onClear()},onNewPaint:()=>{X(),l.canEdit()&&(l.onNewPaint(),w="paint",B())}});function le(j){return JSON.stringify([j.layer.id,j.layer.x,j.layer.y,j.layer.width,j.layer.height,j.layer.angle,j.layer.crop,j.source])}function re(j){const N=j.target?.layer;return j.enabled&&(!N||!N.locked&&N.visible)}function B(){if(A)return;const j=l.getState(),N=j.target;C&&(!j.enabled||N?.layer.locked||N?.layer.visible===!1||C.id!==null&&(!N||le(N)!==C.signature))&&X(),j.enabled||(s=!1,v=null);const z=j.enabled&&(w!=="select"||s);u.style.pointerEvents=z?"auto":"none",u.tabIndex=z?0:-1,u.style.cursor=s?v?"grabbing":"grab":"crosshair",z||(b.hidden=!0),l.onMode(z),oe.update({tool:w,settings:_,enabled:j.enabled,targetLabel:w==="paint"&&N?.layer.kind!=="paint"?"新涂鸦（落笔创建，不修改图片）":N?.layer.name??"请先选择图片或使用画笔",targetKind:N?.layer.kind,canImage:re(j)&&N?.layer.kind==="image",canPaint:re(j)&&!!N,canClear:re(j)&&!!N})}function G(j){const N=u.getBoundingClientRect(),z=l.getState();return{x:((j.clientX-N.left)*u.width/N.width-z.offsetX)/z.scale,y:((j.clientY-N.top)*u.height/N.height-z.offsetY)/z.scale}}function M(j){const N=l.surface.getBoundingClientRect(),z=l.getState(),Y=_.size*z.scale*N.width/Math.max(1,u.width);b.style.width=b.style.height=`${Y}px`,b.style.left=`${j.clientX-N.left}px`,b.style.top=`${j.clientY-N.top}px`,b.hidden=s||w==="select"||!z.enabled}function I(){u.getContext("2d")?.clearRect(0,0,u.width,u.height)}function X(){T&&cancelAnimationFrame(T),T=0;const j=C;C=null,j?.id&&l.onPreview(j.id,null),j&&u.hasPointerCapture(j.pointerId)&&u.releasePointerCapture(j.pointerId),v=null,I()}function ue(){T=0;const j=C;if(!(!j||!l.canEdit()))try{if(j.id!==null)l.onPreview(j.id,j.stroke);else{I();const N=u.getContext("2d"),z=j.stroke.points[0];if(!N||!z)return;const Y=l.getState();N.save(),N.setTransform(Y.scale,0,0,Y.scale,Y.offsetX,Y.offsetY),N.strokeStyle=N.fillStyle=j.stroke.color,N.globalAlpha=j.stroke.opacity,N.lineWidth=_.size,N.lineCap=N.lineJoin="round",N.beginPath(),N.moveTo(z.x,z.y);for(const ke of j.stroke.points)N.lineTo(ke.x,ke.y);N.stroke(),j.stroke.points.length===1&&(N.beginPath(),N.arc(z.x,z.y,_.size/2,0,Math.PI*2),N.fill()),N.restore()}}catch(N){X(),l.onError(N)}}function L(){T||(T=requestAnimationFrame(ue))}function P(j){const N=C;if(!N)return;const z=vs(N.target.layer,N.target.source,G(j)),Y=N.stroke.points.at(-1);if(!(Y&&Math.hypot((z.x-Y.x)/N.stroke.sizeX,(z.y-Y.y)/N.stroke.sizeY)<.025)){if(N.stroke.points.length>=12e3){X(),l.onError(new Error("单笔过长，请分成多笔绘制。"));return}N.stroke.points.push({x:Math.round(z.x*100)/100,y:Math.round(z.y*100)/100})}}return u.addEventListener("pointerdown",j=>{if(j.button!==0||C||v||!l.canEdit())return;if(j.preventDefault(),j.stopPropagation(),u.focus({preventScroll:!0}),s){v={id:j.pointerId,x:j.clientX,y:j.clientY},u.setPointerCapture(j.pointerId),B();return}const N=l.getState();if(!re(N)||w==="select")return;let z=N.target;const Y=w==="paint"&&z?.layer.kind!=="paint";if(Y&&(z={layer:{id:"",kind:"paint",name:"新涂鸦",x:0,y:0,width:N.width,height:N.height,angle:0,locked:!1,visible:!0},source:{width:N.width,height:N.height}}),!z||(w==="blur"||w==="mosaic"||w==="restoreEffects")&&z.layer.kind!=="image")return;const ke=vs(z.layer,z.source,G(j)),$e=_r(z.layer,z.source);if(ke.x<$e.x||ke.y<$e.y||ke.x>$e.x+$e.width||ke.y>$e.y+$e.height)return;const Ie=mc(z.layer,z.source,_.size),Be={tool:w,points:[],...Ie,color:_.color,opacity:["blur","mosaic","restoreEffects"].includes(w)?1:_.opacity,hardness:w==="mosaic"?1:_.hardness,strength:_.strength,blockSize:_.blockSize,clip:{...$e}};if(Math.max(Be.sizeX,Be.sizeY)>16384){l.onError(new Error("当前图层缩放过小，请减小笔刷或放大图层后绘制。"));return}C={pointerId:j.pointerId,id:Y?null:z.layer.id,target:z,stroke:Be,signature:le(z)},P(j),u.setPointerCapture(j.pointerId),L()},{signal:D.signal}),u.addEventListener("pointermove",j=>{if(M(j),v?.id===j.pointerId){if(!l.canEdit()){X(),B();return}const N=u.getBoundingClientRect();l.onPan((j.clientX-v.x)*u.width/N.width,(j.clientY-v.y)*u.height/N.height),v.x=j.clientX,v.y=j.clientY;return}if(C?.pointerId===j.pointerId){if(!l.canEdit()){X(),B();return}for(const N of j.getCoalescedEvents?.()??[j])P(N);P(j),L()}},{signal:D.signal}),u.addEventListener("pointerup",j=>{if(v?.id===j.pointerId){v=null,u.releasePointerCapture(j.pointerId),B();return}const N=C;if(!(!N||N.pointerId!==j.pointerId)){if(!l.canEdit()){X(),B();return}if(P(j),C===N){C=null,T&&cancelAnimationFrame(T),T=0,I(),u.hasPointerCapture(j.pointerId)&&u.releasePointerCapture(j.pointerId);try{!l.onStroke(N.id,N.stroke)&&N.id&&l.onPreview(N.id,null)}catch(z){N.id&&l.onPreview(N.id,null),l.onError(z)}B()}}},{signal:D.signal}),u.addEventListener("pointercancel",()=>{X(),B()},{signal:D.signal}),u.addEventListener("lostpointercapture",()=>{(C||v)&&(X(),B())},{signal:D.signal}),u.addEventListener("pointerleave",()=>{b.hidden=!0},{signal:D.signal}),l.dialog.addEventListener("keydown",j=>{if(j.isComposing||j.target instanceof HTMLElement&&j.target.closest('input,textarea,select,[contenteditable="true"],dialog[data-image-crop]'))return;if(j.ctrlKey||j.metaKey||j.altKey){C&&X();return}if(j.code==="Space"){if(j.target instanceof HTMLElement&&j.target.closest('button,a,summary,[role="button"]')||(j.preventDefault(),s))return;s=!0,X(),B();return}const N={v:"select",b:"paint",e:"erase"};if(j.key.toLowerCase()in N){const z=N[j.key.toLowerCase()];z&&(X(),w=z,B())}else j.key==="["||j.key==="]"?(j.preventDefault(),_={..._,size:Math.max(1,Math.min(512,_.size+(j.key==="["?-4:4)))},B()):j.key==="Escape"&&(C||w!=="select")&&(j.preventDefault(),X(),w="select",B())},{signal:D.signal,capture:!0}),l.dialog.addEventListener("keyup",j=>{j.code==="Space"&&(s=!1,v=null,B())},{signal:D.signal,capture:!0}),window.addEventListener("blur",()=>{s=!1,X(),B()},{signal:D.signal}),{update:B,resize(j,N){u.width===j&&u.height===N||(X(),u.width=j,u.height=N,B())},cancel:X,dispose(){A||(X(),A=!0,D.abort(),oe.dispose(),u.width=u.height=0,u.remove(),b.remove())}}}function ep(l,u,b,w){const{window:_,document:C,addEventListener:T,setTimeout:s,clearTimeout:v,setInterval:A,clearInterval:D,requestAnimationFrame:oe,cancelAnimationFrame:le,ResizeObserver:re,MutationObserver:B,IntersectionObserver:G,URL:M}=l;_.H3Auth=u,_.H3Notify=b;const I=w.mediaFetch;return(()=>{const X=new M("/",location.href),ue=8192,L=32e6,P=100,j=512,N=64e6,z=64*1024*1024;let Y;const ke=ne=>JSON.parse(JSON.stringify(ne)),$e=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),ne=>ne.toString(16).padStart(2,"0")).join(""),Ie=(ne,c)=>Number.isFinite(ne)&&Number.isFinite(c)&&ne>=1&&c>=1&&ne<=ue&&c<=ue&&ne*c<=L;function Be(ne,c){if(!Ie(ne,c))throw new Error("图片或画布超出限制：单边 1–8192 像素，总像素不超过 3200 万。")}function Me(ne){if(typeof ne!="string"||!ne||ne.length>8192)throw new Error("图片地址无效。");const c=new M(ne,location.href),ae=c.pathname==="/api/file"||/^\/api\/upload\/[^/]+$/.test(c.pathname)||/^\/api\/artifact\/[^/]+\/[^/]+$/.test(c.pathname);if(!/^https?:$/.test(c.protocol)||c.origin!==location.origin||c.username||c.password||!ae||c.hash)throw new Error("仅支持本站受控媒体地址（/api/file、/api/upload/文件名、/api/artifact/项目/文件名）；不接受其他路径、外站、data 或 blob 地址。");if(c.searchParams.sort(),c.href.length>8192)throw new Error("图片地址过长。");return c.href}function Ue(ne){if(!ne||ne.kind!=="image")throw new Error("只能添加图片资产。");const c=JSON.stringify(ne);if(c.length>262144)throw new Error("图片资产描述过大，请勿在编辑稿中嵌入图片数据。");const ae=JSON.parse(c);return Me(ae.url),ae}function We(ne){const c=ae=>typeof ae=="string"?ae.trim().split(/[\\/]/).filter(Boolean).at(-1):"";return String(c(ne.origin)||c(ne.filename)||ne.name||"图片").slice(0,200)}function ie(ne){const c=[`url:${Me(ne.url)}`];if(typeof ne.ref=="string"&&ne.ref.trim()){if(ne.ref.length>8192)throw new Error("图片资源标识过长。");c.push(`ref:${ne.ref}`)}return c}const R=ne=>xc(ne,Ue);async function O(ne){const c=new Uint8Array(await ne.slice(0,1048576).arrayBuffer()),ae=new DataView(c.buffer),Ee=(ge,ee)=>String.fromCharCode(...c.subarray(ge,ge+ee));let qe,K;if(c.length>=24&&Ee(1,3)==="PNG"&&ae.getUint32(0)===2303741511)qe=ae.getUint32(16),K=ae.getUint32(20);else if(c.length>=10&&/^GIF8[79]a$/.test(Ee(0,6)))qe=ae.getUint16(6,!0),K=ae.getUint16(8,!0);else if(c.length>=26&&Ee(0,2)==="BM")ae.getUint32(14,!0)===12?(qe=ae.getUint16(18,!0),K=ae.getUint16(20,!0)):(qe=ae.getInt32(18,!0),K=Math.abs(ae.getInt32(22,!0)));else if(c.length>=30&&Ee(0,4)==="RIFF"&&Ee(8,4)==="WEBP")for(let ge=12;ge+18<=c.length;){const ee=Ee(ge,4),zt=ae.getUint32(ge+4,!0),ut=ge+8;if(ee==="VP8X"){qe=1+c[ut+4]+(c[ut+5]<<8)+(c[ut+6]<<16),K=1+c[ut+7]+(c[ut+8]<<8)+(c[ut+9]<<16);break}if(ee==="VP8 "&&c[ut+3]===157&&c[ut+4]===1&&c[ut+5]===42){qe=ae.getUint16(ut+6,!0)&16383,K=ae.getUint16(ut+8,!0)&16383;break}if(ee==="VP8L"&&c[ut]===47){qe=1+c[ut+1]+((c[ut+2]&63)<<8),K=1+(c[ut+2]>>6)+(c[ut+3]<<2)+((c[ut+4]&15)<<10);break}ge=ut+zt+zt%2}else if(c[0]===255&&c[1]===216){let ge=2;for(;ge+8<c.length&&c[ge++]===255;){for(;c[ge]===255;)ge++;const ee=c[ge++];if(ee===217||ee===218)break;if(ee===1||ee>=208&&ee<=215)continue;const zt=ae.getUint16(ge);if(zt<2)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(ee)){K=ae.getUint16(ge+3),qe=ae.getUint16(ge+5);break}ge+=zt}}if(qe===void 0||K===void 0)throw new Error("无法安全识别图片尺寸。请使用标准 PNG、JPEG、WebP、GIF 或 BMP 图片（不支持 SVG / AVIF）。");return Be(qe,K),{width:qe,height:K}}async function de(ne){const c=ne.body.getReader(),ae=[];let Ee=0;try{for(;;){const qe=await c.read();if(qe.done)break;if(Ee+=qe.value.byteLength,Ee>z)throw await c.cancel(),new Error("图片文件不得超过 64 MiB。");ae.push(qe.value)}}finally{c.releaseLock()}return new Blob(ae,{type:ne.headers.get("content-type")?.split(";")[0]||""})}function ye(){return Y||(Y=(async()=>{if((!_.fabric||_.fabric.version!=="7.4.0")&&await new Promise((ne,c)=>{const ae=C.createElement("script");ae.src=new M("vendor/fabric.min.js",X).href,ae.onload=ne,ae.onerror=()=>{ae.remove(),c(new Error("本地 Fabric 加载失败，请刷新重试。"))},C.head.append(ae)}),_.fabric?.version!=="7.4.0")throw new Error("需要 Fabric 7.4.0 浏览器构建。")})().catch(ne=>{throw Y=null,ne}),Y)}function V(ne,c,ae){const Ee=C.createElement(ne);return c&&(Ee.className=c),ae!==void 0&&(Ee.textContent=ae),Ee}async function Q({state:ne,sources:c=[],linkedSources:ae=[],upload:Ee,onSave:qe,onExport:K,canEdit:ge=()=>!0}={}){const ee=V("dialog","chouka-composer image-composer-dialog");ee.setAttribute("data-image-composer","");const zt=`composer-${$e()}`;ee.setAttribute("aria-labelledby",zt);const ut=V("div","ic-head"),Nn=V("h2","","图片合成");Nn.id=zt;const un=V("button","ic-button","关闭");un.type="button",un.dataset.composerAction="close";const It=V("button","ic-button","重试载入");It.type="button",It.hidden=!0,ut.append(Nn,V("span","ic-local","浏览器本地合成 · 原图尺寸输出"),It,un);const en=V("div","ic-status");en.setAttribute("role","status"),en.setAttribute("aria-live","polite");const Ut=V("div","ic-error");Ut.setAttribute("role","alert"),Ut.hidden=!0;const Xn=V("div","ic-body"),Mt=V("aside","ic-left"),Wt=V("section","ic-center"),Rt=V("aside","ic-right");Mt.setAttribute("aria-label","图层和图片素材"),Wt.setAttribute("aria-label","合成画布"),Rt.setAttribute("aria-label","图片与画布属性");const g=V("div","ic-toolbar"),Ve=V("div","ic-viewport"),tn=V("canvas");tn.setAttribute("aria-label","图片合成编辑画布"),Ve.append(tn),Wt.append(g,Ve,V("p","ic-hint","拖动图片移动，拖动角点缩放。方向键移动 1px，Shift + 方向键移动 10px。"));const pe=V("div","ic-footer"),Er=V("span","ic-hint","编辑稿保留图片引用与笔画；分享时请导出合成 PNG。");Xn.append(Mt,Wt,Rt),pe.append(Er),ee.append(ut,en,Ut,Xn,pe),C.body.append(ee);const ar=C.activeElement;let J,Pe,nt=null,ft=!1,nn=!1,Jn=!1,zn="",Pt=[],In=-1,we,sn,Sr,Ze,Gr=0,Ct=1,Ft=0,wn=0,Pn=!0,vn=null,_t=!1;const $o=new AbortController,Re=new Map,fn=new Map,be=new Set,Ln=Pc(),$r=V("div"),Dt=V("div");g.prepend($r),Rt.prepend(Dt);const Qe=()=>_.fabric,rt=()=>{try{return ge()===!0}catch(E){return mt(E),!1}};function mt(E){Ut.textContent=E?.message||String(E),Ut.hidden=!1,console.error("[图片合成]",E)}function $t(){Ut.hidden=!0,Ut.textContent=""}function gt(){return nn||ft||!Jn?!1:rt()?!0:(en.textContent="只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。",Yn(),!1)}function Kt(E,U,F,fe=""){const xe=V("button",`ic-button ${fe}`,U);xe.type="button",E.append(xe);const Ce={撤销:"undo",重做:"redo",适应窗口:"fit",缩小:"zoom-out",放大:"zoom-in","上传图片（支持多选）":"upload",保存编辑稿:"save","合成 PNG":"export",上移:"raise",下移:"lower",置顶:"front",置底:"back",复制:"duplicate",删除:"delete"}[U];return Ce&&(xe.dataset.composerAction=Ce),xe.addEventListener("click",()=>{if(gt())try{const ve=F();ve?.catch&&ve.catch(mt)}catch(ve){mt(ve)}}),xe}function Tn(E,U,F="number",fe={}){const xe=V("label","ic-field"),Ce=V("span","",U),ve=V("input");return ve.type=F,Object.assign(ve,fe),xe.append(Ce,ve),E.append(xe),ve}function Yn(){if(nn)return;const E=rt(),U=ft||!Jn||!E;for(const xe of ee.querySelectorAll("button,input"))xe.closest("[data-composer-crop],[data-composer-brush]")||xe!==un&&xe!==It&&(xe.disabled=U||xe.dataset.inactive==="1");const F=Lt(),fe=F&&F.kind!=="paint"&&Re.get(Me(F.asset.url));Sr?.update({enabled:!U,selection:F&&fe?{layer:F,bitmap:fe}:null}),Ze?.update(),un.disabled=ft,It.disabled=ft||!E,ee.setAttribute("aria-busy",String(ft)),Pe&&(Pe.skipTargetFind=U,Pe.selection=!1,Pe.upperCanvasEl.style.pointerEvents=U?"none":"",Pe.upperCanvasEl.tabIndex=U?-1:0),E||(en.textContent="只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。")}async function ln(E,U){if(gt()){ft=!0,$t(),en.textContent=E,Yn();try{return await U()}catch(F){nn||mt(F)}finally{ft=!1,nn||(en.textContent=rt()?Ut.hidden?"就绪 · 更改仅在保存编辑稿后持久化":"操作未完成，请检查提示后重试":"只读：当前工具卡已失效。仅可关闭。",Zt())}}}async function Vn(E){const U=Me(E.url);if(Re.has(U))return Re.get(U);const F=await I(U,{credentials:"same-origin",redirect:"error",signal:$o.signal});if(!F.ok)throw new Error(`图片读取失败（HTTP ${F.status}）。`);if(Number(F.headers.get("content-length"))>z)throw new Error("图片文件不得超过 64 MiB。");const fe=await de(F);if(fe.size>z||!/^image\/(png|jpeg|webp|gif|bmp|x-ms-bmp)$/i.test(fe.type))throw new Error("仅支持 PNG、JPEG、WebP、GIF、BMP 图片，单文件最多 64 MiB；不支持 SVG / AVIF。");const xe=await O(fe);if(Gr+xe.width*xe.height>N)throw new Error("已载入图片总像素超过 6400 万，请关闭后使用较小图片重新编辑。");const Ce=await createImageBitmap(fe);try{if(Be(Ce.width,Ce.height),Gr+Ce.width*Ce.height>N)throw new Error("已载入图片总像素超过 6400 万，请关闭后使用较小图片重新编辑。")}catch(ve){throw Ce.close(),ve}if(nn)throw Ce.close(),new Error("合成器已关闭。");return Gr+=Ce.width*Ce.height,Re.set(U,Ce),Ce}function jr(E){const U=E.kind==="paint"?null:Re.get(Me(E.asset.url)),F=Ln.render(E,U);be.add(E.id);const fe=_r(E,F),xe=new(Qe()).FabricImage(F,{originX:"left",originY:"top",left:E.x,top:E.y,angle:E.angle,cropX:fe.x,cropY:fe.y,width:fe.width,height:fe.height,scaleX:E.width/fe.width,scaleY:E.height/fe.height,opacity:E.opacity,visible:E.visible,selectable:!E.locked,evented:!E.locked,lockScalingFlip:!0,objectCaching:!1,cornerColor:"#a0e7cb",borderColor:"#a0e7cb",transparentCorners:!1,cornerSize:12,padding:0});return xe.composerId=E.id,xe.setControlsVisibility({ml:!Ge.checked,mr:!Ge.checked,mt:!Ge.checked,mb:!Ge.checked}),xe}function Kn(E,U,F){const fe=E?Me(E.url):null,xe=V("span","ic-thumbnail"),Ce=fe&&Re.get(fe),ve=F?Ln.render(F,Ce||null):Ce;if(xe.setAttribute("aria-hidden","true"),xe.draggable=!1,ve){const Fe=_r({crop:U},ve),me=V("canvas"),Bt=Math.min(1,220/Fe.width,120/Fe.height);me.draggable=!1,me.width=Math.max(1,Math.round(Fe.width*Bt)),me.height=Math.max(1,Math.round(Fe.height*Bt)),me.getContext("2d").drawImage(ve,Fe.x,Fe.y,Fe.width,Fe.height,0,0,me.width,me.height),xe.append(me)}else{const Fe=V("img");Fe.alt="",Fe.loading="lazy",Fe.decoding="async",Fe.draggable=!1;const me=new M(fe);Fe.src=/^\/api\/(upload|artifact)\//.test(me.pathname)?`/api/thumbnail?url=${encodeURIComponent(me.pathname+me.search)}`:fe,xe.append(Fe)}return xe}function Lt(){return J?.layers.find(E=>E.id===nt)}function mn(){if(!Pe||!J)return;_t=!0,Pe.discardActiveObject();for(const F of Pe.getObjects())Pe.remove(F),F.dispose();fn.clear();for(const F of be)J.layers.some(fe=>fe.id===F)||(Ln.invalidate(F),be.delete(F));Pe.backgroundColor=J.background==="transparent"?"":J.background;for(const F of J.layers){const fe=jr(F);Pe.add(fe),fn.set(F.id,fe)}const E=Lt(),U=fn.get(nt);U&&E.visible&&!E.locked&&Pe.setActiveObject(U),_t=!1,hn(),Zt(),Pe.requestRenderAll()}function Ke(){const E=JSON.stringify(J);if(Pt[In]===E){Zt();return}for(Pt.splice(In+1),Pt.push(E);Pt.length>2&&(Pt.length>60||Pt.reduce((U,F)=>U+F.length,0)>8*1024*1024);)Pt.shift();In=Pt.length-1,Zt()}function dt(E){if(!gt()||!J)return;const U=ke(J);try{return E(),J=R(J),mn(),Ke(),$t(),!0}catch(F){J=U,mn(),mt(F)}}function Mr(E){const U=In+E;if(U<0||U>=Pt.length)return;const F=J.linkedSources;J=JSON.parse(Pt[U]),F&&(J.linkedSources=[...new Set([...J.linkedSources||[],...F])]),In=U,Pt[U]=JSON.stringify(J),mn()}function hn(){if(!Pe||!J||nn)return;const E=Math.max(80,Ve.clientWidth-32),U=Math.max(80,Ve.clientHeight-32);Pn&&(Ct=Math.min(E/J.width,U/J.height,1)),Ct=Math.max(.01,Math.min(Ct,2,4096/Math.max(J.width,J.height),Math.sqrt(8e6/(J.width*J.height)))),Pe.setDimensions({width:Math.max(1,Math.round(J.width*Ct)),height:Math.max(1,Math.round(J.height*Ct))}),Pe.setViewportTransform([Ct,0,0,Ct,Ft,wn]),Ze?.resize(Pe.width,Pe.height),Qr.textContent=`${Math.round(Ct*100)}% · ${J.width} × ${J.height} px`}const Zr=Kt(g,"撤销",()=>Mr(-1)),sr=Kt(g,"重做",()=>Mr(1));Kt(g,"适应窗口",()=>{Pn=!0,Ft=wn=0,hn()}),Kt(g,"缩小",()=>{Pn=!1,Ct/=1.25,hn()}),Kt(g,"放大",()=>{Pn=!1,Ct*=1.25,hn()});const Qr=V("span","ic-zoom");g.append(Qr),Mt.append(V("h3","","图层"),V("p","ic-hint","从上到下为顶层到底层，可拖动排序"));const Rn=V("div","ic-layers");Rn.setAttribute("aria-label","图层列表"),Mt.append(Rn);const jo=V("div","ic-layer-actions");Mt.append(jo);const Mo=[];function gn(E,U){const F=Kt(jo,E,()=>Lt()&&U());return Mo.push(F),F}function On(E){dt(()=>{const U=J.layers.findIndex(fe=>fe.id===nt),[F]=J.layers.splice(U,1);J.layers.splice(Math.max(0,Math.min(E,J.layers.length)),0,F)})}gn("上移",()=>On(J.layers.findIndex(E=>E.id===nt)+1)),gn("下移",()=>On(J.layers.findIndex(E=>E.id===nt)-1)),gn("置顶",()=>On(J.layers.length-1)),gn("置底",()=>On(0)),gn("复制",()=>dt(()=>{if(J.layers.length>=P)throw new Error("最多添加 100 个图层。");const E=ke(Lt());E.id=$e(),E.name=`${E.name} 副本`,E.x+=20,E.y+=20,J.layers.splice(J.layers.findIndex(U=>U.id===nt)+1,0,E),nt=E.id})),gn("删除",()=>dt(()=>{J.layers=J.layers.filter(E=>E.id!==nt),nt=null})),Mt.append(V("h3","","添加图片"));const rn=Kt(Mt,"上传图片（支持多选）",()=>dn.click()),dn=V("input","ic-file");dn.type="file",dn.multiple=!0,dn.accept="image/png,image/jpeg,image/webp,image/gif,image/bmp",dn.hidden=!0,Mt.append(dn),Mt.append(V("p","ic-hint","可拖入文件或粘贴图片。单边 ≤8192px，总像素 ≤3200万，文件 ≤64MiB。"));const on=V("div","ic-sources");Mt.append(on),Rt.append(V("h3","","画布"));const Nr=V("div","ic-field-grid");Rt.append(Nr);const zr=Tn(Nr,"画布宽度 / px","number",{min:1,max:ue,step:1}),lr=Tn(Nr,"画布高度 / px","number",{min:1,max:ue,step:1});zr.dataset.composerField="canvas-width",lr.dataset.composerField="canvas-height";const Se=V("div","ic-background");Rt.append(Se);const Nt=Tn(Se,"透明背景","checkbox");Nt.parentElement.classList.add("ic-switch");const Gn=Tn(Se,"背景颜色","color");zr.addEventListener("change",()=>dt(()=>{J.width=Number(zr.value)})),lr.addEventListener("change",()=>dt(()=>{J.height=Number(lr.value)})),Nt.addEventListener("change",()=>dt(()=>{J.background=Nt.checked?"transparent":Gn.value})),Gn.addEventListener("change",()=>dt(()=>{J.background=Gn.value})),Rt.append(V("h3","","所选图层"));const bn=Tn(Rt,"名称","text",{maxLength:200}),tt=V("div","ic-field-grid");Rt.append(tt);const Gt={};for(const[E,U,F,fe]of[["x","X / px",-1e5,1e5],["y","Y / px",-1e5,1e5],["width","宽度 / px",0,ue],["height","高度 / px",0,ue],["angle","角度 / °",-36e3,36e3],["opacity","透明度 / %",0,100]]){const xe=Tn(tt,U,"number",{min:F,max:fe,step:E==="opacity"?1:.1});Gt[E]=xe,xe.dataset.composerField=E,xe.addEventListener("change",()=>dt(()=>{const Ce=Lt();if(!Ce||Ce.locked)return;const ve=Number(xe.value);if(xe.value.trim()===""||!Number.isFinite(ve))throw new Error("请输入有效数值。");if(Ge.checked&&(E==="width"||E==="height")){const Fe=E==="width"?"height":"width";Ce[Fe]*=ve/Ce[E]}Ce[E]=E==="opacity"?ve/100:ve}))}const Ge=Tn(Rt,"锁定宽高比","checkbox",{checked:!0});Ge.parentElement.classList.add("ic-switch"),Ge.addEventListener("change",()=>{if(gt()){Pe.uniformScaling=Ge.checked;for(const E of fn.values())E.setControlsVisibility({ml:!Ge.checked,mr:!Ge.checked,mt:!Ge.checked,mb:!Ge.checked});Pe.requestRenderAll()}});const ht=V("div");Rt.append(ht),Sr=cc(ht,{canEdit:gt,onApply:(E,U)=>dt(()=>{const F=Lt();if(!F||F.kind==="paint"||F.id!==E||F.locked)throw new Error("所选图层已变化，请重新打开裁剪。");Object.assign(F,ec(F,U,Re.get(Me(F.asset.url))))})===!0}),bn.addEventListener("change",()=>dt(()=>{const E=Lt();E&&!E.locked&&(E.name=bn.value||"图片")})),Rt.append(V("p","ic-hint","X / Y 是图片未旋转时的左上角原点。锁定图层后，需先解锁才能修改属性或在画布移动。"));const Zn=Kt(pe,"保存编辑稿",dr,"ic-primary"),cn=Kt(pe,"合成 PNG",no,"ic-primary");function Zt(){if(!J||nn){Yn();return}const E=Lt();zr.value=J.width,lr.value=J.height,Nt.checked=J.background==="transparent",Nt.checked||(Gn.value=J.background),bn.value=E?.name||"",bn.dataset.inactive=!E||E.locked?"1":"0";for(const[F,fe]of Object.entries(Gt))fe.value=E?String(Math.round(E[F]*(F==="opacity"?100:1)*1e3)/1e3):"",fe.dataset.inactive=!E||E.locked?"1":"0";Zr.dataset.inactive=In<=0?"1":"0",sr.dataset.inactive=In>=Pt.length-1?"1":"0";for(const F of Mo)F.dataset.inactive=!E||E.locked?"1":"0";rn.dataset.inactive=typeof Ee!="function"?"1":"0",Zn.dataset.inactive=typeof qe!="function"?"1":"0",cn.dataset.inactive=typeof K!="function"?"1":"0",Nn.textContent=`图片合成${JSON.stringify(J)!==zn?" · 未保存":""}`;const U=Rn.contains(C.activeElement);Rn.replaceChildren(),J.layers.length||Rn.append(V("p","ic-empty","尚无图层。上传图片，或从下方画布素材中选择添加。"));for(const F of[...J.layers].reverse()){const fe=V("div",`ic-layer${nt===F.id?" is-selected":""}`);fe.draggable=!ft&&rt(),fe.dataset.layerId=F.id;const xe=F.kind==="paint"?F.name:We(F.asset),Ce=V("button","ic-layer-name");Ce.type="button",Ce.title=xe,Ce.dataset.layerAction="select",Ce.append(Kn(F.asset,F.crop,F),V("span","ic-asset-name",xe)),Ce.setAttribute("aria-pressed",String(nt===F.id)),Ce.disabled=ft||!rt(),Ce.addEventListener("click",()=>{gt()&&(nt=F.id,_t=!0,Pe.discardActiveObject(),!F.locked&&F.visible&&Pe.setActiveObject(fn.get(F.id)),_t=!1,Pe.requestRenderAll(),Zt())});const ve=V("button","ic-layer-toggle",F.visible?"隐藏":"显示");ve.type="button",ve.setAttribute("aria-label",`${F.visible?"隐藏":"显示"} ${F.name}`),ve.setAttribute("aria-pressed",String(F.visible)),ve.dataset.layerAction="visible",ve.title=ve.getAttribute("aria-label");const Fe=V("button","ic-layer-toggle",F.locked?"解锁":"锁定");Fe.type="button",Fe.setAttribute("aria-label",`${F.locked?"解锁":"锁定"} ${F.name}`),Fe.setAttribute("aria-pressed",String(F.locked)),Fe.dataset.layerAction="lock",Fe.title=Fe.getAttribute("aria-label"),ve.disabled=Fe.disabled=ft||!rt(),ve.addEventListener("click",()=>dt(()=>{F.visible=!F.visible})),Fe.addEventListener("click",()=>dt(()=>{F.locked=!F.locked})),fe.addEventListener("dragstart",Bt=>{if(!gt()){Bt.preventDefault();return}vn=F.id,Bt.dataTransfer.effectAllowed="move",Bt.dataTransfer.setData("application/x-chouka-layer",F.id)}),fe.addEventListener("dragover",Bt=>{vn&&gt()&&(Bt.preventDefault(),Bt.dataTransfer.dropEffect="move",fe.classList.add("is-dragover"))}),fe.addEventListener("dragleave",()=>fe.classList.remove("is-dragover")),fe.addEventListener("dragend",()=>{vn=null,fe.classList.remove("is-dragover")}),fe.addEventListener("drop",Bt=>{if(!vn)return;Bt.preventDefault(),Bt.stopPropagation();const Ir=vn;vn=null,dt(()=>{const ro=J.layers.findIndex(oo=>oo.id===F.id),cr=J.layers.findIndex(oo=>oo.id===Ir);if(cr<0||ro<0||cr===ro)return;const[pi]=J.layers.splice(cr,1);J.layers.splice(ro,0,pi),nt=Ir})});const me=V("div","ic-layer-controls");me.append(ve,Fe),fe.append(Ce,me),Rn.append(fe)}Yn(),U&&!ft&&Pe?.upperCanvasEl.focus({preventScroll:!0})}async function Qn(E,U){if(J.layers.length+E.length>P)throw new Error("最多添加 100 个图层。");const F=[];for(const fe of E){if(!rt())throw new Error("编辑权限已失效，未添加图片。");const xe=Ue(fe),Ce=await Vn(xe);if(!rt())throw new Error("编辑权限已失效，未添加图片。");const ve=Math.max(1/Math.min(Ce.width,Ce.height),Math.min(1,J.width/Ce.width,J.height/Ce.height));F.push({id:$e(),name:We(xe),asset:xe,x:0,y:0,width:Ce.width*ve,height:Ce.height*ve,angle:0,opacity:1,visible:!0,locked:!1})}if(!rt())throw new Error("编辑权限已失效，未添加图片。");J=R({...J,...U?{linkedSources:U}:{},layers:J.layers.concat(F)}),nt=F.at(-1)?.id||nt,mn(),Ke()}async function An(){if(!Array.isArray(ae)||ae.length>j)throw new Error("已连接图片列表无效或过多（最多 512 项）。");if(!ae.length)return;const E=new Set(J.linkedSources||[]),U=new Set(E),F=new Set,fe=[];for(const xe of J.layers)if(xe.kind!=="paint")for(const Ce of ie(xe.asset))F.add(Ce);for(const xe of ae){const Ce=Ue(xe),ve=ie(Ce);if(ve.some(Fe=>U.has(Fe)||F.has(Fe)))for(const Fe of ve)U.add(Fe);ve.some(Fe=>E.has(Fe)||F.has(Fe))||fe.push(Ce);for(const Fe of ve)E.add(Fe);if(E.size>j)throw new Error("已连接图片记录已达 512 条上限，请使用“添加图片”手动添加新素材。")}if(!rt())throw new Error("编辑权限已失效，未添加图片。");U.size!==(J.linkedSources||[]).length&&(J=R({...J,linkedSources:[...U]}),Ke()),await Qn(fe,[...E])}async function eo(E){if(!/^image\/(png|jpeg|webp|gif|bmp|x-ms-bmp)$/i.test(E.type)||!E.size||E.size>z)throw new Error(`${E.name||"粘贴文件"}：仅支持常见位图格式，且文件需在 64 MiB 以内。`);await O(E);const U=await createImageBitmap(E);try{Be(U.width,U.height)}finally{U.close()}}function to(E){const U=Array.from(E||[]);if(U.length)return ln("正在检查和上传图片，请勿关闭…",async()=>{if(typeof Ee!="function")throw new Error("尚未配置图片上传回调。");if(J.layers.length+U.length>P)throw new Error("最多添加 100 个图层。");for(const fe of U)await eo(fe);const F=[];for(const fe of U){if(!rt())throw new Error("编辑权限已失效，已停止上传。");const xe=await Ee(fe);if(!rt())throw new Error("编辑权限已失效，未采用晚到的上传结果。");F.push(Ue(xe))}await Qn(F)})}dn.addEventListener("change",()=>{const E=Array.from(dn.files);dn.value="",to(E)}),ee.addEventListener("paste",E=>{if(E.stopPropagation(),E.target.closest('input,textarea,[contenteditable="true"]'))return;const U=Array.from(E.clipboardData?.files||[]);U.length&&(E.preventDefault(),to(U))}),ee.addEventListener("dragover",E=>{E.stopPropagation(),E.dataTransfer.types.includes("Files")&&(E.preventDefault(),E.dataTransfer.dropEffect=ft||!rt()?"none":"copy")}),ee.addEventListener("drop",E=>{E.stopPropagation(),E.preventDefault(),E.dataTransfer.files.length&&to(E.dataTransfer.files)}),ee.addEventListener("keydown",E=>{if(E.stopPropagation(),E.target.closest('input,textarea,select,[contenteditable="true"]')||E.isComposing)return;const U=E.ctrlKey||E.metaKey,F=E.key.toLowerCase();if(U&&(F==="z"||F==="y")){E.preventDefault(),gt()&&Mr(F==="y"||E.shiftKey?1:-1);return}if(F==="delete"||F==="backspace"){E.preventDefault(),Lt()&&!Lt().locked&&dt(()=>{J.layers=J.layers.filter(xe=>xe.id!==nt),nt=null});return}const fe={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[E.key];fe&&(E.preventDefault(),Lt()&&!Lt().locked&&dt(()=>{const xe=Lt(),Ce=E.shiftKey?10:1;xe.x+=fe[0]*Ce,xe.y+=fe[1]*Ce}))});for(const E of["keyup","keypress","copy","cut","pointerdown","pointerup","click","dblclick","wheel"])ee.addEventListener(E,U=>U.stopPropagation());async function dr(){await ln("正在保存编辑稿，请勿关闭…",async()=>{const E=R(J);if(!rt())throw new Error("编辑权限已失效，未保存。");await qe(ke(E)),rt()&&(zn=JSON.stringify(E))})}async function no(){await ln("正在合成原尺寸 PNG，请勿关闭…",async()=>{const E=R(J),U=C.createElement("canvas");let F;try{F=new(Qe()).StaticCanvas(U,{width:E.width,height:E.height,enableRetinaScaling:!1,renderOnAddRemove:!1,backgroundColor:E.background==="transparent"?"":E.background});for(const xe of E.layers)xe.visible&&F.add(jr(xe));F.renderAll();const fe=await new Promise((xe,Ce)=>U.toBlob(ve=>ve?xe(ve):Ce(new Error("PNG 编码失败，可能内存不足。")),"image/png"));if(!rt())throw new Error("编辑权限已失效，未提交合成结果。");await K(fe,ke(E)),zn=JSON.stringify(E)}finally{try{F&&await F.dispose()}finally{U.width=U.height=0}}})}async function kn(E=!1){const U=E===!0;if(nn||ft&&!U||!U&&J&&JSON.stringify(J)!==zn&&!_.confirm("编辑稿有未保存的更改，确定关闭并放弃这些更改吗？"))return!1;nn=!0,$o.abort(),we?.disconnect(),D(sn),Ze?.dispose(),Sr?.dispose(),ee.open&&ee.close();try{Pe&&await Pe.dispose()}catch(F){console.error("[图片合成] 画布释放失败",F)}finally{for(const F of Re.values())F.close();Ln.dispose(),Re.clear(),fn.clear(),Pt.length=0,ee.remove(),ar?.isConnected&&ar.focus({preventScroll:!0})}return!0}un.addEventListener("click",kn),ee.addEventListener("cancel",E=>{E.preventDefault(),E.stopPropagation(),kn()}),ee.showModal(),un.focus();async function qt(){if(!(ft||nn)){ft=!0,Jn=!1,$t(),It.hidden=!0,en.textContent="正在载入图片合成器…",Yn();try{if(await ye(),Pe||(Pe=new(Qe()).Canvas(tn,{enableRetinaScaling:!1,selection:!1,preserveObjectStacking:!0,uniformScaling:!0,uniScaleKey:null,renderOnAddRemove:!1}),Pe.upperCanvasEl.tabIndex=0,Pe.upperCanvasEl.setAttribute("aria-label","图片合成编辑画布，使用方向键移动所选图层"),Pe.on("mouse:down",()=>{!ft&&rt()&&Pe.upperCanvasEl.focus({preventScroll:!0})}),Pe.on("selection:created",E=>{!_t&&!ft&&rt()&&(nt=E.selected?.[0]?.composerId||null,Zt())}),Pe.on("selection:updated",E=>{!_t&&!ft&&rt()&&(nt=E.selected?.[0]?.composerId||null,Zt())}),Pe.on("selection:cleared",()=>{!_t&&!ft&&rt()&&(nt=null,Zt())}),Ze=Qc({dialog:ee,surface:Pe.wrapperEl,toolbar:$r,properties:Dt,canEdit:gt,getState:()=>{const E=Lt(),U=E?.kind==="paint"?E.paint:E&&Re.get(Me(E.asset.url));return{enabled:!nn&&!ft&&Jn&&rt(),width:J?.width||1,height:J?.height||1,scale:Ct,offsetX:Ft,offsetY:wn,target:E&&U?{layer:{...E,kind:E.kind||"image"},source:{width:U.width,height:U.height}}:null}},onMode:E=>{Pe.getActiveObject()?.set({hasControls:!E,hasBorders:!E}),Pe.requestRenderAll()},onPan:(E,U)=>{Pn=!1,Ft+=E,wn+=U,hn(),Pe.requestRenderAll()},onNewPaint:()=>dt(()=>{const E=$e();J=ks(J,E,nt),nt=E}),onClear:()=>{const E=Lt();E&&_.confirm(E.kind==="paint"?"清空当前涂鸦？此操作可撤销。":"恢复当前图片的全部擦除和遮挡效果？此操作可撤销。")&&dt(()=>{J=wc(J,E.id)})},onStroke:(E,U)=>dt(()=>{const F=E||$e();E||(J=ks(J,F,nt)),J=yc(J,F,U),nt=F})===!0,onPreview:(E,U)=>{const F=J?.layers.find(Fe=>Fe.id===E),fe=fn.get(E);if(!F||!fe||nn)return;const xe=U?F.kind==="paint"?{...F,paint:{...F.paint,strokes:[...F.paint.strokes,U]}}:{...F,effects:[...F.effects||[],U]}:F,Ce=jr(xe),ve=Pe.getObjects().indexOf(fe);_t=!0,Pe.remove(fe),fe.dispose(),Pe.insertAt(ve,Ce),fn.set(E,Ce),nt===E&&!F.locked&&F.visible&&(Pe.setActiveObject(Ce),Ce.set({hasControls:!1,hasBorders:!1})),_t=!1,Pe.requestRenderAll()},onError:mt}),Pe.on("object:modified",E=>{if(_t)return;if(!gt()){mn();return}const U=E.target,F=J.layers.find(xe=>xe.id===U?.composerId);if(!F||F.locked){mn();return}const fe=ke(J);try{Object.assign(F,{x:U.left,y:U.top,width:U.width*U.scaleX,height:U.height*U.scaleY,angle:U.angle}),J=R(J),Ke()}catch(xe){J=fe,mn(),mt(xe)}})),!J){const E=R(ne);for(const U of E.layers){if(!rt())throw new Error("只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。");U.kind!=="paint"&&await Vn(U.asset)}if(!rt())throw new Error("只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。");J=E,zn=JSON.stringify(J),Pt=[],In=-1,mn(),Ke()}Jn=!0;try{await An()}catch(E){mt(E),It.hidden=!1}on.replaceChildren();for(const E of c)try{const U=Ue(E),F=We(U),fe=Kt(on,"",()=>ln("正在添加画布图片…",()=>Qn([U])));fe.title=F,fe.setAttribute("aria-label",`添加 ${F}`),fe.append(Kn(U),V("span","ic-asset-name",F))}catch(U){mt(U)}c.length||on.append(V("p","ic-hint","当前画布没有可用的图片素材。")),we?.disconnect(),we=new re(hn),we.observe(Ve)}catch(E){mt(E),Jn=!1,It.hidden=!1}finally{ft=!1,en.textContent=Ut.hidden?"就绪 · 添加图片开始合成":"载入存在问题，请检查提示；可重试载入或关闭。",Zt()}}}return l.onDispose(()=>{kn(!0)}),It.addEventListener("click",()=>{rt()&&qt()}),sn=A(Yn,500),await qt(),{close:kn}}_.ChoukaImageComposer={open:Q}})(),_.ChoukaImageComposer}const tp=Ed.extend({selectedId:Wn().nullable(),selectedSpace:Wn(),user:Nd.nullable()});function np(l){const u=As({projects:[],teams:[],selectedId:null,selectedSpace:"personal",user:null,busy:!1,error:""});let b;async function w(C){if(!u.getSnapshot().busy){u.set({...u.getSnapshot(),busy:!0,error:""});try{await C()}catch(T){u.set({...u.getSnapshot(),error:Kr(T)})}finally{u.set({...u.getSnapshot(),busy:!1})}}}const _=C=>C.permission==="operate"&&!C.locked;return{state:u,service:l,bind(C){b=C},update(C){const T=tp.parse(C);u.set({...u.getSnapshot(),...T})},selectSpace(C){b?.selectSpace(C)},open(C){return w(async()=>{await b?.open(C)})},create(){return w(async()=>{const C=u.getSnapshot();if(C.selectedSpace==="shared")throw new Error("共享给我的空间不能新建画布，请选择个人空间或项目组");const T=C.selectedSpace.startsWith("team:")?C.selectedSpace.slice(5):null,s=T?C.teams.find(D=>D.id===T)?.name:"个人空间",v=window.prompt(`在「${s||"项目组"}」新建画布`,"新项目 "+new Date().toLocaleDateString("zh-CN"));if(v===null)return;const A=await l.create(v,T);await b?.refresh(),await b?.open(A.id)})},rename(C){return w(async()=>{if(!_(C))throw new Error("此画布不可修改");const T=window.prompt("修改项目名",C.name);if(T===null)return;const s=T.trim();if(!s)throw new Error("项目名不能为空");const v=Ns({name:Wn(),rev:St()}).parse(await l.rename(C.id,s));b?.renamed(C.id,v.name,v.rev),await b?.refresh()})},remove(C){return w(async()=>{if(!_(C))throw new Error("此画布不可修改");window.confirm(`删除项目「${C.name}」？（文件会保留为 .deleted）`)&&(await l.remove(C.id),u.getSnapshot().selectedId===C.id&&b?.clear(),await b?.refresh())})},async refresh(){await b?.refresh()},spaces(C){const T=u.getSnapshot();return _d(C,T.user?.id,T.teams)}}}function rp({project:l,host:u,onClose:b}){const w=lt.useRef(null),[_,C]=lt.useState(),[T,s]=lt.useState([]),[v,A]=lt.useState([]),[D,oe]=lt.useState(""),[le,re]=lt.useState(!1);lt.useEffect(()=>{let G=!0;return w.current?.showModal(),u.service.shares(l.id).then(M=>{G&&(C(M),s(M.user_ids),A(M.team_ids))}).catch(M=>{G&&oe(Kr(M))}),()=>{G=!1}},[u,l.id]);const B=(G,M,I,X)=>X(M?[...I,G]:I.filter(ue=>ue!==G));return W.jsx("dialog",{ref:w,className:"auth-dialog project-share-dialog",onCancel:b,children:W.jsxs("form",{onSubmit:async G=>{G.preventDefault(),re(!0),oe("");try{await u.service.share(l.id,T,v),await u.refresh(),b()}catch(M){oe(Kr(M))}finally{re(!1)}},children:[W.jsxs("h2",{children:["分享「",l.name,"」"]}),W.jsx("p",{className:"auth-note",children:"被选中的个人或项目组成员可以共同查看、编辑和运行这张画布。画布仍保留在你的个人空间。"}),W.jsx("div",{className:"share-columns",children:["users","teams"].map(G=>W.jsxs("section",{className:"share-targets",children:[W.jsx("h3",{children:G==="users"?"个人":"项目组"}),W.jsxs("div",{className:"share-target-list",children:[_?.[G].map(M=>W.jsxs("label",{className:"share-target",children:[W.jsx("input",{type:"checkbox",checked:(G==="users"?T:v).includes(M.id),onChange:I=>B(M.id,I.target.checked,G==="users"?T:v,G==="users"?s:A)}),W.jsxs("span",{children:[M.name||M.username,M.display_name?`（${M.display_name}）`:""]})]},M.id)),_?.[G].length===0&&W.jsx("p",{className:"auth-note",children:"暂无可分享对象"})]})]},G))}),W.jsx("p",{role:"alert",children:D}),W.jsxs("footer",{children:[W.jsx("button",{type:"button",className:"btn",onClick:b,children:"取消"}),W.jsx("button",{className:"btn primary",disabled:!_||le,children:le?"保存中…":"确定分享"})]})]})})}function op({host:l}){const u=lt.useSyncExternalStore(l.state.subscribe,l.state.getSnapshot),[b,w]=lt.useState(),_=[{value:"personal",label:"个人空间"},...u.projects.some(v=>l.spaces(v).includes("shared"))?[{value:"shared",label:"共享给我的画布"}]:[],...u.teams.map(v=>({value:`team:${v.id}`,label:v.name}))],C=u.projects.filter(v=>l.spaces(v).includes(u.selectedSpace)),T=new Map;for(const v of C){const A=u.selectedSpace==="shared"?String(v.owner_id):"";T.set(A,[...T.get(A)||[],v])}const s=v=>{const A=v.permission==="operate"&&!v.locked,D=u.selectedSpace==="personal"&&!v.team_id&&String(v.owner_id)===String(u.user?.id)&&!v.locked;return W.jsxs("div",{className:`pitem${v.id===u.selectedId?" on":""}`,title:`${v.team_name||v.owner_display_name?.trim()||"未填写姓名"} · ${v.permission==="operate"?"可操作":"只读"}`,onContextMenu:oe=>{D&&(oe.preventDefault(),w(v))},children:[W.jsx("button",{className:"nm",onClick:()=>{l.open(v.id)},onDoubleClick:()=>A&&void l.rename(v),children:v.name}),W.jsx("span",{className:"ct",children:v.cards}),D&&W.jsx("button",{className:"pshare",title:"分享给个人或项目组",onClick:()=>w(v),children:"↗"}),A&&W.jsxs(W.Fragment,{children:[W.jsx("button",{className:"ren",title:"重命名",disabled:u.busy,onClick:()=>{l.rename(v)},children:"✎"}),W.jsx("button",{className:"del",title:"删除",disabled:u.busy,onClick:()=>{l.remove(v)},children:"✕"})]})]},v.id)};return W.jsxs(W.Fragment,{children:[W.jsx("div",{className:"head",children:W.jsx("span",{className:"project-panel-title",children:"画布列表"})}),W.jsxs("button",{id:"newproj",disabled:u.busy,onClick:()=>{l.create()},children:[W.jsx("span",{"aria-hidden":"true",children:"＋"}),W.jsx("span",{children:"新建画布"})]}),W.jsxs("label",{className:"space-picker",children:[W.jsx("span",{children:"画布空间"}),W.jsx("select",{id:"space-select",value:u.selectedSpace,onChange:v=>l.selectSpace(v.target.value),"aria-label":"选择个人空间或项目组",children:_.map(v=>W.jsx("option",{value:v.value,children:v.label},v.value))})]}),W.jsx("div",{id:"space-label",className:"section-label",children:_.find(v=>v.value===u.selectedSpace)?.label}),W.jsx("div",{id:"plist",children:[...T].map(([v,A])=>v?W.jsxs("details",{className:"powner",open:!0,children:[W.jsxs("summary",{children:[W.jsx("span",{className:"powner-name",children:A[0]?.owner_display_name?.trim()||"未填写姓名"}),W.jsx("span",{className:"powner-count",children:A.length})]}),W.jsx("div",{className:"powner-items",children:A.map(s)})]},v):A.map(s))}),u.error&&W.jsx("p",{role:"alert",className:"project-error",children:u.error}),W.jsxs("div",{className:"side-foot",children:[W.jsx("span",{className:"side-foot-dot"}),W.jsx("span",{id:"space-status",children:u.selectedSpace==="personal"?"个人画布仅自己可见":u.selectedSpace==="shared"?"由画布所有者授权共享":"项目组画布由全体组员共享"})]}),b&&W.jsx(rp,{host:l,project:b,onClose:()=>w(void 0)})]})}const ip=Id+`
`+Pd+`
#side {position:relative} #dot {position:absolute;right:22px;top:28px;width:7px;height:7px;border-radius:50%;background:var(--err)} #dot.on{background:var(--ok)} #react-projects{display:contents}.pitem>.nm {border:0;background:none;color:inherit;text-align:left;min-width:0;cursor:pointer;font:inherit}.project-error{color:#fda4af;padding:12px;font-size:12px}`;function fp(){const l=lt.useRef(null),[u,b]=lt.useState(!0),[w,_]=lt.useState(),[C,T]=lt.useState(null),s=lt.useCallback(A=>{const D=np(A.services.projects);_(D),T(document.getElementById("react-projects"));const oe=ep(A.scope,A.auth,A.notify,A.services),le=Zd(A.scope,A.auth,A.notify,D,A.services,oe);A.beforeLeave(async()=>{await le.ready,await le.flush()}),le.nodeEditor&&(window.ChoukaNodeEditor=le.nodeEditor),le.ready.then(()=>{A.scope.disposed||b(!1)},re=>{A.scope.disposed||(b(!1),A.notify.error(re))})},[]),v=Md(l,"canvas","canvas","canvas-studio",ip,s);return W.jsxs(W.Fragment,{children:[W.jsx("div",{id:"page-mount",ref:l,dangerouslySetInnerHTML:{__html:zd}}),C&&w&&js.createPortal(W.jsx(op,{host:w}),C),u&&!v&&W.jsx(Sd,{stage:"正在准备工作区"}),v&&W.jsx("p",{role:"alert",children:v})]})}export{fp as CanvasPage};
